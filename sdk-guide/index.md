---
description: 安装 citegauge v0.1.0，在 Node.js HTTP/1 服务启动时加载配置，验证首次上报并排查常见错误。
---

# TypeScript SDK 快速接入

在网站的 Node.js **服务端启动入口**调用一次 `citegauge.init()`。SDK 会读取当前工作目录的 `citegauge.ts`，订阅 Node HTTP/1 服务端请求完成事件，将访问数据发送到该官网的 CiteGauge 工作台。

## 运行条件

先确认服务通过 Node.js HTTP/1 接收请求，并能在启动时执行服务端代码。配置文件随应用一起部署。只提供静态资源或 Fetch 事件的项目，可以先阅读[覆盖范围](./metrics.md)。

## 安装

需要 Node.js 22.18 或更高版本。在网站项目中从公共 npm registry 安装 v0.1.0。

```sh
npm install citegauge@0.1.0
```

## 绑定官网

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
