import { durationFor, type Procedure } from './sequence'

export function canInspectReceipt(elapsed: number, procedure: Procedure, running: boolean) {
  return !running && elapsed >= durationFor(procedure)
}

// Approach from in front of the tray, outside the stamp, housing, and receiver.
export function receiptViewFrame(aspect: number) {
  const distance = Math.max(1, 0.78 / Math.max(aspect, 0.25))
  const yaw = -0.18
  const localZ = 1.15
  const look: [number, number, number] = [2.35 + Math.sin(yaw) * localZ, 1.76, 0.3 + Math.cos(yaw) * localZ]
  const position: [number, number, number] = [
    look[0] + Math.sin(yaw) * 2.65 * distance,
    look[1] + 1.9 * distance,
    look[2] + Math.cos(yaw) * 2.65 * distance,
  ]
  return { look, position }
}
