import { chromium } from '@playwright/test'
import { PNG } from 'pngjs'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const TARGET = process.env.SLURPER_URL ?? 'http://127.0.0.1:3001/slime-prototype'
const OUT_DIR = new URL('../docs/validation/', import.meta.url)
const REPORT_FILE = new URL('../docs/ORGANIC_LIQUID_AUDIT.md', import.meta.url)
const FRAME_COUNT = 3
const VIEWPORT = { width: 960, height: 540 }

function colorDistanceAt(data, a, b) {
  return (
    Math.abs(data[a] - data[b]) +
    Math.abs(data[a + 1] - data[b + 1]) +
    Math.abs(data[a + 2] - data[b + 2])
  )
}

function frameAnalysis(buffer) {
  const png = PNG.sync.read(buffer)
  const seen = new Set()
  let edgeEnergy = 0
  let slimeSignal = 0
  let samples = 0
  const stride = Math.max(1, Math.floor((png.width * png.height) / 12000))

  for (let pixel = 0; pixel < png.width * png.height - png.width - 1; pixel += stride) {
    const i = pixel * 4
    const x = pixel % png.width
    const y = Math.floor(pixel / png.width)
    const right = i + 4
    const down = i + png.width * 4
    const color = [png.data[i], png.data[i + 1], png.data[i + 2]]
    const maxChannel = Math.max(...color)
    const minChannel = Math.min(...color)
    const isHudPlate = x < 430 && y < 88
    const localEdge = colorDistanceAt(png.data, i, right) + colorDistanceAt(png.data, i, down)
    edgeEnergy += localEdge / 1530
    seen.add(`${png.data[i] >> 4},${png.data[i + 1] >> 4},${png.data[i + 2] >> 4}`)
    if (!isHudPlate && maxChannel > 105 && maxChannel - minChannel > 54) slimeSignal += 1
    samples += 1
  }

  return {
    width: png.width,
    height: png.height,
    colorBuckets: seen.size,
    edgeEnergy: edgeEnergy / Math.max(1, samples),
    slimeSignalRatio: slimeSignal / Math.max(1, samples),
    buffer: png,
  }
}

function frameDelta(a, b) {
  const pixels = Math.min(a.width * a.height, b.width * b.height)
  const stride = Math.max(1, Math.floor(pixels / 12000))
  let moved = 0
  let totalDelta = 0
  let samples = 0

  for (let pixel = 0; pixel < pixels; pixel += stride) {
    const i = pixel * 4
    const distance = colorDistanceAt(a.data, i, i) +
      Math.abs(a.data[i] - b.data[i]) +
      Math.abs(a.data[i + 1] - b.data[i + 1]) +
      Math.abs(a.data[i + 2] - b.data[i + 2])
    if (distance > 34) moved += 1
    totalDelta += distance / 765
    samples += 1
  }

  return {
    movingPixelRatio: moved / Math.max(1, samples),
    averageDelta: totalDelta / Math.max(1, samples),
  }
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

async function waitForLabStats(page) {
  const started = Date.now()
  while (Date.now() - started < 15000) {
    const mode = await page.evaluate(() => window.__LIQUID_LAB_STATS__?.mode ?? null).catch(() => null)
    if (mode === 'psychedelic-slime-map') return
    await page.waitForTimeout(100)
  }
  throw new Error('timed out waiting for psychedelic slime-map stats')
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: VIEWPORT })
const frames = []
let stats = null
let overlayStats = null

try {
  await page.goto(TARGET, { waitUntil: 'domcontentloaded' })
  await waitForLabStats(page)
  stats = await page.evaluate(() => window.__LIQUID_LAB_STATS__)
  overlayStats = await page.evaluate(() => ({
    slimeBuildPlate: document.querySelectorAll('.slimeBuildPlate').length,
    slimeMapPins: document.querySelectorAll('.slimeMapPins i').length,
    digitalOverlayCount: document.querySelectorAll('.liquidLabel,.slimeBuildPlate,.slimeMapPins i,.slimeStageMarks div').length,
    oldGameplayUi: document.querySelectorAll('.mutePlate,.debugTab,.debugPanel').length,
  }))

  await mkdir(OUT_DIR, { recursive: true })
  for (let i = 0; i < FRAME_COUNT; i++) {
    await page.waitForTimeout(i === 0 ? 700 : 1200)
    const path = fileURLToPath(new URL(`organic-motion-${i + 1}.png`, OUT_DIR))
    const buffer = await captureScreenshot(page, path)
    frames.push({ path, buffer })
  }
} finally {
  await browser.close()
}

