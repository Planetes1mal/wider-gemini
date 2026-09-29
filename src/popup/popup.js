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
        "appName", "headerSubtitle", "widthLabel", "widthMin", "widthMax",
        "btnNarrow", "btnDefault", "btnWider", "btnUltra", "btnInsane",
        "editPresets", "donePresets", "cancelPresets", "managePresets", "managePresetsSummary", "resetToDefault",
        "codeWrapLabel", "refreshing",
        "userFullWidthLabel",
        "widthUnit", "densityLabel", "compactnessUnit", "advancedDensity",
        "lineHeightLabel", "paragraphSpacingLabel", "resetDensity",
        "fontSizeLabel", "resetFontSize",
        "customSpacing", "autoSpacing",
        "uiLanguageLabel", "uiLanguageAuto", "helpLink", "sourceLink",
        "taskPresets", "taskReading", "taskTable", "taskCode", "taskLarge", "taskHint", "taskApply", "taskRestore",
        "autoSpacingHint", "settingsSite", "currentSite", "chatgptWidthOnly", "widthOptions", "readingSettings",
        "widthEnabled"
    ];

    ids.forEach(id => {
        const element = document.getElementById("i18n-" + id);
        if (element) {
            element.textContent = t(id);
        }
    });
    const widthUnitGroup = document.querySelector('.unit-segment');
    if (widthUnitGroup) widthUnitGroup.setAttribute('aria-label', t('widthUnit', 'Width unit'));
    const widthSwitch = document.querySelector('.width-switch');
    if (widthSwitch) widthSwitch.title = t('widthEnabled', 'Enable widening');
}

localizeHtmlPage();

const settingsUtils = window.widerGeminiSettings;
const DEFAULTS = settingsUtils.DEFAULTS;
const RANGE_MIN = settingsUtils.PX_RANGE.min;
const RANGE_MAX = settingsUtils.PX_RANGE.max;
const PERCENT_RANGE_MIN = settingsUtils.PERCENT_RANGE.min;
const PERCENT_RANGE_MAX = settingsUtils.PERCENT_RANGE.max;

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
    return settingsUtils.getRangeForUnit({
        widthMin: currentWidthMin,
        widthMax: currentWidthMax,
        widthPercentMin: currentWidthPercentMin,
        widthPercentMax: currentWidthPercentMax
    }, currentWidthSetting.unit);
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

function saveWidthSettings() {
    const site = selectedSite;
    const settings = getCurrentWidthSettings();
    widthSettingsBySite[site] = settings;
    return queueSettingsWrite(settingsUtils.getSiteWidthStoragePayload(settings, site));
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
        const range = settingsUtils.getRangeForUnit({
            widthMin: currentWidthMin,
            widthMax: currentWidthMax,
            widthPercentMin: currentWidthPercentMin,
            widthPercentMax: currentWidthPercentMax
        }, currentWidthSetting.unit);
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
            const unit = currentWidthSetting.unit;
            const originalValue = parseFloat(this.value);
            const normalized = settingsUtils.normalizeWidthSetting({
                value: originalValue,
                unit
            }, {
                widthMin: currentWidthMin,
                widthMax: currentWidthMax,
                widthPercentMin: currentWidthPercentMin,
                widthPercentMax: currentWidthPercentMax
            });
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
        const unit = currentWidthSetting.unit;
        const value = widthInput ? parseFloat(widthInput.value) : p.value;
        return settingsUtils.normalizePreset({ id: p.id, nameKey: p.nameKey, name: customName, value, unit }, i, {
            widthMin: currentWidthMin,
            widthMax: currentWidthMax,
            widthPercentMin: currentWidthPercentMin,
            widthPercentMax: currentWidthPercentMax
        });
    });
    setPresetGroup(currentWidthSetting.unit, nextPresets);
    saveWidthSettings().catch(showSaveError);
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
        const range = settingsUtils.getRangeForUnit({
            widthMin: currentWidthMin,
            widthMax: currentWidthMax,
            widthPercentMin: currentWidthPercentMin,
            widthPercentMax: currentWidthPercentMax
        }, currentWidthSetting.unit);
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
            const unit = currentWidthSetting.unit;
            const normalized = settingsUtils.normalizeWidthSetting({
                value: parseFloat(this.value),
                unit
            }, {
                widthMin: currentWidthMin,
                widthMax: currentWidthMax,
                widthPercentMin: currentWidthPercentMin,
                widthPercentMax: currentWidthPercentMax
            });
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

