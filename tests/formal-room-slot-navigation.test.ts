import { describe, expect, it } from 'vitest'
import {
  calculateSlotTrayScrollLeft,
  isOwnedNftDisplayable,
} from '../src/museum/formal-room/CollectionDesk'
import type { OwnedNft } from '../src/museum/formal-room/ownedNfts'

function nft(overrides: Partial<OwnedNft> = {}): OwnedNft {
  return {
    tokenKey: 'ethereum:0x0000000000000000000000000000000000000001:1',
    chain: 'ethereum',
    contract: '0x0000000000000000000000000000000000000001',
    identifier: '1',
    tokenStandard: 'erc721',
    title: 'Moving Picture',
    collection: 'Test Collection',
    thumbnailUrl: null,
    imageUrl: null,
    openseaUrl: 'https://opensea.io/assets/ethereum/0x0000000000000000000000000000000000000001/1',
    ...overrides,
  }
}

describe('Formal Room slot tray navigation', () => {
  it('keeps a slot still when it is already fully visible', () => {
    expect(calculateSlotTrayScrollLeft({
      currentScrollLeft: 0,
      trayLeft: 0,
      trayRight: 320,
      slotLeft: 155,
      slotRight: 295,
      edgePadding: 10,
    })).toBe(0)
  })

  it('reveals the right edge of the third 320px slot without moving the page', () => {
    expect(calculateSlotTrayScrollLeft({
      currentScrollLeft: 0,
      trayLeft: 0,
      trayRight: 320,
      slotLeft: 302,
      slotRight: 442,
      edgePadding: 10,
    })).toBe(132)
  })

  it('returns to a hidden earlier slot after removal or activation', () => {
    expect(calculateSlotTrayScrollLeft({
      currentScrollLeft: 132,
      trayLeft: 0,
      trayRight: 320,
      slotLeft: -124,
      slotRight: 16,
      edgePadding: 10,
    })).toBe(0)
  })

  it('keeps animation-only NFTs selectable while rejecting a truly media-less item', () => {
    const broken = new Set<string>()
    expect(isOwnedNftDisplayable(nft({ animationUrl: 'https://raw2.seadn.io/motion.mp4', animationKind: 'video' }), broken)).toBe(true)
    expect(isOwnedNftDisplayable(nft(), broken)).toBe(false)
  })

  it('keeps motion selectable when its static poster breaks', () => {
    const animated = nft({
      imageUrl: 'https://i2c.seadn.io/poster.png',
      animationUrl: 'https://raw2.seadn.io/motion.mp4',
      animationKind: 'video',
    })
    expect(isOwnedNftDisplayable(animated, new Set([animated.tokenKey]))).toBe(true)
  })
})
