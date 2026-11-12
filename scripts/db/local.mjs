import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";

const dbFile = ".env";
const pw = randomBytes(24).toString("hex");
if (!existsSync(dbFile))
  writeFileSync(
    dbFile,
    "POSTGRES_PASSWORD=" +
      pw +
      "\nDATABASE_URL=postgres://citegauge:" +
      pw +
      "@127.0.0.1:55432/citegauge\n",
    { flag: "wx", mode: 0o600 },
  );
const db = parseEnv(readFileSync(dbFile, "utf8"));
if (!db.DATABASE_URL || !db.POSTGRES_PASSWORD)
  throw Error("请在 .env 设置 DATABASE_URL、POSTGRES_PASSWORD");
const file = ".dev.vars",
  original = existsSync(file) ? readFileSync(file, "utf8") : "";
const vars = parseEnv(original);
let next = original;
for (const [key, value] of Object.entries({
  DATABASE_URL: db.DATABASE_URL,
  BETTER_AUTH_URL: "http://127.0.0.1:8787",
  BETTER_AUTH_SECRET: randomBytes(48).toString("hex"),
})) {
  if (!vars[key]) next += "\n" + key + "=" + value + "\n";
}
if (next !== original) writeFileSync(file, next, { mode: 0o600 });
const run = spawnSync("docker", ["compose", "up", "-d", "--wait", "postgres"], {
  stdio: "inherit",
});
if (run.status !== 0) throw Error("启动本地 PostgreSQL 失败");
