// 弹窗的多语言：手动语言字典 → chrome.i18n（浏览器语言）→ 硬编码兜底。
// 文案与网站无关；需要列出网站时用 {sites} 占位符，由 formatSites 按界面语言连接网站名。
let i18nDictionary = null;

function t(id, fallback) {
    if (i18nDictionary && typeof i18nDictionary[id] === 'string') {
        return i18nDictionary[id];
    }
    const msg = chrome.i18n.getMessage(id);
    return (msg || fallback || '');
}

// 手动覆盖语言时预加载对应 messages.json；auto 模式清空字典
function loadLanguageDictionary(language) {
    if (language === 'auto') {
        i18nDictionary = null;
        return Promise.resolve();
    }
    return fetch(chrome.runtime.getURL(`_locales/${language}/messages.json`))
        .then(res => res.json())
        .then(data => {
            i18nDictionary = {};
            Object.keys(data).forEach(key => {
                i18nDictionary[key] = data[key].message;
            });
        })
        .catch(err => {
            console.error('[Roomy] Failed to load language dictionary:', language, err);
            i18nDictionary = null;
        });
}

// 带 data-i18n 的元素填文字；data-i18n-label 填 aria-label。
function localizeHtmlPage() {
    document.documentElement.lang = t('localeCode', 'en');
    document.querySelectorAll('[data-i18n]').forEach(element => {
        element.textContent = t(element.dataset.i18n, element.textContent);
    });
    document.querySelectorAll('[data-i18n-label]').forEach(element => {
        element.setAttribute('aria-label', t(element.dataset.i18nLabel, element.getAttribute('aria-label')));
    });
}

function fillTemplate(template, values) {
    return Object.keys(values).reduce((text, key) => text.split(`{${key}}`).join(values[key]), template);
}

// 按界面语言把网站名连成一句（“Gemini、ChatGPT 和 Claude”）。
function formatSites(names) {
    return window.widerRoomySites.joinNames(names, t('localeCode', 'en'));
}
