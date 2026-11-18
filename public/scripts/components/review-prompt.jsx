import { useState } from "react";
import { Copy, Download } from "lucide-react";
import { WorkspaceSelect } from "./workspace-select.jsx";
import { Label } from "@/components/ui/label";
import { SmallButton } from "./controls.jsx";
import { markdown } from "../core/markdown.js";
import { reviewDocument, downloadMarkdown } from "./review-export.js";

export function ReviewPrompt({ report, scope, choose }) {
  const [note, setNote] = useState("");
  const modules = scope === "all" ? report.modules : [report.modules[Number(scope)]];
  const prompt = reviewDocument(report, true, modules);
  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setNote("已复制");
    } catch {
      setNote("请选中下方提示词复制");
    }
  }
  return (
    <section className="prompt-reader">
      <div className="prompt-tools">
        <Label htmlFor="prompt-scope">提示词范围</Label>
        <WorkspaceSelect
          id="prompt-scope"
          value={scope}
          onChange={(value) => {
            choose(value);
            setNote("");
          }}
          options={[
            { value: "all", label: "全部模块" },
            ...report.modules.map((m, i) => ({ value: String(i), label: m.name })),
          ]}
        />
        <SmallButton onClick={copy}>
          <Copy />
          复制提示词
        </SmallButton>
        <SmallButton
          variant="ghost"
          onClick={() => downloadMarkdown(new URL(report.url).hostname + "-AI修改提示词.md", prompt)}
        >
          <Download />
          下载
        </SmallButton>
        <small role="status">{note}</small>
      </div>
      <article
        className="prompt-document"
        aria-label="AI 修改提示词正文"
        dangerouslySetInnerHTML={{ __html: markdown(prompt) }}
      />
    </section>
  );
}
