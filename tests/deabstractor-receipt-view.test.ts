import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { canInspectReceipt, receiptViewFrame } from '../src/museum/deabstractor/receiptView'
import { durationFor } from '../src/museum/deabstractor/sequence'
import { PRINTER, receiptPoint } from '../src/museum/deabstractor/printerGeometry'

describe('De-Abstractor printed clearance inspection', () => {
  it('only exposes finished, stationary paperwork for either procedure', () => {
    for (const procedure of ['evacuation', 'inspection'] as const) {
      const duration = durationFor(procedure)
      for (const elapsed of [0, 3.85, duration - 0.001]) expect(canInspectReceipt(elapsed, procedure, false)).toBe(false)
      expect(canInspectReceipt(duration, procedure, true)).toBe(false)
      expect(canInspectReceipt(duration, procedure, false)).toBe(true)
    }
  })

  it.each([[1440, 1000], [320, 568], [390, 844], [844, 390]])('frames the entire original sheet at %i x %i without changing its geometry', (width, height) => {
    const aspect = width / height
    const frame = receiptViewFrame(aspect)
    const camera = new PerspectiveCamera(aspect < 1.1 ? 37 : 36, aspect, 0.1, 100)
    camera.position.set(...frame.position)
    camera.lookAt(new Vector3(...frame.look))
    camera.updateMatrixWorld()
    for (let row = 0; row <= 40; row++) for (const side of [-1, 1]) {
      const point = receiptPoint(row / 40, 1, 1)
      const world = new Vector3(side * PRINTER.paperWidth / 2, point.y, point.z)
        .applyAxisAngle(new Vector3(0, 1, 0), -0.18).add(new Vector3(2.35, 0, 0.3))
      const projected = world.project(camera)
      expect(Math.abs(projected.x)).toBeLessThan(0.86)
      expect(Math.abs(projected.y)).toBeLessThan(0.72)
      expect(projected.z).toBeGreaterThan(-1)
      expect(projected.z).toBeLessThan(1)
    }
    expect(camera.position.z).toBeGreaterThan(3.8)
  })
})
