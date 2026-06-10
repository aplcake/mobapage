# Experiment Lab Ownership

This folder belongs to the experiment agent. It is now the active lane for combining the locked slime and locked vacuum references.

You may edit:

- `src/experiment/**`
- `app/experiment-lab/page.tsx`
- experiment-specific docs and validation images

You may read but must not edit:

- `src/vacuum/**`
- `src/liquid/**`
- shared infrastructure unless assigned a coordinator task

Keep the experiment lab disposable and isolated. Use it for bridge studies only after the user asks for a deliberate connection.

Current bridge assignment:

- Read `docs/SLIME_PROTOTYPE_LOCK.md` and `docs/VACUUM_LOCK.md`.
- Recreate only the needed ideas locally inside `src/experiment/**`.
- Do not import from or edit `src/liquid/**` or `src/vacuum/**`.
- Keep `/experiment-lab` pressure-free: no score, timers, levels, upgrades, missions, economy, inventory, capacity, win state, or fail state.
