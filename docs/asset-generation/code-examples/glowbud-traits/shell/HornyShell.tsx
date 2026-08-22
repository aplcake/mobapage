import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'
import { createShellOpeningSealGeometry } from './ShellOpeningSeal'

export const HORNY_INK = '#21131a'
export const HORNY_SKIN_DEEP = '#4f111d'
export const HORNY_SKIN_SHADOW = '#741724'
export const HORNY_SKIN_BASE = '#a5262d'
export const HORNY_SKIN_MID = '#cf4139'
export const HORNY_SKIN_LIGHT = '#ef7658'
export const HORNY_HORN_ROOT = '#4b2d24'
export const HORNY_HORN_SHADOW = '#8d755b'
export const HORNY_HORN_BASE = '#c4b78d'
export const HORNY_HORN_LIGHT = '#e7dfb9'
export const HORNY_HORN_TIP = '#fff4cf'

type HornyShellProps = {
  fitted?: boolean
}

type HornSpec = {
  id: string
  points: [number, number, number][]
  baseRadius: number
  ridgeCount: number
  seed: number
  outlineWidth: number
}

const HORN_SPECS: HornSpec[] = [
  {
    id: 'left-hero',
    points: [
      [-0.43, 0.42, 0.02],
      [-0.62, 0.52, -0.015],
      [-0.8, 0.68, 0.015],
      [-0.9, 0.88, 0.055],
      [-0.88, 1.07, 0.035],
      [-0.77, 1.21, -0.045],
      [-0.62, 1.29, -0.13],
      [-0.5, 1.3, -0.205],
    ],
    baseRadius: 0.19,
    ridgeCount: 8,
    seed: 13,
    outlineWidth: 0.048,
  },
  {
    id: 'right-hero',
    points: [
      [0.435, 0.43, 0.025],
      [0.635, 0.535, -0.025],
      [0.81, 0.71, 0.005],
      [0.89, 0.92, 0.05],
      [0.84, 1.11, 0.02],
      [0.72, 1.24, -0.055],
      [0.57, 1.3, -0.15],
      [0.465, 1.29, -0.225],
    ],
    baseRadius: 0.185,
    ridgeCount: 8,
    seed: 29,
    outlineWidth: 0.048,
  },
  {
    id: 'left-rear-hornlet',
    points: [
      [-0.43, 0.2, 0.43],
      [-0.58, 0.26, 0.53],
      [-0.7, 0.37, 0.6],
      [-0.75, 0.5, 0.61],
      [-0.7, 0.6, 0.55],
    ],
    baseRadius: 0.105,
    ridgeCount: 5,
    seed: 41,
    outlineWidth: 0.034,
  },
  {
    id: 'right-rear-hornlet',
    points: [
      [0.46, 0.17, 0.42],
      [0.6, 0.24, 0.52],
      [0.72, 0.34, 0.59],
      [0.78, 0.46, 0.59],
      [0.74, 0.56, 0.52],
    ],
    baseRadius: 0.098,
    ridgeCount: 5,
    seed: 53,
    outlineWidth: 0.032,
  },
]

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1)
}

function smoothstep01(value: number) {
  const clamped = clamp01(value)
  return clamped * clamped * (3 - 2 * clamped)
}

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function triangleNoise(index: number, x: number, y: number, z: number) {
  const value = Math.sin(index * 12.9898 + x * 78.233 + y * 37.719 + z * 49.157) * 43758.5453
  return value - Math.floor(value)
}

function superellipsePoint(angle: number, xRadius: number, yRadius: number) {
  const cosAngle = Math.cos(angle)
  const sinAngle = Math.sin(angle)
  return new THREE.Vector2(
    Math.sign(cosAngle || 1) * Math.pow(Math.abs(cosAngle), 0.61) * xRadius,
    Math.sign(sinAngle || 1) * Math.pow(Math.abs(sinAngle), 0.68) * yRadius,
  )
}

