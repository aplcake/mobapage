import { describe, expect, it } from 'vitest'
import { galleryLightingPose } from '../src/museum/deabstractor/lightingScore'
import { durationFor, printerTiming } from '../src/museum/deabstractor/sequence'

describe('De-Abstractor theatrical lighting', () => {
  for (const procedure of ['evacuation', 'inspection'] as const) {
    it(`${procedure}: starts neutral, finishes steadily clear and clears red before printing`, () => {
      for (const t of [0, durationFor(procedure), 100]) {
        const pose = galleryLightingPose(t, procedure)
        expect([pose.warning, pose.focus]).toEqual([0, 0])
        expect(pose.clearance).toBe(t === 0 ? 0 : 1)
      }
      expect(galleryLightingPose(printerTiming(procedure).contact, procedure).warning).toBe(0)
      expect(galleryLightingPose(printerTiming(procedure).clear + 0.2, procedure).clearance).toBeGreaterThan(0)
    })
    it(`${procedure}: bounded smooth changes and deterministic paused poses`, () => {
      let previous = galleryLightingPose(0, procedure)
      for (let t = 0; t <= durationFor(procedure); t += 1 / 60) {
        const pose = galleryLightingPose(t, procedure)
        expect(pose).toEqual(galleryLightingPose(t, procedure))
        for (const key of ['warning', 'clearance', 'focus', 'pressure', 'celebration'] as const) {
          expect(pose[key]).toBeGreaterThanOrEqual(0)
          expect(pose[key]).toBeLessThanOrEqual(1)
          expect(Math.abs(pose[key] - previous[key])).toBeLessThan(0.06)
        }
        previous = pose
      }
    })
  }
  it('inspection bypasses alarms; reduced motion has no sweep or repeating modulation', () => {
    for (let t = 0; t <= 18; t += 0.1) {
      expect(galleryLightingPose(t, 'inspection').warning).toBe(0)
      expect(galleryLightingPose(t, 'inspection').celebration).toBe(0)
      const pose = galleryLightingPose(t, 'evacuation', true)
      expect(pose.phase).toBe(0)
      expect(pose.sweep).toBe(0)
      expect(pose.left).toBe(pose.right)
      expect(pose.warning).toBeLessThanOrEqual(0.38)
      expect(pose.pressure).toBeLessThanOrEqual(0.25)
      expect(pose.celebration).toBe(0)
    }
  })
  it('builds pressure before arrival and celebrates only after the printed result', () => {
    const timing = printerTiming('evacuation')
    expect(galleryLightingPose(3.2, 'evacuation').pressure).toBe(0)
    expect(galleryLightingPose(6.55, 'evacuation').pressure).toBe(1)
    expect(galleryLightingPose(timing.contact, 'evacuation').pressure).toBe(0)
    for (let t = 0; t <= timing.clear; t += 0.1) expect(galleryLightingPose(t, 'evacuation').celebration).toBe(0)
    expect(galleryLightingPose(timing.clear + 0.7, 'evacuation').celebration).toBe(1)
    for (const t of [0, durationFor('evacuation'), 100]) expect(galleryLightingPose(t, 'evacuation').celebration).toBe(0)
  })
})
