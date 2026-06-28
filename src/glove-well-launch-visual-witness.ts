import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GLOVE_WELL_LAUNCH_WITNESS_SCHEMA,
  buildGloveWellLaunchWitnessReport,
  type GloveWellLaunchWitnessReport
} from './glove-well-command.ts';

export const GLOVE_WELL_LAUNCH_VISUAL_WITNESS_SCHEMA = 'lerms.glove-well-launch-visual-witness.v0' as const;
export const GLOVE_WELL_LAUNCH_VISUAL_ROUTE = 'lerms/glove-well-launch/visual-witness-file' as const;

const WIDTH = 1440;
const HEIGHT = 480;
const PANEL_COUNT = 6;
const PANEL_WIDTH = WIDTH / PANEL_COUNT;

type Rgb = readonly [number, number, number];

interface CliArgs {
  report: string | null;
  image: string | null;
  frameId: string;
  timestampMs: number;
}

interface RenderMetrics {
  nonBackgroundPixelCount: number;
  gloveWellPixelCount: number;
  goinPixelCount: number;
  arcPixelCount: number;
  launchPixelCount: number;
  reroutePixelCount: number;
  sourceTruthPixelCount: number;
}

const BACKGROUND: Rgb = [8, 13, 18];
const PANEL_EDGE: Rgb = [25, 39, 47];
const TERRAIN: Rgb = [43, 91, 78];
const TERRAIN_DARK: Rgb = [20, 52, 49];
const GLOVE_WELL: Rgb = [157, 92, 216];
const GLOVE_WELL_GLOW: Rgb = [234, 205, 112];
const GOIN: Rgb = [239, 188, 62];
const GOIN_LIGHT: Rgb = [255, 229, 122];
const FINGER: Rgb = [220, 226, 213];
const ARC: Rgb = [126, 210, 255];
const LAUNCH: Rgb = [255, 124, 78];
const LERM: Rgb = [224, 48, 60];
const REROUTE: Rgb = [178, 117, 248];
const SOURCE_TRUTH: Rgb = [238, 221, 150];
const SOURCE_WARN: Rgb = [244, 177, 84];

const PANELS = [
  'glove-well-idle',
  'pinch-prime',
  'pinky-aim',
  'release-launch',
  'bounce-roll',
  'lerm-reroute'
] as const;

export function runGloveWellLaunchVisualWitnessCli(argv = process.argv.slice(2)): number {
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
    const launchWitness = buildGloveWellLaunchWitnessReport({
      outputPath: args.report,
      frameId: args.frameId,
      timestampMs: args.timestampMs
    });
    const { pixels, metrics } = renderGloveWellLaunchFilmstrip(launchWitness);

    writePpm(args.image, WIDTH, HEIGHT, pixels);
    writeJson(args.report, {
      ok: true,
      schema: GLOVE_WELL_LAUNCH_VISUAL_WITNESS_SCHEMA,
      launchWitnessSchema: GLOVE_WELL_LAUNCH_WITNESS_SCHEMA,
      frameSchema: launchWitness.frame.schema,
      route: GLOVE_WELL_LAUNCH_VISUAL_ROUTE,
      sourceAuthority: launchWitness.frame.source.authority,
      effectiveAuthority: launchWitness.sourceTruthEvaluation.effectiveAuthority,
      authorityNote: 'operator visual smoke over fixture glove input; not live WiLoR evidence',
      imagePath: args.image,
      width: WIDTH,
      height: HEIGHT,
      renderedPanels: [...PANELS],
      sourceTruthBlockers: launchWitness.sourceTruthEvaluation.blockers,
      launchEvidence: launchWitness.launchEvidence,
      summary: launchWitness.summary,
      ...metrics
    });
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeJson(args.report, {
      ok: false,
      schema: GLOVE_WELL_LAUNCH_VISUAL_WITNESS_SCHEMA,
      phase: 'rendering-glove-well-launch-filmstrip',
      failureKind: 'glove-well-launch-visual-invalid',
      error: message,
      route: GLOVE_WELL_LAUNCH_VISUAL_ROUTE,
      lastTrustworthyEvidence: {
        reportPath: args.report,
        imagePath: args.image,
        frameId: args.frameId,
        timestampMs: args.timestampMs
      }
    });
    return 1;
  }
}

