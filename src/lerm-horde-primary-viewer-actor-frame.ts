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
export const LERM_HORDE_SUPPORT_PROFILE_REQUEST_SCHEMA =
  'lerms.horde-support-profile-request.v0' as const;
export const LERM_HORDE_PRESENTATION_SUPPORT_BINDING_SCHEMA =
  'lerms.horde-presentation-support-binding.v0' as const;
export const LERM_HORDE_CPU_PRESENTATION_SUPPORT_ROUTE =
  'lerms/lerm-horde/cpu-reference-presentation-support-v0' as const;

const SPECIES_INSTANCE_SCALE = 1.14;
const SPECIES_TAIL_Z = 0.47;
const SPECIES_HEAD_Z = -0.47;
const SPECIES_PHASE_RADIANS_PER_WORLD_UNIT = 2.35;

export interface LermHordeSupportProfileRequest {
  schema: typeof LERM_HORDE_SUPPORT_PROFILE_REQUEST_SCHEMA;
  rootWorld: {
    x: number;
    z: number;
  };
  stations: readonly {
    t: number;
    worldX: number;
    worldZ: number;
  }[];
}

export interface LermHordePresentationSupportGeneration {
  generation: number;
  identity: {
    route: string;
    frameId: string;
    topologyChecksum: string;
    supportFrameChecksum: string;
    producerTrafficFieldChecksum: string;
    addressingKey: string;
    terrainLength: number;
  };
  rootHeight: number;
  stations: readonly {
    t: number;
    height: number;
  }[];
}

export interface LermHordePresentationSupportBinding {
  schema: typeof LERM_HORDE_PRESENTATION_SUPPORT_BINDING_SCHEMA;
  route: {
    requested: string;
    effective: string;
    backend: 'cpu-oracle' | 'webgpu';
    fallbackStatus: 'none' | 'fallback';
    staleStatus: 'fresh' | 'stale' | 'cached';
  };
  request: LermHordeSupportProfileRequest;
  presentationAlpha: number;
  previous: LermHordePresentationSupportGeneration;
  current: LermHordePresentationSupportGeneration;
  timing: {
    compactPayloadBytes: number;
    mapLatencyMs: number;
    queueLatencyMs: number;
    generationAgeMs: number;
    mainThreadWaitMs: number;
    synchronousAtPresentationFrequency: boolean;
  };
}

export interface LermHordeResolvedPresentationSupport {
  rootHeight: number;
  terrainSupportProfile: readonly {
    t: number;
    localOffset: number;
  }[];
  currentFrameId: string;
  currentGeneration: number;
  presentationAlpha: number;
  terrainLength: number;
}

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
      presentationBinding: {
        route: LermHordePresentationSupportBinding['route'];
        previousGeneration: number;
        currentGeneration: number;
        currentFrameId: string;
        presentationAlpha: number;
      } | null;
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
  supportBinding?: LermHordePresentationSupportBinding,
): LermHordePrimaryViewerActorFrame {
  validateLiveSource(state);
  if (supportBinding) {
    requireActorFrame(
      state.body !== null &&
        supportBinding.current?.identity?.route ===
          state.terrainBuffer.source.route &&
        supportBinding.current?.identity?.frameId ===
          state.terrainBuffer.source.frameId &&
        supportBinding.current?.identity?.topologyChecksum ===
          state.terrainBuffer.topologyChecksum &&
        supportBinding.current?.identity?.supportFrameChecksum ===
          state.terrainBuffer.witness.supportFrame
            .supportFrameChecksum &&
        supportBinding.current?.identity
          ?.producerTrafficFieldChecksum ===
          state.terrainBuffer.witness
            .producerTrafficFieldChecksum,
      'presentation support binding does not match the rendered Hill',
    );
  }
  const pose = state.body
    ? createPose(state.body, state.terrain, supportBinding)
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
                    localExposure: candidate.localExposure,
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
  supportBinding?: LermHordePresentationSupportBinding,
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
  const authoritativeRootFrame = validateRootFrame({
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

  const authoritativeSupport = supportBinding
    ? resolveLermHordePresentationSupportBinding(
        supportBinding,
        authoritativeRootFrame,
      )
    : null;
  const rootFrame = authoritativeSupport
    ? validateRootFrame({
        ...authoritativeRootFrame,
        origin: {
          ...authoritativeRootFrame.origin,
          y:
            authoritativeSupport.rootHeight +
            body.support.rootLift,
        },
      })
    : authoritativeRootFrame;
  const resolvedSupport = supportBinding
    ? resolveLermHordePresentationSupportBinding(
        supportBinding,
        rootFrame,
      )
    : null;
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
      sampledHeight:
        resolvedSupport?.rootHeight ??
        body.support.sampledHeight,
      sampledHillSourceId:
        body.support.provenance.hillSourceId,
      renderedHillSourceId:
        body.support.renderedHillSourceId,
      hillRevision: body.support.provenance.revision,
      presentationBinding:
        supportBinding && resolvedSupport
          ? {
              route: { ...supportBinding.route },
              previousGeneration:
                supportBinding.previous.generation,
              currentGeneration:
                resolvedSupport.currentGeneration,
              currentFrameId:
                resolvedSupport.currentFrameId,
              presentationAlpha:
                resolvedSupport.presentationAlpha,
            }
          : null,
    },
    squirm: {
      amplitude: 0.082,
      verticalAmplitude: 0.016,
      phase:
        body.sourceDistance *
        SPECIES_PHASE_RADIANS_PER_WORLD_UNIT,
      phaseSource: 'route-distance-v0',
      terrainSupportProfile: resolvedSupport
        ? [...resolvedSupport.terrainSupportProfile]
        : terrainSupportProfile(terrain, rootFrame),
    },
    projection: {
      terrainLength:
        resolvedSupport?.terrainLength ?? terrain.params.length,
    },
  };
}

