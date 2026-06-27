# LERMS Campaign Map

This document names the public subsystem boundaries for LERMS. It deliberately does not name private agents, internal lanes, or coordination handles. The world ontology remains [ontology.md](ontology.md); this map is the playable architecture that the ontology is pulling into shape.

## Campaign Spine

The first integrated game loop is glove-wealth theft, not damage.

1. A glove guards a hoard of glove wealth at the crown of the hill-of-hills.
2. Lerms climb toward the hoard.
3. Finger juice alters lerms, goins, terrain, and route pressure.
4. A lerm that reaches the hoard steals a goin and tries to escape.
5. A hit on the fleeing lerm drops the goin.
6. The dropped goin rolls back through the terrain.
7. Nearby lerms reroute toward the rolling goin.

If a prototype cannot express that spine, it may still be useful research, but it is not yet the first LERMS vertical.

## First Vertical Smoke

The first complete smoke should be crude, but conceptually complete:

- one bottom-centered glove/caster hand;
- one hill-of-hills terrain field with a crown and lower approach;
- one lerm species, initially red lerms;
- one visible goin hoard marker;
- lerms path or bias uphill toward the hoard;
- at least one lerm can steal a goin;
- finger juice can interrupt the carrier;
- the goin drops and rolls under terrain influence;
- nearby lerms can redirect toward the dropped goin.

The first vertical can use placeholder bodies, placeholder wealth, and simplified physics. It cannot substitute "hit particles near targets" for the steal/drop/reroute loop.

The first shared interface pass is captured in [first-vertical-interfaces.md](first-vertical-interfaces.md). Implementations can be crude or ambitious, but their witnesses should converge on that frame envelope before claiming the first vertical spine is proven.

## Subsystem Contracts

### Glove Input

The glove input contract converts hand tracking into world-safe emitter state:

- route/source identity and freshness;
- right/left hand and screen/world frame identity;
- per-finger tip origin and aim direction;
- extension/pose state sufficient to decide whether a finger emits, dribbles, charges, or rests;
- simulation authority distinct from visual/debug authority.

Absolute hand depth should remain non-load-bearing unless a future substrate proves it reliable. Finger identity, fingertip position, and finger direction are the load-bearing hand signals.

### Finger Juice

Finger juice is action-without-touch. It is not just a weapon renderer.

The juice subsystem may be implemented ambitiously: particles, grid fluids, SPH/PBF, WebGPU compute, volumetric flow, surface transport, or hybrids are all fair game. The acceptance boundary is behavioral and evidentiary, not a preemptive implementation ceiling.

Minimum behavioral expectations:

- finger aim controls emission direction and range legibly;
- emitted material can push, gum, grow, slick, or alter according to chemistry;
- juice can affect lerms and goins through explicit force/state hooks;
- surface or world interaction is visible enough that a viewer understands where the juice traveled;
- route truth reports whether the packet is live simulation, synthetic fixture, stale hold, visual-only, invalid, or fallback;
- performance leaves budget for hand tracking, terrain, lerms, goins, renderer, and witnesses.

The five ontology chemistries are the design north star:

- index: sharp blue knockback;
- middle: white adhesive gunk;
- ring: green fertilizer;
- thumb: amber slick;
- pinky: purple weirdness.

### Hill Of Hills

The hill-of-hills is substrate, not backdrop. It should provide:

- a crown/hoard region;
- approach routes;
- rounded hills, basins, lips, ridges, gutters, and troughs;
- slow roiling variation;
- floor/ceiling bounds and period controls for terrain fields;
- collision/routing surfaces for lerms, goins, and juice.

The terrain tuning target should be set by the vertical loop. Over-polishing the hill before lerms, goins, and juice inhabit it risks tuning against the wrong game.

### Lerms

Lerms are not player units. They are opportunistic terrain vermin with economic consequences.

The first species should be red lerms because they are the cleanest proof of the spine: climb, steal, panic, tumble, reroute. Blue and yellow lerms become meaningful after the red-lerm loop works.

Lerm actors need:

- silhouette and body identity;
- heading and locomotion state;
- terrain contact;
- hoard approach desire;
- steal/carry/flee state;
- hit reaction;
- goin-desire reroute state;
- hooks for species-specific juice response.

### Goins And Glove Wealth

Goins are the first playable unit of glove wealth. They must read as thick, physical, desirable, and funny.

The goin contract includes:

- hoard membership;
- stolen/carried state;
- dropped state;
- terrain-influenced rolling;
- collision or near-collision with lerms and juice;
- attraction/reroute pressure on nearby lerms.

Other glove wealth can wait. Goins are the smallest object that proves theft can become ecology.

### Crowd Pressure

Crowd behavior should start narrow:

- spawn pressure;
- uphill approach;
- local clustering and traffic stupidity;
- carrier escape behavior;
- dropped-goin rerouting.

Full species ecology, caste behavior, and complex crowd simulation should grow out of the first vertical, not precede it.

### Rendering And Witness

Visuals are contract-bearing. Every route that claims a gameplay behavior must expose witness truth for:

- effective route/config identity;
- authority/fallback status;
- input packet freshness;
- terrain contract;
- active lerm count and state buckets;
- goin hoard/stolen/dropped counts;
- juice solver/renderer identity;
- frame timing or relevant performance budget.

Screenshots and app-frame receipts should show the loop, not just nonblankness.

## Acceptance Priorities

The campaign should accept ambitious subsystem implementations when they satisfy the public contracts. It should reject low-ambition and high-ambition work equally when it substitutes visual impressiveness for behavioral truth.

Priority order:

1. The steal/drop/reroute spine is legible.
2. Authority and route truth cannot lie.
3. Hand tracking remains responsive enough to feel intentional.
4. Fluid, terrain, goins, and lerms influence each other.
5. Visual language preserves the Underhill/glove-wealth ontology.
6. Complexity earns its place by improving the loop.

## Near Horizon

The next useful convergence target is an integrated red-lerm vertical:

- terrain good enough for actors;
- finger juice good enough to interrupt a carrier;
- goins physical enough to drop and roll;
- lerms simple enough to climb, steal, flee, and reroute;
- witness truth strong enough to prove which subsystem actually acted.
