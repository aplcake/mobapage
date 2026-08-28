import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TARGET = process.env.MUSEUM_PERF_URL ?? 'http://localhost:3005/'
const BENCHMARK_URL = new URL(TARGET)
BENCHMARK_URL.searchParams.set('capture', '1')
const BENCHMARK_TARGET = BENCHMARK_URL.toString()
const BROWSER_EXECUTABLE_PATH = process.env.MUSEUM_PERF_BROWSER_EXECUTABLE_PATH
const OUTPUT_FILE = path.resolve(
  process.env.MUSEUM_PERF_OUTPUT
    ?? path.join(ROOT, 'docs', 'validation', 'museum-performance-smoke.json'),
)

function finiteEnvironmentNumber(name, fallback, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  const parsed = Number(process.env[name])
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

const SAMPLE_MS = finiteEnvironmentNumber('MUSEUM_PERF_SAMPLE_MS', 5000, { min: 1500, max: 30000 })
const WARMUP_MS = finiteEnvironmentNumber('MUSEUM_PERF_WARMUP_MS', 3000, { min: 500, max: 30000 })
const TRAVERSAL_SEGMENT_MS = finiteEnvironmentNumber('MUSEUM_PERF_TRAVERSAL_SEGMENT_MS', 2200, { min: 1000, max: 10000 })
const TRAVERSAL_SETTLE_MS = finiteEnvironmentNumber('MUSEUM_PERF_TRAVERSAL_SETTLE_MS', 300, { min: 0, max: 5000 })
const NAVIGATION_TIMEOUT_MS = finiteEnvironmentNumber('MUSEUM_PERF_NAVIGATION_TIMEOUT_MS', 120000, { min: 5000, max: 300000 })
const READY_TIMEOUT_MS = finiteEnvironmentNumber('MUSEUM_PERF_READY_TIMEOUT_MS', 60000, { min: 5000, max: 300000 })
const SAMPLE_TIMEOUT_MS = finiteEnvironmentNumber(
  'MUSEUM_PERF_SAMPLE_TIMEOUT_MS',
  Math.max(30000, SAMPLE_MS * 4),
  { min: SAMPLE_MS + 1000, max: 300000 },
)
const THRESHOLDS = {
  minAverageFps: finiteEnvironmentNumber('MUSEUM_PERF_MIN_AVERAGE_FPS', 30, { min: 1, max: 60 }),
  maxP95FrameMs: finiteEnvironmentNumber('MUSEUM_PERF_MAX_P95_FRAME_MS', 100, { min: 16, max: 1000 }),
  maxLongFrameRatio: finiteEnvironmentNumber('MUSEUM_PERF_MAX_LONG_FRAME_RATIO', 0.2, { min: 0, max: 1 }),
  maxSevereLongFrames: finiteEnvironmentNumber('MUSEUM_PERF_MAX_SEVERE_LONG_FRAMES', 6, { min: 0, max: 1000 }),
  maxResourceRequests: finiteEnvironmentNumber('MUSEUM_PERF_MAX_RESOURCE_REQUESTS', 160, { min: 1 }),
  maxKnownPayloadBytes: finiteEnvironmentNumber('MUSEUM_PERF_MAX_KNOWN_PAYLOAD_BYTES', 32 * 1024 * 1024, { min: 1 }),
}

const TRAVERSAL_SEGMENTS = [
  {
    name: 'opening-salon-to-atrium',
    expectedAnnouncement: 'Central Atrium',
    from: { x: 0, z: 5.2, yaw: Math.PI, pitch: -0.04 },
    to: { x: 0, z: 10.4, yaw: Math.PI, pitch: -0.02 },
  },
  {
    name: 'atrium-glowbud-garden',
    expectedAnnouncement: 'Central Atrium',
    from: { x: 0, z: 15.2, yaw: Math.PI, pitch: -0.08 },
    to: { x: 0.15, z: 21.2, yaw: Math.PI - 0.18, pitch: -0.06 },
  },
  {
    name: 'moba-one-portrait-salon',
    expectedAnnouncement: 'Portraits of an Enjoyer',
    from: { x: -12.2, z: 8.5, yaw: Math.PI, pitch: 0.02 },
    to: { x: -12.2, z: 13.2, yaw: Math.PI - 0.12, pitch: 0.03 },
  },
  {
    name: 'moba-two-heart-gallery',
    expectedAnnouncement: 'Curated Hearts',
    from: { x: -12.2, z: 21.4, yaw: Math.PI, pitch: -0.06 },
    to: { x: -12.2, z: 25.5, yaw: Math.PI - 0.14, pitch: -0.03 },
  },
  {
    name: 'photography-north-light-room',
    expectedAnnouncement: 'One Final Album',
    from: { x: 12.2, z: 31, yaw: 0, pitch: 0.08 },
    to: { x: 12.35, z: 27.5, yaw: 0.12, pitch: 0.1 },
  },
  {
    name: 'holiday-potluck-winter-gallery',
    expectedAnnouncement: 'MoBA × Tweaks',
    from: { x: 12.2, z: 17.9, yaw: 0, pitch: 0.02 },
    to: { x: 12.25, z: 11.5, yaw: 0.1, pitch: 0.04 },
  },
]

const PROFILES = [
  {
    name: 'desktop',
    context: {
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
    },
  },
  {
    name: 'phone',
    context: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
    },
  },
]
const REQUESTED_PROFILE = process.env.MUSEUM_PERF_PROFILE
const ACTIVE_PROFILES = REQUESTED_PROFILE
  ? PROFILES.filter((profile) => profile.name === REQUESTED_PROFILE)
  : PROFILES

