import assert from 'node:assert/strict';

import {
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_LAYER_ID,
  createLermHordePrimaryViewerActorLayer,
} from '../src/lerm-horde-primary-viewer-actor-layer.js';
import {
  EXACT_3D_CARRIER_BODY_SHA256,
  EXACT_3D_CARRIER_EVALUATOR_ROUTE,
  EXACT_3D_CARRIER_RAIL_HISTORY_SHA256,
  EXACT_3D_CARRIER_RAIL_ID,
  EXACT_3D_CARRIER_RAIL_MODULE_SHA256,
  EXACT_3D_CARRIER_RAIL_REVISION,
  EXACT_3D_CARRIER_REGISTRATION_SHA256,
} from '../src/lerm-horde-3d-carrier-contract.js';
import {
  validateExactCarrierDetachedActorFrame,
} from '../src/lerm-horde-3d-carrier-renderer.js';
import {
  LERM_HORDE_PRIMARY_VIEWER_BODY_ASSET_URL,
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_SCHEMA,
  LERM_HORDE_PRIMARY_VIEWER_REGISTRATION_URL,
  type LermHordePrimaryViewerActorFrame,
} from '../src/lerm-horde-primary-viewer-actor-frame.js';
import {
  HILL_PRIMARY_VIEWER_ACTOR_DRAW_ORDER,
  HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE,
  HILL_PRIMARY_VIEWER_ACTOR_HOST_SCHEMA,
  type HillPrimaryViewerActorDrawFrame,
} from '../src/terrain/hill-primary-viewer-actor-host.js';

const terrain = {
  frameId: 'horde-live-runtime-000400',
  sampleChecksum: 'sample-current',
  topologyChecksum: 'topology-current',
};
const calls: string[] = [];
const projected: Array<{ x: number; y: number; z: number }> = [];
const context = {
  beginPath: () => calls.push('beginPath'),
  moveTo: (x: number, y: number) => calls.push(`moveTo:${x}:${y}`),
  lineTo: (x: number, y: number) => calls.push(`lineTo:${x}:${y}`),
  closePath: () => calls.push('closePath'),
  fill: () => calls.push('fill'),
  stroke: () => calls.push('stroke'),
  set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    calls.push(`fillStyle:${String(value)}`);
  },
  set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    calls.push(`strokeStyle:${String(value)}`);
  },
  set lineWidth(value: number) {
    calls.push(`lineWidth:${value}`);
  },
  set lineJoin(value: CanvasLineJoin) {
    calls.push(`lineJoin:${value}`);
  },
} as unknown as CanvasRenderingContext2D;

let actorFrame = createActorFrame();
assert.doesNotThrow(
  () => validateExactCarrierDetachedActorFrame(actorFrame),
  'a source-authenticated worker frame must remain evaluable without sharing the worker runtime clock',
);
assert.throws(
  () =>
    validateExactCarrierDetachedActorFrame({
      ...actorFrame,
      identity: {
        ...actorFrame.identity,
        bodyAsset: {
          ...actorFrame.identity.bodyAsset,
          sha256: 'substituted-body',
        },
      },
    } as unknown as LermHordePrimaryViewerActorFrame),
  /incompatible detached/i,
  'detached evaluation cannot weaken exact fitted-body provenance',
);
let presentationError: Error | null = null;
let indexedPresentationCount = 0;
const layer = createLermHordePrimaryViewerActorLayer({
  currentActorFrame: () => actorFrame,
  presentIndexedBody: () => {
    if (presentationError) throw presentationError;
    indexedPresentationCount += 1;
  },
});

assert.equal(
  layer.id,
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_LAYER_ID,
);
assert.deepEqual(layer.authority(), {
  route: actorFrame.route,
  lifecycle: {
    visible: true,
    phase: 'traversing',
  },
  terrain,
});

