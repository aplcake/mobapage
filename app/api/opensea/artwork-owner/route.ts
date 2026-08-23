import { MUSEUM_COLLECTIONS } from '../../../../src/museum/collection-registry/museumCollections'
import { isEthereumAddress } from '../../../../src/museum/formal-room/ownedNfts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OWNER_OF_SELECTOR = '6352211e'
const REQUEST_TIMEOUT_MS = 10_000
const SERVER_CACHE_TTL_MS = 5 * 60_000
const SERVER_CACHE_MAX_ENTRIES = 300
const CLIENT_WINDOW_MS = 60_000
const CLIENT_REQUEST_LIMIT = 30
const PUBLIC_JSON_HEADERS = {
  'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

type OwnerIdentity = {
  address: `0x${string}`
  username: string | null
  ensName: string | null
}

type OwnerResponse = {
  owner: OwnerIdentity
  ownerCount: number
  hasMoreOwners: boolean
}

type CacheEntry = {
  expiresAt: number
  value: OwnerResponse
}

type RequestWindow = {
  count: number
  startedAt: number
}

const responseCache = new Map<string, CacheEntry>()
const requestWindows = new Map<string, RequestWindow>()

function jsonResponse(value: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...PUBLIC_JSON_HEADERS, ...headers },
  })
}

function errorResponse(code: string, message: string, status: number) {
  return jsonResponse({ error: { code, message } }, status, { 'Cache-Control': 'private, no-store' })
}

function readClientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'local-client'
}

function consumeClientRequest(request: Request) {
  const now = Date.now()
  if (requestWindows.size > 500) {
    for (const [key, window] of requestWindows) {
      if (now - window.startedAt >= CLIENT_WINDOW_MS) requestWindows.delete(key)
    }
  }
  const clientKey = readClientKey(request)
  const current = requestWindows.get(clientKey)
  if (!current || now - current.startedAt >= CLIENT_WINDOW_MS) {
    requestWindows.set(clientKey, { count: 1, startedAt: now })
    return true
  }
  if (current.count >= CLIENT_REQUEST_LIMIT) return false
  current.count += 1
  return true
}

function readString(value: unknown, maximumLength = 256) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed && trimmed.length <= maximumLength && !/[\u0000-\u001f\u007f]/.test(trimmed)
    ? trimmed
    : null
}

function canonicalTokenId(value: string) {
  if (!/^\d{1,78}$/.test(value)) return null
  try {
    return BigInt(value).toString()
  } catch {
    return null
  }
}

function paddedTokenId(tokenId: string) {
  return BigInt(tokenId).toString(16).padStart(64, '0')
}

async function fetchWithTimeout(input: string, init: RequestInit) {
  return fetch(input, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
}

async function fetchErc721Owner(
  collection: (typeof MUSEUM_COLLECTIONS)[number],
  tokenId: string,
) {
  const response = await fetchWithTimeout(collection.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `museum-owner-${collection.id}-${tokenId}`,
      method: 'eth_call',
      params: [{
        to: collection.contract,
        data: `0x${OWNER_OF_SELECTOR}${paddedTokenId(tokenId)}`,
      }, 'latest'],
    }),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('owner_unavailable')
  const payload = await response.json() as { result?: unknown; error?: unknown }
  if (typeof payload.result !== 'string' || payload.error) throw new Error('owner_unavailable')
  const address = `0x${payload.result.slice(-40)}`.toLowerCase()
  if (!isEthereumAddress(address) || /^0x0{40}$/.test(address)) throw new Error('owner_unavailable')
  return address as `0x${string}`
}

function readOpenSeaOwners(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (!Array.isArray(record.owners)) return null
  const addresses = record.owners.flatMap((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    const address = readString((value as Record<string, unknown>).address, 42)?.toLowerCase() ?? ''
    return isEthereumAddress(address) && !/^0x0{40}$/.test(address)
      ? [address as `0x${string}`]
      : []
  })
  if (!addresses.length) return null
  return {
    addresses: [...new Set(addresses)],
    hasMoreOwners: Boolean(readString(record.next, 4_096)),
  }
}

