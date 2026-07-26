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
  LERM_HORDE_LIVE_RUNTIME_ROUTE,
  type LermHordeLiveBodySample,
  type LermHordeLiveRuntimeState,
} from './lerm-horde-live-runtime-composition.js';

export const LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_SCHEMA =
  'lerms.horde-primary-viewer-actor-frame.v0' as const;
export const LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE =
  'lerms/lerm-horde/primary-viewer-actor-frame-v0' as const;
export const LERM_HORDE_PRIMARY_VIEWER_BODY_ASSET_URL =
  '/vendor/kaminos-6217fff8/artifacts/motion-ready-719024/creature.glb' as const;
export const LERM_HORDE_PRIMARY_VIEWER_REGISTRATION_URL =
  '/vendor/kaminos-6217fff8/artifacts/lirm-719024-fitted-proxy-rig-mechanism-witness-v1/registration.json' as const;

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
    speciesAuthority: 'non-lerm-engineering-carrier';
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
  const pose = state.body ? createPose(state.body) : null;

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
      speciesAuthority: 'non-lerm-engineering-carrier',
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
  };
}

function requireActorFrame(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}
