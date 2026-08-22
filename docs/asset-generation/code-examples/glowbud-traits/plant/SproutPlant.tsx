import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const INK = '#211a25'
const STEM_DEEP = '#285130'
const STEM_MID = '#4f8a3a'
const STEM_LIGHT = '#86b94f'
const COTYLEDON_DEEP = '#397044'
const COTYLEDON_MID = '#65a94c'
const COTYLEDON_LIGHT = '#9bd15d'
const TRUE_LEAF_DEEP = '#2e663c'
const TRUE_LEAF_MID = '#4f9848'
const TRUE_LEAF_LIGHT = '#80c757'
const VEIN = '#b1df72'
const HUSK_DEEP = '#63452f'
const HUSK_MID = '#9b7149'
const HUSK_LIGHT = '#cca06a'
const SOIL_DEEP = '#2d1d19'
const SOIL_MID = '#543428'
const SOIL_LIGHT = '#7a533a'

let foliageRamp: THREE.DataTexture | null = null
let huskRamp: THREE.DataTexture | null = null

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
      34, 72, 40, 255,
      77, 145, 65, 255,
      160, 207, 89, 255,
    ])
  }
  return foliageRamp
}

function getHuskRamp() {
  if (!huskRamp) {
    huskRamp = createToonRamp([
      70, 47, 34, 255,
      143, 96, 59, 255,
      213, 166, 103, 255,
    ])
  }
  return huskRamp
}

function foliageToon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getFoliageRamp()} />
}

function huskToon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getHuskRamp()} />
}

