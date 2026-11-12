import {field, type Channel, type Evidence} from "../domain/monitor.ts";
import {httpURL} from "../domain/url.ts";

export function imported(
  input: Record<string, unknown>,
  channel: Channel,
): Evidence {
  const page = httpURL(input.page);
  const domain = channel === "豆包网页" ? "doubao.com" : "deepseek.com";
  if (!(page.hostname === domain || page.hostname.endsWith("." + domain)))
    throw Error("证据链接与采样渠道不符");
  const supplied = field(input.answer, 50000, "回答正文");
  const links = String(input.urls ?? "")
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (links.length > 60) throw Error("每条样本最多保存 60 个来源");
  const urls =
    input.observable === true
      ? [...new Set(links.map((s) => httpURL(s).href))]
      : null;
  return {
    answer: supplied,
    urls,
    page: page.href,
    model: "网页人工取样",
    raw: JSON.stringify({ page: page.href, answer: supplied, urls }),
  };
}
