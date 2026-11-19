import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const dest = resolve("public/sdk");
mkdirSync(dest,{recursive:true});
execFileSync("npm",["pack","--pack-destination",dest],{cwd:"packages/citegauge",stdio:"inherit"});
execFileSync("npm",["exec","--offline","--","vitepress","build","sdk-guide"],{stdio:"inherit"});

// Fail publication if the docs generator skips an SDK guide (notably the index page).
const docs = resolve("public/docs/sdk");
const index = await readFile(resolve(docs,"llms.txt"),"utf8");
const full = await readFile(resolve(docs,"llms-full.txt"),"utf8");
for (const page of (await readdir("sdk-guide")).filter(name => name.endsWith(".md"))) {
  const markdown = await readFile(resolve(docs,page),"utf8");
  const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/,"").trim();
  if (!index.includes("/docs/sdk/"+page+")") || !body || !full.includes(body))
    throw Error("SDK 文档索引或全文缺少 " + page);
}