function normalizeStorage(result) {
    return settingsUtils.normalizeStorage(result);
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
const codeWrapToggle = document.getElementById('codeWrapToggle');
const codeWrapStatus = document.getElementById('codeWrapStatus');
const userFullWidthToggle = document.getElementById('userFullWidthToggle');
const userFullWidthStatus = document.getElementById('userFullWidthStatus');
const uiLanguageSelect = document.getElementById('uiLanguageSelect');
const refreshNotice = document.getElementById('refreshNotice');
const taskPresetSelect = document.getElementById('taskPresetSelect');
const applyTaskPreset = document.getElementById('applyTaskPreset');
const restoreTaskPreset = document.getElementById('restoreTaskPreset');
const taskPresetStatus = document.getElementById('taskPresetStatus');
const settingsControls = document.getElementById('settingsControls');
const widthControls = document.getElementById('widthControls');
const widthEnabledToggle = document.getElementById('widthEnabledToggle');
const siteButtons = [document.getElementById('siteGeminiBtn'), document.getElementById('siteChatgptBtn')];
const settingsError = document.getElementById('settingsError');
const layoutStatus = document.getElementById('layoutStatus');
const chatgptWidthNotice = document.getElementById('chatgptWidthNotice');
const readingSettings = document.getElementById('readingSettings');
const TASK_UNDO_KEY = 'taskPresetUndo';
const TASK_PRESETS = {
    reading: { chatWidthSetting: { value: 1000, unit: 'px' }, messageFontSize: 110, codeWrap: true },
    table: { chatWidthSetting: { value: 90, unit: 'percent' }, messageFontSize: 100, codeWrap: false },
    code: { chatWidthSetting: { value: 90, unit: 'percent' }, messageFontSize: 100, codeWrap: true },
    large: { chatWidthSetting: { value: 1000, unit: 'px' }, messageFontSize: 140, codeWrap: true }
};
let taskUndoSettings = null;
let taskBusy = false;
let settingsLoaded = false;
let selectedSite = 'gemini';
let widthSettingsBySite = {};
let settingsWriteQueue = Promise.resolve();
const latestSiteMessages = new Map();
let layoutStatusRequest = 0;

let widthUpdateTimer = null;
let densityUpdateTimer = null;

let currentWidthSetting = { ...settingsUtils.DEFAULTS.chatWidthSetting };
let currentWidthEnabled = DEFAULTS.widthEnabled;
let currentWidthMin = DEFAULTS.widthMin;
let currentWidthMax = DEFAULTS.widthMax;
let currentWidthPercentMin = settingsUtils.DEFAULTS.widthPercentMin;
let currentWidthPercentMax = settingsUtils.DEFAULTS.widthPercentMax;
let currentDensity = settingsUtils.normalizeDensity({});
let currentFontSize = settingsUtils.DEFAULTS.messageFontSize;
let currentPresetsByUnit = settingsUtils.normalizePresetGroups({}, DEFAULTS);
let currentPresets = currentPresetsByUnit[settingsUtils.UNIT_PX];

function getCurrentWidthSettings() {
    return settingsUtils.normalizeSiteWidthSettings({
        ...getTaskRanges(),
        widthEnabled: currentWidthEnabled,
        chatWidthSetting: currentWidthSetting,
        presetsByUnit: currentPresetsByUnit
    }, 'gemini');
}

// ChatGPT 的宽度配置是一个独立存储对象，顺序写入避免较慢的旧请求覆盖新设置。
function queueSettingsWrite(payload) {
    const write = settingsWriteQueue.then(() => chrome.storage.sync.set(payload));
    settingsWriteQueue = write.catch(() => {});
    return write;
}

function showSaveError(error) {
    console.error('[Wider Gemini] Settings could not be saved:', error);
    settingsError.textContent = t('settingsSaveError', 'Could not save settings. Please try again.');
    settingsError.hidden = false;
}

function flushPendingChanges() {
    if (widthUpdateTimer !== null) updateWidthSetting(currentWidthSetting);
    if (densityUpdateTimer !== null) updateDensity({ ...currentDensity, messageFontSize: currentFontSize });
}

function updateSiteUi() {
    siteButtons.forEach(button => {
        const active = button.dataset.site === selectedSite;
        button.classList.toggle('site-active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    settingsError.textContent = '';
    settingsError.hidden = true;
    chatgptWidthNotice.hidden = selectedSite !== 'chatgpt';
    readingSettings.hidden = selectedSite !== 'gemini';
    refreshLayoutStatus();
}

function getTabSite(tab) {
    const url = tab && tab.url || '';
    if (/^https:\/\/chatgpt\.com\//.test(url)) return 'chatgpt';
    if (/^https:\/\/gemini\.google\.com\//.test(url)) return 'gemini';
    return null;
}

// 只报告当前页的状态；切换设置站点或较慢的旧响应不能把别的页面标成未适配。
async function refreshLayoutStatus() {
    const request = ++layoutStatusRequest;
    const site = selectedSite;
    let targetTabId = null;
    layoutStatus.hidden = true;
    try {
        await settingsWriteQueue;
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (request !== layoutStatusRequest || site !== selectedSite || getTabSite(tab) !== site) return;
        targetTabId = tab.id;
        const result = await chrome.tabs.sendMessage(tab.id, { action: 'getLayoutStatus' });
        if (request !== layoutStatusRequest || site !== selectedSite) return;
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (request !== layoutStatusRequest || currentTab?.id !== tab.id || getTabSite(currentTab) !== site) return;
        if (!result || result.site !== site) return;
        const key = {
            paused: 'widthPaused',
            unsupported: 'layoutUnsupported',
            loading: 'layoutLoading'
        }[result.status];
        layoutStatus.textContent = key ? t(key) : '';
        layoutStatus.hidden = !key;
    } catch (error) {
        if (targetTabId === null || request !== layoutStatusRequest || site !== selectedSite) return;
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
        if (request !== layoutStatusRequest || currentTab?.id !== targetTabId || getTabSite(currentTab) !== site) return;
        layoutStatus.textContent = t('layoutUnavailable', 'Page status unavailable. Refresh the page and try again.');
        layoutStatus.hidden = false;
    }
}

function applyWidthEnabledUi() {
    widthEnabledToggle.checked = currentWidthEnabled;
    widthControls.disabled = !currentWidthEnabled;
    unitPxBtn.disabled = !currentWidthEnabled;
    unitPercentBtn.disabled = !currentWidthEnabled;
}

widthEnabledToggle.addEventListener('change', function () {
    if (!settingsLoaded || taskBusy) return;
    ++layoutStatusRequest;
    layoutStatus.hidden = true;
    if (isEditMode) savePresetEdits();
    // 切换前保存尚未触发 change 的滑块值，暂停不会丢掉用户的宽度和预设。
    flushPendingChanges();
    currentWidthEnabled = this.checked;
    applyWidthEnabledUi();
    const site = selectedSite;
    const message = { action: 'updateWidthEnabled', enabled: currentWidthEnabled };
    saveWidthSettings().then(() => notifySiteTabs(site, message)).then(() => {
        if (site === selectedSite) refreshLayoutStatus();
    }).catch(showSaveError);
});

siteButtons.forEach(button => {
    button.addEventListener('click', function () {
        if (!settingsLoaded || taskBusy || this.dataset.site === selectedSite) return;
        if (isEditMode) savePresetEdits();
        flushPendingChanges();
        widthSettingsBySite[selectedSite] = getCurrentWidthSettings();
        selectedSite = this.dataset.site;
        applyWidthUi(widthSettingsBySite[selectedSite]);
        updateSiteUi();
    });
});

function showRefreshNotice() {
    refreshNotice.classList.add('show');
    setTimeout(() => {
        refreshNotice.classList.remove('show');
    }, 2000);
}

function syncRangeProgress(input) {
    if (!input) return;
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    const value = parseFloat(input.value) || min;
    const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;
    input.style.setProperty('--slider-progress', `${clamp(progress, 0, 100)}%`);
}

function syncAllRangeProgress() {
    [widthSlider, compactnessSlider, lineHeightSlider, paragraphSpacingSlider].forEach(syncRangeProgress);
}

function applyWidthUi(settings) {
    if (settings.widthEnabled !== undefined) currentWidthEnabled = settings.widthEnabled;
    applyWidthEnabledUi();
    currentWidthMin = settings.widthMin;
    currentWidthMax = settings.widthMax;
    currentWidthPercentMin = settings.widthPercentMin;
    currentWidthPercentMax = settings.widthPercentMax;
    currentWidthSetting = { ...settings.chatWidthSetting };
    if (settings.presetsByUnit) {
        currentPresetsByUnit = settings.presetsByUnit;
    }
    currentPresets = getPresetGroup(currentWidthSetting.unit);

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
    widthUnitLabel.textContent = currentWidthSetting.unit === settingsUtils.UNIT_PERCENT ? '%' : 'px';
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

function getTaskRanges() {
    return {
        widthMin: currentWidthMin,
        widthMax: currentWidthMax,
        widthPercentMin: currentWidthPercentMin,
        widthPercentMax: currentWidthPercentMax
    };
}

// 仅写入任务使用的字段，原宽度预设、范围、语言及用户消息宽度保持独立。
function getTaskPayload(settings) {
    const chatWidthSetting = settingsUtils.normalizeWidthSetting(settings.chatWidthSetting, getTaskRanges());
    return {
        chatWidthSetting,
        chatWidth: settingsUtils.getLegacyChatWidth(chatWidthSetting),
        ...settingsUtils.normalizeDensity(settings),
        messageFontSize: settingsUtils.normalizeFontSize(settings.messageFontSize),
        codeWrap: settings.codeWrap === true
    };
}

function updateTaskPreview() {
    const settings = getTaskPayload(TASK_PRESETS[taskPresetSelect.value]);
    document.getElementById('taskPresetPreview').textContent = t('taskPreview')
        .replace('{width}', formatWidthValue(settings.chatWidthSetting))
        .replace('{font}', settings.messageFontSize)
        .replace('{wrap}', t(settings.codeWrap ? 'statusOn' : 'statusOff'));
}

function setTaskBusy(busy) {
    taskBusy = busy;
    settingsControls.disabled = busy || !settingsLoaded;
    siteButtons.forEach(button => { button.disabled = busy || !settingsLoaded; });
    uiLanguageSelect.disabled = busy || !settingsLoaded;
    taskPresetSelect.disabled = busy;
    applyTaskPreset.disabled = busy;
    restoreTaskPreset.disabled = busy || !taskUndoSettings;
}

async function saveTaskSettings(settings) {
    const payload = getTaskPayload(settings);
    await queueSettingsWrite(payload);
    applyWidthUi({ ...getTaskRanges(), chatWidthSetting: payload.chatWidthSetting });
    applyDensityUi(payload);
    applyFontSizeUi(payload);
    codeWrapToggle.checked = payload.codeWrap;
    updateCodeWrapStatus(payload.codeWrap);
    widthSettingsBySite.gemini = getCurrentWidthSettings();
    notifyGeminiTabs({
        action: 'updateWidthSetting', setting: payload.chatWidthSetting,
        ranges: getTaskRanges(), enabled: currentWidthEnabled
    });
    notifyGeminiTabs({ action: 'updateDensity', settings: payload });
    notifyGeminiTabs({ action: 'updateCodeWrap', enabled: payload.codeWrap });
}

async function runTaskPreset(restore) {
    if (!settingsLoaded || taskBusy || selectedSite !== 'gemini' || (restore && !taskUndoSettings)) return;
    if (isEditMode) savePresetEdits();
    flushPendingChanges();
    setTaskBusy(true);
    taskPresetStatus.textContent = t('taskSaving');
    try {
        if (restore) {
            await saveTaskSettings(taskUndoSettings);
            await chrome.storage.local.remove(TASK_UNDO_KEY);
            taskUndoSettings = null;
        } else {
            const snapshot = getTaskPayload({
                chatWidthSetting: currentWidthSetting,
                ...currentDensity,
                messageFontSize: currentFontSize,
                codeWrap: codeWrapToggle.checked
            });
            await chrome.storage.local.set({ [TASK_UNDO_KEY]: snapshot });
            taskUndoSettings = snapshot;
            await saveTaskSettings(TASK_PRESETS[taskPresetSelect.value]);
        }
        taskPresetStatus.textContent = t(restore ? 'taskRestored' : 'taskApplied');
    } catch (error) {
        console.error('[Wider Gemini] Task preset could not be saved:', error);
        taskPresetStatus.textContent = t('taskSaveError');
    } finally {
        setTaskBusy(false);
    }
}

taskPresetSelect.addEventListener('change', updateTaskPreview);
applyTaskPreset.addEventListener('click', () => runTaskPreset(false));
restoreTaskPreset.addEventListener('click', () => runTaskPreset(true));

function applyDensityUi(settings) {
    currentDensity = settingsUtils.normalizeDensity(settings);
    compactnessSlider.value = currentDensity.messageCompactness;
    compactnessValue.textContent = currentDensity.messageCompactness;
    lineHeightSlider.value = currentDensity.messageLineHeight;
    lineHeightValue.textContent = currentDensity.messageLineHeight.toFixed(2);
    paragraphSpacingSlider.value = currentDensity.messageParagraphSpacing;
    paragraphSpacingValue.textContent = currentDensity.messageParagraphSpacing;
    syncAllRangeProgress();
    updateDensitySummary();
}

function applyFontSizeUi(settings) {
    if (typeof settings.messageFontSize === 'number') {
        currentFontSize = settings.messageFontSize;
    }
    fontSizeSlider.value = currentFontSize;
    fontSizeValue.textContent = currentFontSize;
    syncRangeProgress(fontSizeSlider);
}

function updateDensitySummary() {
    const custom = t('customSpacing', 'Custom');
    const auto = t('autoSpacing', 'Auto');
    densitySummary.textContent = currentDensity.messageSpacingCustom ? custom : auto;
}

const STORAGE_KEYS = [
    'widthEnabled',
    'chatWidth',
    'chatWidthSetting',
    'codeWrap',
    'userFullWidth',
    'widthMin',
    'widthMax',
    'widthPercentMin',
    'widthPercentMax',
    'presetsByUnit',
    'presets',
    'messageCompactness',
    'messageLineHeight',
    'messageParagraphSpacing',
    'messageSpacingCustom',
    'messageFontSize',
    'uiLanguage',
    settingsUtils.CHATGPT_WIDTH_KEY
];

async function initializeSettings() {
    setTaskBusy(false);
    try {
        const [result, tabs, undo] = await Promise.all([
            chrome.storage.sync.get(STORAGE_KEYS),
            chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []),
            chrome.storage.local.get(TASK_UNDO_KEY).catch(() => ({}))
        ]);
        const settings = normalizeStorage(result);
        widthSettingsBySite = {
            gemini: settingsUtils.normalizeSiteWidthSettings(result, 'gemini'),
            chatgpt: settingsUtils.normalizeSiteWidthSettings(result, 'chatgpt')
        };
        const activeSite = getTabSite(tabs[0]);
        const savedSite = new URLSearchParams(window.location.search).get('site');
        selectedSite = savedSite === 'gemini' || savedSite === 'chatgpt' ? savedSite : activeSite || 'gemini';

        // 等语言、站点与存储全部就绪再开放控件，避免初始化覆盖用户操作。
        await loadLanguageDictionary(settings.uiLanguage);
        localizeHtmlPage();
        siteButtons.forEach(button => {
            const marker = button.querySelector('.site-current');
            if (marker) {
                marker.hidden = button.dataset.site !== activeSite;
                marker.textContent = t('currentSite', 'Current');
            }
        });
        uiLanguageSelect.value = settings.uiLanguage;
        applyWidthUi(widthSettingsBySite[selectedSite]);
        applyDensityUi(settings);
        applyFontSizeUi(settings);
        codeWrapToggle.checked = settings.codeWrap;
        updateCodeWrapStatus(settings.codeWrap);
        userFullWidthToggle.checked = settings.userFullWidth;
        updateUserFullWidthStatus(settings.userFullWidth);
        taskUndoSettings = undo[TASK_UNDO_KEY] || null;
        updateSiteUi();
        if (result.uiLanguage === undefined) {
            await queueSettingsWrite({ uiLanguage: settings.uiLanguage });
        }
        settingsLoaded = true;
        setTaskBusy(false);
    } catch (error) {
        showSaveError(error);
    }
}

initializeSettings();

function onRangeInput(isMin) {
    if (isEditMode) savePresetEdits();
    const isPercent = currentWidthSetting.unit === settingsUtils.UNIT_PERCENT;

    if (isPercent) {
        let minVal = parseInt(widthMinInput.value, 10) || PERCENT_RANGE_MIN;
        let maxVal = parseInt(widthMaxInput.value, 10) || PERCENT_RANGE_MAX;
        minVal = clamp(minVal, PERCENT_RANGE_MIN, PERCENT_RANGE_MAX);
        maxVal = clamp(maxVal, PERCENT_RANGE_MIN, PERCENT_RANGE_MAX);
        if (minVal >= maxVal) {
            if (isMin) {
                minVal = Math.min(minVal, PERCENT_RANGE_MAX - 1);
                maxVal = minVal + 1;
            } else {
                maxVal = Math.max(maxVal, PERCENT_RANGE_MIN + 1);
                minVal = maxVal - 1;
            }
        }
        widthMinInput.value = minVal;
        widthMaxInput.value = maxVal;
        currentWidthPercentMin = minVal;
        currentWidthPercentMax = maxVal;
    } else {
        let minVal = parseInt(widthMinInput.value, 10) || RANGE_MIN;
        let maxVal = parseInt(widthMaxInput.value, 10) || RANGE_MAX;
        minVal = clamp(minVal, RANGE_MIN, RANGE_MAX);
        maxVal = clamp(maxVal, RANGE_MIN, RANGE_MAX);
        if (minVal >= maxVal) {
            if (isMin) {
                minVal = Math.min(minVal, RANGE_MAX - settingsUtils.PX_RANGE.step);
                maxVal = minVal + settingsUtils.PX_RANGE.step;
            } else {
                maxVal = Math.max(maxVal, RANGE_MIN + settingsUtils.PX_RANGE.step);
                minVal = maxVal - settingsUtils.PX_RANGE.step;
            }
        }
        widthMinInput.value = minVal;
        widthMaxInput.value = maxVal;
        currentWidthMin = minVal;
        currentWidthMax = maxVal;
    }

    const settings = getCurrentWidthSettings();
    applyWidthUi(settings);
    updateWidthSetting(settings.chatWidthSetting);
}

widthMinInput.addEventListener('change', () => onRangeInput(true));
widthMaxInput.addEventListener('change', () => onRangeInput(false));

widthSlider.addEventListener('input', function () {
    const value = parseFloat(this.value);
    currentWidthSetting = { value, unit: currentWidthSetting.unit };
    widthValue.textContent = value;
    syncRangeProgress(this);
    if (!isEditMode) {
        renderPresetButtons(currentPresets, currentWidthMin, currentWidthMax, currentWidthSetting);
    }

    if (widthUpdateTimer) clearTimeout(widthUpdateTimer);
    widthUpdateTimer = setTimeout(() => {
        widthUpdateTimer = null;
        updateWidthSetting(currentWidthSetting);
    }, 500);
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
        const fallbackValue = getUnitFallbackValue(unit);
        const next = settingsUtils.normalizeWidthSetting({ value: fallbackValue, unit }, {
            widthMin: currentWidthMin,
            widthMax: currentWidthMax,
            widthPercentMin: currentWidthPercentMin,
            widthPercentMax: currentWidthPercentMax
        });
        currentWidthSetting = next;
        applyWidthUi({
            widthMin: currentWidthMin,
            widthMax: currentWidthMax,
            widthPercentMin: currentWidthPercentMin,
            widthPercentMax: currentWidthPercentMax,
            chatWidthSetting: next
        });
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
        const unit = currentWidthSetting.unit;
        return settingsUtils.normalizePreset({ id: p.id, nameKey: p.nameKey, name: p.name, value, unit }, i, {
            widthMin: currentWidthMin,
            widthMax: currentWidthMax,
            widthPercentMin: currentWidthPercentMin,
            widthPercentMax: currentWidthPercentMax
        });
    });
    setPresetGroup(currentWidthSetting.unit, nextPresets);
    saveWidthSettings().catch(showSaveError);
    isEditMode = false;
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
    }, {
        widthMin: currentWidthMin,
        widthMax: currentWidthMax,
        widthPercentMin: currentWidthPercentMin,
        widthPercentMax: currentWidthPercentMax
    });
    if (setting.unit !== currentWidthSetting.unit) {
        currentWidthSetting = setting;
        applyWidthUi({
            widthMin: currentWidthMin,
            widthMax: currentWidthMax,
            widthPercentMin: currentWidthPercentMin,
            widthPercentMax: currentWidthPercentMax,
            chatWidthSetting: setting
        });
    } else {
        widthSlider.value = setting.value;
        widthValue.textContent = setting.value;
        currentWidthSetting = setting;
        syncRangeProgress(widthSlider);
        renderPresetButtons(currentPresets, currentWidthMin, currentWidthMax, currentWidthSetting);
    }
    updateWidthSetting(setting);
});

compactnessSlider.addEventListener('input', function () {
    syncRangeProgress(this);
    const derived = settingsUtils.deriveDensityFromCompactness(parseInt(this.value, 10));
    currentDensity = {
        ...derived,
        messageSpacingCustom: false
    };
    applyDensityUi(currentDensity);

    if (densityUpdateTimer) clearTimeout(densityUpdateTimer);
    densityUpdateTimer = setTimeout(() => {
        densityUpdateTimer = null;
        updateDensity({ ...currentDensity, messageFontSize: currentFontSize });
    }, 500);
});

advancedDensityToggle.addEventListener('click', function () {
    const open = advancedDensityBody.hidden;
    advancedDensityBody.hidden = !open;
    advancedDensityToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
});

[lineHeightSlider, paragraphSpacingSlider].forEach(input => {
    input.addEventListener('input', function () {
        syncRangeProgress(this);
        currentDensity = settingsUtils.normalizeDensity({
            messageCompactness: parseInt(compactnessSlider.value, 10),
            messageLineHeight: parseFloat(lineHeightSlider.value),
            messageParagraphSpacing: parseInt(paragraphSpacingSlider.value, 10),
            messageSpacingCustom: true
        });
        applyDensityUi(currentDensity);
        updateDensity({ ...currentDensity, messageFontSize: currentFontSize });
    });
});

fontSizeSlider.addEventListener('input', function () {
    syncRangeProgress(this);
    currentFontSize = parseInt(this.value, 10);
    fontSizeValue.textContent = currentFontSize;

    if (densityUpdateTimer) clearTimeout(densityUpdateTimer);
    densityUpdateTimer = setTimeout(() => {
        densityUpdateTimer = null;
        updateDensity({ ...currentDensity, messageFontSize: currentFontSize });
    }, 500);
});

[compactnessSlider, fontSizeSlider].forEach(input => {
    input.addEventListener('change', function () {
        updateDensity({ ...currentDensity, messageFontSize: currentFontSize });
    });
});

resetFontSizeBtn.addEventListener('click', function () {
    currentFontSize = settingsUtils.DEFAULTS.messageFontSize;
    fontSizeSlider.value = currentFontSize;
    fontSizeValue.textContent = currentFontSize;
    syncRangeProgress(fontSizeSlider);
    updateDensity({ ...currentDensity, messageFontSize: currentFontSize });
});

resetDensityBtn.addEventListener('click', function () {
    const derived = settingsUtils.deriveDensityFromCompactness(parseInt(compactnessSlider.value, 10));
    currentDensity = {
        ...derived,
        messageSpacingCustom: false
    };
    applyDensityUi(currentDensity);
    updateDensity({ ...currentDensity, messageFontSize: currentFontSize });
});

codeWrapToggle.addEventListener('change', function () {
    const enabled = this.checked;
    updateCodeWrapStatus(enabled);
    updateCodeWrap(enabled);
});

userFullWidthToggle.addEventListener('change', function () {
    const enabled = this.checked;
    updateUserFullWidthStatus(enabled);
    updateUserFullWidth(enabled);
});

uiLanguageSelect.addEventListener('change', async function () {
    const language = settingsUtils.normalizeUiLanguage(this.value);
    if (isEditMode) savePresetEdits();
    flushPendingChanges();
    setTaskBusy(true);
    try {
        await queueSettingsWrite({ uiLanguage: language });
        // 保留手动选择的站点，重新加载 popup 以全量重渲染新语言。
        const url = new URL(window.location.href);
        url.searchParams.set('site', selectedSite);
        window.location.replace(url.href);
    } catch (error) {
        showSaveError(error);
        setTaskBusy(false);
    }
});

function updateCodeWrapStatus(enabled) {
    const statusOn = t("statusOn", "On");
    const statusOff = t("statusOff", "Off");
    codeWrapStatus.textContent = enabled ? statusOn : statusOff;
}

function updateUserFullWidthStatus(enabled) {
    const statusOn = t("statusOn", "On");
    const statusOff = t("statusOff", "Off");
    userFullWidthStatus.textContent = enabled ? statusOn : statusOff;
}

// 消息目标在提交时固定；只在确认内容脚本缺失时回退为刷新页面。
function notifySiteTabs(site, message) {
    const action = message.action === 'updateWidthSetting' || message.action === 'updateWidthEnabled'
        ? 'width' : message.action;
    const key = `${site}:${action}`;
    latestSiteMessages.set(key, message);
    return chrome.tabs.query({ url: settingsUtils.SITE_MATCHES[site] }).then(tabs => {
        if (latestSiteMessages.get(key) !== message) return;
        return Promise.all(tabs.map(tab => {
            if (tab.discarded) return;

            return chrome.tabs.sendMessage(tab.id, message).catch(error => {
                if (/Receiving end does not exist/i.test(error.message || String(error))) {
                    showRefreshNotice();
                    chrome.tabs.reload(tab.id).catch(() => {});
                }
            });
        }));
    }).catch(error => console.error('[Wider Gemini] Could not query site tabs:', error));
}

function notifyGeminiTabs(message) {
    notifySiteTabs('gemini', message);
}

function updateWidthSetting(setting) {
    clearTimeout(widthUpdateTimer);
    widthUpdateTimer = null;
    currentWidthSetting = settingsUtils.normalizeWidthSetting(setting, getTaskRanges());
    const site = selectedSite;
    const message = {
        action: 'updateWidthSetting',
        setting: { ...currentWidthSetting },
        ranges: getTaskRanges(),
        enabled: currentWidthEnabled
    };
    saveWidthSettings().then(() => notifySiteTabs(site, message)).catch(showSaveError);
}

function updateDensity(settings) {
    clearTimeout(densityUpdateTimer);
    densityUpdateTimer = null;
    const normalized = settingsUtils.normalizeDensity(settings);
    const fontSize = settingsUtils.normalizeFontSize(settings.messageFontSize);
    const payload = { ...normalized, messageFontSize: fontSize };
    queueSettingsWrite(payload).then(() => notifyGeminiTabs({
        action: 'updateDensity',
        settings: payload
    })).catch(showSaveError);
}

function updateCodeWrap(enabled) {
    queueSettingsWrite({ codeWrap: enabled }).then(() => notifyGeminiTabs({
        action: 'updateCodeWrap',
        enabled: enabled
    })).catch(showSaveError);
}

function updateUserFullWidth(enabled) {
    queueSettingsWrite({ userFullWidth: enabled }).then(() => notifyGeminiTabs({
        action: 'updateUserFullWidth',
        enabled: enabled
    })).catch(showSaveError);
}
