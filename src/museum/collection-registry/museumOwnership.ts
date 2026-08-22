import {
  MAX_ATRIUM_ARTWORKS,
  MAX_ATRIUM_GLOWBUDS,
  museumAssetKey,
  normalizeMuseumAssetIdentity,
  type AtriumInstallationDraft,
  type MuseumAssetAttribute,
  type MuseumAssetIdentity,
  type MuseumAssetSummary,
} from './museumAssetTypes'
import {
  MUSEUM_COLLECTIONS,
  museumCollectionForIdentity,
  type MuseumCollectionDefinition,
} from './museumCollections'
import { normalizeWalletAddress, type WalletAddress } from '../wallet/eip1193Wallet'
import { glowbudAttributesForToken, glowbudImageUrl } from '../glowbuds/glowbudDisplayTraits'

type JsonRpcResponse = {
  id?: unknown
  result?: unknown
  error?: { message?: unknown }
}

type OpenSeaNft = Record<string, unknown>

export type MuseumOwnershipDependencies = {
  fetchImpl?: typeof fetch
  openSeaApiKey?: string
  now?: () => Date
}

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const OWNER_OF_SELECTOR = '6352211e'
const BALANCE_OF_SELECTOR = '00fdd58e'
const TOKEN_URI_SELECTOR = 'c87b56dd'
const REQUEST_TIMEOUT_MS = 12_000
const TOKEN_METADATA_TIMEOUT_MS = 25_000
const MAX_PUBLIC_ITEM_HTML_LENGTH = 1_500_000
const EXPLORER_PAGE_LIMIT = 8
const EXPLORER_ASSET_LIMIT = 240
const METADATA_BATCH_SIZE = 8
const ANIMATED_HOLIDAY_TOKEN_IDS = new Set(['1', '2', '3', '4', '7', '8'])

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function isSafeTokenId(value: string) {
  return /^\d+$/.test(value) && value.length <= 78
}

function canonicalTokenId(value: string) {
  return BigInt(value).toString()
}

function paddedAddress(address: string) {
  return address.slice(2).padStart(64, '0')
}

function paddedTokenId(tokenId: string) {
  return BigInt(tokenId).toString(16).padStart(64, '0')
}

function hexAddress(value: unknown): WalletAddress | null {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{40,}$/.test(value)) return null
  return normalizeWalletAddress(`0x${value.slice(-40)}`)
}

function hexNumber(value: unknown) {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]*$/.test(value)) return BigInt(0)
  try {
    return BigInt(value)
  } catch {
    return BigInt(0)
  }
}

function readString(value: unknown, maximum = 1_024): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed && trimmed.length <= maximum && !/[\u0000-\u001f\u007f]/.test(trimmed) ? trimmed : null
}

function safeMediaUrl(value: unknown): string | null {
  const raw = readString(value, 8_192)
  if (!raw) return null
  if (raw.startsWith('ipfs://')) {
    const path = raw.slice(7).replace(/^ipfs\//, '').split(/[?#]/, 1)[0]
    if (!path || path.split('/').some((piece) => !piece || piece === '.' || piece === '..')) return null
    return `https://ipfs.io/ipfs/${path.split('/').map(encodeURIComponent).join('/')}`
  }
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return null
    const hostname = url.hostname.toLowerCase()
    return hostname === 'seadn.io'
      || hostname.endsWith('.seadn.io')
      || hostname === 'openseauserdata.com'
      || hostname.endsWith('.openseauserdata.com')
      || hostname === 'ipfs.io'
      || hostname === 'arweave.net'
      ? url.toString()
      : null
  } catch {
    return null
  }
}

function safeMetadataUrl(value: unknown): string | null {
  const raw = readString(value, 8_192)
  if (!raw) return null
  if (raw.startsWith('ipfs://')) {
    const path = raw.slice(7).replace(/^ipfs\//, '').split(/[?#]/, 1)[0]
    if (!path || path.split('/').some((piece) => !piece || piece === '.' || piece === '..')) return null
    return `https://ipfs.filebase.io/ipfs/${path.split('/').map(encodeURIComponent).join('/')}`
  }
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return null
    const hostname = url.hostname.toLowerCase()
    return hostname === 'ipfs.io'
      || hostname === 'dweb.link'
      || hostname.endsWith('.dweb.link')
      || hostname === 'ipfs.filebase.io'
      || hostname === 'gateway.lighthouse.storage'
      || hostname === 'arweave.net'
      ? url.toString()
      : null
  } catch {
    return null
  }
}

