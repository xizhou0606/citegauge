export const $ = (id) => document.getElementById(id);
export const percent = (n, d) => (d ? Math.round((100 * n) / d) + "%" : "—");
export function status(message) {
  $("status").textContent = message;
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
