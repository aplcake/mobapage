import { chromium } from '@playwright/test'
import { PNG } from 'pngjs'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const BASE_URL = process.env.SLURPER_BASE_URL ?? 'http://127.0.0.1:3001'
const OUT_DIR = new URL('../docs/validation/', import.meta.url)
const BACKGROUND = [47, 37, 70]

function colorDistance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
}

function analyzePng(buffer) {
  const png = PNG.sync.read(buffer)
  const seen = new Set()
  let nonBackground = 0
  let opaque = 0
  let vivid = 0
  const stride = Math.max(1, Math.floor((png.width * png.height) / 9000))

  for (let pixel = 0; pixel < png.width * png.height; pixel += stride) {
    const i = pixel * 4
    const color = [png.data[i], png.data[i + 1], png.data[i + 2]]
    const maxChannel = Math.max(...color)
    const minChannel = Math.min(...color)
    if (png.data[i + 3] > 20) opaque += 1
    if (colorDistance(color, BACKGROUND) > 26) nonBackground += 1
    if (maxChannel > 115 && maxChannel - minChannel > 42) vivid += 1
    seen.add(`${color[0] >> 4},${color[1] >> 4},${color[2] >> 4}`)
  }

  return {
    width: png.width,
    height: png.height,
    sampledPixels: Math.ceil((png.width * png.height) / stride),
    nonBackgroundRatio: nonBackground / Math.max(1, opaque),
    vividSignalRatio: vivid / Math.max(1, opaque),
    colorBuckets: seen.size,
  }
}

async function waitForStats(page, getMode, expectedMode, label) {
  const started = Date.now()
  while (Date.now() - started < 15000) {
    const actualMode = await page.evaluate(getMode).catch(() => null)
    if (actualMode) {
      if (actualMode !== expectedMode) throw new Error(`${label} expected ${expectedMode} but received ${actualMode}`)
      return
    }
    await page.waitForTimeout(100)
  }
  throw new Error(`${label} timed out waiting for stats`)
}

async function waitForFullCanvas(page) {
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return false
    const box = canvas.getBoundingClientRect()
    return box.width >= window.innerWidth * 0.95 && box.height >= window.innerHeight * 0.95
  }, { timeout: 8000 })
}

async function capture(page, fileName) {
  const file = fileURLToPath(new URL(fileName, OUT_DIR))
  const buffer = await page.screenshot({ path: file, fullPage: false, timeout: 30000 })
  return { file, analysis: analyzePng(buffer) }
}

function hasAllSwitcherLinks(logs) {
  return ['/vacuum-lab', '/slime-prototype', '/experiment-lab'].every((href) => logs.switcherLinks?.includes(href))
}

async function verifyVacuum(browser, name, viewport) {
  const page = await browser.newPage({ viewport })
  const url = `${BASE_URL}/vacuum-lab`
  const consoleErrors = []
  const pageErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await waitForStats(page, () => window.__VACUUM_LAB_STATS__?.mode ?? null, 'vacuum-suction-lab', `${name} vacuum`)
  await waitForFullCanvas(page)
  await page.waitForTimeout(1300)
  const screenshot = await capture(page, `vacuum-lab-${name}.png`)
  const logs = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const box = canvas?.getBoundingClientRect()
    return {
      stats: window.__VACUUM_LAB_STATS__ ?? null,
      liquidStatsMounted: Boolean(window.__LIQUID_LAB_STATS__),
      canvasCount: document.querySelectorAll('canvas').length,
      canvasBox: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null,
      noScroll: document.documentElement.scrollWidth <= window.innerWidth + 2 && document.documentElement.scrollHeight <= window.innerHeight + 2,
      oldGameplayUi: document.querySelectorAll('.mutePlate,.debugTab,.debugPanel').length,
      digitalOverlayCount: document.querySelectorAll('.liquidLabel,.slimeBuildPlate,.slimeMapPins i,.slimeStageMarks div').length,
      switcherCount: document.querySelectorAll('[data-testid="dev-lab-switcher"]').length,
      switcherLinks: Array.from(document.querySelectorAll('[data-lab-link]')).map((node) => node.getAttribute('data-lab-link')),
    }
  })
  await page.close()

  const pass = Boolean(
    logs.stats?.mode === 'vacuum-suction-lab' &&
    logs.stats?.vacuumOnly === true &&
    logs.stats?.slimePrototypeLocked === true &&
    logs.stats?.gameplayPressure === false &&
    logs.stats?.testMoteCount >= 60 &&
    logs.stats?.techniques?.includes('computeSuctionForce-test-motes') &&
    logs.stats?.techniques?.includes('cartoon-hose-sucker') &&
    logs.stats?.techniques?.includes('out-of-control-hose-wobble') &&
    logs.stats?.suctionModel === 'cartoon-hose-mouth-forward-force-cone-with-recoil-flash' &&
    !logs.liquidStatsMounted &&
    logs.canvasCount === 1 &&
    logs.canvasBox?.width >= viewport.width * 0.95 &&
    logs.canvasBox?.height >= viewport.height * 0.95 &&
    logs.noScroll &&
    logs.oldGameplayUi === 0 &&
    logs.digitalOverlayCount === 0 &&
    logs.switcherCount === 1 &&
    hasAllSwitcherLinks(logs) &&
    screenshot.analysis.nonBackgroundRatio > 0.08 &&
    screenshot.analysis.vividSignalRatio > 0.02 &&
    screenshot.analysis.colorBuckets > 24 &&
    consoleErrors.length === 0 &&
    pageErrors.length === 0
  )

  if (!pass) {
    throw new Error(`${name} vacuum split smoke failed: ${JSON.stringify({ logs, analysis: screenshot.analysis, consoleErrors, pageErrors })}`)
  }

  return {
    name,
    url,
    viewport,
    screenshot: screenshot.file,
    analysis: screenshot.analysis,
    logs,
    consoleErrors,
    pageErrors,
  }
}

