import { groundedProbe, questionAnchors, type Profile } from "./grounded-probes.ts";

const buyingQuestions = [
  "这个产品具体服务哪类使用者，官网用什么例子解释这个用途？",
  "哪些同类产品适合有这一需求的团队？请说明它们各自适用的场景。",
  "和处理同一任务的其他方案相比，这个产品有哪些可核实的差异？",
  "首次采购这类产品时，应该让供应商现场演示哪些操作，才能判断它适合我们？",
  "如果要用它替换现有做法，官网说明了哪些可接手的步骤，哪些还需要团队完成？",
  "需要多人协作完成这项工作时，可以比较哪些同类产品？应分别核对哪些角色和权限？",
  "新用户从哪里开始，第一次完成这项任务需要哪些步骤？请区分官网已说明和需要再确认的部分。",
  "要支持这一具体场景，哪些同类产品值得询价，预算比较时要确认哪些收费条件？",
  "团队扩大后继续做这项工作，官网对适用范围、协作方式或限制给了哪些依据？",
  "想把这项工作接入现有流程，可以比较哪些产品？分别要核实哪些输入和接入条件？",
  "试用时怎样验证它确实完成了这项任务？官网提供了哪些可对照的结果或示例？",
  "选购支持这一任务的产品时，哪些边界条件值得先测试，哪些同类产品适合放在一起比较？",
];

export function fallbackProbe(profile: Profile, index: number) {
  const anchors = questionAnchors(profile);
  const eligible = anchors.map((a,id) => ({...a,id})).filter(a => index % 2 === 0 || !a.branded);
  const functional = eligible.filter(a => !/页脚|行动号召|常见疑问|导航|footer|CTA/i.test(a.section));
  const options = functional.length ? functional : eligible;
  if (!options.length) throw Error("官网缺少可用于此类提问的依据");
  return groundedProbe(profile,index,{anchor:options[index % options.length].id,question:buyingQuestions[index]},anchors);
}
