const assert = require('assert');
const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'gemini-content.css');
const css = fs.readFileSync(cssPath, 'utf8');

// 阅读排版只作用于内容脚本从受支持消息中标记的节点；字号与间距各自启用。
[
    'body.wider-gemini-font-enabled [data-wg-typography]',
    'body:is(.wider-gemini-font-enabled, .wider-gemini-density-enabled) [data-wg-line]',
    'body.wider-gemini-density-enabled [data-wg-spacing]',
    'body.wider-gemini-spacing-custom [data-wg-spacing="after"]'
].forEach(selector => {
    assert.ok(css.includes(selector), `missing reading selector: ${selector}`);
});
assert.ok(css.includes('var(--wg-native-font-size) * var(--gemini-font-scale)'),
    'font scaling must use captured native font sizes');
assert.ok(css.includes('var(--wg-line-reduction) * var(--gemini-density-progress)'),
    'automatic line height must interpolate from the native value');
assert.ok(css.includes('var(--wg-native-margin-top) * var(--gemini-density-spacing-scale)'),
    'automatic paragraph spacing must scale native margins');
assert.ok(css.includes('margin-top: var(--gemini-message-paragraph-spacing) !important;'),
    'manual paragraph spacing must use the exact requested value, including zero');

[
    'body.wider-gemini-user-full-width .conversation-container .user-query-bubble-with-background',
    'body.wider-gemini-user-full-width .conversation-container .user-query-bubble-container'
].forEach(selector => {
    assert.ok(css.includes(selector), `missing user full-width selector: ${selector}`);
});

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

// luminous 给回复区子容器（头部/思考层/底部/操作栏外层）统一加 24px 水平外边距
assert.ok(
    css.includes('model-response .response-container-header'),
    'response-container-header margin unlock selector must exist'
);

assert.ok(
    css.includes('model-response thinking-overlay'),
    'thinking-overlay margin unlock selector must exist'
);

// 三个点加载态：pending-request 下撑满整列；thinking-overlay 内与文字并排时恢复内容宽度
assert.ok(
    css.includes('pending-request > thinking-dots-animation'),
    'thinking-dots-animation standalone stretch selector must exist'
);

assert.ok(
    css.includes('thinking-overlay > thinking-dots-animation'),
    'thinking-dots-animation in-overlay content-width selector must exist'
);

// 图片说明：margin 清零，偏移量由内容脚本 alignImageCaptions() 测量后设置
assert.ok(
    css.includes('.hero-caption-row .caption'),
    'image caption margin reset selector must exist'
);

assert.ok(
    css.includes('alignImageCaptions()'),
    'CSS comment must document the JS-driven caption alignment'
);

console.log('gemini-content CSS tests passed');
