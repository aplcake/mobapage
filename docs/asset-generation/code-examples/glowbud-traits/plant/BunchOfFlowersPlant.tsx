import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'
import { createCartoonRadialPetalGeometry } from './CartoonRadialBloom'

const INK = '#211827'
const STEM_DEEP = '#294d34'
const STEM_MID = '#477743'
const STEM_LIGHT = '#73a154'
const LEAF_DEEP = '#315c3d'
const LEAF_MID = '#4d874b'
const LEAF_LIGHT = '#75ad58'
const BLUE_DEEP = '#23628e'
const BLUE_MID = '#3f9fc6'
const BLUE_LIGHT = '#72d1df'
const VIOLET_DEEP = '#61308a'
const VIOLET_MID = '#9448bd'
const VIOLET_LIGHT = '#c073d4'
const GOLD_DEEP = '#a86424'
const GOLD_MID = '#e29b38'
const GOLD_LIGHT = '#f6c653'
const CENTER_BROWN = '#704532'
const CENTER_GOLD = '#ffd75a'
const CENTER_TEAL = '#257b78'
const SOIL_DEEP = '#2d1c19'
const SOIL_MID = '#553328'
const SOIL_LIGHT = '#79513a'

let foliageRamp: THREE.DataTexture | null = null
let bloomRamp: THREE.DataTexture | null = null

function createToonRamp(colors: number[]) {
  const texture = new THREE.DataTexture(
    new Uint8Array(colors),
    colors.length / 4,
    1,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  )
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function getFoliageRamp() {
  if (!foliageRamp) {
    foliageRamp = createToonRamp([
      35, 67, 41, 255,
      73, 126, 65, 255,
      132, 176, 82, 255,
    ])
  }
  return foliageRamp
}

function getBloomRamp() {
  if (!bloomRamp) {
    bloomRamp = createToonRamp([
      47, 30, 56, 255,
      135, 82, 147, 255,
      244, 202, 113, 255,
    ])
  }
  return bloomRamp
}

function foliageToon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getFoliageRamp()} />
}

function bloomToon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getBloomRamp()} />
}

function BouquetOutlinedMesh({
  geometry,
  material,
  position = [0, 0, 0],
  rotation,
  scale = [1, 1, 1],
  outlineWidth = 0.006,
  outlineColor = INK,
}: {
  geometry: ReactElement
  material: ReactElement
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  outlineWidth?: number
  outlineColor?: string
}) {
  return (
    <OutlineMesh
      position={position}
      rotation={rotation}
      scale={scale}
      outlineWidth={outlineWidth}
      outlineColor={outlineColor}
      geometry={geometry}
      material={material}
    />
  )
}

type BloomPalette = 'blue' | 'violet' | 'gold'

type BloomSpec = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  petalCount: number
  palette: BloomPalette
  center: string
  phase: number
}

const BLOOMS: BloomSpec[] = [
  {
    id: 'hero-blue',
    position: [0, 0.76, -0.02],
    rotation: [-0.05, 0.04, 0],
    scale: 1.08,
    petalCount: 8,
    palette: 'blue',
    center: CENTER_BROWN,
    phase: 0,
  },
  {
    id: 'left-violet',
    position: [-0.235, 0.66, 0.015],
    rotation: [0.02, -0.28, -0.11],
    scale: 0.96,
    petalCount: 7,
    palette: 'violet',
    center: CENTER_GOLD,
    phase: 1,
  },
  {
    id: 'right-gold',
    position: [0.235, 0.68, 0.025],
    rotation: [-0.02, 0.3, 0.1],
    scale: 0.93,
    petalCount: 6,
    palette: 'gold',
    center: CENTER_BROWN,
    phase: 2,
  },
  {
    id: 'front-violet',
    position: [-0.1, 0.56, -0.155],
    rotation: [-0.1, -0.06, -0.04],
    scale: 0.82,
    petalCount: 6,
    palette: 'violet',
    center: CENTER_TEAL,
    phase: 3,
  },
  {
    id: 'front-blue',
    position: [0.125, 0.57, -0.145],
    rotation: [-0.12, 0.1, 0.05],
    scale: 0.78,
    petalCount: 7,
    palette: 'blue',
    center: CENTER_GOLD,
    phase: 4,
  },
  {
    id: 'rear-gold',
    position: [0.115, 0.79, 0.125],
    rotation: [0.08, 0.18, 0.06],
    scale: 0.72,
    petalCount: 6,
    palette: 'gold',
    center: CENTER_BROWN,
    phase: 5,
  },
  {
    id: 'far-left-blue',
    position: [-0.31, 0.55, 0.075],
    rotation: [0.02, -0.42, -0.15],
    scale: 0.67,
    petalCount: 6,
    palette: 'blue',
    center: CENTER_BROWN,
    phase: 6,
  },
  {
    id: 'far-right-violet',
    position: [0.31, 0.54, 0.06],
    rotation: [0.04, 0.42, 0.14],
    scale: 0.68,
    petalCount: 7,
    palette: 'violet',
    center: CENTER_GOLD,
    phase: 7,
  },
]

