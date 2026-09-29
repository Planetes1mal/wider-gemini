// Service worker：浏览器启动时（如以已安装的 Chrome 应用 / PWA 冷启动）页面
// 可能先于扩展加载完成，因而错过声明式 content_scripts 注入，只能刷新页面才生效。
// 启动 / 安装 / 更新时按各站点的 manifest 声明补注入，文件列表保持单一来源。
(function () {
    'use strict';

    const contentScripts = chrome.runtime.getManifest().content_scripts;
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
        console.log('[Wider Gemini] Injected content script into tab', tab.id);
    }

    async function injectIntoOpenTabs() {
        await Promise.all(contentScripts.map(async contentScript => {
            const loadedFlag = loadedFlags[contentScript.js.find(file => loadedFlags[file])];
            if (!loadedFlag) return;
            try {
                const tabs = await chrome.tabs.query({ url: contentScript.matches });
                await Promise.all(tabs.map(async tab => {
                    try {
                        await injectContentScript(tab, contentScript, loadedFlag);
                    } catch (e) {
                        console.log('[Wider Gemini] Skipped tab', tab.id, e.message);
                    }
                }));
            } catch (e) {
                console.log('[Wider Gemini] Could not query site tabs', e.message);
            }
        }));
    }

    chrome.runtime.onStartup.addListener(injectIntoOpenTabs);
    chrome.runtime.onInstalled.addListener(injectIntoOpenTabs);
})();
