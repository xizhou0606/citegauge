import { manageSdk } from "../site-sdk/manage.ts";
import { crawlerInspection } from "../crawler-inspection/route.ts";
import { brandPreview } from "../site-review/brand-preview.ts";
import { siteReview } from "../site-review/route.ts";
import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins/username";
import type { Env } from "../runtime/env.ts";
import { json } from "../runtime/response.ts";

export function workspaceAuth(env: Env) {
  return betterAuth({
    appName: "CiteGauge",
    database: env.DB,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true, disableSignUp: true },
    plugins: [username()],
    session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database" },
  });
}

const publicAuthRoutes = new Map([
  ["/api/auth/sign-in/username", "POST"],
  ["/api/auth/sign-out", "POST"],
  ["/api/auth/get-session", "GET"],
]);

export async function privateApi(req: Request, env: Env) {
  if (
    !env.DB ||
    !env.BETTER_AUTH_URL ||
    !env.BETTER_AUTH_SECRET ||
    env.BETTER_AUTH_SECRET.length < 32
  )
    return json({ error: "工作台登录尚未配置" }, 503);
  const url = new URL(req.url);
  const origin = req.headers.get("origin");
  if (
    req.method !== "GET" &&
    origin &&
    origin !== new URL(env.BETTER_AUTH_URL).origin
  )
    return json({ error: "请求来源无效" }, 403);

  const auth = workspaceAuth(env);
  if (url.pathname.startsWith("/api/auth/")) {
    if (publicAuthRoutes.get(url.pathname) !== req.method)
      return json({ error: "路径无效" }, 404);
    const response = await auth.handler(req);
    const secured = new Response(response.body, response);
    secured.headers.set("Cache-Control", "no-store");
    return secured;
  }
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return json({ error: "请先登录工作台" }, 401);
  if (session.user.id !== "workspace-admin")
    return json({ error: "没有工作台访问权限" }, 403);
  if (req.method === "POST") {
    if (!req.headers.get("content-type")?.includes("application/json"))
      return json({ error: "需要 JSON" }, 415);
    const limit = url.pathname === "/api/sample" ? 1700000 : 260000;
    if ((await req.clone().arrayBuffer()).byteLength > limit)
      return json({ error: "样本过大" }, 413);
  }
  if (url.pathname === "/api/site-sdk") return manageSdk(req,env.DB);
  if (["/api/crawler-inspect", "/api/crawler-resource-logs", "/api/crawler-resource-traffic"].includes(url.pathname))
    return crawlerInspection(req, env.DB);
  if (url.pathname === "/api/industry-preview") return brandPreview(req, env);
  if (url.pathname === "/api/site-review") return siteReview(req, env);
  return env.WORKSPACE.get(env.WORKSPACE.idFromName("owner-v1")).fetch(req);
}

export async function hasWorkspaceSession(req: Request, env: Env) {
  if (!req.headers.has("Cookie")) return false;
  const session = await workspaceAuth(env).api.getSession({
    headers: req.headers,
  });
  return session?.user.id === "workspace-admin";
}
