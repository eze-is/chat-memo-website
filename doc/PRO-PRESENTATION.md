# Desktop Pro 公共展示配置

`desktop/config/pro-presentation.v1.json` 由官网 Cloudflare Pages 直接发布，固定地址为 `https://chatmemo.ai/desktop/config/pro-presentation.v1.json`。它只拥有 Pro 弹窗的销售文案与套餐对比展示，不含价格、身份、购买资格或许可；实际权益和准入继续由账号 API 与客户端权益模块拥有。

## 契约与发布

- Schema 版本固定为 v1，客户端按明确结构校验；结构升级使用新的版本路径，不把任意 HTML、脚本或可执行策略作为配置。
- 官网 JSON 是当前运营内容的唯一维护源；初始内容与本次 Desktop 包内冻结基线一致。官网配置更新不自动改写已经构建或发布的安装包基线，也不要求每次运营更新同步修改该基线；客户端按其既定读取与回退规则消费。
- 修改后先校验契约并完成官网 `npm test`、`npm run check:i18n`。这份 JSON 不参与四语页面生成，无需运行 `build:i18n` 或修改派生 HTML。
- 本地文件与测试只证明候选内容，不代表公网已更新。官网从 main 根目录发布；是否推送、部署与公网回读分别留证。

消费契约由 Desktop 的 `src/shared/pro-presentation.ts` 中 `ProPresentationSchema` 拥有；官网 `npm test` 不替代此契约校验。修改运营内容时，在已安装依赖的 Desktop 工作区显式传入待发布 JSON 路径运行下面命令。它只读该文件，不构成官网构建对兄弟仓的依赖。

```sh
node --experimental-strip-types --input-type=module - /absolute/path/to/pro-presentation.v1.json <<'JS'
import { readFileSync } from 'node:fs'
import { ProPresentationSchema } from './src/shared/pro-presentation.ts'
const content = ProPresentationSchema.parse(JSON.parse(readFileSync(process.argv[2], 'utf8')))
console.log(`Pro presentation v${content.schemaVersion}: ${content.contentVersion}`)
JS
```

## 缓存与资源

根目录 `_headers` 只对这一固定 JSON 路径设置 `Cache-Control: public, max-age=3600`，不改变全站缓存。客户端复用有效缓存时不需要获取正文，内容更新可能受到一小时缓存窗口影响。

本路径不经过 Pages Functions 或下载 Worker，没有新增 Worker、KV、D1、DO 或定时任务。Pages 纯静态请求免费且不限量，但仍然是一次 HTTP 获取；它不能替代原报价请求中的可信市场选择和本人购买资格读取。Desktop 下载 Worker 仅处理 `/desktop/download*`、`/desktop/updates/*`、`/desktop/releases/*`，不接管本路径。

官方机制见 [Pages 静态请求计费](https://developers.cloudflare.com/pages/functions/pricing/)、[Pages 缓存行为](https://developers.cloudflare.com/pages/configuration/serving-pages/) 和 [响应头配置](https://developers.cloudflare.com/pages/configuration/headers/)。
