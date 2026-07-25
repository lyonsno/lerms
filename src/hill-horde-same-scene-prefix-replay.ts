import {
  HILL_HORDE_LIVE_TRAVERSAL_ADMISSION_SCHEMA,
  HILL_HORDE_LIVE_TRAVERSAL_ROUTE,
  HILL_HORDE_REVIEWED_SOURCE_REVISION,
  type HillHordeLiveTraversalAdmissionReceipt,
} from './hill-horde-live-traversal-admission.js';
import {
  LERM_HORDE_LIVE_BODY_MOTION_ROUTE,
  LERM_HORDE_LIVE_BODY_MOTION_SCHEMA,
  LERM_HORDE_REVIEWED_LIVE_HILL_REVISION,
  LermHordeLiveBodyMotionComposition,
  LermHordeLiveBodyMotionSample,
} from './lerm-horde-live-body-motion.js';
import type { HillOfHillsProducerContactHistory } from './terrain/hill-of-hills-producer-contact-history.js';
import {
  sampleHillOfHillsProducerTrafficField,
} from './terrain/hill-of-hills-producer-contact-history.js';
import {
  createHillOfHillsLayerTileCache,
  createHillOfHillsTerrainWithCache,
  type HillOfHillsSourceOptions,
  type HillOfHillsTerrain,
} from './terrain/hill-of-hills.js';

export const HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_SCHEMA =
  'lerms.hill-of-hills.horde-same-scene-prefix-replay.v0' as const;
export const HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_ROUTE =
  'lerms/hill-of-hills/horde-same-scene-prefix-replay' as const;

const WIDTH = 2160;
const HEIGHT = 1080;
const PANEL_COLUMNS = 6;
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 360;
const REVIEWED_HILL_ROUTE = 'hill-of-hills/horde-live-traversal-admission';
const REVIEWED_HILL_BACKEND = 'deterministic-cpu-heightfield';
const REVIEWED_HILL_CONFIG = 'horde-live-traversal-admission-v0';

export interface HillHordeSameScenePrefixFrame {
  index: number;
  kind:
    | 'no-history-control'
    | 'actor-prefix'
    | 'actor-departed'
    | 'after-departure';
  timestampMs: number;
  prefixSampleCount: number;
  actor: LermHordeLiveBodyMotionSample | null;
  terrain: HillOfHillsTerrain;
  sameSceneTerrainAndActor: true;
  claimBoundary: {
    rootRailMotionTruth: true;
    liveCurrentHillTruth: true;
    topologyResponseTruth: true;
    bodyArticulationTruth: true;
    prefixTimeAdmissionTruth: true;
    sameScenePresentationTruth: true;
    liveContactTruth: false;
    producerRigMotionTruth: false;
    morphologyPortability: false;
  };
}

export interface HillHordeSameScenePrefixReplay {
  ok: true;
  schema: typeof HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_SCHEMA;
  route: typeof HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_ROUTE;
  phase: 'complete';
  evidenceClass: 'same_scene_actual_hill_prefix_time_replay';
  source: {
    hillRevision: string;
    hordeRevision: string;
    bodySourceRevision: string;
    actorId: string;
  };
  frames: readonly HillHordeSameScenePrefixFrame[];
  assertions: {
    exactBodyMotionConsumed: true;
    actorAndTerrainShareWorldScene: true;
    prefixHistoryOnly: true;
    prefixExposureStrictlyGrows: true;
    completePrefixMatchesReviewedTraffic: true;
    pressurePersistsAfterDeparture: true;
    noHistoryControlDistinct: true;
  };
  fallbackStatus: 'none';
  staleStatus: 'fresh';
  partialStatus: 'complete-root-only';
}