if (REQUESTED_PROFILE && ACTIVE_PROFILES.length === 0) {
  throw new Error(`Unknown MUSEUM_PERF_PROFILE "${REQUESTED_PROFILE}"`)
}

function round(value, digits = 2) {
  return Number(Number(value ?? 0).toFixed(digits))
}

function summarizeResponses(responses) {
  const byType = {}
  const httpErrors = []
  let knownContentLengthBytes = 0
  let contentLengthKnownCount = 0

  for (const response of responses) {
    if (response.status >= 400) {
      httpErrors.push({
        url: response.url,
        status: response.status,
        resourceType: response.resourceType,
      })
    }
    const bucket = byType[response.resourceType] ?? { count: 0, knownContentLengthBytes: 0 }
    bucket.count += 1
    if (response.contentLength !== null) {
      bucket.knownContentLengthBytes += response.contentLength
      knownContentLengthBytes += response.contentLength
      contentLengthKnownCount += 1
    }
    byType[response.resourceType] = bucket
  }

  return {
    responseCount: responses.length,
    contentLengthKnownCount,
    contentLengthUnknownCount: responses.length - contentLengthKnownCount,
    knownContentLengthBytes,
    httpErrorCount: httpErrors.length,
    httpErrors: httpErrors.slice(0, 20),
    byType,
  }
}

async function waitForMuseum(page, profileName) {
  await page.locator('[data-testid="formal-museum-room"]').waitFor({ state: 'visible', timeout: READY_TIMEOUT_MS })
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return false
    const bounds = canvas.getBoundingClientRect()
    return bounds.width >= window.innerWidth * 0.8 && bounds.height >= window.innerHeight * 0.8
  }, undefined, { timeout: READY_TIMEOUT_MS })

  const welcome = page.locator('[data-testid="museum-welcome"]')
  const enterButton = page.getByRole('button', { name: /enter museum/i })
  if (profileName === 'desktop') {
    await welcome.waitFor({ state: 'visible', timeout: READY_TIMEOUT_MS })
    await enterButton.waitFor({ state: 'visible', timeout: READY_TIMEOUT_MS })
    await enterButton.click()
    await welcome.waitFor({ state: 'hidden', timeout: READY_TIMEOUT_MS })
  } else if (await enterButton.isVisible().catch(() => false)) {
    await enterButton.click()
    await welcome.waitFor({ state: 'hidden', timeout: READY_TIMEOUT_MS })
  }

  await page.waitForFunction(() => (
    window.__museumCaptureReady === true
    && typeof window.__setMuseumCapturePose === 'function'
  ), undefined, { timeout: READY_TIMEOUT_MS })
}

