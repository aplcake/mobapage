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

## Museum Performance Gate

Run the production build on port `3005`, then verify both browser behavior and
real hardware frame pacing:

```bash
npm run museum:browser:smoke
MUSEUM_PERF_BROWSER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run museum:performance:smoke
```

The August 25, 2026 baseline mounted the same full workload everywhere: 91
images, 41 active animation pipelines, and 132 observed resources on both a
1440×900 desktop and a 390×844 phone. Desktop frame pacing fell to 15.65 FPS
with a 99 ms p95 frame and 65.82% long frames.

The optimized production build passed the strict hardware-rendered gate on an
Apple M4 using Chrome/Metal:

| Profile | Average FPS | p95 frame | Long frames | Requests | Known payload |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop 1440×900 | 57.30 | 18.6 ms | 0 | 77 | 11.54 MB |
| Phone 390×844 | 59.98 | 18.1 ms | 0 | 47 | 5.71 MB |

Chrome, Firefox, and WebKit also pass the full desktop and phone interaction
suite with no page, console, request, HTTP, or runaway-camera failures. The
MoBA Gallery motion assets were reduced from 8,645,574 bytes of GIFs to 757,388
bytes of frame sheets (91.24% smaller) without dropping frames.

Machine-readable evidence lives in:

- `docs/validation/museum-browser-smoke.json`
- `docs/validation/museum-performance-smoke.json`

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
