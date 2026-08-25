import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import {
  averageFrameDuration,
  createMuseumMotionSheet,
} from './museum-motion-sheet.mjs'

const CONTRACT = '0x04619852f38ebec22bb94ef36b99351db9900194'
const OUTPUT_ROOT = new URL('../public/museum/formal-room/galleries/', import.meta.url)

const WORKS = [
  {
    tokenId: '1',
    title: 'GMoBA',
    artist: 'joseph_pixler',
    media: '73492d7edc8cae0fc3b94411931f63/8773492d7edc8cae0fc3b94411931f63.gif',
  },
  {
    tokenId: '2',
    title: 'GNoBA',
    artist: 'Joseph Pixler',
    media: 'fb205233e5a343eafffec4c157a9e6/88fb205233e5a343eafffec4c157a9e6.gif',
  },
  {
    tokenId: '3',
    title: 'The Curator’s Chest',
    artist: 'Joseph Pixler',
    media: 'dcdb8d2ccd0bcc20ce622b782a3b94/f0dcdb8d2ccd0bcc20ce622b782a3b94.gif',
  },
  {
    tokenId: '4',
    title: 'Play MoBA!',
    artist: 'Bunya',
    media: 'ad0dd30f3035c0a431af1879dacd75/c4ad0dd30f3035c0a431af1879dacd75.png',
  },
  {
    tokenId: '5',
    title: 'How the Seasons Change',
    artist: 'Doug Dimmadome',
    media: '031c4a425ceac42e0b4eb8c17bf9ca/4b031c4a425ceac42e0b4eb8c17bf9ca.png',
  },
  {
    tokenId: '6',
    title: '!Createbox',
    artist: 'Joseph Pixler',
    media: '3dd0cb9780d86ac7b1a7c2bc279335/d03dd0cb9780d86ac7b1a7c2bc279335.gif',
  },
  {
    tokenId: '7',
    title: 'An empty !createbox frame',
    artist: 'Joseph Pixler',
    media: '0553617de944a3791e409191a2654f/fd0553617de944a3791e409191a2654f.gif',
  },
  {
    tokenId: '9',
    title: 'An Enjoyable Terrarium',
    artist: 'Joseph Pixler',
    media: '39f2f29683f71abdf5ccb5d3a407c8/8c39f2f29683f71abdf5ccb5d3a407c8.png',
  },
]

async function main() {
  const outputRootPath = decodeURIComponent(OUTPUT_ROOT.pathname)
  const collectionDir = join(outputRootPath, 'moba-gallery')
  mkdirSync(collectionDir, { recursive: true })
  const works = []

  for (const [index, work] of WORKS.entries()) {
    const sourceUrl = `https://raw2.seadn.io/base/${CONTRACT}/${work.media}`
    const response = await fetch(sourceUrl, { headers: { accept: 'image/*' } })
    if (!response.ok) throw new Error(`Token ${work.tokenId}: media returned ${response.status}`)
    const input = Buffer.from(await response.arrayBuffer())
    const metadata = await sharp(input, { animated: true }).metadata()
    const frameCount = Math.max(1, Number(metadata.pages) || 1)
    const width = Math.max(1, Number(metadata.width) || 1)
    const height = Math.max(1, Number(metadata.pageHeight) || Number(metadata.height) || 1)
    const assetNumber = String(index + 1).padStart(2, '0')
    const posterName = `art-${assetNumber}.webp`

    await sharp(input, { animated: false, page: 0 })
      .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 86, smartSubsample: true })
      .toFile(join(collectionDir, posterName))

    let motion = null
    let motionSheet = null
    let motionSheetColumns = null
    let motionSheetRows = null
    let motionFrameDurationMs = null
    if (frameCount > 1) {
      const motionName = `motion-${assetNumber}.gif`
      writeFileSync(join(collectionDir, motionName), input)
      motion = `/museum/formal-room/galleries/moba-gallery/${motionName}`
      const sheetName = `motion-${assetNumber}-sheet.webp`
      const sheet = await createMuseumMotionSheet(input, join(collectionDir, sheetName), frameCount)
      motionSheet = `/museum/formal-room/galleries/moba-gallery/${sheetName}`
      motionSheetColumns = sheet.columns
      motionSheetRows = sheet.rows
      motionFrameDurationMs = averageFrameDuration(metadata)
    }

    works.push({
      id: `moba-gallery-${work.tokenId}`,
      tokenId: work.tokenId,
      title: work.title,
      artist: work.artist,
      poster: `/museum/formal-room/galleries/moba-gallery/${posterName}`,
      motion,
      motionSheet,
      motionSheetColumns,
      motionSheetRows,
      motionFrameDurationMs,
      frameCount,
      featured: work.tokenId === '3',
      width,
      height,
      sourceUrl: `https://opensea.io/item/base/${CONTRACT}/${work.tokenId}`,
    })
    process.stdout.write(`Prepared ${work.title}: ${frameCount} frame${frameCount === 1 ? '' : 's'}\n`)
  }

  const manifestPath = join(outputRootPath, 'manifest.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  manifest.collections['moba-gallery'] = {
    title: 'MoBA Gallery',
    slug: 'moba-gallery',
    contract: CONTRACT,
    standard: 'erc1155',
    collectionUrl: 'https://opensea.io/collection/moba-gallery',
    works,
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

await main()
