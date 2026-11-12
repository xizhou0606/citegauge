import { $, action, clean } from "../core/ui.js";
import { api } from "../core/api.js";
import { bindEvidence } from "./evidence.js";

export const historySection = `<section class="surface history"><div class="section-head"><h2 id="history-title">样本历史</h2>
<button id="all-samples" class="btn btn-light btn-sm">查看全部样本</button></div><div id="history"></div></section>`;
export function historyList(m, data, refresh) {
  let sequence = 0;
  const target = $("history"),
    heading = $("history-title");
  async function list(
    filter = "all",
    value = "",
    offset = 0,
    label = "全部样本",
  ) {
    const request = ++sequence;
    const params = new URLSearchParams({
      filter,
      value,
      offset: String(offset),
      end: String(data.end),
    });
    const result = await api("history/" + m.id + "?" + params);
    if (!target.isConnected || request !== sequence) return;
    heading.textContent = "样本历史 · " + label;
    target.innerHTML =
      result.rows
        .map(
          (r) => `<article class="sample-row">
      <time>${clean(new Date(r.at).toLocaleString())}</time>
      <span class="state-tag">${{ ok: "有效", pending: "采集中", failed: "失败" }[r.state] || ""}</span>
      <button class="btn btn-link btn-sm" data-run="${clean(r.id)}">查看证据 →</button><div class="sample-detail"></div></article>`,
        )
        .join("") || '<p class="empty">当前筛选没有样本。</p>';
    const pager = (label, next) => {
      const b = document.createElement("button");
      b.className = "btn btn-light btn-sm";
      b.textContent = label;
      b.onclick = action(() =>
        list(
          filter,
          value,
          next,
          heading.textContent.replace("样本历史 · ", ""),
        ),
      );
      target.append(b);
    };
    if (offset > 0) pager("上一页", offset - 25);
    if (result.more) pager("下一页", offset + 25);
    for (const b of target.querySelectorAll("[data-run]"))
      bindEvidence(b, m, refresh);
  }
  $("all-samples").onclick = action(() => list());
  return list;
}
