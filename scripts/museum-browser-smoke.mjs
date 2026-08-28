import { chromium, firefox, webkit } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TARGET = process.env.MUSEUM_BROWSER_SMOKE_URL ?? 'http://localhost:3005/'
const OUTPUT_FILE = path.resolve(
  process.env.MUSEUM_BROWSER_SMOKE_OUTPUT
    ?? path.join(ROOT, 'docs', 'validation', 'museum-browser-smoke.json'),
)
const REQUESTED_ENGINES = new Set(
  (process.env.MUSEUM_BROWSER_SMOKE_ENGINES ?? 'chromium,firefox,webkit')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
)

const ENGINES = [
  { name: 'chromium', browserType: chromium },
  { name: 'firefox', browserType: firefox },
  { name: 'webkit', browserType: webkit },
].filter((engine) => REQUESTED_ENGINES.has(engine.name))

const PROFILES = [
  {
    name: 'desktop',
    context: {
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      hasTouch: false,
    },
  },
  {
    name: 'phone',
    context: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 MuseumBrowserSmoke/1.0',
    },
  },
]

function invariant(condition, message) {
  if (!condition) throw new Error(message)
}

function angularDistance(a, b) {
  return Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)))
}

async function assertCameraSettles(page, canvas, label) {
  // WebKit can publish the final pose a few frames after synthetic/protocol
  // input has ended under software-rendered CI load. Let that queued work land,
  // then compare a fresh interval so delayed telemetry is not mistaken for drift.
  await page.waitForTimeout(900)
  const before = Number(await canvas.getAttribute('data-museum-camera-yaw'))
  await page.waitForTimeout(650)
  const after = Number(await canvas.getAttribute('data-museum-camera-yaw'))
  invariant(Number.isFinite(before) && Number.isFinite(after), `${label} camera pose was not published`)
  invariant(
    angularDistance(before, after) < 0.015,
    `${label} camera kept rotating after input ended (${before.toFixed(4)} → ${after.toFixed(4)})`,
  )
}

async function waitForLiveFrames(page, minimumFrames = 3, timeoutMs = 10000) {
  return page.evaluate(async ({ minimumFrames: frameTarget, timeoutMs: timeout }) => {
    const startedAt = performance.now()
    let frames = 0
    await new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(
        () => reject(new Error(`Only ${frames} animation frames arrived within ${timeout}ms`)),
        timeout,
      )
      const sample = () => {
        frames += 1
        if (frames >= frameTarget) {
          window.clearTimeout(timeoutId)
          resolve()
          return
        }
        requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    return { frames, elapsedMs: performance.now() - startedAt }
  }, { minimumFrames, timeoutMs })
}

async function waitForBounds(locator, label, timeoutMs = 15000) {
  await locator.waitFor({ state: 'visible', timeout: timeoutMs })
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const bounds = await locator.boundingBox().catch(() => null)
    if (bounds && bounds.width > 0 && bounds.height > 0) return bounds
    await locator.page().waitForTimeout(100)
  }
  throw new Error(`${label} had no bounds`)
}