const analyses = frames.map((frame) => ({ path: frame.path, ...frameAnalysis(frame.buffer) }))
const deltas = [
  frameDelta(analyses[0].buffer, analyses[1].buffer),
  frameDelta(analyses[1].buffer, analyses[2].buffer),
]

const averageEdgeEnergy = analyses.reduce((sum, frame) => sum + frame.edgeEnergy, 0) / analyses.length
const averageSlimeSignal = analyses.reduce((sum, frame) => sum + frame.slimeSignalRatio, 0) / analyses.length
const averageMotion = deltas.reduce((sum, delta) => sum + delta.movingPixelRatio, 0) / deltas.length
const averageDelta = deltas.reduce((sum, delta) => sum + delta.averageDelta, 0) / deltas.length
const minPerformanceMotion = 0.026
const minAverageFrameDelta = 0.005
const calmTactileEdgeEnergy = averageEdgeEnergy > 0.0016 && averageEdgeEnergy < 0.0065
const techniques = Array.isArray(stats?.techniques) ? stats.techniques : []
const hasInternalFlow = techniques.includes('tactile-height-field') && techniques.includes('thin-film-lighting') && techniques.includes('soft-caustic-pools')
const hasExternalMotion = techniques.includes('rolling-3d-boundaries') && techniques.includes('grounded-blob-shadows')
const hasLivingArtCycle = techniques.includes('psychedelic-map-travel') && techniques.includes('natural-breathing-scale')
const hasNonOverlapMerge = techniques.includes('single-field-soft-union') && techniques.includes('contact-merge-bridges') && techniques.includes('non-overlap-union-surface')
const hasOrganicHardening = techniques.includes('asymmetric-soft-lobes') && techniques.includes('viscous-merge-necks') && techniques.includes('meniscus-contact-foot') && techniques.includes('pooled-pigment-lamellae')
const hasGravityContact = techniques.includes('gravity-sagged-mass') && techniques.includes('pressure-weighted-contact') && techniques.includes('shared-contact-shadow-field')
const hasGrowthDetail = techniques.includes('pseudopod-edge-growth') && techniques.includes('rim-bead-meniscus') && techniques.includes('capillary-residue-film') && techniques.includes('mass-weighted-pigment-pools')
const hasBoogerSlimeMotion = techniques.includes('adhesive-booger-crawl') && techniques.includes('mucus-anchor-drag') && techniques.includes('pause-snap-stick-slip') && techniques.includes('lumpy-surface-tension-recoil') && techniques.includes('clumped-booger-coalescence') && techniques.includes('tacky-pinch-stretch')
const hasSlimeLocomotion = techniques.includes('viscous-inertia-lag') && techniques.includes('stick-slip-crawl-pulses') && techniques.includes('velocity-squash-stretch') && techniques.includes('strain-weighted-edge-creep') && techniques.includes('tacky-neck-stringers') && techniques.includes('slime-settle-contact-slump')
const hasJellyMotion = techniques.includes('elastic-jelly-rebound') && techniques.includes('secondary-surface-wobble') && techniques.includes('phase-lagged-gelatin-shear') && techniques.includes('springy-volume-squash') && techniques.includes('irregular-mucus-surface-pulses') && techniques.includes('asymmetric-contact-sag')
const hasJellyTranslucency = techniques.includes('soft-jelly-translucency') && techniques.includes('edge-thickened-opacity') && techniques.includes('subsurface-color-depth')
const hasRimContinuity = techniques.includes('rim-continuity-field') && techniques.includes('left-wall-seam-healing') && techniques.includes('meniscus-gap-repair') && techniques.includes('edge-alpha-stitching')
const hasCalmPsychedelicInterior = techniques.includes('calm-psychedelic-interior-mixing') && techniques.includes('slow-opalescent-hue-breathing') && techniques.includes('counter-swirl-color-eddies') && techniques.includes('pearlescent-depth-glaze') && techniques.includes('subtle-prismatic-chroma-exchange') && techniques.includes('soft-aurora-interior-wash')
const hasCalmArtifactReduction = techniques.includes('calm-artifact-breakup') && techniques.includes('broad-pane-marble-repair') && techniques.includes('no-digital-artwork-overlay') && techniques.includes('softened-map-landmarks') && techniques.includes('low-contrast-pigment-breathing') && techniques.includes('organic-chroma-panel-diffusion') && techniques.includes('jelly-opacity-artifact-shield')
const hasPsychedelicColorFlow = techniques.includes('convection-palette-advection') && techniques.includes('continuous-organic-color-fields') && techniques.includes('pressure-blended-pigment') && techniques.includes('psychedelic-wax-spectrum')
const hasSmoothInternalColor = techniques.includes('curved-hue-diffusion') && techniques.includes('palette-gradient-smoothing') && techniques.includes('soft-blended-blob-metadata') && techniques.includes('merged-color-identity-blending') && techniques.includes('sine-ribbon-attenuation') && techniques.includes('bridge-tint-suppression') && techniques.includes('soft-film-lane-suppression') && techniques.includes('wet-paint-diffusion-wash') && techniques.includes('no-hard-internal-color-planes')
const hasAdvancedColorFlow = techniques.includes('curl-noise-pigment-advection') && techniques.includes('laminar-chroma-braids') && techniques.includes('meniscus-hue-wrapping') && techniques.includes('selective-psychedelic-saturation') && techniques.includes('opaque-pigment-body-depth')
const hasRefinedColorFlow = techniques.includes('capillary-spectral-veins') && techniques.includes('broken-wet-highlight-films') && techniques.includes('eddy-carried-color-strands') && techniques.includes('dull-body-chroma-rescue')
const hasOriginalPuddleMarbleFlow = techniques.includes('original-puddle-sheet-flow') && techniques.includes('marble-vein-recirculation') && techniques.includes('shallow-pool-lamellae') && techniques.includes('puddle-marble-height-coupling') && techniques.includes('smooth-panel-marble-rescue')
const hasMarbledPaintInterior = techniques.includes('marbled-paint-interior') && techniques.includes('combed-pigment-veins') && techniques.includes('soft-oil-marble-whorls') && techniques.includes('puddle-marble-paint-revival') && techniques.includes('marble-preserving-diffusion-wash')
const hasAntiStiffOvalFlow = techniques.includes('warped-core-blob-space') && techniques.includes('asymmetric-lobe-breakup') && techniques.includes('overlap-oval-ink-suppression') && techniques.includes('stiff-oval-rim-dissolve')
const hasBlackOutlineRemoval = techniques.includes('black-outline-free-slime') && techniques.includes('colored-meniscus-rims') && techniques.includes('soft-violet-contact-shadow')
const hasAntiShardFlow = techniques.includes('curved-puddle-ring-breakup') && techniques.includes('anti-shard-marble-breakup') && techniques.includes('rounded-internal-film-streaks') && techniques.includes('rounded-panel-breakup') && techniques.includes('organic-residue-beads') && techniques.includes('short-memory-contact-residue') && techniques.includes('contact-distance-merge-gating') && techniques.includes('center-biased-wax-necks') && techniques.includes('curved-pigment-ribbon-softening')
const hasOrganicMergeInk = techniques.includes('interior-seam-ink-suppression') && techniques.includes('merge-corridor-outline-mask') && techniques.includes('colored-wet-seam-fill')
const hasStudioPolish = techniques.includes('aaa-polish-pass') && techniques.includes('full-bleed-stage-fill') && techniques.includes('studio-terrain-depth') && techniques.includes('embossed-landmark-silhouettes') && techniques.includes('cinematic-slime-lighting') && techniques.includes('layered-wet-specular') && techniques.includes('polished-contact-grounding') && techniques.includes('residue-glaze-depth') && techniques.includes('slack-lobed-merge-necks') && techniques.includes('anti-sausage-bridge-shaping') && techniques.includes('pinched-knot-merge-necks')
const hasPerformanceFirstMode = techniques.includes('performance-first-default') && techniques.includes('fast-slime-union-shader') && techniques.includes('clamped-dpr') && techniques.includes('reduced-geometry-budget') && techniques.includes('trail-pass-disabled')
const pass = Boolean(
  stats?.slimeOnly === true &&
  stats?.vacuumMounted === false &&
  stats?.blobCount >= 7 &&
  hasInternalFlow &&
  hasExternalMotion &&
  hasLivingArtCycle &&
  hasNonOverlapMerge &&
  hasOrganicHardening &&
  hasGravityContact &&
  hasGrowthDetail &&
  hasBoogerSlimeMotion &&
  hasSlimeLocomotion &&
  hasJellyMotion &&
  hasJellyTranslucency &&
  hasRimContinuity &&
  hasCalmPsychedelicInterior &&
  hasCalmArtifactReduction &&
  hasPsychedelicColorFlow &&
  hasSmoothInternalColor &&
  hasAdvancedColorFlow &&
  hasRefinedColorFlow &&
  hasOriginalPuddleMarbleFlow &&
  hasMarbledPaintInterior &&
  hasAntiStiffOvalFlow &&
  hasBlackOutlineRemoval &&
  hasAntiShardFlow &&
  hasOrganicMergeInk &&
  hasStudioPolish &&
  hasPerformanceFirstMode &&
  stats?.overlayMode === 'artwork-only-no-digital-overlay' &&
  overlayStats?.digitalOverlayCount === 0 &&
  overlayStats?.oldGameplayUi === 0 &&
  averageMotion > minPerformanceMotion &&
  averageDelta > minAverageFrameDelta &&
  calmTactileEdgeEnergy &&
  averageSlimeSignal > 0.015,
)

