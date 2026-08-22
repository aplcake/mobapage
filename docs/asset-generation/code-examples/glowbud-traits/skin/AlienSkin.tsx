import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

export const ALIEN_SKIN_BASE = '#9ee8e7'
export const ALIEN_SKIN_SHADE = '#347f89'
export const ALIEN_SKIN_LIGHT = '#ddffff'
export const ALIEN_HAND_BASE = '#83d7d7'

const ALIEN_INK = '#163945'
const ALIEN_DEEP = '#235d68'
const ALIEN_MID = '#54b9ba'
const ALIEN_PEARL = '#c7fbf4'
const ALIEN_BIOLUMINESCENCE = '#d8ff72'
const ALIEN_BIOLUMINESCENCE_LIGHT = '#f2ffc2'

export type AlienSkinAnimation = 'idle' | 'hop' | 'grumble'

type FaceMode = 'fitted' | 'standalone' | 'wizard'

type AlienFaceTreatmentProps = {
  fitted?: boolean
  wizard?: boolean
  activity?: number
  animation?: AlienSkinAnimation
}

type AlienHandTreatmentProps = {
  side: -1 | 1
  center?: [number, number, number]
  scale?: [number, number, number]
  rotationZ?: number
  activity?: number
  animation?: AlienSkinAnimation
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

function createSensoryRidgeGeometry(mode: FaceMode, side: -1 | 1) {
  const scale = FACE_METRICS[mode].detailScale
  const points: Array<[number, number]> = mode === 'wizard'
    ? [
        [side * 0.258, 0.038],
        [side * 0.232, 0.122],
        [side * 0.164, 0.2],
        [side * 0.082, 0.235],
      ]
    : [
        [side * 0.32 * scale, 0.012],
        [side * 0.29 * scale, 0.122],
        [side * 0.205 * scale, 0.218],
        [side * 0.098 * scale, 0.264],
      ]
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y]) => new THREE.Vector3(x, y, faceSurfaceZ(mode, x, y, 0.004))),
  )
  return new THREE.TubeGeometry(curve, 22, mode === 'wizard' ? 0.009 : 0.0115, 7, false)
}

function AlienSensoryRidges({ mode }: { mode: FaceMode }) {
  const geometries = useMemo(
    () => [createSensoryRidgeGeometry(mode, -1), createSensoryRidgeGeometry(mode, 1)],
    [mode],
  )

  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries])

  return (
    <group name={`alien-skin-${mode}-face-conforming-cranial-ridges`}>
      {geometries.map((geometry, index) => (
        <OutlineMesh
          key={`alien-cranial-ridge-${index}`}
          geometry={<primitive object={geometry} attach="geometry" />}
          outlineWidth={0.0022}
          outlineColor={ALIEN_INK}
          material={<meshToonMaterial color={index === 0 ? ALIEN_DEEP : ALIEN_MID} />}
        />
      ))}
    </group>
  )
}

const FACE_PORE_LAYOUT: Array<{
  x: number
  y: number
  size: number
  tone: 'pearl' | 'glow' | 'mid'
}> = [
  { x: -0.19, y: 0.212, size: 0.012, tone: 'pearl' },
  { x: 0.205, y: 0.196, size: 0.009, tone: 'glow' },
  { x: -0.285, y: 0.092, size: 0.009, tone: 'mid' },
  { x: 0.29, y: 0.074, size: 0.012, tone: 'pearl' },
  { x: -0.302, y: -0.028, size: 0.007, tone: 'glow' },
  { x: 0.306, y: -0.045, size: 0.008, tone: 'mid' },
  { x: -0.253, y: -0.165, size: 0.011, tone: 'pearl' },
  { x: 0.248, y: -0.174, size: 0.009, tone: 'glow' },
  { x: -0.136, y: -0.244, size: 0.008, tone: 'mid' },
  { x: 0.148, y: -0.235, size: 0.011, tone: 'pearl' },
]

