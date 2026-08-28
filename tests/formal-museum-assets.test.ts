import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import galleryManifest from '../public/museum/formal-room/galleries/manifest.json'

type ManifestWork = {
  id: string
  tokenId: string
  artist?: string
  motion: string | null
  motionSheet?: string | null
  motionSheetColumns?: number | null
  motionSheetRows?: number | null
  motionFrameDurationMs?: number | null
  frameCount: number
  width: number
  height: number
}

const motionWorks = Object.values(galleryManifest.collections)
  .flatMap((collection) => collection.works as ManifestWork[])
  .filter((work): work is ManifestWork & { motion: string } => Boolean(work.motion))
const expansionSource = readFileSync(
  new URL('../src/museum/formal-room/MuseumExpansion.tsx', import.meta.url),
  'utf8',
)
const formalRoomSource = readFileSync(
  new URL('../src/museum/formal-room/FormalMuseumRoom.tsx', import.meta.url),
  'utf8',
)

function publicPath(urlPath: string) {
  return join(process.cwd(), 'public', urlPath.replace(/^\//, ''))
}

describe('Formal museum animated artwork assets', () => {
  it('keeps all 35 real animations in the generated manifest', () => {
    const counts = Object.fromEntries(
      Object.entries(galleryManifest.collections).map(([id, collection]) => [
        id,
        collection.works.filter((work) => work.motion).length,
      ]),
    )
    expect(counts).toEqual({
      'moba-one': 12,
      'moba-two': 12,
      photography: 0,
      holiday: 6,
      'moba-gallery': 5,
    })
  })

  it('keeps the complete official MoBA Gallery collection and its authentic motion split', () => {
    const works = galleryManifest.collections['moba-gallery'].works as (ManifestWork & { tokenId: string })[]
    expect(works.map((work) => work.tokenId)).toEqual(['1', '2', '3', '4', '5', '6', '7', '9'])
    expect(works.filter((work) => work.motion).map((work) => work.tokenId)).toEqual(['1', '2', '3', '6', '7'])
    expect(works.filter((work) => !work.motion).map((work) => work.tokenId)).toEqual(['4', '5', '9'])
    expect(new Set(works.map((work) => work.id)).size).toBe(8)
  })

  it('keeps the authentic Holiday Potluck motion split exact', () => {
    const works = galleryManifest.collections.holiday.works as ManifestWork[]
    expect(works.filter((work) => work.motion).map((work) => work.id).sort()).toEqual([
      'holiday-1',
      'holiday-2',
      'holiday-3',
      'holiday-4',
      'holiday-7',
      'holiday-8',
    ])
    expect(works.filter((work) => !work.motion).map((work) => work.id).sort()).toEqual([
      'holiday-10',
      'holiday-11',
      'holiday-5',
      'holiday-6',
      'holiday-9',
    ])
  })

  it('credits every Holiday Potluck work from its Artist trait', () => {
    const works = galleryManifest.collections.holiday.works as ManifestWork[]
    expect(Object.fromEntries(works.map((work) => [work.tokenId, work.artist]))).toEqual({
      '1': 'Joseph Pixler',
      '2': 'Hitch (@hitchest)',
      '3': 'Maning',
      '4': 'Maning (@Maniinng)',
      '5': 'Eyebots (@Eyebots)',
      '6': 'Siku (@SIKUofficial)',
      '7': 'Ed (@0xEDDB)',
      '8': 'Xeries Jame (@xeriesjame_art)',
      '9': 'KUGUTSU (@KugutsuNFT)',
      '10': 'Veny (@VenyWonderland)',
      '11': 'Lapom (@0xLapom)',
    })
  })

  it('points every motion entry at a genuine multi-frame file', async () => {
    for (const work of motionWorks) {
      const assetPath = publicPath(work.motion)
      expect(existsSync(assetPath), work.id).toBe(true)

      const metadata = await sharp(assetPath, { animated: true }).metadata()
      expect(metadata.format, work.id).toBe(extname(assetPath).slice(1))
      expect(metadata.pages, work.id).toBe(work.frameCount)
      expect(metadata.pages ?? 1, work.id).toBeGreaterThan(1)
      expect(metadata.width, work.id).toBe(work.width)
      expect(metadata.pageHeight, work.id).toBe(work.height)

      const firstFrame = await sharp(assetPath, { page: 0 }).ensureAlpha().raw().toBuffer()
      const secondFrame = await sharp(assetPath, { page: 1 }).ensureAlpha().raw().toBuffer()
      const firstHash = createHash('sha256').update(firstFrame).digest('hex')
      const secondHash = createHash('sha256').update(secondFrame).digest('hex')
      expect(secondHash, `${work.id} repeats its first frame`).not.toBe(firstHash)
    }
  }, 45_000)

  it('keeps all 28 distinct bounce frames for every MoBA #2 heart', async () => {
    const works = galleryManifest.collections['moba-two'].works as ManifestWork[]
    expect(works).toHaveLength(12)

    for (const work of works) {
      expect(work.motion, work.id).toBeTruthy()
      const { data, info } = await sharp(publicPath(work.motion!), { animated: true })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      const frameBytes = work.width * work.height * info.channels
      const hashes = Array.from({ length: work.frameCount }, (_, frameIndex) => (
        createHash('sha256')
          .update(data.subarray(frameIndex * frameBytes, (frameIndex + 1) * frameBytes))
          .digest('hex')
      ))

      expect(info.height, work.id).toBe(work.height * work.frameCount)
      expect(work.frameCount, work.id).toBe(28)
      expect(new Set(hashes).size, `${work.id} has frozen or duplicate frames`).toBe(28)
    }
  }, 30_000)

  it('packs every MoBA #2 loop into a decoder-safe GPU motion sheet', async () => {
    const works = galleryManifest.collections['moba-two'].works as ManifestWork[]
    expect(works.filter((work) => work.motionSheet)).toHaveLength(12)

    for (const work of works) {
      expect(work.motionSheet, work.id).toBeTruthy()
      expect(work.motionSheetColumns, work.id).toBe(7)
      expect(work.motionSheetRows, work.id).toBe(4)
      expect(work.motionFrameDurationMs, work.id).toBeGreaterThanOrEqual(40)
      expect(work.motionFrameDurationMs, work.id).toBeLessThanOrEqual(50)
      const metadata = await sharp(publicPath(work.motionSheet!)).metadata()
      expect(metadata.format, work.id).toBe('webp')
      expect(metadata.pages ?? 1, work.id).toBe(1)
      expect(metadata.width, work.id).toBe(7 * 192)
      expect(metadata.height, work.id).toBe(4 * 192)
    }
  })

  it('packs all five animated MoBA Gallery works into compact GPU motion sheets', async () => {
    const works = galleryManifest.collections['moba-gallery'].works as ManifestWork[]
    const animatedWorks = works.filter((work) => work.motion)
    expect(animatedWorks).toHaveLength(5)

    for (const work of animatedWorks) {
      const expectedColumns = Math.ceil(Math.sqrt(work.frameCount))
      const expectedRows = Math.ceil(work.frameCount / expectedColumns)
      expect(work.motionSheet, work.id).toBeTruthy()
      expect(work.motionSheetColumns, work.id).toBe(expectedColumns)
      expect(work.motionSheetRows, work.id).toBe(expectedRows)
      expect(work.motionFrameDurationMs, work.id).toBe(100)

      const metadata = await sharp(publicPath(work.motionSheet!)).metadata()
      expect(metadata.format, work.id).toBe('webp')
      expect(metadata.pages ?? 1, work.id).toBe(1)
      expect(metadata.width, work.id).toBe(expectedColumns * 160)
      expect(metadata.height, work.id).toBe(expectedRows * 160)
    }
  })

  it('keeps decoder fallbacks paintable and MoBA #2 motion inside stationary frames', () => {
    expect(expansionSource).toContain("image.style.opacity = '0.01'")
    expect(expansionSource).toContain("image.style.left = `${fallbackSlot * 2}px`")
    expect(expansionSource).not.toContain('clip-path:inset(100%)')
    const artworkFrameSource = expansionSource.slice(
      expansionSource.indexOf('function GalleryArtworkFrame'),
      expansionSource.indexOf('function GalleryExhibition'),
    )
    expect(artworkFrameSource).not.toContain('HeartArtworkSurface')
    expect(artworkFrameSource).not.toContain('group.position.y')
    expect(artworkFrameSource).not.toContain('group.scale.set')
    expect(artworkFrameSource).toContain('{artworkSurface}')
    expect(expansionSource).toContain('<GalleryMotionSheetPlane')
    expect(expansionSource).toContain('artworkId={work.id}')
    expect(expansionSource).toContain('phaseFrames={animationIndex * 2}')
    expect(expansionSource).toContain('const frameIndex = (elapsedFrames + phaseFrames) % frameCount')
    expect(expansionSource).toContain('texture.offset.set(column / columns, 1 - (row + 1) / rows)')
    expect(expansionSource).toContain("probe.dataset.renderer = 'sprite-sheet'")
  })

  it('keeps every artwork base mounted while budgeting nearby detail and motion layers', () => {
    expect(expansionSource).toContain('animate={!reducedMotion}')
    expect(expansionSource).toContain('? performanceProfile.activeMotionFps')
    expect(expansionSource).toContain(': performanceProfile.distantMotionFps')
    expect(expansionSource).toContain('frameIndex = (frameIndex + frameAdvance) % frameCount')
    expect(expansionSource).toContain('const stableBaseSurface = atlasBoundary')
    expect(expansionSource).toContain('const detailedPoster = surfaceDetailed ? posterBoundary : null')
    expect(expansionSource).toContain('function useMuseumMotionVisibility')
    expect(expansionSource).toContain('const motionVisible = useMuseumMotionVisibility')
    expect(expansionSource).toContain('const motionDetailed = motionVisible && animate && Boolean(work.motion || work.motionSheet)')
    expect(expansionSource).not.toContain('function useMuseumDetailVisibility')
    expect(expansionSource).not.toContain('const motionVisible = useMuseumDetailVisibility')
    expect(expansionSource).not.toContain('surfaceDetailed ? posterBoundary : atlasBoundary')
    expect(expansionSource).not.toContain('active={activeGalleryId === gallery.id && !reducedMotion}')

    const exhibitionSource = expansionSource.slice(
      expansionSource.indexOf('function GalleryExhibition'),
      expansionSource.indexOf('function BouncingHeart'),
    )
    expect(exhibitionSource).toContain('animate={animate}')
    expect(exhibitionSource).toContain('motionFps={motionFps}')
    expect(exhibitionSource).toContain('performanceProfile={performanceProfile}')
    expect(exhibitionSource).not.toContain('activeGalleryId')
  })

  it('keeps museum architecture mounted while individual artwork textures load', () => {
    const sceneSource = formalRoomSource.slice(
      formalRoomSource.indexOf('function FormalRoomScene'),
      formalRoomSource.indexOf('export function FormalMuseumRoom'),
    )
    expect(sceneSource).toContain('<MuseumExpansion')
    expect(sceneSource).toContain('activeGalleryId={activeGalleryId}')
    expect(sceneSource).toContain('activeMuseumArea={activeMuseumArea}')
    expect(sceneSource).toContain('reducedMotion={reducedMotion}')
    expect(sceneSource).not.toMatch(/<Suspense fallback=\{null\}>\s*<MuseumExpansion/)

    const frameSource = expansionSource.slice(
      expansionSource.indexOf('function GalleryPosterPlane'),
      expansionSource.indexOf('function GalleryExhibition'),
    )
    const posterPlaneSource = frameSource.slice(
      frameSource.indexOf('function GalleryPosterPlane'),
      frameSource.indexOf('function GalleryPosterBoundary'),
    )
    expect(posterPlaneSource).toContain('usePosterTexture(poster)')
    const posterTextureHookSource = expansionSource.slice(
      expansionSource.indexOf('function usePosterTexture'),
      expansionSource.indexOf('function MuseumPosterAtlasPlane'),
    )
    expect(posterTextureHookSource).toContain('texture.dispose()')
    expect(posterTextureHookSource).not.toContain('loadedTexture.dispose()')
    expect(posterTextureHookSource).not.toContain('useLoader.clear')
    expect(frameSource).toContain('function GalleryPosterBoundary')
    expect(expansionSource).toContain('function MuseumPosterAtlasPlane')
    expect(frameSource).toContain('<Suspense fallback={fallback}>')
    expect(frameSource).toContain('fallback={atlasBoundary}')
    expect(frameSource).toContain('const stableBaseSurface = atlasBoundary')
    expect(frameSource).toContain('const detailedPoster = surfaceDetailed ? posterBoundary : null')
    expect(frameSource).toContain('<Suspense fallback={null}>')
    expect(frameSource).toContain('<GalleryMotionSheetPlane')
    const artworkFrameSource = frameSource.slice(
      frameSource.indexOf('function GalleryArtworkFrame'),
    )
    expect(artworkFrameSource).not.toContain('usePosterTexture(')
    expect(artworkFrameSource).not.toContain('useLoader(')
  })

  it('does not put the removed blocky Enjoyer sculpture back in MoBA #1', () => {
    expect(expansionSource).not.toContain('function EnjoyerTotem')
    expect(expansionSource).not.toContain('<EnjoyerTotem')
  })

  it('has no unreferenced generated motion files', () => {
    const referenced = new Set(motionWorks.map((work) => publicPath(work.motion)))
    const discovered = new Set(
      [...referenced]
        .flatMap((assetPath) => readdirSync(dirname(assetPath)).map((name) => join(dirname(assetPath), name)))
        .filter((assetPath) => /^(?:hero|motion-\d+|top-holders-[a-z0-9-]+-token-\d+-motion)\.(?:gif|png|webp)$/.test(basename(assetPath))),
    )
    expect([...discovered].sort()).toEqual([...referenced].sort())
  })
})
