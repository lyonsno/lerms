import {
  HILL_HORDE_LIVE_TRAVERSAL_ADMISSION_SCHEMA,
  HILL_HORDE_LIVE_TRAVERSAL_ROUTE,
  type HillHordeLiveTraversalAdmissionReceipt,
} from './hill-horde-live-traversal-admission.js';
export const LERM_HORDE_LIVE_BODY_MOTION_SCHEMA =
  'lerms.lerm-horde.live-hill-body-motion.v0' as const;
export const LERM_HORDE_LIVE_BODY_MOTION_ROUTE =
  'lerms/hill-of-hills/horde-live-body-motion-presentation' as const;
export const LERM_HORDE_REVIEWED_LIVE_HILL_REVISION =
  'f6458e5bd74d9305c4149e6a2ee3844bf4613150' as const;

const PROCEDURAL_BODY_CANDIDATE_ID = 'procedural-squash-thief-v0' as const;
const PROCEDURAL_BODY_CANDIDATE_SCHEMA =
  'lerms.red-lerm-body-candidate.v0' as const;
const PROCEDURAL_BODY_SHAPE_SCHEMA =
  'lerms.red-lerm-procedural-shape.v0' as const;
const STRIDE_LENGTH_WORLD = 0.87;
const MAX_BODY_BOB_WORLD = 0.065;
const MAX_LEG_REACH_WORLD = 0.16;
const MAX_LEG_LIFT_WORLD = 0.09;

type Vec3 = readonly [number, number, number];

export interface LermHordeLiveBodyMotionSample {
  sequence: number;
  timestampMs: number;
  sourceDistance: number;
  routeProgress: number;
  rootWorld: Vec3;
  heading: Vec3;
  gaitPhaseRadians: number;
  poseFingerprint: string;
  body: {
    centerWorld: Vec3;
    bobWorld: number;
    scaleX: number;
    scaleY: number;
    leanRadians: number;
  };
  legs: {
    leftReach: number;
    rightReach: number;
    leftLift: number;
    rightLift: number;
  };
}

export interface LermHordeLiveBodyMotionComposition {
  ok: true;
  schema: typeof LERM_HORDE_LIVE_BODY_MOTION_SCHEMA;
  phase: 'complete';
  route: typeof LERM_HORDE_LIVE_BODY_MOTION_ROUTE;
  evidenceClass: 'authored_procedural_body_motion_on_live_hill';
  source: {
    admission: {
      schema: typeof HILL_HORDE_LIVE_TRAVERSAL_ADMISSION_SCHEMA;
      route: typeof HILL_HORDE_LIVE_TRAVERSAL_ROUTE;
      hillRevision: string;
      hordeRevision: string;
      actorId: string;
    };
    body: {
      assetIdentity: string;
      sourceRevision: string;
      sha256: string;
      candidateId: typeof PROCEDURAL_BODY_CANDIDATE_ID;
      candidateSchema: typeof PROCEDURAL_BODY_CANDIDATE_SCHEMA;
      shapeSchema: typeof PROCEDURAL_BODY_SHAPE_SCHEMA;
    };
  };
  gait: {
    authority: 'horde_authored_procedural_presentation';
    phaseDriver: 'source_distance';
    strideLengthWorld: typeof STRIDE_LENGTH_WORLD;
    maxBodyBobWorld: typeof MAX_BODY_BOB_WORLD;
    maxLegReachWorld: typeof MAX_LEG_REACH_WORLD;
    maxLegLiftWorld: typeof MAX_LEG_LIFT_WORLD;
  };
  samples: readonly LermHordeLiveBodyMotionSample[];
  hillMemory: {
    trafficChecksumAtAdmission: string;
    trafficChecksumAfterDeparture: string;
    postDepartureTopologyPossibilityChecksum: string;
    noHistoryTopologyPossibilityChecksum: string;
  };
  assertions: {
    exactAdmissionConsumed: true;
    everyAdmittedRootPresented: true;
    admittedRootsPreserved: true;
    timeVaryingBodyGeometry: true;
    alternatingLegReach: true;
    postDepartureHillPressurePreserved: true;
    rootOnlyContactAbsencePreserved: true;
  };
  claimBoundary: {
    rootRailMotionTruth: true;
    liveCurrentHillTruth: true;
    topologyResponseTruth: true;
    bodyArticulationTruth: true;
    articulationClass: 'authored_procedural_presentation';
    liveContactTruth: false;
    producerRigMotionTruth: false;
    morphologyPortability: false;
  };
  fallbackStatus: 'none';
  staleStatus: 'fresh';
  partialStatus: 'complete-root-only';
}

