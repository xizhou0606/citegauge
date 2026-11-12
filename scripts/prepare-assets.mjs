import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

const output = new URL("../public/vendor/", import.meta.url);
const modules = new URL("../node_modules/", import.meta.url);
await mkdir(output, { recursive: true });
for (const [from, to] of [
  ["bootstrap/dist/css/bootstrap.min.css", "bootstrap.css"],
  ["chart.js/dist/chart.umd.min.js", "chart.js"],
  ["bootstrap/LICENSE", "bootstrap-LICENSE.txt"],
  ["bootstrap-icons/LICENSE", "icons-LICENSE.txt"],
  ["chart.js/LICENSE.md", "chart-LICENSE.txt"],
]) {
  await copyFile(new URL(from, modules), new URL(to, output));
}
const icons = [
  "soundwave",
  "grid",
  "globe2",
  "cpu",
  "github",
  "book",
  "box-arrow-right",
  "plus-lg",
  "activity",
  "bar-chart",
  "link-45deg",
  "check2-circle",
  "exclamation-circle",
  "folder2-open",
  "arrow-up-right",
  "layers",
  "calendar3",
  "diagram-3",
  "cloud",
  "circle-half",
];
const symbols = await Promise.all(
  icons.map(async (name) => {
    const svg = await readFile(
      new URL("bootstrap-icons/icons/" + name + ".svg", modules),
      "utf8",
    );
    return (
      '<symbol id="' +
      name +
      '" viewBox="0 0 16 16">' +
      svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>")) +
      "</symbol>"
    );
  }),
);
await writeFile(
  new URL("icons.svg", output),
  '<svg xmlns="http://www.w3.org/2000/svg">' + symbols.join("") + "</svg>",
);
