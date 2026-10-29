import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { cabinetPoint, createDeliveryHose, HOSE_POINTS, HOSE_RADIUS, rubberPose } from '../src/museum/deabstractor/rubberMotion'
import { MECHANICAL_TIMING as M, mechanismPose, passengerPose } from '../src/museum/deabstractor/sequence'

describe('De-Abstractor rubber-hose performance', () => {
  it('anticipates, compresses at each sound contact, then stretches and settles without idle shaking', () => {
    for (const peak of M.pumps) {
      expect(rubberPose(peak - 0.25, 'evacuation').scaleY).toBeGreaterThan(1)
      expect(rubberPose(peak, 'evacuation').scaleY).toBeLessThan(0.88)
      expect(rubberPose(peak, 'evacuation').bellowsHeight).toBeLessThan(0.51)
      expect(rubberPose(peak + 0.19, 'evacuation').scaleY).toBeGreaterThan(1)
    }
    for (const t of [0, 2, 4, 10, 12, 18, 60]) expect(rubberPose(t, 'evacuation')).toEqual(rubberPose(0, 'evacuation'))
  })

  it('is continuous, bounded and disabled for inspection/reduced motion', () => {
    const rest = rubberPose(0, 'evacuation')
    for (let t = 0; t < 18; t += 0.01) {
      const pose = rubberPose(t, 'evacuation'), next = rubberPose(t + 0.001, 'evacuation')
      for (const key of Object.keys(pose) as (keyof typeof pose)[]) {
        expect(Number.isFinite(pose[key])).toBe(true)
        expect(Math.abs(pose[key] - next[key])).toBeLessThan(0.025)
      }
      expect(pose.scaleY).toBeGreaterThan(0.82)
      expect(pose.scaleY).toBeLessThan(1.1)
      expect(pose.bellowsHeight).toBeGreaterThan(0.35)
      expect(rubberPose(t, 'inspection')).toEqual(rest)
      expect(rubberPose(t, 'evacuation', true)).toEqual(rest)
    }
  })

  it('keeps the deformed hose sealed to the cabinet and the fixed receiving cradle for the whole sequence', () => {
    const rig = createDeliveryHose(), point = new THREE.Vector3(), tangent = new THREE.Vector3(), expected = new THREE.Vector3()
    for (let t = 0; t <= 18; t += 0.025) {
      rig.update(t, 'evacuation')
      rig.frame(0, point, tangent)
      cabinetPoint(HOSE_POINTS[0], rubberPose(t, 'evacuation'), expected)
      expect(point.distanceTo(expected)).toBeLessThan(1e-7)
      const radius = rig.frame(1, point, tangent)
      const end = HOSE_POINTS.at(-1)!
      expected.set(end[0], end[1], end[2])
      expected.y -= mechanismPose(t, 'evacuation').dockDrop
      expect(point.distanceTo(expected)).toBeLessThan(1e-7)
      expect(radius).toBeCloseTo(HOSE_RADIUS)
      expect(tangent.y).toBeLessThan(-0.99)
    }
    rig.dispose()
  })

  it('carries a visible pressure bulge with the passenger, then returns exactly to the resting geometry', () => {
    const rig = createDeliveryHose(), point = new THREE.Vector3(), tangent = new THREE.Vector3()
    const rest = rig.body.getAttribute('position').array.slice()
    const radius = rig.frame(passengerPose(8.05, 'evacuation', false).progress, point, tangent)
    rig.update(8.05, 'evacuation')
    expect(rig.frame(passengerPose(8.05, 'evacuation', false).progress, point, tangent)).toBeGreaterThan(radius * 2)
    rig.update(18, 'evacuation')
    expect(rig.body.getAttribute('position').array).toEqual(rest)
    rig.update(6.55, 'evacuation', true)
    expect(rig.body.getAttribute('position').array).toEqual(rest)
    rig.dispose()
  })

  it('keeps surface normals outward, the ink outside the surface, and ring seams closed', () => {
    const rig = createDeliveryHose(), point = new THREE.Vector3(), tangent = new THREE.Vector3()
    for (const t of [0, 5.55, 6.05, 6.55, 7.2, 8.05, 8.55, 9.8, 10.86]) {
      rig.update(t, 'evacuation')
      const p = rig.body.getAttribute('position'), n = rig.body.getAttribute('normal'), outline = rig.outline.getAttribute('position')
      for (let ring = 0; ring <= 120; ring++) {
        rig.frame(ring / 120, point, tangent)
        const first = ring * 13, last = first + 12
        expect(Math.hypot(p.getX(first) - p.getX(last), p.getY(first) - p.getY(last), p.getZ(first) - p.getZ(last))).toBeLessThan(1e-6)
        for (let side = 0; side <= 12; side++) {
          const i = first + side
          const x = p.getX(i) - point.x, y = p.getY(i) - point.y, z = p.getZ(i) - point.z
          expect(n.getX(i) * x + n.getY(i) * y + n.getZ(i) * z).toBeGreaterThan(0.06)
          expect(Math.hypot(outline.getX(i) - point.x, outline.getY(i) - point.y, outline.getZ(i) - point.z)).toBeGreaterThan(Math.hypot(x, y, z) + 0.02)
          expect(p.getY(i)).toBeLessThan(6.8)
        }
      }
    }
    rig.dispose()
  })

  it('does not rebuild GPU geometry while paused or resting', () => {
    const rig = createDeliveryHose()
    rig.update(6.55, 'evacuation')
    const position = rig.body.getAttribute('position') as THREE.BufferAttribute
    const version = position.version
    for (let frame = 0; frame < 60; frame++) rig.update(6.55, 'evacuation')
    expect(position.version).toBe(version)
    rig.dispose()
  })
})