function ipfsMetadataPath(value: unknown) {
  const raw = readString(value, 8_192)
  if (!raw) return null
  const resource = raw.startsWith('ipfs://')
    ? raw.slice(7).replace(/^ipfs\//, '')
    : (() => {
        try {
          const url = new URL(raw)
          const match = /^\/ipfs\/(.+)$/.exec(url.pathname)
          return match?.[1] ?? null
        } catch {
          return null
        }
      })()
  if (!resource) return null
  const path = resource.split(/[?#]/, 1)[0]
  if (!path || path.split('/').some((piece) => !piece || piece === '.' || piece === '..')) return null
  return path.split('/').map(encodeURIComponent).join('/')
}

async function fetchTokenMetadata(value: unknown, fetchImpl: typeof fetch) {
  const ipfsPath = ipfsMetadataPath(value)
  const urls = ipfsPath ? [
    `https://ipfs.filebase.io/ipfs/${ipfsPath}`,
    `https://nftstorage.link/ipfs/${ipfsPath}`,
    `https://gateway.pinata.cloud/ipfs/${ipfsPath}`,
  ] : [safeMetadataUrl(value)].filter((url): url is string => Boolean(url))
  if (!urls.length) throw new Error('Unsupported token metadata location.')

  const controllers = urls.map(() => new AbortController())
  const timer = setTimeout(() => controllers.forEach((controller) => controller.abort()), TOKEN_METADATA_TIMEOUT_MS)
  try {
    return await Promise.any(urls.map(async (url, index) => {
      const response = await fetchImpl(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controllers[index].signal,
      })
      if (!response.ok) throw new Error(`Metadata gateway returned ${response.status}`)
      return response.json() as Promise<unknown>
    }))
  } finally {
    clearTimeout(timer)
    controllers.forEach((controller) => controller.abort())
  }
}

function readAttributes(value: unknown): readonly MuseumAssetAttribute[] {
  if (!Array.isArray(value)) return []
  const attributes: MuseumAssetAttribute[] = []
  for (const item of value) {
    const attribute = asRecord(item)
    const traitType = readString(attribute?.trait_type, 80)
    const traitValue = readString(attribute?.value, 160)
    if (traitType && traitValue) attributes.push({ trait_type: traitType, value: traitValue })
  }
  return attributes
}

async function fetchWithTimeout(fetchImpl: typeof fetch, input: string, init: RequestInit) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function rpcCall(
  collection: MuseumCollectionDefinition,
  method: string,
  params: readonly unknown[],
  fetchImpl: typeof fetch,
) {
  const response = await fetchWithTimeout(fetchImpl, collection.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: `${collection.id}-${method}`, method, params }),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`${collection.title} RPC returned ${response.status}`)
  const payload = await response.json() as JsonRpcResponse
  if (payload.error || payload.result === undefined) {
    throw new Error(typeof payload.error?.message === 'string' ? payload.error.message : `${collection.title} RPC could not verify ownership`)
  }
  return payload.result
}

async function ownsToken(
  address: WalletAddress,
  collection: MuseumCollectionDefinition,
  tokenId: string,
  fetchImpl: typeof fetch,
) {
  const token = canonicalTokenId(tokenId)
  if (collection.tokenRange && (BigInt(token) < BigInt(collection.tokenRange[0]) || BigInt(token) > BigInt(collection.tokenRange[1]))) return false
  const data = collection.standard === 'erc721'
    ? `0x${OWNER_OF_SELECTOR}${paddedTokenId(token)}`
    : `0x${BALANCE_OF_SELECTOR}${paddedAddress(address)}${paddedTokenId(token)}`
  const result = await rpcCall(collection, 'eth_call', [{ to: collection.contract, data }, 'latest'], fetchImpl)
  return collection.standard === 'erc721'
    ? hexAddress(result) === address
    : hexNumber(result) > BigInt(0)
}

function identityFor(collection: MuseumCollectionDefinition, tokenId: string): MuseumAssetIdentity {
  return {
    collectionId: collection.id,
    chainId: collection.chainId,
    contract: collection.contract,
    tokenId: canonicalTokenId(tokenId),
  }
}

