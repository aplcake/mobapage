'use client'
import dynamic from 'next/dynamic'
import { useCallback, useState } from 'react'
import { TransferDesk } from './TransferDesk'
import { ApparatusLoading } from './ApparatusLoading'
import type { TransferTicket, WalletInspection, VerifiedArrival } from './transfer'
import { EMPTY_JOURNEY, type LiveJourney } from './liveJourney'
const Experience = dynamic(() => import('./DeabstractorExperience'), { ssr: false, loading: () => <ApparatusLoading live /> })

export default function DeabstractorLive() {
  const [token, setToken] = useState(968)
  const [confirmed, setConfirmed] = useState<VerifiedArrival | null>(null)
  const [cinematic, setCinematic] = useState(false)
  const [ready, setReady] = useState(false)
  const [journey, setJourney] = useState<LiveJourney>(EMPTY_JOURNEY)
  const progress = useCallback((next: LiveJourney) => {
    setJourney(next)
    setConfirmed(current => {
      if (!current) return null
      if (next.id) return next.phase === 'confirmed' ? current : null
      // Finishing the read-only wallet check also clears the desk's busy state.
      // That staging update must not erase the inspection that just completed.
      return !('hash' in current) && next.tokens.includes(current.token) ? current : null
    })
  }, [])
  const sceneReady = useCallback(() => setReady(true), [])
  const finish = useCallback(() => setCinematic(false), [])
  const confirm = useCallback((ticket: TransferTicket) => { setConfirmed(ticket) }, [])
  const inspect = useCallback((inspection: WalletInspection) => { setToken(inspection.token); setConfirmed(inspection) }, [])
  const started = useCallback(() => setCinematic(true), [])
  return <>
    <Experience live={{ token, confirmed, journey, onReady: sceneReady, onStarted: started, onFinished: finish }} />
    {ready && <TransferDesk focusedToken={token} onToken={setToken} onConfirmed={confirm} onChecked={inspect} onJourney={progress} cinematic={cinematic} />}
  </>
}
