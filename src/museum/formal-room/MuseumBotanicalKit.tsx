'use client'

import * as THREE from 'three'
import { OutlineMesh } from '../../render/OutlineMesh'
import { getToonRampTexture } from '../../shaders/toonRamp'
import type {
  MuseumAtriumPlantFamily,
  MuseumGalleryPlantFamily,
} from './museumTreeDesign'

type Vec3 = readonly [number, number, number]
type Palette = readonly [string, string, string]
type LeafKind = 'caladium' | 'canopy' | 'fern' | 'grass' | 'heart' | 'lance' | 'ovate' | 'palm' | 'pine' | 'poinsettia'

const TOON_RAMP = getToonRampTexture()
const OUTLINE_SCALE = 0.68
const LEAF_MESH_Z = -0.018
const LEAF_VEIN_Z = 0.032
const LEAF_EXTRUDE: THREE.ExtrudeGeometryOptions = {
  depth: 0.035,
  bevelEnabled: true,
  bevelSegments: 1,
  bevelSize: 0.018,
  bevelThickness: 0.012,
  curveSegments: 5,
  steps: 1,
}

function createLanceShape() {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(-0.2, 0.08, -0.42, 0.46, -0.31, 0.7)
  shape.bezierCurveTo(-0.22, 0.86, -0.08, 0.97, 0, 1)
  shape.bezierCurveTo(0.08, 0.97, 0.22, 0.86, 0.31, 0.7)
  shape.bezierCurveTo(0.42, 0.46, 0.2, 0.08, 0, 0)
  shape.closePath()
  return shape
}

function createOvateShape() {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(-0.38, 0.08, -0.55, 0.4, -0.42, 0.66)
  shape.bezierCurveTo(-0.32, 0.84, -0.1, 0.97, 0, 1)
  shape.bezierCurveTo(0.1, 0.97, 0.32, 0.84, 0.42, 0.66)
  shape.bezierCurveTo(0.55, 0.4, 0.38, 0.08, 0, 0)
  shape.closePath()
  return shape
}

function createHeartShape() {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(-0.14, -0.22, -0.52, -0.06, -0.54, -0.38)
  shape.bezierCurveTo(-0.56, -0.7, -0.22, -0.88, 0, -1.08)
  shape.bezierCurveTo(0.22, -0.88, 0.56, -0.7, 0.54, -0.38)
  shape.bezierCurveTo(0.52, -0.06, 0.14, -0.22, 0, 0)
  shape.closePath()
  return shape
}

function createCaladiumShape() {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0.16)
  shape.lineTo(-0.34, 0)
  shape.bezierCurveTo(-0.58, 0.22, -0.55, 0.58, -0.34, 0.76)
  shape.bezierCurveTo(-0.18, 0.9, -0.06, 0.98, 0, 1.08)
  shape.bezierCurveTo(0.06, 0.98, 0.18, 0.9, 0.34, 0.76)
  shape.bezierCurveTo(0.55, 0.58, 0.58, 0.22, 0.34, 0)
  shape.lineTo(0, 0.16)
  shape.closePath()
  return shape
}

function createCanopyPadShape() {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(-0.42, -0.08, -0.72, 0.16, -0.62, 0.44)
  shape.bezierCurveTo(-0.88, 0.58, -0.66, 0.94, -0.4, 0.9)
  shape.bezierCurveTo(-0.28, 1.18, 0.04, 1.2, 0.14, 1)
  shape.bezierCurveTo(0.42, 1.14, 0.72, 0.9, 0.6, 0.66)
  shape.bezierCurveTo(0.84, 0.42, 0.58, 0.12, 0.32, 0.2)
  shape.bezierCurveTo(0.24, 0.02, 0.1, -0.04, 0, 0)
  shape.closePath()
  return shape
}

