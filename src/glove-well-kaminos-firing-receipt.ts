import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import {
  GLOVE_WELL_HOST_PACKET_ROUTE,
  GLOVE_WELL_HOST_PACKET_SCHEMA,
  buildFixtureGloveWellHostPacket
} from './glove-well-host-packet.ts';
import type { GloveWellHostPacket } from './glove-well-browser-smoke-state.ts';
import {
  GLOVE_WELL_SMOKE_BENCH_OFFER_ROUTE,
  GLOVE_WELL_SMOKE_BENCH_OFFER_SCHEMA,
  buildGloveWellSmokeBenchOffer,
  type GloveWellSmokeBenchOfferReport
} from './glove-well-smoke-bench-offer.ts';

export const GLOVE_WELL_KAMINOS_FIRING_RECEIPT_SCHEMA = 'lerms.glove-well-kaminos-firing-receipt.v0' as const;
export const GLOVE_WELL_KAMINOS_FIRING_RECEIPT_ROUTE = 'lerms/glove-well/kaminos-firing-receipt-file' as const;

const KAMINOS_FORGE_HOST_RECEIPT_SCHEMA = 'kaminos.forge-host.smoke-receipt.v0' as const;
const DEFAULT_REPORT_PATH = '/tmp/lerms-glove-well-kaminos-firing-receipt-0706.json';
const DEFAULT_LIVE_HOST_PAYLOAD_URL = 'http://127.0.0.1:5176/__lerms/glove-well-host-packet/live';
const DEFAULT_OPERATOR_ROUTE =
  'http://127.0.0.1:18156/?kaminos_forge_host=live&world_chamber=lerms-underhill&world_cartridge=lerms-terrarium&world_crucible=glove-emitter&forge_host_smoke_offer=glove-emitter-native-host-smoke-offer';
const DEFAULT_HAND_EVENT_URL = 'http://127.0.0.1:8096/hand-control-sidecar-event';

type ReceiptStatus = 'captured' | 'missing';

export interface KaminosForgeHostSmokeReceipt {
  schema: string;
  receiptId?: string;
  capturedAt?: string;
  sourceOffer?: {
    id?: string;
    sourceRef?: string;
    authority?: string;
    freshness?: string;
    displayState?: string;
    targetSurface?: string;
    targetUrl?: string;
  };
  smokeChamber?: {
    schema?: string;
    routeKind?: string;
    inlineHost?: {
      kind?: string;
      reason?: string;
      recursive?: boolean;
      effectiveUrl?: string;
    };
  };
  currentRoute?: string;
  capture?: {
    kind?: string;
    scope?: string;
    screenshotBytes?: number;
    path?: string;
  };
  downgrades?: string[];
}

export interface BuildGloveWellKaminosFiringReceiptOptions {
  outputPath: string;
  generatedAt?: string | null;
  frameId?: string | null;
  sourcePacket: GloveWellHostPacket;
  smokeBenchOffer: GloveWellSmokeBenchOfferReport;
  kaminosReceipt?: KaminosForgeHostSmokeReceipt | null;
  kaminosReceiptPath?: string | null;
  operatorRoute?: string | null;
}

export interface BuildFixtureGloveWellKaminosFiringReceiptOptions {
  outputPath: string;
  generatedAt?: string | null;
  frameId?: string | null;
  kaminosReceipt?: KaminosForgeHostSmokeReceipt | null;
  kaminosReceiptPath?: string | null;
  operatorRoute?: string | null;
  liveHostPayloadUrl?: string | null;
  handEventUrl?: string | null;
}

