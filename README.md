# Chat Memo 官方网站

一个展示 Chat Memo 产品功能和特性的官方网站。

## 项目结构

```
├── index.html          # 主页面文件
├── welcome.html        # 欢迎页面
├── updates.html        # 更新日志页面
├── site-i18n.js        # 共享语言选择与词条应用
├── locales/            # 四语页面词条
├── updates-data.json   # 四语版本记录
├── scripts/            # 从结构与词条生成静态语言页
├── en/, zh-CN/, ja/, es/ # 四语规范页面部署产物
├── components/         # 组件文件夹
│   ├── navbar.html     # 统一导航栏组件
│   └── footer.html     # 统一页脚组件
└── resource/           # 资源文件夹
    ├── icons/          # 图标文件
    │   ├── chrome_icon.png
    │   └── logo.png
    ├── images/         # 图片文件
    │   ├── avatar.jpg
    │   ├── frame_1.png
    │   ├── frame_2_cover.jpg
    │   ├── frame_3_cover.jpg
    │   ├── frame_4.png
    │   └── video_cover.jpg
    └── videos/         # 视频文件
        ├── frame_2_demo.mp4
        ├── frame_3_demo.mp4
        └── video.mp4
```

## 技术栈

- HTML5
- Tailwind CSS (CDN)
- Google Fonts
- 响应式设计

## 功能特性

- 🎨 现代化设计风格
- 📱 完全响应式布局
- 🎬 视频演示功能
- ⚡ 快速加载
- 🔍 SEO 优化
- 🧩 组件化架构，统一导航栏和页脚
- 🌍 多语言支持（中文/英文/日文/西文），规则见 [doc/I18N.md](doc/I18N.md)
- ✨ 统一的Hero区动画效果，提供流畅的页面过渡体验

## 本地开发

1. 克隆项目到本地
2. 安装开发依赖并生成四语静态页面：
   ```bash
   npm ci
   npm run build:i18n
   ```
3. 用 Cloudflare Pages 本地模拟器运行，例如 `npx wrangler pages dev . --port 43135 --compatibility-date=2026-04-12`，在浏览器中访问 `http://localhost:43135/ja/`。普通静态服务器不一定支持 `/ja/welcome` 这类无扩展名地址。

提交前运行 `npm test` 和 `npm run check:i18n`。具体内容归属、网址和回退规则见 [doc/I18N.md](doc/I18N.md)。

## 生产部署

- Cloudflare Pages 连接 `eze-is/chat-memo-website`，从 `main` 分支根目录直接发布；Pages 无构建命令，预生成的四语 HTML 随源码提交。
- `main` 是 Production 分支；其他分支和 Pull Request 只生成 Preview 部署。
- `chatmemo.ai` 与 `www.chatmemo.ai` 的生产域名归 Cloudflare Pages 项目配置所有，仓库不再保留 GitHub Pages 的 `CNAME` 声明。
- 本地目录移动不会影响线上。只有推送 `main`、修改 Cloudflare Pages 项目、自定义域名或 DNS 才会改变生产。

### 部署注意事项

- ✅ 所有资源文件路径已规范化到 `resource/` 目录
- ✅ 站内资源使用根相对路径，确保各语言子路径下都能正常访问
- ✅ 视频文件已优化，支持自动播放和循环
- ✅ 图片已压缩，加载速度优化

## 性能优化建议

- 🖼️ 图片已使用合适的格式和尺寸
- 🎬 视频使用了封面图片，减少初始加载时间
- 📦 使用 CDN 加载 Tailwind CSS
- ⚡ 启用了浏览器缓存优化

## 维护说明

- 定期检查外部链接的有效性
- 更新产品功能演示视频
- 监控网站性能和用户体验
- 根据用户反馈优化内容和设计

---

**开发者**: 一泽Eze  
