import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TARGET = process.env.MUSEUM_PERF_URL ?? 'http://localhost:3005/'
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
const NAVIGATION_TIMEOUT_MS = finiteEnvironmentNumber('MUSEUM_PERF_NAVIGATION_TIMEOUT_MS', 120000, { min: 5000, max: 300000 })
const READY_TIMEOUT_MS = finiteEnvironmentNumber('MUSEUM_PERF_READY_TIMEOUT_MS', 60000, { min: 5000, max: 300000 })
const SAMPLE_TIMEOUT_MS = finiteEnvironmentNumber(
  'MUSEUM_PERF_SAMPLE_TIMEOUT_MS',
  Math.max(30000, SAMPLE_MS * 4),
  { min: SAMPLE_MS + 1000, max: 300000 },
)
const THRESHOLDS = {
  minAverageFps: finiteEnvironmentNumber('MUSEUM_PERF_MIN_AVERAGE_FPS', 45, { min: 1, max: 60 }),
  maxP95FrameMs: finiteEnvironmentNumber('MUSEUM_PERF_MAX_P95_FRAME_MS', 40, { min: 16, max: 1000 }),
  maxLongFrameRatio: finiteEnvironmentNumber('MUSEUM_PERF_MAX_LONG_FRAME_RATIO', 0.1, { min: 0, max: 1 }),
  maxSevereLongFrames: finiteEnvironmentNumber('MUSEUM_PERF_MAX_SEVERE_LONG_FRAMES', 2, { min: 0, max: 1000 }),
  maxResourceRequests: finiteEnvironmentNumber('MUSEUM_PERF_MAX_RESOURCE_REQUESTS', 100, { min: 1 }),
  maxKnownPayloadBytes: finiteEnvironmentNumber('MUSEUM_PERF_MAX_KNOWN_PAYLOAD_BYTES', 16 * 1024 * 1024, { min: 1 }),
}

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

async function waitForMuseum(page) {
  await page.locator('[data-testid="formal-museum-room"]').waitFor({ state: 'visible', timeout: READY_TIMEOUT_MS })
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return false
    const bounds = canvas.getBoundingClientRect()
    return bounds.width >= window.innerWidth * 0.8 && bounds.height >= window.innerHeight * 0.8
  }, undefined, { timeout: READY_TIMEOUT_MS })

  const enterButton = page.getByRole('button', { name: /enter museum/i })
  if (await enterButton.isVisible().catch(() => false)) {
    await enterButton.click()
  }
}

async function collectFrameAndResourceMetrics(page, sampleMs) {
  return page.evaluate(async (durationMs) => {
    window.__MUSEUM_PERF_LONG_TASKS__ = []

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

  if (normalized.navigation) {
    for (const key of Object.keys(normalized.navigation)) {
      normalized.navigation[key] = round(normalized.navigation[key])
    }
  }
  normalized.resources.slowest = normalized.resources.slowest.map((entry) => ({ ...entry, duration: round(entry.duration) }))
  normalized.resources.largestKnown = normalized.resources.largestKnown.map((entry) => ({ ...entry, duration: round(entry.duration) }))
  return normalized
}

function assessProfile(metrics, responseSummary, failedRequests, consoleErrors, pageErrors, navigationStatus) {
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
    const navigationResponse = await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
    await waitForMuseum(page)
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(WARMUP_MS)

    const metrics = await withTimeout(
      collectFrameAndResourceMetrics(page, SAMPLE_MS),
      SAMPLE_TIMEOUT_MS,
      `rAF sampling did not finish within ${SAMPLE_TIMEOUT_MS}ms`,
    )
    const responseSummary = summarizeResponses(responses)
    const assessment = assessProfile(
      metrics,
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
    timestamp: new Date().toISOString(),
    browser: `Chromium ${browser.version()}`,
    browserExecutable: BROWSER_EXECUTABLE_PATH ?? 'playwright-bundled',
    sampleMs: SAMPLE_MS,
    warmupMs: WARMUP_MS,
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
