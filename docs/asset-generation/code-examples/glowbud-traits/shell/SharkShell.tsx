import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'
import { createShellOpeningSealGeometry } from './ShellOpeningSeal'

export const SHARK_INK = '#172033'
export const SHARK_SKIN_DEEP = '#2b4d70'
export const SHARK_SKIN_SHADOW = '#4a7598'
export const SHARK_SKIN_BASE = '#72a6c6'
export const SHARK_SKIN_MID = '#91bdd2'
export const SHARK_SKIN_LIGHT = '#c1dbe4'
export const SHARK_BELLY = '#e6ece7'
export const SHARK_GUM = '#c77489'
export const SHARK_GUM_LIGHT = '#efadbd'
export const SHARK_TOOTH = '#fff8df'
export const SHARK_SHADOW = '#527b9a'

type SharkShellProps = {
  fitted?: boolean
  hasHeadAccessory?: boolean
  activity?: number
  animation?: 'idle' | 'hop' | 'grumble'
}

type Point3 = [number, number, number]

const UPPER_TEETH = [
  { x: -0.32, y: 0.205, rotation: 0.16, scale: 0.82 },
  { x: -0.105, y: 0.285, rotation: 0.045, scale: 0.92 },
  { x: 0.105, y: 0.285, rotation: -0.045, scale: 0.92 },
  { x: 0.32, y: 0.205, rotation: -0.16, scale: 0.82 },
]

const LOWER_TEETH = [
  { x: -0.235, y: -0.292, rotation: -0.1, scale: 0.8 },
  { x: 0, y: -0.342, rotation: 0, scale: 0.88 },
  { x: 0.235, y: -0.292, rotation: 0.1, scale: 0.8 },
]

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1)
}

function smoothstep01(value: number) {
  const clamped = clamp01(value)
  return clamped * clamped * (3 - 2 * clamped)
}

function triangleNoise(index: number, x: number, y: number, z: number) {
  const value = Math.sin(index * 12.9898 + x * 78.233 + y * 37.719 + z * 49.157) * 43758.5453
  return value - Math.floor(value)
}

function superellipsePoint(angle: number, xRadius: number, yRadius: number) {
  const cosAngle = Math.cos(angle)
  const sinAngle = Math.sin(angle)
  return new THREE.Vector2(
    Math.sign(cosAngle || 1) * Math.pow(Math.abs(cosAngle), 0.66) * xRadius,
    Math.sign(sinAngle || 1) * Math.pow(Math.abs(sinAngle), 0.7) * yRadius,
  )
}

