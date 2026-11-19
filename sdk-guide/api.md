# 配置与生命周期

## citegauge.ts

| 选项 | 用途 |
| --- | --- |
| domain | 必填，官网域名。例如 example.com，同时匹配 www.example.com。 |
| token | 可选，默认读取服务端环境变量 CITEGAUGE_TOKEN。 |
| endpoint | 可选，默认使用 CiteGauge 线上采集地址。私有部署可填写自己的 HTTPS /collect/v1 地址。 |
| visitorId | 可选，从 Node IncomingMessage 读取站点已有的匿名访客 ID。返回值会在本地哈希后上报。请使用随机匿名 ID。 |

## init()

返回一个 Promise。并发或重复调用共享同一个采集器。配置文件路径按 `process.cwd()` 解析。也可以直接传入配置，这适用于构建后没有独立配置文件的环境。

```ts
import citegauge from 'citegauge'

const client = await citegauge.init({ domain: 'example.com' })
await client.flush()
```

## flush() 与 close()

请求结束后加入内存队列，按批异步发送。调用 `await client.flush()` 可等到当前事件发送完成，网络或认证失败时会抛出错误。站点停止接受请求后，调用 `await client.close()` 解除订阅并发送剩余事件。宿主进程被强制终止或长时间断网且内存队列已满时，访问记录可能丢失。
