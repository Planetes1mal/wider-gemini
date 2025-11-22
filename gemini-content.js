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
        { key: 'input-container', value: 'max-width: {width}px; margin-left: auto; margin-right: auto; margin-bottom: 10px', sleep: 0 },
        { key: '.chat-container', value: 'max-width: {width}px; margin-left: auto; margin-right: auto', sleep: 0 },
        { key: '.chat-container.xap-drag-in-progress', value: 'max-width: {width}px', sleep: 0 },
        { key: '.chat-container.xap-drag-in-progress > *', value: 'max-width: 100%', sleep: 0 },
        { key: 'upload-card', value: 'max-width: {width}px', sleep: 0 },
        { key: '.upload-card', value: 'max-width: {width}px', sleep: 0 },
        { key: 'file-drop-area', value: 'max-width: 100%', sleep: 0 },
        { key: '.file-drop-area', value: 'max-width: 100%', sleep: 0 },
        { key: '[class*="drop-zone"]', value: 'max-width: {width}px', sleep: 0 },
        { key: '[class*="drag-over"]', value: 'max-width: {width}px', sleep: 0 },
        { key: '.mat-menu-panel', value: 'max-width: {width}px', sleep: 0 },
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
                    // 使用CSS属性名（带连字符），而不是JS格式
                    element.style.setProperty(property, value, 'important');
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
                console.error(`[Wider Gemini] CSS query error: ${css.key}`, e);
            }
        }
    }

    // 应用代码换行设置
    function applyCodeWrap(enabled) {
        if (enabled) {
            document.body.classList.add('code-wrap-enabled');
            console.log('[Wider Gemini] Code auto wrap enabled');
        } else {
            document.body.classList.remove('code-wrap-enabled');
            console.log('[Wider Gemini] Code auto wrap disabled');
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
            console.log('[Wider Gemini] Deep Research page detected, using 1600px width');
            root.style.setProperty('--gemini-chat-width', '1600px');
            width = 1600;
        }

        // 应用样式到所有元素
        modifyElementStyles(width);

        // 动态检测并应用拖放窗口样式
        applyDragDropStyles(width);

        console.log(`[Wider Gemini] Applied width ${width}px`);
    }

    // 动态检测并应用拖放窗口样式
    function applyDragDropStyles(width) {
        // 获取当前宽度设置
        const currentWidth = width || parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width')) || 1000;

        // 查找所有可能的拖放相关元素
        const possibleSelectors = [
            // 通用拖放相关类名
            '[class*="drop"]',
            '[class*="drag"]',
            '[class*="upload"]',
            '[class*="file"]',
            // 可能的拖放区域
            '[class*="zone"]',
            '[class*="area"]',
            // 覆盖层和对话框
            '.cdk-overlay-pane',
            '.mat-menu-panel',
            '[role="dialog"]',
            // 拖拽状态下的容器
            '.xap-drag-in-progress',
            '.xap-drag-in-progress *'
        ];

        const processedElements = new WeakSet();

        possibleSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (processedElements.has(element)) return;

                    const style = window.getComputedStyle(element);
                    const classes = Array.from(element.classList || []).join(' ').toLowerCase();

                    // 检查元素是否可能是拖放窗口
                    // 特征：包含拖放相关关键词、可见、有宽度、可能是固定或绝对定位
                    const isLikelyDropZone = (
                        (classes.includes('drop') ||
                            classes.includes('drag') ||
                            classes.includes('upload') ||
                            classes.includes('file') ||
                            classes.includes('zone')) &&
                        style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        (parseInt(style.width) > 100 || style.position === 'fixed' || style.position === 'absolute')
                    );

                    // 如果是拖放区域或者是覆盖层，应用宽度限制
                    if (isLikelyDropZone ||
                        element.classList.contains('cdk-overlay-pane') ||
                        element.classList.contains('mat-menu-panel') ||
                        element.getAttribute('role') === 'dialog') {

                        // 检查元素是否在输入区域内
                        const inputArea = element.closest('.input-area-container, input-container, .chat-container');
                        if (inputArea || isLikelyDropZone) {
                            // 如果在输入区域内，使用100%，否则使用设置宽度
                            const maxWidth = inputArea ? '100%' : `${currentWidth}px`;
                            element.style.setProperty('max-width', maxWidth, 'important');
                            processedElements.add(element);
                        }
                    }
                });
            } catch (e) {
                // 忽略选择器错误
            }
        });

        // 特别处理拖拽状态下的容器
        const chatContainer = document.querySelector('.chat-container.xap-drag-in-progress');
        if (chatContainer) {
            chatContainer.style.setProperty('max-width', `${currentWidth}px`, 'important');

            // 查找拖拽状态下可能出现的拖放UI
            const dragChildren = chatContainer.querySelectorAll('*');
            dragChildren.forEach(child => {
                const childStyle = window.getComputedStyle(child);
                const childClasses = Array.from(child.classList || []).join(' ').toLowerCase();

                // 如果是新出现的拖放相关元素，应用样式
                if ((childClasses.includes('drop') ||
                    childClasses.includes('drag') ||
                    childClasses.includes('upload')) &&
                    childStyle.display !== 'none' &&
                    parseInt(childStyle.width) > 100) {
                    child.style.setProperty('max-width', '100%', 'important');
                }
            });
        }
    }

    // 从存储中获取设置并应用
    function applySettings() {
        if (!isExtensionContextValid()) {
            console.log('[Wider Gemini] Extension context invalid, stopping');
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
            console.log('[Wider Gemini] Failed to get storage:', e.message);
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
            let shouldUpdate = false;

            mutations.forEach(mutation => {
                // 检查是否有新增的对话容器或输入区域
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            const classList = node.classList || [];
                            const tagName = node.tagName ? node.tagName.toLowerCase() : '';

                            if (classList.contains('conversation-container') ||
                                classList.contains('input-area-container') ||
                                classList.contains('upload-card') ||
                                classList.contains('file-drop-area') ||
                                tagName === 'user-query' ||
                                tagName === 'input-container' ||
                                tagName === 'upload-card' ||
                                tagName === 'file-drop-area' ||
                                node.querySelector?.('.conversation-container') ||
                                node.querySelector?.('user-query') ||
                                node.querySelector?.('.input-area-container') ||
                                node.querySelector?.('upload-card') ||
                                node.querySelector?.('.upload-card') ||
                                node.querySelector?.('file-drop-area') ||
                                node.querySelector?.('.file-drop-area') ||
                                node.querySelector?.('.mat-menu-panel')) {
                                shouldUpdate = true;
                            }
                        }
                    }
                }

                // 检查类名变化，特别是拖拽状态
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList && target.classList.contains('xap-drag-in-progress')) {
                        shouldUpdate = true;
                    }
                }
            });

            if (shouldUpdate) {
                applySettings();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });

        // 增强拖拽事件监听，在拖拽时持续应用样式
        let dragCheckFrame = null;
        let isDragging = false;

        const startDragCheck = () => {
            if (dragCheckFrame) return;
            isDragging = true;

            const checkDragElements = () => {
                if (!isDragging) {
                    dragCheckFrame = null;
                    return;
                }

                // 获取当前宽度设置
                const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width')) || 1000;

                // 应用拖放样式
                applyDragDropStyles(width);

                // 检查拖拽状态
                const chatContainer = document.querySelector('.chat-container');
                if (chatContainer && chatContainer.classList.contains('xap-drag-in-progress')) {
                    applySettings();
                }

                // 继续检查
                dragCheckFrame = requestAnimationFrame(checkDragElements);
            };

            dragCheckFrame = requestAnimationFrame(checkDragElements);
        };

        const stopDragCheck = () => {
            isDragging = false;
            if (dragCheckFrame) {
                cancelAnimationFrame(dragCheckFrame);
                dragCheckFrame = null;
            }
        };

        // 监听所有拖拽相关事件，使用捕获阶段确保能捕获到所有事件
        document.addEventListener('dragenter', function (e) {
            startDragCheck();
            // 获取当前宽度并立即应用
            const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width')) || 1000;
            applyDragDropStyles(width);
        }, true);

        document.addEventListener('dragover', function (e) {
            if (!isDragging) {
                startDragCheck();
            }
            // 获取当前宽度并立即应用
            const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width')) || 1000;
            applyDragDropStyles(width);
        }, true);

        document.addEventListener('dragleave', function (e) {
            // 延迟停止检查，避免快速进出时频繁启动/停止
            setTimeout(() => {
                if (!document.querySelector('.xap-drag-in-progress')) {
                    stopDragCheck();
                }
            }, 100);
        }, true);

        document.addEventListener('drop', function (e) {
            // 延迟停止检查，给DOM更新一些时间
            setTimeout(() => {
                stopDragCheck();
                // 最后应用一次样式
                const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width')) || 1000;
                applyDragDropStyles(width);
                applySettings();
            }, 200);
        }, true);

        console.log('[Wider Gemini] MutationObserver and drag listeners started');
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

    // 调试辅助函数 - 在控制台可以调用
    // 使用方法：在浏览器控制台输入 window.widerGeminiDebug.findDragElements()
    if (typeof window !== 'undefined') {
        window.widerGeminiDebug = {
            // 查找所有可能的拖放元素
            findDragElements: function () {
                const results = [];
                const selectors = [
                    '[class*="drop"]',
                    '[class*="drag"]',
                    '[class*="upload"]',
                    '[class*="file"]',
                    '[class*="zone"]',
                    '[class*="area"]',
                    '.cdk-overlay-pane',
                    '.mat-menu-panel',
                    '[role="dialog"]',
                    '.xap-drag-in-progress'
                ];

                selectors.forEach(selector => {
                    try {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach(el => {
                            const style = window.getComputedStyle(el);
                            const classes = Array.from(el.classList || []).join(' ');
                            results.push({
                                selector: selector,
                                tag: el.tagName,
                                classes: classes,
                                id: el.id || '',
                                width: style.width,
                                maxWidth: style.maxWidth,
                                display: style.display,
                                position: style.position,
                                zIndex: style.zIndex,
                                isVisible: style.display !== 'none' && style.visibility !== 'hidden',
                                element: el
                            });
                        });
                    } catch (e) {
                        console.error('选择器错误:', selector, e);
                    }
                });

                console.table(results);
                console.log('Found', results.length, 'possible drag elements');
                return results;
            },

            // 手动触发拖放样式应用
            applyDragStyles: function () {
                const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width')) || 1000;
                applyDragDropStyles(width);
                console.log('Applied drag styles, width:', width + 'px');
            },

            // 获取当前宽度设置
            getCurrentWidth: function () {
                const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width')) || 1000;
                console.log('Current width setting:', width + 'px');
                return width;
            }
        };

        console.log('[Wider Gemini] Debug tools loaded, use window.widerGeminiDebug to access');
    }
})();
