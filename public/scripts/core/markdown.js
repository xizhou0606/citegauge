import MarkdownIt from "/vendor/markdown-it.js";

const md = new MarkdownIt({ html: false, linkify: false }).disable("image");
md.validateLink = (url) => /^https?:\/\//i.test(url);
md.renderer.rules.table_open = () => '<div class="table-responsive"><table class="table table-sm">';
md.renderer.rules.table_close = () => "</table></div>";
export const markdown = (text) => md.render(String(text || ""));
