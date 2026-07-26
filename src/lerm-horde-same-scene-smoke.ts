import './lerm-horde-same-scene-smoke.css';

import {
  EXACT_3D_CARRIER_BODY_SHA256,
  EXACT_3D_CARRIER_RAIL_REVISION,
  EXACT_3D_CARRIER_REGISTRATION_SHA256,
} from './lerm-horde-3d-carrier-contract.js';
import {
  createExactCarrierRenderer,
  type ExactCarrierLiveRuntimeReceipt,
  type ExactCarrierRenderer,
} from './lerm-horde-3d-carrier-renderer.js';
import {
  FULL_HILL_RENDERER_ID,
} from './lerm-horde-full-hill-renderer.js';
import {
  LERM_HORDE_LIVE_RUNTIME_ROUTE,
  LERM_HORDE_LIVE_RUNTIME_SCHEMA,
  type LermHordeLiveRuntimeState,
} from './lerm-horde-live-runtime-composition.js';
import {
  HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA,
} from './terrain/hill-of-hills.js';

const LIVE_PRESENTATION_STEP_MS = 200;

const stage = required<HTMLElement>('[data-smoke-viewport]');
const statusLabel = required<HTMLElement>('[data-smoke-status-label]');
const frameKind = required<HTMLElement>('[data-frame-kind]');
const frameTime = required<HTMLElement>('[data-frame-time]');
const progress = required<HTMLElement>('[data-progress]');
const exposure = required<HTMLElement>('[data-exposure]');
const liveMeter = required<HTMLElement>('[data-live-meter-fill]');
const playToggle = required<HTMLButtonElement>('[data-play-toggle]');
const playIcon = required<HTMLElement>('[data-play-icon]');
const restart = required<HTMLButtonElement>('[data-restart]');
const failure = required<HTMLElement>('[data-smoke-failure]');
const errorOutput = required<HTMLElement>('[data-smoke-error]');

let carrier: ExactCarrierRenderer | null = null;
let playing = false;
let operatorPlayCount = 0;
let receiptPublished = false;
let elapsedMs = 0;
let liveClockOriginMs: number | null = null;

void initialize();

async function initialize(): Promise<void> {
  try {
    carrier = await createExactCarrierRenderer(stage);
    renderState(carrier.state);

    const documentState = document.documentElement.dataset;
    documentState.smokeStatus = 'verified';
    documentState.carrierStatus = 'verified-paused';
    documentState.carrierReceiptStatus = 'pending-play';
    documentState.requestedRoute = LERM_HORDE_LIVE_RUNTIME_ROUTE;
    documentState.effectiveRoute = LERM_HORDE_LIVE_RUNTIME_ROUTE;
    documentState.requestedRenderer = FULL_HILL_RENDERER_ID;
    documentState.effectiveRenderer = carrier.rendererId;
    documentState.sourceStatus = 'live-incremental-current-hill';
    documentState.liveRuntimeSchema = LERM_HORDE_LIVE_RUNTIME_SCHEMA;
    documentState.terrainBufferSchema =
      HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA;
    documentState.terrainSampleCount = String(carrier.terrainSampleCount);
    documentState.terrainTriangleCount = String(
      carrier.terrainTriangleCount,
    );
    documentState.depthBits = String(carrier.depthBits);
    documentState.carrierBodySha256 = EXACT_3D_CARRIER_BODY_SHA256;
    documentState.carrierRegistrationSha256 =
      EXACT_3D_CARRIER_REGISTRATION_SHA256;
    documentState.carrierRailRevision = EXACT_3D_CARRIER_RAIL_REVISION;
    documentState.carrierRailModuleSha256 =
      carrier.railModuleSha256;
    documentState.carrierRailHistorySha256 =
      carrier.railHistorySha256;
    documentState.effectiveRailId = carrier.effectiveRailId;
    documentState.effectiveEvaluatorRoute =
      carrier.effectiveEvaluatorRoute;
    documentState.operatorPlayCount = '0';
    documentState.precomputedFrameCount = '0';
    documentState.prefixRebuildCount = '0';
    documentState.replayConstructorCalls = '0';
    documentState.bodyVertexCount = String(carrier.bodyVertexCount);
    updatePlayState(false);
    window.requestAnimationFrame(tick);
  } catch (error) {
    failSmoke(error);
  }
}

function tick(clockMs: number): void {
  if (playing && carrier) {
    if (liveClockOriginMs === null) {
      liveClockOriginMs = clockMs - elapsedMs;
    }
    const targetElapsedMs = Math.min(
      carrier.completionElapsedMs,
      Math.max(elapsedMs, clockMs - liveClockOriginMs),
    );
    const publishedElapsedMs =
      targetElapsedMs >= carrier.completionElapsedMs
        ? carrier.completionElapsedMs
        : Math.floor(targetElapsedMs / LIVE_PRESENTATION_STEP_MS) *
          LIVE_PRESENTATION_STEP_MS;
    if (publishedElapsedMs > carrier.state.elapsedMs) {
      elapsedMs = publishedElapsedMs;
      try {
        renderState(carrier.advanceTo(elapsedMs));
        if (elapsedMs >= carrier.completionElapsedMs) {
          updatePlayState(false);
          publishReceipt();
        }
      } catch (error) {
        failSmoke(error);
      }
    }
  }
  window.requestAnimationFrame(tick);
}