export function createHillHordeSameScenePrefixReplay(
  admission: HillHordeLiveTraversalAdmissionReceipt,
  motion: LermHordeLiveBodyMotionComposition,
): HillHordeSameScenePrefixReplay {
  validateSources(admission, motion);

  const prefixFrames = motion.samples.map((actor, sequence) => {
    const prefixSampleCount = sequence + 1;
    const { terrain } = terrainForPrefix(
      admission,
      prefixSampleCount,
      sequence === motion.samples.length - 1,
    );
    return frame(
      sequence + 1,
      'actor-prefix',
      actor.timestampMs,
      prefixSampleCount,
      actor,
      terrain,
    );
  });
  const finalPrefix = prefixFrames.at(-1);
  if (!finalPrefix) throw new Error('same-scene replay requires a final prefix frame');

  const finalCache = createHillOfHillsLayerTileCache();
  const prior = createPrior(finalCache, admission);
  assertPriorIdentity(prior, admission);
  createPrefixTerrain(finalCache, admission, admission.traversal.admittedHistory, true);
  const afterDeparture = createHillOfHillsTerrainWithCache(
    finalCache,
    {
      ...admission.terrains.afterDeparture.params,
      topologyPhaseTimeMs: admission.terrains.afterDeparture.params.topologyPhaseTimeMs,
    },
    sourceFor(
      admission,
      admission.hill.effective.postDepartureFrameId,
      Math.max(1230, motion.samples.at(-1)?.timestampMs ?? 1230),
    ),
  );

  const frames: HillHordeSameScenePrefixFrame[] = [
    frame(
      0,
      'no-history-control',
      0,
      0,
      null,
      admission.terrains.control,
    ),
    ...prefixFrames,
    frame(
      prefixFrames.length + 1,
      'actor-departed',
      (motion.samples.at(-1)?.timestampMs ?? 0) + 1,
      admission.traversal.orderedRootCount,
      null,
      finalPrefix.terrain,
    ),
    frame(
      prefixFrames.length + 2,
      'after-departure',
      Math.max(1230, (motion.samples.at(-1)?.timestampMs ?? 0) + 520),
      admission.traversal.orderedRootCount,
      null,
      afterDeparture,
    ),
  ];

  const exposures = prefixFrames.map(
    ({ terrain }) => terrain.witness.producerTrafficExposureSeconds,
  );
  const prefixExposureStrictlyGrows = exposures.every(
    (value, index) => index === 0 || value > exposures[index - 1],
  );
  const completePrefixMatchesReviewedTraffic =
    finalPrefix.terrain.witness.producerTrafficFieldChecksum ===
    admission.persistence.trafficChecksumAtAdmission;
  const pressurePersistsAfterDeparture =
    afterDeparture.witness.producerTrafficFieldChecksum ===
    finalPrefix.terrain.witness.producerTrafficFieldChecksum;
  const noHistoryControlDistinct =
    frames[0].terrain.witness.producerTrafficFieldRange.max === 0 &&
    frames[0].terrain.witness.topologyPossibilityChecksum !==
      afterDeparture.witness.topologyPossibilityChecksum;

  requireClaim(
    exposures[0] === 0 && prefixExposureStrictlyGrows,
    'prefix replay exposed completed or non-growing history before motion elapsed',
  );
  requireClaim(
    completePrefixMatchesReviewedTraffic,
    'complete prefix does not reproduce reviewed admitted traffic',
  );
  requireClaim(
    pressurePersistsAfterDeparture,
    'prefix replay lost pressure when the actor departed',
  );
  requireClaim(
    noHistoryControlDistinct,
    'prefix replay no-history control is not distinct',
  );

  return {
    ok: true,
    schema: HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_SCHEMA,
    route: HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_ROUTE,
    phase: 'complete',
    evidenceClass: 'same_scene_actual_hill_prefix_time_replay',
    source: {
      hillRevision: admission.hill.targetRevision,
      hordeRevision: admission.source.horde.revision,
      bodySourceRevision: motion.source.body.sourceRevision,
      actorId: admission.source.horde.actorId,
    },
    frames,
    assertions: {
      exactBodyMotionConsumed: true,
      actorAndTerrainShareWorldScene: true,
      prefixHistoryOnly: true,
      prefixExposureStrictlyGrows: true,
      completePrefixMatchesReviewedTraffic: true,
      pressurePersistsAfterDeparture: true,
      noHistoryControlDistinct: true,
    },
    fallbackStatus: 'none',
    staleStatus: 'fresh',
    partialStatus: 'complete-root-only',
  };
}

export function renderHillHordeSameScenePrefixReplaySvg(
  replay: HillHordeSameScenePrefixReplay,
): string {
  const panels = replay.frames.map(renderPanel).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" data-schema="${replay.schema}" data-route="${replay.route}"><rect width="100%" height="100%" fill="#06100d"/>${panels}</svg>`;
}

