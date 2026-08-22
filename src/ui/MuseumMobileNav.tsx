'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function MuseumMobileNav({ roomName }: { roomName: string }) {
  const router = useRouter()

  useEffect(() => {
    const returnToMuseum = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      router.push('/')
    }

    window.addEventListener('keydown', returnToMuseum)
    return () => window.removeEventListener('keydown', returnToMuseum)
  }, [router])

  return (
    <nav className="museumMobileNav" aria-label={`${roomName} navigation`}>
      <Link href="/" className="museumMobileNavLink" title="Return to Main Museum (Esc)">
        <span aria-hidden="true">&larr;</span>
        Main Museum
        <kbd className="museumDesktopExitKey" aria-hidden="true">Esc</kbd>
      </Link>
      <span className="museumMobileRoomName">{roomName}</span>
    </nav>
  )
}
