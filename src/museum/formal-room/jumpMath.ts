export type FormalJumpState = {
  height: number
  velocity: number
}

export const FORMAL_JUMP_GRAVITY = 9.6
export const FORMAL_JUMP_VELOCITY = 2.95
export const FORMAL_JUMP_REDUCED_MOTION_VELOCITY = 2.35

export function createFormalJumpState(): FormalJumpState {
  return { height: 0, velocity: 0 }
}

export function resetFormalJumpState(state: FormalJumpState) {
  state.height = 0
  state.velocity = 0
}

export function beginFormalJump(state: FormalJumpState, reducedMotion: boolean) {
  if (state.height > 0 || state.velocity !== 0) return false
  state.velocity = reducedMotion
    ? FORMAL_JUMP_REDUCED_MOTION_VELOCITY
    : FORMAL_JUMP_VELOCITY
  return true
}

export function stepFormalJumpState(state: FormalJumpState, delta: number) {
  if (state.height <= 0 && state.velocity === 0) return
  const safeDelta = Math.max(0, Math.min(delta, 0.05))
  state.velocity -= FORMAL_JUMP_GRAVITY * safeDelta
  state.height += state.velocity * safeDelta
  if (state.height <= 0) resetFormalJumpState(state)
}
