import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LERM_HORDE_MOVING_LERM_HILL_REVISION,
  LERM_HORDE_MOVING_LERM_ON_HILL_SCHEMA,
  LERM_HORDE_VISIBLE_BODY_ASSET_IDENTITY,
  LERM_HORDE_VISIBLE_BODY_SCHEMA,
  LERM_HORDE_VISIBLE_BODY_SCHEMA_IDENTITY,
  composeMovingLermOnHill,
  type MovingLermOnHillComposition,
  type MovingLermOnHillInput,
} from './lerm-horde-moving-lerm-on-hill.ts';
import type { Vec3 } from './contracts/first-vertical.ts';
import {
  RED_LERM_BODY_CANDIDATE_SCHEMA,
  RED_LERM_PROCEDURAL_SHAPE_SCHEMA,
  RED_LERM_PROCEDURAL_SQUASH_THIEF_SHAPE,
  buildRedLermBodyBakeoff,
  type RedLermBodyCandidate,
} from './red-lerm-body-candidates.ts';

export const CED6DB3D_PRODUCER_REVISION =
  'ced6db3d2ed3325ae86f781ab9d7d565dc6d5f58' as const;
export const REJECTED_FITTED_CONTACT_REVISION =
  '5b75e16d1952b25d8fbc41f6b16a3877c4f0411d' as const;
export const STABLE_RAIL_VISUAL_WITNESS_SCHEMA =
  'lerms.lerm-horde.stable-rail-visual-witness.v0' as const;

const PRODUCER_HISTORY_RECEIPT_SCHEMA =
  'lerms.lerm-horde.producer-history-composition-receipt.v0' as const;
const PRODUCER_MODULE_PATH = 'motion-ready-719024-core.js';
const REGISTRATION_PATH = 'artifacts/motion-ready-719024/registration.json';
const REGISTRATION_SCHEMA = 'kaminos.axial-crawler-registration.v0';
const RAIL_SCHEMA = 'kaminos.creature-scale-locomotion-rail.v0';
const SUPPORT_SCHEMA = 'kaminos.axial-terrain-support-envelope.v0';
const REVIEWED_RECEIPT_PATH = 'artifacts/lerm-horde-producer-history/receipt.json';
const REVIEWED_RECEIPT_SHA256 =
  'c56627554f5cacb8f151361419bfe70177e2d86490193e30b2f148a11b430b2e';
const REVIEWED_RECEIPT_GIT_BLOB = 'c172578aa6663bb82a5e2d9cc0ab273f9f9d0279';
const REVIEWED_RECEIPT_SOURCE_REVISION =
  '1014904b64c8e2adef257bafc0a2489cab0e56a1';
const VISIBLE_BODY_PATH = 'src/red-lerm-body-candidates.ts';
const REVIEWED_VISIBLE_BODY_SHA256 =
  'df52b476836a386bc87270536d4bc39e53dc2b73ad2b13b721e3e73de6915c6b';
const WIDTH = 1280;
const HEIGHT = 720;
const COLUMNS = 3;
const ROWS = 2;
const PANEL_WIDTH = WIDTH / COLUMNS;
const PANEL_HEIGHT = HEIGHT / ROWS;
const RENDERED_SAMPLE_SEQUENCES = [0, 3, 6, 9, 12, 14] as const;

type Rgb = readonly [number, number, number];

const BACKGROUND: Rgb = [8, 12, 11];
const PANEL_BACKGROUND: Rgb = [15, 24, 20];
const PANEL_BORDER: Rgb = [39, 61, 49];
const RAIL: Rgb = [94, 180, 126];
const RAIL_SHADOW: Rgb = [27, 66, 48];
const RED_BODY: Rgb = [221, 42, 54];
const DARK_RED: Rgb = [123, 17, 31];
const LEG: Rgb = [169, 29, 43];
const ATTENTION: Rgb = [239, 197, 76];
const HEADING: Rgb = [103, 185, 237];
const PROGRESS: Rgb = [225, 232, 214];

interface ProducerHistorySample {
  sequence: number;
  timestampMs: number;
  root: {
    worldPosition: Vec3;
    sourceDistance: number;
    routeProgress: number;
    tangent: Vec3;
    attention: {
      direction: Vec3;
      authority: string;
    };
    support?: {
      schema: string;
      disposition: string;
      provenance: {
        revision: string;
      };
    };
  };
}

interface ProducerHistoryReceipt {
  schema: string;
  ok: boolean;
  phase: string;
  fallbackStatus: string;
  staleStatus: string;
  partialStatus: string;
  lerms: {
    revision: string;
    hillBaseRevision: string;
  };
  producer: {
    revision: string;
    moduleSha256: string;
    creatureId: string;
    bodyRevision: string;
    railId: string;
    railSchema: string;
    supportSchema: string;
  };
  route: string;
  historySummary: {
    orderedSampleCount: number;
    stanceContactCount: number;
  };
  history: {
    hill: {
      sourceId: string;
      sampleChecksum: string;
      topologyChecksum: string;
    };
    producer: {
      revision: string;
      route: string;
    };
    samples: ProducerHistorySample[];
  };
  sourceIdentity: {
    effective: {
      producerRepoRoot: string;
    };
  };
}

