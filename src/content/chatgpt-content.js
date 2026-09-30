(function () {
    'use strict';

    if (window.widerChatgptContentLoaded) return;
    window.widerChatgptContentLoaded = true;

    const settingsUtils = window.widerGeminiSettings;
    const WIDTH_KEY = settingsUtils.CHATGPT_WIDTH_KEY;
    const STORAGE_KEYS = settingsUtils.getSiteStorageKeys('chatgpt');
    const ACTIVE_CLASS = 'wider-chatgpt-width-active';
    const NATIVE_WIDTH = '[class~="max-w-(--thread-body-max-width)"]';
    const HOME_OWNER = `${NATIVE_WIDTH}:has(form[data-chatgpt-composer][data-composer-placement="home"])`;
    const WIDTH_OWNER = '[data-thread-user-message-navigation-content], ' +
        '[data-pip-obstacle="thread-footer"], form[data-chatgpt-composer], ' + HOME_OWNER;
    const EXCLUDED = '[role="dialog"], [role="menu"], dialog, [data-composer-overlay-floating-ui]';

    // 阅读排版只作用于消息正文里的文字拥有者，不给正文根设字号，
    // 以免 font: inherit 的复制/展开按钮、引用标签跟着变大。
    // 同时识别新版（data-markdown-text-style / data-user-message-bubble）与旧版（按角色）消息结构。
    const ASSISTANT_ROOT = ':is([data-markdown-text-style="assistant-message"], ' +
        '[data-message-author-role="assistant"] .markdown)';
    const USER_BUBBLE = ':is([data-user-message-bubble], [data-message-author-role="user"] .user-message-bubble-color, ' +
        '[data-message-author-role="user"] .whitespace-pre-wrap)';
    const MESSAGE_ROOT = `:is(${ASSISTANT_ROOT}, ${USER_BUBBLE})`;
    const FONT_TARGET = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, pre code';
    // 密度只压缩正文行框；代码、表格行保持原生行高，只随字号等比缩放。
    const PROSE_LINE = 'p, li, h1, h2, h3, h4, h5, h6, blockquote';
    const FIXED_LINE = 'pre, td, th';
    const BLOCK_SPACING = 'p, ul, ol, blockquote, h1, h2, h3, h4, h5, h6, hr';
    const READING_TARGET = `${FONT_TARGET}, ${FIXED_LINE}, ${BLOCK_SPACING}`;
    const READING_EXCLUDED = `${EXCLUDED}, form, button, textarea, [contenteditable], .katex, svg, canvas, iframe`;
    const READING_ATTR = 'data-wgc-reading';
    const FULL_ATTR = 'data-wgc-full';
    const PATH_ATTR = 'data-wgc-full-path';
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
    let supported = false;
    let transcriptOwner = null;
    let columnWidth = 0;
    let measuredParent = null;
    let footerProperty = null;
    let rootProperty = null;
    let layoutFrame = null;
    let readingObserver = null;
    let measuredNodes = new WeakSet();

    function isExtensionContextValid() {
        try {
            return Boolean(chrome.runtime && chrome.runtime.id);
        } catch (e) {
            return false;
        }
    }

    // 只恢复仍由本脚本持有的属性；不覆盖网页在启用期间写入的新值。
    function writeProperty(record, element, property, value) {
        if (!record) {
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

    function findVisibleOwner(selector, scope = document) {
        return Array.from(scope.querySelectorAll(selector)).find(node =>
            node.matches(NATIVE_WIDTH) && !node.closest(EXCLUDED) && node.getBoundingClientRect().width > 0);
    }

    function syncLayout() {
        layoutFrame = null;
        const root = document.documentElement;
        if (!root) return;
        const transcript = findVisibleOwner('main [data-thread-user-message-navigation-content]');
        const scrollArea = transcript && transcript.closest('[data-app-action-timeline-scroll]');
        const footer = scrollArea && findVisibleOwner('[data-pip-obstacle="thread-footer"]', scrollArea);
        const home = findVisibleOwner(`main ${HOME_OWNER}`);
        supported = Boolean((transcript && footer) || home);
        transcriptOwner = transcript || null;
        if (transcript) {
            const style = getComputedStyle(transcript);
            columnWidth = transcript.getBoundingClientRect().width -
                parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        } else {
            columnWidth = 0;
        }
        const active = siteActive && settings.widthEnabled !== false && supported;
        if (root.classList.contains(ACTIVE_CLASS) !== active) root.classList.toggle(ACTIVE_CLASS, active);
        if (active && settings.userFullWidth) markFullPaths(document.querySelectorAll(USER_BUBBLE));

        const parent = active && footer ? transcript.parentElement : null;
        if (parent !== measuredParent || (footerProperty && footerProperty.element !== footer)) {
            availableWidthObserver.disconnect();
            restoreProperty(footerProperty);
            footerProperty = null;
            measuredParent = parent;
            if (parent) availableWidthObserver.observe(parent);
        }

        if (!active) {
            restoreProperty(rootProperty);
            rootProperty = null;
            restoreProperty(footerProperty);
            footerProperty = null;
            return;
        }
        rootProperty = writeProperty(rootProperty, root, '--wg-chatgpt-width',
            settingsUtils.getWidthCssValue(settings.chatWidthSetting));
        // 滚动区的双侧 gutter 不计入正文父容器，绝对定位 footer 却跨过 gutter。
        if (parent) {
            footerProperty = writeProperty(footerProperty, footer, '--wg-chatgpt-available-width',
                `${parent.getBoundingClientRect().width}px`);
        }
    }

    function queueLayout() {
        if (layoutFrame === null) layoutFrame = requestAnimationFrame(syncLayout);
    }

    const availableWidthObserver = new ResizeObserver(queueLayout);

    function observeLayout() {
        syncLayout();
        applyReading();
        const hasOwner = node => node.nodeType === 1 && (node.matches(WIDTH_OWNER) || node.querySelector(WIDTH_OWNER));
        new MutationObserver(function (mutations) {
            const changedOwner = mutations.some(mutation => mutation.type === 'attributes'
                ? mutation.attributeName.startsWith('data-') || hasOwner(mutation.target)
                : [...mutation.addedNodes, ...mutation.removedNodes].some(hasOwner));
            if (changedOwner) queueLayout();
        }).observe(document.documentElement, {
            childList: true, subtree: true, attributes: true,
            attributeFilter: ['class', 'role', 'data-thread-user-message-navigation-content',
                'data-pip-obstacle', 'data-composer-placement', 'data-app-action-timeline-scroll',
                'data-chatgpt-composer', 'data-composer-overlay-floating-ui']
        });
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
            if (!node || node.nodeType !== 1 || !node.isConnected || node.closest(READING_EXCLUDED)) return;
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
            if (!scope || scope.nodeType !== 1 || !scope.isConnected) continue;
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
    // 直到遇到与列同宽的容器。未渲染或找不到列边界时不标记，下次布局同步再试。
    function markFullPaths(bubbles) {
        if (!(columnWidth > 0)) return;
        for (const node of bubbles) {
            const bubble = outerBubble(node);
            if (!bubble || bubble.hasAttribute(PATH_ATTR) || bubble.closest(READING_EXCLUDED)) continue;
            const path = [];
            let reachedColumn = false;
            for (let el = bubble; el && path.length < 8; el = el.parentElement) {
                if (el === transcriptOwner) {
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
            path.forEach(el => el.setAttribute(PATH_ATTR, el === bubble ? 'bubble' : ''));
        }
    }

    // 采样前临时撤下本扩展的排版规则，同一任务内恢复；先批量读取再批量写入。
    function measureReading(scopes) {
        const { nodes: pending, bubbles } = collectReadingNodes(scopes);
        if (settings.userFullWidth) markFullPaths(bubbles);
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

    function startReading() {
        if (readingObserver || !document.body) return;
        measureReading([document.body]);
        // 流式输出主要追加文本节点；只处理新增/移除的元素所在范围，不整页重扫。
        // 在观察回调里同步采样，新块在首次绘制前即获得设置（后台标签页也不依赖 rAF）。
        readingObserver = new MutationObserver(function (mutations) {
            if (!siteActive) return;
            const scopes = [];
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) if (node.nodeType === 1) scopes.push(node);
                if (mutation.removedNodes.length && mutation.target.nodeType === 1) {
                    for (const child of mutation.target.children) measuredNodes.delete(child);
                    scopes.push(mutation.target);
                }
            }
            if (scopes.length) measureReading(scopes);
        });
        readingObserver.observe(document.body, { childList: true, subtree: true });
    }

    // 暂停时撤回所有标记与采样值，释放节点记录；恢复时重新按原生样式采样。
    function stopReading() {
        if (readingObserver) readingObserver.disconnect();
        readingObserver = null;
        const root = document.documentElement;
        root.removeAttribute(READING_ATTR);
        root.removeAttribute(FULL_ATTR);
        ROOT_PROPERTIES.forEach(name => root.style.removeProperty(name));
        document.querySelectorAll(NODE_MARKERS.map(name => `[${name}]`).join(', ')).forEach(node => {
            NODE_MARKERS.forEach(name => node.removeAttribute(name));
            NODE_PROPERTIES.forEach(name => node.style.removeProperty(name));
        });
        measuredNodes = new WeakSet();
    }

    function applyReading() {
        const root = document.documentElement;
        if (!root) return;
        if (!siteActive) {
            stopReading();
            return;
        }
        startReading();
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

    // ---- 设置与协议 ----

    function applyAllSettings() {
        if (!settingsLoaded) return;
        settings = settingsUtils.normalizeSiteSettings(storedSettings, 'chatgpt');
        siteActive = isExtensionContextValid() && settings.siteEnabled;
        syncLayout();
        if (document.readyState !== 'loading') applyReading();
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

    // enabled 保留旧含义（宽度开关）；pauseReason 区分整站暂停与仅宽度关闭。
    function getLayoutStatus() {
        syncLayout();
        const widthEnabled = settings.widthEnabled !== false;
        const pauseReason = !settings.siteEnabled ? 'site' : !widthEnabled ? 'width' : null;
        const status = !settingsLoaded ? 'loading' : pauseReason === 'site' ? 'sitePaused'
            : pauseReason === 'width' ? 'paused' : supported ? 'active'
                : document.readyState === 'loading' ? 'loading' : 'unsupported';
        // 阅读识别与宽度识别分开报告：对话已有内容却找不到任何消息正文时，阅读设置不会生效。
        const messages = !!document.querySelector(MESSAGE_ROOT);
        const conversation = !!(transcriptOwner && transcriptOwner.textContent.trim());
        const readingStatus = !settingsLoaded ? 'loading' : !settings.siteEnabled ? 'paused'
            : messages ? 'active' : conversation ? 'unsupported' : 'idle';
        return {
            site: 'chatgpt', protocolVersion: settingsUtils.PROTOCOL_VERSION,
            siteEnabled: settings.siteEnabled, widthEnabled, enabled: widthEnabled, supported, status, pauseReason,
            width: { active: document.documentElement.classList.contains(ACTIVE_CLASS) },
            reading: { active: siteActive && messages, status: readingStatus }
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
