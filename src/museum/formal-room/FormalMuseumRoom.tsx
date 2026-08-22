'use client'

import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../render/OutlineMesh'
import { getToonRampTexture } from '../../shaders/toonRamp'
import styles from './FormalMuseumRoom.module.css'
import {
  createFormalRoomArtworkTexture,
  FORMAL_ROOM_ARTWORKS,
  paintFormalRoomArtworkError,
  paintFormalRoomArtworkImage,
  type FormalRoomArtwork,
} from './artworks'
import {
  CollectionDesk,
  verifyOwnedSelection,
  type CollectionAddressSource,
} from './CollectionDesk'
import {
  clearFormalWalkInputState,
  createFormalWalkInputState,
  FormalRoomCameraRig,
  type FormalRoomViewMode,
  type FormalWalkInputState,
} from './FormalRoomCameraRig'
import {
  containFormalRoomMotion,
  FORMAL_ROOM_ANIMATED_IMAGE_MAX_FPS,
  formalRoomAnimatedImageLongEdge,
  formalRoomMotionAttemptOrder,
  shouldPaintFormalRoomAnimationFrame,
} from './mediaPlayback'
import { MuseumExpansion } from './MuseumExpansion'
import { AtriumRegistryPanel } from './AtriumRegistryPanel'
import { atriumResidentColliders } from './atriumRegistryPlan'
import {
  MUSEUM_BASE_LIGHTING,
  OPENING_SALON_ARCHITECTURAL_LIGHTS,
  OPENING_SALON_ARTWORK_LIGHTS,
  type MuseumSpotlightPlan,
} from './museumLighting'
import {
  MUSEUM_GALLERY_BY_ID,
  type MuseumAreaId,
  type MuseumGalleryId,
} from './museumPlan'
import {
  ownedNftMediaProxyUrl,
  type OwnedNft,
  type OwnedNftMediaVariant,
} from './ownedNfts'
import type {
  AppliedAtriumInstallation,
  MuseumAssetSummary,
} from '../collection-registry/museumAssetTypes'

const INK = '#17131d'
const SOFT_INK = '#28202f'
const CREAM = '#f6e7bf'
const PALE_CREAM = '#fff4d5'
const WALL = '#e8cfaa'
const WALL_LIGHT = '#f3dfbc'
const TEAK = '#845034'
const TEAK_DARK = '#4d2d24'
const BRASS = '#d2a543'
const TEAL = '#356d69'
const TEAL_DARK = '#214844'
const CORAL = '#ed876e'
const TOON_RAMP = getToonRampTexture()
const ARTWORK_IMAGE_LOAD_TIMEOUT_MS = 15_000

type Vec3 = readonly [number, number, number]
type FocusIndex = number | null
type ArtworkMediaStatus = 'loading' | 'ready' | 'error'
export type ArtworkMotionStatus = 'none' | 'loading' | 'playing' | 'paused' | 'unavailable'
type ArtworkLoadStatus = 'missing' | 'loading' | 'ready' | 'error'

const BUNDLED_FORMAL_ROOM_MEDIA_PREFIX = '/museum/formal-room/placeholders/'

export function formalRoomArtworkMediaUrl(
  mediaUrl: string,
  variant: OwnedNftMediaVariant,
): string {
  return mediaUrl.startsWith(BUNDLED_FORMAL_ROOM_MEDIA_PREFIX)
    ? mediaUrl
    : ownedNftMediaProxyUrl(mediaUrl, variant)
}

type ExhibitionPreview = {
  address: string
  artworks: readonly FormalRoomArtwork[]
  nfts: readonly [OwnedNft, OwnedNft, OwnedNft]
  revision: number
  source: CollectionAddressSource
}

function damp(current: number, target: number, strength: number, delta: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-strength * delta))
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return reduced
}

function ToonBox({
  position,
  scale,
  rotation = [0, 0, 0],
  color,
  outlineWidth = 0.045,
  emissive = '#000000',
  emissiveIntensity = 0,
}: {
  position: Vec3
  scale: Vec3
  rotation?: Vec3
  color: string
  outlineWidth?: number
  emissive?: string
  emissiveIntensity?: number
}) {
  return (
    <OutlineMesh
      position={position}
      rotation={rotation}
      scale={[...scale]}
      outlineWidth={outlineWidth}
      geometry={<boxGeometry args={[1, 1, 1]} />}
      material={(
        <meshToonMaterial
          color={color}
          gradientMap={TOON_RAMP}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      )}
    />
  )
}

function ToonCylinder({
  position,
  scale,
  rotation = [0, 0, 0],
  color,
  outlineWidth = 0.035,
  radialSegments = 18,
}: {
  position: Vec3
  scale: Vec3
  rotation?: Vec3
  color: string
  outlineWidth?: number
  radialSegments?: number
}) {
  return (
    <OutlineMesh
      position={position}
      rotation={rotation}
      scale={[...scale]}
      outlineWidth={outlineWidth}
      geometry={<cylinderGeometry args={[0.5, 0.5, 1, radialSegments]} />}
      material={<meshToonMaterial color={color} gradientMap={TOON_RAMP} />}
    />
  )
}

function WainscotPanel({ x }: { x: number }) {
  return (
    <group position={[x, -0.92, -2.28]}>
      <ToonBox position={[0, 0, 0]} scale={[1.48, 1.36, 0.08]} color={TEAK_DARK} outlineWidth={0.025} />
      <ToonBox position={[0, 0.02, 0.075]} scale={[1.3, 1.13, 0.065]} color={TEAK} outlineWidth={0.025} />
      <ToonBox position={[0, 0.23, 0.14]} scale={[1.05, 0.055, 0.035]} color="#b97848" outlineWidth={0.012} />
      <ToonBox position={[0, -0.2, 0.14]} scale={[1.05, 0.055, 0.035]} color="#673a2a" outlineWidth={0.012} />
    </group>
  )
}

function PictureLamp({ x, y, width }: { x: number; y: number; width: number }) {
  const hero = width > 2.4
  return (
    <group position={[x, y, 0.16]}>
      <ToonBox
        position={[0, 0, 0]}
        scale={[Math.min(0.92, width * 0.44), 0.12, 0.18]}
        color={BRASS}
        outlineWidth={0.035}
        emissive="#8b5919"
        emissiveIntensity={hero ? 0.34 : 0.22}
      />
      <ToonCylinder position={[0, 0.14, -0.05]} scale={[0.09, 0.32, 0.09]} color={TEAK_DARK} outlineWidth={0.022} />
      <mesh position={[0, -0.18, 0.08]} rotation={[Math.PI * 0.5, 0, 0]} scale={[width * 0.42, hero ? 0.78 : 0.68, 1]} renderOrder={2}>
        <circleGeometry args={[1, 40]} />
        <meshBasicMaterial
          color={hero ? '#fff7d1' : '#fff0b5'}
          transparent
          opacity={hero ? 0.05 : 0.035}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>
    </group>
  )
}

function SalonPlannedSpotlight({ light }: { light: MuseumSpotlightPlan }) {
  const lightRef = useRef<THREE.SpotLight>(null)
  const targetRef = useRef<THREE.Object3D>(null)

  useEffect(() => {
    const light = lightRef.current
    const target = targetRef.current
    if (!light || !target) return
    light.target = target
    target.updateMatrixWorld()
  }, [])

  return (
    <>
      <object3D ref={targetRef} position={[...light.target]} />
      <spotLight
        ref={lightRef}
        position={[...light.position]}
        angle={light.angle}
        penumbra={light.penumbra ?? 0.86}
        intensity={light.intensity}
        color={light.color}
        distance={light.distance}
        decay={2}
        castShadow={false}
      />
    </>
  )
}

function SalonLighting({ active }: { active: boolean }) {
  return (
    <group userData={{ lightingSystem: 'museum-natural-lighting', activeSpace: active ? 'opening-salon-and-atrium' : 'gallery' }}>
      <ambientLight intensity={MUSEUM_BASE_LIGHTING.ambient.intensity} color={MUSEUM_BASE_LIGHTING.ambient.color} />
      <hemisphereLight args={[
        MUSEUM_BASE_LIGHTING.hemisphere.skyColor,
        MUSEUM_BASE_LIGHTING.hemisphere.groundColor,
        MUSEUM_BASE_LIGHTING.hemisphere.intensity,
      ]} />

      {active ? (
        <group userData={{ lightingPlan: 'opening-salon', activeLights: 4 }}>
          {OPENING_SALON_ARTWORK_LIGHTS.map((light) => <SalonPlannedSpotlight key={light.id} light={light} />)}
          {OPENING_SALON_ARCHITECTURAL_LIGHTS.map((light) => <SalonPlannedSpotlight key={light.id} light={light} />)}
        </group>
      ) : null}

    </group>
  )
}

