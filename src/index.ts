import { ingest } from "./site-sdk/ingest.ts";
import { privateApi, hasWorkspaceSession } from "./auth/server.ts";
import { page } from "./web/pages.tsx";
import { articles } from "./web/articles.ts";
import type { Env } from "./runtime/env.ts";
export { Workspace } from "./storage/workspace.ts";
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
    if (path === "/collect/v1") return ingest(req,env.DB);
    if (path.startsWith("/api/")) return privateApi(req, env);
    if (!["GET", "HEAD"].includes(req.method))
      return new Response(null, { status: 405 });
    const restricted = path === "/workspace" || path === "/login";
    if (restricted) {
      const signedIn = await hasWorkspaceSession(req, env);
      const destination = signedIn ? "/workspace" : "/login";
      if (path !== destination)
        return new Response(null, {
          status: 303,
          headers: {
            Location: destination,
            "Cache-Control": "private, no-store",
            Vary: "Cookie",
          },
        });
    }
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
          ["/", "/docs/sdk/", ...Object.keys(articles)]
            .map((p) => "<url><loc>" + url.origin + p + "</loc></url>")
            .join("") +
          "</urlset>",
        "application/xml",
      );
    if (path === "/llms.txt")
      return text(
        "# 引迹 CiteGauge\n\n> 开源 GEO 监测平台与网站流量采集 SDK。\n\n## TypeScript SDK\n\n" +
          "- [SDK 全文](" + url.origin + "/docs/sdk/llms-full.txt)：安装、配置、API、指标与验证。\n" +
          "- [SDK 文档索引](" + url.origin + "/docs/sdk/llms.txt)：按任务选择 Markdown 页面。\n\n## 平台文档\n\n" +
          Object.entries(articles)
            .map(([p, a]) => "- [" + a.title + "](" + url.origin + p + ")")
            .join("\n") +
          "\n- [MIT 源码](https://github.com/xizhou0606/citegauge)",
        "text/plain",
      );
    if (
      path === "/" ||
      restricted ||
      (path in articles && Object.hasOwn(articles, path))
    ) {
      return new Response(page(path, url.origin), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer",
          ...(restricted
            ? { "Cache-Control": "private, no-store", Vary: "Cookie" }
            : {}),
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
        },
      });
    }
    return new Response("页面不存在", { status: 404 });
  },
};
