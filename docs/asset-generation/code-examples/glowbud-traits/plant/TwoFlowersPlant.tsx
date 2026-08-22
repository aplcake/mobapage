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
const STEM_DEEP = '#24432d'
const STEM_MID = '#3e7040'
const STEM_LIGHT = '#76a85b'

const RED_BLOOM: CartoonRadialBloomPalette = {
  petalDeep: '#9d2030',
  petalMid: '#df424d',
  petalLight: '#ff9b94',
  centerDeep: '#542b2a',
  centerMid: '#8b482f',
  centerLight: '#eaa66c',
  outline: INK,
}

const PURPLE_BLOOM: CartoonRadialBloomPalette = {
  petalDeep: '#4b1d7a',
  petalMid: '#823bb8',
  petalLight: '#ca80ec',
  centerDeep: '#30204b',
  centerMid: '#59317a',
  centerLight: '#b782d1',
  outline: INK,
}

let foliageRamp: THREE.DataTexture | null = null

function getFoliageRamp() {
  if (!foliageRamp) {
    foliageRamp = new THREE.DataTexture(
      new Uint8Array([
        36, 67, 45, 255,
        63, 112, 64, 255,
        118, 168, 91, 255,
      ]),
      3,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    )
    foliageRamp.magFilter = THREE.NearestFilter
    foliageRamp.minFilter = THREE.NearestFilter
    foliageRamp.colorSpace = THREE.SRGBColorSpace
    foliageRamp.needsUpdate = true
  }
  return foliageRamp
}

function foliageMaterial(color: string, vertexColors = false) {
  return <meshToonMaterial color={color} vertexColors={vertexColors} gradientMap={getFoliageRamp()} />
}

function OutlinedPlantMesh({
  geometry,
  material,
  position = [0, 0, 0],
  rotation,
  scale = [1, 1, 1],
  outlineWidth = 0.004,
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

function TuckedCalyx({ scale = 1 }: { scale?: number }) {
  const sepals = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => ({
        angle: (index / 5) * Math.PI * 2 + 0.18,
        geometry: createCartoonRadialPetalGeometry({
          length: 0.105 + (index % 2) * 0.01,
          width: 0.034,
          thickness: 0.02,
          curl: -0.018,
          depth: 0.012,
          deep: STEM_DEEP,
          mid: STEM_MID,
          light: STEM_LIGHT,
          variation: index * 0.24,
        }),
      })),
    [],
  )

  return (
    <group position={[0, 0, -0.057]} scale={scale}>
      <OutlinedPlantMesh
        position={[0, 0, -0.02]}
        scale={[0.096, 0.096, 0.055]}
        outlineWidth={0.0035}
        outlineColor={STEM_DEEP}
        geometry={<sphereGeometry args={[1, 12, 7]} />}
        material={foliageMaterial(STEM_MID)}
      />
      {sepals.map((sepal, index) => (
        <OutlinedPlantMesh
          key={`two-flowers-sepal-${index}`}
          position={[Math.cos(sepal.angle) * 0.01, Math.sin(sepal.angle) * 0.01, -0.02]}
          rotation={[0, 0, sepal.angle - Math.PI / 2]}
          outlineWidth={0.0028}
          outlineColor={STEM_DEEP}
          geometry={<primitive object={sepal.geometry} attach="geometry" />}
          material={foliageMaterial(STEM_MID, true)}
        />
      ))}
    </group>
  )
}

