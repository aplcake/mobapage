import { discoverMuseumAssets } from '../../../../src/museum/collection-registry/museumOwnership'
import { normalizeWalletAddress } from '../../../../src/museum/wallet/eip1193Wallet'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}
const CACHE_TTL_MS = 45_000
const REQUEST_WINDOW_MS = 60_000
const REQUEST_LIMIT = 10

type CacheValue = {
  expiresAt: number
  body: Awaited<ReturnType<typeof discoverMuseumAssets>>
}

const cache = new Map<string, CacheValue>()
const clientRequests = new Map<string, { startedAt: number; count: number }>()

function json(value: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(value), { status, headers: { ...PRIVATE_HEADERS, ...headers } })
}

function clientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'local-client'
}

function checkRateLimit(request: Request) {
  const now = Date.now()
  const key = clientKey(request)
  const current = clientRequests.get(key)
  if (!current || now - current.startedAt >= REQUEST_WINDOW_MS) {
    clientRequests.set(key, { startedAt: now, count: 1 })
    return null
  }
  if (current.count >= REQUEST_LIMIT) return Math.max(1, Math.ceil((REQUEST_WINDOW_MS - (now - current.startedAt)) / 1_000))
  current.count += 1
  return null
}

export async function GET(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ error: { message: 'Cross-site registry requests are not allowed.' } }, 403)
  }
  const retryAfter = checkRateLimit(request)
  if (retryAfter) {
    return json({ error: { message: 'The registry is taking a breath. Please try again shortly.' } }, 429, { 'Retry-After': String(retryAfter) })
  }

  const address = normalizeWalletAddress(new URL(request.url).searchParams.get('address') ?? '')
  if (!address) return json({ error: { message: 'Enter a complete 0x wallet address.' } }, 400)

  const cached = cache.get(address)
  if (cached && cached.expiresAt > Date.now()) return json({ ...cached.body, cached: true })

  try {
    const body = await discoverMuseumAssets(address, { openSeaApiKey: process.env.OPENSEA_API_KEY })
    if (cache.size >= 200) cache.delete(cache.keys().next().value ?? '')
    cache.set(address, { expiresAt: Date.now() + CACHE_TTL_MS, body })
    return json(body)
  } catch (error) {
    return json({ error: { message: error instanceof Error ? error.message : 'The Atrium Registry could not read that collection.' } }, 502)
  }
}
