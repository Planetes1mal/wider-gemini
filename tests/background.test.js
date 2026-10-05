const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8'));
const backgroundSource = fs.readFileSync(path.join(__dirname, '..', manifest.background.service_worker), 'utf8');
const contentSource = fs.readFileSync(path.join(__dirname, '..', 'src/content/gemini-content.js'), 'utf8');
const declared = manifest.content_scripts[0];

// manifest：service worker 已注册，补注入所需权限齐全，且不引入会触发新权限警告的 tabs 权限
assert.strictEqual(manifest.background.service_worker, 'src/background.js');
assert.ok(manifest.permissions.includes('scripting'), 'scripting permission is required for executeScript/insertCSS');
assert.deepStrictEqual(manifest.host_permissions, manifest.content_scripts.flatMap(script => script.matches),
    'host permissions must match the declared sites');
assert.ok(!manifest.permissions.includes('tabs'), 'tabs permission would add a browsing-history warning');
assert.ok(manifest.permissions.includes('activeTab'), 'toolbar popup must recognize an ungranted ChatGPT tab');
assert.deepStrictEqual(manifest.host_permissions, ['https://gemini.google.com/*']);
assert.deepStrictEqual(manifest.optional_host_permissions, ['https://chatgpt.com/*']);
assert.strictEqual(manifest.content_scripts.length, 1, 'ChatGPT must not have a static content script');

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
let granted = false;
let registered = [];
let registrations = 0;

const sandbox = {
    console: { log() {}, error() {} },
    chrome: {
        permissions: {
            async contains(request) {
                assert.deepStrictEqual(Array.from(request.origins), manifest.optional_host_permissions);
                return granted;
            },
            onAdded: { addListener(listener) { listeners.onAdded = listener; } },
            onRemoved: { addListener(listener) { listeners.onRemoved = listener; } }
        },
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
            async getRegisteredContentScripts() { return registered; },
            async registerContentScripts(scripts) {
                registrations++;
                registered = scripts;
            },
            async unregisterContentScripts() { registered = []; },
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

    assert.strictEqual(queries.length, 1, 'ungranted ChatGPT is not queried or injected');
    queries.forEach(query => assert.deepStrictEqual(Object.keys(query), ['url']));
    assert.strictEqual(queries[0].url, declared.matches);
    assert.strictEqual(registered.length, 0);
    assert.deepStrictEqual(typesFor(5), []);

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

    // 授权后注册未来导航，并立即补注入已打开的页面，不刷新。
    calls.length = 0;
    granted = true;
    await listeners.onAdded();
    const chatgptDeclared = registered[0];
    assert.deepStrictEqual(Array.from(chatgptDeclared.matches), manifest.optional_host_permissions);
    assert.strictEqual(chatgptDeclared.runAt, 'document_start');
    assert.strictEqual(chatgptDeclared.persistAcrossSessions, true);
    assert.deepStrictEqual(typesFor(5), ['check', 'css', 'js']);
    assert.deepStrictEqual(calls.find(call => call.tabId === 5 && call.type === 'css').files, chatgptDeclared.css);
    assert.deepStrictEqual(calls.find(call => call.tabId === 5 && call.type === 'js').files, chatgptDeclared.js);
    assert.deepStrictEqual(typesFor(6), ['check']);
    assert.deepStrictEqual(typesFor(7), [], 'unrelated sites must not be injected');
    assert.deepStrictEqual(typesFor(1), [], 'ChatGPT grant does not touch Gemini');

    // 再次触发（如扩展更新）时，已补注入的页面不再重复注入
    calls.length = 0;
    await listeners.onInstalled();
    assert.deepStrictEqual(typesFor(1), ['check']);
    assert.deepStrictEqual(typesFor(5), ['check']);
    await listeners.onStartup();
    assert.strictEqual(registrations, 1, 'startup and install registration must be idempotent');

    // 重启时缺失注册会补回；撤销后注销，不再补注入。
    registered = [];
    await listeners.onStartup();
    assert.strictEqual(registrations, 2);
    calls.length = 0;
    granted = false;
    await listeners.onRemoved();
    assert.strictEqual(registered.length, 0);
    assert.strictEqual(calls.length, 0);
    await listeners.onInstalled();
    assert.deepStrictEqual(typesFor(5), [], 'revoked ChatGPT access must remain native');

    console.log('background tests passed');
})().catch(error => {
    console.error(error);
    process.exit(1);
});