export function renderGloveWellLaunchFilmstrip(launchWitness: GloveWellLaunchWitnessReport): {
  pixels: Uint8Array;
  metrics: RenderMetrics;
} {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 3);
  const metricBuffer = new Uint8Array(WIDTH * HEIGHT);
  fillRect(pixels, metricBuffer, 0, 0, WIDTH, HEIGHT, BACKGROUND, 0);

  PANELS.forEach((panel, index) => {
    renderPanel(pixels, metricBuffer, launchWitness, panel, index);
  });
  drawSourceTruthRail(pixels, metricBuffer, launchWitness);

  const metrics: RenderMetrics = {
    nonBackgroundPixelCount: 0,
    gloveWellPixelCount: 0,
    goinPixelCount: 0,
    arcPixelCount: 0,
    launchPixelCount: 0,
    reroutePixelCount: 0,
    sourceTruthPixelCount: 0
  };

  for (let index = 0; index < metricBuffer.length; index += 1) {
    const value = metricBuffer[index];
    if (value > 0) metrics.nonBackgroundPixelCount += 1;
    if (value === 1) metrics.gloveWellPixelCount += 1;
    if (value === 2) metrics.goinPixelCount += 1;
    if (value === 3) metrics.arcPixelCount += 1;
    if (value === 4) metrics.launchPixelCount += 1;
    if (value === 5) metrics.reroutePixelCount += 1;
    if (value === 6) metrics.sourceTruthPixelCount += 1;
  }

  return { pixels, metrics };
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    report: null,
    image: null,
    frameId: 'glove-well-launch-visual-witness',
    timestampMs: 0
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
    else throw new Error(`unknown argument ${key}`);

    index += 1;
  }

  if (!Number.isFinite(args.timestampMs)) throw new Error('timestamp-ms must be finite');
  return args;
}

function renderPanel(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  launchWitness: GloveWellLaunchWitnessReport,
  panel: (typeof PANELS)[number],
  index: number
): void {
  const left = Math.floor(index * PANEL_WIDTH);
  const centerX = Math.floor(left + PANEL_WIDTH * 0.5);
  const terrainY = 340;
  const wellX = left + 58;
  const wellY = 282;
  const goinX = left + 104 + index * 18;
  const goinY = panel === 'release-launch' ? 204 : panel === 'bounce-roll' ? 302 : panel === 'lerm-reroute' ? 318 : 270;

  fillRect(pixels, metricBuffer, left, 0, 1, HEIGHT, PANEL_EDGE, 6);
  fillRect(pixels, metricBuffer, left + 7, 24, 116, 9, panel === 'lerm-reroute' ? REROUTE : SOURCE_TRUTH, 6);
  drawTerrain(pixels, metricBuffer, left, terrainY);
  drawGloveWell(pixels, metricBuffer, wellX, wellY, panel !== 'glove-well-idle');

  if (panel === 'glove-well-idle') {
    drawGoin(pixels, metricBuffer, wellX + 4, wellY - 20, 16);
    drawFingers(pixels, metricBuffer, left + 154, 176, false, false);
  } else if (panel === 'pinch-prime') {
    drawFingers(pixels, metricBuffer, left + 154, 176, true, false);
    drawLine(pixels, metricBuffer, left + 155, 184, wellX + 16, wellY - 22, GLOVE_WELL_GLOW, 1, 4);
    drawGoin(pixels, metricBuffer, wellX + 40, wellY - 56, 17);
  } else if (panel === 'pinky-aim') {
    drawFingers(pixels, metricBuffer, left + 154, 176, true, true);
    drawArc(pixels, metricBuffer, launchWitness, left, 0);
    drawGoin(pixels, metricBuffer, left + 112, 214, 17);
  } else if (panel === 'release-launch') {
    drawFingers(pixels, metricBuffer, left + 154, 176, false, true);
    drawArc(pixels, metricBuffer, launchWitness, left, 0);
    drawLine(pixels, metricBuffer, left + 108, 218, centerX + 34, 168, LAUNCH, 4, 6);
    drawGoin(pixels, metricBuffer, centerX + 38, 168, 16);
    drawStar(pixels, metricBuffer, centerX + 12, 194, 22, LAUNCH, 4);
  } else if (panel === 'bounce-roll') {
    drawLine(pixels, metricBuffer, left + 86, 214, goinX + 64, goinY, LAUNCH, 4, 5);
    drawGoin(pixels, metricBuffer, goinX + 62, goinY, 18);
    drawRollMarks(pixels, metricBuffer, goinX + 62, goinY);
  } else {
    drawGoin(pixels, metricBuffer, goinX + 62, goinY, 18);
    drawRollMarks(pixels, metricBuffer, goinX + 62, goinY);
    drawReroutingLerms(pixels, metricBuffer, left, goinX + 62, goinY);
  }
}

function drawTerrain(pixels: Uint8Array, metricBuffer: Uint8Array, left: number, y: number): void {
  drawLine(pixels, metricBuffer, left + 20, y + 20, left + PANEL_WIDTH - 12, y - 28, TERRAIN, 0, 5);
  drawLine(pixels, metricBuffer, left + 20, y + 54, left + PANEL_WIDTH - 10, y + 8, TERRAIN_DARK, 0, 7);
  fillRect(pixels, metricBuffer, left + 20, y + 58, Math.floor(PANEL_WIDTH - 32), 8, TERRAIN_DARK, 0);
}

function drawGloveWell(pixels: Uint8Array, metricBuffer: Uint8Array, cx: number, cy: number, active: boolean): void {
  fillCircle(pixels, metricBuffer, cx, cy, active ? 33 : 29, GLOVE_WELL, 1);
  fillCircle(pixels, metricBuffer, cx + 7, cy - 8, active ? 18 : 14, GLOVE_WELL_GLOW, 1);
  drawLine(pixels, metricBuffer, cx - 28, cy + 18, cx + 32, cy + 12, [89, 48, 132], 1, 4);
}

