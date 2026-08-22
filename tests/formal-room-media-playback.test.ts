import { describe, expect, it } from 'vitest'
import {
  containFormalRoomMotion,
  formalRoomAnimatedImageLongEdge,
  formalRoomMotionAttemptOrder,
  FORMAL_ROOM_ANIMATED_IMAGE_MAX_FPS,
  shouldPaintFormalRoomAnimationFrame,
} from '../src/museum/formal-room/mediaPlayback'

describe('Formal Room animated artwork playback policy', () => {
  it('uses the trusted media hint and probes both safe elements only when the kind is unknown', () => {
    expect(formalRoomMotionAttemptOrder('image')).toEqual(['image'])
    expect(formalRoomMotionAttemptOrder('video')).toEqual(['video'])
    expect(formalRoomMotionAttemptOrder('unknown')).toEqual(['video', 'image'])
    expect(formalRoomMotionAttemptOrder(undefined)).toEqual(['video', 'image'])
  })

  it('keeps animated image canvases bounded on phones and desktops', () => {
    expect(formalRoomAnimatedImageLongEdge(390)).toBe(768)
    expect(formalRoomAnimatedImageLongEdge(700)).toBe(768)
    expect(formalRoomAnimatedImageLongEdge(701)).toBe(1024)
    expect(formalRoomAnimatedImageLongEdge(1440)).toBe(1024)
  })

  it('never repaints animated image textures above fifteen frames per second', () => {
    const interval = 1000 / FORMAL_ROOM_ANIMATED_IMAGE_MAX_FPS
    expect(shouldPaintFormalRoomAnimationFrame(interval - 0.01, 0, true)).toBe(false)
    expect(shouldPaintFormalRoomAnimationFrame(interval, 0, true)).toBe(true)
    expect(shouldPaintFormalRoomAnimationFrame(interval * 3 + 0.01, interval * 2, true)).toBe(true)
    expect(shouldPaintFormalRoomAnimationFrame(10_000, 0, false)).toBe(false)
  })

  it('contains portrait and landscape video without stretching it to the frame', () => {
    const landscapeInPortrait = containFormalRoomMotion([1.72, 2.24], [16, 9])
    expect(landscapeInPortrait[0]).toBeCloseTo(1.72 * 0.964)
    expect(landscapeInPortrait[1]).toBeLessThan(2.24 * 0.964)

    const portraitInLandscape = containFormalRoomMotion([3.05, 2.08], [9, 16])
    expect(portraitInLandscape[0]).toBeLessThan(3.05 * 0.964)
    expect(portraitInLandscape[1]).toBeCloseTo(2.08 * 0.964)
  })
})
