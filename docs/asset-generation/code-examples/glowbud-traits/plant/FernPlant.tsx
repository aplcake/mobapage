import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const INK = '#182018'
const FERN_DEEP = '#174433'
const FERN_SHADOW = '#245b3d'
const FERN_MID = '#3c8050'
const FERN_LIGHT = '#70ad62'
const FERN_TIP = '#a2cc72'
const RACHIS_DARK = '#315b31'
const RACHIS_LIGHT = '#8fbc58'
const FIDDLEHEAD_PLUM = '#6f328f'
const FIDDLEHEAD_LIGHT = '#a84fc0'
const SOIL_DEEP = '#2c1b18'
const SOIL_MID = '#533326'
const SOIL_LIGHT = '#75513a'
const FERN_SPREAD = 1.4
const FERN_HEIGHT = 1.34

let fernToonRamp: THREE.DataTexture | null = null

function getFernToonRamp() {
  if (fernToonRamp) return fernToonRamp

  const colors = new Uint8Array([
    23, 57, 39, 255,
    61, 126, 78, 255,
    143, 188, 100, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  fernToonRamp = texture
  return texture
}

function toon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getFernToonRamp()} />
}

function FernOutlinedMesh({
  geometry,
  material,
  position = [0, 0, 0],
  rotation,
  scale = [1, 1, 1],
  outlineWidth = 0.007,
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

type FernFrondSpec = {
  id: string
  yaw: number
  reach: number
  rise: number
  tipHeight: number
  lean: number
  width: number
  thickness: number
  lobes: number
  phase: number
  tint: 'deep' | 'mid' | 'light'
}

const FERN_FRONDS: FernFrondSpec[] = [
  { id: 'rear-tall', yaw: 2.9, reach: 0.42, rise: 0.72, tipHeight: 0.6, lean: -0.035, width: 0.145, thickness: 0.034, lobes: 7, phase: 0, tint: 'deep' },
  { id: 'rear-right', yaw: 2.18, reach: 0.58, rise: 0.61, tipHeight: 0.3, lean: 0.05, width: 0.16, thickness: 0.037, lobes: 7, phase: 1, tint: 'mid' },
  { id: 'right-crown', yaw: 1.4, reach: 0.69, rise: 0.52, tipHeight: 0.13, lean: -0.035, width: 0.17, thickness: 0.04, lobes: 8, phase: 2, tint: 'light' },
  { id: 'right-front', yaw: 0.66, reach: 0.64, rise: 0.43, tipHeight: 0.08, lean: 0.045, width: 0.158, thickness: 0.038, lobes: 7, phase: 3, tint: 'mid' },
  { id: 'front-low', yaw: 0.02, reach: 0.54, rise: 0.36, tipHeight: 0.05, lean: -0.025, width: 0.148, thickness: 0.035, lobes: 6, phase: 4, tint: 'light' },
  { id: 'front-left', yaw: -0.7, reach: 0.65, rise: 0.44, tipHeight: 0.09, lean: 0.04, width: 0.16, thickness: 0.038, lobes: 7, phase: 5, tint: 'mid' },
  { id: 'left-crown', yaw: -1.48, reach: 0.7, rise: 0.54, tipHeight: 0.14, lean: -0.045, width: 0.174, thickness: 0.04, lobes: 8, phase: 6, tint: 'light' },
  { id: 'left-rear', yaw: -2.22, reach: 0.59, rise: 0.62, tipHeight: 0.31, lean: 0.035, width: 0.16, thickness: 0.037, lobes: 7, phase: 7, tint: 'deep' },
  { id: 'center-plume', yaw: 2.48, reach: 0.31, rise: 0.78, tipHeight: 0.7, lean: 0.012, width: 0.128, thickness: 0.032, lobes: 6, phase: 8, tint: 'light' },
]

function createFrondCurve(spec: FernFrondSpec) {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.035, 0),
    new THREE.Vector3(spec.reach * 0.18, spec.rise * 0.5, spec.lean * 0.22),
    new THREE.Vector3(spec.reach * 0.58, spec.rise, spec.lean),
    new THREE.Vector3(spec.reach, spec.tipHeight, spec.lean * 0.45),
  ])
}

