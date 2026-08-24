import { describe, expect, it } from 'vitest'
import {
  MUSEUM_ARTWORK_COUNT,
  MUSEUM_ATRIUM_PORTALS,
  MUSEUM_ATRIUM_REAR_PASSAGE,
  MUSEUM_ATRIUM_WAYPOINTS,
  MUSEUM_GALLERIES,
  MUSEUM_LOOP_PORTALS,
  MUSEUM_LOOP_WAYPOINTS,
  museumAreaAtPosition,
  museumGalleryAtPosition,
  nextMuseumGallery,
} from '../src/museum/formal-room/museumPlan'
import {
  FORMAL_WALK_COLLIDERS,
  FORMAL_WALK_PLAYER_RADIUS,
  MUSEUM_ATRIUM_COLLIDERS,
  MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER,
  isFormalWalkPointWalkable,
  resolveFormalWalkPosition,
  type FormalWalkPoint,
} from '../src/museum/formal-room/walkMath'

function expectWalkableSegment(from: FormalWalkPoint, to: FormalWalkPoint) {
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.08)
  let current = { ...from }
  for (let step = 1; step <= steps; step += 1) {
    const proposed = {
      x: from.x + ((to.x - from.x) * step) / steps,
      z: from.z + ((to.z - from.z) * step) / steps,
    }
    const resolved = resolveFormalWalkPosition(current, proposed)
    expect(resolved.x, `x blocked at ${step}/${steps}`).toBeCloseTo(proposed.x, 5)
    expect(resolved.z, `z blocked at ${step}/${steps}`).toBeCloseTo(proposed.z, 5)
    current = resolved
  }
}

