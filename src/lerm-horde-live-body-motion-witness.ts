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

import type { LermHordeProducerHistoryCompositionReceipt } from './lerm-horde-producer-history-composition.js';
import {
  composeHordeTraversalIntoLiveHill,
  type ComposeHordeTraversalIntoLiveHillInput,
  type HillHordeLiveTraversalAdmissionReceipt,
} from './hill-horde-live-traversal-admission.js';
import {
  LERM_HORDE_LIVE_BODY_MOTION_ROUTE,
  composeLermHordeLiveBodyMotion,
  type LermHordeLiveBodyMotionComposition,
  type LermHordeLiveBodyMotionSample,
} from './lerm-horde-live-body-motion.js';
import {
  sampleHillOfHillsProducerTrafficField,
} from './terrain/hill-of-hills-producer-contact-history.js';
import type { HillOfHillsTerrain } from './terrain/hill-of-hills.js';

export const LERM_HORDE_LIVE_BODY_MOTION_WITNESS_SCHEMA =
  'lerms.lerm-horde.live-hill-body-motion-witness.v0' as const;

const WIDTH = 1440;
const HEIGHT = 720;
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 360;
const RENDERED_SAMPLE_SEQUENCES = [0, 3, 6, 9, 12, 14] as const;

type FailurePhase =
  | 'argument-parse'
  | 'input-read'
  | 'input-validation'
  | 'source-verification'
  | 'hill-composition'
  | 'body-motion'
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
  render: typeof renderLermHordeLiveBodyMotionSvg;
  sourceIdentity?: () => {
    head: string;
    dirty: string;
    hordeAncestor: (revision: string) => boolean;
    hillAncestor: (revision: string) => boolean;
  };
}

export interface LermHordeLiveBodyMotionWitnessReport {
  ok: true;
  schema: typeof LERM_HORDE_LIVE_BODY_MOTION_WITNESS_SCHEMA;
  phase: 'complete';
  route: typeof LERM_HORDE_LIVE_BODY_MOTION_ROUTE;
  evidenceClass: 'authored_procedural_body_motion_on_live_hill';
  visualStatus: 'rendered_uninspected';
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
      presenterRevision: string;
    };
    hordeReportSha256: string;
    producerReceiptSha256: string;
  };
  admission: {
    schema: string;
    route: string;
    hillRevision: string;
    hordeRevision: string;
    stanceContactCount: 0;
    trafficChecksumAtAdmission: string;
    trafficChecksumAfterDeparture: string;
    postDepartureTopologyPossibilityChecksum: string;
    noHistoryTopologyPossibilityChecksum: string;
  };
  motion: LermHordeLiveBodyMotionComposition;
  render: {
    width: typeof WIDTH;
    height: typeof HEIGHT;
    svgSha256: string;
    primaryOutputWritten: true;
    visibleBodyPoseCount: 6;
    distinctRenderedGeometryCount: number;
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
  claimBoundary: LermHordeLiveBodyMotionComposition['claimBoundary'];
  fallbackStatus: 'none';
  staleStatus: 'fresh';
  partialStatus: 'complete-root-only';
  failurePhase: null;
}

