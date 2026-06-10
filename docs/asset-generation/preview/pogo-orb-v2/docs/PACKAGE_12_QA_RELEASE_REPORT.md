# Package 12 QA Release Report

## Scope

This report covers Package 12 for the contained preview:

```txt
docs/asset-generation/preview/pogo-orb-v2/
```

The pass is limited to traversal QA, collision honesty, camera/readability, browser performance, style consistency, known issues, and release-readiness notes. It does not introduce new gameplay systems.

## Golden Path

Expected route:

```txt
Spawn Lawn
Long Lawn Path
Cave branch
Cave entrance ledge
Separate cave mini-level
Return outside
Water crossing
Museum Forecourt
Museum Door / Seal
```

## Static Data Audit

```txt
option-d-overworld validation: ok, 0 errors, 0 warnings
glowbud-wizard-cave validation: ok, 0 errors, 0 warnings
```

Required fixtures present:

```txt
spawn: ok
main path: ok
cave branch: ok
cave entrance transition: ok
cave exit transition: ok
water crossing zone: ok
museum seal prompt: ok
wizard npc: ok
camera zones: ok
collectibles: ok
```

Route and scatter stats:

```txt
overworld generated route surfaces: 96
cave generated route surfaces: 0
overworld scatter instances: 160
overworld scatter draw-call batches: 3
cave scatter instances: 20
cave scatter draw-call batches: 2
```

## Movement QA

Deterministic movement smoke tested:

```txt
Overworld:
- spawn lawn: reached, grounded
- long approach: reached, grounded
- water crossing: reached, grounded
- museum forecourt: reached, grounded

Cave:
- entry floor: reached, grounded
- wizard platform: reached, grounded
- secret cache optional shelf: reached, grounded
- exit trigger: reached, grounded
- cave exit prompt: Return Outside
```

## Collision Honesty

Current collision remains driven by explicit `LevelData` surfaces, slopes, volumes, water zones, and transition triggers. Decorative props and procedural scatter do not alter traversal and do not use mesh collision.

Known collision/readability notes:

```txt
- Overworld still relies on several blockout surfaces and generated route strips.
- Some visual props are decorative stand-ins and may visually sit near traversal space.
- Secret cache route is reachable and optional, not required for progress.
```

## Camera QA

Camera zones are present for:

```txt
default follow
long approach
cliff climb
water crossing
museum reveal
door seal
cave room
```

No cinematic camera behavior was added in Package 12.

## Performance QA

The scatter renderer batches instances by scatter type/color. Current deterministic scatter draw-call estimates are low:

```txt
overworld scatter batches: 3
cave scatter batches: 2
```

Known browser console warnings remain documented in `KNOWN_ISSUES.md`.

## Visual Readability

The current preview includes:

```txt
toon materials
inked terrain silhouettes
non-colliding nature props
non-colliding cave props
non-colliding museum props
coins, signs, and wizard stand-ins
debug HUD and debug overlays
```

This is release-ready as a package handoff preview, not as final production art.
