import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const INK = '#1c1b20'
const LEAF_DEEP = '#17452f'
const LEAF_SHADOW = '#235b38'
const LEAF_MID = '#3f7b46'
const LEAF_LIGHT = '#6da052'
const LEAF_GLOSS = '#9abd68'
const TWIG_DEEP = '#493027'
const TWIG_MID = '#744735'
const BARK_LIGHT = '#a36846'
const FLOWER_SHADOW = '#d8d0d6'
const FLOWER_IVORY = '#fff6eb'
const FLOWER_LIGHT = '#fffdf4'
const STAMEN_GOLD = '#f4b82f'
const BERRY_DEEP = '#28234f'
const BERRY_MID = '#403b76'
const BERRY_LIGHT = '#7772ad'
const SOIL_DEEP = '#2c1b18'
const SOIL_MID = '#533326'
const SOIL_LIGHT = '#75513a'
const MYRTLE_SPREAD = 1.36
const MYRTLE_HEIGHT = 1.24

let myrtleToonRamp: THREE.DataTexture | null = null
let myrtleFlowerRamp: THREE.DataTexture | null = null

function getMyrtleToonRamp() {
  if (myrtleToonRamp) return myrtleToonRamp

  const colors = new Uint8Array([
    25, 53, 34, 255,
    65, 119, 68, 255,
    146, 181, 91, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  myrtleToonRamp = texture
  return texture
}

function getMyrtleFlowerRamp() {
  if (myrtleFlowerRamp) return myrtleFlowerRamp

  const colors = new Uint8Array([
    191, 180, 190, 255,
    239, 230, 224, 255,
    255, 253, 242, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  myrtleFlowerRamp = texture
  return texture
}

function toon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getMyrtleToonRamp()} />
}

function flowerToon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getMyrtleFlowerRamp()} />
}

