# Slime Agent Brief

## Assignment

Own the locked slime prototype at `/slime-prototype` only when the user explicitly reopens slime work.

## Editable Surface

- `src/liquid/**`
- `app/slime-prototype/page.tsx`
- `docs/SLIME_PROTOTYPE_LOCK.md`
- `docs/ORGANIC_LIQUID_AUDIT.md`
- Slime-specific entries in `docs/STYLE_AUDIT.md`, `docs/PERFORMANCE_NOTES.md`, `docs/SUCTION_INVARIANT_REPORT.md`, `docs/RUN_LOG.md`, and `docs/NEXT_PASS_PROMPT.md`
- Slime-specific validation images and JSON under `docs/validation/`

## Read-Only Context

- Vacuum lab: `src/vacuum/**`, `/vacuum-lab`
- Experimental lab: `src/experiment/**`, `/experiment-lab`
- Shared switcher and route shell: `app/layout.tsx`, `src/ui/DevLabSwitcher.tsx`
- Shared helper code: `src/core/**`, `src/render/**`, `src/shaders/**`

## Current State

The slime prototype is locked as a separate psychedelic slime map. It is slime-only, performance-first, no-scroll, and does not mount the vacuum. The route exposes `mode: psychedelic-slime-map`, `qualityMode: fast-studio-slime`, and `vacuumMounted: false`.

## Hard Boundaries

- Do not edit `src/vacuum/**`.
- Do not edit `src/experiment/**`.
- Do not mount vacuum systems inside the locked slime route.
- Do not add score, timers, levels, upgrades, missions, win/fail states, economy, or progression pressure.

## Proof

Run at minimum:

```bash
npm run lab:boundaries
npm run typecheck
npm run lint
npm run visual-smoke
npm run performance:smoke
```
