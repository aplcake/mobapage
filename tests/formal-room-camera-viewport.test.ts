import { describe, expect, it } from 'vitest'
import {
  FORMAL_ROOM_EXPLORE_FOV,
  FORMAL_ROOM_FOV_PROJECTION_EPSILON,
  isFormalRoomCompactViewport,
  selectFormalRoomExploreFov,
  stepFormalRoomFovProjection,
} from '../src/museum/formal-room/cameraViewport'

describe('Formal Room camera viewport selection', () => {
  it('keeps the 700px compact breakpoint deterministic', () => {
    expect(isFormalRoomCompactViewport(699)).toBe(true)
    expect(isFormalRoomCompactViewport(700)).toBe(true)
    expect(isFormalRoomCompactViewport(701)).toBe(false)
  })

  it.each([
    [390, 844],
    [430, 932],
    [700, 900],
    [700, 700],
  ])('uses a wider portrait-phone FOV for %sx%s', (width, height) => {
    expect(selectFormalRoomExploreFov(width, height)).toBe(FORMAL_ROOM_EXPLORE_FOV.portraitPhone)
  })

  it.each([
    [844, 390],
    [667, 375],
    [701, 700],
  ])('uses a modest short-landscape FOV for %sx%s', (width, height) => {
    expect(selectFormalRoomExploreFov(width, height)).toBe(FORMAL_ROOM_EXPLORE_FOV.shortLandscape)
  })

  it.each([
    [1440, 900],
    [1024, 768],
    [701, 900],
  ])('keeps the desktop FOV for %sx%s', (width, height) => {
    expect(selectFormalRoomExploreFov(width, height)).toBe(FORMAL_ROOM_EXPLORE_FOV.desktop)
  })

  it('falls back safely when dimensions are unavailable', () => {
    expect(selectFormalRoomExploreFov(0, 844)).toBe(FORMAL_ROOM_EXPLORE_FOV.desktop)
    expect(selectFormalRoomExploreFov(Number.NaN, 844)).toBe(FORMAL_ROOM_EXPLORE_FOV.desktop)
    expect(selectFormalRoomExploreFov(390, Number.POSITIVE_INFINITY)).toBe(FORMAL_ROOM_EXPLORE_FOV.desktop)
  })

  it('only requests projection work after FOV movement accumulates past the visual threshold', () => {
    const quietFrame = stepFormalRoomFovProjection(43, 52, 43, 0.02, 1 / 120)
    expect(Math.abs(quietFrame.fov - 43)).toBeLessThan(FORMAL_ROOM_FOV_PROJECTION_EPSILON)
    expect(quietFrame.shouldUpdateProjection).toBe(false)

    const accumulatedFrame = stepFormalRoomFovProjection(43.02, 52, 43, 8, 1 / 60)
    expect(accumulatedFrame.shouldUpdateProjection).toBe(true)
  })

  it('snaps the final tiny FOV remainder once, then stops projection updates at rest', () => {
    const finalFrame = stepFormalRoomFovProjection(51.995, 52, 51.994, 8, 1 / 60)
    expect(finalFrame.fov).toBe(52)
    expect(finalFrame.shouldUpdateProjection).toBe(true)

    const restingFrame = stepFormalRoomFovProjection(
      finalFrame.fov,
      52,
      finalFrame.fov,
      8,
      1 / 60,
    )
    expect(restingFrame.fov).toBe(52)
    expect(restingFrame.shouldUpdateProjection).toBe(false)
  })

  it('fails closed instead of corrupting the projection with invalid frame measurements', () => {
    expect(stepFormalRoomFovProjection(52, 43, 52, 8, Number.NaN)).toEqual({
      fov: 52,
      shouldUpdateProjection: false,
    })
  })
})
