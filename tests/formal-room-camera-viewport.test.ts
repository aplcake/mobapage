import { describe, expect, it } from 'vitest'
import {
  FORMAL_ROOM_EXPLORE_FOV,
  isFormalRoomCompactViewport,
  selectFormalRoomExploreFov,
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
})
