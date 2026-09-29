const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8'));
const backgroundSource = fs.readFileSync(path.join(__dirname, '..', manifest.background.service_worker), 'utf8');
const contentSource = fs.readFileSync(path.join(__dirname, '..', 'src/content/gemini-content.js'), 'utf8');
const declared = manifest.content_scripts[0];
const chatgptDeclared = manifest.content_scripts[1];

// manifest：service worker 已注册，补注入所需权限齐全，且不引入会触发新权限警告的 tabs 权限
assert.strictEqual(manifest.background.service_worker, 'src/background.js');
assert.ok(manifest.permissions.includes('scripting'), 'scripting permission is required for executeScript/insertCSS');
assert.deepStrictEqual(manifest.host_permissions, manifest.content_scripts.flatMap(script => script.matches),
    'host permissions must match the declared sites');
assert.ok(!manifest.permissions.includes('tabs'), 'tabs permission would add a browsing-history warning');

// 内容脚本必须设置 background.js 用来判断“本页已注入”的标记
assert.ok(contentSource.includes('window.widerGeminiContentLoaded = true'), 'content script must set the loaded flag');

const tabs = [
    { id: 1, url: 'https://gemini.google.com/app', loaded: false },
    { id: 2, url: 'https://gemini.google.com/app/abc123', loaded: true },
    { id: 3, url: 'https://gemini.google.com/app', loaded: false, discarded: true },
    { id: 4, url: 'https://gemini.google.com/app', loaded: false, fails: true },
    { id: 5, url: 'https://chatgpt.com/c/example', loaded: false },
    { id: 6, url: 'https://chatgpt.com/', loaded: true },
    { id: 7, url: 'https://example.com/', loaded: false }
];
const tabsById = new Map(tabs.map(tab => [tab.id, tab]));
const listeners = {};
const calls = [];
const queries = [];

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
                queries.push(queryInfo);
                return tabs.filter(tab => queryInfo.url.some(pattern => tab.url.startsWith(pattern.slice(0, -1))))
                    .map(({ id, url, discarded }) => ({ id, url, discarded }));
            }
        },
        scripting: {
            async executeScript(injection) {
                const tab = tabsById.get(injection.target.tabId);

                if (injection.func) {
                    // func 会在页面的隔离世界中执行，这里用页面的 window 求值
                    const chatgpt = tab.url.startsWith('https://chatgpt.com/');
                    sandbox.window = {
                        widerGeminiContentLoaded: chatgpt ? true : tab.loaded,
                        widerChatgptContentLoaded: chatgpt ? tab.loaded : true
                    };
                    const result = injection.func(...injection.args);
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

    assert.strictEqual(queries.length, 2, 'each supported site is queried');
    queries.forEach(query => assert.deepStrictEqual(Object.keys(query), ['url']));
    assert.strictEqual(queries[0].url, declared.matches);
    assert.strictEqual(queries[1].url, chatgptDeclared.matches);

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

    // ChatGPT 的标记与文件清单独立，即使另一站点标记存在也不能漏注入。
    assert.deepStrictEqual(typesFor(5), ['check', 'css', 'js']);
    assert.deepStrictEqual(calls.find(call => call.tabId === 5 && call.type === 'css').files, chatgptDeclared.css);
    assert.deepStrictEqual(calls.find(call => call.tabId === 5 && call.type === 'js').files, chatgptDeclared.js);
    assert.deepStrictEqual(typesFor(6), ['check']);
    assert.deepStrictEqual(typesFor(7), [], 'unrelated sites must not be injected');

    // 再次触发（如扩展更新）时，已补注入的页面不再重复注入
    calls.length = 0;
    await listeners.onInstalled();
    assert.deepStrictEqual(typesFor(1), ['check']);
    assert.deepStrictEqual(typesFor(5), ['check']);

    console.log('background tests passed');
})().catch(error => {
    console.error(error);
    process.exit(1);
});
