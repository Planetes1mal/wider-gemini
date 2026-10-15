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
const localStore = {};
let badgeText = '';
let popupOpens = 0;
let popupFails = false;

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
        i18n: { getMessage: key => (key === 'badgeNew' ? 'NEW' : '') },
        storage: {
            local: {
                async get(key) { return key in localStore ? { [key]: localStore[key] } : {}; },
                async set(values) { Object.assign(localStore, values); },
                async remove(key) { delete localStore[key]; }
            }
        },
        action: {
            async setBadgeBackgroundColor() {},
            async setBadgeText(details) { badgeText = details.text; },
            async openPopup() {
                if (popupFails) throw new Error('Browser window is not active.');
                popupOpens++;
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
    assert.strictEqual(popupOpens, 0, 'restoring scripts alone must not open the popup');
    assert.strictEqual(badgeText, '');

    // 键名与弹窗共用的常量一致。
    const settingsSandbox = {};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src/shared/settings-utils.js'), 'utf8'),
        { globalThis: settingsSandbox });
    const introKey = settingsSandbox.widerGeminiSettings.CHATGPT_INTRO_KEY;
    assert.ok(backgroundSource.includes(`'${introKey}'`), 'background must use the shared intro key');

    // 从 2.x 更新：只加角标并记下提示，不弹出任何窗口。
    await listeners.onInstalled({ reason: 'update', previousVersion: '2.8.0' });
    assert.strictEqual(localStore[introKey], true);
    assert.strictEqual(badgeText, 'NEW');
    assert.strictEqual(popupOpens, 0, 'updates must not open the popup');

    // 浏览器重启后角标重新显示；授权 ChatGPT 后清除提示和角标。
    badgeText = '';
    await listeners.onStartup();
    assert.strictEqual(badgeText, 'NEW');
    granted = true;
    await listeners.onAdded();
    assert.ok(!(introKey in localStore));
    assert.strictEqual(badgeText, '');

    // 已授权时，新装或更新都不再提示。
    await listeners.onInstalled({ reason: 'install' });
    assert.strictEqual(popupOpens, 0);
    assert.strictEqual(badgeText, '');
    granted = false;
    await listeners.onRemoved();

    // 3.x 之间的更新、缺少旧版本号的更新和浏览器更新都不提示。
    for (const details of [{ reason: 'update', previousVersion: '3.0.0' }, { reason: 'update', previousVersion: '3.1.2' },
        { reason: 'update' }, { reason: 'chrome_update' }]) {
        await listeners.onInstalled(details);
    }
    assert.ok(!(introKey in localStore));
    assert.strictEqual(badgeText, '');

    // 新装：从工具栏弹出扩展弹窗，同时保留角标。
    await listeners.onInstalled({ reason: 'install' });
    assert.strictEqual(popupOpens, 1);
    assert.strictEqual(localStore[introKey], true);
    assert.strictEqual(badgeText, 'NEW');

    // 无法弹出（例如窗口未激活）时仍保留角标，并完成补注入。
    delete localStore[introKey];
    badgeText = '';
    popupFails = true;
    calls.length = 0;
    await listeners.onInstalled({ reason: 'install' });
    assert.strictEqual(popupOpens, 1);
    assert.strictEqual(localStore[introKey], true);
    assert.strictEqual(badgeText, 'NEW');
    assert.deepStrictEqual(typesFor(1), ['check']);

    console.log('background tests passed');
})().catch(error => {
    console.error(error);
    process.exit(1);
});
