[English](./README.md) | 简体中文 | [繁體中文](./docs/i18n/README.zh-TW.md)

# Wider Gemini

一个用来调整 Gemini 对话宽度的 Chrome 扩展。拖动滑块或点选预设，就能把对话区调到适合自己屏幕的大小。

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-安装-4285F4)](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed)
[![GitHub Release](https://img.shields.io/github/v/release/Planetes1mal/wider-gemini?label=release)](https://github.com/Planetes1mal/wider-gemini/releases)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

![Gemini 对话区加宽前后的对比](./docs/images/wider-gemini-preview.jpg)

上：默认宽度。下：使用 Wider Gemini 加宽后的对话区。

## 功能

- **调整宽度**：按像素（`px`）或窗口比例（`%`）设置，也可以保存常用预设。
- **调整字号和间距**：字号支持 75%–200%，行高和段落间距可以单独设置。
- **代码自动换行**：长代码在对话区内折行显示。
- **用户消息铺满宽度**：让自己的消息和 Gemini 的回答一样，左对齐并使用完整的对话宽度。
- **三种界面语言**：英文、简体中文和繁体中文，默认跟随浏览器，也能手动选择。

设置会自动保存，调整后立即应用到已打开的 Gemini 页面。

## 安装

在 [Chrome 应用商店](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed)点击 **添加至 Chrome** 即可安装。

<details>
<summary>手动安装</summary>

1. 到 [GitHub Releases](https://github.com/Planetes1mal/wider-gemini/releases) 下载最新正式版的 `wider-gemini-*.zip`。
2. 解压到一个固定位置，确认文件夹里有 `manifest.json`。
3. 打开 `chrome://extensions/`，开启右上角的 **开发者模式**。
4. 点击 **加载已解压的扩展程序**，选择刚才解压的文件夹。

</details>

## 使用

1. 打开 [Gemini](https://gemini.google.com/)，点击浏览器工具栏里的 Wider Gemini 图标。
2. 选择 `px` 或 `%`，拖动宽度滑块，也可以直接点一个预设。
3. 根据需要调整字号、阅读密度，或开启代码自动换行。

在 **管理预设** 中可以修改预设名称和宽度；`px` 和 `%` 各有一组独立预设。界面语言在弹窗底部切换。

## 隐私

扩展只在 `gemini.google.com` 上调整页面样式，不收集或上传对话内容，也没有统计或追踪服务。

偏好设置通过 Chrome 的扩展存储保存；是否跨设备同步取决于你的浏览器同步设置。详见[隐私说明](./docs/PRIVACY.md)。

## 本地开发

项目使用原生 JavaScript、HTML 和 CSS，无需安装依赖或构建。

```bash
git clone https://github.com/Planetes1mal/wider-gemini.git
```

在 `chrome://extensions/` 开启 **开发者模式**，点击 **加载已解压的扩展程序**，选择仓库文件夹。修改代码后，重新加载扩展并刷新 Gemini 页面。

## 反馈与贡献

遇到显示异常，可以到 [Issues](https://github.com/Planetes1mal/wider-gemini/issues) 反馈，附上截图、浏览器版本和扩展版本，方便复现。欢迎提交 Pull Request。

本项目采用 [MIT 协议](./LICENSE)。