function renderState(state: LermHordeLiveRuntimeState): void {
  if (!carrier) return;
  const traversing = state.phase === 'traversing';
  stage.dataset.frameIndex = String(state.tickCount);
  stage.dataset.frameKind = state.phase;
  stage.dataset.elapsedMs = state.elapsedMs.toFixed(3);
  stage.dataset.prefixSampleCount = String(
    state.admittedIntervalCount,
  );
  stage.dataset.terrainSampleChecksum =
    state.terrain.witness.sampleChecksum;
  stage.dataset.terrainTopologyChecksum =
    state.terrain.witness.topologyChecksum;
  stage.dataset.trafficChecksum =
    state.terrain.witness.producerTrafficFieldChecksum;
  stage.dataset.sourceDistance =
    state.body?.sourceDistance.toFixed(9) ?? '';
  stage.dataset.progress = state.body?.progress.toFixed(9) ?? '1';
  stage.dataset.supportHillSource =
    state.body?.support.renderedHillSourceId ??
    state.terrain.source.frameId;
  stage.dataset.admittedIntervalCount = String(
    state.admittedIntervalCount,
  );

  frameKind.textContent = traversing
    ? 'Live carrier / current Hill'
    : 'Carrier departed / Hill continues';
  frameTime.textContent = `LIVE t ${Math.round(state.elapsedMs)} ms`;
  const progressAmount = state.body?.progress ?? 1;
  progress.textContent = `${Math.round(progressAmount * 100)}%`;
  exposure.textContent =
    state.terrain.witness.producerTrafficExposureSeconds.toFixed(4);
  liveMeter.style.setProperty(
    '--live-progress',
    `${Math.max(0, Math.min(100, progressAmount * 100))}%`,
  );
}

function updatePlayState(nextPlaying: boolean): void {
  playing = nextPlaying;
  liveClockOriginMs = nextPlaying
    ? performance.now() - elapsedMs
    : null;
  playToggle.setAttribute(
    'aria-label',
    playing ? 'Pause live traversal' : 'Start live traversal',
  );
  playToggle.title = playing
    ? 'Pause live traversal'
    : 'Start live traversal';
  playIcon.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
  statusLabel.textContent = playing
    ? 'Live rail + current Hill / running'
    : receiptPublished
      ? 'Live rail + current Hill / complete'
      : 'Live rail + current Hill / paused';
}

playToggle.addEventListener('click', () => {
  if (playing) {
    updatePlayState(false);
    return;
  }
  if (!carrier) return;
  if (receiptPublished || elapsedMs >= carrier.completionElapsedMs) {
    resetTraversal();
  }
  if (operatorPlayCount === 0) {
    operatorPlayCount = 1;
    document.documentElement.dataset.operatorPlayCount = '1';
  }
  document.documentElement.dataset.carrierReceiptStatus =
    'in-progress';
  updatePlayState(true);
});

restart.addEventListener('click', resetTraversal);

function resetTraversal(): void {
  if (!carrier) return;
  elapsedMs = 0;
  operatorPlayCount = 0;
  receiptPublished = false;
  delete (
    window as Window & {
      __lermHordeLiveRuntimeReport?: ExactCarrierLiveRuntimeReceipt;
    }
  ).__lermHordeLiveRuntimeReport;
  document.documentElement.dataset.operatorPlayCount = '0';
  document.documentElement.dataset.carrierReceiptStatus =
    'pending-play';
  renderState(carrier.reset());
  updatePlayState(false);
}

function publishReceipt(): void {
  if (receiptPublished || !carrier) return;
  const receipt = carrier.createReceipt(operatorPlayCount);
  (
    window as Window & {
      __lermHordeLiveRuntimeReport?: ExactCarrierLiveRuntimeReceipt;
    }
  ).__lermHordeLiveRuntimeReport = receipt;
  receiptPublished = true;
  document.documentElement.dataset.carrierStatus = 'complete';
  document.documentElement.dataset.carrierReceiptStatus = 'complete';
  statusLabel.textContent = 'Live rail + current Hill / complete';
}

function failSmoke(error: unknown): void {
  document.documentElement.dataset.smokeStatus = 'failed';
  document.documentElement.dataset.carrierStatus = 'failed';
  document.documentElement.dataset.carrierReceiptStatus = 'failed';
  failure.hidden = false;
  errorOutput.textContent =
    error instanceof Error ? error.message : String(error);
  updatePlayState(false);
  statusLabel.textContent = 'Live source rejected';
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`missing smoke element ${selector}`);
  return element;
}
