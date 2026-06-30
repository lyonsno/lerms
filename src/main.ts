import {
  composeHandSurfaceLerms,
  createFixtureWilorHandPacket,
  HAND_SURFACE_FACES,
  type HandSurfaceReport,
  type KaminosHandEventCache,
  type Vec2,
  type WebcamTruth,
  type WilorHandPacket,
} from './hand-surface-lerms';

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
const params = new URLSearchParams(window.location.search);
const requestedRoute = params.get('hand_surface_route') ?? 'native_wilor_mini_mlx_detector_sidecar_live';
const useFixture = params.get('fixture') === '1';
const defaultKaminosPacketUrl = '/kaminos-hand-control/hand-control-sidecar-event';
const packetUrl = useFixture ? null : (params.get('hand_packet_url') ?? params.get('kaminos_hand_endpoint') ?? defaultKaminosPacketUrl);
const video = document.createElement('video');
let videoReady = false;
let webcamSource: WebcamTruth['source'] = 'missing';
let webcamError: string | null = null;
let latestPacket: WilorHandPacket | KaminosHandEventCache = createFixtureWilorHandPacket({
  effectiveRoute: packetUrl ? 'kaminos_live_waiting_for_packet' : 'wilor_hand_surface_synthetic_fixture',
  sourceBackend: packetUrl ? 'kaminos_live_waiting_for_packet' : 'wilor_hand_surface_synthetic_fixture',
  timestampMs: performance.now(),
});
let latestFetchError: string | null = null;

video.muted = true;
video.autoplay = true;
video.playsInline = true;

void startWebcam();
if (packetUrl) {
  void fetchPacketLoop(packetUrl);
}

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
  const nowMs = performance.now();
  if (!packetUrl) {
    latestPacket = createFixtureWilorHandPacket({
      effectiveRoute: 'wilor_hand_surface_synthetic_fixture',
      sourceBackend: 'wilor_hand_surface_synthetic_fixture',
      timestampMs: nowMs,
      palmNormal: { x: 0.05, y: Math.sin(timestampMs / 1300) * 0.26, z: Math.cos(timestampMs / 1900) * 0.94 },
    });
  }
  const report = composeHandSurfaceLerms(latestPacket, {
    requestedRoute,
    nowMs,
    maxFreshnessMs: 180,
    webcam: currentWebcamTruth(width, height),
    attachmentMode: 'hand_surface',
    lermAnchors: [
      { id: 'red-lerm-palm', face: [0, 5, 9], barycentric: [0.22, 0.34, 0.44], behaviorHint: 'cling' },
      { id: 'yellow-lerm-index', face: [5, 6, 10], barycentric: [0.18, 0.48, 0.34], behaviorHint: 'finger_walk' },
      { id: 'blue-lerm-ring', face: [13, 14, 18], barycentric: [0.24, 0.46, 0.3], behaviorHint: 'curious' },
    ],
    moge: { requested: params.get('moge') === '1', effectiveRoute: null, ageMs: null },
    requestedEndpoint: packetUrl ?? undefined,
    effectiveEndpoint: packetUrl ? effectiveKaminosEndpoint(packetUrl) : undefined,
  });
  drawGroundTruth(width, height, timestampMs);
  drawHandSurface(report, width, height);
  drawReceipt(report, width, height);

  window.__lermsHandSurfaceWitness = report;

  window.requestAnimationFrame(render);
}

resize();
window.addEventListener('resize', resize);
window.requestAnimationFrame(render);

declare global {
  interface Window {
    __lermsHandSurfaceWitness?: HandSurfaceReport;
  }
}

async function startWebcam(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    webcamError = 'getUserMedia unavailable';
    webcamSource = 'missing';
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    video.srcObject = stream;
    await video.play();
    webcamSource = 'live_webcam';
    videoReady = true;
  } catch (error) {
    webcamError = error instanceof Error ? error.message : String(error);
    webcamSource = 'missing';
    videoReady = false;
  }
}

async function fetchPacketLoop(url: string): Promise<void> {
  while (true) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`packet fetch failed ${response.status}`);
      latestPacket = await response.json() as WilorHandPacket | KaminosHandEventCache;
      latestFetchError = null;
    } catch (error) {
      latestFetchError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
}

function currentWebcamTruth(width: number, height: number): WebcamTruth {
  return {
    source: videoReady ? webcamSource : 'synthetic_fixture',
    visible: true,
    blank: false,
    frameId: videoReady ? `webcam-video-${Math.floor(performance.now())}` : 'synthetic-webcam-gradient',
    width,
    height,
  };
}