function GalleryWallDisplay() {
  const bays = [
    { x: -3.55, width: 2.38, height: 3.25, color: '#ead5b2' },
    { x: 0, width: 3.86, height: 3.42, color: '#f7e7c8' },
    { x: 3.55, width: 2.38, height: 3.25, color: '#ead5b2' },
  ] as const

  return (
    <group position={[0, 0.55, -2.16]}>
      {bays.map((bay, index) => (
        <group key={bay.x} position={[bay.x, 0, 0]}>
          <ToonBox
            position={[0, 0, 0]}
            scale={[bay.width + 0.2, bay.height + 0.2, 0.09]}
            color={TEAK_DARK}
            outlineWidth={0.035}
          />
          <ToonBox
            position={[0, 0, 0.07]}
            scale={[bay.width, bay.height, 0.08]}
            color={bay.color}
            outlineWidth={0.022}
          />
          <ToonBox
            position={[0, bay.height * 0.5 - 0.12, 0.13]}
            scale={[bay.width * 0.72, 0.055, 0.035]}
            color={index === 1 ? BRASS : '#bd8d42'}
            outlineWidth={0.012}
            emissive="#6d4818"
            emissiveIntensity={index === 1 ? 0.12 : 0.06}
          />
          <mesh position={[0, 0.18, 0.14]} scale={[bay.width * 0.82, bay.height * 0.66, 1]} renderOrder={0}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              color={index === 1 ? '#fff2c8' : '#ffe7b2'}
              transparent
              opacity={index === 1 ? 0.05 : 0.025}
              depthWrite={false}
              blending={THREE.NormalBlending}
            />
          </mesh>
        </group>
      ))}

      <ToonBox position={[-2.08, 0, -0.03]} scale={[0.12, 3.74, 0.16]} color={BRASS} outlineWidth={0.025} />
      <ToonBox position={[2.08, 0, -0.03]} scale={[0.12, 3.74, 0.16]} color={BRASS} outlineWidth={0.025} />
      <ToonBox position={[0, 1.94, -0.01]} scale={[4.38, 0.16, 0.16]} color={TEAK_DARK} outlineWidth={0.04} />
      <ToonBox position={[0, 1.99, 0.08]} scale={[3.92, 0.055, 0.05]} color={BRASS} outlineWidth={0.014} />
      <mesh position={[0, 2.13, 0.11]} rotation={[0, 0, Math.PI / 4]} scale={[0.15, 0.15, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fff0b6" toneMapped={false} />
      </mesh>
    </group>
  )
}

function MuseumTopiary({ side }: { side: -1 | 1 }) {
  const x = side * 5.28
  return (
    <group position={[x, -1.42, -0.86]} rotation={[0, side * -0.08, 0]}>
      <mesh position={[0, -0.72, 0.12]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.82, 0.46, 1]}>
        <circleGeometry args={[1, 42]} />
        <meshBasicMaterial color={INK} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <OutlineMesh
        position={[0, -0.34, 0]}
        scale={[0.68, 0.76, 0.68]}
        outlineWidth={0.045}
        geometry={<cylinderGeometry args={[0.34, 0.5, 1, 14]} />}
        material={<meshToonMaterial color={CORAL} gradientMap={TOON_RAMP} />}
      />
      <ToonCylinder position={[0, 0.22, 0]} scale={[0.17, 0.86, 0.17]} color={TEAK_DARK} outlineWidth={0.025} />
      <OutlineMesh
        position={[0, 0.78, 0]}
        scale={[0.94, 1.02, 0.82]}
        outlineWidth={0.055}
        geometry={<sphereGeometry args={[0.5, 12, 8]} />}
        material={<meshToonMaterial color={side < 0 ? '#4f9b73' : '#438d6c'} gradientMap={TOON_RAMP} />}
      />
      <OutlineMesh
        position={[side * -0.24, 1.28, 0.03]}
        scale={[0.66, 0.75, 0.62]}
        outlineWidth={0.045}
        geometry={<sphereGeometry args={[0.5, 12, 8]} />}
        material={<meshToonMaterial color="#72bd78" gradientMap={TOON_RAMP} />}
      />
      <mesh position={[side * 0.2, 1.48, 0.34]} scale={[0.13, 0.13, 1]}>
        <circleGeometry args={[1, 20]} />
        <meshBasicMaterial color="#ffe989" toneMapped={false} />
      </mesh>
    </group>
  )
}

function MuseumBench({ mode }: { mode: FormalRoomViewMode }) {
  const { size } = useThree()
  const compact = size.width < 700 && mode === 'curated'
  return (
    <group position={[0, compact ? -2.7 : -1.64, compact ? 3.65 : 3]} scale={compact ? 0.62 : 1}>
      <mesh position={[0, -0.58, 0.22]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.3, 0.68, 1]}>
        <circleGeometry args={[1, 56]} />
        <meshBasicMaterial color={INK} transparent opacity={0.17} depthWrite={false} />
      </mesh>
      <ToonBox position={[0, 0, 0]} scale={[2.8, 0.32, 0.82]} color={TEAK} outlineWidth={0.07} />
      <ToonBox position={[0, 0.18, -0.03]} scale={[2.52, 0.1, 0.65]} color="#b96f43" outlineWidth={0.025} />
      {[-1.04, 1.04].map((x) => (
        <group key={x}>
          <ToonBox position={[x, -0.46, -0.24]} scale={[0.16, 0.78, 0.17]} color={TEAK_DARK} outlineWidth={0.035} />
          <ToonBox position={[x, -0.46, 0.24]} scale={[0.16, 0.78, 0.17]} color={TEAK_DARK} outlineWidth={0.035} />
        </group>
      ))}
      <ToonBox position={[0, -0.72, 0]} scale={[2.18, 0.08, 0.48]} color={BRASS} outlineWidth={0.025} />
    </group>
  )
}

function SideWallSconce({ side, z }: { side: -1 | 1; z: number }) {
  return (
    <group position={[side * 5.68, 0.82, z]} rotation={[0, side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, 0]}>
      <ToonBox position={[0, 0, 0]} scale={[0.48, 0.68, 0.15]} color={TEAK_DARK} outlineWidth={0.045} />
      <ToonCylinder position={[0, 0.02, 0.18]} rotation={[Math.PI * 0.5, 0, 0]} scale={[0.22, 0.22, 0.22]} color={BRASS} outlineWidth={0.035} />
      <mesh position={[0, 0.02, 0.3]} scale={[0.23, 0.23, 1]}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color="#ffe989" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.02, 0.31]} scale={[0.54, 0.54, 1]} renderOrder={2}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color="#ffe9a8" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function SalonEntrance() {
  const openingWidth = 3.55
  const wallWidth = 12.05
  const sideWidth = (wallWidth - openingWidth) * 0.5
  const sideOffset = openingWidth * 0.5 + sideWidth * 0.5
  return (
    <group userData={{ atriumEntrance: true, clearWidth: openingWidth }}>
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <ToonBox
            position={[side * sideOffset, 0.35, 10.14]}
            scale={[sideWidth, 6.5, 0.34]}
            color={WALL}
            outlineWidth={0.07}
          />
          <ToonBox
            position={[side * sideOffset, 1.15, 9.94]}
            scale={[sideWidth - 0.34, 3.82, 0.08]}
            color={WALL_LIGHT}
            outlineWidth={0.025}
          />
          <ToonBox
            position={[side * sideOffset, -1.42, 9.88]}
            scale={[sideWidth - 0.2, 1.05, 0.14]}
            color={TEAK_DARK}
            outlineWidth={0.04}
          />
          <ToonBox
            position={[side * sideOffset, -0.83, 9.79]}
            scale={[sideWidth - 0.34, 0.08, 0.08]}
            color={BRASS}
            outlineWidth={0.02}
          />
          <ToonBox position={[side * 1.98, 0.24, 9.9]} scale={[0.34, 4.52, 0.52]} color={TEAK_DARK} outlineWidth={0.06} />
          <ToonBox position={[side * 1.8, 0.26, 9.72]} scale={[0.11, 4.2, 0.18]} color={BRASS} outlineWidth={0.022} />
        </group>
      ))}
      <ToonBox position={[0, 3.08, 10.14]} scale={[openingWidth, 1.05, 0.34]} color={WALL} outlineWidth={0.065} />
      <ToonBox position={[0, 2.72, 9.9]} scale={[openingWidth + 0.72, 0.44, 0.52]} color={TEAK_DARK} outlineWidth={0.06} />
      <ToonBox position={[0, 2.47, 9.72]} scale={[openingWidth + 0.38, 0.12, 0.16]} color={BRASS} outlineWidth={0.025} emissive="#ffe4a6" emissiveIntensity={0.18} />
      {[
        [-1.18, '#f2b84b'],
        [-0.4, '#64e3e8'],
        [0.4, '#d6e5df'],
        [1.18, '#d8ff65'],
      ].map(([x, color]) => (
        <ToonBox
          key={String(color)}
          position={[Number(x), 2.76, 9.62]}
          scale={[0.44, 0.44, 0.08]}
          rotation={[0, 0, Math.PI / 4]}
          color={String(color)}
          outlineWidth={0.026}
          emissive={String(color)}
          emissiveIntensity={0.12}
        />
      ))}
      <ToonBox position={[0, -1.94, 10.02]} scale={[openingWidth, 0.045, 0.68]} color="#d8caa8" outlineWidth={0.018} />
      <ToonBox position={[0, -1.9, 10.02]} scale={[openingWidth - 0.32, 0.025, 0.08]} color={BRASS} outlineWidth={0.012} />
    </group>
  )
}

