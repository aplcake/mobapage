import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MUSEUM_GALLERY_WALL_BOTTOM,
  MUSEUM_GALLERY_WALL_TOP,
  MUSEUM_GALLERY_BOUNDARY_WALL_THICKNESS,
  MUSEUM_GALLERY_BOUNDARY_CASING_DEPTH,
  MUSEUM_GALLERY_ATRIUM_PORTALS,
  MUSEUM_ATRIUM_COLUMN_ZS,
  MUSEUM_ATRIUM_COLUMN_VERTICALS,
  MUSEUM_ATRIUM_REAR_WALL_SEGMENTS,
  MUSEUM_GALLERY_BENCH_COLLIDERS,
  MUSEUM_GALLERY_END_WALL_COLLIDERS,
  MUSEUM_GALLERY_INTERIORS,
  MUSEUM_GALLERY_PORTAL_RETURN_COLLIDERS,
  MUSEUM_GALLERY_THRESHOLD_WALL_COLLIDERS,
  MUSEUM_LOOP_WALL_RETURNS,
  MUSEUM_LOOP_WALL_RETURN_COLLIDERS,
  MUSEUM_GALLERY_SIDE_WALL_CENTER_X,
  MUSEUM_GALLERY_SIDE_WALL_THICKNESS,
  MOBA_ONE_PARQUET_SPEC,
  MOBA_TWO_TERRAZZO_SPEC,
  MUSEUM_STRUCTURAL_SLABS,
  HOLIDAY_CEILING_STAR_SPECS,
  HOLIDAY_RETURN_WREATH_SPEC,
  museumGalleryArtworkDisplays,
  museumGalleryAtriumPortalBounds,
  museumGalleryAtriumPortalCasing,
  museumGalleryBoundaryCasingZ,
  museumGalleryBoundaryOpening,
  museumGalleryBoundaryWallPanels,
  museumGalleryThresholdSignLayout,
  museumPhotographyIntroSignLayout,
  museumGalleryPortalReturns,
  museumGalleryWallPanels,
  museumGalleryWallOpenings,
  museumGalleryWindowIsAtriumTransom,
  museumMobaOneParquetBoards,
  museumMobaTwoTerrazzoChips,
  museumGalleryZ,
  type MuseumArtworkDisplay,
  type PermanentMuseumGalleryId,
} from '../src/museum/formal-room/museumGalleryDesign'
import { MUSEUM_GALLERIES, type MuseumGalleryPlan } from '../src/museum/formal-room/museumPlan'
import {
  MUSEUM_ATRIUM_TREE_SPECS,
  MUSEUM_ATRIUM_TREE_VISUAL_RADIUS,
  MUSEUM_EXTERIOR_TREE_SPECS,
} from '../src/museum/formal-room/museumTreeDesign'
import {
  MUSEUM_ATRIUM_LIGHTING_PLAN,
  MUSEUM_GALLERY_LIGHTING_PLANS,
  MUSEUM_GALLERY_SURFACE_LIGHTING,
  MUSEUM_LIGHTING_BUDGET,
  type PermanentMuseumGalleryId as LightingGalleryId,
} from '../src/museum/formal-room/museumLighting'
import {
  FORMAL_WALK_COLLIDERS,
  FORMAL_WALK_PLAYER_RADIUS,
  resolveFormalWalkPosition,
} from '../src/museum/formal-room/walkMath'

const permanentGalleries = MUSEUM_GALLERIES.filter(
  (gallery): gallery is MuseumGalleryPlan & { id: PermanentMuseumGalleryId } => gallery.id !== 'lobby',
)
const expansionSource = readFileSync(
  new URL('../src/museum/formal-room/MuseumExpansion.tsx', import.meta.url),
  'utf8',
)

function overlapArea(
  first: { minY: number; maxY: number; minZ: number; maxZ: number },
  second: { minY: number; maxY: number; minZ: number; maxZ: number },
) {
  return Math.max(0, Math.min(first.maxY, second.maxY) - Math.max(first.minY, second.minY))
    * Math.max(0, Math.min(first.maxZ, second.maxZ) - Math.max(first.minZ, second.minZ))
}

function overlapVolume(
  first: { x: number; y: number; z: number; width: number; height: number; depth: number },
  second: { x: number; y: number; z: number; width: number; height: number; depth: number },
) {
  const overlap = (firstCenter: number, firstSize: number, secondCenter: number, secondSize: number) => (
    Math.max(0, Math.min(firstCenter + firstSize * 0.5, secondCenter + secondSize * 0.5)
      - Math.max(firstCenter - firstSize * 0.5, secondCenter - secondSize * 0.5))
  )
  return overlap(first.x, first.width, second.x, second.width)
    * overlap(first.y, first.height, second.y, second.height)
    * overlap(first.z, first.depth, second.z, second.depth)
}

