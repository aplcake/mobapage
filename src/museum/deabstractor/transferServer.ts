import { createPublicClient, http, isAddress, type Address } from 'viem'
import { abstract, mainnet } from 'viem/chains'
import { ABSTRACT_RPC, ETHEREUM_RPC, GLOWBUD_ABI, GLOWBUD_CONTRACT, readDeparture, recipientAddress, verifyTransferReceipt, type TransferRecord, type TransferTicket } from './transfer'

const client = createPublicClient({ chain: abstract, transport: http(process.env.ABSTRACT_RPC_URL || ABSTRACT_RPC, { timeout: 12000, retryCount: 1, batch: { wait: 25, batchSize: 100 } }) })
const ethereum = createPublicClient({ chain: mainnet, transport: http(process.env.ETHEREUM_RPC_URL || ETHEREUM_RPC, { timeout: 12000, retryCount: 1 }) })
const owner = (token: number, blockNumber?: bigint) => client.readContract({ address: GLOWBUD_CONTRACT, abi: GLOWBUD_ABI, functionName: 'ownerOf', args: [BigInt(token)], blockNumber })

export async function inventory(address: Address) {
  if (await client.getChainId() !== abstract.id) throw new Error('Abstract connection is on the wrong network.')
  const blockNumber = await client.getBlockNumber({ cacheTime: 0 })
  const balance = await client.readContract({ address: GLOWBUD_CONTRACT, abi: GLOWBUD_ABI, functionName: 'balanceOf', args: [address], blockNumber })
  if (balance === BigInt(0)) return { tokenIds: [], address, block: String(blockNumber) }
  // Discovery is only a candidate list. ownerOf and balance at one block must agree before showing a complete inventory.
  const logs = await client.getLogs({ address: GLOWBUD_CONTRACT, event: GLOWBUD_ABI[4], args: { to: address }, fromBlock: BigInt(0), toBlock: blockNumber, strict: true })
  const candidates = [...new Set(logs.filter(log => !log.removed).map(log => Number(log.args.tokenId)))].filter(id => id >= 1 && id <= 3333)
  const tokenIds: number[] = []
  for (const token of candidates) {
    if ((await owner(token, blockNumber)).toLowerCase() === address.toLowerCase()) tokenIds.push(token)
  }
  if (BigInt(tokenIds.length) !== balance) throw new Error('The network returned an incomplete inventory. Refresh shortly; no buds are missing from your wallet.')
  return { tokenIds: tokenIds.sort((a, b) => a - b), address, block: String(blockNumber) }
}

export async function checkRecipient(raw: string, source?: string) {
  const address = recipientAddress(raw, source)
  if (await client.getChainId() !== abstract.id || await ethereum.getChainId() !== mainnet.id) throw new Error('A network check failed. Please try again.')
  const abstractCode = await client.getCode({ address })
  const ethereumCode = await ethereum.getCode({ address })
  if (abstractCode && abstractCode !== '0x') {
    throw new Error('This receiving address has contract code on Abstract. Abstract Global Wallet and other contract-wallet destinations are not supported. Use a personal address you control on both networks.')
  }
  // EIP-7702 keeps an Ethereum EOA at its original address. Only the exact
  // 23-byte delegation indicator qualifies; do not apply this exception to Abstract.
  const delegation = ethereumCode?.match(/^0xef0100([0-9a-f]{40})$/i)
  const upgraded = Boolean(delegation && !/^0{40}$/.test(delegation[1]))
  if (ethereumCode && ethereumCode !== '0x' && !upgraded) {
    throw new Error('This receiving address uses an unsupported contract wallet on Ethereum. Personal wallets with a standard EIP-7702 upgrade are supported; other contract accounts are not.')
  }
  return {
    address, checkedAt: Date.now(), ethereumWalletType: upgraded ? 'eip7702' as const : 'standard' as const,
    warning: 'Wallet-type check only. This does not prove address control, exclude exchange deposits, audit wallet code, or guarantee later Ethereum NFT delivery.',
  }
}

export async function preflight(ticket: Omit<TransferTicket, 'hash'>) {
  await checkRecipient(ticket.to, ticket.from)
  if (!(await client.readContract({ address: GLOWBUD_CONTRACT, abi: GLOWBUD_ABI, functionName: 'supportsInterface', args: ['0x80ac58cd'] }))) throw new Error('Collection verification failed.')
  if ((await owner(ticket.token)).toLowerCase() !== ticket.from.toLowerCase()) throw new Error(`Glowbud #${ticket.token} is no longer in the sending wallet. Refresh your buds.`)
  await client.simulateContract({ address: GLOWBUD_CONTRACT, abi: GLOWBUD_ABI, functionName: 'safeTransferFrom', account: ticket.from, args: [ticket.from, ticket.to, BigInt(ticket.token)] })
  return { ready: true }
}

export async function transferStatus(ticket: TransferTicket) {
  const receipt = await client.getTransactionReceipt({ hash: ticket.hash }).catch(error => {
    if (error?.name === 'TransactionReceiptNotFoundError') return null
    throw error
  })
  if (!receipt) return { status: 'pending' as const }
  const status = verifyTransferReceipt(ticket, receipt)
  if (status !== 'confirmed') return { status }
  if (await client.getBlockNumber({ cacheTime: 0 }) < receipt.blockNumber + BigInt(1)) return { status: 'pending' as const }
  const currentOwner = await owner(ticket.token)
  return { status, currentOwner, atDestination: currentOwner.toLowerCase() === ticket.to.toLowerCase(), block: String(receipt.blockNumber) }
}

