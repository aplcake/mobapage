import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const INK = '#21162c'
const PETAL_EDGE = '#b92f72'
const PETAL_ROSE = '#e865a3'
const PETAL_BLUSH = '#f6a8c8'
const PETAL_PALE = '#fbd5e5'
const PETAL_IVORY = '#fff1f5'
const CENTER_ORANGE = '#ed7b1e'
const CENTER_GOLD = '#ffc629'
const CENTER_LIGHT = '#ffe85a'
const LEAF_DEEP = '#25533a'
const LEAF_MID = '#3d8050'
const LEAF_LIGHT = '#68a95e'
const STEM_DEEP = '#2d5c36'
const STEM_MID = '#4b8748'
const STEM_LIGHT = '#79aa5c'
const SOIL_DEEP = '#2d1c20'
const SOIL_MID = '#4f302a'
const SOIL_LIGHT = '#76503a'

let lotusToonRamp: THREE.DataTexture | null = null
let lotusCenterToonRamp: THREE.DataTexture | null = null

function getLotusToonRamp() {
  if (lotusToonRamp) return lotusToonRamp

  const colors = new Uint8Array([
    47, 31, 52, 255,
    182, 78, 127, 255,
    255, 224, 235, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  lotusToonRamp = texture
  return texture
}

function getLotusCenterToonRamp() {
  if (lotusCenterToonRamp) return lotusCenterToonRamp

  const colors = new Uint8Array([
    180, 66, 12, 255,
    255, 178, 24, 255,
    255, 239, 92, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  lotusCenterToonRamp = texture
  return texture
}

function toon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getLotusToonRamp()} />
}

function centerToon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getLotusCenterToonRamp()} />
}

function LotusOutlinedMesh({
  geometry,
  material,
  position = [0, 0, 0],
  rotation,
  scale = [1, 1, 1],
  outlineWidth = 0.008,
}: {
  geometry: ReactElement
  material: ReactElement
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  outlineWidth?: number
}) {
  return (
    <OutlineMesh
      position={position}
      rotation={rotation}
      scale={scale}
      outlineWidth={outlineWidth}
      outlineColor={INK}
      geometry={geometry}
      material={material}
    />
  )
}

type LotusPetalTone = 'pale' | 'blush' | 'rose'

type LotusPetalSpec = {
  id: string
  angle: number
  radialReach: number
  rootRadius: number
  baseY: number
  lift: number
  arch: number
  droop: number
  width: number
  thickness: number
  twist: number
  phase: number
  tone: LotusPetalTone
}

type LotusWhorlConfig = Omit<LotusPetalSpec, 'id' | 'angle' | 'phase'> & {
  name: string
  count: number
  angleOffset: number
}

const SCALE_VARIATION = [0.98, 1.04, 0.95, 1.02, 1.06, 0.97, 1.01, 0.94, 1.03]
const ANGLE_JITTER = [0, 0.035, -0.026, 0.018, -0.038, 0.026, -0.014, 0.03, -0.022]

function makeLotusWhorl(config: LotusWhorlConfig): LotusPetalSpec[] {
  return Array.from({ length: config.count }, (_, index) => {
    const scale = SCALE_VARIATION[index % SCALE_VARIATION.length]
    return {
      id: `${config.name}-${index}`,
      angle: config.angleOffset
        + (index / config.count) * Math.PI * 2
        + ANGLE_JITTER[index % ANGLE_JITTER.length],
      radialReach: config.radialReach * scale,
      rootRadius: config.rootRadius,
      baseY: config.baseY + (index % 3 === 0 ? -0.006 : index % 3 === 1 ? 0.004 : 0),
      lift: config.lift * (2 - scale),
      arch: config.arch * scale,
      droop: config.droop,
      width: config.width * (index % 2 === 0 ? 1.03 : 0.97),
      thickness: config.thickness,
      twist: config.twist * (index % 2 === 0 ? 1 : -1),
      phase: index,
      tone: config.tone,
    }
  })
}

