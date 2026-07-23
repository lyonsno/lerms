import assert from "node:assert/strict";

import {
  HILL_PHASE_FILMSTRIP_FRAME_COUNTS,
  compareHillPhaseContinuityFrames,
  createHillPhaseContinuityReport,
  createHillPhaseFilmstripSchedule,
  fitHillPhaseFilmstripLayout,
  fitHillPhaseFilmstripViewport,
  formatHillPhaseContinuityDelta,
  normalizeHillPhaseFilmstripFrameCount,
} from "../src/terrain/hill-of-hills-phase-filmstrip.js";
import {
  createHillOfHillsTerrain,
  defaultHillOfHillsParams,
  HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS,
  type HillOfHillsTerrainParams,
} from "../src/terrain/hill-of-hills.js";

function reportRequestFor(
  requestedParams: HillOfHillsTerrainParams,
  terrains: readonly ReturnType<typeof createHillOfHillsTerrain>[],
) {
  return {
    requestedParams,
    requestedSource: {
      route: terrains[0].source.route,
    },
  };
}

const allowedCounts = [...HILL_PHASE_FILMSTRIP_FRAME_COUNTS];

assert.deepEqual(allowedCounts, [5, 10, 15, 25, 50]);
assert.equal(normalizeHillPhaseFilmstripFrameCount("15"), 15);
assert.equal(normalizeHillPhaseFilmstripFrameCount(49), 50);
assert.equal(normalizeHillPhaseFilmstripFrameCount("nonsense", 25), 25);

const params = {
  ...defaultHillOfHillsParams,
  topologyPhaseDurationMs: 4_000,
  topologyPhaseTimeMs: 3_700,
};
const schedule = createHillPhaseFilmstripSchedule(params, 10);

assert.equal(schedule.length, 10);
assert.ok(schedule[0].phaseTimeMs > params.topologyPhaseTimeMs);
assert.ok(
  schedule.some((frame) => frame.reason === "epoch-boundary"),
  "schedule should preserve phase-boundary evidence instead of sampling fixed seconds",
);
for (let index = 1; index < schedule.length; index += 1) {
  assert.ok(
    schedule[index].phaseTimeMs > schedule[index - 1].phaseTimeMs,
    "filmstrip salient points must be strictly ordered",
  );
}
assert.ok(
  schedule.some((frame) => frame.reason === "peak"),
  "schedule should include a crest/peak sample for phase debugging",
);

for (const count of allowedCounts) {
  const layout = fitHillPhaseFilmstripLayout(count);
  assert.equal(layout.frameCount, count);
  assert.ok(layout.columns * layout.rows >= count);
  assert.ok(layout.width <= 1_600);
  assert.ok(layout.height <= 1_100);
  assert.ok(layout.cellWidth >= 120);
  assert.ok(layout.cellHeight >= 90);
}

const denseLayout = fitHillPhaseFilmstripLayout(50);
assert.equal(denseLayout.columns, 10);
assert.equal(denseLayout.rows, 5);

const wideCellFit = fitHillPhaseFilmstripViewport(1600, 1200, 320, 180);
assert.deepEqual(wideCellFit, {
  x: 40,
  y: 0,
  width: 240,
  height: 180,
  scale: 0.15,
});

const tallCellFit = fitHillPhaseFilmstripViewport(1200, 600, 300, 220);
assert.deepEqual(tallCellFit, {
  x: 0,
  y: 35,
  width: 300,
  height: 150,
  scale: 0.25,
});

const continuityParams = {
  ...defaultHillOfHillsParams,
  gridResolutionX: 24,
  gridResolutionZ: 28,
  ditchPhaseIntensity: 0,
  ditchPhaseLimit: 0,
  trailPhaseIntensity: 0,
  trailPhaseLimit: 0,
  topologyPhaseIntensity: 1,
  topologyPhaseLimit: 4,
  topologyPhaseDurationMs: 2_000,
  topologyPhaseTimeMs: 1_960,
};
const continuitySchedule = createHillPhaseFilmstripSchedule(continuityParams, 5);
const beforeFrame = continuitySchedule[0];
const afterFrame = continuitySchedule[1];
const beforeTerrain = createHillOfHillsTerrain({
  ...continuityParams,
  topologyPhaseTimeMs: beforeFrame.phaseTimeMs,
});
const afterTerrain = createHillOfHillsTerrain({
  ...continuityParams,
  topologyPhaseTimeMs: afterFrame.phaseTimeMs,
});
const continuityDelta = compareHillPhaseContinuityFrames(beforeFrame, beforeTerrain, afterFrame, afterTerrain);

