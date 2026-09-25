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
| 线上资源 | `resource/` |
| 官网多语言规则 / 翻译入口 | `doc/I18N.md`、`site-i18n.js`、`locales/{zh-CN,en,ja,es}.json` |
| 更新数据 | `updates-data.json` |
| 浏览器插件正式发版 / 官网版本记录 | `../browser-extension/.agent/skills/browser-extension-release/SKILL.md` |
| 更新海报与宣传 Markdown（仅显式要求宣传时） | `.agent/skills/chatmemo-release-marketing/SKILL.md` |
| 产品家族结构与宣传资产 | `../INDEX.md`、`../assets/brand-and-marketing/INDEX.md` |

## 开发资产

- `.agent/skills/` 是 Skill 唯一真实目录。
- `.agents/skills`、`.Codex/skills` 是兼容软链接，不维护副本。
- `CLAUDE.md` 指向本文件。

官网与浏览器插件是独立 Git 仓。正式发版由插件仓的 `browser-extension-release` 统筹，其 `scripts/prepare_release.py` 根据结构化条目更新官网 `updates-data.json`；随后在官网仓运行 `npm run build:i18n`、`npm test`、`npm run check:i18n`，把派生的四语静态页与数据一起提交。商店更新说明仍为中英双语。宣传 Skill 只负责已有海报和宣传 Markdown 能力，发布版本不会自动生成宣传材料。上方跨仓路径以两个仓位于同一产品家族目录为前提；独立 worktree 中先确认两个仓的实际路径，再按发版工具参数显式传入。

不要把插件源码、商店包或产品家族宣传源文件复制进官网仓；页面直接引用的部署资源必须继续留在本仓。
