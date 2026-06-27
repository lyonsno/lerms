export const RED_LERM_BODY_MOTION_SCHEMA = 'lerms.red-lerm-body-motion.v0' as const;

export type RedLermSourceKind = 'fixture' | 'authored' | 'generated' | 'live';
export type RedLermSourceStatus = RedLermSourceKind | 'fallback';
export type RedLermStateBucket =
  | 'approach-uphill'
  | 'steal-goin'
  | 'carry-goin'
  | 'flee-with-goin'
  | 'hit-reaction'
  | 'tumble-flail'
  | 'drop-goin'
  | 'reroute-loose-goin';

export type RedLermMotionSourceRequest = {
  kind: RedLermSourceKind;
  id: string;
  route: string;
};

export type RedLermEffectiveMotionSource = RedLermMotionSourceRequest & {
  status: RedLermSourceStatus;
};

export type RedLermSourceTruth = {
  requestedMotionSource: RedLermMotionSourceRequest;
  effectiveMotionSource: RedLermEffectiveMotionSource;
  bodySource: {
    kind: 'authored';
    id: string;
    status: 'authored';
  };
  fixtureId: string;
  fallbackActive: boolean;
  fallbackReason: string | null;
  motionSourceTruthFields: string[];
};

export type RedLermBodyMotionSample = {
  t: number;
  stateBucket: RedLermStateBucket;
  heading: {
    angleRad: number;
    uphillBias: number;
    targetId: string | null;
  };
  terrainContact: {
    kind: 'grounded' | 'airborne' | 'rolling-contact';
    normal: [number, number, number];
    slope: number;
  };
  locomotion: {
    kind: 'uphill-approach' | 'grab-lunge' | 'carry-run' | 'panic-flee' | 'knockback' | 'tumble' | 'recover-reroute';
    speed: number;
    stridePhase: number;
    effort: number;
  };
  bodyPose: {
    compression: number;
    lean: number;
    flailAmplitude: number;
    silhouetteScale: [number, number];
  };
  carryingGoin: boolean;
  goinInteraction: {
    kind: 'none' | 'targeting' | 'stolen' | 'carried' | 'dropped' | 'chasing-loose';
    goinId: string | null;
  };
  hitReaction: {
    kind: 'none' | 'finger-juice-knockback' | 'tumble-flail';
    tumbleAffordance: 'none' | 'armed' | 'active';
  };
  rerouteIntent: {
    kind: 'none' | 'loose-goin-chase';
    targetId: string | null;
    desire: number;
  };
};

export type RedLermBodyMotionWitness = {
  schema: typeof RED_LERM_BODY_MOTION_SCHEMA;
  species: 'red-lerm';
  body: {
    bodyIdentity: 'short-springy-overeager-red-lerm';
    silhouetteId: 'red-lerm-springy-thief-v0';
    proportions: {
      length: number;
      height: number;
      belly: number;
      spring: number;
    };
  };
  sourceTruth: RedLermSourceTruth;
  samples: RedLermBodyMotionSample[];
  stateBuckets: Record<RedLermStateBucket, number>;
  witnessFields: {
    stateBuckets: RedLermStateBucket[];
    sourceTruth: string[];
  };
};

export type BuildRedLermBodyMotionWitnessOptions = {
  fixtureId?: string;
  requestedMotionSource?: RedLermMotionSourceRequest;
  availableMotionSources?: RedLermMotionSourceRequest[];
};

const DEFAULT_FIXTURE_ID = 'red-lerm-state-spine-fixture-v0';

const STATE_BUCKETS: RedLermStateBucket[] = [
  'approach-uphill',
  'steal-goin',
  'carry-goin',
  'flee-with-goin',
  'hit-reaction',
  'tumble-flail',
  'drop-goin',
  'reroute-loose-goin',
];

const BODY_SOURCE = {
  kind: 'authored',
  id: 'authored-red-lerm-springy-thief-body-v0',
  status: 'authored',
} as const;

