import { defineConfig } from "vitepress";
import llmstxt from "vitepress-plugin-llms";

const origin = "https://citegauge.liushurui0606.workers.dev";

export default defineConfig({
  lang: "zh-CN", title: "CiteGauge", description: "TypeScript SDK 接入文档",
  base: "/docs/sdk/", outDir: "../public/docs/sdk",
  vite: { plugins: [llmstxt({domain:origin,excludeIndexPage:false})] },
  transformHead({pageData,siteData}) {
    if (pageData.isNotFound || pageData.relativePath === "404.md" || !pageData.relativePath.endsWith(".md")) return [];
    return [["link",{rel:"alternate",type:"text/markdown",href:siteData.base + pageData.relativePath}]];
  },
  themeConfig: {
    siteTitle: "CiteGauge 开发文档",
    nav: [{text:"AI 文档全文",link:origin+"/docs/sdk/llms-full.txt",target:"_self"}, {text:"工作台",link:"https://citegauge.liushurui0606.workers.dev/workspace",target:"_self"}],
    sidebar: [{text:"TypeScript SDK",items:[
      {text:"快速接入",link:"/"}, {text:"指标与覆盖范围",link:"/metrics"}, {text:"配置与生命周期",link:"/api"},
    ]}],
    outline:{label:"本页内容"},docFooter:{prev:"上一页",next:"下一页"},
  },
});