function createCompoundShape(
  lobes: number,
  maxWidth: number,
  tipLength = 1,
  curve = 0,
  innerRatio = 0.3,
  lobeThickness = 0.045,
) {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  for (let index = 1; index <= lobes; index += 1) {
    const y = (index / (lobes + 1)) * tipLength
    const center = Math.sin((y / tipLength) * Math.PI * 0.78) * curve
    const taper = Math.sin((index / (lobes + 1)) * Math.PI)
    const width = maxWidth * (0.35 + taper * 0.65)
    shape.lineTo(center - width * innerRatio, y - tipLength * lobeThickness)
    shape.lineTo(center - width, y)
    shape.lineTo(center - width * innerRatio, y + tipLength * lobeThickness)
  }
  shape.lineTo(curve, tipLength)
  for (let index = lobes; index >= 1; index -= 1) {
    const y = (index / (lobes + 1)) * tipLength
    const center = Math.sin((y / tipLength) * Math.PI * 0.78) * curve
    const taper = Math.sin((index / (lobes + 1)) * Math.PI)
    const width = maxWidth * (0.35 + taper * 0.65)
    shape.lineTo(center + width * innerRatio, y + tipLength * lobeThickness)
    shape.lineTo(center + width, y)
    shape.lineTo(center + width * innerRatio, y - tipLength * lobeThickness)
  }
  shape.closePath()
  return shape
}

function createGrassShape() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.09, 0)
  shape.bezierCurveTo(-0.06, 0.38, -0.14, 0.72, 0.03, 1.08)
  shape.bezierCurveTo(0.1, 0.68, 0.09, 0.34, 0.09, 0)
  shape.closePath()
  return shape
}

function createPoinsettiaShape() {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(-0.16, 0.24)
  shape.lineTo(-0.4, 0.34)
  shape.lineTo(-0.22, 0.52)
  shape.lineTo(-0.34, 0.75)
  shape.lineTo(-0.12, 0.82)
  shape.lineTo(0, 1.08)
  shape.lineTo(0.12, 0.82)
  shape.lineTo(0.34, 0.75)
  shape.lineTo(0.22, 0.52)
  shape.lineTo(0.4, 0.34)
  shape.lineTo(0.16, 0.24)
  shape.closePath()
  return shape
}

const LEAF_SHAPES: Record<LeafKind, THREE.Shape> = {
  caladium: createCaladiumShape(),
  canopy: createCanopyPadShape(),
  fern: createCompoundShape(6, 0.43, 1, 0.08, 0.12, 0.03),
  grass: createGrassShape(),
  heart: createHeartShape(),
  lance: createLanceShape(),
  ovate: createOvateShape(),
  palm: createCompoundShape(7, 0.38, 1, 0.14, 0.06, 0.025),
  pine: createCompoundShape(8, 0.24, 1, 0.035, 0.1, 0.025),
  poinsettia: createPoinsettiaShape(),
}

// Every plant reuses this tiny geometry library. Without it, each individual
// leaf rebuilt its own bevelled mesh during mount—a surprisingly expensive way
// to grow a conservatory, especially on phones.
const LEAF_GEOMETRIES = Object.fromEntries(
  Object.entries(LEAF_SHAPES).map(([kind, shape]) => [kind, new THREE.ExtrudeGeometry(shape, LEAF_EXTRUDE)]),
) as Record<LeafKind, THREE.ExtrudeGeometry>
const BOTANICAL_STEM_GEOMETRIES = new Map<string, THREE.TubeGeometry>()

function botanicalStemGeometry(points: readonly Vec3[], radius: number) {
  const key = `${radius}:${points.flat().join(',')}`
  const cached = BOTANICAL_STEM_GEOMETRIES.get(key)
  if (cached) return cached
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  )
  const geometry = new THREE.TubeGeometry(curve, 8, radius, 6, false)
  BOTANICAL_STEM_GEOMETRIES.set(key, geometry)
  return geometry
}

function ToonCylinder({
  position,
  scale,
  rotation = [0, 0, 0],
  color,
  topRatio = 1,
  outlineWidth = 0.018,
  segments = 8,
}: {
  position: Vec3
  scale: Vec3
  rotation?: Vec3
  color: string
  topRatio?: number
  outlineWidth?: number
  segments?: number
}) {
  return (
    <OutlineMesh
      position={[...position]}
      rotation={[...rotation]}
      scale={[...scale]}
      outlineWidth={outlineWidth * OUTLINE_SCALE}
      geometry={<cylinderGeometry args={[0.5 * topRatio, 0.5, 1, segments]} />}
      material={<meshToonMaterial color={color} gradientMap={TOON_RAMP} />}
    />
  )
}

