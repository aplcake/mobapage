'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, Check, CheckCheck, ChevronDown, ChevronUp, ExternalLink, LoaderCircle, Plug, RefreshCw, ShieldCheck, Ticket, TriangleAlert, Wallet } from 'lucide-react'
import { getAddress } from 'viem'
import { discoverEvmWallets, requestWalletAccounts, type DiscoveredWallet } from '../wallet/eip1193Wallet'
import { browserSigner } from './browserSigner'
import { PassengerLineup } from './PassengerLineup'
import { friendlyWalletError, GLOWBUD_CONTRACT, wasNotSubmitted, MAX_PASSENGERS, portraitUrl, readDeparture, readTicket, recipientAddress, type Departure, type TransferRecord, type TransferSigner, type TransferTicket, type WalletInspection } from './transfer'
import styles from './TransferDesk.module.css'
import { EMPTY_JOURNEY, journeyCopy, type LiveJourney } from './liveJourney'

const AbstractLogin = dynamic(() => import('./AbstractLogin'), { ssr: false, loading: () => <p>Opening the Abstract connection...</p> })
const JOURNAL = 'glowbuds.deabstractor.transfers.v1'
const INTENT = 'glowbuds.deabstractor.unresolved.v1'
function readRecords(): TransferRecord[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(JOURNAL) || '[]')
    return Array.isArray(saved) ? saved.slice(-100).flatMap(entry => {
      try { return [{ ...readTicket(entry), status: 'pending' as const }] } catch { return [] }
    }) : []
  } catch { return [] }
}
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
async function check(body: object) {
  const response = await fetch('/api/deabstractor/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(45000), cache: 'no-store' })
  const data = await response.json()
  if (!response.ok || data.error) throw new Error(data.error || 'The network check could not finish.')
  return data
}
type Props = { focusedToken: number; onToken: (token: number) => void; onConfirmed: (ticket: TransferTicket) => void; onChecked: (inspection: WalletInspection) => void; onJourney: (journey: LiveJourney) => void; cinematic: boolean }

export function TransferDesk({ focusedToken, onToken, onConfirmed, onChecked, onJourney, cinematic }: Props) {
  const [source, setSource] = useState<TransferSigner | null>(null)
  const sourceRef = useRef<TransferSigner | null>(null)
  const [useAbstract, setUseAbstract] = useState(false)
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([])
  const [picker, setPicker] = useState<'source' | 'recipient' | null>(null)
  const [inventory, setInventory] = useState<number[] | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [destination, setDestination] = useState('')
  const [destinationName, setDestinationName] = useState('Pasted address')
  const [step, setStep] = useState<'connect' | 'buds' | 'destination' | 'review' | 'result'>('connect')
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [records, setRecords] = useState<TransferRecord[]>(readRecords)
  const recordsRef = useRef<TransferRecord[]>(records)
  const [unresolved, setUnresolved] = useState(() => { try { return Boolean(localStorage.getItem(INTENT)) } catch { return true } })
  const [groupApproval, setGroupApproval] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const lock = useRef(false)
  const epoch = useRef(0)
  const live = useRef(true)
  const heading = useRef<HTMLHeadingElement>(null)
  const panel = useRef<HTMLElement>(null)
  const recovering = useRef(false)
  const recoverRef = useRef<() => Promise<void>>(async () => {})
  const [journey, setJourney] = useState<LiveJourney>(EMPTY_JOURNEY)
  const journeyRef = useRef<LiveJourney>(EMPTY_JOURNEY)
  const [flightDetails, setFlightDetails] = useState(false)
  const report = useCallback((next: LiveJourney) => {
    journeyRef.current = next
    if (live.current) { setJourney(next); onJourney(next) }
  }, [onJourney])
  const progress = (phase: LiveJourney['phase'], extra: Partial<LiveJourney> = {}) => report({ ...journeyRef.current, phase, ...extra })
  useEffect(() => {
    if (step === 'result' || lock.current || unresolved) return
    report({ ...EMPTY_JOURNEY, phase: step === 'connect' ? busy || useAbstract ? 'connecting' : 'connect' : step === 'review' ? 'review' : 'boarding', tokens: selected, grouped: groupApproval })
  }, [step, busy, useAbstract, selected, groupApproval, report, unresolved])

  const save = useCallback((record: TransferRecord) => {
    const next = [...recordsRef.current.filter(item => item.hash !== record.hash || item.token !== record.token), record].slice(-100)
    // Persist before enabling any further signatures. A storage failure stops the batch.
    localStorage.setItem(JOURNAL, JSON.stringify(next))
    recordsRef.current = next
    if (live.current) setRecords(next)
  }, [])

  useEffect(() => {
    live.current = true
    const changed = () => { if (!lock.current) { setUnresolved(Boolean(localStorage.getItem(INTENT))); recordsRef.current = readRecords(); setRecords(recordsRef.current); setAcknowledged(false) } }
    window.addEventListener('storage', changed)
    return () => { live.current = false; window.removeEventListener('storage', changed) }
  }, [])
  useEffect(() => { heading.current?.focus({ preventScroll: true }); panel.current?.scrollTo({ top: 0 }) }, [step])
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (lock.current) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', leave)
    return () => window.removeEventListener('beforeunload', leave)
  }, [])

  const loadInventory = useCallback(async (signer: TransferSigner) => {
    if (lock.current) return
    const generation = ++epoch.current
    setBusy(true); setError(''); setMessage('Checking the passenger list...'); setInventory(null); setSelected([]); setAcknowledged(false)
    try {
      const response = await fetch(`/api/deabstractor/inventory?address=${signer.address}`, { cache: 'no-store', signal: AbortSignal.timeout(60000) })
      const data = await response.json()
      if (!response.ok || !Array.isArray(data.tokenIds)) throw new Error(data.error || 'Your buds could not be loaded. Try refreshing.')
      if (generation !== epoch.current || !live.current) return
      setInventory(data.tokenIds); setStep('buds')
    } catch (failure) { if (generation === epoch.current && live.current) setError(friendlyWalletError(failure)) }
    finally { if (generation === epoch.current && live.current) { setBusy(false); setMessage('') } }
  }, [])
  const connectSource = useCallback((signer: TransferSigner) => {
    if (lock.current) { setError('Finish the current transfer before changing the sending wallet.'); return }
    sourceRef.current = signer; setSource(signer); setAcknowledged(false); setPicker(null)
    void loadInventory(signer)
  }, [loadInventory])
  const invalidateSource = useCallback(() => {
    sourceRef.current = null; setSource(null); setAcknowledged(false)
    if (!lock.current) { epoch.current++; setBusy(false); setStep('connect'); setInventory(null); setSelected([]); setPicker(null); setError(''); setMessage('') }
  }, [])

  function previewPassenger(token: number) {
    if (!busy && !lock.current && selected.includes(token)) onToken(token)
  }
  function togglePassenger(token: number) {
    if (busy || lock.current || !inventory?.includes(token)) return
    const removing = selected.includes(token)
    if (!removing && selected.length >= MAX_PASSENGERS) { setMessage(`This trip is full. Up to ${MAX_PASSENGERS} buds can travel together.`); return }
    const next = removing ? selected.filter(item => item !== token) : [...selected, token]
    setSelected(next); setAcknowledged(false); setError(''); setMessage('')
    if (!removing) onToken(token)
    else if (focusedToken === token && next.length) onToken(next[0])
    if (!next.length && step !== 'buds') setStep('buds')
  }
  function selectAll() {
    if (busy || lock.current || !inventory?.length) return
    const next = inventory.slice(0, MAX_PASSENGERS)
    setSelected(next); setAcknowledged(false); setError('')
    setMessage(inventory.length > MAX_PASSENGERS ? `The first ${MAX_PASSENGERS} are aboard. Bring the rest on your next trip.` : '')
    onToken(next[0])
  }
  function editStep(next: 'buds' | 'destination') {
    if (busy || lock.current) return
    setAcknowledged(false); setError(''); setMessage(''); setPicker(null); setStep(next)
  }

  async function discover(role: 'source' | 'recipient') {
    setError(''); setPicker(role); setBusy(true)
    try {
      const options = await discoverEvmWallets({ announceWindowMs: 400 })
      setWallets(options)
      if (!options.length) setError(role === 'recipient' ? 'No browser wallet found. Paste your personal receiving address below, or open this site in your wallet browser.' : 'No browser wallet found. Use Abstract login, or open this site in your wallet browser.')
    } catch (failure) { setError(friendlyWalletError(failure)) }
    finally { setBusy(false) }
  }
  async function chooseWallet(wallet: DiscoveredWallet) {
    if (busy || lock.current) return
    setBusy(true); setError('')
    try {
      if (picker === 'source') { const signer = await browserSigner(wallet); setBusy(false); connectSource(signer); return }
      const [address] = await requestWalletAccounts(wallet.provider)
      if (!address) throw new Error('No receiving account was connected.')
      setDestination(getAddress(address)); setDestinationName(wallet.name); setAcknowledged(false); setPicker(null)
    } catch (failure) { setError(friendlyWalletError(failure)) }
    finally { setBusy(false) }
  }
  async function review() {
    if (!source || !selected.length || busy) return
    const signer = source
    const generation = epoch.current
    setBusy(true); setError(''); setMessage('Checking the receiving address on both networks...')
    try {
      const to = recipientAddress(destination, source.address)
      await check({ action: 'recipient', to, from: source.address })
      const canGroup = selected.length > 1 && Boolean(signer.sendBatch) && Boolean(await signer.supportsBatch?.())
      if (!live.current || sourceRef.current !== signer || epoch.current !== generation) return
      setDestination(to); setGroupApproval(canGroup); setStep('review'); setAcknowledged(false)
    } catch (failure) { if (live.current && epoch.current === generation) setError(friendlyWalletError(failure)) }
    finally { if (live.current && epoch.current === generation) { setBusy(false); setMessage('') } }
  }
  async function resolveDeparture(trip: Departure) {
    const signer = sourceRef.current
    if (trip.callId && !trip.hash && signer?.batchStatus && signer.address.toLowerCase() === trip.from.toLowerCase()) {
      try {
        const state = await signer.batchStatus(trip.callId)
        if (state.failed) {
          localStorage.removeItem(INTENT); setUnresolved(false)
          throw new Error('Your wallet did not submit this group. Refresh your buds to try again.')
        }
        if (state.hash) { trip = { ...trip, hash: state.hash }; localStorage.setItem(INTENT, JSON.stringify(trip)) }
      } catch (failure) {
        // A missing wallet reply is not proof of failure. Chain recovery works without reconnecting.
        if (!localStorage.getItem(INTENT)) throw failure
      }
    }
    const proof = await check({ action: 'departure', from: trip.from, to: trip.to, tokens: trip.tokens, fromBlock: trip.fromBlock, hash: trip.hash }) as { complete: boolean; records: (TransferRecord & { atDestination: boolean })[] }
    for (const record of proof.records) save(record)
    if (proof.complete) { localStorage.removeItem(INTENT); setUnresolved(false) }
    const allArrived = proof.complete && proof.records.every(record => record.status === 'confirmed' && record.atDestination)
    const arrived = proof.records.filter(record => record.status === 'confirmed' && record.atDestination).map(record => record.token)
    if (journeyRef.current.id) progress('pending', { arrived: [...new Set([...journeyRef.current.arrived, ...arrived])] })
    return { complete: proof.complete, arrival: allArrived ? proof.records.at(-1)! : null, reverted: proof.complete && proof.records.some(record => record.status === 'reverted') }
  }
  async function waitForDeparture(trip: Departure) {
    for (let attempt = 0; attempt < 30 && live.current; attempt++) {
      const result = await resolveDeparture(trip)
      if (result.reverted) throw new Error('The transfer did not complete. Your buds were not moved by this transaction. Network fees may still apply.')
      if (result.complete) return result.arrival
      await delay(4000)
    }
    throw new Error('Still waiting for Abstract. We will keep checking automatically. Nothing will be sent twice.')
  }
  async function runTransfers() {
    const signer = sourceRef.current
    if (!signer || !acknowledged || !selected.length || recordsRef.current.some(item => item.status === 'pending')) return
    if (localStorage.getItem(INTENT)) throw new Error('An earlier departure is still being tracked automatically.')
    const stored: unknown = JSON.parse(localStorage.getItem(JOURNAL) || '[]')
    if (Array.isArray(stored) && stored.some(item => item?.status === 'pending')) throw new Error('Another tab has a departure underway. We will wait for it to finish.')
    const to = recipientAddress(destination, signer.address)
    setStep('result')
    setFlightDetails(false)
    report({ id: crypto.randomUUID(), phase: 'preparing', tokens: [...selected], arrived: [], active: [], grouped: groupApproval })
    let lastArrival: TransferTicket | null = null
    const groups = groupApproval ? [[...selected]] : selected.map(token => [token])
    for (const tokens of groups) {
      if (!live.current || sourceRef.current !== signer) throw new Error('The sending wallet changed. Confirmed transfers are saved; reconnect to continue.')
      onToken(tokens[0])
      progress('preparing', { active: tokens })
      setMessage(tokens.length > 1 ? `Preparing all ${tokens.length} passengers...` : `Checking Glowbud #${tokens[0]}...`)
      await signer.ensureChain()
      if ((await signer.readAddress())?.toLowerCase() !== signer.address.toLowerCase()) throw new Error('Reconnect the original sending account. The receiving address remains saved.')
      if (groupApproval && !await signer.supportsBatch?.()) throw new Error('Group approval is no longer available. Return to review before continuing.')
      const prepared = await check({ action: 'preflight-departure', from: signer.address, to, tokens })
      if (!live.current || sourceRef.current !== signer) return
      setMessage(tokens.length > 1 ? `Approve all ${tokens.length} buds together in your wallet` : `Confirm Glowbud #${tokens[0]} in your sending wallet`)
      const requestId = crypto.randomUUID()
      let trip: Departure = { from: signer.address, to, tokens, fromBlock: prepared.fromBlock, ...(groupApproval && signer.batchStatus ? { callId: requestId } : {}) }
      localStorage.setItem(INTENT, JSON.stringify(trip))
      setUnresolved(true)
      progress('approval')
      try {
        const result = groupApproval ? await signer.sendBatch!(tokens, to, requestId) : { hash: await signer.send(tokens[0], to) }
        trip = { ...trip, ...result }
        localStorage.setItem(INTENT, JSON.stringify(trip))
      }
      catch (failure) {
        if (wasNotSubmitted(failure)) { localStorage.removeItem(INTENT); setUnresolved(false) }
        throw failure
      }
      if (trip.hash) for (const token of tokens) save({ token, from: trip.from, to, hash: trip.hash, status: 'pending' })
      progress('pending')
      setMessage(tokens.length > 1 ? `${tokens.length} buds are on their way. Tracking automatically...` : `Glowbud #${tokens[0]} is on its way. Tracking automatically...`)
      lastArrival = await waitForDeparture(trip)
      if (!lastArrival) throw new Error('Ownership has changed since this departure. Check the departure log before continuing.')
    }
    setMessage(lastArrival ? 'Transfers confirmed. Your little buds have arrived.' : 'The transfers completed, but these buds have since moved to another wallet.')
    setSelected([]); setInventory(null)
    if (lastArrival && live.current) { progress('confirmed'); onConfirmed(lastArrival) }
  }
  async function send() {
    if (lock.current || busy) return
    lock.current = true; setBusy(true); setError('')
    try {
      if (!navigator.locks) throw new Error('This browser cannot safely lock a transfer session. Use a current Safari, Chrome, or Firefox browser.')
      await navigator.locks.request('glowbuds-deabstractor-transfers', { ifAvailable: true }, async acquired => {
        if (!acquired) throw new Error('Another tab is handling a transfer. Finish there first.')
        await runTransfers()
      })
    } catch (failure) {
      setError(friendlyWalletError(failure)); setMessage('')
      if (journeyRef.current.id) {
        progress(localStorage.getItem(INTENT) ? 'pending' : journeyRef.current.arrived.length ? 'partial' : 'cancelled')
        setFlightDetails(!localStorage.getItem(INTENT))
      }
    }
    finally { lock.current = false; if (live.current) { setBusy(false); setAcknowledged(false) } }
  }
  async function recover() {
    if (lock.current || busy || recovering.current || !live.current || !navigator.locks) return
    recovering.current = true
    try {
      await navigator.locks.request('glowbuds-deabstractor-transfers', { ifAvailable: true }, async acquired => {
        if (!acquired || lock.current || !live.current) return
        const saved = localStorage.getItem(INTENT)
        if (saved) {
          const trip = readDeparture(JSON.parse(saved))
          if (!journeyRef.current.id) {
            report({ id: `recovered:${trip.from}:${trip.tokens.join(',')}`, phase: 'pending', tokens: trip.tokens, active: trip.tokens, arrived: [], grouped: trip.tokens.length > 1 })
            onToken(trip.tokens[0]); setStep('result')
          }
          const result = await resolveDeparture(trip)
          if (result.complete) {
            setError(''); setStep('result')
            setMessage(result.reverted ? 'The transfer did not complete. Refresh your buds before trying again.' : result.arrival ? 'Your buds have arrived.' : 'Transfer completed; ownership has since changed.')
            const allArrived = journeyRef.current.tokens.every(token => journeyRef.current.arrived.includes(token))
            progress(allArrived ? 'confirmed' : journeyRef.current.arrived.length ? 'partial' : 'cancelled')
            if (result.arrival && allArrived && live.current) onConfirmed(result.arrival)
          }
          return
        }
        // Recheck old journals automatically without replaying already-completed departure scenes.
        const pendingRecords = recordsRef.current.filter(item => item.status === 'pending')
        const groups = new Map<string, TransferRecord[]>()
        for (const record of pendingRecords) {
          const key = `${record.hash}:${record.from}:${record.to}`
          groups.set(key, [...groups.get(key) ?? [], record])
        }
        for (const group of groups.values()) for (let offset = 0; offset < group.length; offset += MAX_PASSENGERS) {
          const proof = await check({ action: 'departure', ...group[0], tokens: group.slice(offset, offset + MAX_PASSENGERS).map(record => record.token) })
          for (const record of proof.records) save(record)
        }
        setUnresolved(false)
      })
    } catch (failure) {
      // Uncertain reads keep waiting. A definite wallet failure removes its intent.
      if (!localStorage.getItem(INTENT) && journeyRef.current.id) {
        progress(journeyRef.current.arrived.length ? 'partial' : 'cancelled')
        setError(friendlyWalletError(failure)); setFlightDetails(true)
      }
    }
    finally { recovering.current = false }
  }
  useEffect(() => { recoverRef.current = recover })
  const pending = records.some(item => item.status === 'pending')
  useEffect(() => {
    if (busy || (!pending && !unresolved)) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      await recoverRef.current()
      if (!stopped) timer = setTimeout(() => void poll(), 10000)
    }
    timer = setTimeout(() => void poll(), 1200)
    return () => { stopped = true; clearTimeout(timer) }
  }, [busy, pending, unresolved])
  async function inspectWallet() {
    const signer = sourceRef.current
    if (!signer || !selected.length || busy) return
    setBusy(true); setError(''); setMessage('Checking this wallet. No transfer required...')
    try {
      if ((await signer.readAddress())?.toLowerCase() !== signer.address.toLowerCase()) throw new Error('Your account changed. Reconnect the wallet you want to check.')
      await check({ action: 'recipient', to: signer.address })
      const response = await fetch(`/api/deabstractor/inventory?address=${signer.address}`, { cache: 'no-store', signal: AbortSignal.timeout(60000) })
      const data = await response.json()
      if (!response.ok || !Array.isArray(data.tokenIds) || !selected.every(token => data.tokenIds.includes(token))) throw new Error('Ownership changed or could not be verified. Refresh your buds.')
      if (sourceRef.current !== signer) return
      onChecked({ token: selected[0], address: signer.address, checkId: crypto.randomUUID() })
      setMessage('These buds are already held by this personal wallet on Abstract. No transfer was made. This is not a snapshot or airdrop guarantee.')
    } catch (failure) { setError(friendlyWalletError(failure)); setMessage('') }
    finally { setBusy(false) }
  }
  const title = { connect: 'All buds aboard.', buds: 'Choose your passengers.', destination: 'Where are we heading?', review: 'Ready for departure?', result: 'Departure log.' }[step]
  const inFlight = Boolean(journey.id && step === 'result' && !['cancelled', 'partial'].includes(journey.phase))
  const flight = journeyCopy(journey)
  const detailsOpen = inFlight ? flightDetails : expanded

  return <aside className={styles.desk} data-step={step} data-expanded={detailsOpen} data-cinematic={cinematic} data-flight={inFlight} aria-label="Glowbud transfer desk">
    <button className={styles.toggle} onClick={() => inFlight ? setFlightDetails(value => !value) : setExpanded(value => !value)} aria-expanded={detailsOpen} aria-label={detailsOpen ? 'Minimize transfer desk' : 'Open transfer desk'}><span><ShieldCheck size={18} />{inFlight ? 'DEPARTURE DETAILS' : <>DE-ABSTRACTOR <b>3000</b></>}</span>{detailsOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}</button>
    {inFlight && <section className={styles.flight} aria-label="Live departure" data-phase={journey.phase}>
      <div className={styles.flightHeading}><span className={styles.flightIcon}>{journey.phase === 'confirmed' ? <CheckCheck size={23} /> : <LoaderCircle size={23} />}</span><div role="status" aria-live="polite"><strong>{flight.title}</strong><p>{flight.detail}</p></div></div>
      <div className={styles.flightManifest} aria-label={`${journey.arrived.length} of ${journey.tokens.length} passengers confirmed`}>
        <div>{journey.tokens.slice(0, 5).map(token => <span key={token} data-arrived={journey.arrived.includes(token)} title={`Glowbud ${token}${journey.arrived.includes(token) ? ' arrived' : ' awaiting confirmation'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={portraitUrl(token)} alt={`Glowbud ${token}`} width={34} height={34} />{journey.arrived.includes(token) && <Check size={12} />}
        </span>)}{journey.tokens.length > 5 && <b>+{journey.tokens.length - 5}</b>}</div><strong>{journey.arrived.length}<small> / {journey.tokens.length} arrived</small></strong>
      </div>
    </section>}
    <section className={styles.body} ref={panel} hidden={!detailsOpen}>
      <div className={styles.rail} aria-label="Transfer progress">{['Wallet', 'Passengers', 'Address', 'Review'].map((label, index) => <span key={label} aria-current={index === ['connect', 'buds', 'destination', 'review'].indexOf(step) ? 'step' : undefined} data-active={index === ['connect', 'buds', 'destination', 'review'].indexOf(step)}>{index + 1}<small>{label}</small></span>)}</div>
      <h2 ref={heading} tabIndex={-1}>{title}</h2>
      {step === 'connect' && <p>Move your Glowbuds to a personal wallet you control.</p>}
      {/* Keep the official connector mounted through review and signing. */}
      <div className={styles.abstract} hidden={step !== 'connect'}>
        {useAbstract ? <AbstractLogin onConnect={connectSource} onInvalid={invalidateSource} /> : <button className={styles.primary} disabled={busy} onClick={() => setUseAbstract(true)}><Plug size={18} />Connect Abstract wallet</button>}
      </div>
      {step === 'connect' && <>
        <button className={styles.secondary} disabled={busy} onClick={() => void discover('source')}><Wallet size={18} />Use a browser wallet</button>
        <p className={styles.note}>Connecting does not move anything. Your wallet asks before sending.</p>
      </>}
      {source && step !== 'review' && <div className={styles.address}><span>FROM · {source.name}</span><code>{source.address.slice(0, 22)}<wbr />{source.address.slice(22)}</code><button title="Change sending wallet" aria-label="Change sending wallet" disabled={busy} onClick={() => { invalidateSource(); setUseAbstract(false) }}><Plug size={17} /></button></div>}
      {picker && <div className={styles.wallets} aria-label={picker === 'source' ? 'Sending wallet options' : 'Receiving wallet options'}>{wallets.map(wallet => <button key={wallet.id} disabled={busy} onClick={() => void chooseWallet(wallet)}><Wallet size={18} />{wallet.name}<ArrowRight size={16} /></button>)}</div>}
      {(step === 'buds' || step === 'destination') && <PassengerLineup tokens={selected} focusedToken={focusedToken} disabled={busy} onPreview={previewPassenger} onRemove={togglePassenger} />}
      {step === 'buds' && <>
        <div className={styles.row}><span>{inventory?.length ?? '...'} buds found</span><button aria-label="Refresh buds" title="Refresh buds" disabled={busy} onClick={() => source && void loadInventory(source)}><RefreshCw size={18} /></button></div>
        {Boolean(inventory?.length) && <div className={styles.bulkActions}><button className={styles.textButton} disabled={busy} onClick={selectAll}><CheckCheck size={17} />{inventory!.length > MAX_PASSENGERS ? `Select first ${MAX_PASSENGERS}` : 'Select all'}</button><button className={styles.textButton} disabled={busy || !selected.length} onClick={() => { setSelected([]); setAcknowledged(false); setMessage('') }}>Clear</button></div>}
        <div className={styles.buds} aria-label="Buds in your wallet">{inventory?.map(token => <button key={token} disabled={busy} aria-pressed={selected.includes(token)} aria-label={`Select Glowbud ${token}`} onClick={() => togglePassenger(token)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={portraitUrl(token)} alt="" width={76} height={76} loading="lazy" /><span>#{token}</span>{selected.includes(token) && <Check size={18} />}
        </button>)}</div>
        {inventory?.length === 0 && <p>No Glowbuds at this address on Abstract. Check that you connected the wallet holding them, not its login wallet.</p>}
        <button className={styles.primary} disabled={!selected.length || busy || pending || unresolved} onClick={() => editStep('destination')}>{selected.length ? `Move ${selected.length} bud${selected.length === 1 ? '' : 's'}` : 'Choose your buds'}<ArrowRight size={18} /></button>
        <p className={styles.note}>Up to {MAX_PASSENGERS} per trip. Group approval when your wallet supports it.</p>
        <button className={styles.textButton} disabled={!selected.length || busy} onClick={() => void inspectWallet()}><ShieldCheck size={17} />Already in my personal wallet: check instead</button>
      </>}
      {step === 'destination' && <>
        <button className={styles.secondary} disabled={busy} onClick={() => void discover('recipient')}><Wallet size={18} />Connect receiving wallet</button>
        <label className={styles.field}>Or paste your receiving address<input aria-label="Receiving address" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="0x..." value={destination} disabled={busy} onChange={event => { setDestination(event.target.value); setDestinationName('Pasted address'); setAcknowledged(false) }} /></label>
        <div className={styles.warning}><TriangleAlert size={19} /><p>Use your own personal wallet, not an exchange deposit, Abstract smart wallet, or someone else&apos;s address. A pasted address is not proof of ownership.</p></div>
        <p className={styles.note}>You must also control this address on Ethereum for the planned later airdrop. Your NFTs stay on Abstract today.</p>
        <button className={styles.primary} disabled={!destination || busy} onClick={() => void review()}>Check address<ArrowRight size={18} /></button>
        <button className={styles.textButton} disabled={busy} onClick={() => editStep('buds')}><ArrowLeft size={16} />Passengers</button>
      </>}
      {step === 'review' && <>
        <section className={styles.boardingPass} aria-label="Boarding manifest">
          <div className={styles.passHeading}><Ticket size={20} /><strong>BOARDING MANIFEST</strong><span>ABSTRACT</span></div>
          <div className={styles.route}>
            <div className={styles.routeStop}><span><Wallet size={15} />Sending wallet <small title={source?.name}>{source?.name}</small></span><code data-testid="review-sender">{source?.address.slice(0, 22)}<wbr />{source?.address.slice(22)}</code></div>
            <div className={styles.routeArrow}><ArrowDown size={16} /><span>Same network · New wallet</span></div>
            <div className={styles.routeStop}><span><Wallet size={15} />Receiving wallet <small title={destinationName}>{destinationName}</small></span><code data-testid="review-recipient">{destination.slice(0, 22)}<wbr />{destination.slice(22)}</code></div>
          </div>
          <PassengerLineup tokens={selected} focusedToken={focusedToken} disabled={busy} onPreview={previewPassenger} />
          <button className={styles.textButton} disabled={busy} onClick={() => editStep('buds')}><ArrowLeft size={16} />Change passengers</button>
        </section>
        <p className={styles.approval} data-testid="approval-mode"><CheckCheck size={18} />{groupApproval ? `One group approval for all ${selected.length} buds.` : selected.length === 1 ? 'One approval in your sending wallet.' : `This wallet needs ${selected.length} separate approvals, one per bud.`}</p>
        <div className={styles.warning}><TriangleAlert size={19} /><p>Real, irreversible transfers on <strong>Abstract</strong>. Network fees apply in ETH on Abstract. No Ethereum NFT is minted or delivered today.</p></div>
        <label className={styles.consent}><input type="checkbox" checked={acknowledged} disabled={busy} onChange={event => setAcknowledged(event.target.checked)} /><span>I control this receiving address on Abstract and Ethereum, checked every character, and understand these transfers cannot be undone.</span></label>
        <button className={styles.primary} disabled={busy || !acknowledged || pending || unresolved} onClick={() => void send()}><ShieldCheck size={19} />Confirm {selected.length} transfer{selected.length === 1 ? '' : 's'}</button>
        <button className={styles.textButton} disabled={busy} onClick={() => editStep('destination')}><ArrowLeft size={16} />Change address</button>
      </>}
      {busy && <p className={styles.status} role="status"><LoaderCircle size={19} />{message || 'Connecting...'}</p>}
      {!busy && message && <p className={styles.status} role="status">{message}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {unresolved && !busy && <div className={styles.recovery}>
        <h3>Tracking your departure</h3><p>We&apos;re waiting for the wallet or network. This resumes automatically when you return. No need to copy anything or send again.</p>
        {!source && <p className={styles.note}>Reconnect the sending wallet to also check its departure status.</p>}
      </div>}
      {records.length > 0 && <details className={styles.history}><summary>Departure history{pending ? ' · Tracking automatically' : ''}</summary>{records.slice(-MAX_PASSENGERS).map(record => <a key={`${record.hash}:${record.token}`} href={`https://abscan.org/tx/${record.hash}`} target="_blank" rel="noopener noreferrer"><span>{record.status === 'confirmed' ? <CheckCheck size={18} /> : <ExternalLink size={18} />}#{record.token} · {record.status === 'pending' ? 'On the way' : record.status === 'confirmed' ? 'Arrived' : 'Not completed'}</span><ExternalLink size={14} /></a>)}</details>}
      {step === 'result' && !busy && <button className={styles.secondary} onClick={() => source ? void loadInventory(source) : setStep('connect')}>Back to my buds<ArrowRight size={18} /></button>}
      <footer className={styles.footer}><strong>Abstract to Abstract. Ethereum later.</strong><span>No bridge. No blanket approvals. No custody.</span><a href={`https://abscan.org/address/${GLOWBUD_CONTRACT}`} target="_blank" rel="noopener noreferrer">Collection contract<ExternalLink size={12} /></a><a href="/deabstractor?demo=1">Just watch the demo</a></footer>
    </section>
  </aside>
}
