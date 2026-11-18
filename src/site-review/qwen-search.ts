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
    system: "根据用户的行业检索词联网查找可核对的公司与产品。返回 6 至 10 个不同的相关公开网页，优先覆盖不同品牌官网和行业目录。每行只写一个完整网址。",
    prompt: query, maxRetries: 0, maxOutputTokens: 1200, abortSignal: AbortSignal.timeout(45000),
  });
  return [...new Set((text.match(/https?:\/\/[^\s<>\x22\x27)\]，。]+/gi) || []).flatMap(candidate => {
    try { return [websiteURL(candidate)]; } catch { return []; }
  }))].slice(0, 10);
}
