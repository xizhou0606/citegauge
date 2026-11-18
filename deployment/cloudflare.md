# Cloudflare D1 与 Workers 部署

认证、工作台记录和截图存放于 D1。Worker 提供页面与 API，原 WORKSPACE Durable Object 负责调度。生产与本地数据库独立。

## 本地

使用 Node.js 24，运行 `npm ci`、`npm run db:local`、`npm run auth:admin`、`npm run dev`。本地管理员凭据位于 .local-admin.txt，复用已有账号时凭据保持有效。

## 生产

1. 创建 D1 数据库，把数据库名称、ID 和绑定 DB 写入 wrangler.jsonc，迁移目录为 migrations/d1。自托管副本须使用自己的数据库 ID 和 HTTPS 域名。
2. 将 BETTER_AUTH_URL 指向最终访问域名，以 Wrangler Secret 设置独立的随机 BETTER_AUTH_SECRET（至少 32 个字符）。
3. 新版本上线前运行 `npm run db:migrate -- --remote`。首次运行 `npm run auth:admin -- --remote` 初始化管理员，凭据保存在 .local-admin-production.txt。显式重置使用附加参数 --reset，并撤销之前的会话。
4. 合并到 main 触发 Cloudflare Workers Builds。独立部署可用 `npm run deploy`。验证登录、工作台数据读取、退出后的会话撤销。
5. 已有 PostgreSQL 部署应先备份并制定数据导入计划。更改绑定和初始化新库不会复制现有记录。

## 模型渠道

在本地将需要的变量写入 `.dev.vars`。生产密钥用 `npx wrangler secret put 变量名` 设置。每个平台独立启用；可用模型和账户权限由厂商决定。方舟需要已开通的模型或端点 ID，其余渠道可以直接使用内置模型选项。`_MODEL` 变量可指定账户专属模型作为首选。

| 平台 | 密钥变量 | 模型变量 |
| --- | --- | --- |
| 火山方舟 | ARK_API_KEY | ARK_MODEL |
| DeepSeek | DEEPSEEK_API_KEY | DEEPSEEK_MODEL |
| 通义千问（北京） | DASHSCOPE_API_KEY | DASHSCOPE_MODEL |
| Kimi（中国大陆） | MOONSHOT_API_KEY | MOONSHOT_MODEL |
| OpenAI | OPENAI_API_KEY | OPENAI_MODEL |
| Claude | ANTHROPIC_API_KEY | ANTHROPIC_MODEL |
| Gemini | GOOGLE_GENERATIVE_AI_API_KEY | GOOGLE_GENERATIVE_AI_MODEL |
| Perplexity | PERPLEXITY_API_KEY | PERPLEXITY_MODEL |

官网形象分析使用 Wrangler 的 BROWSER 绑定抓取公开页面的桌面首屏和正文，并用 DASHSCOPE_API_KEY 调用北京地域的 qwen3.7-flash。工作台保存最近一份官网报告和截图，并按域名保存行业竞品分析。升级时应用 D1 迁移至 `0005_industry_reviews.sql`。行业检索默认复用千问密钥，通过 qwen-plus 联网检索五组查询，再读取候选网页核对证据。也可设置 `BRAVE_SEARCH_API_KEY` 选用 Brave Web Search 摘要。

## 报告发送

先应用 D1 迁移 0004_report_deliveries.sql。工作台在当前采样渠道和问题下生成报告，按发送时所选会话投递。服务端使用 Vercel Chat SDK 4.45.0 的主动发送接口。用户点击发送后才投递，目的地由服务端配置。

| 渠道 | Cloudflare Worker Secrets | 接收会话 |
| --- | --- | --- |
| Slack | SLACK_BOT_TOKEN、SLACK_SIGNING_SECRET | SLACK_CHANNEL_ID，例如 C0123456789 |
| Telegram | TELEGRAM_BOT_TOKEN | TELEGRAM_CHAT_ID，例如 -1001234567890 |

Slack 应用需要 chat:write 权限，机器人应加入目标频道。Telegram 群组需要加入机器人，向个人会话投递时先在 Telegram 中启动机器人。本功能只做出站发送，无需注册入站 webhook。请在 Workers 的 Settings → Variables and Secrets 配置变量。真实密钥仅存为 Secret。发送状态不明时，先核对目标会话再决定是否另发一份。

参考 [Chat SDK 渠道 API](https://chat-sdk.dev/docs/api/channel)。