function SproutOutlinedMesh({
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

type SproutLeafTone = 'cotyledon' | 'true'

type SproutLeafSpec = {
  id: string
  root: [number, number, number]
  angle: number
  length: number
  width: number
  rise: number
  arch: number
  curl: number
  thickness: number
  tone: SproutLeafTone
  phase: number
}

const SPROUT_LEAVES: SproutLeafSpec[] = [
  {
    id: 'cotyledon-left',
    root: [-0.025, 0.37, 0],
    angle: Math.PI,
    length: 0.36,
    width: 0.16,
    rise: 0.035,
    arch: 0.065,
    curl: -0.035,
    thickness: 0.042,
    tone: 'cotyledon',
    phase: 0,
  },
  {
    id: 'cotyledon-right',
    root: [0.028, 0.38, 0.006],
    angle: 0.03,
    length: 0.34,
    width: 0.155,
    rise: 0.055,
    arch: 0.06,
    curl: 0.03,
    thickness: 0.041,
    tone: 'cotyledon',
    phase: 1,
  },
  {
    id: 'true-leaf-front-left',
    root: [-0.018, 0.57, -0.004],
    angle: -2.28,
    length: 0.25,
    width: 0.125,
    rise: 0.1,
    arch: 0.072,
    curl: 0.042,
    thickness: 0.036,
    tone: 'true',
    phase: 2,
  },
  {
    id: 'true-leaf-back-right',
    root: [0.016, 0.585, 0.005],
    angle: 0.78,
    length: 0.235,
    width: 0.118,
    rise: 0.115,
    arch: 0.068,
    curl: -0.038,
    thickness: 0.035,
    tone: 'true',
    phase: 3,
  },
]

function createSproutLeafGeometry(spec: SproutLeafSpec) {
  const lengthSegments = 20
  const ringSegments = 10
  const centers: THREE.Vector3[] = []
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const root = new THREE.Vector3(...spec.root)
  const forward = new THREE.Vector3(Math.cos(spec.angle), 0, Math.sin(spec.angle))
  const sideDirection = new THREE.Vector3(-forward.z, 0, forward.x)
  const deep = new THREE.Color(spec.tone === 'cotyledon' ? COTYLEDON_DEEP : TRUE_LEAF_DEEP)
  const mid = new THREE.Color(spec.tone === 'cotyledon' ? COTYLEDON_MID : TRUE_LEAF_MID)
  const light = new THREE.Color(spec.tone === 'cotyledon' ? COTYLEDON_LIGHT : TRUE_LEAF_LIGHT)
  const vein = new THREE.Color(VEIN)

  for (let index = 0; index <= lengthSegments; index += 1) {
    const t = index / lengthSegments
    const radial = spec.length * t
    const lateral = Math.sin(t * Math.PI) * spec.curl
    centers.push(
      root
        .clone()
        .addScaledVector(forward, radial)
        .addScaledVector(sideDirection, lateral)
        .add(new THREE.Vector3(
          0,
          spec.rise * t + spec.arch * Math.sin(t * Math.PI) - 0.025 * t * t,
          0,
        )),
    )
  }

  for (let index = 0; index <= lengthSegments; index += 1) {
    const t = index / lengthSegments
    const previous = centers[Math.max(0, index - 1)]
    const next = centers[Math.min(lengthSegments, index + 1)]
    const tangent = next.clone().sub(previous).normalize()
    const side = new THREE.Vector3(-Math.sin(spec.angle), 0, Math.cos(spec.angle))
    const normal = tangent.clone().cross(side).normalize()
    const rootOpen = THREE.MathUtils.smoothstep(t, 0, 0.1)
    const roundedTip = 1 - THREE.MathUtils.smoothstep(t, 0.78, 1)
    const heartNotch = spec.tone === 'true'
      ? 0.9 + Math.sin(t * Math.PI) * 0.1
      : 1
    const halfWidth = spec.width
      * Math.pow(Math.sin(t * Math.PI), 0.62)
      * rootOpen
      * roundedTip
      * heartNotch
    const thickness = spec.thickness
      * (0.46 + Math.sin(t * Math.PI) * 0.54)
      * rootOpen
      * roundedTip

    for (let ringIndex = 0; ringIndex < ringSegments; ringIndex += 1) {
      const angle = (ringIndex / ringSegments) * Math.PI * 2
      const sideAmount = Math.cos(angle) * halfWidth
      const normalAmount = Math.sin(angle) * thickness
      const fold = Math.pow(Math.abs(sideAmount) / Math.max(halfWidth, 0.001), 1.7)
      const point = centers[index]
        .clone()
        .addScaledVector(side, sideAmount)
        .addScaledVector(normal, normalAmount - fold * thickness * 0.16)
      positions.push(point.x, point.y, point.z)

      const color = mid.clone()
      if (normalAmount < 0) color.lerp(deep, 0.68)
      if (normalAmount > 0) color.lerp(light, 0.42)
      if (Math.abs(sideAmount) < halfWidth * 0.16 && normalAmount > 0) color.lerp(vein, 0.54)
      if (Math.abs(sideAmount) > halfWidth * 0.75) color.lerp(deep, 0.24)
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let index = 0; index < lengthSegments; index += 1) {
    for (let ringIndex = 0; ringIndex < ringSegments; ringIndex += 1) {
      const nextRing = (ringIndex + 1) % ringSegments
      const a = index * ringSegments + ringIndex
      const b = index * ringSegments + nextRing
      const c = (index + 1) * ringSegments + nextRing
      const d = (index + 1) * ringSegments + ringIndex
      indices.push(a, b, d, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function SproutLeaf({ spec }: { spec: SproutLeafSpec }) {
  const leaf = useRef<THREE.Group>(null)
  const geometry = useMemo(() => createSproutLeafGeometry(spec), [spec])

  useFrame(({ clock }) => {
    if (!leaf.current) return
    const t = clock.elapsedTime
    const flutter = Math.sin(t * 0.72 + spec.phase * 1.3) * 0.004
    leaf.current.rotation.z = flutter
    leaf.current.rotation.x = Math.sin(t * 0.61 + spec.phase) * 0.0025
  })

  return (
    <group ref={leaf}>
      <OutlineMesh
        outlineWidth={0.004}
        outlineColor={spec.tone === 'cotyledon' ? COTYLEDON_DEEP : TRUE_LEAF_DEEP}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<meshToonMaterial vertexColors gradientMap={getFoliageRamp()} />}
      />
    </group>
  )
}

function makeStemCurve() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.13, 0),
    new THREE.Vector3(-0.035, 0.12, 0.006),
    new THREE.Vector3(0.025, 0.36, -0.008),
    new THREE.Vector3(-0.012, 0.59, 0),
    new THREE.Vector3(0.008, 0.7, 0.004),
  ])
}

function makeBranchCurves() {
  return SPROUT_LEAVES.map((spec) => {
    const root = new THREE.Vector3(...spec.root)
    const stemPoint = new THREE.Vector3(spec.root[0] * 0.22, spec.root[1] - 0.045, spec.root[2] * 0.22)
    const shoulder = root.clone().lerp(stemPoint, 0.4).add(new THREE.Vector3(0, 0.035, 0))
    return new THREE.CatmullRomCurve3([stemPoint, shoulder, root])
  })
}

function SproutStemSystem() {
  const stemCurve = useMemo(() => makeStemCurve(), [])
  const branchCurves = useMemo(() => makeBranchCurves(), [])

  return (
    <group>
      <OutlineMesh
        outlineWidth={0.0045}
        outlineColor={STEM_DEEP}
        geometry={<tubeGeometry args={[stemCurve, 22, 0.034, 8, false]} />}
        material={foliageToon(STEM_MID)}
      />
      {branchCurves.map((curve, index) => (
        <group key={`sprout-branch-${SPROUT_LEAVES[index].id}`}>
          <OutlineMesh
            outlineWidth={0.003}
            outlineColor={STEM_DEEP}
            geometry={<tubeGeometry args={[curve, 10, index < 2 ? 0.024 : 0.019, 7, false]} />}
            material={foliageToon(index % 2 === 0 ? STEM_MID : STEM_LIGHT)}
          />
          <SproutOutlinedMesh
            position={SPROUT_LEAVES[index].root}
            scale={index < 2 ? [0.034, 0.026, 0.032] : [0.027, 0.022, 0.026]}
            outlineWidth={0.002}
            outlineColor={STEM_DEEP}
            geometry={<sphereGeometry args={[1, 8, 5]} />}
            material={foliageToon(index % 2 === 0 ? STEM_LIGHT : STEM_MID)}
          />
        </group>
      ))}
    </group>
  )
}

function EmergingLeafBud() {
  return (
    <group position={[0.004, 0.7, 0.004]} rotation={[0.08, -0.25, 0]}>
      <SproutOutlinedMesh
        position={[-0.025, 0.045, 0]}
        rotation={[0.12, 0.25, 0.38]}
        scale={[0.045, 0.115, 0.034]}
        outlineWidth={0.003}
        outlineColor={TRUE_LEAF_DEEP}
        geometry={<capsuleGeometry args={[1, 0.8, 5, 9]} />}
        material={foliageToon(TRUE_LEAF_MID)}
      />
      <SproutOutlinedMesh
        position={[0.03, 0.052, 0.005]}
        rotation={[-0.08, -0.2, -0.42]}
        scale={[0.043, 0.11, 0.033]}
        outlineWidth={0.003}
        outlineColor={TRUE_LEAF_DEEP}
        geometry={<capsuleGeometry args={[1, 0.8, 5, 9]} />}
        material={foliageToon(TRUE_LEAF_LIGHT)}
      />
      <SproutOutlinedMesh
        position={[0.002, 0.02, 0.008]}
        scale={[0.026, 0.06, 0.024]}
        outlineWidth={0.0025}
        outlineColor={STEM_DEEP}
        geometry={<capsuleGeometry args={[1, 0.45, 4, 8]} />}
        material={foliageToon(STEM_LIGHT)}
      />
    </group>
  )
}

function SplitSeedHusk() {
  return (
    <group position={[0, 0.015, 0.006]}>
      <SproutOutlinedMesh
        position={[-0.075, 0.012, 0]}
        rotation={[0.08, -0.2, -0.3]}
        scale={[0.105, 0.045, 0.07]}
        outlineWidth={0.004}
        outlineColor={HUSK_DEEP}
        geometry={<sphereGeometry args={[1, 10, 6]} />}
        material={huskToon(HUSK_MID)}
      />
      <SproutOutlinedMesh
        position={[0.075, 0.015, 0.005]}
        rotation={[-0.05, 0.18, 0.32]}
        scale={[0.1, 0.043, 0.068]}
        outlineWidth={0.004}
        outlineColor={HUSK_DEEP}
        geometry={<sphereGeometry args={[1, 10, 6]} />}
        material={huskToon(HUSK_LIGHT)}
      />
      <mesh position={[0, -0.012, 0.012]} scale={[0.085, 0.022, 0.055]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={HUSK_DEEP} />
      </mesh>
    </group>
  )
}

function SoilAnchor() {
  return (
    <group>
      <mesh position={[0, -0.055, 0]} scale={[0.22, 0.035, 0.15]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={SOIL_DEEP} />
      </mesh>
      <mesh position={[-0.09, -0.027, -0.008]} scale={[0.105, 0.018, 0.064]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={SOIL_MID} />
      </mesh>
      <mesh position={[0.095, -0.026, 0.008]} scale={[0.098, 0.017, 0.06]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={SOIL_LIGHT} />
      </mesh>
    </group>
  )
}

export function SproutPlant({ activity = 1 }: { activity?: number }) {
  const plant = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!plant.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const sway = Math.sin(t * 0.5 + 0.35) * 0.008 * motion
    const breathe = Math.sin(t * 0.74 + 0.2) * 0.0022 * motion
    plant.current.rotation.z = -0.006 + sway
    plant.current.rotation.x = Math.sin(t * 0.43 + 0.7) * 0.003 * motion
    plant.current.scale.set(
      1.28 * (1 + breathe),
      1.22 * (1 - breathe * 0.15),
      1.28 * (1 + breathe),
    )
  })

  return (
    <group ref={plant} scale={[1.28, 1.22, 1.28]}>
      <SoilAnchor />
      <SplitSeedHusk />
      <SproutStemSystem />
      {SPROUT_LEAVES.map((spec) => (
        <SproutLeaf key={spec.id} spec={spec} />
      ))}
      <EmergingLeafBud />
    </group>
  )
}
