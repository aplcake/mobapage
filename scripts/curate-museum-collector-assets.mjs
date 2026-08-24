import { mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import sharp from 'sharp'

const OUTPUT_ROOT = new URL('../public/museum/formal-room/galleries/', import.meta.url)
const CURATION_PATH = new URL('../public/museum/formal-room/galleries/collector-curation.json', import.meta.url)
const OPEN_SEA_NFT_ENDPOINT = 'https://api.opensea.io/api/v2/chain/base/contract'
const DEFAULT_BASE_RPC_URL = 'https://mainnet.base.org'
const OWNER_OF_SELECTOR = '6352211e'
const MOTION_SHEET_TILE_SIZE = 192
const MOTION_SHEET_COLUMNS = 7
const REQUEST_TIMEOUT_MS = 20_000
const MAX_MEDIA_BYTES = 25 * 1024 * 1024
const ADDRESS_PATTERN = /^0x[a-f0-9]{40}$/

const COLLECTIONS = {
  'moba-one': {
    id: 'moba-one',
    title: 'MoBA #1: Portraits of an Enjoyer',
    contract: '0x76a7ba0de6b80e9abcc1855713022b1e753ac1d1',
    collectionUrl: 'https://opensea.io/collection/moba--1',
    buildMotionSheet: false,
  },
  'moba-two': {
    id: 'moba-two',
    title: 'MoBA #2: Curated Hearts',
    contract: '0x5742980cca2aa1572559017c3dd1c489ed4419f5',
    collectionUrl: 'https://opensea.io/collection/moba-2-curated-hearts',
    buildMotionSheet: true,
  },
}

function readJson(url) {
  return JSON.parse(readFileSync(url, 'utf8'))
}

function safeVersion(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{2,48}$/.test(value)) {
    throw new Error('collector-curation.json has an invalid assetVersion')
  }
  return value
}

function canonicalTokenId(value) {
  if (typeof value !== 'string' || !/^\d{1,78}$/.test(value)) throw new Error(`Invalid token ID: ${value}`)
  return BigInt(value).toString()
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function fetchWithTimeout(input, init = {}) {
  return fetch(input, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
}

function paddedTokenId(tokenId) {
  return BigInt(tokenId).toString(16).padStart(64, '0')
}

function decodeOwner(value) {
  if (typeof value !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(value)) return null
  const address = `0x${value.slice(-40)}`.toLowerCase()
  return ADDRESS_PATTERN.test(address) && !/^0x0{40}$/.test(address) ? address : null
}

async function ownerOf(collection, tokenId, rpcUrl) {
  let lastError = null
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const response = await fetchWithTimeout(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `museum-curation-${collection.id}-${tokenId}`,
          method: 'eth_call',
          params: [{
            to: collection.contract,
            data: `0x${OWNER_OF_SELECTOR}${paddedTokenId(tokenId)}`,
          }, 'latest'],
        }),
        cache: 'no-store',
      })
      if (!response.ok) throw new Error(`RPC returned ${response.status}`)
      const payload = await response.json()
      const owner = decodeOwner(payload.result)
      if (!owner) throw new Error(payload.error?.message || 'RPC returned an unreadable owner')
      return owner
    } catch (error) {
      lastError = error
      await delay(1_000 * (attempt + 1))
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Owner verification failed')
}

function validateCuration(curation) {
  if (curation.schemaVersion !== 2) {
    throw new Error('collector-curation.json must use schemaVersion 2')
  }
  const holderByRank = new Map()
  const holderAddresses = new Set()
  for (const holder of curation.holders ?? []) {
    const address = String(holder.address ?? '').toLowerCase()
    if (
      !Number.isInteger(holder.rank)
      || !ADDRESS_PATTERN.test(address)
      || !Number.isInteger(holder.mobaOneBalance)
      || holder.mobaOneBalance <= 5
      || !Number.isInteger(holder.mobaTwoBalance)
      || holder.mobaTwoBalance < 0
      || typeof holder.label !== 'string'
      || !holder.label.trim()
      || holderByRank.has(holder.rank)
      || holderAddresses.has(address)
    ) {
      throw new Error('collector-curation.json has an invalid holder')
    }
    holderByRank.set(holder.rank, { ...holder, address })
    holderAddresses.add(address)
  }
  if (!holderByRank.size) throw new Error('collector-curation.json has no eligible holders')

  const selections = {}
  const holderSelectionCounts = new Map([...holderByRank.keys()].map((rank) => [rank, 0]))
  for (const collection of Object.values(COLLECTIONS)) {
    const rawSelections = curation.selections?.[collection.id]
    if (!Array.isArray(rawSelections) || rawSelections.length !== 12) {
      throw new Error(`${collection.title} must contain exactly 12 curated works`)
    }
    const tokenIds = new Set()
    let featuredCount = 0
    selections[collection.id] = rawSelections.map((selection) => {
      const tokenId = canonicalTokenId(selection.tokenId)
      const holderAddress = String(selection.holderAddress ?? '').toLowerCase()
      const holder = holderByRank.get(selection.holderRank)
      if (!holder || holder.address !== holderAddress || tokenIds.has(tokenId)) {
        throw new Error(`${collection.title} has an invalid or duplicate selection`)
      }
      if (collection.id === 'moba-two' && holder.mobaTwoBalance <= 0) {
        throw new Error(`${collection.title} selected a holder with no MoBA #2 balance`)
      }
      if (selection.featured === true) featuredCount += 1
      tokenIds.add(tokenId)
      holderSelectionCounts.set(holder.rank, (holderSelectionCounts.get(holder.rank) ?? 0) + 1)
      return {
        tokenId,
        holderAddress,
        holderRank: holder.rank,
        holderLabel: holder.label,
        featured: selection.featured === true,
      }
    })
    if (featuredCount !== 1) throw new Error(`${collection.title} must have exactly one featured work`)
  }
  const selectionCounts = [...holderSelectionCounts.values()]
  const representedHolders = selectionCounts.filter((count) => count > 0).length
  const totalFrames = selectionCounts.reduce((total, count) => total + count, 0)
  const maximumCoverage = Math.min(totalFrames, holderByRank.size)
  if (representedHolders !== maximumCoverage) {
    throw new Error(`Collector curation represents ${representedHolders}/${maximumCoverage} possible eligible holders`)
  }
  if (Math.max(...selectionCounts) - Math.min(...selectionCounts) > 1) {
    throw new Error('Collector curation gives repeat frames before eligible holders are represented evenly')
  }
  return { holderByRank, selections }
}

