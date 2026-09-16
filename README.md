English | [简体中文](./README.zh-CN.md) | [繁體中文](./docs/i18n/README.zh-TW.md)

# Wider Gemini

A Chrome extension for adjusting the width of Gemini conversations. Use the slider or pick a preset to fit the conversation to your screen.

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Install-4285F4)](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed)
[![GitHub Release](https://img.shields.io/github/v/release/Planetes1mal/wider-gemini?label=release)](https://github.com/Planetes1mal/wider-gemini/releases)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

![Gemini conversation before and after widening](./docs/images/wider-gemini-preview.jpg)

Top: default width. Bottom: a wider conversation with Wider Gemini.

## Features

- **Adjust the width**: Set it in pixels (`px`) or as a percentage of the window (`%`), and save your own presets.
- **Adjust text size and spacing**: Scale text from 75% to 200%, with separate controls for line height and paragraph spacing.
- **Wrap code**: Keep long lines of code within the conversation area.
- **Full-width user messages**: Left-align your messages and give them the full conversation width, just like Gemini's replies.
- **Three interface languages**: English, Simplified Chinese, and Traditional Chinese. Follow your browser's language or choose one manually.

Settings are saved automatically, and changes apply immediately to open Gemini pages.

## Installation

Open the [Chrome Web Store listing](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed) and click **Add to Chrome**.

<details>
<summary>Manual installation</summary>

1. Download `wider-gemini-*.zip` from the latest stable release on [GitHub Releases](https://github.com/Planetes1mal/wider-gemini/releases).
2. Extract it to a folder you intend to keep. Make sure the folder contains `manifest.json`.
3. Open `chrome://extensions/` and enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the extracted folder.

</details>

## Usage

1. Open [Gemini](https://gemini.google.com/) and click the Wider Gemini icon in your browser toolbar.
2. Choose `px` or `%`, then move the width slider or click a preset.
3. Adjust the font size and reading density, or turn on code wrapping as needed.

Use **Manage presets** to edit preset names and widths. `px` and `%` each have their own set of presets. The language selector is at the bottom of the popup.

## Privacy

The extension only adjusts page styles on `gemini.google.com`. It does not collect or upload conversations, and it has no analytics or tracking services.

Preferences are saved in Chrome's extension storage. Whether they sync across devices depends on your browser's sync settings. See the [privacy policy](./docs/PRIVACY.md) for details.

## Local development

The project uses vanilla JavaScript, HTML, and CSS. No dependencies or build step are needed.

```bash
git clone https://github.com/Planetes1mal/wider-gemini.git
```

Open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the repository folder. After changing the code, reload the extension and refresh Gemini.

## Feedback and contributions

If something looks wrong, open an [issue](https://github.com/Planetes1mal/wider-gemini/issues) with a screenshot, your browser version, and the extension version to help reproduce it. Pull requests are welcome.

Licensed under the [MIT License](./LICENSE).
