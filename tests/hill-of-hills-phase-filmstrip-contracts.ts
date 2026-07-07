import assert from "node:assert/strict";

import {
  HILL_PHASE_FILMSTRIP_FRAME_COUNTS,
  compareHillPhaseContinuityFrames,
  createHillPhaseFilmstripSchedule,
  fitHillPhaseFilmstripLayout,
  fitHillPhaseFilmstripViewport,
  formatHillPhaseContinuityDelta,
  normalizeHillPhaseFilmstripFrameCount,
} from "../src/terrain/hill-of-hills-phase-filmstrip.js";
import {
  createHillOfHillsTerrain,
  defaultHillOfHillsParams,
} from "../src/terrain/hill-of-hills.js";

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

const firstEnteringEvent = afterTerrain.witness.topologyEventDebug.find((event) => event.supportLifecycle === "entering");
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