async function verifySelections(selections, rpcUrl) {
  for (const collection of Object.values(COLLECTIONS)) {
    for (const selection of selections[collection.id]) {
      const owner = await ownerOf(collection, selection.tokenId, rpcUrl)
      if (owner !== selection.holderAddress) {
        throw new Error(
          `${collection.title} #${selection.tokenId} moved from ${selection.holderLabel}; refresh the curation before rebuilding.`,
        )
      }
      process.stdout.write(`Verified ${collection.id} #${selection.tokenId} → ${selection.holderLabel}\n`)
      await delay(650)
    }
  }
}

async function fetchOpenSeaNft(collection, tokenId, apiKey) {
  const response = await fetchWithTimeout(
    `${OPEN_SEA_NFT_ENDPOINT}/${collection.contract}/nfts/${encodeURIComponent(tokenId)}`,
    {
      headers: { Accept: 'application/json', 'x-api-key': apiKey },
      cache: 'no-store',
    },
  )
  if (!response.ok) throw new Error(`${collection.title} #${tokenId}: OpenSea returned ${response.status}`)
  const payload = await response.json()
  const nft = payload?.nft
  if (!nft || String(nft.identifier) !== tokenId || typeof nft.image_url !== 'string') {
    throw new Error(`${collection.title} #${tokenId}: OpenSea returned incomplete metadata`)
  }
  return nft
}

async function fetchMedia(url, label) {
  const parsedUrl = new URL(url)
  if (parsedUrl.protocol !== 'https:') throw new Error(`${label}: media URL must use HTTPS`)
  const response = await fetchWithTimeout(url, { headers: { Accept: 'image/*' }, cache: 'no-store' })
  if (!response.ok) throw new Error(`${label}: media returned ${response.status}`)
  const declaredBytes = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredBytes) && declaredBytes > MAX_MEDIA_BYTES) {
    throw new Error(`${label}: media exceeds the ${MAX_MEDIA_BYTES / 1024 / 1024} MB limit`)
  }
  const media = Buffer.from(await response.arrayBuffer())
  if (media.byteLength > MAX_MEDIA_BYTES) {
    throw new Error(`${label}: media exceeds the ${MAX_MEDIA_BYTES / 1024 / 1024} MB limit`)
  }
  return media
}

async function createPoster(input, outputPath, frameCount) {
  // Pick a representative point after the reveal begins instead of a mostly
  // empty opening frame. The real motion asset still supplies the full loop.
  const posterFrame = Math.max(0, Math.min(frameCount - 1, Math.floor(frameCount * 0.55)))
  await sharp(input, { animated: false, page: posterFrame })
    .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 86, smartSubsample: true })
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
    ? metadata.delay.filter((value) => Number.isFinite(value) && value > 0)
    : []
  if (!delays.length) return 80
  return Math.max(20, Math.round(delays.reduce((total, value) => total + value, 0) / delays.length))
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

