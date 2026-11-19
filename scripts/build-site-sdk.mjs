import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const dest = resolve("public/sdk");
mkdirSync(dest,{recursive:true});
execFileSync("npm",["pack","--pack-destination",dest],{cwd:"packages/citegauge",stdio:"inherit"});
execFileSync("npm",["exec","--offline","--","vitepress","build","sdk-guide"],{stdio:"inherit"});
