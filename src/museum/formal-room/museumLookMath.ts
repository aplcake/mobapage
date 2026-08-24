export const FORMAL_LOOK_PITCH_MIN = -0.58
export const FORMAL_LOOK_PITCH_MAX = 0.58
export const FORMAL_MOUSE_LOOK_SENSITIVITY = Object.freeze({ yaw: 0.003, pitch: 0.0023 })
export const FORMAL_TOUCH_LOOK_SENSITIVITY = Object.freeze({ yaw: 0.0032, pitch: 0.0026 })
// Mouse position acts like a steering stick. A small calm zone around the
// centre prevents accidental drift while the rest of the canvas remains live.
export const FORMAL_MOUSE_CURSOR_DEADZONE = 0.08
export const FORMAL_MOUSE_CURSOR_YAW_SPEED = 2.35

// Browsers coalesce pointer events when a frame is busy. A tiny per-event cap
// made the exact same hand movement turn the camera far less on a slow frame
// than on a fast one, which felt like the mouse was falling behind. Keep a
// generous safety rail for bogus device spikes without throwing away real
// motion from a full viewport sweep.
const MAX_POINTER_DELTA = 2048

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

function safePointerDelta(value: number) {
  return Number.isFinite(value) ? clamp(value, -MAX_POINTER_DELTA, MAX_POINTER_DELTA) : 0
}

function wrapAngle(value: number) {
  return Math.atan2(Math.sin(value), Math.cos(value))
}

export function resolveFormalCursorSteer(
  pointerPosition: number,
  viewportSize: number,
  deadzone = FORMAL_MOUSE_CURSOR_DEADZONE,
) {
  if (!Number.isFinite(pointerPosition) || !Number.isFinite(viewportSize) || viewportSize <= 0) return 0
  const normalized = clamp((pointerPosition / viewportSize) * 2 - 1, -1, 1)
  const safeDeadzone = clamp(deadzone, 0, 0.85)
  const distance = Math.abs(normalized)
  if (distance <= safeDeadzone) return 0
  const response = (distance - safeDeadzone) / (1 - safeDeadzone)
  const easedResponse = response * response * (3 - 2 * response)
  return Math.sign(normalized) * easedResponse
}

export function stepFormalLookOrientation({
  yaw,
  pitch,
  deltaX,
  deltaY,
  sensitivity,
}: {
  yaw: number
  pitch: number
  deltaX: number
  deltaY: number
  sensitivity: Readonly<{ yaw: number; pitch: number }>
}) {
  return {
    yaw: wrapAngle(yaw - safePointerDelta(deltaX) * sensitivity.yaw),
    pitch: clamp(
      pitch - safePointerDelta(deltaY) * sensitivity.pitch,
      FORMAL_LOOK_PITCH_MIN,
      FORMAL_LOOK_PITCH_MAX,
    ),
  }
}