function DustMotes({ reducedMotion }: { reducedMotion: boolean }) {
  const pointsRef = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const values = new Float32Array(36 * 3)
    for (let index = 0; index < 36; index += 1) {
      const angle = index * 2.399
      const radius = 0.45 + (index % 7) * 0.34
      values[index * 3] = Math.cos(angle) * radius
      values[index * 3 + 1] = -0.9 + ((index * 0.47) % 3.6)
      values[index * 3 + 2] = -0.4 + Math.sin(angle * 0.7) * 1.7
    }
    return values
  }, [])

  useFrame(({ clock }, delta) => {
    const points = pointsRef.current
    if (!points || reducedMotion) return
    points.rotation.y += delta * 0.018
    points.position.y = Math.sin(clock.elapsedTime * 0.23) * 0.06
  })

  return (
    <points ref={pointsRef} position={[0, 0, 0.4]} renderOrder={7}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#fff3c7" size={0.035} transparent opacity={0.42} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function SalonArchitecture({ mode }: { mode: FormalRoomViewMode }) {
  const floorSeams = [-5.2, -3.9, -2.6, -1.3, 0, 1.3, 2.6, 3.9, 5.2]
  const panels = [-4.72, -3.15, -1.58, 0, 1.58, 3.15, 4.72]
  const depthSeams = [-1.4, 0.15, 1.7, 3.25, 4.8, 6.35, 7.9, 9.45]
  const sidePilasters = [0.45, 3.5, 6.55, 9.4]
  const sideWallSegments = [
    { z: 0.08, depth: 6.38 },
    { z: 8.51, depth: 3.68 },
  ]
  return (
    <group>
      <mesh position={[0, 0.35, -2.62]} scale={[12.4, 6.55, 0.34]} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={WALL} gradientMap={TOON_RAMP} />
      </mesh>
      <mesh position={[0, 1.32, -2.42]} scale={[11.4, 3.5, 0.06]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={WALL_LIGHT} transparent opacity={0.36} />
      </mesh>
      <GalleryWallDisplay />

      {([-1, 1] as const).flatMap((side) => sideWallSegments.map((segment) => (
        <group key={`${side}-wall-${segment.z}`}>
          <ToonBox position={[side * 6.06, 0.1, segment.z]} scale={[0.34, 6.5, segment.depth]} color={TEAL_DARK} outlineWidth={0.085} />
          <ToonBox position={[side * 5.83, 1.12, segment.z]} scale={[0.12, 3.7, segment.depth - 0.18]} color={TEAL} outlineWidth={0.025} />
          <ToonBox position={[side * 5.72, -0.95, segment.z]} scale={[0.13, 1.42, segment.depth - 0.28]} color={TEAK_DARK} outlineWidth={0.035} />
          <ToonBox position={[side * 5.61, -0.92, segment.z]} scale={[0.08, 1.12, segment.depth - 0.4]} color={TEAK} outlineWidth={0.018} />
        </group>
      )))}
      {([-1, 1] as const).flatMap((side) => sidePilasters.map((z) => (
        <group key={`${side}-${z}`}>
          <ToonBox position={[side * 5.55, -0.92, z]} scale={[0.08, 1.12, 0.12]} color="#b97848" outlineWidth={0.012} />
          <ToonBox position={[side * 5.57, -0.18, z]} scale={[0.1, 0.12, 0.32]} color={BRASS} outlineWidth={0.018} />
        </group>
      )))}

      {panels.map((x) => <WainscotPanel key={x} x={x} />)}
      <ToonBox position={[0, -0.18, -2.22]} scale={[11.35, 0.16, 0.15]} color={TEAK_DARK} outlineWidth={0.045} />
      <ToonBox position={[0, -0.08, -2.1]} scale={[11.15, 0.06, 0.07]} color={BRASS} outlineWidth={0.022} />
      <ToonBox position={[0, -1.7, -2.18]} scale={[11.48, 0.22, 0.18]} color={TEAK_DARK} outlineWidth={0.052} />
      <ToonBox position={[0, -1.54, -2.08]} scale={[11.2, 0.055, 0.08]} color={BRASS} outlineWidth={0.02} />

      <ToonBox position={[0, 3.18, -2.2]} scale={[11.62, 0.28, 0.22]} color={TEAK_DARK} outlineWidth={0.06} />
      <ToonBox position={[0, 3, -2.08]} scale={[11.35, 0.075, 0.09]} color={BRASS} outlineWidth={0.024} />
      <ToonBox position={[0, 3.56, 3.62]} scale={[12.35, 0.34, 13.5]} color="#d7bea0" outlineWidth={0.09} />
      <ToonBox position={[0, 3.31, -0.08]} scale={[5.9, 0.14, 3.45]} color={PALE_CREAM} outlineWidth={0.04} />
      <ToonBox position={[0, 3.21, -0.18]} scale={[4.9, 0.07, 2.64]} color={BRASS} outlineWidth={0.025} emissive="#6d4818" emissiveIntensity={0.08} />
      {[2.2, 5.55, 8.9].map((z) => (
        <group key={z}>
          <ToonBox position={[0, 3.32, z]} scale={[11.78, 0.16, 0.3]} color={TEAK_DARK} outlineWidth={0.045} />
          <ToonBox position={[0, 3.2, z - 0.02]} scale={[11.45, 0.05, 0.12]} color={BRASS} outlineWidth={0.018} />
        </group>
      ))}

      <mesh position={[0, -2.2, 3.62]} rotation={[-Math.PI / 2, 0, 0]} scale={[13.2, 13.55, 1]} receiveShadow>
        <planeGeometry args={[1, 1]} />
        <meshToonMaterial color="#a96f4a" gradientMap={TOON_RAMP} side={THREE.DoubleSide} />
      </mesh>
      {floorSeams.map((x) => (
        <mesh key={x} position={[x, -2.185, 3.62]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.025, 13.25, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={x === 0 ? '#f0bf78' : '#583426'} transparent opacity={x === 0 ? 0.28 : 0.24} depthWrite={false} />
        </mesh>
      ))}
      {depthSeams.map((z) => (
        <mesh key={z} position={[0, -2.18, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[12.8, 0.024, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#563125" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      ))}

      <ToonBox position={[0, -2.12, 1.72]} scale={[6.25, 0.07, 6.25]} color={SOFT_INK} outlineWidth={0.07} />
      <ToonBox position={[0, -2.06, 1.72]} scale={[5.9, 0.06, 5.9]} color={TEAL_DARK} outlineWidth={0.035} />
      <ToonBox position={[0, -2, 1.72]} scale={[5.48, 0.035, 5.48]} color="#315f5a" outlineWidth={0.018} />
      <ToonBox position={[-2.46, -1.965, 1.72]} scale={[0.045, 0.022, 4.78]} color={BRASS} outlineWidth={0.012} />
      <ToonBox position={[2.46, -1.965, 1.72]} scale={[0.045, 0.022, 4.78]} color={BRASS} outlineWidth={0.012} />
      <ToonBox position={[0, -1.965, -0.74]} scale={[4.78, 0.022, 0.045]} color={BRASS} outlineWidth={0.012} />
      <ToonBox position={[0, -1.965, 4.18]} scale={[4.78, 0.022, 0.045]} color={BRASS} outlineWidth={0.012} />
      <ToonBox
        position={[0, -1.94, 1.72]}
        scale={[1.06, 0.025, 1.06]}
        rotation={[0, Math.PI / 4, 0]}
        color="#4a8a80"
        outlineWidth={0.026}
      />
      <ToonBox
        position={[0, -1.91, 1.72]}
        scale={[0.54, 0.02, 0.54]}
        rotation={[0, Math.PI / 4, 0]}
        color={BRASS}
        outlineWidth={0.018}
      />
      <mesh position={[0, -1.972, 1.72]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 1, 64]} />
        <meshBasicMaterial color={BRASS} transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      <MuseumTopiary side={-1} />
      <MuseumTopiary side={1} />
      <MuseumBench mode={mode} />

      <SideWallSconce side={-1} z={2.1} />
      <SideWallSconce side={1} z={2.1} />
      <SideWallSconce side={-1} z={6.7} />
      <SideWallSconce side={1} z={6.7} />
      <SalonEntrance />

      {([-1, 1] as const).map((side) => (
        <group key={`loop-floor-${side}`}>
          <mesh position={[side * 4.72, -1.965, 5]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.62, 0.88, 64]} />
            <meshBasicMaterial
              color={side < 0 ? '#f2b84b' : '#d8ff65'}
              transparent
              opacity={0.52}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <ToonBox
            position={[side * 4.72, -1.92, 5]}
            scale={[0.42, 0.035, 0.42]}
            rotation={[0, Math.PI / 4, 0]}
            color={side < 0 ? '#f2b84b' : '#d8ff65'}
            outlineWidth={0.02}
          />
        </group>
      ))}

      <mesh position={[0, 1.33, -2.02]} scale={[4.48, 2.62, 1]} renderOrder={0}>
        <ringGeometry args={[0.92, 1, 80, 1, 0, Math.PI]} />
        <meshBasicMaterial color={BRASS} transparent opacity={0.24} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function FramedArtwork({
  artwork,
  index,
  exploreMode,
  selected,
  onSelect,
  onMediaStatus,
  onMotionStatus,
  motionPaused,
  reducedMotion,
}: {
  artwork: FormalRoomArtwork
  index: number
  exploreMode: boolean
  selected: boolean
  onSelect: (index: number) => void
  onMediaStatus: (artworkId: string, status: ArtworkMediaStatus) => void
  onMotionStatus: (artworkId: string, status: ArtworkMotionStatus) => void
  motionPaused: boolean
  reducedMotion: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const motionRef = useRef(0)
  const posterLoadStatusRef = useRef<ArtworkLoadStatus>('missing')
  const motionLoadStatusRef = useRef<ArtworkLoadStatus>(artwork.animationUrl ? 'loading' : 'missing')
  const animatedImageRef = useRef<HTMLImageElement | null>(null)
  const imageDecoderRef = useRef<ImageDecoder | null>(null)
  const decodedFrameCountRef = useRef(0)
  const decodedFrameIndexRef = useRef(0)
  const decodedFrameDueAtRef = useRef(0)
  const decodedFramePendingRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastAnimatedPaintAtRef = useRef(0)
  const motionStatusRef = useRef<ArtworkMotionStatus>('none')
  const motionAllowedRef = useRef(true)
  const [hovered, setHovered] = useState(false)
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden)
  const [motionSurface, setMotionSurface] = useState<'decoded-image' | 'image' | 'video' | null>(null)
  const [motionStatus, setMotionStatus] = useState<ArtworkMotionStatus>(
    artwork.animationUrl ? 'loading' : 'none',
  )
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null)
  const [videoSize, setVideoSize] = useState<readonly [number, number]>([1, 1])
  const { gl, size } = useThree()
  const textureLongEdge = size.width <= 700 ? 1024 : 2048
  const animatedTextureLongEdge = formalRoomAnimatedImageLongEdge(size.width)
  const texture = useMemo(
    () => createFormalRoomArtworkTexture(artwork, textureLongEdge),
    [artwork, textureLongEdge],
  )
  const animatedTexture = useMemo(() => {
    if (!artwork.animationUrl) return null
    const nextTexture = createFormalRoomArtworkTexture(artwork, animatedTextureLongEdge)
    nextTexture.generateMipmaps = false
    nextTexture.minFilter = THREE.LinearFilter
    nextTexture.magFilter = THREE.LinearFilter
    nextTexture.anisotropy = 4
    return nextTexture
  }, [animatedTextureLongEdge, artwork])
  const [width, height] = artwork.frameSize
  const motionAllowed = pageVisible && !reducedMotion && !motionPaused
  const containedVideoSize = containFormalRoomMotion(artwork.frameSize, videoSize)

  const publishMotionStatus = useCallback((status: ArtworkMotionStatus) => {
    if (motionStatusRef.current === status) return
    motionStatusRef.current = status
    setMotionStatus(status)
    onMotionStatus(artwork.id, status)
  }, [artwork.id, onMotionStatus])

  const reportMediaReadiness = useCallback(() => {
    const posterStatus = posterLoadStatusRef.current
    const optionalMotionStatus = motionLoadStatusRef.current
    if (posterStatus === 'ready' || optionalMotionStatus === 'ready') {
      onMediaStatus(artwork.id, 'ready')
      return
    }
    if (posterStatus === 'loading' || optionalMotionStatus === 'loading') {
      onMediaStatus(artwork.id, 'loading')
      return
    }
    paintFormalRoomArtworkError(texture, artwork.accent)
    onMediaStatus(artwork.id, 'error')
  }, [artwork.accent, artwork.id, onMediaStatus, texture])

  useEffect(() => () => texture.dispose(), [texture])
  useEffect(() => () => animatedTexture?.dispose(), [animatedTexture])

  useEffect(() => {
    const handleVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    motionAllowedRef.current = motionAllowed
  }, [motionAllowed])

  useEffect(() => {
    const sources = [...new Set([artwork.imageUrl, artwork.thumbnailUrl].filter((source): source is string => Boolean(source)))]
    if (!sources.length) {
      posterLoadStatusRef.current = 'missing'
      if (artwork.source === 'sample') onMediaStatus(artwork.id, 'ready')
      else reportMediaReadiness()
      return
    }

    let cancelled = false
    let sourceIndex = 0
    let image: HTMLImageElement | null = null
    let loadTimer: number | null = null
    posterLoadStatusRef.current = 'loading'
    reportMediaReadiness()

    const clearLoadTimer = () => {
      if (loadTimer === null) return
      window.clearTimeout(loadTimer)
      loadTimer = null
    }

    const advanceToNextSource = (failedImage: HTMLImageElement) => {
      if (cancelled || image !== failedImage) return
      clearLoadTimer()
      failedImage.onload = null
      failedImage.onerror = null
      failedImage.src = ''
      image = null
      sourceIndex += 1
      tryNextSource()
    }

    function tryNextSource() {
      if (cancelled) return
      if (sourceIndex >= sources.length) {
        clearLoadTimer()
        posterLoadStatusRef.current = 'error'
        reportMediaReadiness()
        return
      }

      const nextImage = new Image()
      image = nextImage
      nextImage.crossOrigin = 'anonymous'
      nextImage.decoding = 'async'
      nextImage.onload = () => {
        if (cancelled) return
        clearLoadTimer()
        nextImage.onload = null
        nextImage.onerror = null
        image = null
        paintFormalRoomArtworkImage(texture, nextImage, artwork.accent)
        posterLoadStatusRef.current = 'ready'
        reportMediaReadiness()
      }
      nextImage.onerror = () => advanceToNextSource(nextImage)
      loadTimer = window.setTimeout(
        () => advanceToNextSource(nextImage),
        ARTWORK_IMAGE_LOAD_TIMEOUT_MS,
      )
      nextImage.src = formalRoomArtworkMediaUrl(sources[sourceIndex], 'room')
    }

    tryNextSource()
    return () => {
      cancelled = true
      clearLoadTimer()
      if (image) {
        image.onload = null
        image.onerror = null
        image.src = ''
      }
    }
  }, [artwork.accent, artwork.id, artwork.imageUrl, artwork.source, artwork.thumbnailUrl, onMediaStatus, reportMediaReadiness, texture])

  useEffect(() => {
    const animationUrl = artwork.animationUrl
    if (!animationUrl || !animatedTexture) {
      motionLoadStatusRef.current = 'missing'
      publishMotionStatus('none')
      if (artwork.source === 'sample') onMediaStatus(artwork.id, 'ready')
      else reportMediaReadiness()
      return
    }
    const motionTexture = animatedTexture
    const motionUrl = animationUrl
    const proxiedMotionUrl = formalRoomArtworkMediaUrl(motionUrl, 'motion')

    const attempts = formalRoomMotionAttemptOrder(artwork.animationKind)
    let attemptIndex = 0
    let cancelled = false
    let image: HTMLImageElement | null = null
    let video: HTMLVideoElement | null = null
    let decoderController: AbortController | null = null
    let nextVideoTexture: THREE.VideoTexture | null = null
    let loadTimer: number | null = null
    let startTimer: number | null = null
    motionLoadStatusRef.current = 'loading'
    animatedImageRef.current = null
    videoRef.current = null
    publishMotionStatus('loading')
    reportMediaReadiness()

    const clearLoadTimer = () => {
      if (loadTimer === null) return
      window.clearTimeout(loadTimer)
      loadTimer = null
    }

    const cleanImage = () => {
      if (!image) return
      image.onload = null
      image.onerror = null
      image.src = ''
      image.remove()
      if (animatedImageRef.current === image) animatedImageRef.current = null
      image = null
    }

    const cleanDecoder = () => {
      decoderController?.abort()
      decoderController = null
      imageDecoderRef.current?.close()
      imageDecoderRef.current = null
      decodedFrameCountRef.current = 0
      decodedFrameIndexRef.current = 0
      decodedFrameDueAtRef.current = 0
      decodedFramePendingRef.current = false
    }

    const cleanVideo = () => {
      if (nextVideoTexture) {
        nextVideoTexture.dispose()
        nextVideoTexture = null
      }
      if (!video) return
      video.pause()
      video.onloadeddata = null
      video.onerror = null
      video.removeAttribute('src')
      video.load()
      video.remove()
      if (videoRef.current === video) videoRef.current = null
      video = null
    }

    const finishUnavailable = () => {
      motionLoadStatusRef.current = 'error'
      setMotionSurface(null)
      setVideoTexture(null)
      publishMotionStatus('unavailable')
      reportMediaReadiness()
    }

    const advanceAttempt = () => {
      if (cancelled) return
      clearLoadTimer()
      cleanImage()
      cleanDecoder()
      cleanVideo()
      setMotionSurface(null)
      setVideoTexture(null)
      attemptIndex += 1
      tryNextAttempt()
    }

    function tryImageElement() {
      const nextImage = new Image()
      image = nextImage
      nextImage.crossOrigin = 'anonymous'
      nextImage.decoding = 'async'
      nextImage.alt = ''
      nextImage.setAttribute('aria-hidden', 'true')
      nextImage.style.position = 'absolute'
      nextImage.style.width = '1px'
      nextImage.style.height = '1px'
      nextImage.style.opacity = '0'
      nextImage.style.pointerEvents = 'none'
      nextImage.style.clipPath = 'inset(100%)'
      ;(gl.domElement.parentElement ?? document.body).appendChild(nextImage)
      nextImage.onload = () => {
        if (cancelled || image !== nextImage) return
        clearLoadTimer()
        nextImage.onload = null
        nextImage.onerror = null
        animatedImageRef.current = nextImage
        paintFormalRoomArtworkImage(motionTexture, nextImage, artwork.accent)
        paintFormalRoomArtworkImage(texture, nextImage, artwork.accent)
        motionLoadStatusRef.current = 'ready'
        setMotionSurface('image')
        publishMotionStatus(motionAllowedRef.current ? 'playing' : 'paused')
        reportMediaReadiness()
      }
      nextImage.onerror = advanceAttempt
      loadTimer = window.setTimeout(advanceAttempt, ARTWORK_IMAGE_LOAD_TIMEOUT_MS)
      nextImage.src = proxiedMotionUrl
    }

    async function tryDecodedImage() {
      if (typeof ImageDecoder === 'undefined') {
        tryImageElement()
        return
      }

      decoderController = new AbortController()
      loadTimer = window.setTimeout(() => decoderController?.abort(), ARTWORK_IMAGE_LOAD_TIMEOUT_MS)
      try {
        const response = await fetch(proxiedMotionUrl, {
          cache: 'force-cache',
          signal: decoderController.signal,
        })
        if (!response.ok) throw new Error('animation_fetch_failed')
        const mediaType = response.headers.get('content-type')?.split(';')[0]?.trim()
        if (!mediaType || !await ImageDecoder.isTypeSupported(mediaType)) {
          throw new Error('animation_type_unsupported')
        }

        const nextDecoder = new ImageDecoder({
          data: await response.arrayBuffer(),
          type: mediaType,
        })
        await nextDecoder.tracks.ready
        const frameCount = nextDecoder.tracks.selectedTrack?.frameCount ?? 0
        if (cancelled || frameCount < 2) {
          nextDecoder.close()
          throw new Error('animation_frames_unavailable')
        }

        const firstFrame = await nextDecoder.decode({ frameIndex: 0, completeFramesOnly: true })
        if (cancelled) {
          firstFrame.image.close()
          nextDecoder.close()
          return
        }
        clearLoadTimer()
        decoderController = null
        imageDecoderRef.current = nextDecoder
        decodedFrameCountRef.current = frameCount
        decodedFrameIndexRef.current = frameCount > 1 ? 1 : 0
        decodedFrameDueAtRef.current = 0
        paintFormalRoomArtworkImage(motionTexture, firstFrame.image, artwork.accent)
        paintFormalRoomArtworkImage(texture, firstFrame.image, artwork.accent)
        firstFrame.image.close()
        motionLoadStatusRef.current = 'ready'
        setMotionSurface('decoded-image')
        publishMotionStatus(motionAllowedRef.current ? 'playing' : 'paused')
        reportMediaReadiness()
      } catch {
        clearLoadTimer()
        cleanDecoder()
        if (!cancelled) tryImageElement()
      }
    }

    function tryVideo() {
      const nextVideo = document.createElement('video')
      video = nextVideo
      nextVideo.crossOrigin = 'anonymous'
      nextVideo.muted = true
      nextVideo.defaultMuted = true
      nextVideo.loop = true
      nextVideo.playsInline = true
      nextVideo.autoplay = true
      nextVideo.preload = 'auto'
      nextVideo.controls = false
      nextVideo.disablePictureInPicture = true
      nextVideo.setAttribute('muted', '')
      nextVideo.setAttribute('playsinline', '')
      nextVideo.setAttribute('aria-hidden', 'true')
      nextVideo.tabIndex = -1
      nextVideo.style.position = 'absolute'
      nextVideo.style.width = '1px'
      nextVideo.style.height = '1px'
      nextVideo.style.opacity = '0'
      nextVideo.style.pointerEvents = 'none'
      nextVideo.style.clipPath = 'inset(100%)'
      ;(gl.domElement.parentElement ?? document.body).appendChild(nextVideo)
      nextVideo.onloadeddata = () => {
        if (cancelled || video !== nextVideo || nextVideoTexture) return
        clearLoadTimer()
        nextVideoTexture = new THREE.VideoTexture(nextVideo)
        nextVideoTexture.colorSpace = THREE.SRGBColorSpace
        nextVideoTexture.generateMipmaps = false
        nextVideoTexture.minFilter = THREE.LinearFilter
        nextVideoTexture.magFilter = THREE.LinearFilter
        nextVideoTexture.anisotropy = 4
        paintFormalRoomArtworkImage(texture, nextVideo, artwork.accent)
        videoRef.current = nextVideo
        motionLoadStatusRef.current = 'ready'
        setVideoSize([
          Math.max(1, nextVideo.videoWidth),
          Math.max(1, nextVideo.videoHeight),
        ])
        setVideoTexture(nextVideoTexture)
        setMotionSurface('video')
        reportMediaReadiness()
        if (!motionAllowedRef.current) {
          nextVideo.pause()
          publishMotionStatus('paused')
          return
        }
        void nextVideo.play()
          .then(() => publishMotionStatus('playing'))
          .catch(() => publishMotionStatus('paused'))
      }
      nextVideo.onerror = advanceAttempt
      loadTimer = window.setTimeout(advanceAttempt, ARTWORK_IMAGE_LOAD_TIMEOUT_MS)
      nextVideo.src = proxiedMotionUrl
      nextVideo.load()
    }

    function tryNextAttempt() {
      if (cancelled) return
      const attempt = attempts[attemptIndex]
      if (!attempt) {
        finishUnavailable()
        return
      }
      if (attempt === 'image') void tryDecodedImage()
      else tryVideo()
    }

    // In development, React intentionally mounts and cleans effects once before
    // the real mount. Starting media on the next task prevents that dry run from
    // leaving an aborted partial-video response in the browser media cache.
    startTimer = window.setTimeout(() => {
      startTimer = null
      tryNextAttempt()
    }, 0)
    return () => {
      cancelled = true
      if (startTimer !== null) window.clearTimeout(startTimer)
      clearLoadTimer()
      cleanImage()
      cleanDecoder()
      cleanVideo()
    }
  }, [animatedTexture, artwork.accent, artwork.animationKind, artwork.animationUrl, artwork.id, artwork.source, gl, onMediaStatus, publishMotionStatus, reportMediaReadiness, texture])

  useEffect(() => {
    if (motionLoadStatusRef.current !== 'ready') return
    const video = videoRef.current
    if (!motionAllowed) {
      video?.pause()
      publishMotionStatus('paused')
      return
    }
    if (!video) {
      publishMotionStatus('playing')
      return
    }
    const resume = () => {
      if (!motionAllowed) return
      void video.play()
        .then(() => publishMotionStatus('playing'))
        .catch(() => publishMotionStatus('paused'))
    }
    resume()
    gl.domElement.addEventListener('pointerdown', resume)
    return () => gl.domElement.removeEventListener('pointerdown', resume)
  }, [gl, motionAllowed, motionSurface, publishMotionStatus, videoTexture])

  useEffect(() => {
    if (!exploreMode && hovered) gl.domElement.style.cursor = 'pointer'
    return () => {
      if (!exploreMode) gl.domElement.style.cursor = 'default'
    }
  }, [exploreMode, gl, hovered])

  useFrame(({ clock }, delta) => {
    const nowMs = clock.elapsedTime * 1000
    if (
      motionSurface === 'decoded-image'
      && animatedTexture
      && imageDecoderRef.current
      && decodedFrameCountRef.current > 1
      && !decodedFramePendingRef.current
      && motionAllowed
      && nowMs >= decodedFrameDueAtRef.current
    ) {
      const decoder = imageDecoderRef.current
      const frameIndex = decodedFrameIndexRef.current
      decodedFramePendingRef.current = true
      void decoder.decode({ frameIndex, completeFramesOnly: true })
        .then(({ image: frame }) => {
          if (imageDecoderRef.current !== decoder) {
            frame.close()
            return
          }
          paintFormalRoomArtworkImage(animatedTexture, frame, artwork.accent)
          const frameDurationMs = Math.max(
            1000 / FORMAL_ROOM_ANIMATED_IMAGE_MAX_FPS,
            (frame.duration ?? 100_000) / 1000,
          )
          frame.close()
          decodedFrameIndexRef.current = (frameIndex + 1) % decodedFrameCountRef.current
          decodedFrameDueAtRef.current = nowMs + frameDurationMs
        })
        .catch(() => {
          if (imageDecoderRef.current !== decoder) return
          decoder.close()
          imageDecoderRef.current = null
          setMotionSurface(null)
          publishMotionStatus('unavailable')
        })
        .finally(() => {
          if (imageDecoderRef.current === decoder) decodedFramePendingRef.current = false
        })
    }
    if (
      motionSurface === 'image'
      && animatedTexture
      && animatedImageRef.current
      && shouldPaintFormalRoomAnimationFrame(nowMs, lastAnimatedPaintAtRef.current, motionAllowed)
    ) {
      paintFormalRoomArtworkImage(animatedTexture, animatedImageRef.current, artwork.accent)
      lastAnimatedPaintAtRef.current = nowMs
    }
    const group = groupRef.current
    if (!group) return
    const wanted = hovered || selected ? 1 : 0
    motionRef.current = reducedMotion ? wanted : damp(motionRef.current, wanted, 10, delta)
    const lift = motionRef.current * 0.07
    const breath = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.1 + index) * 0.004
    group.position.set(artwork.position[0], artwork.position[1] + lift, artwork.position[2] + motionRef.current * 0.11)
    const scale = 1 + motionRef.current * 0.022 + breath
    group.scale.setScalar(scale)
  })

  const handleEnter = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(true)
  }
  const handleLeave = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(false)
  }
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onSelect(index)
  }

  return (
    <group
      ref={groupRef}
      position={[...artwork.position]}
      userData={{ motionStatus }}
      onPointerOver={handleEnter}
      onPointerOut={handleLeave}
      onClick={handleClick}
    >
      <mesh position={[0, 0, -0.14]} scale={[width + 0.96, height + 0.92, 1]} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={artwork.accent} transparent opacity={selected ? 0.16 : hovered ? 0.1 : 0.035} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <ToonBox position={[0, 0, 0]} scale={[width + 0.48, height + 0.48, 0.2]} color={TEAK_DARK} outlineWidth={0.09} />
      <ToonBox position={[0, 0, 0.14]} scale={[width + 0.32, height + 0.32, 0.14]} color={BRASS} outlineWidth={0.035} emissive="#5d3a0d" emissiveIntensity={0.06} />
      <ToonBox position={[0, 0, 0.24]} scale={[width + 0.17, height + 0.17, 0.1]} color={PALE_CREAM} outlineWidth={0.028} />
      <mesh position={[0, 0, 0.31]} scale={[width, height, 1]} renderOrder={4}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {(motionSurface === 'image' || motionSurface === 'decoded-image') && animatedTexture && !reducedMotion ? (
        <mesh position={[0, 0, 0.316]} scale={[width, height, 1]} renderOrder={4}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={animatedTexture} toneMapped={false} />
        </mesh>
      ) : null}
      {motionSurface === 'video' && videoTexture && !reducedMotion ? (
        <mesh position={[0, 0, 0.317]} scale={[containedVideoSize[0], containedVideoSize[1], 1]} renderOrder={4}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={videoTexture} toneMapped={false} />
        </mesh>
      ) : null}
      <mesh position={[0, 0, 0.325]} scale={[width * 0.985, height * 0.985, 1]} renderOrder={5}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.025} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([horizontal, vertical]) => (
        <mesh
          key={`${horizontal}-${vertical}`}
          position={[horizontal * (width * 0.5 + 0.14), vertical * (height * 0.5 + 0.14), 0.29]}
          scale={[0.052, 0.052, 1]}
          renderOrder={6}
        >
          <circleGeometry args={[1, 16]} />
          <meshBasicMaterial color={CREAM} toneMapped={false} />
        </mesh>
      ))}

      <group position={[0, -height * 0.5 - 0.44, 0.06]}>
        <ToonBox position={[0, 0, 0]} scale={[Math.min(1.16, width * 0.72), 0.22, 0.12]} color={CREAM} outlineWidth={0.045} />
        <ToonBox position={[0, 0.072, 0.075]} scale={[Math.min(0.72, width * 0.48), 0.035, 0.035]} color={artwork.accent} outlineWidth={0.012} />
      </group>
      <PictureLamp x={0} y={height * 0.5 + 0.52} width={width} />
    </group>
  )
}

