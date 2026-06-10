# MoBA Site Frontend Handoff V2

This is the V2 handoff package for replacing the current `museumofbased.art` frontend with the playable Museum of Based Art world from the Vacuum Head production prototype.

The live site currently appears to be a minimal Next/Vercel app: a single homepage with `MUSEUM OF BASED ART`, the tagline `Based Art on Chain`, and a `BURN` link to `burn.museumofbased.art`. This package replaces that static/pixel landing surface with the current three-room playable frontend:

- `/` - the museum foyer homepage with the rascal crowd, MoBA info button, route arrows, recording controls, and transitions.
- `/courtyard` - the playable museum courtyard / long approach arena, spawning outside the museum.
- `/burn-room` - the polished Vacuum burn room, including the newer classic cursor pass and exit button.

## Run Locally

```bash
npm install
npm run dev -- -p 3005
```

Open:

```text
http://localhost:3005/
http://localhost:3005/courtyard
http://localhost:3005/burn-room
```

## Main Replacement Contract

For a Next App Router site, the replacement entry files are:

```text
app/page.tsx
app/courtyard/page.tsx
app/burn-room/page.tsx
app/layout.tsx
app/globals.css
src/home/
src/vacuum/
src/render/
src/shaders/
src/core/
docs/asset-generation/code-examples/
docs/asset-generation/preview/pogo-orb/
docs/asset-generation/preview/pogo-orb-v2/
public/home/
```

The local app currently also includes older lab/reference routes. The target MoBA site does not need to expose those publicly unless the team wants internal debug routes.

## Use Order

1. Read `docs/INTEGRATION.md`.
2. Read `docs/MISSING_FROM_TARGET_SITE.md`.
3. Run the package locally and verify `/`, `/courtyard`, and `/burn-room`.
4. Copy the route/source files into the `museumofbased.art` repo.
5. Preserve or reapply the production site's metadata, favicons, domain, Vercel project settings, and any wallet/contract logic.
6. Run the QA checklist in `docs/QA.md`.

## Important Production Notes

- This package is frontend-only. It does not include wallet connection, contract writes, burn transaction confirmation, analytics, or backend APIs.
- The burn room should remain visually responsible for the ritual, while the production burn site remains responsible for wallet/chain/transaction state.
- The source prototype includes recorder UI and dev lab navigation. This package keeps the recorder dock but hides the internal dev switcher/panel by default for a cleaner public MoBA handoff.
- The package is intentionally source-heavy because the courtyard imports the Pogo Orb V2 arena and the burn room imports the Vacuum asset room directly.

## Source References

- Live site checked: `https://www.museumofbased.art/`
- Previous working package model: `Mobaonchain/vacuum-burn-room-handoff`
- Source repo: `Mobaonchain/vacuum-head-production`
