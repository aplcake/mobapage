import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const INK = '#21192a'
const STEM_DEEP = '#31482f'
const STEM_MID = '#4f6844'
const STEM_LIGHT = '#788a5d'
const FOLIAGE_DEEP = '#40594c'
const FOLIAGE_SHADOW = '#566f61'
const FOLIAGE_MID = '#738a78'
const FOLIAGE_LIGHT = '#9eaa98'
const FOLIAGE_GLOSS = '#c0c5b4'
const BLOOM_DEEP = '#4a246d'
const BLOOM_SHADOW = '#663287'
const BLOOM_MID = '#8544a8'
const BLOOM_LIGHT = '#ad63ca'
const BLOOM_GLOW = '#d18ae2'
const CALYX_GREEN = '#64705e'
const WOOD_DEEP = '#50392f'
const WOOD_MID = '#765342'
const SOIL_DEEP = '#2c1b18'
const SOIL_MID = '#533326'
const SOIL_LIGHT = '#75513a'
const LAVENDER_SPREAD = 1.38
const LAVENDER_HEIGHT = 1.1

let lavenderFoliageRamp: THREE.DataTexture | null = null
let lavenderBloomRamp: THREE.DataTexture | null = null

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

function getLavenderFoliageRamp() {
  if (!lavenderFoliageRamp) {
    lavenderFoliageRamp = createToonRamp([
      48, 64, 53, 255,
      105, 126, 108, 255,
      190, 198, 180, 255,
    ])
  }
  return lavenderFoliageRamp
}

function getLavenderBloomRamp() {
  if (!lavenderBloomRamp) {
    lavenderBloomRamp = createToonRamp([
      58, 25, 80, 255,
      126, 55, 158, 255,
      213, 138, 227, 255,
    ])
  }
  return lavenderBloomRamp
}

function foliageToon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getLavenderFoliageRamp()} />
}

function bloomToon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getLavenderBloomRamp()} />
}

