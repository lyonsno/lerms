import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildGoinEcologyMergeWitnessReport,
  GOIN_ECOLOGY_MERGE_WITNESS_SCHEMA,
  type GoinEcologyMergeWitnessReport
} from './goin-ecology-merge-witness.ts';
import type { SimulationAuthority, SourceTruth } from './contracts/first-vertical.ts';

export const GLOVE_WEALTH_CUSTODY_WITNESS_SCHEMA = 'lerms.glove-wealth-custody-witness.v0' as const;
export const GLOVE_WEALTH_CUSTODY_ROUTE = 'lerms/glove-wealth-custody' as const;
export const GLOVE_WEALTH_CUSTODY_WITNESS_ROUTE = 'lerms/glove-wealth-custody/witness-file' as const;

interface CliArgs {
  report: string | null;
  frameId: string;
  timestampMs: number;
  sampleAgeMs: number;
  maxSampleAgeMs: number;
}

interface SourceRef {
  schema: string;
  route: string;
  refId: string;
  fieldPath: string;
}

interface GloveWellState {
  schema: 'lerms.glove-well-state.v0';
  id: 'glove-well-crown';
  source: SourceTruth;
  authority: SimulationAuthority;
  world: [number, number, number];
  storedWealthKind: 'glove_wealth';
  primordialWealthFragmentIds: string[];
  hoardPressure: number;
  theftPressure: number;
  sacrificePressure: number;
}

type GloveWealthCustodyState =
  | 'hoarded'
  | 'stolen_carried'
  | 'dropped_rolling'
  | 'thrown_sacrifice_rolling'
  | 'recovered_to_well';

interface GloveWealthFragment {
  schema: 'lerms.glove-wealth-fragment.v0';
  id: string;
  source: SourceTruth;
  originWellId: 'glove-well-crown';
  lineageId: string;
  goinId: string;
  custodyState: GloveWealthCustodyState;
  holderKind: 'glove_well' | 'lerm' | 'loose_terrain';
  holderId: string;
  desireMass: number;
  sourceGoinState: string;
  sourceRefs: SourceRef[];
}

type CustodyEventKind =
  | 'hoard_indexed'
  | 'lerm_theft'
  | 'carrier_hit_drop'
  | 'loose_rolling_desire'
  | 'glove_well_sacrifice_release'
  | 'thrown_rolling_desire'
  | 'recovered_to_well';

interface CustodyCause {
  kind:
    | 'fixture_hoard_index'
    | 'lerm_reaches_hoard'
    | 'juice_hit'
    | 'terrain_roll'
    | 'glove_well_release'
    | 'manual_recovery_fixture';
  refId: string;
}

interface GloveWealthCustodyEvent {
  schema: 'lerms.glove-wealth-custody-event.v0';
  id: string;
  source: SourceTruth;
  kind: CustodyEventKind;
  lineageId: string;
  goinId: string;
  fragmentId: string;
  fromHolderId: string | null;
  toHolderId: string;
  cause: CustodyCause;
  sourceRefs: SourceRef[];
}

interface GloveWealthCustodySummary {
  sourceFragmentCount: 2;
  activeLooseGoinCount: number;
  looseDesireWellCount: number;
  totalDesireMass: number;
  looseDesireMass: number;
  lineageContinuityOk: boolean;
  noFinalEconomyUnits: true;
  byHolder: Record<string, number>;
  byCustodyState: Record<GloveWealthCustodyState, number>;
}

interface GloveWealthSourceTruthSummary {
  effectiveAuthority: SimulationAuthority;
  deterministicCustodyAuthority: 'live_simulation';
  evaluatorAccepted: boolean;
  blockers: string[];
  downgrades: string[];
  sourceRoutes: string[];
  maxSampleAgeMs: number;
}

interface FakeBoundary {
  liveOperatorCameraSmoke: true;
  sidecarProcessManager: true;
  finalGoinMesh: true;
  fullCrowdAi: true;
  finalTreasureEconomy: true;
  fullFirstVerticalSuccess: true;
}

export interface GloveWealthCustodyWitnessReport {
  ok: true;
  schema: typeof GLOVE_WEALTH_CUSTODY_WITNESS_SCHEMA;
  route: typeof GLOVE_WEALTH_CUSTODY_WITNESS_ROUTE;
  outputPath: string;
  frameId: string;
  timestampMs: number;
  sourceTruth: GloveWealthSourceTruthSummary;
  gloveWell: GloveWellState;
  fragments: GloveWealthFragment[];
  custodyEvents: GloveWealthCustodyEvent[];
  custodySummary: GloveWealthCustodySummary;
  sourceReports: {
    goinEcologyMerge: GoinEcologyMergeWitnessReport;
  };
  whatRemainsFake: FakeBoundary;
}