export function renderHillHordeSameScenePrefixFrameSvg(
  frame: HillHordeSameScenePrefixFrame,
): string {
  const localFrame = { ...frame, index: 0 };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PANEL_WIDTH}" height="${PANEL_HEIGHT}" viewBox="0 0 ${PANEL_WIDTH} ${PANEL_HEIGHT}" data-schema="${HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_SCHEMA}" data-route="${HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_ROUTE}" data-frame-index="${frame.index}"><rect width="100%" height="100%" fill="#06100d"/>${renderPanel(localFrame)}</svg>`;
}

function terrainForPrefix(
  admission: HillHordeLiveTraversalAdmissionReceipt,
  prefixSampleCount: number,
  finalFrame: boolean,
): { terrain: HillOfHillsTerrain } {
  const cache = createHillOfHillsLayerTileCache();
  const prior = createPrior(cache, admission);
  assertPriorIdentity(prior, admission);
  if (prefixSampleCount < 2) return { terrain: prior };
  const prefix: HillOfHillsProducerContactHistory = {
    ...admission.traversal.admittedHistory,
    samples: admission.traversal.admittedHistory.samples.slice(
      0,
      prefixSampleCount,
    ),
  };
  return {
    terrain: createPrefixTerrain(cache, admission, prefix, finalFrame),
  };
}

function createPrefixTerrain(
  cache: ReturnType<typeof createHillOfHillsLayerTileCache>,
  admission: HillHordeLiveTraversalAdmissionReceipt,
  history: HillOfHillsProducerContactHistory,
  finalFrame: boolean,
): HillOfHillsTerrain {
  return createHillOfHillsTerrainWithCache(
    cache,
    {
      ...admission.terrains.admitted.params,
      topologyPhaseTimeMs: admission.terrains.admitted.params.topologyPhaseTimeMs,
    },
    {
      ...sourceFor(
        admission,
        finalFrame
          ? admission.hill.effective.admittedFrameId
          : `horde-live-hill-prefix-${history.samples.length}`,
        history.samples.at(-1)?.timestampMs ?? 0,
      ),
      producerContactHistory: history,
    },
  );
}

function createPrior(
  cache: ReturnType<typeof createHillOfHillsLayerTileCache>,
  admission: HillHordeLiveTraversalAdmissionReceipt,
): HillOfHillsTerrain {
  return createHillOfHillsTerrainWithCache(
    cache,
    {
      ...admission.terrains.admitted.params,
      topologyPhaseTimeMs: 0,
    },
    sourceFor(admission, admission.hill.effective.priorFrameId, 0),
  );
}

function sourceFor(
  admission: HillHordeLiveTraversalAdmissionReceipt,
  frameId: string,
  timestampMs: number,
): HillOfHillsSourceOptions {
  return {
    authority: 'live_simulation',
    route: admission.hill.requested.route,
    frameId,
    backend: admission.hill.requested.backend,
    configId: admission.hill.requested.configId,
    timestampMs,
    sampleAgeMs: 0,
    fallbackStatus: 'none',
  };
}

function assertPriorIdentity(
  prior: HillOfHillsTerrain,
  admission: HillHordeLiveTraversalAdmissionReceipt,
): void {
  requireClaim(
    prior.source.frameId === admission.traversal.admittedHistory.hill.sourceId &&
      prior.witness.sampleChecksum ===
        admission.traversal.admittedHistory.hill.sampleChecksum &&
      prior.witness.topologyChecksum ===
        admission.traversal.admittedHistory.hill.topologyChecksum,
    'prefix replay prior does not match reviewed history target',
  );
}

function frame(
  index: number,
  kind: HillHordeSameScenePrefixFrame['kind'],
  timestampMs: number,
  prefixSampleCount: number,
  actor: LermHordeLiveBodyMotionSample | null,
  terrain: HillOfHillsTerrain,
): HillHordeSameScenePrefixFrame {
  return {
    index,
    kind,
    timestampMs,
    prefixSampleCount,
    actor,
    terrain,
    sameSceneTerrainAndActor: true,
    claimBoundary: {
      rootRailMotionTruth: true,
      liveCurrentHillTruth: true,
      topologyResponseTruth: true,
      bodyArticulationTruth: true,
      prefixTimeAdmissionTruth: true,
      sameScenePresentationTruth: true,
      liveContactTruth: false,
      producerRigMotionTruth: false,
      morphologyPortability: false,
    },
  };
}

