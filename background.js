// Service worker：浏览器启动时（如 Gemini 以已安装的 Chrome 应用 / PWA 冷启动）Gemini 页面
// 可能先于扩展加载完成，因而错过声明式 content_scripts 注入，只能刷新页面才生效。
// 这里在启动 / 安装 / 更新时给已打开的 Gemini 页面补注入与 manifest 相同的样式和脚本。
(function () {
    'use strict';

    const contentScript = chrome.runtime.getManifest().content_scripts[0];

    async function isContentScriptLoaded(tabId) {
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            injectImmediately: true,
            func: () => window.widerGeminiContentLoaded === true
        });
        return Boolean(results && results[0] && results[0].result);
    }

    async function injectContentScript(tab) {
        // 被丢弃的标签页激活时会重新导航，届时由声明式 content_scripts 正常注入
        if (tab.id === undefined || tab.discarded) return;
        if (await isContentScriptLoaded(tab.id)) return;

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

    async function injectIntoOpenGeminiTabs() {
        const tabs = await chrome.tabs.query({ url: contentScript.matches });

        await Promise.all(tabs.map(async tab => {
            try {
                await injectContentScript(tab);
            } catch (e) {
                console.log('[Wider Gemini] Skipped tab', tab.id, e.message);
            }
        }));
    }

    chrome.runtime.onStartup.addListener(injectIntoOpenGeminiTabs);
    chrome.runtime.onInstalled.addListener(injectIntoOpenGeminiTabs);
})();
