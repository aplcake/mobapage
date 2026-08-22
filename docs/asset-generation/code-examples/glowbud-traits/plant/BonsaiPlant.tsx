import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const INK = '#1b191b'
const BARK_DEEP = '#4b241d'
const BARK_SHADOW = '#6e3024'
const BARK_MID = '#914534'
const BARK_WARM = '#b76443'
const BARK_LIGHT = '#d18757'
const NEEDLE_DEEP = '#173c2d'
const NEEDLE_SHADOW = '#24543a'
const NEEDLE_MID = '#3f7541'
const NEEDLE_LIGHT = '#6c9947'
const NEEDLE_TIP = '#91b75a'
const SOIL_DEEP = '#2b1915'
const SOIL_MID = '#513026'
const SOIL_LIGHT = '#79513a'

let bonsaiRamp: THREE.DataTexture | null = null
let barkRamp: THREE.DataTexture | null = null

function getBonsaiRamp() {
  if (bonsaiRamp) return bonsaiRamp
  const colors = new Uint8Array([
    112, 126, 104, 255,
    184, 198, 166, 255,
    255, 255, 238, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  bonsaiRamp = texture
  return texture
}

function getBarkRamp() {
  if (barkRamp) return barkRamp
  const colors = new Uint8Array([
    105, 85, 78, 255,
    190, 168, 148, 255,
    255, 244, 220, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  barkRamp = texture
  return texture
}

function foliageMaterial() {
  return <meshToonMaterial vertexColors gradientMap={getBonsaiRamp()} />
}

function barkMaterial() {
  return <meshToonMaterial vertexColors gradientMap={getBarkRamp()} />
}

function toon(color: string, kind: 'foliage' | 'bark' = 'foliage') {
  return (
    <meshToonMaterial
      color={color}
      gradientMap={kind === 'bark' ? getBarkRamp() : getBonsaiRamp()}
    />
  )
}

function BonsaiOutlinedMesh({
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

type BranchPath = {
  id: string
  points: Array<[number, number, number]>
  radii: number[]
}

const BRANCH_PATHS: BranchPath[] = [
  {
    id: 'main-trunk',
    points: [
      [0, -0.12, 0],
      [-0.055, 0.08, 0.025],
      [0.025, 0.29, -0.006],
      [-0.09, 0.5, 0.018],
      [-0.035, 0.72, -0.01],
      [0.055, 0.93, 0],
      [0.01, 1.04, 0.01],
    ],
    radii: [0.125, 0.116, 0.101, 0.087, 0.07, 0.045, 0.02],
  },
  {
    id: 'left-low',
    points: [
      [-0.015, 0.27, 0.005],
      [-0.2, 0.38, -0.005],
      [-0.39, 0.49, -0.015],
      [-0.57, 0.66, -0.015],
    ],
    radii: [0.074, 0.06, 0.042, 0.018],
  },
  {
    id: 'right-low',
    points: [
      [0.005, 0.31, 0.012],
      [0.23, 0.37, 0.026],
      [0.47, 0.43, 0.016],
      [0.69, 0.57, 0.005],
    ],
    radii: [0.07, 0.056, 0.039, 0.018],
  },
  {
    id: 'left-high',
    points: [
      [-0.072, 0.52, 0.008],
      [-0.25, 0.63, 0.005],
      [-0.43, 0.79, -0.005],
    ],
    radii: [0.058, 0.043, 0.018],
  },
  {
    id: 'right-high',
    points: [
      [-0.044, 0.67, -0.008],
      [0.14, 0.76, 0.01],
      [0.34, 0.87, 0.012],
    ],
    radii: [0.05, 0.036, 0.016],
  },
  {
    id: 'rear-branch',
    points: [
      [0.005, 0.56, 0.025],
      [0.05, 0.7, 0.17],
      [0.1, 0.82, 0.25],
    ],
    radii: [0.045, 0.03, 0.014],
  },
]

const ROOT_PATHS: BranchPath[] = [
  {
    id: 'front-left-root',
    points: [[-0.02, 0.035, -0.03], [-0.12, -0.018, -0.13], [-0.31, -0.04, -0.18]],
    radii: [0.075, 0.055, 0.015],
  },
  {
    id: 'front-right-root',
    points: [[0.025, 0.025, -0.025], [0.14, -0.012, -0.11], [0.3, -0.045, -0.16]],
    radii: [0.07, 0.05, 0.014],
  },
  {
    id: 'rear-left-root',
    points: [[-0.025, 0.02, 0.035], [-0.15, -0.02, 0.1], [-0.28, -0.05, 0.15]],
    radii: [0.065, 0.042, 0.012],
  },
  {
    id: 'rear-right-root',
    points: [[0.025, 0.018, 0.03], [0.14, -0.02, 0.1], [0.27, -0.05, 0.14]],
    radii: [0.06, 0.04, 0.012],
  },
]

function createTaperedBranchGeometry(path: BranchPath, radialSegments = 9) {
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
      const rib = 1 + Math.sin(angle * 3 + progress * 5.1) * 0.055
      const radial = side.clone().multiplyScalar(Math.cos(angle))
        .add(up.clone().multiplyScalar(Math.sin(angle)))
      const vertex = point.clone().add(radial.multiplyScalar(radius * rib))
      positions.push(vertex.x, vertex.y, vertex.z)

      const color = mid.clone()
      const lightBand = Math.cos(angle + 0.65)
      if (lightBand < -0.2) color.lerp(deep, 0.48)
      if (lightBand > 0.35) color.lerp(warm, 0.42)
      if (lightBand > 0.82) color.lerp(light, 0.28)
      if ((ringIndex + pointIndex * 2) % 5 === 0) color.lerp(shadow, 0.24)
      if (progress > 0.72) color.lerp(shadow, (progress - 0.72) * 0.35)
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

function createFoliagePadGeometry(seed: number) {
  const latitudeSegments = 9
  const longitudeSegments = 18
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deep = new THREE.Color(NEEDLE_DEEP)
  const shadow = new THREE.Color(NEEDLE_SHADOW)
  const mid = new THREE.Color(NEEDLE_MID)
  const light = new THREE.Color(NEEDLE_LIGHT)
  const tip = new THREE.Color(NEEDLE_TIP)

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
        + Math.sin(phi * 3 + seed * 1.31) * 0.07 * sinTheta
        + Math.cos(phi * 5 - seed * 0.83) * 0.045 * sinTheta * sinTheta
        + Math.sin(theta * 4 + seed) * 0.035
      const shoulder = 1 + Math.pow(sinTheta, 4) * 0.08
      const x = sinTheta * Math.cos(phi) * lobe * shoulder
      const y = cosTheta * lobe
      const z = sinTheta * Math.sin(phi) * lobe
      positions.push(x, y, z)

      const color = mid.clone()
      if (z > 0.12) color.lerp(deep, 0.38)
      if (z < -0.15) color.lerp(light, 0.28)
      if (y > 0.35) color.lerp(light, 0.3)
      if (y > 0.68 && Math.sin(phi * 3 + seed) > 0) color.lerp(tip, 0.25)
      if (x < -0.45) color.lerp(shadow, 0.22)
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

function createNeedleTuftGeometry() {
  const geometry = new THREE.IcosahedronGeometry(1, 1)
  const position = geometry.getAttribute('position')
  const colors: number[] = []
  const deep = new THREE.Color(NEEDLE_DEEP)
  const mid = new THREE.Color(NEEDLE_MID)
  const light = new THREE.Color(NEEDLE_LIGHT)

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const color = mid.clone()
    if (z > 0.1) color.lerp(deep, 0.35)
    if (y > 0.35) color.lerp(light, 0.42)
    if (x < -0.3) color.lerp(deep, 0.18)
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

type FoliagePadSpec = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  seed: number
  phase: number
  tufts: Array<{
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
  }>
}

const FOLIAGE_PADS: FoliagePadSpec[] = [
  {
    id: 'left-mid',
    position: [-0.5, 0.79, -0.01],
    rotation: [0.02, -0.16, -0.04],
    scale: [0.41, 0.19, 0.28],
    seed: 1.4,
    phase: 0.3,
    tufts: [
      { position: [-0.23, 0.05, -0.16], rotation: [0.1, 0.15, -0.3], scale: [0.13, 0.065, 0.09] },
      { position: [0.04, 0.12, -0.19], rotation: [0.02, -0.1, 0.15], scale: [0.15, 0.07, 0.09] },
      { position: [0.24, 0.02, -0.14], rotation: [0.08, 0.2, 0.3], scale: [0.11, 0.055, 0.08] },
    ],
  },
  {
    id: 'crown',
    position: [-0.07, 1.06, 0],
    rotation: [-0.02, 0.1, 0.02],
    scale: [0.45, 0.22, 0.31],
    seed: 2.9,
    phase: 1.6,
    tufts: [
      { position: [-0.27, 0.03, -0.17], rotation: [0.06, 0.1, -0.25], scale: [0.12, 0.06, 0.085] },
      { position: [-0.02, 0.16, -0.17], rotation: [0.05, -0.05, 0], scale: [0.16, 0.075, 0.1] },
      { position: [0.27, 0.05, -0.14], rotation: [0.08, -0.2, 0.3], scale: [0.13, 0.06, 0.085] },
    ],
  },
  {
    id: 'right-high',
    position: [0.34, 0.88, 0.015],
    rotation: [0.02, -0.12, -0.015],
    scale: [0.34, 0.17, 0.25],
    seed: 4.2,
    phase: 2.8,
    tufts: [
      { position: [-0.17, 0.08, -0.14], rotation: [0.05, 0.1, -0.2], scale: [0.11, 0.055, 0.08] },
      { position: [0.08, 0.1, -0.15], rotation: [0.08, -0.1, 0.12], scale: [0.13, 0.06, 0.085] },
    ],
  },
  {
    id: 'right-low',
    position: [0.62, 0.64, 0.005],
    rotation: [0.01, 0.14, -0.035],
    scale: [0.38, 0.18, 0.27],
    seed: 5.8,
    phase: 4.1,
    tufts: [
      { position: [-0.21, 0.07, -0.16], rotation: [0.08, 0.2, -0.25], scale: [0.13, 0.06, 0.09] },
      { position: [0.03, 0.12, -0.17], rotation: [0.04, -0.1, 0.08], scale: [0.14, 0.065, 0.09] },
      { position: [0.24, 0.02, -0.12], rotation: [0.08, -0.2, 0.26], scale: [0.1, 0.05, 0.075] },
    ],
  },
  {
    id: 'rear-fill',
    position: [0.07, 0.8, 0.2],
    rotation: [-0.08, 0.08, 0],
    scale: [0.31, 0.145, 0.22],
    seed: 7.1,
    phase: 5.2,
    tufts: [
      { position: [-0.13, 0.07, 0.12], rotation: [0.1, 0, -0.15], scale: [0.1, 0.05, 0.075] },
      { position: [0.12, 0.06, 0.11], rotation: [0.08, 0, 0.18], scale: [0.1, 0.05, 0.075] },
    ],
  },
]

const GROWTH_TIPS: Array<{
  position: [number, number, number]
  scale: [number, number, number]
}> = [
  { position: [-0.78, 0.82, -0.045], scale: [0.045, 0.026, 0.035] },
  { position: [-0.61, 0.92, -0.16], scale: [0.038, 0.024, 0.03] },
  { position: [-0.38, 0.86, -0.255], scale: [0.04, 0.023, 0.028] },
  { position: [-0.33, 1.17, -0.14], scale: [0.04, 0.025, 0.032] },
  { position: [-0.06, 1.27, -0.03], scale: [0.044, 0.026, 0.033] },
  { position: [0.25, 1.12, -0.2], scale: [0.038, 0.022, 0.029] },
  { position: [0.42, 0.97, -0.19], scale: [0.038, 0.023, 0.028] },
  { position: [0.68, 0.73, -0.245], scale: [0.042, 0.024, 0.03] },
  { position: [0.88, 0.66, -0.08], scale: [0.04, 0.022, 0.028] },
  { position: [0.18, 0.84, 0.37], scale: [0.035, 0.021, 0.027] },
]

function BonsaiFoliagePad({
  spec,
  activity,
  tuftGeometry,
}: {
  spec: FoliagePadSpec
  activity: number
  tuftGeometry: THREE.BufferGeometry
}) {
  const group = useRef<THREE.Group>(null)
  const padGeometry = useMemo(() => createFoliagePadGeometry(spec.seed), [spec.seed])

  useFrame(({ clock }) => {
    if (!group.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const breeze = Math.sin(t * 0.53 + spec.phase) * 0.0045 * motion
    const breathe = Math.sin(t * 0.71 + spec.phase * 0.8) * 0.0025 * motion
    group.current.rotation.set(
      spec.rotation[0] + breeze * 0.3,
      spec.rotation[1],
      spec.rotation[2] + breeze,
    )
    group.current.scale.set(1 + breathe, 1 - breathe * 0.35, 1 + breathe)
  })

  return (
    <group ref={group} position={spec.position} rotation={spec.rotation}>
      <OutlineMesh
        scale={spec.scale}
        outlineWidth={0.012}
        outlineColor={INK}
        geometry={<primitive object={padGeometry} attach="geometry" />}
        material={foliageMaterial()}
      />
      {spec.tufts.map((tuft, index) => (
        <mesh
          key={`${spec.id}-tuft-${index}`}
          position={tuft.position}
          rotation={tuft.rotation}
          scale={tuft.scale}
        >
          <primitive object={tuftGeometry} attach="geometry" />
          <meshToonMaterial vertexColors gradientMap={getBonsaiRamp()} />
        </mesh>
      ))}
    </group>
  )
}

function BonsaiTrunk() {
  const branchGeometries = useMemo(
    () => BRANCH_PATHS.map((path) => ({ id: path.id, geometry: createTaperedBranchGeometry(path) })),
    [],
  )
  const rootGeometries = useMemo(
    () => ROOT_PATHS.map((path) => ({ id: path.id, geometry: createTaperedBranchGeometry(path, 8) })),
    [],
  )

  return (
    <group>
      {rootGeometries.map(({ id, geometry }) => (
        <OutlineMesh
          key={id}
          outlineWidth={0.008}
          outlineColor={INK}
          geometry={<primitive object={geometry} attach="geometry" />}
          material={barkMaterial()}
        />
      ))}
      {branchGeometries.map(({ id, geometry }, index) => (
        <OutlineMesh
          key={id}
          outlineWidth={index === 0 ? 0.014 : 0.008}
          outlineColor={INK}
          geometry={<primitive object={geometry} attach="geometry" />}
          material={barkMaterial()}
        />
      ))}
      <BonsaiKnot position={[-0.04, 0.43, -0.079]} rotation={[0.05, 0, -0.12]} scale={0.72} />
      <BonsaiKnot position={[0.008, 0.2, -0.105]} rotation={[-0.08, 0, 0.16]} scale={0.58} />
      <BonsaiKnot position={[0.035, 0.63, 0.065]} rotation={[0, Math.PI, 0.08]} scale={0.46} />
      <BonsaiBranchCollar position={[-0.02, 0.3, -0.004]} rotation={[0.08, 0.1, -0.2]} scale={[0.13, 0.105, 0.1]} />
      <BonsaiBranchCollar position={[-0.075, 0.525, 0.006]} rotation={[-0.05, -0.1, 0.28]} scale={[0.1, 0.083, 0.078]} />
      <BonsaiBranchCollar position={[-0.038, 0.675, -0.005]} rotation={[0.04, 0.12, -0.18]} scale={[0.083, 0.068, 0.064]} />
      <BarkHighlight />
    </group>
  )
}

function BonsaiBranchCollar({
  position,
  rotation,
  scale,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}) {
  return (
    <BonsaiOutlinedMesh
      position={position}
      rotation={rotation}
      scale={scale}
      outlineWidth={0.0025}
      outlineColor={BARK_DEEP}
      geometry={<sphereGeometry args={[1, 8, 5]} />}
      material={toon(BARK_MID, 'bark')}
    />
  )
}

function BonsaiKnot({
  position,
  rotation,
  scale,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <BonsaiOutlinedMesh
        scale={[0.052, 0.067, 0.02]}
        outlineWidth={0.003}
        outlineColor={BARK_DEEP}
        geometry={<torusGeometry args={[0.62, 0.28, 5, 9]} />}
        material={toon(BARK_SHADOW, 'bark')}
      />
      <mesh position={[0, 0, 0.008]} scale={[0.025, 0.035, 0.014]}>
        <sphereGeometry args={[1, 7, 5]} />
        <meshBasicMaterial color={BARK_DEEP} />
      </mesh>
    </group>
  )
}

function BarkHighlight() {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.065, 0.02, -0.09),
      new THREE.Vector3(-0.09, 0.18, -0.08),
      new THREE.Vector3(-0.035, 0.34, -0.08),
      new THREE.Vector3(-0.105, 0.49, -0.055),
    ]),
    [],
  )
  const branchCurve = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, 0.335, -0.06),
      new THREE.Vector3(0.25, 0.39, -0.035),
      new THREE.Vector3(0.44, 0.45, -0.025),
    ]),
    [],
  )
  const grooveCurve = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.045, 0.02, -0.096),
      new THREE.Vector3(0.025, 0.16, -0.105),
      new THREE.Vector3(0.055, 0.285, -0.088),
      new THREE.Vector3(-0.01, 0.39, -0.075),
    ]),
    [],
  )
  const sideGrooveCurve = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.022, 0.48, -0.078),
      new THREE.Vector3(-0.075, 0.58, -0.066),
      new THREE.Vector3(-0.055, 0.7, -0.055),
    ]),
    [],
  )

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 18, 0.008, 5, false]} />
        <meshToonMaterial color={BARK_LIGHT} gradientMap={getBarkRamp()} />
      </mesh>
      <mesh>
        <tubeGeometry args={[branchCurve, 14, 0.006, 5, false]} />
        <meshToonMaterial color={BARK_WARM} gradientMap={getBarkRamp()} />
      </mesh>
      <mesh>
        <tubeGeometry args={[grooveCurve, 16, 0.0045, 5, false]} />
        <meshBasicMaterial color={BARK_DEEP} />
      </mesh>
      <mesh>
        <tubeGeometry args={[sideGrooveCurve, 12, 0.0038, 5, false]} />
        <meshBasicMaterial color={BARK_SHADOW} />
      </mesh>
    </group>
  )
}

