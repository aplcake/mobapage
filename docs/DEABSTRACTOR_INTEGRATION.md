# De-Abstractor room

The existing museum's atrium doorway and areas menu both lead to [the De-Abstractor](https://www.museumofbased.art/deabstractor). The room has a visible museum return and supports touch and Escape. [Demo mode](https://www.museumofbased.art/deabstractor?demo=1) runs the sequence without a wallet.

## What it transfers

The room moves existing Glowbuds **on Abstract** to a compatible receiving address. It does not bridge to Ethereum, mint an NFT, change metadata or deliver a later airdrop. Visitors see the sending wallet, receiving wallet and selected passengers together before signing. A wallet-type check is not proof the visitor controls the destination. No additional verification signature is requested.

Abstract Global Wallet uses the official AGW client and Privy cross-app sign-in. Other browser wallets use EIP-1193. Up to 50 passengers can travel together. The room offers one atomic batch only when the wallet supports it; otherwise it explains the number of individual approvals in advance. A pending transfer is saved before submission. Leaving the room does not cancel a submitted transfer, and returning or replaying cannot send it again. Arrival requires matching chain evidence for all passengers.

## Integration

- Room, scene, sound and wallet UI: `src/museum/deabstractor/`.
- Route: `app/deabstractor/page.tsx`. Read-only APIs: `app/api/deabstractor/{check,inventory,portrait/[token]}`.
- Room-scoped art and fonts: `public/deabstractor/`. The lobby door does not load the machine or wallet connector. Framing restrictions apply only to the transfer room.
- The museum's existing return navigation, wardrobe, courtyard and external Burn Room stay independent. Exits warn while a transfer is in progress.
- Optional `ABSTRACT_RPC_URL` and `ETHEREUM_RPC_URL` are **server-only**. Never place private RPC keys in public environment variables.

## Verification

Use normal npm peer resolution. After installing, testing and building, start the production build with `npx next start -p 3017`. Set `SLURPER_BASE_URL=http://localhost:3017` for the following scripts:

- `scripts/audit-deabstractor-transfer.mjs`: simulated transfers, batch/serial paths, failure, recovery and replay.
- `scripts/audit-deabstractor-live-choreography.mjs` and `scripts/audit-deabstractor-journey.mjs`: live scene proof gates, demo and accessibility.
- `scripts/audit-deabstractor-integration.mjs` and `scripts/audit-deabstractor-door.mjs`: room entry, return and existing museum routes on desktop and phone layouts.
- `scripts/audit-deabstractor-security.mjs`: dependency findings, server build membership and HTTP boundaries.

See the [release review](DEABSTRACTOR_RELEASE_REVIEW.md) for evidence limits, production checks and rollback.