function validateSources(
  admission: HillHordeLiveTraversalAdmissionReceipt,
  motion: LermHordeLiveBodyMotionComposition,
): void {
  validateAdmissionIdentity(admission);
  validateMotionIdentity(admission, motion);
  if (
    motion.source.admission.hillRevision !== admission.hill.targetRevision ||
    motion.source.admission.hordeRevision !== admission.source.horde.revision ||
    motion.source.admission.actorId !== admission.source.horde.actorId
  ) {
    throw new Error('motion source does not match admission');
  }
  if (
    motion.samples.length !== admission.traversal.orderedRootCount ||
    motion.samples.some(
      (sample, index) =>
        sample.timestampMs !==
          admission.traversal.admittedHistory.samples[index].timestampMs ||
        sample.rootWorld.some(
          (value, axis) =>
            value !== admission.traversal.liveRootWorld[index][axis],
        ),
    )
  ) {
    throw new Error('motion samples do not preserve reviewed admitted roots');
  }
}

function validateAdmissionIdentity(
  admission: HillHordeLiveTraversalAdmissionReceipt,
): void {
  const { requested, effective } = admission.hill;
  if (
    admission?.ok !== true ||
    admission.schema !== HILL_HORDE_LIVE_TRAVERSAL_ADMISSION_SCHEMA ||
    admission.phase !== 'complete' ||
    admission.route !== HILL_HORDE_LIVE_TRAVERSAL_ROUTE ||
    admission.evidenceClass !== 'live_current_hill_lerm_traversal' ||
    admission.fallbackStatus !== 'none' ||
    admission.staleStatus !== 'fresh' ||
    admission.partialStatus !== 'complete-root-only' ||
    admission.failurePhase !== null ||
    admission.source.horde.revision !== HILL_HORDE_REVIEWED_SOURCE_REVISION ||
    admission.hill.targetRevision !== LERM_HORDE_REVIEWED_LIVE_HILL_REVISION ||
    requested.route !== REVIEWED_HILL_ROUTE ||
    requested.authority !== 'live_simulation' ||
    requested.backend !== REVIEWED_HILL_BACKEND ||
    requested.configId !== REVIEWED_HILL_CONFIG ||
    effective.route !== requested.route ||
    effective.authority !== requested.authority ||
    effective.backend !== requested.backend ||
    effective.configId !== requested.configId ||
    effective.priorFrameId !== 'horde-live-hill-prior' ||
    effective.admittedFrameId !== 'horde-live-hill-admitted' ||
    effective.postDepartureFrameId !== 'horde-live-hill-post-departure'
  ) {
    throw new Error('admission identity is incompatible with reviewed replay');
  }
  if (
    admission.claimBoundary.rootRailMotionTruth !== true ||
    admission.claimBoundary.visibleLermIdentityTruth !== true ||
    admission.claimBoundary.liveCurrentHillTruth !== true ||
    admission.claimBoundary.topologyResponseTruth !== true ||
    admission.claimBoundary.liveContactTruth !== false ||
    admission.claimBoundary.bodyArticulationTruth !== false ||
    admission.claimBoundary.morphologyPortability !== false ||
    Object.values(admission.assertions).some((value) => value !== true)
  ) {
    throw new Error('admission identity is incompatible with reviewed replay');
  }
}

