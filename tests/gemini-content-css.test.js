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
    css.includes('row-gap: var(--gemini-message-paragraph-spacing) !important;'),
    'markdown container row-gap must use paragraph spacing'
);

assert.ok(
    css.includes('gap: var(--gemini-message-paragraph-spacing) !important;'),
    'markdown container gap must use paragraph spacing'
);

[
    'body.wider-gemini-user-full-width .conversation-container .user-query-bubble-with-background',
    'body.wider-gemini-user-full-width .conversation-container .user-query-bubble-container'
].forEach(selector => {
    assert.ok(css.includes(selector), `missing user full-width selector: ${selector}`);
});

console.log('gemini-content CSS tests passed');
