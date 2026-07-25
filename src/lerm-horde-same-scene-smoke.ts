import './lerm-horde-same-scene-smoke.css';
import {
  ACCEPTED_SAME_SCENE_ASSET_ROOT,
  type SameSceneSmokeFrame,
  verifyAcceptedSameSceneSmokeSource,
} from './lerm-horde-same-scene-smoke-contract.js';

const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 360;
const PANEL_COLUMNS = 6;
const BASE_FRAME_DURATION_MS = 290;
const CONTROL_HOLD_MS = 650;
const DEPARTURE_HOLD_MS = 900;
const LOOP_HOLD_MS = 1250;

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
let frameIndex = 0;
let playing = true;
let speed = 1;
let frameStartedAt = performance.now();
let timelineButtons: HTMLButtonElement[] = [];
let panelGroups: SVGGElement[] = [];

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
    createTimeline();
    renderFrame(0);
    document.documentElement.dataset.smokeStatus = 'verified';
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
    statusLabel.textContent = 'Source exact / replay active';
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
    frameIndex = (frameIndex + 1) % frames.length;
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
  if (frame.kind === 'after-departure') return LOOP_HOLD_MS;
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
    playing ? 'Pause replay' : 'Play replay',
  );
  playToggle.title = playing ? 'Pause replay' : 'Play replay';
  playIcon.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
}

playToggle.addEventListener('click', () => updatePlayState(!playing));
restart.addEventListener('click', () => {
  frameIndex = 0;
  frameStartedAt = performance.now();
  updatePlayState(true);
  renderFrame(frameIndex);
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
  statusLabel.textContent = 'Source rejected';
  failure.hidden = false;
  errorOutput.textContent =
    error instanceof Error ? error.message : String(error);
  viewport.replaceChildren();
  updatePlayState(false);
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`missing smoke element ${selector}`);
  return element;
}