export interface GloveWellKaminosFiringReceiptReport {
  ok: true;
  schema: typeof GLOVE_WELL_KAMINOS_FIRING_RECEIPT_SCHEMA;
  route: typeof GLOVE_WELL_KAMINOS_FIRING_RECEIPT_ROUTE;
  generatedAt: string;
  outputPath: string;
  frameId: string;
  pipeline: {
    schema: 'lerms.glove-well-kaminos-pipeline.v0';
    primarySmokePath: {
      kind: 'kaminos_forge_host_smoke_workbench';
      operatorRoute: string;
      routeQuery: string;
      entry: 'world-cartridges-to-smoke-workbench-to-forge-host-route-card';
      acceptanceOwner: 'kaminos';
    };
    sourcePacket: {
      schema: typeof GLOVE_WELL_HOST_PACKET_SCHEMA;
      route: typeof GLOVE_WELL_HOST_PACKET_ROUTE;
      authority: GloveWellHostPacket['source']['authority'];
      freshness: GloveWellHostPacket['freshness']['status'];
      sourceTruthAuthority: GloveWellHostPacket['source']['sourceTruthAuthority'];
      primitiveCount: number;
      requiredPrimitiveRoles: string[];
    };
    smokeBenchOffer: {
      schema: typeof GLOVE_WELL_SMOKE_BENCH_OFFER_SCHEMA;
      route: typeof GLOVE_WELL_SMOKE_BENCH_OFFER_ROUTE;
      offerId: GloveWellSmokeBenchOfferReport['smokeBench']['id'];
      primaryTargetKind: GloveWellSmokeBenchOfferReport['smokeBench']['primaryTarget']['kind'];
      acceptanceSurface: GloveWellSmokeBenchOfferReport['minionContract']['acceptanceSurface'];
    };
    workbenchBinding: GloveWellHostPacket['workbenchBinding'];
    firing: {
      outputClass: 'firing_receipt';
      sourceRole: 'glove-well-source';
      receiptSchema: typeof KAMINOS_FORGE_HOST_RECEIPT_SCHEMA;
      receiptRequiredOfferId: 'glove-emitter-native-host-smoke-offer';
      graduationMode: GloveWellHostPacket['workbenchBinding']['receipt']['graduationMode'];
      visualAcceptance: GloveWellHostPacket['workbenchBinding']['receipt']['visualAcceptance'];
      frameId: string;
    };
  };
  kaminosReceipt: {
    status: ReceiptStatus;
    receiptPath: string | null;
    receiptId: string | null;
    capturedAt: string | null;
    offerId: string | null;
    sourceRef: string | null;
    sourceAuthority: string | null;
    freshness: string | null;
    displayState: string | null;
    targetSurface: string | null;
    targetUrl: string | null;
    currentRoute: string | null;
    inlineHost: {
      kind: string | null;
      reason: string | null;
      recursive: boolean | null;
      effectiveUrl: string | null;
    };
    capture: {
      kind: string | null;
      scope: string | null;
      screenshotBytes: number | null;
      path: string | null;
    };
  };
  sourceTruth: {
    effectiveAuthority: 'route_witness' | 'synthetic_fixture';
    hostPayloadAuthority: GloveWellHostPacket['source']['authority'];
    receiptAuthority: 'forge_host_visual_receipt_only' | 'missing';
    receiptFreshness: ReceiptStatus;
    kaminosAcceptance: false;
    liveGloveWellAuthority: false;
    debugSurfacesAccepted: false;
    depthLoadBearing: false;
    downgrades: string[];
  };
  debugSurfacePosture: {
    primary: {
      path: 'kaminos_forge_host_smoke_workbench';
      operatorRoute: string;
      acceptanceOwner: 'kaminos';
    };
    rejectedAcceptanceSurfaces: Array<{
      surface: string;
      acceptanceSurface: false;
      reason: string;
    }>;
  };
  custody: {
    greedyOwns: string[];
    kaminosOwns: string[];
    palmOwns: string[];
    minionOwns: string[];
  };
  whatRemainsFake: {
    nativeKaminosHostAcceptance: true;
    fullVerticalSuccess: true;
    liveWilorSidecarEvidence: boolean;
    sharedHandRuntimeExtraction: true;
    finalGoinMesh: true;
  };
}

interface CliOptions {
  help: boolean;
  report: string | null;
  kaminosReceipt: string | null;
  operatorRoute: string | null;
  generatedAt: string | null;
  frameId: string | null;
  liveHostPayloadUrl: string | null;
  handEventUrl: string | null;
}

