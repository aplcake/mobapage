import { beforeEach, describe, expect, it, vi } from 'vitest'
import { connectAbstract, type abstractProvider } from '../src/museum/deabstractor/abstractSigner'
import { transferData, GLOWBUD_CONTRACT } from '../src/museum/deabstractor/transfer'

const signer = '0x1111111111111111111111111111111111111111'
const owner = '0x2222222222222222222222222222222222222222'
const destination = '0x3333333333333333333333333333333333333333'
const hash = '0x' + 'a'.repeat(64)
const sdk = vi.hoisted(() => ({ writeContract: vi.fn(), sendCalls: vi.fn() }))
vi.mock('@abstract-foundation/agw-client', () => ({
  createAbstractClient: vi.fn(async () => ({ account: { address: owner }, ...sdk })),
}))
beforeEach(() => { vi.clearAllMocks(); sdk.sendCalls.mockResolvedValue({ id: hash }); sdk.writeContract.mockResolvedValue(hash) })
function fixture() {
  const state = { accounts: [signer], chain: '0xab5' }
  const request = vi.fn(async ({ method }: { method: string }) => {
    if (method === 'eth_requestAccounts') return undefined
    if (method === 'eth_accounts') return state.accounts
    if (method === 'eth_chainId') return state.chain
    throw new Error('Unexpected provider request')
  })
  return { state, connect: () => connectAbstract({ request } as unknown as ReturnType<typeof abstractProvider>) }
}
describe('Abstract wallet adapter', () => {
  it('first login reads the derived smart wallet, never the underlying signer', async () => {
    const wallet = await fixture().connect()
    expect(wallet.address).toBe(owner)
    expect(await wallet.readAddress()).toBe(owner)
    expect(sdk.writeContract).not.toHaveBeenCalled()
    expect(sdk.sendCalls).not.toHaveBeenCalled()
    expect(await wallet.send(968, destination)).toBe(hash)
    expect(sdk.writeContract).toHaveBeenCalledWith(expect.objectContaining({ address: GLOWBUD_CONTRACT, functionName: 'safeTransferFrom', args: [owner, destination, BigInt(968)] }))
  })
  it('submits one fixed-collection zero-value group and requires its transaction hash', async () => {
    const wallet = await fixture().connect()
    expect(await wallet.sendBatch!([968, 20], destination, 'trip')).toEqual({ hash })
    expect(sdk.sendCalls).toHaveBeenCalledWith({ calls: [968, 20].map(id => ({ data: transferData(owner, destination, id), to: GLOWBUD_CONTRACT, value: BigInt(0) })) })
    sdk.sendCalls.mockResolvedValueOnce({ id: 'interrupted' })
    await expect(wallet.sendBatch!([968], destination, 'trip')).rejects.toThrow()
  })
  it.each(['account', 'chain', 'disconnect'])('stops single and group submissions on %s change', async change => {
    const f = fixture(), wallet = await f.connect()
    if (change === 'chain') f.state.chain = '0x1'
    else f.state.accounts = change === 'account' ? [destination] : []
    await expect(wallet.send(968, destination)).rejects.toThrow()
    await expect(wallet.sendBatch!([968, 20], destination, 'trip')).rejects.toThrow()
    expect(sdk.sendCalls).not.toHaveBeenCalled()
    expect(sdk.writeContract).not.toHaveBeenCalled()
  })
})
