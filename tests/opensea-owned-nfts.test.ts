import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../app/api/opensea/owned-nfts/route'
import {
  isEthereumAddress,
  normalizeOpenSeaOwnedNft,
  normalizeOpenSeaOwnedNftsResponse,
  OWNED_NFT_MEDIA_CACHE_VERSION,
  ownedNftMediaProxyUrl,
} from '../src/museum/formal-room/ownedNfts'

const VALID_ADDRESS = `0x${'aB'.repeat(20)}`
const NORMALIZED_ADDRESS = VALID_ADDRESS.toLowerCase()
const ORIGINAL_API_KEY = process.env.OPENSEA_API_KEY

afterEach(() => {
  if (ORIGINAL_API_KEY === undefined) delete process.env.OPENSEA_API_KEY
  else process.env.OPENSEA_API_KEY = ORIGINAL_API_KEY
  vi.unstubAllGlobals()
})

describe('OpenSea owned NFT normalization', () => {
  it('validates Ethereum addresses without accepting lookalikes', () => {
    expect(isEthereumAddress(VALID_ADDRESS)).toBe(true)
    expect(isEthereumAddress('0x1234')).toBe(false)
    expect(isEthereumAddress(`0x${'g'.repeat(40)}`)).toBe(false)
    expect(isEthereumAddress(`${VALID_ADDRESS}00`)).toBe(false)
  })

  it('normalizes stable identity, text, links, and a safe still-image fallback', () => {
    const nft = normalizeOpenSeaOwnedNft({
      contract: VALID_ADDRESS,
      identifier: '42',
      token_standard: 'erc721',
      name: '  Garden Orbit  ',
      collection: 'formal-works',
      description: 'A cheerful orbit.',
      display_image_url: 'javascript:alert(1)',
      image_url: 'ipfs://bafyExample/artwork.png',
      original_image_url: 'https://images.example.test/fallback.png',
      opensea_url: 'javascript:alert(2)',
      is_disabled: false,
      is_nsfw: false,
    })

    expect(nft).toEqual({
      tokenKey: `ethereum:${NORMALIZED_ADDRESS}:42`,
      chain: 'ethereum',
      contract: NORMALIZED_ADDRESS,
      identifier: '42',
      tokenStandard: 'erc721',
      title: 'Garden Orbit',
      collection: 'formal-works',
      thumbnailUrl: 'https://ipfs.io/ipfs/bafyExample/artwork.png',
      imageUrl: 'https://ipfs.io/ipfs/bafyExample/artwork.png',
      animationUrl: null,
      animationKind: 'unknown',
      openseaUrl: `https://opensea.io/assets/ethereum/${NORMALIZED_ADDRESS}/42`,
      description: 'A cheerful orbit.',
    })
  })

  it('keeps display-first thumbnails separate from original-first room images', () => {
    const nft = normalizeOpenSeaOwnedNft({
      contract: VALID_ADDRESS,
      identifier: '43',
      token_standard: 'erc721',
      collection: 'formal-works',
      display_image_url: 'https://i2c.seadn.io/ethereum/display.png',
      image_url: 'ipfs://bafyImage/image.png',
      original_image_url: 'ar://originalAsset/art.png',
      is_disabled: false,
      is_nsfw: false,
    })

    expect(nft?.thumbnailUrl).toBe('https://i2c.seadn.io/ethereum/display.png')
    expect(nft?.imageUrl).toBe('https://arweave.net/originalAsset/art.png')
  })

  it('builds versioned proxy URLs with thumbnail and room variants', () => {
    const sourceUrl = 'https://raw2.seadn.io/folder/Artwork #1.svg'
    const thumbnail = new URL(ownedNftMediaProxyUrl(sourceUrl), 'http://localhost')
    const room = new URL(ownedNftMediaProxyUrl(sourceUrl, 'room'), 'http://localhost')
    const motion = new URL(ownedNftMediaProxyUrl(sourceUrl, 'motion'), 'http://localhost')
    const lod = new URL(ownedNftMediaProxyUrl(sourceUrl, 'lod'), 'http://localhost')

    expect(thumbnail.pathname).toBe('/api/opensea/media')
    expect(thumbnail.searchParams.get('url')).toBe(sourceUrl)
    expect(thumbnail.searchParams.get('variant')).toBe('thumb')
    expect(thumbnail.searchParams.get('v')).toBe(OWNED_NFT_MEDIA_CACHE_VERSION)
    expect(room.searchParams.get('url')).toBe(sourceUrl)
    expect(room.searchParams.get('variant')).toBe('room')
    expect(room.searchParams.get('v')).toBe(OWNED_NFT_MEDIA_CACHE_VERSION)
    expect(motion.searchParams.get('url')).toBe(sourceUrl)
    expect(motion.searchParams.get('variant')).toBe('motion')
    expect(motion.searchParams.get('v')).toBe(OWNED_NFT_MEDIA_CACHE_VERSION)
    expect(lod.searchParams.get('variant')).toBe('lod')
    expect(lod.searchParams.get('v')).toBe(OWNED_NFT_MEDIA_CACHE_VERSION)
  })

  it('keeps trusted OpenSea animation media, classifies it, and retains animation-only NFTs', () => {
    const video = normalizeOpenSeaOwnedNft({
      contract: VALID_ADDRESS,
      identifier: '44',
      token_standard: 'erc721',
      collection: 'formal-works',
      display_animation_url: 'https://i2c.seadn.io/ethereum/loop.MP4?quality=display',
      original_animation_url: 'ipfs://bafyOriginal/loop.webm',
      is_disabled: false,
      is_nsfw: false,
    })

    expect(video).toMatchObject({
      thumbnailUrl: null,
      imageUrl: null,
      animationUrl: 'https://i2c.seadn.io/ethereum/loop.MP4?quality=display',
      animationKind: 'video',
    })

    const animatedImage = normalizeOpenSeaOwnedNft({
      contract: VALID_ADDRESS,
      identifier: '45',
      token_standard: 'erc721',
      collection: 'formal-works',
      display_animation_url: 'https://tracker.example.test/loop.gif',
      original_animation_url: 'ipfs://bafyOriginal/loop.webp',
      is_disabled: false,
      is_nsfw: false,
    })
    expect(animatedImage?.animationUrl).toBe('https://ipfs.io/ipfs/bafyOriginal/loop.webp')
    expect(animatedImage?.animationKind).toBe('image')
  })

  it('promotes trusted GIF and APNG still URLs when OpenSea has no animation field', () => {
    const gif = normalizeOpenSeaOwnedNft({
      contract: VALID_ADDRESS,
      identifier: '46',
      token_standard: 'erc721',
      collection: 'formal-works',
      original_image_url: 'ipfs://bafyOriginal/loop.GIF',
      is_disabled: false,
      is_nsfw: false,
    })
    const apng = normalizeOpenSeaOwnedNft({
      contract: VALID_ADDRESS,
      identifier: '47',
      token_standard: 'erc721',
      collection: 'formal-works',
      original_image_url: 'ar://animatedAsset/loop.apng',
      is_disabled: false,
      is_nsfw: false,
    })

    expect(gif?.animationUrl).toBe('https://ipfs.io/ipfs/bafyOriginal/loop.GIF')
    expect(gif?.animationKind).toBe('image')
    expect(apng?.animationUrl).toBe('https://arweave.net/animatedAsset/loop.apng')
    expect(apng?.animationKind).toBe('image')
  })

  it('rejects untrusted animation URLs and classifies extensionless trusted motion as unknown', () => {
    const rejected = normalizeOpenSeaOwnedNft({
      contract: VALID_ADDRESS,
      identifier: '48',
      token_standard: 'erc721',
      collection: 'formal-works',
      display_animation_url: 'javascript:alert(1)',
      original_animation_url: 'https://tracker.example.test/loop.mp4',
      is_disabled: false,
      is_nsfw: false,
    })
    const unknown = normalizeOpenSeaOwnedNft({
      contract: VALID_ADDRESS,
      identifier: '49',
      token_standard: 'erc721',
      collection: 'formal-works',
      display_animation_url: 'https://i2c.seadn.io/ethereum/animation',
      is_disabled: false,
      is_nsfw: false,
    })
    const htmlExperience = normalizeOpenSeaOwnedNft({
      contract: VALID_ADDRESS,
      identifier: '50',
      token_standard: 'erc721',
      collection: 'formal-works',
      display_animation_url: 'https://raw2.seadn.io/ethereum/interactive.html?seed=42',
      original_animation_url: 'https://raw2.seadn.io/ethereum/model.glb',
      is_disabled: false,
      is_nsfw: false,
    })

    expect(rejected?.animationUrl).toBeNull()
    expect(rejected?.animationKind).toBe('unknown')
    expect(unknown?.animationUrl).toBe('https://i2c.seadn.io/ethereum/animation')
    expect(unknown?.animationKind).toBe('unknown')
    expect(htmlExperience?.animationUrl).toBeNull()
    expect(htmlExperience?.animationKind).toBe('unknown')
  })

  it('filters disabled, NSFW, cross-chain, malformed, and duplicate entries', () => {
    const baseNft = {
      contract: VALID_ADDRESS,
      identifier: '7',
      token_standard: 'erc1155',
      collection: 'museum-tests',
      opensea_url: 'https://opensea.io/assets/ethereum/example/7',
      is_disabled: false,
      is_nsfw: false,
    }
    const page = normalizeOpenSeaOwnedNftsResponse({
      nfts: [
        baseNft,
        { ...baseNft, name: 'duplicate' },
        { ...baseNft, identifier: '8', is_disabled: 'true' },
        { ...baseNft, identifier: '9', is_nsfw: 1 },
        { ...baseNft, identifier: '10', chain: 'polygon' },
        { ...baseNft, identifier: '11', contract: 'not-an-address' },
        null,
      ],
      next: ' page-two ',
    })

    expect(page.nfts).toHaveLength(1)
    expect(page.nfts[0]).toMatchObject({
      tokenKey: `ethereum:${NORMALIZED_ADDRESS}:7`,
      title: 'Token #7',
      thumbnailUrl: null,
      imageUrl: null,
    })
    expect(page.nextCursor).toBe('page-two')
    expect(normalizeOpenSeaOwnedNftsResponse('not-an-object')).toEqual({ nfts: [], nextCursor: null })
  })

  it('fails closed on missing safety flags and rejects arbitrary tracking image hosts', () => {
    const baseNft = {
      contract: VALID_ADDRESS,
      identifier: '55',
      token_standard: 'erc721',
      collection: 'museum-tests',
      opensea_url: 'https://opensea.io/assets/ethereum/example/55',
    }

    expect(normalizeOpenSeaOwnedNft(baseNft)).toBeNull()
    const rejectedTracker = normalizeOpenSeaOwnedNft({
      ...baseNft,
      is_disabled: false,
      is_nsfw: false,
      display_image_url: 'https://tracker.example.test/pixel.png',
    })
    expect(rejectedTracker?.thumbnailUrl).toBeNull()
    expect(rejectedTracker?.imageUrl).toBeNull()

    const trustedImage = normalizeOpenSeaOwnedNft({
      ...baseNft,
      is_disabled: false,
      is_nsfw: false,
      display_image_url: 'https://i2c.seadn.io/ethereum/example.png',
    })
    expect(trustedImage?.thumbnailUrl).toBe('https://i2c.seadn.io/ethereum/example.png')
    expect(trustedImage?.imageUrl).toBe('https://i2c.seadn.io/ethereum/example.png')
  })
})

