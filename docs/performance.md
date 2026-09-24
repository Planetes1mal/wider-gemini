# Synthetic performance baseline

Measured on 2026-09-19 while preparing 2.8.0-rc.1. These are local Windows Chrome measurements on generated content, not measurements of a user's Gemini account or a macOS browser.

The benchmark found avoidable work during file dragging: the content script read computed styles for every descendant of the drag container before checking whether its class could identify a drop zone. Moving the existing class and scope checks before those reads reduced the measured drag-phase main-thread work. It does not change the candidate selectors, width rules, animation-frame loop, or settings refresh frequency.

## Reproduce

Use Node.js 24 and a local Chrome executable. No npm packages, extension installation, account, network requests, or private conversation data are needed.

```sh
node tests/e2e/performance.js
```

The default run takes five samples per condition and prints the path to its JSON results and generated HTML. To choose the output location and sample count:

```sh
node tests/e2e/performance.js tests/diagnostics/performance-local.json 5
```

On macOS/Linux, or with a nonstandard Windows installation, set `WG_CHROME` to the browser executable as described in [engineering.md](engineering.md). The script launches an isolated headless profile, closes it after the run, and keeps only the generated fixtures and results. It does not open extension popup pages or the Gemini website.

## Conditions and interpretation

- Hardware: Intel Core i7-14650HX; Windows `10.0.26200`.
- Runtimes: Chrome `153.0.8010.48`, Node.js `24.19.0`.
- Browser window: requested `1600 × 1000`, no CPU throttling.
- Sizes: **100 and 500 question/answer pairs**. Each pair contains a user-query element, one response, a repeated paragraph, a code block, and a three-cell table. This is 200/1,000 text messages, plus one separate synthetic image/caption example; it is not 100/500 total individual messages.
- Each size has one unrecorded warm-up per condition, followed by five fresh-page samples. The extension-enabled and no-extension order alternates between samples.
- Enabled pages run the real `settings-utils.js`, `gemini-content.js`, and `gemini-content.css` with mocked Chrome storage/message APIs. Control pages have the same synthetic content and base styling, with no extension CSS or content script. Chrome extensions are disabled in the test browser.
- Both conditions use the same content and 1,000px conversation width. Real images, rendering by Gemini, network traffic, service-worker startup, and actual Chrome sync overhead are excluded.
- **Initial** covers renderer work from page setup through load and two animation frames. **Append** inserts 20 more question/answer pairs in one batch and waits two frames. **Drag** adds Gemini's drag class, dispatches dragenter, waits 30 animation frames, removes the class, dispatches drop, and allows its delayed cleanup to finish.
- `Performance.getMetrics().TaskDuration` supplies accumulated renderer task time, reported below in milliseconds. It is not elapsed loading time, frame rate, or input latency. Script/style/layout times are separate diagnostic metrics and should not be added together to infer total CPU.
- The harness observes mutation-callback and mocked-storage-read counts. The JSON also records JS heap usage; that is not total browser or DOM memory. Small polling/instrumentation costs are present in both runs.

The benchmark intentionally has no performance pass/fail threshold. Five samples describe this machine's behavior; they do not support a general speed guarantee or establish statistical significance. For a future comparison, use the same script, browser, machine, power mode, sample count, and otherwise idle conditions.

## Measured results

Main-thread task time, median of five samples, in milliseconds. “Before” and “after” refer only to this local comparison of the content-script changes described above; control variation is shown rather than hidden.

| Size (pairs) | Phase | Control before | Enabled before | Control after | Enabled after |
|---|---|---:|---:|---:|---:|
| 100 | Initial | 29.472 | 32.768 | 27.251 | 33.610 |
| 100 | Append 20 pairs | 3.736 | 4.810 | 3.698 | 4.740 |
| 100 | Drag, 30 frames + cleanup | 3.548 | 219.478 | 2.733 | 127.809 |
| 500 | Initial | 67.720 | 86.559 | 68.401 | 85.938 |
| 500 | Append 20 pairs | 5.063 | 7.245 | 4.972 | 7.247 |
| 500 | Drag, 30 frames + cleanup | 2.740 | 906.028 | 3.132 | 575.055 |

The enabled drag-phase median fell by about **41.8% at 100 pairs** and **36.5% at 500 pairs** in this fixture. Initial and append results were essentially unchanged relative to the observed run-to-run variation. These percentages are benchmark observations, not claims that Gemini as a whole becomes that much faster.

| Size (pairs) | Enabled drag range before | Enabled drag range after | Script-time median before → after |
|---|---:|---:|---:|
| 100 | 191.014–320.726ms | 124.415–140.166ms | 187.981 → 99.726ms |
| 500 | 866.229–1,140.229ms | 560.116–587.897ms | 828.967 → 506.527ms |

The retained full scans are still costly in the 500-pair drag fixture. Each enabled sample made one mocked storage read at initialization, one after the append, and **32 during drag and cleanup**, both before and after. This change does not cache settings, throttle those refreshes, or claim to remove all long-conversation overhead. Preserving the existing drag and width behavior was the scope of this change.

At initial sampling, enabled fixtures contained 1,720/8,520 DOM elements at the two sizes; controls contained 1,717/8,517. Median enabled JS heap was 0.92/1.13 MiB, compared with 0.68 MiB for the controls. These small heap figures exclude native DOM memory and are not evidence of low total browser memory usage or absence of leaks.

## Width-change correctness observed alongside the baseline

The synthetic image example also reproduced a separate lifecycle issue. At a 1,000px conversation width, image and caption left edges were both `663.5px`, with `380px` caption padding. After a width message changed the conversation to 1,400px, the image remained centered at `663.5px` but the caption moved to `463.5px`: its old padding had not been recalculated.

Width updates delivered by runtime messages or storage changes now remeasure the caption. The same probe then recorded both left edges at `663.5px`, with padding updated to `580px`. The existing message-width script includes one caption scenario covering direct messages, the duplicate storage delivery, and a storage-only width change. The original 73 width scenarios also passed in the local Chrome run.

No CSS selectors or width constraints were changed. In particular, the PR #10/macOS compatibility rules, protected overlays, and existing drag RAF behavior are retained. Real Gemini layouts and macOS still require manual verification; this baseline does not replace it.

Source and checks: [performance.js](../tests/e2e/performance.js), [message-width.js](../tests/e2e/message-width.js), [gemini-content.js](../gemini-content.js).
