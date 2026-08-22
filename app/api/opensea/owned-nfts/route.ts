import {
  isEthereumAddress,
  normalizeOpenSeaOwnedNftsResponse,
} from '../../../../src/museum/formal-room/ownedNfts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OPENSEA_OWNED_NFTS_LIMIT = 50
const MAX_CURSOR_LENGTH = 4096
const SERVER_CACHE_TTL_MS = 60_000
const SERVER_CACHE_MAX_ENTRIES = 250
const CLIENT_WINDOW_MS = 60_000
const CLIENT_REQUEST_LIMIT = 20
const PRIVATE_JSON_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

type CacheEntry = {
  expiresAt: number
  page: ReturnType<typeof normalizeOpenSeaOwnedNftsResponse>
}

type RequestWindow = {
  count: number
  startedAt: number
}

const pageCache = new Map<string, CacheEntry>()
const requestWindows = new Map<string, RequestWindow>()

type ErrorCode =
  | 'invalid_address'
  | 'invalid_cursor'
  | 'forbidden'
  | 'not_configured'
  | 'rate_limited'
  | 'wallet_not_found'
  | 'opensea_unavailable'
  | 'invalid_opensea_response'

function jsonResponse(value: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...PRIVATE_JSON_HEADERS,
      ...headers,
    },
  })
}

function errorResponse(code: ErrorCode, message: string, status: number, retryAfterSeconds?: number) {
  return jsonResponse({
    error: {
      code,
      message,
      ...(typeof retryAfterSeconds === 'number' ? { retryAfterSeconds } : {}),
    },
  }, status, typeof retryAfterSeconds === 'number' ? { 'Retry-After': String(retryAfterSeconds) } : undefined)
}

function parseRetryAfter(value: string | null): number {
  if (value) {
    const seconds = Number(value)
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(3600, Math.ceil(seconds))

    const retryAt = Date.parse(value)
    if (Number.isFinite(retryAt)) {
      return Math.min(3600, Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)))
    }
  }
  return 60
}

function readCursor(url: URL): { cursor: string | null; valid: boolean } {
  const rawCursor = url.searchParams.get('cursor') ?? url.searchParams.get('next')
  if (rawCursor === null) return { cursor: null, valid: true }

  const cursor = rawCursor.trim()
  const valid = Boolean(cursor) && cursor.length <= MAX_CURSOR_LENGTH && !/[\u0000-\u001f\u007f]/.test(cursor)
  return { cursor: valid ? cursor : null, valid }
}

function readClientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'local-client'
}

function consumeClientRequest(request: Request): number | null {
  const now = Date.now()
  if (requestWindows.size > 500) {
    for (const [key, window] of requestWindows) {
      if (now - window.startedAt >= CLIENT_WINDOW_MS) requestWindows.delete(key)
    }
    while (requestWindows.size > 500) {
      const oldestKey = requestWindows.keys().next().value
      if (typeof oldestKey !== 'string') break
      requestWindows.delete(oldestKey)
    }
  }
  const clientKey = readClientKey(request)
  const current = requestWindows.get(clientKey)
  if (!current || now - current.startedAt >= CLIENT_WINDOW_MS) {
    requestWindows.set(clientKey, { count: 1, startedAt: now })
    return null
  }

  if (current.count >= CLIENT_REQUEST_LIMIT) {
    return Math.max(1, Math.ceil((CLIENT_WINDOW_MS - (now - current.startedAt)) / 1000))
  }

  current.count += 1
  return null
}

function readCachedPage(cacheKey: string) {
  const cached = pageCache.get(cacheKey)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    pageCache.delete(cacheKey)
    return null
  }
  return cached.page
}

function cachePage(cacheKey: string, page: CacheEntry['page']) {
  if (pageCache.size >= SERVER_CACHE_MAX_ENTRIES) {
    const oldestKey = pageCache.keys().next().value
    if (typeof oldestKey === 'string') pageCache.delete(oldestKey)
  }
  pageCache.set(cacheKey, { expiresAt: Date.now() + SERVER_CACHE_TTL_MS, page })
}

export async function GET(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return errorResponse('forbidden', 'Cross-site collection requests are not allowed.', 403)
  }

  const requestUrl = new URL(request.url)
  const address = requestUrl.searchParams.get('address')?.trim() ?? ''
  if (!isEthereumAddress(address)) {
    return errorResponse(
      'invalid_address',
      'Connect a valid Ethereum wallet address to view its artwork.',
      400,
    )
  }

  const { cursor, valid: validCursor } = readCursor(requestUrl)
  if (!validCursor) {
    return errorResponse('invalid_cursor', 'That collection page could not be loaded. Please start again.', 400)
  }

  const apiKey = process.env.OPENSEA_API_KEY?.trim()
  if (!apiKey) {
    return errorResponse(
      'not_configured',
      'The OpenSea collection connection is not configured yet.',
      503,
    )
  }

  const localRetryAfter = consumeClientRequest(request)
  if (localRetryAfter !== null) {
    return errorResponse(
      'rate_limited',
      'The collection desk is receiving a lot of visitors. Please try again shortly.',
      429,
      localRetryAfter,
    )
  }

  const cacheKey = `${address.toLowerCase()}:${cursor ?? ''}`
  const cachedPage = readCachedPage(cacheKey)
  if (cachedPage) return jsonResponse(cachedPage)

  const upstreamUrl = new URL(
    `https://api.opensea.io/api/v2/chain/ethereum/account/${address.toLowerCase()}/nfts`,
  )
  upstreamUrl.searchParams.set('limit', String(OPENSEA_OWNED_NFTS_LIMIT))
  if (cursor) upstreamUrl.searchParams.set('next', cursor)

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-api-key': apiKey,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    })
  } catch {
    return errorResponse(
      'opensea_unavailable',
      'OpenSea could not be reached. Please try again in a moment.',
      502,
    )
  }

  if (upstream.status === 429) {
    const retryAfterSeconds = parseRetryAfter(upstream.headers.get('retry-after'))
    return errorResponse(
      'rate_limited',
      'OpenSea is receiving a lot of visitors. Please try again shortly.',
      429,
      retryAfterSeconds,
    )
  }

  if (!upstream.ok) {
    if (upstream.status === 404) {
      return errorResponse('wallet_not_found', 'OpenSea has not indexed artwork for this wallet yet.', 404)
    }
    return errorResponse(
      'opensea_unavailable',
      'OpenSea could not load this collection right now. Please try again.',
      upstream.status === 400 ? 400 : upstream.status === 409 ? 409 : 502,
    )
  }

  let upstreamBody: unknown
  try {
    upstreamBody = await upstream.json()
  } catch {
    return errorResponse(
      'invalid_opensea_response',
      'OpenSea returned artwork data we could not read. Please try again.',
      502,
    )
  }

  const page = normalizeOpenSeaOwnedNftsResponse(upstreamBody)
  cachePage(cacheKey, page)
  return jsonResponse(page)
}
