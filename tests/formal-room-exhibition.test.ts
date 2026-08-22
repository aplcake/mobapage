import { describe, expect, it } from 'vitest'
import { FORMAL_ROOM_ARTWORKS } from '../src/museum/formal-room/artworks'
import {
  createFormalRoomWalletExhibition,
  formalRoomArtworkMediaUrl,
} from '../src/museum/formal-room/FormalMuseumRoom'
import type { OwnedNft } from '../src/museum/formal-room/ownedNfts'

function ownedNft(index: number): OwnedNft {
  const contract = `0x${String(index).padStart(40, '0')}`
  return {
    tokenKey: `ethereum:${contract}:${index}`,
    chain: 'ethereum',
    contract,
    identifier: String(index),
    tokenStandard: 'erc721',
    title: `Owned Work ${index}`,
    collection: `Collection ${index}`,
    thumbnailUrl: `https://i2c.seadn.io/ethereum/work-${index}-thumb.png`,
    imageUrl: `https://i2c.seadn.io/ethereum/work-${index}.png`,
    animationUrl: `https://raw2.seadn.io/ethereum/work-${index}.mp4`,
    animationKind: 'video',
    openseaUrl: `https://opensea.io/assets/ethereum/${contract}/${index}`,
  }
}

describe('Formal Room wallet exhibition mapping', () => {
  it('uses the linked MoBA works as the animated default exhibition', () => {
    expect(FORMAL_ROOM_ARTWORKS.map((artwork) => artwork.title)).toEqual([
      'Yes / Yes',
      'Enjoyables!!!',
      'MoBA #2: Curated Hearts',
    ])

    FORMAL_ROOM_ARTWORKS.forEach((artwork) => {
      expect(artwork.source).toBe('sample')
      expect(artwork.sourceUrl).toMatch(/^https:\/\//)
      expect(artwork.imageUrl).toMatch(/^\/museum\/formal-room\/placeholders\//)
      expect(artwork.animationUrl).toBe(artwork.imageUrl)
      expect(artwork.animationKind).toBe('image')
    })
  })

  it('loads bundled defaults directly while keeping wallet media behind the proxy', () => {
    const bundled = '/museum/formal-room/placeholders/enjoyables-official.gif'
    expect(formalRoomArtworkMediaUrl(bundled, 'motion')).toBe(bundled)
    expect(formalRoomArtworkMediaUrl('https://i2c.seadn.io/work.gif', 'motion'))
      .toContain('/api/opensea/media?')
  })

  it('keeps the authored three-frame geometry while replacing the displayed artwork', () => {
    const selection = [ownedNft(1), ownedNft(2), ownedNft(3)] as const
    const exhibition = createFormalRoomWalletExhibition(selection)

    expect(exhibition).toHaveLength(3)
    exhibition.forEach((artwork, index) => {
      expect(artwork.position).toEqual(FORMAL_ROOM_ARTWORKS[index]?.position)
      expect(artwork.frameSize).toEqual(FORMAL_ROOM_ARTWORKS[index]?.frameSize)
      expect(artwork.id).toBe(selection[index]?.tokenKey)
      expect(artwork.title).toBe(selection[index]?.title)
      expect(artwork.artist).toBe(selection[index]?.collection)
      expect(artwork.thumbnailUrl).toBe(selection[index]?.thumbnailUrl)
      expect(artwork.animationUrl).toBe(selection[index]?.animationUrl)
      expect(artwork.animationKind).toBe('video')
      expect(artwork.source).toBe('wallet')
    })
  })
})
