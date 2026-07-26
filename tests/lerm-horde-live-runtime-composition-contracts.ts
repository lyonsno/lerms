import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { LermHordeProducerHistoryCompositionReceipt } from '../src/lerm-horde-producer-history-composition.js';
import {
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_SCHEMA,
  createLermHordePrimaryViewerActorFrame,
} from '../src/lerm-horde-primary-viewer-actor-frame.js';
import {
  HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA,
} from '../src/terrain/hill-of-hills.js';
import {
  LERM_HORDE_LIVE_RUNTIME_ROUTE,
  LERM_HORDE_LIVE_RUNTIME_SCHEMA,
  createLermHordeLiveRuntime,
  type LermHordeLiveRailSample,
} from '../src/lerm-horde-live-runtime-composition.js';

const receipt = JSON.parse(
  readFileSync(
    resolve('artifacts/lerm-horde-producer-history/receipt.json'),
    'utf8',
  ),
) as LermHordeProducerHistoryCompositionReceipt;

const runtime = createLermHordeLiveRuntime({
  producerReceipt: receipt,
  railSampler: createReceiptRailSampler(receipt),
  hillRevision: 'f6458e5bd74d9305c4149e6a2ee3844bf4613150',
});

const initial = runtime.state;
assert.equal(initial.schema, LERM_HORDE_LIVE_RUNTIME_SCHEMA);
assert.equal(initial.route, LERM_HORDE_LIVE_RUNTIME_ROUTE);
assert.equal(initial.phase, 'traversing');
assert.equal(initial.elapsedMs, 0);
assert.equal(initial.tickCount, 0);
assert.equal(initial.admittedIntervalCount, 0);
assert.equal(initial.terrainBuffer.schema, HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA);
assert.equal(initial.terrainBuffer.sampleCount, 2_880);
assert.equal(initial.body?.sourceDistance, 0);
assert.equal(initial.body?.progress, 0);
assert.equal(initial.body?.support.provenance.hillSourceId, initial.terrain.source.frameId);
const initialActorFrame = createLermHordePrimaryViewerActorFrame(initial);
assert.equal(
  initialActorFrame.schema,
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_SCHEMA,
);
assert.equal(
  initialActorFrame.route.requested,
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
);
assert.equal(
  initialActorFrame.route.effective,
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
);
assert.equal(initialActorFrame.route.fallbackStatus, 'none');
assert.equal(initialActorFrame.route.staleStatus, 'fresh');
assert.equal(initialActorFrame.identity.carrierId, '719024');
assert.equal(
  initialActorFrame.identity.speciesAuthority,
  'non-lerm-engineering-carrier',
);
assert.equal(initialActorFrame.lifecycle.visible, true);
assert.equal(initialActorFrame.lifecycle.phase, 'traversing');
assert.equal(initialActorFrame.pose?.motionPhase, 0);
assert.deepEqual(initialActorFrame.pose?.rootFrame.origin, {
  x: initial.body?.rootWorld[0],
  y: initial.body?.rootWorld[1],
  z: initial.body?.rootWorld[2],
});
assert.equal(
  initialActorFrame.terrain.frameId,
  initial.terrainBuffer.source.frameId,
);
assert.equal(
  initialActorFrame.terrain.sampleChecksum,
  initial.terrainBuffer.sampleChecksum,
);
assert.equal('camera' in initialActorFrame, false);
assert.equal('renderer' in initialActorFrame, false);
assert.equal('view' in initialActorFrame, false);

const first = runtime.advanceTo(40);
assert.equal(first.phase, 'traversing');
assert.ok(first.tickCount >= 1);
assert.equal(first.admittedIntervalCount, first.tickCount);
assert.ok(first.body);
assert.ok(first.body.sourceDistance > 0);
assert.ok(first.body.progress > 0);
assert.equal(
  first.body.support.renderedHillSourceId,
  first.terrain.source.frameId,
);
assert.equal(
  first.lastAdmission?.targetHill.frameId,
  initial.terrain.source.frameId,
);
assert.equal(
  first.lastAdmission?.targetHill.sampleChecksum,
  initial.terrain.witness.sampleChecksum,
);
assert.ok(first.terrain.witness.producerTrafficExposureSeconds > 0);
assert.equal(
  first.terrain.witness.producerTrafficAdmittedEpisodeCount,
  first.admittedIntervalCount,
);
assert.equal(first.terrain.witness.cacheGeneration, initial.terrain.witness.cacheGeneration + first.tickCount);

