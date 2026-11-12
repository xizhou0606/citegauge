import { $, action, openEditor, status } from "../core/ui.js";
import { api } from "../core/api.js";
const fields = `
<label>本次回答页面链接<input class="form-control" name="page" type="url" required></label>
<label>回答原文<textarea class="form-control" name="answer" maxlength="50000" required></textarea></label>
<label><input class="form-check-input" type="checkbox" name="observable"> 已核对来源列表（无引用可留空）</label>
<label>确认引用的网址，每行一条<textarea class="form-control" name="urls"></textarea></label>
<label>页面截图（可选，PNG 或 JPEG，限 1 MiB）<input class="form-control" name="image" type="file" accept="image/png,image/jpeg"></label>`;
export function samplingButtons(m, ready) {
  if (m.channel.endsWith("网页"))
    return '<button id="import" class="btn btn-outline-secondary btn-sm">录入网页样本</button>';
  return `<button class="btn btn-outline-secondary btn-sm" id="run" ${ready ? "" : "disabled"}>立即采样</button>
    <button class="btn btn-light btn-sm" id="daily" ${ready || m.daily ? "" : "disabled"}>${m.daily ? "暂停每日采样" : "开启每日采样"}</button>
    ${ready ? "" : '<span class="text-secondary">API 密钥待配置</span>'}`;
}
export function bindSampling(m, refresh) {
  const sample = async (body) => {
    const { id } = await api("sample", {
      monitor: m.id,
      key: crypto.randomUUID(),
      ...body,
    });
    await refresh();
    const r = await api("evidence/" + id);
    status(r.state === "failed" ? r.detail.error : "样本已记录");
  };
  if ($("import")) {
    $("import").onclick = () =>
      openEditor(
        "录入网页样本",
        fields,
        async (form) => {
          const data = new FormData(form),
            image = data.get("image");
          data.delete("image");
          let screenshot = null;
          if (image?.size) {
            if (image.size > 1048576) throw Error("单张截图限 1 MiB");
            screenshot = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => reject(Error("读取截图失败"));
              reader.readAsDataURL(image);
            });
          }
          await sample({
            ...Object.fromEntries(data),
            screenshot,
            observable: form.elements.observable.checked,
          });
        },
        "保存证据",
      );
  } else {
    $("run").onclick = action(() => sample({}));
    $("daily").onclick = action(async () => {
      await api("schedule", { monitor: m.id, daily: !m.daily });
      await refresh();
    });
  }
}