function LavenderOutlinedMesh({
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

type LavenderSpikeSpec = {
  id: string
  x: number
  z: number
  stemHeight: number
  bloomLength: number
  bloomWidth: number
  leanX: number
  leanZ: number
  phase: number
  tint: 'deep' | 'mid' | 'light'
}

const LAVENDER_SPIKES: LavenderSpikeSpec[] = [
  { id: 'rear-tall-left', x: -0.14, z: 0.11, stemHeight: 0.88, bloomLength: 0.25, bloomWidth: 0.055, leanX: -0.035, leanZ: 0.018, phase: 0, tint: 'deep' },
  { id: 'rear-tall-center', x: 0.02, z: 0.14, stemHeight: 0.94, bloomLength: 0.27, bloomWidth: 0.058, leanX: 0.012, leanZ: 0.025, phase: 1, tint: 'mid' },
  { id: 'rear-tall-right', x: 0.16, z: 0.1, stemHeight: 0.86, bloomLength: 0.24, bloomWidth: 0.054, leanX: 0.04, leanZ: 0.02, phase: 2, tint: 'light' },
  { id: 'left-crown', x: -0.25, z: 0.03, stemHeight: 0.76, bloomLength: 0.24, bloomWidth: 0.058, leanX: -0.05, leanZ: 0.008, phase: 3, tint: 'mid' },
  { id: 'right-crown', x: 0.25, z: 0.02, stemHeight: 0.79, bloomLength: 0.23, bloomWidth: 0.057, leanX: 0.052, leanZ: -0.006, phase: 4, tint: 'deep' },
  { id: 'front-left-tall', x: -0.13, z: -0.12, stemHeight: 0.83, bloomLength: 0.26, bloomWidth: 0.062, leanX: -0.018, leanZ: -0.035, phase: 5, tint: 'light' },
  { id: 'front-center-tall', x: 0.02, z: -0.15, stemHeight: 0.89, bloomLength: 0.25, bloomWidth: 0.061, leanX: 0.008, leanZ: -0.04, phase: 6, tint: 'mid' },
  { id: 'front-right-tall', x: 0.15, z: -0.11, stemHeight: 0.81, bloomLength: 0.24, bloomWidth: 0.059, leanX: 0.026, leanZ: -0.032, phase: 7, tint: 'deep' },
  { id: 'far-left-low', x: -0.31, z: -0.08, stemHeight: 0.66, bloomLength: 0.2, bloomWidth: 0.052, leanX: -0.06, leanZ: -0.015, phase: 8, tint: 'light' },
  { id: 'far-right-low', x: 0.31, z: -0.05, stemHeight: 0.69, bloomLength: 0.21, bloomWidth: 0.053, leanX: 0.058, leanZ: -0.012, phase: 9, tint: 'mid' },
  { id: 'mid-left-back', x: -0.2, z: 0.16, stemHeight: 0.71, bloomLength: 0.21, bloomWidth: 0.052, leanX: -0.025, leanZ: 0.035, phase: 10, tint: 'deep' },
  { id: 'mid-right-back', x: 0.21, z: 0.15, stemHeight: 0.73, bloomLength: 0.22, bloomWidth: 0.054, leanX: 0.03, leanZ: 0.03, phase: 11, tint: 'light' },
  { id: 'front-left-low', x: -0.22, z: -0.2, stemHeight: 0.64, bloomLength: 0.2, bloomWidth: 0.054, leanX: -0.032, leanZ: -0.04, phase: 12, tint: 'mid' },
  { id: 'front-right-low', x: 0.23, z: -0.19, stemHeight: 0.67, bloomLength: 0.2, bloomWidth: 0.055, leanX: 0.035, leanZ: -0.038, phase: 13, tint: 'light' },
  { id: 'center-left', x: -0.07, z: 0.01, stemHeight: 0.78, bloomLength: 0.23, bloomWidth: 0.057, leanX: -0.012, leanZ: 0.005, phase: 14, tint: 'deep' },
  { id: 'center-right', x: 0.09, z: 0, stemHeight: 0.75, bloomLength: 0.24, bloomWidth: 0.058, leanX: 0.015, leanZ: -0.004, phase: 15, tint: 'light' },
  { id: 'left-side-mid', x: -0.3, z: 0.11, stemHeight: 0.7, bloomLength: 0.2, bloomWidth: 0.051, leanX: -0.04, leanZ: 0.02, phase: 16, tint: 'mid' },
  { id: 'right-side-mid', x: 0.3, z: 0.1, stemHeight: 0.72, bloomLength: 0.21, bloomWidth: 0.052, leanX: 0.042, leanZ: 0.018, phase: 17, tint: 'deep' },
]

function createLavenderStemCurve(spec: LavenderSpikeSpec) {
  const root = new THREE.Vector3(spec.x * 0.26, -0.1, spec.z * 0.26)
  const end = new THREE.Vector3(
    spec.x + spec.leanX,
    spec.stemHeight,
    spec.z + spec.leanZ,
  )
  return new THREE.CatmullRomCurve3([
    root,
    new THREE.Vector3(
      THREE.MathUtils.lerp(root.x, end.x, 0.34) - spec.leanX * 0.14,
      spec.stemHeight * 0.38,
      THREE.MathUtils.lerp(root.z, end.z, 0.34) - spec.leanZ * 0.14,
    ),
    new THREE.Vector3(
      THREE.MathUtils.lerp(root.x, end.x, 0.72) + spec.leanX * 0.08,
      spec.stemHeight * 0.73,
      THREE.MathUtils.lerp(root.z, end.z, 0.72) + spec.leanZ * 0.08,
    ),
    end,
  ])
}

function getSpikeCenter(spec: LavenderSpikeSpec, progress: number) {
  const base = createLavenderStemCurve(spec).getPointAt(1)
  const sideSway = Math.sin(progress * Math.PI) * 0.008
  return new THREE.Vector3(
    base.x + spec.leanX * progress * 0.35 + sideSway * Math.cos(spec.phase),
    base.y + spec.bloomLength * progress,
    base.z + spec.leanZ * progress * 0.35 + sideSway * Math.sin(spec.phase),
  )
}

function createLavenderSpikeGeometry(spec: LavenderSpikeSpec) {
  const lengthSegments = 16
  const ringSegments = 9
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deep = new THREE.Color(BLOOM_DEEP)
  const shadow = new THREE.Color(BLOOM_SHADOW)
  const mid = new THREE.Color(BLOOM_MID)
  const light = new THREE.Color(BLOOM_LIGHT)
  const glow = new THREE.Color(BLOOM_GLOW)
  const calyx = new THREE.Color(CALYX_GREEN)

  for (let index = 0; index <= lengthSegments; index += 1) {
    const t = index / lengthSegments
    const center = getSpikeCenter(spec, t)
    const previous = getSpikeCenter(spec, Math.max(0, t - 1 / lengthSegments))
    const next = getSpikeCenter(spec, Math.min(1, t + 1 / lengthSegments))
    const tangent = next.sub(previous).normalize()
    const side = new THREE.Vector3(1, 0, 0)
      .addScaledVector(tangent, -tangent.x)
      .normalize()
    const normal = tangent.clone().cross(side).normalize()
    const rootOpen = THREE.MathUtils.smoothstep(t, 0, 0.11)
    const tipClose = 1 - THREE.MathUtils.smoothstep(t, 0.78, 1)
    const belly = 0.82 + Math.sin(t * Math.PI) * 0.22
    const whorl = 0.9 + Math.pow(Math.abs(Math.sin(t * Math.PI * 5.5 + spec.phase * 0.43)), 1.8) * 0.14
    const radius = spec.bloomWidth
      * THREE.MathUtils.lerp(0.45, 1, rootOpen)
      * THREE.MathUtils.lerp(0.18, 1, tipClose)
      * belly
      * whorl

    for (let ringIndex = 0; ringIndex < ringSegments; ringIndex += 1) {
      const angle = (ringIndex / ringSegments) * Math.PI * 2 + spec.phase * 0.31
      const sideFactor = Math.cos(angle)
      const depthFactor = Math.sin(angle)
      const petalPuff = 1 + 0.1 * Math.cos(angle * 3 + t * Math.PI * 8 + spec.phase)
      const point = center
        .clone()
        .addScaledVector(side, sideFactor * radius * petalPuff)
        .addScaledVector(normal, depthFactor * radius * 0.82 * petalPuff)
      positions.push(point.x, point.y, point.z)

      const baseTone = spec.tint === 'deep' ? deep : spec.tint === 'light' ? light : mid
      const color = baseTone.clone()
      if (depthFactor < -0.15) color.lerp(shadow, 0.62)
      if (Math.abs(sideFactor) > 0.68) color.lerp(deep, 0.32)
      if (depthFactor > 0.3) color.lerp(light, 0.34)
      if (t > 0.78) color.lerp(glow, THREE.MathUtils.smoothstep(t, 0.78, 1) * 0.55)
      if (t < 0.08) color.lerp(calyx, 0.66)
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
  const base = getSpikeCenter(spec, 0)
  positions.push(base.x, base.y, base.z)
  colors.push(deep.r, deep.g, deep.b)
  const tipCenterIndex = positions.length / 3
  const tip = getSpikeCenter(spec, 1)
  positions.push(tip.x, tip.y, tip.z)
  colors.push(glow.r, glow.g, glow.b)

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

function LavenderSpike({ spec, activity }: { spec: LavenderSpikeSpec; activity: number }) {
  const spike = useRef<THREE.Group>(null)
  const stemCurve = useMemo(() => createLavenderStemCurve(spec), [spec])
  const geometry = useMemo(() => createLavenderSpikeGeometry(spec), [spec])
  const accents = [0.16, 0.32, 0.49, 0.66, 0.82].map((progress, index) => {
    const center = getSpikeCenter(spec, progress)
    const angle = spec.phase * 0.72 + index * 2.32
    const radius = spec.bloomWidth * (0.52 + (index % 2) * 0.08)
    return {
      id: `${spec.id}-bud-${index}`,
      position: [
        center.x + Math.cos(angle) * radius,
        center.y + (index % 2 === 0 ? 0.004 : -0.003),
        center.z + Math.sin(angle) * radius * 0.72,
      ] as [number, number, number],
      scale: 0.014 + (index % 3) * 0.002,
      color: index === 2 || index === 4 ? BLOOM_GLOW : BLOOM_LIGHT,
    }
  })

  useFrame(({ clock }) => {
    if (!spike.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    spike.current.rotation.z = Math.sin(t * 0.58 + spec.phase * 0.72) * 0.0045 * motion
    spike.current.rotation.x = Math.sin(t * 0.46 + spec.phase * 0.51) * 0.0028 * motion
  })

  return (
    <group ref={spike}>
      <OutlineMesh
        outlineWidth={0.003}
        outlineColor={STEM_DEEP}
        geometry={<tubeGeometry args={[stemCurve, 18, 0.011, 6, false]} />}
        material={foliageToon(spec.tint === 'light' ? STEM_LIGHT : STEM_MID)}
      />
      <OutlineMesh
        outlineWidth={0.004}
        outlineColor={BLOOM_DEEP}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<meshToonMaterial vertexColors gradientMap={getLavenderBloomRamp()} />}
      />
      {accents.map((accent) => (
        <LavenderOutlinedMesh
          key={accent.id}
          position={accent.position}
          scale={[accent.scale, accent.scale * 1.32, accent.scale]}
          outlineWidth={0.0018}
          outlineColor={BLOOM_DEEP}
          geometry={<sphereGeometry args={[1, 7, 5]} />}
          material={bloomToon(accent.color)}
        />
      ))}
    </group>
  )
}

type LavenderLeafSpraySpec = {
  id: string
  yaw: number
  reach: number
  rise: number
  tipHeight: number
  width: number
  thickness: number
  phase: number
}

const LAVENDER_LEAF_SPRAYS: LavenderLeafSpraySpec[] = Array.from(
  { length: 15 },
  (_, index) => ({
    id: `leaf-spray-${index}`,
    yaw: (index / 15) * Math.PI * 2 + (index % 3) * 0.08,
    reach: 0.25 + (index % 4) * 0.028,
    rise: 0.22 + (index % 3) * 0.025,
    tipHeight: 0.055 + (index % 5) * 0.012,
    width: 0.064 + (index % 2) * 0.009,
    thickness: 0.024 + (index % 3) * 0.002,
    phase: index,
  }),
)

function LavenderLeafSpray({ spec }: { spec: LavenderLeafSpraySpec }) {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.08, 0),
      new THREE.Vector3(spec.reach * 0.18, spec.rise * 0.7, 0.006),
      new THREE.Vector3(spec.reach * 0.62, spec.rise, -0.004),
      new THREE.Vector3(spec.reach, spec.tipHeight, 0),
    ]),
    [spec],
  )
  const leafPairs = [0.3, 0.5, 0.68, 0.84]

  return (
    <group rotation={[0, spec.yaw, 0]}>
      <OutlineMesh
        outlineWidth={0.0025}
        outlineColor={STEM_DEEP}
        geometry={<tubeGeometry args={[curve, 14, 0.008, 6, false]} />}
        material={foliageToon(STEM_MID)}
      />
      {leafPairs.flatMap((progress, pairIndex) => {
        const point = curve.getPointAt(progress)
        const size = (0.061 - pairIndex * 0.004) * (0.94 + (spec.phase % 3) * 0.03)
        const lift = pairIndex % 2 === 0 ? 0.008 : -0.006
        const color = pairIndex % 3 === 0
          ? FOLIAGE_LIGHT
          : pairIndex % 3 === 1
            ? FOLIAGE_MID
            : FOLIAGE_GLOSS
        return [
          <LavenderOutlinedMesh
            key={`${spec.id}-leaf-${pairIndex}-left`}
            position={[
              point.x - size * 0.5,
              point.y + size * 0.28 + lift,
              point.z,
            ]}
            rotation={[0.12, -0.12, 0.98]}
            scale={[size * 0.34, size, size * 0.26]}
            outlineWidth={0.002}
            outlineColor={FOLIAGE_DEEP}
            geometry={<capsuleGeometry args={[1, 0.7, 4, 8]} />}
            material={foliageToon(color)}
          />,
          <LavenderOutlinedMesh
            key={`${spec.id}-leaf-${pairIndex}-right`}
            position={[
              point.x + size * 0.5,
              point.y + size * 0.27 - lift * 0.6,
              point.z,
            ]}
            rotation={[-0.1, 0.14, -0.98]}
            scale={[size * 0.33, size * 0.96, size * 0.25]}
            outlineWidth={0.002}
            outlineColor={FOLIAGE_DEEP}
            geometry={<capsuleGeometry args={[1, 0.7, 4, 8]} />}
            material={foliageToon(color)}
          />,
        ]
      })}
    </group>
  )
}

function LavenderFoliageCushion() {
  const cushions: Array<{
    position: [number, number, number]
    scale: [number, number, number]
    color: string
  }> = [
    { position: [0, 0.13, 0], scale: [0.25, 0.13, 0.22], color: FOLIAGE_SHADOW },
    { position: [-0.19, 0.14, -0.02], scale: [0.16, 0.105, 0.15], color: FOLIAGE_MID },
    { position: [0.19, 0.15, 0], scale: [0.16, 0.105, 0.15], color: FOLIAGE_LIGHT },
    { position: [-0.07, 0.22, 0.06], scale: [0.17, 0.1, 0.14], color: FOLIAGE_LIGHT },
    { position: [0.08, 0.21, -0.07], scale: [0.18, 0.1, 0.15], color: FOLIAGE_MID },
    { position: [0, 0.11, 0.16], scale: [0.19, 0.09, 0.12], color: FOLIAGE_DEEP },
  ]

  return (
    <group>
      {cushions.map((cushion, index) => (
        <LavenderOutlinedMesh
          key={`lavender-foliage-cushion-${index}`}
          position={cushion.position}
          rotation={[0.08 * (index % 2 === 0 ? 1 : -1), index * 0.46, 0.04 * (index - 2)]}
          scale={cushion.scale}
          outlineWidth={0.003}
          outlineColor={FOLIAGE_DEEP}
          geometry={<sphereGeometry args={[1, 11, 6]} />}
          material={foliageToon(cushion.color)}
        />
      ))}
    </group>
  )
}

function LavenderWoodyCrown() {
  const branchCurves = useMemo(
    () => [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.13, 0),
        new THREE.Vector3(-0.07, 0.02, -0.01),
        new THREE.Vector3(-0.16, 0.17, -0.04),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.02, -0.13, 0.01),
        new THREE.Vector3(0.08, 0.03, 0.02),
        new THREE.Vector3(0.17, 0.16, 0.04),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.01, -0.13, 0),
        new THREE.Vector3(0, 0.05, 0.02),
        new THREE.Vector3(0.02, 0.22, 0.02),
      ]),
    ],
    [],
  )

  return (
    <group>
      {branchCurves.map((curve, index) => (
        <OutlineMesh
          key={`lavender-woody-branch-${index}`}
          outlineWidth={0.003}
          outlineColor={WOOD_DEEP}
          geometry={<tubeGeometry args={[curve, 12, index === 2 ? 0.019 : 0.016, 6, false]} />}
          material={foliageToon(index === 1 ? WOOD_MID : WOOD_DEEP)}
        />
      ))}
    </group>
  )
}

