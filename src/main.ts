import {
  createHillOfHillsLayerTileCache,
  createHillOfHillsTerrainBuffer,
  createHillOfHillsTerrainWithCache,
  defaultHillOfHillsParams,
  HILL_OF_HILLS_PRESSURE_FIELD_KINDS,
  HILL_OF_HILLS_PRESSURE_FIELD_METRIC_CHANNELS,
  HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS,
  HILL_OF_HILLS_TOPOLOGY_GESTURE_PRESETS,
  type HillOfHillsMaterialEdgeKind,
  type HillOfHillsPressureFieldKind,
  type HillOfHillsProxyMaterialKind,
  type HillOfHillsSurfaceDetailKind,
  type HillOfHillsSurfaceAnchorKind,
  type HillOfHillsTerrain,
  type HillOfHillsTerrainBuffer,
  type HillOfHillsTerrainBufferMetricChannel,
  type HillOfHillsTerrainParams,
  type HillOfHillsTopologyEventClassConfig,
  type HillOfHillsTopologyDynamicsMode,
  type HillOfHillsTopologyPhaseKind,
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
import {
  hillPlacementAffordanceAnchorsFor,
  type HillPlacementAffordanceAnchor,
  type HillPlacementAffordanceFamily,
  type HillPlacementAffordanceKind,
  type HillPlacementVec2
} from './terrain/hill-of-hills-placement-affordance.js';
import type { HillGrowthMeadowShaderSketch } from './terrain/hill-of-hills-growth-meadow-shader-sketch.js';
import {
  HILL_SEMANTIC_PLACEMENT_INPUT_SCHEMA,
  createHillSemanticPlacementField,
  selectHillSemanticPlacementCandidates,
  type HillSemanticPlacementCandidate,
  type HillSemanticPlacementCandidateInput,
  type HillSemanticPlacementSource
} from './terrain/hill-of-hills-semantic-placement-field.js';
import {
  HILL_PREVIEW_GROWTH_SKIN_DENSITY_RANGE,
  HILL_PREVIEW_GROWTH_SKIN_OPACITY_RANGE,
  HILL_PREVIEW_PRESSURE_OVERLAY_STRENGTH_RANGE,
  HILL_PREVIEW_TOPOGRAPHIC_CONTOUR_SPACING_RANGE,
  HILL_PREVIEW_TOPOGRAPHIC_CONTOUR_STRENGTH_RANGE,
  HILL_PREVIEW_TOPOLOGY_LINE_STRENGTH_RANGE,
  defaultHillPreviewSettings,
  loadHillPreviewSettings,
  saveHillPreviewSettings,
  type HillPreviewLayerKey,
  type HillPreviewPressureFieldSelection,
  type HillPreviewSettings,
  type HillPreviewSettingsStorage
} from './terrain/hill-of-hills-preview-settings.js';
import {
  loadHillOfHillsParamSettings,
  saveHillOfHillsParamSettings,
  type HillOfHillsParamSettingsStorage
} from './terrain/hill-of-hills-param-settings.js';
import {
  applyHillDiagnosticParamPreset,
  applyHillDiagnosticPreviewPreset,
  hillDiagnosticPresetFromSearch
} from './terrain/hill-of-hills-diagnostic-presets.js';
import {
  HILL_PHASE_FILMSTRIP_FRAME_COUNTS,
  compareHillPhaseContinuityFrames,
  createHillPhaseContinuityReport,
  createHillPhaseFilmstripSchedule,
  fitHillPhaseFilmstripLayout,
  fitHillPhaseFilmstripViewport,
  formatHillPhaseContinuityDelta,
  normalizeHillPhaseFilmstripFrameCount,
  type HillPhaseContinuityDelta,
  type HillPhaseFilmstripFrame,
  type HillPhaseFilmstripFrameCount
} from './terrain/hill-of-hills-phase-filmstrip.js';

const canvas = document.getElementById('lerms-canvas') as HTMLCanvasElement | null;

if (!canvas) {
  throw new Error('missing lerms canvas');
}

const context = canvas.getContext('2d');

if (!context) {
  throw new Error('2d canvas unavailable');
}

const appCanvas = canvas;
let ctx = context;
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
const PHASE_FILMSTRIP_CAPTION_HEIGHT = 64;
interface HillPhaseFilmstripExportResult {
  filename: string;
  reportFilename: string;
  frameCount: number;
  report: ReturnType<typeof createHillPhaseContinuityReport>;
}
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
const defaultPreviewParams: HillOfHillsTerrainParams = {
  ...defaultHillOfHillsParams,
  ditchPhaseIntensity: 0,
  ditchPhaseLimit: 0,
  ditchPhaseRadius: 1.2,
  ditchPhaseTimeMs: 760,
  ditchPhaseDurationMs: 2400,
  trailPhaseIntensity: 0.78,
  trailPhaseLimit: 2,
  trailPhaseRadius: 1.45,
  trailPhaseTimeMs: 880,
  trailPhaseDurationMs: 2600,
  topologyPhaseIntensity: 0.42,
  topologyPhaseLimit: 3,
  topologyPhaseRadius: 1.45,
  topologyPhaseHeightScale: 1,
  topologyPhaseBasinBias: 1,
  topologyPhaseValleyBias: 1,
  topologyPhaseHillBias: 1,
  topologyPhaseRidgeBias: 1,
  topologyPhaseSaddleBias: 1,
  topologyPhaseOverlap: 0.32,
  topologyPhaseDetailScale: 1,
  topologyPhaseDriftIntensity: 0.55,
  topologyPhaseTimeMs: 720,
  topologyPhaseDurationMs: 2200,
  gridResolutionX: 116,
  gridResolutionZ: 148
};

function withoutPreviewDitchFormation(nextParams: HillOfHillsTerrainParams): HillOfHillsTerrainParams {
  return {
    ...nextParams,
    ditchPhaseIntensity: 0,
    ditchPhaseLimit: 0
  };
}

const hillDiagnosticPreset = hillDiagnosticPresetFromSearch(window.location.search);
let params: HillOfHillsTerrainParams = withoutPreviewDitchFormation({
  ...defaultPreviewParams,
  ...loadHillOfHillsParamSettings(safeParamSettingsStorage(), defaultPreviewParams)
});
params = applyHillDiagnosticParamPreset(params, hillDiagnosticPreset);
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
let queuedTerrainParams: HillOfHillsTerrainParams | undefined;
let latestWorkerDurationMs = 0;
let latestWorkerError = 'none';
let latestGrowthPlacementSummary = 'placement none';

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
    flushQueuedTerrainRequest();
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
  { key: 'trailPhaseIntensity', label: 'Trail forming', min: 0, max: 1, step: 0.05 },
  { key: 'trailPhaseLimit', label: 'Trail count', min: 0, max: 6, step: 1 },
  { key: 'trailPhaseRadius', label: 'Trail radius', min: 0.5, max: 2.8, step: 0.05 },
  { key: 'trailPhaseTimeMs', label: 'Trail phase', min: 0, max: 2600, step: 40 },
  { key: 'trailPhaseDurationMs', label: 'Trail cadence', min: 800, max: 5200, step: 80 },
  { key: 'topologyPhaseIntensity', label: 'Topology motion', min: 0, max: 1, step: 0.05 },
  { key: 'topologyPhaseLimit', label: 'Topology count', min: 0, max: 8, step: 1 },
  { key: 'topologyPhaseRadius', label: 'Topology radius', min: 0.5, max: 2.8, step: 0.05 },
  { key: 'topologyPhaseHeightScale', label: 'Topology height', min: 0, max: 2, step: 0.05 },
  { key: 'topologyPhaseBasinBias', label: 'Basin bias', min: 0, max: 2, step: 0.05 },
  { key: 'topologyPhaseValleyBias', label: 'Valley bias', min: 0, max: 2, step: 0.05 },
  { key: 'topologyPhaseHillBias', label: 'Hill bias', min: 0, max: 2, step: 0.05 },
  { key: 'topologyPhaseRidgeBias', label: 'Ridge bias', min: 0, max: 2, step: 0.05 },
  { key: 'topologyPhaseSaddleBias', label: 'Saddle bias', min: 0, max: 2, step: 0.05 },
  { key: 'topologyPhaseOverlap', label: 'Topology overlap', min: 0, max: 0.5, step: 0.01 },
  { key: 'topologyPhaseDetailScale', label: 'Topology detail', min: 0, max: 2, step: 0.05 },
  { key: 'topologyPhaseDriftIntensity', label: 'Basin drift', min: 0, max: 1, step: 0.05 },
  { key: 'topologyPhaseTimeMs', label: 'Topology phase', min: 0, max: 2600, step: 40 },
  { key: 'topologyPhaseDurationMs', label: 'Topology cadence', min: 800, max: 5200, step: 80 }
];

