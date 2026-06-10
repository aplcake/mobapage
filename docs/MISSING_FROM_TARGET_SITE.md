# Missing / Owner-Provided Items

This package can replace the visible frontend pages, but the production site owner still needs to provide or confirm the following.

## Needed From The Current `museumofbased.art` Repo

- The actual target GitHub repository name and default branch.
- Existing favicon assets:
  - `favicon.ico`
  - `favicon-32.png`
  - `apple-touch-icon.png`
- Any existing SEO/Open Graph image assets.
- Any current Vercel project settings that should stay attached to `museumofbased.art`.
- Any analytics scripts or privacy/cookie requirements.

## Needed For Burn Production Wiring

- Current burn contract address.
- Token IDs / tier mapping.
- Wallet library in use, if any.
- Burn transaction function and confirmation UX.
- Sold-out/status source.
- Whether `burn.museumofbased.art` remains a separate subdomain or is replaced by `/burn-room`.

## Product Decisions To Confirm

- Should public users see the recording/export controls?
- Should the hidden internal lab routes be removed entirely from production?
- Should the old static pixel homepage remain anywhere as an archive page?
- Should `/burn-room` be canonical, or should `burn.museumofbased.art` redirect there?
- Should there be any fallback page for mobile devices that cannot handle WebGL well?

## Technical Risks

- The homepage and courtyard are live R3F scenes. Test on common mobile devices before launch.
- The courtyard source is still under `docs/asset-generation/preview/pogo-orb-v2/`; this is acceptable for handoff but should be moved into `src/courtyard/` in a cleanup pass.
- The burn room source is still a large single component in `src/vacuum/VacuumAssetInspect.tsx`; this works, but a production cleanup pass should extract a public `BurnRoomPage` component.
- The route transition and recorder systems assume client-only rendering.