assert.equal(continuityDelta.from.index, beforeFrame.index);
assert.equal(continuityDelta.to.index, afterFrame.index);
assert.equal(continuityDelta.matchedSampleCount, beforeTerrain.samples.length);
assert.ok(Number.isFinite(continuityDelta.height.maxAbs));
assert.ok(Number.isFinite(continuityDelta.height.rms));
assert.ok(Number.isFinite(continuityDelta.supportHeight.maxAbs));
assert.ok(Number.isFinite(continuityDelta.topologyAmount.maxAbs));
assert.ok(continuityDelta.lifecycle.enteringCount > 0, "continuity witness should see support entering across epoch boundary");
assert.ok(continuityDelta.lifecycle.tailingCount > 0, "continuity witness should preserve old support tails across epoch boundary");
assert.equal(continuityDelta.lifecycle.hotEntrantCount, 0, "new supports must not enter already hot");
assert.match(formatHillPhaseContinuityDelta(continuityDelta), /dh .* mat .* enter .* tail /);

const beforeEventIds = new Set(beforeTerrain.witness.topologyEventDebug.map((event) => event.id));
const firstEnteringEvent = afterTerrain.witness.topologyEventDebug.find(
  (event) => event.supportLifecycle === "entering" && !beforeEventIds.has(event.id),
);
assert.ok(firstEnteringEvent, "fixture must include an entering topology event for false-closure coverage");
const hotEntrantTerrain = {
  ...afterTerrain,
  witness: {
    ...afterTerrain.witness,
    topologyEventDebug: afterTerrain.witness.topologyEventDebug.map((event) =>
      event.id === firstEnteringEvent.id
        ? {
            ...event,
            supportAmount: 1,
            envelope: {
              ...event.envelope,
              amount: 1,
              phaseIn: 1,
            },
          }
        : event,
    ),
  },
};
const hotEntrantDelta = compareHillPhaseContinuityFrames(beforeFrame, beforeTerrain, afterFrame, hotEntrantTerrain);

assert.equal(hotEntrantDelta.lifecycle.hotEntrantCount, 1);
assert.ok(
  hotEntrantDelta.suspicions.some((suspicion) => suspicion.kind === "hot-entering-support"),
  "continuity witness should refuse to make hot support entry look smooth",
);

const inertSupportExitSource = afterTerrain.witness.topologyEventDebug.length > 0 ? afterTerrain : beforeTerrain;
assert.ok(inertSupportExitSource.witness.topologyEventDebug.length > 0, "fixture must include support identities");
const inertSupportExitTerrain = {
  ...inertSupportExitSource,
  witness: {
    ...inertSupportExitSource.witness,
    topologyEventDebug: [],
  },
};
const inertSupportExitDelta = compareHillPhaseContinuityFrames(afterFrame, inertSupportExitSource, afterFrame, inertSupportExitTerrain);

assert.ok(inertSupportExitDelta.lifecycle.exitedCount > 0);
assert.equal(inertSupportExitDelta.height.maxAbs, 0);
assert.equal(inertSupportExitDelta.supportHeight.maxAbs, 0);
assert.ok(
  !inertSupportExitDelta.suspicions.some((suspicion) => suspicion.kind === "support-exit"),
  "support identity cleanup with no visible terrain delta should not masquerade as a pop",
);

const tinyEnvelopeActiveExitEvent = inertSupportExitSource.witness.topologyEventDebug[0];
assert.ok(tinyEnvelopeActiveExitEvent, "fixture must include an event for tiny-envelope exit coverage");
const tinyEnvelopeActiveExitSource = {
  ...inertSupportExitSource,
  witness: {
    ...inertSupportExitSource.witness,
    topologyEventDebug: inertSupportExitSource.witness.topologyEventDebug.map((event) =>
      event.id === tinyEnvelopeActiveExitEvent.id
        ? {
            ...event,
            supportLifecycle: "active" as const,
            supportAmount: 1,
            envelope: {
              ...event.envelope,
              amount: 0.0001,
              phaseIn: 1,
              phaseOut: 0,
            },
          }
        : event,
    ),
  },
};
const tinyEnvelopeActiveExitTerrain = {
  ...tinyEnvelopeActiveExitSource,
  witness: {
    ...tinyEnvelopeActiveExitSource.witness,
    topologyEventDebug: tinyEnvelopeActiveExitSource.witness.topologyEventDebug.filter(
      (event) => event.id !== tinyEnvelopeActiveExitEvent.id,
    ),
  },
};
const tinyEnvelopeActiveExitDelta = compareHillPhaseContinuityFrames(
  afterFrame,
  tinyEnvelopeActiveExitSource,
  afterFrame,
  tinyEnvelopeActiveExitTerrain,
);

