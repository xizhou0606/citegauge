import { generateText, type LanguageModel } from "ai";
import type { Evidence } from "../../domain/monitor.ts";
import { groundedUrls, perplexityUrls } from "./citations.ts";
import { httpURL } from "../../domain/url.ts";
import { rawEvidence, samplingSettings } from "./settings.ts";

export async function textSample(
  model: LanguageModel,
  prompt: string,
  options: Pick<
    Parameters<typeof generateText>[0],
    "tools" | "providerOptions"
  > = {},
  citations?: "google" | "perplexity",
): Promise<Evidence> {
  const result = await generateText({
    ...samplingSettings,
    model,
    prompt,
    ...options,
  });
  if (result.finishReason !== "stop") throw Error("回答未完整生成");
  if (!result.text.trim()) throw Error("未收到回答正文");
  const parts = result.content.filter((p) => p.type === "text");
  const links = parts
    .flatMap((p) => p.citations ?? [])
    .map((c) => c.source)
    .filter((s) => s.sourceType === "url")
    .map((s) => httpURL(s.url).href);
  const observable =
    parts.length > 0 && parts.every((p) => Array.isArray(p.citations));
  let urls = observable ? [...new Set(links)] : null;
  if (citations === "google")
    urls =
      groundedUrls(result.providerMetadata?.google?.groundingMetadata) ?? urls;
  if (citations === "perplexity")
    urls = perplexityUrls(result.response.body) ?? urls;
  return {
    answer: result.text,
    urls,
    page: "",
    model: result.response.modelId,
    raw: rawEvidence(result.response.body),
  };
}
