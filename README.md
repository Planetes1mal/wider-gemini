# Wider Gemini

一个用于调节 Google Gemini 对话界面宽度的 Chrome 浏览器插件。

## 功能特点

- 🎯 **自定义宽度调节**: 通过滑块或预设按钮轻松调整 Gemini 对话区域的宽度
- 💾 **自动保存设置**: 设置会自动保存,下次访问时自动应用
- 🎨 **美观的界面**: 现代化的渐变设计,操作简单直观
- ⚡ **即时生效**: 调整宽度后立即应用到所有 Gemini 标签页
- 🔒 **不影响其他元素**: 只修改对话区域宽度,网页其他元素保持不变

## 安装方法

### 方法一: 开发者模式安装 (本地)

1. 下载或克隆此项目到本地
2. 打开 Chrome 浏览器,访问 `chrome://extensions/`
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目文件夹
6. 安装完成!

### 方法二: Chrome 网上应用店 (待上架)

敬请期待...

## 使用说明

1. 安装插件后,访问 [Google Gemini](https://gemini.google.com/)
2. 点击浏览器工具栏中的插件图标
3. 使用滑块调整宽度 (600px - 2000px)
4. 或点击预设按钮快速切换:
   - **默认**: 800px
   - **宽**: 1000px
   - **更宽**: 1400px
   - **超宽**: 1800px
5. 设置会自动保存并立即生效

## 技术栈

- Manifest V3
- Vanilla JavaScript
- CSS3 (自定义属性 + 渐变)
- Chrome Storage API
- Chrome Messaging API

## 文件结构

```
wider-gemini/
├── manifest.json       # 插件配置文件
├── content.js          # 内容脚本 - 注入到 Gemini 页面
├── content.css         # 样式调整
├── popup.html          # 弹出窗口界面
├── popup.css           # 弹出窗口样式
├── popup.js            # 弹出窗口逻辑
├── icons/              # 图标资源
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg
└── README.md           # 说明文档
```

## 开发说明

### 本地调试

1. 修改代码后,在 `chrome://extensions/` 页面点击刷新按钮
2. 刷新 Gemini 页面即可看到效果

### 修改默认宽度

在 `content.js` 中修改默认值:

```javascript
const width = result.chatWidth || 800; // 修改这里的 800
```

### 修改宽度范围

在 `popup.html` 中修改滑块范围:

```html
<input type="range" id="widthSlider" min="600" max="2000" step="50">
```

## 版本历史

### v1.0.0 (2024-10-14)
- 🎉 首次发布
- ✨ 支持宽度自定义调节
- 💾 设置自动保存功能
- 🎨 美观的弹出界面

## 许可证

MIT License

## 反馈与贡献

欢迎提交 Issue 和 Pull Request!

---

**注意**: 此插件仅修改页面样式,不收集任何用户数据,不影响 Gemini 的功能。
