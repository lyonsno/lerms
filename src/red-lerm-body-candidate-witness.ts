import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildRedLermBodyBakeoff,
  type RedLermBodyBakeoff,
  type RedLermBodyCandidate
} from './red-lerm-body-candidates.ts';

const WITNESS_SCHEMA = 'lerms.red-lerm-body-candidate-witness.v0' as const;
const ROUTE = 'lerms/red-lerm-body-candidate/witness-file' as const;
const WIDTH = 1280;
const HEIGHT = 720;

type Rgb = readonly [number, number, number];

type CliArgs = {
  report: string | null;
  image: string | null;
};

type RenderMetrics = {
  nonBackgroundPixelCount: number;
  baselinePixelCount: number;
  proceduralPixelCount: number;
  plannedExternalPixelCount: number;
  sourceTruthPixelCount: number;
};

const BACKGROUND: Rgb = [5, 12, 10];
const ROW_GUIDE: Rgb = [26, 66, 58];
const RED: Rgb = [222, 45, 58];
const DARK_RED: Rgb = [116, 18, 35];
const GOIN: Rgb = [239, 190, 68];
const WHITE: Rgb = [220, 238, 222];
const HIT: Rgb = [99, 204, 255];
const REROUTE: Rgb = [178, 118, 248];
const SOURCE: Rgb = [235, 213, 126];
const EXTERNAL: Rgb = [102, 166, 235];

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    report: null,
    image: null
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
    else throw new Error(`unknown argument ${key}`);

    index += 1;
  }

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

export function runRedLermBodyCandidateWitnessCli(argv = process.argv.slice(2)): number {
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

  const bakeoff = buildRedLermBodyBakeoff();
  const { pixels, metrics } = renderRedLermBodyCandidateSheet(bakeoff);
  writePpm(args.image, WIDTH, HEIGHT, pixels);
  writeJson(args.report, {
    ok: true,
    schema: WITNESS_SCHEMA,
    route: ROUTE,
    imagePath: args.image,
    width: WIDTH,
    height: HEIGHT,
    ...bakeoff,
    ...metrics
  });

  return 0;
}

export function renderRedLermBodyCandidateSheet(bakeoff: RedLermBodyBakeoff): {
  pixels: Uint8Array;
  metrics: RenderMetrics;
} {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 3);
  const metricBuffer = new Uint8Array(WIDTH * HEIGHT);
  fillRect(pixels, 0, 0, WIDTH, HEIGHT, BACKGROUND);

  drawColumnGuides(pixels, metricBuffer, bakeoff.requiredStateBuckets.length);
  bakeoff.candidates.forEach((candidate, index) => {
    drawCandidateRow(pixels, metricBuffer, candidate, index, bakeoff.requiredStateBuckets.length);
  });

  const metrics: RenderMetrics = {
    nonBackgroundPixelCount: 0,
    baselinePixelCount: 0,
    proceduralPixelCount: 0,
    plannedExternalPixelCount: 0,
    sourceTruthPixelCount: 0
  };

  for (let index = 0; index < metricBuffer.length; index += 1) {
    const metric = metricBuffer[index];
    if (metric > 0) metrics.nonBackgroundPixelCount += 1;
    if (metric === 1) metrics.baselinePixelCount += 1;
    if (metric === 2) metrics.proceduralPixelCount += 1;
    if (metric === 3) metrics.plannedExternalPixelCount += 1;
    if (metric === 4) metrics.sourceTruthPixelCount += 1;
  }

  return { pixels, metrics };
}

function drawColumnGuides(pixels: Uint8Array, metricBuffer: Uint8Array, bucketCount: number): void {
  for (let index = 0; index < bucketCount; index += 1) {
    const x = 228 + index * 92;
    fillRect(pixels, x - 2, 36, 4, 630, ROW_GUIDE, metricBuffer, 0);
    fillRect(pixels, x - 28, 30, 56, 8, index % 2 === 0 ? WHITE : SOURCE, metricBuffer, 4);
  }
}

function drawCandidateRow(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  candidate: RedLermBodyCandidate,
  rowIndex: number,
  bucketCount: number
): void {
  const rowY = 120 + rowIndex * 145;
  const metric = metricForCandidate(candidate);
  const statusWidth = Math.max(56, Math.min(184, candidate.evaluation.total * 3));

  fillRect(pixels, 42, rowY - 48, 152, 12, colorForCandidate(candidate), metricBuffer, metric);
  fillRect(pixels, 42, rowY - 27, statusWidth, 10, SOURCE, metricBuffer, 4);
  fillRect(pixels, 42, rowY - 9, candidate.affordance.canRepresentAllRequiredBuckets ? 142 : 74, 8, WHITE, metricBuffer, 4);
  fillRect(pixels, 42, rowY + 10, sourceWidth(candidate.sourceTruth.representationKind), 8, SOURCE, metricBuffer, 4);

  for (let index = 0; index < bucketCount; index += 1) {
    const x = 228 + index * 92;
    if (candidate.sourceTruth.representationKind === 'fixture_baseline') {
      drawSphereNub(pixels, metricBuffer, x, rowY, index, metric);
    } else if (candidate.sourceTruth.representationKind === 'authored_procedural') {
      drawProceduralThief(pixels, metricBuffer, x, rowY, index, metric);
    } else {
      drawPlannedExternalProbe(pixels, metricBuffer, x, rowY, index, metric);
    }
  }
}