function paletteColors(palette: BloomPalette) {
  if (palette === 'blue') {
    return { deep: BLUE_DEEP, mid: BLUE_MID, light: BLUE_LIGHT }
  }
  if (palette === 'violet') {
    return { deep: VIOLET_DEEP, mid: VIOLET_MID, light: VIOLET_LIGHT }
  }
  return { deep: GOLD_DEEP, mid: GOLD_MID, light: GOLD_LIGHT }
}

function FlowerBloom({ spec, activity }: { spec: BloomSpec; activity: number }) {
  const bloomMotion = useRef<THREE.Group>(null)
  const colors = paletteColors(spec.palette)
  const outerPetals = useMemo(
    () =>
      Array.from({ length: spec.petalCount }, (_, index) => {
        const angle = (index / spec.petalCount) * Math.PI * 2 + spec.phase * 0.11
        const alternating = index % 2 === 0 ? 1 : -1
        return {
          angle,
          depth: (index % 3) * 0.004,
          geometry: createCartoonRadialPetalGeometry({
            length: 0.128 + (index % 2) * 0.01,
            width: 0.057 + (index % 3) * 0.003,
            thickness: 0.026,
            curl: 0.035 + (index % 2) * 0.006,
            depth: 0.021,
            deep: colors.deep,
            mid: colors.mid,
            light: colors.light,
            variation: alternating * (0.22 + spec.phase * 0.025),
          }),
        }
      }),
    [colors.deep, colors.light, colors.mid, spec.petalCount, spec.phase],
  )
  const innerPetalCount = Math.max(3, Math.round(spec.petalCount * 0.55))
  const innerPetals = useMemo(
    () =>
      Array.from({ length: innerPetalCount }, (_, index) => {
        const angle = (index / innerPetalCount) * Math.PI * 2 + spec.phase * 0.14 + 0.38
        return {
          angle,
          geometry: createCartoonRadialPetalGeometry({
            length: 0.074 + (index % 2) * 0.006,
            width: 0.034,
            thickness: 0.022,
            curl: 0.045,
            depth: 0.018,
            deep: colors.deep,
            mid: index % 2 === 0 ? colors.light : colors.mid,
            light: colors.light,
            variation: (index % 2 === 0 ? 1 : -1) * 0.18,
          }),
        }
      }),
    [colors.deep, colors.light, colors.mid, innerPetalCount, spec.phase],
  )

  useFrame(({ clock }) => {
    if (!bloomMotion.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    bloomMotion.current.rotation.z = Math.sin(t * 0.55 + spec.phase * 0.9) * 0.006 * motion
    bloomMotion.current.rotation.x = Math.sin(t * 0.47 + spec.phase * 0.7) * 0.0035 * motion
  })

  return (
    <group
      position={spec.position}
      rotation={[spec.rotation[0], spec.rotation[1] + Math.PI, spec.rotation[2]]}
      scale={spec.scale}
    >
      <group ref={bloomMotion}>
        <BouquetOutlinedMesh
          position={[0, 0, -0.05]}
          scale={[0.088, 0.088, 0.05]}
          outlineWidth={0.003}
          outlineColor={LEAF_DEEP}
          geometry={<sphereGeometry args={[1, 10, 6]} />}
          material={foliageToon(STEM_MID)}
        />
        {Array.from({ length: 5 }, (_, index) => {
          const angle = (index / 5) * Math.PI * 2 + spec.phase * 0.13
          return (
            <BouquetOutlinedMesh
              key={`${spec.id}-sepal-${index}`}
              position={[
                Math.cos(angle) * 0.035,
                Math.sin(angle) * 0.035,
                -0.054,
              ]}
              rotation={[
                0.05 * Math.sin(angle),
                0.05 * Math.cos(angle),
                angle - Math.PI / 2,
              ]}
              scale={[0.027, 0.074, 0.022]}
              outlineWidth={0.0025}
              outlineColor={LEAF_DEEP}
              geometry={<capsuleGeometry args={[1, 0.55, 5, 8]} />}
              material={foliageToon(index % 2 === 0 ? STEM_MID : STEM_LIGHT)}
            />
          )
        })}
        {outerPetals.map((petal, index) => (
          <BouquetOutlinedMesh
            key={`${spec.id}-petal-${index}`}
            position={[
              Math.cos(petal.angle) * 0.018,
              Math.sin(petal.angle) * 0.018,
              -0.008 + petal.depth,
            ]}
            rotation={[
              0.09 * Math.sin(petal.angle),
              -0.09 * Math.cos(petal.angle),
              petal.angle - Math.PI / 2,
            ]}
            outlineWidth={0.004}
            outlineColor={colors.deep}
            geometry={<primitive object={petal.geometry} attach="geometry" />}
            material={<meshToonMaterial vertexColors />}
          />
        ))}
        {innerPetals.map((petal, index) => (
          <BouquetOutlinedMesh
            key={`${spec.id}-inner-petal-${index}`}
            position={[
              Math.cos(petal.angle) * 0.012,
              Math.sin(petal.angle) * 0.012,
              0.036,
            ]}
            rotation={[
              0.13 * Math.sin(petal.angle),
              -0.13 * Math.cos(petal.angle),
              petal.angle - Math.PI / 2,
            ]}
            outlineWidth={0.0028}
            outlineColor={colors.deep}
            geometry={<primitive object={petal.geometry} attach="geometry" />}
            material={<meshToonMaterial vertexColors />}
          />
        ))}
        <BouquetOutlinedMesh
          position={[0, 0, 0.088]}
          scale={[0.061, 0.061, 0.047]}
          outlineWidth={0.0045}
          outlineColor={INK}
          geometry={<sphereGeometry args={[1, 12, 7]} />}
          material={bloomToon(spec.center)}
        />
        {Array.from({ length: 7 }, (_, index) => {
          const radial = Math.sqrt((index + 0.5) / 7) * 0.038
          const angle = index * Math.PI * (3 - Math.sqrt(5)) + spec.phase * 0.37
          const color = index % 3 === 0 ? CENTER_GOLD : colors.light
          return (
            <mesh
              key={`${spec.id}-center-seed-${index}`}
              position={[
                Math.cos(angle) * radial,
                Math.sin(angle) * radial,
                0.13 - radial * 0.25,
              ]}
              scale={[0.009, 0.009, 0.008]}
            >
              <sphereGeometry args={[1, 6, 4]} />
              <meshBasicMaterial color={color} />
            </mesh>
          )
        })}
        <mesh position={[-0.025, 0.028, 0.138]} scale={[0.016, 0.01, 0.007]}>
          <sphereGeometry args={[1, 7, 4]} />
          <meshBasicMaterial color={CENTER_GOLD} />
        </mesh>
      </group>
    </group>
  )
}

function createStemCurve(spec: BloomSpec) {
  const end = new THREE.Vector3(...spec.position)
  const root = new THREE.Vector3(spec.position[0] * 0.12, -0.12, spec.position[2] * 0.1)
  return new THREE.CatmullRomCurve3([
    root,
    new THREE.Vector3(
      THREE.MathUtils.lerp(root.x, end.x, 0.3),
      end.y * 0.29,
      THREE.MathUtils.lerp(root.z, end.z, 0.3),
    ),
    new THREE.Vector3(
      THREE.MathUtils.lerp(root.x, end.x, 0.72),
      end.y * 0.68,
      THREE.MathUtils.lerp(root.z, end.z, 0.72),
    ),
    end.clone().add(new THREE.Vector3(0, -0.04, 0)),
  ])
}

function BouquetStemBundle() {
  const curves = useMemo(() => BLOOMS.map(createStemCurve), [])

  return (
    <group>
      {curves.map((curve, index) => (
        <OutlineMesh
          key={`bouquet-stem-${BLOOMS[index].id}`}
          outlineWidth={0.003}
          outlineColor={STEM_DEEP}
          geometry={<tubeGeometry args={[curve, 16, index < 3 ? 0.017 : 0.0135, 7, false]} />}
          material={foliageToon(index % 3 === 0 ? STEM_LIGHT : STEM_MID)}
        />
      ))}
    </group>
  )
}

type BouquetLeafSpec = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
}

