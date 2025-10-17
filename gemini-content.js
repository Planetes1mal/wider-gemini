// 检查扩展上下文是否有效
function isExtensionContextValid() {
    try {
        return chrome.runtime && chrome.runtime.id;
    } catch (e) {
        return false;
    }
}

// 从存储中获取宽度设置并应用
function applyWidth() {
    if (!isExtensionContextValid()) {
        console.log('[Wider Gemini] 扩展上下文已失效，停止运行');
        return;
    }

    try {
        chrome.storage.sync.get(['chatWidth'], function (result) {
            if (!isExtensionContextValid()) return;
            const width = result.chatWidth || 1000;
            applyWidthStyle(width);
        });
    } catch (e) {
        console.log('[Wider Gemini] 获取存储失败:', e.message);
    }
}

// 应用宽度样式
function applyWidthStyle(width) {
    const root = document.documentElement;
    root.style.setProperty('--gemini-chat-width', `${width}px`);

    // 应用到所有相关容器
    const selectors = [
        '.conversation-container',
        '.user-query-content',
        '.user-query-bubble-with-background',
        '[class*="user-query"]',
        '.message-container',
        '[class*="message-content"]'
    ];

    let totalApplied = 0;
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            // 使用setProperty with 'important'来确保优先级最高
            if (element.classList.contains('user-query-bubble-with-background') ||
                selector.includes('user-query')) {
                // 用户提问区域：右对齐贴边，宽度为AI回答的75%
                const userQueryWidth = Math.round(width * 0.55);
                element.style.setProperty('max-width', `${userQueryWidth}px`, 'important');
                element.style.setProperty('width', 'fit-content', 'important');
                element.style.setProperty('min-width', 'auto', 'important');
                element.style.setProperty('margin-left', 'auto', 'important');
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
                        parent = parent.parentElement;
                        depth++;
                    }
                }
            } else {
                // 其他容器（AI回答等）：居中对齐
                element.style.setProperty('max-width', `${width}px`, 'important');
                element.style.setProperty('margin-left', 'auto', 'important');
                element.style.setProperty('margin-right', 'auto', 'important');
            }

            totalApplied++;
        });
    });

    if (totalApplied > 0) {
        console.log(`[Wider Gemini] 已应用宽度 ${width}px 到 ${totalApplied} 个容器`);
    }
}

// 监听来自popup的消息
if (isExtensionContextValid()) {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (!isExtensionContextValid()) return;
        if (request.action === 'updateWidth') {
            applyWidthStyle(request.width);
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
                            if (node.classList?.contains('conversation-container') ||
                                node.classList?.contains('user-query-bubble-with-background') ||
                                node.querySelector?.('.conversation-container') ||
                                node.querySelector?.('.user-query-bubble-with-background')) {
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

        const userQueryBubbles = document.querySelectorAll('.user-query-bubble-with-background');
        if (userQueryBubbles.length > 0) {
            try {
                chrome.storage.sync.get(['chatWidth'], function (result) {
                    if (!isExtensionContextValid()) {
                        clearInterval(intervalId);
                        return;
                    }

                    const width = result.chatWidth || 1000;
                    userQueryBubbles.forEach(bubble => {
                        const userQueryWidth = Math.round(width * 0.55);
                        bubble.style.setProperty('max-width', `${userQueryWidth}px`, 'important');
                        bubble.style.setProperty('width', 'fit-content', 'important');
                        bubble.style.setProperty('min-width', 'auto', 'important');
                        bubble.style.setProperty('margin-left', 'auto', 'important');
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
                            parent = parent.parentElement;
                            depth++;
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
        if (namespace === 'sync' && changes.chatWidth) {
            applyWidthStyle(changes.chatWidth.newValue);
        }
    });
}
