import type { Env } from "../runtime/env.ts";
import { json } from "../runtime/response.ts";
import { websiteURL } from "./capture.ts";
import { sourcePreview } from "./industry-preview.ts";

export async function brandPreview(req: Request, env: Env) {
  if (req.method !== "POST") return json({error: "请求方法无效"}, 405);
  let domain, source, brand;
  try {
    const input = await req.json<{site?: string; source?: string; brand?: string}>();
    domain = new URL(websiteURL(input.site)).hostname.replace(/^www\./, "");
    source = websiteURL(input.source);
    brand = input.brand;
    if (typeof brand !== "string" || !brand.trim() || brand.length > 80) throw Error();
  } catch {
    return json({error: "请选择已收录的品牌来源。"}, 400);
  }
  const row = await env.DB.prepare(`SELECT 1 AS present FROM industry_reviews i, json_each(i.report,'$.rows') r
    WHERE i.domain=?1 AND r.value->>'name'=?2 AND r.value->>'url'=?3 LIMIT 1`)
    .bind(domain, brand, source).first();
  if (!row) return json({error: "此报告未收录该品牌来源，请刷新。"}, 404);
  const cached = await env.DB.prepare(`SELECT brand AS name,url,captured AS at,image FROM industry_brand_previews
    WHERE brand=?1 AND source=?2`).bind(brand, source).first();
  if (cached) return json({preview: cached});
  const preview = await sourcePreview(env.BROWSER, [{name: brand, url: source}]);
  if (!preview) return json({error: "暂未取得该来源页的截图，可打开原页核对或重新抓取。"}, 503);
  await env.DB.prepare(`INSERT INTO industry_brand_previews(brand,source,url,captured,image) VALUES(?1,?2,?3,?4,?5)
    ON CONFLICT(brand,source) DO UPDATE SET url=excluded.url,captured=excluded.captured,image=excluded.image
    WHERE excluded.captured >= industry_brand_previews.captured`)
    .bind(brand, source, preview.url, preview.at, preview.image).run();
  return json({preview});
}
