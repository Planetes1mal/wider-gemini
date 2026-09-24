# Compatibility record

## CI runner correction — September 23, 2026

The first [main Tests run](https://github.com/Planetes1mal/wider-gemini/actions/runs/35953083191) and [v2.8.0 Release run](https://github.com/Planetes1mal/wider-gemini/actions/runs/35953084940) used Ubuntu 24.04.5, Node 24.20.0, and Chrome for Testing stable 154.0.8037.57. All five test scripts passed, including the 15 packaging checks, but Chrome aborted with `SIGABRT` before the synthetic layout fixture returned its browser report (`No browser report (null)`). This was a browser-startup failure, not a failed layout assertion; the available stderr tail does not establish its underlying cause. The dependent release job was skipped and these runs did not create a GitHub Release.

The next [Windows Tests run](https://github.com/Planetes1mal/wider-gemini/actions/runs/35953475757) also passed the complete unit/packaging suite, but the downloaded Chrome for Testing 154 process reached the layout script's 30-second limit (`spawnSync ETIMEDOUT`) without a layout report. This is a separate startup/execution failure; it does not establish a layout regression or the cause of the timeout.

The shared Tests workflow keeps `windows-latest` and now selects the image's preinstalled Google Chrome instead of downloading Chrome for Testing. It resolves the registered application path used by the [official runner browser checks](https://github.com/actions/runner-images/blob/main/images/windows/scripts/tests/Browsers.Tests.ps1) and logs the actual version. The complete unit/packaging suite, all synthetic layout scenarios, the 30-second timeout, and browser security flags remain unchanged. Failed browser launches or missing reports now include bounded stdout/stderr diagnostics. No extension runtime code changed; release ZIP creation remains on Ubuntu. The preinstalled-Chrome CI run is pending; local artifact acceptance below does not establish a passing hosted CI run or successful publication.

## Version 2.8.0 release acceptance — September 23, 2026

The final stable-release checks passed:

- `node scripts/test.js` passed all five scripts, including all 15 release-package checks.
- Packaging with `-Tag v2.8.0` reported `Version=2.8.0`, `ManifestVersion=2.8.0`, and `Prerelease=false`.
- After extracting the final ZIP, the package-load check loaded that extracted extension in isolated Chrome and confirmed version 2.8.0 and the popup.
- The extracted-ZIP popup-language check passed six language dictionaries with 87 matching keys, Traditional Chinese automatic selection and persistent manual selection, keyboard menu operation, Korean/Japanese/Spanish selection, and English fallback for French.
- `git diff --check` exited 0.

These artifact checks supplement the earlier current-source acceptance below: 73 synthetic message-width scenarios and the native-relative density probe passed. They use real isolated Chrome with the packaged extension or current source and synthetic pages. The in-app Gemini browser's previously imported extension has not been reloaded; live Gemini, actual system PWA cold-start, and macOS acceptance boundaries remain unchanged. Translation loading/layout checks do not constitute native-speaker review, and these results do not establish Chrome Web Store submission or publication. Earlier sections remain dated historical records.

## Reading-density source update — September 23, 2026

The reading-density/font-size section of `gemini-content.css` and the content script's reading-style handling have now changed. The September 22 whole-file CSS comparison below is a historical snapshot, not a claim that the current entire CSS file still equals PR #10. This change preserves the preceding width/input/upload/overlay CSS and the following code-wrap CSS byte for byte; the existing width and drag selectors were not edited.

The current-source isolated Chrome probe passed direct and nested paragraphs at density 0/1/50/100 with font 100/125, exact manual 0px and 9px spacing, reset to Auto, a late reply with different native metrics, and protected dialog text. On the observed 17px/26px/16px baseline, Auto gaps were 16 / 15.859375 / 9 / 2px. Font-only 125% preserved the 16px paragraph gap and scaled line height to 32.5px. Setting changes performed zero computed-style reads in the probe. The existing settings-utils, scoped-CSS, and content lifecycle unit scripts also passed once after implementation.

Evidence: `node archive/density-layout-probe.js` and `archive/density-layout-probe-results.json` (local ignored diagnostic). This loads the final source in a fresh Chrome profile with synthetic text and mocked extension APIs; an older imported extension in the live Gemini tab is not acceptance of this fix. [Mechanism, saved-setting semantics, and limits](reading-density.md) describe the native-baseline approach. Earlier performance measurements were not repeated and do not quantify the new initial reading-style sampling.

**Final integrated acceptance — September 23:** `node scripts/test.js --skip-packaging` passed all four existing non-packaging unit scripts; `node tests/e2e/message-width.js` passed 73 scenarios; and `node archive/density-layout-probe.js` passed all assertions. The density probe confirmed Auto gaps of 16 / 15.859375 / 9 / 2px at density 0/1/50/100, font-only 125% with a 16px gap and 32.5px line height, exact manual 0px/9px spacing, reset, late native metrics, protected dialog text, and zero native-style reads during setting updates. `git diff --check` exited 0, with only existing line-ending warnings. The browser fixtures used real isolated Chrome loading the current source on synthetic pages. The previously imported extension in the in-app Gemini browser has not been reloaded, so these results are not live-Gemini acceptance of that installed/imported version. No package or release was made.

## Acceptance scope update — September 22, 2026

The user has limited this acceptance round to Windows Chrome and the actual Chrome-installed Gemini app. macOS verification is deferred, with preservation of PR #10 required; the existing machine-assisted translations are accepted without waiting for native-speaker review. These decisions change the acceptance scope, not the historical verification claims below.

At that dated check, a focused comparison confirmed that `gemini-content.css` was byte-identical to the PR #10 merge and `v2.6.0` (Git blob `588ed18a0cf30e774647a35003a5d38000b38a3f`), and `background.js` had no differences from `v2.6.0`. The content-script changes moved existing drag filters ahead of computed-style reads and invoked the existing caption alignment function on width updates. The width selectors, input boundaries and overlay exclusions remained intact. This is historical source evidence, not a new macOS test; see the September 23 reading-style change above.

Two attempts to inspect the user's actual Windows Chrome window through the documented Computer Use API were stopped by its URL-recognition safety check, including after the user switched back to Gemini. No live browser/PWA acceptance result is recorded for September 22. The working source has not been verified against that installation. Local tool diagnostics are retained in `archive/computer-use-url-diagnostic-2026-09-22.md`; no security settings or extension runtime code were changed to work around the tool error.

## September 19 verification record

Recorded September 19, 2026 (America/New_York). This table distinguishes the working source, synthetic fixtures, and observations of an already-installed extension. It is not a claim of universal compatibility or a release sign-off.

Local environment: Windows 11, `Windows_NT 10.0.26200 x64`; Node.js `24.19.0`; Google Chrome `153.0.8010.48`. The working manifest remains `2.8.0` / `2.8.0-rc.1`; changes are uncommitted and no new package or release was made during this continuation.

| Area | Evidence and outcome | Limit |
|---|---|---|
| Settings, scoped CSS, initialization, background injection | All four existing non-packaging Node scripts passed against the working source; the old unsupported-Japanese assertion was updated for the newly supported Japanese/Spanish languages while retaining French fallback | Mocked APIs/DOM; does not establish real startup behavior |
| Message width and protected UI | Existing real-Chrome synthetic fixture: 73 width combinations passed; caption scenario passed for message, duplicate storage, and storage-only changes | Windows synthetic DOM; not a macOS or live-Gemini certification |
| Slider persistence, custom preset text, numeric units | Existing isolated popup checks reproduced and verified the fixes | Focused local flows; not a claim to have explored every interaction |
| Task presets and undo | Two integrated flows with the unpacked working source and real `storage.sync` / `storage.local`: apply, close/reopen, restore, repeated apply, custom range clamping, pending slider change, and unrelated preference preservation passed | One locally stored previous task layout; not a general settings-history feature |
| Six interface languages | Existing popup-language check passed English, Simplified/Traditional Chinese, Korean, Japanese, Spanish manual switching; Korean/Japanese/Spanish automatic selection; French fallback; Traditional Chinese keyboard selection | Korean/Japanese/Spanish text is machine-assisted and awaits native-speaker review |
| Local help | English/Chinese/Korean checked earlier; Japanese/Spanish at 400px and 1000px checked with real diagnostic generation, 27 localized elements, zero console errors and visual inspection; no horizontal page overflow | Layout/loading checks do not establish native-language phrasing quality |
| Long conversations | Fixed local benchmark at 100/500 question–answer pairs; median drag-phase task time reduced 41.8% / 36.5% | Synthetic CPU observation, not overall Gemini speed or absence of leaks; see [method and full results](performance.md) |
| App-mode install after page load | Real headed app window with the source retargeted only in a temporary copy to a local stand-in: installation applied 1000px width to the already-open page; storage and message updates took effect without a reload | Tests install-time recovery with real extension APIs, not actual Gemini or a system PWA cold launch |
| PWA cold start | **Not verified in this continuation** | Official CfT `153.0.8010.52` could start but its sandbox denied executable access (`0x5`); network service crashed before local page loading. No sandbox/ACL changes were made and no cold-start result was recorded as a pass |
| Actual Gemini conversation | Observed the existing installed extension at 1200px: reply, table and inner input were 1200px wide; code used `pre-wrap` and fit its region | Installed version was not read/reloaded, so this is an observation of that installation, not acceptance of all working-source changes |
| Actual Drive picker | Opened and closed the picker; visible 1362 × 842 iframe fit inside a 2048 × 991 viewport | No file selected/uploaded; selected-file Add button remains unverified |
| Reading-layout experiment | Both sample texts, uniform/mixed widths, font size, code wrapping, reset and narrow-screen scrolling checked; generated copyable JSON matched the selected sample/layout/font and entered notes; no browser console errors | A separate [synthetic study tool](lab/README.md), not a Gemini feature or completed human study. Browser-managed file saving was not confirmed; the visible record can be copied |
| macOS, Notebook Sources/attachment, file dragging on the live site, Deep Research | **No new real-device/live-flow sign-off** | Existing PR #10 response-width selectors and CSS remain intact. An affected device and live page are needed for these claims |
| Native Gemini desktop app / Chrome built-in Gemini panel | Outside the extension's current scope | Manifest targets `https://gemini.google.com/*`; no native-client integration exists |

The install-live report observed width by 3083ms after starting its sequence, followed by the two setting changes at 3103ms and 3123ms. These are probe timestamps, not performance promises. The same page ID remained throughout. Detailed local evidence is retained under ignored `archive/`, including `pwa-validation-2026-09-19.md` and `pwa-install-live-results.json`; those files are not public prerequisites.

For repeatable source checks, see [engineering instructions](engineering.md). For the live flows still needed before a layout release, use that document's manual checklist and record the actual OS/browser/extension versions. Repeatedly running the Windows fixture cannot close the macOS or cold-start gaps.