const BOUQUET_LEAVES: BouquetLeafSpec[] = [
  { id: 'left-low', position: [-0.18, 0.25, -0.015], rotation: [0.18, -0.32, 1.03], scale: [0.055, 0.16, 0.04], color: LEAF_MID },
  { id: 'right-low', position: [0.18, 0.27, 0], rotation: [-0.14, 0.3, -1.02], scale: [0.056, 0.165, 0.041], color: LEAF_LIGHT },
  { id: 'front-left', position: [-0.13, 0.38, -0.085], rotation: [0.3, -0.2, 0.92], scale: [0.05, 0.145, 0.038], color: LEAF_LIGHT },
  { id: 'front-right', position: [0.13, 0.4, -0.08], rotation: [0.28, 0.22, -0.9], scale: [0.052, 0.148, 0.039], color: LEAF_MID },
  { id: 'rear-left', position: [-0.12, 0.43, 0.075], rotation: [-0.22, -0.3, 1.08], scale: [0.047, 0.13, 0.036], color: LEAF_DEEP },
  { id: 'rear-right', position: [0.12, 0.44, 0.08], rotation: [-0.2, 0.28, -1.06], scale: [0.048, 0.134, 0.036], color: LEAF_LIGHT },
  { id: 'side-left', position: [-0.255, 0.47, 0.015], rotation: [0.08, -0.45, 1.2], scale: [0.045, 0.12, 0.034], color: LEAF_MID },
  { id: 'side-right', position: [0.255, 0.46, 0.025], rotation: [-0.06, 0.43, -1.18], scale: [0.046, 0.124, 0.035], color: LEAF_DEEP },
]