export function composeLermHordeLiveBodyMotion(
  admission: HillHordeLiveTraversalAdmissionReceipt,
): LermHordeLiveBodyMotionComposition {
  validateAdmission(admission);

  const historySamples = admission.traversal.admittedHistory.samples;
  const samples = historySamples.map((sample, sequence) => {
    const phase = normalizePhase(
      (sample.root.sourceDistance / STRIDE_LENGTH_WORLD) * Math.PI * 2,
    );
    const stride = Math.sin(phase);
    const compression = Math.cos(phase * 2);
    const bobWorld = round(
      0.035 + (MAX_BODY_BOB_WORLD - 0.035) * Math.abs(stride),
    );
    const scaleX = round(1 + compression * 0.06 + stride * 0.02);
    const scaleY = round(1 - compression * 0.08 + stride * 0.025);
    const leftReach = round(stride * MAX_LEG_REACH_WORLD);
    const rightReach = round(-leftReach);
    const leftLift = round(Math.max(0, -stride) * MAX_LEG_LIFT_WORLD);
    const rightLift = round(Math.max(0, stride) * MAX_LEG_LIFT_WORLD);
    const leanRadians = round(
      clamp(sample.root.tangent[1] * 0.35 + stride * 0.045, -0.14, 0.14),
    );
    const rootWorld = admission.traversal.liveRootWorld[sequence];
    const centerWorld: Vec3 = [
      rootWorld[0],
      round(rootWorld[1] + bobWorld),
      rootWorld[2],
    ];
    const poseFingerprint = [
      `p${round(phase, 4)}`,
      `b${bobWorld}`,
      `s${scaleX}:${scaleY}`,
      `l${leftReach}:${leftLift}`,
      `r${rightReach}:${rightLift}`,
      `n${leanRadians}`,
    ].join('|');

    return {
      sequence,
      timestampMs: sample.timestampMs,
      sourceDistance: sample.root.sourceDistance,
      routeProgress: sample.root.routeProgress,
      rootWorld,
      heading: sample.root.tangent,
      gaitPhaseRadians: phase,
      poseFingerprint,
      body: {
        centerWorld,
        bobWorld,
        scaleX,
        scaleY,
        leanRadians,
      },
      legs: {
        leftReach,
        rightReach,
        leftLift,
        rightLift,
      },
    } satisfies LermHordeLiveBodyMotionSample;
  });

  const everyAdmittedRootPresented = samples.length === historySamples.length;
  const admittedRootsPreserved = samples.every(
    (sample, sequence) =>
      sample.timestampMs === historySamples[sequence].timestampMs &&
      vec3Equal(sample.rootWorld, historySamples[sequence].root.worldPosition),
  );
  const timeVaryingBodyGeometry =
    new Set(samples.map(({ poseFingerprint }) => poseFingerprint)).size >= 5;
  const alternatingLegReach =
    samples.some(({ legs }) => legs.leftReach > 0 && legs.rightReach < 0) &&
    samples.some(({ legs }) => legs.leftReach < 0 && legs.rightReach > 0);
  const postDepartureHillPressurePreserved =
    admission.persistence.trafficChecksumAtAdmission ===
    admission.persistence.trafficChecksumAfterDeparture;
  const rootOnlyContactAbsencePreserved =
    admission.admission.stanceContactCount === 0 &&
    historySamples.every(
      (sample) => sample.contacts === undefined && sample.locomotion === undefined,
    );

  requireClaim(
    everyAdmittedRootPresented,
    'body motion did not present every live-Hill admitted root',
  );
  requireClaim(
    admittedRootsPreserved,
    'body presentation changed live-Hill admitted root identity',
  );
  requireClaim(
    timeVaryingBodyGeometry,
    'body presentation remained static across the traversal',
  );
  requireClaim(
    alternatingLegReach,
    'body presentation did not produce alternating leg reach',
  );
  requireClaim(
    postDepartureHillPressurePreserved,
    'body presentation lost Hill pressure after departure',
  );
  requireClaim(
    rootOnlyContactAbsencePreserved,
    'body presentation consumed or invented stance/contact evidence',
  );

  return {
    ok: true,
    schema: LERM_HORDE_LIVE_BODY_MOTION_SCHEMA,
    phase: 'complete',
    route: LERM_HORDE_LIVE_BODY_MOTION_ROUTE,
    evidenceClass: 'authored_procedural_body_motion_on_live_hill',
    source: {
      admission: {
        schema: admission.schema,
        route: admission.route,
        hillRevision: admission.hill.targetRevision,
        hordeRevision: admission.source.horde.revision,
        actorId: admission.source.horde.actorId,
      },
      body: {
        assetIdentity: admission.source.horde.visibleBody.assetIdentity,
        sourceRevision: admission.source.horde.visibleBody.sourceRevision,
        sha256: admission.source.horde.visibleBody.sha256,
        candidateId: PROCEDURAL_BODY_CANDIDATE_ID,
        candidateSchema: PROCEDURAL_BODY_CANDIDATE_SCHEMA,
        shapeSchema: PROCEDURAL_BODY_SHAPE_SCHEMA,
      },
    },
    gait: {
      authority: 'horde_authored_procedural_presentation',
      phaseDriver: 'source_distance',
      strideLengthWorld: STRIDE_LENGTH_WORLD,
      maxBodyBobWorld: MAX_BODY_BOB_WORLD,
      maxLegReachWorld: MAX_LEG_REACH_WORLD,
      maxLegLiftWorld: MAX_LEG_LIFT_WORLD,
    },
    samples,
    hillMemory: {
      trafficChecksumAtAdmission:
        admission.persistence.trafficChecksumAtAdmission,
      trafficChecksumAfterDeparture:
        admission.persistence.trafficChecksumAfterDeparture,
      postDepartureTopologyPossibilityChecksum:
        admission.admission.postDepartureTopologyPossibilityChecksum,
      noHistoryTopologyPossibilityChecksum:
        admission.control.noHistoryTopologyPossibilityChecksum,
    },
    assertions: {
      exactAdmissionConsumed: true,
      everyAdmittedRootPresented: true,
      admittedRootsPreserved: true,
      timeVaryingBodyGeometry: true,
      alternatingLegReach: true,
      postDepartureHillPressurePreserved: true,
      rootOnlyContactAbsencePreserved: true,
    },
    claimBoundary: {
      rootRailMotionTruth: true,
      liveCurrentHillTruth: true,
      topologyResponseTruth: true,
      bodyArticulationTruth: true,
      articulationClass: 'authored_procedural_presentation',
      liveContactTruth: false,
      producerRigMotionTruth: false,
      morphologyPortability: false,
    },
    fallbackStatus: 'none',
    staleStatus: 'fresh',
    partialStatus: 'complete-root-only',
  };
}

