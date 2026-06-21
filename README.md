English | [中文](./README.zh-CN.md)

# Wider Gemini

[![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)](#)
[![GitHub Release](https://img.shields.io/github/v/release/Planetes1mal/wider-gemini?label=release)](https://github.com/Planetes1mal/wider-gemini/releases)
[![Platform](https://img.shields.io/badge/platform-Chrome-blue.svg)](https://www.google.com/chrome/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **🎉 Now Available on Chrome Web Store!**  
> Get it from [Chrome Web Store](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed)  
> **Offline / manual installs:** Packages are on [GitHub Releases](https://github.com/Planetes1mal/wider-gemini/releases)

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
- **User message full width** — Optional toggle to make user messages fill the conversation width and left-align (matching AI responses) instead of shrinking into a right-aligned bubble.
- **Separate editable presets** — Keep separate preset values for `px` and `%`, edit preset labels and values, or reset them to defaults.
- **Code block wrapping** — Optional wrapping so long code lines do not require horizontal scrolling.
- **Auto-refresh** — Optionally reload open Gemini tabs after you change settings so they pick up new values immediately.
- **Persistent settings** — Width unit, width value, reading density, wrap preference, range, and presets are saved for the next session.

## Requirements

- A **Chromium-based browser** that supports Chrome extensions (e.g. Google Chrome).
- The extension only runs on **[Google Gemini](https://gemini.google.com/)** (`https://gemini.google.com/*`).

## Installation

### Chrome Web Store (recommended)

1. Open the [Chrome Web Store listing](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed).
2. Click **Add to Chrome**, then confirm **Add extension**.

### GitHub Releases

1. Open [Releases](https://github.com/Planetes1mal/wider-gemini/releases) and download the latest `wider-gemini-*.zip` under **Assets**.
2. Unzip the downloaded file. The folder root must contain `manifest.json`.
3. Open `chrome://extensions/`, turn on **Developer mode**, click **Load unpacked**, and select that folder.

### From source

1. Clone this repository or download the repository ZIP from GitHub.
2. Open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the repository root (the folder that contains `manifest.json`).

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

5. Set **min / max width** in the range fields to change the slider span (defaults align with the extension’s supported range).
6. Expand **Manage presets** to customize preset labels and values for the currently selected unit. `px` and `%` presets are stored separately.

## Development

There is **no build step** or package manager: the project is vanilla HTML, CSS, and JavaScript (Chrome **Manifest V3**). Follow the patterns in the existing source files (structure, naming, and `chrome.*` usage).

- **Windows store / release ZIP:** run `package.bat` in the repo root to generate `wider-gemini-<version>.zip` (same layout as the Chrome Web Store upload and GitHub **Assets**).
- **GitHub Release:** bump `manifest.json`, update the README version badges, add a `## x.y.z` entry to `CHANGELOG.md`, commit and push `main`, then push tag `vX.Y.Z` (must match `manifest.json`). Actions creates the release from the matching changelog section and attaches `wider-gemini-X.Y.Z.zip`.
- **Chrome Web Store:** upload the same ZIP from the GitHub Release assets to the Chrome Web Store manually.

On a Gemini tab, the content script exposes helpers on `window.widerGeminiDebug` (for example `getCurrentWidth()`, `findDragElements()`, `applyDragStyles()`). Use the browser **Developer tools** console.

## Repository layout

| Path | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (MV3) |
| `settings-utils.js` | Shared settings normalization for popup and content scripts |
| `gemini-content.js`, `gemini-content.css` | Content script on `gemini.google.com` |
| `popup.html`, `popup.js`, `popup.css` | Toolbar popup |
| `_locales/` | i18n (`en`, `zh_CN`) |
| `icons/` | Toolbar and store icons |
| `package.bat` | Packages a store-ready ZIP on Windows |
| `CHANGELOG.md` | Release notes; GitHub Release body is extracted from here |

## Privacy

- Adjusts **layout and styling** on Gemini only; **no** analytics, telemetry, or calls to third-party servers for this extension’s features.
- Uses **`chrome.storage`** to keep your settings (and **sync** if your profile syncs extension data).
- Does **not** send your prompts or replies to the extension author.

## License

[MIT License](./LICENSE)

## Contributing

Issues and pull requests are welcome.
