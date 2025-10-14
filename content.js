// 从存储中获取宽度设置并应用
function applyWidth() {
    chrome.storage.sync.get(['chatWidth'], function (result) {
        const width = result.chatWidth || 1000;
        applyWidthStyle(width);
    });
}

// 应用宽度样式
function applyWidthStyle(width) {
    const root = document.documentElement;
    root.style.setProperty('--gemini-chat-width', `${width}px`);

    // 直接应用到对话容器
    const containers = document.querySelectorAll('.conversation-container');
    containers.forEach(container => {
        container.style.maxWidth = `${width}px`;
        container.style.marginLeft = 'auto';
        container.style.marginRight = 'auto';
    });

    if (containers.length > 0) {
        console.log(`[Wider Gemini] 已应用宽度 ${width}px 到 ${containers.length} 个对话容器`);
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'updateWidth') {
        applyWidthStyle(request.width);
        sendResponse({ success: true });
    }
});

// 初始化
function init() {
    applyWidth();

    // 使用MutationObserver监听DOM变化
    if (document.body) {
        const observer = new MutationObserver((mutations) => {
            // 检查是否有新的对话容器被添加
            let hasNewContainer = false;
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // 元素节点
                        if (node.classList?.contains('conversation-container') ||
                            node.querySelector?.('.conversation-container')) {
                            hasNewContainer = true;
                        }
                    }
                });
            });

            if (hasNewContainer) {
                applyWidth();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('[Wider Gemini] MutationObserver 已启动');
    }
}

// 页面加载时应用设置
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    setTimeout(init, 500);
}

// 监听存储变化
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === 'sync' && changes.chatWidth) {
        applyWidthStyle(changes.chatWidth.newValue);
    }
});
