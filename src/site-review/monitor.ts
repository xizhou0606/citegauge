import type { Identity } from "./identity.ts";
import type { Monitor } from "../domain/monitor.ts";
import { qwenModel } from "../collectors/ai/qwen.ts";

export async function ensureSiteMonitor(db: D1Database, address: string, identity: Identity) {
  const url = new URL(address);
  const domain = url.hostname.toLowerCase().replace(/^www\./, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(domain));
  const id = "site-" + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  const { brand, question, aliases, rivals } = identity;
  const config: Monitor = { id, domain, brand, question, aliases, rivals,
    channel: "通义千问 API", model: qwenModel, daily: false };
  const [, stored] = await db.batch<{ config: string }>([
    db.prepare("INSERT INTO monitors(id,config,due) VALUES(?1,?2,?3) ON CONFLICT(id) DO NOTHING")
      .bind(id, JSON.stringify(config), Date.now()),
    db.prepare("SELECT config FROM monitors WHERE id=?1").bind(id),
  ]);
  return JSON.parse(stored.results[0].config) as Monitor;
}
