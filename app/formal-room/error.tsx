'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import styles from './route-state.module.css'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Main Museum failed to open', error)
  }, [error])

  return (
    <main className={styles.routeState}>
      <span className={`${styles.seal} ${styles.errorSeal}`} aria-hidden="true">!</span>
      <strong>The gallery lights blinked out.</strong>
      <small>The museum is still standing. The tiny electrician is embarrassed.</small>
      <div className={styles.actions}>
        <button type="button" onClick={reset}>Try again</button>
        <Link href="/">Return to Main Museum</Link>
      </div>
    </main>
  )
}
