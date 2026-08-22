import { isEthereumAddress } from '../../../../src/museum/formal-room/ownedNfts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SELECTIONS = 3
const OWNER_PAGE_LIMIT = 100
const MAX_OWNER_PAGES = 8
const MAX_CURSOR_LENGTH = 4096
const CLIENT_WINDOW_MS = 60_000
const CLIENT_REQUEST_LIMIT = 10
const PRIVATE_JSON_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

type Selection = {
  tokenKey: string
  contract: string
  identifier: string
}

type RequestWindow = {
  count: number
  startedAt: number
}

const requestWindows = new Map<string, RequestWindow>()

function jsonResponse(value: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...PRIVATE_JSON_HEADERS, ...headers },
  })
}

function readClientKey(request: Request) {
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

function readSelection(value: unknown): Selection | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>
  const contract = typeof candidate.contract === 'string' ? candidate.contract.toLowerCase() : ''
  const identifier = typeof candidate.identifier === 'string' ? candidate.identifier.trim() : ''
  const tokenKey = typeof candidate.tokenKey === 'string' ? candidate.tokenKey.trim() : ''

  if (!isEthereumAddress(contract) || !identifier || identifier.length > 256) return null
  if (/[\u0000-\u001f\u007f/]/.test(identifier)) return null
  if (tokenKey !== `ethereum:${contract}:${identifier}`) return null
  return { tokenKey, contract, identifier }
}

function readOwnersPage(value: unknown): { addresses: string[]; nextCursor: string | null } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const owners = record.owners
  if (!Array.isArray(owners)) return null

  const addresses = owners.flatMap((owner) => {
    if (!owner || typeof owner !== 'object' || Array.isArray(owner)) return []
    const address = (owner as Record<string, unknown>).address
    return typeof address === 'string' && isEthereumAddress(address) ? [address.toLowerCase()] : []
  })
  const rawCursor = typeof record.next === 'string' ? record.next.trim() : ''
  const nextCursor = rawCursor && rawCursor.length <= MAX_CURSOR_LENGTH ? rawCursor : null
  return { addresses, nextCursor }
}

async function selectionIsOwned(selection: Selection, address: string, apiKey: string) {
  let cursor: string | null = null
  for (let page = 0; page < MAX_OWNER_PAGES; page += 1) {
    const upstreamUrl = new URL(
      `https://api.opensea.io/api/v2/chain/ethereum/contract/${selection.contract}/nfts/${encodeURIComponent(selection.identifier)}/owners`,
    )
    upstreamUrl.searchParams.set('limit', String(OWNER_PAGE_LIMIT))
    if (cursor) upstreamUrl.searchParams.set('next', cursor)

    const response = await fetch(upstreamUrl, {
      headers: { Accept: 'application/json', 'x-api-key': apiKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    })
    if (!response.ok) throw new Error(response.status === 429 ? 'rate_limited' : 'unavailable')
    const ownersPage = readOwnersPage(await response.json())
    if (!ownersPage) throw new Error('invalid_response')
    if (ownersPage.addresses.includes(address)) return true
    if (!ownersPage.nextCursor) return false
    cursor = ownersPage.nextCursor
  }
  throw new Error('owner_page_limit')
}

export async function POST(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return jsonResponse({ error: { message: 'Cross-site ownership checks are not allowed.' } }, 403)
  }

  const apiKey = process.env.OPENSEA_API_KEY?.trim()
  if (!apiKey) {
    return jsonResponse({ error: { message: 'The OpenSea collection connection is not configured yet.' } }, 503)
  }

  const retryAfterSeconds = consumeClientRequest(request)
  if (retryAfterSeconds !== null) {
    return jsonResponse(
      { error: { message: 'Ownership checks are busy. Please try again shortly.', retryAfterSeconds } },
      429,
      { 'Retry-After': String(retryAfterSeconds) },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: { message: 'The selected artwork could not be checked.' } }, 400)
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonResponse({ error: { message: 'The selected artwork could not be checked.' } }, 400)
  }

  const record = body as Record<string, unknown>
  const address = typeof record.address === 'string' ? record.address.toLowerCase() : ''
  const rawSelections = Array.isArray(record.selections) ? record.selections : []
  const selections = rawSelections.map(readSelection)

  if (!isEthereumAddress(address) || selections.length !== MAX_SELECTIONS || selections.some((item) => item === null)) {
    return jsonResponse({ error: { message: 'Choose three valid artworks from one Ethereum wallet.' } }, 400)
  }

  const uniqueSelections = selections as Selection[]
  if (new Set(uniqueSelections.map((selection) => selection.tokenKey)).size !== MAX_SELECTIONS) {
    return jsonResponse({ error: { message: 'Choose three different artworks.' } }, 400)
  }

  try {
    const ownership = await Promise.all(uniqueSelections.map(async (selection) => {
      const owned = await selectionIsOwned(selection, address, apiKey)
      return { tokenKey: selection.tokenKey, owned }
    }))

    const missingTokenKeys = ownership.filter((item) => !item.owned).map((item) => item.tokenKey)
    return jsonResponse({ verified: missingTokenKeys.length === 0, missingTokenKeys })
  } catch (error) {
    if (error instanceof Error && error.message === 'rate_limited') {
      return jsonResponse({ error: { message: 'OpenSea is busy. Please try the ownership check again shortly.' } }, 429)
    }
    return jsonResponse({ error: { message: 'Ownership could not be rechecked right now. Your room was not changed.' } }, 502)
  }
}