function createSharkHullGeometry() {
  const indexed = new THREE.SphereGeometry(1, 44, 28)
  const position = indexed.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const angle = Math.atan2(z, x)
    const crown = smoothstep01((y - 0.02) / 0.93)
    const lower = smoothstep01((-y - 0.2) / 0.78)
    const rear = smoothstep01((z - 0.04) / 0.94)
    const cheek = Math.exp(-((y + 0.015) ** 2) / 0.19)
    const snout = z < 0 ? Math.exp(-((y - 0.24) ** 2) / 0.11) : 0
    const skinRoll = 1
      + Math.sin(angle * 3.0 + y * 4.2) * 0.006
      + Math.cos(angle * 7.0 - y * 3.7) * 0.003

    const nextX = x
      * 0.82
      * skinRoll
      * (1 + cheek * 0.07)
      * (1 - crown * 0.1)
      * (1 + lower * 0.025)
    let nextY = -0.035 + y * 0.72 + crown * 0.028
    const nextZ = -0.005
      + z
        * 0.68
        * skinRoll
        * (1 + rear * 0.095)
        * (1 + snout * 0.045)

    if (nextY < -0.53) {
      const settle = smoothstep01((-nextY - 0.53) / 0.16)
      nextY = THREE.MathUtils.lerp(nextY, -0.612 + Math.sin(angle * 4.0) * 0.004, settle * 0.84)
    }

    position.setXYZ(index, nextX, nextY, nextZ)
  }

  position.needsUpdate = true
  indexed.computeVertexNormals()
  const source = indexed.toNonIndexed()
  indexed.dispose()
  source.deleteAttribute('normal')
  source.computeVertexNormals()

  const sourcePosition = source.attributes.position as THREE.BufferAttribute
  const sourceNormal = source.attributes.normal as THREE.BufferAttribute
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []
  const deep = new THREE.Color(SHARK_SKIN_DEEP)
  const shadow = new THREE.Color(SHARK_SKIN_SHADOW)
  const base = new THREE.Color(SHARK_SKIN_BASE)
  const mid = new THREE.Color(SHARK_SKIN_MID)
  const light = new THREE.Color(SHARK_SKIN_LIGHT)
  const belly = new THREE.Color(SHARK_BELLY)
  const color = new THREE.Color()

  for (let index = 0; index < sourcePosition.count; index += 3) {
    const centerX = (sourcePosition.getX(index) + sourcePosition.getX(index + 1) + sourcePosition.getX(index + 2)) / 3
    const centerY = (sourcePosition.getY(index) + sourcePosition.getY(index + 1) + sourcePosition.getY(index + 2)) / 3
    const centerZ = (sourcePosition.getZ(index) + sourcePosition.getZ(index + 1) + sourcePosition.getZ(index + 2)) / 3
    const aperture = Math.pow(Math.abs(centerX / 0.49), 3.4)
      + Math.pow(Math.abs((centerY + 0.055) / 0.355), 3.4)

    if (centerZ < -0.475 && aperture < 1.045) continue

    const normalY = (sourceNormal.getY(index) + sourceNormal.getY(index + 1) + sourceNormal.getY(index + 2)) / 3
    const noise = triangleNoise(index / 3, centerX, centerY, centerZ)
    const underside = smoothstep01((-centerY - 0.12) / 0.5)
    const flank = smoothstep01((Math.abs(centerX) - 0.4) / 0.4)
    const rearShade = smoothstep01((centerZ - 0.18) / 0.58)

    color.copy(base)
    if (normalY > 0.44) color.lerp(light, 0.26)
    if (centerY > 0.3) color.lerp(mid, 0.2)
    if (flank > 0) color.lerp(shadow, flank * 0.2)
    if (rearShade > 0) color.lerp(deep, rearShade * 0.14)
    color.lerp(belly, underside * (0.52 + (centerZ < 0 ? 0.16 : 0)))
    if (noise > 0.84) color.lerp(light, 0.08)
    if (noise < 0.11) color.lerp(deep, 0.07)

    for (let vertex = 0; vertex < 3; vertex += 1) {
      positions.push(
        sourcePosition.getX(index + vertex),
        sourcePosition.getY(index + vertex),
        sourcePosition.getZ(index + vertex),
      )
      normals.push(
        sourceNormal.getX(index + vertex),
        sourceNormal.getY(index + vertex),
        sourceNormal.getZ(index + vertex),
      )
      colors.push(color.r, color.g, color.b)
    }
  }

  source.dispose()
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function pushTriangle(
  positions: number[],
  colors: number[],
  a: Point3,
  b: Point3,
  c: Point3,
  color: THREE.Color,
) {
  positions.push(...a, ...b, ...c)
  for (let index = 0; index < 3; index += 1) colors.push(color.r, color.g, color.b)
}