function ToonLeaf({
  kind,
  position,
  rotation = [0, 0, 0],
  scale,
  color,
  veinColor = '#30483d',
  vein = true,
  emissive = '#000000',
  emissiveIntensity = 0,
  outlined = true,
}: {
  kind: LeafKind
  position: Vec3
  rotation?: Vec3
  scale: Vec3
  color: string
  veinColor?: string
  vein?: boolean
  emissive?: string
  emissiveIntensity?: number
  outlined?: boolean
}) {
  const material = (
    <meshToonMaterial
      color={color}
      gradientMap={TOON_RAMP}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  )
  const geometry = <primitive object={LEAF_GEOMETRIES[kind]} attach="geometry" />
  return (
    <group position={[...position]} rotation={[...rotation]} scale={[...scale]}>
      {outlined ? (
        <OutlineMesh
          position={[0, 0, LEAF_MESH_Z]}
          outlineWidth={0.018 * OUTLINE_SCALE}
          geometry={geometry}
          material={material}
        />
      ) : (
        <mesh position={[0, 0, LEAF_MESH_Z]}>
          {geometry}
          {material}
        </mesh>
      )}
      {vein ? (
        <mesh position={[0, kind === 'heart' ? -0.42 : 0.39, LEAF_VEIN_Z]} scale={[0.025, 0.66, 0.025]}>
          <cylinderGeometry args={[0.5, 0.75, 1, 6]} />
          <meshBasicMaterial color={veinColor} toneMapped />
        </mesh>
      ) : null}
    </group>
  )
}

function BotanicalStem({
  points,
  color,
  radius = 0.025,
  outlineWidth = 0.01,
}: {
  points: readonly Vec3[]
  color: string
  radius?: number
  outlineWidth?: number
}) {
  const geometry = botanicalStemGeometry(points, radius)
  return (
    <OutlineMesh
      outlineWidth={outlineWidth * OUTLINE_SCALE}
      geometry={<primitive object={geometry} attach="geometry" />}
      material={<meshToonMaterial color={color} gradientMap={TOON_RAMP} />}
    />
  )
}

function FernCrown({
  palette,
  y = 0.5,
  scale = 1,
  compact = false,
}: {
  palette: Palette
  y?: number
  scale?: number
  compact?: boolean
}) {
  const fronds = [
    { yaw: -1.75, roll: 1.08, length: 0.82, tone: 0 },
    { yaw: -1.05, roll: 0.76, length: 0.96, tone: 1 },
    { yaw: -0.35, roll: 0.42, length: 1.08, tone: 2 },
    { yaw: 0.35, roll: -0.34, length: 1.02, tone: 1 },
    { yaw: 1.05, roll: -0.72, length: 0.94, tone: 0 },
    { yaw: 1.75, roll: -1.02, length: 0.78, tone: 2 },
  ] as const
  return (
    <group scale={[scale, scale, scale]}>
      {(compact ? fronds.filter((_, index) => index !== 1) : fronds).map((frond) => (
        <ToonLeaf
          key={frond.yaw}
          kind="fern"
          position={[0, y, 0]}
          rotation={[0.24, frond.yaw, frond.roll]}
          scale={[0.42, frond.length, 0.86]}
          color={palette[frond.tone]}
          veinColor="#354738"
          vein={!compact}
          outlined={!compact}
        />
      ))}
    </group>
  )
}

function PalmCrown({ palette, crownY, scale = 1 }: { palette: Palette; crownY: number; scale?: number }) {
  const fronds = [
    { yaw: -2.35, roll: 1.1, length: 1.28, tone: 0 },
    { yaw: -1.52, roll: 0.88, length: 1.44, tone: 1 },
    { yaw: -0.74, roll: 0.55, length: 1.52, tone: 2 },
    { yaw: 0.1, roll: 0.14, length: 1.58, tone: 1 },
    { yaw: 0.86, roll: -0.56, length: 1.48, tone: 0 },
    { yaw: 1.64, roll: -0.9, length: 1.38, tone: 2 },
    { yaw: 2.42, roll: -1.12, length: 1.22, tone: 1 },
  ] as const
  return (
    <group position={[0, crownY, 0]}>
      <group scale={[scale, scale, scale]}>
        {fronds.map((frond) => (
        <ToonLeaf
          key={frond.yaw}
          kind="palm"
          position={[0, 0, 0]}
          rotation={[0.14, frond.yaw, frond.roll]}
          scale={[0.43, frond.length, 0.88]}
          color={palette[frond.tone]}
          veinColor="#3c523d"
        />
        ))}
      </group>
    </group>
  )
}

