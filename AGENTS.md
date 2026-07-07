# LERMS Agent Notes

This repo follows the global Codex/Epistaxis policy. Local additions:

- Preserve the game-specific vocabulary: lerms, goins, glove wealth, hill-of-hills, finger juice, caster hand.
- Do not replace the weird ecology with generic enemy classes unless the operator explicitly asks for a conventional design pass.
- Treat Perceptasia as the current proving surface, not as this repo's final architecture.
- Treat WiLoR-MLX as an input/backend dependency and Kaminos as a renderer/simulation dependency candidate.
- Before porting code from Perceptasia, identify the route contract being extracted and the witness proving it in Perceptasia.
- Visual work needs an inspected screenshot or frame before smoke handoff.

## Kaminos Crossing Vocabulary

When LERMS work crosses into Kaminos for terrain, generated creatures, visual smokes, route firings, or world cartridges, use the Kaminos kiln/crucible vocabulary.

Hot boundary:

- **Crucible:** persistent making-memory boundary for one source/intent loop.
- **Armature:** durable scaffold that keeps shaping outputs, such as Hill of Hills phase state, creature morphology generator, source image, mask, mesh, splat, or specimen.
- **Handle:** selectable semantic affordance on an armature, such as terrain region, crop, mask, body limb bud, mouth zone, contact patch, prompt/control parameter, or route knob.
- **Firing:** one route invocation or transformation episode through imagegen, SAM isolation, Trellis, Sharp, baking, motion, simulation, or rendering.
- **Shard:** useful partial output or fragment.
- **Cast:** output that crossed into usable or promotable state.
- **Receipt:** route/config/evidence memory: actual route identity, backend/model, requested/effective config, source refs, output inventory, witnesses, visual smoke, failure phase, and last trustworthy evidence.
- **Cartridge:** packaged live world or world module. LERMS may consume Kaminos as a terrarium cartridge, smoke bench, source of reusable crucibles, and generated-world authoring surface.

Current first product question: which Perceptasia `finger_fluid_swarm` contracts should be extracted as stable LERMS interfaces, and which should remain prototype-specific.
