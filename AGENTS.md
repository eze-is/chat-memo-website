# Chat Memo Website

Chat Memo 产品家族的公开官网，生产地址 `https://chatmemo.ai`。

## 生产事实

- Git 仓库：`eze-is/chat-memo-website`
- 部署：Cloudflare Pages，从 `main` 分支根目录发布
- 页面 HTML、`updates-data.json` 与 `resource/` 是线上部署资产
- `chatmemo.ai` 与 `www.chatmemo.ai` 由 Cloudflare Pages 项目的自定义域名配置拥有；GitHub Pages 已退役

## 入口

| 任务 | 入口 |
|---|---|
| 页面结构 / 四语静态页生成 | `index.html`、`welcome.html`、`updates.html`、`scripts/build-localized-pages.mjs` |
| 社交分享图 / OG 与 Twitter 卡片 | `devtools/social-card/README.md`、`resource/social/`、`scripts/build-localized-pages.mjs` |
| 线上资源 | `resource/` |
| 官网多语言规则 / 翻译入口 | `doc/I18N.md`、`site-i18n.js`、`locales/{zh-CN,en,ja,es}.json` |
| 顶部导航菜单交互 | `components/navbar.html`、`site-nav.js` |
| 下载页与失败兜底 | `downloads.html`、`resource/download-page/`、`components/download-dialog.html`、`site-download.js`；安装包准备与分发由 Desktop 的 `services/download/` 拥有 |
| 官网统计加载及发布切换 | `site-analytics.js`、`scripts/site-entry.mjs`、`doc/RELEASES.md` |
| Hero 桌面端／插件切换与三 Tab 展示 | `hero-preview.js`、`hero-preview.css`、`devtools/hero-desktop/`；构建／行为与边界见 `doc/HERO-PRODUCT-PREVIEW.md` |
| 官网工程变更 / 独立部署流程与实际回执 | `CHANGELOG.md`、`doc/RELEASES.md` |
| 产品更新数据 / 桌面与插件条目来源 | `updates-data.json`、`doc/RELEASES.md` 的“三类记录” |
| 定价页及 Desktop Pro 公共展示配置归属 | 价格、中文功能和交付状态由`scripts/pro-pricing.mjs`读取API生产公共目录；方案翻译／图标消费App导出的`resource/pro-plan-presentation.json`，同步入口`devtools/export-pro-plan-presentation.mjs`；页面`pricing.html`，选价由`pricing-region.js`按页面语言／Cloudflare出口判断；归属及构建见`doc/PRO-PRESENTATION.md` |
| 固定跳转地址（如商店“支持网址”使用的 `/feedback` → 反馈表单） | `_redirects` 唯一维护反馈目标；2026-11-04 已停用 Cloudflare 域名层旧 `feedback` 单一重定向（规则 ID `12b01bfa5a734b2eb1c147931982d9fa`），避免其精确匹配 `/feedback/` 的旧 301 覆盖 Pages 配置 |
| 桌面版隐私政策／用户协议与静态页生成 | `doc/DESKTOP-LEGAL.md`、`desktop/legal/versions/{zh-CN,en}/`、`scripts/build-desktop-legal.mjs`；`/desktop/privacy`及`/desktop/terms`不替换插件旧政策 |
| 浏览器插件正式发版 / 插件官网条目 | `../browser-extension/.agent/skills/browser-extension-release/SKILL.md` |
| 更新海报与宣传 Markdown（仅显式要求宣传时） | `.agent/skills/chatmemo-release-marketing/SKILL.md` |
| 产品家族结构与宣传资产 | `../INDEX.md`、`../assets/brand-and-marketing/INDEX.md` |

## 开发资产

- `.agent/skills/` 是 Skill 唯一真实目录。
- `.agents/skills`、`.Codex/skills` 是兼容软链接，不维护副本。
- `CLAUDE.md` 指向本文件。

官网、桌面端和浏览器插件分别拥有发布生命周期。官网自身发布与回执由 `doc/RELEASES.md` 拥有；两端产品更新说明按该文档引用各自已确认的发布源，再由本仓生成四语静态页并验证。插件的 `browser-extension-release` 只统筹插件包与其官网条目，不接管所有官网变更。宣传 Skill 只负责已有海报和宣传 Markdown 能力，发布版本不会自动生成宣传材料。上方跨仓路径以各仓位于同一产品家族目录为前提；独立 worktree 中先确认实际路径，再按工具参数显式传入。

不要把插件源码、商店包或产品家族宣传源文件复制进官网仓；页面直接引用的部署资源必须继续留在本仓。
