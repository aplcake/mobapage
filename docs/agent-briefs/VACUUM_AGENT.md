# Vacuum Agent Brief

## Assignment

The vacuum/suction window at `/` and `/vacuum-lab` is now locked as a reference prototype. Reopen this lane only if the user explicitly asks for vacuum-only work.

## Locked Surface

- `src/vacuum/**`
- `app/page.tsx`
- `app/vacuum-lab/page.tsx`
- `docs/VACUUM_LOCK.md`
- `docs/VACUUM_LAB_NOTES.md`
- Vacuum-specific entries in `docs/STYLE_AUDIT.md`, `docs/PERFORMANCE_NOTES.md`, `docs/SUCTION_INVARIANT_REPORT.md`, `docs/RUN_LOG.md`, and `docs/NEXT_PASS_PROMPT.md`
- `docs/validation/vacuum-lab-*.png`

These files may be read by the experiment agent, but should not be edited unless the user explicitly reopens vacuum work or assigns a coordinator lock-update pass.

## Read-Only Context

- Slime prototype: `src/liquid/**`, `/slime-prototype`
- Active experimental bridge lab: `src/experiment/**`, `/experiment-lab`
- Shared switcher and route shell: `app/layout.tsx`, `src/ui/DevLabSwitcher.tsx`
- Shared helper code: `src/core/**`, `src/render/**`, `src/shaders/**`, `src/systems/suction/**`

## Current State

The active vacuum window is an old-school cartoon bag vacuum with a wheeled canister, enlarged opaque matte cloth bag, handle, lifted visible goofy eyes, continuous thin elephant-trunk hose, endpoint-locked snuffling mouth nozzle, accordion suction pulse, recoil lag, one large readable hose bend with smaller damped nozzle-end wiggle, 16 restrained suction ribbons, 12 inward pulse beads, 68 instanced test motes, and a small clustered comic pop effect at the yellow nozzle entry. The current AAA pass makes the character react as a single creature: pupils focus toward the intake, brows and grin tighten on suction/flash, the canister gets weighted squash/recoil, and the bag sways/breathes with the hose energy. The accessory kit adds a reactive pressure gauge, riveted service plate, bag cinch strap and buckles, tethered side inspection tag, handle grips, wheel hubcaps, and nozzle clamp screws, all as small cel-shaded prop details rather than UI labels. The latest accessory cleanup removed full planar oval bag bands that read as floating/intersecting on the curved cloth bag and removed the raised teal bag patch that read as a slab intersecting the cloth; the remaining bag hardware stays on clearer surface-fit positions. The latest gulp-flow pass adds a shared `gulpFlow` impulse when motes are swallowed: the nozzle snaps back, colored shock collars travel down the hose, the canister squashes, the gauge/eyes react, and the bag receives a delayed bulge/glow transfer. The latest hose animation pass adds a full-curve traveling rubber wave and stronger front whip while preserving the single generated tube; the eyes now ride a hose-aware clearance anchor with small stalks, and the mouth/nozzle keeps endpoint/tangent clearance so the face moves with the hose without fake overlap. The bag stays singular-colored at rest, swells and squashes when motes are swallowed, and uses one organic under-cloth glow field instead of stacked color-wave overlays: active suction wakes a pastel aurora, gulp colors seed drifting bloom centers, and clustered gulps diffuse into one pearlescent pink/mint/blue/gold/lavender field without adding inventory, capacity, score, or progression. The runtime mouth point is computed from the animated nozzle transform, so ribbons, beads, motes, mouth flash, and feedback all converge at the visible intake. Runtime stats expose `visualModel: oldschool-bag-vacuum-with-endpoint-locked-hose-nozzle`, `suctionModel: cartoon-hose-mouth-forward-force-cone-with-recoil-flash`, and tags for `continuous-single-hose-body`, `gapless-hose-core`, `curve-locked-corrugation-bands`, `single-sweeping-hose-bend`, `damped-front-nozzle-wiggle`, `low-frequency-hose-physics`, `endpoint-locked-nozzle`, `hose-nozzle-overlap-collar`, `thin-zany-trunk-hose`, `up-down-arching-hose`, `rubber-hose-flail-curve`, `eyes-cleared-front-read`, `flowy-rubber-hose-animation`, `hose-mounted-face-clearance`, `eye-hose-clearance-orbit`, `hose-eye-stalks`, `mouth-endpoint-clearance`, `opaque-matte-vacuum-bag`, `gulp-inflating-bag-animation`, `organic-undercloth-bag-bloom`, `soft-aurora-bag-takeover`, `single-field-gulp-color-diffusion`, `cartoon-bag-bulge-pop`, `aaa-vacuum-character-polish`, `eye-focus-intake-reactivity`, `weighted-body-squash-recoil`, `organic-suction-pulse-beads`, `restrained-tapered-flow-ribbons`, `cohesive-vacuum-energy-loop`, `thoughtful-vacuum-accessory-kit`, `animated-pressure-gauge`, `service-rivet-plates`, `bag-cinch-hardware`, `hose-clamp-screws`, `dangling-inspection-tag`, `surface-fastened-accessories`, `bag-accessory-surface-fit`, `vacuum-part-overlap-audit`, `bag-patch-artifact-removed`, `gulp-recoil-flow-through-body`, `traveling-intake-shockwave`, `hose-to-bag-gulp-transfer`, `satisfying-swallow-recoil-layer`, `original-cel-comic-bam-burst`, `gulp-impact-starburst`, `short-lived-pop-shards`, `precise-nozzle-entry-impact-fx`, `micro-comic-pop-variants`, and `small-clustered-gulp-animations`.

## Hard Boundaries

- Do not edit locked vacuum implementation unless the user explicitly reopens this lane.
- Do not edit `src/liquid/**`.
- Do not edit `src/experiment/**`.
- Do not reconnect the vacuum to the locked slime prototype outside `/experiment-lab`.
- Do not add score, timers, levels, upgrades, missions, win/fail states, economy, or progression pressure.

## Proof

Run at minimum:

```bash
npm run lab:boundaries
npm run typecheck
npm run lint
SLURPER_BASE_URL=http://127.0.0.1:3001 npm run lab:smoke
```
