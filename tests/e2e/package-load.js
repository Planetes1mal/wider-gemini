// Smoke-test an already extracted release ZIP in an isolated, headless Chrome profile.
// Usage: node tests/e2e/package-load.js <extracted-extension-directory>
(function () {
    'use strict';

    const assert = require('assert');
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const { spawn } = require('child_process');
    const extension = path.resolve(process.argv[2]);
    const expected = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-package-load-'));
    const child = spawn(process.env.WG_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
        '--headless=new', '--remote-debugging-pipe', '--enable-unsafe-extension-debugging',
        `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
        '--disable-sync', '--disable-background-networking', 'about:blank'
    ], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'], windowsHide: true });
    const pending = new Map();
    let buffer = '';
    let serial = 0;
    child.stdio[4].on('data', chunk => {
        buffer += chunk.toString();
        let separator;
        while ((separator = buffer.indexOf('\0')) >= 0) {
            const message = JSON.parse(buffer.slice(0, separator));
            buffer = buffer.slice(separator + 1);
            const job = pending.get(message.id);
            if (job) {
                clearTimeout(job.timer);
                pending.delete(message.id);
                message.error ? job.reject(new Error(JSON.stringify(message.error))) : job.resolve(message.result);
            }
        }
    });
    function send(method, params = {}, sessionId) {
        return new Promise((resolve, reject) => {
            const id = ++serial;
            const timer = setTimeout(() => {
                pending.delete(id);
                reject(new Error(`Timeout: ${method}`));
            }, 10000);
            pending.set(id, { resolve, reject, timer });
            child.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0');
        });
    }

    (async () => {
        try {
            const { id } = await send('Extensions.loadUnpacked', { path: extension });
            assert(id, 'Chrome should accept the release manifest and files');
            const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${id}/popup.html` });
            const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
            let state;
            // createTarget returns before navigation finishes; the initial document may be about:blank.
            for (let attempt = 0; attempt < 50; attempt++) {
                const result = await send('Runtime.evaluate', {
                    expression: `(() => {
                        if (document.readyState !== 'complete' || !globalThis.chrome?.runtime?.id) return null;
                        const manifest = chrome.runtime.getManifest();
                        return { version:manifest.version, versionName:manifest.version_name,
                            slider:!!document.getElementById('widthSlider'), name:manifest.name };
                    })()`, returnByValue: true
                }, sessionId);
                assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
                state = result.result.value;
                if (state) break;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            assert(state, 'Packaged popup should load in the extension context');
            assert.strictEqual(state.version, expected.version);
            assert.strictEqual(state.versionName, expected.version_name);
            assert.strictEqual(state.slider, true);
            assert(!state.name.startsWith('__MSG_'), 'Manifest localization should resolve');
            console.log('Packaged extension loaded in Chrome:', JSON.stringify(state));
        } catch (error) {
            console.error(error.stack);
            process.exitCode = 1;
        } finally {
            await send('Browser.close').catch(() => child.kill());
        }
    })();
})();
