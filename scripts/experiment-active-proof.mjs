import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE_URL = process.env.SLURPER_BASE_URL ?? 'http://127.0.0.1:3005'
const ACTIVE_ROUTE = process.env.SLURPER_ACTIVE_ROUTE
  ?? '/experiment-lab?dev=1&mode=full-loop&difficulty=easy&proof=active-experiment-proof'
const EXPECTED_SLIME_MODEL = process.env.SLURPER_EXPECTED_VISIBLE_SLIME_MODEL ?? 'no-fake-residue-small-slime-field-v4'
const OUT_DIR = path.join(ROOT, 'docs', 'validation', 'active-experiment-proof')
const OUT_FILE = path.join(OUT_DIR, 'browser-proof.json')
const SCREENSHOT_FILE = path.join(OUT_DIR, 'active-experiment-proof.png')

function joinUrl(baseUrl, route) {
  return `${baseUrl.replace(/\/$/, '')}${route.startsWith('/') ? route : `/${route}`}`
}

async function waitForExperimentStats(page) {
  const started = Date.now()
  while (Date.now() - started < 15000) {
    const stats = await page.evaluate(() => window.__EXPERIMENT_LAB_STATS__ ?? null).catch(() => null)
    if (stats?.mode === 'experimental-lab') return stats
    await page.waitForTimeout(100)
  }
  throw new Error('Timed out waiting for window.__EXPERIMENT_LAB_STATS__ on the active experiment route')
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
  const consoleErrors = []
  const pageErrors = []

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const url = joinUrl(BASE_URL, ACTIVE_ROUTE)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await waitForExperimentStats(page)
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return false
    const box = canvas.getBoundingClientRect()
    return box.width >= window.innerWidth * 0.95 && box.height >= window.innerHeight * 0.95
  }, { timeout: 10000 })
  await page.waitForTimeout(1500)

  await page.screenshot({ path: SCREENSHOT_FILE, fullPage: false, timeout: 30000 })

  const logs = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const box = canvas?.getBoundingClientRect()
    const stats = window.__EXPERIMENT_LAB_STATS__ ?? null
    return {
      stats,
      canvasCount: document.querySelectorAll('canvas').length,
      canvasBox: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null,
      noScroll: document.documentElement.scrollWidth <= window.innerWidth + 2
        && document.documentElement.scrollHeight <= window.innerHeight + 2,
      switcherCount: document.querySelectorAll('[data-testid="dev-lab-switcher"]').length,
      switcherLinks: Array.from(document.querySelectorAll('[data-lab-link]')).map((node) => node.getAttribute('data-lab-link')),
    }
  })

  await browser.close()

  const pass = Boolean(
    logs.stats?.mode === 'experimental-lab'
      && logs.stats?.allVisibleSlimeVacuumableModel === EXPECTED_SLIME_MODEL
      && logs.canvasCount === 1
      && logs.canvasBox?.width >= 1200
      && logs.canvasBox?.height >= 680
      && logs.noScroll
      && consoleErrors.length === 0
      && pageErrors.length === 0
  )

  const payload = {
    pass,
    url,
    expected: {
      allVisibleSlimeVacuumableModel: EXPECTED_SLIME_MODEL,
    },
    observed: {
      mode: logs.stats?.mode,
      allVisibleSlimeVacuumableModel: logs.stats?.allVisibleSlimeVacuumableModel,
      levelModel: logs.stats?.levelModel,
      visualModel: logs.stats?.visualModel,
      suctionModel: logs.stats?.suctionModel,
      movementModel: logs.stats?.movementModel,
      levelState: logs.stats?.levelState,
      slimeVacuumableVisibleCount: logs.stats?.slimeVacuumableVisibleCount,
      slimeVacuumableTinyCount: logs.stats?.slimeVacuumableTinyCount,
      slimeVacuumableStrandedCount: logs.stats?.slimeVacuumableStrandedCount,
      slimeVisualEffectResidueCount: logs.stats?.slimeVisualEffectResidueCount,
      perf: logs.stats?.perf,
    },
    canvasCount: logs.canvasCount,
    canvasBox: logs.canvasBox,
    noScroll: logs.noScroll,
    switcherCount: logs.switcherCount,
    switcherLinks: logs.switcherLinks,
    consoleErrors,
    pageErrors,
    screenshot: SCREENSHOT_FILE,
    timestamp: new Date().toISOString(),
  }

  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(JSON.stringify(payload, null, 2))

  if (!pass) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
