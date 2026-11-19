// Keep the browser's constraint checks and present the first error inside its form.
function clearError(form) {
  const message = form.querySelector("[data-field-error]");
  if (!message) return;
  const field = form.querySelector('[aria-errormessage="' + message.id + '"]');
  field?.removeAttribute("aria-invalid");
  field?.removeAttribute("aria-errormessage");
  message.remove();
}

let nextId = 0;
document.addEventListener("invalid", event => {
  const field = event.target;
  const form = field.form;
  if (!form) return;
  event.preventDefault();
  if (field !== form.querySelector(":is(input,textarea,select):invalid")) return;
  clearError(form);
  const message = document.createElement("p");
  message.dataset.fieldError = "";
  message.id = "field-error-" + ++nextId;
  message.setAttribute("role","alert");
  const name = field.labels?.[0]?.textContent.trim() || field.placeholder || "此字段";
  message.textContent = field.validity.valueMissing ? "请填写" + name :
    field.validity.typeMismatch && field.type === "url" ? "请输入包含 https:// 或 http:// 的完整网址。" :
    field.validity.patternMismatch ? "请检查" + name + "的格式。" : field.validationMessage;
  field.setAttribute("aria-invalid","true");
  field.setAttribute("aria-errormessage",message.id);
  form.append(message);
  field.focus();
}, true);
for (const type of ["input","change","reset"]) {
  document.addEventListener(type,event=>{
    const form = event.target.form || event.target.closest?.("form");
    if (form && (type==="reset" || event.target.hasAttribute("aria-errormessage") && event.target.validity?.valid)) clearError(form);
  });
}
