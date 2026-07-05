import assert from "node:assert/strict";

import {
  HILL_PHASE_FILMSTRIP_FRAME_COUNTS,
  createHillPhaseFilmstripSchedule,
  fitHillPhaseFilmstripLayout,
  normalizeHillPhaseFilmstripFrameCount,
} from "../src/terrain/hill-of-hills-phase-filmstrip.js";
import { defaultHillOfHillsParams } from "../src/terrain/hill-of-hills.js";

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