async function collectFrameAndResourceMetrics(page, sampleMs) {
  return page.evaluate(async (durationMs) => {
    window.__MUSEUM_PERF_LONG_TASKS__ = []
    const drawCallsBefore = {
      ...(window.__MUSEUM_PERF_WEBGL_DRAW_STATS__?.calls ?? {}),
    }

    const startedAt = performance.now()
    let previousFrameAt = startedAt
    let endedAt = startedAt
    const frameIntervals = []

    await new Promise((resolve) => {
      let finished = false
      const finish = (finishedAt = performance.now()) => {
        if (finished) return
        finished = true
        endedAt = finishedAt
        resolve()
      }
      const stopTimer = window.setTimeout(() => finish(performance.now()), durationMs)
      const sampleFrame = (now) => {
        if (finished) return
        frameIntervals.push(now - previousFrameAt)
        previousFrameAt = now
        if (now - startedAt < durationMs) requestAnimationFrame(sampleFrame)
        else {
          window.clearTimeout(stopTimer)
          finish(now)
        }
      }
      requestAnimationFrame(sampleFrame)
    })

    const sortedFrames = [...frameIntervals].sort((a, b) => a - b)
    const percentile = (ratio) => {
      if (!sortedFrames.length) return 0
      return sortedFrames[Math.min(sortedFrames.length - 1, Math.max(0, Math.ceil(sortedFrames.length * ratio) - 1))]
    }
    const elapsedMs = Math.max(1, endedAt - startedAt)
    const longFrames = frameIntervals.filter((frameMs) => frameMs > 50)
    const severeLongFrames = frameIntervals.filter((frameMs) => frameMs > 100)
    const drawCallsAfter = window.__MUSEUM_PERF_WEBGL_DRAW_STATS__?.calls ?? {}
    const drawCallMethods = new Set([
      ...Object.keys(drawCallsBefore),
      ...Object.keys(drawCallsAfter),
    ])
    const drawCallsByMethod = Object.fromEntries(
      [...drawCallMethods].map((method) => [
        method,
        Math.max(0, (drawCallsAfter[method] ?? 0) - (drawCallsBefore[method] ?? 0)),
      ]),
    )
    const totalDrawCalls = Object.values(drawCallsByMethod)
      .reduce((total, calls) => total + calls, 0)

    const resourceEntries = performance.getEntriesByType('resource').map((entry) => ({
      name: entry.name,
      initiatorType: entry.initiatorType || 'other',
      duration: entry.duration,
      transferSize: entry.transferSize || 0,
      encodedBodySize: entry.encodedBodySize || 0,
      decodedBodySize: entry.decodedBodySize || 0,
    }))
    const navigationEntry = performance.getEntriesByType('navigation')[0]
    const allNetworkEntries = navigationEntry
      ? [{
          name: navigationEntry.name,
          initiatorType: 'document',
          duration: navigationEntry.duration,
          transferSize: navigationEntry.transferSize || 0,
          encodedBodySize: navigationEntry.encodedBodySize || 0,
          decodedBodySize: navigationEntry.decodedBodySize || 0,
        }, ...resourceEntries]
      : resourceEntries

    const resourcesByType = {}
    let knownTransferBytes = 0
    let zeroSizeCount = 0
    for (const entry of allNetworkEntries) {
      const knownBytes = Math.max(entry.transferSize, entry.encodedBodySize)
      knownTransferBytes += knownBytes
      if (knownBytes === 0) zeroSizeCount += 1
      const bucket = resourcesByType[entry.initiatorType] ?? { count: 0, knownTransferBytes: 0 }
      bucket.count += 1
      bucket.knownTransferBytes += knownBytes
      resourcesByType[entry.initiatorType] = bucket
    }

    const museumRoom = document.querySelector('[data-testid="formal-museum-room"]')
    const canvas = document.querySelector('canvas')
    const canvasBounds = canvas?.getBoundingClientRect()
    let webgl = null
    if (canvas) {
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      if (context) {
        const debugRenderer = context.getExtension('WEBGL_debug_renderer_info')
        webgl = {
          renderer: debugRenderer
            ? context.getParameter(debugRenderer.UNMASKED_RENDERER_WEBGL)
            : context.getParameter(context.RENDERER),
          vendor: debugRenderer
            ? context.getParameter(debugRenderer.UNMASKED_VENDOR_WEBGL)
            : context.getParameter(context.VENDOR),
        }
      }
    }
    const nav = navigationEntry ? {
      domContentLoadedMs: navigationEntry.domContentLoadedEventEnd,
      loadEventMs: navigationEntry.loadEventEnd,
      responseEndMs: navigationEntry.responseEnd,
      durationMs: navigationEntry.duration,
    } : null

    return {
      environment: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        hardwareConcurrency: navigator.hardwareConcurrency ?? null,
        performanceTier: museumRoom?.getAttribute('data-performance-tier') ?? null,
        webgl,
        canvasCount: document.querySelectorAll('canvas').length,
        motionPipelineCount: document.querySelectorAll('[data-museum-motion-artwork]').length,
        playingMotionPipelineCount: document.querySelectorAll('[data-museum-motion-artwork][data-status="playing"]').length,
        canvasBounds: canvasBounds ? {
          x: canvasBounds.x,
          y: canvasBounds.y,
          width: canvasBounds.width,
          height: canvasBounds.height,
        } : null,
      },
      navigation: nav,
      framePacing: {
        sampleMs: elapsedMs,
        frames: frameIntervals.length,
        averageFps: frameIntervals.length * 1000 / elapsedMs,
        averageFrameMs: frameIntervals.reduce((total, frameMs) => total + frameMs, 0) / Math.max(1, frameIntervals.length),
        p50FrameMs: percentile(0.5),
        p95FrameMs: percentile(0.95),
        p99FrameMs: percentile(0.99),
        maxFrameMs: sortedFrames[sortedFrames.length - 1] ?? 0,
        over25msFrameCount: frameIntervals.filter((frameMs) => frameMs > 25).length,
        longFrameCount: longFrames.length,
        longFrameRatio: longFrames.length / Math.max(1, frameIntervals.length),
        severeLongFrameCount: severeLongFrames.length,
        observedLongTasks: window.__MUSEUM_PERF_LONG_TASKS__ ?? [],
      },
      webglDrawCalls: {
        available: (window.__MUSEUM_PERF_WEBGL_DRAW_STATS__?.instrumentedMethods?.length ?? 0) > 0,
        totalCalls: totalDrawCalls,
        callsPerFrame: totalDrawCalls / Math.max(1, frameIntervals.length),
        callsPerSecond: totalDrawCalls * 1000 / elapsedMs,
        byMethod: drawCallsByMethod,
        instrumentedMethods: window.__MUSEUM_PERF_WEBGL_DRAW_STATS__?.instrumentedMethods ?? [],
        instrumentationErrors: window.__MUSEUM_PERF_WEBGL_DRAW_STATS__?.errors ?? [],
      },
      resources: {
        count: allNetworkEntries.length,
        knownTransferBytes,
        zeroSizeCount,
        byType: resourcesByType,
        slowest: [...allNetworkEntries]
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 12),
        largestKnown: [...allNetworkEntries]
          .sort((a, b) => Math.max(b.transferSize, b.encodedBodySize) - Math.max(a.transferSize, a.encodedBodySize))
          .slice(0, 12),
      },
    }
  }, sampleMs)
}

