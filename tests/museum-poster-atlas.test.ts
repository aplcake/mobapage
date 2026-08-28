import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import galleryManifest from '../public/museum/formal-room/galleries/manifest.json'
import { museumPosterAtlasUvBounds } from '../src/museum/formal-room/museumPlan'

type AtlasWork = {
  id: string
  poster: string
  posterAtlasIndex: number
}

const atlas = galleryManifest.posterAtlas
const works = Object.values(galleryManifest.collections)
  .flatMap((collection) => collection.works as AtlasWork[])

function publicPath(urlPath: string) {
  return join(process.cwd(), 'public', urlPath.replace(/^\//, ''))
}

describe('Formal museum far-poster atlas', () => {
  it('keeps one stable atlas cell for every permanent museum work', () => {
    expect(works).toHaveLength(51)
    expect(atlas.workCount).toBe(works.length)
    expect(atlas.indexOrder).toBe('collection-id/work-id-ascii-v1')
    expect(new Set(works.map((work) => work.id)).size).toBe(works.length)
    expect(new Set(works.map((work) => work.poster)).size).toBe(works.length)
    expect(works.map((work) => work.posterAtlasIndex).sort((a, b) => a - b)).toEqual(
      Array.from({ length: works.length }, (_, index) => index),
    )
  })

  it('ships a compact, integrity-checked WebP atlas with room for every work', async () => {
    const atlasPath = publicPath(atlas.src)
    const atlasBytes = readFileSync(atlasPath)
    const metadata = await sharp(atlasBytes).metadata()

    expect(atlas.version).toBe(1)
    expect(atlas.cellSize).toBe(128)
    expect(atlas.columns).toBe(8)
    expect(atlas.rows).toBe(7)
    expect(atlas.width).toBe(atlas.columns * atlas.cellSize)
    expect(atlas.height).toBe(atlas.rows * atlas.cellSize)
    expect(atlas.columns * atlas.rows).toBeGreaterThanOrEqual(works.length)
    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(atlas.width)
    expect(metadata.height).toBe(atlas.height)
    expect(createHash('sha256').update(atlasBytes).digest('hex')).toBe(atlas.sha256)
  })

  it('insets every tile by half a texel so linear sampling cannot bleed from neighbours', () => {
    for (const work of works) {
      const { u0, u1, v0, v1 } = museumPosterAtlasUvBounds(work.posterAtlasIndex)
      expect(u1).toBeGreaterThan(u0)
      expect(v1).toBeGreaterThan(v0)
      expect(u1 - u0).toBeLessThan(1 / atlas.columns)
      expect(v1 - v0).toBeLessThan(1 / atlas.rows)
    }
    expect(() => museumPosterAtlasUvBounds(-1)).toThrow(RangeError)
    expect(() => museumPosterAtlasUvBounds(atlas.workCount)).toThrow(RangeError)
  })
})