export interface StableRailVerifiedInputs {
  receiptPath: string;
  receiptSha256: string;
  receiptGitBlob: string;
  dirtyReceiptInput: string;
  producerRoot: string;
  producerRevision: string;
  producerModulePath: string;
  producerModuleSha256: string;
  registrationPath: string;
  registrationSha256: string;
  dirtyProducerInputs: string;
  bodyPath: string;
  bodySha256: string;
  bodyGitBlob: string;
  bodySourceRevision: string;
  dirtyBodyInput: string;
}

interface StableRailVisualWitnessInput {
  receipt: ProducerHistoryReceipt;
  verifiedInputs: StableRailVerifiedInputs;
  imagePath: string;
}

interface RenderMetrics {
  nonBackgroundPixelCount: number;
  redBodyPixelCount: number;
  railPixelCount: number;
  attentionPixelCount: number;
  headingPixelCount: number;
}

interface StableRailVisualWitnessReport {
  ok: true;
  schema: typeof STABLE_RAIL_VISUAL_WITNESS_SCHEMA;
  phase: 'complete';
  visualStatus: 'rendered_uninspected';
  imagePath: string;
  width: number;
  height: number;
  route: {
    requested: string;
    effective: string;
    fallbackStatus: 'none';
    staleStatus: 'fresh';
    partialStatus: 'complete-root-only';
  };
  receipt: {
    path: string;
    sha256: string;
    gitBlob: string;
    dirtyInput: string;
    sourceRevision: string;
  };
  producer: {
    revision: typeof CED6DB3D_PRODUCER_REVISION;
    modulePath: string;
    moduleSha256: string;
    registrationPath: string;
    registrationSha256: string;
    driverRole: 'producer-control-non-lerm';
  };
  visibleBody: {
    assetIdentity: typeof LERM_HORDE_VISIBLE_BODY_ASSET_IDENTITY;
    schemaIdentity: typeof LERM_HORDE_VISIBLE_BODY_SCHEMA_IDENTITY;
    path: string;
    sha256: string;
    gitBlob: string;
    sourceRevision: string;
    dirtyInput: string;
    candidateId: 'procedural-squash-thief-v0';
    candidateSchema: typeof RED_LERM_BODY_CANDIDATE_SCHEMA;
    shapeSchema: typeof RED_LERM_PROCEDURAL_SHAPE_SCHEMA;
  };
  hill: {
    targetRevision: typeof LERM_HORDE_MOVING_LERM_HILL_REVISION;
    railSamplingRevision: string;
    supportTruth: 'absent-from-composed-interface';
  };
  composition: MovingLermOnHillComposition;
  renderedSampleSequences: readonly number[];
  metrics: RenderMetrics;
  claimBoundary: {
    rootRailMotionTruth: true;
    liveCurrentHillTruth: false;
    liveContactTruth: false;
    bodyArticulationTruth: false;
    rejectedFittedContactConsumed: false;
    morphologyPortability: false;
  };
  rejectedInputs: {
    fittedContactRevision: typeof REJECTED_FITTED_CONTACT_REVISION;
    reason: string;
  };
}

interface CliArgs {
  receipt: string | null;
  producerRoot: string | null;
  report: string | null;
  image: string | null;
}

type CompleteCliArgs = { [Key in keyof CliArgs]: string };

interface StableRailWitnessRuntime {
  renderRailFilmstrip: typeof renderStableRailFilmstrip;
}

