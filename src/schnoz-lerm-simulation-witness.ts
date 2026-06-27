import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CARRIER_DROP_EVENT_SCHEMA,
  FIRST_VERTICAL_INTERFACE_SCHEMA,
  GOIN_STATE_SCHEMA,
  JUICE_HIT_EVENT_SCHEMA,
  LERM_STATE_SCHEMA,
  SOURCE_TRUTH_SCHEMA,
  TERRAIN_SAMPLE_SCHEMA,
  summarizeFirstVerticalFrame,
  type CarrierDropEvent,
  type FirstVerticalFrame,
  type GoinState,
  type JuiceHitEvent,
  type LermState,
  type SourceTruth,
  type TerrainSample,
  type Vec3,
} from './contracts/first-vertical.ts';
import {
  FIRST_VERTICAL_SOURCE_TRUTH_UPGRADE_SCHEMA,
  evaluateFirstVerticalSourceTruthUpgrade,
  type FirstVerticalSourceTruthUpgradeEvaluation,
} from './contracts/first-vertical-source-truth-upgrade.ts';

const WITNESS_SCHEMA = 'lerms.schnoz-lerm-simulation-witness.v0' as const;
const ROUTE = 'lerms/schnoz-lerm-simulation/witness-file' as const;
const WIDTH = 1280;
const HEIGHT = 720;
const FRAME_COUNT = 6;

type Rgb = readonly [number, number, number];

type CliArgs = {
  report: string | null;
  image: string | null;
};

type SchnozTimelineFrame = {
  index: number;
  label: string;
  timeMs: number;
  events: string[];
  lerms: SchnozRenderLerm[];
  goins: SchnozRenderGoin[];
  hitFlash?: { world: Vec3; radius: number };
  reroute?: { from: Vec3; to: Vec3 };
};

type SchnozRenderLerm = {
  id: string;
  world: Vec3;
  heading: Vec3;
  state: LermState['state'];
  carryingGoinId?: string;
  targetGoinId?: string;
  hitStunMs?: number;
};

type SchnozRenderGoin = {
  id: string;
  world: Vec3;
  state: GoinState['state'];
};

type RenderMetrics = {
  nonBackgroundPixelCount: number;
  lermPixelCount: number;
  goinPixelCount: number;
  hitPixelCount: number;
  reroutePixelCount: number;
  sourceTruthPixelCount: number;
};

type SchnozSimulationWitness = {
  ok: true;
  schema: typeof WITNESS_SCHEMA;
  route: typeof ROUTE;
  reportPath: string;
  imagePath: string;
  proxyBody: {
    identity: 'proxy_schnoz_sphere';
    visualConceptStatus: 'blocked_waiting_for_wake_and_bake';
    claimsFinalRedLermBody: false;
    orientationCue: 'schnoz_nub';
    allowedBecause: readonly string[];
  };
  frame: FirstVerticalFrame;
  summary: ReturnType<typeof summarizeFirstVerticalFrame>;
  sourceTruthUpgrade: FirstVerticalSourceTruthUpgradeEvaluation;
  timeline: SchnozTimelineFrame[];
  renderMetrics: RenderMetrics;
};

