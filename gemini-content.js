// 检查扩展上下文是否有效
function isExtensionContextValid() {
    try {
        return chrome.runtime && chrome.runtime.id;
    } catch (e) {
        return false;
    }
}

// 从存储中获取设置并应用
function applyWidth() {
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
    const root = document.documentElement;
    root.style.setProperty('--gemini-chat-width', `${width}px`);

    // 检查是否是 Deep Research 页面（通过检测特定元素）
    const isDeepResearch = document.querySelector('#extended-response-message-content') !== null;
    if (isDeepResearch) {
        console.log('[Wider Gemini] 检测到 Deep Research 页面，应用专用宽度设置');
        // Deep Research 页面：设置 chat-window 为 1600px
        const chatWindow = document.querySelector('chat-window');
        if (chatWindow) {
            chatWindow.style.setProperty('max-width', '1600px', 'important');
            chatWindow.style.setProperty('width', '100%', 'important');
            chatWindow.style.setProperty('margin-left', 'auto', 'important');
            chatWindow.style.setProperty('margin-right', 'auto', 'important');
            console.log('[Wider Gemini] Deep Research chat-window 宽度已设置为 1600px');
        }
        return;
    }

    // 检查是否在 chat-window 内（只在普通对话页面应用样式）
    const chatWindow = document.querySelector('chat-window');
    if (!chatWindow) {
        console.log('[Wider Gemini] 未找到 chat-window，跳过样式应用');
        return;
    }

    // 应用到所有相关容器（只在 chat-window 内查找）
    const selectors = [
        '.conversation-container',
        '.user-query-content',
        '.user-query-bubble-with-background',
        '[class*="user-query"]',
        '.message-container',
        '[class*="message-content"]',
        // 输入框相关选择器
        '.input-area-container',
        '[class*="input-area"]',
        '[class*="composer"]',
        '.ql-container',
        '.input-container',
        '[class*="bottom-container"]',
        '[class*="input-container-wrapper"]',
        '[class*="prompt-input"]',
        'form[class*="input"]',
        'form[class*="prompt"]'
    ];

    let totalApplied = 0;
    selectors.forEach(selector => {
        // 只在 chat-window 内查找元素
        const elements = chatWindow.querySelectorAll(selector);
        elements.forEach(element => {
            // 使用setProperty with 'important'来确保优先级最高
            if (element.classList.contains('user-query-bubble-with-background') ||
                selector.includes('user-query')) {

                // 检查是否处于编辑模式（包含编辑框）
                const isEditing = element.querySelector('textarea') ||
                    element.querySelector('[contenteditable="true"]') ||
                    element.querySelector('[role="textbox"]');

                if (isEditing) {
                    // 编辑模式：使用全宽并居中
                    element.style.setProperty('max-width', `${width}px`, 'important');
                    element.style.setProperty('width', '100%', 'important');
                    element.style.setProperty('margin-left', 'auto', 'important');
                    element.style.setProperty('margin-right', 'auto', 'important');
                    element.style.setProperty('display', 'block', 'important');

                    // 修改父元素为居中对齐
                    if (element.classList.contains('user-query-bubble-with-background')) {
                        let parent = element.parentElement;
                        let depth = 0;
                        while (parent && depth < 5) {
                            parent.style.setProperty('max-width', `${width}px`, 'important');
                            parent.style.setProperty('width', '100%', 'important');
                            parent.style.setProperty('display', 'flex', 'important');
                            parent.style.setProperty('justify-content', 'center', 'important');
                            parent = parent.parentElement;
                            depth++;
                        }
                    }
                } else {
                    // 正常模式：用户提问区域右对齐贴边，宽度为AI回答的55%
                    const userQueryWidth = Math.round(width * 0.55);
                    element.style.setProperty('max-width', `${userQueryWidth}px`, 'important');
                    element.style.setProperty('width', 'fit-content', 'important');
                    element.style.setProperty('min-width', 'auto', 'important');
                    // 移除 margin-left: auto，由父容器的 justify-content: flex-end 来实现右对齐
                    element.style.setProperty('margin-right', '0', 'important');

                    if (element.classList.contains('user-query-bubble-with-background')) {
                        element.style.setProperty('display', 'inline-block', 'important');
                    }

                    // 修改父元素使其支持右对齐
                    if (element.classList.contains('user-query-bubble-with-background')) {
                        let parent = element.parentElement;
                        let depth = 0;
                        while (parent && depth < 5) {
                            parent.style.setProperty('max-width', `${width}px`, 'important');
                            parent.style.setProperty('width', '100%', 'important');
                            parent.style.setProperty('display', 'flex', 'important');
                            parent.style.setProperty('justify-content', 'flex-end', 'important');
                            // 如果父容器包含按钮，则设置 gap 为 0
                            if (parent.querySelector('button') || parent.querySelector('[role="button"]')) {
                                parent.style.setProperty('gap', '0', 'important');
                                parent.style.setProperty('column-gap', '0', 'important');
                            }
                            parent = parent.parentElement;
                            depth++;
                        }
                    }
                }
            } else if (selector.includes('input') || selector.includes('composer') ||
                selector.includes('prompt') || selector.includes('bottom')) {
                // 输入框区域：与对话区域等宽，居中对齐，使用box-sizing防止溢出
                element.style.setProperty('max-width', `${width}px`, 'important');
                element.style.setProperty('width', '100%', 'important');
                element.style.setProperty('margin-left', 'auto', 'important');
                element.style.setProperty('margin-right', 'auto', 'important');
                element.style.setProperty('box-sizing', 'border-box', 'important');
                element.style.setProperty('overflow', 'visible', 'important');
            } else {
                // 其他容器（AI回答等）：居中对齐
                element.style.setProperty('max-width', `${width}px`, 'important');
                element.style.setProperty('margin-left', 'auto', 'important');
                element.style.setProperty('margin-right', 'auto', 'important');
            }

            totalApplied++;
        });
    });

    // 额外处理：查找所有可能的输入框容器
    applyInputAreaStyles(width);

    if (totalApplied > 0) {
        console.log(`[Wider Gemini] 已应用宽度 ${width}px 到 ${totalApplied} 个容器`);
    }
}

