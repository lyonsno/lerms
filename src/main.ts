import {
  createHillOfHillsTerrain,
  defaultHillOfHillsParams,
  type HillOfHillsTerrain,
  type HillOfHillsTerrainParams
} from './terrain/hill-of-hills.js';
import {
  SCHNOZ_SIM_ROUTE,
  buildSchnozSimulationSnapshot,
  type SchnozRenderGoin,
  type SchnozRenderLerm,
  type SchnozSimulationSnapshot,
  type SchnozTimelineFrame
} from './schnoz-lerm-simulation-core.js';

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
const viewerQuery = new URLSearchParams(window.location.search);
const schnozSmokeEnabled = viewerQuery.get('schnoz_sim') === '1';
const terrainControlsEnabled = !schnozSmokeEnabled;
const schnozSnapshot = schnozSmokeEnabled ? buildSchnozSimulationSnapshot() : null;
let params: HillOfHillsTerrainParams = {
  ...defaultHillOfHillsParams,
  gridResolutionX: 116,
  gridResolutionZ: 148
};
let terrain = createHillOfHillsTerrain(params);

interface ControlSpec {
  key: keyof HillOfHillsTerrainParams;
  label: string;
  min: number;
  max: number;
  step: number;
}

const controlSpecs: readonly ControlSpec[] = [
  { key: 'channelRadius', label: 'Channel radius', min: 3, max: 8, step: 0.1 },
  { key: 'channelCurvature', label: 'Curvature', min: 0.35, max: 2.7, step: 0.05 },
  { key: 'wallHeight', label: 'Wall height', min: 0.4, max: 5.2, step: 0.1 },
  { key: 'floorWidth', label: 'Floor width', min: 1.2, max: 6.2, step: 0.1 },
  { key: 'hillRadius', label: 'Hill radius', min: 0.5, max: 3.2, step: 0.05 },
  { key: 'hillHeight', label: 'Hill height', min: 0, max: 2.4, step: 0.05 },
  { key: 'hillVariance', label: 'Hill variance', min: 0, max: 1.35, step: 0.05 },
  { key: 'valleyRadius', label: 'Valley radius', min: 0.5, max: 3.2, step: 0.05 },
  { key: 'valleyHeight', label: 'Valley height', min: 0, max: 2.2, step: 0.05 },
  { key: 'valleyVariance', label: 'Valley variance', min: 0, max: 1.35, step: 0.05 },
  { key: 'distanceScale', label: 'Distance scale', min: 0.45, max: 2.4, step: 0.05 },
  { key: 'textureDamping', label: 'Texture damping', min: 0, max: 1, step: 0.05 },
  { key: 'detailDamping', label: 'Detail damping', min: 0, max: 1, step: 0.05 }
];

const controls = terrainControlsEnabled ? createControls() : null;
const witnessPanel = createWitnessPanel();

if (terrainControlsEnabled) {
  if (!controls) throw new Error('terrain controls unavailable');
  document.body.append(controls.element, witnessPanel);
} else {
  witnessPanel.className = 'terrain-witness schnoz-witness';
  document.body.append(witnessPanel);
  installSchnozSmokeStyles();
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

  if (schnozSmokeEnabled) {
    if (!schnozSnapshot) throw new Error('schnoz smoke snapshot unavailable');
    renderSchnozSmoke(schnozSnapshot, timestampMs, width, height);
    window.requestAnimationFrame(render);
    return;
  }

  const motion = Math.sin(timestampMs * 0.00008) * 0.18;
  terrain = createHillOfHillsTerrain(
    {
      ...params,
      crownZ: defaultHillOfHillsParams.crownZ + motion
    },
    {
      timestampMs,
      frameId: `hill-of-hills-preview-${Math.floor(timestampMs)}`,
      sampleAgeMs: 0
    }
  );

  ctx.fillStyle = '#06100d';
  ctx.fillRect(0, 0, width, height);
  drawTerrain(terrain, width, height);
  drawRouteMarkers(width, height);
  drawWitness(terrain);

  window.requestAnimationFrame(render);
}

