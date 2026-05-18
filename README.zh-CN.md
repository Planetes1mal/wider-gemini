[English](./README.md) | 中文

# Wider Gemini

[![版本](https://img.shields.io/badge/version-2.1.1-blue.svg)](#)
[![GitHub Release](https://img.shields.io/github/v/release/Planetes1mal/wider-gemini?label=release)](https://github.com/Planetes1mal/wider-gemini/releases)
[![平台](https://img.shields.io/badge/platform-Chrome-blue.svg)](https://www.google.com/chrome/)
[![许可证：MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **🎉 现已上架 Chrome 应用商店！**  
> 从 [Chrome 应用商店](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed) 获取  
> **离线 / 手动安装：** 安装包见 [GitHub Releases](https://github.com/Planetes1mal/wider-gemini/releases)

让 Google Gemini 的对话界面更宽，支持自定义宽度滑块和预设按钮。

## 目录

- [Wider Gemini](#wider-gemini)
  - [目录](#目录)
  - [功能](#功能)
  - [环境要求](#环境要求)
  - [安装](#安装)
    - [Chrome 应用商店（推荐）](#chrome-应用商店推荐)
    - [GitHub Releases](#github-releases)
    - [从源码安装](#从源码安装)
  - [使用说明](#使用说明)
  - [开发](#开发)
  - [仓库结构](#仓库结构)
  - [隐私](#隐私)
  - [许可证](#许可证)
  - [贡献](#贡献)

## 功能

- **加宽对话区域** — 用滑块（在可配置范围内）或一键预设调整主对话区宽度。
- **可编辑预设** — 在弹窗中展开 **管理预设**，可重命名、排序、增删预设宽度（在可用时使用 `chrome.storage.sync` 同步）。
- **代码块换行** — 可选开启，长代码行无需横向滚动。
- **自动刷新** — 可选在修改设置后刷新已打开的 Gemini 标签页，使新设置立即生效。
- **设置持久化** — 宽度、换行、范围与预设会在下次使用时恢复。

## 环境要求

- 支持 **Chrome 扩展** 的 **Chromium 内核浏览器**（例如 Google Chrome）。
- 扩展仅在 **[Google Gemini](https://gemini.google.com/)**（`https://gemini.google.com/*`）上生效。

## 安装

### Chrome 应用商店（推荐）

1. 打开 [Chrome 应用商店商品页](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed)。
2. 点击 **添加至 Chrome**，再确认 **添加扩展程序**。

### GitHub Releases

1. 打开 [Releases](https://github.com/Planetes1mal/wider-gemini/releases)，在 **Assets** 中下载最新的 `wider-gemini-*.zip`。
2. 解压；文件夹根目录须包含 `manifest.json`。
3. 访问 `chrome://extensions/`，开启 **开发者模式**，点击 **加载已解压的扩展程序**，选择该文件夹。

### 从源码安装

1. 克隆本仓库，或在 GitHub 上下载仓库源码 ZIP。
2. 访问 `chrome://extensions/`，开启 **开发者模式**，点击 **加载已解压的扩展程序**，选择仓库根目录（含 `manifest.json` 的文件夹）。

## 使用说明

1. 打开 [Google Gemini](https://gemini.google.com/)。
2. 点击工具栏中的扩展图标打开弹窗。
3. 用 **滑块** 或 **预设按钮** 调整宽度。默认预设对应宽度：

| 预设 | 宽度 |
|------|-----:|
| 窄 | 800px |
| 默认 | 1000px |
| 更宽 | 1200px |
| 超宽 | 1350px |
| 极宽 | 2000px |

4. 按需开关 **代码区域自动换行**，控制代码块是否换行显示。
5. 在范围输入框中设置 **最小 / 最大宽度**，以改变滑块可调区间（默认值与扩展支持范围一致）。
6. 展开 **管理预设**，可自定义预设名称、顺序与像素值。

## 开发

项目为 **纯 HTML / CSS / JavaScript**，使用 Chrome **Manifest V3**，**无构建步骤**、无 npm 依赖。请与现有源码保持一致的结构、命名以及 `chrome.*` API 的用法。

- **Windows 下打商店 / 发布包：** 在仓库根目录运行 `package.bat`，生成 `wider-gemini-<version>.zip`（与上架包及 GitHub **Assets** 内容一致）。

在 Gemini 页面，内容脚本会在 `window.widerGeminiDebug` 上暴露调试方法（例如 `getCurrentWidth()`、`findDragElements()`、`applyDragStyles()`），可在浏览器 **开发者工具** 控制台中使用。

## 仓库结构

| 路径 | 说明 |
|------|------|
| `manifest.json` | 扩展清单（MV3） |
| `gemini-content.js`、`gemini-content.css` | 注入 `gemini.google.com` 的内容脚本 |
| `popup.html`、`popup.js`、`popup.css` | 工具栏弹窗 |
| `_locales/` | 国际化（`en`、`zh_CN`） |
| `icons/` | 图标资源 |
| `package.bat` | Windows 下打包商店用 ZIP |

## 隐私

- 仅在 Gemini 上调整 **版式与样式**；扩展本身 **不** 内置统计、遥测或向第三方服务器上报对话内容。
- 使用 **`chrome.storage`** 保存你的设置；若浏览器开启扩展数据同步，则会 **同步** 这些设置。
- **不会** 将你的提问或回答发送给扩展作者。

## 许可证

[MIT License](./LICENSE)

## 贡献

欢迎提交 Issue 与 Pull Request。