interface FailureReport {
  ok: false;
  schema: typeof GLOVE_WEALTH_CUSTODY_WITNESS_SCHEMA;
  route: typeof GLOVE_WEALTH_CUSTODY_WITNESS_ROUTE;
  phase: 'building-glove-wealth-custody-witness';
  failureKind: 'glove-wealth-custody-invalid' | 'stale-custody-source';
  error: string;
  lastTrustworthyEvidence: {
    outputPath: string;
    frameId: string;
    timestampMs: number;
    sampleAgeMs: number;
    maxSampleAgeMs: number;
  };
}

export interface BuildGloveWealthCustodyWitnessOptions {
  outputPath: string;
  frameId?: string;
  timestampMs?: number;
  sampleAgeMs?: number;
  maxSampleAgeMs?: number;
}

export function buildGloveWealthCustodyWitnessReport({
  outputPath,
  frameId = 'glove-wealth-custody-witness',
  timestampMs = 0,
  sampleAgeMs = 0,
  maxSampleAgeMs = 500
}: BuildGloveWealthCustodyWitnessOptions): GloveWealthCustodyWitnessReport {
  assertFinite(timestampMs, 'timestampMs');
  assertFinite(sampleAgeMs, 'sampleAgeMs');
  assertFinite(maxSampleAgeMs, 'maxSampleAgeMs');
  if (sampleAgeMs > maxSampleAgeMs) {
    throw new StaleCustodySourceError(sampleAgeMs, maxSampleAgeMs);
  }

  const source = createSource(frameId, timestampMs, sampleAgeMs);
  const goinEcologyMerge = buildGoinEcologyMergeWitnessReport({
    outputPath: `${outputPath}#goin-ecology-merge`,
    frameId: `${frameId}-goin-ecology-merge`,
    timestampMs,
    sampleAgeMs,
    maxSampleAgeMs
  });
  const gloveWell = buildGloveWell(source, goinEcologyMerge);
  const fragments = buildFragments(source, goinEcologyMerge);
  const custodyEvents = buildCustodyEvents(source, fragments, goinEcologyMerge);
  const custodySummary = summarizeCustody(fragments, custodyEvents);

  return {
    ok: true,
    schema: GLOVE_WEALTH_CUSTODY_WITNESS_SCHEMA,
    route: GLOVE_WEALTH_CUSTODY_WITNESS_ROUTE,
    outputPath,
    frameId,
    timestampMs,
    sourceTruth: {
      effectiveAuthority: goinEcologyMerge.sourceTruthEvaluation.effectiveAuthority,
      deterministicCustodyAuthority: 'live_simulation',
      evaluatorAccepted: goinEcologyMerge.sourceTruthEvaluation.accepted,
      blockers: goinEcologyMerge.sourceTruthEvaluation.blockers,
      downgrades: unique([
        ...goinEcologyMerge.sourceTruth.downgrades,
        'custody_lineage_composed_from_fixture_merge',
        'not_final_treasure_economy'
      ]),
      sourceRoutes: unique([
        goinEcologyMerge.route,
        goinEcologyMerge.frame.source.route,
        GLOVE_WEALTH_CUSTODY_ROUTE
      ]),
      maxSampleAgeMs
    },
    gloveWell,
    fragments,
    custodyEvents,
    custodySummary,
    sourceReports: {
      goinEcologyMerge
    },
    whatRemainsFake: {
      liveOperatorCameraSmoke: true,
      sidecarProcessManager: true,
      finalGoinMesh: true,
      fullCrowdAi: true,
      finalTreasureEconomy: true,
      fullFirstVerticalSuccess: true
    }
  };
}

export function runGloveWealthCustodyWitnessCli(argv = process.argv.slice(2)): number {
  const partialArgs = readPartialArgs(argv);
  let args: CliArgs;

  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`${messageFor(error)}\n`);
    if (partialArgs.report) writeJson(partialArgs.report, buildFailureReport(partialArgs, error));
    return 1;
  }

  if (!args.report) {
    process.stderr.write('missing required --report path\n');
    return 1;
  }

  try {
    writeJson(
      args.report,
      buildGloveWealthCustodyWitnessReport({
        outputPath: args.report,
        frameId: args.frameId,
        timestampMs: args.timestampMs,
        sampleAgeMs: args.sampleAgeMs,
        maxSampleAgeMs: args.maxSampleAgeMs
      })
    );
    return 0;
  } catch (error) {
    writeJson(args.report, buildFailureReport(args, error));
    return 1;
  }
}

