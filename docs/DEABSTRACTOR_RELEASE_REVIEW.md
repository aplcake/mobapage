# De-Abstractor release review

Status on 2026-11-24: **review candidate updated; not security-cleared for public launch**. Apl's review is requested on PR #5. No live-museum merge, wallet signing, NFT movement, or metadata update was performed by this review.

Current production-dependency audit: **27 package findings (0 critical, 18 high, 7 moderate, 2 low)**, down from 31 before this follow-up. These are inherited package findings, not 27 independent vulnerabilities. No findings are suppressed. The owner previously reported a successful transfer; this review does not certify a new real-wallet or physical-phone test.

## Completed release work

- Patched Hono **4.13.14 -> 4.13.21**, removing its reported advisories, and the supported AGW peer Privy **3.51.0 -> 3.52.1**, removing older Privy/x402 Zod paths. AGW React 1.13.0, AGW client 1.12.3, cross-app connector 0.5.15, Wagmi 2.19.5, root Viem 2.57.10 and all rendering-library versions remain unchanged. Next.js and matching lint tooling remain patched at **16.4.6**.
- Fixed the PR review finding in `browserSigner.ts`: an [EIP-5792 status 500](https://eips.ethereum.org/EIPS/eip-5792#wallet_getcallsstatus) represents a complete batch revert even when the enclosing bundler transaction succeeded. The UI now records failure, releases the resolved intent and explains possible network fees. It never reports arrival or retries automatically.
- Recovery also checks the wallet's terminal batch outcome when a transaction hash was already saved. Recorded reverts stay terminal after reload; stored success still requires a fresh chain check. Unknown, partial, wrong-chain, unrelated and malformed batch responses do not release the lock as a definitive failure.
- Added a room-only framing policy (`frame-ancestors 'self'`, `SAMEORIGIN`), MIME protection, and restricted referrers. This is clickjacking hardening, not a comprehensive script CSP. Other museum rooms are untouched.
- Added a reproducible security probe: `node scripts/audit-deabstractor-security.mjs` after building and starting port 3017. It writes `docs/validation/deabstractor-security/security-proof.json` and deliberately returns exit 1 while high/critical dependency findings remain. A green UI test must not imply a cleared security gate.

## Bounded exposure review

| Surface | Evidence and disposition |
| --- | --- |
| Sending authority | Only the selected browser wallet or official AGW client signs. Calls target the fixed Glowbuds collection, use `safeTransferFrom`, carry zero native value, and request no blanket approval. Sender/network are rechecked; 50 unique passengers is the hard cap. |
| Replay and arrival | An unresolved intent is written before wallet submission; cross-tab locks prevent overlapping sends. Arrival requires matching collection/sender/recipient/token events, another block and current ownership. Recovery and replay never send. Tests exercise rejection, uncertainty, partial progress, outer-success/inner-revert and reload. |
| Public API inputs | Same-origin browser checks, a 2 KB streamed body limit, strict token/address validation, no user-selected RPC/portrait URL, no signing API, private no-store wallet responses and filtered diagnostics. Nine HTTP checks pass against the built server. |
| Vulnerable dependencies in APIs | Production file traces plus their source maps for check, inventory and portrait have **no bundled or external matches** for Zod, decode-uri-component, UUID, Hono or Elliptic. This narrows the direct API exposure; it is not proof about browser bundles, remote wallet services, unknown vulnerabilities, or all museum routes. |
| Browser wallet tree | Still unresolved. Default AGW uses its cross-app connector; browser wallets use EIP-1193. Generic Wagmi connector dependencies remain installed. Absence of a direct application import is not a reachability proof. No risky major override or cryptography downgrade is used. |
| Abuse and availability | In-process throttles do not protect a multi-instance deployment. Inventory reads historical collection logs and can fan out to many owner checks. Production RPC limits and deployment-wide request controls remain an owner-configured launch gate. |

This is a scoped engineering review, not an independent security certification. A fresh `npm ls zod --omit=dev --json` reports no peer-range problems after the Privy update; the previous conflicting optional Zod paths were removed. That compatibility improvement does not resolve the remaining Zod advisory.

The existing lockfile and already-committed `.npmrc` use `legacy-peer-deps=true`. A clean-install dry run with that project setting passes. Deliberately overriding it with strict peer resolution exposes upstream peer conflicts (including cross-app-connect's exact Viem 2.52.0 peer versus the application's 2.57.10) and attempts a different tree. The existing setting is preserved and annotated, not newly introduced. Reproducing the tested install does not certify those upstream peer ranges. No force update or cryptography downgrade is applied.

### Verification of this follow-up

- TypeScript, full lint/lab boundaries and production build pass.
- **604 tests in 57 files** pass, including 12 added terminal-failure/recovery cases.
- **17 simulated transfer scenarios**, 24 screenshots and zero browser errors pass, including a saved-hash full revert, reconnection and another reload without resubmission. No real assets moved.
- **Nine HTTP security checks** pass. The dependency gate remains blocked with 27 findings as stated above.
- The official Abstract login module loads its sign-in button without a browser error after the dependency update. Login was not clicked; this is not authentication or physical-wallet handoff certification.
- Evidence: `docs/validation/deabstractor-security/{security-proof,transfer-proof}.json`. Hosted anonymous review is checked again after the exact commit is deployed; the public review URL is not the live museum domain.

## Historical dependency results (2026-10-28)

`npm audit --json` before: 46 package findings (1 critical, 24 high, 18 moderate, 3 low).
After: 30 package findings (0 critical, 15 high, 13 moderate, 2 low).
Counts include inherited findings in parent packages, not 30 distinct vulnerabilities. They are a point-in-time audit, not an assurance against unknown issues.

Resolved with Next.js 16.4.3, Sharp 0.35.5, eslint-config-next 16.4.3, Vitest 4.1.12, compatible lockfile updates and `ws@^8.0.0` pinned to 8.22.0. The WebSocket override stays within major 8; it does not replace unrelated major-7 instances. React, React DOM, Three.js, R3F, Drei, Viem, Wagmi and the official AGW SDK versions are unchanged.

Remaining upstream issues:

| Component | Advisory | Why not force an override |
| --- | --- | --- |
| Zod 3.x | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), high | Wallet dependencies require major 3. The patched major-4 root used by tooling has been updated, but globally substituting 4 would change validation APIs inside the SDKs. |
| UUID 8/9 | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), moderate | MetaMask-related transitive packages pin older majors. Upstream updates or a separately reviewed migration are needed. |
| decode-uri-component 0.2.2 | [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), moderate; [GHSA-qr28-fpjm-wq7f](https://github.com/advisories/GHSA-qr28-fpjm-wq7f), high | WalletConnect's pinned query-string consumes the CommonJS version. The current patched release is ESM and is not a drop-in global replacement. |
| Elliptic 6.6.1 | [GHSA-848j-6mx2-7j84](https://github.com/advisories/GHSA-848j-6mx2-7j84), low | No patched release listed. It is inherited through AGW's declared secp256k1 peer. Do not downgrade cryptography packages to make the audit counter disappear. |

The application uses browser-provided signing or the official AGW client and does not collect private keys. It imports the default AGW provider, not the optional Privy provider; that observation alone does not establish that these advisories are unreachable. The bounded API build review above does not clear browser dependencies. Do not silently remove the SDK's declared peers, force Wagmi 3 against AGW's Wagmi 2 requirement, or use `npm audit fix --force`.

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

## Apl's rollout and rollback checklist

1. Review the exact PR head and resolve or explicitly accept the documented remaining exposure with a qualified reviewer. The requested GitHub review is not an approval.
2. In the **apls-projects / mobapage** production project, record the current deployment and commit before rollout. Keep the separate **moba-projects / deabstractor-handoff** test copy separate.
3. Configure server-only production RPC capacity and deployment-wide throttling for `/api/deabstractor/check` and `/api/deabstractor/inventory`. Leave room for four-second pending-receipt polling; do not challenge or interrupt active wallet recovery. The agent has not changed production team settings.
4. Stage the reviewed production build without assigning the museum domain. Run anonymous desktop/phone smoke checks, official Abstract login, and the owner-controlled test above on the intended origin.
5. Monitor API 5xx/timeouts and rate-limit responses through the existing hosting logs. Do not log complete wallet request payloads, private RPC URLs or signatures. Investigate a sustained 5xx rate above 1% for five minutes or any verified false-arrival/duplicate-send report immediately.
6. Promote only the exact reviewed build after explicit release approval. If it regresses, the production owner rolls back to the recorded known-good deployment; do not clear users' saved journals or retry any transactions. Confirm the museum homepage, other rooms and read-only pending recovery after rollback. Git source rollback can use a reviewed revert commit rather than rewriting main history.
