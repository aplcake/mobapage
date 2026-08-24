import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../app/api/opensea/artwork-owner/route'

const MOBA_ONE_CONTRACT = '0x76a7ba0de6b80e9abcc1855713022b1e753ac1d1'
const MOBA_GALLERY_CONTRACT = '0x04619852f38ebec22bb94ef36b99351db9900194'
const GLOWBUD_CONTRACT = '0x40148d9aec2d0aed12ccf556cd7cd79c15197644'
const OWNER = `0x${'ab'.repeat(20)}`
const OTHER_OWNER = `0x${'cd'.repeat(20)}`
const ORIGINAL_API_KEY = process.env.OPENSEA_API_KEY

function request(contract: string, tokenId: string, chain = 'base') {
  const url = new URL('http://localhost/api/opensea/artwork-owner')
  url.searchParams.set('chain', chain)
  url.searchParams.set('contract', contract)
  url.searchParams.set('tokenId', tokenId)
  return new Request(url)
}

function rpcOwnerResult(address: string) {
  return `0x${address.slice(2).padStart(64, '0')}`
}

afterEach(() => {
  if (ORIGINAL_API_KEY === undefined) delete process.env.OPENSEA_API_KEY
  else process.env.OPENSEA_API_KEY = ORIGINAL_API_KEY
  vi.unstubAllGlobals()
})

describe('GET /api/opensea/artwork-owner', () => {
  it('gets an ERC-721 owner from Base even when OpenSea profile lookup is unavailable', async () => {
    delete process.env.OPENSEA_API_KEY
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('https://mainnet.base.org')
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: rpcOwnerResult(OWNER),
      }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request(MOBA_ONE_CONTRACT, '597'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      owner: { address: OWNER, username: null, ensName: null },
      ownerCount: 1,
      hasMoreOwners: false,
    })
    expect(fetchMock).toHaveBeenCalledWith('https://mainnet.base.org', expect.any(Object))
  })

  it('accepts registered Glowbuds and resolves their owner on Abstract', async () => {
    delete process.env.OPENSEA_API_KEY
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === 'https://api.mainnet.abs.xyz') {
        return new Response(JSON.stringify({ result: rpcOwnerResult(OWNER) }), { status: 200 })
      }
      expect(String(input)).toContain(`/item/abstract/${GLOWBUD_CONTRACT}/73`)
      return new Response('<html></html>', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request(GLOWBUD_CONTRACT, '73', 'abstract'))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      owner: { address: OWNER },
      ownerCount: 1,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('uses a matching public OpenSea item credit for a Glowbud when no API key is present', async () => {
    delete process.env.OPENSEA_API_KEY
    const payload = {
      rehydrate: {
        itemByIdentifier: {
          tokenId: '74',
          contractAddress: GLOWBUD_CONTRACT,
          owner: { address: OWNER, displayName: 'collector.eth' },
        },
      },
    }
    const itemHtml = `<script>(window[Symbol.for("urql_transport")] ??= []).push(${JSON.stringify(payload)})</script>`
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => (
      String(input) === 'https://api.mainnet.abs.xyz'
        ? new Response(JSON.stringify({ result: rpcOwnerResult(OWNER) }), { status: 200 })
        : new Response(itemHtml, { status: 200 })
    ))
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request(GLOWBUD_CONTRACT, '74', 'abstract'))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      owner: { address: OWNER, username: 'collector.eth' },
    })
  })

  it('enriches the on-chain owner with an OpenSea username and ENS name', async () => {
    const serverKey = 'artwork-owner-test-key'
    process.env.OPENSEA_API_KEY = serverKey
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === 'https://mainnet.base.org') {
        return new Response(JSON.stringify({ result: rpcOwnerResult(OWNER) }), { status: 200 })
      }
      expect(url).toContain(`/api/v2/accounts/resolve/${OWNER}`)
      expect((init?.headers as Record<string, string>)['x-api-key']).toBe(serverKey)
      return new Response(JSON.stringify({
        address: OWNER.toUpperCase(),
        username: 'joe.pxlr',
        ens_name: 'museum.eth',
      }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request(MOBA_ONE_CONTRACT, '596'))
    const responseText = await response.text()

    expect(response.status).toBe(200)
    expect(JSON.parse(responseText)).toEqual({
      owner: { address: OWNER, username: 'joe.pxlr', ensName: 'museum.eth' },
      ownerCount: 1,
      hasMoreOwners: false,
    })
    expect(responseText).not.toContain(serverKey)
  })

  it('falls back to the standard OpenSea profile when account resolution is unavailable', async () => {
    process.env.OPENSEA_API_KEY = 'artwork-owner-test-key'
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === 'https://mainnet.base.org') {
        return new Response(JSON.stringify({ result: rpcOwnerResult(OWNER) }), { status: 200 })
      }
      if (url.includes('/accounts/resolve/')) return new Response(null, { status: 404 })
      expect(url).toContain(`/api/v2/accounts/${OWNER}`)
      return new Response(JSON.stringify({
        address: OWNER,
        username: 'profile-collector',
        ens_name: 'profile.eth',
      }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request(MOBA_ONE_CONTRACT, '595'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      owner: { address: OWNER, username: 'profile-collector', ensName: 'profile.eth' },
      ownerCount: 1,
      hasMoreOwners: false,
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('supports an ERC-1155 work with multiple collectors', async () => {
    process.env.OPENSEA_API_KEY = 'artwork-owner-test-key'
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/owners')) {
        return new Response(JSON.stringify({
          owners: [{ address: OWNER }, { address: OTHER_OWNER }],
          next: 'another-page',
        }), { status: 200 })
      }
      return new Response(JSON.stringify({ address: OWNER, username: 'primary-collector' }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request(MOBA_GALLERY_CONTRACT, '2'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      owner: { address: OWNER, username: 'primary-collector', ensName: null },
      ownerCount: 2,
      hasMoreOwners: true,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects arbitrary contracts before contacting any upstream service', async () => {
    process.env.OPENSEA_API_KEY = 'artwork-owner-test-key'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request(`0x${'ef'.repeat(20)}`, '1'))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails quietly when an ERC-1155 owner needs OpenSea and no key is configured', async () => {
    delete process.env.OPENSEA_API_KEY
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request(MOBA_GALLERY_CONTRACT, '3'))
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error.message).toBe('This owner record is not available yet.')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
