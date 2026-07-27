import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

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
  'status',
  'error',
  'route',
  'publication',
  'terrain',
  'hostTerrain',
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
  'worker reported an error',
  'requested frame count',
  'Hill identity or checksum',
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
assert.throws(
  () =>
    validateActorFilmstripFrames(smoothFrames.slice(0, 2), {
      expectedFrameCount: 3,
    }),
  /requested frame count|partial filmstrip/i,
  'a fixed-count filmstrip cannot silently close on two frames',
);

for (const [label, mutate, pattern] of [
  [
    'mid-capture worker failure',
    (candidate) => {
      candidate.status = 'failed';
      candidate.error = 'primary-viewer worker publication failure';
    },
    /worker|status|live/i,
  ],
  [
    'route fallback',
    (candidate) => {
      candidate.route.fallbackStatus = 'fallback';
    },
    /fallback|route/i,
  ],
  [
    'partial publication',
    (candidate) => {
      candidate.publication.completeness = 'partial';
    },
    /partial|atomic|publication/i,
  ],
  [
    'same-frame Hill checksum substitution',
    (candidate) => {
      candidate.hostTerrain.sampleChecksum = 'substituted-sample';
    },
    /checksum|Hill|terrain/i,
  ],
  [
    'same-frame traffic checksum substitution',
    (candidate) => {
      candidate.terrainFrameId = smoothFrames[0].terrainFrameId;
      candidate.terrain = {
        ...smoothFrames[0].terrain,
        trafficChecksum: 'substituted-traffic',
      };
      candidate.hostTerrain = {
        ...smoothFrames[0].hostTerrain,
      };
    },
    /traffic|checksum|Hill|terrain/i,
  ],
]) {
  const invalidFrames = smoothFrames.map((candidate) =>
    structuredClone(candidate),
  );
  mutate(invalidFrames[1]);
  assert.throws(
    () =>
      validateActorFilmstripFrames(invalidFrames, {
        expectedFrameCount: 3,
      }),
    pattern,
    `${label} must fail the filmstrip`,
  );
}

