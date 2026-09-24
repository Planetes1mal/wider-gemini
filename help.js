(function () {
    'use strict';

    const SETTINGS_KEYS = [
        'chatWidth', 'chatWidthSetting', 'widthMin', 'widthMax', 'widthPercentMin', 'widthPercentMax',
        'messageCompactness', 'messageLineHeight', 'messageParagraphSpacing', 'messageSpacingCustom',
        'messageFontSize', 'codeWrap', 'userFullWidth', 'uiLanguage'
    ];
    const generateButton = document.getElementById('generateReport');
    const preview = document.getElementById('reportPreview');
    const report = document.getElementById('diagnosticReport');
    const status = document.getElementById('reportStatus');
    let dictionary = null;

    function isExtensionContextValid() {
        try {
            return chrome.runtime && chrome.runtime.id;
        } catch (e) {
            return false;
        }
    }

    function t(key, fallback) {
        return (dictionary && dictionary[key] && dictionary[key].message) || chrome.i18n.getMessage(key) || fallback;
    }

    async function localize(language) {
        const selected = window.widerGeminiSettings.normalizeUiLanguage(language);
        dictionary = null;
        if (selected !== 'auto') {
            try {
                const response = await fetch(chrome.runtime.getURL(`_locales/${selected}/messages.json`));
                dictionary = await response.json();
            } catch (e) {
                console.error('[Wider Gemini] Failed to load help language:', e.message);
            }
        }
        document.documentElement.lang = t('localeCode', 'en');
        document.querySelectorAll('[data-i18n]').forEach(element => {
            element.textContent = t(element.dataset.i18n, element.textContent);
        });
        status.textContent = '';
    }

    function getBrowserVersion() {
        const match = navigator.userAgent.match(/(Edg|OPR)\/(\d+)/) || navigator.userAgent.match(/(Chrome)\/(\d+)/);
        const names = { Edg: 'Edge', OPR: 'Opera', Chrome: 'Chromium' };
        return { name: match ? names[match[1]] : 'Unknown', major: match ? Number(match[2]) : null };
    }

    generateButton.addEventListener('click', async function () {
        if (!isExtensionContextValid()) return;
        generateButton.disabled = true;
        preview.hidden = true;
        report.value = '';
        status.textContent = t('helpReportGenerating', 'Reading settings…');
        try {
            const [stored, platform] = await Promise.all([
                chrome.storage.sync.get(SETTINGS_KEYS),
                chrome.runtime.getPlatformInfo()
            ]);
            const settings = window.widerGeminiSettings.normalizeStorage(stored);
            const manifest = chrome.runtime.getManifest();
            // 逐项构造报告，避免把未来新增设置或用户自定义名称带入诊断。
            const diagnostics = {
                extensionVersion: manifest.version_name || manifest.version,
                browser: getBrowserVersion(),
                platform: platform.os,
                settings: {
                    uiLanguage: settings.uiLanguage,
                    chatWidthSetting: settings.chatWidthSetting,
                    widthMin: settings.widthMin,
                    widthMax: settings.widthMax,
                    widthPercentMin: settings.widthPercentMin,
                    widthPercentMax: settings.widthPercentMax,
                    messageCompactness: settings.messageCompactness,
                    messageLineHeight: settings.messageLineHeight,
                    messageParagraphSpacing: settings.messageParagraphSpacing,
                    messageSpacingCustom: settings.messageSpacingCustom,
                    messageFontSize: settings.messageFontSize,
                    codeWrap: settings.codeWrap,
                    userFullWidth: settings.userFullWidth
                }
            };
            report.value = JSON.stringify(diagnostics, null, 2);
            preview.hidden = false;
            status.textContent = t('helpReportReady', 'Report ready. Review it, then copy it if you want to share it.');
        } catch (e) {
            status.textContent = t('helpReportError', 'Could not read settings. Reopen help from the extension and try again.');
        } finally {
            generateButton.disabled = false;
        }
    });

    document.getElementById('copyReport').addEventListener('click', async function () {
        try {
            await navigator.clipboard.writeText(report.value);
            status.textContent = t('helpReportCopied', 'Copied. You can paste the report into your issue.');
        } catch (e) {
            report.focus();
            report.select();
            status.textContent = t('helpReportCopyFallback', 'Copy was unavailable. The report is selected; copy it manually.');
        }
    });

    async function init() {
        if (!isExtensionContextValid()) {
            generateButton.disabled = true;
            status.textContent = 'Open this help page from the Wider Gemini extension to generate a settings report.';
            return;
        }
        const manifest = chrome.runtime.getManifest();
        document.getElementById('extensionVersion').textContent = `v${manifest.version_name || manifest.version}`;
        try {
            const stored = await chrome.storage.sync.get(['uiLanguage']);
            await localize(stored.uiLanguage);
        } catch (e) {
            await localize('auto');
        }
        chrome.storage.onChanged.addListener(function (changes, namespace) {
            if (namespace === 'sync' && changes.uiLanguage && isExtensionContextValid()) {
                localize(changes.uiLanguage.newValue);
            }
        });
    }

    init();
})();