export function resolveRedLermBodyMotionSource({
  requestedMotionSource = {
    kind: 'fixture',
    id: DEFAULT_FIXTURE_ID,
    route: 'lerms/red-lerm-body-motion/fixture',
  },
  availableMotionSources = [requestedMotionSource],
  fixtureId = DEFAULT_FIXTURE_ID,
}: BuildRedLermBodyMotionWitnessOptions = {}): RedLermSourceTruth {
  const effectiveRequestedSource = availableMotionSources.find(
    (source) =>
      source.kind === requestedMotionSource.kind &&
      source.id === requestedMotionSource.id &&
      source.route === requestedMotionSource.route,
  );

  const fallbackActive = !effectiveRequestedSource;
  const effectiveMotionSource: RedLermEffectiveMotionSource = fallbackActive
    ? {
        kind: 'fixture',
        id: fixtureId,
        route: 'lerms/red-lerm-body-motion/fixture',
        status: 'fallback',
      }
    : {
        ...effectiveRequestedSource,
        status: effectiveRequestedSource.kind,
      };

  return {
    requestedMotionSource,
    effectiveMotionSource,
    bodySource: BODY_SOURCE,
    fixtureId,
    fallbackActive,
    fallbackReason: fallbackActive ? 'requested-motion-source-unavailable' : null,
    motionSourceTruthFields: [
      'requestedMotionSource.kind',
      'requestedMotionSource.id',
      'effectiveMotionSource.kind',
      'effectiveMotionSource.status',
      'bodySource.kind',
      'bodySource.status',
      'fallbackActive',
    ],
  };
}

export function buildRedLermBodyMotionWitness(
  options: BuildRedLermBodyMotionWitnessOptions = {},
): RedLermBodyMotionWitness {
  const sourceTruth = resolveRedLermBodyMotionSource(options);
  const samples = buildFixtureSamples();
  const stateBuckets = STATE_BUCKETS.reduce<Record<RedLermStateBucket, number>>(
    (counts, bucket) => {
      counts[bucket] = samples.filter((sample) => sample.stateBucket === bucket).length;
      return counts;
    },
    {
      'approach-uphill': 0,
      'steal-goin': 0,
      'carry-goin': 0,
      'flee-with-goin': 0,
      'hit-reaction': 0,
      'tumble-flail': 0,
      'drop-goin': 0,
      'reroute-loose-goin': 0,
    },
  );

  return {
    schema: RED_LERM_BODY_MOTION_SCHEMA,
    species: 'red-lerm',
    body: {
      bodyIdentity: 'short-springy-overeager-red-lerm',
      silhouetteId: 'red-lerm-springy-thief-v0',
      proportions: {
        length: 1.15,
        height: 0.42,
        belly: 0.58,
        spring: 0.91,
      },
    },
    sourceTruth,
    samples,
    stateBuckets,
    witnessFields: {
      stateBuckets: STATE_BUCKETS,
      sourceTruth: [
        'bodySource.kind',
        'bodySource.status',
        'effectiveMotionSource.kind',
        'effectiveMotionSource.status',
        'fixtureId',
        'fallbackActive',
      ],
    },
  };
}

