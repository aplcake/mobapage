import { describe, expect, it } from 'vitest'
import {
  createMuseumArtworkProvenance,
  museumArtworkIdentityFromAsset,
  museumArtworkIdentityFromSourceUrl,
  museumArtworkOwnerRequestUrl,
  museumOwnerDisplayName,
  shortenMuseumAddress,
} from '../src/museum/formal-room/artworkProvenance'

const BASE_CONTRACT = '0x76a7ba0de6b80e9abcc1855713022b1e753ac1d1'

describe('museum artwork provenance', () => {
  it('reads exact OpenSea asset and item links without treating collection pages as tokens', () => {
    expect(museumArtworkIdentityFromSourceUrl(
      `https://opensea.io/assets/base/${BASE_CONTRACT}/00599`,
    )).toEqual({
      chainId: 8453,
      chainSlug: 'base',
      contract: BASE_CONTRACT,
      tokenId: '599',
    })
    expect(museumArtworkIdentityFromSourceUrl(
      `https://opensea.io/item/base/${BASE_CONTRACT}/598`,
    )?.tokenId).toBe('598')
    expect(museumArtworkIdentityFromSourceUrl(
      'https://opensea.io/collection/moba--1/overview',
    )).toBeNull()
  })

  it('reads the museum Zora token link and explicit Base asset identities', () => {
    expect(museumArtworkIdentityFromSourceUrl(
      'https://zora.co/collect/base:0x1426365a3a14a158c4fa2d4f02a56c5df36e3081/2?personalize=false',
    )).toMatchObject({ chainId: 8453, chainSlug: 'base', tokenId: '2' })
    expect(museumArtworkIdentityFromAsset({
      chainId: 8453,
      contract: BASE_CONTRACT.toUpperCase(),
      tokenId: '0007',
    })).toEqual({
      chainId: 8453,
      chainSlug: 'base',
      contract: BASE_CONTRACT,
      tokenId: '7',
    })
  })

  it('builds safe owner requests and prefers ENS, then username, then a short address', () => {
    const artwork = createMuseumArtworkProvenance({
      id: 'portrait-599',
      title: 'Portrait of an Enjoyer',
      collection: 'MoBA #1',
      sourceUrl: `https://opensea.io/item/base/${BASE_CONTRACT}/599`,
    })
    expect(artwork.identity).not.toBeNull()
    const requestUrl = new URL(museumArtworkOwnerRequestUrl(artwork.identity!), 'http://localhost')
    expect(requestUrl.searchParams.get('chain')).toBe('base')
    expect(requestUrl.searchParams.get('contract')).toBe(BASE_CONTRACT)
    expect(requestUrl.searchParams.get('tokenId')).toBe('599')

    const address = `0x${'ab'.repeat(20)}` as const
    expect(museumOwnerDisplayName({ address, username: 'joe.pxlr', ensName: 'museum.eth' })).toBe('museum.eth')
    expect(museumOwnerDisplayName({ address, username: 'joe.pxlr', ensName: null })).toBe('joe.pxlr')
    expect(museumOwnerDisplayName({ address, username: null, ensName: null })).toBe(shortenMuseumAddress(address))
  })
})
