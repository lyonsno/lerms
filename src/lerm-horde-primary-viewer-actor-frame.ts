import {
  EXACT_3D_CARRIER_BODY_SHA256,
  EXACT_3D_CARRIER_EVALUATOR_ROUTE,
  EXACT_3D_CARRIER_RAIL_HISTORY_SHA256,
  EXACT_3D_CARRIER_RAIL_ID,
  EXACT_3D_CARRIER_RAIL_MODULE_SHA256,
  EXACT_3D_CARRIER_RAIL_REVISION,
  EXACT_3D_CARRIER_REGISTRATION_SHA256,
} from './lerm-horde-3d-carrier-contract.js';
import {
  validateRootFrame,
  type CreatureRootFrame,
} from './kaminos-719024-fitted-body.js';
import {
  sampleHillOfHillsTerrain,
  type HillOfHillsTerrain,
} from './terrain/hill-of-hills.js';
import {
  LERM_HORDE_LIVE_RUNTIME_ROUTE,
  type LermHordeLiveBodySample,
  type LermHordeLiveRuntimeState,
} from './lerm-horde-live-runtime-composition.js';
import type {
  LermHordeHistoryConditionedDecision,
} from './lerm-horde-history-conditioned-decision.js';

export const LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_SCHEMA =
  'lerms.horde-primary-viewer-actor-frame.v0' as const;
export const LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE =
  'lerms/lerm-horde/primary-viewer-actor-frame-v0' as const;
export const LERM_HORDE_PRIMARY_VIEWER_BODY_ASSET_URL =
  '/vendor/kaminos-6217fff8/artifacts/motion-ready-719024/creature.glb' as const;
export const LERM_HORDE_PRIMARY_VIEWER_REGISTRATION_URL =
  '/vendor/kaminos-6217fff8/artifacts/lirm-719024-fitted-proxy-rig-mechanism-witness-v1/registration.json' as const;
export const LERM_HORDE_TERRAIN_SUPPORT_STATION_COUNT = 7 as const;

const SPECIES_INSTANCE_SCALE = 1.14;
const SPECIES_TAIL_Z = 0.47;
const SPECIES_HEAD_Z = -0.47;
const SPECIES_PHASE_RADIANS_PER_WORLD_UNIT = 2.35;

export interface LermHordePrimaryViewerActorFrame {
  schema: typeof LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_SCHEMA;
  route: {
    requested: typeof LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE;
    effective: typeof LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE;
    fallbackStatus: 'none';
    staleStatus: 'fresh';
  };
  identity: {
    carrierId: '719024';
    speciesAuthority: 'kaminos.species-asset.v0';
    bodyAsset: {
      url: typeof LERM_HORDE_PRIMARY_VIEWER_BODY_ASSET_URL;
      sha256: typeof EXACT_3D_CARRIER_BODY_SHA256;
    };
    fittedMotion: {
      evaluatorRoute: typeof EXACT_3D_CARRIER_EVALUATOR_ROUTE;
      registrationUrl: typeof LERM_HORDE_PRIMARY_VIEWER_REGISTRATION_URL;
      registrationSha256: typeof EXACT_3D_CARRIER_REGISTRATION_SHA256;
      amplitude: 0.18;
    };
    rail: {
      id: typeof EXACT_3D_CARRIER_RAIL_ID;
      revision: typeof EXACT_3D_CARRIER_RAIL_REVISION;
      moduleSha256: typeof EXACT_3D_CARRIER_RAIL_MODULE_SHA256;
      historySha256: typeof EXACT_3D_CARRIER_RAIL_HISTORY_SHA256;
    };
  };
  lifecycle: {
    phase: LermHordeLiveRuntimeState['phase'];
    visible: boolean;
    elapsedMs: number;
    tickCount: number;
  };
  episodeController?: {
    schema: 'lerms.horde-history-conditioned-runtime.v0';
    route:
      'lerms/lerm-horde/history-conditioned-two-episode-runtime-v0';
    stage:
      | 'traversing'
      | 'settling'
      | 'reseeding'
      | 'complete';
    activeEpisodeIndex: 0 | 1 | null;
    activeActorInstanceId:
      | 'lerm-episode-a'
      | 'lerm-episode-b'
      | null;
    actorPrivateStateSource: 'fresh' | null;
    previousActorPrivateStateCarried: false;
    decisions: readonly {
      episodeIndex: 0 | 1;
      selectedId:
        | 'left-longitudinal'
        | 'right-longitudinal';
      selectedReason: 'minimum-local-retained-traffic';
      selectedExposure: number;
      hill: LermHordeHistoryConditionedDecision['hill'];
      policy: LermHordeHistoryConditionedDecision['policy'];
      candidates: readonly {
        id: 'left-longitudinal' | 'right-longitudinal';
        lawful: boolean;
        localExposure: number;
      }[];
    }[];
  } | null;
  pose: {
    sourceDistance: number;
    motionPhase: number;
    rootFrame: CreatureRootFrame;
    attention: LermHordeLiveBodySample['attention'];
    support: {
      disposition: LermHordeLiveBodySample['support']['disposition'];
      rootLift: number;
      minimumComplianceMargin: number;
      sampledHeight: number;
      sampledHillSourceId: string;
      renderedHillSourceId: string;
      hillRevision: string;
    };
    squirm: {
      amplitude: 0.082;
      verticalAmplitude: 0.016;
      phase: number;
      phaseSource: 'route-distance-v0';
      terrainSupportProfile: Array<{
        t: number;
        localOffset: number;
      }>;
    };
    projection: {
      terrainLength: number;
    };
  } | null;
  terrain: {
    frameId: string;
    sampleChecksum: string;
    topologyChecksum: string;
    trafficChecksum: string;
    supportFrameChecksum: string;
  };
}

