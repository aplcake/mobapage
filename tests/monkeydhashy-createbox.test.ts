import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import {
  MONKEYDHASHY_CREATEBOX_SPEC,
  monkeydhashyCreateboxMotionAtTime,
} from '../src/museum/formal-room/monkeydhashyCreatebox'
import { MUSEUM_GALLERY_LIGHTING_PLANS } from '../src/museum/formal-room/museumLighting'
import { MUSEUM_GALLERY_BY_ID } from '../src/museum/formal-room/museumPlan'
import { museumGalleryArtworkDisplays } from '../src/museum/formal-room/museumGalleryDesign'
import {
  FORMAL_WALK_COLLIDERS,
  FORMAL_WALK_PLAYER_RADIUS,
  resolveFormalWalkPosition,
} from '../src/museum/formal-room/walkMath'

const componentSource = readFileSync(
  new URL('../src/museum/formal-room/MonkeydhashyCreateboxInstallation.tsx', import.meta.url),
  'utf8',
)
const expansionSource = readFileSync(
  new URL('../src/museum/formal-room/MuseumExpansion.tsx', import.meta.url),
  'utf8',
)

function publicAsset(path: string) {
  return join(process.cwd(), 'public', path.replace(/^\//, ''))
}

describe('MonkeyDHashy !Createbox MoBA #2 installation', () => {
  it('keeps the exact onchain work and exhibition credit authoritative', () => {
    expect(MONKEYDHASHY_CREATEBOX_SPEC).toMatchObject({
      galleryId: 'moba-two',
      title: '!Createbox',
      artist: 'Joseph Pixler',
      collection: 'MoBA Gallery',
      contract: '0x04619852f38ebec22bb94ef36b99351db9900194',
      tokenId: '6',
      owner: {
        address: '0xfbf8ae69b25542ac6833e2de631e7b082ffab1f5',
        label: 'MonkeyDHashy',
      },
      edition: {
        originalSupply: 50,
        burned: 49,
        surviving: 1,
        label: '1/1',
      },
    })
    expect(MONKEYDHASHY_CREATEBOX_SPEC.sourceUrl).toBe(
      'https://opensea.io/item/base/0x04619852f38ebec22bb94ef36b99351db9900194/6',
    )
    expect(componentSource).toContain('SOLE SURVIVING !CREATEBOX')
    expect(componentSource).toContain("context.fillText('MONKEYDHASHY'")
    expect(componentSource).toContain('1 / 1  ·  49 OF 50 BURNED')
    expect(componentSource).toContain('[MUSEUM_ARTWORK_USER_DATA_KEY]: provenance')
  })

  it('preserves the full 20-frame original and a crisp decoder-safe motion sheet', async () => {
    const originalPath = publicAsset(MONKEYDHASHY_CREATEBOX_SPEC.media.original)
    const original = readFileSync(originalPath)
    expect(createHash('sha256').update(original).digest('hex')).toBe(
      MONKEYDHASHY_CREATEBOX_SPEC.media.sourceSha256,
    )
    const originalMetadata = await sharp(originalPath, { animated: true }).metadata()
    expect(originalMetadata).toMatchObject({
      format: 'gif',
      width: 1125,
      pageHeight: 1125,
      pages: 20,
    })

    const sheetPath = publicAsset(MONKEYDHASHY_CREATEBOX_SPEC.media.motionSheet)
    const sheetMetadata = await sharp(sheetPath).metadata()
    expect(sheetMetadata).toMatchObject({ format: 'webp', width: 1920, height: 1536 })
    const firstFrame = await sharp(sheetPath).extract({ left: 0, top: 0, width: 384, height: 384 }).raw().toBuffer()
    const secondFrame = await sharp(sheetPath).extract({ left: 384, top: 0, width: 384, height: 384 }).raw().toBuffer()
    expect(createHash('sha256').update(secondFrame).digest('hex')).not.toBe(
      createHash('sha256').update(firstFrame).digest('hex'),
    )

    const posterMetadata = await sharp(publicAsset(MONKEYDHASHY_CREATEBOX_SPEC.media.poster)).metadata()
    expect(posterMetadata).toMatchObject({ format: 'webp', width: 768, height: 768 })
  })

  it('rotates and floats around an authored pose, then freezes cleanly for reduced motion', () => {
    const samples = Array.from({ length: 300 }, (_, index) => (
      monkeydhashyCreateboxMotionAtTime(index / 30)
    ))
    for (const motion of samples) {
      expect(Math.abs(motion.floatY)).toBeLessThanOrEqual(MONKEYDHASHY_CREATEBOX_SPEC.box.floatHeight + 0.0001)
      expect(motion.shimmer).toBeGreaterThanOrEqual(0)
      expect(motion.shimmer).toBeLessThanOrEqual(1)
      for (const value of Object.values(motion)) expect(Number.isFinite(value)).toBe(true)
    }
    expect(monkeydhashyCreateboxMotionAtTime(4).rotationY).not.toBe(
      monkeydhashyCreateboxMotionAtTime(0).rotationY,
    )
    const reduced = monkeydhashyCreateboxMotionAtTime(0, true)
    expect(monkeydhashyCreateboxMotionAtTime(8.5, true)).toEqual(reduced)
    expect(reduced.rotationX).toBe(MONKEYDHASHY_CREATEBOX_SPEC.box.baselineRotation[0])
  })

  it('forms a compact corner vignette without replacing holder art or blocking a viewing lane', () => {
    const gallery = MUSEUM_GALLERY_BY_ID['moba-two']
    const displays = museumGalleryArtworkDisplays(gallery)
    const leftB = museumGalleryArtworkDisplays(gallery).find((display) => display.id === 'left-b')!
    expect(leftB.wall).toBe('right')
    expect(leftB.position[0]).toBe(5.65)
    expect(MONKEYDHASHY_CREATEBOX_SPEC.backdrop.position[0]).toBe(-5.65)
    expect(MONKEYDHASHY_CREATEBOX_SPEC.backdrop.position[1]).toBe(0.72)
    expect(MONKEYDHASHY_CREATEBOX_SPEC.backdrop.outerSize[0]).toBeLessThan(1.5)
    expect(
      MONKEYDHASHY_CREATEBOX_SPEC.pedestal.position[0]
      - MONKEYDHASHY_CREATEBOX_SPEC.backdrop.position[0],
    ).toBeCloseTo(1.85)
    expect(
      MONKEYDHASHY_CREATEBOX_SPEC.pedestal.position[2]
      - MONKEYDHASHY_CREATEBOX_SPEC.backdrop.position[2],
    ).toBeCloseTo(0.56)
    const neighboringLeftWallArt = displays.filter((display) => display.wall === 'left')
    for (const display of neighboringLeftWallArt) {
      expect(Math.abs(display.position[2] - MONKEYDHASHY_CREATEBOX_SPEC.backdrop.position[2]))
        .toBeGreaterThan(3.5)
    }
    expect(displays.find((display) => display.id === 'left-a')?.wall).toBe('boundary-left-inner')
    expect(componentSource).not.toContain('CreateboxGalleryBay')
    expect(componentSource).not.toContain("installationPart: 'createbox-floor-inlay'")
    const backdropSource = componentSource.slice(
      componentSource.indexOf('function CreateboxBackdropFrame'),
      componentSource.indexOf('export function MonkeydhashyCreateboxInstallation'),
    )
    expect(backdropSource).not.toContain('octahedronGeometry')
    expect(backdropSource).not.toContain('outerWidth * 1.24')

    const collider = FORMAL_WALK_COLLIDERS.find((candidate) => (
      candidate.id === MONKEYDHASHY_CREATEBOX_SPEC.collider.id
    ))!
    expect(collider).toEqual(MONKEYDHASHY_CREATEBOX_SPEC.collider)
    expect(-14.7 - FORMAL_WALK_PLAYER_RADIUS).toBeGreaterThan(collider.maxX)
    expect(resolveFormalWalkPosition(
      { x: -14.7, z: 23.2 },
      { x: -16, z: 23.2 },
    )).toEqual({ x: -14.7, z: 23.2 })

    expect(expansionSource.match(/<MonkeydhashyCreateboxInstallation/g)).toHaveLength(1)
    expect(expansionSource).toContain('<BouncingHeart reducedMotion={reducedMotion} lit={active} />')
    expect(museumGalleryArtworkDisplays(gallery)).toHaveLength(12)
  })

  it('uses one authored room light plus local foil washes without adding shadow lights', () => {
    const lighting = MUSEUM_GALLERY_LIGHTING_PLANS['moba-two']
    expect(lighting).toHaveLength(3)
    expect(lighting[0]).toMatchObject({
      id: 'moba-two-createbox-prismatic-key',
      position: MONKEYDHASHY_CREATEBOX_SPEC.lights[0].position,
      target: MONKEYDHASHY_CREATEBOX_SPEC.lights[0].target,
      color: '#9ef7ff',
      intensity: 3.8,
    })
    expect(componentSource).toContain('HOLO_FRAGMENT_SHADER')
    expect(componentSource).toContain('iridescence={1}')
    expect(componentSource).toContain('toneMapped={false}')
    expect(componentSource).toContain('<Suspense fallback={<CreateboxBackdropPlaceholder />}>')
    expect(componentSource).not.toContain('<pointLight')
    expect(componentSource).not.toContain('<spotLight')
    expect(componentSource).not.toContain('castShadow')
  })
})
