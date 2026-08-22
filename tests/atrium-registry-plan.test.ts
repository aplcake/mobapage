import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ATRIUM_DEFAULT_ARTWORKS,
  ATRIUM_RESIDENT_SLOTS,
  ATRIUM_WALL_ART_FRAME_DEPTH,
  ATRIUM_WALL_ART_MOUNT_X,
  ATRIUM_WALL_BAYS,
  ATRIUM_WALL_INTERIOR_FACE_X,
  OPENING_SALON_MOBA_GALLERY_SLOTS,
  atriumArtworkFrameLayout,
  atriumResidentColliders,
  buildAtriumWallInstallation,
} from '../src/museum/formal-room/atriumRegistryPlan'
import { MUSEUM_ATRIUM_COLUMN_ZS, museumGalleryWallOpenings } from '../src/museum/formal-room/museumGalleryDesign'
import { MUSEUM_ATRIUM_PORTALS, MUSEUM_GALLERY_BY_ID } from '../src/museum/formal-room/museumPlan'
import { MUSEUM_ATRIUM_TREE_SPECS } from '../src/museum/formal-room/museumTreeDesign'
import { FORMAL_WALK_COLLIDERS, resolveFormalWalkPosition } from '../src/museum/formal-room/walkMath'
import { MUSEUM_COLLECTION_BY_ID } from '../src/museum/collection-registry/museumCollections'
import {
  GLOWBUD_MUSEUM_PERFORMANCE_CYCLE_SECONDS,
  GLOWBUD_MUSEUM_PERFORMANCE_STEPS,
  glowbudMuseumPerformanceAtTime,
} from '../src/museum/glowbuds/glowbudMuseumPerformance'

function expectWalkableSegment(from: { x: number; z: number }, to: { x: number; z: number }, colliders = FORMAL_WALK_COLLIDERS) {
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.08)
  let current = { ...from }
  for (let step = 1; step <= steps; step += 1) {
    const proposed = { x: from.x + (to.x - from.x) * step / steps, z: from.z + (to.z - from.z) * step / steps }
    const resolved = resolveFormalWalkPosition(current, proposed, undefined, colliders)
    expect(resolved).toEqual(proposed)
    current = resolved
  }
}

function pointToSightlineDistance(
  point: { x: number; z: number },
  from: { x: number; z: number },
  to: { x: number; z: number },
) {
  const dx = to.x - from.x
  const dz = to.z - from.z
  return Math.abs(dx * (from.z - point.z) - (from.x - point.x) * dz) / Math.hypot(dx, dz)
}

