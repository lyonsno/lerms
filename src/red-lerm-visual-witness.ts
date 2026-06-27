import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RED_LERM_BODY_MOTION_SCHEMA,
  buildRedLermBodyMotionWitness,
  type RedLermBodyMotionSample,
} from './red-lerm-body-motion.ts';

const VISUAL_WITNESS_SCHEMA = 'lerms.red-lerm-visual-witness.v0' as const;
const WIDTH = 1280;
const HEIGHT = 360;
const PANEL_COUNT = 8;
const PANEL_WIDTH = WIDTH / PANEL_COUNT;

type Rgb = readonly [number, number, number];

type CliArgs = {
  report: string | null;
  image: string | null;
};

type RenderMetrics = {
  nonBackgroundPixelCount: number;
  redBodyPixelCount: number;
  goinPixelCount: number;
  hitFlashPixelCount: number;
  rerouteLinePixelCount: number;
};

const BACKGROUND: Rgb = [5, 12, 10];
const TERRAIN: Rgb = [38, 95, 79];
const RED_BODY: Rgb = [220, 46, 58];
const DARK_RED: Rgb = [124, 20, 37];
const GOIN: Rgb = [232, 185, 72];
const HIT_FLASH: Rgb = [108, 202, 255];
const REROUTE: Rgb = [172, 116, 245];
const WHITE: Rgb = [232, 245, 230];

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    report: null,
    image: null,
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

export function runRedLermVisualWitnessCli(argv = process.argv.slice(2)): number {
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

  const witness = buildRedLermBodyMotionWitness();
  const { pixels, metrics } = renderRedLermFilmstrip(witness.samples);
  writePpm(args.image, WIDTH, HEIGHT, pixels);

  writeJson(args.report, {
    ok: true,
    schema: VISUAL_WITNESS_SCHEMA,
    motionSchema: RED_LERM_BODY_MOTION_SCHEMA,
    frameSchema: witness.firstVerticalFrame.schema,
    sourceAuthority: witness.firstVerticalFrame.source.authority,
    imagePath: args.image,
    width: WIDTH,
    height: HEIGHT,
    renderedStateBuckets: witness.samples.map((sample) => sample.stateBucket),
    ...metrics,
  });

  return 0;
}

export function renderRedLermFilmstrip(samples: readonly RedLermBodyMotionSample[]): {
  pixels: Uint8Array;
  metrics: RenderMetrics;
} {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 3);
  const metricBuffer = new Uint8Array(WIDTH * HEIGHT);
  fillRect(pixels, 0, 0, WIDTH, HEIGHT, BACKGROUND);

  samples.forEach((sample, index) => renderPanel(pixels, metricBuffer, sample, index));

  const metrics: RenderMetrics = {
    nonBackgroundPixelCount: 0,
    redBodyPixelCount: 0,
    goinPixelCount: 0,
    hitFlashPixelCount: 0,
    rerouteLinePixelCount: 0,
  };

  for (let index = 0; index < metricBuffer.length; index += 1) {
    const value = metricBuffer[index];
    if (value > 0) metrics.nonBackgroundPixelCount += 1;
    if (value === 1) metrics.redBodyPixelCount += 1;
    if (value === 2) metrics.goinPixelCount += 1;
    if (value === 3) metrics.hitFlashPixelCount += 1;
    if (value === 4) metrics.rerouteLinePixelCount += 1;
  }

  return { pixels, metrics };
}

function renderPanel(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  sample: RedLermBodyMotionSample,
  index: number,
): void {
  const left = Math.floor(index * PANEL_WIDTH);
  const right = Math.floor(left + PANEL_WIDTH);
  const midX = Math.floor(left + PANEL_WIDTH * 0.5);
  const terrainY = Math.floor(250 - sample.terrainContact.slope * 85);
  const bodyX = Math.floor(left + 38 + sample.t * 22);
  const bodyY = Math.floor(terrainY - 28 - sample.bodyPose.compression * 24);
  const bodyRx = Math.floor(26 + sample.bodyPose.silhouetteScale[0] * 10);
  const bodyRy = Math.floor(16 + sample.bodyPose.silhouetteScale[1] * 8);
  const goinX = Math.floor(bodyX + (sample.carryingGoin ? 26 : sample.stateBucket === 'reroute-loose-goin' ? 30 : 12));
  const goinY = Math.floor(bodyY + (sample.carryingGoin ? 4 : sample.stateBucket === 'drop-goin' ? 38 : 28));

  fillRect(pixels, left, 0, 1, HEIGHT, [18, 44, 38]);
  drawLine(pixels, metricBuffer, left + 8, terrainY, right - 8, terrainY - 28, TERRAIN, 0, 3);
  drawLine(pixels, metricBuffer, left + 8, terrainY + 18, right - 8, terrainY - 10, [21, 56, 48], 0, 2);

  if (sample.hitReaction.kind !== 'none') {
    drawStar(pixels, metricBuffer, bodyX + 22, bodyY - 24, 28, HIT_FLASH, 3);
  }

  const leanOffset = Math.floor(sample.bodyPose.lean * 12);
  const flail = Math.floor(sample.bodyPose.flailAmplitude * 28);
  fillEllipse(pixels, metricBuffer, bodyX + leanOffset, bodyY, bodyRx, bodyRy, RED_BODY, 1);
  fillEllipse(pixels, metricBuffer, bodyX - 10 + leanOffset, bodyY - 6, 10, 8, DARK_RED, 1);
  fillCircle(pixels, metricBuffer, bodyX + 16 + leanOffset, bodyY - 6, 4, WHITE, 1);

  drawLine(pixels, metricBuffer, bodyX - 16, bodyY + 12, bodyX - 30, bodyY + 18 + flail, RED_BODY, 1, 4);
  drawLine(pixels, metricBuffer, bodyX + 18, bodyY + 12, bodyX + 34, bodyY + 18 - flail, RED_BODY, 1, 4);

  if (sample.goinInteraction.kind !== 'none') {
    fillCircle(pixels, metricBuffer, goinX, goinY, sample.carryingGoin ? 10 : 12, GOIN, 2);
    drawLine(pixels, metricBuffer, goinX - 8, goinY, goinX + 8, goinY, [255, 222, 112], 2, 2);
  }

  if (sample.rerouteIntent.kind === 'loose-goin-chase') {
    const targetX = Math.min(right - 24, goinX + 28);
    const targetY = goinY + 16;
    drawLine(pixels, metricBuffer, bodyX, bodyY, targetX, targetY, REROUTE, 4, 6);
    fillCircle(pixels, metricBuffer, targetX, targetY, 14, REROUTE, 4);
  }

  drawStateGlyph(pixels, metricBuffer, left + 12, 22, sample.stateBucket);
}

function drawStateGlyph(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  x: number,
  y: number,
  state: string,
): void {
  const color: Rgb = state.includes('hit') || state.includes('tumble') ? HIT_FLASH : state.includes('reroute') ? REROUTE : WHITE;
  const width = Math.min(118, Math.max(28, state.length * 5));
  fillRect(pixels, x, y, width, 8, color);
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
      3,
    );
  }
  fillCircle(pixels, metricBuffer, cx, cy, 10, color, metric);
}

function fillRect(pixels: Uint8Array, x: number, y: number, width: number, height: number, color: Rgb): void {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      setPixel(pixels, xx, yy, color);
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
  metric: number,
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
  process.exitCode = runRedLermVisualWitnessCli();
}
