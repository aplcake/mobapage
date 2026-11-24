import { describe, expect, it } from 'vitest'
import { createMobaSignGeometry, MOBA_SIGN_DEPTH, MOBA_SIGN_POSITION } from '../src/museum/deabstractor/MuseumSign'
import font from '../src/museum/deabstractor/mobaSignFont.json'

describe('MoBA dimensional museum sign', () => {
  it('ships only the required wordmark glyphs rather than a full font', () => {
    expect(Object.keys(font.glyphs).sort()).toEqual(['?', 'A', 'B', 'M', 'o'])
    expect(JSON.stringify(font).length).toBeLessThan(12_000)
  })
  it('has finite dimensional geometry and clears the marquee and beacon mounts', () => {
    const geometries = createMobaSignGeometry()
    try {
      for (const geometry of Object.values(geometries)) {
        expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true)
        expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite)).toBe(true)
        geometry.computeBoundingBox()
        const box = geometry.boundingBox!
        expect(box.max.z - box.min.z).toBeGreaterThan(0.06)
      }
      const back = geometries.back.boundingBox!, word = geometries.word.boundingBox!
      expect(back.max.y + MOBA_SIGN_POSITION[1]).toBeLessThan(8.75)
      expect(back.max.x).toBeLessThan(3.4)
      expect(word.max.x - word.min.x).toBeCloseTo(3, 4)
      expect(word.max.y + 0.1).toBeLessThan(0.5)
      expect(word.min.y + 0.1).toBeGreaterThan(-0.3)
      const panel = geometries.panel.boundingBox!
      const panelFront = panel.max.z + MOBA_SIGN_DEPTH.panel
      expect(panelFront).toBeGreaterThan(back.max.z + MOBA_SIGN_DEPTH.back + 0.025)
      expect(MOBA_SIGN_DEPTH.caption).toBeGreaterThan(panelFront)
      expect(word.min.z + MOBA_SIGN_DEPTH.word).toBeLessThan(panelFront)
      expect(word.max.z + MOBA_SIGN_DEPTH.word).toBeGreaterThan(panelFront)
    } finally {
      Object.values(geometries).forEach(geometry => geometry.dispose())
    }
  })
})
