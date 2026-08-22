import * as THREE from 'three'
import type { OwnedNftAnimationKind } from './ownedNfts'

export type FormalRoomArtwork = {
  id: string
  title: string
  artist: string
  year: string
  orientation: 'portrait' | 'landscape'
  accent: string
  frameSize: readonly [number, number]
  position: readonly [number, number, number]
  imageUrl?: string
  thumbnailUrl?: string
  animationUrl?: string
  animationKind?: OwnedNftAnimationKind
  openseaUrl?: string
  sourceUrl?: string
  tokenKey?: string
  source?: 'sample' | 'wallet'
}

export const FORMAL_ROOM_ARTWORKS: readonly FormalRoomArtwork[] = [
  {
    id: 'yes-yes',
    title: 'Yes / Yes',
    artist: 'Joseph Pixler × OpenSea',
    year: '2025',
    orientation: 'portrait',
    accent: '#f05aa8',
    frameSize: [1.72, 2.24],
    position: [-3.55, 0.36, -1.86],
    imageUrl: '/museum/formal-room/placeholders/yes-yes.webp',
    thumbnailUrl: '/museum/formal-room/placeholders/yes-yes.webp',
    animationUrl: '/museum/formal-room/placeholders/yes-yes.webp',
    animationKind: 'image',
    sourceUrl: 'https://opensea.io/collection/yes-yes-no',
    source: 'sample',
  },
  {
    id: 'enjoyables-official',
    title: 'Enjoyables!!!',
    artist: 'Museum of Based Art',
    year: '2024',
    orientation: 'landscape',
    accent: '#ff647c',
    frameSize: [3.05, 2.08],
    position: [0, 0.52, -1.84],
    imageUrl: '/museum/formal-room/placeholders/enjoyables-official.gif',
    thumbnailUrl: '/museum/formal-room/placeholders/enjoyables-official.gif',
    animationUrl: '/museum/formal-room/placeholders/enjoyables-official.gif',
    animationKind: 'image',
    sourceUrl: 'https://zora.co/collect/base:0x1426365a3a14a158c4fa2d4f02a56c5df36e3081/2?personalize=false',
    source: 'sample',
  },
  {
    id: 'curated-hearts',
    title: 'MoBA #2: Curated Hearts',
    artist: 'Museum of Based Art',
    year: '2025',
    orientation: 'portrait',
    accent: '#4dd9e7',
    frameSize: [1.72, 2.24],
    position: [3.55, 0.36, -1.86],
    imageUrl: '/museum/formal-room/placeholders/curated-hearts.webp',
    thumbnailUrl: '/museum/formal-room/placeholders/curated-hearts.webp',
    animationUrl: '/museum/formal-room/placeholders/curated-hearts.webp',
    animationKind: 'image',
    sourceUrl: 'https://opensea.io/collection/moba-2-curated-hearts/overview',
    source: 'sample',
  },
] as const

const INK = '#17131d'
const CREAM = '#fff2c7'

function createFallbackTexture(accent: string) {
  const color = new THREE.Color(accent)
  const texture = new THREE.DataTexture(
    new Uint8Array([
      Math.round(color.r * 255),
      Math.round(color.g * 255),
      Math.round(color.b * 255),
      255,
    ]),
    1,
    1,
    THREE.RGBAFormat,
  )
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width * 0.5, height * 0.5)
  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  context.lineTo(x + safeRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  context.lineTo(x, y + safeRadius)
  context.quadraticCurveTo(x, y, x + safeRadius, y)
  context.closePath()
}

function fillStroke(
  context: CanvasRenderingContext2D,
  fill: string,
  stroke = INK,
  lineWidth = 18,
) {
  context.fillStyle = fill
  context.fill()
  context.lineWidth = lineWidth
  context.strokeStyle = stroke
  context.stroke()
}

function drawSparkle(context: CanvasRenderingContext2D, x: number, y: number, size: number, color = CREAM) {
  context.save()
  context.translate(x, y)
  context.beginPath()
  context.moveTo(0, -size)
  context.quadraticCurveTo(size * 0.16, -size * 0.16, size, 0)
  context.quadraticCurveTo(size * 0.16, size * 0.16, 0, size)
  context.quadraticCurveTo(-size * 0.16, size * 0.16, -size, 0)
  context.quadraticCurveTo(-size * 0.16, -size * 0.16, 0, -size)
  context.closePath()
  fillStroke(context, color, INK, Math.max(6, size * 0.16))
  context.restore()
}