const middle = runtime.advanceTo(receipt.historySummary.lastTimestampMs * 0.52);
assert.equal(middle.phase, 'traversing');
assert.ok(middle.body);
assert.ok(middle.body.progress > first.body.progress);
assert.ok(middle.admittedIntervalCount > first.admittedIntervalCount);
assert.ok(
  middle.terrain.witness.producerTrafficExposureSeconds >
    first.terrain.witness.producerTrafficExposureSeconds,
);
assert.notEqual(
  middle.terrain.witness.producerTrafficFieldChecksum,
  first.terrain.witness.producerTrafficFieldChecksum,
);
assert.equal(
  new Set(middle.admittedEpisodeIds).size,
  middle.admittedEpisodeIds.length,
);
assert.equal(
  middle.admittedEpisodeIds.length,
  middle.admittedIntervalCount,
);
const middleActorFrame = createLermHordePrimaryViewerActorFrame(middle);
assert.equal(middleActorFrame.lifecycle.visible, true);
assert.equal(middleActorFrame.lifecycle.elapsedMs, middle.elapsedMs);
assert.equal(middleActorFrame.lifecycle.tickCount, middle.tickCount);
assert.equal(middleActorFrame.pose?.motionPhase, middle.body.progress);
assert.equal(
  middleActorFrame.pose?.support.renderedHillSourceId,
  middle.terrainBuffer.source.frameId,
);
assert.notDeepEqual(
  middleActorFrame.pose?.rootFrame.origin,
  initialActorFrame.pose?.rootFrame.origin,
);

const atEnd = runtime.advanceTo(receipt.historySummary.lastTimestampMs);
assert.equal(atEnd.phase, 'traversing');
assert.ok(atEnd.body);
assert.equal(atEnd.body.progress, 1);
assert.equal(
  atEnd.body.sourceDistance,
  receipt.historySummary.lastSourceDistance,
);
const trafficAtEnd = atEnd.terrain.witness.producerTrafficFieldChecksum;
const exposureAtEnd = atEnd.terrain.witness.producerTrafficExposureSeconds;
const admittedAtEnd = atEnd.admittedIntervalCount;

const departed = runtime.advanceTo(
  receipt.historySummary.lastTimestampMs + 900,
);
assert.equal(departed.phase, 'departed');
assert.equal(departed.body, null);
assert.equal(departed.admittedIntervalCount, admittedAtEnd);
assert.equal(
  departed.terrain.witness.producerTrafficFieldChecksum,
  trafficAtEnd,
);
assert.equal(
  departed.terrain.witness.producerTrafficExposureSeconds,
  exposureAtEnd,
);
assert.ok(departed.tickCount > atEnd.tickCount);
assert.notEqual(
  departed.terrain.witness.sampleChecksum,
  atEnd.terrain.witness.sampleChecksum,
  'the persistent Hill must continue evolving after the body departs',
);
const departedActorFrame =
  createLermHordePrimaryViewerActorFrame(departed);
assert.equal(departedActorFrame.lifecycle.visible, false);
assert.equal(departedActorFrame.lifecycle.phase, 'departed');
assert.equal(departedActorFrame.pose, null);
assert.equal(
  departedActorFrame.terrain.frameId,
  departed.terrainBuffer.source.frameId,
);
assert.equal(
  departed.terrain.witness.supportFrame.shockClassCounts.shock_reset ?? 0,
  0,
);

assert.equal(runtime.state, departed);
assert.throws(
  () => runtime.advanceTo(departed.elapsedMs - 1),
  /monotonic/i,
);

