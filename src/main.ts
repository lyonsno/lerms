import {
  createHillOfHillsLayerTileCache,
  createHillOfHillsTerrainBuffer,
  createHillOfHillsTerrainWithCache,
  defaultHillOfHillsParams,
  type HillOfHillsMaterialEdgeKind,
  type HillOfHillsProxyMaterialKind,
  type HillOfHillsSurfaceDetailKind,
  type HillOfHillsSurfaceAnchorKind,
  type HillOfHillsTerrainBuffer,
  type HillOfHillsTerrainBufferMetricChannel,
  type HillOfHillsTerrainParams,
} from './terrain/hill-of-hills.js';
import {
  createHillTerrainWorkerRequest,
  type HillTerrainWorkerResponse
} from './terrain/hill-of-hills-worker-client.js';
import {
  hillOverlayStrokeStyle,
  shouldBreakHillTrailStroke,
  type HillOverlayStrokeStyle
} from './terrain/hill-of-hills-overlay-style.js';
import { hillMaterialFrayColor } from './terrain/hill-of-hills-material-fray.js';
import {
  hillMaterialTransitionLawFor,
  type HillMaterialTransitionDescriptor
} from './terrain/hill-of-hills-transition-law.js';
import {
  hillMaterialTransitionPreviewStyleFor,
  type HillMaterialTransitionPreviewStyle
} from './terrain/hill-of-hills-transition-preview-style.js';

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
const SURFACE_DETAIL_CODEBOOK: readonly HillOfHillsSurfaceDetailKind[] = [
  'none',
  'meadow-tuft',
  'dust-scuff',
  'slope-striation',
  'damp-edge',
  'trail-wear',
  'growth-bud'
];
const MATERIAL_EDGE_CODEBOOK: readonly HillOfHillsMaterialEdgeKind[] = [
  'none',
  'meadow-dust',
  'meadow-growth',
  'dust-crust',
  'damp-rim',
  'route-wear',
  'growth-cluster',
  'slope-break'
];
const PROXY_MATERIAL_CODEBOOK: readonly HillOfHillsProxyMaterialKind[] = [
  'crown-warmth',
  'approach-clay',
  'slope-moss',
  'basin-meadow',
  'basin-dust',
  'basin-pool',
  'ditch-shadow',
  'rim-crust',
  'growth-lip'
];
const SURFACE_ANCHOR_CODEBOOK: readonly HillOfHillsSurfaceAnchorKind[] = [
  'none',
  'tuft-line',
  'scuff-line',
  'wet-rim',
  'trail-accent',
  'growth-cluster',
  'stone-scatter'
];
const MATERIAL_FRAY_NEIGHBOR_OFFSETS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [2, 0],
  [-2, 0],
  [0, 2],
  [0, -2],
  [2, 2],
  [-2, 2],
  [2, -2],
  [-2, -2],
  [3, 0],
  [-3, 0],
  [0, 3],
  [0, -3],
  [3, 3],
  [-3, 3],
  [3, -3],
  [-3, -3]
];
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
let terrainBuffer = createHillOfHillsTerrainBuffer(createHillOfHillsTerrainWithCache(terrainCache, params, previewSourceOptions));
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
    terrainBuffer = response.terrainBuffer;
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
  drawTerrain(terrainBuffer, width, height);
  drawRouteMarkers(terrainBuffer, width, height);
  drawWitness(terrainBuffer);

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
    terrainBuffer = createHillOfHillsTerrainBuffer(createHillOfHillsTerrainWithCache(terrainCache, nextParams, previewSourceOptions));
    workerStatus = latestWorkerError === 'none' ? 'sync-fallback' : workerStatus;
  }
}

resize();
window.addEventListener('resize', resize);
window.requestAnimationFrame(render);

