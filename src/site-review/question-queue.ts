import type { Env } from "../runtime/env.ts";
import { prepareQuestions } from "./brand-questions.ts";

export function armQuestions(env: Env) {
  return env.WORKSPACE.get(env.WORKSPACE.idFromName("owner-v1")).fetch("https://workspace/internal/arm-questions",{method:"POST"});
}

export async function runQuestionJob(env: Env) {
  const job = await env.DB.prepare(`SELECT domain,revision,attempts FROM website_question_jobs
    WHERE due>0 AND due<=?1 ORDER BY due LIMIT 1`).bind(Date.now()).first<{domain:string;revision:number;attempts:number}>();
  if (!job) return;
  const {domain,revision,attempts} = job;
  const result = await prepareQuestions(env,revision,domain);
  if (result.ok || result.status === 409) {
    await env.DB.prepare("DELETE FROM website_question_jobs WHERE domain=?1 AND revision=?2").bind(domain,revision).run();
    return;
  }
  const due = attempts >= 2 ? 0 : Date.now() + 5000 * 2 ** attempts;
  await env.DB.prepare("UPDATE website_question_jobs SET due=?1,attempts=attempts+1 WHERE domain=?2 AND revision=?3")
    .bind(due,domain,revision).run();
}