resize();
window.addEventListener('resize', resize);
window.requestAnimationFrame(render);

function drawTerrain(currentTerrain: HillOfHillsTerrain, width: number, height: number): void {
  const { gridResolutionX, gridResolutionZ } = currentTerrain.params;
  const samples = currentTerrain.samples;

  for (let zi = gridResolutionZ - 2; zi >= 0; zi -= 1) {
    for (let xi = 0; xi < gridResolutionX - 1; xi += 1) {
      const a = samples[zi * gridResolutionX + xi];
      const b = samples[zi * gridResolutionX + xi + 1];
      const c = samples[(zi + 1) * gridResolutionX + xi + 1];
      const d = samples[(zi + 1) * gridResolutionX + xi];
      const pa = project(a.world[0], a.world[1], a.world[2], currentTerrain, width, height);
      const pb = project(b.world[0], b.world[1], b.world[2], currentTerrain, width, height);
      const pc = project(c.world[0], c.world[1], c.world[2], currentTerrain, width, height);
      const pd = project(d.world[0], d.world[1], d.world[2], currentTerrain, width, height);
      const averageHeight = (a.height + b.height + c.height + d.height) * 0.25;
      const averageNormal: readonly [number, number, number] = [
        (a.normal[0] + b.normal[0] + c.normal[0] + d.normal[0]) * 0.25,
        (a.normal[1] + b.normal[1] + c.normal[1] + d.normal[1]) * 0.25,
        (a.normal[2] + b.normal[2] + c.normal[2] + d.normal[2]) * 0.25
      ];

      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.lineTo(pc.x, pc.y);
      ctx.lineTo(pd.x, pd.y);
      ctx.closePath();
      ctx.fillStyle = colorForRegion(a.region, averageHeight, averageNormal, currentTerrain.witness.heightRange);
      ctx.fill();
    }
  }

  ctx.strokeStyle = 'rgba(248, 233, 166, 0.1)';
  ctx.lineWidth = 1;
  for (let xi = 0; xi < gridResolutionX; xi += 8) {
    ctx.beginPath();
    for (let zi = 0; zi < gridResolutionZ; zi += 1) {
      const sample = samples[zi * gridResolutionX + xi];
      const point = project(sample.world[0], sample.world[1], sample.world[2], currentTerrain, width, height);
      if (zi === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }
}

function drawRouteMarkers(width: number, height: number): void {
  const crown = project(0, 1.8, terrain.params.crownZ, terrain, width, height);
  const start = project(0, 0.45, -terrain.params.length * 0.45, terrain, width, height);

  ctx.fillStyle = 'rgba(247, 205, 86, 0.95)';
  ctx.beginPath();
  ctx.arc(crown.x, crown.y - 6, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(190, 86, 255, 0.88)';
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.arc(start.x + i * 16, start.y + Math.abs(i) * 3, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function project(
  x: number,
  y: number,
  z: number,
  currentTerrain: HillOfHillsTerrain,
  width: number,
  height: number
): { x: number; y: number } {
  const zn = (z + currentTerrain.params.length * 0.5) / currentTerrain.params.length;
  const perspective = 0.42 + (1 - zn) * 0.5;
  const scaleX = Math.min(width / 16, height / 11) * perspective;
  const screenX = width * 0.5 + x * scaleX;
  const screenY = height * 0.9 - zn * height * 0.68 - y * 42 * perspective;
  return { x: screenX, y: screenY };
}

function colorForRegion(
  region: string,
  heightValue: number,
  normal: readonly [number, number, number],
  range: { min: number; max: number }
): string {
  const t = (heightValue - range.min) / Math.max(0.001, range.max - range.min);
  const sideLight = normal[0] * -0.32 + normal[1] * 0.72 + normal[2] * -0.2;
  const light = Math.max(0.42, Math.min(1.12, 0.62 + sideLight * 0.34 + t * 0.18));
  let base: readonly [number, number, number];

  switch (region) {
    case 'crown':
      base = [178, 143, 64];
      break;
    case 'basin':
      base = [39, 111, 126];
      break;
    case 'gutter':
      base = [82, 63, 111];
      break;
    case 'rim':
      base = [162, 143, 72];
      break;
    case 'slope':
      base = [101, 134, 68];
      break;
    default:
      base = [82, 147, 112];
      break;
  }

  const lift = 16 + t * 28;
  const r = Math.round(Math.min(245, base[0] * light + lift));
  const g = Math.round(Math.min(245, base[1] * light + lift));
  const b = Math.round(Math.min(245, base[2] * light + lift));
  return `rgb(${r}, ${g}, ${b})`;
}

function drawWitness(currentTerrain: HillOfHillsTerrain): void {
  const witness = currentTerrain.witness;
  witnessPanel.textContent = [
    `Hill of Hills witness`,
    `${witness.sourceAuthority} / ${witness.route}`,
    `fallback: ${witness.fallbackStatus}`,
    `grid: ${witness.gridResolution.x} x ${witness.gridResolution.z} / samples: ${witness.sampleCount}`,
    `height: ${witness.heightRange.min.toFixed(2)} .. ${witness.heightRange.max.toFixed(2)}`,
    `checksum: ${witness.sampleChecksum}`,
    `floor ${witness.effectiveParams.floorWidth.toFixed(1)} radius ${witness.effectiveParams.channelRadius.toFixed(1)} wall ${witness.effectiveParams.wallHeight.toFixed(1)}`
  ].join('\n');
}

function renderSchnozSmoke(
  snapshot: SchnozSimulationSnapshot,
  timestampMs: number,
  width: number,
  height: number
): void {
  const cycleMs = 3600;
  const framePosition = ((timestampMs % cycleMs) / cycleMs) * snapshot.timeline.length;
  const frameIndex = Math.floor(framePosition) % snapshot.timeline.length;
  const nextFrameIndex = (frameIndex + 1) % snapshot.timeline.length;
  const frameBlend = framePosition - Math.floor(framePosition);
  const frame = snapshot.timeline[frameIndex];
  const nextFrame = snapshot.timeline[nextFrameIndex];
  const pulse = Math.sin(timestampMs * 0.015) * 0.5 + 0.5;
  const hitPulse = Math.max(0, 1 - Math.abs(frameBlend - 0.38) * 2.4);

  ctx.fillStyle = '#071116';
  ctx.fillRect(0, 0, width, height);
  drawSchnozTerrain(width, height, timestampMs);
  drawSchnozRoutePressure(frame, width, height, frameBlend, pulse);

  for (const goin of frame.goins) {
    const next = nextFrame.goins.find((candidate) => candidate.id === goin.id);
    drawLiveGoin(goin, next, width, height, frameBlend, timestampMs);
  }

  for (const lerm of frame.lerms) {
    const next = nextFrame.lerms.find((candidate) => candidate.id === lerm.id);
    drawLiveSchnozLerm(lerm, next, width, height, frameBlend, timestampMs);
  }

  if (frame.hitFlash) {
    const point = projectSchnoz(frame.hitFlash.world[0], frame.hitFlash.world[1], frame.hitFlash.world[2], width, height);
    drawCanvasStar(point.x, point.y, frame.hitFlash.radius * 90 * Math.max(0.15, hitPulse), '#65d9ff', 0.42 + hitPulse * 0.38);
  }

  const liveState = {
    schema: 'lerms.schnoz-live-smoke-state.v0',
    route: `browser/?schnoz_sim=1`,
    sourceRoute: SCHNOZ_SIM_ROUTE,
    frameIndex,
    frameLabel: frame.label,
    frameTimeMs: frame.timeMs,
    events: frame.events,
    proxyBody: snapshot.proxyBody,
    sourceTruthUpgrade: snapshot.sourceTruthUpgrade,
    summary: snapshot.summary,
    motionEvidence: frame.motionEvidence
  };

  (window as unknown as { __lermsSchnozSmokeState?: typeof liveState }).__lermsSchnozSmokeState = liveState;

  witnessPanel.textContent = [
    'Schnoz lerm live smoke',
    'route: browser/?schnoz_sim=1',
    `source: ${snapshot.frame.source.authority} / ${snapshot.frame.source.backend}`,
    `source-truth: ${snapshot.sourceTruthUpgrade.accepted ? 'accepted' : 'blocked'} (${snapshot.sourceTruthUpgrade.effectiveAuthority})`,
    `frame: ${frameIndex} ${frame.label} / ${frame.events.join(', ')}`,
    `lerms: ${snapshot.summary.lermCount} goins: ${snapshot.summary.goinCount} hits: ${snapshot.summary.juiceHitCount} drops: ${snapshot.summary.carrierDropCount}`,
    `cliplet: ${frame.motionEvidence.clipletLabel}`,
    `phase: ${frame.motionEvidence.sourcePhaseLabel}`,
    `sockets: ${frame.motionEvidence.featureEvidenceSockets.slice(0, 3).join(', ')}`,
    'body: proxy_schnoz_sphere / final red-lerm visual claim: false'
  ].join('\n');
}

function drawSchnozTerrain(width: number, height: number, timestampMs: number): void {
  const horizon = height * 0.2;
  const floor = height * 0.85;
  const sway = Math.sin(timestampMs * 0.0009) * 10;

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#102631');
  sky.addColorStop(0.44, '#14261c');
  sky.addColorStop(1, '#0a110d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#1b5537';
  ctx.beginPath();
  ctx.moveTo(0, floor);
  ctx.quadraticCurveTo(width * 0.5, horizon + sway, width, floor * 0.82);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(242, 216, 118, 0.16)';
  ctx.lineWidth = 2;
  for (let line = 0; line < 8; line += 1) {
    const y = floor - line * height * 0.075;
    ctx.beginPath();
    ctx.moveTo(width * 0.1, y);
    ctx.quadraticCurveTo(width * 0.52, y - 34 - line * 7 + sway * 0.25, width * 0.88, y - 18);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(239, 190, 68, 0.9)';
  const hoard = projectSchnoz(1.82, 0.54, -0.04, width, height);
  for (let coin = 0; coin < 9; coin += 1) {
    ctx.beginPath();
    ctx.arc(hoard.x + (coin % 3) * 11 - 11, hoard.y + Math.floor(coin / 3) * 8, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSchnozRoutePressure(
  frame: SchnozTimelineFrame,
  width: number,
  height: number,
  frameBlend: number,
  pulse: number
): void {
  if (frame.reroute) {
    const from = projectSchnoz(frame.reroute.from[0], frame.reroute.from[1], frame.reroute.from[2], width, height);
    const to = projectSchnoz(frame.reroute.to[0], frame.reroute.to[1], frame.reroute.to[2], width, height);
    ctx.strokeStyle = `rgba(190, 119, 255, ${0.3 + pulse * 0.35})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo((from.x + to.x) * 0.5, Math.min(from.y, to.y) - 76 * (1 - frameBlend), to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (frame.events.includes('goin-stolen') || frame.events.includes('carrier-fleeing')) {
    ctx.strokeStyle = `rgba(239, 190, 68, ${0.22 + pulse * 0.18})`;
    ctx.lineWidth = 3;
    const start = projectSchnoz(1.85, 0.58, 0.03, width, height);
    const exit = projectSchnoz(-0.25, 0.55, -0.18, width, height);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(width * 0.56, height * 0.5, exit.x, exit.y);
    ctx.stroke();
  }
}

function drawLiveSchnozLerm(
  lerm: SchnozRenderLerm,
  next: SchnozRenderLerm | undefined,
  width: number,
  height: number,
  blend: number,
  timestampMs: number
): void {
  const world = interpolateWorld(lerm.world, next?.world, blend);
  const heading = next ? interpolateWorld(lerm.heading, next.heading, blend) : lerm.heading;
  const point = projectSchnoz(world[0], world[1], world[2], width, height);
  const headingSign = heading[0] >= 0 ? 1 : -1;
  const statePulse = Math.sin(timestampMs * 0.019 + lerm.id.length) * 0.5 + 0.5;
  const radius =
    lerm.state === 'tumbling'
      ? 26 + statePulse * 4
      : lerm.state === 'hit_reacting'
        ? 23 + statePulse * 5
        : 21 + statePulse * 2;

  ctx.fillStyle = lerm.state === 'hit_reacting' || lerm.state === 'tumbling' ? '#d92751' : '#de2d3a';
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7d1323';
  ctx.beginPath();
  ctx.arc(point.x - headingSign * 7, point.y + radius * 0.36, radius * 0.36, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f98752';
  ctx.beginPath();
  ctx.arc(point.x + headingSign * (radius * 0.95), point.y - radius * 0.12, radius * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#101617';
  ctx.beginPath();
  ctx.arc(point.x + headingSign * (radius * 1.08), point.y - radius * 0.18, 3.2, 0, Math.PI * 2);
  ctx.fill();

  if (lerm.carryingGoinId) {
    ctx.strokeStyle = 'rgba(241, 222, 158, 0.85)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y + 8);
    ctx.lineTo(point.x + headingSign * 34, point.y + 28);
    ctx.stroke();
  }

  if (lerm.targetGoinId || lerm.state === 'rerouting_to_goin') {
    ctx.strokeStyle = 'rgba(190, 119, 255, 0.86)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(point.x + headingSign * 29, point.y - 24, 10 + statePulse * 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (lerm.state === 'hit_reacting' || lerm.state === 'tumbling') {
    ctx.strokeStyle = 'rgba(101, 217, 255, 0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(point.x - 24, point.y - 22);
    ctx.lineTo(point.x + 24, point.y + 22);
    ctx.moveTo(point.x + 24, point.y - 22);
    ctx.lineTo(point.x - 24, point.y + 22);
    ctx.stroke();
  }
}

function drawLiveGoin(
  goin: SchnozRenderGoin,
  next: SchnozRenderGoin | undefined,
  width: number,
  height: number,
  blend: number,
  timestampMs: number
): void {
  const world = interpolateWorld(goin.world, next?.world, blend);
  const point = projectSchnoz(world[0], world[1], world[2], width, height);
  const roll = goin.state === 'rolling' ? Math.sin(timestampMs * 0.03) * 8 : 0;
  const radius = goin.state === 'rolling' ? 15 : 12;

  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(roll * 0.08);
  ctx.fillStyle = '#efbe44';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a581c';
  ctx.fillRect(-radius * 0.8, -2, radius * 1.6, 4);
  ctx.restore();
}

function drawCanvasStar(cx: number, cy: number, radius: number, color: string, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  for (let arm = 0; arm < 10; arm += 1) {
    const angle = (Math.PI * 2 * arm) / 10;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function interpolateWorld(
  current: readonly [number, number, number],
  next: readonly [number, number, number] | undefined,
  blend: number
): readonly [number, number, number] {
  if (!next) return current;
  const eased = blend * blend * (3 - 2 * blend);
  return [
    current[0] + (next[0] - current[0]) * eased,
    current[1] + (next[1] - current[1]) * eased,
    current[2] + (next[2] - current[2]) * eased
  ];
}

function projectSchnoz(x: number, y: number, z: number, width: number, height: number): { x: number; y: number } {
  const zn = (z + 0.85) / 1.7;
  const perspective = 0.72 + (1 - zn) * 0.16;
  const scale = Math.min(width / 5.9, height / 3.9) * perspective;
  return {
    x: width * 0.5 + x * scale,
    y: height * 0.78 - y * scale * 0.72 + z * scale * 0.2
  };
}

function installSchnozSmokeStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    .schnoz-witness {
      position: fixed;
      left: 14px;
      top: 14px;
      max-width: min(500px, calc(100vw - 28px));
      white-space: pre-wrap;
      padding: 12px;
      box-sizing: border-box;
      border-color: rgba(101, 217, 255, 0.34);
      border-style: solid;
      border-width: 1px;
      background: rgba(4, 10, 13, 0.8);
      color: #ddf8ff;
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
      box-shadow: 0 14px 40px rgba(0, 0, 0, 0.32);
      backdrop-filter: blur(8px);
    }
    @media (max-width: 780px) {
      .schnoz-witness {
        top: auto;
        bottom: 12px;
        max-height: 35vh;
        overflow: auto;
      }
    }
  `;
  document.head.append(style);
}

function createControls(): { element: HTMLElement } {
  const element = document.createElement('section');
  element.className = 'terrain-controls';

  for (const spec of controlSpecs) {
    const row = document.createElement('label');
    const name = document.createElement('span');
    const value = document.createElement('output');
    const input = document.createElement('input');

    name.textContent = spec.label;
    input.type = 'range';
    input.min = String(spec.min);
    input.max = String(spec.max);
    input.step = String(spec.step);
    input.value = String(params[spec.key]);
    value.value = Number(params[spec.key]).toFixed(2);
    input.addEventListener('input', () => {
      const nextValue = Number(input.value);
      params = {
        ...params,
        [spec.key]: nextValue
      };
      value.value = nextValue.toFixed(2);
    });

    row.append(name, input, value);
    element.append(row);
  }

  const style = document.createElement('style');
  style.textContent = `
    .terrain-controls {
      position: fixed;
      right: 16px;
      top: 16px;
      width: min(330px, calc(100vw - 32px));
      max-height: calc(100vh - 32px);
      overflow: auto;
      padding: 12px;
      box-sizing: border-box;
      border: 1px solid rgba(242, 223, 160, 0.24);
      background: rgba(5, 12, 10, 0.78);
      color: #f4e3b0;
      font: 12px/1.25 ui-monospace, SFMono-Regular, Menlo, monospace;
      backdrop-filter: blur(8px);
    }
    .terrain-controls label {
      display: grid;
      grid-template-columns: minmax(96px, 1fr) minmax(96px, 1.3fr) 44px;
      gap: 8px;
      align-items: center;
      min-height: 26px;
    }
    .terrain-controls input {
      width: 100%;
      accent-color: #d5b64f;
    }
    .terrain-controls output {
      color: #88e0ba;
      text-align: right;
    }
    .terrain-witness {
      position: fixed;
      left: 16px;
      top: 16px;
      max-width: min(390px, calc(100vw - 32px));
      white-space: pre-wrap;
      padding: 12px;
      border: 1px solid rgba(136, 224, 186, 0.25);
      background: rgba(3, 9, 8, 0.76);
      color: #d7f7e8;
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
      backdrop-filter: blur(8px);
    }
    @media (max-width: 780px) {
      .terrain-controls {
        top: auto;
        bottom: 12px;
        right: 12px;
        width: calc(100vw - 24px);
        max-height: 38vh;
      }
      .terrain-witness {
        left: 12px;
        top: 12px;
        max-width: calc(100vw - 24px);
      }
    }
  `;
  document.head.append(style);

  return { element };
}

function createWitnessPanel(): HTMLElement {
  const element = document.createElement('pre');
  element.className = 'terrain-witness';
  return element;
}
