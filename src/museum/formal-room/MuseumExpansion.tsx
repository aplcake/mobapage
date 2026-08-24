'use client'

import { useFrame, useLoader } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../render/OutlineMesh'
import { getToonRampTexture } from '../../shaders/toonRamp'
import {
  MUSEUM_ATRIUM_REAR_PASSAGE,
  MUSEUM_GALLERIES,
  MUSEUM_GALLERY_BY_ID,
  MUSEUM_LOOP_PORTALS,
  MOBA_GALLERY_WORKS,
  type MuseumAreaId,
  type MuseumGalleryId,
  type MuseumGalleryPlan,
} from './museumPlan'
import {
  MUSEUM_GALLERY_ATRIUM_PORTALS,
  MUSEUM_ATRIUM_COLUMN_ZS,
  MUSEUM_ATRIUM_COLUMN_VERTICALS,
  MUSEUM_ATRIUM_REAR_WALL_SEGMENTS,
  MUSEUM_GALLERY_BOUNDARY_CASING_DEPTH,
  MUSEUM_GALLERY_BOUNDARY_WALL_THICKNESS,
  MUSEUM_GALLERY_INTERIORS,
  MUSEUM_GALLERY_SIDE_WALL_CENTER_X,
  MUSEUM_GALLERY_SIDE_WALL_THICKNESS,
  MUSEUM_LOOP_WALL_RETURNS,
  MUSEUM_STRUCTURAL_SLABS,
  museumMobaOneParquetBoards,
  museumMobaTwoTerrazzoChips,
  HOLIDAY_CEILING_STAR_SPECS,
  HOLIDAY_GIFT_VITRINE_SPEC,
  HOLIDAY_RETURN_WREATH_SPEC,
  museumGalleryBoundaryOpening,
  museumGalleryBoundaryWallPanels,
  museumGalleryThresholdSignLayout,
  museumGalleryArtworkDisplays,
  museumGalleryAtriumPortalBounds,
  museumGalleryAtriumPortalCasing,
  museumGalleryBoundaryCasingZ,
  museumPhotographyIntroSignLayout,
  museumGalleryPortalReturns,
  museumGalleryWallPanels,
  museumGalleryWallOpenings,
  museumGalleryWindowIsAtriumTransom,
  museumGalleryZ,
  type MuseumArtworkDisplay,
  type MuseumFrameStyle,
  type MuseumGalleryInteriorPlan,
  type MuseumLoopWallReturnSpec,
  type MuseumSkylightSpec,
  type MuseumWindowSpec,
} from './museumGalleryDesign'
import {
  MUSEUM_ATRIUM_LIGHTING_PLAN,
  MUSEUM_GALLERY_LIGHTING_PLANS,
  MUSEUM_GALLERY_SURFACE_LIGHTING,
  type PermanentMuseumGalleryId,
} from './museumLighting'
import {
  MUSEUM_EXTERIOR_TREE_SPECS,
  MUSEUM_GALLERY_PLANT_SPECS,
  museumGalleryPlantLocalPosition,
  type MuseumExteriorTreeSpec,
  type MuseumGalleryPlantSpec,
} from './museumTreeDesign'
import {
  ATRIUM_REGISTRY_DEVICE_POSITION,
  ATRIUM_RESIDENT_SLOTS,
  ATRIUM_WALL_BAYS,
  ATRIUM_WALL_ART_FRAME_DEPTH,
  OPENING_SALON_MOBA_GALLERY_SLOTS,
  atriumArtworkFrameLayout,
  buildAtriumWallInstallation,
  selectedResidentAssets,
  type AtriumWallArtwork,
} from './atriumRegistryPlan'
import type {
  AppliedAtriumInstallation,
  MuseumAssetSummary,
} from '../collection-registry/museumAssetTypes'
import { glowbudAttributesForToken } from '../glowbuds/glowbudDisplayTraits'
import { GlowbudMuseumAvatar } from '../glowbuds/GlowbudMuseumAvatar'
import {
  createMuseumArtworkProvenance,
  MUSEUM_ARTWORK_USER_DATA_KEY,
  museumArtworkIdentityFromAsset,
} from './artworkProvenance'
import {
  MOBA_TWO_HEART_SCULPTURE_SPEC,
  mobaTwoHeartMotionAtPhase,
} from './mobaTwoHeartSculpture'
import { MonkeydhashyCreateboxInstallation } from './MonkeydhashyCreateboxInstallation'
import { PERSONAL_GALLERY_DOOR_SPEC } from './personalGalleryDoor'
import {
  MUSEUM_LORE_BY_ID,
  type MuseumLoreChapter,
  type MuseumLoreId,
} from './museumLore'
import {
  MuseumEvergreenSprig,
  MuseumExteriorTreeBotany,
  MuseumGalleryPlantBotany,
} from './MuseumBotanicalKit'

const INK = '#17131d'
const BRASS = '#d2a543'
const AGED_BRASS = '#a98c58'
const MUSEUM_OUTLINE_SCALE = 0.68
const MUSEUM_EMISSIVE_SCALE = 0.42
const TOON_RAMP = getToonRampTexture()
const MUSEUM_GALLERY_PLANTS_BY_ID = {
  'moba-one': MUSEUM_GALLERY_PLANT_SPECS.filter((spec) => spec.galleryId === 'moba-one'),
  'moba-two': MUSEUM_GALLERY_PLANT_SPECS.filter((spec) => spec.galleryId === 'moba-two'),
  photography: MUSEUM_GALLERY_PLANT_SPECS.filter((spec) => spec.galleryId === 'photography'),
  holiday: MUSEUM_GALLERY_PLANT_SPECS.filter((spec) => spec.galleryId === 'holiday'),
} satisfies Partial<Record<MuseumGalleryId, readonly MuseumGalleryPlantSpec[]>>
const PORTRAIT_WASH_SHAPE = new THREE.Shape()
PORTRAIT_WASH_SHAPE.moveTo(-0.18, 0.5)
PORTRAIT_WASH_SHAPE.lineTo(0.18, 0.5)
PORTRAIT_WASH_SHAPE.lineTo(0.5, -0.5)
PORTRAIT_WASH_SHAPE.lineTo(-0.5, -0.5)
PORTRAIT_WASH_SHAPE.closePath()
const FESTIVE_PAPER_STAR_SHAPE = new THREE.Shape()
Array.from({ length: 10 }).forEach((_, index) => {
  const angle = Math.PI / 2 + index * Math.PI / 5
  const radius = index % 2 === 0 ? 1 : 0.44
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  if (index === 0) FESTIVE_PAPER_STAR_SHAPE.moveTo(x, y)
  else FESTIVE_PAPER_STAR_SHAPE.lineTo(x, y)
})
FESTIVE_PAPER_STAR_SHAPE.closePath()

function createCartoonArchShape(width: number, height: number, archRise: number) {
  const shape = new THREE.Shape()
  const halfWidth = width * 0.5
  const halfHeight = height * 0.5
  const shoulderY = halfHeight - archRise
  shape.moveTo(-halfWidth, -halfHeight)
  shape.lineTo(halfWidth, -halfHeight)
  shape.lineTo(halfWidth, shoulderY)
  shape.bezierCurveTo(
    halfWidth,
    shoulderY + archRise * 0.52,
    halfWidth * 0.5,
    halfHeight,
    0,
    halfHeight,
  )
  shape.bezierCurveTo(
    -halfWidth * 0.5,
    halfHeight,
    -halfWidth,
    shoulderY + archRise * 0.52,
    -halfWidth,
    shoulderY,
  )
  shape.closePath()
  return shape
}

const PERSONAL_GALLERY_CASING_SHAPE = createCartoonArchShape(
  PERSONAL_GALLERY_DOOR_SPEC.casing.width,
  PERSONAL_GALLERY_DOOR_SPEC.casing.height,
  PERSONAL_GALLERY_DOOR_SPEC.casing.archRise,
)
const PERSONAL_GALLERY_BRASS_REVEAL_SHAPE = createCartoonArchShape(4.12, 4.3, 0.88)
const PERSONAL_GALLERY_RECESS_SHAPE = createCartoonArchShape(3.92, 4.16, 0.84)
const PERSONAL_GALLERY_LEAF_SHAPE = createCartoonArchShape(
  PERSONAL_GALLERY_DOOR_SPEC.leaf.width,
  PERSONAL_GALLERY_DOOR_SPEC.leaf.height,
  PERSONAL_GALLERY_DOOR_SPEC.leaf.archRise,
)
const PERSONAL_GALLERY_KEYHOLE_SHAPE = new THREE.Shape()
PERSONAL_GALLERY_KEYHOLE_SHAPE.moveTo(0, 0.14)
PERSONAL_GALLERY_KEYHOLE_SHAPE.bezierCurveTo(0.1, 0.14, 0.15, 0.075, 0.15, 0)
PERSONAL_GALLERY_KEYHOLE_SHAPE.bezierCurveTo(0.15, -0.07, 0.11, -0.11, 0.065, -0.14)
PERSONAL_GALLERY_KEYHOLE_SHAPE.lineTo(0.13, -0.34)
PERSONAL_GALLERY_KEYHOLE_SHAPE.lineTo(-0.13, -0.34)
PERSONAL_GALLERY_KEYHOLE_SHAPE.lineTo(-0.065, -0.14)
PERSONAL_GALLERY_KEYHOLE_SHAPE.bezierCurveTo(-0.11, -0.11, -0.15, -0.07, -0.15, 0)
PERSONAL_GALLERY_KEYHOLE_SHAPE.bezierCurveTo(-0.15, 0.075, -0.1, 0.14, 0, 0.14)
PERSONAL_GALLERY_KEYHOLE_SHAPE.closePath()
const WINTER_END_SWAG_CURVES = [
  new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5.05, 0, 0),
    new THREE.Vector3(-4.4, -0.16, 0),
    new THREE.Vector3(-3.74, 0, 0),
  ]),
  new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.74, 0, 0),
    new THREE.Vector3(4.4, -0.16, 0),
    new THREE.Vector3(5.05, 0, 0),
  ]),
] as const

type Vec3 = readonly [number, number, number]

function MuseumBox({
  position,
  scale,
  rotation = [0, 0, 0],
  color,
  outlineWidth = 0.04,
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
      outlineWidth={outlineWidth * MUSEUM_OUTLINE_SCALE}
      geometry={<boxGeometry args={[1, 1, 1]} />}
      material={(
        <meshToonMaterial
          color={color}
          gradientMap={TOON_RAMP}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity * MUSEUM_EMISSIVE_SCALE}
        />
      )}
    />
  )
}

/**
 * Large architectural surfaces deliberately meet or overlap at their edges so
 * daylight never leaks through the museum shell. They must not use OutlineMesh:
 * its enlarged back-face copy would intersect the neighbouring wall and create
 * a moving zipper pattern as the camera crosses the seam.
 */
function MuseumStructuralBox({
  position,
  scale,
  rotation = [0, 0, 0],
  color,
  emissive = '#000000',
  emissiveIntensity = 0,
}: {
  position: Vec3
  scale: Vec3
  rotation?: Vec3
  color: string
  emissive?: string
  emissiveIntensity?: number
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={[...scale]}
      userData={{ structuralSurface: 'seam-safe-toon-box' }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshToonMaterial
        color={color}
        gradientMap={TOON_RAMP}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity * MUSEUM_EMISSIVE_SCALE}
      />
    </mesh>
  )
}

function MuseumCylinder({
  position,
  scale,
  rotation = [0, 0, 0],
  color,
  outlineWidth = 0.04,
  emissive = '#000000',
  emissiveIntensity = 0,
  segments = 24,
}: {
  position: Vec3
  scale: Vec3
  rotation?: Vec3
  color: string
  outlineWidth?: number
  emissive?: string
  emissiveIntensity?: number
  segments?: number
}) {
  return (
    <OutlineMesh
      position={position}
      rotation={rotation}
      scale={[...scale]}
      outlineWidth={outlineWidth * MUSEUM_OUTLINE_SCALE}
      geometry={<cylinderGeometry args={[0.5, 0.5, 1, segments]} />}
      material={(
        <meshToonMaterial
          color={color}
          gradientMap={TOON_RAMP}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity * MUSEUM_EMISSIVE_SCALE}
        />
      )}
    />
  )
}

function MuseumSphere({
  position,
  scale,
  color,
  outlineWidth = 0.04,
  emissive = '#000000',
  emissiveIntensity = 0,
}: {
  position: Vec3
  scale: Vec3
  color: string
  outlineWidth?: number
  emissive?: string
  emissiveIntensity?: number
}) {
  return (
    <OutlineMesh
      position={position}
      scale={[...scale]}
      outlineWidth={outlineWidth * MUSEUM_OUTLINE_SCALE}
      geometry={<sphereGeometry args={[0.5, 20, 14]} />}
      material={(
        <meshToonMaterial
          color={color}
          gradientMap={TOON_RAMP}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity * MUSEUM_EMISSIVE_SCALE}
        />
      )}
    />
  )
}

function exteriorTreePalette(color: string) {
  const base = new THREE.Color(color)
  return [
    `#${base.clone().multiplyScalar(0.72).getHexString()}`,
    `#${base.getHexString()}`,
    `#${base.clone().lerp(new THREE.Color('#b9c48d'), 0.28).getHexString()}`,
  ] as const
}

function WinterPaperStar({
  position,
  scale,
  color,
  rotationY,
  rotationZ,
}: {
  position: Vec3
  scale: number
  color: string
  rotationY: number
  rotationZ: number
}) {
  const cordLength = 3.02 - position[1]
  return (
    <group userData={{ festiveDetail: 'folded-paper-star' }}>
      <MuseumCylinder
        position={[position[0], position[1] + cordLength * 0.5, position[2]]}
        scale={[0.014, cordLength, 0.014]}
        color="#9c8155"
        outlineWidth={0.003}
        segments={8}
      />
      <OutlineMesh
        position={[...position]}
        rotation={[0.04, rotationY, rotationZ]}
        scale={[scale, scale, scale]}
        outlineWidth={0.016}
        geometry={(
          <extrudeGeometry
            args={[FESTIVE_PAPER_STAR_SHAPE, {
              depth: 0.09,
              bevelEnabled: true,
              bevelSegments: 1,
              bevelSize: 0.025,
              bevelThickness: 0.025,
            }]}
          />
        )}
        material={<meshToonMaterial color={color} gradientMap={TOON_RAMP} />}
      />
    </group>
  )
}

function TargetedMuseumSpotlight({
  position,
  target,
  color,
  intensity,
  distance = 11,
  angle = 0.55,
  penumbra = 0.86,
}: {
  position: Vec3
  target: Vec3
  color: string
  intensity: number
  distance?: number
  angle?: number
  penumbra?: number
}) {
  const lightRef = useRef<THREE.SpotLight>(null)
  const [targetX, targetY, targetZ] = target
  const targetObject = useMemo(() => {
    const object = new THREE.Object3D()
    object.position.set(targetX, targetY, targetZ)
    return object
  }, [targetX, targetY, targetZ])

  useLayoutEffect(() => {
    if (lightRef.current) lightRef.current.target = targetObject
  }, [targetObject])

  return (
    <>
      <primitive object={targetObject} />
      <spotLight
        ref={lightRef}
        position={[...position]}
        color={color}
        intensity={intensity}
        distance={distance}
        angle={angle}
        penumbra={penumbra}
        decay={2}
        castShadow={false}
      />
    </>
  )
}

