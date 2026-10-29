import { beforeEach, describe, expect, it, vi } from 'vitest'
import { encodeEventTopics, type Hex } from 'viem'
import { GLOWBUD_ABI, GLOWBUD_CONTRACT } from '../src/museum/deabstractor/transfer'

const mocks = vi.hoisted(() => ({
  abstract: { getChainId: vi.fn(), getBlockNumber: vi.fn(), getCode: vi.fn(), getLogs: vi.fn(), readContract: vi.fn(), simulateContract: vi.fn(), getTransactionReceipt: vi.fn() },
  ethereum: { getChainId: vi.fn(), getCode: vi.fn() },
}))
vi.mock('viem', async importOriginal => {
  const actual = await importOriginal<typeof import('viem')>()
  return { ...actual, createPublicClient: (options: { chain: { id: number } }) => options.chain.id === 2741 ? mocks.abstract : mocks.ethereum }
})
import { checkRecipient, departureStatus, inventory, preflight, preflightDeparture, publicCheckError, readSmallJson, requestGate, transferStatus } from '../src/museum/deabstractor/transferServer'

const from = '0x1111111111111111111111111111111111111111' as const
const to = '0x2222222222222222222222222222222222222222' as const
const hash = `0x${'a'.repeat(64)}` as Hex
const ticket = { from, to, token: 968, hash }
const upgradedAddress = '0x608e798d0Df4AABB9aE23CDc5fa6B7d42c3695e8' as const
const delegationCode = '0xef01007702cb554e6bfb442cb743a7df23154544a7176c'
beforeEach(() => {
  vi.resetAllMocks()
  mocks.abstract.getChainId.mockResolvedValue(2741)
  mocks.ethereum.getChainId.mockResolvedValue(1)
  mocks.abstract.getCode.mockResolvedValue('0x')
  mocks.ethereum.getCode.mockResolvedValue('0x')
  mocks.abstract.getBlockNumber.mockResolvedValue(BigInt(100))
  mocks.abstract.readContract.mockImplementation(async ({ functionName }) => functionName === 'balanceOf' ? BigInt(1) : functionName === 'ownerOf' ? from : true)
  mocks.abstract.getLogs.mockResolvedValue([{ args: { tokenId: BigInt(968) }, removed: false }])
})

