import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

export const ZOMBIE_SKIN_BASE = '#91a875'
export const ZOMBIE_SKIN_SHADE = '#405b43'
export const ZOMBIE_SKIN_LIGHT = '#c8d79a'
export const ZOMBIE_HAND_BASE = '#748d59'

const ZOMBIE_INK = '#26342c'
const ZOMBIE_WOUND = '#493b46'
const ZOMBIE_BRUISE = '#6a526b'
const ZOMBIE_MOSS = '#617b48'
const ZOMBIE_LICHEN = '#afc47d'
const ZOMBIE_BRAIN = '#ca8295'
const ZOMBIE_BRAIN_LIGHT = '#efb4b4'
const ZOMBIE_STITCH = '#eadc9f'

export type ZombieSkinAnimation = 'idle' | 'hop' | 'grumble'

type FaceMode = 'fitted' | 'standalone' | 'wizard'

type ZombieFaceTreatmentProps = {
  fitted?: boolean
  wizard?: boolean
  activity?: number
  animation?: ZombieSkinAnimation
}

type ZombieHandTreatmentProps = {
  side: -1 | 1
  center?: [number, number, number]
  scale?: [number, number, number]
  rotationZ?: number
  activity?: number
  animation?: ZombieSkinAnimation
}

type FaceMetric = {
  center: [number, number, number]
  radius: [number, number, number]
  detailScale: number
}

const FACE_METRICS: Record<FaceMode, FaceMetric> = {
  fitted: {
    center: [0.006, -0.026, -0.35],
    radius: [0.56, 0.432, 0.38],
    detailScale: 1,
  },
  standalone: {
    center: [0, -0.02, -0.28],
    radius: [0.43, 0.43, 0.43],
    detailScale: 0.84,
  },
  wizard: {
    center: [0, -0.058, -0.642],
    radius: [0.414, 0.334, 0.105],
    detailScale: 0.76,
  },
}

function faceSurfaceZ(mode: FaceMode, x: number, y: number, lift = 0.006) {
  const metric = FACE_METRICS[mode]
  const normalizedX = (x - metric.center[0]) / metric.radius[0]
  const normalizedY = (y - metric.center[1]) / metric.radius[1]
  const depth = Math.sqrt(Math.max(0.08, 1 - normalizedX * normalizedX - normalizedY * normalizedY))
  return metric.center[2] - metric.radius[2] * depth - lift
}

function faceSurfaceTransform(mode: FaceMode, x: number, y: number, lift = 0.006) {
  const metric = FACE_METRICS[mode]
  const z = faceSurfaceZ(mode, x, y, lift)
  const normal = new THREE.Vector3(
    (x - metric.center[0]) / (metric.radius[0] * metric.radius[0]),
    (y - metric.center[1]) / (metric.radius[1] * metric.radius[1]),
    (z - metric.center[2]) / (metric.radius[2] * metric.radius[2]),
  ).normalize()

  return {
    position: [x, y, z] as [number, number, number],
    quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal),
  }
}

function createFaceCurveGeometry(
  mode: FaceMode,
  points: Array<[number, number]>,
  radius: number,
) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y]) => new THREE.Vector3(x, y, faceSurfaceZ(mode, x, y, 0.01))),
  )
  return new THREE.TubeGeometry(curve, 18, radius, 7, false)
}

const BRAIN_LOBES = [
  { position: [-0.047, 0.005, 0.011] as [number, number, number], scale: [0.035, 0.026, 0.012] as [number, number, number], rotation: -0.34 },
  { position: [-0.016, 0.028, 0.012] as [number, number, number], scale: [0.032, 0.031, 0.013] as [number, number, number], rotation: 0.14 },
  { position: [0.017, 0.025, 0.012] as [number, number, number], scale: [0.035, 0.029, 0.013] as [number, number, number], rotation: -0.12 },
  { position: [0.047, 0.001, 0.011] as [number, number, number], scale: [0.032, 0.025, 0.012] as [number, number, number], rotation: 0.32 },
  { position: [0.002, -0.015, 0.013] as [number, number, number], scale: [0.041, 0.028, 0.014] as [number, number, number], rotation: 0.04 },
]

