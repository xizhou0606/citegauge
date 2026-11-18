const priority = {高: 0, 中: 1, 低: 2};
const relevance = {"直接竞品": 0, "细分替代": 1};

export function rankedBrands(rows) {
  return [...rows].sort((a,b) =>
    (relevance[a.relation] ?? 2) - (relevance[b.relation] ?? 2) ||
    (priority[a.change?.priority] ?? 3) - (priority[b.change?.priority] ?? 3) ||
    a.name.localeCompare(b.name, "zh-CN")
  );
}
