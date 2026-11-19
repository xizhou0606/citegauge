import { groundedProbe, questionAnchors, type Profile } from "./grounded-probes.ts";

const buyingQuestions = [
  "市面上有哪些{品类}值得了解？分别适合什么样的团队？",
  "我们在考虑用{品类}，哪些日常工作最适合先试一试？",
  "在几种{品类}之间做选择，演示时看哪些细节才容易比较出差别？",
  "第一次采购{品类}，应该让供应商用什么真实任务做演示？",
  "想用{品类}替换现有做法，怎样判断切换成本值不值得？",
  "团队里几个人需要一起用{品类}，哪些方案能让大家分工并核对处理结果？",
  "团队刚开始接触{品类}，哪几种工具容易上手？第一次试用可以怎么安排？",
  "给团队选{品类}时，除了订阅费，通常还要比较哪些使用成本？",
  "团队业务量上来以后，怎么判断现有的{品类}还能不能满足需求？",
  "把{品类}接入现有工作流程，选型时要先核实哪些对接条件？",
  "试用{品类}时，该拿哪些实际结果判断它有没有帮上忙？",
  "在决定采购{品类}之前，哪些容易出错的场景值得先测一遍？",
];

export function fallbackProbe(profile: Profile, index: number) {
  const anchors = questionAnchors(profile);
  const functional = anchors.map((a,id) => ({...a,id})).filter(a => !/页脚|行动号召|常见疑问|导航|footer|CTA/i.test(a.section));
  const anchor = functional[index % functional.length]?.id ?? 0;
  const question = buyingQuestions[index].replace("{品类}",profile.identity.category);
  return groundedProbe(profile,{anchor,question},anchors);
}
