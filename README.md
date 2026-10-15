English | [简体中文](./README.zh-CN.md) | [繁體中文](./docs/i18n/README.zh-TW.md)

# Roomy

Formerly **Wider Gemini**.

A Chrome extension for adjusting the width and reading layout of Gemini and ChatGPT conversations. Each site remembers its own settings.

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Install-4285F4)](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed?utm_source=github&utm_medium=readme&utm_campaign=en)
[![GitHub Release 3.0.0](https://img.shields.io/badge/release-v3.0.0-blue)](https://github.com/Planetes1mal/roomy/releases/tag/v3.0.0)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

The same full Gemini conversation at the same window size, with the conversation width set to 700px and then 1200px using Roomy.

![Full Gemini conversation at 700px width](./docs/images/conversation-before.png)

![The same full Gemini conversation at 1200px width](./docs/images/conversation-after.png)

## Features

- **Adjust the width**: Select Gemini or ChatGPT, set pixels (`px`) or a percentage of the window (`%`), and save separate limits and presets for each site.
- **Enable or pause by site**: The Enable switch below the site tabs pauses every effect on that site and restores the original page, while all settings stay editable and saved. A separate width switch turns off only widening. Unrecognized layouts keep their original width, with a notice in the popup for the current page.
- **Adjust text size and spacing**: On both sites, scale message text from 75% to 200% while keeping headings, code, and tables in proportion, tighten spacing with reading density, or set line height and paragraph spacing manually.
- **Message navigation**: A thin column of ticks beside the conversation jumps to your messages on Gemini and ChatGPT, with a short preview and keyboard support. Long conversations show at most 20 ticks around the current message. ChatGPT remembers messages with stable keys as you scroll, without scanning history automatically. Turn it off per site in the popup.
- **Task presets**: Apply a reading, wide, or large-text setup in one step and restore the previous settings for that site.
- **Wrap Gemini code**: Keep long lines of code within the conversation area. ChatGPT keeps its own per-block wrap button.
- **Full-width user messages**: Left-align your messages and give them the full conversation width, just like the replies.
- **Interface languages**: English, Simplified Chinese, Traditional Chinese, Korean, Japanese, and Spanish. Follow your browser's language or choose one manually. Korean, Japanese, and Spanish translations are machine-assisted; native-speaker improvements are welcome.

Settings are saved automatically, and changes apply to open pages for the selected site. At their defaults, the ChatGPT reading controls leave its native text size, spacing, code formatting, and user-message layout unchanged.

## Installation

Open the [Chrome Web Store listing](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed?utm_source=github&utm_medium=readme&utm_campaign=en) and click **Add to Chrome**. If you already use Wider Gemini, Chrome updates it to Roomy automatically and keeps your settings.

GitHub releases and Chrome Web Store updates can follow different schedules. For version 3.0.0, use the matching GitHub release below.

<details>
<summary>Manual installation</summary>

1. Download `wider-gemini-*.zip` from the latest stable release on [GitHub Releases](https://github.com/Planetes1mal/roomy/releases).
2. Extract it to a folder you intend to keep. Make sure the folder contains `manifest.json`.
3. Open `chrome://extensions/` and enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the extracted folder.

If you manually installed a 3.0.0 release candidate, replace its files and reload the extension to use the stable build; it will not automatically upgrade from the candidate.

</details>

## Usage

1. Open [Gemini](https://gemini.google.com/) or [ChatGPT](https://chatgpt.com/) and click the Roomy icon in your browser toolbar.
2. Select the site tab, choose `px` or `%`, then move the width slider or click a preset.
3. On Gemini, expand **Reading & typography** to adjust the font size and reading density, or turn on code wrapping as needed.

After a new install, the popup opens once from the toolbar icon. Click **Allow ChatGPT access** there and confirm Chrome's prompt to turn on ChatGPT. After updating from a version before 3.0, nothing opens: a **NEW** badge appears on the toolbar icon until you next open the popup. Until access is granted, the popup's ChatGPT tab shows a dot and keeps the same button.

Expand **Range & presets** for width limits and **Manage presets**. Each site and unit has its own presets. The language selector is at the bottom of the popup.

On Gemini, use **Task presets** for long reading, tables, code, and large text. Preview the settings, then apply them; **Restore previous settings** restores the previous Gemini layout on this device, even after closing the popup. See the [reading guide](./docs/guides/reading-layout.md) for the values and restore behavior.

Use **Help & feedback** at the bottom of the popup for troubleshooting or to preview and copy diagnostic settings. Roomy targets Gemini and ChatGPT webpages, including Chrome-installed site app windows; it does not change native desktop apps or Chrome’s built-in Gemini panel. See the [compatibility record](./docs/compatibility.md) for the flows actually verified.

## Privacy

Gemini access is required. ChatGPT access is optional: Chrome asks for it only after you click **Allow ChatGPT access** in the popup. The extension uses `activeTab` to identify the current site when you open the toolbar popup, `storage` for preferences, and `scripting` to register and restore content scripts. It does not collect or upload conversations, and it has no analytics or tracking services.

Preferences are saved in Chrome's extension storage. Whether they sync across devices depends on your browser's sync settings. See the [privacy policy](./docs/PRIVACY.md) for details.

## Local development

The project uses vanilla JavaScript, HTML, and CSS. No dependencies or build step are needed.

```bash
git clone https://github.com/Planetes1mal/roomy.git
```

Open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the repository folder. After changing the code, reload the extension and refresh the affected Gemini or ChatGPT page.

For internal iterations, run `node scripts/test.js --skip-packaging` for the existing unit checks without creating a ZIP. See [Contributing](./CONTRIBUTING.md) for browser and release checks and [Engineering and compatibility](./docs/engineering.md) for layout boundaries.

The [dated compatibility record](./docs/compatibility.md) separates verified source behavior from untested devices. For the experimental comparison of prose and table widths, run `node scripts/reading-lab.js`; this [local reading lab](./docs/lab/README.md) is separate from the extension.

## Feedback and contributions

If something looks wrong, open **Help & feedback** in the popup, copy the diagnostic settings, and include the steps in an [issue](https://github.com/Planetes1mal/roomy/issues/new/choose). Remove private information from screenshots before sharing. Pull requests are welcome.

If you find Roomy useful, a GitHub star helps other people discover it.

Stars are optional. To receive version notifications, use the repository's **Watch → Custom → Releases** setting; see [GitHub's notification guide](https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications).

Licensed under the [MIT License](./LICENSE).