export function buildStableRailVisualWitness(
  input: StableRailVisualWitnessInput,
  runtime: StableRailWitnessRuntime = {
    renderRailFilmstrip: renderStableRailFilmstrip,
  },
): { report: StableRailVisualWitnessReport; pixels: Uint8Array } {
  validateReceiptAndInputs(input.receipt, input.verifiedInputs);

  const composition = composeMovingLermOnHill(
    buildCompositionInput(input.receipt, input.verifiedInputs),
  );
  const visibleBodyCandidate = proceduralSquashThiefCandidate();
  const { pixels, metrics } = runtime.renderRailFilmstrip(
    input.receipt.history.samples,
    RENDERED_SAMPLE_SEQUENCES,
    visibleBodyCandidate,
  );

  const route = input.receipt.history.producer.route;
  return {
    pixels,
    report: {
      ok: true,
      schema: STABLE_RAIL_VISUAL_WITNESS_SCHEMA,
      phase: 'complete',
      visualStatus: 'rendered_uninspected',
      imagePath: input.imagePath,
      width: WIDTH,
      height: HEIGHT,
      route: {
        requested: route,
        effective: route,
        fallbackStatus: 'none',
        staleStatus: 'fresh',
        partialStatus: 'complete-root-only',
      },
      receipt: {
        path: input.verifiedInputs.receiptPath,
        sha256: input.verifiedInputs.receiptSha256,
        gitBlob: input.verifiedInputs.receiptGitBlob,
        dirtyInput: input.verifiedInputs.dirtyReceiptInput,
        sourceRevision: input.receipt.lerms.revision,
      },
      producer: {
        revision: CED6DB3D_PRODUCER_REVISION,
        modulePath: input.verifiedInputs.producerModulePath,
        moduleSha256: input.verifiedInputs.producerModuleSha256,
        registrationPath: input.verifiedInputs.registrationPath,
        registrationSha256: input.verifiedInputs.registrationSha256,
        driverRole: 'producer-control-non-lerm',
      },
      visibleBody: {
        assetIdentity: LERM_HORDE_VISIBLE_BODY_ASSET_IDENTITY,
        schemaIdentity: LERM_HORDE_VISIBLE_BODY_SCHEMA_IDENTITY,
        path: input.verifiedInputs.bodyPath,
        sha256: input.verifiedInputs.bodySha256,
        gitBlob: input.verifiedInputs.bodyGitBlob,
        sourceRevision: input.verifiedInputs.bodySourceRevision,
        dirtyInput: input.verifiedInputs.dirtyBodyInput,
        candidateId: 'procedural-squash-thief-v0',
        candidateSchema: RED_LERM_BODY_CANDIDATE_SCHEMA,
        shapeSchema: RED_LERM_PROCEDURAL_SHAPE_SCHEMA,
      },
      hill: {
        targetRevision: LERM_HORDE_MOVING_LERM_HILL_REVISION,
        railSamplingRevision: input.receipt.lerms.hillBaseRevision,
        supportTruth: 'absent-from-composed-interface',
      },
      composition,
      renderedSampleSequences: [...RENDERED_SAMPLE_SEQUENCES],
      metrics,
      claimBoundary: {
        rootRailMotionTruth: true,
        liveCurrentHillTruth: false,
        liveContactTruth: false,
        bodyArticulationTruth: false,
        rejectedFittedContactConsumed: false,
        morphologyPortability: false,
      },
      rejectedInputs: {
        fittedContactRevision: REJECTED_FITTED_CONTACT_REVISION,
        reason:
          'operator rejected persistent posterior-limb flattening and continuous shear; this witness consumes only ced6db3d root-rail outputs',
      },
    },
  };
}

export function runStableRailVisualWitnessCli(
  argv = process.argv.slice(2),
  runtime: StableRailWitnessRuntime = {
    renderRailFilmstrip: renderStableRailFilmstrip,
  },
): number {
  const knownReportPath = argumentValue(argv, '--report');
  let args: CliArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    writeFailureReport(knownReportPath, {
      failurePhase: 'validate_arguments',
      message: `argument validation failed: ${errorMessage(error)}`,
      requested: requestedInputs(argv),
    });
    process.stderr.write(`argument validation failed: ${errorMessage(error)}\n`);
    return 1;
  }

  const missingArgs = [
    !args.receipt && '--receipt',
    !args.producerRoot && '--producer-root',
    !args.report && '--report',
    !args.image && '--image',
  ].filter(Boolean);
  if (missingArgs.length > 0) {
    const message = `missing required ${missingArgs.join(', ')}`;
    writeFailureReport(args.report, {
      failurePhase: 'validate_arguments',
      message: `argument validation failed: ${message}`,
      requested: requestedInputs(argv),
    });
    process.stderr.write(`${message}\n`);
    return 1;
  }

  const completeArgs = args as CompleteCliArgs;
  let failurePhase = 'validate_arguments';
  let lastTrustworthyEvidence: Record<string, unknown> | undefined;
  try {
    validatePathCustody(completeArgs);

    failurePhase = 'read_receipt';
    const receipt = JSON.parse(
      readFileSync(completeArgs.receipt, 'utf8'),
    ) as ProducerHistoryReceipt;

    failurePhase = 'verify_receipt';
    const receiptSha256 = sha256File(completeArgs.receipt);
    const receiptGitBlob = gitText(process.cwd(), [
      'hash-object',
      completeArgs.receipt,
    ]);
    const dirtyReceiptInput = gitText(process.cwd(), [
      'status',
      '--short',
      '--',
      completeArgs.receipt,
    ]);
    lastTrustworthyEvidence = {
      receipt: {
        path: completeArgs.receipt,
        sha256: receiptSha256,
        gitBlob: receiptGitBlob,
        dirtyInput: dirtyReceiptInput,
        sourceRevision: receipt.lerms?.revision,
      },
    };

    failurePhase = 'verify_producer_inputs';
    const producerModulePath = resolve(completeArgs.producerRoot, PRODUCER_MODULE_PATH);
    const registrationPath = resolve(completeArgs.producerRoot, REGISTRATION_PATH);
    const bodyPath = resolve(VISIBLE_BODY_PATH);
    const dirtyBodyInput = gitText(process.cwd(), [
      'status',
      '--short',
      '--',
      VISIBLE_BODY_PATH,
    ]);
    const producerRevision = gitText(completeArgs.producerRoot, ['rev-parse', 'HEAD']);
    const dirtyProducerInputs = gitText(completeArgs.producerRoot, [
      'status',
      '--short',
      '--',
      PRODUCER_MODULE_PATH,
      REGISTRATION_PATH,
    ]);
    const verifiedInputs: StableRailVerifiedInputs = {
      receiptPath: completeArgs.receipt,
      receiptSha256,
      receiptGitBlob,
      dirtyReceiptInput,
      producerRoot: resolve(completeArgs.producerRoot),
      producerRevision,
      producerModulePath: PRODUCER_MODULE_PATH,
      producerModuleSha256: sha256File(producerModulePath),
      registrationPath: REGISTRATION_PATH,
      registrationSha256: sha256File(registrationPath),
      dirtyProducerInputs,
      bodyPath: VISIBLE_BODY_PATH,
      bodySha256: sha256File(bodyPath),
      bodyGitBlob: gitText(process.cwd(), ['hash-object', VISIBLE_BODY_PATH]),
      bodySourceRevision: gitText(process.cwd(), [
        'log',
        '-1',
        '--format=%H',
        '--',
        VISIBLE_BODY_PATH,
      ]),
      dirtyBodyInput,
    };
    lastTrustworthyEvidence = {
      receipt: {
        path: completeArgs.receipt,
        sha256: receiptSha256,
        gitBlob: receiptGitBlob,
        dirtyInput: dirtyReceiptInput,
        sourceRevision: receipt.lerms?.revision,
      },
      producer: {
        root: resolve(completeArgs.producerRoot),
        revision: producerRevision,
        moduleSha256: verifiedInputs.producerModuleSha256,
        registrationSha256: verifiedInputs.registrationSha256,
        dirtyInputs: dirtyProducerInputs,
      },
      visibleBody: {
        path: VISIBLE_BODY_PATH,
        sha256: verifiedInputs.bodySha256,
        gitBlob: verifiedInputs.bodyGitBlob,
        sourceRevision: verifiedInputs.bodySourceRevision,
        dirtyInput: dirtyBodyInput,
      },
    };

    failurePhase = 'compose';
    const { report, pixels } = buildStableRailVisualWitness(
      {
        receipt,
        verifiedInputs,
        imagePath: completeArgs.image,
      },
      {
        renderRailFilmstrip(...renderArgs) {
          failurePhase = 'render';
          return runtime.renderRailFilmstrip(...renderArgs);
        },
      },
    );

    failurePhase = 'write_image';
    writePpm(completeArgs.image, WIDTH, HEIGHT, pixels);
    failurePhase = 'verify_image';
    verifyPpm(completeArgs.image, WIDTH, HEIGHT);
    failurePhase = 'write_report';
    writeJson(completeArgs.report, report);
    failurePhase = 'verify_final_outputs';
    verifyPpm(completeArgs.image, WIDTH, HEIGHT);
    return 0;
  } catch (error) {
    const prefix =
      failurePhase === 'verify_producer_inputs'
        ? 'producer verification failed'
        : `${failurePhase.replaceAll('_', ' ')} failed`;
    const message = `${prefix}: ${errorMessage(error)}`;
    writeFailureReport(completeArgs.report, {
      failurePhase,
      message,
      requested: {
        producerRevision: CED6DB3D_PRODUCER_REVISION,
        producerRoot: completeArgs.producerRoot,
        receiptPath: completeArgs.receipt,
        imagePath: completeArgs.image,
      },
      lastTrustworthyEvidence,
    });
    process.stderr.write(`${message}\n`);
    return 1;
  }
}