export function createLermHordeSupportProfileRequest(
  rootFrame: CreatureRootFrame,
): LermHordeSupportProfileRequest {
  const validated = validateRootFrame(rootFrame);
  return {
    schema: LERM_HORDE_SUPPORT_PROFILE_REQUEST_SCHEMA,
    rootWorld: {
      x: validated.origin.x,
      z: validated.origin.z,
    },
    stations: Array.from(
      { length: LERM_HORDE_TERRAIN_SUPPORT_STATION_COUNT },
      (_, index) => {
        const t =
          index /
          (LERM_HORDE_TERRAIN_SUPPORT_STATION_COUNT - 1);
        const localZ =
          (SPECIES_TAIL_Z +
            (SPECIES_HEAD_Z - SPECIES_TAIL_Z) * t) *
          SPECIES_INSTANCE_SCALE;
        return {
          t,
          worldX:
            validated.origin.x +
            validated.tangent.x * localZ,
          worldZ:
            validated.origin.z +
            validated.tangent.z * localZ,
        };
      },
    ),
  };
}

export function createLermHordeCpuPresentationSupportBinding(
  previousTerrain: HillOfHillsTerrain,
  currentTerrain: HillOfHillsTerrain,
  request: LermHordeSupportProfileRequest,
  presentationAlpha: number,
): LermHordePresentationSupportBinding {
  validateSupportRequest(request);
  requireActorFrame(
    Number.isFinite(presentationAlpha) &&
      presentationAlpha >= 0 &&
      presentationAlpha <= 1,
    'presentation support alpha must be between zero and one',
  );
  const previous = sampleSupportGeneration(
    previousTerrain,
    request,
  );
  const current = sampleSupportGeneration(
    currentTerrain,
    request,
  );
  requireActorFrame(
    previous.identity.addressingKey ===
      current.identity.addressingKey,
    'previous and current support generations use incompatible addressing',
  );
  const compact = {
    schema: LERM_HORDE_PRESENTATION_SUPPORT_BINDING_SCHEMA,
    route: {
      requested: LERM_HORDE_CPU_PRESENTATION_SUPPORT_ROUTE,
      effective: LERM_HORDE_CPU_PRESENTATION_SUPPORT_ROUTE,
      backend: 'cpu-oracle',
      fallbackStatus: 'none',
      staleStatus: 'fresh',
    },
    request,
    presentationAlpha,
    previous,
    current,
  } as const;
  return {
    ...compact,
    timing: {
      compactPayloadBytes: new TextEncoder().encode(
        JSON.stringify(compact),
      ).byteLength,
      mapLatencyMs: 0,
      queueLatencyMs: 0,
      generationAgeMs: 0,
      mainThreadWaitMs: 0,
      synchronousAtPresentationFrequency: false,
    },
  };
}

