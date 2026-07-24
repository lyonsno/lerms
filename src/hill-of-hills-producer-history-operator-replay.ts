import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LERM_HORDE_HILL_REVISION,
  LERM_HORDE_PRODUCER_HISTORY_RECEIPT_SCHEMA,
  LERM_HORDE_PRODUCER_REVISION,
  type LermHordeProducerHistoryCompositionReceipt
} from './lerm-horde-producer-history-composition.js';
import {
  sampleHillOfHillsProducerTrafficField,
  validateHillOfHillsProducerContactHistory
} from './terrain/hill-of-hills-producer-contact-history.js';
import {
  createHillOfHillsLayerTileCache,
  createHillOfHillsTerrainWithCache,
  defaultHillOfHillsParams,
  type HillOfHillsSourceOptions,
  type HillOfHillsTerrain,
  type HillOfHillsTerrainParams
} from './terrain/hill-of-hills.js';

export const HILL_PRODUCER_HISTORY_OPERATOR_REPLAY_SCHEMA =
  'lerms.hill-of-hills.producer-history-operator-replay.v0' as const;
export const HILL_PRODUCER_HISTORY_OPERATOR_REPLAY_ROUTE =
  'lerms/hill-of-hills/producer-history-operator-replay' as const;

type ReplayFailurePhase =
  | 'argument-parse'
  | 'input-read'
  | 'input-validation'
  | 'hill-replay'
  | 'render'
  | 'write-image'
  | 'write-report';

export interface HillProducerHistoryReplayPanel {
  id: 'no-history-control' | 'history-admitted' | 'after-departure';
  label: string;
  frameId: string;
  sampleChecksum: string;
  topologyPossibilityChecksum: string;
  trafficChecksum: string;
  trafficRange: { min: number; max: number };
  admittedEpisodeCount: number;
  supportedRootSampleCount: number;
  stanceContactCount: number;
  supportShockResetCount: number;
}