export async function preflightDeparture(value: unknown) {
  const trip = readDeparture(value)
  await checkRecipient(trip.to, trip.from)
  if (!(await client.readContract({ address: GLOWBUD_CONTRACT, abi: GLOWBUD_ABI, functionName: 'supportsInterface', args: ['0x80ac58cd'] }))) throw new Error('Collection verification failed.')
  const fromBlock = await client.getBlockNumber({ cacheTime: 0 })
  // Transport batches these reads; the wallet still estimates/simulates the complete atomic send.
  await Promise.all(trip.tokens.map(async token => {
    if ((await owner(token)).toLowerCase() !== trip.from.toLowerCase()) throw new Error(`Glowbud #${token} is no longer in the sending wallet. Refresh your buds.`)
    await client.simulateContract({ address: GLOWBUD_CONTRACT, abi: GLOWBUD_ABI, functionName: 'safeTransferFrom', account: trip.from, args: [trip.from, trip.to, BigInt(token)] })
  }))
  return { ready: true, fromBlock: String(fromBlock) }
}

export async function departureStatus(value: unknown) {
  const trip = readDeparture(value)
  if (await client.getChainId() !== abstract.id) throw new Error('Abstract connection is on the wrong network.')
  const block = await client.getBlockNumber({ cacheTime: 0 })
  const start = BigInt(trip.fromBlock ?? '0')
  if (start > block) throw new Error('Waiting for Abstract to catch up with your departure.')
  // An interrupted wallet reply is recovered from exact transfer events, never from ownerOf alone.
  // Old pre-hash journals have no block, so their compatibility path searches the collection history.
  const logs = trip.hash ? [] : await client.getLogs({ address: GLOWBUD_CONTRACT, event: GLOWBUD_ABI[4], args: { from: trip.from, to: trip.to, tokenId: trip.tokens.map(BigInt) }, fromBlock: start, toBlock: block, strict: true })
  const receipts = new Map<string, ReturnType<typeof client.getTransactionReceipt>>()
  const records = (await Promise.all(trip.tokens.map(async token => {
    const log = logs.find(item => !item.removed && item.blockNumber !== null && item.blockNumber >= start && item.args.tokenId === BigInt(token) && item.args.from?.toLowerCase() === trip.from.toLowerCase() && item.args.to?.toLowerCase() === trip.to.toLowerCase())
    const hash = trip.hash ?? log?.transactionHash
    if (!hash) return null
    const ticket = { from: trip.from, to: trip.to, token, hash }
    if (!receipts.has(hash)) receipts.set(hash, client.getTransactionReceipt({ hash }))
    const receipt = await receipts.get(hash)!.catch(error => {
      if (error?.name === 'TransactionReceiptNotFoundError') return null
      throw error
    })
    if (!receipt) return { ...ticket, status: 'pending' as const, atDestination: false }
    const verified = verifyTransferReceipt(ticket, receipt)
    const status = verified === 'confirmed' && block < receipt.blockNumber + BigInt(1) ? 'pending' as const : verified
    const atDestination = status === 'confirmed' && (await owner(token)).toLowerCase() === trip.to.toLowerCase()
    return { ...ticket, status, atDestination }
  }))).filter((entry): entry is TransferRecord & { atDestination: boolean } => entry !== null)
  return { records, complete: records.length === trip.tokens.length && records.every(record => record.status === 'confirmed' || record.status === 'reverted') }
}

const windows = new Map<string, { time: number; count: number }>()
export function requestGate(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw new Error('Cross-site requests are not supported.')
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) throw new Error('Use this website directly.')
  const key = request.headers.get('x-forwarded-for')?.split(',')[0] || 'local'
  const now = Date.now()
  for (const [id, entry] of windows) if (now - entry.time > 60000) windows.delete(id)
  if (windows.size > 2000) throw new Error('The apparatus is busy. Try shortly.')
  const entry = windows.get(key) || { time: now, count: 0 }
  if (++entry.count > 90) throw new Error('Too many checks. Wait a minute and retry.')
  windows.set(key, entry)
}

export function addressInput(value: unknown): Address {
  if (typeof value !== 'string' || !isAddress(value)) throw new Error('A valid wallet address is required.')
  return value
}
export const privateHeaders = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }

export function publicCheckError(error: unknown) {
  if (!(error instanceof Error)) return 'The network check could not finish. Try again shortly.'
  // RPC diagnostics can contain private node URLs. Only our short, single-line errors leave the server.
  if (error.message.includes('\n') || /https?:|api.?key|token=/i.test(error.message) || error.message.length > 300) return 'The network check could not finish. Try again shortly; do not resend a pending transfer.'
  return error.message
}

export async function readSmallJson(request: Request) {
  const reader = request.body?.getReader()
  if (!reader) throw new Error('A request body is required.')
  let size = 0, text = ''
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 2048) { await reader.cancel(); throw new Error('Request too large.') }
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
    const data = JSON.parse(text)
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid request.')
    return data as Record<string, unknown>
  } finally { reader.releaseLock() }
}
