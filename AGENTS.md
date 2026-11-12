# CiteGauge 开发约定

## 模型平台与数据

- 认证和业务数据统一存 PostgreSQL，建表变更进入 migrations/postgres。Durable Object 负责定时唤醒。/login 独立渲染登录页面；/workspace 在服务端验证 Better Auth 会话。

- 工作台按平台、采样渠道、监测项三级导航。平台注册表维护在 `src/domain/platforms.ts`。API 通过 catalog 返回注册表；现有监测项继续使用原始渠道名。
- 豆包网页和火山方舟 API 同属豆包平台。DeepSeek 网页和 DeepSeek API 同属 DeepSeek 平台。每个问题与渠道独立计算，保留可判定引用、有效回答和人工复核的各自分母。
- 客户数据与模型响应只进入已鉴权的 API。原始证据始终支持下钻，前端插入 HTML 的动态文本必须转义。

## 组件与模块

- 服务端页面与公共导航在 `src/web` 和 `src/web/components`。方法页、渠道页和项目页在无 JavaScript 时提供完整内容。
- 客户端入口负责登录和选中状态。平台导航、指标卡、监测表单、采样、证据和分页分别在 `public/scripts/components`。通用交互与 HTTP 调用在 `public/scripts/core`。
- 使用 Bootstrap 5 的按钮、表单、导航和响应式表格；优先组合现有组件。主题色、圆角、字体与焦点样式复用公共 CSS 变量。
- Chart.js 配置与生命周期在 `public/scripts/charts`。维度切换释放旧图表；比率缺失时使用 null；为图表提供文字数据及减少动态效果支持。
- 模型调用使用 Vercel AI SDK Core。采集入口在 `src/collectors/api.ts`；适配器注册在 `src/collectors/ai/providers.ts`，模型目录和采集器工厂在 `src/collectors/ai/factory.ts`，厂商适配与证据解析在 `src/collectors/ai`。优先使用 SDK 和供应商内置工具；变更接入时通过采集入口验证原始响应、正文引用和不可观测状态。
- 数据采集、领域计算、读查询、证据复核与调度各有独立模块。避免在页面中复制 SQL 或采集逻辑。
- 第三方资源由锁文件与 `scripts/prepare-assets.mjs` 在 Wrangler 构建阶段生成到 `public/vendor`，运行时使用同源文件。

## 行数与验证

- 自有应用源码、浏览器组件、样式、开发脚本和测试单文件上限 **200 行**。按职责拆分，保持正常格式；不通过压缩空白、拼接巨型模板或多语句单行规避行数检查。
- 执行 `npm run check`（类型与行数）、`npm test`、`npx wrangler deploy --dry-run`。CI 通过相同入口检查。依赖、生成资源、锁文件和文档不计入源码行数。
- 变更工作台时，在桌面和窄屏验证平台切换、无监测项状态、图表、证据下钻及相关表单。使用已标注的演示数据或独立测试数据库。