async function collectTraversalSegmentMetrics(page, segment) {
  await page.evaluate((pose) => window.__setMuseumCapturePose(pose), segment.from)
  if (TRAVERSAL_SETTLE_MS > 0) await page.waitForTimeout(TRAVERSAL_SETTLE_MS)

  return page.evaluate(async ({ activeSegment, durationMs }) => {
    const setPose = window.__setMuseumCapturePose
    if (typeof setPose !== 'function') throw new Error('Museum capture pose hook is unavailable')

    const resourceCountBefore = performance.getEntriesByType('resource').length
    const decodeBefore = {
      imageDecodeCalls: window.__MUSEUM_PERF_DECODE_STATS__?.imageDecodeCalls ?? 0,
      imageDecodeResolved: window.__MUSEUM_PERF_DECODE_STATS__?.imageDecodeResolved ?? 0,
      imageDecodeRejected: window.__MUSEUM_PERF_DECODE_STATS__?.imageDecodeRejected ?? 0,
      imageBitmapCalls: window.__MUSEUM_PERF_DECODE_STATS__?.imageBitmapCalls ?? 0,
      imageBitmapResolved: window.__MUSEUM_PERF_DECODE_STATS__?.imageBitmapResolved ?? 0,
      imageBitmapRejected: window.__MUSEUM_PERF_DECODE_STATS__?.imageBitmapRejected ?? 0,
    }
    const drawCallsBefore = {
      ...(window.__MUSEUM_PERF_WEBGL_DRAW_STATS__?.calls ?? {}),
    }
    window.__MUSEUM_PERF_LONG_TASKS__ = []

    setPose(activeSegment.from)
    const startedAt = performance.now()
    let previousFrameAt = startedAt
    let endedAt = startedAt
    const frameIntervals = []

    await new Promise((resolve) => {
      let finished = false
      const finish = (finishedAt = performance.now()) => {
        if (finished) return
        finished = true
        endedAt = finishedAt
        setPose(activeSegment.to)
        resolve()
      }
      const stopTimer = window.setTimeout(() => finish(performance.now()), durationMs)
      const traverse = (now) => {
        if (finished) return
        frameIntervals.push(now - previousFrameAt)
        previousFrameAt = now
        const progress = Math.min(1, Math.max(0, (now - startedAt) / durationMs))
        const eased = progress * progress * (3 - 2 * progress)
        setPose({
          x: activeSegment.from.x + (activeSegment.to.x - activeSegment.from.x) * eased,
          z: activeSegment.from.z + (activeSegment.to.z - activeSegment.from.z) * eased,
          yaw: activeSegment.from.yaw + (activeSegment.to.yaw - activeSegment.from.yaw) * eased,
          pitch: activeSegment.from.pitch + (activeSegment.to.pitch - activeSegment.from.pitch) * eased,
        })
        if (progress < 1) requestAnimationFrame(traverse)
        else {
          window.clearTimeout(stopTimer)
          finish(now)
        }
      }
      requestAnimationFrame(traverse)
    })

    const sortedFrames = [...frameIntervals].sort((a, b) => a - b)
    const percentile = (ratio) => {
      if (!sortedFrames.length) return 0
      return sortedFrames[Math.min(sortedFrames.length - 1, Math.max(0, Math.ceil(sortedFrames.length * ratio) - 1))]
    }
    const elapsedMs = Math.max(1, endedAt - startedAt)
    const newResources = performance.getEntriesByType('resource')
      .slice(resourceCountBefore)
      .map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType || 'other',
        duration: entry.duration,
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        decodedBodySize: entry.decodedBodySize || 0,
      }))
    const resourcesByType = {}
    let knownTransferBytes = 0
    let knownDecodedBytes = 0
    for (const entry of newResources) {
      const knownBytes = Math.max(entry.transferSize, entry.encodedBodySize)
      knownTransferBytes += knownBytes
      knownDecodedBytes += entry.decodedBodySize
      const bucket = resourcesByType[entry.initiatorType] ?? {
        count: 0,
        knownTransferBytes: 0,
        knownDecodedBytes: 0,
      }
      bucket.count += 1
      bucket.knownTransferBytes += knownBytes
      bucket.knownDecodedBytes += entry.decodedBodySize
      resourcesByType[entry.initiatorType] = bucket
    }
    const decodeAfter = window.__MUSEUM_PERF_DECODE_STATS__ ?? decodeBefore
    const drawCallsAfter = window.__MUSEUM_PERF_WEBGL_DRAW_STATS__?.calls ?? {}
    const drawCallMethods = new Set([
      ...Object.keys(drawCallsBefore),
      ...Object.keys(drawCallsAfter),
    ])
    const drawCallsByMethod = Object.fromEntries(
      [...drawCallMethods].map((method) => [
        method,
        Math.max(0, (drawCallsAfter[method] ?? 0) - (drawCallsBefore[method] ?? 0)),
      ]),
    )
    const totalDrawCalls = Object.values(drawCallsByMethod)
      .reduce((total, calls) => total + calls, 0)
    const museumRoom = document.querySelector('[data-testid="formal-museum-room"]')
    const canvas = document.querySelector('canvas')
    const galleryAnnouncement = Array.from(document.querySelectorAll('[aria-live]'))
      .map((node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .find((text) => text.startsWith('Museum walk.')) ?? null

    return {
      name: activeSegment.name,
      expectedAnnouncement: activeSegment.expectedAnnouncement,
      from: activeSegment.from,
      to: activeSegment.to,
      framePacing: {
        sampleMs: elapsedMs,
        frames: frameIntervals.length,
        averageFps: frameIntervals.length * 1000 / elapsedMs,
        averageFrameMs: frameIntervals.reduce((total, frameMs) => total + frameMs, 0) / Math.max(1, frameIntervals.length),
        p50FrameMs: percentile(0.5),
        p95FrameMs: percentile(0.95),
        p99FrameMs: percentile(0.99),
        maxFrameMs: sortedFrames[sortedFrames.length - 1] ?? 0,
        longFrameCount: frameIntervals.filter((frameMs) => frameMs > 50).length,
        longFrameRatio: frameIntervals.filter((frameMs) => frameMs > 50).length / Math.max(1, frameIntervals.length),
        severeLongFrameCount: frameIntervals.filter((frameMs) => frameMs > 100).length,
        observedLongTasks: window.__MUSEUM_PERF_LONG_TASKS__ ?? [],
      },
      resourceChurn: {
        count: newResources.length,
        knownTransferBytes,
        knownDecodedBytes,
        byType: resourcesByType,
        resources: newResources.slice(0, 20),
      },
      decodeChurn: {
        imageDecodeCalls: (decodeAfter.imageDecodeCalls ?? 0) - decodeBefore.imageDecodeCalls,
        imageDecodeResolved: (decodeAfter.imageDecodeResolved ?? 0) - decodeBefore.imageDecodeResolved,
        imageDecodeRejected: (decodeAfter.imageDecodeRejected ?? 0) - decodeBefore.imageDecodeRejected,
        imageBitmapCalls: (decodeAfter.imageBitmapCalls ?? 0) - decodeBefore.imageBitmapCalls,
        imageBitmapResolved: (decodeAfter.imageBitmapResolved ?? 0) - decodeBefore.imageBitmapResolved,
        imageBitmapRejected: (decodeAfter.imageBitmapRejected ?? 0) - decodeBefore.imageBitmapRejected,
      },
      webglDrawCalls: {
        available: (window.__MUSEUM_PERF_WEBGL_DRAW_STATS__?.instrumentedMethods?.length ?? 0) > 0,
        totalCalls: totalDrawCalls,
        callsPerFrame: totalDrawCalls / Math.max(1, frameIntervals.length),
        callsPerSecond: totalDrawCalls * 1000 / elapsedMs,
        byMethod: drawCallsByMethod,
        instrumentedMethods: window.__MUSEUM_PERF_WEBGL_DRAW_STATS__?.instrumentedMethods ?? [],
        instrumentationErrors: window.__MUSEUM_PERF_WEBGL_DRAW_STATS__?.errors ?? [],
      },
      visual: {
        captureReady: window.__museumCaptureReady === true,
        performanceTier: museumRoom?.getAttribute('data-performance-tier') ?? null,
        galleryAnnouncement,
        canvasCount: document.querySelectorAll('canvas').length,
        canvasBuffer: canvas ? { width: canvas.width, height: canvas.height } : null,
        motionPipelineCount: document.querySelectorAll('[data-museum-motion-artwork]').length,
        playingMotionPipelineCount: document.querySelectorAll('[data-museum-motion-artwork][data-status="playing"]').length,
        imageElementCount: document.images.length,
        completeImageElementCount: Array.from(document.images).filter((image) => image.complete).length,
        videoElementCount: document.querySelectorAll('video').length,
        playingVideoElementCount: Array.from(document.querySelectorAll('video')).filter((video) => !video.paused).length,
      },
    }
  }, { activeSegment: segment, durationMs: TRAVERSAL_SEGMENT_MS })
}