assert.equal(tinyEnvelopeActiveExitDelta.lifecycle.exitedCount, 1);
assert.equal(tinyEnvelopeActiveExitDelta.lifecycle.maxExitedSupportAmount, 1);
assert.equal(
  tinyEnvelopeActiveExitDelta.lifecycle.hotExitedCount,
  0,
  "support-window occupancy with near-zero envelope amplitude is not a visible hot exit",
);

const broadHeightStepTerrain = {
  ...beforeTerrain,
  samples: beforeTerrain.samples.map((sample) => ({
    ...sample,
    height: sample.height + 0.5,
  })),
};
const broadHeightStepDelta = compareHillPhaseContinuityFrames(beforeFrame, beforeTerrain, afterFrame, broadHeightStepTerrain);

assert.ok(
  broadHeightStepDelta.suspicions.some((suspicion) => suspicion.kind === "broad-height-step"),
  "continuity witness should distinguish a whole-field height step from a local spike",
);
assert.ok(
  !broadHeightStepDelta.suspicions.some((suspicion) => suspicion.kind === "local-height-spike"),
  "whole-field height steps should not be labeled as local vertex spikes",
);

const localHeightSpikeTerrain = {
  ...beforeTerrain,
  samples: beforeTerrain.samples.map((sample, index) => ({
    ...sample,
    height: sample.height + (index === 0 ? 2 : 0),
  })),
};
const localHeightSpikeDelta = compareHillPhaseContinuityFrames(beforeFrame, beforeTerrain, afterFrame, localHeightSpikeTerrain);

assert.ok(
  localHeightSpikeDelta.suspicions.some((suspicion) => suspicion.kind === "local-height-spike"),
  "continuity witness should call out a localized vertex-scale height spike",
);
assert.ok(
  !localHeightSpikeDelta.suspicions.some((suspicion) => suspicion.kind === "broad-height-step"),
  "localized height spikes should not be labeled as whole-field steps",
);

const reportSource: { route: string; configId: string } = {
  route: "hill-of-hills/phase-filmstrip-contract",
  configId: "phase-filmstrip-contract-v1",
};
const reportTerrains = continuitySchedule.map((frame) =>
  createHillOfHillsTerrain(
    {
      ...continuityParams,
      topologyPhaseTimeMs: frame.phaseTimeMs,
    },
    {
      ...reportSource,
      frameId: `phase-filmstrip-contract-${frame.index}`,
      timestampMs: frame.phaseTimeMs,
    },
  ),
);
const reportRequest = {
  requestedParams: continuityParams,
  requireExactControls: true,
  requestedSource: reportSource,
};
const createAuthenticatedContinuityReport = createHillPhaseContinuityReport as unknown as (
  frames: typeof continuitySchedule,
  terrains: typeof reportTerrains,
  request: typeof reportRequest,
) => Omit<ReturnType<typeof createHillPhaseContinuityReport>, "frames"> & {
  schema: "lerms.hill-phase-continuity-report.v1";
  requestedControls: Pick<HillOfHillsTerrainParams, "topologyPhaseIntensity">;
  effectiveControls: Pick<HillOfHillsTerrainParams, "topologyPhaseLimit">;
  sourceIdentity: {
    requestedRoute: string;
    effectiveRoute: string;
    effectiveConfigId: string;
  };
  frames: readonly (ReturnType<typeof createHillPhaseContinuityReport>["frames"][number] & {
    dynamics: {
      deformation: { max: number };
      velocity: { max: number };
      force: { max: number };
      grossForce: { max: number };
      opposedForce: { max: number };
      contention: { max: number };
      hillSwellMembership: { max: number };
      hillSlumpMembership: { max: number };
    };
  })[];
};

