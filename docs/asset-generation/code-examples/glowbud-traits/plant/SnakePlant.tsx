import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const INK = '#172018'
const LEAF_DEEP = '#234328'
const LEAF_SHADOW = '#315b31'
const LEAF_MID = '#4d8037'
const LEAF_LIGHT = '#75a84d'
const LEAF_MARGIN = '#bdd94d'
const LEAF_MARGIN_LIGHT = '#dbe963'
const SOIL_DEEP = '#2b1b18'
const SOIL_MID = '#4a2d20'
const SOIL_LIGHT = '#68412b'
const PLANT_SPREAD = 1.15
const PLANT_HEIGHT = 1.25

let snakePlantToonRamp: THREE.DataTexture | null = null

function getSnakePlantToonRamp() {
  if (snakePlantToonRamp) return snakePlantToonRamp

  const colors = new Uint8Array([
    29, 54, 31, 255,
    78, 124, 54, 255,
    185, 214, 81, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  snakePlantToonRamp = texture
  return texture
}

function toon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getSnakePlantToonRamp()} />
}

function SnakePlantOutlinedMesh({
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

type SnakeLeafSpec = {
  id: string
  position: [number, number, number]
  yaw: number
  roll: number
  height: number
  width: number
  thickness: number
  curveX: number
  curveZ: number
  bowX: number
  bowZ: number
  twist: number
  phase: number
}

function createSnakeLeafGeometry(spec: SnakeLeafSpec) {
  const lengthSegments = 24
  const ringSegments = 10
  const capStart = 0.82
  const centers: THREE.Vector3[] = []

  for (let index = 0; index <= lengthSegments; index += 1) {
    const t = index / lengthSegments
    const bow = Math.sin(t * Math.PI)
    centers.push(new THREE.Vector3(
      spec.curveX * t * t + spec.bowX * bow,
      spec.height * t,
      spec.curveZ * t * t + spec.bowZ * bow,
    ))
  }

  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deep = new THREE.Color(LEAF_DEEP)
  const shadow = new THREE.Color(LEAF_SHADOW)
  const mid = new THREE.Color(LEAF_MID)
  const light = new THREE.Color(LEAF_LIGHT)
  const margin = new THREE.Color(LEAF_MARGIN)
  const marginLight = new THREE.Color(LEAF_MARGIN_LIGHT)

  for (let index = 0; index <= lengthSegments; index += 1) {
    const t = index / lengthSegments
    const previous = centers[Math.max(0, index - 1)]
    const next = centers[Math.min(lengthSegments, index + 1)]
    const tangent = next.clone().sub(previous).normalize()
    const twistAngle = spec.twist * Math.sin(t * Math.PI)
    const side = new THREE.Vector3(Math.cos(twistAngle), 0, Math.sin(twistAngle))
      .addScaledVector(tangent, -tangent.dot(new THREE.Vector3(Math.cos(twistAngle), 0, Math.sin(twistAngle))))
      .normalize()
    const normal = tangent.clone().cross(side).normalize()
    const rootOpen = THREE.MathUtils.smoothstep(t, 0, 0.16)
    const capProgress = Math.max(0, (t - capStart) / (1 - capStart))
    const tipTaper = t < capStart
      ? 1
      : Math.max(0.045, Math.pow(1 - capProgress, 0.74))
    const belly = 0.91 + Math.sin(t * Math.PI) * 0.09
    const width = spec.width
      * THREE.MathUtils.lerp(0.7, 1, rootOpen)
      * belly
      * tipTaper
    const thickness = spec.thickness
      * THREE.MathUtils.lerp(0.82, 1.08, Math.sin(t * Math.PI))
      * (t < capStart ? 1 : Math.max(0.15, tipTaper))

    for (let ringIndex = 0; ringIndex < ringSegments; ringIndex += 1) {
      const angle = (ringIndex / ringSegments) * Math.PI * 2
      const sideFactor = Math.cos(angle)
      const depthFactor = Math.sin(angle)
      const centerRidge = 1 + 0.28 * (1 - Math.abs(sideFactor))
      const position = centers[index]
        .clone()
        .addScaledVector(side, sideFactor * width)
        .addScaledVector(normal, depthFactor * thickness * centerRidge)
      positions.push(position.x, position.y, position.z)

      const transverseWave = Math.sin(
        t * Math.PI * 15
        + sideFactor * 2.2
        + spec.phase * 0.82,
      )
      let color = transverseWave > 0.08 ? deep : mid
      if (transverseWave < -0.58) color = light
      if (depthFactor < -0.2) color = color.clone().lerp(shadow, 0.42)
      if (Math.abs(sideFactor) > 0.79) {
        color = transverseWave > 0.72 ? margin : marginLight
      } else if (Math.abs(sideFactor) < 0.2 && depthFactor > 0.15) {
        color = color.clone().lerp(light, 0.24)
      }
      if (t < 0.1) color = deep
      if (t > 0.93 && Math.abs(sideFactor) < 0.7) color = deep
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

  const baseCenterIndex = positions.length / 3
  positions.push(centers[0].x, centers[0].y, centers[0].z)
  colors.push(deep.r, deep.g, deep.b)
  const tipCenterIndex = positions.length / 3
  const tip = centers[lengthSegments]
  positions.push(tip.x, tip.y, tip.z)
  colors.push(deep.r, deep.g, deep.b)

  for (let ringIndex = 0; ringIndex < ringSegments; ringIndex += 1) {
    const nextRing = (ringIndex + 1) % ringSegments
    indices.push(baseCenterIndex, nextRing, ringIndex)
    const finalRingStart = lengthSegments * ringSegments
    indices.push(tipCenterIndex, finalRingStart + ringIndex, finalRingStart + nextRing)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

const SNAKE_LEAVES: SnakeLeafSpec[] = [
  {
    id: 'rear-crown',
    position: [-0.02, -0.13, 0.12],
    yaw: 0.08,
    roll: -0.025,
    height: 1.15,
    width: 0.108,
    thickness: 0.02,
    curveX: -0.03,
    curveZ: 0.035,
    bowX: 0.012,
    bowZ: -0.014,
    twist: 0.12,
    phase: 0,
  },
  {
    id: 'center-tall',
    position: [0.025, -0.135, 0.035],
    yaw: -0.1,
    roll: 0.015,
    height: 1.03,
    width: 0.13,
    thickness: 0.023,
    curveX: 0.022,
    curveZ: -0.025,
    bowX: -0.014,
    bowZ: 0.016,
    twist: -0.1,
    phase: 1,
  },
  {
    id: 'left-tall',
    position: [-0.09, -0.135, 0.025],
    yaw: 0.28,
    roll: 0.075,
    height: 0.96,
    width: 0.126,
    thickness: 0.022,
    curveX: -0.085,
    curveZ: 0.018,
    bowX: 0.012,
    bowZ: -0.012,
    twist: 0.13,
    phase: 2,
  },
  {
    id: 'right-tall',
    position: [0.092, -0.138, 0.055],
    yaw: -0.35,
    roll: -0.07,
    height: 0.91,
    width: 0.12,
    thickness: 0.021,
    curveX: 0.078,
    curveZ: 0.02,
    bowX: -0.01,
    bowZ: 0.016,
    twist: -0.14,
    phase: 3,
  },
  {
    id: 'front-broad',
    position: [-0.015, -0.14, -0.105],
    yaw: 0.06,
    roll: -0.018,
    height: 0.78,
    width: 0.142,
    thickness: 0.024,
    curveX: 0.018,
    curveZ: -0.09,
    bowX: -0.012,
    bowZ: 0.022,
    twist: 0.09,
    phase: 4,
  },
  {
    id: 'left-outer',
    position: [-0.16, -0.14, -0.025],
    yaw: 0.62,
    roll: 0.16,
    height: 0.72,
    width: 0.118,
    thickness: 0.021,
    curveX: -0.13,
    curveZ: -0.018,
    bowX: 0.014,
    bowZ: 0.012,
    twist: 0.16,
    phase: 5,
  },
  {
    id: 'right-outer',
    position: [0.155, -0.14, -0.015],
    yaw: -0.58,
    roll: -0.15,
    height: 0.7,
    width: 0.115,
    thickness: 0.021,
    curveX: 0.125,
    curveZ: 0.012,
    bowX: -0.012,
    bowZ: -0.014,
    twist: -0.15,
    phase: 6,
  },
  {
    id: 'rear-left',
    position: [-0.105, -0.145, 0.11],
    yaw: 0.46,
    roll: 0.08,
    height: 0.66,
    width: 0.105,
    thickness: 0.02,
    curveX: -0.06,
    curveZ: 0.045,
    bowX: 0.01,
    bowZ: -0.015,
    twist: 0.12,
    phase: 7,
  },
  {
    id: 'front-pup',
    position: [0.105, -0.145, -0.12],
    yaw: -0.42,
    roll: -0.12,
    height: 0.48,
    width: 0.104,
    thickness: 0.02,
    curveX: 0.06,
    curveZ: -0.055,
    bowX: -0.01,
    bowZ: 0.012,
    twist: -0.1,
    phase: 8,
  },
]

function SnakeLeaf({ spec, activity }: { spec: SnakeLeafSpec; activity: number }) {
  const leaf = useRef<THREE.Group>(null)
  const geometry = useMemo(() => createSnakeLeafGeometry(spec), [spec])

  useFrame(({ clock }) => {
    if (!leaf.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    leaf.current.rotation.z = spec.roll
      + Math.sin(t * 0.66 + spec.phase * 1.37) * 0.0035 * motion
    leaf.current.rotation.x = Math.sin(t * 0.54 + spec.phase * 0.71) * 0.002 * motion
  })

  return (
    <group
      ref={leaf}
      position={spec.position}
      rotation={[0, spec.yaw, spec.roll]}
    >
      <OutlineMesh
        outlineWidth={0.009}
        outlineColor={INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<meshToonMaterial vertexColors gradientMap={getSnakePlantToonRamp()} />}
      />
    </group>
  )
}

function SnakePlantSoilNest() {
  const mounds = [
    { position: [-0.11, 0.05, -0.025], scale: [0.145, 0.028, 0.09], color: SOIL_MID },
    { position: [0.11, 0.05, -0.018], scale: [0.14, 0.026, 0.085], color: SOIL_LIGHT },
    { position: [0.008, 0.046, 0.055], scale: [0.17, 0.026, 0.09], color: SOIL_DEEP },
  ] as const

  return (
    <group>
      {mounds.map((mound, index) => (
        <mesh
          key={`snake-plant-soil-${index}`}
          position={mound.position}
          scale={mound.scale}
        >
          <sphereGeometry args={[1, 9, 5]} />
          <meshToonMaterial color={mound.color} gradientMap={getSnakePlantToonRamp()} />
        </mesh>
      ))}
    </group>
  )
}

export function SnakePlant({ activity = 1 }: { activity?: number }) {
  const plant = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!plant.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const settle = Math.sin(t * 0.78 + 0.35) * 0.0045 * motion
    const breathe = Math.sin(t * 1.04 + 0.6) * 0.002 * motion
    plant.current.rotation.z = -0.006 + settle
    plant.current.scale.set(
      PLANT_SPREAD * (1 + breathe),
      PLANT_HEIGHT * (1 - breathe * 0.22),
      PLANT_SPREAD * (1 + breathe),
    )
  })

  return (
    <group ref={plant} scale={[PLANT_SPREAD, PLANT_HEIGHT, PLANT_SPREAD]}>
      <SnakePlantSoilNest />
      <SnakePlantOutlinedMesh
        position={[0, 0.022, 0.005]}
        scale={[0.175, 0.102, 0.13]}
        outlineWidth={0.007}
        geometry={<sphereGeometry args={[1, 12, 6]} />}
        material={toon(LEAF_DEEP)}
      />
      {SNAKE_LEAVES.map((spec) => (
        <SnakeLeaf key={spec.id} spec={spec} activity={activity} />
      ))}
    </group>
  )
}
