import type { MuseumAssetCategory, MuseumTokenStandard } from './museumAssetTypes'

export type MuseumCollectionDefinition = {
  id: string
  title: string
  chainId: number
  chainSlug: string
  contract: `0x${string}`
  standard: MuseumTokenStandard
  category: MuseumAssetCategory
  tokenRange?: readonly [number, number]
  collectionSlug?: string
  displayAdapter: 'glowbud' | 'museum-artwork'
  rpcUrl: string
  explorerApiUrl?: string
}

// This is deliberately the only allow-list for the personal atrium. The routes
// below look identities up here instead of trusting collection details from a
// browser, marketplace, or wallet extension.
export const MUSEUM_COLLECTIONS: readonly MuseumCollectionDefinition[] = [
  {
    id: 'glowbuds',
    title: 'Glowbuds',
    chainId: 2741,
    chainSlug: 'abstract',
    contract: '0x40148d9aec2d0aed12ccf556cd7cd79c15197644',
    standard: 'erc721',
    category: 'resident',
    tokenRange: [1, 3333],
    collectionSlug: 'glowbuds',
    displayAdapter: 'glowbud',
    rpcUrl: 'https://api.mainnet.abs.xyz',
  },
  {
    id: 'moba-one',
    title: 'MoBA #1: Portraits of an Enjoyer',
    chainId: 8453,
    chainSlug: 'base',
    contract: '0x76a7ba0de6b80e9abcc1855713022b1e753ac1d1',
    standard: 'erc721',
    category: 'artwork',
    tokenRange: [1, 599],
    collectionSlug: 'moba--1',
    displayAdapter: 'museum-artwork',
    rpcUrl: 'https://mainnet.base.org',
    explorerApiUrl: 'https://base.blockscout.com/api/v2',
  },
  {
    id: 'moba-two',
    title: 'MoBA #2: Curated Hearts',
    chainId: 8453,
    chainSlug: 'base',
    contract: '0x5742980cca2aa1572559017c3dd1c489ed4419f5',
    standard: 'erc721',
    category: 'artwork',
    tokenRange: [1, 2222],
    collectionSlug: 'moba-2-curated-hearts',
    displayAdapter: 'museum-artwork',
    rpcUrl: 'https://mainnet.base.org',
    explorerApiUrl: 'https://base.blockscout.com/api/v2',
  },
  {
    id: 'final-photos',
    title: 'One Final Album',
    chainId: 8453,
    chainSlug: 'base',
    contract: '0x769a5525a285c042b5daf8d56adcd7bcab380a81',
    standard: 'erc721',
    category: 'photography',
    tokenRange: [1, 2669],
    collectionSlug: 'final-photos',
    displayAdapter: 'museum-artwork',
    rpcUrl: 'https://mainnet.base.org',
    explorerApiUrl: 'https://base.blockscout.com/api/v2',
  },
  {
    id: 'holiday-potluck',
    title: 'MoBA × Tweaks Holiday Potluck',
    chainId: 8453,
    chainSlug: 'base',
    contract: '0xc34a7ec25dd65cc7e750769b0dce63b66af838fc',
    standard: 'erc1155',
    category: 'artwork',
    tokenRange: [1, 11],
    collectionSlug: 'moba-x-tweaks-holiday-potluck',
    displayAdapter: 'museum-artwork',
    rpcUrl: 'https://mainnet.base.org',
    explorerApiUrl: 'https://base.blockscout.com/api/v2',
  },
  {
    id: 'moba-gallery',
    title: 'MoBA Gallery',
    chainId: 8453,
    chainSlug: 'base',
    contract: '0x04619852f38ebec22bb94ef36b99351db9900194',
    standard: 'erc1155',
    category: 'artwork',
    tokenRange: [1, 9],
    collectionSlug: 'moba-gallery',
    displayAdapter: 'museum-artwork',
    rpcUrl: 'https://mainnet.base.org',
    explorerApiUrl: 'https://base.blockscout.com/api/v2',
  },
] as const

export const MUSEUM_COLLECTION_BY_ID = Object.fromEntries(
  MUSEUM_COLLECTIONS.map((collection) => [collection.id, collection]),
) as Record<string, MuseumCollectionDefinition>

export function museumCollectionForIdentity(identity: {
  collectionId: string
  chainId: number
  contract: string
}) {
  const collection = MUSEUM_COLLECTION_BY_ID[identity.collectionId]
  if (!collection) return null
  return collection.chainId === identity.chainId
    && collection.contract.toLowerCase() === identity.contract.toLowerCase()
    ? collection
    : null
}
