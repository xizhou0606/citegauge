import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "zh-CN", title: "CiteGauge", description: "TypeScript SDK 接入文档",
  base: "/docs/sdk/", outDir: "../public/docs/sdk",
  themeConfig: {
    siteTitle: "CiteGauge 开发文档",
    nav: [{text:"工作台",link:"https://citegauge.liushurui0606.workers.dev/workspace",target:"_self"}],
    sidebar: [{text:"TypeScript SDK",items:[
      {text:"快速接入",link:"/"}, {text:"指标与覆盖范围",link:"/metrics"}, {text:"配置与生命周期",link:"/api"},
    ]}],
    outline:{label:"本页内容"},docFooter:{prev:"上一页",next:"下一页"},
  },
});
