import { advanceClock, durationFor } from './sequence'

export type JourneyPhase = 'connect' | 'connecting' | 'boarding' | 'review' | 'preparing' | 'approval' | 'pending' | 'confirmed' | 'cancelled' | 'partial'
export type LiveJourney = {
  id: string | null
  phase: JourneyPhase
  tokens: number[]
  arrived: number[]
  active: number[]
  grouped: boolean
}
export const EMPTY_JOURNEY: LiveJourney = { id: null, phase: 'connect', tokens: [], arrived: [], active: [], grouped: false }
export const JOURNEY_GATES = { preparing: 3.05, approval: 5.05, pending: 8.05 } as const
export function journeyCleared(journey?: LiveJourney) {
  return Boolean(journey?.phase === 'confirmed' && journey.tokens.length && journey.tokens.every(token => journey.arrived.includes(token)))
}
export function journeyStopped(journey?: LiveJourney) { return journey?.phase === 'cancelled' || journey?.phase === 'partial' }
export function journeyGate(journey: LiveJourney) {
  if (journeyCleared(journey)) return durationFor('evacuation')
  if (journey.phase === 'preparing') return JOURNEY_GATES.preparing
  if (journey.phase === 'approval') return JOURNEY_GATES.approval
  return JOURNEY_GATES.pending
}
// The network owns permission to advance, never the animation timer. Later serial
// approvals hold the same carrier instead of rewinding an already-departed group.
export function advanceJourney(elapsed: number, delta: number, journey: LiveJourney, hidden: boolean) {
  if (hidden) return elapsed
  if (journeyStopped(journey)) return Math.max(0, elapsed - Math.min(Math.max(delta, 0), .08) * 6)
  return Math.min(advanceClock(elapsed, delta, 'evacuation', false), Math.max(elapsed, journeyGate(journey)))
}
export function journeyCopy(journey: LiveJourney) {
  const total = journey.tokens.length, count = journey.arrived.length
  switch (journey.phase) {
    case 'connect': return { screen: 'AWAITING PASSENGERS', title: 'All buds aboard.', detail: 'Connect the wallet holding your buds.' }
    case 'connecting': return { screen: 'FINDING YOUR BUDS', title: 'Checking the passenger list', detail: 'Connecting does not move anything.' }
    case 'boarding': return { screen: total ? `${total} ABOARD` : 'CHOOSE YOUR PASSENGERS', title: `${total} buds aboard`, detail: 'Choose your passengers, then a receiving wallet.' }
    case 'review': return { screen: 'READY WHEN YOU ARE', title: 'Ready for departure', detail: 'Review the wallets and passengers before sending.' }
    case 'preparing': return { screen: 'DEPARTURE CHECKS', title: 'Preparing your departure', detail: 'Checking ownership, destination, and network.' }
    case 'approval': return { screen: 'YOUR WALLET HAS THE BUTTON', title: journey.grouped ? `Approve ${total} buds together` : `Approve bud ${count + 1} of ${total}`, detail: 'Confirm in your sending wallet. The machine will wait.' }
    case 'pending': return { screen: 'WAITING FOR ABSTRACT', title: 'Waiting for network confirmation', detail: count ? `${count} of ${total} arrived. Tracking the rest automatically.` : 'Your departure is being checked automatically. No need to send again.' }
    case 'confirmed': return { screen: `${count} / ${total} ARRIVED`, title: `${count} bud${count === 1 ? '' : 's'} arrived`, detail: 'Confirmed on Abstract. Ethereum airdrop comes later.' }
    case 'partial': return { screen: `${count} / ${total} ARRIVED`, title: `${count} of ${total} arrived`, detail: 'The trip stopped. Arrivals are saved; the remaining buds were not confirmed.' }
    case 'cancelled': return { screen: 'DEPARTURE STOOD DOWN', title: 'Departure stopped', detail: 'No arrivals confirmed. Check the departure details before trying again.' }
  }
}

// Small, bounded held poses; these never move the passenger past its proof gate.
export function waitingMotion(time: number, holding: boolean, reduced: boolean, strength = 1) {
  const weight = Math.max(0, Math.min(1, strength))
  const breath = holding && !reduced ? (1 - Math.cos(time * Math.PI)) * .5 * weight : 0
  return { breath, lean: holding && !reduced ? Math.sin(time * Math.PI * .5) * .008 * weight : 0 }
}
