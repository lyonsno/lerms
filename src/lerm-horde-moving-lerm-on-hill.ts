import {
  FIRST_VERTICAL_INTERFACE_SCHEMA,
  LERM_STATE_SCHEMA,
  SOURCE_TRUTH_SCHEMA,
  TERRAIN_SAMPLE_SCHEMA,
  assertFirstVerticalFrame,
  type FirstVerticalFrame,
  type LermState,
  type SourceTruth,
  type Vec3,
} from './contracts/first-vertical.ts';

export const LERM_HORDE_MOVING_LERM_ON_HILL_SCHEMA =
  'lerms.lerm-horde.moving-lerm-on-hill.v0' as const;
export const LERM_HORDE_MOVING_LERM_HILL_REVISION =
  'fd052b64e5cb27502873847d946e9e19197eb59a' as const;

export interface MovingLermRouteIdentity {
  requestedRoute: string;
  effectiveRoute: string;
  backend: string;
  configId: string;
  fallbackStatus: 'none' | 'fallback';
  staleStatus: 'fresh' | 'stale';
  partialStatus: 'complete' | 'partial';
}

export interface MovingLermArtifactHandle {
  schema: string;
  path: string;
  sha256: string;
  sourceRevision: string;
  routeIdentity: MovingLermRouteIdentity;
}

export interface MovingLermIdentity {
  actorId: string;
  assetIdentity: string;
  speciesIdentity: 'lerms.red-lerm.v0';
  bodySchemaIdentity: string;
  registrationId: string;
}

export interface MovingLermMotionSample {
  timestampMs: number;
  poseSampleId: string;
  poseFingerprint: string;
  rootWorld: Vec3;
  supportWorld: Vec3;
  heading: Vec3;
  terrainNormal: Vec3;
  terrainSlope: number;
  state: LermState['state'];
}

export interface MovingLermOnHillInput {
  schema: typeof LERM_HORDE_MOVING_LERM_ON_HILL_SCHEMA;
  lermsRevision: typeof LERM_HORDE_MOVING_LERM_HILL_REVISION;
  hill: {
    revision: typeof LERM_HORDE_MOVING_LERM_HILL_REVISION;
    route: string;
    authority: 'live_simulation';
    fallbackStatus: 'none';
    staleStatus: 'fresh';
    replaySchema: string;
  };
  identity: MovingLermIdentity;
  body: MovingLermArtifactHandle & {
    representationKind: 'authored_procedural' | 'generated_mesh_imported';
    assetIdentity: string;
    registrationId: string;
  };
  rig: MovingLermArtifactHandle & {
    assetIdentity: string;
    registrationId: string;
  };
  support: MovingLermArtifactHandle & {
    assetIdentity: string;
    registrationId: string;
    hillRevision: typeof LERM_HORDE_MOVING_LERM_HILL_REVISION;
  };
  motion: MovingLermArtifactHandle & {
    assetIdentity: string;
    registrationId: string;
    samples: readonly MovingLermMotionSample[];
  };
  behavior: {
    route: string;
    backend: string;
    configId: string;
  };
}

export interface MovingLermTimelineFrame {
  timestampMs: number;
  poseSampleId: string;
  poseFingerprint: string;
  bodyRootWorld: Vec3;
  supportWorld: Vec3;
  lerm: LermState;
  firstVerticalFrame: FirstVerticalFrame;
}

export interface MovingLermOnHillComposition {
  schema: typeof LERM_HORDE_MOVING_LERM_ON_HILL_SCHEMA;
  evidenceClass: 'producer_fitted_moving_lerm';
  identity: MovingLermIdentity;
  sources: {
    lermsRevision: typeof LERM_HORDE_MOVING_LERM_HILL_REVISION;
    hillRevision: typeof LERM_HORDE_MOVING_LERM_HILL_REVISION;
    hillReplaySchema: string;
    body: MovingLermArtifactHandle;
    rig: MovingLermArtifactHandle;
    support: MovingLermArtifactHandle;
    motion: MovingLermArtifactHandle;
  };
  timeline: readonly MovingLermTimelineFrame[];
  assertions: {
    exactLandedHill: true;
    actualLermIdentity: true;
    stableActorIdentity: true;
    dynamicRootMotion: true;
    dynamicPoseMotion: true;
    sourceIdentityPreserved: true;
    routeIdentityPreserved: true;
    rootSupportAligned: true;
  };
}

