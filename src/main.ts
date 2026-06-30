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
const handMeshMode = params.get('hand_mesh') === '1';
const defaultKaminosPacketUrl = '/kaminos-hand-control/hand-control-sidecar-event';
const defaultKaminosNativeFrameUrl = '/kaminos-hand-control/hand-control-native-frame';
const defaultKaminosSidecarLaunchUrl = '/kaminos-hand-control/hand-control-sidecar-launch';
const packetUrl = useFixture ? null : (params.get('hand_packet_url') ?? params.get('kaminos_hand_endpoint') ?? defaultKaminosPacketUrl);
const kaminosNativeFrameUrl = useFixture ? null : (params.get('kaminos_native_frame_url') ?? defaultKaminosNativeFrameUrl);
const kaminosSidecarLaunchUrl = useFixture ? null : (params.get('kaminos_sidecar_launch_url') ?? defaultKaminosSidecarLaunchUrl);
const packetPollMs = Math.max(30, Number(params.get('packet_poll_ms') ?? 45));
const framePostMs = Math.max(45, Number(params.get('frame_post_ms') ?? 60));
const witnessIntervalMs = Math.max(120, Number(params.get('witness_interval_ms') ?? 420));
const witnessFrameCount = Math.max(2, Math.floor(Number(params.get('witness_frames') ?? 10)));
const sidecarPollMs = Math.max(10, Number(params.get('sidecar_poll_ms') ?? 30));
const sidecarHandConf = Number(params.get('hand_conf') ?? 0.18);
const sidecarIncludeVertices = handMeshMode || params.get('include_vertices') === '1';
const encodedFrameWidth = Math.max(160, Number(params.get('frame_width') ?? 320));
const postKaminosFrames = params.get('post_kaminos_frames') !== '0';
const lermsClientBuild = 'lerms-hand-surface-live-20260630';
const video = document.createElement('video');
const frameCanvas = document.createElement('canvas');
const frameContext = frameCanvas.getContext('2d', { alpha: false, willReadFrequently: false });
const witnessCameraCanvas = document.createElement('canvas');
const witnessCameraContext = witnessCameraCanvas.getContext('2d', { alpha: false, willReadFrequently: false });
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
let latestWitnessStatus: string | null = null;
let postedFrameCount = 0;
let liveSmokeStarted = false;
let packetLoopStarted = false;
let framePostLoopStarted = false;
let witnessStarted = false;

type FilmstripFrame = {
  capturedAtMs: number;
  frameId: string;
  status: 'captured' | 'unavailable';
  dataUrl: string;
};

type FilmstripWitness = {
  schema: 'lerms.hand-surface-live-filmstrip.v0';
  status: 'idle' | 'capturing' | 'complete';
  startedAtMs: number | null;
  cameraFrames: FilmstripFrame[];
  screenFrames: FilmstripFrame[];
  cameraFilmstripDataUrl: string | null;
  screenFilmstripDataUrl: string | null;
};

video.muted = true;
video.autoplay = true;
video.playsInline = true;

const startButton = createStartButton();
const witnessPanel = createWitnessPanel();
document.body.append(startButton, witnessPanel);
startButton.addEventListener('click', () => {
  void beginLiveSmoke();
});

window.__lermsHandSurfaceFilmstrip = createEmptyFilmstripWitness();

if (params.get('autostart') === '1') {
  void beginLiveSmoke();
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  appCanvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
  appCanvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
  appCanvas.style.width = '100vw';
  appCanvas.style.height = '100vh';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function createStartButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = 'start-hand-surface-smoke';
  button.type = 'button';
  button.textContent = handMeshMode ? 'Start Mesh Smoke' : 'Start Hand Smoke';
  Object.assign(button.style, {
    position: 'fixed',
    left: '14px',
    top: '14px',
    zIndex: '20',
    minHeight: '36px',
    padding: '0 14px',
    border: '1px solid rgba(216, 232, 192, 0.55)',
    borderRadius: '6px',
    background: 'rgba(18, 25, 22, 0.92)',
    color: 'rgba(241, 246, 223, 0.96)',
    font: '13px ui-monospace, SFMono-Regular, Menlo, monospace',
    cursor: 'pointer',
  });
  return button;
}

