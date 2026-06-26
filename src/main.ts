const canvas = document.getElementById('lerms-canvas') as HTMLCanvasElement | null;

if (!canvas) {
  throw new Error('missing lerms canvas');
}

const context = canvas.getContext('2d');

if (!context) {
  throw new Error('2d canvas unavailable');
}

const appCanvas = canvas;
const ctx = context;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  appCanvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
  appCanvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
  appCanvas.style.width = '100vw';
  appCanvas.style.height = '100vh';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function render(timestampMs: number): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const t = timestampMs / 1000;

  ctx.fillStyle = '#020606';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(107, 228, 200, 0.22)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 9; i += 1) {
    const y = height * (0.22 + i * 0.08);
    ctx.beginPath();
    for (let x = 0; x <= width; x += 18) {
      const wave = Math.sin(x * 0.006 + t * 0.18 + i) * 18;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(134, 239, 207, 0.85)';
  ctx.font = '16px monospace';
  ctx.fillText('LERMS: glove wealth under construction', 24, 36);
  ctx.fillStyle = 'rgba(255, 214, 108, 0.82)';
  ctx.fillText('perceptasia remains the live smoke surface', 24, 60);

  window.requestAnimationFrame(render);
}

resize();
window.addEventListener('resize', resize);
window.requestAnimationFrame(render);