assert.throws(
  () => createAuthenticatedContinuityReport(continuitySchedule.slice(0, -1), reportTerrains, reportRequest),
  /frame.*terrain|terrain.*frame/i,
  "continuity reports must reject partial frame evidence instead of silently truncating it",
);
assert.throws(
  () =>
    createAuthenticatedContinuityReport(continuitySchedule, reportTerrains, {
      ...reportRequest,
      requestedSource: { ...reportSource, route: "hill-of-hills/wrong-route" },
    }),
  /route/i,
  "continuity reports must reject an effective route that differs from the requested route",
);

const continuityReport = createAuthenticatedContinuityReport(continuitySchedule, reportTerrains, reportRequest);

assert.equal(continuityReport.schema, "lerms.hill-phase-continuity-report.v1");
assert.equal(continuityReport.requestedControls.topologyPhaseIntensity, continuityParams.topologyPhaseIntensity);
assert.equal(continuityReport.effectiveControls.topologyPhaseLimit, continuityParams.topologyPhaseLimit);
assert.equal(continuityReport.sourceIdentity.requestedRoute, reportSource.route);
assert.equal(continuityReport.sourceIdentity.effectiveRoute, reportSource.route);
assert.equal(continuityReport.sourceIdentity.effectiveConfigId, reportSource.configId);
assert.equal(continuityReport.frames.length, continuitySchedule.length);
assert.equal(continuityReport.frames[0].delta, undefined);
assert.ok(continuityReport.frames.every((frame) => Number.isFinite(frame.dynamics.deformation.max)));
assert.ok(continuityReport.frames.every((frame) => Number.isFinite(frame.dynamics.velocity.max)));
assert.ok(continuityReport.frames.every((frame) => Number.isFinite(frame.dynamics.force.max)));
assert.ok(continuityReport.frames.every((frame) => Number.isFinite(frame.dynamics.grossForce.max)));
assert.ok(continuityReport.frames.every((frame) => Number.isFinite(frame.dynamics.opposedForce.max)));
assert.ok(continuityReport.frames.every((frame) => Number.isFinite(frame.dynamics.contention.max)));
assert.ok(continuityReport.frames.every((frame) => Number.isFinite(frame.dynamics.hillSwellMembership.max)));
assert.ok(continuityReport.frames.every((frame) => Number.isFinite(frame.dynamics.hillSlumpMembership.max)));
assert.equal(continuityReport.frames[1].delta?.from.index, continuitySchedule[0].index);
assert.ok(continuityReport.rankedTransitions.length > 0, "report should rank frame-to-frame transitions for machine diagnosis");
assert.ok(
  continuityReport.rankedTransitions.every((delta, index, deltas) => index === 0 || deltas[index - 1].severity >= delta.severity),
  "ranked transitions should sort strongest continuity violations first",
);
assert.equal(
  continuityReport.suspicionCounts["hot-entering-support"] ?? 0,
  continuityReport.rankedTransitions.filter((delta) =>
    delta.suspicions.some((suspicion) => suspicion.kind === "hot-entering-support"),
  ).length,
);
assert.match(JSON.stringify(continuityReport), /"rankedTransitions"/);

const zeroTailCleanupEventClasses = Object.fromEntries(
  HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS.map((kind) => [
    kind,
    {
      ...defaultHillOfHillsParams.topologyEventClasses[kind],
      enabled: kind === "hill_swell",
      appetite: kind === "hill_swell" ? 1.3 : 0,
      force: kind === "hill_swell" ? 1.2 : 0,
      gesture: "tide",
      phaseOffset: kind === "hill_swell" ? 0.9 : 0,
      spread: 1,
    },
  ]),
) as HillOfHillsTerrainParams["topologyEventClasses"];
const zeroTailCleanupParams = {
  ...defaultHillOfHillsParams,
  seed: 9876,
  gridResolutionX: 42,
  gridResolutionZ: 58,
  hillCount: 4,
  valleyCount: 4,
  ditchPhaseIntensity: 0,
  trailPhaseIntensity: 0,
  topologyPhaseSeed: 7331,
  topologyPhaseIntensity: 0.82,
  topologyPhaseLimit: 3,
  topologyPhaseRadius: 1.55,
  topologyPhaseDurationMs: 1_800,
  topologyPhaseOverlap: 0.32,
  topologyPhaseHillBias: 2,
  topologyPhaseValleyBias: 0,
  topologyPhaseBasinBias: 0,
  topologyPhaseRidgeBias: 0,
  topologyPhaseSaddleBias: 0,
  topologyEventClasses: zeroTailCleanupEventClasses,
} satisfies HillOfHillsTerrainParams;
const zeroTailCleanupSchedule = createHillPhaseFilmstripSchedule(zeroTailCleanupParams, 50);
const zeroTailCleanupTerrains = zeroTailCleanupSchedule.map((frame) =>
  createHillOfHillsTerrain({
    ...zeroTailCleanupParams,
    topologyPhaseTimeMs: frame.phaseTimeMs,
  }),
);
const zeroTailCleanupReport = createHillPhaseContinuityReport(
  zeroTailCleanupSchedule,
  zeroTailCleanupTerrains,
  reportRequestFor(zeroTailCleanupParams, zeroTailCleanupTerrains),
);
const zeroTailCleanupDelta = zeroTailCleanupReport.frames.find((frame) => frame.frame.index === 24)?.delta;

