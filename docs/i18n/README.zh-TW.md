[English](../../README.md) | [简体中文](../../README.zh-CN.md) | 繁體中文

# Wider Gemini

用來調整 Gemini 對話寬度的 Chrome 擴充功能。拖曳滑桿或點選預設，就能把對話區調到適合自己螢幕的大小。

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-安裝-4285F4)](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed)
[![GitHub Release](https://img.shields.io/github/v/release/Planetes1mal/wider-gemini?label=release)](https://github.com/Planetes1mal/wider-gemini/releases)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

![Gemini 對話區加寬前後的比較](../images/wider-gemini-preview.jpg)

上：預設寬度。下：使用 Wider Gemini 加寬後的對話區。

## 功能

- **調整寬度**：以像素（`px`）或視窗比例（`%`）設定，也可以儲存常用預設。
- **調整字型大小和間距**：字型大小支援 75%–200%，行高和段落間距可以分別設定。
- **程式碼自動換行**：較長的程式碼會在對話區內換行顯示。
- **使用者訊息填滿寬度**：讓自己的訊息和 Gemini 的回覆一樣，靠左對齊並使用完整的對話寬度。
- **三種介面語言**：英文、簡體中文和繁體中文，預設跟隨瀏覽器，也能手動選擇。

設定會自動儲存，調整後立即套用至已開啟的 Gemini 頁面。

## 安裝

在 [Chrome 線上應用程式商店](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed)點選 **加到 Chrome** 即可安裝。

<details>
<summary>手動安裝</summary>

1. 到 [GitHub Releases](https://github.com/Planetes1mal/wider-gemini/releases) 下載最新正式版的 `wider-gemini-*.zip`。
2. 解壓縮至固定位置，確認資料夾內有 `manifest.json`。
3. 開啟 `chrome://extensions/`，開啟右上角的 **開發人員模式**。
4. 點選 **載入未封裝項目**，選取剛才解壓縮的資料夾。

</details>

## 使用

1. 開啟 [Gemini](https://gemini.google.com/)，點選瀏覽器工具列中的 Wider Gemini 圖示。
2. 選擇 `px` 或 `%`，拖曳寬度滑桿，也可以直接點選預設。
3. 視需要調整字型大小、閱讀密度，或開啟程式碼自動換行。

在 **管理預設** 中可以修改預設名稱和寬度；`px` 和 `%` 各有一組獨立預設。介面語言可在彈出視窗底部切換。

## 隱私權

擴充功能只在 `gemini.google.com` 上調整頁面樣式，不收集或上傳對話內容，也沒有統計或追蹤服務。

偏好設定透過 Chrome 的擴充功能儲存空間保存；是否跨裝置同步取決於你的瀏覽器同步設定。詳見[隱私權說明](../PRIVACY.md)。

## 本機開發

本專案使用原生 JavaScript、HTML 和 CSS，無須安裝相依套件或建置。

```bash
git clone https://github.com/Planetes1mal/wider-gemini.git
```

在 `chrome://extensions/` 開啟 **開發人員模式**，點選 **載入未封裝項目**，選取儲存庫資料夾。修改程式碼後，重新載入擴充功能並重新整理 Gemini 頁面。

## 回報問題與貢獻

遇到顯示異常，可以到 [Issues](https://github.com/Planetes1mal/wider-gemini/issues) 回報，附上螢幕截圖、瀏覽器版本和擴充功能版本，方便重現問題。歡迎提交 Pull Request。

本專案採用 [MIT 授權條款](../../LICENSE)。