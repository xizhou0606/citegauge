export interface Env {
  WORKSPACE: DurableObjectNamespace;
  ASSETS: Fetcher;
  ADMIN_TOKEN?: string;
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
  ARK_API_KEY?: string;
  ARK_MODEL?: string;
}

export const channels = [
  "豆包网页",
  "DeepSeek 网页",
  "火山方舟 API",
  "DeepSeek API",
] as const;
export type Channel = (typeof channels)[number];
export interface Monitor {
  id: string;
  brand: string;
  domain: string;
  question: string;
  aliases: string[];
  rivals: string[];
  channel: Channel;
  daily: boolean;
}
export interface Evidence {
  answer: string;
  urls: string[] | null;
  page: string;
  model: string;
  raw: string;
}
export function httpURL(value: unknown) {
  if (typeof value !== "string" || value.length > 2048)
    throw Error("网址格式无效");
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw Error("仅支持 HTTP(S) 网址");
  return url;
}
export function field(value: unknown, max: number, label: string) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw Error(label + "长度无效");
  return value.trim();
}
function names(value: unknown) {
  if (typeof value !== "string" || value.length > 600)
    throw Error("名称列表无效");
  return [
    ...new Set(
      value
        .split(/[,，、\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}
export function monitorFrom(input: Record<string, unknown>): Monitor {
  const channel = input.channel as Channel;
  if (!channels.includes(channel)) throw Error("采样渠道无效");
  const host = field(input.domain, 253, "官网域名").toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z0-9-]+$/.test(host))
    throw Error("请输入官网域名，例如 example.com");
  return {
    id: crypto.randomUUID(),
    brand: field(input.brand, 80, "品牌"),
    question: field(input.question, 600, "问题"),
    domain: host.replace(/^www\./, ""),
    channel,
    aliases: names(input.aliases ?? ""),
    rivals: names(input.rivals ?? ""),
    daily: channel.endsWith("API") && input.daily === true,
  };
}
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
const fold = (s: string) => s.normalize("NFKC").toLocaleLowerCase();
export function measure(m: Monitor, e: Evidence) {
  const text = fold(e.answer);
  const matches = (s: string) => {
    const term = fold(s);
    if (/^[a-z0-9 ]+$/.test(term))
      return new RegExp("(?<![a-z0-9])" + term + "(?![a-z0-9])").test(text);
    return text.includes(term);
  };
  return {
    matched: [m.brand, ...m.aliases].filter(matches),
    rivals: m.rivals.filter(matches),
    cited:
      e.urls === null
        ? null
        : e.urls.some((s) => {
            const h = httpURL(s).hostname;
            return h === m.domain || h.endsWith("." + m.domain);
          }),
  };
}
interface ArkPart {
  type: string;
  text?: string;
  annotations?: { type: string; url?: string }[];
}
interface Payload {
  model?: string;
  status?: string;
  choices?: { finish_reason?: string; message?: { content?: string } }[];
  output?: { type: string; content?: ArkPart[] }[];
}
export function parseAnswer(
  p: Payload,
  isArk: boolean,
  model: string,
): Evidence {
  const parts = (p.output ?? [])
    .filter((x) => x.type === "message")
    .flatMap((x) => x.content ?? [])
    .filter((x) => x.type === "output_text");
  if (
    (isArk && p.status && p.status !== "completed") ||
    (!isArk && p.choices?.[0]?.finish_reason !== "stop")
  )
    throw Error("回答未完整生成");
  const answer = isArk
    ? parts.map((x) => x.text).join("\n")
    : p.choices?.[0]?.message?.content;
  if (!answer?.trim()) throw Error("未收到回答正文");
  const refs = parts
    .flatMap((x) => x.annotations ?? [])
    .filter((a) => a.type === "url_citation" && a.url)
    .map((a) => httpURL(a.url).href);
  const urls =
    isArk && parts.some((x) => Array.isArray(x.annotations))
      ? [...new Set(refs)]
      : null;
  const raw = JSON.stringify(p);
  if (new TextEncoder().encode(raw).length > 650000)
    throw Error("响应超过单次证据容量");
  return { answer, urls, page: "", model: p.model || model, raw };
}
export function ready(env: Env, ch: Channel) {
  return ch === "火山方舟 API"
    ? !!(env.ARK_API_KEY && env.ARK_MODEL)
    : ch === "DeepSeek API" && !!env.DEEPSEEK_API_KEY;
}
export async function collect(env: Env, m: Monitor) {
  const ark = m.channel === "火山方舟 API";
  if (!ready(env, m.channel)) throw Error("请先配置该渠道密钥和模型");
  const model = ark ? env.ARK_MODEL! : env.DEEPSEEK_MODEL || "deepseek-flash";
  const res = await fetch(
    ark
      ? "https://ark.cn-beijing.volces.com/api/v3/responses"
      : "https://api.deepseek.com/chat/completions",
    {
      method: "POST",
      signal: AbortSignal.timeout(55000),
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer " + (ark ? env.ARK_API_KEY : env.DEEPSEEK_API_KEY),
      },
      body: JSON.stringify(
        ark
          ? {
              model,
              input: m.question,
              tools: [{ type: "web_search" }],
              max_output_tokens: 2000,
            }
          : {
              model,
              messages: [{ role: "user", content: m.question }],
              thinking: { type: "disabled" },
              max_tokens: 2000,
            },
      ),
    },
  );
  if (!res.ok) throw Error("采集服务 HTTP " + res.status);
  return parseAnswer(await res.json(), ark, model);
}
