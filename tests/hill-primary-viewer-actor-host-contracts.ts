import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  HILL_PRIMARY_VIEWER_ACTOR_DRAW_ORDER,
  HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE,
  HILL_PRIMARY_VIEWER_ACTOR_HOST_SCHEMA,
  createHillPrimaryViewerActorHost,
  type HillPrimaryViewerActorAuthority,
  type HillPrimaryViewerActorLayer,
  type HillPrimaryViewerProjectionPoint,
} from '../src/terrain/hill-primary-viewer-actor-host.js';
import {
  HILL_PRIMARY_VIEWER_RETAINED_ACTOR_TARGET_ROUTE,
  createHillPrimaryViewerRetainedActorTargetFactory,
} from '../src/terrain/hill-primary-viewer-retained-actor-targets.js';

const terrain = {
  frameId: 'hill-frame-current',
  sampleChecksum: 'sample-current',
  topologyChecksum: 'topology-current',
};
const view = {
  yaw: 0.24,
  tilt: 0.78,
  zoom: 1.12,
  panX: -0.04,
  panY: 0.03,
};
const projected: HillPrimaryViewerProjectionPoint[] = [];
const draws: string[] = [];
const drawingContext = {} as CanvasRenderingContext2D;
const isolatedContexts: CanvasRenderingContext2D[] = [];
let mergedLayerCount = 0;
let compositedFrameCount = 0;
const createFrameTarget = () => ({
  createLayerTarget: () => {
    const context = {} as CanvasRenderingContext2D;
    isolatedContexts.push(context);
    return {
      surface: { context },
      merge: () => {
        mergedLayerCount += 1;
      },
    };
  },
  composite: () => {
    compositedFrameCount += 1;
  },
});
let authority: HillPrimaryViewerActorAuthority = {
  route: {
    requested: 'lerms/lerm-horde/primary-viewer-actor-frame-v0',
    effective: 'lerms/lerm-horde/primary-viewer-actor-frame-v0',
    fallbackStatus: 'none',
    staleStatus: 'fresh',
  },
  lifecycle: {
    visible: true,
    phase: 'traversing',
  },
  terrain,
};

const layer: HillPrimaryViewerActorLayer = {
  id: 'lerm-horde-live',
  authority: () => authority,
  draw: (frame) => {
    assert.equal(frame.schema, HILL_PRIMARY_VIEWER_ACTOR_HOST_SCHEMA);
    assert.equal(frame.route.requested, HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE);
    assert.equal(frame.route.effective, HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE);
    assert.equal(frame.route.fallbackStatus, 'none');
    assert.equal(frame.route.staleStatus, 'fresh');
    assert.equal(frame.drawOrder, HILL_PRIMARY_VIEWER_ACTOR_DRAW_ORDER);
    assert.deepEqual(frame.terrain, terrain);
    assert.deepEqual(frame.view, view);
    assert.equal(frame.time.timestampMs, 420);
    assert.equal(frame.viewport.width, 1280);
    assert.equal(frame.viewport.height, 720);
    assert.equal('camera' in frame, false);
    assert.equal('controls' in frame, false);
    assert.equal('animationLoop' in frame, false);
    assert.notEqual(
      frame.surface.context,
      drawingContext,
      'producer actor must receive an isolated context, not the canonical Hill context',
    );
    const point = frame.project({ x: 1.5, y: 0.75, z: -2 });
    projected.push(point);
    draws.push(frame.actor.effectiveRoute);
  },
};

const host = createHillPrimaryViewerActorHost();
host.register(layer);

assert.throws(
  () => host.register(layer),
  /already registered/i,
  'duplicate layer registration must fail loud',
);

const receipt = host.draw({
  timestampMs: 420,
  viewport: { width: 1280, height: 720 },
  terrain,
  view,
  createFrameTarget,
  project: (point) => ({
    x: point.x * 10 + view.yaw,
    y: point.z * -8 - point.y + view.tilt,
    depth: point.z,
  }),
});

