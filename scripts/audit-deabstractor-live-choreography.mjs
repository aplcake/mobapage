import { chromium } from '@playwright/test'
import { PNG } from 'pngjs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const base = process.env.SLURPER_BASE_URL || 'http://localhost:3005'
const out = path.resolve('docs/validation/deabstractor-live-choreography')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const from = `0x${'1'.repeat(40)}`, to = `0x${'2'.repeat(40)}`, hash = `0x${'a'.repeat(64)}`
const proof = { mode: 'simulated-wallets-and-receipts-no-assets-moved', checks: [], screenshots: [], errors: [] }
const assert = (yes, message) => { if (!yes) throw new Error(message) }

async function fixture({ bulk = true, tokens = [968, 1677, 2000], viewport = { width: 1440, height: 900 } } = {}) {
  let confirmed = false
  const context = await browser.newContext({ viewport })
  await context.addInitScript(({ from, hash, bulk }) => {
    window.__calls = []
    const provider = { request: async ({ method, params }) => {
      window.__calls.push({ method, params })
      if (['eth_requestAccounts', 'eth_accounts'].includes(method)) return [from]
      if (method === 'eth_chainId') return '0xab5'
      if (method === 'wallet_switchEthereumChain') return null
      if (method === 'wallet_getCapabilities') return { '0xab5': { atomic: { status: bulk ? 'supported' : 'unsupported' } } }
      if (['wallet_sendCalls', 'eth_sendTransaction'].includes(method)) {
        await new Promise((resolve, reject) => { window.__approve = resolve; window.__reject = () => reject(Object.assign(new Error('User rejected'), { code: 4001 })) })
        return method === 'wallet_sendCalls' ? { id: params[0].id } : hash
      }
      if (method === 'wallet_getCallsStatus') return { status: 200, chainId: '0xab5', atomic: true, receipts: [{ transactionHash: hash }] }
      throw new Error(`Unexpected ${method}`)
    } }
    window.addEventListener('eip6963:requestProvider', () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { info: { uuid: 'test', name: 'Choreography test wallet', rdns: 'test.invalid' }, provider } })))
  }, { from, hash, bulk })
  const page = await context.newPage()
  page.on('pageerror', error => proof.errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') proof.errors.push(message.text()) })
  await page.route('**/api/deabstractor/portrait/*', route => route.fulfill({ path: 'public/deabstractor/glowbud-968.png', contentType: 'image/png' }))
  await page.route('**/api/deabstractor/inventory?*', route => route.fulfill({ json: { tokenIds: tokens, address: from, block: '123' } }))
  await page.route('**/api/deabstractor/check', route => {
    const d = route.request().postDataJSON()
    if (d.action === 'recipient') return route.fulfill({ json: { address: d.to } })
    if (d.action === 'preflight-departure') return route.fulfill({ json: { fromBlock: '123' } })
    if (d.action === 'departure') return route.fulfill({ json: { complete: confirmed, records: d.tokens.map(token => ({ token, hash, from, to, status: confirmed ? 'confirmed' : 'pending', atDestination: confirmed })) } })
    throw new Error(`Unexpected check ${d.action}`)
  })
  await page.goto(`${base}/deabstractor?v=live-journey-audit`)
  await page.getByRole('button', { name: 'Use a browser wallet', exact: true }).click({ timeout: 60000 })
  await page.getByRole('button', { name: 'Choreography test wallet', exact: true }).click()
  await page.getByRole('button', { name: 'Select all', exact: true }).click()
  await page.getByRole('button', { name: `Move ${tokens.length} buds`, exact: true }).click()
  await page.getByRole('textbox', { name: 'Receiving address', exact: true }).fill(to)
  await page.getByRole('button', { name: 'Check address', exact: true }).click()
  await page.getByRole('checkbox').check()
  return { page, context, confirm: () => { confirmed = true }, send: () => page.getByRole('button', { name: `Confirm ${tokens.length} transfers`, exact: true }).click() }
}
async function shot(page, name) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  const pixels = PNG.sync.read(await page.locator('canvas').first().screenshot())
  const colors = new Set()
  for (let i = 0; i < pixels.data.length; i += 80) colors.add(`${pixels.data[i] >> 4}:${pixels.data[i + 1] >> 4}:${pixels.data[i + 2] >> 4}`)
  assert(colors.size > 65, `${name}: blank canvas`)
  assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `${name}: overflow`)
  await page.screenshot({ path: path.join(out, `${name}.png`) })
  proof.screenshots.push({ name, canvasColors: colors.size, state: await page.evaluate(() => window.__DEABSTRACTOR__()) })
}
try {
  const group = await fixture({ tokens: Array.from({ length: 25 }, (_, i) => i + 1) })
  const p = group.page
  await shot(p, 'desktop-boarding-review')
  await group.send()
  await p.waitForFunction(() => window.__DEABSTRACTOR__?.().holding && window.__DEABSTRACTOR__().journey.phase === 'approval', { timeout: 60000 })
  assert(await p.getByRole('button', { name: 'Skip scene' }).count() === 0, 'Unverified departure can skip into success')
  const approval = await p.evaluate(() => window.__DEABSTRACTOR__())
  assert(approval.elapsed === 5.05 && approval.artwork === 'not-safe', 'Approval gate not held')
  await shot(p, 'desktop-wallet-approval')
  await p.evaluate(() => window.__approve())
  await p.waitForFunction(() => window.__DEABSTRACTOR__?.().elapsed === 8.05)
  await p.waitForTimeout(2500)
  const held = await p.evaluate(() => ({ scene: window.__DEABSTRACTOR__(), audio: window.__DEABSTRACTOR_AUDIO__() }))
  assert(held.scene.elapsed === 8.05 && held.scene.artwork === 'not-safe', 'Pending scene escaped its gate')
  assert(held.audio.holding && held.audio.position === null, 'Audio repeatedly seeks instead of holding')
  await shot(p, 'desktop-network-hold')
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await p.setViewportSize(viewport)
    await shot(p, `network-hold-${viewport.width}x${viewport.height}`)
    const controls = await p.getByRole('button', { name: 'Pause sequence', exact: true }).boundingBox()
    const desk = await p.getByRole('complementary', { name: 'Glowbud transfer desk' }).boundingBox()
    assert(controls && desk && (controls.x + controls.width <= desk.x || controls.y + controls.height <= desk.y), 'Playback control hidden by transfer panel')
  }
  await p.setViewportSize({ width: 1440, height: 900 })
  await p.getByRole('button', { name: 'Pause sequence', exact: true }).click()
  const paused = await p.evaluate(() => window.__DEABSTRACTOR__())
  group.confirm()
  await p.waitForFunction(() => window.__DEABSTRACTOR__?.().journey.phase === 'confirmed')
  assert(await p.evaluate(t => window.__DEABSTRACTOR__().elapsed === t, paused.elapsed), 'Receipt forcibly unpaused animation')
  await p.getByRole('button', { name: 'Resume sequence', exact: true }).click()
  await p.waitForFunction(() => window.__DEABSTRACTOR__?.().elapsed > 14.3)
  await shot(p, 'desktop-group-clearance')
  await p.waitForFunction(() => window.__DEABSTRACTOR__?.().beat === 'complete')
  assert(await p.evaluate(() => window.__DEABSTRACTOR__().token) === 1, 'Group confirmation replaced the featured passenger with the last receipt token')
  await shot(p, 'desktop-group-complete')
  assert(await p.locator('[class*="flightManifest"] > strong').evaluate(element => {
    const text = document.createRange(); text.selectNodeContents(element)
    return text.getBoundingClientRect().right <= element.parentElement.getBoundingClientRect().right + 1
  }), 'Arrival count overflows its panel')
  await p.setViewportSize({ width: 390, height: 844 })
  await shot(p, 'phone-group-complete')
  await p.setViewportSize({ width: 1440, height: 900 })
  assert(await p.evaluate(() => window.__calls.filter(call => ['wallet_sendCalls', 'eth_sendTransaction'].includes(call.method)).length) === 1, 'Scene caused another submission')
  await p.getByRole('button', { name: 'Replay evacuation', exact: true }).click()
  await p.waitForTimeout(500)
  assert(await p.evaluate(() => window.__calls.filter(call => ['wallet_sendCalls', 'eth_sendTransaction'].includes(call.method)).length) === 1, 'Replay resent assets')
  proof.checks.push('25-passenger group: delayed wallet approval, indefinite network hold, original portrait rack, proof-only print, synchronized hold audio, desktop/phone/small-phone/landscape, pause while receipt arrives, replay without resubmission')
  await group.context.close()

  const serial = await fixture({ bulk: false })
  await serial.send()
  await serial.page.waitForFunction(() => window.__DEABSTRACTOR__?.().journey.phase === 'approval')
  serial.confirm()
  await serial.page.evaluate(() => window.__approve())
  await serial.page.waitForFunction(() => window.__DEABSTRACTOR__?.().journey.phase === 'approval' && window.__DEABSTRACTOR__().journey.arrived.length === 1)
  await serial.page.evaluate(() => window.__reject())
  await serial.page.getByRole('alert').waitFor()
  await serial.page.waitForFunction(() => window.__DEABSTRACTOR__?.().journey.phase === 'partial' && !window.__DEABSTRACTOR__().running)
  assert(await serial.page.getByRole('button', { name: 'Skip scene' }).count() === 0, 'Partial trip can print full clearance')
  assert(await serial.page.evaluate(() => window.__DEABSTRACTOR__().artwork) === 'not-safe', 'Partial trip celebrated all arrivals')
  await shot(serial.page, 'partial-trip-stood-down')
  proof.checks.push('Separate approvals: first arrival saved, second rejected, third not sent, partial result cannot print all-safe')
  await serial.context.close()

  const rejected = await fixture({ viewport: { width: 390, height: 844 } })
  await rejected.page.emulateMedia({ reducedMotion: 'reduce' })
  await rejected.send()
  await rejected.page.waitForFunction(() => window.__DEABSTRACTOR__?.().journey.phase === 'approval')
  await rejected.page.evaluate(() => window.__reject())
  await rejected.page.getByRole('alert').waitFor()
  await rejected.page.waitForFunction(() => window.__DEABSTRACTOR__?.().journey.phase === 'cancelled' && !window.__DEABSTRACTOR__().running)
  await shot(rejected.page, 'phone-cancelled-reduced-motion')
  proof.checks.push('Reduced-motion phone: rejection stands down, accessible error/details, no false clearance')
  await rejected.context.close()
  assert(proof.errors.length === 0, proof.errors.join('\n'))
  console.log(JSON.stringify(proof, null, 2))
} finally {
  await writeFile(path.join(out, 'proof.json'), JSON.stringify(proof, null, 2))
  await browser.close()
}
