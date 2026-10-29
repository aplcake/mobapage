import { chromium } from '@playwright/test'
import { PNG } from 'pngjs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const base = process.env.SLURPER_BASE_URL || 'http://localhost:3005'
const output = path.resolve(process.env.DEABSTRACTOR_AUDIT_DIR || 'docs/validation/deabstractor-pass-03-journey')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', args: ['--disk-cache-size=1048576', '--media-cache-size=1048576', '--disable-gpu-shader-disk-cache'] })
const proof = { frames: [], checks: [], errors: [], existingMuseumWarnings: [], injectedFailureMessages: [] }
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const state = page => page.evaluate(() => window.__DEABSTRACTOR__())
const action = page => page.getByRole('button', { name: 'Evacuate demo passenger' })
const pause = page => page.getByRole('button', { name: 'Pause sequence' })
const skip = page => page.getByRole('button', { name: 'Skip scene' })
const ready = page => action(page).waitFor({ timeout: 30000 })

async function fresh(options = {}, injected = false) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, ...options })
  const page = await context.newPage()
  const errors = injected ? proof.injectedFailureMessages : proof.errors
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() !== 'error') return
    const detail = `${message.text()} (${message.location().url})`
    // The museum root has no favicon.ico; retain this pre-existing navigation warning separately.
    if (!injected && message.location().url === `${base}/favicon.ico` && message.text().includes('404')) proof.existingMuseumWarnings.push(detail)
    else errors.push(detail)
  })
  await page.addInitScript(() => {
    const Original = window.AudioContext
    window.__JOURNEY_AUDIO__ = []
    window.AudioContext = class extends Original {
      constructor(...args) { super(...args); window.__JOURNEY_AUDIO__.push(this) }
    }
  })
  return { context, page }
}

async function frame(page, name, scene = true) {
  await page.screenshot({ path: path.join(output, `${name}.png`) })
  let colors = 0
  if (scene) {
    const png = PNG.sync.read(await page.locator('canvas').screenshot())
    const bins = new Set()
    for (let i = 0; i < png.data.length; i += 64) bins.add(`${png.data[i] >> 4}:${png.data[i + 1] >> 4}:${png.data[i + 2] >> 4}`)
    colors = bins.size
    assert(colors > 90, `Blank canvas: ${name}`)
  }
  assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `Horizontal overflow: ${name}`)
  for (const control of await page.locator('main button, main a').all()) {
    const r = await control.boundingBox(), v = page.viewportSize()
    assert(r && r.width >= 43.9 && r.height >= 43.9 && r.x >= 0 && r.y >= 0 && r.x + r.width <= v.width + 1 && r.y + r.height <= v.height + 1, `Invalid control target: ${name} ${await control.getAttribute('aria-label')} ${JSON.stringify(r)}`)
  }
  proof.frames.push({ name, colors, state: await state(page) })
}