function authenticMuseumAnimationUrl(
  collection: MuseumCollectionDefinition,
  tokenId: string,
  imageUrl: string | null,
  explicitAnimationUrl: string | null,
) {
  if (explicitAnimationUrl) return explicitAnimationUrl
  if (!imageUrl) return null
  if (collection.id === 'moba-one' || collection.id === 'moba-two') return imageUrl
  return collection.id === 'holiday-potluck' && ANIMATED_HOLIDAY_TOKEN_IDS.has(tokenId)
    ? imageUrl
    : null
}

function openSeaAssetFromNft(collection: MuseumCollectionDefinition, value: unknown): MuseumAssetSummary | null {
  const nft = asRecord(value) as OpenSeaNft | null
  if (!nft) return null
  const contract = readString(nft.contract, 64)?.toLowerCase()
  const rawIdentifier = typeof nft.identifier === 'number' ? String(nft.identifier) : readString(nft.identifier, 78)
  if (!contract || contract !== collection.contract || !rawIdentifier || !isSafeTokenId(rawIdentifier)) return null
  const tokenId = canonicalTokenId(rawIdentifier)
  if (collection.tokenRange && (BigInt(tokenId) < BigInt(collection.tokenRange[0]) || BigInt(tokenId) > BigInt(collection.tokenRange[1]))) return null
  const identity = identityFor(collection, tokenId)
  const imageUrl = safeMediaUrl(nft.original_image_url) ?? safeMediaUrl(nft.image_url) ?? safeMediaUrl(nft.display_image_url)
  const explicitAnimationUrl = safeMediaUrl(nft.animation_url) ?? safeMediaUrl(nft.original_animation_url) ?? safeMediaUrl(nft.display_animation_url)
  return {
    ...identity,
    key: museumAssetKey(identity),
    category: collection.category,
    title: readString(nft.name, 256) ?? `${collection.title} #${tokenId}`,
    collection: readString(nft.collection, 256) ?? collection.title,
    imageUrl,
    animationUrl: authenticMuseumAnimationUrl(collection, tokenId, imageUrl, explicitAnimationUrl),
    attributes: readAttributes(nft.traits ?? nft.attributes),
  }
}

function nextCursor(value: unknown) {
  const record = asRecord(value)
  if (typeof record?.next === 'string' && record.next.trim()) return record.next.trim()
  const nested = asRecord(record?.next)
  return typeof nested?.value === 'string' && nested.value.trim() ? nested.value.trim() : null
}

async function fetchOpenSeaCollectionAssets(
  address: WalletAddress,
  collection: MuseumCollectionDefinition,
  apiKey: string,
  fetchImpl: typeof fetch,
) {
  const assets = new Map<string, MuseumAssetSummary>()
  let cursor: string | null = null
  for (let page = 0; page < 6; page += 1) {
    const url = new URL(`https://api.opensea.io/api/v2/chain/${collection.chainSlug}/account/${address}/nfts`)
    url.searchParams.set('collection', collection.collectionSlug ?? '')
    url.searchParams.set('limit', '200')
    if (cursor) url.searchParams.set('next', cursor)
    const response = await fetchWithTimeout(fetchImpl, url.toString(), {
      headers: { Accept: 'application/json', 'x-api-key': apiKey },
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(response.status === 429 ? 'OpenSea is busy. Please try again shortly.' : `OpenSea returned ${response.status}`)
    const payload = await response.json() as Record<string, unknown>
    const nfts = Array.isArray(payload.nfts) ? payload.nfts : []
    for (const nft of nfts) {
      const asset = openSeaAssetFromNft(collection, nft)
      if (asset) assets.set(asset.key, asset)
    }
    cursor = nextCursor(payload)
    if (!cursor) break
  }
  return [...assets.values()]
}

function decodeAbiString(value: unknown) {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]+$/.test(value)) return null
  try {
    const hex = value.slice(2)
    const offset = Number(BigInt(`0x${hex.slice(0, 64)}`)) * 2
    const length = Number(BigInt(`0x${hex.slice(offset, offset + 64)}`))
    if (!Number.isSafeInteger(length) || length <= 0 || length > 8_192) return null
    const content = hex.slice(offset + 64, offset + 64 + length * 2)
    if (content.length !== length * 2) return null
    return readString(Buffer.from(content, 'hex').toString('utf8'), 8_192)
  } catch {
    return null
  }
}

