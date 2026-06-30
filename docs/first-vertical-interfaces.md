# First Vertical Interfaces

This document names the first public sockets between LERMS subsystems. It is deliberately narrower than the ontology and less ambitious than the eventual renderer, fluid solver, terrain, or crowd simulation.

The TypeScript source of truth is [`src/contracts/first-vertical.ts`](../src/contracts/first-vertical.ts).
The first shared adapter is [`src/contracts/first-vertical-composer.ts`](../src/contracts/first-vertical-composer.ts).

## Purpose

The first vertical needs one shared witness shape for the steal/drop/reroute loop:

1. Lerms climb toward the glove-wealth hoard.
2. A lerm steals a goin.
3. Finger juice interrupts the carrier.
4. The goin drops and rolls.
5. Nearby lerms reroute toward the dropped goin.

These interfaces do not implement that loop. They keep the lanes from inventing incompatible names for the same behavior.

## Socket Schemas

### `lerms.source-truth.v0`

Every contract object carries source truth. A consumer must be able to tell whether a packet came from live simulation, a synthetic fixture, stale hold, visual-only projection, fallback, invalid data, or another named route/config.

Required fields:

- `authority`
- `route`
- `frameId`
- `timestampMs`
- `sampleAgeMs`

### `lerms.terrain-sample.v0`

A sampled terrain point with world position, normal, height, slope, and region. This is enough for early lerm contact, goin rolling, and witness overlays without choosing the final terrain representation.

Regions currently include crown, approach, slope, basin, gutter, rim, and underhill fixture.

### `lerms.lerm-state.v0`

A lerm actor packet with species, state, world position, heading, terrain contact, and optional goin references.

The first load-bearing species is red. The initial state spine includes:

- `approaching_hoard`
- `stealing_goin`
- `carrying_goin`
- `fleeing_with_goin`
- `hit_reacting`
- `tumbling`
- `recovering`
- `rerouting_to_goin`

Any lerm in `stealing_goin`, `carrying_goin`, or `fleeing_with_goin` must reference a real `carryingGoinId`.

### `lerms.goin-state.v0`

A goin packet with state, world position, velocity, desire radius, and optional carrier.

The current state spine is:

- `hoarded`
- `carried`
- `dropped`
- `rolling`
- `settled`
- `recovered`

A `carried` goin must reference a real carrier lerm.

### `lerms.juice-hit-event.v0`

A hit or contact event from finger juice into terrain, lerms, goins, fluid, or future receivers. It records chemistry, target, contact point, impulse, and source packet identity.

The named chemistries are:

- `index_knockback`
- `middle_adhesive_gunk`
- `ring_fertilizer`
- `thumb_slick`
- `pinky_weirdness`

### `lerms.carrier-drop-event.v0`

The explicit event that turns carrier interruption into goin reroute pressure. It records the carrier lerm, goin, cause, world position, outgoing goin velocity, reroute radius, and optional triggering hit.

This is the spine event. If the vertical cannot produce and witness it, the vertical has not proven theft into ecology.

### `lerms.glove-input-frame.v0`

The screen-plane glove input bridge for WiLoR Mini hand tracking. It is intentionally not a 3D hand contract.

Load-bearing fields are source truth, timing/freshness, coordinate-frame identity, finger identity, screen-normalized fingertip positions, screen-plane finger directions, thumb/index pinch state, and pinky extension/hold. The coordinate frame must declare `space: screen_normalized`, `origin: top_left`, `handedness: operator_unmirrored`, and `depthPolicy: non_load_bearing`.

Absolute depth, world-hand position, and "closer to camera means stronger launch" are not load-bearing. If depth-like values appear in a future sidecar packet, they are debug/evidence only until the hand substrate is explicitly upgraded.

Route truth matters. A live WiLoR bridge must expose effective route, backend/model/config identity, freshness/latency, mirroring policy, hand confidence, and fallback status. A requested live route that silently falls back is invalid; fixture or fallback input must downgrade any composed gameplay frame.

The first live-sidecar adapter is [`src/glove-input-wilor-adapter.ts`](../src/glove-input-wilor-adapter.ts). It consumes a Perceptasia/WiLoR Mini MLX sidecar-shaped hand packet and emits `lerms.glove-input-frame.v0` without making depth load-bearing. Its contract is deliberately plain:

- requested bridge route: `perceptasia/wilor-mini-mlx-sidecar/live-glove-input`;
- accepted live effective route: `native_wilor_mini_mlx_detector_sidecar_live`;
- adapter config: `lerms-glove-input-wilor-mini-mlx-adapter-v0`;
- accepted coordinate frame: `screen_normalized` or `image_pixels`, `top_left`, `operator_unmirrored`;
- accepted evidence: wrist, thumb tip/IP, index/middle/ring/pinky MCP and tips, timing/freshness, hand confidence, backend/model, adapter config, and producer config identity;
- derived gestures: thumb/index pinch strength from screen-plane tip distance, pinky aim direction from pinky MCP-to-tip, and pinky hold from the producer packet;
- fallback behavior: any effective route other than the accepted live route must carry a `fallbackReason` and becomes `fallback`, not live authority.