function buildFixtureSamples(): RedLermBodyMotionSample[] {
  return [
    sample(0, 'approach-uphill', {
      targetId: 'hoard-crown',
      locomotionKind: 'uphill-approach',
      speed: 0.42,
      effort: 0.52,
      uphillBias: 0.92,
      carryingGoin: false,
      goinKind: 'targeting',
      goinId: 'goin-hoard-nearest',
      compression: 0.12,
      lean: 0.18,
    }),
    sample(0.42, 'steal-goin', {
      targetId: 'goin-hoard-nearest',
      locomotionKind: 'grab-lunge',
      speed: 0.55,
      effort: 0.88,
      uphillBias: 0.7,
      carryingGoin: false,
      goinKind: 'stolen',
      goinId: 'goin-hoard-nearest',
      compression: 0.36,
      lean: 0.42,
    }),
    sample(0.78, 'carry-goin', {
      targetId: 'lower-slope-escape',
      locomotionKind: 'carry-run',
      speed: 0.72,
      effort: 0.76,
      uphillBias: -0.35,
      carryingGoin: true,
      goinKind: 'carried',
      goinId: 'goin-hoard-nearest',
      compression: 0.24,
      lean: -0.22,
    }),
    sample(1.1, 'flee-with-goin', {
      targetId: 'lower-slope-escape',
      locomotionKind: 'panic-flee',
      speed: 0.94,
      effort: 0.95,
      uphillBias: -0.72,
      carryingGoin: true,
      goinKind: 'carried',
      goinId: 'goin-hoard-nearest',
      compression: 0.16,
      lean: -0.48,
    }),
    sample(1.34, 'hit-reaction', {
      targetId: 'finger-juice-impact',
      locomotionKind: 'knockback',
      speed: 0.38,
      effort: 1,
      uphillBias: -0.1,
      carryingGoin: true,
      goinKind: 'carried',
      goinId: 'goin-hoard-nearest',
      compression: 0.62,
      lean: -0.82,
      hitKind: 'finger-juice-knockback',
      tumbleAffordance: 'armed',
    }),
    sample(1.58, 'tumble-flail', {
      targetId: 'finger-juice-impact',
      terrainKind: 'rolling-contact',
      locomotionKind: 'tumble',
      speed: 0.66,
      effort: 0.98,
      uphillBias: -0.48,
      carryingGoin: true,
      goinKind: 'carried',
      goinId: 'goin-hoard-nearest',
      compression: 0.48,
      lean: -1.1,
      flailAmplitude: 0.91,
      hitKind: 'tumble-flail',
      tumbleAffordance: 'active',
    }),
    sample(1.86, 'drop-goin', {
      targetId: 'goin-loose-rolling-downhill',
      locomotionKind: 'tumble',
      speed: 0.28,
      effort: 0.72,
      uphillBias: -0.6,
      carryingGoin: false,
      goinKind: 'dropped',
      goinId: 'goin-loose-rolling-downhill',
      compression: 0.31,
      lean: -0.64,
      flailAmplitude: 0.44,
    }),
    sample(2.22, 'reroute-loose-goin', {
      targetId: 'loose-goin-gunk-gunk-gunk',
      locomotionKind: 'recover-reroute',
      speed: 0.68,
      effort: 0.83,
      uphillBias: -0.18,
      carryingGoin: false,
      goinKind: 'chasing-loose',
      goinId: 'loose-goin-gunk-gunk-gunk',
      compression: 0.22,
      lean: 0.34,
      rerouteKind: 'loose-goin-chase',
      rerouteDesire: 0.94,
    }),
  ];
}

type SampleOptions = {
  targetId: string;
  terrainKind?: RedLermBodyMotionSample['terrainContact']['kind'];
  locomotionKind: RedLermBodyMotionSample['locomotion']['kind'];
  speed: number;
  effort: number;
  uphillBias: number;
  carryingGoin: boolean;
  goinKind: RedLermBodyMotionSample['goinInteraction']['kind'];
  goinId: string | null;
  compression: number;
  lean: number;
  flailAmplitude?: number;
  hitKind?: RedLermBodyMotionSample['hitReaction']['kind'];
  tumbleAffordance?: RedLermBodyMotionSample['hitReaction']['tumbleAffordance'];
  rerouteKind?: RedLermBodyMotionSample['rerouteIntent']['kind'];
  rerouteDesire?: number;
};

function sample(
  t: number,
  stateBucket: RedLermStateBucket,
  options: SampleOptions,
): RedLermBodyMotionSample {
  return {
    t,
    stateBucket,
    heading: {
      angleRad: Number((Math.PI * (0.25 - options.uphillBias * 0.18)).toFixed(4)),
      uphillBias: options.uphillBias,
      targetId: options.targetId,
    },
    terrainContact: {
      kind: options.terrainKind ?? 'grounded',
      normal: [0, 1, 0],
      slope: Number((0.34 + Math.abs(options.uphillBias) * 0.18).toFixed(4)),
    },
    locomotion: {
      kind: options.locomotionKind,
      speed: options.speed,
      stridePhase: Number(((t * 1.7) % 1).toFixed(4)),
      effort: options.effort,
    },
    bodyPose: {
      compression: options.compression,
      lean: options.lean,
      flailAmplitude: options.flailAmplitude ?? 0,
      silhouetteScale: [
        Number((1 + options.compression * 0.2).toFixed(4)),
        Number((1 - options.compression * 0.15).toFixed(4)),
      ],
    },
    carryingGoin: options.carryingGoin,
    goinInteraction: {
      kind: options.goinKind,
      goinId: options.goinId,
    },
    hitReaction: {
      kind: options.hitKind ?? 'none',
      tumbleAffordance: options.tumbleAffordance ?? 'none',
    },
    rerouteIntent: {
      kind: options.rerouteKind ?? 'none',
      targetId: options.rerouteKind === 'loose-goin-chase' ? options.targetId : null,
      desire: options.rerouteDesire ?? 0,
    },
  };
}
