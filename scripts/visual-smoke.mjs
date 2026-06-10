import { chromium } from '@playwright/test'
import { PNG } from 'pngjs'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const TARGET = process.env.SLURPER_URL ?? 'http://127.0.0.1:3001/slime-prototype'
const EXPECTED_MODE = process.env.SLURPER_EXPECTED_MODE ?? 'psychedelic-slime-map'
const OUT_DIR = new URL('../docs/validation/', import.meta.url)
const BACKGROUND = [8, 8, 11]

function colorDistance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
}

function analyzePng(buffer) {
  const png = PNG.sync.read(buffer)
  const seen = new Set()
  let nonBackground = 0
  let opaque = 0
  let slimeSignal = 0
  let signalSamples = 0
  const stride = Math.max(1, Math.floor((png.width * png.height) / 9000))

  for (let pixel = 0; pixel < png.width * png.height; pixel += stride) {
    const i = pixel * 4
    const x = pixel % png.width
    const y = Math.floor(pixel / png.width)
    const color = [png.data[i], png.data[i + 1], png.data[i + 2]]
    const maxChannel = Math.max(...color)
    const minChannel = Math.min(...color)
    const isHudPlate = x < 430 && y < 88
    if (png.data[i + 3] > 20) opaque += 1
    if (colorDistance(color, BACKGROUND) > 28) nonBackground += 1
    if (!isHudPlate) {
      signalSamples += 1
      if (maxChannel > 105 && maxChannel - minChannel > 54) slimeSignal += 1
    }
    seen.add(`${color[0] >> 4},${color[1] >> 4},${color[2] >> 4}`)
  }

  return {
    width: png.width,
    height: png.height,
    sampledPixels: Math.ceil((png.width * png.height) / stride),
    nonBackgroundRatio: nonBackground / Math.max(1, opaque),
    slimeSignalRatio: slimeSignal / Math.max(1, signalSamples),
    colorBuckets: seen.size,
  }
}

async function waitForLabStats(page, name) {
  const started = Date.now()
  while (Date.now() - started < 15000) {
    const actualMode = await page.evaluate(() => window.__LIQUID_LAB_STATS__?.mode ?? null).catch(() => null)
    if (actualMode) {
      if (actualMode !== EXPECTED_MODE) throw new Error(`${name} expected mode ${EXPECTED_MODE} but received ${actualMode}`)
      return
    }
    await page.waitForTimeout(100)
  }
  throw new Error(`${name} timed out waiting for liquid lab stats`)
}

async function captureScreenshot(page, path) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await page.screenshot({ path, fullPage: false, timeout: 30000 })
    } catch (error) {
      if (attempt === 2) throw error
      await page.waitForTimeout(1200 + attempt * 900)
    }
  }
  throw new Error('unreachable screenshot retry state')
}

async function verifyViewport(browser, name, viewport) {
  const page = await browser.newPage({ viewport })
  page.setDefaultTimeout(15000)
  page.setDefaultNavigationTimeout(15000)
  await page.goto(TARGET, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  await waitForLabStats(page, name)
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return false
    const box = canvas.getBoundingClientRect()
    return box.width >= window.innerWidth * 0.95 && box.height >= window.innerHeight * 0.95
  }, { timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(1400)

  const canvasBoxData = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return null
    const box = canvas.getBoundingClientRect()
    return { x: box.x, y: box.y, width: box.width, height: box.height }
  })
  const canvasCount = canvasBoxData ? 1 : 0
  const canvasBox = canvasBoxData
  const screenshotFile = fileURLToPath(new URL(`${name}-smoke.png`, OUT_DIR))
  const screenshot = await captureScreenshot(page, screenshotFile)
  const analysis = analyzePng(screenshot)
  const logs = await page.evaluate(() => ({
    title: document.title,
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    canvasCount: document.querySelectorAll('canvas').length,
    stats: window.__LIQUID_LAB_STATS__ ?? null,
    liquidLabels: document.querySelectorAll('.liquidLabel').length,
    slimeBuildPlate: document.querySelectorAll('.slimeBuildPlate').length,
    slimeMapPins: document.querySelectorAll('.slimeMapPins i').length,
    digitalOverlayCount: document.querySelectorAll('.liquidLabel,.slimeBuildPlate,.slimeMapPins i,.slimeStageMarks div').length,
    oldGameplayUi: document.querySelectorAll('.mutePlate,.debugTab,.debugPanel').length,
  }))
  await page.close()

  const fullScreenCanvas = Boolean(
    canvasBox
      && canvasBox.width >= viewport.width * 0.95
      && canvasBox.height >= viewport.height * 0.95,
  )
  const nonBlank = analysis.nonBackgroundRatio > 0.08 && analysis.colorBuckets > 18
  const slimeVisible = analysis.slimeSignalRatio > 0.015
  const noScroll = logs.scrollHeight <= logs.innerHeight + 2 && logs.scrollWidth <= logs.innerWidth + 2
  const labReady =
    logs.stats?.mode === EXPECTED_MODE &&
    logs.stats?.slimeOnly === true &&
    logs.stats?.vacuumMounted === false &&
    logs.stats?.gameplayRemoved === true &&
    logs.stats?.blobCount >= 6 &&
    logs.stats?.overlayMode === 'artwork-only-no-digital-overlay' &&
    logs.slimeBuildPlate === 0 &&
    logs.slimeMapPins === 0 &&
    logs.digitalOverlayCount === 0 &&
    logs.oldGameplayUi === 0

  if (!canvasCount || !canvasBox || !fullScreenCanvas || !nonBlank || !slimeVisible || !noScroll || !labReady) {
    throw new Error(`${name} smoke failed: ${JSON.stringify({ canvasCount, canvasBox, fullScreenCanvas, nonBlank, slimeVisible, noScroll, labReady, analysis, logs })}`)
  }

  return {
    name,
    viewport,
    canvasBox,
    screenshot: screenshotFile,
    analysis,
    noScroll,
    labReady,
    stats: logs.stats,
  }
}

await mkdir(OUT_DIR, { recursive: true })
const browser = await chromium.launch()
const results = []
try {
  results.push(await verifyViewport(browser, 'desktop', { width: 1280, height: 720 }))
  results.push(await verifyViewport(browser, 'mobile', { width: 390, height: 844 }))
} finally {
  await browser.close()
}

await writeFile(new URL('visual-smoke-results.json', OUT_DIR), JSON.stringify({ target: TARGET, results }, null, 2))
console.log(JSON.stringify({ target: TARGET, results }, null, 2))