// 专门处理输入框区域的样式
function applyInputAreaStyles(width) {
    // 检查是否是 Deep Research 页面
    const isDeepResearch = document.querySelector('#extended-response-message-content') !== null;
    if (isDeepResearch) {
        return; // Deep Research 页面，不应用样式
    }

    // 检查是否在 chat-window 内
    const chatWindow = document.querySelector('chat-window');
    if (!chatWindow) {
        return; // 不应用样式
    }

    // 查找所有可能的输入框容器（只在 chat-window 内）
    const inputSelectors = [
        'rich-textarea',
        '[role="textbox"]',
        '.input-area',
        '.composer-container',
        '[class*="InputArea"]',
        '[class*="PromptInput"]',
        '[class*="TextInput"]'
    ];

    inputSelectors.forEach(selector => {
        const elements = chatWindow.querySelectorAll(selector);
        elements.forEach(element => {
            // 向上查找父容器并应用宽度
            let parent = element.parentElement;
            let depth = 0;
            while (parent && depth < 8) {
                const tagName = parent.tagName.toLowerCase();
                const className = String(parent.className || '');

                // 如果是可能的输入区域容器
                if (tagName === 'form' ||
                    className.includes('input') ||
                    className.includes('prompt') ||
                    className.includes('composer') ||
                    className.includes('bottom')) {
                    parent.style.setProperty('max-width', `${width}px`, 'important');
                    parent.style.setProperty('width', '100%', 'important');
                    parent.style.setProperty('margin-left', 'auto', 'important');
                    parent.style.setProperty('margin-right', 'auto', 'important');
                    parent.style.setProperty('box-sizing', 'border-box', 'important');
                    parent.style.setProperty('overflow', 'visible', 'important');
                }

                parent = parent.parentElement;
                depth++;
            }
        });
    });
}

// 监听来自popup的消息
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

