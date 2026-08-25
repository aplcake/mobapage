import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { glowbudImageUrl } from '../src/museum/glowbuds/glowbudDisplayTraits'

describe('Glowbud pixel-to-3D study', () => {
  it('uses the canonical Glowbud pixel artwork source', () => {
    const imageUrl = glowbudImageUrl('73')
    expect(imageUrl).toMatch(/^https:\/\/ipfs\.io\/ipfs\/.+\/73$/)
  })

  it('pairs the original artwork with the living museum avatar and shared owner credit', () => {
    const source = readFileSync(
      new URL('../src/museum/formal-room/GlowbudComparisonPanel.tsx', import.meta.url),
      'utf8',
    )
    expect(source).toContain('Original pixel')
    expect(source).toContain('Museum 3D')
    expect(source).toContain('Retrieving original')
    expect(source).toContain('onLoad={() => setLoadedImageKey(resident.key)}')
    expect(source).toContain('<GlowbudMuseumAvatar')
    expect(source).toContain('useMuseumOwnerDisplay')
    expect(source).toContain('aria-modal="true"')
    expect(source).toContain("event.code !== 'Escape'")
    expect(source).not.toContain('made<br />dimensional')
  })

  it('uses a quiet solid museum mount rather than a checkerboard behind the pixel work', () => {
    const styles = readFileSync(
      new URL('../src/museum/formal-room/GlowbudComparisonPanel.module.css', import.meta.url),
      'utf8',
    )
    const pixelMount = styles.slice(styles.indexOf('.pixelMount {'), styles.indexOf('.pixelMount::after'))
    expect(pixelMount).toContain('radial-gradient')
    expect(pixelMount).not.toContain('background-size: 18px')
    expect(pixelMount).not.toContain('45deg')
  })

  it('makes each atrium resident open the study without triggering the room behind it', () => {
    const expansion = readFileSync(
      new URL('../src/museum/formal-room/MuseumExpansion.tsx', import.meta.url),
      'utf8',
    )
    const room = readFileSync(
      new URL('../src/museum/formal-room/FormalMuseumRoom.tsx', import.meta.url),
      'utf8',
    )
    expect(expansion).toContain("interaction: 'open-pixel-to-3d-study'")
    expect(expansion).toContain("renderer: 'canonical-pixel-far-lod'")
    expect(expansion).toContain("ownedNftMediaProxyUrl(resident.imageUrl, 'lod')")
    expect(expansion).toContain('<GlowbudPixelLodCard')
    expect(expansion).toContain('onSelect?.(resident)')
    expect(expansion).toContain('event.stopPropagation()')
    expect(room).toContain('setSelectedGlowbud(resident)')
    expect(room).toContain('<GlowbudComparisonPanel')
  })
})
