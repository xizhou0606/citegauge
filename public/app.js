const $ = (id) => document.getElementById(id);
const clean = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let token = sessionStorage.getItem("cg-token") || "",
  state,
  active = "";
const status = (s) => {
  $("status").textContent = s;
};
async function api(path, body) {
  const response = await fetch("/api/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "请求失败");
  return result;
}
function action(fn) {
  return async (event) => {
    event?.preventDefault();
    const el = event?.currentTarget;
    const b = el?.tagName === "FORM" ? el.querySelector("button") : el;
    if (b) b.disabled = true;
    try {
      status("");
      await fn(event);
    } catch (err) {
      status(err.message);
    } finally {
      if (b) b.disabled = false;
    }
  };
}
async function load() {
  state = await api("state");
  sessionStorage.setItem("cg-token", token);
  $("login").hidden = true;
  $("app").hidden = false;
  if (!state.monitors.some((m) => m.id === active))
    active = state.monitors[0]?.id || "";
  $("list").innerHTML =
    state.monitors
      .map(
        (m) =>
          '<button data-id="' +
          m.id +
          '" aria-current="' +
          (active === m.id) +
          '">' +
          clean(m.brand) +
          "<br><small>" +
          clean(m.channel) +
          "</small></button>",
      )
      .join("") || "尚无监测项";
  for (const b of $("list").querySelectorAll("button"))
    b.onclick = () => {
      active = b.dataset.id;
      load().catch((e) => status(e.message));
    };
  panel();
}
$("unlock").onsubmit = action(async (e) => {
  token = new FormData(e.target).get("token");
  await load();
  e.target.reset();
});
$("lock").onclick = () => {
  sessionStorage.removeItem("cg-token");
  location.reload();
};
function builder(self) {
  const b = $("builder");
  b.hidden = false;
  b.innerHTML =
    '<form id="create"><h2>' +
    (self ? "建立引迹自身监测" : "新建监测项") +
    '</h2><label>品牌<input name="brand" required maxlength="80"></label><label>官网域名<input name="domain" required placeholder="example.com"></label><label>别名（逗号分隔）<input name="aliases"></label><label>竞品（逗号分隔）<input name="rivals"></label><label>固定问题<textarea name="question" required maxlength="600"></textarea></label><label>采样渠道<select name="channel"><option>豆包网页</option><option>DeepSeek 网页</option><option>火山方舟 API</option><option>DeepSeek API</option></select></label><button>保存监测项</button> <button type="button" id="cancel">取消</button></form>';
  const f = $("create");
  if (self) {
    f.elements.brand.value = "CiteGauge";
    f.elements.aliases.value = "引迹";
    f.elements.domain.value =
      location.hostname.includes(".") && !/^\d+\./.test(location.hostname)
        ? location.hostname
        : "";
    f.elements.question.value = "有哪些开源的中文 GEO 监测工具？";
  }
  $("cancel").onclick = () => {
    b.hidden = true;
  };
  f.onsubmit = action(async () => {
    const res = await api("monitors", Object.fromEntries(new FormData(f)));
    active = res.id;
    b.hidden = true;
    await load();
  });
  f.elements.brand.focus();
}
$("add").onclick = () => builder(false);
$("self").onclick = () => builder(true);
const frac = (n, d) =>
  d ? n + " / " + d + "（" + Math.round((100 * n) / d) + "%）" : "—";
function panel() {
  const m = state.monitors.find((x) => x.id === active),
    p = $("panel");
  if (!m) {
    p.textContent = "新建一个监测项，或用「监测引迹自身」开始。";
    return;
  }
  const rows = state.runs.filter((r) => r.monitor === m.id),
    ok = rows.filter((r) => r.state === "ok"),
    observable = ok.filter((r) => r.cited !== null);
  const manual = m.channel.endsWith("网页");
  p.innerHTML =
    "<small>" +
    clean(m.channel) +
    "</small><h2>" +
    clean(m.question) +
    "</h2><p>" +
    clean(m.brand) +
    " · " +
    clean(m.domain) +
    '</p><div class="metrics"><span>品牌提及 ' +
    frac(ok.filter((r) => JSON.parse(r.hits).length).length, ok.length) +
    "</span><span>官网引用 " +
    frac(observable.filter((r) => r.cited === 1).length, observable.length) +
    "</span><span>失败 " +
    rows.filter((r) => r.state === "failed").length +
    "</span></div>" +
    (manual
      ? '<details><summary>录入网页样本</summary><form id="sample"><label>本次回答页面链接<input name="page" type="url" required></label><label>回答原文<textarea name="answer" maxlength="50000" required></textarea></label><label><input type="checkbox" name="observable"> 已核对来源列表（无引用可留空）</label><label>确认引用的网址，每行一条<textarea name="urls"></textarea></label><button>保存证据</button></form></details>'
      : '<button id="run">立即采样</button> <button id="daily">' +
        (m.daily ? "暂停每日采样" : "开启每日采样") +
        '</button><p class="date">' +
        (state.ready[m.channel]
          ? "API 渠道已配置"
          : "请在 Worker Secrets 配置渠道密钥和模型。") +
        "</p>") +
    '<details id="trend"><summary>近 30 天趋势（UTC）</summary><div></div></details><h3>样本历史</h3><p class="date">当前工作台最近 200 次采样中的记录</p>' +
    (rows
      .map(
        (r) =>
          '<div class="row"><time>' +
          clean(new Date(r.at).toLocaleString()) +
          "</time> · " +
          ({ ok: "有效", failed: "失败", pending: "采集中" }[r.state] || "") +
          ' <button data-run="' +
          clean(r.id) +
          '">查看证据 →</button><div></div></div>',
      )
      .join("") || "<p>还没有样本。</p>");
  $("trend").ontoggle = async (e) => {
    const view = e.currentTarget;
    if (!view.open) return;
    try {
      const d = await api("trend/" + m.id);
      view.lastElementChild.innerHTML =
        d
          .map(
            (x) =>
              '<div class="row">' +
              clean(x.day) +
              " · 提及 " +
              frac(x.mentions, x.valid) +
              " · 引用 " +
              frac(x.citations, x.observable) +
              " · 失败 " +
              x.failed +
              "</div>",
          )
          .join("") || "暂无样本";
    } catch (err) {
      status(err.message);
    }
  };
  const sample = async (data) => {
    const res = await api("sample", {
      monitor: m.id,
      key: crypto.randomUUID(),
      ...data,
    });
    await load();
    const r = await api("evidence/" + res.id);
    status(r.state === "failed" ? r.detail.error : "样本已记录");
  };
  if (manual)
    $("sample").onsubmit = action((e) => {
      const f = e.target;
      return sample({
        ...Object.fromEntries(new FormData(f)),
        observable: f.elements.observable.checked,
      });
    });
  else {
    $("run").onclick = action(() => sample({}));
    $("daily").onclick = action(async () => {
      await api("schedule", { monitor: m.id, daily: !m.daily });
      await load();
    });
  }
  for (const b of p.querySelectorAll("[data-run]"))
    b.onclick = action(async () => {
      const n = b.nextElementSibling;
      if (n.hasChildNodes()) {
        n.replaceChildren();
        return;
      }
      const r = await api("evidence/" + b.dataset.run),
        d = r.detail;
      n.innerHTML =
        r.state !== "ok"
          ? clean(d.error || "采集中")
          : "<p>" +
            clean(d.model) +
            " · 命中 " +
            clean(d.matched.join("、") || "无") +
            " · 竞品 " +
            clean(d.rivals.join("、") || "无") +
            "</p><pre>" +
            clean(d.answer) +
            "</pre>" +
            (d.page
              ? '<a href="' +
                clean(d.page) +
                '" target="_blank" rel="noreferrer">原始页面 ↗</a>'
              : "") +
            "<p>引用来源</p>" +
            (d.urls === null
              ? "不可观测"
              : d.urls
                  .map(
                    (u) =>
                      '<p><a href="' +
                      clean(u) +
                      '" target="_blank" rel="noreferrer">' +
                      clean(u) +
                      "</a></p>",
                  )
                  .join("") || "已核对，未见引用") +
            "<details><summary>原始记录</summary><pre>" +
            clean(r.raw) +
            "</pre></details>";
    });
}
if (token)
  load().catch((err) => {
    sessionStorage.removeItem("cg-token");
    status(err.message);
  });
