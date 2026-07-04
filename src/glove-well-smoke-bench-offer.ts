import { existsSync, writeFileSync } from 'node:fs';

import {
  GLOVE_WELL_HOST_PACKET_ROUTE,
  GLOVE_WELL_HOST_PACKET_SCHEMA,
  buildFixtureGloveWellHostPacket
} from './glove-well-host-packet.ts';
import type { GloveWellHostPacket } from './glove-well-browser-smoke-state.ts';

export const GLOVE_WELL_SMOKE_BENCH_OFFER_SCHEMA = 'lerms.glove-well-smoke-bench-offer.v0' as const;
export const GLOVE_WELL_SMOKE_BENCH_OFFER_ROUTE = 'lerms/glove-well/smoke-bench-offer-file' as const;
export const KAMINOS_SMOKE_BENCH_OFFER_SCHEMA = 'kaminos.smoke-bench.offer.v0' as const;
export const KAMINOS_SMOKE_BENCH_PRIMARY_TARGET_SCHEMA = 'kaminos.smoke-bench.primary-target.v0' as const;

type SmokeBenchAuthority = 'live_simulation' | 'fixture' | 'fallback' | 'synthetic' | 'unknown';

export interface BuildGloveWellSmokeBenchOfferOptions {
  generatedAt?: string | null;
  sourceRef?: string | null;
  liveHostPayloadUrl?: string | null;
  kaminosHostUrl?: string | null;
  transitionalHandEventUrl?: string | null;
  handStateRuntimeReport?: string | null;
}

export interface GloveWellSmokeBenchOfferReport {
  schema: typeof GLOVE_WELL_SMOKE_BENCH_OFFER_SCHEMA;
  route: typeof GLOVE_WELL_SMOKE_BENCH_OFFER_ROUTE;
  generatedAt: string;
  sourceRef: string;
  sourceTruth: {
    hostPayloadAuthority: SmokeBenchAuthority | string;
    hostPayloadSourceTruthAuthority: string;
    handInputAuthority: 'transitional_live_bridge' | 'fixture_bridge' | 'unknown';
    displayAuthority: 'local_browser_smoke_not_native_kaminos_host' | 'native_kaminos_host_unverified';
    freshness: GloveWellHostPacket['freshness']['status'];
    effectiveRoute: string | null;
    depthLoadBearing: false;
  };
  smokeBench: {
    schema: typeof KAMINOS_SMOKE_BENCH_OFFER_SCHEMA;
    id: 'offer:greedy:glove-well-native-host';
    producerDiaulos: 'greedy-glove-fucker';
    title: 'Glove Well Native Host Payload';
    sourceRef: string;
    authority: SmokeBenchAuthority | string;
    displayState: 'available';
    freshness: GloveWellHostPacket['freshness']['status'];
    primaryTarget: {
      schema: typeof KAMINOS_SMOKE_BENCH_PRIMARY_TARGET_SCHEMA;
      id: 'target:greedy-glove-well-native-host';
      kind: 'native-host';
      surface: 'glove-well';
      url: string | null;
      adapter: {
        id: 'glove-well';
        kind: 'native_host';
        acceptancePredicate: 'source_owned_glove_well_primitives_visible_in_kaminos_adapter';
        hostRouteExpectation: 'kaminos/glove-well-host';
      };
      hostPayload: GloveWellSmokeBenchHostPayload;
      stateStream: GloveWellSmokeBenchStateStream;
    };
    hostPayload: GloveWellSmokeBenchHostPayload;
    stateStream: GloveWellSmokeBenchStateStream;
    artifacts: Array<{ id: string; kind: string; ref: string }>;
    downgrades: string[];
  };
  offer: GloveWellSmokeBenchOfferReport['smokeBench'];
  adapterState: GloveWellSmokeBenchAdapterState;
  requiredPrimitiveRoles: string[];
  screenshot: {
    path: string | null;
    kind: 'filmstrip_html_supporting_artifact' | 'capture_report_supporting_artifact' | 'missing_supporting_artifact';
    bytes: null;
  };
  minionContract: {
    campaign: 'smoke-bench-native-host';
    requiredTerms: ['offer', 'primaryTarget', 'hostPayload', 'stateStream'];
    acceptanceSurface: 'Kaminos-controlled native adapter surface';
    rejects: string[];
  };
  custody: {
    greedyOwns: string[];
    kaminosOwns: string[];
    palmOwns: string[];
    gutterglassSupports: string[];
  };
  rejectedAcceptanceSurfaces: Array<{
    surface: string;
    acceptanceSurface: false;
    reason: string;
  }>;
  sourcePacket: GloveWellHostPacket;
}

