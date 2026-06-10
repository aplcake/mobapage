'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { GAME_CONFIG } from '../core/config'
import { damp, vectorFromTuple } from '../core/math'
import { useGameStore } from '../stores/useGameStore'
import { computeShake } from '../systems/vacuum/vacuumState'

const lookTarget = new THREE.Vector3()

export function CameraRig() {
  const { camera } = useThree()
  const shakeOffset = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock }, dt) => {
    const store = useGameStore.getState()
    const reducedMotion = store.reducedMotion
    const shakeIntensity = computeShake(store.stageShake, reducedMotion)
    const scale = GAME_CONFIG.camera.shakeWorldScale
    shakeOffset.set(
      Math.sin(clock.elapsedTime * 42.7) * shakeIntensity * scale,
      Math.cos(clock.elapsedTime * 35.3) * shakeIntensity * scale * 0.4,
      0,
    )
    camera.position.set(0, GAME_CONFIG.camera.height, GAME_CONFIG.camera.distance).add(shakeOffset)
    vectorFromTuple(GAME_CONFIG.camera.target, lookTarget)
    camera.lookAt(lookTarget)
    store.setStageShake(damp(store.stageShake, 0, 8, dt))
  })

  return null
}
