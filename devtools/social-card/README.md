# 官网社交分享封面

用户确认的 1200×630 分享封面源码与匿名产品截图。线上 PNG 位于 `resource/social/chatmemo-context-20261105-{zh-CN,en}.png`，由 `scripts/build-localized-pages.mjs` 统一接入 OG／Twitter 标签。根地址和英文／日文／西班牙文页面用英文图，中文页面用中文图。新设计应使用新文件名，避免图片 URL 缓存复用。favicon 继续使用品牌 Logo。

封面保留品牌、用户指定的「实时备份，跨 AI 互通上下文」、八个来源标识、真实产品组件的局部。用户进一步指定：展示电脑端 AI 对话，露出一句完整用户输入，在详情页头右侧使用原有玻璃「换个 AI 继续聊」按钮。

`renderer/` 从当前 Desktop 的 `V1Window`、`MemoryPrompt` 和官网匿名 fixture 构建静态拍摄场景。选中会话为虚构的 Claude Code「社区书店的首页设计」，含一问一答；不读取真实账号或资料。新增玻璃按钮是原组件在分享画面中的独立装配，原底部入口在此场景隐藏；不会修改正式 App 或官网 Hero 行为。产品截图的导航直接以记录页初始化。

重建场景：

```sh
CHATMEMO_DESKTOP_DIR=/absolute/path/to/desktop node devtools/social-card/renderer/build.mjs
```

输出 `.generated/` 仅供本地拍摄，不提交。静态服务下打开 `.generated/index.html?lang=zh-CN` 或 `?lang=en`，1120×720、DPR 1。等待字体加载、记录页选中、导航测量完成且导航子树动画结束，再截为 `product-{zh-CN,en}.png`。拍摄时隐藏浏览器翻译扩展浮标；不改产品样式来伪造选中态。

`index.html` 以中文为默认；`?lang=en` 用英文文案和截图。以 1200×630、DPR 1 导出，核对 PNG 实际尺寸与图片资源完整，再更新带新版本文件名的线上 PNG。截图必须在同一浏览器调用内设置 viewport：跨调用的宿主窗口尺寸可能恢复。

2026-11-05：已检查中英画面，用户提问完整可见、Claude Code 无浏览器插件来源标签、记录导航高亮、右上玻璃入口正常。构建和本地网页检查不代表 X 已重新抓取；上线后分别核对 Cloudflare 部署 commit、正式 HTML/PNG 与 X 缓存。
