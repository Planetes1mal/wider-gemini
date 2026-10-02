[English](../../README.md) | [简体中文](../../README.zh-CN.md) | 繁體中文

# Wider Gemini

用來調整 Gemini 和 ChatGPT 對話寬度與閱讀版面的 Chrome 擴充功能。兩個網站分別記住各自的設定。

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-安裝-4285F4)](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed?utm_source=github&utm_medium=readme&utm_campaign=zh-tw)
[![內部候選版 3.0.0-rc.2](https://img.shields.io/badge/internal-3.0.0--rc.2-orange)](../../CHANGELOG.md)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

同一段完整的 Gemini 對話、相同的視窗大小：使用 Wider Gemini 將對話寬度分別設為 700px 和 1200px。

![700px 寬度的完整 Gemini 對話頁面](../images/conversation-before.png)

![1200px 寬度的同一完整 Gemini 對話頁面](../images/conversation-after.png)

此分支為內部候選版 **3.0.0-rc.2**，包含 ChatGPT 寬度與閱讀支援、訊息導覽、依網站啟用的總開關和帶有網站頁籤的新彈出視窗。本候選版透過 `chatgpt-width-support` 分支提供，不建立版本 tag 或 GitHub Release。需要手動安裝；最新導覽變更仍待已登入頁面複查。

## 功能

- **調整寬度**：選擇 Gemini 或 ChatGPT，以像素（`px`）或視窗比例（`%`）設定；兩個網站分別儲存範圍和預設。
- **依網站啟用或暫停**：網站頁籤下方的「啟用」開關可暫停該網站的所有效果並恢復原頁面，設定仍可編輯並會保留；寬度開關只關閉加寬。遇到尚未辨識的版面時保留原站寬度，並在彈出視窗中提示目前頁面尚未支援。
- **調整字型大小和間距**：兩個網站都支援 75%–200% 字型大小，標題、程式碼和表格維持原有比例；可用閱讀密度收緊間距，或手動設定行高和段落間距。
- **訊息導覽**：對話右側的一列短刻度，點選即可跳到自己傳送的訊息，支援簡短預覽與鍵盤操作，適用於 Gemini 和 ChatGPT。長對話最多顯示目前訊息附近的 20 個刻度；ChatGPT 隨捲動記住帶有穩定識別碼的訊息，不自動掃描歷史。可在彈出視窗中依網站關閉。
- **任務預設**：一步套用閱讀、寬螢幕或大字設定，並可還原該網站套用前的設定。
- **Gemini 程式碼自動換行**：較長的程式碼會在對話區內換行顯示。ChatGPT 保留程式碼區塊內建的換行按鈕。
- **使用者訊息填滿寬度**：讓自己的訊息和回覆一樣，靠左對齊並使用完整的對話寬度。
- **介面語言**：英文、簡體中文、繁體中文、韓語、日語和西班牙語。預設跟隨瀏覽器，也能手動選擇。韓語、日語和西班牙語採用機器輔助翻譯，歡迎母語者改進。

設定會自動儲存，並套用至所選網站已開啟的頁面。ChatGPT 閱讀設定維持預設值時，不改變原生字型大小、間距、程式碼格式和使用者訊息樣式。

## 安裝

使用 **3.0.0-rc.2** 請依下方步驟手動安裝。[Chrome 線上應用程式商店](https://chromewebstore.google.com/detail/apadogadaahdjhhmbdhkmdecbobijoed?utm_source=github&utm_medium=readme&utm_campaign=zh-tw)和 [GitHub 正式版](https://github.com/Planetes1mal/wider-gemini/releases)是獨立的發佈管道，從那裡安裝不會取得這個內部候選版。

<details>
<summary>手動安裝</summary>

1. 簽出 `chatgpt-width-support` 分支，或在 GitHub 的 **Code → Download ZIP** 選單下載該分支的原始碼 ZIP 並解壓縮。
2. 保留完整資料夾，確認其中包含 `manifest.json`、`src/`、`_locales/` 和 `icons/`。
3. 開啟 `chrome://extensions/`，開啟右上角的 **開發人員模式**。
4. 點選 **載入未封裝項目**，選取剛才解壓縮的資料夾。

更新手動安裝的候選版時，需要替換檔案並重新載入擴充功能。Chrome 比較的是數字版本（`3.0.0`），因此後續候選版和最終 `3.0.0` 正式版也需要手動替換、重新載入。

</details>

## 使用

1. 開啟 [Gemini](https://gemini.google.com/) 或 [ChatGPT](https://chatgpt.com/)，點選瀏覽器工具列中的 Wider Gemini 圖示。
2. 選擇網站頁籤和 `px` 或 `%`，拖曳寬度滑桿，也可以直接點選預設。
3. 在 Gemini 頁籤中，展開 **閱讀與排版** 還可以調整字型大小、閱讀密度，或開啟程式碼自動換行。

展開 **範圍與預設** 可以調整寬度範圍和 **管理預設**；每個網站的 `px` 和 `%` 各有一組獨立預設。介面語言可在彈出視窗底部切換。

在 Gemini 中使用長文閱讀、表格、程式碼和大字四種**任務預設**時，先查看設定摘要，再點選套用；**還原先前設定**可在本機恢復套用前的 Gemini 版面，關閉彈出視窗後仍可使用。具體數值及還原範圍見[閱讀指南](../guides/reading-layout.zh-TW.md)。

彈出視窗底部的 **說明與回報** 提供疑難排解，也可以預覽並複製診斷設定。擴充功能作用於 Gemini、ChatGPT 網頁及透過 Chrome 安裝的網站應用程式視窗，不會修改原生桌面應用程式或 Chrome 內建的 Gemini 面板。已實際驗證的操作見[相容性記錄](../compatibility.md)。

## 隱私權

擴充功能申請 `gemini.google.com` 和 `chatgpt.com` 的存取權限來調整頁面樣式，使用 `storage` 儲存偏好、`scripting` 補注入未載入的內容指令碼。不收集或上傳對話內容，也沒有統計或追蹤服務。

偏好設定透過 Chrome 的擴充功能儲存空間保存；是否跨裝置同步取決於你的瀏覽器同步設定。詳見[隱私權說明](../PRIVACY.md)。

## 本機開發

本專案使用原生 JavaScript、HTML 和 CSS，無須安裝相依套件或建置。

```bash
git clone https://github.com/Planetes1mal/wider-gemini.git
```

在 `chrome://extensions/` 開啟 **開發人員模式**，點選 **載入未封裝項目**，選取儲存庫資料夾。修改程式碼後，重新載入擴充功能並重新整理受影響的 Gemini 或 ChatGPT 頁面。

內部迭代可執行 `node scripts/test.js --skip-packaging`，執行現有單元檢查而不產生 ZIP。瀏覽器與發佈檢查見[貢獻指南](../../CONTRIBUTING.md)，版面規則見[工程與相容性說明](../engineering.md)。

[附日期的相容性記錄](../compatibility.md)區分原始碼實測和待驗證裝置。執行 `node scripts/reading-lab.js` 可開啟[本機閱讀實驗](../lab/README.md)，比較正文與表格的兩種寬度安排；它獨立於擴充功能。

## 回報問題與貢獻

遇到問題，可在彈出視窗的 **說明與回報** 中複製診斷設定，並附上操作步驟提交 [Issue](https://github.com/Planetes1mal/wider-gemini/issues/new/choose)。分享螢幕截圖前請移除私人資訊。歡迎提交 Pull Request。

如果 Wider Gemini 對你有幫助，可以在 GitHub 點一個 Star，讓更多人發現它。

Star 完全自願。想接收版本通知，請使用儲存庫的 **Watch → Custom → Releases** 設定，參見 [GitHub 通知說明](https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications)。

本專案採用 [MIT 授權條款](../../LICENSE)。
