import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const INK = '#201821'
const BARK_DEEP = '#4d2528'
const BARK_SHADOW = '#713336'
const BARK_MID = '#954948'
const BARK_WARM = '#bc6b5d'
const BARK_LIGHT = '#dc947a'
const BLOSSOM_DEEP = '#a62f65'
const BLOSSOM_SHADOW = '#cc4f88'
const BLOSSOM_MID = '#ea72b5'
const BLOSSOM_LIGHT = '#f6a3d6'
const BLOSSOM_PALE = '#ffd0e9'
const BLOSSOM_IVORY = '#fff1f7'
const BUD_DEEP = '#8d2858'
const STAMEN_GOLD = '#f5bc3b'
const LEAF_DEEP = '#39472f'
const LEAF_MID = '#59643b'
const LEAF_LIGHT = '#7c8048'
const SOIL_DEEP = '#2b1817'
const SOIL_MID = '#523027'
const SOIL_LIGHT = '#7c5340'

let blossomRamp: THREE.DataTexture | null = null
let sakuraBarkRamp: THREE.DataTexture | null = null

function getBlossomRamp() {
  if (blossomRamp) return blossomRamp
  const colors = new Uint8Array([
    118, 105, 116, 255,
    194, 181, 190, 255,
    255, 248, 252, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  blossomRamp = texture
  return texture
}

function getSakuraBarkRamp() {
  if (sakuraBarkRamp) return sakuraBarkRamp
  const colors = new Uint8Array([
    104, 83, 82, 255,
    188, 162, 150, 255,
    255, 240, 218, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  sakuraBarkRamp = texture
  return texture
}

function SakuraOutlinedMesh({
  geometry,
  material,
  position = [0, 0, 0],
  rotation,
  scale = [1, 1, 1],
  outlineWidth = 0.008,
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

type SakuraBranchPath = {
  id: string
  points: Array<[number, number, number]>
  radii: number[]
}

const BRANCH_PATHS: SakuraBranchPath[] = [
  {
    id: 'main-trunk',
    points: [
      [0, -0.13, 0],
      [-0.075, 0.08, 0.02],
      [-0.06, 0.3, -0.005],
      [0.025, 0.5, 0.016],
      [0.015, 0.69, -0.005],
      [0.14, 0.86, 0.01],
      [0.1, 1.05, 0],
    ],
    radii: [0.126, 0.116, 0.102, 0.088, 0.069, 0.045, 0.019],
  },
  {
    id: 'left-low',
    points: [
      [-0.035, 0.33, 0.002],
      [-0.27, 0.42, -0.008],
      [-0.48, 0.56, -0.012],
      [-0.61, 0.7, -0.006],
    ],
    radii: [0.072, 0.056, 0.037, 0.015],
  },
  {
    id: 'left-high',
    points: [
      [0.012, 0.52, 0.008],
      [-0.2, 0.66, -0.004],
      [-0.41, 0.84, -0.01],
    ],
    radii: [0.061, 0.043, 0.016],
  },
  {
    id: 'right-low',
    points: [
      [-0.005, 0.42, 0.012],
      [0.25, 0.49, 0.022],
      [0.48, 0.62, 0.014],
      [0.66, 0.77, 0.004],
    ],
    radii: [0.066, 0.05, 0.034, 0.014],
  },
  {
    id: 'right-high',
    points: [
      [0.02, 0.68, -0.002],
      [0.29, 0.76, 0.012],
      [0.53, 0.92, 0.008],
    ],
    radii: [0.052, 0.034, 0.014],
  },
  {
    id: 'crown-left',
    points: [
      [0.12, 0.84, 0],
      [-0.03, 0.98, -0.005],
      [-0.19, 1.14, -0.004],
    ],
    radii: [0.043, 0.029, 0.013],
  },
  {
    id: 'rear-branch',
    points: [
      [0.01, 0.57, 0.026],
      [0.1, 0.73, 0.16],
      [0.23, 0.88, 0.23],
    ],
    radii: [0.045, 0.029, 0.013],
  },
]

const ROOT_PATHS: SakuraBranchPath[] = [
  {
    id: 'front-left-root',
    points: [[-0.025, 0.03, -0.025], [-0.14, -0.018, -0.12], [-0.31, -0.045, -0.17]],
    radii: [0.078, 0.052, 0.014],
  },
  {
    id: 'front-right-root',
    points: [[0.02, 0.022, -0.02], [0.14, -0.016, -0.105], [0.29, -0.046, -0.15]],
    radii: [0.07, 0.048, 0.013],
  },
  {
    id: 'rear-left-root',
    points: [[-0.02, 0.02, 0.03], [-0.13, -0.02, 0.1], [-0.27, -0.05, 0.14]],
    radii: [0.065, 0.042, 0.012],
  },
  {
    id: 'rear-right-root',
    points: [[0.02, 0.018, 0.03], [0.15, -0.02, 0.09], [0.28, -0.05, 0.13]],
    radii: [0.062, 0.04, 0.012],
  },
]

function createSakuraBranchGeometry(path: SakuraBranchPath, radialSegments = 9) {
  const points = path.points.map(([x, y, z]) => new THREE.Vector3(x, y, z))
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deep = new THREE.Color(BARK_DEEP)
  const shadow = new THREE.Color(BARK_SHADOW)
  const mid = new THREE.Color(BARK_MID)
  const warm = new THREE.Color(BARK_WARM)
  const light = new THREE.Color(BARK_LIGHT)
  let previousSide = new THREE.Vector3(1, 0, 0)

  points.forEach((point, pointIndex) => {
    const previous = points[Math.max(0, pointIndex - 1)]
    const next = points[Math.min(points.length - 1, pointIndex + 1)]
    const tangent = next.clone().sub(previous).normalize()
    const preferred = Math.abs(tangent.y) > 0.88
      ? new THREE.Vector3(0, 0, 1)
      : new THREE.Vector3(0, 1, 0)
    const side = preferred.clone().cross(tangent).normalize()
    if (side.dot(previousSide) < 0) side.multiplyScalar(-1)
    previousSide = side.clone()
    const up = tangent.clone().cross(side).normalize()
    const radius = path.radii[pointIndex]
    const progress = pointIndex / Math.max(1, points.length - 1)

    for (let ringIndex = 0; ringIndex < radialSegments; ringIndex += 1) {
      const angle = (ringIndex / radialSegments) * Math.PI * 2
      const rib = 1 + Math.sin(angle * 3 + progress * 4.4) * 0.045
      const radial = side.clone().multiplyScalar(Math.cos(angle))
        .add(up.clone().multiplyScalar(Math.sin(angle)))
      const vertex = point.clone().add(radial.multiplyScalar(radius * rib))
      positions.push(vertex.x, vertex.y, vertex.z)

      const color = mid.clone()
      const band = Math.cos(angle + 0.55)
      if (band < -0.2) color.lerp(deep, 0.45)
      if (band > 0.34) color.lerp(warm, 0.4)
      if (band > 0.8) color.lerp(light, 0.3)
      if ((ringIndex + pointIndex) % 5 === 0) color.lerp(shadow, 0.22)
      colors.push(color.r, color.g, color.b)
    }
  })

  for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
    for (let ringIndex = 0; ringIndex < radialSegments; ringIndex += 1) {
      const nextRing = (ringIndex + 1) % radialSegments
      const a = pointIndex * radialSegments + ringIndex
      const b = pointIndex * radialSegments + nextRing
      const c = (pointIndex + 1) * radialSegments + nextRing
      const d = (pointIndex + 1) * radialSegments + ringIndex
      indices.push(a, b, d, b, c, d)
    }
  }

  const baseIndex = positions.length / 3
  positions.push(points[0].x, points[0].y, points[0].z)
  colors.push(deep.r, deep.g, deep.b)
  const tipIndex = positions.length / 3
  const tip = points[points.length - 1]
  positions.push(tip.x, tip.y, tip.z)
  colors.push(shadow.r, shadow.g, shadow.b)
  for (let ringIndex = 0; ringIndex < radialSegments; ringIndex += 1) {
    const nextRing = (ringIndex + 1) % radialSegments
    indices.push(baseIndex, nextRing, ringIndex)
    const finalStart = (points.length - 1) * radialSegments
    indices.push(tipIndex, finalStart + ringIndex, finalStart + nextRing)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function createBlossomCloudGeometry(seed: number) {
  const latitudeSegments = 9
  const longitudeSegments = 18
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deep = new THREE.Color(BLOSSOM_DEEP)
  const shadow = new THREE.Color(BLOSSOM_SHADOW)
  const mid = new THREE.Color(BLOSSOM_MID)
  const light = new THREE.Color(BLOSSOM_LIGHT)
  const pale = new THREE.Color(BLOSSOM_PALE)

  for (let latitude = 0; latitude <= latitudeSegments; latitude += 1) {
    const v = latitude / latitudeSegments
    const theta = v * Math.PI
    const sinTheta = Math.sin(theta)
    const cosTheta = Math.cos(theta)
    for (let longitude = 0; longitude <= longitudeSegments; longitude += 1) {
      const u = longitude / longitudeSegments
      const phi = u * Math.PI * 2
      const lobe =
        1
        + Math.sin(phi * 4 + seed * 1.7) * 0.09 * sinTheta
        + Math.cos(phi * 7 - seed) * 0.05 * sinTheta * sinTheta
        + Math.sin(theta * 5 + seed * 0.8) * 0.045
      const x = sinTheta * Math.cos(phi) * lobe
      const y = cosTheta * lobe
      const z = sinTheta * Math.sin(phi) * lobe
      positions.push(x, y, z)

      const color = mid.clone()
      if (z > 0.12) color.lerp(deep, 0.26)
      if (z < -0.18) color.lerp(light, 0.25)
      if (y > 0.32) color.lerp(pale, 0.32)
      if (x < -0.48) color.lerp(shadow, 0.22)
      if (Math.sin(phi * 3 + seed) > 0.65) color.lerp(light, 0.18)
      colors.push(color.r, color.g, color.b)
    }
  }

  const row = longitudeSegments + 1
  for (let latitude = 0; latitude < latitudeSegments; latitude += 1) {
    for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
      const a = latitude * row + longitude
      const b = a + 1
      const c = a + row + 1
      const d = a + row
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

type BlossomCloudSpec = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  seed: number
  phase: number
}

const BLOSSOM_CLOUDS: BlossomCloudSpec[] = [
  { id: 'left-low', position: [-0.43, 0.69, -0.035], rotation: [0.01, -0.1, -0.035], scale: [0.38, 0.175, 0.27], seed: 1.2, phase: 0.3 },
  { id: 'left-high', position: [-0.4, 1.01, 0], rotation: [0.02, 0.14, 0.02], scale: [0.44, 0.235, 0.3], seed: 2.7, phase: 1.2 },
  { id: 'crown', position: [-0.06, 1.2, 0.01], rotation: [-0.01, -0.08, -0.02], scale: [0.38, 0.22, 0.29], seed: 4.1, phase: 2.1 },
  { id: 'center', position: [0.12, 0.94, -0.01], rotation: [0.02, 0.12, 0.015], scale: [0.39, 0.205, 0.285], seed: 5.4, phase: 3.3 },
  { id: 'right-high', position: [0.5, 1.03, 0], rotation: [-0.01, -0.18, 0.025], scale: [0.4, 0.22, 0.29], seed: 6.8, phase: 4.2 },
  { id: 'right-low', position: [0.47, 0.7, -0.025], rotation: [0.02, 0.14, -0.035], scale: [0.36, 0.175, 0.26], seed: 8.2, phase: 5.4 },
  { id: 'rear-fill', position: [0.08, 0.94, 0.2], rotation: [-0.08, 0.05, 0], scale: [0.38, 0.19, 0.22], seed: 9.5, phase: 6.1 },
]

function SakuraBlossomCloud({
  spec,
  activity,
}: {
  spec: BlossomCloudSpec
  activity: number
}) {
  const cloud = useRef<THREE.Group>(null)
  const geometry = useMemo(() => createBlossomCloudGeometry(spec.seed), [spec.seed])

  useFrame(({ clock }) => {
    if (!cloud.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const breeze = Math.sin(t * 0.58 + spec.phase) * 0.005 * motion
    const breathe = Math.sin(t * 0.76 + spec.phase * 0.72) * 0.0027 * motion
    cloud.current.rotation.set(
      spec.rotation[0] + breeze * 0.25,
      spec.rotation[1],
      spec.rotation[2] + breeze,
    )
    cloud.current.scale.set(1 + breathe, 1 - breathe * 0.3, 1 + breathe)
  })

  return (
    <group ref={cloud} position={spec.position} rotation={spec.rotation}>
      <OutlineMesh
        scale={spec.scale}
        outlineWidth={0.011}
        outlineColor={INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<meshToonMaterial vertexColors gradientMap={getBlossomRamp()} />}
      />
    </group>
  )
}

type FlowerSpec = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  tone: 'light' | 'pale' | 'mid'
}

const FLOWERS: FlowerSpec[] = [
  { id: 'front-left-high', position: [-0.48, 1.08, -0.255], rotation: [0.04, 0.02, -0.28], scale: 0.92, tone: 'light' },
  { id: 'front-left-mid', position: [-0.29, 0.96, -0.27], rotation: [0.03, -0.04, 0.2], scale: 0.78, tone: 'pale' },
  { id: 'front-left-low', position: [-0.45, 0.77, -0.225], rotation: [0.04, 0.03, -0.08], scale: 0.76, tone: 'mid' },
  { id: 'front-crown', position: [-0.08, 1.3, -0.205], rotation: [0.02, -0.04, 0.15], scale: 0.88, tone: 'pale' },
  { id: 'front-center', position: [0.08, 1.02, -0.285], rotation: [0.03, 0.04, -0.2], scale: 0.82, tone: 'light' },
  { id: 'front-center-low', position: [0.21, 0.86, -0.245], rotation: [0.02, 0.03, 0.25], scale: 0.72, tone: 'mid' },
  { id: 'front-right-high', position: [0.49, 1.14, -0.235], rotation: [0.04, -0.04, 0.18], scale: 0.9, tone: 'pale' },
  { id: 'front-right-mid', position: [0.62, 0.98, -0.19], rotation: [0.04, 0.06, -0.25], scale: 0.76, tone: 'light' },
  { id: 'front-right-low', position: [0.5, 0.75, -0.21], rotation: [0.03, -0.03, 0.12], scale: 0.72, tone: 'mid' },
  { id: 'top-left', position: [-0.35, 1.17, -0.02], rotation: [-Math.PI / 2, 0.08, -0.1], scale: 0.76, tone: 'pale' },
  { id: 'top-center', position: [0.12, 1.36, 0.01], rotation: [-Math.PI / 2, -0.06, 0.18], scale: 0.72, tone: 'light' },
  { id: 'top-right', position: [0.47, 1.16, 0.02], rotation: [-Math.PI / 2, 0.04, -0.15], scale: 0.74, tone: 'pale' },
  { id: 'rear-left', position: [-0.39, 1.01, 0.31], rotation: [0, Math.PI, 0.22], scale: 0.82, tone: 'mid' },
  { id: 'rear-center', position: [0.08, 1.05, 0.31], rotation: [0, Math.PI, -0.16], scale: 0.86, tone: 'light' },
  { id: 'rear-right', position: [0.48, 0.98, 0.29], rotation: [0, Math.PI, 0.18], scale: 0.84, tone: 'pale' },
  { id: 'left-edge', position: [-0.72, 0.96, -0.02], rotation: [0, Math.PI / 2, -0.12], scale: 0.72, tone: 'light' },
  { id: 'right-edge', position: [0.78, 0.96, 0], rotation: [0, -Math.PI / 2, 0.14], scale: 0.72, tone: 'mid' },
]

function SakuraFlower({ spec }: { spec: FlowerSpec }) {
  const petalColor =
    spec.tone === 'pale'
      ? BLOSSOM_IVORY
      : spec.tone === 'light'
        ? BLOSSOM_PALE
        : BLOSSOM_LIGHT

  return (
    <group position={spec.position} rotation={spec.rotation} scale={spec.scale}>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = (index / 5) * Math.PI * 2
        return (
          <SakuraOutlinedMesh
            key={`${spec.id}-petal-${index}`}
            position={[Math.cos(angle) * 0.048, Math.sin(angle) * 0.048, 0]}
            rotation={[0, 0, angle - Math.PI / 2]}
            scale={[0.034, 0.054, 0.019]}
            outlineWidth={0.0016}
            outlineColor={BLOSSOM_DEEP}
            geometry={<capsuleGeometry args={[1, 0.45, 3, 7]} />}
            material={<meshToonMaterial color={petalColor} gradientMap={getBlossomRamp()} />}
          />
        )
      })}
      <SakuraOutlinedMesh
        position={[0, 0, -0.012]}
        scale={[0.025, 0.025, 0.018]}
        outlineWidth={0.0015}
        outlineColor={BUD_DEEP}
        geometry={<sphereGeometry args={[1, 7, 5]} />}
        material={<meshToonMaterial color={STAMEN_GOLD} gradientMap={getBlossomRamp()} />}
      />
    </group>
  )
}

const BUDS: Array<{
  position: [number, number, number]
  scale: number
  color: string
}> = [
  { position: [-0.72, 0.74, -0.08], scale: 0.033, color: BLOSSOM_DEEP },
  { position: [-0.63, 1.14, -0.12], scale: 0.029, color: BLOSSOM_SHADOW },
  { position: [-0.26, 1.34, -0.1], scale: 0.032, color: BLOSSOM_MID },
  { position: [0.29, 1.28, -0.13], scale: 0.028, color: BLOSSOM_SHADOW },
  { position: [0.72, 1.1, -0.08], scale: 0.033, color: BLOSSOM_MID },
  { position: [0.76, 0.77, -0.06], scale: 0.03, color: BLOSSOM_DEEP },
  { position: [-0.55, 0.81, 0.2], scale: 0.027, color: BLOSSOM_SHADOW },
  { position: [0.42, 0.82, 0.23], scale: 0.03, color: BLOSSOM_MID },
]

const LEAVES: Array<{
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
}> = [
  { position: [-0.3, 0.69, -0.18], rotation: [0.1, -0.1, -0.76], scale: [0.035, 0.085, 0.026], color: LEAF_MID },
  { position: [-0.08, 0.8, -0.22], rotation: [0.08, 0.08, 0.58], scale: [0.033, 0.08, 0.024], color: LEAF_LIGHT },
  { position: [0.27, 0.73, -0.19], rotation: [0.1, -0.08, -0.62], scale: [0.035, 0.086, 0.025], color: LEAF_DEEP },
  { position: [0.54, 0.68, -0.12], rotation: [0.06, 0.12, 0.72], scale: [0.032, 0.078, 0.024], color: LEAF_MID },
  { position: [-0.4, 0.87, 0.17], rotation: [-0.1, 0.08, -0.7], scale: [0.032, 0.078, 0.024], color: LEAF_DEEP },
  { position: [0.31, 0.89, 0.2], rotation: [-0.1, -0.08, 0.68], scale: [0.034, 0.082, 0.025], color: LEAF_MID },
]

function SakuraTrunk() {
  const branches = useMemo(
    () => BRANCH_PATHS.map((path) => ({ id: path.id, geometry: createSakuraBranchGeometry(path) })),
    [],
  )
  const roots = useMemo(
    () => ROOT_PATHS.map((path) => ({ id: path.id, geometry: createSakuraBranchGeometry(path, 8) })),
    [],
  )
  const barkHighlight = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.075, 0, -0.096),
      new THREE.Vector3(-0.105, 0.18, -0.09),
      new THREE.Vector3(-0.07, 0.35, -0.088),
      new THREE.Vector3(0.005, 0.51, -0.074),
    ]),
    [],
  )
  const barkGroove = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.038, 0.02, -0.1),
      new THREE.Vector3(0.01, 0.2, -0.104),
      new THREE.Vector3(-0.015, 0.37, -0.09),
      new THREE.Vector3(0.05, 0.52, -0.07),
    ]),
    [],
  )

  return (
    <group>
      {roots.map(({ id, geometry }) => (
        <OutlineMesh
          key={id}
          outlineWidth={0.008}
          outlineColor={INK}
          geometry={<primitive object={geometry} attach="geometry" />}
          material={<meshToonMaterial vertexColors gradientMap={getSakuraBarkRamp()} />}
        />
      ))}
      {branches.map(({ id, geometry }, index) => (
        <OutlineMesh
          key={id}
          outlineWidth={index === 0 ? 0.014 : 0.008}
          outlineColor={INK}
          geometry={<primitive object={geometry} attach="geometry" />}
          material={<meshToonMaterial vertexColors gradientMap={getSakuraBarkRamp()} />}
        />
      ))}
      <mesh>
        <tubeGeometry args={[barkHighlight, 18, 0.007, 5, false]} />
        <meshToonMaterial color={BARK_LIGHT} gradientMap={getSakuraBarkRamp()} />
      </mesh>
      <mesh>
        <tubeGeometry args={[barkGroove, 18, 0.0045, 5, false]} />
        <meshBasicMaterial color={BARK_DEEP} />
      </mesh>
      <SakuraOutlinedMesh
        position={[-0.042, 0.28, -0.004]}
        rotation={[0.06, 0.1, -0.2]}
        scale={[0.13, 0.105, 0.1]}
        outlineWidth={0.0025}
        outlineColor={BARK_DEEP}
        geometry={<sphereGeometry args={[1, 8, 5]} />}
        material={<meshToonMaterial color={BARK_MID} gradientMap={getSakuraBarkRamp()} />}
      />
      <SakuraOutlinedMesh
        position={[0.015, 0.51, 0.005]}
        rotation={[-0.04, -0.1, 0.26]}
        scale={[0.105, 0.083, 0.08]}
        outlineWidth={0.0025}
        outlineColor={BARK_DEEP}
        geometry={<sphereGeometry args={[1, 8, 5]} />}
        material={<meshToonMaterial color={BARK_WARM} gradientMap={getSakuraBarkRamp()} />}
      />
    </group>
  )
}

