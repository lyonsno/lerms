# LERMS

LERMS is the hand-tracked glove-wealth ecology spun out of the Perceptasia finger-fluid proving route.

The source ontology lives in [docs/ontology.md](docs/ontology.md). That document is the stronger truth; this README is only the compressed public face.

The core frame is not "tower defense" and not "gesture shooter." A glove guards a hoard it cannot hold, using fluids it secretes from finger pores, against worm-lemming thieves that convert stolen wealth into terrain, offspring, infrastructure, and political movement.

The current playable attractor is specific:

- A small ghostly caster hand sits near the bottom of the screen.
- Finger direction emits colored finger juice into a terrain field.
- Lerms climb the breathing hill-of-hills toward the glove's hoard.
- Glove wealth is made of touched, handled, lost, pocketed, clasped objects.
- Its most important unit is the goin: a thickened coin-puck of portable desire.
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

## Campaign Map

The playable architecture lives in [docs/campaign-map.md](docs/campaign-map.md). The short version: the first real vertical is not a prettier particle effect. It is the steal/drop/reroute spine where lerms climb toward glove wealth, steal goins, get interrupted by finger juice, drop goins, and redirect the swarm.

The first subsystem sockets live in [docs/first-vertical-interfaces.md](docs/first-vertical-interfaces.md) and [`src/contracts/first-vertical.ts`](src/contracts/first-vertical.ts). They name the shared frame contract for terrain samples, lerm states, goin states, juice hits, and carrier-drop events.

## First Extraction Targets

- Input contract: bottom-anchored caster hand, fingertip direction, finger identity, fist/charge, and live route latency truth.
- Terrain contract: cylinder-channel hill-of-hills with rounded hills, valleys, floors, ceilings, periodic variation, and slow roiling motion.
- Fluid contract: five finger juices as action-without-touch: index knockback, middle adhesive gunk, ring fertilizer, thumb slick, and pinky weirdness.
- Enemy contract: lerms as species with silhouettes, motion, fluid constitutions, theft behavior, and stolen-wealth metabolism.
- Treasure contract: goins and other glove wealth as bait, score, heat, infrastructure substrate, and reverse-flow crowd-control objects.

## Development Posture

Do not flatten this into a generic shooter, tower defense toy, or particle demo. The hand, terrain, fluid, lerms, and goins should all rhyme mechanically and visually.

The first useful game loop is not damage. It is theft, interruption, dropped treasure, and redirected crowd desire.

The deeper promise is property becoming ecology: a false hand replaces touch with weather, and the hill remembers bad decisions by tilting them into new forms.
