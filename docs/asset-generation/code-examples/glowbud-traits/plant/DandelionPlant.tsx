import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const INK = '#211a25'
const STEM_DEEP = '#2d4b31'
const STEM_MID = '#4f7939'
const STEM_LIGHT = '#7fa84d'
const LEAF_DEEP = '#315738'
const LEAF_MID = '#4f7a3e'
const LEAF_LIGHT = '#77a64c'
const CLOCK_CORE = '#a5aa96'
const CLOCK_SHADOW = '#bfc2b7'
const CLOCK_MID = '#e2e2d8'
const CLOCK_LIGHT = '#f7f5e9'
const CLOCK_GLOW = '#fffdf4'
const SEED_BROWN = '#75543e'
const SOIL_DEEP = '#2c1c18'
const SOIL_MID = '#543326'
const SOIL_LIGHT = '#79513a'

let foliageRamp: THREE.DataTexture | null = null
let clockRamp: THREE.DataTexture | null = null

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
      39, 67, 40, 255,
      76, 117, 57, 255,
      137, 174, 79, 255,
    ])
  }
  return foliageRamp
}

function getClockRamp() {
  if (!clockRamp) {
    clockRamp = createToonRamp([
      133, 137, 127, 255,
      216, 217, 207, 255,
      255, 253, 244, 255,
    ])
  }
  return clockRamp
}

function foliageToon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getFoliageRamp()} />
}

function clockToon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getClockRamp()} />
}