async function prepareWork(collection, selection, apiKey, assetVersion, outputRootPath) {
  const nft = await fetchOpenSeaNft(collection, selection.tokenId, apiKey)
  const input = await fetchMedia(nft.image_url, `${collection.title} #${selection.tokenId}`)
  const sourceMetadata = await sharp(input, { animated: true }).metadata()
  const frameCount = Math.max(1, Number(sourceMetadata.pages) || 1)
  if (frameCount <= 1) throw new Error(`${collection.title} #${selection.tokenId} is unexpectedly static`)

  const collectionDir = join(outputRootPath, collection.id)
  mkdirSync(collectionDir, { recursive: true })
  const fileStem = `${assetVersion}-token-${selection.tokenId}`
  const posterName = `${fileStem}-poster.webp`
  const posterPath = join(collectionDir, posterName)
  const dimensions = await createPoster(input, posterPath, frameCount)
  const extension = motionExtension(sourceMetadata.format)
  const motionName = `${fileStem}-motion.${extension}`
  writeFileSync(join(collectionDir, motionName), input)

  let motionSheet = null
  let motionSheetColumns = null
  let motionSheetRows = null
  let motionFrameDurationMs = null
  if (collection.buildMotionSheet) {
    const sheetName = `${fileStem}-sheet.webp`
    const sheet = await createMotionSheet(input, join(collectionDir, sheetName), frameCount)
    motionSheet = `/museum/formal-room/galleries/${collection.id}/${sheetName}`
    motionSheetColumns = sheet.columns
    motionSheetRows = sheet.rows
    motionFrameDurationMs = averageFrameDuration(sourceMetadata)
  }

  return {
    id: `${collection.id}-${selection.tokenId}`,
    tokenId: selection.tokenId,
    title: typeof nft.name === 'string' && nft.name.trim()
      ? nft.name.trim()
      : `${collection.title} #${selection.tokenId}`,
    poster: `/museum/formal-room/galleries/${collection.id}/${posterName}`,
    motion: `/museum/formal-room/galleries/${collection.id}/${motionName}`,
    motionSheet,
    motionSheetColumns,
    motionSheetRows,
    motionFrameDurationMs,
    frameCount,
    featured: selection.featured,
    width: dimensions.width,
    height: dimensions.height,
    sourceUrl: typeof nft.opensea_url === 'string'
      ? nft.opensea_url
      : `https://opensea.io/item/base/${collection.contract}/${selection.tokenId}`,
    collector: {
      holderRank: selection.holderRank,
      address: selection.holderAddress,
      label: selection.holderLabel,
    },
  }
}

function removeSupersededCollectorAssets(collection, works, outputRootPath) {
  const collectionDir = join(outputRootPath, collection.id)
  const referenced = new Set(
    works
      .flatMap((work) => [work.poster, work.motion, work.motionSheet])
      .filter(Boolean)
      .map((assetUrl) => basename(assetUrl)),
  )
  const generatedName = /^top-holders-[a-z0-9-]+-token-\d+-(?:poster|motion|sheet)\.(?:gif|png|webp)$/
  for (const filename of readdirSync(collectionDir)) {
    if (generatedName.test(filename) && !referenced.has(filename)) {
      unlinkSync(join(collectionDir, filename))
      process.stdout.write(`Removed superseded ${collection.id} asset ${filename}\n`)
    }
  }
}

async function main() {
  const apiKey = process.env.OPENSEA_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENSEA_API_KEY is required and remains server-side')
  const rpcUrl = process.env.MUSEUM_BASE_RPC_URL?.trim() || DEFAULT_BASE_RPC_URL
  const curation = readJson(CURATION_PATH)
  const assetVersion = safeVersion(curation.assetVersion)
  const { selections } = validateCuration(curation)
  await verifySelections(selections, rpcUrl)

  const outputRootPath = decodeURIComponent(OUTPUT_ROOT.pathname)
  const preparedCollections = {}
  for (const collection of Object.values(COLLECTIONS)) {
    preparedCollections[collection.id] = []
    for (const selection of selections[collection.id]) {
      preparedCollections[collection.id].push(
        await prepareWork(collection, selection, apiKey, assetVersion, outputRootPath),
      )
      process.stdout.write(`Prepared ${collection.id} #${selection.tokenId}\n`)
    }
  }

  const manifestPath = join(outputRootPath, 'manifest.json')
  const manifest = readJson(manifestPath)
  for (const collection of Object.values(COLLECTIONS)) {
    const existing = manifest.collections?.[collection.id]
    if (!existing) throw new Error(`Existing manifest is missing ${collection.id}`)
    manifest.collections[collection.id] = {
      ...existing,
      title: collection.title,
      collectionUrl: collection.collectionUrl,
      works: preparedCollections[collection.id],
    }
  }
  manifest.generatedAt = new Date().toISOString()
  manifest.collectorCuration = {
    assetVersion,
    snapshot: curation.snapshot,
    policy: curation.policy,
  }
  const temporaryManifestPath = `${manifestPath}.${process.pid}.tmp`
  writeFileSync(temporaryManifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  renameSync(temporaryManifestPath, manifestPath)
  for (const collection of Object.values(COLLECTIONS)) {
    removeSupersededCollectorAssets(collection, preparedCollections[collection.id], outputRootPath)
  }
  process.stdout.write(`Collector curation installed without changing the other galleries.\n`)
}

await main()
