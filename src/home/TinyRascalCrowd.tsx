'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import {
  PsychedelicPogoOrbAsset,
  type PsychedelicPogoOrbAnimation,
} from '../../docs/asset-generation/code-examples/PsychedelicPogoOrbAsset.example'

const HOME_FLOOR_Y = -2.35
const POGO_LOCAL_FOOT_Y = -2.075
const TAU = Math.PI * 2

type TinyRascalRole = 'dancer' | 'runner' | 'bouncer'
type TinyRascalLane = 'rug' | 'side-left' | 'side-right' | 'rear' | 'front-loop' | 'mid-loop' | 'figure-eight' | 'bounce-diagonal'
type Vec3Tuple = readonly [number, number, number]

type TinyRascalConfig = {
  id: string
  animation: PsychedelicPogoOrbAnimation
  scale: number
  basePosition: Vec3Tuple
  phaseOffset: number
  animationTimeScale: number
  lane: TinyRascalLane
  yawBias: number
  role: TinyRascalRole
  colorCycleSpeed?: number
  colorCycleOffset?: number
  pathRadius?: readonly [number, number]
  pathSpeed?: number
}

const TINY_RASCALS: readonly TinyRascalConfig[] = [
  { id: 'front-rim-left', animation: 'disco-point', scale: 0.074, basePosition: [-2.18, HOME_FLOOR_Y, -3.08], phaseOffset: 0.07, animationTimeScale: 0.99, lane: 'rug', yawBias: 0.23, role: 'dancer', colorCycleSpeed: 0.78 },
  { id: 'front-rim-left-center', animation: 'carlton-groove', scale: 0.078, basePosition: [-1.28, HOME_FLOOR_Y, -3.18], phaseOffset: 0.34, animationTimeScale: 1.03, lane: 'rug', yawBias: 0.12, role: 'dancer', colorCycleSpeed: 0.7 },
  { id: 'front-rim-center-left', animation: 'overhead-shimmy', scale: 0.069, basePosition: [-0.38, HOME_FLOOR_Y, -3.08], phaseOffset: 0.62, animationTimeScale: 0.98, lane: 'rug', yawBias: 0.03, role: 'dancer', colorCycleSpeed: 0.83 },
  { id: 'front-rim-center-right', animation: 'pogo-boogie', scale: 0.077, basePosition: [0.54, HOME_FLOOR_Y, -3.16], phaseOffset: 0.22, animationTimeScale: 1.02, lane: 'rug', yawBias: -0.04, role: 'dancer', colorCycleSpeed: 0.76 },
  { id: 'front-rim-right-center', animation: 'disco-point', scale: 0.073, basePosition: [1.42, HOME_FLOOR_Y, -3.04], phaseOffset: 0.81, animationTimeScale: 0.97, lane: 'rug', yawBias: -0.14, role: 'dancer', colorCycleSpeed: 0.66 },
  { id: 'front-rim-right', animation: 'walk', scale: 0.068, basePosition: [2.18, HOME_FLOOR_Y, -2.9], phaseOffset: 0.48, animationTimeScale: 1.08, lane: 'rug', yawBias: -0.26, role: 'dancer', colorCycleSpeed: 0.74 },

  { id: 'front-band-far-left', animation: 'pogo-boogie', scale: 0.084, basePosition: [-2.86, HOME_FLOOR_Y, -2.48], phaseOffset: 0.13, animationTimeScale: 1.02, lane: 'rug', yawBias: 0.24, role: 'dancer', colorCycleSpeed: 0.88 },
  { id: 'front-band-left', animation: 'carlton-groove', scale: 0.082, basePosition: [-1.72, HOME_FLOOR_Y, -2.54], phaseOffset: 0.16, animationTimeScale: 1.01, lane: 'rug', yawBias: 0.15, role: 'dancer', colorCycleSpeed: 0.82 },
  { id: 'front-band-left-center', animation: 'overhead-shimmy', scale: 0.075, basePosition: [-0.72, HOME_FLOOR_Y, -2.42], phaseOffset: 0.52, animationTimeScale: 0.97, lane: 'rug', yawBias: 0.04, role: 'dancer', colorCycleSpeed: 0.7 },
  { id: 'front-band-right-center', animation: 'disco-point', scale: 0.08, basePosition: [0.34, HOME_FLOOR_Y, -2.56], phaseOffset: 0.91, animationTimeScale: 1.05, lane: 'rug', yawBias: -0.03, role: 'dancer', colorCycleSpeed: 0.9 },
  { id: 'front-band-right', animation: 'pogo-boogie', scale: 0.083, basePosition: [1.42, HOME_FLOOR_Y, -2.4], phaseOffset: 0.25, animationTimeScale: 1, lane: 'rug', yawBias: -0.14, role: 'dancer', colorCycleSpeed: 0.74 },
  { id: 'front-band-far-right', animation: 'carlton-groove', scale: 0.079, basePosition: [2.58, HOME_FLOOR_Y, -2.5], phaseOffset: 0.68, animationTimeScale: 1.04, lane: 'rug', yawBias: -0.25, role: 'dancer', colorCycleSpeed: 0.84 },

  { id: 'low-mid-left-edge', animation: 'walk', scale: 0.077, basePosition: [-3.08, HOME_FLOOR_Y, -1.94], phaseOffset: 0.38, animationTimeScale: 1.08, lane: 'rug', yawBias: 0.21, role: 'dancer', colorCycleSpeed: 0.77 },
  { id: 'low-mid-left', animation: 'disco-point', scale: 0.088, basePosition: [-2.02, HOME_FLOOR_Y, -1.86], phaseOffset: 0.78, animationTimeScale: 1.02, lane: 'rug', yawBias: 0.13, role: 'dancer', colorCycleSpeed: 0.86 },
  { id: 'low-mid-right-center', animation: 'pogo-boogie', scale: 0.091, basePosition: [0.14, HOME_FLOOR_Y, -1.84], phaseOffset: 0.58, animationTimeScale: 0.96, lane: 'rug', yawBias: -0.02, role: 'dancer', colorCycleSpeed: 0.69 },
  { id: 'low-mid-right', animation: 'carlton-groove', scale: 0.084, basePosition: [1.34, HOME_FLOOR_Y, -2.02], phaseOffset: 0.84, animationTimeScale: 1.03, lane: 'rug', yawBias: -0.13, role: 'dancer', colorCycleSpeed: 0.81 },
  { id: 'low-mid-right-edge', animation: 'disco-point', scale: 0.077, basePosition: [2.72, HOME_FLOOR_Y, -1.92], phaseOffset: 0.11, animationTimeScale: 0.98, lane: 'rug', yawBias: -0.22, role: 'dancer', colorCycleSpeed: 0.73 },

  { id: 'center-left-edge', animation: 'overhead-shimmy', scale: 0.085, basePosition: [-3.02, HOME_FLOOR_Y, -1.18], phaseOffset: 0.31, animationTimeScale: 1.07, lane: 'rug', yawBias: 0.22, role: 'dancer', colorCycleSpeed: 0.87 },
  { id: 'center-left', animation: 'pogo-boogie', scale: 0.098, basePosition: [-1.72, HOME_FLOOR_Y, -1.12], phaseOffset: 0.27, animationTimeScale: 0.99, lane: 'rug', yawBias: 0.11, role: 'dancer', colorCycleSpeed: 0.7 },
  { id: 'center-right-pocket', animation: 'disco-point', scale: 0.096, basePosition: [0.7, HOME_FLOOR_Y, -1.1], phaseOffset: 0.71, animationTimeScale: 1.06, lane: 'rug', yawBias: -0.04, role: 'dancer', colorCycleSpeed: 0.82 },
  { id: 'center-right', animation: 'overhead-shimmy', scale: 0.09, basePosition: [1.9, HOME_FLOOR_Y, -1.24], phaseOffset: 0.43, animationTimeScale: 0.98, lane: 'rug', yawBias: -0.14, role: 'dancer', colorCycleSpeed: 0.78 },
  { id: 'center-right-edge', animation: 'pogo-boogie', scale: 0.082, basePosition: [3.02, HOME_FLOOR_Y, -1.06], phaseOffset: 0.18, animationTimeScale: 1.03, lane: 'rug', yawBias: -0.24, role: 'dancer', colorCycleSpeed: 0.85 },

  { id: 'upper-rug-left', animation: 'disco-point', scale: 0.076, basePosition: [-2.7, HOME_FLOOR_Y, -0.34], phaseOffset: 0.04, animationTimeScale: 1.04, lane: 'rug', yawBias: 0.18, role: 'dancer', colorCycleSpeed: 0.86 },
  { id: 'upper-rug-left-center', animation: 'carlton-groove', scale: 0.083, basePosition: [-1.22, HOME_FLOOR_Y, -0.42], phaseOffset: 0.56, animationTimeScale: 0.98, lane: 'rug', yawBias: 0.07, role: 'dancer', colorCycleSpeed: 0.74 },
  { id: 'upper-rug-right-center', animation: 'overhead-shimmy', scale: 0.08, basePosition: [1.26, HOME_FLOOR_Y, -0.4], phaseOffset: 0.36, animationTimeScale: 1.04, lane: 'rug', yawBias: -0.08, role: 'dancer', colorCycleSpeed: 0.69 },
  { id: 'upper-rug-right', animation: 'disco-point', scale: 0.074, basePosition: [2.7, HOME_FLOOR_Y, -0.3], phaseOffset: 0.88, animationTimeScale: 1.03, lane: 'rug', yawBias: -0.18, role: 'dancer', colorCycleSpeed: 0.8 },

  { id: 'back-rug-left', animation: 'pogo-boogie', scale: 0.066, basePosition: [-1.92, HOME_FLOOR_Y, 0.54], phaseOffset: 0.73, animationTimeScale: 1, lane: 'rug', yawBias: 0.14, role: 'dancer', colorCycleSpeed: 0.68 },
  { id: 'back-rug-center', animation: 'overhead-shimmy', scale: 0.062, basePosition: [-0.12, HOME_FLOOR_Y, 0.76], phaseOffset: 0.87, animationTimeScale: 1.03, lane: 'rug', yawBias: 0.02, role: 'dancer', colorCycleSpeed: 0.84 },
  { id: 'back-rug-right', animation: 'carlton-groove', scale: 0.066, basePosition: [1.84, HOME_FLOOR_Y, 0.5], phaseOffset: 0.6, animationTimeScale: 0.99, lane: 'rug', yawBias: -0.14, role: 'dancer', colorCycleSpeed: 0.88 },

  { id: 'runner-front-loop', animation: 'run', scale: 0.068, basePosition: [0, HOME_FLOOR_Y, -2.24], phaseOffset: 0.1, animationTimeScale: 1.22, lane: 'front-loop', yawBias: 0, role: 'runner', pathRadius: [2.62, 0.54], pathSpeed: 0.34, colorCycleSpeed: 0.72 },
  { id: 'runner-mid-loop', animation: 'run', scale: 0.074, basePosition: [0.04, HOME_FLOOR_Y, -1.1], phaseOffset: 0.46, animationTimeScale: 1.12, lane: 'mid-loop', yawBias: 0, role: 'runner', pathRadius: [2.64, 1.22], pathSpeed: 0.29, colorCycleSpeed: 0.9 },
  { id: 'runner-figure-eight', animation: 'walk', scale: 0.067, basePosition: [-0.08, HOME_FLOOR_Y, -0.38], phaseOffset: 0.73, animationTimeScale: 1.08, lane: 'figure-eight', yawBias: 0, role: 'runner', pathRadius: [2.62, 1.34], pathSpeed: 0.25, colorCycleSpeed: 0.68 },
  { id: 'runner-front-thread', animation: 'run', scale: 0.061, basePosition: [0.14, HOME_FLOOR_Y, -2.9], phaseOffset: 0.87, animationTimeScale: 1.24, lane: 'front-loop', yawBias: 0, role: 'runner', pathRadius: [2.02, 0.28], pathSpeed: 0.41, colorCycleSpeed: 0.84 },

  { id: 'bounce-front-left', animation: 'forward-ball-bounce', scale: 0.068, basePosition: [-1.8, HOME_FLOOR_Y, -2.92], phaseOffset: 0.31, animationTimeScale: 0.96, lane: 'bounce-diagonal', yawBias: 0.14, role: 'bouncer', colorCycleSpeed: 0.78 },
  { id: 'bounce-middle', animation: 'forward-ball-bounce', scale: 0.078, basePosition: [0.18, HOME_FLOOR_Y, -1.56], phaseOffset: 0.6, animationTimeScale: 1.01, lane: 'bounce-diagonal', yawBias: -0.04, role: 'bouncer', colorCycleSpeed: 0.88 },
  { id: 'bounce-front-right', animation: 'reference-ball-bounce', scale: 0.071, basePosition: [1.86, HOME_FLOOR_Y, -2.72], phaseOffset: 0.04, animationTimeScale: 0.97, lane: 'bounce-diagonal', yawBias: -0.16, role: 'bouncer', colorCycleSpeed: 0.75 },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function groundedY(scale: number) {
  return HOME_FLOOR_Y - POGO_LOCAL_FOOT_Y * scale
}

function hashUnit(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 997
  }
  return hash / 997
}