export function composeMovingLermOnHill(
  input: MovingLermOnHillInput,
): MovingLermOnHillComposition {
  validateInput(input);

  const timeline = input.motion.samples.map((sample, index) =>
    buildTimelineFrame(input, sample, index),
  );

  return {
    schema: LERM_HORDE_MOVING_LERM_ON_HILL_SCHEMA,
    evidenceClass: 'producer_fitted_moving_lerm',
    identity: { ...input.identity },
    sources: {
      lermsRevision: input.lermsRevision,
      hillRevision: input.hill.revision,
      hillReplaySchema: input.hill.replaySchema,
      body: artifactHandle(input.body),
      rig: artifactHandle(input.rig),
      support: artifactHandle(input.support),
      motion: artifactHandle(input.motion),
    },
    timeline,
    assertions: {
      exactLandedHill: true,
      actualLermIdentity: true,
      stableActorIdentity: true,
      dynamicRootMotion: true,
      dynamicPoseMotion: true,
      sourceIdentityPreserved: true,
      routeIdentityPreserved: true,
      rootSupportAligned: true,
    },
  };
}

function validateInput(input: MovingLermOnHillInput): void {
  if (input.schema !== LERM_HORDE_MOVING_LERM_ON_HILL_SCHEMA) {
    throw new Error(`composition schema must be ${LERM_HORDE_MOVING_LERM_ON_HILL_SCHEMA}`);
  }
  if (input.lermsRevision !== LERM_HORDE_MOVING_LERM_HILL_REVISION) {
    throw new Error(`LERMS revision must be landed ${LERM_HORDE_MOVING_LERM_HILL_REVISION}`);
  }
  if (input.hill.revision !== LERM_HORDE_MOVING_LERM_HILL_REVISION) {
    throw new Error(`Hill revision must be landed ${LERM_HORDE_MOVING_LERM_HILL_REVISION}`);
  }
  requireString(input.hill.route, 'hill.route');
  requireString(input.hill.replaySchema, 'hill.replaySchema');
  if (
    input.hill.authority !== 'live_simulation' ||
    input.hill.fallbackStatus !== 'none' ||
    input.hill.staleStatus !== 'fresh'
  ) {
    throw new Error('Hill evidence must be live, fresh, and non-fallback');
  }

  requireString(input.identity.actorId, 'identity.actorId');
  requireString(input.identity.assetIdentity, 'identity.assetIdentity');
  requireString(input.identity.bodySchemaIdentity, 'identity.bodySchemaIdentity');
  requireString(input.identity.registrationId, 'identity.registrationId');
  if (input.identity.speciesIdentity !== 'lerms.red-lerm.v0') {
    throw new Error('species identity must be lerms.red-lerm.v0');
  }
  if (input.identity.assetIdentity === 'producer-control-non-lerm') {
    throw new Error('producer control identity cannot be promoted to a Lerm body');
  }
  if (
    input.body.representationKind !== 'authored_procedural' &&
    input.body.representationKind !== 'generated_mesh_imported'
  ) {
    throw new Error('body representation must be a non-fixture imported or authored body');
  }

  const artifacts = [
    ['body', input.body],
    ['rig', input.rig],
    ['support', input.support],
    ['motion', input.motion],
  ] as const;
  for (const [label, artifact] of artifacts) {
    validateArtifact(label, artifact);
    if (artifact.assetIdentity !== input.identity.assetIdentity) {
      throw new Error(`${label} asset identity mismatch`);
    }
    if (artifact.registrationId !== input.identity.registrationId) {
      throw new Error(`${label} registration identity mismatch`);
    }
  }
  if (input.support.hillRevision !== LERM_HORDE_MOVING_LERM_HILL_REVISION) {
    throw new Error(`support Hill revision must be landed ${LERM_HORDE_MOVING_LERM_HILL_REVISION}`);
  }
  if (input.support.schema !== 'kaminos.motion-contact-constraints.v0') {
    throw new Error('support schema must be kaminos.motion-contact-constraints.v0');
  }
  requireString(input.behavior.route, 'behavior.route');
  requireString(input.behavior.backend, 'behavior.backend');
  requireString(input.behavior.configId, 'behavior.configId');

  validateMotionSamples(input.motion.samples);
}

function validateArtifact(label: string, artifact: MovingLermArtifactHandle): void {
  requireString(artifact.schema, `${label}.schema`);
  requireString(artifact.path, `${label}.path`);
  requireString(artifact.sourceRevision, `${label}.sourceRevision`);
  if (!/^[a-f0-9]{64}$/.test(artifact.sha256)) {
    throw new Error(`${label}.sha256 must be a lowercase SHA-256`);
  }
  const route = artifact.routeIdentity;
  requireString(route.requestedRoute, `${label}.routeIdentity.requestedRoute`);
  requireString(route.effectiveRoute, `${label}.routeIdentity.effectiveRoute`);
  requireString(route.backend, `${label}.routeIdentity.backend`);
  requireString(route.configId, `${label}.routeIdentity.configId`);
  if (route.requestedRoute !== route.effectiveRoute) {
    throw new Error(`${label} requested/effective route identity mismatch`);
  }
  if (route.fallbackStatus !== 'none') {
    throw new Error(`${label} route is fallback`);
  }
  if (route.staleStatus !== 'fresh') {
    throw new Error(`${label} route is stale`);
  }
  if (route.partialStatus !== 'complete') {
    throw new Error(`${label} route is partial`);
  }
}

