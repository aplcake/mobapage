import { chromium } from '@playwright/test'
import { PNG } from 'pngjs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const base = process.env.SLURPER_BASE_URL || 'http://localhost:3017'
const out = path.resolve('docs/validation/deabstractor-integration')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const proof = { mode: 'local-integration-no-wallets-no-transactions', checks: [], pageErrors: [], newRoomErrors: [] }
const assert = (ok, message) => { if (!ok) throw new Error(message) }

async function museumMenu(page) {
  await page.getByTestId('formal-museum-room').waitFor({ timeout: 60000 })
  const enter = page.getByRole('button', { name: /enter museum/i })
  if (page.viewportSize().width > 700) await enter.waitFor({ timeout: 30000 })
  if (await enter.isVisible()) await enter.click()
  await page.getByRole('button', { name: 'Open museum menu' }).click()
  await page.getByRole('navigation', { name: 'Museum areas' }).waitFor()
}

async function screenshot(page, name) {
  const canvas = page.locator('canvas').first()
  await canvas.waitFor({ timeout: 60000 })
  await page.waitForTimeout(1600)
  const pixels = PNG.sync.read(await canvas.screenshot())
  const colors = new Set()
  for (let i = 0; i < pixels.data.length; i += 80) colors.add(`${pixels.data[i] >> 4}:${pixels.data[i + 1] >> 4}:${pixels.data[i + 2] >> 4}`)
  assert(colors.size > 50, `${name}: blank canvas`)
  assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `${name}: horizontal overflow`)
  await page.screenshot({ path: path.join(out, `${name}.png`) })
  proof.checks.push({ name, canvasColors: colors.size, url: page.url() })
}

try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, hasTouch: name === 'phone' })
    const page = await context.newPage()
    page.setDefaultTimeout(30000)
    page.on('pageerror', error => proof.pageErrors.push({ page: page.url(), error: error.message }))
    page.on('response', response => {
      if (response.status() >= 400 && new URL(response.url()).pathname.startsWith('/deabstractor/')) proof.newRoomErrors.push({ url: response.url(), status: response.status() })
    })
    await page.goto(base)
    await museumMenu(page)
    const menu = page.getByRole('navigation', { name: 'Museum areas' })
    for (const label of ['Main Museum', 'Courtyard', 'Burn Room', 'How to Move']) assert(await menu.getByRole('button', { name: label }).isVisible(), `${label} missing`)
    const link = menu.getByRole('link', { name: 'De-Abstractor' })
    const beforeStyle = await link.evaluate(element => ({ font: getComputedStyle(element).fontFamily, background: getComputedStyle(element).backgroundColor }))
    await screenshot(page, `${name}-museum-menu`)
    await link.click()
    await page.waitForURL('**/deabstractor')
    await page.getByRole('button', { name: 'Use a browser wallet', exact: true }).waitFor({ timeout: 60000 })
    await screenshot(page, `${name}-live-room`)
    await page.getByRole('link', { name: 'Return to museum', exact: true }).click()
    await page.waitForURL(`${base}/`)
    await museumMenu(page)
    const afterStyle = await page.getByRole('link', { name: 'De-Abstractor' }).evaluate(element => ({ font: getComputedStyle(element).fontFamily, background: getComputedStyle(element).backgroundColor }))
    assert(JSON.stringify(beforeStyle) === JSON.stringify(afterStyle), 'New room styles leaked into the museum')
    await screenshot(page, `${name}-museum-return`)
    for (const route of ['/courtyard', '/burn-room', '/wardrobe', '/formal-room']) {
      const response = await page.goto(base + route)
      assert(response.status() === 200, `${route} failed`)
      await screenshot(page, `${name}-${route.slice(1)}`)
    }
    await context.close()
  }
  assert(!proof.pageErrors.length, JSON.stringify(proof.pageErrors))
  assert(!proof.newRoomErrors.length, JSON.stringify(proof.newRoomErrors))
  console.log(JSON.stringify({ passed: proof.checks.length, pageErrors: proof.pageErrors.length, newRoomErrors: proof.newRoomErrors.length }))
} finally {
  await writeFile(path.join(out, 'proof.json'), JSON.stringify(proof, null, 2))
  await browser.close()
}
