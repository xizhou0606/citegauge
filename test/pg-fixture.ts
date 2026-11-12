import pg from "pg";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

export async function fixture() {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!url)
    throw Error(
      "测试需要 PostgreSQL，请设置 TEST_DATABASE_URL 或运行 npm run db:local",
    );
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  const schema = "test_" + randomUUID().replaceAll("-", "");
  await admin.query("CREATE SCHEMA " + schema);
  const scoped = new URL(url);
  scoped.searchParams.set("options", "-c search_path=" + schema);
  const pool = new pg.Pool({ connectionString: scoped.toString() });
  const close = async () => {
    await pool.end();
    try {
      await admin.query("DROP SCHEMA " + schema + " CASCADE");
    } finally {
      await admin.end();
    }
  };
  try {
    for (const name of ["001_auth", "002_monitoring"])
      await pool.query(
        readFileSync(
          new URL("../migrations/postgres/" + name + ".sql", import.meta.url),
          "utf8",
        ),
      );
  } catch (e) {
    await close();
    throw e;
  }
  return { pool, url: scoped.toString(), close };
}