for (const {
  label,
  frames,
  expectedTrustedCount,
  errorPattern,
} of adversarialFixtureCases(smoothFrames)) {
  const outputRoot = mkdtempSync(
    `${tmpdir()}/lerms-filmstrip-adversarial-`,
  );
  const fixturePath = resolve(outputRoot, 'fixture.json');
  const reportPath = resolve(outputRoot, 'report.json');
  writeFileSync(
    fixturePath,
    `${JSON.stringify({ frames }, null, 2)}\n`,
  );
  const result = spawnSync(
    process.execPath,
    [
      'tests/lerm-horde-primary-viewer-filmstrip-witness.mjs',
      '--adversarial-fixture',
      fixturePath,
      '--frame-count',
      '3',
      '--cadence-ms',
      '150',
      '--zoom',
      '1.75',
      '--output-root',
      outputRoot,
      '--report',
      reportPath,
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );
  assert.notEqual(
    result.status,
    0,
    `${label} must exit nonzero`,
  );
  const failureReport = JSON.parse(
    readFileSync(reportPath, 'utf8'),
  );
  assert.equal(
    failureReport.evidenceMode,
    'adversarial-fixture',
    `${label} report must fail loud as non-browser evidence`,
  );
  assert.equal(failureReport.ok, false, `${label} cannot close`);
  assert.equal(
    failureReport.failurePhase,
    'capturing-fixed-cadence-frames',
    `${label} report must name the exact failure phase`,
  );
  assert.equal(
    failureReport.frames.length,
    expectedTrustedCount,
    `${label} report must preserve only the last trustworthy observations`,
  );
  assert.match(
    failureReport.error,
    errorPattern,
    `${label} report must preserve the falsifying reason`,
  );
  assert.equal(
    failureReport.lastTrustworthyObservation?.index,
    expectedTrustedCount - 1,
    `${label} report must name the last trustworthy observation`,
  );
}

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
    route: {
      ...smoothFrames[0].route,
      staleStatus: 'retained-complete-frame',
    },
    publication: {
      ...smoothFrames[0].publication,
      presentationAgeMs: 150,
    },
    terrain: { ...smoothFrames[0].terrain },
    hostTerrain: { ...smoothFrames[0].hostTerrain },
    runtimeElapsedMs: smoothFrames[0].runtimeElapsedMs,
    tickCount: smoothFrames[0].tickCount,
    sourceDistance: smoothFrames[0].sourceDistance,
    terrainFrameId: smoothFrames[0].terrainFrameId,
    screenshotSha256: smoothFrames[0].screenshotSha256,
    observationToken: `${smoothFrames[0].terrainFrameId}:${smoothFrames[0].publication.generation}:999:${smoothFrames[0].tickCount}`,
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
{
  const outputRoot = mkdtempSync(
    `${tmpdir()}/lerms-filmstrip-retained-control-`,
  );
  const fixturePath = resolve(outputRoot, 'fixture.json');
  const reportPath = resolve(outputRoot, 'report.json');
  writeFileSync(
    fixturePath,
    `${JSON.stringify({ frames: retainedFrames }, null, 2)}\n`,
  );
  const result = spawnSync(
    process.execPath,
    [
      'tests/lerm-horde-primary-viewer-filmstrip-witness.mjs',
      '--adversarial-fixture',
      fixturePath,
      '--frame-count',
      '2',
      '--cadence-ms',
      '150',
      '--zoom',
      '1.75',
      '--output-root',
      outputRoot,
      '--report',
      reportPath,
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );
  assert.notEqual(
    result.status,
    0,
    'a scripted retained control cannot become browser evidence',
  );
  const retainedReport = JSON.parse(
    readFileSync(reportPath, 'utf8'),
  );
  assert.equal(
    retainedReport.fixtureValidationStatus,
    'passed',
    'the process-level witness must accept a lawful retained frame',
  );
  assert.equal(
    retainedReport.failurePhase,
    'adversarial-fixture-non-evidence',
    'a valid scripted fixture must still fail loud as non-evidence',
  );
  assert.equal(retainedReport.frames.length, 2);
  assert.equal(retainedReport.ok, false);
}
assert.throws(
  () =>
    validateActorFilmstripFrames([
      smoothFrames[0],
      {
        ...smoothFrames[1],
        runtimeElapsedMs: smoothFrames[0].runtimeElapsedMs - 1,
        publication: {
          ...smoothFrames[1].publication,
          sourceElapsedMs:
            smoothFrames[0].runtimeElapsedMs - 1,
        },
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
    status: 'live',
    error: 'none',
    lifecyclePhase: 'traversing',
    lifecycleVisible: true,
    captureStartedAtMs: index * 500,
    captureCompletedAtMs: index * 500 + 25,
    runtimeElapsedMs,
    tickCount: index + 3,
    drawCount: index + 10,
    terrainFrameId: `terrain-${index}`,
    route: {
      composition:
        'lerms/lerm-horde/primary-viewer-live-composition-v0',
      viewer: 'lerms/hill-of-hills/primary-viewer-v0',
      presentation:
        'lerms/lerm-horde/indexed-textured-axial-gpu-v0',
      runtime:
        'lerms/lerm-horde/primary-viewer-live-worker-v0',
      runtimeBackend: 'dedicated-worker',
      fallbackStatus: 'none',
      staleStatus: 'fresh',
    },
    publication: {
      generation: index + 3,
      sourceElapsedMs: runtimeElapsedMs,
      hostPublishedAtMs: index * 500,
      presentationAgeMs: 0,
      completeness: 'atomic-terrain-actor',
    },
    terrain: {
      frameId: `terrain-${index}`,
      sampleChecksum: `sample-${index}`,
      topologyChecksum: `topology-${index}`,
      trafficChecksum: `traffic-${index}`,
    },
    hostTerrain: {
      frameId: `terrain-${index}`,
      sampleChecksum: `sample-${index}`,
      topologyChecksum: `topology-${index}`,
    },
    observationToken: `terrain-${index}:${index + 3}:${index + 10}:${index + 3}`,
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

function adversarialFixtureCases(smoothFrames) {
  const failed = smoothFrames.map((candidate) =>
    structuredClone(candidate),
  );
  failed[1].status = 'failed';
  failed[1].error = 'primary-viewer worker publication failure';

  const partial = smoothFrames.map((candidate) =>
    structuredClone(candidate),
  );
  partial[1].publication.completeness = 'partial';

  const checksum = smoothFrames.map((candidate) =>
    structuredClone(candidate),
  );
  checksum[1].hostTerrain.topologyChecksum =
    'substituted-topology';

  const traffic = smoothFrames.map((candidate) =>
    structuredClone(candidate),
  );
  traffic[1].terrainFrameId = smoothFrames[0].terrainFrameId;
  traffic[1].terrain = {
    ...smoothFrames[0].terrain,
    trafficChecksum: 'substituted-traffic',
  };
  traffic[1].hostTerrain = {
    ...smoothFrames[0].hostTerrain,
  };

  return [
    {
      label: 'mid-capture worker failure',
      frames: failed,
      expectedTrustedCount: 1,
      errorPattern: /worker reported an error|status is not live/i,
    },
    {
      label: 'partial publication',
      frames: partial,
      expectedTrustedCount: 1,
      errorPattern: /partial or mixed atomic publication/i,
    },
    {
      label: 'same-frame Hill checksum substitution',
      frames: checksum,
      expectedTrustedCount: 1,
      errorPattern: /Hill identity or checksum/i,
    },
    {
      label: 'same-frame traffic checksum substitution',
      frames: traffic,
      expectedTrustedCount: 1,
      errorPattern: /traffic|Hill identity or checksum/i,
    },
    {
      label: 'requested-count truncation',
      frames: smoothFrames.slice(0, 2),
      expectedTrustedCount: 2,
      errorPattern: /requested frame count|partial filmstrip/i,
    },
  ];
}

console.log('Lerm Horde primary-viewer filmstrip contracts passed');
