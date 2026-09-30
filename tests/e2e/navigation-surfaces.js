// Active-surface discovery and message navigation on stripped markup derived from the 2026-09-29 sanitized
// captures (ordinary ChatGPT, Dots, Page document, empty Page quick chat, Gemini). Real content CSS/JS with
// mocked Chrome APIs; wrappers and layout CSS below are reconstructed where noted. Not a live-site check.
// Run: node tests/e2e/navigation-surfaces.js   (WG_CHROME may point to another Chrome executable)
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
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-navigation-surfaces-'));
    const read = name => fs.readFileSync(path.join(repo, name), 'utf8');
    const script = source => `<script>${source.replace(/<\/script/gi, '<\\/script')}</script>`;
    const near = (actual, expected, label, tolerance = 1) => assert(Math.abs(actual - expected) <= tolerance,
        `${label}: ${actual}, expected ${expected}`);

    // 页面内通用：模拟扩展存储与消息，脚本异常时也输出报告。
    const harness = `
        window.store = window.initialStore;
        window.chrome = {
            runtime:{ id:'nav-surfaces', onMessage:{ addListener(fn){ window.deliver = fn; } } },
            i18n:{ getMessage: () => '' },
            storage:{ sync:{ get(keys, cb){ cb(JSON.parse(JSON.stringify(window.store))); } },
                onChanged:{ addListener(fn){ window.deliverStorage = fn; } } }
        };
        const wait = (ms = 60) => new Promise(resolve => setTimeout(resolve, ms));
        const q = selector => document.querySelector(selector);
        const qa = selector => [...document.querySelectorAll(selector)];
        const rect = selector => q(selector).getBoundingClientRect();
        const px = (selector, property) => parseFloat(getComputedStyle(q(selector))[property]);
        const status = () => { let r; window.deliver({ action:'getLayoutStatus' }, {}, v => { r = v; }); return r; };
        async function save(key, value) {
            window.store[key] = value;
            window.deliverStorage({ [key]:{ newValue:value } }, 'sync');
            await wait();
        }
        function report(value) {
            const pre = document.createElement('pre');
            pre.id = 'results';
            pre.textContent = JSON.stringify(value);
            document.body.appendChild(pre);
        }
        window.addEventListener('unhandledrejection', event => report({ error:String(event.reason && event.reason.stack || event.reason) }));
        window.addEventListener('error', event => { window.pageErrors = (window.pageErrors || []).concat(event.message + ' @' + event.lineno); });
    `;

    function run(name, html) {
        const file = path.join(temp, `${name}.html`);
        fs.writeFileSync(file, html);
        const result = spawnSync(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check',
            '--disable-extensions', '--force-prefers-reduced-motion', '--window-size=1400,900', `--user-data-dir=${path.join(temp, `profile-${name}`)}`,
            '--dump-dom', '--virtual-time-budget=8000', pathToFileURL(file).href],
        { encoding: 'utf8', windowsHide: true, timeout: 90000, maxBuffer: 8 * 1024 * 1024 });
        if (result.error) throw result.error;
        const match = result.stdout?.match(/<pre id="results">([^<]+)<\/pre>/);
        assert(match, `${name}: no browser report (${result.status}): ${result.stderr?.slice(0, 800)}`);
        const report = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
        assert(!report.error, `${name}: ${report.error}`);
        fs.writeFileSync(path.join(temp, `${name}.json`), JSON.stringify(report, null, 4));
        return report;
    }

    // ---- ChatGPT：普通对话（隐藏路由 / column-reverse 滚动）、Dots、Page 文档、Page 浮动对话 ----
    const native = 'max-w-(--thread-body-max-width)';
    const dotsRow = (id, self, body) => `<article class="message-row ${self ? 'self' : ''}" data-message-id="${id}">
        <div class="message-bubble-wrap"><div class="message-content-line"><div class="message-content-stack">
        <div class="message-content"><div class="message-body" data-message-id="${id}">${body}
        <div class="message-inline-actions" aria-label="Message actions"><button type="button" aria-label="Reply">R</button></div>
        </div></div></div></div></div></article>`;
    const dotsText = text => `<div class="message-surface"><div class="message-bubble"><div class="message-text">
        <div data-markdown-text-style="assistant-message"><p class="Paragraph-kKnbIo">${text}</p></div></div></div></div>`;
    const ordinaryTurn = (user, answer) => `<div data-user-message-bubble="true"><div class="flex flex-col items-end">
        <div class="relative w-full min-w-0"><div data-search-result-target><div>
        <div class="whitespace-pre-wrap">${user}</div></div></div></div></div></div>
        <div data-markdown-text-style="assistant-message"><p>${answer}</p><p>${answer}</p><p>${answer}</p></div>`;

    const chatgpt = `<!doctype html><html><head><meta charset="utf-8"><style>
        *, ::before, ::after { box-sizing:border-box; }
        body { margin:0; font:16px/26px sans-serif; }
        .route[hidden-route] { display:none; }
        /* 重建：原生宽度变量链（ordinary 与 Dots 的实际 class 均带 max-w-(--thread-body-max-width)） */
        .max-w-\\(--thread-body-max-width\\) {
            --thread-body-inline-padding:16px;
            --thread-content-max-width:var(--thread-content-responsive-max-width, 640px);
            --thread-body-max-width:calc(var(--thread-content-max-width) + var(--thread-body-inline-padding) * 2);
            max-width:var(--thread-body-max-width); width:100%; margin:auto; padding-inline:16px;
        }
        [data-app-action-timeline-scroll] { display:flex; flex-direction:column-reverse; overflow-y:auto; height:600px; }
        [data-user-message-bubble] { display:flex; justify-content:flex-end; }
        [data-user-message-bubble] > div { max-width:70%; padding:10px 16px; background:#eee; line-height:24px; }
        [data-markdown-text-style] p { margin:0 0 16px; min-height:150px; }
        .thread-pane { --thread-content-responsive-max-width:640px; display:flex; flex-direction:column; height:640px; }
        .messages-scroll { overflow-y:auto; height:560px; }
        .message-row { display:flex; margin:4px 0; }
        .message-row.self { justify-content:flex-end; }
        .message-bubble-wrap { position:relative; max-width:min(88%, 100% - 73px); }
        .message-row.self .message-inline-actions { position:absolute; inset:0 auto 0 -65px; width:56px; }
        .message-row:not(.self) .message-inline-actions { position:absolute; inset:0 -65px 0 auto; width:56px; }
        .message-row [data-markdown-text-style] p { margin:0; line-height:22px; }
        .message-row [data-markdown-text-style] { min-height:220px; }
        [data-page-document-selection] [role="textbox"] { font:14px/22.75px sans-serif; }
    </style><style>${read('src/content/message-navigation.css')}</style>
    <style>${read('src/content/chatgpt-content.css')}</style></head><body>
        <div class="route" id="ordinary" hidden-route><main><div data-app-action-timeline-scroll>
            <div data-pip-obstacle="thread-footer" class="${native}"><form data-chatgpt-composer><div role="textbox" contenteditable="true"></div></form></div>
            <div data-thread-user-message-navigation-content class="${native}" id="transcript">
                ${ordinaryTurn('First ordinary question', 'Ordinary answer one')}
                ${ordinaryTurn('Second ordinary question', 'Ordinary answer two')}
                ${ordinaryTurn('Third ordinary question', 'Ordinary answer three')}
            </div>
        </div></main></div>
        <div class="route" id="dots"><div class="messaging-root messaging-embedded"><div class="workspace"><main class="thread-pane">
            <div class="conversation-viewport"><div class="messages-scroll" data-role="messages-scroll">
                <div class="message-list ${native}" id="dots-list">
                    ${dotsRow('d1', false, dotsText('Dot says hello'))}
                    ${dotsRow('d2', true, dotsText('First dots question'))}
                    ${dotsRow('d3', false, dotsText('Dot answers'))}
                    ${dotsRow('d4', true, '<div class="mt-2"><span>Call ended</span></div><div role="status">Read</div>')}
                    ${dotsRow('d5', true, dotsText('Second dots question'))}
                    ${dotsRow('d6', false, dotsText('Dot answers again'))}
                    ${dotsRow('d7', true, dotsText('Third dots question'))}
                </div>
            </div></div>
            <div class="conversation-footer"><div data-role="composer"><div data-codex-composer-root>
                <div class="relative ${native}" id="dots-composer"><div role="textbox" contenteditable="true"></div></div>
            </div></div></div>
        </main></div></div></div>
        <div class="route" id="page" hidden-route><div data-page-document-selection="true" role="presentation">
            <div role="textbox" aria-label="Page document" contenteditable="true">
                <div data-page-block-row data-page-block-type="paragraph"><div data-page-block-viewport><p id="page-p">Document text</p></div></div>
            </div></div>
            <section role="dialog" data-pip-obstacle="quick-chat" data-quick-chat-drag-handle="true" id="quick" hidden-route class="route">
                <div data-pip-obstacle="thread-footer"><form data-composer-placement="thread" data-thread-find-composer="true">
                    <div role="textbox" contenteditable="true" aria-label="Work with ChatGPT"></div></form></div>
            </section>
        </div>
        ${script(`window.initialStore = { chatgptWidthSettings:{ widthEnabled:true, chatWidthSetting:{ value:1000, unit:'px' } },
            chatgptReadingSettings:{ messageFontSize:125 } };` + harness)}
        ${script(read('src/shared/settings-utils.js'))}${script(read('src/content/message-navigation.js'))}
        ${script(read('src/content/chatgpt-content.js'))}
        ${script(`
            const show = id => { qa('.route').forEach(el => el.setAttribute('hidden-route', '')); q('#' + id).removeAttribute('hidden-route'); };
            window.addEventListener('load', async () => {
                await wait(120);
                const out = {};
                // 1. Dots 可见，普通对话仍连接但隐藏。
                let s = status();
                await wait();
                out.dots = { surface:s.surface.kind, status:s.status,
                    owners:qa('[data-wgc-width]').map(el => el.id || el.className.split(' ')[0]),
                    font:px('#dots-list .message-row.self p','fontSize'), line:px('#dots-list .message-row.self p','lineHeight'),
                    hiddenMarked:qa('#ordinary [data-wgc-font]').length, nav:qa('.wg-nav-tick').length,
                    navVisible:!q('.wg-nav').hidden, reading:s.capabilities.reading, navigation:s.capabilities.navigation };
                // 2. Dots 用户消息铺满：保留 Reply/Reaction 的原生空间。
                await save('chatgptReadingSettings', { messageFontSize:125, userFullWidth:true });
                const row = q('#dots-list .message-row.self');
                const wrap = row.querySelector('.message-bubble-wrap');
                out.dotsFull = { row:row.getBoundingClientRect().width, wrap:wrap.getBoundingClientRect().width,
                    actionsLeft:row.querySelector('.message-inline-actions').getBoundingClientRect().left - row.getBoundingClientRect().left };
                // 3. 点击导航刻度滚动到目标。
                const scroller = q('.messages-scroll');
                qa('.wg-nav-tick')[1].click();
                await wait(400);
                out.dotsJump = { targetTop:qa('#dots-list .message-row.self:has(.message-surface)')[1].getBoundingClientRect().top - scroller.getBoundingClientRect().top,
                    current:qa('.wg-nav-tick').findIndex(b => b.getAttribute('aria-current') === 'location') };
                // 4. 键盘：焦点在导航条内移动。
                qa('.wg-nav-tick')[0].focus();
                q('.wg-nav-list').dispatchEvent(new KeyboardEvent('keydown', { key:'ArrowDown', bubbles:true }));
                out.keyboard = { focused:qa('.wg-nav-tick').indexOf(document.activeElement), tabbable:qa('.wg-nav-tick').filter(b => b.tabIndex === 0).length,
                    preview:!q('.wg-nav-preview').hidden };
                q('.wg-nav-list').dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
                out.keyboard.previewAfterEscape = !q('.wg-nav-preview').hidden;
                document.activeElement.blur();
                // 5. 100% 宽度：导航条需要的空间由对称收窄对话列得到。
                await save('chatgptWidthSettings', { widthEnabled:true, chatWidthSetting:{ value:100, unit:'percent' } });
                status();
                await wait();
                const nav = rect('.wg-nav');
                const list = q('#dots-list');
                const listStyle = getComputedStyle(list);
                out.gutter = { value:document.documentElement.style.getPropertyValue('--wg-chatgpt-nav-gutter'),
                    railLeft:nav.left, railRight:nav.right, paneRight:scroller.getBoundingClientRect().right,
                    contentRight:list.getBoundingClientRect().right - parseFloat(listStyle.paddingRight),
                    composer:rect('#dots-composer').width, list:list.getBoundingClientRect().width };
                await save('chatgptMessageNavigationEnabled', false);
                out.navOff = { gutter:document.documentElement.style.getPropertyValue('--wg-chatgpt-nav-gutter'),
                    rail:qa('.wg-nav').length, width:status().capabilities.width };
                await save('chatgptMessageNavigationEnabled', true);
                await save('chatgptWidthSettings', { widthEnabled:true, chatWidthSetting:{ value:1000, unit:'px' } });

                // 6. 切回普通对话：标记转移，Dots 的排版标记撤回。
                show('ordinary');
                s = status();
                await wait();
                const root = q('[data-app-action-timeline-scroll]');
                out.ordinary = { surface:s.surface.kind, owners:qa('[data-wgc-width]').map(el => el.id || el.getAttribute('data-pip-obstacle')),
                    dotsMarked:qa('#dots [data-wgc-font]').length, font:px('#transcript [data-markdown-text-style] p','fontSize'),
                    userFont:px('#transcript .whitespace-pre-wrap','fontSize'), nav:qa('.wg-nav-tick').length };
                qa('.wg-nav-tick')[1].click();
                await wait(400);
                out.reverse = { scrollTop:root.scrollTop, targetTop:qa('#transcript [data-user-message-bubble]')[1].getBoundingClientRect().top - root.getBoundingClientRect().top };
                // 7. 流式：起初为空的文字拥有者后来才得到文字。
                const answer = document.createElement('div');
                answer.setAttribute('data-markdown-text-style', 'assistant-message');
                const para = document.createElement('p');
                answer.appendChild(para);
                const bubble = document.createElement('div');
                bubble.setAttribute('data-user-message-bubble', 'true');
                bubble.innerHTML = '<div><div class="whitespace-pre-wrap" id="late-user"></div></div>';
                q('#transcript').append(bubble, answer);
                await wait();
                para.appendChild(document.createTextNode('Streamed words'));
                q('#late-user').appendChild(document.createTextNode('Late question'));
                await wait();
                out.streaming = { paragraph:parseFloat(getComputedStyle(para).fontSize), user:px('#late-user','fontSize'),
                    nav:qa('.wg-nav-tick').length };
                // 8. 只有 Page 文档：不适用，界面保持原生，不提示不支持。
                show('page');
                s = status();
                await wait();
                out.page = { surface:s.surface.kind, status:s.status, width:s.capabilities.width, reading:s.capabilities.reading,
                    owners:qa('[data-wgc-width]').length, markers:qa('[data-wgc-font]').length, pageFont:px('#page-p','fontSize'),
                    rail:qa('.wg-nav').length };
                // 9. Page 关联的空浮动对话：宿主决定宽度，保持原生。
                q('#quick').removeAttribute('hidden-route');
                s = status();
                out.quick = { surface:s.surface.kind, status:s.status, owners:qa('[data-wgc-width]').length };
                // 10. 未识别的可见对话（识别属性被去掉）且隐藏的已知对话仍存在。
                show('ordinary');
                q('#transcript').removeAttribute('data-thread-user-message-navigation-content');
                s = status();
                await wait();
                out.unknown = { surface:s.surface.kind, status:s.status, owners:qa('[data-wgc-width]').length,
                    markers:qa('[data-wgc-font]').length, rail:qa('.wg-nav').length };
                q('#transcript').setAttribute('data-thread-user-message-navigation-content', '');
                s = status();
                await wait();
                out.recovered = { surface:s.surface.kind, owners:qa('[data-wgc-width]').length, font:px('#transcript [data-markdown-text-style] p','fontSize') };
                // 11. 暂停：导航条移除，全部标记撤回。
                await save('chatgptEnabled', false);
                s = status();
                out.paused = { rail:qa('.wg-nav, .wg-nav-preview').length, owners:qa('[data-wgc-width]').length,
                    markers:qa('[data-wgc-font], [data-wgc-full-path]').length, navigation:s.capabilities.navigation,
                    gutter:document.documentElement.style.getPropertyValue('--wg-chatgpt-nav-gutter') };
                report(out);
            });
        `)}</body></html>`;

    const c = run('chatgpt', chatgpt);
    assert.strictEqual(c.dots.surface, 'dots');
    assert.deepStrictEqual(c.dots.owners.sort(), ['dots-composer', 'dots-list'], 'only the visible Dots owners are marked');
    near(c.dots.font, 20, 'Dots prose scales from its own 16px baseline');
    near(c.dots.line, 27.5, 'Dots prose keeps its own 22px line ratio');
    assert.strictEqual(c.dots.hiddenMarked, 0, 'hidden ordinary route is not styled');
    assert.strictEqual(c.dots.nav, 3, 'Dots navigation counts user messages and skips the call row');
    assert(c.dots.navVisible);
    assert.strictEqual(c.dots.navigation, 'active');
    near(c.dotsFull.wrap, c.dotsFull.row - 73, 'Dots full width keeps the 73px action allowance');
    assert(c.dotsFull.actionsLeft >= 0, 'Dots reply/reaction group stays inside the row');
    near(c.dotsJump.targetTop, 72, 'jump places the target below the top inset', 2);
    assert.strictEqual(c.dotsJump.current, 1);
    assert.strictEqual(c.keyboard.focused, 1, 'ArrowDown moves focus within the rail');
    assert.strictEqual(c.keyboard.tabbable, 1, 'one Tab stop');
    assert.strictEqual(c.keyboard.preview, true);
    assert.strictEqual(c.keyboard.previewAfterEscape, false, 'Escape dismisses the preview');
    assert.strictEqual(c.gutter.value, '8px', 'gutter reserves only the missing space beyond native padding');
    assert(c.gutter.railRight <= c.gutter.paneRight + 0.5 && c.gutter.railLeft >= c.gutter.contentRight - 0.5,
        `rail fits between column and pane edge: ${JSON.stringify(c.gutter)}`);
    near(c.gutter.composer, c.gutter.list, 'Dots composer stays aligned with the list');
    assert.strictEqual(c.navOff.gutter, '', 'navigation off releases the gutter');
    assert.strictEqual(c.navOff.rail, 0);
    assert.strictEqual(c.ordinary.surface, 'chat');
    assert.deepStrictEqual(c.ordinary.owners.sort(), ['thread-footer', 'transcript'], 'width markers move to the visible chat');
    assert.strictEqual(c.ordinary.dotsMarked, 0, 'Dots markers are removed after the route switch');
    near(c.ordinary.font, 20, 'ordinary prose scales');
    near(c.ordinary.userFont, 20, 'ordinary user text scales');
    assert.strictEqual(c.ordinary.nav, 3);
    assert(c.reverse.scrollTop < 0, `column-reverse jump uses signed scrollTop: ${c.reverse.scrollTop}`);
    near(c.reverse.targetTop, 72, 'column-reverse jump reaches the target', 2);
    near(c.streaming.paragraph, 20, 'late-filled paragraph scales');
    near(c.streaming.user, 20, 'user text owner that gains text later scales');
    assert.strictEqual(c.streaming.nav, 4, 'new user message joins the rail');
    assert.deepStrictEqual([c.page.surface, c.page.status, c.page.width, c.page.reading],
        ['notApplicable', 'notApplicable', 'notApplicable', 'notApplicable']);
    assert.deepStrictEqual([c.page.owners, c.page.markers, c.page.pageFont, c.page.rail], [0, 0, 14, 0], 'Page stays native');
    assert.deepStrictEqual([c.quick.surface, c.quick.status, c.quick.owners], ['quickChat', 'notApplicable', 0]);
    assert.deepStrictEqual([c.unknown.surface, c.unknown.status, c.unknown.owners, c.unknown.markers, c.unknown.rail],
        ['unknown', 'unsupported', 0, 0, 0], 'unknown visible chat stays native despite the hidden known route');
    assert.strictEqual(c.recovered.surface, 'chat');
    near(c.recovered.font, 20, 'recognition recovers when markers return');
    assert.deepStrictEqual([c.paused.rail, c.paused.owners, c.paused.markers, c.paused.navigation, c.paused.gutter],
        [0, 0, 0, 'paused', ''], 'pause removes rail, width markers and reading markers');

    // ---- Gemini：infinite-scroller.chat-history 内的 user-query ----
    const geminiTurn = (i, long) => `<div class="conversation-container" id="c${i}"><user-query><span class="user-query-container">
        <user-query-content><div class="user-query-container"><div class="query-content"><span class="user-query-bubble-with-background">
        <div class="query-text${long ? ' collapsed' : ''}"><p class="query-text-line">Gemini question ${i}${long ? ' '.repeat(1) + 'long '.repeat(80) : ''}</p></div>
        </span></div></div></user-query-content></span></user-query>
        <model-response><div class="markdown"><p>${'Answer text. '.repeat(400)}</p></div></model-response></div>`;
    const gemini = `<!doctype html><html><head><meta charset="utf-8"><style>
        body { margin:0; font:16px/26px sans-serif; }
        chat-window, user-query, user-query-content, model-response, infinite-scroller, input-container, input-area-v2 { display:block; }
        chat-window { height:700px; display:flex; flex-direction:column; }
        .chat-container { display:flex; flex-direction:column; width:100%; flex:1; min-height:0; }
        infinite-scroller.chat-history { overflow-y:scroll; flex:1; }
        .conversation-container { max-width:760px; margin:auto; }
        .query-text.collapsed { max-height:96px; overflow:hidden; }
    </style><style>${read('src/content/message-navigation.css')}</style>
    <style>${read('src/content/gemini-content.css')}</style></head><body>
        <chat-window><div class="chat-container"><infinite-scroller class="chat-history">
            ${geminiTurn(1, true)}${geminiTurn(2)}${geminiTurn(3)}
        </infinite-scroller><input-container><div class="input-area-container"><input-area-v2>Composer</input-area-v2></div></input-container></div></chat-window>
        ${script(`window.initialStore = { chatWidthSetting:{ value:1000, unit:'px' } };` + harness)}
        ${script(read('src/shared/settings-utils.js'))}${script(read('src/content/message-navigation.js'))}
        ${script(read('src/content/gemini-content.js'))}
        ${script(`
            window.addEventListener('load', async () => {
                await wait(200);
                const out = { errors:window.pageErrors || [] };
                const scroller = q('infinite-scroller');
                if (!q('.wg-nav')) { report({ error:'no Gemini rail; errors=' + JSON.stringify(out.errors) }); return; }
                out.rail = { ticks:qa('.wg-nav-tick').length, visible:!q('.wg-nav').hidden };
                qa('.wg-nav-tick')[1].click();
                await wait(400);
                out.jump = { targetTop:q('#c2 user-query').getBoundingClientRect().top - scroller.getBoundingClientRect().top,
                    collapsed:q('#c1 .query-text').classList.contains('collapsed') };
                await save('chatWidthSetting', { value:100, unit:'percent' });
                await wait();
                const nav = rect('.wg-nav');
                out.gutter = { railLeft:nav.left, columnRight:rect('#c1').right,
                    width:getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width').trim() };
                await save('geminiMessageNavigationEnabled', false);
                out.off = { rail:qa('.wg-nav').length, width:getComputedStyle(document.documentElement).getPropertyValue('--gemini-chat-width').trim() };
                await save('geminiMessageNavigationEnabled', true);
                await save('geminiEnabled', false);
                out.paused = { rail:qa('.wg-nav').length };
                report(out);
            });
        `)}</body></html>`;

    const g = run('gemini', gemini);
    assert.deepStrictEqual(g.rail, { ticks: 3, visible: true }, 'one tick per outer user-query');
    near(g.jump.targetTop, 16, 'Gemini jump uses the chat-history scroller', 2);
    assert.strictEqual(g.jump.collapsed, true, 'collapsed long message is not expanded');
    assert(/^min\(100vw, \d+px\)$/.test(g.gutter.width), `Gemini caps width for the rail: ${g.gutter.width}`);
    assert(g.gutter.railLeft >= g.gutter.columnRight - 0.5, `rail clears the column: ${JSON.stringify(g.gutter)}`);
    assert.deepStrictEqual(g.off, { rail: 0, width: '100vw' }, 'navigation off removes the rail and releases the gutter');
    assert.strictEqual(g.paused.rail, 0);
    console.log(`Passed navigation and surface regression (${temp}).`);
})();
