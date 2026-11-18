import { websiteURL } from "./capture.ts";

export type IndustryPreview = { url: string; name: string; image: string; at: number };

export async function sourcePreview(browser: BrowserRun, rows: {url: string; name: string}[]) {
  for (const row of rows.slice(0, 3)) {
    try {
      const response = await browser.quickAction("snapshot", {
        url: websiteURL(row.url), formats: ["screenshot"], viewport: {width: 1080, height: 720},
        screenshotOptions: {type: "jpeg", quality: 55},
        gotoOptions: {waitUntil: "domcontentloaded", timeout: 10000}, rejectResourceTypes: ["media"],
      });
      if (!response.ok) continue;
      const data = await response.json<BrowserRunSnapshotSuccessResponse>();
      const image = data.result?.screenshot;
      if (!data.success || data.meta?.status >= 400 || !image?.startsWith("/9j/") || image.length > 220000) continue;
      if (/captcha|just a moment|access denied|attention required|验证访问/i.test(data.meta?.title || "")) continue;
      return {url: websiteURL(data.meta?.finalUrl || row.url), name: row.name, image, at: Date.now()};
    } catch { continue; }
  }
  return null;
}
