export type OwnedNft = {
  tokenKey: string
  chain: 'ethereum'
  contract: string
  identifier: string
  tokenStandard: string
  title: string
  collection: string
  thumbnailUrl: string | null
  imageUrl: string | null
  animationUrl?: string | null
  animationKind?: OwnedNftAnimationKind
  openseaUrl: string
  description?: string
}

export type OwnedNftsPage = {
  nfts: OwnedNft[]
  nextCursor: string | null
}

const ETHEREUM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/
const MAX_IDENTIFIER_LENGTH = 256
const MAX_CURSOR_LENGTH = 4096
const MAX_MEDIA_URL_LENGTH = 8192

export type OwnedNftAnimationKind = 'image' | 'video' | 'unknown'

export type OwnedNftMediaVariant = 'thumb' | 'room' | 'motion'

export const OWNED_NFT_MEDIA_CACHE_VERSION = '5'

export function isEthereumAddress(value: string): boolean {
  return ETHEREUM_ADDRESS_PATTERN.test(value)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readString(value: unknown, maximumLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maximumLength || /[\u0000-\u001f\u007f]/.test(trimmed)) return null
  return trimmed
}

function readIdentifier(value: unknown): string | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value)
  return readString(value, MAX_IDENTIFIER_LENGTH)
}

function readSafetyFlag(value: unknown): boolean | null {
  if (value === true || value === 1) return true
  if (value === false || value === 0) return false
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false
  return null
}

