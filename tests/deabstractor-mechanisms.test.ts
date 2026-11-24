import { describe, expect, it } from 'vitest'
import { crossedSoundCues, durationFor, MECHANICAL_TIMING as M, mechanismPose, passengerPose, sequencePose } from '../src/museum/deabstractor/sequence'

describe('De-Abstractor authored mechanical performance', () => {
  it('latches the two braces on their separate sound contacts and releases both at the end', () => {
    const first = mechanismPose(M.leftLock, 'evacuation')
    expect(first.leftBrace).toBe(1)
    expect(first.rightBrace).toBe(0)
    expect(mechanismPose(M.rightLock, 'evacuation').rightBrace).toBe(1)
    for (const t of [M.leftLock, M.rightLock]) expect(crossedSoundCues(t - 0.01, t, 'evacuation')).toEqual(['lock'])
    expect(mechanismPose(18, 'evacuation').leftBrace).toBe(0)
    expect(mechanismPose(18, 'evacuation').rightBrace).toBe(0)
  })

  it('gives every pump squeeze one sound and no continuous pumping outside its three strokes', () => {
    expect(crossedSoundCues(0, 18, 'evacuation').filter(cue => cue === 'pump')).toHaveLength(3)
    M.pumps.forEach((t, i) => {
      expect(mechanismPose(t, 'evacuation').pump).toBeCloseTo(0.28 + i * 0.05)
      expect(crossedSoundCues(t - 0.01, t, 'evacuation')).toContain('pump')
    })
    for (const t of [0, 3, 5, 7, 9, 14, 18]) expect(mechanismPose(t, 'evacuation').pump).toBe(0)
  })

  it('holds briefly at the crest, then arrives without reversing or overshooting the rail', () => {
    for (const t of [M.crest, 8.25, M.relaunch]) expect(passengerPose(t, 'evacuation', false).progress).toBe(0.46)
    let previous = 0
    for (let t = 0; t <= 19; t += 0.005) {
      const progress = passengerPose(t, 'evacuation', false).progress
      expect(progress).toBeGreaterThanOrEqual(previous)
      expect(progress).toBeLessThanOrEqual(1)
      previous = progress
    }
    expect(passengerPose(M.arrival, 'evacuation', false).progress).toBe(1)
    expect(crossedSoundCues(M.arrival - 0.01, M.arrival, 'evacuation')).toEqual(['arrive'])
  })

  it('cushions the supported arrival only after rail travel has finished', () => {
    for (let t = 0; t < 18; t += 0.005) {
      const { dockDrop } = mechanismPose(t, 'evacuation')
      expect(dockDrop).toBeGreaterThanOrEqual(0)
      expect(dockDrop).toBeLessThanOrEqual(0.045)
      if (dockDrop > 0) expect(passengerPose(t, 'evacuation', false).progress).toBe(1)
      if (t >= 11.35) expect(dockDrop).toBe(0)
    }
  })

  it('keeps the authored poses finite, continuous, and completely settled at completion', () => {
    for (const procedure of ['evacuation', 'inspection'] as const) {
      for (let t = 0; t < durationFor(procedure); t += 0.02) {
        const a = mechanismPose(t, procedure), b = mechanismPose(t + 0.001, procedure)
        for (const key of Object.keys(a) as (keyof typeof a)[]) {
          expect(Number.isFinite(a[key])).toBe(true)
          expect(Math.abs(a[key] - b[key])).toBeLessThan(0.02)
        }
      }
      expect(mechanismPose(durationFor(procedure), procedure)).toEqual(mechanismPose(durationFor(procedure) + 10, procedure))
      const reduced = mechanismPose(6.55, procedure, true)
      for (const key of ['pump', 'strain', 'scannerYaw', 'nod', 'dockDrop', 'needleSettle', 'signSettle', 'rotor'] as const) expect(reduced[key]).toBe(0)
    }
  })

  it('starts the printer sound at release and waits for the completed sheet before the clear chord', () => {
    for (const [procedure, feedAt, clearAt] of [['evacuation', 12.9, 15.1], ['inspection', 4.7, 5.9]] as const) {
      expect(sequencePose(feedAt, procedure).stampDown).toBe(0)
      expect(sequencePose(feedAt - 0.01, procedure).reveal).toBe(0)
      expect(crossedSoundCues(feedAt - 0.01, feedAt, procedure)).toEqual(['print'])
      expect(sequencePose(clearAt, procedure).reveal).toBe(1)
      expect(crossedSoundCues(clearAt - 0.01, clearAt, procedure)).toEqual(['clear'])
    }
  })
})