assert.equal(receipt.schema, HILL_PRIMARY_VIEWER_ACTOR_HOST_SCHEMA);
assert.equal(receipt.route.requested, HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE);
assert.equal(receipt.route.effective, HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE);
assert.equal(receipt.route.fallbackStatus, 'none');
assert.equal(receipt.route.staleStatus, 'fresh');
assert.equal(receipt.drawOrder, HILL_PRIMARY_VIEWER_ACTOR_DRAW_ORDER);
assert.equal(receipt.registeredLayerCount, 1);
assert.equal(receipt.visibleLayerCount, 1);
assert.equal(receipt.drawnLayerCount, 1);
assert.deepEqual(receipt.effectiveActorRoutes, [
  'lerms/lerm-horde/primary-viewer-actor-frame-v0',
]);
assert.deepEqual(draws, [
  'lerms/lerm-horde/primary-viewer-actor-frame-v0',
]);
assert.deepEqual(projected, [
  {
    x: 15.24,
    y: 16.03,
    depth: -2,
  },
]);
assert.equal(mergedLayerCount, 1);
assert.equal(compositedFrameCount, 1);

authority = {
  ...authority,
  lifecycle: {
    visible: false,
    phase: 'departed',
  },
};
const departedReceipt = host.draw({
  timestampMs: 900,
  viewport: { width: 1280, height: 720 },
  terrain,
  view,
  createFrameTarget,
  project: () => ({ x: 0, y: 0, depth: 0 }),
});
assert.equal(departedReceipt.visibleLayerCount, 0);
assert.equal(departedReceipt.drawnLayerCount, 0);
assert.deepEqual(draws, [
  'lerms/lerm-horde/primary-viewer-actor-frame-v0',
]);
assert.equal(
  isolatedContexts.length,
  1,
  'a departed actor must not allocate an authoritative-looking drawing target',
);

authority = {
  ...authority,
  lifecycle: {
    visible: true,
    phase: 'traversing',
  },
  terrain: {
    ...terrain,
    sampleChecksum: 'stale-sample',
  },
};
assert.throws(
  () =>
    host.draw({
      timestampMs: 940,
      viewport: { width: 1280, height: 720 },
      terrain,
      view,
      createFrameTarget,
      project: () => ({ x: 0, y: 0, depth: 0 }),
    }),
  /current Hill terrain/i,
  'stale actor terrain must fail before drawing',
);

authority = {
  ...authority,
  terrain,
  route: {
    ...authority.route,
    effective: 'fallback/actor-frame',
    fallbackStatus: 'fallback',
  },
};
assert.throws(
  () =>
    host.draw({
      timestampMs: 980,
      viewport: { width: 1280, height: 720 },
      terrain,
      view,
      createFrameTarget,
      project: () => ({ x: 0, y: 0, depth: 0 }),
    }),
  /fallback/i,
  'fallback actor routes must not impersonate the official host',
);

const preRepairFalseClosures: string[] = [];
const validAuthority = (): HillPrimaryViewerActorAuthority => ({
  route: {
    requested: 'lerms/lerm-horde/primary-viewer-actor-frame-v0',
    effective: 'lerms/lerm-horde/primary-viewer-actor-frame-v0',
    fallbackStatus: 'none',
    staleStatus: 'fresh',
  },
  lifecycle: {
    visible: true,
    phase: 'traversing',
  },
  terrain,
});
const invalidSecondLayerHost = createHillPrimaryViewerActorHost();
let firstLayerDraws = 0;
invalidSecondLayerHost.register({
  id: 'valid-first',
  authority: validAuthority,
  draw: () => {
    firstLayerDraws += 1;
  },
});
invalidSecondLayerHost.register({
  id: 'invalid-second',
  authority: () => ({
    ...validAuthority(),
    route: {
      ...validAuthority().route,
      fallbackStatus: 'fallback',
    },
  }),
  draw: () => {
    throw new Error('invalid second layer must never draw');
  },
});
assert.throws(
  () =>
    invalidSecondLayerHost.draw({
      timestampMs: 1_000,
      viewport: { width: 1280, height: 720 },
      terrain,
      view,
      createFrameTarget,
      project: () => ({ x: 0, y: 0, depth: 0 }),
    }),
  /fallback/i,
);
if (firstLayerDraws !== 0) {
  preRepairFalseClosures.push(
    'a valid first layer drew before invalid second-layer authority failed',
  );
}
if (isolatedContexts.length !== 1) {
  preRepairFalseClosures.push(
    'invalid whole-frame authority allocated an actor drawing target',
  );
}

