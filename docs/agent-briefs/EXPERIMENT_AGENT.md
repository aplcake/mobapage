# Experiment Agent Brief

## Assignment

Own the sandbox window at `/experiment-lab`. This is now the active next lane for combining the locked slime and locked vacuum references.

## Editable Surface

- `src/experiment/**`
- `app/experiment-lab/page.tsx`
- Experiment-specific entries in `docs/STYLE_AUDIT.md`, `docs/PERFORMANCE_NOTES.md`, `docs/RUN_LOG.md`, and `docs/NEXT_PASS_PROMPT.md`
- `docs/validation/experiment-lab-*.png`

## Read-Only Context

- Locked vacuum lab: `src/vacuum/**`, `/`, `/vacuum-lab`, `docs/VACUUM_LOCK.md`, `docs/VACUUM_LAB_NOTES.md`
- Locked slime prototype: `src/liquid/**`, `/slime-prototype`, `docs/SLIME_PROTOTYPE_LOCK.md`
- Shared switcher and route shell: `app/layout.tsx`, `src/ui/DevLabSwitcher.tsx`
- Shared helper code: `src/core/**`, `src/render/**`, `src/shaders/**`

## Current State

The experiment lab is a third browser window for bridge tests. The user rejected the first Tron-grid/slime bridge attempt and asked to start again by duplicating the locked vacuum into the experiment lane.

The current `/experiment-lab` scene is a local duplicate of the locked vacuum behavior with a local slime-target conversion. It keeps the same vacuum, hose, bag, mouth, suction ribbons, gulp feedback, accessories, DPR, and full-canvas behavior, while the old floating test orbs have become native jelly-wax slime piles. Blobs emerge through smaller colored wet ripples, crawl toward nearby pile centers through adhesive floor drag and same-pile coagulation drift, merge through soft necks/stringers, and accumulate into slumped raised ooze puddles with irregular non-spherical toon geometry, three asymmetric body lobes, flattened pile cores, 63 pile lobes, and reference-inspired technicolor bloom as settling/merge pressure increases. The latest easy-suction v15 pass builds on the integrated AAA material/controller system, organic suction grip, staged mouth contact, no-visible-shapes hose pressure path, rhythmic-glug v10 feed, v11 physical bag reward, v12 swing-flow controller, v13 action animation, v14 full-slurp payoff, and explicit snap-bond state. `computeEasySuctionAssist` now turns nearby distance, mouth-forward alignment, suction influence, visible mass, floor stick, yield, pointer intent, latch seal, grab/contact/magnetic signals, reattach grace, and body speed into bounded brush, auto-latch, pull, feed, seal, aim-ease, and growth-wake signals. Moving past nearby visible slime can pre-seal, tug inward, lower first-contact friction, feed sooner, and wake pile reemergence without random far-field suction or off-mouth deletion. The local slime field now has 76 motes. `computeFullSlurpPayoff` still handles near-empty, final-strand, final-glug, cleanup, recoil, bag reward, and chain-ready completion. The hose still uses `slimeHoseFlow`, `slimeHoseBolus`, `slimeHoseBulge`, and `slimeMouthThread` as internal pressure, not visible slime plugs or feed collars flying through the hose. Colour, shape, hose stretch, mouth settling, easy suction, mass feed, magnetic rim hold, staged contact, glug pulse, snap recoil, bag swelling, swing anchor load, reattach grace, final strand, cleanup smear, completion flourish, and reemergence return bloom now respond to shared physical/action state. Experiment telemetry reports `mode: experimental-lab`, `experimentOnly: true`, `vacuumCloneOf: /vacuum-lab`, `vacuumPrototypeLocked: true`, `vacuumOnly: true`, `slimePrototypeLocked: true`, `testMoteCount: 76`, `testMoteStyle: native-jelly-wax-technicolor-slurpable-slime-piles`, `mergeModel: reference-pigment-soft-union-puddles-and-organic-lobed-coagulation`, `slimeMaterialModel: experiment-native-toon-jelly-wax-state-coupled-material`, `slimeColorModel: harmonic-opalescent-state-reactive-technicolour-v3`, `suctionModel: cartoon-hose-mouth-forward-force-cone-with-sticky-slime-seal`, `slimeVacuumInteraction: easy-reactive-slime-suction-growth-v15`, `completionPayoffModel: last-strand-final-glug-bag-payoff-v14`, `animationModel: state-driven-cartoon-action-language-v13`, `vehiclePhysicsModel: elastic-slime-anchor-swing-chain-controller-v5`, `slimePhysicsModel: viscoelastic-jelly-wax-easy-suction-growth-v15`, `avgEasySuctionAssist`, `avgEasySuctionPull`, `avgEasySuctionFeed`, `avgGrowthWake`, `completion.*`, `completionCycles`, `animation.*`, `controller.swingFlow`, `controller.winchPull`, `controller.reattachGrace`, `controller.anchorLoad`, `glugPulse`, `glugMassFlow`, `glugCycles`, `bagFill`, `bagPressure`, `bagPulse`, `bagBeauty`, `bagCollectedMass`, `bagWobble`, `bagFullPulse`, `bagSlimeChroma`, `avgSnapBondGrip`, `avgSnapBondTension`, `avgSnapBondStrain`, and `avgSnapBondBreak`.

