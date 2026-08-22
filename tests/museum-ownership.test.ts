import { describe, expect, it } from 'vitest'
import {
  MAX_ATRIUM_ARTWORKS,
  MAX_ATRIUM_GLOWBUDS,
  museumAssetKey,
  type AtriumInstallationDraft,
} from '../src/museum/collection-registry/museumAssetTypes'
import { MUSEUM_COLLECTION_BY_ID, MUSEUM_COLLECTIONS } from '../src/museum/collection-registry/museumCollections'
import {
  discoverMuseumAssets,
  validateAtriumDraft,
  verifyAtriumInstallation,
} from '../src/museum/collection-registry/museumOwnership'

const ADDRESS = '0x1111111111111111111111111111111111111111' as const
const OTHER_ADDRESS = '0x2222222222222222222222222222222222222222'

function identity(collectionId: keyof typeof MUSEUM_COLLECTION_BY_ID, tokenId: string) {
  const collection = MUSEUM_COLLECTION_BY_ID[collectionId]
  return { collectionId, chainId: collection.chainId, contract: collection.contract, tokenId }
}

function response(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
}

function abiString(value: string) {
  const hex = Buffer.from(value, 'utf8').toString('hex')
  const padded = hex.padEnd(Math.ceil(hex.length / 64) * 64, '0')
  return `0x${'20'.padStart(64, '0')}${(hex.length / 2).toString(16).padStart(64, '0')}${padded}`
}

function rpcOwnerResponse(request: Request, missingTokenIds = new Set<string>()) {
  return request.json().then((payload) => {
    const body = payload as { method?: string; params?: Array<{ data?: string }> }
    if (body.method === 'eth_getLogs') return response({ jsonrpc: '2.0', id: 'logs', result: [] })
    const data = body.params?.[0]?.data ?? ''
    const tokenId = BigInt(`0x${data.slice(-64)}`).toString()
    if (data.startsWith('0x6352211e')) {
      const owner = missingTokenIds.has(tokenId) ? OTHER_ADDRESS : ADDRESS
      return response({ jsonrpc: '2.0', id: 'owner', result: `0x${owner.slice(2).padStart(64, '0')}` })
    }
    return response({ jsonrpc: '2.0', id: 'balance', result: missingTokenIds.has(tokenId) ? '0x0' : '0x1' })
  })
}

