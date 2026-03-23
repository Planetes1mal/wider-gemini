function localizeHtmlPage() {
    const ids = [
        "appName", "headerSubtitle", "widthLabel", "widthMin", "widthMax",
        "btnNarrow", "btnDefault", "btnWider", "btnUltra", "btnInsane",
        "editPresets", "donePresets", "cancelPresets", "managePresets", "managePresetsSummary", "resetToDefault",
        "codeWrapLabel", "infoText1", "infoText2", "refreshing"
    ];
    
    ids.forEach(id => {
        const element = document.getElementById("i18n-" + id);
        if (element) {
            element.textContent = chrome.i18n.getMessage(id);
        }
    });
}

localizeHtmlPage();

const DEFAULTS = {
    widthMin: 700,
    widthMax: 2000,
    chatWidth: 1000,
    presets: [
        { id: 'p1', nameKey: 'btnNarrow', width: 800 },
        { id: 'p2', nameKey: 'btnDefault', width: 1000 },
        { id: 'p3', nameKey: 'btnWider', width: 1200 },
        { id: 'p4', nameKey: 'btnUltra', width: 1350 },
        { id: 'p5', nameKey: 'btnInsane', width: 2000 }
    ]
};
const RANGE_MIN = 300;
const RANGE_MAX = 5000;

const PRESET_ICONS = ['📱', '💻', '🖥️', '📺', '⚠️'];

function getPresetName(preset) {
    return preset.name || (preset.nameKey ? chrome.i18n.getMessage(preset.nameKey) : '');
}

function renderPresetButtons(presets, widthMin, widthMax, currentWidth) {
    const container = document.getElementById('presetButtonsContainer');
    if (!container) return;
    container.innerHTML = '';
    (presets || currentPresets).forEach((preset, i) => {
        const w = clamp(preset.width, widthMin, widthMax);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preset-btn';
        btn.dataset.width = preset.width;
        const name = getPresetName(preset);
        const icon = PRESET_ICONS[i] || '📐';
        btn.innerHTML = `<span class="btn-icon">${icon}</span><span class="btn-text">${name}</span><span class="btn-value">${preset.width} px</span>`;
        const isActive = currentWidth === clamp(preset.width, widthMin, widthMax);
        if (isActive) btn.classList.add('preset-btn-active');
        container.appendChild(btn);
    });
}

let isEditMode = false;

