import { describe, expect, it } from 'vitest'
import { advanceJourney, EMPTY_JOURNEY, journeyCleared, journeyCopy, journeyGate, JOURNEY_GATES, waitingMotion, type LiveJourney } from '../src/museum/deabstractor/liveJourney'
import { artworkFor, passengerPose, sequencePose } from '../src/museum/deabstractor/sequence'
import { galleryLightingPose } from '../src/museum/deabstractor/lightingScore'

const trip = (phase: LiveJourney['phase'], arrived: number[] = []): LiveJourney => ({ ...EMPTY_JOURNEY, id: 'trip', phase, tokens: [968, 1677, 2000], active: [968], arrived })
function run(journey: LiveJourney, start = 0, frames = 4000) {
  let t = start
  for (let i = 0; i < frames; i++) t = advanceJourney(t, 1 / 60, journey, false)
  return t
}
describe('Receipt-gated live choreography', () => {
  it.each(['preparing', 'approval', 'pending'] as const)('can hold %s indefinitely without clearance or paper', phase => {
    const elapsed = run(trip(phase))
    expect(elapsed).toBe(JOURNEY_GATES[phase])
    expect(artworkFor(elapsed, 'evacuation')).toBe('not-safe')
    expect(sequencePose(elapsed, 'evacuation').reveal).toBe(0)
    expect(passengerPose(elapsed, 'evacuation', false).arrived).toBe(false)
  })
  it('does not interpret a partial or missing manifest as success', () => {
    expect(journeyCleared(trip('confirmed', [968]))).toBe(false)
    expect(journeyCleared({ ...trip('confirmed'), tokens: [] })).toBe(false)
    expect(journeyGate(trip('confirmed', [968]))).toBe(JOURNEY_GATES.pending)
  })
  it('continues the existing performance only after every passenger is verified', () => {
    const elapsed = run(trip('confirmed', [968, 1677, 2000]), JOURNEY_GATES.pending)
    expect(elapsed).toBe(18)
    expect(artworkFor(elapsed, 'evacuation')).toBe('safe')
  })
  it('never rewinds for the next separate wallet approval', () => {
    expect(run(trip('approval', [968]), JOURNEY_GATES.pending)).toBe(JOURNEY_GATES.pending)
  })
  it.each(['cancelled', 'partial'] as const)('stands down a %s trip instead of completing it', phase => {
    const elapsed = run(trip(phase, phase === 'partial' ? [968] : []), JOURNEY_GATES.pending)
    expect(elapsed).toBe(0)
    expect(artworkFor(elapsed, 'evacuation')).toBe('not-safe')
  })
  it('does not advance in hidden tabs or jump after a stalled frame', () => {
    expect(advanceJourney(4, 100, trip('pending'), true)).toBe(4)
    expect(advanceJourney(4, 100, trip('pending'), false)).toBeLessThanOrEqual(4.08)
  })
  it('counts actual arrivals and names separate wallet approvals honestly', () => {
    expect(journeyCopy(trip('approval', [968])).title).toBe('Approve bud 2 of 3')
    expect(journeyCopy(trip('partial', [968])).screen).toBe('1 / 3 ARRIVED')
    expect(journeyCopy({ ...trip('approval'), grouped: true }).title).toBe('Approve 3 buds together')
  })
  it('bounds the waiting animation and disables it for reduced motion', () => {
    for (let t = 0; t < 60; t += .05) {
      const pose = waitingMotion(t, true, false)
      expect(pose.breath).toBeGreaterThanOrEqual(0)
      expect(pose.breath).toBeLessThanOrEqual(1)
      expect(Math.abs(pose.lean)).toBeLessThanOrEqual(.008)
      expect(waitingMotion(t, true, true)).toEqual({ breath: 0, lean: 0 })
    }
  })
  it('keeps live warning sweeps moving without borrowing the success lighting', () => {
    const first = galleryLightingPose(8.05, 'evacuation', false, 0)
    const waiting = galleryLightingPose(8.05, 'evacuation', false, 13)
    expect(waiting.phase).not.toBe(first.phase)
    expect(waiting.clearance).toBe(0)
    expect(waiting.celebration).toBe(0)
    expect(galleryLightingPose(8.05, 'evacuation', true, 13).phase).toBe(0)
  })
})