function buildGloveWell(source: SourceTruth, goinEcologyMerge: GoinEcologyMergeWitnessReport): GloveWellState {
  const hoarded = required(
    goinEcologyMerge.frame.goins.find((goin) => goin.id === 'goin-hoard-001'),
    'hoarded goin'
  );
  return {
    schema: 'lerms.glove-well-state.v0',
    id: 'glove-well-crown',
    source,
    authority: goinEcologyMerge.sourceTruthEvaluation.effectiveAuthority,
    world: [hoarded.world[0], hoarded.world[1] + 0.18, hoarded.world[2]],
    storedWealthKind: 'glove_wealth',
    primordialWealthFragmentIds: ['wealth-fragment-hoard-001', 'wealth-fragment-sacrifice-rolling-001'],
    hoardPressure: 0.88,
    theftPressure: 0.72,
    sacrificePressure: 0.58
  };
}

function buildFragments(source: SourceTruth, goinEcologyMerge: GoinEcologyMergeWitnessReport): GloveWealthFragment[] {
  const sourceRef = sourceRefFor(goinEcologyMerge);
  const goinRef = (goinId: string): SourceRef => ({
    schema: 'lerms.goin-state.v0',
    route: goinEcologyMerge.frame.source.route,
    refId: goinId,
    fieldPath: `frame.goins[id=${goinId}]`
  });
  return [
    fragment({
      id: 'wealth-fragment-hoard-001',
      lineageId: 'wealth-lineage-stolen-carrier-001',
      goinId: 'goin-hoard-001',
      custodyState: 'hoarded',
      holderKind: 'glove_well',
      holderId: 'glove-well-crown',
      desireMass: 1.4,
      sourceGoinState: 'hoarded',
      source,
      sourceRefs: [sourceRef, goinRef('goin-hoard-001')]
    }),
    fragment({
      id: 'wealth-fragment-carried-001',
      lineageId: 'wealth-lineage-stolen-carrier-001',
      goinId: 'goin-carried-001',
      custodyState: 'stolen_carried',
      holderKind: 'lerm',
      holderId: 'red-carrier-001',
      desireMass: 1.4,
      sourceGoinState: 'carried',
      source,
      sourceRefs: [sourceRef, goinRef('goin-carried-001')]
    }),
    fragment({
      id: 'wealth-fragment-dropped-rolling-001',
      lineageId: 'wealth-lineage-stolen-carrier-001',
      goinId: 'goin-001',
      custodyState: 'dropped_rolling',
      holderKind: 'loose_terrain',
      holderId: 'loose-terrain',
      desireMass: 1.4,
      sourceGoinState: 'rolling',
      source,
      sourceRefs: [sourceRef, goinRef('goin-001')]
    }),
    fragment({
      id: 'wealth-fragment-sacrifice-rolling-001',
      lineageId: 'wealth-lineage-thrown-sacrifice-001',
      goinId: goinEcologyMerge.throwChain.rollingGoinId,
      custodyState: 'thrown_sacrifice_rolling',
      holderKind: 'loose_terrain',
      holderId: 'loose-terrain',
      desireMass: 1,
      sourceGoinState: 'rolling',
      source,
      sourceRefs: [sourceRef, goinRef(goinEcologyMerge.throwChain.rollingGoinId)]
    }),
    fragment({
      id: 'wealth-fragment-recovered-001',
      lineageId: 'wealth-lineage-stolen-carrier-001',
      goinId: 'goin-recovered-001',
      custodyState: 'recovered_to_well',
      holderKind: 'glove_well',
      holderId: 'glove-well-crown',
      desireMass: 0.35,
      sourceGoinState: 'recovered',
      source,
      sourceRefs: [sourceRef, goinRef('goin-recovered-001')]
    })
  ];
}

function fragment(input: Omit<GloveWealthFragment, 'schema' | 'originWellId'>): GloveWealthFragment {
  return {
    schema: 'lerms.glove-wealth-fragment.v0',
    originWellId: 'glove-well-crown',
    ...input
  };
}

