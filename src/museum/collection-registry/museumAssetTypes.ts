import type { WalletAddress } from '../wallet/eip1193Wallet'

export type MuseumAssetCategory = 'resident' | 'artwork' | 'photography' | 'object'
export type MuseumTokenStandard = 'erc721' | 'erc1155'

export type MuseumAssetIdentity = {
  collectionId: string
  chainId: number
  contract: `0x${string}`
  tokenId: string
}

export type MuseumAssetSummary = MuseumAssetIdentity & {
  key: string
  category: MuseumAssetCategory
  title: string
  collection: string
  imageUrl: string | null
  animationUrl: string | null
  attributes: readonly MuseumAssetAttribute[]
}

export type MuseumAssetAttribute = {
  trait_type: string
  value: string
}

export type AtriumInstallationDraft = {
  version: 1
  address: WalletAddress
  addressSource: 'wallet' | 'public-address'
  glowbuds: readonly MuseumAssetIdentity[]
  artworks: readonly MuseumAssetIdentity[]
}

export type AppliedAtriumInstallation = AtriumInstallationDraft & {
  verifiedAt: string
  layoutVersion: 1
}

export type MuseumOwnedAssetsResponse = {
  address: WalletAddress
  assets: readonly MuseumAssetSummary[]
  collectionErrors: readonly MuseumCollectionIssue[]
  verifiedAt: string
}

export type MuseumCollectionIssue = {
  collectionId: string
  message: string
}

export type MuseumVerificationResult = {
  verified: boolean
  installation: AppliedAtriumInstallation | null
  missing: readonly MuseumAssetIdentity[]
  unavailable: readonly MuseumAssetIdentity[]
  error?: string
}

export const MAX_ATRIUM_GLOWBUDS = 10
export const MAX_ATRIUM_ARTWORKS = 12

export function museumAssetKey(identity: MuseumAssetIdentity) {
  return `${identity.collectionId}:${identity.chainId}:${identity.contract.toLowerCase()}:${identity.tokenId}`
}

export function isMuseumAssetIdentity(value: unknown): value is MuseumAssetIdentity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.collectionId === 'string'
    && typeof candidate.chainId === 'number'
    && Number.isInteger(candidate.chainId)
    && typeof candidate.contract === 'string'
    && /^0x[a-fA-F0-9]{40}$/.test(candidate.contract)
    && typeof candidate.tokenId === 'string'
    && /^\d+$/.test(candidate.tokenId)
}

export function normalizeMuseumAssetIdentity(value: MuseumAssetIdentity): MuseumAssetIdentity {
  return {
    collectionId: value.collectionId,
    chainId: value.chainId,
    contract: value.contract.toLowerCase() as `0x${string}`,
    tokenId: BigInt(value.tokenId).toString(),
  }
}

export function uniqueMuseumAssetIdentities(identities: readonly MuseumAssetIdentity[]) {
  const unique = new Map<string, MuseumAssetIdentity>()
  for (const identity of identities) {
    if (!isMuseumAssetIdentity(identity)) continue
    const normalized = normalizeMuseumAssetIdentity(identity)
    unique.set(museumAssetKey(normalized), normalized)
  }
  return [...unique.values()]
}
