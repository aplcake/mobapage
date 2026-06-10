import * as THREE from 'three'
import { SLURPER_PARAMS } from '../../core/parameters'
import { clamp01 } from '../../core/math'

export type VacuumMotionState = {
  position: THREE.Vector3
  velocity: THREE.Vector3
  target: THREE.Vector3
  mouth: THREE.Vector3
  forward: THREE.Vector3
  yaw: number
  mouthPulse: number
  recoil: number
  activeSuction: boolean
}

export function createVacuumMotionState(): VacuumMotionState {
  return {
    position: new THREE.Vector3(0, 0.55, 1.35),
    velocity: new THREE.Vector3(),
    target: new THREE.Vector3(0, 0.55, 0),
    mouth: new THREE.Vector3(0, 0.58, 0.15),
    forward: new THREE.Vector3(0, 0, -1),
    yaw: 0,
    mouthPulse: 0,
    recoil: 0,
    activeSuction: false,
  }
}

export function gulpRecoil(t: number, intensity: number) {
  const k = clamp01(t)
  const arc = Math.sin(Math.PI * k)
  const overshoot = Math.sin(Math.PI * clamp01(k * 2)) * 0.35
  return (arc + overshoot) * intensity
}

export function computeShake(intensity: number, reducedMotion: boolean) {
  const amp = Math.min(SLURPER_PARAMS.vacuum.gulpShakeMax, SLURPER_PARAMS.vacuum.gulpShakeBase + intensity * 5)
  return reducedMotion ? amp * 0.25 : amp
}
