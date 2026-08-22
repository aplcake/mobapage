'use client'

import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  GlowbudTraitAvatarAsset,
  type RedShellCritterAnimation,
} from '../../../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example'
import type { MuseumAssetAttribute } from '../collection-registry/museumAssetTypes'
import { composeGlowbudDisplayTraits } from './glowbudDisplayTraits'
import { glowbudMuseumPerformanceAtTime } from './glowbudMuseumPerformance'

const TARGET_HEIGHT = 1.82
const TARGET_FOOTPRINT = 0.9

export function GlowbudMuseumAvatar({
  tokenId,
  attributes,
  phase = 0,
  paused = false,
  reducedMotion = false,
}: {
  tokenId: string
  attributes: readonly MuseumAssetAttribute[]
  phase?: number
  paused?: boolean
  reducedMotion?: boolean
}) {
  const residentRoot = useRef<THREE.Group>(null)
  const avatarRoot = useRef<THREE.Group>(null)
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

  useFrame(({ clock }, delta) => {
    const root = residentRoot.current
    if (!root || paused || reducedMotion) return
    const time = clock.elapsedTime + phase
    const nextPerformance = glowbudMuseumPerformanceAtTime(tokenId, time)
    if (nextPerformance.animation !== performanceAnimationRef.current) {
      performanceAnimationRef.current = nextPerformance.animation
      setPerformanceAnimation(nextPerformance.animation)
    }
    root.rotation.y = THREE.MathUtils.damp(root.rotation.y, Math.sin(time * 0.43) * 0.035, 4, delta)
    root.position.y = Math.sin(time * 0.82) * 0.014
  })

  return (
    <group
      ref={residentRoot}
      visible={normalized}
      userData={{
        glowbud: tokenId,
        renderer: 'canonical-wardrobe-avatar',
        animation: reducedMotion || paused ? 'rest' : animation,
        performanceCycle: 'wave-boogie-showcase-hop',
        traitCount: attributes.length,
      }}
    >
      <group ref={avatarRoot} rotation={[0, Math.PI, 0]}>
        <GlowbudTraitAvatarAsset
          key={`${tokenId}-${attributes.map((attribute) => `${attribute.trait_type}:${attribute.value}`).join('|')}`}
          traits={traits}
          animation={animation}
          activity={paused || reducedMotion ? 0 : 1.05}
          scale={1}
        />
      </group>
    </group>
  )
}
