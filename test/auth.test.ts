import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fixture } from "./pg-fixture.ts";
import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { privateApi } from "../src/auth/server.ts";
import type { Env } from "../src/runtime/env.ts";

test("工作台仅接受管理员用户名会话，退出后撤销原 Cookie", async () => {
  const f = await fixture();
  const db = f.pool;
  try {
    const origin = "http://127.0.0.1:8787",
      now = new Date().toISOString();
    const password = randomBytes(18).toString("base64url");
    await db.query(
      'INSERT INTO "user"(id,name,email,"emailVerified",username,"displayUsername","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [
        "workspace-admin",
        "admin",
        "admin@citegauge.invalid",
        false,
        "admin",
        "admin",
        now,
        now,
      ],
    );
    await db.query(
      'INSERT INTO account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [
        "credential",
        "workspace-admin",
        "credential",
        "workspace-admin",
        await hashPassword(password),
        now,
        now,
      ],
    );
    const env = {
      DATABASE_URL: f.url,
      BETTER_AUTH_SECRET: randomBytes(48).toString("hex"),
      BETTER_AUTH_URL: origin,
      WORKSPACE: {
        idFromName: () => 1,
        get: () => ({ fetch: () => new Response("private") }),
      },
    } as unknown as Env;
    const call = (path: string, body?: unknown, cookie = "") =>
      privateApi(
        new Request(origin + path, {
          method: body ? "POST" : "GET",
          headers: { origin, cookie, "content-type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        }),
        env,
      );
    assert.equal((await call("/api/state")).status, 401);
    assert.equal((await call("/api/auth/sign-up/email", {})).status, 404);
    assert.equal((await call("/api/auth/sign-in/email", {})).status, 404);
    assert.equal(
      (
        await call("/api/auth/sign-in/username", {
          username: "admin",
          password: "incorrect",
        })
      ).status,
      401,
    );
    const login = await call("/api/auth/sign-in/username", {
      username: "admin",
      password,
    });
    assert.equal(login.status, 200);
    const sessionCookie = login.headers
      .getSetCookie()
      .find((c) => c.includes("session_token="));
    assert.ok(sessionCookie?.includes("HttpOnly"));
    const cookie = sessionCookie.split(";")[0];
    assert.equal(
      await (await call("/api/state", undefined, cookie)).text(),
      "private",
    );
    assert.equal((await call("/api/auth/sign-out", {}, cookie)).status, 200);
    assert.equal((await call("/api/state", undefined, cookie)).status, 401);
  } finally {
    await f.close();
  }
});
