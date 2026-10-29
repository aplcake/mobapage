export type ArtworkState = 'not-safe' | 'safe'
export type Procedure = 'evacuation' | 'inspection'
export type Beat = 'standby' | 'scan' | 'brace' | 'transport' | 'stamp' | 'settle' | 'complete'

export const DEMO_BUDS = [968, 1677, 2000] as const
export const EVACUATION_SECONDS = 18
export const INSPECTION_SECONDS = 6

export const MECHANICAL_TIMING = {
  leftLock: 3.65, rightLock: 4.65,
  pumps: [5.55, 6.05, 6.55],
  launch: 6.55, crest: 8.05, relaunch: 8.55, arrival: 10.7,
  vents: [6.55, 8.55, 11.05],
} as const

export type SoundCue = 'scan' | 'lock' | 'windup' | 'pump' | 'hesitate' | 'hiss' | 'arrive' | 'stamp' | 'print' | 'clear'
type TimedCue = { at: number; cue: SoundCue }
const EVACUATION_SCORE: readonly TimedCue[] = ([
  { at: 0.12, cue: 'scan' }, { at: MECHANICAL_TIMING.leftLock, cue: 'lock' }, { at: MECHANICAL_TIMING.rightLock, cue: 'lock' },
  { at: 5.1, cue: 'windup' },
  ...MECHANICAL_TIMING.pumps.map(at => ({ at, cue: 'pump' as const })),
  ...MECHANICAL_TIMING.vents.map(at => ({ at, cue: 'hiss' as const })),
  { at: MECHANICAL_TIMING.crest, cue: 'hesitate' }, { at: MECHANICAL_TIMING.arrival, cue: 'arrive' },
  { at: printerTiming('evacuation').contact, cue: 'stamp' }, { at: printerTiming('evacuation').feedStart, cue: 'print' }, { at: printerTiming('evacuation').clear, cue: 'clear' },
] satisfies TimedCue[]).sort((a, b) => a.at - b.at)
const INSPECTION_SCORE: readonly TimedCue[] = [
  { at: 0.12, cue: 'scan' }, { at: printerTiming('inspection').contact, cue: 'stamp' },
  { at: printerTiming('inspection').feedStart, cue: 'print' }, { at: printerTiming('inspection').clear, cue: 'clear' },
]

export function crossedSoundCues(from: number, to: number, procedure: Procedure) {
  if (to <= from) return []
  return (procedure === 'inspection' ? INSPECTION_SCORE : EVACUATION_SCORE)
    .filter(event => event.at > from && event.at <= to).map(event => event.cue)
}

export function stampContact(procedure: Procedure) { return procedure === 'inspection' ? 3.85 : 12.05 }

export function printerTiming(procedure: Procedure) {
  const start = procedure === 'inspection' ? 3.2 : 11.4
  return { start, contact: stampContact(procedure), feedStart: start + 1.5, feedEnd: start + 2.7, clear: procedure === 'inspection' ? 5.9 : 15.1 }
}

export function impactAt(elapsed: number, procedure: Procedure) {
  const age = elapsed - stampContact(procedure)
  return age <= 0 || age >= 0.48 ? 0 : Math.sin(age / 0.48 * Math.PI) * (1 - age / 0.48)
}

export const BEAT_COPY: Record<Beat, { title: string; subtitle: string; screen: string }> = {
  standby: { title: 'A little bud. A big exit.', subtitle: 'Your friendly neighbourhood evacuation apparatus.', screen: 'READY' },
  scan: { title: 'Hold still, little buddy.', subtitle: 'Checking for signs of excessive abstraction.', screen: 'SCANNING' },
  brace: { title: 'Please remain reasonably calm.', subtitle: 'The machine has made no such commitment.', screen: 'HOLD TIGHT' },
  transport: { title: 'A completely normal procedure.', subtitle: 'Removing the abstract. Keeping the bud.', screen: 'WHOOSH!' },
  stamp: { title: 'One last bit of paperwork.', subtitle: 'This stamp was absolutely necessary.', screen: 'STAMP!' },
  settle: { title: 'Safe. Still a little weird.', subtitle: 'Exactly how we like them.', screen: 'SAFE' },
  complete: { title: 'Safe. Still a little weird.', subtitle: 'Exactly how we like them.', screen: 'SAFE' },
}

export function durationFor(procedure: Procedure) {
  return procedure === 'inspection' ? INSPECTION_SECONDS : EVACUATION_SECONDS
}

export function getBeat(elapsed: number, procedure: Procedure, running: boolean): Beat {
  if (!running && elapsed === 0) return 'standby'
  if (procedure === 'inspection') {
    if (elapsed < 3.2) return 'scan'
    if (elapsed < 4.4) return 'stamp'
    return elapsed < INSPECTION_SECONDS ? 'settle' : 'complete'
  }
  if (elapsed < 3.2) return 'scan'
  if (elapsed < 6) return 'brace'
  if (elapsed < 11.4) return 'transport'
  if (elapsed < 14.2) return 'stamp'
  return elapsed < EVACUATION_SECONDS ? 'settle' : 'complete'
}

export function smoothRange(value: number, start: number, end: number) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}

function gesture(t: number, start: number, peak: number, end: number) {
  return smoothRange(t, start, peak) * (1 - smoothRange(t, peak, end))
}

