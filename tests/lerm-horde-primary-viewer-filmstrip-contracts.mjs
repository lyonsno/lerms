import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  analyzeActorFilmstrip,
  validateActorFilmstripFrames,
} from './lerm-horde-primary-viewer-filmstrip-analysis.mjs';

const witness = readFileSync(
  'tests/lerm-horde-primary-viewer-filmstrip-witness.mjs',
  'utf8',
);
const analysis = readFileSync(
  'tests/lerm-horde-primary-viewer-filmstrip-analysis.mjs',
  'utf8',
);
const harness = `${witness}\n${analysis}`;

for (const requiredIdentity of [
  'lerms.horde-primary-viewer-actor-filmstrip.v0',
  'lerms/lerm-horde/primary-viewer-live-composition-v0',
  'lerms/hill-of-hills/primary-viewer-v0',
  'lerms/lerm-horde/indexed-textured-axial-gpu-v0',
  'actor=lerm-horde-live',
]) {
  assert.match(
    witness,
    new RegExp(requiredIdentity.replaceAll('/', '\\/')),
    `filmstrip witness must pin ${requiredIdentity}`,
  );
}

for (const evidenceField of [
  'requestedCadenceMs',
  'requestedZoom',
  'effectiveView',
  'baselinePresentationRate',
  'captureStartedAtMs',
  'captureCompletedAtMs',
  'runtimeElapsedMs',
  'tickCount',
  'rootWorld',
  'rootScreen',
  'sourceDistance',
  'phase',
  'supportProfile',
  'rootCropSpeciesPixels',
  'speciesBounds',
  'silhouetteAreaRatio',
  'observationToken',
  'screenshotSha256',
  'adjacentTransitions',
  'failurePhase',
  'primaryOutputWritten',
]) {
  assert.match(
    harness,
    new RegExp(evidenceField),
    `filmstrip witness must record ${evidenceField}`,
  );
}

for (const falseClosurePath of [
  'fallback',
  'partial',
  'blank',
  'duplicate',
  'nonmonotonic',
  'cross-loop',
  'capture cadence',
  'presentation-rate-low',
  'visible actor disappeared',
]) {
  assert.match(
    harness,
    new RegExp(falseClosurePath, 'i'),
    `filmstrip witness must fail loud on ${falseClosurePath}`,
  );
}

