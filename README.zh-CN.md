[English](./README.md) | 中文

# Wider Gemini

[![版本](https://img.shields.io/badge/version-2.1.0-blue.svg)](#)
[![平台](https://img.shields.io/badge/platform-Chrome-blue.svg)](https://www.google.com/chrome/)
[![许可证：MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **🎉 现已上架 Chrome 应用商店！**  
> 从 [Chrome 应用商店](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed) 获取

让 Google Gemini 的对话界面更宽，支持自定义宽度滑块和预设按钮。

---

## 功能

| 功能 | 说明 |
|------|------|
| **自定义宽度** | 使用滑块或预设按钮调整对话宽度（700px - 2000px） |
| **代码自动换行** | 开关代码块换行，无需横向滚动条 |
| **自动刷新** | 调整设置后自动刷新所有 Gemini 页面 |
| **自动保存** | 设置本地保存，下次打开自动生效 |
| **响应式设计** | 小窗口自动适应，无空白或截断 |

---

## 安装

### Chrome 应用商店（推荐）

1. 访问 [Chrome 应用商店页面](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed)
2. 点击**添加至 Chrome**
3. 点击**添加扩展程序**确认

### 手动安装

1. 下载本项目 ZIP 压缩包
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角的**开发者模式**
4. 点击**加载已解压的扩展程序**
5. 选择项目文件夹

---

## 使用方法

### 调整宽度

1. 打开 [Google Gemini](https://gemini.google.com/)
2. 点击浏览器工具栏的扩展程序图标
3. 使用滑块或点击预设按钮：

| 预设 | 宽度 |
|------|------|
| 窄 | 800px |
| 默认 | 1000px |
| 更宽 | 1200px |
| 超宽 | 1350px |
| 极宽 | 2000px |

### 代码换行

在弹窗中开关「代码区域自动换行」即可启用或禁用代码自动换行。

### 自定义范围

可以在范围输入框中设置自定义的最小和最大宽度，滑块会自动适配。

---

## 技术细节

### 架构

- **内容脚本** (`gemini-content.js` + `gemini-content.css`)：注入到 Gemini 页面应用宽度样式
- **弹窗** (`popup.js` + `popup.html` + `popup.css`)：用户设置界面
- **清单文件** (`manifest.json`)：扩展程序配置（MV3）

### 工作原理

1. **宽度控制**：设置 CSS 变量 `--gemini-chat-width`，为对话容器应用 `max-width`
2. **代码换行**：切换 `<body>` 上的 `code-wrap-enabled` 类，CSS 将 `white-space` 从 `pre` 改为 `pre-wrap`
3. **自动刷新**：使用 `chrome.tabs.query` 查找所有 Gemini 页面，使用 `chrome.tabs.reload` 刷新

### 调试

在 Gemini 页面的浏览器控制台中可使用调试工具：

```javascript
window.widerGeminiDebug.findDragElements()  // 查找可能的拖拽元素
window.widerGeminiDebug.applyDragStyles()    // 手动应用拖拽样式
window.widerGeminiDebug.getCurrentWidth()     // 获取当前宽度设置
```

---

## 隐私

本扩展程序：
- ✅ 仅修改页面样式，不收集任何数据
- ✅ 不访问或存储任何个人信息
- ✅ 不影响 Gemini 的核心功能

---

## 许可证

[MIT License](./LICENSE)

---

## 贡献

欢迎提交 Issue 和 Pull Request！