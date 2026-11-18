import { Article } from "./components/article.tsx";
import { renderToStaticMarkup as render } from "react-dom/server";
import { LoginPage } from "./components/login.tsx";
import { articles } from "./articles.ts";
import { Home } from "./components/home.tsx";
import { repo, PublicHeader, PublicFooter, WorkspaceShell } from "./components/shell.tsx";
export function page(path: string, origin: string) {
  const a = articles[path],
    workspace = path === "/workspace",
    login = path === "/login";
  const title =
    (login ? "登录工作台" : workspace ? "监测工作台" : (a?.title ?? "开源 GEO 品牌监测平台")) +
    " | 引迹 CiteGauge";
  const description =
    a?.summary ??
    "追踪品牌在豆包、DeepSeek 等 AI 回答中的提及、竞品与官网引用。查看可复核的采样证据和公开指标方法。";
  const schema = {
    "@context": "https://schema.org",
    "@type": a ? "TechArticle" : "SoftwareApplication",
    name: a?.title ?? "引迹 CiteGauge",
    description,
    url: origin + path,
    ...(a
      ? { inLanguage: "zh-CN" }
      : {
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          sameAs: [repo],
          license: "https://opensource.org/license/mit",
        }),
  };
  const content = login ? (
    <LoginPage />
  ) : workspace ? (
    <WorkspaceShell />
  ) : a ? (
    <Article article={a} />
  ) : (
    <Home />
  );
  return (
    "<!doctype html>" +
    render(
      <html lang="zh-CN">
        <head>
          <meta charSet="utf-8" />
          <link rel="icon" href="/mark.svg" type="image/svg+xml" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>{title}</title>
          <meta name="description" content={description} />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          <link rel="canonical" href={origin + path} />
          <meta name="robots" content={workspace || login ? "noindex,nofollow" : "index,follow"} />
          <link rel="stylesheet" href="/vendor/ui.css" />
          <link rel="stylesheet" href="/styles/site.css" />
          {login && (
            <>
              <link rel="stylesheet" href="/styles/login.css" />
              <script type="module" src="/scripts/login.js" />
            </>
          )}
          {workspace && (
            <>
              <link rel="stylesheet" href="/styles/console.css" />
              <link rel="stylesheet" href="/styles/mobile-shell.css" />
              <script defer src="/vendor/chart.js" />
              <script type="module" src="/vendor/workspace.js" />
            </>
          )}
          {!workspace && !login && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
            />
          )}
          {path === "/" && <script type="module" src="/scripts/site-entry.js" />}
        </head>
        <body>
          {!workspace && <PublicHeader login={login} />}
          {content}
          {!workspace && <PublicFooter />}
        </body>
      </html>,
    )
  );
}
