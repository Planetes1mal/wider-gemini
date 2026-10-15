let i18nDictionary = null;

// 三级回退：手动语言字典 → chrome.i18n（浏览器语言）→ 硬编码兜底
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
            console.error('[Wider Gemini] Failed to load language dictionary:', language, err);
            i18nDictionary = null;
        });
}

function localizeHtmlPage() {
    document.documentElement.lang = t('localeCode', 'en');
    const ids = [
        "brandName", "headerSubtitle", "widthLabel", "widthMin", "widthMax",
        "btnNarrow", "btnDefault", "btnWider", "btnUltra", "btnInsane",
        "editPresets", "donePresets", "cancelPresets", "managePresets", "managePresetsSummary", "resetToDefault",
        "codeWrapLabel", "refreshing",
        "userFullWidthLabel",
        "widthUnit", "densityLabel", "compactnessUnit", "advancedDensity",
        "lineHeightLabel", "paragraphSpacingLabel", "resetDensity",
        "fontSizeLabel", "resetFontSize",
        "customSpacing", "autoSpacing",
        "uiLanguageLabel", "uiLanguageAuto", "helpLink", "sourceLink",
        "taskPresets", "taskApply", "taskRestore",
        "autoSpacingHint", "settingsSite", "currentSite", "widthOptions", "readingSettings", "navigationLabel"
    ];

    ids.forEach(id => {
        const element = document.getElementById("i18n-" + id);
        if (element) {
            element.textContent = t(id);
        }
    });
    const widthUnitGroup = document.querySelector('.unit-segment');
    if (widthUnitGroup) widthUnitGroup.setAttribute('aria-label', t('widthUnit', 'Width unit'));
}

localizeHtmlPage();

const settingsUtils = window.widerGeminiSettings;
const DEFAULTS = settingsUtils.DEFAULTS;
const RANGE_MIN = settingsUtils.PX_RANGE.min;
const RANGE_MAX = settingsUtils.PX_RANGE.max;
const PERCENT_RANGE_MIN = settingsUtils.PERCENT_RANGE.min;
const PERCENT_RANGE_MAX = settingsUtils.PERCENT_RANGE.max;
const SITE_NAMES = { gemini: 'Gemini', chatgpt: 'ChatGPT' };
const TASK_LABELS = { reading: 'taskReading', table: 'taskTable', code: 'taskCode', wide: 'taskWide', large: 'taskLarge' };

const PRESET_ICONS = ['S', 'D', 'W', 'U', 'M'];

function getPresetName(preset) {
    return preset.name || (preset.nameKey ? t(preset.nameKey) : '');
}

function formatWidthValue(setting) {
    const unitLabel = setting.unit === settingsUtils.UNIT_PERCENT ? '%' : 'px';
    return `${setting.value} ${unitLabel}`;
}

function isSameWidthSetting(a, b) {
    return a && b && a.unit === b.unit && Number(a.value) === Number(b.value);
}

function getActiveRange() {
    return settingsUtils.getRangeForUnit(getTaskRanges(), currentWidthSetting.unit);
}

function getUnitFallbackValue(unit) {
    return unit === settingsUtils.UNIT_PERCENT ? 70 : DEFAULTS.chatWidthSetting.value;
}

function getUnitLabel(unit) {
    return settingsUtils.normalizeUnit(unit) === settingsUtils.UNIT_PERCENT ? '%' : 'px';
}

function getPresetGroup(unit) {
    const normalizedUnit = settingsUtils.normalizeUnit(unit);
    return currentPresetsByUnit[normalizedUnit] || settingsUtils.getDefaultPresetsForUnit(normalizedUnit);
}

function setPresetGroup(unit, presets) {
    const normalizedUnit = settingsUtils.normalizeUnit(unit);
    currentPresetsByUnit = {
        ...currentPresetsByUnit,
        [normalizedUnit]: presets
    };
    currentPresets = presets;
}

function renderPresetButtons(presets, widthMin, widthMax, currentSetting) {
    const container = document.getElementById('presetButtonsContainer');
    if (!container) return;
    container.classList.remove('preset-buttons--edit');
    container.innerHTML = '';
    (presets || currentPresets).forEach((preset, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preset-btn';
        btn.dataset.value = preset.value;
        btn.dataset.unit = preset.unit;
        const name = getPresetName(preset);
        const icon = PRESET_ICONS[i] || 'W';
        btn.innerHTML = `<span class="btn-icon">${icon}</span><span class="btn-text"></span><span class="btn-value">${formatWidthValue(preset)}</span>`;
        btn.querySelector('.btn-text').textContent = name;
        if (isSameWidthSetting(currentSetting, preset)) btn.classList.add('preset-btn-active');
        container.appendChild(btn);
    });
}

let isEditMode = false;

function renderPresetsForMode(presets) {
    const activePresets = presets || getPresetGroup(currentWidthSetting.unit);
    currentPresets = activePresets;

    if (isEditMode) {
        renderPresetButtonsEditMode(activePresets);
        return;
    }

    renderPresetButtons(activePresets, currentWidthMin, currentWidthMax, currentWidthSetting);
}

function renderPresetButtonsEditMode(presets) {
    const container = document.getElementById('presetButtonsContainer');
    if (!container) return;
    container.classList.add('preset-buttons--edit');
    container.innerHTML = '';
    (presets || currentPresets).forEach((preset, i) => {
        const row = document.createElement('div');
        row.className = 'preset-edit-row';
        const name = getPresetName(preset);
        const range = getActiveRange();
        row.innerHTML = `
            <span class="preset-edit-label"></span>
            <input type="number" class="preset-edit-width" data-index="${i}" value="${preset.value}" min="${range.min}" max="${range.max}" step="${range.step}">
            <span class="preset-edit-unit" data-index="${i}">${getUnitLabel(currentWidthSetting.unit)}</span>
        `;
        const label = row.querySelector('.preset-edit-label');
        label.textContent = name;
        label.title = name;
        const input = row.querySelector('.preset-edit-width');
        input.addEventListener('blur', function () {
            const originalValue = parseFloat(this.value);
            const normalized = settingsUtils.normalizeWidthSetting({
                value: originalValue,
                unit: currentWidthSetting.unit
            }, getTaskRanges());
            this.value = normalized.value;
            if (originalValue !== normalized.value) showClampedHint();
        });
        container.appendChild(row);
    });
}

