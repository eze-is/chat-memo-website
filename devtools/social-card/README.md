# 官网社交分享封面

当前分两类分享素材，由 `scripts/build-localized-pages.mjs` 统一生成标签：

- 通用 Open Graph：`resource/social/chatmemo-brand-square-20261106-v2.png`，1024×1024，仅保留品牌标识与名称，避免小方卡裁切横版产品画面。各语言共用品牌图，标题与摘要仍按页面语言生成。
- Twitter：继续使用1200×630横版产品图，中文 `chatmemo-context-20261105-v3-zh-CN.png`，其他语言 `chatmemo-context-20261105-v2-en.png`，显式设置 `twitter:image` 与 `summary_large_image`。

当前方图来源是家族宣传资产 `ChatMemo/assets/brand-and-marketing/channels/social/2026-11-06-brand-card-native/square-reviewed.html`，对应 `square-reviewed.png`。白底，原 Logo 与字标居中，左下／右上使用同色同强度的轻微模糊 Logo。以512×512布局、2倍导出得到1024×1024；已目视复核64px、96px与256px效果。这里的 `square.html` 仅保留为第一版历史源，不用于重建当前方图。该文件是分享资产，favicon沿用原有图标。更换内容时使用新的图片URL。通用OG配置不等同于微信JS-SDK接入，也不保证各客户端刷新缓存；微信、浏览器系统分享与Twitter实机显示分别验收。

封面保留品牌、用户指定的「实时备份，跨 AI 互通上下文」、八个来源标识、真实产品组件的局部。用户进一步指定：展示电脑端 AI 对话，露出一句完整用户输入，在详情页头右侧使用原有玻璃「换个 AI 继续聊」按钮。

`renderer/` 从当前 Desktop 的 `V1Window`、`MemoryPrompt` 和官网匿名 fixture 构建静态拍摄场景。选中会话为虚构的 Claude Code「社区书店的首页设计」，含一问一答；不读取真实账号或资料。新增玻璃按钮是原组件在分享画面中的独立装配，原底部入口在此场景隐藏；不会修改正式 App 或官网 Hero 行为。产品截图的导航直接以记录页初始化。

重建场景：

```sh
CHATMEMO_DESKTOP_DIR=/absolute/path/to/desktop node devtools/social-card/renderer/build.mjs
```

输出 `.generated/` 仅供本地拍摄，不提交。静态服务下打开 `.generated/index.html?lang=zh-CN` 或 `?lang=en`，1120×720、DPR 1。等待字体加载、记录页选中、导航测量完成且导航子树动画结束，再截为 `product-{zh-CN,en}.png`。拍摄时隐藏浏览器翻译扩展浮标；不改产品样式来伪造选中态。

`index.html` 以中文为默认；`?lang=en` 用英文文案和截图。以 1200×630、DPR 1 导出，核对 PNG 实际尺寸与图片资源完整，再更新带新版本文件名的线上 PNG。截图必须在同一浏览器调用内设置 viewport：跨调用的宿主窗口尺寸可能恢复。

2026-11-05：已检查中英画面，用户提问完整可见、Claude Code 无浏览器插件来源标签、记录导航高亮、右上玻璃入口正常。构建和本地网页检查不代表 X 已重新抓取；上线后分别核对 Cloudflare 部署 commit、正式 HTML/PNG 与 X 缓存。

中文对齐修订：保留整句「实时备份，跨 AI 互通上下文」为一行，品牌、标题与来源标识使用同一 grid 容器居中，最新层间距为28px，品牌文字44px、图标62px。三层沿1200px画布中轴居中；产品窗口上移至329px，保留1px细轮廓和12px圆角，移除原7px灰色装饰框，产品截图内部内容和显示尺寸不变。英文同步放大品牌并移除灰色装饰框，保留两行英文标题（56px）与原产品内容；英文层间距16px，窗口同样从329px开始。中文采用新图片 URL，旧图保留以支持已有缓存引用。
