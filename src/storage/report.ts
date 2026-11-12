import type { Pool } from "pg";
import type { Monitor } from "../domain/monitor.ts";

const DAY = 86400000;
const cohort = "monitor=$1 AND at BETWEEN $2 AND $3";
const mentioned = "jsonb_array_length(detail->'matched')>0";
const cited = "detail->>'cited'";
const recommended = "detail#>>'{review,recommended}'";
const count = (condition: string) =>
  `count(*) FILTER (WHERE ${condition})::int`;
const counts = `
  count(*)::int AS total,
  ${count("state='ok'")} AS valid,
  ${count("state='failed'")} AS failed,
  ${count("state='pending'")} AS pending,
  ${count("state='ok' AND " + mentioned)} AS mentions,
  ${count("state='ok' AND " + cited + " IS NOT NULL")} AS observable,
  ${count("state='ok' AND (" + cited + ")::boolean")} AS citations,
  ${count("state='ok' AND " + recommended + " IS NOT NULL")} AS reviewed,
  ${count("state='ok' AND (" + recommended + ")::boolean")} AS recommended`;
const period = (id: string, end: number) => [
  id,
  Math.floor(end / DAY) * DAY - 29 * DAY,
  end,
];

export async function daily(db: Pool, id: string, start: number, end: number) {
  const q = await db.query(
    `SELECT to_char(to_timestamp(at/1000) AT TIME ZONE 'UTC','YYYY-MM-DD') AS day,
    ${counts} FROM runs WHERE ${cohort} GROUP BY day ORDER BY day DESC`,
    [id, start, end],
  );
  return q.rows;
}
export async function report(db: Pool, monitor: Monitor, end: number) {
  const args = period(monitor.id, end);
  const start = Number(args[1]);
  const groups = async (field: "rivals" | "urls") =>
    (
      await db.query(
        `SELECT j.name, count(DISTINCT id)::int AS hits
    FROM runs CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(detail->'${field}')='array'
    THEN detail->'${field}' ELSE '[]'::jsonb END) AS j(name)
    WHERE ${cohort} AND state='ok' GROUP BY j.name ORDER BY hits DESC,j.name ${field === "urls" ? "LIMIT 20" : ""}`,
        args,
      )
    ).rows;
  const summary = (
    await db.query(`SELECT ${counts} FROM runs WHERE ${cohort}`, args)
  ).rows[0];
  const days = await daily(db, monitor.id, start, end);
  const rivals = new Map((await groups("rivals")).map((r) => [r.name, r.hits]));
  return {
    start,
    end,
    summary,
    days,
    rivals: monitor.rivals.map((name) => ({
      name,
      hits: rivals.get(name) ?? 0,
    })),
    sources: await groups("urls"),
  };
}
export async function history(db: Pool, id: string, params: URLSearchParams) {
  const end = Number(params.get("end"));
  const offset = Number(params.get("offset") || 0);
  if (
    !Number.isSafeInteger(end) ||
    end <= 0 ||
    !Number.isSafeInteger(offset) ||
    offset < 0
  )
    throw Error("时间窗或页码无效");
  const predicates: Record<string, string> = {
    all: "TRUE",
    mentions: "state='ok' AND " + mentioned,
    citations: "state='ok' AND (" + cited + ")::boolean",
    recommended: "state='ok' AND (" + recommended + ")::boolean",
    failed: "state='failed'",
    rival: "state='ok' AND (detail->'rivals') ? $5",
    source: "state='ok' AND (detail->'urls') ? $5",
  };
  const filter = params.get("filter") || "all";
  if (!Object.hasOwn(predicates, filter)) throw Error("筛选项无效");
  const args = [...period(id, end), offset];
  if (filter === "rival" || filter === "source")
    args.push(params.get("value") || "");
  const { rows } = await db.query(
    `SELECT id,at,state FROM runs WHERE ${cohort} AND (${predicates[filter]})
    ORDER BY at DESC,id DESC LIMIT 26 OFFSET $4`,
    args,
  );
  return { rows: rows.slice(0, 25), more: rows.length > 25 };
}