const runtimeReceipt = runtime.createReceipt();
assert.equal(runtimeReceipt.schema, LERM_HORDE_LIVE_RUNTIME_SCHEMA);
assert.equal(runtimeReceipt.route.requested, LERM_HORDE_LIVE_RUNTIME_ROUTE);
assert.equal(runtimeReceipt.route.effective, LERM_HORDE_LIVE_RUNTIME_ROUTE);
assert.equal(runtimeReceipt.route.fallbackStatus, 'none');
assert.equal(runtimeReceipt.route.staleStatus, 'fresh');
assert.equal(runtimeReceipt.clock.mode, 'incremental_elapsed_time');
assert.equal(runtimeReceipt.clock.precomputedFrameCount, 0);
assert.equal(runtimeReceipt.clock.prefixRebuildCount, 0);
assert.equal(runtimeReceipt.clock.replayConstructorCalls, 0);
assert.equal(runtimeReceipt.clock.tickCount, departed.tickCount);
assert.equal(runtimeReceipt.admission.intervalCount, admittedAtEnd);
assert.equal(runtimeReceipt.admission.uniqueEpisodeCount, admittedAtEnd);
assert.equal(runtimeReceipt.admission.trafficRetainedAfterDeparture, true);
assert.equal(runtimeReceipt.claimBoundary.liveCurrentHillTruth, true);
assert.equal(runtimeReceipt.claimBoundary.liveRootExposureTruth, true);
assert.equal(runtimeReceipt.claimBoundary.liveContactTruth, false);

assert.throws(
  () =>
    createLermHordePrimaryViewerActorFrame({
      ...middle,
      route: 'lerms/fallback/replay',
    } as never),
  /runtime route/i,
);
assert.throws(
  () =>
    createLermHordePrimaryViewerActorFrame({
      ...middle,
      body: {
        ...middle.body!,
        support: {
          ...middle.body!.support,
          renderedHillSourceId: 'stale-hill-frame',
        },
      },
    } as never),
  /rendered Hill/i,
);
assert.throws(
  () =>
    createLermHordePrimaryViewerActorFrame({
      ...middle,
      body: null,
    }),
  /traversing state requires a visible actor/i,
);

const reviewedVendorRailSampler =
  await createReviewedVendorRailSampler(receipt);
const canonicalRuntime = createLermHordeLiveRuntime({
  producerReceipt: receipt,
  railSampler: reviewedVendorRailSampler,
  hillRevision: 'f6458e5bd74d9305c4149e6a2ee3844bf4613150',
});
for (
  let elapsedMs = 200;
  elapsedMs <= 3_200;
  elapsedMs += 200
) {
  canonicalRuntime.advanceTo(elapsedMs);
}
canonicalRuntime.advanceTo(receipt.historySummary.lastTimestampMs + 900);
const canonicalReceipt = canonicalRuntime.createReceipt();
assert.equal(canonicalReceipt.clock.tickCount, 18);
assert.equal(canonicalReceipt.admission.intervalCount, 13);
assert.equal(canonicalReceipt.admission.uniqueEpisodeCount, 13);
assert.equal(
  canonicalReceipt.admission.exposureSeconds,
  1.93321673232201,
);
assert.equal(canonicalReceipt.admission.trafficChecksum, '057c750d');
assert.equal(canonicalReceipt.terrain.sampleChecksum, '840883ac');
assert.equal(canonicalReceipt.terrain.topologyChecksum, '9616b1f6');
assert.equal(
  canonicalReceipt.terrain.supportFrameChecksum,
  'ab24b35a',
);

const burstRuntime = createLermHordeLiveRuntime({
  producerReceipt: receipt,
  railSampler: reviewedVendorRailSampler,
  hillRevision: 'f6458e5bd74d9305c4149e6a2ee3844bf4613150',
});
for (const elapsedMs of [400, 1_600, 2_400, 2_800, 3_336]) {
  burstRuntime.advanceTo(elapsedMs);
}
const burstReceipt = burstRuntime.createReceipt();
assert.deepEqual(
  {
    clock: burstReceipt.clock,
    admission: burstReceipt.admission,
    terrain: burstReceipt.terrain,
  },
  {
    clock: canonicalReceipt.clock,
    admission: canonicalReceipt.admission,
    terrain: canonicalReceipt.terrain,
  },
  'caller batching must not author final live-runtime identity',
);

console.log('lerm Horde live runtime composition contracts passed');