Use the locked references as design targets:

- From slime: jiggly adhesive motion, soft union/merge behavior, marbled psychedelic interiors, colored meniscus rims, grounded shadows, no black slime outlines, no hard color planes, no stiff ovals, no left-wall seam gaps, and performance-first full-canvas rendering.
- From vacuum: mouth-only pull, endpoint clarity, inward ribbons/beads, recoil on gulp, traveling flow-through impulse, bag response, and funny old-school cartoon character energy.
- From both: pressure-free toy feel with no score, levels, timers, missions, upgrades, economy, win/fail state, inventory, capacity, or progression pressure.

The first bridge pass is now the vacuum duplicate baseline. Future bridge work should port slime into this local experiment copy without importing locked lab roots.

## Hard Boundaries

- Do not edit `src/vacuum/**`.
- Do not edit `src/liquid/**`.
- Do not make the experiment route the active root route.
- Do not import from `src/vacuum/**` or `src/liquid/**`.
- Do not mutate `docs/VACUUM_LOCK.md` or `docs/SLIME_PROTOTYPE_LOCK.md` except in a coordinator lock-update pass.
- Do not add score, timers, levels, upgrades, missions, win/fail states, economy, or progression pressure.

## First Bridge Targets

- Preserve the current experiment vacuum duplicate baseline, native jelly-wax slime material, opalescent colour-v3 telemetry, state-coupled material memory, technicolor coagulating slumped pile behavior, viscoelastic stretch/contraction, merge heat/compression, surface-tension merge cohesion, pooled wax settling, directional suction strain, tendril thinning, sticky fragment absorption, sticky mouth seal, organic magnetic grip, sticky rim hold, mouth-settle slime magnetism, stuck-until-slurped contact, natural rim drag before gulp, staged near-contact tremble, lip seal before feed, resistance before yield, rim contact patch, dimple/funnel deformation, tongue-to-rope necking, visible mass feed, no visible slime shapes inside the hose, continuous hose expansion/glug pulses, rhythmic mouth-local glug events, persistent collected-mass bag fill/reward, posterized filled-bag slime bands, snap bond recoil after thin breaks, residue smears, progressive slurp latch, temporary vacuum hold, elastic controller-v5 slime-anchor swing-chain model, v13 state-driven cartoon action animation, v14 near-empty/final-strand/final-glug completion payoff, and v15 easy mouth-local suction assist/growth wake.
- Continue evolving the local targets toward slime: tune long-feed mass conservation during multi-slime contact, improve manual-play swing/slurp feel, increase reemergence variety after gulps, reduce remaining candy-like cap-panel reads, refine mobile slurp composition, and make the pile layer feel more like one material without importing `src/liquid/**`.
- Keep mouth-only suction that mostly pulls slime inward toward the visible intake; decorative drift must stay secondary while suction is active.
- Add early gulp/recoil proof only after the vacuum duplicate still passes smoke and remains recognizable.
- Expose runtime tags for the slime port while preserving `experiment-vacuum-1-to-1-duplicate` and `no-score-no-progression`.
- Preserve desktop/mobile full-canvas no-scroll behavior and route switcher navigation.