function createAtriumSunPatternTexture() {
  const width = 96
  const height = 192
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / (width - 1)
      const v = y / (height - 1)
      const diagonalU = u + (v - 0.5) * 0.18
      const dx = (diagonalU - 0.52) / 0.54
      const dy = (v - 0.52) / 0.52
      const radial = Math.max(0, Math.min(1, 1 - Math.hypot(dx, dy)))
      const feather = radial * radial * (3 - 2 * radial)
      const roofBay = Math.abs(Math.sin((v * 5.05 + u * 0.38) * Math.PI))
      const mullionShadow = 0.26 + roofBay * 0.74
      const softDapple = 0.9 + Math.sin((u * 6.4 + v * 4.2) * Math.PI) * 0.06
      const alpha = Math.round(235 * feather * mullionShadow * softDapple)
      const offset = (y * width + x) * 4
      data[offset] = 255
      data[offset + 1] = Math.round(218 + u * 18)
      data[offset + 2] = Math.round(150 + (1 - u) * 32)
      data[offset + 3] = alpha
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

function createAtriumSkyTexture() {
  const width = 96
  const height = 128
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / (width - 1)
      const v = y / (height - 1)
      const horizon = Math.pow(v, 1.25)
      const sunDistance = Math.hypot((u - 0.27) * 1.15, (v - 0.33) * 0.9)
      const sun = Math.max(0, 1 - sunDistance / 0.42) ** 2
      const cloud = Math.max(0, Math.sin((u * 2.8 + v * 1.15) * Math.PI)) * 0.035
      const offset = (y * width + x) * 4
      data[offset] = Math.min(255, Math.round(132 + horizon * 54 + sun * 62 + cloud * 255))
      data[offset + 1] = Math.min(255, Math.round(187 + horizon * 34 + sun * 45 + cloud * 210))
      data[offset + 2] = Math.min(255, Math.round(202 + horizon * 20 + sun * 24 + cloud * 160))
      data[offset + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

function AtriumDaylightEffects({ active }: { active: boolean }) {
  const sunPattern = useMemo(() => createAtriumSunPatternTexture(), [])
  const skyTexture = useMemo(() => createAtriumSkyTexture(), [])
  useEffect(() => () => {
    sunPattern.dispose()
    skyTexture.dispose()
  }, [skyTexture, sunPattern])
  return (
    <group userData={{ daylightEffect: 'soft-glass-roof-sun-pattern', animated: false }}>
      <mesh
        position={[0, 6.38, 20.55]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[18, 28, 1]}
        renderOrder={0}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={skyTexture} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh
        position={[0.8, -1.879, 20.65]}
        rotation={[-Math.PI / 2, 0, -0.18]}
        scale={[6.6, 9.7, 1]}
        renderOrder={2}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={sunPattern}
          transparent
          opacity={active ? 0.74 : 0.2}
          depthWrite={false}
          blending={THREE.NormalBlending}
          toneMapped
        />
      </mesh>
      {[
        { position: [-1.25, 1.05, 17.25] as Vec3, rotation: [0, -0.18, -0.46] as Vec3, scale: [3.9, 6.7, 1] as Vec3, opacity: 0.105 },
        { position: [1.55, 1.15, 24.15] as Vec3, rotation: [0, 0.2, 0.42] as Vec3, scale: [3.35, 6.35, 1] as Vec3, opacity: 0.075 },
      ].map((veil, index) => (
        <mesh
          key={index}
          position={[...veil.position]}
          rotation={[...veil.rotation]}
          scale={[...veil.scale]}
          renderOrder={1}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={sunPattern}
            transparent
            opacity={active ? veil.opacity : veil.opacity * 0.22}
            depthWrite={false}
            blending={THREE.NormalBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
      <MuseumBox
        position={[0, 5.13, 20.55]}
        scale={[0.055, 0.045, 21.86]}
        color="#f3deb0"
        outlineWidth={0.006}
        emissive="#ffe5b4"
        emissiveIntensity={active ? 0.18 : 0.07}
      />
      {([-1, 1] as const).map((side) => (
        <MuseumBox
          key={side}
          position={[side * 5.11, 3.47, 20.55]}
          scale={[0.045, 0.045, 21.72]}
          color={side < 0 ? '#cbe2dc' : '#f2dfb9'}
          outlineWidth={0.005}
          emissive={side < 0 ? '#d9f0ea' : '#ffe7b8'}
          emissiveIntensity={active ? 0.12 : 0.045}
        />
      ))}
    </group>
  )
}

function CourtyardTree({ spec }: { spec: MuseumExteriorTreeSpec }) {
  const palette = exteriorTreePalette(spec.color)
  return (
    <group
      position={[...spec.position]}
      rotation={[0, spec.yaw, 0]}
      scale={[spec.scale, spec.scale, spec.scale]}
      userData={{ museumTree: spec.id, treeFamily: 'faceted-exterior-garden' }}
    >
      <MuseumExteriorTreeBotany variant={spec.variant} palette={palette} />
    </group>
  )
}

function AtriumBench({ x }: { x: number }) {
  return (
    <group position={[x, -1.93, 19.55]}>
      <MuseumBox position={[0, 0.42, 0]} scale={[0.62, 0.26, 2.62]} color="#263b3c" outlineWidth={0.048} />
      <MuseumBox position={[-Math.sign(x) * 0.035, 0.62, 0]} scale={[0.5, 0.18, 2.38]} color="#c5a76d" outlineWidth={0.032} />
      {[-0.94, 0.94].map((z) => (
        <MuseumBox key={z} position={[0, 0.19, z]} scale={[0.42, 0.54, 0.18]} color="#263b3c" outlineWidth={0.03} />
      ))}
    </group>
  )
}

function AtriumMobile({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const mobileRef = useRef<THREE.Group>(null)
  useEffect(() => {
    if (active && !reducedMotion) return
    if (mobileRef.current) mobileRef.current.rotation.y = Math.PI * 0.08
  }, [active, reducedMotion])
  useFrame(({ clock }) => {
    if (!mobileRef.current || !active || reducedMotion) return
    mobileRef.current.rotation.y = clock.elapsedTime * 0.075
  })
  return (
    <group position={[0, 0, 19.55]}>
      <MuseumCylinder position={[0, 4.42, 0]} scale={[0.08, 1.72, 0.08]} color={BRASS} outlineWidth={0.018} segments={10} />
      <group ref={mobileRef} position={[0, 2.5, 0]} rotation={[0, Math.PI * 0.08, 0]} scale={[0.82, 0.82, 0.82]}>
        <OutlineMesh
          rotation={[Math.PI / 2, 0, 0]}
          outlineWidth={0.035}
          geometry={<torusGeometry args={[0.9, 0.08, 10, 32]} />}
          material={<meshToonMaterial color="#253f40" gradientMap={TOON_RAMP} />}
        />
        {[
          [-0.9, 0.16, 0, '#b78654', 0.48],
          [0.9, -0.08, 0, '#8b9c68', -0.48],
          [0, 0.48, -0.88, '#6f9b9a', 0.38],
          [0, -0.38, 0.88, '#c9c8ba', -0.38],
        ].map(([x, y, z, color, roll]) => (
          <group key={String(color)} position={[Number(x), Number(y), Number(z)]}>
            <MuseumBox
              position={[0, 0, 0]}
              scale={[0.66, 0.86, 0.18]}
              rotation={[0, Number(roll), Math.PI / 4]}
              color={String(color)}
              outlineWidth={0.05}
            />
            <MuseumCylinder position={[0, 0.72, 0]} scale={[0.04, 0.8, 0.04]} color={BRASS} outlineWidth={0.012} segments={8} />
          </group>
        ))}
        <MuseumSphere position={[0, -0.02, 0]} scale={[0.48, 0.48, 0.48]} color="#9a5b69" outlineWidth={0.055} />
      </group>
      <MuseumCylinder position={[0, -1.88, 0]} scale={[2.36, 0.035, 2.36]} color="#c9b98e" outlineWidth={0.025} segments={32} />
      <MuseumCylinder position={[0, -1.855, 0]} scale={[1.98, 0.018, 1.98]} color="#526d68" outlineWidth={0.018} segments={32} />
      <OutlineMesh
        position={[0, -1.835, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        outlineWidth={0.018}
        geometry={<torusGeometry args={[0.72, 0.075, 10, 32]} />}
        material={<meshToonMaterial color={BRASS} gradientMap={TOON_RAMP} />}
      />
    </group>
  )
}

function AtriumRearPassage() {
  const passage = MUSEUM_ATRIUM_REAR_PASSAGE
  const centerZ = MUSEUM_ATRIUM_REAR_WALL_SEGMENTS[0].z
  const clearWidth = passage.halfWidth * 2
  return (
    <group userData={{ rearAtriumPassage: true, clearWidth }}>
      {MUSEUM_ATRIUM_REAR_WALL_SEGMENTS.map((segment) => {
        const structuralFaceZ = segment.z - segment.depth * 0.5
        return (
        <group key={segment.id}>
          <MuseumStructuralBox
            position={[segment.x, 0.605, segment.z]}
            scale={[segment.width, 5.09, segment.depth]}
            color="#d7cfbc"
          />
          <MuseumStructuralBox
            position={[segment.x, 0.78, structuralFaceZ - 0.052]}
            scale={[segment.width - 0.24, 3.55, 0.08]}
            color="#eee5d1"
          />
          <MuseumStructuralBox
            position={[segment.x, -1.13, structuralFaceZ - 0.124]}
            scale={[segment.width - 0.16, 1.28, 0.04]}
            color="#314748"
          />
          <MuseumStructuralBox
            position={[segment.x, -0.43, structuralFaceZ - 0.171]}
            scale={[segment.width - 0.22, 0.09, 0.03]}
            color={BRASS}
          />
        </group>
        )
      })}
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <MuseumBox
            position={[side * (passage.halfWidth + 0.23), 0.62, centerZ]}
            scale={[0.38, 5.09, 0.7]}
            color="#d7cfbc"
            outlineWidth={0.045}
          />
          <MuseumBox
            position={[side * (passage.halfWidth + 0.23), -1.71, centerZ - 0.41]}
            scale={[0.66, 0.42, 0.08]}
            color="#263d3d"
            outlineWidth={0.035}
          />
        </group>
      ))}
      <MuseumBox position={[0, 2.825, centerZ]} scale={[clearWidth + 0.08, 0.65, 0.7]} color="#263d3d" outlineWidth={0.04} />
      <MuseumBox position={[0, -1.9, centerZ]} scale={[clearWidth, 0.04, passage.turn.z - passage.atrium.z + 0.35]} color="#d9d0b9" outlineWidth={0.014} />
      <MuseumBox position={[0, -1.87, centerZ]} scale={[0.055, 0.018, passage.turn.z - passage.atrium.z + 0.2]} color={AGED_BRASS} outlineWidth={0.008} />
    </group>
  )
}

function AtriumRegistryDevice({ onOpen }: { onOpen?: () => void }) {
  const [x, y, z] = ATRIUM_REGISTRY_DEVICE_POSITION
  return (
    <group
      position={[x, y, z]}
      rotation={[0, Math.PI / 2, 0]}
      onClick={(event) => {
        event.stopPropagation()
        onOpen?.()
      }}
      userData={{ device: 'atrium-registry', readOnly: true, existingPlanterFootprint: true }}
    >
      <MuseumBox position={[0, 0.18, 0]} scale={[0.5, 1.44, 0.7]} color="#493229" outlineWidth={0.04} />
      <MuseumBox position={[0, -0.61, 0]} scale={[0.62, 0.14, 0.82]} color="#283b37" outlineWidth={0.026} />
      <MuseumBox position={[0, 0.92, 0]} scale={[0.62, 0.12, 0.82]} color={AGED_BRASS} outlineWidth={0.022} />
      <MuseumBox position={[0.266, 0.31, 0]} scale={[0.045, 0.92, 0.52]} color="#efe1bf" outlineWidth={0.014} />
      <MuseumBox position={[0.292, 0.58, 0]} scale={[0.026, 0.28, 0.41]} color="#315c54" outlineWidth={0.009} />
      <MuseumBox position={[0.31, 0.58, 0]} scale={[0.018, 0.17, 0.3]} color="#95d3c2" outlineWidth={0.006} />
      <MuseumCylinder position={[0.3, 0.13, 0.19]} scale={[0.07, 0.055, 0.07]} rotation={[0, 0, Math.PI / 2]} color="#68c4b1" outlineWidth={0.012} segments={12} />
      <MuseumCylinder position={[0.3, -0.2, 0.19]} scale={[0.085, 0.065, 0.085]} rotation={[0, 0, Math.PI / 2]} color="#c69845" outlineWidth={0.012} segments={12} />
      <MuseumBox position={[0.3, -0.5, 0]} scale={[0.026, 0.05, 0.38]} color="#2d534e" outlineWidth={0.006} />
      <LoopSign
        kicker="READ ONLY"
        title="GARDEN REGISTRY"
        subtitle="Glowbuds + walls"
        accent="#69d0c0"
        background="#2b3834"
        position={[0.322, 1.09, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[0.96, 0.32]}
      />
    </group>
  )
}

function AtriumArtworkMedia({
  artwork,
  layout,
  animationIndex,
  onAspectRatio,
}: {
  artwork: AtriumWallArtwork
  layout: ReturnType<typeof atriumArtworkFrameLayout>
  animationIndex: number
  onAspectRatio: (aspectRatio: number) => void
}) {
  const poster = (
    <AtriumPosterBoundary
      poster={artwork.imageUrl}
      width={layout.mediaWidth}
      height={layout.mediaHeight}
      onAspectRatio={onAspectRatio}
    />
  )
  if (
    artwork.motionSheet
    && artwork.motionSheetColumns
    && artwork.motionSheetRows
    && artwork.motionFrameDurationMs
    && artwork.frameCount > 1
  ) {
    return (
      <Suspense fallback={poster}>
        <GalleryMotionSheetPlane
          artworkId={`atrium-${artwork.id}`}
          source={artwork.motionSheet}
          width={layout.mediaWidth}
          height={layout.mediaHeight}
          frameCount={artwork.frameCount}
          columns={artwork.motionSheetColumns}
          rows={artwork.motionSheetRows}
          frameDurationMs={artwork.motionFrameDurationMs}
          phaseFrames={animationIndex * 3}
          surfaceZ={0.145}
        />
      </Suspense>
    )
  }
  return (
    <>
      {poster}
      {artwork.animationUrl ? (
        <GalleryMotionPlane
          artworkId={`atrium-${artwork.id}`}
          source={artwork.animationUrl}
          width={layout.mediaWidth}
          height={layout.mediaHeight}
          featured={layout.outerWidth > 1.1}
          startDelayMs={animationIndex * 48}
          targetFps={6}
          surfaceZ={0.15}
        />
      ) : null}
    </>
  )
}

function AtriumPosterPlane({
  poster,
  width,
  height,
  onAspectRatio,
}: {
  poster: string
  width: number
  height: number
  onAspectRatio: (aspectRatio: number) => void
}) {
  const texture = usePosterTexture(poster)
  useEffect(() => {
    const image = texture.image as { width?: number; height?: number }
    if (image.width && image.height) onAspectRatio(image.width / image.height)
  }, [onAspectRatio, texture])
  return (
    <mesh position={[0, 0.04, 0.145]} scale={[width, height, 1]} renderOrder={5}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

function AtriumPosterBoundary(props: Parameters<typeof AtriumPosterPlane>[0]) {
  return (
    <Suspense fallback={(
      <MuseumBox
        position={[0, 0.04, 0.13]}
        scale={[props.width, props.height, 0.028]}
        color="#716c61"
        outlineWidth={0.01}
      />
    )}>
      <AtriumPosterPlane {...props} />
    </Suspense>
  )
}

function AtriumArtworkLabel({ artwork, layout }: { artwork: AtriumWallArtwork; layout: ReturnType<typeof atriumArtworkFrameLayout> }) {
  const texture = useMuseumSignTexture({
    kicker: artwork.source === 'personal' ? 'Your collection' : 'Museum collection',
    title: artwork.title.slice(0, 26),
    subtitle: artwork.collection.slice(0, 34),
  }, artwork.source === 'personal' ? '#83d2c3' : AGED_BRASS, '#293934')
  return (
    <group position={[0, layout.labelY, 0.1]}>
      <MuseumBox position={[0, 0, 0]} scale={[layout.labelWidth, 0.16, 0.04]} color="#5f513e" outlineWidth={0.009} />
      <mesh position={[0, 0, 0.025]} scale={[Math.max(0.3, layout.labelWidth - 0.06), 0.105, 1]} renderOrder={6}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  )
}

function AtriumWallFrame({ bay, artwork, animationIndex }: { bay: (typeof ATRIUM_WALL_BAYS)[number]; artwork: AtriumWallArtwork; animationIndex: number }) {
  const [aspectRatio, setAspectRatio] = useState(artwork.aspectRatio)
  const layout = atriumArtworkFrameLayout(bay, aspectRatio)
  const frameColor = artwork.source === 'personal' ? '#456d67' : '#4d3a32'
  const provenance = createMuseumArtworkProvenance({
    id: artwork.id,
    title: artwork.title,
    collection: artwork.collection,
    sourceUrl: artwork.sourceUrl,
    identity: artwork.identity ? museumArtworkIdentityFromAsset(artwork.identity) : undefined,
    ownerHint: artwork.ownerHint
      ? { address: artwork.ownerHint.address, label: artwork.ownerHint.label }
      : null,
  })
  return (
    <group
      position={[...bay.position]}
      rotation={[0, bay.rotationY, 0]}
      userData={{
        atriumWallBay: bay.id,
        source: artwork.source,
        artworkId: artwork.id,
        [MUSEUM_ARTWORK_USER_DATA_KEY]: provenance,
      }}
    >
      {bay.anchor ? (
        <mesh position={[0, 0.03, -0.025]} scale={[layout.outerWidth * 1.3, layout.outerHeight * 1.36, 1]} renderOrder={0}>
          <shapeGeometry args={[PORTRAIT_WASH_SHAPE]} />
          <meshBasicMaterial color="#f0d9ad" transparent opacity={0.032} depthWrite={false} />
        </mesh>
      ) : null}
      <MuseumBox position={[0, 0, 0]} scale={[layout.outerWidth, layout.outerHeight, ATRIUM_WALL_ART_FRAME_DEPTH]} color={frameColor} outlineWidth={0.022} />
      <MuseumBox position={[0, 0, 0.075]} scale={[layout.frameWidth, layout.frameHeight, 0.05]} color={AGED_BRASS} outlineWidth={0.01} />
      <MuseumBox position={[0, 0.04, 0.105]} scale={[layout.mediaWidth + 0.08, layout.mediaHeight + 0.08, 0.025]} color="#ece5d6" outlineWidth={0.006} />
      <AtriumArtworkMedia artwork={artwork} layout={layout} animationIndex={animationIndex} onAspectRatio={setAspectRatio} />
      <AtriumArtworkLabel artwork={artwork} layout={layout} />
      {bay.anchor ? <MuseumBox position={[0, layout.outerHeight * 0.5 + 0.07, 0.09]} scale={[Math.min(0.58, layout.outerWidth * 0.55), 0.038, 0.05]} color="#a98850" outlineWidth={0.006} /> : null}
    </group>
  )
}

function OpeningSalonMobaGalleryHang() {
  return (
    <group userData={{ collectionHang: 'moba-gallery', room: 'opening-salon', artworkCount: OPENING_SALON_MOBA_GALLERY_SLOTS.length }}>
      {OPENING_SALON_MOBA_GALLERY_SLOTS.map((slot, animationIndex) => {
        const work = MOBA_GALLERY_WORKS.find((candidate) => candidate.tokenId === slot.tokenId)
        if (!work) return null
        const artwork: AtriumWallArtwork = {
          id: `opening-salon-${work.id}`,
          title: work.title,
          collection: 'MoBA Gallery',
          sourceUrl: work.sourceUrl,
          imageUrl: work.poster,
          animationUrl: work.motion,
          motionSheet: work.motionSheet ?? null,
          motionSheetColumns: work.motionSheetColumns ?? null,
          motionSheetRows: work.motionSheetRows ?? null,
          motionFrameDurationMs: work.motionFrameDurationMs ?? null,
          frameCount: work.frameCount,
          aspectRatio: Math.max(0.45, Math.min(2, work.width / work.height)),
          source: 'museum',
        }
        const bay = {
          id: `opening-salon-${slot.id}`,
          side: slot.position[0] < 0 ? 'west' as const : 'east' as const,
          position: slot.position,
          rotationY: slot.rotationY,
          maxWidth: slot.maxWidth,
          maxHeight: slot.maxHeight,
          anchor: false,
        }
        return <AtriumWallFrame key={slot.id} bay={bay} artwork={artwork} animationIndex={animationIndex} />
      })}
    </group>
  )
}

function AtriumGlowbudGardenBeds() {
  return (
    <group userData={{ garden: 'glowbud-resident-beds', botanicalRhythm: 'clear-resident-display', flush: true }}>
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * 2.3, -1.9, 19.55]}>
          <MuseumBox position={[0, 0.025, 0]} scale={[1.08, 0.05, 9.45]} color="#354b3c" outlineWidth={0.01} />
          <MuseumBox position={[-side * 0.55, 0.045, 0]} scale={[0.08, 0.07, 9.55]} color="#bda779" outlineWidth={0.008} />
          <MuseumBox position={[side * 0.55, 0.045, 0]} scale={[0.08, 0.07, 9.55]} color="#bda779" outlineWidth={0.008} />
        </group>
      ))}
    </group>
  )
}

function AtriumResidentGlowbud({
  resident,
  index,
  paused,
  reducedMotion,
  museumResident,
  onSelect,
}: {
  resident: MuseumAssetSummary
  index: number
  paused: boolean
  reducedMotion: boolean
  museumResident: boolean
  onSelect?: (resident: MuseumAssetSummary) => void
}) {
  const [hovered, setHovered] = useState(false)
  const slot = ATRIUM_RESIDENT_SLOTS[index]
  const attributes = resident.attributes.length ? resident.attributes : glowbudAttributesForToken(resident.tokenId)

  useEffect(() => {
    if (!hovered) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered])

  if (!slot) return null
  return (
    <group
      position={[slot.position[0], slot.position[1], slot.position[2]]}
      rotation={[0, slot.yaw, 0]}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={(event) => {
        event.stopPropagation()
        setHovered(false)
      }}
      onClick={(event) => {
        event.stopPropagation()
        setHovered(false)
        onSelect?.(resident)
      }}
      userData={{
        atriumResident: resident.tokenId,
        museumResident,
        interaction: 'open-pixel-to-3d-study',
      }}
    >
      <mesh
        position={[0, 0.025, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={hovered}
        renderOrder={7}
      >
        <ringGeometry args={[0.57, 0.7, 40]} />
        <meshBasicMaterial
          color="#8fe3d8"
          transparent
          opacity={0.78}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <GlowbudMuseumAvatar
        tokenId={resident.tokenId}
        attributes={attributes}
        phase={index * 0.72}
        paused={paused}
        reducedMotion={reducedMotion}
      />
    </group>
  )
}

function AtriumPersonalInstallation({
  installation,
  assets,
  paused,
  reducedMotion,
  onSelectResident,
}: {
  installation: AppliedAtriumInstallation | null
  assets: readonly MuseumAssetSummary[]
  paused: boolean
  reducedMotion: boolean
  onSelectResident?: (resident: MuseumAssetSummary) => void
}) {
  const residents = selectedResidentAssets(installation, assets)
  const wallArtworks = buildAtriumWallInstallation(installation, assets)
  return (
    <group userData={{ atriumInstallation: installation ? 'personal' : 'museum-default', residentCount: residents.length, artworkCount: wallArtworks.length }}>
      <AtriumGlowbudGardenBeds />
      {ATRIUM_WALL_BAYS.map((bay, index) => {
        const artwork = wallArtworks[index]!
        return <AtriumWallFrame key={`${bay.id}-${artwork.id}`} bay={bay} artwork={artwork} animationIndex={index} />
      })}
      {residents.map((resident, index) => (
        <AtriumResidentGlowbud
          key={resident.key}
          resident={resident}
          index={index}
          paused={paused}
          reducedMotion={reducedMotion}
          museumResident={!installation}
          onSelect={onSelectResident}
        />
      ))}
    </group>
  )
}

function MuseumAtrium({
  active,
  reducedMotion,
  installation,
  installationAssets,
  installationPaused,
  onOpenRegistry,
  onSelectResident,
}: {
  active: boolean
  reducedMotion: boolean
  installation: AppliedAtriumInstallation | null
  installationAssets: readonly MuseumAssetSummary[]
  installationPaused: boolean
  onOpenRegistry?: () => void
  onSelectResident?: (resident: MuseumAssetSummary) => void
}) {
  const roofAngle = Math.atan2(1.72, 5.25)
  const roofSlope = Math.hypot(5.25, 1.72)
  const roofCenterZ = 20.55
  const roofDepth = 22.15
  const ribZs = [10.15, 14.55, 19.55, 24.75, 30.65]
  return (
    <group userData={{ environment: 'walkable-atrium', directGalleryPortals: 4 }}>
      <MuseumBox position={[0, -2.06, 20.55]} scale={[11.36, 0.22, 22.25]} color="#bdb6a4" outlineWidth={0.032} emissive="#e2d6bd" emissiveIntensity={active ? 0.06 : 0.012} />
      <MuseumBox position={[0, -1.925, 20.55]} scale={[2.72, 0.045, 21.7]} color="#d9d0b9" outlineWidth={0.016} emissive="#f2dfb9" emissiveIntensity={active ? 0.12 : 0.02} />
      <MuseumBox position={[0, -1.918, 13.25]} scale={[10.9, 0.045, 2.2]} color="#cfc7b3" outlineWidth={0.016} emissive="#f3dfb7" emissiveIntensity={active ? 0.1 : 0.018} />
      <MuseumBox position={[0, -1.918, 26.15]} scale={[10.9, 0.045, 2.2]} color="#d3cdbc" outlineWidth={0.016} emissive="#dceae5" emissiveIntensity={active ? 0.09 : 0.018} />
      <MuseumBox position={[-2.82, -1.895, 20.55]} scale={[0.045, 0.018, 21.25]} color={AGED_BRASS} outlineWidth={0.008} />
      <MuseumBox position={[2.82, -1.895, 20.55]} scale={[0.045, 0.018, 21.25]} color={AGED_BRASS} outlineWidth={0.008} />
      <MuseumBox position={[-2.73, -1.89, 13.25]} scale={[5.4, 0.018, 0.055]} color={AGED_BRASS} outlineWidth={0.008} />
      <MuseumBox position={[2.73, -1.89, 13.25]} scale={[5.4, 0.018, 0.055]} color={AGED_BRASS} outlineWidth={0.008} />
      <MuseumBox position={[-2.73, -1.89, 26.15]} scale={[5.4, 0.018, 0.055]} color={AGED_BRASS} outlineWidth={0.008} />
      <MuseumBox position={[2.73, -1.89, 26.15]} scale={[5.4, 0.018, 0.055]} color={AGED_BRASS} outlineWidth={0.008} />
      {[13.25, 26.15].map((z) => (
        <OutlineMesh
          key={z}
          position={[0, -1.865, z]}
          rotation={[Math.PI / 2, 0, 0]}
          outlineWidth={0.02}
          geometry={<torusGeometry args={[0.58, 0.065, 8, 32]} />}
          material={<meshToonMaterial color={BRASS} gradientMap={TOON_RAMP} />}
        />
      ))}

      {([-1, 1] as const).map((side) => (
        <group key={`roof-${side}`}>
          <mesh
            position={[side * 2.625, 4.4, roofCenterZ]}
            rotation={[-Math.PI / 2, 0, side * roofAngle]}
            scale={[roofSlope, roofDepth, 1]}
            renderOrder={1}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              color={side < 0 ? '#c7e0da' : '#f4ddb0'}
              transparent
              opacity={active ? 0.14 : 0.09}
              depthWrite={false}
              side={THREE.DoubleSide}
              toneMapped
            />
          </mesh>
          <MuseumBox position={[side * 5.25, 3.54, roofCenterZ]} scale={[0.18, 0.2, roofDepth + 0.42]} color="#253d3d" outlineWidth={0.035} />
        </group>
      ))}
      <MuseumBox position={[0, 5.27, roofCenterZ]} scale={[0.18, 0.22, roofDepth + 0.42]} color="#253d3d" outlineWidth={0.038} />
      {ribZs.flatMap((z) => ([-1, 1] as const).map((side) => (
        <MuseumBox
          key={`${z}-${side}`}
          position={[side * 2.62, 4.4, z]}
          scale={[roofSlope, 0.12, 0.14]}
          rotation={[0, 0, -side * roofAngle]}
          color="#2d4545"
          outlineWidth={0.026}
        />
      )))}
      {MUSEUM_ATRIUM_COLUMN_ZS.flatMap((z, index) => ([-1, 1] as const).map((side) => (
        <group key={`${side}-${z}`}>
          <MuseumBox
            position={[side * 5.42, MUSEUM_ATRIUM_COLUMN_VERTICALS.shaft.centerY, z]}
            scale={[0.34, MUSEUM_ATRIUM_COLUMN_VERTICALS.shaft.height, 0.34]}
            color={active ? '#e9dfcd' : '#d7cfbc'}
            outlineWidth={0.048}
            emissive="#f8e5c6"
            emissiveIntensity={active ? 0.14 : 0.025}
          />
          <MuseumBox position={[side * 5.42, MUSEUM_ATRIUM_COLUMN_VERTICALS.base.centerY, z]} scale={[0.62, MUSEUM_ATRIUM_COLUMN_VERTICALS.base.height, 0.62]} color="#263d3d" outlineWidth={0.04} />
          <MuseumBox position={[side * 5.42, MUSEUM_ATRIUM_COLUMN_VERTICALS.capital.centerY, z]} scale={[0.7, MUSEUM_ATRIUM_COLUMN_VERTICALS.capital.height, 0.7]} color={index % 2 ? '#c3a55e' : '#263d3d'} outlineWidth={0.04} />
        </group>
      )))}

      <AtriumDaylightEffects active={active} />
      <AtriumRegistryDevice onOpen={onOpenRegistry} />
      <AtriumBench x={-3.75} />
      <AtriumBench x={3.75} />
      <AtriumPersonalInstallation
        installation={installation}
        assets={installationAssets}
        reducedMotion={reducedMotion}
        paused={installationPaused}
        onSelectResident={onSelectResident}
      />
      <AtriumMobile active={active} reducedMotion={reducedMotion} />
      <AtriumRearPassage />

      {active ? (
        <group userData={{ lightingPlan: 'central-atrium', activeLights: MUSEUM_ATRIUM_LIGHTING_PLAN.length }}>
          {MUSEUM_ATRIUM_LIGHTING_PLAN.map((light) => (
            <TargetedMuseumSpotlight
              key={light.id}
              position={light.position}
              target={light.target}
              color={light.color}
              intensity={light.intensity}
              distance={light.distance}
              angle={light.angle}
              penumbra={light.penumbra}
            />
          ))}
        </group>
      ) : null}
    </group>
  )
}

function ExteriorSkyBackdrop({
  position,
  rotation = [0, 0, 0],
  scale,
  color,
}: {
  position: Vec3
  rotation?: Vec3
  scale: Vec3
  color: string
}) {
  return (
    <mesh position={[...position]} rotation={[...rotation]} scale={[...scale]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  )
}

function createMuseumDaylightSkyTexture() {
  const width = 64
  const height = 96
  const data = new Uint8Array(width * height * 4)
  const zenith = new THREE.Color('#78a5ad')
  const horizon = new THREE.Color('#f0e2c4')
  const cloud = new THREE.Color('#faf4df')
  const color = new THREE.Color()

  for (let y = 0; y < height; y += 1) {
    const vertical = y / (height - 1)
    const horizonMix = Math.pow(1 - vertical, 0.72)
    color.copy(zenith).lerp(horizon, horizonMix)

    for (let x = 0; x < width; x += 1) {
      const nx = x / (width - 1)
      const cloudBand = Math.exp(-Math.pow((vertical - 0.58) / 0.085, 2))
        * Math.max(0, Math.sin(nx * Math.PI * 3.2 + 0.45))
        * 0.11
      const sunHaze = Math.exp(-(
        Math.pow((nx - 0.72) / 0.18, 2)
        + Math.pow((vertical - 0.72) / 0.22, 2)
      )) * 0.16
      const pixel = color.clone().lerp(cloud, Math.min(0.22, cloudBand + sunHaze))
      const index = (y * width + x) * 4
      data[index] = Math.round(pixel.r * 255)
      data[index + 1] = Math.round(pixel.g * 255)
      data[index + 2] = Math.round(pixel.b * 255)
      data[index + 3] = 255
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

function DaylightSkyBackdrop({
  position,
  rotation = [0, 0, 0],
  scale,
}: {
  position: Vec3
  rotation?: Vec3
  scale: Vec3
}) {
  const texture = useMemo(() => createMuseumDaylightSkyTexture(), [])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <mesh
      position={[...position]}
      rotation={[...rotation]}
      scale={[...scale]}
      userData={{ exteriorLayer: 'photography-daylight-sky' }}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} color="#ffffff" side={THREE.DoubleSide} toneMapped />
    </mesh>
  )
}

function MuseumExteriorGrounds() {
  return (
    <group userData={{ exteriorDepthLayers: ['foreground', 'midground', 'sky'] }}>
      <MuseumBox position={[-22.1, -2.1, 19.5]} scale={[8.2, 0.2, 29.2]} color="#71866c" outlineWidth={0.025} />
      <MuseumBox position={[22.1, -2.1, 19.5]} scale={[8.2, 0.2, 29.2]} color="#627d72" outlineWidth={0.025} />
      <ExteriorSkyBackdrop position={[-28.1, 3.2, 19.5]} rotation={[0, Math.PI / 2, 0]} scale={[34, 14, 1]} color="#d8e5d8" />
      <DaylightSkyBackdrop position={[28.1, 3.2, 19.5]} rotation={[0, -Math.PI / 2, 0]} scale={[34, 14, 1]} />
      <MuseumSphere position={[27, 0.72, 12.4]} scale={[2.7, 4.4, 11.8]} color="#aab8b1" outlineWidth={0.012} />
      <MuseumSphere position={[26.85, 0.25, 27.4]} scale={[2.9, 3.7, 10.2]} color="#91aaa5" outlineWidth={0.012} />
      <MuseumSphere position={[-25.8, -0.6, 19.5]} scale={[4.2, 5.4, 20]} color="#78906f" outlineWidth={0.03} />
      <MuseumSphere position={[25.8, -0.7, 19.5]} scale={[4.5, 5.1, 20]} color="#738b86" outlineWidth={0.03} />
      {MUSEUM_EXTERIOR_TREE_SPECS
        .filter((spec) => spec.id.startsWith('west-garden') || spec.id.startsWith('east-garden'))
        .map((spec) => <CourtyardTree key={spec.id} spec={spec} />)}

      <MuseumBox position={[0, -2.1, -0.1]} scale={[26.6, 0.2, 6.6]} color="#7c8c68" outlineWidth={0.025} />
      <ExteriorSkyBackdrop position={[0, 3.3, -7.2]} scale={[34, 14, 1]} color="#f2d4a1" />
      <MuseumSphere position={[-8.2, -0.9, -3.8]} scale={[8.2, 4.5, 2.8]} color="#899368" outlineWidth={0.028} />
      <MuseumSphere position={[8.7, -0.8, -4.2]} scale={[9, 4.8, 2.6]} color="#74845f" outlineWidth={0.028} />
      {MUSEUM_EXTERIOR_TREE_SPECS
        .filter((spec) => spec.id.startsWith('entry-garden'))
        .map((spec) => <CourtyardTree key={spec.id} spec={spec} />)}
      <mesh position={[10.2, 3.8, -7.05]} scale={[0.72, 0.72, 1]}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color="#fff3c8" side={THREE.DoubleSide} />
      </mesh>

      <MuseumBox position={[0, -2.1, 40.1]} scale={[27.2, 0.2, 9.2]} color="#708b72" outlineWidth={0.025} />
      <DaylightSkyBackdrop position={[0, 3.4, 46.2]} scale={[35, 14, 1]} />
      <MuseumSphere position={[-8.4, 0.9, 44.55]} scale={[10.8, 4.3, 1.45]} color="#a8b6b0" outlineWidth={0.012} />
      <MuseumSphere position={[8.1, 0.45, 44.7]} scale={[11.8, 3.8, 1.35]} color="#8fa7a0" outlineWidth={0.012} />
      <MuseumSphere position={[-8.4, -0.8, 42.9]} scale={[9.4, 4.4, 3.2]} color="#66816c" outlineWidth={0.028} />
      <MuseumSphere position={[8.6, -0.9, 43.2]} scale={[10.2, 4.8, 3]} color="#778f72" outlineWidth={0.028} />
      {MUSEUM_EXTERIOR_TREE_SPECS
        .filter((spec) => spec.id.startsWith('rear-garden'))
        .map((spec) => <CourtyardTree key={spec.id} spec={spec} />)}
    </group>
  )
}

function usePersonalGalleryDoorSignTexture() {
  const [texture] = useState(() => {
    if (typeof document === 'undefined') return createFallbackTexture('#263d3d')
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 320
    const context = canvas.getContext('2d')
    if (!context) return createFallbackTexture('#263d3d')

    context.fillStyle = '#203736'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#2e4950'
    context.fillRect(22, 22, canvas.width - 44, canvas.height - 44)
    context.strokeStyle = '#b4935c'
    context.lineWidth = 9
    context.strokeRect(16, 16, canvas.width - 32, canvas.height - 32)
    context.strokeStyle = '#f2d897'
    context.lineWidth = 3
    context.strokeRect(38, 38, canvas.width - 76, canvas.height - 76)

    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = '#fff1cf'
    context.font = '700 78px Georgia, Times New Roman, serif'
    context.fillText('PERSONAL GALLERIES', canvas.width * 0.5, 125)
    context.fillStyle = '#d4b66f'
    context.fillRect(canvas.width * 0.5 - 64, 190, 128, 4)
    context.font = '700 31px Arial, Helvetica, sans-serif'
    drawMuseumTrackingText(context, 'COMING SOON', canvas.width * 0.5, 246, 8)

    const nextTexture = new THREE.CanvasTexture(canvas)
    nextTexture.colorSpace = THREE.SRGBColorSpace
    nextTexture.anisotropy = 8
    nextTexture.generateMipmaps = false
    nextTexture.minFilter = THREE.LinearFilter
    nextTexture.needsUpdate = true
    return nextTexture
  })

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function PersonalGalleryDoor() {
  const signTexture = usePersonalGalleryDoorSignTexture()
  const archGeometry = (shape: THREE.Shape, depth: number, bevelSize: number) => (
    <extrudeGeometry
      args={[shape, {
        depth,
        bevelEnabled: true,
        bevelSegments: 1,
        bevelSize,
        bevelThickness: bevelSize,
        curveSegments: 10,
      }]}
    />
  )

  return (
    <group
      position={[0, 0, -0.04]}
      userData={{
        lockedGalleryDoor: PERSONAL_GALLERY_DOOR_SPEC.id,
        label: PERSONAL_GALLERY_DOOR_SPEC.label,
        status: PERSONAL_GALLERY_DOOR_SPEC.status,
        interactive: false,
      }}
    >
      <MuseumStructuralBox position={[0, 0.62, 0.08]} scale={[4.58, 4.55, 0.3]} color="#5c6963" />
      <MuseumBox position={[-2.22, 0.36, -0.12]} scale={[0.34, 4.6, 0.42]} color="#304a48" outlineWidth={0.038} />
      <MuseumBox position={[2.22, 0.36, -0.12]} scale={[0.34, 4.6, 0.42]} color="#304a48" outlineWidth={0.038} />
      <MuseumBox position={[0, 2.66, -0.13]} scale={[4.78, 0.24, 0.46]} color="#304a48" outlineWidth={0.038} />

      <mesh position={[0, 0.28, -0.17]} renderOrder={1}>
        {archGeometry(PERSONAL_GALLERY_CASING_SHAPE, 0.2, 0.04)}
        <meshBasicMaterial color="#7dd8c8" transparent opacity={0.2} depthWrite={false} toneMapped={false} />
      </mesh>
      <OutlineMesh
        position={[0, 0.28, -0.23]}
        outlineWidth={0.034}
        geometry={archGeometry(PERSONAL_GALLERY_CASING_SHAPE, 0.18, 0.035)}
        material={<meshToonMaterial color="#263d3d" gradientMap={TOON_RAMP} />}
      />
      <OutlineMesh
        position={[0, 0.28, -0.3]}
        outlineWidth={0.026}
        geometry={archGeometry(PERSONAL_GALLERY_BRASS_REVEAL_SHAPE, 0.15, 0.025)}
        material={<meshToonMaterial color="#b4935c" gradientMap={TOON_RAMP} />}
      />
      <OutlineMesh
        position={[0, 0.28, -0.37]}
        outlineWidth={0.022}
        geometry={archGeometry(PERSONAL_GALLERY_RECESS_SHAPE, 0.13, 0.02)}
        material={<meshToonMaterial color="#131d21" gradientMap={TOON_RAMP} />}
      />
      <OutlineMesh
        position={[0, 0.28, -0.45]}
        outlineWidth={0.025}
        geometry={archGeometry(PERSONAL_GALLERY_LEAF_SHAPE, 0.12, 0.018)}
        material={(
          <meshToonMaterial
            color="#284b4c"
            gradientMap={TOON_RAMP}
            emissive="#243e47"
            emissiveIntensity={0.18}
          />
        )}
      />

      {([-1, 1] as const).flatMap((side) => ([
        { y: 0.85, height: 1.05, color: side < 0 ? '#31545a' : '#3b4b59' },
        { y: -0.64, height: 1.35, color: side < 0 ? '#3a4f54' : '#354555' },
      ].map((panel) => (
        <group key={`${side}-${panel.y}`} position={[side * 0.91, panel.y, -0.62]}>
          <MuseumBox position={[0, 0, 0]} scale={[1.35, panel.height, 0.09]} color="#172526" outlineWidth={0.02} />
          <MuseumBox position={[0, 0, -0.058]} scale={[1.14, panel.height - 0.18, 0.05]} color={panel.color} outlineWidth={0.012} emissive="#5ea49d" emissiveIntensity={0.08} />
          <MuseumBox position={[0, panel.height * 0.22, -0.098]} scale={[0.76, 0.04, 0.02]} color="#789992" outlineWidth={0.004} />
        </group>
      ))))}

      <MuseumBox position={[0, -0.26, -0.69]} scale={[0.04, 2.88, 0.04]} color="#9b8359" outlineWidth={0.006} emissive="#8fe3d8" emissiveIntensity={0.09} />
      <mesh position={[0, 1.54, -0.67]} rotation={[0, 0, Math.PI / 4]} scale={[0.2, 0.2, 1]} renderOrder={7}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#bdf6e9" transparent opacity={0.72} depthWrite={false} toneMapped={false} />
      </mesh>

      <OutlineMesh
        position={[0, -0.04, -0.77]}
        outlineWidth={0.022}
        geometry={<torusGeometry args={[0.43, 0.06, 10, 28]} />}
        material={<meshToonMaterial color="#d1aa5c" gradientMap={TOON_RAMP} emissive="#8b6a22" emissiveIntensity={0.16} />}
      />
      <MuseumCylinder position={[0, -0.04, -0.76]} rotation={[Math.PI / 2, 0, 0]} scale={[0.42, 0.12, 0.42]} color="#b4935c" outlineWidth={0.022} segments={28} />
      <MuseumCylinder position={[0, -0.04, -0.85]} rotation={[Math.PI / 2, 0, 0]} scale={[0.28, 0.08, 0.28]} color="#203637" outlineWidth={0.014} segments={24} emissive="#6bc8bd" emissiveIntensity={0.14} />
      <mesh position={[0, 0.015, -0.9]} rotation={[0, Math.PI, 0]} scale={[0.52, 0.52, 1]} renderOrder={9}>
        <shapeGeometry args={[PERSONAL_GALLERY_KEYHOLE_SHAPE]} />
        <meshBasicMaterial color="#0e1718" toneMapped={false} />
      </mesh>

      {([-1, 1] as const).map((side) => (
        <group key={`personal-gallery-sconce-${side}`} position={[side * 2.05, 0.92, -0.48]}>
          <MuseumCylinder position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.21, 0.08, 0.21]} color="#b4935c" outlineWidth={0.018} segments={18} />
          <MuseumBox position={[-side * 0.13, 0, -0.11]} rotation={[0, 0, side * 0.3]} scale={[0.27, 0.08, 0.08]} color="#b4935c" outlineWidth={0.012} />
          <MuseumSphere position={[-side * 0.25, 0.03, -0.16]} scale={[0.16, 0.2, 0.13]} color="#f4d994" outlineWidth={0.016} emissive="#ffe9a8" emissiveIntensity={0.45} />
        </group>
      ))}

      <MuseumBox position={[0, 2.63, -0.51]} scale={[3.82, 0.72, 0.15]} color="#b4935c" outlineWidth={0.026} />
      <MuseumBox position={[0, 2.63, -0.605]} scale={[3.62, 0.56, 0.08]} color="#203736" outlineWidth={0.014} />
      <mesh position={[0, 2.63, -0.655]} rotation={[0, Math.PI, 0]} scale={[3.48, 0.47, 1]} renderOrder={8}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={signTexture} toneMapped={false} />
      </mesh>
      {[-1.73, 1.73].map((x) => (
        <MuseumCylinder key={x} position={[x, 2.63, -0.7]} rotation={[Math.PI / 2, 0, 0]} scale={[0.04, 0.04, 0.026]} color="#f3daa0" outlineWidth={0.005} segments={12} />
      ))}

      <MuseumBox position={[0, -1.72, -0.38]} scale={[4.72, 0.22, 0.72]} color="#304a48" outlineWidth={0.032} />
      <MuseumBox position={[0, -1.58, -0.68]} scale={[3.92, 0.05, 0.72]} color="#c1a260" outlineWidth={0.014} emissive="#efd99c" emissiveIntensity={0.08} />
      <MuseumBox position={[0, -1.87, -1.02]} scale={[2.5, 0.025, 1.28]} color="#294542" outlineWidth={0.012} />
      <MuseumBox position={[0, -1.85, -1.02]} scale={[1.72, 0.018, 1.02]} color="#a88751" outlineWidth={0.008} />

      <pointLight position={[0, 0.55, -1.08]} color="#8fe3d8" intensity={1.2} distance={4.8} decay={2} />
    </group>
  )
}

function FarTurnPersonalGalleryFacade() {
  const panes = [-9.6, -4.8, 4.8, 9.6]
  return (
    <group position={[...PERSONAL_GALLERY_DOOR_SPEC.position]}>
      <MuseumBox position={[0, 3.03, 0]} scale={[25.34, 0.36, 0.32]} color="#53635e" outlineWidth={0.034} />
      <MuseumBox position={[0, -1.72, 0]} scale={[25.34, 0.34, 0.32]} color="#53635e" outlineWidth={0.034} />
      {[-12, -7.2, -2.4, 2.4, 7.2, 12].map((x) => (
        <MuseumBox key={x} position={[x, 0.62, 0]} scale={[0.22, 4.55, 0.3]} color="#65746e" outlineWidth={0.026} />
      ))}
      {([-1, 1] as const).map((side) => (
        <MuseumBox key={side} position={[side * 12.42, 0.62, 0]} scale={[0.36, 4.55, 0.32]} color="#53635e" outlineWidth={0.034} />
      ))}
      {panes.map((x) => (
        <group key={x}>
          <mesh position={[x, 0.62, -0.02]} scale={[4.35, 4.05, 1]} renderOrder={2}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#dce9e5" transparent opacity={0.045} depthWrite={false} side={THREE.DoubleSide} toneMapped />
          </mesh>
          <mesh position={[x - 0.9, 0.8, 0.03]} rotation={[0, 0, -0.34]} scale={[0.16, 3.5, 1]} renderOrder={3}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#f6edd5" transparent opacity={0.07} depthWrite={false} toneMapped />
          </mesh>
        </group>
      ))}
      <MuseumBox position={[0, 2.38, -0.16]} scale={[23.8, 0.06, 0.12]} color="#b8a986" outlineWidth={0.012} emissive="#f1e2bd" emissiveIntensity={0.16} />
      <PersonalGalleryDoor />
    </group>
  )
}

function useBurnRoomDoorSignTexture() {
  const [texture] = useState(() => {
    if (typeof document === 'undefined') return createFallbackTexture('#c2a15d')
    const canvas = document.createElement('canvas')
    canvas.width = 960
    canvas.height = 256
    const context = canvas.getContext('2d')
    if (!context) return createFallbackTexture('#c2a15d')

    context.fillStyle = '#292a2c'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = 'rgba(132, 57, 42, 0.22)'
    context.fillRect(18, 18, canvas.width - 36, canvas.height - 36)
    context.strokeStyle = '#b99555'
    context.lineWidth = 8
    context.strokeRect(14, 14, canvas.width - 28, canvas.height - 28)
    context.strokeStyle = 'rgba(255, 228, 168, 0.28)'
    context.lineWidth = 3
    context.strokeRect(31, 31, canvas.width - 62, canvas.height - 62)

    context.save()
    context.translate(112, 127)
    context.fillStyle = '#e2bb68'
    context.beginPath()
    context.moveTo(0, -62)
    context.bezierCurveTo(34, -28, 45, -2, 27, 27)
    context.bezierCurveTo(19, 41, 7, 51, 0, 57)
    context.bezierCurveTo(-34, 35, -45, 8, -27, -20)
    context.bezierCurveTo(-16, -4, -10, 4, -9, 16)
    context.bezierCurveTo(11, -6, 12, -30, 0, -62)
    context.fill()
    context.fillStyle = '#6f3429'
    context.beginPath()
    context.moveTo(1, -18)
    context.bezierCurveTo(18, 3, 17, 24, 0, 39)
    context.bezierCurveTo(-17, 23, -14, 5, 1, -18)
    context.fill()
    context.restore()

    context.fillStyle = '#fff0cf'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = '700 84px Georgia, Times New Roman, serif'
    context.fillText('BURN ROOM', 575, 132)

    const nextTexture = new THREE.CanvasTexture(canvas)
    nextTexture.colorSpace = THREE.SRGBColorSpace
    nextTexture.anisotropy = 8
    nextTexture.needsUpdate = true
    return nextTexture
  })

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function BurnRoomDoorAndWindow({ x, onOpen }: { x: number; onOpen?: () => void }) {
  const [hovered, setHovered] = useState(false)
  const signTexture = useBurnRoomDoorSignTexture()
  const iron = hovered ? '#565c5d' : '#424849'
  const enamel = hovered ? '#a75b43' : '#8b4938'
  const brass = hovered ? '#e0bd6d' : '#b69252'
  const windowCenterX = -1.5
  const doorCenterX = 1.28

  useEffect(() => () => {
    document.body.style.cursor = ''
  }, [])

  return (
    <group position={[x, 0.52, 3.39]} userData={{ burnRoomEntrance: true, retainedWindow: true }}>
      <MuseumBox position={[-2.82, 0, -0.12]} scale={[0.3, 4.18, 0.54]} color={iron} outlineWidth={0.04} />
      <MuseumBox position={[2.82, 0, -0.12]} scale={[0.3, 4.18, 0.54]} color={iron} outlineWidth={0.04} />
      <MuseumBox position={[0, 1.96, -0.12]} scale={[5.94, 0.3, 0.54]} color={iron} outlineWidth={0.04} />
      <MuseumBox position={[0, -1.96, -0.12]} scale={[5.94, 0.3, 0.54]} color={iron} outlineWidth={0.04} />
      <MuseumBox position={[-0.17, 0, -0.05]} scale={[0.22, 3.72, 0.42]} color={iron} outlineWidth={0.026} />

      <group position={[windowCenterX, 0.03, 0.04]} userData={{ burnRoomWindow: true, view: 'winter-garden' }}>
        <mesh position={[0, 0, -1.34]} scale={[2.34, 3.4, 1]} renderOrder={0}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#adc7c0" toneMapped />
        </mesh>
        <mesh position={[0, -1.1, -1.31]} scale={[2.34, 1.2, 1]} renderOrder={1}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#5e765e" toneMapped />
        </mesh>
        <MuseumBox position={[-0.73, -0.66, -0.78]} scale={[0.11, 1.45, 0.11]} color="#554132" outlineWidth={0.01} />
        <MuseumSphere position={[-0.76, 0.36, -0.78]} scale={[0.46, 0.72, 0.25]} color="#617a5d" outlineWidth={0.016} />
        <MuseumSphere position={[0.68, -0.02, -0.9]} scale={[0.68, 0.82, 0.27]} color="#73886a" outlineWidth={0.016} />
        <mesh position={[0, 0, -0.03]} scale={[2.32, 3.38, 1]} renderOrder={3}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#dcecee" transparent opacity={0.09} depthWrite={false} toneMapped />
        </mesh>
        <MuseumBox position={[-1.19, 0, 0.02]} scale={[0.14, 3.62, 0.18]} color={iron} outlineWidth={0.018} />
        <MuseumBox position={[1.19, 0, 0.02]} scale={[0.14, 3.62, 0.18]} color={iron} outlineWidth={0.018} />
        <MuseumBox position={[0, 1.74, 0.02]} scale={[2.5, 0.14, 0.18]} color={iron} outlineWidth={0.018} />
        <MuseumBox position={[0, -1.74, 0.02]} scale={[2.5, 0.14, 0.18]} color={iron} outlineWidth={0.018} />
        <MuseumBox position={[0, 0.16, 0.08]} scale={[2.34, 0.09, 0.12]} color={iron} outlineWidth={0.01} />
        <MuseumBox position={[0, 0, 0.08]} scale={[0.09, 3.4, 0.12]} color={iron} outlineWidth={0.01} />
        <mesh position={[-0.45, 0.34, 0.14]} rotation={[0, 0, -0.27]} scale={[0.1, 2.7, 1]} renderOrder={4}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#fff5d5" transparent opacity={0.09} depthWrite={false} toneMapped />
        </mesh>
        <MuseumBox position={[0, -1.89, 0.14]} scale={[2.66, 0.22, 0.68]} color={iron} outlineWidth={0.026} />
      </group>

      <group
        position={[doorCenterX, -0.02, 0.12]}
        userData={{ burnRoomDoor: true, href: '/burn-room', label: 'Burn Room' }}
        onClick={(event) => {
          event.stopPropagation()
          onOpen?.()
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = ''
        }}
      >
        <MuseumBox position={[-1.24, 0, 0]} scale={[0.2, 3.58, 0.34]} color={iron} outlineWidth={0.026} />
        <MuseumBox position={[1.24, 0, 0]} scale={[0.2, 3.58, 0.34]} color={iron} outlineWidth={0.026} />
        <MuseumBox position={[0, 1.69, 0]} scale={[2.62, 0.2, 0.34]} color={iron} outlineWidth={0.026} />
        <MuseumBox position={[0, -1.69, 0]} scale={[2.62, 0.2, 0.34]} color={iron} outlineWidth={0.026} />
        <MuseumBox position={[0, 0, 0.04]} scale={[2.28, 3.22, 0.22]} color={enamel} outlineWidth={0.03} emissive="#5e2d22" emissiveIntensity={hovered ? 0.3 : 0.2} />
        <MuseumBox position={[0, -1.14, 0.18]} scale={[1.86, 0.66, 0.08]} color="#743b30" outlineWidth={0.016} />
        <MuseumBox position={[0, -1.14, 0.24]} scale={[1.52, 0.38, 0.035]} color="#9a5440" outlineWidth={0.009} />
        <MuseumBox position={[0, -0.18, 0.18]} scale={[1.88, 0.72, 0.08]} color="#292c2d" outlineWidth={0.016} />
        <mesh position={[0, -0.18, 0.226]} scale={[1.72, 0.56, 1]} renderOrder={6}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={signTexture} toneMapped={false} />
        </mesh>
        <MuseumBox position={[0, -0.64, 0.2]} scale={[1.74, 0.055, 0.055]} color={brass} outlineWidth={0.008} />
        {[-0.91, 0.91].flatMap((horizontal) => [-1.37, 1.37].map((vertical) => (
          <MuseumCylinder
            key={`burn-room-rivet-${horizontal}-${vertical}`}
            position={[horizontal, vertical, 0.2]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[0.045, 0.045, 0.025]}
            color={brass}
            outlineWidth={0.006}
            segments={12}
          />
        )))}
        <MuseumBox position={[0.82, -0.22, 0.26]} scale={[0.085, 0.6, 0.1]} color={brass} outlineWidth={0.012} emissive="#6e4c18" emissiveIntensity={hovered ? 0.18 : 0.05} />
        <MuseumSphere position={[0.82, 0.12, 0.27]} scale={[0.11, 0.11, 0.085]} color={brass} outlineWidth={0.012} />
        <MuseumBox position={[0, 1.48, 0.2]} scale={[1.92, 0.06, 0.06]} color={brass} outlineWidth={0.008} />
        <mesh position={[0, 0, 0.29]} scale={[2.44, 3.46, 1]} renderOrder={9}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

function useCourtyardDoorSignTexture() {
  const [texture] = useState(() => {
    if (typeof document === 'undefined') return createFallbackTexture('#c7a85e')
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 280
    const context = canvas.getContext('2d')
    if (!context) return createFallbackTexture('#c7a85e')

    context.fillStyle = '#233f37'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = 'rgba(245, 235, 204, 0.055)'
    context.fillRect(24, 24, canvas.width - 48, canvas.height - 48)
    context.strokeStyle = '#b99a58'
    context.lineWidth = 9
    context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36)
    context.strokeStyle = 'rgba(255, 245, 211, 0.34)'
    context.lineWidth = 3
    context.strokeRect(36, 36, canvas.width - 72, canvas.height - 72)

    const iconX = 130
    const iconY = canvas.height * 0.5
    context.strokeStyle = '#f1d692'
    context.fillStyle = '#f1d692'
    context.lineWidth = 7
    context.beginPath()
    context.arc(iconX, iconY - 8, 31, 0, Math.PI * 2)
    context.stroke()
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4
      context.beginPath()
      context.moveTo(iconX + Math.cos(angle) * 45, iconY - 8 + Math.sin(angle) * 45)
      context.lineTo(iconX + Math.cos(angle) * 61, iconY - 8 + Math.sin(angle) * 61)
      context.stroke()
    }
    context.beginPath()
    context.moveTo(iconX, iconY + 54)
    context.quadraticCurveTo(iconX + 10, iconY + 23, iconX + 2, iconY + 5)
    context.stroke()

    context.fillStyle = '#fff3d2'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = '700 106px Georgia, Times New Roman, serif'
    context.fillText('COURTYARD', 690, 143)

    const nextTexture = new THREE.CanvasTexture(canvas)
    nextTexture.colorSpace = THREE.SRGBColorSpace
    nextTexture.anisotropy = 8
    nextTexture.needsUpdate = true
    return nextTexture
  })

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function CourtyardGardenDoor({ x, onOpen }: { x: number; onOpen?: () => void }) {
  const [hovered, setHovered] = useState(false)
  const signTexture = useCourtyardDoorSignTexture()
  const frame = hovered ? '#5c8a75' : '#4a7463'
  const brass = hovered ? '#e0c272' : '#b99a58'

  useEffect(() => () => {
    document.body.style.cursor = ''
  }, [])

  return (
    <group
      position={[x, 0.52, 3.39]}
      userData={{ courtyardDoor: true, href: '/courtyard', label: 'Courtyard' }}
      onClick={(event) => {
        event.stopPropagation()
        onOpen?.()
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = ''
      }}
    >
      <MuseumBox position={[-2.82, 0, -0.12]} scale={[0.3, 4.18, 0.54]} color={frame} outlineWidth={0.04} />
      <MuseumBox position={[2.82, 0, -0.12]} scale={[0.3, 4.18, 0.54]} color={frame} outlineWidth={0.04} />
      <MuseumBox position={[0, 1.96, -0.12]} scale={[5.94, 0.3, 0.54]} color={frame} outlineWidth={0.04} />
      <MuseumBox position={[0, -1.96, -0.12]} scale={[5.94, 0.3, 0.54]} color={frame} outlineWidth={0.04} />

      <mesh position={[0, 0, -1.46]} scale={[5.38, 3.62, 1]} renderOrder={0}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#a8c8b9" toneMapped />
      </mesh>
      <mesh position={[0, -1.18, -1.43]} scale={[5.38, 1.22, 1]} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#607c61" toneMapped />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <group key={`courtyard-door-garden-${side}`} position={[side * 2.12, -1.34, -0.72]}>
          <group position={[0, 0.12, 0]} scale={[0.48, 0.48, 0.4]} rotation={[0, side * 0.34, 0]}>
            <MuseumExteriorTreeBotany
              variant={side < 0 ? 0 : 1}
              compact
              palette={side < 0
                ? ['#486d55', '#64805e', '#8fa174']
                : ['#4e725b', '#718d68', '#98a778']}
            />
          </group>
        </group>
      ))}

      {([-1, 1] as const).map((side) => (
        <group key={`courtyard-door-leaf-${side}`} position={[side * 0.78, -0.16, 0.14]}>
          <MuseumBox position={[-0.67, 0, 0]} scale={[0.16, 3.34, 0.18]} color={frame} outlineWidth={0.024} />
          <MuseumBox position={[0.67, 0, 0]} scale={[0.16, 3.34, 0.18]} color={frame} outlineWidth={0.024} />
          <MuseumBox position={[0, 1.59, 0]} scale={[1.5, 0.16, 0.18]} color={frame} outlineWidth={0.024} />
          <MuseumBox position={[0, -0.34, 0]} scale={[1.5, 0.16, 0.18]} color={frame} outlineWidth={0.024} />
          <mesh position={[0, 0.59, 0.115]} scale={[1.14, 1.62, 1]} renderOrder={4}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#e2f2e8" transparent opacity={0.17} depthWrite={false} toneMapped />
          </mesh>
          <MuseumBox position={[0, -1.02, 0.06]} scale={[1.18, 1.2, 0.1]} color="#5b856f" outlineWidth={0.014} emissive="#355b4d" emissiveIntensity={0.08} />
          <MuseumBox position={[0, -1.02, 0.13]} scale={[0.88, 0.78, 0.035]} color="#6c987f" outlineWidth={0.008} />
          <MuseumBox position={[-side * 0.52, -0.76, 0.28]} scale={[0.08, 0.54, 0.09]} color={brass} outlineWidth={0.012} emissive="#80601e" emissiveIntensity={hovered ? 0.18 : 0.06} />
          <MuseumSphere position={[-side * 0.52, -0.43, 0.29]} scale={[0.105, 0.105, 0.08]} color={brass} outlineWidth={0.012} />
        </group>
      ))}
      <MuseumBox position={[0, -0.16, 0.3]} scale={[0.12, 3.36, 0.08]} color={frame} outlineWidth={0.014} />

      {([-1, 1] as const).map((side) => (
        <group key={`courtyard-door-sidelight-${side}`} position={[side * 2.18, 0.05, 0.12]}>
          <MuseumBox position={[-0.49, 0, 0]} scale={[0.14, 3.18, 0.14]} color={frame} outlineWidth={0.018} />
          <MuseumBox position={[0.49, 0, 0]} scale={[0.14, 3.18, 0.14]} color={frame} outlineWidth={0.018} />
          <MuseumBox position={[0, 1.52, 0]} scale={[1.12, 0.14, 0.14]} color={frame} outlineWidth={0.018} />
          <MuseumBox position={[0, -1.2, 0]} scale={[1.12, 0.14, 0.14]} color={frame} outlineWidth={0.018} />
          <mesh position={[0, 0.24, 0.085]} scale={[0.84, 2.38, 1]} renderOrder={3}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#e2f2e8" transparent opacity={0.14} depthWrite={false} toneMapped />
          </mesh>
          <MuseumBox position={[0, -1.41, 0.06]} scale={[0.86, 0.3, 0.06]} color="#47715f" outlineWidth={0.009} />
        </group>
      ))}

      <MuseumBox position={[0, 1.67, 0.12]} scale={[5.18, 0.36, 0.16]} color={frame} outlineWidth={0.026} />
      <mesh position={[0, 1.68, 0.215]} scale={[4.74, 0.2, 1]} renderOrder={4}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#edf4dd" transparent opacity={0.42} depthWrite={false} toneMapped />
      </mesh>
      {[-1.65, -0.82, 0, 0.82, 1.65].map((offset) => (
        <MuseumBox key={`courtyard-transom-${offset}`} position={[offset, 1.68, 0.23]} scale={[0.055, 0.22, 0.06]} color={brass} outlineWidth={0.007} />
      ))}
      <MuseumCylinder position={[0, 1.68, 0.245]} rotation={[Math.PI / 2, 0, 0]} scale={[0.12, 0.12, 0.055]} color="#f0cb68" outlineWidth={0.012} segments={20} emissive="#ffe3a0" emissiveIntensity={hovered ? 0.26 : 0.1} />

      <group position={[0, 0.06, 0.35]} userData={{ courtyardDoorLabel: 'COURTYARD', copyLines: 1 }}>
        <MuseumBox position={[0, 0, 0]} scale={[2.58, 0.62, 0.16]} color={brass} outlineWidth={0.024} />
        <MuseumBox position={[0, 0, 0.1]} scale={[2.4, 0.48, 0.07]} color="#233f37" outlineWidth={0.012} />
        <mesh position={[0, 0, 0.146]} scale={[2.28, 0.42, 1]} renderOrder={7}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={signTexture} toneMapped={false} />
        </mesh>
        {[-1.12, 1.12].map((offset) => (
          <MuseumCylinder key={`courtyard-label-fastener-${offset}`} position={[offset, 0, 0.19]} rotation={[Math.PI / 2, 0, 0]} scale={[0.04, 0.04, 0.025]} color="#f2d789" outlineWidth={0.006} segments={12} />
        ))}
      </group>

      <MuseumBox position={[0, -2.08, 0.16]} scale={[6.3, 0.22, 0.72]} color={frame} outlineWidth={0.032} />
      <MuseumBox position={[0, -1.94, 0.45]} scale={[3.36, 0.045, 0.7]} color={brass} outlineWidth={0.014} />
      <mesh position={[0, 0, 0.43]} scale={[5.46, 3.72, 1]} renderOrder={9}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
      </mesh>
    </group>
  )
}

function createFallbackTexture(color: string) {
  const threeColor = new THREE.Color(color)
  const texture = new THREE.DataTexture(
    new Uint8Array([
      Math.round(threeColor.r * 255),
      Math.round(threeColor.g * 255),
      Math.round(threeColor.b * 255),
      255,
    ]),
    1,
    1,
    THREE.RGBAFormat,
  )
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

type MuseumSignDirection = 'left' | 'right' | 'ahead' | 'none'

type MuseumSignCopy = {
  kicker: string
  title: string
  subtitle: string
  direction?: MuseumSignDirection
}

function fitMuseumSignFont(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  family: string,
) {
  let size = maxSize
  do {
    context.font = `900 ${size}px ${family}`
    if (context.measureText(text).width <= maxWidth) return size
    size -= 2
  } while (size >= minSize)
  return minSize
}

function drawMuseumTrackingText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  tracking: number,
) {
  const glyphs = [...text]
  const widths = glyphs.map((glyph) => context.measureText(glyph).width)
  const width = widths.reduce((total, glyphWidth) => total + glyphWidth, 0)
    + Math.max(0, glyphs.length - 1) * tracking
  let x = centerX - width * 0.5
  context.textAlign = 'left'
  glyphs.forEach((glyph, index) => {
    context.fillText(glyph, x, y)
    x += widths[index] + tracking
  })
  context.textAlign = 'center'
}

function drawMuseumSign(
  context: CanvasRenderingContext2D,
  copy: MuseumSignCopy,
  accent: string,
  background: string,
) {
  const width = context.canvas.width
  const height = context.canvas.height
  const direction = copy.direction ?? 'none'
  const hasDirection = direction !== 'none'
  const textCenterX = hasDirection ? width * 0.45 : width * 0.5
  const textMaxWidth = hasDirection ? width * 0.7 : width * 0.84

  // Quiet enamel wayfinding: the lettering should orient visitors, not compete
  // with the exhibition. The 3D aged-brass surround supplies the physical frame.
  context.fillStyle = background
  context.fillRect(0, 0, width, height)
  context.fillStyle = 'rgba(255, 248, 226, 0.055)'
  context.fillRect(24, 24, width - 48, height - 48)
  context.strokeStyle = AGED_BRASS
  context.lineWidth = 6
  context.strokeRect(18, 18, width - 36, height - 36)
  context.strokeStyle = 'rgba(255, 241, 201, 0.24)'
  context.lineWidth = 2
  context.strokeRect(34, 34, width - 68, height - 68)

  context.textBaseline = 'middle'
  context.textAlign = 'center'
  context.fillStyle = '#d9c8a0'
  context.font = '700 25px Arial, Helvetica, sans-serif'
  drawMuseumTrackingText(context, copy.kicker.toUpperCase(), textCenterX, 79, 6)

  const title = copy.title
  const titleSize = fitMuseumSignFont(
    context,
    title,
    textMaxWidth,
    102,
    55,
    'Georgia, Times New Roman, serif',
  )
  context.font = `700 ${titleSize}px Georgia, Times New Roman, serif`
  context.fillStyle = '#fff4d6'
  context.fillText(title, textCenterX, 194)

  context.fillStyle = accent
  context.fillRect(textCenterX - 44, 263, 88, 3)

  const subtitle = copy.subtitle
  const subtitleSize = fitMuseumSignFont(
    context,
    subtitle,
    textMaxWidth,
    36,
    23,
    'Arial, Helvetica, sans-serif',
  )
  context.font = `500 ${subtitleSize}px Arial, Helvetica, sans-serif`
  context.fillStyle = '#ded4bc'
  context.fillText(subtitle, textCenterX, 330)

  if (hasDirection) {
    const arrow = direction === 'left' ? '←' : direction === 'right' ? '→' : '↑'
    const arrowX = width - 128
    context.fillStyle = AGED_BRASS
    context.font = '400 88px Georgia, Times New Roman, serif'
    context.fillText(arrow, arrowX, height * 0.5 - 1)
  }
}

function useMuseumSignTexture(copy: MuseumSignCopy, accent: string, background: string) {
  const { kicker, title, subtitle, direction = 'none' } = copy
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return createFallbackTexture(accent)
    const canvas = document.createElement('canvas')
    canvas.width = 1536
    canvas.height = 432
    const context = canvas.getContext('2d')
    if (!context) return createFallbackTexture(accent)
    drawMuseumSign(context, { kicker, title, subtitle, direction }, accent, background)

    const nextTexture = new THREE.CanvasTexture(canvas)
    nextTexture.colorSpace = THREE.SRGBColorSpace
    nextTexture.anisotropy = 8
    nextTexture.needsUpdate = true
    return nextTexture
  }, [accent, background, direction, kicker, subtitle, title])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function useGallerySignTexture(gallery: MuseumGalleryPlan) {
  return useMuseumSignTexture({
    kicker: gallery.eyebrow,
    title: gallery.shortTitle,
    subtitle: gallery.title,
  }, gallery.accent, gallery.trim)
}

function GalleryThreshold({ gallery }: { gallery: MuseumGalleryPlan }) {
  const texture = useGallerySignTexture(gallery)
  const isPortraitSalon = gallery.id === 'moba-one'
  const isPhotographyGallery = gallery.id === 'photography'
  const isHolidayGallery = gallery.id === 'holiday'
  const frameColor = isPhotographyGallery ? '#78857e' : isPortraitSalon ? '#4b332e' : gallery.trim
  const z = gallery.minZ + 0.08
  const casingZ = museumGalleryBoundaryCasingZ(z)
  const opening = museumGalleryBoundaryOpening(gallery, 'threshold')
  const wallPanels = museumGalleryBoundaryWallPanels(gallery, 'threshold')
  const plaqueWidth = Math.min(3.8, opening.width - 0.24)
  const signLayout = museumGalleryThresholdSignLayout(gallery)
  const signTop = signLayout.signCenterY + signLayout.signOuterHeight * 0.5
  const railBottom = signLayout.railCenterY - signLayout.railHeight * 0.5
  const hangerHeight = Math.max(0, railBottom - signTop)
  const hangerCenterY = signTop + hangerHeight * 0.5
  return (
    <group>
      {wallPanels.map((panel) => (
        <MuseumStructuralBox
          key={panel.id}
          position={[panel.centerX, 0.28, z]}
          scale={[panel.width, 5.42, MUSEUM_GALLERY_BOUNDARY_WALL_THICKNESS]}
          color={gallery.wallLight}
        />
      ))}
      <MuseumBox position={[opening.centerX, 2.78, z]} scale={[opening.width, signLayout.lintelHeight, MUSEUM_GALLERY_BOUNDARY_WALL_THICKNESS]} color={frameColor} outlineWidth={isPhotographyGallery ? 0.03 : isPortraitSalon ? 0.03 : 0.06} />
      <MuseumBox position={[opening.minX - 0.11, 0.24, casingZ]} scale={[isPhotographyGallery || isPortraitSalon ? 0.22 : 0.28, 4.72, MUSEUM_GALLERY_BOUNDARY_CASING_DEPTH]} color={frameColor} outlineWidth={isPhotographyGallery ? 0.02 : isPortraitSalon ? 0.022 : 0.035} />
      <MuseumBox position={[opening.maxX + 0.11, 0.24, casingZ]} scale={[isPhotographyGallery || isPortraitSalon ? 0.22 : 0.28, 4.72, MUSEUM_GALLERY_BOUNDARY_CASING_DEPTH]} color={frameColor} outlineWidth={isPhotographyGallery ? 0.02 : isPortraitSalon ? 0.022 : 0.035} />
      <MuseumBox position={[opening.centerX, signLayout.railCenterY, z - 0.14]} scale={[opening.width - 0.18, signLayout.railHeight, isPortraitSalon ? 0.12 : 0.16]} color={isPhotographyGallery ? gallery.accent : AGED_BRASS} outlineWidth={isPhotographyGallery ? 0.008 : isPortraitSalon || isHolidayGallery ? 0.008 : 0.014} />
      {isHolidayGallery && hangerHeight > 0 ? ([-1, 1] as const).map((side) => (
        <MuseumBox
          key={`holiday-sign-hanger-${side}`}
          position={[opening.centerX + side * plaqueWidth * 0.34, hangerCenterY, z - 0.075]}
          scale={[0.05, hangerHeight, 0.08]}
          color={AGED_BRASS}
          outlineWidth={0.006}
        />
      )) : null}
      <MuseumBox position={[opening.centerX, signLayout.signCenterY, z - 0.04]} scale={[plaqueWidth + 0.14, signLayout.signOuterHeight, 0.14]} color={AGED_BRASS} outlineWidth={isHolidayGallery ? 0.018 : 0.026} />
      <MuseumBox position={[opening.centerX, signLayout.signCenterY, z - 0.145]} scale={[plaqueWidth, signLayout.signInnerHeight, 0.08]} color={INK} outlineWidth={isHolidayGallery ? 0.014 : 0.022} />
      <MuseumBox position={[opening.centerX, signLayout.signCenterY, z + 0.145]} scale={[plaqueWidth, signLayout.signInnerHeight, 0.08]} color={INK} outlineWidth={isHolidayGallery ? 0.014 : 0.022} />
      <mesh position={[opening.centerX, signLayout.signCenterY, z - 0.192]} rotation={[0, Math.PI, 0]} scale={[plaqueWidth - 0.12, signLayout.signPlaneHeight, 1]} renderOrder={6}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[opening.centerX, signLayout.signCenterY, z + 0.192]} scale={[plaqueWidth - 0.12, signLayout.signPlaneHeight, 1]} renderOrder={6}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <MuseumBox
        position={[opening.centerX, -1.91, z - 0.72]}
        scale={[0.22, 0.018, 0.22]}
        rotation={[0, Math.PI / 4, 0]}
        color={AGED_BRASS}
        outlineWidth={0.012}
      />
    </group>
  )
}

function LoopSign({
  kicker,
  title,
  subtitle,
  accent,
  background,
  direction = 'none',
  position,
  rotation = [0, 0, 0],
  size = [3.4, 0.96],
}: {
  kicker: string
  title: string
  subtitle: string
  accent: string
  background: string
  direction?: MuseumSignDirection
  position: Vec3
  rotation?: Vec3
  size?: readonly [number, number]
}) {
  const texture = useMuseumSignTexture({ kicker, title, subtitle, direction }, accent, background)
  const frameWidth = size[0] + 0.2
  const frameHeight = size[1] + 0.16
  return (
    <group position={[...position]} rotation={[...rotation]}>
      <MuseumBox position={[0, 0, 0]} scale={[frameWidth, frameHeight, 0.12]} color={AGED_BRASS} outlineWidth={0.026} />
      <MuseumBox position={[0, 0, 0.04]} scale={[size[0] + 0.08, size[1] + 0.06, 0.1]} color={INK} outlineWidth={0.015} />
      <mesh position={[0, 0, 0.096]} scale={[size[0], size[1], 1]} renderOrder={7}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.096]} rotation={[0, Math.PI, 0]} scale={[size[0], size[1], 1]} renderOrder={7}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function drawWrappedMuseumText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate
      return
    }
    lines.push(line)
    line = word
  })
  if (line) lines.push(line)

  const visibleLines = lines.slice(0, maxLines)
  if (lines.length > maxLines) {
    let finalLine = visibleLines[maxLines - 1]
    while (finalLine.length > 1 && context.measureText(`${finalLine}…`).width > maxWidth) {
      finalLine = finalLine.slice(0, -1)
    }
    visibleLines[maxLines - 1] = `${finalLine.trimEnd()}…`
  }
  visibleLines.forEach((visibleLine, index) => context.fillText(visibleLine, x, startY + index * lineHeight))
}

function drawMuseumLorePlaque(context: CanvasRenderingContext2D, chapter: MuseumLoreChapter) {
  const { width, height } = context.canvas
  context.fillStyle = '#efe4ca'
  context.fillRect(0, 0, width, height)
  const wash = context.createLinearGradient(0, 0, width, height)
  wash.addColorStop(0, 'rgba(255,255,255,.7)')
  wash.addColorStop(0.46, 'rgba(255,255,255,0)')
  wash.addColorStop(1, 'rgba(72,48,40,.08)')
  context.fillStyle = wash
  context.fillRect(0, 0, width, height)

  context.strokeStyle = '#8e7144'
  context.lineWidth = 7
  context.strokeRect(20, 20, width - 40, height - 40)
  context.strokeStyle = 'rgba(63,45,41,.3)'
  context.lineWidth = 2
  context.strokeRect(37, 37, width - 74, height - 74)

  context.fillStyle = chapter.accent
  context.fillRect(0, 0, 26, height)
  context.fillStyle = '#2b2528'
  context.fillRect(26, 0, 7, height)

  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillStyle = '#6a5847'
  context.font = '800 25px Arial, Helvetica, sans-serif'
  context.fillText(`${chapter.trailLabel.toUpperCase()}  ·  ${chapter.date.toUpperCase()}`, 76, 90)

  context.fillStyle = '#261f22'
  context.font = '700 63px Georgia, Times New Roman, serif'
  drawWrappedMuseumText(context, chapter.shortTitle, 76, 176, width - 142, 70, 2)

  context.fillStyle = chapter.accent
  context.fillRect(76, 282, 94, 7)

  context.fillStyle = '#594b43'
  context.font = '500 31px Arial, Helvetica, sans-serif'
  drawWrappedMuseumText(context, chapter.plaqueCopy, 76, 350, width - 142, 43, 3)

  context.fillStyle = '#2d282b'
  context.fillRect(76, height - 100, width - 152, 56)
  context.fillStyle = chapter.accent
  context.fillRect(76, height - 100, 12, 56)
  context.fillStyle = '#fff3d4'
  context.font = '900 23px Arial, Helvetica, sans-serif'
  context.fillText('OPEN THE STORY  →', 112, height - 64)
}

function useMuseumLorePlaqueTexture(chapter: MuseumLoreChapter) {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return createFallbackTexture(chapter.accent)
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 640
    const context = canvas.getContext('2d')
    if (!context) return createFallbackTexture(chapter.accent)
    drawMuseumLorePlaque(context, chapter)
    const nextTexture = new THREE.CanvasTexture(canvas)
    nextTexture.colorSpace = THREE.SRGBColorSpace
    nextTexture.anisotropy = 8
    nextTexture.needsUpdate = true
    return nextTexture
  }, [chapter])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function MuseumLoreStation({
  chapterId,
  position,
  rotationY,
  onOpen,
}: {
  chapterId: MuseumLoreId
  position: Vec3
  rotationY: number
  onOpen?: (chapterId: MuseumLoreId) => void
}) {
  const [hovered, setHovered] = useState(false)
  const chapter = MUSEUM_LORE_BY_ID[chapterId]
  const texture = useMuseumLorePlaqueTexture(chapter)
  const width = 1.72
  const height = 1.08

  useEffect(() => {
    if (!hovered) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered])

  return (
    <group
      position={[...position]}
      rotation={[0, rotationY, 0]}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={(event) => {
        event.stopPropagation()
        setHovered(false)
      }}
      onClick={(event) => {
        event.stopPropagation()
        setHovered(false)
        onOpen?.(chapterId)
      }}
      userData={{
        museumLore: chapterId,
        interaction: 'open-museum-story',
        room: chapter.room,
      }}
    >
      <MuseumBox
        position={[0, 0, 0]}
        scale={[width + 0.18, height + 0.18, 0.1]}
        color={hovered ? chapter.accent : AGED_BRASS}
        outlineWidth={0.022}
        emissive={chapter.accent}
        emissiveIntensity={hovered ? 0.12 : 0.025}
      />
      <MuseumBox position={[0, 0, 0.065]} scale={[width + 0.04, height + 0.04, 0.07]} color="#282127" outlineWidth={0.011} />
      <mesh position={[0, 0, 0.112]} scale={[width, height, 1]} renderOrder={8}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <MuseumBox
        position={[0, height * 0.5 + 0.17, 0.1]}
        scale={[width * 0.76, 0.08, 0.16]}
        color="#332a2b"
        outlineWidth={0.012}
        emissive={chapter.accent}
        emissiveIntensity={hovered ? 0.2 : 0.06}
      />
      <pointLight
        position={[0, height * 0.5 + 0.08, 0.5]}
        color={chapter.accent}
        intensity={hovered ? 0.65 : 0.24}
        distance={2.5}
        decay={2}
      />
      <mesh position={[0, 0, 0.18]} scale={[width + 0.18, height + 0.18, 1]} renderOrder={9}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
      </mesh>
    </group>
  )
}

