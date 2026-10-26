// 参考站点的适配器（只用于测试，不随扩展发布）：合成页面的结构见同目录的 page.html。
window.widerRoomyCore.defineSite({
    id: 'reference',
    selectors: {
        column: 'main .column[data-conversation]',
        scroll: 'main .scroll',
        composer: 'main .composer',
        footer: 'main .composer-wrap',
        userBubble: '[data-role="user"] .bubble',
        assistantRoot: '[data-role="assistant"] .markdown',
        markers: 'main, .column, .composer, .scroll, [data-role]'
    },
    discover(ctx) {
        const S = this.selectors;
        const column = ctx.findVisible(S.column);
        const composer = ctx.findVisible(S.composer);
        if (!column) {
            // 首页只有输入区（data-placement="home"）；其它没有可识别对话的页面保持原生。
            if (composer && composer.getAttribute('data-placement') === 'home') return { kind: 'home', widthOwners: [composer] };
            return { kind: document.body.dataset.page === 'settings' ? 'notApplicable' : 'unknown' };
        }
        return {
            kind: 'chat', root: column, column,
            scroll: column.closest(S.scroll) || column.parentElement,
            footer: composer ? composer.closest(S.footer) : null,
            widthOwners: composer ? [column, composer] : [column]
        };
    },
    reading: { assistantRoot: '[data-role="assistant"] .markdown', userBubble: '[data-role="user"] .bubble' },
    turnKey: element => element.getAttribute('data-turn-key'),
    navigation: { topInset: 56, bottomInset: 8, scrollInset: 72 },
    watch: { markers: 'main, .column, .composer, .scroll, [data-role]', attributes: ['data-conversation', 'data-role', 'data-placement'] }
});
