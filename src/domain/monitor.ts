import { channels, type Channel } from "./platforms.ts";
export { channels, type Channel } from "./platforms.ts";
export interface Monitor {
  id: string;
  brand: string;
  domain: string;
  question: string;
  aliases: string[];
  rivals: string[];
  channel: Channel;
  model?: string;
  daily: boolean;
}
export interface Evidence {
  answer: string;
  urls: string[] | null;
  page: string;
  model: string;
  raw: string;
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
export function monitorFrom(
  input: Record<string, unknown>,
  models: ReadonlyMap<Channel, readonly string[]> = new Map(),
): Monitor {
  const channel = input.channel as Channel;
  const options = models.get(channel);
  if (!channels.includes(channel)) throw Error("采样渠道无效");
  const model = input.model || options?.[0];
  if (
    input.model != null &&
    (typeof input.model !== "string" || !options?.includes(input.model))
  )
    throw Error("所选模型不属于该渠道");
  const host = field(input.domain, 253, "官网域名").toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z0-9-]+$/.test(host))
    throw Error("请输入官网域名，例如 example.com");
  return {
    id: crypto.randomUUID(),
    brand: field(input.brand, 80, "品牌"),
    question: field(input.question, 600, "问题"),
    domain: host.replace(/^www\./, ""),
    channel,
    ...(typeof model === "string" ? { model } : {}),
    aliases: names(input.aliases ?? ""),
    rivals: names(input.rivals ?? ""),
    daily: channel.endsWith("API") && input.daily === true,
  };
}
