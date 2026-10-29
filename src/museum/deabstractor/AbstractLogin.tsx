'use client'

import { AbstractWalletProvider, useAbstractClient, useLoginWithAbstract } from '@abstract-foundation/agw-react'
import { QueryClient } from '@tanstack/react-query'
import { useAccount, useConnect } from 'wagmi'
import { useEffect, useRef, useState } from 'react'
import { abstract } from 'viem/chains'
import { GLOWBUD_ABI, GLOWBUD_CONTRACT, TransferNotSubmittedError, transferCalls, type TransferSigner } from './transfer'

type Props = { onConnect: (signer: TransferSigner) => void; onInvalid: () => void }
function Login({ onConnect, onInvalid }: Props) {
  const { login } = useLoginWithAbstract()
  const { address, connector, status } = useAccount()
  const { error, isPending } = useConnect()
  const { data: client, error: clientError } = useAbstractClient()
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (!client || !address || !connector) {
      if (last.current && status === 'disconnected') { last.current = null; onInvalid() }
      return
    }
    if (last.current === address) return
    last.current = address
    onConnect({
      address: client.account.address,
      name: 'Abstract Global Wallet',
      readAddress: async () => (await connector.getAccounts())[0] ?? null,
      ensureChain: async () => { if (await connector.getChainId() !== abstract.id) throw new Error('Reconnect Abstract Global Wallet on Abstract.') },
      supportsBatch: async () => true,
      sendBatch: async (tokens, to) => {
        if ((await connector.getAccounts())[0]?.toLowerCase() !== client.account.address.toLowerCase()) throw new TransferNotSubmittedError('The sending account changed. Reconnect before continuing.')
        if (await connector.getChainId() !== abstract.id) throw new TransferNotSubmittedError('Reconnect Abstract Global Wallet on Abstract.')
        // The installed official AGW client returns the atomic transaction hash as its call id.
        const { id } = await client.sendCalls({ calls: transferCalls(client.account.address, to, tokens).map(call => ({ ...call, value: BigInt(0) })) })
        if (!/^0x[0-9a-f]{64}$/i.test(id)) throw new Error('The wallet reply was interrupted. Your departure will be checked automatically.')
        return { hash: id as `0x${string}` }
      },
      send: async (token, to) => {
        if ((await connector.getAccounts())[0]?.toLowerCase() !== client.account.address.toLowerCase()) throw new TransferNotSubmittedError('The sending account changed. Reconnect before continuing.')
        if (await connector.getChainId() !== abstract.id) throw new TransferNotSubmittedError('Reconnect Abstract Global Wallet on Abstract.')
        return client.writeContract({ address: GLOWBUD_CONTRACT, abi: GLOWBUD_ABI, functionName: 'safeTransferFrom', args: [client.account.address, to, BigInt(token)] })
      },
    })
  }, [client, address, connector, status, onConnect, onInvalid])
  return <><button type="button" onClick={login} disabled={isPending}>{isPending ? 'Opening Abstract...' : 'Sign in with Abstract'}</button>{(error || clientError) && <p role="alert">Abstract login could not finish. Try again in this browser.</p>}</>
}

export default function AbstractLogin(props: Props) {
  const [queryClient] = useState(() => new QueryClient())
  return <AbstractWalletProvider chain={abstract} queryClient={queryClient}><Login {...props} /></AbstractWalletProvider>
}
