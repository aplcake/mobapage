import { decodeEventLog, encodeFunctionData, getAddress, isAddress, parseAbi, zeroAddress, type Address, type Hex } from 'viem'

export const GLOWBUD_CONTRACT = '0x40148d9aec2d0aed12ccf556cd7cd79c15197644' as const
export const ABSTRACT_CHAIN_ID = 2741
export const ABSTRACT_RPC = 'https://api.mainnet.abs.xyz'
export const ETHEREUM_RPC = 'https://ethereum-rpc.publicnode.com'
export const MAX_PASSENGERS = 50
export const GLOWBUD_ABI = parseAbi([
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address owner) view returns (uint256)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
])
export type TransferTicket = { token: number; from: Address; to: Address; hash: Hex }
export type TransferStatus = 'pending' | 'confirmed' | 'reverted' | 'mismatch'
export type TransferRecord = TransferTicket & { status: TransferStatus }
export type WalletInspection = { token: number; address: Address; checkId: string }
export type VerifiedArrival = TransferTicket | WalletInspection
export type TransferSigner = {
  address: Address
  name: string
  readAddress: () => Promise<Address | null>
  ensureChain: () => Promise<void>
  send: (token: number, destination: Address) => Promise<Hex>
  supportsBatch?: () => Promise<boolean>
  sendBatch?: (tokens: number[], destination: Address, requestId: string) => Promise<{ hash?: Hex; callId?: string }>
  batchStatus?: (id: string) => Promise<{ failed: boolean; hash?: Hex }>
}

export function passengerTokens(value: unknown): number[] {
  if (!Array.isArray(value) || !value.length || value.length > MAX_PASSENGERS) throw new Error(`Choose between 1 and ${MAX_PASSENGERS} buds.`)
  const tokens = value.map(tokenNumber)
  if (new Set(tokens).size !== tokens.length) throw new Error('Each bud can only travel once per trip.')
  return tokens
}

export function transferCalls(from: Address, to: Address, tokens: number[]) {
  return passengerTokens(tokens).map(token => ({ to: GLOWBUD_CONTRACT, data: transferData(from, to, token), value: '0x0' as const }))
}

export type Departure = { from: Address; to: Address; tokens: number[]; fromBlock?: string; hash?: Hex; callId?: string }
export function readDeparture(value: unknown): Departure {
  if (!value || typeof value !== 'object') throw new Error('The saved departure could not be read. No new transfer will be sent.')
  const entry = value as Record<string, unknown>
  const from = recipientAddress(String(entry.from ?? ''))
  const to = recipientAddress(String(entry.to ?? ''), from)
  const tokens = passengerTokens(entry.tokens ?? [entry.token])
  if (entry.fromBlock !== undefined && (typeof entry.fromBlock !== 'string' || !/^\d{1,20}$/.test(entry.fromBlock))) throw new Error('Invalid departure block.')
  if (entry.hash !== undefined && (typeof entry.hash !== 'string' || !/^0x[0-9a-f]{64}$/i.test(entry.hash))) throw new Error('Invalid departure receipt.')
  if (entry.callId !== undefined && (typeof entry.callId !== 'string' || !entry.callId.length || entry.callId.length > 8194)) throw new Error('Invalid departure identifier.')
  return { from, to, tokens, fromBlock: entry.fromBlock as string | undefined, hash: entry.hash as Hex | undefined, callId: entry.callId as string | undefined }
}

export function isWalletRejection(error: unknown): boolean {
  // Only a structured, definitive rejection can release a pre-submission lock.
  let cause: unknown = error
  for (let depth = 0; depth < 8 && cause && typeof cause === 'object'; depth++) {
    if ('code' in cause && cause.code === 4001) return true
    cause = 'cause' in cause ? cause.cause : null
  }
  return false
}

