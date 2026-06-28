import {
  createHillOfHillsLayerTileCache,
  createHillOfHillsTerrainWithCache,
  defaultHillOfHillsParams,
  type HillOfHillsTerrain,
  type HillOfHillsTerrainParams,
  type HillOfHillsTerrainSample
} from './terrain/hill-of-hills.js';
import {
  createHillTerrainWorkerRequest,
  type HillTerrainWorkerResponse
} from './terrain/hill-of-hills-worker-client.js';

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
let params: HillOfHillsTerrainParams = {
  ...defaultHillOfHillsParams,
  ditchPhaseIntensity: 0.18,
  ditchPhaseLimit: 1,
  ditchPhaseRadius: 1.2,
  ditchPhaseTimeMs: 760,
  ditchPhaseDurationMs: 2400,
  trailPhaseIntensity: 0.78,
  trailPhaseLimit: 2,
  trailPhaseRadius: 1.45,
  trailPhaseTimeMs: 880,
  trailPhaseDurationMs: 2600,
  gridResolutionX: 116,
  gridResolutionZ: 148
};
const terrainCache = createHillOfHillsLayerTileCache();
const previewSourceOptions = {
  route: 'hill-of-hills-terrain-preview-cache',
  frameId: 'hill-of-hills-preview-cache-frame',
  configId: 'hill-of-hills-preview-cache-v0',
  timestampMs: 0,
  sampleAgeMs: 0
};
let terrain = createHillOfHillsTerrainWithCache(terrainCache, params, previewSourceOptions);
let workerTerrain: Worker | undefined;
let workerStatus = 'sync-fallback';
let latestTerrainRequestId = 0;
let pendingTerrainRequestId = 0;
let latestWorkerDurationMs = 0;
let latestWorkerError = 'none';

try {
  workerTerrain = new Worker(new URL('./terrain/hill-of-hills.worker.ts', import.meta.url), { type: 'module' });
  workerStatus = 'worker-started';
  workerTerrain.onmessage = (event: MessageEvent<HillTerrainWorkerResponse>) => {
    const response = event.data;
    if (response.requestId !== latestTerrainRequestId) {
      workerStatus = `stale-response-${response.requestId}`;
      latestWorkerError = 'stale-response';
      return;
    }
    if (!response.ok) {
      workerStatus = 'worker-failed-sync-fallback';
      latestWorkerError = response.error.message;
      pendingTerrainRequestId = 0;
      workerTerrain = undefined;
      return;
    }
    terrain = response.terrain;
    latestWorkerDurationMs = response.durationMs;
    latestWorkerError = 'none';
    pendingTerrainRequestId = 0;
    workerStatus = 'worker-live';
  };
  workerTerrain.onerror = (event) => {
    workerStatus = 'worker-error-sync-fallback';
    latestWorkerError = event.message || 'worker error';
    workerTerrain = undefined;
  };
} catch (error) {
  workerStatus = 'worker-unavailable-sync-fallback';
  latestWorkerError = error instanceof Error ? error.message : String(error);
  workerTerrain = undefined;
}

interface ViewState {
  yaw: number;
  tilt: number;
  zoom: number;
  panX: number;
  panY: number;
  motionSpeed: number;
}

let viewState: ViewState = {
  yaw: 0,
  tilt: 0.72,
  zoom: 1,
  panX: 0,
  panY: 0,
  motionSpeed: 1
};

interface ControlSpec {
  key: keyof HillOfHillsTerrainParams;
  label: string;
  min: number;
  max: number;
  step: number;
}

