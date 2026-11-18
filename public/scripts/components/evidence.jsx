import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormattedAnswer } from "./formatted-answer.jsx";
import { api } from "../core/api.js";
import { status } from "../core/ui.js";
import { AsyncButton, Disclosure } from "./controls.jsx";

function ReviewForm({ m, run, refresh }) {
  const review = run.detail.review;
  const [decision, choose] = useState(review ? (review.recommended ? "yes" : "no") : "unknown");
  const [rank, setRank] = useState(review?.rank ?? "");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const quote = new FormData(e.currentTarget).get("quote");
    setBusy(true);
    try {
      await api("review", {
        monitor: m.id,
        run: run.id,
        recommended: decision === "unknown" ? null : decision === "yes",
        quote,
        rank: rank ? Number(rank) : null,
      });
      await refresh();
      status("复核已保存，指标已更新");
    } catch (err) {
      status(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="grid gap-4" onSubmit={submit}>
      <fieldset>
        <legend>推荐复核</legend>
        <RadioGroup
          aria-label="推荐复核"
          value={decision}
          onValueChange={(v) => {
            choose(v);
            if (v !== "yes") setRank("");
          }}
        >
          {[
            ["unknown", "未复核"],
            ["yes", "明确推荐"],
            ["no", "未明确推荐"],
          ].map(([v, label]) => (
            <Label key={v}>
              <RadioGroupItem value={v} />
              {label}
            </Label>
          ))}
        </RadioGroup>
      </fieldset>
      <Label className="grid gap-2">
        支持判断的原句
        <Textarea name="quote" maxLength={2000} defaultValue={review?.quote || ""} />
      </Label>
      <Label className="grid gap-2">
        明确排序中的顺位（可留空）
        <Input
          name="rank"
          type="number"
          min="1"
          step="1"
          value={rank}
          disabled={decision !== "yes"}
          onChange={(e) => setRank(e.target.value)}
        />
      </Label>
      <Button type="submit" disabled={busy}>
        保存复核
      </Button>
    </form>
  );
}
async function download(run) {
  const response = await fetch("/api/screenshot/" + run.id, { credentials: "same-origin" });
  if (!response.ok) throw Error("截图读取失败");
  const blob = await response.blob(),
    url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = "citegauge-" + run.id + (blob.type === "image/png" ? ".png" : ".jpg");
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function Evidence({ run, m, refresh }) {
  if (run.state !== "ok")
    return <p>{run.state === "failed" ? "这次采样未能完成，可重新采样。" : "采集中"}</p>;
  const d = run.detail;
  return (
    <>
      <p>
        {d.model} · 命中 {d.matched.join("、") || "无"} · 竞品 {d.rivals.join("、") || "无"}
      </p>
      <FormattedAnswer detail={d} />
      {d.page && (
        <a href={d.page} target="_blank" rel="noreferrer">
          原始页面 ↗
        </a>
      )}
      {run.hasScreenshot && <AsyncButton run={() => download(run)}>下载原始截图</AsyncButton>}
      <Disclosure title={d.review ? "查看或修改人工复核" : "人工复核"}>
        <ReviewForm run={run} m={m} refresh={refresh} />
      </Disclosure>
    </>
  );
}
