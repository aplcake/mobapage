'use client'

import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  GlowbudFrameBudget,
  GlowbudTraitAvatarAsset,
  type RedShellCritterAnimation,
} from '../../../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example'
import type { MuseumAssetAttribute } from '../collection-registry/museumAssetTypes'
import { composeGlowbudDisplayTraits } from './glowbudDisplayTraits'
import { glowbudMuseumPerformanceAtTime } from './glowbudMuseumPerformance'

const TARGET_HEIGHT = 1.82
const TARGET_FOOTPRINT = 0.9
const PERFORMANCE_SELECTION_INTERVAL_SECONDS = 0.2

export type GlowbudMuseumAvatarQuality = 'full' | 'resident'

export function residentGlowbudAnimationFps(motionFps: number) {
  return Math.min(24, Math.max(12, motionFps + 6))
}

type GlowbudRenderable = THREE.Mesh | THREE.Line | THREE.Points
type GlowbudFarSlot = keyof typeof GLOWBUD_FAR_SLOT_CAPS

export const GLOWBUD_FAR_SLOT_CAPS = {
  shell: 14,
  face: 14,
  'head-pot': 16,
  held: 8,
  companion: 10,
  skin: 8,
  shared: 10,
} as const

const FAR_DROP_PRIORITY = /(outline|shadow|contact|spark|glint|shine|highlight|dust|fuzz|fiber|nap|puff|polish|decal|stitch|seam)/i
const FAR_IDENTITY_PRIORITY = /(eye|pupil|mouth|tooth|teeth|tongue|nose|face|skin|hand|arm|plant|flower|leaf|stem|trunk|shell|body|pot|head|companion|held|crown|hood|hat)/i
const FAR_FACE_FEATURE_PRIORITY = /(glowbud-eye|glowbud-mouth|glowbud-nose|pupil|iris|brow|tooth|teeth|tongue)/i

function isGlowbudRenderable(object: THREE.Object3D): object is GlowbudRenderable {
  return object instanceof THREE.Mesh
    || object instanceof THREE.Line
    || object instanceof THREE.Points
}

function renderableMaterialList(object: GlowbudRenderable) {
  const material = object.material
  return Array.isArray(material) ? material : [material]
}

function renderableTraitSlot(object: THREE.Object3D, root: THREE.Object3D): GlowbudFarSlot {
  let current: THREE.Object3D | null = object
  while (current && current !== root.parent) {
    const slot = current.userData?.glowbudTraitSlot
    if (typeof slot === 'string' && slot in GLOWBUD_FAR_SLOT_CAPS) {
      return slot as GlowbudFarSlot
    }
    current = current.parent
  }
  return 'shared'
}

function renderableIdentityPath(object: THREE.Object3D, root: THREE.Object3D) {
  const names: string[] = []
  let current: THREE.Object3D | null = object
  while (current && current !== root.parent) {
    if (current.userData?.glowbudTraitSlot) break
    if (current.name) names.push(current.name)
    current = current.parent
  }
  return names.join(' ')
}

function keepFarRenderable(object: GlowbudRenderable, root: THREE.Object3D) {
  if (object instanceof THREE.InstancedMesh) return true
  const semanticPath = renderableIdentityPath(object, root)
  const materials = renderableMaterialList(object)
  if (materials.length > 0 && materials.every((material) => material.side === THREE.BackSide)) {
    return false
  }
  if (materials.length > 0 && materials.every((material) => (
    material.transparent && material.opacity < 0.72
  ))) return false
  return !FAR_DROP_PRIORITY.test(semanticPath)
}

function farIdentitySizeScore(object: GlowbudRenderable, root: THREE.Object3D) {
  const geometry = object.geometry
  if (!geometry.boundingSphere) geometry.computeBoundingSphere()
  const worldScale = object.getWorldScale(new THREE.Vector3())
  const radius = (geometry.boundingSphere?.radius ?? 0)
    * Math.max(worldScale.x, worldScale.y, worldScale.z)
  const semanticPath = renderableIdentityPath(object, root)
  return radius + (FAR_IDENTITY_PRIORITY.test(semanticPath) ? 0.42 : 0)
}

/**
 * Keeps the exact mounted canonical avatar and its shared resources in place,
 * but limits far rendering to the most identity-bearing meshes. No geometry,
 * textures, render targets, or secondary WebGL contexts are allocated.
 */
export function applyGlowbudMeshDetailQuality(
  root: THREE.Object3D,
  quality: GlowbudMuseumAvatarQuality,
  originalVisibility: Map<THREE.Object3D, boolean>,
) {
  const renderables: GlowbudRenderable[] = []
  root.updateWorldMatrix(true, true)
  root.traverse((object) => {
    if (!isGlowbudRenderable(object)) return
    if (!originalVisibility.has(object)) originalVisibility.set(object, object.visible)
    if (originalVisibility.get(object)) renderables.push(object)
  })

  if (quality === 'full') {
    originalVisibility.forEach((visible, object) => {
      object.visible = visible
    })
    return { total: renderables.length, visible: renderables.length }
  }

  const forcedInstanced = renderables.filter((object) => object instanceof THREE.InstancedMesh)
  const keep = new Set<GlowbudRenderable>(forcedInstanced)
  const ordinaryBySlot = new Map<GlowbudFarSlot, Array<{
    object: GlowbudRenderable
    order: number
    score: number
  }>>()

  renderables.forEach((object, order) => {
    if (object instanceof THREE.InstancedMesh || !keepFarRenderable(object, root)) return
    const slot = renderableTraitSlot(object, root)
    if (slot === 'face' && FAR_FACE_FEATURE_PRIORITY.test(renderableIdentityPath(object, root))) {
      keep.add(object)
      return
    }
    const entries = ordinaryBySlot.get(slot) ?? []
    entries.push({ object, order, score: farIdentitySizeScore(object, root) })
    ordinaryBySlot.set(slot, entries)
  })

  ordinaryBySlot.forEach((entries, slot) => {
    entries
      .sort((left, right) => right.score - left.score || left.order - right.order)
      .slice(0, GLOWBUD_FAR_SLOT_CAPS[slot])
      .forEach(({ object }) => keep.add(object))
  })

  renderables.forEach((object) => {
    object.visible = keep.has(object)
  })
  const visible = keep.size
  return { total: renderables.length, visible }
}

