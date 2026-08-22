# Museum Site Integration

## The simple version

The Museum of Based Art frontend and the Burn application remain separate, connected experiences:

| Destination | Owner | Route |
| --- | --- | --- |
| Main Museum | this repository | `/` |
| Sunny Courtyard | this repository | `/courtyard` |
| Burn Room | `aplcake/curateboxburn` deployment | `https://burn.museumofbased.art/` |

The old `/formal-room` URL redirects to `/`. The local `/burn-room` URL redirects to the live Burn application.

## Why the Burn app stays separate

The Burn deployment owns wallet connection, chain state, the ERC-1155 transaction, confirmation, Railway verification, database records, admin controls, and reveal tooling. None of those systems are copied or changed here.

## Preview behavior

- Museum and Courtyard can be reviewed completely on the branch preview.
- The Burn doorway opens the existing live Burn app. Connecting a wallet is not required for navigation testing, and no burn transaction should be signed during preview review.
- The Burn app's `MUSEUM` link currently returns to the live `museumofbased.art` root. It will return to this museum automatically only after a separately approved production launch.

## Hard boundaries

- No production deployment or promotion.
- No DNS change.
- No change to the Burn Vercel projects, Railway API, database, secrets, or admin state.
- No broad staging from the original mixed worktree.