function createReceiptRailSampler(
  source: LermHordeProducerHistoryCompositionReceipt,
): (sourceDistance: number) => LermHordeLiveRailSample {
  return (sourceDistance) => {
    const samples = source.history.samples;
    const upperIndex = Math.max(
      1,
      samples.findIndex(
        (sample) => sample.root.sourceDistance >= sourceDistance,
      ),
    );
    const upper = samples[Math.min(samples.length - 1, upperIndex)];
    const lower = samples[Math.max(0, upperIndex - 1)];
    const span =
      upper.root.sourceDistance - lower.root.sourceDistance;
    const amount =
      span <= 0
        ? 0
        : (sourceDistance - lower.root.sourceDistance) / span;
    return {
      schema: 'kaminos.creature-scale-locomotion-rail-sample.v0',
      railId: source.producer.railId,
      sourceDistance,
      progress:
        lower.root.routeProgress +
        (upper.root.routeProgress - lower.root.routeProgress) * amount,
      position: mixVec3(
        lower.root.worldPosition,
        upper.root.worldPosition,
        amount,
      ),
      tangent: normalize(
        mixVec3(lower.root.tangent, upper.root.tangent, amount),
      ),
      locomotionFrame: {
        forward: normalize(
          mixVec3(
            lower.root.locomotionFrame.forward,
            upper.root.locomotionFrame.forward,
            amount,
          ),
        ),
        right: normalize(
          mixVec3(
            lower.root.locomotionFrame.right,
            upper.root.locomotionFrame.right,
            amount,
          ),
        ),
        up: normalize(
          mixVec3(
            lower.root.locomotionFrame.up,
            upper.root.locomotionFrame.up,
            amount,
          ),
        ),
      },
      attention: {
        direction: normalize(
          mixVec3(
            lower.root.attention.direction,
            upper.root.attention.direction,
            amount,
          ),
        ),
        authority: lower.root.attention.authority,
      },
      support: {
        schema: 'kaminos.axial-terrain-support-envelope.v0',
        plannerDisposition:
          lower.root.support.disposition === 'local-support' &&
          upper.root.support.disposition === 'local-support'
            ? 'local-support'
            : 'reroute-required',
        rootLift:
          lower.root.support.rootLift +
          (upper.root.support.rootLift - lower.root.support.rootLift) *
            amount,
        compliance: {
          minimumNormalizedMargin:
            lower.root.support.minimumComplianceMargin +
            (upper.root.support.minimumComplianceMargin -
              lower.root.support.minimumComplianceMargin) *
              amount,
        },
      },
    };
  };
}

async function createReviewedVendorRailSampler(
  source: LermHordeProducerHistoryCompositionReceipt,
): Promise<(sourceDistance: number) => LermHordeLiveRailSample> {
  const modulePath = resolve(
    'public/vendor/kaminos-ced6db3d/motion-ready-719024-core.js',
  );
  const railCore = (await import(pathToFileURL(modulePath).href)) as {
    sampleCreatureScaleLocomotionRail(
      rail: unknown,
      sourceDistance: number,
    ): LermHordeLiveRailSample;
  };
  const samples = source.history.samples.map(({ root }) => ({
    sourceDistance: root.sourceDistance,
    position: root.worldPosition,
    tangent: root.tangent,
    curvature: 0,
    support: {
      schema: root.support.schema,
      clearance: 0,
      scale: 1,
      corridorRadius: 0,
      supportSampleSpacing: 1,
      terrainCellWidth: 1,
      rootLift: root.support.rootLift,
      profile: [],
      samples: [],
      compliance: {
        exceeded: root.support.disposition === 'reroute-required',
        outOfBounds: false,
        maxEnvelopeLift: root.support.rootLift,
        rootLiftAboveClearance: root.support.rootLift,
        maxSuspensionLift: 0,
        measuredPitchRadians: 0,
        measuredBendRadians: 0,
        maxPitchRadians: Math.PI,
        maxBendRadiansPerStation: Math.PI,
        margins: {
          reviewed: root.support.minimumComplianceMargin,
        },
        minimumNormalizedMargin:
          root.support.minimumComplianceMargin,
      },
      plannerDisposition: root.support.disposition,
    },
  }));
  const rail = {
    schema: 'kaminos.creature-scale-locomotion-rail.v0',
    id: source.producer.railId,
    length: samples.at(-1)?.sourceDistance ?? 0,
    samples,
  };
  return (sourceDistance) =>
    railCore.sampleCreatureScaleLocomotionRail(rail, sourceDistance);
}

function mixVec3(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
  amount: number,
): [number, number, number] {
  return [
    left[0] + (right[0] - left[0]) * amount,
    left[1] + (right[1] - left[1]) * amount,
    left[2] + (right[2] - left[2]) * amount,
  ];
}

function normalize(
  value: readonly [number, number, number],
): [number, number, number] {
  const length = Math.hypot(...value);
  return [
    value[0] / length,
    value[1] / length,
    value[2] / length,
  ];
}
