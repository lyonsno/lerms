import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HILL_HORDE_LIVE_TRAVERSAL_ADMISSION_SCHEMA,
  HILL_HORDE_LIVE_TRAVERSAL_ROUTE,
  composeHordeTraversalIntoLiveHill,
  type ComposeHordeTraversalIntoLiveHillInput,
  type HillHordeLiveTraversalAdmissionReceipt,
} from './hill-horde-live-traversal-admission.js';
import type { LermHordeProducerHistoryCompositionReceipt } from './lerm-horde-producer-history-composition.js';
import {
  sampleHillOfHillsProducerTrafficField,
} from './terrain/hill-of-hills-producer-contact-history.js';
import type { HillOfHillsTerrain } from './terrain/hill-of-hills.js';

export const HILL_HORDE_LIVE_TRAVERSAL_WITNESS_SCHEMA =
  'lerms.hill-of-hills.lerm-traversal-live-witness.v0' as const;

type FailurePhase =
  | 'argument-parse'
  | 'input-read'
  | 'input-validation'
  | 'source-verification'
  | 'hill-composition'
  | 'render'
  | 'write-image'
  | 'write-report'
  | 'verify-final-output';

interface CliArgs {
  hordeReport: string | null;
  producerReceipt: string | null;
  hordeRevision: string | null;
  hillRevision: string | null;
  imageOut: string | null;
  reportOut: string | null;
}

interface WitnessRuntime {
  render: typeof renderHillHordeLiveTraversalSvg;
  sourceIdentity?: () => {
    head: string;
    dirty: string;
    hordeAncestor: (revision: string) => boolean;
  };
}

export interface HillHordeLiveTraversalWitnessReport {
  ok: true;
  schema: typeof HILL_HORDE_LIVE_TRAVERSAL_WITNESS_SCHEMA;
  phase: 'complete';
  route: typeof HILL_HORDE_LIVE_TRAVERSAL_ROUTE;
  evidenceClass: 'live_current_hill_lerm_traversal';
  inputs: {
    requested: {
      hordeReport: string;
      producerReceipt: string;
      hordeRevision: string;
      hillRevision: string;
    };
    effective: {
      hordeReport: string;
      producerReceipt: string;
      hordeRevision: string;
      hillRevision: string;
    };
    hordeReportSha256: string;
    producerReceiptSha256: string;
  };
  composition: Omit<HillHordeLiveTraversalAdmissionReceipt, 'terrains'>;
  render: {
    width: 1260;
    height: 610;
    svgSha256: string;
    primaryOutputWritten: true;
    visibleLermMarkerCount: number;
    retainedTrafficPanelCount: 2;
  };
  outputs: {
    requested: {
      imageOut: string;
      reportOut: string;
    };
    effective: {
      imageOut: string;
      reportOut: string;
    };
    imageSha256: string;
  };
  fallbackStatus: 'none';
  staleStatus: 'fresh';
  partialStatus: 'complete-root-only';
  failurePhase: null;
}

export function buildHillHordeLiveTraversalWitness(
  input: ComposeHordeTraversalIntoLiveHillInput,
): {
  report: Omit<HillHordeLiveTraversalWitnessReport, 'inputs' | 'outputs'>;
  svg: string;
} {
  const composition = composeHordeTraversalIntoLiveHill(input);
  const svg = renderHillHordeLiveTraversalSvg(composition);
  if (!svg.startsWith('<svg ') || svg.length < 20_000) {
    throw new Error('live traversal witness image is missing, blank, or partial');
  }
  const { terrains: _terrains, ...serializableComposition } = composition;
  return {
    svg,
    report: {
      ok: true,
      schema: HILL_HORDE_LIVE_TRAVERSAL_WITNESS_SCHEMA,
      phase: 'complete',
      route: HILL_HORDE_LIVE_TRAVERSAL_ROUTE,
      evidenceClass: 'live_current_hill_lerm_traversal',
      composition: serializableComposition,
      render: {
        width: 1260,
        height: 610,
        svgSha256: sha256(svg),
        primaryOutputWritten: true,
        visibleLermMarkerCount: 6,
        retainedTrafficPanelCount: 2,
      },
      fallbackStatus: 'none',
      staleStatus: 'fresh',
      partialStatus: 'complete-root-only',
      failurePhase: null,
    },
  };
}