export interface HillProducerHistoryOperatorReplayReport {
  ok: true;
  schema: typeof HILL_PRODUCER_HISTORY_OPERATOR_REPLAY_SCHEMA;
  phase: 'complete';
  route: typeof HILL_PRODUCER_HISTORY_OPERATOR_REPLAY_ROUTE;
  evidenceClass: 'live_producer_composition';
  replayProfile: 'lerm-horde-live-producer-history-v0';
  input: {
    path?: string;
    sha256?: string;
    receiptSchema: typeof LERM_HORDE_PRODUCER_HISTORY_RECEIPT_SCHEMA;
    receiptRevision: string;
    hillBaseRevision: typeof LERM_HORDE_HILL_REVISION;
    producerRevision: string;
    episodeId: string;
  };
  sourceIdentity: {
    requestedRoute: string;
    effectiveRoute: string;
    authority: string;
    backend: string;
    configId: string;
    sourceLineageKey: string;
    fallbackStatus: 'none';
    staleStatus: 'fresh';
    partialStatus: 'complete-root-only';
  };
  panels: readonly HillProducerHistoryReplayPanel[];
  assertions: {
    receiptClaimsComplete: true;
    exactPriorHillTarget: true;
    receiptMetricsReproduced: true;
    trafficPersistedAfterDeparture: true;
    topologyPossibilityChanged: true;
    rootOnlyContactAbsencePreserved: true;
    zeroShockResets: true;
  };
  render: {
    width: number;
    height: number;
    cellCount: number;
    rootMarkerCount: number;
    svgSha256: string;
    primaryOutputWritten: boolean;
  };
  outputs?: {
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
  failurePhase: null;
}

export interface HillProducerHistoryOperatorReplay {
  schema: typeof HILL_PRODUCER_HISTORY_OPERATOR_REPLAY_SCHEMA;
  receipt: LermHordeProducerHistoryCompositionReceipt;
  report: HillProducerHistoryOperatorReplayReport;
  svg: string;
}

interface ReplayBuildOptions {
  inputPath?: string;
  inputSha256?: string;
}

interface ReplayTerrains {
  control: HillOfHillsTerrain;
  admitted: HillOfHillsTerrain;
  afterDeparture: HillOfHillsTerrain;
}

interface CliArgs {
  input: string | null;
  imageOut: string | null;
  reportOut: string | null;
}

const REPLAY_TERRAIN_PARAMS: HillOfHillsTerrainParams = {
  ...defaultHillOfHillsParams,
  seed: 414,
  width: 12,
  length: 15,
  gridResolutionX: 48,
  gridResolutionZ: 60,
  topologyDynamicsMode: 'persistent_pressure',
  topologyPossibilityMode: 'phase_recomposed',
  topologyPhaseDurationMs: 600,
  topologyPhaseIntensity: 0.92,
  topologyPhaseDriftIntensity: 1,
  topologyPhaseLimit: 4,
  topologyPhaseTimeMs: 0
};

export function createHillProducerHistoryOperatorReplay(
  input: unknown,
  options: ReplayBuildOptions = {}
): HillProducerHistoryOperatorReplay {
  const receipt = validateReceipt(input);
  const terrains = replayTerrains(receipt);
  const panels = createPanels(terrains);
  verifyReplayMatchesReceipt(receipt, terrains, panels);
  const svg = renderReplaySvg(receipt, terrains, panels);
  const svgSha256 = sha256(svg);
  const report: HillProducerHistoryOperatorReplayReport = {
    ok: true,
    schema: HILL_PRODUCER_HISTORY_OPERATOR_REPLAY_SCHEMA,
    phase: 'complete',
    route: HILL_PRODUCER_HISTORY_OPERATOR_REPLAY_ROUTE,
    evidenceClass: receipt.evidenceClass,
    replayProfile: 'lerm-horde-live-producer-history-v0',
    input: {
      ...(options.inputPath ? { path: options.inputPath } : {}),
      ...(options.inputSha256 ? { sha256: options.inputSha256 } : {}),
      receiptSchema: receipt.schema,
      receiptRevision: receipt.lerms.revision,
      hillBaseRevision: receipt.lerms.hillBaseRevision,
      producerRevision: receipt.producer.revision,
      episodeId: receipt.history.episodeId
    },
    sourceIdentity: {
      requestedRoute: receipt.hill.requested.route,
      effectiveRoute: receipt.hill.effective.route,
      authority: receipt.hill.effective.authority,
      backend: receipt.hill.effective.backend,
      configId: receipt.hill.effective.configId,
      sourceLineageKey: receipt.hill.effective.sourceLineageKey,
      fallbackStatus: receipt.fallbackStatus,
      staleStatus: receipt.staleStatus,
      partialStatus: receipt.partialStatus
    },
    panels,
    assertions: {
      receiptClaimsComplete: true,
      exactPriorHillTarget: true,
      receiptMetricsReproduced: true,
      trafficPersistedAfterDeparture: true,
      topologyPossibilityChanged: true,
      rootOnlyContactAbsencePreserved: true,
      zeroShockResets: true
    },
    render: {
      width: 1260,
      height: 610,
      cellCount: panels.length *
        REPLAY_TERRAIN_PARAMS.gridResolutionX *
        REPLAY_TERRAIN_PARAMS.gridResolutionZ,
      rootMarkerCount: receipt.history.samples.length * 2,
      svgSha256,
      primaryOutputWritten: false
    },
    failurePhase: null
  };
  return {
    schema: HILL_PRODUCER_HISTORY_OPERATOR_REPLAY_SCHEMA,
    receipt,
    report,
    svg
  };
}

export function runHillProducerHistoryOperatorReplayCli(
  argv = process.argv.slice(2)
): number {
  let args: CliArgs = {
    input: findArgValue(argv, '--input'),
    imageOut: findArgValue(argv, '--image-out'),
    reportOut: findArgValue(argv, '--report-out')
  };
  let phase: ReplayFailurePhase = 'argument-parse';
  const evidence: Record<string, unknown> = {};

  try {
    args = parseArgs(argv);
    if (!args.input) throw new Error('missing required --input path');
    if (!args.imageOut) throw new Error('missing required --image-out path');
    if (!args.reportOut) throw new Error('missing required --report-out path');
    const inputPath = resolve(args.input);
    const imageOut = resolve(args.imageOut);
    const reportOut = resolve(args.reportOut);
    if (pathIsSymbolicLink(imageOut) || pathIsSymbolicLink(reportOut)) {
      throw new Error('image and report output paths must not be symbolic links');
    }
    if (
      pathsAlias(inputPath, imageOut) ||
      pathsAlias(inputPath, reportOut) ||
      pathsAlias(imageOut, reportOut)
    ) {
      throw new Error('input, image output, and report output paths must be distinct');
    }
    evidence.requested = { input: args.input, imageOut: args.imageOut, reportOut: args.reportOut };
    evidence.effective = { inputPath, imageOut, reportOut };
    evidence.preexistingImage = inspectPreexistingOutput(imageOut);

    phase = 'input-read';
    const inputBytes = readFileSync(inputPath);
    if (inputBytes.length === 0) throw new Error('producer-history receipt input is blank');
    const inputSha256 = sha256(inputBytes);
    evidence.input = { byteLength: inputBytes.length, sha256: inputSha256 };
    const input = JSON.parse(inputBytes.toString('utf8'));

    phase = 'input-validation';
    const receipt = validateReceipt(input);
    evidence.receipt = {
      schema: receipt.schema,
      revision: receipt.lerms.revision,
      hillBaseRevision: receipt.lerms.hillBaseRevision,
      producerRevision: receipt.producer.revision,
      episodeId: receipt.history.episodeId
    };

    phase = 'hill-replay';
    const replay = createHillProducerHistoryOperatorReplay(receipt, {
      inputPath,
      inputSha256
    });
    phase = 'render';
    if (!replay.svg.startsWith('<svg ') || replay.svg.length < 10_000) {
      throw new Error('operator replay primary image is missing, blank, or partial');
    }

    phase = 'write-image';
    atomicWrite(imageOut, replay.svg);
    const writtenImage = readFileSync(imageOut);
    if (writtenImage.length === 0 || sha256(writtenImage) !== replay.report.render.svgSha256) {
      throw new Error('operator replay primary image write did not preserve rendered bytes');
    }

    phase = 'write-report';
    writeJson(reportOut, {
      ...replay.report,
      outputs: {
        requested: {
          imageOut: args.imageOut,
          reportOut: args.reportOut
        },
        effective: {
          imageOut,
          reportOut
        },
        imageSha256: replay.report.render.svgSha256
      },
      render: {
        ...replay.report.render,
        primaryOutputWritten: true
      }
    });
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureReportOut = safeFailureReportPath(args);
    if (failureReportOut) {
      try {
        writeJson(failureReportOut, {
          ok: false,
          schema: HILL_PRODUCER_HISTORY_OPERATOR_REPLAY_SCHEMA,
          phase: 'failed',
          route: HILL_PRODUCER_HISTORY_OPERATOR_REPLAY_ROUTE,
          failurePhase: phase,
          error: message,
          primaryOutputWritten: false,
          lastTrustworthyEvidence: evidence
        });
      } catch {
        // The requested report path itself is not writable; stderr remains the last surface.
      }
    }
    process.stderr.write(`${message}\n`);
    return 1;
  }
}

function validateReceipt(input: unknown): LermHordeProducerHistoryCompositionReceipt {
  if (!input || typeof input !== 'object') {
    throw new Error('producer-history receipt must be an object');
  }
  const receipt = input as Partial<LermHordeProducerHistoryCompositionReceipt>;
  if (
    receipt.ok !== true ||
    receipt.schema !== LERM_HORDE_PRODUCER_HISTORY_RECEIPT_SCHEMA ||
    receipt.phase !== 'complete'
  ) {
    throw new Error('producer-history receipt must be a complete successful v0 composition');
  }
  if (receipt.evidenceClass !== 'live_producer_composition') {
    throw new Error('operator replay requires live producer composition evidence');
  }
  if (
    receipt.fallbackStatus !== 'none' ||
    receipt.staleStatus !== 'fresh' ||
    receipt.partialStatus !== 'complete-root-only'
  ) {
    throw new Error('operator replay rejects fallback, stale, or partial producer-history evidence');
  }
  if (
    receipt.lerms?.hillBaseRevision !== LERM_HORDE_HILL_REVISION ||
    receipt.producer?.revision !== LERM_HORDE_PRODUCER_REVISION
  ) {
    throw new Error('operator replay receipt source revisions do not match the reviewed profile');
  }
  if (
    receipt.hill?.requested?.authority !== 'live_simulation' ||
    receipt.hill.effective?.authority !== 'live_simulation' ||
    receipt.hill.requested.route !== receipt.hill.effective.route ||
    receipt.hill.requested.backend !== receipt.hill.effective.backend ||
    receipt.hill.requested.configId !== receipt.hill.effective.configId
  ) {
    throw new Error('operator replay receipt Hill requested/effective identity mismatch');
  }
  const assertions = receipt.assertions;
  if (
    !assertions ||
    Object.values(assertions).some((value) => value !== true)
  ) {
    throw new Error('operator replay receipt has an unproven composition assertion');
  }
  if (
    receipt.hordeSemanticOverlay?.speciesIdentity !== 'producer-control-non-lerm' ||
    receipt.hordeSemanticOverlay.contactInference !== 'none'
  ) {
    throw new Error('operator replay receipt overstates Lerm or contact authority');
  }
  validateHillOfHillsProducerContactHistory(receipt.history!);
  return receipt as LermHordeProducerHistoryCompositionReceipt;
}

function replayTerrains(
  receipt: LermHordeProducerHistoryCompositionReceipt
): ReplayTerrains {
  const sourceAt = (
    frameId: string,
    timestampMs: number
  ): HillOfHillsSourceOptions => ({
    authority: receipt.hill.requested.authority,
    route: receipt.hill.requested.route,
    frameId,
    backend: receipt.hill.requested.backend,
    configId: receipt.hill.requested.configId,
    timestampMs,
    sampleAgeMs: 0,
    fallbackStatus: 'none'
  });
  const activeCache = createHillOfHillsLayerTileCache();
  const prior = createHillOfHillsTerrainWithCache(
    activeCache,
    REPLAY_TERRAIN_PARAMS,
    sourceAt(receipt.hill.effective.priorFrameId, 0)
  );
  if (
    receipt.history.hill.sourceId !== prior.source.frameId ||
    receipt.history.hill.sampleChecksum !== prior.witness.sampleChecksum ||
    receipt.history.hill.topologyChecksum !== prior.witness.topologyChecksum
  ) {
    throw new Error('operator replay history does not target the reproduced prior Hill');
  }
  const admitted = createHillOfHillsTerrainWithCache(
    activeCache,
    { ...REPLAY_TERRAIN_PARAMS, topologyPhaseTimeMs: 120 },
    {
      ...sourceAt(receipt.hill.effective.admittedFrameId, 120),
      producerContactHistory: receipt.history
    }
  );
  const afterDeparture = createHillOfHillsTerrainWithCache(
    activeCache,
    { ...REPLAY_TERRAIN_PARAMS, topologyPhaseTimeMs: 1230 },
    sourceAt(receipt.hill.effective.postDepartureFrameId, 1230)
  );

  const controlCache = createHillOfHillsLayerTileCache();
  createHillOfHillsTerrainWithCache(
    controlCache,
    REPLAY_TERRAIN_PARAMS,
    sourceAt(receipt.hill.effective.priorFrameId, 0)
  );
  createHillOfHillsTerrainWithCache(
    controlCache,
    { ...REPLAY_TERRAIN_PARAMS, topologyPhaseTimeMs: 120 },
    sourceAt(receipt.hill.effective.admittedFrameId, 120)
  );
  const control = createHillOfHillsTerrainWithCache(
    controlCache,
    { ...REPLAY_TERRAIN_PARAMS, topologyPhaseTimeMs: 1230 },
    sourceAt(receipt.hill.effective.postDepartureFrameId, 1230)
  );
  return { control, admitted, afterDeparture };
}

function createPanels(terrains: ReplayTerrains): readonly HillProducerHistoryReplayPanel[] {
  return [
    panelFor('no-history-control', 'no-history control', terrains.control),
    panelFor('history-admitted', 'history admitted', terrains.admitted),
    panelFor('after-departure', 'after departure', terrains.afterDeparture)
  ];
}

function panelFor(
  id: HillProducerHistoryReplayPanel['id'],
  label: string,
  terrain: HillOfHillsTerrain
): HillProducerHistoryReplayPanel {
  return {
    id,
    label,
    frameId: terrain.source.frameId,
    sampleChecksum: terrain.witness.sampleChecksum,
    topologyPossibilityChecksum: terrain.witness.topologyPossibilityChecksum,
    trafficChecksum: terrain.witness.producerTrafficFieldChecksum,
    trafficRange: terrain.witness.producerTrafficFieldRange,
    admittedEpisodeCount: terrain.witness.producerTrafficAdmittedEpisodeCount,
    supportedRootSampleCount: terrain.witness.producerTrafficSupportedRootSampleCount,
    stanceContactCount: terrain.witness.producerTrafficStanceContactCount,
    supportShockResetCount:
      terrain.witness.supportFrame.shockClassCounts.shock_reset ?? 0
  };
}

function verifyReplayMatchesReceipt(
  receipt: LermHordeProducerHistoryCompositionReceipt,
  terrains: ReplayTerrains,
  panels: readonly HillProducerHistoryReplayPanel[]
): void {
  const [control, admitted, afterDeparture] = panels;
  requireClaim(
    receipt.history.samples.every(
      (sample) => sample.contacts === undefined && sample.locomotion === undefined
    ),
    'operator replay history contains inferred contact evidence'
  );
  requireClaim(
    admitted.trafficChecksum === receipt.persistence.producerTrafficChecksumAtAdmission &&
    afterDeparture.trafficChecksum ===
      receipt.persistence.producerTrafficChecksumAfterDeparture &&
    afterDeparture.trafficChecksum === receipt.admission.trafficChecksum,
    'operator replay traffic checksum does not reproduce the source receipt'
  );
  requireClaim(
    afterDeparture.topologyPossibilityChecksum ===
      receipt.admission.postDepartureTopologyPossibilityChecksum &&
    control.topologyPossibilityChecksum ===
      receipt.admission.noHistoryTopologyPossibilityChecksum,
    'operator replay topology possibility does not reproduce the source receipt'
  );
  requireClaim(
    afterDeparture.topologyPossibilityChecksum !== control.topologyPossibilityChecksum,
    'operator replay history does not diverge from the no-history control'
  );
  requireClaim(
    admitted.admittedEpisodeCount === 1 &&
    afterDeparture.admittedEpisodeCount === 1 &&
    terrains.afterDeparture.witness.producerTrafficSourceLineageKey ===
      receipt.hill.effective.sourceLineageKey,
    'operator replay did not preserve admitted history and source lineage'
  );
  requireClaim(
    afterDeparture.supportShockResetCount === 0 &&
    afterDeparture.stanceContactCount === 0 &&
    afterDeparture.supportedRootSampleCount === receipt.historySummary.supportedRootCount,
    'operator replay support/contact accounting does not match the source receipt'
  );
}

function renderReplaySvg(
  receipt: LermHordeProducerHistoryCompositionReceipt,
  terrains: ReplayTerrains,
  panels: readonly HillProducerHistoryReplayPanel[]
): string {
  const panelWidth = 420;
  const width = panelWidth * panels.length;
  const height = 610;
  const plot = { x: 24, y: 104, width: 372, height: 438 };
  const cellWidth = plot.width / REPLAY_TERRAIN_PARAMS.gridResolutionX;
  const cellHeight = plot.height / REPLAY_TERRAIN_PARAMS.gridResolutionZ;
  const terrainByPanel = [terrains.control, terrains.admitted, terrains.afterDeparture];
  const panelSvg = terrainByPanel.map((terrain, panelIndex) => {
    const panel = panels[panelIndex];
    const x0 = panelIndex * panelWidth;
    const heights = terrain.samples.map((sample) => sample.height);
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const trafficMax = Math.max(0.000001, panel.trafficRange.max);
    const cells = terrain.samples.map((sample, index) => {
      const xi = index % REPLAY_TERRAIN_PARAMS.gridResolutionX;
      const zi = Math.floor(index / REPLAY_TERRAIN_PARAMS.gridResolutionX);
      const heightT = (sample.height - minHeight) / Math.max(0.001, maxHeight - minHeight);
      const trafficField =
        terrain.phaseState.producerTrafficField ??
        terrain.phaseState.persistentTopologyField?.producerTrafficField;
      const traffic = trafficField
        ? sampleHillOfHillsProducerTrafficField(
            trafficField,
            sample.world[0],
            sample.world[2]
          )
        : 0;
      const trafficT = Math.min(1, traffic / trafficMax);
      const r = Math.round(31 + heightT * 88 + trafficT * 92);
      const g = Math.round(58 + heightT * 116 + trafficT * 62);
      const b = Math.round(44 + heightT * 48 + trafficT * 150);
      return `<rect x="${(x0 + plot.x + xi * cellWidth).toFixed(2)}" y="${(
        plot.y +
        (REPLAY_TERRAIN_PARAMS.gridResolutionZ - 1 - zi) * cellHeight
      ).toFixed(2)}" width="${(cellWidth + 0.2).toFixed(2)}" height="${(
        cellHeight + 0.2
      ).toFixed(2)}" fill="rgb(${r},${g},${b})"/>`;
    }).join('');
    const roots = panel.id === 'no-history-control'
      ? ''
      : receipt.history.samples.map((sample) => {
          const px = x0 + plot.x +
            (sample.root.worldPosition[0] + REPLAY_TERRAIN_PARAMS.width / 2) /
            REPLAY_TERRAIN_PARAMS.width * plot.width;
          const py = plot.y + plot.height -
            (sample.root.worldPosition[2] + REPLAY_TERRAIN_PARAMS.length / 2) /
            REPLAY_TERRAIN_PARAMS.length * plot.height;
          return `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="2.5" fill="#ffe06f" stroke="#07120f" stroke-width="0.8"/>`;
        }).join('');
    return `<g>
      <rect x="${x0}" y="0" width="${panelWidth}" height="${height}" fill="#06110d"/>
      <text x="${x0 + 24}" y="30" fill="#f4f0ca" font-family="monospace" font-size="17" font-weight="700">${escapeXml(panel.label)}</text>
      <text x="${x0 + 24}" y="52" fill="#9fc7b0" font-family="monospace" font-size="11">frame ${escapeXml(panel.frameId)}</text>
      <text x="${x0 + 24}" y="69" fill="#9fc7b0" font-family="monospace" font-size="11">traffic ${panel.trafficChecksum} · max ${panel.trafficRange.max.toFixed(4)} · episodes ${panel.admittedEpisodeCount}</text>
      <text x="${x0 + 24}" y="86" fill="#9fc7b0" font-family="monospace" font-size="11">possibility ${panel.topologyPossibilityChecksum} · roots ${panel.supportedRootSampleCount} · contacts ${panel.stanceContactCount}</text>
      ${cells}${roots}
      <rect x="${x0 + plot.x}" y="${plot.y}" width="${plot.width}" height="${plot.height}" fill="none" stroke="#78a98e" stroke-width="1"/>
      <text x="${x0 + 24}" y="567" fill="#f9e27d" font-family="monospace" font-size="11">yellow = live producer root/support rail</text>
      <text x="${x0 + 24}" y="586" fill="#a8c9b6" font-family="monospace" font-size="10">receipt ${escapeXml(receipt.historySummary.checksum)} · source ${escapeXml(receipt.hill.effective.sourceLineageKey)} · shock ${panel.supportShockResetCount}</text>
    </g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#06110d"/>
    ${panelSvg}
  </svg>`;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { input: null, imageOut: null, reportOut: null };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--')) throw new Error(`unexpected positional argument ${key}`);
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${key}`);
    }
    if (key === '--input') args.input = value;
    else if (key === '--image-out') args.imageOut = value;
    else if (key === '--report-out') args.reportOut = value;
    else throw new Error(`unknown argument ${key}`);
    index += 1;
  }
  return args;
}

function findArgValue(argv: string[], key: string): string | null {
  const index = argv.indexOf(key);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : null;
}

function inspectPreexistingOutput(path: string): Record<string, unknown> {
  if (!existsSync(path)) return { present: false };
  const bytes = readFileSync(path);
  return {
    present: true,
    byteLength: statSync(path).size,
    sha256: sha256(bytes),
    disposition: 'stale-preexisting-not-evidence-for-this-run'
  };
}

function safeFailureReportPath(args: CliArgs): string | null {
  if (!args.reportOut) return null;
  const reportOut = resolve(args.reportOut);
  if (pathIsSymbolicLink(reportOut)) return null;
  const protectedPaths = [args.input, args.imageOut]
    .filter((path): path is string => path !== null)
    .map((path) => resolve(path));
  return protectedPaths.some((path) => pathsAlias(path, reportOut))
    ? null
    : reportOut;
}

function pathIsSymbolicLink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return false;
    }
    throw error;
  }
}

function pathsAlias(left: string, right: string): boolean {
  if (canonicalPathIdentity(left) === canonicalPathIdentity(right)) return true;
  if (!existsSync(left) || !existsSync(right)) return false;
  const leftStat = statSync(left);
  const rightStat = statSync(right);
  return leftStat.dev === rightStat.dev && leftStat.ino === rightStat.ino;
}

function canonicalPathIdentity(path: string): string {
  let cursor = resolve(path);
  const suffix: string[] = [];
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) return resolve(path);
    suffix.unshift(basename(cursor));
    cursor = parent;
  }
  return join(realpathSync(cursor), ...suffix);
}

function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, content);
  renameSync(temporary, path);
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function escapeXml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function requireClaim(value: boolean, message: string): asserts value {
  if (!value) throw new Error(message);
}

const currentModulePath = fileURLToPath(import.meta.url);

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(currentModulePath)
) {
  process.exitCode = runHillProducerHistoryOperatorReplayCli();
}
