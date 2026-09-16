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
        "codeWrapLabel", "infoText1", "infoText2", "refreshing",
        "userFullWidthLabel",
        "widthUnit", "densityLabel", "compactnessUnit", "advancedDensity",
        "lineHeightLabel", "paragraphSpacingLabel", "resetDensity",
        "fontSizeLabel", "resetFontSize",
        "customSpacing", "autoSpacing",
        "uiLanguageLabel", "uiLanguageAuto"
    ];

    ids.forEach(id => {
        const element = document.getElementById("i18n-" + id);
        if (element) {
            element.textContent = t(id);
        }
    });
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

function getPresetStoragePayload() {
    return {
        presetsByUnit: currentPresetsByUnit,
        presets: currentPresetsByUnit[settingsUtils.UNIT_PX]
    };
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
        btn.innerHTML = `<span class="btn-icon">${icon}</span><span class="btn-text">${name}</span><span class="btn-value">${formatWidthValue(preset)}</span>`;
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
            <span class="preset-edit-label" title="${name.replace(/"/g, '&quot;')}">${name}</span>
            <input type="number" class="preset-edit-width" data-index="${i}" value="${preset.value}" min="${range.min}" max="${range.max}" step="${range.step}">
            <span class="preset-edit-unit" data-index="${i}">${getUnitLabel(currentWidthSetting.unit)}</span>
        `;
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
        const unit = currentWidthSetting.unit;
        const value = widthInput ? parseFloat(widthInput.value) : p.value;
        return settingsUtils.normalizePreset({ id: p.id, nameKey: p.nameKey, name: name || undefined, value, unit }, i, {
            widthMin: currentWidthMin,
            widthMax: currentWidthMax,
            widthPercentMin: currentWidthPercentMin,
            widthPercentMax: currentWidthPercentMax
        });
    });
    setPresetGroup(currentWidthSetting.unit, nextPresets);
    chrome.storage.sync.set(getPresetStoragePayload());
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
            <input type="text" class="manage-name" value="${displayName.replace(/"/g, '&quot;')}" placeholder="${defaultName}" data-index="${i}">
            <input type="number" class="manage-width" value="${preset.value}" min="${range.min}" max="${range.max}" step="${range.step}" data-index="${i}">
            <span class="manage-unit" data-index="${i}">${getUnitLabel(currentWidthSetting.unit)}</span>
            <button type="button" class="secondary-btn reset-preset-btn" data-index="${i}">${t('resetToDefault', '重置为默认')}</button>
        `;
        const nameInput = row.querySelector('.manage-name');
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

let widthUpdateTimer = null;
let densityUpdateTimer = null;

let currentWidthSetting = { ...settingsUtils.DEFAULTS.chatWidthSetting };
let currentWidthMin = DEFAULTS.widthMin;
let currentWidthMax = DEFAULTS.widthMax;
let currentWidthPercentMin = settingsUtils.DEFAULTS.widthPercentMin;
let currentWidthPercentMax = settingsUtils.DEFAULTS.widthPercentMax;
let currentDensity = settingsUtils.normalizeDensity({});
let currentFontSize = settingsUtils.DEFAULTS.messageFontSize;
let currentPresetsByUnit = settingsUtils.normalizePresetGroups({}, DEFAULTS);
let currentPresets = currentPresetsByUnit[settingsUtils.UNIT_PX];

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
    widthMaxInput.max = currentWidthSetting.unit === settingsUtils.UNIT_PERCENT ? PERCENT_RANGE_MAX : RANGE_MAX;
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
    renderPresetsForMode(currentPresets);
    if (!managePresetsBody.hidden) {
        renderManagePresetsRows(currentPresets);
    }
}

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

chrome.storage.sync.get([
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
    'uiLanguage'
], function (result) {
    const settings = normalizeStorage(result);
    const needsWrite = (
        result.chatWidthSetting === undefined ||
        result.widthPercentMin === undefined ||
        result.widthPercentMax === undefined ||
        result.presetsByUnit === undefined
    );

    if (needsWrite) {
        chrome.storage.sync.set({
            chatWidthSetting: settings.chatWidthSetting,
            chatWidth: settings.legacyChatWidth,
            widthMin: settings.widthMin,
            widthMax: settings.widthMax,
            widthPercentMin: settings.widthPercentMin,
            widthPercentMax: settings.widthPercentMax,
            presetsByUnit: settings.presetsByUnit,
            presets: settings.presetsByUnit[settingsUtils.UNIT_PX],
            messageCompactness: settings.messageCompactness,
            messageLineHeight: settings.messageLineHeight,
            messageParagraphSpacing: settings.messageParagraphSpacing,
            messageSpacingCustom: settings.messageSpacingCustom,
            messageFontSize: settings.messageFontSize,
            uiLanguage: settings.uiLanguage
        });
    }

    uiLanguageSelect.value = settings.uiLanguage;

    // 手动语言覆盖时预加载字典，随后重新本地化静态文案与动态文案
    loadLanguageDictionary(settings.uiLanguage).then(function () {
        localizeHtmlPage();
        currentPresetsByUnit = settings.presetsByUnit;
        currentPresets = getPresetGroup(settings.chatWidthSetting.unit);
        applyWidthUi(settings);
        applyDensityUi(settings);
        applyFontSizeUi(settings);
        codeWrapToggle.checked = settings.codeWrap;
        updateCodeWrapStatus(settings.codeWrap);
        userFullWidthToggle.checked = settings.userFullWidth;
        updateUserFullWidthStatus(settings.userFullWidth);
    });
});