function SakuraDetails() {
  return (
    <group>
      {FLOWERS.map((spec) => <SakuraFlower key={spec.id} spec={spec} />)}
      {BUDS.map((bud, index) => (
        <SakuraOutlinedMesh
          key={`sakura-bud-${index}`}
          position={bud.position}
          rotation={[index * 0.18, index * 0.31, index * 0.23]}
          scale={[bud.scale, bud.scale * 1.12, bud.scale]}
          outlineWidth={0.0015}
          outlineColor={BUD_DEEP}
          geometry={<dodecahedronGeometry args={[1, 0]} />}
          material={<meshToonMaterial color={bud.color} gradientMap={getBlossomRamp()} />}
        />
      ))}
      {LEAVES.map((leaf, index) => (
        <SakuraOutlinedMesh
          key={`sakura-leaf-${index}`}
          position={leaf.position}
          rotation={leaf.rotation}
          scale={leaf.scale}
          outlineWidth={0.0018}
          outlineColor={LEAF_DEEP}
          geometry={<capsuleGeometry args={[1, 0.65, 4, 7]} />}
          material={<meshToonMaterial color={leaf.color} gradientMap={getBlossomRamp()} />}
        />
      ))}
    </group>
  )
}

function SakuraSoilAnchor() {
  return (
    <group>
      <mesh position={[0, -0.045, 0]} scale={[0.34, 0.055, 0.24]}>
        <sphereGeometry args={[1, 12, 6]} />
        <meshBasicMaterial color={SOIL_DEEP} />
      </mesh>
      <mesh position={[-0.14, -0.01, -0.08]} rotation-z={-0.13} scale={[0.15, 0.027, 0.09]}>
        <sphereGeometry args={[1, 9, 5]} />
        <meshBasicMaterial color={SOIL_MID} />
      </mesh>
      <mesh position={[0.14, -0.012, -0.055]} rotation-z={0.15} scale={[0.14, 0.025, 0.08]}>
        <sphereGeometry args={[1, 9, 5]} />
        <meshBasicMaterial color={SOIL_LIGHT} />
      </mesh>
      <mesh position={[0.02, -0.006, 0.12]} scale={[0.17, 0.024, 0.075]}>
        <sphereGeometry args={[1, 9, 5]} />
        <meshBasicMaterial color={SOIL_MID} />
      </mesh>
    </group>
  )
}

export function SakuraBonsaiPlant({ activity = 1 }: { activity?: number }) {
  const plant = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!plant.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const sway = Math.sin(t * 0.5 + 0.4) * 0.0065 * motion
    plant.current.rotation.z = 0.018 + sway
    plant.current.rotation.x = Math.sin(t * 0.38 + 0.2) * 0.0028 * motion
    plant.current.rotation.y = Math.sin(t * 0.31 + 0.8) * 0.0032 * motion
  })

  return (
    <group ref={plant} rotation={[0, -0.06, 0.018]} scale={[1, 1, 1]}>
      <SakuraSoilAnchor />
      <SakuraTrunk />
      {BLOSSOM_CLOUDS.map((spec) => (
        <SakuraBlossomCloud key={spec.id} spec={spec} activity={activity} />
      ))}
      <SakuraDetails />
    </group>
  )
}
