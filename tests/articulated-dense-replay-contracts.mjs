import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  evaluateExactFluidWorkloadMismatch,
  evaluateHandVisualMismatch,
  mayPromotePrimaryOutput,
} from '../articulated-dense-witness-contract.mjs';

const source = await readFile(new URL('../src/hand/live-hand.ts', import.meta.url), 'utf8');
const witnessSource = await readFile(new URL('../articulated-dense-witness.mjs', import.meta.url), 'utf8');
const witnessContractSource = await readFile(
  new URL('../articulated-dense-witness-contract.mjs', import.meta.url),
  'utf8',
);
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
assert.match(witnessContractSource, /fixture_density_bench_not_live_hand/, 'witness requires fixture fluid authority');
assert.match(witnessSource, /currentFrameIndex/, 'witness records dense frame progression');
assert.match(witnessSource, /Page\.captureScreenshot/, 'witness captures rendered pixels');
assert.match(witnessSource, /blankOrPartialOutput/, 'witness rejects missing or blank visual output');
assert.match(witnessSource, /captureCadenceShadowed/, 'witness rejects hidden work that overrides caller cadence');
assert.match(witnessSource, /captureWallTimestampMs/, 'witness records actual capture cadence');
assert.match(
  source,
  /articulatedFixture\s*\?\s*ARTICULATED_FIXTURE_ROUTE\s*:\s*null/,
  'fixture route truth is effective only after the articulated fixture loads',
);
assert.match(witnessSource, /handWitnessPath/, 'witness captures hand-isolated pixels beside the composed frame');
assert.match(
  witnessSource,
  /--adversarial-hand-mode[\s\S]*hidden/,
  'witness can fault-inject a hidden hand without disabling the animated fluid page',
);
assert.match(witnessSource, /candidateContactSheetPath/, 'contact sheet remains non-primary while evidence is validated');
assert.match(
  witnessSource,
  /renameSync\(candidateContactSheetPath,\s*contactSheetPath\)/,
  'validated contact sheet promotion is atomic',
);
assert.ok(
  witnessSource.indexOf("failurePhase = 'validate_evidence'") < witnessSource.indexOf("failurePhase = 'promote_primary_output'"),
  'evidence validation precedes primary output promotion',
);

const exactFluid = {
  pinnedRevision: '71d09e78fbf16c9edecde3ea72a82ba17b656bf2',
  inletContract: 'wgsl-live-hand-round-inlet-uniform-v1',
  inletReleaseContract: 'gpu-dormant-pool-source-flux-release-v0',
  adapterContract: 'hand-state-distal-axis-full-extension-emitters-v1',
  economics: {
    requestedParticleCount: 2400,
    requestedActiveParticleBudget: 1440,
    sourceFluxParticlesPerSecond: 960,
    opticalDensityScale: 1.7,
    reconstructionRadiusScale: 2.5,
    lifetimeSeconds: 10,
    defaultSubstitution: false,
    fallbackActive: false,
  },
  juiceBudget: {
    lastMacroMapping: {
      effectiveBudget: 80,
      defaultSubstitution: false,
      fallbackActive: false,
      economics: {
        requestedParticleCount: 2400,
        requestedActiveParticleBudget: 1440,
        sourceFluxParticlesPerSecond: 960,
        opticalDensityScale: 1.7,
        reconstructionRadiusScale: 2.5,
        lifetimeSeconds: 10,
      },
    },
  },
  requestedParticleCount: 2400,
  effectiveParticleCount: 2400,
  requestedActiveParticleBudget: 1440,
  activeEmitterCount: 5,
  latestPacketActiveEmitterCount: 5,
  latestPacketSourceRoute: 'lerms_density_bench_fixture_not_live_hand',
  latestPacketAuthority: {
    simulation_safe: true,
    stale: false,
    reason: 'fixture_density_bench_not_live_hand',
  },
  runtimeEconomicsAuthority: {
    complete: true,
    authority: 'pinned_runtime_receipt',
    fallbackActive: false,
  },
  liveInlets: {
    requestedMode: 'live_hand_inlets',
    effectiveMode: 'live_hand_inlets',
    activeInletCount: 5,
    activated: true,
  },
  solver: {
    available: true,
    solver_backend: 'webgpu_compute',
    render_backend: 'webgpu_direct_render',
    requestedRenderer: 'webgpu-screen-space-liquid-refraction-v0',
    effectiveRenderer: 'webgpu-screen-space-liquid-refraction-v0',
    fallbackReason: null,
  },
};
assert.equal(
  evaluateExactFluidWorkloadMismatch({
    densityBenchAuthority: 'fixture_density_bench_not_live_hand',
    fluid: exactFluid,
  }),
  false,
  'the exact pinned Juice 80 workload passes',
);
for (const [label, fluid] of [
  ['half particles', { ...exactFluid, requestedParticleCount: 1200, effectiveParticleCount: 1200 }],
  ['reduced active budget', { ...exactFluid, requestedActiveParticleBudget: 720 }],
  ['reduced source flux', { ...exactFluid, economics: { ...exactFluid.economics, sourceFluxParticlesPerSecond: 480 } }],
  ['wrong emitter count', { ...exactFluid, activeEmitterCount: 4 }],
  ['fallback renderer', { ...exactFluid, solver: { ...exactFluid.solver, effectiveRenderer: 'fallback-renderer' } }],
  ['unverified economics', { ...exactFluid, runtimeEconomicsAuthority: { ...exactFluid.runtimeEconomicsAuthority, complete: false } }],
]) {
  assert.equal(
    evaluateExactFluidWorkloadMismatch({
      densityBenchAuthority: 'fixture_density_bench_not_live_hand',
      fluid,
    }),
    true,
    `${label} cannot pass as the exact Juice 80 workload`,
  );
}

const visibleHandFrames = Array.from({ length: 4 }, () => ({
  byteCount: 1280 * 720 * 3,
  dynamicRange: 120,
}));
const movingHandDeltas = Array.from({ length: 3 }, () => ({
  changedRatio: 0.004,
  meanAbsoluteChannelDelta: 1.4,
}));
assert.equal(
  evaluateHandVisualMismatch({
    requestedFrameCount: 4,
    handFrames: visibleHandFrames,
    handVisualDeltas: movingHandDeltas,
  }),
  false,
  'visible progressing hand-only pixels pass',
);
assert.equal(
  evaluateHandVisualMismatch({
    requestedFrameCount: 4,
    handFrames: visibleHandFrames.map(frame => ({ ...frame, dynamicRange: 0 })),
    handVisualDeltas: movingHandDeltas,
  }),
  true,
  'fluid and UI pixels cannot hide a blank hand layer',
);
assert.equal(
  evaluateHandVisualMismatch({
    requestedFrameCount: 4,
    handFrames: visibleHandFrames,
    handVisualDeltas: movingHandDeltas.map(delta => ({ ...delta, changedRatio: 0 })),
  }),
  true,
  'fluid and counters cannot hide a frozen hand layer',
);

assert.equal(mayPromotePrimaryOutput({ failedChecks: [] }), true, 'clean evidence may become primary output');
assert.equal(
  mayPromotePrimaryOutput({ failedChecks: [['captureCadenceShadowed', true]] }),
  false,
  'failed evidence cannot become primary output',
);

console.log('articulated dense replay contracts ok');
