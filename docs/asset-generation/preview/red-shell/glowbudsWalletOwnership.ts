import type { IncomingMessage, ServerResponse } from 'node:http'

export type GlowbudWalletOwnershipSource = 'abstract-rpc' | 'opensea'

export type GlowbudWalletOwnership = {
  address: string
  tokenIds: number[]
  source: GlowbudWalletOwnershipSource
  verifiedAt: string
}

type GlowbudWalletOwnershipOptions = {
  apiKey?: string
  chain: string
  collectionSlug: string
  contract: string
  fetchImpl?: typeof fetch
  rpcUrl: string
  tokenRange: [number, number]
}

type TransferLog = {
  address?: unknown
  blockNumber?: unknown
  logIndex?: unknown
  removed?: unknown
  topics?: unknown
  transactionHash?: unknown
  transactionIndex?: unknown
}

type RpcResponse = {
  id?: unknown
  result?: unknown
  error?: { message?: unknown }
}

type CachedWallet = {
  expiresAt: number
  result: GlowbudWalletOwnership | null
}

const ADDRESS_PATTERN = /^0x[a-f0-9]{40}$/i
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const BALANCE_OF_SELECTOR = '70a08231'
const OWNER_OF_SELECTOR = '6352211e'
const REQUEST_TIMEOUT_MS = 15_000
const WALLET_CACHE_TTL_MS = 2 * 60 * 1000
const WALLET_MISS_CACHE_TTL_MS = 20 * 1000
const OWNER_SCAN_BATCH_SIZE = 250

export function normalizeGlowbudOwnershipAddress(value: unknown) {
  if (typeof value !== 'string') return null
  const address = value.trim()
  return ADDRESS_PATTERN.test(address) ? address.toLowerCase() : null
}

function asHex(value: unknown) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]*$/.test(value) ? value.toLowerCase() : null
}

function hexNumber(value: unknown) {
  const hex = asHex(value)
  if (!hex) return 0
  const parsed = Number.parseInt(hex.slice(2) || '0', 16)
  return Number.isSafeInteger(parsed) ? parsed : 0
}

function topicAddress(value: unknown) {
  const hex = asHex(value)
  if (!hex || hex.length < 42) return null
  return normalizeGlowbudOwnershipAddress(`0x${hex.slice(-40)}`)
}

function topicTokenId(value: unknown) {
  const tokenId = hexNumber(value)
  return Number.isSafeInteger(tokenId) ? tokenId : null
}

function compareTransferLogs(left: TransferLog, right: TransferLog) {
  const fields: Array<keyof TransferLog> = ['blockNumber', 'transactionIndex', 'logIndex']
  for (const field of fields) {
    const difference = hexNumber(left[field]) - hexNumber(right[field])
    if (difference !== 0) return difference
  }
  return 0
}

export function deriveGlowbudTokenIdsFromTransferLogs(
  rawLogs: TransferLog[],
  rawAddress: string,
  tokenRange: [number, number],
) {
  const address = normalizeGlowbudOwnershipAddress(rawAddress)
  if (!address) return []

  const uniqueLogs = new Map<string, TransferLog>()
  for (const log of rawLogs) {
    if (log.removed === true || !Array.isArray(log.topics)) continue
    const topics = log.topics as unknown[]
    if (asHex(topics[0]) !== TRANSFER_TOPIC || topics.length < 4) continue
    const key = `${String(log.transactionHash)}:${String(log.logIndex)}`
    uniqueLogs.set(key, log)
  }

  const owned = new Set<number>()
  const logs = [...uniqueLogs.values()].sort(compareTransferLogs)

  for (const log of logs) {
    const topics = log.topics as unknown[]
    const tokenId = topicTokenId(topics[3])
    if (tokenId === null || tokenId < tokenRange[0] || tokenId > tokenRange[1]) continue
    const from = topicAddress(topics[1])
    const to = topicAddress(topics[2])
    if (to === address) owned.add(tokenId)
    else if (from === address) owned.delete(tokenId)
  }

  return [...owned].sort((left, right) => left - right)
}

function padAddress(address: string) {
  return address.slice(2).padStart(64, '0')
}

