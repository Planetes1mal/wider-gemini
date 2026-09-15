[English](./README.md) | 中文

# Wider Gemini

[![版本](https://img.shields.io/badge/version-2.6.0-blue.svg)](#)
[![GitHub Release](https://img.shields.io/github/v/release/Planetes1mal/wider-gemini?label=stable)](https://github.com/Planetes1mal/wider-gemini/releases)
[![平台](https://img.shields.io/badge/platform-Chrome-blue.svg)](https://www.google.com/chrome/)
[![许可证：MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **🎉 现已上架 Chrome 应用商店！**  
> 从 [Chrome 应用商店](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed) 获取  
> **离线 / 手动安装：** 安装包见 [GitHub Releases](https://github.com/Planetes1mal/wider-gemini/releases)

当前源码为 **2.6.0** 正式版，包含 Gemini 布局兼容性修复。Chrome 应用商店需完成审核与发布后才会提供此版本；手动安装请使用 [GitHub Releases](https://github.com/Planetes1mal/wider-gemini/releases)。

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
    - [从 2.6.0-rc.1 升级](#从-260-rc1-升级)
  - [使用说明](#使用说明)
  - [开发](#开发)
  - [仓库结构](#仓库结构)
  - [隐私](#隐私)
  - [许可证](#许可证)
  - [贡献](#贡献)

## 功能

- **加宽对话区域** — 用滑块（在可配置范围内）或一键预设调整主对话区宽度。
- **响应式宽度单位** — 可使用固定像素或视口百分比，让 Gemini 根据当前标签页宽度自适应。
- **阅读密度控制** — 可调紧凑度、行高和段落间距，提升大屏阅读的信息密度。
- **字号控制** — 可在 75%–200% 之间缩放消息文本、标题与代码，无需缩放整个页面。
- **界面语言** — 跟随浏览器语言（其他语言环境回退为英文），也可在弹窗中手动切换英文 / 中文。
- **用户消息铺满宽度** — 可选开关，让用户消息铺满对话区宽度并左对齐（与 AI 回答一致），而不是收缩成靠右的小气泡。
- **分单位编辑预设** — `px` 与 `%` 使用独立预设，可编辑预设名称和数值，也可重置为默认值。
- **代码块换行** — 可选开启，长代码行无需横向滚动。
- **实时生效** — 修改设置后立即应用到所有已打开的 Gemini 标签页和已安装的应用窗口，无需刷新；仅当页面收不到消息时才回退为刷新该页面。
- **设置持久化** — 宽度单位、宽度数值、阅读密度、字号、界面语言、换行、范围与预设会在下次使用时恢复。

## 环境要求

- 支持 **Chrome 扩展** 的 **Chromium 内核浏览器**（例如 Google Chrome）。
- 扩展仅在 **[Google Gemini](https://gemini.google.com/)**（`https://gemini.google.com/*`）上生效。

## 安装

### Chrome 应用商店（推荐）

1. 打开 [Chrome 应用商店商品页](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed)。
2. 点击 **添加至 Chrome**，再确认 **添加扩展程序**。

### GitHub Releases

1. 打开 [Releases](https://github.com/Planetes1mal/wider-gemini/releases)，选择最新稳定版，在 **Assets** 中下载 `wider-gemini-*.zip`。标有 **Pre-release** 的版本用于测试。
2. 解压；文件夹根目录须包含 `manifest.json`。
3. 访问 `chrome://extensions/`，开启 **开发者模式**，点击 **加载已解压的扩展程序**，选择该文件夹。

### 从源码安装

1. 克隆本仓库，或在 GitHub 上下载仓库源码 ZIP。
2. 访问 `chrome://extensions/`，开启 **开发者模式**，点击 **加载已解压的扩展程序**，选择仓库根目录（含 `manifest.json` 的文件夹）。

### 从 2.6.0-rc.1 升级

候选版和正式版的数字版本均为 `version: "2.6.0"`。Chrome 不根据 `version_name` 判断升级，因此手动安装的候选版不会自动更新到此正式版。

1. 从 [Releases](https://github.com/Planetes1mal/wider-gemini/releases/tag/v2.6.0) 下载 `wider-gemini-2.6.0.zip`。
2. 将 ZIP 解压到原候选版文件夹，替换现有扩展文件。
3. 打开 `chrome://extensions/`，找到已解压的 Wider Gemini，点击 **重新加载**。
4. 刷新 Gemini，并确保只启用一个 Wider Gemini 实例。

若要恢复商店版，请停用或移除手动加载的副本，再启用 Chrome 应用商店安装的版本，然后刷新 Gemini。商店更新需等待发布完成。

## 使用说明

1. 打开 [Google Gemini](https://gemini.google.com/)。
2. 点击工具栏中的扩展图标打开弹窗。
3. 选择 **px** 或 **%**，然后通过滑块或预设按钮调整宽度。默认预设对应宽度：

| 预设 | px | % |
|------|---:|--:|
| 窄 | 800px | 50% |
| 默认 | 1000px | 70% |
| 更宽 | 1200px | 80% |
| 超宽 | 1350px | 90% |
| 极宽 | 2000px | 100% |

4. 按需开关 **代码区域自动换行**，控制代码块是否换行显示。

按需开关 **用户消息铺满宽度**，让你的消息铺满对话区宽度并左对齐，与 AI 回答一致。

使用 **阅读密度** 调整紧凑度，或展开 **高级间距** 分别调行高和段落间距。

使用 **字号** 可在 75%–200% 之间缩放消息文本（100% 保持 Gemini 原生大小）。

使用底部 **界面语言** 下拉，可在跟随系统语言、英文与中文之间切换弹窗语言。

5. 在范围输入框中设置 **最小 / 最大宽度**，以改变滑块可调区间（默认值与扩展支持范围一致）。
6. 展开 **管理预设**，可自定义当前单位下的预设名称与数值。`px` 与 `%` 的预设会分别保存。

## 开发

项目为 **纯 HTML / CSS / JavaScript**，使用 Chrome **Manifest V3**，**无构建步骤**、无 npm 依赖。请与现有源码保持一致的结构、命名以及 `chrome.*` API 的用法。

- **打包：** `scripts/package.ps1` 是本地及 CI 共用的 ZIP 打包器，不依赖 Node.js。Windows 在仓库根目录运行 `package.bat`；macOS / Linux 安装 PowerShell 后运行 `pwsh -File ./scripts/package.ps1`。均生成 `wider-gemini-<release-version>.zip`，ZIP 根目录包含 `manifest.json`。本版本文件名为 `wider-gemini-2.6.0.zip`。
- **版本号：** Chrome 要求 `manifest.json` 的 `version` 为数字版本。候选版将 `version` 设为下一正式版本、`version_name` 设为预发布名称，例如 `2.6.0` 和 `2.6.0-rc.1`。发布版本优先取 `version_name`，没有时取 `version`。正式发布 `2.6.0` 时移除 `version_name`，保留 `version: "2.6.0"`。
- **GitHub Release：** 更新 manifest、两份 README 版本徽章，并在 `CHANGELOG.md` 添加匹配的 `## <release-version>` 章节。提交并推送 `main` 后，再推送对应 tag，例如 `v2.6.0`。Actions 会验证 tag，通过 `pwsh` 调用同一个打包器，从匹配的 changelog 章节生成正文并附上 ZIP。候选版标为 **Pre-release**，不替换最新稳定版。
- **Chrome Web Store：** 仅上传验证通过的稳定版，使用对应稳定版 GitHub Release Assets 中的同一个 ZIP。候选版不上传商店；手动测试者需按上文说明替换文件并重新加载，或切回商店版。

在 Gemini 页面，内容脚本会在 `window.widerGeminiDebug` 上暴露调试方法（例如 `getCurrentWidth()`、`findDragElements()`、`applyDragStyles()`），可在浏览器 **开发者工具** 控制台中使用。

## 仓库结构

| 路径 | 说明 |
|------|------|
| `manifest.json` | 扩展清单（MV3） |
| `settings-utils.js` | 弹窗与内容脚本共用的设置规范化逻辑 |
| `gemini-content.js`、`gemini-content.css` | 注入 `gemini.google.com` 的内容脚本 |
| `background.js` | Service worker：给先于扩展加载的 Gemini 页面（PWA 冷启动、安装/更新时）补注入内容脚本 |
| `popup.html`、`popup.js`、`popup.css` | 工具栏弹窗 |
| `_locales/` | 国际化（`en`、`zh_CN`） |
| `icons/` | 图标资源 |
| `package.bat` | Windows 打包入口，调用共用打包器 |
| `scripts/package.ps1` | 本地 / GitHub Actions 共用的 ZIP 打包及发布版本校验 |
| `CHANGELOG.md` | 版本说明；GitHub Release 正文从此文件对应章节提取 |

## 隐私

- 仅在 Gemini 上调整 **版式与样式**；扩展本身 **不** 内置统计、遥测或向第三方服务器上报对话内容。
- 使用 **`chrome.storage`** 保存你的设置；若浏览器开启扩展数据同步，则会 **同步** 这些设置。
- **不会** 将你的提问或回答发送给扩展作者。

## 许可证

[MIT License](./LICENSE)

## 贡献

欢迎提交 Issue 与 Pull Request。
