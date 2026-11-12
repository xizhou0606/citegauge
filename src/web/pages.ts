import { loginPage } from "./components/login.ts";
import { articles } from "./articles.ts";
import { home } from "./components/home.ts";
import {
  repo,
  publicHeader,
  publicFooter,
  workspaceShell,
} from "./components/shell.ts";
export function page(path: string, origin: string) {
  const a = articles[path],
    workspace = path === "/workspace",
    login = path === "/login";
  const title =
    (login
      ? "登录工作台"
      : workspace
        ? "监测工作台"
        : (a?.title ?? "开源 GEO 品牌监测平台")) + " | 引迹 CiteGauge";
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
  return (
    '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><link rel="icon" href="/mark.svg" type="image/svg+xml"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
    title +
    '</title><meta name="description" content="' +
    description +
    '"><meta property="og:title" content="' +
    title +
    '"><meta property="og:description" content="' +
    description +
    '"><link rel="canonical" href="' +
    origin +
    path +
    '"><meta name="robots" content="' +
    (workspace || login ? "noindex,nofollow" : "index,follow") +
    '"><link rel="stylesheet" href="/vendor/bootstrap.css"><link rel="stylesheet" href="/styles/site.css">' +
    (login
      ? '<link rel="stylesheet" href="/styles/login.css"><script type="module" src="/scripts/login.js"></script>'
      : workspace
        ? '<link rel="stylesheet" href="/styles/console.css"><link rel="stylesheet" href="/styles/mobile-shell.css"><script defer src="/vendor/chart.js"></script><script type="module" src="/scripts/workspace.js"></script>'
        : '<script type="application/ld+json">' +
          JSON.stringify(schema) +
          "</script>") +
    "</head><body>" +
    (workspace || login ? "" : publicHeader) +
    (login
      ? loginPage
      : workspace
        ? workspaceShell
        : a
          ? '<main class="article"><a href="/">← 引迹首页</a><h1>' +
            a.title +
            '</h1><p class="lead">' +
            a.summary +
            "</p>" +
            a.sections
              .map(
                ([q, v]) =>
                  "<section><h2>" + q + "</h2><p>" + v + "</p></section>",
              )
              .join("") +
            "</main>"
          : home) +
    (workspace || login ? "" : publicFooter) +
    "</body></html>"
  );
}
