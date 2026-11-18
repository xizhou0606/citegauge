import { httpURL } from "./url.ts";

export function answerReferences(answer: string, candidates: unknown) {
  if (!Array.isArray(candidates)) return [];
  const used = new Set(Array.from(answer.matchAll(/\[ref_(\d+)\]/gi), match => Number(match[1])));
  return [...used].flatMap(index => {
    const matches = candidates.filter(item => item?.index === index);
    if (matches.length !== 1) return [];
    const item = matches[0];
    try {
      const url = httpURL(item.url);
      return [{index, url:url.href, title:typeof item.title === "string" && item.title.trim() ? item.title : url.hostname}];
    } catch { return []; }
  });
}
