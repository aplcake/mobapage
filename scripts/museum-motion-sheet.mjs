import sharp from 'sharp'

export const MUSEUM_MOTION_SHEET_TILE_SIZE = 160

export function averageFrameDuration(metadata) {
  const delays = Array.isArray(metadata.delay)
    ? metadata.delay.filter((delay) => Number.isFinite(delay) && delay > 0)
    : []
  if (delays.length === 0) return 80
  return Math.max(20, Math.round(delays.reduce((total, delay) => total + delay, 0) / delays.length))
}

export async function createMuseumMotionSheet(input, outputPath, frameCount, options = {}) {
  if (!Number.isInteger(frameCount) || frameCount < 2) {
    throw new Error(`Motion sheets require at least two frames; received ${frameCount}`)
  }

  const tileSize = options.tileSize ?? MUSEUM_MOTION_SHEET_TILE_SIZE
  const columns = Math.ceil(Math.sqrt(frameCount))
  const rows = Math.ceil(frameCount / columns)
  const tiles = []

  // Build one tile at a time. Holding five browser-sized GIF decoders open in
  // parallel briefly used hundreds of megabytes on lower-memory machines.
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const frame = await sharp(input, { animated: false, page: frameIndex })
      // The display mesh restores the artwork's original aspect ratio. Using
      // uniform cells here lets the UV player use one simple grid.
      .resize(tileSize, tileSize, { fit: 'fill' })
      .ensureAlpha()
      .png()
      .toBuffer()
    tiles.push({
      input: frame,
      left: (frameIndex % columns) * tileSize,
      top: Math.floor(frameIndex / columns) * tileSize,
    })
  }

  await sharp({
    create: {
      width: columns * tileSize,
      height: rows * tileSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(tiles)
    .webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(outputPath)

  return { columns, rows, tileSize }
}