function drawSphereNub(pixels: Uint8Array, metricBuffer: Uint8Array, x: number, y: number, index: number, metric: number): void {
  const lift = index === 5 ? -16 : index === 4 ? -8 : 0;
  fillCircle(pixels, metricBuffer, x, y + lift, 18, RED, metric);
  fillCircle(pixels, metricBuffer, x - 8, y + lift - 5, 7, DARK_RED, metric);
  if (index >= 1 && index <= 3) fillCircle(pixels, metricBuffer, x + 18, y + lift + 4, 7, GOIN, metric);
  if (index === 4 || index === 5) drawStar(pixels, metricBuffer, x + 18, y + lift - 18, 22, HIT, metric);
  if (index === 7) drawLine(pixels, metricBuffer, x - 14, y + 18, x + 22, y + 34, REROUTE, metric, 4);
}

function drawProceduralThief(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  x: number,
  y: number,
  index: number,
  metric: number
): void {
  const squash = index === 1 ? 0.75 : index === 5 ? 0.6 : 1;
  const lean = index >= 3 ? 10 : index === 4 ? -16 : 0;
  const rx = Math.round(25 + (index === 2 || index === 3 ? 4 : 0));
  const ry = Math.round(20 * squash);
  const bodyY = y + (1 - squash) * 20 + (index === 5 ? -18 : 0);

  fillEllipse(pixels, metricBuffer, x + lean, bodyY, rx, ry, RED, metric);
  fillCircle(pixels, metricBuffer, x - 14 + lean, bodyY - 8, 10, DARK_RED, metric);
  fillCircle(pixels, metricBuffer, x + 14 + lean, bodyY - 8, 4, WHITE, metric);
  drawLine(pixels, metricBuffer, x - 14 + lean, bodyY + 16, x - 30 + lean, bodyY + 28, RED, metric, 4);
  drawLine(pixels, metricBuffer, x + 15 + lean, bodyY + 16, x + 32 + lean, bodyY + 26, RED, metric, 4);

  if (index >= 1 && index <= 3) {
    fillCircle(pixels, metricBuffer, x + 28 + lean, bodyY + 2, 10, GOIN, metric);
    drawLine(pixels, metricBuffer, x + 14 + lean, bodyY + 2, x + 32 + lean, bodyY + 2, SOURCE, metric, 3);
  }
  if (index === 4 || index === 5) {
    drawStar(pixels, metricBuffer, x + 22 + lean, bodyY - 25, 28, HIT, metric);
    drawLine(pixels, metricBuffer, x - 18 + lean, bodyY, x - 42 + lean, bodyY - 24, RED, metric, 5);
    drawLine(pixels, metricBuffer, x + 18 + lean, bodyY, x + 46 + lean, bodyY + 28, RED, metric, 5);
  }
  if (index === 6) fillCircle(pixels, metricBuffer, x + 34, bodyY + 28, 11, GOIN, metric);
  if (index === 7) {
    drawLine(pixels, metricBuffer, x - 16, bodyY + 20, x + 36, bodyY + 36, REROUTE, metric, 5);
    fillCircle(pixels, metricBuffer, x + 46, bodyY + 40, 12, REROUTE, metric);
  }
}

function drawPlannedExternalProbe(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  x: number,
  y: number,
  index: number,
  metric: number
): void {
  const size = index === 0 ? 17 : 13;
  drawLine(pixels, metricBuffer, x - 24, y - 18, x + 24, y - 18, EXTERNAL, metric, 3);
  drawLine(pixels, metricBuffer, x + 24, y - 18, x + 18, y + 20, EXTERNAL, metric, 3);
  drawLine(pixels, metricBuffer, x + 18, y + 20, x - 20, y + 18, EXTERNAL, metric, 3);
  drawLine(pixels, metricBuffer, x - 20, y + 18, x - 24, y - 18, EXTERNAL, metric, 3);
  fillCircle(pixels, metricBuffer, x, y, size, [31, 58, 74], metric);
  fillRect(pixels, x - 16, y + 31, 32, 5, SOURCE, metricBuffer, 4);
}

function colorForCandidate(candidate: RedLermBodyCandidate): Rgb {
  if (candidate.sourceTruth.representationKind === 'authored_procedural') return RED;
  if (candidate.sourceTruth.representationKind === 'fixture_baseline') return DARK_RED;
  return EXTERNAL;
}

function metricForCandidate(candidate: RedLermBodyCandidate): number {
  if (candidate.sourceTruth.representationKind === 'fixture_baseline') return 1;
  if (candidate.sourceTruth.representationKind === 'authored_procedural') return 2;
  return 3;
}

function sourceWidth(representationKind: string): number {
  if (representationKind === 'authored_procedural') return 176;
  if (representationKind === 'fixture_baseline') return 130;
  return 102;
}

function drawStar(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  cx: number,
  cy: number,
  radius: number,
  color: Rgb,
  metric: number
): void {
  for (let arm = 0; arm < 8; arm += 1) {
    const angle = (Math.PI * 2 * arm) / 8;
    drawLine(
      pixels,
      metricBuffer,
      cx,
      cy,
      Math.floor(cx + Math.cos(angle) * radius),
      Math.floor(cy + Math.sin(angle) * radius),
      color,
      metric,
      3
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
  process.exitCode = runRedLermBodyCandidateWitnessCli();
}
