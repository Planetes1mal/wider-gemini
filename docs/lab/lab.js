(function () {
    'use strict';

    const width = document.getElementById('width');
    const font = document.getElementById('font');
    const wrap = document.getElementById('wrap');
    const status = document.getElementById('layoutStatus');
    const sample = document.getElementById('sample');
    const sampleChoice = document.getElementById('sampleChoice');
    const samples = { a: sample.innerHTML, b: document.getElementById('sampleB').innerHTML };
    const originalTasks = document.getElementById('taskList').innerHTML;
    const originalAnswer = document.getElementById('answerText').innerHTML;
    let notesUrl;

    function settings() {
        return {
            sample: sampleChoice.value,
            layout: document.querySelector('[name="layout"]:checked').value,
            width: Number(width.value),
            fontPercent: Number(font.value),
            codeWrap: wrap.checked
        };
    }

    sampleChoice.addEventListener('change', function () {
        sample.innerHTML = samples[sampleChoice.value];
        document.getElementById('taskList').innerHTML = sampleChoice.value === 'a' ? originalTasks :
            '<li>Read the first two paragraphs. Explain why backoff and input validation solve different problems.</li>' +
            '<li>Find the request timeout in the table, then locate where rate limiting runs.</li>' +
            '<li>Find the initial backoff delay and the condition that stops retries for a client-side status.</li>';
        document.getElementById('answerText').innerHTML = sampleChoice.value === 'a' ? originalAnswer :
            'Backoff reduces retry pressure; validation identifies requests that need correcting. Timeout: 8 s. ' +
            'Rate limit: server gateway. Initial backoff: 400 ms plus jitter. Stop when <code>response.status &lt; 500</code>.';
        document.getElementById('answers').open = false;
        render();
    });

    function render() {
        const state = settings();
        document.documentElement.style.setProperty('--content-width', `${state.width}px`);
        document.documentElement.style.setProperty('--sample-font-size', `${16 * state.fontPercent / 100}px`);
        sample.classList.toggle('mixed', state.layout === 'mixed');
        sample.classList.toggle('nowrap', !state.codeWrap);
        document.getElementById('widthValue').value = `${state.width} px`;
        document.getElementById('wrapStatus').textContent = state.codeWrap ? 'Wrapped' : 'Scroll horizontally';
        status.textContent = state.layout === 'mixed'
            ? '實驗版面：正文上限 72ch；表格和程式碼仍可使用外層寬度。小螢幕上差異可能較小。'
            : '統一寬度：文字、表格和程式碼共用內容寬度。';
    }

    document.querySelectorAll('.controls input, .controls select').forEach(control => {
        control.addEventListener('input', render);
    });
    document.getElementById('reset').addEventListener('click', function () {
        document.querySelector('[name="layout"][value="uniform"]').checked = true;
        width.value = '1200';
        font.value = '100';
        wrap.checked = true;
        render();
    });
    document.getElementById('feedback').addEventListener('submit', function (event) {
        event.preventDefault();
        const note = {
            experiment: 'wider-gemini-reading-lab-v1',
            settings: settings(),
            viewport: { width: window.innerWidth, height: window.innerHeight },
            preference: document.getElementById('preference').value || 'not-chosen',
            notes: document.getElementById('notes').value.trim(),
            limitation: 'Local observation on synthetic content; not a completed user study.'
        };
        const json = JSON.stringify(note, null, 2);
        document.getElementById('notesPreview').value = json;
        document.getElementById('exportNotes').hidden = false;
        if (notesUrl) URL.revokeObjectURL(notesUrl);
        notesUrl = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        document.getElementById('downloadNotes').href = notesUrl;
        document.getElementById('downloadStatus').textContent =
            '筆記已產生，可複製或儲存下方 JSON；未上傳。 / Notes ready to copy or save; nothing uploaded.';
    });
    render();
})();
