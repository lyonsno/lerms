import './lerm-horde-same-scene-smoke.css';
import {
  ACCEPTED_SAME_SCENE_ASSET_ROOT,
  type SameSceneSmokeFrame,
  verifyAcceptedSameSceneSmokeSource,
} from './lerm-horde-same-scene-smoke-contract.js';
import {
  EXACT_3D_CARRIER_BODY_SHA256,
  EXACT_3D_CARRIER_HILL_PRESENTER_REVISION,
  EXACT_3D_CARRIER_HILL_ROUTE,
  EXACT_3D_CARRIER_PLAYBACK_REVISION,
  EXACT_3D_CARRIER_PRESENTATION_REVISION,
  EXACT_3D_CARRIER_RAIL_HISTORY_SHA256,
  EXACT_3D_CARRIER_RAIL_ID,
  EXACT_3D_CARRIER_RAIL_MODULE_SHA256,
  EXACT_3D_CARRIER_RAIL_REVISION,
  EXACT_3D_CARRIER_REGISTRATION_SHA256,
  type Exact3dCarrierReceipt,
  validateExact3dCarrierReceipt,
} from './lerm-horde-3d-carrier-contract.js';
import {
  createExactCarrierRenderer,
  type ExactCarrierRenderer,
} from './lerm-horde-3d-carrier-renderer.js';

const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 360;
const PANEL_COLUMNS = 6;
const BASE_FRAME_DURATION_MS = 290;
const CONTROL_HOLD_MS = 650;
const DEPARTURE_HOLD_MS = 900;
const TERMINAL_HOLD_MS = 1250;

const stage = required<HTMLElement>('.stage');
const viewport = required<SVGSVGElement>('[data-smoke-viewport]');
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

let frames: readonly SameSceneSmokeFrame[] = [];
let frameIndex = 1;
let playing = false;
let speed = 1;
let frameStartedAt = performance.now();
let timelineButtons: HTMLButtonElement[] = [];
let panelGroups: SVGGElement[] = [];
let carrier: ExactCarrierRenderer | null = null;
let operatorPlayCount = 0;
let receiptPublished = false;
const observedCarrierFrames = new Set<number>();

void initialize();

async function initialize(): Promise<void> {
  try {
    const [manifestResponse, svgResponse] = await Promise.all([
      fetch(`${ACCEPTED_SAME_SCENE_ASSET_ROOT}/manifest.json`, {
        cache: 'no-store',
      }),
      fetch(`${ACCEPTED_SAME_SCENE_ASSET_ROOT}/replay.svg`, {
        cache: 'no-store',
      }),
    ]);
    if (!manifestResponse.ok || !svgResponse.ok) {
      throw new Error(
        `accepted replay assets unavailable: manifest ${manifestResponse.status}, SVG ${svgResponse.status}`,
      );
    }

    const [manifestText, svgText] = await Promise.all([
      manifestResponse.text(),
      svgResponse.text(),
    ]);
    const source = await verifyAcceptedSameSceneSmokeSource(
      manifestText,
      svgText,
    );
    frames = source.frames;
    mountSvg(source.svgText);
    carrier = await createExactCarrierRenderer(stage, viewport, panelGroups);
    createTimeline();
    renderFrame(frameIndex);
    document.documentElement.dataset.smokeStatus = 'verified';
    document.documentElement.dataset.carrierStatus = 'verified-paused';
    document.documentElement.dataset.carrierReceiptStatus = 'pending-play';
    document.documentElement.dataset.requestedRoute = source.requestedRoute;
    document.documentElement.dataset.effectiveRoute = source.effectiveRoute;
    document.documentElement.dataset.presenterRevision =
      source.presenterRevision;
    document.documentElement.dataset.verifierRevision = source.verifierRevision;
    document.documentElement.dataset.verifierModuleBlob =
      source.verifierModuleBlob;
    document.documentElement.dataset.acceptedReceiptSha256 =
      source.acceptedReceiptSha256;
    document.documentElement.dataset.manifestSha256 = source.manifestSha256;
    document.documentElement.dataset.svgSha256 = source.svgSha256;
    document.documentElement.dataset.sourceStatus = source.sourceStatus;
    document.documentElement.dataset.carrierBodySha256 =
      EXACT_3D_CARRIER_BODY_SHA256;
    document.documentElement.dataset.carrierRegistrationSha256 =
      EXACT_3D_CARRIER_REGISTRATION_SHA256;
    document.documentElement.dataset.carrierRailRevision =
      EXACT_3D_CARRIER_RAIL_REVISION;
    document.documentElement.dataset.carrierRailModuleSha256 =
      carrier.railModuleSha256;
    document.documentElement.dataset.carrierRailHistorySha256 =
      carrier.railHistorySha256;
    document.documentElement.dataset.effectiveRailId = carrier.effectiveRailId;
    document.documentElement.dataset.carrierPresentationRevision =
      EXACT_3D_CARRIER_PRESENTATION_REVISION;
    document.documentElement.dataset.carrierPlaybackRevision =
      EXACT_3D_CARRIER_PLAYBACK_REVISION;
    document.documentElement.dataset.effectiveEvaluatorRoute =
      carrier.effectiveEvaluatorRoute;
    document.documentElement.dataset.operatorPlayCount = '0';
    document.documentElement.dataset.bodyVertexCount = String(
      carrier.bodyVertexCount,
    );
    statusLabel.textContent = 'Exact carrier / paused';
    updatePlayState(false);
    window.requestAnimationFrame(tick);
  } catch (error) {
    failSmoke(error);
  }
}