async function withTimeout(promise, timeoutMs, message) {
  let timeoutId
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timeoutId)
  }
}

function normalizeMetrics(metrics) {
  const normalized = structuredClone(metrics)
  const framePacing = normalized.framePacing
  framePacing.sampleMs = round(framePacing.sampleMs)
  framePacing.averageFps = round(framePacing.averageFps)
  framePacing.averageFrameMs = round(framePacing.averageFrameMs)
  framePacing.p50FrameMs = round(framePacing.p50FrameMs)
  framePacing.p95FrameMs = round(framePacing.p95FrameMs)
  framePacing.p99FrameMs = round(framePacing.p99FrameMs)
  framePacing.maxFrameMs = round(framePacing.maxFrameMs)
  framePacing.longFrameRatio = round(framePacing.longFrameRatio, 4)
  framePacing.observedLongTasks = framePacing.observedLongTasks.map((entry) => ({
    startTime: round(entry.startTime),
    duration: round(entry.duration),
  }))
  normalized.webglDrawCalls.callsPerFrame = round(normalized.webglDrawCalls.callsPerFrame)
  normalized.webglDrawCalls.callsPerSecond = round(normalized.webglDrawCalls.callsPerSecond)

  if (normalized.navigation) {
    for (const key of Object.keys(normalized.navigation)) {
      normalized.navigation[key] = round(normalized.navigation[key])
    }
  }
  normalized.resources.slowest = normalized.resources.slowest.map((entry) => ({ ...entry, duration: round(entry.duration) }))
  normalized.resources.largestKnown = normalized.resources.largestKnown.map((entry) => ({ ...entry, duration: round(entry.duration) }))
  return normalized
}

function normalizeTraversalSegment(segment) {
  const normalized = structuredClone(segment)
  const framePacing = normalized.framePacing
  framePacing.sampleMs = round(framePacing.sampleMs)
  framePacing.averageFps = round(framePacing.averageFps)
  framePacing.averageFrameMs = round(framePacing.averageFrameMs)
  framePacing.p50FrameMs = round(framePacing.p50FrameMs)
  framePacing.p95FrameMs = round(framePacing.p95FrameMs)
  framePacing.p99FrameMs = round(framePacing.p99FrameMs)
  framePacing.maxFrameMs = round(framePacing.maxFrameMs)
  framePacing.longFrameRatio = round(framePacing.longFrameRatio, 4)
  framePacing.observedLongTasks = framePacing.observedLongTasks.map((entry) => ({
    startTime: round(entry.startTime),
    duration: round(entry.duration),
  }))
  normalized.webglDrawCalls.callsPerFrame = round(normalized.webglDrawCalls.callsPerFrame)
  normalized.webglDrawCalls.callsPerSecond = round(normalized.webglDrawCalls.callsPerSecond)
  normalized.resourceChurn.resources = normalized.resourceChurn.resources.map((entry) => ({
    ...entry,
    duration: round(entry.duration),
  }))
  return normalized
}

