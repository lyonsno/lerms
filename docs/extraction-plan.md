# Extraction Plan

## Perceptasia Source Route

Current prototype route:

```text
hand_blocks=1
finger_fluid=1
finger_fluid_swarm=1
finger_fluid_arena=0
```

Current Perceptasia branch:

```text
cc/palm-daddy-live-receipt-video-0609
```

## Source Truth

The repo ontology source is:

```text
docs/ontology.md
```

README and attractor docs should compress or operationalize that ontology, not replace it.

## Extraction Boundary

Extract contracts, not raw history.

Stable candidates:

- `bottom_center_operator_same_orientation_caster_hand`
- `right_hand_thumb_left_visual_avatar_v0`
- `avatar_visual_flip_preserves_unmirrored_emitter_projection_v0`
- `foreground_hand_depth_swarm_field_v0`
- `perspective_ground_plane_canvas_projection_v0`
- `broad_inside_cylinder_channel_manifold_v0`
- `operator_live_swarm_terrain_tuning_v0`
- `drag_preview_then_settled_supersampled_terrain_cache_v0`

Prototype-specific candidates:

- current Canvas2D terrain cache renderer,
- current enemy rectangles,
- current hand-control panel markup,
- current Perceptasia witness aggregation shape,
- any sidecar routing names tied to local smoke infrastructure.

## Near-Term Work

1. Keep Perceptasia as the live smoke surface while terrain, fluid, and lerm behavior converge.
2. Define LERMS-side interfaces for input, terrain, fluid emitters, lerm actors, and goins.
3. Port the smallest route-independent terrain/gameplay core once contracts stop shifting every smoke.
4. Build the first native LERMS dev route only when it can show something Perceptasia cannot show more cheaply.