assert.ok(zeroTailCleanupDelta, "fixture should include the zero-tail cleanup transition");
assert.equal(zeroTailCleanupDelta.lifecycle.exitedCount, 2, "fixture should remove two faded tail supports");
assert.equal(zeroTailCleanupDelta.lifecycle.hotExitedCount, 0, "faded support cleanup should stay cold");
assert.ok(
  !zeroTailCleanupDelta.suspicions.some((suspicion) => suspicion.kind === "support-exit"),
  "zero-amplitude tail cleanup should not masquerade as a topology pop",
);

const releaseToTailParams = {
  ...defaultHillOfHillsParams,
  gridResolutionX: 24,
  gridResolutionZ: 28,
  topologyPhaseIntensity: 0.85,
  topologyPhaseLimit: 8,
  topologyPhaseDurationMs: 1_800,
  ditchPhaseIntensity: 0,
  trailPhaseIntensity: 0,
} satisfies HillOfHillsTerrainParams;
const releaseToTailSchedule = createHillPhaseFilmstripSchedule(releaseToTailParams, 50);
const releaseToTailTerrains = releaseToTailSchedule.map((frame) =>
  createHillOfHillsTerrain({
    ...releaseToTailParams,
    topologyPhaseTimeMs: frame.phaseTimeMs,
  }),
);
const releaseToTailReport = createHillPhaseContinuityReport(
  releaseToTailSchedule,
  releaseToTailTerrains,
  reportRequestFor(releaseToTailParams, releaseToTailTerrains),
);
const releaseToTailDelta = releaseToTailReport.frames.find(
  ({ frame, delta }) => frame.reason === "tail" && delta?.from.reason === "release",
)?.delta;

assert.ok(releaseToTailDelta, "fixture should include a release-to-tail filmstrip interval");
assert.equal(
  releaseToTailDelta.lifecycle.hotExitedCount,
  0,
  "support identities must stay present through release/tail until their visible envelope is cold",
);
assert.ok(
  releaseToTailDelta.to.phaseTimeMs - releaseToTailDelta.from.phaseTimeMs > 250,
  "fixture should be a coarse filmstrip interval, not an adjacent-frame continuity probe",
);
assert.ok(
  !releaseToTailDelta.suspicions.some((suspicion) => suspicion.kind === "support-exit"),
  "coarse release-to-tail motion should not be labeled as an instantaneous support-exit pop",
);
assert.ok(
  !releaseToTailDelta.suspicions.some((suspicion) => suspicion.kind === "topology-pop"),
  "coarse release-to-tail topology motion should not be labeled as an instantaneous topology pop",
);

