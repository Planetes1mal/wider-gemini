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

// luminous 可读性排版会给文字级元素单独设阅读宽度上限（p ≈ 70ch），
// 必须解除 markdown 内文字元素及用户提问文字的限宽
assert.ok(
    css.includes(':is(p, li, ul, ol, blockquote, h1, h2, h3, h4, h5, h6):not('),
    'text-level max-width unlock selector must exist for luminous readable width'
);

assert.ok(
    css.includes('user-query :is(p, .query-text, .query-text-line):not('),
    'user query text max-width unlock selector must exist'
);

// luminous 也限制回复操作栏宽度并自动居中，导致按钮相对正文缩进
assert.ok(
    css.includes('model-response message-actions'),
    'message-actions max-width/margin unlock selector must exist'
);

// luminous 用 response-element 包裹代码块并限宽（实测 740px），代码框不随列加宽
assert.ok(
    css.includes('model-response response-element'),
    'response-element max-width unlock selector must exist'
);

// luminous 给正文路径上各类包装容器统一限宽，通用规则整体解锁（排除媒体/表单/浮层）
assert.ok(
    css.includes('img, video, svg, canvas, iframe, button, input, select, textarea,'),
    'generic markdown max-width unlock rule must exclude media and form controls'
);

// 表格滚动条：禁用外层出血式滚动包装，滚动容器画出通栏轨道
assert.ok(
    css.includes('.horizontal-scroll-wrapper:has(table-block)'),
    'horizontal-scroll-wrapper bleed must be disabled around table-block'
);

assert.ok(
    css.includes('table-block .table-content::-webkit-scrollbar-track'),
    'table scroll container must render a full-width scrollbar track'
);

console.log('gemini-content CSS tests passed');
