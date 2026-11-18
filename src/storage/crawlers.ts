import { parseCrawlerLogs } from "../domain/crawler-logs.ts";
import { json } from "../runtime/response.ts";
import type { Database } from "./d1.ts";

export async function importCrawlerLogs(db: Database, domain: string, input: unknown, paths?: ReadonlySet<string>) {
  let parsed;
  try {
    parsed = parseCrawlerLogs(input, domain, paths);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
  const [saved] = await db.binding.batch([
    db.statement(`INSERT INTO crawler_visits(domain, request_id, at, bot, host, path, status, agent)
    SELECT ?1, value->>'id', value->>'at', value->>'bot', value->>'host', value->>'path',
      value->>'status', value->>'agent' FROM json_each(?2) WHERE true
    ON CONFLICT DO NOTHING`, [domain, parsed.visits]),
    db.statement(`INSERT INTO crawler_log_days(domain, day, first_seen, last_seen)
      SELECT ?1, value->>'day', value->>'first', value->>'last' FROM json_each(?2) WHERE true
      ON CONFLICT(domain, day) DO UPDATE SET first_seen=min(first_seen, excluded.first_seen),
      last_seen=max(last_seen, excluded.last_seen)`, [domain, parsed.days]),
  ]);
  const rowCount = saved.meta.changes;
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
  const detail = params.get("detail") ?? "bots";
  const filters: Record<string, string> = {
    bots: "bot <> ''",
    files: "kind <> ''",
    xml: "kind = 'xml'",
    txt: "kind = 'txt'",
  };
  if (!Object.hasOwn(filters, detail)) return json({ error: "请求范围无效" }, 400);
  const files = `WITH visits AS (SELECT *, CASE
    WHEN path LIKE '%.xml' OR path LIKE '%.xml.gz' THEN 'xml'
    WHEN path LIKE '%.txt' THEN 'txt' ELSE '' END AS kind ${where})`;
  const [groups, counts, records, coverage] = await db.binding.batch([
    db.statement(`SELECT bot, count(*) AS visits, sum(status BETWEEN 200 AND 299) AS ok,
      max(at) AS latest ${where} AND bot <> '' GROUP BY bot ORDER BY visits DESC, bot`, args),
    db.statement(`${files} SELECT kind, count(*) AS requests, count(nullif(bot,'')) AS ai
      FROM visits WHERE kind <> '' GROUP BY kind`, args),
    db.statement(`${files} SELECT request_id, bot, at, host, path, status, agent
      FROM visits WHERE ${filters[detail]}
      ORDER BY at DESC, request_id, host, path LIMIT 20 OFFSET ?4`, [...args, (page - 1) * 20]),
    db.statement(`SELECT 1 FROM crawler_log_days WHERE domain=?1 AND last_seen>=?2 AND first_seen<=?3 LIMIT 1`, args),
  ]);
  return json({ observed: coverage.results.length > 0, domain: row.domain, end, groups: groups.results, files: counts.results, records: records.results });
}
