document.addEventListener("invalid", event => {
  event.target.setAttribute("aria-invalid", "true");
}, true);
document.addEventListener("input", event => {
  if (event.target.validity?.valid) event.target.removeAttribute("aria-invalid");
});