function FormalRoomScene({
  artworks,
  focusIndex,
  mode,
  walkInputRef,
  onSelect,
  onMediaStatus,
  onMotionStatus,
  motionPaused,
  reducedMotion,
  activeGalleryId,
  activeMuseumArea,
  onGalleryChange,
  onMuseumAreaChange,
  atriumInstallation,
  atriumInstallationAssets,
  atriumRegistryOpen,
  onOpenAtriumRegistry,
  onOpenCourtyard,
  onOpenBurnRoom,
}: {
  artworks: readonly FormalRoomArtwork[]
  focusIndex: FocusIndex
  mode: FormalRoomViewMode
  walkInputRef: MutableRefObject<FormalWalkInputState>
  onSelect: (index: number) => void
  onMediaStatus: (artworkId: string, status: ArtworkMediaStatus) => void
  onMotionStatus: (artworkId: string, status: ArtworkMotionStatus) => void
  motionPaused: boolean
  reducedMotion: boolean
  activeGalleryId: MuseumGalleryId
  activeMuseumArea: MuseumAreaId
  onGalleryChange: (galleryId: MuseumGalleryId) => void
  onMuseumAreaChange: (areaId: MuseumAreaId) => void
  atriumInstallation: AppliedAtriumInstallation | null
  atriumInstallationAssets: readonly MuseumAssetSummary[]
  atriumRegistryOpen: boolean
  onOpenAtriumRegistry: () => void
  onOpenCourtyard: () => void
  onOpenBurnRoom: () => void
}) {
  const residentColliders = useMemo(
    () => atriumResidentColliders(atriumInstallation ? atriumInstallation.glowbuds.length : 3),
    [atriumInstallation],
  )
  return (
    <>
      <color attach="background" args={['#91aaa0']} />
      <fog attach="fog" args={['#91aaa0', 28, 68]} />
      <SalonLighting active={activeMuseumArea === 'lobby'} />

      <FormalRoomCameraRig
        artworks={artworks}
        focusIndex={focusIndex}
        mode={mode}
        inputRef={walkInputRef}
        reducedMotion={reducedMotion}
        extraColliders={residentColliders}
        onGalleryChange={onGalleryChange}
        onMuseumAreaChange={onMuseumAreaChange}
      />
      <SalonArchitecture mode={mode} />
      <MuseumExpansion
        activeGalleryId={activeGalleryId}
        activeMuseumArea={activeMuseumArea}
        reducedMotion={reducedMotion}
        atriumInstallation={atriumInstallation}
        atriumInstallationAssets={atriumInstallationAssets}
        atriumInstallationPaused={atriumRegistryOpen}
        onOpenAtriumRegistry={onOpenAtriumRegistry}
        onOpenCourtyard={onOpenCourtyard}
        onOpenBurnRoom={onOpenBurnRoom}
      />
      {artworks.map((artwork, index) => (
        <FramedArtwork
          key={artwork.id}
          artwork={artwork}
          index={index}
          exploreMode={mode === 'explore'}
          selected={focusIndex === index}
          onSelect={onSelect}
          onMediaStatus={onMediaStatus}
          onMotionStatus={onMotionStatus}
          motionPaused={motionPaused}
          reducedMotion={reducedMotion}
        />
      ))}
      <DustMotes reducedMotion={reducedMotion} />
    </>
  )
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

type WalkHoldKey = 'forward' | 'backward' | 'strafeLeft' | 'strafeRight'

function MobileWalkButton({
  inputRef,
  walkKey,
  className,
  label,
  symbol,
}: {
  inputRef: MutableRefObject<FormalWalkInputState>
  walkKey: WalkHoldKey
  className: string
  label: string
  symbol: string
}) {
  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    inputRef.current[walkKey] = true
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const handlePointerRelease = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    inputRef.current[walkKey] = false
  }
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== ' ' && event.key !== 'Enter') return
    event.preventDefault()
    inputRef.current[walkKey] = true
  }
  const handleKeyUp = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== ' ' && event.key !== 'Enter') return
    event.preventDefault()
    inputRef.current[walkKey] = false
  }
  const handleAccessibleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) return
    inputRef.current[walkKey] = true
    window.setTimeout(() => {
      inputRef.current[walkKey] = false
    }, 180)
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerRelease}
      onPointerCancel={handlePointerRelease}
      onLostPointerCapture={handlePointerRelease}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={() => { inputRef.current[walkKey] = false }}
      onClick={handleAccessibleClick}
    >{symbol}</button>
  )
}

