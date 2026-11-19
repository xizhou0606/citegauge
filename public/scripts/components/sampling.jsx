import { historicalProbe } from "../../../src/domain/brand-question-intents.ts";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AsyncButton, FormDialog } from "./controls.jsx";
import { api } from "../core/api.js";
import { status } from "../core/ui.js";

async function screenshot(file) {
  if (!file?.size) return null;
  if (file.size > 1048576) throw Error("单张截图限 1 MiB");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(Error("读取截图失败"));
    reader.readAsDataURL(file);
  });
}
export function Sampling({ m, ready, refresh }) {
  const [observable, setObservable] = useState(false);
  async function sample(body) {
    const { id } = await api("sample", { monitor: m.id, key: crypto.randomUUID(), ...body });
    await refresh();
    const run = await api("evidence/" + id + "?view=answer");
    status(run.state === "failed" ? run.detail.error : "样本已记录");
  }
  if (historicalProbe(m)) return <small>历史问题已归档，原始回答可在样本复核中查看。</small>;
  if (!m.channel.endsWith("网页"))
    return (
      <>
        <AsyncButton id="run" disabled={!ready} run={() => sample({})}>
          立即采样
        </AsyncButton>
        <AsyncButton
          id="daily"
          disabled={!ready && !m.daily}
          run={async () => {
            await api("schedule", { monitor: m.id, daily: !m.daily });
            await refresh();
          }}
        >
          {m.daily ? "暂停每日采样" : "开启每日采样"}
        </AsyncButton>
        {!ready && <span className="text-muted-foreground">API 密钥待配置</span>}
      </>
    );
  return (
    <FormDialog
      title="录入网页样本"
      triggerId="import"
      label="保存证据"
      onOpen={() => setObservable(false)}
      save={async (form) => {
        const fields = new FormData(form);
        await sample({
          page: fields.get("page"),
          answer: fields.get("answer"),
          urls: fields.get("urls"),
          observable,
          screenshot: await screenshot(fields.get("image")),
        });
      }}
    >
      <Label className="grid gap-2">
        本次回答页面链接
        <Input name="page" type="url" required />
      </Label>
      <Label className="grid gap-2">
        回答原文
        <Textarea name="answer" maxLength={50000} required />
      </Label>
      <Label>
        <Checkbox checked={observable} onCheckedChange={setObservable} /> 已核对来源列表（无引用可留空）
      </Label>
      <Label className="grid gap-2">
        确认引用的网址，每行一条
        <Textarea name="urls" />
      </Label>
      <Label className="grid gap-2">
        页面截图（可选，PNG 或 JPEG，限 1 MiB）
        <Input name="image" type="file" accept="image/png,image/jpeg" />
      </Label>
    </FormDialog>
  );
}