describe('personal atrium geometry and default installation', () => {
  it('keeps ten resident slots clear of the main promenade and both cross axes', () => {
    expect(ATRIUM_RESIDENT_SLOTS).toHaveLength(10)
    expect(new Set(ATRIUM_RESIDENT_SLOTS.map((slot) => `${slot.position[0]}:${slot.position[2]}`)).size).toBe(10)
    for (const slot of ATRIUM_RESIDENT_SLOTS) {
      expect(Math.abs(slot.position[0])).toBeGreaterThan(1.36)
      expect(slot.position[2]).toBeGreaterThanOrEqual(14.75)
      expect(slot.position[2]).toBeLessThanOrEqual(24.55)
      expect(slot.position[2] < 12.15 || slot.position[2] > 14.35).toBe(true)
      expect(slot.position[2] < 25.05 || slot.position[2] > 27.25).toBe(true)
    }
    const colliders = [...FORMAL_WALK_COLLIDERS, ...atriumResidentColliders(10)]
    expectWalkableSegment({ x: 0, z: 11 }, { x: 0, z: 30.8 }, colliders)
    expectWalkableSegment({ x: -1.25, z: 11 }, { x: -1.25, z: 30.8 }, colliders)
    expectWalkableSegment({ x: 1.25, z: 11 }, { x: 1.25, z: 30.8 }, colliders)
    expectWalkableSegment({ x: -5.25, z: 13.25 }, { x: 5.25, z: 13.25 }, colliders)
    expectWalkableSegment({ x: -5.25, z: 26.15 }, { x: 5.25, z: 26.15 }, colliders)
  })

  it('mounts twelve fitted frames on the real walls without crossing columns or side portals', () => {
    expect(ATRIUM_WALL_BAYS).toHaveLength(12)
    for (const bay of ATRIUM_WALL_BAYS) {
      expect(Math.abs(bay.position[0])).toBeCloseTo(ATRIUM_WALL_ART_MOUNT_X)
      const frameBackFaceX = Math.abs(bay.position[0]) + ATRIUM_WALL_ART_FRAME_DEPTH * 0.5
      const wallClearance = ATRIUM_WALL_INTERIOR_FACE_X - frameBackFaceX
      expect(wallClearance).toBeGreaterThanOrEqual(0.004)
      expect(wallClearance).toBeLessThanOrEqual(0.02)
      const layout = atriumArtworkFrameLayout(bay, bay.anchor ? 1.45 : 0.8)
      const frameMinZ = bay.position[2] - layout.outerWidth / 2
      const frameMaxZ = bay.position[2] + layout.outerWidth / 2
      for (const column of MUSEUM_ATRIUM_COLUMN_ZS) {
        const columnMinZ = column - 0.35
        const columnMaxZ = column + 0.35
        expect(Math.min(frameMaxZ, columnMaxZ) - Math.max(frameMinZ, columnMinZ)).toBeLessThanOrEqual(-0.08)
      }
      for (const portal of [MUSEUM_ATRIUM_PORTALS.mobaOne, MUSEUM_ATRIUM_PORTALS.mobaTwo]) {
        const portalMinZ = portal.atrium.z - portal.halfWidth
        const portalMaxZ = portal.atrium.z + portal.halfWidth
        expect(Math.min(frameMaxZ, portalMaxZ) - Math.max(frameMinZ, portalMinZ)).toBeLessThanOrEqual(-0.08)
      }
      expect(0.34 + layout.outerHeight / 2).toBeLessThanOrEqual(1.1)
      expect(0.34 + layout.labelY - 0.08).toBeGreaterThan(-0.72)
    }
    expect(ATRIUM_WALL_BAYS.filter((bay) => bay.anchor)).toHaveLength(4)
  })

  it('keeps the corner specimen trees out of the portal-to-art sightlines', () => {
    for (const side of ['west', 'east'] as const) {
      const x = side === 'west' ? -ATRIUM_WALL_ART_MOUNT_X : ATRIUM_WALL_ART_MOUNT_X
      const southBay = ATRIUM_WALL_BAYS.find((bay) => bay.side === side && bay.id.endsWith('01'))!
      const northBay = ATRIUM_WALL_BAYS.find((bay) => bay.side === side && bay.id.endsWith('06'))!
      const southTree = MUSEUM_ATRIUM_TREE_SPECS.find((tree) => tree.id === `atrium-south-${side}`)!
      const northTree = MUSEUM_ATRIUM_TREE_SPECS.find((tree) => tree.id === `atrium-north-${side}`)!
      expect(pointToSightlineDistance(
        { x: southTree.position[0], z: southTree.position[2] },
        { x: 0, z: MUSEUM_ATRIUM_PORTALS.mobaOne.atrium.z },
        { x, z: southBay.position[2] },
      )).toBeGreaterThan(1.2)
      expect(pointToSightlineDistance(
        { x: northTree.position[0], z: northTree.position[2] },
        { x: 0, z: MUSEUM_ATRIUM_PORTALS.mobaTwo.atrium.z },
        { x, z: northBay.position[2] },
      )).toBeGreaterThan(1.2)
    }
  })

  it('hangs the east wall collection on solid piers instead of over Photography windows', () => {
    const gallery = MUSEUM_GALLERY_BY_ID.photography
    const windows = museumGalleryWallOpenings(gallery, 'right')
      .filter((opening) => opening.kind === 'window')
      .map((opening) => ({
        minZ: gallery.placement.z - (opening.bounds.maxZ - gallery.minZ),
        maxZ: gallery.placement.z - (opening.bounds.minZ - gallery.minZ),
      }))
    const eastBays = ATRIUM_WALL_BAYS.filter((bay) => bay.side === 'east')
    for (const bay of eastBays) {
      const layout = atriumArtworkFrameLayout(bay, 2.35)
      const frameMinZ = bay.position[2] - layout.outerWidth * 0.5
      const frameMaxZ = bay.position[2] + layout.outerWidth * 0.5
      for (const window of windows) {
        expect(Math.min(frameMaxZ, window.maxZ) - Math.max(frameMinZ, window.minZ)).toBeLessThanOrEqual(-0.08)
      }
    }
  })

  it('uses the full Wardrobe renderer instead of a simplified atrium replica', () => {
    const source = readFileSync(new URL('../src/museum/glowbuds/GlowbudMuseumAvatar.tsx', import.meta.url), 'utf8')
    expect(source).toContain('<GlowbudTraitAvatarAsset')
    expect(source).toContain("renderer: 'canonical-wardrobe-avatar'")
    expect(source).toContain('glowbudMuseumPerformanceAtTime(tokenId, time)')
    expect(source).toContain("performanceCycle: 'wave-boogie-showcase-hop'")
    expect(source).toContain('activity={paused || reducedMotion ? 0 : 1.05}')
    expect(source).not.toContain('SimpleGlowbud')
  })

  it('keeps every museum Glowbud in a varied repeating authored performance loop', () => {
    expect(GLOWBUD_MUSEUM_PERFORMANCE_STEPS.map((step) => step.animation)).toEqual([
      'wave',
      'boogie',
      'showcase',
      'hop',
    ])
    expect(GLOWBUD_MUSEUM_PERFORMANCE_CYCLE_SECONDS).toBeCloseTo(11.97, 8)
    const allowed = new Set(GLOWBUD_MUSEUM_PERFORMANCE_STEPS.map((step) => step.animation))
    for (const tokenId of ['7', '208', '3239', '5688', '9001']) {
      const sampled = Array.from({ length: 48 }, (_, index) => (
        glowbudMuseumPerformanceAtTime(tokenId, index * 0.5).animation
      ))
      expect(sampled.every((animation) => allowed.has(animation))).toBe(true)
      expect(new Set(sampled)).toEqual(allowed)
      for (const time of [0, 1.25, 5.5, 10.8]) {
        expect(glowbudMuseumPerformanceAtTime(tokenId, time + GLOWBUD_MUSEUM_PERFORMANCE_CYCLE_SECONDS).animation)
          .toBe(glowbudMuseumPerformanceAtTime(tokenId, time).animation)
      }
    }
  })

  it('keeps authentic motion metadata on every animated default atrium work', () => {
    const animated = ATRIUM_DEFAULT_ARTWORKS.filter((artwork) => artwork.frameCount > 1)
    expect(animated.length).toBeGreaterThanOrEqual(8)
    expect(animated.every((artwork) => artwork.motionSheet || artwork.animationUrl)).toBe(true)
    expect(animated.every((artwork) => artwork.frameCount > 1)).toBe(true)
  })

  it('sprinkles MoBA Gallery across the atrium and keeps the other half on solid Opening Salon walls', () => {
    expect(ATRIUM_DEFAULT_ARTWORKS.filter((artwork) => artwork.collection === 'MoBA Gallery').map((artwork) => artwork.id)).toEqual([
      'museum-moba-gallery-2',
      'museum-moba-gallery-4',
      'museum-moba-gallery-6',
      'museum-moba-gallery-9',
    ])
    expect(OPENING_SALON_MOBA_GALLERY_SLOTS.map((slot) => slot.tokenId)).toEqual(['1', '3', '5', '7'])
    expect(new Set(OPENING_SALON_MOBA_GALLERY_SLOTS.map((slot) => `${slot.position[0]}:${slot.position[2]}`)).size).toBe(4)
    for (const slot of OPENING_SALON_MOBA_GALLERY_SLOTS) {
      expect(Math.abs(slot.position[0])).toBeCloseTo(5.71)
      expect(slot.position[2] < 1.1 || slot.position[2] > 7.65).toBe(true)
      const bay = {
        id: slot.id,
        side: slot.position[0] < 0 ? 'west' as const : 'east' as const,
        position: slot.position,
        rotationY: slot.rotationY,
        maxWidth: slot.maxWidth,
        maxHeight: slot.maxHeight,
        anchor: false,
      }
      const layout = atriumArtworkFrameLayout(bay, 1)
      expect(slot.position[1] + layout.outerHeight * 0.5).toBeLessThan(1.4)
      expect(slot.position[1] + layout.labelY - 0.08).toBeGreaterThan(-0.45)
    }
  })

  it('keeps a complete default hang and replaces only selected personal wall slots', () => {
    expect(ATRIUM_DEFAULT_ARTWORKS).toHaveLength(12)
    const collection = MUSEUM_COLLECTION_BY_ID['moba-one']
    const installation = {
      version: 1 as const,
      address: '0x1111111111111111111111111111111111111111' as const,
      addressSource: 'wallet' as const,
      glowbuds: [],
      artworks: [{ collectionId: collection.id, chainId: collection.chainId, contract: collection.contract, tokenId: '8' }],
      verifiedAt: '2026-08-21T00:00:00.000Z',
      layoutVersion: 1 as const,
    }
    const installed = buildAtriumWallInstallation(installation, [{
      ...installation.artworks[0], key: `${collection.id}:${collection.chainId}:${collection.contract}:8`,
      category: 'artwork' as const, title: 'Personal portrait', collection: collection.title,
      imageUrl: 'https://i.seadn.io/gae/personal.webp', animationUrl: 'https://i.seadn.io/gae/personal-motion.webp', attributes: [],
    }])
    expect(installed).toHaveLength(12)
    expect(installed[0]?.source).toBe('personal')
    expect(installed[0]?.imageUrl).toContain('/api/opensea/media?')
    expect(installed[0]?.imageUrl).toContain('variant=room')
    expect(installed[0]?.animationUrl).toContain('variant=motion')
    expect(installed.slice(1).every((artwork) => artwork.source === 'museum')).toBe(true)
  })
})