interface ViewControlSpec {
  key: keyof ViewState;
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
  { key: 'hillCount', label: 'Hill count', min: 4, max: 36, step: 1 },
  { key: 'hillHeight', label: 'Hill height', min: 0, max: 2.4, step: 0.05 },
  { key: 'hillVariance', label: 'Hill variance', min: 0, max: 1.35, step: 0.05 },
  { key: 'valleyRadius', label: 'Valley radius', min: 0.5, max: 3.2, step: 0.05 },
  { key: 'valleyCount', label: 'Valley count', min: 4, max: 34, step: 1 },
  { key: 'valleyHeight', label: 'Valley height', min: 0, max: 2.2, step: 0.05 },
  { key: 'valleyVariance', label: 'Valley variance', min: 0, max: 1.35, step: 0.05 },
  { key: 'worldScale', label: 'World scale', min: 0.65, max: 1.65, step: 0.05 },
  { key: 'distanceScale', label: 'Distance shift', min: 0.45, max: 2.4, step: 0.05 },
  { key: 'featureSpacing', label: 'Feature spacing', min: 0.45, max: 2.1, step: 0.05 },
  { key: 'textureScale', label: 'Texture scale', min: 0.4, max: 3, step: 0.05 },
  { key: 'textureDamping', label: 'Texture damping', min: 0, max: 1, step: 0.05 },
  { key: 'detailDamping', label: 'Detail damping', min: 0, max: 1, step: 0.05 },
  { key: 'ditchPhaseIntensity', label: 'Ditch forming', min: 0, max: 1, step: 0.05 },
  { key: 'ditchPhaseLimit', label: 'Ditch count', min: 0, max: 8, step: 1 },
  { key: 'ditchPhaseRadius', label: 'Ditch radius', min: 0.5, max: 2.4, step: 0.05 },
  { key: 'ditchPhaseTimeMs', label: 'Ditch phase', min: 0, max: 2400, step: 40 },
  { key: 'trailPhaseIntensity', label: 'Trail forming', min: 0, max: 1, step: 0.05 },
  { key: 'trailPhaseLimit', label: 'Trail count', min: 0, max: 6, step: 1 },
  { key: 'trailPhaseRadius', label: 'Trail radius', min: 0.5, max: 2.8, step: 0.05 },
  { key: 'trailPhaseTimeMs', label: 'Trail phase', min: 0, max: 2600, step: 40 }
];

const viewControlSpecs: readonly ViewControlSpec[] = [
  { key: 'yaw', label: 'Camera yaw', min: -0.9, max: 0.9, step: 0.01 },
  { key: 'tilt', label: 'Camera tilt', min: 0.32, max: 1.25, step: 0.01 },
  { key: 'zoom', label: 'Camera zoom', min: 0.55, max: 1.75, step: 0.01 },
  { key: 'panX', label: 'Camera pan X', min: -0.35, max: 0.35, step: 0.01 },
  { key: 'panY', label: 'Camera pan Y', min: -0.32, max: 0.24, step: 0.01 },
  { key: 'motionSpeed', label: 'Motion speed', min: 0, max: 2, step: 0.05 }
];

const controls = createControls();
const viewControls = createViewControls();
const witnessPanel = createWitnessPanel();

document.body.append(controls.element, viewControls.element, witnessPanel);
installCameraDrag();

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
  const motionTimestampMs = timestampMs * viewState.motionSpeed;
  const motion = Math.sin(motionTimestampMs * 0.00008) * 0.18;
  const ditchPhaseTimeMs =
    params.ditchPhaseIntensity > 0
      ? (params.ditchPhaseTimeMs + motionTimestampMs * 0.42) % params.ditchPhaseDurationMs
      : params.ditchPhaseTimeMs;
  const trailPhaseTimeMs =
    params.trailPhaseIntensity > 0
      ? (params.trailPhaseTimeMs + motionTimestampMs * 0.38) % params.trailPhaseDurationMs
      : params.trailPhaseTimeMs;
  requestTerrain({
    ...params,
    ditchPhaseTimeMs,
    trailPhaseTimeMs,
    crownZ: defaultHillOfHillsParams.crownZ + motion
  });

  ctx.fillStyle = '#06100d';
  ctx.fillRect(0, 0, width, height);
  drawTerrain(terrain, width, height);
  drawRouteMarkers(width, height);
  drawWitness(terrain);

  window.requestAnimationFrame(render);
}

function requestTerrain(nextParams: HillOfHillsTerrainParams): void {
  if (workerTerrain && pendingTerrainRequestId === 0) {
    latestTerrainRequestId += 1;
    pendingTerrainRequestId = latestTerrainRequestId;
    workerStatus = 'worker-pending';
    workerTerrain.postMessage(createHillTerrainWorkerRequest(latestTerrainRequestId, nextParams, previewSourceOptions));
    return;
  }

  if (!workerTerrain) {
    terrain = createHillOfHillsTerrainWithCache(terrainCache, nextParams, previewSourceOptions);
    workerStatus = latestWorkerError === 'none' ? 'sync-fallback' : workerStatus;
  }
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
      ctx.fillStyle = colorForSample(a, averageHeight, averageNormal, currentTerrain.witness.heightRange);
      ctx.fill();
    }
  }

  drawTopologyOverlays(currentTerrain, width, height);

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

