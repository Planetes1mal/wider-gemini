(function () {
    'use strict';

    // 检查扩展上下文是否有效
    function isExtensionContextValid() {
        try {
            return chrome.runtime && chrome.runtime.id;
        } catch (e) {
            return false;
        }
    }

    // CSS 样式配置数组
    // {width} 会被替换为用户设置的宽度值
    const css_config = [
        { key: '.conversation-container', value: 'max-width: {width}px', sleep: 0 },
        { key: '.conversation-container user-query', value: 'max-width: 100%', sleep: 0 },
        { key: '.input-area-container', value: 'max-width: {width}px; margin-left: auto; margin-right: auto', sleep: 0 },
        { key: 'input-container', value: 'margin-bottom: 10px', sleep: 0 },
        { key: 'hallucination-disclaimer', value: 'display: none', sleep: 0 }
    ];

    // 延迟函数
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 应用 CSS 样式到元素
    function applyCSSStyles(element, cssText) {
        const styles = cssText.split(';').filter(style => style.trim() !== '');

        styles.forEach(style => {
            const [property, value] = style.split(':').map(s => s.trim());
            if (property && value) {
                // CSS 自定义属性
                if (property.startsWith('--')) {
                    element.style.setProperty(property, value, 'important');
                } else {
                    // CSS 转 JS 格式
                    const jsProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    element.style.setProperty(jsProperty, value, 'important');
                }
            }
        });
    }

    // 修改元素样式
    async function modifyElementStyles(width) {
        // CSS 方式
        for (const css of css_config) {
            if (css.sleep > 0) {
                await delay(css.sleep);
            }

            try {
                const elements = document.querySelectorAll(css.key);
                if (elements.length > 0) {
                    elements.forEach(element => {
                        // 替换 {width} 占位符
                        const cssValue = css.value.replace('{width}', width);
                        applyCSSStyles(element, cssValue);
                    });
                }
            } catch (e) {
                console.error(`[Wider Gemini] CSS 查询错误：${css.key}`, e);
            }
        }
    }

    // 应用代码换行设置
    function applyCodeWrap(enabled) {
        if (enabled) {
            document.body.classList.add('code-wrap-enabled');
            console.log('[Wider Gemini] 代码自动换行已开启');
        } else {
            document.body.classList.remove('code-wrap-enabled');
            console.log('[Wider Gemini] 代码自动换行已关闭');
        }
    }

    // 应用宽度样式
    function applyWidthStyle(width) {
        // 设置 CSS 变量
        const root = document.documentElement;
        root.style.setProperty('--gemini-chat-width', `${width}px`);

        // 检查是否是 Deep Research 页面
        const isDeepResearch = document.querySelector('#extended-response-message-content') !== null;
        if (isDeepResearch) {
            console.log('[Wider Gemini] 检测到 Deep Research 页面，使用 1600px 宽度');
            root.style.setProperty('--gemini-chat-width', '1600px');
            width = 1600;
        }

        // 应用样式到所有元素
        modifyElementStyles(width);

        console.log(`[Wider Gemini] 已应用宽度 ${width}px`);
    }

    // 从存储中获取设置并应用
    function applySettings() {
        if (!isExtensionContextValid()) {
            console.log('[Wider Gemini] 扩展上下文已失效，停止运行');
            return;
        }

        try {
            chrome.storage.sync.get(['chatWidth', 'codeWrap'], function (result) {
                if (!isExtensionContextValid()) return;
                const width = result.chatWidth || 1000;
                const codeWrap = result.codeWrap !== undefined ? result.codeWrap : false;
                applyWidthStyle(width);
                applyCodeWrap(codeWrap);
            });
        } catch (e) {
            console.log('[Wider Gemini] 获取存储失败:', e.message);
        }
    }

    // 监听来自 popup 的消息
    if (isExtensionContextValid()) {
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (!isExtensionContextValid()) return;

            if (request.action === 'updateWidth') {
                applyWidthStyle(request.width);
                sendResponse({ success: true });
            } else if (request.action === 'updateCodeWrap') {
                applyCodeWrap(request.enabled);
                sendResponse({ success: true });
            }
        });
    }

    // 监听 URL 变化
    function observeUrlChanges() {
        let lastUrl = location.href;

        const urlChangeHandler = function () {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                applySettings();
            }
        };

        window.addEventListener('popstate', urlChangeHandler);
        window.addEventListener('hashchange', urlChangeHandler);

        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function () {
            originalPushState.apply(this, arguments);
            urlChangeHandler();
        };

        history.replaceState = function () {
            originalReplaceState.apply(this, arguments);
            urlChangeHandler();
        };
    }

    // 初始化
    function init() {
        applySettings();
        observeUrlChanges();

        // 使用 MutationObserver 监听 DOM 变化
        const observer = new MutationObserver(function (mutations) {
            const shouldUpdate = mutations.some(mutation => {
                // 检查是否有新增的对话容器或输入区域
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            const classList = node.classList || [];
                            const tagName = node.tagName ? node.tagName.toLowerCase() : '';

                            if (classList.contains('conversation-container') ||
                                classList.contains('input-area-container') ||
                                tagName === 'user-query' ||
                                tagName === 'input-container' ||
                                node.querySelector?.('.conversation-container') ||
                                node.querySelector?.('user-query') ||
                                node.querySelector?.('.input-area-container')) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            });

            if (shouldUpdate) {
                applySettings();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('[Wider Gemini] MutationObserver 已启动');
    }

    // 页面加载时执行
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 0);
    } else {
        document.addEventListener('DOMContentLoaded', init);
        window.addEventListener('load', init);
    }

    // 监听存储变化
    if (isExtensionContextValid()) {
        chrome.storage.onChanged.addListener(function (changes, namespace) {
            if (!isExtensionContextValid()) return;

            if (namespace === 'sync') {
                if (changes.chatWidth) {
                    applyWidthStyle(changes.chatWidth.newValue);
                }
                if (changes.codeWrap) {
                    applyCodeWrap(changes.codeWrap.newValue);
                }
            }
        });
    }
})();