assert.match(
  witness,
  /Page\.captureScreenshot/,
  'the final contact sheet must be captured from browser pixels',
);
assert.match(
  witness,
  /captureActorObservation/,
  'each filmstrip frame must atomically capture state and canonical-canvas pixels',
);
assert.match(
  witness,
  /same-observation/i,
  'the witness must name its telemetry-to-pixel same-observation contract',
);
assert.match(
  witness,
  /retained-complete-frame.*atomic-terrain-actor/s,
  'the filmstrip must admit only explicitly aged retained atomic worker frames rather than rejecting or laundering them as fresh',
);
assert.match(
  witness,
  /writeFileSync\(options\.report/,
  'failure before the contact sheet must still write a durable report',
);
assert.match(
  witness,
  /writeFilmstripHtml/,
  'the witness must build an inspectable dense contact sheet',
);

const smoothFrames = [
  frame(0, 300, 0, 120, 220, 420),
  frame(1, 380, 0.12, 124, 219, 415),
  frame(2, 460, 0.24, 128, 218, 410),
];
assert.doesNotThrow(() => validateActorFilmstripFrames(smoothFrames));
assert.deepEqual(analyzeActorFilmstrip(smoothFrames).suspicions, []);

const dropoutFrames = [
  ...smoothFrames.slice(0, 2),
  {
    ...smoothFrames[2],
    rootCropSpeciesPixels: 0,
    screenshotSha256: 'dropout',
  },
];
assert.ok(
  analyzeActorFilmstrip(dropoutFrames).suspicions.some(
    ({ kind }) => kind === 'actor-pixel-dropout',
  ),
  'visible actor pixel loss must be diagnosed',
);

const supportJumpFrames = [
  smoothFrames[0],
  {
    ...smoothFrames[1],
    supportProfile: smoothFrames[1].supportProfile.map((sample) => ({
      ...sample,
      localOffset: sample.localOffset + 0.8,
    })),
  },
];
assert.ok(
  analyzeActorFilmstrip(supportJumpFrames).suspicions.some(
    ({ kind }) => kind === 'support-profile-jump',
  ),
  'terrain support discontinuity must be diagnosed',
);

const silhouetteJumpFrames = [
  smoothFrames[0],
  {
    ...smoothFrames[1],
    rootCropSpeciesPixels:
      smoothFrames[0].rootCropSpeciesPixels * 2,
    speciesBounds: {
      minX: -42,
      minY: -40,
      maxX: 42,
      maxY: 40,
      width: 85,
      height: 81,
    },
  },
];
assert.ok(
  analyzeActorFilmstrip(silhouetteJumpFrames).suspicions.some(
    ({ kind }) => kind === 'actor-silhouette-jump',
  ),
  'abrupt actor silhouette changes must be diagnosed',
);

const retainedFrames = [
  smoothFrames[0],
  {
    ...smoothFrames[1],
    runtimeElapsedMs: smoothFrames[0].runtimeElapsedMs,
    tickCount: smoothFrames[0].tickCount,
    sourceDistance: smoothFrames[0].sourceDistance,
    terrainFrameId: smoothFrames[0].terrainFrameId,
    observationToken: `${smoothFrames[0].terrainFrameId}:999:${smoothFrames[0].tickCount}`,
  },
];
assert.doesNotThrow(
  () => validateActorFilmstripFrames(retainedFrames),
  'an explicitly retained atomic worker frame is evidence, not invalid telemetry',
);
assert.ok(
  analyzeActorFilmstrip(retainedFrames).suspicions.some(
    ({ kind }) => kind === 'retained-frame-hold',
  ),
  'a retained worker frame must remain visible as a stutter suspicion',
);
assert.throws(
  () =>
    validateActorFilmstripFrames([
      smoothFrames[0],
      {
        ...smoothFrames[1],
        runtimeElapsedMs: smoothFrames[0].runtimeElapsedMs - 1,
      },
    ]),
  /nonmonotonic/i,
  'a regressing worker frame must still fail loud',
);
assert.throws(
  () =>
    validateActorFilmstripFrames([
      smoothFrames[0],
      {
        ...smoothFrames[1],
        screenshotSha256: smoothFrames[0].screenshotSha256,
      },
    ]),
  /duplicate/i,
);

function frame(
  index,
  runtimeElapsedMs,
  rootX,
  screenX,
  screenY,
  pixels,
) {
  return {
    index,
    lifecyclePhase: 'traversing',
    lifecycleVisible: true,
    captureStartedAtMs: index * 500,
    captureCompletedAtMs: index * 500 + 25,
    runtimeElapsedMs,
    tickCount: index + 3,
    drawCount: index + 10,
    terrainFrameId: `terrain-${index}`,
    observationToken: `terrain-${index}:${index + 10}:${index + 3}`,
    rootWorld: { x: rootX, y: 1.1, z: index * 0.08 },
    rootScreen: { x: screenX, y: screenY, depth: index * 0.08 },
    sourceDistance: index * 0.2,
    phase: index * 0.47,
    supportProfile: Array.from({ length: 7 }, (_, station) => ({
      t: station / 6,
      localOffset: station * 0.01 + index * 0.002,
    })),
    rootCropSpeciesPixels: pixels,
    speciesBounds: {
      minX: -20,
      minY: -24,
      maxX: 20,
      maxY: 24,
      width: 41,
      height: 49,
    },
    screenshotSha256: String(index + 1).padStart(64, '0'),
  };
}

console.log('Lerm Horde primary-viewer filmstrip contracts passed');
