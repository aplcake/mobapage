# De-Abstractor room

This is an additive integration of the Glowbuds De-Abstractor, not a replacement museum. A mint-and-brass doorway beside the Main Museum atrium and the existing museum menu both open `/deabstractor`. The room provides a visible Main Museum return, a matching room menu, and Escape navigation. `/deabstractor?demo=1` runs the cinematic without connecting wallets or sending transactions.

## Isolation

- New UI, CSS modules, scene, sound, wallet provider and transfer logic live in `src/museum/deabstractor/`.
- New route: `app/deabstractor/page.tsx`. New APIs: `app/api/deabstractor/{inventory,check,portrait/[token]}`.
- Artwork and licensed local fonts live in `public/deabstractor/`; font declarations do not style other rooms.
- Reuses the museum's existing, unchanged `eip1193Wallet` and `toonRamp` helpers.
- No root layout, global styles, existing API, collection data, wardrobe or lab changes. The lightweight lobby doorway uses the existing toon materials; it does not load another machine or wallet provider. The menu entry disables prefetch, and the Abstract wallet provider is loaded only in this room when needed.
- The initial import preserved existing dependency versions. Authorized security passes update Next.js, Sharp, test/lint tooling, Hono and Privy. React, Three.js, scene libraries, AGW, Wagmi and root Viem versions remain unchanged.

## Transfer behavior

This transfers existing Glowbuds **on Abstract** to a compatible personal receiving address. It does not bridge to Ethereum, mint new NFTs, modify metadata, or deliver the later Ethereum airdrop.

The room supports browser wallets and Abstract Global Wallet. It uses an atomic batch only when the connected wallet supports it; otherwise it clearly presents separate wallet confirmations. Up to 50 passengers can be selected. The final sending address, receiving address and passenger review remain readable HTML controls. No extra address-control signature is requested.

The machine starts with final confirmation, waits for wallet/network progress, and prints the all-clear only after every passenger has verified receipt/event/current-owner evidence. Rejected, partial and uncertain outcomes are not shown as success. Recovery is read-only and does not automatically resend. Replay never submits a transaction.

## Configuration and release boundary

`ABSTRACT_RPC_URL` and `ETHEREUM_RPC_URL` are optional **server-only** settings. Public endpoints are used otherwise. Do not expose RPC keys using `NEXT_PUBLIC_`. No local environment files or credentials are included.

Before public release, verify provider capacity for inventory log queries, deployment-wide abuse protection, dependency advisories and monitoring. Existing in-process throttles are not a distributed rate limiter. Check official Abstract wallet login against the intended HTTPS origin and perform an owner-controlled transfer with explicit recipient approval, including a physical-phone wallet handoff. Automated wallet scenarios are simulations, not real-transfer certification.

This branch is for review. No main-branch merge or production deployment is part of the integration.

## Full room integration (2026-11-24)

- Dedicated physical entrance on the opposite wall from the existing lore display. The adjacent existing planter is moved beside the lobby bench to keep the doorway clear; its asset is unchanged. Existing courtyard/burn doors, artworks and walk geometry are preserved. Dragging the camera does not accidentally activate the new door.
- Room navigation uses the museum's cream, mint and brass treatment, touch-sized controls, current-room indicator, and visible Main Museum exit. Escape closes the room menu before leaving. It does not steal Escape from receipt inspection, text entry or wallet dialogs.
- In-room exits warn during preparation, wallet approval and pending confirmation. Leaving does not cancel an accepted transaction. Existing persisted recovery and no-resend behavior remain authoritative; the navigation never submits a wallet request.
- Museum-specific page title, canonical/share metadata, inherited museum favicon, immediate loading screen and recoverable route error page. The live Burn Room redirect remains `https://burn.museumofbased.art/`.
- Compatible Next.js and matching lint-tooling update from 16.4.3 to 16.4.6. Rendering libraries and wallet SDK versions are unchanged.
- The existing public review alias is `https://deabstractor-handoff.vercel.app/`. This is a complete museum test copy, not the `museumofbased.art` production domain. PR #5 is the delivery path into Apl's museum repository.

### Current release caveats

The follow-up production audit reports **27 findings: 0 critical, 18 high, 7 moderate and 2 low**, down from 31. Hono is patched to 4.13.21 and Privy to 3.52.1; remaining findings cascade from wallet-tree Zod, UUID, decode-uri-component and Elliptic. The new API build-trace review narrows server exposure but does not clear browser SDKs. Physical-phone wallet handoff, RPC capacity, distributed abuse protection and the unresolved dependency review remain release-owner checks. Apl's production Vercel team is not accessible through this connection; no live-museum merge or promotion was performed. See [current release review](DEABSTRACTOR_RELEASE_REVIEW.md).

The same follow-up fixes complete EIP-5792 batch reverts, including previously saved hashes and reloads, and adds room-only anti-framing headers. All **604 tests**, production build and **17 simulated transfer scenarios** pass. The security probe intentionally stays nonzero while high dependency findings remain; it must not be described as an unconditional security pass.

### Dependency review (2026-10-28)