function showClampedHint() {
    let el = document.getElementById('clampedHint');
    if (!el) {
        el = document.createElement('span');
        el.id = 'clampedHint';
        el.className = 'clamped-hint';
        document.getElementById('presetButtonsContainer').appendChild(el);
    }
    el.textContent = t('clampedHint', '已限制在范围内');
    el.classList.add('show');
    clearTimeout(showClampedHint._tid);
    showClampedHint._tid = setTimeout(() => el.classList.remove('show'), 2500);
}

function saveManagePresetsFromRows() {
    const rows = document.querySelectorAll('#managePresetsRows .manage-row');
    if (rows.length !== 5) return;
    const nextPresets = currentPresets.map((p, i) => {
        const row = rows[i];
        const nameInput = row && row.querySelector('.manage-name');
        const widthInput = row && row.querySelector('.manage-width');
        const name = nameInput ? nameInput.value.trim() : getPresetName(p);
        const defaultName = t(p.nameKey || DEFAULTS.presets[i].nameKey, '');
        const customName = name && name !== defaultName ? name : undefined;
        const value = widthInput ? parseFloat(widthInput.value) : p.value;
        return settingsUtils.normalizePreset({
            id: p.id, nameKey: p.nameKey, name: customName, value, unit: currentWidthSetting.unit
        }, i, getTaskRanges());
    });
    setPresetGroup(currentWidthSetting.unit, nextPresets);
    saveWidthSettings();
    renderPresetsForMode(nextPresets);
    document.getElementById('managePresetsSummary').textContent = t('managePresetsSummary', '已自定义 5 个预设');
}

function renderManagePresetsRows(presets) {
    const container = document.getElementById('managePresetsRows');
    if (!container) return;
    container.innerHTML = '';
    (presets || currentPresets).forEach((preset, i) => {
        const row = document.createElement('div');
        row.className = 'manage-row';
        const defaultName = t(preset.nameKey || DEFAULTS.presets[i].nameKey, '');
        const displayName = preset.name != null && preset.name !== '' ? preset.name : defaultName;
        const range = getActiveRange();
        row.innerHTML = `
            <input type="text" class="manage-name" data-index="${i}">
            <input type="number" class="manage-width" value="${preset.value}" min="${range.min}" max="${range.max}" step="${range.step}" data-index="${i}">
            <span class="manage-unit" data-index="${i}">${getUnitLabel(currentWidthSetting.unit)}</span>
            <button type="button" class="secondary-btn reset-preset-btn" data-index="${i}">${t('resetToDefault', '重置为默认')}</button>
        `;
        const nameInput = row.querySelector('.manage-name');
        nameInput.value = displayName;
        nameInput.placeholder = defaultName;
        const widthInput = row.querySelector('.manage-width');
        const save = () => saveManagePresetsFromRows();
        nameInput.addEventListener('blur', save);
        widthInput.addEventListener('blur', function () {
            const normalized = settingsUtils.normalizeWidthSetting({
                value: parseFloat(this.value),
                unit: currentWidthSetting.unit
            }, getTaskRanges());
            this.value = normalized.value;
            save();
        });
        row.querySelector('.reset-preset-btn').addEventListener('click', function () {
            const def = DEFAULTS.presets[i];
            const unitDefault = settingsUtils.getDefaultPresetsForUnit(currentWidthSetting.unit)[i] || def;
            nameInput.value = t(def.nameKey, '');
            widthInput.value = unitDefault.value;
            save();
        });
        container.appendChild(row);
    });
    document.getElementById('managePresetsSummary').textContent = t('managePresetsSummary', '已自定义 5 个预设');
}

const managePresetsToggle = document.getElementById('managePresetsToggle');
const managePresetsBody = document.getElementById('managePresetsBody');
managePresetsToggle.addEventListener('click', function () {
    const open = managePresetsBody.hidden;
    managePresetsBody.hidden = !open;
    managePresetsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
        renderManagePresetsRows(currentPresets);
    }
});

function clamp(val, min, max) {
    return Math.min(Math.max(Number(val), min), max);
}

const widthSlider = document.getElementById('widthSlider');
const widthValue = document.getElementById('widthValue');
const widthMinInput = document.getElementById('widthMinInput');
const widthMaxInput = document.getElementById('widthMaxInput');
const widthUnitLabel = document.getElementById('widthUnitLabel');
const unitPxBtn = document.getElementById('unitPxBtn');
const unitPercentBtn = document.getElementById('unitPercentBtn');
const compactnessSlider = document.getElementById('compactnessSlider');
const compactnessValue = document.getElementById('compactnessValue');
const advancedDensityToggle = document.getElementById('advancedDensityToggle');
const advancedDensityBody = document.getElementById('advancedDensityBody');
const densitySummary = document.getElementById('densitySummary');
const lineHeightSlider = document.getElementById('lineHeightSlider');
const lineHeightValue = document.getElementById('lineHeightValue');
const paragraphSpacingSlider = document.getElementById('paragraphSpacingSlider');
const paragraphSpacingValue = document.getElementById('paragraphSpacingValue');
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeValue = document.getElementById('fontSizeValue');
const resetFontSizeBtn = document.getElementById('resetFontSizeBtn');
const resetDensityBtn = document.getElementById('resetDensityBtn');
const codeWrapCard = document.getElementById('codeWrapCard');
const codeWrapToggle = document.getElementById('codeWrapToggle');
const codeWrapStatus = document.getElementById('codeWrapStatus');
const userFullWidthToggle = document.getElementById('userFullWidthToggle');
const userFullWidthStatus = document.getElementById('userFullWidthStatus');
const navigationToggle = document.getElementById('navigationToggle');
const uiLanguageSelect = document.getElementById('uiLanguageSelect');
const refreshNotice = document.getElementById('refreshNotice');
const taskPresetSelect = document.getElementById('taskPresetSelect');
const applyTaskPreset = document.getElementById('applyTaskPreset');
const restoreTaskPreset = document.getElementById('restoreTaskPreset');
const taskPresetStatus = document.getElementById('taskPresetStatus');
const settingsControls = document.getElementById('settingsControls');
const widthControls = document.getElementById('widthControls');
const widthEnabledToggle = document.getElementById('widthEnabledToggle');
const widthEnabledLabel = document.getElementById('i18n-widthEnabled');
const siteEnabledToggle = document.getElementById('siteEnabledToggle');
const siteEnabledLabel = document.getElementById('siteEnabledLabel');
const sitePower = document.getElementById('sitePower');
const sitePowerState = document.getElementById('sitePowerState');
const siteStatus = document.getElementById('siteStatus');
const siteButtons = [document.getElementById('siteGeminiBtn'), document.getElementById('siteChatgptBtn')];
const chatgptPermission = document.getElementById('chatgptPermission');
const grantChatgptPermission = document.getElementById('grantChatgptPermission');
const chatgptAttention = document.getElementById('chatgptAttention');
let chatgptGranted = false;
// 新装或从 3.0 之前更新后首次打开弹窗：本次在任一站点标签上都显示 ChatGPT 授权提示。
let chatgptIntro = false;

