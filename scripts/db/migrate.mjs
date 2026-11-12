import pg from "pg";
import { readdirSync, readFileSync } from "node:fs";
export async function migrate(client) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(72691301)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS citegauge_migrations(name text PRIMARY KEY, applied timestamptz DEFAULT now())",
    );
    const dir = new URL("../../migrations/postgres/", import.meta.url);
    for (const name of readdirSync(dir)
      .filter((x) => x.endsWith(".sql"))
      .sort()) {
      const done = await client.query(
        "SELECT 1 FROM citegauge_migrations WHERE name=$1",
        [name],
      );
      if (done.rowCount) continue;
      await client.query(readFileSync(new URL(name, dir), "utf8"));
      await client.query("INSERT INTO citegauge_migrations(name) VALUES($1)", [
        name,
      ]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}
if (import.meta.main) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await migrate(client);
  } finally {
    await client.end();
  }
}