function validateAdmission(
  admission: HillHordeLiveTraversalAdmissionReceipt,
): void {
  if (
    admission?.ok !== true ||
    admission.schema !== HILL_HORDE_LIVE_TRAVERSAL_ADMISSION_SCHEMA ||
    admission.phase !== 'complete' ||
    admission.route !== HILL_HORDE_LIVE_TRAVERSAL_ROUTE ||
    admission.fallbackStatus !== 'none' ||
    admission.staleStatus !== 'fresh' ||
    admission.partialStatus !== 'complete-root-only'
  ) {
    throw new Error(
      'body motion requires the fresh complete non-fallback live-Hill admission',
    );
  }
  if (admission.hill.targetRevision !== LERM_HORDE_REVIEWED_LIVE_HILL_REVISION) {
    throw new Error(
      `body motion requires reviewed live-Hill revision ${LERM_HORDE_REVIEWED_LIVE_HILL_REVISION}`,
    );
  }
  if (
    admission.claimBoundary.rootRailMotionTruth !== true ||
    admission.claimBoundary.visibleLermIdentityTruth !== true ||
    admission.claimBoundary.liveCurrentHillTruth !== true ||
    admission.claimBoundary.topologyResponseTruth !== true ||
    admission.claimBoundary.liveContactTruth !== false ||
    admission.claimBoundary.bodyArticulationTruth !== false ||
    admission.claimBoundary.morphologyPortability !== false
  ) {
    throw new Error('live-Hill admission claim boundary is incompatible');
  }
  const visibleBody = admission.source.horde.visibleBody;
  if (
    visibleBody.assetIdentity !==
      'lerms.red-lerm-body.procedural-squash-thief.v0' ||
    visibleBody.candidateId !== PROCEDURAL_BODY_CANDIDATE_ID ||
    visibleBody.candidateSchema !== PROCEDURAL_BODY_CANDIDATE_SCHEMA ||
    visibleBody.shapeSchema !== PROCEDURAL_BODY_SHAPE_SCHEMA
  ) {
    throw new Error(
      'live-Hill admission does not carry the reviewed procedural Lerm body',
    );
  }
  if (
    admission.traversal.orderedRootCount < 2 ||
    admission.traversal.liveRootWorld.length !==
      admission.traversal.orderedRootCount ||
    admission.traversal.admittedHistory.samples.length !==
      admission.traversal.orderedRootCount
  ) {
    throw new Error('live-Hill admission root accounting is incomplete');
  }
}

function normalizePhase(value: number): number {
  const tau = Math.PI * 2;
  return round(((value % tau) + tau) % tau, 6);
}

function round(value: number, digits = 6): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function vec3Equal(left: readonly number[], right: readonly number[]): boolean {
  return (
    left.length === 3 &&
    right.length === 3 &&
    left.every((value, index) => value === right[index])
  );
}

function requireClaim(value: boolean, message: string): asserts value {
  if (!value) throw new Error(message);
}