let taskBusy = false;
let settingsLoaded = false;
let selectedSite = 'gemini';
let activeTabSite = null;
let storedSettings = {};
const siteSettings = {};
const taskUndo = { gemini: null, chatgpt: null };
let writeQueue = Promise.resolve();
let failedSinceFlush = false;
const latestSiteMessages = new Map();
let layoutStatusRequest = 0;

let widthUpdateTimer = null;
let readingUpdateTimer = null;
let pendingReadingEdit = null;

let currentWidthSetting = { ...DEFAULTS.chatWidthSetting };
let currentWidthEnabled = DEFAULTS.widthEnabled;
let currentWidthMin = DEFAULTS.widthMin;
let currentWidthMax = DEFAULTS.widthMax;
let currentWidthPercentMin = DEFAULTS.widthPercentMin;
let currentWidthPercentMax = DEFAULTS.widthPercentMax;
let currentDensity = settingsUtils.normalizeDensity({});
let currentFontSize = DEFAULTS.messageFontSize;
let currentPresetsByUnit = settingsUtils.normalizePresetGroups({}, DEFAULTS);
let currentPresets = currentPresetsByUnit[settingsUtils.UNIT_PX];

function getTaskRanges() {
    return {
        widthMin: currentWidthMin,
        widthMax: currentWidthMax,
        widthPercentMin: currentWidthPercentMin,
        widthPercentMax: currentWidthPercentMax
    };
}

function getCurrentWidthSettings() {
    return settingsUtils.normalizeSiteWidthSettings({
        ...getTaskRanges(),
        widthEnabled: currentWidthEnabled,
        chatWidthSetting: currentWidthSetting,
        presetsByUnit: currentPresetsByUnit
    }, 'gemini');
}

// ---- 状态提示：同一位置按优先级显示——保存失败 > 页面/协议问题 > 短暂提示。 ----

const statusMessages = { error: '', page: '', transient: '' };

function renderStatus() {
    const kind = ['error', 'page', 'transient'].find(key => statusMessages[key]);
    siteStatus.textContent = kind ? statusMessages[kind] : '';
    siteStatus.dataset.kind = kind || '';
    siteStatus.hidden = !kind;
}

function setStatus(kind, message) {
    statusMessages[kind] = message || '';
    if (kind === 'transient') {
        clearTimeout(setStatus.timer);
        if (message) setStatus.timer = setTimeout(() => setStatus('transient', ''), 2400);
    }
    renderStatus();
}

// ---- 存储写入：串行执行；站点与数值在入队时确定。 ----

function enqueue(operation) {
    const run = writeQueue.then(operation);
    writeQueue = run.catch(() => {});
    return run;
}

async function onSaved(site) {
    siteSettings[site] = settingsUtils.normalizeSiteSettings(storedSettings, site);
    if (site !== selectedSite) return;
    setStatus('error', '');
    if (!siteSettings[site].siteEnabled) setStatus('transient', t('savedWhilePaused', 'Saved. Applies when enabled.'));
}

// 写入失败时显示错误，并按存储中最后一次确认的值重新渲染控件。
async function onSaveFailed(site, error) {
    console.error('[Wider Gemini] Settings could not be saved:', error);
    failedSinceFlush = true;
    try {
        Object.assign(storedSettings, await chrome.storage.sync.get(settingsUtils.getSiteStorageKeys(site)));
    } catch (e) {
        // 读取也失败时保留当前视图，错误提示仍然准确。
    }
    siteSettings[site] = settingsUtils.normalizeSiteSettings(storedSettings, site);
    if (site === selectedSite) {
        renderSite();
        setStatus('error', t('saveFailed', 'Could not save. Please try again.'));
    }
}

function writePatch(site, buildPatch, message) {
    return enqueue(async () => {
        const patch = await buildPatch();
        await chrome.storage.sync.set(patch);
        Object.assign(storedSettings, patch);
    }).then(() => {
        onSaved(site);
        if (message) notifySiteTabs(site, message);
    }, error => onSaveFailed(site, error));
}

function saveWidthSettings() {
    const site = selectedSite;
    const settings = getCurrentWidthSettings();
    const message = {
        action: 'updateWidthSetting',
        setting: { ...settings.chatWidthSetting },
        ranges: getTaskRanges(),
        enabled: settings.widthEnabled
    };
    return writePatch(site, () => settingsUtils.getSiteWidthStoragePayload(settings, site), message);
}

// 阅读字段先读取最新已存值再合并，避免旧的 popup 快照覆盖较早的写入。
function saveReading(site, edit) {
    return writePatch(site, async () => {
        const latest = await chrome.storage.sync.get(settingsUtils.getSiteStorageKeys(site));
        return settingsUtils.getSiteReadingPatch(latest, site, edit);
    }, { action: 'updateReadingSettings' });
}

// 执行依赖操作前先提交防抖中的编辑并等待写入完成；期间有失败则不继续。
async function flushPendingChanges() {
    if (isEditMode) savePresetEdits();
    if (widthUpdateTimer !== null) updateWidthSetting(currentWidthSetting);
    if (readingUpdateTimer !== null) commitReadingEdit();
    await writeQueue;
    if (failedSinceFlush) {
        failedSinceFlush = false;
        throw new Error('A pending settings write failed');
    }
}

// ---- 页面通知与状态 ----

function isNoReceiver(error) {
    return /Receiving end does not exist/i.test(error && error.message || String(error));
}

async function reportOutdatedPage(site, tabId) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
    if (site === selectedSite && tab && tab.id === tabId) {
        setStatus('page', t('pageOutdated', 'Saved, but this page runs an older extension version.'));
    }
}