function MyrtleOutlinedMesh({
  geometry,
  material,
  position = [0, 0, 0],
  rotation,
  scale = [1, 1, 1],
  outlineWidth = 0.007,
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

function createMyrtleLeafGeometry() {
  const lengthSegments = 12
  const ringSegments = 8
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deep = new THREE.Color(LEAF_DEEP)
  const shadow = new THREE.Color(LEAF_SHADOW)
  const mid = new THREE.Color(LEAF_MID)
  const light = new THREE.Color(LEAF_LIGHT)
  const gloss = new THREE.Color(LEAF_GLOSS)

  for (let index = 0; index <= lengthSegments; index += 1) {
    const t = index / lengthSegments
    const center = new THREE.Vector3(
      Math.sin(t * Math.PI) * 0.07,
      t,
      Math.sin(t * Math.PI) * 0.045,
    )
    const rootOpen = THREE.MathUtils.smoothstep(t, 0, 0.2)
    const tipClose = 1 - THREE.MathUtils.smoothstep(t, 0.68, 1)
    const body = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.7)
    const profile = THREE.MathUtils.lerp(0.24, 1, rootOpen)
      * THREE.MathUtils.lerp(0.07, 1, tipClose)
      * (0.35 + body * 0.7)
    const width = 0.25 * profile
    const thickness = 0.085
      * THREE.MathUtils.lerp(0.72, 1.08, body)
      * THREE.MathUtils.lerp(0.2, 1, tipClose)

    for (let ringIndex = 0; ringIndex < ringSegments; ringIndex += 1) {
      const angle = (ringIndex / ringSegments) * Math.PI * 2
      const sideFactor = Math.cos(angle)
      const depthFactor = Math.sin(angle)
      positions.push(
        center.x + sideFactor * width,
        center.y,
        center.z + depthFactor * thickness,
      )

      const color = mid.clone()
      if (depthFactor < -0.12) color.lerp(shadow, 0.55)
      if (Math.abs(sideFactor) > 0.7) color.lerp(deep, 0.36)
      if (depthFactor > 0.25) color.lerp(light, 0.34)
      if (Math.abs(sideFactor) < 0.2 && depthFactor > 0.1) color.lerp(gloss, 0.38)
      if (t > 0.76) color.lerp(gloss, THREE.MathUtils.smoothstep(t, 0.76, 1) * 0.32)
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
      indices.push(a, d, b, b, d, c)
    }
  }

  const baseCenterIndex = positions.length / 3
  positions.push(0, 0, 0)
  colors.push(deep.r, deep.g, deep.b)
  const tipCenterIndex = positions.length / 3
  positions.push(0, 1, 0)
  colors.push(gloss.r, gloss.g, gloss.b)

  for (let ringIndex = 0; ringIndex < ringSegments; ringIndex += 1) {
    const nextRing = (ringIndex + 1) % ringSegments
    indices.push(baseCenterIndex, ringIndex, nextRing)
    const finalRingStart = lengthSegments * ringSegments
    indices.push(tipCenterIndex, finalRingStart + nextRing, finalRingStart + ringIndex)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

type BranchletSpec = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  length: number
  leafScale: number
  phase: number
}

const BRANCHLETS: BranchletSpec[] = [
  { id: 'front-left', position: [-0.11, 0.72, -0.17], rotation: [0.25, -0.3, -0.48], length: 0.3, leafScale: 1.02, phase: 0 },
  { id: 'front-center', position: [0.02, 0.74, -0.2], rotation: [0.28, 0.08, 0.08], length: 0.31, leafScale: 1.06, phase: 1 },
  { id: 'front-right', position: [0.12, 0.72, -0.16], rotation: [0.22, 0.36, 0.45], length: 0.29, leafScale: 0.98, phase: 2 },
  { id: 'left-side', position: [-0.2, 0.78, -0.02], rotation: [0.08, -0.72, -0.82], length: 0.29, leafScale: 1, phase: 3 },
  { id: 'right-side', position: [0.2, 0.79, 0.01], rotation: [-0.04, 0.76, 0.8], length: 0.28, leafScale: 0.96, phase: 4 },
  { id: 'top-left', position: [-0.09, 0.86, 0.01], rotation: [-0.05, -0.18, -0.28], length: 0.31, leafScale: 0.98, phase: 5 },
  { id: 'top-right', position: [0.08, 0.87, -0.01], rotation: [0.04, 0.2, 0.25], length: 0.32, leafScale: 1.04, phase: 6 },
  { id: 'rear-left', position: [-0.12, 0.76, 0.16], rotation: [-0.24, 0.34, -0.46], length: 0.3, leafScale: 0.94, phase: 7 },
  { id: 'rear-center', position: [0.01, 0.79, 0.2], rotation: [-0.3, -0.08, 0.04], length: 0.31, leafScale: 1, phase: 8 },
  { id: 'rear-right', position: [0.13, 0.75, 0.15], rotation: [-0.22, -0.38, 0.48], length: 0.29, leafScale: 0.96, phase: 9 },
]

const SURFACE_LEAVES: Array<{
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
}> = [
  { id: 'front-low-left', position: [-0.19, 0.78, -0.23], rotation: [0.18, -0.08, -0.9], scale: 0.115 },
  { id: 'front-low-right', position: [0.18, 0.79, -0.23], rotation: [0.16, 0.1, 0.86], scale: 0.11 },
  { id: 'front-mid-left', position: [-0.12, 0.91, -0.25], rotation: [0.1, -0.06, -0.5], scale: 0.12 },
  { id: 'front-mid-right', position: [0.11, 0.9, -0.25], rotation: [0.12, 0.08, 0.5], scale: 0.118 },
  { id: 'front-top-left', position: [-0.09, 1.04, -0.19], rotation: [0.06, -0.08, -0.34], scale: 0.112 },
  { id: 'front-top-right', position: [0.09, 1.03, -0.2], rotation: [0.08, 0.08, 0.36], scale: 0.108 },
  { id: 'left-low', position: [-0.29, 0.78, -0.02], rotation: [0.04, -0.42, -1.14], scale: 0.105 },
  { id: 'left-high', position: [-0.27, 0.94, 0.01], rotation: [-0.08, -0.48, -0.85], scale: 0.112 },
  { id: 'right-low', position: [0.29, 0.8, 0.01], rotation: [-0.04, 0.42, 1.12], scale: 0.104 },
  { id: 'right-high', position: [0.27, 0.95, -0.01], rotation: [0.06, 0.48, 0.82], scale: 0.11 },
  { id: 'top-left', position: [-0.14, 1.1, 0.01], rotation: [-0.7, -0.1, -0.42], scale: 0.116 },
  { id: 'top-center', position: [0, 1.13, 0], rotation: [-0.78, 0.14, 0.08], scale: 0.12 },
  { id: 'top-right', position: [0.14, 1.09, -0.02], rotation: [-0.68, 0.16, 0.44], scale: 0.11 },
  { id: 'rear-low-left', position: [-0.16, 0.79, 0.21], rotation: [-0.18, 0.08, -0.72], scale: 0.105 },
  { id: 'rear-low-right', position: [0.16, 0.8, 0.21], rotation: [-0.16, -0.1, 0.7], scale: 0.108 },
  { id: 'rear-mid-left', position: [-0.1, 0.94, 0.23], rotation: [-0.12, 0.06, -0.42], scale: 0.112 },
  { id: 'rear-mid-right', position: [0.1, 0.94, 0.23], rotation: [-0.1, -0.08, 0.4], scale: 0.11 },
]

function MyrtleSurfaceLeaf({
  geometry,
  position,
  rotation,
  scale,
}: {
  geometry: THREE.BufferGeometry
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
}) {
  return (
    <OutlineMesh
      position={position}
      rotation={rotation}
      scale={[scale, scale, scale]}
      outlineWidth={0.0028}
      outlineColor={LEAF_DEEP}
      geometry={<primitive object={geometry} attach="geometry" />}
      material={<meshToonMaterial vertexColors side={THREE.DoubleSide} gradientMap={getMyrtleToonRamp()} />}
    />
  )
}

function MyrtleBranchlet({
  spec,
  geometry,
}: {
  spec: BranchletSpec
  geometry: THREE.BufferGeometry
}) {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.025, 0),
      new THREE.Vector3(0.005, spec.length * 0.34, 0.008),
      new THREE.Vector3(-0.008, spec.length * 0.7, -0.004),
      new THREE.Vector3(0.006, spec.length, 0),
    ]),
    [spec.length],
  )
  const leafPairs = [0.27, 0.5, 0.72, 0.9]

  return (
    <group position={spec.position} rotation={spec.rotation}>
      <OutlineMesh
        outlineWidth={0.003}
        outlineColor={TWIG_DEEP}
        geometry={<tubeGeometry args={[curve, 14, 0.009, 6, false]} />}
        material={toon(TWIG_MID)}
      />
      {leafPairs.flatMap((progress, pairIndex) => {
        const point = curve.getPointAt(progress)
        const taper = 1 - pairIndex * 0.08
        const scale = 0.105 * spec.leafScale * taper
        const stagger = pairIndex % 2 === 0 ? 0.012 : -0.008
        return [
          <OutlineMesh
            key={`${spec.id}-leaf-${pairIndex}-left`}
            position={[point.x - 0.008, point.y + stagger, point.z]}
            rotation={[0.12, -0.14, 0.82]}
            scale={[scale, scale, scale]}
            outlineWidth={0.0035}
            outlineColor={LEAF_DEEP}
            geometry={<primitive object={geometry} attach="geometry" />}
            material={<meshToonMaterial vertexColors side={THREE.DoubleSide} gradientMap={getMyrtleToonRamp()} />}
          />,
          <OutlineMesh
            key={`${spec.id}-leaf-${pairIndex}-right`}
            position={[point.x + 0.008, point.y - stagger * 0.55, point.z]}
            rotation={[-0.1, 0.16, -0.82]}
            scale={[scale * 0.96, scale * 0.96, scale * 0.96]}
            outlineWidth={0.0035}
            outlineColor={LEAF_DEEP}
            geometry={<primitive object={geometry} attach="geometry" />}
            material={<meshToonMaterial vertexColors side={THREE.DoubleSide} gradientMap={getMyrtleToonRamp()} />}
          />,
        ]
      })}
    </group>
  )
}

