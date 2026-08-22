import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import sharp from 'sharp'

const OPEN_SEA_ENDPOINT = 'https://api.opensea.io/api/v2/collection'
const OUTPUT_ROOT = new URL('../public/museum/formal-room/galleries/', import.meta.url)
const MOTION_SHEET_TILE_SIZE = 192
const MOTION_SHEET_COLUMNS = 7

const COLLECTIONS = [
  {
    id: 'moba-one',
    slug: 'moba--1',
    title: 'MoBA #1: Portraits of an Enjoyer',
    count: 12,
    heroIdentifier: '599',
    collectionUrl: 'https://opensea.io/collection/moba--1',
  },
  {
    id: 'moba-two',
    slug: 'moba-2-curated-hearts',
    title: 'MoBA #2: Curated Hearts',
    count: 12,
    heroIdentifier: '2222',
    collectionUrl: 'https://opensea.io/collection/moba-2-curated-hearts',
  },
  {
    id: 'photography',
    slug: 'final-photos',
    title: 'One Final Album',
    count: 8,
    heroIdentifier: null,
    collectionUrl: 'https://opensea.io/collection/final-photos',
  },
  {
    id: 'holiday',
    slug: 'moba-x-tweaks-holiday-potluck',
    title: 'MoBA × Tweaks Holiday Potluck',
    count: 11,
    heroIdentifier: '1',
    collectionUrl: 'https://opensea.io/collection/moba-x-tweaks-holiday-potluck',
  },
]

async function createPoster(input, outputPath) {
  await sharp(input, { animated: false, page: 0 })
    .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, smartSubsample: true })
    .toFile(outputPath)
  const metadata = await sharp(outputPath).metadata()
  return {
    width: Number(metadata.width) || 1,
    height: Number(metadata.height) || 1,
  }
}

function motionExtension(format) {
  if (format === 'webp' || format === 'gif' || format === 'png') return format
  throw new Error(`Unsupported animated image format: ${format || 'unknown'}`)
}

function averageFrameDuration(metadata) {
  const delays = Array.isArray(metadata.delay)
    ? metadata.delay.filter((delay) => Number.isFinite(delay) && delay > 0)
    : []
  if (delays.length === 0) return 80
  return Math.max(20, Math.round(delays.reduce((total, delay) => total + delay, 0) / delays.length))
}