const viewControlSpecs: readonly ViewControlSpec[] = [
  { key: 'yaw', label: 'Camera yaw', min: -0.9, max: 0.9, step: 0.01 },
  { key: 'tilt', label: 'Camera tilt', min: 0.32, max: 1.25, step: 0.01 },
  { key: 'zoom', label: 'Camera zoom', min: 0.55, max: 1.75, step: 0.01 },
  { key: 'panX', label: 'Camera pan X', min: -0.35, max: 0.35, step: 0.01 },
  { key: 'panY', label: 'Camera pan Y', min: -0.32, max: 0.24, step: 0.01 },
  { key: 'motionSpeed', label: 'Motion speed', min: 0, max: 2, step: 0.05 }
];
const previewLayerSpecs: readonly { key: HillPreviewLayerKey; label: string }[] = [
  { key: 'base', label: 'Base' },
  { key: 'growthSkin', label: 'Growth skin' },
  { key: 'transitions', label: 'Transitions' },
  { key: 'edgeDissolves', label: 'Edge dissolves' },
  { key: 'surfaceDetails', label: 'Surface details' },
  { key: 'topologyOverlays', label: 'Topology overlays' },
  { key: 'routeMarkers', label: 'Route markers' }
];

const controls = createControls();
const viewControls = createViewControls();
let previewSettings: HillPreviewSettings = loadHillPreviewSettings(safePreviewSettingsStorage());
previewSettings = applyHillDiagnosticPreviewPreset(previewSettings, hillDiagnosticPreset);
const previewDebugControls = createPreviewDebugControls();
const witnessPanel = createWitnessPanel();

document.body.append(controls.element, viewControls.element, previewDebugControls.element, witnessPanel);
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
  const ditchPhaseTimeMs =
    params.ditchPhaseIntensity > 0
      ? (params.ditchPhaseTimeMs + motionTimestampMs * 0.42) % params.ditchPhaseDurationMs
      : params.ditchPhaseTimeMs;
  const trailPhaseTimeMs =
    params.trailPhaseIntensity > 0
      ? (params.trailPhaseTimeMs + motionTimestampMs * 0.38) % params.trailPhaseDurationMs
      : params.trailPhaseTimeMs;
  const topologyPhaseTimeMs =
    params.topologyPhaseIntensity > 0
      ? params.topologyPhaseTimeMs + motionTimestampMs * 0.3
      : params.topologyPhaseTimeMs;
  requestTerrain({
    ...params,
    ditchPhaseTimeMs,
    trailPhaseTimeMs,
    topologyPhaseTimeMs
  });

  ctx.fillStyle = '#06100d';
  ctx.fillRect(0, 0, width, height);
  drawTerrain(terrainBuffer, width, height);
  if (previewSettings.layers.routeMarkers) {
    drawRouteMarkers(terrainBuffer, width, height);
  }
  drawWitness(terrainBuffer);

  window.requestAnimationFrame(render);
}

function requestTerrain(nextParams: HillOfHillsTerrainParams): void {
  if (workerTerrain && pendingTerrainRequestId === 0) {
    dispatchTerrainWorkerRequest(nextParams);
    return;
  }

  if (workerTerrain) {
    queuedTerrainParams = nextParams;
    workerStatus = 'worker-queued';
    return;
  }

  if (!workerTerrain) {
    terrainBuffer = createHillOfHillsTerrainBuffer(createHillOfHillsTerrainWithCache(terrainCache, nextParams, previewSourceOptions));
    workerStatus = latestWorkerError === 'none' ? 'sync-fallback' : workerStatus;
  }
}

function dispatchTerrainWorkerRequest(nextParams: HillOfHillsTerrainParams): void {
  if (!workerTerrain) {
    return;
  }
  latestTerrainRequestId += 1;
  pendingTerrainRequestId = latestTerrainRequestId;
  workerStatus = 'worker-pending';
  workerTerrain.postMessage(createHillTerrainWorkerRequest(latestTerrainRequestId, nextParams, previewSourceOptions));
}

function flushQueuedTerrainRequest(): void {
  if (!workerTerrain || pendingTerrainRequestId !== 0 || !queuedTerrainParams) {
    return;
  }
  const nextParams = queuedTerrainParams;
  queuedTerrainParams = undefined;
  dispatchTerrainWorkerRequest(nextParams);
}

resize();
window.addEventListener('resize', resize);
window.requestAnimationFrame(render);

function drawTerrain(currentBuffer: HillOfHillsTerrainBuffer, width: number, height: number): void {
  const gridResolutionX = currentBuffer.gridResolution.x;
  const gridResolutionZ = currentBuffer.gridResolution.z;

  if (previewSettings.layers.base) {
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
  }

  if (previewSettings.layers.growthSkin) {
    drawGrowthMeadowShaderSketch(currentBuffer, width, height);
  }
  if (previewSettings.layers.transitions) {
    drawMaterialTransitionFragments(currentBuffer, width, height);
  }
  if (previewSettings.layers.edgeDissolves) {
    drawMaterialEdgeDissolves(currentBuffer, width, height);
  }
  if (previewSettings.layers.surfaceDetails) {
    drawSurfaceDetails(currentBuffer, width, height);
  }
  drawPressureFieldOverlay(currentBuffer, width, height);
  if (previewSettings.layers.topologyOverlays) {
    drawTopologyOverlays(currentBuffer, width, height);
  }

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

function drawGrowthMeadowShaderSketch(currentBuffer: HillOfHillsTerrainBuffer, width: number, height: number): void {
  const densityMultiplier = previewSettings.growthSkin.density;
  if (densityMultiplier <= 0) {
    latestGrowthPlacementSummary = 'placement off';
    return;
  }

  const gridResolutionX = currentBuffer.gridResolution.x;
  const gridResolutionZ = currentBuffer.gridResolution.z;
  const opacityMultiplier = previewSettings.growthSkin.opacity;
  const placementInputs: HillSemanticPlacementCandidateInput[] = [];

  for (let zi = 2; zi < gridResolutionZ - 2; zi += 2) {
    for (let xi = 2; xi < gridResolutionX - 2; xi += 2) {
      const index = zi * gridResolutionX + xi;
      placementInputs.push(growthMeadowPlacementInput(currentBuffer, index, xi, zi));
    }
  }

  const field = createHillSemanticPlacementField({
    schema: HILL_SEMANTIC_PLACEMENT_INPUT_SCHEMA,
    seedKey: `${currentBuffer.source.configId ?? currentBuffer.source.route}:${currentBuffer.params.seed}:growth-skin`,
    candidates: placementInputs
  });
  const selected = selectHillSemanticPlacementCandidates(field.candidates, Math.min(1, densityMultiplier));
  latestGrowthPlacementSummary = `placement ${field.checksum} selected ${selected.length}/${field.candidateCount} fiber ${field.countsByKind['meadow-fiber'] ?? 0} grass ${field.countsByKind['edge-grass'] ?? 0}`;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const candidate of selected) {
    drawGrowthMeadowShaderMark(currentBuffer, candidate, opacityMultiplier, width, height);
  }

  ctx.restore();
}

function growthMeadowPlacementInput(
  buffer: HillOfHillsTerrainBuffer,
  index: number,
  xi: number,
  zi: number
): HillSemanticPlacementCandidateInput {
  const cues = growthMeadowAnchorCues(buffer, index);
  const material = proxyMaterialAt(buffer, index);
  const edgeKind = materialEdgeAt(buffer, index);
  const anchor = surfaceAnchorAt(buffer, index);
  const transitionLaw = growthMeadowTransitionLawAt(material, edgeKind, anchor);
  const growth = Math.max(metricAt(buffer, index, 'growthTint'), metricAt(buffer, index, 'growthPotential') * 0.74);
  const edgeStrength = metricAt(buffer, index, 'materialEdgeStrength');
  const detailDensity = metricAt(buffer, index, 'surfaceDetailDensity');
  const offset = index * 3;
  const normal = {
    x: buffer.normals[offset],
    y: buffer.normals[offset + 1],
    z: buffer.normals[offset + 2]
  };

  return {
    sampleIndex: index,
    source: growthMeadowPlacementSource(material, transitionLaw, edgeKind),
    position: {
      x: buffer.positions[offset],
      y: buffer.positions[offset + 1],
      z: buffer.positions[offset + 2]
    },
    domain: {
      x: xi / Math.max(1, buffer.gridResolution.x - 1),
      z: zi / Math.max(1, buffer.gridResolution.z - 1)
    },
    normal,
    tangent: growthMeadowTangent(normal),
    proxyMaterial: material,
    transitionLaw,
    anchorFamily: cues.anchorFamily,
    anchorKind: cues.anchorKind,
    growth,
    wetness: metricAt(buffer, index, 'wetness'),
    routePressure: metricAt(buffer, index, 'routePressure'),
    slope: metricAt(buffer, index, 'slope'),
    intensity: Math.max(edgeStrength, detailDensity * 0.84, growth * 0.62)
  };
}

