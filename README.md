# 引迹 CiteGauge

引迹是部署在 Cloudflare Workers 上的开源 GEO（生成式引擎优化）监测工具。用同一道问题持续采样，把 AI 回答里的品牌提及、竞品和官网引用关联到可复核的证据。适合单个品牌团队自托管，每个部署有一个私有管理员工作台。

CiteGauge is an MIT-licensed, self-hosted GEO monitor for Chinese and international AI answer engines. Track a fixed question over time, distinguish API responses from consumer-web observations, and inspect the evidence behind every mention and citation.

## 能监测什么

| 渠道                    | 取样方式                                                         | 证据                                            |
| ----------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| 豆包网页、DeepSeek 网页 | 操作者在新会话提问，将完整回答、会话链接及核对过的来源录入工作台 | 原文、页面链接、原始截图（可选）、录入时间与引用核对状态          |
| 火山方舟 API            | 按需或每日调用已启用联网工具的 Responses 模型                    | 服务返回的原始 JSON、模型、正文与答案引用标注   |
| DeepSeek API            | 按需或每日调用文本对话接口                                       | 服务返回的原始 JSON、模型、正文；来源为不可观测 |
| 通义千问、Kimi API | 中国大陆官方文本接口 | 正文、模型及原始响应 |
| OpenAI、Claude、Gemini、Perplexity API | 官方 API 与厂商内置联网工具 | 正文、模型、原始响应及可判定的正文引用 |

在首页或工作台输入官网网址，Cloudflare Browser Run 抓取首屏和正文，千问识别品牌、分析页面模块并生成监测问题。系统按官网域名创建通义千问监测项并自动采样一次，识别不到品牌时保存官网报告。重复分析同一域名会复用监测项。官网分析和新建项使用 qwen3.7-flash，后续可在监测结果里开启每日采样。

官网分析默认复用 `DASHSCOPE_API_KEY` 联网查找候选网页并核对网页原文。可选的 `BRAVE_SEARCH_API_KEY` 使用 Brave 搜索摘要。系统使用覆盖国内、国际、地区、细分市场和行业目录的五组查询检索公开资料。每家收录的同行都附网页或搜索摘要引文及来源链接。证据足够时，报告给出本站模块、差距、修改建议、优先级和验收方法。行业清单按域名保存在 D1，可从「竞品对比」回看。名单反映本次检索覆盖范围。

工作台可导出官网完整报告、逐模块 AI 修改提示词，以及含样本正文的监测 Markdown 报告和统计 JSON。配置 Slack 或 Telegram 机器人后，可将所选问题与采样渠道的统计报告发送到预设会话。首页展示演示数据。

## 如何解读指标

- 品牌提及率 = 命中品牌或别名的有效回答数 / 有效回答数。单条回答多次命中只计一次。
- 官网引用率 = 引用了官网或其子域的回答数 / 引用状态可判定的有效回答数。空列表代表已核对无引用，未知状态从分母排除。
- 搜索候选与正文引用分别处理。竞品匹配保留名称，完整回答可回看。每条样本记录解析器版本。失败样本单列。
- 工作台指标、竞品和引用对比、样本下钻共用所选问题和渠道的最近 30 个 UTC 自然日。历史每页 25 条；引用页面显示覆盖回答数最多的 20 个网址。明确推荐率以人工复核过的有效回答为分母，支持判断的原句和可选顺位保存在样本详情。模型切换请建立新的监测项。

## 监测工作台

侧栏按官网分析、可见度概览、竞品对比、引用来源和样本复核导航。监测视图内可切换平台、采样渠道和问题。竞品对比展示提及份额及仅提及竞品的回答；引用来源列出官网未获引用时的来源页。点击指标、品牌或来源页可查看对应样本。单日观测使用分组柱状图，多天观测使用保留缺口的折线图。环图同时展示已引用、已核对无官网和来源不可观测的回答。浏览器按系统减少动态效果偏好决定是否开启动画。

界面使用 React、shadcn/ui、Tailwind CSS、Lucide 和 Chart.js，同源静态依赖由 Wrangler 构建时生成。开发约定和 200 行限制见 [AGENTS.md](AGENTS.md)。

## 本地运行

需要 Node.js 24 和 npm。依赖版本见 package-lock.json。

```sh
npm ci
npm run db:local
npm run auth:admin
npm run dev
```

打开 http://127.0.0.1:8787/login。首次初始化会创建 D1 表与管理员账号，默认账号为 `admin`，随机初始密码保存在项目目录的 `.local-admin.txt`。登录只需账号和密码。重复运行初始化会保留已有账号；忘记密码时运行 `npm run auth:admin -- --reset` 获取新密码，同时注销现有会话。工作台使用 Better Auth username 插件与 HttpOnly 会话 Cookie。管理账号通过部署脚本维护。

网页人工取样无需供应商 API Key。配置自动采样时，将对应变量加入 .dev.vars，见下方部署说明。

## 部署

[Cloudflare 部署与渠道密钥配置](deployment/cloudflare.md)

[MVP 设计与验收对照](docs/mvp-review.md)

## 代码与验证

TypeScript Worker 提供路由和权限检查。D1 保存认证、监测、证据和截图，Durable Object alarm 唤醒每日采样。公开页面返回可直接读取的 HTML 和 JSON-LD。私有 API 校验 Better Auth 管理员会话，响应禁止缓存。URL、问题和原始回答可能包含客户资料，请只将可公开的信息放入 GitHub。

```sh
npm test
npm run check
npx wrangler deploy --dry-run
```

| 路径               | 职责                                           |
| ------------------ | ---------------------------------------------- |
| src/web/ | 服务端页面和公开方法文档 |
| src/runtime/ | Worker 环境与 HTTP 响应 |
| src/domain/ | 品牌、域名与指标计算 |
| src/collectors/ | 网页样本导入和模型 API 采集 |
| src/storage/ | D1 存储、每日任务、历史趋势 |
| public/scripts/、public/styles/ | 浏览器工作台交互和样式 |
| deployment/ | Cloudflare 部署说明 |
| test/ | 指标、渠道与证据解析回归测试 |

[火山方舟联网工具文档](https://docs.volcengine.com/docs/ark/web-search) · [DeepSeek API 文档](https://api-docs.deepseek.com/api/create-chat-completion/) · [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) · [MIT License](LICENSE)
