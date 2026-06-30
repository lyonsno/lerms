import {
  buildGloveWellBrowserSmokeState,
  buildInitialGloveWellBrowserSmokeState,
  type BrowserSmokeCacheSnapshot,
  type BrowserSmokePoint,
  type BrowserSmokeState
} from './glove-well-browser-smoke-state.js';

interface SmokeRuntime {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  status: HTMLElement;
  captureButton: HTMLButtonElement;
  endpoint: string;
  state: BrowserSmokeState;
  lastCache: BrowserSmokeCacheSnapshot | null;
  lastFetchError: string | null;
  capture: SmokeCaptureStatus;
}

interface SmokeCaptureStatus {
  state: 'idle' | 'starting' | 'running' | 'complete' | 'failed';
  outDir: string | null;
  reportPath: string | null;
  filmstripPath: string | null;
  error: string | null;
}

export function mountGloveWellBrowserSmoke(root: HTMLElement): void {
  root.innerHTML = '';
  root.className = 'glove-well-smoke-root';

  const endpoint = new URLSearchParams(window.location.search).get('kaminosEndpoint') ?? '/kaminos-hand-control-sidecar-event';
  const canvas = document.createElement('canvas');
  canvas.id = 'glove-well-smoke-canvas';
  canvas.setAttribute('aria-label', 'Glove Well live smoke canvas');

  const handFrame = document.createElement('iframe');
  handFrame.className = 'kaminos-hand-frame';
  handFrame.title = 'Kaminos Live Hand';
  handFrame.src = 'http://127.0.0.1:8096/hand-surface-compositor-demo.html?fixture=0';
  handFrame.allow = 'camera; fullscreen';

  const status = document.createElement('pre');
  status.className = 'glove-well-smoke-status';

  const controls = document.createElement('nav');
  controls.className = 'glove-well-smoke-controls';

  const handLink = document.createElement('a');
  handLink.href = handFrame.src;
  handLink.target = '_blank';
  handLink.rel = 'noreferrer';
  handLink.textContent = 'Live Hand';

  const hillLink = document.createElement('a');
  hillLink.href = '/';
  hillLink.textContent = 'Hill';

  const captureButton = document.createElement('button');
  captureButton.className = 'glove-well-capture-button';
  captureButton.type = 'button';
  captureButton.textContent = 'Capture';

  controls.append(captureButton, handLink, hillLink);
  root.append(canvas, handFrame, status, controls);

  const ctx = requireCanvasContext(canvas);
  const runtime: SmokeRuntime = {
    canvas,
    ctx,
    status,
    captureButton,
    endpoint,
    state: buildInitialGloveWellBrowserSmokeState(endpoint),
    lastCache: null,
    lastFetchError: null,
    capture: {
      state: 'idle',
      outDir: null,
      reportPath: null,
      filmstripPath: null,
      error: null
    }
  };

  installSmokeStyles();
  resize(runtime);
  captureButton.addEventListener('click', () => {
    void startCapture(runtime);
  });
  window.addEventListener('resize', () => resize(runtime));
  window.setInterval(() => {
    void pollKaminos(runtime);
  }, 120);
  window.setInterval(() => {
    void pollCaptureStatus(runtime);
  }, 1200);
  void pollKaminos(runtime);
  void pollCaptureStatus(runtime);
  window.requestAnimationFrame((timestampMs) => render(runtime, timestampMs));
}

