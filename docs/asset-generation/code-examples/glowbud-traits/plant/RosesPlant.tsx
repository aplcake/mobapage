import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const INK = '#241722'
const ROSE_DEEP = '#8f174f'
const ROSE_MID = '#d52a78'
const ROSE_LIGHT = '#f15b9d'
const ROSE_BLUSH = '#ff9fc2'
const ROSE_GLOW = '#ffd0df'
const STEM_DEEP = '#294d2e'
const STEM_MID = '#477a3c'
const STEM_LIGHT = '#73a64e'
const LEAF_DEEP = '#255036'
const LEAF_MID = '#447b42'
const LEAF_LIGHT = '#70a955'
const SOIL_DEEP = '#2d1d19'
const SOIL_MID = '#56362a'
const SOIL_LIGHT = '#7b5239'

let roseRamp: THREE.DataTexture | null = null
let foliageRamp: THREE.DataTexture | null = null

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

function getRoseRamp() {
  if (!roseRamp) {
    roseRamp = createToonRamp([
      91, 18, 61, 255,
      210, 40, 116, 255,
      255, 151, 190, 255,
    ])
  }
  return roseRamp
}

function getFoliageRamp() {
  if (!foliageRamp) {
    foliageRamp = createToonRamp([
      34, 72, 39, 255,
      70, 123, 62, 255,
      126, 174, 78, 255,
    ])
  }
  return foliageRamp
}

function roseToon(color: string, vertexColors = false) {
  return (
    <meshToonMaterial
      color={color}
      gradientMap={getRoseRamp()}
      vertexColors={vertexColors}
    />
  )
}

function foliageToon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getFoliageRamp()} />
}

