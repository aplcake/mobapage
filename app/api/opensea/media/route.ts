import sharp from 'sharp'
import {
  normalizeOwnedNftMediaSource,
  OWNED_NFT_MEDIA_CACHE_VERSION,
  type OwnedNftMediaVariant,
} from '../../../../src/museum/formal-room/ownedNfts'
import { forceMotionImageContinuousLoop } from '../../../../src/museum/formal-room/mediaLoop'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_MEDIA_BYTES = 10 * 1024 * 1024
const MAX_MOTION_MEDIA_BYTES = 32 * 1024 * 1024
const MAX_SVG_INPUT_BYTES = 2 * 1024 * 1024
const MAX_SVG_LOGICAL_DIMENSION = 32_768
const MAX_SVG_LOGICAL_PIXELS = 64 * 1024 * 1024
const MAX_SVG_RENDER_PIXELS = 6 * 1024 * 1024
const MIN_SVG_DENSITY = 1
const MAX_SVG_DENSITY = 100_000
const CLIENT_WINDOW_MS = 60_000
const CLIENT_REQUEST_LIMIT = 120
const MAX_CLIENT_WINDOWS = 500
const MAX_CONCURRENT_FETCHES = 6
const MAX_QUEUED_FETCHES = 24
const FETCH_QUEUE_WAIT_MS = 20_000
const MAX_REDIRECTS = 3
const SVG_MEDIA_TYPE = 'image/svg+xml'
const ALLOWED_RASTER_IMAGE_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])
const ALLOWED_MOTION_IMAGE_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/png',
  'image/webp',
])
const ALLOWED_MOTION_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
])

const MEDIA_VARIANTS: Record<OwnedNftMediaVariant, { longEdge: number }> = {
  lod: { longEdge: 256 },
  thumb: { longEdge: 768 },
  room: { longEdge: 2_048 },
  motion: { longEdge: 2_048 },
}

type ByteRangeRequest = {
  header: string
  start: number | null
  end: number | null
  suffixLength: number | null
}

type ContentRange = {
  start: number
  end: number
  total: number
}

const ERROR_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

type RequestWindow = {
  count: number
  startedAt: number
}

type FetchSlotWaiter = {
  resolve: (release: (() => void) | null) => void
  timeout: ReturnType<typeof setTimeout>
}

const requestWindows = new Map<string, RequestWindow>()
const fetchSlotWaiters: FetchSlotWaiter[] = []
let activeFetches = 0

function errorResponse(message: string, status: number, headers?: HeadersInit) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { ...ERROR_HEADERS, ...headers },
  })
}

function readClientKey(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const clientKey = forwarded || request.headers.get('x-real-ip')?.trim() || 'local-client'
  return clientKey.slice(0, 128)
}

function consumeClientRequest(request: Request): number | null {
  const now = Date.now()
  if (requestWindows.size >= MAX_CLIENT_WINDOWS) {
    for (const [key, window] of requestWindows) {
      if (now - window.startedAt >= CLIENT_WINDOW_MS) requestWindows.delete(key)
    }
    while (requestWindows.size >= MAX_CLIENT_WINDOWS) {
      const oldestKey = requestWindows.keys().next().value
      if (typeof oldestKey !== 'string') break
      requestWindows.delete(oldestKey)
    }
  }

  const clientKey = readClientKey(request)
  const current = requestWindows.get(clientKey)
  if (!current || now - current.startedAt >= CLIENT_WINDOW_MS) {
    requestWindows.set(clientKey, { count: 1, startedAt: now })
    return null
  }
  if (current.count >= CLIENT_REQUEST_LIMIT) {
    return Math.max(1, Math.ceil((CLIENT_WINDOW_MS - (now - current.startedAt)) / 1000))
  }
  current.count += 1
  return null
}

function releaseFetchSlot() {
  const waiter = fetchSlotWaiters.shift()
  if (waiter) {
    clearTimeout(waiter.timeout)
    waiter.resolve(createRelease())
    return
  }
  activeFetches = Math.max(0, activeFetches - 1)
}

function createRelease() {
  let released = false
  return () => {
    if (released) return
    released = true
    releaseFetchSlot()
  }
}

async function acquireFetchSlot(): Promise<(() => void) | null> {
  if (activeFetches < MAX_CONCURRENT_FETCHES) {
    activeFetches += 1
    return createRelease()
  }
  if (fetchSlotWaiters.length >= MAX_QUEUED_FETCHES) return null

  return new Promise((resolve) => {
    const waiter: FetchSlotWaiter = {
      resolve,
      timeout: setTimeout(() => {
        const index = fetchSlotWaiters.indexOf(waiter)
        if (index >= 0) fetchSlotWaiters.splice(index, 1)
        resolve(null)
      }, FETCH_QUEUE_WAIT_MS),
    }
    fetchSlotWaiters.push(waiter)
  })
}

