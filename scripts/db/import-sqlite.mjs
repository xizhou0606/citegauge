import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import pg from "pg";
import { migrate } from "./migrate.mjs";

const [authPath, workspacePath] = process.argv.slice(2);
if (![authPath, workspacePath].every((path) => path && existsSync(path)))
  throw Error("请提供原认证和工作台 SQLite 备份路径");
const auth = new DatabaseSync(authPath, { readOnly: true });
const work = new DatabaseSync(workspacePath, { readOnly: true });
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const authTables = ["user", "account", "session", "verification", "rateLimit"];
const workTables = ["monitors", "runs", "screenshots"];
await db.connect();
try {
  await migrate(db);
  await db.query("BEGIN");
  await db.query("SELECT pg_advisory_xact_lock(72691301)");
  const marker = "legacy-sqlite-v1";
  if (
    (
      await db.query("SELECT 1 FROM citegauge_migrations WHERE name=$1", [
        marker,
      ])
    ).rowCount
  ) {
    console.log("已完成过此迁移");
  } else {
    for (const table of [...authTables, ...workTables]) {
      const dest = '"' + table + '"';
      if ((await db.query("SELECT 1 FROM " + dest + " LIMIT 1")).rowCount)
        throw Error("目标表已有数据：" + table);
      const source = authTables.includes(table) ? auth : work;
      const allowed = (
        await db.query(
          "SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1",
          [table],
        )
      ).rows.map((r) => r.column_name);
      let count = 0;
      for (const row of source
        .prepare("SELECT * FROM " + dest + " ORDER BY rowid")
        .iterate()) {
        const keys = Object.keys(row);
        if (!keys.every((k) => allowed.includes(k)))
          throw Error("列定义不一致：" + table);
        const values = keys.map((k) => {
          if (k === "emailVerified") return !!row[k];
          if (row[k] instanceof Uint8Array) return Buffer.from(row[k]);
          if (typeof row[k] === "number" && /At$/.test(k))
            return new Date(row[k]).toISOString();
          return row[k];
        });
        await db.query(
          "INSERT INTO " +
            dest +
            " (" +
            keys.map((k) => '"' + k + '"').join(",") +
            ") VALUES (" +
            keys.map((_, i) => "$" + (i + 1)).join(",") +
            ")",
          values,
        );
        count++;
      }
      console.log(table, count);
    }
    await db.query("INSERT INTO citegauge_migrations(name) VALUES($1)", [
      marker,
    ]);
  }
  await db.query("COMMIT");
} catch (e) {
  await db.query("ROLLBACK");
  throw e;
} finally {
  auth.close();
  work.close();
  await db.end();
}
