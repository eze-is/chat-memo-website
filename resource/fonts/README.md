# 官网字体

`MiSans-pricing.woff2`从Desktop及付款页使用的`MiSansVF.woff2`按官网四语共享词条、定价词条及实际生成的方案内容生成字符子集，保留可变字重，减少完整字体约12MB的下载。许可证随站点保存在`resource/licenses/MiSans-LICENSE.pdf`。首页当前使用 Inter 与系统中文字体，按标题、正文与控件分别设置字重；欢迎页、更新页和法律页的字体保持现状。

定价页或共享词条新增字符后可重新生成（`uv`只运行临时工具，不增加网站运行时依赖）：

```sh
uv run --with fonttools --with brotli python scripts/subset-pricing-font.py ../desktop/src/renderer/src/assets/fonts/MiSansVF.woff2
```

独立worktree下应传入实际Desktop字体的绝对路径。网页生成与检查直接使用已提交的woff2，不要求Python或fonttools。字体依然遵循MiSans许可证，不另行销售。