export class TransferNotSubmittedError extends Error {}
export function wasNotSubmitted(error: unknown): boolean {
  if (error instanceof TransferNotSubmittedError || isWalletRejection(error)) return true
  let cause: unknown = error
  for (let depth = 0; depth < 8 && cause && typeof cause === 'object'; depth++) {
    // Standard wallet errors that explicitly reject the request before submission.
    if ('code' in cause && [-32601, -32602, 4100, 4200, 5700, 5710, 5740, 5750, 5760].includes(Number(cause.code))) return true
    cause = 'cause' in cause ? cause.cause : null
  }
  return false
}

export function tokenNumber(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string') throw new Error('Invalid Glowbud number.')
  if (!/^\d+$/.test(String(value))) throw new Error('Invalid Glowbud number.')
  const token = Number(value)
  if (!Number.isSafeInteger(token) || token < 1 || token > 3333) throw new Error('Choose a Glowbud between 1 and 3333.')
  return token
}

export function recipientAddress(raw: string, source?: string): Address {
  const value = raw.trim()
  if (!isAddress(value, { strict: true })) throw new Error('Paste a complete 0x wallet address with a valid checksum. Names are not accepted.')
  const address = getAddress(value)
  if (address === zeroAddress || BigInt(address) < BigInt(65536) || address.toLowerCase() === GLOWBUD_CONTRACT) throw new Error('That is not a receiving wallet address.')
  if (source && address.toLowerCase() === source.toLowerCase()) throw new Error('Choose a different receiving wallet. Your buds are already at this address.')
  return address
}

export function transferData(from: Address, to: Address, token: number) {
  recipientAddress(to, from)
  return encodeFunctionData({ abi: GLOWBUD_ABI, functionName: 'safeTransferFrom', args: [getAddress(from), getAddress(to), BigInt(tokenNumber(token))] })
}

export function verifyTransferReceipt(ticket: TransferTicket, receipt: { status: string; transactionHash: Hex; logs: { address: Address; data: Hex; topics: [] | [Hex, ...Hex[]] }[] }): TransferStatus {
  if (receipt.transactionHash.toLowerCase() !== ticket.hash.toLowerCase()) return 'mismatch'
  if (receipt.status !== 'success') return 'reverted'
  // AGW executes through its account, so the outer transaction's `to` need not be the NFT contract.
  const found = receipt.logs.some(log => {
    if (log.address.toLowerCase() !== GLOWBUD_CONTRACT) return false
    try {
      const event = decodeEventLog({ abi: GLOWBUD_ABI, eventName: 'Transfer', data: log.data, topics: log.topics })
      return event.args.tokenId === BigInt(ticket.token) && event.args.from.toLowerCase() === ticket.from.toLowerCase() && event.args.to.toLowerCase() === ticket.to.toLowerCase()
    } catch { return false }
  })
  return found ? 'confirmed' : 'mismatch'
}

export function readTicket(value: unknown): TransferTicket {
  if (!value || typeof value !== 'object') throw new Error('Invalid transfer record.')
  const entry = value as Record<string, unknown>
  const from = recipientAddress(String(entry.from ?? ''))
  const to = recipientAddress(String(entry.to ?? ''), from)
  if (typeof entry.hash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(entry.hash)) throw new Error('Invalid transaction hash.')
  return { from, to, token: tokenNumber(entry.token), hash: entry.hash as Hex }
}

export function friendlyWalletError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error)
  if (/reject|denied|4001/i.test(raw)) return 'Request cancelled in your wallet. Any earlier confirmed transfers remain complete.'
  if (/insufficient funds|gas required exceeds/i.test(raw)) return 'Your sending wallet needs ETH on Abstract for network fees. No transfer was submitted by this request.'
  return raw.length > 240 ? 'The wallet or network could not complete this step. We will keep checking any pending departure automatically.' : raw
}

export const portraitUrl = (token: number) => [968, 1677, 2000].includes(token) ? `/deabstractor/glowbud-${token}.png` : `/api/deabstractor/portrait/${tokenNumber(token)}`
