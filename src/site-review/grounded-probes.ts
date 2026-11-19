import { z } from "zod";
import type { Monitor } from "../domain/monitor.ts";

export type Profile = {
  at: number; url: string; impression: string; monitor: Monitor; identity: {category: string; brand?:string; aliases?:string[]; rivals?:string[]};
  competitors?: string[];
  modules: {name: string; evidence: string; passageText?: string; strength?: string}[];
};
const draft = z.object({
  anchor: z.number().int().nonnegative(),
  question: z.string().trim().min(8).max(350),
});
const fold = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[\s\p{P}]/gu, "");
function brandClues(profile: Profile, text: string) {
  const m = profile.monitor;
  const normalized = text.normalize("NFKC");
  const domain = /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\b|\/))/i;
  const {brand,aliases = [],rivals = []} = profile.identity;
  return domain.test(normalized) || [m.brand,...m.aliases,...m.rivals,m.domain,brand || "",...aliases,...rivals,...(profile.competitors || [])]
    .map(fold).filter(Boolean).some(name => fold(text).includes(name));
}

export function questionAnchors(profile: Profile) {
  return profile.modules.flatMap(({name, evidence, passageText}) => {
    const source = passageText || evidence;
    const sentences = source.match(/[^。！？；;\n.!?]+(?:[。！？.!?]+|$)?/gu) || [];
    return sentences.map(s => s.trim().slice(0,160).trim())
      .filter(quote => quote.length >= 3 && source.includes(quote))
      .slice(0,8).map(quote => ({section:name,quote}));
  });
}

export function groundedProbe(profile: Profile, value: unknown, anchors = questionAnchors(profile)) {
  const {anchor, question} = draft.parse(value);
  const selected = anchors[anchor];
  if (!selected) throw Error("官网依据索引无效");
  const category = profile.identity.category.trim();
  if (!category) throw Error("缺少产品类别");
  // Brand and evidence stay attached to the report. Only the customer question reaches the search model.
  const tokens = new Intl.Segmenter("zh",{granularity:"word"}).segment(category);
  const generic = new Set(["平台","工具","系统","服务","产品","方案","驱动","管理","智能","软件","AI"]);
  const hasContext = [...tokens].some(({segment,isWordLike}) => isWordLike && segment.length >= 2 &&
    !generic.has(segment) && question.toLowerCase().includes(segment.toLowerCase()));
  const outgoing = hasContext ? question : `我们正在挑选${category}。${question}`;
  if (brandClues(profile,outgoing) || /该品牌|这个品牌|该网站|这家官网|该平台|该产品|这个产品|该公司|这家公司/.test(outgoing))
    throw Error("问题透露了具体厂商");
  const copied = anchors.some(({quote}) => fold(quote).length >= 8 && fold(outgoing).includes(fold(quote)));
  if (copied) throw Error("问题复述官网原句");
  const need = /[。！？?!]$/.test(outgoing) ? outgoing : outgoing + "。";
  const request = "请推荐最多 5 款能满足上述需求的具体工具或平台，按适配程度从高到低排列。请用「名次、工具或平台名称、适配理由」三列表格回答，每行一款；只列有依据的产品，并附来源。";
  return {question:need + request,mode:"客户搜索",section:selected.section,quote:selected.quote};
}