function createSharkJawGeometry() {
  const segments = 72
  const positions: number[] = []
  const colors: number[] = []
  const blue = new THREE.Color(SHARK_SKIN_MID)
  const blueShadow = new THREE.Color(SHARK_SKIN_SHADOW)
  const pale = new THREE.Color(SHARK_BELLY)
  const color = new THREE.Color()

  function ringPoint(angle: number, outer: boolean, front: boolean): Point3 {
    const sinAngle = Math.sin(angle)
    const upper = Math.max(0, sinAngle)
    const lower = Math.max(0, -sinAngle)
    const point = superellipsePoint(
      angle,
      outer ? 0.63 + upper * 0.012 : 0.485,
      outer ? 0.47 + upper * 0.018 + lower * 0.012 : 0.35,
    )
    return [
      point.x,
      -0.055 + point.y,
      front
        ? outer
          ? -0.68 - upper * 0.016
          : -0.795 - upper * 0.01
        : outer
          ? -0.46
          : -0.485,
    ]
  }

  for (let segment = 0; segment < segments; segment += 1) {
    const angleA = (segment / segments) * Math.PI * 2
    const angleB = ((segment + 1) / segments) * Math.PI * 2
    const midpoint = (angleA + angleB) * 0.5
    const sinMid = Math.sin(midpoint)
    const cosMid = Math.cos(midpoint)
    const outerFrontA = ringPoint(angleA, true, true)
    const outerFrontB = ringPoint(angleB, true, true)
    const innerFrontA = ringPoint(angleA, false, true)
    const innerFrontB = ringPoint(angleB, false, true)
    const outerBackA = ringPoint(angleA, true, false)
    const outerBackB = ringPoint(angleB, true, false)

    color.copy(sinMid < -0.08 ? pale : blue)
    if (Math.abs(cosMid) > 0.72) color.lerp(blueShadow, 0.24)
    if (sinMid > 0.55) color.lerp(new THREE.Color(SHARK_SKIN_LIGHT), 0.2)

    pushTriangle(positions, colors, outerFrontB, outerFrontA, innerFrontA, color)
    pushTriangle(positions, colors, innerFrontB, outerFrontB, innerFrontA, color)
    pushTriangle(positions, colors, outerBackA, outerFrontA, outerBackB, color)
    pushTriangle(positions, colors, outerFrontA, outerFrontB, outerBackB, color)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createMouthTunnelGeometry() {
  const segments = 72
  const positions: number[] = []

  for (let segment = 0; segment < segments; segment += 1) {
    const angleA = (segment / segments) * Math.PI * 2
    const angleB = ((segment + 1) / segments) * Math.PI * 2
    const pointA = superellipsePoint(angleA, 0.487, 0.352)
    const pointB = superellipsePoint(angleB, 0.487, 0.352)
    const frontA: Point3 = [pointA.x, pointA.y - 0.055, -0.8]
    const frontB: Point3 = [pointB.x, pointB.y - 0.055, -0.8]
    const backA: Point3 = [pointA.x * 1.02, pointA.y * 1.02 - 0.055, -0.45]
    const backB: Point3 = [pointB.x * 1.02, pointB.y * 1.02 - 0.055, -0.45]
    positions.push(...frontA, ...frontB, ...backA, ...frontB, ...backB, ...backA)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

function createDorsalFinGeometry() {
  const sides = 12
  const rings = [
    { y: 0, xRadius: 0.275, zRadius: 0.17, z: 0 },
    { y: 0.14, xRadius: 0.248, zRadius: 0.145, z: 0.002 },
    { y: 0.31, xRadius: 0.19, zRadius: 0.112, z: 0.018 },
    { y: 0.47, xRadius: 0.12, zRadius: 0.078, z: 0.045 },
    { y: 0.59, xRadius: 0.055, zRadius: 0.045, z: 0.078 },
    { y: 0.65, xRadius: 0.016, zRadius: 0.018, z: 0.105 },
  ]
  const vertices: number[] = []
  const indices: number[] = []

  rings.forEach((ring) => {
    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2
      vertices.push(
        Math.cos(angle) * ring.xRadius,
        ring.y,
        ring.z + Math.sin(angle) * ring.zRadius,
      )
    }
  })

  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let side = 0; side < sides; side += 1) {
      const nextSide = (side + 1) % sides
      const current = ring * sides + side
      const nextRing = (ring + 1) * sides + side
      indices.push(current, nextRing, ring * sides + nextSide)
      indices.push(ring * sides + nextSide, nextRing, (ring + 1) * sides + nextSide)
    }
  }

  const baseCenter = vertices.length / 3
  vertices.push(0, 0, 0)
  for (let side = 0; side < sides; side += 1) {
    indices.push(baseCenter, side, (side + 1) % sides)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createPectoralFinGeometry(side: -1 | 1) {
  const geometry = new THREE.SphereGeometry(1, 16, 10)
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const y = positions.getY(index)
    const z = positions.getZ(index)
    const lengthT = THREE.MathUtils.clamp((side * x + 1) * 0.5, 0, 1)
    const widthEase = 0.88 + Math.sin(lengthT * Math.PI) * 0.18

    positions.setXYZ(
      index,
      side * (-0.045 + lengthT * 0.565),
      -0.015 - lengthT * 0.17 + y * 0.145 * widthEase,
      z * 0.108 * widthEase,
    )
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createTailLobeGeometry(direction: -1 | 1) {
  const sides = 12
  const rings = [
    { y: 0, z: 0, xRadius: 0.12, zRadius: 0.1 },
    { y: 0.12, z: 0.025, xRadius: 0.18, zRadius: 0.13 },
    { y: 0.28, z: 0.018, xRadius: 0.205, zRadius: 0.115 },
    { y: 0.41, z: -0.018, xRadius: 0.145, zRadius: 0.082 },
    { y: 0.5, z: -0.06, xRadius: 0.028, zRadius: 0.026 },
  ]
  const vertices: number[] = []
  const indices: number[] = []

  rings.forEach((ring) => {
    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2
      vertices.push(
        Math.cos(angle) * ring.xRadius,
        direction * ring.y,
        ring.z + Math.sin(angle) * ring.zRadius,
      )
    }
  })

  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let side = 0; side < sides; side += 1) {
      const nextSide = (side + 1) % sides
      const current = ring * sides + side
      const nextRing = (ring + 1) * sides + side
      if (direction < 0) {
        indices.push(current, ring * sides + nextSide, nextRing)
        indices.push(ring * sides + nextSide, (ring + 1) * sides + nextSide, nextRing)
      } else {
        indices.push(current, nextRing, ring * sides + nextSide)
        indices.push(ring * sides + nextSide, nextRing, (ring + 1) * sides + nextSide)
      }
    }
  }

  const rootCenter = vertices.length / 3
  vertices.push(0, 0, 0)
  const tipCenter = vertices.length / 3
  const tip = rings.at(-1)!
  vertices.push(0, direction * tip.y, tip.z)
  const lastRing = (rings.length - 1) * sides

  for (let side = 0; side < sides; side += 1) {
    const nextSide = (side + 1) % sides
    if (direction < 0) {
      indices.push(rootCenter, side, nextSide)
      indices.push(tipCenter, lastRing + nextSide, lastRing + side)
    } else {
      indices.push(rootCenter, nextSide, side)
      indices.push(tipCenter, lastRing + side, lastRing + nextSide)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createRoundedToothGeometry() {
  const sides = 10
  const rings = [
    { y: -0.065, radius: 0.062 },
    { y: -0.018, radius: 0.064 },
    { y: 0.035, radius: 0.052 },
    { y: 0.078, radius: 0.035 },
    { y: 0.108, radius: 0.018 },
    { y: 0.122, radius: 0.007 },
  ]
  const vertices: number[] = []
  const indices: number[] = []

  rings.forEach((ring) => {
    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2
      vertices.push(Math.cos(angle) * ring.radius, ring.y, Math.sin(angle) * ring.radius * 0.78)
    }
  })

  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let side = 0; side < sides; side += 1) {
      const nextSide = (side + 1) % sides
      const current = ring * sides + side
      const nextRing = (ring + 1) * sides + side
      indices.push(current, nextRing, ring * sides + nextSide)
      indices.push(ring * sides + nextSide, nextRing, (ring + 1) * sides + nextSide)
    }
  }

  const rootCenter = vertices.length / 3
  vertices.push(0, rings[0].y, 0)
  for (let side = 0; side < sides; side += 1) {
    indices.push(rootCenter, (side + 1) % sides, side)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function applySharkSealColors(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(positions.count * 3)
  const base = new THREE.Color(SHARK_SKIN_BASE)
  const shadow = new THREE.Color(SHARK_SKIN_SHADOW)
  const light = new THREE.Color(SHARK_SKIN_LIGHT)
  const belly = new THREE.Color(SHARK_BELLY)
  const color = new THREE.Color()

  for (let index = 0; index < positions.count; index += 3) {
    const centerX = (positions.getX(index) + positions.getX(index + 1) + positions.getX(index + 2)) / 3
    const centerY = (positions.getY(index) + positions.getY(index + 1) + positions.getY(index + 2)) / 3

    color.copy(base)
    if (centerY > 0.255) color.lerp(light, 0.34)
    if (centerY < -0.12) color.lerp(belly, 0.72)
    if (Math.abs(centerX) > 0.48) color.lerp(shadow, 0.18)

    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = (index + vertex) * 3
      colors[offset] = color.r
      colors[offset + 1] = color.g
      colors[offset + 2] = color.b
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function CurveRail({ name, points, color }: { name: string; points: Point3[]; color: string }) {
  const geometry = useMemo(
    () => new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, 'centripetal'),
      28,
      0.035,
      8,
      false,
    ),
    [points],
  )

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <OutlineMesh
      name={name}
      outlineWidth={0.008}
      outlineColor={SHARK_INK}
      geometry={<primitive object={geometry} attach="geometry" />}
      material={<meshToonMaterial color={color} />}
    />
  )
}

function SharkEye({ side }: { side: -1 | 1 }) {
  return (
    <group
      name={`shark-shell-${side < 0 ? 'left' : 'right'}-friendly-eye-socket`}
      position={[side * 0.425, 0.442, -0.565]}
      rotation={[0.02, side * 0.13, side * -0.05]}
    >
      <OutlineMesh
        name={`shark-shell-${side < 0 ? 'left' : 'right'}-rounded-eye-mound`}
        scale={[0.142, 0.116, 0.068]}
        outlineWidth={0.01}
        outlineColor={SHARK_INK}
        geometry={<sphereGeometry args={[1, 14, 9]} />}
        material={<meshToonMaterial color={SHARK_SKIN_MID} />}
      />
      <OutlineMesh
        name={`shark-shell-${side < 0 ? 'left' : 'right'}-soft-white-eye`}
        position={[side * -0.006, -0.004, -0.058]}
        scale={[0.094, 0.086, 0.036]}
        outlineWidth={0.008}
        outlineColor={SHARK_INK}
        geometry={<sphereGeometry args={[1, 14, 9]} />}
        material={<meshToonMaterial color="#eff3ed" />}
      />
      <OutlineMesh
        position={[side * -0.017, -0.012, -0.091]}
        scale={[0.039, 0.045, 0.014]}
        outlineWidth={0.004}
        outlineColor={SHARK_INK}
        geometry={<sphereGeometry args={[1, 12, 8]} />}
        material={<meshBasicMaterial color="#152033" />}
      />
      <mesh position={[side * -0.027, 0.008, -0.105]} scale={[0.011, 0.014, 0.005]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  )
}

function GillMarks({ side }: { side: -1 | 1 }) {
  return (
    <group name={`shark-shell-${side < 0 ? 'left' : 'right'}-embedded-gills`}>
      {[0, 1, 2].map((index) => (
        <mesh
          key={`shark-gill-${side}-${index}`}
          position={[side * (0.705 + index * 0.012), 0.11 - index * 0.088, -0.255 + index * 0.012]}
          rotation={[0.1, side * 0.88, side * (-0.3 + index * 0.035)]}
          scale={[0.013, 0.07 - index * 0.006, 0.012]}
        >
          <sphereGeometry args={[1, 8, 5]} />
          <meshBasicMaterial color={SHARK_SKIN_DEEP} depthTest depthWrite />
        </mesh>
      ))}
    </group>
  )
}

function SharkPectoralFin({
  side,
  geometry,
  activity,
  animation,
}: {
  side: -1 | 1
  geometry: THREE.BufferGeometry
  activity: number
  animation: SharkShellProps['animation']
}) {
  const group = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!group.current) return
    const motion = clamp01(activity)
    const t = clock.elapsedTime
    const hopLift = animation === 'hop' ? Math.sin(t * 7.2 + side) * 0.018 : 0
    group.current.rotation.z = side * (-0.025 + Math.sin(t * 1.75 + side * 0.7) * 0.024 * motion + hopLift)
    group.current.rotation.x = -0.045 + Math.sin(t * 1.2 + side) * 0.014 * motion
  })

  return (
    <group
      ref={group}
      name={`shark-shell-${side < 0 ? 'left' : 'right'}-rooted-puffy-flipper`}
      position={[side * 0.61, -0.11, -0.055]}
    >
      <OutlineMesh
        outlineWidth={0.021}
        outlineColor={SHARK_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={
          <meshToonMaterial
            color={side < 0 ? SHARK_SKIN_BASE : SHARK_SKIN_MID}
            side={THREE.DoubleSide}
          />
        }
      />
    </group>
  )
}

function SharkTail({ activity, animation }: { activity: number; animation: SharkShellProps['animation'] }) {
  const group = useRef<THREE.Group>(null)
  const upperLobeGeometry = useMemo(() => createTailLobeGeometry(1), [])
  const lowerLobeGeometry = useMemo(() => createTailLobeGeometry(-1), [])

  useEffect(() => () => {
    upperLobeGeometry.dispose()
    lowerLobeGeometry.dispose()
  }, [lowerLobeGeometry, upperLobeGeometry])

  useFrame(({ clock }) => {
    if (!group.current) return
    const motion = clamp01(activity)
    const t = clock.elapsedTime
    const hopKick = animation === 'hop' ? Math.sin(t * 7.4) * 0.035 : 0
    group.current.rotation.y = Math.sin(t * 2.15 + 0.6) * 0.085 * motion + hopKick * motion
    group.current.rotation.x = Math.sin(t * 1.35) * 0.018 * motion
  })

  return (
    <group ref={group} name="shark-shell-rooted-swaying-tail" position={[0, -0.015, 0.54]}>
      <OutlineMesh
        name="shark-shell-buried-tail-peduncle"
        position={[0, 0, 0.2]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1, 1, 0.92]}
        outlineWidth={0.018}
        outlineColor={SHARK_INK}
        geometry={<cylinderGeometry args={[0.12, 0.225, 0.48, 10, 3]} />}
        material={<meshToonMaterial color={SHARK_SKIN_SHADOW} />}
      />
      <OutlineMesh
        name="shark-shell-rounded-tail-knuckle"
        position={[0, 0.005, 0.435]}
        scale={[0.16, 0.15, 0.135]}
        outlineWidth={0.016}
        outlineColor={SHARK_INK}
        geometry={<sphereGeometry args={[1, 14, 8]} />}
        material={<meshToonMaterial color={SHARK_SKIN_SHADOW} />}
      />
      <OutlineMesh
        name="shark-shell-puffy-upper-tail-lobe"
        position={[0, 0.005, 0.46]}
        rotation={[0.02, 0, -0.06]}
        outlineWidth={0.018}
        outlineColor={SHARK_INK}
        geometry={<primitive object={upperLobeGeometry} attach="geometry" />}
        material={<meshToonMaterial color={SHARK_SKIN_MID} side={THREE.DoubleSide} />}
      />
      <OutlineMesh
        name="shark-shell-puffy-lower-tail-lobe"
        position={[0, -0.005, 0.455]}
        rotation={[-0.02, 0, 0.055]}
        scale={[0.92, 0.86, 0.94]}
        outlineWidth={0.018}
        outlineColor={SHARK_INK}
        geometry={<primitive object={lowerLobeGeometry} attach="geometry" />}
        material={<meshToonMaterial color={SHARK_SKIN_BASE} side={THREE.DoubleSide} />}
      />
    </group>
  )
}

