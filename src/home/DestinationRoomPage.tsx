'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PsychedelicPogoOrbAsset } from '../../docs/asset-generation/code-examples/PsychedelicPogoOrbAsset.example'
import { MUSEUM_SCALE_FLOOR_Y, MuseumFacadeSilhouette, MuseumMobaSign } from '../../docs/asset-generation/preview/pogo-orb/arena/MuseumScalePathGrassArena'
import { FLOOR_Y, LEVEL_SURFACES, PALETTE, getTerrainHeight } from '../../docs/asset-generation/preview/pogo-orb-v2/world/longApproachLevel'

const COURTYARD_SPAWN_X = 520
const COURTYARD_SPAWN_Z = -486
const COURTYARD_MUSEUM_X = 520
const COURTYARD_MUSEUM_Z = -90

function terrainY(x: number, z: number, offset = 0) {
  return FLOOR_Y + getTerrainHeight(x, z) + offset
}

function CourtyardCameraRig() {
  const { camera } = useThree()
  const elapsedRef = useRef(0)
  const spawnHeight = getTerrainHeight(COURTYARD_SPAWN_X, COURTYARD_SPAWN_Z)
  const startPosition = useMemo(() => new THREE.Vector3(COURTYARD_SPAWN_X - 28, spawnHeight + 46, COURTYARD_SPAWN_Z + 196), [spawnHeight])
  const settledPosition = useMemo(() => new THREE.Vector3(COURTYARD_SPAWN_X - 18, spawnHeight + 31, COURTYARD_SPAWN_Z + 132), [spawnHeight])
  const lookTarget = useMemo(() => new THREE.Vector3(COURTYARD_SPAWN_X + 2, spawnHeight + 28, COURTYARD_SPAWN_Z - 96), [spawnHeight])

  useFrame((_, dt) => {
    elapsedRef.current = Math.min(1.5, elapsedRef.current + dt)
    const t = Math.min(1, elapsedRef.current / 1.28)
    const eased = 1 - Math.pow(1 - t, 3)

    camera.position.lerpVectors(startPosition, settledPosition, eased)
    camera.lookAt(lookTarget)

    if ('fov' in camera) {
      const perspectiveCamera = camera as THREE.PerspectiveCamera
      perspectiveCamera.fov = THREE.MathUtils.lerp(54, 48, eased)
      perspectiveCamera.updateProjectionMatrix()
    }
  })

  return null
}

function CourtyardSpawnPogo() {
  const groupRef = useRef<THREE.Group>(null)
  const terrainHeight = getTerrainHeight(COURTYARD_SPAWN_X, COURTYARD_SPAWN_Z)

  useFrame(({ clock }) => {
    const group = groupRef.current
    if (!group) return

    const time = clock.elapsedTime
    const t = Math.min(1, time / 0.9)
    const eased = 1 - Math.pow(1 - t, 3)
    group.position.y = terrainHeight + (1 - eased) * 7.5
    group.scale.setScalar(0.84 + eased * 0.16)
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, 0.03, 0.08)
  })

  return (
    <group ref={groupRef} position={[COURTYARD_SPAWN_X, terrainHeight + 7.5, COURTYARD_SPAWN_Z]} rotation={[0, 0.03, 0]}>
      <mesh position={[0, FLOOR_Y + 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[10.6, 4.8, 1]} renderOrder={20}>
        <ringGeometry args={[0.42, 0.92, 72]} />
        <meshBasicMaterial color="#fffdf0" transparent opacity={0.36} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, FLOOR_Y + 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[7.4, 3.2, 1]} renderOrder={21}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color="#dcfff0" transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <PsychedelicPogoOrbAsset
        animation="reference-bounce"
        activity={0.9}
        animationTimeScale={0.92}
        colorCycleSpeed={0.82}
        expression="delighted"
        glowIntensity={0.28}
        phaseOffset={0.18}
        scale={1}
        verticalMotionScale={0.72}
      />
    </group>
  )
}