const malformedLifecycleHost = createHillPrimaryViewerActorHost();
malformedLifecycleHost.register({
  id: 'malformed-lifecycle',
  authority: () =>
    ({
      ...validAuthority(),
      lifecycle: {
        visible: undefined,
        phase: 'traversing',
      },
    }) as unknown as HillPrimaryViewerActorAuthority,
  draw: () => {
    throw new Error('malformed lifecycle must never draw');
  },
});
let malformedLifecycleFailed = false;
try {
  malformedLifecycleHost.draw({
    timestampMs: 1_040,
    viewport: { width: 1280, height: 720 },
    terrain,
    view,
    createFrameTarget,
    project: () => ({ x: 0, y: 0, depth: 0 }),
  });
} catch {
  malformedLifecycleFailed = true;
}
if (!malformedLifecycleFailed) {
  preRepairFalseClosures.push(
    'malformed lifecycle authority impersonated a departed actor',
  );
}

const rawContextHost = createHillPrimaryViewerActorHost();
const actorContexts: CanvasRenderingContext2D[] = [];
rawContextHost.register({
  id: 'raw-context-probe',
  authority: validAuthority,
  draw: (frame) => {
    actorContexts.push(frame.surface.context);
  },
});
for (const timestampMs of [1_080, 1_120]) {
  rawContextHost.draw({
    timestampMs,
    viewport: { width: 1280, height: 720 },
    terrain,
    view,
    createFrameTarget,
    project: () => ({ x: 0, y: 0, depth: 0 }),
  });
}
if (actorContexts.some((context) => context === drawingContext)) {
  preRepairFalseClosures.push(
    'producer actor received the canonical long-lived Hill canvas context',
  );
}
if (
  actorContexts.length !== 2 ||
  actorContexts[0] === actorContexts[1]
) {
  preRepairFalseClosures.push(
    'producer actor retained the same isolated context across Hill frames',
  );
}

const drawFailureHost = createHillPrimaryViewerActorHost();
drawFailureHost.register({
  id: 'draw-success-first',
  authority: validAuthority,
  draw: () => {},
});
drawFailureHost.register({
  id: 'draw-failure-second',
  authority: validAuthority,
  draw: () => {
    throw new Error('actor draw failure');
  },
});
let failedFrameMerges = 0;
let failedFrameComposites = 0;
assert.throws(
  () =>
    drawFailureHost.draw({
      timestampMs: 1_160,
      viewport: { width: 1280, height: 720 },
      terrain,
      view,
      createFrameTarget: () => ({
        createLayerTarget: () => ({
          surface: {
            context: {} as CanvasRenderingContext2D,
          },
          merge: () => {
            failedFrameMerges += 1;
          },
        }),
        composite: () => {
          failedFrameComposites += 1;
        },
      }),
      project: () => ({ x: 0, y: 0, depth: 0 }),
    }),
  /actor draw failure/i,
);
if (failedFrameMerges !== 0 || failedFrameComposites !== 0) {
  preRepairFalseClosures.push(
    'a failed actor draw partially merged or composited the actor frame',
  );
}

const mutableFirstAuthority = validAuthority();
const authorityMutationHost = createHillPrimaryViewerActorHost();
let mutationProbeDraws = 0;
authorityMutationHost.register({
  id: 'authority-snapshot-first',
  authority: () => mutableFirstAuthority,
  draw: () => {
    mutationProbeDraws += 1;
  },
});
authorityMutationHost.register({
  id: 'authority-mutator-second',
  authority: () => {
    mutableFirstAuthority.lifecycle = {
      visible: false,
      phase: 'departed',
    };
    return validAuthority();
  },
  draw: () => {
    mutationProbeDraws += 1;
  },
});
const authorityMutationReceipt = authorityMutationHost.draw({
  timestampMs: 1_200,
  viewport: { width: 1280, height: 720 },
  terrain,
  view,
  createFrameTarget,
  project: () => ({ x: 0, y: 0, depth: 0 }),
});
if (
  authorityMutationReceipt.visibleLayerCount !== 2 ||
  mutationProbeDraws !== 2
) {
  preRepairFalseClosures.push(
    'a later authority callback mutated an already validated layer snapshot',
  );
}