function LavenderSoilAnchor() {
  return (
    <group>
      <mesh position={[0, -0.05, 0]} scale={[0.22, 0.035, 0.15]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={SOIL_DEEP} />
      </mesh>
      <mesh position={[-0.09, -0.025, -0.005]} rotation-z={-0.16} scale={[0.11, 0.018, 0.065]}>
        <sphereGeometry args={[1, 9, 5]} />
        <meshBasicMaterial color={SOIL_MID} />
      </mesh>
      <mesh position={[0.1, -0.024, 0.01]} rotation-z={0.18} scale={[0.1, 0.018, 0.06]}>
        <sphereGeometry args={[1, 9, 5]} />
        <meshBasicMaterial color={SOIL_LIGHT} />
      </mesh>
    </group>
  )
}

export function LavenderPlant({ activity = 1 }: { activity?: number }) {
  const plant = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!plant.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const sway = Math.sin(t * 0.48 + 0.3) * 0.005 * motion
    const breathe = Math.sin(t * 0.72 + 0.8) * 0.0016 * motion
    plant.current.rotation.z = -0.004 + sway
    plant.current.rotation.x = Math.sin(t * 0.41 + 0.2) * 0.002 * motion
    plant.current.scale.set(
      LAVENDER_SPREAD * (1 + breathe),
      LAVENDER_HEIGHT * (1 - breathe * 0.12),
      LAVENDER_SPREAD * (1 + breathe),
    )
  })

  return (
    <group ref={plant} scale={[LAVENDER_SPREAD, LAVENDER_HEIGHT, LAVENDER_SPREAD]}>
      <LavenderSoilAnchor />
      <LavenderWoodyCrown />
      <LavenderFoliageCushion />
      {LAVENDER_LEAF_SPRAYS.map((spec) => (
        <LavenderLeafSpray key={spec.id} spec={spec} />
      ))}
      {LAVENDER_SPIKES.map((spec) => (
        <LavenderSpike key={spec.id} spec={spec} activity={activity} />
      ))}
    </group>
  )
}
