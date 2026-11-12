export const $ = (id) => document.getElementById(id);
export const clean = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch],
  );
export const icon = (name) =>
  `<svg class="bi" aria-hidden="true"><use href="/vendor/icons.svg#${name}"></use></svg>`;
export const percent = (n, d) => (d ? Math.round((100 * n) / d) + "%" : "—");
export const fraction = (n, d) => n + " / " + d;
export function status(message) {
  $("status").textContent = message;
  const note = $("dialog-note");
  if (note) note.textContent = message;
}
export function action(fn) {
  return async (event) => {
    event.preventDefault();
    const current = event.currentTarget;
    const button =
      current.tagName === "FORM"
        ? current.querySelector('button[type="submit"]')
        : current;
    if (button) button.disabled = true;
    try {
      status("");
      await fn(event);
    } catch (error) {
      status(error.message);
    } finally {
      if (button) button.disabled = false;
    }
  };
}
export function openEditor(title, fields, save, label) {
  const dialog = $("editor");
  dialog.innerHTML = `<form><div class="dialog-head"><h2 id="dialog-title">${clean(title)}</h2>
    <button type="button" aria-label="关闭" class="btn-close"></button></div>${fields}
    <p role="status" id="dialog-note"></p><button type="submit" class="btn btn-primary">${clean(label)}</button></form>`;
  dialog.querySelector(".btn-close").onclick = () => dialog.close();
  const form = dialog.querySelector("form");
  form.onsubmit = action(async () => {
    await save(form);
    dialog.close();
  });
  dialog.showModal();
  return form;
}
