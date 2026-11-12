# PostgreSQL 与 Cloudflare 部署

## 本地

`npm run db:local` 使用 Docker Compose 启动 PostgreSQL 18，绑定 127.0.0.1:55432。数据保存在 Docker 命名卷。脚本为首次运行生成数据库凭据和 Better Auth 本地设置；.env、.dev.vars 和管理员密码文件都在 Git 忽略列表中。

`npm run auth:admin` 应用版本化迁移并初始化账号；现有账号会保留。重置时用 `npm run auth:admin -- --reset`。服务入口为 /login；/workspace 在服务端验证会话。

## 生产

1. 准备可从 Cloudflare 访问的 PostgreSQL 与独立的生产连接串。在操作环境设置 DATABASE_URL，运行 `npm run db:migrate`。
2. 新部署运行 `npm run auth:admin -- --remote`。此选项使用生产凭据文件名；数据库目标始终由 DATABASE_URL 决定。
3. 在 Cloudflare 创建连接该 PostgreSQL 的 Hyperdrive，关闭查询缓存以保证认证撤销和监测数据的时效性。在 wrangler 配置中添加绑定 `{"binding":"HYPERDRIVE","id":"实际配置 ID"}` 到 hyperdrive 数组。
4. 设置 BETTER_AUTH_URL 为生产 HTTPS 源站、BETTER_AUTH_SECRET 为独立随机值，按下表设置需要的模型凭据。保留原 WORKSPACE 绑定和 Durable Object 迁移记录以延续定时唤醒。
5. 执行 `npm run deploy`。验证 /workspace 未登录跳转、登录后历史样本、每日采样、退出后 API 返回 401。

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

## 旧部署的数据迁移

暂停原实例写入与定时采样，备份原认证库和工作台库。迁移工具接受两份标准 SQLite 数据库文件（认证库、业务库）。若拿到的是 SQL 导出，应先恢复到 SQLite 文件。持有本机 Wrangler 状态文件时，使用 SQLite backup API 做一致性备份，包含 WAL 中已提交的数据。

将 DATABASE_URL 指向空的目标业务库，运行 `node --env-file-if-exists=.env scripts/db/import-sqlite.mjs 认证备份.sqlite 工作台备份.sqlite`。导入在事务内执行，迁移完成后记录标识；失败会回滚导入。迁移保留账号密码哈希、监测项、采样时间、原始响应、截图和每日调度时间。核对行数和抽样指标后切换应用。原数据库备份用于切换失败时恢复旧版本。

PG 保存所有业务记录与 Better Auth 数据。Durable Object 只承接工作台请求与每日采样的唤醒，不再写入业务 SQLite 表。