// 初始化
function init() {
    applyWidth();

    // 使用MutationObserver监听DOM变化和属性变化
    if (document.body) {
        const observer = new MutationObserver((mutations) => {
            let shouldReapply = false;

            mutations.forEach(mutation => {
                // 监听新增节点
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            const classList = node.classList || [];
                            const classString = String(node.className || '');

                            if (classList.contains('conversation-container') ||
                                classList.contains('user-query-bubble-with-background') ||
                                node.querySelector?.('.conversation-container') ||
                                node.querySelector?.('.user-query-bubble-with-background') ||
                                node.querySelector?.('[role="textbox"]') ||
                                classString.includes('input') ||
                                classString.includes('prompt') ||
                                classString.includes('composer')) {
                                shouldReapply = true;
                            }
                        }
                    });
                }

                // 监听样式属性变化
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target.classList?.contains('user-query-bubble-with-background')) {
                        shouldReapply = true;
                    }
                }
            });

            if (shouldReapply) {
                applyWidth();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        console.log('[Wider Gemini] MutationObserver 已启动（监听DOM和样式变化）');
    }

    // 添加定期强制应用，防止样式被覆盖
    const intervalId = setInterval(() => {
        // 检查扩展上下文是否有效
        if (!isExtensionContextValid()) {
            console.log('[Wider Gemini] 扩展上下文失效，清除定时器');
            clearInterval(intervalId);
            return;
        }

        // 检查是否是 Deep Research 页面
        const isDeepResearch = document.querySelector('#extended-response-message-content') !== null;
        if (isDeepResearch) {
            // Deep Research 页面：持续应用 1600px 宽度
            const chatWindow = document.querySelector('chat-window');
            if (chatWindow) {
                chatWindow.style.setProperty('max-width', '1600px', 'important');
                chatWindow.style.setProperty('width', '100%', 'important');
                chatWindow.style.setProperty('margin-left', 'auto', 'important');
                chatWindow.style.setProperty('margin-right', 'auto', 'important');
            }
            return; // Deep Research 页面，跳过其他样式应用
        }

        // 检查是否在 chat-window 内
        const chatWindow = document.querySelector('chat-window');
        if (!chatWindow) {
            return; // 跳过
        }

        const userQueryBubbles = chatWindow.querySelectorAll('.user-query-bubble-with-background');
        if (userQueryBubbles.length > 0) {
            try {
                chrome.storage.sync.get(['chatWidth'], function (result) {
                    if (!isExtensionContextValid()) {
                        clearInterval(intervalId);
                        return;
                    }

                    const width = result.chatWidth || 1000;
                    userQueryBubbles.forEach(bubble => {
                        // 检查是否处于编辑模式
                        const isEditing = bubble.querySelector('textarea') ||
                            bubble.querySelector('[contenteditable="true"]') ||
                            bubble.querySelector('[role="textbox"]');

                        if (isEditing) {
                            // 编辑模式：使用全宽并居中
                            bubble.style.setProperty('max-width', `${width}px`, 'important');
                            bubble.style.setProperty('width', '100%', 'important');
                            bubble.style.setProperty('margin-left', 'auto', 'important');
                            bubble.style.setProperty('margin-right', 'auto', 'important');
                            bubble.style.setProperty('display', 'block', 'important');

                            // 强制修改父容器使其居中对齐
                            let parent = bubble.parentElement;
                            let depth = 0;
                            while (parent && depth < 5) {
                                parent.style.setProperty('max-width', `${width}px`, 'important');
                                parent.style.setProperty('width', '100%', 'important');
                                parent.style.setProperty('display', 'flex', 'important');
                                parent.style.setProperty('justify-content', 'center', 'important');
                                parent = parent.parentElement;
                                depth++;
                            }
                        } else {
                            // 正常模式：右对齐，55%宽度
                            const userQueryWidth = Math.round(width * 0.55);
                            bubble.style.setProperty('max-width', `${userQueryWidth}px`, 'important');
                            bubble.style.setProperty('width', 'fit-content', 'important');
                            bubble.style.setProperty('min-width', 'auto', 'important');
                            // 移除 margin-left: auto，由父容器的 justify-content: flex-end 来实现右对齐
                            bubble.style.setProperty('margin-right', '0', 'important');
                            bubble.style.setProperty('display', 'inline-block', 'important');

                            // 强制修改父容器使其支持右对齐
                            let parent = bubble.parentElement;
                            let depth = 0;
                            while (parent && depth < 5) {
                                parent.style.setProperty('max-width', `${width}px`, 'important');
                                parent.style.setProperty('width', '100%', 'important');
                                parent.style.setProperty('display', 'flex', 'important');
                                parent.style.setProperty('justify-content', 'flex-end', 'important');
                                // 如果父容器包含按钮，则设置 gap 为 0
                                if (parent.querySelector('button') || parent.querySelector('[role="button"]')) {
                                    parent.style.setProperty('gap', '0', 'important');
                                    parent.style.setProperty('column-gap', '0', 'important');
                                }
                                parent = parent.parentElement;
                                depth++;
                            }
                        }
                    });
                });
            } catch (e) {
                console.log('[Wider Gemini] 定时器执行出错，清除定时器:', e.message);
                clearInterval(intervalId);
            }
        }
    }, 100); // 每100毫秒检查一次
}

// 页面加载时应用设置
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    setTimeout(init, 500);
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
