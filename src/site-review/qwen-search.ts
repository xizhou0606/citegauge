import { liveSearch } from "../collectors/ai/qwen-live-search.ts";
import { websiteURL } from "./capture.ts";

export async function discoverUrls(query: string, key: string) {
  const {answer:text} = await liveSearch(key,query,
    "根据用户的行业检索词联网查找可核对的公司与产品。先把行业转换为目标地区真实使用的产品词。只找面向同类买家、交付相同任务的厂商，排除底层技术供应商、芯片和基础设施。检索指定市场，尽量找出 12 家不同品牌。优先返回每家真实可访问的独立官网首页，同一品牌仅保留一个网址。若检索词指定行业目录，返回实际列出多家品牌的评测、厂商名录和协会页面。每行只写一个完整网址。",1200);
  return [...new Set((text.match(/https?:\/\/[^\s<>\x22\x27)\]，。]+/gi) || []).flatMap(candidate => {
    try { return [websiteURL(candidate)]; } catch { return []; }
  }))].slice(0, 12);
}
