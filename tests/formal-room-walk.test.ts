import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  capFormalWalkDelta,
  getFormalWalkVector,
  resolveFormalWalkPosition,
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
    expect(capFormalWalkDelta(2)).toBe(0.05)
    expect(capFormalWalkDelta(-1)).toBe(0)
  })
})
