import type { Database } from "./d1.ts";
import type { Monitor } from "../domain/monitor.ts";

const DAY = 86400000;
const cohort = "monitor=?1 AND at BETWEEN ?2 AND ?3";
const mentioned = "json_array_length(detail->'matched')>0";
const cited = "detail->>'cited'";
const recommended = "json_extract(detail,'$.review.recommended')";
const count = (condition: string) =>
  `count(*) FILTER (WHERE ${condition})`;
const counts = `
  count(*) AS total,
  ${count("state='ok'")} AS valid,
  ${count("state='failed'")} AS failed,
  ${count("state='pending'")} AS pending,
  ${count("state='ok' AND " + mentioned)} AS mentions,
  ${count("state='ok' AND " + cited + " IS NOT NULL")} AS observable,
  ${count("state='ok' AND (" + cited + ")")} AS citations,
  ${count("state='ok' AND " + recommended + " IS NOT NULL")} AS reviewed,
  ${count("state='ok' AND (" + recommended + ")")} AS recommended`;
const period = (id: string, end: number) => [
  id,
  Math.floor(end / DAY) * DAY - 29 * DAY,
  end,
];

export async function daily(db: Database, id: string, start: number, end: number) {
  const q = await db.query(
    `SELECT date(at/1000,'unixepoch') AS day,
    ${counts} FROM runs WHERE ${cohort} GROUP BY day ORDER BY day DESC`,
    [id, start, end],
  );
  return q.rows;
}
export async function report(db: Database, monitor: Monitor, end: number) {
  const args = period(monitor.id, end);
  const start = Number(args[1]);
  const groups = async (field: "rivals" | "urls") =>
    (
      await db.query(
        `SELECT j.value AS name, count(DISTINCT runs.id) AS hits
    FROM runs, json_each(runs.detail,'$.${field}') AS j
    WHERE ${cohort} AND state='ok' AND j.type='text'
    GROUP BY j.value ORDER BY hits DESC,j.value ${field === "urls" ? "LIMIT 20" : ""}`,
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
export async function history(db: Database, id: string, params: URLSearchParams) {
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
    citations: "state='ok' AND (" + cited + ")",
    recommended: "state='ok' AND (" + recommended + ")",
    failed: "state='failed'",
    rival: "state='ok' AND EXISTS(SELECT 1 FROM json_each(detail,'$.rivals') WHERE value=?5)",
    source: "state='ok' AND EXISTS(SELECT 1 FROM json_each(detail,'$.urls') WHERE value=?5)",
  };
  const filter = params.get("filter") || "all";
  if (!Object.hasOwn(predicates, filter)) throw Error("筛选项无效");
  const args = [...period(id, end), offset];
  if (filter === "rival" || filter === "source")
    args.push(params.get("value") || "");
  const fields = params.get("format") === "markdown"
    ? "id,at,state,json_object('answer',detail->>'answer','page',detail->>'page','urls',detail->'urls','review',detail->'review') AS detail"
    : "id,at,state";
  const { rows } = await db.query(
    `SELECT ${fields} FROM runs WHERE ${cohort} AND (${predicates[filter]})
    ORDER BY at DESC,id DESC LIMIT 26 OFFSET ?4`,
    args,
  );
  return { rows: rows.slice(0, 25), more: rows.length > 25 };
}
