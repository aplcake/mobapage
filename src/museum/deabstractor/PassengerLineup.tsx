'use client'

import { useEffect, useRef, useState } from 'react'
import { ImageOff, Monitor, UsersRound, X } from 'lucide-react'
import { MAX_PASSENGERS, portraitUrl } from './transfer'
import styles from './TransferDesk.module.css'

type Props = {
  tokens: number[]
  focusedToken: number
  disabled: boolean
  onPreview: (token: number) => void
  onRemove?: (token: number) => void
}

export function PassengerLineup({ tokens, focusedToken, disabled, onPreview, onRemove }: Props) {
  const list = useRef<HTMLUListElement>(null)
  useEffect(() => {
    const strip = list.current
    const active = strip?.querySelector<HTMLElement>('[data-focused=true]')
    if (!strip || !active) return
    const bounds = strip.getBoundingClientRect(), ticket = active.getBoundingClientRect()
    if (ticket.right > bounds.right) strip.scrollLeft += ticket.right - bounds.right + 4
    else if (ticket.left < bounds.left) strip.scrollLeft -= bounds.left - ticket.left + 4
  }, [focusedToken, tokens.length])
  return <section className={styles.lineup} aria-label="Selected passengers">
    <div className={styles.lineupHeading}>
      <h3><UsersRound size={17} />Passengers <span>{tokens.length}/{MAX_PASSENGERS}</span></h3>
      {tokens.includes(focusedToken) && <span className={styles.screenLabel}><Monitor size={14} />#{focusedToken}</span>}
    </div>
    {tokens.length ? <ul ref={list} className={styles.passengers}>
      {tokens.map((token, index) => <li key={token} className={styles.passenger} data-focused={token === focusedToken}>
        <button className={styles.portraitButton} disabled={disabled} onClick={() => onPreview(token)} aria-label={`Preview Glowbud ${token} on machine`} aria-pressed={token === focusedToken}>
          <PassengerPortrait token={token} />
          <span className={styles.seat}>{String(index + 1).padStart(2, '0')}</span>
          {token === focusedToken && <span className={styles.onScreen}><Monitor size={12} />On screen</span>}
        </button>
        <div className={styles.passengerFoot}><span>#{token}</span>{onRemove && <button disabled={disabled} onClick={() => onRemove(token)} aria-label={`Remove Glowbud ${token} from passengers`} title={`Remove #${token}`}><X size={15} /></button>}</div>
      </li>)}
    </ul> : <div className={styles.emptyLineup}><UsersRound size={22} /><span>No passengers selected</span></div>}
  </section>
}

function PassengerPortrait({ token }: { token: number }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className={styles.artUnavailable}><ImageOff size={22} /><span>Art unavailable</span></span>
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={portraitUrl(token)} alt="" width={80} height={80} onError={() => setFailed(true)} />
}