async function verifyLockedSlime(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const url = `${BASE_URL}/slime-prototype`
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await waitForStats(page, () => window.__LIQUID_LAB_STATS__?.mode ?? null, 'psychedelic-slime-map', 'locked slime prototype')
  await waitForFullCanvas(page)
  await page.waitForTimeout(1000)
  const screenshot = await capture(page, 'slime-prototype-locked.png')
  const logs = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const box = canvas?.getBoundingClientRect()
    return {
      stats: window.__LIQUID_LAB_STATS__ ?? null,
      vacuumStatsMounted: Boolean(window.__VACUUM_LAB_STATS__),
      canvasCount: document.querySelectorAll('canvas').length,
      canvasBox: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null,
      noScroll: document.documentElement.scrollWidth <= window.innerWidth + 2 && document.documentElement.scrollHeight <= window.innerHeight + 2,
      oldGameplayUi: document.querySelectorAll('.mutePlate,.debugTab,.debugPanel').length,
      digitalOverlayCount: document.querySelectorAll('.liquidLabel,.slimeBuildPlate,.slimeMapPins i,.slimeStageMarks div').length,
      switcherCount: document.querySelectorAll('[data-testid="dev-lab-switcher"]').length,
      switcherLinks: Array.from(document.querySelectorAll('[data-lab-link]')).map((node) => node.getAttribute('data-lab-link')),
    }
  })
  await page.close()

  const pass = Boolean(
    logs.stats?.mode === 'psychedelic-slime-map' &&
    logs.stats?.qualityMode === 'fast-studio-slime' &&
    logs.stats?.performanceMode === 'performance-first-default' &&
    logs.stats?.dpr === 0.65 &&
    logs.stats?.vacuumMounted === false &&
    !logs.vacuumStatsMounted &&
    logs.canvasCount === 1 &&
    logs.noScroll &&
    logs.oldGameplayUi === 0 &&
    logs.digitalOverlayCount === 0 &&
    logs.switcherCount === 1 &&
    hasAllSwitcherLinks(logs) &&
    screenshot.analysis.nonBackgroundRatio > 0.08 &&
    screenshot.analysis.colorBuckets > 24
  )

  if (!pass) {
    throw new Error(`locked slime prototype smoke failed: ${JSON.stringify({ logs, analysis: screenshot.analysis })}`)
  }

  return {
    name: 'locked-slime-prototype',
    url,
    viewport: { width: 1280, height: 720 },
    screenshot: screenshot.file,
    analysis: screenshot.analysis,
    logs,
  }
}

