type Action = { target: string; instruction: string; example: string; verify: string };
type AdviceModule = { evidence?: string; actions?: Action[] };

// Numeric claims in proposed copy need their own source. A candidate's demo
// score or a CSS percentage elsewhere on the page does not establish a result.
const metric = /(?:\d[\d.,]*\s*(?:%|％|倍)|\d[\d,.]*\+?\s*(?:(?:hiring |recruiting )?teams|customers|clients|companies|users|家客户|家企业|个团队|名用户))/i;
const business = /(?:save|reduc|faster|improv|increas|boost|accura|conversion|hiring|screening|trusted|customer|clients|users|省时|节省|提升|降低|缩短|提效|准确率|转化|客户|企业|用户规模)/i;

export function checkExamples<T extends AdviceModule>(modules: T[]): T[] {
  return modules.map(m => {
    if (!m.actions) return m;
    const actions = m.actions.map(action => {
      if (!metric.test(action.example) || !business.test(action.example)) return action;
      if (m.evidence?.includes(action.example)) return action;
      return {
        ...action,
        instruction: `在「${action.target}」补充一条可追溯的结果说明。先核实指标、样本范围和数据来源；资料不全时只陈述页面已有的产品流程。`,
        example: "有实测数据时可用此模板：在［样本范围和时间段］，完成［任务］的［指标］从［基线］变为［实测值］。在同一处附上测量方法。",
        verify: "逐项核对展示数字与原始记录，确认口径一致、来源可查。资料不足时，页面上只保留能从产品演示验证的描述。",
      };
    });
    return {...m,actions};
  });
}
