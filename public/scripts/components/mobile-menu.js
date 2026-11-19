const toggle = document.getElementById("rail-menu-toggle");
const rail = toggle.closest(".rail");
const set = open => toggle.setAttribute("aria-expanded",String(open));
toggle.addEventListener("click", () => set(toggle.getAttribute("aria-expanded") !== "true"));
document.addEventListener("click", e => {
  if (!rail.contains(e.target) || e.target.closest(".feature-link")) set(false);
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
    set(false);
    toggle.focus();
  }
});
matchMedia("(max-width:680px)").addEventListener("change", () => set(false));