function assessTraversalSegment(segment, softwareRenderer) {
  const failures = []
  const framePacing = segment.framePacing
  if (!segment.visual.captureReady) failures.push('capture hook became unavailable')
  if (segment.visual.canvasCount < 1) failures.push('museum canvas disappeared')
  if (segment.webglDrawCalls.available && segment.webglDrawCalls.totalCalls <= 0) {
    failures.push('no WebGL draw calls were recorded; the scene may still be paused')
  }
  if (
    segment.expectedAnnouncement
    && !segment.visual.galleryAnnouncement?.includes(segment.expectedAnnouncement)
  ) {
    failures.push(`expected room announcement containing "${segment.expectedAnnouncement}"`)
  }
  if (!softwareRenderer) {
    if (framePacing.frames < Math.max(12, Math.floor(TRAVERSAL_SEGMENT_MS / 1000) * 10)) failures.push(`only ${framePacing.frames} frames were sampled`)
    if (framePacing.averageFps < THRESHOLDS.minAverageFps) failures.push(`average FPS ${round(framePacing.averageFps)} < ${THRESHOLDS.minAverageFps}`)
    if (framePacing.p95FrameMs > THRESHOLDS.maxP95FrameMs) failures.push(`p95 frame ${round(framePacing.p95FrameMs)}ms > ${THRESHOLDS.maxP95FrameMs}ms`)
    if (framePacing.longFrameRatio > THRESHOLDS.maxLongFrameRatio) failures.push(`long-frame ratio ${round(framePacing.longFrameRatio, 4)} > ${THRESHOLDS.maxLongFrameRatio}`)
    if (framePacing.severeLongFrameCount > THRESHOLDS.maxSevereLongFrames) failures.push(`severe long frames ${framePacing.severeLongFrameCount} > ${THRESHOLDS.maxSevereLongFrames}`)
  }
  return {
    ...normalizeTraversalSegment(segment),
    pass: failures.length === 0,
    failures,
    frameTimingMode: softwareRenderer ? 'advisory-software-renderer' : 'enforced-hardware-renderer',
  }
}

function assessProfile(metrics, traversal, responseSummary, failedRequests, consoleErrors, pageErrors, navigationStatus) {
  const framePacing = metrics.framePacing
  const renderer = metrics.environment.webgl?.renderer ?? ''
  const softwareRenderer = /swiftshader|llvmpipe|software raster/i.test(renderer)
  const resourceRequestCount = Math.max(metrics.resources.count, responseSummary.responseCount)
  const knownPayloadBytes = Math.max(
    metrics.resources.knownTransferBytes,
    responseSummary.knownContentLengthBytes,
  )
  const failures = []

  if (navigationStatus === null || navigationStatus >= 400) failures.push(`navigation returned ${navigationStatus ?? 'no response'}`)
  if (metrics.environment.canvasCount < 1) failures.push('museum canvas was not present')
  if (metrics.webglDrawCalls.available && metrics.webglDrawCalls.totalCalls <= 0) {
    failures.push('no WebGL draw calls were recorded; the scene may still be paused')
  }
  // Playwright's bundled Chromium commonly runs WebGL through SwiftShader.
  // That is useful for functional/resource checks but cannot represent a real
  // device's frame pacing, so only enforce FPS thresholds on hardware renderers.
  if (!softwareRenderer) {
    if (framePacing.frames < Math.max(20, Math.floor(SAMPLE_MS / 1000) * 10)) failures.push(`only ${framePacing.frames} frames were sampled`)
    if (framePacing.averageFps < THRESHOLDS.minAverageFps) failures.push(`average FPS ${round(framePacing.averageFps)} < ${THRESHOLDS.minAverageFps}`)
    if (framePacing.p95FrameMs > THRESHOLDS.maxP95FrameMs) failures.push(`p95 frame ${round(framePacing.p95FrameMs)}ms > ${THRESHOLDS.maxP95FrameMs}ms`)
    if (framePacing.longFrameRatio > THRESHOLDS.maxLongFrameRatio) failures.push(`long-frame ratio ${round(framePacing.longFrameRatio, 4)} > ${THRESHOLDS.maxLongFrameRatio}`)
    if (framePacing.severeLongFrameCount > THRESHOLDS.maxSevereLongFrames) failures.push(`severe long frames ${framePacing.severeLongFrameCount} > ${THRESHOLDS.maxSevereLongFrames}`)
  }
  if (resourceRequestCount > THRESHOLDS.maxResourceRequests) failures.push(`resource requests ${resourceRequestCount} > ${THRESHOLDS.maxResourceRequests}`)
  if (knownPayloadBytes > THRESHOLDS.maxKnownPayloadBytes) failures.push(`known payload bytes ${knownPayloadBytes} > ${THRESHOLDS.maxKnownPayloadBytes}`)
  if (responseSummary.httpErrorCount > 0) failures.push(`${responseSummary.httpErrorCount} HTTP error response(s)`)
  if (failedRequests.length > 0) failures.push(`${failedRequests.length} failed network request(s)`)
  if (consoleErrors.length > 0) failures.push(`${consoleErrors.length} console error(s)`)
  if (pageErrors.length > 0) failures.push(`${pageErrors.length} uncaught page error(s)`)
  for (const segment of traversal) {
    for (const failure of segment.failures) failures.push(`${segment.name}: ${failure}`)
  }

  return {
    pass: failures.length === 0,
    failures,
    frameTimingMode: softwareRenderer ? 'advisory-software-renderer' : 'enforced-hardware-renderer',
    resourceRequestCount,
    knownPayloadBytes,
  }
}

