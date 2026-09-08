# Changelog

All notable changes to Wider Gemini are documented in this file.

Release notes on GitHub are generated from the matching `## <release-version>` section when a `v<release-version>` tag is pushed. Candidate versions such as `2.6.0-rc.1` are marked as prereleases.

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
