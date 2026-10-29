import { describe, expect, it, vi } from 'vitest'
import { decodeFunctionData, encodeEventTopics, getAddress, parseAbi, type Hex } from 'viem'
import { getBatchTransactionObject } from '@abstract-foundation/agw-client/actions'
import { ABSTRACT_CHAIN_ID, GLOWBUD_ABI, GLOWBUD_CONTRACT, isWalletRejection, passengerTokens, portraitUrl, readDeparture, readTicket, recipientAddress, tokenNumber, transferCalls, transferData, verifyTransferReceipt, wasNotSubmitted, type TransferTicket } from '../src/museum/deabstractor/transfer'
import { browserSigner } from '../src/museum/deabstractor/browserSigner'

const from = getAddress('0x1111111111111111111111111111111111111111')
const to = getAddress('0x2222222222222222222222222222222222222222')
const hash = `0x${'a'.repeat(64)}` as Hex
const ticket: TransferTicket = { from, to, hash, token: 968 }
const log = { address: GLOWBUD_CONTRACT, data: '0x' as Hex, topics: encodeEventTopics({ abi: GLOWBUD_ABI, eventName: 'Transfer', args: { from, to, tokenId: BigInt(968) } }) as [Hex, ...Hex[]] }
const receipt = { transactionHash: hash, status: 'success', logs: [log] }

describe('De-Abstractor asset boundaries', () => {
  it('pins the verified collection and chain; caller cannot supply a contract', () => {
    expect(ABSTRACT_CHAIN_ID).toBe(2741)
    expect(GLOWBUD_CONTRACT).toBe('0x40148d9aec2d0aed12ccf556cd7cd79c15197644')
    expect(decodeFunctionData({ abi: GLOWBUD_ABI, data: transferData(from, to, 968) })).toEqual({ functionName: 'safeTransferFrom', args: [from, to, BigInt(968)] })
    expect(GLOWBUD_ABI.some(item => 'name' in item && /approve/i.test(item.name))).toBe(false)
  })
  it.each(['', 'alice.eth', '0x0', '0x0000000000000000000000000000000000000000', GLOWBUD_CONTRACT, from])('rejects unsafe destination %s', address => {
    expect(() => recipientAddress(address, from)).toThrow()
  })
  it('rejects a mixed-case address with the wrong checksum', () => {
    expect(() => recipientAddress('0x52908400098527886E0F7030069857D2E4169Ee7')).toThrow()
  })
  it('accepts a full address and trims outer whitespace only', () => expect(recipientAddress(` ${to} `, from)).toBe(to))
  it.each([0, 3334, -1, 1.2, null, {}, '1e3', '1/../../', NaN])('rejects non-collection token %s', token => expect(() => tokenNumber(token)).toThrow())
  it('keeps original portrait URLs fixed and rejects path injection', () => {
    expect(portraitUrl(968)).toBe('/deabstractor/glowbud-968.png')
    expect(portraitUrl(123)).toBe('/api/deabstractor/portrait/123')
    expect(() => portraitUrl(-1)).toThrow()
  })
  it('requires an exact matching Transfer log, not just a successful transaction', () => {
    expect(verifyTransferReceipt(ticket, receipt)).toBe('confirmed')
    expect(verifyTransferReceipt(ticket, { ...receipt, logs: [] })).toBe('mismatch')
    expect(verifyTransferReceipt({ ...ticket, token: 1677 }, receipt)).toBe('mismatch')
    expect(verifyTransferReceipt({ ...ticket, to: from }, receipt)).toBe('mismatch')
    expect(verifyTransferReceipt({ ...ticket, from: to }, receipt)).toBe('mismatch')
    expect(verifyTransferReceipt(ticket, { ...receipt, transactionHash: `0x${'b'.repeat(64)}` })).toBe('mismatch')
    expect(verifyTransferReceipt(ticket, { ...receipt, logs: [{ ...log, address: to }] })).toBe('mismatch')
    expect(verifyTransferReceipt(ticket, { ...receipt, status: 'reverted' })).toBe('reverted')
  })
  it('rejects invalid saved records and discards stored status claims', () => {
    expect(readTicket({ ...ticket, status: 'confirmed' })).toEqual(ticket)
    expect(() => readTicket({ ...ticket, hash: 'not-a-hash' })).toThrow()
    expect(() => readTicket({ ...ticket, to: from })).toThrow()
  })
})

