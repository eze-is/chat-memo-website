# Chat Memo 更新文件格式指南

本文档说明 Chat Memo 更新海报 HTML 和更新说明 Markdown 的格式规范。

## 一、海报 HTML 格式

### 文件结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <title>Chat Memo Update {VERSION}</title>
    <style>
        /* 内联 CSS 样式 */
    </style>
</head>
<body>
    <div class="poster-container">
        <!-- 高斯模糊 Logo 背景 -->
        <div class="hero-bg">
            <img src="logo-single.png">
        </div>

        <div class="content-layer">
            <!-- 头部: Logo + 版本号 -->
            <header>
                <div class="logo-area">
                    <img src="logo-single.png" class="logo-img">
                </div>
                <div class="version-tag">Ver {VERSION}</div>
            </header>

            <!-- 标题区: 日期 + 主标题 -->
            <div class="hero-section">
                <p class="date">{DATE} 更新</p>
                <h1>{MAIN_TITLE}</h1>
            </div>

            <!-- 更新卡片列表 (动态数量) -->
            <div class="update-list">
                <!-- 卡片结构: -->
                <div class="card [highlight|]">
                    <div class="icon-box">{ICON}</div>
                    <div class="card-content">
                        <h3>{TITLE}</h3>
                        <p>{DESCRIPTION}</p>
                    </div>
                </div>
            </div>

            <!-- 底部 CTA -->
            <footer>
                <div class="cta-btn">立即更新体验</div>
                <div class="website">chatmemo.ai</div>
            </footer>
        </div>
    </div>
</body>
</html>
```

### 关键元素说明

1. **版本号位置**: 出现在 `version-tag` 和标题中
2. **发布日期**: 格式为 "YYYY年M月D日 更新"
3. **主标题**: 支持换行，可包含 `<br>` 标签
4. **卡片结构**:
   - 第一个卡片必须有 `highlight` 类
   - 每个卡片包含：图标、标题、描述
   - 图标使用 emoji
5. **颜色方案**:
   - 主色: `#5A4CFF` (紫色)
   - 蓝色: `#3B45C4`
   - 黄色: `#FFD700`
   - 背景: 模糊 Logo (opacity: 0.15, filter: blur(48px))
6. **Logo 文件**: `logo-single.png` 必须存在于 HTML 同目录

### 尺寸规格

- 画布: 600px × 800px (3:4 比例)
- Logo: 48px 高度 (在 header 中)
- 背景 Logo: 384px × 384px (模糊后的背景)
- 主标题: 42px 字号
- 卡片: 20px 圆角，白色背景 + 毛玻璃效果

### Logo 文件要求

**文件名**: `logo-single.png`
**位置**: 必须与生成的 `{VERSION}.html` 文件在同一目录
**用途**:
- 在 header 中显示（48px 高度）
- 作为背景模糊效果（384px × 384px，15% 透明度，48px 模糊）

**如果没有 Logo 文件**: HTML 文件仍能打开，但 will display broken image icons。建议在生成 HTML 后立即复制 logo 文件到同一目录。

---

## 二、更新说明 Markdown 格式

### 文件结构

```markdown
标题：{HEADLINE}

内容：

{EXECUTIVE_SUMMARY}

——————
🚀 本次更新亮点：

{FEATURE_LIST}

——————
📥 如何更新？

1️⃣ 如果你已经在使用 Chat Memo，插件会自动更新到最新版本。也可以手动在浏览器的扩展管理页面中更新

2️⃣ 如果你是新用户：
欢迎访问 chatmemo.ai，或 Chrome 商店搜索「chat memo」，开始构建你的 AI 记忆知识库！

如果无法访问 Chrome 商店，可访问本地安装教程：https://chatmemo.feishu.cn/wiki/Pf0VwsQbkiDuDYkiwiLcZPBPnyf

——————
💬 反馈与共建

Chat Memo 的成长离不开每一位用户的建议。如果你有任何想法或遇到问题，欢迎通过产品内的「联系我们」按钮告诉我们，你的声音很重要！

官方网站：chatmemo.ai
```

### 关键元素说明

1. **标题**: 简短有力，突出核心更新
2. **内容部分** (Executive Summary):
   - 2-3 句话总结本次更新的重点
   - 可以用 emoji 开头
3. **功能列表格式**: `1️⃣ {功能名}\n{详细描述}`
   - 序号后使用中文 emoji 数字
   - 每个功能后空一行
4. **如何更新**: 固定模板，无需修改
5. **反馈与共建**: 固定模板，无需修改

### 风格指南

**轻松活泼风格应包含：**

- 使用 emoji 表情（🎉、🚀、✨、🔧、💡 等）
- 口语化表达："重磅功能来啦！"、"终于等到你！"
- 亲切语气："灵感不再丢失"、"每一句对话都将被妥善保管"
- 段落简短，易于阅读

**示例对比：**

正式：
> 新增对 Kimi 平台的支持，可自动保存对话记录。

轻松活泼：
> 🚀 新增 Kimi 平台支持
> 终于等到你！现在 Chat Memo 也能自动保存 Kimi 的对话记录了，灵感不再丢失，每一句对话都将被妥善保管。

---

## 三、功能项格式

在命令行和模板中，功能项使用统一格式：

```
图标|标题|描述
```

### 图标选择建议

- 新功能: 🚀、🎉、⭐、💫
- 性能优化: ✨、⚡、🚀
- Bug 修复: 🔧、🐛、🩹
- 新增平台: ✅、🎊
- 界面改进: 💅、✨
- 底层重构: 🔨、⚙️

### 标题撰写建议

- 保持简短：2-10 个字
- 突出用户价值："新增 Kimi 支持" 而非 "接入 Kimi API"
- 使用动词：支持、优化、修复、新增

### 描述撰写建议

- 1-2 句话
- 解释功能带来什么好处
- 避免过于技术性的术语（除非用户群体是开发者）

---

## 四、示例数据

版本号: 1.1.2
日期: 2025年12月3日
主标题: 浏览器兼容大优化，<br>支持 Kimi 记忆
更新说明标题: Chat Memo 兼容全部浏览器啦！还能同步 Kimi 聊天记忆！v1.1.2 发布

功能列表:
1. 🚀|新增 Kimi 平台支持|终于等到你！现在可以自动保存 Kimi 的对话记录了
2. ✨|浏览器兼容性大优化|无论你是用 Dia 还是夸克，任何浏览器都能流畅打开扩展界面
3. 🔧|豆包平台修复|修复了豆包平台消息保存失败的问题

---

## 五、文件命名规范

- HTML 文件: `{VERSION}.html` (例如: 1.1.2.html)
- Markdown 文件: `{VERSION}-update.md` (例如: 1.1.2-update.md)

两个文件应保存在同一目录。