try {
  const desktop = await fresh()
  const p = desktop.page
  await p.goto(`${base}/deabstractor?demo=1`)
  await ready(p)
  await p.waitForTimeout(800)
  proof.renderSample = await p.evaluate(() => new Promise(resolve => {
    const deltas = []
    let last = performance.now()
    const sample = now => {
      deltas.push(now - last); last = now
      if (deltas.length < 90) requestAnimationFrame(sample)
      else {
        deltas.sort((a, b) => a - b)
        resolve({ frames: deltas.length, medianMs: deltas[45], p95Ms: deltas[85], scope: 'Browser RAF pacing on this machine; not physical-phone or GPU frame-time certification' })
      }
    }
    requestAnimationFrame(sample)
  }))
  assert(await p.evaluate(() => window.__JOURNEY_AUDIO__.length) === 0, 'Cold load started audio')
  for (const label of ['Return to museum', 'Mute sound', 'Previous Glowbud', 'Next Glowbud', 'Evacuate demo passenger', 'Check an already-safe bud']) {
    await p.keyboard.press('Tab')
    assert(await p.evaluate(name => document.activeElement?.getAttribute('aria-label') === name, label), `Unexpected keyboard order: ${label}`)
    assert(await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== 'none'), 'Invisible keyboard focus')
  }
  await frame(p, 'keyboard-ready')
  await action(p).focus()
  await p.keyboard.down('Enter')
  await p.waitForTimeout(300)
  await p.keyboard.down('Enter')
  await p.keyboard.up('Enter')
  assert(!(await state(p)).paused, 'Held start key toggled pause after focus handoff')
  assert(await pause(p).evaluate(button => document.activeElement === button), 'Start did not hand focus to pause')
  await p.keyboard.press('Space')
  const frozen = (await state(p)).elapsed
  await p.setViewportSize({ width: 320, height: 568 })
  await p.waitForTimeout(300)
  assert((await state(p)).elapsed === frozen, 'Resize resumed a paused sequence')
  await frame(p, 'paused-resize-small-phone')
  await p.setViewportSize({ width: 844, height: 390 })
  await p.waitForTimeout(300)
  await frame(p, 'paused-resize-landscape')
  await p.emulateMedia({ reducedMotion: 'reduce' })
  await p.waitForTimeout(250)
  assert((await state(p)).reducedMotion && (await state(p)).elapsed === frozen, 'Paused preference change failed')
  await frame(p, 'paused-live-reduced-motion')
  await skip(p).click()
  assert(await p.getByRole('button', { name: 'Replay evacuation' }).evaluate(button => document.activeElement === button), 'Skip lost keyboard focus')
  await p.setViewportSize({ width: 1440, height: 1000 })
  await p.emulateMedia({ reducedMotion: 'no-preference' })
  await p.getByRole('button', { name: 'Next Glowbud' }).click()
  await ready(p)
  await p.getByRole('button', { name: 'Previous Glowbud' }).click()
  await ready(p)
  // Three synchronous selections wrap to the same token. Readiness must not get stuck.
  await p.getByRole('button', { name: 'Next Glowbud' }).evaluate(button => { button.click(); button.click(); button.click() })
  await ready(p)
  assert((await state(p)).token === 968, 'Rapid selection changed the wrong passenger')
  const contextsBefore = await p.evaluate(() => window.__JOURNEY_AUDIO__.length)
  await action(p).evaluate(button => { button.click(); button.click(); button.click() })
  assert(await p.evaluate(n => window.__JOURNEY_AUDIO__.length <= n + 1 && window.__JOURNEY_AUDIO__.filter(context => context.state !== 'closed').length === 1, contextsBefore), 'Rapid start created multiple active audio players')
  await skip(p).click()
  proof.checks.push('Keyboard order/focus; held key; pause/resize/preference; rapid selection and start; skip/replay focus')
  await desktop.context.close()

  // Six natural full runs, each starting with clean storage/cache and real input.
  for (const token of [968, 1677, 2000]) {
    for (const procedure of ['evacuation', 'inspection']) {
      const touch = procedure === 'inspection'
      const visit = await fresh(touch ? { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true } : {})
      const page = visit.page
      await page.goto(`${base}/deabstractor?demo=1`)
      await ready(page)
      for (let i = 0; i < [968, 1677, 2000].indexOf(token); i++) {
        const next = page.getByRole('button', { name: 'Next Glowbud' })
        await (touch ? next.tap() : next.click()); await ready(page)
      }
      assert((await state(page)).token === token, 'Wrong passenger selected')
      await page.getByRole('img', { name: `Original pixel artwork for Glowbud ${token}` }).waitFor()
      const start = procedure === 'inspection' ? page.getByRole('button', { name: 'Check an already-safe bud' }) : action(page)
      if (touch) await start.tap()
      else { await start.focus(); await page.keyboard.press('Enter') }
      await page.waitForFunction(() => window.__DEABSTRACTOR__().beat === 'complete', null, { timeout: 90000 })
      const end = await state(page)
      assert(end.token === token && end.procedure === procedure && end.artwork === 'safe' && !end.running, `Failed run: ${token} ${procedure}`)
      await page.waitForTimeout(400)
      await frame(page, `${token}-${procedure}-complete`)
      await page.getByRole('button', { name: 'Replay evacuation' }).click()
      await page.waitForFunction(() => window.__DEABSTRACTOR__().elapsed > 0.4)
      assert((await state(page)).artwork === 'not-safe', 'Replay inherited safe state')
      await skip(page).click()
      await page.getByRole('link', { name: 'Return to museum' }).click()
      await page.waitForURL(`${base}/`)
      await page.waitForFunction(() => !window.__DEABSTRACTOR__)
      assert(await page.evaluate(() => window.__JOURNEY_AUDIO__.every(context => context.state === 'closed')), 'Navigation leaked audio')
      await page.goBack(); await ready(page)
      assert((await state(page)).elapsed === 0 && !(await state(page)).running, 'Back navigation inherited stale playback')
      proof.checks.push({ token, procedure, touch, naturalCompletion: true, replay: true, backNavigation: true })
      await visit.context.close()
    }
  }

  const failure = await fresh({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true }, true)
  let broken = true
  await failure.page.route('**/deabstractor/glowbud-968.png*', route => broken
    ? route.fulfill({ status: 200, contentType: 'image/png', body: 'invalid portrait' }) : route.continue())
  await failure.page.goto(`${base}/deabstractor?demo=1`)
  await failure.page.getByRole('button', { name: 'Retry portrait' }).waitFor()
  assert(await failure.page.getByRole('button', { name: 'Check an already-safe bud' }).count() === 0, 'Failed portrait permits checking')
  await frame(failure.page, 'portrait-failure', false)
  broken = false
  await failure.page.getByRole('button', { name: 'Retry portrait' }).tap()
  await ready(failure.page)
  await frame(failure.page, 'portrait-recovered')
  await action(failure.page).tap()
  await failure.page.waitForFunction(() => window.__DEABSTRACTOR__().elapsed > 0.4)
  await failure.page.locator('canvas').evaluate(canvas => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext())
  await failure.page.getByRole('button', { name: 'Reload' }).waitFor()
  assert(!(await state(failure.page)).running, 'Lost WebGL kept procedure running')
  await failure.page.waitForFunction(() => window.__JOURNEY_AUDIO__.every(context => context.state === 'closed'))
  await frame(failure.page, 'context-loss-recovery', false)
  await failure.page.getByRole('button', { name: 'Reload' }).tap()
  await ready(failure.page)
  await frame(failure.page, 'context-restored')
  proof.checks.push('Invalid portrait retry; WEBGL_lose_context stops playback/audio; reload recovers')
  await failure.context.close()

  const slow = await fresh()
  let release
  const gate = new Promise(resolve => { release = resolve })
  await slow.page.route('**/deabstractor/glowbud-968.png*', async route => { await gate; await route.continue() })
  await slow.page.goto(`${base}/deabstractor?demo=1`, { waitUntil: 'domcontentloaded' })
  await slow.page.getByLabel('De-Abstractor loading').waitFor()
  assert(await slow.page.getByLabel('De-Abstractor loading').getAttribute('aria-busy') === 'true', 'Loading state is not announced')
  assert(await slow.page.getByRole('button', { name: 'Evacuate demo passenger' }).count() === 0, 'Start exposed before portrait load')
  await slow.page.getByRole('button', { name: 'Retry portrait' }).waitFor({ timeout: 15000 })
  // Only system fonts are used; the deliberately pending image can hold fonts.ready open.
  process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1'
  await frame(slow.page, 'portrait-timeout', false)
  await slow.page.getByRole('button', { name: 'Next Glowbud' }).click()
  await ready(slow.page)
  release()
  await slow.page.waitForTimeout(400)
  assert((await state(slow.page)).token === 1677, 'Stale image replaced new selection')
  await frame(slow.page, 'late-image-new-passenger')
  proof.checks.push('Delayed load stays disabled and times out to Retry; stale response cannot overwrite new passenger')
  await slow.context.close()
  assert(proof.errors.length === 0, `Unexpected browser errors: ${proof.errors.join('; ')}`)
} catch (error) {
  proof.failure = error.message
  console.error(error)
  throw error
} finally {
  await writeFile(path.join(output, 'journey-proof.json'), JSON.stringify(proof, null, 2))
  await browser.close()
}
console.log(JSON.stringify(proof, null, 2))