function buildCustodyEvents(
  source: SourceTruth,
  fragments: GloveWealthFragment[],
  goinEcologyMerge: GoinEcologyMergeWitnessReport
): GloveWealthCustodyEvent[] {
  const sourceRef = sourceRefFor(goinEcologyMerge);
  const fragmentByState = new Map(fragments.map((fragmentItem) => [fragmentItem.custodyState, fragmentItem]));
  const hoard = required(fragmentByState.get('hoarded'), 'hoarded fragment');
  const carried = required(fragmentByState.get('stolen_carried'), 'carried fragment');
  const dropped = required(fragmentByState.get('dropped_rolling'), 'dropped fragment');
  const sacrifice = required(fragmentByState.get('thrown_sacrifice_rolling'), 'sacrifice fragment');
  const recovered = required(fragmentByState.get('recovered_to_well'), 'recovered fragment');

  return [
    custodyEvent(source, {
      id: 'glove-wealth-hoard-indexed-001',
      kind: 'hoard_indexed',
      fragment: hoard,
      fromHolderId: null,
      toHolderId: 'glove-well-crown',
      cause: { kind: 'fixture_hoard_index', refId: 'glove-well-crown' },
      sourceRefs: [sourceRef]
    }),
    custodyEvent(source, {
      id: 'glove-wealth-lerm-theft-001',
      kind: 'lerm_theft',
      fragment: carried,
      fromHolderId: 'glove-well-crown',
      toHolderId: 'red-carrier-001',
      cause: { kind: 'lerm_reaches_hoard', refId: 'red-carrier-001' },
      sourceRefs: [sourceRef]
    }),
    custodyEvent(source, {
      id: 'glove-wealth-carrier-hit-drop-001',
      kind: 'carrier_hit_drop',
      fragment: dropped,
      fromHolderId: 'red-carrier-001',
      toHolderId: 'loose-terrain',
      cause: { kind: 'juice_hit', refId: goinEcologyMerge.carrierDropChain.hitId },
      sourceRefs: [sourceRef, eventSourceRef('lerms.carrier-drop-event.v0', goinEcologyMerge.carrierDropChain.dropId)]
    }),
    custodyEvent(source, {
      id: 'glove-wealth-loose-rolling-desire-001',
      kind: 'loose_rolling_desire',
      fragment: dropped,
      fromHolderId: 'loose-terrain',
      toHolderId: 'loose-terrain',
      cause: { kind: 'terrain_roll', refId: goinEcologyMerge.carrierDropChain.dropId },
      sourceRefs: [sourceRef]
    }),
    custodyEvent(source, {
      id: 'glove-wealth-sacrifice-release-001',
      kind: 'glove_well_sacrifice_release',
      fragment: sacrifice,
      fromHolderId: 'glove-well-crown',
      toHolderId: 'loose-terrain',
      cause: { kind: 'glove_well_release', refId: goinEcologyMerge.throwChain.releaseEventId },
      sourceRefs: [sourceRef, eventSourceRef('lerms.glove-well-release-event.v0', goinEcologyMerge.throwChain.releaseEventId)]
    }),
    custodyEvent(source, {
      id: 'glove-wealth-thrown-rolling-desire-001',
      kind: 'thrown_rolling_desire',
      fragment: sacrifice,
      fromHolderId: 'loose-terrain',
      toHolderId: 'loose-terrain',
      cause: { kind: 'terrain_roll', refId: goinEcologyMerge.throwChain.rollingGoinId },
      sourceRefs: [sourceRef]
    }),
    custodyEvent(source, {
      id: 'glove-wealth-recovered-to-well-001',
      kind: 'recovered_to_well',
      fragment: recovered,
      fromHolderId: 'loose-terrain',
      toHolderId: 'glove-well-crown',
      cause: { kind: 'manual_recovery_fixture', refId: 'goin-recovered-001' },
      sourceRefs: [sourceRef]
    })
  ];
}

function custodyEvent(
  source: SourceTruth,
  input: {
    id: string;
    kind: CustodyEventKind;
    fragment: GloveWealthFragment;
    fromHolderId: string | null;
    toHolderId: string;
    cause: CustodyCause;
    sourceRefs: SourceRef[];
  }
): GloveWealthCustodyEvent {
  return {
    schema: 'lerms.glove-wealth-custody-event.v0',
    id: input.id,
    source,
    kind: input.kind,
    lineageId: input.fragment.lineageId,
    goinId: input.fragment.goinId,
    fragmentId: input.fragment.id,
    fromHolderId: input.fromHolderId,
    toHolderId: input.toHolderId,
    cause: input.cause,
    sourceRefs: input.sourceRefs
  };
}

