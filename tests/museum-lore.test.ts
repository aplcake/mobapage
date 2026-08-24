import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MUSEUM_LORE_BY_ID,
  MUSEUM_LORE_CHAPTERS,
  museumLoreTrailPosition,
} from '../src/museum/formal-room/museumLore'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

describe('Museum history trail', () => {
  it('turns the supplied archive into one concise chapter for every major museum area', () => {
    expect(MUSEUM_LORE_CHAPTERS).toHaveLength(6)
    expect(MUSEUM_LORE_CHAPTERS.map((chapter) => chapter.room)).toEqual([
      'Opening Salon',
      'MoBA #1',
      'Holiday Potluck',
      'MoBA #2',
      'Photography Room',
      'Glowbud Atrium',
    ])
    expect(new Set(MUSEUM_LORE_CHAPTERS.map((chapter) => chapter.id)).size).toBe(6)
    expect(museumLoreTrailPosition('pixler-origin')).toBe(0)
    expect(museumLoreTrailPosition('glowbud-world')).toBe(5)
  })

  it('preserves the important collection history without leaking citation markup into visitor copy', () => {
    expect(MUSEUM_LORE_BY_ID['moba-one'].stats[0].value).toBe('599')
    expect(MUSEUM_LORE_BY_ID['holiday-potluck'].stats[1].value).toBe('1,200+')
    expect(MUSEUM_LORE_BY_ID['moba-two'].stats[0].value).toBe('2,222')
    expect(MUSEUM_LORE_BY_ID['one-final-album'].stats[1].value).toBe('2,669')
    expect(MUSEUM_LORE_BY_ID['glowbud-world'].stats[1].value).toBe('3,333')

    const allCopy = JSON.stringify(MUSEUM_LORE_CHAPTERS)
    expect(allCopy).not.toContain('cite')
    expect(allCopy).not.toContain('filecite')
    expect(allCopy).not.toContain('[object Object]')
  })

  it('mounts obvious interactive plaques in the walk and opens an accessible reading panel', () => {
    const expansion = source('../src/museum/formal-room/MuseumExpansion.tsx')
    const room = source('../src/museum/formal-room/FormalMuseumRoom.tsx')
    const panel = source('../src/museum/formal-room/MuseumLorePanel.tsx')

    expect(expansion).toContain("interaction: 'open-museum-story'")
    expect(expansion).toContain('OPEN THE STORY  →')
    expect(expansion.match(/<MuseumLoreStation/g)?.length).toBeGreaterThanOrEqual(3)
    expect(expansion).toContain('onOpen?.(chapterId)')
    expect(room).toContain('setSelectedLoreId(chapterId)')
    expect(room).toContain('<MuseumLorePanel')
    expect(panel).toContain('aria-modal="true"')
    expect(panel).toContain("event.code !== 'Escape'")
    expect(panel).toContain('Museum history · adapted from the artist archive')
  })
})