export function GlowbudMuseumAvatar({
  tokenId,
  attributes,
  phase = 0,
  paused = false,
  reducedMotion = false,
  motionFps = 15,
  quality = 'full',
}: {
  tokenId: string
  attributes: readonly MuseumAssetAttribute[]
  phase?: number
  paused?: boolean
  reducedMotion?: boolean
  motionFps?: number
  quality?: GlowbudMuseumAvatarQuality
}) {
  const residentRoot = useRef<THREE.Group>(null)
  const avatarRoot = useRef<THREE.Group>(null)
  const canonicalRoot = useRef<THREE.Group>(null)
  const originalVisibilityRef = useRef(new Map<THREE.Object3D, boolean>())
  const [normalized, setNormalized] = useState(false)
  const traits = useMemo(() => composeGlowbudDisplayTraits(attributes).traits, [attributes])
  const initialPerformance = useMemo(
    () => glowbudMuseumPerformanceAtTime(tokenId, phase),
    [phase, tokenId],
  )
  const [performanceAnimation, setPerformanceAnimation] = useState<RedShellCritterAnimation>(
    initialPerformance.animation,
  )
  const performanceAnimationRef = useRef<RedShellCritterAnimation>(initialPerformance.animation)
  const lastPerformanceUpdateAtRef = useRef(Number.NEGATIVE_INFINITY)
  const animation: RedShellCritterAnimation = reducedMotion || paused ? 'idle' : performanceAnimation

  useLayoutEffect(() => {
    const avatar = avatarRoot.current
    if (!avatar) return
    avatar.position.set(0, 0, 0)
    avatar.scale.setScalar(1)
    avatar.updateWorldMatrix(true, true)

    const box = new THREE.Box3().setFromObject(avatar)
    const size = box.getSize(new THREE.Vector3())
    const parentPosition = avatar.parent?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3()
    const localFloor = box.min.y - parentPosition.y
    const heightScale = TARGET_HEIGHT / Math.max(0.01, size.y)
    const footprintScale = TARGET_FOOTPRINT / Math.max(0.01, size.x, size.z)
    const scale = Math.min(heightScale, footprintScale)

    avatar.scale.setScalar(scale)
    avatar.position.y = -localFloor * scale
    avatar.updateWorldMatrix(true, true)
    setNormalized(true)
  }, [traits])

  useLayoutEffect(() => {
    const canonical = canonicalRoot.current
    if (!canonical) return
    const originalVisibility = originalVisibilityRef.current
    applyGlowbudMeshDetailQuality(canonical, quality, originalVisibility)
    return () => {
      applyGlowbudMeshDetailQuality(canonical, 'full', originalVisibility)
    }
  }, [quality, traits])

  useFrame(({ clock }, delta) => {
    const root = residentRoot.current
    if (!root || paused || reducedMotion) return
    const time = clock.elapsedTime + phase

    // Performance selection changes only every few seconds, so checking it at
    // 5 Hz avoids needless React work. The visible body motion below remains
    // on the renderer cadence so residents never look like stop-motion toys.
    if (
      clock.elapsedTime - lastPerformanceUpdateAtRef.current
      >= PERFORMANCE_SELECTION_INTERVAL_SECONDS
    ) {
      lastPerformanceUpdateAtRef.current = clock.elapsedTime
      const nextPerformance = glowbudMuseumPerformanceAtTime(tokenId, time)
      if (nextPerformance.animation !== performanceAnimationRef.current) {
        performanceAnimationRef.current = nextPerformance.animation
        setPerformanceAnimation(nextPerformance.animation)
      }
    }

    const swayAmount = quality === 'resident' ? 0.022 : 0.035
    const bobAmount = quality === 'resident' ? 0.011 : 0.014
    root.rotation.y = THREE.MathUtils.damp(root.rotation.y, Math.sin(time * 0.43) * swayAmount, 4, delta)
    root.position.y = Math.sin(time * 0.82) * bobAmount
  })

  return (
    <group
      ref={residentRoot}
      visible={normalized}
      userData={{
        glowbud: tokenId,
        renderer: 'canonical-wardrobe-avatar',
        animation: reducedMotion || paused ? 'rest' : animation,
        quality,
        performanceCycle: 'wave-boogie-showcase-hop',
        traitCount: attributes.length,
      }}
    >
      <group ref={avatarRoot} rotation={[0, Math.PI, 0]}>
        <GlowbudFrameBudget
          targetFps={paused || reducedMotion
            ? 0
            : quality === 'resident'
              ? residentGlowbudAnimationFps(motionFps)
              : motionFps}
          phase={phase * 0.17}
        >
          <group ref={canonicalRoot}>
            <GlowbudTraitAvatarAsset
              traits={traits}
              animation={animation}
              activity={paused || reducedMotion ? 0 : quality === 'resident' ? 0.82 : 1.05}
              scale={1}
            />
          </group>
        </GlowbudFrameBudget>
      </group>
    </group>
  )
}