export function SharkShell({
  fitted = false,
  hasHeadAccessory = false,
  activity = 1,
  animation = 'idle',
}: SharkShellProps) {
  const hullGeometry = useMemo(() => createSharkHullGeometry(), [])
  const dorsalGeometry = useMemo(() => createDorsalFinGeometry(), [])
  const leftFinGeometry = useMemo(() => createPectoralFinGeometry(-1), [])
  const rightFinGeometry = useMemo(() => createPectoralFinGeometry(1), [])

  useEffect(
    () => () => {
      hullGeometry.dispose()
      dorsalGeometry.dispose()
      leftFinGeometry.dispose()
      rightFinGeometry.dispose()
    },
    [hullGeometry, dorsalGeometry, leftFinGeometry, rightFinGeometry],
  )

  return (
    <group name="shark-shell-whole-shark-mascot-body">
      <OutlineMesh
        name="shark-shell-one-piece-tapered-skin-hull"
        outlineWidth={fitted ? 0.047 : 0.057}
        outlineColor={SHARK_INK}
        geometry={<primitive object={hullGeometry} attach="geometry" />}
        material={<meshToonMaterial vertexColors />}
      />

      <group
        name="shark-shell-buried-rounded-dorsal-fin"
        position={[0, 0.48, 0.14]}
        scale={hasHeadAccessory ? [0.84, 0.58, 0.82] : [1, 1, 1]}
      >
        <OutlineMesh
          outlineWidth={0.025}
          outlineColor={SHARK_INK}
          geometry={<primitive object={dorsalGeometry} attach="geometry" />}
          material={<meshToonMaterial color={SHARK_SKIN_SHADOW} />}
        />
      </group>

      <SharkPectoralFin
        side={-1}
        geometry={leftFinGeometry}
        activity={activity}
        animation={animation}
      />
      <SharkPectoralFin
        side={1}
        geometry={rightFinGeometry}
        activity={activity}
        animation={animation}
      />

      <SharkTail activity={activity} animation={animation} />
      <SharkEye side={-1} />
      <SharkEye side={1} />
      <GillMarks side={-1} />
      <GillMarks side={1} />

      <group name="shark-shell-soft-snout-nostrils">
        {[-1, 1].map((side) => (
          <mesh
            key={`shark-nostril-${side}`}
            position={[side * 0.155, 0.385, -0.725]}
            rotation-z={side * 0.12}
            scale={[0.026, 0.012, 0.008]}
          >
            <sphereGeometry args={[1, 9, 5]} />
            <meshBasicMaterial color={SHARK_SKIN_DEEP} depthTest depthWrite />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function SharkShellOpeningJaws() {
  const jawGeometry = useMemo(() => createSharkJawGeometry(), [])
  const tunnelGeometry = useMemo(() => createMouthTunnelGeometry(), [])
  const toothGeometry = useMemo(() => createRoundedToothGeometry(), [])
  const sealGeometry = useMemo(() => {
    const seal = createShellOpeningSealGeometry({
      segments: 64,
      rings: 7,
      centerY: -0.055,
      frontXRadius: 0.605,
      frontYRadius: 0.442,
      backXRadius: 0.655,
      backYRadius: 0.485,
      frontZ: -0.585,
      backZ: -0.395,
      xCurve: 0.66,
      yCurve: 0.7,
      lowerDrop: 0.012,
      upperLift: 0.006,
      sideDepth: 0.016,
    })
    applySharkSealColors(seal)
    return seal
  }, [])
  const upperGumPoints = useMemo<Point3[]>(
    () => [
      [-0.405, 0.145, -0.81],
      [-0.235, 0.25, -0.817],
      [0, 0.3, -0.82],
      [0.235, 0.25, -0.817],
      [0.405, 0.145, -0.81],
    ],
    [],
  )
  const lowerGumPoints = useMemo<Point3[]>(
    () => [
      [-0.405, -0.225, -0.81],
      [-0.225, -0.322, -0.817],
      [0, -0.355, -0.82],
      [0.225, -0.322, -0.817],
      [0.405, -0.225, -0.81],
    ],
    [],
  )

  useEffect(
    () => () => {
      jawGeometry.dispose()
      tunnelGeometry.dispose()
      toothGeometry.dispose()
      sealGeometry.dispose()
    },
    [jawGeometry, sealGeometry, tunnelGeometry, toothGeometry],
  )

  return (
    <group name="shark-shell-true-open-jaw-face-aperture">
      <mesh name="shark-shell-buried-continuous-jaw-seal">
        <primitive object={sealGeometry} attach="geometry" />
        <meshToonMaterial vertexColors depthTest depthWrite />
      </mesh>
      <mesh name="shark-shell-depth-safe-mouth-tunnel">
        <primitive object={tunnelGeometry} attach="geometry" />
        <meshToonMaterial color="#29233a" side={THREE.DoubleSide} depthTest depthWrite />
      </mesh>
      <OutlineMesh
        name="shark-shell-integrated-upper-and-lower-jaws"
        outlineWidth={0.011}
        outlineColor={SHARK_INK}
        geometry={<primitive object={jawGeometry} attach="geometry" />}
        material={<meshToonMaterial vertexColors />}
      />
      <CurveRail name="shark-shell-upper-soft-gum-root" points={upperGumPoints} color={SHARK_GUM_LIGHT} />
      <CurveRail name="shark-shell-lower-soft-gum-root" points={lowerGumPoints} color={SHARK_GUM} />
      <group name="shark-shell-short-rounded-costume-teeth">
        {UPPER_TEETH.map((tooth, index) => (
          <OutlineMesh
            key={`shark-upper-tooth-${index}`}
            name={`shark-shell-upper-tooth-${index}`}
            position={[tooth.x, tooth.y, -0.848]}
            rotation={[0, 0, Math.PI + tooth.rotation]}
            scale={[tooth.scale, tooth.scale, tooth.scale]}
            outlineWidth={0.008}
            outlineColor={SHARK_INK}
            geometry={<primitive object={toothGeometry} attach="geometry" />}
            material={<meshToonMaterial color={SHARK_TOOTH} />}
          />
        ))}
        {LOWER_TEETH.map((tooth, index) => (
          <OutlineMesh
            key={`shark-lower-tooth-${index}`}
            name={`shark-shell-lower-tooth-${index}`}
            position={[tooth.x, tooth.y, -0.848]}
            rotation={[0, 0, tooth.rotation]}
            scale={[tooth.scale, tooth.scale, tooth.scale]}
            outlineWidth={0.008}
            outlineColor={SHARK_INK}
            geometry={<primitive object={toothGeometry} attach="geometry" />}
            material={<meshToonMaterial color={SHARK_TOOTH} />}
          />
        ))}
      </group>
    </group>
  )
}
