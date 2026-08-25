import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import {
  GLOWBUD_IMAGE_CID,
  GLOWBUD_LOD_TOKEN_IDS,
  GLOWBUD_SOURCE_SHA256,
  glowbudLodAssetUrl,
  glowbudSourceUrls,
} from '../scripts/generate-glowbud-lod-assets.mjs'

const EXPECTED_TOKEN_IDS = ['1731', '2259', '2701', '1594', '530', '2013', '1201', '2542', '1855', '1621']
const EXPECTED_SOURCE_HASHES = [
  '6599c6b33f6a6857eb37f9a2f3000dc7abf3be590f2253e15eeafbe0a5157ae7',
  '5a35b4623dc14ec992eed7c45d5dcd5d60af2adb14cd0ec13920a109c3724741',
  '970e89db4d365cde5ebbfaa73842c5dc66dd934078da31a92466e2f734464729',
  '32219bf7376c6d3e94b4e38b05eee47ee180222538ef471c1499a316e563dcfe',
  'fe3fc13399c9c0d7e66ee2d7316dba69c8cd86b58c5a2797c37db38c4bfe71c1',
  '0ca0bb20ef4c6d09534a23fcd114584aaca338e0b04dce719914c9b7398f920f',
  'df5fbf88994549b658d33dd15e5c646147e0687f9a623aa0aeb8786e86ad7139',
  '155b245dead37fd0763ea3b79ffc1b876843c96fd6a16477cf5903f7458a59a3',
  '452cb52dec850adacf17fbda719dab678a39f0e0abfd77549caa42c9b58bfc76',
  '5e248329f0caa842e2cf2e4b51c26cc2017f4128e6b2f365d61e8b92bb03d000',
]
const lodDirectory = join(process.cwd(), 'public/museum/formal-room/glowbuds/lod')

function pixelAt(data: Buffer, width: number, channels: number, x: number, y: number) {
  const offset = (y * width + x) * channels
  return [...data.subarray(offset, offset + channels)]
}

describe('Default Glowbud far-LOD artwork', () => {
  it('keeps the curated token order and exact IPFS source mapping deterministic', () => {
    expect(GLOWBUD_LOD_TOKEN_IDS).toEqual(EXPECTED_TOKEN_IDS)
    expect(EXPECTED_TOKEN_IDS.map((tokenId) => GLOWBUD_SOURCE_SHA256[tokenId])).toEqual(EXPECTED_SOURCE_HASHES)
    expect(new Set(Object.values(GLOWBUD_SOURCE_SHA256)).size).toBe(EXPECTED_TOKEN_IDS.length)

    for (const tokenId of EXPECTED_TOKEN_IDS) {
      expect(glowbudLodAssetUrl(tokenId)).toBe(`/museum/formal-room/glowbuds/lod/${tokenId}.webp`)
      expect(glowbudSourceUrls(tokenId)).toEqual([
        `https://gateway.pinata.cloud/ipfs/${GLOWBUD_IMAGE_CID}/${tokenId}`,
        `https://ipfs.io/ipfs/${GLOWBUD_IMAGE_CID}/${tokenId}`,
      ])
    }
  })

  it('ships exactly ten compact, distinct 256px WebP originals without checker backdrops', async () => {
    const files = readdirSync(lodDirectory).filter((file) => file.endsWith('.webp')).sort()
    expect(files).toEqual(EXPECTED_TOKEN_IDS.map((tokenId) => `${tokenId}.webp`).sort())

    const outputHashes = []
    let totalBytes = 0
    for (const tokenId of EXPECTED_TOKEN_IDS) {
      const assetPath = join(lodDirectory, `${tokenId}.webp`)
      const bytes = readFileSync(assetPath)
      const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const metadata = await sharp(bytes).metadata()
      const corners = [
        pixelAt(data, info.width, info.channels, 0, 0),
        pixelAt(data, info.width, info.channels, info.width - 1, 0),
        pixelAt(data, info.width, info.channels, 0, info.height - 1),
        pixelAt(data, info.width, info.channels, info.width - 1, info.height - 1),
      ]

      expect(basename(assetPath)).toBe(`${tokenId}.webp`)
      expect(metadata.format).toBe('webp')
      expect(metadata.width).toBe(256)
      expect(metadata.height).toBe(256)
      expect(metadata.pages ?? 1).toBe(1)
      expect(new Set(corners.map((color) => color.join(','))).size, tokenId).toBe(1)
      outputHashes.push(createHash('sha256').update(bytes).digest('hex'))
      totalBytes += statSync(assetPath).size
    }

    expect(new Set(outputHashes).size).toBe(EXPECTED_TOKEN_IDS.length)
    expect(totalBytes).toBeLessThan(100_000)
  })
})
