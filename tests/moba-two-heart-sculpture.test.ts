import { describe, expect, it } from 'vitest'
import {
  MOBA_TWO_HEART_SCULPTURE_SPEC,
  mobaTwoHeartMotionAtPhase,
} from '../src/museum/formal-room/mobaTwoHeartSculpture'
import { MUSEUM_GALLERY_BY_ID } from '../src/museum/formal-room/museumPlan'

describe('MoBA #2 Yes / Yes origin sculpture', () => {
  it('centers the hero installation in its room and keeps its collider aligned', () => {
    const gallery = MUSEUM_GALLERY_BY_ID['moba-two']
    const centerZ = (gallery.minZ + gallery.maxZ) * 0.5
    expect(MOBA_TWO_HEART_SCULPTURE_SPEC).toMatchObject({
      originArtworkId: 'yes-yes',
      localPosition: [0, 0, centerZ],
      worldCenter: [gallery.placement.x, gallery.placement.z + centerZ - gallery.minZ],
      fixedYaw: -0.18,
      cycleSeconds: 1.68,
    })
    const collider = MOBA_TWO_HEART_SCULPTURE_SPEC.collider
    expect((collider.minX + collider.maxX) * 0.5).toBeCloseTo(MOBA_TWO_HEART_SCULPTURE_SPEC.worldCenter[0], 8)
    expect((collider.minZ + collider.maxZ) * 0.5).toBeCloseTo(MOBA_TWO_HEART_SCULPTURE_SPEC.worldCenter[1], 8)
  })

  it('authors one bounded anticipation, flight, landing, and settle cycle', () => {
    const samples = Array.from({ length: 241 }, (_, index) => (
      mobaTwoHeartMotionAtPhase(index / 240)
    ))
    for (const motion of samples) {
      for (const value of Object.values(motion)) expect(Number.isFinite(value)).toBe(true)
      expect(motion.height).toBeGreaterThanOrEqual(-0.026)
      expect(motion.height).toBeLessThanOrEqual(MOBA_TWO_HEART_SCULPTURE_SPEC.bounceHeight + 0.001)
      expect(motion.scaleX).toBeGreaterThanOrEqual(0.96)
      expect(motion.scaleX).toBeLessThanOrEqual(1.1)
      expect(motion.scaleY).toBeGreaterThanOrEqual(0.87)
      expect(motion.scaleY).toBeLessThanOrEqual(1.08)
      expect(motion.shadowOpacity).toBeGreaterThanOrEqual(0.1)
      expect(motion.shadowOpacity).toBeLessThanOrEqual(0.26)
      expect(motion.lightPoolPulse).toBeGreaterThanOrEqual(0)
      expect(motion.lightPoolPulse).toBeLessThanOrEqual(1)
    }

    expect(mobaTwoHeartMotionAtPhase(0)).toEqual(mobaTwoHeartMotionAtPhase(1))
    expect(mobaTwoHeartMotionAtPhase(0.06)).toMatchObject({
      height: expect.any(Number),
      scaleX: expect.any(Number),
      scaleY: expect.any(Number),
    })
    expect(mobaTwoHeartMotionAtPhase(0.06).height).toBeLessThan(0)
    expect(mobaTwoHeartMotionAtPhase(0.06).scaleX).toBeGreaterThan(1.04)
    expect(mobaTwoHeartMotionAtPhase(0.06).scaleY).toBeLessThan(0.94)
    expect(mobaTwoHeartMotionAtPhase(0.42).height).toBeGreaterThan(0.44)
    expect(mobaTwoHeartMotionAtPhase(0.79).scaleX).toBeGreaterThan(1.08)
    expect(mobaTwoHeartMotionAtPhase(0.79).scaleY).toBeLessThan(0.89)
    expect(mobaTwoHeartMotionAtPhase(0.79).lightPoolPulse).toBeGreaterThan(0.98)
  })

  it('always settles to the same composed pose for reduced motion', () => {
    const settled = mobaTwoHeartMotionAtPhase(0, true)
    for (const phase of [0.17, 0.42, 0.79, 0.99]) {
      expect(mobaTwoHeartMotionAtPhase(phase, true)).toEqual(settled)
    }
  })
})