interface GloveWellSmokeBenchHostPayload {
  schema: typeof GLOVE_WELL_HOST_PACKET_SCHEMA;
  route: typeof GLOVE_WELL_HOST_PACKET_ROUTE;
  liveUrl: string | null;
  hostId: 'glove-well';
  requestedAdapter: 'glove-well';
  sourceTruthAuthority: 'lerms.gloveWellBrowserSmokeState';
  coordinateFrame: GloveWellHostPacket['coordinateFrame'];
  primitiveCount: number;
  requiredPrimitiveRoles: string[];
  capture: GloveWellHostPacket['capture'];
}

interface GloveWellSmokeBenchStateStream {
  schema: 'perceptasia.hand-control.v0';
  compatTargetSchema: 'hand-state.frame.v0';
  url: string | null;
  transitional: true;
  depthLoadBearing: false;
  effectiveRoute: 'native_wilor_mini_mlx_detector_sidecar_live' | string;
  freshnessBudgetMs: 180;
  extractionBoundaryRef: string | null;
  downgrade: 'hand_state_runtime_not_extracted';
}

interface GloveWellSmokeBenchAdapterState {
  schema: 'kaminos.host-surface.state.v0';
  route: 'kaminos/host-surface';
  hostId: 'glove-well';
  hostLabel: 'Glove Well';
  hostRoute: 'kaminos/glove-well-host';
  hostStateSchema: 'kaminos.glove-well-host.state.v0';
  packetSchema: typeof GLOVE_WELL_HOST_PACKET_SCHEMA;
  packetRoute: typeof GLOVE_WELL_HOST_PACKET_ROUTE;
  sourceAuthority: SmokeBenchAuthority | string;
  sourceTruthAuthority: 'lerms.gloveWellBrowserSmokeState';
  freshness: {
    status: GloveWellHostPacket['freshness']['status'];
    sampleAgeMs: number | null;
    cameraAgeMs: number | null;
    budgetMs: number;
  };
  visual: {
    canvasNonblank: boolean;
    defaultMarkers: false;
    syntheticDefaultMarkers: false;
    primitiveRoleCounts: Record<string, number>;
  };
  downgrades: string[];
  rejectedDebugSurfaces: GloveWellHostPacket['rejectedDebugSurfaces'];
}

interface CliOptions extends BuildGloveWellSmokeBenchOfferOptions {
  help: boolean;
  report: string | null;
  conformanceFixture: string | null;
}

const DEFAULT_LIVE_HOST_PAYLOAD_URL = 'http://127.0.0.1:5191/__lerms/glove-well-host-packet/live';
const DEFAULT_KAMINOS_HOST_URL = 'http://127.0.0.1:18156/?kaminos_glove_well_host=1';
const DEFAULT_HAND_EVENT_URL = 'http://127.0.0.1:18158/hand-control-sidecar-event';
const DEFAULT_HAND_STATE_RUNTIME_REPORT = 'projects/perceptasia/topoi/codex-palm-gimbal-cockpit-clutch-0521.reports/smoke-bench-wilor-extraction-boundary_2026-07-03.md';

