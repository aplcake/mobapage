'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GAME_CONFIG } from '../../core/config'
import { clampArena, damp, tupleFromVector, vectorFromTuple } from '../../core/math'
import { SLURPER_PARAMS } from '../../core/parameters'
import { useGameStore } from '../../stores/useGameStore'
import { createVacuumMotionState, gulpRecoil } from './vacuumState'

const targetScratch = new THREE.Vector3()
const recoilScratch = new THREE.Vector3()

export function useVacuumMotion() {
  const state = useMemo(() => createVacuumMotionState(), [])
  const recoilClock = useRef(1)
  const recoilIntensity = useRef(0)

  useFrame(({ clock }, dt) => {
    const store = useGameStore.getState()
    const pointer = store.pointer
    const params = SLURPER_PARAMS.vacuum
    const cappedDt = Math.min(dt, 0.04)

    vectorFromTuple(pointer.world, targetScratch)
    targetScratch.y = state.position.y
    clampArena(targetScratch, GAME_CONFIG.arena.halfWidth - 1.2, GAME_CONFIG.arena.halfDepth - 1.2)

    if (!pointer.isActive && clock.elapsedTime > 0.5) {
      targetScratch.x += Math.sin(clock.elapsedTime * 0.5) * 0.28
      targetScratch.z += Math.cos(clock.elapsedTime * 0.62) * 0.22
    }

    state.target.copy(targetScratch)
    const toTarget = targetScratch.sub(state.position)
    state.velocity.addScaledVector(toTarget, params.spring * cappedDt)
    state.velocity.multiplyScalar(Math.exp(-params.damping * cappedDt))
    state.position.addScaledVector(state.velocity, cappedDt)
    clampArena(state.position, GAME_CONFIG.arena.halfWidth - 0.8, GAME_CONFIG.arena.halfDepth - 0.8)

    if (state.velocity.lengthSq() > 0.001) {
      state.yaw = Math.atan2(state.velocity.x, -state.velocity.z)
    } else {
      state.yaw = Math.sin(clock.elapsedTime * 0.8) * 0.08
    }

    state.forward.set(Math.sin(state.yaw), 0, -Math.cos(state.yaw)).normalize()
    const speed01 = Math.min(1, state.velocity.length() / params.fastSpeed)
    state.activeSuction = pointer.isActive || speed01 > 0.08
    const pulseTarget = state.activeSuction ? (pointer.isDown ? 1 : 0.58) : speed01 * 0.35
    state.mouthPulse = damp(state.mouthPulse, pulseTarget, 8, cappedDt)

    const recoilImpulse = store.drainRecoilImpulse()
    if (recoilImpulse > 0) {
      recoilClock.current = 0
      recoilIntensity.current = Math.min(1.4, recoilIntensity.current + recoilImpulse * 0.18)
    }
    recoilClock.current += cappedDt / params.recoilDurationSec
    state.recoil = recoilClock.current < 1 ? gulpRecoil(recoilClock.current, recoilIntensity.current) : 0
    if (recoilClock.current >= 1) recoilIntensity.current = damp(recoilIntensity.current, 0, 8, cappedDt)

    recoilScratch.copy(state.forward).multiplyScalar(-params.recoilDistance * state.recoil)
    state.mouth.copy(state.position).addScaledVector(state.forward, 1.14).add(recoilScratch)
    state.mouth.y = state.position.y + 0.16 + Math.sin(clock.elapsedTime * params.idleBobHz * Math.PI * 2) * 0.015

    store.setVacuum({
      position: tupleFromVector(state.position),
      mouth: tupleFromVector(state.mouth),
      velocity: tupleFromVector(state.velocity),
      yaw: state.yaw,
      pulse: state.mouthPulse,
      recoil: state.recoil,
    })
  })

  return state
}
