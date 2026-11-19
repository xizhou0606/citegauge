import { execFileSync } from "node:child_process";
import { unstable_readConfig } from "wrangler";

const scope = process.argv[2];
if (!["--remote","--local"].includes(scope)) throw Error("请选择 --local 或 --remote");
const config = unstable_readConfig({config:"wrangler.jsonc"});
const bindings = config.d1_databases.filter(d => d.binding === "DB" || d.binding.startsWith("TENANT_"));
if (new Set(bindings.map(d => d.database_id)).size !== bindings.length) throw Error("企业 D1 标识必须独立");
for (const {binding} of bindings) {
  execFileSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js","d1","migrations","apply",binding,scope],
    {stdio:"inherit"});
}