const LOTUS_PETALS: LotusPetalSpec[] = [
  ...makeLotusWhorl({
    name: 'outer',
    count: 9,
    angleOffset: 0.08,
    radialReach: 0.415,
    rootRadius: 0.018,
    baseY: -0.032,
    lift: 0.065,
    arch: 0.145,
    droop: -0.015,
    width: 0.158,
    thickness: 0.038,
    twist: 0.055,
    tone: 'pale',
  }),
  ...makeLotusWhorl({
    name: 'middle',
    count: 8,
    angleOffset: 0.46,
    radialReach: 0.315,
    rootRadius: 0.012,
    baseY: 0.005,
    lift: 0.245,
    arch: 0.13,
    droop: 0.018,
    width: 0.14,
    thickness: 0.04,
    twist: 0.045,
    tone: 'blush',
  }),
  ...makeLotusWhorl({
    name: 'inner',
    count: 6,
    angleOffset: 0.16,
    radialReach: 0.205,
    rootRadius: 0.008,
    baseY: 0.035,
    lift: 0.36,
    arch: 0.075,
    droop: 0.02,
    width: 0.112,
    thickness: 0.038,
    twist: 0.032,
    tone: 'rose',
  }),
]

function createLotusPetalGeometry(spec: LotusPetalSpec) {
  const lengthSegments = 20
  const ringSegments = 10
  const centers: THREE.Vector3[] = []

  for (let index = 0; index <= lengthSegments; index += 1) {
    const t = index / lengthSegments
    const angle = spec.angle + spec.twist * Math.sin(t * Math.PI)
    const radial = spec.rootRadius + spec.radialReach * t
    centers.push(new THREE.Vector3(
      Math.cos(angle) * radial,
      spec.baseY
        + spec.lift * t
        + spec.arch * Math.sin(t * Math.PI)
        + spec.droop * t * t,
      Math.sin(angle) * radial,
    ))
  }

  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const edge = new THREE.Color(PETAL_EDGE)
  const rose = new THREE.Color(PETAL_ROSE)
  const blush = new THREE.Color(PETAL_BLUSH)
  const pale = new THREE.Color(PETAL_PALE)
  const ivory = new THREE.Color(PETAL_IVORY)
  const toneBase = spec.tone === 'rose' ? rose : spec.tone === 'blush' ? blush : pale

  for (let index = 0; index <= lengthSegments; index += 1) {
    const t = index / lengthSegments
    const previous = centers[Math.max(0, index - 1)]
    const next = centers[Math.min(lengthSegments, index + 1)]
    const tangent = next.clone().sub(previous).normalize()
    const angle = spec.angle + spec.twist * Math.sin(t * Math.PI)
    const side = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).normalize()
    const normal = side.clone().cross(tangent).normalize()
    if (normal.y < 0) normal.multiplyScalar(-1)

    const body = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.72)
    const tipProgress = THREE.MathUtils.smoothstep(t, 0.83, 1)
    const rootProgress = THREE.MathUtils.smoothstep(t, 0, 0.2)
    const profile = THREE.MathUtils.lerp(0.24, 1, rootProgress)
      * (0.3 + body * 0.78)
      * THREE.MathUtils.lerp(1, 0.08, tipProgress)
    const width = spec.width * profile
    const thickness = spec.thickness
      * THREE.MathUtils.lerp(0.76, 1.08, body)
      * THREE.MathUtils.lerp(1, 0.18, tipProgress)

    for (let ringIndex = 0; ringIndex < ringSegments; ringIndex += 1) {
      const ringAngle = (ringIndex / ringSegments) * Math.PI * 2
      const sideFactor = Math.cos(ringAngle)
      const depthFactor = Math.sin(ringAngle)
      const fold = 1 + 0.14 * (1 - Math.abs(sideFactor))
      const point = centers[index]
        .clone()
        .addScaledVector(side, sideFactor * width)
        .addScaledVector(normal, depthFactor * thickness * fold)
      positions.push(point.x, point.y, point.z)

      const color = toneBase.clone().lerp(ivory, THREE.MathUtils.smoothstep(t, 0.48, 1) * 0.72)
      if (Math.abs(sideFactor) > 0.68) color.lerp(edge, 0.38)
      if (depthFactor < -0.18) color.lerp(edge, 0.28)
      if (Math.abs(sideFactor) < 0.24 && depthFactor > 0.15) color.lerp(ivory, 0.3)
      if ((Math.floor(t * 7 + spec.phase) % 3) === 0) color.lerp(blush, 0.09)
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
  positions.push(centers[0].x, centers[0].y, centers[0].z)
  colors.push(edge.r, edge.g, edge.b)
  const tipCenterIndex = positions.length / 3
  const tip = centers[lengthSegments]
  positions.push(tip.x, tip.y, tip.z)
  colors.push(ivory.r, ivory.g, ivory.b)

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

function LotusPetal({ spec }: { spec: LotusPetalSpec }) {
  const geometry = useMemo(() => createLotusPetalGeometry(spec), [spec])

  return (
    <OutlineMesh
      outlineWidth={0.009}
      outlineColor={INK}
      geometry={<primitive object={geometry} attach="geometry" />}
      material={<meshToonMaterial vertexColors gradientMap={getLotusToonRamp()} />}
    />
  )
}

const LOTUS_STAMENS = Array.from({ length: 18 }, (_, index) => ({
  angle: (index / 18) * Math.PI * 2 + (index % 2) * 0.08,
  radius: index % 2 === 0 ? 0.086 : 0.122,
  height: 0.12 + (index % 3) * 0.012,
  tilt: index % 2 === 0 ? 0.16 : 0.24,
}))

function LotusCenter() {
  return (
    <group position={[0, 0.19, 0.035]}>
      <LotusOutlinedMesh
        position={[0, 0.018, 0]}
        scale={[0.165, 0.07, 0.165]}
        outlineWidth={0.006}
        geometry={<sphereGeometry args={[1, 14, 7]} />}
        material={centerToon(CENTER_ORANGE)}
      />
      {LOTUS_STAMENS.map((stamen, index) => (
        <group
          key={`lotus-stamen-${index}`}
          position={[
            Math.cos(stamen.angle) * stamen.radius,
            0.045,
            Math.sin(stamen.angle) * stamen.radius,
          ]}
          rotation={[0, -stamen.angle, stamen.tilt]}
        >
          <mesh position={[0, stamen.height * 0.5, 0]}>
            <cylinderGeometry args={[0.009, 0.012, stamen.height, 7]} />
            <meshToonMaterial color={CENTER_GOLD} gradientMap={getLotusCenterToonRamp()} />
          </mesh>
          <LotusOutlinedMesh
            position={[0, stamen.height, 0]}
            scale={[0.017, 0.023, 0.017]}
            outlineWidth={0.0025}
            geometry={<sphereGeometry args={[1, 8, 5]} />}
            material={centerToon(index % 3 === 0 ? CENTER_LIGHT : CENTER_ORANGE)}
          />
        </group>
      ))}
    </group>
  )
}

function createLotusPadGeometry(seed: number) {
  const radialRings = 3
  const segments = 24
  const topPositions: number[] = [0, -0.025, 0]
  const topColors: number[] = []
  const deep = new THREE.Color(LEAF_DEEP)
  const mid = new THREE.Color(LEAF_MID)
  const light = new THREE.Color(LEAF_LIGHT)
  topColors.push(mid.r, mid.g, mid.b)

  for (let ring = 1; ring <= radialRings; ring += 1) {
    const fraction = ring / radialRings
    for (let index = 0; index < segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2
      const irregularity = 1
        + Math.sin(angle * 3 + seed) * 0.055
        + Math.cos(angle * 5 - seed * 0.7) * 0.035
      const radius = fraction * irregularity
      const ripple = Math.sin(angle * 4 + seed) * 0.012 * fraction
      const y = Math.sin(fraction * Math.PI) * 0.045 - (1 - fraction) * 0.018 + ripple
      topPositions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
      const color = mid.clone()
      if (ring === radialRings) color.lerp(deep, 0.46)
      else if ((index + ring + Math.round(seed * 3)) % 4 === 0) color.lerp(light, 0.36)
      topColors.push(color.r, color.g, color.b)
    }
  }

  const positions = [...topPositions]
  const colors = [...topColors]
  const topVertexCount = topPositions.length / 3
  for (let index = 0; index < topVertexCount; index += 1) {
    positions.push(
      topPositions[index * 3],
      topPositions[index * 3 + 1] - 0.065,
      topPositions[index * 3 + 2],
    )
    colors.push(deep.r, deep.g, deep.b)
  }

  const indices: number[] = []
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments
    indices.push(0, 1 + next, 1 + segment)
    indices.push(topVertexCount, topVertexCount + 1 + segment, topVertexCount + 1 + next)
  }

  for (let ring = 1; ring < radialRings; ring += 1) {
    const innerStart = 1 + (ring - 1) * segments
    const outerStart = 1 + ring * segments
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments
      const a = innerStart + segment
      const b = innerStart + next
      const c = outerStart + next
      const d = outerStart + segment
      indices.push(a, b, d, b, c, d)
      indices.push(
        topVertexCount + a,
        topVertexCount + d,
        topVertexCount + b,
        topVertexCount + b,
        topVertexCount + d,
        topVertexCount + c,
      )
    }
  }

  const outerStart = 1 + (radialRings - 1) * segments
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments
    const a = outerStart + segment
    const b = outerStart + next
    const c = topVertexCount + outerStart + next
    const d = topVertexCount + outerStart + segment
    indices.push(a, b, d, b, c, d)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function LotusPad({
  seed,
  position,
  rotation,
  scale,
}: {
  seed: number
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}) {
  const geometry = useMemo(() => createLotusPadGeometry(seed), [seed])
  return (
    <OutlineMesh
      position={position}
      rotation={rotation}
      scale={scale}
      outlineWidth={0.011}
      outlineColor={INK}
      geometry={<primitive object={geometry} attach="geometry" />}
      material={<meshToonMaterial vertexColors gradientMap={getLotusToonRamp()} />}
    />
  )
}

