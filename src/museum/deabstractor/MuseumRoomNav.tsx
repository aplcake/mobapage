'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Flame, Menu, Sun, Ticket } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import type { LiveJourney } from './liveJourney'
import { ROOM_EXIT_WARNING, shouldConfirmRoomExit } from './roomNavigation'
import styles from './MuseumRoomNav.module.css'

export function MuseumRoomNav({ journey, receiptOpen = false }: { journey?: LiveJourney; receiptOpen?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const canLeave = useCallback(() => !shouldConfirmRoomExit(journey) || window.confirm(ROOM_EXIT_WARNING), [journey])
  const navigate = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!canLeave()) event.preventDefault()
    else setOpen(false)
  }
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== 'Escape' || receiptOpen) return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [role="dialog"], dialog'))) return
      event.preventDefault()
      if (open) { setOpen(false); toggle.current?.focus() }
      else if (canLeave()) router.push('/')
    }
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false)
    }
    window.addEventListener('keydown', escape)
    window.addEventListener('pointerdown', outside)
    return () => { window.removeEventListener('keydown', escape); window.removeEventListener('pointerdown', outside) }
  }, [canLeave, open, receiptOpen, router])

  return <nav ref={root} className={styles.navigation} aria-label="De-Abstractor museum navigation">
    <Link href="/" prefetch={false} className={styles.back} onClick={navigate} aria-label="Return to museum" title="Main Museum (Esc)"><ArrowLeft size={17} /><span>Main Museum</span></Link>
    <button ref={toggle} type="button" className={styles.toggle} onClick={() => setOpen(value => !value)} aria-label="Open museum areas" aria-expanded={open} aria-controls="deabstractor-room-menu"><Menu size={19} /></button>
    {open && <div id="deabstractor-room-menu" className={styles.panel}>
      <div className={styles.brand}>MoBA <span>ROOMS</span></div>
      <Link href="/" prefetch={false} onClick={navigate}><ArrowLeft size={17} />Main Museum</Link>
      <Link href="/courtyard" prefetch={false} onClick={navigate}><Sun size={17} />Courtyard</Link>
      <Link href="/burn-room" prefetch={false} onClick={navigate}><Flame size={17} />Burn Room</Link>
      <span className={styles.current} aria-current="page"><Ticket size={17} />De-Abstractor</span>
    </div>}
  </nav>
}