function TwoFlowerStems() {
  const redStem = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.045, -0.17, 0.03),
        new THREE.Vector3(0.09, 0.13, 0.015),
        new THREE.Vector3(0.18, 0.47, 0.01),
        new THREE.Vector3(0.145, 0.82, -0.01),
      ]),
    [],
  )
  const purpleStem = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.055, -0.17, 0.025),
        new THREE.Vector3(-0.09, 0.08, 0.02),
        new THREE.Vector3(-0.165, 0.3, 0.008),
        new THREE.Vector3(-0.15, 0.54, -0.012),
      ]),
    [],
  )
  const broadLeaf = useMemo(
    () =>
      createCartoonRadialPetalGeometry({
        length: 0.18,
        width: 0.072,
        thickness: 0.032,
        curl: 0.036,
        depth: 0.021,
        deep: STEM_DEEP,
        mid: STEM_MID,
        light: STEM_LIGHT,
        variation: 0.28,
      }),
    [],
  )
  const smallLeaf = useMemo(
    () =>
      createCartoonRadialPetalGeometry({
        length: 0.14,
        width: 0.058,
        thickness: 0.028,
        curl: 0.03,
        depth: 0.018,
        deep: STEM_DEEP,
        mid: STEM_MID,
        light: STEM_LIGHT,
        variation: -0.35,
      }),
    [],
  )

  return (
    <group>
      <OutlineMesh
        outlineWidth={0.0044}
        outlineColor={STEM_DEEP}
        geometry={<tubeGeometry args={[redStem, 28, 0.029, 8, false]} />}
        material={foliageMaterial(STEM_MID)}
      />
      <OutlineMesh
        outlineWidth={0.0042}
        outlineColor={STEM_DEEP}
        geometry={<tubeGeometry args={[purpleStem, 24, 0.027, 8, false]} />}
        material={foliageMaterial(STEM_LIGHT)}
      />
      <OutlinedPlantMesh
        position={[0.065, 0.16, 0.015]}
        rotation={[0.12, 0.18, -1.22]}
        outlineWidth={0.0038}
        outlineColor={STEM_DEEP}
        geometry={<primitive object={broadLeaf} attach="geometry" />}
        material={foliageMaterial(STEM_MID, true)}
      />
      <OutlinedPlantMesh
        position={[-0.07, 0.1, 0.01]}
        rotation={[-0.12, -0.18, 1.15]}
        outlineWidth={0.0038}
        outlineColor={STEM_DEEP}
        geometry={<primitive object={broadLeaf} attach="geometry" />}
        material={foliageMaterial(STEM_MID, true)}
      />
      <OutlinedPlantMesh
        position={[0.13, 0.41, 0.005]}
        rotation={[0.08, 0.14, -1.02]}
        outlineWidth={0.0034}
        outlineColor={STEM_DEEP}
        geometry={<primitive object={smallLeaf} attach="geometry" />}
        material={foliageMaterial(STEM_LIGHT, true)}
      />
      <OutlinedPlantMesh
        position={[-0.135, 0.31, 0.008]}
        rotation={[-0.08, -0.16, 0.96]}
        outlineWidth={0.0034}
        outlineColor={STEM_DEEP}
        geometry={<primitive object={smallLeaf} attach="geometry" />}
        material={foliageMaterial(STEM_LIGHT, true)}
      />
    </group>
  )
}

export function TwoFlowersPlant({ activity = 1 }: { activity?: number }) {
  const plant = useRef<THREE.Group>(null)
  const redBloom = useRef<THREE.Group>(null)
  const purpleBloom = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    if (plant.current) {
      plant.current.rotation.z = -0.018 + Math.sin(t * 0.47 + 0.5) * 0.008 * motion
      plant.current.rotation.x = Math.sin(t * 0.39 + 0.8) * 0.004 * motion
    }
    if (redBloom.current) {
      redBloom.current.rotation.z = -0.055 + Math.sin(t * 0.56 + 0.8) * 0.012 * motion
      redBloom.current.rotation.x = 0.035 + Math.sin(t * 0.41) * 0.006 * motion
    }
    if (purpleBloom.current) {
      purpleBloom.current.rotation.z = 0.08 + Math.sin(t * 0.68 + 1.9) * 0.011 * motion
      purpleBloom.current.rotation.x = -0.03 + Math.sin(t * 0.52 + 0.2) * 0.005 * motion
    }
  })

  return (
    <group ref={plant} rotation-z={-0.018} scale={1.03}>
      <TwoFlowerStems />
      <group position={[0.145, 0.82, 0]} rotation={[0.08, Math.PI + 0.1, 0.06]}>
        <group ref={redBloom}>
          <TuckedCalyx scale={1.03} />
          <CartoonRadialBloom
            petalCount={5}
            petalLength={0.224}
            petalWidth={0.13}
            petalThickness={0.038}
            petalCurl={0.068}
            bloomDepth={0.046}
            palette={RED_BLOOM}
            centerStyle="clustered"
            seed={1414}
          />
        </group>
      </group>
      <group position={[-0.15, 0.54, -0.002]} rotation={[-0.08, Math.PI - 0.12, -0.1]} scale={0.86}>
        <group ref={purpleBloom}>
          <TuckedCalyx scale={0.94} />
          <CartoonRadialBloom
            petalCount={6}
            petalLength={0.21}
            petalWidth={0.122}
            petalThickness={0.035}
            petalCurl={0.042}
            bloomDepth={0.036}
            palette={PURPLE_BLOOM}
            centerStyle="clustered"
            seed={367}
          />
        </group>
      </group>
    </group>
  )
}
