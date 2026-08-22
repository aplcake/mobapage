import type { IncomingMessage, ServerResponse } from 'node:http'

export type GlowbudOpenSeaOwner = {
  address: string
  username: string | null
  profileUrl: string
}

type OpenSeaProfile = {
  address?: unknown
  displayName?: unknown
  username?: unknown
  wallet_address?: unknown
}

type CachedOwner = {
  expiresAt: number
  owner: GlowbudOpenSeaOwner | null
}

type OwnerLookupOptions = {
  apiKey?: string
  chain: string
  contract: string
  fetchImpl?: typeof fetch
}

const OWNER_CACHE_TTL_MS = 5 * 60 * 1000
const OWNER_MISS_CACHE_TTL_MS = 30 * 1000
const REQUEST_TIMEOUT_MS = 12_000

function cleanString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normaliseProfile(profile: OpenSeaProfile | null | undefined): GlowbudOpenSeaOwner | null {
  if (!profile) return null

  const address = cleanString(profile.address) ?? cleanString(profile.wallet_address)
  if (!address) return null

  const username = cleanString(profile.username) ?? cleanString(profile.displayName)
  return {
    address,
    username,
    // Wallet URLs remain stable even when an OpenSea display name changes.
    profileUrl: `https://opensea.io/${address}`,
  }
}

function findMatchingItem(
  value: unknown,
  tokenId: string,
  contract: string,
): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null

  if (Array.isArray(value)) {
    for (const entry of value) {
      const match = findMatchingItem(entry, tokenId, contract)
      if (match) return match
    }
    return null
  }

  const record = value as Record<string, unknown>
  const recordTokenId = cleanString(record.tokenId)
  const recordContract = cleanString(record.contractAddress)?.toLowerCase()
  if (
    recordTokenId === tokenId
    && recordContract === contract.toLowerCase()
    && record.owner
  ) {
    return record
  }

  for (const entry of Object.values(record)) {
    const match = findMatchingItem(entry, tokenId, contract)
    if (match) return match
  }
  return null
}

export function parseOpenSeaOwnerFromHtml(
  html: string,
  tokenId: number,
  contract: string,
): GlowbudOpenSeaOwner | null {
  const transportMarker = 'Symbol.for("urql_transport")'
  let cursor = 0

  while (cursor < html.length) {
    const markerIndex = html.indexOf(transportMarker, cursor)
    if (markerIndex === -1) break

    const pushIndex = html.indexOf('.push(', markerIndex)
    const scriptEnd = html.indexOf('</script>', pushIndex)
    if (pushIndex === -1 || scriptEnd === -1) break

    const payloadEnd = html.lastIndexOf(')', scriptEnd)
    if (payloadEnd > pushIndex) {
      try {
        const payload = JSON.parse(html.slice(pushIndex + '.push('.length, payloadEnd))
        const item = findMatchingItem(payload, String(tokenId), contract)
        const owner = normaliseProfile(item?.owner as OpenSeaProfile | undefined)
        if (owner) return owner
      } catch {
        // OpenSea can ship unrelated script payloads alongside the item payload.
      }
    }

    cursor = scriptEnd + '</script>'.length
  }

  return null
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  input: string,
  init: RequestInit = {},
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchOwnerFromApi(
  tokenId: number,
  options: Required<Pick<OwnerLookupOptions, 'apiKey' | 'chain' | 'contract' | 'fetchImpl'>>,
) {
  const nftUrl = `https://api.opensea.io/api/v2/chain/${options.chain}/contract/${options.contract}/nfts/${tokenId}`
  const nftResponse = await fetchWithTimeout(options.fetchImpl, nftUrl, {
    headers: { accept: 'application/json', 'x-api-key': options.apiKey },
  })
  if (!nftResponse.ok) return null

  const nft = await nftResponse.json() as {
    owner?: OpenSeaProfile
    owners?: Array<OpenSeaProfile & { quantity?: number | string }>
  }
  const directOwner = normaliseProfile(nft.owner)
  if (directOwner) return directOwner

  const ownerProfile = nft.owners?.find((owner) => Number(owner.quantity ?? 1) > 0)
  const ownerAddress = cleanString(ownerProfile?.address)
  if (!ownerAddress) return null

  const accountResponse = await fetchWithTimeout(
    options.fetchImpl,
    `https://api.opensea.io/api/v2/accounts/${ownerAddress}`,
    { headers: { accept: 'application/json', 'x-api-key': options.apiKey } },
  )
  if (!accountResponse.ok) return normaliseProfile(ownerProfile)

  const account = await accountResponse.json() as OpenSeaProfile
  return normaliseProfile({ ...ownerProfile, ...account, address: ownerAddress })
}

async function fetchOwnerFromItemPage(
  tokenId: number,
  options: Required<Pick<OwnerLookupOptions, 'chain' | 'contract' | 'fetchImpl'>>,
) {
  const itemUrl = `https://opensea.io/item/${options.chain}/${options.contract}/${tokenId}`
  const response = await fetchWithTimeout(options.fetchImpl, itemUrl, {
    headers: {
      accept: 'text/html',
      'user-agent': 'Glowbuds-3D-Trait-Studio/1.0',
    },
  })
  if (!response.ok) return null
  return parseOpenSeaOwnerFromHtml(await response.text(), tokenId, options.contract)
}

export async function fetchGlowbudOpenSeaOwner(
  tokenId: number,
  options: OwnerLookupOptions,
) {
  const fetchImpl = options.fetchImpl ?? fetch
  const apiKey = options.apiKey?.trim()

  if (apiKey) {
    try {
      const apiOwner = await fetchOwnerFromApi(tokenId, {
        apiKey,
        chain: options.chain,
        contract: options.contract,
        fetchImpl,
      })
      if (apiOwner) return apiOwner
    } catch {
      // The public item page below keeps the collection room useful during API outages.
    }
  }

  return fetchOwnerFromItemPage(tokenId, {
    chain: options.chain,
    contract: options.contract,
    fetchImpl,
  })
}

export function createGlowbudOwnerMiddleware(options: OwnerLookupOptions) {
  const cache = new Map<number, CachedOwner>()

  return async function glowbudOwnerMiddleware(
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ) {
    const requestUrl = new URL(request.url ?? '/', 'http://localhost')
    const match = requestUrl.pathname.match(/^\/api\/glowbuds-owner\/(\d+)$/)
    if (!match) {
      next()
      return
    }

    const tokenId = Number(match[1])
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'private, max-age=60')

    if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 3333) {
      response.statusCode = 400
      response.end(JSON.stringify({ status: 'invalid-token' }))
      return
    }

    const cached = cache.get(tokenId)
    if (cached && cached.expiresAt > Date.now()) {
      response.statusCode = cached.owner ? 200 : 503
      response.end(JSON.stringify({
        status: cached.owner ? 'ready' : 'unavailable',
        owner: cached.owner,
      }))
      return
    }

    try {
      const owner = await fetchGlowbudOpenSeaOwner(tokenId, options)
      cache.set(tokenId, {
        owner,
        expiresAt: Date.now() + (owner ? OWNER_CACHE_TTL_MS : OWNER_MISS_CACHE_TTL_MS),
      })
      response.statusCode = owner ? 200 : 503
      response.end(JSON.stringify({
        status: owner ? 'ready' : 'unavailable',
        owner,
      }))
    } catch {
      cache.set(tokenId, {
        owner: null,
        expiresAt: Date.now() + OWNER_MISS_CACHE_TTL_MS,
      })
      response.statusCode = 503
      response.end(JSON.stringify({ status: 'unavailable', owner: null }))
    }
  }
}