function drawGroundTruth(width: number, height: number, timestampMs: number): void {
  if (videoReady && video.videoWidth > 0 && video.videoHeight > 0) {
    const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
    const drawWidth = video.videoWidth * scale;
    const drawHeight = video.videoHeight * scale;
    ctx.drawImage(video, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#263a4e');
  gradient.addColorStop(0.48, '#a87862');
  gradient.addColorStop(1, '#101318');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const sway = Math.sin(timestampMs / 1000) * 24;
  ctx.fillStyle = 'rgba(229, 180, 145, 0.62)';
  ctx.strokeStyle = 'rgba(255, 229, 204, 0.58)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(width * 0.18 + sway, height * 0.9);
  ctx.bezierCurveTo(width * 0.26 + sway, height * 0.46, width * 0.45 + sway, height * 0.29, width * 0.71 + sway, height * 0.46);
  ctx.bezierCurveTo(width * 0.86 + sway, height * 0.58, width * 0.77 + sway, height * 0.82, width * 0.55 + sway, height * 0.88);
  ctx.bezierCurveTo(width * 0.39 + sway, height * 0.94, width * 0.26 + sway, height * 0.96, width * 0.18 + sway, height * 0.9);
  ctx.fill();
  ctx.stroke();
}

function drawHandSurface(report: HandSurfaceReport, width: number, height: number): void {
  if (report.surfaceFrame.status !== 'valid') return;

  ctx.save();
  ctx.lineWidth = 1.2;
  for (const face of HAND_SURFACE_FACES.slice(0, 16)) {
    const points = face.map((index) => report.surfaceFrame.landmarks2d[index]).filter(Boolean);
    if (points.length !== 3) continue;
    ctx.beginPath();
    points.forEach((point, index) => {
      const x = point.x * width;
      const y = point.y * height;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(76, 233, 188, 0.18)';
    ctx.strokeStyle = 'rgba(226, 255, 238, 0.52)';
    ctx.fill();
    ctx.stroke();
  }

  for (const attachment of report.attachments) {
    if (attachment.mode !== 'hand_surface') continue;
    drawLerm(attachment.id, attachment.screen, attachment.behavior, width, height);
  }
  ctx.restore();
}

function drawLerm(id: string, screen: Vec2, behavior: string, width: number, height: number): void {
  const x = screen.x * width;
  const y = screen.y * height;
  const pulse = behavior === 'finger_walk' ? 1.12 : behavior === 'curious' ? 0.92 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(behavior === 'slide' ? 0.38 : -0.16);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = id.includes('yellow') ? '#f6d95f' : id.includes('blue') ? '#5aa8f5' : '#e95a4d';
  ctx.strokeStyle = '#20100a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#140a07';
  ctx.beginPath();
  ctx.arc(8, -2, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-12, 5);
  ctx.quadraticCurveTo(-2, 14, 12, 5);
  ctx.stroke();
  ctx.restore();
}

function drawReceipt(report: HandSurfaceReport, width: number, height: number): void {
  const panelWidth = Math.min(520, Math.max(360, width * 0.44));
  const x = width - panelWidth;
  ctx.fillStyle = 'rgba(8, 14, 13, 0.82)';
  ctx.fillRect(x, 0, panelWidth, height);
  ctx.fillStyle = '#e8f4e8';
  ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
  const lines = [
    `authority ${report.authority}`,
    `requested ${report.routeTruth.requestedRoute}`,
    `effective ${report.routeTruth.effectiveRoute}`,
    `backend ${report.routeTruth.backendIdentity}`,
    `endpoint ${report.routeTruth.endpoint.effective ?? 'none'}`,
    report.routeTruth.kaminosCache.sequence === null
      ? null
      : `cache seq ${report.routeTruth.kaminosCache.sequence} age ${report.routeTruth.kaminosCache.ageMs ?? 'unknown'}ms`,
    `freshness ${report.freshness.status} age ${report.freshness.ageMs ?? 'unknown'}ms`,
    `webcam ${report.webcam.status}`,
    `surface ${report.surfaceFrame.status} landmarks ${report.surfaceFrame.landmarks2d.length}`,
    `moge ${report.moge.status}`,
    latestFetchError ? `packet_fetch ${latestFetchError}` : null,
    webcamError ? `webcam ${webcamError}` : null,
    ...report.downgrades.map((entry) => `downgrade ${entry.code}`),
  ].filter((line): line is string => Boolean(line));

  lines.slice(0, Math.floor(height / 18) - 1).forEach((line, index) => {
    ctx.fillText(line, x + 18, 28 + index * 18);
  });
}

function effectiveKaminosEndpoint(url: string): string {
  if (url.startsWith('/kaminos-hand-control/')) {
    return `http://127.0.0.1:8096/${url.slice('/kaminos-hand-control/'.length)}`;
  }
  return url;
}
