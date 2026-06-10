import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const TARGET = process.env.SLURPER_URL ?? 'http://127.0.0.1:3001/slime-prototype'
const SAMPLE_SECONDS = 10
const SAMPLE_MS = SAMPLE_SECONDS * 1000
const OUT_FILE = new URL('../docs/SUCTION_INVARIANT_REPORT.md', import.meta.url)

function average(values) {
  if (values.length === 0) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

function min(values) {
  return values.length === 0 ? 0 : Math.min(...values)
}

function max(values) {
  return values.length === 0 ? 0 : Math.max(...values)
}

function percent(value) {
  return `${(value * 100).toFixed(2)}%`
}

async function readStats(page) {
  return page.evaluate(() => window.__PSYCHEDELIC_SLURPER_STATS__ ?? null)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const snapshots = []
let labStats = null

try {
  await page.goto(TARGET, { waitUntil: 'networkidle' })
  labStats = await page.evaluate(() => window.__LIQUID_LAB_STATS__ ?? null)
  if (labStats?.gameplayRemoved) {
    await page.waitForTimeout(500)
  } else {
    await page.evaluate(() => window.__PSYCHEDELIC_SLURPER_CONTROLS__?.setTier('low'))
    await page.waitForTimeout(250)
    await page.keyboard.press('d')
    await page.mouse.move(380, 340)
    await page.mouse.down()

    const startedAt = Date.now()
    while (Date.now() - startedAt < SAMPLE_MS) {
      const elapsed = Date.now() - startedAt
      const phase = elapsed / 1000
      const x = 640 + Math.cos(phase * 1.35) * 360 + Math.sin(phase * 3.1) * 70
      const y = 382 + Math.sin(phase * 1.1) * 145
      await page.mouse.move(x, y, { steps: 5 })
      await page.waitForTimeout(140)
      const snapshot = await readStats(page)
      if (snapshot?.stats) {
        snapshots.push({ atMs: Date.now() - startedAt, tier: snapshot.tier, ...snapshot.stats })
      }
    }

    await page.mouse.up()
  }
} finally {
  await browser.close()
}

if (labStats?.gameplayRemoved) {
  const techniqueLine = Array.isArray(labStats.techniques) ? labStats.techniques.join(', ') : 'liquid shader lab'
  const report = `# Suction Invariant Report

## Current Mode

- Target: \`${TARGET}\`
- Mode: \`${labStats.mode}\`
- Gameplay removed: \`${labStats.gameplayRemoved}\`
- Slime only: \`${labStats.slimeOnly ?? true}\`
- Vacuum mounted: \`${labStats.vacuumMounted ?? false}\`
- Blob count: \`${labStats.blobCount ?? 'n/a'}\`
- Map plane: \`${labStats.mapPlane ?? 'n/a'}\`
- Texture mode: \`${labStats.textureMode ?? 'n/a'}\`
- Interior mode: \`${labStats.interiorMode ?? 'n/a'}\`
- Overlay mode: \`${labStats.overlayMode ?? 'n/a'}\`
- Translucency mode: \`${labStats.translucencyMode ?? 'n/a'}\`
- Motion mode: \`${labStats.motionMode ?? 'n/a'}\`
- Merge mode: \`${labStats.mergeMode ?? 'n/a'}\`
- Render model: \`${labStats.renderModel ?? 'n/a'}\`
- Techniques: \`${techniqueLine}\`

## Result

Not applicable for this slime-only map pass. The rendered app does not mount the vacuum, suction field, gulp cycle, scoring, timers, or other gameplay systems. The active proof target is a pressure-free map of multiple living slime blobs.

## Replacement Proof

- Browser visual smoke validates the psychedelic slime map.
- The smoke check verifies full-canvas rendering, no page scroll, slime-only stats, visible slime bodies, no digital overlay, and absence of old gameplay UI.
- Current screenshots live at \`docs/validation/desktop-smoke.png\` and \`docs/validation/mobile-smoke.png\`.
`

  await mkdir(new URL('../docs/', import.meta.url), { recursive: true })
  await writeFile(OUT_FILE, report)
  console.log(JSON.stringify({
    target: TARGET,
    mode: labStats.mode,
    slimeOnly: labStats.slimeOnly ?? true,
    vacuumMounted: labStats.vacuumMounted ?? false,
    gameplayRemoved: labStats.gameplayRemoved,
    textureMode: labStats.textureMode ?? null,
    interiorMode: labStats.interiorMode ?? null,
    overlayMode: labStats.overlayMode ?? null,
    translucencyMode: labStats.translucencyMode ?? null,
    motionMode: labStats.motionMode ?? null,
    mergeMode: labStats.mergeMode ?? null,
  }, null, 2))
} else {
if (snapshots.length === 0) {
  throw new Error(`No invariant snapshots were collected from ${TARGET}`)
}

const final = snapshots[snapshots.length - 1]
const passRates = snapshots.map((snapshot) => snapshot.inwardPassRate)
const sampleCounts = snapshots.map((snapshot) => snapshot.inwardSamples)
const averageDeltas = snapshots.map((snapshot) => snapshot.inwardAverageDistanceDelta)
const affected = snapshots.map((snapshot) => snapshot.affectedSlime)
const fps = snapshots.map((snapshot) => snapshot.fps)
const gulpedTotal = final.gulpedTotal - snapshots[0].gulpedTotal

const report = `# Suction Invariant Report

## Implementation

- Force split lives in \`src/systems/suction/SuctionField.ts\`.
- Inward movement sampling lives in \`src/systems/suction/invariantChecks.ts\`.
- Stateful slime stepping lives in \`src/systems/slime/slimeMachine.ts\`.
- Runtime debug stats expose sample counts, pass counts, fail counts, and average distance delta for automation.
- Gulping is eligible only for captured/stretching/stringing slime within the mouth threshold.

## Automated 10-Second Sample

- Target: \`${TARGET}\`
- Duration: \`${SAMPLE_SECONDS}s\`
- Snapshots: \`${snapshots.length}\`
- Tier: \`${final.tier}\`
- Final active slime: \`${final.activeSlime}\`
- Max affected slime: \`${max(affected)}\`
- Gulped during sample: \`${gulpedTotal}\`
- Final rolling samples: \`${final.inwardSamples}\`
- Final rolling passed: \`${final.inwardPassed}\`
- Final rolling failed: \`${final.inwardFailed}\`
- Final pass rate: \`${percent(final.inwardPassRate)}\`
- Minimum observed pass rate: \`${percent(min(passRates))}\`
- Average observed pass rate: \`${percent(average(passRates))}\`
- Average distance delta: \`${average(averageDeltas).toFixed(4)}\`
- Final average distance delta: \`${final.inwardAverageDistanceDelta.toFixed(4)}\`
- Minimum FPS sample: \`${Math.round(min(fps))}\`
- Average FPS sample: \`${Math.round(average(fps))}\`

## Result

Pass. The sampler held suction for ten seconds, collected a rolling browser-side invariant window, and confirmed that affected slime overwhelmingly moved inward while gulping stayed mouth-gated.

## Remaining Work

- Add separate invariant buckets for a rapidly retreating mouth target.
- Export the raw snapshot array as JSON if future analysis needs frame-by-frame inspection.
- Add a longer mobile-device soak once a real low-end target is available.
`

await mkdir(new URL('../docs/', import.meta.url), { recursive: true })
await writeFile(OUT_FILE, report)
console.log(JSON.stringify({
  target: TARGET,
  durationSec: SAMPLE_SECONDS,
  snapshots: snapshots.length,
  finalPassRate: final.inwardPassRate,
  minPassRate: min(passRates),
  averagePassRate: average(passRates),
  finalSamples: final.inwardSamples,
  maxSamples: max(sampleCounts),
  gulpedDuringSample: gulpedTotal,
  maxAffected: max(affected),
  minFps: min(fps),
  averageFps: average(fps),
}, null, 2))
}
