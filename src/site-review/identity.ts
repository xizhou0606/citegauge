import { z } from "zod";

const name = z.string().trim().min(1).max(80);
export const identitySchema = z.object({
  brand: name,
  category: name,
  evidence: z.string().trim().min(1).max(450),
  aliases: z.array(name).max(10),
  rivals: z.array(name).max(10),
  question: z.string().trim().min(1).max(600),
});

export type Identity = z.infer<typeof identitySchema>;
const normalize = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[\s*_]/g, "");

export function groundedIdentity(value: Identity | null, page: string) {
  if (!value) return null;
  const source = normalize(page), quote = normalize(value.evidence), brand = normalize(value.brand);
  if (!brand || !source.includes(brand)) return null;
  const evidence = quote.includes(brand) && source.includes(quote) ? value.evidence :
    page.split("\n").map(line => line.trim()).find(line => line.length <= 450 && normalize(line).includes(brand));
  if (!evidence) return null;
  const seen = new Set([brand]);
  const uniqueNames = (names: string[]) => names.filter((name) => {
    const key = normalize(name);
    if (!key || seen.has(key) || !source.includes(key)) return false;
    seen.add(key);
    return true;
  });
  const aliases = uniqueNames(value.aliases);
  const rivals = uniqueNames(value.rivals);
  const namesBrand = (text: string) => [...seen].some((name) => normalize(text).includes(name));
  let question = value.question;
  if (namesBrand(question)) {
    if (namesBrand(value.category)) return null;
    question = `有哪些值得考虑的${value.category}，各有什么特点？`;
  }
  return { ...value, evidence, aliases, rivals, question };
}
