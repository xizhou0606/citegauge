import type { Pool } from "pg";
import { json } from "../runtime/response.ts";
export async function reviewSample(
  sql: Pool,
  monitorId: string,
  b: Record<string, unknown>,
) {
  const id = String(b.run);
  const sample = (
    await sql.query(
      "SELECT detail FROM runs WHERE id=$1 AND monitor=$2 AND state='ok'",
      [id, monitorId],
    )
  ).rows[0];
  if (!sample) return json({ error: "有效样本不存在" }, 404);
  const detail = sample.detail;
  if (b.recommended === null) {
    delete detail.review;
  } else {
    if (typeof b.recommended !== "boolean")
      return json({ error: "复核状态无效" }, 400);
    const quote = typeof b.quote === "string" ? b.quote.trim() : "";
    const rank = b.rank ?? null;
    if (
      (b.recommended || quote) &&
      (!quote || quote.length > 2000 || !detail.answer.includes(quote))
    )
      return json(
        { error: "请从该回答复制支持判断的原句（最多 2000 字）" },
        400,
      );
    if (
      rank !== null &&
      (!b.recommended ||
        typeof rank !== "number" ||
        !Number.isSafeInteger(rank) ||
        rank < 1)
    )
      return json({ error: "推荐顺位应为正整数" }, 400);
    detail.review = {
      recommended: b.recommended,
      quote,
      rank,
      at: Date.now(),
    };
  }
  await sql.query("UPDATE runs SET detail=$1 WHERE id=$2", [detail, id]);
  return json({ id });
}