layer.draw(createDrawFrame());
assert.equal(
  projected.length,
  0,
  'the indexed actor layer must not project source vertices through JavaScript',
);
assert.equal(
  calls.filter((call) => call === 'fill').length,
  0,
  'the indexed actor layer must not issue one Canvas2D fill per source triangle',
);
assert.equal(
  calls.filter((call) => call === 'stroke').length,
  0,
  'the indexed actor layer must not issue one Canvas2D stroke per source triangle',
);
assert.equal(
  indexedPresentationCount,
  1,
  'the actor layer must present the exact indexed body once',
);

assert.throws(
  () =>
    layer.draw(
      createDrawFrame({
        terrain: {
          ...terrain,
          sampleChecksum: 'stale-sample',
        },
      }),
    ),
  /current Hill terrain/i,
  'a stale Hill draw frame must fail before actor pixels are emitted',
);

presentationError = new Error('indexed body unavailable');
assert.throws(
  () => layer.draw(createDrawFrame()),
  /indexed body unavailable/i,
  'a visible actor cannot close through an absent indexed presentation',
);
presentationError = null;

actorFrame = {
  ...actorFrame,
  lifecycle: {
    phase: 'departed',
    visible: false,
    elapsedMs: 3_700,
    tickCount: 19,
  },
  pose: null,
};
assert.deepEqual(layer.authority().lifecycle, {
  visible: false,
  phase: 'departed',
});
assert.throws(
  () => layer.draw(createDrawFrame()),
  /departed actor/i,
  'the Horde layer must not draw historical presence after departure',
);

function createActorFrame(): LermHordePrimaryViewerActorFrame {
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
      phase: 'traversing',
      visible: true,
      elapsedMs: 400,
      tickCount: 2,
    },
    pose: {
      sourceDistance: 1.2,
      motionPhase: 0.2,
      rootFrame: {
        schema: 'kaminos.creature-root-frame.v0',
        origin: { x: 0, y: 1.2, z: 0 },
        lateral: { x: 1, y: 0, z: 0 },
        normal: { x: 0, y: 1, z: 0 },
        tangent: { x: 0, y: 0, z: 1 },
      },
      attention: {
        direction: [0, 0, 1],
        authority: 'fixture',
      },
      support: {
        disposition: 'local-support',
        rootLift: 0.2,
        minimumComplianceMargin: 0.8,
        sampledHeight: 1,
        sampledHillSourceId: terrain.frameId,
        renderedHillSourceId: terrain.frameId,
        hillRevision: 'f6458e5',
        presentationBinding: null,
      },
      squirm: {
        amplitude: 0.082,
        verticalAmplitude: 0.016,
        phase: 2.82,
        phaseSource: 'route-distance-v0',
        terrainSupportProfile: Array.from(
          { length: 7 },
          (_, index) => ({
            t: index / 6,
            localOffset: index * 0.01,
          }),
        ),
      },
      projection: {
        terrainLength: 15,
      },
    },
    terrain: {
      ...terrain,
      trafficChecksum: 'traffic-current',
      supportFrameChecksum: 'support-current',
    },
  };
}

function createDrawFrame(
  overrides: Partial<HillPrimaryViewerActorDrawFrame> = {},
): HillPrimaryViewerActorDrawFrame {
  return {
    schema: HILL_PRIMARY_VIEWER_ACTOR_HOST_SCHEMA,
    route: {
      requested: HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE,
      effective: HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE,
      fallbackStatus: 'none',
      staleStatus: 'fresh',
    },
    drawOrder: HILL_PRIMARY_VIEWER_ACTOR_DRAW_ORDER,
    time: {
      timestampMs: 400,
    },
    viewport: {
      width: 1280,
      height: 720,
      pixelRatio: 2,
    },
    terrain,
    view: {
      yaw: 0.2,
      tilt: 0.72,
      zoom: 1,
      panX: 0,
      panY: 0,
    },
    actor: {
      layerId: LERM_HORDE_PRIMARY_VIEWER_ACTOR_LAYER_ID,
      requestedRoute: LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
      effectiveRoute: LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
    },
    surface: {
      context,
    },
    project(point) {
      projected.push(point);
      return {
        x: point.x * 100 + 640,
        y: 500 - point.y * 100,
        depth: point.z,
      };
    },
    ...overrides,
  };
}

console.log('Lerm Horde primary-viewer actor layer contracts passed');
