export type Section = { heading: string; body: string };

// A readability/Markdown extraction can omit product demos and landing-page sections.
export async function renderedSections(html: string): Promise<Section[]> {
  const blocks: { level: string; text: string }[] = [];
  let ignore = 0;
  let block = { level: "", text: "" };
  const save = () => {
    const text = block.text.replace(/\s+/g, " ").trim();
    if (text) blocks.push({level: block.level, text});
    block = {level:"",text:""};
  };
  const parser = new HTMLRewriter()
    .on("script, style, template, noscript, svg", { element(el) {
      ignore++;
      el.onEndTag(() => { ignore--; });
    }})
    .on("body", {text(chunk) {
      if (!ignore && block.text.length < 16000) block.text += chunk.text;
    }})
    .on("h2, h3", {element(el) {
      if (ignore) return;
      save();
      block.level = el.tagName;
      el.onEndTag(save);
    }})
    .on("p, li, button, article, section, div", {element(el) {
      if (!ignore) block.text += " ";
    }});
  await parser.transform(new Response(html)).arrayBuffer();
  save();
  const level = blocks.some(b => b.level === "h2") ? "h2" : "h3";
  const sections: Section[] = [];
  let current: Section | undefined;
  for (const b of blocks) {
    if (b.level === level) {
      current = {heading: b.text.slice(0,200), body:""};
      sections.push(current);
    } else if (current && current.body.length < 4000) {
      current.body += (current.body ? "\n" : "") + b.text.slice(0,4000-current.body.length);
    }
  }
  const usable = sections.filter(s => s.body.trim().length >= 12);
  if (usable.length <= 9) return usable;
  return Array.from({length:9},(_,i) => usable[Math.round(i*(usable.length-1)/8)]);
}
