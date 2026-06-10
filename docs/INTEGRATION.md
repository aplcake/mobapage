# Integration Notes

## Target Site Shape

The current public `museumofbased.art` page is a Next/Vercel app with:

- Next App Router output
- Vercel deployment headers
- `/` homepage only from the visible public frontend
- metadata title `Museum Of Based Art`
- description `The onchain museum of based art. Culture preserved on Base.`
- favicon files such as `/favicon.ico`, `/favicon-32.png`, and `/apple-touch-icon.png`
- a current `BURN` link pointing to `burn.museumofbased.art`

V2 should replace the frontend pages while preserving the production site's domain, metadata, favicon assets, and deployment settings.

## Recommended Route Replacement

Map the production frontend routes as:

| Target route | V2 source | Purpose |
| --- | --- | --- |
| `/` | `app/page.tsx` + `src/home/HomePage.tsx` | Playable museum foyer homepage |
| `/courtyard` | `app/courtyard/page.tsx` | Playable exterior courtyard / long approach |
| `/burn-room` | `app/burn-room/page.tsx` | Burn room page using the current room asset |

The foyer's in-world arrows already route to `/courtyard` and `/burn-room`.

The courtyard already supports returning to `/` by pressing `E` / using the entry prompt near the museum steps.

The burn room includes an exit control that should route back to the foyer when wired in production.

## Files To Copy Into The Target Repo

Minimum practical copy set:

```text
app/page.tsx
app/courtyard/page.tsx
app/burn-room/page.tsx
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

If the target repo does not already have the same supporting source tree, also copy:

```text
src/dev/
src/experiment/
src/ui/
src/audio/
src/systems/
src/stores/
src/liquid/
src/scene/
src/fx/
src/haptics/
```

These are included because the current `app/layout.tsx`, older lab routes, and Vacuum components can reference them. A production cleanup pass can remove unused lab/debug routes after the three public pages are stable.

## Package Dependencies

The target site needs at least:

```json
{
  "@react-three/drei": "latest",
  "@react-three/fiber": "latest",
  "next": "latest",
  "react": "latest",
  "react-dom": "latest",
  "three": "latest",
  "zustand": "latest"
}
```

The package also uses TypeScript, ESLint, Vitest, and Playwright for validation.

## Metadata And Branding

Before launch, change `app/layout.tsx` metadata to production MoBA values:

```ts
export const metadata = {
  title: 'Museum Of Based Art',
  description: 'The onchain museum of based art. Culture preserved on Base.',
}
```

Also preserve the current site's favicon assets:

```text
public/favicon.ico
public/favicon-32.png
public/apple-touch-icon.png
```

Those favicon assets were not present in the source prototype package and should be copied from the current website repo.

## Burn Room Boundary

The V2 burn room is visually polished but still frontend-only in this package.

Production should keep responsibility for:

- wallet connection
- chain switching
- ERC1155 balance reads
- burn transaction writes
- transaction confirmation and error states
- server/API burn recording
- sold-out/status polling

The burn room visual flow should call into production wallet/contract logic at the confirmation boundary, not silently submit a transaction from inside the 3D scene.

## Public Launch Cleanup Options

The V2 package already hides the internal `VAC / SLIME / EXP` dev switcher and `ProductionDevPanel` from `app/layout.tsx`. Decide before deploying publicly:

- Keep or hide the recording/export dock.
- Keep or remove `/experiment-lab`, `/vacuum-lab`, `/slime-prototype`, and `/vacuum-asset`.
- Keep local demo-only burn room controls or wire them into production contract state.

The source package preserves current behavior. The production repo owner should make these cleanup choices deliberately.
