English | [中文](./README.zh-CN.md)

# Wider Gemini

[![Version](https://img.shields.io/badge/version-2.0.2-blue.svg)](#)
[![JavaScript](https://img.shields.io/badge/logo-javascript-blue?logo=javascript)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Make Google Gemini's conversation interface wider.

## Features

- **Custom Width**: Adjust chat width with slider or preset buttons (700px - 1350px)
- **Code Auto Wrap**: Toggle code block wrapping, no horizontal scrolling for long code
- **Auto Refresh**: Automatically refresh Gemini pages after adjusting settings
- **Auto Save**: Settings saved locally, take effect immediately on next open
- **Responsive Design**: Automatically adapts to small windows, no blank spaces or truncation

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the project folder

## Usage

### Adjust Width

Open [Google Gemini](https://gemini.google.com/), click the extension icon in the browser toolbar.

Adjust width with the slider or click preset buttons:
- **Narrow**: 800px
- **Default**: 1000px
- **Wider**: 1200px
- **Ultra**: 1350px

### Code Wrapping

Toggle "Code Auto Wrap" in the extension popup to enable automatic code wrapping. Disable it to restore horizontal scrolling.

### Auto Refresh

After adjusting settings, all Gemini pages will automatically refresh. There's a 0.5 second debounce when dragging the slider to avoid frequent refreshes.

## Development

### Local Debugging

After modifying code, click the refresh button in `chrome://extensions/`, then refresh the Gemini page.

### Implementation Details

**Width Adjustment**: Controls the `max-width` of conversation containers via CSS variable `--gemini-chat-width`. JavaScript listens for DOM changes and dynamically applies styles to new elements.

**Code Wrapping**: Adds `code-wrap-enabled` class to `<body>`, CSS changes code block `white-space` from `pre` to `pre-wrap`.

**Auto Refresh**: Uses `chrome.tabs.query` to find all Gemini pages, calls `chrome.tabs.reload` to refresh. Debounce mechanism prevents frequent refreshes when dragging the slider.

### Configuration

Change default width (`gemini-content.js`):
```javascript
const width = result.chatWidth || 1000; // Change here
```

Change width range (`popup.html`):
```html
<input type="range" id="widthSlider" min="700" max="1350" step="50">
```

## License

[MIT License](./LICENSE)

## Contributing

Issues and Pull Requests are welcome.

---

This extension only modifies page styles, collects no data, and does not affect Gemini functionality.
