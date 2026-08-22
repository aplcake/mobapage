import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../app/api/opensea/verify-ownership/route'

const ADDRESS = `0x${'ab'.repeat(20)}`
const OTHER_ADDRESS = `0x${'cd'.repeat(20)}`
const ORIGINAL_API_KEY = process.env.OPENSEA_API_KEY

function selection(index: number) {
  const contract = `0x${String(index).padStart(40, '0')}`
  return {
    tokenKey: `ethereum:${contract}:${index}`,
    contract,
    identifier: String(index),
  }
}

function request(selections = [selection(1), selection(2), selection(3)]) {
  return new Request('http://localhost/api/opensea/verify-ownership', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: ADDRESS, selections }),
  })
}

afterEach(() => {
  if (ORIGINAL_API_KEY === undefined) delete process.env.OPENSEA_API_KEY
  else process.env.OPENSEA_API_KEY = ORIGINAL_API_KEY
  vi.unstubAllGlobals()
})

describe('POST /api/opensea/verify-ownership', () => {
  it('rechecks all three owners without returning the server key', async () => {
    const serverKey = 'verify-test-key'
    process.env.OPENSEA_API_KEY = serverKey
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      owners: [{ address: `0x${ADDRESS.slice(2).toUpperCase()}`, quantity: 1 }],
      next: null,
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(request())
    const responseText = await response.text()

    expect(response.status).toBe(200)
    expect(JSON.parse(responseText)).toEqual({ verified: true, missingTokenKeys: [] })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(responseText).not.toContain(serverKey)
  })

  it('reports a selection that is no longer owned', async () => {
    process.env.OPENSEA_API_KEY = 'verify-test-key'
    let call = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      call += 1
      return new Response(JSON.stringify({
        owners: [{ address: call === 2 ? OTHER_ADDRESS : ADDRESS, quantity: 1 }],
        next: null,
      }), { status: 200 })
    }))

    const response = await POST(request())
    const body = await response.json() as { verified: boolean; missingTokenKeys: string[] }

    expect(body.verified).toBe(false)
    expect(body.missingTokenKeys).toEqual([selection(2).tokenKey])
  })

  it('follows ERC-1155 owner pages until the wallet is found', async () => {
    process.env.OPENSEA_API_KEY = 'verify-test-key'
    const callsByToken = new Map<string, number>()
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      const tokenId = url.pathname.split('/').at(-2) ?? ''
      const calls = (callsByToken.get(tokenId) ?? 0) + 1
      callsByToken.set(tokenId, calls)
      return new Response(JSON.stringify({
        owners: [{ address: calls === 1 ? OTHER_ADDRESS : ADDRESS, quantity: 1 }],
        next: calls === 1 ? `page-${tokenId}` : null,
      }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(request())
    const body = await response.json() as { verified: boolean }

    expect(body.verified).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })

  it('rejects duplicate or malformed selections before contacting OpenSea', async () => {
    process.env.OPENSEA_API_KEY = 'verify-test-key'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const duplicate = selection(1)

    const response = await POST(request([duplicate, duplicate, selection(3)]))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
