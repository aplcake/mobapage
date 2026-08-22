import { afterEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { GET } from '../app/api/opensea/media/route'
import { OWNED_NFT_MEDIA_CACHE_VERSION } from '../src/museum/formal-room/ownedNfts'

function request(
  url: string,
  options: {
    variant?: string | null
    version?: string | null
    headers?: HeadersInit
  } = {},
) {
  const params = new URLSearchParams({ url })
  if (options.variant !== null) params.set('variant', options.variant ?? 'thumb')
  if (options.version !== null) params.set('v', options.version ?? OWNED_NFT_MEDIA_CACHE_VERSION)
  return new Request(`http://localhost/api/opensea/media?${params.toString()}`, {
    headers: options.headers,
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('GET /api/opensea/media', () => {
  it('requires a known display variant and the current cache version before fetching', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const mediaUrl = 'https://i2c.seadn.io/ethereum/art.png'

    expect((await GET(request(mediaUrl, { variant: null }))).status).toBe(400)
    expect((await GET(request(mediaUrl, { variant: 'poster' }))).status).toBe(400)
    expect((await GET(request(mediaUrl, { version: null }))).status).toBe(400)
    expect((await GET(request(mediaUrl, { version: '1' }))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects arbitrary image hosts before making a network request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request('https://tracker.example.test/art.png'))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns approved still images as same-origin, sniff-protected media', async () => {
    const bytes = new Uint8Array([137, 80, 78, 71])
    vi.stubGlobal('fetch', vi.fn(async () => new Response(bytes, {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Content-Length': String(bytes.byteLength) },
    })))

    const response = await GET(request('https://i2c.seadn.io/ethereum/art.png'))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('Content-Security-Policy')).toBe("sandbox; default-src 'none'")
    expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin')
    expect(response.headers.get('X-Museum-Media-Variant')).toBe('thumb')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
  })

  it('falls back from a tired IPFS gateway without exposing the remote host', async () => {
    const bytes = new Uint8Array([137, 80, 78, 71])
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input))
      if (String(input).includes('gateway.pinata.cloud')) return new Response('busy', { status: 504 })
      return new Response(bytes, {
        status: 200,
        headers: { 'Content-Type': 'image/png', 'Content-Length': String(bytes.byteLength) },
      })
    }))

    const response = await GET(request('https://ipfs.io/ipfs/bafy-owned-art/8'))

    expect(response.status).toBe(200)
    expect(calls).toEqual([
      'https://gateway.pinata.cloud/ipfs/bafy-owned-art/8',
      'https://ipfs.io/ipfs/bafy-owned-art/8',
    ])
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
  })

  it.each([
    'image/avif',
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
  ])('keeps supported museum image frames working for %s', async (mediaType) => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    vi.stubGlobal('fetch', vi.fn(async () => new Response(bytes, {
      status: 200,
      headers: { 'Content-Type': mediaType },
    })))

    const response = await GET(request('https://i2c.seadn.io/ethereum/framed-art'))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(mediaType)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
  })

  it.each([
    'image/avif',
    'image/gif',
    'image/png',
    'image/webp',
  ])('streams approved animated raster media for %s', async (mediaType) => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    vi.stubGlobal('fetch', vi.fn(async () => new Response(bytes, {
      status: 200,
      headers: { 'Content-Type': mediaType },
    })))

    const response = await GET(request('https://i2c.seadn.io/ethereum/motion', { variant: 'motion' }))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(mediaType)
    expect(response.headers.get('X-Museum-Media-Variant')).toBe('motion')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
  })

  it.each(['video/mp4', 'video/webm'])('streams approved NFT video for %s', async (mediaType) => {
    const bytes = new Uint8Array([5, 6, 7, 8])
    let accept = ''
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      accept = new Headers(init?.headers).get('accept') ?? ''
      return new Response(bytes, {
        status: 200,
        headers: { 'Content-Type': mediaType, 'Content-Length': String(bytes.byteLength) },
      })
    }))

    const response = await GET(request('https://i2c.seadn.io/ethereum/motion', { variant: 'motion' }))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(mediaType)
    expect(response.headers.get('Accept-Ranges')).toBe('bytes')
    expect(response.headers.get('Content-Length')).toBe(String(bytes.byteLength))
    expect(accept).toContain('video/mp4')
    expect(accept).toContain('video/webm')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
  })

  it('uses the motion timeout only for response headers, not the continuing video body', async () => {
    vi.useFakeTimers()
    const captured: { signal?: AbortSignal } = {}
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      captured.signal = init?.signal as AbortSignal
      return new Response(new ReadableStream({
        start() {
          // Keep the body open to model a video that plays for longer than the header timeout.
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'video/mp4' },
      })
    }))

    const response = await GET(request('https://i2c.seadn.io/ethereum/long-video.mp4', {
      variant: 'motion',
    }))
    await vi.advanceTimersByTimeAsync(21_000)

    expect(response.status).toBe(200)
    expect(captured.signal?.aborted).toBe(false)
    await response.body?.cancel()
  })

  it('keeps video out of still-image variants', async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2]), {
      status: 200,
      headers: { 'Content-Type': 'video/mp4' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    expect((await GET(request('https://i2c.seadn.io/clip.mp4', { variant: 'thumb' }))).status).toBe(415)
    expect((await GET(request('https://i2c.seadn.io/clip.mp4', { variant: 'room' }))).status).toBe(415)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each([
    'image/jpeg',
    'image/svg+xml',
    'text/html',
    'model/gltf-binary',
    'audio/mpeg',
    'application/octet-stream',
  ])('rejects unsupported or active motion content for %s', async (mediaType) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2]), {
      status: 200,
      headers: { 'Content-Type': mediaType },
    })))

    const response = await GET(request('https://i2c.seadn.io/ethereum/unsafe-motion', { variant: 'motion' }))

    expect(response.status).toBe(415)
  })

  it('forwards one strict video byte range and preserves a validated 206 response', async () => {
    const bytes = new Uint8Array([4, 5, 6, 7])
    let forwardedRange = ''
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      forwardedRange = new Headers(init?.headers).get('range') ?? ''
      return new Response(bytes, {
        status: 206,
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Length': String(bytes.byteLength),
          'Content-Range': 'bytes 4-7/16',
          'Content-Type': 'video/mp4',
        },
      })
    }))

    const response = await GET(request('https://i2c.seadn.io/ethereum/clip.mp4', {
      variant: 'motion',
      headers: { Range: 'bytes=4-7' },
    }))

    expect(forwardedRange).toBe('bytes=4-7')
    expect(response.status).toBe(206)
    expect(response.headers.get('Accept-Ranges')).toBe('bytes')
    expect(response.headers.get('Content-Range')).toBe('bytes 4-7/16')
    expect(response.headers.get('Content-Length')).toBe('4')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
  })

  it('cuts off a partial video body that exceeds its declared content range', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]))
        controller.close()
      },
    }), {
      status: 206,
      headers: {
        'Content-Range': 'bytes 0-3/16',
        'Content-Type': 'video/mp4',
      },
    })))

    const response = await GET(request('https://i2c.seadn.io/ethereum/clip.mp4', {
      variant: 'motion',
      headers: { Range: 'bytes=0-3' },
    }))

    expect(response.status).toBe(206)
    await expect(response.arrayBuffer()).rejects.toThrow('byte limit')
  })

  it.each([
    'items=0-4',
    'bytes=',
    'bytes=9-4',
    'bytes=0-4,8-12',
    'bytes=-0',
  ])('rejects malformed or multipart video ranges before fetching: %s', async (range) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request('https://i2c.seadn.io/ethereum/clip.mp4', {
      variant: 'motion',
      headers: { Range: range },
    }))

    expect(response.status).toBe(416)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects mismatched video ranges and media whose total size exceeds 32 MB', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]), {
      status: 206,
      headers: {
        'Content-Length': '4',
        'Content-Range': 'bytes 8-11/16',
        'Content-Type': 'video/mp4',
      },
    })))
    const mismatch = await GET(request('https://i2c.seadn.io/ethereum/mismatch.mp4', {
      variant: 'motion',
      headers: { Range: 'bytes=4-7' },
    }))
    expect(mismatch.status).toBe(502)

    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]), {
      status: 206,
      headers: {
        'Content-Length': '4',
        'Content-Range': `bytes 0-3/${32 * 1024 * 1024 + 1}`,
        'Content-Type': 'video/webm',
      },
    })))
    const oversizedTotal = await GET(request('https://i2c.seadn.io/ethereum/too-large.webm', {
      variant: 'motion',
      headers: { Range: 'bytes=0-3' },
    }))
    expect(oversizedTotal.status).toBe(413)
  })

  it('rasterizes malicious SVG to inert PNG instead of serving active markup', async () => {
    const maliciousSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><script>alert(document.domain)</script><rect width="32" height="32" fill="red"/></svg>'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(maliciousSvg, {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' },
    })))

    const response = await GET(request('https://ipfs.io/ipfs/bafy-malicious/art.svg'))
    const body = new Uint8Array(await response.arrayBuffer())

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('X-Image-Width')).toBe('768')
    expect(response.headers.get('X-Image-Height')).toBe('768')
    expect([...body.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    expect(new TextDecoder().decode(body)).not.toContain('<script>')
    await expect(sharp(body).metadata()).resolves.toMatchObject({ width: 768, height: 768 })
  })

  it('upscales a tiny SVG to the exact room long edge while preserving its aspect', async () => {
    const tinySvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="12"><path d="M0 0h24v12H0z" fill="#0af"/></svg>'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(tinySvg, {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' },
    })))

    const response = await GET(request('https://raw2.seadn.io/tiny.svg', { variant: 'room' }))
    const body = Buffer.from(await response.arrayBuffer())

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('X-Image-Width')).toBe('2048')
    expect(response.headers.get('X-Image-Height')).toBe('1024')
    await expect(sharp(body).metadata()).resolves.toMatchObject({ width: 2048, height: 1024 })
  })

  it('down-renders large-coordinate SVGs and rejects only unsafe source limits', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<svg />', {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml', 'Content-Length': String(3 * 1024 * 1024) },
    })))
    expect((await GET(request('https://raw2.seadn.io/oversized-source.svg'))).status).toBe(413)

    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="100"><rect width="3000" height="100"/></svg>',
      { status: 200, headers: { 'Content-Type': 'image/svg+xml' } },
    )))
    const downRendered = await GET(request(
      'https://raw2.seadn.io/large-coordinates.svg',
      { variant: 'room' },
    ))
    expect(downRendered.status).toBe(200)
    await expect(sharp(Buffer.from(await downRendered.arrayBuffer())).metadata()).resolves.toMatchObject({
      width: 2048,
      height: 68,
    })

    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="40000" height="10"><rect width="40000" height="10"/></svg>',
      { status: 200, headers: { 'Content-Type': 'image/svg+xml' } },
    )))
    expect((await GET(request('https://raw2.seadn.io/unsafe-coordinates.svg'))).status).toBe(413)
  })

  it('rejects oversized and non-image responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('too large', {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Content-Length': String(11 * 1024 * 1024) },
    })))
    expect((await GET(request('https://raw2.seadn.io/large.png'))).status).toBe(413)

    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html />', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })))
    expect((await GET(request('https://raw2.seadn.io/not-art'))).status).toBe(415)
  })

  it('cuts off chunked image bodies that exceed the strict byte limit', async () => {
    const oversizedChunk = new Uint8Array(10 * 1024 * 1024 + 1)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(oversizedChunk)
        controller.close()
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    })))

    const response = await GET(request('https://raw2.seadn.io/chunked-large.png'))

    expect(response.status).toBe(200)
    await expect(response.arrayBuffer()).rejects.toThrow('byte limit')
  })

  it('throttles a single client within a bounded request window', async () => {
    const bytes = new Uint8Array([137, 80, 78, 71])
    const fetchMock = vi.fn(async () => new Response(bytes, {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    let throttled: Response | null = null
    for (let index = 0; index < 140; index += 1) {
      const response = await GET(request(`https://i2c.seadn.io/art-${index}.png`, {
        headers: { 'x-forwarded-for': '203.0.113.120' },
      }))
      if (response.status === 429) {
        throttled = response
        break
      }
      await response.arrayBuffer()
    }

    expect(throttled?.status).toBe(429)
    expect(Number(throttled?.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(fetchMock.mock.calls.length).toBeLessThan(140)
  })

  it('never opens more than six upstream media fetches at once', async () => {
    const fetchMock = vi.fn(async () => new Response(new ReadableStream({
      start() {
        // The response remains open until the downstream body is cancelled.
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const requests = Array.from({ length: 7 }, (_, index) => GET(request(
      `https://i2c.seadn.io/concurrent-${index}.png`,
      { headers: { 'x-forwarded-for': '203.0.113.121' } },
    )))
    const firstResponses = await Promise.all(requests.slice(0, 6))

    expect(fetchMock).toHaveBeenCalledTimes(6)
    await firstResponses[0]?.body?.cancel()
    const seventhResponse = await requests[6]
    expect(fetchMock).toHaveBeenCalledTimes(7)

    await Promise.all([
      ...firstResponses.slice(1).map((response) => response.body?.cancel()),
      seventhResponse.body?.cancel(),
    ])
  })
})
