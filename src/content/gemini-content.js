(function () {
    'use strict';

    // 浏览器启动时（如 PWA 冷启动）Gemini 页面可能先于扩展加载而错过声明式注入，
    // 由 background.js 补注入本脚本；若本页已注入过则直接跳过，避免重复初始化。
    if (window.widerGeminiContentLoaded) return;
    window.widerGeminiContentLoaded = true;

    function isExtensionContextValid() {
        try {
            return chrome.runtime && chrome.runtime.id;
        } catch (e) {
            return false;
        }
    }

    const settingsUtils = window.widerGeminiSettings;
    const defaultNormalizedSettings = settingsUtils.normalizeStorage({});
    let currentRangeSettings = defaultNormalizedSettings;
    let isInitialized = false;
    let settingsLoaded = false;
    let readToken = 0;
    // 原始存储值；首次读取完成前到达的变更暂存在 pendingSettingsChanges，读取后覆盖读取结果。
    let storedSettings = {};
    let pendingSettingsChanges = {};
    let siteEnabled = true;
    let siteActive = false;
    let readingPrepared = false;
    let widthActive = false;
    const SITE_ROOT_CLASS = 'wider-gemini-active';
    const WIDTH_ROOT_CLASS = 'wider-gemini-width-enabled';
    const STORAGE_KEYS = settingsUtils.getSiteStorageKeys('gemini');
    const WIDTH_LAYOUT_SELECTOR = '.conversation-container, conversation-container, ' +
        'input-container .input-area-container, input-container input-area-v2';
    const WIDTH_RANGE_KEYS = ['widthMin', 'widthMax', 'widthPercentMin', 'widthPercentMax'];
    const widthStyleChanges = new Map();

    // 只撤回仍由本扩展持有的值；网站后来写入的 inline 样式不能被暂停操作覆盖。
    function setWidthProperty(element, property, value, priority = 'important') {
        let properties = widthStyleChanges.get(element);
        if (!properties) {
            properties = new Map();
            widthStyleChanges.set(element, properties);
        }
        let previous = properties.get(property);
        const currentValue = element.style.getPropertyValue(property);
        const currentPriority = element.style.getPropertyPriority(property);
        if (!previous || currentValue !== previous.applied || currentPriority !== previous.appliedPriority) {
            previous = { value: currentValue, priority: currentPriority };
            properties.set(property, previous);
        }
        element.style.setProperty(property, value, priority);
        previous.applied = element.style.getPropertyValue(property);
        previous.appliedPriority = element.style.getPropertyPriority(property);
    }

    function restoreWidthProperty(element, property, previous) {
        if (element.style.getPropertyValue(property) === previous.applied &&
            element.style.getPropertyPriority(property) === previous.appliedPriority) {
            if (previous.value) element.style.setProperty(property, previous.value, previous.priority);
            else element.style.removeProperty(property);
        }
    }

    function restoreWidthStyles(onlyDetached = false) {
        for (const [element, properties] of widthStyleChanges) {
            if (onlyDetached && element.isConnected) continue;
            for (const [property, previous] of properties) restoreWidthProperty(element, property, previous);
            widthStyleChanges.delete(element);
        }
    }

    // enabled 保留旧含义（宽度开关），供旧版 popup 使用；新字段区分整站暂停与仅宽度关闭。
    function getLayoutStatus() {
        const widthEnabled = currentRangeSettings.widthEnabled !== false;
        const supported = !!document.querySelector(WIDTH_LAYOUT_SELECTOR);
        const pauseReason = !siteEnabled ? 'site' : !widthEnabled ? 'width' : null;
        const status = !isInitialized || !settingsLoaded ? (widthEnabled ? 'loading' : 'paused') :
            pauseReason === 'site' ? 'sitePaused' : pauseReason === 'width' ? 'paused' :
                supported ? 'active' : 'unsupported';
        return {
            site: 'gemini', protocolVersion: settingsUtils.PROTOCOL_VERSION,
            siteEnabled, widthEnabled, enabled: widthEnabled, supported, status, pauseReason,
            width: { active: widthActive }, reading: { active: siteActive }
        };
    }

    const READING_ROOT_SELECTOR = [
        ':is(model-response, .model-response, response-container, .response-container, .presented-response-container,',
        '[data-message-author-role="assistant"], [data-message-author-role="model"])',
        ':is(.markdown, .markdown-main-panel, message-content),',
        ':is(user-query, user-query-content, [data-message-author-role="user"], [aria-label="User message"])',
        ':is(.query-text, .query-text-line, .gds-body-l)'
    ].join(' ');
    const READING_TEXT_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, li, td, th, pre, code';
    const READING_EXCLUDED_SELECTOR =
        '.cdk-overlay-container, .cdk-overlay-pane, .mat-menu-panel, [role="dialog"], [role="menu"], dialog';
    const READING_CLASSES = [
        'wider-gemini-density-enabled', 'wider-gemini-font-enabled', 'wider-gemini-spacing-custom'
    ];
    const READING_ROOT_PROPERTIES = ['--gemini-density-progress', '--gemini-density-spacing-scale',
        '--gemini-font-scale', '--gemini-message-line-height', '--gemini-message-paragraph-spacing'];
    const READING_MARKERS = ['data-wg-typography', 'data-wg-line', 'data-wg-spacing', 'data-wg-gap'];
    const READING_NODE_PROPERTIES = ['--wg-native-font-size', '--wg-native-line-height', '--wg-line-reduction',
        '--wg-native-margin-top', '--wg-native-margin-bottom', '--wg-native-row-gap'];
    let measuredReadingNodes = new WeakSet();

    const css_config = [
        { key: '.conversation-container, conversation-container', value: 'max-width: {width}', sleep: 0 },
        { key: '.conversation-container user-query, conversation-container user-query', value: 'max-width: 100%', sleep: 0 },
        { key: 'input-container .input-area-container', value: 'max-width: {width}; margin-left: auto; margin-right: auto', sleep: 0 },
        { key: 'input-container input-area-v2', value: 'max-width: {width}; margin-left: auto; margin-right: auto', sleep: 0 },
        // 外层保留原生间距所需的空间，宽度设置只约束消息和输入框内部。
        { key: '.chat-container', value: 'max-width: 100%; margin-left: auto; margin-right: auto', sleep: 0 },
        { key: '.chat-container.xap-drag-in-progress', value: 'max-width: 100%', sleep: 0 },
        { key: '.chat-container.xap-drag-in-progress > *', value: 'max-width: 100%', sleep: 0 },
        { key: 'input-container upload-card', value: 'max-width: 100%', sleep: 0 },
        { key: 'input-container .upload-card', value: 'max-width: 100%', sleep: 0 },
        { key: 'input-container file-drop-area', value: 'max-width: 100%', sleep: 0 },
        { key: 'input-container .file-drop-area', value: 'max-width: 100%', sleep: 0 },
        { key: 'hallucination-disclaimer', value: 'display: none', sleep: 0 }
    ];

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function applyCSSStyles(element, cssText) {
        const styles = cssText.split(';').filter(style => style.trim() !== '');

        styles.forEach(style => {
            const [property, value] = style.split(':').map(s => s.trim());
            if (property && value) {
                setWidthProperty(element, property, value);
            }
        });
    }

    async function modifyElementStyles(width) {
        for (const css of css_config) {
            if (css.sleep > 0) {
                await delay(css.sleep);
            }

            try {
                const elements = document.querySelectorAll(css.key);
                if (elements.length > 0) {
                    elements.forEach(element => {
                        const cssValue = css.value.replace('{width}', width);
                        applyCSSStyles(element, cssValue);
                    });
                }
            } catch (e) {
                console.error(`[Wider Gemini] CSS query error: ${css.key}`, e);
            }
        }
    }

    function normalizeAllSettings(result) {
        return settingsUtils.normalizeStorage(result || {});
    }

    function getCurrentWidthCssValue() {
        return getComputedStyle(document.documentElement)
            .getPropertyValue('--gemini-chat-width')
            .trim() || '1000px';
    }

    function prepareReadingLayout(scopes) {
        const candidates = new Set();
        const add = node => {
            if (node && node.nodeType === 1 && node.isConnected &&
                node.closest(READING_ROOT_SELECTOR) && !node.closest(READING_EXCLUDED_SELECTOR)) {
                candidates.add(node);
            }
        };
        for (const scope of scopes) {
            if (scope.nodeType !== 1) continue;
            if (scope.matches(`${READING_ROOT_SELECTOR}, ${READING_TEXT_SELECTOR}`)) add(scope);
            scope.querySelectorAll(`${READING_ROOT_SELECTOR}, ${READING_TEXT_SELECTOR}`).forEach(add);
            // 插入/删除段落会改变相邻节点的 :first-child / :last-child 原生间距。
            if (scope.matches(READING_TEXT_SELECTOR) || scope.tagName === 'DIV') {
                for (const sibling of [scope.previousElementSibling, scope.nextElementSibling]) {
                    if (sibling) measuredReadingNodes.delete(sibling);
                    add(sibling);
                }
            }
        }
        for (const node of [...candidates]) {
            add(node.parentElement); // 包含嵌套段落的容器，以及 flex/grid 的原生 row-gap。
        }
        const pending = [...candidates].filter(node => !measuredReadingNodes.has(node));
        if (!pending.length) return;

        // 仅新节点采样时暂时关闭本扩展排版；同一任务内恢复，不观察 style/data 属性。
        // 滑块更新只改根变量，不重新测量已有消息，更不会采到自己压缩后的值。
        const enabled = READING_CLASSES.filter(name => document.body.classList.contains(name));
        enabled.forEach(name => document.body.classList.remove(name));
        let measurements;
        try {
            measurements = pending.map(node => {
                const style = getComputedStyle(node);
                return { node, font: parseFloat(style.fontSize), line: parseFloat(style.lineHeight),
                    top: parseFloat(style.marginTop), bottom: parseFloat(style.marginBottom),
                    gap: parseFloat(style.rowGap), display: style.display };
            });
        } finally {
            enabled.forEach(name => document.body.classList.add(name));
        }
        for (const { node, font, line, top, bottom, gap, display } of measurements) {
            const isRoot = node.matches(READING_ROOT_SELECTOR);
            const text = node.matches(READING_TEXT_SELECTOR) || isRoot;
            // 不从消息根给嵌入的 overlay 继承字号/行高，正文块仍各自应用。
            if (text && !node.querySelector(READING_EXCLUDED_SELECTOR) && Number.isFinite(font) && font > 0) {
                node.style.setProperty('--wg-native-font-size', `${font}px`);
                node.setAttribute('data-wg-typography', '');
                if (Number.isFinite(line) && line > 0) {
                    const compactLine = Math.min(line, Math.max(font * 1.15, line * 0.82));
                    node.style.setProperty('--wg-native-line-height', `${line}px`);
                    node.style.setProperty('--wg-line-reduction', `${line - compactLine}px`);
                    node.setAttribute('data-wg-line', '');
                }
            }
            if (!isRoot && !node.matches('li, td, th, code') && display !== 'inline' && display !== 'contents' &&
                Number.isFinite(top) && Number.isFinite(bottom)) {
                node.style.setProperty('--wg-native-margin-top', `${top}px`);
                node.style.setProperty('--wg-native-margin-bottom', `${bottom}px`);
                node.setAttribute('data-wg-spacing', node.previousElementSibling ? 'after' : 'first');
            }
            if (Number.isFinite(gap) && gap > 0) {
                node.style.setProperty('--wg-native-row-gap', `${gap}px`);
                node.setAttribute('data-wg-gap', '');
            }
            measuredReadingNodes.add(node);
        }
    }

    // 暂停时撤回全部阅读标记和采样值；恢复时按当时的原生样式重新采样，避免沿用旧基准。
    function clearReadingLayout() {
        document.querySelectorAll(READING_MARKERS.map(name => `[${name}]`).join(', ')).forEach(node => {
            READING_MARKERS.forEach(name => node.removeAttribute(name));
            READING_NODE_PROPERTIES.forEach(name => node.style.removeProperty(name));
        });
        measuredReadingNodes = new WeakSet();
    }

    function applyDensitySettings(settings) {
        const root = document.documentElement;
        if (!siteActive) {
            if (document.body) READING_CLASSES.forEach(name => document.body.classList.remove(name));
            READING_ROOT_PROPERTIES.forEach(name => root.style.removeProperty(name));
            return;
        }
        const progress = settings.messageCompactness / 100;
        root.style.setProperty('--gemini-density-progress', String(progress));
        root.style.setProperty('--gemini-density-spacing-scale', String(1 - 0.875 * progress));
        root.style.setProperty('--gemini-font-scale', String(settings.messageFontSize / 100));
        root.style.setProperty('--gemini-message-line-height', String(settings.messageLineHeight));
        root.style.setProperty('--gemini-message-paragraph-spacing', `${settings.messageParagraphSpacing}px`);
        if (!document.body) return;
        document.body.classList.toggle('wider-gemini-density-enabled',
            settings.messageSpacingCustom || settings.messageCompactness > 0);
        document.body.classList.toggle('wider-gemini-spacing-custom', settings.messageSpacingCustom);
        document.body.classList.toggle('wider-gemini-font-enabled', settings.messageFontSize !== 100);
    }

    function applyCodeWrap(enabled) {
        currentRangeSettings.codeWrap = enabled;
        if (!document.body) return;
        document.body.classList.toggle('code-wrap-enabled', enabled && siteActive);
    }

    function applyUserFullWidth(enabled) {
        currentRangeSettings.userFullWidth = enabled;
        if (!document.body) return;
        document.body.classList.toggle('wider-gemini-user-full-width', enabled && widthActive);
    }

    function updateCurrentRangeSettings(ranges) {
        if (!ranges || typeof ranges !== 'object') return;
        for (const key of WIDTH_RANGE_KEYS) {
            if (Object.hasOwn(ranges, key)) currentRangeSettings[key] = ranges[key];
        }
        currentRangeSettings = settingsUtils.normalizeStorage(currentRangeSettings);
    }

    function applyWidthStyle(widthSetting, ranges) {
        updateCurrentRangeSettings(ranges);
        const root = document.documentElement;
        const normalized = settingsUtils.normalizeWidthSetting(widthSetting, currentRangeSettings);
        currentRangeSettings.chatWidthSetting = normalized;
        widthActive = isWidthEffective();
        root.classList.toggle(WIDTH_ROOT_CLASS, widthActive);
        if (document.body) applyUserFullWidth(currentRangeSettings.userFullWidth);
        restoreWidthStyles(widthActive);
        if (!widthActive) return;
        let widthCssValue = settingsUtils.getWidthCssValue(normalized);

        const isDeepResearch = document.querySelector('#extended-response-message-content') !== null;
        if (isDeepResearch) {
            console.log('[Wider Gemini] Deep Research page detected, using 1600px width');
            widthCssValue = '1600px';
        }
        // 显示消息导航且对话几乎占满窗格时，两侧各留出导航条宽度；保存的宽度值不变。
        const scroller = navigationReserved && findChatScroller();
        if (scroller) widthCssValue = `min(${widthCssValue}, ${scroller.clientWidth - (NAV_GUTTER + 1) * 2}px)`;

        setWidthProperty(root, '--gemini-chat-width', widthCssValue, '');
        modifyElementStyles(widthCssValue);
        applyDragDropStyles();
        console.log(`[Wider Gemini] Applied width ${widthCssValue}`);
    }

    function applyDragDropStyles() {
        if (!widthActive) return;
        const possibleSelectors = [
            '[class*="drop"]',
            '[class*="drag"]',
            '[class*="upload"]',
            '[class*="zone"]',
            '.xap-drag-in-progress',
            '.xap-drag-in-progress *'
        ];

        const processedElements = new WeakSet();

        possibleSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (processedElements.has(element)) return;

                    const classes = Array.from(element.classList || []).join(' ').toLowerCase();
                    if (!classes.includes('drop') && !classes.includes('drag') &&
                        !classes.includes('upload') && !classes.includes('zone')) return;
                    const inputArea = element.closest('.input-area-container, input-container, .chat-container');
                    if (!inputArea) return;

                    const style = window.getComputedStyle(element);
                    const isLikelyDropZone = (
                        style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        (parseInt(style.width) > 100 || style.position === 'fixed' || style.position === 'absolute')
                    );

                    if (isLikelyDropZone) {
                        setWidthProperty(element, 'max-width', '100%');
                        processedElements.add(element);
                    }
                });
            } catch (e) {
                // Ignore selector errors
            }
        });

        const chatContainer = document.querySelector('.chat-container.xap-drag-in-progress');
        if (chatContainer) {
            setWidthProperty(chatContainer, 'max-width', '100%');

            const dragChildren = chatContainer.querySelectorAll('*');
            dragChildren.forEach(child => {
                const childClasses = Array.from(child.classList || []).join(' ').toLowerCase();
                if (!childClasses.includes('drop') && !childClasses.includes('drag') &&
                    !childClasses.includes('upload')) return;

                const childStyle = window.getComputedStyle(child);
                if (childStyle.display !== 'none' &&
                    parseInt(childStyle.width) > 100) {
                    setWidthProperty(child, 'max-width', '100%');
                }
            });
        }
    }

    // 图片说明跟随图片左缘：图片在容器内居中显示，且 fit-content 会按图片
    // 自然宽度（而非显示宽度）收缩，CSS 无法表达"对齐到图片左缘"。
    // 直接测量 img 与说明行的实际渲染位置，给说明行设置等量左内边距。
    // 幂等：每次先移除旧值再测量，可安全重复调用。
    function alignImageCaptions() {
        if (!widthActive) return;
        try {
            document.querySelectorAll('single-image').forEach(host => {
                const img = host.querySelector('.image-button img');
                const captionRow = host.querySelector('.hero-caption-row');
                if (!img || !captionRow) return;

                const properties = widthStyleChanges.get(captionRow);
                const previous = properties && properties.get('padding-left');
                if (previous) {
                    restoreWidthProperty(captionRow, 'padding-left', previous);
                    properties.delete('padding-left');
                    if (!properties.size) widthStyleChanges.delete(captionRow);
                }
                const delta = img.getBoundingClientRect().left - captionRow.getBoundingClientRect().left;
                if (delta > 1) {
                    setWidthProperty(captionRow, 'padding-left', `${Math.round(delta)}px`);
                }
            });
        } catch (e) {
            console.log('[Wider Gemini] alignImageCaptions failed:', e.message);
        }
    }

    function isWidthEffective() {
        return siteActive && currentRangeSettings.widthEnabled !== false &&
            !!document.querySelector(WIDTH_LAYOUT_SELECTOR);
    }

    // 首次读取、storage 事件与消息都进入同一个幂等应用路径。
    function applyAllSettings() {
        if (!settingsLoaded) return;
        currentRangeSettings = normalizeAllSettings(storedSettings);
        siteEnabled = storedSettings[settingsUtils.SITE_ENABLED_KEYS.gemini] !== false;
        siteActive = Boolean(isExtensionContextValid()) && siteEnabled;
        document.documentElement.classList.toggle(SITE_ROOT_CLASS, siteActive);
        const readingWanted = siteActive && (currentRangeSettings.messageFontSize !== 100 ||
            currentRangeSettings.messageCompactness > 0 || currentRangeSettings.messageSpacingCustom);
        if (readingWanted && !readingPrepared && document.body) {
            readingPrepared = true;
            prepareReadingLayout([document.body]);
        } else if (!readingWanted && readingPrepared) {
            readingPrepared = false;
            clearReadingLayout();
        }
        applyWidthStyle(currentRangeSettings.chatWidthSetting);
        applyCodeWrap(currentRangeSettings.codeWrap);
        applyUserFullWidth(currentRangeSettings.userFullWidth);
        applyDensitySettings(currentRangeSettings);
        alignImageCaptions();
        queueNavigation();
    }

    // ---- 消息导航 ----

    const NAV_GUTTER = window.widerMessageNavigation ? window.widerMessageNavigation.RAIL_WIDTH : 24;
    let navigation = null;
    let navigationTimer = null;
    let navigationReserved = false;
    let navigationGutter = { scroller: null, input: null, amount: 0, records: [] };

    function isVisible(element) {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    // 实际的纵向滚动容器是 chat-window 内的 infinite-scroller.chat-history。
    function findChatScroller() {
        return [...document.querySelectorAll('chat-window infinite-scroller.chat-history')].find(isVisible) || null;
    }

    // 外层 user-query 与内层 user-query-content 只算一条；折叠的长消息定位到外层，不展开。
    const geminiPromptPreviews = new WeakMap();

    function geminiTurns(scroller) {
        return [...scroller.querySelectorAll('user-query')]
            .filter(query => !query.parentElement.closest('user-query'))
            .map(element => {
                // 只取可见的提问行；.query-text 里还有屏幕阅读器用的“你说”标题及重复全文。
                const lines = [...element.querySelectorAll('.query-text-line')];
                // 原生编辑器临时移除正文行：保留已保存的提问，避免误显示为附件。
                const editor = element.querySelector('textarea');
                const text = lines.length ? lines.map(line => line.textContent).join(' ')
                    : editor ? (geminiPromptPreviews.get(element) ?? editor.value) : '';
                if (lines.length) geminiPromptPreviews.set(element, text);
                return { element, text: text.replace(/\s+/g, ' ').trim() };
            });
    }

    // 宽度关闭时为导航留白：对话列表与输入区在原生内边距上对称增加同样宽度，二者保持对齐；撤销时恢复原值。
    function setNavigationGutter(scroller, amount) {
        const chat = scroller && scroller.closest('chat-window');
        const input = chat && chat.querySelector('input-container');
        if (scroller === navigationGutter.scroller && amount === navigationGutter.amount &&
            (!amount || input === navigationGutter.input)) return;
        navigationGutter.records.forEach(({ element, property, value, priority }) => {
            if (value) element.style.setProperty(property, value, priority);
            else element.style.removeProperty(property);
        });
        navigationGutter = { scroller, input, amount, records: [] };
        if (!scroller || !amount) return;
        for (const element of [scroller, input].filter(Boolean)) {
            const style = getComputedStyle(element);
            for (const property of ['padding-inline-start', 'padding-inline-end']) {
                const native = parseFloat(style.getPropertyValue(property)) || 0;
                navigationGutter.records.push({ element, property, value: element.style.getPropertyValue(property),
                    priority: element.style.getPropertyPriority(property) });
                element.style.setProperty(property, `${native + amount}px`, 'important');
            }
        }
    }

    function requestedWidthPx() {
        if (document.querySelector('#extended-response-message-content')) return 1600;
        const setting = currentRangeSettings.chatWidthSetting;
        return setting.unit === 'percent' ? innerWidth * setting.value / 100 : setting.value;
    }

    function syncNavigation() {
        navigationTimer = null;
        const wanted = siteActive && storedSettings[settingsUtils.NAVIGATION_KEYS.gemini] !== false &&
            Boolean(window.widerMessageNavigation);
        const scroller = wanted ? findChatScroller() : null;
        const turns = scroller ? geminiTurns(scroller) : [];
        const shown = turns.length >= window.widerMessageNavigation?.MIN_TURNS;
        const reserve = Boolean(shown && widthActive &&
            (scroller.clientWidth - Math.min(requestedWidthPx(), scroller.clientWidth)) / 2 < NAV_GUTTER);
        if (reserve !== navigationReserved) {
            navigationReserved = reserve;
            applyWidthStyle(currentRangeSettings.chatWidthSetting);
        }
        if (!scroller) {
            setNavigationGutter(null, 0);
            if (navigation) navigation.destroy();
            navigation = null;
            return;
        }
        if (!navigation) {
            navigation = window.widerMessageNavigation.create({
                labels: {
                    rail: chrome.i18n.getMessage('navigationLabel') || 'Message navigation',
                    message: (n, total) => (chrome.i18n.getMessage('navigationMessage') || 'Message {n} of {total}')
                        .replace('{n}', n).replace('{total}', total),
                    attachment: chrome.i18n.getMessage('navigationAttachment') || 'Attachment',
                    older: chrome.i18n.getMessage('navigationEarlier') || 'Earlier messages'
                },
                topInset: () => 16,
                onStale: queueNavigation
            });
        }
        // 使用滚动容器的 client box（左右滚动条占位都已扣除）。
        const rect = scroller.getBoundingClientRect();
        const left = rect.left + scroller.clientLeft;
        const right = left + scroller.clientWidth;
        const column = scroller.querySelector('.conversation-container, conversation-container');
        const free = () => (column ? right - column.getBoundingClientRect().right : Infinity);
        // 宽度关闭且原生对话右侧不足 24px 时，只为导航留白：已加的留白使对话右缘左移等量，扣除即为原生余量。
        const nativeFree = free() - (navigationGutter.scroller === scroller ? navigationGutter.amount : 0);
        const amount = shown && !widthActive && nativeFree < NAV_GUTTER - 1 ? Math.ceil(NAV_GUTTER - nativeFree) + 1 : 0;
        setNavigationGutter(scroller, amount);
        // 留白后仍放不下 24px 导航条时隐藏。
        const fits = free() >= NAV_GUTTER - 1;
        navigation.update(shown && fits ? {
            turns, scrollRoot: scroller,
            bounds: { left, right, top: rect.top + scroller.clientTop + 16, bottom: rect.bottom - 8 }
        } : null);
    }

    function queueNavigation() {
        if (navigationTimer === null) navigationTimer = setTimeout(syncNavigation, 0);
    }

    // 读取期间若收到更新的 storage 事件，旧读取结果作废（事件本身已合并）。
    function applySettings() {
        if (!isExtensionContextValid()) return;
        const token = ++readToken;
        try {
            chrome.storage.sync.get(STORAGE_KEYS, function (result) {
                if (!isExtensionContextValid() || token !== readToken) return;
                storedSettings = { ...result, ...pendingSettingsChanges };
                pendingSettingsChanges = {};
                settingsLoaded = true;
                applyAllSettings();
            });
        } catch (e) {
            console.log('[Wider Gemini] Failed to get storage:', e.message);
        }
    }

    // 加载前的变更只暂存，不能单独把不完整的状态标记为已加载。
    function mergeSettings(values) {
        if (!settingsLoaded) {
            Object.assign(pendingSettingsChanges, values);
            return;
        }
        Object.assign(storedSettings, values);
        applyAllSettings();
    }

    if (isExtensionContextValid()) {
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (!isExtensionContextValid()) return;

            if (request.action === 'getLayoutStatus') {
                sendResponse(getLayoutStatus());
                return;
            }
            // v2：只通知重新读取已保存的设置，不回放 popup 捕获的旧值。
            if (['updateSiteEnabled', 'updateReadingSettings', 'refreshSettings'].includes(request.action)) {
                if (settingsLoaded) applySettings();
                sendResponse({ success: true, protocolVersion: settingsUtils.PROTOCOL_VERSION });
                return;
            }
            // 旧版 popup 的字段消息：只合并各自白名单字段，不影响总开关。
            const values = {};
            if (request.action === 'updateWidthSetting') {
                values.chatWidthSetting = request.setting;
                for (const key of WIDTH_RANGE_KEYS) {
                    if (request.ranges && Object.hasOwn(request.ranges, key)) values[key] = request.ranges[key];
                }
                if (typeof request.enabled === 'boolean') values.widthEnabled = request.enabled;
            } else if (request.action === 'updateWidth') {
                values.chatWidthSetting = { value: request.width, unit: 'px' };
            } else if (request.action === 'updateWidthEnabled') {
                if (typeof request.enabled === 'boolean') values.widthEnabled = request.enabled;
            } else if (request.action === 'updateCodeWrap') {
                values.codeWrap = request.enabled === true;
            } else if (request.action === 'updateUserFullWidth') {
                values.userFullWidth = request.enabled === true;
            } else if (request.action === 'updateDensity') {
                Object.assign(values, settingsUtils.normalizeDensity(request.settings || {}), {
                    messageFontSize: settingsUtils.normalizeFontSize(request.settings?.messageFontSize)
                });
            } else {
                return;
            }
            mergeSettings(values);
            sendResponse({ success: true });
        });
    }

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

    function init() {
        // DOMContentLoaded 与 load 都会触发 init，只初始化一次
        if (isInitialized) return;
        isInitialized = true;

        applySettings();
        observeUrlChanges();

        const observer = new MutationObserver(function (mutations) {
            let shouldUpdate = false;
            const readingScopes = [];

            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            readingScopes.push(node);
                            const classList = node.classList || [];
                            const tagName = node.tagName ? node.tagName.toLowerCase() : '';

                            if (classList.contains('conversation-container') ||
                                classList.contains('input-area-container') ||
                                classList.contains('upload-card') ||
                                classList.contains('file-drop-area') ||
                                tagName === 'conversation-container' ||
                                tagName === 'user-query' ||
                                tagName === 'input-container' ||
                                tagName === 'upload-card' ||
                                tagName === 'file-drop-area' ||
                                tagName === 'single-image' ||
                                node.querySelector?.('.conversation-container, conversation-container') ||
                                node.querySelector?.('user-query') ||
                                node.querySelector?.('.input-area-container') ||
                                node.querySelector?.('upload-card') ||
                                node.querySelector?.('.upload-card') ||
                                node.querySelector?.('file-drop-area') ||
                                node.querySelector?.('.file-drop-area')) {
                                shouldUpdate = true;
                            }
                        }
                    }
                    if (mutation.removedNodes.length && mutation.target.nodeType === 1) {
                        for (const child of mutation.target.children) measuredReadingNodes.delete(child);
                        readingScopes.push(mutation.target);
                    }
                }

                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList && target.classList.contains('xap-drag-in-progress')) {
                        shouldUpdate = true;
                    }
                }
            });

            // 暂停时新插入的内容保持原生，不做排版采样。
            if (readingPrepared) prepareReadingLayout(readingScopes);
            if (readingScopes.length || mutations.some(mutation => mutation.type === 'attributes')) queueNavigation();
            if (settingsLoaded && (shouldUpdate || widthActive !== isWidthEffective())) {
                applyWidthStyle(currentRangeSettings.chatWidthSetting);
                alignImageCaptions();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });

        let dragCheckFrame = null;
        let isDragging = false;

        const startDragCheck = () => {
            if (dragCheckFrame || !widthActive) return;
            isDragging = true;

            const checkDragElements = () => {
                if (!isDragging || !widthActive) {
                    dragCheckFrame = null;
                    return;
                }

                applyDragDropStyles();

                const chatContainer = document.querySelector('.chat-container');
                if (chatContainer && chatContainer.classList.contains('xap-drag-in-progress')) {
                    modifyElementStyles(getCurrentWidthCssValue());
                }

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

        document.addEventListener('dragenter', function (e) {
            startDragCheck();
            applyDragDropStyles();
        }, true);

        document.addEventListener('dragover', function (e) {
            if (!isDragging) {
                startDragCheck();
            }
            applyDragDropStyles();
        }, true);

        document.addEventListener('dragleave', function (e) {
            setTimeout(() => {
                if (!document.querySelector('.xap-drag-in-progress')) {
                    stopDragCheck();
                }
            }, 100);
        }, true);

        document.addEventListener('drop', function (e) {
            setTimeout(() => {
                stopDragCheck();
                applyDragDropStyles();
                applySettings();
            }, 200);
        }, true);

        // 图片异步加载，load 事件不冒泡，需捕获阶段监听；
        // 窗口尺寸变化会改变图片居中位置，防抖后重新测量
        document.addEventListener('load', function (e) {
            if (e.target && e.target.matches && e.target.matches('single-image img')) {
                alignImageCaptions();
            }
        }, true);

        let captionResizeTimer = null;
        window.addEventListener('resize', function () {
            if (captionResizeTimer) clearTimeout(captionResizeTimer);
            captionResizeTimer = setTimeout(alignImageCaptions, 150);
            queueNavigation();
        });

        console.log('[Wider Gemini] MutationObserver and drag listeners started');
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 0);
    } else {
        document.addEventListener('DOMContentLoaded', init);
        window.addEventListener('load', init);
    }

    if (isExtensionContextValid()) {
        chrome.storage.onChanged.addListener(function (changes, namespace) {
            if (!isExtensionContextValid() || namespace !== 'sync') return;
            const values = {};
            for (const key of STORAGE_KEYS) {
                if (Object.hasOwn(changes, key)) values[key] = changes[key].newValue;
            }
            if (!Object.keys(values).length) return;
            if (changes.chatWidth && !changes.chatWidthSetting) {
                values.chatWidthSetting = { value: changes.chatWidth.newValue, unit: 'px' };
            }
            // 更新的事件使进行中的读取作废；开关和宽度可能同一次写入，合并后一次应用。
            ++readToken;
            if (!settingsLoaded) applySettings();
            mergeSettings(values);
        });
    }

    if (typeof window !== 'undefined') {
        window.widerGeminiDebug = {
            findDragElements: function () {
                const results = [];
                const selectors = [
                    '[class*="drop"]',
                    '[class*="drag"]',
                    '[class*="upload"]',
                    '[class*="zone"]',
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
                        console.error('Selector error:', selector, e);
                    }
                });

                console.table(results);
                console.log('Found', results.length, 'possible drag elements');
                return results;
            },

            applyDragStyles: function () {
                const width = getCurrentWidthCssValue();
                applyDragDropStyles();
                console.log('Applied drag styles, width:', width);
            },

            getCurrentWidth: function () {
                const width = getCurrentWidthCssValue();
                console.log('Current width setting:', width);
                return width;
            }
        };

        console.log('[Wider Gemini] Debug tools loaded, use window.widerGeminiDebug to access');
    }
})();
