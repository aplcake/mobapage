# Agent Briefs

Use these briefs when multiple agents are working in parallel. Each agent can read all briefs for context, but should edit only its assigned lab surface.

- `VACUUM_AGENT.md`: documents the locked cartoon hose/suction reference.
- `SLIME_AGENT.md`: owns the locked slime prototype only if slime work is explicitly reopened.
- `EXPERIMENT_AGENT.md`: owns the active sandbox window for locked slime plus locked vacuum bridge tests.

Shared or cross-lab changes should be handled by a coordinator, not by a lab-specific agent.

Run `npm run lab:boundaries` before handing work back.