function buildCompositionInput(
  receipt: ProducerHistoryReceipt,
  verified: StableRailVerifiedInputs,
): MovingLermOnHillInput {
  const producerRoute = `kaminos/${receipt.producer.railId}`;
  const bodyRoute = 'lerms/red-lerm/procedural-squash-thief-v0';
  const completeRoute = (route: string, backend: string, configId: string) => ({
    requestedRoute: route,
    effectiveRoute: route,
    backend,
    configId,
    fallbackStatus: 'none' as const,
    staleStatus: 'fresh' as const,
    partialStatus: 'complete' as const,
  });

  return {
    schema: LERM_HORDE_MOVING_LERM_ON_HILL_SCHEMA,
    lermsRevision: LERM_HORDE_MOVING_LERM_HILL_REVISION,
    hill: {
      revision: LERM_HORDE_MOVING_LERM_HILL_REVISION,
      route: receipt.route,
      authority: 'historical_replay',
      evidenceRevision: receipt.lerms.hillBaseRevision,
      fallbackStatus: 'none',
      staleStatus: 'fresh',
      replaySchema: PRODUCER_HISTORY_RECEIPT_SCHEMA,
    },
    identity: {
      actorId: 'lerm-horde-red-rail-witness-0001',
      assetIdentity: LERM_HORDE_VISIBLE_BODY_ASSET_IDENTITY,
      speciesIdentity: 'lerms.red-lerm.v0',
      bodySchemaIdentity: LERM_HORDE_VISIBLE_BODY_SCHEMA_IDENTITY,
    },
    driver: {
      assetIdentity: `${receipt.producer.creatureId}:axial-footprint`,
      role: 'producer-control-non-lerm',
      registrationId: receipt.producer.bodyRevision,
    },
    body: {
      schema: LERM_HORDE_VISIBLE_BODY_SCHEMA,
      path: verified.bodyPath,
      sha256: verified.bodySha256,
      sourceRevision: verified.bodySourceRevision,
      routeIdentity: completeRoute(bodyRoute, 'lerms-authored-procedural', 'squash-thief-v0'),
      representationKind: 'authored_procedural',
      assetIdentity: LERM_HORDE_VISIBLE_BODY_ASSET_IDENTITY,
    },
    rig: {
      schema: REGISTRATION_SCHEMA,
      path: verified.registrationPath,
      sha256: verified.registrationSha256,
      sourceRevision: CED6DB3D_PRODUCER_REVISION,
      routeIdentity: completeRoute(producerRoute, 'kaminos-ced6db3d', receipt.producer.railId),
      assetIdentity: `${receipt.producer.creatureId}:axial-footprint`,
      registrationId: receipt.producer.bodyRevision,
    },
    support: {
      schema: SUPPORT_SCHEMA,
      path: verified.producerModulePath,
      sha256: verified.producerModuleSha256,
      sourceRevision: CED6DB3D_PRODUCER_REVISION,
      routeIdentity: completeRoute(producerRoute, 'kaminos-ced6db3d', receipt.producer.railId),
      assetIdentity: `${receipt.producer.creatureId}:axial-footprint`,
      registrationId: receipt.producer.bodyRevision,
      hillRevision: LERM_HORDE_MOVING_LERM_HILL_REVISION,
    },
    motion: {
      schema: RAIL_SCHEMA,
      path: verified.producerModulePath,
      sha256: verified.producerModuleSha256,
      sourceRevision: CED6DB3D_PRODUCER_REVISION,
      routeIdentity: completeRoute(producerRoute, 'kaminos-ced6db3d', receipt.producer.railId),
      assetIdentity: `${receipt.producer.creatureId}:axial-footprint`,
      registrationId: receipt.producer.bodyRevision,
      samples: receipt.history.samples.map((sample) => ({
        timestampMs: sample.timestampMs,
        poseSampleId: `root-rail-${sample.sequence}`,
        poseFingerprint: 'procedural-squash-thief-v0-static',
        rootWorld: sample.root.worldPosition,
        heading: sample.root.tangent,
        state: 'approaching_hoard',
      })),
    },
    behavior: {
      route: producerRoute,
      backend: 'kaminos-ced6db3d',
      configId: receipt.producer.railId,
    },
  };
}