function padTokenId(tokenId: number) {
  return tokenId.toString(16).padStart(64, '0')
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  input: string,
  init: RequestInit,
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function rpcBatch(
  fetchImpl: typeof fetch,
  rpcUrl: string,
  requests: Array<Record<string, unknown>>,
) {
  const response = await fetchWithTimeout(fetchImpl, rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requests),
  })
  if (!response.ok) throw new Error(`Abstract RPC returned ${response.status}`)
  const payload = await response.json() as RpcResponse[] | RpcResponse
  return Array.isArray(payload) ? payload : [payload]
}

function requireRpcResult(responses: RpcResponse[], id: string) {
  const response = responses.find((entry) => entry.id === id)
  if (!response || response.error || response.result === undefined) {
    const message = typeof response?.error?.message === 'string'
      ? response.error.message
      : `Missing RPC response for ${id}`
    throw new Error(message)
  }
  return response.result
}

async function scanGlowbudOwners(
  address: string,
  options: Required<Pick<GlowbudWalletOwnershipOptions, 'contract' | 'fetchImpl' | 'rpcUrl' | 'tokenRange'>>,
) {
  const [minimum, maximum] = options.tokenRange
  const owned: number[] = []

  for (let first = minimum; first <= maximum; first += OWNER_SCAN_BATCH_SIZE) {
    const last = Math.min(maximum, first + OWNER_SCAN_BATCH_SIZE - 1)
    const responses = await rpcBatch(
      options.fetchImpl,
      options.rpcUrl,
      Array.from({ length: last - first + 1 }, (_, index) => {
        const tokenId = first + index
        return {
          jsonrpc: '2.0',
          id: tokenId,
          method: 'eth_call',
          params: [{
            to: options.contract,
            data: `0x${OWNER_OF_SELECTOR}${padTokenId(tokenId)}`,
          }, 'latest'],
        }
      }),
    )
    for (const response of responses) {
      const tokenId = typeof response.id === 'number' ? response.id : null
      const owner = topicAddress(response.result)
      if (tokenId !== null && owner === address) owned.push(tokenId)
    }
  }

  return owned.sort((left, right) => left - right)
}

async function fetchGlowbudsFromAbstract(
  address: string,
  options: Required<Pick<GlowbudWalletOwnershipOptions, 'contract' | 'fetchImpl' | 'rpcUrl' | 'tokenRange'>>,
) {
  const addressTopic = `0x${padAddress(address)}`
  const responses = await rpcBatch(options.fetchImpl, options.rpcUrl, [
    {
      jsonrpc: '2.0',
      id: 'incoming',
      method: 'eth_getLogs',
      params: [{
        fromBlock: '0x0',
        toBlock: 'latest',
        address: options.contract,
        topics: [TRANSFER_TOPIC, null, addressTopic],
      }],
    },
    {
      jsonrpc: '2.0',
      id: 'outgoing',
      method: 'eth_getLogs',
      params: [{
        fromBlock: '0x0',
        toBlock: 'latest',
        address: options.contract,
        topics: [TRANSFER_TOPIC, addressTopic],
      }],
    },
    {
      jsonrpc: '2.0',
      id: 'balance',
      method: 'eth_call',
      params: [{
        to: options.contract,
        data: `0x${BALANCE_OF_SELECTOR}${padAddress(address)}`,
      }, 'latest'],
    },
  ])

  const incoming = requireRpcResult(responses, 'incoming')
  const outgoing = requireRpcResult(responses, 'outgoing')
  const balanceResult = requireRpcResult(responses, 'balance')
  if (!Array.isArray(incoming) || !Array.isArray(outgoing)) {
    throw new Error('Abstract RPC returned malformed transfer logs')
  }

  const tokenIds = deriveGlowbudTokenIdsFromTransferLogs(
    [...incoming, ...outgoing] as TransferLog[],
    address,
    options.tokenRange,
  )
  const expectedBalance = hexNumber(balanceResult)
  if (Number.isSafeInteger(expectedBalance) && expectedBalance === tokenIds.length) return tokenIds

  return scanGlowbudOwners(address, options)
}

function openSeaNextCursor(payload: Record<string, unknown>) {
  if (typeof payload.next === 'string' && payload.next) return payload.next
  if (payload.next && typeof payload.next === 'object') {
    const value = (payload.next as Record<string, unknown>).value
    if (typeof value === 'string' && value) return value
  }
  return null
}