async function cancelBody(response: Response) {
  await response.body?.cancel().catch(() => undefined)
}

async function fetchApprovedMediaSource(
  mediaUrl: string,
  signal: AbortSignal,
  variant: OwnedNftMediaVariant,
  range: ByteRangeRequest | null,
) {
  let nextUrl = mediaUrl

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(nextUrl, {
      headers: {
        Accept: variant === 'motion'
          ? 'video/mp4,video/webm,image/avif,image/webp,image/png,image/gif'
          : 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/svg+xml',
        ...(range ? { Range: range.header } : {}),
      },
      cache: 'no-store',
      redirect: 'manual',
      signal,
    })
    if (response.status < 300 || response.status >= 400) return response

    const location = response.headers.get('location')
    await cancelBody(response)
    if (!location || redirectCount === MAX_REDIRECTS) throw new Error('invalid_redirect')

    const redirectedUrl = normalizeOwnedNftMediaSource(new URL(location, nextUrl).toString())
    if (!redirectedUrl) throw new Error('invalid_redirect')
    nextUrl = redirectedUrl
  }

  throw new Error('invalid_redirect')
}

function approvedMediaCandidates(mediaUrl: string) {
  const url = new URL(mediaUrl)
  if (url.hostname.toLowerCase() !== 'ipfs.io' || !url.pathname.startsWith('/ipfs/')) return [mediaUrl]
  return [
    `https://gateway.pinata.cloud${url.pathname}${url.search}`,
    mediaUrl,
  ]
}

async function fetchApprovedMedia(
  mediaUrl: string,
  signal: AbortSignal,
  variant: OwnedNftMediaVariant,
  range: ByteRangeRequest | null,
) {
  for (const candidate of approvedMediaCandidates(mediaUrl)) {
    try {
      const response = await fetchApprovedMediaSource(candidate, signal, variant, range)
      if (response.ok || response.status === 416) return response
      await cancelBody(response)
    } catch {
      if (signal.aborted) throw new Error('media_timeout')
    }
  }
  throw new Error('media_unavailable')
}

async function readBodyWithinLimit(body: ReadableStream<Uint8Array>, maximumBytes: number) {
  const reader = body.getReader()
  const storage = new Uint8Array(maximumBytes)
  let receivedBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return storage.subarray(0, receivedBytes)
      if (value.byteLength > maximumBytes - receivedBytes) {
        await reader.cancel('media_too_large').catch(() => undefined)
        return null
      }
      storage.set(value, receivedBytes)
      receivedBytes += value.byteLength
    }
  } catch (error) {
    await reader.cancel(error).catch(() => undefined)
    throw error
  }
}

function safeMediaHeaders(
  mediaType: string,
  variant: OwnedNftMediaVariant,
  contentLength?: number,
  dimensions?: readonly [number, number],
  additionalHeaders?: HeadersInit,
) {
  return {
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    'Content-Security-Policy': "sandbox; default-src 'none'",
    ...(typeof contentLength === 'number' ? { 'Content-Length': String(contentLength) } : {}),
    'Content-Type': mediaType,
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Museum-Media-Variant': variant,
    'X-Content-Type-Options': 'nosniff',
    ...(dimensions
      ? {
          'X-Image-Height': String(dimensions[1]),
          'X-Image-Width': String(dimensions[0]),
        }
      : {}),
    ...additionalHeaders,
  }
}

function svgLimitError(error: unknown) {
  return error instanceof Error && /pixel limit|image dimensions|too large|exceeds/i.test(error.message)
}

function readMediaVariant(value: string | null): OwnedNftMediaVariant | null {
  return value === 'lod' || value === 'thumb' || value === 'room' || value === 'motion' ? value : null
}

function readSafeInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function readSingleByteRange(value: string | null): { valid: boolean; range: ByteRangeRequest | null } {
  if (value === null) return { valid: true, range: null }
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim())
  if (!match || (!match[1] && !match[2])) return { valid: false, range: null }

  const start = match[1] ? readSafeInteger(match[1]) : null
  const end = match[2] ? readSafeInteger(match[2]) : null
  if ((match[1] && start === null) || (match[2] && end === null)) {
    return { valid: false, range: null }
  }
  if (start !== null && end !== null && start > end) return { valid: false, range: null }
  if (start === null && end === 0) return { valid: false, range: null }

  return {
    valid: true,
    range: {
      header: `bytes=${match[1]}-${match[2]}`,
      start,
      end: start === null ? null : end,
      suffixLength: start === null ? end : null,
    },
  }
}