function createWitnessPanel(): HTMLDivElement {
  const panel = document.createElement('div');
  panel.id = 'hand-surface-witness-filmstrip';
  Object.assign(panel.style, {
    position: 'fixed',
    left: '14px',
    bottom: '14px',
    zIndex: '19',
    width: 'min(780px, calc(100vw - 28px))',
    maxHeight: '180px',
    overflow: 'auto',
    padding: '8px',
    border: '1px solid rgba(138, 246, 227, 0.22)',
    borderRadius: '6px',
    background: 'rgba(7, 16, 14, 0.82)',
    color: 'rgba(220, 232, 220, 0.88)',
    font: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
  });
  return panel;
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
    attachmentMode: handMeshMode ? 'hand_mesh' : 'hand_surface',
    lermAnchors: [
      { id: 'red-lerm-palm', face: [0, 5, 9], meshFaceIndex: 240, barycentric: [0.22, 0.34, 0.44], behaviorHint: 'cling' },
      { id: 'yellow-lerm-index', face: [5, 6, 10], meshFaceIndex: 360, barycentric: [0.18, 0.48, 0.34], behaviorHint: 'finger_walk' },
      { id: 'blue-lerm-ring', face: [13, 14, 18], meshFaceIndex: 520, barycentric: [0.24, 0.46, 0.3], behaviorHint: 'curious' },
    ],
    moge: { requested: params.get('moge') === '1', effectiveRoute: null, ageMs: null },
    requestedEndpoint: packetUrl ?? undefined,
    effectiveEndpoint: packetUrl ? effectiveKaminosEndpoint(packetUrl) : undefined,
  });
  if (handMeshMode) {
    drawUnderhillGhostShell(width, height, timestampMs);
  } else {
    drawGroundTruth(width, height, timestampMs);
  }
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
    __lermsHandSurfaceFilmstrip?: FilmstripWitness;
  }
}

