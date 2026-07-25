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
export const LERM_HORDE_REVIEWED_LIVE_BODY_MOTION_REVISION =
  'fe350b65c8e5e765b496e332b56419c99e7347bd' as const;
export const LERM_HORDE_SAME_SCENE_VERIFICATION_SCHEMA =
  'lerms.lerm-horde.same-scene-consumer-verification.v0' as const;

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
    sameSceneConsumerExerciseTruth: false;
    perFrameIncrementalAdmissionTruth: false;
    liveContactTruth: false;
    producerRigMotionTruth: false;
    morphologyPortability: false;
  };
  fallbackStatus: 'none';
  staleStatus: 'fresh';
  partialStatus: 'complete-root-only';
}

export interface LermHordeSameSceneConsumerEvidence {
  authority: 'synthetic_verifier_fixture' | 'hill_consumer_execution';
  source: {
    requestedRoute: string;
    effectiveRoute: string;
    hillRevision: string;
    hordeComponentRevision: string;
    actorId: string;
    bodySourceRevision: string;
    bodySha256: string;
    hillEvidenceReportPath: string;
    hillEvidenceReportSha256: string;
  };
  world: {
    coordinateSpace: 'x-y-z-world';
    actualHillTerrain: true;
    commonWorldView: true;
    sceneId: string;
    viewId: string;
    cameraChecksum: string;
    renderLayout: 'single_common_world_view';
  };
  frames: readonly LermHordeSameSceneFrame[];
  witness: {
    requestedOutputPath: string;
    effectiveOutputPath: string;
    outputSha256: string;
    frameCount: number;
    dynamic: true;
    blank: false;
    cached: false;
    frameImageSha256s: readonly string[];
  };
  fallbackStatus: 'none';
  staleStatus: 'fresh';
  partialStatus: 'complete';
}

export interface LermHordeSameSceneFrame {
  sequence: number;
  timestampMs: number;
  body:
    | {
        present: true;
        rootWorld: Vec3;
        heading: Vec3;
        poseFingerprint: string;
      }
    | { present: false };
  history: {
    admittedSampleCount: number;
    admittedThroughTimestampMs: number | null;
    admittedSampleIdentities: readonly string[];
    prefixChecksum: string;
  };
  pressure: {
    visible: boolean;
    sourcePrefixChecksum: string;
    trafficChecksum: string;
  };
  hill: {
    revision: string;
    terrainSourceId: string;
    sampleChecksum: string;
    topologyChecksum: string;
  };
  render: {
    sceneId: string;
    viewId: string;
    cameraChecksum: string;
    layout: 'single_common_world_view';
    frameImageSha256: string;
    layers: readonly string[];
  };
}