function validateReceiptAndInputs(
  receipt: ProducerHistoryReceipt,
  verified: StableRailVerifiedInputs,
): void {
  if (
    verified.receiptPath !== REVIEWED_RECEIPT_PATH ||
    verified.receiptSha256 !== REVIEWED_RECEIPT_SHA256 ||
    verified.receiptGitBlob !== REVIEWED_RECEIPT_GIT_BLOB ||
    verified.dirtyReceiptInput !== ''
  ) {
    throw new Error('receipt identity must match the reviewed clean producer-history artifact');
  }
  if (sha256Json(receipt) !== REVIEWED_RECEIPT_SHA256) {
    throw new Error('receipt content does not match reviewed SHA-256');
  }
  if (
    receipt.schema !== PRODUCER_HISTORY_RECEIPT_SCHEMA ||
    receipt.ok !== true ||
    receipt.phase !== 'complete'
  ) {
    throw new Error('producer receipt must be a completed composition receipt');
  }
  if (receipt.lerms.revision !== REVIEWED_RECEIPT_SOURCE_REVISION) {
    throw new Error('receipt source revision does not match the reviewed producer-history run');
  }
  if (
    receipt.fallbackStatus !== 'none' ||
    receipt.staleStatus !== 'fresh' ||
    receipt.partialStatus !== 'complete-root-only'
  ) {
    throw new Error('producer receipt must be fresh, non-fallback, and complete-root-only');
  }
  if (
    verified.producerRevision !== CED6DB3D_PRODUCER_REVISION ||
    receipt.producer.revision !== CED6DB3D_PRODUCER_REVISION
  ) {
    throw new Error('producer revision must be immutable ced6db3d');
  }
  if (verified.producerModuleSha256 !== receipt.producer.moduleSha256) {
    throw new Error('producer module SHA-256 does not match reviewed receipt');
  }
  if (verified.dirtyProducerInputs !== '') {
    throw new Error('producer module or registration has uncommitted changes');
  }
  if (verified.bodyPath !== VISIBLE_BODY_PATH) {
    throw new Error(`visible body path must be ${VISIBLE_BODY_PATH}`);
  }
  if (verified.bodySha256 !== REVIEWED_VISIBLE_BODY_SHA256) {
    throw new Error('visible body SHA-256 does not match the reviewed procedural source');
  }
  if (verified.dirtyBodyInput !== '') {
    throw new Error('visible body source has uncommitted changes');
  }
  const bodySourceBytes = execFileSync(
    'git',
    ['show', `${verified.bodySourceRevision}:${verified.bodyPath}`],
    {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  if (createHash('sha256').update(bodySourceBytes).digest('hex') !== verified.bodySha256) {
    throw new Error('visible body source revision does not reproduce the reviewed bytes');
  }
  if (
    gitText(process.cwd(), [
      'rev-parse',
      `${verified.bodySourceRevision}:${verified.bodyPath}`,
    ]) !== verified.bodyGitBlob
  ) {
    throw new Error('visible body Git blob does not match its source revision');
  }
  if (resolve(verified.producerRoot) !== resolve(receipt.sourceIdentity.effective.producerRepoRoot)) {
    throw new Error('effective producer root does not match reviewed receipt');
  }
  for (const [label, hash] of [
    ['producer module', verified.producerModuleSha256],
    ['registration', verified.registrationSha256],
    ['visible body', verified.bodySha256],
  ] as const) {
    if (!/^[a-f0-9]{64}$/.test(hash)) {
      throw new Error(`${label} SHA-256 must be lowercase hexadecimal`);
    }
  }
  if (
    receipt.producer.railSchema !== RAIL_SCHEMA ||
    receipt.producer.supportSchema !== SUPPORT_SCHEMA ||
    receipt.history.producer.revision !== CED6DB3D_PRODUCER_REVISION
  ) {
    throw new Error('receipt rail/support schemas do not match the admitted ced6db3d contract');
  }
  if (
    receipt.historySummary.orderedSampleCount !== receipt.history.samples.length ||
    receipt.history.samples.length < 2
  ) {
    throw new Error('receipt sample accounting is incomplete');
  }
  if (receipt.historySummary.stanceContactCount !== 0) {
    throw new Error('root-only receipt unexpectedly declares stance contacts');
  }

  let previousTimestamp = -Infinity;
  let previousDistance = -Infinity;
  let previousProgress = -Infinity;
  receipt.history.samples.forEach((sample, index) => {
    if (sample.sequence !== index) {
      throw new Error('producer samples must have contiguous sequence identity');
    }
    if (
      sample.timestampMs <= previousTimestamp ||
      sample.root.sourceDistance <= previousDistance ||
      sample.root.routeProgress <= previousProgress
    ) {
      throw new Error('producer samples must be strictly monotonic');
    }
    assertVec3(sample.root.worldPosition, `history.samples[${index}].root.worldPosition`);
    assertVec3(sample.root.tangent, `history.samples[${index}].root.tangent`);
    assertVec3(sample.root.attention.direction, `history.samples[${index}].root.attention.direction`);
    previousTimestamp = sample.timestampMs;
    previousDistance = sample.root.sourceDistance;
    previousProgress = sample.root.routeProgress;
  });
}

function renderStableRailFilmstrip(
  samples: readonly ProducerHistorySample[],
  selectedSequences: readonly number[],
  visibleBody: RedLermBodyCandidate,
): { pixels: Uint8Array; metrics: RenderMetrics } {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 3);
  const metricsBuffer = new Uint8Array(WIDTH * HEIGHT);
  fillRect(pixels, 0, 0, WIDTH, HEIGHT, BACKGROUND);

  selectedSequences.forEach((sequence, panelIndex) => {
    const sample = samples[sequence];
    if (!sample) throw new Error(`missing rendered sample sequence ${sequence}`);
    renderPanel(pixels, metricsBuffer, samples, sample, panelIndex, visibleBody);
  });

  const metrics: RenderMetrics = {
    nonBackgroundPixelCount: 0,
    redBodyPixelCount: 0,
    railPixelCount: 0,
    attentionPixelCount: 0,
    headingPixelCount: 0,
  };
  for (const value of metricsBuffer) {
    if (value > 0) metrics.nonBackgroundPixelCount += 1;
    if (value === 1) metrics.redBodyPixelCount += 1;
    if (value === 2) metrics.railPixelCount += 1;
    if (value === 3) metrics.attentionPixelCount += 1;
    if (value === 4) metrics.headingPixelCount += 1;
  }
  return { pixels, metrics };
}

function renderPanel(
  pixels: Uint8Array,
  metrics: Uint8Array,
  allSamples: readonly ProducerHistorySample[],
  active: ProducerHistorySample,
  panelIndex: number,
  visibleBody: RedLermBodyCandidate,
): void {
  const column = panelIndex % COLUMNS;
  const row = Math.floor(panelIndex / COLUMNS);
  const left = Math.floor(column * PANEL_WIDTH);
  const top = Math.floor(row * PANEL_HEIGHT);
  const right = Math.floor(left + PANEL_WIDTH);
  const bottom = Math.floor(top + PANEL_HEIGHT);
  fillRect(pixels, left + 2, top + 2, PANEL_WIDTH - 4, PANEL_HEIGHT - 4, PANEL_BACKGROUND);
  drawRect(pixels, left, top, PANEL_WIDTH, PANEL_HEIGHT, PANEL_BORDER, 2);

  const zValues = allSamples.map((sample) => sample.root.worldPosition[2]);
  const yValues = allSamples.map((sample) => sample.root.worldPosition[1]);
  const minZ = Math.min(...zValues);
  const maxZ = Math.max(...zValues);
  const minY = Math.min(...yValues) - 0.12;
  const maxY = Math.max(...yValues) + 0.12;
  const project = (world: Vec3): readonly [number, number] => [
    Math.round(left + 82 + ((world[2] - minZ) / (maxZ - minZ)) * (PANEL_WIDTH - 164)),
    Math.round(bottom - 70 - ((world[1] - minY) / (maxY - minY)) * (PANEL_HEIGHT - 145)),
  ];

  for (let index = 1; index < allSamples.length; index += 1) {
    const [x0, y0] = project(allSamples[index - 1].root.worldPosition);
    const [x1, y1] = project(allSamples[index].root.worldPosition);
    drawLine(pixels, metrics, x0, y0 + 7, x1, y1 + 7, RAIL_SHADOW, 2, 8);
    drawLine(pixels, metrics, x0, y0, x1, y1, RAIL, 2, 5);
  }

  const [bodyX, bodyY] = project(active.root.worldPosition);
  const direction = active.root.tangent[2] >= 0 ? 1 : -1;
  const shape = visibleBody.proceduralShape;
  if (
    !shape ||
    shape !== RED_LERM_PROCEDURAL_SQUASH_THIEF_SHAPE ||
    visibleBody.id !== shape.candidateId
  ) {
    throw new Error('visible body descriptor does not match the procedural shape');
  }
  const bodyRx = Math.round(shape.silhouette.bodyRadiusX * 1.56);
  const bodyRy = Math.round(shape.silhouette.bodyRadiusY * 1.45);
  const snoutRx = Math.round(shape.silhouette.faceRadius * 1.5);
  const legThickness = Math.round(shape.feet.thickness * 1.75);
  drawLine(
    pixels,
    metrics,
    bodyX - 18,
    bodyY + 20,
    bodyX - 28,
    bodyY + 43,
    LEG,
    1,
    legThickness,
  );
  drawLine(
    pixels,
    metrics,
    bodyX + 16,
    bodyY + 20,
    bodyX + 25,
    bodyY + 43,
    LEG,
    1,
    legThickness,
  );
  fillEllipse(pixels, metrics, bodyX, bodyY, bodyRx, bodyRy, RED_BODY, 1);
  fillEllipse(
    pixels,
    metrics,
    bodyX + direction * (bodyRx - 6),
    bodyY + 2,
    snoutRx,
    11,
    DARK_RED,
    1,
  );

  drawArrow(
    pixels,
    metrics,
    bodyX,
    bodyY - 43,
    bodyX + direction * 64,
    bodyY - 43,
    HEADING,
    4,
  );
  const attentionY = Math.round(bodyY - 12 - active.root.attention.direction[1] * 80);
  drawArrow(
    pixels,
    metrics,
    bodyX + direction * 20,
    bodyY - 10,
    bodyX + direction * 78,
    attentionY,
    ATTENTION,
    3,
  );

  const progressWidth = Math.round((PANEL_WIDTH - 70) * active.root.routeProgress);
  fillMetricRect(pixels, metrics, left + 34, top + 27, PANEL_WIDTH - 70, 5, RAIL_SHADOW, 2);
  fillMetricRect(pixels, metrics, left + 34, top + 27, progressWidth, 5, PROGRESS, 2);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    receipt: null,
    producerRoot: null,
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
    if (key === '--receipt') args.receipt = value;
    else if (key === '--producer-root') args.producerRoot = value;
    else if (key === '--report') args.report = value;
    else if (key === '--image') args.image = value;
    else throw new Error(`unknown argument ${key}`);
    index += 1;
  }
  return args;
}

