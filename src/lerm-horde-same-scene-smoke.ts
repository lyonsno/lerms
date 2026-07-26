import './lerm-horde-same-scene-smoke.css';

import {
  EXACT_3D_CARRIER_BODY_SHA256,
  EXACT_3D_CARRIER_RAIL_REVISION,
  EXACT_3D_CARRIER_REGISTRATION_SHA256,
} from './lerm-horde-3d-carrier-contract.js';
import {
  createExactCarrierRenderer,
  type ExactCarrierRenderer,
} from './lerm-horde-3d-carrier-renderer.js';
import {
  FULL_HILL_ONE_RENDERER_SCHEMA,
  FULL_HILL_RENDERER_ID,
  type FullHillOneRendererReceipt,
} from './lerm-horde-full-hill-renderer.js';
import {
  HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_ROUTE,
  type HillHordeSameScenePrefixFrame,
} from './hill-horde-same-scene-prefix-replay.js';
import { HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA } from './terrain/hill-of-hills.js';

const BASE_FRAME_DURATION_MS = 290;
const CONTROL_HOLD_MS = 650;
const DEPARTURE_HOLD_MS = 900;
const TERMINAL_HOLD_MS = 1250;

const stage = required<HTMLElement>('[data-smoke-viewport]');
const statusLabel = required<HTMLElement>('[data-smoke-status-label]');
const frameKind = required<HTMLElement>('[data-frame-kind]');
const frameTime = required<HTMLElement>('[data-frame-time]');
const prefix = required<HTMLElement>('[data-prefix]');
const exposure = required<HTMLElement>('[data-exposure]');
const timeline = required<HTMLElement>('[data-timeline]');
const playToggle = required<HTMLButtonElement>('[data-play-toggle]');
const playIcon = required<HTMLElement>('[data-play-icon]');
const restart = required<HTMLButtonElement>('[data-restart]');
const failure = required<HTMLElement>('[data-smoke-failure]');
const errorOutput = required<HTMLElement>('[data-smoke-error]');
const speedButtons = [
  ...document.querySelectorAll<HTMLButtonElement>('[data-speed]'),
];

let frames: readonly HillHordeSameScenePrefixFrame[] = [];
let frameIndex = 1;
let playing = false;
let speed = 1;
let frameStartedAt = performance.now();
let timelineButtons: HTMLButtonElement[] = [];
let carrier: ExactCarrierRenderer | null = null;
let operatorPlayCount = 0;
let receiptPublished = false;

void initialize();

async function initialize(): Promise<void> {
  try {
    carrier = await createExactCarrierRenderer(stage);
    frames = carrier.frames;
    createTimeline();
    renderFrame(frameIndex);

    const documentState = document.documentElement.dataset;
    documentState.smokeStatus = 'verified';
    documentState.carrierStatus = 'verified-paused';
    documentState.carrierReceiptStatus = 'pending-play';
    documentState.requestedRoute =
      HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_ROUTE;
    documentState.effectiveRoute =
      HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_ROUTE;
    documentState.requestedRenderer = FULL_HILL_RENDERER_ID;
    documentState.effectiveRenderer = carrier.rendererId;
    documentState.sourceStatus = 'canonical-dynamic-full-hill-replay';
    documentState.fullHillReceiptSchema = FULL_HILL_ONE_RENDERER_SCHEMA;
    documentState.terrainBufferSchema = HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA;
    documentState.terrainSampleCount = String(carrier.terrainSampleCount);
    documentState.terrainTriangleCount = String(carrier.terrainTriangleCount);
    documentState.depthBits = String(carrier.depthBits);
    documentState.carrierBodySha256 = EXACT_3D_CARRIER_BODY_SHA256;
    documentState.carrierRegistrationSha256 =
      EXACT_3D_CARRIER_REGISTRATION_SHA256;
    documentState.carrierRailRevision = EXACT_3D_CARRIER_RAIL_REVISION;
    documentState.carrierRailModuleSha256 = carrier.railModuleSha256;
    documentState.carrierRailHistorySha256 = carrier.railHistorySha256;
    documentState.effectiveRailId = carrier.effectiveRailId;
    documentState.effectiveEvaluatorRoute = carrier.effectiveEvaluatorRoute;
    documentState.operatorPlayCount = '0';
    documentState.bodyVertexCount = String(carrier.bodyVertexCount);
    statusLabel.textContent = 'Full Hill + exact carrier / paused';
    updatePlayState(false);
    window.requestAnimationFrame(tick);
  } catch (error) {
    failSmoke(error);
  }
}

function createTimeline(): void {
  timelineButtons = frames.map((frame) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'timeline__step';
    button.dataset.frameIndex = String(frame.index);
    button.setAttribute('aria-label', frameLabel(frame));
    button.title = frameLabel(frame);
    button.addEventListener('click', () => {
      updatePlayState(false);
      frameIndex = frame.index;
      frameStartedAt = performance.now();
      renderFrame(frameIndex);
    });
    timeline.append(button);
    return button;
  });
}

function tick(timestamp: number): void {
  if (
    playing &&
    frames.length > 0 &&
    timestamp - frameStartedAt >= frameDuration(frames[frameIndex]) / speed
  ) {
    if (frameIndex === frames.length - 1) {
      updatePlayState(false);
      publishReceipt();
      window.requestAnimationFrame(tick);
      return;
    }
    frameIndex += 1;
    frameStartedAt = timestamp;
    renderFrame(frameIndex);
  }
  window.requestAnimationFrame(tick);
}

