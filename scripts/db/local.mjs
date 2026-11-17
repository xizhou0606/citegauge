import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";

const file = ".dev.vars",
  original = existsSync(file) ? readFileSync(file, "utf8") : "";
const vars = parseEnv(original);
let next = original;
for (const [key, value] of Object.entries({
  BETTER_AUTH_URL: "http://127.0.0.1:8787",
  BETTER_AUTH_SECRET: randomBytes(48).toString("hex"),
})) {
  if (!vars[key]) next += "\n" + key + "=" + value + "\n";
}
if (next !== original) writeFileSync(file, next, { mode: 0o600 });
const run = spawnSync(process.execPath, [
  "node_modules/wrangler/bin/wrangler.js", "d1", "migrations", "apply", "DB", "--local",
], { stdio: "inherit" });
if (run.status !== 0) throw Error("本地 D1 初始化失败");