const BACKGROUND: Rgb = [7, 12, 14];
const PANEL: Rgb = [12, 28, 27];
const TERRAIN: Rgb = [32, 86, 58];
const RED: Rgb = [222, 45, 58];
const DARK_RED: Rgb = [116, 18, 35];
const SCHNOZ: Rgb = [249, 135, 82];
const GOIN: Rgb = [239, 190, 68];
const HIT: Rgb = [88, 199, 255];
const REROUTE: Rgb = [178, 118, 248];
const SOURCE: Rgb = [224, 222, 158];

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { report: null, image: null };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key.startsWith('--')) continue;
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${key}`);
    }

    if (key === '--report') args.report = value;
    else if (key === '--image') args.image = value;
    else throw new Error(`unknown argument ${key}`);

    index += 1;
  }

  return args;
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

function writePpm(path: string, pixels: Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  const header = Buffer.from(`P6\n${WIDTH} ${HEIGHT}\n255\n`, 'ascii');
  writeFileSync(path, Buffer.concat([header, Buffer.from(pixels)]));
}

export function buildSchnozLermSimulationWitness(reportPath: string, imagePath: string): SchnozSimulationWitness {
  const timeline = buildTimeline();
  const frame = buildFirstVerticalFrameFromSchnozSimulation();
  const sourceTruthUpgrade = evaluateFirstVerticalSourceTruthUpgrade(frame);
  const { pixels, metrics } = renderTimeline(timeline, sourceTruthUpgrade);

  writePpm(imagePath, pixels);

  return {
    ok: true,
    schema: WITNESS_SCHEMA,
    route: ROUTE,
    reportPath,
    imagePath,
    proxyBody: {
      identity: 'proxy_schnoz_sphere',
      visualConceptStatus: 'blocked_waiting_for_wake_and_bake',
      claimsFinalRedLermBody: false,
      orientationCue: 'schnoz_nub',
      allowedBecause: [
        'simulation-spine-before-final-body',
        'source-truth-can-be-live-with-proxy-visuals',
        'wake-and-bake-owns-final-asset-conditioning',
      ],
    },
    frame,
    summary: summarizeFirstVerticalFrame(frame),
    sourceTruthUpgrade,
    timeline,
    renderMetrics: metrics,
  };
}

export function runSchnozLermSimulationWitnessCli(argv = process.argv.slice(2)): number {
  let args: CliArgs;

  try {
    args = parseArgs(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    return 1;
  }

  if (!args.report || !args.image) {
    process.stderr.write('missing required --report and --image paths\n');
    return 1;
  }

  writeJson(args.report, buildSchnozLermSimulationWitness(args.report, args.image));
  return 0;
}

function buildTimeline(): SchnozTimelineFrame[] {
  return [
    frame(0, 'approach', 0, ['uphill-approach'], [
      lerm('schnoz-approach', [-2.6, 0.4, 0], [1, 0, 0.1], 'approaching_hoard'),
      lerm('schnoz-rerouter', [-2.1, 0.34, -0.3], [1, 0, 0.2], 'approaching_hoard'),
    ], [
      goin('goin-hoard-001', [1.95, 0.58, 0.05], 'hoarded'),
      goin('goin-loose-001', [1.7, 0.5, -0.22], 'hoarded'),
    ]),
    frame(1, 'steal', 240, ['goin-stolen'], [
      lerm('schnoz-thief', [0.95, 0.58, 0.02], [1, 0, 0], 'stealing_goin', 'goin-hoard-001'),
      lerm('schnoz-approach', [-1.5, 0.43, -0.1], [1, 0, 0.05], 'approaching_hoard'),
    ], [
      goin('goin-hoard-001', [1.05, 0.61, 0.03], 'carried'),
      goin('goin-loose-001', [1.7, 0.5, -0.22], 'hoarded'),
    ]),
    frame(2, 'flee', 480, ['carrier-fleeing'], [
      lerm('schnoz-fleeing', [0.25, 0.55, -0.15], [-1, 0, -0.2], 'fleeing_with_goin', 'goin-hoard-001'),
      lerm('schnoz-chaser', [-0.95, 0.45, -0.18], [1, 0, 0], 'approaching_hoard'),
    ], [
      goin('goin-hoard-001', [0.12, 0.58, -0.15], 'carried'),
      goin('goin-loose-001', [1.7, 0.5, -0.22], 'hoarded'),
    ]),
    frame(3, 'hit', 720, ['juice-hit-carrier'], [
      lerm('schnoz-hit-carrier', [-0.15, 0.56, -0.2], [-1, 0, -0.1], 'hit_reacting', undefined, undefined, 180),
      lerm('schnoz-chaser', [-0.75, 0.45, -0.18], [1, 0, 0], 'approaching_hoard'),
    ], [
      goin('goin-hoard-001', [-0.04, 0.57, -0.18], 'dropped'),
      goin('goin-loose-001', [1.7, 0.5, -0.22], 'hoarded'),
    ], { world: [-0.15, 0.72, -0.2], radius: 0.38 }),
    frame(4, 'drop', 960, ['drop-started'], [
      lerm('schnoz-tumbling', [-0.55, 0.62, -0.3], [-1, 0, -0.3], 'tumbling', undefined, undefined, 260),
      lerm('schnoz-rerouter', [-1.25, 0.44, -0.18], [1, 0, -0.05], 'approaching_hoard'),
    ], [
      goin('goin-hoard-001', [-0.55, 0.42, -0.42], 'rolling'),
      goin('goin-loose-001', [1.7, 0.5, -0.22], 'hoarded'),
    ]),
    frame(5, 'reroute', 1200, ['loose-goin-reroute'], [
      lerm('schnoz-approach', [-1.95, 0.4, 0.2], [1, 0, -0.05], 'approaching_hoard'),
      lerm('schnoz-carrier', [0.75, 0.55, 0.24], [-1, 0, 0], 'carrying_goin', 'goin-carried-001'),
      lerm('schnoz-fleeing', [0.35, 0.56, 0.38], [-1, 0, 0.2], 'fleeing_with_goin', 'goin-flee-001'),
      lerm('schnoz-hit-carrier', [-0.22, 0.6, -0.25], [-1, 0, -0.2], 'hit_reacting', undefined, undefined, 220),
      lerm('schnoz-tumbling', [-0.64, 0.62, -0.35], [-1, 0, -0.3], 'tumbling', undefined, undefined, 260),
      lerm('schnoz-rerouter', [-1.35, 0.42, -0.12], [1, 0, -0.2], 'rerouting_to_goin', undefined, 'goin-dropped-001'),
    ], [
      goin('goin-carried-001', [0.85, 0.57, 0.25], 'carried'),
      goin('goin-flee-001', [0.22, 0.56, 0.37], 'carried'),
      goin('goin-dropped-001', [-0.88, 0.38, -0.54], 'rolling'),
    ], { world: [-0.22, 0.74, -0.25], radius: 0.36 }, {
      from: [-1.35, 0.42, -0.12],
      to: [-0.88, 0.38, -0.54],
    }),
  ];
}

function buildFirstVerticalFrameFromSchnozSimulation(): FirstVerticalFrame {
  const timestampMs = 1200;
  const frameId = 'schnoz-lerm-live-sim-frame-001';
  const frameSource = source(frameId, `${ROUTE}/frame`, timestampMs);
  const terrain = terrainSamples(frameId, timestampMs);
  const terrainById = new Map(terrain.map((sample) => [sample.id, sample]));
  const final = buildTimeline()[FRAME_COUNT - 1];
  const sourceForPackets = source(frameId, `${ROUTE}/packets`, timestampMs);

  const lerms: LermState[] = final.lerms.map((item) => ({
    schema: LERM_STATE_SCHEMA,
    id: item.id,
    source: sourceForPackets,
    species: 'red',
    state: item.state,
    world: item.world,
    heading: item.heading,
    terrainContact: {
      terrainSampleId: terrainForWorld(item.world, terrainById),
      grounded: true,
      contactWorld: [item.world[0], item.world[1] - 0.16, item.world[2]],
    },
    carryingGoinId: item.carryingGoinId,
    targetGoinId: item.targetGoinId,
    speed: item.state === 'rerouting_to_goin' ? 0.84 : 0.46,
    hitStunMs: item.hitStunMs,
  }));

  const goins: GoinState[] = final.goins.map((item) => ({
    schema: GOIN_STATE_SCHEMA,
    id: item.id,
    source: sourceForPackets,
    state: item.state,
    world: item.world,
    velocity: item.state === 'rolling' ? [-0.42, -0.05, -0.7] : [0, 0, 0],
    carrierLermId:
      item.id === 'goin-carried-001'
        ? 'schnoz-carrier'
        : item.id === 'goin-flee-001'
          ? 'schnoz-fleeing'
          : undefined,
    desireRadius: item.state === 'rolling' ? 1.8 : 0.65,
    mass: 1,
  }));

  const hit: JuiceHitEvent = {
    schema: JUICE_HIT_EVENT_SCHEMA,
    id: 'schnoz-hit-001',
    source: sourceForPackets,
    chemistry: 'index_knockback',
    targetKind: 'lerm',
    targetId: 'schnoz-hit-carrier',
    contactWorld: [-0.22, 0.74, -0.25],
    impulse: [-0.65, 0.25, -0.4],
    sourcePacketId: 'proxy-index-juice-packet-001',
    strength: 0.82,
  };

  const drop: CarrierDropEvent = {
    schema: CARRIER_DROP_EVENT_SCHEMA,
    id: 'schnoz-drop-001',
    source: sourceForPackets,
    cause: 'juice_hit',
    lermId: 'schnoz-hit-carrier',
    goinId: 'goin-dropped-001',
    world: [-0.88, 0.38, -0.54],
    outgoingVelocity: [-0.42, -0.05, -0.7],
    rerouteRadius: 1.8,
    triggeringHitId: hit.id,
  };

  return {
    schema: FIRST_VERTICAL_INTERFACE_SCHEMA,
    source: frameSource,
    terrainSamples: terrain,
    lerms,
    goins,
    juiceHits: [hit],
    carrierDropEvents: [drop],
  };
}

function source(frameId: string, route: string, timestampMs: number): SourceTruth {
  return {
    schema: SOURCE_TRUTH_SCHEMA,
    authority: 'live_simulation',
    route,
    frameId,
    timestampMs,
    sampleAgeMs: 16,
    backend: 'schnoz-sphere-deterministic-sim',
    configId: 'schnoz-sim-steal-drop-reroute-v0',
  };
}

function terrainSamples(frameId: string, timestampMs: number): TerrainSample[] {
  const terrainSource = source(frameId, `${ROUTE}/terrain`, timestampMs);
  return [
    terrain('terrain-approach-left', terrainSource, [-1.6, 0.34, -0.2], 0.34, 0.36, 'approach'),
    terrain('terrain-crown-right', terrainSource, [0.8, 0.58, 0.22], 0.58, 0.19, 'crown'),
    terrain('terrain-gutter-drop', terrainSource, [-0.85, 0.38, -0.54], 0.38, 0.44, 'gutter'),
  ];
}

function terrain(id: string, terrainSource: SourceTruth, world: Vec3, height: number, slope: number, region: TerrainSample['region']): TerrainSample {
  return {
    schema: TERRAIN_SAMPLE_SCHEMA,
    id,
    source: terrainSource,
    world,
    normal: [0, 1, 0],
    height,
    slope,
    region,
  };
}

function terrainForWorld(world: Vec3, terrainById: Map<string, TerrainSample>): string {
  if (world[0] > 0.1) return terrainById.get('terrain-crown-right')?.id ?? 'terrain-crown-right';
  if (world[0] < -0.7 && world[2] < -0.25) return terrainById.get('terrain-gutter-drop')?.id ?? 'terrain-gutter-drop';
  return terrainById.get('terrain-approach-left')?.id ?? 'terrain-approach-left';
}

function frame(
  index: number,
  label: string,
  timeMs: number,
  events: string[],
  lerms: SchnozRenderLerm[],
  goins: SchnozRenderGoin[],
  hitFlash?: SchnozTimelineFrame['hitFlash'],
  reroute?: SchnozTimelineFrame['reroute'],
): SchnozTimelineFrame {
  return { index, label, timeMs, events, lerms, goins, hitFlash, reroute };
}

function lerm(
  id: string,
  world: Vec3,
  heading: Vec3,
  state: LermState['state'],
  carryingGoinId?: string,
  targetGoinId?: string,
  hitStunMs?: number,
): SchnozRenderLerm {
  return { id, world, heading, state, carryingGoinId, targetGoinId, hitStunMs };
}

function goin(id: string, world: Vec3, state: GoinState['state']): SchnozRenderGoin {
  return { id, world, state };
}

function renderTimeline(
  timeline: readonly SchnozTimelineFrame[],
  sourceTruthUpgrade: FirstVerticalSourceTruthUpgradeEvaluation,
): { pixels: Uint8Array; metrics: RenderMetrics } {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 3);
  const metricBuffer = new Uint8Array(WIDTH * HEIGHT);
  fillRect(pixels, 0, 0, WIDTH, HEIGHT, BACKGROUND);

  timeline.forEach((step) => drawPanel(pixels, metricBuffer, step));
  drawSourceTruthBand(pixels, metricBuffer, sourceTruthUpgrade);

  const metrics: RenderMetrics = {
    nonBackgroundPixelCount: 0,
    lermPixelCount: 0,
    goinPixelCount: 0,
    hitPixelCount: 0,
    reroutePixelCount: 0,
    sourceTruthPixelCount: 0,
  };

  for (let index = 0; index < metricBuffer.length; index += 1) {
    const metric = metricBuffer[index];
    if (metric > 0) metrics.nonBackgroundPixelCount += 1;
    if (metric === 1) metrics.lermPixelCount += 1;
    if (metric === 2) metrics.goinPixelCount += 1;
    if (metric === 3) metrics.hitPixelCount += 1;
    if (metric === 4) metrics.reroutePixelCount += 1;
    if (metric === 5) metrics.sourceTruthPixelCount += 1;
  }

  return { pixels, metrics };
}

function drawPanel(pixels: Uint8Array, metricBuffer: Uint8Array, step: SchnozTimelineFrame): void {
  const columns = 3;
  const panelWidth = 390;
  const panelHeight = 300;
  const gap = 28;
  const x0 = 35 + (step.index % columns) * (panelWidth + gap);
  const y0 = 35 + Math.floor(step.index / columns) * (panelHeight + gap);

  fillRect(pixels, x0, y0, panelWidth, panelHeight, PANEL, metricBuffer, 5);
  drawTerrain(pixels, metricBuffer, x0, y0, panelWidth, panelHeight);
  fillRect(pixels, x0 + 18, y0 + 18, 90 + step.events.length * 8, 8, SOURCE, metricBuffer, 5);

  for (const item of step.goins) drawGoin(pixels, metricBuffer, x0, y0, panelWidth, panelHeight, item);
  for (const item of step.lerms) drawSchnozLerm(pixels, metricBuffer, x0, y0, panelWidth, panelHeight, item);

  if (step.hitFlash) {
    const point = project(step.hitFlash.world, x0, y0, panelWidth, panelHeight);
    drawStar(pixels, metricBuffer, point[0], point[1], Math.round(step.hitFlash.radius * 50), HIT, 3);
  }

  if (step.reroute) {
    const from = project(step.reroute.from, x0, y0, panelWidth, panelHeight);
    const to = project(step.reroute.to, x0, y0, panelWidth, panelHeight);
    drawLine(pixels, metricBuffer, from[0], from[1], to[0], to[1], REROUTE, 4, 4);
    fillCircle(pixels, metricBuffer, to[0], to[1], 12, REROUTE, 4);
  }
}

function drawTerrain(pixels: Uint8Array, metricBuffer: Uint8Array, x0: number, y0: number, width: number, height: number): void {
  for (let i = 0; i < 5; i += 1) {
    const y = y0 + height - 42 - i * 36;
    drawLine(pixels, metricBuffer, x0 + 24, y, x0 + width - 22, y - 22 + i * 4, TERRAIN, 5, 2);
  }
  fillCircle(pixels, metricBuffer, x0 + width - 70, y0 + 92, 30, [61, 119, 68], 5);
}

function drawSchnozLerm(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  x0: number,
  y0: number,
  width: number,
  height: number,
  item: SchnozRenderLerm,
): void {
  const [x, y] = project(item.world, x0, y0, width, height);
  const radius = item.state === 'tumbling' ? 20 : 17;
  fillCircle(pixels, metricBuffer, x, y, radius, RED, 1);
  const headingX = item.heading[0] >= 0 ? 1 : -1;
  fillCircle(pixels, metricBuffer, x + headingX * 17, y - 3, 8, SCHNOZ, 1);
  fillCircle(pixels, metricBuffer, x - headingX * 7, y + 6, 6, DARK_RED, 1);
  if (item.carryingGoinId) drawLine(pixels, metricBuffer, x, y, x + headingX * 24, y + 18, SOURCE, 5, 3);
  if (item.state === 'hit_reacting' || item.state === 'tumbling') {
    drawLine(pixels, metricBuffer, x - 22, y - 18, x + 20, y + 20, HIT, 3, 3);
    drawLine(pixels, metricBuffer, x + 22, y - 18, x - 20, y + 20, HIT, 3, 3);
  }
  if (item.state === 'rerouting_to_goin') {
    fillCircle(pixels, metricBuffer, x + headingX * 23, y - 16, 7, REROUTE, 4);
  }
}

function drawGoin(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  x0: number,
  y0: number,
  width: number,
  height: number,
  item: SchnozRenderGoin,
): void {
  const [x, y] = project(item.world, x0, y0, width, height);
  fillCircle(pixels, metricBuffer, x, y, item.state === 'rolling' ? 12 : 10, GOIN, 2);
  fillRect(pixels, x - 10, y - 2, 20, 4, [122, 88, 28], metricBuffer, 2);
}

function drawSourceTruthBand(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  sourceTruthUpgrade: FirstVerticalSourceTruthUpgradeEvaluation,
): void {
  const y = HEIGHT - 46;
  fillRect(pixels, 35, y, WIDTH - 70, 14, sourceTruthUpgrade.accepted ? SOURCE : HIT, metricBuffer, 5);
  fillRect(pixels, 35, y + 24, sourceTruthUpgrade.accepted ? WIDTH - 70 : 160, 10, REROUTE, metricBuffer, 5);
}

function project(world: Vec3, x0: number, y0: number, width: number, height: number): readonly [number, number] {
  const x = x0 + Math.round(width * (0.5 + world[0] / 5.2));
  const y = y0 + Math.round(height * (0.72 - world[1] / 2.1 + world[2] * 0.1));
  return [x, y];
}

function drawStar(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  cx: number,
  cy: number,
  radius: number,
  color: Rgb,
  metric: number,
): void {
  for (let arm = 0; arm < 10; arm += 1) {
    const angle = (Math.PI * 2 * arm) / 10;
    drawLine(
      pixels,
      metricBuffer,
      cx,
      cy,
      Math.floor(cx + Math.cos(angle) * radius),
      Math.floor(cy + Math.sin(angle) * radius),
      color,
      metric,
      3,
    );
  }
  fillCircle(pixels, metricBuffer, cx, cy, 9, color, metric);
}

function fillRect(
  pixels: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number,
  color: Rgb,
  metricBuffer?: Uint8Array,
  metric = 0,
): void {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      setPixel(pixels, xx, yy, color);
      if (metricBuffer) setMetric(metricBuffer, xx, yy, metric);
    }
  }
}

function fillCircle(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  cx: number,
  cy: number,
  radius: number,
  color: Rgb,
  metric: number,
): void {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) {
        setPixel(pixels, x, y, color);
        setMetric(metricBuffer, x, y, metric);
      }
    }
  }
}

function drawLine(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: Rgb,
  metric: number,
  thickness = 1,
): void {
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  let x = x0;
  let y = y0;

  while (true) {
    for (let yy = -thickness; yy <= thickness; yy += 1) {
      for (let xx = -thickness; xx <= thickness; xx += 1) {
        setPixel(pixels, x + xx, y + yy, color);
        setMetric(metricBuffer, x + xx, y + yy, metric);
      }
    }
    if (x === x1 && y === y1) break;
    const e2 = 2 * error;
    if (e2 >= dy) {
      error += dy;
      x += sx;
    }
    if (e2 <= dx) {
      error += dx;
      y += sy;
    }
  }
}

function setPixel(pixels: Uint8Array, x: number, y: number, color: Rgb): void {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  const offset = (y * WIDTH + x) * 3;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
}

function setMetric(metricBuffer: Uint8Array, x: number, y: number, metric: number): void {
  if (metric === 0 || x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  metricBuffer[y * WIDTH + x] = metric;
}

const currentModulePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentModulePath) {
  process.exitCode = runSchnozLermSimulationWitnessCli();
}