async function pollKaminos(runtime: SmokeRuntime): Promise<void> {
  try {
    const url = new URL(runtime.endpoint, window.location.origin);
    if (runtime.state.source.sequence !== null) {
      url.searchParams.set('after', String(runtime.state.source.sequence));
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    runtime.lastCache = (await response.json()) as BrowserSmokeCacheSnapshot;
    runtime.lastFetchError = null;
  } catch (error) {
    runtime.lastFetchError = error instanceof Error ? error.message : String(error);
    runtime.lastCache = null;
  }

  runtime.state = buildGloveWellBrowserSmokeState({
    previous: runtime.state,
    cache: runtime.lastCache,
    nowMs: performance.now(),
    endpoint: runtime.endpoint
  });
  if (runtime.lastFetchError) {
    runtime.state = {
      ...runtime.state,
      authority: 'invalid',
      statusCode: 'invalid',
      downgrades: ['kaminos_event_cache_fetch_failed'],
      lastError: runtime.lastFetchError
    };
  }
}

function render(runtime: SmokeRuntime, timestampMs: number): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const state = runtime.state;
  const ctx = runtime.ctx;

  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height, timestampMs);
  drawGloveWell(ctx, width, height, state);
  drawHand(ctx, width, height, state);
  drawAim(ctx, width, height, state);
  drawGoins(ctx, width, height, state);
  drawLerms(ctx, width, height, state);
  updateStatus(runtime);

  window.requestAnimationFrame((nextMs) => render(runtime, nextMs));
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, timestampMs: number): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#071111');
  gradient.addColorStop(0.52, '#142019');
  gradient.addColorStop(1, '#0c171e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(228, 210, 145, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 18; i += 1) {
    const y = height * 0.18 + i * height * 0.048 + Math.sin(timestampMs * 0.0005 + i) * 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(width * 0.28, y + 22, width * 0.68, y - 22, width, y + 8);
    ctx.stroke();
  }
}

function drawGloveWell(ctx: CanvasRenderingContext2D, width: number, height: number, state: BrowserSmokeState): void {
  const x = width * 0.18;
  const y = height * 0.65;
  const radius = Math.max(48, Math.min(width, height) * 0.09);

  ctx.fillStyle = '#151b18';
  ctx.beginPath();
  ctx.ellipse(x, y + radius * 0.42, radius * 1.35, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = statusColor(state);
  ctx.lineWidth = 4;
  ctx.stroke();

  const fill = ctx.createRadialGradient(x - radius * 0.2, y - radius * 0.1, radius * 0.1, x, y, radius);
  fill.addColorStop(0, '#ffe789');
  fill.addColorStop(0.55, '#c6a646');
  fill.addColorStop(1, '#715d2f');
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.72, 0, Math.PI * 2);
  ctx.fill();

  if (state.phase === 'priming' || state.phase === 'aiming') {
    const hand = pointToCanvas(state.hand.palmCenter ?? { x: 0.5, y: 0.5 }, width, height);
    ctx.strokeStyle = 'rgba(255, 231, 137, 0.55)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo((x + hand.x) * 0.5, y - radius * 1.2, hand.x, hand.y);
    ctx.stroke();
  }
}

function drawHand(ctx: CanvasRenderingContext2D, width: number, height: number, state: BrowserSmokeState): void {
  const points = [state.hand.palmCenter, state.hand.thumbTip, state.hand.indexTip, state.hand.pinkyBase, state.hand.pinkyTip].filter(
    (point): point is BrowserSmokePoint => Boolean(point)
  );
  if (!points.length) return;

  ctx.fillStyle = 'rgba(130, 226, 190, 0.92)';
  for (const point of points) {
    const p = pointToCanvas(point, width, height);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.hand.thumbTip && state.hand.indexTip) {
    const thumb = pointToCanvas(state.hand.thumbTip, width, height);
    const index = pointToCanvas(state.hand.indexTip, width, height);
    ctx.strokeStyle = state.hand.pinchActive ? '#ffe789' : 'rgba(130, 226, 190, 0.35)';
    ctx.lineWidth = state.hand.pinchActive ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(thumb.x, thumb.y);
    ctx.lineTo(index.x, index.y);
    ctx.stroke();
  }
}

