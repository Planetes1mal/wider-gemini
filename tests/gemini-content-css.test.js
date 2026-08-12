const assert = require('assert');
const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'gemini-content.css');
const css = fs.readFileSync(cssPath, 'utf8');

[
    'body.wider-gemini-density-enabled message-content',
    'body.wider-gemini-density-enabled model-response .markdown-main-panel',
    'body.wider-gemini-density-enabled .query-text',
    'body.wider-gemini-density-enabled model-response pre',
    'body.wider-gemini-density-enabled .formatted-code-block-internal-container code'
].forEach(selector => {
    assert.ok(css.includes(selector), `missing density selector: ${selector}`);
});

assert.ok(
    css.includes('margin-top: var(--gemini-message-paragraph-spacing) !important;'),
    'paragraph spacing must use adjacent-sibling margins (gap is inert on block containers)'
);

assert.ok(
    css.includes('margin-bottom: 0 !important;'),
    'markdown block children margins must be reset'
);

[
    'body.wider-gemini-user-full-width .conversation-container .user-query-bubble-with-background',
    'body.wider-gemini-user-full-width .conversation-container .user-query-bubble-container'
].forEach(selector => {
    assert.ok(css.includes(selector), `missing user full-width selector: ${selector}`);
});

// 字号：原生基准变量 + 文本/标题/代码的缩放声明
[
    '--gemini-message-font-size: 17px',
    '--gemini-message-inline-code-font-size: 15px',
    '--gemini-message-code-font-size: 14px',
    '--gemini-message-h1-font-size: 28px',
    '--gemini-message-h2-font-size: 24px',
    '--gemini-message-h3-font-size: 20px'
].forEach(decl => {
    assert.ok(css.includes(decl), `missing font size var default: ${decl}`);
});

assert.ok(
    css.includes('font-size: var(--gemini-message-font-size) !important;'),
    'density font-size must use the base font size var'
);

assert.ok(
    css.includes('font-size: var(--gemini-message-h2-font-size) !important;'),
    'h2 font-size must use the h2 var'
);

assert.ok(
    css.includes('font-size: var(--gemini-message-code-font-size) !important;'),
    'block code font-size must use the code var'
);

assert.ok(
    css.includes('font-size: var(--gemini-message-inline-code-font-size) !important;'),
    'inline code font-size must use the inline code var'
);

// 标题/引用块行高：Gemini 原生行高为 rem 固定值，字号放大后会挤压，
// 必须覆盖为固定比例（实测 36/28、28/24、24/20）或跟随正文变量
[
    'line-height: 1.2857 !important;',
    'line-height: 1.1667 !important;',
    'line-height: 1.2 !important;'
].forEach(decl => {
    assert.ok(css.includes(decl), `missing heading line-height ratio: ${decl}`);
});

assert.ok(
    css.includes('body.wider-gemini-density-enabled model-response .markdown blockquote'),
    'blockquote line-height selector must exist'
);

assert.ok(
    css.includes('body.wider-gemini-density-enabled model-response .markdown > * + *'),
    'adjacent-sibling margin selector must exist'
);

console.log('gemini-content CSS tests passed');
