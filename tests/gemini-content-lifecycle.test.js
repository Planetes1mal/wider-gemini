const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const utilsSource = fs.readFileSync(path.join(__dirname, '..', 'settings-utils.js'), 'utf8');
const contentSource = fs.readFileSync(path.join(__dirname, '..', 'gemini-content.js'), 'utf8');

function createEventTarget() {
    const listeners = new Map();

    return {
        addEventListener(type, listener) {
            if (!listeners.has(type)) listeners.set(type, []);
            listeners.get(type).push(listener);
        },
        dispatch(type, event = {}) {
            (listeners.get(type) || []).forEach(listener => listener(event));
        }
    };
}

function createClassList() {
    const values = new Set();

    return {
        add(value) {
            values.add(value);
        },
        remove(value) {
            values.delete(value);
        },
        contains(value) {
            return values.has(value);
        },
        toggle(value, enabled) {
            if (enabled) values.add(value);
            else values.delete(value);
            return enabled;
        }
    };
}

// 模拟一个 Gemini 页面的扩展隔离世界；readyState 决定内容脚本是等待 DOMContentLoaded 还是立即初始化
function createPage(readyState) {
    const rootStyles = new Map();
    const timers = new Map();
    const counts = { storageGet: 0, observerStart: 0, messageListeners: 0, storageChangeListeners: 0 };
    let nextTimerId = 1;

    const document = {
        ...createEventTarget(),
        readyState,
        documentElement: {
            style: {
                setProperty(property, value) {
                    rootStyles.set(property, value);
                }
            }
        },
        body: {
            classList: createClassList()
        },
        querySelector() {
            return null;
        },
        querySelectorAll() {
            return [];
        }
    };

    const sandbox = {
        ...createEventTarget(),
        document,
        location: { href: 'https://gemini.google.com/app' },
        history: {
            pushState() {},
            replaceState() {}
        },
        chrome: {
            runtime: {
                id: 'test-extension',
                onMessage: {
                    addListener() {
                        counts.messageListeners += 1;
                    }
                }
            },
            storage: {
                sync: {
                    get(keys, callback) {
                        counts.storageGet += 1;
                        callback({
                            chatWidthSetting: { value: 1200, unit: 'px' },
                            codeWrap: true
                        });
                    }
                },
                onChanged: {
                    addListener() {
                        counts.storageChangeListeners += 1;
                    }
                }
            }
        },
        MutationObserver: class {
            observe() {
                counts.observerStart += 1;
            }
        },
        getComputedStyle() {
            return {
                getPropertyValue(property) {
                    return rootStyles.get(property) || '';
                }
            };
        },
        requestAnimationFrame(callback) {
            return sandbox.setTimeout(callback, 16);
        },
        cancelAnimationFrame(id) {
            sandbox.clearTimeout(id);
        },
        setTimeout(callback, delay = 0) {
            const id = nextTimerId;
            nextTimerId += 1;
            timers.set(id, { callback, delay });
            return id;
        },
        clearTimeout(id) {
            timers.delete(id);
        },
        console: {
            log() {},
            error() {},
            table() {}
        }
    };

    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;

    const context = vm.createContext(sandbox);
    vm.runInContext(utilsSource, context, { filename: 'settings-utils.js' });

    return {
        sandbox,
        document,
        rootStyles,
        counts,
        runContentScript() {
            vm.runInContext(contentSource, context, { filename: 'gemini-content.js' });
        },
        runTimers(delay) {
            Array.from(timers.entries())
                .filter(([, timer]) => timer.delay === delay)
                .forEach(([id, timer]) => {
                    timers.delete(id);
                    timer.callback();
                });
        }
    };
}

// 场景 1：声明式 content_scripts 在 document_start 注入，DOMContentLoaded 后只初始化一次
{
    const page = createPage('loading');
    page.runContentScript();

    assert.strictEqual(page.sandbox.widerGeminiContentLoaded, true, 'content script marks the page as loaded for background.js');
    assert.strictEqual(page.counts.storageGet, 0, 'nothing is applied before the DOM is ready');

    page.document.dispatch('DOMContentLoaded');
    assert.strictEqual(page.counts.storageGet, 1, 'DOMContentLoaded initializes settings once');
    assert.strictEqual(page.counts.observerStart, 1, 'DOMContentLoaded starts one mutation observer');
    assert.strictEqual(page.rootStyles.get('--gemini-chat-width'), '1200px');
    assert.ok(page.document.body.classList.contains('code-wrap-enabled'));

    page.sandbox.dispatch('load');
    assert.strictEqual(page.counts.storageGet, 1, 'load must not initialize the content script a second time');
    assert.strictEqual(page.counts.observerStart, 1, 'load must not attach duplicate observers');

    // background.js 补注入时脚本会再次执行；已注入的页面必须是空操作
    page.runContentScript();
    page.document.dispatch('DOMContentLoaded');
    page.sandbox.dispatch('load');
    assert.strictEqual(page.counts.storageGet, 1, 're-injection must not reapply settings');
    assert.strictEqual(page.counts.observerStart, 1, 're-injection must not attach duplicate observers');
    assert.strictEqual(page.counts.messageListeners, 1, 're-injection must not register duplicate message listeners');
    assert.strictEqual(page.counts.storageChangeListeners, 1, 're-injection must not register duplicate storage listeners');
}

// 场景 2：PWA 冷启动错过了声明式注入，background.js 在浏览器启动后补注入到已加载完成的页面
{
    const page = createPage('complete');
    page.runContentScript();

    assert.strictEqual(page.sandbox.widerGeminiContentLoaded, true);
    assert.strictEqual(page.counts.storageGet, 0, 'initialization is deferred to a macrotask');

    page.runTimers(0);
    assert.strictEqual(page.counts.storageGet, 1, 'late injection applies settings without a page reload');
    assert.strictEqual(page.counts.observerStart, 1, 'late injection starts one mutation observer');
    assert.strictEqual(page.rootStyles.get('--gemini-chat-width'), '1200px');
    assert.ok(page.document.body.classList.contains('code-wrap-enabled'));
}

console.log('gemini-content lifecycle tests passed');