function validateMotionIdentity(
  admission: HillHordeLiveTraversalAdmissionReceipt,
  motion: LermHordeLiveBodyMotionComposition,
): void {
  const visibleBody = admission.source.horde.visibleBody;
  if (
    motion?.ok !== true ||
    motion.schema !== LERM_HORDE_LIVE_BODY_MOTION_SCHEMA ||
    motion.phase !== 'complete' ||
    motion.route !== LERM_HORDE_LIVE_BODY_MOTION_ROUTE ||
    motion.evidenceClass !== 'authored_procedural_body_motion_on_live_hill' ||
    motion.fallbackStatus !== 'none' ||
    motion.staleStatus !== 'fresh' ||
    motion.partialStatus !== 'complete-root-only' ||
    motion.source.admission.schema !==
      HILL_HORDE_LIVE_TRAVERSAL_ADMISSION_SCHEMA ||
    motion.source.admission.route !== HILL_HORDE_LIVE_TRAVERSAL_ROUTE ||
    motion.source.body.assetIdentity !== visibleBody.assetIdentity ||
    motion.source.body.sourceRevision !== visibleBody.sourceRevision ||
    motion.source.body.sha256 !== visibleBody.sha256 ||
    motion.source.body.candidateId !== 'procedural-squash-thief-v0' ||
    motion.source.body.candidateSchema !==
      'lerms.red-lerm-body-candidate.v0' ||
    motion.source.body.shapeSchema !==
      'lerms.red-lerm-procedural-shape.v0' ||
    motion.gait.authority !== 'horde_authored_procedural_presentation' ||
    motion.gait.phaseDriver !== 'source_distance' ||
    motion.gait.strideLengthWorld !== 0.87 ||
    motion.gait.maxBodyBobWorld !== 0.065 ||
    motion.gait.maxLegReachWorld !== 0.16 ||
    motion.gait.maxLegLiftWorld !== 0.09 ||
    motion.hillMemory.trafficChecksumAtAdmission !==
      admission.persistence.trafficChecksumAtAdmission ||
    motion.hillMemory.trafficChecksumAfterDeparture !==
      admission.persistence.trafficChecksumAfterDeparture ||
    motion.hillMemory.postDepartureTopologyPossibilityChecksum !==
      admission.admission.postDepartureTopologyPossibilityChecksum ||
    motion.hillMemory.noHistoryTopologyPossibilityChecksum !==
      admission.control.noHistoryTopologyPossibilityChecksum
  ) {
    throw new Error('motion identity is incompatible with reviewed replay');
  }
  if (
    motion.claimBoundary.rootRailMotionTruth !== true ||
    motion.claimBoundary.liveCurrentHillTruth !== true ||
    motion.claimBoundary.topologyResponseTruth !== true ||
    motion.claimBoundary.bodyArticulationTruth !== true ||
    motion.claimBoundary.articulationClass !==
      'authored_procedural_presentation' ||
    motion.claimBoundary.sameSceneConsumerExerciseTruth !== false ||
    motion.claimBoundary.perFrameIncrementalAdmissionTruth !== false ||
    motion.claimBoundary.liveContactTruth !== false ||
    motion.claimBoundary.producerRigMotionTruth !== false ||
    motion.claimBoundary.morphologyPortability !== false ||
    Object.values(motion.assertions).some((value) => value !== true)
  ) {
    throw new Error('motion identity is incompatible with reviewed replay');
  }
}

function renderPanel(frame: HillHordeSameScenePrefixFrame): string {
  const x0 = (frame.index % PANEL_COLUMNS) * PANEL_WIDTH;
  const y0 = Math.floor(frame.index / PANEL_COLUMNS) * PANEL_HEIGHT;
  const terrain = frame.terrain;
  const heights = terrain.samples.map(({ height }) => height);
  const minHeight = Math.min(...heights);
  const maxHeight = Math.max(...heights);
  const trafficField =
    terrain.phaseState.producerTrafficField ??
    terrain.phaseState.persistentTopologyField?.producerTrafficField;
  const trafficMax = Math.max(
    Number.EPSILON,
    terrain.witness.producerTrafficFieldRange.max,
  );
  const project = (world: readonly number[]) => {
    const nx = world[0] / terrain.params.width + 0.5;
    const nz = world[2] / terrain.params.length + 0.5;
    const heightT =
      (world[1] - minHeight) / Math.max(0.001, maxHeight - minHeight);
    return [
      x0 + 180 + (nx - nz) * 132,
      y0 + 108 + (nx + nz) * 70 - heightT * 72,
    ] as const;
  };
  const terrainCells = [...terrain.samples]
    .sort((left, right) =>
      left.world[0] + left.world[2] - (right.world[0] + right.world[2]))
    .map((sample) => {
      const [x, y] = project(sample.world);
      const heightT =
        (sample.height - minHeight) / Math.max(0.001, maxHeight - minHeight);
      const traffic = trafficField
        ? sampleHillOfHillsProducerTrafficField(
            trafficField,
            sample.world[0],
            sample.world[2],
          ) / trafficMax
        : 0;
      const base = mixColor([28, 73, 43], [174, 168, 93], heightT);
      const fill = mixColor(base, [72, 103, 205], Math.min(0.9, traffic * 0.88));
      return `<rect x="${number(x - 2.2)}" y="${number(y - 1.55)}" width="4.5" height="3.2" fill="rgb(${fill.join(' ')})"/>`;
    })
    .join('');
  const actorSvg = frame.actor
    ? renderActor(frame.actor, project)
    : '<g data-actor-absent="true"/>';
  const title =
    frame.kind === 'no-history-control'
      ? 'no-history control'
      : frame.kind === 'actor-departed'
        ? 'actor departed · retained prefix'
      : frame.kind === 'after-departure'
        ? 'later after departure'
        : `t ${frame.timestampMs} ms · root ${frame.actor?.sequence}`;
  const prefix = `prefix ${frame.prefixSampleCount}/15`;
  return `<g data-panel="${frame.index}" data-same-scene="true">
    <rect x="${x0}" y="${y0}" width="${PANEL_WIDTH}" height="${PANEL_HEIGHT}" fill="#07100d"/>
    <rect x="${x0 + 1}" y="${y0 + 1}" width="${PANEL_WIDTH - 2}" height="${PANEL_HEIGHT - 2}" fill="none" stroke="#294d3d"/>
    <g data-actual-hill-terrain="true">${terrainCells}</g>
    ${actorSvg}
    <text x="${x0 + 18}" y="${y0 + 26}" fill="#f4ecd0" font-size="16" font-family="monospace" font-weight="700">${title}</text>
    <text x="${x0 + 18}" y="${y0 + 45}" fill="#9fd0bd" font-size="10.5" font-family="monospace">${prefix} · exposure ${number(terrain.witness.producerTrafficExposureSeconds)}</text>
    <text x="${x0 + 18}" y="${y0 + 324}" fill="#f2d35f" font-size="10" font-family="monospace">traffic ${terrain.witness.producerTrafficFieldChecksum} · topo ${terrain.witness.topologyPossibilityChecksum}</text>
    <text x="${x0 + 18}" y="${y0 + 342}" fill="#9fd0bd" font-size="10" font-family="monospace">${frame.actor ? 'Lerm present · root-only · contact 0' : 'Lerm absent'} · live Hill</text>
  </g>`;
}