function MyrtleCanopy({ activity }: { activity: number }) {
  const canopy = useRef<THREE.Group>(null)
  const leafGeometry = useMemo(() => createMyrtleLeafGeometry(), [])
  const masses: Array<{
    position: [number, number, number]
    scale: [number, number, number]
    color: string
  }> = [
    { position: [0, 0.88, 0], scale: [0.29, 0.23, 0.25], color: LEAF_MID },
    { position: [-0.2, 0.84, -0.02], scale: [0.2, 0.18, 0.2], color: LEAF_SHADOW },
    { position: [0.19, 0.85, 0.01], scale: [0.2, 0.18, 0.2], color: LEAF_LIGHT },
    { position: [-0.07, 1.04, 0.03], scale: [0.2, 0.16, 0.19], color: LEAF_LIGHT },
    { position: [0.09, 1.01, -0.04], scale: [0.2, 0.17, 0.19], color: LEAF_MID },
    { position: [0.01, 0.82, 0.17], scale: [0.24, 0.17, 0.17], color: LEAF_DEEP },
  ]

  useFrame(({ clock }) => {
    if (!canopy.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    canopy.current.rotation.z = Math.sin(t * 0.55 + 0.8) * 0.004 * motion
    canopy.current.rotation.x = Math.sin(t * 0.43 + 0.2) * 0.0025 * motion
  })

  return (
    <group ref={canopy}>
      {masses.map((mass, index) => (
        <MyrtleOutlinedMesh
          key={`myrtle-canopy-mass-${index}`}
          position={mass.position}
          rotation={[0.03 * (index % 2 === 0 ? 1 : -1), index * 0.34, 0.04 * (index - 2)]}
          scale={mass.scale}
          outlineWidth={0.004}
          outlineColor={LEAF_DEEP}
          geometry={<sphereGeometry args={[1, 12, 7]} />}
          material={toon(mass.color)}
        />
      ))}
      {SURFACE_LEAVES.map((leaf) => (
        <MyrtleSurfaceLeaf
          key={`myrtle-surface-leaf-${leaf.id}`}
          geometry={leafGeometry}
          position={leaf.position}
          rotation={leaf.rotation}
          scale={leaf.scale}
        />
      ))}
      {BRANCHLETS.map((spec) => (
        <MyrtleBranchlet key={spec.id} spec={spec} geometry={leafGeometry} />
      ))}
    </group>
  )
}

function MyrtleTrunk() {
  const trunkCurve = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.1, 0),
      new THREE.Vector3(-0.012, 0.2, 0.008),
      new THREE.Vector3(0.018, 0.48, -0.006),
      new THREE.Vector3(0, 0.72, 0),
    ]),
    [],
  )
  const leftBranch = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.004, 0.47, 0),
      new THREE.Vector3(-0.08, 0.63, -0.012),
      new THREE.Vector3(-0.18, 0.79, -0.035),
    ]),
    [],
  )
  const rightBranch = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.008, 0.5, 0.004),
      new THREE.Vector3(0.09, 0.66, 0.012),
      new THREE.Vector3(0.18, 0.8, 0.03),
    ]),
    [],
  )
  const barkHighlight = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.034, -0.02, -0.035),
      new THREE.Vector3(-0.032, 0.22, -0.038),
      new THREE.Vector3(-0.012, 0.46, -0.034),
    ]),
    [],
  )

  return (
    <group>
      <OutlineMesh
        outlineWidth={0.011}
        outlineColor={INK}
        geometry={<tubeGeometry args={[trunkCurve, 24, 0.052, 9, false]} />}
        material={toon(TWIG_MID)}
      />
      <OutlineMesh
        outlineWidth={0.006}
        outlineColor={INK}
        geometry={<tubeGeometry args={[leftBranch, 16, 0.03, 8, false]} />}
        material={toon(TWIG_DEEP)}
      />
      <OutlineMesh
        outlineWidth={0.006}
        outlineColor={INK}
        geometry={<tubeGeometry args={[rightBranch, 16, 0.028, 8, false]} />}
        material={toon(TWIG_MID)}
      />
      <OutlineMesh
        outlineWidth={0.002}
        outlineColor={TWIG_DEEP}
        geometry={<tubeGeometry args={[barkHighlight, 15, 0.007, 6, false]} />}
        material={toon(BARK_LIGHT)}
      />
    </group>
  )
}