function UmbrellaCrown({ position, palette, toneOffset = 0 }: { position: Vec3; palette: Palette; toneOffset?: number }) {
  return (
    <group position={[...position]}>
      {Array.from({ length: 7 }, (_, index) => {
        const angle = (index / 7) * Math.PI * 2
        return (
          <ToonLeaf
            key={angle}
            kind="ovate"
            position={[0, 0, 0]}
            rotation={[Math.PI / 2 - 0.18, angle, 0]}
            scale={[0.34, 0.72, 0.75]}
            color={palette[(index + toneOffset) % palette.length]}
            veinColor="#354b3c"
            vein={false}
          />
        )
      })}
    </group>
  )
}

function HostaRosette({ palette, compact = false }: { palette: Palette; compact?: boolean }) {
  const leafCount = compact ? 5 : 6
  return (
    <group>
      {Array.from({ length: leafCount }, (_, index) => {
        const angle = (index / leafCount) * Math.PI * 2
        return (
          <ToonLeaf
            key={angle}
            kind="ovate"
            position={[0, 0.12, 0]}
            rotation={[Math.PI / 2 - 0.38, angle, 0]}
            scale={[0.28, 0.54 + (index % 2) * 0.08, 0.72]}
            color={palette[index % palette.length]}
            veinColor="#425845"
            vein={!compact}
            outlined={!compact}
          />
        )
      })}
    </group>
  )
}

function GrassClump({
  palette,
  height = 1,
  compact = false,
}: {
  palette: Palette
  height?: number
  compact?: boolean
}) {
  const bladeCount = compact ? 9 : 15
  const centerIndex = (bladeCount - 1) / 2
  const seedHeads = compact ? [-0.06] : [-0.22, -0.05, 0.16, 0.28]
  return (
    <group>
      {Array.from({ length: bladeCount }, (_, index) => {
        const spread = (index - centerIndex) * (compact ? 0.065 : 0.055)
        return (
          <ToonLeaf
            key={index}
            kind="grass"
            position={[spread, 0.32, (index % 3 - 1) * 0.075]}
            rotation={[0.12, (index - centerIndex) * 0.34, (index - centerIndex) * 0.075]}
            scale={[0.5, height * (0.7 + (index % 4) * 0.1), 0.68]}
            color={palette[index % palette.length]}
            vein={false}
            outlined={!compact}
          />
        )
      })}
      {seedHeads.map((x, index) => (
        <group key={x}>
          <BotanicalStem
            points={[[x, 0.32, 0], [x + 0.025, (compact ? 0.64 : 0.88) + index * 0.08, 0.02]]}
            color={compact ? palette[0] : '#7a7656'}
            radius={0.012}
            outlineWidth={0.005}
          />
          <ToonLeaf
            kind="grass"
            position={[x + 0.025, (compact ? 0.61 : 0.84) + index * 0.08, 0.02]}
            rotation={[0.08, index * 0.72, -0.14]}
            scale={[compact ? 0.24 : 0.38, compact ? 0.22 : 0.34, 0.5]}
            color={compact ? palette[2] : '#b6a875'}
            vein={false}
            outlined={!compact}
          />
        </group>
      ))}
    </group>
  )
}

function CaladiumClump({ compact = false }: { compact?: boolean }) {
  const leaves = [
    { end: [-0.25, 0.67, 0.02] as Vec3, roll: -0.56, yaw: -0.5, color: '#75a9a0', vein: '#d8eef0' },
    { end: [0.27, 0.72, 0.02] as Vec3, roll: 0.54, yaw: 0.48, color: '#a5c6b8', vein: '#f0c0d6' },
    { end: [-0.04, 0.88, -0.08] as Vec3, roll: -0.1, yaw: -0.16, color: '#d58ca8', vein: '#f2d7e2' },
    { end: [0.18, 0.58, 0.18] as Vec3, roll: 0.32, yaw: 1.05, color: '#be647f', vein: '#f0c0d6' },
    { end: [-0.28, 0.55, -0.16] as Vec3, roll: -0.72, yaw: -1.12, color: '#dce5df', vein: '#7fa298' },
  ] as const
  const size = compact ? 0.76 : 1
  return (
    <group scale={[size, size, size]}>
      {(compact ? leaves.slice(0, 4) : leaves).map((leaf, index) => (
        <group key={index}>
          <BotanicalStem points={[[0, 0.42, 0], leaf.end]} color="#5f7768" radius={0.018} />
          <ToonLeaf
            kind="caladium"
            position={leaf.end}
            rotation={[0.18, leaf.yaw, leaf.roll]}
            scale={[0.42, 0.66, 0.82]}
            color={leaf.color}
            veinColor={leaf.vein}
            emissive={leaf.color}
            emissiveIntensity={0.02}
            vein={!compact}
            outlined={!compact}
          />
        </group>
      ))}
    </group>
  )
}