export function createLermHordePrimaryViewerActorFrame(
  state: LermHordeLiveRuntimeState,
): LermHordePrimaryViewerActorFrame {
  validateLiveSource(state);
  const pose = state.body
    ? createPose(state.body, state.terrain)
    : null;

  return {
    schema: LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_SCHEMA,
    route: {
      requested: LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
      effective: LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
      fallbackStatus: 'none',
      staleStatus: 'fresh',
    },
    identity: {
      carrierId: '719024',
      speciesAuthority: 'kaminos.species-asset.v0',
      bodyAsset: {
        url: LERM_HORDE_PRIMARY_VIEWER_BODY_ASSET_URL,
        sha256: EXACT_3D_CARRIER_BODY_SHA256,
      },
      fittedMotion: {
        evaluatorRoute: EXACT_3D_CARRIER_EVALUATOR_ROUTE,
        registrationUrl: LERM_HORDE_PRIMARY_VIEWER_REGISTRATION_URL,
        registrationSha256: EXACT_3D_CARRIER_REGISTRATION_SHA256,
        amplitude: 0.18,
      },
      rail: {
        id: EXACT_3D_CARRIER_RAIL_ID,
        revision: EXACT_3D_CARRIER_RAIL_REVISION,
        moduleSha256: EXACT_3D_CARRIER_RAIL_MODULE_SHA256,
        historySha256: EXACT_3D_CARRIER_RAIL_HISTORY_SHA256,
      },
    },
    lifecycle: {
      phase: state.phase,
      visible: pose !== null,
      elapsedMs: state.elapsedMs,
      tickCount: state.tickCount,
    },
    episodeController: state.episodeController
      ? {
          schema: state.episodeController.schema,
          route: state.episodeController.route,
          stage: state.episodeController.stage,
          activeEpisodeIndex:
            state.episodeController.activeEpisodeIndex,
          activeActorInstanceId:
            state.episodeController.activeActorInstanceId,
          actorPrivateStateSource:
            state.episodeController.actorPrivateStateSource,
          previousActorPrivateStateCarried:
            state.episodeController
              .previousActorPrivateStateCarried,
          decisions:
            state.episodeController.decisions.map(
              (decision) => ({
                episodeIndex: decision.episodeIndex,
                selectedId: decision.selected.id,
                selectedReason: decision.selected.reason,
                selectedExposure:
                  decision.selected.selectedExposure,
                hill: { ...decision.hill },
                policy: { ...decision.policy },
                candidates: decision.candidates.map(
                  (candidate) => ({
                    id: candidate.id,
                    lawful: candidate.lawful,
                    localExposure:
                      candidate.affordance.memory.localExposure,
                  }),
                ),
              }),
            ),
        }
      : null,
    pose,
    terrain: {
      frameId: state.terrainBuffer.source.frameId,
      sampleChecksum: state.terrainBuffer.sampleChecksum,
      topologyChecksum: state.terrainBuffer.topologyChecksum,
      trafficChecksum:
        state.terrainBuffer.witness.producerTrafficFieldChecksum,
      supportFrameChecksum:
        state.terrainBuffer.witness.supportFrame.supportFrameChecksum,
    },
  };
}