describe('Bulk departures', () => {
  it('allows 50 unique passengers and rejects duplicate or oversized groups', () => {
    expect(passengerTokens(Array.from({ length: 50 }, (_, i) => i + 1))).toHaveLength(50)
    for (const value of [[], [968, 968], [0], Array.from({ length: 51 }, (_, i) => i + 1)]) expect(() => passengerTokens(value)).toThrow()
  })
  it('builds only fixed-collection transfers, with no value or blanket approvals', () => {
    const calls = transferCalls(from, to, [968, 1677])
    expect(calls).toHaveLength(2)
    for (const [index, call] of calls.entries()) {
      expect(call.to).toBe(GLOWBUD_CONTRACT); expect(call.value).toBe('0x0')
      expect(decodeFunctionData({ abi: GLOWBUD_ABI, data: call.data })).toEqual({ functionName: 'safeTransferFrom', args: [from, to, BigInt([968, 1677][index])] })
    }
  })
  it('reads old unresolved intents and strictly validates new saved departures', () => {
    expect(readDeparture({ from, to, token: 968 })).toMatchObject({ tokens: [968] })
    expect(readDeparture({ from, to, tokens: [968, 1677], fromBlock: '123', hash, callId: 'trip-a' })).toMatchObject({ tokens: [968, 1677], hash })
    for (const override of [{ fromBlock: '-1' }, { hash: 'bad' }, { callId: '' }, { tokens: [968, 968] }, { to: from }]) expect(() => readDeparture({ from, to, tokens: [968], ...override })).toThrow()
  })
  it('does not treat an ambiguous error message as a definitive user rejection', () => {
    expect(isWalletRejection(new Error('Server denied response after send'))).toBe(false)
    expect(isWalletRejection({ cause: { code: 4001 } })).toBe(true)
    expect(wasNotSubmitted({ cause: { code: 5740 } })).toBe(true)
    expect(wasNotSubmitted({ code: -32603, message: 'Internal error after broadcast' })).toBe(false)
  })
  it('the installed official AGW SDK encodes 50 zero-value calls with allowFailure false', () => {
    const tokens = Array.from({ length: 50 }, (_, i) => i + 1)
    const transaction = getBatchTransactionObject(from, { calls: transferCalls(from, to, tokens).map(call => ({ ...call, value: BigInt(0) })) })
    expect(transaction.to).toBe(from); expect(transaction.value).toBe(BigInt(0))
    const decoded = decodeFunctionData({ abi: parseAbi(['function batchCall((address target, bool allowFailure, uint256 value, bytes callData)[] calls) payable']), data: transaction.data })
    expect(decoded.args[0]).toHaveLength(50)
    for (const [index, call] of decoded.args[0].entries()) {
      expect(call.allowFailure).toBe(false); expect(call.value).toBe(BigInt(0)); expect(call.target.toLowerCase()).toBe(GLOWBUD_CONTRACT)
      expect(call.callData).toBe(transferData(from, to, tokens[index]))
    }
  })
  function bulkWallet(status = 'supported') {
    const request = vi.fn(async ({ method, params }: { method: string; params?: unknown }) => {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [from]
      if (method === 'eth_chainId') return '0xab5'
      if (method === 'wallet_getCapabilities') return { '0xab5': { atomic: { status } } }
      if (method === 'wallet_sendCalls') return { id: (params as [{ id: string }])[0].id }
      if (method === 'wallet_getCallsStatus') return { id: 'trip-a', chainId: '0xab5', atomic: true, status: 200, receipts: [{ transactionHash: hash }] }
      throw new Error(`Unexpected method ${method}`)
    })
    return { request, wallet: { id: 'bulk', name: 'Bulk wallet', source: 'eip6963' as const, icon: null, rdns: null, provider: { request } } }
  }
  it('uses one atomic wallet request for all passengers on Abstract', async () => {
    const f = bulkWallet(); const signer = await browserSigner(f.wallet)
    expect(await signer.supportsBatch!()).toBe(true)
    expect(await signer.sendBatch!([968, 1677], to, 'trip-a')).toEqual({ callId: 'trip-a' })
    const calls = f.request.mock.calls.filter(([call]) => call.method === 'wallet_sendCalls')
    expect(calls).toHaveLength(1)
    expect(calls[0][0].params).toEqual([{ id: 'trip-a', version: '2.0.0', from: from.toLowerCase(), chainId: '0xab5', atomicRequired: true, calls: transferCalls(from, to, [968, 1677]) }])
    expect(f.request.mock.calls.some(([call]) => call.method === 'eth_sendTransaction')).toBe(false)
    expect(await signer.batchStatus!('trip-a')).toEqual({ failed: false, hash })
  })
  it.each(['ready', 'unsupported', 'unknown'])('never silently upgrades or batches capability %s', async status => {
    const f = bulkWallet(status); const signer = await browserSigner(f.wallet)
    expect(await signer.supportsBatch!()).toBe(false)
    await expect(signer.sendBatch!([968, 1677], to, 'trip-a')).rejects.toThrow('no longer available')
    expect(f.request.mock.calls.some(([call]) => call.method === 'wallet_sendCalls')).toBe(false)
  })
  it('fails closed for an unrelated wallet batch response', async () => {
    const f = bulkWallet(); const signer = await browserSigner(f.wallet)
    await expect(signer.batchStatus!('another-trip')).rejects.toThrow('Waiting')
  })
})

