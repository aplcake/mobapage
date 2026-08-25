import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import sharp from 'sharp'
import {
  averageFrameDuration,
  createMuseumMotionSheet,
} from './museum-motion-sheet.mjs'

const OUTPUT_ROOT = new URL('../public/museum/formal-room/galleries/', import.meta.url)
const COLLECTION_ID = 'moba-gallery'

async function main() {
  const outputRootPath = decodeURIComponent(OUTPUT_ROOT.pathname)
  const manifestPath = join(outputRootPath, 'manifest.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const works = manifest.collections?.[COLLECTION_ID]?.works ?? []
  const animatedWorks = works.filter((work) => work.motion)

  if (animatedWorks.length === 0) throw new Error('MoBA Gallery has no animated works to pack')

  for (const work of animatedWorks) {
    const motionName = basename(work.motion)
    const motionPath = join(outputRootPath, COLLECTION_ID, motionName)
    const input = readFileSync(motionPath)
    const metadata = await sharp(input, { animated: true }).metadata()
    const frameCount = Math.max(1, Number(metadata.pages) || 1)
    if (frameCount < 2) throw new Error(`${work.id} is unexpectedly static`)
    if (work.frameCount !== frameCount) {
      throw new Error(`${work.id} manifest says ${work.frameCount} frames; source contains ${frameCount}`)
    }

    const sheetName = `${basename(motionName, extname(motionName))}-sheet.webp`
    const sheetPath = join(outputRootPath, COLLECTION_ID, sheetName)
    const sheet = await createMuseumMotionSheet(input, sheetPath, frameCount)
    work.motionSheet = `/museum/formal-room/galleries/${COLLECTION_ID}/${sheetName}`
    work.motionSheetColumns = sheet.columns
    work.motionSheetRows = sheet.rows
    work.motionFrameDurationMs = averageFrameDuration(metadata)

    const sourceBytes = statSync(motionPath).size
    const sheetBytes = statSync(sheetPath).size
    process.stdout.write(
      `${work.id}: ${frameCount} frames, ${sheet.columns}x${sheet.rows} cells, `
      + `${sourceBytes} -> ${sheetBytes} bytes\n`,
    )
  }

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

await main()
