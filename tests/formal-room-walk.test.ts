import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  capFormalWalkDelta,
  getFormalWalkVector,
  resolveFormalJoystickInput,
  resolveFormalWalkPosition,
  stepFormalWalkVelocity,
} from '../src/museum/formal-room/walkMath'

describe('Formal Room walking math', () => {
  it('walks toward the artwork wall at yaw zero', () => {
    const direction = getFormalWalkVector(1, 0, 0)

    expect(direction.x).toBeCloseTo(0)
    expect(direction.z).toBeCloseTo(-1)
    expect(direction.magnitude).toBe(1)
  })

  it.each([
    ['forward', 1, 0, 1],
    ['backward', -1, 0, -1],
    ['right', 0, 1, 1],
    ['left', 0, -1, -1],
  ])('keeps %s aligned with the camera at every cardinal turn', (_label, forward, strafe, sign) => {
    for (const yaw of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
      const cameraBasis = new THREE.Vector3(strafe === 0 ? 0 : 1, 0, forward === 0 ? 0 : -1)
        .applyEuler(new THREE.Euler(0, yaw, 0, 'YXZ'))
        .multiplyScalar(sign)
      const direction = getFormalWalkVector(forward, strafe, yaw)

      expect(direction.x).toBeCloseTo(cameraBasis.x)
      expect(direction.z).toBeCloseTo(cameraBasis.z)
    }
  })

  it('normalizes diagonal movement so it is not faster', () => {
    const direction = getFormalWalkVector(1, 1, 0)

    expect(Math.hypot(direction.x, direction.z)).toBeCloseTo(1)
  })

  it('keeps the visitor inside the connected museum zones', () => {
    const resolved = resolveFormalWalkPosition(
      { x: 4.5, z: 7 },
      { x: 99, z: 99 },
    )

    expect(resolved).toEqual({ x: 4.5, z: 7 })
  })

  it('blocks the bench but still allows movement to slide around it', () => {
    const blocked = resolveFormalWalkPosition(
      { x: 0, z: 4.3 },
      { x: 0, z: 3.4 },
    )
    const sliding = resolveFormalWalkPosition(
      { x: -2.4, z: 3.35 },
      { x: -1.8, z: 2 },
    )

    expect(blocked).toEqual({ x: 0, z: 4.3 })
    expect(sliding.x).toBe(-2.4)
    expect(sliding.z).toBe(2)
  })

  it('caps resumed-tab frame deltas before movement is applied', () => {
    expect(capFormalWalkDelta(0.016)).toBe(0.016)
    expect(capFormalWalkDelta(2)).toBe(0.12)
    expect(capFormalWalkDelta(-1)).toBe(0)
  })

  it('keeps one second of walking consistent across ordinary frame rates', () => {
    const targetSpeed = 2.55
    const distances = [10, 15, 30, 60, 120].map((framesPerSecond) => {
      let velocity = 0
      let position = 0
      const rawDelta = 1 / framesPerSecond

      for (let frame = 0; frame < framesPerSecond; frame += 1) {
        const delta = capFormalWalkDelta(rawDelta)
        velocity = stepFormalWalkVelocity(velocity, targetSpeed, delta, true)
        position += velocity * delta
      }

      return position
    })
    const fastest = Math.max(...distances)
    const slowest = Math.min(...distances)

    expect((fastest - slowest) / fastest).toBeLessThan(0.03)
  })

  it('chooses the collision-axis order that preserves the intended diagonal step', () => {
    const current = { x: 0, z: 5 }
    const proposed = { x: 0.1, z: 4.9 }
    const xFirstBlocker = [{ minX: 0.04, maxX: 0.08, minZ: 4.94, maxZ: 5.04 }]
    const zFirstBlocker = [{ minX: -0.04, maxX: 0.06, minZ: 4.92, maxZ: 4.96 }]

    expect(resolveFormalWalkPosition(current, proposed, 0, xFirstBlocker)).toEqual(proposed)
    expect(resolveFormalWalkPosition(current, proposed, 0, zFirstBlocker)).toEqual(proposed)
  })

  it('maps an upward joystick push to forward analog movement', () => {
    const input = resolveFormalJoystickInput(0, -40, 40)

    expect(input.analogX).toBeCloseTo(0)
    expect(input.analogY).toBeCloseTo(1)
    expect(input.knobY).toBeCloseTo(-40)
  })

  it('uses a small deadzone without creating a jump in movement speed', () => {
    const centered = resolveFormalJoystickInput(2, -2, 40)
    const justOutside = resolveFormalJoystickInput(0, -8, 40)

    expect(centered.magnitude).toBe(0)
    expect(justOutside.magnitude).toBeGreaterThan(0)
    expect(justOutside.magnitude).toBeLessThan(0.2)
  })

  it('clamps diagonal and outside-ring input to one analog magnitude', () => {
    const diagonal = resolveFormalJoystickInput(100, -100, 40)

    expect(Math.hypot(diagonal.analogX, diagonal.analogY)).toBeCloseTo(1)
    expect(Math.hypot(diagonal.knobX, diagonal.knobY)).toBeCloseTo(40)
  })

  it('fails safely for invalid joystick measurements', () => {
    expect(resolveFormalJoystickInput(Number.NaN, 10, 40)).toEqual({
      analogX: 0,
      analogY: 0,
      knobX: 0,
      knobY: 0,
      magnitude: 0,
    })
    expect(resolveFormalJoystickInput(10, 10, 0).magnitude).toBe(0)
  })
})
