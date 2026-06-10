import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const TARGET = process.env.SLURPER_URL ?? 'http://127.0.0.1:3001/slime-prototype'
const OUT_DIR = new URL('../docs/validation/', import.meta.url)
const OUT_FILE = new URL('performance-smoke.json', OUT_DIR)
const VIEWPORT = { width: 1280, height: 720 }
const SAMPLE_MS = Number(process.env.SLURPER_PERF_SAMPLE_MS ?? 5000)

async function waitForStats(page) {
  const started = Date.now()
  while (Date.now() - started < 15000) {
    const ready = await page.evaluate(() => window.__LIQUID_LAB_STATS__?.mode === 'psychedelic-slime-map').catch(() => false)
    if (ready) return
    await page.waitForTimeout(100)
  }
  throw new Error('Timed out waiting for liquid lab stats')
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: VIEWPORT })

try {
  await page.goto(TARGET, { waitUntil: 'domcontentloaded' })
  await waitForStats(page)
  await page.waitForTimeout(800)

  const result = await page.evaluate(async (sampleMs) => {
    const samples = []
    let last = performance.now()
    const end = last + sampleMs
    await new Promise((resolve) => {
      function tick(now) {
        samples.push(now - last)
        last = now
        if (now < end) requestAnimationFrame(tick)
        else resolve()
      }
      requestAnimationFrame(tick)
    })
    const sorted = [...samples].sort((a, b) => a - b)
    const averageFrameMs = samples.reduce((total, value) => total + value, 0) / Math.max(1, samples.length)
    const longFrames = samples.filter((value) => value > 50)
    return {
      sampleMs,
      frames: samples.length,
      averageFrameMs,
      averageFps: 1000 / Math.max(averageFrameMs, 0.001),
      p95FrameMs: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0,
      p99FrameMs: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))] ?? 0,
      maxFrameMs: sorted[sorted.length - 1] ?? 0,
      longFrameCount: longFrames.length,
      longFrameRatio: longFrames.length / Math.max(1, samples.length),
      stats: window.__LIQUID_LAB_STATS__ ?? null,
    }
  }, SAMPLE_MS)

  const stats = result.stats
  const pass = Boolean(
    result.averageFps >= 24 &&
    result.p95FrameMs <= 60 &&
    result.longFrameRatio <= 0.12 &&
    stats?.qualityMode === 'fast-studio-slime' &&
    stats?.performanceMode === 'performance-first-default' &&
    stats?.geometryBudget?.trailEnabled === false,
  )

  const payload = {
    target: TARGET,
    viewport: VIEWPORT,
    pass,
    thresholds: {
      minAverageFps: 24,
      maxP95FrameMs: 60,
      maxLongFrameRatio: 0.12,
    },
    ...result,
    averageFrameMs: Number(result.averageFrameMs.toFixed(2)),
    averageFps: Number(result.averageFps.toFixed(2)),
    p95FrameMs: Number(result.p95FrameMs.toFixed(2)),
    p99FrameMs: Number(result.p99FrameMs.toFixed(2)),
    maxFrameMs: Number(result.maxFrameMs.toFixed(2)),
    longFrameRatio: Number(result.longFrameRatio.toFixed(4)),
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(OUT_FILE, JSON.stringify(payload, null, 2))
  console.log(JSON.stringify(payload, null, 2))

  if (!pass) {
    throw new Error(`Performance smoke failed: ${JSON.stringify({
      averageFps: payload.averageFps,
      p95FrameMs: payload.p95FrameMs,
      longFrameRatio: payload.longFrameRatio,
      qualityMode: stats?.qualityMode,
      performanceMode: stats?.performanceMode,
    })}`)
  }
} finally {
  await browser.close()
}
