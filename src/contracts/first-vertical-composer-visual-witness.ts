import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  summarizeFirstVerticalFrame,
  type CarrierDropEvent,
  type FirstVerticalFrame,
  type GoinState,
  type JuiceHitEvent,
  type LermState,
  type Vec3
} from './first-vertical.ts';
import { buildFirstVerticalComposerFixtureFrame } from './first-vertical-composer-witness.ts';

const VISUAL_WITNESS_SCHEMA = 'lerms.first-vertical-composer-visual-witness.v0' as const;
const ROUTE = 'first-vertical-composer/visual-witness-file' as const;
const WIDTH = 1280;
const HEIGHT = 720;

type Rgb = readonly [number, number, number];

type CliArgs = {
  report: string | null;
  image: string | null;
  frameId: string;
  timestampMs: number;
  maxSampleAgeMs: number;
  redSampleAgeMs: number;
};

type RenderMetrics = {
  nonBackgroundPixelCount: number;
  terrainPixelCount: number;
  redLermPixelCount: number;
  goinPixelCount: number;
  hitPixelCount: number;
  dropPixelCount: number;
  sourceTruthPixelCount: number;
};

const BACKGROUND: Rgb = [6, 13, 11];
const TERRAIN_DARK: Rgb = [30, 82, 74];
const TERRAIN_LIGHT: Rgb = [72, 130, 94];
const TERRAIN_RIM: Rgb = [178, 148, 72];
const RED_BODY: Rgb = [222, 45, 58];
const RED_DARK: Rgb = [118, 18, 36];
const GOIN: Rgb = [238, 190, 67];
const GOIN_LIGHT: Rgb = [255, 228, 116];
const HIT: Rgb = [100, 205, 255];
const DROP: Rgb = [177, 117, 248];
const SOURCE_BAND: Rgb = [218, 238, 220];
const SOURCE_WARN: Rgb = [244, 193, 88];

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    report: null,
    image: null,
    frameId: 'first-vertical-composer-visual-witness',
    timestampMs: 0,
    maxSampleAgeMs: 500,
    redSampleAgeMs: 0
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key.startsWith('--')) continue;
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${key}`);
    }

    if (key === '--report') args.report = value;
    else if (key === '--image') args.image = value;
    else if (key === '--frame-id') args.frameId = value;
    else if (key === '--timestamp-ms') args.timestampMs = Number(value);
    else if (key === '--max-sample-age-ms') args.maxSampleAgeMs = Number(value);
    else if (key === '--red-sample-age-ms') args.redSampleAgeMs = Number(value);
    else throw new Error(`unknown argument ${key}`);

    index += 1;
  }

  if (!Number.isFinite(args.timestampMs)) throw new Error('timestamp-ms must be finite');
  if (!Number.isFinite(args.maxSampleAgeMs)) throw new Error('max-sample-age-ms must be finite');
  if (!Number.isFinite(args.redSampleAgeMs)) throw new Error('red-sample-age-ms must be finite');

  return args;
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

function writePpm(path: string, width: number, height: number, pixels: Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, 'ascii');
  writeFileSync(path, Buffer.concat([header, Buffer.from(pixels)]));
}

export function runFirstVerticalComposerVisualWitnessCli(argv = process.argv.slice(2)): number {
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

  try {
    const frame = buildFirstVerticalComposerFixtureFrame({
      frameId: args.frameId,
      timestampMs: args.timestampMs,
      maxSampleAgeMs: args.maxSampleAgeMs,
      redSampleAgeMs: args.redSampleAgeMs
    });
    const { pixels, metrics } = renderFirstVerticalComposerFrame(frame);
    const summary = summarizeFirstVerticalFrame(frame);

    writePpm(args.image, WIDTH, HEIGHT, pixels);
    writeJson(args.report, {
      ok: true,
      schema: VISUAL_WITNESS_SCHEMA,
      route: ROUTE,
      chamberId: 'lerms-underhill',
      authorityNote: 'integrated fixture evidence; not a live first vertical',
      frameSchema: frame.schema,
      sourceAuthority: frame.source.authority,
      frameSourceRoute: frame.source.route,
      imagePath: args.image,
      width: WIDTH,
      height: HEIGHT,
      summary,
      intentionallyEmpty: {
        liveFingerJuicePackets: true,
        liveGoinPhysics: true,
        liveCrowdAi: true,
        generatedLermMotion: true
      },
      ...metrics
    });
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeJson(args.report, {
      ok: false,
      phase: 'rendering-first-vertical-composer-visual-witness',
      failureKind: 'composer-visual-witness-invalid',
      error: message,
      route: ROUTE,
      lastTrustworthyEvidence: {
        reportPath: args.report,
        imagePath: args.image,
        frameId: args.frameId,
        timestampMs: args.timestampMs,
        redSampleAgeMs: args.redSampleAgeMs,
        maxSampleAgeMs: args.maxSampleAgeMs
      }
    });
    return 1;
  }
}

export function renderFirstVerticalComposerFrame(frame: FirstVerticalFrame): {
  pixels: Uint8Array;
  metrics: RenderMetrics;
} {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 3);
  const metricBuffer = new Uint8Array(WIDTH * HEIGHT);
  fillRect(pixels, 0, 0, WIDTH, HEIGHT, BACKGROUND, metricBuffer, 0);

  drawUnderhillTerrain(pixels, metricBuffer);
  drawSourceTruthPanel(pixels, metricBuffer, frame);
  frame.goins.forEach((goin) => drawGoin(pixels, metricBuffer, goin));
  frame.lerms.forEach((lerm, index) => drawLerm(pixels, metricBuffer, lerm, index));
  frame.juiceHits.forEach((hit) => drawHit(pixels, metricBuffer, hit));
  frame.carrierDropEvents.forEach((drop) => drawDrop(pixels, metricBuffer, drop));

  const metrics: RenderMetrics = {
    nonBackgroundPixelCount: 0,
    terrainPixelCount: 0,
    redLermPixelCount: 0,
    goinPixelCount: 0,
    hitPixelCount: 0,
    dropPixelCount: 0,
    sourceTruthPixelCount: 0
  };

  for (let index = 0; index < metricBuffer.length; index += 1) {
    const metric = metricBuffer[index];
    if (metric > 0) metrics.nonBackgroundPixelCount += 1;
    if (metric === 1) metrics.terrainPixelCount += 1;
    if (metric === 2) metrics.redLermPixelCount += 1;
    if (metric === 3) metrics.goinPixelCount += 1;
    if (metric === 4) metrics.hitPixelCount += 1;
    if (metric === 5) metrics.dropPixelCount += 1;
    if (metric === 6) metrics.sourceTruthPixelCount += 1;
  }

  return { pixels, metrics };
}

function drawUnderhillTerrain(pixels: Uint8Array, metricBuffer: Uint8Array): void {
  for (let band = 0; band < 9; band += 1) {
    const y0 = 618 - band * 34;
    const y1 = 575 - band * 27;
    drawLine(pixels, metricBuffer, 48, y0, 960, y1, band % 2 === 0 ? TERRAIN_DARK : TERRAIN_LIGHT, 1, 7);
  }

  drawLine(pixels, metricBuffer, 70, 600, 965, 380, TERRAIN_RIM, 1, 10);
  drawLine(pixels, metricBuffer, 72, 648, 1008, 512, [20, 58, 53], 1, 15);
  fillCircle(pixels, metricBuffer, 982, 376, 20, GOIN, 3);
}

function drawSourceTruthPanel(pixels: Uint8Array, metricBuffer: Uint8Array, frame: FirstVerticalFrame): void {
  fillRect(pixels, 1028, 54, 190, 14, SOURCE_BAND, metricBuffer, 6);
  fillRect(pixels, 1028, 82, frame.source.authority === 'synthetic_fixture' ? 154 : 70, 14, SOURCE_WARN, metricBuffer, 6);
  fillRect(pixels, 1028, 110, 130, 14, SOURCE_BAND, metricBuffer, 6);
  fillRect(pixels, 1028, 138, 162, 14, SOURCE_WARN, metricBuffer, 6);
  fillRect(pixels, 1028, 182, 38 + frame.lerms.length * 12, 12, RED_BODY, metricBuffer, 6);
  fillRect(pixels, 1028, 210, 38 + frame.goins.length * 28, 12, GOIN, metricBuffer, 6);
  fillRect(pixels, 1028, 238, 38 + frame.juiceHits.length * 52, 12, HIT, metricBuffer, 6);
  fillRect(pixels, 1028, 266, 38 + frame.carrierDropEvents.length * 52, 12, DROP, metricBuffer, 6);

  for (let index = 0; index < 4; index += 1) {
    fillRect(pixels, 1028, 330 + index * 31, 166, 10, SOURCE_WARN, metricBuffer, 6);
    fillRect(pixels, 1028, 344 + index * 31, 92, 6, SOURCE_BAND, metricBuffer, 6);
  }
}

function drawLerm(pixels: Uint8Array, metricBuffer: Uint8Array, lerm: LermState, index: number): void {
  const point = project(lerm.world);
  const bob = lerm.state === 'tumbling' ? 20 : lerm.state === 'hit_reacting' ? 12 : 0;
  const rx = lerm.state === 'tumbling' ? 24 : 30;
  const ry = lerm.state === 'tumbling' ? 16 : 22;
  const y = point.y - bob;

  fillEllipse(pixels, metricBuffer, point.x, y, rx, ry, RED_BODY, 2);
  fillEllipse(pixels, metricBuffer, point.x - 14, y - 7, 11, 8, RED_DARK, 2);
  fillCircle(pixels, metricBuffer, point.x + 17, y - 8, 4, SOURCE_BAND, 2);
  drawLine(
    pixels,
    metricBuffer,
    point.x,
    y,
    point.x + Math.floor(lerm.heading[0] * 34),
    y - Math.floor(lerm.heading[2] * 20),
    SOURCE_BAND,
    2,
    3
  );
  fillRect(pixels, point.x - 22, y - 44, 44 + index * 3, 7, stateColor(lerm.state), metricBuffer, 2);

  if (lerm.carryingGoinId) {
    fillCircle(pixels, metricBuffer, point.x + 28, y + 4, 10, GOIN, 3);
  }
}

function drawGoin(pixels: Uint8Array, metricBuffer: Uint8Array, goin: GoinState): void {
  const point = project(goin.world);
  const radius = goin.state === 'rolling' ? 17 : 14;
  fillCircle(pixels, metricBuffer, point.x, point.y + 32, radius, GOIN, 3);
  drawLine(pixels, metricBuffer, point.x - radius, point.y + 32, point.x + radius, point.y + 32, GOIN_LIGHT, 3, 2);
  if (goin.state === 'rolling') {
    drawLine(pixels, metricBuffer, point.x - 28, point.y + 48, point.x + 30, point.y + 62, DROP, 5, 3);
  }
}

function drawHit(pixels: Uint8Array, metricBuffer: Uint8Array, hit: JuiceHitEvent): void {
  const point = project(hit.contactWorld);
  for (let arm = 0; arm < 10; arm += 1) {
    const angle = (Math.PI * 2 * arm) / 10;
    drawLine(
      pixels,
      metricBuffer,
      point.x,
      point.y - 8,
      Math.floor(point.x + Math.cos(angle) * 38),
      Math.floor(point.y - 8 + Math.sin(angle) * 38),
      HIT,
      4,
      3
    );
  }
  fillCircle(pixels, metricBuffer, point.x, point.y - 8, 12, HIT, 4);
}

function drawDrop(pixels: Uint8Array, metricBuffer: Uint8Array, drop: CarrierDropEvent): void {
  const point = project(drop.world);
  drawLine(pixels, metricBuffer, point.x - 34, point.y + 24, point.x + 34, point.y + 24, DROP, 5, 5);
  drawLine(pixels, metricBuffer, point.x, point.y - 10, point.x, point.y + 58, DROP, 5, 5);
  drawCircleOutline(pixels, metricBuffer, point.x, point.y + 24, Math.floor(drop.rerouteRadius * 24), DROP, 5);
}

function project(world: Vec3): { x: number; y: number } {
  const zT = (world[2] + 0.52) / 1.08;
  const x = Math.round(140 + zT * 765 + world[0] * 250);
  const y = Math.round(582 - zT * 200 - (world[1] - 1) * 76);
  return { x, y };
}

function stateColor(state: string): Rgb {
  if (state.includes('hit') || state.includes('tumbling')) return HIT;
  if (state.includes('rerouting')) return DROP;
  if (state.includes('carrying') || state.includes('stealing')) return GOIN;
  return SOURCE_BAND;
}

function fillRect(
  pixels: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number,
  color: Rgb,
  metricBuffer?: Uint8Array,
  metric = 0
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
  metric: number
): void {
  fillEllipse(pixels, metricBuffer, cx, cy, radius, radius, color, metric);
}

function fillEllipse(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: Rgb,
  metric: number
): void {
  for (let y = cy - ry; y <= cy + ry; y += 1) {
    for (let x = cx - rx; x <= cx + rx; x += 1) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1) {
        setPixel(pixels, x, y, color);
        setMetric(metricBuffer, x, y, metric);
      }
    }
  }
}

function drawCircleOutline(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  cx: number,
  cy: number,
  radius: number,
  color: Rgb,
  metric: number
): void {
  for (let angle = 0; angle < Math.PI * 2; angle += 0.035) {
    const x = Math.round(cx + Math.cos(angle) * radius);
    const y = Math.round(cy + Math.sin(angle) * radius);
    fillRect(pixels, x - 2, y - 2, 5, 5, color, metricBuffer, metric);
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
  thickness = 1
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
  process.exitCode = runFirstVerticalComposerVisualWitnessCli();
}
