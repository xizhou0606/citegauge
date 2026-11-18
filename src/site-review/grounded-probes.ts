import { z } from "zod";
import type { Monitor } from "../domain/monitor.ts";

export type Profile = {
  at: number; url: string; impression: string; monitor: Monitor; identity: {category: string};
  modules: {name: string; evidence: string; passageText?: string}[];
};
const draft = z.object({
  anchor: z.number().int().nonnegative(),
  question: z.string().trim().min(8).max(350),
});
const fold = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[\s\p{P}]/gu, "");
function brandClues(m: Monitor, text: string) {
  return /https?:\/\/|www\./i.test(text) || [m.brand,...m.aliases,...m.rivals,m.domain]
    .map(fold).filter(Boolean).some(name => fold(text).includes(name));
}

export function questionAnchors(profile: Profile) {
  return profile.modules.flatMap(({name, evidence, passageText}) => {
    const source = passageText || evidence;
    const sentences = source.match(/[^。！？；;\n.!?]+(?:[。！？.!?]+|$)?/gu) || [];
    return sentences.map(s => s.trim().slice(0,160).trim())
      .filter(quote => quote.length >= 3 && source.includes(quote))
      .slice(0,8).map(quote => ({section:name,quote,branded:brandClues(profile.monitor,quote)}));
  });
}

export function groundedProbe(profile: Profile, slot: number, value: unknown, anchors = questionAnchors(profile)) {
  const {anchor, question} = draft.parse(value);
  const selected = anchors[anchor];
  if (!selected) throw Error("官网依据索引无效");
  const directed = slot % 2 === 0;
  const category = profile.identity.category.trim();
  if (!category || (!directed && (selected.branded || [category,question].some(s => brandClues(profile.monitor,s)))))
    throw Error("同类选型问题包含品牌线索");
  const context = directed
    ? `请分析 ${profile.monitor.brand} 的官网（${profile.url}），产品类别为「${category}」。`
    : `我们在选型「${category}」。`;
  return {
    question: context + `围绕「${selected.quote}」这个具体场景，` + question,
    mode: directed ? "官网定向" : "同类选型",
    section:selected.section, quote:selected.quote,
  };
}
