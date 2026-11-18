import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { api } from "../core/api.js";
import { status } from "../core/ui.js";
import { AsyncButton, FormDialog, SmallButton } from "./controls.jsx";
import { exportSamples } from "./report-export.js";

export function ReportActions({ m, report }) {
  const [targets, setTargets] = useState([]),
    [platform, setPlatform] = useState("");
  const [note, setNote] = useState("");
  const request = useRef("");
  async function load() {
    const key = crypto.randomUUID();
    request.current = key;
    setTargets([]);
    setPlatform("");
    setNote("正在读取接收会话…");
    try {
      const list = await api("destinations");
      if (request.current !== key) return;
      setTargets(list);
      setPlatform(list.find((t) => t.ready)?.id || "");
      setNote(
        list.some((t) => t.ready)
          ? ""
          : "在 Cloudflare Worker 的变量和机密中配置机器人及接收会话。Slack 需要 SLACK_BOT_TOKEN、SLACK_SIGNING_SECRET、SLACK_CHANNEL_ID。Telegram 需要 TELEGRAM_BOT_TOKEN、TELEGRAM_CHAT_ID。",
      );
    } catch (e) {
      if (request.current === key) setNote(e.message);
    }
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify({ monitor: m, ...report }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "citegauge-" + new Date(report.end).toISOString().slice(0, 10) + ".json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  return (
    <>
      <SmallButton id="export-report" onClick={exportJSON}>
        导出统计 JSON
      </SmallButton>
      <AsyncButton id="export-samples" run={() => exportSamples(m, report)}>
        导出完整报告
      </AsyncButton>
      <FormDialog
        title="发送报告"
        label="发送报告"
        triggerId="send-report"
        disabled={!report.summary.total}
        canSubmit={Boolean(platform)}
        onOpen={load}
        save={async () => {
          await api("send-report", { monitor: m.id, end: report.end, key: request.current, platform });
          status("监测报告已发送");
        }}
      >
        <p>
          {m.brand} · {m.channel}
        </p>
        <p>{m.question}</p>
        <RadioGroup aria-label="接收报告的会话" value={platform} onValueChange={setPlatform}>
          {targets.map((t) => (
            <Label key={t.id}>
              <RadioGroupItem value={t.id} disabled={!t.ready} />
              {t.label} · {t.ready ? t.address : "尚未配置"}
            </Label>
          ))}
        </RadioGroup>
        {note && (
          <p role="status" className="text-muted-foreground text-sm">
            {note}
          </p>
        )}
      </FormDialog>
    </>
  );
}