export function runHillHordeLiveTraversalWitnessCli(
  argv = process.argv.slice(2),
  runtime: WitnessRuntime = { render: renderHillHordeLiveTraversalSvg },
): number {
  let args: CliArgs = {
    hordeReport: findArgValue(argv, '--horde-report'),
    producerReceipt: findArgValue(argv, '--producer-receipt'),
    hordeRevision: findArgValue(argv, '--horde-revision'),
    hillRevision: findArgValue(argv, '--hill-revision'),
    imageOut: findArgValue(argv, '--image-out'),
    reportOut: findArgValue(argv, '--report-out'),
  };
  let phase: FailurePhase = 'argument-parse';
  const evidence: Record<string, unknown> = {};
  const protectedInputs: string[] = [];

  try {
    args = parseArgs(argv);
    const missing = [
      !args.hordeReport && '--horde-report',
      !args.producerReceipt && '--producer-receipt',
      !args.hordeRevision && '--horde-revision',
      !args.hillRevision && '--hill-revision',
      !args.imageOut && '--image-out',
      !args.reportOut && '--report-out',
    ].filter(Boolean);
    if (missing.length > 0) throw new Error(`missing required ${missing.join(', ')}`);
    const complete = args as { [Key in keyof CliArgs]: string };
    const effective = {
      hordeReport: resolve(complete.hordeReport),
      producerReceipt: resolve(complete.producerReceipt),
      imageOut: resolve(complete.imageOut),
      reportOut: resolve(complete.reportOut),
    };
    protectedInputs.push(effective.hordeReport, effective.producerReceipt);
    validateDistinctPaths(Object.values(effective));
    evidence.requested = { ...complete };
    evidence.effective = {
      ...effective,
      hordeRevision: complete.hordeRevision,
      hillRevision: complete.hillRevision,
    };

    phase = 'input-read';
    const hordeBytes = readRequiredInput(effective.hordeReport, 'Horde report');
    const producerBytes = readRequiredInput(
      effective.producerReceipt,
      'producer receipt',
    );
    const hordeReportSha256 = sha256(hordeBytes);
    const producerReceiptSha256 = sha256(producerBytes);
    evidence.input = {
      hordeReportSha256,
      producerReceiptSha256,
      hordeReportByteLength: hordeBytes.length,
      producerReceiptByteLength: producerBytes.length,
    };

    phase = 'input-validation';
    const hordeReport = JSON.parse(hordeBytes.toString('utf8'));
    const producerReceipt = JSON.parse(
      producerBytes.toString('utf8'),
    ) as LermHordeProducerHistoryCompositionReceipt;

    phase = 'source-verification';
    const sourceIdentity = runtime.sourceIdentity?.() ?? inspectSourceIdentity();
    if (sourceIdentity.head !== complete.hillRevision) {
      throw new Error(
        `requested Hill revision ${complete.hillRevision} does not match current source ${sourceIdentity.head}`,
      );
    }
    if (sourceIdentity.dirty) {
      throw new Error(`current Hill source is dirty: ${sourceIdentity.dirty}`);
    }
    if (!sourceIdentity.hordeAncestor(complete.hordeRevision)) {
      throw new Error(
        `reviewed Horde revision ${complete.hordeRevision} is not an ancestor of current Hill source`,
      );
    }
    evidence.source = {
      requestedHordeRevision: complete.hordeRevision,
      effectiveHillRevision: sourceIdentity.head,
      dirty: sourceIdentity.dirty,
      hordeAncestor: true,
    };

    phase = 'hill-composition';
    const composition = composeHordeTraversalIntoLiveHill({
      hordeReport,
      producerReceipt,
      producerReceiptSha256,
      hordeRevision: complete.hordeRevision,
      hillRevision: complete.hillRevision,
    });

    phase = 'render';
    const svg = runtime.render(composition);
    if (!svg.startsWith('<svg ') || svg.length < 20_000) {
      throw new Error('live traversal witness image is missing, blank, or partial');
    }
    const svgSha256 = sha256(svg);

    phase = 'write-image';
    atomicWrite(effective.imageOut, svg);
    verifyWrittenImage(effective.imageOut, svgSha256);

    phase = 'write-report';
    const { terrains: _terrains, ...serializableComposition } = composition;
    const report: HillHordeLiveTraversalWitnessReport = {
      ok: true,
      schema: HILL_HORDE_LIVE_TRAVERSAL_WITNESS_SCHEMA,
      phase: 'complete',
      route: HILL_HORDE_LIVE_TRAVERSAL_ROUTE,
      evidenceClass: 'live_current_hill_lerm_traversal',
      inputs: {
        requested: {
          hordeReport: complete.hordeReport,
          producerReceipt: complete.producerReceipt,
          hordeRevision: complete.hordeRevision,
          hillRevision: complete.hillRevision,
        },
        effective: {
          hordeReport: effective.hordeReport,
          producerReceipt: effective.producerReceipt,
          hordeRevision: complete.hordeRevision,
          hillRevision: complete.hillRevision,
        },
        hordeReportSha256,
        producerReceiptSha256,
      },
      composition: serializableComposition,
      render: {
        width: 1260,
        height: 610,
        svgSha256,
        primaryOutputWritten: true,
        visibleLermMarkerCount: 6,
        retainedTrafficPanelCount: 2,
      },
      outputs: {
        requested: {
          imageOut: complete.imageOut,
          reportOut: complete.reportOut,
        },
        effective: {
          imageOut: effective.imageOut,
          reportOut: effective.reportOut,
        },
        imageSha256: svgSha256,
      },
      fallbackStatus: 'none',
      staleStatus: 'fresh',
      partialStatus: 'complete-root-only',
      failurePhase: null,
    };
    atomicWrite(effective.reportOut, `${JSON.stringify(report, null, 2)}\n`);

    phase = 'verify-final-output';
    verifyWrittenImage(effective.imageOut, svgSha256);
    const finalReport = JSON.parse(readFileSync(effective.reportOut, 'utf8'));
    if (
      finalReport.ok !== true ||
      finalReport.outputs?.imageSha256 !== svgSha256
    ) {
      throw new Error('live traversal witness final report verification failed');
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failurePath = safeFailureReportPath(args, protectedInputs);
    if (failurePath) {
      try {
        atomicWrite(
          failurePath,
          `${JSON.stringify({
            ok: false,
            schema: HILL_HORDE_LIVE_TRAVERSAL_WITNESS_SCHEMA,
            phase: 'failed',
            route: HILL_HORDE_LIVE_TRAVERSAL_ROUTE,
            failurePhase: phase,
            error: message,
            primaryOutputWritten: phase === 'write-report' || phase === 'verify-final-output',
            lastTrustworthyEvidence: evidence,
          }, null, 2)}\n`,
        );
      } catch {
        // stderr remains authoritative when the requested report path is unusable.
      }
    }
    process.stderr.write(`${message}\n`);
    return 1;
  }
}

export function renderHillHordeLiveTraversalSvg(
  composition: HillHordeLiveTraversalAdmissionReceipt,
): string {
  const panelWidth = 420;
  const width = 1260;
  const height = 610;
  const plot = { x: 24, y: 112, width: 372, height: 430 };
  const panels = [
    {
      id: 'no-history-control',
      label: 'no-history control',
      terrain: composition.terrains.control,
      roots: [] as readonly (readonly [number, number, number])[],
      presence: 'absent',
    },
    {
      id: 'live-lerm-admitted',
      label: 'live Lerm traversal admitted',
      terrain: composition.terrains.admitted,
      roots: composition.traversal.liveRootWorld,
      presence: 'present',
    },
    {
      id: 'after-departure',
      label: 'after departure',
      terrain: composition.terrains.afterDeparture,
      roots: [] as readonly (readonly [number, number, number])[],
      presence: 'departed',
    },
  ] as const;
  const panelSvg = panels.map((panel, panelIndex) => {
    const x0 = panelIndex * panelWidth;
    const terrain = panel.terrain;
    const heights = terrain.samples.map(({ height: sampleHeight }) => sampleHeight);
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const trafficField =
      terrain.phaseState.producerTrafficField ??
      terrain.phaseState.persistentTopologyField?.producerTrafficField;
    const trafficMax = Math.max(
      Number.EPSILON,
      terrain.witness.producerTrafficFieldRange.max,
    );
    const cellWidth = plot.width / terrain.params.gridResolutionX;
    const cellHeight = plot.height / terrain.params.gridResolutionZ;
    const cells = terrain.samples.map((sample, index) => {
      const xi = index % terrain.params.gridResolutionX;
      const zi = Math.floor(index / terrain.params.gridResolutionX);
      const heightT =
        (sample.height - minHeight) / Math.max(0.001, maxHeight - minHeight);
      const traffic = trafficField
        ? sampleHillOfHillsProducerTrafficField(
          trafficField,
          sample.world[0],
          sample.world[2],
        ) / trafficMax
        : 0;
      const base = terrainColor(heightT);
      const fill = mixColor(base, [78, 108, 190], Math.min(0.82, traffic * 0.82));
      return `<rect x="${number(x0 + plot.x + xi * cellWidth)}" y="${number(plot.y + zi * cellHeight)}" width="${number(cellWidth + 0.25)}" height="${number(cellHeight + 0.25)}" fill="rgb(${fill.join(' ')})"/>`;
    }).join('');
    const rootPath = panel.roots.length > 0
      ? `<polyline points="${panel.roots.map((root) => pointForRoot(root, x0, plot, terrain)).join(' ')}" fill="none" stroke="#f2d35f" stroke-width="3" stroke-linejoin="round" data-live-lerm-rail="true"/>`
      : '';
    const markerIndexes = [0, 3, 6, 9, 12, 14];
    const markers = panel.roots.length > 0
      ? markerIndexes.map((index) => {
        const root = panel.roots[index];
        const [cx, cy] = xyForRoot(root, x0, plot, terrain);
        return `<g data-visible-lerm-root="${index}"><ellipse cx="${number(cx)}" cy="${number(cy)}" rx="9" ry="6.5" fill="#df2a36"/><circle cx="${number(cx + 8)}" cy="${number(cy - 1)}" r="3.5" fill="#79111f"/></g>`;
      }).join('')
      : '';
    return `<g data-panel="${panel.id}" data-producer-presence="${panel.presence}">
      <rect x="${x0}" y="0" width="${panelWidth}" height="${height}" fill="#09100d"/>
      <text x="${x0 + 24}" y="38" fill="#f4ecd0" font-size="20" font-family="monospace" font-weight="700">${panel.label}</text>
      <text x="${x0 + 24}" y="66" fill="#9fd0bd" font-size="12" font-family="monospace">Hill ${escapeXml(terrain.source.frameId)} · live_simulation</text>
      <text x="${x0 + 24}" y="86" fill="#9fd0bd" font-size="12" font-family="monospace">roots ${panel.roots.length} · episodes ${terrain.witness.producerTrafficAdmittedEpisodeCount} · shock ${terrain.witness.supportFrame.shockClassCounts.shock_reset ?? 0}</text>
      ${cells}${rootPath}${markers}
      <rect x="${x0 + plot.x}" y="${plot.y}" width="${plot.width}" height="${plot.height}" fill="none" stroke="#355c49" stroke-width="1.5"/>
      <text x="${x0 + 24}" y="568" fill="#f2d35f" font-size="12" font-family="monospace">${panel.id === 'live-lerm-admitted' ? 'red = reviewed Lerm roots · yellow = producer rail' : 'blue = retained Hill traversal pressure'}</text>
      <text x="${x0 + 24}" y="590" fill="#9fd0bd" font-size="11" font-family="monospace">traffic ${terrain.witness.producerTrafficFieldChecksum} · topo ${terrain.witness.topologyPossibilityChecksum}</text>
    </g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-schema="${HILL_HORDE_LIVE_TRAVERSAL_WITNESS_SCHEMA}" data-live-current-hill="true">${panelSvg}</svg>`;
}

function pointForRoot(
  root: readonly [number, number, number],
  x0: number,
  plot: { x: number; y: number; width: number; height: number },
  terrain: HillOfHillsTerrain,
): string {
  const [x, y] = xyForRoot(root, x0, plot, terrain);
  return `${number(x)},${number(y)}`;
}

function xyForRoot(
  root: readonly [number, number, number],
  x0: number,
  plot: { x: number; y: number; width: number; height: number },
  terrain: HillOfHillsTerrain,
): readonly [number, number] {
  const xT = (root[0] + terrain.params.width * 0.5) / terrain.params.width;
  const zT = (root[2] + terrain.params.length * 0.5) / terrain.params.length;
  return [x0 + plot.x + xT * plot.width, plot.y + zT * plot.height];
}

function terrainColor(value: number): readonly [number, number, number] {
  const low: readonly [number, number, number] = [35, 78, 52];
  const high: readonly [number, number, number] = [155, 162, 91];
  return mixColor(low, high, value);
}

function mixColor(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
  amount: number,
): [number, number, number] {
  const t = Math.max(0, Math.min(1, amount));
  return left.map((value, index) =>
    Math.round(value + (right[index] - value) * t),
  ) as [number, number, number];
}

function parseArgs(argv: readonly string[]): CliArgs {
  const known = new Set([
    '--horde-report',
    '--producer-receipt',
    '--horde-revision',
    '--hill-revision',
    '--image-out',
    '--report-out',
  ]);
  for (let index = 0; index < argv.length; index += 2) {
    if (!known.has(argv[index]) || !argv[index + 1] || argv[index + 1].startsWith('--')) {
      throw new Error(`invalid argument sequence near ${argv[index] ?? 'end'}`);
    }
  }
  return {
    hordeReport: findArgValue(argv, '--horde-report'),
    producerReceipt: findArgValue(argv, '--producer-receipt'),
    hordeRevision: findArgValue(argv, '--horde-revision'),
    hillRevision: findArgValue(argv, '--hill-revision'),
    imageOut: findArgValue(argv, '--image-out'),
    reportOut: findArgValue(argv, '--report-out'),
  };
}

function findArgValue(argv: readonly string[], name: string): string | null {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] ?? null : null;
}

function readRequiredInput(path: string, label: string): Buffer {
  const bytes = readFileSync(path);
  if (bytes.length === 0) throw new Error(`${label} is blank`);
  return bytes;
}

function inspectSourceIdentity(): {
  head: string;
  dirty: string;
  hordeAncestor: (revision: string) => boolean;
} {
  const git = (args: readonly string[]) =>
    execFileSync('git', args, { encoding: 'utf8' }).trim();
  return {
    head: git(['rev-parse', 'HEAD']),
    dirty: git(['status', '--porcelain=v1']),
    hordeAncestor: (revision: string) => {
      try {
        execFileSync(
          'git',
          ['merge-base', '--is-ancestor', revision, 'HEAD'],
          { stdio: 'ignore' },
        );
        return true;
      } catch {
        return false;
      }
    },
  };
}

function validateDistinctPaths(paths: readonly string[]): void {
  for (const path of paths) {
    if (pathIsSymbolicLink(path)) {
      throw new Error(`input and output leaves must not be symbolic links: ${path}`);
    }
  }
  for (let left = 0; left < paths.length; left += 1) {
    for (let right = left + 1; right < paths.length; right += 1) {
      if (pathsAlias(paths[left], paths[right])) {
        throw new Error('Horde report, producer receipt, image, and report paths must be distinct');
      }
    }
  }
}

function safeFailureReportPath(
  args: CliArgs,
  protectedInputs: readonly string[],
): string | null {
  if (!args.reportOut) return null;
  const reportPath = resolve(args.reportOut);
  if (pathIsSymbolicLink(reportPath)) return null;
  const protectedPaths = [
    ...protectedInputs,
    ...(args.hordeReport ? [resolve(args.hordeReport)] : []),
    ...(args.producerReceipt ? [resolve(args.producerReceipt)] : []),
    ...(args.imageOut ? [resolve(args.imageOut)] : []),
  ];
  return protectedPaths.some((path) => pathsAlias(path, reportPath))
    ? null
    : reportPath;
}

function pathIsSymbolicLink(path: string): boolean {
  return existsSync(path) && lstatSync(path).isSymbolicLink();
}

function pathsAlias(left: string, right: string): boolean {
  if (left === right) return true;
  if (canonicalTargetPath(left) === canonicalTargetPath(right)) return true;
  if (!existsSync(left) || !existsSync(right)) return false;
  const leftStat = statSync(left);
  const rightStat = statSync(right);
  return leftStat.dev === rightStat.dev && leftStat.ino === rightStat.ino;
}

function canonicalTargetPath(path: string): string {
  const absolute = resolve(path);
  if (existsSync(absolute)) return realpathSync(absolute);
  const segments: string[] = [];
  let cursor = absolute;
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) break;
    segments.unshift(cursor.slice(parent.length + (parent.endsWith('/') ? 0 : 1)));
    cursor = parent;
  }
  const base = existsSync(cursor) ? realpathSync(cursor) : cursor;
  return resolve(base, ...segments);
}

function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(temporary, content);
  renameSync(temporary, path);
}

function verifyWrittenImage(path: string, expectedSha256: string): void {
  const bytes = readFileSync(path);
  if (
    bytes.length < 20_000 ||
    !bytes.toString('utf8', 0, 5).startsWith('<svg ') ||
    sha256(bytes) !== expectedSha256
  ) {
    throw new Error('live traversal witness primary image verification failed');
  }
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function number(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  process.exitCode = runHillHordeLiveTraversalWitnessCli();
}
