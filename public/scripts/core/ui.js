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
  const trigger = document.activeElement;
  const modal = window.bootstrap.Modal.getOrCreateInstance(dialog);
  dialog.querySelector(".modal-content").innerHTML = `<div class="modal-header">
    <h2 class="modal-title fs-5" id="dialog-title">${clean(title)}</h2>
    <button type="button" aria-label="关闭" class="btn-close" data-bs-dismiss="modal"></button></div>
    <form><div class="modal-body">${fields}<p role="status" id="dialog-note"></p></div>
    <div class="modal-footer"><button type="submit" class="btn btn-primary">${clean(label)}</button></div></form>`;
  const form = dialog.querySelector("form");
  form.onsubmit = action(async () => {
    await save(form);
    modal.hide();
  });
  dialog.addEventListener("shown.bs.modal", () => {
    const first = form.querySelector("input:not(:disabled),textarea:not(:disabled),button:not(:disabled)");
    (first || dialog.querySelector(".btn-close")).focus();
  }, { once: true });
  dialog.addEventListener("hidden.bs.modal", () => trigger?.focus(), { once: true });
  modal.show();
  return form;
}
