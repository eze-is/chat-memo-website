# 官网发布与部署记录

官网由本仓 `main` 的已提交静态资产发布到 Cloudflare Pages，正式域名为 `chatmemo.ai`。它独立于桌面安装包和插件商店包；改官网才部署官网，不因 Desktop 发布新版本重发无关服务或插件。

## 三类记录

- `CHANGELOG.md`：官网自身完成了什么，尚未部署的变化放在 Unreleased；不把产品更新条目当作官网工程账本。
- `updates-data.json`：面向访客的产品更新说明。桌面端条目在 `desktopUpdates`，依据 Desktop 仓 `releases/<version>.json` 的已确认用户说明和实际公开日期整理；插件条目由插件仓 `doc/release-entry-<version>.json` 及 `scripts/prepare_release.py` 生成。两者保持各自版本与含义，不从工程 Changelog 自动复制全部内部细节。当前没有 Desktop 条目自动导入器，人工同步时须核对原说明。
- 本文件：发布流程、当前生产回执和专项证据入口。部署记录至少包含版本标识、实际发布时间（UTC+8）、环境、完整源码 SHA、Pages deployment ID、验收结果与限制；撤回或回滚另记结果，不覆盖原失败事实。长期专项证据引用原文，不再复制整套日志。

版本节点使用 `[源码短 SHA] — 实际生产部署成功时间 UTC+8`；发布时间读取 Pages 成功 deploy 阶段的结束时间，不使用 Git 提交时间或计划时间。未发布保留 Unreleased，不强行使用 Desktop 版本号。纯文档维护可引用已发布的页面运行内容基线，并通过 Cloudflare 部署记录查询该文档提交对应的后续 deployment；不把后续文档 SHA 回填成原产品部署 SHA，也不为在文档中记录自身部署反复推送。

## 发布步骤与确认边界

1. 确认本次范围及授权。普通源码提交不等于生产已生效；本仓 push `main` 会触发生产 Pages，须在已授权的官网发布范围内执行。一次已明确的发布授权覆盖同一范围的构建、推送和结果核验，不逐命令反复确认。
2. 核对当前分支、dirty、实际远端及候选 SHA，保留其他任务改动。只提交本次已确认内容。官网自身内容可独立发布；产品更新记录在该产品的目标发布渠道已可获取后再公开，草稿包不写成正式发布，GitHub 插件包也不代表商店已上线。
3. 按 [I18N.md](I18N.md#发版与验收) 运行生成、测试与一致性检查；涉及法律文档时同时执行 `npm run build:legal` 和 `npm run check:legal`，涉及产品预览时执行相应 `build:hero` / `check:hero`。源文件和生成物一起核对，不手改派生 HTML。
4. 在授权范围推送 `main`，确认 Cloudflare Pages 的 **production** 部署成功且对应本次完整 SHA。仅 Preview 成功或 Git 已同步不算上线。
5. 回读受影响的正式页面、对应语言及关键交互；产品发布条目还要核对版本、文案和下载入口。保存部署回执。受限或未执行的浏览器、安装、商店验收明确写出，不以构建成功代替。
6. 部署失败时先保留原生产版本。需要回滚时使用已确认可用的 Pages 部署，并记录实际回滚 ID / SHA；回滚线上还需同步本仓源码，避免下一次自动部署覆盖修正。

App 更新包及 `/desktop/download`、`/desktop/updates` 下载服务的发布由 Desktop 仓拥有；官网入口保持固定，不因新包发布手工改成临时资产链接。插件发版工具与商店步骤由插件仓的 release skill 拥有。本文件不新增跨仓自动发布器。

## 页面运行内容发布回执

### [f0251fb] — 2026-11-07 13:49:35 UTC+8：Desktop 1.0.7 四语说明

- 产品公开依据：[Desktop v1.0.7](https://github.com/eze-is/chatmemo-desktop-releases/releases/tag/v1.0.7)，实际公开时间 2026-11-07 13:48:27（UTC+8）；本官网版本与 App 包版本、发布时间分别记录。
- 官网源码：`f0251fb2c739058027f5569969d687766835fb0a`；Pages production deployment `c798ce06-fd19-402b-9554-18685e57b3d2` 于 2026-11-07 13:49:35（UTC+8）成功。
- 范围仅为 `desktopUpdates` 新条目及五份生成更新页。五项中文逐字取自 Desktop `releases/1.0.7.json`，英／日／西语经独立审阅；旧桌面与插件条目逐项比对保持。未修改定价、宣传资源或下载链接。
- 55 项测试、i18n 生成一致性及 diff 检查通过。正式浏览器回读四语版本、实际日期和五项内容，并通过页面 DOM 点击事件核对双 Tab 切换与返回；Desktop 共两条记录，插件保留 20 条且最新仍为 v2.0.0。Ego 跨导航的指针点击有未触发情况，本轮不将 DOM 事件验收称为物理键鼠验收；此次官网验收也不替代 App 安装／升级或插件商店验收。
- 本机回执：`/tmp/chatmemo-website-107-content-deployment.json`、`/tmp/chatmemo-website-107-browser-readback.json`。本文及 Changelog 的后续记录提交仅追加发布事实，页面运行内容仍为上述 SHA；文档提交对应的 Pages deployment 由下方项目部署列表核对，不反复修改本文以记录自身部署。

### [2ba8d11] — 2026-11-07 13:02:16 UTC+8：双 Tab 更新记录

- 环境：production；Pages 项目 `chat-memo-website`，生产分支 `main`。
- 源码：`2ba8d110f86911e99e46fc9d4bfff5d11303e9d1`。
- Deployment：`b892a5ff-f609-4833-aa11-0ac0ccdce48c`，2026-11-07 13:02:16（UTC+8）部署成功。2026-11-07 本轮流程检查通过 Cloudflare 只读管理接口再次核对 canonical production 与源码匹配。
- 既有验收：55 项测试、i18n / 法律生成检查，四语及窄宽屏、Tab / 键盘 / 历史导航与无 JavaScript 正文检查。原基线证据入口为 Desktop 仓 `docs/tasks/RELEASE-1.0.7-BASELINE.md`；本机回执 `~/Documents/Eze/Archive/Projects/ChatMemo/source-baseline-20261107/final-verification.json`。
- 本轮新增检查仅确认 Git 与云端部署身份；直接 HTTP 读取遇 403，未重复浏览器页面验收，不据此宣称页面异常或新增页面验收通过。
- 该版本官网展示 Desktop 1.0.6；当时 1.0.7 尚未加入。浏览器插件记录保留原内容，不将这次官网部署视为新的插件发布。

客服邮件及法律文档的此前生产版本为 `7b1fe56`，Pages deployment `a1918413-3948-4059-8858-ef1fa18d5cd9`，实际成功时间为 2026-11-07 11:04:17（UTC+8）；详细证据见 [DESKTOP-LEGAL.md](DESKTOP-LEGAL.md#2026-11-07正式客服邮件迁移)。

本轮流程文档提交不改变页面 HTML、脚本、样式或更新数据。上述条目记录页面运行内容的发布时间，不等同于文档提交后的最新 Pages deployment；后续部署身份以 [Cloudflare Pages 项目部署列表](https://dash.cloudflare.com/008df998c4e05d9ba380e310c79810c4/pages/view/chat-memo-website) 和 [Git 提交记录](https://github.com/eze-is/chat-memo-website/commits/main/) 对账。