function readContentRange(value: string | null): ContentRange | null {
  if (!value) return null
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(value.trim())
  if (!match) return null
  const start = readSafeInteger(match[1])
  const end = readSafeInteger(match[2])
  const total = readSafeInteger(match[3])
  if (start === null || end === null || total === null) return null
  if (start > end || end >= total || total < 1) return null
  return { start, end, total }
}

function contentRangeMatchesRequest(contentRange: ContentRange, requestRange: ByteRangeRequest): boolean {
  if (requestRange.start !== null) {
    return contentRange.start === requestRange.start
      && (requestRange.end === null || contentRange.end <= requestRange.end)
  }

  const suffixLength = requestRange.suffixLength
  return suffixLength !== null
    && contentRange.end === contentRange.total - 1
    && contentRange.end - contentRange.start + 1 <= suffixLength
}

function svgTargetSize(width: number, height: number, longEdge: number): readonly [number, number] {
  if (width >= height) {
    return [longEdge, Math.max(1, Math.round(longEdge * height / width))]
  }
  return [Math.max(1, Math.round(longEdge * width / height)), longEdge]
}

function createByteLimitedStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  release: () => void,
  maximumBytes: number,
) {
  let receivedBytes = 0
  let finished = false

  const finish = () => {
    if (finished) return false
    finished = true
    release()
    return true
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (finished) return
      try {
        const { done, value } = await reader.read()
        if (finished) return
        if (done) {
          finish()
          controller.close()
          return
        }

        receivedBytes += value.byteLength
        if (receivedBytes > maximumBytes) {
          finish()
          await reader.cancel('media_too_large').catch(() => undefined)
          controller.error(new Error('Artwork image exceeded the byte limit.'))
          return
        }
        controller.enqueue(value)
      } catch (error) {
        if (!finish()) return
        controller.error(error)
      }
    },
    async cancel(reason) {
      if (!finish()) return
      await reader.cancel(reason).catch(() => undefined)
    },
  })
}

