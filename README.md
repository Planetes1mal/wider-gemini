# Wider Gemini

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](#)
[![JavaScript](https://img.shields.io/badge/logo-javascript-blue?logo=javascript)](#)
[![License：MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个用于调节 Google Gemini 对话界面宽度的 Chrome 浏览器插件。

## 功能特点

- 🎯 **自定义宽度调节**：通过滑块或预设按钮轻松调整 Gemini 对话区域的宽度
- 📝 **代码自动换行**：可开关的代码块自动换行功能，提升长代码的阅读体验
- 🔄 **自动刷新**：调整设置后自动刷新所有 Gemini 标签页，无需手动刷新
- 💾 **自动保存设置**：设置会自动保存，下次访问时自动应用
- 🎨 **美观的界面**：现代化的渐变设计，操作简单直观
- ⚡ **即时生效**：调整宽度后立即应用到所有 Gemini 标签页
- 🔒 **不影响其他元素**：只修改对话区域宽度，网页其他元素保持不变

## 安装方法：开发者模式安装（本地）

1. 下载或克隆此项目到本地
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目文件夹
6. 安装完成！

## 使用说明

### 宽度调整

1. 安装插件后，访问 [Google Gemini](https://gemini.google.com/)
2. 点击浏览器工具栏中的插件图标
3. 使用滑块调整宽度（700px - 1350px）
4. 或点击预设按钮快速切换:
   - **窄**：800px
   - **默认**：1000px
   - **更宽**：1200px
   - **超宽**：1350px

### 代码换行

1. 在插件弹窗中找到「代码区域自动换行」开关
2. 开启后，Gemini 回答中的代码块将自动换行，无需横向滚动
3. 关闭后，代码块保持原样，显示横向滚动条

### 自动刷新

- ✨ 调整宽度或切换代码换行选项后，所有打开的 Gemini 标签页会**自动刷新**
- 🎯 拖动滑块时使用防抖机制，停止拖动 0.5 秒后才刷新，避免频繁刷新
- 💫 刷新时会显示动画提示，让你知道设置正在应用

## 文件结构

```
wider-gemini/
├── manifest.json       # 插件配置文件
├── gemini-content.js   # 内容脚本 - 注入到 Gemini 页面
├── gemini-content.css  # 样式调整
├── popup.html          # 弹出窗口界面
├── popup.css           # 弹出窗口样式
├── popup.js            # 弹出窗口逻辑
├── icons/              # 图标资源
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg
├── archive/            # 样式分析文件存档
└── README.md           # 说明文档
```

## 开发说明

### 本地调试

1. 修改代码后，在 `chrome://extensions/` 页面点击刷新按钮
2. 刷新 Gemini 页面即可看到效果

### 代码换行实现原理

代码换行功能通过动态添加 CSS 类实现：

1. 开启时，在 `<body>` 标签添加 `code-wrap-enabled` 类
2. CSS 规则将代码块的 `white-space` 从 `pre` 改为 `pre-wrap`
3. 关闭时移除该类，恢复默认的横向滚动行为

### 自动刷新实现原理

自动刷新功能通过 Chrome Extension API 实现：

1. 设置更新时，使用 `chrome.tabs.query` 查找所有 Gemini 标签页
2. 调用 `chrome.tabs.reload` 自动刷新这些标签页
3. 拖动滑块时使用防抖（debounce）机制，避免频繁刷新

### 修改默认宽度

在 `gemini-content.js` 中修改默认值:

```javascript
const width = result.chatWidth || 1000; // 修改这里的 1000
```

### 修改宽度范围

在 `popup.html` 中修改滑块范围:

```html
<input type="range" id="widthSlider" min="700" max="1350" step="50">
```

## 更新日志

### v1.2.0 (2025-10-19)
- ✨ **新增自动刷新功能**：调整设置后自动刷新所有 Gemini 标签页
- 🎯 **防抖优化**：拖动滑块时避免频繁刷新，提升体验
- 💫 **刷新提示**：添加视觉反馈，显示页面刷新状态

### v1.1.0 (2025-10-19)
- ✨ 新增代码块自动换行功能
- 🎨 优化插件弹窗界面设计
- 🐛 修复输入框区域按钮溢出问题
- 📝 完善文档说明

### v1.0.0
- 🎉 初始版本发布
- 🎯 支持对话区域宽度调整
- 💾 支持设置自动保存

## 许可证

[MIT License](./LICENSE)

## 反馈与贡献

欢迎提交 Issue 和 Pull Request!

---

**注意**：此插件仅修改页面样式，不收集任何用户数据，不影响 Gemini 的功能。
