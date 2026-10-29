'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { ArrowLeft, ChevronLeft, ChevronRight, FileSearch, LoaderCircle, Pause, Play, RotateCcw, ShieldCheck, SkipForward, Volume2, VolumeX } from 'lucide-react'
import Link from 'next/link'
import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { ApparatusScene, type SceneClock } from './ApparatusScene'
import { ApparatusAudio } from './audio'
import { advanceClock, artworkFor, BEAT_COPY, DEMO_BUDS, durationFor, getBeat, type Beat, type Procedure } from './sequence'
import styles from './Deabstractor.module.css'
import { canInspectReceipt } from './receiptView'
import { ApparatusLoading } from './ApparatusLoading'
import { portraitUrl, type VerifiedArrival } from './transfer'
import { advanceJourney, journeyCleared, journeyCopy, journeyGate, journeyStopped, type LiveJourney } from './liveJourney'

declare global {
  interface Window {
    __DEABSTRACTOR__?: () => { elapsed: number; beat: Beat; procedure: Procedure; artwork: 'safe' | 'not-safe'; running: boolean; reducedMotion: boolean; token: number; mode: 'cinematic-preview' | 'live-transfer'; journey?: LiveJourney; holding?: boolean }
    __DEABSTRACTOR_AUDIO__?: () => ReturnType<ApparatusAudio['diagnostics']> | undefined
  }
}

function SceneUnavailable({ onFailure }: { onFailure: () => void }) {
  useEffect(onFailure, [onFailure])
  return <div className={styles.fallback} role="alert"><h2>The apparatus needs a breather.</h2><p>The 3D scene could not start. Try reloading in a browser with WebGL enabled.</p><button onClick={() => window.location.reload()}>Reload</button></div>
}

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <SceneUnavailable onFailure={this.props.onFailure} />
    return this.props.children
  }
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'
const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia(REDUCED_QUERY)
  query.addEventListener('change', notify)
  return () => query.removeEventListener('change', notify)
}
const readMotion = () => window.matchMedia(REDUCED_QUERY).matches

function FirstSceneFrame({ enabled, onReady }: { enabled: boolean; onReady: () => void }) {
  const scheduled = useRef(false)
  const frame = useRef(0)
  useEffect(() => () => { cancelAnimationFrame(frame.current); scheduled.current = false }, [])
  useFrame(() => {
    if (!enabled || scheduled.current) return
    scheduled.current = true
    // useFrame runs before drawing; report readiness on the following browser frame.
    frame.current = requestAnimationFrame(onReady)
  })
  return null
}

// One decoded portrait supplies both the CRT and carrier; stale requests cannot replace a new selection.
function usePassengerPortrait(token: number, isLive = false) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ token: number; attempt: number; image: HTMLImageElement | null; failed: boolean } | null>(null)
  useEffect(() => {
    const bitmap = new Image()
    let active = true
    const finish = (failed: boolean) => {
      if (!active) return
      active = false
      clearTimeout(timeout)
      setResult({ token, attempt, image: failed ? null : bitmap, failed })
    }
    const timeout = setTimeout(() => finish(true), 12000)
    bitmap.onload = () => finish(false)
    bitmap.onerror = () => finish(true)
    bitmap.src = `${isLive ? portraitUrl(token) : `/deabstractor/glowbud-${token}.png`}${attempt ? `?retry=${attempt}` : ''}`
    return () => { active = false; clearTimeout(timeout); bitmap.onload = null; bitmap.onerror = null }
  }, [token, attempt, isLive])
  const current = result?.token === token && result.attempt === attempt ? result : null
  return { image: current?.image ?? null, failed: current?.failed ?? false, src: `${isLive ? portraitUrl(token) : `/deabstractor/glowbud-${token}.png`}${attempt ? `?retry=${attempt}` : ''}`, retry: () => setAttempt(value => value + 1) }
}

