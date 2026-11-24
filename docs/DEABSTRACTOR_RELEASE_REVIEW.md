# De-Abstractor release review

## Release decision, 2026-11-24

The museum owner's requested production release uses the normal GitHub integration for `aplcake/mobapage`. A separate named reviewer is not a release requirement. Do not bypass repository checks. The public room is `/deabstractor`; a shareable preview URL alone is not production verification.

## What changed

- Removed the general-purpose wallet connector tree. The official Abstract client now uses the cross-app provider directly, for the same Abstract app ID. It derives the smart-wallet address, not the login signer's address, and rechecks the signer and Abstract network before submission. Browser-wallet support is unchanged.
- Removed the legacy peer-resolution exception. A fresh normal install and audits of the runtime and full dependency trees reported zero known findings. No advisory exception, force upgrade, or cryptography downgrade was used.
- A complete wallet batch revert cannot print an arrival, even if the outer transaction succeeded. An unknown outcome keeps a recoverable intent. There is no automatic resend or silent fallback to a different signing method.
- The room uses same-origin framing protection, private uncached wallet responses, bounded request bodies, strict input validation and fixed collection/RPC targets. The security probe exits nonzero on any runtime dependency finding.

## Evidence and limits

Run `npm ci`, `npm audit`, `npm run typecheck`, `npm run lint`, `npm test -- --testTimeout=30000` and `npm run build`. Against the production build, run the transfer rehearsal and HTTP security probe listed in the integration guide. The security proof is in [validation/deabstractor-security/security-proof.json](validation/deabstractor-security/security-proof.json).

The browser rehearsals use simulated signatures and chain outcomes. They do not move anyone's NFTs or certify a physical phone, wallet provider, RPC service, or independent security audit. The owner previously reported a real transfer; this release does not represent that as a newly signed test. Receipts, exact transfer events and current ownership remain mandatory before showing success.

## Operations

After merging, verify the deployment for the exact merge commit and test the museum domain: lobby entrance, room, phone layout, demo, return navigation and read-only APIs. The old preview is not the production site. Application throttles are per instance, not a distributed firewall. Watch for sustained RPC errors, duplicate-send reports or incorrect arrival displays. Keep private RPC configuration server-only; do not log wallet signatures.

If a regression occurs, revert the release through Git or restore the preceding production deployment. Preserve saved transfer journals and recover using read-only checks. A site rollback cannot undo a blockchain transaction.