function renderPresetButtonsEditMode(presets, widthMin, widthMax) {
    const container = document.getElementById('presetButtonsContainer');
    if (!container) return;
    container.innerHTML = '';
    (presets || currentPresets).forEach((preset, i) => {
        const row = document.createElement('div');
        row.className = 'preset-edit-row';
        const name = getPresetName(preset);
        row.innerHTML = `
            <span class="preset-edit-label">${name}</span>
            <input type="number" class="preset-edit-width" data-index="${i}" value="${preset.width}" min="${widthMin}" max="${widthMax}" step="50">
            <span class="preset-edit-unit">px</span>
        `;
        const input = row.querySelector('.preset-edit-width');
        input.addEventListener('blur', function () {
            let v = parseInt(this.value, 10);
            const clamped = clamp(v, widthMin, widthMax);
            if (v !== clamped) {
                this.value = clamped;
                showClampedHint();
            }
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                let v = parseInt(this.value, 10);
                const clamped = clamp(v, widthMin, widthMax);
                this.value = clamped;
                if (v !== clamped) showClampedHint();
                this.blur();
            }
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
    el.textContent = chrome.i18n.getMessage('clampedHint') || '已限制在范围内';
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
        const w = widthInput ? clamp(parseInt(widthInput.value, 10) || p.width, currentWidthMin, currentWidthMax) : p.width;
        return { id: p.id, nameKey: p.nameKey, name: name || undefined, width: w };
    });
    currentPresets = nextPresets;
    chrome.storage.sync.set({ presets: nextPresets });
    renderPresetButtons(nextPresets, currentWidthMin, currentWidthMax, parseInt(widthSlider.value, 10));
    document.getElementById('managePresetsSummary').textContent = chrome.i18n.getMessage('managePresetsSummary') || '已自定义 5 个预设';
}

function renderManagePresetsRows(presets) {
    const container = document.getElementById('managePresetsRows');
    const body = document.getElementById('managePresetsBody');
    if (!container) return;
    container.innerHTML = '';
    (presets || currentPresets).forEach((preset, i) => {
        const row = document.createElement('div');
        row.className = 'manage-row';
        const defaultName = chrome.i18n.getMessage(preset.nameKey || DEFAULTS.presets[i].nameKey) || '';
        const displayName = preset.name != null && preset.name !== '' ? preset.name : defaultName;
        row.innerHTML = `
            <input type="text" class="manage-name" value="${displayName.replace(/"/g, '&quot;')}" placeholder="${defaultName}" data-index="${i}">
            <input type="number" class="manage-width" value="${preset.width}" min="${currentWidthMin}" max="${currentWidthMax}" step="50" data-index="${i}">
            <button type="button" class="secondary-btn reset-preset-btn" data-index="${i}">${chrome.i18n.getMessage('resetToDefault') || '重置为默认'}</button>
        `;
        const nameInput = row.querySelector('.manage-name');
        const widthInput = row.querySelector('.manage-width');
        const save = () => saveManagePresetsFromRows();
        nameInput.addEventListener('blur', save);
        widthInput.addEventListener('blur', function () {
            const v = clamp(parseInt(this.value, 10), currentWidthMin, currentWidthMax);
            this.value = v;
            save();
        });
        row.querySelector('.reset-preset-btn').addEventListener('click', function () {
            const def = DEFAULTS.presets[i];
            nameInput.value = chrome.i18n.getMessage(def.nameKey) || '';
            widthInput.value = def.width;
            save();
        });
        container.appendChild(row);
    });
    document.getElementById('managePresetsSummary').textContent = chrome.i18n.getMessage('managePresetsSummary') || '已自定义 5 个预设';
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
    let widthMin = result.widthMin;
    let widthMax = result.widthMax;
    let presets = result.presets;
    if (typeof widthMin !== 'number' || widthMin < RANGE_MIN || widthMin > RANGE_MAX) {
        widthMin = DEFAULTS.widthMin;
    }
    if (typeof widthMax !== 'number' || widthMax < RANGE_MIN || widthMax > RANGE_MAX) {
        widthMax = DEFAULTS.widthMax;
    }
    if (!Array.isArray(presets) || presets.length !== 5) {
        presets = DEFAULTS.presets.map(p => ({ ...p }));
    } else {
        presets = presets.map((p, i) => {
            const def = DEFAULTS.presets[i];
            return {
                id: p.id || def.id,
                nameKey: p.nameKey || def.nameKey,
                name: p.name,
                width: typeof p.width === 'number' ? p.width : def.width
            };
        });
    }
    const chatWidth = typeof result.chatWidth === 'number' ? result.chatWidth : DEFAULTS.chatWidth;
    const codeWrap = result.codeWrap !== undefined ? result.codeWrap : false;
    return { widthMin, widthMax, chatWidth, codeWrap, presets };
}

const widthSlider = document.getElementById('widthSlider');
const widthValue = document.getElementById('widthValue');
const widthMinInput = document.getElementById('widthMinInput');
const widthMaxInput = document.getElementById('widthMaxInput');
const codeWrapToggle = document.getElementById('codeWrapToggle');
const codeWrapStatus = document.getElementById('codeWrapStatus');
const refreshNotice = document.getElementById('refreshNotice');

let widthUpdateTimer = null;

function showRefreshNotice() {
    refreshNotice.classList.add('show');
    setTimeout(() => {
        refreshNotice.classList.remove('show');
    }, 2000);
}

function hideRefreshNotice() {
    refreshNotice.classList.remove('show');
}

let currentWidthMin = DEFAULTS.widthMin;
let currentWidthMax = DEFAULTS.widthMax;
let currentPresets = DEFAULTS.presets.map(p => ({ ...p }));

function applyRangeAndWidth(widthMin, widthMax, chatWidth) {
    const w = clamp(chatWidth, widthMin, widthMax);
    widthMinInput.value = widthMin;
    widthMaxInput.value = widthMax;
    widthSlider.min = widthMin;
    widthSlider.max = widthMax;
    widthSlider.value = w;
    widthValue.textContent = w;
    if (w !== chatWidth) {
        chrome.storage.sync.set({ chatWidth: w });
    }
    currentWidthMin = widthMin;
    currentWidthMax = widthMax;
    return w;
}

chrome.storage.sync.get(['chatWidth', 'codeWrap', 'widthMin', 'widthMax', 'presets'], function (result) {
    const normalized = normalizeStorage(result);
    let { widthMin, widthMax, chatWidth, codeWrap, presets } = normalized;

    const needsWrite = (
        result.widthMin === undefined || result.widthMax === undefined ||
        !Array.isArray(result.presets) || result.presets.length !== 5
    );
    if (needsWrite) {
        chrome.storage.sync.set({ widthMin, widthMax, presets });
    }

    currentPresets = presets;
    chatWidth = applyRangeAndWidth(widthMin, widthMax, chatWidth);
    codeWrapToggle.checked = codeWrap;
    updateCodeWrapStatus(codeWrap);
    renderPresetButtons(presets, widthMin, widthMax, chatWidth);
});

function onRangeInput(isMin) {
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
    const curWidth = parseInt(widthSlider.value, 10);
    const newWidth = clamp(curWidth, minVal, maxVal);
    widthSlider.min = minVal;
    widthSlider.max = maxVal;
    widthSlider.value = newWidth;
    widthValue.textContent = newWidth;
    chrome.storage.sync.set({ widthMin: minVal, widthMax: maxVal, chatWidth: newWidth });
    currentWidthMin = minVal;
    currentWidthMax = maxVal;
    if (newWidth !== curWidth) {
        updateWidth(newWidth);
    }
    renderPresetButtons(currentPresets, minVal, maxVal, newWidth);
}

widthMinInput.addEventListener('change', () => onRangeInput(true));
widthMaxInput.addEventListener('change', () => onRangeInput(false));

widthSlider.addEventListener('input', function () {
    const width = parseInt(this.value, 10);
    widthValue.textContent = width;
    renderPresetButtons(currentPresets, currentWidthMin, currentWidthMax, width);

    if (widthUpdateTimer) clearTimeout(widthUpdateTimer);
    widthUpdateTimer = setTimeout(() => {
        updateWidth(width);
    }, 500);
});

const editPresetsBtn = document.getElementById('editPresetsBtn');
const donePresetsBtn = document.getElementById('donePresetsBtn');
editPresetsBtn.addEventListener('click', function () {
    isEditMode = true;
    editPresetsBtn.style.display = 'none';
    donePresetsBtn.style.display = 'inline-block';
    renderPresetButtonsEditMode(currentPresets, currentWidthMin, currentWidthMax);
});
donePresetsBtn.addEventListener('click', function () {
    const inputs = document.querySelectorAll('.preset-edit-width');
    const nextPresets = currentPresets.map((p, i) => {
        const input = inputs[i];
        const w = input ? clamp(parseInt(input.value, 10) || p.width, currentWidthMin, currentWidthMax) : p.width;
        return { id: p.id, nameKey: p.nameKey, name: p.name, width: w };
    });
    currentPresets = nextPresets;
    chrome.storage.sync.set({ presets: nextPresets });
    isEditMode = false;
    editPresetsBtn.style.display = 'inline-block';
    donePresetsBtn.style.display = 'none';
    const curWidth = parseInt(widthSlider.value, 10);
    renderPresetButtons(nextPresets, currentWidthMin, currentWidthMax, curWidth);
});

document.getElementById('presetButtonsContainer').addEventListener('click', function (e) {
    if (isEditMode) return;
    const btn = e.target.closest('.preset-btn');
    if (!btn || !btn.dataset.width) return;
    const width = clamp(parseInt(btn.dataset.width, 10), currentWidthMin, currentWidthMax);
    widthSlider.value = width;
    widthValue.textContent = width;
    chrome.storage.sync.set({ chatWidth: width });
    updateWidth(width);
    renderPresetButtons(currentPresets, currentWidthMin, currentWidthMax, width);
});

codeWrapToggle.addEventListener('change', function () {
    const enabled = this.checked;
    updateCodeWrapStatus(enabled);
    updateCodeWrap(enabled);
});

function updateCodeWrapStatus(enabled) {
    const statusOn = chrome.i18n.getMessage("statusOn");
    const statusOff = chrome.i18n.getMessage("statusOff");
    codeWrapStatus.textContent = enabled ? statusOn : statusOff;
}

function updateWidth(width) {
    chrome.storage.sync.set({ chatWidth: width });
    showRefreshNotice();

    chrome.tabs.query({ url: 'https://gemini.google.com/*' }, function (tabs) {
        if (tabs.length === 0) {
            hideRefreshNotice();
            return;
        }

        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                action: 'updateWidth',
                width: width
            }).catch(err => {
                // Ignore error
            });

            setTimeout(() => {
                chrome.tabs.reload(tab.id);
            }, 100);
        });
    });
}

function updateCodeWrap(enabled) {
    chrome.storage.sync.set({ codeWrap: enabled });
    showRefreshNotice();

    chrome.tabs.query({ url: 'https://gemini.google.com/*' }, function (tabs) {
        if (tabs.length === 0) {
            hideRefreshNotice();
            return;
        }

        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                action: 'updateCodeWrap',
                enabled: enabled
            }).catch(err => {
                // Ignore error
            });

            setTimeout(() => {
                chrome.tabs.reload(tab.id);
            }, 100);
        });
    });
}
