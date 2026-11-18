import { discoverUrls } from "./qwen-search.ts";
import { readSearchPage } from "./search-pages.ts";
import { websiteURL } from "./capture.ts";
import type { Identity } from "./identity.ts";

export type SearchPage = { url: string; title: string; snippet: string };

async function search(query: string, token: string) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.search = new URLSearchParams({ q: query, count: "20", text_decorations: "false", country: "ALL" }).toString();
  const response = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": token },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw Error("搜索服务暂不可用，请检查搜索密钥和额度后重新分析。");
  const data = await response.json<{ web?: { results: {url: string; title: string; description: string}[] } }>();
  return (data.web?.results || []).flatMap((r) => {
    try {
      return [{url: websiteURL(r.url), title: r.title.trim().slice(0, 240), snippet: r.description.trim().slice(0, 1100)}];
    } catch {
      return [];
    }
  });
}

export async function industrySources(identity: Identity, key: string, ownUrl: string, token?: string, known: string[] = []) {
  const { category, brand } = identity;
  const omit = known.length ? "，补充这些品牌以外的厂商：" + known.slice(0, 30).join("、") : "";
  const queries = [
    category + " 中国本土品牌 同类产品 官网",
    brand + " global and North American direct competitors official product websites",
    category + " 欧洲及亚太厂商 产品官网",
    category + " 垂直细分领域 新兴品牌 官网",
    category + " software vendor directories market landscape alternatives 行业目录",
  ].map(q => q + omit);
  const host = new URL(ownUrl).hostname.replace(/^www\./, "");
  const pages = new Map<string, SearchPage>();
  const completed: string[] = [];
  const external = (url: string) => {
    const other = new URL(url).hostname;
    return other !== host && !other.endsWith("." + host);
  };
  if (!token) {
    const results = await Promise.allSettled(queries.map(q => discoverUrls(q, key)));
    const urls = new Set<string>();
    results.forEach((r, i) => {
      if (r.status !== "fulfilled" || !r.value.length) return;
      completed.push(queries[i]);
      for (const url of r.value) if (external(url)) urls.add(url);
    });
    // Share the fetch budget among markets before taking a second URL from a domain.
    const byHost = new Map<string, string>();
    for (const url of urls) {
      const domain = new URL(url).hostname.replace(/^www\./, "");
      if (!byHost.has(domain)) byHost.set(domain, url);
    }
    const candidates = [...new Set([...byHost.values(), ...urls])].slice(0, 40);
    // Reserve subrequests for model synthesis, evidence captures, D1 and authentication.
    const budget = {remaining: 27};
    for (let i = 0; i < candidates.length && budget.remaining > 0; i += 5) {
      const batch = await Promise.allSettled(candidates.slice(i, i + 5).map(url => readSearchPage(url, budget)));
      for (const r of batch) {
        if (r.status === "fulfilled" && r.value && external(r.value.url)) pages.set(r.value.url, r.value);
      }
    }
    return { pages: [...pages.values()], completed, planned: queries.length };
  }
  // Sequential requests also work with low-concurrency search plans.
  for (const query of queries) {
    try {
      for (const page of await search(query, token)) {
        if (external(page.url)) pages.set(page.url, page);
      }
      completed.push(query);
    } catch {
      continue;
    }
  }
  return { pages: [...pages.values()], completed, planned: queries.length };
}
