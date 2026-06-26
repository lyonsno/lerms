# LERMS

LERMS is the emerging hand-tracked hill-defense game spun out of the Perceptasia finger-fluid proving route.

The current playable attractor is simple and specific:

- A small ghostly caster hand sits near the bottom of the screen.
- Finger direction emits colored finger juice into a terrain field.
- Lerms climb the hill-of-hills toward the glove's treasure hoard.
- The treasure is made of chunky coins called goins.
- Lerms steal goins and run away with them.
- Beaming a fleeing goin-carrier makes it drop the goin.
- Dropped goins roll down the hill, pulling nearby lerms away from the hoard.

This repo is the product/game surface. Perceptasia remains the hand-tracking proving viewport for now; WiLoR-MLX remains the model/backend substrate; Kaminos remains the likely source for serious renderer/fluid/terrain experiments before extraction.

## Current Shape

The live prototype still lives in Perceptasia on the `finger_fluid_swarm` route:

```text
http://localhost:8742/?hand_blocks=1&finger_fluid=1&finger_fluid_swarm=1&finger_fluid_arena=0
```

This repo exists so design, gameplay, renderer, asset, and integration work can start accruing under the game name instead of living indefinitely as a Perceptasia side quest.

## First Extraction Targets

- Input contract: bottom-anchored caster hand, fingertip direction, finger identity, fist/charge, and live route latency truth.
- Terrain contract: cylinder-channel hill-of-hills with rounded hills, valleys, floors, ceilings, periodic variation, and slow roiling motion.
- Fluid contract: world-space finger-juice transport that can arc, pool, splash, push, and affect lerm species differently.
- Enemy contract: lerms as species with silhouettes, motion, fluid constitutions, and goin-stealing behavior.
- Treasure contract: goins as physical bait, score, distraction, and reverse-flow crowd-control objects.

## Development Posture

Do not flatten this into a generic shooter, tower defense toy, or particle demo. The hand, terrain, fluid, lerms, and goins should all rhyme mechanically and visually.

The first useful game loop is not damage. It is theft, interruption, dropped treasure, and redirected crowd desire.