export interface LermHordeSameSceneVerification {
  ok: true;
  schema: typeof LERM_HORDE_SAME_SCENE_VERIFICATION_SCHEMA;
  machineContractAccepted: true;
  visualOutcomeAccepted: boolean;
  pending: readonly (
    | 'hill_consumer_execution'
    | 'horde_visual_inspection'
  )[];
  assertions: {
    exactHordeComponent: true;
    exactBodySource: true;
    exactBodySamples: true;
    actualHillCommonWorld: true;
    prefixHistoryAligned: true;
    pressureAccumulatesDuringTraversal: true;
    bodyDeparts: true;
    pressurePersistsAfterDeparture: true;
    witnessOutputComplete: true;
    independentHordeInspection: boolean;
  };
  claimBoundary: {
    liveContactTruth: false;
    producerRigMotionTruth: false;
    morphologyPortability: false;
  };
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
    const foreAft = Math.cos(phase);
    const compression = Math.cos(phase * 2);
    const bobWorld = round(
      0.035 +
        0.022 * Math.abs(stride) +
        0.008 * ((1 - foreAft) * 0.5),
    );
    const scaleX = round(
      1 + compression * 0.05 + stride * 0.02 + foreAft * 0.025,
    );
    const scaleY = round(
      1 - compression * 0.07 + stride * 0.025 - foreAft * 0.02,
    );
    const leftReach = round(stride * MAX_LEG_REACH_WORLD);
    const rightReach = round(-leftReach);
    const leftLift = round(Math.max(0, -stride) * MAX_LEG_LIFT_WORLD);
    const rightLift = round(Math.max(0, stride) * MAX_LEG_LIFT_WORLD);
    const leanRadians = round(
      clamp(
        sample.root.tangent[1] * 0.35 +
          stride * 0.045 +
          foreAft * 0.012,
        -0.14,
        0.14,
      ),
    );
    const rootWorld = admission.traversal.liveRootWorld[sequence];
    const centerWorld: Vec3 = [
      rootWorld[0],
      round(rootWorld[1] + bobWorld),
      rootWorld[2],
    ];
    const poseFingerprint = [
      `b${round(bobWorld, 3)}`,
      `s${round(scaleX, 3)}:${round(scaleY, 3)}`,
      `l${round(leftReach, 3)}:${round(leftLift, 3)}`,
      `r${round(rightReach, 3)}:${round(rightLift, 3)}`,
      `n${round(leanRadians, 3)}`,
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
    new Set(samples.map(({ poseFingerprint }) => poseFingerprint)).size >= 4;
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
      sameSceneConsumerExerciseTruth: false,
      perFrameIncrementalAdmissionTruth: false,
      liveContactTruth: false,
      producerRigMotionTruth: false,
      morphologyPortability: false,
    },
    fallbackStatus: 'none',
    staleStatus: 'fresh',
    partialStatus: 'complete-root-only',
  };
}

