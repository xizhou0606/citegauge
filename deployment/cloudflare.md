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
