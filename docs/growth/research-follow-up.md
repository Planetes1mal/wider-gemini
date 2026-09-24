# 公开传播溯源与两个待执行实验

核查日期：2026-09-20 UTC。本补充只记录新增的原始来源、渠道适配与文字实验，完整指标分析仍以本次开发者导出审计为准。**未联系作者、未投稿、未发帖；宣传素材与发布仍暂停。**

## 台湾安装高峰：找到真实推荐，尚未找到归因证据

开发者导出的两个观察点是：2026-04-02 台湾安装事件 503 次，当日全部区域 566 次；2026-08-21 台湾 337 次，当日全部区域 431 次。这些是事件计数，不能直接称为新增独立用户。

新增的可核实传播链来自 Reddit：

| 原始证据 | 可确认的事实 | 不能据此推出什么 |
|---|---|---|
| [r/Bard 原始问题](https://www.reddit.com/r/Bard/comments/1h0iftg/how_do_you_increase_the_width_of_the_gemini_chat/) | 用户询问如何加宽 Gemini 对话，提到 MacBook 与 Chrome；这是一个实际阅读问题 | 发帖者不代表整个市场，也不是本项目的跨平台验证 |
| [UnsaltedCashew36 的推荐](https://www.reddit.com/r/Bard/comments/1h0iftg/comment/ocpijwx/) | 2026-03-27 03:25:22 UTC，明确写出 Wider Gemini，并链接商店 ID `apadogadaahdjhhmbdhkmdecbobijoed`；推荐理由包括表格也能变宽 | 距 4 月 2 日六天，时间接近不能证明带来 503 次台湾安装 |
| [Every-Inspection5406 的繁中回复](https://www.reddit.com/r/Bard/comments/1h0iftg/comment/ol43ylz/) | 2026-05-11 03:20:06 UTC，回复上述推荐，肯定可调宽度及表格效果 | 繁中语言不能证明居住地；回复晚于四月高峰，也不是八月高峰的来源证据 |

日期由 Reddit [推荐评论 JSON](https://www.reddit.com/r/Bard/comments/1h0iftg/comment/ocpijwx/.json?raw_json=1) 与[回复 JSON](https://www.reddit.com/r/Bard/comments/1h0iftg/comment/ol43ylz/.json?raw_json=1) 的 `created_utc` 换算，台湾时间分别为 3 月 27 日 11:25:22、5 月 11 日 11:20:06。推荐中的链接没有我们可用的独立 campaign 标记。本轮没有取得该评论的点击统计或与安装事件相连的来源数据。

**结论：四月来源未知，八月来源未知；“表格也要一起变宽”已有外部用户的直接需求证据。** 可以用这一场景改进教程与后续选题，不能宣传成“某台湾博主带来增长”。

本轮按产品全名、准确商店 ID、仓库路径，搭配「擴充／推薦／加寬／寬度」及两个日期窗口检索；另查 Reddit、Threads、Facebook、PTT、Dcard 与繁中工具作者站点。没有找到能核实为上述两日峰值来源的原帖。搜索日期过滤和结果抓取日期没有作为发布时间证据；未收录、私密或已删除的传播仍可能存在。

身份核对排除了两类误判：

- Greasy Fork 上的 [Wider Gemini v2.1](https://greasyfork.org/bg/scripts/552886-wider-gemini-v2-1/code) 是署名 dean、使用 userscript 元数据的另一份脚本，不能因同名算成本扩展的报道。
- [Extpose 的准确 ID 页面](https://extpose.com/ext/466150/zh-CN) 等商店镜像只能证明存在索引条目，不能证明作者主动推荐、发布时间或安装来源。同一 Reddit 讨论中其他扩展的回复也没有混入本项目证据。

下一次若再次出现峰值，先保存当日与前后日期的商店导出、当时可用的来源数据、实际新增外链及其发布时间。对于历史两次峰值，只有新获得原帖链接、作者侧点击数据或可对应的来源记录，才更新归因判断。

## 4 月 19 日跨西语地区增长：有界复查，来源仍未知

追加核查日期：2026-09-20 UTC。开发者导出在 2026-04-19 记录了全部区域 **297 次安装事件**，其中西班牙 32、哥伦比亚 26、秘鲁 21、智利 17。另读原始「安装量（按语言）」CSV，同日的**西班牙语为 84 次**。地区切片与语言切片是不同维度，不能把上述国家计数直接相加称为西语用户，也不能从某国安装推出用户阅读了该国的文章。

本轮限定为下面六条针对检索，随后只读取身份明确的相关页面，没有继续扩大搜索：

1. `"Wider Gemini" español abril`
2. `"Wider Gemini" after:2026-04-10 before:2026-04-23`
3. `"apadogadaahdjhhmbdhkmdecbobijoed" español`
4. `"Wider Gemini" "extensión"`，排除商店与已知镜像域名
5. `"Wider Gemini" site:youtube.com`
6. `"Wider Gemini" site:x.com OR site:threads.com OR site:facebook.com`

**直接原帖证据：** 本轮未找到能同时核实“准确扩展身份、西语原作者内容、4 月 19 日附近发布时间”的博客、视频或社交原帖。检索日期过滤仍返回了一些窗口外页面，所以没有把搜索摘要的日期或命中顺序当作发布证据。没有原帖证据不等于当时无人传播，私密群组、未收录内容与已删除内容仍不可见。

**相关线索：** 新发现 [AlphaMoat 的准确 ID 条目](https://www.alphamoat.ai/en/ext/wider-gemini-apadogadaahdjhhmbdhkmdecbobijoed)。页面自己注明数据月份为 2026-08，并说明用户数和评分来自按月汇总的公开商店数据。它能证明另一个公开目录入口存在，不能证明 4 月 19 日已经发布、当时有西语作者推荐，或曾为本项目导入安装。页面上的月度用户趋势也不能替代当天的来源归因。前文的 [3 月 27 日 Reddit 推荐](https://www.reddit.com/r/Bard/comments/1h0iftg/comment/ocpijwx/) 仍是真实的英文推荐，没有取得它在 4 月 19 日带来访问的证据。

**排除项与结论：** 商店镜像、同名 userscript，以及正文只出现“wider Gemini ecosystem”的无关结果均不计为传播原帖。本轮结论是 **4 月 19 日来源未知，原帖溯源已完成一次有界复查**。不把 `ext_sidebar`、`ext_app_menu` 等来源标签猜成某个作者，也不把跨西语地区同步增长归为某个教程效果。只有出现可核实的原帖或可对应的来源记录时再继续追查；没有联系作者、评论、投稿或私信。

## 少量渠道候选与实际规则

以下优先级是基于主题与规则的判断，不是流量预测。没有核实作者受众规模，因此不把任何人标为“小体量博主”，也不列没有作品证据的批量联系人。

| 候选与入口 | 匹配依据 | 规则与执行边界 | 首轮衡量 |
|---|---|---|---|
| **优先：英文社区 [r/chrome_extensions](https://www.reddit.com/r/chrome_extensions/)** | 社区本身讨论 Chrome 扩展，当前有 Self Promotion 标签 | 当前侧栏要求内容相关、建设性，禁止垃圾内容、误导及拉票；多社区群发可能被视为垃圾。用自荐标签并说明维护者身份。没有把历史讨论中的“每月一次”提议当作现行规则 | 一篇帖带来的有效问题、适用场景、可见来源访问；不以赞数当安装数 |
| **优先：繁中作者 Pseric／[免費資源網投稿入口](https://free.com.tw/contact/)** | 作者亲自撰写的 [Shinkansen 浏览器翻译扩展体验](https://free.com.tw/shinkansen/) 涉及 Gemini、开源扩展和网页阅读，选题相邻 | 联系页明确欢迎软件、App、网络服务开发者提供资料，由作者决定是否免费体验介绍；拒绝无关推广。付费保证曝光是另一类服务，本计划不采用。一次相关投稿，不索取保证好评 | 是否愿意试用、提出哪些使用问题；若自主发表，再记录原文和来源访问 |
| **备选：Rocky／電腦王阿達**，[Gemini Voyager 原作](https://www.kocpc.com.tw/archives/631247) | 2026-02-16 的原作专门介绍 Gemini 扩展，包含对话宽度调节，主题很接近 | 页尾公开欢迎软件开发商洽谈产品测试。未核实该作者个人接稿规则、费用与编辑安排，不能假设免费报道；只保留网站公开合作入口，暂不联系 | 若以后选择此渠道，先看是否接受题材；实际成文及其访问另计 |
| **暂缓：目录 [aaronhuff/awesome-gemini](https://github.com/aaronhuff/awesome-gemini)** | README 包含 Gemini Apps 与 Guides & Workflows；开源阅读工具或教程可能相关，这是适配推断 | [CONTRIBUTING](https://github.com/aaronhuff/awesome-gemini/blob/main/CONTRIBUTING.md) 要求直接描述性链接、维护良好的资源，并明确避免自荐／垃圾内容。不能把该目录当作允许维护者批量投链接的入口；未创建 Issue 或 PR | 只有规则允许且被接纳后，才记录实际目录外链；不预估星数收益 |

原 r/Bard 讨论用作需求证据。本计划不去旧帖批量回复、不私信普通用户，也不把一个有推荐的帖子等同于全社区允许自荐。没有准备 Hacker News AI 稿件。

## English pilot — one useful discussion, pending publication

**Channel:** r/chrome_extensions, Self Promotion flair. One post, one reading problem, one observation window. The owner should review the final wording and current rules when deciding to publish; no external action has occurred.

**Hypothesis:** People who already use Gemini for comparison tables will give more useful feedback on a concrete layout problem than on a broad feature announcement. This is an experiment proposal, not a measured result.

**Minimum post outline:**

- Disclose: “I maintain Wider Gemini, an open-source extension for Gemini reading layout.”
- Describe the task: a comparison table with several columns, or a long code line; identify which control changes the reading experience.
- Link the [English guide](../guides/reading-layout.md) and the source repository. Make clear that a very wide table can still need horizontal scrolling and wrapping is a display preference.
- Ask one question: “When reading a Gemini comparison table, what still makes it difficult to follow?” Do not request votes, reviews, or reciprocal stars.
- Link the currently available store build only. Do not advertise unreleased task presets or the internal reading lab as shipped features.

**Proposed store tag:** `utm_source=reddit&utm_medium=community&utm_campaign=reading_table_en_pilot`. Record the eventual post permalink and publication time. Leave other promotion and store-listing changes unchanged for a 14-day observation window where practical.

**Decision:** Review feedback after 7 days; close the pilot after 14 days. Three independent, actionable reports about a shared problem would justify investigating that problem; this is a small planning threshold, not statistical significance. If the post yields no meaningful response, stop rather than repeating it across communities. Remove or correct the post if a moderator requests it.

## 繁中試驗 — 一次相關題材投稿，尚未寄出

**對象：** 免費資源網公開聯絡表單。使用者決定啟動後，只向這一個入口提供一次資料；目前未填表、未寄信。

**假設：**「讓 Gemini 比較表格更好讀」比羅列所有設定更適合該站既有的工具體驗內容。作者是否有興趣與是否刊登都未知。

**最小資料包：** 維護者身分、專案與商店連結、[繁中操作教學](../guides/reading-layout.zh-TW.md)，以及一段可自行重現的使用情境：「開啟有多欄比較表的 Gemini 回覆，先調整對話寬度，再檢查是否仍需要橫向捲動；長程式碼則另開啟換行。」清楚寫出功能範圍是 gemini.google.com 的閱讀版面，不提供原生桌面 App 相容性保證，也不承諾所有表格都能完整塞進螢幕。無需新影片或宣傳圖片。

**邀請重點：** 請作者依自己的工作方式試用並自行判斷是否值得介紹。若提出問題，回答可驗證的產品行為；不要求正面評價、不催促刊登、不預先把對方列為推薦者。

**衡量：** 先記錄是否回覆與實際試用問題，未刊登就是尚無刊登成效。若作者自主刊登，記下原文、日期與其採用的連結；對方願意使用來源參數時，提議 `utm_source=freecom&utm_medium=editorial&utm_campaign=reading_table_zhtw_pilot`。以刊登後完整 14 天作描述性觀察，不把台灣全部安裝都算成文章成果。作者拒絕或未回覆時，不啟動批次催信。

## 两个实验共用的测量条件

Chrome 官方说明：商店的 GA4 集成需要在开发者后台选择启用，转发 `utm_source`、`utm_medium`、`utm_campaign`；`install` 事件在用户接受权限提示并完成安装时发送。数据有去标识化阈值等限制，文档列出的保留期为两个月。因此现在启用不能被当作恢复四月的历史传播证据。[官方集成文档](https://developer.chrome.com/docs/webstore/google-analytics)

执行前先确认自己的商店 GA4 属性能看到所需事件与来源维度。本轮没有登录该属性或验证配置。无法确认时，只记录实际可见的来源访问和反馈，安装转化填“未知”。商店日汇总安装数除以日访问数不是这篇帖子的匹配用户转化率；GitHub 星数变化也只作同期观察。

建议只建一个人工记录表：`渠道 / 原文 URL / 发布时间与时区 / campaign / 可见访问 / 可归因 install（或未知）/ 有效反馈 / 同期其他变更 / 结论`。当前阶段完成的是来源核查、教程和待执行计划，发布状态保持暂停。