function PoinsettiaPlant() {
  return (
    <group>
      {Array.from({ length: 7 }, (_, index) => {
        const angle = (index / 7) * Math.PI * 2
        return (
          <ToonLeaf
            key={`green-${angle}`}
            kind="poinsettia"
            position={[0, 0.56, 0]}
            rotation={[Math.PI / 2 - 0.28, angle, 0]}
            scale={[0.34, 0.58, 0.7]}
            color={index % 2 ? '#355d43' : '#466e4d'}
            veinColor="#254332"
            vein={false}
          />
        )
      })}
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2 + 0.18
        return (
          <ToonLeaf
            key={`red-${angle}`}
            kind="poinsettia"
            position={[0, 0.7, 0]}
            rotation={[Math.PI / 2 - 0.42, angle, 0]}
            scale={[0.3, 0.52, 0.72]}
            color={index % 2 ? '#a64856' : '#c35b68'}
            veinColor="#7b303d"
            vein={false}
          />
        )
      })}
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = (index / 5) * Math.PI * 2
        return (
          <mesh key={index} position={[Math.cos(angle) * 0.07, 0.75, Math.sin(angle) * 0.07]} scale={0.055}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshToonMaterial color="#d4ae58" gradientMap={TOON_RAMP} />
          </mesh>
        )
      })}
    </group>
  )
}

function WinterPinePlant() {
  return (
    <group>
      <ToonCylinder position={[0, 0.96, 0]} scale={[0.11, 1.52, 0.11]} color="#6b4d35" topRatio={0.58} />
      {[0, 1, 2, 3].map((tier) => {
        const y = 0.72 + tier * 0.38
        const length = 0.82 - tier * 0.13
        return Array.from({ length: 5 }, (_, index) => {
          const angle = (index / 5) * Math.PI * 2 + tier * 0.28
          return (
            <ToonLeaf
              key={`${tier}-${index}`}
              kind="pine"
              position={[0, y, 0]}
              rotation={[Math.PI / 2 - 0.12, angle, 0]}
              scale={[0.34, length, 0.68]}
              color={index % 2 ? '#3c674c' : '#527a58'}
              veinColor="#694b34"
              vein={false}
            />
          )
        })
      })}
      <ToonLeaf
        kind="pine"
        position={[0, 2.04, 0]}
        rotation={[0, 0, 0]}
        scale={[0.28, 0.52, 0.7]}
        color="#628762"
        veinColor="#694b34"
        vein={false}
      />
    </group>
  )
}