function ToonGroundOval({
  x,
  z,
  scale,
  color,
  opacity = 1,
  yOffset = 0,
  renderOrder = 1,
}: {
  x: number
  z: number
  scale: [number, number, number]
  color: string
  opacity?: number
  yOffset?: number
  renderOrder?: number
}) {
  return (
    <mesh position={[x, terrainY(x, z, yOffset), z]} rotation={[-Math.PI / 2, 0, 0]} scale={scale} renderOrder={renderOrder}>
      <circleGeometry args={[1, 96]} />
      <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} side={THREE.DoubleSide} />
    </mesh>
  )
}

function CourtyardLevelSurfaces() {
  const museumSurfaces = LEVEL_SURFACES.filter((surface) => surface.id.startsWith('museum-step'))

  return (
    <>
      {museumSurfaces.map((surface) => (
        <group key={surface.id}>
          <mesh
            position={[surface.x, terrainY(surface.x, surface.z, surface.height - 1.9), surface.z]}
            rotation={[0, surface.yaw ?? 0, 0]}
            scale={[surface.halfX * 2.12, 3.8, surface.halfZ * 2.04]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={PALETTE.ink} />
          </mesh>
          <mesh
            position={[surface.x, terrainY(surface.x, surface.z, surface.height), surface.z]}
            rotation={[0, surface.yaw ?? 0, 0]}
            scale={[surface.halfX * 2, 3.2, surface.halfZ * 1.92]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshToonMaterial color={surface.topColor} />
          </mesh>
          <mesh
            position={[surface.x, terrainY(surface.x, surface.z, surface.height + 1.9), surface.z + surface.halfZ * 0.92]}
            rotation={[0, surface.yaw ?? 0, 0]}
            scale={[surface.halfX * 1.72, 0.48, 2.2]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={PALETTE.pathWarm} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function CourtyardBush({
  x,
  z,
  scale = 1,
  yaw = 0,
  color = PALETTE.grassDeep,
}: {
  x: number
  z: number
  scale?: number
  yaw?: number
  color?: string
}) {
  return (
    <group position={[x, terrainY(x, z, 5.2 * scale), z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <mesh scale={[22, 8.4, 15]}>
        <sphereGeometry args={[1, 14, 8]} />
        <meshToonMaterial color={color} />
      </mesh>
      <mesh position={[-7, 3.4, 2]} scale={[10, 5.4, 8]}>
        <sphereGeometry args={[1, 12, 7]} />
        <meshToonMaterial color={PALETTE.grassLight} />
      </mesh>
      <mesh position={[8, 3.2, -2]} scale={[9, 5.2, 7]}>
        <sphereGeometry args={[1, 12, 7]} />
        <meshToonMaterial color="#9fe16b" />
      </mesh>
      <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[18, 11, 1]} renderOrder={3}>
        <circleGeometry args={[1, 36]} />
        <meshBasicMaterial color={PALETTE.ink} transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  )
}

function CourtyardArrivalGlow() {
  const baseY = terrainY(COURTYARD_SPAWN_X, COURTYARD_SPAWN_Z, 0.14)

  return (
    <group>
      <mesh position={[COURTYARD_SPAWN_X, baseY, COURTYARD_SPAWN_Z - 2]} rotation={[-Math.PI / 2, 0, 0]} scale={[44, 19, 1]} renderOrder={30}>
        <ringGeometry args={[0.34, 1, 96]} />
        <meshBasicMaterial color="#fff9cf" transparent opacity={0.46} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[COURTYARD_SPAWN_X, baseY + 0.18, COURTYARD_SPAWN_Z - 5]} rotation={[-Math.PI / 2, 0, 0]} scale={[28, 13, 1]} renderOrder={31}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color="#caffdd" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[COURTYARD_SPAWN_X, terrainY(COURTYARD_SPAWN_X, COURTYARD_SPAWN_Z - 104, 56), COURTYARD_SPAWN_Z - 104]} scale={[48, 62, 1]} renderOrder={0}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fffef1" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function CourtyardForecourtEnvironment() {
  const museumHillY = getTerrainHeight(COURTYARD_SPAWN_X, COURTYARD_SPAWN_Z)
  const signX = 286
  const signZ = -425

  return (
    <group>
      <ToonGroundOval x={520} z={-440} scale={[470, 315, 1]} color={PALETTE.grassDeep} yOffset={-0.12} renderOrder={-4} />
      <ToonGroundOval x={520} z={-448} scale={[430, 278, 1]} color={PALETTE.grass} yOffset={-0.08} renderOrder={-3} />
      <ToonGroundOval x={356} z={-420} scale={[142, 86, 1]} color={PALETTE.grassLight} opacity={0.36} yOffset={-0.04} renderOrder={-2} />
      <ToonGroundOval x={706} z={-492} scale={[154, 82, 1]} color={PALETTE.grassHigh} opacity={0.28} yOffset={-0.04} renderOrder={-2} />

      <mesh position={[520, terrainY(520, -414, 0.02), -414]} rotation={[-Math.PI / 2, 0, 0]} scale={[58, 244, 1]} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={PALETTE.pathEdge} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[520, terrainY(520, -414, 0.06), -414]} rotation={[-Math.PI / 2, 0, 0]} scale={[48, 236, 1]} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={PALETTE.path} side={THREE.DoubleSide} />
      </mesh>
      <ToonGroundOval x={520} z={-486} scale={[150, 84, 1]} color={PALETTE.pathEdge} yOffset={0.03} renderOrder={3} />
      <ToonGroundOval x={520} z={-486} scale={[136, 74, 1]} color={PALETTE.pathWarm} yOffset={0.08} renderOrder={4} />
      <ToonGroundOval x={520} z={-486} scale={[92, 49, 1]} color={PALETTE.path} yOffset={0.12} renderOrder={5} />

      <CourtyardLevelSurfaces />
      <group position={[COURTYARD_MUSEUM_X, museumHillY, COURTYARD_MUSEUM_Z]}>
        <MuseumFacadeSilhouette showMobaSign={false} showProcessionalSlabs={false} />
      </group>
      <MuseumMobaSign position={[signX, terrainY(signX, signZ) - MUSEUM_SCALE_FLOOR_Y, signZ]} yaw={0.14} />

      <CourtyardBush x={340} z={-498} scale={1.14} yaw={0.24} color={PALETTE.grassDeep} />
      <CourtyardBush x={704} z={-506} scale={1.1} yaw={-0.18} color={PALETTE.grassHigh} />
      <CourtyardBush x={404} z={-356} scale={0.78} yaw={-0.34} color={PALETTE.grassHigh} />
      <CourtyardBush x={654} z={-348} scale={0.8} yaw={0.28} color={PALETTE.grassDeep} />
      <CourtyardArrivalGlow />
    </group>
  )
}

function CourtyardScene() {
  return (
    <group>
      <CourtyardForecourtEnvironment />
      <CourtyardCameraRig />
      <CourtyardSpawnPogo />
    </group>
  )
}

function CourtyardLighting() {
  return (
    <>
      <color attach="background" args={['#b9ddc9']} />
      <fog attach="fog" args={['#b9ddc9', 760, 2100]} />
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#fff7dc', '#5f9b62', 1.34]} />
      <directionalLight position={[180, 420, 260]} intensity={1.35} />
      <directionalLight position={[-340, 220, -260]} intensity={0.46} color="#d9fff1" />
    </>
  )
}

function DestinationScene() {
  return (
    <>
      <CourtyardLighting />
      <CourtyardScene />
    </>
  )
}

export function CourtyardRoomPage() {
  const camera = {
    position: [COURTYARD_SPAWN_X - 28, getTerrainHeight(COURTYARD_SPAWN_X, COURTYARD_SPAWN_Z) + 46, COURTYARD_SPAWN_Z + 196],
    fov: 54,
    near: 1,
    far: 3500,
  } as const

  return (
    <main className="destinationStage destinationStageCourtyard" aria-label="Courtyard arrival">
      <Canvas camera={camera} dpr={[1, 1.5]} gl={{ antialias: true }}>
        <DestinationScene />
      </Canvas>
    </main>
  )
}
