# QA Checklist

Run from the package root:

```bash
npm install
npm run typecheck
npm run lint:core
npm run build
```

Then run:

```bash
npm run dev -- -p 3005
```

## Browser Checks

Open:

```text
http://localhost:3005/
http://localhost:3005/courtyard
http://localhost:3005/burn-room
```

Verify:

- Homepage renders the museum foyer, welcome sign, arrow signs, MoBA info button, and tiny rascal crowd.
- MoBA info button opens the MoBA panel with the foyer GIF and links to X, OpenSea, and Discord.
- Explore Courtyard arrow animates out, opens the door/light transition, and routes to `/courtyard`.
- Burn Room arrow animates out, opens the red/fire transition, and routes to `/burn-room`.
- Courtyard spawns outside the museum and allows immediate `E` / prompt return near the museum steps.
- Burn room renders with the updated classic cursor and the bottom-right exit button.
- No console errors appear after route transitions.
- Scene remains readable at desktop and common mobile widths.

## Included Validation Screens

The package includes proof screenshots from the source pass:

- `docs/validation/homepage-aaa-wayfinding-arrows-final-idle.png`
- `docs/validation/home-welcome-sign-aa-readable.png`
- `docs/validation/home-moba-info-panel.png`
- `docs/validation/courtyard-full-arena-museum-spawn.png`
- `docs/validation/courtyard-museum-entry-return-home.png`
- `docs/validation/burn-room-classic-pointer.png`
- `docs/validation/burn-room-exit-button.png`
- `docs/validation/handoff-after-final-burn-complete.png`

## Launch Gate

Do not deploy to the public production domain until:

- metadata and favicons are restored from the live site repo
- burn transaction logic is wired or explicitly disabled/demo-labeled
- dev/debug routes are either removed or intentionally protected
- mobile performance is accepted

