export const customerQuestionVersion = 4;
export const brandQuestionIntents = [
  "品类发现", "场景选型", "方案比较", "首次采购", "替换现有方案", "团队协作",
  "使用门槛", "预算权衡", "规模适配", "实施与接入", "效果验证", "风险与限制",
];

export function historicalProbe(monitor: {brandPrompt?: {version?: number}}) {
  return !!monitor.brandPrompt && monitor.brandPrompt.version !== customerQuestionVersion;
}