describe('GET /api/opensea/owned-nfts', () => {
  it('rejects an invalid address before contacting OpenSea', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(new Request('http://localhost/api/opensea/owned-nfts?address=nope'))
    const body = await response.json() as { error: { code: string } }

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('invalid_address')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails closed with a friendly response when the server key is missing', async () => {
    delete process.env.OPENSEA_API_KEY
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(new Request(
      `http://localhost/api/opensea/owned-nfts?address=${VALID_ADDRESS}`,
    ))
    const body = await response.json() as { error: { code: string; message: string } }

    expect(response.status).toBe(503)
    expect(body.error.code).toBe('not_configured')
    expect(body.error.message).not.toContain('OPENSEA_API_KEY')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requests 50 Ethereum NFTs with the cursor and never returns the server key', async () => {
    const fakeServerKey = 'test-only-server-key'
    process.env.OPENSEA_API_KEY = fakeServerKey
    let requestedUrl = ''
    let requestedHeaders = new Headers()
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = String(input)
      requestedHeaders = new Headers(init?.headers)
      return new Response(JSON.stringify({
        nfts: [{
          contract: VALID_ADDRESS,
          identifier: '101',
          token_standard: 'erc721',
          name: 'Museum Test',
          collection: 'museum-tests',
          display_image_url: 'https://images.example.test/101.png',
          opensea_url: 'https://opensea.io/assets/ethereum/example/101',
          is_disabled: false,
          is_nsfw: false,
        }],
        next: 'another-page',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }))

    const response = await GET(new Request(
      `http://localhost/api/opensea/owned-nfts?address=${VALID_ADDRESS}&cursor=page%2Bone`,
    ))
    const responseText = await response.text()
    const body = JSON.parse(responseText) as { nfts: Array<{ tokenKey: string }>; nextCursor: string }
    const upstreamUrl = new URL(requestedUrl)

    expect(response.status).toBe(200)
    expect(upstreamUrl.pathname).toBe(`/api/v2/chain/ethereum/account/${NORMALIZED_ADDRESS}/nfts`)
    expect(upstreamUrl.searchParams.get('limit')).toBe('50')
    expect(upstreamUrl.searchParams.get('next')).toBe('page+one')
    expect(requestedHeaders.get('x-api-key')).toBe(fakeServerKey)
    expect(body.nfts[0]?.tokenKey).toBe(`ethereum:${NORMALIZED_ADDRESS}:101`)
    expect(body.nextCursor).toBe('another-page')
    expect(responseText).not.toContain(fakeServerKey)
  })

  it('forwards a safe Retry-After value for OpenSea rate limits', async () => {
    process.env.OPENSEA_API_KEY = 'test-only-server-key'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', {
      status: 429,
      headers: { 'Retry-After': '17' },
    })))

    const response = await GET(new Request(
      `http://localhost/api/opensea/owned-nfts?address=${VALID_ADDRESS}`,
    ))
    const body = await response.json() as { error: { code: string; retryAfterSeconds: number } }

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('17')
    expect(body.error).toMatchObject({ code: 'rate_limited', retryAfterSeconds: 17 })
  })
})