export function buildLermHordeLiveBodyMotionWitness(
  input: ComposeHordeTraversalIntoLiveHillInput,
  runtime: Pick<WitnessRuntime, 'render'> = {
    render: renderLermHordeLiveBodyMotionSvg,
  },
): {
  report: Omit<LermHordeLiveBodyMotionWitnessReport, 'inputs' | 'outputs'>;
  svg: string;
} {
  const admission = composeHordeTraversalIntoLiveHill(input);
  const motion = composeLermHordeLiveBodyMotion(admission);
  const svg = runtime.render(admission, motion);
  verifySvg(svg);
  const distinctRenderedGeometryCount = new Set(
    RENDERED_SAMPLE_SEQUENCES.map(
      (sequence) => motion.samples[sequence].poseFingerprint,
    ),
  ).size;
  if (distinctRenderedGeometryCount < 4) {
    throw new Error('render selection does not show enough distinct body poses');
  }

  return {
    svg,
    report: {
      ok: true,
      schema: LERM_HORDE_LIVE_BODY_MOTION_WITNESS_SCHEMA,
      phase: 'complete',
      route: LERM_HORDE_LIVE_BODY_MOTION_ROUTE,
      evidenceClass: 'authored_procedural_body_motion_on_live_hill',
      visualStatus: 'rendered_uninspected',
      admission: {
        schema: admission.schema,
        route: admission.route,
        hillRevision: admission.hill.targetRevision,
        hordeRevision: admission.source.horde.revision,
        stanceContactCount: 0,
        trafficChecksumAtAdmission:
          admission.persistence.trafficChecksumAtAdmission,
        trafficChecksumAfterDeparture:
          admission.persistence.trafficChecksumAfterDeparture,
        postDepartureTopologyPossibilityChecksum:
          admission.admission.postDepartureTopologyPossibilityChecksum,
        noHistoryTopologyPossibilityChecksum:
          admission.control.noHistoryTopologyPossibilityChecksum,
      },
      motion,
      render: {
        width: WIDTH,
        height: HEIGHT,
        svgSha256: sha256(svg),
        primaryOutputWritten: true,
        visibleBodyPoseCount: 6,
        distinctRenderedGeometryCount,
        retainedTrafficPanelCount: 2,
      },
      claimBoundary: motion.claimBoundary,
      fallbackStatus: 'none',
      staleStatus: 'fresh',
      partialStatus: 'complete-root-only',
      failurePhase: null,
    },
  };
}

