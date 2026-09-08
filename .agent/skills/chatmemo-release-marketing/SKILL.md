---
name: chatmemo-release-marketing
description: 为 Chat Memo 浏览器插件生成更新海报 HTML 与宣传 Markdown。仅在用户明确要求“生成更新海报”“写更新宣传文案”或“制作发版宣传材料”时使用。普通发布版本、打包、更新官网版本记录不触发；正式发版使用 browser-extension-release。
---

# Chat Memo Release Marketing

## 核心哲学

宣传材料围绕已经确定的版本事实表达用户价值。版本号、功能和发布状态来自正式发版记录；宣传中的标题与叙事可以调整，不能扩大功能承诺或把候选版本写成已经发布。

本 Skill 产出海报 HTML 与宣传 Markdown。正式版本记录、插件版本、商店包和 GitHub Release 由浏览器插件的 `browser-extension-release` 负责；宣传材料的生成与对外发布是两个独立动作。

## 工作流

### ① 核对宣传输入

从本次已确认条目或插件 CHANGELOG 提取版本号、日期、摘要和功能点，结合用户要求拟定海报标题、宣传标题。用户只要求发版时，转到官网同级 `../browser-extension/.agent/skills/browser-extension-release/SKILL.md`；独立 worktree 中先确认实际插件仓路径。

检查 Python 3、当前输出目录和已有同名材料。脚本会覆盖同名文件；按用户指定目录输出，未指定时使用官网仓 `update-item/`，保留无关改动。

### ② 生成宣传材料

在官网仓根目录执行，功能项格式为 `图标|标题|描述`：

```bash
python3 .agent/skills/chatmemo-release-marketing/scripts/generate_files.py \
  --version 1.3.4 \
  --date "2026年9月8日" \
  --title "更新标题" \
  --headline "Chat Memo v1.3.4 更新亮点" \
  --summary "来自已确认版本事实的更新摘要" \
  --features "✨|功能标题|面向用户的功能说明" \
  --output /absolute/path/to/marketing-output
```

替换示例输入后运行。输出为 `{version}.html`、`{version}-update.md` 与同目录 `logo-single.png`。`--output` 相对路径以官网仓根目录为基准；需要标题换行时传入真实换行。生成器优先使用官网根目录 Logo，缺失时使用本 Skill 的 `assets/logo-single.png`。

需要调整今后的通用风格时修改 `assets/` 模板；只调整本次宣传时修改生成物。已有参考示例供结构和风格对照，不作为当前版本事实。

### ③ 验证并交付

浏览器打开海报检查布局、标题换行与 Logo，阅读 Markdown 核对版本和功能表述，检查没有残留 `{VERSION}`、`{HEADLINE}` 等模板占位符。核对文件差异只覆盖本次宣传输出或明确要求的模板调整，再给出文件路径。

完成以材料可用为准：不需要改 `updates-data.json`、插件版本、CHANGELOG 或商店说明；生成文件本身不代表已对外发布。推送官网或向外部平台发送内容只在用户明确要求时另行处理。

## References 索引

| 文件 | 何时加载 |
|---|---|
| [references/format-guide.md](references/format-guide.md) | 调整海报结构、功能字段或宣传文案格式时 |
| [assets/poster-template.html](assets/poster-template.html) | 修改可复用海报视觉时 |
| [assets/markdown-template.md](assets/markdown-template.md) | 修改可复用宣传文案结构时 |
| [assets/poster-reference.html](assets/poster-reference.html) / [assets/markdown-reference.md](assets/markdown-reference.md) | 需要查看完整历史成品示例时 |
