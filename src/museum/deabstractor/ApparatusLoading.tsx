'use client'

import { ArrowLeft, ChevronLeft, ChevronRight, Power, RotateCcw, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import styles from './ApparatusLoading.module.css'

type LoadingPhase = 'boot' | 'scene' | 'portrait' | 'failed'
const STATUS: Record<LoadingPhase, string> = {
  boot: 'Warming up the apparatus',
  scene: 'Setting the stage',
  portrait: 'Finding your little bud',
  failed: 'Portrait unavailable.',
}

// Intentionally independent of Three.js: this can appear before the scene bundle arrives.
export function ApparatusLoading({ phase = 'boot', portraitSrc = '/deabstractor/glowbud-968.png', token = 968, leaving = false, onRetry, onChooseToken, onContinue, live = false }: {
  phase?: LoadingPhase; portraitSrc?: string; token?: number; leaving?: boolean; onRetry?: () => void; onChooseToken?: (direction: number) => void; onContinue?: () => void; live?: boolean
}) {
  const [slow, setSlow] = useState(false)
  const [failedImage, setFailedImage] = useState<string | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 20000)
    return () => clearTimeout(timer)
  }, [])
  const failed = phase === 'failed'
  const message = leaving ? 'Ready for departure' : STATUS[phase]

  return <div className={styles.loading} data-leaving={leaving} data-failed={failed} data-recovery={failed || slow} aria-label="De-Abstractor loading" aria-busy={!leaving && !failed}>
    <header className={styles.header}>
      <Link href="/" prefetch={false} className={styles.back} aria-label="Return to museum" title="Return to museum"><ArrowLeft size={20} /></Link>
      <span className={styles.disclaimer}>{live ? 'Abstract wallet-to-wallet transfers' : 'Demo. No assets move.'}</span>
    </header>
    <div className={styles.content}>
      <div className={styles.apparatus} aria-hidden="true">
        <div className={styles.beacon}><span /></div>
        <div className={styles.cabinet}>
          <span className={styles.maker}>GLOWBUDS</span>
          <span className={styles.serial}>3000</span>
          <div className={styles.bezel}>
            <div className={styles.screen}>
              <span className={styles.token}>#{token}</span>
              <Power className={styles.screenPower} size={38} strokeWidth={1.5} />
              {/* Preserve the original pixel artwork, including its square background. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.portrait} src={portraitSrc} width={112} height={112} alt="" draggable={false}
                style={{ opacity: failedImage === portraitSrc ? 0 : 1 }} onError={() => setFailedImage(portraitSrc)} />
              <div className={styles.scan} />
              <span className={styles.screenCorner} />
            </div>
          </div>
          <div className={styles.switchboard}>
            <span className={styles.power}><Power size={20} /></span>
            <div className={styles.lamps}><i /><i /><i /><i /><i /></div>
            <span className={styles.vent}><i /><i /><i /></span>
          </div>
          <span className={styles.boltLeft} /><span className={styles.boltRight} />
        </div>
        <div className={styles.feet}><span /><span /></div>
        <div className={styles.plinth} />
      </div>
      <div className={styles.copy}>
        <h1>De-Abstractor<span>3000</span></h1>
        <p role="status" aria-live="polite" aria-atomic="true">{message}</p>
        {!leaving && failed && onRetry ? <div className={styles.recovery}>
          {onChooseToken && <button className={styles.back} onClick={() => onChooseToken(-1)} aria-label="Previous Glowbud" title="Previous bud"><ChevronLeft size={20} /></button>}
          <button className={styles.retry} onClick={onRetry} aria-label="Retry portrait"><RotateCcw size={18} />Retry</button>
          {onChooseToken && <button className={styles.back} onClick={() => onChooseToken(1)} aria-label="Next Glowbud" title="Next bud"><ChevronRight size={20} /></button>}
        </div>
          : !leaving && slow && <button className={styles.retry} onClick={() => window.location.reload()} aria-label="Reload apparatus"><RotateCcw size={18} />Reload</button>}
        {live && onContinue && !leaving && (failed || slow) && <button className={styles.retry} onClick={onContinue}><Wallet size={18} />Open wallet desk</button>}
      </div>
    </div>
  </div>
}
