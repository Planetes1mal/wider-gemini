English | [简体中文](./README.zh-CN.md) | [繁體中文](./docs/i18n/README.zh-TW.md)

# Wider Gemini

A Chrome extension for adjusting the width and reading layout of Gemini and ChatGPT conversations. Each site remembers its own settings.

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Install-4285F4)](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed?utm_source=github&utm_medium=readme&utm_campaign=en)
[![Internal candidate 3.0.0-rc.2](https://img.shields.io/badge/internal-3.0.0--rc.2-orange)](./CHANGELOG.md)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

The same full Gemini conversation at the same window size, with the conversation width set to 700px and then 1200px using Wider Gemini.

![Full Gemini conversation at 700px width](./docs/images/conversation-before.png)

![The same full Gemini conversation at 1200px width](./docs/images/conversation-after.png)

This branch is the internal **3.0.0-rc.2** candidate, including ChatGPT width and reading support, message navigation, a per-site Enable switch, and the site-tab popup. This candidate is distributed from the `chatgpt-width-support` branch without a release tag or GitHub Release. It requires manual installation; signed-in validation of the latest navigation changes remains pending.

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

For **3.0.0-rc.2**, use the manual steps below. The [Chrome Web Store listing](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed?utm_source=github&utm_medium=readme&utm_campaign=en) and [stable GitHub releases](https://github.com/Planetes1mal/wider-gemini/releases) are separate distribution channels; installing from them does not install this internal candidate.

<details>
<summary>Manual installation</summary>

1. Check out the `chatgpt-width-support` branch, or download its source ZIP from GitHub's **Code → Download ZIP** menu and extract it.
2. Keep the complete folder containing `manifest.json`, `src/`, `_locales/`, and `icons/`.
3. Open `chrome://extensions/` and enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the extracted folder.

To update a manually installed candidate, replace its files and reload the extension. Chrome compares the numeric version (`3.0.0`), so later candidates and the final `3.0.0` build also require manual replacement and reload.

</details>

## Usage

1. Open [Gemini](https://gemini.google.com/) or [ChatGPT](https://chatgpt.com/) and click the Wider Gemini icon in your browser toolbar.
2. Select the site tab, choose `px` or `%`, then move the width slider or click a preset.
3. On Gemini, expand **Reading & typography** to adjust the font size and reading density, or turn on code wrapping as needed.

Expand **Range & presets** for width limits and **Manage presets**. Each site and unit has its own presets. The language selector is at the bottom of the popup.

On Gemini, use **Task presets** for long reading, tables, code, and large text. Preview the settings, then apply them; **Restore previous settings** restores the previous Gemini layout on this device, even after closing the popup. See the [reading guide](./docs/guides/reading-layout.md) for the values and restore behavior.

Use **Help & feedback** at the bottom of the popup for troubleshooting or to preview and copy diagnostic settings. Wider Gemini targets Gemini and ChatGPT webpages, including Chrome-installed site app windows; it does not change native desktop apps or Chrome’s built-in Gemini panel. See the [compatibility record](./docs/compatibility.md) for the flows actually verified.

## Privacy

Gemini access is required. ChatGPT access is optional: select ChatGPT in the popup and click **Allow ChatGPT access**. Chrome asks for permission before the extension applies to ChatGPT. The extension uses `activeTab` to identify the current site when you open the toolbar popup, `storage` for preferences, and `scripting` to register and restore content scripts. It does not collect or upload conversations, and it has no analytics or tracking services.

Preferences are saved in Chrome's extension storage. Whether they sync across devices depends on your browser's sync settings. See the [privacy policy](./docs/PRIVACY.md) for details.

## Local development

The project uses vanilla JavaScript, HTML, and CSS. No dependencies or build step are needed.

```bash
git clone https://github.com/Planetes1mal/wider-gemini.git
```

Open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the repository folder. After changing the code, reload the extension and refresh the affected Gemini or ChatGPT page.

For internal iterations, run `node scripts/test.js --skip-packaging` for the existing unit checks without creating a ZIP. See [Contributing](./CONTRIBUTING.md) for browser and release checks and [Engineering and compatibility](./docs/engineering.md) for layout boundaries.

The [dated compatibility record](./docs/compatibility.md) separates verified source behavior from untested devices. For the experimental comparison of prose and table widths, run `node scripts/reading-lab.js`; this [local reading lab](./docs/lab/README.md) is separate from the extension.

## Feedback and contributions

If something looks wrong, open **Help & feedback** in the popup, copy the diagnostic settings, and include the steps in an [issue](https://github.com/Planetes1mal/wider-gemini/issues/new/choose). Remove private information from screenshots before sharing. Pull requests are welcome.

If you find Wider Gemini useful, a GitHub star helps other people discover it.

Stars are optional. To receive version notifications, use the repository's **Watch → Custom → Releases** setting; see [GitHub's notification guide](https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications).

Licensed under the [MIT License](./LICENSE).