export function runLermHordeLiveBodyMotionWitnessCli(
  argv = process.argv.slice(2),
  runtime: WitnessRuntime = {
    render: renderLermHordeLiveBodyMotionSvg,
  },
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
    if (!sourceIdentity.hillAncestor(complete.hillRevision)) {
      throw new Error(
        `reviewed Hill revision ${complete.hillRevision} is not an ancestor of current source ${sourceIdentity.head}`,
      );
    }
    if (sourceIdentity.dirty) {
      throw new Error(`current body-motion source is dirty: ${sourceIdentity.dirty}`);
    }
    if (!sourceIdentity.hordeAncestor(complete.hordeRevision)) {
      throw new Error(
        `reviewed Horde revision ${complete.hordeRevision} is not an ancestor of current source`,
      );
    }
    evidence.source = {
      requestedHordeRevision: complete.hordeRevision,
      requestedHillRevision: complete.hillRevision,
      effectivePresenterRevision: sourceIdentity.head,
      dirty: sourceIdentity.dirty,
      hordeAncestor: true,
      hillAncestor: true,
    };

    phase = 'hill-composition';
    const input = {
      hordeReport,
      producerReceipt,
      producerReceiptSha256,
      hordeRevision: complete.hordeRevision,
      hillRevision: complete.hillRevision,
    };
    const admission = composeHordeTraversalIntoLiveHill(input);

    phase = 'body-motion';
    const motion = composeLermHordeLiveBodyMotion(admission);

    phase = 'render';
    const svg = runtime.render(admission, motion);
    verifySvg(svg);
    const distinctRenderedGeometryCount = new Set(
      RENDERED_SAMPLE_SEQUENCES.map(
        (sequence) => motion.samples[sequence].poseFingerprint,
      ),
    ).size;
    if (distinctRenderedGeometryCount < 4) {
      throw new Error('render selection does not show enough distinct body poses');
    }
    const svgSha256 = sha256(svg);

    phase = 'write-image';
    atomicWrite(effective.imageOut, svg);
    verifyWrittenSvg(effective.imageOut, svgSha256);

    phase = 'write-report';
    const report: LermHordeLiveBodyMotionWitnessReport = {
      ok: true,
      schema: LERM_HORDE_LIVE_BODY_MOTION_WITNESS_SCHEMA,
      phase: 'complete',
      route: LERM_HORDE_LIVE_BODY_MOTION_ROUTE,
      evidenceClass: 'authored_procedural_body_motion_on_live_hill',
      visualStatus: 'rendered_uninspected',
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
          presenterRevision: sourceIdentity.head,
        },
        hordeReportSha256,
        producerReceiptSha256,
      },
      admission: {
        schema: admission.schema,
        route: admission.route,
        hillRevision: admission.hill.targetRevision,
        hordeRevision: admission.source.horde.revision,
        stanceContactCount: 0,
        trafficChecksumAtAdmission:
          admission.persistence.trafficChecksumAtAdmission,
        trafficChecksumAfterDeparture:
          admission.persistence.trafficChecksumAfterDeparture,
        postDepartureTopologyPossibilityChecksum:
          admission.admission.postDepartureTopologyPossibilityChecksum,
        noHistoryTopologyPossibilityChecksum:
          admission.control.noHistoryTopologyPossibilityChecksum,
      },
      motion,
      render: {
        width: WIDTH,
        height: HEIGHT,
        svgSha256,
        primaryOutputWritten: true,
        visibleBodyPoseCount: 6,
        distinctRenderedGeometryCount,
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
      claimBoundary: motion.claimBoundary,
      fallbackStatus: 'none',
      staleStatus: 'fresh',
      partialStatus: 'complete-root-only',
      failurePhase: null,
    };
    atomicWrite(effective.reportOut, `${JSON.stringify(report, null, 2)}\n`);

    phase = 'verify-final-output';
    verifyWrittenSvg(effective.imageOut, svgSha256);
    const finalReport = JSON.parse(readFileSync(effective.reportOut, 'utf8'));
    if (
      finalReport.ok !== true ||
      finalReport.outputs?.imageSha256 !== svgSha256 ||
      finalReport.render?.visibleBodyPoseCount !== 6
    ) {
      throw new Error('body-motion witness final report verification failed');
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
            schema: LERM_HORDE_LIVE_BODY_MOTION_WITNESS_SCHEMA,
            phase: 'failed',
            route: LERM_HORDE_LIVE_BODY_MOTION_ROUTE,
            failurePhase: phase,
            error: message,
            primaryOutputWritten:
              phase === 'write-report' || phase === 'verify-final-output',
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

export function renderLermHordeLiveBodyMotionSvg(
  admission: HillHordeLiveTraversalAdmissionReceipt,
  motion: LermHordeLiveBodyMotionComposition,
): string {
  const motionPanels = RENDERED_SAMPLE_SEQUENCES.map(
    (sequence, panelIndex) =>
      renderMotionPanel(admission, motion.samples[sequence], panelIndex),
  ).join('');
  const pressurePanels = [
    renderPressurePanel(
      admission.terrains.admitted,
      6,
      'live traversal pressure',
      'Lerm present · topology pressure admitted',
    ),
    renderPressurePanel(
      admission.terrains.afterDeparture,
      7,
      'after departure',
      'Lerm absent · Hill pressure retained',
    ),
  ].join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" data-schema="${LERM_HORDE_LIVE_BODY_MOTION_WITNESS_SCHEMA}" data-live-current-hill="true" data-authored-procedural-articulation="true">${motionPanels}${pressurePanels}</svg>`;
}

function renderMotionPanel(
  admission: HillHordeLiveTraversalAdmissionReceipt,
  sample: LermHordeLiveBodyMotionSample,
  panelIndex: number,
): string {
  const x0 = (panelIndex % 4) * PANEL_WIDTH;
  const y0 = Math.floor(panelIndex / 4) * PANEL_HEIGHT;
  const plot = { x: x0 + 50, y: y0 + 92, width: 260, height: 205 };
  const roots = admission.traversal.liveRootWorld;
  const minZ = Math.min(...roots.map((root) => root[2]));
  const maxZ = Math.max(...roots.map((root) => root[2]));
  const minY = Math.min(...roots.map((root) => root[1])) - 0.1;
  const maxY = Math.max(...roots.map((root) => root[1])) + 0.2;
  const project = (world: readonly number[]) => [
    plot.x + ((world[2] - minZ) / Math.max(0.001, maxZ - minZ)) * plot.width,
    plot.y + plot.height -
      ((world[1] - minY) / Math.max(0.001, maxY - minY)) * plot.height,
  ] as const;
  const rootPath = roots.map((root) => project(root).map(number).join(',')).join(' ');
  const [rootX, rootY] = project(sample.rootWorld);
  const bodyX = rootX;
  const bodyY = rootY - 34 - sample.body.bobWorld * 210;
  const bodyRx = 29 * sample.body.scaleX;
  const bodyRy = 23 * sample.body.scaleY;
  const direction = sample.heading[2] >= 0 ? 1 : -1;
  const leftFootX = bodyX - 13 + sample.legs.leftReach * 120;
  const rightFootX = bodyX + 13 + sample.legs.rightReach * 120;
  const leftFootY = rootY - sample.legs.leftLift * 130;
  const rightFootY = rootY - sample.legs.rightLift * 130;
  return `<g data-panel="motion-${sample.sequence}" data-visible-lerm-body-pose="${sample.poseFingerprint}">
    <rect x="${x0}" y="${y0}" width="${PANEL_WIDTH}" height="${PANEL_HEIGHT}" fill="#09100d"/>
    <rect x="${x0 + 1}" y="${y0 + 1}" width="${PANEL_WIDTH - 2}" height="${PANEL_HEIGHT - 2}" fill="none" stroke="#294d3d"/>
    <text x="${x0 + 24}" y="${y0 + 32}" fill="#f4ecd0" font-size="18" font-family="monospace" font-weight="700">t ${sample.timestampMs} ms · root ${sample.sequence}</text>
    <text x="${x0 + 24}" y="${y0 + 57}" fill="#9fd0bd" font-size="12" font-family="monospace">phase ${number(sample.gaitPhaseRadians)} · progress ${number(sample.routeProgress)}</text>
    <text x="${x0 + 24}" y="${y0 + 77}" fill="#9fd0bd" font-size="11" font-family="monospace">live Hill ${escapeXml(admission.hill.effective.admittedFrameId)}</text>
    <polyline points="${rootPath}" fill="none" stroke="#4e976c" stroke-width="4" data-live-hill-root-rail="true"/>
    <line x1="${number(bodyX - 12)}" y1="${number(bodyY + 14)}" x2="${number(leftFootX)}" y2="${number(leftFootY)}" stroke="#a91d2b" stroke-width="7" stroke-linecap="round" data-left-leg-reach="${number(sample.legs.leftReach)}"/>
    <line x1="${number(bodyX + 12)}" y1="${number(bodyY + 14)}" x2="${number(rightFootX)}" y2="${number(rightFootY)}" stroke="#a91d2b" stroke-width="7" stroke-linecap="round" data-right-leg-reach="${number(sample.legs.rightReach)}"/>
    <ellipse cx="${number(bodyX)}" cy="${number(bodyY)}" rx="${number(bodyRx)}" ry="${number(bodyRy)}" fill="#df2a36" transform="rotate(${number(sample.body.leanRadians * 57.2958)} ${number(bodyX)} ${number(bodyY)})"/>
    <ellipse cx="${number(bodyX + direction * (bodyRx - 3))}" cy="${number(bodyY + 2)}" rx="12" ry="8" fill="#79111f"/>
    <circle cx="${number(bodyX + direction * (bodyRx + 1))}" cy="${number(bodyY - 3)}" r="3.5" fill="#f4ecd0"/>
    <circle cx="${number(bodyX + direction * (bodyRx + 2))}" cy="${number(bodyY - 3)}" r="1.5" fill="#09100d"/>
    <circle cx="${number(rootX)}" cy="${number(rootY)}" r="3" fill="#f2d35f" data-admitted-root="true"/>
    <text x="${x0 + 24}" y="${y0 + 331}" fill="#f2d35f" font-size="11" font-family="monospace">authored gait · contact 0 · root preserved</text>
  </g>`;
}

function renderPressurePanel(
  terrain: HillOfHillsTerrain,
  panelIndex: number,
  title: string,
  subtitle: string,
): string {
  const x0 = (panelIndex % 4) * PANEL_WIDTH;
  const y0 = Math.floor(panelIndex / 4) * PANEL_HEIGHT;
  const plot = { x: x0 + 24, y: y0 + 86, width: 312, height: 220 };
  const trafficField =
    terrain.phaseState.producerTrafficField ??
    terrain.phaseState.persistentTopologyField?.producerTrafficField;
  const trafficMax = Math.max(
    Number.EPSILON,
    terrain.witness.producerTrafficFieldRange.max,
  );
  const heights = terrain.samples.map((sample) => sample.height);
  const minHeight = Math.min(...heights);
  const maxHeight = Math.max(...heights);
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
    const base = mixColor([35, 78, 52], [155, 162, 91], heightT);
    const fill = mixColor(base, [78, 108, 190], Math.min(0.82, traffic * 0.82));
    return `<rect x="${number(plot.x + xi * cellWidth)}" y="${number(plot.y + zi * cellHeight)}" width="${number(cellWidth + 0.25)}" height="${number(cellHeight + 0.25)}" fill="rgb(${fill.join(' ')})"/>`;
  }).join('');
  return `<g data-panel="pressure-${panelIndex}" data-retained-hill-pressure="true">
    <rect x="${x0}" y="${y0}" width="${PANEL_WIDTH}" height="${PANEL_HEIGHT}" fill="#09100d"/>
    <rect x="${x0 + 1}" y="${y0 + 1}" width="${PANEL_WIDTH - 2}" height="${PANEL_HEIGHT - 2}" fill="none" stroke="#294d3d"/>
    <text x="${x0 + 24}" y="${y0 + 32}" fill="#f4ecd0" font-size="18" font-family="monospace" font-weight="700">${escapeXml(title)}</text>
    <text x="${x0 + 24}" y="${y0 + 57}" fill="#9fd0bd" font-size="11" font-family="monospace">${escapeXml(subtitle)}</text>
    ${cells}
    <rect x="${plot.x}" y="${plot.y}" width="${plot.width}" height="${plot.height}" fill="none" stroke="#355c49"/>
    <text x="${x0 + 24}" y="${y0 + 328}" fill="#f2d35f" font-size="10.5" font-family="monospace">traffic ${terrain.witness.producerTrafficFieldChecksum} · topo ${terrain.witness.topologyPossibilityChecksum}</text>
  </g>`;
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
  hillAncestor: (revision: string) => boolean;
} {
  const git = (args: readonly string[]) =>
    execFileSync('git', args, { encoding: 'utf8' }).trim();
  const isAncestor = (revision: string) => {
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
  };
  return {
    head: git(['rev-parse', 'HEAD']),
    dirty: git(['status', '--porcelain=v1']),
    hordeAncestor: isAncestor,
    hillAncestor: isAncestor,
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
        throw new Error(
          'Horde report, producer receipt, image, and report paths must be distinct',
        );
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

function verifySvg(svg: string): void {
  if (
    !svg.startsWith('<svg ') ||
    svg.length < 25_000 ||
    (svg.match(/data-visible-lerm-body-pose=/g) ?? []).length !== 6 ||
    (svg.match(/data-retained-hill-pressure=/g) ?? []).length !== 2
  ) {
    throw new Error('body-motion witness image is missing, blank, or partial');
  }
}

function verifyWrittenSvg(path: string, expectedSha256: string): void {
  const bytes = readFileSync(path);
  verifySvg(bytes.toString('utf8'));
  if (sha256(bytes) !== expectedSha256) {
    throw new Error('body-motion witness primary image verification failed');
  }
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function number(value: number): string {
  return Number(value.toFixed(3)).toString();
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
  process.exitCode = runLermHordeLiveBodyMotionWitnessCli();
}
