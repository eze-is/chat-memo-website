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

App 更新包及 `/desktop/download`、`/desktop/updates` 下载服务的发布由 Desktop 仓拥有；官网入口保持固定，不因新包发布手工改成临时资产链接。下载页和准备接口属于跨仓配套变更；必须先部署并核验兼容的下载网关，再部署官网。插件发版工具与商店步骤由插件仓的 release skill 拥有。本文件不新增跨仓自动发布器。

## 统计加载与本次发布检查

GA4 是官网营销页浏览量的唯一统计源。原有首页、欢迎页、更新页、定价页在页面 `load` 完成后独立加载 GA4；中立入口、法律页和嵌入的桌面演示不加载统计。官网点击只写有上限的本地队列，统计脚本和发送结果不参与菜单、语言、报价或下载。页面加载完成或队列发送前离开的访问可能少记，定价仍只排入一次去掉查询参数、片段和 referrer 的 GA4 浏览事件。下载入口上的 `?link=website` 仍标记下载服务的来源；下载请求与页面浏览分别计数。

首次发布这项变更时，须在授权的发布窗口停用官网的 Cloudflare Web Analytics，关闭 Pages 自动注入，并核对域名层没有另一条自动注入规则。部署后用真实浏览器确认各入口均未加载 Cloudflare beacon，且规范营销页在 `load` 后只加载一次 GA4。用测试访问对账一次页面浏览及原下载来源，并在阻断 GA4 的条件下复查跳转、菜单与报价。生产配置和 GA4 接收回执以该次发布实测为准。

## 页面运行内容发布回执

### [87d12dd] — 2026-11-13 21:48:02 UTC+8 · 更新日志页取消开屏动画

- 运行内容源码 `87d12dd90bdd8ea14f6801f15ce3d726b9a3d49b`，Cloudflare Pages production 部署 `13522a14-20ed-48dd-8956-7755183f1470`；实际时间取 deploy 阶段 `ended_on=2026-11-13T13:48:02.424092Z`。
- 更新页直接采用原动画结束后的 300px 页头；移除全屏初始布局、嵌套延时、正文隐藏、滚动锁定与已无消费者的动画入口。产品页签、更新文案及其他页面保持；导航初始化仍不等待运行时词包。
- 69 项官网测试、四语生成一致性和 diff 检查通过。Ego Lite 检查四语桌面、390px 手机模拟、页签点击和键盘切换；正式站浏览器确认页头 300px、过渡时长 0s、正文不透明度 1、无滚动锁定和入场动画。四语正式 HTML 与源码 SHA-256 一致。本机回执前缀 `/private/tmp/chatmemo-updates-no-intro-` 下分别保存 `deployment.json`、`readback.json`、`browser.json` 和 `browser-production.json`；未代表真手机或客户端安装升级验收。

### [360b18a] — 2026-11-13 21:13:44 UTC+8 · 1.0.9 保留功能标题

- 运行内容源码 `360b18a94d6b1c737469e1dc653a56b5285f49e5`，Cloudflare Pages production 部署 `1348fb2c-f14a-4e21-9169-5e3be2838514`；实际时间取 deploy 阶段 `ended_on=2026-11-13T13:13:44.667716Z`。
- 六项说明恢复中、英、日、西四语功能小标题；正文逐字保留上次已确认原文，不恢复额外摘要。不修改渲染器、样式或其他历史记录。
- 69 项官网测试、四语生成一致性、diff 检查通过。正式四语 HTML 与源码一致，六个标题及原文正文均已回读；回执为 `/private/tmp/chatmemo-website-109-titles-deployment.json` 和 `/private/tmp/chatmemo-website-109-titles-readback.json`。

### [3251d40] — 2026-11-13 21:11:09 UTC+8 · 1.0.9 沿用已确认原文

