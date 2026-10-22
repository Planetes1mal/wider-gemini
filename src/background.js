// Service worker：浏览器启动时（如以已安装的 Chrome 应用 / PWA 冷启动）页面
// 可能先于扩展加载完成，因而错过声明式 content_scripts 注入，只能刷新页面才生效。
// Gemini 按 manifest 补注入；ChatGPT 仅在授权后注册、补注入。授权入口在弹窗。
(function () {
    'use strict';

    const contentScripts = chrome.runtime.getManifest().content_scripts;
    const chatgptScript = {
        id: 'wider-chatgpt',
        matches: ['https://chatgpt.com/*'],
        js: ['src/shared/settings-utils.js', 'src/content/message-navigation.js', 'src/content/chatgpt-content.js'],
        css: ['src/content/message-navigation.css', 'src/content/chatgpt-content.css'],
        runAt: 'document_start',
        persistAcrossSessions: true
    };
    let permissionUpdate = Promise.resolve();
    const loadedFlags = {
        'src/content/gemini-content.js': 'widerGeminiContentLoaded',
        'src/content/chatgpt-content.js': 'widerChatgptContentLoaded'
    };

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
            const loadedFlag = loadedFlags[contentScript.js.find(file => loadedFlags[file])];
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

    function updateChatgptPermission() {
        // 授权与启动事件可能重合：串行注册，避免重复 ID 或撤销后留下注册。
        permissionUpdate = permissionUpdate.then(async () => {
            const granted = await chrome.permissions.contains({ origins: chatgptScript.matches });
            const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [chatgptScript.id] });
            if (!granted) {
                if (registered.length) await chrome.scripting.unregisterContentScripts({ ids: [chatgptScript.id] });
                return;
            }
            if (!registered.length) await chrome.scripting.registerContentScripts([chatgptScript]);
            await injectIntoOpenTabs([chatgptScript]);
        }).catch(error => console.error('[Roomy] Could not update ChatGPT permission:', error));
        return permissionUpdate;
    }

    async function onStart() {
        await Promise.all([injectIntoOpenTabs(contentScripts), updateChatgptPermission(), refreshChatgptIntro()]);
    }

    // ChatGPT 支持的提示：新装时从工具栏弹出扩展弹窗；从 3.0 之前更新时只在图标上加角标，
    // 等用户自己打开弹窗。弹窗读取并清除该标记（键名与 settings-utils.js 的 CHATGPT_INTRO_KEY 一致）。
    const INTRO_KEY = 'chatgptIntroPending';

    function shouldStartIntro(details) {
        if (details.reason === 'install') return true;
        return details.reason === 'update' && Boolean(details.previousVersion) &&
            Number(details.previousVersion.split('.')[0]) < 3;
    }

    async function showIntroBadge() {
        await chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
        await chrome.action.setBadgeText({ text: chrome.i18n.getMessage('badgeNew') || 'NEW' });
    }

    async function refreshChatgptIntro() {
        try {
            const [stored, granted] = await Promise.all([
                chrome.storage.local.get(INTRO_KEY),
                chrome.permissions.contains({ origins: chatgptScript.matches })
            ]);
            if (!stored[INTRO_KEY]) return;
            if (granted) {
                await chrome.storage.local.remove(INTRO_KEY);
                await chrome.action.setBadgeText({ text: '' });
            } else {
                await showIntroBadge();
            }
        } catch (e) {
            console.log('[Roomy] Could not update the ChatGPT notice', e.message);
        }
    }

    async function startChatgptIntro(details) {
        if (!shouldStartIntro(details)) return;
        try {
            if (await chrome.permissions.contains({ origins: chatgptScript.matches })) return;
            await chrome.storage.local.set({ [INTRO_KEY]: true });
            await showIntroBadge();
            // 浏览器窗口未激活等情况下无法弹出，角标仍会提示用户。
            if (details.reason === 'install') await chrome.action.openPopup();
        } catch (e) {
            console.log('[Roomy] Could not show the ChatGPT notice', e.message);
        }
    }

    async function onInstalled(details = {}) {
        await Promise.all([onStart(), startChatgptIntro(details)]);
    }

    async function onPermissionsChanged() {
        await Promise.all([updateChatgptPermission(), refreshChatgptIntro()]);
    }

    chrome.runtime.onStartup.addListener(onStart);
    chrome.runtime.onInstalled.addListener(onInstalled);
    chrome.permissions.onAdded.addListener(onPermissionsChanged);
    chrome.permissions.onRemoved.addListener(onPermissionsChanged);
})();
