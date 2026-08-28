import { createHash } from 'node:crypto'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const EXPECTED_WORK_COUNT = 51
const CELL_SIZE = 128
const COLUMNS = 8
const ATLAS_URL = '/museum/formal-room/galleries/poster-atlas.webp'
const OUTPUT_ROOT = fileURLToPath(new URL('../public', import.meta.url))
const MANIFEST_PATH = join(OUTPUT_ROOT, 'museum/formal-room/galleries/manifest.json')
const ATLAS_PATH = join(OUTPUT_ROOT, ATLAS_URL.replace(/^\//, ''))

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  const workRefs = Object.entries(manifest.collections)
    .flatMap(([collectionId, collection]) => collection.works.map((work) => ({ collectionId, work })))
    .sort((left, right) => compareAscii(
      `${left.collectionId}/${left.work.id}`,
      `${right.collectionId}/${right.work.id}`,
    ))

  if (workRefs.length !== EXPECTED_WORK_COUNT) {
    throw new Error(`Expected ${EXPECTED_WORK_COUNT} permanent works; found ${workRefs.length}`)
  }

  const stableIds = workRefs.map(({ collectionId, work }) => `${collectionId}/${work.id}`)
  if (new Set(stableIds).size !== workRefs.length) {
    throw new Error('Poster atlas requires a unique collection/work id for every permanent work')
  }
  if (new Set(workRefs.map(({ work }) => work.poster)).size !== workRefs.length) {
    throw new Error('Poster atlas requires a distinct poster source for every permanent work')
  }

  const rows = Math.ceil(workRefs.length / COLUMNS)
  const width = COLUMNS * CELL_SIZE
  const height = rows * CELL_SIZE
  const layers = []

  for (const [posterAtlasIndex, { work }] of workRefs.entries()) {
    const posterPath = join(OUTPUT_ROOT, work.poster.replace(/^\//, ''))
    if (!existsSync(posterPath)) throw new Error(`Missing poster for ${work.id}: ${work.poster}`)

    const tile = await sharp(posterPath, { animated: false })
      .resize(CELL_SIZE, CELL_SIZE, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .ensureAlpha()
      .raw()
      .toBuffer()

    layers.push({
      input: tile,
      raw: { width: CELL_SIZE, height: CELL_SIZE, channels: 4 },
      left: (posterAtlasIndex % COLUMNS) * CELL_SIZE,
      top: Math.floor(posterAtlasIndex / COLUMNS) * CELL_SIZE,
    })
    work.posterAtlasIndex = posterAtlasIndex
  }

  const temporaryAtlasPath = `${ATLAS_PATH}.${process.pid}.tmp.webp`
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(layers)
    .webp({ quality: 82, effort: 6, smartSubsample: true })
    .toFile(temporaryAtlasPath)
  renameSync(temporaryAtlasPath, ATLAS_PATH)

  const atlasBytes = readFileSync(ATLAS_PATH)
  manifest.posterAtlas = {
    version: 1,
    src: ATLAS_URL,
    columns: COLUMNS,
    rows,
    cellSize: CELL_SIZE,
    width,
    height,
    workCount: workRefs.length,
    indexOrder: 'collection-id/work-id-ascii-v1',
    sha256: createHash('sha256').update(atlasBytes).digest('hex'),
  }

  const temporaryManifestPath = `${MANIFEST_PATH}.${process.pid}.tmp`
  writeFileSync(temporaryManifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  renameSync(temporaryManifestPath, MANIFEST_PATH)

  console.log(`Wrote ${workRefs.length} posters to ${ATLAS_PATH}`)
  console.log(`${width}x${height}, ${atlasBytes.length} bytes, sha256 ${manifest.posterAtlas.sha256}`)
}

await main()
