export const RED_LERM_BODY_MOTION_SCHEMA = 'lerms.red-lerm-body-motion.v0' as const;

import {
  CARRIER_DROP_EVENT_SCHEMA,
  FIRST_VERTICAL_INTERFACE_SCHEMA,
  GOIN_STATE_SCHEMA,
  JUICE_HIT_EVENT_SCHEMA,
  LERM_STATE_SCHEMA,
  SOURCE_TRUTH_SCHEMA,
  TERRAIN_SAMPLE_SCHEMA,
  type CarrierDropEvent,
  type FirstVerticalFrame,
  type GoinState,
  type JuiceHitEvent,
  type LermState,
  type SimulationAuthority,
  type SourceTruth,
  type TerrainSample,
  type Vec3,
} from './contracts/first-vertical.ts';

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
  firstVerticalFrame: FirstVerticalFrame;
  stateBuckets: Record<RedLermStateBucket, number>;
  motionAdapter: {
    schema: 'lerms.red-lerm-motion-adapter.v0';
    sourceFrame: string;
    worldFrame: 'lerms.first-vertical.world.v0';
    units: 'world-units';
    upAxis: 'y';
    attachmentSlots: readonly [
      'body_root',
      'face_or_head',
      'underside_or_feet',
      'carry_socket',
      'hit_reaction_anchor',
      'trail_or_aura',
    ];
    featureEvidenceSockets: readonly string[];
    adaptedPoseFields: readonly string[];
  };
  assetTruth: {
    assetIdentity: 'lerms.red-lerm-body.prototype.v0';
    speciesIdentity: 'lerms.red-lerm.v0';
    bodySchemaIdentity: 'lerms.red-lerm-body-schema.v0';
    representationKind: 'fixture';
    truthStatus: 'scene-local-reference';
    visualStatus: 'placeholder';
    requestedRouteIdentity: string;
    effectiveRouteIdentity: string;
    motionContractIdentity: typeof RED_LERM_BODY_MOTION_SCHEMA;
  };
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
  if (sourceTruth.effectiveMotionSource.kind !== 'fixture') {
    throw new Error(
      `${sourceTruth.effectiveMotionSource.kind} motion requires caller-supplied body and motion evidence through composeMovingLermOnHill`,
    );
  }
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
    firstVerticalFrame: buildFirstVerticalFrame(sourceTruth, samples),
    motionAdapter: {
      schema: 'lerms.red-lerm-motion-adapter.v0',
      sourceFrame: sourceTruth.effectiveMotionSource.id,
      worldFrame: 'lerms.first-vertical.world.v0',
      units: 'world-units',
      upAxis: 'y',
      attachmentSlots: [
        'body_root',
        'face_or_head',
        'underside_or_feet',
        'carry_socket',
        'hit_reaction_anchor',
        'trail_or_aura',
      ],
      featureEvidenceSockets: [
        'rootMetrics.travelXZ',
        'torsoFrame.chestRootHorizontalLean.range',
        'limbEnvelope.handSpan.range',
        'stanceContact.stanceWidth.range',
        'expansionCompression.bboxVolume.range',
        'eventSpikes.0.speed',
      ],
      adaptedPoseFields: [
        'lerm.rootOffset',
        'lerm.faceCueLead',
        'lerm.bodyLean',
        'lerm.scalePulse',
        'lerm.envelopeRadius',
        'lerm.eventAccent',
        'lerm.footfallPulse',
      ],
    },
    assetTruth: {
      assetIdentity: 'lerms.red-lerm-body.prototype.v0',
      speciesIdentity: 'lerms.red-lerm.v0',
      bodySchemaIdentity: 'lerms.red-lerm-body-schema.v0',
      representationKind: 'fixture',
      truthStatus: 'scene-local-reference',
      visualStatus: 'placeholder',
      requestedRouteIdentity: sourceTruth.requestedMotionSource.route,
      effectiveRouteIdentity: sourceTruth.effectiveMotionSource.route,
      motionContractIdentity: RED_LERM_BODY_MOTION_SCHEMA,
    },
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

function buildFirstVerticalFrame(
  sourceTruth: RedLermSourceTruth,
  samples: readonly RedLermBodyMotionSample[],
): FirstVerticalFrame {
  const source = toFirstVerticalSourceTruth(sourceTruth, 'red-lerm-body-motion-frame');
  const terrainSamples = samples.map((sampleItem) => toTerrainSample(source, sampleItem));
  const lerms = samples.map((sampleItem) => toLermState(source, sampleItem));
  const goins: GoinState[] = [
    {
      schema: GOIN_STATE_SCHEMA,
      id: 'goin-hoard-nearest',
      source,
      state: 'dropped',
      world: [0.08, 1.28, -0.12],
      velocity: [0.1, -0.02, -0.45],
      desireRadius: 1.2,
      mass: 1,
    },
    {
      schema: GOIN_STATE_SCHEMA,
      id: 'loose-goin-gunk-gunk-gunk',
      source,
      state: 'rolling',
      world: [0.16, 1.04, -0.42],
      velocity: [0.18, -0.03, -0.62],
      desireRadius: 1.45,
      mass: 1,
    },
  ];
  const juiceHits: JuiceHitEvent[] = [
    {
      schema: JUICE_HIT_EVENT_SCHEMA,
      id: 'juice-hit-red-lerm-index-knockback',
      source,
      chemistry: 'index_knockback',
      targetKind: 'lerm',
      targetId: 'red-lerm-hit-reaction',
      contactWorld: [0.1, 1.38, -0.02],
      impulse: [0.35, 0.16, -0.7],
      sourcePacketId: 'fixture-index-knockback-packet',
      strength: 0.9,
    },
  ];
  const carrierDropEvents: CarrierDropEvent[] = [
    {
      schema: CARRIER_DROP_EVENT_SCHEMA,
      id: 'carrier-drop-red-lerm-goin-hoard-nearest',
      source,
      cause: 'juice_hit',
      lermId: 'red-lerm-tumble-flail',
      goinId: 'goin-hoard-nearest',
      world: [0.08, 1.28, -0.12],
      outgoingVelocity: [0.1, -0.02, -0.45],
      rerouteRadius: 1.2,
      triggeringHitId: 'juice-hit-red-lerm-index-knockback',
    },
  ];

  return {
    schema: FIRST_VERTICAL_INTERFACE_SCHEMA,
    source,
    terrainSamples,
    lerms,
    goins,
    juiceHits,
    carrierDropEvents,
  };
}