export function MuseumAtriumSpecimenBotany({
  family,
  palette,
  yaw,
}: {
  family: MuseumAtriumPlantFamily
  palette: Palette
  yaw: number
}) {
  if (family === 'bird-of-paradise') {
    const leaves = [
      { end: [-0.38, 0.88, 0.05] as Vec3, yaw: -0.35, roll: -0.48, length: 1.22, tone: 1 },
      { end: [0.36, 0.94, -0.06] as Vec3, yaw: 0.42, roll: 0.45, length: 1.3, tone: 2 },
      { end: [-0.08, 1.12, -0.14] as Vec3, yaw: -0.72, roll: -0.12, length: 1.38, tone: 1 },
      { end: [0.18, 0.78, 0.24] as Vec3, yaw: 0.96, roll: 0.24, length: 1.06, tone: 0 },
      { end: [-0.46, 0.7, -0.16] as Vec3, yaw: -1.18, roll: -0.68, length: 0.94, tone: 0 },
    ] as const
    return (
      <group rotation={[0, yaw, 0]}>
        {leaves.map((leaf, index) => (
          <group key={index}>
            <BotanicalStem points={[[0, 0.45, 0], leaf.end]} color="#607050" radius={0.026} />
            <ToonLeaf
              kind="lance"
              position={leaf.end}
              rotation={[0.08, leaf.yaw, leaf.roll]}
              scale={[0.48, leaf.length, 0.9]}
              color={palette[leaf.tone]}
              veinColor="#40543f"
            />
          </group>
        ))}
        <BotanicalStem points={[[0.08, 0.46, 0], [0.22, 1.34, 0.1]]} color="#607050" radius={0.022} />
        <ToonLeaf kind="poinsettia" position={[0.2, 1.32, 0.1]} rotation={[0.2, 0.3, -1.22]} scale={[0.22, 0.58, 0.72]} color="#e07a3d" veinColor="#ab4d2d" />
        <ToonLeaf kind="lance" position={[0.16, 1.35, 0.12]} rotation={[0.18, 0.28, -1.14]} scale={[0.12, 0.42, 0.62]} color="#456e89" vein={false} />
      </group>
    )
  }

  if (family === 'kentia-palm') {
    return (
      <group rotation={[0, yaw, 0]}>
        <ToonCylinder position={[-0.08, 1.2, 0]} scale={[0.2, 1.58, 0.2]} rotation={[0, 0, 0.05]} color="#70543b" topRatio={0.62} />
        <ToonCylinder position={[0.11, 1.08, 0.03]} scale={[0.16, 1.34, 0.16]} rotation={[0, 0, -0.08]} color="#806247" topRatio={0.58} />
        <PalmCrown palette={palette} crownY={1.98} scale={0.72} />
      </group>
    )
  }

  if (family === 'umbrella-tree') {
    const branches = [
      { end: [-0.34, 1.68, 0.05] as Vec3, tone: 0 },
      { end: [0.32, 1.88, -0.08] as Vec3, tone: 1 },
      { end: [-0.04, 2.28, 0.03] as Vec3, tone: 2 },
    ] as const
    return (
      <group rotation={[0, yaw, 0]}>
        <ToonCylinder position={[0, 1.04, 0]} scale={[0.18, 1.38, 0.18]} color="#6c5039" topRatio={0.6} />
        {branches.map((branch, index) => (
          <group key={index}>
            <BotanicalStem points={[[0, 1.18, 0], branch.end]} color="#6c5039" radius={0.035} />
            <UmbrellaCrown position={branch.end} palette={palette} toneOffset={branch.tone} />
          </group>
        ))}
      </group>
    )
  }

  const branches = [
    { points: [[0, 0.82, 0], [-0.42, 1.45, 0.04], [-0.7, 1.88, 0.08]] as const, side: -1 },
    { points: [[0, 1.0, 0], [0.38, 1.62, -0.04], [0.68, 2.02, -0.1]] as const, side: 1 },
    { points: [[0, 1.2, 0], [-0.12, 1.96, 0.04], [-0.05, 2.42, 0.02]] as const, side: 0 },
  ] as const
  return (
    <group rotation={[0, yaw, 0]}>
      <ToonCylinder position={[0, 1.03, 0]} scale={[0.2, 1.55, 0.2]} color="#664b35" topRatio={0.62} />
      {branches.map((branch, branchIndex) => (
        <group key={branchIndex}>
          <BotanicalStem points={branch.points} color="#664b35" radius={0.034} />
          {[0, 1, 2, 3].map((leafIndex) => {
            const point = branch.points[Math.min(1 + Math.floor(leafIndex / 2), branch.points.length - 1)]
            const flip = leafIndex % 2 ? 1 : -1
            return (
              <ToonLeaf
                key={leafIndex}
                kind="ovate"
                position={[point[0] + flip * 0.08, point[1] + leafIndex * 0.08, point[2] + flip * 0.05]}
                rotation={[0.18, branch.side * 0.6 + flip * 0.48, flip * 0.72]}
                scale={[0.24, 0.48, 0.72]}
                color={palette[(branchIndex + leafIndex) % palette.length]}
                veinColor="#415442"
              />
            )
          })}
        </group>
      ))}
    </group>
  )
}