async function fetchGlowbudsFromOpenSea(
  address: string,
  options: Required<Pick<GlowbudWalletOwnershipOptions, 'apiKey' | 'chain' | 'collectionSlug' | 'contract' | 'fetchImpl' | 'tokenRange'>>,
) {
  const owned = new Set<number>()
  let cursor: string | null = null

  for (let page = 0; page < 20; page += 1) {
    const url = new URL(`https://api.opensea.io/api/v2/chain/${options.chain}/account/${address}/nfts`)
    url.searchParams.set('collection', options.collectionSlug)
    url.searchParams.set('limit', '200')
    if (cursor) url.searchParams.set('next', cursor)

    const response = await fetchWithTimeout(options.fetchImpl, url.toString(), {
      headers: { accept: 'application/json', 'x-api-key': options.apiKey },
    })
    if (!response.ok) throw new Error(`OpenSea returned ${response.status}`)
    const payload = await response.json() as Record<string, unknown>
    const nfts = Array.isArray(payload.nfts) ? payload.nfts : []
    for (const nft of nfts) {
      if (!nft || typeof nft !== 'object') continue
      const record = nft as Record<string, unknown>
      const contract = typeof record.contract === 'string' ? record.contract.toLowerCase() : null
      const tokenId = Number(record.identifier)
      if (
        contract === options.contract.toLowerCase()
        && Number.isInteger(tokenId)
        && tokenId >= options.tokenRange[0]
        && tokenId <= options.tokenRange[1]
      ) owned.add(tokenId)
    }
    cursor = openSeaNextCursor(payload)
    if (!cursor) break
  }

  return [...owned].sort((left, right) => left - right)
}

export async function fetchGlowbudWalletOwnership(
  rawAddress: string,
  options: GlowbudWalletOwnershipOptions,
): Promise<GlowbudWalletOwnership> {
  const address = normalizeGlowbudOwnershipAddress(rawAddress)
  if (!address) throw new Error('Invalid wallet address')
  const fetchImpl = options.fetchImpl ?? fetch

  try {
    const tokenIds = await fetchGlowbudsFromAbstract(address, {
      contract: options.contract,
      fetchImpl,
      rpcUrl: options.rpcUrl,
      tokenRange: options.tokenRange,
    })
    return {
      address,
      tokenIds,
      source: 'abstract-rpc',
      verifiedAt: new Date().toISOString(),
    }
  } catch (rpcError) {
    const apiKey = options.apiKey?.trim()
    if (!apiKey) throw rpcError
    const tokenIds = await fetchGlowbudsFromOpenSea(address, {
      apiKey,
      chain: options.chain,
      collectionSlug: options.collectionSlug,
      contract: options.contract,
      fetchImpl,
      tokenRange: options.tokenRange,
    })
    return {
      address,
      tokenIds,
      source: 'opensea',
      verifiedAt: new Date().toISOString(),
    }
  }
}

export function createGlowbudWalletMiddleware(options: GlowbudWalletOwnershipOptions) {
  const cache = new Map<string, CachedWallet>()

  return async function glowbudWalletMiddleware(
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ) {
    const requestUrl = new URL(request.url ?? '/', 'http://localhost')
    const match = requestUrl.pathname.match(/^\/api\/glowbuds-wallet\/(0x[a-fA-F0-9]{40})$/)
    if (!match) {
      next()
      return
    }

    const address = normalizeGlowbudOwnershipAddress(match[1])
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'private, max-age=30')
    if (!address) {
      response.statusCode = 400
      response.end(JSON.stringify({ status: 'invalid-address' }))
      return
    }

    const cached = cache.get(address)
    if (cached && cached.expiresAt > Date.now()) {
      response.statusCode = cached.result ? 200 : 503
      response.end(JSON.stringify({
        status: cached.result ? 'ready' : 'unavailable',
        ownership: cached.result,
        cached: true,
      }))
      return
    }

    try {
      const result = await fetchGlowbudWalletOwnership(address, options)
      cache.set(address, { result, expiresAt: Date.now() + WALLET_CACHE_TTL_MS })
      response.statusCode = 200
      response.end(JSON.stringify({ status: 'ready', ownership: result, cached: false }))
    } catch {
      cache.set(address, { result: null, expiresAt: Date.now() + WALLET_MISS_CACHE_TTL_MS })
      response.statusCode = 503
      response.end(JSON.stringify({ status: 'unavailable', ownership: null }))
    }
  }
}