async function benchmarkProfile(browser, profile) {
  const context = await browser.newContext(profile.context)
  const page = await context.newPage()
  const responses = []
  const failedRequests = []
  const consoleErrors = []
  const pageErrors = []

  await page.addInitScript(() => {
    performance.setResourceTimingBufferSize?.(2000)
    window.__MUSEUM_PERF_LONG_TASKS__ = []
    window.__MUSEUM_PERF_WEBGL_DRAW_STATS__ = {
      calls: {
        drawArrays: 0,
        drawElements: 0,
        drawArraysInstanced: 0,
        drawElementsInstanced: 0,
        drawArraysInstancedANGLE: 0,
        drawElementsInstancedANGLE: 0,
      },
      instrumentedMethods: [],
      errors: [],
    }
    const drawStats = window.__MUSEUM_PERF_WEBGL_DRAW_STATS__
    const markInstrumented = (method) => {
      if (!drawStats.instrumentedMethods.includes(method)) {
        drawStats.instrumentedMethods.push(method)
      }
    }
    const recordInstrumentationError = (method, error) => {
      drawStats.errors.push({
        method,
        message: error instanceof Error ? error.message : String(error),
      })
    }
    const instrumentPrototypeMethod = (prototype, prototypeName, methodName, metricName = methodName) => {
      if (!prototype) return
      const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName)
      if (!descriptor || typeof descriptor.value !== 'function') return
      const original = descriptor.value
      try {
        Object.defineProperty(prototype, methodName, {
          ...descriptor,
          value: function () {
            drawStats.calls[metricName] += 1
            return Reflect.apply(original, this, arguments)
          },
        })
        markInstrumented(`${prototypeName}.${methodName}`)
      } catch (error) {
        recordInstrumentationError(`${prototypeName}.${methodName}`, error)
      }
    }
    const instrumentedAngleExtensions = new WeakSet()
    const instrumentAngleExtension = (extension) => {
      if (!extension || instrumentedAngleExtensions.has(extension)) return extension
      instrumentedAngleExtensions.add(extension)
      for (const methodName of ['drawArraysInstancedANGLE', 'drawElementsInstancedANGLE']) {
        const original = extension[methodName]
        if (typeof original !== 'function') continue
        try {
          Object.defineProperty(extension, methodName, {
            configurable: true,
            writable: true,
            value: function () {
              drawStats.calls[methodName] += 1
              return Reflect.apply(original, this, arguments)
            },
          })
          markInstrumented(`ANGLE_instanced_arrays.${methodName}`)
        } catch (error) {
          recordInstrumentationError(`ANGLE_instanced_arrays.${methodName}`, error)
        }
      }
      return extension
    }
    const instrumentGetExtension = (prototype, prototypeName) => {
      if (!prototype) return
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'getExtension')
      if (!descriptor || typeof descriptor.value !== 'function') return
      const original = descriptor.value
      try {
        Object.defineProperty(prototype, 'getExtension', {
          ...descriptor,
          value: function (name, ...args) {
            const extension = Reflect.apply(original, this, [name, ...args])
            return typeof name === 'string' && name.toUpperCase() === 'ANGLE_INSTANCED_ARRAYS'
              ? instrumentAngleExtension(extension)
              : extension
          },
        })
      } catch (error) {
        recordInstrumentationError(`${prototypeName}.getExtension`, error)
      }
    }
    const webglPrototypes = [
      [window.WebGLRenderingContext?.prototype, 'WebGLRenderingContext'],
      [window.WebGL2RenderingContext?.prototype, 'WebGL2RenderingContext'],
    ]
    for (const [prototype, prototypeName] of webglPrototypes) {
      for (const methodName of [
        'drawArrays',
        'drawElements',
        'drawArraysInstanced',
        'drawElementsInstanced',
      ]) {
        instrumentPrototypeMethod(prototype, prototypeName, methodName)
      }
      instrumentGetExtension(prototype, prototypeName)
    }
    window.__MUSEUM_PERF_DECODE_STATS__ = {
      imageDecodeCalls: 0,
      imageDecodeResolved: 0,
      imageDecodeRejected: 0,
      imageBitmapCalls: 0,
      imageBitmapResolved: 0,
      imageBitmapRejected: 0,
    }
    try {
      const originalImageDecode = HTMLImageElement.prototype.decode
      HTMLImageElement.prototype.decode = function (...args) {
        window.__MUSEUM_PERF_DECODE_STATS__.imageDecodeCalls += 1
        return originalImageDecode.apply(this, args).then(
          (value) => {
            window.__MUSEUM_PERF_DECODE_STATS__.imageDecodeResolved += 1
            return value
          },
          (error) => {
            window.__MUSEUM_PERF_DECODE_STATS__.imageDecodeRejected += 1
            throw error
          },
        )
      }
    } catch {
      // Image.decode instrumentation is advisory and may be non-writable.
    }
    try {
      const originalCreateImageBitmap = window.createImageBitmap
      if (typeof originalCreateImageBitmap === 'function') {
        window.createImageBitmap = async function (...args) {
          window.__MUSEUM_PERF_DECODE_STATS__.imageBitmapCalls += 1
          try {
            const bitmap = await originalCreateImageBitmap.apply(this, args)
            window.__MUSEUM_PERF_DECODE_STATS__.imageBitmapResolved += 1
            return bitmap
          } catch (error) {
            window.__MUSEUM_PERF_DECODE_STATS__.imageBitmapRejected += 1
            throw error
          }
        }
      }
    } catch {
      // createImageBitmap instrumentation is advisory.
    }
    try {
      const observer = new PerformanceObserver((list) => {
        window.__MUSEUM_PERF_LONG_TASKS__.push(...list.getEntries().map((entry) => ({
          startTime: entry.startTime,
          duration: entry.duration,
        })))
      })
      observer.observe({ type: 'longtask', buffered: true })
    } catch {
      // Long Task timing is optional; rAF pacing remains the cross-browser signal.
    }
  })

  page.on('response', (response) => {
    const rawLength = Number.parseInt(response.headers()['content-length'] ?? '', 10)
    responses.push({
      url: response.url(),
      status: response.status(),
      resourceType: response.request().resourceType(),
      contentLength: Number.isFinite(rawLength) && rawLength >= 0 ? rawLength : null,
    })
  })
  page.on('requestfailed', (request) => {
    failedRequests.push({
      url: request.url(),
      resourceType: request.resourceType(),
      error: request.failure()?.errorText ?? 'unknown request failure',
    })
  })
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const location = message.location()
      consoleErrors.push({
        text: message.text(),
        url: location.url || null,
        lineNumber: location.lineNumber ?? null,
        columnNumber: location.columnNumber ?? null,
      })
    }
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  try {
    const navigationResponse = await page.goto(BENCHMARK_TARGET, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
    await waitForMuseum(page, profile.name)
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(WARMUP_MS)

    const metrics = await withTimeout(
      collectFrameAndResourceMetrics(page, SAMPLE_MS),
      SAMPLE_TIMEOUT_MS,
      `rAF sampling did not finish within ${SAMPLE_TIMEOUT_MS}ms`,
    )
    const renderer = metrics.environment.webgl?.renderer ?? ''
    const softwareRenderer = /swiftshader|llvmpipe|software raster/i.test(renderer)
    const traversal = []
    for (const segment of TRAVERSAL_SEGMENTS) {
      const segmentMetrics = await withTimeout(
        collectTraversalSegmentMetrics(page, segment),
        Math.max(SAMPLE_TIMEOUT_MS, TRAVERSAL_SEGMENT_MS * 4),
        `${segment.name} traversal did not finish within the sampling timeout`,
      )
      traversal.push(assessTraversalSegment(segmentMetrics, softwareRenderer))
    }
    const responseSummary = summarizeResponses(responses)
    const assessment = assessProfile(
      metrics,
      traversal,
      responseSummary,
      failedRequests,
      consoleErrors,
      pageErrors,
      navigationResponse?.status() ?? null,
    )

    return {
      name: profile.name,
      viewport: profile.context.viewport,
      deviceScaleFactor: profile.context.deviceScaleFactor,
      pass: assessment.pass,
      failures: assessment.failures,
      frameTimingMode: assessment.frameTimingMode,
      metrics: normalizeMetrics(metrics),
      traversal,
      network: {
        ...responseSummary,
        failedRequestCount: failedRequests.length,
        failedRequests: failedRequests.slice(0, 20),
        effectiveResourceRequestCount: assessment.resourceRequestCount,
        effectiveKnownPayloadBytes: assessment.knownPayloadBytes,
      },
      diagnostics: {
        consoleErrors: consoleErrors.slice(0, 20),
        pageErrors,
      },
    }
  } finally {
    await context.close()
  }
}

