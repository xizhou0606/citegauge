import type {Monitor, Evidence} from "./monitor.ts";
import {httpURL} from "./url.ts";

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
