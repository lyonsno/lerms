import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildRedLermBodyMotionWitness,
  type RedLermBodyMotionWitness,
  type RedLermStateBucket,
} from './red-lerm-body-motion.ts';

const SUCCESSOR_WITNESS_SCHEMA = 'lerms.lerm-horde-successor-witness.v0' as const;
const ROUTE = 'lerms/lerm-horde-successor/witness-file' as const;

type CliArgs = {
  out: string | null;
};

type CropMiningEvidence = {
  id: string;
  path: string;
  sha256: string;
  authority: 'directional_evidence';
  sourceTruth: 'not_runtime_body_source';
  usefulEvidence: readonly string[];
  failureEvidence: readonly string[];
};

type SpecimenLaw = {
  identity: 'eyeless-nose-led-squash-bodied-thief';
  visibleEyesAllowed: false;
  mustExpressAttentionThrough: readonly string[];
  requiredAffordances: readonly string[];
  forbiddenDrift: readonly string[];
};

type BucketCoverage = {
  requiredStateBuckets: readonly RedLermStateBucket[];
  counts: Record<RedLermStateBucket, number>;
  missingBuckets: readonly RedLermStateBucket[];
};

type LermHordeSuccessorWitness = {
  ok: true;
  schema: typeof SUCCESSOR_WITNESS_SCHEMA;
  route: typeof ROUTE;
  phase: 'complete';
  outputPath: string;
  diaulos: 'lerm-horde-fucker';
  scope: {
    owner: 'red-lerm-body-motion-source-truth';
    nonGoals: readonly [
      'central-kaminos-kiln-architecture',
      'generic-asset-becoming',
      'blue-yellow-lerm-species',
      'goin-physics',
      'crowd-simulation',
    ];
  };
  cropMiningEvidence: readonly CropMiningEvidence[];
  specimenLaw: SpecimenLaw;
  fixtureMotion: RedLermBodyMotionWitness;
  bucketCoverage: BucketCoverage;
  truthBoundary: {
    builtRealMotion: false;
    builtGeneratedMesh: false;
    builtFixtureMotion: true;
    builtArchitectureOnly: false;
    closeoutPhrase: 'fixture-backed successor witness, not real motion';
  };
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { out: null };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key.startsWith('--')) continue;
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${key}`);
    }

    if (key === '--out') args.out = value;
    else throw new Error(`unknown argument ${key}`);

    index += 1;
  }

  return args;
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

export function buildLermHordeSuccessorWitness(outputPath: string): LermHordeSuccessorWitness {
  const fixtureMotion = buildRedLermBodyMotionWitness({
    fixtureId: 'lerm-horde-successor-red-lerm-fixture-v0',
    requestedMotionSource: {
      kind: 'fixture',
      id: 'red-lerm-state-spine-fixture-v0',
      route: 'lerms/red-lerm-body-motion/fixture',
    },
  });
  const requiredStateBuckets = fixtureMotion.witnessFields.stateBuckets;
  const missingBuckets = requiredStateBuckets.filter((bucket) => fixtureMotion.stateBuckets[bucket] < 1);

  return {
    ok: true,
    schema: SUCCESSOR_WITNESS_SCHEMA,
    route: ROUTE,
    phase: 'complete',
    outputPath,
    diaulos: 'lerm-horde-fucker',
    scope: {
      owner: 'red-lerm-body-motion-source-truth',
      nonGoals: [
        'central-kaminos-kiln-architecture',
        'generic-asset-becoming',
        'blue-yellow-lerm-species',
        'goin-physics',
        'crowd-simulation',
      ],
    },
    cropMiningEvidence: buildCropMiningEvidence(),
    specimenLaw: buildSpecimenLaw(),
    fixtureMotion,
    bucketCoverage: {
      requiredStateBuckets,
      counts: fixtureMotion.stateBuckets,
      missingBuckets,
    },
    truthBoundary: {
      builtRealMotion: false,
      builtGeneratedMesh: false,
      builtFixtureMotion: true,
      builtArchitectureOnly: false,
      closeoutPhrase: 'fixture-backed successor witness, not real motion',
    },
  };
}

export function runLermHordeSuccessorWitnessCli(argv = process.argv.slice(2)): number {
  let args: CliArgs;

  try {
    args = parseArgs(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    return 1;
  }

  if (!args.out) {
    process.stderr.write('missing required --out path\n');
    return 1;
  }

  writeJson(args.out, buildLermHordeSuccessorWitness(args.out));
  return 0;
}

function buildCropMiningEvidence(): readonly CropMiningEvidence[] {
  const sharedUsefulEvidence = [
    'scene prompts made lerms read as thieves in a world',
    'large renders exposed body and motion fragments unavailable in tiny neutral sheets',
    'crop-mining can guide taste and failure cartography',
  ];
  const sharedFailureEvidence = [
    'scene charm repeatedly violated the no-eye law',
    'crop source is not authored runtime body source',
    'directional evidence cannot satisfy fixture/live/generated source truth',
  ];

  return [
    {
      id: 'hill-of-hills-contact-1024',
      path: '/tmp/lerms-hill-of-hills-boxart-contact-1024-0627.png',
      sha256: '41de46c926f32d392e9692cf0c33edece23322726f622a43e01870bfec228f06',
      authority: 'directional_evidence',
      sourceTruth: 'not_runtime_body_source',
      usefulEvidence: sharedUsefulEvidence,
      failureEvidence: sharedFailureEvidence,
    },
    {
      id: 'contact-cropmine',
      path: '/tmp/lerms-cropmine-1024-0627/contact.png',
      sha256: '064a5574a93a47c84b3433b4bd8e38ae7e96fa5f78bfbc4328678336e1cab56d',
      authority: 'directional_evidence',
      sourceTruth: 'not_runtime_body_source',
      usefulEvidence: sharedUsefulEvidence,
      failureEvidence: sharedFailureEvidence,
    },
    {
      id: 'hill-of-hills-top-down-horde-1024',
      path: '/tmp/lerms-hill-of-hills-boxart-scout-05-top-down-horde-1024.png',
      sha256: '22ad4f551aa834b0ce77dd26096c68a2c113bbaea3049f7f58e12384a0eeef8b',
      authority: 'directional_evidence',
      sourceTruth: 'not_runtime_body_source',
      usefulEvidence: sharedUsefulEvidence,
      failureEvidence: sharedFailureEvidence,
    },
    {
      id: 'hill-of-hills-cartridge-chaos-1024',
      path: '/tmp/lerms-hill-of-hills-boxart-scout-06-cartridge-chaos-1024.png',
      sha256: '9da8f9a0253577e5f58f757e7a11b4b6508b670093b92591dd23270e4228f7d8',
      authority: 'directional_evidence',
      sourceTruth: 'not_runtime_body_source',
      usefulEvidence: sharedUsefulEvidence,
      failureEvidence: sharedFailureEvidence,
    },
  ];
}

function buildSpecimenLaw(): SpecimenLaw {
  return {
    identity: 'eyeless-nose-led-squash-bodied-thief',
    visibleEyesAllowed: false,
    mustExpressAttentionThrough: [
      'nub-orientation',
      'whole-body-posture',
      'compression',
      'reach',
      'timing',
    ],
    requiredAffordances: [
      'uphill-approach',
      'steal-carry-goin',
      'panic-flee',
      'finger-juice-hit-reaction',
      'hit-tumble-drop-reroute',
      'terrain-contact',
    ],
    forbiddenDrift: [
      'visible-eyes',
      'pupils-or-eye-dots',
      'mascot-face-language',
      'ordinary-humanoid-legs',
      'species-costumes',
      'blue-yellow-lerm-design',
    ],
  };
}

const currentModulePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentModulePath) {
  process.exitCode = runLermHordeSuccessorWitnessCli();
}