describe('Formal museum authored gallery design', () => {
  it('keeps structural columns, portal casings, and boundary trim in separate physical layers', () => {
    const wallFaceX = MUSEUM_GALLERY_SIDE_WALL_CENTER_X - MUSEUM_GALLERY_SIDE_WALL_THICKNESS * 0.5

    for (const gallery of permanentGalleries) {
      const casing = museumGalleryAtriumPortalCasing(gallery)
      expect(casing).toHaveLength(6)

      for (const part of casing) {
        expect(
          wallFaceX - (part.x + part.width * 0.5),
          `${gallery.id}/${part.id} must sit clear of the structural wall face`,
        ).toBeGreaterThanOrEqual(0.011)
      }

      for (let firstIndex = 0; firstIndex < casing.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < casing.length; secondIndex += 1) {
          expect(
            overlapVolume(casing[firstIndex], casing[secondIndex]),
            `${gallery.id}/${casing[firstIndex].id} overlaps ${casing[secondIndex].id}`,
          ).toBeLessThanOrEqual(1e-9)
        }
      }

      for (const wallZ of [gallery.minZ + 0.08, gallery.maxZ - 0.18]) {
        const casingZ = museumGalleryBoundaryCasingZ(wallZ)
        const structuralFaceZ = wallZ - MUSEUM_GALLERY_BOUNDARY_WALL_THICKNESS * 0.5
        expect(structuralFaceZ - (casingZ + MUSEUM_GALLERY_BOUNDARY_CASING_DEPTH * 0.5)).toBeGreaterThanOrEqual(0.011)
      }
    }

    const columnParts = Object.values(MUSEUM_ATRIUM_COLUMN_VERTICALS)
    for (let firstIndex = 0; firstIndex < columnParts.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < columnParts.length; secondIndex += 1) {
        const first = columnParts[firstIndex]
        const second = columnParts[secondIndex]
        const gap = Math.max(
          first.centerY - first.height * 0.5 - (second.centerY + second.height * 0.5),
          second.centerY - second.height * 0.5 - (first.centerY + first.height * 0.5),
        )
        expect(gap).toBeGreaterThanOrEqual(0.009)
      }
    }

    expect(expansionSource).toContain('museumGalleryAtriumPortalCasing(gallery)')
    expect(expansionSource).toContain('MUSEUM_ATRIUM_COLUMN_VERTICALS.shaft')
  })

  it('hangs the complete collection once in a room-specific authored plan', () => {
    for (const gallery of permanentGalleries) {
      const interior = MUSEUM_GALLERY_INTERIORS[gallery.id]
      const displays = museumGalleryArtworkDisplays(gallery)

      expect(interior.artworkSlots).toHaveLength(gallery.artworks.length)
      expect(displays.map((display) => display.work.id)).toEqual(
        interior.artworkSlots.map((slot) => slot.artworkId),
      )
      expect(displays.map((display) => display.work.id).sort()).toEqual(
        gallery.artworks.map((work) => work.id).sort(),
      )
      expect(new Set(displays.map((display) => display.id)).size).toBe(displays.length)
      expect(new Set(interior.artworkSlots.map((slot) => slot.artworkId)).size).toBe(displays.length)
      expect(interior.artworkSlots.filter((slot) => slot.wall.startsWith('end-'))).toHaveLength(2)

      for (const display of displays.filter((candidate) => candidate.wall.startsWith('portal-'))) {
        const portalReturn = museumGalleryPortalReturns(gallery).find((candidate) => candidate.id === display.wall)!
        expect(Math.hypot(
          display.position[0] - portalReturn.centerX,
          display.position[2] - portalReturn.centerZ,
        )).toBeCloseTo(0.18, 8)
      }
    }
  })

  it('gives every room a distinct architectural identity, hanging rhythm, and focal wall', () => {
    const architecture = permanentGalleries.map((gallery) => MUSEUM_GALLERY_INTERIORS[gallery.id].architecture)
    expect(new Set(architecture).size).toBe(permanentGalleries.length)

    const signatures = permanentGalleries.map((gallery) => {
      const interior = MUSEUM_GALLERY_INTERIORS[gallery.id]
      return interior.artworkSlots
        .map((slot) => `${slot.wall}:${slot.t ?? 'end'}:${slot.y}:${slot.scale}`)
        .join('|')
    })
    expect(new Set(signatures).size).toBe(permanentGalleries.length)

    for (const gallery of permanentGalleries) {
      const interior = MUSEUM_GALLERY_INTERIORS[gallery.id]
      expect(new Set(interior.artworkSlots.map((slot) => slot.scale)).size).toBeGreaterThanOrEqual(4)
      expect(new Set(interior.artworkSlots.map((slot) => slot.y)).size).toBeGreaterThanOrEqual(4)

      const featuredSlots = interior.artworkSlots.filter((slot) => slot.featured)
      if (gallery.id === 'photography') {
        expect(featuredSlots).toHaveLength(0)
        expect(interior.artworkSlots.every((slot) => (slot.roll ?? 0) === 0)).toBe(true)
      } else {
        expect(featuredSlots).toHaveLength(1)
        expect(featuredSlots[0].wall).toMatch(/^end-/)
        expect(featuredSlots[0].scale).toBeGreaterThanOrEqual(1.15)
        expect(museumGalleryArtworkDisplays(gallery).find((display) => display.featured)?.work.featured).toBe(true)
        if (gallery.id === 'moba-two') {
          expect(interior.artworkSlots.every((slot) => (slot.roll ?? 0) === 0)).toBe(true)
        } else {
          expect(new Set(interior.artworkSlots.map((slot) => slot.roll ?? 0)).size).toBeGreaterThanOrEqual(4)
        }
      }
    }
  })

  it('provides real daylight architecture and one derived museum bench per room', () => {
    for (const gallery of permanentGalleries) {
      const interior = MUSEUM_GALLERY_INTERIORS[gallery.id]
      expect(interior.windows.length).toBeGreaterThanOrEqual(2)
      expect(interior.skylights.length).toBeGreaterThanOrEqual(2)
      expect(interior.bench.length).toBeGreaterThan(2.5)
      expect(interior.bench.depth).toBeLessThan(0.9)
    }

    expect(MUSEUM_GALLERY_INTERIORS.photography.windows).toHaveLength(4)
    expect(MUSEUM_GALLERY_INTERIORS['moba-two'].skylights).toHaveLength(3)
    expect(MUSEUM_GALLERY_BENCH_COLLIDERS.map((collider) => collider.id).sort()).toEqual([
      'holiday-bench',
      'moba-one-bench',
      'moba-two-bench',
      'photography-bench',
    ])
    const colliderIds = new Set(FORMAL_WALK_COLLIDERS.map((collider) => collider.id))
    expect(MUSEUM_GALLERY_END_WALL_COLLIDERS).toHaveLength(8)
    expect(MUSEUM_GALLERY_THRESHOLD_WALL_COLLIDERS).toHaveLength(8)
    for (const collider of [
      ...MUSEUM_GALLERY_BENCH_COLLIDERS,
      ...MUSEUM_GALLERY_END_WALL_COLLIDERS,
      ...MUSEUM_GALLERY_THRESHOLD_WALL_COLLIDERS,
    ]) {
      expect(colliderIds.has(collider.id)).toBe(true)
      const galleryId = collider.id
        .replace(/-bench$/, '')
        .replace(/-(?:end|threshold)-wall-(?:left|right)$/, '') as PermanentMuseumGalleryId
      const centerlineX = MUSEUM_GALLERIES.find((gallery) => gallery.id === galleryId)!.placement.x
      expect(
        centerlineX > collider.minX - FORMAL_WALK_PLAYER_RADIUS
        && centerlineX < collider.maxX + FORMAL_WALK_PLAYER_RADIUS,
      ).toBe(false)
    }
  })

  it('authors MoBA #1 as a restrained candle-warm portrait salon', () => {
    const gallery = permanentGalleries.find((candidate) => candidate.id === 'moba-one')!
    const interior = MUSEUM_GALLERY_INTERIORS['moba-one']
    expect(interior.architecture).toBe('portrait-salon')
    expect(interior.floorPattern).toBe('parquet')
    expect(interior.daylight).toBe('#f3ddbc')
    expect(interior.bench.x).toBeLessThan(0)
    expect(interior.bench.t).toBeLessThan(0.4)
    expect(interior.bench.upholstery).toBe('#825261')
    expect(interior.skylights.map((skylight) => skylight.width)).toEqual([4.15, 4.15])
    expect(museumGalleryArtworkDisplays(gallery)).toHaveLength(12)

    const floorSource = expansionSource.slice(
      expansionSource.indexOf('function GalleryFloorDesign'),
      expansionSource.indexOf('function GalleryWallArchitecture'),
    )
    const parquetSource = expansionSource.slice(
      expansionSource.indexOf('function PortraitParquetField'),
      expansionSource.indexOf('function GalleryFloorDesign'),
    )
    const frameSource = expansionSource.slice(
      expansionSource.indexOf('function GalleryArtworkFrame'),
      expansionSource.indexOf('function GalleryExhibition'),
    )
    const shellSource = expansionSource.slice(
      expansionSource.indexOf('function GalleryShell'),
      expansionSource.indexOf('function usePosterTexture'),
    )
    expect(floorSource).toContain("floor: 'walnut-herringbone'")
    expect(floorSource).toContain('<PortraitParquetField gallery={gallery} />')
    expect(parquetSource).toContain('<instancedMesh')
    expect(MOBA_ONE_PARQUET_SPEC).toMatchObject({ rows: 20, lanes: 18, boardWidth: 0.4, boardDepth: 0.48 })
    expect(parquetSource).toContain('dummy.rotation.set(0, 0, 0)')
    expect(parquetSource).not.toContain('scale={[1.82, 0.3, 1]}')
    expect(floorSource.slice(0, floorSource.indexOf("if (interior.floorPattern === 'terrazzo')"))).not.toContain('AGED_BRASS')
    expect(expansionSource).toContain("ceiling: 'walnut-and-plaster-coffers'")
    expect(expansionSource).toContain("furniture: 'portrait-salon-bench'")
    expect(expansionSource).not.toContain('position={[-12.2, -1.91, 19.5]}')
    expect(expansionSource).toContain('position={[-12.2, -1.91, 5.85]}')
    expect(expansionSource).toContain('position={[-12.2, -1.91, 33.34]}')
    expect(frameSource).toContain("display.frameStyle === 'portrait-gilt'")
    expect(frameSource).toContain('emissiveIntensity={isPortraitSalon || isHeartGallery || isPhotographyGallery ? 0')
    expect(frameSource).toContain('<shapeGeometry args={[PORTRAIT_WASH_SHAPE]} />')
    expect(frameSource).toContain('opacity={surfaceLighting.artworkWashOpacity}')
    expect(MUSEUM_GALLERY_SURFACE_LIGHTING['moba-one']).toMatchObject({
      artworkWashOpacity: 0.07,
      activeWallEmissiveIntensity: 0.18,
    })
    expect(frameSource).not.toContain('blending={THREE.AdditiveBlending}')
    const lighting = MUSEUM_GALLERY_LIGHTING_PLANS['moba-one']
    expect(lighting.map((light) => light.source)).toEqual(['picture-light', 'laylight', 'clerestory'])
    expect(lighting.map((light) => light.id)).toEqual([
      'moba-one-feature-picture-light',
      'moba-one-south-laylight-wash',
      'moba-one-clerestory-wash',
    ])
    expect(lighting[0]).toMatchObject({ color: '#ffe0ae', intensity: 4.9, distance: 7.2, penumbra: 0.9 })
    expect(lighting[0].target).toEqual([-4.18, 0.16, gallery.maxZ - 0.42])
    expect(lighting[2]).toMatchObject({ color: '#f0cf9c', intensity: 2.2, distance: 8.8 })
    expect(shellSource).toContain('MUSEUM_GALLERY_LIGHTING_PLANS')
    expect(expansionSource).toContain("exteriorLayer: 'portrait-clerestory-garden'")
    expect(expansionSource).toContain('active={activeGalleryId === gallery.id && activeMuseumArea === gallery.id}')
    expect(expansionSource).toContain('isPortraitLaylight ? -1.892 : -1.9')
    expect(expansionSource).toContain('(isPortraitGallery || isHeartGallery || isPhotographyGallery ? -1.892 : -1.905) - spec.y')

    const boards = museumMobaOneParquetBoards(gallery)
    expect(boards).toHaveLength(MOBA_ONE_PARQUET_SPEC.rows * MOBA_ONE_PARQUET_SPEC.lanes)
    for (let firstIndex = 0; firstIndex < boards.length; firstIndex += 1) {
      const first = boards[firstIndex]
      expect(first.z - first.depth * 0.5).toBeGreaterThan(gallery.minZ + 0.5)
      expect(first.z + first.depth * 0.5).toBeLessThan(gallery.maxZ - 0.5)
      for (let secondIndex = firstIndex + 1; secondIndex < boards.length; secondIndex += 1) {
        const second = boards[secondIndex]
        const overlapX = Math.min(first.x + first.width * 0.5, second.x + second.width * 0.5)
          - Math.max(first.x - first.width * 0.5, second.x - second.width * 0.5)
        const overlapZ = Math.min(first.z + first.depth * 0.5, second.z + second.depth * 0.5)
          - Math.max(first.z - first.depth * 0.5, second.z - second.depth * 0.5)
        expect(overlapX > 0 && overlapZ > 0).toBe(false)
      }
    }
  })

  it('authors MoBA #2 as a calm mineral-blue contemporary heart gallery', () => {
    const gallery = permanentGalleries.find((candidate) => candidate.id === 'moba-two')!
    const interior = MUSEUM_GALLERY_INTERIORS['moba-two']
    expect(gallery.description).toContain('serene mineral-blue gallery')
    expect(gallery.accent).toBe('#cc788e')
    expect(gallery.wall).toBe('#839ba3')
    expect(gallery.floor).toBe('#aeb8b3')
    expect(interior.architecture).toBe('heart-gallery')
    expect(interior.floorPattern).toBe('terrazzo')
    expect(interior.daylight).toBe('#e8efea')
    expect(interior.bench).toMatchObject({
      x: 3.05,
      t: 0.18,
      length: 2.56,
      depth: 0.72,
      upholstery: '#718f92',
      frame: '#b39d78',
    })
    expect(interior.artworkSlots).toHaveLength(12)
    expect(interior.artworkSlots.every((slot) => (slot.roll ?? 0) === 0)).toBe(true)
    expect(interior.artworkSlots.filter((slot) => slot.featured)).toHaveLength(1)
    expect(museumGalleryArtworkDisplays(gallery)).toHaveLength(12)

    const floorSource = expansionSource.slice(
      expansionSource.indexOf("if (interior.floorPattern === 'terrazzo')"),
      expansionSource.indexOf("if (interior.floorPattern === 'limestone')"),
    )
    const frameSource = expansionSource.slice(
      expansionSource.indexOf('function galleryFramePalette'),
      expansionSource.indexOf('function GalleryExhibition'),
    )
    expect(floorSource).toContain("floor: 'pearly-mineral-terrazzo'")
    expect(floorSource).toContain('scale={[10.82, depth - 0.68, 1]}')
    expect(floorSource).toContain('<HeartTerrazzoChipField gallery={gallery} />')
    expect(floorSource).not.toContain('AGED_BRASS')
    expect(expansionSource).toContain("ceiling: 'pale-plaster-laylight-coves'")
    expect(expansionSource).toContain("furniture: 'mineral-gallery-oak-bench'")
    expect(expansionSource).toContain("landmark: 'curated-hearts-sculpture'")
    expect(expansionSource).toContain("exteriorLayer: 'mineral-clerestory-garden'")
    expect(expansionSource).not.toContain('position={[-12.2, -1.91, 26.88]}')
    expect(frameSource).toContain("outer: '#273137', inner: '#c2cbc6', mat: '#f0eee7'")
    expect(frameSource).toContain("outer: '#4b5d62', inner: '#aebbb7', mat: '#e9e9e2'")
    expect(frameSource).toContain('emissiveIntensity={isPortraitSalon || isHeartGallery || isPhotographyGallery ? 0')
    const lighting = MUSEUM_GALLERY_LIGHTING_PLANS['moba-two']
    expect(lighting[0].target).toEqual([4.18, 0.16, gallery.maxZ - 0.42])
    expect(lighting[1].target).toEqual([-3.85, -0.9, 29.7])
    expect(lighting.map((light) => light.source)).toEqual(['picture-light', 'laylight', 'clerestory'])
    expect(lighting[2]).toMatchObject({ intensity: 2.5, distance: 10.4, penumbra: 0.92 })
    expect(MUSEUM_GALLERY_SURFACE_LIGHTING['moba-two']).toMatchObject({
      artworkWashOpacity: 0.04,
      activeWallEmissiveIntensity: 0.16,
    })
    expect(expansionSource).not.toContain('intensity={7}')
    expect(expansionSource).toContain('texture.generateMipmaps = false')
    expect(expansionSource).toContain('texture.magFilter = THREE.NearestFilter')

    const chips = museumMobaTwoTerrazzoChips(gallery)
    expect(chips).toHaveLength(MOBA_TWO_TERRAZZO_SPEC.rows * MOBA_TWO_TERRAZZO_SPEC.lanes)
    for (let firstIndex = 0; firstIndex < chips.length; firstIndex += 1) {
      const first = chips[firstIndex]
      expect(first.x - first.radius * first.stretch).toBeGreaterThan(-4.6)
      expect(first.x + first.radius * first.stretch).toBeLessThan(4.6)
      expect(first.z - first.radius).toBeGreaterThan(gallery.minZ + 0.9)
      expect(first.z + first.radius).toBeLessThan(gallery.maxZ - 0.9)
      for (let secondIndex = firstIndex + 1; secondIndex < chips.length; secondIndex += 1) {
        const second = chips[secondIndex]
        const overlapX = Math.min(first.x + first.radius * first.stretch, second.x + second.radius * second.stretch)
          - Math.max(first.x - first.radius * first.stretch, second.x - second.radius * second.stretch)
        const overlapZ = Math.min(first.z + first.radius, second.z + second.radius)
          - Math.max(first.z - first.radius, second.z - second.radius)
        expect(overlapX > 0 && overlapZ > 0).toBe(false)
      }
    }
  })

  it('authors Photography as a quiet high-altitude north-light archive', () => {
    const gallery = permanentGalleries.find((candidate) => candidate.id === 'photography')!
    const interior = MUSEUM_GALLERY_INTERIORS.photography
    expect(gallery.description).toContain('serene north-light photography archive')
    expect(gallery.accent).toBe('#956f60')
    expect(gallery.wall).toBe('#eee9de')
    expect(gallery.floor).toBe('#c9c3b7')
    expect(interior.architecture).toBe('daylight-gallery')
    expect(interior.floorPattern).toBe('limestone')
    expect(interior.daylight).toBe('#edf2ec')
    expect(interior.artworkSlots).toHaveLength(8)
    expect(interior.artworkSlots.every((slot) => (slot.roll ?? 0) === 0)).toBe(true)
    expect(interior.artworkSlots.every((slot) => !slot.lamp)).toBe(true)
    expect(interior.windows).toHaveLength(4)
    expect(interior.windows.every((window) => window.width === 0.82 && window.height === 2.4)).toBe(true)
    expect(interior.skylights.map((skylight) => skylight.width)).toEqual([4.7, 5.2, 4.7])
    expect(interior.bench).toMatchObject({
      x: 3.4,
      t: 0.78,
      length: 2.85,
      depth: 0.72,
      upholstery: '#c9c8be',
      frame: '#9a8062',
    })
    expect(museumGalleryArtworkDisplays(gallery)).toHaveLength(8)

    const doorwayPhoto = museumGalleryArtworkDisplays(gallery).find((display) => (
      display.work.id === 'photography-2665'
    ))!
    const doorwayReturn = museumGalleryPortalReturns(gallery).find((portalReturn) => (
      portalReturn.id === doorwayPhoto.wall
    ))!
    const doorwayFrameWidth = 1.65 * doorwayPhoto.scale + 0.18 * 2 + 0.12
    expect(doorwayFrameWidth).toBeLessThanOrEqual(doorwayReturn.length - 0.18)

    const introSign = museumPhotographyIntroSignLayout(gallery)
    const northReturn = museumGalleryPortalReturns(gallery).find((portalReturn) => (
      portalReturn.id === 'portal-north'
    ))!
    const frameWidth = introSign.size[0] + 0.2
    const offsetX = introSign.position[0] - northReturn.centerX
    const offsetZ = introSign.position[2] - northReturn.centerZ
    const normalOffset = offsetX * Math.sin(introSign.rotationY) + offsetZ * Math.cos(introSign.rotationY)
    const lateralOffset = offsetX * Math.cos(introSign.rotationY) - offsetZ * Math.sin(introSign.rotationY)
    expect(introSign.size).toEqual([1.36, 0.46])
    expect(introSign.position[1]).toBeCloseTo(1.22, 6)
    expect(frameWidth).toBeLessThanOrEqual(northReturn.length - 0.25)
    expect(normalOffset).toBeCloseTo(0.18, 6)
    expect(lateralOffset).toBeCloseTo(0, 6)

    const floorSource = expansionSource.slice(
      expansionSource.indexOf("if (interior.floorPattern === 'limestone')"),
      expansionSource.indexOf('function GalleryWallArchitecture'),
    )
    const frameSource = expansionSource.slice(
      expansionSource.indexOf('function galleryFramePalette'),
      expansionSource.indexOf('function GalleryExhibition'),
    )
    expect(floorSource).toContain("floor: 'staggered-honed-limestone'")
    expect(expansionSource).toContain("wallArchitecture: 'limewash-and-low-stone-dado'")
    expect(expansionSource).toContain("ceiling: 'asymmetric-north-light-monitors'")
    expect(expansionSource).toContain("skylight: 'north-light-roof-monitor'")
    expect(expansionSource).toContain("opening: 'recessed-north-light-monitor'")
    expect(expansionSource).toContain("exteriorLayer: 'photography-daylight-sky'")
    expect(expansionSource).not.toContain("exteriorLayer: 'photography-window-garden-depth'")
    expect(expansionSource).toContain("furniture: 'north-light-ash-sled-bench'")
    expect(expansionSource).not.toContain('position={[12.2, -1.91, 19.5]}')
    expect(expansionSource).toContain('position={[12.2, -1.91, 12.65]}')
    expect(expansionSource).toContain('position={[12.2, -1.91, 33.34]}')
    expect(frameSource).toContain("outer: '#3f4a45', inner: '#b9ab93', mat: '#f5f0e5'")
    expect(frameSource).toContain('isPhotographyGallery ? 0 : hero ? 0.1')
    const lighting = MUSEUM_GALLERY_LIGHTING_PLANS.photography
    expect(lighting[0].target).toEqual([0, 0.18, gallery.maxZ - 0.42])
    expect(lighting[0]).toMatchObject({ color: '#f0eee4', intensity: 4, distance: 8.4 })
    expect(lighting.map((light) => light.source)).toEqual(['picture-light', 'north-light', 'north-light'])
    expect(MUSEUM_GALLERY_SURFACE_LIGHTING.photography).toMatchObject({
      artworkWashOpacity: 0.03,
      activeWallEmissiveIntensity: 0.12,
    })
  })

  it('authors Holiday Potluck as an elegant cranberry-and-evergreen Christmas salon', () => {
    const gallery = permanentGalleries.find((candidate) => candidate.id === 'holiday')!
    const interior = MUSEUM_GALLERY_INTERIORS.holiday
    expect(gallery.description).toContain('cranberry-and-evergreen winter salon')
    expect(gallery).toMatchObject({
      accent: '#b39255',
      wall: '#76535c',
      wallLight: '#a9837c',
      floor: '#4b372f',
      trim: '#2f4438',
      light: '#f1dfbd',
    })
    expect(interior.architecture).toBe('winter-conservatory')
    expect(interior.floorPattern).toBe('winter-rug')
    expect(interior.daylight).toBe('#f2dfbd')
    expect(interior.artworkSlots).toHaveLength(11)
    expect(new Set(interior.artworkSlots.map((slot) => slot.artworkId)).size).toBe(11)
    expect(gallery.artworks.filter((artwork) => artwork.motion)).toHaveLength(6)
    expect(interior.bench).toMatchObject({
      x: 3.45,
      t: 0.8,
      length: 2.62,
      depth: 0.72,
      upholstery: '#704750',
      frame: '#5b4333',
    })
    expect(museumGalleryArtworkDisplays(gallery)).toHaveLength(11)

    const thresholdSign = museumGalleryThresholdSignLayout(gallery)
    const signTop = thresholdSign.signCenterY + thresholdSign.signOuterHeight * 0.5
    const railBottom = thresholdSign.railCenterY - thresholdSign.railHeight * 0.5
    const railTop = thresholdSign.railCenterY + thresholdSign.railHeight * 0.5
    const lintelBottom = 2.78 - thresholdSign.lintelHeight * 0.5
    expect(railBottom - signTop).toBeGreaterThanOrEqual(0.02)
    expect(lintelBottom - railTop).toBeGreaterThanOrEqual(0.02)
    expect(thresholdSign.signOuterHeight).toBeGreaterThan(thresholdSign.signInnerHeight)
    expect(thresholdSign.signInnerHeight).toBeGreaterThan(thresholdSign.signPlaneHeight)

    const floorSource = expansionSource.slice(
      expansionSource.indexOf("if (interior.floorPattern === 'winter-rug')"),
      expansionSource.indexOf('function GalleryWallArchitecture'),
    )
    const frameSource = expansionSource.slice(
      expansionSource.indexOf('function galleryFramePalette'),
      expansionSource.indexOf('function GalleryExhibition'),
    )
    const shellSource = expansionSource.slice(
      expansionSource.indexOf('function GalleryShell'),
      expansionSource.indexOf('function usePosterTexture'),
    )
    expect(floorSource).toContain("floor: 'smoked-oak-and-fir-runner'")
    expect(floorSource).not.toContain('AGED_BRASS')
    expect(expansionSource).toContain("wallArchitecture: 'cranberry-plaster-and-evergreen-wainscot'")
    expect(expansionSource).toContain("ceiling: 'winter-conservatory-rafters'")
    expect(expansionSource).toContain("furniture: 'winter-salon-walnut-bench'")
    expect(expansionSource).toContain("landmark: 'holiday-gift-vitrine'")
    expect(expansionSource).toContain("installation: 'holiday-three-star-ceiling'")
    expect(expansionSource).toContain("festiveFeature: 'holiday-return-wreath'")
    expect(HOLIDAY_CEILING_STAR_SPECS).toHaveLength(3)
    expect(HOLIDAY_CEILING_STAR_SPECS.every((star) => !star.animated)).toBe(true)
    const [firstLaylight, secondLaylight] = interior.skylights
    const firstLaylightMaxZ = museumGalleryZ(gallery, firstLaylight.t, 0.95) + firstLaylight.depth * 0.5
    const secondLaylightMinZ = museumGalleryZ(gallery, secondLaylight.t, 0.95) - secondLaylight.depth * 0.5
    for (const star of HOLIDAY_CEILING_STAR_SPECS) {
      const starZ = museumGalleryZ(gallery, star.t, 1.65)
      expect(star.y - star.scale).toBeGreaterThanOrEqual(2.32)
      expect(starZ - star.scale).toBeGreaterThanOrEqual(firstLaylightMaxZ + 0.5)
      expect(starZ + star.scale).toBeLessThanOrEqual(secondLaylightMinZ - 0.5)
    }
    const endOpening = museumGalleryBoundaryOpening(gallery, 'end')
    const wreathOuterRadius = HOLIDAY_RETURN_WREATH_SPEC.outerRadius + HOLIDAY_RETURN_WREATH_SPEC.tubeRadius
    expect(endOpening.centerX - wreathOuterRadius).toBeGreaterThanOrEqual(endOpening.minX + 0.25)
    expect(endOpening.centerX + wreathOuterRadius).toBeLessThanOrEqual(endOpening.maxX - 0.25)
    expect(HOLIDAY_RETURN_WREATH_SPEC.centerY - wreathOuterRadius).toBeGreaterThanOrEqual(1.8)
    expect(
      HOLIDAY_RETURN_WREATH_SPEC.wallOffset - MUSEUM_GALLERY_BOUNDARY_WALL_THICKNESS * 0.5,
    ).toBeGreaterThanOrEqual(0.03)
    expect(floorSource).toContain('scale={[4.82, depth - 3, 1]}')
    expect(floorSource).toContain('[0.27, 0.5, 0.73]')
    expect(frameSource).toContain("winter-frost') return { outer: '#66716d'")
    const festiveSource = expansionSource.slice(
      expansionSource.indexOf('function WinterSalonFestiveDetails'),
      expansionSource.indexOf('function GalleryShell'),
    )
    expect(festiveSource).not.toContain('useFrame')
    expect(frameSource).toContain("const isHolidayGallery = gallery.id === 'holiday'")
    expect(frameSource).toContain(
      'emissiveIntensity={isHolidayGallery ? 0',
    )
    expect(shellSource).toContain("gallery.id !== 'holiday'")
    const lighting = MUSEUM_GALLERY_LIGHTING_PLANS.holiday
    expect(lighting.map((light) => light.source)).toEqual(['picture-light', 'picture-light', 'winter-window'])
    expect(lighting[0]).toMatchObject({ color: '#f5d4a4', intensity: 4, penumbra: 0.9 })
    expect(lighting[1]).toMatchObject({ color: '#e8eee8', intensity: 3, penumbra: 0.9 })
    expect(lighting[2]).toMatchObject({ intensity: 2.4, penumbra: 0.94 })
    expect(MUSEUM_GALLERY_SURFACE_LIGHTING.holiday).toMatchObject({
      artworkWashOpacity: 0.055,
      activeWallEmissiveIntensity: 0.18,
    })
  })

  it('uses one restrained museum-wide light budget with believable sources in every room', () => {
    expect(MUSEUM_LIGHTING_BUDGET).toMatchObject({
      baselineLights: 2,
      openingSalonActiveLights: 4,
      atriumActiveLights: 6,
      galleryActiveLights: 3,
      maximumSimultaneousLights: 8,
      castsRealtimeShadows: false,
    })
    expect(MUSEUM_LIGHTING_BUDGET.maximumSimultaneousLights).toBe(
      MUSEUM_LIGHTING_BUDGET.baselineLights
        + Math.max(
          MUSEUM_LIGHTING_BUDGET.openingSalonActiveLights,
          MUSEUM_LIGHTING_BUDGET.atriumActiveLights,
          MUSEUM_LIGHTING_BUDGET.galleryActiveLights,
        ),
    )
    expect(MUSEUM_ATRIUM_LIGHTING_PLAN).toHaveLength(MUSEUM_LIGHTING_BUDGET.atriumActiveLights)
    expect(MUSEUM_ATRIUM_LIGHTING_PLAN.slice(0, 2).map((light) => light.source)).toEqual(['glass-roof', 'glass-roof'])
    expect(MUSEUM_ATRIUM_LIGHTING_PLAN[0]).toMatchObject({
      id: 'atrium-glass-roof-daylight',
      color: '#ffe2ab',
      intensity: 4.9,
      distance: 18,
      angle: 0.74,
      penumbra: 0.94,
    })
    expect(MUSEUM_ATRIUM_LIGHTING_PLAN[1]).toMatchObject({
      id: 'atrium-mobile-counterlight',
      color: '#d6ebe7',
      intensity: 3.55,
      distance: 15,
    })
    expect(MUSEUM_ATRIUM_LIGHTING_PLAN.slice(2).map((light) => light.id)).toEqual([
      'atrium-moba-one-portal-spill',
      'atrium-holiday-portal-spill',
      'atrium-moba-two-portal-spill',
      'atrium-photography-portal-spill',
    ])

    const galleryIds: LightingGalleryId[] = ['moba-one', 'moba-two', 'photography', 'holiday']
    for (const galleryId of galleryIds) {
      const lights = MUSEUM_GALLERY_LIGHTING_PLANS[galleryId]
      expect(lights).toHaveLength(MUSEUM_LIGHTING_BUDGET.galleryActiveLights)
      expect(new Set(lights.map((light) => light.id)).size).toBe(lights.length)
      expect(new Set(lights.map((light) => light.role))).toEqual(new Set(['key', 'fill', 'accent']))
      expect(lights.reduce((energy, light) => energy + light.intensity, 0)).toBeLessThan(10)
      expect(lights.every((light) => light.distance <= 13 && light.angle >= 0.46 && light.angle <= 0.88)).toBe(true)
      expect(lights.every((light) => (light.penumbra ?? 0) >= 0.9)).toBe(true)
      expect(lights.every((light) => light.target[1] > -1)).toBe(true)

      const surfaceLighting = MUSEUM_GALLERY_SURFACE_LIGHTING[galleryId]
      expect(surfaceLighting.activeWallEmissiveIntensity).toBeGreaterThan(surfaceLighting.inactiveWallEmissiveIntensity)
      expect(surfaceLighting.activeLowerWallEmissiveIntensity).toBeGreaterThan(surfaceLighting.inactiveLowerWallEmissiveIntensity)
      expect(surfaceLighting.activeWallEmissiveIntensity).toBeLessThanOrEqual(0.18)
      expect(surfaceLighting.artworkWashOpacity).toBeLessThanOrEqual(0.07)
    }

    const shellSource = expansionSource.slice(
      expansionSource.indexOf('function GalleryShell'),
      expansionSource.indexOf('function usePosterTexture'),
    )
    const targetedLightSource = expansionSource.slice(
      expansionSource.indexOf('function TargetedMuseumSpotlight'),
      expansionSource.indexOf('function CourtyardTree'),
    )
    expect(shellSource).not.toContain('<pointLight')
    expect(shellSource).not.toContain('<directionalLight')
    expect(shellSource).toContain('activeLights: lightingPlan.length')
    expect(shellSource).toContain('MUSEUM_GALLERY_SURFACE_LIGHTING')
    expect(shellSource).toContain('emissiveIntensity={wallEmissiveIntensity}')
    expect(expansionSource).toContain("lightingPlan: 'central-atrium'")
    expect(expansionSource).toContain('<MuseumLoopArchitecture')
    expect(expansionSource).toContain("active={activeMuseumArea === 'atrium'}")
    expect(expansionSource).not.toContain('position={[-1.72, -1.88, 15.8]}')
    expect(expansionSource).not.toContain('position={[1.35, -1.88, 23.7]}')
    expect(targetedLightSource).toContain('castShadow={false}')
    expect(expansionSource).toContain('emissiveIntensity={lit ? 0.065 : 0.02}')

    const atriumDaylightSource = expansionSource.slice(
      expansionSource.indexOf('function createAtriumSunPatternTexture'),
      expansionSource.indexOf('const EXTERIOR_TREE_CLUSTERS'),
    )
    expect(atriumDaylightSource).toContain("daylightEffect: 'soft-glass-roof-sun-pattern'")
    expect(atriumDaylightSource.match(/new THREE\.DataTexture/g)).toHaveLength(2)
    expect(atriumDaylightSource).toContain('blending={THREE.NormalBlending}')
    expect(atriumDaylightSource).toContain('animated: false')
    expect(atriumDaylightSource).not.toContain('THREE.AdditiveBlending')
    expect(atriumDaylightSource).not.toContain('useFrame(')
    expect(atriumDaylightSource).not.toContain('<pointLight')
  })

  it('closes gallery thresholds with real wall panels while keeping the doorway walkable', () => {
    expect(resolveFormalWalkPosition(
      { x: -12.2, z: 5.8 },
      { x: -12.2, z: 7.2 },
    )).toEqual({ x: -12.2, z: 7.2 })
    expect(resolveFormalWalkPosition(
      { x: -8.2, z: 5.8 },
      { x: -8.2, z: 7.2 },
    )).toEqual({ x: -8.2, z: 5.8 })

    const thresholdSource = expansionSource.slice(
      expansionSource.indexOf('function GalleryThreshold'),
      expansionSource.indexOf('function useLoopSignTexture'),
    )
    expect(thresholdSource).toContain("museumGalleryBoundaryWallPanels(gallery, 'threshold')")
    expect(thresholdSource).toContain('color={gallery.wallLight}')
    expect(thresholdSource).not.toContain('scale={[0.46, 6.25, 0.48]}')

    const outerHallBoundaries = [
      ['moba-one', 'threshold'],
      ['moba-two', 'end'],
      ['photography', 'threshold'],
      ['holiday', 'end'],
    ] as const
    for (const [galleryId, boundary] of outerHallBoundaries) {
      const gallery = permanentGalleries.find((candidate) => candidate.id === galleryId)!
      const opening = museumGalleryBoundaryOpening(gallery, boundary)
      const panels = museumGalleryBoundaryWallPanels(gallery, boundary)
      expect(opening.centerX).toBeCloseTo(1.04, 8)
      expect(opening.minX).toBe(-0.66)
      expect(opening.maxX).toBe(2.74)
      expect(opening.width).toBeCloseTo(3.4, 8)
      expect(panels.reduce((width, panel) => width + panel.width, 0) + opening.width).toBeCloseTo(11.84, 8)
      expect(opening.minX).toBeLessThan(-FORMAL_WALK_PLAYER_RADIUS)
      expect(opening.maxX).toBeGreaterThan(FORMAL_WALK_PLAYER_RADIUS)
    }
  })

  it('finishes connector, rear-turn, and atrium walls instead of exposing the exterior backdrop', () => {
    expect(MUSEUM_LOOP_WALL_RETURNS.map((wall) => wall.id)).toEqual([
      'moba-one-connector-west-return',
      'holiday-connector-east-return',
      'moba-two-rear-turn-west-return',
      'photography-rear-turn-east-return',
    ])
    expect(MUSEUM_ATRIUM_REAR_WALL_SEGMENTS).toHaveLength(2)
    for (const wall of MUSEUM_LOOP_WALL_RETURNS) {
      const boundaryBurial = Math.abs(wall.x) + wall.thickness * 0.5 - 12.86
      expect(boundaryBurial).toBeGreaterThanOrEqual(0.015)
      expect(boundaryBurial).toBeLessThanOrEqual(0.04)
    }
    expect(MUSEUM_LOOP_WALL_RETURNS.slice(0, 2).every((wall) => wall.depth > 3.8)).toBe(true)
    expect(MUSEUM_LOOP_WALL_RETURNS.slice(2).every((wall) => wall.depth >= 3.18)).toBe(true)
    expect(MUSEUM_LOOP_WALL_RETURN_COLLIDERS.map((collider) => collider.id)).toEqual(
      MUSEUM_LOOP_WALL_RETURNS.map((wall) => wall.id),
    )
    expect(MUSEUM_LOOP_WALL_RETURN_COLLIDERS.every((collider) => (
      FORMAL_WALK_COLLIDERS.includes(collider)
    ))).toBe(true)
    expect(
      MUSEUM_ATRIUM_REAR_WALL_SEGMENTS.reduce((width, segment) => width + segment.width, 0)
      + 2 * (2.05 + 0.42),
    ).toBeCloseTo(12.64, 6)

    for (const [inside, outside] of [
      [{ x: -12.2, z: 5 }, { x: -13.2, z: 5 }],
      [{ x: 12.2, z: 5 }, { x: 13.2, z: 5 }],
      [{ x: -12.2, z: 34 }, { x: -13.2, z: 34 }],
      [{ x: 12.2, z: 34 }, { x: 13.2, z: 34 }],
      [{ x: -4, z: 33.2 }, { x: -4, z: 31.5 }],
      [{ x: 4, z: 33.2 }, { x: 4, z: 31.5 }],
    ] as const) {
      expect(resolveFormalWalkPosition(inside, outside)).toEqual(inside)
    }

    expect(expansionSource).toContain('MUSEUM_LOOP_WALL_RETURNS.map')
    expect(expansionSource).toContain('MUSEUM_ATRIUM_REAR_WALL_SEGMENTS.map')
    expect(expansionSource).toContain('closesExteriorGap: true')
  })

  it('keeps structural wall seams solid without overlapping cartoon outline shells', () => {
    const structuralBoxSource = expansionSource.slice(
      expansionSource.indexOf('function MuseumStructuralBox'),
      expansionSource.indexOf('function MuseumCylinder'),
    )
    expect(structuralBoxSource).toContain("structuralSurface: 'seam-safe-toon-box'")
    expect(structuralBoxSource).toContain('<meshToonMaterial')
    expect(structuralBoxSource).not.toContain('<OutlineMesh')

    const wallReturnSource = expansionSource.slice(
      expansionSource.indexOf('function MuseumLoopWallReturn'),
      expansionSource.indexOf('function MuseumLoopArchitecture'),
    )
    expect(wallReturnSource).toContain('<MuseumStructuralBox')
    expect(wallReturnSource).not.toContain('<MuseumBox')

    const endWallSource = expansionSource.slice(
      expansionSource.indexOf('function GalleryEndWall'),
      expansionSource.indexOf('function GalleryBench'),
    )
    expect(endWallSource).toContain('wallPanels.map')
    expect(endWallSource).toContain('<MuseumStructuralBox')

    const shellSource = expansionSource.slice(
      expansionSource.indexOf('function GalleryShell'),
      expansionSource.indexOf('function GalleryMotionPlane'),
    )
    expect(shellSource).toContain('wallPanels.map')
    expect(shellSource).toContain('<MuseumStructuralBox')
  })

  it('joins structural slabs edge to edge without coplanar floor or ceiling overlap', () => {
    const bounds = (id: string) => {
      const slab = MUSEUM_STRUCTURAL_SLABS.find((candidate) => candidate.id === id)!
      return {
        minX: slab.x - slab.floorWidth * 0.5,
        maxX: slab.x + slab.floorWidth * 0.5,
        minZ: slab.z - slab.depth * 0.5,
        maxZ: slab.z + slab.depth * 0.5,
      }
    }
    const overlapLength = (firstMin: number, firstMax: number, secondMin: number, secondMax: number) => (
      Math.max(0, Math.min(firstMax, secondMax) - Math.max(firstMin, secondMin))
    )

    expect(MUSEUM_STRUCTURAL_SLABS.map((slab) => slab.id)).toEqual([
      'moba-one-gallery-slab',
      'moba-two-gallery-slab',
      'photography-gallery-slab',
      'holiday-gallery-slab',
      'moba-one-connector-slab',
      'holiday-connector-slab',
      'north-turn-slab',
    ])

    for (let firstIndex = 0; firstIndex < MUSEUM_STRUCTURAL_SLABS.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < MUSEUM_STRUCTURAL_SLABS.length; secondIndex += 1) {
        const first = bounds(MUSEUM_STRUCTURAL_SLABS[firstIndex].id)
        const second = bounds(MUSEUM_STRUCTURAL_SLABS[secondIndex].id)
        const overlapArea = overlapLength(first.minX, first.maxX, second.minX, second.maxX)
          * overlapLength(first.minZ, first.maxZ, second.minZ, second.maxZ)
        expect(overlapArea).toBeLessThanOrEqual(1e-8)
      }
    }

    for (const [firstId, secondId] of [
      ['moba-one-connector-slab', 'moba-one-gallery-slab'],
      ['moba-one-gallery-slab', 'moba-two-gallery-slab'],
      ['moba-two-gallery-slab', 'north-turn-slab'],
      ['north-turn-slab', 'photography-gallery-slab'],
      ['photography-gallery-slab', 'holiday-gallery-slab'],
      ['holiday-gallery-slab', 'holiday-connector-slab'],
    ] as const) {
      const first = bounds(firstId)
      const second = bounds(secondId)
      const gap = Math.max(0, first.minZ - second.maxZ, second.minZ - first.maxZ)
      expect(gap, `${firstId} to ${secondId}`).toBeLessThanOrEqual(0.01)
    }

    expect(expansionSource).toContain('MUSEUM_STRUCTURAL_SLABS.map')
    expect(expansionSource).not.toContain('depth + 0.12')
    expect(expansionSource).not.toContain('depth + 0.02')
  })

  it('uses restrained enamel museum signs with authored wayfinding copy', () => {
    expect(expansionSource).toContain('canvas.width = 1536')
    expect(expansionSource).toContain('canvas.height = 432')
    expect(expansionSource).toContain('fitMuseumSignFont')
    expect(expansionSource).toContain('Georgia, Times New Roman, serif')
    expect(expansionSource).toContain("const AGED_BRASS = '#a98c58'")
    expect(expansionSource).toContain('frameWidth = size[0] + 0.2')
    expect(expansionSource).toContain('position={[0, 0, -0.096]}')
    expect(expansionSource).toContain('position={[6.32, 3.02, centerZ]}')
    expect(expansionSource).toContain('size={[2.3, 0.64]}')
    expect(expansionSource).not.toContain('centerZ + signOffset')

    const signHalfWidth = 2.3 * 0.5
    const columnHalfWidth = 0.34 * 0.5
    for (const gallery of permanentGalleries) {
      const bounds = museumGalleryAtriumPortalBounds(gallery)
      const localSignZ = (bounds.minZ + bounds.maxZ) * 0.5
      const localDepth = localSignZ - gallery.minZ
      const signZ = gallery.placement.z
        - 6.32 * Math.sin(gallery.placement.yaw)
        + localDepth * Math.cos(gallery.placement.yaw)
      const nearestColumnGap = Math.min(...MUSEUM_ATRIUM_COLUMN_ZS.map((columnZ) => (
        Math.abs(signZ - columnZ) - signHalfWidth - columnHalfWidth
      )))
      expect(nearestColumnGap, `${gallery.id} atrium sign column clearance`).toBeGreaterThan(0.35)
    }
    expect(expansionSource).not.toContain('context.arc(arrowX')
    expect(expansionSource).not.toContain("Arial Black, Impact")
    expect(expansionSource).not.toContain('face * 0.17')

    for (const copy of [
      'West Gallery Wing',
      'Portraits of an Enjoyer',
      'Main Entrance',
      'Central Atrium · Main Hall',
      'East Gallery Wing',
      'One Final Album · North-Light Room',
    ]) expect(expansionSource).toContain(copy)

    for (const arcadeCopy of [
      'Start Loop',
      'Loop Complete',
      'Begin the Circuit',
      'Circuit Complete',
      'Halfway Point',
      'Museum Circuit',
    ]) expect(expansionSource).not.toContain(arcadeCopy)
  })

  it('keeps architecture quiet so the art remains the loudest thing in each room', () => {
    expect(expansionSource).toContain('const MUSEUM_OUTLINE_SCALE = 0.68')
    expect(expansionSource).toContain('const MUSEUM_EMISSIVE_SCALE = 0.42')
    expect(expansionSource).toContain('outlineWidth={outlineWidth * MUSEUM_OUTLINE_SCALE}')
    expect(expansionSource).toContain('emissiveIntensity={emissiveIntensity * MUSEUM_EMISSIVE_SCALE}')
    expect(expansionSource).not.toContain('scale={[0.17, 0.035, 29]}')
    expect(expansionSource).not.toContain('emissive="#ffd88f" emissiveIntensity={0.22}')
    expect(expansionSource).not.toContain('color="#d8ff65" outlineWidth={0.012}')
    expect(expansionSource).toContain('color={AGED_BRASS} outlineWidth={0.008}')
  })

  it('cuts true window and atrium-door apertures and tiles the remaining masonry around them', () => {
    let openingCount = 0
    let portalCount = 0
    for (const gallery of permanentGalleries) {
      for (const wall of ['left', 'right'] as const) {
        const openings = museumGalleryWallOpenings(gallery, wall)
        const panels = museumGalleryWallPanels(gallery, wall)
        openingCount += openings.length
        portalCount += openings.filter((opening) => opening.kind === 'atrium-portal').length
        const wallArea = (gallery.maxZ - gallery.minZ)
          * (MUSEUM_GALLERY_WALL_TOP - MUSEUM_GALLERY_WALL_BOTTOM)
        const openingArea = openings.reduce((total, opening) => (
          total + (opening.bounds.maxZ - opening.bounds.minZ) * (opening.bounds.maxY - opening.bounds.minY)
        ), 0)
        const panelArea = panels.reduce((total, panel) => total + panel.width * panel.height, 0)
        expect(panelArea + openingArea, `${gallery.id} ${wall} wall tiling`).toBeCloseTo(wallArea, 6)

        const wallRectangles = [
          ...panels.map((panel) => ({
            minY: panel.centerY - panel.height * 0.5,
            maxY: panel.centerY + panel.height * 0.5,
            minZ: panel.centerZ - panel.width * 0.5,
            maxZ: panel.centerZ + panel.width * 0.5,
          })),
          ...openings.map((opening) => opening.bounds),
        ]
        expect(Math.min(...wallRectangles.map((rectangle) => rectangle.minZ))).toBeCloseTo(gallery.minZ, 8)
        expect(Math.max(...wallRectangles.map((rectangle) => rectangle.maxZ))).toBeCloseTo(gallery.maxZ, 8)

        for (let firstIndex = 0; firstIndex < panels.length; firstIndex += 1) {
          for (let secondIndex = firstIndex + 1; secondIndex < panels.length; secondIndex += 1) {
            const first = panels[firstIndex]
            const second = panels[secondIndex]
            expect(overlapArea({
              minY: first.centerY - first.height * 0.5,
              maxY: first.centerY + first.height * 0.5,
              minZ: first.centerZ - first.width * 0.5,
              maxZ: first.centerZ + first.width * 0.5,
            }, {
              minY: second.centerY - second.height * 0.5,
              maxY: second.centerY + second.height * 0.5,
              minZ: second.centerZ - second.width * 0.5,
              maxZ: second.centerZ + second.width * 0.5,
            })).toBeCloseTo(0, 8)
          }
        }

        for (const opening of openings) {
          const bounds = opening.bounds
          if (opening.kind === 'window') expect(bounds.minY).toBeGreaterThan(MUSEUM_GALLERY_WALL_BOTTOM)
          else expect(bounds.minY).toBe(MUSEUM_GALLERY_WALL_BOTTOM)
          expect(bounds.maxY).toBeLessThan(MUSEUM_GALLERY_WALL_TOP)
          const openingCenterY = (bounds.minY + bounds.maxY) * 0.5
          const openingCenterZ = (bounds.minZ + bounds.maxZ) * 0.5
          for (const panel of panels) {
            const panelBounds = {
              minY: panel.centerY - panel.height * 0.5,
              maxY: panel.centerY + panel.height * 0.5,
              minZ: panel.centerZ - panel.width * 0.5,
              maxZ: panel.centerZ + panel.width * 0.5,
            }
            expect(overlapArea(bounds, panelBounds), `${gallery.id} ${wall} aperture blocked`).toBeCloseTo(0, 8)
            expect(
              openingCenterY > panelBounds.minY
              && openingCenterY < panelBounds.maxY
              && openingCenterZ > panelBounds.minZ
              && openingCenterZ < panelBounds.maxZ,
            ).toBe(false)
          }
        }
        expect(panels.every((panel) => panel.width < gallery.maxZ - gallery.minZ)).toBe(true)
      }
    }
    expect(openingCount).toBe(11)
    expect(portalCount).toBe(4)
  })

  it('routes real windows toward shared 3D exterior while promoted transoms open into the atrium', () => {
    for (const gallery of permanentGalleries) {
      for (const spec of MUSEUM_GALLERY_INTERIORS[gallery.id].windows) {
        expect(spec.view).toBe(spec.wall === 'right' ? 'courtyard' : 'outer-garden')
        const side = spec.wall === 'left' ? -1 : 1
        const z = museumGalleryZ(gallery, spec.t, 1.05)
        const toWorld = (x: number) => {
          const localZ = z - gallery.minZ
          const cosine = Math.cos(gallery.placement.yaw)
          const sine = Math.sin(gallery.placement.yaw)
          return {
            x: gallery.placement.x + x * cosine + localZ * sine,
            z: gallery.placement.z - x * sine + localZ * cosine,
          }
        }
        const inside = toWorld(side * 5.3)
        const outside = toWorld(side * 6.6)
        if (museumGalleryWindowIsAtriumTransom(gallery, spec)) {
          expect(resolveFormalWalkPosition(inside, outside), `${gallery.id} ${spec.id} portal`).toEqual(outside)
        } else {
          expect(resolveFormalWalkPosition(inside, outside), `${gallery.id} ${spec.id} escape`).toEqual(inside)
        }
      }
    }

    expect(expansionSource).toContain('<MuseumExteriorGrounds />')
    expect(expansionSource).toContain('<MuseumAtrium')
    expect(expansionSource).toContain('active={active}')
    expect(expansionSource).toContain('<GalleryAtriumPortal gallery={gallery} />')
    expect(expansionSource).toContain('realOpening: true')
    expect(expansionSource).toContain('museumGalleryWallPanels(gallery, wall)')
    expect(expansionSource).not.toContain('scale={[0.35, 6.42, depth + 0.08]}')
    expect(expansionSource).not.toContain('scale={[25.05, 6.42, 0.35]}')
    expect(expansionSource).not.toContain('scale={[5.92, 4.18, 0.2]}')
  })

  it('turns every direct gallery doorway into a shallow, splayed museum threshold', () => {
    expect(Object.keys(MUSEUM_GALLERY_ATRIUM_PORTALS)).toHaveLength(4)
    expect(MUSEUM_GALLERY_PORTAL_RETURN_COLLIDERS).toHaveLength(8)
    const colliderIds = new Set(FORMAL_WALK_COLLIDERS.map((collider) => collider.id))
    let rehangCount = 0

    for (const gallery of permanentGalleries) {
      const portal = MUSEUM_GALLERY_ATRIUM_PORTALS[gallery.id]
      const bounds = museumGalleryAtriumPortalBounds(gallery)
      expect(portal.wall).toBe('right')
      expect(portal.t).toBe(0.5)
      expect(bounds.maxZ - bounds.minZ).toBeCloseTo(2.4, 6)
      expect(bounds.minY).toBe(MUSEUM_GALLERY_WALL_BOTTOM)

      const returns = museumGalleryPortalReturns(gallery)
      expect(returns).toHaveLength(2)
      expect(returns[0].centerZ).toBeLessThan((bounds.minZ + bounds.maxZ) * 0.5)
      expect(returns[1].centerZ).toBeGreaterThan((bounds.minZ + bounds.maxZ) * 0.5)
      for (const portalReturn of returns) {
        expect(portalReturn.length).toBeLessThanOrEqual(1.9)
        expect(Math.abs(portalReturn.wallRotationY)).toBeGreaterThanOrEqual(0.28)
        expect(colliderIds.has(`${gallery.id}-${portalReturn.id}-wall`)).toBe(true)
      }

      const portalArt = MUSEUM_GALLERY_INTERIORS[gallery.id].artworkSlots.filter(
        (slot) => slot.wall === 'portal-south' || slot.wall === 'portal-north',
      )
      expect(portalArt).toHaveLength(gallery.id === 'photography' ? 1 : 2)
      rehangCount += portalArt.length
    }
    expect(rehangCount).toBe(7)
    expect(expansionSource).toContain('splayed: true')
    expect(expansionSource).not.toContain('scale={[portalReturn.length, 5.09, portalReturn.thickness]}')
  })

  it('keeps every side-wall artwork and bench inside its gallery envelope', () => {
    for (const gallery of permanentGalleries) {
      const interior = MUSEUM_GALLERY_INTERIORS[gallery.id]
      for (const slot of interior.artworkSlots) {
        if (slot.wall === 'left' || slot.wall === 'right') {
          expect(slot.t).toBeGreaterThanOrEqual(0.05)
          expect(slot.t).toBeLessThanOrEqual(0.95)
        }
      }
      expect(Math.abs(interior.bench.x)).toBeGreaterThan(3)
      expect(Math.abs(interior.bench.x)).toBeLessThan(4.5)
      expect(interior.bench.t).toBeGreaterThan(0.1)
      expect(interior.bench.t).toBeLessThan(0.9)
    }
  })

  it('keeps complete decorated side frames separated', () => {
    function decoratedWidth(display: MuseumArtworkDisplay) {
      const base = display.frameStyle === 'photo-mat' ? 1.65 : 1.27
      const mat = display.frameStyle === 'photo-mat' ? 0.18 : display.frameStyle === 'heart-float' ? 0.12 : 0.2
      const outer = display.frameStyle === 'photo-mat' ? 0.12 : 0.3
      return base * display.scale + mat * 2 + outer + 0.08
    }

    for (const gallery of permanentGalleries) {
      const sideDisplays = museumGalleryArtworkDisplays(gallery)
        .filter((display) => display.wall === 'left' || display.wall === 'right')
      for (const wall of ['left', 'right'] as const) {
        const displays = sideDisplays
          .filter((display) => display.wall === wall)
          .sort((first, second) => (first.t ?? 0) - (second.t ?? 0))
        for (let index = 1; index < displays.length; index += 1) {
          const previous = displays[index - 1]
          const current = displays[index]
          const separation = Math.abs(
            museumGalleryZ(gallery, current.t ?? 0.5) - museumGalleryZ(gallery, previous.t ?? 0.5),
          )
          const required = (decoratedWidth(previous) + decoratedWidth(current)) * 0.5 + 0.06
          expect(separation, `${gallery.id} ${wall} ${previous.id}/${current.id}`).toBeGreaterThanOrEqual(required)
        }
      }
    }
  })

  it('keeps every decorated side frame clear of every real window', () => {
    function decoratedArtworkBounds(display: MuseumArtworkDisplay) {
      const hero = Boolean(display.featured)
      const baseMax = display.frameStyle === 'photo-mat'
        ? [1.95, 1.65] as const
        : display.frameStyle === 'winter-gilt' || display.frameStyle === 'winter-frost'
          ? [hero ? 1.48 : 1.28, hero ? 1.48 : 1.28] as const
          : [hero ? 1.55 : 1.27, hero ? 1.55 : 1.27] as const
      const maxWidth = baseMax[0] * display.scale
      const maxHeight = baseMax[1] * display.scale
      const ratio = display.work.width / Math.max(1, display.work.height)
      const [artWidth, artHeight] = ratio >= maxWidth / maxHeight
        ? [maxWidth, maxWidth / ratio]
        : [maxHeight * ratio, maxHeight]
      const matPad = display.frameStyle === 'photo-mat'
        ? 0.18
        : display.frameStyle === 'heart-float'
          ? 0.12
          : 0.2
      const frameWidth = artWidth + matPad * 2
      const frameHeight = artHeight + matPad * 2
      const localMinY = -frameHeight * 0.5 - 0.23
      const localMaxY = frameHeight * 0.5 + (display.lamp ? 0.323 : 0.15)
      const halfWidth = (frameWidth + 0.3) * 0.5
      const cosine = Math.cos(display.roll ?? 0)
      const sine = Math.sin(display.roll ?? 0)
      const corners = [
        [-halfWidth, localMinY],
        [-halfWidth, localMaxY],
        [halfWidth, localMinY],
        [halfWidth, localMaxY],
      ] as const
      const transformed = corners.map(([x, y]) => ({
        z: display.position[2] + x * cosine - y * sine,
        y: display.position[1] + x * sine + y * cosine,
      }))
      return {
        minY: Math.min(...transformed.map((point) => point.y)),
        maxY: Math.max(...transformed.map((point) => point.y)),
        minZ: Math.min(...transformed.map((point) => point.z)),
        maxZ: Math.max(...transformed.map((point) => point.z)),
      }
    }

    const violations: string[] = []
    for (const gallery of permanentGalleries) {
      const displays = museumGalleryArtworkDisplays(gallery)
      for (const window of MUSEUM_GALLERY_INTERIORS[gallery.id].windows) {
        const centerZ = museumGalleryZ(gallery, window.t, 1.05)
        const windowBounds = {
          minY: window.y - window.height * 0.5 - 0.33,
          maxY: window.y + window.height * 0.5 + 0.26,
          minZ: centerZ - (window.width + 0.72) * 0.5,
          maxZ: centerZ + (window.width + 0.72) * 0.5,
        }
        for (const display of displays.filter((candidate) => candidate.wall === window.wall)) {
          const artworkBounds = decoratedArtworkBounds(display)
          const yGap = Math.max(
            windowBounds.minY - artworkBounds.maxY,
            artworkBounds.minY - windowBounds.maxY,
          )
          const zGap = Math.max(
            windowBounds.minZ - artworkBounds.maxZ,
            artworkBounds.minZ - windowBounds.maxZ,
          )
          const clearance = Math.max(yGap, zGap)
          if (clearance < 0.06) {
            violations.push(`${gallery.id} ${window.id}/${display.id}: ${clearance.toFixed(3)}m (y ${yGap.toFixed(3)}, z ${zGap.toFixed(3)})`)
          }
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('authors a varied, grounded tree family without shrinking atrium circulation', () => {
    expect(MUSEUM_ATRIUM_TREE_SPECS).toHaveLength(4)
    expect(MUSEUM_EXTERIOR_TREE_SPECS).toHaveLength(14)

    const allTrees = [...MUSEUM_ATRIUM_TREE_SPECS, ...MUSEUM_EXTERIOR_TREE_SPECS]
    expect(new Set(allTrees.map((tree) => tree.id)).size).toBe(allTrees.length)
    expect(new Set(MUSEUM_ATRIUM_TREE_SPECS.map((tree) => tree.variant))).toEqual(new Set([0, 1, 2]))
    expect(new Set(MUSEUM_EXTERIOR_TREE_SPECS.map((tree) => tree.variant))).toEqual(new Set([0, 1, 2]))
    expect(new Set(allTrees.map((tree) => tree.yaw)).size).toBeGreaterThanOrEqual(12)

    for (const tree of MUSEUM_ATRIUM_TREE_SPECS) {
      const collider = FORMAL_WALK_COLLIDERS.find((candidate) => candidate.id === `${tree.id}-planter`)
      expect(collider, tree.id).toBeDefined()
      if (!collider) continue

      expect((collider.minX + collider.maxX) * 0.5).toBeCloseTo(tree.position[0], 8)
      expect((collider.minZ + collider.maxZ) * 0.5).toBeCloseTo(tree.position[2], 8)

      const colliderHalfWidth = (collider.maxX - collider.minX) * 0.5
      const colliderHalfDepth = (collider.maxZ - collider.minZ) * 0.5
      const planterHalfExtent = 0.7125 * tree.scale
      expect(colliderHalfWidth - planterHalfExtent).toBeGreaterThanOrEqual(0.02)
      expect(colliderHalfDepth - planterHalfExtent).toBeGreaterThanOrEqual(0.02)

      const canopyRadius = MUSEUM_ATRIUM_TREE_VISUAL_RADIUS * tree.scale
      const sideWallClearance = 5.845 - (Math.abs(tree.position[0]) + canopyRadius)
      expect(sideWallClearance, `${tree.id} canopy/side-wall clearance`).toBeGreaterThanOrEqual(0.25)
      if (tree.id.startsWith('atrium-south')) {
        const entranceWallNorthFace = 10.14 + 0.34 * 0.5
        expect(tree.position[2] - canopyRadius - entranceWallNorthFace, `${tree.id} canopy/entrance-wall clearance`)
          .toBeGreaterThanOrEqual(0.25)
      }
    }

    const treeSource = expansionSource.slice(
      expansionSource.indexOf('function CourtyardTree'),
      expansionSource.indexOf('function AtriumBench'),
    )
    expect(treeSource).toContain("treeFamily: 'faceted-exterior-garden'")
    expect(treeSource).toContain("treeFamily: 'faceted-atrium-specimen'")
    expect(treeSource).toContain('<MuseumCanopyCluster')
    expect(treeSource).not.toContain('useFrame(')
  })
})