export function buildFixtureGloveWellSmokeBenchOffer(options: BuildGloveWellSmokeBenchOfferOptions = {}): GloveWellSmokeBenchOfferReport {
  const hostPacket = buildFixtureGloveWellHostPacket({
    sourceUrl: options.liveHostPayloadUrl ?? DEFAULT_LIVE_HOST_PAYLOAD_URL,
    capture: {
      state: 'complete',
      reportPath: '/tmp/lerms-glove-well-browser-smoke-capture-live/report.json',
      filmstripPath: '/tmp/lerms-glove-well-browser-smoke-capture-live/filmstrip.html'
    }
  });
  return buildGloveWellSmokeBenchOffer(hostPacket, options);
}

export function buildGloveWellSmokeBenchOffer(
  hostPacket: GloveWellHostPacket,
  options: BuildGloveWellSmokeBenchOfferOptions = {}
): GloveWellSmokeBenchOfferReport {
  if (hostPacket.schema !== GLOVE_WELL_HOST_PACKET_SCHEMA) {
    throw new Error(`Smoke Bench offer expected ${GLOVE_WELL_HOST_PACKET_SCHEMA}`);
  }
  if (hostPacket.route !== GLOVE_WELL_HOST_PACKET_ROUTE) {
    throw new Error(`Smoke Bench offer expected ${GLOVE_WELL_HOST_PACKET_ROUTE}`);
  }
  if (hostPacket.hostCandidate.hostId !== 'glove-well') {
    throw new Error('Smoke Bench offer expected glove-well host candidate');
  }

  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const sourceRef = options.sourceRef ?? 'src/glove-well-smoke-bench-offer.ts#buildGloveWellSmokeBenchOffer';
  const liveHostPayloadUrl = options.liveHostPayloadUrl ?? hostPacket.source.sourceUrl ?? DEFAULT_LIVE_HOST_PAYLOAD_URL;
  const transitionalHandEventUrl = options.transitionalHandEventUrl ?? DEFAULT_HAND_EVENT_URL;
  const kaminosHostUrl = options.kaminosHostUrl ?? DEFAULT_KAMINOS_HOST_URL;
  const handStateRuntimeReport = options.handStateRuntimeReport ?? DEFAULT_HAND_STATE_RUNTIME_REPORT;
  const stateStream = buildStateStream(hostPacket, transitionalHandEventUrl, handStateRuntimeReport);
  const hostPayload = buildHostPayload(hostPacket, liveHostPayloadUrl);
  const requiredPrimitiveRoles = [...hostPacket.surface.witnessExpectations.requiredPrimitiveRoles];
  const downgrades = uniqueStrings([
    ...hostPacket.downgrades,
    'hand_state_runtime_not_extracted',
    'current_hand_input_is_perceptasia_compat_not_neutral_hand_state',
    'smoke_bench_offer_is_not_kaminos_acceptance'
  ]);
  const smokeBenchOffer = {
    schema: KAMINOS_SMOKE_BENCH_OFFER_SCHEMA,
    id: 'offer:greedy:glove-well-native-host',
    producerDiaulos: 'greedy-glove-fucker',
    title: 'Glove Well Native Host Payload',
    sourceRef,
    authority: hostPacket.source.authority,
    displayState: 'available',
    freshness: hostPacket.freshness.status,
    primaryTarget: {
      schema: KAMINOS_SMOKE_BENCH_PRIMARY_TARGET_SCHEMA,
      id: 'target:greedy-glove-well-native-host',
      kind: 'native-host',
      surface: 'glove-well',
      url: kaminosHostUrl,
      adapter: {
        id: 'glove-well',
        kind: 'native_host',
        acceptancePredicate: 'source_owned_glove_well_primitives_visible_in_kaminos_adapter',
        hostRouteExpectation: 'kaminos/glove-well-host'
      },
      hostPayload,
      stateStream
    },
    hostPayload,
    stateStream,
    artifacts: buildArtifacts(hostPacket),
    downgrades
  } as const;
  const adapterState = buildAdapterState(hostPacket, downgrades);

  return {
    schema: GLOVE_WELL_SMOKE_BENCH_OFFER_SCHEMA,
    route: GLOVE_WELL_SMOKE_BENCH_OFFER_ROUTE,
    generatedAt,
    sourceRef,
    sourceTruth: {
      hostPayloadAuthority: hostPacket.source.authority,
      hostPayloadSourceTruthAuthority: hostPacket.source.sourceTruthAuthority,
      handInputAuthority: handAuthority(hostPacket),
      displayAuthority: 'local_browser_smoke_not_native_kaminos_host',
      freshness: hostPacket.freshness.status,
      effectiveRoute: hostPacket.source.effectiveRoute,
      depthLoadBearing: false
    },
    smokeBench: smokeBenchOffer,
    offer: smokeBenchOffer,
    adapterState,
    requiredPrimitiveRoles,
    screenshot: buildScreenshotMetadata(hostPacket),
    minionContract: {
      campaign: 'smoke-bench-native-host',
      requiredTerms: ['offer', 'primaryTarget', 'hostPayload', 'stateStream'],
      acceptanceSurface: 'Kaminos-controlled native adapter surface',
      rejects: ['link_out_or_popout', 'preview_bench_offer_card', 'screenshot_only', 'chat_bridge', 'stale_cache_claiming_live']
    },
    custody: {
      greedyOwns: ['glove-well hostPayload', 'goin objecthood', 'throw and desire primitives', 'source truth downgrades'],
      kaminosOwns: ['Smoke Bench host display acceptance', 'native adapter witness', 'operator inspection surface'],
      palmOwns: ['neutral hand-state runtime extraction', 'WiLoR sidecar route identity', 'fresh shared state stream'],
      gutterglassSupports: ['bounded proxy inventory only', 'mechanical fixture/witness repair under Minion predicates']
    },
    rejectedAcceptanceSurfaces: buildRejectedAcceptanceSurfaces(hostPacket),
    sourcePacket: hostPacket
  };
}