function drawTerrain(currentBuffer: HillOfHillsTerrainBuffer, width: number, height: number): void {
  const gridResolutionX = currentBuffer.gridResolution.x;
  const gridResolutionZ = currentBuffer.gridResolution.z;

  for (let zi = gridResolutionZ - 2; zi >= 0; zi -= 1) {
    for (let xi = 0; xi < gridResolutionX - 1; xi += 1) {
      const a = zi * gridResolutionX + xi;
      const b = zi * gridResolutionX + xi + 1;
      const c = (zi + 1) * gridResolutionX + xi + 1;
      const d = (zi + 1) * gridResolutionX + xi;
      const pa = projectSample(currentBuffer, a, width, height);
      const pb = projectSample(currentBuffer, b, width, height);
      const pc = projectSample(currentBuffer, c, width, height);
      const pd = projectSample(currentBuffer, d, width, height);
      const averageHeight =
        (metricAt(currentBuffer, a, 'height') +
          metricAt(currentBuffer, b, 'height') +
          metricAt(currentBuffer, c, 'height') +
          metricAt(currentBuffer, d, 'height')) *
        0.25;
      const averageNormal: readonly [number, number, number] = [
        (normalAt(currentBuffer, a, 0) + normalAt(currentBuffer, b, 0) + normalAt(currentBuffer, c, 0) + normalAt(currentBuffer, d, 0)) * 0.25,
        (normalAt(currentBuffer, a, 1) + normalAt(currentBuffer, b, 1) + normalAt(currentBuffer, c, 1) + normalAt(currentBuffer, d, 1)) * 0.25,
        (normalAt(currentBuffer, a, 2) + normalAt(currentBuffer, b, 2) + normalAt(currentBuffer, c, 2) + normalAt(currentBuffer, d, 2)) * 0.25
      ];

      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.lineTo(pc.x, pc.y);
      ctx.lineTo(pd.x, pd.y);
      ctx.closePath();
      ctx.fillStyle = colorForBufferSample(currentBuffer, a, averageHeight, averageNormal, currentBuffer.heightRange);
      ctx.fill();
    }
  }

  drawMaterialTransitionFragments(currentBuffer, width, height);
  drawMaterialEdgeDissolves(currentBuffer, width, height);
  drawSurfaceDetails(currentBuffer, width, height);
  drawTopologyOverlays(currentBuffer, width, height);

  ctx.strokeStyle = 'rgba(248, 233, 166, 0.1)';
  ctx.lineWidth = 1;
  for (let xi = 0; xi < gridResolutionX; xi += 8) {
    ctx.beginPath();
    for (let zi = 0; zi < gridResolutionZ; zi += 1) {
      const point = projectSample(currentBuffer, zi * gridResolutionX + xi, width, height);
      if (zi === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }
}

function drawMaterialTransitionFragments(currentBuffer: HillOfHillsTerrainBuffer, width: number, height: number): void {
  const gridResolutionX = currentBuffer.gridResolution.x;
  const gridResolutionZ = currentBuffer.gridResolution.z;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let zi = 1; zi < gridResolutionZ - 1; zi += 1) {
    for (let xi = 1; xi < gridResolutionX - 1; xi += 1) {
      const index = zi * gridResolutionX + xi;
      if (xi < gridResolutionX - 2) {
        drawMaterialTransitionEdge(currentBuffer, index, index + 1, width, height, 'x');
      }
      if (zi < gridResolutionZ - 2) {
        drawMaterialTransitionEdge(currentBuffer, index, index + gridResolutionX, width, height, 'z');
      }
    }
  }

  ctx.restore();
}

function drawMaterialTransitionEdge(
  currentBuffer: HillOfHillsTerrainBuffer,
  fromIndex: number,
  toIndex: number,
  width: number,
  height: number,
  axis: 'x' | 'z'
): void {
  if (currentBuffer.materialCodes[fromIndex] === currentBuffer.materialCodes[toIndex]) {
    return;
  }

  const descriptor = materialTransitionDescriptor(currentBuffer, fromIndex, toIndex);
  if (descriptor.law === 'none' || descriptor.intensity <= 0) {
    return;
  }

  const jitter = transitionJitter(currentBuffer, fromIndex, toIndex, descriptor.seedKey);
  if (jitter > 0.36 + descriptor.intensity * 0.58) {
    return;
  }

  const from = projectSample(currentBuffer, fromIndex, width, height, 0.105);
  const to = projectSample(currentBuffer, toIndex, width, height, 0.105);
  const middle = {
    x: (from.x + to.x) * 0.5,
    y: (from.y + to.y) * 0.5
  };
  const tangent = transitionTangent(currentBuffer, fromIndex, axis, width, height);
  const normal = normalize2d({
    x: to.x - from.x,
    y: to.y - from.y
  });
  const style = transitionFragmentStyle(descriptor, currentBuffer, fromIndex, toIndex);
  const side = jitter > 0.5 ? 1 : -1;
  const length = style.fragmentLength;
  const cross = style.crossOffset;
  const center = {
    x: middle.x + tangent.x * (jitter - 0.5) * length * 0.9,
    y: middle.y + tangent.y * (jitter - 0.5) * length * 0.9
  };
  const normalSide = side + style.normalBias;

  ctx.strokeStyle = rgba(style.strokeRgb, style.alpha);
  ctx.lineWidth = style.lineWidth;
  drawTransitionMotifStroke(style, center, tangent, normal, length, cross, normalSide);

  if (style.fillRgb && style.fillAlpha > 0) {
    drawTransitionMotifClusters(style, center, tangent, normal, length, cross, normalSide, jitter);
  }
}

function materialTransitionDescriptor(
  buffer: HillOfHillsTerrainBuffer,
  fromIndex: number,
  toIndex: number
): HillMaterialTransitionDescriptor {
  return hillMaterialTransitionLawFor({
    fromMaterial: proxyMaterialAt(buffer, fromIndex),
    toMaterial: proxyMaterialAt(buffer, toIndex),
    edgeKind: strongerMaterialEdgeAt(buffer, fromIndex, toIndex),
    anchor: strongerSurfaceAnchorAt(buffer, fromIndex, toIndex),
    strength: Math.max(metricAt(buffer, fromIndex, 'materialEdgeStrength'), metricAt(buffer, toIndex, 'materialEdgeStrength')),
    dissolve: Math.max(metricAt(buffer, fromIndex, 'materialEdgeDissolve'), metricAt(buffer, toIndex, 'materialEdgeDissolve')),
    wetness: Math.max(metricAt(buffer, fromIndex, 'wetness'), metricAt(buffer, toIndex, 'wetness')),
    growth: Math.max(metricAt(buffer, fromIndex, 'growthTint'), metricAt(buffer, toIndex, 'growthTint')),
    routePressure: Math.max(metricAt(buffer, fromIndex, 'routePressure'), metricAt(buffer, toIndex, 'routePressure')),
    materialContrast: colorContrast(colorAt(buffer, fromIndex), colorAt(buffer, toIndex))
  });
}

function transitionFragmentStyle(
  descriptor: HillMaterialTransitionDescriptor,
  buffer: HillOfHillsTerrainBuffer,
  fromIndex: number,
  toIndex: number
): HillMaterialTransitionPreviewStyle {
  return hillMaterialTransitionPreviewStyleFor({
    law: descriptor.law,
    intensity: descriptor.intensity,
    averageColor: averageColor(colorAt(buffer, fromIndex), colorAt(buffer, toIndex))
  });
}

function drawTransitionMotifStroke(
  style: HillMaterialTransitionPreviewStyle,
  center: { x: number; y: number },
  tangent: { x: number; y: number },
  normal: { x: number; y: number },
  length: number,
  cross: number,
  normalSide: number
): void {
  if (style.segmentCount <= 1) {
    drawTransitionStrokeSegment(style, center, tangent, normal, length, cross, normalSide, 0);
    return;
  }

  const segmentLength = length / (style.segmentCount + 0.8);
  for (let index = 0; index < style.segmentCount; index += 1) {
    const offset = (index - (style.segmentCount - 1) * 0.5) * segmentLength * 1.15;
    const sideOffset = (index % 2 === 0 ? 1 : -1) * cross * 0.28;
    drawTransitionStrokeSegment(
      style,
      {
        x: center.x + tangent.x * offset + normal.x * sideOffset,
        y: center.y + tangent.y * offset + normal.y * sideOffset
      },
      tangent,
      normal,
      segmentLength,
      cross * 0.58,
      normalSide,
      index
    );
  }
}

function drawTransitionStrokeSegment(
  style: HillMaterialTransitionPreviewStyle,
  center: { x: number; y: number },
  tangent: { x: number; y: number },
  normal: { x: number; y: number },
  length: number,
  cross: number,
  normalSide: number,
  index: number
): void {
  const bend = style.curveBias + index * 0.05;
  ctx.beginPath();
  ctx.moveTo(
    center.x - tangent.x * length * 0.5 - normal.x * cross * normalSide,
    center.y - tangent.y * length * 0.5 - normal.y * cross * normalSide
  );
  ctx.quadraticCurveTo(
    center.x + normal.x * cross * bend * normalSide,
    center.y + normal.y * cross * bend * normalSide,
    center.x + tangent.x * length * 0.5 + normal.x * cross * normalSide,
    center.y + tangent.y * length * 0.5 + normal.y * cross * normalSide
  );
  ctx.stroke();
}

function drawTransitionMotifClusters(
  style: HillMaterialTransitionPreviewStyle,
  center: { x: number; y: number },
  tangent: { x: number; y: number },
  normal: { x: number; y: number },
  length: number,
  cross: number,
  normalSide: number,
  jitter: number
): void {
  ctx.fillStyle = rgba(style.fillRgb ?? style.strokeRgb, style.fillAlpha);
  const count = Math.max(1, style.clusterCount);
  for (let index = 0; index < count; index += 1) {
    const along = count === 1 ? 0 : (index / (count - 1) - 0.5) * length * 0.8;
    const stagger = ((index * 0.37 + jitter) % 1 - 0.5) * cross * 0.9;
    const radius = style.motif === 'growth-cluster' ? 1.05 + style.lineWidth * 0.55 : 0.75 + style.lineWidth * 0.35;
    ctx.beginPath();
    ctx.arc(
      center.x + tangent.x * along + normal.x * (cross * normalSide + stagger),
      center.y + tangent.y * along + normal.y * (cross * normalSide + stagger),
      radius,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

function averageColor(a: readonly [number, number, number], b: readonly [number, number, number]): readonly [number, number, number] {
  return [
    Math.round((a[0] + b[0]) * 0.5),
    Math.round((a[1] + b[1]) * 0.5),
    Math.round((a[2] + b[2]) * 0.5)
  ];
}

function rgba(rgb: readonly [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(3)})`;
}

function transitionTangent(
  buffer: HillOfHillsTerrainBuffer,
  index: number,
  axis: 'x' | 'z',
  width: number,
  height: number
): { x: number; y: number } {
  const gridResolutionX = buffer.gridResolution.x;
  const gridResolutionZ = buffer.gridResolution.z;
  const xi = index % gridResolutionX;
  const zi = Math.floor(index / gridResolutionX);
  const beforeIndex =
    axis === 'x'
      ? Math.max(0, zi - 1) * gridResolutionX + xi
      : zi * gridResolutionX + Math.max(0, xi - 1);
  const afterIndex =
    axis === 'x'
      ? Math.min(gridResolutionZ - 1, zi + 1) * gridResolutionX + xi
      : zi * gridResolutionX + Math.min(gridResolutionX - 1, xi + 1);
  const before = projectSample(buffer, beforeIndex, width, height, 0.105);
  const after = projectSample(buffer, afterIndex, width, height, 0.105);
  return normalize2d({
    x: after.x - before.x,
    y: after.y - before.y
  });
}

function normalize2d(vector: { x: number; y: number }): { x: number; y: number } {
  const length = Math.hypot(vector.x, vector.y);
  if (length < 0.001) {
    return { x: 1, y: 0 };
  }
  return {
    x: vector.x / length,
    y: vector.y / length
  };
}

function transitionJitter(buffer: HillOfHillsTerrainBuffer, fromIndex: number, toIndex: number, seedKey: string): number {
  const fromOffset = fromIndex * 3;
  const toOffset = toIndex * 3;
  const x = (buffer.positions[fromOffset] + buffer.positions[toOffset]) * 0.5;
  const z = (buffer.positions[fromOffset + 2] + buffer.positions[toOffset + 2]) * 0.5;
  const hash = stringHash(seedKey);
  const raw = Math.sin(x * 26.331 + z * 57.119 + hash * 0.00013 + buffer.params.seed * 0.031) * 32721.9187;
  return raw - Math.floor(raw);
}

function stringHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function strongerMaterialEdgeAt(buffer: HillOfHillsTerrainBuffer, a: number, b: number): HillOfHillsMaterialEdgeKind {
  return metricAt(buffer, a, 'materialEdgeStrength') >= metricAt(buffer, b, 'materialEdgeStrength') ? materialEdgeAt(buffer, a) : materialEdgeAt(buffer, b);
}

function strongerSurfaceAnchorAt(buffer: HillOfHillsTerrainBuffer, a: number, b: number): HillOfHillsSurfaceAnchorKind {
  return metricAt(buffer, a, 'materialEdgeStrength') >= metricAt(buffer, b, 'materialEdgeStrength') ? surfaceAnchorAt(buffer, a) : surfaceAnchorAt(buffer, b);
}

function drawMaterialEdgeDissolves(currentBuffer: HillOfHillsTerrainBuffer, width: number, height: number): void {
  const gridResolutionX = currentBuffer.gridResolution.x;
  const gridResolutionZ = currentBuffer.gridResolution.z;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let zi = 2; zi < gridResolutionZ - 2; zi += 3) {
    for (let xi = 2; xi < gridResolutionX - 2; xi += 3) {
      const index = zi * gridResolutionX + xi;
      const kind = materialEdgeAt(currentBuffer, index);
      const anchor = surfaceAnchorAt(currentBuffer, index);
      if (kind === 'none' || anchor === 'none') {
        continue;
      }

      const strength = metricAt(currentBuffer, index, 'materialEdgeStrength');
      const dissolve = metricAt(currentBuffer, index, 'materialEdgeDissolve');
      const jitter = detailJitter(currentBuffer, index);
      if (jitter > dissolve * 0.82 + 0.05) {
        continue;
      }

      drawMaterialEdgeMark(currentBuffer, index, kind, anchor, strength, dissolve, jitter, width, height);
    }
  }

  ctx.restore();
}

function drawMaterialEdgeMark(
  currentBuffer: HillOfHillsTerrainBuffer,
  index: number,
  kind: HillOfHillsMaterialEdgeKind,
  anchor: HillOfHillsSurfaceAnchorKind,
  strength: number,
  dissolve: number,
  jitter: number,
  width: number,
  height: number
): void {
  const point = projectSample(currentBuffer, index, width, height, 0.11 + dissolve * 0.025);
  const angle = detailAngle(currentBuffer, index, jitter) + (jitter - 0.5) * 0.55;
  const length = 2.5 + dissolve * 7;
  const dx = Math.cos(angle) * length;
  const dy = Math.sin(angle) * length * 0.5;
  const alpha = 0.08 + dissolve * 0.18;

  switch (anchor) {
    case 'wet-rim':
      ctx.strokeStyle = `rgba(38, 48, 80, ${0.12 + strength * 0.22})`;
      ctx.lineWidth = 1 + strength * 1.25;
      ctx.beginPath();
      ctx.moveTo(point.x - dx * 0.62, point.y - dy * 0.62);
      ctx.quadraticCurveTo(point.x, point.y + (jitter - 0.5) * 3, point.x + dx * 0.62, point.y + dy * 0.62);
      ctx.stroke();
      return;
    case 'trail-accent':
      ctx.strokeStyle = `rgba(216, 194, 128, ${0.1 + strength * 0.2})`;
      ctx.lineWidth = 0.85 + strength * 1;
      ctx.beginPath();
      ctx.moveTo(point.x - dx * 0.55, point.y - dy * 0.55);
      ctx.lineTo(point.x + dx * 0.55, point.y + dy * 0.55);
      ctx.stroke();
      return;
    case 'growth-cluster':
      ctx.fillStyle = `rgba(39, 117, 61, ${0.12 + strength * 0.26})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.2 + strength * 2.6, 0, Math.PI * 2);
      ctx.fill();
      return;
    case 'tuft-line':
      ctx.strokeStyle = kind === 'meadow-growth' ? `rgba(75, 148, 78, ${alpha})` : `rgba(137, 152, 92, ${alpha})`;
      ctx.lineWidth = 0.75 + strength * 0.8;
      ctx.beginPath();
      ctx.moveTo(point.x - dx * 0.4, point.y + dy * 0.2);
      ctx.lineTo(point.x, point.y - length * 0.38);
      ctx.lineTo(point.x + dx * 0.4, point.y + dy * 0.2);
      ctx.stroke();
      return;
    case 'scuff-line':
      ctx.strokeStyle = `rgba(185, 157, 96, ${0.09 + strength * 0.17})`;
      ctx.lineWidth = 0.8 + strength * 0.9;
      ctx.beginPath();
      ctx.moveTo(point.x - dx * 0.5, point.y - dy * 0.35);
      ctx.lineTo(point.x + dx * 0.5, point.y + dy * 0.35);
      ctx.stroke();
      return;
    case 'stone-scatter':
      ctx.fillStyle = `rgba(97, 88, 82, ${0.08 + strength * 0.2})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 0.8 + strength * 1.6, 0, Math.PI * 2);
      ctx.fill();
      return;
    case 'none':
      return;
  }
}

function drawSurfaceDetails(currentBuffer: HillOfHillsTerrainBuffer, width: number, height: number): void {
  const gridResolutionX = currentBuffer.gridResolution.x;
  const gridResolutionZ = currentBuffer.gridResolution.z;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let zi = 2; zi < gridResolutionZ - 2; zi += 2) {
    for (let xi = 2; xi < gridResolutionX - 2; xi += 2) {
      const index = zi * gridResolutionX + xi;
      const kind = surfaceDetailAt(currentBuffer, index);
      if (kind === 'none') {
        continue;
      }
      const density = metricAt(currentBuffer, index, 'surfaceDetailDensity');
      const edgeMix = metricAt(currentBuffer, index, 'surfaceDetailEdgeMix');
      const jitter = detailJitter(currentBuffer, index);
      if (jitter > density * 0.72) {
        continue;
      }
      drawSurfaceDetailMark(currentBuffer, index, kind, density, edgeMix, jitter, width, height);
    }
  }

  ctx.restore();
}

function drawSurfaceDetailMark(
  currentBuffer: HillOfHillsTerrainBuffer,
  index: number,
  kind: HillOfHillsSurfaceDetailKind,
  density: number,
  edgeMix: number,
  jitter: number,
  width: number,
  height: number
): void {
  const point = projectSample(currentBuffer, index, width, height, 0.095 + density * 0.035);
  const angle = detailAngle(currentBuffer, index, jitter);
  const length = 3 + density * 8;
  const bend = (edgeMix - 0.5) * 4;
  const dx = Math.cos(angle) * length;
  const dy = Math.sin(angle) * length * 0.42;

  switch (kind) {
    case 'meadow-tuft':
      ctx.strokeStyle = `rgba(54, 122, 62, ${0.16 + density * 0.28})`;
      ctx.lineWidth = 0.8 + density * 0.8;
      ctx.beginPath();
      ctx.moveTo(point.x - dx * 0.25, point.y + dy * 0.2);
      ctx.lineTo(point.x, point.y - length * 0.48);
      ctx.lineTo(point.x + dx * 0.28, point.y + dy * 0.15);
      ctx.stroke();
      return;
    case 'dust-scuff':
      ctx.strokeStyle = `rgba(183, 160, 102, ${0.13 + density * 0.2})`;
      ctx.lineWidth = 1 + density * 1.1;
      ctx.beginPath();
      ctx.moveTo(point.x - dx * 0.5, point.y - dy * 0.5);
      ctx.lineTo(point.x + dx * 0.5, point.y + dy * 0.5 + bend);
      ctx.stroke();
      return;
    case 'slope-striation':
      ctx.strokeStyle = `rgba(228, 218, 155, ${0.09 + density * 0.12})`;
      ctx.lineWidth = 0.8 + density * 0.75;
      ctx.beginPath();
      ctx.moveTo(point.x - dx * 0.7, point.y - dy * 0.7);
      ctx.quadraticCurveTo(point.x, point.y + bend, point.x + dx * 0.7, point.y + dy * 0.7);
      ctx.stroke();
      return;
    case 'damp-edge':
      ctx.strokeStyle = `rgba(45, 48, 82, ${0.12 + density * 0.24})`;
      ctx.lineWidth = 1.4 + density * 1.4;
      ctx.beginPath();
      ctx.moveTo(point.x - dx * 0.52, point.y - dy * 0.52);
      ctx.lineTo(point.x + dx * 0.52, point.y + dy * 0.52);
      ctx.stroke();
      return;
    case 'trail-wear':
      ctx.strokeStyle = `rgba(219, 199, 133, ${0.18 + density * 0.24})`;
      ctx.lineWidth = 1.1 + density * 1.2;
      ctx.beginPath();
      ctx.moveTo(point.x - dx * 0.58, point.y - dy * 0.58);
      ctx.lineTo(point.x + dx * 0.58, point.y + dy * 0.58 + bend * 0.4);
      ctx.stroke();
      return;
    case 'growth-bud':
      ctx.fillStyle = `rgba(35, 108, 55, ${0.18 + density * 0.34})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.8 + density * 2.7, 0, Math.PI * 2);
      ctx.fill();
      return;
    case 'none':
      return;
  }
}