// 消息目标在提交时固定。宽度消息保留原有的“缺少内容脚本则刷新”回退；
// v2 消息不会自动刷新页面，旧版内容脚本只提示当前页尚未更新。
function notifySiteTabs(site, message) {
    const v2 = message.action === 'updateSiteEnabled' || message.action === 'updateReadingSettings' ||
        message.action === 'refreshSettings';
    const key = `${site}:${message.action === 'updateWidthSetting' ? 'width' : message.action}`;
    latestSiteMessages.set(key, message);
    return (site === 'chatgpt'
        ? chrome.permissions.contains({ origins: [settingsUtils.SITE_MATCHES.chatgpt] })
        : Promise.resolve(true)).then(granted => {
        if (!granted) return [];
        return chrome.tabs.query({ url: settingsUtils.SITE_MATCHES[site] });
    }).then(tabs => {
        if (latestSiteMessages.get(key) !== message) return;
        return Promise.all(tabs.map(tab => {
            if (tab.discarded) return;
            return chrome.tabs.sendMessage(tab.id, message).then(response => {
                if (v2 && !(response && response.protocolVersion >= settingsUtils.PROTOCOL_VERSION)) {
                    return reportOutdatedPage(site, tab.id);
                }
            }, error => {
                if (v2) {
                    if (!isNoReceiver(error)) return reportOutdatedPage(site, tab.id);
                } else if (isNoReceiver(error)) {
                    showRefreshNotice();
                    chrome.tabs.reload(tab.id).catch(() => {});
                }
            });
        }));
    }).then(() => {
        if (site === selectedSite) refreshLayoutStatus();
    }).catch(error => console.error('[Wider Gemini] Could not query site tabs:', error));
}

function hasReadingEffect(settings) {
    return settings.messageFontSize !== 100 || settings.messageCompactness > 0 ||
        settings.messageSpacingCustom || settings.userFullWidth;
}