describe('Automatic group verification', () => {
  const tokens = [968, 1677, 2000]
  const trip = { from, to, tokens, fromBlock: '90' }
  const receipt = () => ({ transactionHash: hash, status: 'success', blockNumber: BigInt(99), logs: tokens.map(token => ({ address: GLOWBUD_CONTRACT, data: '0x', topics: encodeEventTopics({ abi: GLOWBUD_ABI, eventName: 'Transfer', args: { from, to, tokenId: BigInt(token) } }) })) })
  it('preflights 50 passengers with one recipient check and a recovery block', async () => {
    expect(await preflightDeparture({ ...trip, tokens: Array.from({ length: 50 }, (_, i) => i + 1) })).toEqual({ ready: true, fromBlock: '100' })
    expect(mocks.abstract.simulateContract).toHaveBeenCalledTimes(50)
    expect(mocks.ethereum.getCode).toHaveBeenCalledTimes(1)
  })
  it('rejects oversized groups before any RPC work', async () => {
    await expect(preflightDeparture({ ...trip, tokens: Array.from({ length: 51 }, (_, i) => i + 1) })).rejects.toThrow('50')
    expect(mocks.abstract.getCode).not.toHaveBeenCalled()
  })
  it('verifies every token sharing one receipt and reads that receipt only once', async () => {
    mocks.abstract.getTransactionReceipt.mockResolvedValue(receipt())
    mocks.abstract.readContract.mockResolvedValue(to)
    const result = await departureStatus({ ...trip, hash })
    expect(result.complete).toBe(true); expect(result.records).toHaveLength(3)
    expect(result.records.every(record => record.status === 'confirmed' && record.atDestination)).toBe(true)
    expect(mocks.abstract.getTransactionReceipt).toHaveBeenCalledTimes(1)
    expect(mocks.abstract.getLogs).not.toHaveBeenCalled()
  })
  it('recovers an interrupted reply from exact logs after the saved block', async () => {
    mocks.abstract.getLogs.mockResolvedValue(tokens.map(token => ({ args: { from, to, tokenId: BigInt(token) }, transactionHash: hash, blockNumber: BigInt(99), removed: false })))
    mocks.abstract.getTransactionReceipt.mockResolvedValue(receipt())
    mocks.abstract.readContract.mockResolvedValue(to)
    expect((await departureStatus(trip)).complete).toBe(true)
    expect(mocks.abstract.getLogs).toHaveBeenCalledWith(expect.objectContaining({ address: GLOWBUD_CONTRACT, fromBlock: BigInt(90), args: { from, to, tokenId: tokens.map(BigInt) } }))
  })
  it('does not substitute ownership or an unrelated/removed/old event for transfer proof', async () => {
    mocks.abstract.getLogs.mockResolvedValue([
      { args: { from, to, tokenId: BigInt(968) }, transactionHash: hash, blockNumber: BigInt(89) },
      { args: { from, to, tokenId: BigInt(1677) }, transactionHash: hash, blockNumber: BigInt(99), removed: true },
      { args: { from: to, to, tokenId: BigInt(2000) }, transactionHash: hash, blockNumber: BigInt(99) },
    ])
    mocks.abstract.readContract.mockResolvedValue(to)
    expect(await departureStatus(trip)).toEqual({ complete: false, records: [] })
    expect(mocks.abstract.getTransactionReceipt).not.toHaveBeenCalled()
  })
  it('leaves missing token events unresolved even if the batch receipt succeeded', async () => {
    mocks.abstract.getTransactionReceipt.mockResolvedValue({ ...receipt(), logs: receipt().logs.slice(0, 2) })
    expect((await departureStatus({ ...trip, hash })).complete).toBe(false)
  })
  it('does not issue arrival before another block or after ownership changes', async () => {
    mocks.abstract.getTransactionReceipt.mockResolvedValue({ ...receipt(), blockNumber: BigInt(100) })
    expect((await departureStatus({ ...trip, hash })).complete).toBe(false)
    mocks.abstract.getBlockNumber.mockResolvedValue(BigInt(101))
    expect((await departureStatus({ ...trip, hash })).records.every(record => !record.atDestination)).toBe(true)
  })
  it('reports verified full reverts and retains pending receipts', async () => {
    mocks.abstract.getTransactionReceipt.mockResolvedValue({ ...receipt(), status: 'reverted', logs: [] })
    const failed = await departureStatus({ ...trip, hash })
    expect(failed.complete).toBe(true); expect(failed.records.every(record => record.status === 'reverted')).toBe(true)
    mocks.abstract.getTransactionReceipt.mockRejectedValue({ name: 'TransactionReceiptNotFoundError' })
    expect((await departureStatus({ ...trip, hash })).complete).toBe(false)
  })
  it('does not turn RPC failure into permission to send again', async () => {
    mocks.abstract.getLogs.mockRejectedValue(new Error('RPC offline'))
    await expect(departureStatus(trip)).rejects.toThrow('RPC offline')
  })
})
describe('Read-only transfer verification server', () => {
  it('checks both networks for receiving-account code', async () => {
    expect(await checkRecipient(to, from)).toMatchObject({ address: to, ethereumWalletType: 'standard' })
    expect(mocks.abstract.getCode).toHaveBeenCalledWith({ address: to })
    expect(mocks.ethereum.getCode).toHaveBeenCalledWith({ address: to })
  })
  it('accepts an Ethereum-upgraded personal wallet without an extra signature or transfer', async () => {
    mocks.ethereum.getCode.mockResolvedValue(delegationCode)
    expect(await checkRecipient(upgradedAddress, from)).toMatchObject({ address: upgradedAddress, ethereumWalletType: 'eip7702' })
    expect(mocks.abstract.simulateContract).not.toHaveBeenCalled()
    expect(mocks.abstract.readContract).not.toHaveBeenCalled()
  })
  it('recognizes other exact EIP-7702 delegations, not an address or implementation allowlist', async () => {
    mocks.ethereum.getCode.mockResolvedValue(`0xEF0100${'aB'.repeat(20)}`)
    const result = await checkRecipient(to, from)
    expect(result.ethereumWalletType).toBe('eip7702')
    expect(result.warning).toContain('does not prove address control')
    expect(result.warning).toContain('audit wallet code')
    expect(result.warning).not.toContain('No contract code was found')
  })
  it('accepts viem empty-code responses as well as explicit 0x', async () => {
    mocks.abstract.getCode.mockResolvedValue(undefined)
    mocks.ethereum.getCode.mockResolvedValue(undefined)
    expect((await checkRecipient(to, from)).ethereumWalletType).toBe('standard')
  })
  it('rejects Abstract contract wallets even when the Ethereum address is upgraded', async () => {
    mocks.abstract.getCode.mockResolvedValue('0x6001')
    mocks.ethereum.getCode.mockResolvedValue(delegationCode)
    await expect(checkRecipient(to, from)).rejects.toThrow('contract code on Abstract')
  })
  it('does not infer Ethereum delegation semantics from code on Abstract', async () => {
    mocks.abstract.getCode.mockResolvedValue(delegationCode)
    await expect(checkRecipient(to, from)).rejects.toThrow('contract code on Abstract')
  })
  it.each([
    '0x6001', '0xef0100', delegationCode.slice(0, -2), `${delegationCode}00`,
    `0xef0101${'ab'.repeat(20)}`, `0x60${delegationCode.slice(2)}`, `0xef0100${'0'.repeat(40)}`, `0xef0100${'zz'.repeat(20)}`,
  ])('rejects nonstandard or malformed Ethereum account code: %s', async code => {
    mocks.ethereum.getCode.mockResolvedValue(code)
    await expect(checkRecipient(to, from)).rejects.toThrow('unsupported contract wallet on Ethereum')
  })
  it('still rejects invalid and same-address destinations before RPC checks', async () => {
    await expect(checkRecipient(from, from)).rejects.toThrow('different receiving wallet')
    await expect(checkRecipient('0x0000000000000000000000000000000000000000', from)).rejects.toThrow('not a receiving wallet')
    expect(mocks.abstract.getCode).not.toHaveBeenCalled()
    expect(mocks.ethereum.getCode).not.toHaveBeenCalled()
  })
  it('fails closed if either chain or RPC fails', async () => {
    mocks.ethereum.getChainId.mockResolvedValue(11155111)
    await expect(checkRecipient(to, from)).rejects.toThrow('network check failed')
    mocks.ethereum.getChainId.mockResolvedValue(1); mocks.ethereum.getCode.mockRejectedValue(new Error('offline'))
    await expect(checkRecipient(to, from)).rejects.toThrow('offline')
  })
  it('confirms inventory against ownerOf and balanceOf at the same block', async () => {
    expect((await inventory(from)).tokenIds).toEqual([968])
    expect(mocks.abstract.readContract).toHaveBeenCalledWith(expect.objectContaining({ functionName: 'ownerOf', blockNumber: BigInt(100) }))
  })
  it('never presents a truncated inventory as complete', async () => {
    mocks.abstract.getLogs.mockResolvedValue([])
    await expect(inventory(from)).rejects.toThrow('incomplete inventory')
  })
  it('does not turn a broken ownership RPC into zero buds', async () => {
    mocks.abstract.readContract.mockRejectedValue(new Error('RPC unavailable'))
    await expect(inventory(from)).rejects.toThrow('RPC unavailable')
  })
  it('rejects stale ownership before simulation', async () => {
    mocks.abstract.readContract.mockImplementation(async ({ functionName }) => functionName === 'ownerOf' ? to : true)
    await expect(preflight(ticket)).rejects.toThrow('no longer in the sending wallet')
    expect(mocks.abstract.simulateContract).not.toHaveBeenCalled()
  })
  it('preflights the exact fixed collection transfer without sending anything', async () => {
    await expect(preflight(ticket)).resolves.toEqual({ ready: true })
    expect(mocks.abstract.simulateContract).toHaveBeenCalledWith(expect.objectContaining({ address: GLOWBUD_CONTRACT, functionName: 'safeTransferFrom', account: from, args: [from, to, BigInt(968)] }))
  })
  it('still simulates the exact Abstract transfer when Ethereum is upgraded', async () => {
    mocks.ethereum.getCode.mockResolvedValue(delegationCode)
    await expect(preflight({ ...ticket, to: upgradedAddress })).resolves.toEqual({ ready: true })
    expect(mocks.abstract.simulateContract).toHaveBeenCalledWith(expect.objectContaining({ address: GLOWBUD_CONTRACT, functionName: 'safeTransferFrom', account: from, args: [from, upgradedAddress, BigInt(968)] }))
  })
  it('rechecks wallet type at preflight instead of trusting an earlier approval', async () => {
    mocks.ethereum.getCode.mockResolvedValue(delegationCode)
    await checkRecipient(to, from)
    mocks.abstract.getCode.mockResolvedValue('0x6001')
    await expect(preflight(ticket)).rejects.toThrow('contract code on Abstract')
    expect(mocks.abstract.simulateContract).not.toHaveBeenCalled()
  })
  it('never bypasses a failed simulation for an upgraded wallet', async () => {
    mocks.ethereum.getCode.mockResolvedValue(delegationCode)
    mocks.abstract.simulateContract.mockRejectedValue(new Error('Transfer simulation reverted'))
    await expect(preflight(ticket)).rejects.toThrow('simulation reverted')
  })
  it('keeps a missing receipt pending and distinguishes network failure', async () => {
    mocks.abstract.getTransactionReceipt.mockRejectedValue({ name: 'TransactionReceiptNotFoundError' })
    await expect(transferStatus(ticket)).resolves.toEqual({ status: 'pending' })
    mocks.abstract.getTransactionReceipt.mockRejectedValue(new Error('RPC offline'))
    await expect(transferStatus(ticket)).rejects.toThrow('RPC offline')
  })
  it('requires another block, exact transfer log and current destination ownership', async () => {
    mocks.abstract.getTransactionReceipt.mockResolvedValue({ transactionHash: hash, status: 'success', blockNumber: BigInt(100), logs: [{ address: GLOWBUD_CONTRACT, data: '0x', topics: encodeEventTopics({ abi: GLOWBUD_ABI, eventName: 'Transfer', args: { from, to, tokenId: BigInt(968) } }) }] })
    await expect(transferStatus(ticket)).resolves.toEqual({ status: 'pending' })
    mocks.abstract.getBlockNumber.mockResolvedValue(BigInt(101))
    expect(await transferStatus(ticket)).toMatchObject({ status: 'confirmed', atDestination: false })
    mocks.abstract.readContract.mockResolvedValue(to)
    expect(await transferStatus(ticket)).toMatchObject({ status: 'confirmed', atDestination: true })
  })
  it('redacts private RPC URLs and library diagnostic payloads', () => {
    expect(publicCheckError(new Error('https://node.example/secret-key'))).not.toContain('secret-key')
    expect(publicCheckError(new Error('Problem\nprivate diagnostic'))).not.toContain('private diagnostic')
    expect(publicCheckError(new Error('Choose a different address.'))).toBe('Choose a different address.')
  })
  it('rejects cross-origin requests before touching networks', () => {
    expect(() => requestGate(new Request('https://museum.example/api/deabstractor/check', { headers: { origin: 'https://other.example' } }))).toThrow()
    expect(() => requestGate(new Request('https://museum.example/api/deabstractor/check', { headers: { 'sec-fetch-site': 'cross-site' } }))).toThrow()
  })
  it('limits bodies before parsing, including bodies without content-length', async () => {
    await expect(readSmallJson(new Request('https://museum.example', { method: 'POST', body: 'a'.repeat(2049) }))).rejects.toThrow('too large')
    await expect(readSmallJson(new Request('https://museum.example', { method: 'POST', body: '[]' }))).rejects.toThrow('Invalid')
    await expect(readSmallJson(new Request('https://museum.example', { method: 'POST', body: '{"action":"status"}' }))).resolves.toEqual({ action: 'status' })
  })
})
