import { json } from "./store.ts";
import { page, articles } from "./pages.ts";
import type { Env } from "./model.ts";
export { Workspace } from "./store.ts";
const text = (body: string, type: string) =>
  new Response(body, {
    headers: {
      "Content-Type": type + "; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
export default {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url),
      path = url.pathname;
    if (path.startsWith("/api/")) {
      if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 24)
        return json({ error: "管理员尚未设置工作台密钥" }, 503);
      const digest = (s: string) =>
        crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
      const [expected, received] = await Promise.all([
        digest("Bearer " + env.ADMIN_TOKEN),
        digest(req.headers.get("Authorization") || ""),
      ]);
      const bytes = new Uint8Array(received);
      const difference = new Uint8Array(expected).reduce(
        (acc, n, i) => acc | (n ^ bytes[i]),
        0,
      );
      if (difference !== 0) return json({ error: "工作台密钥无效" }, 401);
      if (req.method === "POST") {
        if (!req.headers.get("content-type")?.includes("application/json"))
          return json({ error: "需要 JSON" }, 415);
        if ((await req.clone().arrayBuffer()).byteLength > 260000)
          return json({ error: "样本过大" }, 413);
      }
      return env.WORKSPACE.get(env.WORKSPACE.idFromName("owner-v1")).fetch(req);
    }
    if (!["GET", "HEAD"].includes(req.method))
      return new Response(null, { status: 405 });
    if (path === "/robots.txt")
      return text(
        "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /workspace\nSitemap: " +
          url.origin +
          "/sitemap.xml",
        "text/plain",
      );
    if (path === "/sitemap.xml")
      return text(
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
          ["/", ...Object.keys(articles)]
            .map((p) => "<url><loc>" + url.origin + p + "</loc></url>")
            .join("") +
          "</urlset>",
        "application/xml",
      );
    if (path === "/llms.txt")
      return text(
        "# 引迹 CiteGauge\n\n开源 GEO 监测工具。记录固定问题的回答、品牌提及和引用证据。\n\n" +
          Object.entries(articles)
            .map(([p, a]) => "- [" + a.title + "](" + url.origin + p + ")")
            .join("\n") +
          "\n- [MIT 源码](https://github.com/xizhou0606/citegauge)",
        "text/plain",
      );
    if (
      path === "/" ||
      path === "/workspace" ||
      (path in articles && Object.hasOwn(articles, path))
    ) {
      return new Response(page(path, url.origin), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer",
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
        },
      });
    }
    return new Response("页面不存在", { status: 404 });
  },
};
