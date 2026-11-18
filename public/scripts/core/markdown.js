import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: false, linkify: false }).disable("image");
md.validateLink = (url) => /^https?:\/\//i.test(url);
md.renderer.rules.table_open = () => '<div class="overflow-x-auto"><table class="w-full text-sm">';
md.renderer.rules.table_close = () => "</table></div>";
md.core.ruler.after("inline","citation-markers",state => {
  if (!state.env.sourceRefs?.length) return;
  const sources = new Map(state.env.sourceRefs.map(source => [source.index,source]));
  for (const block of state.tokens) {
    if (block.type !== "inline" || !block.children) continue;
    let inLink = false;
    block.children = block.children.flatMap(token => {
      if (token.type === "link_open") inLink = true;
      if (token.type === "link_close") inLink = false;
      if (inLink || token.type !== "text") return [token];
      const result = [];
      let start = 0;
      const literal = value => Object.assign(new state.Token("text","",0),{content:value});
      for (const match of token.content.matchAll(/\[ref_(\d+)\]/gi)) {
        const source = sources.get(Number(match[1]));
        if (!source || !md.validateLink(source.url)) continue;
        const link = new state.Token("link_open","a",1);
        link.attrs = [["href",source.url],["class","answer-citation"],["title",source.title],
          ["aria-label","来源 " + source.index + " · " + source.title],["target","_blank"],["rel","noreferrer"]];
        result.push(literal(token.content.slice(start,match.index)),link,literal("[" + source.index + "]"),new state.Token("link_close","a",-1));
        start = match.index + match[0].length;
      }
      return start ? [...result,literal(token.content.slice(start))] : [token];
    });
  }
});
export const markdown = (text,references = []) => md.render(String(text || ""),{sourceRefs:references});