function GalleryAtriumPortal({ gallery }: { gallery: MuseumGalleryPlan }) {
  if (gallery.id === 'lobby') return null
  const isPortraitSalon = gallery.id === 'moba-one'
  const isPhotographyGallery = gallery.id === 'photography'
  const portal = MUSEUM_GALLERY_ATRIUM_PORTALS[gallery.id]
  const bounds = museumGalleryAtriumPortalBounds(gallery)
  const centerZ = (bounds.minZ + bounds.maxZ) * 0.5
  const width = bounds.maxZ - bounds.minZ
  const transom = MUSEUM_GALLERY_INTERIORS[gallery.id].windows.find(
    (window) => window.id === portal.transomWindowId,
  )
  const transomColor = transom?.kind === 'winter'
    ? '#e7f4f7'
    : transom?.kind === 'cobalt-clerestory'
      ? '#d5e3df'
      : gallery.id === 'photography'
        ? '#e8efeb'
        : '#ffe9bd'
  const portalFrameColor = isPhotographyGallery ? '#687571' : isPortraitSalon ? '#4b332e' : gallery.trim
  const casing = museumGalleryAtriumPortalCasing(gallery)
  return (
    <group userData={{ atriumPortal: gallery.id, realOpening: true }}>
      {casing.map((part) => (
        <MuseumStructuralBox
          key={part.id}
          position={[part.x, part.y, part.z]}
          scale={[part.width, part.height, part.depth]}
          color={part.role === 'frame' ? portalFrameColor : gallery.wallLight}
        />
      ))}

      <group position={[5.7, 2.19, centerZ]} rotation={[0, Math.PI / 2, 0]}>
        <mesh scale={[width - 0.28, 0.46, 1]} renderOrder={3}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={transomColor} transparent opacity={gallery.id === 'moba-two' ? 0.07 : isPhotographyGallery ? 0.08 : 0.15} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {[-0.34, 0.34].map((offset) => (
          <MuseumBox key={offset} position={[offset * width, 0, 0.025]} scale={[0.065, 0.48, 0.08]} color={portalFrameColor} outlineWidth={0.012} />
        ))}
        <MuseumBox position={[0, -0.25, 0.025]} scale={[width, 0.08, 0.08]} color={portalFrameColor} outlineWidth={0.012} />
        <mesh position={[-0.42, 0.03, 0.04]} rotation={[0, 0, -0.32]} scale={[0.08, 0.36, 1]} renderOrder={4}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#fffdf0" transparent opacity={gallery.id === 'moba-two' ? 0.1 : isPhotographyGallery ? 0.08 : 0.22} depthWrite={false} />
        </mesh>
      </group>

      <MuseumBox position={[6.23, 2.56, centerZ]} scale={[0.1, 0.065, width + 0.22]} color={isPhotographyGallery ? gallery.accent : AGED_BRASS} outlineWidth={0.01} />
      <LoopSign
        kicker={gallery.eyebrow}
        title={gallery.shortTitle}
        subtitle={gallery.title}
        accent={gallery.accent}
        background={gallery.trim}
        position={[6.32, 3.02, centerZ]}
        rotation={[0, Math.PI / 2, 0]}
        size={[2.3, 0.64]}
      />
      <MuseumBox position={[5.98, -1.925, centerZ]} scale={[0.88, 0.018, width + 0.08]} color={gallery.floor} outlineWidth={0.012} />
      <MuseumBox position={[5.98, -1.91, bounds.minZ + 0.08]} scale={[0.9, 0.012, 0.035]} color={isPhotographyGallery ? '#78827e' : AGED_BRASS} outlineWidth={0.006} />
      <MuseumBox position={[5.98, -1.91, bounds.maxZ - 0.08]} scale={[0.9, 0.012, 0.035]} color={isPhotographyGallery ? '#78827e' : AGED_BRASS} outlineWidth={0.006} />
    </group>
  )
}

