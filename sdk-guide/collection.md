---
description: citegauge 0.3 浏览器和 Node SDK 的 TypeScript 配置、所有默认开关、事件单位、关闭行为及工作台查询。
---

# 网站流量采集开关

在前端项目根目录创建 `citegauge.ts`。SDK 0.3 的总开关和下列各项默认都是 `true`。将任意一项改为 `false` 后重新构建发布，之后的访问就按新配置采集。历史数据仍可查询。浏览器由应用打包导入配置文件。

```ts
import { defineConfig } from 'citegauge/browser'

export default defineConfig({
  enabled: true,
  // 客户工作区填入「网站流量 → SDK 接入」显示的 workspace。
  routes: ['/', '/pricing', '/projects/:id'],
  events: ['trial_started'],
  searchKeys: ['q', 'search'],
  collect: {
    pageviews: true, devices: true, pages: true, referrers: true,
    campaigns: true, sessions: true, countries: true, environment: true,
    engagement: true, scrollDepth: true, outboundLinks: true, downloads: true,
    forms: true, siteSearch: true, errors: true, customEvents: true, webVitals: true,
  },
})
```

在浏览器入口调用一次，按入口所在目录调整配置文件的导入路径。

```ts
import citegauge from 'citegauge/browser'
import config from '../citegauge'
citegauge.init(config)
```

## 每项采集什么

| collect 开关 | 上报内容与统计口径 |
| --- | --- |
| pageviews | 页面加载、站内路径变化和从浏览器往返缓存恢复时计一次 PV。UV 使用本站本地存储中的随机 ID。关闭后不会为此项读写访客 ID。工作台用已有 PV 区分期间首次观测的访客，以及在窗口开始前已有记录的回访访客。 |
| devices | 根据浏览器声明估算手机、平板、电脑。和 PV 同时启用时可在概览看占比，单独启用时可在访问分析看次数。 |
| pages | 按 routes 中的路径模板汇总。动态 ID 用 :id 替代。未匹配路径归入「其他页面」，首页单列。 |
| referrers | 首次进入文档时记录引荐域名与渠道。单列常见 AI 引荐域、搜索引荐、社交引荐、其他外部引荐、站内和直接或来源不可见。 |
| campaigns | 首次进入文档时读取 utm_source、utm_medium、utm_campaign。这三项分别排行。 |
| sessions | 同一标签页相邻两次页面浏览间隔达到 30 分钟，计一次新会话。状态保存在 sessionStorage。 |
| countries | 使用收件边缘节点提供的国家或地区代码。缺少该信息时显示「未知」。 |
| environment | 浏览器系列、操作系统、主语言及视口宽度分组，每次页面浏览取样。 |
| engagement | 标签页可见时间。切换页面或进入后台时累加毫秒，工作台换算为秒。pages 开启时可按页面分组查看。 |
| scrollDepth | 每次浏览可滚动页面时，视口底部首次越过 25%、50%、75%、90% 各记一次。 |
| outboundLinks | 点击外部 HTTP(S) 链接的次数，按目标域名分组。 |
| downloads | 点击常见文件扩展名或带 download 属性的链接，按文件类型分组，衡量下载意向。 |
| forms | 浏览器发出 submit 事件的次数，仅记录次数。 |
| siteSearch | 初次加载或路径切换时，URL 含 searchKeys 中任一参数即计一次结果页浏览。仅改同路径的查询参数不会重复计数。 |
| errors | 脚本错误和未处理的 Promise 拒绝次数，按类别汇总。 |
| customEvents | 只有 events 白名单内的业务事件可通过 track(name) 上报。请在业务成功回调里调用。 |
| webVitals | 使用 Google 的 web-vitals 库采集 LCP、INP 和 CLS。工作台展示第 75 百分位及样本量。浏览器支持情况、可见性和用户是否交互都会影响样本量。 |

```ts
// 试用开通成功后，由业务代码显式调用。
citegauge.track('trial_started')
```

总开关关闭或所有分项均关闭时，浏览器 SDK 不注册采集监听、不触碰本地存储、不发送事件。仅启用互动事件时也可以单独使用，不要求开启 PV。收件端按官网域名和工作区校验。浏览器使用 HTTPS，通过 CSP 的 connect-src 放行 https://citegauge.liushurui0606.workers.dev 。浏览器事件不包含表单内容、搜索词、错误堆栈、原始 IP 或完整 URL。站点只应把公开的推广名称放入 UTM 字段。

## 在哪里查看

工作台选择对应官网，打开「网站流量 → 访问分析」。可选今天、近 7 天、近 30 天，均按北京时间。每个维度展示有样本的前 10 项。关闭开关、未发生对应事件或浏览器未提供该测量时，不产生新样本。0.2 客户端继续向流量概览提供原有 PV、UV 和设备统计，细分数据从升级后的访问开始累计。

## Node 服务端

在服务端的 citegauge.ts 中使用 `defineConfig`（从 `citegauge` 导入）。总开关 `enabled`、HTML 浏览统计 `collect.pageviews`、AI 爬虫及 XML/TXT 请求日志 `collect.requestLogs` 默认开启。服务启动时调用 `await citegauge.init()` 自动读取文件。服务端密钥只保存在服务端环境变量中。
