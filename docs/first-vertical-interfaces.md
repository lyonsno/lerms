# First Vertical Interfaces

This document names the first public sockets between LERMS subsystems. It is deliberately narrower than the ontology and less ambitious than the eventual renderer, fluid solver, terrain, or crowd simulation.

The TypeScript source of truth is [`src/contracts/first-vertical.ts`](../src/contracts/first-vertical.ts).

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

### `lerms.first-vertical-frame.v0`

The frame envelope that joins terrain samples, lerm states, goin states, juice hits, and carrier-drop events under one source-truth packet.

Witnesses should use this envelope when claiming that the first vertical loop happened.

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
