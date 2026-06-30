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
const defaultKaminosNativeFrameUrl = '/kaminos-hand-control/hand-control-native-frame';
const defaultKaminosSidecarLaunchUrl = '/kaminos-hand-control/hand-control-sidecar-launch';
const packetUrl = useFixture ? null : (params.get('hand_packet_url') ?? params.get('kaminos_hand_endpoint') ?? defaultKaminosPacketUrl);
const kaminosNativeFrameUrl = useFixture ? null : (params.get('kaminos_native_frame_url') ?? defaultKaminosNativeFrameUrl);
const kaminosSidecarLaunchUrl = useFixture ? null : (params.get('kaminos_sidecar_launch_url') ?? defaultKaminosSidecarLaunchUrl);
const packetPollMs = Math.max(30, Number(params.get('packet_poll_ms') ?? 45));
const framePostMs = Math.max(45, Number(params.get('frame_post_ms') ?? 60));
const sidecarPollMs = Math.max(10, Number(params.get('sidecar_poll_ms') ?? 30));
const sidecarHandConf = Number(params.get('hand_conf') ?? 0.18);
const sidecarIncludeVertices = params.get('include_vertices') === '1';
const encodedFrameWidth = Math.max(160, Number(params.get('frame_width') ?? 320));
const postKaminosFrames = params.get('post_kaminos_frames') !== '0';
const lermsClientBuild = 'lerms-hand-surface-live-20260630';
const video = document.createElement('video');
const frameCanvas = document.createElement('canvas');
const frameContext = frameCanvas.getContext('2d', { alpha: false, willReadFrequently: false });
let videoReady = false;
let webcamSource: WebcamTruth['source'] = 'missing';
let webcamError: string | null = null;
let latestPacket: WilorHandPacket | KaminosHandEventCache = createFixtureWilorHandPacket({
  effectiveRoute: packetUrl ? 'kaminos_live_waiting_for_packet' : 'wilor_hand_surface_synthetic_fixture',
  sourceBackend: packetUrl ? 'kaminos_live_waiting_for_packet' : 'wilor_hand_surface_synthetic_fixture',
  timestampMs: performance.now(),
});
let latestFetchError: string | null = null;
let latestFramePostError: string | null = null;
let latestFramePostStatus: string | null = null;
let latestSidecarStatus: string | null = null;
let postedFrameCount = 0;

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
    if (kaminosSidecarLaunchUrl) {
      void launchKaminosSidecar(kaminosSidecarLaunchUrl);
    }
    if (postKaminosFrames && kaminosNativeFrameUrl) {
      void postKaminosNativeFrameLoop(kaminosNativeFrameUrl);
    }
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
    await new Promise((resolve) => window.setTimeout(resolve, packetPollMs));
  }
}

async function launchKaminosSidecar(url: string): Promise<void> {
  try {
    const launchParams = new URLSearchParams({
      poll_ms: String(sidecarPollMs),
      hand_conf: String(sidecarHandConf),
      include_vertices: sidecarIncludeVertices ? '1' : '0',
    });
    const response = await fetch(`${url}?${launchParams.toString()}`, { method: 'POST' });
    const body = await response.json().catch(() => null) as { running?: boolean; effective_config?: { include_vertices?: boolean } } | null;
    if (!response.ok) throw new Error(`sidecar launch failed ${response.status}`);
    latestSidecarStatus = `sidecar ${body?.running ? 'running' : 'launched'} vertices ${body?.effective_config?.include_vertices ? 'on' : 'off'}`;
  } catch (error) {
    latestSidecarStatus = `sidecar_launch ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function postKaminosNativeFrameLoop(url: string): Promise<void> {
  while (true) {
    if (videoReady) {
      await postKaminosNativeFrame(url);
    }
    await new Promise((resolve) => window.setTimeout(resolve, framePostMs));
  }
}

async function postKaminosNativeFrame(url: string): Promise<void> {
  if (!frameContext || video.videoWidth <= 0 || video.videoHeight <= 0) return;
  const encodedWidth = Math.min(encodedFrameWidth, video.videoWidth);
  const encodedHeight = Math.max(1, Math.round((encodedWidth / video.videoWidth) * video.videoHeight));
  frameCanvas.width = encodedWidth;
  frameCanvas.height = encodedHeight;
  frameContext.drawImage(video, 0, 0, encodedWidth, encodedHeight);
  const blob = await new Promise<Blob | null>((resolve) => {
    frameCanvas.toBlob(resolve, 'image/jpeg', 0.55);
  });
  if (!blob) {
    latestFramePostError = 'frame encode failed';
    return;
  }
  const frameId = String(++postedFrameCount);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Kaminos-Hand-Surface-Client-Build': lermsClientBuild,
        'X-Capture-Timestamp-Ms': String(performance.now()),
        'X-Capture-Epoch-Ms': String(Date.now()),
        'X-Frame-Id': frameId,
        'X-Source-Video-Width': String(video.videoWidth),
        'X-Source-Video-Height': String(video.videoHeight),
        'X-Encoded-Frame-Width': String(encodedWidth),
        'X-Encoded-Frame-Height': String(encodedHeight),
      },
      body: blob,
    });
    if (!response.ok) throw new Error(`native frame post failed ${response.status}`);
    latestFramePostStatus = `posted frame ${frameId} ${encodedWidth}x${encodedHeight}`;
    latestFramePostError = null;
  } catch (error) {
    latestFramePostError = error instanceof Error ? error.message : String(error);
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
    latestSidecarStatus,
    latestFramePostStatus,
    latestFramePostError ? `frame_post ${latestFramePostError}` : null,
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