export function runGloveWellSmokeBenchOfferCli(argv = process.argv.slice(2)): number {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage());
    return 0;
  }
  const reportPath = options.report ?? '/tmp/lerms-glove-well-smoke-bench-offer-0704.json';
  const report = buildFixtureGloveWellSmokeBenchOffer(options);
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (options.conformanceFixture) {
    writeFileSync(options.conformanceFixture, `${JSON.stringify(buildNativeHostConformanceFixture(report), null, 2)}\n`);
  }
  console.log(JSON.stringify({
    ok: true,
    schema: GLOVE_WELL_SMOKE_BENCH_OFFER_SCHEMA,
    route: GLOVE_WELL_SMOKE_BENCH_OFFER_ROUTE,
    reportPath,
    conformanceFixturePath: options.conformanceFixture,
    smokeBenchSchema: report.smokeBench.schema,
    primaryTarget: report.smokeBench.primaryTarget.kind,
    hostPayload: report.smokeBench.hostPayload.schema,
    stateStream: report.smokeBench.stateStream.schema,
    downgrades: report.smokeBench.downgrades
  }, null, 2));
  return 0;
}

export function buildNativeHostConformanceFixture(report: GloveWellSmokeBenchOfferReport): {
  observedAt: string;
  requiredPrimitiveRoles: string[];
  screenshot: GloveWellSmokeBenchOfferReport['screenshot'];
  offer: GloveWellSmokeBenchOfferReport['offer'];
  adapterState: GloveWellSmokeBenchOfferReport['adapterState'];
} {
  return {
    observedAt: report.generatedAt,
    requiredPrimitiveRoles: report.requiredPrimitiveRoles,
    screenshot: report.screenshot,
    offer: report.offer,
    adapterState: report.adapterState
  };
}