function drawFingers(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  x: number,
  y: number,
  pinched: boolean,
  pinky: boolean
): void {
  fillCircle(pixels, metricBuffer, x, y + 56, 20, FINGER, 0);
  drawLine(pixels, metricBuffer, x - 24, y + 46, x - (pinched ? 6 : 45), y + (pinched ? 16 : 4), FINGER, 0, 8);
  drawLine(pixels, metricBuffer, x + 4, y + 38, x + (pinched ? 10 : 42), y + (pinched ? 14 : -18), FINGER, 0, 8);
  drawLine(pixels, metricBuffer, x + 22, y + 48, x + (pinky ? 74 : 44), y + (pinky ? 2 : 38), FINGER, 0, 7);
}

function drawArc(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  launchWitness: GloveWellLaunchWitnessReport,
  left: number,
  yOffset: number
): void {
  for (const sample of launchWitness.launchEvidence.arcSamples) {
    const x = left + 60 + Math.floor(sample.x * 150);
    const y = yOffset + 92 + Math.floor(sample.y * 170);
    fillCircle(pixels, metricBuffer, x, y, 5, ARC, 3);
  }
}

function drawGoin(pixels: Uint8Array, metricBuffer: Uint8Array, cx: number, cy: number, radius: number): void {
  fillEllipse(pixels, metricBuffer, cx, cy, radius + 7, radius, GOIN, 2);
  fillEllipse(pixels, metricBuffer, cx - 3, cy - 3, radius - 2, radius - 5, GOIN_LIGHT, 2);
  drawLine(pixels, metricBuffer, cx - radius, cy, cx + radius, cy, [147, 98, 34], 2, 3);
}

function drawRollMarks(pixels: Uint8Array, metricBuffer: Uint8Array, cx: number, cy: number): void {
  for (let index = 0; index < 4; index += 1) {
    drawLine(pixels, metricBuffer, cx - 38 - index * 12, cy + 18 + index * 2, cx - 18 - index * 12, cy + 15, LAUNCH, 4, 3);
  }
}

function drawReroutingLerms(pixels: Uint8Array, metricBuffer: Uint8Array, left: number, goinX: number, goinY: number): void {
  const lerms = [
    { x: left + 60, y: 330 },
    { x: left + 150, y: 356 }
  ];
  for (const lerm of lerms) {
    fillEllipse(pixels, metricBuffer, lerm.x, lerm.y, 26, 17, LERM, 5);
    fillCircle(pixels, metricBuffer, lerm.x + 17, lerm.y - 6, 5, [105, 15, 28], 5);
    drawLine(pixels, metricBuffer, lerm.x + 22, lerm.y - 5, goinX, goinY, REROUTE, 5, 5);
  }
}

function drawSourceTruthRail(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  launchWitness: GloveWellLaunchWitnessReport
): void {
  const y = HEIGHT - 40;
  fillRect(pixels, metricBuffer, 20, y, 340, 12, SOURCE_WARN, 6);
  fillRect(pixels, metricBuffer, 388, y, 260, 12, SOURCE_TRUTH, 6);
  fillRect(pixels, metricBuffer, 680, y, launchWitness.sourceTruthEvaluation.blockers.length * 72, 12, SOURCE_WARN, 6);
  fillRect(pixels, metricBuffer, 20, y + 20, 190, 8, SOURCE_TRUTH, 6);
  fillRect(pixels, metricBuffer, 240, y + 20, 280, 8, SOURCE_WARN, 6);
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
  const minX = Math.max(0, Math.floor(cx - rx));
  const maxX = Math.min(WIDTH - 1, Math.ceil(cx + rx));
  const minY = Math.max(0, Math.floor(cy - ry));
  const maxY = Math.min(HEIGHT - 1, Math.ceil(cy + ry));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPixel(pixels, metricBuffer, x, y, color, metric);
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
  thickness: number
): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    fillCircle(pixels, metricBuffer, x, y, Math.max(1, Math.floor(thickness / 2)), color, metric);
  }
}

function fillRect(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number,
  color: Rgb,
  metric: number
): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(WIDTH, Math.ceil(x + width));
  const y1 = Math.min(HEIGHT, Math.ceil(y + height));
  for (let yy = y0; yy < y1; yy += 1) {
    for (let xx = x0; xx < x1; xx += 1) {
      setPixel(pixels, metricBuffer, xx, yy, color, metric);
    }
  }
}

function setPixel(
  pixels: Uint8Array,
  metricBuffer: Uint8Array,
  x: number,
  y: number,
  color: Rgb,
  metric: number
): void {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const offset = (y * WIDTH + x) * 3;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  metricBuffer[y * WIDTH + x] = metric;
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runGloveWellLaunchVisualWitnessCli();
}
