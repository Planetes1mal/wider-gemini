const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const utilsPath = path.join(__dirname, '..', 'settings-utils.js');
const source = fs.readFileSync(utilsPath, 'utf8');
const sandbox = { console, Object, Array, Number, Math, parseInt, parseFloat, isFinite: Number.isFinite };
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'settings-utils.js' });

const utils = sandbox.widerGeminiSettings;
assert.ok(utils, 'settings utils are exposed');

{
    const normalized = utils.normalizeStorage({
        chatWidth: 1350,
        presets: [
            { id: 'p1', nameKey: 'btnNarrow', width: 800 },
            { id: 'p2', nameKey: 'btnDefault', width: 1000 },
            { id: 'p3', nameKey: 'btnWider', width: 1200 },
            { id: 'p4', nameKey: 'btnUltra', width: 1350 },
            { id: 'p5', nameKey: 'btnInsane', width: 2000 }
        ]
    });

    assert.strictEqual(normalized.chatWidthSetting.value, 1350);
    assert.strictEqual(normalized.chatWidthSetting.unit, 'px');
    assert.strictEqual(normalized.presets[0].value, 800);
    assert.strictEqual(normalized.presets[0].unit, 'px');
    assert.strictEqual(normalized.presetsByUnit.px[3].value, 1350);
    assert.strictEqual(normalized.presetsByUnit.percent[1].value, 70);
    assert.strictEqual(normalized.presetsByUnit.percent[1].unit, 'percent');
    assert.strictEqual(normalized.legacyChatWidth, 1350);
}

{
    const normalized = utils.normalizeStorage({
        chatWidthSetting: { value: 125, unit: 'percent' },
        widthPercentMin: 40,
        widthPercentMax: 95
    });

    assert.strictEqual(normalized.chatWidthSetting.value, 95);
    assert.strictEqual(normalized.chatWidthSetting.unit, 'percent');
    assert.strictEqual(utils.getWidthCssValue(normalized.chatWidthSetting), '95vw');
    assert.strictEqual(normalized.legacyChatWidth, 1000);
}

{
    const normalized = utils.normalizeStorage({
        presetsByUnit: {
            px: [
                { id: 'p1', nameKey: 'btnNarrow', value: 800, unit: 'px' },
                { id: 'p2', nameKey: 'btnDefault', value: 1000, unit: 'px' },
                { id: 'p3', nameKey: 'btnWider', value: 1200, unit: 'px' },
                { id: 'p4', nameKey: 'btnUltra', value: 1350, unit: 'px' },
                { id: 'p5', nameKey: 'btnInsane', value: 9000, unit: 'px' }
            ],
            percent: [
                { id: 'p1', name: 'Small', value: 40, unit: 'percent' },
                { id: 'p2', nameKey: 'btnDefault', value: 70, unit: 'percent' },
                { id: 'p3', nameKey: 'btnWider', value: 80, unit: 'percent' },
                { id: 'p4', nameKey: 'btnUltra', value: 90, unit: 'percent' },
                { id: 'p5', nameKey: 'btnInsane', value: 125, unit: 'percent' }
            ]
        }
    });

    assert.strictEqual(normalized.presetsByUnit.percent[0].value, 50);
    assert.strictEqual(normalized.presetsByUnit.percent[0].unit, 'percent');
    assert.strictEqual(normalized.presetsByUnit.percent[4].value, 100);
    assert.strictEqual(normalized.presetsByUnit.percent[4].unit, 'percent');
    assert.strictEqual(normalized.presetsByUnit.px[4].value, 2000);
    assert.strictEqual(normalized.presetsByUnit.px[4].unit, 'px');
}

{
    const normalized = utils.normalizeStorage({
        presets: [
            { id: 'p1', nameKey: 'btnNarrow', value: 800, unit: 'px' },
            { id: 'p2', nameKey: 'btnDefault', value: 1000, unit: 'px' },
            { id: 'p3', nameKey: 'btnWider', value: 1200, unit: 'px' },
            { id: 'p4', nameKey: 'btnUltra', value: 70, unit: 'percent' },
            { id: 'p5', nameKey: 'btnInsane', value: 2000, unit: 'px' }
        ]
    });

    assert.strictEqual(normalized.presetsByUnit.px[3].value, 1350);
    assert.strictEqual(normalized.presetsByUnit.px[3].unit, 'px');
    assert.strictEqual(normalized.presetsByUnit.percent[1].value, 70);
    assert.strictEqual(normalized.presetsByUnit.percent[3].value, 90);
}

{
    const density = utils.deriveDensityFromCompactness(50);
    assert.strictEqual(density.messageCompactness, 50);
    assert.strictEqual(density.messageLineHeight, 1.32);
    assert.strictEqual(density.messageParagraphSpacing, 7);
}

{
    const off = utils.deriveDensityFromCompactness(0);
    const low = utils.deriveDensityFromCompactness(5);
    const medium = utils.deriveDensityFromCompactness(50);
    const high = utils.deriveDensityFromCompactness(100);

    assert.strictEqual(off.messageLineHeight, 1.42);
    assert.strictEqual(off.messageParagraphSpacing, 12);
    assert.ok(low.messageLineHeight <= 1.4, 'low compactness must not be looser than Gemini native line height');
    assert.ok(low.messageParagraphSpacing < off.messageParagraphSpacing);
    assert.ok(low.messageLineHeight > medium.messageLineHeight);
    assert.ok(low.messageParagraphSpacing > medium.messageParagraphSpacing);
    assert.ok(medium.messageLineHeight > high.messageLineHeight);
    assert.ok(medium.messageParagraphSpacing > high.messageParagraphSpacing);
    assert.strictEqual(high.messageLineHeight, 1.24);
    assert.strictEqual(high.messageParagraphSpacing, 2);
}

{
    const normalized = utils.normalizeDensity({
        messageCompactness: 100,
        messageLineHeight: 4,
        messageParagraphSpacing: -5,
        messageSpacingCustom: true
    });

    assert.strictEqual(normalized.messageCompactness, 100);
    assert.strictEqual(normalized.messageLineHeight, 1.8);
    assert.strictEqual(normalized.messageParagraphSpacing, 0);
    assert.strictEqual(normalized.messageSpacingCustom, true);
}

{
    assert.strictEqual(
        utils.getWidthCssValue({ value: 1200, unit: 'px' }),
        '1200px'
    );
    assert.strictEqual(
        utils.getWidthCssValue({ value: 88, unit: 'percent' }),
        '88vw'
    );
}

console.log('settings-utils tests passed');