function renderActor(
  actor: LermHordeLiveBodyMotionSample,
  project: (world: readonly number[]) => readonly [number, number],
): string {
  const [rootX, rootY] = project(actor.rootWorld);
  const bodyWorld = actor.body.centerWorld;
  const [, projectedBodyY] = project(bodyWorld);
  const bodyY = projectedBodyY - 16;
  const bodyRx = 18 * actor.body.scaleX;
  const bodyRy = 14 * actor.body.scaleY;
  const stride = actor.legs.leftReach - actor.legs.rightReach;
  return `<g data-visible-lerm-body="true" data-sequence="${actor.sequence}" data-root-world="${actor.rootWorld.join(',')}">
    <line x1="${number(rootX - 7)}" y1="${number(bodyY + 9)}" x2="${number(rootX - 7 + stride * 34)}" y2="${number(rootY - actor.legs.leftLift * 34)}" stroke="#9f1c2a" stroke-width="5" stroke-linecap="round"/>
    <line x1="${number(rootX + 7)}" y1="${number(bodyY + 9)}" x2="${number(rootX + 7 - stride * 34)}" y2="${number(rootY - actor.legs.rightLift * 34)}" stroke="#9f1c2a" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="${number(rootX)}" cy="${number(bodyY)}" rx="${number(bodyRx)}" ry="${number(bodyRy)}" fill="#df2a36" transform="rotate(${number(actor.body.leanRadians * 57.2958)} ${number(rootX)} ${number(bodyY)})"/>
    <circle cx="${number(rootX + 17)}" cy="${number(bodyY - 3)}" r="4" fill="#f4ecd0"/>
    <circle cx="${number(rootX + 18.5)}" cy="${number(bodyY - 3)}" r="1.6" fill="#07100d"/>
    <circle cx="${number(rootX)}" cy="${number(rootY)}" r="2.2" fill="#ffe06f"/>
  </g>`;
}

function mixColor(
  left: readonly number[],
  right: readonly number[],
  amount: number,
): [number, number, number] {
  const t = Math.max(0, Math.min(1, amount));
  return [
    Math.round(left[0] + (right[0] - left[0]) * t),
    Math.round(left[1] + (right[1] - left[1]) * t),
    Math.round(left[2] + (right[2] - left[2]) * t),
  ];
}

function number(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function requireClaim(value: boolean, message: string): asserts value {
  if (!value) throw new Error(message);
}