function ZombieExposedRootBrain({
  mode,
  activity,
  animation,
}: {
  mode: FaceMode
  activity: number
  animation: ZombieSkinAnimation
}) {
  const brain = useRef<THREE.Group>(null)
  const scale = FACE_METRICS[mode].detailScale
  const centerX = mode === 'wizard' ? -0.218 : -0.245 * scale
  const centerY = mode === 'wizard' ? 0.19 : 0.238 * scale
  const transform = faceSurfaceTransform(mode, centerX, centerY, 0.003)

  useFrame(({ clock }) => {
    if (!brain.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const hopBoost = animation === 'hop' ? 0.018 : 0
    const pulse = 1 + (Math.sin(clock.elapsedTime * 1.72 + 0.6) * 0.024 + hopBoost) * motion
    brain.current.scale.set(pulse, 1 + (pulse - 1) * 0.72, 1)
    brain.current.rotation.z = Math.sin(clock.elapsedTime * 0.62) * 0.018 * motion
  })

  return (
    <group name={`zombie-skin-${mode}-embedded-root-brain-cradle`} {...transform}>
      <OutlineMesh
        position={[-0.027 * scale, -0.003 * scale, 0]}
        rotation-z={-0.16}
        scale={[0.093 * scale, 0.069 * scale, 0.008]}
        outlineWidth={0.003}
        outlineColor={ZOMBIE_INK}
        geometry={<sphereGeometry args={[1, 12, 7]} />}
        material={<meshToonMaterial color={ZOMBIE_WOUND} />}
      />
      <OutlineMesh
        position={[0.039 * scale, 0.006 * scale, 0]}
        rotation-z={0.22}
        scale={[0.073 * scale, 0.06 * scale, 0.007]}
        outlineWidth={0.0025}
        outlineColor={ZOMBIE_INK}
        geometry={<sphereGeometry args={[1, 11, 6]} />}
        material={<meshToonMaterial color={ZOMBIE_WOUND} />}
      />
      <group ref={brain} name="zombie-skin-softly-pulsing-exposed-root-brain">
        {BRAIN_LOBES.map((lobe, index) => (
          <OutlineMesh
            key={`zombie-brain-lobe-${index}`}
            position={lobe.position.map((value) => value * scale * 1.12) as [number, number, number]}
            rotation-z={lobe.rotation}
            scale={lobe.scale.map((value) => value * scale * 1.12) as [number, number, number]}
            outlineWidth={0.0022}
            outlineColor={ZOMBIE_INK}
            geometry={<sphereGeometry args={[1, 10, 7]} />}
            material={<meshToonMaterial color={index === 1 || index === 4 ? ZOMBIE_BRAIN_LIGHT : ZOMBIE_BRAIN} />}
          />
        ))}
      </group>
    </group>
  )
}

function ZombieScarAndStitches({ mode }: { mode: FaceMode }) {
  const scale = FACE_METRICS[mode].detailScale
  const seamPoints = useMemo<Array<[number, number]>>(
    () => mode === 'wizard'
      ? [[0.278, 0.12], [0.292, 0.058], [0.276, -0.008], [0.288, -0.072]]
      : [[0.31 * scale, 0.128 * scale], [0.326 * scale, 0.064 * scale], [0.306 * scale, -0.012 * scale], [0.318 * scale, -0.086 * scale]],
    [mode, scale],
  )
  const seamGeometry = useMemo(
    () => createFaceCurveGeometry(mode, seamPoints, mode === 'wizard' ? 0.005 : 0.0065),
    [mode, seamPoints],
  )

  useEffect(() => () => seamGeometry.dispose(), [seamGeometry])

  const stitches = seamPoints.slice(0, 3).map(([x, y], index) => ({
    x,
    y: y - (index === 0 ? 0.008 : 0),
    rotation: 0.28 - index * 0.24,
  }))

  return (
    <group name={`zombie-skin-${mode}-deeply-seated-suture-repair`}>
      <OutlineMesh
        geometry={<primitive object={seamGeometry} attach="geometry" />}
        outlineWidth={0.0017}
        outlineColor={ZOMBIE_INK}
        material={<meshBasicMaterial color={ZOMBIE_BRUISE} />}
      />
      {stitches.map((stitch, index) => {
        const transform = faceSurfaceTransform(mode, stitch.x, stitch.y, 0.012)
        return (
          <group key={`zombie-stitch-${index}`} {...transform}>
            <OutlineMesh
              rotation-z={stitch.rotation}
              scale={[0.033 * scale, 0.0068 * scale, 0.004]}
              outlineWidth={0.002}
              outlineColor={ZOMBIE_INK}
              geometry={<sphereGeometry args={[1, 9, 5]} />}
              material={<meshBasicMaterial color={ZOMBIE_STITCH} />}
            />
          </group>
        )
      })}
    </group>
  )
}

const DECAY_PATCHES = [
  { x: -0.3, y: -0.075, sx: 0.042, sy: 0.026, rotation: -0.32, color: ZOMBIE_MOSS },
  { x: -0.264, y: -0.118, sx: 0.022, sy: 0.017, rotation: 0.12, color: ZOMBIE_LICHEN },
  { x: 0.292, y: -0.18, sx: 0.044, sy: 0.024, rotation: 0.26, color: ZOMBIE_BRUISE },
  { x: 0.326, y: -0.145, sx: 0.021, sy: 0.016, rotation: -0.18, color: ZOMBIE_MOSS },
  { x: 0.188, y: -0.274, sx: 0.03, sy: 0.017, rotation: 0.08, color: ZOMBIE_LICHEN },
]

function ZombieDecayPatches({ mode }: { mode: FaceMode }) {
  const scale = FACE_METRICS[mode].detailScale

  return (
    <group name={`zombie-skin-${mode}-embedded-lichen-and-bruise-field`}>
      {DECAY_PATCHES.map((patch, index) => {
        const x = patch.x * scale
        const y = (mode === 'wizard' ? patch.y * 0.76 : patch.y) * scale
        const transform = faceSurfaceTransform(mode, x, y, 0.005)
        return (
          <group key={`zombie-decay-patch-${index}`} {...transform}>
            <mesh rotation-z={patch.rotation} scale={[patch.sx * scale, patch.sy * scale, 0.005]}>
              <sphereGeometry args={[1, 9, 5]} />
              <meshToonMaterial color={patch.color} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

export function ZombieFaceTreatment({
  fitted = false,
  wizard = false,
  activity = 1,
  animation = 'idle',
}: ZombieFaceTreatmentProps) {
  const mode: FaceMode = wizard ? 'wizard' : fitted ? 'fitted' : 'standalone'

  return (
    <group name={`zombie-skin-${mode}-feature-reserved-garden-undead-treatment`}>
      <ZombieExposedRootBrain mode={mode} activity={activity} animation={animation} />
      <ZombieScarAndStitches mode={mode} />
      <ZombieDecayPatches mode={mode} />
    </group>
  )
}

export function ZombieHandTreatment({
  side,
  center = [0, 0, 0],
  scale = [0.18, 0.18, 0.18],
  rotationZ = 0,
  activity = 1,
  animation = 'idle',
}: ZombieHandTreatmentProps) {
  const repair = useRef<THREE.Group>(null)
  const [centerX, centerY, centerZ] = center
  const [scaleX, scaleY, scaleZ] = scale
  const palmZ = centerZ - scaleZ * 0.94

  useFrame(({ clock }) => {
    if (!repair.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const hopTwitch = animation === 'hop' ? 0.012 : 0
    const twitch = Math.sin(clock.elapsedTime * 2.05 + side * 0.9) * 0.012 * motion
    repair.current.rotation.z = rotationZ + side * (0.08 + twitch + hopTwitch)
    repair.current.scale.set(1 + Math.abs(twitch) * 0.45, 1 - Math.abs(twitch) * 0.24, 1)
  })

  return (
    <group
      ref={repair}
      name={`zombie-skin-${side === -1 ? 'left' : 'right'}-stitched-hand-repair`}
      position={[centerX, centerY, palmZ]}
      rotation-z={rotationZ + side * 0.08}
    >
      <OutlineMesh
        position={[side * scaleX * -0.04, scaleY * 0.01, 0]}
        scale={[scaleX * 0.47, scaleY * 0.36, Math.max(0.007, scaleZ * 0.055)]}
        outlineWidth={0.0028}
        outlineColor={ZOMBIE_INK}
        geometry={<sphereGeometry args={[1, 12, 7]} />}
        material={<meshToonMaterial color={side === -1 ? ZOMBIE_BRUISE : ZOMBIE_WOUND} />}
      />
      <mesh
        position={[side * scaleX * -0.03, scaleY * 0.005, 0.008]}
        rotation-z={side * -0.32}
        scale={[scaleX * 0.36, scaleY * 0.026, 0.004]}
      >
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={ZOMBIE_INK} />
      </mesh>
      {[-0.22, 0, 0.22].map((offset, index) => (
        <OutlineMesh
          key={`zombie-hand-stitch-${index}`}
          position={[offset * scaleX, offset * side * scaleY * 0.16, 0.014]}
          rotation-z={side * (0.92 - index * 0.08)}
          scale={[scaleX * 0.15, scaleY * 0.035, 0.004]}
          outlineWidth={0.0017}
          outlineColor={ZOMBIE_INK}
          geometry={<sphereGeometry args={[1, 8, 4]} />}
          material={<meshBasicMaterial color={ZOMBIE_STITCH} />}
        />
      ))}
      <mesh
        position={[side * scaleX * 0.3, -scaleY * 0.27, 0.009]}
        rotation-z={side * 0.24}
        scale={[scaleX * 0.12, scaleY * 0.07, 0.004]}
      >
        <sphereGeometry args={[1, 8, 5]} />
        <meshToonMaterial color={ZOMBIE_LICHEN} />
      </mesh>
    </group>
  )
}
