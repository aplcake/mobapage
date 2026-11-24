'use client'

import { useEffect, useRef, useState } from 'react'
import { abstractProvider, connectAbstract } from './abstractSigner'
import type { TransferSigner } from './transfer'

export default function AbstractLogin({ onConnect, onInvalid }: { onConnect: (signer: TransferSigner) => void; onInvalid: () => void }) {
  const provider = useRef<ReturnType<typeof abstractProvider> | null>(null)
  const connected = useRef(false)
  const active = useRef(false)
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => {
    active.current = true
    const wallet = provider.current ??= abstractProvider()
    const invalidate = () => {
      if (connected.current) { connected.current = false; onInvalid() }
    }
    wallet.on('disconnect', invalidate)
    wallet.on('chainChanged', invalidate)
    wallet.on('accountsChanged', invalidate)
    return () => {
      active.current = false
      wallet.removeListener('disconnect', invalidate)
      wallet.removeListener('chainChanged', invalidate)
      wallet.removeListener('accountsChanged', invalidate)
    }
  }, [onInvalid])
  async function login() {
    if (!provider.current || pending.current) return
    pending.current = true; setBusy(true); setError(false)
    try {
      const signer = await connectAbstract(provider.current)
      if (active.current) { connected.current = true; onConnect(signer) }
    } catch { if (active.current) setError(true) }
    finally { pending.current = false; if (active.current) setBusy(false) }
  }
  return <><button type="button" onClick={login} disabled={busy}>{busy ? 'Opening Abstract...' : 'Sign in with Abstract'}</button>{error && <p role="alert">Abstract login could not finish. Try again in this browser.</p>}</>
}
