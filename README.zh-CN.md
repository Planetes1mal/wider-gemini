[English](./README.md) | 中文

# Wider Gemini

[![Version](https://img.shields.io/badge/version-2.0.2-blue.svg)](#)
[![JavaScript](https://img.shields.io/badge/logo-javascript-blue?logo=javascript)](#)
[![License：MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **🎉 现已上架 Chrome 应用商店！**
> 直接从 [Chrome 应用商店](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed?utm_source=item-share-cb) 获取

让 Google Gemini 的对话界面更宽。

## 功能

- **自定义宽度**：用滑块或预设按钮调整对话区域宽度（700px - 1350px）
- **代码自动换行**：开关代码块换行，长代码不用横向滚动
- **自动刷新**：调整设置后自动刷新 Gemini 页面
- **自动保存**：设置保存在本地，下次打开直接生效
- **响应式设计**：小窗口下自动适应，不会出现空白或截断

## 安装

### 推荐：从 Chrome 应用商店安装（最简单）

1. 访问 [Chrome 应用商店页面](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed?utm_source=item-share-cb)
2. 点击「添加到 Chrome」
3. 确认安装

### 备选：手动安装（开发者模式）

1. 下载或克隆这个项目
2. 打开 Chrome，访问 `chrome://extensions/`
3. 打开右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目文件夹

## 使用

### 调整宽度

打开 [Google Gemini](https://gemini.google.com/)，点击浏览器工具栏的插件图标。

用滑块调整宽度，或点击预设按钮：
- **窄**：800px
- **默认**：1000px
- **更宽**：1200px
- **超宽**：1350px

### 代码换行

在插件弹窗中打开「代码区域自动换行」开关，代码块就会自动换行。关闭后恢复横向滚动条。

### 自动刷新

调整设置后，所有 Gemini 页面会自动刷新。拖动滑块时有 0.5 秒防抖，避免频繁刷新。

## 开发

### 本地调试

修改代码后，在 `chrome://extensions/` 点击刷新按钮，然后刷新 Gemini 页面。

### 实现原理

**宽度调整**：通过 CSS 变量 `--gemini-chat-width` 控制对话容器的 `max-width`。JavaScript 监听 DOM 变化，动态应用样式到新增元素。

**代码换行**：给 `<body>` 添加 `code-wrap-enabled` 类，CSS 将代码块的 `white-space` 从 `pre` 改为 `pre-wrap`。

**自动刷新**：用 `chrome.tabs.query` 找到所有 Gemini 页面，调用 `chrome.tabs.reload` 刷新。滑块拖动时用防抖机制避免频繁刷新。

### 修改配置

修改默认宽度（`gemini-content.js`）：
```javascript
const width = result.chatWidth || 1000; // 改这里
```

修改宽度范围（`popup.html`）：
```html
<input type="range" id="widthSlider" min="700" max="1350" step="50">
```

## 许可证

[MIT License](./LICENSE)

## 贡献

欢迎提交 Issue 和 Pull Request。

---

这个插件只修改页面样式，不收集任何数据，不影响 Gemini 功能。

