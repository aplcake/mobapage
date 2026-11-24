import { createAbstractClient } from '@abstract-foundation/agw-client'
import { toPrivyWalletProvider } from '@privy-io/cross-app-connect'
import { custom, getAddress, isHash, type Address } from 'viem'
import { abstract } from 'viem/chains'
import { GLOWBUD_ABI, GLOWBUD_CONTRACT, TransferNotSubmittedError, transferCalls, type TransferSigner } from './transfer'

// Public provider ID from Abstract's official agw-react connector. Privy resolves
// the wallet's login and signing origins; the page never accepts URL overrides.
export const abstractProvider = () => toPrivyWalletProvider({ providerAppId: 'cm04asygd041fmry9zmcyn5o5', chains: [abstract], chainId: abstract.id })

export async function connectAbstract(provider: ReturnType<typeof abstractProvider>): Promise<TransferSigner> {
  await provider.request({ method: 'eth_requestAccounts' })
  const [selected] = await provider.request({ method: 'eth_accounts' })
  if (!selected) throw new Error('No Abstract account connected.')
  const signer = getAddress(selected)
  const ensureChain = async () => {
    if (Number(await provider.request({ method: 'eth_chainId' })) !== abstract.id) throw new TransferNotSubmittedError('Reconnect on Abstract before continuing.')
  }
  await ensureChain()
  const client = await createAbstractClient({ signer: { type: 'json-rpc', address: signer }, chain: abstract, transport: custom(provider, { retryCount: 0 }), isPrivyCrossApp: true })
  // Privy exposes the signer, not the ERC-721 owner. AGW derives the actual
  // smart-wallet address. Never use the underlying signer as the NFT source.
  const address = client.account.address
  const readAddress = async () => {
    const [current] = await provider.request({ method: 'eth_accounts' })
    return current && getAddress(current) === signer ? address : null
  }
  const check = async () => {
    if (!(await readAddress())) throw new TransferNotSubmittedError('The sending account changed. Reconnect before continuing.')
    await ensureChain()
  }
  await check()
  return {
    name: 'Abstract Global Wallet', address, readAddress, ensureChain, supportsBatch: async () => true,
    async sendBatch(tokens, to) {
      await check()
      const { id } = await client.sendCalls({ calls: transferCalls(address, to, tokens).map(call => ({ ...call, value: BigInt(0) })) })
      if (!isHash(id)) throw new Error('Waiting for Abstract to confirm this departure.')
      return { hash: id }
    },
    async send(token: number, to: Address) {
      await check()
      return client.writeContract({ address: GLOWBUD_CONTRACT, abi: GLOWBUD_ABI, functionName: 'safeTransferFrom', args: [address, to, BigInt(token)] })
    },
  }
}