function renderFrame(index: number): void {
  const frame = frames[index];
  if (!frame || !carrier) return;
  carrier.renderFrame(index);

  stage.dataset.frameIndex = String(index);
  stage.dataset.frameKind = frame.kind;
  stage.dataset.prefixSampleCount = String(frame.prefixSampleCount);
  stage.dataset.terrainSampleChecksum = frame.terrain.witness.sampleChecksum;
  stage.dataset.terrainTopologyChecksum =
    frame.terrain.witness.topologyChecksum;
  stage.dataset.trafficChecksum =
    frame.terrain.witness.producerTrafficFieldChecksum;
  stage.classList.remove('stage--advance');
  void stage.getBoundingClientRect();
  stage.classList.add('stage--advance');

  frameKind.textContent = displayKind(frame);
  frameTime.textContent =
    frame.kind === 'no-history-control'
      ? 'CONTROL'
      : `t ${frame.timestampMs} ms`;
  prefix.textContent = `${frame.prefixSampleCount} / 15`;
  exposure.textContent =
    frame.terrain.witness.producerTrafficExposureSeconds.toFixed(4);
  timelineButtons.forEach((button, buttonIndex) => {
    button.setAttribute(
      'aria-current',
      buttonIndex === index ? 'true' : 'false',
    );
  });
}

function frameDuration(frame: HillHordeSameScenePrefixFrame): number {
  if (frame.kind === 'no-history-control') return CONTROL_HOLD_MS;
  if (frame.kind === 'actor-departed') return DEPARTURE_HOLD_MS;
  if (frame.kind === 'after-departure') return TERMINAL_HOLD_MS;
  return BASE_FRAME_DURATION_MS;
}

function displayKind(frame: HillHordeSameScenePrefixFrame): string {
  if (frame.kind === 'no-history-control') return 'No-history control';
  if (frame.kind === 'actor-departed') return 'Actor departed / pressure held';
  if (frame.kind === 'after-departure') {
    return 'Later Hill / traffic retained';
  }
  return `Root ${frame.index - 1} / moving prefix`;
}

function frameLabel(frame: HillHordeSameScenePrefixFrame): string {
  return `${displayKind(frame)}, prefix ${frame.prefixSampleCount} of 15`;
}

function updatePlayState(nextPlaying: boolean): void {
  playing = nextPlaying;
  frameStartedAt = performance.now();
  playToggle.setAttribute(
    'aria-label',
    playing ? 'Pause traversal' : 'Play traversal',
  );
  playToggle.title = playing ? 'Pause traversal' : 'Play traversal';
  playIcon.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
  statusLabel.textContent = playing
    ? 'Full Hill + exact carrier / traversing'
    : receiptPublished
      ? 'Full Hill + exact carrier / complete'
      : 'Full Hill + exact carrier / paused';
}

playToggle.addEventListener('click', () => {
  if (playing) {
    updatePlayState(false);
    return;
  }
  if (frameIndex === frames.length - 1 || receiptPublished) {
    resetTraversal();
  }
  if (operatorPlayCount >= 1) return;
  operatorPlayCount += 1;
  document.documentElement.dataset.operatorPlayCount =
    String(operatorPlayCount);
  document.documentElement.dataset.carrierReceiptStatus = 'in-progress';
  updatePlayState(true);
});

restart.addEventListener('click', resetTraversal);

speedButtons.forEach((button) => {
  button.addEventListener('click', () => {
    speed = Number(button.dataset.speed ?? '1');
    frameStartedAt = performance.now();
    speedButtons.forEach((candidate) => {
      candidate.setAttribute(
        'aria-pressed',
        candidate === button ? 'true' : 'false',
      );
    });
  });
});

function failSmoke(error: unknown): void {
  document.documentElement.dataset.smokeStatus = 'failed';
  document.documentElement.dataset.carrierStatus = 'failed';
  document.documentElement.dataset.carrierReceiptStatus = 'failed';
  failure.hidden = false;
  errorOutput.textContent =
    error instanceof Error ? error.message : String(error);
  updatePlayState(false);
  statusLabel.textContent = 'Source rejected';
}

function resetTraversal(): void {
  frameIndex = 1;
  operatorPlayCount = 0;
  receiptPublished = false;
  delete (
    window as Window & {
      __lermHordeFullHillReport?: FullHillOneRendererReceipt;
    }
  ).__lermHordeFullHillReport;
  document.documentElement.dataset.operatorPlayCount = '0';
  document.documentElement.dataset.carrierReceiptStatus = 'pending-play';
  updatePlayState(false);
  renderFrame(frameIndex);
}

function publishReceipt(): void {
  if (receiptPublished || !carrier) return;
  const receipt = carrier.createReceipt(operatorPlayCount);
  (
    window as Window & {
      __lermHordeFullHillReport?: FullHillOneRendererReceipt;
    }
  ).__lermHordeFullHillReport = receipt;
  receiptPublished = true;
  document.documentElement.dataset.carrierStatus = 'complete';
  document.documentElement.dataset.carrierReceiptStatus = 'complete';
  statusLabel.textContent = 'Full Hill + exact carrier / complete';
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`missing smoke element ${selector}`);
  return element;
}
