# Codex Handoff Prompt

Use this in the target `museumofbased.art` repo.

```text
Goal: Replace the current Museum of Based Art frontend with the V2 playable three-page MoBA world from this handoff package.

Context:
- The current live site is a Next/Vercel app at https://www.museumofbased.art/.
- The visible public frontend is currently a simple static/pixel homepage with a BURN link.
- This package contains the replacement pages:
  - / foyer homepage
  - /courtyard playable exterior arena
  - /burn-room polished burn room
- Preserve production metadata, favicons, domain, Vercel settings, analytics, and any wallet/contract logic from the target repo.

Implementation:
1. Read README.md, docs/INTEGRATION.md, docs/MISSING_FROM_TARGET_SITE.md, and docs/QA.md.
2. Copy the public routes and required source folders into the target repo.
3. Keep client-only dynamic imports for the R3F scenes.
4. Wire the foyer arrows to /courtyard and /burn-room.
5. Wire courtyard return-to-museum flow back to /.
6. Wire burn-room exit back to /.
7. Decide whether public users should see recording controls; remove or gate them if not. The package already hides the source dev switcher/panel.
8. Wire burn-room wallet/contract responsibilities from the target site, not from this handoff package.
9. Restore MoBA production metadata and favicons.

Validation:
- npm run typecheck
- npm run lint or npm run lint:core
- npm run build
- Browser smoke /, /courtyard, /burn-room
- Verify route transitions and no console errors

Final response:
- Summarize changed files
- List validation commands
- List remaining owner-provided items
```