function argumentValue(argv: readonly string[], key: string): string | null {
  const index = argv.indexOf(key);
  const value = index >= 0 ? argv[index + 1] : undefined;
  return value && !value.startsWith('--') ? value : null;
}

function requestedInputs(argv: readonly string[]): Record<string, string | null> {
  return {
    producerRevision: CED6DB3D_PRODUCER_REVISION,
    producerRoot: argumentValue(argv, '--producer-root'),
    receiptPath: argumentValue(argv, '--receipt'),
    imagePath: argumentValue(argv, '--image'),
  };
}

function validatePathCustody(args: CompleteCliArgs): void {
  const receiptPath = resolve(args.receipt);
  const reportPath = resolve(args.report);
  const imagePath = resolve(args.image);
  if (reportPath === imagePath) {
    throw new Error('report and image paths must be distinct');
  }
  if (receiptPath === reportPath || receiptPath === imagePath) {
    throw new Error('receipt, report, and image paths must be distinct');
  }
  for (const [label, path] of [
    ['report', args.report],
    ['image output', args.image],
  ] as const) {
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
      throw new Error(`${label} path must not be a symbolic link`);
    }
  }
  const receiptCanonicalPath = canonicalTargetPath(receiptPath);
  const reportCanonicalPath = canonicalTargetPath(reportPath);
  const imageCanonicalPath = canonicalTargetPath(imagePath);
  if (reportCanonicalPath === imageCanonicalPath) {
    throw new Error('report and image paths resolve to the same canonical target');
  }
  if (
    receiptCanonicalPath === reportCanonicalPath ||
    receiptCanonicalPath === imageCanonicalPath
  ) {
    throw new Error('receipt, report, and image paths resolve to the same canonical target');
  }
  if (sameExistingObject(reportPath, imagePath)) {
    throw new Error('report and image paths identify the same filesystem object');
  }
  if (
    sameExistingObject(receiptPath, reportPath) ||
    sameExistingObject(receiptPath, imagePath)
  ) {
    throw new Error('receipt, report, and image paths identify the same filesystem object');
  }
}