async function fetchTokenUri(
  collection: MuseumCollectionDefinition,
  tokenId: string,
  fetchImpl: typeof fetch,
) {
  const result = await rpcCall(collection, 'eth_call', [{
    to: collection.contract,
    data: `0x${TOKEN_URI_SELECTOR}${paddedTokenId(tokenId)}`,
  }, 'latest'], fetchImpl)
  const tokenUri = decodeAbiString(result)
  if (!tokenUri) throw new Error(`${collection.title} returned unreadable token metadata.`)
  return tokenUri
}

function tokenUriTemplate(firstUri: string, firstTokenId: string) {
  for (const suffix of [firstTokenId, `${firstTokenId}.json`]) {
    if (!firstUri.endsWith(suffix)) continue
    const extension = suffix.endsWith('.json') ? '.json' : ''
    const prefix = firstUri.slice(0, -suffix.length)
    return (tokenId: string) => `${prefix}${tokenId}${extension}`
  }
  return null
}

async function fetchExplorerOwnedTokenIds(
  address: WalletAddress,
  collection: MuseumCollectionDefinition,
  fetchImpl: typeof fetch,
) {
  if (!collection.explorerApiUrl || collection.standard !== 'erc721') {
    throw new Error(`${collection.title} requires the configured collection index.`)
  }
  const tokenIds = new Set<string>()
  let nextPage: Record<string, unknown> | null = null
  for (let page = 0; page < EXPLORER_PAGE_LIMIT && tokenIds.size < EXPLORER_ASSET_LIMIT; page += 1) {
    const url = new URL(`${collection.explorerApiUrl}/tokens/${collection.contract}/instances`)
    url.searchParams.set('holder_address_hash', address)
    if (nextPage) {
      for (const key of ['unique_token', 'items_count']) {
        const value = nextPage[key]
        if (typeof value === 'string' || typeof value === 'number') url.searchParams.set(key, String(value))
      }
    }
    const response = await fetchWithTimeout(fetchImpl, url.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`The public Base collection index returned ${response.status}.`)
    const payload = asRecord(await response.json())
    if (!payload || !Array.isArray(payload.items)) throw new Error('The public Base collection index returned an unreadable response.')
    for (const value of payload.items) {
      const item = asRecord(value)
      const owner = hexAddress(asRecord(item?.owner)?.hash)
      const rawTokenId = typeof item?.id === 'number' ? String(item.id) : readString(item?.id, 78)
      if (owner !== address || !rawTokenId || !isSafeTokenId(rawTokenId)) continue
      const tokenId = canonicalTokenId(rawTokenId)
      if (collection.tokenRange && (BigInt(tokenId) < BigInt(collection.tokenRange[0]) || BigInt(tokenId) > BigInt(collection.tokenRange[1]))) continue
      tokenIds.add(tokenId)
      if (tokenIds.size >= EXPLORER_ASSET_LIMIT) break
    }
    nextPage = asRecord(payload.next_page_params)
    if (!nextPage) break
  }
  return [...tokenIds]
}

function museumAssetFromMetadata(
  collection: MuseumCollectionDefinition,
  tokenId: string,
  value: unknown,
): MuseumAssetSummary | null {
  const metadata = asRecord(value)
  if (!metadata) return null
  const identity = identityFor(collection, tokenId)
  const imageUrl = safeMediaUrl(metadata.image) ?? safeMediaUrl(metadata.image_url)
  if (!imageUrl) return null
  const explicitAnimationUrl = safeMediaUrl(metadata.animation_url)
  return {
    ...identity,
    key: museumAssetKey(identity),
    category: collection.category,
    title: readString(metadata.name, 256) ?? `${collection.title} #${tokenId}`,
    collection: collection.title,
    imageUrl,
    animationUrl: authenticMuseumAnimationUrl(collection, tokenId, imageUrl, explicitAnimationUrl),
    attributes: readAttributes(metadata.attributes ?? metadata.traits),
  }
}

function productImageFromJsonLd(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const imageUrl = productImageFromJsonLd(item)
      if (imageUrl) return imageUrl
    }
    return null
  }

  const record = asRecord(value)
  if (!record) return null
  const rawType = record['@type']
  const types = Array.isArray(rawType) ? rawType : [rawType]
  if (types.includes('Product')) {
    const images = Array.isArray(record.image) ? record.image : [record.image]
    for (const image of images) {
      const imageUrl = safeMediaUrl(image)
      if (imageUrl) return imageUrl
    }
  }
  return productImageFromJsonLd(record['@graph'])
}