function BouquetFoliage() {
  return (
    <group>
      {BOUQUET_LEAVES.map((leaf) => (
        <BouquetOutlinedMesh
          key={leaf.id}
          position={leaf.position}
          rotation={leaf.rotation}
          scale={leaf.scale}
          outlineWidth={0.003}
          outlineColor={LEAF_DEEP}
          geometry={<capsuleGeometry args={[1, 0.8, 5, 9]} />}
          material={foliageToon(leaf.color)}
        />
      ))}
      <BouquetOutlinedMesh
        position={[0, 0.13, 0]}
        scale={[0.2, 0.09, 0.17]}
        outlineWidth={0.004}
        outlineColor={LEAF_DEEP}
        geometry={<sphereGeometry args={[1, 11, 6]} />}
        material={foliageToon(LEAF_MID)}
      />
    </group>
  )
}

function SoilAnchor() {
  return (
    <group>
      <mesh position={[0, -0.055, 0]} scale={[0.23, 0.036, 0.155]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={SOIL_DEEP} />
      </mesh>
      <mesh position={[-0.095, -0.027, -0.008]} scale={[0.11, 0.018, 0.066]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={SOIL_MID} />
      </mesh>
      <mesh position={[0.1, -0.026, 0.008]} scale={[0.102, 0.017, 0.062]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={SOIL_LIGHT} />
      </mesh>
    </group>
  )
}

export function BunchOfFlowersPlant({ activity = 1 }: { activity?: number }) {
  const bouquet = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!bouquet.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const sway = Math.sin(t * 0.48 + 0.4) * 0.006 * motion
    const breathe = Math.sin(t * 0.7 + 0.2) * 0.0018 * motion
    bouquet.current.rotation.z = -0.005 + sway
    bouquet.current.rotation.x = Math.sin(t * 0.41 + 0.7) * 0.0025 * motion
    bouquet.current.scale.set(
      1.25 * (1 + breathe),
      1.17 * (1 - breathe * 0.14),
      1.25 * (1 + breathe),
    )
  })

  return (
    <group ref={bouquet} scale={[1.25, 1.17, 1.25]}>
      <SoilAnchor />
      <BouquetStemBundle />
      <BouquetFoliage />
      {BLOOMS.map((spec) => (
        <FlowerBloom key={spec.id} spec={spec} activity={activity} />
      ))}
    </group>
  )
}