const noLateGestureReactivationEventClasses = Object.fromEntries(
  HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS.map((kind) => [
    kind,
    {
      ...defaultHillOfHillsParams.topologyEventClasses[kind],
      enabled: kind === "valley_deepen",
      appetite: kind === "valley_deepen" ? 2 : 0,
      force: kind === "valley_deepen" ? 2 : 0,
      gesture: "surge",
      phaseOffset: kind === "valley_deepen" ? 0.12 : 0,
      spread: 1.2,
    },
  ]),
) as HillOfHillsTerrainParams["topologyEventClasses"];
const noLateGestureReactivationParams = {
  ...defaultHillOfHillsParams,
  seed: 8675309,
  gridResolutionX: 24,
  gridResolutionZ: 28,
  hillCount: 4,
  valleyCount: 6,
  ditchPhaseIntensity: 0,
  ditchPhaseLimit: 0,
  trailPhaseIntensity: 0,
  trailPhaseLimit: 0,
  topologyPhaseSeed: 2468,
  topologyPhaseIntensity: 1,
  topologyPhaseLimit: 6,
  topologyPhaseRadius: 2.1,
  topologyPhaseHeightScale: 1.4,
  topologyPhaseDurationMs: 1_000,
  topologyPhaseOverlap: 0.32,
  topologyPhaseHillBias: 0,
  topologyPhaseValleyBias: 2,
  topologyPhaseRidgeBias: 0,
  topologyPhaseSaddleBias: 0,
  topologyPhaseBasinBias: 0,
  topologyEventClasses: noLateGestureReactivationEventClasses,
} satisfies HillOfHillsTerrainParams;
const noLateGestureReactivationFromFrame = {
  index: 1,
  reason: "tail" as const,
  clock: 0.84,
  epoch: 4,
  phaseTimeMs: 4.84 * noLateGestureReactivationParams.topologyPhaseDurationMs,
};
const noLateGestureReactivationToFrame = {
  index: 2,
  reason: "epoch-boundary" as const,
  clock: 0.98,
  epoch: 4,
  phaseTimeMs: 4.98 * noLateGestureReactivationParams.topologyPhaseDurationMs,
};
const noLateGestureReactivationDelta = compareHillPhaseContinuityFrames(
  noLateGestureReactivationFromFrame,
  createHillOfHillsTerrain({
    ...noLateGestureReactivationParams,
    topologyPhaseTimeMs: noLateGestureReactivationFromFrame.phaseTimeMs,
  }),
  noLateGestureReactivationToFrame,
  createHillOfHillsTerrain({
    ...noLateGestureReactivationParams,
    topologyPhaseTimeMs: noLateGestureReactivationToFrame.phaseTimeMs,
  }),
);

assert.ok(
  noLateGestureReactivationDelta.lifecycle.persistedCount > 0,
  "fixture should keep the same topology supports alive through the late support window",
);
assert.ok(
  noLateGestureReactivationDelta.topologyAmount.maxAbs < 0.2,
  `persistent supports must not wrap their gesture offset back into attack near the epoch edge: ${formatHillPhaseContinuityDelta(
    noLateGestureReactivationDelta,
  )}`,
);
assert.ok(
  !noLateGestureReactivationDelta.suspicions.some((suspicion) => suspicion.kind === "topology-pop"),
  "late-window gesture reactivation should not masquerade as natural topology motion",
);

const mixedLifecycleContinuityParams = {
  ...defaultHillOfHillsParams,
  gridResolutionX: 28,
  gridResolutionZ: 32,
  hillCount: 5,
  valleyCount: 5,
  ditchPhaseIntensity: 0,
  ditchPhaseLimit: 0,
  trailPhaseIntensity: 0,
  trailPhaseLimit: 0,
  topologyPhaseIntensity: 1,
  topologyPhaseLimit: 12,
  topologyPhaseDurationMs: 1_800,
  topologyPhaseTimeMs: 0,
  topologyPhaseOverlap: 0.32,
} satisfies HillOfHillsTerrainParams;
const mixedLifecycleContinuitySchedule = createHillPhaseFilmstripSchedule(mixedLifecycleContinuityParams, 25);
const mixedLifecycleContinuityTerrains = mixedLifecycleContinuitySchedule.map((frame) =>
  createHillOfHillsTerrain({
    ...mixedLifecycleContinuityParams,
    topologyPhaseTimeMs: frame.phaseTimeMs,
  }),
);
const mixedLifecycleContinuityReport = createHillPhaseContinuityReport(
  mixedLifecycleContinuitySchedule,
  mixedLifecycleContinuityTerrains,
  reportRequestFor(mixedLifecycleContinuityParams, mixedLifecycleContinuityTerrains),
);
const hotLifecycleTransitions = mixedLifecycleContinuityReport.rankedTransitions.filter(
  (delta) => delta.lifecycle.hotEntrantCount > 0 || delta.lifecycle.hotExitedCount > 0,
);

assert.deepEqual(
  hotLifecycleTransitions.map((delta) => formatHillPhaseContinuityDelta(delta)),
  [],
  "mixed topology motion must admit supports cold and tail them until cold",
);

