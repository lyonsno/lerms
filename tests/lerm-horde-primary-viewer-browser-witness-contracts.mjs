import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const witness = readFileSync(
  'tests/lerm-horde-primary-viewer-browser-witness.mjs',
  'utf8',
);
const composition = readFileSync(
  'src/lerm-horde-primary-viewer-live-composition.ts',
  'utf8',
);

for (const requiredIdentity of [
  'lerms/lerm-horde/primary-viewer-live-composition-v0',
  'lerms/hill-of-hills/primary-viewer-v0',
  'lerms/lerm-horde/primary-viewer-actor-frame-v0',
  'lerms/lerm-horde/primary-viewer-live-worker-v0',
  'actor=lerm-horde-live',
]) {
  assert.match(
    witness,
    new RegExp(requiredIdentity.replaceAll('/', '\\/')),
    `browser witness must pin ${requiredIdentity}`,
  );
}

for (const falseClosureProbe of [
  'requestedRouteVerified',
  'effectiveRouteVerified',
  'noFallbackOrStaleState',
  'hostTerrainIdentityVerified',
  'atomicPublicationVerified',
  'performanceMetricsVerified',
  'frameIntervalsMs',
  'longTasks',
  'actorPixelsPresent',
  'actorPixelsAbsentAfterDeparture',
  'cameraInteractionVerified',
  'terrainChangedDuringTraversal',
  'retainedTrafficAfterDeparture',
  'primaryOutputWritten',
  'failurePhase',
]) {
  assert.match(
    witness,
    new RegExp(falseClosureProbe),
    `browser witness must report ${falseClosureProbe}`,
  );
}

assert.match(
  witness,
  /writeFileSync\(options\.report/,
  'failure before screenshots must still publish a durable report',
);
assert.match(
  witness,
  /Page\.captureScreenshot/,
  'visual closure requires actual canonical-canvas screenshots',
);
assert.match(
  witness,
  /Input\.dispatchMouseEvent/,
  'camera interaction must be exercised through the browser input route',
);
assert.match(
  witness,
  /getImageData/,
  'actor presence and absence must be checked from rendered canvas pixels',
);
assert.match(
  composition,
  /createLermHordePrimaryViewerWebglRasterizer/,
  'the canonical live composition must route the dense exact carrier through the retained WebGL rasterizer',
);
assert.match(
  witness,
  /actorRenderer/,
  'the browser witness must record and verify the effective dense-actor renderer route',
);
assert.match(
  witness,
  /runtimeBackend.*dedicated-worker/s,
  'the browser witness must reject synchronous runtime substitution on the canonical route',
);
assert.match(
  witness,
  /retained-complete-frame/,
  'the witness must distinguish an explicitly aged complete publication from hidden stale state',
);

console.log('Lerm Horde primary-viewer browser witness contracts passed');
