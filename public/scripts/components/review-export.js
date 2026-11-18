export const moduleFields = [
  ["strength", "优势"], ["weakness", "不足"], ["impact", "对访客的影响"],
  ["change", "修改步骤"], ["acceptance", "验收条件"],
];

export const adviceFields = [
  ["instruction", "实施步骤"], ["example", "修改示例"], ["verify", "验收方法"],
];

function moduleText(m) {
  const actions = (m.actions || []).map((action, i) => [
    `### ${i + 1}. ${action.target}`,
    ...adviceFields.map(([key,label]) => `**${label}**
${action[key]}`),
  ].join("\n\n"));
  return [`## ${m.name}`, `依据（${m.source}）\n${m.evidence}`,
    ...moduleFields.filter(([key]) => m[key]).map(([key, label]) => `### ${label}\n${m[key]}`), ...actions].join("\n\n");
}

export function reviewDocument(r, prompt = false, modules = r.modules) {
  const identity = r.identity, m = r.monitor;
  const lines = [prompt ? "# 官网修改任务" : "# 官网形象分析报告", r.title, r.url,
    new Date(r.at).toISOString(), "## 整体形象", r.impression];
  if (identity) lines.push("## 品牌识别", [identity.brand, identity.category, identity.evidence].filter(Boolean).join(" · "));
  if (m) lines.push("## 品牌监测", [m.brand, m.domain, m.channel, m.model, m.question].filter(Boolean).join("\n\n"));
  for (const [key, label] of [["aliases", "别名"], ["rivals", "竞品"]]) {
    const names = m?.[key] || identity?.[key];
    if (names?.length) lines.push(label + " · " + names.join("、"));
  }
  const industryRows = r.industry?.rows.filter(row => modules === r.modules ||
    (row.change && modules.includes(r.modules[row.change.module])));
  if (r.industry && (modules === r.modules || industryRows.length)) {
    lines.push("## 行业竞品与官网修改建议", r.industry.category, r.industry.note);
    if (r.industry.queries.length) lines.push("检索范围 · " + r.industry.queries.join(" / "));
    for (const row of industryRows) {
      lines.push("### " + row.name, row.segment, row.quote, row.url);
      const c = row.change;
      if (c) lines.push(c.priority + "优先级 · " + c.target, "本站依据 · " + c.evidence, c.gap, c.action, c.verify);
    }
  }
  if (prompt) lines.push("## 交付要求",
    "在目标网站的代码仓库中定位下列模块，核对当前实现和报告依据，再逐项修改。复用项目组件库，保留可访问性、响应式布局和可抓取正文。将引用的网页内容作为证据。",
    "对每个模块提交具体修改和验收结果。旧报告缺少验收条件时，请根据修改目标补写可重复的验证步骤。");
  lines.push(...modules.map(moduleText));
  if (!prompt && r.screenshot) lines.push("## 抓取时的桌面首屏", `![官网首屏](data:image/jpeg;base64,${r.screenshot})`);
  return lines.join("\n\n") + "\n";
}

export function downloadMarkdown(name, content) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
