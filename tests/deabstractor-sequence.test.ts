import { describe, expect, it } from 'vitest'
import { advanceClock, artworkFor, crossedSoundCues, durationFor, getBeat, impactAt, passengerPose, sequencePose, stampContact, storySignals } from '../src/museum/deabstractor/sequence'

describe('De-Abstractor cinematic contract', () => {
  it('has exactly two artwork states, independent of the cinematic beats', () => {
    const states = new Set<string>()
    for (const procedure of ['evacuation', 'inspection'] as const) {
      for (let t = 0; t < 20; t += 0.05) states.add(artworkFor(t, procedure))
    }
    expect([...states].sort()).toEqual(['not-safe', 'safe'])
  })

  it('keeps an evacuation not-safe until the stamp contacts the receipt', () => {
    expect(artworkFor(0, 'evacuation')).toBe('not-safe')
    expect(artworkFor(11.9, 'evacuation')).toBe('not-safe')
    expect(artworkFor(12.1, 'evacuation')).toBe('safe')
    expect(artworkFor(18, 'evacuation')).toBe('safe')
  })

  it('checks an already-safe bud without running a relocation', () => {
    for (let t = 0; t <= 6; t += 0.1) {
      expect(artworkFor(t, 'inspection')).toBe('safe')
      expect(sequencePose(t, 'inspection').energy).toBe(0)
      expect(sequencePose(t, 'inspection').braces).toBe(0)
      expect(getBeat(t, 'inspection', true)).not.toBe('transport')
    }
  })

  it('has an authored, finite beginning, middle and settled ending', () => {
    expect(getBeat(0, 'evacuation', false)).toBe('standby')
    expect([1, 4, 8, 12, 15, 18].map(t => getBeat(t, 'evacuation', true))).toEqual(['scan', 'brace', 'transport', 'stamp', 'settle', 'complete'])
    const end = sequencePose(18, 'evacuation')
    expect(end.scanner).toBe(0)
    expect(end.braces).toBe(0)
    expect(end.stampDown).toBe(0)
    expect(end.energy).toBe(0)
    expect(end.reveal).toBe(1)
  })

  it('all mechanisms stay bounded and continuous across transitions', () => {
    const numeric = ['scanner', 'braces', 'energy', 'charge', 'stampDown', 'paper', 'reveal'] as const
    for (const procedure of ['evacuation', 'inspection'] as const) {
      for (let t = 0; t <= durationFor(procedure); t += 0.02) {
        const a = sequencePose(t, procedure), b = sequencePose(t + 0.001, procedure)
        numeric.forEach(key => {
          expect(a[key]).toBeGreaterThanOrEqual(0)
          expect(a[key]).toBeLessThanOrEqual(1)
          expect(Math.abs(a[key] - b[key])).toBeLessThan(0.01)
        })
      }
    }
  })

  it('pauses in hidden tabs, caps lag spikes, and clamps at completion', () => {
    expect(advanceClock(2, 10, 'evacuation', true)).toBe(2)
    expect(advanceClock(2, 10, 'evacuation', false)).toBe(2.08)
    expect(advanceClock(2, -1, 'evacuation', false)).toBe(2)
    expect(advanceClock(17.99, 0.08, 'evacuation', false)).toBe(18)
    expect(advanceClock(5.99, 0.08, 'inspection', false)).toBe(6)
  })

  it('scores each mechanism once, even when a frame crosses its exact cue time', () => {
    for (const procedure of ['evacuation', 'inspection'] as const) {
      const played: string[] = []
      for (let t = 0; t < durationFor(procedure); t += 0.08) played.push(...crossedSoundCues(t, t + 0.08, procedure))
      expect(played.filter(cue => cue === 'stamp')).toHaveLength(1)
      expect(played.filter(cue => cue === 'clear')).toHaveLength(1)
      const contact = stampContact(procedure)
      expect(crossedSoundCues(contact - 0.01, contact, procedure)).toEqual(['stamp'])
      expect(crossedSoundCues(contact, contact, procedure)).toEqual([])
      expect(crossedSoundCues(contact, 0, procedure)).toEqual([])
      if (procedure === 'inspection') expect(played).toEqual(['scan', 'stamp', 'print', 'clear'])
    }
  })

  it('keeps the stamp impact brief, finite, and entirely after physical contact', () => {
    for (const procedure of ['evacuation', 'inspection'] as const) {
      const contact = stampContact(procedure)
      expect(impactAt(contact - 0.05, procedure)).toBe(0)
      expect(impactAt(contact + 0.12, procedure)).toBeGreaterThan(0)
      expect(impactAt(contact + 0.49, procedure)).toBe(0)
      for (let t = 0; t < 20; t += 0.02) expect(impactAt(t, procedure)).toBeLessThanOrEqual(1)
    }
  })

  it('distinguishes safe artwork from a finished check and skips the transport signal', () => {
    expect(storySignals(0, 'evacuation', false)).toEqual(['waiting', 'waiting', 'waiting'])
    expect(artworkFor(0, 'inspection')).toBe('safe')
    expect(storySignals(0, 'inspection', true)).toEqual(['active', 'bypassed', 'waiting'])
    for (const procedure of ['evacuation', 'inspection'] as const) {
      const contact = stampContact(procedure)
      expect(storySignals(contact, procedure, true)[2]).toBe('active')
      expect(storySignals(durationFor(procedure), procedure, false)[2]).toBe('done')
    }
    expect(storySignals(8, 'evacuation', true)).toEqual(['done', 'active', 'waiting'])
    expect(storySignals(12, 'evacuation', true)).toEqual(['done', 'done', 'active'])
  })

  it('keeps the passenger visible at the receiving dock through stamping and completion', () => {
    for (let t = 0; t <= 18; t += 0.05) {
      expect(passengerPose(t, 'inspection', false).visible).toBe(false)
      if (t >= 6.2) expect(passengerPose(t, 'evacuation', false).visible).toBe(true)
      if (t >= 10.7) {
        for (const reduced of [true, false]) expect(passengerPose(t, 'evacuation', reduced)).toEqual({ visible: true, progress: 1, scale: 1, arrived: true })
      }
    }
    expect(passengerPose(8, 'evacuation', true).visible).toBe(false)
    expect(passengerPose(8, 'evacuation', false).progress).toBeGreaterThan(0)
    expect(passengerPose(8, 'evacuation', false).progress).toBeLessThan(passengerPose(9, 'evacuation', false).progress)
  })
})