// A bounded one-shot spring, not a perpetual sine wave. Starts/ends at rest.
function settle(t: number, start: number, duration: number) {
  const age = (t - start) / duration
  return age <= 0 || age >= 1 ? 0 : Math.sin(age * Math.PI * 2) * (1 - age) ** 2
}

export function mechanismPose(t: number, procedure: Procedure, reducedMotion = false) {
  const evacuating = procedure === 'evacuation'
  const ending = printerTiming(procedure).clear
  const release = 1 - smoothRange(t, 14.8, 16)
  const pumping = evacuating ? MECHANICAL_TIMING.pumps.reduce((amount, peak, i) =>
    amount + (0.28 + i * 0.05) * gesture(t, peak - 0.23, peak, peak + 0.27), 0) : 0
  return {
    leftBrace: evacuating ? smoothRange(t, 3.25, MECHANICAL_TIMING.leftLock) * release : 0,
    rightBrace: evacuating ? smoothRange(t, 4.25, MECHANICAL_TIMING.rightLock) * (1 - smoothRange(t, 15.05, 16.25)) : 0,
    lever: smoothRange(t, 0.12, 0.48) * (1 - smoothRange(t, ending, evacuating ? 16.3 : 6)),
    pump: reducedMotion ? 0 : pumping,
    strain: evacuating && !reducedMotion ? gesture(t, 5.1, 6.55, 7.2) : 0,
    scannerYaw: reducedMotion ? 0 : 0.15 * gesture(t, 0.6, 1.1, 1.6) - 0.15 * gesture(t, 1.65, 2.15, 2.8),
    nod: reducedMotion || !evacuating ? 0 : gesture(t, ending, 15.45, 16.25),
    dockDrop: evacuating && !reducedMotion ? 0.045 * gesture(t, MECHANICAL_TIMING.arrival, 10.86, 11.35) : 0,
    needleSettle: evacuating && !reducedMotion ? settle(t, 6.55, 0.8) : 0,
    signSettle: reducedMotion ? 0 : settle(t, stampContact(procedure) + 0.95, 0.65),
    rotor: reducedMotion ? 0 : 3 * smoothRange(t, 0.2, 3.2) + (evacuating
      ? 25 * smoothRange(t, 5.1, 11.35) + 2 * smoothRange(t, 11.35, 15.6)
      : 2 * smoothRange(t, 3.2, 5.8)),
  }
}

// Every moving assembly derives from the same clock; replay and skipped beats cannot drift apart.
export function sequencePose(elapsed: number, procedure: Procedure) {
  const inspect = procedure === 'inspection'
  const timing = printerTiming(procedure)
  const stampStart = timing.start
  const stampDown = smoothRange(elapsed, stampStart + 0.38, stampStart + 0.65)
    * (1 - smoothRange(elapsed, stampStart + 0.85, stampStart + 1.45))
  const safe = elapsed >= stampStart + 0.65
  return {
    scanner: smoothRange(elapsed, 0.2, 1.3) * (1 - smoothRange(elapsed, 3, 4.5)),
    braces: inspect ? 0 : smoothRange(elapsed, 3.2, 5) * (1 - smoothRange(elapsed, 14.2, 16.5)),
    energy: inspect ? 0 : smoothRange(elapsed, 5.4, 7.3) * (1 - smoothRange(elapsed, 10.2, 11.4)),
    charge: inspect ? 0 : smoothRange(elapsed, 6, 10.8),
    stampDown,
    paper: smoothRange(elapsed, stampStart - 0.4, stampStart + 0.1),
    reveal: smoothRange(elapsed, timing.feedStart, timing.feedEnd),
    safe,
  }
}

export function artworkFor(elapsed: number, procedure: Procedure): ArtworkState {
  return procedure === 'inspection' || sequencePose(elapsed, procedure).safe ? 'safe' : 'not-safe'
}

export type SignalState = 'waiting' | 'active' | 'done' | 'bypassed'

// Existing safe artwork is not the same as a finished inspection or a printed receipt.
export function storySignals(elapsed: number, procedure: Procedure, running: boolean): readonly SignalState[] {
  if (!running && elapsed === 0) return ['waiting', 'waiting', 'waiting']
  const printing = procedure === 'inspection' ? 3.2 : 11.4
  return [
    elapsed < 3.2 ? 'active' : 'done',
    procedure === 'inspection' ? 'bypassed' : elapsed < 3.2 ? 'waiting' : elapsed < printing ? 'active' : 'done',
    elapsed < printing ? 'waiting' : sequencePose(elapsed, procedure).reveal < 1 ? 'active' : 'done',
  ]
}

export function passengerPose(elapsed: number, procedure: Procedure, reducedMotion: boolean) {
  return {
    visible: procedure === 'evacuation' && elapsed >= (reducedMotion ? 10.7 : 5.8),
    progress: reducedMotion ? 1
      : 0.46 * smoothRange(elapsed, MECHANICAL_TIMING.launch, MECHANICAL_TIMING.crest)
        + 0.54 * smoothRange(elapsed, MECHANICAL_TIMING.relaunch, MECHANICAL_TIMING.arrival),
    scale: reducedMotion ? 1 : smoothRange(elapsed, 5.8, 6.2),
    arrived: procedure === 'evacuation' && elapsed >= 10.7,
  }
}

export function advanceClock(elapsed: number, delta: number, procedure: Procedure, hidden: boolean) {
  if (hidden) return elapsed
  return Math.min(durationFor(procedure), elapsed + Math.max(0, Math.min(delta, 0.08)))
}
