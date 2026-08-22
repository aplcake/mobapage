import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const INK = '#1b1b1b'
const BARK_DEEP = '#4b2a22'
const BARK_SHADOW = '#6a3a29'
const BARK_MID = '#8f5035'
const BARK_WARM = '#bd7049'
const BARK_LIGHT = '#d99863'
const FROND_DEEP = '#173e2b'
const FROND_SHADOW = '#255b35'
const FROND_MID = '#3f7b3d'
const FROND_LIGHT = '#6ca34c'
const FROND_GLOW = '#9bc45e'

let palmRamp: THREE.DataTexture | null = null

function getPalmRamp() {
  if (palmRamp) return palmRamp

  const colors = new Uint8Array([
    44, 55, 38, 255,
    112, 131, 76, 255,
    224, 218, 158, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  palmRamp = texture
  return texture
}

function toon(color: string, vertexColors = false) {
  return <meshToonMaterial color={color} vertexColors={vertexColors} gradientMap={getPalmRamp()} />
}

function PalmOutlinedMesh({
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

function createCurvedPalmTrunkGeometry() {
  const radialSegments = 10
  const lengthSegments = 20
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.035, -0.2, 0.005),
    new THREE.Vector3(-0.005, -0.02, -0.006),
    new THREE.Vector3(-0.035, 0.18, 0.012),
    new THREE.Vector3(0.025, 0.39, -0.005),
    new THREE.Vector3(0.008, 0.62, 0.014),
    new THREE.Vector3(0.055, 0.82, 0),
  ])
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deep = new THREE.Color(BARK_DEEP)
  const shadow = new THREE.Color(BARK_SHADOW)
  const mid = new THREE.Color(BARK_MID)
  const warm = new THREE.Color(BARK_WARM)
  const light = new THREE.Color(BARK_LIGHT)
  let previousSide = new THREE.Vector3(1, 0, 0)

  for (let segment = 0; segment <= lengthSegments; segment += 1) {
    const t = segment / lengthSegments
    const point = path.getPointAt(t)
    const tangent = path.getTangentAt(t).normalize()
    const preferred = Math.abs(tangent.y) > 0.88
      ? new THREE.Vector3(0, 0, 1)
      : new THREE.Vector3(0, 1, 0)
    const side = preferred.clone().cross(tangent).normalize()
    if (side.dot(previousSide) < 0) side.multiplyScalar(-1)
    previousSide = side.clone()
    const up = tangent.clone().cross(side).normalize()
    const taper = THREE.MathUtils.lerp(0.13, 0.062, THREE.MathUtils.smoothstep(t, 0.02, 1))
    const rootFlare = 1 + (1 - THREE.MathUtils.smoothstep(t, 0, 0.18)) * 0.22
    const integratedBand = 1 + Math.pow(Math.max(0, Math.cos(t * Math.PI * 14)), 5) * 0.038
    const radius = taper * rootFlare * integratedBand
    const barkBand = Math.min(6, Math.floor(t * 7))

    for (let ring = 0; ring < radialSegments; ring += 1) {
      const angle = (ring / radialSegments) * Math.PI * 2
      const irregularity = 1 + Math.sin(angle * 3 + t * 8.4) * 0.035
      const radial = side.clone().multiplyScalar(Math.cos(angle))
        .add(up.clone().multiplyScalar(Math.sin(angle)))
      const vertex = point.clone().add(radial.multiplyScalar(radius * irregularity))
      positions.push(vertex.x, vertex.y, vertex.z)

      const color = barkBand % 2 === 0 ? mid.clone() : warm.clone()
      const lightBand = Math.cos(angle + 0.45)
      if (lightBand < -0.1) color.lerp(deep, 0.48)
      if (lightBand > 0.42) color.lerp(light, 0.3)
      if ((ring + barkBand) % 4 === 0) color.lerp(shadow, 0.25)
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let segment = 0; segment < lengthSegments; segment += 1) {
    for (let ring = 0; ring < radialSegments; ring += 1) {
      const nextRing = (ring + 1) % radialSegments
      const a = segment * radialSegments + ring
      const b = segment * radialSegments + nextRing
      const c = (segment + 1) * radialSegments + nextRing
      const d = (segment + 1) * radialSegments + ring
      indices.push(a, b, d, b, c, d)
    }
  }

  const basePoint = path.getPointAt(0)
  const tipPoint = path.getPointAt(1)
  const baseCenter = positions.length / 3
  positions.push(basePoint.x, basePoint.y, basePoint.z)
  colors.push(deep.r, deep.g, deep.b)
  const tipCenter = positions.length / 3
  positions.push(tipPoint.x, tipPoint.y, tipPoint.z)
  colors.push(shadow.r, shadow.g, shadow.b)

  for (let ring = 0; ring < radialSegments; ring += 1) {
    const nextRing = (ring + 1) % radialSegments
    indices.push(baseCenter, nextRing, ring)
    const finalRing = lengthSegments * radialSegments
    indices.push(tipCenter, finalRing + ring, finalRing + nextRing)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

type PalmFrondGeometryOptions = {
  length: number
  width: number
  thickness: number
  lift: number
  droop: number
  sweep: number
  variation: number
}

function createPalmFrondGeometry({
  length,
  width,
  thickness,
  lift,
  droop,
  sweep,
  variation,
}: PalmFrondGeometryOptions) {
  const lengthSegments = 16
  const ringSegments = 8
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deep = new THREE.Color(FROND_DEEP)
  const shadow = new THREE.Color(FROND_SHADOW)
  const mid = new THREE.Color(FROND_MID)
  const light = new THREE.Color(FROND_LIGHT)
  const glow = new THREE.Color(FROND_GLOW)

  for (let segment = 0; segment <= lengthSegments; segment += 1) {
    const t = segment / lengthSegments
    const body = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.66)
    const rootOpen = THREE.MathUtils.smoothstep(t, 0, 0.14)
    const tipClose = 1 - THREE.MathUtils.smoothstep(t, 0.72, 1)
    const lobe = 1 + Math.sin(t * Math.PI * 7 + variation) * 0.075 * body
    const halfWidth = width * 1.14
      * (0.16 + body * 0.84)
      * THREE.MathUtils.lerp(0.72, 1, rootOpen)
      * THREE.MathUtils.lerp(0.08, 1, tipClose)
      * lobe
    const halfThickness = thickness * 1.25
      * (0.56 + body * 0.44)
      * THREE.MathUtils.lerp(0.18, 1, tipClose)
    const center = new THREE.Vector3(
      t * length,
      Math.sin(t * Math.PI) * lift - Math.pow(t, 1.72) * droop,
      Math.sin(t * Math.PI) * sweep,
    )

    for (let ring = 0; ring < ringSegments; ring += 1) {
      const angle = (ring / ringSegments) * Math.PI * 2
      const side = Math.cos(angle)
      const depth = Math.sin(angle)
      const foldedRidge = (1 - Math.abs(side)) * body * thickness * 0.24
      positions.push(
        center.x,
        center.y + depth * halfThickness + foldedRidge,
        center.z + side * halfWidth,
      )

      const color = mid.clone()
      if (depth < -0.05) color.lerp(deep, 0.55)
      if (Math.abs(side) > 0.62) color.lerp(shadow, 0.34)
      if (depth > 0.25) color.lerp(light, 0.38)
      if (Math.abs(side) < 0.18 && depth > 0.1) color.lerp(glow, 0.44)
      if (t > 0.72) color.lerp(light, THREE.MathUtils.smoothstep(t, 0.72, 1) * 0.22)
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let segment = 0; segment < lengthSegments; segment += 1) {
    for (let ring = 0; ring < ringSegments; ring += 1) {
      const nextRing = (ring + 1) % ringSegments
      const a = segment * ringSegments + ring
      const b = segment * ringSegments + nextRing
      const c = (segment + 1) * ringSegments + nextRing
      const d = (segment + 1) * ringSegments + ring
      indices.push(a, d, b, b, d, c)
    }
  }

  const baseCenter = positions.length / 3
  positions.push(0, 0, 0)
  colors.push(deep.r, deep.g, deep.b)
  const tipCenter = positions.length / 3
  positions.push(length, -droop, 0)
  colors.push(light.r, light.g, light.b)

  for (let ring = 0; ring < ringSegments; ring += 1) {
    const nextRing = (ring + 1) % ringSegments
    indices.push(baseCenter, ring, nextRing)
    const finalRing = lengthSegments * ringSegments
    indices.push(tipCenter, finalRing + nextRing, finalRing + ring)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

type FrondSpec = PalmFrondGeometryOptions & {
  id: string
  azimuth: number
  tilt: number
  roll: number
  phase: number
}

const FRONDS: FrondSpec[] = [
  { id: 'front-low', azimuth: -1.5, tilt: -0.03, roll: 0.03, length: 0.61, width: 0.12, thickness: 0.035, lift: 0.16, droop: 0.31, sweep: 0.022, variation: 0.2, phase: 0.2 },
  { id: 'front-right', azimuth: -0.78, tilt: 0.06, roll: -0.04, length: 0.55, width: 0.115, thickness: 0.034, lift: 0.18, droop: 0.25, sweep: -0.025, variation: 0.9, phase: 1.1 },
  { id: 'right-high', azimuth: -0.04, tilt: 0.13, roll: 0.025, length: 0.52, width: 0.108, thickness: 0.033, lift: 0.2, droop: 0.2, sweep: 0.018, variation: 1.7, phase: 2.2 },
  { id: 'rear-right', azimuth: 0.78, tilt: 0.04, roll: -0.03, length: 0.58, width: 0.118, thickness: 0.036, lift: 0.17, droop: 0.27, sweep: 0.03, variation: 2.4, phase: 3.4 },
  { id: 'rear-low', azimuth: 1.58, tilt: -0.05, roll: 0.04, length: 0.6, width: 0.12, thickness: 0.036, lift: 0.15, droop: 0.32, sweep: -0.02, variation: 3.2, phase: 4.5 },
  { id: 'rear-left', azimuth: 2.38, tilt: 0.08, roll: -0.025, length: 0.54, width: 0.112, thickness: 0.034, lift: 0.19, droop: 0.23, sweep: 0.024, variation: 4.1, phase: 5.3 },
  { id: 'left-high', azimuth: 3.13, tilt: 0.15, roll: 0.03, length: 0.5, width: 0.106, thickness: 0.032, lift: 0.21, droop: 0.18, sweep: -0.018, variation: 5, phase: 6.2 },
  { id: 'front-left', azimuth: 3.92, tilt: 0.03, roll: -0.035, length: 0.57, width: 0.116, thickness: 0.035, lift: 0.17, droop: 0.28, sweep: 0.027, variation: 5.8, phase: 7.1 },
]

const HEART_FRONDS: FrondSpec[] = [
  { id: 'heart-left', azimuth: -0.5, tilt: 0.42, roll: 0.02, length: 0.29, width: 0.078, thickness: 0.028, lift: 0.17, droop: 0.055, sweep: 0.01, variation: 1.3, phase: 1.8 },
  { id: 'heart-right', azimuth: 2.4, tilt: 0.48, roll: -0.02, length: 0.27, width: 0.074, thickness: 0.026, lift: 0.16, droop: 0.05, sweep: -0.012, variation: 3.7, phase: 4.1 },
]

export function PalmTreePlant({ activity = 1 }: { activity?: number }) {
  const plant = useRef<THREE.Group>(null)
  const frondRefs = useRef<Array<THREE.Group | null>>([])
  const trunkGeometry = useMemo(() => createCurvedPalmTrunkGeometry(), [])
  const fronds = useMemo(
    () => FRONDS.map((spec) => ({ spec, geometry: createPalmFrondGeometry(spec) })),
    [],
  )
  const heartFronds = useMemo(
    () => HEART_FRONDS.map((spec) => ({ spec, geometry: createPalmFrondGeometry(spec) })),
    [],
  )

  useFrame(({ clock }) => {
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    if (plant.current) {
      plant.current.rotation.z = -0.012 + Math.sin(t * 0.42 + 0.5) * 0.005 * motion
      plant.current.rotation.x = Math.sin(t * 0.35 + 1.1) * 0.003 * motion
    }
    frondRefs.current.forEach((frond, index) => {
      if (!frond) return
      const spec = index < FRONDS.length ? FRONDS[index] : HEART_FRONDS[index - FRONDS.length]
      frond.rotation.z = spec.tilt + Math.sin(t * 0.62 + spec.phase) * 0.009 * motion
      frond.rotation.x = spec.roll + Math.sin(t * 0.48 + spec.phase * 0.7) * 0.004 * motion
    })
  })

  return (
    <group ref={plant}>
      <PalmOutlinedMesh
        geometry={<primitive object={trunkGeometry} attach="geometry" />}
        material={toon('#ffffff', true)}
        outlineWidth={0.008}
      />

      <group position={[0.055, 0.82, 0]}>
        <PalmOutlinedMesh
          position={[-0.012, 0.005, 0]}
          scale={[0.13, 0.105, 0.13]}
          outlineWidth={0.006}
          outlineColor={FROND_DEEP}
          geometry={<sphereGeometry args={[1, 12, 7]} />}
          material={toon(FROND_SHADOW)}
        />
        <PalmOutlinedMesh
          position={[0.012, 0.04, -0.005]}
          scale={[0.085, 0.1, 0.085]}
          outlineWidth={0.004}
          outlineColor={FROND_DEEP}
          geometry={<sphereGeometry args={[1, 10, 6]} />}
          material={toon(FROND_MID)}
        />

        {fronds.map(({ spec, geometry }, index) => (
          <group
            key={spec.id}
            ref={(node) => {
              frondRefs.current[index] = node
            }}
            rotation={[spec.roll, spec.azimuth, spec.tilt]}
          >
            <PalmOutlinedMesh
              geometry={<primitive object={geometry} attach="geometry" />}
              material={toon('#ffffff', true)}
              outlineWidth={0.0055}
              outlineColor={FROND_DEEP}
            />
          </group>
        ))}

        {heartFronds.map(({ spec, geometry }, index) => (
          <group
            key={spec.id}
            ref={(node) => {
              frondRefs.current[FRONDS.length + index] = node
            }}
            rotation={[spec.roll, spec.azimuth, spec.tilt]}
          >
            <PalmOutlinedMesh
              geometry={<primitive object={geometry} attach="geometry" />}
              material={toon('#ffffff', true)}
              outlineWidth={0.0045}
              outlineColor={FROND_DEEP}
            />
          </group>
        ))}
      </group>
    </group>
  )
}