type LiveScene = { token: number; confirmed: VerifiedArrival | null; journey: LiveJourney; onReady: () => void; onStarted: () => void; onFinished: () => void }
export default function DeabstractorExperience({ live }: { live?: LiveScene }) {
  const [tokenIndex, setTokenIndex] = useState(0)
  const [beat, setBeat] = useState<Beat>('standby')
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [sound, setSound] = useState(true)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [sceneFailed, setSceneFailed] = useState(false)
  const [frameReady, setFrameReady] = useState(false)
  const [introVisible, setIntroVisible] = useState(true)
  const [procedure, setProcedure] = useState<Procedure>('evacuation')
  const [artwork, setArtwork] = useState<'safe' | 'not-safe'>('not-safe')
  const [inspectingReceipt, setInspectingReceipt] = useState(false)
  const receiptView = useRef(false)
  const receiptWasOpen = useRef(false)
  const inspectButton = useRef<HTMLButtonElement>(null)
  const returnButton = useRef<HTMLButtonElement>(null)
  const reduced = useSyncExternalStore(subscribeMotion, readMotion, () => false)
  const clock = useRef<SceneClock>({ elapsed: 0, running: false, paused: false, procedure: 'evacuation', reducedMotion: false })
  const attention = useRef(false)
  const pausedRef = useRef(false)
  const audio = useRef<ApparatusAudio | null>(null)
  const mainButton = useRef<HTMLButtonElement>(null)
  const playbackButton = useRef<HTMLButtonElement>(null)
  const token = live?.token ?? DEMO_BUDS[tokenIndex]
  const sceneProof = live?.confirmed && (live.journey.id
    ? journeyCleared(live.journey) && live.journey.tokens.includes(token)
    : live.confirmed.token === token) ? live.confirmed : undefined
  const isLive = Boolean(live)
  const portrait = usePassengerPortrait(token, Boolean(live))
  const playedHash = useRef<string | null>(null)
  const playedJourney = useRef<string | null>(null)
  const ready = Boolean(canvas && frameReady && portrait.image && !sceneFailed)
  const loading = introVisible && !sceneFailed
  const markFrameReady = useCallback(() => setFrameReady(true), [])
  const tokenRef = useRef<number>(token)
  const lastBeat = useRef<Beat>('standby')
  const lastArtwork = useRef<'safe' | 'not-safe'>('not-safe')

  useEffect(() => {
    if (!isLive || live?.journey.id) return
    clock.current.elapsed = 0
    clock.current.running = false
    clock.current.paused = false
    receiptView.current = false
    pausedRef.current = false
    audio.current?.halt()
    lastBeat.current = 'standby'
    lastArtwork.current = 'not-safe'
    // Synchronize the visible status with the external scene clock when the real passenger changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBeat('standby')
    setArtwork('not-safe'); setRunning(false); setPaused(false); setInspectingReceipt(false)
  }, [token, isLive, live?.journey.id])

  useEffect(() => { clock.current.journey = live?.journey }, [live?.journey])

  useEffect(() => { clock.current.reducedMotion = reduced }, [reduced])
  useEffect(() => {
    if (!ready || !introVisible) return
    const timer = setTimeout(() => setIntroVisible(false), reduced ? 0 : 220)
    return () => clearTimeout(timer)
  }, [ready, introVisible, reduced])
  useEffect(() => { tokenRef.current = token }, [token])
  useEffect(() => { if (beat === 'complete') mainButton.current?.focus({ preventScroll: true }) }, [beat])
  useEffect(() => { if (running) playbackButton.current?.focus({ preventScroll: true }) }, [running])
  const closeReceipt = useCallback(() => {
    receiptView.current = false
    setInspectingReceipt(false)
    audio.current?.tick()
  }, [])
  useEffect(() => {
    if (!inspectingReceipt) {
      if (receiptWasOpen.current) inspectButton.current?.focus({ preventScroll: true })
      receiptWasOpen.current = false
      return
    }
    receiptWasOpen.current = true
    returnButton.current?.focus({ preventScroll: true })
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeReceipt() }
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [inspectingReceipt, closeReceipt])
  const inspectReceipt = useCallback(() => {
    const state = clock.current
    if (!ready || !canInspectReceipt(state.elapsed, state.procedure, state.running) || receiptView.current) return
    attention.current = false
    receiptView.current = true
    setInspectingReceipt(true)
    audio.current?.tick()
  }, [ready])
  const failScene = useCallback(() => {
    clock.current.running = false
    clock.current.paused = true
    pausedRef.current = true
    audio.current?.stop()
    receiptView.current = false
    setInspectingReceipt(false)
    setRunning(false)
    setSceneFailed(true)
  }, [])
  useEffect(() => {
    if (!canvas) return
    const lost = (event: Event) => { event.preventDefault(); failScene() }
    canvas.addEventListener('webglcontextlost', lost)
    return () => canvas.removeEventListener('webglcontextlost', lost)
  }, [canvas, failScene])

  useEffect(() => {
    const player = new ApparatusAudio()
    audio.current = player
    player.prepare()
    const unlock = () => { void audio.current?.unlock().catch(() => {}) }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    let frame = 0
    let lastTime = 0
    const update = (time: number) => {
      const state = clock.current
      const delta = lastTime ? (time - lastTime) / 1000 : 0
      lastTime = time
      if (!state.paused && !document.hidden) state.ambient = (state.ambient ?? 0) + Math.min(delta, .08)
      if (state.running && !pausedRef.current) {
        const journey = state.procedure === 'evacuation' ? state.journey : undefined
        state.elapsed = journey?.id ? advanceJourney(state.elapsed, delta, journey, document.hidden) : advanceClock(state.elapsed, delta, state.procedure, document.hidden)
        state.holding = Boolean(journey?.id && !journeyCleared(journey) && state.elapsed >= journeyGate(journey))
        if (journeyStopped(journey) && state.elapsed === 0) {
          state.running = false; state.holding = false
          audio.current?.halt(); setRunning(false)
        }
        const next = getBeat(state.elapsed, state.procedure, state.running)
        if (next !== lastBeat.current) {
          lastBeat.current = next
          setBeat(next)
        }
        const nextArtwork = artworkFor(state.elapsed, state.procedure)
        if (nextArtwork !== lastArtwork.current) { lastArtwork.current = nextArtwork; setArtwork(nextArtwork) }
        if (next === 'complete') {
          state.running = false
          setRunning(false)
        }
      }
      if (!state.paused && !document.hidden) {
        const dt = Math.min(delta, .08)
        state.holdTime = (state.holdTime ?? 0) + (state.holding ? dt : 0)
        state.waitBlend = (state.waitBlend ?? 0) + ((state.holding ? 1 : 0) - (state.waitBlend ?? 0)) * (1 - Math.exp(-dt * 5))
      }
      audio.current?.sync(state.elapsed, state.running, Boolean(state.holding || journeyStopped(state.journey)))
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    const syncVisibility = () => audio.current?.setPaused(document.hidden || pausedRef.current)
    document.addEventListener('visibilitychange', syncVisibility)
    window.__DEABSTRACTOR__ = () => ({ ...clock.current, beat: getBeat(clock.current.elapsed, clock.current.procedure, clock.current.running), artwork: artworkFor(clock.current.elapsed, clock.current.procedure), token: tokenRef.current, mode: clock.current.journey ? 'live-transfer' : 'cinematic-preview' })
    window.__DEABSTRACTOR_AUDIO__ = () => audio.current?.diagnostics()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); document.removeEventListener('visibilitychange', syncVisibility); audio.current?.stop(); delete window.__DEABSTRACTOR__; delete window.__DEABSTRACTOR_AUDIO__ }
  }, [])

  const start = useCallback((nextProcedure: Procedure = 'evacuation', departure = false) => {
    if (live && !departure && !sceneProof) return
    if (!(departure ? canvas && frameReady && !sceneFailed : ready) || introVisible || clock.current.running || receiptView.current) return
    attention.current = false
    const player = audio.current ?? new ApparatusAudio()
    audio.current = player
    player.setEnabled(sound)
    player.setPaused(false)
    void player.unlock().catch(() => {})
    player.begin(nextProcedure)
    clock.current = { elapsed: 0, running: true, paused: false, procedure: nextProcedure, reducedMotion: reduced, journey: live?.journey, ambient: clock.current.ambient ?? 0, holding: false }
    lastBeat.current = 'scan'
    pausedRef.current = false
    setPaused(false)
    setProcedure(nextProcedure)
    const nextArtwork = nextProcedure === 'inspection' ? 'safe' : 'not-safe'
    lastArtwork.current = nextArtwork
    setArtwork(nextArtwork)
    setRunning(true)
    setBeat('scan')
    live?.onStarted()
  }, [ready, canvas, frameReady, sceneFailed, introVisible, reduced, sound, live, sceneProof])

  useEffect(() => { if (!introVisible || sceneFailed) live?.onReady() }, [introVisible, sceneFailed, live])
  useEffect(() => {
    const journey = live?.journey
    if (!journey?.id || playedJourney.current === journey.id || journeyStopped(journey) || introVisible || !frameReady || sceneFailed || clock.current.running) return
    playedJourney.current = journey.id
    start('evacuation', true)
  }, [live, introVisible, frameReady, sceneFailed, start, running])
  useEffect(() => {
    const ticket = live?.confirmed
    if (!ticket) return
    const key = 'hash' in ticket ? ticket.hash : ticket.checkId
    if ('hash' in ticket && live?.journey.id) { playedHash.current = key; return }
    if (ticket.token !== token || playedHash.current === key || !ready || introVisible || running) return
    playedHash.current = key
    start('hash' in ticket ? 'evacuation' : 'inspection')
  }, [live, token, ready, introVisible, running, start])
  useEffect(() => { if (beat === 'complete' || sceneFailed) live?.onFinished() }, [beat, sceneFailed, live])
  useEffect(() => { if (!running && journeyStopped(live?.journey)) live?.onFinished() }, [running, live])

  const chooseToken = (direction: number) => {
    if (clock.current.running) return
    audio.current?.stop()
    audio.current?.tick()
    setTokenIndex(index => (index + direction + DEMO_BUDS.length) % DEMO_BUDS.length)
    clock.current.elapsed = 0
    clock.current.procedure = 'evacuation'
    setProcedure('evacuation')
    setArtwork('not-safe')
    lastArtwork.current = 'not-safe'
    setBeat('standby')
    lastBeat.current = 'standby'
  }

  const skip = () => {
    if (live && !sceneProof) return
    clock.current.elapsed = durationFor(clock.current.procedure)
    clock.current.running = false
    clock.current.paused = false
    pausedRef.current = false
    lastBeat.current = 'complete'
    setRunning(false)
    setPaused(false)
    setBeat('complete')
    setArtwork('safe')
    lastArtwork.current = 'safe'
    audio.current?.stop()
    mainButton.current?.focus()
  }

  const togglePause = () => {
    const next = !pausedRef.current
    pausedRef.current = next
    clock.current.paused = next
    setPaused(next)
    audio.current?.setPaused(next || document.hidden)
  }

  const toggleSound = () => {
    setSound(current => !current)
    audio.current?.setEnabled(!sound)
    if (!sound) void audio.current?.unlock().catch(() => {})
  }

  const complete = beat === 'complete'
  const copy = procedure === 'inspection' && beat === 'scan'
    ? { title: 'Already safe? Very suspicious.', subtitle: 'We will be thorough. Unnecessarily thorough.' }
    : BEAT_COPY[beat]

  return <main className={styles.experience} data-live={Boolean(live)} data-departure={Boolean(live?.journey.id && !journeyStopped(live.journey))} data-beat={beat} data-artwork={artwork} data-running={running} data-receipt-view={inspectingReceipt}
    onKeyDownCapture={event => { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault() }}>
    {!loading && <h1 className={styles.srOnly}>The De-Abstractor 3000</h1>}
    <div className={styles.scene} inert={loading} aria-hidden={loading} aria-label="A mint-green cartoon evacuation machine with a pixel Glowbud on its screen">
      {sceneFailed ? <SceneUnavailable onFailure={failScene} /> : <SceneBoundary onFailure={failScene}>
        <Canvas onCreated={({ gl }) => setCanvas(gl.domElement)} shadows="percentage" dpr={[1, 1.6]} camera={{ position: [5.6, 4.7, 14.3], fov: 36 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} fallback={<div className={styles.fallback}>This experience needs WebGL. No wallets or assets have been changed.</div>}>
          <ApparatusScene clock={clock} token={token} portrait={portrait.image} attention={attention} receiptView={receiptView} onInspectReceipt={inspectReceipt} proof={sceneProof} journey={live?.journey} onActivate={() => { if (!live) start() }} />
          <FirstSceneFrame enabled={Boolean(portrait.image)} onReady={markFrameReady} />
        </Canvas>
      </SceneBoundary>}
    </div>

    {loading && <ApparatusLoading live={Boolean(live)} phase={portrait.failed ? 'failed' : portrait.image ? 'scene' : 'portrait'} portraitSrc={portrait.src} token={token} leaving={ready} onRetry={portrait.retry} onChooseToken={live ? undefined : chooseToken} onContinue={live ? failScene : undefined} />}

    {!loading && <header className={styles.header}>
      <Link href="/" className={styles.iconButton} aria-label="Return to museum" data-tooltip="Museum"><ArrowLeft size={20} /></Link>
      <span className={styles.preview}>{live ? 'Abstract today. Ethereum airdrop later.' : 'Demo. No assets move.'}</span>
      <button className={styles.iconButton} onClick={toggleSound} aria-label={sound ? 'Mute sound' : 'Enable sound'} data-tooltip={sound ? 'Mute sound' : 'Enable sound'} aria-pressed={sound}>{sound ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
    </header>}

    {!loading && <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
      {inspectingReceipt ? `${live ? 'Transfer receipt' : 'Demo clearance'} for Glowbud ${token}. Press Escape to return to the apparatus.` : <>{paused ? live ? 'Scene paused. Transfer tracking continues.' : 'Procedure paused.' : live ? journeyCopy(live.journey).title : copy.title} {live ? journeyCopy(live.journey).detail : copy.subtitle}</>}
      {complete && (live ? `${procedure === 'inspection' ? 'Wallet ownership checked. No transfer was needed.' : 'Transfer confirmed on Abstract.'} No Ethereum NFT has been delivered.` : 'Demonstration complete. No wallets, transfers or NFT changes.')}
    </div>}

    {!sceneFailed && !loading && (!live || running || (complete && sceneProof)) && <section className={styles.controls} aria-label="Evacuation controls">
      {inspectingReceipt ? <div className={styles.playback} key="receipt">
        <button ref={returnButton} className={styles.iconButton} onClick={closeReceipt} data-tooltip="Back to apparatus" aria-label="Back to apparatus"><ArrowLeft size={21} /></button>
      </div> : running ? <div className={styles.playback} key="playback">
        <button ref={playbackButton} className={styles.iconButton} onClick={togglePause} data-tooltip={paused ? 'Resume' : 'Pause'} aria-label={paused ? 'Resume sequence' : 'Pause sequence'}>{paused ? <Play size={21} /> : <Pause size={21} />}</button>
        {(!live || sceneProof) && <button className={styles.iconButton} onClick={skip} data-tooltip="Skip" aria-label="Skip scene"><SkipForward size={21} /></button>}
      </div> : <div className={styles.loadout} key="loadout">
        {!live && <aside className={styles.passenger} aria-label="Demo passenger selection">
          <button className={styles.arrowButton} onClick={() => chooseToken(-1)} aria-label="Previous Glowbud" data-tooltip="Previous bud"><ChevronLeft size={22} /></button>
          <div className={styles.passengerBadge}>
            {/* Original collection pixels stay on the screen and passenger selector. */}
            <div className={styles.passengerArt}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {portrait.image ? <img key={token} src={portrait.image.src} alt={`Original pixel artwork for Glowbud ${token}`} width={48} height={48} /> : <LoaderCircle size={24} className={portrait.failed ? undefined : styles.loadingIcon} aria-hidden="true" />}
              {complete && <ShieldCheck className={styles.clearanceBadge} size={23} aria-label="Demo clearance complete" />}
            </div>
            <span>#{token}</span>
          </div>
          <button className={styles.arrowButton} onClick={() => chooseToken(1)} aria-label="Next Glowbud" data-tooltip="Next bud"><ChevronRight size={22} /></button>
          {complete && <button ref={inspectButton} className={styles.iconButton} onClick={inspectReceipt} aria-label="Inspect printed clearance" data-tooltip="Inspect clearance"><FileSearch size={21} /></button>}
        </aside>}
        <div className={styles.actions}>
          <button ref={mainButton} className={styles.primary} onClick={() => portrait.failed ? portrait.retry() : start(live?.confirmed && !('hash' in live.confirmed) ? 'inspection' : 'evacuation')} disabled={!ready && !portrait.failed} aria-label={portrait.failed ? 'Retry portrait' : !ready ? 'Loading passenger' : complete ? 'Replay evacuation' : 'Evacuate demo passenger'}
            onPointerEnter={() => { attention.current = true }} onPointerLeave={() => { attention.current = false }}
            onFocus={() => { attention.current = true }} onBlur={() => { attention.current = false }}>
            {portrait.failed || complete ? <RotateCcw size={21} /> : !ready ? <LoaderCircle className={styles.loadingIcon} size={21} /> : <Play size={21} fill="currentColor" />}
            {portrait.failed ? 'Retry' : !ready ? 'Loading' : complete ? 'Replay' : 'Evacuate'}
          </button>
          {!live && <button className={styles.checkButton} disabled={!ready} onClick={() => start('inspection')} aria-label="Check an already-safe bud" data-tooltip="Already safe? Check instead."><ShieldCheck size={21} /><span>Check</span></button>}
        </div>
      </div>}
      {portrait.failed && <p className={styles.loadError} role="alert">Portrait unavailable.</p>}
    </section>}
  </main>
}
