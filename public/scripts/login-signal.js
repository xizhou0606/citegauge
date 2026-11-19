// An illustrative signal surface. Geometry is independent of workspace data.
const canvas = document.getElementById("signal-field");
const context = canvas.getContext("2d");
if (context) mountSignal(canvas, context);

function mountSignal(canvas, ctx) {
  const button = document.getElementById("signal-motion");
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const rows = 64, columns = 104;
  let playing = !preference.matches;
  let width, height, ink, frame, previous, phase = 0;

  const mesh = Array.from({ length: rows }, (_, row) => {
    const z = row / (rows - 1);
    return Array.from({ length: columns }, (_, col) => {
      const x = col / (columns - 1) * 1.4 - .2;
      const ridge = .29 + .15 * Math.cos(x * 8) + .17 * x;
      const slope = Math.exp(-((z - ridge) ** 2) / .034);
      const peak = .22 + .34 * Math.exp(-((x - .63) ** 2) / .029)
        + .13 * Math.sin(x * 9) + .04 * Math.sin(x * 19);
      return {
        x: x + .15 * (z - .5),
        y: .48 + .44 * z - slope * peak + .025 * Math.sin(x * 11 + z * 6),
        amplitude: .011 + slope * .032,
        angle: x * 7 + z * 6,
      };
    });
  });

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = width > 380 ? 1.15 : .8;
    ctx.strokeStyle = ink;
    for (const [row, points] of mesh.entries()) {
      ctx.beginPath();
      for (const [col, point] of points.entries()) {
        const y = height * (point.y + point.amplitude * Math.sin(phase + point.angle));
        if (!col) ctx.moveTo(point.x * width, y);
        else ctx.lineTo(point.x * width, y);
      }
      ctx.globalAlpha = .3 + .64 * Math.sin(Math.PI * row / rows);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ink = ctx.createLinearGradient(0, 0, width, height * .3);
    ink.addColorStop(0, "#79a68a");
    ink.addColorStop(.36, "#f8e7a1");
    ink.addColorStop(.65, "#b4ceb1");
    ink.addColorStop(.86, "#8ac8b7");
    ink.addColorStop(1, "#fcdaa3");
    draw();
  }

  function tick(now) {
    if (previous === undefined) previous = now;
    if (now - previous >= 40) {
      phase += Math.min(now - previous, 100) * .00078;
      previous = now;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame);
    previous = undefined;
    button.dataset.playing = String(playing);
    button.setAttribute("aria-label", playing ? "暂停动画" : "播放动画");
    if (playing && !document.hidden) frame = requestAnimationFrame(tick);
  }

  resize();
  new ResizeObserver(resize).observe(canvas);
  button.hidden = false;
  button.addEventListener("click", () => {
    playing = !playing;
    sync();
  });
  preference.addEventListener("change", () => {
    playing = !preference.matches;
    sync();
  });
  document.addEventListener("visibilitychange", sync);
  sync();
}