export function createFormalRoomWalletExhibition(
  nfts: readonly [OwnedNft, OwnedNft, OwnedNft],
): readonly FormalRoomArtwork[] {
  return nfts.map((nft, index) => {
    const slot = FORMAL_ROOM_ARTWORKS[index]
    return {
      ...slot,
      id: nft.tokenKey,
      title: nft.title,
      artist: nft.collection,
      year: 'Ethereum',
      imageUrl: nft.imageUrl ?? nft.thumbnailUrl ?? undefined,
      thumbnailUrl: nft.thumbnailUrl ?? undefined,
      animationUrl: nft.animationUrl ?? undefined,
      animationKind: nft.animationKind ?? 'unknown',
      openseaUrl: nft.openseaUrl,
      tokenKey: nft.tokenKey,
      source: 'wallet' as const,
    }
  })
}

export function FormalMuseumRoom() {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const [focusIndex, setFocusIndex] = useState<FocusIndex>(null)
  const mode: FormalRoomViewMode = 'explore'
  const [activeGalleryId, setActiveGalleryId] = useState<MuseumGalleryId>('lobby')
  const [activeMuseumArea, setActiveMuseumArea] = useState<MuseumAreaId>('lobby')
  const [museumMenuOpen, setMuseumMenuOpen] = useState(false)
  const [appliedArtworks, setAppliedArtworks] = useState<readonly FormalRoomArtwork[]>(FORMAL_ROOM_ARTWORKS)
  const [exhibitionPreview, setExhibitionPreview] = useState<ExhibitionPreview | null>(null)
  const [applyingPreview, setApplyingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [collectionDeskOpen, setCollectionDeskOpen] = useState(false)
  const [atriumRegistryOpen, setAtriumRegistryOpen] = useState(false)
  const [atriumInstallation, setAtriumInstallation] = useState<AppliedAtriumInstallation | null>(null)
  const [atriumInstallationAssets, setAtriumInstallationAssets] = useState<readonly MuseumAssetSummary[]>([])
  const [collectionAddress, setCollectionAddress] = useState<string | null>(null)
  const [appliedOwnerAddress, setAppliedOwnerAddress] = useState<string | null>(null)
  const [collectionToast, setCollectionToast] = useState<string | null>(null)
  const [artworkMediaStatus, setArtworkMediaStatus] = useState<Record<string, ArtworkMediaStatus>>({})
  const [artworkMotionStatus, setArtworkMotionStatus] = useState<Record<string, ArtworkMotionStatus>>({})
  const collectionButtonRef = useRef<HTMLButtonElement>(null)
  const museumMenuRef = useRef<HTMLDivElement>(null)
  const walkInputRef = useRef<FormalWalkInputState>(createFormalWalkInputState())
  const appliedOwnerRef = useRef<string | null>(null)
  const previewAddressRef = useRef<string | null>(null)
  const previewRevisionRef = useRef(0)
  const previewVerificationAbortRef = useRef<AbortController | null>(null)
  const displayArtworks = exhibitionPreview?.artworks ?? appliedArtworks
  const activeGallery = MUSEUM_GALLERY_BY_ID[activeGalleryId]
  const inAtrium = activeMuseumArea === 'atrium'
  const modalOpen = collectionDeskOpen || atriumRegistryOpen

  const handleArtworkMediaStatus = useCallback((artworkId: string, status: ArtworkMediaStatus) => {
    setArtworkMediaStatus((current) => current[artworkId] === status
      ? current
      : { ...current, [artworkId]: status })
  }, [])

  const handleArtworkMotionStatus = useCallback((artworkId: string, status: ArtworkMotionStatus) => {
    setArtworkMotionStatus((current) => current[artworkId] === status
      ? current
      : { ...current, [artworkId]: status })
  }, [])

  const handleGalleryChange = useCallback((galleryId: MuseumGalleryId) => {
    setActiveGalleryId((current) => current === galleryId ? current : galleryId)
  }, [])

  const handleMuseumAreaChange = useCallback((areaId: MuseumAreaId) => {
    setActiveMuseumArea((current) => current === areaId ? current : areaId)
  }, [])

  useEffect(() => () => clearFormalWalkInputState(walkInputRef.current), [])

  useEffect(() => () => previewVerificationAbortRef.current?.abort(), [])

  useEffect(() => {
    if (!collectionToast) return
    const timer = window.setTimeout(() => setCollectionToast(null), 4200)
    return () => window.clearTimeout(timer)
  }, [collectionToast])

  useEffect(() => {
    if (!museumMenuOpen) return
    const closeOutside = (event: PointerEvent) => {
      if (museumMenuRef.current?.contains(event.target as Node)) return
      setMuseumMenuOpen(false)
    }
    window.addEventListener('pointerdown', closeOutside)
    return () => window.removeEventListener('pointerdown', closeOutside)
  }, [museumMenuOpen])

  const selectArtwork = useCallback((index: number) => {
    if (walkInputRef.current.suppressArtworkClickUntil > performance.now()) return
    setFocusIndex(index)
  }, [])

  const requestJump = useCallback(() => {
    if (modalOpen) return
    walkInputRef.current.jumpRequested = true
  }, [modalOpen])

  const closeCollectionDesk = useCallback(() => {
    setCollectionDeskOpen(false)
  }, [])

  const openAtriumRegistry = useCallback(() => {
    clearFormalWalkInputState(walkInputRef.current)
    setCollectionDeskOpen(false)
    setFocusIndex(null)
    setMuseumMenuOpen(false)
    setCollectionToast(null)
    setAtriumRegistryOpen(true)
  }, [])

  const closeAtriumRegistry = useCallback(() => {
    setAtriumRegistryOpen(false)
  }, [])

  const openCourtyard = useCallback(() => {
    clearFormalWalkInputState(walkInputRef.current)
    setCollectionDeskOpen(false)
    setAtriumRegistryOpen(false)
    setMuseumMenuOpen(false)
    router.push('/courtyard')
  }, [router])

  const openBurnRoom = useCallback(() => {
    clearFormalWalkInputState(walkInputRef.current)
    setCollectionDeskOpen(false)
    setAtriumRegistryOpen(false)
    setMuseumMenuOpen(false)
    router.push('/burn-room')
  }, [router])

  const jumpToMainMuseum = useCallback(() => {
    clearFormalWalkInputState(walkInputRef.current)
    walkInputRef.current.travelRequested = MUSEUM_GALLERY_BY_ID.lobby.travelPose
    setFocusIndex(null)
    setMuseumMenuOpen(false)
  }, [])

  const openWallet = useCallback(() => {
    setMuseumMenuOpen(false)
    openAtriumRegistry()
  }, [openAtriumRegistry])

  const applyAtriumInstallation = useCallback((
    installation: AppliedAtriumInstallation,
    assets: readonly MuseumAssetSummary[],
  ) => {
    setAtriumInstallation(installation)
    setAtriumInstallationAssets(assets)
    setCollectionToast('Your personal atrium is installed for this visit.')
  }, [])

  const handleAtriumRegistryAddressChange = useCallback((address: `0x${string}` | null) => {
    setCollectionAddress(address)
    if (!atriumInstallation || atriumInstallation.address === address) return
    setAtriumInstallation(null)
    setAtriumInstallationAssets([])
    setCollectionToast(address
      ? 'Wallet changed, so the Museum Residents and curated atrium hang returned.'
      : 'Wallet disconnected, so the Museum Residents and curated atrium hang returned.')
  }, [atriumInstallation])

  const handleCollectionAddressChange = useCallback((nextAddress: string | null) => {
    setCollectionAddress(nextAddress)
    if (previewAddressRef.current && previewAddressRef.current !== nextAddress) {
      previewRevisionRef.current += 1
      previewAddressRef.current = null
      setExhibitionPreview(null)
      setPreviewError(null)
    }
    const currentOwner = appliedOwnerRef.current
    if (!currentOwner || currentOwner === nextAddress) return
    appliedOwnerRef.current = null
    setAppliedOwnerAddress(null)
    setAppliedArtworks(FORMAL_ROOM_ARTWORKS)
    setFocusIndex(null)
    setCollectionToast(nextAddress
      ? 'Wallet changed, so the room returned to its sample exhibition.'
      : 'Wallet disconnected, so the sample exhibition is back.')
  }, [])

  const previewWalletExhibition = useCallback((
    nfts: readonly [OwnedNft, OwnedNft, OwnedNft],
    address: string,
    source: CollectionAddressSource,
  ) => {
    const exhibition = createFormalRoomWalletExhibition(nfts)
    const revision = previewRevisionRef.current + 1
    previewRevisionRef.current = revision
    previewAddressRef.current = address
    setArtworkMediaStatus(Object.fromEntries(exhibition.map((artwork) => [artwork.id, 'loading' as const])))
    setExhibitionPreview({ address, artworks: exhibition, nfts, revision, source })
    setPreviewError(null)
    setCollectionAddress(address)
    setFocusIndex(null)
    setCollectionDeskOpen(false)
    setCollectionToast(null)
  }, [])

  const cancelExhibitionPreview = useCallback(() => {
    previewVerificationAbortRef.current?.abort()
    previewRevisionRef.current += 1
    previewAddressRef.current = null
    setExhibitionPreview(null)
    setApplyingPreview(false)
    setPreviewError(null)
    setFocusIndex(null)
    window.requestAnimationFrame(() => collectionButtonRef.current?.focus())
  }, [])

  const applyExhibitionPreview = useCallback(async () => {
    if (!exhibitionPreview || applyingPreview) return
    const mediaStatuses = exhibitionPreview.artworks.map((artwork) => artworkMediaStatus[artwork.id])
    if (mediaStatuses.some((status) => status !== 'ready')) return
    const controller = new AbortController()
    previewVerificationAbortRef.current?.abort()
    previewVerificationAbortRef.current = controller
    setApplyingPreview(true)
    setPreviewError(null)
    try {
      const result = await verifyOwnedSelection(exhibitionPreview.address, exhibitionPreview.nfts, controller.signal)
      if (
        controller.signal.aborted
        || previewAddressRef.current !== exhibitionPreview.address
        || previewRevisionRef.current !== exhibitionPreview.revision
      ) return
      if (!result.verified) {
        setPreviewError('Ownership changed. Return to the desk and choose three currently owned works.')
        return
      }
      appliedOwnerRef.current = exhibitionPreview.address
      previewRevisionRef.current += 1
      previewAddressRef.current = null
      setAppliedOwnerAddress(exhibitionPreview.address)
      setAppliedArtworks(exhibitionPreview.artworks)
      setExhibitionPreview(null)
      setFocusIndex(null)
      setCollectionToast(exhibitionPreview.source === 'wallet'
        ? 'Your three artworks are now hanging for this visit.'
        : `This wallet's three artworks are hanging for this visit.`)
      window.requestAnimationFrame(() => collectionButtonRef.current?.focus())
    } catch (error) {
      if (!controller.signal.aborted) {
        setPreviewError(error instanceof Error ? error.message : 'Ownership could not be checked. The room was not changed.')
      }
    } finally {
      if (previewVerificationAbortRef.current === controller) {
        previewVerificationAbortRef.current = null
        setApplyingPreview(false)
      }
    }
  }, [applyingPreview, artworkMediaStatus, exhibitionPreview])

  useEffect(() => {
    if (modalOpen) return
    const input = walkInputRef.current
    const setKey = (code: string, pressed: boolean) => {
      if (code === 'KeyW' || code === 'ArrowUp') input.forward = pressed
      else if (code === 'KeyS' || code === 'ArrowDown') input.backward = pressed
      else if (code === 'KeyA') input.strafeLeft = pressed
      else if (code === 'KeyD') input.strafeRight = pressed
      else if (code === 'ArrowLeft' || code === 'KeyQ') input.turnLeft = pressed
      else if (code === 'ArrowRight' || code === 'KeyE') input.turnRight = pressed
      else if (code === 'ShiftLeft' || code === 'ShiftRight') input.sprint = pressed
      else return false
      return true
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.code === 'Escape') {
        event.preventDefault()
        setMuseumMenuOpen(false)
        setFocusIndex(null)
        return
      }
      if (event.code === 'KeyR') {
        event.preventDefault()
        input.resetRequested = true
        return
      }
      if (event.code === 'Space') {
        event.preventDefault()
        if (!event.repeat) input.jumpRequested = true
        return
      }
      if (setKey(event.code, true)) event.preventDefault()
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      if (setKey(event.code, false)) event.preventDefault()
    }
    const clearInput = () => clearFormalWalkInputState(input)
    const handleVisibility = () => {
      if (document.hidden) clearInput()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', clearInput)
    window.addEventListener('orientationchange', clearInput)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', clearInput)
      window.removeEventListener('orientationchange', clearInput)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInput()
    }
  }, [modalOpen])

  const selectedArtwork = focusIndex === null ? null : displayArtworks[focusIndex]
  const selectedMotionStatus = selectedArtwork ? artworkMotionStatus[selectedArtwork.id] : undefined
  const selectedMotionCopy = selectedMotionStatus === 'playing'
    ? ' · Animated'
    : selectedMotionStatus === 'paused'
      ? ' · Motion paused'
      : selectedMotionStatus === 'loading'
        ? ' · Loading motion'
        : selectedMotionStatus === 'unavailable'
          ? ' · Animation unavailable'
          : ''
  const previewingExhibition = exhibitionPreview !== null
  const previewHasMediaError = exhibitionPreview?.artworks.some(
    (artwork) => artworkMediaStatus[artwork.id] === 'error',
  ) ?? false
  const previewPreparingMedia = exhibitionPreview?.artworks.some(
    (artwork) => artworkMediaStatus[artwork.id] !== 'ready' && artworkMediaStatus[artwork.id] !== 'error',
  ) ?? false
  const previewStatusCopy = previewError
    ?? (previewHasMediaError
      ? 'One artwork could not load. Return to the desk and choose another.'
      : previewPreparingMedia
        ? 'Preparing the high-resolution artwork…'
        : 'Look around, focus each frame, or explore before applying.')
  const previewApplyLabel = applyingPreview
    ? 'Checking…'
    : previewHasMediaError
      ? 'Artwork unavailable'
      : previewPreparingMedia
        ? 'Preparing artwork…'
        : 'Apply 3 artworks'
  const walletConnected = Boolean(collectionAddress || atriumInstallation?.address || appliedOwnerAddress)

  return (
    <main
      className={`${styles.room} ${styles.walking} ${previewingExhibition ? styles.previewing : ''} ${modalOpen ? styles.collectionDeskOpen : ''}`}
      aria-label="Museum of Based Art Main Museum"
      data-testid="formal-museum-room"
      data-room-mode={mode}
    >
      <div inert={modalOpen ? true : undefined} aria-hidden={modalOpen ? true : undefined}>
      <div
        className={styles.canvasWrap}
        aria-hidden="true"
      >
        <Canvas
          camera={{ position: [0, 0.7, 10], fov: 43, near: 0.1, far: 90 }}
          dpr={[1, 1.65]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          performance={{ min: 0.6 }}
          onPointerMissed={() => {
            if (!modalOpen) setFocusIndex(null)
          }}
        >
          <FormalRoomScene
            artworks={displayArtworks}
            focusIndex={focusIndex}
            mode={mode}
            walkInputRef={walkInputRef}
            onSelect={selectArtwork}
            onMediaStatus={handleArtworkMediaStatus}
            onMotionStatus={handleArtworkMotionStatus}
            motionPaused={modalOpen}
            reducedMotion={reducedMotion}
            activeGalleryId={activeGalleryId}
            activeMuseumArea={activeMuseumArea}
            onGalleryChange={handleGalleryChange}
            onMuseumAreaChange={handleMuseumAreaChange}
            atriumInstallation={atriumInstallation}
            atriumInstallationAssets={atriumInstallationAssets}
            atriumRegistryOpen={atriumRegistryOpen}
            onOpenAtriumRegistry={openAtriumRegistry}
            onOpenCourtyard={openCourtyard}
            onOpenBurnRoom={openBurnRoom}
          />
        </Canvas>
      </div>

      <Link href="/courtyard" className={styles.screenReaderOnly}>Open the courtyard</Link>
      <Link href="/burn-room" className={styles.screenReaderOnly}>Open the Burn Room</Link>

      <div className={styles.vignette} aria-hidden="true" />
      <div className={styles.minimalChrome}>
        <div ref={museumMenuRef} className={styles.museumMenuWrap}>
          <button
            type="button"
            className={`${styles.museumMenuButton} ${museumMenuOpen ? styles.museumMenuButtonOpen : ''}`}
            onClick={() => setMuseumMenuOpen((open) => !open)}
            aria-label="Open museum menu"
            aria-expanded={museumMenuOpen}
            aria-controls="museum-area-menu"
          >
            <span className={styles.menuGlyph} aria-hidden="true"><i /><i /><i /></span>
            <strong>Menu</strong>
          </button>
          {museumMenuOpen ? (
            <nav id="museum-area-menu" className={styles.museumMenuPanel} aria-label="Museum areas">
              <div className={styles.museumMenuBrand} aria-hidden="true"><span>MoBA</span><i /></div>
              <button type="button" onClick={jumpToMainMuseum} aria-current="page">
                <span aria-hidden="true">◇</span><strong>Main Museum</strong>
              </button>
              <button type="button" onClick={openCourtyard}>
                <span aria-hidden="true">☀</span><strong>Courtyard</strong>
              </button>
              <button type="button" onClick={openBurnRoom}>
                <span aria-hidden="true">▲</span><strong>Burn Room</strong>
              </button>
              <small className={styles.museumControlHint}>WASD · DRAG · SPACE</small>
            </nav>
          ) : null}
        </div>
        <button
          ref={collectionButtonRef}
          type="button"
          className={`${styles.walletButton} ${walletConnected ? styles.walletButtonReady : ''}`}
          onClick={openWallet}
          aria-label={walletConnected ? 'Open your personal atrium' : 'Connect wallet and build your atrium'}
          aria-expanded={atriumRegistryOpen}
        >
          <span className={styles.walletGlyph} aria-hidden="true">◇</span>
          <strong>{walletConnected ? 'My Atrium' : 'Connect Wallet'}</strong>
        </button>
      </div>

      {exhibitionPreview ? (
        <aside
          className={`${styles.previewWalkBadge} ${previewHasMediaError ? styles.previewWalkBadgeError : ''}`}
          aria-live="polite"
        >
          <span>
            <strong>{previewHasMediaError ? 'Artwork issue' : previewPreparingMedia ? 'Loading preview' : 'Your exhibition is ready'}</strong>
            <small>{previewStatusCopy}</small>
          </span>
          <span className={styles.previewMiniActions}>
            <button type="button" onClick={cancelExhibitionPreview}>Cancel</button>
            <button
              type="button"
              onClick={() => void applyExhibitionPreview()}
              disabled={applyingPreview || previewPreparingMedia || previewHasMediaError}
            >
              {previewApplyLabel}
            </button>
          </span>
        </aside>
      ) : null}

      {selectedArtwork ? (
        <div className={styles.walkArtworkHint} aria-live="polite">
          <span className={styles.focusSwatch} style={{ background: selectedArtwork.accent }} aria-hidden="true" />
          <span>
            <strong>{selectedArtwork.title}</strong>
            <small>{selectedArtwork.artist} · {selectedArtwork.year}{selectedMotionCopy}</small>
          </span>
        </div>
      ) : null}

      <div className={styles.walkCrosshair} aria-hidden="true" />
      <div className={styles.mobileWalkControls} aria-label="Mobile walking controls">
        <div className={styles.mobileDpad} role="group" aria-label="Press and hold to walk">
          <MobileWalkButton inputRef={walkInputRef} walkKey="forward" className={styles.walkForward} label="Walk forward" symbol="↑" />
          <MobileWalkButton inputRef={walkInputRef} walkKey="strafeLeft" className={styles.walkLeft} label="Step left" symbol="←" />
          <MobileWalkButton inputRef={walkInputRef} walkKey="strafeRight" className={styles.walkRight} label="Step right" symbol="→" />
          <MobileWalkButton inputRef={walkInputRef} walkKey="backward" className={styles.walkBackward} label="Walk backward" symbol="↓" />
        </div>
        <div className={styles.mobileLookGuide} aria-hidden="true">
          <span>↔</span>
          <strong>Drag room to look</strong>
        </div>
        <button type="button" className={styles.mobileJumpButton} onClick={requestJump} aria-label="Jump">
          <span aria-hidden="true">↟</span>
          <small>Jump</small>
        </button>
      </div>

      <span className={styles.modeAnnouncement} aria-live="polite">
        {`Museum walk. You are in ${inAtrium ? 'the Central Atrium' : activeGallery.title}.`}
      </span>

      {collectionToast ? (
        <aside className={styles.collectionToast} aria-live="polite">
          <span className={styles.noteIcon} aria-hidden="true">✓</span>
          <div>
            <strong>Personal atrium</strong>
            <p>{collectionToast}</p>
          </div>
        </aside>
      ) : null}

      </div>

      <CollectionDesk
        open={collectionDeskOpen}
        onClose={closeCollectionDesk}
        onPreview={previewWalletExhibition}
        onAddressChange={handleCollectionAddressChange}
      />
      <AtriumRegistryPanel
        open={atriumRegistryOpen}
        onClose={closeAtriumRegistry}
        onInstall={applyAtriumInstallation}
        onAddressChange={handleAtriumRegistryAddressChange}
      />
    </main>
  )
}