function createCompoundFernFrondGeometry(spec: FernFrondSpec) {
  const lengthSegments = 30
  const ringSegments = 8
  const curve = createFrondCurve(spec)
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deep = new THREE.Color(FERN_DEEP)
  const shadow = new THREE.Color(FERN_SHADOW)
  const mid = new THREE.Color(FERN_MID)
  const light = new THREE.Color(FERN_LIGHT)
  const tip = new THREE.Color(FERN_TIP)
  const rachisLight = new THREE.Color(RACHIS_LIGHT)
  const baseTone = spec.tint === 'deep' ? deep : spec.tint === 'light' ? light : mid
  const sideAxis = new THREE.Vector3(0, 0, 1)

  for (let index = 0; index <= lengthSegments; index += 1) {
    const t = index / lengthSegments
    const center = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t)
    const normal = sideAxis.clone().cross(tangent).normalize()
    if (normal.y < 0) normal.multiplyScalar(-1)

    const rootOpen = THREE.MathUtils.smoothstep(t, 0, 0.2)
    const tipClose = 1 - THREE.MathUtils.smoothstep(t, 0.73, 1)
    const body = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.64)
    const pinnaRhythm = 0.54
      + Math.pow(Math.abs(Math.cos(t * Math.PI * spec.lobes)), 1.7) * 0.46
    const profile = THREE.MathUtils.lerp(0.18, 1, rootOpen)
      * THREE.MathUtils.lerp(0.08, 1, tipClose)
      * (0.32 + body * 0.76)
      * pinnaRhythm
    const width = spec.width * profile
    const thickness = spec.thickness
      * THREE.MathUtils.lerp(0.72, 1.08, body)
      * THREE.MathUtils.lerp(0.22, 1, tipClose)

    for (let ringIndex = 0; ringIndex < ringSegments; ringIndex += 1) {
      const ringAngle = (ringIndex / ringSegments) * Math.PI * 2
      const sideFactor = Math.cos(ringAngle)
      const depthFactor = Math.sin(ringAngle)
      const foldedThickness = thickness * (1 + (1 - Math.abs(sideFactor)) * 0.2)
      const point = center
        .clone()
        .addScaledVector(sideAxis, sideFactor * width)
        .addScaledVector(normal, depthFactor * foldedThickness)
      positions.push(point.x, point.y, point.z)

      const color = baseTone.clone()
      if (depthFactor < -0.15) color.lerp(shadow, 0.58)
      if (Math.abs(sideFactor) > 0.72) color.lerp(deep, 0.34)
      if (Math.abs(sideFactor) < 0.2 && depthFactor > 0.1) color.lerp(rachisLight, 0.35)
      if (depthFactor > 0.35) color.lerp(light, 0.28)
      if (t > 0.74) color.lerp(tip, THREE.MathUtils.smoothstep(t, 0.74, 1) * 0.48)
      if (t < 0.1) color.lerp(deep, 0.7)
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
  const base = curve.getPointAt(0)
  positions.push(base.x, base.y, base.z)
  colors.push(deep.r, deep.g, deep.b)
  const tipCenterIndex = positions.length / 3
  const finalPoint = curve.getPointAt(1)
  positions.push(finalPoint.x, finalPoint.y, finalPoint.z)
  colors.push(tip.r, tip.g, tip.b)

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

function FernFrond({ spec, activity }: { spec: FernFrondSpec; activity: number }) {
  const frond = useRef<THREE.Group>(null)
  const curve = useMemo(() => createFrondCurve(spec), [spec])
  const geometry = useMemo(() => createCompoundFernFrondGeometry(spec), [spec])
  const rachisColor = spec.tint === 'light' ? RACHIS_LIGHT : RACHIS_DARK

  useFrame(({ clock }) => {
    if (!frond.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    frond.current.rotation.z = Math.sin(t * 0.58 + spec.phase * 0.83) * 0.006 * motion
    frond.current.rotation.x = Math.sin(t * 0.46 + spec.phase) * 0.003 * motion
  })

  return (
    <group ref={frond} rotation={[0, spec.yaw, 0]}>
      <OutlineMesh
        outlineWidth={0.0035}
        outlineColor={FERN_DEEP}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={(
          <meshToonMaterial
            vertexColors
            side={THREE.DoubleSide}
            gradientMap={getFernToonRamp()}
          />
        )}
      />
      <OutlineMesh
        outlineWidth={0.002}
        outlineColor={RACHIS_DARK}
        geometry={<tubeGeometry args={[curve, 24, 0.009, 6, false]} />}
        material={toon(rachisColor)}
      />
    </group>
  )
}

function FernFiddlehead({
  position,
  rotation,
  scale,
  color,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  color: string
}) {
  const curve = useMemo(() => {
    const points: THREE.Vector3[] = []
    for (let index = 0; index <= 24; index += 1) {
      const t = index / 24
      const angle = t * Math.PI * 2.2
      const radius = 0.055 * (1 - t * 0.62)
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        t * 0.23,
        Math.sin(angle) * radius,
      ))
    }
    return new THREE.CatmullRomCurve3(points)
  }, [])

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <OutlineMesh
        outlineWidth={0.005}
        outlineColor={INK}
        geometry={<tubeGeometry args={[curve, 28, 0.019, 7, false]} />}
        material={toon(color)}
      />
      <FernOutlinedMesh
        position={[0.014, 0.235, -0.004]}
        scale={[0.052, 0.052, 0.046]}
        outlineWidth={0.004}
        geometry={<sphereGeometry args={[1, 9, 6]} />}
        material={toon(FIDDLEHEAD_LIGHT)}
      />
    </group>
  )
}