function buildAdapterState(hostPacket: GloveWellHostPacket, downgrades: string[]): GloveWellSmokeBenchAdapterState {
  return {
    schema: 'kaminos.host-surface.state.v0',
    route: 'kaminos/host-surface',
    hostId: 'glove-well',
    hostLabel: 'Glove Well',
    hostRoute: 'kaminos/glove-well-host',
    hostStateSchema: 'kaminos.glove-well-host.state.v0',
    packetSchema: GLOVE_WELL_HOST_PACKET_SCHEMA,
    packetRoute: GLOVE_WELL_HOST_PACKET_ROUTE,
    sourceAuthority: hostPacket.source.authority,
    sourceTruthAuthority: hostPacket.source.sourceTruthAuthority,
    freshness: {
      status: hostPacket.freshness.status,
      sampleAgeMs: hostPacket.freshness.ageMs,
      cameraAgeMs: hostPacket.freshness.cameraAgeMs,
      budgetMs: hostPacket.freshness.budgetMs
    },
    visual: {
      canvasNonblank: hostPacket.surface.primitives.length > 0,
      defaultMarkers: false,
      syntheticDefaultMarkers: false,
      primitiveRoleCounts: primitiveRoleCounts(hostPacket)
    },
    downgrades,
    rejectedDebugSurfaces: hostPacket.rejectedDebugSurfaces
  };
}

function buildHostPayload(hostPacket: GloveWellHostPacket, liveUrl: string | null): GloveWellSmokeBenchHostPayload {
  return {
    schema: GLOVE_WELL_HOST_PACKET_SCHEMA,
    route: GLOVE_WELL_HOST_PACKET_ROUTE,
    liveUrl,
    hostId: 'glove-well',
    requestedAdapter: 'glove-well',
    sourceTruthAuthority: hostPacket.source.sourceTruthAuthority,
    coordinateFrame: hostPacket.coordinateFrame,
    primitiveCount: hostPacket.surface.primitives.length,
    requiredPrimitiveRoles: [...hostPacket.surface.witnessExpectations.requiredPrimitiveRoles],
    capture: hostPacket.capture
  };
}

function primitiveRoleCounts(hostPacket: GloveWellHostPacket): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const primitive of hostPacket.surface.primitives) {
    counts[primitive.role] = (counts[primitive.role] ?? 0) + 1;
  }
  return counts;
}

function buildScreenshotMetadata(hostPacket: GloveWellHostPacket): GloveWellSmokeBenchOfferReport['screenshot'] {
  if (hostPacket.capture.filmstripPath && existsSync(hostPacket.capture.filmstripPath)) {
    return {
      path: hostPacket.capture.filmstripPath,
      kind: 'filmstrip_html_supporting_artifact',
      bytes: null
    };
  }
  if (hostPacket.capture.reportPath && existsSync(hostPacket.capture.reportPath)) {
    return {
      path: hostPacket.capture.reportPath,
      kind: 'capture_report_supporting_artifact',
      bytes: null
    };
  }
  return {
    path: null,
    kind: 'missing_supporting_artifact',
    bytes: null
  };
}

function buildStateStream(
  hostPacket: GloveWellHostPacket,
  url: string | null,
  extractionBoundaryRef: string | null
): GloveWellSmokeBenchStateStream {
  return {
    schema: 'perceptasia.hand-control.v0',
    compatTargetSchema: 'hand-state.frame.v0',
    url,
    transitional: true,
    depthLoadBearing: false,
    effectiveRoute: hostPacket.source.effectiveRoute ?? 'native_wilor_mini_mlx_detector_sidecar_live',
    freshnessBudgetMs: 180,
    extractionBoundaryRef,
    downgrade: 'hand_state_runtime_not_extracted'
  };
}

function buildArtifacts(hostPacket: GloveWellHostPacket): Array<{ id: string; kind: string; ref: string }> {
  return [
    hostPacket.capture.reportPath ? { id: 'browser-capture-report', kind: 'capture_report', ref: hostPacket.capture.reportPath } : null,
    hostPacket.capture.filmstripPath ? { id: 'browser-capture-filmstrip', kind: 'filmstrip', ref: hostPacket.capture.filmstripPath } : null,
    { id: 'host-surface-schema', kind: 'source_schema', ref: 'lerms.glove-well-host-surface.v0' }
  ].filter((artifact): artifact is { id: string; kind: string; ref: string } => artifact !== null);
}