export function buildFixtureGloveWellKaminosFiringReceipt(
  options: BuildFixtureGloveWellKaminosFiringReceiptOptions
): GloveWellKaminosFiringReceiptReport {
  const operatorRoute = options.operatorRoute ?? DEFAULT_OPERATOR_ROUTE;
  const liveHostPayloadUrl = options.liveHostPayloadUrl ?? DEFAULT_LIVE_HOST_PAYLOAD_URL;
  const handEventUrl = options.handEventUrl ?? DEFAULT_HAND_EVENT_URL;
  const sourcePacket = buildFixtureGloveWellHostPacket({
    sourceUrl: liveHostPayloadUrl,
    capture: {
      state: 'complete',
      reportPath: '/tmp/lerms-glove-well-browser-smoke-capture-live/report.json',
      filmstripPath: '/tmp/lerms-glove-well-browser-smoke-capture-live/filmstrip.html'
    }
  });
  const smokeBenchOffer = buildGloveWellSmokeBenchOffer(sourcePacket, {
    generatedAt: options.generatedAt,
    liveHostPayloadUrl,
    kaminosHostUrl: operatorRoute,
    transitionalHandEventUrl: handEventUrl
  });
  return buildGloveWellKaminosFiringReceipt({
    outputPath: options.outputPath,
    generatedAt: options.generatedAt,
    frameId: options.frameId,
    sourcePacket,
    smokeBenchOffer,
    kaminosReceipt: options.kaminosReceipt,
    kaminosReceiptPath: options.kaminosReceiptPath,
    operatorRoute
  });
}