async function createMotionSheet(input, outputPath, frameCount) {
  const rows = Math.ceil(frameCount / MOTION_SHEET_COLUMNS)
  const tiles = await Promise.all(Array.from({ length: frameCount }, async (_, frameIndex) => ({
    input: await sharp(input, { page: frameIndex })
      .resize(MOTION_SHEET_TILE_SIZE, MOTION_SHEET_TILE_SIZE, { fit: 'fill' })
      .png()
      .toBuffer(),
    left: (frameIndex % MOTION_SHEET_COLUMNS) * MOTION_SHEET_TILE_SIZE,
    top: Math.floor(frameIndex / MOTION_SHEET_COLUMNS) * MOTION_SHEET_TILE_SIZE,
  })))

  await sharp({
    create: {
      width: MOTION_SHEET_COLUMNS * MOTION_SHEET_TILE_SIZE,
      height: rows * MOTION_SHEET_TILE_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(tiles)
    .webp({ quality: 92, smartSubsample: true })
    .toFile(outputPath)

  return { columns: MOTION_SHEET_COLUMNS, rows }
}

async function rebuildMotionSheetsFromManifest() {
  const outputRootPath = decodeURIComponent(OUTPUT_ROOT.pathname)
  const manifestPath = join(outputRootPath, 'manifest.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const works = manifest.collections?.['moba-two']?.works ?? []

  for (const work of works) {
    if (!work.motion) continue
    const motionPath = join(outputRootPath, 'moba-two', basename(work.motion))
    const input = readFileSync(motionPath)
    const metadata = await sharp(input, { animated: true }).metadata()
    const frameCount = Math.max(1, Number(metadata.pages) || 1)
    const baseName = basename(work.motion, extname(work.motion))
    const sheetName = `${baseName}-sheet.webp`
    const sheet = await createMotionSheet(
      input,
      join(outputRootPath, 'moba-two', sheetName),
      frameCount,
    )
    work.motionSheet = `/museum/formal-room/galleries/moba-two/${sheetName}`
    work.motionSheetColumns = sheet.columns
    work.motionSheetRows = sheet.rows
    work.motionFrameDurationMs = averageFrameDuration(metadata)
    process.stdout.write(`Prepared motion sheet ${work.id}\n`)
  }

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

async function main() {
  const apiKey = process.env.OPENSEA_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENSEA_API_KEY is required')

  const outputRootPath = decodeURIComponent(OUTPUT_ROOT.pathname)
  mkdirSync(outputRootPath, { recursive: true })
  const manifest = { generatedAt: new Date().toISOString(), collections: {} }

  for (const collection of COLLECTIONS) {
      const response = await fetch(
        `${OPEN_SEA_ENDPOINT}/${encodeURIComponent(collection.slug)}/nfts?limit=${collection.count}`,
        { headers: { accept: 'application/json', 'x-api-key': apiKey } },
      )
      if (!response.ok) throw new Error(`${collection.slug}: OpenSea returned ${response.status}`)
      const payload = await response.json()
      const nfts = Array.isArray(payload.nfts) ? payload.nfts.slice(0, collection.count) : []
      if (nfts.length < collection.count) {
        throw new Error(`${collection.slug}: expected ${collection.count} works, received ${nfts.length}`)
      }

      const collectionDir = join(outputRootPath, collection.id)
      mkdirSync(collectionDir, { recursive: true })
      const works = []

      for (const [index, nft] of nfts.entries()) {
        if (!nft.image_url) throw new Error(`${collection.slug} token ${nft.identifier} has no image`)
        const mediaResponse = await fetch(nft.image_url, { headers: { accept: 'image/*' } })
        if (!mediaResponse.ok) throw new Error(`${collection.slug} token ${nft.identifier}: media ${mediaResponse.status}`)
        const input = Buffer.from(await mediaResponse.arrayBuffer())
        const sourceMetadata = await sharp(input, { animated: true }).metadata()
        const frameCount = Math.max(1, Number(sourceMetadata.pages) || 1)

        const posterName = `art-${String(index + 1).padStart(2, '0')}.webp`
        const posterPath = join(collectionDir, posterName)
        const dimensions = await createPoster(input, posterPath)

        let motion = null
        let motionSheet = null
        let motionSheetColumns = null
        let motionSheetRows = null
        let motionFrameDurationMs = null
        if (frameCount > 1) {
          const extension = motionExtension(sourceMetadata.format)
          const motionName = String(nft.identifier) === collection.heroIdentifier
            ? `hero.${extension}`
            : `motion-${String(index + 1).padStart(2, '0')}.${extension}`
          writeFileSync(join(collectionDir, motionName), input)
          motion = `/museum/formal-room/galleries/${collection.id}/${motionName}`
          if (collection.id === 'moba-two') {
            const sheetName = `${basename(motionName, extname(motionName))}-sheet.webp`
            const sheet = await createMotionSheet(input, join(collectionDir, sheetName), frameCount)
            motionSheet = `/museum/formal-room/galleries/${collection.id}/${sheetName}`
            motionSheetColumns = sheet.columns
            motionSheetRows = sheet.rows
            motionFrameDurationMs = averageFrameDuration(sourceMetadata)
          }
        }

        works.push({
          id: `${collection.id}-${nft.identifier}`,
          tokenId: String(nft.identifier),
          title: nft.name || `${collection.title} #${nft.identifier}`,
          poster: `/museum/formal-room/galleries/${collection.id}/${posterName}`,
          motion,
          motionSheet,
          motionSheetColumns,
          motionSheetRows,
          motionFrameDurationMs,
          frameCount,
          featured: String(nft.identifier) === collection.heroIdentifier,
          width: dimensions.width,
          height: dimensions.height,
          sourceUrl: nft.opensea_url || collection.collectionUrl,
        })
      }

      manifest.collections[collection.id] = {
        title: collection.title,
        slug: collection.slug,
        collectionUrl: collection.collectionUrl,
        works,
      }
      process.stdout.write(`Prepared ${collection.title}: ${works.length} works\n`)
  }

  writeFileSync(
    join(outputRootPath, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
}

if (process.argv.includes('--sheets-only')) await rebuildMotionSheetsFromManifest()
else await main()