function mountSvg(svgText: string): void {
  const documentSource = new DOMParser().parseFromString(
    svgText,
    'image/svg+xml',
  );
  const parserError = documentSource.querySelector('parsererror');
  if (parserError) {
    throw new Error(`accepted replay SVG did not parse: ${parserError.textContent}`);
  }
  viewport.replaceChildren(
    ...[...documentSource.documentElement.children].map((node) =>
      document.importNode(node, true),
    ),
  );
  panelGroups = [
    ...viewport.querySelectorAll<SVGGElement>('[data-panel]'),
  ];
  if (panelGroups.length !== frames.length) {
    throw new Error(
      `accepted replay panel inventory mismatch: ${panelGroups.length} panels for ${frames.length} frames`,
    );
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
  if (!frame) return;
  const x = (index % PANEL_COLUMNS) * PANEL_WIDTH;
  const y = Math.floor(index / PANEL_COLUMNS) * PANEL_HEIGHT;
  viewport.setAttribute(
    'viewBox',
    `${x} ${y} ${PANEL_WIDTH} ${PANEL_HEIGHT}`,
  );
  viewport.dataset.frameIndex = String(index);
  viewport.dataset.frameKind = frame.kind;
  viewport.dataset.prefixSampleCount = String(frame.prefixSampleCount);
  viewport.dataset.trafficChecksum = frame.trafficChecksum;
  panelGroups.forEach((panel, panelIndex) => {
    panel.style.display = panelIndex === index ? 'inline' : 'none';
  });
  carrier?.renderFrame(index);
  if (carrier && index >= 1 && index <= 15) {
    observedCarrierFrames.add(index);
  }
  viewport.classList.remove('stage__viewport--advance');
  void viewport.getBoundingClientRect();
  viewport.classList.add('stage__viewport--advance');

  frameKind.textContent = displayKind(frame);
  frameTime.textContent =
    frame.kind === 'no-history-control'
      ? 'CONTROL'
      : `t ${frame.timestampMs} ms`;
  prefix.textContent = `${frame.prefixSampleCount} / 15`;
  exposure.textContent = frame.trafficExposureSeconds.toFixed(4);
  timelineButtons.forEach((button, buttonIndex) => {
    button.setAttribute(
      'aria-current',
      buttonIndex === index ? 'true' : 'false',
    );
  });
}

function frameDuration(frame: SameSceneSmokeFrame): number {
  if (frame.kind === 'no-history-control') return CONTROL_HOLD_MS;
  if (frame.kind === 'actor-departed') return DEPARTURE_HOLD_MS;
  if (frame.kind === 'after-departure') return TERMINAL_HOLD_MS;
  return BASE_FRAME_DURATION_MS;
}

function displayKind(frame: SameSceneSmokeFrame): string {
  if (frame.kind === 'no-history-control') return 'No-history control';
  if (frame.kind === 'actor-departed') return 'Actor departed / pressure held';
  if (frame.kind === 'after-departure') {
    return 'Later Hill / traffic retained';
  }
  return `Root ${frame.index - 1} / moving prefix`;
}

function frameLabel(frame: SameSceneSmokeFrame): string {
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
    ? 'Exact carrier / traversing'
    : receiptPublished
      ? 'Exact carrier / complete'
      : 'Exact carrier / paused';
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
restart.addEventListener('click', () => {
  resetTraversal();
});
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
  viewport.replaceChildren();
  updatePlayState(false);
  statusLabel.textContent = 'Source rejected';
}

function resetTraversal(): void {
  frameIndex = 1;
  operatorPlayCount = 0;
  receiptPublished = false;
  observedCarrierFrames.clear();
  delete (
    window as Window & {
      __lermHorde3dCarrierReport?: Exact3dCarrierReceipt;
    }
  ).__lermHorde3dCarrierReport;
  document.documentElement.dataset.operatorPlayCount = '0';
  document.documentElement.dataset.carrierReceiptStatus = 'pending-play';
  updatePlayState(false);
  renderFrame(frameIndex);
}

function publishReceipt(): void {
  if (receiptPublished || !carrier) return;
  const receipt: Exact3dCarrierReceipt = {
    schema: 'lerms.horde-3d-carrier-history.v0',
    status: {
      ok: true,
      phase: 'complete',
      fallbackStatus: 'none',
      staleStatus: 'fresh',
      failurePhase: null,
    },
    identity: {
      bodySha256: EXACT_3D_CARRIER_BODY_SHA256,
      registrationSha256: EXACT_3D_CARRIER_REGISTRATION_SHA256,
      railRevision: EXACT_3D_CARRIER_RAIL_REVISION,
      railModuleSha256: EXACT_3D_CARRIER_RAIL_MODULE_SHA256,
      railHistorySha256: EXACT_3D_CARRIER_RAIL_HISTORY_SHA256,
      effectiveRailId: EXACT_3D_CARRIER_RAIL_ID,
      presentationRevision: EXACT_3D_CARRIER_PRESENTATION_REVISION,
      playbackRevision: EXACT_3D_CARRIER_PLAYBACK_REVISION,
      requestedHillRoute: EXACT_3D_CARRIER_HILL_ROUTE,
      effectiveHillRoute: EXACT_3D_CARRIER_HILL_ROUTE,
      hillPresenterRevision: EXACT_3D_CARRIER_HILL_PRESENTER_REVISION,
      effectiveEvaluatorRoute: carrier.effectiveEvaluatorRoute,
    },
    playback: {
      initialState: 'paused',
      operatorPlayCount,
      autoplayObserved: false,
    },
    composition: {
      carrierIdentity: '719024',
      speciesAuthority: 'non-lerm-engineering-carrier',
      rootTransformPath: 'evaluator-world-positions',
      hillSupportHeightPath: '0482274.accepted-root-world-y',
      hillSupportHeightApplicationsPerSample: 1,
      hillScreenProjectionPath: '0482274.accepted-support-marker',
      hillScreenProjectionApplicationsPerSample: 1,
      hiddenGlyphFallback: false,
      supportRootLiftApplications: 0,
      contactCorrectionApplications: 0,
    },
    samples: carrier.samples.map((sample, index) => ({
      index,
      sourceDistance: sample.sourceDistance,
      progress: sample.progress,
      rootTransformApplications: 1,
      hillSupportHeightApplications: 1,
      hillScreenProjectionApplications:
        sample.hillScreenProjectionApplications,
      bodyVisible: observedCarrierFrames.has(index + 1),
      rootFrameSource: sample.rootFrameSource,
      railRootPosition: sample.railRootPosition,
      hillSupportRootPosition: sample.hillSupportRootPosition,
      supportHeightDelta: sample.supportHeightDelta,
      hillSupportScreenAnchor: sample.hillSupportScreenAnchor,
      projectedRootScreenAnchor: sample.projectedRootScreenAnchor,
      screenAnchorErrorPx: sample.screenAnchorErrorPx,
      rootFrameOrigin: vec3Tuple(sample.rootFrame.origin),
      rootFrameLateral: vec3Tuple(sample.rootFrame.lateral),
      rootFrameNormal: vec3Tuple(sample.rootFrame.normal),
      rootFrameTangent: vec3Tuple(sample.rootFrame.tangent),
    })),
    departure: {
      bodyVisible: false,
      hillHistoryRetained:
        frames.at(-2)?.trafficChecksum === frames.at(-1)?.trafficChecksum &&
        frames.at(-1)?.prefixSampleCount === 15,
    },
  };
  validateExact3dCarrierReceipt(receipt);
  (
    window as Window & {
      __lermHorde3dCarrierReport?: Exact3dCarrierReceipt;
    }
  ).__lermHorde3dCarrierReport = receipt;
  receiptPublished = true;
  document.documentElement.dataset.carrierStatus = 'complete';
  document.documentElement.dataset.carrierReceiptStatus = 'complete';
  statusLabel.textContent = 'Exact carrier / complete';
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`missing smoke element ${selector}`);
  return element;
}

function vec3Tuple(vector: {
  x: number;
  y: number;
  z: number;
}): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}
