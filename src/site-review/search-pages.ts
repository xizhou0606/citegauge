import { websiteURL } from "./capture.ts";
import type { SearchPage } from "./industry-search.ts";

// Only public-page text is evidence. The search model supplies candidate addresses.
export async function readSearchPage(input: string): Promise<SearchPage | null> {
  let url = websiteURL(input);
  const signal = AbortSignal.timeout(8000);
  for (let hop = 0; hop <= 2; hop++) {
    const response = await fetch(url, { redirect: "manual", signal, headers: { Accept: "text/html" } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) return null;
      url = websiteURL(new URL(location, url).href);
      continue;
    }
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
      await response.body?.cancel();
      return null;
    }
    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    try {
      while (size < 196608) {
        const {value, done} = await reader.read();
        if (done) break;
        chunks.push(value.slice(0, 196608 - size));
        size += value.length;
      }
    } finally {
      await reader.cancel();
    }
    let title = "", description = "", siteName = "", body = "";
    const parser = new HTMLRewriter()
      .on("title", {text(chunk) { title += chunk.text; }})
      .on('meta[property="og:site_name"]', {element(el) { siteName = el.getAttribute("content") || ""; }})
      .on('meta[name="description"], meta[property="og:description"]', {element(el) {
        description ||= el.getAttribute("content") || "";
      }})
      .on("h1, h2, h3, p", {element() { body += " "; }, text(chunk) {
        if (body.length < 4500) body += chunk.text;
      }});
    await parser.transform(new Response(new Blob(chunks))).arrayBuffer();
    const snippet = (siteName + " " + description + " " + body).replace(/\s+/g, " ").trim().slice(0, 4500);
    return (title.trim() || siteName) && snippet ? {url, title: title.trim().slice(0, 240), snippet} : null;
  }
  return null;
}