function GalleryPortalReturns({ gallery }: { gallery: MuseumGalleryPlan }) {
  if (gallery.id === 'lobby') return null
  const isPortraitSalon = gallery.id === 'moba-one'
  const isPhotographyGallery = gallery.id === 'photography'
  const returns = museumGalleryPortalReturns(gallery)
  const photographyIntroSign = isPhotographyGallery
    ? museumPhotographyIntroSignLayout(gallery)
    : null
  return (
    <group>
      {returns.map((portalReturn) => {
        const faceSide = portalReturn.id === 'portal-south' ? 1 : -1
        const wallHalfDepth = portalReturn.thickness * 0.5
        const finishDepth = 0.05
        const finishOffset = wallHalfDepth + 0.012 + finishDepth * 0.5
        const postDepth = 0.1
        const postOffset = wallHalfDepth + 0.012 + postDepth * 0.5
        return (
          <group
            key={portalReturn.id}
            position={[portalReturn.centerX, 0, portalReturn.centerZ]}
            rotation={[0, portalReturn.wallRotationY, 0]}
            userData={{ portalWing: portalReturn.id, splayed: true }}
          >
            <MuseumStructuralBox
              position={[0, 0.1, 0]}
              scale={[portalReturn.length, 4.08, portalReturn.thickness]}
              color={gallery.wallLight}
            />
            <MuseumStructuralBox
              position={[0, -1.12, faceSide * finishOffset]}
              scale={[portalReturn.length - 0.18, 1.28, finishDepth]}
              color={isPhotographyGallery ? '#bcc1ba' : isPortraitSalon ? '#49322e' : gallery.trim}
            />
            <MuseumBox
              position={[0, 2.24, 0]}
              scale={[portalReturn.length, 0.16, 0.3]}
              color={isPhotographyGallery ? '#87948f' : isPortraitSalon ? '#4b332e' : gallery.trim}
              outlineWidth={isPhotographyGallery ? 0.014 : isPortraitSalon ? 0.02 : 0.032}
            />
            <MuseumBox
              position={[-portalReturn.length * 0.5 + 0.06, 0.08, faceSide * postOffset]}
              scale={[0.12, 4.02, postDepth]}
              color={isPhotographyGallery ? '#687571' : isPortraitSalon ? '#4b332e' : gallery.trim}
              outlineWidth={isPhotographyGallery ? 0.02 : isPortraitSalon ? 0.022 : 0.038}
            />
            <MuseumBox
              position={[-portalReturn.length * 0.5 + 0.06, 2.28, faceSide * postOffset]}
              scale={[0.24, 0.24, 0.14]}
              color={isPhotographyGallery ? gallery.accent : isPortraitSalon ? '#4b332e' : AGED_BRASS}
              outlineWidth={isPhotographyGallery ? 0.014 : isPortraitSalon ? 0.014 : 0.025}
            />
          </group>
        )
      })}
      {gallery.id === 'photography' ? (
        <LoopSign
          kicker="Photography Room · 2025"
          title="One Final Album"
          subtitle="North-Light Gallery"
          accent={gallery.accent}
          background={gallery.trim}
          position={photographyIntroSign!.position}
          rotation={[0, photographyIntroSign!.rotationY, 0]}
          size={photographyIntroSign!.size}
        />
      ) : null}
    </group>
  )
}

function ConnectorWindowWall({ x, color }: { x: number; color: string }) {
  const wallWidth = 6.94
  const openingWidth = 5.56
  const openingBottom = -1.38
  const openingTop = 2.42
  const sideWidth = (wallWidth - openingWidth) * 0.5
  const sideOffset = openingWidth * 0.5 + sideWidth * 0.5
  return (
    <group>
      <MuseumStructuralBox position={[x - sideOffset, 0.605, 3.2]} scale={[sideWidth, 5.09, 0.35]} color={color} />
      <MuseumStructuralBox position={[x + sideOffset, 0.605, 3.2]} scale={[sideWidth, 5.09, 0.35]} color={color} />
      <MuseumStructuralBox position={[x, (-1.94 + openingBottom) * 0.5, 3.2]} scale={[openingWidth, openingBottom + 1.94, 0.35]} color={color} />
      <MuseumStructuralBox position={[x, (openingTop + 3.15) * 0.5, 3.2]} scale={[openingWidth, 3.15 - openingTop, 0.35]} color={color} />
    </group>
  )
}

function MuseumLoopWallReturn({ spec }: { spec: MuseumLoopWallReturnSpec }) {
  const gallery = MUSEUM_GALLERIES.find((candidate) => candidate.id === spec.galleryId)!
  const interiorSide = -Math.sign(spec.x)
  const structuralFaceOffset = spec.thickness * 0.5
  const wallLightDepth = 0.04
  const wallLightOffset = structuralFaceOffset + 0.012 + wallLightDepth * 0.5
  const trimDepth = 0.04
  const trimOffset = wallLightOffset + wallLightDepth * 0.5 + 0.012 + trimDepth * 0.5
  const railDepth = 0.03
  const railOffset = trimOffset + trimDepth * 0.5 + 0.014 + railDepth * 0.5
  return (
    <group userData={{ wallReturn: spec.id, closesExteriorGap: true }}>
      <MuseumStructuralBox
        position={[spec.x, 0.605, spec.z]}
        scale={[spec.thickness, 5.09, spec.depth]}
        color={gallery.wall}
      />
      <MuseumStructuralBox
        position={[spec.x + interiorSide * wallLightOffset, 0.82, spec.z]}
        scale={[wallLightDepth, 3.62, spec.depth - 0.22]}
        color={gallery.wallLight}
      />
      <MuseumStructuralBox
        position={[spec.x + interiorSide * trimOffset, -1.12, spec.z]}
        scale={[trimDepth, 1.28, spec.depth - 0.14]}
        color={gallery.trim}
      />
      <MuseumStructuralBox
        position={[spec.x + interiorSide * railOffset, -0.42, spec.z]}
        scale={[railDepth, 0.09, spec.depth - 0.2]}
        color={BRASS}
      />
    </group>
  )
}