function onRangeInput(isMin) {
    const isPercent = currentWidthSetting.unit === settingsUtils.UNIT_PERCENT;

    if (isPercent) {
        let minVal = parseInt(widthMinInput.value, 10) || PERCENT_RANGE_MIN;
        let maxVal = parseInt(widthMaxInput.value, 10) || PERCENT_RANGE_MAX;
        minVal = clamp(minVal, PERCENT_RANGE_MIN, PERCENT_RANGE_MAX);
        maxVal = clamp(maxVal, PERCENT_RANGE_MIN, PERCENT_RANGE_MAX);
        if (minVal >= maxVal) {
            if (isMin) maxVal = minVal + 1;
            else minVal = maxVal - 1;
            minVal = clamp(minVal, PERCENT_RANGE_MIN, PERCENT_RANGE_MAX);
            maxVal = clamp(maxVal, PERCENT_RANGE_MIN, PERCENT_RANGE_MAX);
        }
        widthMinInput.value = minVal;
        widthMaxInput.value = maxVal;
        currentWidthPercentMin = minVal;
        currentWidthPercentMax = maxVal;
        chrome.storage.sync.set({ widthPercentMin: minVal, widthPercentMax: maxVal });
    } else {
        let minVal = parseInt(widthMinInput.value, 10) || RANGE_MIN;
        let maxVal = parseInt(widthMaxInput.value, 10) || RANGE_MAX;
        minVal = clamp(minVal, RANGE_MIN, RANGE_MAX);
        maxVal = clamp(maxVal, RANGE_MIN, RANGE_MAX);
        if (minVal >= maxVal) {
            if (isMin) maxVal = minVal + 100;
            else minVal = maxVal - 100;
            minVal = clamp(minVal, RANGE_MIN, RANGE_MAX);
            maxVal = clamp(maxVal, RANGE_MIN, RANGE_MAX);
        }
        widthMinInput.value = minVal;
        widthMaxInput.value = maxVal;
        currentWidthMin = minVal;
        currentWidthMax = maxVal;
        chrome.storage.sync.set({ widthMin: minVal, widthMax: maxVal });
    }

    const range = getActiveRange();
    widthSlider.min = range.min;
    widthSlider.max = range.max;
    const next = settingsUtils.normalizeWidthSetting(currentWidthSetting, {
        widthMin: currentWidthMin,
        widthMax: currentWidthMax,
        widthPercentMin: currentWidthPercentMin,
        widthPercentMax: currentWidthPercentMax
    });
    currentWidthSetting = next;
    widthSlider.value = next.value;
    widthValue.textContent = next.value;
    syncRangeProgress(widthSlider);
    renderPresetsForMode(currentPresets);
    updateWidthSetting(next);
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
        updateWidthSetting(currentWidthSetting);
    }, 500);
});

[unitPxBtn, unitPercentBtn].forEach(btn => {
    btn.addEventListener('click', function () {
        const unit = this.dataset.unit;
        if (unit === currentWidthSetting.unit) return;
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
donePresetsBtn.addEventListener('click', function () {
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
    chrome.storage.sync.set(getPresetStoragePayload());
    isEditMode = false;
    editPresetsBtn.style.display = 'inline-block';
    donePresetsBtn.style.display = 'none';
    renderPresetButtons(nextPresets, currentWidthMin, currentWidthMax, currentWidthSetting);
});

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
        updateDensity({ ...currentDensity, messageFontSize: currentFontSize });
    }, 500);
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

uiLanguageSelect.addEventListener('change', function () {
    const language = settingsUtils.normalizeUiLanguage(this.value);
    chrome.storage.sync.set({ uiLanguage: language }, function () {
        // 重新加载 popup 以全量重渲染新语言
        window.location.reload();
    });
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

// 把设置变更实时推送给所有 Gemini 页面（含已安装的应用窗口）；
// 只有页面收不到消息（内容脚本不在）时才回退为刷新该页面
function notifyGeminiTabs(message) {
    chrome.tabs.query({ url: 'https://gemini.google.com/*' }, function (tabs) {
        tabs.forEach(tab => {
            if (tab.discarded) return;

            chrome.tabs.sendMessage(tab.id, message).catch(() => {
                showRefreshNotice();
                chrome.tabs.reload(tab.id);
            });
        });
    });
}

function updateWidthSetting(setting) {
    const normalized = settingsUtils.normalizeWidthSetting(setting, {
        widthMin: currentWidthMin,
        widthMax: currentWidthMax,
        widthPercentMin: currentWidthPercentMin,
        widthPercentMax: currentWidthPercentMax
    });

    currentWidthSetting = normalized;
    chrome.storage.sync.set({
        chatWidthSetting: normalized,
        chatWidth: settingsUtils.getLegacyChatWidth(normalized)
    });

    notifyGeminiTabs({
        action: 'updateWidthSetting',
        setting: normalized,
        ranges: {
            widthMin: currentWidthMin,
            widthMax: currentWidthMax,
            widthPercentMin: currentWidthPercentMin,
            widthPercentMax: currentWidthPercentMax
        }
    });
}

function updateDensity(settings) {
    const normalized = settingsUtils.normalizeDensity(settings);
    const fontSize = settingsUtils.normalizeFontSize(settings.messageFontSize);
    const payload = { ...normalized, messageFontSize: fontSize };
    chrome.storage.sync.set(payload);

    notifyGeminiTabs({
        action: 'updateDensity',
        settings: payload
    });
}

function updateCodeWrap(enabled) {
    chrome.storage.sync.set({ codeWrap: enabled });

    notifyGeminiTabs({
        action: 'updateCodeWrap',
        enabled: enabled
    });
}

function updateUserFullWidth(enabled) {
    chrome.storage.sync.set({ userFullWidth: enabled });

    notifyGeminiTabs({
        action: 'updateUserFullWidth',
        enabled: enabled
    });
}