async function exerciseMuseum(page, profileName) {
  const room = page.locator('[data-testid="formal-museum-room"]')
  await room.waitFor({ state: 'visible', timeout: 60000 })
  const canvas = page.locator('canvas').first()
  await canvas.waitFor({ state: 'visible', timeout: 60000 })
  await page.waitForFunction(() => {
    const candidate = document.querySelector('canvas')
    if (!candidate) return false
    const bounds = candidate.getBoundingClientRect()
    return bounds.width >= window.innerWidth * 0.8 && bounds.height >= window.innerHeight * 0.8
  }, undefined, { timeout: 60000 })

  const welcome = page.locator('[data-testid="museum-welcome"]')
  const coarseExperience = await page.evaluate(() => (
    window.matchMedia('(hover: none) and (pointer: coarse)').matches || window.innerWidth <= 700
  ))
  if (profileName === 'desktop' && !coarseExperience) {
    await welcome.waitFor({ state: 'visible', timeout: 15000 })
  }
  if (await welcome.isVisible().catch(() => false)) {
    invariant((await welcome.innerText()).includes('Welcome to MoBA'), 'welcome panel copy was missing')
    await page.getByRole('button', { name: /enter museum/i }).click()
    await welcome.waitFor({ state: 'hidden', timeout: 30000 })
  } else {
    invariant(
      profileName === 'phone' || coarseExperience,
      'fine-pointer desktop welcome panel did not open',
    )
    await page.getByText('Swipe anywhere', { exact: true }).waitFor({ state: 'visible', timeout: 15000 })
  }

  const performanceTier = await room.getAttribute('data-performance-tier')
  invariant(['compact', 'balanced', 'showcase'].includes(performanceTier), `invalid performance tier ${performanceTier}`)
  await page.waitForFunction(() => {
    const yaw = Number(document.querySelector('canvas')?.getAttribute('data-museum-camera-yaw'))
    return Number.isFinite(yaw) && Math.abs(yaw) > 1
  }, undefined, { timeout: 30000 })
  if (profileName === 'phone') {
    invariant(performanceTier === 'compact', `phone used ${performanceTier} instead of compact`)
    const joystick = page.getByRole('button', { name: /movement joystick/i })
    await joystick.waitFor({ state: 'visible', timeout: 15000 })
    const cluster = joystick.locator('..')
    const joystickBounds = await waitForBounds(joystick, 'phone joystick')
    await joystick.dispatchEvent('pointerdown', {
      pointerType: 'touch', pointerId: 31, clientX: joystickBounds.x + joystickBounds.width * 0.5, clientY: joystickBounds.y + joystickBounds.height * 0.22,
    })
    await page.waitForFunction(
      (element) => element?.getAttribute('data-active') === 'true',
      await cluster.elementHandle(),
      { timeout: 5000 },
    )
    await joystick.dispatchEvent('pointerup', {
      pointerType: 'touch', pointerId: 31, clientX: joystickBounds.x + joystickBounds.width * 0.5, clientY: joystickBounds.y + joystickBounds.height * 0.22,
    })
    await page.waitForFunction(
      (element) => element?.getAttribute('data-active') === 'false',
      await cluster.elementHandle(),
      { timeout: 5000 },
    )
    await page.locator('button[aria-label="Jump"]:visible').waitFor({ state: 'visible', timeout: 15000 })
    const bounds = await waitForBounds(canvas, 'phone canvas')
    await canvas.dispatchEvent('pointerdown', {
      pointerType: 'touch', pointerId: 41, clientX: bounds.x + bounds.width * 0.55, clientY: bounds.y + bounds.height * 0.5,
    })
    await page.evaluate(({ x, y }) => {
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'touch', pointerId: 41, clientX: x, clientY: y }))
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', pointerId: 41, clientX: x, clientY: y }))
    }, { x: bounds.x + bounds.width * 0.68, y: bounds.y + bounds.height * 0.52 })
    await page.mouse.move(bounds.x + bounds.width * 0.85, bounds.y + bounds.height * 0.5)
    await assertCameraSettles(page, canvas, 'phone')
  } else {
    const bounds = await waitForBounds(canvas, 'desktop canvas')
    await page.mouse.move(bounds.x + bounds.width * 0.15, bounds.y + bounds.height * 0.5)
    await page.waitForTimeout(120)
    await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.5)
    await assertCameraSettles(page, canvas, 'desktop')
  }

  const walletButton = page.getByRole('button', { name: /connect wallet and build your atrium/i })
  await walletButton.click()
  const atriumRegistry = page.getByRole('dialog', { name: /connect wallet|my atrium/i })
  await atriumRegistry.waitFor({ state: 'visible', timeout: 30000 })
  await page.getByRole('button', { name: /close wallet and atrium/i }).click()
  await atriumRegistry.waitFor({ state: 'hidden', timeout: 30000 })

  const liveFrames = await waitForLiveFrames(page)
  return {
    performanceTier,
    liveFrames: {
      frames: liveFrames.frames,
      elapsedMs: Number(liveFrames.elapsedMs.toFixed(1)),
    },
  }
}

async function runCase(engine, browser, profile) {
  const context = await browser.newContext(profile.context)
  const page = await context.newPage()
  const pageErrors = []
  const consoleErrors = []
  const failedRequests = []
  const httpErrors = []

  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    consoleErrors.push({ text: message.text(), url: message.location().url || null })
  })
  page.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? 'unknown' })
  })
  page.on('response', (response) => {
    if (response.status() < 400) return
    httpErrors.push({ url: response.url(), status: response.status() })
  })

  try {
    const navigation = await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 120000 })
    invariant(navigation && navigation.status() < 400, `navigation returned ${navigation?.status() ?? 'no response'}`)
    const interaction = await exerciseMuseum(page, profile.name)
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    invariant(pageErrors.length === 0, `${pageErrors.length} page error(s)`)
    invariant(consoleErrors.length === 0, `${consoleErrors.length} console error(s)`)
    invariant(failedRequests.length === 0, `${failedRequests.length} failed request(s)`)
    invariant(httpErrors.length === 0, `${httpErrors.length} HTTP error response(s)`)
    return {
      engine,
      profile: profile.name,
      pass: true,
      ...interaction,
      diagnostics: { pageErrors, consoleErrors, failedRequests, httpErrors },
    }
  } catch (error) {
    return {
      engine,
      profile: profile.name,
      pass: false,
      error: error instanceof Error ? error.message : String(error),
      diagnostics: { pageErrors, consoleErrors, failedRequests, httpErrors },
    }
  } finally {
    await context.close()
  }
}

async function main() {
  invariant(ENGINES.length > 0, 'No supported browser engines were selected')
  const results = []
  const versions = {}

  for (const engine of ENGINES) {
    let browser
    try {
      browser = await engine.browserType.launch({ headless: true })
    } catch (error) {
      results.push({
        engine: engine.name,
        profile: 'launch',
        pass: false,
        error: error instanceof Error ? error.message : String(error),
        diagnostics: { pageErrors: [], consoleErrors: [], failedRequests: [], httpErrors: [] },
      })
      continue
    }
    versions[engine.name] = browser.version()
    try {
      for (const profile of PROFILES) {
        results.push(await runCase(engine.name, browser, profile))
      }
    } finally {
      await browser.close()
    }
  }

  const payload = {
    pass: results.every((result) => result.pass),
    target: TARGET,
    timestamp: new Date().toISOString(),
    versions,
    results,
  }
  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true })
  await writeFile(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(JSON.stringify(payload, null, 2))
  if (!payload.pass) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
