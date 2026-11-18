/** Preserve page order and resolve model-selected evidence to text from the capture. */
export function pagePassages(markdown: string) {
  const passages: string[] = [];
  for (const line of markdown.split(/\n+/)) {
    const visible = line.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/^\s{0,3}#{1,6}\s+/, "").replace(/\*\*|__/g, "").trim();
    if (!visible) continue;
    for (const chunk of visible.match(/.{1,320}(?:\s|$)|.{1,320}/gu) || []) {
      if (chunk.trim()) passages.push(chunk.trim());
    }
  }
  return passages;
}
