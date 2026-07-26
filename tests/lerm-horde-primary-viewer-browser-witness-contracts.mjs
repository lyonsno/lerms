import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const witness = readFileSync(
  'tests/lerm-horde-primary-viewer-browser-witness.mjs',
  'utf8',
);

for (const requiredIdentity of [
  'lerms/lerm-horde/primary-viewer-live-composition-v0',
  'lerms/hill-of-hills/primary-viewer-v0',
  'lerms/lerm-horde/primary-viewer-actor-frame-v0',
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

console.log('Lerm Horde primary-viewer browser witness contracts passed');