function RoseOutlinedMesh({
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

type RosePetalSpec = {
  id: string
  angle: number
  rootRadius: number
  baseHeight: number
  length: number
  width: number
  thickness: number
  cupHeight: number
  tipCurl: number
  tone: 'deep' | 'mid' | 'light'
}

type RoseWhorl = Omit<RosePetalSpec, 'id' | 'angle'> & {
  name: string
  count: number
  offset: number
  spiralStep?: number
}

function makeRoseWhorl(config: RoseWhorl): RosePetalSpec[] {
  const {
    name,
    count,
    offset,
    spiralStep = 0,
    ...petal
  } = config
  return Array.from({ length: config.count }, (_, index) => ({
    ...petal,
    id: `${name}-${index}`,
    angle:
      offset
      + (index / count) * Math.PI * 2
      + index * spiralStep
      + (index % 2 === 0 ? -0.025 : 0.025),
    baseHeight: petal.baseHeight + (index % 2 === 0 ? -0.004 : 0.004),
    cupHeight: petal.cupHeight * (index % 3 === 0 ? 1.04 : index % 3 === 1 ? 0.97 : 1),
    length: petal.length * (index % 3 === 0 ? 1.06 : index % 3 === 1 ? 0.96 : 1),
    width: petal.width * (index % 2 === 0 ? 1.04 : 0.96),
  }))
}

const ROSE_PETALS: RosePetalSpec[] = [
  ...makeRoseWhorl({
    name: 'outer',
    count: 6,
    offset: 0.08,
    spiralStep: 0.02,
    rootRadius: 0.024,
    baseHeight: 0.008,
    length: 0.122,
    width: 0.082,
    thickness: 0.021,
    cupHeight: 0.038,
    tipCurl: 0.012,
    tone: 'light',
  }),
  ...makeRoseWhorl({
    name: 'middle',
    count: 6,
    offset: 0.43,
    spiralStep: 0.065,
    rootRadius: 0.016,
    baseHeight: 0.021,
    length: 0.09,
    width: 0.061,
    thickness: 0.023,
    cupHeight: 0.072,
    tipCurl: 0.022,
    tone: 'mid',
  }),
  ...makeRoseWhorl({
    name: 'inner',
    count: 5,
    offset: 0.18,
    spiralStep: 0.13,
    rootRadius: 0.009,
    baseHeight: 0.037,
    length: 0.066,
    width: 0.047,
    thickness: 0.022,
    cupHeight: 0.102,
    tipCurl: 0.03,
    tone: 'mid',
  }),
  ...makeRoseWhorl({
    name: 'core',
    count: 5,
    offset: 0.58,
    spiralStep: 0.22,
    rootRadius: 0.004,
    baseHeight: 0.05,
    length: 0.047,
    width: 0.039,
    thickness: 0.021,
    cupHeight: 0.128,
    tipCurl: 0.036,
    tone: 'light',
  }),
]

export function createRosePetalGeometry(spec: RosePetalSpec) {
  const lengthSegments = 12
  const widthSegments = 5
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deep = new THREE.Color(ROSE_DEEP)
  const mid = new THREE.Color(ROSE_MID)
  const light = new THREE.Color(ROSE_LIGHT)
  const blush = new THREE.Color(ROSE_BLUSH)
  const glow = new THREE.Color(ROSE_GLOW)
  const base = spec.tone === 'deep' ? deep : spec.tone === 'mid' ? mid : light

  const centerline = (t: number) => {
    // Rose petals open as broad cupped sheets. Their roots stay buried near
    // the core while the rounded lips remain wide enough to overlap.
    const shoulder = THREE.MathUtils.smoothstep(t, 0.04, 0.52)
    const tipEase = THREE.MathUtils.smoothstep(t, 0.62, 1)
    const reach = spec.rootRadius * (1 - t * 0.55)
      + spec.length * (0.9 * Math.sin(t * Math.PI * 0.5) + 0.1 * shoulder)
      - spec.tipCurl * tipEase * 0.42
    const y = spec.baseHeight
      + spec.cupHeight * (
        0.18 * t
        + 0.9 * Math.sin(t * Math.PI * 0.5)
      )
      - spec.tipCurl * tipEase * 0.22
    return new THREE.Vector3(
      Math.cos(spec.angle) * reach,
      y,
      Math.sin(spec.angle) * reach,
    )
  }

  const centers: THREE.Vector3[] = []
  const tangents: THREE.Vector3[] = []
  const side = new THREE.Vector3(-Math.sin(spec.angle), 0, Math.cos(spec.angle))
  for (let step = 0; step <= lengthSegments; step += 1) {
    const t = step / lengthSegments
    const center = centerline(t)
    const before = centerline(Math.max(0, t - 0.01))
    const after = centerline(Math.min(1, t + 0.01))
    centers.push(center)
    tangents.push(after.sub(before).normalize())
  }

  const verticesPerLayer = (lengthSegments + 1) * (widthSegments + 1)
  const vertexIndex = (layer: number, step: number, across: number) =>
    layer * verticesPerLayer + step * (widthSegments + 1) + across

  // Build broad front/back surfaces around the curved centerline. A subtle
  // crosswise cup and ruffled lip replace the old tubular petal profile.
  for (let layer = 0; layer < 2; layer += 1) {
    const layerSign = layer === 0 ? 1 : -1
    for (let step = 0; step <= lengthSegments; step += 1) {
      const t = step / lengthSegments
      const tipEase = THREE.MathUtils.smoothstep(t, 0.68, 1)
      const body = THREE.MathUtils.smoothstep(t, 0.02, 0.42)
      const rootEase = THREE.MathUtils.smoothstep(t, 0, 0.2)
      const tipScale = THREE.MathUtils.lerp(1, 0.76, tipEase)
      const halfWidth = spec.width
        * (0.16 + body * 0.84)
        * THREE.MathUtils.lerp(0.72, 1, rootEase)
        * tipScale
      const halfThickness = spec.thickness
        * (0.48 + body * 0.52)
        * THREE.MathUtils.lerp(1, 0.58, tipEase)
      const tangent = tangents[step]
      const normal = new THREE.Vector3().crossVectors(tangent, side).normalize()

      for (let across = 0; across <= widthSegments; across += 1) {
        const u = (across / widthSegments) * 2 - 1
        const edge = Math.abs(u)
        const crossCup = spec.thickness * 0.7 * (1 - u * u) * (0.35 + body * 0.65)
        const lipRuffle = Math.sin((u + 1) * Math.PI * 1.5 + spec.angle * 2)
          * spec.thickness
          * tipEase
          * 0.26
        const point = centers[step]
          .clone()
          .addScaledVector(side, u * halfWidth)
          .addScaledVector(normal, crossCup + lipRuffle + layerSign * halfThickness * 0.5)
        positions.push(point.x, point.y, point.z)

        const color = base.clone()
          .lerp(deep, edge * 0.15 + (1 - rootEase) * 0.12)
          .lerp(blush, (1 - edge) * 0.14)
          .lerp(glow, tipEase * (1 - edge) * 0.12)
        colors.push(color.r, color.g, color.b)
      }
    }
  }

  for (let step = 0; step < lengthSegments; step += 1) {
    for (let across = 0; across < widthSegments; across += 1) {
      const a = vertexIndex(0, step, across)
      const b = vertexIndex(0, step, across + 1)
      const c = vertexIndex(0, step + 1, across + 1)
      const d = vertexIndex(0, step + 1, across)
      indices.push(a, b, d, b, c, d)

      const ba = vertexIndex(1, step, across)
      const bb = vertexIndex(1, step, across + 1)
      const bc = vertexIndex(1, step + 1, across + 1)
      const bd = vertexIndex(1, step + 1, across)
      indices.push(ba, bd, bb, bb, bd, bc)
    }
  }

  // Close both long rims and the buried root/tip so every petal remains a
  // finished volume from side and rear angles.
  for (let step = 0; step <= lengthSegments; step += 1) {
    if (step < lengthSegments) {
      for (const across of [0, widthSegments]) {
        const topA = vertexIndex(0, step, across)
        const topB = vertexIndex(0, step + 1, across)
        const bottomA = vertexIndex(1, step, across)
        const bottomB = vertexIndex(1, step + 1, across)
        if (across === 0) {
          indices.push(topA, bottomA, topB, topB, bottomA, bottomB)
        } else {
          indices.push(topA, topB, bottomA, topB, bottomB, bottomA)
        }
      }
    }
  }

  for (const step of [0, lengthSegments]) {
    for (let across = 0; across < widthSegments; across += 1) {
      const topA = vertexIndex(0, step, across)
      const topB = vertexIndex(0, step, across + 1)
      const bottomA = vertexIndex(1, step, across)
      const bottomB = vertexIndex(1, step, across + 1)
      if (step === 0) {
        indices.push(topA, topB, bottomA, topB, bottomB, bottomA)
      } else {
        indices.push(topA, bottomA, topB, topB, bottomA, bottomB)
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createRoseBudGeometry() {
  // A closed tapered bud gives the whorls a shared rose-shaped silhouette and
  // keeps the inner bloom sealed when the camera rises above the flower.
  const rings = [
    { y: 0.005, radius: 0.04 },
    { y: 0.032, radius: 0.067 },
    { y: 0.06, radius: 0.076 },
    { y: 0.09, radius: 0.058 },
    { y: 0.118, radius: 0.032 },
    { y: 0.138, radius: 0.006 },
  ]
  const segments = 10
  const positions: number[] = []
  const indices: number[] = []

  for (const ring of rings) {
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      positions.push(
        Math.cos(angle) * ring.radius,
        ring.y,
        Math.sin(angle) * ring.radius,
      )
    }
  }

  const bottomCenter = positions.length / 3
  positions.push(0, rings[0].y, 0)
  const topCenter = positions.length / 3
  positions.push(0, rings[rings.length - 1].y, 0)

  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments
      const a = ring * segments + segment
      const b = ring * segments + next
      const c = (ring + 1) * segments + next
      const d = (ring + 1) * segments + segment
      indices.push(a, b, d, b, c, d)
    }
  }

  const topStart = (rings.length - 1) * segments
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments
    indices.push(bottomCenter, next, segment)
    indices.push(topCenter, topStart + segment, topStart + next)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

type RoseBloomSpec = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  phase: number
}

export const ROSE_BLOOMS: RoseBloomSpec[] = [
  {
    id: 'hero-left',
    position: [-0.22, 0.76, 0.02],
    rotation: [-1.24, -0.16, -0.3],
    scale: 1.22,
    phase: 0,
  },
  {
    id: 'high-right',
    position: [0.2, 0.91, 0.028],
    rotation: [-1.12, 0.2, 0.24],
    scale: 0.98,
    phase: 1.4,
  },
  {
    id: 'low-left',
    position: [-0.3, 0.48, 0.012],
    rotation: [-1.2, -0.3, -0.22],
    scale: 0.88,
    phase: 2.8,
  },
  {
    id: 'low-right',
    position: [0.3, 0.61, -0.018],
    rotation: [-1.16, 0.28, 0.26],
    scale: 0.96,
    phase: 4.2,
  },
]

function RoseBloom({ spec, activity }: { spec: RoseBloomSpec; activity: number }) {
  const bloom = useRef<THREE.Group>(null)
  const petalGeometry = useMemo(
    () => ROSE_PETALS.map((petal) => createRosePetalGeometry(petal)),
    [],
  )
  const budGeometry = useMemo(() => createRoseBudGeometry(), [])

  useFrame(({ clock }) => {
    if (!bloom.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    bloom.current.rotation.z = spec.rotation[2] + Math.sin(t * 0.52 + spec.phase) * 0.008 * motion
    bloom.current.rotation.x = spec.rotation[0] + Math.sin(t * 0.43 + spec.phase) * 0.004 * motion
  })

  return (
    <group
      ref={bloom}
      position={spec.position}
      rotation={spec.rotation}
      scale={spec.scale}
    >
      <RoseOutlinedMesh
        outlineWidth={0.0032}
        outlineColor={ROSE_DEEP}
        geometry={<primitive object={budGeometry} attach="geometry" />}
        material={roseToon(ROSE_MID)}
      />
      {ROSE_PETALS.map((petal, index) => (
        <RoseOutlinedMesh
          key={petal.id}
          geometry={<primitive object={petalGeometry[index]} attach="geometry" />}
          material={roseToon(
            petal.tone === 'deep'
              ? ROSE_DEEP
              : petal.tone === 'mid'
                ? ROSE_MID
                : ROSE_LIGHT,
            true,
          )}
          outlineWidth={petal.tone === 'light' ? 0.0042 : 0.0035}
          outlineColor={ROSE_DEEP}
        />
      ))}
    </group>
  )
}

function makeCurve(points: Array<[number, number, number]>) {
  return new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)))
}

function RoseCanes() {
  const curves = useMemo(() => [
    makeCurve([[0, -0.12, 0], [0.005, 0.18, 0.005], [-0.018, 0.46, 0.01], [-0.03, 0.64, 0.015]]),
    makeCurve([[-0.025, 0.6, 0.012], [-0.1, 0.67, 0.005], [-0.2, 0.745, 0.018]]),
    makeCurve([[0.005, 0.58, 0.015], [0.075, 0.76, 0.025], [0.18, 0.885, 0.026]]),
    makeCurve([[-0.012, 0.31, 0], [-0.14, 0.4, 0.01], [-0.285, 0.465, 0.012]]),
    makeCurve([[0.012, 0.3, -0.005], [0.14, 0.46, -0.012], [0.285, 0.59, -0.016]]),
  ], [])
  const radii = [0.028, 0.018, 0.017, 0.016, 0.016]

  return (
    <group>
      {curves.map((curve, index) => (
        <OutlineMesh
          key={`rose-cane-${index}`}
          outlineWidth={index === 0 ? 0.004 : 0.003}
          outlineColor={STEM_DEEP}
          geometry={<tubeGeometry args={[curve, 18, radii[index], 8, false]} />}
          material={foliageToon(index === 0 ? STEM_LIGHT : STEM_MID)}
        />
      ))}
    </group>
  )
}

function createRoseLeafGeometry() {
  const segments = 10
  const rings = 6
  const positions: number[] = []
  const indices: number[] = []

  for (let step = 0; step <= segments; step += 1) {
    const t = step / segments
    const body = Math.pow(Math.sin(Math.PI * t), 0.62)
    const tip = THREE.MathUtils.smoothstep(t, 0.78, 1)
    const halfWidth = (0.24 + body * 0.76) * THREE.MathUtils.lerp(1, 0.2, tip)
    const halfThickness = (0.08 + body * 0.16) * THREE.MathUtils.lerp(1, 0.35, tip)
    const bend = Math.sin(Math.PI * t) * 0.1

    for (let ring = 0; ring < rings; ring += 1) {
      const phi = (ring / rings) * Math.PI * 2
      positions.push(
        Math.cos(phi) * halfWidth + bend,
        t,
        Math.sin(phi) * halfThickness,
      )
    }
  }

  for (let step = 0; step < segments; step += 1) {
    for (let ring = 0; ring < rings; ring += 1) {
      const next = (ring + 1) % rings
      const a = step * rings + ring
      const b = step * rings + next
      const c = (step + 1) * rings + next
      const d = (step + 1) * rings + ring
      indices.push(a, b, d, b, c, d)
    }
  }

  const bottomCenter = positions.length / 3
  positions.push(0, 0, 0)
  const topCenter = positions.length / 3
  positions.push(0.1, 1, 0)
  for (let ring = 0; ring < rings; ring += 1) {
    const next = (ring + 1) % rings
    indices.push(bottomCenter, next, ring)
    const topStart = segments * rings
    indices.push(topCenter, topStart + ring, topStart + next)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

type LeafClusterSpec = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  mirror?: boolean
}

const LEAF_CLUSTERS: LeafClusterSpec[] = [
  { id: 'left-low', position: [-0.035, 0.22, -0.012], rotation: [0.15, -0.28, 0.08], scale: 0.95 },
  { id: 'right-mid', position: [0.045, 0.35, 0.02], rotation: [-0.08, 0.42, -0.08], scale: 0.9, mirror: true },
  { id: 'left-high', position: [-0.04, 0.55, 0.015], rotation: [0.08, -0.25, 0.05], scale: 0.82 },
  { id: 'rear', position: [0.015, 0.47, 0.07], rotation: [-0.25, 2.6, 0.02], scale: 0.72, mirror: true },
]

function RoseLeafCluster({ spec }: { spec: LeafClusterSpec }) {
  const side = spec.mirror ? -1 : 1
  const leafGeometry = useMemo(() => createRoseLeafGeometry(), [])
  return (
    <group position={spec.position} rotation={spec.rotation} scale={spec.scale}>
      <RoseOutlinedMesh
        position={[side * 0.072, 0.008, 0]}
        rotation={[0.08, -0.12, -side * 1.1]}
        scale={[0.045, 0.13, 0.026]}
        outlineWidth={0.0024}
        outlineColor={LEAF_DEEP}
        geometry={<primitive object={leafGeometry} attach="geometry" />}
        material={foliageToon(LEAF_MID)}
      />
      <RoseOutlinedMesh
        position={[side * 0.12, 0.07, 0.002]}
        rotation={[0.12, -0.08, -side * 0.72]}
        scale={[0.038, 0.115, 0.022]}
        outlineWidth={0.0022}
        outlineColor={LEAF_DEEP}
        geometry={<primitive object={leafGeometry} attach="geometry" />}
        material={foliageToon(LEAF_LIGHT)}
      />
      <RoseOutlinedMesh
        position={[side * 0.12, -0.055, -0.004]}
        rotation={[-0.08, 0.12, -side * 1.42]}
        scale={[0.036, 0.105, 0.021]}
        outlineWidth={0.0022}
        outlineColor={LEAF_DEEP}
        geometry={<primitive object={leafGeometry} attach="geometry" />}
        material={foliageToon(LEAF_MID)}
      />
    </group>
  )
}

function RoseCalyx({ spec }: { spec: RoseBloomSpec }) {
  return (
    <group
      position={spec.position}
      rotation={spec.rotation}
      scale={spec.scale}
    >
      <group position={[0, -0.055, 0]}>
        <RoseOutlinedMesh
          scale={[0.056, 0.034, 0.056]}
          outlineWidth={0.003}
          outlineColor={STEM_DEEP}
          geometry={<sphereGeometry args={[1, 10, 6]} />}
          material={foliageToon(STEM_MID)}
        />
        {[0, 1, 2, 3, 4].map((index) => {
          const angle = (index / 5) * Math.PI * 2
          return (
            <RoseOutlinedMesh
              key={`calyx-${spec.id}-${index}`}
              position={[Math.cos(angle) * 0.037, -0.067, Math.sin(angle) * 0.037]}
              rotation={[Math.cos(angle) * 0.48, 0, -Math.sin(angle) * 0.48]}
              scale={[0.022, 0.052, 0.022]}
              outlineWidth={0.0018}
              outlineColor={STEM_DEEP}
              geometry={<coneGeometry args={[1, 1, 6]} />}
              material={foliageToon(index % 2 === 0 ? STEM_LIGHT : STEM_MID)}
            />
          )
        })}
      </group>
    </group>
  )
}

function SoilAnchor() {
  return (
    <group>
      <mesh position={[0, -0.065, 0]} scale={[0.23, 0.04, 0.16]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={SOIL_DEEP} />
      </mesh>
      <mesh position={[-0.09, -0.03, -0.012]} scale={[0.11, 0.019, 0.07]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={SOIL_MID} />
      </mesh>
      <mesh position={[0.1, -0.029, 0.008]} scale={[0.105, 0.018, 0.066]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={SOIL_LIGHT} />
      </mesh>
    </group>
  )
}

export function RosesPlant({ activity = 1 }: { activity?: number }) {
  const plant = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!plant.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const sway = Math.sin(t * 0.46 + 0.5) * 0.007 * motion
    const breathe = Math.sin(t * 0.68 + 0.2) * 0.0016 * motion
    plant.current.rotation.z = -0.006 + sway
    plant.current.rotation.x = Math.sin(t * 0.39 + 0.8) * 0.0028 * motion
    plant.current.scale.set(
      1.2 * (1 + breathe),
      1.16 * (1 - breathe * 0.12),
      1.2 * (1 + breathe),
    )
  })

  return (
    <group ref={plant} scale={[1.2, 1.16, 1.2]}>
      <SoilAnchor />
      <RoseCanes />
      {LEAF_CLUSTERS.map((spec) => (
        <RoseLeafCluster key={spec.id} spec={spec} />
      ))}
      {ROSE_BLOOMS.map((spec) => (
        <RoseCalyx key={`calyx-${spec.id}`} spec={spec} />
      ))}
      {ROSE_BLOOMS.map((spec) => (
        <RoseBloom key={spec.id} spec={spec} activity={activity} />
      ))}
    </group>
  )
}