async function fetchOpenSeaCachedMedia(
  collection: MuseumCollectionDefinition,
  tokenId: string,
  fetchImpl: typeof fetch,
) {
  const itemUrl = `https://opensea.io/item/${collection.chainSlug}/${collection.contract}/${tokenId}`
  const response = await fetchWithTimeout(fetchImpl, itemUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'MuseumOfBasedArt/1.0 (+read-only collection preview)',
    },
    cache: 'no-store',
  })
  if (!response.ok) return null
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_PUBLIC_ITEM_HTML_LENGTH) return null
  const html = await response.text()
  if (html.length > MAX_PUBLIC_ITEM_HTML_LENGTH) return null
  const jsonLdPattern = /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  for (const match of html.matchAll(jsonLdPattern)) {
    try {
      const imageUrl = productImageFromJsonLd(JSON.parse(match[1]))
      if (imageUrl) return imageUrl
    } catch {
      // Ignore unrelated or malformed structured-data blocks.
    }
  }
  return null
}

async function fetchPublicErc721CollectionAssets(
  address: WalletAddress,
  collection: MuseumCollectionDefinition,
  fetchImpl: typeof fetch,
) {
  const tokenIds = await fetchExplorerOwnedTokenIds(address, collection, fetchImpl)
  if (!tokenIds.length) return []
  const firstTokenUri = await fetchTokenUri(collection, tokenIds[0], fetchImpl)
  const buildTokenUri = tokenUriTemplate(firstTokenUri, tokenIds[0])
  const assets: MuseumAssetSummary[] = []

  for (let index = 0; index < tokenIds.length; index += METADATA_BATCH_SIZE) {
    const batch = tokenIds.slice(index, index + METADATA_BATCH_SIZE)
    const results = await Promise.all(batch.map(async (tokenId) => {
      try {
        const tokenUri = buildTokenUri ? buildTokenUri(tokenId) : await fetchTokenUri(collection, tokenId, fetchImpl)
        const [metadata, cachedMediaUrl] = await Promise.all([
          fetchTokenMetadata(tokenUri, fetchImpl),
          fetchOpenSeaCachedMedia(collection, tokenId, fetchImpl).catch(() => null),
        ])
        const asset = museumAssetFromMetadata(collection, tokenId, metadata)
        if (!asset || !cachedMediaUrl) return asset
        return {
          ...asset,
          imageUrl: cachedMediaUrl,
          animationUrl: authenticMuseumAnimationUrl(collection, tokenId, cachedMediaUrl, cachedMediaUrl),
        }
      } catch {
        return null
      }
    }))
    assets.push(...results.filter((asset): asset is MuseumAssetSummary => asset !== null))
  }

  if (!assets.length) throw new Error(`${collection.title} metadata could not be reached.`)
  return assets
}

function transferTokenId(value: unknown) {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]+$/.test(value)) return null
  try {
    return BigInt(value).toString()
  } catch {
    return null
  }
}

function transferAddress(value: unknown) {
  return hexAddress(value)
}

function logOrder(value: unknown) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value) ? Number(BigInt(value)) : 0
}

function ownedGlowbudTokenIds(logs: readonly unknown[], address: WalletAddress, range: readonly [number, number]) {
  const owned = new Set<string>()
  const normalizedLogs = logs
    .map(asRecord)
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .filter((entry) => entry.removed !== true && Array.isArray(entry.topics))
    .sort((left, right) => logOrder(left.blockNumber) - logOrder(right.blockNumber) || logOrder(left.logIndex) - logOrder(right.logIndex))
  for (const log of normalizedLogs) {
    const topics = log.topics as unknown[]
    if (String(topics[0]).toLowerCase() !== TRANSFER_TOPIC || topics.length < 4) continue
    const tokenId = transferTokenId(topics[3])
    if (!tokenId || BigInt(tokenId) < BigInt(range[0]) || BigInt(tokenId) > BigInt(range[1])) continue
    if (transferAddress(topics[2]) === address) owned.add(tokenId)
    if (transferAddress(topics[1]) === address) owned.delete(tokenId)
  }
  return [...owned].sort((left, right) => Number(left) - Number(right))
}

