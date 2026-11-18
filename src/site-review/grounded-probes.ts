import { z } from "zod";
import type { Monitor } from "../domain/monitor.ts";

export type Profile = {
  at: number; url: string; impression: string; monitor: Monitor; identity: {category: string};
  modules: {name: string; evidence: string}[];
};
const draft = z.object({
  section: z.number().int().nonnegative(),
  quote: z.string().trim().min(2).max(160),
  question: z.string().trim().min(8).max(300),
});
const fold = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[\s\p{P}]/gu, "");

export function groundedProbe(profile: Profile, slot: number, value: unknown) {
  const {section, quote, question} = draft.parse(value);
  const module = profile.modules[section];
  if (!module?.evidence.includes(quote)) throw Error("缺少可核对的官网引文");
  const m = profile.monitor;
  const names = [m.brand,...m.aliases,...m.rivals,m.domain].map(fold).filter(Boolean);
  const branded = (s: string) => names.some(name => fold(s).includes(name)) || /https?:\/\/|www\./i.test(s);
  const directed = slot % 2 === 0;
  const category = profile.identity.category.trim();
  if (!category || (!directed && [category,question,quote].some(branded))) throw Error("品类提问出现品牌线索");
  const context = directed
    ? `请分析 ${m.brand} 的官网（${profile.url}），产品类别为「${category}」。`
    : `我们在选型「${category}」。`;
  return {
    question: context + `围绕「${quote}」这个具体场景，` + question,
    mode: directed ? "官网定向" : "同类选型",
    section: module.name, quote,
  };
}
