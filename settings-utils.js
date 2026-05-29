(function (global) {
    'use strict';

    const UNIT_PX = 'px';
    const UNIT_PERCENT = 'percent';
    const PRESET_COUNT = 5;

    const PX_RANGE = { min: 300, max: 5000, step: 50 };
    const PERCENT_RANGE = { min: 10, max: 100, step: 1 };
    const DENSITY_DEFAULT_LINE_HEIGHT = 1.42;
    const DENSITY_DEFAULT_PARAGRAPH_SPACING = 12;
    const DENSITY_APPLIED_MAX_LINE_HEIGHT = 1.4;
    const DENSITY_APPLIED_MIN_LINE_HEIGHT = 1.24;
    const DENSITY_APPLIED_MAX_PARAGRAPH_SPACING = 11;
    const DENSITY_APPLIED_MIN_PARAGRAPH_SPACING = 2;

    const DEFAULT_PRESETS_BY_UNIT = {
        [UNIT_PX]: [
            { id: 'p1', nameKey: 'btnNarrow', value: 800, unit: UNIT_PX },
            { id: 'p2', nameKey: 'btnDefault', value: 1000, unit: UNIT_PX },
            { id: 'p3', nameKey: 'btnWider', value: 1200, unit: UNIT_PX },
            { id: 'p4', nameKey: 'btnUltra', value: 1350, unit: UNIT_PX },
            { id: 'p5', nameKey: 'btnInsane', value: 2000, unit: UNIT_PX }
        ],
        [UNIT_PERCENT]: [
            { id: 'p1', nameKey: 'btnNarrow', value: 50, unit: UNIT_PERCENT },
            { id: 'p2', nameKey: 'btnDefault', value: 70, unit: UNIT_PERCENT },
            { id: 'p3', nameKey: 'btnWider', value: 80, unit: UNIT_PERCENT },
            { id: 'p4', nameKey: 'btnUltra', value: 90, unit: UNIT_PERCENT },
            { id: 'p5', nameKey: 'btnInsane', value: 100, unit: UNIT_PERCENT }
        ]
    };

    const DEFAULTS = {
        widthMin: 700,
        widthMax: 2000,
        widthPercentMin: 50,
        widthPercentMax: 100,
        chatWidthSetting: { value: 1000, unit: UNIT_PX },
        presetsByUnit: DEFAULT_PRESETS_BY_UNIT,
        presets: DEFAULT_PRESETS_BY_UNIT[UNIT_PX],
        codeWrap: false,
        messageCompactness: 0,
        messageLineHeight: DENSITY_DEFAULT_LINE_HEIGHT,
        messageParagraphSpacing: DENSITY_DEFAULT_PARAGRAPH_SPACING,
        messageSpacingCustom: false
    };

    function clampNumber(value, min, max) {
        const number = Number(value);
        if (!Number.isFinite(number)) return min;
        return Math.min(Math.max(number, min), max);
    }

    function roundForUnit(value, unit) {
        if (unit === UNIT_PERCENT) return Math.round(value);
        return Math.round(value / PX_RANGE.step) * PX_RANGE.step;
    }

    function normalizeUnit(unit) {
        return unit === UNIT_PERCENT ? UNIT_PERCENT : UNIT_PX;
    }

    function getDefaultPresetsForUnit(unit) {
        return DEFAULT_PRESETS_BY_UNIT[normalizeUnit(unit)].map(preset => ({ ...preset }));
    }

    function normalizeRangeValue(value, fallback, range) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
        return clampNumber(value, range.min, range.max);
    }

    function normalizeRanges(result) {
        let widthMin = normalizeRangeValue(result.widthMin, DEFAULTS.widthMin, PX_RANGE);
        let widthMax = normalizeRangeValue(result.widthMax, DEFAULTS.widthMax, PX_RANGE);
        let widthPercentMin = normalizeRangeValue(
            result.widthPercentMin,
            DEFAULTS.widthPercentMin,
            PERCENT_RANGE
        );
        let widthPercentMax = normalizeRangeValue(
            result.widthPercentMax,
            DEFAULTS.widthPercentMax,
            PERCENT_RANGE
        );

        if (widthMin >= widthMax) {
            widthMin = DEFAULTS.widthMin;
            widthMax = DEFAULTS.widthMax;
        }

        if (widthPercentMin >= widthPercentMax) {
            widthPercentMin = DEFAULTS.widthPercentMin;
            widthPercentMax = DEFAULTS.widthPercentMax;
        }

        return { widthMin, widthMax, widthPercentMin, widthPercentMax };
    }

    function getRangeForUnit(ranges, unit) {
        const normalizedUnit = normalizeUnit(unit);
        if (normalizedUnit === UNIT_PERCENT) {
            return {
                min: ranges.widthPercentMin,
                max: ranges.widthPercentMax,
                step: PERCENT_RANGE.step
            };
        }

        return {
            min: ranges.widthMin,
            max: ranges.widthMax,
            step: PX_RANGE.step
        };
    }

    function normalizeWidthSetting(input, ranges) {
        let unit = UNIT_PX;
        let value = DEFAULTS.chatWidthSetting.value;

        if (input && typeof input === 'object') {
            unit = normalizeUnit(input.unit);
            value = input.value;
        } else if (typeof input === 'number') {
            value = input;
        }

        const range = getRangeForUnit(ranges, unit);
        const clamped = clampNumber(value, range.min, range.max);
        return {
            value: roundForUnit(clamped, unit),
            unit
        };
    }

    function normalizePreset(preset, index, ranges, forcedUnit) {
        const unit = forcedUnit ? normalizeUnit(forcedUnit) : normalizeUnit(preset && preset.unit);
        const defaults = DEFAULT_PRESETS_BY_UNIT[unit] || DEFAULT_PRESETS_BY_UNIT[UNIT_PX];
        const fallback = defaults[index] || defaults[0];
        const source = preset && typeof preset === 'object' ? preset : fallback;
        const valueSource = typeof source.value === 'number' ? source.value : source.width;
        const setting = normalizeWidthSetting({
            value: typeof valueSource === 'number' ? valueSource : fallback.value,
            unit
        }, ranges);

        return {
            id: source.id || fallback.id,
            nameKey: source.nameKey || fallback.nameKey,
            name: source.name,
            value: setting.value,
            unit: setting.unit
        };
    }

    function normalizePresets(presets, ranges, unit) {
        const normalizedUnit = normalizeUnit(unit);
        const defaults = DEFAULT_PRESETS_BY_UNIT[normalizedUnit] || DEFAULT_PRESETS_BY_UNIT[UNIT_PX];

        if (!Array.isArray(presets) || presets.length !== PRESET_COUNT) {
            return defaults.map((preset, index) => normalizePreset(preset, index, ranges, normalizedUnit));
        }

        return presets.map((preset, index) => {
            const sourceUnit = preset && preset.unit ? normalizeUnit(preset.unit) : normalizedUnit;
            const source = sourceUnit === normalizedUnit ? preset : defaults[index];
            return normalizePreset(source, index, ranges, normalizedUnit);
        });
    }

    function normalizePresetGroups(source, ranges) {
        const groups = source && typeof source.presetsByUnit === 'object' ? source.presetsByUnit : null;
        return {
            [UNIT_PX]: normalizePresets(groups ? groups[UNIT_PX] : source && source.presets, ranges, UNIT_PX),
            [UNIT_PERCENT]: normalizePresets(groups ? groups[UNIT_PERCENT] : undefined, ranges, UNIT_PERCENT)
        };
    }

    function deriveDensityFromCompactness(compactness) {
        const normalizedCompactness = Math.round(clampNumber(compactness, 0, 100));

        if (normalizedCompactness === 0) {
            return {
                messageCompactness: normalizedCompactness,
                messageLineHeight: DENSITY_DEFAULT_LINE_HEIGHT,
                messageParagraphSpacing: DENSITY_DEFAULT_PARAGRAPH_SPACING
            };
        }

        const ratio = normalizedCompactness / 100;
        const lineHeightRange = DENSITY_APPLIED_MAX_LINE_HEIGHT - DENSITY_APPLIED_MIN_LINE_HEIGHT;
        const paragraphRange = DENSITY_APPLIED_MAX_PARAGRAPH_SPACING - DENSITY_APPLIED_MIN_PARAGRAPH_SPACING;
        const lineHeight = Number((DENSITY_APPLIED_MAX_LINE_HEIGHT - ratio * lineHeightRange).toFixed(2));
        const paragraphSpacing = Math.round(DENSITY_APPLIED_MAX_PARAGRAPH_SPACING - ratio * paragraphRange);

        return {
            messageCompactness: normalizedCompactness,
            messageLineHeight: clampNumber(lineHeight, 1.15, 1.8),
            messageParagraphSpacing: clampNumber(paragraphSpacing, 0, 24)
        };
    }

    function normalizeDensity(result) {
        const messageCompactness = Math.round(clampNumber(result.messageCompactness, 0, 100));
        const derived = deriveDensityFromCompactness(messageCompactness);
        const custom = result.messageSpacingCustom === true;

        if (!custom) {
            return {
                ...derived,
                messageSpacingCustom: false
            };
        }

        return {
            messageCompactness,
            messageLineHeight: Number(clampNumber(result.messageLineHeight, 1.15, 1.8).toFixed(2)),
            messageParagraphSpacing: Math.round(clampNumber(result.messageParagraphSpacing, 0, 24)),
            messageSpacingCustom: true
        };
    }

    function getWidthCssValue(setting) {
        const normalizedUnit = normalizeUnit(setting && setting.unit);
        const value = setting && typeof setting.value === 'number'
            ? setting.value
            : DEFAULTS.chatWidthSetting.value;
        return normalizedUnit === UNIT_PERCENT ? `${value}vw` : `${value}px`;
    }

    function getLegacyChatWidth(setting) {
        if (setting && setting.unit === UNIT_PX && typeof setting.value === 'number') {
            return setting.value;
        }

        return DEFAULTS.chatWidthSetting.value;
    }

    function normalizeStorage(result) {
        const source = result && typeof result === 'object' ? result : {};
        const ranges = normalizeRanges(source);
        const widthSource = source.chatWidthSetting !== undefined
            ? source.chatWidthSetting
            : source.chatWidth;
        const chatWidthSetting = normalizeWidthSetting(widthSource, ranges);
        const presetsByUnit = normalizePresetGroups(source, ranges);
        const presets = presetsByUnit[chatWidthSetting.unit];
        const density = normalizeDensity(source);
        const codeWrap = source.codeWrap !== undefined ? source.codeWrap === true : DEFAULTS.codeWrap;

        return {
            ...ranges,
            chatWidthSetting,
            legacyChatWidth: getLegacyChatWidth(chatWidthSetting),
            presetsByUnit,
            presets,
            codeWrap,
            ...density
        };
    }

    global.widerGeminiSettings = {
        UNIT_PX,
        UNIT_PERCENT,
        PX_RANGE,
        PERCENT_RANGE,
        DEFAULTS,
        clampNumber,
        normalizeUnit,
        normalizeStorage,
        normalizeWidthSetting,
        normalizePreset,
        normalizePresets,
        normalizePresetGroups,
        getDefaultPresetsForUnit,
        deriveDensityFromCompactness,
        normalizeDensity,
        getRangeForUnit,
        getWidthCssValue,
        getLegacyChatWidth
    };
})(typeof globalThis !== 'undefined' ? globalThis : window);
