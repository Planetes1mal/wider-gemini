// @ts-check
// 公共内核（运行时）：生命周期、设置同步、协议、状态报告与界面变化监听。
// 每个内核网站只写一个适配器（src/content/sites/<id>.js），负责“在这个网站上，对话、消息、滚动区、
// 输入框分别是哪个元素”；宽度、阅读排版、消息导航在 width.js / reading.js / navigation.js 里实现一次。
// 注入顺序：sites.js → settings-utils.js → message-navigation.js → core/*.js → 适配器（最后调用 defineSite）。
(function () {
    'use strict';

    const core = window.widerRoomyCore = window.widerRoomyCore || { modules: {} };
    if (core.defineSite) return;

    const registry = window.widerRoomySites;
    const LOADED_FLAG = registry.CORE_LOADED_FLAG;
    const TAKEOVER_EVENT = registry.CORE_TAKEOVER_EVENT;
    const SITE_CLASS = 'wider-core-active';
    const OVERLAY = '[role="dialog"], [role="menu"], dialog';

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

    // 路由切换后旧对话仍连接在文档里，但尺寸为 0；只接受真正可见的节点。
    function isVisible(element) {
        if (!element || element.closest('[inert], [hidden]')) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
    }

    function findVisible(selector, scope = document, accept = () => true) {
        return Array.from(scope.querySelectorAll(selector)).find(node => accept(node) && isVisible(node)) || null;
    }

    function findAllVisible(selector, scope = document) {
        return Array.from(scope.querySelectorAll(selector)).filter(isVisible);
    }

    // 实际滚动的祖先：overflow-y 为 auto/scroll 且内容超出。
    function scrollOwner(node, limit) {
        for (let el = node.parentElement; el && el !== (limit ? limit.parentElement : null); el = el.parentElement) {
            const overflow = getComputedStyle(el).overflowY;
            if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) return el;
        }
        return null;
    }

    /**
     * 从正文向上找限制宽度的祖先：各层计算出的 max-width 小于父元素内容宽度的第一个元素。
     * 测量时暂时撤下本扩展的宽度规则，比较的是网站原生的限制。类名随构建变化的网站可以靠它找宽度所有者。
     */
    function findWidthOwner(start, boundary) {
        const root = document.documentElement;
        const classes = ['wider-width-active', 'wider-nav-gutter'].filter(name => root.classList.contains(name));
        classes.forEach(name => root.classList.remove(name));
        try {
            for (let el = start; el && el !== boundary; el = el.parentElement) {
                const parent = el.parentElement;
                if (!parent) break;
                const style = getComputedStyle(el);
                const max = parseFloat(style.maxWidth);
                const parentStyle = getComputedStyle(parent);
                const available = parent.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight);
                if (Number.isFinite(max) && max > 0 && available > max + 1) return el;
            }
            return null;
        } finally {
            classes.forEach(name => root.classList.add(name));
        }
    }

    function normalizeDefinition(definition) {
        const reading = definition.reading || {};
        const navigation = definition.navigation || {};
        const watch = definition.watch || {};
        const selectors = definition.selectors || {};
        return {
            id: definition.id,
            selectors,
            discover: definition.discover,
            reading: {
                assistantRoot: reading.assistantRoot || selectors.assistantRoot || null,
                userBubble: reading.userBubble || selectors.userBubble || null,
                exclude: reading.exclude || selectors.exclude || '',
                fontTarget: reading.fontTarget || '',
                fixedLine: reading.fixedLine || ''
            },
            turns: definition.turns || null,
            turnKey: definition.turnKey || null,
            turnText: definition.turnText || selectors.turnText || null,
            navigation: {
                topInset: navigation.topInset === undefined ? 56 : navigation.topInset,
                bottomInset: navigation.bottomInset === undefined ? 8 : navigation.bottomInset,
                scrollInset: navigation.scrollInset === undefined ? 72 : navigation.scrollInset
            },
            watch: {
                markers: watch.markers || '',
                attributes: watch.attributes || []
            },
            hooks: definition.hooks || {}
        };
    }

    function resolve(value, ...args) {
        return typeof value === 'function' ? value(...args) : value;
    }

    /**
     * 适配器入口。definition 见 docs/engineering.md 的“Core runtime and site adapters”。
     * 同一隔离世界里只运行一次；新版本注入到同一页面时先广播接管事件，旧实例退出。
     */
    function defineSite(definition) {
        if (window[LOADED_FLAG]) return null;
        window[LOADED_FLAG] = true;
        const settingsUtils = window.widerGeminiSettings;
        const site = normalizeDefinition(definition);
        const STORAGE_KEYS = settingsUtils.getSiteStorageKeys(site.id);
        const KEYS = settingsUtils.getSiteKeys(site.id);
        const listenerControl = new AbortController();
        let layoutObserver = null;
        let layoutFrame = null;
        let readToken = 0;
        let storedSettings = {};
        let pendingSettingsChanges = {};

        /** 模块共享的上下文：设置、当前界面、状态标志与辅助函数。 */
        const ctx = {
            site,
            settingsUtils,
            settings: settingsUtils.normalizeSiteSettings({}, site.id),
            settingsLoaded: false,
            siteActive: false,
            surface: { kind: 'unknown', root: null, widthOwners: [] },
            retired: false,
            isExtensionContextValid,
            writeProperty,
            restoreProperty,
            isVisible,
            findVisible,
            findAllVisible,
            scrollOwner,
            findWidthOwner,
            resolve,
            OVERLAY,
            retire,
            queueLayout,
            syncLayout,
            applyReading: () => ctx.reading.apply(),
            queueNavigation: () => ctx.navigation.queue()
        };
        ctx.width = core.modules.width(ctx);
        ctx.reading = core.modules.reading(ctx);
        ctx.navigation = core.modules.navigation(ctx);

        function isChatSurface() {
            return Boolean(ctx.surface.root) && ctx.surface.kind === 'chat';
        }
        ctx.isChatSurface = isChatSurface;

        // 排除对话框/菜单/编辑区；适配器可以通过 hooks.isExcluded 放行自己的浮层（如宿主浮窗本身）。
        function isExcluded(node) {
            const hit = node.closest(ctx.reading.EXCLUDED);
            if (site.hooks.isExcluded) return site.hooks.isExcluded(node, hit, ctx);
            return Boolean(hit);
        }
        ctx.isExcluded = isExcluded;

        function discoverSurface() {
            const next = site.discover(ctx) || {};
            return {
                kind: next.kind || 'unknown',
                root: next.root || null,
                column: next.column || next.root || null,
                scroll: next.scroll || null,
                footer: next.footer || null,
                // 可用宽度所在的窗格：默认是对话列的父元素；对话列外还有限宽容器的网站另行指定。
                pane: next.pane || null,
                host: next.host || null,
                navigationContainer: next.navigationContainer || null,
                nativeWidth: next.nativeWidth === true,
                widthOwners: (next.widthOwners || []).map(owner => owner && owner.element
                    ? { element: owner.element, strategy: owner.strategy || 'maxWidth' }
                    : { element: owner, strategy: 'maxWidth' }).filter(owner => owner.element)
            };
        }

        function syncLayout() {
            layoutFrame = null;
            if (ctx.retired) return;
            if (!isExtensionContextValid()) {
                retire();
                return;
            }
            const root = document.documentElement;
            if (!root) return;
            const next = discoverSurface();
            const changed = next.root !== ctx.surface.root || next.kind !== ctx.surface.kind;
            ctx.surface = next;
            ctx.width.sync();
            if (site.hooks.afterSync) site.hooks.afterSync(ctx);
            if (changed && document.readyState !== 'loading') ctx.reading.apply();
            ctx.navigation.queue();
        }

        function queueLayout() {
            if (!ctx.retired && layoutFrame === null) layoutFrame = requestAnimationFrame(syncLayout);
        }

        function observeLayout() {
            syncLayout();
            ctx.reading.apply();
            const markers = site.watch.markers;
            const hasMarker = node => node.nodeType === 1 && Boolean(markers) &&
                (node.matches(markers) || Boolean(node.querySelector(markers)));
            layoutObserver = new MutationObserver(function (mutations) {
                const changed = mutations.some(mutation => mutation.type === 'attributes'
                    ? mutation.attributeName !== 'class' || hasMarker(mutation.target)
                    : [...mutation.addedNodes, ...mutation.removedNodes].some(hasMarker));
                if (changed) queueLayout();
            });
            layoutObserver.observe(document.documentElement, {
                childList: true, subtree: true, attributes: true,
                attributeFilter: [...new Set(['class', 'hidden', 'inert', 'role', 'data-theme', ...site.watch.attributes])]
            });
            const options = { signal: listenerControl.signal };
            if (window.navigation) window.navigation.addEventListener('navigatesuccess', queueLayout, options);
            window.addEventListener('popstate', queueLayout, options);
            window.addEventListener('resize', queueLayout, options);
        }

        // ---- 扩展更新后的旧实例 ----
        // 扩展更新或重新加载后，旧版本脚本仍留在已打开的页面里：chrome.* 已失效，却仍响应页面变化。
        // 新实例启动时先广播接管事件；旧实例收到后（或自己发现扩展上下文失效时）停止观察与监听，
        // 撤下自己的导航条和写入的内边距；宽度与阅读样式由新实例重新应用。
        function retire() {
            if (ctx.retired) return;
            ctx.retired = true;
            listenerControl.abort();
            if (layoutObserver) layoutObserver.disconnect();
            if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);
            layoutFrame = null;
            ctx.reading.retire();
            ctx.width.retire();
            ctx.navigation.retire();
            if (site.hooks.retire) site.hooks.retire(ctx);
        }

        // 先通知旧实例再登记自己的监听，不会收到自己发出的事件。
        document.dispatchEvent(new Event(TAKEOVER_EVENT));
        document.addEventListener(TAKEOVER_EVENT, retire, { signal: listenerControl.signal });

        // ---- 设置与协议 ----

        function applyAllSettings() {
            if (!ctx.settingsLoaded) return;
            ctx.settings = settingsUtils.normalizeSiteSettings(storedSettings, site.id);
            ctx.siteActive = isExtensionContextValid() && ctx.settings.siteEnabled;
            const root = document.documentElement;
            if (root) {
                root.setAttribute('data-wgx-site', site.id);
                if (root.classList.contains(SITE_CLASS) !== ctx.siteActive) root.classList.toggle(SITE_CLASS, ctx.siteActive);
            }
            syncLayout();
            if (document.readyState !== 'loading') ctx.reading.apply();
            ctx.navigation.queue();
        }

        // 读取期间收到更新的 storage 事件时，旧读取结果作废。
        function readSettings() {
            if (!isExtensionContextValid()) return;
            const token = ++readToken;
            chrome.storage.sync.get(STORAGE_KEYS, function (result) {
                if (!isExtensionContextValid() || chrome.runtime.lastError || token !== readToken) return;
                storedSettings = { ...result, ...pendingSettingsChanges };
                pendingSettingsChanges = {};
                ctx.settingsLoaded = true;
                applyAllSettings();
            });
        }

        /**
         * enabled 保留旧含义（宽度开关）；pauseReason 区分整站暂停与仅宽度关闭。
         * capabilities 分别报告宽度、阅读、用户消息铺满与导航在当前可见界面上的状态。
         */
        function getLayoutStatus() {
            syncLayout();
            const settings = ctx.settings;
            const surface = ctx.surface;
            const widthEnabled = settings.widthEnabled !== false;
            const pauseReason = !settings.siteEnabled ? 'site' : !widthEnabled ? 'width' : null;
            const chatSurface = isChatSurface();
            const nativeOnly = surface.kind === 'notApplicable' || (chatSurface && surface.nativeWidth);
            const supported = surface.widthOwners.length > 0;
            const status = !ctx.settingsLoaded ? 'loading' : pauseReason === 'site' ? 'sitePaused'
                : pauseReason === 'width' ? 'paused' : supported ? 'active' : nativeOnly ? 'notApplicable'
                    : document.readyState === 'loading' ? 'loading' : 'unsupported';
            // 阅读识别与宽度识别分开：对话已有内容却找不到任何消息正文时，阅读设置不会生效。
            const messages = ctx.reading.hasMessages();
            const conversation = Boolean(chatSurface && surface.root.textContent.trim());
            const readingStatus = !ctx.settingsLoaded ? 'loading' : !settings.siteEnabled ? 'paused'
                : !chatSurface ? 'notApplicable' : messages ? 'active' : conversation ? 'unsupported' : 'idle';
            const paused = !settings.siteEnabled ? 'paused' : null;
            const turns = chatSurface ? ctx.navigation.turns().length : 0;
            const rail = ctx.navigation.rail;
            return {
                site: site.id, protocolVersion: settingsUtils.PROTOCOL_VERSION,
                siteEnabled: settings.siteEnabled, widthEnabled, enabled: widthEnabled, supported, status, pauseReason,
                surface: { kind: surface.kind },
                width: { active: ctx.width.active },
                reading: { active: ctx.siteActive && messages, status: readingStatus },
                capabilities: {
                    width: paused || (!widthEnabled ? 'off' : supported ? 'active' : nativeOnly ? 'notApplicable' : 'unsupported'),
                    reading: readingStatus,
                    fullWidth: paused || (!settings.userFullWidth ? 'off' : !ctx.width.active ? 'idle'
                        : ctx.reading.hasFullPaths() ? 'active' : 'idle'),
                    navigation: paused || (!settings.navigationEnabled ? 'off' : !chatSurface ? 'notApplicable'
                        : rail && rail.visible ? 'active' : 'idle')
                },
                navigation: { turns, visible: Boolean(rail && rail.visible) }
            };
        }

        if (!isExtensionContextValid()) return ctx;

        chrome.storage.onChanged.addListener(function (changes, area) {
            if (area !== 'sync' || !isExtensionContextValid()) return;
            const values = {};
            for (const key of STORAGE_KEYS) {
                if (Object.hasOwn(changes, key)) values[key] = changes[key].newValue;
            }
            if (!Object.keys(values).length) return;
            ++readToken;
            if (!ctx.settingsLoaded) {
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
                if (ctx.settingsLoaded) readSettings();
                sendResponse({ success: true, protocolVersion: settingsUtils.PROTOCOL_VERSION });
            } else if (request.action === 'updateWidthEnabled' || request.action === 'updateWidthSetting') {
                // 旧版 popup：只合并宽度字段；未加载前由 storage 事件与首次读取负责，不能提前标记已加载。
                if (ctx.settingsLoaded) {
                    const width = settingsUtils.normalizeSiteWidthSettings(storedSettings, site.id);
                    if (typeof request.enabled === 'boolean') width.widthEnabled = request.enabled;
                    if (request.action === 'updateWidthSetting') {
                        Object.assign(width, request.ranges, { chatWidthSetting: request.setting });
                    }
                    if (KEYS.width) storedSettings[KEYS.width] = width;
                    else Object.assign(storedSettings, settingsUtils.getSiteWidthStoragePayload(width, site.id));
                    applyAllSettings();
                }
                sendResponse({ success: true });
            }
        });

        // 未识别结构时不启用宽度 CSS；后续 SPA 挂载或替换已知容器会重新识别。
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeLayout, { once: true });
        else observeLayout();
        readSettings();
        return ctx;
    }

    core.defineSite = defineSite;
    core.LOADED_FLAG = LOADED_FLAG;
    core.TAKEOVER_EVENT = TAKEOVER_EVENT;
})();
