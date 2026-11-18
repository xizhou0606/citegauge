import { z } from "zod";

const text = z.string().trim().min(1).max(600);
export const actionsSchema = z
  .array(
    z.object({
      target: text.max(100),
      instruction: text,
      example: text,
      verify: text,
    }),
  )
  .min(2)
  .max(5)
  .refine((actions) => new Set(actions.map((a) => a.instruction)).size === actions.length, "修改动作重复");

export const adviceInstructions = `actions 为每个模块按实施顺序列出 2–5 条独立、可交付的修改任务，复杂模块优先给 3–4 条。
每条用 {"target":"模块内具体元素或位置","instruction":"改动动词、确切位置、怎么实现及理由","example":"可直接使用的替换文案或具体交互/排版示例","verify":"使用者执行什么操作、应该看到什么结果"}。
例如针对“查看案例”入口，若确有案例页，可建议把入口放在对应功能说明末尾，文字写成“查看这项功能的使用案例”，验收时从该入口进入案例并核对其是否说明同一功能。
示例只示范写法，请针对当前官网独立撰写。观察到的文案与建议稿分清，替换文案使用该站语言，其余用中文。
优先解决访客需要做的具体判断。可围绕信息顺序、示例、按钮去向、异常状态等不同任务提出修改，不要把同一修改拆句凑数。
若建议需要真实材料、指标、案例或产品能力，写清先核实什么，使用有条件的示例。替换文案必须能原样发布：严禁在示例中编造客户数量、效率提升、准确率、背书、免费计划或合规认证，即使只是演示数字也不允许。缺少证据时改用可核查的过程描述。不要编造页面、链接、用户数据、功能承诺或点击后的实际表现。`;