function applyHornySkinColors(geometry: THREE.BufferGeometry, opening = false) {
  const position = geometry.attributes.position as THREE.BufferAttribute
  const normal = geometry.attributes.normal as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deep = new THREE.Color(HORNY_SKIN_DEEP)
  const shadow = new THREE.Color(HORNY_SKIN_SHADOW)
  const base = new THREE.Color(HORNY_SKIN_BASE)
  const mid = new THREE.Color(HORNY_SKIN_MID)
  const light = new THREE.Color(HORNY_SKIN_LIGHT)
  const color = new THREE.Color()

  for (let index = 0; index < position.count; index += 3) {
    const x = (position.getX(index) + position.getX(index + 1) + position.getX(index + 2)) / 3
    const y = (position.getY(index) + position.getY(index + 1) + position.getY(index + 2)) / 3
    const z = (position.getZ(index) + position.getZ(index + 1) + position.getZ(index + 2)) / 3
    const normalY = (normal.getY(index) + normal.getY(index + 1) + normal.getY(index + 2)) / 3
    const noise = triangleNoise(index / 3, x, y, z)

    color.copy(opening ? shadow : base)
    if (normalY > 0.38) color.lerp(opening ? mid : light, opening ? 0.22 : 0.26)
    if (normalY < -0.28) color.lerp(deep, 0.34)
    if (noise < 0.16) color.lerp(deep, opening ? 0.34 : 0.075)
    if (noise > 0.78) color.lerp(mid, opening ? 0.18 : 0.09)
    if (!opening && z < -0.28) color.lerp(mid, 0.08)

    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = (index + vertex) * 3
      colors[offset] = color.r
      colors[offset + 1] = color.g
      colors[offset + 2] = color.b
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function createHornyShellGeometry() {
  const indexed = new THREE.SphereGeometry(1, 40, 26)
  const position = indexed.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const angle = Math.atan2(z, x)
    const crown = smoothstep01((y - 0.08) / 0.86)
    const lower = smoothstep01((-y - 0.18) / 0.74)
    const temple = Math.exp(-((Math.abs(x) - 0.54) ** 2) / 0.055) * Math.exp(-((y - 0.31) ** 2) / 0.12)
    const fleshyRoll = 1
      + Math.sin(angle * 4.0 + y * 3.8 + 0.5) * 0.013
      + Math.cos(angle * 7.0 - y * 4.6) * 0.007
    const crownTaper = 1 - crown * 0.035
    const lowerSettle = 1 + lower * 0.055

    let nextX = x * 0.82 * fleshyRoll * crownTaper * lowerSettle * (1 + temple * 0.048)
    let nextY = -0.03 + y * 0.715 + crown * 0.018 - temple * 0.006
    let nextZ = -0.035 + z * 0.675 * fleshyRoll * (1 + (z > 0 ? 0.045 : 0.012))

    nextX += Math.sin(y * 5.2 + z * 2.8) * 0.006
    nextZ += Math.cos(y * 5.8 - x * 3.6) * 0.006

    if (nextY < -0.51) {
      const settle = smoothstep01((-nextY - 0.51) / 0.18)
      nextY = THREE.MathUtils.lerp(nextY, -0.602 + Math.sin(angle * 5.0) * 0.005, settle * 0.9)
      nextX *= 1 + settle * 0.03
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
      + Math.pow(Math.abs((centerY + 0.045) / 0.355), 3.2)

    if (centerZ < -0.475 && aperture < 1.035) continue

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
  applyHornySkinColors(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createHornyOpeningGeometry() {
  const segments = 64
  const tubeSegments = 10
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const lower = Math.max(0, -Math.sin(angle))
    const upper = Math.max(0, Math.sin(angle))
    const side = Math.abs(Math.cos(angle))
    const organic = 1 + Math.sin(angle * 3.0 + 0.4) * 0.008 + Math.cos(angle * 7.0) * 0.004
    const point = superellipsePoint(angle, 0.48 + side * 0.012, 0.36 + lower * 0.016 - upper * 0.006)

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      const radialRadius = (0.062 + lower * 0.012 + side * 0.008 + upper * 0.006) * organic
      const bodyMelt = Math.max(0, tubeRadial) * (0.085 + side * 0.03 + upper * 0.018)

      vertices.push(
        point.x + Math.cos(angle) * tubeRadial * radialRadius,
        -0.045 + point.y + Math.sin(angle) * tubeRadial * radialRadius - lower * 0.01,
        -0.72 + tubeDepth * (0.048 + side * 0.008) + bodyMelt,
      )
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
  indexed.setIndex(indices)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.computeVertexNormals()
  applyHornySkinColors(geometry, true)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function hornColorAt(t: number, ridgePulse: number, sideShade: number) {
  const root = new THREE.Color(HORNY_HORN_ROOT)
  const shadow = new THREE.Color(HORNY_HORN_SHADOW)
  const base = new THREE.Color(HORNY_HORN_BASE)
  const light = new THREE.Color(HORNY_HORN_LIGHT)
  const tip = new THREE.Color(HORNY_HORN_TIP)
  const color = new THREE.Color()

  if (t < 0.16) color.lerpColors(root, shadow, smoothstep01(t / 0.16))
  else if (t < 0.58) color.lerpColors(shadow, base, smoothstep01((t - 0.16) / 0.42))
  else if (t < 0.84) color.lerpColors(base, light, smoothstep01((t - 0.58) / 0.26))
  else color.lerpColors(light, tip, smoothstep01((t - 0.84) / 0.16))

  color.lerp(root, ridgePulse * 0.16 * (1 - t))
  color.offsetHSL(0, 0, sideShade * 0.055)
  return color
}

function createSweptHornGeometry(spec: HornSpec) {
  const random = mulberry32(spec.seed)
  const curve = new THREE.CatmullRomCurve3(
    spec.points.map((point) => new THREE.Vector3(...point)),
    false,
    'centripetal',
    0.5,
  )
  const ringCount = spec.points.length > 5 ? 34 : 22
  const sides = spec.points.length > 5 ? 12 : 10
  const vertices: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const worldForward = new THREE.Vector3(0, 0, 1)
  const worldUp = new THREE.Vector3(0, 1, 0)
  const normalA = new THREE.Vector3()
  const normalB = new THREE.Vector3()
  const previousNormalA = new THREE.Vector3()

  for (let ring = 0; ring <= ringCount; ring += 1) {
    const t = ring / ringCount
    const center = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t).normalize()
    const reference = Math.abs(tangent.dot(worldForward)) > 0.92 ? worldUp : worldForward
    normalA.crossVectors(tangent, reference).normalize()
    normalB.crossVectors(normalA, tangent).normalize()

    if (ring > 0 && normalA.dot(previousNormalA) < 0) {
      normalA.negate()
      normalB.negate()
    }
    previousNormalA.copy(normalA)

    const ridgePhase = (t * spec.ridgeCount) % 1
    const ridgePulse = Math.exp(-((ridgePhase - 0.22) ** 2) / 0.018) * (1 - smoothstep01((t - 0.7) / 0.3))
    const taper = 0.025 + 0.975 * Math.pow(1 - t, 0.68)
    const radius = spec.baseRadius * taper * (1 + ridgePulse * 0.17)

    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2
      const irregularity = 1
        + Math.sin(angle * 3 + spec.seed) * 0.018
        + Math.sin(t * 18 + side * 1.7) * 0.01
        + (random() - 0.5) * 0.012
      const radial = Math.cos(angle) * radius * irregularity
      const depth = Math.sin(angle) * radius * 0.88 * irregularity
      const vertex = center.clone().addScaledVector(normalA, radial).addScaledVector(normalB, depth)
      const color = hornColorAt(t, ridgePulse, Math.sin(angle))

      vertices.push(vertex.x, vertex.y, vertex.z)
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let ring = 0; ring < ringCount; ring += 1) {
    for (let side = 0; side < sides; side += 1) {
      const nextSide = (side + 1) % sides
      const base = ring * sides + side
      const nextRing = (ring + 1) * sides + side
      indices.push(base, nextRing, ring * sides + nextSide)
      indices.push(ring * sides + nextSide, nextRing, (ring + 1) * sides + nextSide)
    }
  }

  const startCenter = curve.getPointAt(0)
  const endCenter = curve.getPointAt(1)
  const endTangent = curve.getTangentAt(1).normalize()
  const bottomCenter = vertices.length / 3
  vertices.push(startCenter.x, startCenter.y, startCenter.z)
  colors.push(...new THREE.Color(HORNY_HORN_ROOT).toArray())
  const tipCenter = vertices.length / 3
  const tipPoint = endCenter.clone().addScaledVector(endTangent, spec.baseRadius * 0.32)
  vertices.push(tipPoint.x, tipPoint.y, tipPoint.z)
  colors.push(...new THREE.Color(HORNY_HORN_TIP).toArray())

  for (let side = 0; side < sides; side += 1) {
    const nextSide = (side + 1) % sides
    indices.push(bottomCenter, nextSide, side)
    const lastRing = ringCount * sides
    indices.push(lastRing + side, lastRing + nextSide, tipCenter)
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

const HORNY_SKIN_VERTEX_SHADER = /* glsl */ `
  attribute vec3 color;

  varying vec3 vSkinColor;
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vSkinColor = color;
    vLocalPosition = position;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const HORNY_SKIN_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uDeepColor;
  uniform vec3 uLightColor;

  varying vec3 vSkinColor;
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.46, 0.82, 0.38));
    float lightAmount = dot(normalize(vViewNormal), lightDirection) * 0.5 + 0.5;
    float lightBand = mix(0.7, 0.87, step(0.32, lightAmount));
    lightBand = mix(lightBand, 1.06, step(0.72, lightAmount));

    float grain = sin(dot(vLocalPosition, vec3(83.0, 67.0, 59.0)))
      * sin(dot(vLocalPosition, vec3(47.0, 101.0, 73.0)));
    float pore = smoothstep(0.72, 0.94, grain) * 0.11;
    float foldA = abs(sin(vLocalPosition.y * 12.0 + vLocalPosition.x * 5.4 + sin(vLocalPosition.z * 7.0) * 0.65));
    float foldGate = step(0.54, sin(dot(vLocalPosition, vec3(13.0, 17.0, 19.0))));
    float fold = (1.0 - smoothstep(0.0, 0.055, foldA)) * foldGate * 0.16;

    vec3 skinColor = vSkinColor * lightBand;
    skinColor = mix(skinColor, uDeepColor, pore + fold);
    skinColor = mix(skinColor, uLightColor, step(0.84, lightAmount) * pore * 0.18);

    gl_FragColor = vec4(skinColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function HornySkinMaterial() {
  const uniforms = useMemo(
    () => ({
      uDeepColor: { value: new THREE.Color(HORNY_SKIN_DEEP) },
      uLightColor: { value: new THREE.Color(HORNY_SKIN_LIGHT) },
    }),
    [],
  )

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={HORNY_SKIN_VERTEX_SHADER}
      fragmentShader={HORNY_SKIN_FRAGMENT_SHADER}
      side={THREE.FrontSide}
      depthTest
      depthWrite
      dithering
    />
  )
}

function SweptDevilHorn({ spec }: { spec: HornSpec }) {
  const geometry = useMemo(() => createSweptHornGeometry(spec), [spec])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <OutlineMesh
      name={`horny-shell-swept-horn-${spec.id}`}
      outlineWidth={spec.outlineWidth}
      outlineColor={HORNY_INK}
      geometry={<primitive object={geometry} attach="geometry" />}
      material={(
        <meshToonMaterial
          vertexColors
          side={THREE.FrontSide}
          depthTest
          depthWrite
        />
      )}
    />
  )
}

export function HornyShell({ fitted = false }: HornyShellProps) {
  const geometry = useMemo(() => createHornyShellGeometry(), [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group name="horny-shell-devil-skin-body">
      <OutlineMesh
        name="horny-shell-leathery-crimson-body"
        outlineWidth={fitted ? 0.044 : 0.054}
        outlineColor={HORNY_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<HornySkinMaterial />}
      />
      <group name="horny-shell-swept-ridged-horn-crown">
        {HORN_SPECS.map((spec) => <SweptDevilHorn key={spec.id} spec={spec} />)}
      </group>
    </group>
  )
}

export function HornyShellOpeningLip() {
  const geometry = useMemo(() => createHornyOpeningGeometry(), [])
  const sealGeometry = useMemo(() => {
    const seal = createShellOpeningSealGeometry({
      segments: 64,
      rings: 6,
      centerY: -0.045,
      frontXRadius: 0.535,
      frontYRadius: 0.397,
      backXRadius: 0.558,
      backYRadius: 0.426,
      frontZ: -0.625,
      backZ: -0.42,
      xCurve: 0.61,
      yCurve: 0.68,
      lowerDrop: 0.01,
      sideDepth: 0.012,
      surfaceRipple: 0.004,
      ripplePhase: 0.4,
    })
    applyHornySkinColors(seal, true)
    return seal
  }, [])

  useEffect(() => () => {
    geometry.dispose()
    sealGeometry.dispose()
  }, [geometry, sealGeometry])

  return (
    <group name="horny-shell-true-face-aperture">
      <mesh name="horny-shell-continuous-aperture-seal">
        <primitive object={sealGeometry} attach="geometry" />
        <HornySkinMaterial />
      </mesh>
      <OutlineMesh
        name="horny-shell-integrated-devil-skin-lip"
        outlineWidth={0.017}
        outlineColor={HORNY_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<HornySkinMaterial />}
      />
    </group>
  )
}
