import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MUSEUM_ATRIUM_WAYPOINTS } from '../src/museum/formal-room/museumPlan'
import { PERSONAL_GALLERY_DOOR_SPEC } from '../src/museum/formal-room/personalGalleryDoor'
import {
  FORMAL_WALK_COLLIDERS,
  resolveFormalWalkPosition,
} from '../src/museum/formal-room/walkMath'

const expansionSource = readFileSync(
  new URL('../src/museum/formal-room/MuseumExpansion.tsx', import.meta.url),
  'utf8',
)

describe('Personal Galleries coming-soon door', () => {
  it('turns the former central garden display into one clear locked museum landmark', () => {
    expect(PERSONAL_GALLERY_DOOR_SPEC).toMatchObject({
      label: 'Personal Galleries',
      status: 'Coming Soon',
      position: [0, 0, 35.34],
      centralBayWidth: 4.8,
      reviewPose: { x: 0, z: 27, yaw: Math.PI },
      reviewPoseLeft: { x: -1.65, z: 31.8, yaw: -2.705 },
      reviewPoseRight: { x: 1.65, z: 31.8, yaw: 2.705 },
    })
    expect(PERSONAL_GALLERY_DOOR_SPEC.casing.width)
      .toBeLessThan(PERSONAL_GALLERY_DOOR_SPEC.centralBayWidth)
    expect(PERSONAL_GALLERY_DOOR_SPEC.leaf.width)
      .toBeLessThan(PERSONAL_GALLERY_DOOR_SPEC.casing.width)
    expect(expansionSource).toContain('function PersonalGalleryDoor()')
    expect(expansionSource).toContain('<FarTurnPersonalGalleryFacade />')
    expect(expansionSource).toContain("context.fillText('PERSONAL GALLERIES'")
    expect(expansionSource).toContain("drawMuseumTrackingText(context, 'COMING SOON'")
    expect(expansionSource).not.toContain('function FarTurnGardenWindow()')
    expect(expansionSource).not.toContain('position={[0, -1.94, 39.2]}')
    expect(expansionSource).not.toContain('position={[0, 2.5, 35.12]}')
  })

  it('keeps the reveal mysterious and non-interactive without exposing the future feature', () => {
    const doorSource = expansionSource.slice(
      expansionSource.indexOf('function PersonalGalleryDoor()'),
      expansionSource.indexOf('function FarTurnPersonalGalleryFacade()'),
    )
    expect(doorSource).toContain('interactive: false')
    expect(doorSource).toContain('extrudeGeometry')
    expect(doorSource).toContain('torusGeometry')
    expect(doorSource).toContain('key={`personal-gallery-sconce-${side}`}')
    expect(doorSource).toContain('<pointLight')
    expect(doorSource).not.toContain('onClick=')
    expect(doorSource.toLowerCase()).not.toContain('nft')
    expect(doorSource.toLowerCase()).not.toContain('wallet')
    expect(doorSource).not.toContain('castShadow')
  })

  it('preserves the far-turn viewing approach while making the locked threshold solid', () => {
    expect(FORMAL_WALK_COLLIDERS).toContainEqual(PERSONAL_GALLERY_DOOR_SPEC.collider)
    expect(resolveFormalWalkPosition(
      { x: 0, z: 33.35 },
      { x: 0, z: 34.5 },
    )).toEqual({ x: 0, z: 34.5 })
    expect(resolveFormalWalkPosition(
      { x: 0, z: 34.5 },
      { x: 0, z: 35.1 },
    )).toEqual({ x: 0, z: 34.5 })
    expect(MUSEUM_ATRIUM_WAYPOINTS.at(-1)?.id).toBe('personal-galleries-turn')
  })
})
