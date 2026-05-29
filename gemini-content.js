(function () {
    'use strict';

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

    const css_config = [
        { key: '.conversation-container', value: 'max-width: {width}', sleep: 0 },
        { key: '.conversation-container user-query', value: 'max-width: 100%', sleep: 0 },
        { key: 'input-container .input-area-container', value: 'max-width: {width}; margin-left: auto; margin-right: auto', sleep: 0 },
        { key: 'input-container input-area-v2', value: 'max-width: {width}; margin-left: auto; margin-right: auto', sleep: 0 },
        { key: '.chat-container', value: 'max-width: {width}; margin-left: auto; margin-right: auto', sleep: 0 },
        { key: '.chat-container.xap-drag-in-progress', value: 'max-width: {width}', sleep: 0 },
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
                element.style.setProperty(property, value, 'important');
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

    function applyDensitySettings(settings) {
        const root = document.documentElement;
        root.style.setProperty('--gemini-message-line-height', String(settings.messageLineHeight));
        root.style.setProperty('--gemini-message-paragraph-spacing', `${settings.messageParagraphSpacing}px`);

        if (settings.messageSpacingCustom || settings.messageCompactness > 0) {
            document.body.classList.add('wider-gemini-density-enabled');
            console.log('[Wider Gemini] Applied message density', settings.messageLineHeight, settings.messageParagraphSpacing);
        } else {
            document.body.classList.remove('wider-gemini-density-enabled');
            console.log('[Wider Gemini] Message density disabled');
        }
    }

    function applyCodeWrap(enabled) {
        if (enabled) {
            document.body.classList.add('code-wrap-enabled');
            console.log('[Wider Gemini] Code auto wrap enabled');
        } else {
            document.body.classList.remove('code-wrap-enabled');
            console.log('[Wider Gemini] Code auto wrap disabled');
        }
    }

    function updateCurrentRangeSettings(ranges) {
        if (!ranges || typeof ranges !== 'object') return;
        currentRangeSettings = settingsUtils.normalizeStorage({
            ...currentRangeSettings,
            ...ranges
        });
    }

    function applyWidthStyle(widthSetting, ranges) {
        updateCurrentRangeSettings(ranges);
        const root = document.documentElement;
        const normalized = settingsUtils.normalizeWidthSetting(widthSetting, currentRangeSettings);
        let widthCssValue = settingsUtils.getWidthCssValue(normalized);

        const isDeepResearch = document.querySelector('#extended-response-message-content') !== null;
        if (isDeepResearch) {
            console.log('[Wider Gemini] Deep Research page detected, using 1600px width');
            widthCssValue = '1600px';
        }

        root.style.setProperty('--gemini-chat-width', widthCssValue);
        modifyElementStyles(widthCssValue);
        applyDragDropStyles(widthCssValue);
        console.log(`[Wider Gemini] Applied width ${widthCssValue}`);
    }

    function applyDragDropStyles(width) {
        const currentWidth = width || getCurrentWidthCssValue();

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

                    const style = window.getComputedStyle(element);
                    const classes = Array.from(element.classList || []).join(' ').toLowerCase();

                    const inputArea = element.closest('.input-area-container, input-container, .chat-container');
                    const isLikelyDropZone = inputArea && (
                        (classes.includes('drop') ||
                            classes.includes('drag') ||
                            classes.includes('upload') ||
                            classes.includes('zone')) &&
                        style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        (parseInt(style.width) > 100 || style.position === 'fixed' || style.position === 'absolute')
                    );

                    if (isLikelyDropZone) {
                        element.style.setProperty('max-width', '100%', 'important');
                        processedElements.add(element);
                    }
                });
            } catch (e) {
                // Ignore selector errors
            }
        });

        const chatContainer = document.querySelector('.chat-container.xap-drag-in-progress');
        if (chatContainer) {
            chatContainer.style.setProperty('max-width', currentWidth, 'important');

            const dragChildren = chatContainer.querySelectorAll('*');
            dragChildren.forEach(child => {
                const childStyle = window.getComputedStyle(child);
                const childClasses = Array.from(child.classList || []).join(' ').toLowerCase();

                if ((childClasses.includes('drop') ||
                    childClasses.includes('drag') ||
                    childClasses.includes('upload')) &&
                    childStyle.display !== 'none' &&
                    parseInt(childStyle.width) > 100) {
                    child.style.setProperty('max-width', '100%', 'important');
                }
            });
        }
    }

    function applySettings() {
        if (!isExtensionContextValid()) {
            console.log('[Wider Gemini] Extension context invalid, stopping');
            return;
        }

        try {
            chrome.storage.sync.get([
                'chatWidth',
                'chatWidthSetting',
                'codeWrap',
                'widthMin',
                'widthMax',
                'widthPercentMin',
                'widthPercentMax',
                'messageCompactness',
                'messageLineHeight',
                'messageParagraphSpacing',
                'messageSpacingCustom'
            ], function (result) {
                if (!isExtensionContextValid()) return;
                const settings = normalizeAllSettings(result);
                currentRangeSettings = settings;
                applyWidthStyle(settings.chatWidthSetting, settings);
                applyCodeWrap(settings.codeWrap);
                applyDensitySettings(settings);
            });
        } catch (e) {
            console.log('[Wider Gemini] Failed to get storage:', e.message);
        }
    }

    if (isExtensionContextValid()) {
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (!isExtensionContextValid()) return;

            if (request.action === 'updateWidthSetting') {
                applyWidthStyle(request.setting, request.ranges);
                sendResponse({ success: true });
            } else if (request.action === 'updateWidth') {
                applyWidthStyle({ value: request.width, unit: 'px' });
                sendResponse({ success: true });
            } else if (request.action === 'updateCodeWrap') {
                applyCodeWrap(request.enabled);
                sendResponse({ success: true });
            } else if (request.action === 'updateDensity') {
                applyDensitySettings(settingsUtils.normalizeStorage(request.settings || {}));
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
        applySettings();
        observeUrlChanges();

        const observer = new MutationObserver(function (mutations) {
            let shouldUpdate = false;

            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            const classList = node.classList || [];
                            const tagName = node.tagName ? node.tagName.toLowerCase() : '';

                            if (classList.contains('conversation-container') ||
                                classList.contains('input-area-container') ||
                                classList.contains('upload-card') ||
                                classList.contains('file-drop-area') ||
                                tagName === 'user-query' ||
                                tagName === 'input-container' ||
                                tagName === 'upload-card' ||
                                tagName === 'file-drop-area' ||
                                node.querySelector?.('.conversation-container') ||
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
                }

                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList && target.classList.contains('xap-drag-in-progress')) {
                        shouldUpdate = true;
                    }
                }
            });

            if (shouldUpdate) {
                applySettings();
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
            if (dragCheckFrame) return;
            isDragging = true;

            const checkDragElements = () => {
                if (!isDragging) {
                    dragCheckFrame = null;
                    return;
                }

                const width = getCurrentWidthCssValue();
                applyDragDropStyles(width);

                const chatContainer = document.querySelector('.chat-container');
                if (chatContainer && chatContainer.classList.contains('xap-drag-in-progress')) {
                    applySettings();
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
            const width = getCurrentWidthCssValue();
            applyDragDropStyles(width);
        }, true);

        document.addEventListener('dragover', function (e) {
            if (!isDragging) {
                startDragCheck();
            }
            const width = getCurrentWidthCssValue();
            applyDragDropStyles(width);
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
                const width = getCurrentWidthCssValue();
                applyDragDropStyles(width);
                applySettings();
            }, 200);
        }, true);

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

            if (namespace === 'sync') {
                if (
                    changes.widthMin ||
                    changes.widthMax ||
                    changes.widthPercentMin ||
                    changes.widthPercentMax
                ) {
                    applySettings();
                    return;
                }

                if (changes.chatWidthSetting) {
                    applyWidthStyle(changes.chatWidthSetting.newValue);
                } else if (changes.chatWidth) {
                    applyWidthStyle({ value: changes.chatWidth.newValue, unit: 'px' });
                }

                if (changes.codeWrap) {
                    applyCodeWrap(changes.codeWrap.newValue);
                }

                if (
                    changes.messageCompactness ||
                    changes.messageLineHeight ||
                    changes.messageParagraphSpacing ||
                    changes.messageSpacingCustom
                ) {
                    applySettings();
                }
            }
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
                applyDragDropStyles(width);
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