function growthMeadowPlacementSource(
  material: HillOfHillsProxyMaterialKind,
  transitionLaw: ReturnType<typeof growthMeadowTransitionLawAt>,
  edgeKind: HillOfHillsMaterialEdgeKind
): HillSemanticPlacementSource {
  if (transitionLaw === 'growth-thicket') {
    return 'growth-thicket';
  }
  if (edgeKind === 'growth-cluster' || material === 'growth-lip' || transitionLaw === 'vegetation-creep') {
    return 'growth-edge';
  }
  if (material === 'slope-moss') {
    return 'moss-slope';
  }
  return 'meadow';
}

function growthMeadowTangent(normal: { x: number; y: number; z: number }): HillPlacementVec2 {
  const horizontal = Math.hypot(normal.x, normal.z);
  if (horizontal > 0.02) {
    return {
      x: -normal.z / horizontal,
      z: normal.x / horizontal
    };
  }
  return { x: 1, z: 0 };
}

function growthMeadowTransitionLawAt(
  material: HillOfHillsProxyMaterialKind,
  edgeKind: HillOfHillsMaterialEdgeKind,
  anchor: HillOfHillsSurfaceAnchorKind
) {
  if (edgeKind === 'growth-cluster' || anchor === 'growth-cluster') {
    return 'growth-thicket';
  }
  if (edgeKind === 'meadow-growth' || material === 'growth-lip') {
    return 'vegetation-creep';
  }
  if (material === 'basin-meadow' || material === 'slope-moss' || anchor === 'tuft-line') {
    return 'soft-ground-fray';
  }
  return 'none';
}

function growthMeadowAnchorCues(
  buffer: HillOfHillsTerrainBuffer,
  index: number
): {
  anchorFamily: HillPlacementAffordanceFamily | 'none';
  anchorKind: HillPlacementAffordanceKind | 'none';
} {
  const material = proxyMaterialAt(buffer, index);
  const edgeKind = materialEdgeAt(buffer, index);
  const anchor = surfaceAnchorAt(buffer, index);
  const detail = surfaceDetailAt(buffer, index);
  const growth = metricAt(buffer, index, 'growthTint');

  if (anchor === 'growth-cluster' || edgeKind === 'growth-cluster' || detail === 'growth-bud') {
    return {
      anchorFamily: 'vegetation',
      anchorKind: growth > 0.72 ? 'root-clump' : 'bushlet'
    };
  }
  if (anchor === 'tuft-line' || edgeKind === 'meadow-growth' || material === 'growth-lip') {
    return {
      anchorFamily: 'vegetation',
      anchorKind: 'edge-grass'
    };
  }
  if (material === 'basin-meadow' || material === 'slope-moss' || detail === 'meadow-tuft') {
    return {
      anchorFamily: 'ground-fiber',
      anchorKind: 'trail-fiber'
    };
  }
  return {
    anchorFamily: 'none',
    anchorKind: 'none'
  };
}

