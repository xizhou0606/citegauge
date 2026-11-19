import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { json } from "../runtime/response.ts";
import type { Env } from "../runtime/env.ts";
import { businessBinding, tenantKey, verifiedBinding } from "./scope.ts";

const form = z.object({
  tenant: z.string().regex(tenantKey),
  name: z.string().trim().min(1).max(80),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,30}$/),
});

export async function addAccount(req: Request, env: Env) {
  const input = form.safeParse(await req.json().catch(() => null));
  if (!input.success) return json({error:"请填写企业名称和 3 至 30 位的小写英文、数字、点或下划线账号"},400);
  const {tenant, name, username} = input.data;
  const db = businessBinding(env,tenant);
  if (!db) return json({error:"此企业尚未绑定独立 D1"},409);
  const known = await env.DB.prepare("SELECT name FROM tenants WHERE id=?").bind(tenant).first<string>("name");
  if (known && known !== name) return json({error:"企业名称与已有记录不一致"},409);
  if (!known) {
    // Never claim the primary auth DB or a previously populated business DB.
    await db.prepare(`INSERT INTO tenant_database(singleton,tenant)
      SELECT 1,? WHERE NOT EXISTS(SELECT 1 FROM user) AND NOT EXISTS(SELECT 1 FROM monitors)
      AND NOT EXISTS(SELECT 1 FROM website_reports) AND NOT EXISTS(SELECT 1 FROM sdk_sites)
      AND NOT EXISTS(SELECT 1 FROM tenants) ON CONFLICT(singleton) DO NOTHING`).bind(tenant).run();
  }
  if (!await verifiedBinding(env,tenant)) return json({error:"数据库归属校验失败"},409);
  const id = crypto.randomUUID();
  const password = crypto.randomUUID() + crypto.randomUUID();
  const digest = await hashPassword(password);
  const now = new Date().toISOString();
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO tenants(id,name) VALUES(?,?) ON CONFLICT(id) DO NOTHING").bind(tenant,name),
      env.DB.prepare(`INSERT INTO user(id,name,email,emailVerified,username,displayUsername,createdAt,updatedAt)
        VALUES(?,?,?,0,?,?,?,?)`).bind(id,username,id+"@citegauge.invalid",username,username,now,now),
      env.DB.prepare(`INSERT INTO account(id,accountId,providerId,userId,password,createdAt,updatedAt)
        VALUES(?,?,'credential',?,?,?,?)`).bind(crypto.randomUUID(),id,id,digest,now,now),
      env.DB.prepare("INSERT INTO tenant_members(user_id,tenant) VALUES(?,(SELECT id FROM tenants WHERE id=? AND name=?))")
        .bind(id,tenant,name),
    ]);
  } catch (error) {
    if (/constraint/i.test(String(error))) return json({error:"账号已存在或企业名称冲突，请刷新后重试"},409);
    throw error;
  }
  return json({username,password},201);
}