function summarizeCustody(
  fragments: readonly GloveWealthFragment[],
  events: readonly GloveWealthCustodyEvent[]
): GloveWealthCustodySummary {
  const byHolder: Record<string, number> = {};
  const byCustodyState = {
    hoarded: 0,
    stolen_carried: 0,
    dropped_rolling: 0,
    thrown_sacrifice_rolling: 0,
    recovered_to_well: 0
  };
  for (const fragmentItem of fragments) {
    byHolder[fragmentItem.holderId] = (byHolder[fragmentItem.holderId] ?? 0) + 1;
    byCustodyState[fragmentItem.custodyState] += 1;
  }
  const looseFragments = fragments.filter((fragmentItem) => fragmentItem.holderKind === 'loose_terrain');
  const lineageIds = unique(fragments.map((fragmentItem) => fragmentItem.lineageId));

  return {
    sourceFragmentCount: 2,
    activeLooseGoinCount: looseFragments.length,
    looseDesireWellCount: looseFragments.filter((fragmentItem) => fragmentItem.desireMass > 0).length,
    totalDesireMass: sum(fragments.map((fragmentItem) => fragmentItem.desireMass)),
    looseDesireMass: sum(looseFragments.map((fragmentItem) => fragmentItem.desireMass)),
    lineageContinuityOk: lineageIds.every((lineageId) => events.some((event) => event.lineageId === lineageId)),
    noFinalEconomyUnits: true,
    byHolder,
    byCustodyState
  };
}

function sourceRefFor(goinEcologyMerge: GoinEcologyMergeWitnessReport): SourceRef {
  return {
    schema: GOIN_ECOLOGY_MERGE_WITNESS_SCHEMA,
    route: goinEcologyMerge.route,
    refId: goinEcologyMerge.frameId,
    fieldPath: 'sourceReports.goinEcologyMerge'
  };
}

function eventSourceRef(schema: string, refId: string): SourceRef {
  return {
    schema,
    route: GLOVE_WEALTH_CUSTODY_ROUTE,
    refId,
    fieldPath: `custodyEvents[cause.refId=${refId}]`
  };
}

function createSource(frameId: string, timestampMs: number, sampleAgeMs: number): SourceTruth {
  return {
    schema: 'lerms.source-truth.v0',
    authority: 'synthetic_fixture',
    route: GLOVE_WEALTH_CUSTODY_ROUTE,
    frameId,
    timestampMs,
    sampleAgeMs,
    backend: 'deterministic-glove-wealth-custody-v0',
    configId: 'glove-wealth-custody-v0'
  };
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args = readPartialArgs(argv);
  if (!args.report) return args;
  assertFinite(args.timestampMs, 'timestamp-ms');
  assertFinite(args.sampleAgeMs, 'sample-age-ms');
  assertFinite(args.maxSampleAgeMs, 'max-sample-age-ms');
  return args;
}

function readPartialArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    report: null,
    frameId: 'glove-wealth-custody-witness',
    timestampMs: 0,
    sampleAgeMs: 0,
    maxSampleAgeMs: 500
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--')) continue;
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${key}`);
    }
    if (key === '--report') args.report = value;
    else if (key === '--frame-id') args.frameId = value;
    else if (key === '--timestamp-ms') args.timestampMs = Number(value);
    else if (key === '--sample-age-ms') args.sampleAgeMs = Number(value);
    else if (key === '--max-sample-age-ms') args.maxSampleAgeMs = Number(value);
    else throw new Error(`unknown argument ${key}`);
    index += 1;
  }
  return args;
}

function buildFailureReport(args: CliArgs, error: unknown): FailureReport {
  return {
    ok: false,
    schema: GLOVE_WEALTH_CUSTODY_WITNESS_SCHEMA,
    route: GLOVE_WEALTH_CUSTODY_WITNESS_ROUTE,
    phase: 'building-glove-wealth-custody-witness',
    failureKind: error instanceof StaleCustodySourceError ? 'stale-custody-source' : 'glove-wealth-custody-invalid',
    error: messageFor(error),
    lastTrustworthyEvidence: {
      outputPath: args.report ?? '',
      frameId: args.frameId,
      timestampMs: args.timestampMs,
      sampleAgeMs: args.sampleAgeMs,
      maxSampleAgeMs: args.maxSampleAgeMs
    }
  };
}

class StaleCustodySourceError extends Error {
  constructor(sampleAgeMs: number, maxSampleAgeMs: number) {
    super(`stale glove wealth custody source: sampleAgeMs ${sampleAgeMs} exceeds maxSampleAgeMs ${maxSampleAgeMs}`);
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`missing ${label}`);
  }
  return value;
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runGloveWealthCustodyWitnessCli();
}
