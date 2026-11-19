import { getPlatformProxy } from "wrangler";
import { readFile } from "node:fs/promises";
import { Database } from "../src/storage/d1.ts";

export async function fixture() {
  const runtime = await getPlatformProxy({ persist: false });
  const binding = runtime.env.DB;
  try {
    for (const file of ["0001_auth.sql", "0002_monitoring.sql", "0003_site_review.sql", "0004_report_deliveries.sql", "0005_industry_reviews.sql", "0006_industry_brand_previews.sql", "0007_crawler_visits.sql", "0008_crawler_file_counts.sql", "0009_website_reports.sql", "0010_flash_ranked_questions.sql", "0011_current_search.sql"]) {
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