The adapter is a pure bridge, not a sidecar process manager. A browser, Perceptasia, or Kaminos producer may poll the actual sidecar and then feed packets through this adapter, but the adapter itself does not claim that a live sidecar is running.

### `lerms.glove-well-command.v0`

The local command derived from `lerms.glove-input-frame.v0` for Glove Well sacrifice launches.

Phases are:

- `idle`: no primed goin.
- `priming`: thumb/index pinch attracts or fattens a goin fragment from the Glove Well.
- `aiming`: pinky extension/hold supplies a dotted screen-plane arc while the goin is primed.
- `released`: pinch opens after priming and launches the goin along the current aim arc.
- `cooldown`: stale or non-actionable held state that must not create a new release.

Release is an event, not a continuously asserted state. It must trace back to the input frame that opened the pinch. Stale input may preserve a displayed aim briefly, but it must not create a new prime or release.

The first Greedy witness route is:

```sh
npm run witness:glove-well -- --report /tmp/lerms-glove-well-launch-witness.json
```

That route uses fixture glove input and deterministic goin physics. It is useful for proving command conversion, launch arc, rolling goin output, and reroute desire, but it must remain downgraded until a real non-fallback WiLoR Mini sidecar producer emits live `lerms.glove-input-frame.v0` packets.

### `lerms.glove-well-live-comparison-witness.v0`

The live comparison witness is the first Palm-side receipt that takes WiLoR Mini sidecar-shaped packets through the same Glove Well command bridge Greedy uses for fixture launch smokes.

It is intentionally narrower than the launch witness. It records:

- input packet path when the CLI reads saved packets;
- adapted `lerms.glove-input-frame.v0` frames;
- live command phases from those adapted frames;
- fixture command phases from `buildFixtureGloveInputSequence`;
- requested/effective route sets, producer config ids, fallback reasons, camera age, round-trip, and model-latency maxima;
- whether the live command phase trace agrees with the fixture trace;
- the live release event id and source input frame id, when a live packet sequence produces release.

The witness route is:

```sh
npm run witness:glove-well-live-compare -- --packets /tmp/wilor-packets.json --report /tmp/lerms-glove-well-live-comparison.json
```

This route can honestly report `live_simulation` for the comparison when every adapted packet is fresh and non-fallback through `native_wilor_mini_mlx_detector_sidecar_live`. It still does not claim full first-vertical success, sidecar process management, Kaminos hosting, or carrier-drop/juice-hit merge. Those remain separate gates.

### `lerms.glove-well-throw-physics-witness.v0`

The throw physics witness is Greedy's first deterministic thrown-goin objecthood receipt. It takes a Glove Well release and emits the goin's physical trajectory instead of only recording that a release happened.

It records:

- launch, flight, bounce, rolling, settled, and recovered trajectory samples;
- bounce contact records with restitution and spin;
- terrain sample ids for contact points;
- angular velocity while rolling;
- energy and desire-strength decay;
- composer-compatible rolling, settled, and recovered `lerms.goin-state.v0` rows;
- reroute hints for lerms chasing the rolling goin;
- an embedded Preview Bench throw summary for operator smoke.

The fixture route is:

```sh
npm run witness:glove-well-throw-physics -- --report /tmp/lerms-glove-well-throw-physics-witness.json
```

Fixture Glove Well input keeps the witness/frame authority downgraded even when deterministic throw physics rows are internally `live_simulation`. This proves Greedy's throw law, not live operator input or full vertical success.

### `lerms.glove-well-live-throw-composition-witness.v0`

The live throw composition witness connects saved or live WiLoR Mini packet evidence to the same throw physics law. It adapts `perceptasia.wilor-mini-glove-input-packet.v0` packets into `lerms.glove-input-frame.v0`, builds `lerms.glove-well-command.v0` phases, requires a real release command, and feeds that release into `lerms.glove-well-throw-physics-witness.v0`.

It records:

- packet path when the CLI reads saved packets;
- adapted glove input frames and command phase trace;
- release event id and source WiLoR frame id;
- requested/effective WiLoR routes, producer configs, fallback reasons, camera age, round-trip, and model-latency maxima;
- stale/fallback packet counts;
- throw trajectory, bounce, rolling, settle, and desire-decay evidence from the shared throw physics route;
- Preview Bench throw summary with `throwPhysics` fields.

The witness route is:

```sh
npm run witness:glove-well-live-throw -- --packets /tmp/wilor-packets.json --report /tmp/lerms-glove-well-live-throw-composition.json
```