function LotusStemAndPads() {
  const flowerStem = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.006, 0.018, 0.012),
      new THREE.Vector3(-0.018, 0.25, 0.018),
      new THREE.Vector3(0.012, 0.5, 0.005),
      new THREE.Vector3(0.018, 0.76, -0.015),
    ]),
    [],
  )
  const stemHighlight = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.03, 0.04, -0.026),
      new THREE.Vector3(-0.04, 0.28, -0.032),
      new THREE.Vector3(-0.01, 0.52, -0.035),
      new THREE.Vector3(0.002, 0.7, -0.038),
    ]),
    [],
  )
  const leftStem = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.018, 0.04, 0.018),
      new THREE.Vector3(-0.11, 0.19, 0.035),
      new THREE.Vector3(-0.25, 0.3, 0.018),
    ]),
    [],
  )
  const rightStem = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.018, 0.04, 0.015),
      new THREE.Vector3(0.11, 0.15, 0.06),
      new THREE.Vector3(0.22, 0.235, 0.08),
    ]),
    [],
  )

  return (
    <group>
      <OutlineMesh
        outlineWidth={0.011}
        outlineColor={INK}
        geometry={<tubeGeometry args={[flowerStem, 26, 0.044, 10, false]} />}
        material={toon(STEM_MID)}
      />
      <OutlineMesh
        outlineWidth={0.002}
        outlineColor={STEM_DEEP}
        geometry={<tubeGeometry args={[stemHighlight, 20, 0.008, 7, false]} />}
        material={toon(STEM_LIGHT)}
      />
      <OutlineMesh
        outlineWidth={0.006}
        outlineColor={INK}
        geometry={<tubeGeometry args={[leftStem, 16, 0.019, 8, false]} />}
        material={toon(STEM_DEEP)}
      />
      <OutlineMesh
        outlineWidth={0.006}
        outlineColor={INK}
        geometry={<tubeGeometry args={[rightStem, 16, 0.018, 8, false]} />}
        material={toon(STEM_MID)}
      />
      <LotusPad
        seed={0.7}
        position={[-0.26, 0.315, 0.02]}
        rotation={[0.08, -0.18, 0.07]}
        scale={[0.29, 0.26, 0.22]}
      />
      <LotusPad
        seed={1.8}
        position={[0.23, 0.245, 0.08]}
        rotation={[-0.04, 0.25, -0.08]}
        scale={[0.225, 0.22, 0.17]}
      />
    </group>
  )
}