- 运行内容源码 `3251d4008888fec4c2cecbf4c52616b8285600b3`，Cloudflare Pages production 部署 `070d5bcd-a94c-4e55-9e0f-6b2ce8d056fb`；实际时间取 deploy 阶段 `ended_on=2026-11-13T13:11:09.479366Z`。
- 1.0.9 直接展示六条已确认说明，不另加摘要或功能小标题。中文和英文与 Desktop `releases/1.0.9.json` 中的 `notes`、`notesEn` 逐字一致，日文和西文忠实翻译。摘要、小标题省略时不生成空占位；既有历史条目数据与渲染输出逐字节保持。
- 69 项官网测试、四语生成一致性和 diff 检查通过；正式站四语 HTML 与发布源码 SHA-256 一致，六条原文及无额外标题均已回读。回执保存在 `/private/tmp/chatmemo-website-109-original-wording-deployment.json` 与 `/private/tmp/chatmemo-website-109-original-wording-readback.json`。未重新发布安装包或验收客户端升级。

### [7890dde] — 2026-11-13 21:04:13 UTC+8 · Desktop 1.0.9 四语说明

- Desktop v1.0.9 已于 2026-11-13 20:24:08（UTC+8）正式公开。官网运行内容源码 `7890ddef673255fdaeb0c14d5249333de0788115`，Cloudflare Pages **production** 部署 `d6daf003-e5ef-410c-a52e-d1848ef79c40`；实际时间取 Pages deploy 阶段 `ended_on=2026-11-13T13:04:13.470101Z`。[桌面版正式发布](https://github.com/eze-is/chatmemo-desktop-releases/releases/tag/v1.0.9)
- `desktopUpdates` 新增 1.0.9 六项说明及中、英、日、西四语译文，五份更新页由现有生成器生成。中文说明与 Desktop `releases/1.0.9.json` 逐字一致；既有桌面历史、插件记录和页面布局保持。使用独立 worktree 从实时 `origin/main` 发布，本地主树尚未发布的历史整合与 Hero 检查改动未混入。
- 68 项官网测试、四语生成一致性、6 个法律静态页面一致性及 diff 检查通过。正式站四语更新页 HTTP 200，全部 HTML 的 SHA-256 与该发布源码一致，版本、日期及六项译文均已核对；正式 `updates-data.json` 与源码一致。部署与回读凭据分别在本机 `/private/tmp/chatmemo-website-109-deployment.json`、`/private/tmp/chatmemo-website-109-readback.json`。
- 本次仅更新说明内容，没有重新构建或发布安装包，也未重复验收浏览器交互、下载、真实设备或客户端升级；文档回执的后续提交不替代上面的运行内容源码。[官网更新日志](https://chatmemo.ai/zh-CN/updates)

### [4c8feb8] — 2026-11-10 15:09:22 UTC+8 · 设备版本下载菜单

- 生产运行内容源码 `4c8feb894fdecfe6e91e05bdcfcdb49695124212`，Cloudflare Pages production deployment `4d65c4f8-baef-4e43-bd31-9ae73f4c45ad`。首页、页尾与导航支持选择 Apple 芯片、Intel 芯片和 Windows 版本；浏览器未提供可靠信息时不自动下载。已有下载网关与安装包未重新发布。
- 68 项官网测试、四语生成一致性、法律页面一致性与独立代码审计通过。正式站四语首页回读版本菜单及推荐标记；中文首页、下载脚本和样式与发布源码 SHA-256 一致。浏览器模拟未识别设备时验证主按钮禁用、手动选 Intel 的准备请求及模拟失败弹窗；本机 Apple 芯片 Chrome 验证推荐与悬停菜单。
- Intel Mac 真机、Windows 真机和真实屏幕阅读器未验收；未进行安装或升级测试。浏览器触摸模拟不代表真实手机验收。

### [0dc95c2] — 2026-11-10 11:22:08 UTC+8 · Intel Mac 下载入口

- 生产运行内容源码 `0dc95c2e3ccbc327f79a61f17e00b26975475ae5`，Cloudflare Pages production deployment `9769a597-810f-4c1a-905c-17fd2e87f356`。桌面下载页增加 Intel Mac，主下载保持 Apple 芯片版，并说明 macOS 12 及以上要求。
- 官网 67 项测试和四语生成一致性通过；Ego Lite 在本地检查桌面、平板和手机布局，并回读正式中文页面和链接。桌面 v1.0.8 Intel 包通过签名、公证和镜像完整读回，正式 Intel 接口 HEAD 和 Range 检查通过；Intel 真机安装与真实升级尚未验证。

### [21e70a2] — 2026-11-09 17:03:39 UTC+8 · Desktop 1.0.8 四语说明

- Desktop v1.0.8 于 2026-11-09 17:02:46（UTC+8）正式公开。官网生产运行内容源码为 `21e70a23d2710b07626dc52370db2a7cee53e5c3`，Cloudflare Pages production deployment `e2969ba4-f2ff-47d5-bf02-af322082d4d4` 于 17:03:39（UTC+8）成功。[桌面版正式发布](https://github.com/eze-is/chatmemo-desktop-releases/releases/tag/v1.0.8)
- 更新包含 `desktopUpdates` 的 1.0.8 条目和五份生成页面。三项中文与 Desktop 的 `releases/1.0.8.json` 逐字一致，旧桌面和插件条目逐项核对一致。66 项官网测试、四语生成与法律页一致性检查通过。
- Ego Lite 回读正式站四语更新页，四页均返回 200，首响应和渲染页面均包含正确版本、日期及三项说明。核对了双端下载入口、键盘切换桌面与插件页签、中文切换至英文，以及错误地址返回 404。本机回执见 `/tmp/chatmemo-website-108-deployment.json` 和 `/tmp/chatmemo-website-108-browser-readback.json`。[官网更新日志](https://chatmemo.ai/zh-CN/updates)

### [8234dfd] — 2026-11-09 09:50:06 UTC+8 · 顶部下载页入口

- 生产运行内容源码 `8234dfdc69420a64210c2541bf9a895cce7aeca5`；Cloudflare Pages production deployment `c2d067d4-adf1-4a70-8873-9b63d4e87329` 于 09:50:06（UTC+8）成功。桌面导航和手机菜单新增指向当前语言下载页的入口，原有桌面端直接下载按钮保留。
- 官网 66 项测试、四语静态生成与法律页一致性检查通过；Ego Lite 正式站回读四语导航，在 1024px 检查间距与文字，并实际从桌面导航和 390px 手机菜单进入中文下载页。UI Lab 的桌面和手机预览及构建通过；手机测试为浏览器模拟。本次没有发布新安装包。

### [db455e2] — 2026-11-08 23:37:08 UTC+8 · 下载页与可靠下载

- 生产运行内容源码 `db455e2e0eee3a17d75f17bf7b2a2f0700313699`，Cloudflare Pages production deployment `ce652365-383a-4bf5-b42a-b5a2ee7e45dd` 于 23:37:08（UTC+8）成功。官网与下载服务的源码分别推送至各自 main，未发布新 App 安装包。
- 首次功能提交 `e45b07ff58d07535fbcb0bf84d139ed75e57f3eb` 的生产部署 `93250ca5-0cc4-4a4d-a95f-c6023b181ab1` 于 23:30:36 成功，但旧服务的 `/download*` 路由拦截了新样式，页面样式异常。修复提交 `ecd17f3d55b6ad70059186dfd5abd736f82ff534` 的部署 `0cf12eed-c907-424d-98ce-e4d5eb072985` 于 23:34:24 成功，资源移至 `/resource/download-page/`。随后发现中立 `/downloads` 也被旧服务拦截，最终提交改用 `/get`；保留旧服务及 `/download/mac` 原行为。
- 66 项官网测试、四语生成一致性、6 个法律页面及 Hero 源码检查通过。正式站回读四语页面、样式和图片；Ego Lite 分别检查桌面与 375px 模拟窗口、两张配图对齐、四语系统选择弹窗、Escape 焦点恢复及 `/get` 语言选择，并打开 Chrome／Edge 官方商店详情页。主域及 www 准备接口的跨域行为通过检查。
- 下载服务运行源码 `942c47dd69afb2597713ecee764ab4a5d7373721`、Worker 版本 `a755977f-8aec-4c10-91db-de79e4764119`。正式 v1.0.7 双端安装包经网关全量下载并核对清单 SHA256；后续版本由发布流程维护镜像。真实设备安装／升级、真实下一版本公开流程与统计 RPC 实际入账未验证；浏览器接管文件后的传输中断不能由网页可靠检测。

### [ea8bc4d] — 2026-11-08 17:43:44 UTC+8 · 官网下载标识跨域

- 生产分支 `main` 的运行内容源码为 `ea8bc4dd6d2879cf23131715524d413c7e100d4d`。Cloudflare Pages production deployment `3eb93ffc-5e3c-484a-8842-989950609866` 于 2026-11-08 17:43:44（UTC+8）成功。
- 正式官网的短期下载标识改由主域和 `www` 共享；预览域仍限定当前主机。已存在的 host-only 标识在原到期前仍可能未识别，禁用 cookie 或不支持 Web Locks 时不推算浏览器人数。
- 发布前隔离工作树的 60 项网站测试、四语生成一致性、6 个法律静态页面及 diff 检查通过。发布后两个正式域名的 `site-nav.js` 均与提交逐字节一致；中文首页返回 200 且引用新版脚本哈希。
- 尚未在正式站用真实浏览器验证 cookie 跨域传递，也未用正式下载 GET 验证统计 RPC 落库；静态资源回读不代表这两项已通过。

### [15eaa80] — 2026-11-07 20:38:11 UTC+8 · 桌面演示玻璃 Tab 顺滑化

- 生产分支 `main` 的运行内容源码为 `15eaa80c1b58442429c1937384e0b1d611b5d8a2`。Cloudflare Pages production deployment `ddd5c982-51fe-48a9-8ab3-b85a5bf4f20c` 于 2026-11-07 20:38:11（UTC+8）成功。四语首页、Hero 入口及新 JS／CSS 共 7 项正式资源与提交逐字节一致，嵌入入口使用 `20261107-desktop-direct-render` 版本参数。
- 原因是官网先把正式 `1120×720` Desktop 组件投射为完整画布，再在桌面 iframe 内整体缩放；玻璃 Tab 因而在带模糊的缩放合成层内移动。当前 640px 及以上 iframe 直接以实际宽高渲染，不再给画布和弹窗增加变换；窄屏仍缩放完整桌面窗口，不修改正式 Desktop 组件、玻璃材质和三 Tab 交互。
- 正式站 1440px 浏览器中，Hero iframe 为 `1022×656`，画布 `transform` 为 `none`；首页、记录、连接连续切换，文档与正文均无横向溢出。390×844 触摸模拟中，画布仍按 `0.302778` 缩放，原型内 Tab 透明触控层为 `132×44` CSS px；三次触摸事件均命中并依次切到首页、记录和连接。
- 发布前 Hero 源码与 14 个来源／42 条对话 fixture 检查通过；官网 59 项测试、四语生成一致性、6 个法律静态页面及 Hero 资源闭包检查通过。构建在隔离工作区读取 Desktop 已提交 `HEAD`，未带入 Desktop 工作区的其他在途改动。
- 触摸证据来自 Ego Lite 的 Android Chrome 触摸模拟，不替代 Android 真机验收；自动化浏览器的帧调度也不作为真实设备达到固定帧率的证明。本机回执为 `/tmp/chatmemo-pill-production-deployments.json`、`/tmp/chatmemo-pill-production-browser.json`、`/tmp/chatmemo-pill-production-mobile-final.json`、`/tmp/chatmemo-pill-prod-assets.MnsprV/` 及对应桌面／手机截图。

### [f55491a] — 2026-11-07 20:03:28 UTC+8 · 手机原型触控纠正

- 生产分支 `main` 的运行内容源码为 `f55491a64dad28896bb602b76cb3e486eb33fbf4`。Cloudflare Pages production deployment `a5d55394-8558-47c4-9df7-efb83182bc8b` 于 2026-11-07 20:03:28（UTC+8）成功。四语首页、Hero 脚本与样式、演示入口和构建 JS／CSS 共 9 项正式资源与提交逐字节一致。Cloudflare Web Analytics 自动注入仍关闭。
- 真机反馈证明前两次浏览器模拟的结论不完整。桌面窗口缩到 390px 后，原型 Tab 约为 11×11 CSS px，续聊入口约 78×13 CSS px。Android Chrome 会显示胶囊按下反馈，但轻微触摸位移可能取消最终 click。旧编排在选页确认前就记录“用户已固定”，因此还会停止自动轮换。
- 本版撤下首页演示下方额外增加的三个可见 Tab。在原型窗口内原控件位置增加透明触控层，三个 Tab 连续区域为 132×44 CSS px，续聊入口高度为 44 CSS px。手机 `touchstart` 直接进入原选页或对比命令，触摸层不产生第二组可见导航。轮播只在正式选页回调完成后固定。
- 正式站浏览器验证通过普通动态设置下首页自动轮到记录、三个 Tab 和续聊入口触摸、3px 横向加 4px 纵向位移后的选页，以及减少动态时停播但手动选页可用。59 项测试、四语与法律静态页一致性和 Hero 源码检查通过。
- 当前机器没有连接 Android 设备。上述触摸证据来自 Android Chrome 触摸模拟，正式 Android Chrome 真机是否恢复由用户设备复核，当前不记为真机通过。本机证据为 `/tmp/chatmemo-mobile-correction-production.json` 和 `/tmp/chatmemo-mobile-correction.png`。

### [298a4dc] — 2026-11-07 19:48:06 UTC+8 · 记录页续聊按钮

- 生产分支 `main` 的运行内容源码为 `298a4dc8151c33b81badc14d4108498dc6ad6189`。Cloudflare Pages production deployment `13af8cc0-308b-4fa5-9ccb-da6f6aab91de` 于 2026-11-07 19:48:06（UTC+8）成功。正式域名回读的四语首页、Hero 脚本和样式、演示入口及其 JS、CSS 和字体共 10 项均与提交逐字节一致。Cloudflare Web Analytics 自动注入仍关闭。
- 发布前 59 项测试、四语与法律静态页一致性和 Hero 源码检查通过。正式站 Android Chrome 触摸模拟点击记录详情底部的「在别的 AI 里接着聊」后打开能力对比。弹窗在 5.1 秒观察期间保持打开、轮播暂停。点击关闭后继续演示，切换 Tab 时关闭弹窗。对比中的展示按钮保持在第一层。桌面键盘 Enter 打开、Escape 关闭并将焦点还给原按钮。
- 正式站冷缓存 390×844 触摸模拟使用下行 1.6 Mbps 和 150 ms 请求延迟。导航后约 1.4 秒可先点选 Tab，约 7.7 秒后演示已应用选择。该计时来自单次浏览器模拟。
- 正式站回归验证默认轮播、两段功能视频的播放与离屏暂停、桌面插件视频及切回演示、中英文各一个地区报价和带官网来源参数的 Mac／Windows 下载入口。手机覆盖使用浏览器模拟。
- 本机证据见 `/tmp/chatmemo-mobile-tabs.OsySwn/` 的 `production-cta.json`、`production-regression.json`、`production-http.json` 和 `cta-deployment.json`。
- 2026-11-07 后续 Android Chrome 真机反馈显示续聊入口仍无法可靠点击；本条只保留当时浏览器模拟事实，纠正见 `f55491a`。

### [1aa6b3c] — 2026-11-07 19:42:52 UTC+8 · 手机演示 Tab 触控修复

- 生产分支 `main` 的运行内容源码为 `1aa6b3ce2cf075edebb9f3ca0e8ac8a1c03fb4ef`。Cloudflare Pages production deployment `827fd0a3-e2c0-4e0b-b7f4-860697c81bd6` 于 2026-11-07 19:42:52（UTC+8）成功。
- 发布前 59 项测试、四语与法律静态页一致性和 Hero 源码检查通过。正式站 390×844 Android Chrome 触摸模拟核对三个新按钮，触控区各高 44 CSS px。暂停演示脚本请求时连续点两个 Tab，恢复请求后打开最后所选页。自动能力对比弹窗打开时可切到「连接」。1440px 下窗口内导航仍可点击。
- 本机证据见 `/tmp/chatmemo-mobile-tabs.OsySwn/` 的 `production-tabs.json` 和 `runtime-deployment.json`。
- 2026-11-07 后续 Android Chrome 真机反馈显示窗口内 Tab 仍无法可靠点击，且额外可见 Tab 偏离原型；本条只保留当时发布事实，纠正见 `f55491a`。

### [df2a6c2] — 2026-11-07 15:46:37 UTC+8：官网样式及首页演示提速

- 生产分支 `main` 的运行内容源码为 `df2a6c27eabcff8216407cf11bcea34ec9155d0a`。Cloudflare Pages production deployment `f12a5ac5-36ea-4471-9fdd-d424d74d5c03` 于 2026-11-07 15:46:37（UTC+8）成功。四类正式营销页面样本、演示入口与共享 CSS 回读均与提交逐字节一致，Cloudflare Web Analytics 自动注入保持关闭。
- 发布前 58 项测试、四语与法律静态页一致性和 Hero 源码检查通过。Ego Lite 正式站冷加载对照使用 390×844 触摸模拟、下行 1.6 Mbps、150 ms 请求延迟及禁用浏览器缓存，首屏显示后滚到演示。中文首页从导航开始到演示可操作由 16.90 秒降到 7.21 和 7.31 秒，发布后两个样本的海报分别在 1.25 和 2.24 秒可见。这是浏览器限速样本。
- 正式站验证通过限速后的三个演示 Tab 触摸切换、默认自动轮播、两段功能视频滚入播放和离屏暂停、桌面插件视频播放和切回桌面演示。三段 MP4 的前 64 KiB 均与发布产物一致，媒体索引在音视频数据之前。
- 中文定价只显示人民币档，英文定价在本次网络出口只显示美元档。移动菜单能打开带 `link=website` 的下载选择页，两平台入口均指向 1.0.7，安装包 URL 的 HEAD 最终返回 200。
- 本机验收数据见 `/tmp/chatmemo-site-speed-prod.hjtwPR/` 的 `before.json`、`after.json`、`throttled-tabs.json`、`verify.json` 和部署及 HTTP 回执。后续文档提交只补发布记录，最新部署身份以 Pages 项目与 Git 历史对账。

### [dbc678d] — 2026-11-07 14:57:41 UTC+8：官网首屏、演示资源和统计隔离

- 生产分支 `main` 的运行内容源码为 `dbc678d1edc7da3bfaaed8d2d8ab8966b2da9e16`。Cloudflare Pages production deployment `f6fa1509-520f-4ce8-aa74-22c197ae05e5` 于 2026-11-07 14:57:41（UTC+8）成功。推送前已在 Cloudflare 禁用 `chatmemo.ai` 的 Web Analytics 自动注入。API 回读确认规则关闭，Pages 项目无额外统计标签。
- 57 项测试、四语和法律静态页一致性、Hero 源码检查通过。正式域名回读的中立首页、中文首页、英文定价、演示 iframe 和 WebP 海报与发布源码逐字节一致。
- 正式浏览器抽查中立首页跳转后的中文首页、中文欢迎页、中文更新页及中英文定价。每页在 `load` 后各请求一次 GA4 SDK，浏览器各发出一次 `page_view`。样本均无 Cloudflare beacon，法律页和演示页没有统计请求。本机至 Google 收集端连接未收到成功回执，尚未核验 GA4 后台入账。
- 正式域名故障注入让 GA4 SDK 请求持续挂起，中文入口正常跳转并保留来源参数和锚点，人民币和美元报价、移动导航、带 `link=website` 的下载选择页、演示自动轮播、三个 Tab 及能力弹窗均通过。Mac 和 Windows 下载入口指向 1.0.7，跟随安装包地址的 HEAD 最终均返回 200。
- 本机回执在 `/tmp/chatmemo-website-perf-release.s0ZoAJ/` 的 `runtime-deployment.json`、`traffic.json`、`fault.json` 和 `download-head.json`。后续回执提交只补文档，Cloudflare 最新部署身份由 Pages 项目与 Git 历史对账。

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
