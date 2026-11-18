import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: false, linkify: false }).disable("image");
md.validateLink = (url) => /^https?:\/\//i.test(url);
md.renderer.rules.table_open = () => '<div class="overflow-x-auto"><table class="w-full text-sm">';
md.renderer.rules.table_close = () => "</table></div>";
export const markdown = (text) => md.render(String(text || ""));