export function buildGloveWellKaminosFiringReceipt(
  options: BuildGloveWellKaminosFiringReceiptOptions
): GloveWellKaminosFiringReceiptReport {
  assertHostPacket(options.sourcePacket);
  assertSmokeBenchOffer(options.smokeBenchOffer);

  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const frameId = options.frameId ?? 'glove-well-kaminos-firing-receipt';
  const binding = options.sourcePacket.workbenchBinding;
  const operatorRoute = options.operatorRoute ?? options.smokeBenchOffer.smokeBench.primaryTarget.url ?? DEFAULT_OPERATOR_ROUTE;
  const receiptSummary = summarizeReceipt(options.kaminosReceipt ?? null, options.kaminosReceiptPath ?? null, binding);
  const receiptCaptured = receiptSummary.status === 'captured';
  const downgrades = uniqueStrings([
    ...options.sourcePacket.downgrades,
    ...options.smokeBenchOffer.smokeBench.downgrades,
    ...binding.downgrades,
    ...(options.kaminosReceipt?.downgrades ?? []),
    'kaminos_offer_authority_gap_report_route',
    'perceptasia_debug_surface_not_primary_smoke_path',
    'local_lerms_browser_smoke_not_primary_smoke_path',
    'native_kaminos_host_not_verified',
    'forge_host_receipt_not_source_truth',
    ...(receiptCaptured ? ['kaminos_forge_host_receipt_visual_only'] : ['kaminos_forge_host_receipt_missing'])
  ]);

  return {
    ok: true,
    schema: GLOVE_WELL_KAMINOS_FIRING_RECEIPT_SCHEMA,
    route: GLOVE_WELL_KAMINOS_FIRING_RECEIPT_ROUTE,
    generatedAt,
    outputPath: options.outputPath,
    frameId,
    pipeline: {
      schema: 'lerms.glove-well-kaminos-pipeline.v0',
      primarySmokePath: {
        kind: 'kaminos_forge_host_smoke_workbench',
        operatorRoute,
        routeQuery: binding.kaminos.operatorRouteQuery,
        entry: 'world-cartridges-to-smoke-workbench-to-forge-host-route-card',
        acceptanceOwner: 'kaminos'
      },
      sourcePacket: {
        schema: options.sourcePacket.schema,
        route: options.sourcePacket.route,
        authority: options.sourcePacket.source.authority,
        freshness: options.sourcePacket.freshness.status,
        sourceTruthAuthority: options.sourcePacket.source.sourceTruthAuthority,
        primitiveCount: options.sourcePacket.surface.primitives.length,
        requiredPrimitiveRoles: [...options.sourcePacket.surface.witnessExpectations.requiredPrimitiveRoles]
      },
      smokeBenchOffer: {
        schema: options.smokeBenchOffer.schema,
        route: options.smokeBenchOffer.route,
        offerId: options.smokeBenchOffer.smokeBench.id,
        primaryTargetKind: options.smokeBenchOffer.smokeBench.primaryTarget.kind,
        acceptanceSurface: options.smokeBenchOffer.minionContract.acceptanceSurface
      },
      workbenchBinding: binding,
      firing: {
        outputClass: 'firing_receipt',
        sourceRole: 'glove-well-source',
        receiptSchema: KAMINOS_FORGE_HOST_RECEIPT_SCHEMA,
        receiptRequiredOfferId: binding.receipt.requiredOfferId,
        graduationMode: binding.receipt.graduationMode,
        visualAcceptance: binding.receipt.visualAcceptance,
        frameId
      }
    },
    kaminosReceipt: receiptSummary,
    sourceTruth: {
      effectiveAuthority: receiptCaptured ? 'route_witness' : 'synthetic_fixture',
      hostPayloadAuthority: options.sourcePacket.source.authority,
      receiptAuthority: receiptCaptured ? 'forge_host_visual_receipt_only' : 'missing',
      receiptFreshness: receiptSummary.status,
      kaminosAcceptance: false,
      liveGloveWellAuthority: false,
      debugSurfacesAccepted: false,
      depthLoadBearing: false,
      downgrades
    },
    debugSurfacePosture: {
      primary: {
        path: 'kaminos_forge_host_smoke_workbench',
        operatorRoute,
        acceptanceOwner: 'kaminos'
      },
      rejectedAcceptanceSurfaces: rejectedAcceptanceSurfaces(options.sourcePacket, options.smokeBenchOffer)
    },
    custody: {
      greedyOwns: [
        'glove-well host packet',
        'goin throwing source primitives',
        'firing receipt witness shape',
        'debug-surface rejection posture'
      ],
      kaminosOwns: ['Forge Host chamber display', 'native adapter acceptance', 'smoke receipt production'],
      palmOwns: ['WiLoR source route truth', 'neutral hand-state extraction', 'first vertical source-truth gate'],
      minionOwns: ['world cartridge Smoke Workbench route predicates', 'Forge Host offer/receipt route semantics']
    },
    whatRemainsFake: {
      nativeKaminosHostAcceptance: true,
      fullVerticalSuccess: true,
      liveWilorSidecarEvidence: options.sourcePacket.source.authority !== 'live_simulation',
      sharedHandRuntimeExtraction: true,
      finalGoinMesh: true
    }
  };
}

