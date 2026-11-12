// Decorative wave field. Its contours are drawn in projected coordinates.
export function drawSignal(canvas) {
  const width = canvas.clientWidth,
    height = canvas.clientHeight;
  if (!width || !height) return;
  const density = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * density);
  canvas.height = Math.round(height * density);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(density, density);
  const zoom = Math.min(width / 640, height / 500);
  ctx.translate(width * 0.53, height * 0.55);
  ctx.scale(zoom, zoom);
  for (let row = -63; row <= 66; row++) {
    const y = row / 37;
    ctx.beginPath();
    for (let column = -85; column <= 85; column++) {
      const x = column / 38;
      const ridge = 1.31 * Math.exp(-1.7 * ((x + 0.48) ** 2 + (y - 0.08) ** 2));
      const crest = 0.9 * Math.exp(-2.2 * ((x - 0.85) ** 2 + (y + 0.25) ** 2));
      const wave =
        0.23 * Math.sin(4 * x - 2.8 * y) * Math.exp(-0.49 * (x * x + y * y));
      const z = ridge + crest + wave;
      const px = 122 * x - 61 * y,
        py = 36 * x + 58 * y - 145 * z;
      if (column === -85) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    const strength = Math.exp(-1.05 * y * y);
    ctx.strokeStyle = `rgba(${Math.round(100 + 116 * strength)},${Math.round(162 + 78 * strength)},${Math.round(143 - 51 * strength)},${0.22 + 0.68 * strength})`;
    ctx.lineWidth = 0.75 + strength * 0.48;
    ctx.stroke();
  }
}