function FernSoilCrown() {
  return (
    <group>
      <mesh position={[0, 0.015, 0]} scale={[0.2, 0.033, 0.14]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={SOIL_DEEP} />
      </mesh>
      <mesh position={[-0.105, 0.042, 0.01]} rotation-z={-0.2} scale={[0.11, 0.02, 0.065]}>
        <sphereGeometry args={[1, 9, 5]} />
        <meshBasicMaterial color={SOIL_MID} />
      </mesh>
      <mesh position={[0.11, 0.04, -0.008]} rotation-z={0.18} scale={[0.105, 0.018, 0.062]}>
        <sphereGeometry args={[1, 9, 5]} />
        <meshBasicMaterial color={SOIL_LIGHT} />
      </mesh>
      <FernOutlinedMesh
        position={[0, 0.05, 0]}
        scale={[0.13, 0.08, 0.105]}
        outlineWidth={0.006}
        geometry={<sphereGeometry args={[1, 11, 6]} />}
        material={toon(FERN_DEEP)}
      />
    </group>
  )
}

export function FernPlant({ activity = 1 }: { activity?: number }) {
  const plant = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!plant.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const sway = Math.sin(t * 0.63 + 0.35) * 0.008 * motion
    const breathe = Math.sin(t * 0.95 + 0.6) * 0.002 * motion
    plant.current.rotation.z = -0.008 + sway
    plant.current.scale.set(
      FERN_SPREAD * (1 + breathe),
      FERN_HEIGHT * (1 - breathe * 0.2),
      FERN_SPREAD * (1 + breathe),
    )
  })

  return (
    <group ref={plant} scale={[FERN_SPREAD, FERN_HEIGHT, FERN_SPREAD]}>
      <FernSoilCrown />
      {FERN_FRONDS.map((spec) => (
        <FernFrond key={spec.id} spec={spec} activity={activity} />
      ))}
      <FernFiddlehead
        position={[-0.05, 0.045, -0.02]}
        rotation={[0.05, -0.32, -0.12]}
        scale={0.86}
        color={FIDDLEHEAD_PLUM}
      />
      <FernFiddlehead
        position={[0.058, 0.04, 0.035]}
        rotation={[-0.04, 0.44, 0.1]}
        scale={0.72}
        color={FIDDLEHEAD_LIGHT}
      />
    </group>
  )
}
