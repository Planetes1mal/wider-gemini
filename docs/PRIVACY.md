# Privacy Policy

**Effective date:** September 19, 2026

This policy describes how the **Wider Gemini** browser extension (“Extension”, “we”, “us”) handles information when you use it. It is provided in English and Chinese; both sections have the same meaning.

---

## English

### 1. Who we are

Wider Gemini is an open-source Chrome extension that adjusts layout and styling on [Google Gemini](https://gemini.google.com/). It is distributed through the Chrome Web Store and other channels chosen by the publisher.

### 2. Information the Extension processes

The Extension **does not** collect, sell, or transmit your personal data, chat content, or browsing history to us or to analytics services for the Extension’s own purposes.

**Local settings.** The Extension uses the browser’s extension storage API (`chrome.storage`, including sync where your browser profile supports it) only to save **your preferences**, such as chat width, code-wrap options, and preset buttons. That data is managed by your browser and remains under your control.

Applying a task preset also saves one previous layout in device-local extension storage (`chrome.storage.local`) so you can restore it after reopening the popup. This snapshot contains layout preferences only, is replaced by the next task-preset application, and is removed when restored. It does not contain conversation content or sync as part of this undo feature.

**Site access.** The Extension runs on `https://gemini.google.com/*` to apply CSS and related UI adjustments. It does **not** read, log, or upload your prompts, replies, or other page content to external servers operated by the Extension.

**Optional diagnostic copy.** The help page can display the extension version, browser version, platform, and selected layout settings on your device. It excludes conversations, page URLs, browsing history, and custom preset names. Nothing is sent automatically: copying only puts the displayed text on your clipboard. You choose whether to share it in a public GitHub issue.

### 3. Third parties

Google operates Gemini and Chrome. Their handling of data is governed by [Google’s policies](https://policies.google.com/) and your browser settings. The Extension does not add its own remote tracking or advertising SDKs.

### 4. Children’s privacy

The Extension is not directed at children under 13 (or the age required in your jurisdiction). We do not knowingly collect personal information from children through the Extension.

### 5. Changes

We may update this policy when the Extension’s behavior or legal requirements change. The effective date at the top will be revised when we do.

### 6. Contact

Questions about this policy or the Extension may be reported via the GitHub repository’s issue tracker maintained by the project.

---

## 中文

### 1. 主体说明

**Wider Gemini** 是一款开源 Chrome 扩展，用于调整 [Google Gemini](https://gemini.google.com/) 网页上的版式与样式。扩展通过 Chrome 应用商店及发布者选择的其他渠道分发。

### 2. 扩展处理的信息

本扩展**不会**出于自身功能目的，向开发者或第三方分析服务收集、出售或传输您的个人数据、对话内容或浏览记录。

**本地设置。** 扩展仅通过浏览器提供的扩展存储接口（`chrome.storage`，在您的浏览器配置支持时含同步）保存**您的偏好设置**，例如对话宽度、代码换行选项与预设按钮等。数据由浏览器管理，并由您本人控制。

应用任务预设时，还会在本机扩展存储（`chrome.storage.local`）保留一份应用前的版式，方便重新打开弹窗后恢复。这份快照仅包含版式偏好，下一次应用任务预设时会被替换，恢复后会被删除；不包含对话内容，这项撤销功能也不会同步该快照。

**网站访问范围。** 扩展仅在 `https://gemini.google.com/*` 上运行，以注入 CSS 等方式调整界面。扩展**不会**读取、记录或将您的提问、回答或其他页面内容上传至由本扩展运营的远程服务器。

**可选的诊断复制。** 帮助页可以在本机显示扩展版本、浏览器版本、平台和部分版式设置，不包含对话、页面网址、浏览记录或自定义预设名称。不会自动发送任何内容；复制操作仅将已显示的文本放入剪贴板。是否将其分享至公开的 GitHub Issue，由您自行决定。

### 3. 第三方

Gemini 与 Chrome 由 Google 运营；相关数据处理受 [Google 政策](https://policies.google.com/) 及您的浏览器设置约束。本扩展不内置额外的远程追踪或广告 SDK。

### 4. 儿童隐私

本扩展不面向未满 13 周岁（或您所在地法律规定的最低年龄）的儿童。我们不会通过本扩展故意收集儿童的个人信息。

### 5. 变更

当扩展行为或适用法律要求变化时，我们可能更新本政策；更新时会修改文首的生效日期。

### 6. 联系方式

如对本政策或扩展有疑问，可通过项目在 GitHub 上维护的 Issue 渠道反馈。