## Proof

Run at minimum:

```bash
npm run lab:boundaries
npm run typecheck
npm run lint
npm run test
npm run build
SLURPER_BASE_URL=http://localhost:3002 npm run lab:smoke
```

Latest experiment proof screenshots:

- `docs/validation/experiment-easy-suction-v15-active.png`
- `docs/validation/experiment-easy-suction-v15-proof.json`
- `docs/validation/experiment-full-slurp-v14-active.png`
- `docs/validation/experiment-full-slurp-v14-proof.json`
- `docs/validation/experiment-cartoon-animation-v13-active.png`
- `docs/validation/experiment-cartoon-animation-v13-proof.json`
- `docs/validation/experiment-swing-flow-v12-desktop.png`
- `docs/validation/experiment-swing-flow-v12-mobile.png`
- `docs/validation/experiment-swing-flow-v12-proof.json`
- `docs/validation/experiment-bag-reward-v11-desktop.png`
- `docs/validation/experiment-bag-reward-v11-mobile.png`
- `docs/validation/experiment-bag-reward-v11-proof.json`
- `docs/validation/experiment-rhythmic-glug-v10-desktop.png`
- `docs/validation/experiment-rhythmic-glug-v10-mobile.png`
- `docs/validation/experiment-rhythmic-glug-v10-proof.json`
- `docs/validation/experiment-hose-glug-v9-desktop.png`
- `docs/validation/experiment-hose-glug-v9-mobile.png`
- `docs/validation/experiment-hose-glug-v9-proof.json`
- `docs/validation/experiment-staged-contact-v8-desktop.png`
- `docs/validation/experiment-staged-contact-v8-mobile.png`
- `docs/validation/experiment-staged-contact-v8-proof.json`
- `docs/validation/experiment-visible-hose-slurp-v7-desktop.png`
- `docs/validation/experiment-visible-hose-slurp-v7-mobile.png`
- `docs/validation/experiment-visible-hose-slurp-v7-proof.json`
- `docs/validation/experiment-magnetic-slurp-v6-desktop.png`
- `docs/validation/experiment-magnetic-slurp-v6-mobile.png`
- `docs/validation/experiment-magnetic-slurp-v6-proof.json`
- `docs/validation/experiment-aaa-v5-desktop.png`
- `docs/validation/experiment-aaa-v5-mobile.png`
- `docs/validation/experiment-aaa-v5-proof.json`
- `docs/validation/experiment-intake-contact-v4-desktop.png`
- `docs/validation/experiment-intake-contact-v4-mobile.png`
- `docs/validation/experiment-intake-contact-v4-proof.json`
- `docs/validation/experiment-slime-physics-v3-desktop.png`
- `docs/validation/experiment-slime-physics-v3-mobile.png`
- `docs/validation/experiment-slime-physics-v3-proof.json`
- `docs/validation/experiment-colour-v2-desktop-idle.png`
- `docs/validation/experiment-colour-v2-desktop-active.png`
- `docs/validation/experiment-colour-v2-mobile-idle.png`
- `docs/validation/experiment-colour-v2-mobile-active.png`
- `docs/validation/experiment-colour-v2-proof.json`
- `docs/validation/experiment-slime-physics-desktop.png`
- `docs/validation/experiment-slime-physics-mobile.png`
- `docs/validation/experiment-slime-physics-proof.json`
- `docs/validation/experiment-slurp-swing-desktop.png`
- `docs/validation/experiment-slurp-swing-mobile.png`
