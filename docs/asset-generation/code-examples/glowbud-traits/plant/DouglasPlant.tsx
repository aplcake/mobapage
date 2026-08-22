import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const INK = '#182018'
const NEEDLE_DEEP = '#214e32'
const NEEDLE_SHADOW = '#2f643e'
const NEEDLE_MID = '#487c46'
const NEEDLE_LIGHT = '#70a255'
const NEEDLE_TIP = '#99bb68'
const BARK_DEEP = '#4a251d'
const BARK_MID = '#743a27'
const BARK_LIGHT = '#a25b36'
const SOIL_DEEP = '#2c1b18'
const SOIL_MID = '#533326'
const SOIL_LIGHT = '#75513a'
const DOUGLAS_SPREAD = 1.64
const DOUGLAS_HEIGHT = 1.08

let douglasToonRamp: THREE.DataTexture | null = null

function getDouglasToonRamp() {
  if (douglasToonRamp) return douglasToonRamp

  const colors = new Uint8Array([
    28, 42, 27, 255,
    58, 103, 57, 255,
    132, 169, 84, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  douglasToonRamp = texture
  return texture
}

function toon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getDouglasToonRamp()} />
}

function DouglasOutlinedMesh({
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

type DouglasSpraySpec = {
  id: string
  y: number
  angle: number
  reach: number
  width: number
  depth: number
  droop: number
  sweep: number
  phase: number
}

const TIER_CONFIGS = [
  { y: 0.35, reach: 0.43, width: 0.105, depth: 0.06, droop: -0.075, count: 6, offset: 0.12 },
  { y: 0.55, reach: 0.375, width: 0.1, depth: 0.058, droop: -0.045, count: 5, offset: 0.68 },
  { y: 0.73, reach: 0.32, width: 0.094, depth: 0.055, droop: -0.018, count: 5, offset: 0.18 },
  { y: 0.89, reach: 0.255, width: 0.085, depth: 0.052, droop: 0.018, count: 4, offset: 0.76 },
  { y: 1.03, reach: 0.19, width: 0.076, depth: 0.048, droop: 0.055, count: 4, offset: 0.28 },
] as const

const REACH_VARIATION = [1, 0.92, 1.06, 0.96, 1.03, 0.89]
const ANGLE_JITTER = [0, 0.055, -0.042, 0.028, -0.06, 0.038]

const DOUGLAS_SPRAYS: DouglasSpraySpec[] = TIER_CONFIGS.flatMap((tier, tierIndex) =>
  Array.from({ length: tier.count }, (_, index) => ({
    id: `tier-${tierIndex}-${index}`,
    y: tier.y + (index % 2 === 0 ? 0.008 : -0.012),
    angle: tier.offset
      + (index / tier.count) * Math.PI * 2
      + ANGLE_JITTER[index % ANGLE_JITTER.length],
    reach: tier.reach * REACH_VARIATION[index % REACH_VARIATION.length],
    width: tier.width * (index % 2 === 0 ? 1.04 : 0.96),
    depth: tier.depth,
    droop: tier.droop + (index % 3 === 0 ? -0.012 : 0.006),
    sweep: (index % 2 === 0 ? 1 : -1) * (0.025 + tierIndex * 0.003),
    phase: tierIndex * 7 + index,
  })),
)

function createDouglasSprayGeometry(spec: DouglasSpraySpec) {
  const lengthSegments = 15
  const ringSegments = 9
  const centers: THREE.Vector3[] = []

  for (let index = 0; index <= lengthSegments; index += 1) {
    const t = index / lengthSegments
    const radial = 0.012 + spec.reach * t
    const angle = spec.angle + spec.sweep * Math.sin(t * Math.PI)
    centers.push(new THREE.Vector3(
      Math.cos(angle) * radial,
      spec.y + spec.droop * t * t + Math.sin(t * Math.PI) * 0.035,
      Math.sin(angle) * radial,
    ))
  }

  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deep = new THREE.Color(NEEDLE_DEEP)
  const shadow = new THREE.Color(NEEDLE_SHADOW)
  const mid = new THREE.Color(NEEDLE_MID)
  const light = new THREE.Color(NEEDLE_LIGHT)
  const tip = new THREE.Color(NEEDLE_TIP)

  for (let index = 0; index <= lengthSegments; index += 1) {
    const t = index / lengthSegments
    const previous = centers[Math.max(0, index - 1)]
    const next = centers[Math.min(lengthSegments, index + 1)]
    const tangent = next.clone().sub(previous).normalize()
    const radialSide = new THREE.Vector3(-Math.sin(spec.angle), 0, Math.cos(spec.angle)).normalize()
    const normal = radialSide.clone().cross(tangent).normalize()
    if (normal.y < 0) normal.multiplyScalar(-1)

    const rootOpen = THREE.MathUtils.smoothstep(t, 0, 0.18)
    const tipClose = 1 - THREE.MathUtils.smoothstep(t, 0.72, 1)
    const lobe = 0.88 + Math.sin(t * Math.PI * 5 + spec.phase * 0.7) * 0.1
    const profile = THREE.MathUtils.lerp(0.34, 1, rootOpen)
      * THREE.MathUtils.lerp(0.18, 1, tipClose)
      * lobe
    const width = spec.width * profile
    const depth = spec.depth
      * THREE.MathUtils.lerp(0.68, 1.08, Math.sin(t * Math.PI))
      * THREE.MathUtils.lerp(0.28, 1, tipClose)

    for (let ringIndex = 0; ringIndex < ringSegments; ringIndex += 1) {
      const ringAngle = (ringIndex / ringSegments) * Math.PI * 2
      const sideFactor = Math.cos(ringAngle)
      const depthFactor = Math.sin(ringAngle)
      const point = centers[index]
        .clone()
        .addScaledVector(radialSide, sideFactor * width)
        .addScaledVector(normal, depthFactor * depth)
      positions.push(point.x, point.y, point.z)

      const color = mid.clone()
      if (depthFactor < -0.18) color.lerp(shadow, 0.62)
      if (Math.abs(sideFactor) > 0.64) color.lerp(deep, 0.36)
      if (depthFactor > 0.34) color.lerp(light, 0.38)
      if (t > 0.76) color.lerp(tip, THREE.MathUtils.smoothstep(t, 0.76, 1) * 0.55)
      if (t < 0.1) color.lerp(deep, 0.72)
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
  const finalCenter = centers[lengthSegments]
  positions.push(finalCenter.x, finalCenter.y, finalCenter.z)
  colors.push(tip.r, tip.g, tip.b)

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

function DouglasSpray({ spec, activity }: { spec: DouglasSpraySpec; activity: number }) {
  const spray = useRef<THREE.Group>(null)
  const geometry = useMemo(() => createDouglasSprayGeometry(spec), [spec])
  const branchCurve = useMemo(() => {
    const start = new THREE.Vector3(
      Math.cos(spec.angle) * 0.006,
      spec.y - 0.008,
      Math.sin(spec.angle) * 0.006,
    )
    return new THREE.CatmullRomCurve3([
      start,
      new THREE.Vector3(
        Math.cos(spec.angle) * spec.reach * 0.42,
        spec.y + spec.droop * 0.16,
        Math.sin(spec.angle) * spec.reach * 0.42,
      ),
      new THREE.Vector3(
        Math.cos(spec.angle + spec.sweep) * spec.reach * 0.9,
        spec.y + spec.droop * 0.8,
        Math.sin(spec.angle + spec.sweep) * spec.reach * 0.9,
      ),
    ])
  }, [spec])

  useFrame(({ clock }) => {
    if (!spray.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    spray.current.rotation.y = Math.sin(clock.elapsedTime * 0.48 + spec.phase) * 0.003 * motion
    spray.current.rotation.z = Math.sin(clock.elapsedTime * 0.64 + spec.phase * 0.71) * 0.0025 * motion
  })

  return (
    <group ref={spray}>
      <OutlineMesh
        outlineWidth={0.004}
        outlineColor={INK}
        geometry={<tubeGeometry args={[branchCurve, 12, 0.012, 7, false]} />}
        material={toon(BARK_DEEP)}
      />
      <OutlineMesh
        outlineWidth={0.0045}
        outlineColor={INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<meshToonMaterial vertexColors gradientMap={getDouglasToonRamp()} />}
      />
      {[0.34, 0.58, 0.8].map((progress, index) => {
        const angle = spec.angle + spec.sweep * Math.sin(progress * Math.PI)
        const position: [number, number, number] = [
          Math.cos(angle) * spec.reach * progress,
          spec.y
            + spec.droop * progress * progress
            + Math.sin(progress * Math.PI) * 0.038,
          Math.sin(angle) * spec.reach * progress,
        ]
        const cloudScale = 1 - index * 0.11
        const cloudColor = index === 0
          ? NEEDLE_SHADOW
          : index === 1
            ? NEEDLE_MID
            : NEEDLE_LIGHT
        return (
          <DouglasOutlinedMesh
            key={`${spec.id}-foliage-cloud-${index}`}
            position={position}
            rotation={[0.04 * (index - 1), -angle, 0.03 * (index % 2 === 0 ? 1 : -1)]}
            scale={[
              spec.reach * 0.22 * cloudScale,
              spec.width * 0.82 * cloudScale,
              spec.depth * 1.12 * cloudScale,
            ]}
            outlineWidth={0.0035}
            geometry={<sphereGeometry args={[1, 10, 6]} />}
            material={toon(cloudColor)}
          />
        )
      })}
    </group>
  )
}

function DouglasTrunk() {
  const trunkCurve = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.12, 0),
      new THREE.Vector3(-0.008, 0.28, 0.006),
      new THREE.Vector3(0.012, 0.7, -0.004),
      new THREE.Vector3(-0.004, 1.16, 0),
    ]),
    [],
  )
  const barkLightCurve = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.032, -0.04, -0.026),
      new THREE.Vector3(-0.03, 0.28, -0.03),
      new THREE.Vector3(-0.014, 0.58, -0.026),
    ]),
    [],
  )

  return (
    <group>
      <OutlineMesh
        outlineWidth={0.011}
        outlineColor={INK}
        geometry={<tubeGeometry args={[trunkCurve, 24, 0.055, 9, false]} />}
        material={toon(BARK_MID)}
      />
      <OutlineMesh
        outlineWidth={0.002}
        outlineColor={BARK_DEEP}
        geometry={<tubeGeometry args={[barkLightCurve, 14, 0.008, 6, false]} />}
        material={toon(BARK_LIGHT)}
      />
      <DouglasOutlinedMesh
        position={[0.022, 0.23, -0.05]}
        rotation={[0.15, 0.2, -0.12]}
        scale={[0.016, 0.09, 0.008]}
        outlineWidth={0.002}
        geometry={<sphereGeometry args={[1, 7, 4]} />}
        material={toon(BARK_DEEP)}
      />
    </group>
  )
}

