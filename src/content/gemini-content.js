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
    let settingsRevision = 0;
    let pendingSettingsChanges = {};
    let widthActive = false;
    const WIDTH_ROOT_CLASS = 'wider-gemini-width-enabled';
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

    function getLayoutStatus() {
        const enabled = currentRangeSettings.widthEnabled !== false;
        const supported = !!document.querySelector(WIDTH_LAYOUT_SELECTOR);
        const status = !enabled ? 'paused' : !isInitialized || !settingsLoaded ? 'loading' :
            supported ? 'active' : 'unsupported';
        return { site: 'gemini', enabled, supported, status };
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
    const measuredReadingNodes = new WeakSet();

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

    function applyDensitySettings(settings) {
        const root = document.documentElement;
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
        if (enabled) {
            document.body.classList.add('code-wrap-enabled');
            console.log('[Wider Gemini] Code auto wrap enabled');
        } else {
            document.body.classList.remove('code-wrap-enabled');
            console.log('[Wider Gemini] Code auto wrap disabled');
        }
    }

    function applyUserFullWidth(enabled) {
        currentRangeSettings.userFullWidth = enabled;
        if (!document.body) return;
        if (enabled && widthActive) {
            document.body.classList.add('wider-gemini-user-full-width');
            console.log('[Wider Gemini] User message full width enabled');
        } else {
            document.body.classList.remove('wider-gemini-user-full-width');
            console.log('[Wider Gemini] User message full width disabled');
        }
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
        const layout = getLayoutStatus();
        widthActive = layout.enabled && layout.supported;
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

    function applySettings() {
        if (!isExtensionContextValid()) {
            console.log('[Wider Gemini] Extension context invalid, stopping');
            return;
        }

        try {
            const revision = ++settingsRevision;
            chrome.storage.sync.get([
                'widthEnabled',
                'chatWidth',
                'chatWidthSetting',
                'codeWrap',
                'userFullWidth',
                'widthMin',
                'widthMax',
                'widthPercentMin',
                'widthPercentMax',
                'messageCompactness',
                'messageLineHeight',
                'messageParagraphSpacing',
                'messageSpacingCustom',
                'messageFontSize'
            ], function (result) {
                if (!isExtensionContextValid() || revision !== settingsRevision) return;
                // 读存储期间收到的即时设置优先，同时保留尚未加载的其他阅读偏好。
                const settings = normalizeAllSettings({ ...result, ...pendingSettingsChanges });
                pendingSettingsChanges = {};
                settingsLoaded = true;
                currentRangeSettings = settings;
                applyWidthStyle(settings.chatWidthSetting, settings);
                applyCodeWrap(settings.codeWrap);
                applyUserFullWidth(settings.userFullWidth);
                applyDensitySettings(settings);
                alignImageCaptions();
            });
        } catch (e) {
            console.log('[Wider Gemini] Failed to get storage:', e.message);
        }
    }

    if (isExtensionContextValid()) {
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (!isExtensionContextValid()) return;

            if (request.action === 'getLayoutStatus') {
                sendResponse(getLayoutStatus());
                return;
            }
            if (!['updateWidthSetting', 'updateWidth', 'updateWidthEnabled', 'updateCodeWrap',
                'updateUserFullWidth', 'updateDensity'].includes(request.action)) return;
            if (request.action === 'updateWidthSetting') {
                pendingSettingsChanges.chatWidthSetting = request.setting;
                for (const key of WIDTH_RANGE_KEYS) {
                    if (request.ranges && Object.hasOwn(request.ranges, key)) {
                        pendingSettingsChanges[key] = request.ranges[key];
                    }
                }
                if (typeof request.enabled === 'boolean') pendingSettingsChanges.widthEnabled = request.enabled;
                if (typeof request.enabled === 'boolean') currentRangeSettings.widthEnabled = request.enabled;
                applyWidthStyle(request.setting, request.ranges);
                alignImageCaptions();
                sendResponse({ success: true });
            } else if (request.action === 'updateWidth') {
                pendingSettingsChanges.chatWidthSetting = { value: request.width, unit: 'px' };
                applyWidthStyle({ value: request.width, unit: 'px' });
                alignImageCaptions();
                sendResponse({ success: true });
            } else if (request.action === 'updateWidthEnabled') {
                if (typeof request.enabled === 'boolean') pendingSettingsChanges.widthEnabled = request.enabled;
                if (typeof request.enabled === 'boolean') currentRangeSettings.widthEnabled = request.enabled;
                applyWidthStyle(currentRangeSettings.chatWidthSetting);
                alignImageCaptions();
                sendResponse({ success: true });
            } else if (request.action === 'updateCodeWrap') {
                pendingSettingsChanges.codeWrap = request.enabled;
                applyCodeWrap(request.enabled);
                sendResponse({ success: true });
            } else if (request.action === 'updateUserFullWidth') {
                pendingSettingsChanges.userFullWidth = request.enabled;
                applyUserFullWidth(request.enabled);
                sendResponse({ success: true });
            } else if (request.action === 'updateDensity') {
                const density = {
                    ...settingsUtils.normalizeDensity(request.settings || {}),
                    messageFontSize: settingsUtils.normalizeFontSize(request.settings?.messageFontSize)
                };
                Object.assign(pendingSettingsChanges, density);
                Object.assign(currentRangeSettings, density);
                applyDensitySettings(currentRangeSettings);
                sendResponse({ success: true });
            }
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

        prepareReadingLayout([document.body]);
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

            prepareReadingLayout(readingScopes);
            const layout = getLayoutStatus();
            const shouldEnable = layout.enabled && layout.supported;
            if (shouldUpdate || widthActive !== shouldEnable) {
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
            if (!isExtensionContextValid()) return;
            if (namespace !== 'sync') return;
            const keys = ['widthEnabled', 'chatWidthSetting', 'chatWidth', 'widthMin', 'widthMax',
                'widthPercentMin', 'widthPercentMax', 'codeWrap', 'userFullWidth', 'messageCompactness',
                'messageLineHeight', 'messageParagraphSpacing', 'messageSpacingCustom', 'messageFontSize'];
            const changedKeys = keys.filter(key => Object.hasOwn(changes, key));
            if (!changedKeys.length) return;
            const next = { ...currentRangeSettings };
            for (const key of changedKeys) {
                next[key] = changes[key].newValue;
                pendingSettingsChanges[key] = changes[key].newValue;
            }
            if (changes.chatWidth && !changes.chatWidthSetting) {
                next.chatWidthSetting = { value: changes.chatWidth.newValue, unit: 'px' };
                pendingSettingsChanges.chatWidthSetting = next.chatWidthSetting;
            }
            // 开关和宽度可能同一次写入，先合并再应用，避免短暂恢复已暂停的拓宽。
            currentRangeSettings = normalizeAllSettings(next);
            applyWidthStyle(currentRangeSettings.chatWidthSetting);
            applyCodeWrap(currentRangeSettings.codeWrap);
            applyUserFullWidth(currentRangeSettings.userFullWidth);
            applyDensitySettings(currentRangeSettings);
            alignImageCaptions();
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