async function main() {
  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    ...(BROWSER_EXECUTABLE_PATH ? { executablePath: BROWSER_EXECUTABLE_PATH } : {}),
  })
  const results = []

  try {
    for (const profile of ACTIVE_PROFILES) {
      try {
        results.push(await benchmarkProfile(browser, profile))
      } catch (error) {
        results.push({
          name: profile.name,
          viewport: profile.context.viewport,
          deviceScaleFactor: profile.context.deviceScaleFactor,
          pass: false,
          failures: [error instanceof Error ? error.message : String(error)],
        })
      }
    }
  } finally {
    await browser.close()
  }

  const payload = {
    pass: results.every((result) => result.pass),
    target: TARGET,
    benchmarkTarget: BENCHMARK_TARGET,
    timestamp: new Date().toISOString(),
    browser: `Chromium ${browser.version()}`,
    browserExecutable: BROWSER_EXECUTABLE_PATH ?? 'playwright-bundled',
    sampleMs: SAMPLE_MS,
    warmupMs: WARMUP_MS,
    traversalSegmentMs: TRAVERSAL_SEGMENT_MS,
    traversalSettleMs: TRAVERSAL_SETTLE_MS,
    traversalSegments: TRAVERSAL_SEGMENTS.map((segment) => segment.name),
    navigationTimeoutMs: NAVIGATION_TIMEOUT_MS,
    readyTimeoutMs: READY_TIMEOUT_MS,
    sampleTimeoutMs: SAMPLE_TIMEOUT_MS,
    thresholds: THRESHOLDS,
    results,
  }

  await writeFile(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(JSON.stringify(payload, null, 2))
  if (!payload.pass) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