function MyrtleFlower({
  position,
  rotation,
  scale = 1,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  scale?: number
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = (index / 5) * Math.PI * 2
        return (
          <MyrtleOutlinedMesh
            key={`myrtle-flower-petal-${index}`}
            position={[Math.cos(angle) * 0.052, Math.sin(angle) * 0.052, 0]}
            rotation={[0, 0, angle - Math.PI / 2]}
            scale={[0.045, 0.078, 0.022]}
            outlineWidth={0.003}
            outlineColor={FLOWER_SHADOW}
            geometry={<capsuleGeometry args={[1, 0.55, 4, 8]} />}
            material={flowerToon(index % 2 === 0 ? FLOWER_LIGHT : FLOWER_IVORY)}
          />
        )
      })}
      <MyrtleOutlinedMesh
        position={[0, 0, -0.012]}
        scale={[0.038, 0.038, 0.026]}
        outlineWidth={0.003}
        outlineColor={TWIG_DEEP}
        geometry={<sphereGeometry args={[1, 9, 6]} />}
        material={toon(STAMEN_GOLD)}
      />
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const angle = (index / 6) * Math.PI * 2 + 0.2
        return (
          <mesh
            key={`myrtle-stamen-${index}`}
            position={[Math.cos(angle) * 0.03, Math.sin(angle) * 0.03, -0.04]}
            scale={[0.008, 0.008, 0.018]}
          >
            <sphereGeometry args={[1, 6, 4]} />
            <meshToonMaterial color={STAMEN_GOLD} gradientMap={getMyrtleToonRamp()} />
          </mesh>
        )
      })}
    </group>
  )
}

