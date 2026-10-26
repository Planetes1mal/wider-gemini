// @ts-check
// Claude（claude.ai）适配器：只负责“在这个网站上，对话、消息、滚动区、输入框分别是哪个元素”。
// 选择器来自 2026-10-26 在维护者 Chrome 里的只读结构采集。
// 宽度策略 variable：Claude 用 html 上的 --transcript-width（48rem）同时限制消息列与对话列，见 claude.css。
(function () {
    'use strict';

    const selectors = {
        // 对话页：滚动容器 → 对话列（变量 + 2.5rem）→ 消息列（变量）与 sticky 的输入区外层
        scroll: '[data-autoscroll-container]',
        chatColumn: '[data-testid="chat-column"]',
        transcript: '[data-testid="transcript-list"]',
        footer: '[data-chat-input-container]',
        chatBody: '[data-testid="chat-column-body"]',
        // 消息：每轮带稳定 data-turn-key；用户消息与助手消息各有 testid，助手正文在 .standard-markdown 内
        turn: '[data-turn-key]',
        userMessage: '[data-testid="user-message"]',
        assistantMessage: '[data-testid="assistant-message"]',
        assistantBody: '[data-testid="assistant-message"] :is(.standard-markdown, .prose)',
        messageActions: '[data-testid="message-actions"], [data-testid="user-message-actions"]',
        // 输入框（对话页与首页相同）；首页输入区的限宽层是卡片槽的第一个子元素
        editor: '[data-testid="chat-input"]',
        homeSlot: '[data-chorus-card-slot]',
        // 结构变化时重新识别
        markers: '[data-testid="chat-column"], [data-testid="transcript-list"], [data-autoscroll-container], ' +
            '[data-chat-input-container], [data-testid="chat-column-body"], [data-chorus-card-slot], ' +
            '[data-testid="transcript-row"], [data-testid="chat-input"], main'
    };

    window.widerRoomyCore.defineSite({
        id: 'claude',
        selectors,
        discover(ctx) {
            const transcript = ctx.findVisible(selectors.transcript);
            if (transcript) {
                const column = transcript.closest(selectors.chatColumn);
                const scroll = transcript.closest(selectors.scroll) || ctx.scrollOwner(transcript, document.body) ||
                    transcript.parentElement;
                const footer = column ? ctx.findVisible(selectors.footer, column) : null;
                return {
                    kind: 'chat', root: transcript, column: transcript, scroll, footer,
                    // 可用宽度以对话列的父元素为准（对话列本身就是限宽层）
                    pane: column ? column.parentElement : scroll,
                    widthOwners: column ? [{ element: column, strategy: 'variable' }] : []
                };
            }
            const editor = ctx.findVisible(selectors.editor);
            if (editor) {
                // 首页（/new）：只有输入区。限宽层（41rem）是卡片槽（display: contents）下包含输入框的那个直接子元素；
                // 槽里还有一个高度为 0 的装饰层，不能按“第一个子元素”取。
                const slot = editor.closest(selectors.homeSlot);
                let owner = null;
                for (let el = editor; slot && el && el !== slot; el = el.parentElement) {
                    if (el.parentElement === slot) owner = el;
                }
                if (owner && slot.parentElement) {
                    return { kind: 'home', root: null, pane: slot.parentElement, widthOwners: [{ element: owner, strategy: 'maxWidth' }] };
                }
            }
            // 对话骨架在但消息列没认出来（加载中或改版）→ 保持原生并报告未识别；其它页面（项目、设置、分享等）不适用。
            const chatShell = ctx.findVisible(selectors.chatBody) || ctx.findVisible(selectors.scroll);
            return { kind: chatShell ? 'unknown' : 'notApplicable', root: null, widthOwners: [] };
        },
        reading: {
            assistantRoot: selectors.assistantBody,
            userBubble: selectors.userMessage,
            exclude: `${selectors.messageActions}, .sr-only`
        },
        // 稳定标识：轮次的 data-turn-key，网站卸载屏外轮次后仍可重新定位。
        turnKey: element => {
            const owner = element.closest(selectors.turn);
            return owner ? owner.getAttribute('data-turn-key') : null;
        },
        // 顶栏 45px 覆盖在滚动容器上方，滚动容器自带约 56px 顶部内边距；输入区外层 sticky 在底部。
        navigation: { topInset: 56, bottomInset: 8, scrollInset: 72 },
        watch: {
            markers: selectors.markers,
            attributes: ['data-testid', 'data-is-streaming', 'data-chat-hidden', 'data-turn-key', 'data-autoscroll-container',
                'data-chat-input-container', 'data-chorus-card-slot']
        }
    });
})();
