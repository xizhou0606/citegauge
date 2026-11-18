import "./core/validation.js";
const form = document.getElementById("site-entry");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  try { sessionStorage.setItem("cg-website", form.elements.website.value.trim()); } catch {}
  location.assign("/workspace");
});