async function fetchGlowbudAssets(address: WalletAddress, collection: MuseumCollectionDefinition, fetchImpl: typeof fetch) {
  if (!collection.tokenRange) return []
  const addressTopic = `0x${paddedAddress(address)}`
  const result = await rpcCall(collection, 'eth_getLogs', [{
    fromBlock: '0x0',
    toBlock: 'latest',
    address: collection.contract,
    topics: [TRANSFER_TOPIC, null, addressTopic],
  }], fetchImpl)
  const sent = await rpcCall(collection, 'eth_getLogs', [{
    fromBlock: '0x0',
    toBlock: 'latest',
    address: collection.contract,
    topics: [TRANSFER_TOPIC, addressTopic],
  }], fetchImpl)
  const tokenIds = ownedGlowbudTokenIds(
    [...(Array.isArray(result) ? result : []), ...(Array.isArray(sent) ? sent : [])],
    address,
    collection.tokenRange,
  )
  return tokenIds.map((tokenId) => {
    const identity = identityFor(collection, tokenId)
    return {
      ...identity,
      key: museumAssetKey(identity),
      category: 'resident' as const,
      title: `Glowbud #${tokenId}`,
      collection: collection.title,
      imageUrl: glowbudImageUrl(tokenId),
      animationUrl: null,
      attributes: glowbudAttributesForToken(tokenId),
    }
  })
}

export async function discoverMuseumAssets(
  rawAddress: string,
  dependencies: MuseumOwnershipDependencies = {},
) {
  const address = normalizeWalletAddress(rawAddress)
  if (!address) throw new Error('Enter a complete 0x wallet address.')
  const fetchImpl = dependencies.fetchImpl ?? fetch
  const apiKey = dependencies.openSeaApiKey?.trim() ?? ''
  const assets: MuseumAssetSummary[] = []
  const collectionErrors: Array<{ collectionId: string; message: string }> = []

  await Promise.all(MUSEUM_COLLECTIONS.map(async (collection) => {
    try {
      if (collection.category === 'resident') {
        assets.push(...await fetchGlowbudAssets(address, collection, fetchImpl))
      } else {
        let openSeaError: unknown = null
        if (apiKey) {
          try {
            assets.push(...await fetchOpenSeaCollectionAssets(address, collection, apiKey, fetchImpl))
            return
          } catch (error) {
            openSeaError = error
          }
        }
        const supportsPublicFallback = collection.id === 'moba-one' || collection.id === 'moba-two'
        if (supportsPublicFallback && collection.standard === 'erc721' && collection.explorerApiUrl) {
          assets.push(...await fetchPublicErc721CollectionAssets(address, collection, fetchImpl))
        } else if (openSeaError) {
          throw openSeaError
        } else {
          collectionErrors.push({ collectionId: collection.id, message: 'Artwork discovery is not configured on this preview.' })
        }
      }
    } catch (error) {
      collectionErrors.push({
        collectionId: collection.id,
        message: error instanceof Error ? error.message : `${collection.title} could not be reached.`,
      })
    }
  }))

  const unique = new Map(assets.map((asset) => [asset.key, asset]))
  return {
    address,
    assets: [...unique.values()].sort((left, right) => left.collection.localeCompare(right.collection) || left.title.localeCompare(right.title)),
    collectionErrors,
    verifiedAt: (dependencies.now?.() ?? new Date()).toISOString(),
  }
}

