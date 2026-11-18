import { renderedSections, type Section } from "./sections.ts";
import { httpURL } from "../domain/url.ts";

export function websiteURL(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 2048)
    throw Error("请输入公开官网的 HTTP(S) 网址");
  const text = value.trim();
  const url = httpURL(/^[a-z][a-z\d+.-]*:/i.test(text) ? text : "https://" + text);
  const host = url.hostname.replace(/\.$/, "").toLowerCase();
  if (url.port || !/^(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]+$/.test(host) ||
    /\.(localhost|local|internal|lan|test|invalid|arpa|onion)$/.test(host))
    throw Error("请输入可从公网访问的官网域名");
  url.hash = "";
  return url.href;
}

export interface Snapshot {
  url: string;
  title: string;
  screenshot: string;
  markdown: string;
  sections?: Section[];
}

export async function capture(browser: BrowserRun, url: string): Promise<Snapshot> {
  const response = await browser.quickAction("snapshot", {
    url, formats: ["screenshot", "markdown", "content"],
    viewport: { width: 1280, height: 960, deviceScaleFactor: 1 },
    screenshotOptions: { type: "jpeg", quality: 72 },
    gotoOptions: { waitUntil: "load", timeout: 25000 },
    rejectResourceTypes: ["media"],
  });
  if (response.status === 429)
    throw Error("浏览器额度或并发已达上限，请稍后再试");
  if (!response.ok) throw Error("官网未能在浏览器中打开，请确认网址或稍后重试");
  const data = await response.json<BrowserRunSnapshotSuccessResponse>();
  if (!data.success) throw Error("浏览器未完成页面抓取，请稍后重试");
  const status = data.meta?.status;
  if (status >= 400)
    throw Error(`目标网站向 Cloudflare 浏览器返回 HTTP ${status}，请确认该页面可公开抓取`);
  if (/^(just a moment|access denied|attention required|验证访问)/i.test(data.meta?.title || ""))
    throw Error("目标网站向 Cloudflare 浏览器展示了访问验证页，未取得官网内容");
  const image = data.result?.screenshot;
  const markdown = data.result?.markdown?.trim() || "";
  if (!image?.startsWith("/9j/") || image.length > 1500000)
    throw Error("未取得可用的官网首屏截图，请重试");
  return {
    url: websiteURL(data.meta?.finalUrl || url), title: (data.meta?.title || "").slice(0, 220),
    sections: data.result.content ? await renderedSections(data.result.content) : [],
    screenshot: image, markdown: markdown.slice(0, 16000),
  };
}
