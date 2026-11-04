# Desktop Pro 公共展示配置归属

统一公共文档由 API 仓 `services/api/public-config/pro-presentation.v1.json` 拥有，通过现有 Static Assets 的 `/public-config/pro-presentation.v1.json` 发布。API 内的 `services/api/docs/PUBLIC-PRO-CATALOG.md` 拥有契约、地区响应头与验收边界。

官网不保留价格、销售文案或套餐对比的第二份配置，也不为此配置独立缓存规则。原 Pages 候选路径未公开发布，已在本轮退役。Desktop 的包内快照随发行冻结，不因运营更新自动改写。


## 官网定价页（2026-11-04）

`pricing.html`及四语`/{locale}/pricing`公开展示免费／Pro权益、两市场价格、计费方式、有效期与退款说明，访问不需登录，正文与表格在首个HTML中完整可读。沿用官网导航、页脚与语言菜单，不接入支付、不读取访客账号或定位。

`npm run build:i18n`及`check:i18n`在写入输出前，从生产`https://api.chatmemo.ai/public-config/pro-presentation.v1.json`读取并验证当前已发布目录。金额、商品期限及可用功能由`scripts/pro-pricing.mjs`派生；目录不可用、未知商品／期限或缺少功能译文会阻止生成，不猜价格、不回退源码未发布配置。计划功能不作为已交付权益展示。HTML记录`data-catalog-version`，不保留另一份价格配置。功能名称和固定交易文案由四语词包拥有。

价格变更时，先由API按原发布合同完成生产部署，再运行官网生成、检查并发布网站；`check:i18n`会发现官网静态展示与当前生产目录的差异。网站访客不额外请求API，避免跨域依赖与加载失败。套餐含计划状态或新feature ID时须人工审阅，而不是将新功能自动当作已承诺交付。

购买入口与收费启用仍由产品和支付模块拥有。当前支付尚未开放，官网如实说明，不创建订单、假支付按钮或自动授予权益。用户于2026-11-04进一步确认：退款能力尚未接通，当前公开文案改为“目前暂不支持退款，法律另有规定的除外”，替代前次列举具体退款例外的表述。联系邮箱保持eze@chatmemo.ai，不额外承诺7天或14天自愿退款。不把现有权益撤销实现等同资金退款。
