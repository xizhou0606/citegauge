import "./core/validation.js";
import { requestJSON } from "./core/api.js";
const password = document.getElementById("password");
const reveal = document.getElementById("reveal");
reveal.onclick = () => {
  const visible = password.type === "password";
  password.type = visible ? "text" : "password";
  reveal.setAttribute("aria-label", visible ? "隐藏密码" : "显示密码");
  reveal.setAttribute("aria-pressed", String(visible));
};
const form = document.getElementById("login-form"),
  error = document.getElementById("login-error");
form.onsubmit = async (event) => {
  event.preventDefault();
  const submit = form.querySelector('[type="submit"]');
  if (submit.disabled) return;
  submit.disabled = true;
  submit.setAttribute("aria-busy", "true");
  submit.querySelector("span").textContent = "正在登录…";
  error.hidden = true;
  try {
    await requestJSON("/api/auth/sign-in/username", {
      username: form.elements.username.value.trim(),
      password: password.value,
    });
    form.reset();
    sessionStorage.removeItem("cg-selection");
    if (new URLSearchParams(location.search).get("next") === "projects") {
      location.replace("/admin/projects");
      return;
    }
    location.replace(location.hash === "#monitoring" ? "/workspace#monitoring" : "/workspace");
  } catch (e) {
    error.textContent = e.message;
    error.hidden = false;
    password.focus();
    submit.disabled = false;
    submit.removeAttribute("aria-busy");
    submit.querySelector("span").textContent = "登录工作台";
  }
};
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});