export function resolveLermHordePresentationSupportBinding(
  binding: LermHordePresentationSupportBinding,
  rootFrame: CreatureRootFrame,
): LermHordeResolvedPresentationSupport {
  requireActorFrame(
    binding?.schema ===
      LERM_HORDE_PRESENTATION_SUPPORT_BINDING_SCHEMA,
    'presentation support binding schema is unsupported',
  );
  requireActorFrame(
    hasExactKeys(binding, [
      'schema',
      'route',
      'request',
      'presentationAlpha',
      'previous',
      'current',
      'timing',
    ]) &&
      hasExactKeys(binding.route, [
        'requested',
        'effective',
        'backend',
        'fallbackStatus',
        'staleStatus',
      ]) &&
      nonblank(binding.route.requested) &&
      binding.route.requested === binding.route.effective &&
      (binding.route.backend === 'cpu-oracle' ||
        binding.route.backend === 'webgpu') &&
      binding.route.fallbackStatus === 'none',
    'presentation support binding route or backend is invalid or uses fallback',
  );
  requireActorFrame(
    binding.route.staleStatus === 'fresh',
    'presentation support binding must be fresh',
  );
  requireActorFrame(
    hasExactKeys(binding.timing, [
      'compactPayloadBytes',
      'mapLatencyMs',
      'queueLatencyMs',
      'generationAgeMs',
      'mainThreadWaitMs',
      'synchronousAtPresentationFrequency',
    ]) &&
      binding.timing.synchronousAtPresentationFrequency === false,
    'presentation support cannot use synchronous presentation-frequency readback',
  );
  requireActorFrame(
    Number.isFinite(binding.timing.compactPayloadBytes) &&
      binding.timing.compactPayloadBytes > 0 &&
      Number.isFinite(binding.timing.mapLatencyMs) &&
      binding.timing.mapLatencyMs >= 0 &&
      Number.isFinite(binding.timing.queueLatencyMs) &&
      binding.timing.queueLatencyMs >= 0 &&
      Number.isFinite(binding.timing.generationAgeMs) &&
      binding.timing.generationAgeMs >= 0 &&
      Number.isFinite(binding.timing.mainThreadWaitMs) &&
      binding.timing.mainThreadWaitMs >= 0,
    'presentation support timing receipt must be complete, finite, and nonnegative',
  );
  validateSupportRequest(binding.request);
  validateSupportGeneration(binding.previous, 'previous');
  validateSupportGeneration(binding.current, 'current');
  requireActorFrame(
    binding.previous.identity.route ===
      binding.current.identity.route &&
      binding.previous.identity.addressingKey ===
        binding.current.identity.addressingKey &&
      binding.previous.identity.terrainLength ===
        binding.current.identity.terrainLength,
    'previous and current support generations use incompatible route or addressing',
  );
  requireActorFrame(
    binding.previous.generation <= binding.current.generation,
    'presentation support generations regressed',
  );
  requireActorFrame(
    Number.isFinite(binding.presentationAlpha) &&
      binding.presentationAlpha >= 0 &&
      binding.presentationAlpha <= 1,
    'presentation support alpha must be between zero and one',
  );
  const validatedRoot = validateRootFrame(rootFrame);
  const expectedRequest =
    createLermHordeSupportProfileRequest(validatedRoot);
  requireActorFrame(
    Math.abs(
      validatedRoot.origin.x - binding.request.rootWorld.x,
    ) < 1e-6 &&
      Math.abs(
        validatedRoot.origin.z - binding.request.rootWorld.z,
      ) < 1e-6 &&
      binding.request.stations.every(
        (station, index) =>
          Math.abs(
            station.worldX -
              expectedRequest.stations[index].worldX,
          ) < 1e-6 &&
          Math.abs(
            station.worldZ -
              expectedRequest.stations[index].worldZ,
          ) < 1e-6,
      ),
    'presentation support request stations do not match the actor body axis',
  );
  const alpha = binding.presentationAlpha;
  const rootHeight = mix(
    binding.previous.rootHeight,
    binding.current.rootHeight,
    alpha,
  );
  return {
    rootHeight,
    terrainSupportProfile: binding.current.stations.map(
      (current, index) => {
        const previous = binding.previous.stations[index];
        requireActorFrame(
          Math.abs(previous.t - current.t) < 1e-9,
          'previous and current support station coordinates differ',
        );
        return {
          t: current.t,
          localOffset:
            (mix(previous.height, current.height, alpha) -
              validatedRoot.origin.y) /
            SPECIES_INSTANCE_SCALE,
        };
      },
    ),
    currentFrameId: binding.current.identity.frameId,
    currentGeneration: binding.current.generation,
    presentationAlpha: alpha,
    terrainLength: binding.current.identity.terrainLength,
  };
}

