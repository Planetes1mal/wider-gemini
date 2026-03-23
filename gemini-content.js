(function () {
    'use strict';

    function isExtensionContextValid() {
        try {
            return chrome.runtime && chrome.runtime.id;
        } catch (e) {
            return false;
        }
    }

    const css_config = [
        { key: '.conversation-container', value: 'max-width: {width}px', sleep: 0 },
        { key: '.conversation-container user-query', value: 'max-width: 100%', sleep: 0 },
        { key: '.input-area-container', value: 'max-width: {width}px; margin-left: auto; margin-right: auto', sleep: 0 },
        { key: 'input-container', value: 'max-width: {width}px; margin-left: auto; margin-right: auto; margin-bottom: 10px', sleep: 0 },
        { key: '.chat-container', value: 'max-width: {width}px; margin-left: auto; margin-right: auto', sleep: 0 },
        { key: '.chat-container.xap-drag-in-progress', value: 'max-width: {width}px', sleep: 0 },
        { key: '.chat-container.xap-drag-in-progress > *', value: 'max-width: 100%', sleep: 0 },
        { key: 'upload-card', value: 'max-width: {width}px', sleep: 0 },
        { key: '.upload-card', value: 'max-width: {width}px', sleep: 0 },
        { key: 'file-drop-area', value: 'max-width: 100%', sleep: 0 },
        { key: '.file-drop-area', value: 'max-width: 100%', sleep: 0 },
        { key: '[class*="drop-zone"]', value: 'max-width: {width}px', sleep: 0 },
        { key: '[class*="drag-over"]', value: 'max-width: {width}px', sleep: 0 },
        { key: '.mat-menu-panel', value: 'max-width: {width}px', sleep: 0 },
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

    function applyCodeWrap(enabled) {
        if (enabled) {
            document.body.classList.add('code-wrap-enabled');
            console.log('[Wider Gemini] Code auto wrap enabled');
        } else {
            document.body.classList.remove('code-wrap-enabled');
            console.log('[Wider Gemini] Code auto wrap disabled');
        }
    }

    function applyWidthStyle(width) {
        const root = document.documentElement;
        root.style.setProperty('--gemini-chat-width', `${width}px`);

        const isDeepResearch = document.querySelector('#extended-response-message-content') !== null;
        if (isDeepResearch) {
            console.log('[Wider Gemini] Deep Research page detected, using 1600px width');
            root.style.setProperty('--gemini-chat-width', '1600px');
            width = 1600;
        }

        modifyElementStyles(width);
        applyDragDropStyles(width);
        console.log(`[Wider Gemini] Applied width ${width}px`);
    }

    function applyDragDropStyles(width) {
        const currentWidth = width || parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width')) || 1000;

        const possibleSelectors = [
            '[class*="drop"]',
            '[class*="drag"]',
            '[class*="upload"]',
            '[class*="file"]',
            '[class*="zone"]',
            '[class*="area"]',
            '.cdk-overlay-pane',
            '.mat-menu-panel',
            '[role="dialog"]',
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

                    const isLikelyDropZone = (
                        (classes.includes('drop') ||
                            classes.includes('drag') ||
                            classes.includes('upload') ||
                            classes.includes('file') ||
                            classes.includes('zone')) &&
                        style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        (parseInt(style.width) > 100 || style.position === 'fixed' || style.position === 'absolute')
                    );

                    if (isLikelyDropZone ||
                        element.classList.contains('cdk-overlay-pane') ||
                        element.classList.contains('mat-menu-panel') ||
                        element.getAttribute('role') === 'dialog') {

                        const inputArea = element.closest('.input-area-container, input-container, .chat-container');
                        if (inputArea || isLikelyDropZone) {
                            const maxWidth = inputArea ? '100%' : `${currentWidth}px`;
                            element.style.setProperty('max-width', maxWidth, 'important');
                            processedElements.add(element);
                        }
                    }
                });
            } catch (e) {
                // Ignore selector errors
            }
        });

        const chatContainer = document.querySelector('.chat-container.xap-drag-in-progress');
        if (chatContainer) {
            chatContainer.style.setProperty('max-width', `${currentWidth}px`, 'important');

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
            chrome.storage.sync.get(['chatWidth', 'codeWrap'], function (result) {
                if (!isExtensionContextValid()) return;
                const width = result.chatWidth || 1000;
                const codeWrap = result.codeWrap !== undefined ? result.codeWrap : false;
                applyWidthStyle(width);
                applyCodeWrap(codeWrap);
            });
        } catch (e) {
            console.log('[Wider Gemini] Failed to get storage:', e.message);
        }
    }

    if (isExtensionContextValid()) {
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (!isExtensionContextValid()) return;

            if (request.action === 'updateWidth') {
                applyWidthStyle(request.width);
                sendResponse({ success: true });
            } else if (request.action === 'updateCodeWrap') {
                applyCodeWrap(request.enabled);
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
                                node.querySelector?.('.file-drop-area') ||
                                node.querySelector?.('.mat-menu-panel')) {
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

                const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width')) || 1000;
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
            const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width')) || 1000;
            applyDragDropStyles(width);
        }, true);

        document.addEventListener('dragover', function (e) {
            if (!isDragging) {
                startDragCheck();
            }
            const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width')) || 1000;
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
                const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width')) || 1000;
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
                if (changes.chatWidth) {
                    applyWidthStyle(changes.chatWidth.newValue);
                }
                if (changes.codeWrap) {
                    applyCodeWrap(changes.codeWrap.newValue);
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
                    '[class*="file"]',
                    '[class*="zone"]',
                    '[class*="area"]',
                    '.cdk-overlay-pane',
                    '.mat-menu-panel',
                    '[role="dialog"]',
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
                const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width')) || 1000;
                applyDragDropStyles(width);
                console.log('Applied drag styles, width:', width + 'px');
            },

            getCurrentWidth: function () {
                const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width')) || 1000;
                console.log('Current width setting:', width + 'px');
                return width;
            }
        };

        console.log('[Wider Gemini] Debug tools loaded, use window.widerGeminiDebug to access');
    }
})();
