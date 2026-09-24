# Changelog

All notable changes to Wider Gemini are documented in this file.

Release notes on GitHub are generated from the matching `## <release-version>` section when a `v<release-version>` tag is pushed. Candidate versions such as `2.6.0-rc.1` are marked as prereleases.

## Unreleased

### Other

- Redesigned the 16px, 48px, and 128px extension icons, with editable SVG sources and a rendering script.
- Updated all three READMEs with full-page screenshots of the same Gemini conversation at 700px and 1200px, with the account avatar removed.

## 2.8.0 (2026-09-24)

### Fixes

- Base automatic reading density on each message's native spacing, with gradual low-density steps. Font-only changes preserve native paragraph gaps and proportional line height; manual spacing still supports an exact 0px gap.
- Keep saved Auto density percentages, interpreted using the new relative curve; saved explicit manual spacing values are unchanged.
- Save width, text size, and reading density when a slider is released, so closing the popup immediately does not discard the change.
- Preserve literal custom preset names and keep default preset names translated after editing or resetting presets.
- Update both numeric width inputs to the selected unit's limits, so valid percentage widths are accepted.
- Realign image captions when conversation width changes, including settings received from another tab.
- Avoid reading computed styles for unrelated elements during file dragging. Existing drag behavior and width rules are preserved.

### Features

- Added task presets for long reading, tables, code, and large text, with a settings preview, explicit Apply, and one previous layout that can be restored on the same device after reopening the popup. Custom width limits and unrelated preferences are preserved.
- Added local help and feedback with troubleshooting and optional issue, source, and review links. The popup and help support English, Simplified Chinese, Traditional Chinese, Korean, Japanese, and Spanish, with browser-language matching and manual selection. Korean, Japanese, and Spanish translations are machine-assisted; native-speaker improvements are welcome.
- Added a diagnostic settings preview that users can copy into a bug report. It contains extension/browser versions and layout preferences, without conversations, page URLs, titles, or custom preset names. Reports are not sent automatically.

### Other

- Added reproducible long-conversation performance measurements, a dated compatibility record, and engineering case studies for startup injection, Drive overlay boundaries, browser regressions, and release traceability.
- Added local CSV/GitHub measurement tools, an initial traffic baseline, and English/Traditional Chinese reading guides. No extension telemetry is added.
- Added a separate local reading-layout experiment with two synthetic samples and a blank participant worksheet; mixed prose/table widths are not part of the extension.
- Added `--skip-packaging` to the test runner for internal iterations; the default CI and release suite is unchanged.
- Added the existing regression checks to the source tree, CI before release packaging, and contribution and compatibility documentation.
- Preserved PR #10's conversation-width, input, upload, and overlay boundaries while changing the reading-density/font-size mechanism.

The [dated compatibility record](https://github.com/Planetes1mal/wider-gemini/blob/v2.8.0/docs/compatibility.md) distinguishes current-source unit and isolated Windows Chrome synthetic-layout checks from outstanding live Gemini, system PWA cold-start, and macOS verification. This release does not claim new acceptance of those live/device flows.

If you manually installed a 2.8.0 release candidate, replace/reload it with the stable files; Chrome compares the numeric version and does not automatically upgrade that candidate to this build.

## 2.7.0 (2026-09-16)

### Features

- Added Traditional Chinese (Taiwan) to the popup, with automatic browser-language matching and manual selection.

### Other

- Updated the language dropdown and its option list to match the popup's styling.
- Renamed the automatic language option to "Follow browser" to clarify how it works.
- Rewrote the English and Simplified Chinese READMEs, added a Traditional Chinese README, and included a before-and-after screenshot.

## 2.6.0 (2026-09-15)

### Fixes

- Improved width adjustment for Gemini's updated layouts, including response text, code blocks, and tables.
- Improved alignment of message actions, thinking indicators, and image captions.
- Fixed messages and the input bar narrowing while dragging a local file over the input area.

### Other

- Thanks to @PANPEIWEN for the Gemini layout compatibility improvements in [#10](https://github.com/Planetes1mal/wider-gemini/pull/10).

## 2.6.0-rc.1 (2026-09-08)

### Fixes

- Improved width adjustment compatibility with updated Gemini layouts.

Pre-release for testing. Feedback from affected macOS users is welcome.

## 2.5.0 (2026-09-03)

### Features

- Settings changes now apply live in every open Gemini tab and installed app window instead of reloading each tab after every change. A tab is only reloaded as a fallback when it cannot receive the update.

### Fixes

- Fixed the extension not applying when Gemini is opened as an installed Chrome app (PWA) until the page is refreshed. At browser startup the Gemini window can finish loading before the extension does, so it never received the content script; a new background service worker now injects it into any Gemini page that is already open when the extension starts, installs, or updates.

- Fixed the content script initializing twice on every page load (both `DOMContentLoaded` and `load` triggered it), which attached duplicate observers and drag listeners.

### Other

- Added the `scripting` permission and an explicit host permission for `gemini.google.com` for the startup re-injection. The host was already covered by the content script, so this does not add a new permission warning.

## 2.4.0 (2026-08-12)

### Features

- Added a **Font size** control (75–200%) that scales message text, user messages, headings, and code proportionally without zooming the whole page.

- Added a **UI language** setting — the popup follows your browser language with an English fallback for non-Chinese and non-English locales, and you can manually switch between English and Chinese (or back to follow-system).

## 2.3.0 (2026-06-21)

### Features

- Added an optional **User Message Full Width** toggle so user messages fill the conversation width and left-align (keeping their bubble background) to match AI responses.

## 2.2.0 (2026-05-29)

### Features

- Added `px` / `%` width units so Gemini width can adapt to the current browser tab viewport.

- Added reading density controls with compactness, line-height, and paragraph-spacing settings.

### Fixes

- Preserved table, Notebook input, Drive picker, upload, drag-and-drop, and Deep Research layout guardrails during the width settings refactor.

- Fixed preset edit mode layout clipping rows inside the 4-column preset grid.

- Split preset defaults by unit: `px` presets keep the original 800 / 1000 / 1200 / 1350 / 2000 values, while `%` presets default to 50 / 70 / 80 / 90 / 100.

- Fixed reading density `0%` applying extra paragraph and list spacing; default density now leaves Gemini's native message spacing unchanged.

- Fixed reading density compactness mapping so low positive values no longer become looser than Gemini's native spacing, and expanded density styling to Gemini's current message, markdown, user text, table, and code nodes.

### Other

- Updated release packaging so the GitHub Release ZIP includes the shared settings utility used by the extension manifest.

## 2.1.2 (2026-05-24)

### Fixes

- Fixed Notebook Sources button being partially hidden behind the input bar when using custom Gemini widths.

- Fixed notebook input area overlapping page content when attaching files or using input features on notebook pages.

- Scoped input and upload width rules to inner input elements inside `input-container`, preserving native Gemini notebook layout without affecting Drive picker dialogs fixed in v2.1.1.

## 2.1.1 (2026-05-18)

### Fixes

- Fixed Google Drive "Add from Drive" picker layout being clipped when using custom Gemini widths.

- Removed global overlay/dialog width overrides to avoid affecting third-party Gemini dialogs.

## 2.1.0 (2026-03-23)

### Fixes

- Fixed table width not adapting to conversation area width.

- Improved CSS outer container constraint handling.

### Refactor

- Optimized width setting logic.

### Other

- Updated README.md.
