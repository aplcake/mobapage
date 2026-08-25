import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

export const GLOWBUD_LOD_TOKEN_IDS = [
  '1731',
  '2259',
  '2701',
  '1594',
  '530',
  '2013',
  '1201',
  '2542',
  '1855',
  '1621',
]

export const GLOWBUD_IMAGE_CID = 'QmaqEJNBEJWdwwSGBHtcqGCdJfnXazNVj6tcvr21E6abAU'

export const GLOWBUD_SOURCE_SHA256 = {
  '1731': '6599c6b33f6a6857eb37f9a2f3000dc7abf3be590f2253e15eeafbe0a5157ae7',
  '2259': '5a35b4623dc14ec992eed7c45d5dcd5d60af2adb14cd0ec13920a109c3724741',
  '2701': '970e89db4d365cde5ebbfaa73842c5dc66dd934078da31a92466e2f734464729',
  '1594': '32219bf7376c6d3e94b4e38b05eee47ee180222538ef471c1499a316e563dcfe',
  '530': 'fe3fc13399c9c0d7e66ee2d7316dba69c8cd86b58c5a2797c37db38c4bfe71c1',
  '2013': '0ca0bb20ef4c6d09534a23fcd114584aaca338e0b04dce719914c9b7398f920f',
  '1201': 'df5fbf88994549b658d33dd15e5c646147e0687f9a623aa0aeb8786e86ad7139',
  '2542': '155b245dead37fd0763ea3b79ffc1b876843c96fd6a16477cf5903f7458a59a3',
  '1855': '452cb52dec850adacf17fbda719dab678a39f0e0abfd77549caa42c9b58bfc76',
  '1621': '5e248329f0caa842e2cf2e4b51c26cc2017f4128e6b2f365d61e8b92bb03d000',
}

const DEFAULT_SOURCE_DIR = process.env.GLOWBUD_LOD_SOURCE_DIR || '/tmp'
const DEFAULT_OUTPUT_DIR = fileURLToPath(
  new URL('../public/museum/formal-room/glowbuds/lod/', import.meta.url),
)

function sha256(input) {
  return createHash('sha256').update(input).digest('hex')
}

export function glowbudLodAssetUrl(tokenId) {
  return `/museum/formal-room/glowbuds/lod/${tokenId}.webp`
}

export function glowbudSourceUrls(tokenId) {
  const ipfsPath = `${GLOWBUD_IMAGE_CID}/${tokenId}`
  return [
    `https://gateway.pinata.cloud/ipfs/${ipfsPath}`,
    `https://ipfs.io/ipfs/${ipfsPath}`,
  ]
}

async function readExactSource(tokenId, sourceDir, fetchImpl) {
  const localPath = join(sourceDir, `glowbud-${tokenId}-source`)
  let source = existsSync(localPath) ? readFileSync(localPath) : null

  if (!source) {
    const failures = []
    for (const url of glowbudSourceUrls(tokenId)) {
      try {
        const response = await fetchImpl(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        source = Buffer.from(await response.arrayBuffer())
        break
      } catch (error) {
        failures.push(`${url}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    if (!source) throw new Error(`Could not fetch Glowbud #${tokenId}\n${failures.join('\n')}`)
  }

  const expectedHash = GLOWBUD_SOURCE_SHA256[tokenId]
  const actualHash = sha256(source)
  if (actualHash !== expectedHash) {
    throw new Error(`Glowbud #${tokenId} source hash mismatch: expected ${expectedHash}, received ${actualHash}`)
  }

  const metadata = await sharp(source).metadata()
  if (metadata.format !== 'png' || metadata.width !== 3200 || metadata.height !== 3200) {
    throw new Error(`Glowbud #${tokenId} source must be its exact 3200x3200 PNG artwork`)
  }
  return source
}

export async function generateGlowbudLodAssets({
  sourceDir = DEFAULT_SOURCE_DIR,
  outputDir = DEFAULT_OUTPUT_DIR,
  fetchImpl = fetch,
} = {}) {
  mkdirSync(outputDir, { recursive: true })
  const results = []

  for (const tokenId of GLOWBUD_LOD_TOKEN_IDS) {
    const source = await readExactSource(tokenId, sourceDir, fetchImpl)
    const outputPath = join(outputDir, `${tokenId}.webp`)
    const temporaryPath = `${outputPath}.${process.pid}.tmp.webp`

    await sharp(source)
      .resize(256, 256, { fit: 'fill', kernel: sharp.kernel.nearest })
      .webp({ lossless: true, effort: 6 })
      .toFile(temporaryPath)
    renameSync(temporaryPath, outputPath)

    const output = readFileSync(outputPath)
    results.push({
      tokenId,
      url: glowbudLodAssetUrl(tokenId),
      bytes: output.length,
      sha256: sha256(output),
    })
  }

  return results
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) {
  const results = await generateGlowbudLodAssets()
  const totalBytes = results.reduce((sum, result) => sum + result.bytes, 0)
  for (const result of results) {
    console.log(`${result.tokenId}: ${result.bytes} bytes, sha256 ${result.sha256}`)
  }
  console.log(`Wrote ${results.length} exact Glowbud far-LOD artworks (${totalBytes} bytes total)`)
}