The initial audit reported 46 findings: 1 critical, 24 high, 18 moderate and 3 low. After the authorized security pass it reports 30: **0 critical, 15 high, 13 moderate and 2 low**. Next.js is pinned to 16.4.3, Sharp to 0.35.5, matching Next lint tooling to 16.4.3, and Vitest to 4.1.12. Compatible transitive updates and a same-major WebSocket override remove the resolved advisories without upgrading the wallet SDKs or rendering libraries.

The remaining findings cascade from four older dependencies in the wallet tree: Zod, UUID, decode-uri-component and Elliptic. They are unresolved, not suppressed or certified harmless. See [security review and controlled-test checklist](DEABSTRACTOR_RELEASE_REVIEW.md). Keep this pull request in draft pending that review and an owner-controlled real-wallet test. No production release has been performed.

## Checks

The committed `.npmrc` matches the legacy peer-resolution mode used by the lockfile and existing build. Do not generate a different tree by silently overriding it; the remaining wallet peer-range limitations are documented in the release review.

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run dev -- -p 3017
SLURPER_BASE_URL=http://localhost:3017 node scripts/audit-deabstractor-live-choreography.mjs
SLURPER_BASE_URL=http://localhost:3017 node scripts/audit-deabstractor-transfer.mjs
SLURPER_BASE_URL=http://localhost:3017 node scripts/audit-deabstractor-journey.mjs
SLURPER_BASE_URL=http://localhost:3017 node scripts/audit-deabstractor-integration.mjs
SLURPER_BASE_URL=http://localhost:3017 node scripts/audit-deabstractor-door.mjs
```

The browser scripts inject test wallets and mock receipts. Do not use a real wallet to run them. Local screenshots are evidence, not deployable assets.

## Integration verification (2026-11-24)

- TypeScript, full lint, lab boundaries and production build pass on Next.js 16.4.6. All **592 tests across 57 files** pass with `npm test -- --testTimeout=30000`; the initial default-timeout run hit two 5-second geometry-test timeouts, not failed geometry assertions.
- The production build passes 18 museum integration checks across desktop and phone layouts: entry/return, room menu, Escape handling, unchanged museum styling, courtyard/wardrobe/formal-room routes and preserved external Burn Room redirect. No page errors or missing new-room assets.
- The physical doorway passes desktop and phone clicks into the room. Canvas checks and inspected close-up screenshots confirm the sign is readable and the planter no longer obstructs it.
- All 16 simulated transfer scenarios pass, with 24 screenshots and no unexpected errors. The choreography audit passes four checks with 11 screenshots, including dismissing both the Main Museum and Escape exit warnings while a 25-passenger transfer remains pending. These two harnesses required cleanup after completing their assertions; no real wallet was used.
- The production-build demo audit passes all nine checks and 16 frames with no unexpected errors and a normal exit: six natural completions, keyboard order including the new room menu, receipt Escape staying inside the room, pause/replay, back navigation, portrait failure and WebGL recovery.
- Evidence is under `docs/validation/deabstractor-{door,integration,live-choreography,transfer-flow}/`. Phone tests are browser viewports, not physical-wallet handoff certification.

## Integration evidence (2026-10-28)

- 579 tests across 57 files passed, including the museum's existing tests and the added page/isolation checks.
- TypeScript, full lint, lab boundaries, production build and whitespace checks passed.
- The production build served the new route and existing routes at port 3017. The museum-menu entry, live room, return navigation and all four other room routes passed 14 desktop/phone canvas, layout and browser-error checks. Returning from the new room preserved the menu's fonts and colors.
- The transferred live-flow audit passed 16 simulated scenarios with 24 screenshots and no unexpected errors, including 25-passenger batching, serial fallback, rejection, pending recovery and no duplicate submissions.
- Three choreography suites passed with 11 screenshots and no errors: delayed approval/network holds, proof-only clearance, partial cancellation, phone/landscape and reduced motion.
- The no-wallet demo passed its nine journey checks with 16 frames, including six natural completions, pause/replay, back navigation, portrait failure and WebGL recovery. No unexpected errors.
- No real wallets were connected, no assets moved, and no metadata changed. Browser phone layouts are not physical-device wallet handoff tests.

## Security-update verification (2026-10-28)

- All 579 tests in 57 files, TypeScript, full lint, lab boundaries and the Next.js 16.4.3 production build passed again.
- All 14 integration checks passed again on desktop and phone layouts, with no page errors or new-room asset failures. The menu, return navigation and other rooms remained intact; desktop and phone screenshots were inspected.
- All 16 simulated transfer scenarios and 24 screenshots passed again with zero unexpected errors; three choreography suites and 11 screenshots also passed and exited normally.
- The official Abstract login module loaded its sign-in button without a page error. Sign-in was not clicked; this is not proof of a completed login.
- A read-only public RPC check returned Abstract chain 2741, block 88411589, and ERC-721 support at the configured collection contract. This is not a transfer test.
- The new lint version requires a documented exception for the developer-only Reset Mode button's intentional full reload; the button's behavior is unchanged. The generated Next type-reference update is included.