function fixture() {
  let account = from, chain = '0xab5'
  const request = vi.fn(async ({ method, params }: { method: string; params?: unknown }) => {
    if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [account]
    if (method === 'eth_chainId') return chain
    if (method === 'wallet_switchEthereumChain') { chain = '0xab5'; return null }
    if (method === 'eth_sendTransaction') { expect(params).toEqual([{ from: from.toLowerCase(), to: GLOWBUD_CONTRACT, data: transferData(from, to, 968), value: '0x0', chainId: '0xab5' }]); return hash }
    throw new Error(`Unexpected method ${method}`)
  })
  return { wallet: { id: 'test', name: 'Test wallet', source: 'eip6963' as const, icon: null, rdns: null, provider: { request } }, request, account: (value: typeof from) => { account = value }, chain: (value: string) => { chain = value } }
}
describe('Independent sending wallet', () => {
  it('only requests accounts when connected, never a transaction', async () => {
    const f = fixture(); await browserSigner(f.wallet)
    expect(f.request.mock.calls.map(([r]) => r.method)).toEqual(['eth_requestAccounts'])
  })
  it('sends exactly the chosen token with zero native value and no approval', async () => {
    const f = fixture(); const signer = await browserSigner(f.wallet)
    expect(await signer.send(968, to)).toBe(hash)
    expect(f.request.mock.calls.filter(([r]) => r.method === 'eth_sendTransaction')).toHaveLength(1)
  })
  it('stops when the active sending account changes', async () => {
    const f = fixture(); const signer = await browserSigner(f.wallet); f.account(to)
    await expect(signer.send(968, to)).rejects.toThrow('sending account changed')
    expect(f.request.mock.calls.some(([r]) => r.method === 'eth_sendTransaction')).toBe(false)
  })
  it('stops if the network changes after review', async () => {
    const f = fixture(); const signer = await browserSigner(f.wallet); f.chain('0x1')
    await expect(signer.send(968, to)).rejects.toThrow('network changed')
    expect(f.request.mock.calls.some(([r]) => r.method === 'eth_sendTransaction')).toBe(false)
  })
  it('asks for the Abstract network rather than sending on Ethereum', async () => {
    const f = fixture(); const signer = await browserSigner(f.wallet); f.chain('0x1')
    await signer.ensureChain()
    expect(f.request.mock.calls.some(([r]) => r.method === 'wallet_switchEthereumChain')).toBe(true)
    expect(f.request.mock.calls.some(([r]) => r.method === 'eth_sendTransaction')).toBe(false)
  })
})
