import { getPlatformProxy } from "wrangler";
import { readFile } from "node:fs/promises";
import { Database } from "../src/storage/d1.ts";

export async function fixture() {
  const runtime = await getPlatformProxy({ persist: false });
  const binding = runtime.env.DB;
  try {
    for (const file of ["0001_auth.sql", "0002_monitoring.sql", "0003_site_review.sql"]) {
      const sql = await readFile(new URL("../migrations/d1/" + file, import.meta.url), "utf8");
      const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
      await binding.batch(statements.map((statement) => binding.prepare(statement)));
    }
    return { pool: new Database(binding), binding, close: () => runtime.dispose() };
  } catch (error) {
    await runtime.dispose();
    throw error;
  }
}