function drawGardenOrbit(context: CanvasRenderingContext2D, width: number, height: number) {
  context.fillStyle = '#ef8cb4'
  context.fillRect(0, 0, width, height)

  context.fillStyle = '#f5b1c9'
  context.beginPath()
  context.arc(width * 0.13, height * 0.18, width * 0.24, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#cb6ca2'
  context.beginPath()
  context.arc(width * 0.92, height * 0.82, width * 0.34, 0, Math.PI * 2)
  context.fill()

  context.save()
  context.translate(width * 0.52, height * 0.52)
  context.rotate(-0.14)
  context.beginPath()
  context.ellipse(0, 40, width * 0.31, height * 0.24, 0, 0, Math.PI * 2)
  fillStroke(context, '#65ddc3', INK, 22)
  context.beginPath()
  context.ellipse(-width * 0.045, 10, width * 0.24, height * 0.17, -0.12, 0, Math.PI * 2)
  fillStroke(context, '#a8f2d3', INK, 12)

  context.fillStyle = INK
  context.beginPath()
  context.ellipse(-width * 0.085, 5, 17, 27, 0, 0, Math.PI * 2)
  context.ellipse(width * 0.075, 0, 17, 27, 0, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#ffffff'
  context.beginPath()
  context.arc(-width * 0.09, -4, 5.5, 0, Math.PI * 2)
  context.arc(width * 0.07, -9, 5.5, 0, Math.PI * 2)
  context.fill()
  context.beginPath()
  context.arc(0, 70, 44, 0.1, Math.PI - 0.1)
  context.lineWidth = 16
  context.strokeStyle = INK
  context.stroke()
  context.restore()

  context.save()
  context.translate(width * 0.5, height * 0.52)
  context.rotate(-0.32)
  context.beginPath()
  context.ellipse(0, 32, width * 0.45, height * 0.055, 0, 0, Math.PI * 2)
  context.lineWidth = 17
  context.strokeStyle = '#f7d767'
  context.stroke()
  context.restore()

  const blooms = [
    [width * 0.23, height * 0.22, '#ffd862'],
    [width * 0.7, height * 0.2, '#9a7bea'],
    [width * 0.78, height * 0.68, '#ff735f'],
  ] as const
  blooms.forEach(([x, y, color], bloomIndex) => {
    for (let petal = 0; petal < 6; petal += 1) {
      const angle = (petal / 6) * Math.PI * 2 + bloomIndex * 0.14
      context.beginPath()
      context.ellipse(
        x + Math.cos(angle) * 45,
        y + Math.sin(angle) * 45,
        25,
        48,
        angle + Math.PI * 0.5,
        0,
        Math.PI * 2,
      )
      fillStroke(context, color, INK, 9)
    }
    context.beginPath()
    context.arc(x, y, 27, 0, Math.PI * 2)
    fillStroke(context, CREAM, INK, 10)
  })

  drawSparkle(context, width * 0.19, height * 0.77, 34)
  drawSparkle(context, width * 0.82, height * 0.38, 25, '#b9ffec')
}

function drawLittleEnjoyer(context: CanvasRenderingContext2D, width: number, height: number) {
  context.fillStyle = '#71c9bf'
  context.fillRect(0, 0, width, height)

  context.fillStyle = '#8de0ce'
  context.beginPath()
  context.arc(width * 0.18, height * 0.15, height * 0.36, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#4e9f9a'
  context.beginPath()
  context.arc(width * 0.87, height * 0.84, height * 0.44, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#f2d59b'
  context.fillRect(0, height * 0.76, width, height * 0.24)
  context.lineWidth = 16
  context.strokeStyle = INK
  context.beginPath()
  context.moveTo(0, height * 0.76)
  context.lineTo(width, height * 0.76)
  context.stroke()

  roundedRect(context, width * 0.11, height * 0.12, width * 0.78, height * 0.57, 54)
  fillStroke(context, '#f7e1af', INK, 24)
  roundedRect(context, width * 0.17, height * 0.18, width * 0.66, height * 0.45, 42)
  fillStroke(context, '#354266', INK, 14)

  context.fillStyle = '#25324f'
  context.beginPath()
  context.arc(width * 0.49, height * 0.43, height * 0.22, 0, Math.PI * 2)
  context.fill()
  context.beginPath()
  context.arc(width * 0.49, height * 0.43, height * 0.19, 0, Math.PI * 2)
  fillStroke(context, '#a37de8', INK, 13)

  context.beginPath()
  context.arc(width * 0.49, height * 0.43, height * 0.12, 0, Math.PI * 2)
  fillStroke(context, '#69edcb', INK, 12)
  context.fillStyle = INK
  context.beginPath()
  context.ellipse(width * 0.455, height * 0.405, 15, 22, 0, 0, Math.PI * 2)
  context.ellipse(width * 0.535, height * 0.405, 15, 22, 0, 0, Math.PI * 2)
  context.fill()
  context.beginPath()
  context.arc(width * 0.495, height * 0.47, 37, 0.18, Math.PI - 0.18)
  context.lineWidth = 14
  context.strokeStyle = INK
  context.stroke()

  const legs = [width * 0.43, width * 0.56]
  legs.forEach((x, index) => {
    context.beginPath()
    context.moveTo(x, height * 0.55)
    context.quadraticCurveTo(x + (index === 0 ? -38 : 38), height * 0.69, x + (index === 0 ? -72 : 72), height * 0.77)
    context.lineWidth = 28
    context.strokeStyle = INK
    context.stroke()
    context.lineWidth = 17
    context.strokeStyle = index === 0 ? '#ff8cb8' : '#f8d55f'
    context.stroke()
  })

  roundedRect(context, width * 0.075, height * 0.79, width * 0.22, height * 0.11, 30)
  fillStroke(context, '#d68248', INK, 14)
  roundedRect(context, width * 0.705, height * 0.79, width * 0.22, height * 0.11, 30)
  fillStroke(context, '#d68248', INK, 14)

  drawSparkle(context, width * 0.11, height * 0.23, 28, '#fff2b2')
  drawSparkle(context, width * 0.88, height * 0.26, 36, '#ff9cc8')
}

function drawMidnightSignal(context: CanvasRenderingContext2D, width: number, height: number) {
  context.fillStyle = '#30264f'
  context.fillRect(0, 0, width, height)

  context.fillStyle = '#514476'
  context.beginPath()
  context.arc(width * 0.16, height * 0.2, width * 0.28, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#221a3d'
  context.beginPath()
  context.arc(width * 0.94, height * 0.74, width * 0.4, 0, Math.PI * 2)
  context.fill()

  context.beginPath()
  context.arc(width * 0.51, height * 0.27, width * 0.18, 0, Math.PI * 2)
  fillStroke(context, '#ffd76e', INK, 17)
  context.beginPath()
  context.arc(width * 0.58, height * 0.22, width * 0.16, 0, Math.PI * 2)
  context.fillStyle = '#30264f'
  context.fill()

  const towers = [
    [width * 0.16, height * 0.55, width * 0.2, height * 0.31, '#ec7d7b'],
    [width * 0.41, height * 0.44, width * 0.22, height * 0.42, '#65cdbf'],
    [width * 0.67, height * 0.59, width * 0.18, height * 0.27, '#9f7be5'],
  ] as const
  towers.forEach(([x, y, towerWidth, towerHeight, color], towerIndex) => {
    roundedRect(context, x, y, towerWidth, towerHeight, 22)
    fillStroke(context, color, INK, 15)
    context.fillStyle = CREAM
    const rows = towerIndex === 1 ? 4 : 2
    for (let row = 0; row < rows; row += 1) {
      context.beginPath()
      context.arc(x + towerWidth * 0.5, y + 46 + row * 62, 13, 0, Math.PI * 2)
      context.fill()
    }
  })

  context.beginPath()
  context.ellipse(width * 0.5, height * 0.9, width * 0.44, height * 0.08, 0, 0, Math.PI * 2)
  fillStroke(context, '#1b1729', INK, 8)
  context.beginPath()
  context.ellipse(width * 0.5, height * 0.89, width * 0.32, height * 0.045, 0, 0, Math.PI * 2)
  context.fillStyle = '#f7cd67'
  context.fill()

  context.beginPath()
  context.moveTo(width * 0.12, height * 0.43)
  context.bezierCurveTo(width * 0.25, height * 0.32, width * 0.34, height * 0.34, width * 0.47, height * 0.25)
  context.bezierCurveTo(width * 0.62, height * 0.15, width * 0.76, height * 0.25, width * 0.89, height * 0.13)
  context.lineWidth = 12
  context.strokeStyle = '#8ff2d8'
  context.stroke()

  drawSparkle(context, width * 0.2, height * 0.15, 26, '#ff91c2')
  drawSparkle(context, width * 0.82, height * 0.36, 32, '#8ff2d8')
  drawSparkle(context, width * 0.7, height * 0.11, 18, CREAM)
}

function drawWalletArtworkPlaceholder(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  accent: string,
) {
  context.fillStyle = '#28202f'
  context.fillRect(0, 0, width, height)
  context.globalAlpha = 0.34
  context.fillStyle = accent
  context.fillRect(0, 0, width, height)
  context.globalAlpha = 1

  const shortSide = Math.min(width, height)
  context.strokeStyle = '#fff0c7'
  context.lineWidth = Math.max(12, shortSide * 0.025)
  context.setLineDash([shortSide * 0.055, shortSide * 0.035])
  context.strokeRect(shortSide * 0.08, shortSide * 0.08, width - shortSide * 0.16, height - shortSide * 0.16)
  context.setLineDash([])

  context.fillStyle = '#fff0c7'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `900 ${Math.round(shortSide * 0.055)}px Arial Black, Impact, sans-serif`
  context.fillText('PREPARING ARTWORK', width * 0.5, height * 0.5)
}

export function getFormalRoomArtworkTextureSize(
  frameSize: readonly [number, number],
  longEdge: number,
): readonly [number, number] {
  const safeLongEdge = Math.max(1, Math.round(longEdge))
  const frameWidth = Math.max(Number.EPSILON, frameSize[0])
  const frameHeight = Math.max(Number.EPSILON, frameSize[1])

  if (frameWidth >= frameHeight) {
    return [safeLongEdge, Math.max(1, Math.round(safeLongEdge * frameHeight / frameWidth))]
  }
  return [Math.max(1, Math.round(safeLongEdge * frameWidth / frameHeight)), safeLongEdge]
}

export function createFormalRoomArtworkTexture(
  artwork: FormalRoomArtwork,
  longEdge = 2048,
) {
  if (typeof document === 'undefined') return createFallbackTexture(artwork.accent)

  const canvas = document.createElement('canvas')
  const [canvasWidth, canvasHeight] = getFormalRoomArtworkTextureSize(artwork.frameSize, longEdge)
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const context = canvas.getContext('2d')
  if (!context) return createFallbackTexture(artwork.accent)

  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'

  if (artwork.id === 'garden-orbit') drawGardenOrbit(context, canvas.width, canvas.height)
  if (artwork.id === 'little-enjoyer') drawLittleEnjoyer(context, canvas.width, canvas.height)
  if (artwork.id === 'midnight-signal') drawMidnightSignal(context, canvas.width, canvas.height)
  if (artwork.source === 'sample' && artwork.imageUrl) {
    drawWalletArtworkPlaceholder(context, canvas.width, canvas.height, artwork.accent)
  }
  if (artwork.source === 'wallet') {
    drawWalletArtworkPlaceholder(context, canvas.width, canvas.height, artwork.accent)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

export function paintFormalRoomArtworkImage(
  texture: THREE.Texture,
  image: HTMLImageElement | HTMLVideoElement | VideoFrame,
  accent: string,
) {
  const canvas = texture.image as HTMLCanvasElement | undefined
  if (!canvas || typeof canvas.getContext !== 'function') return
  const context = canvas.getContext('2d')
  const sourceWidth = 'videoWidth' in image
    ? image.videoWidth
    : 'naturalWidth' in image
      ? image.naturalWidth
      : image.displayWidth
  const sourceHeight = 'videoHeight' in image
    ? image.videoHeight
    : 'naturalHeight' in image
      ? image.naturalHeight
      : image.displayHeight
  if (!context || sourceWidth <= 0 || sourceHeight <= 0) return

  context.save()
  context.fillStyle = '#28202f'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.globalAlpha = 0.28
  context.fillStyle = accent
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.globalAlpha = 1
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'

  const padding = Math.max(12, Math.round(Math.min(canvas.width, canvas.height) * 0.018))
  const availableWidth = canvas.width - padding * 2
  const availableHeight = canvas.height - padding * 2
  const scale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight)
  const drawWidth = sourceWidth * scale
  const drawHeight = sourceHeight * scale
  const x = (canvas.width - drawWidth) * 0.5
  const y = (canvas.height - drawHeight) * 0.5
  context.drawImage(image, x, y, drawWidth, drawHeight)
  context.restore()
  texture.needsUpdate = true
}

export function paintFormalRoomArtworkError(
  texture: THREE.Texture,
  accent: string,
) {
  const canvas = texture.image as HTMLCanvasElement | undefined
  if (!canvas || typeof canvas.getContext !== 'function') return
  const context = canvas.getContext('2d')
  if (!context) return

  const shortSide = Math.min(canvas.width, canvas.height)
  context.save()
  context.fillStyle = '#28202f'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.globalAlpha = 0.32
  context.fillStyle = accent
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.globalAlpha = 1
  context.strokeStyle = '#ed876e'
  context.lineWidth = Math.max(12, shortSide * 0.026)
  context.setLineDash([shortSide * 0.05, shortSide * 0.028])
  context.strokeRect(
    shortSide * 0.08,
    shortSide * 0.08,
    canvas.width - shortSide * 0.16,
    canvas.height - shortSide * 0.16,
  )
  context.setLineDash([])
  context.fillStyle = '#fff0c7'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `900 ${Math.round(shortSide * 0.052)}px Arial Black, Impact, sans-serif`
  context.fillText('ARTWORK UNAVAILABLE', canvas.width * 0.5, canvas.height * 0.47)
  context.fillStyle = '#edc6a8'
  context.font = `800 ${Math.round(shortSide * 0.027)}px Arial, Helvetica, sans-serif`
  context.fillText('RETURN TO THE COLLECTION DESK', canvas.width * 0.5, canvas.height * 0.56)
  context.restore()
  texture.needsUpdate = true
}
