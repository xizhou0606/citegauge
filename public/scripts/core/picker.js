import { clean } from "./ui.js";

export function picker(root, label, options, value, change, empty = "暂无选项") {
  const active = options.find((o) => o.value === value);
  root.innerHTML = `<button type="button" class="btn btn-light btn-sm dropdown-toggle"
    data-bs-toggle="dropdown" aria-expanded="false" aria-label="${clean(label + " · " + (active?.text || empty))}"
    ${options.length ? "" : "disabled"}>${clean(active?.text || empty)}</button>
    <div class="dropdown-menu">${options.map((o) => `<button class="dropdown-item ${o.value === value ? "active" : ""}"
      type="button" data-value="${clean(o.value)}" ${o.value === value ? 'aria-current="true"' : ""}>${clean(o.text)}</button>`).join("")}</div>`;
  root.onclick = (e) => {
    const option = e.target.closest("[data-value]");
    if (option) change(option.dataset.value);
  };
}