export function runGloveWellKaminosFiringReceiptCli(argv = process.argv.slice(2)): number {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage());
    return 0;
  }
  const reportPath = options.report ?? DEFAULT_REPORT_PATH;
  const operatorRoute = options.operatorRoute ?? DEFAULT_OPERATOR_ROUTE;
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  try {
    const kaminosReceipt = options.kaminosReceipt ? readJson(options.kaminosReceipt) as KaminosForgeHostSmokeReceipt : null;
    const report = buildFixtureGloveWellKaminosFiringReceipt({
      outputPath: reportPath,
      generatedAt,
      frameId: options.frameId,
      kaminosReceipt,
      kaminosReceiptPath: options.kaminosReceipt,
      operatorRoute,
      liveHostPayloadUrl: options.liveHostPayloadUrl,
      handEventUrl: options.handEventUrl
    });
    writeJson(reportPath, report);
    console.log(JSON.stringify({
      ok: true,
      schema: GLOVE_WELL_KAMINOS_FIRING_RECEIPT_SCHEMA,
      route: GLOVE_WELL_KAMINOS_FIRING_RECEIPT_ROUTE,
      reportPath,
      kaminosReceiptStatus: report.kaminosReceipt.status,
      kaminosAcceptance: report.sourceTruth.kaminosAcceptance,
      debugSurfacesAccepted: report.sourceTruth.debugSurfacesAccepted,
      downgrades: report.sourceTruth.downgrades
    }, null, 2));
    return 0;
  } catch (error) {
    const failure = {
      ok: false,
      schema: GLOVE_WELL_KAMINOS_FIRING_RECEIPT_SCHEMA,
      route: GLOVE_WELL_KAMINOS_FIRING_RECEIPT_ROUTE,
      phase: 'building-glove-well-kaminos-firing-receipt',
      failureKind: 'glove-well-kaminos-firing-receipt-invalid',
      error: error instanceof Error ? error.message : String(error),
      lastTrustworthyEvidence: {
        outputPath: reportPath,
        kaminosReceiptPath: options.kaminosReceipt,
        operatorRoute,
        frameId: options.frameId,
        generatedAt
      }
    };
    writeJson(reportPath, failure);
    console.error(JSON.stringify(failure, null, 2));
    return 1;
  }
}

function assertHostPacket(packet: GloveWellHostPacket): void {
  if (packet.schema !== GLOVE_WELL_HOST_PACKET_SCHEMA) {
    throw new Error(`Kaminos firing receipt expected ${GLOVE_WELL_HOST_PACKET_SCHEMA}`);
  }
  if (packet.route !== GLOVE_WELL_HOST_PACKET_ROUTE) {
    throw new Error(`Kaminos firing receipt expected ${GLOVE_WELL_HOST_PACKET_ROUTE}`);
  }
  if (packet.hostCandidate.hostId !== 'glove-well') {
    throw new Error('Kaminos firing receipt expected glove-well host candidate');
  }
}

function assertSmokeBenchOffer(offer: GloveWellSmokeBenchOfferReport): void {
  if (offer.schema !== GLOVE_WELL_SMOKE_BENCH_OFFER_SCHEMA) {
    throw new Error(`Kaminos firing receipt expected ${GLOVE_WELL_SMOKE_BENCH_OFFER_SCHEMA}`);
  }
  if (offer.route !== GLOVE_WELL_SMOKE_BENCH_OFFER_ROUTE) {
    throw new Error(`Kaminos firing receipt expected ${GLOVE_WELL_SMOKE_BENCH_OFFER_ROUTE}`);
  }
}

function summarizeReceipt(
  receipt: KaminosForgeHostSmokeReceipt | null,
  receiptPath: string | null,
  binding: GloveWellHostPacket['workbenchBinding']
): GloveWellKaminosFiringReceiptReport['kaminosReceipt'] {
  if (!receipt) {
    return {
      status: 'missing',
      receiptPath: null,
      receiptId: null,
      capturedAt: null,
      offerId: null,
      sourceRef: null,
      sourceAuthority: null,
      freshness: null,
      displayState: null,
      targetSurface: null,
      targetUrl: null,
      currentRoute: null,
      inlineHost: {
        kind: null,
        reason: null,
        recursive: null,
        effectiveUrl: null
      },
      capture: {
        kind: null,
        scope: null,
        screenshotBytes: null,
        path: null
      }
    };
  }
  if (receipt.schema !== KAMINOS_FORGE_HOST_RECEIPT_SCHEMA) {
    throw new Error(`Kaminos firing receipt expected ${KAMINOS_FORGE_HOST_RECEIPT_SCHEMA}`);
  }
  const offerId = receipt.sourceOffer?.id ?? null;
  if (offerId !== binding.receipt.requiredOfferId) {
    throw new Error(`Kaminos firing receipt receipt offer id ${offerId ?? '<missing>'} did not match ${binding.receipt.requiredOfferId}`);
  }
  return {
    status: 'captured',
    receiptPath,
    receiptId: receipt.receiptId ?? null,
    capturedAt: receipt.capturedAt ?? null,
    offerId,
    sourceRef: receipt.sourceOffer?.sourceRef ?? null,
    sourceAuthority: receipt.sourceOffer?.authority ?? null,
    freshness: receipt.sourceOffer?.freshness ?? null,
    displayState: receipt.sourceOffer?.displayState ?? null,
    targetSurface: receipt.sourceOffer?.targetSurface ?? null,
    targetUrl: receipt.sourceOffer?.targetUrl ?? null,
    currentRoute: receipt.currentRoute ?? null,
    inlineHost: {
      kind: receipt.smokeChamber?.inlineHost?.kind ?? null,
      reason: receipt.smokeChamber?.inlineHost?.reason ?? null,
      recursive: receipt.smokeChamber?.inlineHost?.recursive ?? null,
      effectiveUrl: receipt.smokeChamber?.inlineHost?.effectiveUrl ?? null
    },
    capture: {
      kind: receipt.capture?.kind ?? null,
      scope: receipt.capture?.scope ?? null,
      screenshotBytes: receipt.capture?.screenshotBytes ?? null,
      path: receipt.capture?.path ?? null
    }
  };
}

