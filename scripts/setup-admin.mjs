import { randomBytes } from "node:crypto";
import { chmodSync, writeFileSync } from "node:fs";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { migrate } from "./db/migrate.mjs";

const remote = process.argv.includes("--remote");
const reset = process.argv.includes("--reset");
if (!process.env.DATABASE_URL) throw Error("请设置 DATABASE_URL");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await migrate(db);
  await db.query("BEGIN");
  await db.query("SELECT pg_advisory_xact_lock(72691302)");
  const existing = (
    await db.query(`SELECT u.username,a.id AS credential FROM "user" u LEFT JOIN account a
    ON a."userId"=u.id AND a."providerId"='credential' WHERE u.id='workspace-admin'`)
  ).rows[0];
  if (existing?.credential && !reset) {
    console.log("管理员 " + existing.username + " 已存在。");
  } else {
    const name =
      existing?.username || process.env.CITEGAUGE_USERNAME || "admin";
    const password =
      process.env.CITEGAUGE_PASSWORD || randomBytes(16).toString("base64url");
    if (
      !/^[a-z0-9_.]{3,30}$/.test(name) ||
      password.length < 8 ||
      password.length > 128
    )
      throw Error("账号或密码长度无效");
    await db.query(
      `INSERT INTO "user"(id,name,email,"emailVerified",username,"displayUsername","createdAt","updatedAt")
      VALUES('workspace-admin',$1,$2,false,$1,$1,now(),now()) ON CONFLICT(id) DO NOTHING`,
      [name, name + "@citegauge.invalid"],
    );
    await db.query("DELETE FROM session WHERE \"userId\"='workspace-admin'");
    await db.query(
      `INSERT INTO account(id,"accountId","providerId","userId",password,"createdAt","updatedAt")
      VALUES('workspace-admin-credential','workspace-admin','credential','workspace-admin',$1,now(),now())
      ON CONFLICT(id) DO UPDATE SET password=excluded.password,"updatedAt"=now()`,
      [await hashPassword(password)],
    );
    await db.query("COMMIT");
    const filename = remote
      ? ".local-admin-production.txt"
      : ".local-admin.txt";
    writeFileSync(filename, "账号：" + name + "\n密码：" + password + "\n", {
      mode: 0o600,
    });
    chmodSync(filename, 0o600);
    console.log("登录信息已保存至 " + filename);
  }
  if (existing?.credential && !reset) await db.query("COMMIT");
} catch (e) {
  await db.query("ROLLBACK");
  throw e;
} finally {
  await db.end();
}