function drawGrowthMeadowShaderMark(
  currentBuffer: HillOfHillsTerrainBuffer,
  candidate: HillSemanticPlacementCandidate,
  opacityMultiplier: number,
  width: number,
  height: number
): void {
  const sketch = candidate.sketch;
  const point = project(
    candidate.position.x,
    candidate.position.y,
    candidate.position.z,
    currentBuffer,
    width,
    height
  );
  const angle = Math.atan2(candidate.direction.z, candidate.direction.x) + (candidate.phase - 0.5) * 0.74;
  const length = (2.2 + sketch.fiberDensity * 8 + sketch.edgeThickening * 4) * (0.72 + candidate.scale * 0.34);
  const dx = Math.cos(angle) * length;
  const dy = Math.sin(angle) * length * 0.42;
  const alpha = opacityMultiplier * (0.72 + candidate.strength * 0.28);

  if (sketch.tintAlpha > 0) {
    ctx.fillStyle = rgba(sketch.tintRgb, sketch.tintAlpha * 0.42 * alpha);
    ctx.beginPath();
    ctx.ellipse(
      point.x + dx * 0.08,
      point.y + dy * 0.08,
      (2.4 + sketch.tuftDensity * 8) * (0.7 + candidate.scale * 0.28),
      1.2 + sketch.fiberDensity * 3.8,
      angle,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.strokeStyle = rgba(sketch.tintRgb, (0.04 + sketch.fiberDensity * 0.12) * alpha);
  ctx.lineWidth = (0.55 + sketch.edgeThickening * 0.9) * (0.76 + candidate.scale * 0.22);
  ctx.beginPath();
  ctx.moveTo(point.x - dx * 0.48, point.y - dy * 0.48);
  ctx.quadraticCurveTo(point.x + dy * 0.14, point.y - dx * 0.06, point.x + dx * 0.5, point.y + dy * 0.5);
  ctx.stroke();

  if ((candidate.kind === 'meadow-tuft' || candidate.kind === 'edge-grass' || candidate.kind === 'bushlet' || candidate.kind === 'root-clump') && sketch.tuftDensity > 0.24) {
    const tuftHeight = (2.4 + sketch.tuftDensity * 7.2) * (0.78 + candidate.scale * 0.3);
    ctx.strokeStyle = rgba([43, 118, 58], (0.07 + sketch.tuftDensity * 0.16) * alpha);
    ctx.lineWidth = 0.65 + sketch.anchorBoost * 0.75;
    ctx.beginPath();
    ctx.moveTo(point.x - dx * 0.18, point.y + dy * 0.12);
    ctx.lineTo(point.x + Math.cos(angle - 0.9) * tuftHeight * 0.55, point.y - tuftHeight * 0.7);
    ctx.lineTo(point.x + Math.cos(angle + 0.9) * tuftHeight * 0.55, point.y - tuftHeight * 0.7);
    ctx.lineTo(point.x + dx * 0.18, point.y + dy * 0.12);
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

  drawPlacementAffordanceGlyphs(
    hillPlacementAffordanceAnchorsFor(placementAffordanceInput(currentBuffer, fromIndex, toIndex, descriptor, axis)),
    center,
    tangent,
    normal
  );
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

function placementAffordanceInput(
  buffer: HillOfHillsTerrainBuffer,
  fromIndex: number,
  toIndex: number,
  descriptor: HillMaterialTransitionDescriptor,
  axis: 'x' | 'z'
) {
  const domain = transitionDomainVectors(buffer, fromIndex, toIndex, axis);
  return {
    law: descriptor.law,
    intensity: descriptor.intensity,
    seedKey: descriptor.seedKey,
    edgeKind: strongerMaterialEdgeAt(buffer, fromIndex, toIndex),
    anchor: strongerSurfaceAnchorAt(buffer, fromIndex, toIndex),
    midpoint: domain.midpoint,
    tangent: domain.tangent,
    normal: domain.normal,
    wetness: Math.max(metricAt(buffer, fromIndex, 'wetness'), metricAt(buffer, toIndex, 'wetness')),
    growth: Math.max(metricAt(buffer, fromIndex, 'growthTint'), metricAt(buffer, toIndex, 'growthTint')),
    routePressure: Math.max(metricAt(buffer, fromIndex, 'routePressure'), metricAt(buffer, toIndex, 'routePressure')),
    slope: Math.max(metricAt(buffer, fromIndex, 'slope'), metricAt(buffer, toIndex, 'slope'))
  };
}

function transitionDomainVectors(
  buffer: HillOfHillsTerrainBuffer,
  fromIndex: number,
  toIndex: number,
  axis: 'x' | 'z'
): { midpoint: HillPlacementVec2; tangent: HillPlacementVec2; normal: HillPlacementVec2 } {
  const fromOffset = fromIndex * 3;
  const toOffset = toIndex * 3;
  const from = {
    x: buffer.positions[fromOffset],
    z: buffer.positions[fromOffset + 2]
  };
  const to = {
    x: buffer.positions[toOffset],
    z: buffer.positions[toOffset + 2]
  };
  const normal = normalizeDomain2d({
    x: to.x - from.x,
    z: to.z - from.z
  });
  const tangent = axis === 'x' ? { x: -normal.z, z: normal.x } : { x: normal.z, z: -normal.x };
  return {
    midpoint: {
      x: (from.x + to.x) * 0.5,
      z: (from.z + to.z) * 0.5
    },
    tangent,
    normal
  };
}

function drawPlacementAffordanceGlyphs(
  anchors: readonly HillPlacementAffordanceAnchor[],
  center: { x: number; y: number },
  tangent: { x: number; y: number },
  normal: { x: number; y: number }
): void {
  if (anchors.length === 0) {
    return;
  }

  ctx.save();
  for (const anchor of anchors) {
    const point = {
      x: center.x + tangent.x * anchor.localOffset.along * 9 + normal.x * anchor.localOffset.cross * 9,
      y: center.y + tangent.y * anchor.localOffset.along * 9 + normal.y * anchor.localOffset.cross * 9
    };
    drawPlacementAffordanceGlyph(anchor, point, tangent, normal);
  }
  ctx.restore();
}

function drawPlacementAffordanceGlyph(
  anchor: HillPlacementAffordanceAnchor,
  point: { x: number; y: number },
  tangent: { x: number; y: number },
  normal: { x: number; y: number }
): void {
  const radius = 1.15 + anchor.scale * 1.4;
  const alpha = 0.1 + anchor.strength * 0.25;

  switch (anchor.family) {
    case 'vegetation':
      ctx.fillStyle = rgba([28, 112, 54], alpha);
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      if (anchor.kind === 'edge-grass' || anchor.kind === 'root-clump') {
        ctx.strokeStyle = rgba([58, 150, 72], alpha * 0.95);
        ctx.lineWidth = 0.75 + anchor.scale * 0.45;
        ctx.beginPath();
        ctx.moveTo(point.x - tangent.x * radius, point.y - tangent.y * radius);
        ctx.lineTo(point.x + normal.x * radius * 1.2, point.y + normal.y * radius * 1.2);
        ctx.lineTo(point.x + tangent.x * radius, point.y + tangent.y * radius);
        ctx.stroke();
      }
      break;
    case 'wet-bank':
      ctx.strokeStyle = rgba([31, 53, 86], alpha);
      ctx.lineWidth = 1 + anchor.scale * 0.6;
      ctx.beginPath();
      ctx.moveTo(point.x - tangent.x * radius * 1.4, point.y - tangent.y * radius * 1.4);
      ctx.lineTo(point.x + tangent.x * radius * 1.4, point.y + tangent.y * radius * 1.4);
      ctx.stroke();
      if (anchor.kind === 'reed-edge') {
        ctx.strokeStyle = rgba([62, 129, 74], alpha * 0.9);
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x + normal.x * radius * 1.8, point.y + normal.y * radius * 1.8);
        ctx.stroke();
      }
      break;
    case 'route-wear':
    case 'ground-fiber':
      ctx.strokeStyle = rgba([218, 199, 126], alpha);
      ctx.lineWidth = 0.75 + anchor.scale * 0.35;
      ctx.beginPath();
      ctx.moveTo(point.x - tangent.x * radius * 1.8, point.y - tangent.y * radius * 1.8);
      ctx.lineTo(point.x + tangent.x * radius * 1.8, point.y + tangent.y * radius * 1.8);
      ctx.stroke();
      break;
    case 'dry-break':
      ctx.strokeStyle = rgba([176, 139, 79], alpha);
      drawAngularPlacementGlyph(point, tangent, normal, radius);
      break;
    case 'stone-break':
      ctx.strokeStyle = rgba([78, 78, 83], alpha);
      drawAngularPlacementGlyph(point, tangent, normal, radius * 1.08);
      break;
  }
}

function drawAngularPlacementGlyph(
  point: { x: number; y: number },
  tangent: { x: number; y: number },
  normal: { x: number; y: number },
  radius: number
): void {
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.moveTo(point.x - tangent.x * radius, point.y - tangent.y * radius);
  ctx.lineTo(point.x + normal.x * radius * 0.75, point.y + normal.y * radius * 0.75);
  ctx.lineTo(point.x + tangent.x * radius * 0.8, point.y + tangent.y * radius * 0.8);
  ctx.stroke();
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

function normalizeDomain2d(vector: HillPlacementVec2): HillPlacementVec2 {
  const length = Math.hypot(vector.x, vector.z);
  if (length < 0.001) {
    return { x: 1, z: 0 };
  }
  return {
    x: vector.x / length,
    z: vector.z / length
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

function drawPressureFieldOverlay(currentBuffer: HillOfHillsTerrainBuffer, width: number, height: number): void {
  const field = previewSettings.overlays.pressureField;
  const strength = previewSettings.overlays.pressureOverlayStrength;
  if (field === 'none' || strength <= 0) {
    return;
  }

  const channel = HILL_OF_HILLS_PRESSURE_FIELD_METRIC_CHANNELS[field];
  const gridResolutionX = currentBuffer.gridResolution.x;
  const gridResolutionZ = currentBuffer.gridResolution.z;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (let zi = gridResolutionZ - 2; zi >= 0; zi -= 1) {
    for (let xi = 0; xi < gridResolutionX - 1; xi += 1) {
      const a = zi * gridResolutionX + xi;
      const b = zi * gridResolutionX + xi + 1;
      const c = (zi + 1) * gridResolutionX + xi + 1;
      const d = (zi + 1) * gridResolutionX + xi;
      const value =
        (metricAt(currentBuffer, a, channel) +
          metricAt(currentBuffer, b, channel) +
          metricAt(currentBuffer, c, channel) +
          metricAt(currentBuffer, d, channel)) *
        0.25;
      if (value < 0.03) {
        continue;
      }
      const pa = projectSample(currentBuffer, a, width, height, 0.085);
      const pb = projectSample(currentBuffer, b, width, height, 0.085);
      const pc = projectSample(currentBuffer, c, width, height, 0.085);
      const pd = projectSample(currentBuffer, d, width, height, 0.085);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.lineTo(pc.x, pc.y);
      ctx.lineTo(pd.x, pd.y);
      ctx.closePath();
      ctx.fillStyle = pressureFieldFillStyle(field, value, strength);
      ctx.fill();
    }
  }
  ctx.restore();
}

function pressureFieldFillStyle(field: HillOfHillsPressureFieldKind, value: number, strength: number): string {
  const [red, green, blue] = pressureFieldColor(field);
  const alpha = clamp((0.05 + value * 0.28) * strength, 0, 0.38);
  return `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`;
}

function pressureFieldColor(field: HillOfHillsPressureFieldKind): readonly [number, number, number] {
  switch (field) {
    case 'slope':
    case 'curvature':
    case 'exposure':
    case 'strata':
      return [232, 207, 132];
    case 'ridge':
      return [109, 213, 141];
    case 'valley':
    case 'basin':
    case 'erosion':
      return [79, 140, 196];
    case 'saddle':
    case 'route':
      return [200, 179, 104];
    case 'bloom':
    case 'vegetation':
      return [48, 184, 96];
  }
}

function drawTopologyOverlays(currentBuffer: HillOfHillsTerrainBuffer, width: number, height: number): void {
  const gridResolutionX = currentBuffer.gridResolution.x;
  const gridResolutionZ = currentBuffer.gridResolution.z;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  drawTopographicContours(currentBuffer, width, height);

  const overlayControls = previewSettings.overlays;
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
      strokeOverlayPath(hillOverlayStrokeStyle('ditch', strength, overlayControls));
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
      strokeOverlayPath(hillOverlayStrokeStyle('phaseDitch', strength, overlayControls));
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
        strokeOverlayPath(hillOverlayStrokeStyle('trail', strength, overlayControls));
        ctx.beginPath();
        drawing = false;
        strength = 0;
        runSampleCount = 0;
      }
    }
    if (strength > 0) {
      strokeOverlayPath(hillOverlayStrokeStyle('trail', strength, overlayControls));
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

function drawTopographicContours(currentBuffer: HillOfHillsTerrainBuffer, width: number, height: number): void {
  const strength = previewSettings.overlays.topographicContourStrength;
  if (strength <= 0) {
    return;
  }

  const spacing = previewSettings.overlays.topographicContourSpacing;
  const style = hillOverlayStrokeStyle('topographicContour', 1, {
    topographicContourStrength: strength
  });
  if (style.alpha <= 0) {
    return;
  }

  const gridResolutionX = currentBuffer.gridResolution.x;
  const gridResolutionZ = currentBuffer.gridResolution.z;

  ctx.strokeStyle = style.strokeStyle;
  ctx.lineWidth = style.lineWidth;
  ctx.beginPath();
  for (let zi = 0; zi < gridResolutionZ - 1; zi += 1) {
    for (let xi = 0; xi < gridResolutionX - 1; xi += 1) {
      const a = zi * gridResolutionX + xi;
      const b = a + 1;
      const c = a + gridResolutionX + 1;
      const d = a + gridResolutionX;
      drawTopographicContourCell(currentBuffer, a, b, c, d, spacing, width, height);
    }
  }
  ctx.stroke();
}

function drawTopographicContourCell(
  currentBuffer: HillOfHillsTerrainBuffer,
  a: number,
  b: number,
  c: number,
  d: number,
  spacing: number,
  width: number,
  height: number
): void {
  const ha = metricAt(currentBuffer, a, 'height');
  const hb = metricAt(currentBuffer, b, 'height');
  const hc = metricAt(currentBuffer, c, 'height');
  const hd = metricAt(currentBuffer, d, 'height');
  const minHeight = Math.min(ha, hb, hc, hd);
  const maxHeight = Math.max(ha, hb, hc, hd);
  const firstLevel = Math.ceil(minHeight / spacing) * spacing;

  for (let level = firstLevel; level <= maxHeight; level += spacing) {
    const crossings: { x: number; y: number }[] = [];
    addContourCrossing(currentBuffer, crossings, a, b, ha, hb, level, width, height);
    addContourCrossing(currentBuffer, crossings, b, c, hb, hc, level, width, height);
    addContourCrossing(currentBuffer, crossings, c, d, hc, hd, level, width, height);
    addContourCrossing(currentBuffer, crossings, d, a, hd, ha, level, width, height);

    for (let i = 1; i < crossings.length; i += 2) {
      const from = crossings[i - 1];
      const to = crossings[i];
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
    }
  }
}

function addContourCrossing(
  currentBuffer: HillOfHillsTerrainBuffer,
  crossings: { x: number; y: number }[],
  fromIndex: number,
  toIndex: number,
  fromHeight: number,
  toHeight: number,
  level: number,
  width: number,
  height: number
): void {
  if (fromHeight === toHeight) {
    return;
  }
  const lower = Math.min(fromHeight, toHeight);
  const upper = Math.max(fromHeight, toHeight);
  if (level < lower || level > upper) {
    return;
  }
  const t = clamp((level - fromHeight) / (toHeight - fromHeight), 0, 1);
  const fromOffset = fromIndex * 3;
  const toOffset = toIndex * 3;
  crossings.push(
    project(
      lerp(currentBuffer.positions[fromOffset], currentBuffer.positions[toOffset], t),
      lerp(currentBuffer.positions[fromOffset + 1], currentBuffer.positions[toOffset + 1], t) + 0.14,
      lerp(currentBuffer.positions[fromOffset + 2], currentBuffer.positions[toOffset + 2], t),
      currentBuffer,
      width,
      height
    )
  );
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
  if (style.alpha <= 0 || style.lineWidth <= 0) {
    return;
  }
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
    `topology phase: ${witness.effectiveParams.topologyPhaseTimeMs.toFixed(0)}ms clock ${witness.topologyPhaseClock.toFixed(2)} progress ${witness.topologyPhaseProgress.toFixed(2)}`,
    `dynamics: ${witness.topologyDynamicsMode} origin ${witness.topologyDynamicsIntegrationOriginMs.toFixed(0)}ms ${compactChecksum(witness.topologyDynamicsChecksum)}`,
    `dynamics range: deformation ${witness.topologyDeformationRange.min.toFixed(3)}..${witness.topologyDeformationRange.max.toFixed(3)} velocity ${witness.topologyVelocityRange.min.toFixed(3)}..${witness.topologyVelocityRange.max.toFixed(3)} force ${witness.topologyForceRange.min.toFixed(3)}..${witness.topologyForceRange.max.toFixed(3)} swell ${witness.hillSwellMembershipRange.min.toFixed(2)}..${witness.hillSwellMembershipRange.max.toFixed(2)} slump ${witness.hillSlumpMembershipRange.min.toFixed(2)}..${witness.hillSlumpMembershipRange.max.toFixed(2)}`,
    `phase checksum: ${witness.phaseChecksum} / influence ${witness.phaseInfluenceChecksum}`,
    `trail seed: ${witness.trailSeedMethod} / candidates ${witness.trailCandidateChecksum}`,
    `trail score: ${witness.trailCandidateScoreRange.min.toFixed(2)} .. ${witness.trailCandidateScoreRange.max.toFixed(2)} / selected ${witness.selectedTrailScoreRange.min.toFixed(2)} .. ${witness.selectedTrailScoreRange.max.toFixed(2)}`,
    `phase influence: ${witness.phaseInfluenceRange.min.toFixed(2)} .. ${witness.phaseInfluenceRange.max.toFixed(2)}`,
    `trail ${witness.trailInfluenceRange.max.toFixed(2)} side-ditch ${witness.sideDitchInfluenceRange.max.toFixed(2)} topology ${witness.topologyInfluenceRange.max.toFixed(2)}`,
    `support: ${witness.supportFrame.supportClass} / ${witness.supportFrame.mappingMode}`,
    `support motion: delta ${witness.supportFrame.maxHeightDelta.toFixed(3)} speed ${witness.supportFrame.maxSurfaceSpeed.toFixed(2)} dirty ${witness.supportFrame.dirtySubstrateTileCount}/${witness.supportFrame.substrateTileCount}`,
    `worker: ${workerStatus} req ${latestTerrainRequestId} pending ${pendingTerrainRequestId || 'none'} duration ${latestWorkerDurationMs.toFixed(1)}ms`,
    `worker error: ${latestWorkerError}`,
    `route ${witness.topologyRanges.routePressure.max.toFixed(2)} ditch ${witness.topologyRanges.ditchPotential.max.toFixed(2)} growth ${witness.topologyRanges.growthPotential.max.toFixed(2)}`,
    `floor ${witness.effectiveParams.floorWidth.toFixed(1)} radius ${witness.effectiveParams.channelRadius.toFixed(1)} wall ${witness.effectiveParams.wallHeight.toFixed(1)}`,
    `layers: ${activePreviewLayerSummary()}`,
    `growth skin: density ${previewSettings.growthSkin.density.toFixed(2)} opacity ${previewSettings.growthSkin.opacity.toFixed(2)}`,
    `overlays: lines ${previewSettings.overlays.topologyLineStrength.toFixed(2)} contours ${previewSettings.overlays.topographicContourStrength.toFixed(2)} spacing ${previewSettings.overlays.topographicContourSpacing.toFixed(2)} pressure ${previewSettings.overlays.pressureField} ${previewSettings.overlays.pressureOverlayStrength.toFixed(2)}`,
    `pressure: ${pressureFieldWitnessSummary(witness)}`,
    latestGrowthPlacementSummary,
    `view yaw ${viewState.yaw.toFixed(2)} tilt ${viewState.tilt.toFixed(2)} zoom ${viewState.zoom.toFixed(2)} motion ${viewState.motionSpeed.toFixed(2)}`
  ].join('\n');
}

function pressureFieldWitnessSummary(witness: HillOfHillsTerrainBuffer['witness']): string {
  const field = previewSettings.overlays.pressureField;
  if (field === 'none') {
    return `off vocab ${witness.pressureFieldVocabulary.length} ${compactChecksum(witness.pressureFieldChecksum)}`;
  }
  const range = witness.pressureFieldRanges[field];
  const comfort = witness.pressureFieldComfort[field];
  return `${field} ${range.min.toFixed(2)}..${range.max.toFixed(2)} comfort ${comfort.inside}/${witness.sampleCount} viol ${comfort.maxViolation.toFixed(2)} ${compactChecksum(witness.pressureFieldChecksum)}`;
}

function activePreviewLayerSummary(): string {
  const labels: Record<HillPreviewLayerKey, string> = {
    base: 'base',
    transitions: 'trans',
    edgeDissolves: 'edge',
    surfaceDetails: 'detail',
    topologyOverlays: 'topo',
    growthSkin: 'growth',
    routeMarkers: 'route'
  };
  return previewLayerSpecs
    .filter((spec) => previewSettings.layers[spec.key])
    .map((spec) => labels[spec.key])
    .join(' ');
}

function createControls(): { element: HTMLElement } {
  const element = document.createElement('section');
  element.className = 'terrain-controls';
  appendTopologyDynamicsModeControl(element);

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
      persistParamSettings();
      value.value = nextValue.toFixed(2);
    });

    row.append(name, input, value);
    element.append(row);
  }
  appendTopologyEventClassControls(element);

  const style = document.createElement('style');
  style.textContent = `
    .terrain-controls,
    .view-controls,
    .preview-debug-controls {
      position: fixed;
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
      right: 16px;
      top: 16px;
      max-height: calc(100vh - 200px);
    }
    .view-controls {
      right: 16px;
      bottom: 16px;
    }
    .preview-debug-controls {
      left: 16px;
      bottom: 16px;
      width: min(280px, calc(100vw - 32px));
      max-height: calc(100vh - 250px);
    }
    .preview-debug-controls h2 {
      margin: 0 0 8px;
      color: #d7f7e8;
      font: inherit;
      font-weight: 700;
    }
    .terrain-controls label,
    .view-controls label,
    .preview-debug-range {
      display: grid;
      grid-template-columns: minmax(96px, 1fr) minmax(0, 1.3fr) 44px;
      gap: 8px;
      align-items: center;
      min-height: 26px;
    }
    .topology-event-controls {
      display: grid;
      gap: 8px;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid rgba(242, 223, 160, 0.18);
    }
    .topology-dynamics-control {
      display: grid;
      grid-template-columns: minmax(96px, 1fr) minmax(0, 1.3fr);
      gap: 8px;
      align-items: center;
      margin: 10px 0 0;
      padding: 10px 0 0;
      border: 0;
      border-top: 1px solid rgba(242, 223, 160, 0.18);
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
    }
    .topology-dynamics-label {
      min-width: 0;
    }
    .topology-dynamics-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 26px;
      border: 1px solid rgba(136, 224, 186, 0.24);
      border-radius: 6px;
      overflow: hidden;
    }
    .topology-dynamics-options label {
      display: grid;
      grid-template-columns: 1fr;
      min-height: 26px;
      cursor: pointer;
    }
    .topology-dynamics-options label + label {
      border-left: 1px solid rgba(136, 224, 186, 0.24);
    }
    .topology-dynamics-options input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .topology-dynamics-options span {
      display: grid;
      place-items: center;
      padding: 4px 6px;
      color: rgba(244, 227, 176, 0.78);
    }
    .topology-dynamics-options input:checked + span {
      background: rgba(136, 224, 186, 0.2);
      color: #d7f7e8;
    }
    .topology-event-controls h2 {
      margin: 0;
      color: #d7f7e8;
      font: inherit;
      font-weight: 700;
    }
    .topology-event-card {
      display: grid;
      gap: 6px;
      padding: 8px;
      border: 1px solid rgba(136, 224, 186, 0.18);
      background: rgba(8, 23, 19, 0.54);
      border-radius: 6px;
    }
    .topology-event-card-header {
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr) minmax(84px, 0.8fr);
      gap: 8px;
      align-items: center;
    }
    .topology-event-card-header strong {
      color: #d7f7e8;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .topology-event-card select {
      width: 100%;
      min-width: 0;
      border: 1px solid rgba(136, 224, 186, 0.24);
      background: rgba(3, 9, 8, 0.86);
      color: #f4e3b0;
      font: inherit;
    }
    .phase-filmstrip-export {
      display: grid;
      gap: 8px;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid rgba(242, 223, 160, 0.18);
    }
    .phase-filmstrip-export label {
      display: grid;
      grid-template-columns: minmax(96px, 1fr) minmax(0, 1fr);
      gap: 8px;
      align-items: center;
    }
    .phase-filmstrip-export select {
      width: 100%;
      min-width: 0;
      border: 1px solid rgba(136, 224, 186, 0.24);
      background: rgba(3, 9, 8, 0.86);
      color: #f4e3b0;
      font: inherit;
    }
    .phase-filmstrip-status {
      color: rgba(215, 247, 232, 0.82);
      min-height: 1.25em;
    }
    .preview-debug-toggle {
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr);
      gap: 8px;
      align-items: center;
      min-height: 24px;
    }
    .terrain-controls input,
    .view-controls input,
    .preview-debug-controls input {
      width: 100%;
      min-width: 0;
      accent-color: #d5b64f;
    }
    .preview-debug-toggle input {
      width: 14px;
      height: 14px;
    }
    .terrain-controls output,
    .view-controls output,
    .preview-debug-controls output {
      color: #88e0ba;
      text-align: right;
    }
    .view-controls button,
    .preview-debug-controls button {
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
      max-height: calc(100vh - 360px);
      overflow: auto;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      padding: 12px;
      border: 1px solid rgba(136, 224, 186, 0.25);
      background: rgba(3, 9, 8, 0.76);
      color: #d7f7e8;
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
      backdrop-filter: blur(8px);
    }
    @media (max-width: 780px) {
      .terrain-controls {
        top: 12px;
        bottom: auto;
        right: 12px;
        width: calc(100vw - 24px);
        max-height: 84px;
      }
      .preview-debug-controls {
        left: 12px;
        bottom: 156px;
        width: min(220px, calc(100vw - 24px));
        max-height: 110px;
      }
      .view-controls {
        right: 12px;
        bottom: 12px;
        width: calc(100vw - 24px);
        max-height: 132px;
      }
      .terrain-witness {
        left: 12px;
        top: 108px;
        max-width: calc(100vw - 24px);
        max-height: 150px;
      }
    }
  `;
  document.head.append(style);

  return { element };
}

function appendTopologyEventClassControls(parent: HTMLElement): void {
  const section = document.createElement('div');
  const title = document.createElement('h2');
  section.className = 'topology-event-controls';
  title.textContent = 'Topology gestures';
  section.append(title);

  for (const kind of HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS) {
    section.append(createTopologyEventClassCard(kind));
  }

  parent.append(section);
}

function appendTopologyDynamicsModeControl(parent: HTMLElement): void {
  const fieldset = document.createElement('div');
  const legend = document.createElement('span');
  const options = document.createElement('div');
  fieldset.className = 'topology-dynamics-control';
  fieldset.role = 'radiogroup';
  fieldset.setAttribute('aria-label', 'Topology dynamics');
  legend.className = 'topology-dynamics-label';
  legend.textContent = 'Topology dynamics';
  options.className = 'topology-dynamics-options';

  const modeOptions: readonly { value: HillOfHillsTopologyDynamicsMode; label: string }[] = [
    { value: 'direct_synthesis', label: 'Direct' },
    { value: 'persistent_pressure', label: 'Pressure' }
  ];
  for (const mode of modeOptions) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    const text = document.createElement('span');
    input.type = 'radio';
    input.name = 'topology-dynamics-mode';
    input.value = mode.value;
    input.checked = params.topologyDynamicsMode === mode.value;
    input.addEventListener('input', () => {
      if (!input.checked) return;
      params = {
        ...params,
        topologyDynamicsMode: mode.value
      };
      persistParamSettings();
    });
    text.textContent = mode.label;
    label.append(input, text);
    options.append(label);
  }

  fieldset.append(legend, options);
  parent.append(fieldset);
}

function createTopologyEventClassCard(kind: HillOfHillsTopologyPhaseKind): HTMLElement {
  const card = document.createElement('div');
  const header = document.createElement('div');
  const enabled = document.createElement('input');
  const title = document.createElement('strong');
  const gesture = document.createElement('select');
  const config = params.topologyEventClasses[kind];

  card.className = 'topology-event-card';
  header.className = 'topology-event-card-header';
  enabled.type = 'checkbox';
  enabled.checked = config.enabled;
  enabled.title = `${topologyEventLabel(kind)} enabled`;
  enabled.addEventListener('input', () => updateTopologyEventClass(kind, { enabled: enabled.checked }));
  title.textContent = topologyEventLabel(kind);
  for (const preset of HILL_OF_HILLS_TOPOLOGY_GESTURE_PRESETS) {
    const option = document.createElement('option');
    option.value = preset;
    option.textContent = preset;
    gesture.append(option);
  }
  gesture.value = config.gesture;
  gesture.addEventListener('input', () => updateTopologyEventClass(kind, { gesture: gesture.value as HillOfHillsTopologyEventClassConfig['gesture'] }));
  header.append(enabled, title, gesture);
  card.append(header);

  card.append(
    createTopologyEventClassSlider(kind, 'appetite', 'Appetite', 0, 2, 0.05),
    createTopologyEventClassSlider(kind, 'force', 'Force', 0, 2, 0.05),
    createTopologyEventClassSlider(kind, 'phaseOffset', 'Phase', 0, 1, 0.01),
    createTopologyEventClassSlider(kind, 'spread', 'Spread', 0.25, 2, 0.05)
  );

  return card;
}

function createTopologyEventClassSlider(
  kind: HillOfHillsTopologyPhaseKind,
  key: 'appetite' | 'force' | 'phaseOffset' | 'spread',
  label: string,
  min: number,
  max: number,
  step: number
): HTMLElement {
  const row = document.createElement('label');
  const name = document.createElement('span');
  const input = document.createElement('input');
  const value = document.createElement('output');
  const currentValue = params.topologyEventClasses[kind][key];
  name.textContent = label;
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(currentValue);
  value.value = currentValue.toFixed(2);
  input.addEventListener('input', () => {
    const nextValue = Number(input.value);
    updateTopologyEventClass(kind, { [key]: nextValue });
    value.value = nextValue.toFixed(2);
  });
  row.append(name, input, value);
  return row;
}

function updateTopologyEventClass(kind: HillOfHillsTopologyPhaseKind, patch: Partial<HillOfHillsTopologyEventClassConfig>): void {
  params = {
    ...params,
    topologyEventClasses: {
      ...params.topologyEventClasses,
      [kind]: {
        ...params.topologyEventClasses[kind],
        ...patch
      }
    }
  };
  persistParamSettings();
}

function topologyEventLabel(kind: HillOfHillsTopologyPhaseKind): string {
  return kind.replaceAll('_', ' ');
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

function createPreviewDebugControls(): { element: HTMLElement; refresh: () => void } {
  const element = document.createElement('section');
  element.className = 'preview-debug-controls';
  const title = document.createElement('h2');
  title.textContent = 'Preview layers';
  element.append(title);

  const checkboxes = new Map<HillPreviewLayerKey, HTMLInputElement>();
  for (const spec of previewLayerSpecs) {
    const row = document.createElement('label');
    const input = document.createElement('input');
    const name = document.createElement('span');

    row.className = 'preview-debug-toggle';
    input.type = 'checkbox';
    input.checked = previewSettings.layers[spec.key];
    input.addEventListener('change', () => {
      previewSettings = {
        ...previewSettings,
        layers: {
          ...previewSettings.layers,
          [spec.key]: input.checked
        }
      };
      persistPreviewSettings();
    });
    name.textContent = spec.label;

    checkboxes.set(spec.key, input);
    row.append(input, name);
    element.append(row);
  }

  const density = createPreviewDebugRange(
    'Growth density',
    previewSettings.growthSkin.density,
    HILL_PREVIEW_GROWTH_SKIN_DENSITY_RANGE.min,
    HILL_PREVIEW_GROWTH_SKIN_DENSITY_RANGE.max,
    0.05,
    (value) => {
      previewSettings = {
        ...previewSettings,
        growthSkin: {
          ...previewSettings.growthSkin,
          density: value
        }
      };
      persistPreviewSettings();
    }
  );
  const opacity = createPreviewDebugRange(
    'Growth opacity',
    previewSettings.growthSkin.opacity,
    HILL_PREVIEW_GROWTH_SKIN_OPACITY_RANGE.min,
    HILL_PREVIEW_GROWTH_SKIN_OPACITY_RANGE.max,
    0.05,
    (value) => {
      previewSettings = {
        ...previewSettings,
        growthSkin: {
          ...previewSettings.growthSkin,
          opacity: value
        }
      };
      persistPreviewSettings();
    }
  );
  const topologyLines = createPreviewDebugRange(
    'Topology lines',
    previewSettings.overlays.topologyLineStrength,
    HILL_PREVIEW_TOPOLOGY_LINE_STRENGTH_RANGE.min,
    HILL_PREVIEW_TOPOLOGY_LINE_STRENGTH_RANGE.max,
    0.05,
    (value) => {
      previewSettings = {
        ...previewSettings,
        overlays: {
          ...previewSettings.overlays,
          topologyLineStrength: value
        }
      };
      persistPreviewSettings();
    }
  );
  const topographicContours = createPreviewDebugRange(
    'Topo contours',
    previewSettings.overlays.topographicContourStrength,
    HILL_PREVIEW_TOPOGRAPHIC_CONTOUR_STRENGTH_RANGE.min,
    HILL_PREVIEW_TOPOGRAPHIC_CONTOUR_STRENGTH_RANGE.max,
    0.05,
    (value) => {
      previewSettings = {
        ...previewSettings,
        overlays: {
          ...previewSettings.overlays,
          topographicContourStrength: value
        }
      };
      persistPreviewSettings();
    }
  );
  const contourSpacing = createPreviewDebugRange(
    'Contour spacing',
    previewSettings.overlays.topographicContourSpacing,
    HILL_PREVIEW_TOPOGRAPHIC_CONTOUR_SPACING_RANGE.min,
    HILL_PREVIEW_TOPOGRAPHIC_CONTOUR_SPACING_RANGE.max,
    0.05,
    (value) => {
      previewSettings = {
        ...previewSettings,
        overlays: {
          ...previewSettings.overlays,
          topographicContourSpacing: value
        }
      };
      persistPreviewSettings();
    }
  );
  const pressureField = createPreviewDebugSelect<HillPreviewPressureFieldSelection>(
    'Pressure field',
    ['none', ...HILL_OF_HILLS_PRESSURE_FIELD_KINDS],
    previewSettings.overlays.pressureField,
    (value) => {
      previewSettings = {
        ...previewSettings,
        overlays: {
          ...previewSettings.overlays,
          pressureField: value
        }
      };
      persistPreviewSettings();
    }
  );
  const pressureStrength = createPreviewDebugRange(
    'Pressure strength',
    previewSettings.overlays.pressureOverlayStrength,
    HILL_PREVIEW_PRESSURE_OVERLAY_STRENGTH_RANGE.min,
    HILL_PREVIEW_PRESSURE_OVERLAY_STRENGTH_RANGE.max,
    0.05,
    (value) => {
      previewSettings = {
        ...previewSettings,
        overlays: {
          ...previewSettings.overlays,
          pressureOverlayStrength: value
        }
      };
      persistPreviewSettings();
    }
  );

  element.append(
    density.row,
    opacity.row,
    topologyLines.row,
    topographicContours.row,
    contourSpacing.row,
    pressureField.row,
    pressureStrength.row
  );
  element.append(createPhaseFilmstripExportControls());

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Reset preview';
  reset.addEventListener('click', () => {
    previewSettings = defaultHillPreviewSettings();
    refresh();
    persistPreviewSettings();
  });
  element.append(reset);

  function refresh(): void {
    for (const spec of previewLayerSpecs) {
      const input = checkboxes.get(spec.key);
      if (input) input.checked = previewSettings.layers[spec.key];
    }
    density.setValue(previewSettings.growthSkin.density);
    opacity.setValue(previewSettings.growthSkin.opacity);
    topologyLines.setValue(previewSettings.overlays.topologyLineStrength);
    topographicContours.setValue(previewSettings.overlays.topographicContourStrength);
    contourSpacing.setValue(previewSettings.overlays.topographicContourSpacing);
    pressureField.setValue(previewSettings.overlays.pressureField);
    pressureStrength.setValue(previewSettings.overlays.pressureOverlayStrength);
  }

  return { element, refresh };
}

function createPhaseFilmstripExportControls(): HTMLElement {
  const section = document.createElement('div');
  const label = document.createElement('label');
  const name = document.createElement('span');
  const select = document.createElement('select');
  const button = document.createElement('button');
  const reportButton = document.createElement('button');
  const status = document.createElement('div');
  let lastExport: HillPhaseFilmstripExportResult | undefined;

  section.className = 'phase-filmstrip-export';
  name.textContent = 'Phase strip';
  for (const count of HILL_PHASE_FILMSTRIP_FRAME_COUNTS) {
    const option = document.createElement('option');
    option.value = String(count);
    option.textContent = `${count} frames`;
    select.append(option);
  }
  select.value = '10';
  button.type = 'button';
  button.textContent = 'Export phase strip';
  reportButton.type = 'button';
  reportButton.textContent = 'Download continuity JSON';
  reportButton.disabled = true;
  status.className = 'phase-filmstrip-status';
  status.textContent = 'next salient topology points';
  button.addEventListener('click', () => {
    const frameCount = normalizeHillPhaseFilmstripFrameCount(select.value);
    button.disabled = true;
    status.textContent = `rendering ${frameCount} frames`;
    window.setTimeout(() => {
      try {
        const result = exportHillPhaseFilmstrip(frameCount);
        lastExport = result;
        reportButton.disabled = false;
        status.textContent = `${result.filename} exported; JSON staged (${result.frameCount} frames)`;
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : String(error);
      } finally {
        button.disabled = false;
      }
    }, 0);
  });
  reportButton.addEventListener('click', () => {
    if (!lastExport) {
      status.textContent = 'export a phase strip first';
      return;
    }

    downloadJson(lastExport.reportFilename, lastExport.report);
    status.textContent = `${lastExport.reportFilename} downloaded`;
  });

  label.append(name, select);
  section.append(label, button, reportButton, status);
  return section;
}

function exportHillPhaseFilmstrip(frameCount: HillPhaseFilmstripFrameCount): HillPhaseFilmstripExportResult {
  const schedule = createHillPhaseFilmstripSchedule(params, frameCount);
  const layout = fitHillPhaseFilmstripLayout(frameCount);
  const viewport = phaseFilmstripRenderViewport();
  const stripCanvas = document.createElement('canvas');
  const stripCtx = stripCanvas.getContext('2d');
  const frameCanvas = document.createElement('canvas');
  const frameCtx = frameCanvas.getContext('2d');
  const renderCanvas = document.createElement('canvas');
  const renderCtx = renderCanvas.getContext('2d');

  if (!stripCtx || !frameCtx || !renderCtx) {
    throw new Error('phase strip canvas unavailable');
  }

  stripCanvas.width = layout.width;
  stripCanvas.height = layout.height;
  frameCanvas.width = layout.cellWidth;
  frameCanvas.height = layout.cellHeight;
  renderCanvas.width = viewport.width;
  renderCanvas.height = viewport.height;

  stripCtx.fillStyle = '#06100d';
  stripCtx.fillRect(0, 0, layout.width, layout.height);

  const savedCtx = ctx;
  const filmstripCache = createHillOfHillsLayerTileCache();
  const frameTerrains: HillOfHillsTerrain[] = [];
  let previousFrame: HillPhaseFilmstripFrame | undefined;
  let previousTerrain: HillOfHillsTerrain | undefined;

  try {
    for (const frame of schedule) {
      const frameParams = phaseFilmstripParamsFor(frame);
      const frameTerrain = createHillOfHillsTerrainWithCache(filmstripCache, frameParams, {
          ...previewSourceOptions,
          frameId: `hill-of-hills-phase-filmstrip-${frame.index}`,
          timestampMs: performance.now() + frame.phaseTimeMs
      });
      frameTerrains.push(frameTerrain);
      const frameBuffer = createHillOfHillsTerrainBuffer(frameTerrain);
      const continuityDelta =
        previousFrame && previousTerrain
          ? compareHillPhaseContinuityFrames(previousFrame, previousTerrain, frame, frameTerrain)
          : undefined;
      const column = frame.index % layout.columns;
      const row = Math.floor(frame.index / layout.columns);
      const x = column * (layout.cellWidth + layout.gutter);
      const y = row * (layout.cellHeight + layout.gutter);

      ctx = renderCtx;
      renderCtx.setTransform(1, 0, 0, 1, 0, 0);
      renderCtx.clearRect(0, 0, viewport.width, viewport.height);
      renderCtx.fillStyle = '#06100d';
      renderCtx.fillRect(0, 0, viewport.width, viewport.height);
      drawTerrain(frameBuffer, viewport.width, viewport.height);
      if (previewSettings.layers.routeMarkers) {
        drawRouteMarkers(frameBuffer, viewport.width, viewport.height);
      }

      ctx = frameCtx;
      frameCtx.setTransform(1, 0, 0, 1, 0, 0);
      frameCtx.clearRect(0, 0, layout.cellWidth, layout.cellHeight);
      frameCtx.fillStyle = '#06100d';
      frameCtx.fillRect(0, 0, layout.cellWidth, layout.cellHeight);
      drawPhaseFilmstripFrameImage(frameCtx, renderCanvas, layout.cellWidth, layout.cellHeight - PHASE_FILMSTRIP_CAPTION_HEIGHT);
      drawPhaseFilmstripCaption(frameCtx, frameBuffer, frame, continuityDelta, layout.cellWidth, layout.cellHeight);
      stripCtx.drawImage(frameCanvas, x, y);
      previousFrame = frame;
      previousTerrain = frameTerrain;
    }
  } finally {
    ctx = savedCtx;
  }

  const timestamp = Date.now();
  const filename = `hill-of-hills-phase-strip-${frameCount}-${timestamp}.png`;
  const reportFilename = `hill-of-hills-phase-strip-${frameCount}-${timestamp}.continuity.json`;
  const report = createHillPhaseContinuityReport(schedule, frameTerrains, {
    requestedParams: params,
    requireExactControls: true,
    requestedSource: {
      route: previewSourceOptions.route,
      configId: previewSourceOptions.configId
    }
  });
  const anchor = document.createElement('a');
  anchor.href = stripCanvas.toDataURL('image/png');
  anchor.download = filename;
  anchor.click();

  return { filename, reportFilename, frameCount, report };
}

function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  try {
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(href);
  }
}

function phaseFilmstripRenderViewport(): { width: number; height: number } {
  return {
    width: Math.max(1, Math.round(window.innerWidth)),
    height: Math.max(1, Math.round(window.innerHeight))
  };
}

function drawPhaseFilmstripFrameImage(
  targetCtx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  width: number,
  height: number
): void {
  const fit = fitHillPhaseFilmstripViewport(sourceCanvas.width, sourceCanvas.height, width, height);
  targetCtx.drawImage(sourceCanvas, fit.x, fit.y, fit.width, fit.height);
}

function phaseFilmstripParamsFor(frame: HillPhaseFilmstripFrame): HillOfHillsTerrainParams {
  return {
    ...params,
    topologyPhaseTimeMs: frame.phaseTimeMs
  };
}

function drawPhaseFilmstripCaption(
  targetCtx: CanvasRenderingContext2D,
  currentBuffer: HillOfHillsTerrainBuffer,
  frame: HillPhaseFilmstripFrame,
  continuityDelta: HillPhaseContinuityDelta | undefined,
  width: number,
  height: number
): void {
  const activeKinds = Object.entries(currentBuffer.witness.activePhaseKinds)
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([kind, count]) => `${kind.replaceAll('_', ' ')} ${count}`)
    .slice(0, 2)
    .join(' / ') || 'none';
  const phaseHash = compactChecksum(currentBuffer.witness.phaseChecksum);
  const influenceHash = compactChecksum(currentBuffer.witness.phaseInfluenceChecksum);
  const topologyHash = compactChecksum(currentBuffer.witness.topologyChecksum);
  const eventSummary = activeTopologyEventSummary(currentBuffer);
  const captionHeight = PHASE_FILMSTRIP_CAPTION_HEIGHT;

  targetCtx.save();
  targetCtx.fillStyle = 'rgba(3, 9, 8, 0.74)';
  targetCtx.fillRect(0, height - captionHeight, width, captionHeight);
  targetCtx.fillStyle = '#d7f7e8';
  targetCtx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  targetCtx.textBaseline = 'top';
  targetCtx.fillText(
    `#${String(frame.index + 1).padStart(2, '0')} ${frame.reason} clock ${frame.clock.toFixed(2)} epoch ${frame.epoch}`,
    8,
    height - captionHeight + 5
  );
  targetCtx.fillStyle = 'rgba(244, 227, 176, 0.9)';
  targetCtx.fillText(`active ${activeKinds} ph ${phaseHash} infl ${influenceHash} topo ${topologyHash}`, 8, height - captionHeight + 18);
  targetCtx.fillStyle = 'rgba(183, 224, 205, 0.88)';
  targetCtx.fillText(eventSummary, 8, height - captionHeight + 31);
  targetCtx.fillStyle = continuityDelta && continuityDelta.suspicions.length > 0 ? 'rgba(255, 199, 135, 0.94)' : 'rgba(183, 224, 205, 0.74)';
  targetCtx.fillText(continuityDelta ? formatHillPhaseContinuityDelta(continuityDelta) : 'delta origin', 8, height - captionHeight + 44);
  targetCtx.restore();
}

