(function () {
    'use strict';

    if (window.widerChatgptContentLoaded) return;
    window.widerChatgptContentLoaded = true;

    const settingsUtils = window.widerGeminiSettings;
    const storageKey = settingsUtils.CHATGPT_WIDTH_KEY;
    const ACTIVE_CLASS = 'wider-chatgpt-width-active';
    const NATIVE_WIDTH = '[class~="max-w-(--thread-body-max-width)"]';
    const HOME_OWNER = `${NATIVE_WIDTH}:has(form[data-chatgpt-composer][data-composer-placement="home"])`;
    const WIDTH_OWNER = '[data-thread-user-message-navigation-content], ' +
        '[data-pip-obstacle="thread-footer"], form[data-chatgpt-composer], ' + HOME_OWNER;
    const EXCLUDED = '[role="dialog"], [role="menu"], dialog, [data-composer-overlay-floating-ui]';
    let settings = settingsUtils.normalizeSiteWidthSettings({}, 'chatgpt');
    let settingsLoaded = false;
    let revision = 0;
    let supported = false;
    let measuredParent = null;
    let footerProperty = null;
    let rootProperty = null;
    let layoutFrame = null;

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
        const active = isExtensionContextValid() && settingsLoaded && settings.widthEnabled !== false && supported;
        if (root.classList.contains(ACTIVE_CLASS) !== active) root.classList.toggle(ACTIVE_CLASS, active);

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

    function getLayoutStatus() {
        syncLayout();
        const enabled = settings.widthEnabled !== false;
        const status = !settingsLoaded ? 'loading' : !enabled ? 'paused' : supported ? 'active'
            : document.readyState === 'loading' ? 'loading' : 'unsupported';
        return { site: 'chatgpt', enabled, supported, status };
    }

    function updateSettings(stored) {
        revision++;
        settingsLoaded = true;
        settings = settingsUtils.normalizeSiteWidthSettings({ [storageKey]: stored }, 'chatgpt');
        syncLayout();
    }

    if (!isExtensionContextValid()) return;

    chrome.storage.onChanged.addListener(function (changes, area) {
        if (area === 'sync' && changes[storageKey] && isExtensionContextValid()) {
            updateSettings(changes[storageKey].newValue);
        }
    });

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (!isExtensionContextValid()) return;
        if (request.action === 'getLayoutStatus') {
            sendResponse(getLayoutStatus());
        } else if (request.action === 'updateWidthEnabled') {
            updateSettings({ ...settings, widthEnabled: request.enabled !== false });
            sendResponse({ success: true });
        } else if (request.action === 'updateWidthSetting') {
            updateSettings({
                ...settings, ...request.ranges, chatWidthSetting: request.setting,
                widthEnabled: typeof request.enabled === 'boolean' ? request.enabled : settings.widthEnabled
            });
            sendResponse({ success: true });
        }
    });

    // 未识别结构时不启用 CSS；后续 SPA 挂载或替换已知容器会重新识别。
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeLayout, { once: true });
    else observeLayout();
    const readRevision = revision;
    chrome.storage.sync.get([storageKey], function (stored) {
        if (!isExtensionContextValid() || chrome.runtime.lastError || revision !== readRevision) return;
        updateSettings(stored[storageKey]);
    });
})();
