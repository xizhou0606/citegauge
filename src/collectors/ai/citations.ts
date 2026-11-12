import { z } from "zod";
import { httpURL } from "../../domain/url.ts";

const grounding = z.object({
  groundingSupports: z.array(
    z.object({
      groundingChunkIndices: z.array(z.number().int().nonnegative()),
    }),
  ),
  groundingChunks: z
    .array(z.object({ web: z.object({ uri: z.string() }).optional() }))
    .optional(),
});

export function groundedUrls(value: unknown) {
  const result = grounding.safeParse(value);
  if (!result.success) return null;
  const urls: string[] = [];
  for (const support of result.data.groundingSupports) {
    for (const index of support.groundingChunkIndices) {
      const uri = result.data.groundingChunks?.[index]?.web?.uri;
      if (!uri) return null;
      urls.push(httpURL(uri).href);
    }
  }
  return [...new Set(urls)];
}

const item = z.object({ type: z.string() }).passthrough();
const response = z.object({ output: z.array(item) });
const message = z.object({ content: z.array(item) });
const annotated = z.object({
  annotations: z.array(z.object({ url: z.string() })),
});

export function perplexityUrls(value: unknown) {
  const result = response.safeParse(value);
  if (!result.success) return null;
  const urls: string[] = [];
  let seen = false;
  for (const output of result.data.output.filter(
    (entry) => entry.type === "message",
  )) {
    const parsed = message.safeParse(output);
    if (!parsed.success) return null;
    for (const part of parsed.data.content.filter(
      (entry) => entry.type === "output_text",
    )) {
      const text = annotated.safeParse(part);
      if (!text.success) return null;
      seen = true;
      for (const link of text.data.annotations)
        urls.push(httpURL(link.url).href);
    }
  }
  return seen ? [...new Set(urls)] : null;
}