function toFirstVerticalSourceTruth(sourceTruth: RedLermSourceTruth, frameId: string): SourceTruth {
  return {
    schema: SOURCE_TRUTH_SCHEMA,
    authority: toFirstVerticalAuthority(sourceTruth),
    route: sourceTruth.effectiveMotionSource.route,
    frameId,
    timestampMs: 0,
    sampleAgeMs: 0,
    backend: sourceTruth.effectiveMotionSource.id,
    configId: sourceTruth.fixtureId,
  };
}

function toFirstVerticalAuthority(sourceTruth: RedLermSourceTruth): SimulationAuthority {
  if (sourceTruth.fallbackActive) return 'fallback';
  if (sourceTruth.effectiveMotionSource.kind === 'fixture') return 'synthetic_fixture';
  if (sourceTruth.effectiveMotionSource.kind === 'live') return 'live_simulation';
  if (sourceTruth.effectiveMotionSource.kind === 'generated') return 'synthetic_fixture';
  return 'visual_only';
}

function toTerrainSample(source: SourceTruth, sampleItem: RedLermBodyMotionSample): TerrainSample {
  return {
    schema: TERRAIN_SAMPLE_SCHEMA,
    id: terrainSampleId(sampleItem),
    source,
    world: toWorld(sampleItem),
    normal: sampleItem.terrainContact.normal,
    height: Number((1.1 + sampleItem.terrainContact.slope * 0.45).toFixed(4)),
    slope: sampleItem.terrainContact.slope,
    region: sampleItem.stateBucket === 'approach-uphill' ? 'approach' : sampleItem.stateBucket === 'steal-goin' ? 'crown' : 'slope',
  };
}

function toLermState(source: SourceTruth, sampleItem: RedLermBodyMotionSample): LermState {
  const carryingGoinId = requiresFirstVerticalCarriedGoin(sampleItem)
    ? sampleItem.goinInteraction.goinId ?? undefined
    : undefined;
  const targetGoinId =
    sampleItem.rerouteIntent.kind === 'loose-goin-chase' || sampleItem.goinInteraction.kind === 'targeting'
      ? sampleItem.goinInteraction.goinId ?? undefined
      : undefined;

  return {
    schema: LERM_STATE_SCHEMA,
    id: redLermSocketId(sampleItem),
    source,
    species: 'red',
    state: toFirstVerticalLermState(sampleItem.stateBucket),
    world: toWorld(sampleItem),
    heading: headingToVec3(sampleItem.heading.angleRad),
    terrainContact: {
      terrainSampleId: terrainSampleId(sampleItem),
      grounded: sampleItem.terrainContact.kind !== 'airborne',
      contactWorld: toWorld(sampleItem),
    },
    carryingGoinId,
    targetGoinId,
    speed: sampleItem.locomotion.speed,
    hitStunMs: sampleItem.hitReaction.kind === 'none' ? undefined : 220,
  };
}

function terrainSampleId(sampleItem: RedLermBodyMotionSample): string {
  return `terrain-${sampleItem.stateBucket}`;
}

function redLermSocketId(sampleItem: RedLermBodyMotionSample): string {
  return `red-lerm-${sampleItem.stateBucket}`;
}

function toFirstVerticalLermState(stateBucket: RedLermStateBucket): LermState['state'] {
  const states: Record<RedLermStateBucket, LermState['state']> = {
    'approach-uphill': 'approaching_hoard',
    'steal-goin': 'stealing_goin',
    'carry-goin': 'carrying_goin',
    'flee-with-goin': 'fleeing_with_goin',
    'hit-reaction': 'hit_reacting',
    'tumble-flail': 'tumbling',
    'drop-goin': 'recovering',
    'reroute-loose-goin': 'rerouting_to_goin',
  };
  return states[stateBucket];
}

function requiresFirstVerticalCarriedGoin(sampleItem: RedLermBodyMotionSample): boolean {
  return sampleItem.stateBucket === 'steal-goin' || sampleItem.stateBucket === 'carry-goin' || sampleItem.stateBucket === 'flee-with-goin';
}

function toWorld(sampleItem: RedLermBodyMotionSample): Vec3 {
  const t = sampleItem.t;
  return [
    Number((t * 0.18).toFixed(4)),
    Number((1.42 - t * 0.1 + sampleItem.terrainContact.slope * 0.12).toFixed(4)),
    Number((0.44 - t * 0.26).toFixed(4)),
  ];
}

function headingToVec3(angleRad: number): Vec3 {
  return [Number(Math.cos(angleRad).toFixed(4)), 0, Number(Math.sin(angleRad).toFixed(4))];
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