function writeFailureReport(
  reportPath: string | null,
  details: {
    failurePhase: string;
    message: string;
    requested: Record<string, unknown>;
    lastTrustworthyEvidence?: Record<string, unknown>;
  },
): void {
  if (!reportPath) return;
  try {
    const requestedReceipt =
      typeof details.requested.receiptPath === 'string'
        ? details.requested.receiptPath
        : null;
    if (
      requestedReceipt &&
      (canonicalTargetPath(reportPath) === canonicalTargetPath(requestedReceipt) ||
        sameExistingObject(reportPath, requestedReceipt))
    ) {
      return;
    }
    if (existsSync(reportPath) && lstatSync(reportPath).isSymbolicLink()) return;
    writeJson(reportPath, {
      ok: false,
      schema: STABLE_RAIL_VISUAL_WITNESS_SCHEMA,
      phase: 'failed',
      ...details,
    });
  } catch {
    // A report-path failure cannot be reported through the same broken path.
  }
}

function canonicalTargetPath(path: string): string {
  const suffix: string[] = [];
  let cursor = resolve(path);
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) break;
    suffix.unshift(basename(cursor));
    cursor = parent;
  }
  return resolve(realpathSync(cursor), ...suffix);
}

function sameExistingObject(left: string, right: string): boolean {
  if (!existsSync(left) || !existsSync(right)) return false;
  const leftStat = statSync(left);
  const rightStat = statSync(right);
  return leftStat.dev === rightStat.dev && leftStat.ino === rightStat.ino;
}