function sampleSupportGeneration(
  terrain: HillOfHillsTerrain,
  request: LermHordeSupportProfileRequest,
): LermHordePresentationSupportGeneration {
  return {
    generation: terrain.witness.cacheGeneration,
    identity: {
      route: terrain.source.route,
      frameId: terrain.source.frameId,
      topologyChecksum: terrain.witness.topologyChecksum,
      supportFrameChecksum:
        terrain.witness.supportFrame.supportFrameChecksum,
      producerTrafficFieldChecksum:
        terrain.witness.producerTrafficFieldChecksum,
      addressingKey: [
        terrain.params.gridResolutionX,
        terrain.params.gridResolutionZ,
        terrain.params.length,
        terrain.params.width,
      ].join(':'),
      terrainLength: terrain.params.length,
    },
    rootHeight: sampleHillOfHillsTerrain(
      terrain,
      request.rootWorld.x,
      request.rootWorld.z,
    ).height,
    stations: request.stations.map(({ t, worldX, worldZ }) => ({
      t,
      height: sampleHillOfHillsTerrain(
        terrain,
        worldX,
        worldZ,
      ).height,
    })),
  };
}

function validateSupportRequest(
  request: LermHordeSupportProfileRequest,
): void {
  requireActorFrame(
    request?.schema === LERM_HORDE_SUPPORT_PROFILE_REQUEST_SCHEMA &&
      hasExactKeys(request, [
        'schema',
        'rootWorld',
        'stations',
      ]) &&
      hasExactKeys(request.rootWorld, ['x', 'z']) &&
      Number.isFinite(request.rootWorld.x) &&
      Number.isFinite(request.rootWorld.z) &&
      request.stations.length ===
        LERM_HORDE_TERRAIN_SUPPORT_STATION_COUNT &&
      request.stations.every(
        (station, index) =>
          hasExactKeys(station, [
            't',
            'worldX',
            'worldZ',
          ]) &&
          Number.isFinite(station.t) &&
          Number.isFinite(station.worldX) &&
          Number.isFinite(station.worldZ) &&
          Math.abs(
            station.t -
              index /
                (LERM_HORDE_TERRAIN_SUPPORT_STATION_COUNT - 1),
          ) < 1e-9,
      ),
    'support request requires exactly seven finite ordered stations',
  );
}

function validateSupportGeneration(
  generation: LermHordePresentationSupportGeneration,
  label: string,
): void {
  requireActorFrame(
    hasExactKeys(generation, [
      'generation',
      'identity',
      'rootHeight',
      'stations',
    ]) &&
      hasExactKeys(generation.identity, [
        'route',
        'frameId',
        'topologyChecksum',
        'supportFrameChecksum',
        'producerTrafficFieldChecksum',
        'addressingKey',
        'terrainLength',
      ]) &&
      Number.isInteger(generation.generation) &&
      generation.generation >= 0 &&
      generation.identity.route.length > 0 &&
      generation.identity.frameId.length > 0 &&
      generation.identity.topologyChecksum.length > 0 &&
      generation.identity.supportFrameChecksum.length > 0 &&
      generation.identity.producerTrafficFieldChecksum.length > 0 &&
      generation.identity.addressingKey.length > 0 &&
      Number.isFinite(generation.identity.terrainLength) &&
      generation.identity.terrainLength > 0 &&
      Number.isFinite(generation.rootHeight) &&
      generation.stations.length ===
        LERM_HORDE_TERRAIN_SUPPORT_STATION_COUNT &&
      generation.stations.every(
        ({ t, height }, index) =>
          hasExactKeys(generation.stations[index], [
            't',
            'height',
          ]) &&
          Number.isFinite(t) &&
          Number.isFinite(height) &&
          Math.abs(
            t -
              index /
                (LERM_HORDE_TERRAIN_SUPPORT_STATION_COUNT - 1),
          ) < 1e-9,
      ),
    `${label} presentation support requires nonblank identity and exactly seven finite stations`,
  );
}

function hasExactKeys(
  value: unknown,
  expected: readonly string[],
): boolean {
  if (!value || typeof value !== 'object') return false;
  const actual = Object.keys(value).sort();
  const canonical = [...expected].sort();
  return (
    actual.length === canonical.length &&
    actual.every((key, index) => key === canonical[index])
  );
}

function nonblank(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function mix(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
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
