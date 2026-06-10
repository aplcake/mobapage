# Source Boundaries

Active lab roots:

- `src/home/**`: root homepage stage
- `src/vacuum/**`: locked vacuum/suction reference
- `src/liquid/**`: locked slime prototype
- `src/experiment/**`: active experiment bridge lab

Shared read-only infrastructure for lab-specific agents:

- `src/core/**`
- `src/render/**`
- `src/shaders/**`
- `src/ui/DevLabSwitcher.tsx`
- `src/systems/suction/**`

Legacy/reference code for the old integrated prototype:

- `src/scene/**`
- `src/stores/**`
- `src/fx/**`
- `src/audio/**`
- `src/haptics/**`
- `src/systems/input/**`
- `src/systems/slime/**`
- `src/systems/vacuum/**`

Lab roots may import shared infrastructure, but may not import one another. The experiment lab should recreate bridge ideas locally instead of importing locked slime or vacuum roots. Run `npm run lab:boundaries` before handing back multi-agent work.