function MyrtleBerry({
  position,
  scale,
}: {
  position: [number, number, number]
  scale: number
}) {
  return (
    <group position={position}>
      <MyrtleOutlinedMesh
        scale={[scale, scale * 1.04, scale]}
        outlineWidth={0.004}
        outlineColor={INK}
        geometry={<sphereGeometry args={[1, 9, 6]} />}
        material={toon(BERRY_MID)}
      />
      <mesh
        position={[-scale * 0.28, scale * 0.32, -scale * 0.72]}
        scale={[scale * 0.18, scale * 0.24, scale * 0.12]}
      >
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial color={BERRY_LIGHT} />
      </mesh>
    </group>
  )
}

function MyrtleDetails() {
  return (
    <group>
      <MyrtleFlower position={[-0.18, 0.92, -0.245]} rotation={[0, 0, -0.14]} scale={0.6} />
      <MyrtleFlower position={[0.15, 1.01, -0.22]} rotation={[0.04, 0.05, 0.18]} scale={0.54} />
      <MyrtleFlower position={[0.255, 0.86, 0.04]} rotation={[0, -Math.PI / 2, 0.08]} scale={0.5} />
      <MyrtleFlower position={[-0.16, 0.9, 0.22]} rotation={[0, Math.PI, -0.1]} scale={0.48} />
      <MyrtleFlower position={[0.08, 1.03, 0.205]} rotation={[-0.08, Math.PI, 0.16]} scale={0.42} />
      <MyrtleFlower position={[-0.275, 0.83, 0.04]} rotation={[0.04, Math.PI / 2, -0.12]} scale={0.4} />
      <MyrtleBerry position={[-0.04, 0.79, -0.25]} scale={0.035} />
      <MyrtleBerry position={[0.23, 0.92, -0.1]} scale={0.032} />
      <MyrtleBerry position={[-0.24, 0.84, 0.02]} scale={0.03} />
      <MyrtleBerry position={[0.04, 1.09, 0.08]} scale={0.028} />
      <MyrtleOutlinedMesh
        position={[-0.052, 0.798, -0.275]}
        rotation={[0.2, 0, -0.3]}
        scale={[0.009, 0.04, 0.009]}
        outlineWidth={0.0015}
        outlineColor={TWIG_DEEP}
        geometry={<cylinderGeometry args={[1, 1, 1, 6]} />}
        material={toon(BERRY_LIGHT)}
      />
      <MyrtleOutlinedMesh
        position={[0.218, 0.942, -0.116]}
        rotation={[-0.14, 0, 0.28]}
        scale={[0.008, 0.035, 0.008]}
        outlineWidth={0.0015}
        outlineColor={TWIG_DEEP}
        geometry={<cylinderGeometry args={[1, 1, 1, 6]} />}
        material={toon(BERRY_DEEP)}
      />
    </group>
  )
}

function MyrtleSoilAnchor() {
  return (
    <group>
      <mesh position={[0, 0.015, 0]} scale={[0.19, 0.032, 0.13]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={SOIL_DEEP} />
      </mesh>
      <mesh position={[-0.09, 0.04, 0.015]} rotation-z={-0.2} scale={[0.1, 0.019, 0.06]}>
        <sphereGeometry args={[1, 9, 5]} />
        <meshBasicMaterial color={SOIL_MID} />
      </mesh>
      <mesh position={[0.095, 0.038, -0.01]} rotation-z={0.18} scale={[0.095, 0.018, 0.058]}>
        <sphereGeometry args={[1, 9, 5]} />
        <meshBasicMaterial color={SOIL_LIGHT} />
      </mesh>
    </group>
  )
}

export function MyrtlePlant({ activity = 1 }: { activity?: number }) {
  const plant = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!plant.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const sway = Math.sin(t * 0.6 + 0.4) * 0.007 * motion
    const breathe = Math.sin(t * 0.92 + 0.7) * 0.0018 * motion
    plant.current.rotation.z = -0.006 + sway
    plant.current.rotation.x = Math.sin(t * 0.46 + 0.2) * 0.0025 * motion
    plant.current.scale.set(
      MYRTLE_SPREAD * (1 + breathe),
      MYRTLE_HEIGHT * (1 - breathe * 0.18),
      MYRTLE_SPREAD * (1 + breathe),
    )
  })

  return (
    <group ref={plant} scale={[MYRTLE_SPREAD, MYRTLE_HEIGHT, MYRTLE_SPREAD]}>
      <MyrtleSoilAnchor />
      <MyrtleTrunk />
      <group position={[0, -0.08, 0]}>
        <MyrtleCanopy activity={activity} />
        <MyrtleDetails />
      </group>
    </group>
  )
}
