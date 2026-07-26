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
  surface: { context: drawingContext },
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
  surface: { context: drawingContext },
  project: () => ({ x: 0, y: 0, depth: 0 }),
});
assert.equal(departedReceipt.visibleLayerCount, 0);
assert.equal(departedReceipt.drawnLayerCount, 0);
assert.deepEqual(draws, [
  'lerms/lerm-horde/primary-viewer-actor-frame-v0',
]);

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
      surface: { context: drawingContext },
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
      surface: { context: drawingContext },
      project: () => ({ x: 0, y: 0, depth: 0 }),
    }),
  /fallback/i,
  'fallback actor routes must not impersonate the official host',
);

const primaryViewerSource = readFileSync(resolve('src/main.ts'), 'utf8');
assert.match(
  primaryViewerSource,
  /hillPrimaryViewerActorHost\.draw\(\{[\s\S]*terrainBuffer\.source\.frameId[\s\S]*terrainBuffer\.sampleChecksum[\s\S]*terrainBuffer\.topologyChecksum[\s\S]*surface:\s*\{\s*context:\s*ctx[\s\S]*project:/,
  'canonical primary viewer does not supply current Hill identity, drawing surface, and projection to the actor host',
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
