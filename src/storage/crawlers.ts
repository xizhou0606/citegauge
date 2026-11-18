import { parseCrawlerLogs } from "../domain/crawler-logs.ts";
import { json } from "../runtime/response.ts";
import type { Database } from "./d1.ts";

export async function importCrawlerLogs(db: Database, domain: string, input: unknown) {
  let parsed;
  try {
    parsed = parseCrawlerLogs(input, domain);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
  const { rowCount } = await db.query(`INSERT INTO crawler_visits(domain, request_id, at, bot, host, path, status, agent)
    SELECT ?1, value->>'id', value->>'at', value->>'bot', value->>'host', value->>'path',
      value->>'status', value->>'agent' FROM json_each(?2) WHERE true
    ON CONFLICT(domain, request_id) DO NOTHING`, [domain, parsed.visits]);
  return json({ added: rowCount, duplicates: parsed.visits.length - rowCount, skipped: parsed.skipped });
}

export async function crawlerReport(db: Database, monitor: string, params: URLSearchParams) {
  const row = await db.binding.prepare("SELECT config->>'domain' AS domain FROM monitors WHERE id=?")
    .bind(monitor).first<{domain: string}>();
  if (!row) return json({ error: "监测项不存在" }, 404);
  const page = Number(params.get("page") ?? 1);
  const end = Number(params.get("end") ?? Date.now());
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000000 ||
      !Number.isSafeInteger(end) || end <= 0 || end > Date.now())
    return json({ error: "时间窗或页码无效" }, 400);
  const args = [row.domain, end - 30 * 86400000, end];
  const where = "FROM crawler_visits WHERE domain=?1 AND at BETWEEN ?2 AND ?3";
  const [groups, records] = await db.binding.batch([
    db.statement(`SELECT bot, count(*) AS visits, sum(status BETWEEN 200 AND 299) AS ok,
      max(at) AS latest ${where} GROUP BY bot ORDER BY visits DESC, bot`, args),
    db.statement(`SELECT request_id, bot, at, host, path, status, agent ${where}
      ORDER BY at DESC, request_id LIMIT 20 OFFSET ?4`, [...args, (page - 1) * 20]),
  ]);
  return json({ domain: row.domain, end, groups: groups.results, records: records.results });
}
