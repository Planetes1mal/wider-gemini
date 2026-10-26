// @ts-check
// 公共内核（消息导航）：把适配器给出的用户消息、滚动容器和边界交给 message-navigation.js；
// 计算导航条的上下边界与留白。导航条本身（渲染、跳转、键盘）与网站无关。
(function () {
    'use strict';

    const core = window.widerRoomyCore = window.widerRoomyCore || { modules: {} };
    if (core.modules.navigation) return;

    core.modules.navigation = function (ctx) {
        const site = ctx.site;
        let navigation = null;
        let navigationTimer = null;
        const module = { get rail() { return navigation; } };

        function railWidth() {
            return window.widerMessageNavigation.RAIL_WIDTH;
        }

        // 当前对话里的用户消息：适配器可以自定义列表（含稳定 key）；默认按用户气泡的最外层去重。
        function turns() {
            const surface = ctx.surface;
            if (!surface.column) return [];
            if (site.turns) return site.turns(surface, ctx).filter(turn => turn && turn.element);
            const reading = ctx.reading;
            if (!reading.USER_BUBBLE) return [];
            const elements = [...new Set([...surface.column.querySelectorAll(reading.USER_BUBBLE)].map(reading.outerBubble))];
            return elements.filter(element => element && !ctx.isExcluded(element)).map(element => {
                const textNode = site.turnText ? element.querySelector(site.turnText) : null;
                const text = (textNode || element).textContent.replace(/\s+/g, ' ').trim();
                const key = site.turnKey ? site.turnKey(element, ctx) : null;
                return key ? { element, text, key } : { element, text };
            });
        }

        function bounds() {
            const surface = ctx.surface;
            // 使用滚动容器的 client box：scrollbar-gutter: stable both-edges 时两侧都有占位。
            const rect = surface.scroll.getBoundingClientRect();
            const left = rect.left + surface.scroll.clientLeft;
            const footerTop = surface.footer ? surface.footer.getBoundingClientRect().top : rect.bottom;
            const top = rect.top + surface.scroll.clientTop + ctx.resolve(site.navigation.topInset, surface, ctx);
            return {
                left, right: left + surface.scroll.clientWidth, top,
                bottom: Math.min(rect.bottom, footerTop) - ctx.resolve(site.navigation.bottomInset, surface, ctx)
            };
        }

        // 对话列与窗格右缘之间不足 24px 时，在宽度生效的前提下对称收窄对话列，为导航条留出空间。
        function neededGutter() {
            const column = ctx.surface.column;
            if (!column || !column.parentElement) return 0;
            const available = column.parentElement.clientWidth;
            const padding = parseFloat(getComputedStyle(column).paddingRight) || 0;
            const setting = ctx.settings.chatWidthSetting;
            const requested = setting.unit === 'percent' ? innerWidth * setting.value / 100 : setting.value;
            const side = (available - Math.min(requested, available - padding * 2)) / 2;
            // 多留 1px，抵消小数像素取整。
            return side >= railWidth() ? 0 : Math.max(0, Math.ceil(railWidth() - padding) + 1);
        }

        function wanted() {
            return ctx.siteActive && ctx.settings.navigationEnabled && Boolean(window.widerMessageNavigation) &&
                ctx.isChatSurface() && Boolean(ctx.surface.scroll);
        }

        // 内容实际右缘：当前对话中最右侧的消息正文；没有消息时取对话列内容框。
        function contentRight() {
            const column = ctx.surface.column;
            const roots = ctx.reading.MESSAGE_ROOT ? [...column.querySelectorAll(ctx.reading.MESSAGE_ROOT)].slice(-40) : [];
            if (roots.length) return Math.max(...roots.map(node => node.getBoundingClientRect().right));
            return column.getBoundingClientRect().right - (parseFloat(getComputedStyle(column).paddingRight) || 0);
        }

        function sync() {
            navigationTimer = null;
            if (ctx.retired) return;
            if (!wanted()) {
                if (navigation) navigation.destroy();
                navigation = null;
                return;
            }
            const current = turns();
            const paneBounds = bounds();
            // 留白后仍放不下 24px 导航条（窗格过窄）时隐藏。
            const fits = paneBounds.right - contentRight() >= railWidth() - 1;
            if (!navigation) {
                navigation = window.widerMessageNavigation.create({
                    labels: {
                        rail: chrome.i18n.getMessage('navigationLabel') || 'Message navigation',
                        message: (n, total) => (chrome.i18n.getMessage('navigationMessage') || 'Message {n} of {total}')
                            .replace('{n}', n).replace('{total}', total),
                        attachment: chrome.i18n.getMessage('navigationAttachment') || 'Attachment',
                        older: chrome.i18n.getMessage('navigationEarlier') || 'Earlier messages'
                    },
                    topInset: () => ctx.resolve(site.navigation.scrollInset, ctx.surface, ctx),
                    onStale: queue
                });
            }
            // 站点浮窗里的对话：导航条挂进浮窗，避免被遮挡并随拖动移动。
            const container = ctx.surface.navigationContainer || null;
            navigation.update(fits ? { turns: current, scrollRoot: ctx.surface.scroll, bounds: paneBounds, container } : null);
        }

        function queue() {
            if (!ctx.retired && navigationTimer === null) navigationTimer = setTimeout(sync, 0);
        }

        function retire() {
            clearTimeout(navigationTimer);
            navigationTimer = null;
            if (navigation) navigation.destroy();
            navigation = null;
        }

        module.turns = turns;
        module.bounds = bounds;
        module.neededGutter = neededGutter;
        module.wanted = wanted;
        module.contentRight = contentRight;
        module.sync = sync;
        module.queue = queue;
        module.retire = retire;
        return module;
    };
})();