Fresh non-fallback packets through `native_wilor_mini_mlx_detector_sidecar_live` can make the input-to-command-to-throw path `live_simulation`. Saved packets still do not prove that a sidecar process is running now, and this witness still does not claim full first-vertical success or carrier-drop/juice-hit merge. Stale release packets fail instead of silently producing throw evidence.

### `lerms.glove-well-kaminos-live-throw-witness.v0`

The Kaminos live throw witness is the live transport bridge for Glove Well throwing. It consumes Kaminos hand-control sidecar event-cache payloads, validates that they contain fresh non-fallback `perceptasia.hand-control.v0` packets from the live WiLoR-MLX route, converts the nested hand event into the existing WiLoR glove-input adapter shape, and then reuses `lerms.glove-well-live-throw-composition-witness.v0`.

It records:

- `lerms.kaminos-hand-control-event-cache-transport.v0` transport evidence: sidecar event URL, optional file path, Kaminos branch/commit when supplied, event-cache schema, sequence range, packet frame ids, webcam frame refs, cache age, camera age, source backends, effective routes, and model routes;
- source-truth split between underlying live hand input and transport authority. Direct/file-injected event-cache fixtures remain `synthetic_fixture`; live URL fetches can be `live_simulation` when freshness, route, webcam, and monotonic sequence checks pass;
- Glove Well command phase trace and release source frame id from the existing live throw witness;
- throw physics and Preview Bench throw summary with fixture/saved-packet downgrades replaced by Kaminos transport-specific downgrades;
- loud failure before primary output when the cache is empty, stale, fallback, synthetic webcam, missing route/config identity, missing landmarks, or non-monotonic.

Fixture/file route:

```sh
npm run witness:glove-well-kaminos-live-throw -- --event-cache /tmp/kaminos-hand-control-event-caches.json --report /tmp/lerms-glove-well-kaminos-live-throw.json
```

Live Kaminos route after the operator starts live hand control:

```sh
npm run witness:glove-well-kaminos-live-throw -- --kaminos-sidecar-event-url http://127.0.0.1:8096/hand-control-sidecar-event --report /tmp/lerms-glove-well-kaminos-live-throw.json
```

This proves only the Kaminos hand-event-cache-to-Glove-Well-throw path. Full first-vertical acceptance still needs the broader live terrain/lerm/juice/carrier-drop chain and Palm Daddy's source-truth gate.

### `lerms.goin-ecology-merge-witness.v0`

The goin ecology merge witness is Greedy's first shared-desire receipt. It composes the existing stolen carrier-drop goin evidence with the Glove Well thrown-sacrifice goin evidence in one `lerms.first-vertical-frame.v0`, so the first vertical can stop treating dropped stolen wealth and launched bait wealth as separate toy worlds.

It records:

- the carrier hit-to-drop chain from `lerms.goin-glove-wealth-witness.v0`;
- the thrown goin release, bounce count, phase trace, rolling/settled/recovered states from `lerms.glove-well-throw-physics-witness.v0`;
- one merged frame with both rolling goins present;
- shared desire hints showing nearby lerms targeting the carrier-dropped goin and the thrown sacrifice goin;
- source-truth evaluation showing why the merged frame is still not full first-vertical acceptance.

The witness route is:

```sh
npm run witness:goin-ecology-merge -- --report /tmp/lerms-goin-ecology-merge-witness.json
```

This route proves shared goin ecology, not live camera input, sidecar process management, final goin art, full crowd AI, or first-vertical success. Fixture or saved transport stays downgraded even when deterministic goin physics and desire routing are internally live-simulation subsystem evidence.

### `lerms.glove-wealth-custody-witness.v0`

The Glove Wealth custody witness makes the wealth lineage explicit without pretending to define the final economy. It composes the merged goin ecology into `lerms.glove-well-state.v0`, `lerms.glove-wealth-fragment.v0`, and `lerms.glove-wealth-custody-event.v0` rows so consumers can see which portable desire chunk came from the Glove Well, which lerm stole it, which hit dropped it, which piece was sacrificially thrown, which rolling goins became local desire wells, and which fragment returned to the well.

The route is:

```sh
npm run witness:glove-wealth-custody -- --report /tmp/lerms-glove-wealth-custody-witness.json
```

This is a lineage and custody receipt, not scoring, treasure economy, final goin art, live sidecar proof, or first-vertical acceptance. It carries the merged ecology source-truth blocker forward and fails stale custody evidence instead of emitting a fresh-looking lineage report.

### `kaminos.forge-host.smoke-offer.v0` For Goin Ecology

Greedy can export the merged goin ecology as a Forge Host / Preview Bench smoke offer for Kaminos without giving Kaminos ownership of goin law.

The route is:

```sh
npm run witness:goin-ecology-smoke-offer -- --source-ref /tmp/lerms-goin-ecology-merge-witness.json --source-commit <lerms-commit> --report /tmp/lerms-goin-ecology-merge-smoke-offer.json
```

The exported file uses `kaminos.forge-host.smoke-offer.v0` with the Preview Bench loader route `kaminos/preview-bench/smoke-offer-file`. It carries producer diaulos, source route/ref/commit, freshness budget, fixture authority, downgrades, rejected debug surfaces, and a nested `kaminos.preview-bench.payload-report.v0` summary. This is a hostable smoke offer, not source authority, live camera proof, or full vertical acceptance.

### `lerms.first-vertical-frame.v0`

The frame envelope that joins terrain samples, lerm states, goin states, juice hits, and carrier-drop events under one source-truth packet.

Witnesses should use this envelope when claiming that the first vertical loop happened.

## First Vertical Composer

Subsystem lanes may emit partial `lerms.first-vertical-frame.v0` packets while the vertical is still converging. The composer is the narrow joining point for those partial packets.

`composeFirstVerticalFrame` currently accepts:

- one Hill of Hills terrain packet;
- zero or more subsystem frames, such as red-lerm body/motion witnesses, future finger-juice packets, and goin packets;
- a composed `frameId`, `timestampMs`, optional route, and freshness budget.

The composer owns:

- preserving source truth and folding authority to the weakest participating source;
- rejecting stale source packets instead of silently presenting old evidence as live;
- rejecting duplicate terrain, lerm, goin, juice-hit, and carrier-drop IDs;
- asserting the final frame with the shared `assertFirstVerticalFrame` validator.

The first vertical should route new subsystem outputs through the composer unless a lane has a specific reason to test a subsystem in isolation. A composed frame with fixture-backed red lerms must remain `synthetic_fixture` until the red-lerm source is live; a live terrain packet alone is not enough to claim a live composed vertical.

The current file-producing fixture route is:

```sh
npm run witness:composer -- --out /tmp/lerms-first-vertical-composer-witness.json
```

That route writes an integrated fixture receipt for chamber/bootstrap consumers. It is useful as a source-honest handoff, not proof of a live vertical: the terrain socket and red-lerm data are fixture-backed, live finger-juice packets, live goin physics, live crowd AI, and generated lerm motion are intentionally absent.

## Source Truth Upgrade Boundary

The TypeScript source of truth is [`src/contracts/first-vertical-source-truth-upgrade.ts`](../src/contracts/first-vertical-source-truth-upgrade.ts).

`lerms.first-vertical-source-truth-upgrade.v0` is the narrow gate that says when a first-vertical receipt may honestly exceed `synthetic_fixture` authority. Kaminos, Spoke, or any other chamber host may render fixture receipts, but they must not present those receipts as live evidence until this evaluator accepts the frame.

A frame upgrades to `live_simulation` only when all of these predicates are true:

- the frame envelope source is `live_simulation`;
- every terrain, lerm, goin, juice-hit, and carrier-drop evidence packet is `live_simulation`;
- the frame and evidence packet sample ages are inside the configured freshness budget;
- terrain, at least one lerm, at least one goin, at least one juice hit, and at least one carrier-drop event are present;
- a carrier-drop event caused by a juice hit links to an actual hit against that carrier lerm;
- the linked goin exists and is in `dropped` or `rolling` state;
- no route component declares itself intentionally empty.

Any failed predicate downgrades the effective authority. This is deliberately strict: a beautiful renderer, visual-only witness, stale hold, fallback route, terrain-only route, or partial integrated fixture remains source-honest but cannot claim the first vertical proved live theft into ecology.

Current downgrade cases that consumers must preserve:

- `source-authority-not-live`: the frame envelope is still fixture/fallback/visual/stale/invalid.
- `non-live-evidence-source`: at least one evidence packet is not live.
- `stale-frame-source` or `stale-evidence-source`: the receipt is too old for live authority.
- `missing-terrain-evidence`, `missing-lerm-evidence`, `missing-goin-evidence`, `missing-juice-hit-evidence`, or `missing-carrier-drop-evidence`: the vertical is incomplete.
- `missing-hit-to-drop-chain`: a drop exists but cannot be traced to a live juice hit against the carrier.
- `intentionally-empty-*`: the route itself admits that a live subsystem is absent.

The current composer witness must therefore continue to report `synthetic_fixture`. Its intentionally empty live finger-juice, goin physics, crowd AI, and generated-motion routes are useful placeholders for integration, but they are also explicit blockers until the real subsystems are connected.

## Non-Goals

These contracts do not choose:

- body mesh or rigging format;
- crowd simulation architecture;
- goin physics solver;
- terrain renderer or terrain storage;
- fluid solver implementation;
- final gameplay balance;
- public score/accounting rules.

Those systems can be ambitious. They still need to emit enough of this shared shape for the first vertical to compose.