function LotusBloom({ activity }: { activity: number }) {
  const bloom = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!bloom.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    bloom.current.rotation.z = 0.012 + Math.sin(t * 0.7 + 0.4) * 0.006 * motion
    bloom.current.rotation.x = -1.12 + Math.sin(t * 0.54 + 1.1) * 0.004 * motion
  })

  return (
    <group
      ref={bloom}
      position={[0.018, 0.755, -0.015]}
      rotation={[-1.12, 0.02, 0.012]}
      scale={[1.42, 1.3, 1.42]}
    >
      <LotusOutlinedMesh
        position={[0, -0.035, 0]}
        scale={[0.16, 0.065, 0.16]}
        outlineWidth={0.006}
        geometry={<sphereGeometry args={[1, 14, 7]} />}
        material={toon(STEM_DEEP)}
      />
      {LOTUS_PETALS.map((spec) => (
        <LotusPetal key={spec.id} spec={spec} />
      ))}
      <LotusCenter />
    </group>
  )
}

function LotusSoilAnchor() {
  return (
    <group>
      <mesh position={[0.002, 0.026, -0.002]} scale={[0.185, 0.025, 0.1]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={SOIL_DEEP} />
      </mesh>
      <mesh position={[-0.084, 0.044, 0.012]} rotation-z={-0.2} scale={[0.09, 0.016, 0.047]}>
        <sphereGeometry args={[1, 9, 5]} />
        <meshBasicMaterial color={SOIL_MID} />
      </mesh>
      <mesh position={[0.086, 0.042, -0.006]} rotation-z={0.18} scale={[0.084, 0.015, 0.045]}>
        <sphereGeometry args={[1, 9, 5]} />
        <meshBasicMaterial color={SOIL_LIGHT} />
      </mesh>
      <LotusOutlinedMesh
        position={[-0.004, 0.055, 0.01]}
        rotation={[0, 0, -0.04]}
        scale={[0.074, 0.058, 0.064]}
        outlineWidth={0.004}
        geometry={<sphereGeometry args={[1, 10, 6]} />}
        material={toon(STEM_DEEP)}
      />
    </group>
  )
}

export function LotusPlant({ activity = 1 }: { activity?: number }) {
  const plant = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!plant.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const sway = Math.sin(t * 0.72 + 0.2) * 0.007 * motion
    const breathe = Math.sin(t * 1.02 + 0.7) * 0.002 * motion
    plant.current.rotation.z = -0.006 + sway
    plant.current.scale.set(1 + breathe, 1 - breathe * 0.16, 1 + breathe)
  })

  return (
    <group ref={plant}>
      <LotusSoilAnchor />
      <LotusStemAndPads />
      <LotusBloom activity={activity} />
    </group>
  )
}
