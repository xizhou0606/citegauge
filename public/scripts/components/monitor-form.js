import { openEditor, clean } from "../core/ui.js";
import { api } from "../core/api.js";

export function newMonitor({ platforms, models, channel, self, onSave }) {
  const choices = platforms
    .map(
      (p) =>
        `<optgroup label="${clean(p.name)}">${p.channels.map((c) => `<option>${clean(c)}</option>`).join("")}</optgroup>`,
    )
    .join("");
  const fields = `
    <label>品牌<input class="form-control" name="brand" required maxlength="80"></label>
    <label>官网域名<input class="form-control" name="domain" required placeholder="example.com"></label>
    <label>别名（逗号分隔）<input class="form-control" name="aliases"></label>
    <label>竞品（逗号分隔）<input class="form-control" name="rivals"></label>
    <label>固定问题<textarea class="form-control" name="question" required maxlength="600"></textarea></label>
    <label>采样渠道<select class="form-select" name="channel" aria-label="采样渠道">${choices}</select></label>
    <label id="model-field" hidden>模型<select class="form-select" name="model" aria-label="模型" disabled></select></label>`;
  const form = openEditor(
    self ? "建立引迹自身监测" : "新建监测项",
    fields,
    async (f) => {
      const { id } = await api("monitors", Object.fromEntries(new FormData(f)));
      await onSave(id);
    },
    "保存监测项",
  );
  form.id = "create";
  form.elements.channel.value = channel;
  function showModels() {
    const choices = models[form.elements.channel.value] || [];
    const picker = form.elements.model;
    picker.replaceChildren(...choices.map((id) => new Option(id, id)));
    picker.disabled = !choices.length;
    form.querySelector("#model-field").hidden = picker.disabled;
  }
  form.elements.channel.onchange = showModels;
  showModels();
  if (self) {
    form.elements.brand.value = "CiteGauge";
    form.elements.aliases.value = "引迹";
    if (location.hostname.includes(".") && !/^\d+\./.test(location.hostname))
      form.elements.domain.value = location.hostname;
    form.elements.question.value = "有哪些开源的中文 GEO 监测工具？";
  }
}