async function fetchOpenSeaOwners(
  collection: (typeof MUSEUM_COLLECTIONS)[number],
  tokenId: string,
  apiKey: string,
) {
  const url = new URL(
    `https://api.opensea.io/api/v2/chain/${collection.chainSlug}/contract/${collection.contract}/nfts/${encodeURIComponent(tokenId)}/owners`,
  )
  url.searchParams.set('limit', '50')
  const response = await fetchWithTimeout(url.toString(), {
    headers: { Accept: 'application/json', 'x-api-key': apiKey },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('owner_unavailable')
  const owners = readOpenSeaOwners(await response.json())
  if (!owners) throw new Error('owner_unavailable')
  return owners
}

function readResolvedAccount(value: unknown, fallbackAddress: `0x${string}`): OwnerIdentity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { address: fallbackAddress, username: null, ensName: null }
  }
  const record = value as Record<string, unknown>
  const nested = record.account && typeof record.account === 'object' && !Array.isArray(record.account)
    ? record.account as Record<string, unknown>
    : null
  const address = (readString(record.address, 42) ?? readString(nested?.address, 42) ?? fallbackAddress).toLowerCase()
  return {
    address: isEthereumAddress(address) ? address as `0x${string}` : fallbackAddress,
    username: readString(record.username) ?? readString(nested?.username),
    ensName: readString(record.ens_name) ?? readString(record.ensName) ?? readString(nested?.ens_name),
  }
}

async function resolveOpenSeaAccount(address: `0x${string}`, apiKey: string) {
  try {
    const response = await fetchWithTimeout(
      `https://api.opensea.io/api/v2/accounts/resolve/${encodeURIComponent(address)}`,
      {
        headers: { Accept: 'application/json', 'x-api-key': apiKey },
        cache: 'no-store',
      },
    )
    if (!response.ok) return { address, username: null, ensName: null }
    return readResolvedAccount(await response.json(), address)
  } catch {
    return { address, username: null, ensName: null }
  }
}

function readCached(cacheKey: string) {
  const cached = responseCache.get(cacheKey)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    responseCache.delete(cacheKey)
    return null
  }
  return cached.value
}

function cacheResponse(cacheKey: string, value: OwnerResponse) {
  if (responseCache.size >= SERVER_CACHE_MAX_ENTRIES) {
    const oldestKey = responseCache.keys().next().value
    if (typeof oldestKey === 'string') responseCache.delete(oldestKey)
  }
  responseCache.set(cacheKey, { value, expiresAt: Date.now() + SERVER_CACHE_TTL_MS })
}

export async function GET(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return errorResponse('forbidden', 'Cross-site artwork records are not allowed.', 403)
  }

  const url = new URL(request.url)
  const chain = url.searchParams.get('chain')?.trim().toLowerCase() ?? ''
  const contract = url.searchParams.get('contract')?.trim().toLowerCase() ?? ''
  const tokenId = canonicalTokenId(url.searchParams.get('tokenId')?.trim() ?? '')
  const collection = MUSEUM_COLLECTIONS.find((candidate) => (
    candidate.category !== 'resident'
    && candidate.chainSlug === chain
    && candidate.contract === contract
  ))

  if (!collection || !tokenId || (collection.tokenRange && (
    BigInt(tokenId) < BigInt(collection.tokenRange[0])
    || BigInt(tokenId) > BigInt(collection.tokenRange[1])
  ))) {
    return errorResponse('invalid_artwork', 'That work is not in the museum register.', 400)
  }

  const cacheKey = `${collection.chainSlug}:${collection.contract}:${tokenId}`
  const cached = readCached(cacheKey)
  if (cached) return jsonResponse(cached)
  if (!consumeClientRequest(request)) {
    return errorResponse('rate_limited', 'The museum register is busy. Please try again shortly.', 429)
  }

  const apiKey = process.env.OPENSEA_API_KEY?.trim() ?? ''
  try {
    const ownerResult = collection.standard === 'erc721'
      ? { addresses: [await fetchErc721Owner(collection, tokenId)], hasMoreOwners: false }
      : apiKey
        ? await fetchOpenSeaOwners(collection, tokenId, apiKey)
        : null

    if (!ownerResult) {
      return errorResponse('not_configured', 'This owner record is not available yet.', 503)
    }

    const owner = apiKey
      ? await resolveOpenSeaAccount(ownerResult.addresses[0], apiKey)
      : { address: ownerResult.addresses[0], username: null, ensName: null }
    const value: OwnerResponse = {
      owner,
      ownerCount: ownerResult.addresses.length,
      hasMoreOwners: ownerResult.hasMoreOwners,
    }
    cacheResponse(cacheKey, value)
    return jsonResponse(value)
  } catch {
    return errorResponse('owner_unavailable', 'The owner record could not be reached right now.', 502)
  }
}
