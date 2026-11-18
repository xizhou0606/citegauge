import { generateText } from "ai";
import { createAlibaba } from "@ai-sdk/alibaba";
import { websiteURL } from "./capture.ts";

export async function discoverUrls(query: string, key: string) {
  const provider = createAlibaba({
    apiKey: key, baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    // DashScope extensions are not exposed by the Alibaba SDK's chat options.
    fetch: (url, init) => fetch(url, { ...init, body: JSON.stringify({
      ...JSON.parse(String(init?.body)), enable_search: true, search_options: { forced_search: true },
    }) }),
  });
  const {text} = await generateText({
    model: provider.chatModel("qwen-plus"),
    system: "根据用户的行业检索词联网查找可核对的公司与产品。先把行业转换为目标地区真实使用的产品词。只找面向同类买家、交付相同任务的厂商，排除底层技术供应商、芯片和基础设施。检索指定市场，尽量找出 12 家不同品牌。优先返回每家真实可访问的独立官网首页，同一品牌仅保留一个网址。若检索词指定行业目录，返回实际列出多家品牌的评测、厂商名录和协会页面。每行只写一个完整网址。",
    prompt: query, maxRetries: 0, maxOutputTokens: 1200, abortSignal: AbortSignal.timeout(45000),
  });
  return [...new Set((text.match(/https?:\/\/[^\s<>\x22\x27)\]，。]+/gi) || []).flatMap(candidate => {
    try { return [websiteURL(candidate)]; } catch { return []; }
  }))].slice(0, 12);
}
