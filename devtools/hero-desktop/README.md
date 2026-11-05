# Hero 桌面端展示

从当前 Desktop 正式呈现组件构建官网首屏的三 Tab 展示。行为、数据、来源与发布边界见 [`doc/HERO-PRODUCT-PREVIEW.md`](../../doc/HERO-PRODUCT-PREVIEW.md)。

在官网仓执行 `npm run check:hero`、`npm run build:hero`、`npm run build:i18n`。构建期读取兄弟 Desktop 仓的源码、锁定依赖及字体；生成的 `resource/hero-desktop/` 为独立静态资源。

`main.tsx`只拥有短编排、三个 Tab 的用户意图和深层入口拦截；`fixture.tsx`提供14来源、42段虚构对话，不访问真实资料。首页首帧为`poster.png`，更新资料或布局后用当前构建的静止首页重新截图。