async function beginLiveSmoke(): Promise<void> {
  if (liveSmokeStarted) return;
  liveSmokeStarted = true;
  startButton.disabled = true;
  startButton.textContent = 'Smoke running';
  latestSidecarStatus = 'starting live smoke';
  startWitnessSampler();
  if (packetUrl && !packetLoopStarted) {
    packetLoopStarted = true;
    void fetchPacketLoop(packetUrl);
  }
  await startWebcam();
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
    if (postKaminosFrames && kaminosNativeFrameUrl && !framePostLoopStarted) {
      framePostLoopStarted = true;
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

function startWitnessSampler(): void {
  if (witnessStarted) return;
  witnessStarted = true;
  const witness = createEmptyFilmstripWitness();
  witness.status = 'capturing';
  witness.startedAtMs = performance.now();
  window.__lermsHandSurfaceFilmstrip = witness;
  latestWitnessStatus = `witness capturing 0/${witnessFrameCount}`;
  renderWitnessPanel(witness);
  let captured = 0;
  const capture = (): void => {
    const current = window.__lermsHandSurfaceFilmstrip;
    if (!current || current.status === 'complete') return;
    captured += 1;
    current.cameraFrames.push(captureCameraWitnessFrame(captured));
    current.screenFrames.push(captureScreenWitnessFrame(captured));
    current.cameraFilmstripDataUrl = buildSvgFilmstripDataUrl(current.cameraFrames, 'camera');
    current.screenFilmstripDataUrl = buildSvgFilmstripDataUrl(current.screenFrames, 'screen');
    latestWitnessStatus = `witness ${captured}/${witnessFrameCount}`;
    if (captured >= witnessFrameCount) {
      current.status = 'complete';
      latestWitnessStatus = `witness complete ${captured} frames`;
    }
    renderWitnessPanel(current);
    if (current.status !== 'complete') {
      window.setTimeout(capture, witnessIntervalMs);
    }
  };
  window.setTimeout(capture, 250);
}

function createEmptyFilmstripWitness(): FilmstripWitness {
  return {
    schema: 'lerms.hand-surface-live-filmstrip.v0',
    status: 'idle',
    startedAtMs: null,
    cameraFrames: [],
    screenFrames: [],
    cameraFilmstripDataUrl: null,
    screenFilmstripDataUrl: null,
  };
}

function captureCameraWitnessFrame(index: number): FilmstripFrame {
  if (!witnessCameraContext || !videoReady || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return {
      capturedAtMs: performance.now(),
      frameId: `camera-${index}`,
      status: 'unavailable',
      dataUrl: placeholderFrameDataUrl('camera unavailable'),
    };
  }
  const width = 180;
  const height = Math.max(1, Math.round((width / video.videoWidth) * video.videoHeight));
  witnessCameraCanvas.width = width;
  witnessCameraCanvas.height = height;
  witnessCameraContext.drawImage(video, 0, 0, width, height);
  return {
    capturedAtMs: performance.now(),
    frameId: `camera-${index}`,
    status: 'captured',
    dataUrl: witnessCameraCanvas.toDataURL('image/jpeg', 0.68),
  };
}

function captureScreenWitnessFrame(index: number): FilmstripFrame {
  return {
    capturedAtMs: performance.now(),
    frameId: `screen-${index}`,
    status: 'captured',
    dataUrl: appCanvas.toDataURL('image/jpeg', 0.68),
  };
}

function buildSvgFilmstripDataUrl(frames: FilmstripFrame[], label: 'camera' | 'screen'): string {
  const thumbWidth = 180;
  const thumbHeight = 112;
  const gap = 8;
  const width = Math.max(thumbWidth, frames.length * (thumbWidth + gap) + gap);
  const height = thumbHeight + 34;
  const images = frames.map((frame, index) => {
    const x = gap + index * (thumbWidth + gap);
    return [
      `<image href="${escapeAttr(frame.dataUrl)}" x="${x}" y="22" width="${thumbWidth}" height="${thumbHeight}" preserveAspectRatio="xMidYMid slice" />`,
      `<text x="${x + 6}" y="16" fill="#dce8dc" font-family="monospace" font-size="12">${escapeText(frame.frameId)} ${frame.status}</text>`,
    ].join('');
  }).join('');
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" fill="#07100e" />',
    `<text x="8" y="${height - 8}" fill="#f1f6df" font-family="monospace" font-size="13">${label} filmstrip ${frames.length}/${witnessFrameCount}</text>`,
    images,
    '</svg>',
  ].join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function placeholderFrameDataUrl(label: string): string {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="112" viewBox="0 0 180 112">',
    '<rect width="180" height="112" fill="#18201d" />',
    `<text x="14" y="58" fill="#dce8dc" font-family="monospace" font-size="13">${escapeText(label)}</text>`,
    '</svg>',
  ].join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function renderWitnessPanel(witness: FilmstripWitness): void {
  witnessPanel.textContent = '';
  const status = document.createElement('div');
  status.textContent = `${witness.status} camera ${witness.cameraFrames.length} screen ${witness.screenFrames.length}`;
  witnessPanel.append(status);
  if (witness.cameraFilmstripDataUrl) {
    const image = document.createElement('img');
    image.alt = 'camera witness filmstrip';
    image.src = witness.cameraFilmstripDataUrl;
    witnessPanel.append(image);
  }
  if (witness.screenFilmstripDataUrl) {
    const image = document.createElement('img');
    image.alt = 'screen witness filmstrip';
    image.src = witness.screenFilmstripDataUrl;
    witnessPanel.append(image);
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
  if (handMeshMode) {
    drawMeshGhostHand(report, width, height);
  } else {
    drawLandmarkHandSurface(report, width, height);
  }
  for (const attachment of report.attachments) {
    if (attachment.mode !== 'hand_surface') continue;
    drawLerm(attachment.id, attachment.screen, attachment.behavior, width, height);
  }
  ctx.restore();
}

function drawLandmarkHandSurface(report: HandSurfaceReport, width: number, height: number): void {
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
}

function drawUnderhillGhostShell(width: number, height: number, timestampMs: number): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#080b0b');
  gradient.addColorStop(0.55, '#141915');
  gradient.addColorStop(1, '#070807');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(62, 74, 65, 0.72)';
  ctx.fillRect(0, height * 0.72, width, height * 0.28);
  ctx.strokeStyle = 'rgba(174, 214, 176, 0.22)';
  ctx.lineWidth = 1;
  for (let x = -80; x < width + 80; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, height * 0.72);
    ctx.lineTo(x + 120, height);
    ctx.stroke();
  }

  const kilnPulse = 0.46 + Math.sin(timestampMs / 420) * 0.12;
  ctx.fillStyle = '#161210';
  ctx.fillRect(width * 0.07, height * 0.2, width * 0.18, height * 0.34);
  ctx.fillStyle = `rgba(255, 106, 50, ${kilnPulse})`;
  ctx.fillRect(width * 0.095, height * 0.285, width * 0.13, height * 0.2);
  ctx.strokeStyle = 'rgba(240, 198, 142, 0.38)';
  ctx.strokeRect(width * 0.07, height * 0.2, width * 0.18, height * 0.34);

  drawSymbolSign(width * 0.32, height * 0.68, 'palm');
  drawSymbolSign(width * 0.39, height * 0.68, 'pinch');
  drawSymbolSign(width * 0.46, height * 0.68, 'throw');
}

function drawSymbolSign(x: number, y: number, kind: 'palm' | 'pinch' | 'throw'): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(25, 31, 28, 0.92)';
  ctx.strokeStyle = 'rgba(216, 232, 192, 0.55)';
  ctx.lineWidth = 2;
  ctx.fillRect(-18, -30, 36, 30);
  ctx.strokeRect(-18, -30, 36, 30);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 28);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(240, 226, 154, 0.82)';
  if (kind === 'palm') {
    ctx.strokeRect(-9, -24, 18, 14);
    for (let xOffset = -8; xOffset <= 8; xOffset += 4) {
      ctx.beginPath();
      ctx.moveTo(xOffset, -24);
      ctx.lineTo(xOffset, -31);
      ctx.stroke();
    }
  } else if (kind === 'pinch') {
    ctx.beginPath();
    ctx.arc(-6, -17, 5, 0, Math.PI * 2);
    ctx.arc(7, -17, 5, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.lineTo(8, -24);
    ctx.lineTo(4, -16);
    ctx.moveTo(8, -24);
    ctx.lineTo(-1, -25);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMeshGhostHand(report: HandSurfaceReport, width: number, height: number): void {
  const mesh = report.surfaceFrame.mesh;
  if (mesh.status !== 'valid') return;
  const frame = meshGhostFrame(width, height);

  ctx.save();
  ctx.translate(frame.offsetX, frame.offsetY);
  ctx.lineWidth = 0.7;
  for (const face of mesh.faces) {
    const points = face.map((index) => mesh.projected2d[index]).filter(Boolean);
    if (points.length !== 3) continue;
    ctx.beginPath();
    points.forEach((point, index) => {
      const x = point.x * frame.scale;
      const y = point.y * frame.scale;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(90, 231, 207, 0.08)';
    ctx.strokeStyle = 'rgba(138, 246, 227, 0.18)';
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawLerm(id: string, screen: Vec2, behavior: string, width: number, height: number): void {
  const frame = handMeshMode ? meshGhostFrame(width, height) : null;
  const x = frame ? frame.offsetX + screen.x * frame.scale : screen.x * width;
  const y = frame ? frame.offsetY + screen.y * frame.scale : screen.y * height;
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

function meshGhostFrame(width: number, height: number): { offsetX: number; offsetY: number; scale: number } {
  const drawWidth = Math.max(180, Math.min(width * 0.62, width - 420));
  return {
    offsetX: width * 0.3,
    offsetY: height * 0.12,
    scale: Math.min(drawWidth, height * 0.7),
  };
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
    `mesh ${report.surfaceFrame.mesh.status} faces ${report.surfaceFrame.mesh.faces.length}`,
    `moge ${report.moge.status}`,
    latestSidecarStatus,
    latestFramePostStatus,
    latestFramePostError ? `frame_post ${latestFramePostError}` : null,
    latestWitnessStatus,
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

function escapeText(value: string): string {
  return value.replace(/[<>&]/g, (char) => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      default: return char;
    }
  });
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;');
}