function validateLiveSource(state: LermHordeLiveRuntimeState): void {
  requireActorFrame(
    state?.route === LERM_HORDE_LIVE_RUNTIME_ROUTE,
    'primary-viewer actor frame requires the live runtime route',
  );
  requireActorFrame(
    state.terrainBuffer?.source.frameId === state.terrain?.source.frameId &&
      state.terrainBuffer.sampleChecksum ===
        state.terrain?.witness.sampleChecksum &&
      state.terrainBuffer.topologyChecksum ===
        state.terrain?.witness.topologyChecksum &&
      state.terrainBuffer.witness.fallbackStatus === 'none',
    'primary-viewer actor frame requires a fresh current Hill buffer',
  );
  requireActorFrame(
    (state.phase === 'traversing' && state.body !== null) ||
      (state.phase === 'departed' && state.body === null),
    state.phase === 'traversing'
      ? 'traversing state requires a visible actor'
      : 'departed state cannot retain an actor',
  );
  if (!state.body) return;
  requireActorFrame(
    state.body.elapsedMs === state.elapsedMs &&
      state.body.support.renderedHillSourceId ===
        state.terrainBuffer.source.frameId,
    'primary-viewer actor frame body does not match the rendered Hill or clock',
  );
}

function createPose(
  body: LermHordeLiveBodySample,
  terrain: HillOfHillsTerrain,
): NonNullable<LermHordePrimaryViewerActorFrame['pose']> {
  requireActorFrame(
    Number.isFinite(body.sourceDistance) &&
      Number.isFinite(body.progress) &&
      body.progress >= 0 &&
      body.progress <= 1,
    'primary-viewer actor pose is missing finite rail progress',
  );
  const [originX, originY, originZ] = body.rootWorld;
  const [rightX, rightY, rightZ] = body.locomotionFrame.right;
  const [upX, upY, upZ] = body.locomotionFrame.up;
  const [forwardX, forwardY, forwardZ] =
    body.locomotionFrame.forward;
  const rootFrame = validateRootFrame({
    schema: 'kaminos.creature-root-frame.v0',
    origin: { x: originX, y: originY, z: originZ },
    lateral: { x: rightX, y: rightY, z: rightZ },
    normal: { x: upX, y: upY, z: upZ },
    tangent: {
      x: -forwardX,
      y: -forwardY,
      z: -forwardZ,
    },
  });

  return {
    sourceDistance: body.sourceDistance,
    motionPhase: body.progress,
    rootFrame,
    attention: body.attention,
    support: {
      disposition: body.support.disposition,
      rootLift: body.support.rootLift,
      minimumComplianceMargin:
        body.support.minimumComplianceMargin,
      sampledHeight: body.support.sampledHeight,
      sampledHillSourceId:
        body.support.provenance.hillSourceId,
      renderedHillSourceId:
        body.support.renderedHillSourceId,
      hillRevision: body.support.provenance.revision,
    },
    squirm: {
      amplitude: 0.082,
      verticalAmplitude: 0.016,
      phase:
        body.sourceDistance *
        SPECIES_PHASE_RADIANS_PER_WORLD_UNIT,
      phaseSource: 'route-distance-v0',
      terrainSupportProfile: terrainSupportProfile(
        terrain,
        rootFrame,
      ),
    },
    projection: {
      terrainLength: terrain.params.length,
    },
  };
}

function terrainSupportProfile(
  terrain: HillOfHillsTerrain,
  rootFrame: CreatureRootFrame,
): Array<{ t: number; localOffset: number }> {
  return Array.from(
    { length: LERM_HORDE_TERRAIN_SUPPORT_STATION_COUNT },
    (_, index) => {
      const t =
        index / (LERM_HORDE_TERRAIN_SUPPORT_STATION_COUNT - 1);
      const localZ =
        (SPECIES_TAIL_Z +
          (SPECIES_HEAD_Z - SPECIES_TAIL_Z) * t) *
        SPECIES_INSTANCE_SCALE;
      const worldX =
        rootFrame.origin.x + rootFrame.tangent.x * localZ;
      const worldZ =
        rootFrame.origin.z + rootFrame.tangent.z * localZ;
      const height = sampleHillOfHillsTerrain(
        terrain,
        worldX,
        worldZ,
      ).height;
      return {
        t,
        localOffset:
          (height - rootFrame.origin.y) / SPECIES_INSTANCE_SCALE,
      };
    },
  );
}

function requireActorFrame(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}
