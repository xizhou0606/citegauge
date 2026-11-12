import { z } from "zod";
import type { Evidence } from "../../domain/monitor.ts";
import { httpURL } from "../../domain/url.ts";
import { rawEvidence } from "./settings.ts";

const item = z.object({ type: z.string() });
const answerPart = z.object({
  text: z.string(),
  annotations: z.array(item.extend({ url: z.string().optional() })).nullish(),
});
const envelope = z.object({
  error: z.null().optional(),
  status: z.string().optional(),
  incomplete_details: z.null().optional(),
  model: z.string().optional(),
  output: z.array(item.passthrough()),
});
const message = z.object({
  role: z.literal("assistant").optional(),
  content: z.array(item.passthrough()),
});

export function arkEvidence(body: unknown, model: string): Evidence {
  const raw = rawEvidence(body);
  const parsed = envelope.safeParse(body);
  if (!parsed.success) throw Error("方舟响应格式无效或未完整生成");
  const { status, output } = parsed.data;
  if (status && status !== "completed") throw Error("回答未完整生成");

  // 只统计最终回答里的标注。检索候选仍完整保存在 raw 中。
  const parts = output
    .filter((entry) => entry.type === "message")
    .flatMap((entry) => message.parse(entry).content)
    .filter((part) => part.type === "output_text")
    .map((part) => answerPart.parse(part));
  const answer = parts.map((part) => part.text).join("\n");
  if (!answer.trim()) throw Error("未收到回答正文");
  const urls = parts.every((part) => Array.isArray(part.annotations))
    ? [
        ...new Set(
          parts
            .flatMap((part) => part.annotations ?? [])
            .filter((annotation) => annotation.type === "url_citation")
            .map((annotation) => httpURL(annotation.url).href),
        ),
      ]
    : null;
  return { answer, urls, page: "", model: parsed.data.model || model, raw };
}