function DouglasCrownTip() {
  const tipSpecs: Array<{
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
    color: string
  }> = [
    { position: [0, 1.11, 0], rotation: [0, 0.15, -0.02], scale: [0.062, 0.19, 0.052], color: NEEDLE_MID },
    { position: [-0.038, 1.075, 0.018], rotation: [0.1, -0.2, 0.34], scale: [0.042, 0.13, 0.038], color: NEEDLE_SHADOW },
    { position: [0.04, 1.07, -0.016], rotation: [-0.08, 0.28, -0.32], scale: [0.044, 0.128, 0.038], color: NEEDLE_LIGHT },
  ]

  return (
    <group>
      {tipSpecs.map((spec, index) => (
        <DouglasOutlinedMesh
          key={`douglas-crown-tip-${index}`}
          position={spec.position}
          rotation={spec.rotation}
          scale={spec.scale}
          outlineWidth={0.006}
          geometry={<capsuleGeometry args={[1, 1.35, 5, 9]} />}
          material={toon(spec.color)}
        />
      ))}
    </group>
  )
}

function DouglasSoilAnchor() {
  return (
    <group>
      <mesh position={[0, 0.015, 0]} scale={[0.19, 0.032, 0.13]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={SOIL_DEEP} />
      </mesh>
      <mesh position={[-0.09, 0.04, 0.015]} rotation-z={-0.22} scale={[0.1, 0.019, 0.06]}>
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

export function DouglasPlant({ activity = 1 }: { activity?: number }) {
  const plant = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!plant.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const sway = Math.sin(t * 0.58 + 0.4) * 0.007 * motion
    const breathe = Math.sin(t * 0.86 + 0.8) * 0.0018 * motion
    plant.current.rotation.z = -0.008 + sway
    plant.current.rotation.x = Math.sin(t * 0.46) * 0.0025 * motion
    plant.current.scale.set(
      DOUGLAS_SPREAD * (1 + breathe),
      DOUGLAS_HEIGHT * (1 - breathe * 0.18),
      DOUGLAS_SPREAD * (1 + breathe),
    )
  })

  return (
    <group ref={plant} scale={[DOUGLAS_SPREAD, DOUGLAS_HEIGHT, DOUGLAS_SPREAD]}>
      <DouglasSoilAnchor />
      <DouglasTrunk />
      {DOUGLAS_SPRAYS.map((spec) => (
        <DouglasSpray key={spec.id} spec={spec} activity={activity} />
      ))}
      <DouglasCrownTip />
    </group>
  )
}
