import { json } from "../runtime/response.ts";

export async function tokenHash(token: string) {
  const hash = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  return Array.from(new Uint8Array(hash),b => b.toString(16).padStart(2,"0")).join("");
}

export async function manageSdk(req: Request, db: D1Database, tenant?: string) {
  const url = new URL(req.url);
  const id = url.searchParams.get("monitor");
  const monitor = id && await db.prepare("SELECT config->>'domain' AS domain FROM monitors WHERE id=?").bind(id).first<{domain:string}>();
  if (!monitor) return json({error:"请选择已有官网监测项"},404);
  const domain = monitor.domain;
  if (req.method === "GET") {
    const since = Date.now()-30*86400000;
    const [site,stats,browser,browserStats] = await db.batch<Record<string,number|null>>([
      db.prepare("SELECT last_seen FROM sdk_sites WHERE domain=?").bind(domain),
      db.prepare("SELECT count(*) AS pv,count(DISTINCT visitor) AS uv FROM sdk_pageviews WHERE domain=? AND at>=?")
        .bind(domain,since),
      db.prepare("SELECT last_seen FROM browser_sites WHERE domain=?").bind(domain),
      db.prepare("SELECT count(*) AS pv,count(DISTINCT visitor) AS uv FROM browser_pageviews WHERE domain=? AND at>=?").bind(domain,since),
    ]);
    return json({domain,configured:site.results.length>0,lastSeen:site.results[0]?.last_seen ?? null,...stats.results[0],
      browser:{enabled:browser.results.length>0,lastSeen:browser.results[0]?.last_seen ?? null,workspace:tenant ?? "",...browserStats.results[0]}});
  }
  if (req.method !== "POST") return json({error:"需要 GET 或 POST"},405);
  if (url.searchParams.get("browser") === "1") {
    await db.prepare("INSERT OR IGNORE INTO browser_sites(domain) VALUES(?)").bind(domain).run();
    return json({enabled:true});
  }
  const token = "cg_" + crypto.randomUUID().replaceAll("-","") + crypto.randomUUID().replaceAll("-","");
  const credential = tenant ? token + "." + tenant : token;
  const hash = await tokenHash(credential);
  if (url.searchParams.get("rotate") === "1") {
    const result = await db.prepare("UPDATE sdk_sites SET token_hash=? WHERE domain=?").bind(hash,domain).run();
    if (!result.meta.changes) return json({error:"请先创建采集密钥"},409);
  } else {
    const result = await db.prepare("INSERT INTO sdk_sites(domain,token_hash) VALUES(?,?) ON CONFLICT(domain) DO NOTHING")
      .bind(domain,hash).run();
    if (!result.meta.changes) return json({error:"此官网已有采集密钥"},409);
  }
  return json({token: credential},201);
}
