import {
  isMuseumAssetIdentity,
  type AtriumInstallationDraft,
} from '../../../../src/museum/collection-registry/museumAssetTypes'
import { verifyAtriumInstallation } from '../../../../src/museum/collection-registry/museumOwnership'
import { normalizeWalletAddress } from '../../../../src/museum/wallet/eip1193Wallet'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}
const REQUEST_WINDOW_MS = 60_000
const REQUEST_LIMIT = 8
const clients = new Map<string, { startedAt: number; count: number }>()

function json(value: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(value), { status, headers: { ...PRIVATE_HEADERS, ...headers } })
}

function isValidDraft(value: unknown): value is AtriumInstallationDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const draft = value as Record<string, unknown>
  return draft.version === 1
    && Boolean(normalizeWalletAddress(draft.address))
    && (draft.addressSource === 'wallet' || draft.addressSource === 'public-address')
    && Array.isArray(draft.glowbuds)
    && Array.isArray(draft.artworks)
    && draft.glowbuds.every(isMuseumAssetIdentity)
    && draft.artworks.every(isMuseumAssetIdentity)
}

function consume(request: Request) {
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'local-client'
  const now = Date.now()
  const current = clients.get(key)
  if (!current || now - current.startedAt >= REQUEST_WINDOW_MS) {
    clients.set(key, { startedAt: now, count: 1 })
    return null
  }
  if (current.count >= REQUEST_LIMIT) return Math.max(1, Math.ceil((REQUEST_WINDOW_MS - (now - current.startedAt)) / 1_000))
  current.count += 1
  return null
}

export async function POST(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ error: { message: 'Cross-site registry updates are not allowed.' } }, 403)
  }
  const retryAfter = consume(request)
  if (retryAfter) return json({ error: { message: 'Ownership checks are busy. Please try again shortly.' } }, 429, { 'Retry-After': String(retryAfter) })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: { message: 'The atrium selection could not be read.' } }, 400)
  }
  if (!isValidDraft(body)) return json({ error: { message: 'The atrium selection is incomplete or invalid.' } }, 400)

  try {
    const result = await verifyAtriumInstallation(body)
    return json(result, result.verified ? 200 : 409)
  } catch (error) {
    return json({ error: { message: error instanceof Error ? error.message : 'Ownership could not be rechecked. Your atrium was not changed.' } }, 502)
  }
}