function rejectedAcceptanceSurfaces(
  sourcePacket: GloveWellHostPacket,
  smokeBenchOffer: GloveWellSmokeBenchOfferReport
): GloveWellKaminosFiringReceiptReport['debugSurfacePosture']['rejectedAcceptanceSurfaces'] {
  const rejected = [
    ...sourcePacket.rejectedDebugSurfaces,
    ...smokeBenchOffer.rejectedAcceptanceSurfaces,
    {
      surface: 'perceptasia_live_hand_frame',
      acceptanceSurface: false as const,
      reason: 'live hand tracking support route only; cannot stand in for Kaminos Forge Host receipt acceptance'
    },
    {
      surface: 'local_lerms_browser_smoke',
      acceptanceSurface: false as const,
      reason: 'source-owned development smoke only; primary operator path is the Kaminos Forge Host Smoke Workbench route'
    },
    {
      surface: 'screenshot_only',
      acceptanceSurface: false as const,
      reason: 'screenshot is supporting evidence only and cannot claim live route acceptance'
    },
    {
      surface: 'link_out_or_popout',
      acceptanceSurface: false as const,
      reason: 'escape hatch only; the receipt must come from the route-card chamber path'
    }
  ];
  const seen = new Set<string>();
  return rejected.filter((surface) => {
    if (seen.has(surface.surface)) return false;
    seen.add(surface.surface);
    return true;
  }).map((surface) => ({
    surface: surface.surface,
    acceptanceSurface: false,
    reason: surface.reason
  }));
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    help: false,
    report: null,
    kaminosReceipt: null,
    operatorRoute: null,
    generatedAt: null,
    frameId: null,
    liveHostPayloadUrl: null,
    handEventUrl: null
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--report') {
      options.report = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--kaminos-receipt') {
      options.kaminosReceipt = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--operator-route') {
      options.operatorRoute = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--generated-at') {
      options.generatedAt = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--frame-id') {
      options.frameId = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--live-host-payload-url') {
      options.liveHostPayloadUrl = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--hand-event-url') {
      options.handEventUrl = requiredValue(arg, next);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
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
    'Usage: npm run witness:glove-well-kaminos-firing-receipt -- [options]',
    '',
    'Options:',
    `  --report <path>                 JSON report path (default: ${DEFAULT_REPORT_PATH})`,
    '  --kaminos-receipt <path>        Optional Kaminos forge-host smoke receipt JSON',
    '  --operator-route <url>          Kaminos Smoke Workbench operator route under test',
    '  --live-host-payload-url <url>   LERMS Glove Well host packet live URL',
    '  --hand-event-url <url>          Transitional hand-control event stream URL',
    '  --frame-id <id>                 Receipt frame id',
    '  --generated-at <iso>            Generated timestamp override'
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = runGloveWellKaminosFiringReceiptCli();
}
