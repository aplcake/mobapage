import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { collectArtworkApproachSceneCache } from '../src/museum/formal-room/ArtworkApproachTracker'
import {
  createMuseumArtworkProvenance,
  MUSEUM_ARTWORK_USER_DATA_KEY,
} from '../src/museum/formal-room/artworkProvenance'

function opaqueMesh() {
  return new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  )
}

describe('ArtworkApproachTracker scene cache', () => {
  it('keeps artwork and structural blockers while pruning decorative subtrees', () => {
    const scene = new THREE.Scene()
    const wall = opaqueMesh()
    scene.add(wall)

    const artwork = new THREE.Group()
    artwork.userData[MUSEUM_ARTWORK_USER_DATA_KEY] = createMuseumArtworkProvenance({
      id: 'test-artwork',
      title: 'Test Artwork',
      collection: 'MoBA',
    })
    const artworkSurface = opaqueMesh()
    artwork.add(artworkSurface)
    scene.add(artwork)

    const botanical = new THREE.Group()
    botanical.userData.museumPlant = 'test-plant'
    const leaf = opaqueMesh()
    botanical.add(leaf)
    scene.add(botanical)

    const resident = new THREE.Group()
    resident.userData.atriumResident = '1'
    const residentBody = opaqueMesh()
    resident.add(residentBody)
    scene.add(resident)

    const lighting = new THREE.Group()
    lighting.userData.lightingPlan = 'test-lighting'
    const lightPool = opaqueMesh()
    lighting.add(lightPool)
    scene.add(lighting)

    const cache = collectArtworkApproachSceneCache(scene)

    expect(cache.anchors.map((anchor) => anchor.artwork.id)).toEqual(['test-artwork'])
    expect(cache.raycastTargets).toContain(wall)
    expect(cache.raycastTargets).toContain(artworkSurface)
    expect(cache.raycastTargets).not.toContain(leaf)
    expect(cache.raycastTargets).not.toContain(residentBody)
    expect(cache.raycastTargets).not.toContain(lightPool)
  })

  it('does not cache transparent effects or non-mesh scene objects as blockers', () => {
    const scene = new THREE.Scene()
    const transparentEffect = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.08, depthWrite: false }),
    )
    const points = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ color: '#ffffff' }),
    )
    scene.add(transparentEffect, points)

    const cache = collectArtworkApproachSceneCache(scene)

    expect(cache.raycastTargets).toEqual([])
  })
})