assert.deepEqual(
  preRepairFalseClosures,
  [],
  'primary-viewer actor host must reject partial authority and isolate producer drawing',
);

let retainedCanvasCount = 0;
let retainedDrawImageCount = 0;
const retainedContexts: CanvasRenderingContext2D[] = [];
const retainedTargets =
  createHillPrimaryViewerRetainedActorTargetFactory({
    createCanvas: () => {
      retainedCanvasCount += 1;
      const retainedContext = {
        clearRect() {},
        setTransform() {},
        drawImage() {
          retainedDrawImageCount += 1;
        },
      } as unknown as CanvasRenderingContext2D;
      retainedContexts.push(retainedContext);
      return {
        width: 0,
        height: 0,
        getContext: () => retainedContext,
      };
    },
    compositeContext: {
      drawImage() {
        retainedDrawImageCount += 1;
      },
    } as unknown as CanvasRenderingContext2D,
  });

for (const timestampMs of [1_240, 1_280]) {
  const target = retainedTargets.createFrameTarget({
    timestampMs,
    viewport: {
      width: 1280,
      height: 720,
      pixelRatio: 2,
    },
    terrain,
  });
  const layerTarget = target.createLayerTarget({
    layerId: 'retained-lerm',
    requestedRoute:
      'lerms/lerm-horde/primary-viewer-actor-frame-v0',
    effectiveRoute:
      'lerms/lerm-horde/primary-viewer-actor-frame-v0',
  });
  assert.equal(
    layerTarget.surface.context,
    retainedContexts[1],
    'the retained seam substituted the producer layer context',
  );
  layerTarget.merge();
  target.composite();
  assert.throws(
    () => target.composite(),
    /publish twice/i,
    'one retained actor generation cannot publish twice',
  );
}
assert.equal(
  retainedCanvasCount,
  2,
  'the retained seam must allocate one frame and one named layer canvas, not two full-size canvases per frame',
);
assert.equal(retainedDrawImageCount, 4);
assert.deepEqual(retainedTargets.stats(), {
  route: HILL_PRIMARY_VIEWER_RETAINED_ACTOR_TARGET_ROUTE,
  frameCanvasCount: 1,
  layerCanvasCount: 1,
  frameGeneration: 2,
});

const primaryViewerSource = readFileSync(resolve('src/main.ts'), 'utf8');
assert.match(
  primaryViewerSource,
  /hillPrimaryViewerActorHost\.draw\(\{[\s\S]*terrainBuffer\.source\.frameId[\s\S]*terrainBuffer\.sampleChecksum[\s\S]*terrainBuffer\.topologyChecksum[\s\S]*createFrameTarget:\s*retainedActorTargets\.createFrameTarget[\s\S]*project:/,
  'canonical primary viewer does not supply current Hill identity, isolated actor target factory, and projection to the actor host',
);
assert.doesNotMatch(
  primaryViewerSource,
  /surface:\s*\{\s*context:\s*ctx\s*\}/,
  'canonical primary viewer must not pass its long-lived context to producer actor code',
);
assert.match(
  primaryViewerSource,
  /createHillPrimaryViewerRetainedActorTargetFactory/,
  'canonical primary viewer does not use the Hill-owned retained actor presentation seam',
);
assert.doesNotMatch(
  primaryViewerSource,
  /function createActorFrameTarget[\s\S]*document\.createElement\('canvas'\)/,
  'canonical primary viewer still allocates full-size actor canvases inside every visible frame',
);
assert.match(
  primaryViewerSource,
  /drawTerrain\(terrainBuffer,\s*width,\s*height\);[\s\S]*hillPrimaryViewerActorHost\.draw\([\s\S]*drawRouteMarkers\(terrainBuffer,\s*width,\s*height\);[\s\S]*drawWitness\(terrainBuffer\);/,
  'actor host is not wired at the declared terrain-before-markers-and-witness draw order',
);
assert.match(
  primaryViewerSource,
  /actor host:[\s\S]*effectiveActorRoutes/,
  'primary viewer witness does not expose effective host and actor routes',
);

console.log('Hill primary-viewer actor host contracts passed');