function buildRejectedAcceptanceSurfaces(hostPacket: GloveWellHostPacket): GloveWellSmokeBenchOfferReport['rejectedAcceptanceSurfaces'] {
  return uniqueStrings([
    ...hostPacket.rejectedDebugSurfaces.map((surface) => surface.surface),
    'link_out_or_popout',
    'preview_bench_offer_card',
    'screenshot_only'
  ]).map((surface) => ({
    surface,
    acceptanceSurface: false,
    reason: rejectedReason(surface)
  }));
}

function handAuthority(hostPacket: GloveWellHostPacket): GloveWellSmokeBenchOfferReport['sourceTruth']['handInputAuthority'] {
  if (hostPacket.source.authority === 'live_simulation') return 'transitional_live_bridge';
  if (hostPacket.source.authority === 'synthetic_fixture') return 'fixture_bridge';
  return 'unknown';
}

function rejectedReason(surface: string): string {
  if (surface === 'link_out_or_popout') return 'escape hatch only; Smoke Bench acceptance must happen inside Kaminos-controlled host display';
  if (surface === 'preview_bench_offer_card') return 'inventory card only; it cannot substitute for the declared primary target';
  if (surface === 'screenshot_only') return 'visual artifact can support a witness but is not live host acceptance';
  if (surface === 'local_lerms_browser_smoke') return 'useful transitional smoke, but not the native Kaminos adapter surface';
  return 'debug or support surface only; not primary Smoke Bench acceptance';
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    help: false,
    report: null,
    conformanceFixture: null,
    generatedAt: null,
    sourceRef: null,
    liveHostPayloadUrl: null,
    kaminosHostUrl: null,
    transitionalHandEventUrl: null,
    handStateRuntimeReport: null
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--report') {
      options.report = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--conformance-fixture') {
      options.conformanceFixture = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--generated-at') {
      options.generatedAt = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--source-ref') {
      options.sourceRef = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--live-host-payload-url') {
      options.liveHostPayloadUrl = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--kaminos-host-url') {
      options.kaminosHostUrl = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--hand-event-url') {
      options.transitionalHandEventUrl = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--hand-state-runtime-report') {
      options.handStateRuntimeReport = requiredValue(arg, next);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function requiredValue(flag: string, value: string | undefined): string {
  if (!value || value.startsWith('--')) throw new Error(`missing value for ${flag}`);
  return value;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function usage(): string {
  return [
    'Usage: npm run witness:glove-well-smoke-bench-offer -- [options]',
    '',
    'Options:',
    '  --report <path>                    JSON offer report path (default: /tmp/lerms-glove-well-smoke-bench-offer-0704.json)',
    '  --conformance-fixture <path>       JSON fixture path for Kaminos smoke-bench-native-host-witness.mjs',
    '  --live-host-payload-url <url>       LERMS Glove Well hostPayload live URL',
    '  --kaminos-host-url <url>            Kaminos Glove Well host surface URL',
    '  --hand-event-url <url>              Transitional hand-control event stream URL',
    '  --hand-state-runtime-report <path>  Palm hand-state runtime extraction boundary report',
    '  --source-ref <ref>                  Source reference for the offer',
    '  --generated-at <iso>                Generated timestamp override'
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = runGloveWellSmokeBenchOfferCli();
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      schema: GLOVE_WELL_SMOKE_BENCH_OFFER_SCHEMA,
      route: GLOVE_WELL_SMOKE_BENCH_OFFER_ROUTE,
      phase: 'building-glove-well-smoke-bench-offer',
      error: error instanceof Error ? error.message : String(error)
    }, null, 2));
    process.exitCode = 1;
  }
}