function MuseumLoopArchitecture({
  active,
  reducedMotion,
  atriumInstallation,
  atriumInstallationAssets,
  atriumInstallationPaused,
  onOpenAtriumRegistry,
  onSelectAtriumResident,
  onOpenCourtyard,
  onOpenBurnRoom,
}: {
  active: boolean
  reducedMotion: boolean
  atriumInstallation: AppliedAtriumInstallation | null
  atriumInstallationAssets: readonly MuseumAssetSummary[]
  atriumInstallationPaused: boolean
  onOpenAtriumRegistry?: () => void
  onSelectAtriumResident?: (resident: MuseumAssetSummary) => void
  onOpenCourtyard?: () => void
  onOpenBurnRoom?: () => void
}) {
  const mobaOne = MUSEUM_GALLERIES[1]
  const holiday = MUSEUM_GALLERIES[4]
  return (
    <group>
      <MuseumAtrium
        active={active}
        reducedMotion={reducedMotion}
        installation={atriumInstallation}
        installationAssets={atriumInstallationAssets}
        installationPaused={atriumInstallationPaused}
        onOpenRegistry={onOpenAtriumRegistry}
        onSelectResident={onSelectAtriumResident}
      />
      <MuseumExteriorGrounds />
      {MUSEUM_STRUCTURAL_SLABS.map((slab) => {
        const gallery = MUSEUM_GALLERY_BY_ID[slab.galleryId]
        const ceilingColor = slab.kind === 'gallery'
          ? gallery.id === 'moba-one'
            ? '#e3d0b7'
            : gallery.id === 'moba-two'
              ? '#e6ece7'
              : gallery.id === 'photography'
                ? '#f1eee5'
                : '#e8ddca'
          : gallery.trim
        return (
          <group key={slab.id} userData={{ structuralSlab: slab.id, coplanarOverlap: false }}>
            <MuseumStructuralBox
              position={[slab.x, -2.05, slab.z]}
              scale={[slab.floorWidth, 0.22, slab.depth]}
              color={gallery.floor}
              emissive={gallery.id === 'photography' ? gallery.floor : '#000000'}
              emissiveIntensity={gallery.id === 'photography' ? 0.04 : 0}
            />
            <MuseumStructuralBox
              position={[slab.x, 3.24, slab.z]}
              scale={[slab.ceilingWidth, 0.18, slab.depth]}
              color={ceilingColor}
              emissive={gallery.id === 'photography' ? ceilingColor : '#000000'}
              emissiveIntensity={gallery.id === 'photography' ? 0.06 : 0}
            />
          </group>
        )
      })}
      {MUSEUM_LOOP_WALL_RETURNS.map((spec) => <MuseumLoopWallReturn key={spec.id} spec={spec} />)}
      <ConnectorWindowWall x={-9.2} color={mobaOne.wall} />
      <ConnectorWindowWall x={9.2} color={holiday.wall} />
      <CourtyardGardenDoor x={-9.2} onOpen={onOpenCourtyard} />
      <BurnRoomDoorAndWindow x={9.2} onOpen={onOpenBurnRoom} />

      <FarTurnPersonalGalleryFacade />
      <mesh position={[0, 3.12, 34]} rotation={[-Math.PI / 2, 0, 0]} scale={[8.6, 2.15, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#b9ccc3" />
      </mesh>
      <MuseumBox position={[0, 3.16, 34]} scale={[0.18, 0.16, 2.42]} color="#314348" outlineWidth={0.028} />
      <mesh position={[0.8, -1.9, 33.75]} rotation={[-Math.PI / 2, 0, 0]} scale={[5.8, 1.65, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fff1bd" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <LoopSign
        kicker="East Gallery Wing"
        title="Photography"
        subtitle="One Final Album · North-Light Room"
        accent={MUSEUM_GALLERIES[3].accent}
        background={MUSEUM_GALLERIES[3].trim}
        direction="right"
        position={[8.8, 2.48, 35.12]}
        rotation={[0, Math.PI, 0]}
        size={[3.25, 0.72]}
      />

      {([-1, 1] as const).map((side) => {
        const portal = side < 0 ? MUSEUM_LOOP_PORTALS.entry : MUSEUM_LOOP_PORTALS.return
        const accent = side < 0 ? mobaOne.accent : holiday.accent
        const wall = side < 0 ? mobaOne.wall : holiday.wall
        return (
          <group key={portal.side}>
            <MuseumBox position={[side * 6.02, 0.12, 3.47]} scale={[0.5, 6.35, 0.46]} color={wall} outlineWidth={0.075} />
            <MuseumBox position={[side * 6.02, 0.12, 6.53]} scale={[0.5, 6.35, 0.46]} color={wall} outlineWidth={0.075} />
            <MuseumBox position={[side * 6.02, 2.72, 5]} scale={[0.5, 1.16, 3.52]} color={wall} outlineWidth={0.075} />
            <MuseumBox position={[side * 5.78, 2.18, 5]} scale={[0.07, 0.09, 2.72]} color={AGED_BRASS} outlineWidth={0.012} />
            <LoopSign
              kicker={side < 0 ? 'West Gallery Wing' : 'Main Entrance'}
              title={side < 0 ? 'MoBA #1' : 'Opening Salon'}
              subtitle={side < 0 ? 'Portraits of an Enjoyer' : 'Central Atrium · Main Hall'}
              accent={accent}
              background={wall}
              position={[side * 5.69, 1.08, 5]}
              rotation={[0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
              size={[2.82, 0.82]}
            />
          </group>
        )
      })}

      <MuseumBox position={[-2.65, -1.91, 5]} scale={[5.3, 0.018, 0.055]} color={AGED_BRASS} outlineWidth={0.008} />
      <MuseumBox position={[-8.75, -1.91, 5]} scale={[6.9, 0.018, 0.055]} color={AGED_BRASS} outlineWidth={0.008} />
      <MuseumBox position={[-12.2, -1.91, 5.85]} scale={[0.055, 0.018, 1.7]} color={AGED_BRASS} outlineWidth={0.008} />
      <MuseumBox position={[-12.2, -1.91, 33.34]} scale={[0.035, 0.018, 1.32]} color="#667577" outlineWidth={0.006} />
      <MuseumBox position={[0, -1.91, 34]} scale={[24.4, 0.018, 0.055]} color={AGED_BRASS} outlineWidth={0.008} />
      <MuseumBox position={[12.2, -1.91, 12.65]} scale={[0.055, 0.018, 14.3]} color={AGED_BRASS} outlineWidth={0.008} />
      <MuseumBox position={[12.2, -1.91, 33.34]} scale={[0.035, 0.018, 1.32]} color="#78827e" outlineWidth={0.006} />
      <MuseumBox position={[8.75, -1.91, 5]} scale={[6.9, 0.018, 0.055]} color={AGED_BRASS} outlineWidth={0.008} />
      <MuseumBox position={[2.65, -1.91, 5]} scale={[5.3, 0.018, 0.055]} color={AGED_BRASS} outlineWidth={0.008} />

      {[
        [-12.2, 34, Math.PI / 4],
        [12.2, 34, Math.PI / 4],
        [-12.2, 5.08, Math.PI / 4],
        [12.2, 5.08, Math.PI / 4],
      ].map(([x, z, yaw]) => (
        <MuseumBox
          key={`${x}-${z}`}
          position={[x, -1.88, z]}
          scale={[0.22, 0.018, 0.22]}
          rotation={[0, yaw, 0]}
          color={AGED_BRASS}
          outlineWidth={0.01}
        />
      ))}
    </group>
  )
}

function galleryWindowPalette(kind: MuseumWindowSpec['kind']) {
  if (kind === 'amber-clerestory') return { glass: '#ffe8bd', reflection: '#fff7d6' }
  if (kind === 'cobalt-clerestory') return { glass: '#c7d8d6', reflection: '#eef2eb' }
  if (kind === 'winter') return { glass: '#d9edf5', reflection: '#ffffff' }
  return { glass: '#e4f1ef', reflection: '#fffdf0' }
}

function GalleryWindow({
  gallery,
  spec,
  active,
}: {
  gallery: MuseumGalleryPlan
  spec: MuseumWindowSpec
  active: boolean
}) {
  const side = spec.wall === 'left' ? -1 : 1
  const isPortraitGallery = gallery.id === 'moba-one' && spec.kind === 'amber-clerestory'
  const isHeartGallery = gallery.id === 'moba-two' && spec.kind === 'cobalt-clerestory'
  const isPhotographyGallery = gallery.id === 'photography'
  const isWinterGallery = gallery.id === 'holiday' && spec.kind === 'winter'
  const palette = isPhotographyGallery
    ? { glass: '#d7e3df', reflection: '#f7f1e4' }
    : isWinterGallery
      ? { glass: '#b9cfd2', reflection: '#ecf1ed' }
    : galleryWindowPalette(spec.kind)
  const z = museumGalleryZ(gallery, spec.t, 1.05)
  const mullions = isPhotographyGallery
    ? []
    : spec.kind === 'amber-clerestory' || spec.kind === 'cobalt-clerestory'
      ? [-0.26, 0, 0.26]
      : [0]
  const revealDepth = isPhotographyGallery ? 0.72 : 0.54
  const revealColor = isPhotographyGallery ? '#d9ddd6' : gallery.wallLight
  const revealOutline = isPhotographyGallery ? 0.014 : 0.018
  const casingOffsetX = spec.width * 0.5 + (isPhotographyGallery ? 0.1 : isWinterGallery ? 0.11 : isPortraitGallery ? 0.13 : isHeartGallery ? 0.11 : 0.16)
  const casingOffsetY = spec.height * 0.5 + (isPhotographyGallery ? 0.1 : isWinterGallery ? 0.11 : isPortraitGallery ? 0.13 : isHeartGallery ? 0.11 : 0.16)
  const casingColor = isPhotographyGallery ? '#87928c' : isWinterGallery ? '#4f6253' : isPortraitGallery ? '#6a4a3e' : isHeartGallery ? '#64787c' : gallery.trim
  const casingWidth = isPhotographyGallery ? 0.075 : isWinterGallery ? 0.12 : isPortraitGallery ? 0.13 : isHeartGallery ? 0.11 : 0.2
  const casingExpansion = isPhotographyGallery ? 0.28 : isWinterGallery ? 0.36 : isPortraitGallery ? 0.42 : isHeartGallery ? 0.34 : 0.52
  const casingOutline = isPhotographyGallery ? 0.014 : isWinterGallery ? 0.022 : isPortraitGallery ? 0.018 : isHeartGallery ? 0.018 : 0.038
  return (
    <group
      position={[side * 6.02, spec.y, z]}
      rotation={[0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
      userData={{ windowId: spec.id, windowView: spec.view, realOpening: true }}
    >
      <MuseumBox position={[-spec.width * 0.5 - 0.05, 0, 0]} scale={[0.1, isPortraitGallery || isHeartGallery ? spec.height : spec.height + 0.18, revealDepth]} color={revealColor} outlineWidth={revealOutline} />
      <MuseumBox position={[spec.width * 0.5 + 0.05, 0, 0]} scale={[0.1, isPortraitGallery || isHeartGallery ? spec.height : spec.height + 0.18, revealDepth]} color={revealColor} outlineWidth={revealOutline} />
      <MuseumBox position={[0, -spec.height * 0.5 - 0.05, 0]} scale={[isPortraitGallery || isHeartGallery ? spec.width : spec.width + 0.18, 0.1, revealDepth]} color={revealColor} outlineWidth={revealOutline} />
      <MuseumBox position={[0, spec.height * 0.5 + 0.05, 0]} scale={[isPortraitGallery || isHeartGallery ? spec.width : spec.width + 0.18, 0.1, revealDepth]} color={revealColor} outlineWidth={revealOutline} />

      <MuseumBox position={[-casingOffsetX, 0, 0.22]} scale={[casingWidth, spec.height + (isPortraitGallery || isHeartGallery ? casingWidth : casingExpansion), 0.16]} color={casingColor} outlineWidth={casingOutline} />
      <MuseumBox position={[casingOffsetX, 0, 0.22]} scale={[casingWidth, spec.height + (isPortraitGallery || isHeartGallery ? casingWidth : casingExpansion), 0.16]} color={casingColor} outlineWidth={casingOutline} />
      <MuseumBox position={[0, -casingOffsetY, 0.22]} scale={[spec.width + (isPortraitGallery || isHeartGallery ? casingWidth : casingExpansion), casingWidth, 0.16]} color={casingColor} outlineWidth={casingOutline} />
      <MuseumBox position={[0, casingOffsetY, 0.22]} scale={[spec.width + (isPortraitGallery || isHeartGallery ? casingWidth : casingExpansion), casingWidth, 0.16]} color={casingColor} outlineWidth={casingOutline} />

      {isPortraitGallery ? (
        <group position={[0, -spec.height * 0.1, -0.52]} userData={{ exteriorLayer: 'portrait-clerestory-garden' }}>
          <MuseumBox
            position={[0, -spec.height * 0.28, 0]}
            scale={[spec.width * 1.04, spec.height * 0.28, 0.14]}
            color="#8b9785"
            outlineWidth={0.003}
          />
          <group position={[-spec.width * 0.18, -spec.height * 0.42, 0.03]} scale={[0.24, 0.24, 0.16]}>
            <MuseumExteriorTreeBotany compact variant={0} palette={['#536957', '#758570', '#9ca68d']} />
          </group>
          <group position={[spec.width * 0.24, -spec.height * 0.4, 0.05]} scale={[0.2, 0.2, 0.14]}>
            <MuseumExteriorTreeBotany compact variant={2} palette={['#5c705c', '#839078', '#aab29a']} />
          </group>
        </group>
      ) : null}

      {isHeartGallery ? (
        <group position={[0, -spec.height * 0.08, -0.58]} userData={{ exteriorLayer: 'mineral-clerestory-garden' }}>
          <MuseumBox
            position={[0, -spec.height * 0.3, 0]}
            scale={[spec.width * 1.08, spec.height * 0.24, 0.16]}
            color="#829792"
            outlineWidth={0.003}
          />
          <group position={[-spec.width * 0.22, -spec.height * 0.43, 0.04]} scale={[0.22, 0.22, 0.15]}>
            <MuseumExteriorTreeBotany compact variant={1} palette={['#526c67', '#708984', '#94a9a1']} />
          </group>
          <group position={[spec.width * 0.2, -spec.height * 0.41, 0.06]} scale={[0.2, 0.2, 0.14]}>
            <MuseumExteriorTreeBotany compact variant={2} palette={['#617b75', '#8ba09a', '#b0bdb5']} />
          </group>
        </group>
      ) : null}

      <mesh position={[0, 0, -0.16]} scale={[spec.width, spec.height, 1]} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color={palette.glass}
          transparent
          opacity={isPhotographyGallery ? 0.025 : isWinterGallery ? 0.075 : isPortraitGallery ? 0.035 : spec.kind === 'cobalt-clerestory' ? 0.04 : 0.065}
          depthWrite={false}
          toneMapped={isPhotographyGallery || isWinterGallery || isPortraitGallery || isHeartGallery}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[-spec.width * 0.22, 0.02, 0.245]} rotation={[0, 0, -0.3]} scale={[0.09, spec.height * 0.82, 1]} renderOrder={4}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={palette.reflection} transparent opacity={isPhotographyGallery ? 0.04 : isWinterGallery ? 0.045 : isPortraitGallery ? 0.055 : spec.kind === 'cobalt-clerestory' ? 0.07 : 0.17} depthWrite={false} toneMapped={isPhotographyGallery || isWinterGallery || isPortraitGallery || isHeartGallery} />
      </mesh>
      {mullions.map((offset) => (
        <MuseumBox
          key={offset}
          position={[offset * spec.width, 0, 0.23]}
          scale={[isPortraitGallery ? 0.035 : isHeartGallery ? 0.04 : isWinterGallery ? 0.045 : 0.07, spec.height, 0.1]}
          color={casingColor}
          outlineWidth={isPortraitGallery || isHeartGallery ? 0.005 : 0.01}
        />
      ))}
      {spec.height > 1.2 ? (
        <MuseumBox position={[0, isPhotographyGallery ? 0.24 : isWinterGallery ? 0.16 : 0.04, 0.23]} scale={[spec.width, isPhotographyGallery ? 0.035 : isWinterGallery ? 0.04 : 0.07, 0.1]} color={casingColor} outlineWidth={isPhotographyGallery ? 0.006 : isWinterGallery ? 0.007 : 0.012} />
      ) : null}
      {isWinterGallery ? (
        <mesh position={[0, -spec.height * 0.44, 0.242]} scale={[spec.width * 0.92, spec.height * 0.1, 1]} renderOrder={3}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#d8e2dc" transparent opacity={0.1} depthWrite={false} toneMapped />
        </mesh>
      ) : null}
      <MuseumBox
        position={[0, -spec.height * 0.5 - (isPhotographyGallery ? 0.19 : isWinterGallery ? 0.2 : isPortraitGallery ? 0.19 : 0.24), 0.13]}
        scale={[
          spec.width + (isPhotographyGallery ? 0.48 : isWinterGallery ? 0.5 : isPortraitGallery ? 0.42 : isHeartGallery ? 0.44 : 0.72),
          isPhotographyGallery || isWinterGallery ? 0.14 : isPortraitGallery || isHeartGallery ? 0.13 : 0.18,
          isPhotographyGallery ? 0.78 : isPortraitGallery || isHeartGallery ? 0.54 : 0.66,
        ]}
        color={isPhotographyGallery ? '#c8c5bc' : isWinterGallery ? '#7c7769' : isPortraitGallery ? '#bfa68b' : isHeartGallery ? '#b8c7c2' : gallery.wallLight}
        outlineWidth={isPhotographyGallery ? 0.018 : isWinterGallery ? 0.02 : isPortraitGallery ? 0.014 : isHeartGallery ? 0.014 : 0.035}
      />
      {active ? (
        <mesh
          position={[0, (isPortraitGallery || isHeartGallery || isPhotographyGallery ? -1.892 : -1.905) - spec.y, 1.35]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[isPhotographyGallery ? spec.width : Math.max(0.5, spec.width * 0.76), isPhotographyGallery ? 2.4 : 2.6, 1]}
          renderOrder={1}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color={palette.reflection}
            transparent
            opacity={isPhotographyGallery ? 0.035 : isWinterGallery ? 0.04 : spec.kind === 'amber-clerestory' ? 0.035 : spec.kind === 'cobalt-clerestory' ? 0.025 : 0.075}
            depthWrite={false}
            blending={isPhotographyGallery || isWinterGallery || spec.kind === 'amber-clerestory' || spec.kind === 'cobalt-clerestory' ? THREE.NormalBlending : THREE.AdditiveBlending}
          />
        </mesh>
      ) : null}
    </group>
  )
}

function GallerySkylight({
  gallery,
  spec,
  active,
}: {
  gallery: MuseumGalleryPlan
  spec: MuseumSkylightSpec
  active: boolean
}) {
  const z = museumGalleryZ(gallery, spec.t, 0.95)
  const isHeartOculus = gallery.id === 'moba-two' && spec.id === 'heart-light-b'
  const isHeartGallery = gallery.id === 'moba-two'
  const isPortraitLaylight = gallery.id === 'moba-one'
  const isPhotographyGallery = gallery.id === 'photography'
  const isWinterConservatory = gallery.id === 'holiday'
  const skylightX = isHeartOculus ? MOBA_TWO_HEART_SCULPTURE_SPEC.localPosition[0] : 0
  const panelColor = isPhotographyGallery ? '#dceae6' : isHeartGallery ? '#dfe7e2' : isPortraitLaylight ? '#edd8b7' : isWinterConservatory ? '#eaf0e7' : gallery.light
  return (
    <group userData={isHeartGallery ? { skylight: 'mineral-gallery-laylight' } : isPhotographyGallery ? { skylight: 'north-light-roof-monitor' } : isWinterConservatory ? { skylight: 'winter-garden-laylight' } : undefined}>
      {isHeartOculus ? (
        <OutlineMesh
          position={[skylightX, 3.01, z]}
          rotation={[Math.PI / 2, 0, 0]}
          outlineWidth={0.018}
          geometry={<torusGeometry args={[1.42, 0.1, 16, 48]} />}
          material={<meshToonMaterial color="#aebbb7" gradientMap={TOON_RAMP} />}
        />
      ) : isHeartGallery ? (
        <group position={[0, 3.07, z]}>
          <MuseumBox position={[-spec.width * 0.5 + 0.06, 0, 0]} scale={[0.12, 0.12, spec.depth]} color="#aebbb7" outlineWidth={0.01} />
          <MuseumBox position={[spec.width * 0.5 - 0.06, 0, 0]} scale={[0.12, 0.12, spec.depth]} color="#aebbb7" outlineWidth={0.01} />
          <MuseumBox position={[0, 0, -spec.depth * 0.5 + 0.06]} scale={[spec.width - 0.12, 0.12, 0.12]} color="#aebbb7" outlineWidth={0.01} />
          <MuseumBox position={[0, 0, spec.depth * 0.5 - 0.06]} scale={[spec.width - 0.12, 0.12, 0.12]} color="#aebbb7" outlineWidth={0.01} />
        </group>
      ) : isPhotographyGallery ? (
        <group position={[0, 3.04, z]} userData={{ opening: 'recessed-north-light-monitor' }}>
          <MuseumBox position={[-spec.width * 0.5 + 0.06, 0, 0]} scale={[0.12, 0.14, spec.depth]} color="#a4b1aa" outlineWidth={0.006} />
          <MuseumBox position={[spec.width * 0.5 - 0.06, 0, 0]} scale={[0.12, 0.14, spec.depth]} color="#a4b1aa" outlineWidth={0.006} />
          <MuseumBox position={[0, 0, -spec.depth * 0.5 + 0.06]} scale={[spec.width - 0.12, 0.14, 0.12]} color="#a4b1aa" outlineWidth={0.006} />
          <MuseumBox position={[0, 0, spec.depth * 0.5 - 0.06]} scale={[spec.width - 0.12, 0.14, 0.12]} color="#a4b1aa" outlineWidth={0.006} />
        </group>
      ) : isWinterConservatory ? (
        <group position={[0, 3.07, z]}>
          <MuseumBox position={[-spec.width * 0.5 + 0.055, 0, 0]} scale={[0.11, 0.1, spec.depth]} color="#52685a" outlineWidth={0.01} />
          <MuseumBox position={[spec.width * 0.5 - 0.055, 0, 0]} scale={[0.11, 0.1, spec.depth]} color="#52685a" outlineWidth={0.01} />
          <MuseumBox position={[0, 0, -spec.depth * 0.5 + 0.05]} scale={[spec.width - 0.11, 0.1, 0.1]} color="#52685a" outlineWidth={0.01} />
          <MuseumBox position={[0, 0, spec.depth * 0.5 - 0.05]} scale={[spec.width - 0.11, 0.1, 0.1]} color="#52685a" outlineWidth={0.01} />
        </group>
      ) : isPortraitLaylight ? (
        <group position={[0, 3.07, z]} userData={{ opening: 'recessed-portrait-laylight' }}>
          <MuseumBox position={[-spec.width * 0.5 + 0.055, 0, 0]} scale={[0.11, 0.1, spec.depth]} color="#80664d" outlineWidth={0.008} />
          <MuseumBox position={[spec.width * 0.5 - 0.055, 0, 0]} scale={[0.11, 0.1, spec.depth]} color="#80664d" outlineWidth={0.008} />
          <MuseumBox position={[0, 0, -spec.depth * 0.5 + 0.055]} scale={[spec.width - 0.22, 0.1, 0.11]} color="#80664d" outlineWidth={0.008} />
          <MuseumBox position={[0, 0, spec.depth * 0.5 - 0.055]} scale={[spec.width - 0.22, 0.1, 0.11]} color="#80664d" outlineWidth={0.008} />
        </group>
      ) : (
        <MuseumBox position={[0, 3.07, z]} scale={[spec.width, 0.16, spec.depth]} color={gallery.trim} outlineWidth={0.035} />
      )}
      <mesh
        position={[skylightX, isPhotographyGallery ? 3.105 : 2.975, z]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={isHeartOculus ? [1.31, 1.31, 1] : [spec.width - 0.34, spec.depth - 0.28, 1]}
      >
        {isHeartOculus ? <circleGeometry args={[1, 48]} /> : <planeGeometry args={[1, 1]} />}
        <meshBasicMaterial
          color={panelColor}
          transparent={isPortraitLaylight || isHeartGallery || isPhotographyGallery || isWinterConservatory}
          opacity={isPhotographyGallery ? active ? 0.5 : 0.17 : isHeartGallery ? active ? 0.72 : 0.22 : isPortraitLaylight ? active ? 0.58 : 0.18 : isWinterConservatory ? active ? 0.5 : 0.18 : 1}
          depthWrite={!isPortraitLaylight && !isHeartGallery && !isPhotographyGallery && !isWinterConservatory}
          toneMapped={isPortraitLaylight || isPhotographyGallery || isWinterConservatory}
          side={THREE.DoubleSide}
        />
      </mesh>
      {!isHeartOculus ? isPortraitLaylight ? (
        <>
          {[-0.24, 0, 0.24].map((offset) => (
            <MuseumBox
              key={offset}
              position={[offset * spec.width, 2.96, z]}
              scale={[0.055, 0.1, spec.depth - 0.2]}
              color="#8a6e4c"
              outlineWidth={0.005}
            />
          ))}
          <MuseumBox position={[0, 2.96, z]} scale={[spec.width - 0.3, 0.08, 0.045]} color="#8a6e4c" outlineWidth={0.005} />
        </>
      ) : isHeartGallery ? (
        <>
          <MuseumBox position={[0, 2.96, z]} scale={[0.05, 0.08, spec.depth - 0.16]} color="#aebbb7" outlineWidth={0.006} />
          <MuseumBox position={[0, 2.96, z]} scale={[spec.width - 0.18, 0.08, 0.05]} color="#aebbb7" outlineWidth={0.006} />
        </>
      ) : isPhotographyGallery ? (
        <MuseumBox position={[0, 3.09, z]} scale={[0.04, 0.055, spec.depth - 0.18]} color="#899890" outlineWidth={0.004} />
      ) : isWinterConservatory ? (
        <MuseumBox position={[0, 2.96, z]} scale={[0.05, 0.065, spec.depth - 0.14]} color="#9b8050" outlineWidth={0.006} />
      ) : (
        <MuseumBox position={[0, 2.96, z]} scale={[0.11, 0.12, spec.depth - 0.24]} color={gallery.trim} outlineWidth={0.02} />
      ) : null}
      {active ? (
        <mesh
          position={[skylightX + spec.drift, isPortraitLaylight ? -1.892 : -1.9, z + spec.drift * 0.42]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={isHeartOculus ? [2.15, 2.15, 1] : isPhotographyGallery ? [spec.width * 0.72, spec.depth * 1.04, 1] : [spec.width * 0.72, spec.depth * 1.1, 1]}
        >
          {isHeartOculus ? <circleGeometry args={[1, 48]} /> : <planeGeometry args={[1, 1]} />}
          <meshBasicMaterial
            color={panelColor}
            transparent
            opacity={isPhotographyGallery ? 0.04 : isHeartGallery ? isHeartOculus ? 0.04 : 0.02 : isPortraitLaylight ? 0.03 : isWinterConservatory ? 0.035 : 0.22}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.NormalBlending}
          />
        </mesh>
      ) : null}
    </group>
  )
}

function PortraitParquetField({ gallery }: { gallery: MuseumGalleryPlan }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { minZ, maxZ } = gallery
  const boards = useMemo(
    () => museumMobaOneParquetBoards({ minZ, maxZ }),
    [maxZ, minZ],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()

    boards.forEach((board, index) => {
      dummy.position.set(board.x, -1.906, board.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(board.width, 0.012, board.depth)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingBox()
    mesh.computeBoundingSphere()
  }, [boards])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, boards.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#5f4037" toneMapped />
    </instancedMesh>
  )
}

type HeartTerrazzoChip = ReturnType<typeof museumMobaTwoTerrazzoChips>[number]

function HeartTerrazzoChipLayer({ chips, color }: { chips: readonly HeartTerrazzoChip[]; color: string }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()

    chips.forEach((chip, index) => {
      dummy.position.set(chip.x, -1.893, chip.z)
      dummy.rotation.set(-Math.PI / 2, 0, chip.rotation)
      dummy.scale.set(chip.radius * chip.stretch, chip.radius, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingBox()
    mesh.computeBoundingSphere()
  }, [chips])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, chips.length]}>
      <circleGeometry args={[1, 12]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  )
}

function HeartTerrazzoChipField({ gallery }: { gallery: MuseumGalleryPlan }) {
  const { minZ, maxZ } = gallery
  const chips = useMemo(
    () => museumMobaTwoTerrazzoChips({ minZ, maxZ }),
    [maxZ, minZ],
  )
  const layers = useMemo(() => Array.from(new Set(chips.map((chip) => chip.color))).map((color) => ({
    color,
    chips: chips.filter((chip) => chip.color === color),
  })), [chips])
  return (
    <group userData={{ detail: 'curated-mineral-aggregate' }}>
      {layers.map((layer) => (
        <HeartTerrazzoChipLayer
          key={layer.color}
          color={layer.color}
          chips={layer.chips}
        />
      ))}
    </group>
  )
}

function GalleryFloorDesign({ gallery, interior, active }: { gallery: MuseumGalleryPlan; interior: MuseumGalleryInteriorPlan; active: boolean }) {
  const depth = gallery.maxZ - gallery.minZ
  const centerZ = (gallery.minZ + gallery.maxZ) / 2
  if (interior.floorPattern === 'parquet') {
    return (
      <group userData={{ floor: 'walnut-herringbone', quietWayfinding: true }}>
        <mesh position={[0, -1.927, centerZ]} rotation={[-Math.PI / 2, 0, 0]} scale={[10.9, depth - 0.62, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#44302b" toneMapped />
        </mesh>
        <mesh position={[0, -1.919, centerZ]} rotation={[-Math.PI / 2, 0, 0]} scale={[9.62, depth - 1.42, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#503831" toneMapped />
        </mesh>
        <PortraitParquetField gallery={gallery} />
        <MuseumBox position={[-4.92, -1.908, centerZ]} scale={[0.14, 0.018, depth - 1.04]} color="#46302b" outlineWidth={0.006} />
        <MuseumBox position={[4.92, -1.908, centerZ]} scale={[0.14, 0.018, depth - 1.04]} color="#46302b" outlineWidth={0.006} />
        <MuseumBox position={[0, -1.908, gallery.minZ + 0.52]} scale={[9.98, 0.018, 0.14]} color="#46302b" outlineWidth={0.006} />
        <MuseumBox position={[0, -1.908, gallery.maxZ - 0.52]} scale={[9.98, 0.018, 0.14]} color="#46302b" outlineWidth={0.006} />
      </group>
    )
  }
  if (interior.floorPattern === 'terrazzo') {
    return (
      <group userData={{ floor: 'pearly-mineral-terrazzo', quietWayfinding: true }}>
        <mesh position={[0, -1.925, centerZ]} rotation={[-Math.PI / 2, 0, 0]} scale={[10.82, depth - 0.68, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshToonMaterial color="#b8c0bb" gradientMap={TOON_RAMP} />
        </mesh>
        {[0.25, 0.5, 0.75].map((t) => (
          <MuseumBox
            key={t}
            position={[0, -1.906, museumGalleryZ(gallery, t, 0.52)]}
            scale={[10.65, 0.014, 0.018]}
            color="#929c98"
            outlineWidth={0.002}
          />
        ))}
        <HeartTerrazzoChipField gallery={gallery} />
        <MuseumBox position={[-5.05, -1.908, centerZ]} scale={[0.065, 0.016, depth - 0.84]} color="#7f8e8b" outlineWidth={0.003} />
        <MuseumBox position={[5.05, -1.908, centerZ]} scale={[0.065, 0.016, depth - 0.84]} color="#7f8e8b" outlineWidth={0.003} />
      </group>
    )
  }
  if (interior.floorPattern === 'limestone') {
    const staggeredJoints = [0.1, 0.3, 0.5, 0.7, 0.9] as const
    return (
      <group userData={{ floor: 'staggered-honed-limestone', quietWayfinding: true }}>
        <mesh position={[0, -1.925, centerZ]} rotation={[-Math.PI / 2, 0, 0]} scale={[10.8, depth - 0.7, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshToonMaterial color="#d2ccc0" gradientMap={TOON_RAMP} emissive="#d2ccc0" emissiveIntensity={0.025} />
        </mesh>
        {[0.2, 0.4, 0.6, 0.8].map((t) => (
          <MuseumBox key={t} position={[0, -1.908, museumGalleryZ(gallery, t, 0.5)]} scale={[10.55, 0.012, 0.014]} color="#aaa79f" outlineWidth={0.0015} />
        ))}
        {staggeredJoints.map((t, index) => (
          <MuseumBox
            key={t}
            position={[index % 2 === 0 ? -1.76 : 1.76, -1.907, museumGalleryZ(gallery, t, 0.52)]}
            scale={[0.014, 0.014, Math.max(0.6, (depth - 1.04) * 0.18)]}
            color="#b0ada5"
            outlineWidth={0.0015}
          />
        ))}
        <MuseumBox position={[-5.04, -1.908, centerZ]} scale={[0.04, 0.012, depth - 0.84]} color="#9b9e97" outlineWidth={0.0015} />
        <MuseumBox position={[5.04, -1.908, centerZ]} scale={[0.04, 0.012, depth - 0.84]} color="#9b9e97" outlineWidth={0.0015} />
      </group>
    )
  }
  if (interior.floorPattern === 'winter-rug') {
    return (
      <group userData={{ floor: 'smoked-oak-and-fir-runner', quietWayfinding: true }}>
      <mesh position={[0, -1.925, centerZ]} rotation={[-Math.PI / 2, 0, 0]} scale={[10.82, depth - 0.68, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshToonMaterial color="#4b352d" gradientMap={TOON_RAMP} emissive="#68463b" emissiveIntensity={active ? 0.075 : 0.01} />
      </mesh>
      {[-4.25, -2.85, -1.43, 1.43, 2.85, 4.25].map((x) => (
        <MuseumBox key={x} position={[x, -1.91, centerZ]} scale={[0.018, 0.012, depth - 0.9]} color="#382720" outlineWidth={0.002} />
      ))}
      <mesh position={[0, -1.903, centerZ]} rotation={[-Math.PI / 2, 0, 0]} scale={[4.82, depth - 3, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshToonMaterial color="#7a4b50" gradientMap={TOON_RAMP} emissive="#9a676a" emissiveIntensity={active ? 0.07 : 0.008} />
      </mesh>
      <mesh position={[0, -1.894, centerZ]} rotation={[-Math.PI / 2, 0, 0]} scale={[4.34, depth - 3.38, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshToonMaterial color="#31483b" gradientMap={TOON_RAMP} emissive="#54715f" emissiveIntensity={active ? 0.08 : 0.01} />
      </mesh>
      {[0.27, 0.5, 0.73].map((t) => (
        <MuseumBox key={t} position={[0, -1.883, museumGalleryZ(gallery, t, 1.82)]} scale={[4.1, 0.012, 0.025]} color="#675342" outlineWidth={0.002} />
      ))}
      <MuseumBox position={[-5.05, -1.908, centerZ]} scale={[0.08, 0.016, depth - 0.84]} color="#2d211d" outlineWidth={0.004} />
      <MuseumBox position={[5.05, -1.908, centerZ]} scale={[0.08, 0.016, depth - 0.84]} color="#2d211d" outlineWidth={0.004} />
      </group>
    )
  }
  return null
}

function GalleryWallArchitecture({
  gallery,
  interior,
  active,
}: {
  gallery: MuseumGalleryPlan
  interior: MuseumGalleryInteriorPlan
  active: boolean
}) {
  const depth = gallery.maxZ - gallery.minZ
  const centerZ = (gallery.minZ + gallery.maxZ) / 2
  const surfaceLighting = MUSEUM_GALLERY_SURFACE_LIGHTING[gallery.id as PermanentMuseumGalleryId]
  const lowerWallEmissiveIntensity = active
    ? surfaceLighting.activeLowerWallEmissiveIntensity
    : surfaceLighting.inactiveLowerWallEmissiveIntensity
  const isPortraitSalon = interior.architecture === 'portrait-salon'
  const isHeartGallery = interior.architecture === 'heart-gallery'
  const isPhotographyGallery = interior.architecture === 'daylight-gallery'
  const isWinterGallery = interior.architecture === 'winter-conservatory'
  const bayTs = isPortraitSalon || isHeartGallery || isPhotographyGallery || isWinterGallery ? [] : [0.17, 0.5, 0.83]
  return (
    <group>
      {([-1, 1] as const).map((side) => {
        const wall = side < 0 ? 'left' : 'right'
        const openings = museumGalleryWallOpenings(gallery, wall).map((opening) => opening.bounds)
        const wallPanels = museumGalleryWallPanels(gallery, wall)
        const panelsAcrossY = (y: number) => wallPanels
          .filter((panel) => (
            panel.centerY - panel.height * 0.5 <= y
            && panel.centerY + panel.height * 0.5 >= y
          ))
        const lowRailPanels = panelsAcrossY(isPortraitSalon ? -1.45 : isHeartGallery ? -1.43 : -1.08)
        const accentRailPanels = panelsAcrossY(isPortraitSalon ? -0.94 : isHeartGallery ? -1.82 : -0.18)
        const highRailPanels = panelsAcrossY(isPortraitSalon ? 1.55 : isHeartGallery ? 2.42 : 1.72)
        const crownPanels = isPortraitSalon ? panelsAcrossY(2.68) : []
        if (isPhotographyGallery) {
          const dadoPanels = panelsAcrossY(-1.62)
          const basePanels = panelsAcrossY(-1.86)
          const pictureTrackPanels = panelsAcrossY(2.5)
          return (
            <group key={side} userData={{ wallArchitecture: 'limewash-and-low-stone-dado' }}>
              {dadoPanels.map((panel) => (
                <MuseumBox
                  key={`${panel.id}-photo-dado`}
                  position={[side * 5.79, -1.62, panel.centerZ]}
                  scale={[0.075, 0.5, Math.max(0.02, panel.width - 0.05)]}
                  color="#c8c7bf"
                  outlineWidth={0.006}
                  emissive={surfaceLighting.lowerWallEmissive}
                  emissiveIntensity={lowerWallEmissiveIntensity}
                />
              ))}
              {basePanels.map((panel) => (
                <MuseumBox
                  key={`${panel.id}-photo-base`}
                  position={[side * 5.72, -1.86, panel.centerZ]}
                  scale={[0.07, 0.1, Math.max(0.02, panel.width - 0.05)]}
                  color="#737d77"
                  outlineWidth={0.005}
                  emissive={surfaceLighting.lowerWallEmissive}
                  emissiveIntensity={lowerWallEmissiveIntensity * 0.65}
                />
              ))}
              {pictureTrackPanels.map((panel) => (
                <MuseumBox
                  key={`${panel.id}-photo-track`}
                  position={[side * 5.74, 2.5, panel.centerZ]}
                  scale={[0.055, 0.05, Math.max(0.02, panel.width - 0.05)]}
                  color="#bac0b8"
                  outlineWidth={0.004}
                />
              ))}
            </group>
          )
        }
        if (isWinterGallery) {
          const wainscotPanels = panelsAcrossY(-1.42)
          const basePanels = panelsAcrossY(-1.86)
          const dadoPanels = panelsAcrossY(-0.88)
          const crownPanels = panelsAcrossY(2.55)
          return (
            <group key={side} userData={{ wallArchitecture: 'cranberry-plaster-and-evergreen-wainscot' }}>
              {wainscotPanels.map((panel) => (
                <MuseumBox
                  key={`${panel.id}-winter-wainscot`}
                  position={[side * 5.79, -1.42, panel.centerZ]}
                  scale={[0.085, 0.96, Math.max(0.02, panel.width - 0.05)]}
                  color="#31483b"
                  outlineWidth={0.01}
                  emissive={surfaceLighting.lowerWallEmissive}
                  emissiveIntensity={lowerWallEmissiveIntensity}
                />
              ))}
              {basePanels.map((panel) => (
                <MuseumBox
                  key={`${panel.id}-winter-base`}
                  position={[side * 5.72, -1.86, panel.centerZ]}
                  scale={[0.075, 0.14, Math.max(0.02, panel.width - 0.05)]}
                  color="#3c2d27"
                  outlineWidth={0.007}
                />
              ))}
              {dadoPanels.map((panel) => (
                <MuseumBox
                  key={`${panel.id}-winter-dado`}
                  position={[side * 5.73, -0.88, panel.centerZ]}
                  scale={[0.065, 0.07, Math.max(0.02, panel.width - 0.05)]}
                  color="#a98b55"
                  outlineWidth={0.006}
                />
              ))}
              {crownPanels.map((panel) => (
                <MuseumBox
                  key={`${panel.id}-winter-crown`}
                  position={[side * 5.74, 2.55, panel.centerZ]}
                  scale={[0.09, 0.11, Math.max(0.02, panel.width - 0.05)]}
                  color="#ead9bf"
                  outlineWidth={0.008}
                />
              ))}
              {[0.18, 0.82]
                .filter((t) => {
                  const z = museumGalleryZ(gallery, t, 0.65)
                  return !openings.some((opening) => z > opening.minZ - 0.12 && z < opening.maxZ + 0.12)
                })
                .map((t) => (
                  <group key={t}>
                    <MuseumBox
                      position={[side * 5.75, 0.78, museumGalleryZ(gallery, t, 0.65)]}
                      scale={[0.06, 3.18, 0.09]}
                      color="#8d6269"
                      outlineWidth={0.008}
                    />
                    <MuseumBox
                      position={[side * 5.73, 2.39, museumGalleryZ(gallery, t, 0.65)]}
                      scale={[0.08, 0.07, 0.18]}
                      color="#a98b55"
                      outlineWidth={0.006}
                    />
                  </group>
                ))}
            </group>
          )
        }
        return (
          <group key={side}>
            {lowRailPanels.map((panel) => (
              <group key={`${panel.id}-wainscot`}>
                <MuseumBox
                  position={[side * 5.79, isPortraitSalon ? -1.45 : isHeartGallery ? -1.43 : -1.08, panel.centerZ]}
                  scale={[isHeartGallery ? 0.08 : isPortraitSalon ? 0.09 : 0.1, isPortraitSalon ? 0.96 : isHeartGallery ? 0.86 : 1.56, Math.max(0.02, panel.width - 0.05)]}
                  color={isHeartGallery ? '#718b93' : isPortraitSalon ? '#5b3d39' : gallery.trim}
                  outlineWidth={isPortraitSalon ? 0.008 : isHeartGallery ? 0.008 : 0.018}
                  emissive={surfaceLighting.lowerWallEmissive}
                  emissiveIntensity={lowerWallEmissiveIntensity}
                />
                {isHeartGallery && panel.width > 0.78 ? (
                  <MuseumBox
                    position={[side * 5.72, -1.43, panel.centerZ]}
                    scale={[0.04, 0.54, Math.max(0.24, panel.width - 0.34)]}
                    color="#7f979d"
                    outlineWidth={0.004}
                    emissive={surfaceLighting.lowerWallEmissive}
                    emissiveIntensity={lowerWallEmissiveIntensity * 0.78}
                  />
                ) : null}
                {isPortraitSalon && panel.width > 0.72 ? (
                  <MuseumBox
                    position={[side * 5.72, -1.45, panel.centerZ]}
                    scale={[0.04, 0.68, Math.max(0.2, panel.width - 0.38)]}
                    color="#754e48"
                    outlineWidth={0.005}
                    emissive={surfaceLighting.lowerWallEmissive}
                    emissiveIntensity={lowerWallEmissiveIntensity * 0.78}
                  />
                ) : null}
              </group>
            ))}
            {accentRailPanels.map((panel) => (
              <MuseumBox
                key={`${panel.id}-accent`}
                position={[side * 5.72, isPortraitSalon ? -0.94 : isHeartGallery ? -1.82 : -0.18, panel.centerZ]}
                scale={[isHeartGallery ? 0.07 : 0.08, isPortraitSalon ? 0.065 : isHeartGallery ? 0.14 : 0.1, Math.max(0.02, panel.width - 0.05)]}
                color={isPortraitSalon ? '#7b574b' : isHeartGallery ? '#40545a' : interior.architecture === 'daylight-gallery' ? '#aeb5b0' : AGED_BRASS}
                outlineWidth={isPortraitSalon ? 0.004 : isHeartGallery ? 0.006 : 0.01}
              />
            ))}
            {highRailPanels.map((panel) => (
              <MuseumBox
                key={`${panel.id}-rail`}
                position={[side * 5.76, isPortraitSalon ? 1.55 : isHeartGallery ? 2.42 : 1.72, panel.centerZ]}
                scale={[isHeartGallery ? 0.06 : isPortraitSalon ? 0.075 : 0.09, isPortraitSalon ? 0.055 : isHeartGallery ? 0.055 : 0.11, Math.max(0.02, panel.width - 0.05)]}
                color={isPortraitSalon ? '#60423a' : isHeartGallery ? '#d8e0dc' : gallery.trim}
                outlineWidth={isPortraitSalon ? 0.004 : isHeartGallery ? 0.006 : 0.012}
              />
            ))}
            {crownPanels.map((panel) => (
              <MuseumBox
                key={`${panel.id}-crown`}
                position={[side * 5.77, 2.68, panel.centerZ]}
                scale={[0.1, 0.11, Math.max(0.02, panel.width - 0.05)]}
                color={isPortraitSalon ? '#66463f' : gallery.trim}
                outlineWidth={isPortraitSalon ? 0.006 : 0.009}
              />
            ))}
            {bayTs
              .filter((t) => {
                const z = museumGalleryZ(gallery, t, 0.65)
                return !openings.some((opening) => z > opening.minZ - 0.12 && z < opening.maxZ + 0.12)
              })
              .map((t) => (
                <MuseumBox
                  key={t}
                  position={[side * 5.76, 0.72, museumGalleryZ(gallery, t, 0.65)]}
                  scale={[
                    isPortraitSalon ? 0.065 : 0.13,
                    isPortraitSalon ? 3.7 : interior.architecture === 'heart-gallery' ? 3.55 : 4.25,
                    isPortraitSalon ? 0.1 : 0.2,
                  ]}
                  color={isPortraitSalon ? '#68454d' : gallery.trim}
                  outlineWidth={isPortraitSalon ? 0.008 : 0.025}
                />
              ))}
          </group>
        )
      })}
      {!isPortraitSalon && !isHeartGallery && !isPhotographyGallery && !isWinterGallery ? (
        <>
          <MuseumBox position={[-2.58, 3.05, centerZ]} scale={[0.13, 0.18, depth - 0.85]} color={gallery.trim} outlineWidth={0.025} />
          <MuseumBox position={[2.58, 3.05, centerZ]} scale={[0.13, 0.18, depth - 0.85]} color={gallery.trim} outlineWidth={0.025} />
        </>
      ) : null}
    </group>
  )
}

function GalleryCeilingCharacter({ gallery, interior }: { gallery: MuseumGalleryPlan; interior: MuseumGalleryInteriorPlan }) {
  if (interior.architecture === 'portrait-salon') {
    const depth = gallery.maxZ - gallery.minZ
    const centerZ = (gallery.minZ + gallery.maxZ) / 2
    return (
      <group userData={{ ceiling: 'walnut-and-plaster-coffers' }}>
        <MuseumBox
          position={[0, 3.02, museumGalleryZ(gallery, 0.5, 0.58)]}
          scale={[9.5, 0.055, 0.09]}
          color="#c7b198"
          outlineWidth={0.006}
        />
        <MuseumBox position={[-5.12, 3.01, centerZ]} scale={[0.11, 0.09, depth - 0.78]} color="#bda58e" outlineWidth={0.006} />
        <MuseumBox position={[5.12, 3.01, centerZ]} scale={[0.11, 0.09, depth - 0.78]} color="#bda58e" outlineWidth={0.006} />
        <MuseumBox position={[-4.82, 2.985, centerZ]} scale={[0.055, 0.04, depth - 1.02]} color="#76564a" outlineWidth={0.004} />
        <MuseumBox position={[4.82, 2.985, centerZ]} scale={[0.055, 0.04, depth - 1.02]} color="#76564a" outlineWidth={0.004} />
      </group>
    )
  }

  if (interior.architecture === 'heart-gallery') {
    const depth = gallery.maxZ - gallery.minZ
    const centerZ = (gallery.minZ + gallery.maxZ) / 2
    return (
      <group userData={{ ceiling: 'pale-plaster-laylight-coves' }}>
        <MuseumBox position={[-5.15, 3.01, centerZ]} scale={[0.12, 0.11, depth - 0.75]} color="#bdc8c4" outlineWidth={0.008} />
        <MuseumBox position={[5.15, 3.01, centerZ]} scale={[0.12, 0.11, depth - 0.75]} color="#bdc8c4" outlineWidth={0.008} />
        <MuseumBox position={[-4.82, 2.985, centerZ]} scale={[0.055, 0.04, depth - 1.02]} color="#d6ded9" outlineWidth={0.004} />
        <MuseumBox position={[4.82, 2.985, centerZ]} scale={[0.055, 0.04, depth - 1.02]} color="#d6ded9" outlineWidth={0.004} />
        {[0.33, 0.67].map((t) => (
          <MuseumBox
            key={t}
            position={[0, 3.015, museumGalleryZ(gallery, t, 0.62)]}
            scale={[10, 0.06, 0.08]}
            color="#c8d1cc"
            outlineWidth={0.005}
          />
        ))}
      </group>
    )
  }

  if (interior.architecture === 'daylight-gallery') {
    const depth = gallery.maxZ - gallery.minZ
    const centerZ = (gallery.minZ + gallery.maxZ) / 2
    return (
      <group userData={{ ceiling: 'asymmetric-north-light-monitors' }}>
        <MuseumBox position={[-5.12, 3.01, centerZ]} scale={[0.1, 0.09, depth - 0.74]} color="#c6c8c0" outlineWidth={0.006} />
        <MuseumBox position={[5.12, 3.01, centerZ]} scale={[0.1, 0.09, depth - 0.74]} color="#c6c8c0" outlineWidth={0.006} />
        {interior.skylights.map((spec, index) => {
          const z = museumGalleryZ(gallery, spec.t, 0.95)
          return (
            <group key={spec.id}>
              <MuseumBox
                position={[spec.width * 0.5 + 0.08, 3.01, z]}
                scale={[0.13, 0.2, spec.depth + 0.16]}
                rotation={[0, 0, -0.06]}
                color={index === 1 ? '#aeb9b3' : '#c5cbc4'}
                outlineWidth={0.006}
              />
              <MuseumBox
                position={[0, 3.015, z - spec.depth * 0.5 - 0.07]}
                scale={[spec.width + 0.18, 0.07, 0.1]}
                color="#a2ada7"
                outlineWidth={0.004}
              />
            </group>
          )
        })}
      </group>
    )
  }

  if (interior.architecture === 'winter-conservatory') {
    const depth = gallery.maxZ - gallery.minZ
    const centerZ = (gallery.minZ + gallery.maxZ) / 2
    return (
      <group userData={{ ceiling: 'winter-conservatory-rafters' }}>
        <MuseumBox position={[-5.1, 3.01, centerZ]} scale={[0.11, 0.1, depth - 0.74]} color="#52685a" outlineWidth={0.01} />
        <MuseumBox position={[5.1, 3.01, centerZ]} scale={[0.11, 0.1, depth - 0.74]} color="#52685a" outlineWidth={0.01} />
        <MuseumBox position={[-4.78, 3.005, centerZ]} scale={[0.09, 0.055, depth - 1]} color="#d8cbb6" outlineWidth={0.006} />
        <MuseumBox position={[4.78, 3.005, centerZ]} scale={[0.09, 0.055, depth - 1]} color="#d8cbb6" outlineWidth={0.006} />
        {[0.2, 0.5, 0.8].map((t) => (
          <MuseumBox
            key={t}
            position={[0, 3.015, museumGalleryZ(gallery, t, 0.62)]}
            scale={[10.08, 0.08, 0.1]}
            color="#4a6151"
            outlineWidth={0.008}
          />
        ))}
      </group>
    )
  }

  return (
    <group>
      {[0.17, 0.5, 0.83].flatMap((t) => {
        const z = museumGalleryZ(gallery, t, 0.62)
        return [
          <MuseumBox key={`${t}-left`} position={[-2.55, 2.91, z]} scale={[5.2, 0.13, 0.2]} rotation={[0, 0, 0.12]} color="#342940" outlineWidth={0.032} />,
          <MuseumBox key={`${t}-right`} position={[2.55, 2.91, z]} scale={[5.2, 0.13, 0.2]} rotation={[0, 0, -0.12]} color="#342940" outlineWidth={0.032} />,
        ]
      })}
    </group>
  )
}

function GalleryEndWall({ gallery }: { gallery: MuseumGalleryPlan }) {
  const z = gallery.maxZ - 0.18
  const casingZ = museumGalleryBoundaryCasingZ(z)
  const isPortraitSalon = gallery.id === 'moba-one'
  const isPhotographyGallery = gallery.id === 'photography'
  const opening = museumGalleryBoundaryOpening(gallery, 'end')
  const wallPanels = museumGalleryBoundaryWallPanels(gallery, 'end')
  const frameColor = isPhotographyGallery ? '#78857e' : isPortraitSalon ? '#4b332e' : gallery.trim
  return (
    <group>
      {wallPanels.map((panel) => (
        <MuseumStructuralBox
          key={panel.id}
          position={[panel.centerX, 0.28, z]}
          scale={[panel.width, 5.42, MUSEUM_GALLERY_BOUNDARY_WALL_THICKNESS]}
          color={gallery.wallLight}
        />
      ))}
      <MuseumBox position={[opening.centerX, 2.78, z]} scale={[opening.width, isPhotographyGallery ? 0.54 : isPortraitSalon ? 0.5 : 0.72, MUSEUM_GALLERY_BOUNDARY_WALL_THICKNESS]} color={frameColor} outlineWidth={isPhotographyGallery ? 0.032 : isPortraitSalon ? 0.03 : 0.06} />
      <MuseumBox position={[opening.minX - (isPortraitSalon ? 0.11 : 0.14), 0.24, casingZ]} scale={[isPhotographyGallery || isPortraitSalon ? 0.22 : 0.28, 4.72, MUSEUM_GALLERY_BOUNDARY_CASING_DEPTH]} color={frameColor} outlineWidth={isPhotographyGallery ? 0.02 : isPortraitSalon ? 0.022 : 0.035} />
      <MuseumBox position={[opening.maxX + (isPortraitSalon ? 0.11 : 0.14), 0.24, casingZ]} scale={[isPhotographyGallery || isPortraitSalon ? 0.22 : 0.28, 4.72, MUSEUM_GALLERY_BOUNDARY_CASING_DEPTH]} color={frameColor} outlineWidth={isPhotographyGallery ? 0.02 : isPortraitSalon ? 0.022 : 0.035} />
      <MuseumBox position={[opening.centerX, 2.38, z - 0.14]} scale={[opening.width - 0.18, isPortraitSalon ? 0.07 : 0.09, isPortraitSalon ? 0.12 : 0.16]} color={isPhotographyGallery ? gallery.accent : AGED_BRASS} outlineWidth={isPhotographyGallery ? 0.008 : isPortraitSalon ? 0.008 : 0.014} />
      {isPortraitSalon ? (
        <MuseumBox position={[opening.centerX, 3.01, z - 0.08]} scale={[opening.width + 0.78, 0.07, 0.16]} color="#c7ad91" outlineWidth={0.006} />
      ) : null}
    </group>
  )
}

function GalleryBench({ gallery, interior }: { gallery: MuseumGalleryPlan; interior: MuseumGalleryInteriorPlan }) {
  const bench = interior.bench
  const z = museumGalleryZ(gallery, bench.t, 1.1)
  if (gallery.id === 'moba-one') {
    return (
      <group
        position={[bench.x, -1.93, z]}
        rotation={[0, bench.rotationY, 0]}
        userData={{ furniture: 'portrait-salon-bench' }}
      >
        <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[bench.length * 0.62, bench.depth * 0.72, 1]} renderOrder={0}>
          <circleGeometry args={[1, 32]} />
          <meshBasicMaterial color="#17131d" transparent opacity={0.08} depthWrite={false} />
        </mesh>
        <MuseumBox position={[0, 0.34, 0]} scale={[bench.length * 0.88, 0.13, bench.depth * 0.62]} color={bench.frame} outlineWidth={0.014} />
        <MuseumBox position={[0, 0.48, 0]} scale={[bench.length, 0.2, bench.depth]} color={bench.upholstery} outlineWidth={0.022} />
        <MuseumBox position={[0, 0.6, 0]} scale={[bench.length * 0.96, 0.08, bench.depth * 0.9]} color="#936171" outlineWidth={0.012} />
        <MuseumBox position={[0, 0.25, 0]} scale={[bench.length * 0.82, 0.09, bench.depth * 0.54]} color="#4b3028" outlineWidth={0.006} />
        {([-1, 1] as const).map((side) => (
          <MuseumBox
            key={`piping-${side}`}
            position={[0, 0.655, side * bench.depth * 0.43]}
            scale={[bench.length * 0.92, 0.022, 0.026]}
            color="#b0915e"
            outlineWidth={0.003}
          />
        ))}
        {([-1, 1] as const).flatMap((side) => [-1, 1].map((front) => (
          <MuseumCylinder
            key={`${side}-${front}`}
            position={[side * bench.length * 0.4, 0.16, front * bench.depth * 0.32]}
            scale={[0.095, 0.38, 0.095]}
            rotation={[0, 0, side * 0.04]}
            color={bench.frame}
            outlineWidth={0.012}
            segments={12}
          />
        )))}
        {[-0.26, 0, 0.26].flatMap((offset) => [-0.18, 0.18].map((depthOffset) => (
          <MuseumSphere
            key={`${offset}-${depthOffset}`}
            position={[offset * bench.length, 0.65, depthOffset * bench.depth]}
            scale={[0.04, 0.018, 0.04]}
            color="#5e3640"
            outlineWidth={0.004}
          />
        )))}
      </group>
    )
  }
  if (gallery.id === 'moba-two') {
    return (
      <group
        position={[bench.x, -1.93, z]}
        rotation={[0, bench.rotationY, 0]}
        userData={{ furniture: 'mineral-gallery-oak-bench' }}
      >
        <MuseumBox position={[0, 0.5, 0]} scale={[bench.length, 0.16, bench.depth]} color={bench.upholstery} outlineWidth={0.018} />
        {([-1, 1] as const).map((front) => (
          <MuseumBox
            key={`piping-front-${front}`}
            position={[0, 0.585, front * bench.depth * 0.45]}
            scale={[bench.length * 0.91, 0.025, 0.025]}
            color="#d2a0ab"
            outlineWidth={0.003}
          />
        ))}
        {([-1, 1] as const).map((side) => (
          <MuseumBox
            key={`piping-side-${side}`}
            position={[side * bench.length * 0.455, 0.585, 0]}
            scale={[0.025, 0.025, bench.depth * 0.86]}
            color="#d2a0ab"
            outlineWidth={0.003}
          />
        ))}
        <MuseumBox position={[0, 0.36, 0]} scale={[bench.length * 0.9, 0.08, bench.depth * 0.58]} color={bench.frame} outlineWidth={0.01} />
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * bench.length * 0.31, 0.17, 0]}>
            <MuseumBox position={[0, 0, 0]} scale={[0.12, 0.34, bench.depth * 0.58]} rotation={[0, 0, side * 0.06]} color={bench.frame} outlineWidth={0.01} />
            <MuseumBox position={[0, -0.14, 0]} scale={[0.28, 0.055, bench.depth * 0.72]} color="#8d7e66" outlineWidth={0.006} />
          </group>
        ))}
        <MuseumBox position={[0, 0.18, 0]} scale={[bench.length * 0.58, 0.06, 0.075]} color="#9c896a" outlineWidth={0.006} />
        {[-0.3, -0.1, 0.1, 0.3].map((offset) => (
          <MuseumSphere
            key={offset}
            position={[offset * bench.length, 0.59, 0]}
            scale={[0.025, 0.01, 0.025]}
            color="#55777a"
            outlineWidth={0.004}
          />
        ))}
      </group>
    )
  }
  if (gallery.id === 'photography') {
    return (
      <group
        position={[bench.x, -1.93, z]}
        rotation={[0, bench.rotationY, 0]}
        userData={{ furniture: 'north-light-ash-sled-bench' }}
      >
        <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[bench.length * 0.74, bench.depth * 1.28, 1]} renderOrder={1}>
          <circleGeometry args={[1, 32]} />
          <meshBasicMaterial color="#4d514d" transparent opacity={0.055} depthWrite={false} />
        </mesh>
        <MuseumBox position={[0, 0.5, 0]} scale={[bench.length, 0.17, bench.depth]} color={bench.upholstery} outlineWidth={0.014} />
        <MuseumBox position={[0, 0.36, 0]} scale={[bench.length * 0.91, 0.075, bench.depth * 0.56]} color={bench.frame} outlineWidth={0.008} />
        {([-1, 1] as const).map((side) => (
          <MuseumBox
            key={`photo-piping-${side}`}
            position={[0, 0.585, side * bench.depth * 0.465]}
            scale={[bench.length * 0.91, 0.018, 0.018]}
            color="#eee8dc"
            outlineWidth={0.002}
          />
        ))}
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * bench.length * 0.32, 0.19, 0]}>
            <MuseumBox position={[0, 0, 0]} scale={[0.1, 0.32, bench.depth * 0.58]} color="#75807a" outlineWidth={0.008} />
            <MuseumBox position={[0, -0.15, 0]} scale={[0.26, 0.05, bench.depth * 0.72]} color={bench.frame} outlineWidth={0.006} />
          </group>
        ))}
        <MuseumBox position={[0, 0.19, 0]} scale={[bench.length * 0.58, 0.055, 0.07]} color="#75807a" outlineWidth={0.006} />
      </group>
    )
  }
  if (gallery.id === 'holiday') {
    return (
      <group
        position={[bench.x, -1.93, z]}
        rotation={[0, bench.rotationY, 0]}
        userData={{ furniture: 'winter-salon-walnut-bench' }}
      >
        <MuseumBox position={[0, 0.5, 0]} scale={[bench.length, 0.17, bench.depth]} color={bench.upholstery} outlineWidth={0.022} />
        <MuseumBox position={[0, 0.36, 0]} scale={[bench.length * 0.9, 0.09, bench.depth * 0.6]} color={bench.frame} outlineWidth={0.012} />
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * bench.length * 0.32, 0.19, 0]}>
            <MuseumBox position={[0, 0, 0]} scale={[0.11, 0.32, bench.depth * 0.56]} color={bench.frame} outlineWidth={0.012} />
            <MuseumBox position={[0, -0.15, 0]} scale={[0.24, 0.06, bench.depth * 0.68]} color="#a98952" outlineWidth={0.007} />
          </group>
        ))}
        {([-1, 1] as const).map((side) => (
          <MuseumBox
            key={`seat-cap-${side}`}
            position={[side * bench.length * 0.47, 0.5, 0]}
            scale={[0.055, 0.19, bench.depth * 0.94]}
            color="#5b4333"
            outlineWidth={0.008}
          />
        ))}
        <MuseumBox position={[0, 0.18, 0]} scale={[bench.length * 0.62, 0.065, 0.09]} color="#3d2c25" outlineWidth={0.008} />
        {[-0.32, -0.16, 0, 0.16, 0.32].map((offset) => (
          <MuseumSphere
            key={offset}
            position={[offset * bench.length, 0.59, 0]}
            scale={[0.03, 0.012, 0.03]}
            color="#8e5b63"
            outlineWidth={0.005}
          />
        ))}
      </group>
    )
  }
  return (
    <group position={[bench.x, -1.93, z]} rotation={[0, bench.rotationY, 0]}>
      <MuseumBox position={[0, 0.38, 0]} scale={[bench.length, 0.24, bench.depth]} color={bench.frame} outlineWidth={0.05} />
      <MuseumBox position={[0, 0.58, -0.01]} scale={[bench.length * 0.91, 0.2, bench.depth * 0.86]} color={bench.upholstery} outlineWidth={0.034} />
      <MuseumBox position={[0, 0.22, 0]} scale={[bench.length * 0.84, 0.22, bench.depth * 0.62]} color={bench.frame} outlineWidth={0.034} />
      {([-1, 1] as const).flatMap((side) => [-1, 1].map((front) => (
        <MuseumBox
          key={`${side}-${front}`}
          position={[side * bench.length * 0.38, 0.08, front * bench.depth * 0.3]}
          scale={[0.18, 0.58, 0.18]}
          color={bench.frame}
          outlineWidth={0.03}
        />
      )))}
      <MuseumBox position={[bench.length * 0.28, 0.72, bench.depth * 0.34]} scale={[0.36, 0.075, 0.045]} color={BRASS} outlineWidth={0.012} />
    </group>
  )
}

function GalleryPlantVessel({ spec }: { spec: MuseumGalleryPlantSpec }) {
  if (spec.galleryId === 'moba-one') {
    return (
      <group>
        <MuseumCylinder position={[0, 0.24, 0]} scale={[0.72, 0.46, 0.72]} color="#4a332e" outlineWidth={0.022} segments={12} />
        <MuseumCylinder position={[0, 0.49, 0]} scale={[0.82, 0.1, 0.82]} color="#b0915e" outlineWidth={0.014} segments={12} />
        <MuseumCylinder position={[0, 0.55, 0]} scale={[0.62, 0.04, 0.62]} color="#211c1d" outlineWidth={0.006} segments={12} />
      </group>
    )
  }
  if (spec.galleryId === 'moba-two') {
    return (
      <group>
        <MuseumCylinder position={[0, 0.22, 0]} scale={[0.78, 0.42, 0.78]} color="#718f92" outlineWidth={0.02} segments={12} />
        <MuseumCylinder position={[0, 0.45, 0]} scale={[0.86, 0.09, 0.86]} color="#dde6e1" outlineWidth={0.013} segments={12} />
        <MuseumCylinder position={[0, 0.505, 0]} scale={[0.64, 0.04, 0.64]} color="#40545a" outlineWidth={0.006} segments={12} />
      </group>
    )
  }
  if (spec.galleryId === 'holiday') {
    return (
      <group>
        <MuseumCylinder position={[0, 0.22, 0]} scale={[0.78, 0.42, 0.78]} color="#6b303d" outlineWidth={0.022} segments={12} />
        <MuseumCylinder position={[0, 0.45, 0]} scale={[0.86, 0.09, 0.86]} color="#d0ae6c" outlineWidth={0.013} segments={12} />
        <MuseumCylinder position={[0, 0.505, 0]} scale={[0.64, 0.04, 0.64]} color="#3d3227" outlineWidth={0.006} segments={12} />
      </group>
    )
  }
  if (spec.family === 'river-still-life') {
    return (
      <group>
        <MuseumCylinder position={[0, 0.08, 0]} scale={[0.9, 0.12, 0.7]} color="#aaa89c" outlineWidth={0.014} segments={12} />
        <MuseumCylinder position={[-0.3, 0.17, 0.12]} scale={[0.3, 0.18, 0.26]} color="#777a70" outlineWidth={0.01} segments={10} />
        <MuseumCylinder position={[0.32, 0.15, -0.08]} scale={[0.24, 0.14, 0.2]} color="#c2bbae" outlineWidth={0.009} segments={10} />
      </group>
    )
  }
  const fieldGrass = spec.family === 'field-grass'
  return (
    <group>
      <MuseumCylinder
        position={[0, fieldGrass ? 0.16 : 0.2, 0]}
        scale={[fieldGrass ? 0.68 : 0.76, fieldGrass ? 0.3 : 0.38, fieldGrass ? 0.68 : 0.76]}
        color={fieldGrass ? '#c9c3b7' : '#956f60'}
        outlineWidth={0.018}
        segments={12}
      />
      <MuseumCylinder
        position={[0, fieldGrass ? 0.33 : 0.41, 0]}
        scale={[fieldGrass ? 0.74 : 0.82, 0.08, fieldGrass ? 0.74 : 0.82]}
        color={fieldGrass ? '#eee9de' : '#b98a75'}
        outlineWidth={0.011}
        segments={12}
      />
      <MuseumCylinder
        position={[0, fieldGrass ? 0.38 : 0.46, 0]}
        scale={[fieldGrass ? 0.56 : 0.62, 0.035, fieldGrass ? 0.56 : 0.62]}
        color="#4e493e"
        outlineWidth={0.005}
        segments={12}
      />
    </group>
  )
}

function GalleryPlantBotany({ spec }: { spec: MuseumGalleryPlantSpec }) {
  return <MuseumGalleryPlantBotany family={spec.family} />
}
function MuseumGalleryPlant({ spec }: { spec: MuseumGalleryPlantSpec }) {
  const position = museumGalleryPlantLocalPosition(spec)
  return (
    <group
      position={[...position]}
      rotation={[0, spec.yaw, 0]}
      scale={[spec.scale, spec.scale, spec.scale]}
      userData={{ museumPlant: spec.id, botanicalFamily: spec.family, gallery: spec.galleryId }}
    >
      <GalleryPlantVessel spec={spec} />
      <GalleryPlantBotany spec={spec} />
    </group>
  )
}

function GalleryBotanicals({ gallery }: { gallery: MuseumGalleryPlan }) {
  const plants = MUSEUM_GALLERY_PLANTS_BY_ID[gallery.id as keyof typeof MUSEUM_GALLERY_PLANTS_BY_ID] ?? []
  if (!plants.length) return null
  return (
    <group userData={{ galleryBotanicals: gallery.id, plantCount: plants.length }}>
      {plants.map((spec) => <MuseumGalleryPlant key={spec.id} spec={spec} />)}
    </group>
  )
}

function WinterSalonFestiveDetails({ gallery }: { gallery: MuseumGalleryPlan }) {
  const opening = museumGalleryBoundaryOpening(gallery, 'end')
  const berryAngles = [-2.65, -2.12, -1.55, -0.88, -0.24, 0.42, 1.04] as const
  const foliageAngles = [-2.4, -0.8, 0.8, 2.4] as const
  const swagNodes = [
    { x: -5.05, y: 0, berry: false },
    { x: -4.72, y: -0.1, berry: true },
    { x: -4.4, y: -0.16, berry: false },
    { x: -4.07, y: -0.1, berry: true },
    { x: -3.74, y: 0, berry: false },
    { x: 3.74, y: 0, berry: false },
    { x: 4.07, y: -0.1, berry: true },
    { x: 4.4, y: -0.16, berry: false },
    { x: 4.72, y: -0.1, berry: true },
    { x: 5.05, y: 0, berry: false },
  ] as const
  return (
    <group userData={{ festiveArchitecture: 'evergreen-wreath-paper-star-winter-salon' }}>
      <group
        position={[
          opening.centerX,
          HOLIDAY_RETURN_WREATH_SPEC.centerY,
          gallery.maxZ - HOLIDAY_RETURN_WREATH_SPEC.wallOffset,
        ]}
        userData={{ festiveFeature: 'holiday-return-wreath' }}
      >
        <OutlineMesh
          outlineWidth={0.022}
          geometry={<torusGeometry args={[HOLIDAY_RETURN_WREATH_SPEC.outerRadius, HOLIDAY_RETURN_WREATH_SPEC.tubeRadius, 10, 42]} />}
          material={<meshToonMaterial color="#3f6248" gradientMap={TOON_RAMP} />}
        />
        <OutlineMesh
          position={[0, 0, 0.025]}
          outlineWidth={0.012}
          geometry={<torusGeometry args={[0.43, 0.045, 8, 36]} />}
          material={<meshToonMaterial color="#5c775e" gradientMap={TOON_RAMP} />}
        />
        {foliageAngles.map((angle, index) => (
          <MuseumEvergreenSprig
            key={`leaf-${angle}`}
            position={[Math.cos(angle) * 0.51, Math.sin(angle) * 0.51, 0.07]}
            rotation={[0, 0, angle - Math.PI / 2 + (index % 2 ? 0.24 : -0.24)]}
            scale={[0.34, 0.42, 0.7]}
            color={index % 2 ? '#5b805b' : '#426b49'}
          />
        ))}
        {berryAngles.map((angle) => (
          <MuseumSphere
            key={angle}
            position={[Math.cos(angle) * 0.51, Math.sin(angle) * 0.51, 0.1]}
            scale={[0.07, 0.07, 0.07]}
            color="#a94e5e"
            outlineWidth={0.008}
          />
        ))}
        <MuseumBox position={[-0.1, HOLIDAY_RETURN_WREATH_SPEC.bowCenterY, 0.04]} rotation={[0, 0, 0.42]} scale={[0.12, HOLIDAY_RETURN_WREATH_SPEC.bowHeight, 0.07]} color="#a95668" outlineWidth={0.01} />
        <MuseumBox position={[0.1, HOLIDAY_RETURN_WREATH_SPEC.bowCenterY, 0.04]} rotation={[0, 0, -0.42]} scale={[0.12, HOLIDAY_RETURN_WREATH_SPEC.bowHeight, 0.07]} color="#a95668" outlineWidth={0.01} />
        <MuseumSphere position={[0, -0.43, 0.09]} scale={[0.14, 0.1, 0.08]} color="#b39255" outlineWidth={0.009} />
      </group>
      <group
        position={[0, 2.58, gallery.maxZ - HOLIDAY_RETURN_WREATH_SPEC.wallOffset]}
        userData={{ festiveDetail: 'evergreen-cornice-swags' }}
      >
        {WINTER_END_SWAG_CURVES.map((curve, index) => (
          <OutlineMesh
            key={index}
            outlineWidth={0.008}
            geometry={<tubeGeometry args={[curve, 20, 0.05, 6, false]} />}
            material={<meshToonMaterial color="#365a41" gradientMap={TOON_RAMP} />}
          />
        ))}
        {swagNodes.map((node, index) => (
          <group key={node.x} position={[node.x, node.y, 0.04]}>
            <MuseumEvergreenSprig
              position={[0, 0, 0]}
              rotation={[0.08, index % 2 ? 0.2 : -0.2, index % 2 ? -1.18 : 1.18]}
              scale={[0.3, 0.5, 0.68]}
              color={index % 2 ? '#5b805b' : '#426b49'}
            />
            {node.berry ? (
              <MuseumSphere position={[0, -0.015, 0.09]} scale={[0.055, 0.055, 0.055]} color="#a94e5e" outlineWidth={0.006} />
            ) : null}
            </group>
        ))}
      </group>
      <group userData={{ installation: 'holiday-three-star-ceiling', animated: false }}>
        {HOLIDAY_CEILING_STAR_SPECS.map((star) => (
          <WinterPaperStar
            key={star.id}
            position={[star.x, star.y, museumGalleryZ(gallery, star.t, 1.65)]}
            scale={star.scale}
            color={star.color}
            rotationY={star.yaw}
            rotationZ={star.roll}
          />
        ))}
      </group>
    </group>
  )
}

function GalleryShell({ gallery, active, surfaceActive }: { gallery: MuseumGalleryPlan; active: boolean; surfaceActive: boolean }) {
  const interior = MUSEUM_GALLERY_INTERIORS[gallery.id as Exclude<MuseumGalleryId, 'lobby'>]
  const depth = gallery.maxZ - gallery.minZ
  const centerZ = (gallery.minZ + gallery.maxZ) / 2
  const permanentGalleryId = gallery.id as PermanentMuseumGalleryId
  const lightingPlan = MUSEUM_GALLERY_LIGHTING_PLANS[permanentGalleryId]
  const surfaceLighting = MUSEUM_GALLERY_SURFACE_LIGHTING[permanentGalleryId]
  const wallEmissiveIntensity = surfaceActive
    ? surfaceLighting.activeWallEmissiveIntensity
    : surfaceLighting.inactiveWallEmissiveIntensity
  const wallPanels = (['left', 'right'] as const).flatMap((wall) => (
    museumGalleryWallPanels(gallery, wall)
  ))

  return (
    <group>
      {wallPanels.map((panel) => (
        <MuseumStructuralBox
          key={panel.id}
          position={[panel.wall === 'left' ? -MUSEUM_GALLERY_SIDE_WALL_CENTER_X : MUSEUM_GALLERY_SIDE_WALL_CENTER_X, panel.centerY, panel.centerZ]}
          scale={[MUSEUM_GALLERY_SIDE_WALL_THICKNESS, panel.height, panel.width]}
          color={gallery.wall}
          emissive={surfaceLighting.wallEmissive}
          emissiveIntensity={wallEmissiveIntensity}
        />
      ))}
      <GalleryFloorDesign gallery={gallery} interior={interior} active={surfaceActive} />
      <GalleryWallArchitecture gallery={gallery} interior={interior} active={surfaceActive} />
      <GalleryCeilingCharacter gallery={gallery} interior={interior} />
      <GalleryEndWall gallery={gallery} />
      <GalleryAtriumPortal gallery={gallery} />
      <GalleryPortalReturns gallery={gallery} />
      {gallery.id === 'holiday' ? <WinterSalonFestiveDetails gallery={gallery} /> : null}
      {interior.windows
        .filter((spec) => !museumGalleryWindowIsAtriumTransom(gallery, spec))
        .map((spec) => <GalleryWindow key={spec.id} gallery={gallery} spec={spec} active={active} />)}
      {interior.skylights.map((spec) => <GallerySkylight key={spec.id} gallery={gallery} spec={spec} active={active} />)}
      <GalleryBench gallery={gallery} interior={interior} />
      <GalleryBotanicals gallery={gallery} />
      {gallery.id !== 'moba-one' && gallery.id !== 'moba-two' && gallery.id !== 'photography' && gallery.id !== 'holiday' ? (
        <MuseumBox position={[0, -1.895, centerZ]} scale={[0.035, 0.018, depth - 0.38]} color={AGED_BRASS} outlineWidth={0.006} />
      ) : null}

      {active ? (
        <group userData={{ lightingPlan: `${gallery.id}-natural-gallery-lighting`, activeLights: lightingPlan.length }}>
          {lightingPlan.map((light) => (
            <TargetedMuseumSpotlight
              key={light.id}
              position={light.position}
              target={light.target}
              color={light.color}
              intensity={light.intensity}
              distance={light.distance}
              angle={light.angle}
              penumbra={light.penumbra}
            />
          ))}
        </group>
      ) : null}
    </group>
  )
}

function usePosterTexture(poster: string) {
  const texture = useLoader(THREE.TextureLoader, poster)
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true
  }, [texture])
  return texture
}

function GalleryPosterPlane({
  poster,
  width,
  height,
}: {
  poster: string
  width: number
  height: number
}) {
  const posterTexture = usePosterTexture(poster)
  return (
    <mesh position={[0, 0, 0.219]} scale={[width, height, 1]} renderOrder={5}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={posterTexture} toneMapped={false} />
    </mesh>
  )
}

function GalleryPosterBoundary({
  poster,
  width,
  height,
}: {
  poster: string
  width: number
  height: number
}) {
  return (
    <Suspense fallback={null}>
      <GalleryPosterPlane poster={poster} width={width} height={height} />
    </Suspense>
  )
}

function GalleryMotionPlane({
  artworkId,
  source,
  width,
  height,
  featured,
  startDelayMs,
  targetFps = 12,
  surfaceZ = 0.224,
}: {
  artworkId: string
  source: string
  width: number
  height: number
  featured: boolean
  startDelayMs: number
  targetFps?: number
  surfaceZ?: number
}) {
  const [ready, setReady] = useState(false)
  const targetFpsRef = useRef(targetFps)
  useEffect(() => {
    targetFpsRef.current = targetFps
  }, [targetFps])
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    const aspect = Math.max(0.25, width / Math.max(1, height))
    const maxDimension = featured ? 512 : 320
    const minDimension = featured ? 128 : 96
    canvas.width = aspect >= 1 ? maxDimension : Math.max(minDimension, Math.round(maxDimension * aspect))
    canvas.height = aspect >= 1 ? Math.max(minDimension, Math.round(maxDimension / aspect)) : maxDimension
    const nextTexture = new THREE.CanvasTexture(canvas)
    nextTexture.colorSpace = THREE.SRGBColorSpace
    nextTexture.generateMipmaps = false
    nextTexture.minFilter = THREE.LinearFilter
    nextTexture.magFilter = THREE.LinearFilter
    return nextTexture
  }, [featured, height, width])

  useEffect(() => () => texture?.dispose(), [texture])

  useEffect(() => {
    if (!texture || !(texture.image instanceof HTMLCanvasElement)) {
      return
    }
    const canvas = texture.image
    const context = canvas.getContext('2d')
    if (!context) return
    let cancelled = false
    let animationTimer: number | null = null
    let startTimer: number | null = null
    let fallbackTimer: number | null = null
    let fallbackImage: HTMLImageElement | null = null
    let decoder: ImageDecoder | null = null
    const controller = new AbortController()
    const debugProbe = process.env.NODE_ENV === 'development'
      ? document.createElement('i')
      : null
    const debugCanvas = debugProbe ? document.createElement('canvas') : null
    const debugContext = debugCanvas?.getContext('2d') ?? null
    let paintCount = 0
    const currentFrameDurationMs = () => 1000 / THREE.MathUtils.clamp(targetFpsRef.current, 1, 24)

    if (debugProbe && debugCanvas) {
      debugCanvas.width = 16
      debugCanvas.height = 16
      debugProbe.hidden = true
      debugProbe.dataset.museumMotionArtwork = artworkId
      debugProbe.dataset.museumMotionSource = source
      debugProbe.dataset.status = 'loading'
      document.body.appendChild(debugProbe)
    }

    const reportPaint = (
      renderer: 'image-decoder' | 'native-image',
      frameIndex: number,
      drawable: CanvasImageSource,
    ) => {
      if (!debugProbe || !debugContext || !debugCanvas) return
      paintCount += 1
      debugContext.clearRect(0, 0, debugCanvas.width, debugCanvas.height)
      debugContext.drawImage(drawable, 0, 0, debugCanvas.width, debugCanvas.height)
      const pixels = debugContext.getImageData(0, 0, debugCanvas.width, debugCanvas.height).data
      let signature = 2166136261
      for (let index = 0; index < pixels.length; index += 4) {
        signature ^= pixels[index]
        signature = Math.imul(signature, 16777619)
        signature ^= pixels[index + 1]
        signature = Math.imul(signature, 16777619)
        signature ^= pixels[index + 2]
        signature = Math.imul(signature, 16777619)
      }
      debugProbe.dataset.renderer = renderer
      debugProbe.dataset.frameIndex = String(frameIndex)
      debugProbe.dataset.paintCount = String(paintCount)
      debugProbe.dataset.signature = String(signature >>> 0)
      debugProbe.dataset.status = 'playing'
    }

    const paintFallback = () => {
      if (cancelled || !fallbackImage) return
      try {
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.drawImage(fallbackImage, 0, 0, canvas.width, canvas.height)
        texture.needsUpdate = true
        reportPaint('native-image', -1, fallbackImage)
      } catch {
        // The poster below remains visible if this browser cannot paint motion.
      }
      fallbackTimer = window.setTimeout(paintFallback, currentFrameDurationMs())
    }

    const startImageFallback = () => {
      if (cancelled) return
      const image = new Image()
      fallbackImage = image
      image.decoding = 'async'
      image.alt = ''
      image.setAttribute('aria-hidden', 'true')
      image.dataset.museumMotionFallback = artworkId
      const fallbackSlot = Math.max(0, Math.round(startDelayMs / 55))
      image.style.position = 'fixed'
      image.style.left = `${fallbackSlot * 2}px`
      image.style.top = '0'
      image.style.width = '1px'
      image.style.height = '1px'
      image.style.opacity = '0.01'
      image.style.pointerEvents = 'none'
      image.style.zIndex = '2147483647'
      document.body.appendChild(image)
      image.onload = () => {
        if (cancelled || fallbackImage !== image) return
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        texture.needsUpdate = true
        reportPaint('native-image', -1, image)
        setReady(true)
        fallbackTimer = window.setTimeout(paintFallback, currentFrameDurationMs())
      }
      image.onerror = () => {
        if (debugProbe) debugProbe.dataset.status = 'unavailable'
      }
      image.src = source
    }

    const startDecoder = async () => {
      try {
        if (typeof ImageDecoder === 'undefined') throw new Error('image_decoder_unavailable')
        const response = await fetch(source, { cache: 'force-cache', signal: controller.signal })
        if (!response.ok) throw new Error('motion_fetch_failed')
        const type = response.headers.get('content-type')?.split(';')[0]?.trim()
        if (!type || !await ImageDecoder.isTypeSupported(type)) throw new Error('motion_type_unsupported')
        const nextDecoder = new ImageDecoder({
          data: response.body ?? await response.arrayBuffer(),
          type,
          desiredWidth: canvas.width,
          desiredHeight: canvas.height,
          preferAnimation: true,
        })
        await nextDecoder.tracks.ready
        if (cancelled) {
          nextDecoder.close()
          return
        }
        const frameCount = nextDecoder.tracks.selectedTrack?.frameCount ?? 0
        if (frameCount < 2) {
          nextDecoder.close()
          throw new Error('motion_frames_unavailable')
        }
        decoder = nextDecoder
        let frameIndex = 0

        const paintNextFrame = async () => {
          if (cancelled || decoder !== nextDecoder) return
          try {
            const result = await nextDecoder.decode({ frameIndex, completeFramesOnly: true })
            if (cancelled || decoder !== nextDecoder) {
              result.image.close()
              return
            }
            context.clearRect(0, 0, canvas.width, canvas.height)
            context.drawImage(result.image, 0, 0, canvas.width, canvas.height)
            texture.needsUpdate = true
            reportPaint('image-decoder', frameIndex, result.image)
            const sourceFrameDurationMs = Math.max(1, (result.image.duration ?? 100_000) / 1000)
            const durationMs = Math.max(currentFrameDurationMs(), sourceFrameDurationMs)
            const frameAdvance = Math.max(1, Math.round(durationMs / sourceFrameDurationMs))
            result.image.close()
            // Distant work refreshes less often, but skips ahead instead of
            // playing in slow motion. The animation remains temporally honest
            // while avoiding texture uploads the visitor cannot appreciate.
            frameIndex = (frameIndex + frameAdvance) % frameCount
            setReady(true)
            animationTimer = window.setTimeout(() => void paintNextFrame(), durationMs)
          } catch {
            nextDecoder.close()
            decoder = null
            startImageFallback()
          }
        }

        await paintNextFrame()
      } catch {
        if (!cancelled) startImageFallback()
      }
    }

    startTimer = window.setTimeout(() => void startDecoder(), startDelayMs)

    return () => {
      cancelled = true
      controller.abort()
      if (startTimer !== null) window.clearTimeout(startTimer)
      if (animationTimer !== null) window.clearTimeout(animationTimer)
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer)
      decoder?.close()
      if (fallbackImage) {
        fallbackImage.onload = null
        fallbackImage.onerror = null
        fallbackImage.remove()
        fallbackImage.src = ''
      }
      debugProbe?.remove()
    }
  }, [artworkId, source, startDelayMs, texture])

  if (!ready || !texture) return null
  return (
    <mesh position={[0, 0, surfaceZ]} scale={[width, height, 1]} renderOrder={6}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

function GalleryMotionSheetPlane({
  artworkId,
  source,
  width,
  height,
  frameCount,
  columns,
  rows,
  frameDurationMs,
  phaseFrames,
  surfaceZ = 0.224,
}: {
  artworkId: string
  source: string
  width: number
  height: number
  frameCount: number
  columns: number
  rows: number
  frameDurationMs: number
  phaseFrames: number
  surfaceZ?: number
}) {
  const loadedTexture = useLoader(THREE.TextureLoader, source)
  const texture = useMemo(() => loadedTexture.clone(), [loadedTexture])
  const lastFrameRef = useRef(-1)
  const paintCountRef = useRef(0)
  const debugProbeRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1 / columns, 1 / rows)
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.NearestFilter
    texture.needsUpdate = true
    return () => texture.dispose()
  }, [columns, rows, texture])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const probe = document.createElement('i')
    probe.hidden = true
    probe.dataset.museumMotionArtwork = artworkId
    probe.dataset.museumMotionSource = source
    probe.dataset.renderer = 'sprite-sheet'
    probe.dataset.status = 'loading'
    document.body.appendChild(probe)
    debugProbeRef.current = probe
    return () => {
      debugProbeRef.current = null
      probe.remove()
    }
  }, [artworkId, source])

  useFrame(({ clock }) => {
    const elapsedFrames = Math.floor((clock.elapsedTime * 1000) / frameDurationMs)
    const frameIndex = (elapsedFrames + phaseFrames) % frameCount
    if (frameIndex === lastFrameRef.current) return
    lastFrameRef.current = frameIndex
    paintCountRef.current += 1
    const column = frameIndex % columns
    const row = Math.floor(frameIndex / columns)
    texture.offset.set(column / columns, 1 - (row + 1) / rows)

    const probe = debugProbeRef.current
    if (probe) {
      probe.dataset.frameIndex = String(frameIndex)
      probe.dataset.paintCount = String(paintCountRef.current)
      probe.dataset.signature = String(frameIndex)
      probe.dataset.status = 'playing'
    }
  })

  return (
    <mesh position={[0, 0, surfaceZ]} scale={[width, height, 1]} renderOrder={6}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

function fitArtwork(work: MuseumArtworkDisplay['work'], maxWidth: number, maxHeight: number) {
  const ratio = work.width / Math.max(1, work.height)
  if (ratio >= maxWidth / maxHeight) return [maxWidth, maxWidth / ratio] as const
  return [maxHeight * ratio, maxHeight] as const
}

function galleryFramePalette(style: MuseumFrameStyle, gallery: MuseumGalleryPlan) {
  if (style === 'heart-float') return { outer: '#242d31', inner: '#adb8b5', mat: '#e0e3dd', plaque: '#d7dad4' }
  if (style === 'photo-mat') return { outer: '#3f4a45', inner: '#b9ab93', mat: '#f5f0e5', plaque: '#c8bda9' }
  if (style === 'winter-frost') return { outer: '#66716d', inner: '#a7b0ac', mat: '#f0f1e9', plaque: '#cbd4cd' }
  if (style === 'winter-gilt') return { outer: '#273a31', inner: '#b49355', mat: '#efe7d7', plaque: '#d7c49b' }
  return { outer: '#30211f', inner: '#ae9159', mat: '#e7d7bd', plaque: gallery.wallLight }
}

function GalleryArtworkFrame({
  display,
  gallery,
  animate,
  animationIndex,
  motionFps,
}: {
  display: MuseumArtworkDisplay
  gallery: MuseumGalleryPlan
  animate: boolean
  animationIndex: number
  motionFps: number
}) {
  const work = display.work
  const hero = Boolean(display.featured)
  const baseMax = display.frameStyle === 'photo-mat'
    ? [1.95, 1.65] as const
    : display.frameStyle === 'winter-gilt' || display.frameStyle === 'winter-frost'
      ? [hero ? 1.6 : 1.4, hero ? 1.6 : 1.4] as const
      : [hero ? 1.55 : 1.27, hero ? 1.55 : 1.27] as const
  const roomMax = [baseMax[0] * display.scale, baseMax[1] * display.scale] as const
  const [artWidth, artHeight] = fitArtwork(work, roomMax[0], roomMax[1])
  const matPad = display.frameStyle === 'photo-mat'
    ? 0.18
    : display.frameStyle === 'heart-float'
      ? 0.16
    : display.frameStyle === 'portrait-gilt'
        ? 0.07
        : display.frameStyle === 'winter-gilt' || display.frameStyle === 'winter-frost'
          ? 0.14
          : 0.2
  const isPortraitSalon = gallery.id === 'moba-one'
  const isHeartGallery = gallery.id === 'moba-two'
  const isPhotographyGallery = gallery.id === 'photography'
  const isHolidayGallery = gallery.id === 'holiday'
  const surfaceLighting = MUSEUM_GALLERY_SURFACE_LIGHTING[gallery.id as PermanentMuseumGalleryId]
  const frameWidth = artWidth + matPad * 2
  const frameHeight = artHeight + matPad * 2
  const palette = isPortraitSalon
    ? hero
      ? { outer: '#261a18', inner: '#b99a5b', mat: '#eadac0', plaque: gallery.wallLight }
      : display.lamp
        ? { outer: '#35231f', inner: '#a48755', mat: '#e3d1b5', plaque: gallery.wallLight }
        : display.scale < 0.86
          ? { outer: '#4b3028', inner: '#8c6a45', mat: '#d8c4a7', plaque: gallery.wallLight }
          : { outer: '#30211f', inner: '#ae9159', mat: '#e5d4ba', plaque: gallery.wallLight }
    : isHeartGallery
      ? hero
        ? { outer: '#273137', inner: '#c2cbc6', mat: '#f0eee7', plaque: '#d7ddd8' }
        : display.scale < 0.9
          ? { outer: '#4b5d62', inner: '#aebbb7', mat: '#e9e9e2', plaque: '#d2d9d6' }
          : { outer: '#303b40', inner: '#9fadaa', mat: '#e5e7e0', plaque: '#d3dad6' }
    : isPhotographyGallery
      ? display.id.startsWith('end')
        ? { outer: '#35413d', inner: '#aa9073', mat: '#f4eee2', plaque: '#c8bda9' }
        : display.id === 'left-b' || display.id === 'right-c'
          ? { outer: '#6d7771', inner: '#c4b89f', mat: '#f6f1e7', plaque: '#c8bda9' }
          : galleryFramePalette(display.frameStyle, gallery)
      : galleryFramePalette(display.frameStyle, gallery)
  const posterBoundary = (
    <GalleryPosterBoundary
      poster={work.poster}
      width={artWidth}
      height={artHeight}
    />
  )
  const artworkSurface = (
    <>
      {!animate || !work.motionSheet ? (
        posterBoundary
      ) : null}
      {animate && work.motionSheet ? (
        <Suspense fallback={posterBoundary}>
          <GalleryMotionSheetPlane
            artworkId={work.id}
            source={work.motionSheet}
            width={artWidth}
            height={artHeight}
            frameCount={work.frameCount}
            columns={work.motionSheetColumns ?? 7}
            rows={work.motionSheetRows ?? Math.ceil(work.frameCount / 7)}
            frameDurationMs={work.motionFrameDurationMs ?? 50}
            phaseFrames={animationIndex * 2}
          />
        </Suspense>
      ) : animate && work.motion ? (
        <GalleryMotionPlane
          artworkId={work.id}
          source={work.motion}
          width={artWidth}
          height={artHeight}
          featured={hero}
          startDelayMs={animationIndex * 55}
          targetFps={motionFps}
        />
      ) : null}
    </>
  )

  return (
    <group
      position={[...display.position]}
      rotation={[0, display.rotationY, display.roll ?? 0]}
      userData={{
        artworkId: work.id,
        title: work.title,
        slotId: display.id,
        [MUSEUM_ARTWORK_USER_DATA_KEY]: createMuseumArtworkProvenance({
          id: work.id,
          title: work.title,
          collection: gallery.shortTitle,
          sourceUrl: work.sourceUrl,
          ownerHint: work.collector
            ? { address: work.collector.address, label: work.collector.label }
            : null,
        }),
      }}
    >
      {display.lamp ? (
        <mesh position={[0, -0.02, -0.05]} scale={[frameWidth * 1.18, frameHeight * 1.28, 1]} renderOrder={1}>
          <shapeGeometry args={[PORTRAIT_WASH_SHAPE]} />
          <meshBasicMaterial
            color={surfaceLighting.artworkWashColor}
            transparent
            opacity={surfaceLighting.artworkWashOpacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
      <MuseumBox
        position={[0, 0, 0]}
        scale={[frameWidth + (isPortraitSalon ? 0.16 : isHeartGallery ? 0.17 : isPhotographyGallery ? 0.12 : isHolidayGallery ? 0.18 : 0.3), frameHeight + (isPortraitSalon ? 0.16 : isHeartGallery ? 0.17 : isPhotographyGallery ? 0.12 : isHolidayGallery ? 0.18 : 0.3), isPortraitSalon ? hero ? 0.22 : 0.15 : isHeartGallery ? 0.16 : isPhotographyGallery ? 0.13 : isHolidayGallery ? 0.15 : hero ? 0.24 : 0.19]}
        color={palette.outer}
        outlineWidth={isPortraitSalon ? hero ? 0.038 : 0.026 : isHeartGallery ? 0.025 : isPhotographyGallery ? 0.024 : isHolidayGallery ? 0.028 : hero ? 0.07 : 0.045}
      />
      <MuseumBox
        position={[0, 0, 0.12]}
        scale={[frameWidth + (isPortraitSalon ? 0.07 : isHeartGallery ? 0.07 : isPhotographyGallery ? 0.05 : isHolidayGallery ? 0.08 : 0.13), frameHeight + (isPortraitSalon ? 0.07 : isHeartGallery ? 0.07 : isPhotographyGallery ? 0.05 : isHolidayGallery ? 0.08 : 0.13), isHeartGallery ? 0.08 : isPhotographyGallery ? 0.065 : isHolidayGallery ? 0.075 : isPortraitSalon ? 0.09 : 0.11]}
        color={palette.inner}
        outlineWidth={isPortraitSalon ? 0.009 : isHeartGallery ? 0.01 : isPhotographyGallery ? 0.009 : isHolidayGallery ? 0.01 : 0.022}
        emissive={palette.inner}
        emissiveIntensity={isHolidayGallery ? 0 : isPortraitSalon || isHeartGallery || isPhotographyGallery ? 0 : hero ? 0.1 : 0.015}
      />
      <MuseumBox position={[0, 0, 0.17]} scale={[frameWidth, frameHeight, 0.07]} color={palette.mat} outlineWidth={isPortraitSalon ? 0.006 : isHeartGallery ? 0.01 : isPhotographyGallery ? 0.008 : isHolidayGallery ? 0.009 : 0.016} />
      {artworkSurface}
      {display.lamp ? (
        <group position={[0, frameHeight * 0.5 + (isPortraitSalon ? 0.21 : 0.28), 0.08]}>
          <MuseumBox
            position={[0, 0, 0]}
            scale={[Math.min(isPortraitSalon ? 0.66 : isHeartGallery ? 0.72 : isPhotographyGallery ? 0.74 : isHolidayGallery ? 0.68 : 0.98, frameWidth * (isPortraitSalon ? 0.52 : isHeartGallery ? 0.48 : isPhotographyGallery ? 0.46 : isHolidayGallery ? 0.5 : 0.64)), isPortraitSalon ? 0.045 : isHeartGallery ? 0.05 : isPhotographyGallery ? 0.04 : isHolidayGallery ? 0.045 : 0.085, isPortraitSalon ? 0.1 : isHeartGallery ? 0.1 : isPhotographyGallery ? 0.08 : isHolidayGallery ? 0.09 : 0.16]}
            color={isPortraitSalon ? AGED_BRASS : isHeartGallery ? '#9aa6a4' : isPhotographyGallery ? '#7a8580' : isHolidayGallery ? '#9b7d47' : BRASS}
            outlineWidth={isPortraitSalon ? 0.012 : isHeartGallery ? 0.012 : isPhotographyGallery ? 0.008 : isHolidayGallery ? 0.01 : 0.024}
            emissive={isPortraitSalon || isHeartGallery || isPhotographyGallery ? '#000000' : isHolidayGallery ? '#000000' : '#7b4a18'}
            emissiveIntensity={isPortraitSalon || isHeartGallery || isPhotographyGallery ? 0 : isHolidayGallery ? 0 : 0.18}
          />
          <MuseumBox
            position={[0, isPortraitSalon ? -0.085 : -0.12, -0.02]}
            scale={[isPortraitSalon ? 0.045 : isHeartGallery ? 0.045 : isHolidayGallery ? 0.045 : 0.08, isPortraitSalon ? 0.16 : isHeartGallery ? 0.17 : isHolidayGallery ? 0.18 : 0.24, isPortraitSalon ? 0.08 : isHeartGallery ? 0.07 : isHolidayGallery ? 0.07 : 0.12]}
            color={palette.outer}
            outlineWidth={isPortraitSalon || isHolidayGallery ? 0.01 : 0.018}
          />
        </group>
      ) : null}
      {isPortraitSalon || isHeartGallery || isPhotographyGallery || isHolidayGallery ? (
        <MuseumBox
          position={[frameWidth * 0.5 + (isHeartGallery ? 0.1 : isPhotographyGallery ? 0.095 : isPortraitSalon ? 0.09 : 0.12), -frameHeight * 0.3, 0.04]}
          scale={isHeartGallery ? [0.1, 0.065, 0.03] : isPhotographyGallery ? [0.1, 0.06, 0.028] : isHolidayGallery ? [0.1, 0.06, 0.028] : isPortraitSalon ? [0.1, 0.055, 0.025] : [0.12, 0.075, 0.035]}
          color={isHeartGallery || isPhotographyGallery || isHolidayGallery ? palette.plaque : '#e9ddc7'}
          outlineWidth={isHeartGallery ? 0.007 : isPhotographyGallery || isHolidayGallery ? 0.006 : isPortraitSalon ? 0.004 : 0.009}
        />
      ) : (
        <MuseumBox
          position={[Math.min(0.34, frameWidth * 0.22), -frameHeight * 0.5 - 0.17, 0.09]}
          scale={[Math.min(0.48, frameWidth * 0.34), 0.12, 0.08]}
          color={palette.plaque}
          outlineWidth={0.022}
        />
      )}
    </group>
  )
}

function GalleryExhibition({
  gallery,
  animate,
  motionFps,
}: {
  gallery: MuseumGalleryPlan
  animate: boolean
  motionFps: number
}) {
  const displays = museumGalleryArtworkDisplays(gallery)
  return (
    <group>
      {displays.map((display, index) => {
        const animationIndex = displays
          .slice(0, index)
          .filter((candidate) => Boolean(candidate.work.motion)).length
        return (
          <GalleryArtworkFrame
            key={display.work.id}
            display={display}
            gallery={gallery}
            animate={animate}
            animationIndex={animationIndex}
            motionFps={motionFps}
          />
        )
      })}
    </group>
  )
}

const YES_YES_WEAVE_PALETTE = [
  '#4e253b',
  '#693555',
  '#c98dc8',
  '#bd6798',
  '#a2395b',
  '#c0586e',
  '#c55f40',
  '#dbbc67',
  '#bd6798',
  '#693555',
  '#a2395b',
  '#8a332c',
] as const

function createYesYesWeaveTexture() {
  const size = 256
  const data = new Uint8Array(size * size * 4)
  const palette = YES_YES_WEAVE_PALETTE.map((hex) => {
    const color = new THREE.Color(hex)
    return [color.r * 255, color.g * 255, color.b * 255] as const
  })
  const bandWidth = 16

  for (let y = 0; y < size; y += 1) {
    const chevronPhase = (y % 24) / 12
    const chevron = chevronPhase <= 1 ? chevronPhase : 2 - chevronPhase
    const weaveShift = (chevron - 0.5) * 11 + Math.sin(y * 0.17) * 1.6
    for (let x = 0; x < size; x += 1) {
      const shiftedX = x + weaveShift
      const bandIndex = Math.floor(shiftedX / bandWidth)
      const localBandX = ((shiftedX % bandWidth) + bandWidth) % bandWidth
      const paletteIndex = ((bandIndex % palette.length) + palette.length) % palette.length
      const base = palette[paletteIndex]
      const edgeShade = localBandX < 2.2
        ? 0.5
        : localBandX > bandWidth - 3.2
          ? 0.7
          : localBandX < 5.2
            ? 1.18
            : 0.94 + Math.sin((localBandX / bandWidth) * Math.PI) * 0.13
      const vertical = y / size
      const crownLift = 0.92 + Math.max(0, 1 - Math.abs(vertical - 0.72) / 0.65) * 0.25
      const horizontalVignette = 0.92 + Math.sin((x / size) * Math.PI) * 0.22
      const dither = ((x + y * 3) % 7 === 0 ? 1.06 : 0.98)
      const shade = edgeShade * crownLift * horizontalVignette * dither
      const index = (y * size + x) * 4
      data[index] = Math.min(255, Math.round(base[0] * shade))
      data[index + 1] = Math.min(255, Math.round(base[1] * shade))
      data[index + 2] = Math.min(255, Math.round(base[2] * shade))
      data[index + 3] = 255
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.generateMipmaps = false
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.needsUpdate = true
  return texture
}

function createHeartLightPoolTexture() {
  const size = 96
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = ((x / (size - 1)) * 2 - 1) * 1.14
      const ny = ((y / (size - 1)) * 2 - 1) * 1.16 - 0.08
      const base = nx * nx + ny * ny - 1
      const equation = base * base * base - nx * nx * ny * ny * ny
      const alpha = Math.max(0, Math.min(1, -equation * 3.8)) ** 0.56
      const index = (y * size + x) * 4
      data[index] = 255
      data[index + 1] = 196
      data[index + 2] = 208
      data[index + 3] = Math.round(alpha * 255)
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

function BouncingHeart({ reducedMotion, lit }: { reducedMotion: boolean; lit: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const shadowRef = useRef<THREE.Mesh>(null)
  const lightPoolRef = useRef<THREE.Mesh>(null)
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, -0.95)
    shape.bezierCurveTo(-0.18, -0.72, -1.08, -0.18, -1.08, 0.52)
    shape.bezierCurveTo(-1.08, 1.08, -0.38, 1.38, 0, 0.82)
    shape.bezierCurveTo(0.38, 1.38, 1.08, 1.08, 1.08, 0.52)
    shape.bezierCurveTo(1.08, -0.18, 0.18, -0.72, 0, -0.95)
    const nextGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.52,
      bevelEnabled: true,
      bevelSegments: 5,
      bevelSize: 0.14,
      bevelThickness: 0.14,
      curveSegments: 20,
      steps: 1,
    })
    nextGeometry.center()
    nextGeometry.computeBoundingBox()
    const bounds = nextGeometry.boundingBox
    const positions = nextGeometry.getAttribute('position')
    const uvs = nextGeometry.getAttribute('uv')
    if (bounds && uvs) {
      const width = Math.max(0.0001, bounds.max.x - bounds.min.x)
      const height = Math.max(0.0001, bounds.max.y - bounds.min.y)
      for (let index = 0; index < positions.count; index += 1) {
        uvs.setXY(
          index,
          (positions.getX(index) - bounds.min.x) / width,
          (positions.getY(index) - bounds.min.y) / height,
        )
      }
      uvs.needsUpdate = true
    }
    nextGeometry.computeVertexNormals()
    return nextGeometry
  }, [])
  const weaveTexture = useMemo(() => createYesYesWeaveTexture(), [])
  const lightPoolTexture = useMemo(() => createHeartLightPoolTexture(), [])
  useEffect(() => () => {
    geometry.dispose()
    weaveTexture.dispose()
    lightPoolTexture.dispose()
  }, [geometry, lightPoolTexture, weaveTexture])

  useFrame(({ clock }) => {
    const group = groupRef.current
    const shadow = shadowRef.current
    const lightPool = lightPoolRef.current
    if (!group || !shadow || !lightPool) return
    const phase = (clock.elapsedTime % MOBA_TWO_HEART_SCULPTURE_SPEC.cycleSeconds)
      / MOBA_TWO_HEART_SCULPTURE_SPEC.cycleSeconds
    const motion = mobaTwoHeartMotionAtPhase(phase, reducedMotion)
    group.position.y = MOBA_TWO_HEART_SCULPTURE_SPEC.heartRestY + motion.height
    group.rotation.z = motion.rotationZ
    group.scale.set(motion.scaleX, motion.scaleY, motion.scaleZ)
    shadow.scale.set(motion.shadowScale, motion.shadowScale * 0.72, 1)
    ;(shadow.material as THREE.MeshBasicMaterial).opacity = motion.shadowOpacity
    ;(lightPool.material as THREE.MeshBasicMaterial).opacity = lit
      ? 0.1 + motion.lightPoolPulse * 0.15
      : 0.035 + motion.lightPoolPulse * 0.025
  })

  return (
    <group
      position={[...MOBA_TWO_HEART_SCULPTURE_SPEC.localPosition]}
      userData={{
        landmark: MOBA_TWO_HEART_SCULPTURE_SPEC.landmark,
        originArtworkId: MOBA_TWO_HEART_SCULPTURE_SPEC.originArtworkId,
        installation: 'yes-yes-origin-heart',
      }}
    >
      <mesh
        ref={lightPoolRef}
        position={[0, -1.87, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1.55, 1.25, 1]}
        renderOrder={2}
        raycast={() => null}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={lightPoolTexture}
          color="#ffd1dc"
          transparent
          opacity={lit ? 0.1 : 0.035}
          depthWrite={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </mesh>
      <MuseumCylinder
        position={[0, -1.86, 0]}
        scale={[1.34, 0.08, 1.08]}
        color="#40545a"
        outlineWidth={0.02}
        segments={16}
      />
      <MuseumCylinder
        position={[0, -1.79, 0]}
        scale={[1.2, 0.05, 0.94]}
        color="#d8d8cf"
        outlineWidth={0.008}
        segments={16}
      />
      <OutlineMesh
        position={[0, -1.38, 0]}
        scale={[1, 1, 0.82]}
        outlineWidth={0.018}
        geometry={<cylinderGeometry args={[0.4, 0.48, 0.78, 12]} />}
        material={<meshToonMaterial color="#aeb9b6" gradientMap={TOON_RAMP} />}
      />
      <MuseumCylinder
        position={[0, -1.035, 0]}
        scale={[1, 0.075, 0.8]}
        color="#b68d59"
        outlineWidth={0.008}
        segments={16}
      />
      <MuseumCylinder
        position={[0, -0.955, 0]}
        scale={[1.16, 0.08, 0.92]}
        color="#eee7db"
        outlineWidth={0.012}
        segments={16}
      />
      <MuseumCylinder
        position={[0, -0.895, 0]}
        scale={[0.92, 0.024, 0.7]}
        color="#42283b"
        outlineWidth={0.005}
        emissive="#6b304d"
        emissiveIntensity={lit ? 0.09 : 0.025}
        segments={16}
      />
      <MuseumBox
        position={[0, -1.34, 0.405]}
        scale={[0.36, 0.2, 0.022]}
        color="#efe6d4"
        outlineWidth={0.008}
      />
      <MuseumBox
        position={[0, -1.34, 0.419]}
        scale={[0.22, 0.022, 0.009]}
        color="#a2395b"
        outlineWidth={0.003}
      />
      <mesh ref={shadowRef} position={[0, -0.868, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.72, 1]}>
        <circleGeometry args={[0.43, 48]} />
        <meshBasicMaterial color="#21131d" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <group
        ref={groupRef}
        position={[0, MOBA_TWO_HEART_SCULPTURE_SPEC.heartRestY, 0]}
        rotation={[0.015, MOBA_TWO_HEART_SCULPTURE_SPEC.fixedYaw, 0]}
        userData={{ sculpture: 'woven-yes-yes-heart', animated: !reducedMotion }}
      >
        <mesh scale={[0.715, 0.715, 0.9]}>
          <primitive object={geometry} attach="geometry" />
          <meshBasicMaterial color="#17131d" side={THREE.BackSide} />
        </mesh>
        <mesh scale={[0.68, 0.68, 0.85]}>
          <primitive object={geometry} attach="geometry" />
          <meshToonMaterial
            attach="material-0"
            map={weaveTexture}
            color="#ffffff"
            gradientMap={TOON_RAMP}
            emissive="#351b26"
            emissiveIntensity={lit ? 0.12 : 0.045}
          />
          <meshToonMaterial
            attach="material-1"
            color="#75415f"
            gradientMap={TOON_RAMP}
            emissive="#4a1735"
            emissiveIntensity={lit ? 0.08 : 0.025}
          />
        </mesh>
      </group>
    </group>
  )
}

function HolidayGiftVignette({ reducedMotion }: { reducedMotion: boolean }) {
  const giftRef = useRef<THREE.Group>(null)
  const gallery = MUSEUM_GALLERY_BY_ID.holiday
  const z = museumGalleryZ(gallery, HOLIDAY_GIFT_VITRINE_SPEC.t, 1.1)
  useFrame(({ clock }) => {
    if (!giftRef.current || reducedMotion) return
    giftRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.48) * 0.06
    giftRef.current.position.y = 0.82 + Math.sin(clock.elapsedTime * 1.25) * 0.015
  })
  return (
    <group
      position={[HOLIDAY_GIFT_VITRINE_SPEC.x, -1.92, z]}
      userData={{ landmark: 'holiday-gift-vitrine', sharedColliderSpec: HOLIDAY_GIFT_VITRINE_SPEC.id }}
    >
      <MuseumBox position={[0, 0.48, 0]} scale={[HOLIDAY_GIFT_VITRINE_SPEC.width, 0.12, HOLIDAY_GIFT_VITRINE_SPEC.depth]} color="#d2c2a5" outlineWidth={0.018} />
      <MuseumBox position={[0, 0.555, 0]} scale={[0.74, 0.035, 0.5]} color="#704750" outlineWidth={0.008} />
      <MuseumBox position={[0, 0.578, 0]} scale={[0.8, 0.018, 0.56]} color="#b39255" outlineWidth={0.005} />
      <MuseumBox position={[0, 0.39, 0]} scale={[HOLIDAY_GIFT_VITRINE_SPEC.width * 0.88, 0.08, HOLIDAY_GIFT_VITRINE_SPEC.depth * 0.7]} color="#5b4333" outlineWidth={0.012} />
      {([-1, 1] as const).flatMap((side) => [-1, 1].map((front) => (
        <MuseumBox
          key={`${side}-${front}`}
          position={[side * HOLIDAY_GIFT_VITRINE_SPEC.width * 0.36, 0.2, front * HOLIDAY_GIFT_VITRINE_SPEC.depth * 0.3]}
          scale={[0.09, 0.4, 0.09]}
          color="#49342b"
          outlineWidth={0.01}
        />
      )))}
      <group ref={giftRef} position={[0, 0.82, 0]} scale={[0.46, 0.46, 0.46]}>
        <MuseumBox position={[0, 0.26, 0]} scale={[0.76, 0.58, 0.62]} color="#8f4b58" outlineWidth={0.04} />
        <MuseumBox position={[0, 0.26, 0.325]} scale={[0.13, 0.61, 0.06]} color="#c5a96a" outlineWidth={0.014} />
        <MuseumBox position={[0, 0.58, 0]} scale={[0.8, 0.11, 0.66]} color="#c5a96a" outlineWidth={0.02} />
        <MuseumBox position={[-0.14, 0.75, 0]} scale={[0.24, 0.19, 0.15]} rotation={[0, 0, -0.42]} color="#d3c18d" outlineWidth={0.018} />
        <MuseumBox position={[0.14, 0.75, 0]} scale={[0.24, 0.19, 0.15]} rotation={[0, 0, 0.42]} color="#d3c18d" outlineWidth={0.018} />
      </group>
      <MuseumCylinder position={[0.28, 0.61, 0.04]} rotation={[0, 0, 0.9]} scale={[0.035, 0.34, 0.035]} color="#38523e" outlineWidth={0.006} segments={8} />
      <MuseumSphere position={[0.37, 0.68, 0.05]} scale={[0.12, 0.055, 0.08]} color="#456348" outlineWidth={0.007} />
      <MuseumSphere position={[0.25, 0.66, 0.07]} scale={[0.1, 0.05, 0.08]} color="#304b39" outlineWidth={0.007} />
      <MuseumSphere position={[0.42, 0.7, 0.13]} scale={[0.035, 0.035, 0.035]} color="#9b4854" outlineWidth={0.006} />
      <MuseumBox position={[-0.36, 0.62, 0.25]} scale={[0.2, 0.075, 0.025]} color="#eee4d2" outlineWidth={0.006} />
      <MuseumBox position={[-0.36, 0.62, 0.266]} scale={[0.1, 0.014, 0.012]} color="#9c8155" outlineWidth={0.003} />
    </group>
  )
}

function GalleryLandmark({
  galleryId,
  reducedMotion,
  active,
}: {
  galleryId: MuseumGalleryId
  reducedMotion: boolean
  active: boolean
}) {
  if (galleryId === 'moba-two') {
    return (
      <>
        <BouncingHeart reducedMotion={reducedMotion} lit={active} />
        <MonkeydhashyCreateboxInstallation reducedMotion={reducedMotion} active={active} />
      </>
    )
  }
  if (galleryId === 'holiday') return <HolidayGiftVignette reducedMotion={reducedMotion} />
  return null
}

export function MuseumExpansion({
  activeGalleryId,
  activeMuseumArea,
  reducedMotion,
  atriumInstallation = null,
  atriumInstallationAssets = [],
  atriumInstallationPaused = false,
  onOpenAtriumRegistry,
  onSelectAtriumResident,
  onOpenCourtyard,
  onOpenBurnRoom,
  onOpenMuseumLore,
}: {
  activeGalleryId: MuseumGalleryId
  activeMuseumArea: MuseumAreaId
  reducedMotion: boolean
  atriumInstallation?: AppliedAtriumInstallation | null
  atriumInstallationAssets?: readonly MuseumAssetSummary[]
  atriumInstallationPaused?: boolean
  onOpenAtriumRegistry?: () => void
  onSelectAtriumResident?: (resident: MuseumAssetSummary) => void
  onOpenCourtyard?: () => void
  onOpenBurnRoom?: () => void
  onOpenMuseumLore?: (chapterId: MuseumLoreId) => void
}) {
  const wings = MUSEUM_GALLERIES.filter((gallery) => gallery.id !== 'lobby')
  return (
    <group>
      <OpeningSalonMobaGalleryHang />
      <MuseumLoreStation
        chapterId="pixler-origin"
        position={[-3.7, 0.54, 9.76]}
        rotationY={Math.PI}
        onOpen={onOpenMuseumLore}
      />
      <MuseumLoreStation
        chapterId="glowbud-world"
        position={[4.45, 0.54, 31.94]}
        rotationY={Math.PI}
        onOpen={onOpenMuseumLore}
      />
      <MuseumLoopArchitecture
        active={activeMuseumArea === 'atrium'}
        reducedMotion={reducedMotion}
        atriumInstallation={atriumInstallation}
        atriumInstallationAssets={atriumInstallationAssets}
        atriumInstallationPaused={atriumInstallationPaused}
        onOpenAtriumRegistry={onOpenAtriumRegistry}
        onSelectAtriumResident={onSelectAtriumResident}
        onOpenCourtyard={onOpenCourtyard}
        onOpenBurnRoom={onOpenBurnRoom}
      />
      {wings.map((gallery) => {
        const chapterId = gallery.id === 'moba-one'
          ? 'moba-one'
          : gallery.id === 'moba-two'
            ? 'moba-two'
            : gallery.id === 'photography'
              ? 'one-final-album'
              : 'holiday-potluck'
        const stationX = gallery.id === 'moba-one' || gallery.id === 'photography' ? -3.55 : 4.15
        return (
          <group
            key={gallery.id}
            position={[gallery.placement.x, 0, gallery.placement.z]}
            rotation={[0, gallery.placement.yaw, 0]}
          >
            <group position={[0, 0, -gallery.minZ]}>
              <GalleryShell
                gallery={gallery}
                active={activeGalleryId === gallery.id && activeMuseumArea === gallery.id}
                surfaceActive={activeMuseumArea === 'atrium' || (activeGalleryId === gallery.id && activeMuseumArea === gallery.id)}
              />
              <GalleryThreshold gallery={gallery} />
              <MuseumLoreStation
                chapterId={chapterId}
                position={[stationX, 0.5, gallery.minZ + 0.37]}
                rotationY={0}
                onOpen={onOpenMuseumLore}
              />
              <GalleryExhibition
                gallery={gallery}
                animate={!reducedMotion}
                motionFps={activeGalleryId === gallery.id && activeMuseumArea === gallery.id ? 12 : 4}
              />
              <GalleryLandmark galleryId={gallery.id} reducedMotion={reducedMotion} active={activeGalleryId === gallery.id && activeMuseumArea === gallery.id} />
            </group>
          </group>
        )
      })}
    </group>
  )
}
