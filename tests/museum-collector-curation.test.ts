import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import curation from '../public/museum/formal-room/galleries/collector-curation.json'
import manifest from '../public/museum/formal-room/galleries/manifest.json'
import { MUSEUM_GALLERY_INTERIORS } from '../src/museum/formal-room/museumGalleryDesign'

const ROOT = join(import.meta.dirname, '..', 'public')
const CURATED_ROOMS = ['moba-one', 'moba-two'] as const

describe('top-holder museum curation', () => {
  it('uses a dated ownership snapshot and gives every holder above five at least one frame', () => {
    expect(curation.schemaVersion).toBe(2)
    expect(curation.snapshot.chainId).toBe(8453)
    expect(curation.snapshot.blockNumber).toBeGreaterThan(50_000_000)
    expect(curation.snapshot.method).toContain('balanceOf')
    expect(curation.holders.map((holder) => holder.rank)).toEqual(Array.from({ length: 23 }, (_, index) => index + 1))
    expect(curation.holders.every((holder) => holder.mobaOneBalance > 5)).toBe(true)

    const mobaOneRanks = curation.selections['moba-one'].map((selection) => selection.holderRank)
    expect(mobaOneRanks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 14, 16, 18, 22])
    const mobaTwoRanks = curation.selections['moba-two'].map((selection) => selection.holderRank)
    expect(mobaTwoRanks).toEqual([2, 9, 10, 11, 12, 13, 15, 17, 19, 20, 21, 23])
    expect(mobaTwoRanks.every((rank) => curation.holders.find((holder) => holder.rank === rank)!.mobaTwoBalance > 0)).toBe(true)

    const allRanks = [...mobaOneRanks, ...mobaTwoRanks]
    expect(new Set(allRanks)).toEqual(new Set(curation.holders.map((holder) => holder.rank)))
    expect(allRanks.filter((rank) => rank === 2)).toHaveLength(2)
    expect(curation.holders.filter((holder) => allRanks.filter((rank) => rank === holder.rank).length > 1)).toHaveLength(1)
  })

  it('hangs exactly the selected collector-owned works in token-versioned media', () => {
    for (const roomId of CURATED_ROOMS) {
      const selections = curation.selections[roomId]
      const works = manifest.collections[roomId].works
      const selectionIds = selections.map((selection) => selection.tokenId)
      expect(works.map((work) => work.tokenId)).toEqual(selectionIds)
      expect(new Set(selectionIds).size).toBe(12)
      expect(works.filter((work) => work.featured)).toHaveLength(1)

      for (const work of works) {
        const selection = selections.find((candidate) => candidate.tokenId === work.tokenId)!
        const holder = curation.holders.find((candidate) => candidate.rank === selection.holderRank)!
        expect(work.collector).toEqual({
          holderRank: selection.holderRank,
          address: selection.holderAddress,
          label: holder.label,
        })
        expect(work.poster).toContain(`${curation.assetVersion}-token-${work.tokenId}-poster.webp`)
        expect(work.motion).toContain(`${curation.assetVersion}-token-${work.tokenId}-motion.`)
        expect(work.frameCount).toBeGreaterThan(1)
        expect(existsSync(join(ROOT, work.poster))).toBe(true)
        expect(existsSync(join(ROOT, work.motion!))).toBe(true)
        if (roomId === 'moba-two') {
          expect(work.motionSheet).toContain(`${curation.assetVersion}-token-${work.tokenId}-sheet.webp`)
          expect(work.motionSheetColumns).toBe(7)
          expect(work.motionSheetRows).toBe(4)
          expect(existsSync(join(ROOT, work.motionSheet!))).toBe(true)
        }
      }
    }
  })

  it('assigns every curated work to one authored wall slot', () => {
    for (const roomId of CURATED_ROOMS) {
      const works = manifest.collections[roomId].works
      const slotIds = MUSEUM_GALLERY_INTERIORS[roomId].artworkSlots.map((slot) => slot.artworkId)
      expect(new Set(slotIds)).toEqual(new Set(works.map((work) => work.id)))
      expect(slotIds).toHaveLength(12)
      const featured = works.find((work) => work.featured)!
      expect(MUSEUM_GALLERY_INTERIORS[roomId].artworkSlots.find((slot) => slot.featured)?.artworkId).toBe(featured.id)
    }
  })
})
