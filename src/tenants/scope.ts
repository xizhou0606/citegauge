import type { Env } from "../runtime/env.ts";

export const operator = "workspace-admin";
export const original = "owner-v1";
export const tenantKey = /^[a-z][a-z0-9]{0,23}$/;

export function businessBinding(env: Env, id: string) {
  if (!tenantKey.test(id)) return undefined;
  return env[`TENANT_${id.toUpperCase()}`];
}

export async function verifiedBinding(env: Env, id: string) {
  const db = businessBinding(env, id);
  if (!db) return;
  const marker = await db.prepare("SELECT tenant FROM tenant_database WHERE singleton=1").first<string>("tenant");
  if (marker === id) return db;
}

export function businessEnv(env: Env, id: string, db: D1Database): Env {
  return { ...env, DB: db, tenant: id,
    SLACK_CHANNEL_ID: undefined, SLACK_BOT_TOKEN: undefined, SLACK_SIGNING_SECRET: undefined,
    TELEGRAM_CHAT_ID: undefined, TELEGRAM_BOT_TOKEN: undefined };
}

export async function membership(env: Env, user: string) {
  if (user === operator) return { id: original, name: "自营工作区" };
  return env.DB.prepare("SELECT t.id,t.name FROM tenant_members m JOIN tenants t ON t.id=m.tenant WHERE m.user_id=?")
    .bind(user).first<{ id: string; name: string }>();
}

export function scheduler(env: Env) {
  return env.WORKSPACE.get(env.WORKSPACE.idFromName(env.tenant ? "tenant:" + env.tenant : original));
}

export async function schedulerEnv(env: Env, id: DurableObjectId) {
  if (id.name === original || id.equals(env.WORKSPACE.idFromName(original))) return env;
  for (const key of Object.keys(env)) {
    if (!key.startsWith("TENANT_")) continue;
    const tenant = key.slice(7).toLowerCase();
    if (!tenantKey.test(tenant) || !id.equals(env.WORKSPACE.idFromName("tenant:" + tenant))) continue;
    const db = await verifiedBinding(env, tenant);
    if (db) return businessEnv(env, tenant, db);
  }
  throw Error("找不到此调度器所属的企业数据库");
}