export function verifyLermHordeSameSceneConsumerEvidence(
  motion: LermHordeLiveBodyMotionComposition,
  evidence: LermHordeSameSceneConsumerEvidence,
): LermHordeSameSceneVerification {
  if (arguments.length > 2) {
    throw new Error(
      'same-scene verifier does not accept a declarative inspection object',
    );
  }
  requireClaim(
    motion?.ok === true &&
      motion.schema === LERM_HORDE_LIVE_BODY_MOTION_SCHEMA &&
      motion.claimBoundary.sameSceneConsumerExerciseTruth === false &&
      motion.claimBoundary.perFrameIncrementalAdmissionTruth === false,
    'same-scene verification requires the bounded Horde body-motion component',
  );
  requireClaim(
    evidence?.fallbackStatus === 'none' &&
      evidence.staleStatus === 'fresh' &&
      evidence.partialStatus === 'complete',
    'same-scene evidence must be fresh, complete, and non-fallback',
  );
  requireClaim(
    evidence.authority === 'synthetic_verifier_fixture' ||
      evidence.authority === 'hill_consumer_execution',
    'same-scene evidence authority is unsupported',
  );
  requireClaim(
    evidence.source.requestedRoute.length > 0 &&
      evidence.source.requestedRoute === evidence.source.effectiveRoute,
    'same-scene requested and effective route must match',
  );
  requireClaim(
    evidence.source.hillRevision === motion.source.admission.hillRevision,
    'same-scene evidence Hill revision does not match the motion component',
  );
  requireClaim(
    evidence.source.hordeComponentRevision ===
      LERM_HORDE_REVIEWED_LIVE_BODY_MOTION_REVISION,
    'same-scene evidence Horde component revision does not match reviewed fe350b6',
  );
  requireClaim(
    evidence.source.actorId === motion.source.admission.actorId,
    'same-scene evidence actor identity does not match the motion component',
  );
  requireClaim(
    evidence.source.bodySourceRevision === motion.source.body.sourceRevision &&
      evidence.source.bodySha256 === motion.source.body.sha256,
    'same-scene evidence body source does not match the motion component',
  );
  requireClaim(
    evidence.source.hillEvidenceReportPath.length > 0 &&
      isSha256(evidence.source.hillEvidenceReportSha256),
    'same-scene Hill evidence report identity is missing',
  );
  requireClaim(
    evidence.world.coordinateSpace === 'x-y-z-world' &&
      evidence.world.actualHillTerrain === true &&
      evidence.world.commonWorldView === true &&
      evidence.world.sceneId.length > 0 &&
      evidence.world.viewId.length > 0 &&
      isSha256(evidence.world.cameraChecksum) &&
      evidence.world.renderLayout === 'single_common_world_view',
    'same-scene evidence does not use the actual Hill in a common world view',
  );
  requireClaim(
    evidence.frames.length === motion.samples.length + 1,
    'same-scene evidence needs one body frame per sample plus departure',
  );

  const movingFrames = evidence.frames.slice(0, motion.samples.length);
  const expectedSampleIdentities = motion.samples.map(
    deriveLermHordeSameSceneSampleIdentity,
  );
  const terrainSourceId = movingFrames[0]?.hill.terrainSourceId;
  movingFrames.forEach((frame, index) => {
    const sample = motion.samples[index];
    const expectedPrefixIdentities = expectedSampleIdentities.slice(
      0,
      index + 1,
    );
    const expectedPrefixChecksum =
      deriveLermHordeSameScenePrefixChecksum(expectedPrefixIdentities);
    requireClaim(
      frame.sequence === index && frame.timestampMs === sample.timestampMs,
      'same-scene frame order or timestamp does not match body motion',
    );
    requireClaim(
      frame.body.present === true,
      'same-scene body presence is missing during traversal',
    );
    requireClaim(
      vec3Equal(frame.body.rootWorld, sample.rootWorld),
      'same-scene body root does not match the exact Horde sample',
    );
    requireClaim(
      vec3Equal(frame.body.heading, sample.heading) &&
        frame.body.poseFingerprint === sample.poseFingerprint,
      'same-scene body heading or pose does not match the exact Horde sample',
    );
    requireClaim(
      frame.history.admittedSampleCount === index + 1 &&
        frame.history.admittedThroughTimestampMs === sample.timestampMs,
      'same-scene prefix history is not aligned to the current body timestamp',
    );
    requireClaim(
      arraysEqual(
        frame.history.admittedSampleIdentities,
        expectedPrefixIdentities,
      ) &&
        frame.history.prefixChecksum === expectedPrefixChecksum,
      'same-scene prefix sample identities do not match the exact Horde prefix',
    );
    requireClaim(
      frame.pressure.visible === true &&
        isSha256(frame.pressure.trafficChecksum) &&
        frame.pressure.sourcePrefixChecksum === expectedPrefixChecksum,
      'same-scene pressure is missing during traversal',
    );
    requireClaim(
      frame.hill.revision === evidence.source.hillRevision &&
        frame.hill.terrainSourceId === terrainSourceId &&
        terrainSourceId.length > 0 &&
        isSha256(frame.hill.sampleChecksum) &&
        isSha256(frame.hill.topologyChecksum),
      'same-scene frame Hill source identity is missing or inconsistent',
    );
    requireClaim(
      frame.render.sceneId === evidence.world.sceneId &&
        frame.render.viewId === evidence.world.viewId &&
        frame.render.cameraChecksum === evidence.world.cameraChecksum &&
        frame.render.layout === 'single_common_world_view' &&
        isSha256(frame.render.frameImageSha256) &&
        includesAll(
          frame.render.layers,
          'actual_hill',
          'lerm_body',
          'prefix_pressure',
        ),
      'same-scene frame is not one single common-world render',
    );
  });
  requireClaim(
    new Set(
      movingFrames.map(({ pressure }) => pressure.trafficChecksum),
    ).size === movingFrames.length,
    'same-scene pressure does not accumulate during traversal',
  );

  const departure = evidence.frames.at(-1)!;
  const finalSample = motion.samples.at(-1)!;
  const finalMovingFrame = movingFrames.at(-1)!;
  requireClaim(
    departure.sequence === motion.samples.length &&
      departure.timestampMs > finalSample.timestampMs &&
      departure.body.present === false,
    'same-scene departure must remove the body after the final sample',
  );
  requireClaim(
    departure.history.admittedSampleCount === motion.samples.length &&
      departure.history.admittedThroughTimestampMs ===
        finalSample.timestampMs &&
      arraysEqual(
        departure.history.admittedSampleIdentities,
        expectedSampleIdentities,
      ) &&
      departure.history.prefixChecksum ===
        deriveLermHordeSameScenePrefixChecksum(expectedSampleIdentities),
    'same-scene departure lost the complete admitted prefix',
  );
  requireClaim(
    departure.pressure.visible === true &&
      departure.pressure.sourcePrefixChecksum ===
        departure.history.prefixChecksum &&
      departure.pressure.trafficChecksum ===
        finalMovingFrame.pressure.trafficChecksum,
    'same-scene pressure persistence was lost after departure',
  );
  requireClaim(
    departure.hill.revision === evidence.source.hillRevision &&
      departure.hill.terrainSourceId === terrainSourceId &&
      departure.hill.sampleChecksum === finalMovingFrame.hill.sampleChecksum &&
      departure.hill.topologyChecksum ===
        finalMovingFrame.hill.topologyChecksum,
    'same-scene departure changed or lost Hill source identity',
  );
  requireClaim(
    departure.render.sceneId === evidence.world.sceneId &&
      departure.render.viewId === evidence.world.viewId &&
      departure.render.cameraChecksum === evidence.world.cameraChecksum &&
      departure.render.layout === 'single_common_world_view' &&
      isSha256(departure.render.frameImageSha256) &&
      includesAll(
        departure.render.layers,
        'actual_hill',
        'prefix_pressure',
      ) &&
      !departure.render.layers.includes('lerm_body'),
    'same-scene departure is not the same common-world render without the body',
  );
  requireClaim(
    evidence.witness.requestedOutputPath.length > 0 &&
      evidence.witness.requestedOutputPath ===
        evidence.witness.effectiveOutputPath,
    'same-scene requested and effective witness output must match',
  );
  requireClaim(
    /^[a-f0-9]{64}$/.test(evidence.witness.outputSha256) &&
      evidence.witness.frameCount === evidence.frames.length &&
      evidence.witness.dynamic === true &&
      evidence.witness.blank === false &&
      evidence.witness.cached === false &&
      arraysEqual(
        evidence.witness.frameImageSha256s,
        evidence.frames.map(({ render }) => render.frameImageSha256),
      ),
    'same-scene witness output is missing, blank, cached, or partial',
  );

  const pending: Array<
    'hill_consumer_execution' | 'horde_visual_inspection'
  > = [];
  if (evidence.authority !== 'hill_consumer_execution') {
    pending.push('hill_consumer_execution');
  }
  pending.push('horde_visual_inspection');

  return {
    ok: true,
    schema: LERM_HORDE_SAME_SCENE_VERIFICATION_SCHEMA,
    machineContractAccepted: true,
    visualOutcomeAccepted: false,
    pending,
    assertions: {
      exactHordeComponent: true,
      exactBodySource: true,
      exactBodySamples: true,
      actualHillCommonWorld: true,
      prefixHistoryAligned: true,
      pressureAccumulatesDuringTraversal: true,
      bodyDeparts: true,
      pressurePersistsAfterDeparture: true,
      witnessOutputComplete: true,
      independentHordeInspection: false,
    },
    claimBoundary: {
      liveContactTruth: false,
      producerRigMotionTruth: false,
      morphologyPortability: false,
    },
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

export function deriveLermHordeSameSceneSampleIdentity(
  sample: LermHordeLiveBodyMotionSample,
): string {
  return `sample-${fnv1a32(JSON.stringify([
    sample.sequence,
    sample.timestampMs,
    sample.rootWorld,
    sample.heading,
    sample.poseFingerprint,
  ]))}`;
}

export function deriveLermHordeSameScenePrefixChecksum(
  sampleIdentities: readonly string[],
): string {
  return `prefix-${fnv1a32(JSON.stringify(sampleIdentities))}`;
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function arraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function includesAll(values: readonly string[], ...required: string[]): boolean {
  return required.every((value) => values.includes(value));
}

function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

function requireClaim(value: boolean, message: string): asserts value {
  if (!value) throw new Error(message);
}