describe('Formal Room museum expansion', () => {
  it('keeps the removed MoBA #1 sculpture absent and its old floor position open', () => {
    expect(FORMAL_WALK_COLLIDERS.some((collider) => collider.id === 'moba-one-enjoyer-totem')).toBe(false)
    expect(isFormalWalkPointWalkable({ x: -16, z: 13.5 })).toBe(true)
    expectWalkableSegment({ x: -16.8, z: 13.5 }, { x: -15.2, z: 13.5 })
    expectWalkableSegment({ x: -15.2, z: 13.5 }, { x: -16.8, z: 13.5 })
  })

  it('keeps a clear ceremonial path from the atrium into the MoBA #1 portrait salon', () => {
    const atriumDoor = MUSEUM_ATRIUM_PORTALS.mobaOne
    const salonCenter = { x: -12.2, z: atriumDoor.room.z }
    expectWalkableSegment(atriumDoor.atrium, atriumDoor.room)
    expectWalkableSegment(atriumDoor.room, salonCenter)
    expectWalkableSegment(salonCenter, atriumDoor.atrium)
    expectWalkableSegment({ x: -17, z: 8.2 }, { x: -17, z: 18 })
    expectWalkableSegment({ x: -17, z: 18 }, { x: -17, z: 8.2 })
    expect(museumGalleryAtPosition(salonCenter)).toBe('moba-one')
  })

  it('keeps all four MoBA #1 viewing lanes open around the salon bench', () => {
    for (const x of [-17, -14.2, -12.2, -10.2]) {
      expectWalkableSegment({ x, z: 8.2 }, { x, z: 18 })
      expectWalkableSegment({ x, z: 18 }, { x, z: 8.2 })
    }

    const bench = FORMAL_WALK_COLLIDERS.find((collider) => collider.id === 'moba-one-bench')!
    expect(bench).toBeDefined()
    expect((bench.minX + bench.maxX) * 0.5).toBeCloseTo(-15.55, 6)
    expect((bench.minZ + bench.maxZ) * 0.5).toBeCloseTo(11.095, 3)
    expect(resolveFormalWalkPosition(
      { x: -14.2, z: 11.095 },
      { x: -15.55, z: 11.095 },
    )).toEqual({ x: -14.2, z: 11.095 })
  })

  it('keeps every MoBA #2 atrium approach and viewing lane comfortably walkable', () => {
    const portal = MUSEUM_ATRIUM_PORTALS.mobaTwo
    for (const offset of [-0.55, 0, 0.55]) {
      const atrium = { x: portal.atrium.x, z: portal.atrium.z + offset }
      const doorway = { x: portal.room.x, z: portal.room.z + offset }
      const viewingLane = { x: -10.2, z: portal.room.z + offset }
      expectWalkableSegment(atrium, doorway)
      expectWalkableSegment(doorway, viewingLane)
      expectWalkableSegment(viewingLane, doorway)
    }

    expectWalkableSegment({ x: -14.2, z: 20.9 }, { x: -14.2, z: 31.7 })
    expectWalkableSegment({ x: -14.2, z: 31.7 }, { x: -14.2, z: 20.9 })
    expectWalkableSegment({ x: -10.2, z: 20.9 }, { x: -10.2, z: 32 })
    expectWalkableSegment({ x: -10.2, z: 32 }, { x: -10.2, z: 20.9 })

    const heartCollider = FORMAL_WALK_COLLIDERS.find((collider) => collider.id === 'moba-two-bouncing-heart')!
    expect((heartCollider.minX + heartCollider.maxX) * 0.5).toBeCloseTo(-12.2, 8)
    expect((heartCollider.minZ + heartCollider.maxZ) * 0.5).toBeCloseTo(26.175, 8)
    expect(resolveFormalWalkPosition(
      { x: -10.9, z: 26.175 },
      { x: -12.2, z: 26.175 },
    )).toEqual({ x: -10.9, z: 26.175 })
  })

  it('keeps every Photography atrium approach and viewing lane comfortably walkable', () => {
    const portal = MUSEUM_ATRIUM_PORTALS.photography
    for (const offset of [-0.55, 0, 0.55]) {
      const atrium = { x: portal.atrium.x, z: portal.atrium.z + offset }
      const doorway = { x: portal.room.x, z: portal.room.z + offset }
      const center = { x: 12.2, z: portal.room.z + offset }
      expectWalkableSegment(atrium, doorway)
      expectWalkableSegment(doorway, center)
      expectWalkableSegment(center, doorway)
    }

    const axialViewingPoint = { x: 16.2, z: portal.room.z }
    expectWalkableSegment(portal.room, axialViewingPoint)
    expectWalkableSegment(axialViewingPoint, portal.atrium)

    for (const x of [10.2, 14.2]) {
      expectWalkableSegment({ x, z: 20.9 }, { x, z: 31.7 })
      expectWalkableSegment({ x, z: 31.7 }, { x, z: 20.9 })
    }

    const bench = FORMAL_WALK_COLLIDERS.find((collider) => collider.id === 'photography-bench')!
    expect((bench.minX + bench.maxX) * 0.5).toBeCloseTo(8.8, 6)
    expect((bench.minZ + bench.maxZ) * 0.5).toBeCloseTo(23.176, 3)
    expect(resolveFormalWalkPosition(
      { x: 10.2, z: 23.176 },
      { x: 8.8, z: 23.176 },
    )).toEqual({ x: 10.2, z: 23.176 })
  })

  it('keeps every Holiday atrium approach, viewing lane, and south return comfortably walkable', () => {
    const portal = MUSEUM_ATRIUM_PORTALS.holiday
    for (const offset of [-0.62, 0, 0.62]) {
      const atrium = { x: portal.atrium.x, z: portal.atrium.z + offset }
      const doorway = { x: portal.room.x, z: portal.room.z + offset }
      const center = { x: 12.2, z: portal.room.z + offset }
      expectWalkableSegment(atrium, doorway)
      expectWalkableSegment(doorway, center)
      expectWalkableSegment(center, doorway)
    }

    for (const x of [10.2, 14.2]) {
      expectWalkableSegment({ x, z: 7.8 }, { x, z: 18.4 })
      expectWalkableSegment({ x, z: 18.4 }, { x, z: 7.8 })
    }
    expectWalkableSegment({ x: 10.2, z: portal.room.z }, { x: 14.2, z: portal.room.z })
    expectWalkableSegment({ x: 14.2, z: portal.room.z }, { x: 10.2, z: portal.room.z })

    const bench = FORMAL_WALK_COLLIDERS.find((collider) => collider.id === 'holiday-bench')!
    expect((bench.minX + bench.maxX) * 0.5).toBeCloseTo(8.75, 6)
    expect((bench.minZ + bench.maxZ) * 0.5).toBeCloseTo(10.04, 2)
    expect(resolveFormalWalkPosition(
      { x: 10.2, z: 10.04 },
      { x: 8.75, z: 10.04 },
    )).toEqual({ x: 10.2, z: 10.04 })

    expect(MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER.id).toBe('holiday-gift-vitrine')
    expect(
      MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER.maxX - MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER.minX,
    ).toBeLessThan(1.25)
    expect(
      MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER.maxZ - MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER.minZ,
    ).toBeLessThan(1.05)
    expect((
      MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER.minX + MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER.maxX
    ) * 0.5).toBeCloseTo(16.7, 6)
    expect((
      MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER.minZ + MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER.maxZ
    ) * 0.5).toBeCloseTo(12.18, 2)
    expect(FORMAL_WALK_COLLIDERS).toContain(MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER)
    expect(resolveFormalWalkPosition(
      { x: 15.2, z: 12.18 },
      { x: 16.7, z: 12.18 },
    )).toEqual({ x: 15.2, z: 12.18 })

    for (const offset of [-0.62, 0, 0.62]) {
      const inside = { x: 11.16 + offset, z: 7.5 }
      const connector = { x: 11.16 + offset, z: 5.6 }
      expectWalkableSegment(inside, connector)
      expectWalkableSegment(connector, inside)
    }
  })

  it('builds one clear five-room promenade with real permanent exhibitions', () => {
    expect(MUSEUM_GALLERIES.map((gallery) => gallery.id)).toEqual([
      'lobby',
      'moba-one',
      'moba-two',
      'photography',
      'holiday',
    ])
    expect(MUSEUM_GALLERIES.map((gallery) => gallery.artworks.length)).toEqual([0, 12, 12, 8, 11])
    expect(MUSEUM_ARTWORK_COUNT).toBe(43)

    const artworkIds = MUSEUM_GALLERIES.flatMap((gallery) => gallery.artworks.map((artwork) => artwork.id))
    expect(new Set(artworkIds).size).toBe(43)
    for (const gallery of MUSEUM_GALLERIES.slice(1)) {
      expect(gallery.collectionUrl).toMatch(/^https:\/\/opensea\.io\/collection\//)
      for (const artwork of gallery.artworks) {
        expect(artwork.poster).toMatch(/^\/museum\/formal-room\/galleries\/.+\.webp$/)
        expect(artwork.sourceUrl).toMatch(/^https:\/\/opensea\.io\/assets\//)
        expect(artwork.frameCount).toBeGreaterThan(0)
        expect(Boolean(artwork.motion)).toBe(artwork.frameCount > 1)
      }
    }
  })

  it('preserves every genuinely animated artwork instead of flattening it to a poster', () => {
    const motionCounts = Object.fromEntries(
      MUSEUM_GALLERIES.map((gallery) => [
        gallery.id,
        gallery.artworks.filter((artwork) => artwork.motion).length,
      ]),
    )
    expect(motionCounts).toEqual({
      lobby: 0,
      'moba-one': 12,
      'moba-two': 12,
      photography: 0,
      holiday: 6,
    })

    for (const gallery of MUSEUM_GALLERIES.slice(1)) {
      expect(gallery.artworks.filter((artwork) => artwork.featured)).toHaveLength(
        gallery.id === 'photography' ? 0 : 1,
      )
    }
  })

  it('places every gentle-travel pose inside the correct wing of the loop', () => {
    for (const gallery of MUSEUM_GALLERIES) {
      expect(isFormalWalkPointWalkable(gallery.travelPose)).toBe(true)
      expect(museumGalleryAtPosition(gallery.travelPose)).toBe(gallery.id)
    }
    expect(nextMuseumGallery('holiday').id).toBe('lobby')
    expect(museumGalleryAtPosition({ x: -12.2, z: 13 })).toBe('moba-one')
    expect(museumGalleryAtPosition({ x: 12.2, z: 13 })).toBe('holiday')
  })

  it('makes the left portal the entry and the right portal the return', () => {
    expect(MUSEUM_LOOP_PORTALS.entry.side).toBe('left')
    expect(MUSEUM_LOOP_PORTALS.entry.salon.x).toBeLessThan(0)
    expect(MUSEUM_LOOP_PORTALS.return.side).toBe('right')
    expect(MUSEUM_LOOP_PORTALS.return.salon.x).toBeGreaterThan(0)

    for (const portal of Object.values(MUSEUM_LOOP_PORTALS)) {
      const tangentOffset = Math.min(0.45, portal.halfWidth - FORMAL_WALK_PLAYER_RADIUS - 0.08)
      for (const offset of [-tangentOffset, 0, tangentOffset]) {
        const salon = {
          x: portal.salon.x + portal.tangent.x * offset,
          z: portal.salon.z + portal.tangent.z * offset,
        }
        const wing = {
          x: portal.wing.x + portal.tangent.x * offset,
          z: portal.wing.z + portal.tangent.z * offset,
        }
        expectWalkableSegment(salon, wing)
        expectWalkableSegment(wing, salon)
      }
    }
  })

  it('supports one continuous no-teleport loop through every gallery', () => {
    for (let index = 1; index < MUSEUM_LOOP_WAYPOINTS.length; index += 1) {
      expectWalkableSegment(MUSEUM_LOOP_WAYPOINTS[index - 1], MUSEUM_LOOP_WAYPOINTS[index])
    }

    const compressedGalleryOrder = MUSEUM_LOOP_WAYPOINTS
      .map((point) => museumGalleryAtPosition(point))
      .filter((galleryId, index, galleryIds) => index === 0 || galleryId !== galleryIds[index - 1])
    expect(compressedGalleryOrder).toEqual([
      'lobby',
      'moba-one',
      'moba-two',
      'photography',
      'holiday',
      'lobby',
    ])
    expect(MUSEUM_LOOP_WAYPOINTS[0].x).toBe(MUSEUM_LOOP_WAYPOINTS.at(-1)!.x)
    expect(MUSEUM_LOOP_WAYPOINTS[0].z).toBe(MUSEUM_LOOP_WAYPOINTS.at(-1)!.z)
  })

  it('opens the salon and all four galleries directly into the atrium', () => {
    for (const portal of Object.values(MUSEUM_ATRIUM_PORTALS)) {
      const tangentOffset = Math.min(0.55, portal.halfWidth - FORMAL_WALK_PLAYER_RADIUS - 0.08)
      for (const offset of [-tangentOffset, 0, tangentOffset]) {
        const room = {
          x: portal.room.x + portal.tangent.x * offset,
          z: portal.room.z + portal.tangent.z * offset,
        }
        const atrium = {
          x: portal.atrium.x + portal.tangent.x * offset,
          z: portal.atrium.z + portal.tangent.z * offset,
        }
        expectWalkableSegment(room, atrium)
        expectWalkableSegment(atrium, room)
      }
      expect(museumGalleryAtPosition(portal.room)).toBe(portal.galleryId)
      expect(museumGalleryAtPosition(portal.atrium)).toBe('lobby')
      expect(museumAreaAtPosition(portal.atrium)).toBe('atrium')
    }
    expect(museumAreaAtPosition(MUSEUM_ATRIUM_PORTALS.salon.room)).toBe('lobby')
  })

  it('supports a direct walk through the full atrium to the back-window turn', () => {
    for (let index = 1; index < MUSEUM_ATRIUM_WAYPOINTS.length; index += 1) {
      expectWalkableSegment(MUSEUM_ATRIUM_WAYPOINTS[index - 1], MUSEUM_ATRIUM_WAYPOINTS[index])
    }
    expectWalkableSegment(MUSEUM_ATRIUM_REAR_PASSAGE.atrium, MUSEUM_ATRIUM_REAR_PASSAGE.turn)
    expectWalkableSegment(MUSEUM_ATRIUM_REAR_PASSAGE.turn, MUSEUM_ATRIUM_REAR_PASSAGE.atrium)
    expect(museumAreaAtPosition(MUSEUM_ATRIUM_REAR_PASSAGE.atrium)).toBe('atrium')
    expect(museumAreaAtPosition(MUSEUM_ATRIUM_REAR_PASSAGE.turn)).not.toBe('atrium')
  })

  it('keeps walls and furniture solid while the former atrium planting stays open', () => {
    expect(resolveFormalWalkPosition({ x: 3, z: 9.2 }, { x: 3, z: 10.8 })).toEqual({ x: 3, z: 9.2 })
    expect(resolveFormalWalkPosition({ x: -5.3, z: 7.25 }, { x: -6.6, z: 7.25 })).toEqual({ x: -5.3, z: 7.25 })
    expect(resolveFormalWalkPosition({ x: 5.3, z: 2.7 }, { x: 6.6, z: 2.7 })).toEqual({ x: 5.3, z: 2.7 })
    expect(resolveFormalWalkPosition({ x: -5.2, z: 17 }, { x: -7, z: 17 })).toEqual({ x: -5.2, z: 17 })
    expect(resolveFormalWalkPosition({ x: 5.2, z: 17 }, { x: 7, z: 17 })).toEqual({ x: 5.2, z: 17 })
    expect(resolveFormalWalkPosition({ x: 3, z: 31.1 }, { x: 3, z: 32.6 })).toEqual({ x: 3, z: 31.1 })
    expect(resolveFormalWalkPosition({ x: 3, z: 32.6 }, { x: 3, z: 31.1 })).toEqual({ x: 3, z: 32.6 })
    expectWalkableSegment({ x: 0, z: 16.5 }, { x: 0, z: 23 })
    expect(resolveFormalWalkPosition({ x: -3, z: 19.55 }, { x: -3.8, z: 19.55 })).toEqual({ x: -3, z: 19.55 })
    expect(MUSEUM_ATRIUM_COLLIDERS.some((collider) => collider.id?.endsWith('-planter'))).toBe(false)
    expectWalkableSegment({ x: -5, z: 16.65 }, { x: -3.7, z: 16.65 })
    expectWalkableSegment({ x: 3.7, z: 16.65 }, { x: 5, z: 16.65 })
    expectWalkableSegment({ x: -5, z: 30.1 }, { x: -3.7, z: 30.1 })
    expectWalkableSegment({ x: 3.8, z: 28 }, { x: 5.1, z: 28 })

    const colliderIds = new Set(FORMAL_WALK_COLLIDERS.map((collider) => collider.id))
    expect(MUSEUM_ATRIUM_COLLIDERS.every((collider) => colliderIds.has(collider.id))).toBe(true)
  })
})
