import pg from "pg";
import type { Env } from "../runtime/env.ts";

export function openPool(env: Env) {
  const connectionString = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  if (!connectionString) throw Error("缺少 PostgreSQL 连接配置");
  return new pg.Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 6000,
  });
}
