English | [中文](./README.zh-CN.md)

# Wider Gemini

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](#)
[![Platform](https://img.shields.io/badge/platform-Chrome-blue.svg)](https://www.google.com/chrome/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **🎉 Now Available on Chrome Web Store!**  
> Get it from [Chrome Web Store](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed)

Make Google Gemini's conversation interface wider with a custom width slider and presets.

---

## Features

| Feature | Description |
|---------|-------------|
| **Custom Width** | Adjust chat width from 700px to 2000px using slider or presets |
| **Code Auto Wrap** | Toggle code block wrapping, no more horizontal scrolling |
| **Auto Refresh** | Automatically refresh all Gemini pages after settings change |
| **Auto Save** | Settings persist locally, take effect on next page load |
| **Responsive** | Adapts to small windows without blank spaces or truncation |

---

## Installation

### Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store page](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed)
2. Click **Add to Chrome**
3. Click **Add extension** to confirm

### Manual Installation

1. Download this repository as a ZIP
2. Open Chrome, navigate to `chrome://extensions/`
3. Enable **Developer mode** (top-right corner)
4. Click **Load unpacked**
5. Select the project folder

---

## Usage

### Adjust Width

1. Open [Google Gemini](https://gemini.google.com/)
2. Click the extension icon in the browser toolbar
3. Use the slider or click preset buttons:

| Preset | Width |
|--------|-------|
| Narrow | 800px |
| Default | 1000px |
| Wider | 1200px |
| Ultra | 1350px |
| Max | 2000px |

### Code Wrapping

Toggle **Code Auto Wrap** in the popup to enable/disable automatic code wrapping.

### Custom Range

You can set custom min/max width values in the range inputs. The slider will adapt accordingly.

---

## Technical Details

### Architecture

- **Content Script** (`gemini-content.js` + `gemini-content.css`): Injected into Gemini pages to apply width styles
- **Popup** (`popup.js` + `popup.html` + `popup.css`): UI for user settings
- **Manifest** (`manifest.json`): Extension configuration (MV3)

### How It Works

1. **Width Control**: Sets CSS variable `--gemini-chat-width` and applies `max-width` to conversation containers
2. **Code Wrapping**: Toggles `code-wrap-enabled` class on `<body>`, CSS changes `white-space` from `pre` to `pre-wrap`
3. **Auto Refresh**: Uses `chrome.tabs.query` to find all Gemini pages and `chrome.tabs.reload` to refresh

### Debugging

Access debug tools in browser console on Gemini page:

```javascript
window.widerGeminiDebug.findDragElements()  // Find possible drag elements
window.widerGeminiDebug.applyDragStyles()    // Manually apply drag styles
window.widerGeminiDebug.getCurrentWidth()     // Get current width setting
```

---

## Privacy

This extension:
- ✅ Only modifies page styles, no data collection
- ✅ Does not access or store any personal information
- ✅ Does not affect Gemini's core functionality

---

## License

[MIT License](./LICENSE)

---

## Contributing

Issues and Pull Requests are welcome!