import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashPassword } from "better-auth/crypto";

const remote = process.argv.includes("--remote");
const scope = remote ? "--remote" : "--local";
const reset = process.argv.includes("--reset");
const destination = remote ? ".local-admin-production.txt" : ".local-admin.txt";
function wrangler(args) {
  return execFileSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}
wrangler(["d1", "migrations", "apply", "DB", scope]);
const query = 'SELECT username FROM "user" WHERE id=\'workspace-admin\'';
const existing = JSON.parse(wrangler(["d1", "execute", "DB", scope, "--command", query, "--json"]))[0].results[0];
if (existing && !reset) {
  console.log("管理员账号已存在。");
} else {
  const name = existing?.username ?? process.env.CITEGAUGE_USERNAME ?? "admin";
  const password = process.env.CITEGAUGE_PASSWORD ?? randomBytes(24).toString("base64url");
  if (!/^[a-z0-9_.]{3,30}$/.test(name) || password.length < 8 || password.length > 128)
    throw Error("管理员账号或密码格式无效");
  const digest = await hashPassword(password);
  const now = new Date().toISOString();
  const sql = [];
  if (!existing) {
    sql.push(`INSERT INTO "user"(id,name,email,emailVerified,username,displayUsername,createdAt,updatedAt)
      VALUES('workspace-admin','${name}','${name}@citegauge.invalid',0,'${name}','${name}','${now}','${now}');`);
  }
  sql.push(`INSERT INTO account(id,accountId,providerId,userId,password,createdAt,updatedAt)
    VALUES('workspace-admin-credential','workspace-admin','credential','workspace-admin','${digest}','${now}','${now}')
    ON CONFLICT(id) DO UPDATE SET password=excluded.password,updatedAt=excluded.updatedAt;`);
  sql.push("DELETE FROM session WHERE userId='workspace-admin';");
  const temp = mkdtempSync(join(tmpdir(), "citegauge-admin-"));
  const pending = destination + "." + randomBytes(8).toString("hex") + ".txt";
  try {
    const file = join(temp, "setup.sql");
    writeFileSync(file, sql.join("\n"), { mode: 0o600 });
    writeFileSync(pending, "账号：" + name + "\n密码：" + password + "\n", { mode: 0o600, flag: "wx" });
    wrangler(["d1", "execute", "DB", scope, "--file", file, "--yes"]);
    renameSync(pending, destination);
    console.log("管理员凭据已保存到 " + destination);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
