import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const limit = 200;
const ignored = new Set([
  ".git",
  ".wrangler",
  "node_modules",
  "dist",
  "coverage",
  "public/vendor",
]);
const problems = [];
let count = 0;
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignored.has(relative(root, path))) await scan(path);
      continue;
    }
    if (!/\.(?:[cm]?[jt]sx?|css|html|svg)$/.test(entry.name)) continue;
    const source = await readFile(path, "utf8");
    const lines = source.replace(/\r?\n$/, "").split(/\r?\n/).length;
    count++;
    if (lines > limit)
      problems.push(relative(root, path) + " (" + lines + " 行)");
  }
}
await scan(root);
if (problems.length) {
  console.error("超过 " + limit + " 行：\n" + problems.join("\n"));
  process.exitCode = 1;
} else console.log(count + " 个自有源码文件通过单文件 " + limit + " 行检查");
