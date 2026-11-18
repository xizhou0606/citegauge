import { websiteURL } from "../site-review/capture.ts";

export interface Resource {
  kind: "robots.txt" | "Sitemap";
  url: string;
  finalUrl: string;
  status: number | null;
  finding: string;
}

async function prefix(response: Response, limit: number) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let remaining = limit, text = "";
  try {
    while (remaining > 0) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value.subarray(0, remaining), { stream: true });
      remaining -= value.length;
    }
    return text + decoder.decode();
  } finally {
    await reader.cancel();
  }
}

async function probe(url: string, kind: Resource["kind"], load: typeof fetch) {
  const result: Resource = { kind, url, finalUrl: url, status: null, finding: "请求失败或超时" };
  const signal = AbortSignal.timeout(10000);
  let text = "";
  try {
    for (let n = 0; n <= 5; n++) {
      const response = await load(result.finalUrl, { redirect: "manual", cache: "no-store", signal,
        headers: { "User-Agent": "CiteGauge/1.0 (website resource check)" } });
      result.status = response.status;
      const location = response.headers.get("location");
      if (location && [301,302,303,307,308].includes(response.status)) {
        await response.body?.cancel();
        if (n === 5) throw Error();
        result.finalUrl = websiteURL(new URL(location, result.finalUrl).href);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        result.finding = "服务器返回错误状态";
        break;
      }
      text = await prefix(response, kind === "robots.txt" ? 512 * 1024 : 8192);
      if (/text\/html/i.test(response.headers.get("content-type") ?? "") || /^\s*(?:<!doctype html|<html\b)/i.test(text))
        result.finding = "返回了 HTML 页面";
      else if (kind === "robots.txt") result.finding = text.trim() ? "已读取文本" : "空文件";
      else if (/<(?:[\w-]+:)?sitemapindex[\s>]/i.test(text)) result.finding = "Sitemap 索引";
      else if (/<(?:[\w-]+:)?urlset[\s>]/i.test(text)) result.finding = "Sitemap URL 列表";
      else result.finding = "可访问，未确认 Sitemap 格式";
      break;
    }
  } catch {
    result.status = null;
    result.finding = "无法完成请求，请检查网址或稍后重试";
  }
  return { result, text };
}

export function targets(site: unknown, sitemap?: unknown) {
  const origin = new URL(websiteURL(site)).origin;
  if (sitemap != null && typeof sitemap !== "string") throw Error("Sitemap 地址无效");
  return { robots: origin + "/robots.txt", custom: sitemap?.trim()
    ? websiteURL(new URL(sitemap.trim(), origin).href) : undefined };
}

export async function inspectTargets(input: ReturnType<typeof targets>, load: typeof fetch = fetch) {
  const robots = await probe(input.robots, "robots.txt", load);
  const declared = new Set<string>();
  if (robots.result.finding === "已读取文本") {
    for (const match of robots.text.matchAll(/^\s*sitemap\s*:\s*([^#\s]+)/gim)) {
      try { declared.add(websiteURL(new URL(match[1], robots.result.finalUrl).href)); } catch { /* malformed entry */ }
    }
  }
  const fallback = new URL("/sitemap.xml", input.robots).href;
  const candidates = input.custom ? [input.custom] : declared.size ? [...declared] : [fallback];
  const maps = await Promise.all(candidates.slice(0, 5).map(url => probe(url, "Sitemap", load)));
  return {
    resources: [robots.result, ...maps.map(m => m.result)],
    source: input.custom ? "自定义地址" : declared.size ? "robots.txt 声明" : "默认路径 /sitemap.xml",
    omitted: Math.max(0, candidates.length - maps.length),
  };
}