export function validateAtriumDraft(draft: AtriumInstallationDraft) {
  const address = normalizeWalletAddress(draft.address)
  if (!address) return { valid: false as const, error: 'Invalid wallet address.' }
  if (!draft.glowbuds.every((identity) => {
    try {
      return /^\d+$/.test(identity.tokenId) && Boolean(museumCollectionForIdentity(identity))
    } catch {
      return false
    }
  }) || !draft.artworks.every((identity) => {
    try {
      return /^\d+$/.test(identity.tokenId) && Boolean(museumCollectionForIdentity(identity))
    } catch {
      return false
    }
  })) return { valid: false as const, error: 'One selected asset is not valid.' }
  const glowbuds = draft.glowbuds.map(normalizeMuseumAssetIdentity)
  const artworks = draft.artworks.map(normalizeMuseumAssetIdentity)
  if (glowbuds.length > MAX_ATRIUM_GLOWBUDS || artworks.length > MAX_ATRIUM_ARTWORKS) {
    return { valid: false as const, error: 'This atrium has reached its display limit.' }
  }
  const identities = [...glowbuds, ...artworks]
  if (new Set(identities.map(museumAssetKey)).size !== identities.length) {
    return { valid: false as const, error: 'Choose each asset only once.' }
  }
  for (const identity of glowbuds) {
    const collection = museumCollectionForIdentity(identity)
    if (!collection || collection.category !== 'resident') return { valid: false as const, error: 'One garden resident is not supported by the atrium.' }
  }
  for (const identity of artworks) {
    const collection = museumCollectionForIdentity(identity)
    if (!collection || (collection.category !== 'artwork' && collection.category !== 'photography')) {
      return { valid: false as const, error: 'One wall artwork is not supported by the atrium.' }
    }
  }
  return {
    valid: true as const,
    draft: { ...draft, address, glowbuds, artworks },
  }
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
) {
  const results = new Array<R>(values.length)
  let cursor = 0
  async function worker() {
    while (cursor < values.length) {
      const index = cursor
      cursor += 1
      results[index] = await mapper(values[index]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()))
  return results
}

export async function verifyAtriumInstallation(
  draft: AtriumInstallationDraft,
  dependencies: MuseumOwnershipDependencies = {},
) {
  const validated = validateAtriumDraft(draft)
  if (!validated.valid) return { verified: false as const, installation: null, missing: [], unavailable: [], error: validated.error }
  const fetchImpl = dependencies.fetchImpl ?? fetch
  const selected = [...validated.draft.glowbuds, ...validated.draft.artworks]
  let checks: Array<{ identity: MuseumAssetIdentity; status: 'owned' | 'missing' | 'unavailable' }>
  if (!dependencies.fetchImpl) {
    // Reuse the holder-aware Base index for ERC-721 ownership. It verifies a full
    // collection in one request and avoids the public RPC's five-call throttle.
    const byCollection = new Map<string, MuseumAssetIdentity[]>()
    for (const identity of selected) {
      const collection = museumCollectionForIdentity(identity)
      if (!collection) continue
      const group = byCollection.get(collection.id) ?? []
      group.push(identity)
      byCollection.set(collection.id, group)
    }
    checks = []
    for (const identities of byCollection.values()) {
      const collection = museumCollectionForIdentity(identities[0]!)!
      if (collection.explorerApiUrl && collection.standard === 'erc721') {
        try {
          const ownedIds = new Set(await fetchExplorerOwnedTokenIds(validated.draft.address, collection, fetchImpl))
          checks.push(...identities.map((identity) => ({
            identity,
            status: ownedIds.has(identity.tokenId) ? 'owned' as const : 'missing' as const,
          })))
        } catch {
          checks.push(...identities.map((identity) => ({ identity, status: 'unavailable' as const })))
        }
        continue
      }
      const paced = await mapWithConcurrency(identities, 1, async (identity) => {
        try {
          const owned = await ownsToken(validated.draft.address, collection, identity.tokenId, fetchImpl)
          await new Promise((resolve) => setTimeout(resolve, 230))
          return { identity, status: owned ? 'owned' as const : 'missing' as const }
        } catch {
          return { identity, status: 'unavailable' as const }
        }
      })
      checks.push(...paced)
    }
  } else {
    checks = await mapWithConcurrency(selected, 3, async (identity) => {
      const collection = museumCollectionForIdentity(identity)
      if (!collection) return { identity, status: 'missing' as const }
      try {
        return {
          identity,
          status: await ownsToken(validated.draft.address, collection, identity.tokenId, fetchImpl)
            ? 'owned' as const
            : 'missing' as const,
        }
      } catch {
        return { identity, status: 'unavailable' as const }
      }
    })
  }
  const missing = checks.filter((check) => check.status === 'missing').map((check) => check.identity)
  const unavailable = checks.filter((check) => check.status === 'unavailable').map((check) => check.identity)
  const ownedKeys = new Set(checks.filter((check) => check.status === 'owned').map((check) => museumAssetKey(check.identity)))
  const glowbuds = validated.draft.glowbuds.filter((identity) => ownedKeys.has(museumAssetKey(identity)))
  const artworks = validated.draft.artworks.filter((identity) => ownedKeys.has(museumAssetKey(identity)))
  return {
    verified: true as const,
    installation: {
      ...validated.draft,
      glowbuds,
      artworks,
      verifiedAt: (dependencies.now?.() ?? new Date()).toISOString(),
      layoutVersion: 1 as const,
    },
    missing,
    unavailable,
  }
}

export function isSupportedContractAddress(value: string) {
  return ADDRESS_PATTERN.test(value) && MUSEUM_COLLECTIONS.some((collection) => collection.contract === value.toLowerCase())
}