export function MuseumGalleryPlantBotany({ family }: { family: MuseumGalleryPlantFamily }) {
  if (family === 'portrait-palm') {
    const palette = ['#355842', '#52765a', '#8a5965'] as const
    return (
      <group>
        <ToonCylinder position={[-0.08, 0.9, 0]} scale={[0.12, 0.9, 0.12]} color="#5b4035" topRatio={0.6} />
        <ToonCylinder position={[0.1, 0.86, 0.03]} scale={[0.1, 0.8, 0.1]} color="#765447" topRatio={0.55} />
        <PalmCrown palette={palette} crownY={1.36} scale={0.44} />
      </group>
    )
  }
  if (family === 'portrait-fern') return <FernCrown palette={['#355842', '#52765a', '#8a5965']} y={0.56} scale={0.84} />

  if (family === 'heart-hoya') {
    const leaves = [
      [-0.27, 0.84, 0.08, -0.52, '#507c70'],
      [0.28, 1.02, 0.06, 0.48, '#6f988a'],
      [-0.25, 1.28, 0.08, -0.42, '#7ca99a'],
      [0.26, 1.5, 0.06, 0.4, '#507c70'],
      [-0.08, 1.68, 0.1, -0.18, '#8cb3a4'],
    ] as const
    return (
      <group>
        <ToonCylinder position={[-0.24, 1.14, 0]} scale={[0.045, 1.34, 0.045]} color="#b39d78" outlineWidth={0.007} />
        <ToonCylinder position={[0.24, 1.14, 0]} scale={[0.045, 1.34, 0.045]} color="#b39d78" outlineWidth={0.007} />
        <ToonCylinder position={[0, 1.8, 0]} scale={[0.045, 0.5, 0.045]} rotation={[0, 0, Math.PI / 2]} color="#b39d78" outlineWidth={0.007} />
        <BotanicalStem points={[[0, 0.52, 0.04], [-0.28, 1.04, 0.06], [0.22, 1.5, 0.06], [-0.08, 1.78, 0.08]]} color="#496c5e" radius={0.018} />
        {leaves.map(([x, y, z, roll, color]) => (
          <ToonLeaf
            key={y}
            kind="heart"
            position={[x, y, z]}
            rotation={[0.16, x > 0 ? 0.42 : -0.42, roll]}
            scale={[0.38, 0.46, 0.82]}
            color={color}
            veinColor="#d0d9cf"
            emissive={color}
            emissiveIntensity={0.02}
          />
        ))}
        {[0, 1, 2, 3, 4].map((index) => {
          const angle = (index / 5) * Math.PI * 2
          return (
            <mesh key={index} position={[0.09 + Math.cos(angle) * 0.055, 1.58 + Math.sin(angle) * 0.055, 0.14]} rotation={[0, 0, angle]}>
              <circleGeometry args={[0.042, 5]} />
              <meshBasicMaterial color={index % 2 ? '#f2c8d7' : '#fff0e7'} toneMapped={false} />
            </mesh>
          )
        })}
      </group>
    )
  }

  if (family === 'mineral-caladium') return <CaladiumClump />
  if (family === 'northlight-fern') return <FernCrown palette={['#72826a', '#91a18c', '#b8c2ac']} y={0.52} scale={0.9} />
  if (family === 'field-grass') return <GrassClump palette={['#78867b', '#9aa28a', '#b9a77d']} height={1.05} />

  if (family === 'winter-poinsettia') return <PoinsettiaPlant />
  if (family === 'winter-pine') return <WinterPinePlant />

  return (
    <group>
      <BotanicalStem points={[[-0.42, 0.38, 0.03], [-0.08, 0.66, 0.01], [0.28, 0.96, -0.04]]} color="#806a54" radius={0.035} />
      <group position={[-0.16, 0.2, 0.12]} scale={[0.62, 0.62, 0.62]}>
        <GrassClump palette={['#6f8068', '#8d9c80', '#a7ad91']} height={0.54} compact />
      </group>
      {[
        [-0.3, 0.5, 0.04, -0.8, '#718069'],
        [-0.04, 0.7, 0.04, 0.72, '#aab39d'],
        [0.24, 0.9, 0, -0.48, '#84917d'],
        [0.36, 0.68, -0.03, 0.7, '#94a089'],
      ].map(([x, y, z, roll, color]) => (
        <ToonLeaf
          key={String(x)}
          kind="ovate"
          position={[Number(x), Number(y), Number(z)]}
          rotation={[0.16, Number(x), Number(roll)]}
          scale={[0.2, 0.42, 0.68]}
          color={String(color)}
          veinColor="#475547"
        />
      ))}
    </group>
  )
}

