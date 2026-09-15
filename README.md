English | [中文](./README.zh-CN.md)

# Wider Gemini

[![Version](https://img.shields.io/badge/version-2.6.0-blue.svg)](#)
[![GitHub Release](https://img.shields.io/github/v/release/Planetes1mal/wider-gemini?label=stable)](https://github.com/Planetes1mal/wider-gemini/releases)
[![Platform](https://img.shields.io/badge/platform-Chrome-blue.svg)](https://www.google.com/chrome/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **🎉 Now Available on Chrome Web Store!**  
> Get it from [Chrome Web Store](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed)  
> **Offline / manual installs:** Packages are on [GitHub Releases](https://github.com/Planetes1mal/wider-gemini/releases)

This source checkout is **2.6.0**, a stable release with Gemini layout compatibility fixes. Chrome Web Store availability follows the store's review and publication process; use [GitHub Releases](https://github.com/Planetes1mal/wider-gemini/releases) for manual installation.

Make Google Gemini's conversation interface wider with a custom width slider and presets.

## Table of contents

- [Wider Gemini](#wider-gemini)
  - [Table of contents](#table-of-contents)
  - [Features](#features)
  - [Requirements](#requirements)
  - [Installation](#installation)
    - [Chrome Web Store (recommended)](#chrome-web-store-recommended)
    - [GitHub Releases](#github-releases)
    - [From source](#from-source)
    - [Upgrading from 2.6.0-rc.1](#upgrading-from-260-rc1)
  - [Usage](#usage)
  - [Development](#development)
  - [Repository layout](#repository-layout)
  - [Privacy](#privacy)
  - [License](#license)
  - [Contributing](#contributing)

## Features

- **Wider chat column** — Control the main conversation width with a slider (within a configurable range) or one-click presets.
- **Responsive width units** — Use fixed pixels or viewport percentages so Gemini can adapt to the current tab width.
- **Reading density controls** — Tune compactness, line height, and paragraph spacing for denser large-screen reading.
- **Font size control** — Scale message text, headings, and code from 75% to 200% without zooming the whole page.
- **UI language** — Follow your browser language (English fallback for other locales) or manually switch the popup between English and Chinese.
- **User message full width** — Optional toggle to make user messages fill the conversation width and left-align (matching AI responses) instead of shrinking into a right-aligned bubble.
- **Separate editable presets** — Keep separate preset values for `px` and `%`, edit preset labels and values, or reset them to defaults.
- **Code block wrapping** — Optional wrapping so long code lines do not require horizontal scrolling.
- **Live updates** — Changes apply immediately to every open Gemini tab and installed app window without reloading; a tab is only reloaded as a fallback when it cannot be reached.
- **Persistent settings** — Width unit, width value, reading density, font size, language, wrap preference, range, and presets are saved for the next session.

## Requirements

- A **Chromium-based browser** that supports Chrome extensions (e.g. Google Chrome).
- The extension only runs on **[Google Gemini](https://gemini.google.com/)** (`https://gemini.google.com/*`).

## Installation

### Chrome Web Store (recommended)

1. Open the [Chrome Web Store listing](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed).
2. Click **Add to Chrome**, then confirm **Add extension**.

### GitHub Releases

1. Open [Releases](https://github.com/Planetes1mal/wider-gemini/releases), choose the latest stable release, and download `wider-gemini-*.zip` under **Assets**. Releases marked **Pre-release** are for testing.
2. Unzip the downloaded file. The folder root must contain `manifest.json`.
3. Open `chrome://extensions/`, turn on **Developer mode**, click **Load unpacked**, and select that folder.

### From source

1. Clone this repository or download the repository ZIP from GitHub.
2. Open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the repository root (the folder that contains `manifest.json`).

### Upgrading from 2.6.0-rc.1

The candidate and stable release both use numeric `version: "2.6.0"`. Chrome does not use `version_name` to determine upgrades, so manually installed candidates do not automatically update to this stable release.

1. Download `wider-gemini-2.6.0.zip` from [Releases](https://github.com/Planetes1mal/wider-gemini/releases/tag/v2.6.0).
2. Unzip it into the folder used for the candidate, replacing the existing extension files.
3. Open `chrome://extensions/`, find the unpacked Wider Gemini installation, and click **Reload**.
4. Refresh Gemini. Keep only one Wider Gemini installation enabled.

To return to the store version, disable or remove the unpacked copy and re-enable the Chrome Web Store installation, then refresh Gemini. Store updates become available after publication.

## Usage

1. Open [Google Gemini](https://gemini.google.com/).
2. Click the extension icon in the toolbar to open the popup.
3. Choose **px** or **%**, then adjust **width** with the slider or a **preset** button. Default preset widths:

| Preset   | px | % |
|----------|---:|--:|
| Narrow   | 800px | 50% |
| Default  | 1000px | 70% |
| Wider    | 1200px | 80% |
| Ultra    | 1350px | 90% |
| Max      | 2000px | 100% |

4. Toggle **code auto wrap** if you want code blocks to wrap instead of scrolling horizontally.

Toggle **user message full width** to make your messages fill the conversation width and left-align like the AI responses.

Use **Reading density** to adjust compactness, or expand **Advanced spacing** to tune line height and paragraph spacing.

Use **Font size** to scale message text between 75% and 200% (100% keeps Gemini's native size).

Use the **Language** section at the bottom to switch the popup between following your system language, English, and Chinese.

5. Set **min / max width** in the range fields to change the slider span (defaults align with the extension’s supported range).
6. Expand **Manage presets** to customize preset labels and values for the currently selected unit. `px` and `%` presets are stored separately.

## Development

There is **no build step** or package manager: the project is vanilla HTML, CSS, and JavaScript (Chrome **Manifest V3**). Follow the patterns in the existing source files (structure, naming, and `chrome.*` usage).

- **Packaging:** `scripts/package.ps1` is the shared ZIP packager; it does not require Node.js. On Windows, run `package.bat` in the repository root. On macOS / Linux with PowerShell installed, run `pwsh -File ./scripts/package.ps1`. Both produce `wider-gemini-<release-version>.zip` with `manifest.json` at the ZIP root. For this release the filename is `wider-gemini-2.6.0.zip`.
- **Versioning:** Chrome's `manifest.json` `version` must be numeric. For a candidate, set `version` to the upcoming stable version and `version_name` to its prerelease name, such as `2.6.0` and `2.6.0-rc.1`. The release version is `version_name` when present, otherwise `version`. For the final `2.6.0` release, remove `version_name` and retain `version: "2.6.0"`.
- **GitHub Release:** update the manifest, both README version badges, and a matching `## <release-version>` section in `CHANGELOG.md`. After committing and pushing `main`, push the matching tag, for example `v2.6.0`. Actions validates the tag, runs the same packager using `pwsh`, extracts the matching changelog section, and attaches the ZIP. Candidate tags create a **Pre-release** and do not replace the latest stable release.
- **Chrome Web Store:** publish only a tested stable release, uploading the same ZIP as the stable GitHub Release asset. Candidates stay out of the store; manual testers must replace/reload them or switch back to the store installation as described above.

On a Gemini tab, the content script exposes helpers on `window.widerGeminiDebug` (for example `getCurrentWidth()`, `findDragElements()`, `applyDragStyles()`). Use the browser **Developer tools** console.

## Repository layout

| Path | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (MV3) |
| `settings-utils.js` | Shared settings normalization for popup and content scripts |
| `gemini-content.js`, `gemini-content.css` | Content script on `gemini.google.com` |
| `background.js` | Service worker that re-injects the content script into Gemini pages opened before the extension loaded (PWA cold start, install/update) |
| `popup.html`, `popup.js`, `popup.css` | Toolbar popup |
| `_locales/` | i18n (`en`, `zh_CN`) |
| `icons/` | Toolbar and store icons |
| `package.bat` | Windows wrapper for the shared ZIP packager |
| `scripts/package.ps1` | Shared local / GitHub Actions ZIP packaging and release-version validation |
| `CHANGELOG.md` | Release notes; GitHub Release body is extracted from here |

## Privacy

- Adjusts **layout and styling** on Gemini only; **no** analytics, telemetry, or calls to third-party servers for this extension’s features.
- Uses **`chrome.storage`** to keep your settings (and **sync** if your profile syncs extension data).
- Does **not** send your prompts or replies to the extension author.

## License

[MIT License](./LICENSE)

## Contributing

Issues and pull requests are welcome.
