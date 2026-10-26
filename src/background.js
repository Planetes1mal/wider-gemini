// Service worker：浏览器启动时（如以已安装的 Chrome 应用 / PWA 冷启动）页面可能先于扩展加载完成，
// 因而错过声明式 content_scripts 注入，只能刷新页面才生效。必需网站（Gemini）按 manifest 补注入；
// 可选网站按站点注册表逐个处理：已授权则注册内容脚本并补注入，未授权则注销。授权入口在弹窗。
importScripts('shared/sites.js');

(function () {
    'use strict';

    const sites = self.widerRoomySites;
    const contentScripts = chrome.runtime.getManifest().content_scripts;
    let permissionUpdate = Promise.resolve();

    // manifest 声明的脚本按匹配模式对应到注册表里的网站，取它的已加载标记。
    function loadedFlagFor(contentScript) {
        const site = contentScript.loadedFlag ? null : sites.sites.find(site =>
            site.matches.every(pattern => contentScript.matches.includes(pattern)));
        return contentScript.loadedFlag || (site && sites.getContentScript(site.id).loadedFlag) || null;
    }

    async function isContentScriptLoaded(tabId, loadedFlag) {
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            injectImmediately: true,
            func: flag => window[flag] === true,
            args: [loadedFlag]
        });
        return Boolean(results && results[0] && results[0].result);
    }

    async function injectContentScript(tab, contentScript, loadedFlag) {
        // 被丢弃的标签页激活时会重新导航，届时由声明式 content_scripts 正常注入
        if (tab.id === undefined || tab.discarded) return;
        if (await isContentScriptLoaded(tab.id, loadedFlag)) return;

        await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: contentScript.css
        });
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            injectImmediately: true,
            files: contentScript.js
        });
        console.log('[Roomy] Injected content script into tab', tab.id);
    }

    async function injectIntoOpenTabs(scripts) {
        await Promise.all(scripts.map(async contentScript => {
            const loadedFlag = loadedFlagFor(contentScript);
            if (!loadedFlag) return;
            try {
                const tabs = await chrome.tabs.query({ url: contentScript.matches });
                await Promise.all(tabs.map(async tab => {
                    try {
                        await injectContentScript(tab, contentScript, loadedFlag);
                    } catch (e) {
                        console.log('[Roomy] Skipped tab', tab.id, e.message);
                    }
                }));
            } catch (e) {
                console.log('[Roomy] Could not query site tabs', e.message);
            }
        }));
    }

    function isGranted(site) {
        return chrome.permissions.contains({ origins: site.matches });
    }

    // 注册给 Chrome 的内容脚本定义：不带注册表自用的 loadedFlag 字段。
    function registration(site) {
        const { loadedFlag, ...script } = sites.getContentScript(site.id);
        return script;
    }

    async function updateSitePermission(site) {
        const script = registration(site);
        const granted = await isGranted(site);
        const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [script.id] });
        if (!granted) {
            if (registered.length) await chrome.scripting.unregisterContentScripts({ ids: [script.id] });
            return;
        }
        if (!registered.length) await chrome.scripting.registerContentScripts([script]);
        await injectIntoOpenTabs([sites.getContentScript(site.id)]);
    }

    function updateOptionalPermissions() {
        // 授权与启动事件可能重合：串行注册，避免重复 ID 或撤销后留下注册。每个网站独立判断。
        permissionUpdate = permissionUpdate.then(async () => {
            for (const site of sites.optional()) {
                try {
                    await updateSitePermission(site);
                } catch (error) {
                    console.error(`[Roomy] Could not update ${site.name} permission:`, error);
                }
            }
        });
        return permissionUpdate;
    }

    async function onStart() {
        await Promise.all([injectIntoOpenTabs(contentScripts), updateOptionalPermissions(), refreshIntro()]);
    }

    // 新网站提示：新装时从工具栏弹出扩展弹窗；从加入该网站之前的版本更新时只在图标上加角标，
    // 等用户自己打开弹窗。标记按网站存在 chrome.storage.local（键名由注册表推导，与弹窗一致）；
    // 弹窗读取并清除所有标记，授权某个网站清除它的标记。

    function introSitesFor(details) {
        if (details.reason === 'install') return sites.optional();
        if (details.reason !== 'update' || !details.previousVersion) return [];
        return sites.addedSince(details.previousVersion);
    }

    async function showIntroBadge() {
        await chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
        await chrome.action.setBadgeText({ text: chrome.i18n.getMessage('badgeNew') || 'NEW' });
    }

    async function ungrantedWithIntro(stored) {
        const pending = [];
        const cleared = [];
        for (const site of sites.optional()) {
            const key = sites.getStorageKeys(site.id).intro;
            if (!stored[key]) continue;
            if (await isGranted(site)) cleared.push(key);
            else pending.push(site);
        }
        return { pending, cleared };
    }

    async function refreshIntro() {
        try {
            const keys = sites.optional().map(site => sites.getStorageKeys(site.id).intro);
            const stored = await chrome.storage.local.get(keys);
            const { pending, cleared } = await ungrantedWithIntro(stored);
            if (cleared.length) await chrome.storage.local.remove(cleared);
            if (pending.length) await showIntroBadge();
            else if (cleared.length) await chrome.action.setBadgeText({ text: '' });
        } catch (e) {
            console.log('[Roomy] Could not update the new-site notice', e.message);
        }
    }

    async function startIntro(details) {
        const candidates = introSitesFor(details);
        if (!candidates.length) return;
        try {
            const flags = {};
            for (const site of candidates) {
                if (await isGranted(site)) continue;
                // 新装与更新的标记不同：新装的弹窗列表里不给网站加“新”标记（对新用户来说一切都是新的）。
                flags[sites.getStorageKeys(site.id).intro] = details.reason === 'install' ? 'install' : 'update';
            }
            if (!Object.keys(flags).length) return;
            await chrome.storage.local.set(flags);
            await showIntroBadge();
            // 浏览器窗口未激活等情况下无法弹出，角标仍会提示用户。
            if (details.reason === 'install') await chrome.action.openPopup();
        } catch (e) {
            console.log('[Roomy] Could not show the new-site notice', e.message);
        }
    }

    async function onInstalled(details = {}) {
        await Promise.all([onStart(), startIntro(details)]);
    }

    async function onPermissionsChanged() {
        await Promise.all([updateOptionalPermissions(), refreshIntro()]);
    }

    chrome.runtime.onStartup.addListener(onStart);
    chrome.runtime.onInstalled.addListener(onInstalled);
    chrome.permissions.onAdded.addListener(onPermissionsChanged);
    chrome.permissions.onRemoved.addListener(onPermissionsChanged);
})();
