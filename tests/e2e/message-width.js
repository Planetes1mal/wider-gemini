// Synthetic max-width regressions using the real content CSS/JS and mocked Chrome APIs.
// This is not the reporter's macOS DOM. Run: node tests/e2e/message-width.js [--probe]
// WG_CHROME may point to another Chrome executable. Each run uses a disposable profile.
(function () {
    'use strict';

    const assert = require('assert');
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const { pathToFileURL } = require('url');
    const { spawnSync } = require('child_process');
    const repo = path.resolve(__dirname, '../..');
    const chrome = process.env.WG_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-message-width-'));
    const read = name => fs.readFileSync(path.join(repo, name), 'utf8');
    const script = source => `<script>${source.replace(/<\/script/gi, '<\\/script')}</script>`;
    const probe = process.argv.includes('--probe');
    const cases = ['baseline', 'response-content', 'anonymous', 'message-content', 'markdown',
        'tag-only', 'limited-parent', 'padded-body'];
    const fixture = name => {
        const limit = node => name === node ? 'style="max-width:760px"' : '';
        const tag = name === 'tag-only' ? 'conversation-container' : 'div';
        return `<section data-case="${name}" style="width:${name === 'limited-parent' ? 900 : 1800}px">
            <${tag} ${tag === 'div' ? 'class="conversation-container"' : ''}>
                <user-query><div class="user-query-container"><user-query-content>
                    <div class="user-query-bubble-with-background">A short question</div>
                </user-query-content></div></user-query>
                <model-response><div><response-container><div class="response-container">
                <div class="presented-response-container"><div class="response-container-content">
                <div class="response-content" ${limit('response-content')}>
                <structured-content-container class="model-response-text"><div class="container">
                <div ${limit('anonymous')}><message-content class="message-content" ${limit('message-content')}>
                <div class="markdown markdown-main-panel" ${name === 'padded-body' ? 'style="padding:0 16px"' : limit('markdown')}>
                    <p data-text>Ordinary response text</p>
                    <img data-image width="2400" height="1" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2400' height='1'/%3E">
                    <pre><code>${'long_code_without_spaces_'.repeat(150)}</code></pre>
                    <table-block><div class="table-block"><div class="table-content">
                        <table><tbody><tr><td>${'wide_table_cell_'.repeat(250)}</td></tr></tbody></table>
                    </div></div></table-block>
                    <div class="cdk-overlay-pane protected"><div role="dialog" class="protected">
                        <message-content class="overlay-body"><div class="markdown overlay-body">Nested dialog</div></message-content>
                    </div></div><div class="mat-menu-panel protected">
                        <div><div class="message-content overlay-body">Nested menu</div></div>
                    </div>
                </div></message-content></div></div></structured-content-container>
                </div></div></div></div></response-container></div></model-response>
            </${tag}>
            <input-container><button data-sources>Sources</button><input-area-v2>Composer</input-area-v2>
            </input-container></section>`;
    };
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
        body { margin:0; }
        section { margin:auto; }
        conversation-container, user-query, user-query-content, model-response, response-container,
        structured-content-container, message-content, input-container, input-area-v2, table-block { display:block; }
        .conversation-container, conversation-container { max-width:760px; margin:auto; }
        .user-query-bubble-with-background { width:280px; max-width:280px; }
        .protected { width:600px; max-width:300px; }
        .overlay-body { width:600px; max-width:120px; }
        [data-sources] { width:280px; max-width:140px; }
        img { display:block; max-width:100%; }
        pre { margin:0; }
        table { min-width:3000px; }
    </style><style>${read('gemini-content.css')}</style></head><body>
        ${cases.map(fixture).join('')}
        <div class="conversation-container" data-captions style="width:100%;margin:auto">
            <model-response><single-image style="display:block"><div class="image-button">
                <img width="240" height="1" alt="" style="display:block;margin:auto"
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='1'/%3E">
            </div><div class="hero-caption-row" style="width:100%;box-sizing:border-box">
                <span class="caption">Image caption</span>
            </div></single-image></model-response>
        </div>
        <div class="cdk-overlay-pane protected"><div role="dialog" class="protected">
            <message-content class="overlay-body"><div class="markdown overlay-body">Drive picker</div></message-content>
        </div></div>
        <div class="mat-menu-panel protected">Page menu</div>
        ${script(`
            window.settings = { chatWidthSetting:{value:700,unit:'px'}, userFullWidth:false, codeWrap:false };
            window.chrome = {
                runtime:{id:'width-regression',onMessage:{addListener(fn){window.deliver=fn;}}},
                storage:{sync:{get(keys,cb){cb(window.settings);}},onChanged:{addListener(fn){window.deliverStorage=fn;}}}
            };
        `)}${script(read('settings-utils.js'))}${script(read('gemini-content.js'))}
        ${script(`
            window.addEventListener('load', async () => {
                const width = node => node.getBoundingClientRect().width;
                const send = message => window.deliver(message, {}, () => {});
                const rows = [];
                const take = (setting, fullWidth, wrap, mode='extension') => {
                    for (const section of document.querySelectorAll('[data-case]')) {
                        const get = selector => section.querySelector(selector);
                        const table = get('.table-content');
                        const code = get('pre');
                        rows.push({name:section.dataset.case, setting, fullWidth, wrap, mode,
                            viewport:innerWidth, parent:width(section), response:width(get('[data-text]')),
                            body:width(get('.markdown')),
                            user:width(get('user-query')), bubble:width(get('.user-query-bubble-with-background')),
                            input:width(get('input-area-v2')), outerInput:width(get('input-container')),
                            sources:width(get('[data-sources]')), image:width(get('img')),
                            table:width(table), tableScroll:table.scrollWidth, tableOverflow:getComputedStyle(table).overflowX,
                            code:width(code), codeScroll:code.scrollWidth, codeWhiteSpace:getComputedStyle(code).whiteSpace,
                            protected:[...section.querySelectorAll('.protected')].map(width),
                            overlayContent:[...section.querySelectorAll('.overlay-body')].map(width)
                        });
                    }
                };
                for (const setting of [{value:700,unit:'px'}, {value:1600,unit:'px'},
                    {value:50,unit:'percent'}, {value:100,unit:'percent'}]) {
                    window.settings.chatWidthSetting = setting;
                    send({action:'updateWidthSetting',setting});
                    for (const enabled of [false,true]) {
                        window.settings.userFullWidth = enabled;
                        window.settings.codeWrap = enabled;
                        send({action:'updateUserFullWidth',enabled});
                        send({action:'updateCodeWrap',enabled});
                        take(setting, enabled, enabled);
                    }
                }
                const late = document.createElement('div');
                late.innerHTML = ${JSON.stringify(fixture('tag-only'))};
                const lateSection = late.firstElementChild;
                lateSection.dataset.case = 'late-tag-wrapper';
                lateSection.querySelector('.response-content').style.maxWidth = '760px';
                document.body.appendChild(lateSection);
                await new Promise(resolve => setTimeout(resolve, 0));
                take(window.settings.chatWidthSetting, true, true, 'late-insertion');
                if (${probe}) {
                    const setting = {value:1600,unit:'px'};
                    window.settings.chatWidthSetting = setting;
                    send({action:'updateWidthSetting',setting});
                    for (const [mode, css] of [
                        ['max-only','*{max-width:none!important;}'],
                        ['width-only','.chat-container,.message-content,textarea{width:100%!important;}'],
                        ['full','*{max-width:none!important;}.chat-container,.message-content,textarea{width:100%!important;}']
                    ]) {
                        const style=document.createElement('style');
                        style.textContent=css;
                        document.head.appendChild(style);
                        take(setting,true,true,mode);
                        style.remove();
                    }
                }
                const pageProtected = [...document.querySelectorAll('body > .protected, body > .protected .protected')].map(width);
                const pageOverlayContent = [...document.querySelectorAll('body > .protected .overlay-body')].map(width);
                const captions = [];
                for (const value of [1000, 1400]) {
                    const setting = {value,unit:'px'};
                    send({action:'updateWidthSetting',setting});
                    const host = document.querySelector('[data-captions]');
                    const measure = via => captions.push({value,via,
                        image:host.querySelector('img').getBoundingClientRect().left,
                        caption:host.querySelector('.caption').getBoundingClientRect().left});
                    measure('message');
                    window.deliverStorage({chatWidthSetting:{newValue:setting}},'sync');
                    measure('duplicate-storage');
                }
                window.deliverStorage({chatWidthSetting:{newValue:{value:1200,unit:'px'}}},'sync');
                const host = document.querySelector('[data-captions]');
                captions.push({value:1200,via:'storage-only',image:host.querySelector('img').getBoundingClientRect().left,
                    caption:host.querySelector('.caption').getBoundingClientRect().left});
                const output=document.createElement('pre');
                output.id='results';
                output.textContent=JSON.stringify({rows,pageProtected,pageOverlayContent,captions});
                document.body.appendChild(output);
            });
        `)}</body></html>`;
    const file = path.join(temp, 'fixture.html');
    fs.writeFileSync(file, html);
    const result = spawnSync(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check',
        '--disable-extensions', '--window-size=2000,1200', `--user-data-dir=${path.join(temp, 'profile')}`,
        '--dump-dom', '--virtual-time-budget=1000', pathToFileURL(file).href],
    { encoding:'utf8', windowsHide:true, timeout:30000, maxBuffer:4 * 1024 * 1024 });
    if (result.error) throw result.error;
    const match = result.stdout.match(/<pre id="results">([^<]+)<\/pre>/);
    assert(match, `No browser report (${result.status}): ${result.stderr.slice(-600)}`);
    const report = JSON.parse(match[1]);
    fs.writeFileSync(path.join(temp, 'results.json'), JSON.stringify(report, null, 4));
    console.log(`Synthetic fixture and measurements: ${temp}`);
    if (probe) {
        console.table(report.rows.filter(row => ['max-only','width-only','full'].includes(row.mode)).map(row => ({
            case:row.name, mode:row.mode, response:row.response, input:row.input, image:row.image,
            nestedDialog:row.protected[1], sources:row.sources
        })));
        return;
    }
    const failures = [];
    const check = (row, key, expected) => {
        if (Math.abs(row[key] - expected) > 1) {
            failures.push(`${row.name} ${row.setting.value}${row.setting.unit} full=${row.fullWidth}: ` +
                `${key}=${row[key]}, expected ${expected}`);
        }
    };
    for (const row of report.rows) {
        const requested = row.setting.unit === 'px' ? row.setting.value : row.viewport * row.setting.value / 100;
        const expected = Math.min(requested, row.parent);
        for (const key of ['body', 'user', 'input']) check(row, key, expected);
        const content = expected - (row.name === 'padded-body' ? 32 : 0);
        for (const key of ['response', 'image', 'table', 'code']) check(row, key, content);
        check(row, 'bubble', row.fullWidth ? expected : 280);
        check(row, 'outerInput', row.parent);
        check(row, 'sources', 140);
        assert.deepStrictEqual(row.protected, [300,300,300], `${row.name}: nested overlay/menu changed`);
        assert.deepStrictEqual(row.overlayContent, [120,120,120], `${row.name}: overlay content changed`);
        assert(row.tableScroll > row.table && row.tableOverflow === 'auto', `${row.name}: table lost scrolling`);
        assert.strictEqual(row.codeWhiteSpace, row.wrap ? 'pre-wrap' : 'pre');
        assert(row.wrap ? row.codeScroll <= row.code + 1 : row.codeScroll > row.code,
            `${row.name}: code wrapping/scrolling behavior changed`);
    }
    assert.deepStrictEqual(report.pageProtected, [300,300,300], 'Page overlay/menu changed');
    assert.deepStrictEqual(report.pageOverlayContent, [120,120], 'Page overlay content changed');
    for (const caption of report.captions) {
        assert(Math.abs(caption.image - caption.caption) <= 1,
            `Image caption misaligned after ${caption.via} at ${caption.value}px`);
    }
    assert.strictEqual(failures.length, 0, `Width regressions:\n${failures.join('\n')}`);
    console.log(`Passed ${report.rows.length} message-width scenarios including protected content.`);
})();
