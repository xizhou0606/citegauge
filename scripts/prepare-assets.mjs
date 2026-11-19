import { copyFile, mkdir, rm } from "node:fs/promises";

import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { platforms } from "../src/domain/platforms.ts";

const output = new URL("../public/vendor/", import.meta.url);
const modules = new URL("../node_modules/", import.meta.url);
// This directory contains only generated assets. Remove files from earlier builds.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const [from, to] of [
  ["lucide-react/LICENSE", "lucide-LICENSE.txt"],
  ["react/LICENSE", "react-LICENSE.txt"],
  ["radix-ui/LICENSE", "radix-LICENSE.txt"],
  ["markdown-it/LICENSE", "markdown-it-LICENSE.txt"],
  ["chart.js/dist/chart.umd.min.js", "chart.js"],
  ["chart.js/LICENSE.md", "chart-LICENSE.txt"],
]) {
  await copyFile(new URL(from, modules), new URL(to, output));
}
const brands = new URL("brands/", output);
await mkdir(brands, { recursive: true });
for (const id of [...platforms.map((platform) => platform.id), "volcengine"]) {
  const source = id === "openai" ? id : id + "-color";
  await copyFile(
    new URL("@lobehub/icons-static-svg/icons/" + source + ".svg", modules),
    new URL(id + ".svg", brands),
  );
}

await build({
  entryPoints: {workspace:"public/scripts/workspace.js", projects:"public/scripts/components/project-console.jsx"},
  jsx: "automatic",
  outdir: fileURLToPath(output),
  bundle: true,
  format: "esm",
  minify: true,
  legalComments: "linked",
  define: { "process.env.NODE_ENV": '"production"' },
});
execFileSync(
  process.execPath,
  [
    fileURLToPath(new URL("@tailwindcss/cli/dist/index.mjs", modules)),
    "-i",
    "src/web/theme.css",
    "-o",
    fileURLToPath(new URL("ui.css", output)),
    "--minify",
  ],
  { stdio: "inherit" },
);

await import("./build-site-sdk.mjs");