export async function GET(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return errorResponse('Cross-site artwork requests are not allowed.', 403)
  }

  const requestUrl = new URL(request.url)
  const variant = readMediaVariant(requestUrl.searchParams.get('variant'))
  if (!variant) {
    return errorResponse('Choose a valid artwork image size.', 400)
  }
  if (requestUrl.searchParams.get('v') !== OWNED_NFT_MEDIA_CACHE_VERSION) {
    return errorResponse('That artwork image link is out of date. Please refresh the room.', 400)
  }

  const mediaUrl = normalizeOwnedNftMediaSource(requestUrl.searchParams.get('url'))
  if (!mediaUrl || mediaUrl.length > 8192) {
    return errorResponse('That artwork image is not from an approved media host.', 400)
  }

  const requestedRange = variant === 'motion'
    ? readSingleByteRange(request.headers.get('range'))
    : { valid: true, range: null }
  if (!requestedRange.valid) {
    return errorResponse(
      'Choose one valid video byte range.',
      416,
      { 'Accept-Ranges': 'bytes' },
    )
  }

  const retryAfterSeconds = consumeClientRequest(request)
  if (retryAfterSeconds !== null) {
    return errorResponse(
      'Artwork previews are busy for this visitor. Please try again shortly.',
      429,
      { 'Retry-After': String(retryAfterSeconds) },
    )
  }

  const releaseFetch = await acquireFetchSlot()
  if (!releaseFetch) {
    return errorResponse(
      'The artwork preview service is busy. Please try again shortly.',
      503,
      { 'Retry-After': '2' },
    )
  }

  let upstream: Response
  const upstreamController = new AbortController()
  const upstreamTimeout = setTimeout(
    () => upstreamController.abort('media_headers_timeout'),
    variant === 'motion' ? 20_000 : 12_000,
  )
  try {
    upstream = await fetchApprovedMedia(
      mediaUrl,
      upstreamController.signal,
      variant,
      requestedRange.range,
    )
  } catch {
    releaseFetch()
    return errorResponse('That artwork image could not be reached.', 502)
  } finally {
    clearTimeout(upstreamTimeout)
  }

  if (upstream.status === 416 && requestedRange.range) {
    await cancelBody(upstream)
    releaseFetch()
    return errorResponse(
      'That video byte range is not available.',
      416,
      { 'Accept-Ranges': 'bytes' },
    )
  }

  if (!upstream.ok || !upstream.body) {
    await cancelBody(upstream)
    releaseFetch()
    return errorResponse('That artwork image is unavailable.', upstream.status === 404 ? 404 : 502)
  }

  const mediaType = upstream.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? ''
  const isMotionImage = ALLOWED_MOTION_IMAGE_TYPES.has(mediaType)
  const isMotionVideo = ALLOWED_MOTION_VIDEO_TYPES.has(mediaType)
  const supportedMedia = variant === 'motion'
    ? isMotionImage || isMotionVideo
    : mediaType === SVG_MEDIA_TYPE || ALLOWED_RASTER_IMAGE_TYPES.has(mediaType)
  if (!supportedMedia) {
    await cancelBody(upstream)
    releaseFetch()
    return errorResponse(
      variant === 'motion'
        ? 'That NFT does not provide a supported animation.'
        : 'That NFT does not provide a supported still image.',
      415,
    )
  }

  if (requestedRange.range && !isMotionVideo) {
    await cancelBody(upstream)
    releaseFetch()
    return errorResponse(
      'Byte ranges are available only for supported NFT video.',
      416,
      { 'Accept-Ranges': 'bytes' },
    )
  }

  const declaredLengthHeader = upstream.headers.get('content-length')
  const declaredLength = declaredLengthHeader === null ? null : Number(declaredLengthHeader)
  const maximumInputBytes = variant === 'motion'
    ? MAX_MOTION_MEDIA_BYTES
    : mediaType === SVG_MEDIA_TYPE
      ? MAX_SVG_INPUT_BYTES
      : MAX_MEDIA_BYTES
  if (declaredLength !== null && Number.isFinite(declaredLength) && declaredLength > maximumInputBytes) {
    await cancelBody(upstream)
    releaseFetch()
    return errorResponse(
      variant === 'motion'
        ? 'That NFT animation is too large for this room.'
        : 'That artwork image is too large for this room.',
      413,
    )
  }

  const contentRange = upstream.status === 206
    ? readContentRange(upstream.headers.get('content-range'))
    : null
  if (contentRange && contentRange.total > MAX_MOTION_MEDIA_BYTES) {
    await cancelBody(upstream)
    releaseFetch()
    return errorResponse('That NFT animation is too large for this room.', 413)
  }
  if (upstream.status === 206) {
    const validPartialVideo = requestedRange.range
      && isMotionVideo
      && contentRange
      && contentRange.total <= MAX_MOTION_MEDIA_BYTES
      && contentRangeMatchesRequest(contentRange, requestedRange.range)
      && (declaredLength === null
        || !Number.isFinite(declaredLength)
        || declaredLength === contentRange.end - contentRange.start + 1)
    if (!validPartialVideo) {
      await cancelBody(upstream)
      releaseFetch()
      return errorResponse('That NFT video returned an invalid byte range.', 502)
    }
  }

  if (mediaType === SVG_MEDIA_TYPE) {
    try {
      const svgBytes = await readBodyWithinLimit(upstream.body, MAX_SVG_INPUT_BYTES)
      if (!svgBytes) return errorResponse('That SVG artwork is too large for this room.', 413)

      const svgBuffer = Buffer.from(svgBytes.buffer, svgBytes.byteOffset, svgBytes.byteLength)
      const metadata = await sharp(svgBuffer, {
        failOn: 'error',
        limitInputPixels: MAX_SVG_LOGICAL_PIXELS,
        sequentialRead: true,
      }).metadata()
      const width = metadata.width ?? 0
      const height = metadata.height ?? 0
      if (
        !Number.isSafeInteger(width)
        || !Number.isSafeInteger(height)
        || width < 1
        || height < 1
        || width > MAX_SVG_LOGICAL_DIMENSION
        || height > MAX_SVG_LOGICAL_DIMENSION
        || width * height > MAX_SVG_LOGICAL_PIXELS
      ) {
        return errorResponse('That SVG artwork has dimensions too large for this room.', 413)
      }

      const targetSize = svgTargetSize(width, height, MEDIA_VARIANTS[variant].longEdge)
      const baseDensity = metadata.density && Number.isFinite(metadata.density)
        ? metadata.density
        : 72
      const scale = MEDIA_VARIANTS[variant].longEdge / Math.max(width, height)
      const renderDensity = Math.min(
        MAX_SVG_DENSITY,
        Math.max(MIN_SVG_DENSITY, Math.ceil(baseDensity * scale)),
      )

      const { data: png, info } = await sharp(svgBuffer, {
        density: renderDensity,
        failOn: 'error',
        limitInputPixels: MAX_SVG_RENDER_PIXELS,
        sequentialRead: true,
      })
        .resize({
          width: targetSize[0],
          height: targetSize[1],
          fit: 'fill',
          kernel: 'lanczos3',
        })
        .png({ adaptiveFiltering: true, compressionLevel: 9, effort: 8 })
        .toBuffer({ resolveWithObject: true })
      if (
        info.width !== targetSize[0]
        || info.height !== targetSize[1]
        || info.width * info.height > MEDIA_VARIANTS[variant].longEdge ** 2
      ) {
        return errorResponse('That rasterized artwork has invalid dimensions.', 413)
      }
      if (png.byteLength > MAX_MEDIA_BYTES) {
        return errorResponse('That rasterized artwork is too large for this room.', 413)
      }
      const pngBody = Uint8Array.from(png)

      return new Response(pngBody, {
        status: 200,
        headers: safeMediaHeaders('image/png', variant, png.byteLength, targetSize),
      })
    } catch (error) {
      return errorResponse(
        svgLimitError(error)
          ? 'That SVG artwork has dimensions too large for this room.'
          : 'That SVG artwork could not be safely prepared for display.',
        svgLimitError(error) ? 413 : 415,
      )
    } finally {
      releaseFetch()
    }
  }

  if (variant === 'lod' && ALLOWED_RASTER_IMAGE_TYPES.has(mediaType)) {
    try {
      const sourceBytes = await readBodyWithinLimit(upstream.body, MAX_MEDIA_BYTES)
      if (!sourceBytes) return errorResponse('That Glowbud image is too large for the garden.', 413)
      const sourceBuffer = Buffer.from(sourceBytes.buffer, sourceBytes.byteOffset, sourceBytes.byteLength)
      const { data: webp, info } = await sharp(sourceBuffer, {
        failOn: 'error',
        limitInputPixels: MAX_SVG_LOGICAL_PIXELS,
        sequentialRead: true,
        animated: false,
      })
        .resize({
          width: MEDIA_VARIANTS.lod.longEdge,
          height: MEDIA_VARIANTS.lod.longEdge,
          fit: 'inside',
          withoutEnlargement: true,
          kernel: 'nearest',
        })
        .webp({ quality: 86, effort: 4, smartSubsample: false })
        .toBuffer({ resolveWithObject: true })
      const body = Uint8Array.from(webp)
      return new Response(body, {
        status: 200,
        headers: safeMediaHeaders('image/webp', variant, webp.byteLength, [info.width, info.height]),
      })
    } catch {
      return errorResponse('That Glowbud image could not be prepared for the garden.', 415)
    } finally {
      releaseFetch()
    }
  }

  if (variant === 'motion' && isMotionImage && (mediaType === 'image/gif' || mediaType === 'image/webp')) {
    try {
      const motionBytes = await readBodyWithinLimit(upstream.body, MAX_MOTION_MEDIA_BYTES)
      if (!motionBytes) return errorResponse('That NFT animation is too large for this room.', 413)
      const loopingBytes = forceMotionImageContinuousLoop(motionBytes, mediaType)
      const loopingBody = Uint8Array.from(loopingBytes)
      return new Response(loopingBody, {
        status: 200,
        headers: safeMediaHeaders(mediaType, variant, loopingBytes.byteLength),
      })
    } catch {
      return errorResponse('That NFT animation could not be prepared for display.', 415)
    } finally {
      releaseFetch()
    }
  }

  const responseMaximumBytes = contentRange
    ? contentRange.end - contentRange.start + 1
    : maximumInputBytes
  const body = createByteLimitedStream(upstream.body.getReader(), releaseFetch, responseMaximumBytes)

  let partialHeaders: Record<string, string> | undefined
  if (contentRange) {
    partialHeaders = {
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${contentRange.start}-${contentRange.end}/${contentRange.total}`,
    }
  } else if (isMotionVideo) {
    partialHeaders = { 'Accept-Ranges': 'bytes' }
  }
  const safeDeclaredLength = declaredLength !== null
    && Number.isSafeInteger(declaredLength)
    && declaredLength >= 0
    ? declaredLength
    : undefined

  return new Response(body, {
    status: contentRange ? 206 : 200,
    headers: safeMediaHeaders(
      mediaType,
      variant,
      contentRange ? contentRange.end - contentRange.start + 1 : safeDeclaredLength,
      undefined,
      partialHeaders,
    ),
  })
}
