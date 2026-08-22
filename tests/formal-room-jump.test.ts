import { describe, expect, it } from 'vitest'
import {
  beginFormalJump,
  createFormalJumpState,
  resetFormalJumpState,
  stepFormalJumpState,
} from '../src/museum/formal-room/jumpMath'

describe('Formal Room jump', () => {
  it('creates one grounded museum hop and lands cleanly', () => {
    const state = createFormalJumpState()
    expect(beginFormalJump(state, false)).toBe(true)
    expect(beginFormalJump(state, false)).toBe(false)

    let peak = 0
    for (let frame = 0; frame < 120; frame += 1) {
      stepFormalJumpState(state, 1 / 60)
      peak = Math.max(peak, state.height)
    }

    expect(peak).toBeGreaterThan(0.4)
    expect(peak).toBeLessThan(0.5)
    expect(state).toEqual({ height: 0, velocity: 0 })
  })

  it('keeps reduced-motion jumps shorter and resets safely', () => {
    const state = createFormalJumpState()
    expect(beginFormalJump(state, true)).toBe(true)

    let peak = 0
    for (let frame = 0; frame < 90; frame += 1) {
      stepFormalJumpState(state, 1 / 60)
      peak = Math.max(peak, state.height)
    }

    expect(peak).toBeGreaterThan(0.2)
    expect(peak).toBeLessThan(0.32)
    resetFormalJumpState(state)
    expect(state).toEqual({ height: 0, velocity: 0 })
  })
})
