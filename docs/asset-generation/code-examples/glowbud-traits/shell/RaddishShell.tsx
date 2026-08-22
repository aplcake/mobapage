import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'
import { createShellOpeningSealGeometry } from './ShellOpeningSeal'

export const RADDISH_INK = '#25151d'
export const RADDISH_SKIN_DEEP = '#6d1730'
export const RADDISH_SKIN_SHADOW = '#9b2340'
export const RADDISH_SKIN_BASE = '#cf3650'
export const RADDISH_SKIN_MID = '#e95669'
export const RADDISH_SKIN_LIGHT = '#f58a91'
export const RADDISH_FLESH = '#fff0d7'
export const RADDISH_FLESH_SHADOW = '#eec7b2'
export const RADDISH_ROOT_TIP = '#fff3d9'
export const RADDISH_LEAF_DEEP = '#28542c'
export const RADDISH_LEAF_BASE = '#3f7032'
export const RADDISH_LEAF_MID = '#56883a'
export const RADDISH_LEAF_LIGHT = '#7eaa4b'

type RaddishAnimation = 'idle' | 'hop' | 'grumble'

type RaddishShellProps = {
  fitted?: boolean
  hasHeadAccessory?: boolean
  activity?: number
  animation?: RaddishAnimation
}

type LeafSpec = {
  id: string
  yaw: number
  roll: number
  pitch: number
  length: number
  width: number
  reach: number
  rise: number
  droop: number
  phase: number
  bareOnly?: boolean
}

const RADDISH_LEAF_SPECS: LeafSpec[] = [
  {
    id: 'rear-hero',
    yaw: 0.08,
    roll: -0.04,
    pitch: -0.02,
    length: 1.02,
    width: 0.31,
    reach: 0.36,
    rise: 1.05,
    droop: 0.13,
    phase: 0.7,
    bareOnly: true,
  },
  {
    id: 'left-upright',
    yaw: -0.76,
    roll: 0.08,
    pitch: 0.03,
    length: 0.92,
    width: 0.285,
    reach: 0.48,
    rise: 0.98,
    droop: 0.2,
    phase: 1.8,
  },
  {
    id: 'right-upright',
    yaw: 0.82,
    roll: -0.09,
    pitch: -0.015,
    length: 0.88,
    width: 0.295,
    reach: 0.5,
    rise: 0.94,
    droop: 0.22,
    phase: 2.9,
  },
  {
    id: 'left-shoulder',
    yaw: -1.48,
    roll: 0.13,
    pitch: 0.045,
    length: 0.78,
    width: 0.255,
    reach: 0.68,
    rise: 0.78,
    droop: 0.28,
    phase: 4.1,
  },
  {
    id: 'right-shoulder',
    yaw: 1.43,
    roll: -0.11,
    pitch: -0.03,
    length: 0.74,
    width: 0.25,
    reach: 0.7,
    rise: 0.74,
    droop: 0.3,
    phase: 5.2,
  },
  {
    id: 'front-fold',
    yaw: 2.72,
    roll: 0.08,
    pitch: 0.02,
    length: 0.68,
    width: 0.23,
    reach: 0.5,
    rise: 0.88,
    droop: 0.24,
    phase: 6.4,
    bareOnly: true,
  },
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
    Math.sign(cosAngle || 1) * Math.pow(Math.abs(cosAngle), 0.62) * xRadius,
    Math.sign(sinAngle || 1) * Math.pow(Math.abs(sinAngle), 0.69) * yRadius,
  )
}