async function verifyExperiment(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const url = `${BASE_URL}/experiment-lab`
  const consoleErrors = []
  const pageErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await waitForStats(page, () => window.__EXPERIMENT_LAB_STATS__?.mode ?? null, 'experimental-lab', 'experimental lab')
  await waitForFullCanvas(page)
  await page.waitForTimeout(1000)
  const screenshot = await capture(page, 'experiment-lab-desktop.png')
  const logs = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const box = canvas?.getBoundingClientRect()
    return {
      stats: window.__EXPERIMENT_LAB_STATS__ ?? null,
      liquidStatsMounted: Boolean(window.__LIQUID_LAB_STATS__),
      vacuumStatsMounted: Boolean(window.__VACUUM_LAB_STATS__),
      canvasCount: document.querySelectorAll('canvas').length,
      canvasBox: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null,
      noScroll: document.documentElement.scrollWidth <= window.innerWidth + 2 && document.documentElement.scrollHeight <= window.innerHeight + 2,
      oldGameplayUi: document.querySelectorAll('.mutePlate,.debugTab,.debugPanel').length,
      digitalOverlayCount: document.querySelectorAll('.liquidLabel,.slimeBuildPlate,.slimeMapPins i,.slimeStageMarks div').length,
      switcherCount: document.querySelectorAll('[data-testid="dev-lab-switcher"]').length,
      switcherLinks: Array.from(document.querySelectorAll('[data-lab-link]')).map((node) => node.getAttribute('data-lab-link')),
    }
  })
  await page.close()

  const pass = Boolean(
    logs.stats?.mode === 'experimental-lab' &&
    logs.stats?.experimentOnly === true &&
    logs.stats?.slimePrototypeLocked === true &&
    logs.stats?.techniques?.includes('third-dev-window') &&
    !logs.liquidStatsMounted &&
    !logs.vacuumStatsMounted &&
    logs.canvasCount === 1 &&
    logs.canvasBox?.width >= 1280 * 0.95 &&
    logs.canvasBox?.height >= 720 * 0.95 &&
    logs.noScroll &&
    logs.oldGameplayUi === 0 &&
    logs.digitalOverlayCount === 0 &&
    logs.switcherCount === 1 &&
    hasAllSwitcherLinks(logs) &&
    screenshot.analysis.nonBackgroundRatio > 0.08 &&
    screenshot.analysis.vividSignalRatio > 0.02 &&
    screenshot.analysis.colorBuckets > 24 &&
    consoleErrors.length === 0 &&
    pageErrors.length === 0
  )

  if (!pass) {
    throw new Error(`experimental lab split smoke failed: ${JSON.stringify({ logs, analysis: screenshot.analysis, consoleErrors, pageErrors })}`)
  }

  return {
    name: 'experimental-lab',
    url,
    viewport: { width: 1280, height: 720 },
    screenshot: screenshot.file,
    analysis: screenshot.analysis,
    logs,
    consoleErrors,
    pageErrors,
  }
}

async function verifySwitcherNavigation(browser) {
  const page = await browser.newPage({ viewport: { width: 900, height: 620 } })
  const visited = []

  async function clickAndVerify(href, expectedMode, statsGetter) {
    await page.click(`[data-lab-link="${href}"]`)
    await page.waitForURL(`**${href}`, { timeout: 8000 })
    await waitForStats(page, statsGetter, expectedMode, `switcher ${href}`)
    visited.push(href)
  }

  await page.goto(`${BASE_URL}/vacuum-lab`, { waitUntil: 'domcontentloaded' })
  await waitForStats(page, () => window.__VACUUM_LAB_STATS__?.mode ?? null, 'vacuum-suction-lab', 'switcher start vacuum')
  await clickAndVerify('/slime-prototype', 'psychedelic-slime-map', () => window.__LIQUID_LAB_STATS__?.mode ?? null)
  await clickAndVerify('/experiment-lab', 'experimental-lab', () => window.__EXPERIMENT_LAB_STATS__?.mode ?? null)
  await clickAndVerify('/vacuum-lab', 'vacuum-suction-lab', () => window.__VACUUM_LAB_STATS__?.mode ?? null)
  const logs = await page.evaluate(() => ({
    pathname: window.location.pathname,
    switcherCount: document.querySelectorAll('[data-testid="dev-lab-switcher"]').length,
    switcherLinks: Array.from(document.querySelectorAll('[data-lab-link]')).map((node) => node.getAttribute('data-lab-link')),
  }))
  await page.close()

  if (logs.pathname !== '/vacuum-lab' || logs.switcherCount !== 1 || !hasAllSwitcherLinks(logs)) {
    throw new Error(`switcher navigation failed: ${JSON.stringify({ visited, logs })}`)
  }

  return {
    name: 'switcher-navigation',
    visited,
    logs,
  }
}

await mkdir(OUT_DIR, { recursive: true })
const browser = await chromium.launch()
const results = []
try {
  results.push(await verifyVacuum(browser, 'desktop', { width: 1280, height: 720 }))
  results.push(await verifyVacuum(browser, 'mobile', { width: 390, height: 844 }))
  results.push(await verifyLockedSlime(browser))
  results.push(await verifyExperiment(browser))
  results.push(await verifySwitcherNavigation(browser))
} finally {
  await browser.close()
}

const payload = { baseUrl: BASE_URL, pass: true, results }
await writeFile(new URL('lab-split-smoke.json', OUT_DIR), JSON.stringify(payload, null, 2))
console.log(JSON.stringify(payload, null, 2))
