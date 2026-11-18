document.addEventListener("invalid", (event) => {
  const field = event.target;
  if (!field.form) return;
  event.preventDefault();
  field.form.classList.add("was-validated");
  const id = (field.id || field.name) + "-feedback";
  let feedback = field.form.querySelector("#" + CSS.escape(id));
  if (!feedback) {
    feedback = document.createElement("span");
    feedback.id = id;
    feedback.className = "invalid-feedback";
    field.insertAdjacentElement("afterend", feedback);
    field.setAttribute("aria-describedby", [field.getAttribute("aria-describedby"), id].filter(Boolean).join(" "));
  }
  feedback.textContent = field.validationMessage;
  if (field === field.form.querySelector(":invalid")) field.focus();
}, true);
