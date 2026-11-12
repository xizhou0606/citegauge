const repo = "https://github.com/xizhou0606/citegauge";
export const articles: Record<
  string,
  { title: string; summary: string; sections: [string, string][] }
> = {
  "/methodology": {
    title: "GEO 监测方法",
    summary: "固定问题与渠道，逐条保存原文，再计算品牌提及率与官网引用率。",
    sections: [
      [
        "品牌提及率怎样计算？",
        "在同一监测项的有效样本中，正文出现品牌名或别名的样本数除以有效样本数。同一回答出现多次只计一次。独立英文词按边界匹配，中文别名按子串匹配；歧义可回看原文复核。提及本身不代表推荐。",
      ],
      [
        "官网引用率的分母是什么？",
        "仅在能核对引用的有效回答中计算。来源 URL 的主机与官网域名或其子域匹配，计为一次官网引用。渠道没有提供可判定的引用字段时，记录为不可观测。搜索候选、正文随手写出的链接不自动计为引用。",
      ],
      [
        "怎样读趋势？",
        "固定问题、渠道、品牌与别名再比较不同日期。工作台展示最近 200 次采样，失败和进行中样本单列。模型版本记录在证据中；模型切换时应另建监测项。小样本应同时阅读分子和分母。",
      ],
      [
        "如何复核？",
        "在工作台选中监测项，打开一条历史样本，可查看渠道、时间、模型、命中项、正文、已核对的来源和原始记录。人工导入的网页样本有操作者提供的页面链接。",
      ],
    ],
  },
  "/channels": {
    title: "采样渠道与能力",
    summary:
      "豆包与 DeepSeek 网页支持人工录入证据；火山方舟和 DeepSeek 官方 API 支持按需和每日采样。",
    sections: [
      [
        "豆包、DeepSeek 网页",
        "在网页新会话中提交监测问题，复制完整回答、对应会话或分享链接。逐一核对引用后录入 URL；没有看到来源列表时可选择不可观测。记录时间取保存时间，请在取样后立即保存。",
      ],
      [
        "火山方舟 API",
        "需要 ARK_API_KEY、已开通的 ARK_MODEL 和可用的联网搜索工具。请求 Responses API，提取回答段落的 URL 引用标注。检索候选保存在原始响应内，单独核对。",
      ],
      [
        "DeepSeek API",
        "需要 DEEPSEEK_API_KEY，可指定 DEEPSEEK_MODEL。发起单轮文本请求，保存模型名、正文及响应。该渠道的官网引用率显示为不可观测。",
      ],
    ],
  },
  "/about": {
    title: "关于引迹 CiteGauge",
    summary:
      "引迹 CiteGauge 是可自托管的开源 GEO 监测工具，用于核对品牌在生成式引擎回答中的提及和引用。",
    sections: [
      [
        "这个项目适合谁？",
        "适合希望持续追踪一组真实购买问题的品牌、内容团队和研究者。每个部署提供一个管理员工作台。品牌名、问题、历史回答和采样密钥仅用于该部署。",
      ],
      [
        "引迹怎样监测自己？",
        "建立品牌「引迹 CiteGauge」，将 CiteGauge、引迹设为别名，并填写自己的部署域名。用「有哪些开源的中文 GEO 监测工具？」作为非品牌问题，用「CiteGauge 如何计算官网引用率？」作为品牌问题，分别追踪。",
      ],
      [
        "开源与部署",
        "源代码以 MIT 许可证发布。应用运行在 Cloudflare Workers，使用 SQLite Durable Objects 保存监测配置、样本和证据。仓库提供本地运行、测试和部署步骤。",
      ],
    ],
  },
};
const nav =
  '<header><a class="logo" href="/"><i aria-hidden="true">◩</i> 引迹 <span>CiteGauge</span></a><nav><a href="/methodology">监测方法</a><a href="/channels">采样渠道</a><a href="' +
  repo +
  '">GitHub ↗</a></nav><a class="button small" href="/workspace">工作台 ↗</a></header>';
const home =
  '<main><section class="hero"><div class="intro"><small>生成式引擎优化 · 开源监测台</small><h1>你的品牌，<br>在 AI 回答的<span>哪里？</span></h1><p>持续追踪同一组问题，核对品牌提及、竞品和官网引用。每个数字都能回到一份回答原文。</p><div class="actions"><a class="button" href="/workspace">进入监测工作台 ↗</a><a class="line" href="/methodology">了解指标口径 →</a></div></div><aside class="specimen"><div class="cap"><b>样本解读</b><span>演示数据</span></div><p class="mono">DOUBAO WEB · 网页人工取样</p><h2>小团队可以怎样管理客户跟进？</h2><blockquote>如果团队需要共享客户记录，可以评估<mark>示例品牌 A</mark>的协作功能，再比较录入成本。</blockquote><div class="rule"></div><div class="pair"><span>品牌提及</span><b>命中 1 个品牌</b></div><div class="pair"><span>官网引用</span><b>不可观测</b></div></aside></section><section class="resources"><h2>使用指南</h2><div class="cards">' +
  Object.entries(articles)
    .map(
      ([k, v]) =>
        '<a href="' +
        k +
        '"><strong>' +
        v.title +
        " ↗</strong><p>" +
        v.summary +
        "</p></a>",
    )
    .join("") +
  "</div></section></main>";
const desk =
  '<main class="desk"><small>PRIVATE WORKSPACE</small><h1>监测工作台</h1><div id="login"><form id="unlock"><label>管理员密钥<input type="password" name="token" autocomplete="current-password" required></label><button>打开工作台</button></form></div><p id="status" role="status"></p><div id="app" hidden><div class="toolbar"><h2>监测项</h2><button id="self">监测引迹自身</button><button id="add">新建监测项</button><button id="lock">锁定</button></div><div id="builder" hidden></div><div class="grid"><aside id="list"></aside><section id="panel"></section></div></div></main>';
export function page(path: string, origin: string) {
  const a = articles[path],
    workspace = path === "/workspace";
  const title =
    (workspace ? "监测工作台" : (a?.title ?? "开源 GEO 品牌监测平台")) +
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
  return (
    '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
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
    (workspace ? "noindex,nofollow" : "index,follow") +
    '"><link rel="stylesheet" href="/style.css">' +
    (workspace
      ? '<script type="module" src="/app.js"></script>'
      : '<script type="application/ld+json">' +
        JSON.stringify(schema) +
        "</script>") +
    "</head><body>" +
    nav +
    (workspace
      ? desk
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
    '<footer><b>引迹 CiteGauge</b><a href="/about">关于项目</a><a href="' +
    repo +
    '">MIT · GitHub ↗</a></footer></body></html>'
  );
}
