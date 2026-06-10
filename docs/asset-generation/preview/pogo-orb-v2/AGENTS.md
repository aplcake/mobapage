# AGENTS.md

You are working on the contained React Three Fiber / Three.js / TypeScript prototype at:

```txt
docs/asset-generation/preview/pogo-orb-v2/
```

Do not modify unrelated repo areas unless the current task explicitly requires it.

## Project goal

Build a browser-based R3F / Three.js / TypeScript prototype for a first 3D platformer overworld level called:

```txt
Option D: The Long Approach
```

The player is a small glowing spherical rubber-hose character called `PsychedelicPogoOrbAsset`.

The level is a large outdoor museum approach map with:

```txt
Spawn Lawn
Long Lawn Path
Cave Cliff exterior
Separate cave mini-level entrance
Vista Rock
Sign Hill
River / water crossing
Bridge
Stepping stones
Museum Forecourt
Locked Museum Door / Seal
```

## Non-negotiable constraints

```txt
Use React Three Fiber, Three.js, TypeScript, and Vite-style preview structure.
Do not use Unity.
Do not use Unreal.
Do not add a full custom level editor.
Keep topography explicit and debuggable.
Keep collision separate from visual meshes.
Prefer boring reliable foundations before procedural detail.
Use procedural systems to support authored design, not replace it.
Do not hide core level layout inside render components.
Do not overbuild systems before the map is playable.
```

## Implementation order

Follow the numbered handoff folders in sequence.

```txt
01_FOUNDATION_SCHEMA_AND_PRODUCTION_RULES
02_PREVIEW_APP_AND_SCENE_SHELL
03_PLAYER_MOVEMENT_AND_COLLISION
04_OVERWORLD_TOPOGRAPHY_SHELL
05_PATH_AND_ROUTE_BUILDER
06_CAVE_EXTERIOR_AND_WORLD_TRANSITION
07_CAVE_MINI_LEVEL
08_CAMERA_ZONES_AND_DEBUG_TOOLING
09_COLLECTIBLES_QUEST_FLOW_AND_NPCS
10_TOON_VISUAL_STYLE_AND_PROP_LIBRARY
11_PROCEDURAL_SCATTER_AND_PERFORMANCE
12_POLISH_QA_AND_RELEASE_CHECKLIST
```

## Coding rules

```txt
Keep LevelData explicit.
Keep runtime player state out of React state if it changes every frame.
Use refs and per-frame mutation for movement.
Reuse Three.js materials and geometries where practical.
Do not create new geometry or material objects in hot frame paths.
Do not implement future packages unless requested.
Do not replace working systems with larger abstractions unless justified.
```

## Validation commands

Run the closest available commands after every package:

```txt
npm install --ignore-scripts
npm run typecheck
npm run build
```

If a command is unavailable, explain why and add it only if it belongs to the current package scope.

## Required final report after every Codex task

Report:

```txt
Files changed
Systems added
Checks run
Checks passed or failed
Known limitations
Deviations from the package instructions
Next recommended package
```