function colorCycleOffsetForActor(actor: TinyRascalConfig) {
  return actor.colorCycleOffset ?? (actor.phaseOffset * 0.72 + hashUnit(actor.id) * 0.83) % 1
}

function TinyRascalActor({ actor }: { actor: TinyRascalConfig }) {
  const actorRef = useRef<THREE.Group>(null)
  const [baseX, , baseZ] = actor.basePosition

  useFrame((state) => {
    const group = actorRef.current
    if (!group) return

    const time = state.clock.elapsedTime
    const beat = time * 0.72 + actor.phaseOffset * TAU
    let x = baseX
    let z = baseZ
    let yaw = actor.yawBias

    if (actor.role === 'runner') {
      const [radiusX, radiusZ] = actor.pathRadius ?? [1, 1]
      const pathT = time * (actor.pathSpeed ?? 0.28) * TAU + actor.phaseOffset * TAU
      if (actor.lane === 'figure-eight') {
        x += Math.sin(pathT) * radiusX
        z += Math.sin(pathT * 2) * radiusZ * 0.58
        const vx = Math.cos(pathT) * radiusX
        const vz = Math.cos(pathT * 2) * radiusZ * 1.16
        yaw += clamp(Math.atan2(vx, -vz) * 0.24, -0.42, 0.42)
      } else {
        x += Math.cos(pathT) * radiusX
        z += Math.sin(pathT) * radiusZ
        const vx = -Math.sin(pathT) * radiusX
        const vz = Math.cos(pathT) * radiusZ
        yaw += clamp(Math.atan2(vx, -vz) * 0.25, -0.44, 0.44)
      }
    } else if (actor.role === 'bouncer') {
      x += Math.sin(beat * 0.82) * 0.34
      z += Math.cos(beat * 0.58 + 0.4) * 0.16
      yaw += Math.sin(beat * 0.5) * 0.16
    } else {
      x += Math.sin(beat + actor.scale * 17) * 0.026 + Math.sin(beat * 1.63 + actor.phaseOffset) * 0.012
      z += Math.cos(beat * 0.84 + actor.scale * 13) * 0.018
      yaw += Math.sin(beat * 0.52) * 0.075
    }

    group.position.set(x, groundedY(actor.scale), z)
    group.rotation.set(0, yaw, 0)
  })

  const activity = actor.role === 'runner' ? 1.06 : actor.role === 'bouncer' ? 1.02 : 0.94
  const verticalMotionScale = actor.role === 'bouncer' ? 0.78 : actor.role === 'runner' ? 0.82 : 0.9

  return (
    <group ref={actorRef} position={[baseX, groundedY(actor.scale), baseZ]} rotation={[0, actor.yawBias, 0]}>
      <PsychedelicPogoOrbAsset
        animation={actor.animation}
        activity={activity}
        colorCycleSpeed={actor.colorCycleSpeed ?? 0.76}
        colorCycleOffset={colorCycleOffsetForActor(actor)}
        expression="auto"
        glowIntensity={0}
        scale={actor.scale}
        phaseOffset={actor.phaseOffset}
        animationTimeScale={actor.animationTimeScale}
        verticalMotionScale={verticalMotionScale}
      />
    </group>
  )
}

export function TinyRascalCrowd() {
  return (
    <group>
      {TINY_RASCALS.map((actor) => (
        <TinyRascalActor key={actor.id} actor={actor} />
      ))}
    </group>
  )
}