export function MuseumAtriumBorderBotany({ variant, palette }: { variant: number; palette: Palette }) {
  if (variant % 4 === 0) return <FernCrown palette={palette} y={0.12} scale={0.46} compact />
  if (variant % 4 === 1) return <HostaRosette palette={palette} compact />
  if (variant % 4 === 2) return <GrassClump palette={palette} height={0.48} compact />
  return <CaladiumClump compact />
}

export function MuseumExteriorTreeBotany({
  variant,
  palette,
  compact = false,
}: {
  variant: 0 | 1 | 2
  palette: Palette
  compact?: boolean
}) {
  const canopyCenters = [
    [
      [-0.32, 2.05, 0.04], [0.42, 2.15, -0.08], [-0.04, 2.7, 0.06], [-0.62, 2.48, -0.04], [0.22, 2.46, 0.3],
    ],
    [
      [0.08, 2.04, 0.06], [-0.5, 2.26, -0.04], [0.34, 2.66, -0.02], [0.68, 2.32, 0.1], [-0.06, 2.5, 0.34],
    ],
    [
      [-0.08, 2.08, 0.04], [0.48, 2.3, -0.06], [-0.44, 2.62, 0.08], [0.1, 2.92, -0.02], [0.08, 2.48, 0.36],
    ],
  ] as const
  const centers = canopyCenters[variant]
  if (compact) {
    return (
      <group>
        <ToonCylinder position={[0, 1.03, 0]} scale={[0.3, 1.94, 0.3]} color="#654531" topRatio={0.58} outlineWidth={0.024} />
        <BotanicalStem points={[[0, 1.3, 0], [-0.12, 1.72, 0.02], [-0.42, 2.12, 0.03]]} color="#5b3d2b" radius={0.075} outlineWidth={0.014} />
        {centers.slice(0, 4).map((center, index) => (
          <ToonLeaf
            key={index}
            kind="canopy"
            position={[center[0], center[1] - 0.42, center[2]]}
            rotation={[0.08, index * 0.42, index % 2 ? 0.18 : -0.18]}
            scale={[0.72 - (index % 2) * 0.08, 0.94 + (index % 3) * 0.08, 1.1]}
            color={palette[index % palette.length]}
            vein={false}
            outlined={false}
          />
        ))}
      </group>
    )
  }
  return (
    <group>
      <ToonCylinder position={[0, 1.03, 0]} scale={[0.34, 1.94, 0.34]} color="#654531" topRatio={0.58} outlineWidth={0.03} />
      <BotanicalStem points={[[0, 1.3, 0], [-0.18, 1.64, 0.02], [-0.55, 2.04, 0.03]]} color="#5b3d2b" radius={0.09} outlineWidth={0.02} />
      <BotanicalStem points={[[0, 1.34, 0], [0.2, 1.7, -0.02], [0.58, 2.12, -0.08]]} color="#5b3d2b" radius={0.085} outlineWidth={0.02} />
      {centers.flatMap((center, centerIndex) => [0, 1].map((side) => {
        const direction = side ? 1 : -1
        return (
          <ToonLeaf
            key={`${centerIndex}-${side}`}
            kind="canopy"
            position={[center[0] + direction * 0.18, center[1] - 0.42 + (side ? 0.12 : -0.06), center[2] + direction * 0.1]}
            rotation={[0.08, side * Math.PI / 2 + centerIndex * 0.08, direction * 0.22]}
            scale={[0.62 - (centerIndex % 2) * 0.06, 0.9 + (centerIndex % 3) * 0.08, 1.1]}
            color={palette[(centerIndex + side + 1) % palette.length]}
            veinColor="#40543f"
            vein={false}
            outlined={false}
          />
        )
      }))}
    </group>
  )
}

export function MuseumEvergreenSprig({
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  color,
}: {
  position: Vec3
  rotation?: Vec3
  scale?: Vec3
  color: string
}) {
  return (
    <ToonLeaf
      kind="pine"
      position={position}
      rotation={rotation}
      scale={scale}
      color={color}
      veinColor="#6d4c35"
      vein={false}
      outlined={false}
    />
  )
}