function verifyPpm(path: string, width: number, height: number): void {
  const bytes = readFileSync(path);
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, 'ascii');
  if (
    bytes.byteLength !== header.byteLength + width * height * 3 ||
    !bytes.subarray(0, header.byteLength).equals(header)
  ) {
    throw new Error('written image is not a complete expected PPM');
  }
}

function proceduralSquashThiefCandidate(): RedLermBodyCandidate {
  const bakeoff = buildRedLermBodyBakeoff();
  const candidate = bakeoff.candidates.find(
    (entry) => entry.id === bakeoff.selectedDefaultCandidateId,
  );
  if (
    !candidate ||
    candidate.schema !== RED_LERM_BODY_CANDIDATE_SCHEMA ||
    candidate.sourceTruth.representationKind !== 'authored_procedural'
  ) {
    throw new Error('procedural squash-thief body descriptor is unavailable');
  }
  return candidate;
}

function gitText(cwd: string, args: readonly string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function sha256Json(payload: unknown): string {
  return createHash('sha256')
    .update(`${JSON.stringify(payload, null, 2)}\n`)
    .digest('hex');
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

function fillRect(
  pixels: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number,
  color: Rgb,
): void {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) setPixel(pixels, xx, yy, color);
  }
}

function fillMetricRect(
  pixels: Uint8Array,
  metrics: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number,
  color: Rgb,
  metric: number,
): void {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      setPixel(pixels, xx, yy, color);
      setMetric(metrics, xx, yy, metric);
    }
  }
}

function drawRect(
  pixels: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number,
  color: Rgb,
  thickness: number,
): void {
  fillRect(pixels, x, y, width, thickness, color);
  fillRect(pixels, x, y + height - thickness, width, thickness, color);
  fillRect(pixels, x, y, thickness, height, color);
  fillRect(pixels, x + width - thickness, y, thickness, height, color);
}

function fillEllipse(
  pixels: Uint8Array,
  metrics: Uint8Array,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: Rgb,
  metric: number,
): void {
  for (let y = cy - ry; y <= cy + ry; y += 1) {
    for (let x = cx - rx; x <= cx + rx; x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        setPixel(pixels, x, y, color);
        setMetric(metrics, x, y, metric);
      }
    }
  }
}

function drawArrow(
  pixels: Uint8Array,
  metrics: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: Rgb,
  metric: number,
): void {
  drawLine(pixels, metrics, x0, y0, x1, y1, color, metric, 3);
  const angle = Math.atan2(y1 - y0, x1 - x0);
  for (const offset of [-0.65, 0.65]) {
    drawLine(
      pixels,
      metrics,
      x1,
      y1,
      Math.round(x1 - Math.cos(angle + offset) * 15),
      Math.round(y1 - Math.sin(angle + offset) * 15),
      color,
      metric,
      3,
    );
  }
}

function drawLine(
  pixels: Uint8Array,
  metrics: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: Rgb,
  metric: number,
  thickness: number,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(x0 + (dx * step) / steps);
    const y = Math.round(y0 + (dy * step) / steps);
    for (let oy = -Math.floor(thickness / 2); oy <= Math.floor(thickness / 2); oy += 1) {
      for (let ox = -Math.floor(thickness / 2); ox <= Math.floor(thickness / 2); ox += 1) {
        setPixel(pixels, x + ox, y + oy, color);
        if (metric > 0) setMetric(metrics, x + ox, y + oy, metric);
      }
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

function setMetric(metrics: Uint8Array, x: number, y: number, metric: number): void {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  metrics[y * WIDTH + x] = metric;
}

function assertVec3(value: Vec3, label: string): void {
  if (!Array.isArray(value) || value.length !== 3 || value.some((item) => !Number.isFinite(item))) {
    throw new Error(`${label} must be a finite Vec3`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exitCode = runStableRailVisualWitnessCli();
}
