# Hill Of Hills Architecture

The hill-of-hills is the current LERMS terrain substrate. It is not a background mesh. It is a live, queryable, topology-aware heightfield whose shape, proxy material, surface detail, semantic placement affordances, and witness diagnostics are all meant to compose with lerms, goins, finger juice, and future asset bakes.

This document names the architecture as it exists now so other lanes can compose against it without needing to rediscover the shape from the preview route.

## Runtime Shape

The browser witness in `src/main.ts` owns the interactive preview controls and rendering loop. It feeds `HillOfHillsTerrainParams` into the terrain worker through `src/terrain/hill-of-hills-worker-client.ts`; the worker entry is `src/terrain/hill-of-hills.worker.ts`.

The terrain implementation lives in `src/terrain/hill-of-hills.ts`. The hot path produces a `HillOfHillsTerrainBuffer`, not a full object graph per frame. Consumers that only need renderable or simulation-query data should prefer the buffer and its metric channels over rebuilding sample objects.

The main generated surfaces are:

- Heightfield: a single-valued terrain support with static domain-to-world mapping.
- Topology: local flow direction, accumulation, ridge strength, valley strength, route pressure, ditch potential, and growth potential.
- Proxy material: coarse semantic material identity, color, wetness, growth tint, and blend weights.
- Surface detail: meadow tufts, dust scuffs, slope striations, damp edges, trail wear, and growth buds.
- Material edge law: transition/fray signals between terrain types.
- Placement affordance: semantic hints for future assets and actor interactions.
- Overlay strokes: trail, ditch, phase-ditch, and topographic contour strokes.
- Witness metadata: checksums, active phase/event summaries, cache identity, worker state, and debug readouts.

The worker path is already the normal path. The remaining CPU work is deliberate: this branch proves the data model and continuity constraints before the system moves more of the field computation onto GPU buffers.

## Stable Interfaces

These modules are the current composition surface:

- `src/terrain/hill-of-hills.ts` defines the terrain params, terrain buffer, witness schema, topology events, event envelopes, event debug records, proxy materials, support lifecycle, and sample data.
- `src/terrain/hill-of-hills-terrain-sample-packet.ts` exports terrain sample and motion-affordance packets for other lanes. This is the first "ask the hill what it knows" interface.
- `src/terrain/hill-of-hills-preview-bench-payload.ts` exports a preview bench payload with route/config/source truth.
- `src/terrain/hill-of-hills-phase-filmstrip.ts` exports the salient phase filmstrip schedule and continuity report. This is the primary smoke surface for temporal discontinuity.
- `src/terrain/hill-of-hills-param-settings.ts` owns persisted terrain params and topology event class settings.
- `src/terrain/hill-of-hills-preview-settings.ts` owns persisted preview/debug settings.
- `src/terrain/hill-of-hills-transition-law.ts`, `hill-of-hills-material-fray.ts`, `hill-of-hills-semantic-placement-field.ts`, and `hill-of-hills-placement-affordance.ts` are the current material/semantic edge stack.
- `src/terrain/hill-of-hills-overlay-style.ts` controls visible line overlays, including topographic contours.

The first vertical contract remains `src/contracts/first-vertical.ts`. Hill-of-hills data should eventually flow into that frame envelope rather than becoming a parallel world contract.

## Terrain Buffer Channels

`HillOfHillsTerrainBufferMetricChannel` is the dense field contract. Current channels are:

- `height`
- `slope`
- `routePressure`
- `flowAccumulation`
- `ditchPotential`
- `growthPotential`
- `phaseAmount`
- `trailAmount`
- `sideDitchAmount`
- `topologyAmount`
- `topologyHeightDelta`
- `topologyDeformation`
- `topologyVelocity`
- `topologyForce`
- `hillSwellMembership`
- `hillSlumpMembership`
- `wetness`
- `growthTint`
- `previousHeight`
- `heightDelta`
- `surfaceVelocityY`
- `surfaceDetailDensity`
- `surfaceDetailEdgeMix`
- `materialEdgeStrength`
- `materialEdgeDissolve`

Use these channels when composing with fluids, actors, pathing, generated assets, or debug overlays. If a future consumer needs a new terrain fact, add a named channel or a packet field rather than hiding meaning inside color, stroke opacity, or local preview-only state.

## Topology Events

Macro terrain motion is expressed through topology event classes. Current event kinds are:

- `hill_swell`
- `hill_slump`
- `valley_deepen`
- `valley_fill`
- `ridge_lift`
- `ridge_shear`
- `saddle_pinch`
- `saddle_pass`
- `basin_bloom`
- `strata_reveal`

Each event class has:

- `enabled`: whether the class may emit supports.
- `appetite`: how strongly the class seeks eligible terrain.
- `force`: how strongly the class changes terrain once active.
- `gesture`: the envelope preset.
- `phaseOffset`: class-level phase relationship.
- `spread`: support radius/falloff multiplier.

Current gesture presets are:

- `flicker`
- `pulse`
- `breath`
- `surge`
- `creep`
- `aftershock`
- `tide`
- `rupture`

Every event debug record carries an event kind, semantic reason, eligibility components, envelope, falloff kind, material hint, asset hint, support lifecycle, support amount, and support clock. That debug payload is the intended bridge from "the terrain changed" to "the terrain changed for this reason in this kind of place."

## Continuity Contract

