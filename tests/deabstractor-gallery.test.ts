import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import path from 'node:path'
import { stat } from 'node:fs/promises'
import { GLOWBI_GALLERY_ARTWORKS } from '../src/museum/deabstractor/galleryArtwork'

describe('Glowbi museum artwork', () => {
  for (const art of GLOWBI_GALLERY_ARTWORKS) {
    it(`${art.id}: ships a bounded local image in its original proportions`, async () => {
      const file = path.resolve('public', art.src.slice(1))
      const metadata = await sharp(file).metadata()
      expect(metadata.format).toBe('webp')
      expect([metadata.width, metadata.height]).toEqual([art.width, art.height])
      expect((await stat(file)).size).toBeLessThan(300_000)
      expect(art.source).toMatch(/^https:\/\/x\.com\/GlowbiAbstract\/status\/\d+$/)
      // Include the moulding in the available wall bay, not just the image plane.
      expect(art.displayWidth + 0.68).toBeLessThan(5.05 - 0.64)
      const height = art.displayWidth * art.height / art.width
      expect(5.1 - height / 2 - 0.7).toBeGreaterThan(2.2)
    })
  }
})