function AlienFacePores({ mode }: { mode: FaceMode }) {
  const scale = FACE_METRICS[mode].detailScale

  return (
    <group name={`alien-skin-${mode}-embedded-biological-pore-field`}>
      {FACE_PORE_LAYOUT.map((pore, index) => {
        const x = pore.x * scale
        const y = mode === 'wizard' ? pore.y * 0.72 - 0.005 : pore.y * scale
        const color = pore.tone === 'glow'
          ? ALIEN_BIOLUMINESCENCE
          : pore.tone === 'pearl'
            ? ALIEN_PEARL
            : ALIEN_MID
        return (
          <mesh
            key={`alien-skin-pore-${index}`}
            position={[x, y, faceSurfaceZ(mode, x, y, 0.006)]}
            scale={[pore.size * scale, pore.size * scale * 0.82, 0.004]}
          >
            <sphereGeometry args={[1, 8, 5]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        )
      })}
    </group>
  )
}

function AlienSensoryConstellation({
  mode,
  activity,
  animation,
}: {
  mode: FaceMode
  activity: number
  animation: AlienSkinAnimation
}) {
  const pulseGroup = useRef<THREE.Group>(null)
  const scale = FACE_METRICS[mode].detailScale
  const y = mode === 'wizard' ? 0.224 : 0.238 * scale
  const positions = [
    { x: -0.082 * scale, size: 0.024 * scale },
    { x: 0, size: 0.032 * scale },
    { x: 0.084 * scale, size: 0.021 * scale },
  ]

  useFrame(({ clock }) => {
    if (!pulseGroup.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const hopBoost = animation === 'hop' ? 0.018 : 0
    const pulse = 1 + (Math.sin(clock.elapsedTime * 2.15) * 0.025 + hopBoost) * motion
    pulseGroup.current.scale.set(pulse, pulse, 1)
    pulseGroup.current.rotation.z = Math.sin(clock.elapsedTime * 0.72) * 0.012 * motion
  })

  return (
    <group ref={pulseGroup} name={`alien-skin-${mode}-pulsing-sensory-constellation`}>
      {positions.map((node, index) => (
        <OutlineMesh
          key={`alien-sensory-node-${index}`}
          position={[node.x, y - Math.abs(node.x) * 0.16, faceSurfaceZ(mode, node.x, y, 0.008)]}
          scale={[node.size, node.size * 0.9, 0.008]}
          outlineWidth={0.0024}
          outlineColor={ALIEN_INK}
          geometry={<sphereGeometry args={[1, 10, 6]} />}
          material={<meshBasicMaterial color={index === 1 ? ALIEN_BIOLUMINESCENCE_LIGHT : ALIEN_BIOLUMINESCENCE} toneMapped={false} />}
        />
      ))}
    </group>
  )
}

function AlienTempleGills({
  mode,
  activity,
}: {
  mode: FaceMode
  activity: number
}) {
  const gills = useRef<THREE.Group>(null)
  const scale = FACE_METRICS[mode].detailScale

  useFrame(({ clock }) => {
    if (!gills.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const breath = 1 + Math.sin(clock.elapsedTime * 1.48 + 0.8) * 0.06 * motion
    gills.current.scale.set(1, breath, 1)
  })

  return (
    <group ref={gills} name={`alien-skin-${mode}-feature-safe-breathing-gill-slits`}>
      {([-1, 1] as const).flatMap((side) =>
        [0, 1, 2].map((index) => {
          const x = side * (0.235 + index * 0.012) * scale
          const y = (0.012 - index * 0.055) * scale
          return (
            <OutlineMesh
              key={`alien-gill-${side}-${index}`}
              position={[x, y, faceSurfaceZ(mode, x, y, 0.008)]}
              rotation-z={side * (-0.5 + index * 0.11)}
              scale={[(0.036 - index * 0.004) * scale, 0.007 * scale, 0.004]}
              outlineWidth={0.0018}
              outlineColor={ALIEN_INK}
              geometry={<sphereGeometry args={[1, 9, 4]} />}
              material={<meshBasicMaterial color={ALIEN_DEEP} />}
            />
          )
        }),
      )}
    </group>
  )
}

export function AlienFaceTreatment({
  fitted = false,
  wizard = false,
  activity = 1,
  animation = 'idle',
}: AlienFaceTreatmentProps) {
  const mode: FaceMode = wizard ? 'wizard' : fitted ? 'fitted' : 'standalone'

  return (
    <group name={`alien-skin-${mode}-dimensional-xenobiology-treatment`}>
      <AlienSensoryRidges mode={mode} />
      <AlienFacePores mode={mode} />
      <AlienSensoryConstellation mode={mode} activity={activity} animation={animation} />
      <AlienTempleGills mode={mode} activity={activity} />
    </group>
  )
}

export function AlienHandTreatment({
  side,
  center = [0, 0, 0],
  scale = [0.18, 0.18, 0.18],
  rotationZ = 0,
  activity = 1,
  animation = 'idle',
}: AlienHandTreatmentProps) {
  const pulseGroup = useRef<THREE.Group>(null)
  const [centerX, centerY, centerZ] = center
  const [scaleX, scaleY, scaleZ] = scale
  const palmZ = centerZ - scaleZ * 0.94
  const nodeLayout = [
    { x: -0.26, y: 0.13, size: 0.105 },
    { x: 0.25, y: 0.1, size: 0.085 },
    { x: 0.02, y: -0.24, size: 0.12 },
  ]

  useFrame(({ clock }) => {
    if (!pulseGroup.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const hop = animation === 'hop' ? 0.018 : 0
    const pulse = 1 + (Math.sin(clock.elapsedTime * 2.35 + side * 0.7) * 0.026 + hop) * motion
    pulseGroup.current.scale.set(pulse, pulse, 1)
  })

  return (
    <group name={`alien-skin-${side === -1 ? 'left' : 'right'}-sensory-hand-treatment`}>
      <OutlineMesh
        name="alien-skin-embedded-palm-organ"
        position={[centerX + side * scaleX * 0.02, centerY - scaleY * 0.03, palmZ]}
        rotation-z={rotationZ + side * -0.06}
        scale={[scaleX * 0.49, scaleY * 0.43, Math.max(0.008, scaleZ * 0.075)]}
        outlineWidth={0.0028}
        outlineColor={ALIEN_INK}
        geometry={<sphereGeometry args={[1, 13, 8]} />}
        material={<meshToonMaterial color={ALIEN_DEEP} />}
      />
      <group
        ref={pulseGroup}
        name="alien-skin-three-node-bioluminescent-palm-array"
        position={[centerX, centerY, palmZ - 0.008]}
      >
        {nodeLayout.map((node, index) => (
          <OutlineMesh
            key={`alien-palm-node-${index}`}
            position={[node.x * scaleX, node.y * scaleY, 0]}
            scale={[
              scaleX * node.size,
              scaleY * node.size,
              Math.max(0.004, scaleZ * 0.035),
            ]}
            outlineWidth={0.0018}
            outlineColor={ALIEN_INK}
            geometry={<sphereGeometry args={[1, 9, 6]} />}
            material={<meshBasicMaterial color={index === 2 ? ALIEN_BIOLUMINESCENCE_LIGHT : ALIEN_BIOLUMINESCENCE} toneMapped={false} />}
          />
        ))}
      </group>
      {([-1, 1] as const).map((creaseSide) => (
        <mesh
          key={`alien-palm-crease-${creaseSide}`}
          position={[
            centerX + creaseSide * scaleX * 0.31,
            centerY - scaleY * 0.28,
            palmZ - 0.006,
          ]}
          rotation-z={rotationZ + creaseSide * -0.36}
          scale={[scaleX * 0.13, scaleY * 0.026, 0.004]}
        >
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={ALIEN_MID} />
        </mesh>
      ))}
    </group>
  )
}
