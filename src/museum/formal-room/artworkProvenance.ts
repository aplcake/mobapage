export const MUSEUM_ARTWORK_USER_DATA_KEY = 'museumArtwork'

const CHAIN_ID_BY_SLUG = {
  ethereum: 1,
  base: 8453,
  abstract: 2741,
} as const

const CHAIN_SLUG_BY_ID = Object.fromEntries(
  Object.entries(CHAIN_ID_BY_SLUG).map(([slug, chainId]) => [chainId, slug]),
) as Record<number, keyof typeof CHAIN_ID_BY_SLUG>

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/
const TOKEN_ID_PATTERN = /^\d{1,78}$/

export type MuseumArtworkTokenIdentity = {
  chainId: number
  chainSlug: string
  contract: `0x${string}`
  tokenId: string
}

export type MuseumArtworkProvenance = {
  id: string
  title: string
  collection: string
  sourceUrl: string | null
  identity: MuseumArtworkTokenIdentity | null
}

export type MuseumArtworkOwner = {
  address: `0x${string}`
  username: string | null
  ensName: string | null
}

export type MuseumArtworkOwnerResponse = {
  owner: MuseumArtworkOwner
  ownerCount: number
  hasMoreOwners: boolean
}

function canonicalTokenId(value: string) {
  if (!TOKEN_ID_PATTERN.test(value)) return null
  try {
    return BigInt(value).toString()
  } catch {
    return null
  }
}

function tokenIdentity(
  chainSlug: string,
  contract: string,
  tokenId: string,
): MuseumArtworkTokenIdentity | null {
  const normalizedSlug = chainSlug.toLowerCase() as keyof typeof CHAIN_ID_BY_SLUG
  const chainId = CHAIN_ID_BY_SLUG[normalizedSlug]
  const normalizedContract = contract.toLowerCase()
  const normalizedTokenId = canonicalTokenId(tokenId)
  if (!chainId || !ADDRESS_PATTERN.test(normalizedContract) || !normalizedTokenId) return null
  return {
    chainId,
    chainSlug: normalizedSlug,
    contract: normalizedContract as `0x${string}`,
    tokenId: normalizedTokenId,
  }
}

export function museumArtworkIdentityFromSourceUrl(sourceUrl: string | null | undefined) {
  if (!sourceUrl) return null
  try {
    const url = new URL(sourceUrl)
    if (url.protocol !== 'https:') return null
    const hostname = url.hostname.toLowerCase()
    const parts = url.pathname.split('/').filter(Boolean)

    if (hostname === 'opensea.io' || hostname.endsWith('.opensea.io')) {
      if (!['assets', 'item'].includes(parts[0] ?? '')) return null
      return tokenIdentity(parts[1] ?? '', parts[2] ?? '', parts[3] ?? '')
    }

    if (hostname === 'zora.co' || hostname.endsWith('.zora.co')) {
      if (parts[0] !== 'collect') return null
      const [chainSlug, contract] = (parts[1] ?? '').split(':')
      return tokenIdentity(chainSlug ?? '', contract ?? '', parts[2] ?? '')
    }
  } catch {
    return null
  }
  return null
}

export function museumArtworkIdentityFromAsset(identity: {
  chainId: number
  contract: string
  tokenId: string
}): MuseumArtworkTokenIdentity | null {
  const chainSlug = CHAIN_SLUG_BY_ID[identity.chainId]
  if (!chainSlug) return null
  return tokenIdentity(chainSlug, identity.contract, identity.tokenId)
}

export function createMuseumArtworkProvenance({
  id,
  title,
  collection,
  sourceUrl = null,
  identity,
}: {
  id: string
  title: string
  collection: string
  sourceUrl?: string | null
  identity?: MuseumArtworkTokenIdentity | null
}): MuseumArtworkProvenance {
  return {
    id,
    title,
    collection,
    sourceUrl,
    identity: identity ?? museumArtworkIdentityFromSourceUrl(sourceUrl),
  }
}

export function isMuseumArtworkProvenance(value: unknown): value is MuseumArtworkProvenance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.id === 'string'
    && typeof candidate.title === 'string'
    && typeof candidate.collection === 'string'
    && (candidate.sourceUrl === null || typeof candidate.sourceUrl === 'string')
    && (candidate.identity === null || (
      typeof candidate.identity === 'object'
      && candidate.identity !== null
      && !Array.isArray(candidate.identity)
    ))
}

export function shortenMuseumAddress(address: string) {
  return ADDRESS_PATTERN.test(address) ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}

export function museumOwnerDisplayName(owner: MuseumArtworkOwner) {
  return owner.ensName || owner.username || shortenMuseumAddress(owner.address)
}

export function museumArtworkOwnerRequestUrl(identity: MuseumArtworkTokenIdentity) {
  const params = new URLSearchParams({
    chain: identity.chainSlug,
    contract: identity.contract,
    tokenId: identity.tokenId,
  })
  return `/api/opensea/artwork-owner?${params.toString()}`
}

export function openSeaItemUrl(identity: MuseumArtworkTokenIdentity) {
  return `https://opensea.io/item/${identity.chainSlug}/${identity.contract}/${identity.tokenId}`
}