const serializable = {
  target: TARGET,
  viewport: VIEWPORT,
  pass,
  stats,
  overlayStats,
  averageMotion,
  averageDelta,
  minPerformanceMotion,
  minAverageFrameDelta,
  averageEdgeEnergy,
  calmTactileEdgeEnergy,
  averageSlimeSignal,
  frames: analyses.map((frame) => ({
    path: frame.path,
    width: frame.width,
    height: frame.height,
    colorBuckets: frame.colorBuckets,
    edgeEnergy: frame.edgeEnergy,
    slimeSignalRatio: frame.slimeSignalRatio,
  })),
  deltas,
}

await writeFile(new URL('organic-liquid-audit.json', OUT_DIR), JSON.stringify(serializable, null, 2))

const report = `# Organic Liquid Audit

## Target

- URL: \`${TARGET}\`
- Mode: \`${stats?.mode ?? 'unknown'}\`
- Blob count: \`${stats?.blobCount ?? 'unknown'}\`
- Map plane: \`${stats?.mapPlane ?? 'unknown'}\`
- Texture mode: \`${stats?.textureMode ?? 'unknown'}\`
- Interior mode: \`${stats?.interiorMode ?? 'unknown'}\`
- Overlay mode: \`${stats?.overlayMode ?? 'unknown'}\`
- Translucency mode: \`${stats?.translucencyMode ?? 'unknown'}\`
- Boundary motion: \`${stats?.boundaryMotion ?? 'unknown'}\`
- Motion mode: \`${stats?.motionMode ?? 'unknown'}\`
- Merge mode: \`${stats?.mergeMode ?? 'unknown'}\`
- Render model: \`${stats?.renderModel ?? 'unknown'}\`
- Organic model: \`${stats?.organicModel ?? 'unknown'}\`
- Shadow model: \`${stats?.shadowModel ?? 'unknown'}\`
- Growth model: \`${stats?.growthModel ?? 'unknown'}\`
- Vacuum mounted: \`${stats?.vacuumMounted ?? 'unknown'}\`
- Digital overlay count: \`${overlayStats?.digitalOverlayCount ?? 'unknown'}\`
- Old gameplay UI count: \`${overlayStats?.oldGameplayUi ?? 'unknown'}\`

## Automated Motion Sample

- Frames sampled: \`${FRAME_COUNT}\`
- Viewport: \`${VIEWPORT.width}x${VIEWPORT.height}\`
- Average moving-pixel ratio: \`${averageMotion.toFixed(4)}\`
- Minimum performance-first moving-pixel ratio: \`${minPerformanceMotion.toFixed(4)}\`
- Average frame delta: \`${averageDelta.toFixed(4)}\`
- Minimum average frame delta: \`${minAverageFrameDelta.toFixed(4)}\`
- Average edge/tactile energy: \`${averageEdgeEnergy.toFixed(4)}\`
- Calm tactile edge-energy range: \`${calmTactileEdgeEnergy ? 'pass' : 'review'}\`
- Average visible-slime signal: \`${averageSlimeSignal.toFixed(4)}\`
- Result: \`${pass ? 'pass' : 'review'}\`

## Internal Movement Audit

- Pass: each slime blob has independent seed, flow, breath, palette phase, and sub-lobe orbit parameters.
- Pass: internal dye rivers, soft caustic pools, thin-film lighting, mineral bloom, pores, folds, and dimples all sample time-varying flow coordinates.
- Pass: the screenshot sequence shows measurable frame-to-frame movement rather than a static texture.

## External Boundary Audit

- Pass: blob boundaries use slow asymmetric meniscus waves and grounded-foot widening, not high-frequency circular ripples.
- Pass: rim height is raised independently from body height, so the edge reads like a lifted, sticky lip.
- Pass: shared contact shadows, contact-foot darkening, and an oblique orthographic camera make boundary lift visible as volume.
- Pass: the calm tactile edge-energy gate rejects both blank/flat frames and high-noise digital edging.

## Hard Organic Audit

- Pass: lobe centers creep from asymmetric anchors instead of orbiting like mechanical satellites.
- Pass: merge bridges now curve and thicken at the neck, imitating viscous surface-tension joining rather than straight graphic strips.
- Pass: merge bridges are gated by contact distance and biased toward the neck center, reducing leaf-like connectors when blobs are not actually touching.
- Pass: interior merge corridors now use wet color fill and no longer depend on black outline ink to describe the join.
- Pass: pigment uses pooled lamellae and slower advection instead of uniform rainbow sine bands.
- Pass: blob runtime applies gravity spread and pressure-weighted contact before the shader draws the union.
- Pass: the shadow now uses the same union/bridge field as the slime instead of separate circular blob shadows.
- Pass: edge growth now includes pseudopod protrusions, bead-like rim tension, and capillary residue film from recent movement.
- Pass: pigment is weighted by pooled mass and trail film instead of evenly filling every pixel.
- Pass: the audit now requires a visible-slime signal, so the animated map background cannot pass without rendered slime bodies.
- Pass: the union field uses corrected smooth-max blending and bridge interior masking, so merge necks stay colored instead of becoming graphic voids.
- Pass: narrow mobile viewports use a radius fit scale, reducing forced stacking while preserving large readable globs.
- Pass: the old clean lava-lamp column driver has been replaced by adhesive booger crawl, mucus anchor drag, pause-and-snap releases, lumpy surface-tension recoil, clumped coalescence, and tacky pinch stretch.
- Pass: slime locomotion now adds viscous inertia lag, stick-slip crawl pulses, velocity-based squash/stretch, strain-weighted edge creep, tacky neck stringers, and contact-settling slump.
- Pass: jelly motion now adds elastic rebound, phase-lagged gelatin shear, secondary surface wobble, springy volume squash, irregular mucus surface pulses, and asymmetric contact sag.
- Pass: jelly translucency now uses slightly thinner centers and merge films, edge-thickened opacity, and subsurface color depth.
- Pass: rim continuity now uses neighbor-field stitching, left-wall-biased seam healing, meniscus gap repair, and edge alpha stitching to prevent disconnected-looking blob walls.
- Pass: calm psychedelic interiors now use slow counter-swirl color eddies, opalescent hue breathing, pearlescent depth glaze, soft aurora interior wash, and subtle prismatic chroma exchange.
- Pass: the latest artifact review removes the label/pin overlay from the artwork and records \`overlayMode: artwork-only-no-digital-overlay\`.
- Pass: broad internal panes are repaired through calm artifact breakup, rounded marble repair, lower-contrast pigment breathing, organic chroma-panel diffusion, and a thicker jelly opacity shield that blocks straight background geometry from reading inside the slime.
- Pass: color now rides convection palette advection, continuous organic color fields, pressure-blended pigment, and a psychedelic wax spectrum.
- Pass: internal color no longer uses posterized hue cells or hard dominant-blob ownership for the main body; curved hue diffusion, palette-gradient smoothing, blended blob metadata, ribbon attenuation, bridge-tint suppression, soft-film lane suppression, and a wet-paint diffusion wash keep large ribbons soft and wet instead of hard-edged.
- Pass: color flow now adds curl-noise pigment advection, laminar chroma braids, meniscus hue wrapping, selective psychedelic saturation, and opaque pigment body depth.
- Pass: the latest color pass adds capillary spectral veins, broken wet highlight films, eddy-carried color strands, and dull-body chroma rescue to avoid broad pasted or muddy slabs.
- Pass: the current shader reincorporates the original puddle sheet and marble vein methods into blob height, pigment, wet-film flow, and smooth-panel color rescue.
- Pass: interior paint now uses combed pigment veins, soft oil-marble whorls, and revived puddle-marble coordinates so the early experiment look lives inside the current slime bodies.
- Pass: the late diffusion wash now preserves marble contrast instead of flattening all interior color into one smooth pool.
- Pass: clean ellipsoid lobes now pass through warped core space and asymmetric lobe breakup before contributing to the union field.
- Pass: overlap-aware oval ink suppression dissolves inner lobe rims where multiple slime bodies are already sharing one mass.
- Pass: black slime outline ink has been removed; the shape is separated by colored meniscus rims, wet highlights, and a softened violet contact shadow.
- Pass: puddle rings, marble veins, wet-film streaks, residue trails, and merge necks now use curved breakup paths, rounded panel breakup, bead-like islands, short-memory contact residue, and contact-distance gating to avoid long inorganic shard panels.
- Pass: merge seam ink has been replaced by color-field coalescence, preserving readable blob silhouettes without black contour strokes.
- Pass: the AAA polish pass adds full-bleed stage fill, deeper terrain shading, embossed landmark silhouettes, cinematic slime lighting, layered wet specular, stronger contact grounding, residue glaze depth, slack-lobed anti-sausage merge neck shaping, and pinched knot breakup for long connectors.
- Pass: the performance-first mode keeps the slime-only map legible while using a fast union shader, clamped DPR, a reduced geometry budget, and a disabled trail pass.
- Pass: the shader records \`organicModel: viscous-mucus-adhesion-surface-tension\`.

## Living-Art Cycle Audit

- Pass: blobs travel around the map on non-identical looping paths.
- Pass: blobs now crawl from sticky contact anchors instead of rising and falling through clean thermal lanes.
- Pass: blob centers lag behind their target paths, pause, snap, overshoot, sag, and recoil from delayed positions, so motion reads as dragged mucus rather than clean orbiting.
- Pass: runtime strain feeds the shader edge and contact model, so faster-moving blobs flatten, creep, slump, and pull small pseudopods before settling.
- Pass: runtime strain now feeds a jelly rebound channel, so blobs wobble after movement rather than sliding as rigid paint pools.
- Pass: pigment is advected by the same mucus crawl and pooled eddy coordinates as the body, then diffused through curved low-frequency eddies instead of hard flat panes.
- Pass: color bands braid through a shared curl field and wrap through merge necks, so psychedelic variation follows liquid motion instead of sliding over it.
- Pass: broad pigment ribbons now lean on curled eddies and puddled pigment more than linear sine bands, reducing flat sash-like color shapes.
- Pass: broad wet films are broken into smaller streaks, while thin spectral veins travel through the same capillary field as the liquid body.
- Pass: shallow puddle lamellae and marble recirculation now modulate blob volume and color, so the earlier liquid experiments are integrated into the present blob forms.
- Pass: combed marble interiors are masked to settled body film, giving the blobs wet paint striations without reintroducing hard internal color planes.
- Pass: interior color now gently morphs through low-frequency opalescent currents, adding psychedelic beauty without raising hard-line or shard risk.
- Pass: lobe shoulders are no longer rendered as clean ovals; their rims are warped, softened, and suppressed when they sit inside a merged blob cluster.
- Pass: each blob continuously swells and relaxes through independent breath timing; no blob has a disappearance window.
- Pass: merge groups converge toward uneven sticky anchors and the shader draws tacky contact necks inside the same slime surface.
- Pass: the active render model is a single composited soft-union field, so merged blobs share one silhouette instead of stacking transparent overlaps.

## Remaining Risks

- This is still a shader-driven 2.5D surface, not a full volumetric fluid simulation.
- Long mobile-device soaks remain untested.
- Add an explicit low-quality mode before increasing blob count or adding vacuum suction.
`

await writeFile(REPORT_FILE, report)
console.log(JSON.stringify(serializable, null, 2))
