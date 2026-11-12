import { requestJSON } from "./core/api.js";
import { drawSignal } from "./components/signal-field.js";

const canvas = document.getElementById("signal-field");
const observer = new ResizeObserver(() => drawSignal(canvas));
observer.observe(canvas);
const password = document.getElementById("password");
const reveal = document.getElementById("reveal");
reveal.onclick = () => {
  const visible = password.type === "password";
  password.type = visible ? "text" : "password";
  reveal.textContent = visible ? "隐藏" : "显示";
  reveal.setAttribute("aria-label", visible ? "隐藏密码" : "显示密码");
  reveal.setAttribute("aria-pressed", String(visible));
};
const form = document.getElementById("login-form"),
  error = document.getElementById("login-error");
form.onsubmit = async (event) => {
  event.preventDefault();
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  error.hidden = true;
  try {
    await requestJSON("/api/auth/sign-in/username", {
      username: form.elements.username.value.trim(),
      password: password.value,
    });
    form.reset();
    location.replace("/workspace");
  } catch (e) {
    error.textContent = e.message;
    error.hidden = false;
    password.focus();
    submit.disabled = false;
  }
};
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});
