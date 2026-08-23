'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import {
  isMuseumArtworkProvenance,
  MUSEUM_ARTWORK_USER_DATA_KEY,
  type MuseumArtworkProvenance,
} from './artworkProvenance'

const SAMPLE_INTERVAL_SECONDS = 0.14
const ANCHOR_REFRESH_SECONDS = 0.9
const APPROACH_DWELL_SECONDS = 0.18
const LEAVE_GRACE_SECONDS = 0.34
const ENTER_DISTANCE = 5.1
const KEEP_DISTANCE = 5.75
const ENTER_VIEW_DOT = 0.91
const KEEP_VIEW_DOT = 0.875
const MINIMUM_FRONT_DOT = 0.08

type ArtworkAnchor = {
  object: THREE.Object3D
  artwork: MuseumArtworkProvenance
}

type ArtworkCandidate = ArtworkAnchor & {
  distance: number
  score: number
}

function isVisibleInHierarchy(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object
  while (current) {
    if (!current.visible) return false
    current = current.parent
  }
  return true
}

function artworkAncestor(object: THREE.Object3D | null) {
  let current = object
  while (current) {
    if (isMuseumArtworkProvenance(current.userData[MUSEUM_ARTWORK_USER_DATA_KEY])) return current
    current = current.parent
  }
  return null
}

function intersectionCanBlock(object: THREE.Object3D) {
  const mesh = object as THREE.Mesh
  if (!mesh.isMesh) return true
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  return materials.some((material) => (
    material.visible
    && (!material.transparent || material.opacity > 0.14)
    && (material.depthWrite || !material.transparent)
  ))
}

export function ArtworkApproachTracker({
  enabled,
  onArtworkChange,
}: {
  enabled: boolean
  onArtworkChange: (artwork: MuseumArtworkProvenance | null) => void
}) {
  const { camera, scene } = useThree()
  const anchorsRef = useRef<ArtworkAnchor[]>([])
  const nextSampleAtRef = useRef(0)
  const nextAnchorRefreshAtRef = useRef(0)
  const currentRef = useRef<MuseumArtworkProvenance | null>(null)
  const currentLastSeenAtRef = useRef(0)
  const pendingRef = useRef<{ id: string; since: number } | null>(null)
  const onArtworkChangeRef = useRef(onArtworkChange)
  const cameraPositionRef = useRef(new THREE.Vector3())
  const cameraForwardRef = useRef(new THREE.Vector3())
  const artworkPositionRef = useRef(new THREE.Vector3())
  const toArtworkRef = useRef(new THREE.Vector3())
  const artworkNormalRef = useRef(new THREE.Vector3())
  const artworkQuaternionRef = useRef(new THREE.Quaternion())
  const raycasterRef = useRef(new THREE.Raycaster())

  useEffect(() => {
    onArtworkChangeRef.current = onArtworkChange
  }, [onArtworkChange])

  useEffect(() => {
    if (enabled) return
    currentRef.current = null
    pendingRef.current = null
    onArtworkChangeRef.current(null)
  }, [enabled])

  useFrame(({ clock }) => {
    if (!enabled) return
    const elapsed = clock.elapsedTime
    if (elapsed < nextSampleAtRef.current) return
    nextSampleAtRef.current = elapsed + SAMPLE_INTERVAL_SECONDS

    if (elapsed >= nextAnchorRefreshAtRef.current || anchorsRef.current.length === 0) {
      const nextAnchors: ArtworkAnchor[] = []
      scene.traverse((object) => {
        const artwork = object.userData[MUSEUM_ARTWORK_USER_DATA_KEY]
        if (isMuseumArtworkProvenance(artwork)) nextAnchors.push({ object, artwork })
      })
      anchorsRef.current = nextAnchors
      nextAnchorRefreshAtRef.current = elapsed + ANCHOR_REFRESH_SECONDS
    }

    const cameraPosition = camera.getWorldPosition(cameraPositionRef.current)
    const cameraForward = camera.getWorldDirection(cameraForwardRef.current).normalize()
    const currentId = currentRef.current?.id ?? null
    let best: ArtworkCandidate | null = null

    for (const anchor of anchorsRef.current) {
      if (!anchor.object.parent || !isVisibleInHierarchy(anchor.object)) continue
      const artworkPosition = anchor.object.getWorldPosition(artworkPositionRef.current)
      const toArtwork = toArtworkRef.current.copy(artworkPosition).sub(cameraPosition)
      const distance = toArtwork.length()
      const isCurrent = anchor.artwork.id === currentId
      if (distance <= 0.15 || distance > (isCurrent ? KEEP_DISTANCE : ENTER_DISTANCE)) continue

      toArtwork.multiplyScalar(1 / distance)
      const viewDot = cameraForward.dot(toArtwork)
      if (viewDot < (isCurrent ? KEEP_VIEW_DOT : ENTER_VIEW_DOT)) continue

      anchor.object.getWorldQuaternion(artworkQuaternionRef.current)
      const artworkNormal = artworkNormalRef.current
        .set(0, 0, 1)
        .applyQuaternion(artworkQuaternionRef.current)
        .normalize()
      const frontDot = -artworkNormal.dot(toArtwork)
      if (frontDot < MINIMUM_FRONT_DOT) continue

      const score = distance + (1 - viewDot) * 7 + (1 - frontDot) * 0.45
      if (!best || score < best.score) best = { ...anchor, distance, score }
    }

    if (best) {
      const rayDirection = toArtworkRef.current
        .copy(best.object.getWorldPosition(artworkPositionRef.current))
        .sub(cameraPosition)
        .normalize()
      const raycaster = raycasterRef.current
      raycaster.set(cameraPosition, rayDirection)
      raycaster.near = 0.08
      raycaster.far = best.distance + 0.45
      const intersections = raycaster.intersectObjects(scene.children, true)
      let visible = false
      for (const intersection of intersections) {
        const artworkObject = artworkAncestor(intersection.object)
        if (artworkObject === best.object) {
          visible = true
          break
        }
        if (!intersectionCanBlock(intersection.object)) continue
        if (intersection.distance < best.distance - 0.18) break
        visible = true
        break
      }
      if (!visible) best = null
    }

    if (best?.artwork.id === currentId) {
      currentLastSeenAtRef.current = elapsed
      pendingRef.current = null
      return
    }

    if (best) {
      const pending = pendingRef.current
      if (!pending || pending.id !== best.artwork.id) {
        pendingRef.current = { id: best.artwork.id, since: elapsed }
        return
      }
      if (elapsed - pending.since < APPROACH_DWELL_SECONDS) return
      currentRef.current = best.artwork
      currentLastSeenAtRef.current = elapsed
      pendingRef.current = null
      onArtworkChangeRef.current(best.artwork)
      return
    }

    pendingRef.current = null
    if (currentRef.current && elapsed - currentLastSeenAtRef.current >= LEAVE_GRACE_SECONDS) {
      currentRef.current = null
      onArtworkChangeRef.current(null)
    }
  })

  return null
}