function getTabSite(tab) {
    const url = tab && tab.url || '';
    if (/^https:\/\/chatgpt\.com\//.test(url)) return 'chatgpt';
    if (/^https:\/\/gemini\.google\.com\//.test(url)) return 'gemini';
    return null;
}

// 只报告当前标签页的状态；切换站点或较慢的旧响应不会把别的页面标成未适配。
async function refreshLayoutStatus() {
    const request = ++layoutStatusRequest;
    const site = selectedSite;
    if (site === 'chatgpt' && !chatgptGranted) {
        setStatus('page', '');
        return;
    }
    try {
        await writeQueue;
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (request !== layoutStatusRequest || site !== selectedSite) return;
        if (getTabSite(tab) !== site) {
            setStatus('page', '');
            return;
        }
        let message = '';
        try {
            const result = await chrome.tabs.sendMessage(tab.id, { action: 'getLayoutStatus' });
            if (!result || result.site !== site) return;
            // 缺少 capabilities 的内容脚本来自不支持消息导航的旧版本。
            if (!(result.protocolVersion >= settingsUtils.PROTOCOL_VERSION) ||
                (!result.capabilities && siteSettings[site].navigationEnabled)) {
                message = t('pageOutdated', 'Saved, but this page runs an older extension version.');
            } else if (result.siteEnabled && result.widthEnabled) {
                message = { unsupported: t('layoutUnsupported'), loading: t('layoutLoading') }[result.status] || '';
            }
            // 宽度正常但消息结构未识别时，阅读设置不会生效；只在设置了非默认阅读效果时提示。
            if (!message && result.siteEnabled && result.reading && result.reading.status === 'unsupported' &&
                hasReadingEffect(siteSettings[site])) {
                message = t('readingUnsupported', 'Message layout not recognized; font size and spacing are not applied.');
            }
        } catch (error) {
            message = t('layoutUnavailable', 'Page status unavailable. Refresh the page and try again.');
        }
        if (request === layoutStatusRequest && site === selectedSite) setStatus('page', message);
    } catch (error) {
        // 标签页查询失败时不显示页面状态。
    }
}

function showRefreshNotice() {
    refreshNotice.classList.add('show');
    setTimeout(() => {
        refreshNotice.classList.remove('show');
    }, 2000);
}

// ---- 渲染 ----

function syncRangeProgress(input) {
    if (!input) return;
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    const value = parseFloat(input.value) || min;
    const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;
    input.style.setProperty('--slider-progress', `${clamp(progress, 0, 100)}%`);
}

function syncAllRangeProgress() {
    [widthSlider, compactnessSlider, lineHeightSlider, paragraphSpacingSlider, fontSizeSlider].forEach(syncRangeProgress);
}

// 整站暂停时所有设置仍可编辑；只有启用中且宽度关闭时才锁定宽度控件。
function applyEnabledUi() {
    const settings = siteSettings[selectedSite];
    const siteName = SITE_NAMES[selectedSite];
    const enabled = settings ? settings.siteEnabled : true;
    siteEnabledToggle.checked = enabled;
    siteEnabledLabel.textContent = t('siteEnabled', 'Enable on {site}').replace('{site}', siteName);
    siteEnabledToggle.setAttribute('aria-label',
        t('siteEnabledA11y', 'Enable Roomy on {site}').replace('{site}', siteName));
    sitePower.classList.toggle('is-paused', !enabled);
    sitePowerState.textContent = t('sitePaused', 'Paused');
    sitePowerState.hidden = enabled;
    widthEnabledLabel.textContent = t('widthEnabledSite', 'Widen {site} conversations').replace('{site}', siteName);
    widthEnabledToggle.checked = currentWidthEnabled;
    const locked = enabled && !currentWidthEnabled;
    widthControls.disabled = locked;
    unitPxBtn.disabled = locked;
    unitPercentBtn.disabled = locked;
    document.querySelector('.width-switch').title = widthEnabledLabel.textContent;
}

function applyWidthUi(settings) {
    if (settings.widthEnabled !== undefined) currentWidthEnabled = settings.widthEnabled;
    currentWidthMin = settings.widthMin;
    currentWidthMax = settings.widthMax;
    currentWidthPercentMin = settings.widthPercentMin;
    currentWidthPercentMax = settings.widthPercentMax;
    currentWidthSetting = { ...settings.chatWidthSetting };
    if (settings.presetsByUnit) {
        currentPresetsByUnit = settings.presetsByUnit;
    }
    currentPresets = getPresetGroup(currentWidthSetting.unit);
    applyEnabledUi();

    const range = getActiveRange();
    widthMinInput.value = range.min;
    widthMaxInput.value = range.max;
    widthMinInput.min = currentWidthSetting.unit === settingsUtils.UNIT_PERCENT ? PERCENT_RANGE_MIN : RANGE_MIN;
    widthMaxInput.min = widthMinInput.min;
    widthMaxInput.max = currentWidthSetting.unit === settingsUtils.UNIT_PERCENT ? PERCENT_RANGE_MAX : RANGE_MAX;
    widthMinInput.max = widthMaxInput.max;
    widthMinInput.step = range.step;
    widthMaxInput.step = range.step;
    widthSlider.min = range.min;
    widthSlider.max = range.max;
    widthSlider.step = range.step;
    widthSlider.value = currentWidthSetting.value;
    widthValue.textContent = currentWidthSetting.value;
    widthUnitLabel.textContent = getUnitLabel(currentWidthSetting.unit);
    syncRangeProgress(widthSlider);

    unitPxBtn.classList.toggle('segment-active', currentWidthSetting.unit === settingsUtils.UNIT_PX);
    unitPercentBtn.classList.toggle('segment-active', currentWidthSetting.unit === settingsUtils.UNIT_PERCENT);
    unitPxBtn.setAttribute('aria-pressed', String(currentWidthSetting.unit === settingsUtils.UNIT_PX));
    unitPercentBtn.setAttribute('aria-pressed', String(currentWidthSetting.unit === settingsUtils.UNIT_PERCENT));
    renderPresetsForMode(currentPresets);
    if (!managePresetsBody.hidden) {
        renderManagePresetsRows(currentPresets);
    }
    updateTaskPreview();
}

function applyDensityUi(settings) {
    currentDensity = settingsUtils.normalizeDensity(settings);
    compactnessSlider.value = currentDensity.messageCompactness;
    compactnessValue.textContent = currentDensity.messageCompactness;
    lineHeightSlider.value = currentDensity.messageLineHeight;
    lineHeightValue.textContent = currentDensity.messageLineHeight.toFixed(2);
    paragraphSpacingSlider.value = currentDensity.messageParagraphSpacing;
    paragraphSpacingValue.textContent = currentDensity.messageParagraphSpacing;
    densitySummary.textContent = currentDensity.messageSpacingCustom
        ? t('customSpacing', 'Custom') : t('autoSpacing', 'Auto');
    syncAllRangeProgress();
}

function applyFontSizeUi(fontSize) {
    currentFontSize = fontSize;
    fontSizeSlider.value = currentFontSize;
    fontSizeValue.textContent = currentFontSize;
    syncRangeProgress(fontSizeSlider);
}

function setToggleStatus(element, enabled) {
    element.textContent = enabled ? t('statusOn', 'On') : t('statusOff', 'Off');
}

function renderTaskOptions() {
    const value = taskPresetSelect.value;
    taskPresetSelect.innerHTML = '';
    for (const task of Object.keys(settingsUtils.TASK_PRESETS[selectedSite])) {
        const option = document.createElement('option');
        option.value = task;
        option.textContent = t(TASK_LABELS[task]);
        taskPresetSelect.appendChild(option);
    }
    if (settingsUtils.TASK_PRESETS[selectedSite][value]) taskPresetSelect.value = value;
}

function renderSite() {
    const settings = siteSettings[selectedSite];
    siteButtons.forEach(button => {
        const active = button.dataset.site === selectedSite;
        button.classList.toggle('site-active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    codeWrapCard.hidden = selectedSite !== 'gemini';
    renderPermission();
    renderTaskOptions();
    applyWidthUi(settings);
    applyDensityUi(settings);
    applyFontSizeUi(settings.messageFontSize);
    codeWrapToggle.checked = settings.codeWrap === true;
    setToggleStatus(codeWrapStatus, codeWrapToggle.checked);
    userFullWidthToggle.checked = settings.userFullWidth;
    setToggleStatus(userFullWidthStatus, settings.userFullWidth);
    navigationToggle.checked = settings.navigationEnabled;
    renderTaskState();
}

function renderPermission() {
    const intro = chatgptIntro && !chatgptGranted;
    chatgptPermission.hidden = chatgptGranted || (selectedSite !== 'chatgpt' && !intro);
    chatgptAttention.hidden = chatgptGranted;
    document.getElementById('chatgptAttentionLabel').textContent = t('chatgptAccessNeeded', 'Access needed');
    grantChatgptPermission.textContent = t('grantChatgptPermission', 'Allow ChatGPT access');
    document.getElementById('chatgptPermissionHint').textContent = intro
        ? t('chatgptIntroHint', 'New: ChatGPT is supported too. Allow access to widen its conversations and adjust their text.')
        : t('chatgptPermissionHint', 'ChatGPT access is optional. Allow access to apply these settings.');
}

// 读取后立即清除标记和工具栏角标：提示只在这次打开时出现，之后保留 ChatGPT 标签上的入口。
async function takeChatgptIntro() {
    const key = settingsUtils.CHATGPT_INTRO_KEY;
    const stored = await chrome.storage.local.get(key).catch(() => ({}));
    if (!stored[key]) return false;
    await chrome.storage.local.remove(key).catch(() => {});
    await chrome.action.setBadgeText({ text: '' }).catch(() => {});
    return true;
}

async function refreshPermission() {
    chatgptGranted = await chrome.permissions.contains({ origins: [settingsUtils.SITE_MATCHES.chatgpt] });
    renderPermission();
    refreshLayoutStatus();
}

grantChatgptPermission.addEventListener('click', function () {
    // request 必须直接进入点击的同步调用链，不能先等待设置写入。
    const request = chrome.permissions.request({ origins: [settingsUtils.SITE_MATCHES.chatgpt] });
    grantChatgptPermission.disabled = true;
    request.then(refreshPermission).catch(error => {
        console.error('[Wider Gemini] Could not request ChatGPT permission:', error);
        setStatus('error', t('chatgptPermissionFailed', 'Could not request access. Please try again.'));
    }).finally(() => { grantChatgptPermission.disabled = false; });
});
chrome.permissions.onAdded.addListener(refreshPermission);
chrome.permissions.onRemoved.addListener(refreshPermission);

// ---- 任务预设与一步恢复 ----

function updateTaskPreview() {
    const task = taskPresetSelect.value;
    if (!settingsUtils.TASK_PRESETS[selectedSite][task]) return;
    const values = settingsUtils.getTaskValues(selectedSite, task, getTaskRanges());
    const parts = [formatWidthValue(values.chatWidthSetting), `${values.messageFontSize}%`,
        t('taskSpacingNative', 'Native spacing')];
    if (selectedSite === 'gemini') parts.push(t(values.codeWrap ? 'taskWrapOn' : 'taskWrapOff'));
    document.getElementById('taskPresetPreview').textContent = parts.join(' · ');
}

function renderTaskState(message) {
    const undo = taskUndo[selectedSite];
    if (message !== undefined) taskPresetStatus.textContent = message;
    else taskPresetStatus.textContent = undo && undo.ambiguous ? t('taskPendingUnknown') : '';
    setTaskBusy(taskBusy);
}

function setTaskBusy(busy) {
    taskBusy = busy;
    const undo = taskUndo[selectedSite];
    settingsControls.disabled = busy || !settingsLoaded;
    siteButtons.forEach(button => { button.disabled = busy || !settingsLoaded; });
    siteEnabledToggle.disabled = busy || !settingsLoaded;
    uiLanguageSelect.disabled = busy || !settingsLoaded;
    taskPresetSelect.disabled = busy || !settingsLoaded;
    applyTaskPreset.disabled = busy || !settingsLoaded;
    restoreTaskPreset.disabled = busy || !settingsLoaded || !undo || undo.ambiguous || undo.record.state !== 'ready';
}

async function readSite(site) {
    const stored = await chrome.storage.sync.get(settingsUtils.getSiteStorageKeys(site));
    Object.assign(storedSettings, stored);
    return stored;
}

function afterTaskWrite(site) {
    siteSettings[site] = settingsUtils.normalizeSiteSettings(storedSettings, site);
    if (site === selectedSite) renderSite();
    notifySiteTabs(site, { action: 'refreshSettings' });
}

async function applyTask(site, task) {
    const key = settingsUtils.TASK_UNDO_KEYS[site];
    const stored = await readSite(site);
    const current = settingsUtils.normalizeSiteSettings(stored, site);
    const snapshot = settingsUtils.getTaskManaged(current, site);
    const values = settingsUtils.getTaskValues(site, task, current);
    const previousUndo = taskUndo[site];
    const previous = previousUndo && !previousUndo.ambiguous && previousUndo.record.state === 'ready'
        ? previousUndo.record : null;
    // 1. 先保存带“应用中”标记的撤销快照；失败则不应用任务。
    const pending = { state: 'applying', snapshot, previous, pending: { from: snapshot, to: values } };
    await chrome.storage.local.set({ [key]: pending });
    // 2. 一次写入任务的全部设置；失败时恢复原撤销记录。
    const patch = settingsUtils.getTaskPatch(stored, site, values);
    try {
        await chrome.storage.sync.set(patch);
    } catch (error) {
        await (previous ? chrome.storage.local.set({ [key]: previous }) : chrome.storage.local.remove(key))
            .catch(() => { taskUndo[site] = { record: pending, ambiguous: true }; });
        throw error;
    }
    Object.assign(storedSettings, patch);
    afterTaskWrite(site);
    // 3. 标记撤销记录可用；失败只影响撤销记录，任务本身已生效。
    const ready = { state: 'ready', snapshot };
    try {
        await chrome.storage.local.set({ [key]: ready });
        taskUndo[site] = { record: ready };
        return t('taskApplied');
    } catch (error) {
        taskUndo[site] = { record: pending, ambiguous: false };
        return t('taskUndoRecordError', 'Applied, but the restore point could not be saved.');
    }
}

async function restoreTask(site) {
    const key = settingsUtils.TASK_UNDO_KEYS[site];
    const record = taskUndo[site].record;
    const stored = await readSite(site);
    const before = settingsUtils.getTaskManaged(settingsUtils.normalizeSiteSettings(stored, site), site);
    // 按当前范围钳制快照宽度，保留用户之后设置的范围。
    const patch = settingsUtils.getTaskPatch(stored, site, record.snapshot);
    const target = settingsUtils.getTaskManaged(
        settingsUtils.normalizeSiteSettings({ ...stored, ...patch }, site), site);
    await chrome.storage.local.set({ [key]: { state: 'restoring', snapshot: record.snapshot, pending: { from: before, to: target } } });
    try {
        await chrome.storage.sync.set(patch);
    } catch (error) {
        await chrome.storage.local.set({ [key]: record }).catch(() => {});
        throw error;
    }
    Object.assign(storedSettings, patch);
    afterTaskWrite(site);
    const clamped = !isSameWidthSetting(target.chatWidthSetting, record.snapshot.chatWidthSetting);
    const result = clamped
        ? t('taskRestoredClamped', 'Restored; width adjusted to {width}.').replace('{width}', formatWidthValue(target.chatWidthSetting))
        : t('taskRestored');
    try {
        await chrome.storage.local.remove(key);
        taskUndo[site] = null;
        return result;
    } catch (error) {
        // 设置已恢复；撤销记录会在下次打开时按实际值清理，不会再次回放。
        taskUndo[site] = { record: { state: 'restoring' }, ambiguous: false };
        return t('taskUndoCleanupError', 'Settings restored, but the restore point could not be cleared.');
    }
}

async function runTaskPreset(restore) {
    const site = selectedSite;
    const task = taskPresetSelect.value;
    const undo = taskUndo[site];
    if (!settingsLoaded || taskBusy || (restore && (!undo || undo.record.state !== 'ready'))) return;
    setTaskBusy(true);
    taskPresetStatus.textContent = t('taskSaving');
    let message;
    try {
        await flushPendingChanges();
        message = await enqueue(() => restore ? restoreTask(site) : applyTask(site, task));
    } catch (error) {
        console.error('[Wider Gemini] Task preset could not be saved:', error);
        message = t('taskSaveError');
        await readSite(site).catch(() => {});
        siteSettings[site] = settingsUtils.normalizeSiteSettings(storedSettings, site);
        if (site === selectedSite) renderSite();
    } finally {
        taskBusy = false;
    }
    if (site === selectedSite) renderTaskState(message);
    else setTaskBusy(false);
}

taskPresetSelect.addEventListener('change', updateTaskPreview);
applyTaskPreset.addEventListener('click', () => runTaskPreset(false));
restoreTaskPreset.addEventListener('click', () => runTaskPreset(true));

// 重新打开时核对未完成的任务记录：只改本地记录，不改同步设置，也不会自动重放恢复。
async function loadTaskUndo(site, localValues) {
    const key = settingsUtils.TASK_UNDO_KEYS[site];
    const record = settingsUtils.readUndoRecord(localValues[key]);
    const actual = settingsUtils.getTaskManaged(siteSettings[site], site);
    const result = settingsUtils.reconcileUndoRecord(record, actual, site);
    if (result.record !== record && !result.ambiguous) {
        await (result.record ? chrome.storage.local.set({ [key]: result.record }) : chrome.storage.local.remove(key))
            .catch(() => {});
    }
    taskUndo[site] = result.record ? { record: result.record, ambiguous: !!result.ambiguous } : null;
}

// ---- 初始化 ----

async function initializeSettings() {
    setTaskBusy(false);
    try {
        const [result, tabs, localValues, granted, intro] = await Promise.all([
            chrome.storage.sync.get([...settingsUtils.getSiteStorageKeys('gemini'),
                ...settingsUtils.getSiteStorageKeys('chatgpt'), 'uiLanguage']),
            chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []),
            chrome.storage.local.get(Object.values(settingsUtils.TASK_UNDO_KEYS)).catch(() => ({})),
            chrome.permissions.contains({ origins: [settingsUtils.SITE_MATCHES.chatgpt] }),
            takeChatgptIntro()
        ]);
        storedSettings = result;
        chatgptGranted = granted;
        chatgptIntro = intro;
        siteSettings.gemini = settingsUtils.normalizeSiteSettings(result, 'gemini');
        siteSettings.chatgpt = settingsUtils.normalizeSiteSettings(result, 'chatgpt');
        await Promise.all(['gemini', 'chatgpt'].map(site => loadTaskUndo(site, localValues)));
        activeTabSite = getTabSite(tabs[0]);
        const savedSite = new URLSearchParams(window.location.search).get('site');
        selectedSite = SITE_NAMES[savedSite] ? savedSite : activeTabSite || 'gemini';

        // 语言、站点与存储全部就绪后才开放控件，避免初始状态闪烁或覆盖用户操作。
        const uiLanguage = settingsUtils.normalizeUiLanguage(result.uiLanguage);
        await loadLanguageDictionary(uiLanguage);
        localizeHtmlPage();
        siteButtons.forEach(button => {
            const marker = button.querySelector('.site-current');
            if (marker) {
                marker.hidden = button.dataset.site !== activeTabSite;
                marker.textContent = t('currentSite', 'Current');
            }
        });
        uiLanguageSelect.value = uiLanguage;
        renderSite();
        if (result.uiLanguage === undefined) {
            await enqueue(() => chrome.storage.sync.set({ uiLanguage }));
        }
        settingsLoaded = true;
        setTaskBusy(false);
        refreshLayoutStatus();
    } catch (error) {
        console.error('[Wider Gemini] Settings could not be loaded:', error);
        setStatus('error', t('saveFailed', 'Could not save. Please try again.'));
    }
}

initializeSettings();

// ---- 控件事件 ----

siteEnabledToggle.addEventListener('change', async function () {
    const site = selectedSite;
    const enabled = this.checked;
    if (!settingsLoaded || taskBusy) return;
    try {
        await flushPendingChanges();
    } catch (error) {
        this.checked = !enabled;
        setStatus('error', t('saveFailed', 'Could not save. Please try again.'));
        return;
    }
    siteSettings[site].siteEnabled = enabled;
    if (site === selectedSite) applyEnabledUi();
    writePatch(site, () => settingsUtils.getSiteEnabledPatch(site, enabled), { action: 'updateSiteEnabled' });
});

widthEnabledToggle.addEventListener('change', async function () {
    if (!settingsLoaded || taskBusy) return;
    const enabled = this.checked;
    try {
        await flushPendingChanges();
    } catch (error) {
        this.checked = !enabled;
        return;
    }
    currentWidthEnabled = enabled;
    applyEnabledUi();
    saveWidthSettings();
});

siteButtons.forEach(button => {
    button.addEventListener('click', async function () {
        const site = this.dataset.site;
        if (!settingsLoaded || taskBusy || site === selectedSite) return;
        try {
            await flushPendingChanges();
        } catch (error) {
            return;
        }
        selectedSite = site;
        statusMessages.error = '';
        statusMessages.transient = '';
        statusMessages.page = '';
        renderStatus();
        renderSite();
        refreshLayoutStatus();
    });
});

function onRangeInput(isMin) {
    if (isEditMode) savePresetEdits();
    const isPercent = currentWidthSetting.unit === settingsUtils.UNIT_PERCENT;
    const low = isPercent ? PERCENT_RANGE_MIN : RANGE_MIN;
    const high = isPercent ? PERCENT_RANGE_MAX : RANGE_MAX;
    const step = isPercent ? 1 : settingsUtils.PX_RANGE.step;
    let minVal = clamp(parseInt(widthMinInput.value, 10) || low, low, high);
    let maxVal = clamp(parseInt(widthMaxInput.value, 10) || high, low, high);
    if (minVal >= maxVal) {
        if (isMin) {
            minVal = Math.min(minVal, high - step);
            maxVal = minVal + step;
        } else {
            maxVal = Math.max(maxVal, low + step);
            minVal = maxVal - step;
        }
    }
    widthMinInput.value = minVal;
    widthMaxInput.value = maxVal;
    if (isPercent) {
        currentWidthPercentMin = minVal;
        currentWidthPercentMax = maxVal;
    } else {
        currentWidthMin = minVal;
        currentWidthMax = maxVal;
    }

    const settings = getCurrentWidthSettings();
    applyWidthUi(settings);
    updateWidthSetting(settings.chatWidthSetting);
}

widthMinInput.addEventListener('change', () => onRangeInput(true));
widthMaxInput.addEventListener('change', () => onRangeInput(false));

function updateWidthSetting(setting) {
    clearTimeout(widthUpdateTimer);
    widthUpdateTimer = null;
    currentWidthSetting = settingsUtils.normalizeWidthSetting(setting, getTaskRanges());
    return saveWidthSettings();
}

widthSlider.addEventListener('input', function () {
    const value = parseFloat(this.value);
    currentWidthSetting = { value, unit: currentWidthSetting.unit };
    widthValue.textContent = value;
    syncRangeProgress(this);
    if (!isEditMode) {
        renderPresetButtons(currentPresets, currentWidthMin, currentWidthMax, currentWidthSetting);
    }
    clearTimeout(widthUpdateTimer);
    widthUpdateTimer = setTimeout(() => updateWidthSetting(currentWidthSetting), 500);
});

// 松手时立即提交，避免关闭弹窗取消尚未执行的防抖回调。
widthSlider.addEventListener('change', function () {
    updateWidthSetting(currentWidthSetting);
});

[unitPxBtn, unitPercentBtn].forEach(btn => {
    btn.addEventListener('click', function () {
        const unit = this.dataset.unit;
        if (unit === currentWidthSetting.unit) return;
        if (isEditMode) savePresetEdits();
        const next = settingsUtils.normalizeWidthSetting({ value: getUnitFallbackValue(unit), unit }, getTaskRanges());
        currentWidthSetting = next;
        applyWidthUi({ ...getTaskRanges(), chatWidthSetting: next });
        updateWidthSetting(next);
    });
});

const editPresetsBtn = document.getElementById('editPresetsBtn');
const donePresetsBtn = document.getElementById('donePresetsBtn');
editPresetsBtn.addEventListener('click', function () {
    isEditMode = true;
    editPresetsBtn.style.display = 'none';
    donePresetsBtn.style.display = 'inline-block';
    renderPresetButtonsEditMode(currentPresets);
});
function savePresetEdits() {
    const rows = document.querySelectorAll('.preset-edit-row');
    const nextPresets = currentPresets.map((p, i) => {
        const row = rows[i];
        const input = row && row.querySelector('.preset-edit-width');
        const value = input ? parseFloat(input.value) : p.value;
        return settingsUtils.normalizePreset({
            id: p.id, nameKey: p.nameKey, name: p.name, value, unit: currentWidthSetting.unit
        }, i, getTaskRanges());
    });
    setPresetGroup(currentWidthSetting.unit, nextPresets);
    isEditMode = false;
    saveWidthSettings();
    editPresetsBtn.style.display = 'inline-block';
    donePresetsBtn.style.display = 'none';
    renderPresetButtons(nextPresets, currentWidthMin, currentWidthMax, currentWidthSetting);
}
donePresetsBtn.addEventListener('click', savePresetEdits);

document.getElementById('presetButtonsContainer').addEventListener('click', function (e) {
    if (isEditMode) return;
    const btn = e.target.closest('.preset-btn');
    if (!btn || !btn.dataset.value || !btn.dataset.unit) return;
    const setting = settingsUtils.normalizeWidthSetting({
        value: parseFloat(btn.dataset.value),
        unit: btn.dataset.unit
    }, getTaskRanges());
    currentWidthSetting = setting;
    applyWidthUi({ ...getTaskRanges(), chatWidthSetting: setting });
    updateWidthSetting(setting);
});

// 阅读控件：滑块防抖，编辑的站点和数值在入队时确定。
function commitReadingEdit() {
    clearTimeout(readingUpdateTimer);
    readingUpdateTimer = null;
    if (!pendingReadingEdit) return;
    const { site, edit } = pendingReadingEdit;
    pendingReadingEdit = null;
    saveReading(site, edit);
}

function scheduleReadingEdit(edit, delay = 400) {
    if (pendingReadingEdit && pendingReadingEdit.site !== selectedSite) commitReadingEdit();
    pendingReadingEdit = { site: selectedSite, edit: { ...(pendingReadingEdit && pendingReadingEdit.edit), ...edit } };
    clearTimeout(readingUpdateTimer);
    readingUpdateTimer = setTimeout(commitReadingEdit, delay);
}

compactnessSlider.addEventListener('input', function () {
    applyDensityUi({ messageCompactness: parseInt(this.value, 10), messageSpacingCustom: false });
    scheduleReadingEdit({ ...currentDensity });
});

advancedDensityToggle.addEventListener('click', function () {
    const open = advancedDensityBody.hidden;
    advancedDensityBody.hidden = !open;
    advancedDensityToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
});

[lineHeightSlider, paragraphSpacingSlider].forEach(input => {
    input.addEventListener('input', function () {
        applyDensityUi({
            messageCompactness: parseInt(compactnessSlider.value, 10),
            messageLineHeight: parseFloat(lineHeightSlider.value),
            messageParagraphSpacing: parseInt(paragraphSpacingSlider.value, 10),
            messageSpacingCustom: true
        });
        scheduleReadingEdit({ ...currentDensity }, 250);
    });
});

fontSizeSlider.addEventListener('input', function () {
    applyFontSizeUi(parseInt(this.value, 10));
    scheduleReadingEdit({ messageFontSize: currentFontSize });
});

[compactnessSlider, fontSizeSlider, lineHeightSlider, paragraphSpacingSlider].forEach(input => {
    input.addEventListener('change', commitReadingEdit);
});

resetFontSizeBtn.addEventListener('click', function () {
    applyFontSizeUi(DEFAULTS.messageFontSize);
    scheduleReadingEdit({ messageFontSize: currentFontSize }, 0);
});

resetDensityBtn.addEventListener('click', function () {
    applyDensityUi({ messageCompactness: parseInt(compactnessSlider.value, 10), messageSpacingCustom: false });
    scheduleReadingEdit({ ...currentDensity }, 0);
});

codeWrapToggle.addEventListener('change', function () {
    setToggleStatus(codeWrapStatus, this.checked);
    scheduleReadingEdit({ codeWrap: this.checked }, 0);
});

userFullWidthToggle.addEventListener('change', function () {
    setToggleStatus(userFullWidthStatus, this.checked);
    scheduleReadingEdit({ userFullWidth: this.checked }, 0);
});

// 消息导航独立于宽度开关，不属于任务预设；暂停时保存也不会重新启用网站。
navigationToggle.addEventListener('change', function () {
    const site = selectedSite;
    const enabled = this.checked;
    writePatch(site, () => settingsUtils.getSiteNavigationPatch(site, enabled), { action: 'refreshSettings' });
});

uiLanguageSelect.addEventListener('change', async function () {
    const language = settingsUtils.normalizeUiLanguage(this.value);
    setTaskBusy(true);
    try {
        await flushPendingChanges();
        await enqueue(() => chrome.storage.sync.set({ uiLanguage: language }));
        // 保留手动选择的站点，重新加载 popup 以全量重渲染新语言。
        const url = new URL(window.location.href);
        url.searchParams.set('site', selectedSite);
        window.location.replace(url.href);
    } catch (error) {
        setStatus('error', t('saveFailed', 'Could not save. Please try again.'));
        setTaskBusy(false);
    }
});
