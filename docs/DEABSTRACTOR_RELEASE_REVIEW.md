# De-Abstractor release review

Status on 2026-10-28: **preview only; not security-cleared or approved for public launch**.

## Dependency results

`npm audit --json` before: 46 package findings (1 critical, 24 high, 18 moderate, 3 low).
After: 30 package findings (0 critical, 15 high, 13 moderate, 2 low).
Counts include inherited findings in parent packages, not 30 distinct vulnerabilities. They are a point-in-time audit, not an assurance against unknown issues.

Resolved with Next.js 16.4.3, Sharp 0.35.5, eslint-config-next 16.4.3, Vitest 4.1.12, compatible lockfile updates and `ws@^8.0.0` pinned to 8.22.0. The WebSocket override stays within major 8; it does not replace unrelated major-7 instances. React, React DOM, Three.js, R3F, Drei, Viem, Wagmi and the official AGW SDK versions are unchanged.

Remaining upstream issues:

| Component | Advisory | Why not force an override |
| --- | --- | --- |
| Zod 3.x | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), high | Wallet dependencies require major 3. The patched major-4 root used by tooling has been updated, but globally substituting 4 would change validation APIs inside the SDKs. |
| UUID 8/9 | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), moderate | MetaMask-related transitive packages pin older majors. Upstream updates or a separately reviewed migration are needed. |
| decode-uri-component 0.2.2 | [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), moderate | WalletConnect's pinned query-string consumes the CommonJS version. The current patched release is ESM and is not a drop-in global replacement. |
| Elliptic 6.6.1 | [GHSA-848j-6mx2-7j84](https://github.com/advisories/GHSA-848j-6mx2-7j84), low | No patched release listed. It is inherited through AGW's declared secp256k1 peer. Do not downgrade cryptography packages to make the audit counter disappear. |

The application uses browser-provided signing or the official AGW client and does not collect private keys. It imports the default AGW provider, not the optional Privy provider; that observation alone does not establish that these advisories are unreachable. No independent bundle-reachability/security review has been completed. Do not silently remove the SDK's declared peers, force Wagmi 3 against AGW's Wagmi 2 requirement, or use `npm audit fix --force`.

Release remains gated on compatible upstream remediation or a documented, qualified review of actual exposure. Passing UI tests does not waive these findings.

## One-bud controlled test

The owner must choose the token ID, source wallet and destination wallet. Do not infer a destination from an earlier chat or use an exchange deposit address. Never request a seed phrase or private key.

1. Use the exact tested HTTPS preview and record its commit. Complete official Abstract login on that origin; confirm the intended account and ownership appear. Separately verify browser-wallet connection if that will be offered at launch.
2. Select one owner-approved Glowbud. Use a destination the owner controls and can access on Abstract. Let the existing wallet-type check run; do not add a control signature or address-suffix challenge.
3. The owner checks the visible sending wallet, receiving wallet and single passenger. Confirm that this moves the existing NFT **on Abstract**, not to Ethereum. The later Ethereum airdrop is separate.
4. The owner opens and approves the wallet transaction themselves. A network fee can apply. Stop if the wallet asks for an unexpected asset, recipient, ETH payment, blanket approval or different chain.
5. Observe the scene waiting for approval, then network confirmation. Do not bypass a pending state, resend, or change wallets mid-flight.
6. Verify the receipt's successful status and the exact collection `Transfer` event, token ID, sender and recipient. Read `ownerOf` at the confirmed block and current state. A successful outer transaction alone is insufficient.
7. Reload: the receipt is recovered without another submission. Replay must not prompt the wallet. Confirm the NFT appears at the destination.
8. Repeat the login/handoff observation on a physical phone before launch. Emulated mobile screenshots are not a substitute.

The agent may inspect public chain records read-only after the owner acts. The agent must not approve, sign or send the NFT transaction. No real-wallet test has been completed by this pass, and no assets or metadata have been changed.

## Other launch gates

- Production RPC capacity and deployment-wide abuse protection, beyond the existing per-process throttles.
- Monitoring and a rollback plan for the museum integration.
- An explicit release decision for the exact reviewed commit. Do not merge the draft or promote a preview automatically.
