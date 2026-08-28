import { describe, expect, it } from 'vitest'
import {
  resolveMuseumDetailVisibility,
  resolveMuseumPerformanceProfile,
} from '../src/museum/formal-room/museumPerformanceProfile'

describe('museum performance profile', () => {
  it('protects phones and touch-first tablets with the compact render budget', () => {
    const profile = resolveMuseumPerformanceProfile({
      viewportWidth: 1280,
      coarsePointer: true,
      saveData: false,
      deviceMemoryGb: 8,
      hardwareConcurrency: 8,
    })

    expect(profile.tier).toBe('compact')
    expect(profile.antialias).toBe(false)
    expect(profile.dpr[0]).toBe(profile.dpr[1])
    expect(profile.dpr[1]).toBe(0.86)
    expect(profile.activeMotionFps).toBeLessThan(12)
    expect(profile.glowbudMotionFps).toBe(12)
    expect(profile.distantGlowbudMotionFps).toBe(6)
  })

  it('honors reduced-data and constrained hardware signals', () => {
    expect(resolveMuseumPerformanceProfile({
      viewportWidth: 1440,
      coarsePointer: false,
      saveData: true,
      hardwareConcurrency: 12,
    }).tier).toBe('compact')
    expect(resolveMuseumPerformanceProfile({
      viewportWidth: 1440,
      coarsePointer: false,
      saveData: false,
      deviceMemoryGb: 4,
      hardwareConcurrency: 12,
    }).tier).toBe('compact')
  })

  it('keeps a showcase tier for capable large-screen devices', () => {
    const profile = resolveMuseumPerformanceProfile({
      viewportWidth: 1600,
      coarsePointer: false,
      saveData: false,
      deviceMemoryGb: 16,
      hardwareConcurrency: 12,
    })

    expect(profile.tier).toBe('showcase')
    expect(profile.dpr[1]).toBe(0.9)
    expect(profile.activeMotionFps).toBe(10)
    expect(profile.glowbudMotionFps).toBe(18)
    expect(profile.distantGlowbudMotionFps).toBe(8)
    expect(profile.artworkMotionDistance).toBeLessThanOrEqual(18)
  })

  it('keeps nearby visible detail while dropping work behind or far outside the camera', () => {
    expect(resolveMuseumDetailVisibility({
      distance: 9,
      projectedX: 0.8,
      projectedY: 0.2,
      projectedZ: 0.5,
      maxDistance: 10,
      wasDetailed: false,
    })).toBe(true)
    expect(resolveMuseumDetailVisibility({
      distance: 9,
      projectedX: 0,
      projectedY: 0,
      projectedZ: 1.2,
      maxDistance: 10,
      wasDetailed: false,
    })).toBe(false)
    expect(resolveMuseumDetailVisibility({
      distance: 14,
      projectedX: 0,
      projectedY: 0,
      projectedZ: 0.5,
      maxDistance: 10,
      wasDetailed: false,
    })).toBe(false)
  })

  it('uses a small hysteresis buffer so detail does not pop at the boundary', () => {
    expect(resolveMuseumDetailVisibility({
      distance: 11.8,
      projectedX: 1.4,
      projectedY: 0,
      projectedZ: 0.5,
      maxDistance: 10,
      wasDetailed: true,
    })).toBe(true)
    expect(resolveMuseumDetailVisibility({
      distance: 11.8,
      projectedX: 1.4,
      projectedY: 0,
      projectedZ: 0.5,
      maxDistance: 10,
      wasDetailed: false,
    })).toBe(false)
  })
})