function drawTopologyOverlays(currentTerrain: HillOfHillsTerrain, width: number, height: number): void {
  const { gridResolutionX, gridResolutionZ } = currentTerrain.params;
  const samples = currentTerrain.samples;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let zi = 2; zi < gridResolutionZ - 2; zi += 4) {
    ctx.beginPath();
    let drawing = false;
    for (let xi = 1; xi < gridResolutionX - 1; xi += 1) {
      const sample = samples[zi * gridResolutionX + xi];
      if (sample.topology.ditchPotential < 0.62) {
        drawing = false;
        continue;
      }
      const point = project(sample.world[0], sample.world[1] + 0.035, sample.world[2], currentTerrain, width, height);
      if (!drawing) {
        ctx.moveTo(point.x, point.y);
        drawing = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.strokeStyle = 'rgba(30, 22, 54, 0.48)';
    ctx.lineWidth = 3.2;
    ctx.stroke();
  }

  for (let zi = 2; zi < gridResolutionZ - 2; zi += 3) {
    ctx.beginPath();
    let drawing = false;
    let strength = 0;
    for (let xi = 1; xi < gridResolutionX - 1; xi += 1) {
      const sample = samples[zi * gridResolutionX + xi];
      if (sample.phaseInfluence.amount < 0.18) {
        drawing = false;
        continue;
      }
      strength = Math.max(strength, sample.phaseInfluence.amount);
      const point = project(sample.world[0], sample.world[1] + 0.055, sample.world[2], currentTerrain, width, height);
      if (!drawing) {
        ctx.moveTo(point.x, point.y);
        drawing = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    if (strength > 0) {
      ctx.strokeStyle = `rgba(24, 18, 46, ${0.3 + strength * 0.36})`;
      ctx.lineWidth = 4.2 + strength * 4.4;
      ctx.stroke();
    }
  }

  for (let zi = 2; zi < gridResolutionZ - 2; zi += 3) {
    ctx.beginPath();
    let drawing = false;
    let strength = 0;
    for (let xi = 1; xi < gridResolutionX - 1; xi += 1) {
      const sample = samples[zi * gridResolutionX + xi];
      if (sample.phaseInfluence.trailAmount < 0.18) {
        drawing = false;
        continue;
      }
      strength = Math.max(strength, sample.phaseInfluence.trailAmount);
      const point = project(sample.world[0], sample.world[1] + 0.075, sample.world[2], currentTerrain, width, height);
      if (!drawing) {
        ctx.moveTo(point.x, point.y);
        drawing = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    if (strength > 0) {
      ctx.strokeStyle = `rgba(220, 196, 117, ${0.24 + strength * 0.32})`;
      ctx.lineWidth = 2.4 + strength * 3.2;
      ctx.stroke();
    }
  }

  for (let zi = 4; zi < gridResolutionZ - 4; zi += 7) {
    for (let xi = 4; xi < gridResolutionX - 4; xi += 7) {
      const sample = samples[zi * gridResolutionX + xi];
      if (sample.topology.growthPotential < 0.62) {
        continue;
      }
      const point = project(sample.world[0], sample.world[1] + 0.12, sample.world[2], currentTerrain, width, height);
      const radius = 1.8 + sample.topology.growthPotential * 3.2;
      ctx.fillStyle = `rgba(42, 111, 63, ${0.2 + sample.topology.growthPotential * 0.34})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
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
  const yawCos = Math.cos(viewState.yaw);
  const yawSin = Math.sin(viewState.yaw);
  const rotatedX = x * yawCos - z * yawSin;
  const rotatedZ = x * yawSin + z * yawCos;
  const zn = (rotatedZ + currentTerrain.params.length * 0.5) / currentTerrain.params.length;
  const perspective = (0.42 + (1 - zn) * 0.5) * viewState.zoom;
  const scaleX = Math.min(width / 16, height / 11) * perspective;
  const screenX = width * (0.5 + viewState.panX) + rotatedX * scaleX;
  const screenY = height * (0.9 + viewState.panY) - zn * height * 0.68 * viewState.tilt - y * 42 * perspective;
  return { x: screenX, y: screenY };
}

function colorForSample(
  sample: HillOfHillsTerrainSample,
  heightValue: number,
  normal: readonly [number, number, number],
  range: { min: number; max: number }
): string {
  const t = (heightValue - range.min) / Math.max(0.001, range.max - range.min);
  const sideLight = normal[0] * -0.32 + normal[1] * 0.72 + normal[2] * -0.2;
  const phaseShadow = sample.phaseInfluence.sideDitchAmount * 0.22 + sample.phaseInfluence.trailAmount * 0.06;
  const wetShadow = sample.proxyMaterial.wetness * 0.16 + sample.topology.ditchPotential * 0.1 + phaseShadow;
  const growthLift = sample.proxyMaterial.growthTint * 0.14;
  const routeLift = sample.topology.routePressure * 0.1;
  const light = Math.max(0.36, Math.min(1.18, 0.6 + sideLight * 0.32 + t * 0.16 + routeLift + growthLift - wetShadow));
  const base = sample.proxyMaterial.color;
  const lift = 12 + t * 24 + sample.topology.routePressure * 14;
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
    `topology: ${witness.topologyChecksum} / material: ${witness.proxyMaterialChecksum}`,
    `phase: ${witness.phaseMode} epoch ${witness.terrainEpoch} active ${witness.activePhaseCount}`,
    `phase clock: ${witness.phaseClock.toFixed(2)} progress ${witness.phaseProgress.toFixed(2)}`,
    `ditch phase: ${witness.effectiveParams.ditchPhaseTimeMs.toFixed(0)}ms clock ${witness.ditchPhaseClock.toFixed(2)} progress ${witness.ditchPhaseProgress.toFixed(2)}`,
    `trail phase: ${witness.effectiveParams.trailPhaseTimeMs.toFixed(0)}ms clock ${witness.trailPhaseClock.toFixed(2)} progress ${witness.trailPhaseProgress.toFixed(2)}`,
    `phase checksum: ${witness.phaseChecksum} / influence ${witness.phaseInfluenceChecksum}`,
    `trail seed: ${witness.trailSeedMethod} / candidates ${witness.trailCandidateChecksum}`,
    `trail score: ${witness.trailCandidateScoreRange.min.toFixed(2)} .. ${witness.trailCandidateScoreRange.max.toFixed(2)} / selected ${witness.selectedTrailScoreRange.min.toFixed(2)} .. ${witness.selectedTrailScoreRange.max.toFixed(2)}`,
    `phase influence: ${witness.phaseInfluenceRange.min.toFixed(2)} .. ${witness.phaseInfluenceRange.max.toFixed(2)}`,
    `trail ${witness.trailInfluenceRange.max.toFixed(2)} side-ditch ${witness.sideDitchInfluenceRange.max.toFixed(2)}`,
    `support: ${witness.supportFrame.supportClass} / ${witness.supportFrame.mappingMode}`,
    `support motion: delta ${witness.supportFrame.maxHeightDelta.toFixed(3)} speed ${witness.supportFrame.maxSurfaceSpeed.toFixed(2)} dirty ${witness.supportFrame.dirtySubstrateTileCount}/${witness.supportFrame.substrateTileCount}`,
    `worker: ${workerStatus} req ${latestTerrainRequestId} pending ${pendingTerrainRequestId || 'none'} duration ${latestWorkerDurationMs.toFixed(1)}ms`,
    `worker error: ${latestWorkerError}`,
    `route ${witness.topologyRanges.routePressure.max.toFixed(2)} ditch ${witness.topologyRanges.ditchPotential.max.toFixed(2)} growth ${witness.topologyRanges.growthPotential.max.toFixed(2)}`,
    `floor ${witness.effectiveParams.floorWidth.toFixed(1)} radius ${witness.effectiveParams.channelRadius.toFixed(1)} wall ${witness.effectiveParams.wallHeight.toFixed(1)}`,
    `view yaw ${viewState.yaw.toFixed(2)} tilt ${viewState.tilt.toFixed(2)} zoom ${viewState.zoom.toFixed(2)} motion ${viewState.motionSpeed.toFixed(2)}`
  ].join('\n');
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
    .terrain-controls,
    .view-controls {
      position: fixed;
      right: 16px;
      width: min(330px, calc(100vw - 32px));
      overflow: auto;
      padding: 12px;
      box-sizing: border-box;
      border: 1px solid rgba(242, 223, 160, 0.24);
      background: rgba(5, 12, 10, 0.78);
      color: #f4e3b0;
      font: 12px/1.25 ui-monospace, SFMono-Regular, Menlo, monospace;
      backdrop-filter: blur(8px);
    }
    .terrain-controls {
      top: 16px;
      max-height: calc(100vh - 200px);
    }
    .view-controls {
      bottom: 16px;
    }
    .terrain-controls label,
    .view-controls label {
      display: grid;
      grid-template-columns: minmax(96px, 1fr) minmax(0, 1.3fr) 44px;
      gap: 8px;
      align-items: center;
      min-height: 26px;
    }
    .terrain-controls input,
    .view-controls input {
      width: 100%;
      min-width: 0;
      accent-color: #d5b64f;
    }
    .terrain-controls output,
    .view-controls output {
      color: #88e0ba;
      text-align: right;
    }
    .view-controls button {
      width: 100%;
      margin-top: 8px;
      min-height: 28px;
      border: 1px solid rgba(136, 224, 186, 0.28);
      background: rgba(12, 31, 25, 0.88);
      color: #d7f7e8;
      font: inherit;
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
        bottom: 180px;
        right: 12px;
        width: calc(100vw - 24px);
        max-height: 30vh;
      }
      .view-controls {
        right: 12px;
        bottom: 12px;
        width: calc(100vw - 24px);
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

function createViewControls(): { element: HTMLElement; refresh: () => void } {
  const element = document.createElement('section');
  element.className = 'view-controls';
  const outputs = new Map<keyof ViewState, HTMLOutputElement>();
  const inputs = new Map<keyof ViewState, HTMLInputElement>();

  for (const spec of viewControlSpecs) {
    const row = document.createElement('label');
    const name = document.createElement('span');
    const value = document.createElement('output');
    const input = document.createElement('input');

    name.textContent = spec.label;
    input.type = 'range';
    input.min = String(spec.min);
    input.max = String(spec.max);
    input.step = String(spec.step);
    input.value = String(viewState[spec.key]);
    value.value = viewState[spec.key].toFixed(2);
    input.addEventListener('input', () => {
      viewState = {
        ...viewState,
        [spec.key]: Number(input.value)
      };
      value.value = viewState[spec.key].toFixed(2);
    });

    outputs.set(spec.key, value);
    inputs.set(spec.key, input);
    row.append(name, input, value);
    element.append(row);
  }

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Reset view';
  reset.addEventListener('click', () => {
    viewState = {
      yaw: 0,
      tilt: 0.72,
      zoom: 1,
      panX: 0,
      panY: 0,
      motionSpeed: 1
    };
    refresh();
  });
  element.append(reset);

  function refresh(): void {
    for (const spec of viewControlSpecs) {
      const input = inputs.get(spec.key);
      const output = outputs.get(spec.key);
      if (input) input.value = String(viewState[spec.key]);
      if (output) output.value = viewState[spec.key].toFixed(2);
    }
  }

  return { element, refresh };
}

function installCameraDrag(): void {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  appCanvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    appCanvas.setPointerCapture(event.pointerId);
  });

  appCanvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    viewState = {
      ...viewState,
      yaw: clamp(viewState.yaw + dx * 0.0035, -0.9, 0.9),
      tilt: clamp(viewState.tilt - dy * 0.0025, 0.32, 1.25)
    };
    viewControls.refresh();
  });

  appCanvas.addEventListener('pointerup', (event) => {
    dragging = false;
    appCanvas.releasePointerCapture(event.pointerId);
  });

  appCanvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      viewState = {
        ...viewState,
        zoom: clamp(viewState.zoom - event.deltaY * 0.001, 0.55, 1.75)
      };
      viewControls.refresh();
    },
    { passive: false }
  );
}

function createWitnessPanel(): HTMLElement {
  const element = document.createElement('pre');
  element.className = 'terrain-witness';
  return element;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