function validateMotionSamples(samples: readonly MovingLermMotionSample[]): void {
  if (samples.length < 2) {
    throw new Error('motion evidence requires at least two time samples');
  }
  const poseSampleIds = new Set<string>();
  const poseFingerprints = new Set<string>();
  const rootKeys = new Set<string>();

  samples.forEach((sample, index) => {
    if (!Number.isFinite(sample.timestampMs)) {
      throw new Error(`motion.samples[${index}].timestampMs must be finite`);
    }
    if (index > 0 && sample.timestampMs <= samples[index - 1].timestampMs) {
      throw new Error('motion timestamps must be strictly increasing');
    }
    requireString(sample.poseSampleId, `motion.samples[${index}].poseSampleId`);
    requireString(sample.poseFingerprint, `motion.samples[${index}].poseFingerprint`);
    if (poseSampleIds.has(sample.poseSampleId)) {
      throw new Error(`duplicate pose sample id ${sample.poseSampleId}`);
    }
    poseSampleIds.add(sample.poseSampleId);
    poseFingerprints.add(sample.poseFingerprint);
    assertVec3(sample.rootWorld, `motion.samples[${index}].rootWorld`);
    assertVec3(sample.supportWorld, `motion.samples[${index}].supportWorld`);
    assertVec3(sample.heading, `motion.samples[${index}].heading`);
    assertVec3(sample.terrainNormal, `motion.samples[${index}].terrainNormal`);
    if (!Number.isFinite(sample.terrainSlope)) {
      throw new Error(`motion.samples[${index}].terrainSlope must be finite`);
    }
    rootKeys.add(sample.rootWorld.join(','));
  });

  if (rootKeys.size < 2) {
    throw new Error('motion samples do not move the body root');
  }
  if (poseFingerprints.size < 2) {
    throw new Error('motion samples do not change body pose');
  }
}

function buildTimelineFrame(
  input: MovingLermOnHillInput,
  sample: MovingLermMotionSample,
  index: number,
): MovingLermTimelineFrame {
  const frameId = `${input.identity.actorId}:${sample.poseSampleId}`;
  const source: SourceTruth = {
    schema: SOURCE_TRUTH_SCHEMA,
    authority: 'visual_only',
    route: input.behavior.route,
    frameId,
    timestampMs: sample.timestampMs,
    sampleAgeMs: 0,
    backend: input.behavior.backend,
    configId: input.behavior.configId,
  };
  const hillSource: SourceTruth = {
    schema: SOURCE_TRUTH_SCHEMA,
    authority: input.hill.authority,
    route: input.hill.route,
    frameId: `hill:${frameId}`,
    timestampMs: sample.timestampMs,
    sampleAgeMs: 0,
    backend: 'hill-of-hills-producer-history',
    configId: input.hill.revision,
  };
  const terrainSampleId = `hill-support:${input.identity.actorId}:${index}`;
  const lerm: LermState = {
    schema: LERM_STATE_SCHEMA,
    id: input.identity.actorId,
    source,
    species: 'red',
    state: sample.state,
    world: sample.rootWorld,
    heading: sample.heading,
    terrainContact: {
      terrainSampleId,
      grounded: true,
      contactWorld: sample.supportWorld,
    },
  };
  const firstVerticalFrame: FirstVerticalFrame = {
    schema: FIRST_VERTICAL_INTERFACE_SCHEMA,
    source,
    terrainSamples: [{
      schema: TERRAIN_SAMPLE_SCHEMA,
      id: terrainSampleId,
      source: hillSource,
      world: sample.supportWorld,
      normal: sample.terrainNormal,
      height: sample.supportWorld[1],
      slope: sample.terrainSlope,
      region: 'slope',
    }],
    lerms: [lerm],
    goins: [],
    juiceHits: [],
    carrierDropEvents: [],
  };
  assertFirstVerticalFrame(firstVerticalFrame);
  return {
    timestampMs: sample.timestampMs,
    poseSampleId: sample.poseSampleId,
    poseFingerprint: sample.poseFingerprint,
    bodyRootWorld: sample.rootWorld,
    supportWorld: sample.supportWorld,
    lerm,
    firstVerticalFrame,
  };
}

function artifactHandle(artifact: MovingLermArtifactHandle): MovingLermArtifactHandle {
  return {
    schema: artifact.schema,
    path: artifact.path,
    sha256: artifact.sha256,
    sourceRevision: artifact.sourceRevision,
    routeIdentity: { ...artifact.routeIdentity },
  };
}

function requireString(value: string, label: string): void {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} is required`);
  }
}

function assertVec3(value: Vec3, label: string): void {
  if (!Array.isArray(value) || value.length !== 3 || value.some((item) => !Number.isFinite(item))) {
    throw new Error(`${label} must be a finite Vec3`);
  }
}