function applyRaddishSkinColors(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position as THREE.BufferAttribute
  const normal = geometry.attributes.normal as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deep = new THREE.Color(RADDISH_SKIN_DEEP)
  const shadow = new THREE.Color(RADDISH_SKIN_SHADOW)
  const base = new THREE.Color(RADDISH_SKIN_BASE)
  const mid = new THREE.Color(RADDISH_SKIN_MID)
  const light = new THREE.Color(RADDISH_SKIN_LIGHT)
  const flesh = new THREE.Color(RADDISH_FLESH_SHADOW)
  const color = new THREE.Color()

  for (let index = 0; index < position.count; index += 3) {
    const x = (position.getX(index) + position.getX(index + 1) + position.getX(index + 2)) / 3
    const y = (position.getY(index) + position.getY(index + 1) + position.getY(index + 2)) / 3
    const z = (position.getZ(index) + position.getZ(index + 1) + position.getZ(index + 2)) / 3
    const normalY = (normal.getY(index) + normal.getY(index + 1) + normal.getY(index + 2)) / 3
    const noise = triangleNoise(index / 3, x, y, z)
    const longitude = Math.atan2(z, x)
    const rootBoundary = Math.sin(longitude * 3 + 0.45) * 0.035
      + Math.sin(x * 8.0 + z * 6.0) * 0.014
    const rootFade = smoothstep01((-y - 0.18 + rootBoundary) / 0.34)
    const crownShade = smoothstep01((y - 0.22) / 0.38)

    color.copy(base)
    color.lerp(mid, Math.max(0, normalY) * 0.24)
    color.lerp(light, noise > 0.86 ? 0.08 : 0)
    color.lerp(shadow, noise < 0.12 ? 0.08 : 0)
    color.lerp(deep, crownShade * 0.18)
    color.lerp(flesh, rootFade * 0.86)

    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = (index + vertex) * 3
      colors[offset] = color.r
      colors[offset + 1] = color.g
      colors[offset + 2] = color.b
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function createRaddishBodyGeometry() {
  const indexed = new THREE.SphereGeometry(1, 44, 30)
  const position = indexed.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const angle = Math.atan2(z, x)
    const crownTaper = smoothstep01((y - 0.16) / 0.78)
    const rootTaper = smoothstep01((-y - 0.25) / 0.69)
    const shoulder = Math.exp(-((y - 0.08) ** 2) / 0.18)
    const organic = 1
      + Math.sin(angle * 3.0 + y * 4.2) * 0.012
      + Math.cos(angle * 7.0 - y * 3.1) * 0.006
    const radial = organic * (1 + shoulder * 0.04 - crownTaper * 0.15 - rootTaper * 0.2)

    let nextX = x * 0.75 * radial
    let nextY = -0.015 + y * 0.83 + crownTaper * 0.018 - rootTaper * 0.018
    let nextZ = -0.035 + z * 0.64 * radial * (1 + (z < 0 ? 0.045 : 0.012))

    nextX += Math.sin(y * 5.7 + z * 2.2) * 0.005
    nextZ += Math.cos(y * 5.1 - x * 4.0) * 0.006

    if (nextY < -0.62) {
      const settle = smoothstep01((-nextY - 0.62) / 0.17)
      nextY = THREE.MathUtils.lerp(nextY, -0.685 + Math.sin(angle * 4.0) * 0.004, settle * 0.72)
      nextX *= 1 - settle * 0.13
      nextZ *= 1 - settle * 0.08
    }

    position.setXYZ(index, nextX, nextY, nextZ)
  }

  position.needsUpdate = true
  indexed.computeVertexNormals()
  const source = indexed.toNonIndexed()
  indexed.dispose()
  const sourcePosition = source.attributes.position as THREE.BufferAttribute
  const sourceNormal = source.attributes.normal as THREE.BufferAttribute
  const positions: number[] = []
  const normals: number[] = []

  for (let index = 0; index < sourcePosition.count; index += 3) {
    const centerX = (sourcePosition.getX(index) + sourcePosition.getX(index + 1) + sourcePosition.getX(index + 2)) / 3
    const centerY = (sourcePosition.getY(index) + sourcePosition.getY(index + 1) + sourcePosition.getY(index + 2)) / 3
    const centerZ = (sourcePosition.getZ(index) + sourcePosition.getZ(index + 1) + sourcePosition.getZ(index + 2)) / 3
    const aperture = Math.pow(Math.abs(centerX / 0.47), 3.2)
      + Math.pow(Math.abs((centerY + 0.05) / 0.355), 3.2)

    if (centerZ < -0.472 && aperture < 1.045) continue

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
    }
  }

  source.dispose()
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  applyRaddishSkinColors(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createRaddishOpeningGeometry() {
  const segments = 64
  const tubeSegments = 12
  const vertices: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const skinDeep = new THREE.Color(RADDISH_SKIN_DEEP)
  const skin = new THREE.Color(RADDISH_SKIN_BASE)
  const skinLight = new THREE.Color(RADDISH_SKIN_LIGHT)
  const fleshShadow = new THREE.Color(RADDISH_FLESH_SHADOW)
  const flesh = new THREE.Color(RADDISH_FLESH)
  const color = new THREE.Color()

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const lower = Math.max(0, -Math.sin(angle))
    const upper = Math.max(0, Math.sin(angle))
    const side = Math.abs(Math.cos(angle))
    const organic = 1 + Math.sin(angle * 3.0 + 0.35) * 0.008 + Math.cos(angle * 7.0) * 0.004
    const point = superellipsePoint(angle, 0.48 + side * 0.01, 0.36 + lower * 0.015 - upper * 0.005)

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      const radius = (0.064 + lower * 0.011 + side * 0.007) * organic
      const bodyMelt = Math.max(0, tubeRadial) * (0.088 + side * 0.025 + upper * 0.014)
      const innerFlesh = smoothstep01((-tubeRadial - 0.02) / 0.72)
      const frontFlesh = smoothstep01((-tubeDepth + 0.1) / 1.05)
      const fleshBlend = innerFlesh * (0.55 + frontFlesh * 0.45)

      vertices.push(
        point.x + Math.cos(angle) * tubeRadial * radius,
        -0.05 + point.y + Math.sin(angle) * tubeRadial * radius - lower * 0.008,
        -0.716 + tubeDepth * (0.051 + side * 0.007) + bodyMelt,
      )

      color.copy(skin)
      color.lerp(skinLight, Math.max(0, Math.sin(angle)) * 0.12)
      color.lerp(skinDeep, Math.max(0, tubeDepth) * 0.16)
      color.lerp(fleshShadow, fleshBlend * 0.66)
      color.lerp(flesh, fleshBlend * 0.34)
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    for (let tube = 0; tube < tubeSegments; tube += 1) {
      const row = tubeSegments + 1
      const base = segment * row + tube
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const indexed = new THREE.BufferGeometry()
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  indexed.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  indexed.setIndex(indices)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createTaprootGeometry() {
  const curve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0.015, -0.42, 0.46),
      new THREE.Vector3(0.035, -0.47, 0.56),
      new THREE.Vector3(0.11, -0.52, 0.64),
      new THREE.Vector3(0.22, -0.54, 0.68),
      new THREE.Vector3(0.34, -0.51, 0.64),
    ],
    false,
    'centripetal',
    0.5,
  )
  const rings = 22
  const sides = 9
  const vertices: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const worldUp = new THREE.Vector3(0, 1, 0)
  const worldSide = new THREE.Vector3(1, 0, 0)
  const normalA = new THREE.Vector3()
  const normalB = new THREE.Vector3()
  const blush = new THREE.Color(RADDISH_FLESH_SHADOW)
  const tip = new THREE.Color(RADDISH_ROOT_TIP)

  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings
    const center = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t).normalize()
    const reference = Math.abs(tangent.dot(worldUp)) > 0.9 ? worldSide : worldUp
    normalA.crossVectors(tangent, reference).normalize()
    normalB.crossVectors(normalA, tangent).normalize()
    const radius = 0.012 + 0.073 * Math.pow(1 - t, 0.68)
    const color = blush.clone().lerp(tip, smoothstep01(t))

    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2
      const radial = Math.cos(angle) * radius
      const depth = Math.sin(angle) * radius * 0.82
      const vertex = center.clone().addScaledVector(normalA, radial).addScaledVector(normalB, depth)
      vertices.push(vertex.x, vertex.y, vertex.z)
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let ring = 0; ring < rings; ring += 1) {
    for (let side = 0; side < sides; side += 1) {
      const nextSide = (side + 1) % sides
      const base = ring * sides + side
      const nextRing = (ring + 1) * sides + side
      indices.push(base, nextRing, ring * sides + nextSide)
      indices.push(ring * sides + nextSide, nextRing, (ring + 1) * sides + nextSide)
    }
  }

  const tipCenter = vertices.length / 3
  const end = curve.getPointAt(1)
  vertices.push(end.x, end.y, end.z)
  colors.push(tip.r, tip.g, tip.b)
  const finalRing = rings * sides
  for (let side = 0; side < sides; side += 1) {
    indices.push(finalRing + side, finalRing + ((side + 1) % sides), tipCenter)
  }

  const indexed = new THREE.BufferGeometry()
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  indexed.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  indexed.setIndex(indices)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createRaddishLeafGeometry(spec: LeafSpec) {
  const lengthSegments = 18
  const widthSegments = 8
  const rowSize = widthSegments + 1
  const surfaceSize = (lengthSegments + 1) * rowSize
  const vertices: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deep = new THREE.Color(RADDISH_LEAF_DEEP)
  const base = new THREE.Color(RADDISH_LEAF_BASE)
  const mid = new THREE.Color(RADDISH_LEAF_MID)
  const light = new THREE.Color(RADDISH_LEAF_LIGHT)
  const color = new THREE.Color()

  for (let surface = 0; surface < 2; surface += 1) {
    const sideSign = surface === 0 ? 1 : -1
    for (let segment = 0; segment <= lengthSegments; segment += 1) {
      const t = segment / lengthSegments
      const profile = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.72)
      const lobeGate = Math.pow(Math.sin(Math.PI * t), 0.8)
      const lobe = 1
        + Math.sin(t * Math.PI * 5 + spec.phase) * 0.18 * lobeGate
        + Math.sin(t * Math.PI * 9 + spec.phase * 0.7) * 0.055 * lobeGate
      const centerY = spec.length * (spec.rise * t - spec.droop * t * t)
      const centerZ = spec.length * (spec.reach * t + Math.sin(Math.PI * t) * 0.055)
      const tangentY = spec.length * (spec.rise - 2 * spec.droop * t)
      const tangentZ = spec.length * (spec.reach + Math.cos(Math.PI * t) * Math.PI * 0.055)
      const tangentLength = Math.hypot(tangentY, tangentZ) || 1
      const normalY = tangentZ / tangentLength
      const normalZ = -tangentY / tangentLength
      const halfWidth = spec.width * profile * lobe

      for (let across = 0; across <= widthSegments; across += 1) {
        const v = -1 + (across / widthSegments) * 2
        const puffy = (1 - v * v) * profile
        const thickness = spec.width * (0.17 + profile * 0.12) * puffy * sideSign
        const serration = Math.sin(t * Math.PI * 8 + spec.phase) * 0.012 * Math.abs(v) * lobeGate
        const x = v * halfWidth * (1 + serration)
        const y = centerY + normalY * thickness
        const z = centerZ + normalZ * thickness - Math.abs(v) * spec.width * 0.035 * profile
        const midrib = smoothstep01((0.24 - Math.abs(v)) / 0.24)

        vertices.push(x, y, z)
        color.copy(surface === 0 ? mid : base)
        color.lerp(light, midrib * (surface === 0 ? 0.34 : 0.12))
        color.lerp(deep, Math.abs(v) * (surface === 0 ? 0.1 : 0.22))
        color.lerp(deep, t < 0.16 ? (0.16 - t) * 1.3 : 0)
        colors.push(color.r, color.g, color.b)
      }
    }
  }

  for (let surface = 0; surface < 2; surface += 1) {
    const offset = surface * surfaceSize
    for (let segment = 0; segment < lengthSegments; segment += 1) {
      for (let across = 0; across < widthSegments; across += 1) {
        const a = offset + segment * rowSize + across
        const b = offset + (segment + 1) * rowSize + across
        const c = a + 1
        const d = b + 1
        if (surface === 0) {
          indices.push(a, b, c, c, b, d)
        } else {
          indices.push(a, c, b, c, d, b)
        }
      }
    }
  }

  for (let segment = 0; segment < lengthSegments; segment += 1) {
    const next = segment + 1
    const topLeft = segment * rowSize
    const topLeftNext = next * rowSize
    const bottomLeft = surfaceSize + topLeft
    const bottomLeftNext = surfaceSize + topLeftNext
    indices.push(topLeft, bottomLeft, topLeftNext, topLeftNext, bottomLeft, bottomLeftNext)

    const topRight = segment * rowSize + widthSegments
    const topRightNext = next * rowSize + widthSegments
    const bottomRight = surfaceSize + topRight
    const bottomRightNext = surfaceSize + topRightNext
    indices.push(topRight, topRightNext, bottomRight, topRightNext, bottomRightNext, bottomRight)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

const RADDISH_VERTEX_SHADER = /* glsl */ `
  attribute vec3 color;

  varying vec3 vSurfaceColor;
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vSurfaceColor = color;
    vLocalPosition = position;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const RADDISH_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vSurfaceColor;
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.48, 0.84, 0.34));
    float lightAmount = dot(normalize(vViewNormal), lightDirection) * 0.5 + 0.5;
    float lightBand = mix(0.72, 0.9, step(0.34, lightAmount));
    lightBand = mix(lightBand, 1.055, step(0.72, lightAmount));

    float grain = sin(dot(vLocalPosition, vec3(71.0, 89.0, 57.0)))
      * sin(dot(vLocalPosition, vec3(43.0, 101.0, 67.0)));
    float pore = smoothstep(0.76, 0.96, grain) * 0.07;
    float longitude = atan(vLocalPosition.x, vLocalPosition.z);
    float rootStria = pow(0.5 + 0.5 * sin(longitude * 13.0 + vLocalPosition.y * 8.0), 8.0);
    rootStria *= smoothstep(-0.2, -0.56, vLocalPosition.y) * 0.055;

    vec3 surfaceColor = vSurfaceColor * lightBand;
    surfaceColor *= 1.0 - pore - rootStria;

    gl_FragColor = vec4(surfaceColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function RaddishSurfaceMaterial() {
  return (
    <shaderMaterial
      vertexShader={RADDISH_VERTEX_SHADER}
      fragmentShader={RADDISH_FRAGMENT_SHADER}
      side={THREE.FrontSide}
      depthTest
      depthWrite
      dithering
    />
  )
}

function RaddishLeaf({
  spec,
  compact,
  activity,
  animation,
}: {
  spec: LeafSpec
  compact: boolean
  activity: number
  animation: RaddishAnimation
}) {
  const root = useRef<THREE.Group>(null)
  const geometry = useMemo(() => createRaddishLeafGeometry(spec), [spec])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ clock }) => {
    if (!root.current) return
    const motion = clamp01(activity)
    const hopEnergy = animation === 'hop' ? 1.55 : animation === 'grumble' ? 1.25 : 1
    const breeze = Math.sin(clock.elapsedTime * 1.7 + spec.phase) * 0.018 * motion * hopEnergy
    const flutter = Math.sin(clock.elapsedTime * 3.2 + spec.phase * 1.4) * 0.006 * motion * hopEnergy
    root.current.rotation.x = spec.pitch + breeze * 0.45
    root.current.rotation.y = spec.yaw + flutter * 0.35
    root.current.rotation.z = spec.roll + breeze + flutter
  })

  return (
    <group
      ref={root}
      name={`raddish-shell-leaf-${spec.id}`}
      position={compact ? [0, 0.59, 0.19] : [0, 0.72, 0.085]}
      rotation={[spec.pitch, spec.yaw, spec.roll]}
      scale={compact ? [0.66, 0.62, 0.66] : 1}
    >
      <OutlineMesh
        outlineWidth={compact ? 0.016 : 0.019}
        outlineColor={RADDISH_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<meshToonMaterial vertexColors side={THREE.FrontSide} depthTest depthWrite />}
      />
    </group>
  )
}

function RaddishLeafCrown({
  compact,
  activity,
  animation,
}: {
  compact: boolean
  activity: number
  animation: RaddishAnimation
}) {
  const visibleLeaves = compact
    ? RADDISH_LEAF_SPECS.filter((spec) => !spec.bareOnly)
    : RADDISH_LEAF_SPECS

  return (
    <group name="raddish-shell-organic-leaf-crown">
      <OutlineMesh
        name="raddish-shell-buried-green-crown"
        position={compact ? [0, 0.62, 0.2] : [0, 0.74, 0.09]}
        scale={compact ? [0.29, 0.105, 0.19] : [0.31, 0.135, 0.245]}
        outlineWidth={0.028}
        outlineColor={RADDISH_INK}
        geometry={<dodecahedronGeometry args={[1, 2]} />}
        material={<meshToonMaterial color={RADDISH_LEAF_DEEP} depthTest depthWrite />}
      />
      {visibleLeaves.map((spec) => (
        <RaddishLeaf
          key={spec.id}
          spec={spec}
          compact={compact}
          activity={activity}
          animation={animation}
        />
      ))}
    </group>
  )
}

export function RaddishShell({
  fitted = false,
  hasHeadAccessory = false,
  activity = 1,
  animation = 'idle',
}: RaddishShellProps) {
  const bodyGeometry = useMemo(() => createRaddishBodyGeometry(), [])
  const taprootGeometry = useMemo(() => createTaprootGeometry(), [])

  useEffect(() => () => {
    bodyGeometry.dispose()
    taprootGeometry.dispose()
  }, [bodyGeometry, taprootGeometry])

  return (
    <group name="raddish-shell-root-vegetable-body">
      <OutlineMesh
        name="raddish-shell-raspberry-bulb"
        outlineWidth={fitted ? 0.043 : 0.054}
        outlineColor={RADDISH_INK}
        geometry={<primitive object={bodyGeometry} attach="geometry" />}
        material={<RaddishSurfaceMaterial />}
      />
      <OutlineMesh
        name="raddish-shell-curved-creamy-taproot"
        outlineWidth={0.022}
        outlineColor={RADDISH_INK}
        geometry={<primitive object={taprootGeometry} attach="geometry" />}
        material={<meshToonMaterial vertexColors side={THREE.FrontSide} depthTest depthWrite />}
      />
      <RaddishLeafCrown
        compact={hasHeadAccessory}
        activity={activity}
        animation={animation}
      />
    </group>
  )
}

export function RaddishShellOpeningLip() {
  const geometry = useMemo(() => createRaddishOpeningGeometry(), [])
  const sealGeometry = useMemo(() => {
    const seal = createShellOpeningSealGeometry({
      segments: 64,
      rings: 6,
      centerY: -0.05,
      frontXRadius: 0.535,
      frontYRadius: 0.398,
      backXRadius: 0.556,
      backYRadius: 0.427,
      frontZ: -0.622,
      backZ: -0.415,
      xCurve: 0.62,
      yCurve: 0.69,
      lowerDrop: 0.009,
      sideDepth: 0.012,
      surfaceRipple: 0.004,
      ripplePhase: 0.35,
    })
    applyRaddishSkinColors(seal)
    return seal
  }, [])

  useEffect(() => () => {
    geometry.dispose()
    sealGeometry.dispose()
  }, [geometry, sealGeometry])

  return (
    <group name="raddish-shell-true-face-aperture">
      <mesh name="raddish-shell-continuous-aperture-seal">
        <primitive object={sealGeometry} attach="geometry" />
        <RaddishSurfaceMaterial />
      </mesh>
      <OutlineMesh
        name="raddish-shell-integrated-skin-and-white-flesh-lip"
        outlineWidth={0.018}
        outlineColor={RADDISH_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<RaddishSurfaceMaterial />}
      />
    </group>
  )
}
