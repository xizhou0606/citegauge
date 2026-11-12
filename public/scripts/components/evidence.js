import { action, clean, status } from "../core/ui.js";
import { api } from "../core/api.js";
export function bindEvidence(b, m, load) {
  b.onclick = action(async () => {
    const n = b.nextElementSibling;
    if (n.dataset.open === "yes") {
      n.replaceChildren();
      n.dataset.open = "";
      return;
    }
    const r = await api("evidence/" + b.dataset.run),
      d = r.detail;
    n.dataset.open = "yes";
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
    if (r.state === "ok") {
      if (r.hasScreenshot) {
        const download = document.createElement("button");
        download.className = "btn btn-outline-secondary btn-sm my-2";
        download.textContent = "下载原始截图";
        download.onclick = action(async () => {
          const response = await fetch("/api/screenshot/" + r.id, {
            credentials: "same-origin",
          });
          if (!response.ok) throw Error("截图读取失败");
          const blob = await response.blob(),
            url = URL.createObjectURL(blob),
            link = document.createElement("a");
          link.href = url;
          link.download =
            "citegauge-" + r.id + (blob.type === "image/png" ? ".png" : ".jpg");
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        });
        n.append(download);
      }
      const form = document.createElement("form");
      form.innerHTML =
        '<label>推荐复核<select class="form-select" name="decision"><option value="">未复核</option><option value="yes">明确推荐</option><option value="no">未明确推荐</option></select></label><label>支持判断的原句<textarea class="form-control" name="quote" maxlength="2000"></textarea></label><label>明确排序中的顺位（可留空）<input class="form-control" type="number" min="1" step="1" name="rank"></label><button class="btn btn-primary" type="submit">保存复核</button>';
      const f = form.elements;
      f.decision.value = d.review ? (d.review.recommended ? "yes" : "no") : "";
      f.quote.value = d.review?.quote || "";
      f.rank.value = d.review?.rank ?? "";
      f.rank.disabled = f.decision.value !== "yes";
      f.decision.onchange = () => {
        f.rank.disabled = f.decision.value !== "yes";
        if (f.rank.disabled) f.rank.value = "";
      };
      form.onsubmit = action(async () => {
        await api("review", {
          monitor: m.id,
          run: r.id,
          recommended:
            f.decision.value === "" ? null : f.decision.value === "yes",
          quote: f.quote.value,
          rank: f.rank.value ? Number(f.rank.value) : null,
        });
        await load();
        status("复核已保存，指标已更新");
      });
      n.append(form);
    }
  });
}
