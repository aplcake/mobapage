'use client'

import Link from 'next/link'
import { RotateCcw, ArrowLeft } from 'lucide-react'
import styles from '../../src/museum/deabstractor/RoomError.module.css'

export default function Error({ reset }: { reset: () => void }) {
  return <main className={styles.error}>
    <span className={styles.brand}>MoBA / DE-ABSTRACTOR</span>
    <h1>The apparatus needs a breather.</h1>
    <p>Try opening the room again. If you already sent a transfer, its status will be checked when you return. Do not send it again.</p>
    <div className={styles.actions}>
      <button onClick={reset}><RotateCcw size={18} />Reopen the room</button>
      <Link href="/" prefetch={false}><ArrowLeft size={18} />Main Museum</Link>
    </div>
  </main>
}