function drawTopologyOverlays(currentBuffer: HillOfHillsTerrainBuffer, width: number, height: number): void {
  const gridResolutionX = currentBuffer.gridResolution.x;
  const gridResolutionZ = currentBuffer.gridResolution.z;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let zi = 2; zi < gridResolutionZ - 2; zi += 5) {
    ctx.beginPath();
    let drawing = false;
    let strength = 0;
    for (let xi = 1; xi < gridResolutionX - 1; xi += 1) {
      const index = zi * gridResolutionX + xi;
      const ditchPotential = metricAt(currentBuffer, index, 'ditchPotential');
      if (ditchPotential < 0.64) {
        drawing = false;
        continue;
      }
      strength = Math.max(strength, ditchPotential);
      const point = projectSample(currentBuffer, index, width, height, 0.035);
      if (!drawing) {
        ctx.moveTo(point.x, point.y);
        drawing = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    if (strength > 0) {
      strokeOverlayPath(hillOverlayStrokeStyle('ditch', strength));
    }
  }

  for (let zi = 2; zi < gridResolutionZ - 2; zi += 4) {
    ctx.beginPath();
    let drawing = false;
    let strength = 0;
    for (let xi = 1; xi < gridResolutionX - 1; xi += 1) {
      const index = zi * gridResolutionX + xi;
      const phaseAmount = metricAt(currentBuffer, index, 'phaseAmount');
      if (phaseAmount < 0.18) {
        drawing = false;
        continue;
      }
      strength = Math.max(strength, phaseAmount);
      const point = projectSample(currentBuffer, index, width, height, 0.055);
      if (!drawing) {
        ctx.moveTo(point.x, point.y);
        drawing = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    if (strength > 0) {
      strokeOverlayPath(hillOverlayStrokeStyle('phaseDitch', strength));
    }
  }

  for (let zi = 2; zi < gridResolutionZ - 2; zi += 3) {
    ctx.beginPath();
    let drawing = false;
    let strength = 0;
    let runSampleCount = 0;
    for (let xi = 1; xi < gridResolutionX - 1; xi += 1) {
      const index = zi * gridResolutionX + xi;
      const trailAmount = metricAt(currentBuffer, index, 'trailAmount');
      if (trailAmount < 0.18) {
        if (drawing && strength > 0) {
          strokeOverlayPath(hillOverlayStrokeStyle('trail', strength));
        }
        ctx.beginPath();
        drawing = false;
        strength = 0;
        runSampleCount = 0;
        continue;
      }
      runSampleCount += 1;
      strength = Math.max(strength, trailAmount);
      const point = projectSample(currentBuffer, index, width, height, 0.075);
      if (!drawing) {
        ctx.moveTo(point.x, point.y);
        drawing = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
      if (shouldBreakHillTrailStroke(runSampleCount, trailAmount)) {
        strokeOverlayPath(hillOverlayStrokeStyle('trail', strength));
        ctx.beginPath();
        drawing = false;
        strength = 0;
        runSampleCount = 0;
      }
    }
    if (strength > 0) {
      strokeOverlayPath(hillOverlayStrokeStyle('trail', strength));
    }
  }

  for (let zi = 4; zi < gridResolutionZ - 4; zi += 7) {
    for (let xi = 4; xi < gridResolutionX - 4; xi += 7) {
      const index = zi * gridResolutionX + xi;
      const growthPotential = metricAt(currentBuffer, index, 'growthPotential');
      if (growthPotential < 0.62) {
        continue;
      }
      const point = projectSample(currentBuffer, index, width, height, 0.12);
      const radius = 1.8 + growthPotential * 3.2;
      ctx.fillStyle = `rgba(42, 111, 63, ${0.2 + growthPotential * 0.34})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function surfaceDetailAt(buffer: HillOfHillsTerrainBuffer, index: number): HillOfHillsSurfaceDetailKind {
  return SURFACE_DETAIL_CODEBOOK[buffer.surfaceDetailCodes[index]] ?? 'none';
}

function proxyMaterialAt(buffer: HillOfHillsTerrainBuffer, index: number): HillOfHillsProxyMaterialKind {
  return PROXY_MATERIAL_CODEBOOK[buffer.materialCodes[index]] ?? 'approach-clay';
}

function materialEdgeAt(buffer: HillOfHillsTerrainBuffer, index: number): HillOfHillsMaterialEdgeKind {
  return MATERIAL_EDGE_CODEBOOK[buffer.materialEdgeCodes[index]] ?? 'none';
}

function surfaceAnchorAt(buffer: HillOfHillsTerrainBuffer, index: number): HillOfHillsSurfaceAnchorKind {
  return SURFACE_ANCHOR_CODEBOOK[buffer.surfaceAnchorCodes[index]] ?? 'none';
}

function detailJitter(buffer: HillOfHillsTerrainBuffer, index: number): number {
  const x = buffer.positions[index * 3];
  const z = buffer.positions[index * 3 + 2];
  const raw = Math.sin(x * 12.9898 + z * 78.233 + buffer.params.seed * 0.021 + index * 0.137) * 43758.5453;
  return raw - Math.floor(raw);
}

function detailAngle(buffer: HillOfHillsTerrainBuffer, index: number, jitter: number): number {
  const nx = buffer.normals[index * 3];
  const nz = buffer.normals[index * 3 + 2];
  if (Math.abs(nx) + Math.abs(nz) > 0.02) {
    return Math.atan2(nz, nx) + Math.PI * 0.5 + (jitter - 0.5) * 0.8;
  }
  return jitter * Math.PI * 2;
}

function strokeOverlayPath(style: HillOverlayStrokeStyle): void {
  ctx.strokeStyle = style.strokeStyle;
  ctx.lineWidth = style.lineWidth;
  ctx.stroke();
}

function drawRouteMarkers(currentBuffer: HillOfHillsTerrainBuffer, width: number, height: number): void {
  const crown = project(0, 1.8, currentBuffer.params.crownZ, currentBuffer, width, height);
  const start = project(0, 0.45, -currentBuffer.params.length * 0.45, currentBuffer, width, height);

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
  currentBuffer: HillOfHillsTerrainBuffer,
  width: number,
  height: number
): { x: number; y: number } {
  const yawCos = Math.cos(viewState.yaw);
  const yawSin = Math.sin(viewState.yaw);
  const rotatedX = x * yawCos - z * yawSin;
  const rotatedZ = x * yawSin + z * yawCos;
  const zn = (rotatedZ + currentBuffer.params.length * 0.5) / currentBuffer.params.length;
  const perspective = (0.42 + (1 - zn) * 0.5) * viewState.zoom;
  const scaleX = Math.min(width / 16, height / 11) * perspective;
  const screenX = width * (0.5 + viewState.panX) + rotatedX * scaleX;
  const screenY = height * (0.9 + viewState.panY) - zn * height * 0.68 * viewState.tilt - y * 42 * perspective;
  return { x: screenX, y: screenY };
}

function projectSample(currentBuffer: HillOfHillsTerrainBuffer, index: number, width: number, height: number, yOffset = 0): { x: number; y: number } {
  const vectorOffset = index * 3;
  return project(
    currentBuffer.positions[vectorOffset],
    currentBuffer.positions[vectorOffset + 1] + yOffset,
    currentBuffer.positions[vectorOffset + 2],
    currentBuffer,
    width,
    height
  );
}

function colorForBufferSample(
  buffer: HillOfHillsTerrainBuffer,
  index: number,
  heightValue: number,
  normal: readonly [number, number, number],
  range: { min: number; max: number }
): string {
  const t = (heightValue - range.min) / Math.max(0.001, range.max - range.min);
  const sideLight = normal[0] * -0.32 + normal[1] * 0.72 + normal[2] * -0.2;
  const phaseShadow = metricAt(buffer, index, 'sideDitchAmount') * 0.22 + metricAt(buffer, index, 'trailAmount') * 0.06;
  const wetShadow = metricAt(buffer, index, 'wetness') * 0.16 + metricAt(buffer, index, 'ditchPotential') * 0.1 + phaseShadow;
  const growthLift = metricAt(buffer, index, 'growthTint') * 0.14;
  const routeLift = metricAt(buffer, index, 'routePressure') * 0.1;
  const light = Math.max(0.36, Math.min(1.18, 0.6 + sideLight * 0.32 + t * 0.16 + routeLift + growthLift - wetShadow));
  const base = colorAt(buffer, index);
  const lift = 12 + t * 24 + metricAt(buffer, index, 'routePressure') * 14;
  const shadedBase = shadeMaterialColor(base, light, lift);
  const neighbor = materialFrayNeighbor(buffer, index, light, lift);
  const frayed = hillMaterialFrayColor({
    baseColor: shadedBase,
    neighborColor: neighbor.color,
    edgeKind: materialEdgeAt(buffer, index),
    anchor: surfaceAnchorAt(buffer, index),
    strength: metricAt(buffer, index, 'materialEdgeStrength'),
    dissolve: metricAt(buffer, index, 'materialEdgeDissolve'),
    jitter: materialFrayJitter(buffer, index),
    materialContrast: neighbor.contrast
  });
  const [r, g, b] = frayed.color;
  return `rgb(${r}, ${g}, ${b})`;
}

function shadeMaterialColor(color: readonly [number, number, number], light: number, lift: number): readonly [number, number, number] {
  return [
    Math.round(Math.min(245, color[0] * light + lift)),
    Math.round(Math.min(245, color[1] * light + lift)),
    Math.round(Math.min(245, color[2] * light + lift))
  ];
}

function materialFrayNeighbor(
  buffer: HillOfHillsTerrainBuffer,
  index: number,
  light: number,
  lift: number
): { color: readonly [number, number, number]; contrast: number } {
  const gridResolutionX = buffer.gridResolution.x;
  const gridResolutionZ = buffer.gridResolution.z;
  const xi = index % gridResolutionX;
  const zi = Math.floor(index / gridResolutionX);
  const baseColor = colorAt(buffer, index);
  const baseMaterialCode = buffer.materialCodes[index];
  let neighborColor = baseColor;
  let strongestContrast = 0;
  const offsets = MATERIAL_FRAY_NEIGHBOR_OFFSETS;

  for (const [dx, dz] of offsets) {
    const nx = xi + dx;
    const nz = zi + dz;
    if (nx < 0 || nz < 0 || nx >= gridResolutionX || nz >= gridResolutionZ) {
      continue;
    }

    const neighborIndex = nz * gridResolutionX + nx;
    if (buffer.materialCodes[neighborIndex] === baseMaterialCode) {
      continue;
    }

    const candidate = colorAt(buffer, neighborIndex);
    const contrast = colorContrast(baseColor, candidate);
    if (contrast > strongestContrast) {
      strongestContrast = contrast;
      neighborColor = candidate;
    }
  }

  return {
    color: shadeMaterialColor(neighborColor, light, lift),
    contrast: strongestContrast
  };
}

function colorContrast(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return Math.min(1, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 255);
}

function materialFrayJitter(buffer: HillOfHillsTerrainBuffer, index: number): number {
  const x = buffer.positions[index * 3];
  const z = buffer.positions[index * 3 + 2];
  const raw = Math.sin(x * 41.681 + z * 17.173 + buffer.params.seed * 0.037 + index * 0.097) * 24634.6345;
  return raw - Math.floor(raw);
}

function metricAt(buffer: HillOfHillsTerrainBuffer, index: number, channel: HillOfHillsTerrainBufferMetricChannel): number {
  const channelIndex = buffer.channelLayout.metrics.indexOf(channel);
  if (channelIndex < 0) {
    return 0;
  }
  return buffer.metrics[index * buffer.channelLayout.metrics.length + channelIndex];
}

function normalAt(buffer: HillOfHillsTerrainBuffer, index: number, axis: 0 | 1 | 2): number {
  return buffer.normals[index * 3 + axis];
}

function colorAt(buffer: HillOfHillsTerrainBuffer, index: number): readonly [number, number, number] {
  const offset = index * 3;
  return [buffer.colors[offset], buffer.colors[offset + 1], buffer.colors[offset + 2]];
}

function drawWitness(currentBuffer: HillOfHillsTerrainBuffer): void {
  const witness = currentBuffer.witness;
  witnessPanel.textContent = [
    `Hill of Hills witness`,
    `${witness.sourceAuthority} / ${witness.route}`,
    `buffer: ${currentBuffer.schema} / ${currentBuffer.sampleSchema}`,
    `fallback: ${witness.fallbackStatus}`,
    `grid: ${witness.gridResolution.x} x ${witness.gridResolution.z} / samples: ${witness.sampleCount}`,
    `height: ${witness.heightRange.min.toFixed(2)} .. ${witness.heightRange.max.toFixed(2)}`,
    `checksum: ${witness.sampleChecksum}`,
    `topology: ${witness.topologyChecksum} / material: ${witness.proxyMaterialChecksum}`,
    `detail: ${witness.surfaceDetailChecksum} meadow ${witness.surfaceDetailCounts['meadow-tuft'] ?? 0} dust ${witness.surfaceDetailCounts['dust-scuff'] ?? 0} damp ${witness.surfaceDetailCounts['damp-edge'] ?? 0}`,
    `edge: ${witness.materialEdgeChecksum} damp ${witness.materialEdgeCounts['damp-rim'] ?? 0} trail ${witness.materialEdgeCounts['route-wear'] ?? 0} growth ${witness.materialEdgeCounts['growth-cluster'] ?? 0}`,
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