function DandelionOutlinedMesh({
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

type RosetteLeafSpec = {
  id: string
  angle: number
  length: number
  width: number
  rise: number
  curl: number
  phase: number
}

const ROSETTE_LEAVES: RosetteLeafSpec[] = Array.from({ length: 11 }, (_, index) => ({
  id: `rosette-leaf-${index}`,
  angle: (index / 11) * Math.PI * 2 + (index % 3) * 0.07,
  length: 0.25 + (index % 4) * 0.025,
  width: 0.075 + (index % 3) * 0.008,
  rise: 0.025 + (index % 4) * 0.009,
  curl: (index % 2 === 0 ? 1 : -1) * (0.012 + (index % 3) * 0.004),
  phase: index,
}))

function createDandelionLeafGeometry(spec: RosetteLeafSpec) {
  const lengthSegments = 18
  const ringSegments = 8
  const centers: THREE.Vector3[] = []
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deep = new THREE.Color(LEAF_DEEP)
  const mid = new THREE.Color(LEAF_MID)
  const light = new THREE.Color(LEAF_LIGHT)

  for (let index = 0; index <= lengthSegments; index += 1) {
    const t = index / lengthSegments
    const radial = 0.015 + spec.length * t
    const sideBend = Math.sin(t * Math.PI) * spec.curl
    centers.push(new THREE.Vector3(
      Math.cos(spec.angle) * radial + Math.cos(spec.angle + Math.PI / 2) * sideBend,
      -0.005 + spec.rise * Math.sin(t * Math.PI) - 0.02 * t * t,
      Math.sin(spec.angle) * radial + Math.sin(spec.angle + Math.PI / 2) * sideBend,
    ))
  }

  for (let index = 0; index <= lengthSegments; index += 1) {
    const t = index / lengthSegments
    const previous = centers[Math.max(0, index - 1)]
    const next = centers[Math.min(lengthSegments, index + 1)]
    const tangent = next.clone().sub(previous).normalize()
    const side = new THREE.Vector3(-Math.sin(spec.angle), 0, Math.cos(spec.angle))
    const normal = tangent.clone().cross(side).normalize()
    const rootOpen = THREE.MathUtils.smoothstep(t, 0, 0.13)
    const tipClose = 1 - THREE.MathUtils.smoothstep(t, 0.76, 1)
    const lobeRhythm = 0.77 + Math.pow(Math.abs(Math.sin(t * Math.PI * 4.5)), 1.5) * 0.3
    const halfWidth = spec.width * rootOpen * tipClose * lobeRhythm
    const thickness = (0.014 + Math.sin(t * Math.PI) * 0.009) * rootOpen * tipClose

    for (let ringIndex = 0; ringIndex < ringSegments; ringIndex += 1) {
      const ringAngle = (ringIndex / ringSegments) * Math.PI * 2
      const sideAmount = Math.cos(ringAngle) * halfWidth
      const normalAmount = Math.sin(ringAngle) * thickness
      const point = centers[index]
        .clone()
        .addScaledVector(side, sideAmount)
        .addScaledVector(normal, normalAmount)
      positions.push(point.x, point.y, point.z)

      const color = mid.clone()
      if (normalAmount < 0) color.lerp(deep, 0.62)
      if (normalAmount > 0) color.lerp(light, 0.48)
      if (Math.abs(sideAmount) > halfWidth * 0.7) color.lerp(deep, 0.28)
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

function DandelionRosetteLeaf({ spec }: { spec: RosetteLeafSpec }) {
  const geometry = useMemo(() => createDandelionLeafGeometry(spec), [spec])
  return (
    <OutlineMesh
      outlineWidth={0.003}
      outlineColor={LEAF_DEEP}
      geometry={<primitive object={geometry} attach="geometry" />}
      material={<meshToonMaterial vertexColors gradientMap={getFoliageRamp()} />}
    />
  )
}

function createDandelionStemCurve() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.12, 0),
    new THREE.Vector3(-0.018, 0.2, 0.006),
    new THREE.Vector3(0.012, 0.43, -0.01),
    new THREE.Vector3(-0.008, 0.59, 0),
  ])
}

type SeedTuftSpec = {
  id: string
  direction: THREE.Vector3
  size: number
  tone: 'shadow' | 'mid' | 'light'
  twist: number
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

const SEED_TUFTS: SeedTuftSpec[] = Array.from({ length: 44 }, (_, index) => {
  const y = 1 - (index / 43) * 2
  const radius = Math.sqrt(Math.max(0, 1 - y * y))
  const theta = index * GOLDEN_ANGLE
  return {
    id: `seed-tuft-${index}`,
    direction: new THREE.Vector3(
      Math.cos(theta) * radius,
      y,
      Math.sin(theta) * radius,
    ).normalize(),
    size: 0.024 + (index % 5) * 0.0018,
    tone: index % 7 === 0 ? 'shadow' : index % 3 === 0 ? 'light' : 'mid',
    twist: theta,
  }
})

function makeTubeBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number) {
  return new THREE.TubeGeometry(
    new THREE.LineCurve3(start, end),
    2,
    radius,
    5,
    false,
  )
}

function SeedTuft({ spec }: { spec: SeedTuftSpec }) {
  const clockCenter = new THREE.Vector3(-0.008, 0.78, 0)
  const filamentStart = clockCenter.clone().addScaledVector(spec.direction, 0.078)
  const tuftCenter = clockCenter.clone().addScaledVector(spec.direction, 0.218)
  const filamentEnd = clockCenter.clone().addScaledVector(spec.direction, 0.204)
  const filamentGeometry = makeTubeBetween(filamentStart, filamentEnd, 0.0022)
  const tone = spec.tone === 'shadow'
    ? CLOCK_SHADOW
    : spec.tone === 'light'
      ? CLOCK_GLOW
      : CLOCK_MID
  const side = new THREE.Vector3(-spec.direction.z, 0, spec.direction.x).normalize()
  if (side.lengthSq() < 0.1) side.set(1, 0, 0)
  const up = spec.direction.clone().cross(side).normalize()
  const lobeOffsets = [
    new THREE.Vector3(),
    side.clone().multiplyScalar(spec.size * 0.48),
    side.clone().multiplyScalar(-spec.size * 0.48),
    up.clone().multiplyScalar(spec.size * 0.44),
  ]

  return (
    <group>
      <mesh geometry={filamentGeometry}>
        <meshBasicMaterial color={CLOCK_SHADOW} />
      </mesh>
      <DandelionOutlinedMesh
        position={[
          filamentStart.x,
          filamentStart.y,
          filamentStart.z,
        ]}
        scale={[0.006, 0.012, 0.006]}
        outlineWidth={0.0012}
        outlineColor={SEED_BROWN}
        geometry={<sphereGeometry args={[1, 6, 4]} />}
        material={<meshToonMaterial color={SEED_BROWN} gradientMap={getClockRamp()} />}
      />
      {lobeOffsets.map((offset, index) => {
        const point = tuftCenter.clone().add(offset)
        const lobeScale = index === 0 ? 1 : 0.78
        return (
          <group key={`${spec.id}-lobe-${index}`}>
            {index > 0 ? (
              <mesh geometry={makeTubeBetween(tuftCenter, point, 0.0008)}>
                <meshBasicMaterial color={CLOCK_SHADOW} />
              </mesh>
            ) : null}
            <DandelionOutlinedMesh
              position={[point.x, point.y, point.z]}
              rotation={[
                spec.direction.z * 0.35,
                spec.twist + index * 0.8,
                -spec.direction.x * 0.35,
              ]}
              scale={[
                spec.size * lobeScale,
                spec.size * (index === 0 ? 1.22 : 0.82),
                spec.size * lobeScale,
              ]}
              outlineWidth={0.0015}
              outlineColor={CLOCK_CORE}
              geometry={<icosahedronGeometry args={[1, 1]} />}
              material={clockToon(index === 0 ? tone : CLOCK_LIGHT)}
            />
          </group>
        )
      })}
    </group>
  )
}

function DandelionClock({ activity }: { activity: number }) {
  const clock = useRef<THREE.Group>(null)

  useFrame(({ clock: sceneClock }) => {
    if (!clock.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = sceneClock.elapsedTime
    clock.current.rotation.z = Math.sin(t * 0.52 + 0.4) * 0.005 * motion
    clock.current.rotation.x = Math.sin(t * 0.39 + 0.8) * 0.003 * motion
  })

  return (
    <group ref={clock}>
      <DandelionOutlinedMesh
        position={[-0.008, 0.78, 0]}
        scale={[0.102, 0.102, 0.102]}
        outlineWidth={0.004}
        outlineColor={CLOCK_CORE}
        geometry={<icosahedronGeometry args={[1, 2]} />}
        material={clockToon(CLOCK_CORE)}
      />
      {SEED_TUFTS.map((spec) => (
        <SeedTuft key={spec.id} spec={spec} />
      ))}
    </group>
  )
}

function SoilAnchor() {
  return (
    <group>
      <mesh position={[0, -0.055, 0]} scale={[0.21, 0.035, 0.15]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={SOIL_DEEP} />
      </mesh>
      <mesh position={[-0.08, -0.028, -0.01]} scale={[0.1, 0.018, 0.065]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={SOIL_MID} />
      </mesh>
      <mesh position={[0.09, -0.027, 0.006]} scale={[0.095, 0.017, 0.06]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={SOIL_LIGHT} />
      </mesh>
    </group>
  )
}

export function DandelionPlant({ activity = 1 }: { activity?: number }) {
  const plant = useRef<THREE.Group>(null)
  const stemCurve = useMemo(() => createDandelionStemCurve(), [])

  useFrame(({ clock }) => {
    if (!plant.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const sway = Math.sin(t * 0.46 + 0.5) * 0.006 * motion
    const breathe = Math.sin(t * 0.66 + 0.2) * 0.0018 * motion
    plant.current.rotation.z = -0.004 + sway
    plant.current.rotation.x = Math.sin(t * 0.38 + 0.9) * 0.0025 * motion
    plant.current.scale.set(
      1.34 * (1 + breathe),
      1.08 * (1 - breathe * 0.15),
      1.34 * (1 + breathe),
    )
  })

  return (
    <group ref={plant} scale={[1.34, 1.08, 1.34]}>
      <SoilAnchor />
      <group position={[0, 0.055, 0]}>
        {ROSETTE_LEAVES.map((spec) => (
          <DandelionRosetteLeaf key={spec.id} spec={spec} />
        ))}
      </group>
      <OutlineMesh
        outlineWidth={0.004}
        outlineColor={STEM_DEEP}
        geometry={<tubeGeometry args={[stemCurve, 20, 0.029, 8, false]} />}
        material={foliageToon(STEM_MID)}
      />
      <DandelionOutlinedMesh
        position={[-0.008, 0.6, 0]}
        scale={[0.072, 0.042, 0.072]}
        outlineWidth={0.003}
        outlineColor={STEM_DEEP}
        geometry={<sphereGeometry args={[1, 9, 5]} />}
        material={foliageToon(STEM_LIGHT)}
      />
      <DandelionClock activity={activity} />
    </group>
  )
}