function normalizeHttpsUrl(value: unknown): string | null {
  const raw = readString(value, MAX_MEDIA_URL_LENGTH)
  if (!raw) return null

  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

export function normalizeOwnedNftMediaSource(value: unknown): string | null {
  const normalized = normalizeHttpsUrl(value)
  if (!normalized) return null

  const hostname = new URL(normalized).hostname.toLowerCase()
  const trusted = hostname === 'seadn.io'
    || hostname.endsWith('.seadn.io')
    || hostname === 'openseauserdata.com'
    || hostname.endsWith('.openseauserdata.com')
    || hostname === 'ipfs.io'
    || hostname === 'arweave.net'
    || hostname === 'gateway.pinata.cloud'
    || hostname === 'nftstorage.link'
    || hostname.endsWith('.ipfs.nftstorage.link')
    || hostname === 'ipfs.filebase.io'

  return trusted ? normalized : null
}

export function ownedNftMediaProxyUrl(
  mediaUrl: string,
  variant: OwnedNftMediaVariant = 'thumb',
): string {
  const params = new URLSearchParams({
    url: mediaUrl,
    variant,
    v: OWNED_NFT_MEDIA_CACHE_VERSION,
  })
  return `/api/opensea/media?${params.toString()}`
}

function normalizeContentAddressedUrl(value: unknown): string | null {
  const raw = readString(value, MAX_MEDIA_URL_LENGTH)
  if (!raw) return null

  const lowered = raw.toLowerCase()
  const protocol = lowered.startsWith('ipfs://') ? 'ipfs' : lowered.startsWith('ar://') ? 'ar' : null
  if (!protocol) return null

  let resource = raw.slice(protocol === 'ipfs' ? 7 : 5)
  if (protocol === 'ipfs' && resource.toLowerCase().startsWith('ipfs/')) resource = resource.slice(5)
  resource = resource.split(/[?#]/, 1)[0] ?? ''

  const segments = resource.split('/').filter(Boolean)
  if (!segments.length || segments.some((segment) => segment === '.' || segment === '..')) return null
  const safePath = segments.map((segment) => encodeURIComponent(segment)).join('/')

  return protocol === 'ipfs'
    ? `https://ipfs.io/ipfs/${safePath}`
    : `https://arweave.net/${safePath}`
}

function normalizeStillImageCandidate(value: unknown): string | null {
  return normalizeOwnedNftMediaSource(value) ?? normalizeContentAddressedUrl(value)
}

function chooseStillImage(candidates: readonly unknown[]): string | null {
  for (const candidate of candidates) {
    const normalized = normalizeStillImageCandidate(candidate)
    if (normalized) return normalized
  }
  return null
}

function inferAnimationKind(mediaUrl: string): OwnedNftAnimationKind {
  const pathname = new URL(mediaUrl).pathname.toLowerCase()
  if (/\.(?:gif|webp|apng|png|avif)$/.test(pathname)) return 'image'
  if (/\.(?:mp4|webm)$/.test(pathname)) return 'video'
  return 'unknown'
}

function isExplicitlyUnsupportedAnimation(mediaUrl: string): boolean {
  const pathname = new URL(mediaUrl).pathname.toLowerCase()
  return /\.(?:html?|svg|gltf|glb|mp3|wav|ogg|m4a|aac|flac|mov|mkv|avi|json|js)$/.test(pathname)
}

function chooseAnimation(candidates: readonly unknown[]): {
  url: string
  kind: OwnedNftAnimationKind
} | null {
  for (const candidate of candidates) {
    const normalized = normalizeStillImageCandidate(candidate)
    if (normalized && !isExplicitlyUnsupportedAnimation(normalized)) {
      return { url: normalized, kind: inferAnimationKind(normalized) }
    }
  }
  return null
}

function inferAnimatedStill(imageUrl: string | null): {
  url: string
  kind: 'image'
} | null {
  if (!imageUrl) return null
  const pathname = new URL(imageUrl).pathname.toLowerCase()
  return /\.(?:gif|apng)$/.test(pathname) ? { url: imageUrl, kind: 'image' } : null
}

function normalizeOpenSeaUrl(value: unknown, contract: string, identifier: string): string {
  const normalized = normalizeHttpsUrl(value)
  if (normalized) {
    const hostname = new URL(normalized).hostname.toLowerCase()
    if (hostname === 'opensea.io' || hostname.endsWith('.opensea.io')) return normalized
  }

  return `https://opensea.io/assets/ethereum/${contract}/${encodeURIComponent(identifier)}`
}

export function normalizeOpenSeaOwnedNft(value: unknown): OwnedNft | null {
  const record = asRecord(value)
  if (!record) return null

  const disabled = readSafetyFlag(record.is_disabled)
  const nsfw = readSafetyFlag(record.is_nsfw)
  if (disabled === null || nsfw === null || disabled || nsfw) return null

  const reportedChain = readString(record.chain, 32)
  if (reportedChain && reportedChain.toLowerCase() !== 'ethereum') return null

  const rawContract = readString(record.contract, 64)
  const identifier = readIdentifier(record.identifier)
  if (!rawContract || !isEthereumAddress(rawContract) || !identifier) return null

  const contract = rawContract.toLowerCase()
  const title = readString(record.name, 512) ?? `Token #${identifier}`
  const collection = readString(record.collection, 256) ?? 'Uncategorized'
  const tokenStandard = readString(record.token_standard, 64) ?? 'unknown'
  const description = readString(record.description, 4000)
  const thumbnailUrl = chooseStillImage([
    record.display_image_url,
    record.image_url,
    record.original_image_url,
  ])
  const imageUrl = chooseStillImage([
    record.original_image_url,
    record.image_url,
    record.display_image_url,
  ])
  const animation = chooseAnimation([
    record.display_animation_url,
    record.original_animation_url,
  ]) ?? inferAnimatedStill(imageUrl)

  return {
    tokenKey: `ethereum:${contract}:${identifier}`,
    chain: 'ethereum',
    contract,
    identifier,
    tokenStandard,
    title,
    collection,
    thumbnailUrl,
    imageUrl,
    animationUrl: animation?.url ?? null,
    animationKind: animation?.kind ?? 'unknown',
    openseaUrl: normalizeOpenSeaUrl(record.opensea_url, contract, identifier),
    ...(description ? { description } : {}),
  }
}

export function normalizeOpenSeaOwnedNftsResponse(value: unknown): OwnedNftsPage {
  const record = asRecord(value)
  const candidates = Array.isArray(record?.nfts) ? record.nfts : []
  const uniqueNfts = new Map<string, OwnedNft>()

  for (const candidate of candidates) {
    const nft = normalizeOpenSeaOwnedNft(candidate)
    if (nft && !uniqueNfts.has(nft.tokenKey)) uniqueNfts.set(nft.tokenKey, nft)
  }

  const nextCursor = readString(record?.next, MAX_CURSOR_LENGTH)
  return {
    nfts: [...uniqueNfts.values()],
    nextCursor,
  }
}
