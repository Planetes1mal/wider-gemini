# Privacy Policy

**Effective date:** September 29, 2026

This policy describes how the **Wider Gemini** browser extension (“Extension”, “we”, “us”) handles information when you use it. It is provided in English and Chinese; both sections have the same meaning.

---

## English

### 1. Who we are

Wider Gemini is an open-source Chrome extension that adjusts layout and styling on [Google Gemini](https://gemini.google.com/) and conversation width on [ChatGPT](https://chatgpt.com/). It is distributed through the Chrome Web Store and other channels chosen by the publisher.

### 2. Information the Extension processes

The Extension **does not** collect, sell, or transmit your personal data, chat content, or browsing history to us or to analytics services for the Extension’s own purposes.

**Local settings.** The Extension uses the browser’s extension storage API (`chrome.storage`, including sync where your browser profile supports it) only to save **your preferences**, such as each site's width, limits, and preset buttons, plus Gemini's reading and code-wrap options. That data is managed by your browser and remains under your control.

Applying a Gemini task preset also saves one previous Gemini layout in device-local extension storage (`chrome.storage.local`) so you can restore it after reopening the popup. This snapshot contains layout preferences only, is replaced by the next task-preset application, and is removed when restored. It does not contain conversation content or sync as part of this undo feature.

**Site access.** The Extension requests access to `https://gemini.google.com/*` and `https://chatgpt.com/*` to inspect page structure and apply CSS and related UI adjustments. The `scripting` permission restores missing content scripts when the extension starts, installs, or updates; `storage` saves preferences. No browsing-history `tabs` permission is requested. The Extension does **not** collect or transmit your prompts, replies, uploaded files, or other page content.

**Optional diagnostic copy.** The help page can display the extension version, browser version, platform, Gemini layout settings, and ChatGPT width and range settings on your device. It excludes conversations, page URLs, titles, browsing history, and custom preset names. Nothing is sent automatically: copying only puts the displayed text on your clipboard. You choose whether to share it in a public GitHub issue.

### 3. Third parties

Google operates Gemini and Chrome; OpenAI operates ChatGPT. Their handling of data is governed by [Google’s policies](https://policies.google.com/), [OpenAI’s privacy policy](https://openai.com/policies/privacy-policy/), and your browser settings. The Extension does not add its own remote tracking or advertising SDKs.

### 4. Children’s privacy

The Extension is not directed at children under 13 (or the age required in your jurisdiction). We do not knowingly collect personal information from children through the Extension.

### 5. Changes

We may update this policy when the Extension’s behavior or legal requirements change. The effective date at the top will be revised when we do.

### 6. Contact

Questions about this policy or the Extension may be reported via the GitHub repository’s issue tracker maintained by the project.

---

## 中文

### 1. 主体说明

**Wider Gemini** 是一款开源 Chrome 扩展，用于调整 [Google Gemini](https://gemini.google.com/) 网页上的版式与样式，以及 [ChatGPT](https://chatgpt.com/) 网页的对话宽度。扩展通过 Chrome 应用商店及发布者选择的其他渠道分发。

### 2. 扩展处理的信息

本扩展**不会**出于自身功能目的，向开发者或第三方分析服务收集、出售或传输您的个人数据、对话内容或浏览记录。

**本地设置。** 扩展仅通过浏览器提供的扩展存储接口（`chrome.storage`，在您的浏览器配置支持时含同步）保存**您的偏好设置**，例如各网站的宽度、范围和预设按钮，以及 Gemini 的阅读和代码换行选项。数据由浏览器管理，并由您本人控制。

应用 Gemini 任务预设时，还会在本机扩展存储（`chrome.storage.local`）保留一份应用前的 Gemini 版式，方便重新打开弹窗后恢复。这份快照仅包含版式偏好，下一次应用任务预设时会被替换，恢复后会被删除；不包含对话内容，这项撤销功能也不会同步该快照。

**网站访问范围。** 扩展申请访问 `https://gemini.google.com/*` 和 `https://chatgpt.com/*`，检查页面结构并以注入 CSS 等方式调整界面。`scripting` 权限用于在扩展启动、安装或更新时补注入未加载的内容脚本；`storage` 用于保存偏好。不申请读取浏览记录的 `tabs` 权限。扩展**不会**收集或传输您的提问、回答、上传文件或其他页面内容。

**可选的诊断复制。** 帮助页可以在本机显示扩展版本、浏览器版本、平台、Gemini 版式设置及 ChatGPT 宽度和范围设置，不包含对话、页面网址、标题、浏览记录或自定义预设名称。不会自动发送任何内容；复制操作仅将已显示的文本放入剪贴板。是否将其分享至公开的 GitHub Issue，由您自行决定。

### 3. 第三方

Gemini 与 Chrome 由 Google 运营，ChatGPT 由 OpenAI 运营；相关数据处理受 [Google 政策](https://policies.google.com/)、[OpenAI 隐私政策](https://openai.com/policies/privacy-policy/)及您的浏览器设置约束。本扩展不内置额外的远程追踪或广告 SDK。

### 4. 儿童隐私

本扩展不面向未满 13 周岁（或您所在地法律规定的最低年龄）的儿童。我们不会通过本扩展故意收集儿童的个人信息。

### 5. 变更

当扩展行为或适用法律要求变化时，我们可能更新本政策；更新时会修改文首的生效日期。

### 6. 联系方式

如对本政策或扩展有疑问，可通过项目在 GitHub 上维护的 Issue 渠道反馈。