describe('personal atrium ownership foundation', () => {
  it('keeps the server-owned registry limited to the rendered museum collections', () => {
    expect(MUSEUM_COLLECTIONS.map((collection) => collection.id)).toEqual([
      'glowbuds', 'moba-one', 'moba-two', 'final-photos', 'holiday-potluck', 'moba-gallery',
    ])
    expect(MUSEUM_COLLECTION_BY_ID.glowbuds.chainSlug).toBe('abstract')
    expect(MUSEUM_COLLECTION_BY_ID['holiday-potluck'].standard).toBe('erc1155')
    expect(MUSEUM_COLLECTION_BY_ID['moba-gallery'].contract).toBe('0x04619852f38ebec22bb94ef36b99351db9900194')
    expect(MUSEUM_COLLECTIONS.every((collection) => /^0x[a-f0-9]{40}$/.test(collection.contract))).toBe(true)
  })

  it('discovers successful collections even when another collection is unavailable', async () => {
    const result = await discoverMuseumAssets(ADDRESS, {
      openSeaApiKey: 'server-only-test-key',
      now: () => new Date('2026-08-21T00:00:00.000Z'),
      fetchImpl: async (input, init) => {
        const url = String(input)
        if (url.includes('api.mainnet.abs.xyz')) {
          const body = JSON.parse(String(init?.body)) as { params: Array<{ topics: unknown[] }> }
          const direction = body.params[0]?.topics[1] ? 'outgoing' : 'incoming'
          return response({
            jsonrpc: '2.0', id: direction,
            result: direction === 'incoming' ? [{
              blockNumber: '0x1', logIndex: '0x0', topics: [
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                `0x${'0'.repeat(64)}`,
                `0x${ADDRESS.slice(2).padStart(64, '0')}`,
                `0x${'7'.padStart(64, '0')}`,
              ],
            }] : [],
          })
        }
        if (url.includes('moba-2-curated-hearts')) return response({}, 503)
        const collection = url.includes('moba--1') ? MUSEUM_COLLECTION_BY_ID['moba-one']
          : url.includes('final-photos') ? MUSEUM_COLLECTION_BY_ID['final-photos']
            : MUSEUM_COLLECTION_BY_ID['holiday-potluck']
        return response({ nfts: [{
          contract: collection.contract,
          identifier: collection.id === 'holiday-potluck' ? '2' : '8',
          name: `${collection.title} test work`,
          collection: collection.title,
          image_url: 'https://i.seadn.io/gae/test-image.webp',
          traits: [{ trait_type: 'Mood', value: 'Excellent' }],
        }] })
      },
    })

    expect(result.address).toBe(ADDRESS)
    expect(result.assets.map((asset) => asset.collectionId)).toEqual(expect.arrayContaining([
      'glowbuds', 'moba-one', 'final-photos', 'holiday-potluck',
    ]))
    expect(result.collectionErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ collectionId: 'moba-two' }),
    ]))
    const discoveredGlowbud = result.assets.find((asset) => asset.collectionId === 'glowbuds')
    expect(discoveredGlowbud?.tokenId).toBe('7')
    expect(discoveredGlowbud?.imageUrl).toMatch(/^https:\/\/ipfs\.io\/ipfs\//)
    expect(discoveredGlowbud?.attributes.length).toBeGreaterThan(3)
    const discoveredPortrait = result.assets.find((asset) => asset.collectionId === 'moba-one')
    const discoveredHoliday = result.assets.find((asset) => asset.collectionId === 'holiday-potluck')
    const discoveredPhoto = result.assets.find((asset) => asset.collectionId === 'final-photos')
    expect(discoveredPortrait?.animationUrl).toBe(discoveredPortrait?.imageUrl)
    expect(discoveredHoliday?.tokenId).toBe('2')
    expect(discoveredHoliday?.animationUrl).toBe(discoveredHoliday?.imageUrl)
    expect(discoveredPhoto?.animationUrl).toBeNull()
  })

  it('discovers current MoBA artwork on-chain when no OpenSea key is available', async () => {
    const result = await discoverMuseumAssets(ADDRESS, {
      now: () => new Date('2026-08-21T00:00:00.000Z'),
      fetchImpl: async (input, init) => {
        const url = String(input)
        if (url.includes('api.mainnet.abs.xyz')) {
          return response({ jsonrpc: '2.0', id: 'logs', result: [] })
        }
        if (url.includes('base.blockscout.com')) {
          const collection = url.includes(MUSEUM_COLLECTION_BY_ID['moba-one'].contract)
            ? MUSEUM_COLLECTION_BY_ID['moba-one']
            : url.includes(MUSEUM_COLLECTION_BY_ID['moba-two'].contract)
              ? MUSEUM_COLLECTION_BY_ID['moba-two']
              : null
          return response({
            items: collection ? [{
              id: collection.id === 'moba-one' ? '556' : '2079',
              owner: { hash: ADDRESS },
            }] : [],
            next_page_params: null,
          })
        }
        if (url.includes('mainnet.base.org')) {
          const body = JSON.parse(String(init?.body)) as { params: Array<{ to: string; data: string }> }
          const tokenId = BigInt(`0x${body.params[0].data.slice(-64)}`).toString()
          const collection = body.params[0].to.toLowerCase() === MUSEUM_COLLECTION_BY_ID['moba-one'].contract
            ? 'moba-one'
            : 'moba-two'
          return response({ jsonrpc: '2.0', id: 'uri', result: abiString(`ipfs://museum-metadata/${collection}/${tokenId}`) })
        }
        if (url.includes('ipfs.filebase.io/ipfs/museum-metadata/')) {
          const tokenId = url.split('/').at(-1)!
          const collectionId = url.includes('/moba-one/') ? 'moba-one' : 'moba-two'
          return response({
            name: `${collectionId} owned #${tokenId}`,
            image: `ipfs://museum-art/${collectionId}/${tokenId}.gif`,
            attributes: [{ trait_type: 'Source', value: 'On-chain metadata' }],
          })
        }
        if (url.startsWith('https://opensea.io/item/base/')) {
          const tokenId = url.split('/').at(-1)!
          const collectionId = url.includes(MUSEUM_COLLECTION_BY_ID['moba-one'].contract)
            ? 'moba-one'
            : 'moba-two'
          return new Response(`<html><head><script type="application/ld+json">${JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: `${collectionId} cached #${tokenId}`,
            image: `https://i2c.seadn.io/base/${collectionId}/${tokenId}.gif`,
          })}</script></head></html>`, {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })
        }
        throw new Error(`Unexpected test request: ${url}`)
      },
    })

    expect(result.assets.map((asset) => `${asset.collectionId}:${asset.tokenId}`)).toEqual([
      'moba-one:556',
      'moba-two:2079',
    ])
    expect(result.assets.every((asset) => asset.imageUrl?.startsWith('https://i2c.seadn.io/base/'))).toBe(true)
    expect(result.assets.every((asset) => asset.animationUrl === asset.imageUrl)).toBe(true)
    expect(result.collectionErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ collectionId: 'final-photos' }),
      expect.objectContaining({ collectionId: 'holiday-potluck' }),
    ]))
  })

  it('rejects duplicates, overflow, wrong category, and unsupported identities before any RPC call', () => {
    const glowbud = identity('glowbuds', '7')
    const moba = identity('moba-one', '8')
    const duplicate: AtriumInstallationDraft = {
      version: 1, address: ADDRESS, addressSource: 'wallet', glowbuds: [glowbud], artworks: [glowbud],
    }
    expect(validateAtriumDraft(duplicate)).toMatchObject({ valid: false })
    expect(validateAtriumDraft({
      version: 1, address: ADDRESS, addressSource: 'wallet',
      glowbuds: Array.from({ length: MAX_ATRIUM_GLOWBUDS + 1 }, (_, index) => identity('glowbuds', String(index + 1))),
      artworks: [],
    })).toMatchObject({ valid: false })
    expect(validateAtriumDraft({
      version: 1, address: ADDRESS, addressSource: 'wallet', glowbuds: [moba], artworks: [],
    })).toMatchObject({ valid: false })
    expect(validateAtriumDraft({
      version: 1, address: ADDRESS, addressSource: 'wallet', glowbuds: [],
      artworks: Array.from({ length: MAX_ATRIUM_ARTWORKS + 1 }, () => moba),
    })).toMatchObject({ valid: false })
    expect(museumAssetKey(moba)).toContain('moba-one:8453')
  })

  it('installs every verified asset while safely skipping stale tokens', async () => {
    const draft: AtriumInstallationDraft = {
      version: 1,
      address: ADDRESS,
      addressSource: 'public-address',
      glowbuds: [identity('glowbuds', '7')],
      artworks: [identity('moba-one', '8'), identity('holiday-potluck', '2')],
    }
    const verified = await verifyAtriumInstallation(draft, {
      now: () => new Date('2026-08-21T00:00:00.000Z'),
      fetchImpl: async (_input, init) => rpcOwnerResponse(new Request('https://rpc.example', init)),
    })
    expect(verified.verified).toBe(true)
    expect(verified.installation?.layoutVersion).toBe(1)
    expect(verified.unavailable).toEqual([])

    const stale = await verifyAtriumInstallation(draft, {
      fetchImpl: async (_input, init) => rpcOwnerResponse(new Request('https://rpc.example', init), new Set(['2'])),
    })
    expect(stale.verified).toBe(true)
    expect(stale.missing).toEqual([identity('holiday-potluck', '2')])
    expect(stale.unavailable).toEqual([])
    expect(stale.installation?.artworks).toEqual([identity('moba-one', '8')])
    expect(stale.installation?.glowbuds).toEqual([identity('glowbuds', '7')])
  })

  it('does not let one unavailable collection block the rest of the atrium', async () => {
    const draft: AtriumInstallationDraft = {
      version: 1,
      address: ADDRESS,
      addressSource: 'wallet',
      glowbuds: [identity('glowbuds', '7')],
      artworks: [identity('moba-one', '8'), identity('moba-two', '9')],
    }
    const result = await verifyAtriumInstallation(draft, {
      fetchImpl: async (_input, init) => {
        const request = new Request('https://rpc.example', init)
        const payload = await request.clone().json() as { params?: Array<{ to?: string }> }
        if (payload.params?.[0]?.to?.toLowerCase() === MUSEUM_COLLECTION_BY_ID['moba-two'].contract) {
          throw new Error('temporary RPC outage')
        }
        return rpcOwnerResponse(request)
      },
    })
    expect(result.verified).toBe(true)
    expect(result.unavailable).toEqual([identity('moba-two', '9')])
    expect(result.installation?.glowbuds).toEqual([identity('glowbuds', '7')])
    expect(result.installation?.artworks).toEqual([identity('moba-one', '8')])
  })
})
