const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8'));
const backgroundSource = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');
const contentSource = fs.readFileSync(path.join(__dirname, '..', 'gemini-content.js'), 'utf8');
const declared = manifest.content_scripts[0];

// manifest：service worker 已注册，补注入所需权限齐全，且不引入会触发新权限警告的 tabs 权限
assert.strictEqual(manifest.background.service_worker, 'background.js');
assert.ok(manifest.permissions.includes('scripting'), 'scripting permission is required for executeScript/insertCSS');
assert.deepStrictEqual(manifest.host_permissions, declared.matches, 'host_permissions must match the content script pattern');
assert.ok(!manifest.permissions.includes('tabs'), 'tabs permission would add a browsing-history warning');

// 内容脚本必须设置 background.js 用来判断“本页已注入”的标记
assert.ok(contentSource.includes('window.widerGeminiContentLoaded = true'), 'content script must set the loaded flag');

const tabs = [
    { id: 1, url: 'https://gemini.google.com/app', loaded: false },
    { id: 2, url: 'https://gemini.google.com/app/abc123', loaded: true },
    { id: 3, url: 'https://gemini.google.com/app', loaded: false, discarded: true },
    { id: 4, url: 'https://gemini.google.com/app', loaded: false, fails: true }
];
const tabsById = new Map(tabs.map(tab => [tab.id, tab]));
const listeners = {};
const calls = [];
let lastQuery = null;

const sandbox = {
    console: { log() {} },
    chrome: {
        runtime: {
            getManifest() {
                return manifest;
            },
            onStartup: {
                addListener(listener) {
                    listeners.onStartup = listener;
                }
            },
            onInstalled: {
                addListener(listener) {
                    listeners.onInstalled = listener;
                }
            }
        },
        tabs: {
            async query(queryInfo) {
                lastQuery = queryInfo;
                return tabs.map(({ id, url, discarded }) => ({ id, url, discarded }));
            }
        },
        scripting: {
            async executeScript(injection) {
                const tab = tabsById.get(injection.target.tabId);

                if (injection.func) {
                    // func 会在页面的隔离世界中执行，这里用页面的 window 求值
                    sandbox.window = { widerGeminiContentLoaded: tab.loaded };
                    const result = injection.func();
                    delete sandbox.window;
                    calls.push({ tabId: tab.id, type: 'check', immediate: injection.injectImmediately });
                    return [{ result }];
                }

                if (tab.fails) throw new Error('Frame with ID 0 was removed.');
                calls.push({ tabId: tab.id, type: 'js', files: injection.files, immediate: injection.injectImmediately });
                tab.loaded = true;
                return [{ result: undefined }];
            },
            async insertCSS(injection) {
                const tab = tabsById.get(injection.target.tabId);
                if (tab.fails) throw new Error('Frame with ID 0 was removed.');
                calls.push({ tabId: tab.id, type: 'css', files: injection.files });
            }
        }
    }
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

const context = vm.createContext(sandbox);
vm.runInContext(backgroundSource, context, { filename: 'background.js' });

assert.ok(listeners.onStartup, 'browser startup must trigger re-injection');
assert.ok(listeners.onInstalled, 'install/update must trigger re-injection');

function typesFor(tabId) {
    return calls.filter(call => call.tabId === tabId).map(call => call.type);
}

(async () => {
    await listeners.onStartup();

    assert.deepStrictEqual(Object.keys(lastQuery), ['url'], 'query must only filter by url');
    assert.strictEqual(lastQuery.url, declared.matches, 'only Gemini tabs are queried');

    // 错过声明式注入的页面：先检查标记，再按 manifest 顺序注入 CSS 与 JS
    assert.deepStrictEqual(typesFor(1), ['check', 'css', 'js']);
    const css = calls.find(call => call.tabId === 1 && call.type === 'css');
    const js = calls.find(call => call.tabId === 1 && call.type === 'js');
    assert.deepStrictEqual(css.files, declared.css);
    assert.deepStrictEqual(js.files, declared.js);
    assert.strictEqual(js.immediate, true, 'injection must not wait for document_idle');

    // 已注入的页面只检查，不重复注入
    assert.deepStrictEqual(typesFor(2), ['check']);

    // 被丢弃的标签页跳过
    assert.deepStrictEqual(typesFor(3), []);

    // 某个标签页注入失败不影响其他标签页，也不抛出
    assert.deepStrictEqual(typesFor(4), ['check']);

    // 再次触发（如扩展更新）时，已补注入的页面不再重复注入
    calls.length = 0;
    await listeners.onInstalled();
    assert.deepStrictEqual(typesFor(1), ['check']);

    console.log('background tests passed');
})().catch(error => {
    console.error(error);
    process.exit(1);
});
