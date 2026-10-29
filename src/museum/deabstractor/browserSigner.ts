import { getAddress, type Hex } from 'viem'
import { readWalletAccounts, requestWalletAccounts, type DiscoveredWallet } from '../wallet/eip1193Wallet'
import { ABSTRACT_CHAIN_ID, ABSTRACT_RPC, GLOWBUD_CONTRACT, TransferNotSubmittedError, transferCalls, transferData, type TransferSigner } from './transfer'

export async function browserSigner(wallet: DiscoveredWallet): Promise<TransferSigner> {
  const [address] = await requestWalletAccounts(wallet.provider)
  if (!address) throw new Error('No wallet account was connected.')
  const readAddress = async () => {
    const [current] = await readWalletAccounts(wallet.provider)
    return current ? getAddress(current) : null
  }
  const ensureChain = async () => {
    if (Number(await wallet.provider.request({ method: 'eth_chainId' })) !== ABSTRACT_CHAIN_ID) {
      try { await wallet.provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xab5' }] }) }
      catch (error) {
        if ((error as { code?: number }).code !== 4902) throw error
        await wallet.provider.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0xab5', chainName: 'Abstract', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: [ABSTRACT_RPC], blockExplorerUrls: ['https://abscan.org'] }] })
        await wallet.provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xab5' }] })
      }
    }
    if (Number(await wallet.provider.request({ method: 'eth_chainId' })) !== ABSTRACT_CHAIN_ID) throw new Error('Switch the sending wallet to Abstract.')
  }
  const assertSender = async () => {
    if ((await readAddress())?.toLowerCase() !== address.toLowerCase()) throw new TransferNotSubmittedError('The sending account changed. Reconnect the original sending wallet.')
    if (Number(await wallet.provider.request({ method: 'eth_chainId' })) !== ABSTRACT_CHAIN_ID) throw new TransferNotSubmittedError('The sending network changed. Review again on Abstract.')
  }
  const supportsBatch = async () => {
    try {
      const result = await wallet.provider.request({ method: 'wallet_getCapabilities', params: [address, ['0xab5']] }) as Record<string, { atomic?: { status?: string } }>
      // Do not silently upgrade an account that reports "ready"; that needs separate consent.
      return result?.['0xab5']?.atomic?.status === 'supported'
    } catch { return false }
  }
  return {
    address: getAddress(address), name: wallet.name, readAddress, ensureChain,
    supportsBatch,
    sendBatch: async (tokens, to, requestId) => {
      await assertSender()
      if (!await supportsBatch()) throw new TransferNotSubmittedError('Group approval is no longer available. Review your wallet before continuing.')
      const result = await wallet.provider.request({ method: 'wallet_sendCalls', params: [{ version: '2.0.0', id: requestId, from: address, chainId: '0xab5', atomicRequired: true, calls: transferCalls(address, to, tokens) }] }) as { id?: unknown }
      if (typeof result?.id !== 'string' || result.id !== requestId) throw new Error('The wallet reply was interrupted. Your departure will be checked automatically.')
      return { callId: result.id }
    },
    batchStatus: async id => {
      const result = await wallet.provider.request({ method: 'wallet_getCallsStatus', params: [id] }) as { id?: string; chainId?: string; atomic?: boolean; status?: number; receipts?: { transactionHash?: string }[] }
      if (result?.id !== id || Number(result.chainId) !== ABSTRACT_CHAIN_ID || result.atomic !== true) throw new Error('Waiting for the sending wallet to confirm this departure.')
      const receipts = result.receipts ?? []
      const hash = receipts.length === 1 && /^0x[0-9a-f]{64}$/i.test(receipts[0].transactionHash ?? '') ? receipts[0].transactionHash as Hex : undefined
      return { failed: result.status === 400 && receipts.length === 0, hash }
    },
    send: async (token, to) => {
      await assertSender()
      const hash = await wallet.provider.request({ method: 'eth_sendTransaction', params: [{ from: address, to: GLOWBUD_CONTRACT, data: transferData(address, to, token), value: '0x0', chainId: '0xab5' }] })
      if (typeof hash !== 'string' || !/^0x[0-9a-f]{64}$/i.test(hash)) throw new Error('The wallet reply was interrupted. Your departure will be checked automatically.')
      return hash as Hex
    },
  }
}
