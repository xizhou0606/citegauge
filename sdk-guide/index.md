---
description: 安装 citegauge v0.3.0，在 Node.js HTTP/1 服务启动时加载配置，验证首次上报并排查常见错误。
---

# TypeScript SDK 快速接入

静态网站与单页应用可直接从浏览器上报 PV、UV。Node HTTP/1 服务还可以记录 AI 爬虫及 XML、TXT 请求。

## 安装

在网站项目中安装 SDK。使用 Node 服务端入口时，运行环境需要 Node.js 22.18 或更高版本。

```sh
npm install https://citegauge.liushurui0606.workers.dev/sdk/citegauge-0.3.0.tgz
```

## 浏览器接入

在工作台选择官网，在「网站流量 → SDK 接入」启用浏览器统计。把页面上显示的调用放进前端入口。自营网站使用下列代码，客户网站使用工作台给出的公开 workspace 参数。域名从浏览器的 HTTPS Origin 识别。

```ts
import citegauge from 'citegauge/browser'
import config from '../citegauge'
citegauge.init(config)
```

可以从包内复制 citegauge.example.ts 为 citegauge.ts，详见[完整配置及开关表](./collection.md)。默认开启所有内置维度。

发布后打开官网，在「网站流量 → 流量概览」查看浏览器最近上报时间。启用了 CSP 的网站需要在 connect-src 中允许 https://citegauge.liushurui0606.workers.dev 。

## Node 服务端接入

在工作台选择官网，打开「网站流量 → SDK 接入」，创建采集密钥，将它保存为网站服务端环境变量 `CITEGAUGE_TOKEN`。同一密钥只能写入对应网站。将密钥保存在部署平台的服务端 Secret 中。代码示例、客户端环境变量和提交记录均应省略真实值。

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

部署后用浏览器打开官网的一个 HTML 页面，再访问官网的 `/robots.txt`。约两秒后，回到当前官网的「网站流量 → 流量概览」，点击「刷新统计」。查看最近上报时间、页面浏览量，以及 TXT 请求明细。若文件由 CDN 缓存直接响应，请用能到达 Node 服务的请求验证。

### 排查首次上报

- 启动时找不到配置文件：检查服务的 `process.cwd()` 及该目录下的 `citegauge.ts`。构建平台无法携带独立配置文件时，可使用 [init(config)](./api.md)。
- 调用 `flush()` 收到 HTTP 401：检查当前服务进程是否读取了最新的 `CITEGAUGE_TOKEN`。HTTP 403 表示上报域名与密钥所属网站不匹配。
- 请求成功但工作台仍显示「—」：检查请求是否到达 Node 服务，以及它收到的 Host 是否为配置的域名或其 www 形式。可在一次真实页面请求完成后调用 `await client.flush()`，等待本批次上报。

[查看哪些访问会被统计](./metrics.md) · [查看配置和主动刷新方法](./api.md)
