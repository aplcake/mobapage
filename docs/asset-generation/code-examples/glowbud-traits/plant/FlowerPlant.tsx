import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'
import {
  CartoonRadialBloom,
  createCartoonRadialPetalGeometry,
  type CartoonRadialBloomPalette,
} from './CartoonRadialBloom'

const INK = '#211827'
const PETAL_DEEP = '#183a9b'
const PETAL_MID = '#356ddd'
const PETAL_LIGHT = '#78a8ff'
const CENTER_DEEP = '#342052'
const CENTER_MID = '#4d2f78'
const CENTER_LIGHT = '#9872c4'
const STEM_DEEP = '#27472e'
const STEM_MID = '#427741'
const STEM_LIGHT = '#72a65a'

const FLOWER_PALETTE: CartoonRadialBloomPalette = {
  petalDeep: PETAL_DEEP,
  petalMid: PETAL_MID,
  petalLight: PETAL_LIGHT,
  centerDeep: CENTER_DEEP,
  centerMid: CENTER_MID,
  centerLight: CENTER_LIGHT,
  outline: INK,
}

const FOLIAGE_PALETTE = {
  deep: STEM_DEEP,
  mid: STEM_MID,
  light: STEM_LIGHT,
}

let foliageRamp: THREE.DataTexture | null = null

function createFoliageRamp() {
  const texture = new THREE.DataTexture(
    new Uint8Array([
      39, 65, 42, 255,
      81, 126, 67, 255,
      139, 174, 85, 255,
    ]),
    3,
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
  if (!foliageRamp) foliageRamp = createFoliageRamp()
  return foliageRamp
}

function foliageToon(color: string, vertexColors = false) {
  return (
    <meshToonMaterial
      color={color}
      vertexColors={vertexColors}
      gradientMap={getFoliageRamp()}
    />
  )
}

function FlowerOutlinedMesh({
  geometry,
  material,
  position = [0, 0, 0],
  rotation,
  scale = [1, 1, 1],
  outlineWidth = 0.005,
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

function FlowerCalyx() {
  const sepals = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => ({
        angle: (index / 5) * Math.PI * 2 + 0.26,
        geometry: createCartoonRadialPetalGeometry({
          length: 0.12 + (index % 2) * 0.008,
          width: 0.037,
          thickness: 0.021,
          curl: -0.022,
          depth: 0.012,
          ...FOLIAGE_PALETTE,
          variation: index * 0.17,
        }),
      })),
    [],
  )

  return (
    <group position={[0, 0, -0.055]}>
      <FlowerOutlinedMesh
        position={[0, 0, -0.018]}
        scale={[0.105, 0.105, 0.06]}
        outlineWidth={0.004}
        outlineColor={STEM_DEEP}
        geometry={<sphereGeometry args={[1, 12, 7]} />}
        material={foliageToon(STEM_MID)}
      />
      {sepals.map((sepal, index) => (
        <FlowerOutlinedMesh
          key={`flower-sepal-${index}`}
          position={[
            Math.cos(sepal.angle) * 0.012,
            Math.sin(sepal.angle) * 0.012,
            -0.018,
          ]}
          rotation={[0, 0, sepal.angle - Math.PI / 2]}
          scale={[1, 1, 1]}
          outlineWidth={0.003}
          outlineColor={STEM_DEEP}
          geometry={<primitive object={sepal.geometry} attach="geometry" />}
          material={foliageToon(STEM_MID, true)}
        />
      ))}
    </group>
  )
}

function FlowerStemAndLeaves() {
  const stemCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.17, 0.025),
        new THREE.Vector3(-0.012, 0.12, 0.018),
        new THREE.Vector3(0.022, 0.38, 0.008),
        new THREE.Vector3(0.01, 0.6, -0.002),
        new THREE.Vector3(0.03, 0.73, 0),
      ]),
    [],
  )
  const leafGeometry = useMemo(
    () =>
      createCartoonRadialPetalGeometry({
        length: 0.19,
        width: 0.075,
        thickness: 0.034,
        curl: 0.038,
        depth: 0.022,
        ...FOLIAGE_PALETTE,
        variation: 0.35,
      }),
    [],
  )
  const smallLeafGeometry = useMemo(
    () =>
      createCartoonRadialPetalGeometry({
        length: 0.15,
        width: 0.062,
        thickness: 0.03,
        curl: 0.032,
        depth: 0.018,
        ...FOLIAGE_PALETTE,
        variation: -0.4,
      }),
    [],
  )

  return (
    <group>
      <OutlineMesh
        outlineWidth={0.0045}
        outlineColor={STEM_DEEP}
        geometry={<tubeGeometry args={[stemCurve, 24, 0.032, 8, false]} />}
        material={foliageToon(STEM_MID)}
      />
      <FlowerOutlinedMesh
        position={[-0.008, 0.21, 0.012]}
        rotation={[0.15, -0.16, 1.2]}
        outlineWidth={0.004}
        outlineColor={STEM_DEEP}
        geometry={<primitive object={leafGeometry} attach="geometry" />}
        material={foliageToon(STEM_MID, true)}
      />
      <FlowerOutlinedMesh
        position={[0.015, 0.4, 0.006]}
        rotation={[-0.08, 0.16, -1.08]}
        outlineWidth={0.004}
        outlineColor={STEM_DEEP}
        geometry={<primitive object={smallLeafGeometry} attach="geometry" />}
        material={foliageToon(STEM_LIGHT, true)}
      />
    </group>
  )
}

export function FlowerPlant({ activity = 1 }: { activity?: number }) {
  const plant = useRef<THREE.Group>(null)
  const bloomMotion = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    if (plant.current) {
      plant.current.rotation.z = -0.012 + Math.sin(t * 0.52 + 0.4) * 0.009 * motion
      plant.current.rotation.x = Math.sin(t * 0.43 + 0.9) * 0.004 * motion
    }
    if (bloomMotion.current) {
      bloomMotion.current.rotation.z = Math.sin(t * 0.63 + 1.1) * 0.007 * motion
      bloomMotion.current.rotation.x = Math.sin(t * 0.48 + 0.3) * 0.0045 * motion
    }
  })

  return (
    <group ref={plant} rotation-z={-0.012} scale={1.08}>
      <FlowerStemAndLeaves />
      <group position={[0.03, 0.73, 0]} rotation={[0.03, Math.PI - 0.06, 0.035]}>
        <group ref={bloomMotion}>
          <FlowerCalyx />
          <CartoonRadialBloom
            petalCount={5}
            petalLength={0.22}
            petalWidth={0.132}
            petalThickness={0.037}
            petalCurl={0.052}
            bloomDepth={0.04}
            palette={FLOWER_PALETTE}
            centerStyle="clustered"
            seed={2798}
          />
        </group>
      </group>
    </group>
  )
}
