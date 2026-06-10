# Release Checklist

## Package Sequence

```txt
[x] 01 Foundation Schema and Production Rules
[x] 02 Preview App and Scene Shell
[x] 03 Player Movement and Collision
[x] 04 Overworld Topography Shell
[x] 05 Path and Route Builder
[x] 06 Cave Exterior and World Transition
[x] 07 Cave Mini-Level
[x] 08 Camera Zones and Debug Tooling
[x] 09 Collectibles, Quest Flow, and NPCs
[x] 10 Toon Visual Style and Prop Library
[x] 11 Procedural Scatter and Performance
[x] 12 Polish QA and Release Checklist
```

## Release Readiness

```txt
[x] Seed validation passes for all levels.
[x] Main overworld route movement smoke reaches museum forecourt.
[x] Cave movement smoke reaches wizard platform.
[x] Optional cave secret cache is reachable and optional.
[x] Cave exit trigger is reachable and reports the expected prompt.
[x] Camera zones exist for the major route sections.
[x] Collectibles, signs, wizard NPC, and seal prompt are present.
[x] Procedural scatter is deterministic and instanced.
[x] Debug HUD exposes validation, quest, camera, and performance info.
[x] Props do not alter traversal collision.
[x] Typecheck passes.
[x] Production build passes.
```

## Not Final Production

```txt
[ ] Final art polish complete.
[ ] Debug overlays hidden by production defaults.
[ ] Bundle splitting/performance optimization complete.
[ ] Full manual controller QA complete.
[ ] Production UX and non-debug HUD complete.
```

This preview is ready as an Option D package-handoff prototype, not as a final shipped scene.