The central stability invariant is support continuity:

- New supports enter cold through `entering`.
- Visible supports evolve through their envelope while `active`.
- Replaced supports remain in `tailing` until their amount fades out.
- No support that is still visually load-bearing may hot-exit at an epoch boundary.
- No newly admitted support may start hot enough to create a broad height, topology, material, or detail step.

The phase scheduler is allowed to change which terrain features are selected over time, but it must not replace a visible terrain cause with a different visible cause in one frame. That was the source of the earlier phase-boundary pop. Treat this invariant as load-bearing for future scheduler work.

In `persistent_pressure` mode, `hill_swell` and `hill_slump` share one signed world-memory field. Swell contributes positive pressure; slump contributes negative pressure. Both event classes retain continuous semantic membership after the instantaneous gesture force withdraws, and neither also applies the older direct-synthesis height mutation. The continuity preset exercises both sides of this force basis. The other eight topology event classes still use direct synthesis, so this is a two-class persistence contract rather than a claim that the full event vocabulary already participates in world memory.

The filmstrip continuity report detects this class of failure. Suspicion kinds include hot entering supports, broad height steps, local height spikes, large support deltas, material pops, topology pops, and support exits.

## Persistence

Terrain tuning persists in local storage under:

```text
lerms.hill-of-hills.terrain-params.v0
```

Persisted terrain settings include the main terrain controls, phase controls, and per-event-class topology settings. Camera settings intentionally do not persist; the operator usually retunes camera by mouse every smoke.

Preview/debug settings use their own storage key in `hill-of-hills-preview-settings.ts`. Keep terrain behavior persistence distinct from view persistence.

## Witness And Smoke

The route exposes a visual witness plus debug text. The filmstrip export captures salient phase points into one composite image. Supported strip counts are 5, 10, 15, 25, and 50 frames.

A useful Hill smoke should answer:

- Which effective route/config was rendered?
- Which worker/cache path was active?
- Which topology event classes were active?
- Which support lifecycle states were present?
- Did the continuity report flag a broad height, support, topology, material, or phase-influence jump?
- Are terrain buffers and visual overlays responding to the same phase state?

For visual reports, prefer the filmstrip when judging phase boundaries. Prefer the live witness when judging feel, emergent terrain composition, and operator-facing controls.

## Known Rough Edges

Ditch formation is still immature. It is useful as a stressor and sometimes as visual spice, but it is not yet semantically smart enough to be a primary terrain feature. Trails are more promising, but they are still topology-biased marks rather than pathfinding, actor history, or creature-caused erosion.

Sprite-like surface details can visually peek through terrain because they are overlay/detail marks rather than true occluded 3D assets. That is acceptable for the proxy shader phase, but future asset composition should move important objects into a route with depth-aware rendering.

The current proxy materials are expressive enough for direction-setting, not final terrain shaders. Valleys should not be assumed to be water; real finger fluid will own actual fluid presence. Valley material should remain green, damp, barren, dusty, or otherwise semantic until a fluid/volume surface explicitly fills it.

## Next Architecture Slice: Pressure Fields

The next computational step should introduce read-only pressure fields before adding more hidden actuators. The point is to keep the high-dimensional terrain alive without letting it grow out of operator control.

The proposed decomposition is:

- Compute named local pressure fields from current terrain state.
- Display those fields and their comfort-band violations in debug.
- Use pressure fields as eligibility inputs first, not as new direct mutation authorities.
- Keep topology event classes as the actuators until the pressure surface is legible.
- Add budgets so no class, region, or semantic channel can silently dominate the world.

Candidate pressure fields:

- slope pressure
- curvature pressure
- ridge pressure
- valley pressure
- saddle pressure
- basin pressure
- exposure pressure
- route pressure
- erosion pressure
- bloom pressure
- stone/strata pressure
- vegetation pressure

Candidate operator controls should be macro appetites, not one slider per hidden equation:

- Volatility: how much the world wants to change.
- Relief hunger: how much terrain wants stronger height contrast.
- Erosion hunger: how much waterlike/topology flow wants to carve and soften.
- Route hunger: how much traversable paths and passes matter.
- Bloom hunger: how much growth wants to colonize eligible terrain.
- Exposure hunger: how much cliffs, strata, and stone want to show.
- Memory: how much previous terrain state resists replacement.
- Restlessness: how often supports try to move to new places.

Budgets should be explicit:

- total topology-change budget;
- per-event-class budget;
- per-region disturbance budget;
- material/semantic-change budget;
- support creation/retirement budget.

Debug modes should make the system authorable:

- Beauty: normal visual thesis.
- Pressure: selected pressure field heatmap.
- Events: active event supports, lifecycles, envelopes, and semantic reasons.
- Comfort: which fields are outside their happy range.
- Change: height/material/detail delta over time.
- Forecast: likely next event candidates before they become supports.

The pressure-field layer is deliberately a read surface first. If it immediately becomes a hidden optimizer, the operator loses the ability to reason about the world. The right sequence is observe, expose, budget, then let the scheduler drink from the fields.

## Merge Gate

Before landing a Hill terrain change that touches runtime behavior, run:

```sh
npm run typecheck
npm run test:contracts
```

For phase/scheduler changes, also export a 25 or 50 frame phase filmstrip and inspect the continuity report. A clean typecheck without phase continuity evidence is not enough for topology scheduler work.
