import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PNG } from 'pngjs'

const base = process.env.SLURPER_BASE_URL || 'http://localhost:3017'
const out = path.resolve('docs/validation/deabstractor-door')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const proof = { checks: [], errors: [], passed: false }
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, hasTouch: name === 'phone' })
    const page = await context.newPage()
    page.setDefaultTimeout(60000)
    page.on('pageerror', error => proof.errors.push(error.message))
    await page.goto(`${base}/?capture=1`)
    await page.getByTestId('formal-museum-room').waitFor()
    if (name === 'desktop') await page.getByRole('button', { name: /^enter museum$/i }).click()
    await page.waitForFunction(() => window.__museumCaptureReady, { timeout: 60000 })
    await page.evaluate(() => window.__setMuseumCapturePose({ x: 3.7, z: 5.8, yaw: Math.PI, pitch: -0.08 }))
    await page.waitForTimeout(1500)
    const pixels = PNG.sync.read(await page.locator('canvas').screenshot())
    const colors = new Set()
    for (let i = 0; i < pixels.data.length; i += 80) colors.add(`${pixels.data[i] >> 4}:${pixels.data[i + 1] >> 4}:${pixels.data[i + 2] >> 4}`)
    let colorful = 0, sampled = 0
    for (let i = 0; i < pixels.data.length; i += 80) {
      const rgb = [pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]]
      if (Math.max(...rgb) - Math.min(...rgb) > 20) colorful++
      sampled++
    }
    if (colors.size < 50 || colorful / sampled < 0.1) throw new Error('Entrance canvas is blank or still loading')
    await page.screenshot({ path: path.join(out, `${name}-entrance.png`) })
    await page.mouse.click(viewport.width / 2, viewport.height / 2)
    await page.waitForURL('**/deabstractor')
    await page.getByRole('button', { name: name === 'phone' ? 'Board your buds' : 'Use a browser wallet', exact: true }).waitFor()
    proof.checks.push({ name, colors: colors.size, entered: page.url() })
    console.log(`${name}: physical door entered`)
    await context.close()
  }
  if (proof.errors.length) throw new Error(proof.errors.join('\n'))
  proof.passed = true
  console.log(JSON.stringify(proof))
} catch (error) {
  proof.failure = String(error)
  console.error(error)
  throw error
} finally {
  await writeFile(path.join(out, 'proof.json'), JSON.stringify(proof, null, 2))
  await browser.close()
}