function BonsaiGrowthTips() {
  return (
    <group>
      {GROWTH_TIPS.map((tip, index) => (
        <BonsaiOutlinedMesh
          key={`bonsai-growth-tip-${index}`}
          position={tip.position}
          rotation={[index * 0.17, index * 0.29, index * 0.41]}
          scale={tip.scale}
          outlineWidth={0.0015}
          outlineColor={NEEDLE_DEEP}
          geometry={<dodecahedronGeometry args={[1, 0]} />}
          material={toon(NEEDLE_TIP)}
        />
      ))}
    </group>
  )
}

function BonsaiSoilAnchor() {
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

export function BonsaiPlant({ activity = 1 }: { activity?: number }) {
  const plant = useRef<THREE.Group>(null)
  const tuftGeometry = useMemo(() => createNeedleTuftGeometry(), [])

  useFrame(({ clock }) => {
    if (!plant.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const sway = Math.sin(t * 0.47 + 0.6) * 0.006 * motion
    plant.current.rotation.z = -0.018 + sway
    plant.current.rotation.x = Math.sin(t * 0.36 + 0.2) * 0.0025 * motion
    plant.current.rotation.y = Math.sin(t * 0.29 + 0.9) * 0.003 * motion
  })

  return (
    <group ref={plant} rotation={[0, -0.08, -0.018]} scale={[1.02, 1.02, 1.02]}>
      <BonsaiSoilAnchor />
      <BonsaiTrunk />
      {FOLIAGE_PADS.map((spec) => (
        <BonsaiFoliagePad
          key={spec.id}
          spec={spec}
          activity={activity}
          tuftGeometry={tuftGeometry}
        />
      ))}
      <BonsaiGrowthTips />
    </group>
  )
}
