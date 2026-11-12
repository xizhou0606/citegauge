# 引迹 CiteGauge

引迹是部署在 Cloudflare Workers 上的开源 GEO（生成式引擎优化）监测工具。用同一道问题持续采样，把 AI 回答里的品牌提及、竞品和官网引用关联到可复核的证据。适合单个品牌团队自托管，每个部署有一个私有管理员工作台。

CiteGauge is an MIT-licensed, self-hosted GEO monitor for Chinese AI answer engines. Track a fixed question over time, distinguish API responses from consumer-web observations, and inspect the evidence behind every mention and citation.

## 能监测什么

| 渠道                    | 取样方式                                                         | 证据                                            |
| ----------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| 豆包网页、DeepSeek 网页 | 操作者在新会话提问，将完整回答、会话链接及核对过的来源录入工作台 | 原文、页面链接、录入时间与引用核对状态          |
| 火山方舟 API            | 按需或每日调用已启用联网工具的 Responses 模型                    | 服务返回的原始 JSON、模型、正文与答案引用标注   |
| DeepSeek API            | 按需或每日调用文本对话接口                                       | 服务返回的原始 JSON、模型、正文；来源为不可观测 |

选择 **监测引迹自身** 可建立非品牌问题「有哪些开源的中文 GEO 监测工具？」的监测项。替换为你的正式域名，再建立一个品牌问题「CiteGauge 如何计算官网引用率？」。分别查看两者在各渠道的表现。首页的样本解读使用演示文本。工作台展示实际保存的记录。

## 如何解读指标

- 品牌提及率 = 命中品牌或别名的有效回答数 / 有效回答数。单条回答多次命中只计一次。
- 官网引用率 = 引用了官网或其子域的回答数 / 引用状态可判定的有效回答数。空列表代表已核对无引用，未知状态从分母排除。
- 搜索候选与正文引用分别处理。竞品匹配保留名称，完整回答可回看。每条样本记录解析器版本。失败样本单列。
- 工作台最近样本窗口为全实例最新 200 条。近 30 天趋势按所选监测项在存储内完整聚合，按 UTC 日期展示。模型切换请建立新的监测项。

## 本地运行

需要 Node.js 24 和 npm。依赖版本见 package-lock.json。

```sh
npm ci
node -e 'const fs=require("node:fs"),c=require("node:crypto");fs.writeFileSync(".dev.vars","ADMIN_TOKEN="+c.randomBytes(32).toString("hex")+"\n",{flag:"wx",mode:0o600})'
npm run dev
```

打开 Wrangler 输出的本地地址，进入 /workspace，使用 .dev.vars 中的管理员密钥。网页人工取样无需供应商 API Key。配置自动采样时，向 .dev.vars 增加下面的渠道变量。工作台密钥保存在当前浏览器标签页的 sessionStorage，可随时锁定。

## 部署到 Cloudflare

1. 执行 `npx wrangler login` 登录希望持有该项目的 Cloudflare 账号。
2. 使用仅含生产环境所需变量的 secrets 文件执行 `npx wrangler deploy --secrets-file .dev.vars`。若本地和生产需要不同密钥，使用独立的忽略文件 .dev.vars.production 并替换命令中的路径。
3. 验证 workers.dev 地址及 /workspace。SQLite Durable Object 由 wrangler.jsonc 声明的 migration 创建；静态资源和服务端 HTML 随 Worker 一起部署。
4. 生产域名可在 Workers → Settings → Domains & Routes 配置。canonical、sitemap、robots.txt 与 llms.txt 随请求域名生成。稳定运营请统一使用正式域名，在 Cloudflare 将其他入口重定向到该域。
5. 轮换密钥用 `npx wrangler secret put ADMIN_TOKEN`。启用 API 采集时，在 Cloudflare Worker Secrets 设置相应密钥。每日采样使用 Durable Object alarm，首次开启约一分钟后执行，之后约每 24 小时一次。可在工作台暂停。调用费由配置密钥的账号承担。

| 变量                   | 用途                                          |
| ---------------------- | --------------------------------------------- |
| ADMIN_TOKEN            | 至少 24 字符的随机工作台密钥，必填            |
| DEEPSEEK_API_KEY       | 开启 DeepSeek API 自动采样                    |
| DEEPSEEK_MODEL         | 默认为 deepseek-flash，可覆盖为账号支持的模型 |
| ARK_API_KEY、ARK_MODEL | 火山方舟密钥和已开通联网搜索的模型或接入点    |

## 代码与验证

TypeScript Worker 提供路由和权限检查。单实例 SQLite Durable Object 存储 monitors 与 runs 表、调度每日采样。公开页面返回可直接读取的 HTML 和 JSON-LD。私有 API 要求 Bearer 密钥，响应禁止缓存。URL、问题和原始回答可能包含客户资料，请只将可公开的信息放入 GitHub。

```sh
npm test
npm run check
npx wrangler deploy --dry-run
```

| 路径               | 职责                                           |
| ------------------ | ---------------------------------------------- |
| src/model.ts       | 渠道请求、证据解析、品牌与域名匹配             |
| src/store.ts       | 数据持久化、去重、定时任务、历史趋势           |
| src/pages.ts       | 服务端首页、方法、渠道说明、关于项目           |
| public/app.js      | 登录、配置、人工录入、API 采样和证据下钻       |
| test/model.test.ts | 指标分母、域名匹配、来源标注与无效返回回归验证 |

[火山方舟联网工具文档](https://docs.volcengine.com/docs/ark/web-search) · [DeepSeek API 文档](https://api-docs.deepseek.com/api/create-chat-completion/) · [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) · [MIT License](LICENSE)
