# Lab Ownership

This repo has three active browser windows. They are separate workspaces, not three tabs of one editable surface.

## Active Lab Roots

| Lab | Route | Owned source | Owned route files | Primary proof |
| --- | --- | --- | --- | --- |
| Vacuum lock | `/`, `/vacuum-lab` | `src/vacuum/**` | `app/page.tsx`, `app/vacuum-lab/page.tsx` | `docs/VACUUM_LOCK.md`, `docs/VACUUM_LAB_NOTES.md`, `docs/validation/vacuum-lab-*.png` |
| Slime prototype | `/slime-prototype` | `src/liquid/**` | `app/slime-prototype/page.tsx` | `docs/SLIME_PROTOTYPE_LOCK.md`, slime smoke/audit files |
| Active experiment | `/experiment-lab` | `src/experiment/**` | `app/experiment-lab/page.tsx` | `docs/agent-briefs/EXPERIMENT_AGENT.md`, `docs/validation/experiment-lab-desktop.png` |

## Shared Coordinator Surface

These files are shared infrastructure. A lab-specific agent should read them, but should not edit them unless explicitly assigned coordination work:

- `app/layout.tsx`
- `app/globals.css`
- `src/ui/DevLabSwitcher.tsx`
- `src/core/**`
- `src/render/**`
- `src/shaders/**`
- `src/systems/suction/**`
- `scripts/**`
- `tests/**`
- `package.json`
- root-level project setup files

## Legacy Reference Surface

These directories are old integrated-game/reference material unless the user explicitly reopens them:

- `src/scene/**`
- `src/stores/**`
- `src/fx/**`
- `src/audio/**`
- `src/haptics/**`
- `src/systems/input/**`
- `src/systems/slime/**`
- `src/systems/vacuum/**`
- `starter_repo/**`
- root handoff/spec files numbered `00_` through `24_`

## Non-Interference Rules

- A lab may import shared infrastructure.
- A lab may not import another lab root.
- A lab may not edit another lab root, another lab route file, or another lab's proof docs.
- Shared infrastructure changes require a coordinator pass because they can alter all three windows.
- The locked slime prototype stays locked unless the user explicitly reopens slime work.
- The locked vacuum prototype stays locked unless the user explicitly reopens vacuum work.
- Locked slime/vacuum ideas should be recomposed inside `src/experiment/**` first, not by importing locked lab roots.

## Boundary Proof

Run:

```bash
npm run lab:boundaries
```

This verifies that:

- `src/vacuum/**` does not import `src/liquid/**` or `src/experiment/**`.
- `src/liquid/**` does not import `src/vacuum/**` or `src/experiment/**`.
- `src/experiment/**` does not import `src/vacuum/**` or `src/liquid/**`.
- Each route imports only its owning lab entry.
- Each per-lab handoff file exists.

`npm run lint` also runs this boundary check.