const hotAppliedTopologyEventClasses = Object.fromEntries(
  HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS.map((kind) => [
    kind,
    {
      ...defaultHillOfHillsParams.topologyEventClasses[kind],
      enabled: ["hill_slump", "valley_deepen", "ridge_lift", "saddle_pinch"].includes(kind),
      appetite: ["hill_slump", "valley_deepen", "ridge_lift", "saddle_pinch"].includes(kind) ? 2 : 0,
      force: ["hill_slump", "valley_deepen", "ridge_lift", "saddle_pinch"].includes(kind) ? 2 : 0,
      gesture: kind === "saddle_pinch" ? "pulse" : "surge",
      phaseOffset: 0,
      spread: 1.7,
    },
  ]),
) as HillOfHillsTerrainParams["topologyEventClasses"];
const hotAppliedTopologyContinuityParams = {
  ...defaultHillOfHillsParams,
  seed: 118,
  gridResolutionX: 28,
  gridResolutionZ: 32,
  hillCount: 5,
  valleyCount: 5,
  hillHeight: 2.2,
  valleyHeight: 2.2,
  ditchPhaseIntensity: 0,
  ditchPhaseLimit: 0,
  trailPhaseIntensity: 0,
  trailPhaseLimit: 0,
  topologyPhaseSeed: 9017,
  topologyPhaseIntensity: 1,
  topologyPhaseLimit: 10,
  topologyPhaseRadius: 1.9,
  topologyPhaseHeightScale: 1.5,
  topologyPhaseDurationMs: 1_920,
  topologyPhaseTimeMs: 0,
  topologyPhaseOverlap: 0.32,
  topologyPhaseHillBias: 2,
  topologyPhaseValleyBias: 2,
  topologyPhaseRidgeBias: 2,
  topologyPhaseSaddleBias: 1.4,
  topologyPhaseBasinBias: 0,
  topologyEventClasses: hotAppliedTopologyEventClasses,
} satisfies HillOfHillsTerrainParams;
const hotAppliedTopologySchedule = createHillPhaseFilmstripSchedule(hotAppliedTopologyContinuityParams, 10);
const hotAppliedTopologyTerrains = hotAppliedTopologySchedule.map((frame) =>
  createHillOfHillsTerrain({
    ...hotAppliedTopologyContinuityParams,
    topologyPhaseTimeMs: frame.phaseTimeMs,
  }),
);
const hotAppliedTopologyReport = createHillPhaseContinuityReport(
  hotAppliedTopologySchedule,
  hotAppliedTopologyTerrains,
  reportRequestFor(hotAppliedTopologyContinuityParams, hotAppliedTopologyTerrains),
);
const hotAppliedTopologyJumps = hotAppliedTopologyReport.rankedTransitions.filter(
  (delta) =>
    delta.lifecycle.hotEntrantCount === 0 &&
    delta.lifecycle.hotExitedCount === 0 &&
    delta.height.maxAbs > 0.8 &&
    delta.topologyHeightDelta.maxAbs > 0.55 &&
    delta.suspicions.some((suspicion) => suspicion.kind === "large-height-delta"),
);

assert.deepEqual(
  hotAppliedTopologyJumps.map((delta) => formatHillPhaseContinuityDelta(delta)),
  [],
  "stable topology supports should not create broad applied-height jumps while their support lifecycle is clean",
);

const coldEntryKindChurnParams = {
  ...defaultHillOfHillsParams,
  topologyPhaseIntensity: 0.85,
  topologyPhaseLimit: 8,
  topologyPhaseDurationMs: 1_800,
  ditchPhaseIntensity: 0,
  trailPhaseIntensity: 0,
} satisfies HillOfHillsTerrainParams;
const coldEntryKindChurnFromFrame = {
  index: 4,
  reason: "rise" as const,
  clock: 0.04,
  epoch: 0,
  phaseTimeMs: 0.04 * coldEntryKindChurnParams.topologyPhaseDurationMs,
};
const coldEntryKindChurnToFrame = {
  index: 5,
  reason: "rise" as const,
  clock: 0.05,
  epoch: 0,
  phaseTimeMs: 0.05 * coldEntryKindChurnParams.topologyPhaseDurationMs,
};
const coldEntryKindChurnDelta = compareHillPhaseContinuityFrames(
  coldEntryKindChurnFromFrame,
  createHillOfHillsTerrain({
    ...coldEntryKindChurnParams,
    topologyPhaseTimeMs: coldEntryKindChurnFromFrame.phaseTimeMs,
  }),
  coldEntryKindChurnToFrame,
  createHillOfHillsTerrain({
    ...coldEntryKindChurnParams,
    topologyPhaseTimeMs: coldEntryKindChurnToFrame.phaseTimeMs,
  }),
);

