const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const LOCALES = ['en', 'zh_CN', 'zh_TW', 'ko', 'ja', 'es'];
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const messages = Object.fromEntries(LOCALES.map(locale =>
    [locale, JSON.parse(read(`_locales/${locale}/messages.json`))]));
const english = messages.en;
const keys = Object.keys(english);

// 六种语言的文案键必须完全一致，且没有空文案。
for (const locale of LOCALES) {
    const own = Object.keys(messages[locale]);
    assert.deepStrictEqual(own.filter(key => !english[key]), [], `${locale} has keys that English lacks`);
    assert.deepStrictEqual(keys.filter(key => !messages[locale][key]), [], `${locale} is missing keys`);
    for (const key of own) {
        assert.ok(typeof messages[locale][key].message === 'string' && messages[locale][key].message.trim(),
            `${locale}.${key} is empty`);
    }
}

// 运行时替换的占位符（如 {site}、{n}、{total}）在每种语言里都要保留。
for (const key of keys) {
    const tokens = (english[key].message.match(/\{[a-z]+\}/gi) || []).sort();
    for (const locale of LOCALES) {
        const own = (messages[locale][key].message.match(/\{[a-z]+\}/gi) || []).sort();
        assert.deepStrictEqual(own, tokens, `${locale}.${key} placeholders differ from English`);
    }
}

// 商店与 manifest 的长度限制：名称最多 75 个字符，描述最多 132 个，short_name 建议不超过 12 个。
for (const locale of LOCALES) {
    const length = key => [...messages[locale][key].message].length;
    assert.ok(length('appName') <= 75, `${locale}.appName is longer than 75 characters`);
    assert.ok(length('appDesc') <= 132, `${locale}.appDesc is longer than 132 characters`);
    assert.ok(length('brandName') <= 12, `${locale}.brandName is longer than 12 characters`);
}

// 代码引用的文案键必须存在；英文里的每个键也都要被代码用到。被扫描的是 src/ 下的全部 js 与 html 文件。
function walk(directory) {
    return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
        const relative = `${directory}/${entry.name}`;
        return entry.isDirectory() ? walk(relative) : /\.(js|html)$/.test(entry.name) ? [relative] : [];
    });
}
const sourceFiles = walk('src').sort();
assert.ok(sourceFiles.includes('src/popup/popup.js') && sourceFiles.includes('src/background.js'), 'src/ scan finds the scripts');
const sources = ['manifest.json', ...sourceFiles].map(read).join('\n');
// 文案键的引用方式：manifest 的 __MSG_key__、HTML 的 data-i18n="key"、脚本里的 t('key') / getMessage('key')。
const referenced = new Set([
    ...[...sources.matchAll(/__MSG_([A-Za-z0-9_]+)__/g)].map(match => match[1]),
    ...[...sources.matchAll(/data-i18n(?:-[a-z]+)?="([A-Za-z0-9_]+)"/g)].map(match => match[1]),
    ...[...sources.matchAll(/\b(?:t|getMessage)\('([A-Za-z0-9_]+)'/g)].map(match => match[1])
]);
assert.deepStrictEqual([...referenced].filter(key => !english[key]).sort(), [], 'code references missing message keys');
assert.deepStrictEqual(keys.filter(key => !sources.includes(key)), [], 'unused message keys');

console.log(`locale tests passed (${LOCALES.length} locales, ${keys.length} keys)`);
