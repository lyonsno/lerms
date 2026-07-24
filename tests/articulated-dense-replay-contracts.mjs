import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/hand/live-hand.ts', import.meta.url), 'utf8');
const witnessSource = await readFile(new URL('../articulated-dense-witness.mjs', import.meta.url), 'utf8');
const fixture = JSON.parse(
  await readFile(new URL('./fixtures/articulated-mano-dense.json', import.meta.url), 'utf8'),
);

assert.equal(fixture.schema, 'lerms.articulated-mano-dense-fixture.v1');
assert.equal(fixture.sourceAuthority, 'deterministic_fixture_not_live_camera');
assert.equal(
  fixture.effectiveRoute,
  'hand-state-runtime/deterministic-articulated-replay-not-camera-v1',
);
assert.equal(fixture.geometryMode, 'native_mano_regeneration');
assert.equal(fixture.vertexCount, 778);
assert.equal(fixture.faceCount, 1538);
assert.equal(fixture.frames.length, fixture.frameCount);
assert.ok(fixture.frames.length >= 90, 'dense replay must span many presentation frames');
assert.ok(fixture.frames.every(frame => frame.vertices.length === 778), 'every replay frame has full MANO geometry');
assert.ok(fixture.frames.every(frame => frame.keypoints3d.length === 21), 'every replay frame has complete joints');
assert.ok(
  fixture.frames.every(frame => frame.diagnostics.maxJointStepAppliedRad <= frame.diagnostics.jointStepLimitRad + 1e-8),
  'every visible correction respects its cadence-scaled limit',
);

assert.match(source, /fixtureKind === 'articulated'/, 'the viewer exposes an explicit articulated fixture route');
assert.match(
  source,
  /deterministic_fixture_not_live_camera/,
  'the replay never presents fixture geometry as live camera evidence',
);
assert.match(
  source,
  /Math\.floor\(\(now - articulatedFixtureStartedAt\) \* articulatedFixture\.frameRate \/ 1000\)/,
  'dense frames advance from presentation time at their recorded cadence',
);
assert.match(
  source,
  /applyDensityBenchFixture\('five-finger'\)/,
  'the articulated witness runs under the five-finger fluid workload',
);
assert.match(source, /__lermsArticulatedFixtureReplay/, 'the viewer exposes fixture-only source-frame stepping');
assert.match(witnessSource, /deterministic_source_frame_selection_not_realtime_cadence/, 'witness labels stepped evidence honestly');
assert.match(witnessSource, /lerms\.articulated-dense-witness\.v1/, 'witness writes a versioned durable report');
assert.match(witnessSource, /failurePhase/, 'witness records pre-output failure phase');
assert.match(witnessSource, /lastTrustworthyEvidence/, 'witness records its last trustworthy evidence');
assert.match(witnessSource, /deterministic_fixture_not_live_camera/, 'witness requires fixture authority');
assert.match(witnessSource, /fixture_density_bench_not_live_hand/, 'witness requires fixture fluid authority');
assert.match(witnessSource, /currentFrameIndex/, 'witness records dense frame progression');
assert.match(witnessSource, /Page\.captureScreenshot/, 'witness captures rendered pixels');
assert.match(witnessSource, /blankOrPartialOutput/, 'witness rejects missing or blank visual output');
assert.match(witnessSource, /captureCadenceShadowed/, 'witness rejects hidden work that overrides caller cadence');
assert.match(witnessSource, /captureWallTimestampMs/, 'witness records actual capture cadence');

console.log('articulated dense replay contracts ok');