assert.ok(coldEntryKindChurnDelta.lifecycle.enteringCount > 0, "fixture should exercise cold support entry");
assert.ok(coldEntryKindChurnDelta.height.maxAbs < 0.001);
assert.ok(coldEntryKindChurnDelta.supportHeight.maxAbs < 0.001);
assert.ok(coldEntryKindChurnDelta.topologyAmount.maxAbs < 0.002);
assert.ok(coldEntryKindChurnDelta.phaseInfluenceKindChangeRatio > 0.12);
assert.ok(
  !coldEntryKindChurnDelta.suspicions.some((suspicion) => suspicion.kind === "topology-pop"),
  "cold support identity entry and classifier churn should not masquerade as a visible topology pop",
);

const roamingBasinTopologyEventClasses = Object.fromEntries(
  HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS.map((kind) => {
    const enabled = [
      "hill_swell",
      "hill_slump",
      "valley_deepen",
      "valley_fill",
      "ridge_lift",
      "ridge_shear",
      "saddle_pinch",
      "saddle_pass",
    ].includes(kind);

    return [
      kind,
      {
        ...defaultHillOfHillsParams.topologyEventClasses[kind],
        enabled,
        appetite: enabled ? 2 : 0,
        force: enabled ? 2 : 0,
        gesture: kind.includes("saddle") ? "pulse" : "surge",
        phaseOffset: 0,
        spread: 1.7,
      },
    ];
  }),
) as HillOfHillsTerrainParams["topologyEventClasses"];
const roamingBasinHotEntryParams = {
  ...defaultHillOfHillsParams,
  seed: 1,
  gridResolutionX: 20,
  gridResolutionZ: 22,
  hillCount: 5,
  valleyCount: 5,
  ditchPhaseIntensity: 0,
  ditchPhaseLimit: 0,
  trailPhaseIntensity: 0,
  trailPhaseLimit: 0,
  topologyPhaseSeed: 1,
  topologyPhaseIntensity: 1,
  topologyPhaseDriftIntensity: 1,
  topologyPhaseLimit: 10,
  topologyPhaseDurationMs: 5_200,
  topologyPhaseTimeMs: 0,
  topologyPhaseOverlap: 0.32,
  topologyPhaseHillBias: 2,
  topologyPhaseValleyBias: 2,
  topologyPhaseRidgeBias: 2,
  topologyPhaseSaddleBias: 1.4,
  topologyPhaseBasinBias: 0,
  topologyEventClasses: roamingBasinTopologyEventClasses,
} satisfies HillOfHillsTerrainParams;
const roamingBasinHotEntryFromFrame = {
  index: 23,
  reason: "attack" as const,
  clock: 0.12,
  epoch: 4,
  phaseTimeMs: 4.12 * roamingBasinHotEntryParams.topologyPhaseDurationMs,
};
const roamingBasinHotEntryToFrame = {
  index: 24,
  reason: "rise" as const,
  clock: 0.28,
  epoch: 4,
  phaseTimeMs: 4.28 * roamingBasinHotEntryParams.topologyPhaseDurationMs,
};
const roamingBasinHotEntryDelta = compareHillPhaseContinuityFrames(
  roamingBasinHotEntryFromFrame,
  createHillOfHillsTerrain({
    ...roamingBasinHotEntryParams,
    topologyPhaseTimeMs: roamingBasinHotEntryFromFrame.phaseTimeMs,
  }),
  roamingBasinHotEntryToFrame,
  createHillOfHillsTerrain({
    ...roamingBasinHotEntryParams,
    topologyPhaseTimeMs: roamingBasinHotEntryToFrame.phaseTimeMs,
  }),
);

assert.equal(
  roamingBasinHotEntryDelta.lifecycle.hotEntrantCount,
  0,
  `roaming pressure must not reselect supports after an event envelope is hot: ${formatHillPhaseContinuityDelta(
    roamingBasinHotEntryDelta,
  )}`,
);