function drawAim(ctx: CanvasRenderingContext2D, width: number, height: number, state: BrowserSmokeState): void {
  if (!state.aim.active && state.phase !== 'released') return;
  ctx.fillStyle = '#dfe7ff';
  state.aim.arcSamples.forEach((sample, index) => {
    const point = pointToCanvas(sample, width, height);
    ctx.globalAlpha = 0.38 + index * 0.08;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4 + index * 0.28, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawGoins(ctx: CanvasRenderingContext2D, width: number, height: number, state: BrowserSmokeState): void {
  const goins = state.goins.length ? state.goins : [state.goin];
  goins.forEach((item) => {
    const goin = pointToCanvas(item.position, width, height);
    const radius = item.state === 'held' ? 13 : 18;

    if (item.desireRadius > 0) {
      ctx.strokeStyle = 'rgba(255, 231, 137, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(goin.x, goin.y, item.desireRadius * Math.min(width, height), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = item.state === 'held' ? '#ffe789' : '#f4c64f';
    ctx.beginPath();
    ctx.ellipse(goin.x, goin.y, radius * 1.18, radius, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a4f19';
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}

function drawLerms(ctx: CanvasRenderingContext2D, width: number, height: number, state: BrowserSmokeState): void {
  const lure = state.goins.find((goin) => goin.state === 'rolling') ?? state.goin;
  const target = pointToCanvas(lure.position, width, height);
  const origins = [
    { x: width * 0.68, y: height * 0.68 },
    { x: width * 0.76, y: height * 0.78 },
    { x: width * 0.6, y: height * 0.82 }
  ];

  origins.forEach((origin, index) => {
    const mix = lure.state === 'rolling' ? 0.32 + index * 0.08 : 0.12;
    const x = origin.x + (target.x - origin.x) * mix;
    const y = origin.y + (target.y - origin.y) * mix;
    ctx.fillStyle = ['#ce4b4b', '#b43d5c', '#e06548'][index] ?? '#ce4b4b';
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    if (lure.state === 'rolling') {
      ctx.strokeStyle = 'rgba(255, 231, 137, 0.48)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
  });
}

function updateStatus(runtime: SmokeRuntime): void {
  const state = runtime.state;
  runtime.status.textContent = [
    `Glove Well Live Smoke`,
    `authority: ${state.authority}`,
    `status: ${state.statusCode}`,
    `phase: ${state.phase}`,
    `sequence: ${state.source.sequence ?? '-'}`,
    `frame: ${state.source.frameId ?? '-'}`,
    `backend: ${state.source.backend ?? '-'}`,
    `route: ${state.source.effectiveRoute ?? '-'}`,
    `age: ${state.source.ageMs ?? '-'} ms`,
    `pinch: ${state.hand.pinchDistance ?? '-'} / ${state.hand.pinchActive ? 'closed' : 'open'}`,
    `goin: ${state.goin.state} / count ${state.goins.length} / releases ${state.releaseCount}`,
    `capture: ${formatCaptureStatus(runtime.capture)}`,
    `downgrades: ${state.downgrades.length ? state.downgrades.join(', ') : 'none'}`,
    `error: ${state.lastError ?? 'none'}`
  ].join('\n');
  runtime.captureButton.disabled = runtime.capture.state === 'starting' || runtime.capture.state === 'running';
  runtime.captureButton.textContent = runtime.capture.state === 'running' ? 'Capturing' : 'Capture';
}

async function startCapture(runtime: SmokeRuntime): Promise<void> {
  runtime.capture = { state: 'starting', outDir: null, reportPath: null, filmstripPath: null, error: null };
  try {
    const response = await fetch('/__lerms/glove-well-capture/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: window.location.href,
        frameCount: 24,
        intervalMs: 300,
        settleMs: 600,
        viewport: `${Math.max(800, window.innerWidth)}x${Math.max(600, window.innerHeight)}`
      })
    });
    const payload = (await response.json()) as Partial<SmokeCaptureStatus> & { ok?: boolean; status?: string };
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error ?? `HTTP ${response.status}`);
    }
    runtime.capture = normalizeCaptureStatus(payload);
  } catch (error) {
    runtime.capture = {
      state: 'failed',
      outDir: null,
      reportPath: null,
      filmstripPath: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function pollCaptureStatus(runtime: SmokeRuntime): Promise<void> {
  try {
    const response = await fetch('/__lerms/glove-well-capture/status');
    if (!response.ok) return;
    runtime.capture = normalizeCaptureStatus((await response.json()) as Partial<SmokeCaptureStatus> & { status?: string });
  } catch {
    if (runtime.capture.state === 'starting' || runtime.capture.state === 'running') {
      runtime.capture = {
        ...runtime.capture,
        state: 'failed',
        error: 'capture status endpoint unavailable'
      };
    }
  }
}

function normalizeCaptureStatus(payload: Partial<SmokeCaptureStatus> & { status?: string }): SmokeCaptureStatus {
  const state = payload.state ?? (payload.status === 'started' ? 'running' : payload.status === 'idle' ? 'idle' : 'idle');
  return {
    state,
    outDir: payload.outDir ?? null,
    reportPath: payload.reportPath ?? null,
    filmstripPath: payload.filmstripPath ?? null,
    error: payload.error ?? null
  };
}

function formatCaptureStatus(status: SmokeCaptureStatus): string {
  const path = status.filmstripPath ?? status.reportPath ?? status.outDir;
  const suffix = status.error ? ` / ${status.error}` : path ? ` / ${path}` : '';
  return `${status.state}${suffix}`;
}

function pointToCanvas(point: BrowserSmokePoint, width: number, height: number): { x: number; y: number } {
  return {
    x: point.x * width,
    y: point.y * height
  };
}

function statusColor(state: BrowserSmokeState): string {
  if (state.authority === 'live_simulation') return '#82e2be';
  if (state.authority === 'fallback') return '#d9a75e';
  if (state.authority === 'synthetic_fixture') return '#d8c46a';
  if (state.authority === 'invalid') return '#e36e6e';
  return '#a4b2c0';
}

function resize(runtime: SmokeRuntime): void {
  const dpr = window.devicePixelRatio || 1;
  runtime.canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
  runtime.canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
  runtime.canvas.style.width = '100vw';
  runtime.canvas.style.height = '100vh';
  runtime.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function requireCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');
  return ctx;
}

function installSmokeStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    .glove-well-smoke-root {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: #071111;
      color: #edf6e8;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #glove-well-smoke-canvas {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
    }
    .kaminos-hand-frame {
      position: fixed;
      right: 14px;
      top: 14px;
      width: min(420px, calc(100vw - 28px));
      height: min(300px, 38vh);
      border: 1px solid rgba(130, 226, 190, 0.38);
      background: #050b0b;
    }
    .glove-well-smoke-status {
      position: fixed;
      left: 14px;
      top: 14px;
      max-width: min(480px, calc(100vw - 28px));
      white-space: pre-wrap;
      margin: 0;
      padding: 12px;
      border: 1px solid rgba(244, 198, 79, 0.28);
      background: rgba(4, 10, 10, 0.78);
      color: #f0f5e8;
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
      backdrop-filter: blur(8px);
    }
    .glove-well-smoke-controls {
      position: fixed;
      right: 14px;
      top: calc(14px + min(300px, 38vh) + 10px);
      display: flex;
      gap: 8px;
    }
    .glove-well-smoke-controls a,
    .glove-well-smoke-controls button {
      color: #06100d;
      background: #82e2be;
      border: 1px solid rgba(255, 255, 255, 0.35);
      padding: 8px 10px;
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
    }
    .glove-well-smoke-controls button:disabled {
      cursor: progress;
      opacity: 0.72;
    }
    @media (max-width: 820px) {
      .kaminos-hand-frame {
        top: auto;
        bottom: 12px;
        height: 30vh;
      }
      .glove-well-smoke-controls {
        top: auto;
        bottom: calc(30vh + 22px);
      }
      .glove-well-smoke-status {
        max-height: 38vh;
        overflow: auto;
      }
    }
  `;
  document.head.append(style);
}
