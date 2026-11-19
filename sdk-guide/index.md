# TypeScript SDK 快速接入

在网站的 Node.js **服务端启动入口**调用一次 `citegauge.init()`。SDK 会读取当前工作目录的 `citegauge.ts`，订阅 Node HTTP/1 服务端请求完成事件，将访问数据发送到该官网的 CiteGauge 工作台。

## 安装

需要 Node.js 22.18 或更高版本。在网站项目中用 npm 安装 v0.1.0 正式构建包。

```sh
npm install https://citegauge.liushurui0606.workers.dev/sdk/citegauge-0.1.0.tgz
```

## 绑定官网

在工作台选择官网，打开「AI 爬虫 → SDK 接入」，创建采集密钥，将它保存为网站服务端环境变量 `CITEGAUGE_TOKEN`。同一密钥只能写入对应网站。

在网站根目录创建 **citegauge.ts**，将示例域名改为工作台所选的官网域名。

```ts
import { defineConfig } from 'citegauge'

export default defineConfig({
  domain: 'example.com',
})
```

## 在服务启动时启用

```ts
import citegauge from 'citegauge'

await citegauge.init()
```

把这两行放在开始接受 HTTP 请求之前。使用构建产物或容器部署时，记得将配置文件复制到服务启动时的工作目录。

## 验证接入

部署后用浏览器打开官网的一个 HTML 页面，再访问官网的 `/robots.txt`。约两秒后，回到当前官网的「AI 爬虫」，点击「刷新统计」。查看最近上报时间、页面浏览量，以及 TXT 请求明细。若文件由 CDN 缓存直接响应，请用能到达 Node 服务的请求验证。

[查看哪些访问会被统计](./metrics) · [查看配置和主动刷新方法](./api)