function compactChecksum(value: string | undefined, length = 7): string {
  if (!value || value === 'none') {
    return 'none';
  }
  return value.slice(0, length);
}

function activeTopologyEventSummary(currentBuffer: HillOfHillsTerrainBuffer): string {
  const events = currentBuffer.witness.topologyEventDebug.slice(0, 3);
  if (events.length === 0) {
    return 'events none';
  }
  return events
    .map((event) => {
      const lifecycle = event.supportLifecycle.slice(0, 1);
      return `${lifecycle}${event.supportEpoch}:${event.kind}:${compactChecksum(event.id, 4)} a${event.envelope.amount.toFixed(2)} s${event.supportAmount.toFixed(2)} i${event.envelope.intensity.toFixed(2)}`;
    })
    .join(' ');
}

function createPreviewDebugRange(
  label: string,
  initialValue: number,
  min: number,
  max: number,
  step: number,
  onInput: (value: number) => void
): { row: HTMLElement; setValue: (value: number) => void } {
  const row = document.createElement('label');
  const name = document.createElement('span');
  const input = document.createElement('input');
  const value = document.createElement('output');

  row.className = 'preview-debug-range';
  name.textContent = label;
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(initialValue);
  value.value = initialValue.toFixed(2);
  input.addEventListener('input', () => {
    const nextValue = Number(input.value);
    value.value = nextValue.toFixed(2);
    onInput(nextValue);
  });
  row.append(name, input, value);

  return {
    row,
    setValue(nextValue: number): void {
      input.value = String(nextValue);
      value.value = nextValue.toFixed(2);
    }
  };
}

function createPreviewDebugSelect<T extends string>(
  label: string,
  options: readonly T[],
  initialValue: T,
  onInput: (value: T) => void
): { row: HTMLElement; setValue: (value: T) => void } {
  const row = document.createElement('label');
  const name = document.createElement('span');
  const input = document.createElement('select');

  row.className = 'preview-debug-range';
  name.textContent = label;
  for (const option of options) {
    const item = document.createElement('option');
    item.value = option;
    item.textContent = option;
    input.append(item);
  }
  input.value = initialValue;
  input.addEventListener('change', () => onInput(input.value as T));
  row.append(name, input);

  return {
    row,
    setValue(nextValue: T): void {
      input.value = nextValue;
    }
  };
}

function persistPreviewSettings(): void {
  saveHillPreviewSettings(safePreviewSettingsStorage(), previewSettings);
}

function persistParamSettings(): void {
  saveHillOfHillsParamSettings(safeParamSettingsStorage(), params);
}

function safeParamSettingsStorage(): HillOfHillsParamSettingsStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function safePreviewSettingsStorage(): HillPreviewSettingsStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
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

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
