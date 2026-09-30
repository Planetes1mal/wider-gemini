(function () {
    'use strict';

    if (window.widerChatgptContentLoaded) return;
    window.widerChatgptContentLoaded = true;

    const settingsUtils = window.widerGeminiSettings;
    const WIDTH_KEY = settingsUtils.CHATGPT_WIDTH_KEY;
    const STORAGE_KEYS = settingsUtils.getSiteStorageKeys('chatgpt');
    const ACTIVE_CLASS = 'wider-chatgpt-width-active';
    // 宽度关闭时只为消息导航留白（以原生内容宽度为上限）。
    const GUTTER_CLASS = 'wider-chatgpt-nav-gutter';
    const NATIVE_WIDTH = '[class~="max-w-(--thread-body-max-width)"]';
    const HOME_OWNER = `${NATIVE_WIDTH}:has(form[data-chatgpt-composer][data-composer-placement="home"])`;
    const EXCLUDED = '[role="dialog"], [role="menu"], dialog, [data-composer-overlay-floating-ui]';
    // 结构变化时重新识别当前可见的对话界面（普通对话、Dots、Page 浮动对话、Space/Page 文档）。
    const SURFACE_MARKERS = '[data-thread-user-message-navigation-content], [data-pip-obstacle], ' +
        'form[data-chatgpt-composer], .messaging-root, .message-list, [data-role="messages-scroll"], ' +
        '[data-codex-composer-root], [data-page-document-selection], main';

    // 阅读排版只作用于消息正文里的文字拥有者，不给正文根设字号，
    // 以免 font: inherit 的复制/展开按钮、引用标签跟着变大。
    // 新版正文与气泡用 data-* 标识；旧版按角色；Dots 两种角色都用同一渲染器，角色由外层行决定。
    const ASSISTANT_ROOT = ':is([data-markdown-text-style="assistant-message"], ' +
        '[data-message-author-role="assistant"] .markdown)';
    const DOTS_USER_ROW = 'article.message-row.self:has(.message-surface)';
    const USER_BUBBLE = ':is([data-user-message-bubble], [data-message-author-role="user"] .user-message-bubble-color, ' +
        '[data-message-author-role="user"] .whitespace-pre-wrap, article.message-row.self .message-surface > .message-bubble)';
    const MESSAGE_ROOT = `:is(${ASSISTANT_ROOT}, ${USER_BUBBLE})`;
    // Dots 的代码块没有 pre：代码表面 [data-markdown-copy="code-block"] 内是显式 12px/20px 的块级 code。
    const BLOCK_CODE = '[data-markdown-copy="code-block"] code';
    const FONT_TARGET = `p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, pre code, ${BLOCK_CODE}`;
    // 密度只压缩正文行框；代码、表格行保持原生行高，只随字号等比缩放。
    const PROSE_LINE = 'p, li, h1, h2, h3, h4, h5, h6, blockquote';
    const FIXED_LINE = `pre, td, th, ${BLOCK_CODE}`;
    const BLOCK_SPACING = 'p, ul, ol, blockquote, h1, h2, h3, h4, h5, h6, hr';
    const READING_TARGET = `${FONT_TARGET}, ${FIXED_LINE}, ${BLOCK_SPACING}`;
    const READING_EXCLUDED = `${EXCLUDED}, form, button, textarea, [contenteditable], .katex, svg, canvas, iframe`;
    const READING_ATTR = 'data-wgc-reading';
    const FULL_ATTR = 'data-wgc-full';
    const PATH_ATTR = 'data-wgc-full-path';
    const WIDTH_ATTR = 'data-wgc-width';
    const NODE_MARKERS = ['data-wgc-font', 'data-wgc-line', 'data-wgc-space', PATH_ATTR];
    const NODE_PROPERTIES = ['--wgc-font', '--wgc-line', '--wgc-line-cut', '--wgc-mt', '--wgc-mb'];
    const ROOT_PROPERTIES = ['--wgc-font-scale', '--wgc-density', '--wgc-space-scale',
        '--wgc-manual-line', '--wgc-manual-gap'];

    let settings = settingsUtils.normalizeSiteSettings({}, 'chatgpt');
    let storedSettings = {};
    let pendingSettingsChanges = {};
    let settingsLoaded = false;
    let readToken = 0;
    let siteActive = false;
    let surface = { kind: 'unknown' };
    let widthActive = false;
    let columnWidth = 0;
    let markedOwners = [];
    let measuredParent = null;
    let ownerProperties = [];
    let rootProperty = null;
    let gutterProperty = null;
    let insetProperty = null;
    let layoutFrame = null;
    let readingObserver = null;
    let readingScope = null;
    let measuredNodes = new WeakSet();
    let navigation = null;
    let navigationTimer = null;

    function isExtensionContextValid() {
        try {
            return Boolean(chrome.runtime && chrome.runtime.id);
        } catch (e) {
            return false;
        }
    }

    // 只恢复仍由本脚本持有的属性；不覆盖网页在启用期间写入的新值。
    function writeProperty(record, element, property, value) {
        if (!record || record.element !== element) {
            restoreProperty(record);
            record = {
                element, property,
                original: element.style.getPropertyValue(property),
                priority: element.style.getPropertyPriority(property)
            };
        }
        if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value);
        record.written = value;
        return record;
    }

    function restoreProperty(record) {
        if (!record || record.element.style.getPropertyValue(record.property) !== record.written ||
            record.element.style.getPropertyPriority(record.property) !== '') return;
        if (record.original) record.element.style.setProperty(record.property, record.original, record.priority);
        else record.element.style.removeProperty(record.property);
    }

    // ---- 当前对话界面识别 ----

    // 路由切换后旧对话仍连接在文档里，但尺寸为 0；只接受真正可见的节点。
    function isVisible(element) {
        if (!element || element.closest('[inert], [hidden]')) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
    }

    function findVisible(selector, scope = document, accept = () => true) {
        return Array.from(scope.querySelectorAll(selector)).find(node => accept(node) && isVisible(node)) || null;
    }

    const nativeOwner = node => node.matches(NATIVE_WIDTH) && !node.closest(EXCLUDED);

    // 排除对话框/菜单/编辑区；唯一的例外是已确认的 Page 浮动对话根本身，其内部的浮层仍被排除。
    function isExcluded(node) {
        const hit = node.closest(READING_EXCLUDED);
        return Boolean(hit) && !(surface.kind === 'quickChat' && hit === surface.host);
    }

    function scrollOwner(node, limit) {
        for (let el = node.parentElement; el && el !== limit.parentElement; el = el.parentElement) {
            const overflow = getComputedStyle(el).overflowY;
            if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) return el;
        }
        return null;
    }

    /**
     * 返回当前可见对话的边界：root（阅读与导航范围）、column（对话列）、scroll（滚动容器）、
     * widthOwners（原生宽度变量所有者）。未知结构保持原生。
     */
    function isChatSurface() {
        return Boolean(surface.root) && ['chat', 'dots', 'quickChat'].includes(surface.kind);
    }

    function discoverSurface() {
        const dotsList = findVisible('.messaging-root .thread-pane .message-list', document, nativeOwner);
        if (dotsList) {
            const pane = dotsList.closest('.thread-pane');
            // 点 Reply 后输入区移入回复对话框（保持原生），主消息列表仍单独拓宽。
            const composer = findVisible(`[data-codex-composer-root] ${NATIVE_WIDTH}`, pane, nativeOwner);
            return {
                kind: 'dots', root: dotsList, column: dotsList,
                scroll: dotsList.closest('[data-role="messages-scroll"]') || pane,
                footer: null, widthOwners: composer ? [dotsList, composer] : [dotsList]
            };
        }
        const transcript = findVisible('main [data-thread-user-message-navigation-content]', document, nativeOwner);
        if (transcript) {
            const scroll = transcript.closest('[data-app-action-timeline-scroll]');
            const footer = scroll && findVisible('[data-pip-obstacle="thread-footer"]', scroll, nativeOwner);
            return {
                kind: 'chat', root: transcript, column: transcript, scroll: scroll || transcript.parentElement,
                footer, widthOwners: footer ? [transcript, footer] : []
            };
        }
        // Page 关联的浮动对话：宽度由宿主窗口决定，不改；有消息时对其正文做阅读排版与导航。
        const quickChat = findVisible('section[data-pip-obstacle="quick-chat"]');
        if (quickChat) {
            const transcript = findVisible('[data-thread-user-message-navigation-content]', quickChat);
            const footer = findVisible('[data-pip-obstacle="thread-footer"]', quickChat);
            return {
                kind: 'quickChat', host: quickChat, root: transcript, column: transcript,
                scroll: transcript && (scrollOwner(transcript, quickChat) || transcript.parentElement),
                footer, widthOwners: []
            };
        }
        const home = findVisible(`main ${HOME_OWNER}`, document, nativeOwner);
        if (home) return { kind: 'home', root: null, widthOwners: [home] };
        // 普通对话的 main 也带 data-app-shell-main-surface，只能用 Page 文档或 Space 路由正向判断。
        if (findVisible('[data-page-document-selection]') || /^\/space(\/|$)/.test(location.pathname)) {
            return { kind: 'notApplicable', root: null, widthOwners: [] };
        }
        return { kind: 'unknown', root: null, widthOwners: [] };
    }

    function syncLayout() {
        layoutFrame = null;
        const root = document.documentElement;
        if (!root) return;
        const next = discoverSurface();
        const changed = next.root !== surface.root || next.kind !== surface.kind;
        surface = next;
        widthActive = siteActive && settings.widthEnabled !== false && surface.widthOwners.length > 0;
        const railWanted = navigationWanted() && userTurns().length >= window.widerMessageNavigation.MIN_TURNS;
        // 宽度关闭时先撤下本扩展为导航留白写入的标记与内边距，在同一任务内测量原生布局（不会闪烁）。
        if (!widthActive && markedOwners.length) {
            markedOwners.forEach(owner => owner.removeAttribute(WIDTH_ATTR));
            markedOwners = [];
            root.classList.remove(GUTTER_CLASS);
        }
        restoreProperty(insetProperty);
        insetProperty = null;
        columnWidth = 0;
        if (surface.column) {
            const style = getComputedStyle(surface.column);
            columnWidth = surface.column.getBoundingClientRect().width -
                parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        }
        // 宽度关闭但原生布局右侧不足 24px 时，只为导航留白：以原生内容宽度为上限，对称收窄，输入区保持对齐。
        const nativeFree = railWanted ? navigationBounds().right - contentRight() : Infinity;
        const gutterOnly = !widthActive && railWanted && surface.widthOwners.length > 0 &&
            nativeFree < window.widerMessageNavigation.RAIL_WIDTH - 1;
        const reserve = widthActive || gutterOnly;
        if (root.classList.contains(ACTIVE_CLASS) !== widthActive) root.classList.toggle(ACTIVE_CLASS, widthActive);
        if (root.classList.contains(GUTTER_CLASS) !== gutterOnly) root.classList.toggle(GUTTER_CLASS, gutterOnly);

        // 宽度标记只写在当前界面已验证的所有者上，移走旧界面的标记。
        const owners = reserve ? surface.widthOwners : [];
        markedOwners.filter(owner => !owners.includes(owner)).forEach(owner => owner.removeAttribute(WIDTH_ATTR));
        owners.forEach(owner => owner.setAttribute(WIDTH_ATTR, ''));
        markedOwners = owners;

        const parent = reserve && surface.column ? surface.column.parentElement : null;
        if (parent !== measuredParent) {
            availableWidthObserver.disconnect();
            measuredParent = parent;
            if (parent) availableWidthObserver.observe(parent);
            if (surface.scroll) availableWidthObserver.observe(surface.scroll);
        }

        if (!reserve) {
            restoreProperty(rootProperty);
            rootProperty = null;
            ownerProperties.forEach(restoreProperty);
            ownerProperties = [];
        } else {
            rootProperty = writeProperty(rootProperty, root, '--wg-chatgpt-width', widthActive
                ? settingsUtils.getWidthCssValue(settings.chatWidthSetting) : `${columnWidth}px`);
            // 滚动区的双侧 gutter 不计入正文父容器，绝对定位的 footer/输入区却跨过 gutter。
            const available = parent ? `${parent.clientWidth}px` : null;
            const extra = surface.widthOwners.slice(1);
            ownerProperties.slice(extra.length).forEach(restoreProperty);
            ownerProperties = available ? extra.map((owner, i) =>
                writeProperty(ownerProperties[i], owner, '--wg-chatgpt-available-width', available)) : [];
            if (widthActive && settings.userFullWidth && surface.column) {
                markFullPaths(surface.column.querySelectorAll(USER_BUBBLE));
            }
        }
        // 导航需要的留白：宽度生效时按设定宽度计算；只为导航留白时补足原生缺口。
        const gutter = !railWanted ? 0 : widthActive ? neededGutter()
            : gutterOnly ? Math.ceil(window.widerMessageNavigation.RAIL_WIDTH - nativeFree) + 1 : 0;
        if (gutter) {
            gutterProperty = writeProperty(gutterProperty, root, '--wg-chatgpt-nav-gutter', `${gutter}px`);
        } else {
            restoreProperty(gutterProperty);
            gutterProperty = null;
        }
        // Page 浮动对话没有原生宽度所有者：只在对话内容里加右内边距，不改浮窗尺寸。
        if (railWanted && surface.kind === 'quickChat' && nativeFree < window.widerMessageNavigation.RAIL_WIDTH - 1) {
            insetProperty = writeProperty(null, surface.column, 'padding-inline-end',
                `${Math.ceil(window.widerMessageNavigation.RAIL_WIDTH - nativeFree) + 1}px`);
        }
        if (changed && document.readyState !== 'loading') applyReading();
        queueNavigation();
    }

    function queueLayout() {
        if (layoutFrame === null) layoutFrame = requestAnimationFrame(syncLayout);
    }

    const availableWidthObserver = new ResizeObserver(queueLayout);

    function observeLayout() {
        syncLayout();
        applyReading();
        const hasMarker = node => node.nodeType === 1 && (node.matches(SURFACE_MARKERS) || node.querySelector(SURFACE_MARKERS));
        new MutationObserver(function (mutations) {
            const changed = mutations.some(mutation => mutation.type === 'attributes'
                ? mutation.attributeName !== 'class' || hasMarker(mutation.target)
                : [...mutation.addedNodes, ...mutation.removedNodes].some(hasMarker));
            if (changed) queueLayout();
        }).observe(document.documentElement, {
            childList: true, subtree: true, attributes: true,
            attributeFilter: ['class', 'hidden', 'inert', 'role', 'data-theme', 'data-thread-user-message-navigation-content',
                'data-pip-obstacle', 'data-composer-placement', 'data-app-action-timeline-scroll',
                'data-chatgpt-composer', 'data-composer-overlay-floating-ui']
        });
        if (window.navigation) window.navigation.addEventListener('navigatesuccess', queueLayout);
        window.addEventListener('popstate', queueLayout);
        window.addEventListener('resize', queueLayout);
    }

    // ---- 阅读排版 ----

    function outerBubble(node) {
        let bubble = node.closest(USER_BUBBLE);
        while (bubble && bubble.parentElement && bubble.parentElement.closest(USER_BUBBLE)) {
            bubble = bubble.parentElement.closest(USER_BUBBLE);
        }
        return bubble;
    }

    // 用户气泡内部的类名在不同版本间变化，按“直接包含文字的元素”识别文字拥有者。
    function collectUserText(bubble, add) {
        const walker = document.createTreeWalker(bubble, NodeFilter.SHOW_TEXT);
        for (let text = walker.nextNode(); text; text = walker.nextNode()) {
            if (text.textContent.trim()) add(text.parentElement);
        }
    }

    function collectReadingNodes(scopes) {
        const nodes = new Set();
        const bubbles = new Set();
        const add = node => {
            if (!node || node.nodeType !== 1 || !node.isConnected || !readingScope.contains(node) ||
                isExcluded(node)) return;
            if (node.closest(USER_BUBBLE) ||
                (node.matches(READING_TARGET) && node.closest(ASSISTANT_ROOT))) nodes.add(node);
        };
        const addBubble = node => {
            const bubble = outerBubble(node);
            if (bubble && !bubbles.has(bubble)) {
                bubbles.add(bubble);
                collectUserText(bubble, add);
            }
        };
        for (const scope of scopes) {
            // 只处理当前可见对话里的节点，隐藏的旧路由不参与。
            if (!scope || scope.nodeType !== 1 || !scope.isConnected || !readingScope.contains(scope)) continue;
            if (scope.closest(USER_BUBBLE)) {
                addBubble(scope);
                continue;
            }
            scope.querySelectorAll(USER_BUBBLE).forEach(addBubble);
            const inside = scope.closest(ASSISTANT_ROOT);
            add(scope);
            scope.querySelectorAll(inside ? READING_TARGET : `${ASSISTANT_ROOT} :is(${READING_TARGET})`).forEach(add);
            // 新增或移除段落会改变相邻块的 :first-child / :last-child 原生外边距。
            if (inside) {
                for (const sibling of [scope.previousElementSibling, scope.nextElementSibling]) {
                    if (sibling) measuredNodes.delete(sibling);
                    add(sibling);
                }
            }
        }
        return { nodes: [...nodes].filter(node => !measuredNodes.has(node)), bubbles: [...bubbles] };
    }

    // 用户消息铺满：从气泡向上逐级测量，标记所有比对话列窄的祖先（跳过 display:contents），
    // 直到遇到与列同宽的容器。Dots 气泡外层保留原生的消息操作空间。
    function markFullPaths(bubbles) {
        if (!(columnWidth > 0) || !surface.column) return;
        for (const node of bubbles) {
            const bubble = outerBubble(node);
            if (!bubble || bubble.hasAttribute(PATH_ATTR) || isExcluded(bubble)) continue;
            const path = [];
            let reachedColumn = false;
            for (let el = bubble; el && path.length < 10; el = el.parentElement) {
                if (el === surface.column) {
                    reachedColumn = true;
                    break;
                }
                if (getComputedStyle(el).display === 'contents') continue;
                if (el.getBoundingClientRect().width >= columnWidth - 1) {
                    reachedColumn = true;
                    break;
                }
                path.push(el);
            }
            if (!reachedColumn) continue;
            path.forEach(el => el.setAttribute(PATH_ATTR,
                el === bubble ? 'bubble' : el.matches('.message-bubble-wrap') ? 'actions' : ''));
        }
    }

    // 采样前临时撤下本扩展的排版规则，同一任务内恢复；先批量读取再批量写入。
    function measureReading(scopes) {
        if (!readingScope) return;
        const { nodes: pending, bubbles } = collectReadingNodes(scopes);
        if (settings.userFullWidth && widthActive) markFullPaths(bubbles);
        if (!pending.length) return;
        const root = document.documentElement;
        const tokens = root.getAttribute(READING_ATTR);
        if (tokens !== null) root.removeAttribute(READING_ATTR);
        let metrics;
        try {
            metrics = pending.map(node => {
                const style = getComputedStyle(node);
                return {
                    node, display: style.display,
                    font: parseFloat(style.fontSize), line: parseFloat(style.lineHeight),
                    top: parseFloat(style.marginTop), bottom: parseFloat(style.marginBottom)
                };
            });
        } finally {
            if (tokens !== null) root.setAttribute(READING_ATTR, tokens);
        }
        for (const { node, display, font, line, top, bottom } of metrics) {
            const user = !node.closest(ASSISTANT_ROOT);
            if ((user || node.matches(FONT_TARGET)) && font > 0) {
                node.style.setProperty('--wgc-font', `${font}px`);
                node.setAttribute('data-wgc-font', '');
            }
            if (line > 0 && (user || node.matches(`${PROSE_LINE}, ${FIXED_LINE}`))) {
                const prose = user || node.matches(PROSE_LINE);
                node.style.setProperty('--wgc-line', `${line}px`);
                if (prose) node.style.setProperty('--wgc-line-cut', `${line - Math.min(line, Math.max(font * 1.15, line * 0.82))}px`);
                node.setAttribute('data-wgc-line', prose ? 'prose' : 'fixed');
            }
            if (!user && node.matches(BLOCK_SPACING) && display !== 'inline' && display !== 'contents' &&
                Number.isFinite(top) && Number.isFinite(bottom)) {
                node.style.setProperty('--wgc-mt', `${top}px`);
                node.style.setProperty('--wgc-mb', `${bottom}px`);
                node.setAttribute('data-wgc-space', node.previousElementSibling ? 'after' : 'first');
            }
            measuredNodes.add(node);
        }
    }

    function clearReadingMarkers() {
        document.querySelectorAll(NODE_MARKERS.map(name => `[${name}]`).join(', ')).forEach(node => {
            NODE_MARKERS.forEach(name => node.removeAttribute(name));
            NODE_PROPERTIES.forEach(name => node.style.removeProperty(name));
        });
        measuredNodes = new WeakSet();
    }

    function startReading() {
        if (readingObserver || !document.body) return;
        // 流式输出主要追加文本节点；只处理新增/移除的元素所在范围，不整页重扫。
        // 在观察回调里同步采样，新块在首次绘制前即获得设置（后台标签页也不依赖 rAF）。
        readingObserver = new MutationObserver(function (mutations) {
            if (!siteActive || !readingScope) return;
            const scopes = [];
            let turnsChanged = false;
            for (const mutation of mutations) {
                if (!readingScope.contains(mutation.target)) continue;
                for (const node of mutation.addedNodes) {
                    // 起初为空的文字拥有者后来才得到文字节点：以其父元素为范围重新识别。
                    if (node.nodeType === 1) scopes.push(node);
                    else if (node.nodeType === 3 && node.parentElement) scopes.push(node.parentElement);
                }
                if (mutation.removedNodes.length && mutation.target.nodeType === 1) {
                    for (const child of mutation.target.children) measuredNodes.delete(child);
                    scopes.push(mutation.target);
                }
                turnsChanged = true;
            }
            if (scopes.length) measureReading(scopes);
            if (turnsChanged) queueNavigation();
        });
        readingObserver.observe(document.body, { childList: true, subtree: true });
    }

    // 暂停时撤回所有标记与采样值，释放节点记录；恢复时重新按原生样式采样。
    function stopReading() {
        if (readingObserver) readingObserver.disconnect();
        readingObserver = null;
        readingScope = null;
        const root = document.documentElement;
        root.removeAttribute(READING_ATTR);
        root.removeAttribute(FULL_ATTR);
        ROOT_PROPERTIES.forEach(name => root.style.removeProperty(name));
        clearReadingMarkers();
    }

    function applyReading() {
        const root = document.documentElement;
        if (!root) return;
        if (!siteActive) {
            stopReading();
            return;
        }
        startReading();
        // 对话界面变化（包括返回缓存的旧对话）时撤回旧标记，按新界面的原生样式重新采样。
        const scope = isChatSurface() ? surface.root : null;
        if (scope !== readingScope) {
            clearReadingMarkers();
            readingScope = scope;
            if (scope) measureReading([scope]);
        }
        const progress = settings.messageCompactness / 100;
        const custom = settings.messageSpacingCustom;
        const tokens = [];
        if (settings.messageFontSize !== 100) tokens.push('font');
        if (custom) tokens.push('custom');
        else if (progress > 0) tokens.push('line', 'space');
        else if (settings.messageFontSize !== 100) tokens.push('line');
        // 默认值（100%、自动 0、手动关闭）不产生任何排版覆盖。
        root.style.setProperty('--wgc-font-scale', String(settings.messageFontSize / 100));
        root.style.setProperty('--wgc-density', String(progress));
        root.style.setProperty('--wgc-space-scale', String(1 - 0.875 * progress));
        root.style.setProperty('--wgc-manual-line', String(settings.messageLineHeight));
        root.style.setProperty('--wgc-manual-gap', `${settings.messageParagraphSpacing}px`);
        if (tokens.length) root.setAttribute(READING_ATTR, tokens.join(' '));
        else root.removeAttribute(READING_ATTR);
        // 用户消息铺满还依赖有效宽度（CSS 同时要求宽度生效类）。
        if (settings.userFullWidth) root.setAttribute(FULL_ATTR, '');
        else root.removeAttribute(FULL_ATTR);
    }

    // ---- 消息导航 ----

    function userTurns() {
        if (!surface.column) return [];
        const elements = surface.kind === 'dots'
            ? [...surface.column.querySelectorAll(DOTS_USER_ROW)]
            : [...new Set([...surface.column.querySelectorAll(USER_BUBBLE)].map(outerBubble))];
        return elements.filter(element => element && !isExcluded(element)).map(element => {
            const text = (element.querySelector('.message-text') || element).textContent.replace(/\s+/g, ' ').trim();
            return { element, text };
        });
    }

    function navigationBounds() {
        // 使用滚动容器的 client box：scrollbar-gutter: stable both-edges 时两侧都有占位。
        const rect = surface.scroll.getBoundingClientRect();
        const left = rect.left + surface.scroll.clientLeft;
        const footerTop = surface.footer ? surface.footer.getBoundingClientRect().top : rect.bottom;
        const top = rect.top + surface.scroll.clientTop + (surface.kind === 'quickChat' ? 8 : 56);
        return { left, right: left + surface.scroll.clientWidth, top, bottom: Math.min(rect.bottom, footerTop) - 8 };
    }

    // 对话列与窗格右缘之间不足 24px 时，在宽度生效的前提下对称收窄对话列，为导航条留出空间。
    function neededGutter() {
        if (!surface.column || !surface.column.parentElement) return 0;
        const available = surface.column.parentElement.clientWidth;
        const padding = parseFloat(getComputedStyle(surface.column).paddingRight) || 0;
        const setting = settings.chatWidthSetting;
        const requested = setting.unit === 'percent' ? innerWidth * setting.value / 100 : setting.value;
        const side = (available - Math.min(requested, available - padding * 2)) / 2;
        // 多留 1px，抵消小数像素取整。
        return side >= window.widerMessageNavigation.RAIL_WIDTH ? 0
            : Math.max(0, Math.ceil(window.widerMessageNavigation.RAIL_WIDTH - padding) + 1);
    }

    function navigationWanted() {
        return siteActive && settings.navigationEnabled && Boolean(window.widerMessageNavigation) &&
            isChatSurface() && Boolean(surface.scroll);
    }

    // 内容实际右缘：当前对话中最右侧的消息正文；没有消息时取对话列内容框。
    function contentRight() {
        const roots = [...surface.column.querySelectorAll(MESSAGE_ROOT)].slice(-40);
        if (roots.length) return Math.max(...roots.map(node => node.getBoundingClientRect().right));
        return surface.column.getBoundingClientRect().right - (parseFloat(getComputedStyle(surface.column).paddingRight) || 0);
    }

    function syncNavigation() {
        navigationTimer = null;
        if (!navigationWanted()) {
            if (navigation) navigation.destroy();
            navigation = null;
            return;
        }
        const turns = userTurns();
        const bounds = navigationBounds();
        // 留白后仍放不下 24px 导航条（窗格过窄）时隐藏。
        const fits = bounds.right - contentRight() >= window.widerMessageNavigation.RAIL_WIDTH - 1;
        if (!navigation) {
            navigation = window.widerMessageNavigation.create({
                labels: {
                    rail: chrome.i18n.getMessage('navigationLabel') || 'Message navigation',
                    message: (n, total) => (chrome.i18n.getMessage('navigationMessage') || 'Message {n} of {total}')
                        .replace('{n}', n).replace('{total}', total),
                    attachment: chrome.i18n.getMessage('navigationAttachment') || 'Attachment',
                    older: chrome.i18n.getMessage('navigationEarlier') || 'Earlier messages'
                },
                topInset: () => (surface.kind === 'quickChat' ? 16 : 72),
                onStale: queueNavigation
            });
        }
        navigation.update(fits ? { turns, scrollRoot: surface.scroll, bounds } : null);
    }

    function queueNavigation() {
        if (navigationTimer === null) navigationTimer = setTimeout(syncNavigation, 0);
    }

    // ---- 设置与协议 ----

    function applyAllSettings() {
        if (!settingsLoaded) return;
        settings = settingsUtils.normalizeSiteSettings(storedSettings, 'chatgpt');
        siteActive = isExtensionContextValid() && settings.siteEnabled;
        syncLayout();
        if (document.readyState !== 'loading') applyReading();
        queueNavigation();
    }

    // 读取期间收到更新的 storage 事件时，旧读取结果作废。
    function readSettings() {
        if (!isExtensionContextValid()) return;
        const token = ++readToken;
        chrome.storage.sync.get(STORAGE_KEYS, function (result) {
            if (!isExtensionContextValid() || chrome.runtime.lastError || token !== readToken) return;
            storedSettings = { ...result, ...pendingSettingsChanges };
            pendingSettingsChanges = {};
            settingsLoaded = true;
            applyAllSettings();
        });
    }

    /**
     * enabled 保留旧含义（宽度开关）；pauseReason 区分整站暂停与仅宽度关闭。
     * capabilities 分别报告宽度、阅读、用户消息铺满与导航在当前可见界面上的状态。
     */
    function getLayoutStatus() {
        syncLayout();
        const widthEnabled = settings.widthEnabled !== false;
        const pauseReason = !settings.siteEnabled ? 'site' : !widthEnabled ? 'width' : null;
        const chatSurface = isChatSurface();
        const nativeOnly = surface.kind === 'notApplicable' || surface.kind === 'quickChat';
        const supported = surface.widthOwners.length > 0;
        const status = !settingsLoaded ? 'loading' : pauseReason === 'site' ? 'sitePaused'
            : pauseReason === 'width' ? 'paused' : supported ? 'active' : nativeOnly ? 'notApplicable'
                : document.readyState === 'loading' ? 'loading' : 'unsupported';
        // 阅读识别与宽度识别分开：对话已有内容却找不到任何消息正文时，阅读设置不会生效。
        const messages = Boolean(readingScope && readingScope.querySelector(MESSAGE_ROOT));
        const conversation = Boolean(chatSurface && surface.root.textContent.trim());
        const readingStatus = !settingsLoaded ? 'loading' : !settings.siteEnabled ? 'paused'
            : !chatSurface ? 'notApplicable' : messages ? 'active' : conversation ? 'unsupported' : 'idle';
        const paused = !settings.siteEnabled ? 'paused' : null;
        const turns = chatSurface ? userTurns().length : 0;
        return {
            site: 'chatgpt', protocolVersion: settingsUtils.PROTOCOL_VERSION,
            siteEnabled: settings.siteEnabled, widthEnabled, enabled: widthEnabled, supported, status, pauseReason,
            surface: { kind: surface.kind },
            width: { active: widthActive },
            reading: { active: siteActive && messages, status: readingStatus },
            capabilities: {
                width: paused || (!widthEnabled ? 'off' : supported ? 'active' : nativeOnly ? 'notApplicable' : 'unsupported'),
                reading: readingStatus,
                fullWidth: paused || (!settings.userFullWidth ? 'off' : !widthActive ? 'idle'
                    : document.querySelector(`[${PATH_ATTR}]`) ? 'active' : 'idle'),
                navigation: paused || (!settings.navigationEnabled ? 'off' : !chatSurface ? 'notApplicable'
                    : navigation && navigation.visible ? 'active' : 'idle')
            },
            navigation: { turns, visible: Boolean(navigation && navigation.visible) }
        };
    }

    if (!isExtensionContextValid()) return;

    chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'sync' || !isExtensionContextValid()) return;
        const values = {};
        for (const key of STORAGE_KEYS) {
            if (Object.hasOwn(changes, key)) values[key] = changes[key].newValue;
        }
        if (!Object.keys(values).length) return;
        ++readToken;
        if (!settingsLoaded) {
            Object.assign(pendingSettingsChanges, values);
            readSettings();
            return;
        }
        Object.assign(storedSettings, values);
        applyAllSettings();
    });

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (!isExtensionContextValid()) return;
        if (request.action === 'getLayoutStatus') {
            sendResponse(getLayoutStatus());
        } else if (['updateSiteEnabled', 'updateReadingSettings', 'refreshSettings'].includes(request.action)) {
            // v2：重新读取已保存设置，而不是回放 popup 捕获的值。
            if (settingsLoaded) readSettings();
            sendResponse({ success: true, protocolVersion: settingsUtils.PROTOCOL_VERSION });
        } else if (request.action === 'updateWidthEnabled' || request.action === 'updateWidthSetting') {
            // 旧版 popup：只合并宽度字段；未加载前由 storage 事件与首次读取负责，不能提前标记已加载。
            if (settingsLoaded) {
                const width = settingsUtils.normalizeSiteWidthSettings(storedSettings, 'chatgpt');
                if (typeof request.enabled === 'boolean') width.widthEnabled = request.enabled;
                if (request.action === 'updateWidthSetting') {
                    Object.assign(width, request.ranges, { chatWidthSetting: request.setting });
                }
                storedSettings[WIDTH_KEY] = width;
                applyAllSettings();
            }
            sendResponse({ success: true });
        }
    });

    // 未识别结构时不启用宽度 CSS；后续 SPA 挂载或替换已知容器会重新识别。
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeLayout, { once: true });
    else observeLayout();
    readSettings();
})();
