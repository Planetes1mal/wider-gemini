English | [简体中文](./README.zh-CN.md) | [繁體中文](./docs/i18n/README.zh-TW.md)

# Wider Gemini

A Chrome extension for adjusting the width of Gemini conversations. Use the slider or pick a preset to fit the conversation to your screen.

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Install-4285F4)](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed?utm_source=github&utm_medium=readme&utm_campaign=en)
[![GitHub Release 2.8.0](https://img.shields.io/badge/release-v2.8.0-blue)](https://github.com/Planetes1mal/wider-gemini/releases/tag/v2.8.0)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

The same full Gemini conversation at the same window size, with the conversation width set to 700px and then 1200px using Wider Gemini.

![Full Gemini conversation at 700px width](./docs/images/conversation-before.png)

![The same full Gemini conversation at 1200px width](./docs/images/conversation-after.png)

## Features

- **Adjust the width**: Set it in pixels (`px`) or as a percentage of the window (`%`), and save your own presets.
- **Adjust text size and spacing**: Scale text from 75% to 200%, with separate controls for line height and paragraph spacing.
- **Wrap code**: Keep long lines of code within the conversation area.
- **Full-width user messages**: Left-align your messages and give them the full conversation width, just like Gemini's replies.
- **Interface languages**: English, Simplified Chinese, Traditional Chinese, Korean, Japanese, and Spanish. Follow your browser's language or choose one manually. Korean, Japanese, and Spanish translations are machine-assisted; native-speaker improvements are welcome.

Settings are saved automatically, and changes apply immediately to open Gemini pages.

## Installation

Open the [Chrome Web Store listing](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed?utm_source=github&utm_medium=readme&utm_campaign=en) and click **Add to Chrome**.

GitHub releases and Chrome Web Store updates can follow different schedules. For version 2.8.0, use the matching GitHub release below.

<details>
<summary>Manual installation</summary>

1. Download `wider-gemini-*.zip` from the latest stable release on [GitHub Releases](https://github.com/Planetes1mal/wider-gemini/releases).
2. Extract it to a folder you intend to keep. Make sure the folder contains `manifest.json`.
3. Open `chrome://extensions/` and enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the extracted folder.

If you manually installed a 2.8.0 release candidate, replace its files and reload the extension to use the stable build; it will not automatically upgrade from the candidate.

</details>

## Usage

1. Open [Gemini](https://gemini.google.com/) and click the Wider Gemini icon in your browser toolbar.
2. Choose `px` or `%`, then move the width slider or click a preset.
3. Adjust the font size and reading density, or turn on code wrapping as needed.

Use **Manage presets** to edit preset names and widths. `px` and `%` each have their own set of presets. The language selector is at the bottom of the popup.

Use **Task presets** for long reading, tables, code, and large text. Preview the settings, then apply them; **Restore previous settings** restores the previous layout on this device, even after closing the popup. See the [reading guide](./docs/guides/reading-layout.md) for the values and restore behavior.

Use **Help & feedback** at the bottom of the popup for troubleshooting or to preview and copy diagnostic settings. Wider Gemini works on Gemini webpages and Chrome-installed site app windows; it does not change native desktop apps or Chrome’s built-in Gemini panel.

## Privacy

The extension only adjusts page styles on `gemini.google.com`. It does not collect or upload conversations, and it has no analytics or tracking services.

Preferences are saved in Chrome's extension storage. Whether they sync across devices depends on your browser's sync settings. See the [privacy policy](./docs/PRIVACY.md) for details.

## Local development

The project uses vanilla JavaScript, HTML, and CSS. No dependencies or build step are needed.

```bash
git clone https://github.com/Planetes1mal/wider-gemini.git
```

Open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the repository folder. After changing the code, reload the extension and refresh Gemini.

For internal iterations, run `node scripts/test.js --skip-packaging` for the existing unit checks without creating a ZIP. See [Contributing](./CONTRIBUTING.md) for browser and release checks and [Engineering and compatibility](./docs/engineering.md) for layout boundaries.

The [dated compatibility record](./docs/compatibility.md) separates verified source behavior from untested devices. For the experimental comparison of prose and table widths, run `node scripts/reading-lab.js`; this [local reading lab](./docs/lab/README.md) is separate from the extension.

## Feedback and contributions

If something looks wrong, open **Help & feedback** in the popup, copy the diagnostic settings, and include the steps in an [issue](https://github.com/Planetes1mal/wider-gemini/issues/new/choose). Remove private information from screenshots before sharing. Pull requests are welcome.

If you find Wider Gemini useful, a GitHub star helps other people discover it.

Stars are optional. To receive version notifications, use the repository's **Watch → Custom → Releases** setting; see [GitHub's notification guide](https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications).

Licensed under the [MIT License](./LICENSE).
