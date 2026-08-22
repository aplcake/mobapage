import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

export const APE_SKIN_BASE = '#6d4a35'
export const APE_SKIN_SHADE = '#34221a'
export const APE_SKIN_LIGHT = '#b9855d'
export const APE_HAND_BASE = '#5c3b2b'

const APE_FUR_INK = '#241610'
const APE_FUR_DARK = '#3d281e'
const APE_FUR_MID = '#6a4732'
const APE_FUR_LIGHT = '#9b6d4c'
const APE_MUZZLE = '#82644f'
const APE_MUZZLE_LIGHT = '#b58866'
const APE_MUZZLE_SHADE = '#50372b'

const FACE_FIBER_COUNT = 2300
const HAND_FIBER_COUNT = 720
const BODY_FIBER_COUNT = 5600
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export type ApeSkinAnimation = 'idle' | 'hop' | 'grumble'

type FaceMode = 'fitted' | 'standalone' | 'wizard'

type FaceMetric = {
  center: [number, number, number]
  radius: [number, number, number]
  detailScale: number
}

const FACE_METRICS: Record<FaceMode, FaceMetric> = {
  fitted: {
    center: [0.006, -0.026, -0.35],
    radius: [0.56, 0.432, 0.38],
    detailScale: 1,
  },
  standalone: {
    center: [0, -0.02, -0.28],
    radius: [0.43, 0.43, 0.43],
    detailScale: 0.84,
  },
  wizard: {
    center: [0, -0.058, -0.642],
    radius: [0.414, 0.334, 0.066],
    detailScale: 0.76,
  },
}

type FurKind =
  | { type: 'face'; mode: FaceMode }
  | {
      type: 'body'
      center: [number, number, number]
      radius: number
    }
  | {
      type: 'hand'
      side: -1 | 1
      center: [number, number, number]
      scale: [number, number, number]
    }

type ApeFaceTreatmentProps = {
  fitted?: boolean
  wizard?: boolean
  activity?: number
  animation?: ApeSkinAnimation
}

type ApeHandTreatmentProps = {
  side: -1 | 1
  center?: [number, number, number]
  scale?: [number, number, number]
  rotationZ?: number
  activity?: number
  animation?: ApeSkinAnimation
}

type ApeBodyTreatmentProps = {
  surfaceGeometry: THREE.BufferGeometry
  center: [number, number, number]
  radius: number
  activity?: number
  animation?: ApeSkinAnimation
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

function createCrossRibbonFiberGeometry() {
  const segments = 6
  const positions: number[] = []
  const indices: number[] = []

  for (let ribbon = 0; ribbon < 2; ribbon += 1) {
    const angle = ribbon * Math.PI * 0.5
    const axisX = Math.cos(angle)
    const axisZ = Math.sin(angle)
    const baseIndex = positions.length / 3

    for (let segment = 0; segment <= segments; segment += 1) {
      const t = segment / segments
      positions.push(-axisX, t, -axisZ, axisX, t, axisZ)
    }

    for (let segment = 0; segment < segments; segment += 1) {
      const row = baseIndex + segment * 2
      indices.push(row, row + 2, row + 1, row + 2, row + 3, row + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  return geometry
}

function createEllipsoidSurfaceGeometry(
  center: [number, number, number],
  scale: [number, number, number],
  rotationZ = 0,
) {
  const geometry = new THREE.SphereGeometry(1, 28, 18)
  geometry.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(...center),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rotationZ)),
      new THREE.Vector3(...scale),
    ),
  )
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createFaceSurfaceGeometry(mode: FaceMode) {
  const metric = FACE_METRICS[mode]
  return createEllipsoidSurfaceGeometry(metric.center, metric.radius)
}

function faceSurfaceZ(mode: FaceMode, x: number, y: number, lift = 0.003) {
  const metric = FACE_METRICS[mode]
  const normalizedX = (x - metric.center[0]) / metric.radius[0]
  const normalizedY = (y - metric.center[1]) / metric.radius[1]
  const depth = Math.sqrt(Math.max(0.08, 1 - normalizedX * normalizedX - normalizedY * normalizedY))
  return metric.center[2] - metric.radius[2] * depth - lift
}

function createApeBareFaceBoundary(mode: FaceMode, segments = 40) {
  const metric = FACE_METRICS[mode]
  const scale = metric.detailScale
  const points: [number, number][] = []

  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2
    const cosine = Math.cos(angle)
    const sine = Math.sin(angle)
    const topAmount = Math.max(0, sine)
    const bottomAmount = Math.max(0, -sine)
    const centerNotch = topAmount * Math.pow(Math.max(0, 1 - Math.abs(cosine) / 0.42), 2)
    const sideLobeLift = topAmount * Math.pow(Math.abs(cosine), 1.35) * 0.024
    const jawTaper = 1 - bottomAmount * 0.31
    const upperBreadth = 1 + topAmount * 0.07
    const width = 0.302 * scale * jawTaper * upperBreadth
    const height = (sine >= 0 ? 0.288 : 0.338) * scale

    points.push([
      metric.center[0] + cosine * width,
      metric.center[1] + sine * height - centerNotch * 0.12 * scale + sideLobeLift * scale,
    ])
  }

  return points
}

const APE_BARE_FACE_BOUNDARIES: Record<FaceMode, [number, number][]> = {
  fitted: createApeBareFaceBoundary('fitted'),
  standalone: createApeBareFaceBoundary('standalone'),
  wizard: createApeBareFaceBoundary('wizard'),
}

function isInsideApeBareFace(root: THREE.Vector3, mode: FaceMode) {
  const boundary = APE_BARE_FACE_BOUNDARIES[mode]
  let inside = false

  for (let current = 0, previous = boundary.length - 1; current < boundary.length; previous = current, current += 1) {
    const [currentX, currentY] = boundary[current]
    const [previousX, previousY] = boundary[previous]
    const crossesY = currentY > root.y !== previousY > root.y
    const edgeX = ((previousX - currentX) * (root.y - currentY)) / (previousY - currentY || 0.00001) + currentX
    if (crossesY && root.x < edgeX) inside = !inside
  }

  return inside
}

function createApeBareFaceGeometry(mode: FaceMode) {
  const metric = FACE_METRICS[mode]
  const scale = metric.detailScale
  const boundary = APE_BARE_FACE_BOUNDARIES[mode]
  const rings = 8
  const positions: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const baseColor = new THREE.Color(APE_MUZZLE)
  const lightColor = new THREE.Color(APE_MUZZLE_LIGHT)
  const shadeColor = new THREE.Color(APE_MUZZLE_SHADE)
  const vertexColor = new THREE.Color()
  const centerY = metric.center[1] - 0.035 * scale

  positions.push(metric.center[0], centerY, faceSurfaceZ(mode, metric.center[0], centerY) - 0.018 * scale)
  colors.push(baseColor.r, baseColor.g, baseColor.b)
  uvs.push(0.5, 0.5)

  for (let ring = 1; ring <= rings; ring += 1) {
    const radial = ring / rings
    const edgeFade = Math.pow(1 - radial, 0.62)

    for (let segment = 0; segment < boundary.length; segment += 1) {
      const [boundaryX, boundaryY] = boundary[segment]
      const x = THREE.MathUtils.lerp(metric.center[0], boundaryX, radial)
      const y = THREE.MathUtils.lerp(centerY, boundaryY, radial)
      const localX = (x - metric.center[0]) / scale
      const localY = (y - metric.center[1]) / scale
      const muzzle = Math.exp(-Math.pow(localX / 0.19, 2) - Math.pow((localY + 0.125) / 0.15, 2))
      const leftCheek = Math.exp(-Math.pow((localX + 0.17) / 0.105, 2) - Math.pow((localY + 0.025) / 0.13, 2))
      const rightCheek = Math.exp(-Math.pow((localX - 0.17) / 0.105, 2) - Math.pow((localY + 0.025) / 0.13, 2))
      const leftOrbit = Math.exp(-Math.pow((localX + 0.12) / 0.105, 2) - Math.pow((localY - 0.102) / 0.067, 2))
      const rightOrbit = Math.exp(-Math.pow((localX - 0.12) / 0.105, 2) - Math.pow((localY - 0.102) / 0.067, 2))
      const bridge = Math.exp(-Math.pow(localX / 0.058, 2) - Math.pow((localY - 0.005) / 0.14, 2))
      const orbit = Math.max(leftOrbit, rightOrbit)
      const cheek = Math.max(leftCheek, rightCheek)
      const jaw = Math.exp(-Math.pow(localX / 0.14, 2) - Math.pow((localY + 0.255) / 0.062, 2))
      const relief = edgeFade * (muzzle * 0.06 + cheek * 0.021 + orbit * 0.013 + bridge * 0.009) * scale
      const z = faceSurfaceZ(mode, x, y) - relief

      positions.push(x, y, z)
      vertexColor.copy(baseColor).lerp(lightColor, Math.min(0.82, muzzle * 0.78 + cheek * 0.16))
      vertexColor.lerp(shadeColor, Math.min(0.5, orbit * 0.42 + jaw * 0.2))
      colors.push(vertexColor.r, vertexColor.g, vertexColor.b)
      uvs.push(
        THREE.MathUtils.clamp((localX + 0.32) / 0.64, 0, 1),
        THREE.MathUtils.clamp((localY + 0.37) / 0.68, 0, 1),
      )
    }
  }

  for (let segment = 0; segment < boundary.length; segment += 1) {
    indices.push(0, 1 + ((segment + 1) % boundary.length), 1 + segment)
  }

  for (let ring = 1; ring < rings; ring += 1) {
    const currentStart = 1 + (ring - 1) * boundary.length
    const nextStart = currentStart + boundary.length
    for (let segment = 0; segment < boundary.length; segment += 1) {
      const nextSegment = (segment + 1) % boundary.length
      indices.push(
        currentStart + segment,
        currentStart + nextSegment,
        nextStart + segment,
        currentStart + nextSegment,
        nextStart + nextSegment,
        nextStart + segment,
      )
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function faceFiberLengthScale(root: THREE.Vector3, mode: FaceMode) {
  const centerY = mode === 'wizard' ? -0.058 : -0.026
  const radiusX = mode === 'standalone' ? 0.37 : 0.405
  const radiusY = mode === 'standalone' ? 0.36 : mode === 'wizard' ? 0.305 : 0.33
  const radial = Math.hypot(root.x / radiusX, (root.y - centerY) / radiusY)
  const frame = THREE.MathUtils.smoothstep(radial, 0.46, 1.02)
  const crown = THREE.MathUtils.smoothstep(root.y, 0.1, 0.26)
  const jaw = THREE.MathUtils.smoothstep(-root.y, 0.15, 0.31)
  const sideburn = THREE.MathUtils.smoothstep(Math.abs(root.x), radiusX * 0.58, radiusX * 0.96)
    * THREE.MathUtils.smoothstep(-root.y, 0.015, 0.28)
  return 0.44 + frame * 0.58 + crown * 0.18 + jaw * 0.08 + sideburn * 0.24
}

function bodyFiberLengthScale(root: THREE.Vector3, kind: Extract<FurKind, { type: 'body' }>) {
  const localY = (root.y - kind.center[1]) / kind.radius
  const localZ = (root.z - kind.center[2]) / kind.radius
  const crown = THREE.MathUtils.smoothstep(localY, 0.12, 0.92)
  const nape = THREE.MathUtils.smoothstep(localZ, 0.02, 0.92)
  const lowerFluff = THREE.MathUtils.smoothstep(-localY, 0.2, 0.9)
  return 0.82 + crown * 0.18 + nape * 0.12 + lowerFluff * 0.06
}

function acceptsFurRoot(root: THREE.Vector3, normal: THREE.Vector3, kind: FurKind) {
  if (kind.type === 'hand') {
    const localX = root.x - kind.center[0]
    return localX * kind.side > -kind.scale[0] * 0.74
  }

  if (kind.type === 'body') {
    const localX = (root.x - kind.center[0]) / (kind.radius * 0.7)
    const localY = (root.y - kind.center[1] + kind.radius * 0.02) / (kind.radius * 0.62)
    const faceAperture = localX * localX + localY * localY
    const facesFront = normal.z < -0.18 && root.z < kind.center[2] - kind.radius * 0.32
    return !(facesFront && faceAperture < 1)
  }

  const mode = kind.mode
  const frontThreshold = mode === 'fitted' ? -0.545 : mode === 'standalone' ? -0.49 : -0.648
  if (root.z > frontThreshold || normal.z > -0.08) return false

  const centerY = mode === 'wizard' ? -0.058 : -0.026
  const apertureX = mode === 'standalone' ? 0.42 : 0.43
  const apertureY = mode === 'standalone' ? 0.39 : mode === 'wizard' ? 0.32 : 0.345
  const aperture = Math.hypot(root.x / apertureX, (root.y - centerY) / apertureY)
  if (aperture > 1.06) return false
  return !isInsideApeBareFace(root, mode)
}

function createApeFurGeometry(surfaceGeometry: THREE.BufferGeometry, kind: FurKind) {
  const count = kind.type === 'face'
    ? FACE_FIBER_COUNT
    : kind.type === 'body'
      ? BODY_FIBER_COUNT
      : HAND_FIBER_COUNT
  const seed = kind.type === 'face'
    ? 0xa9e0f00d
    : kind.type === 'body'
      ? 0xa9e0b0d1
      : kind.side === -1
        ? 0xa9e0f11d
        : 0xa9e0f22d
  const random = mulberry32(seed)
  const samplingMesh = new THREE.Mesh(surfaceGeometry)
  const sampler = new MeshSurfaceSampler(samplingMesh) as MeshSurfaceSampler & {
    setRandomGenerator: (randomFunction: () => number) => MeshSurfaceSampler
  }
  sampler.setRandomGenerator(random).build()

  const fiber = createCrossRibbonFiberGeometry()
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.index = fiber.index
  geometry.setAttribute('position', fiber.getAttribute('position'))

  const roots = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)
  const tangents = new Float32Array(count * 3)
  const lengths = new Float32Array(count)
  const widths = new Float32Array(count)
  const phases = new Float32Array(count)
  const shades = new Float32Array(count)
  const stiffness = new Float32Array(count)

  const root = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const randomTangent = new THREE.Vector3()
  const gravity = new THREE.Vector3(0, -1, 0)
  const reference = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()

  let accepted = 0
  let attempts = 0
  while (accepted < count && attempts < count * 80) {
    attempts += 1
    sampler.sample(root, normal)
    normal.normalize()
    if (!acceptsFurRoot(root, normal, kind)) continue

    tangent.copy(gravity).addScaledVector(normal, -gravity.dot(normal))
    if (tangent.lengthSq() < 0.001) {
      reference.set(Math.abs(normal.y) > 0.86 ? 1 : 0, Math.abs(normal.y) > 0.86 ? 0 : 1, 0)
      tangent.crossVectors(reference, normal)
    }
    tangent.normalize()
    reference.set(0, 1, 0)
    if (Math.abs(normal.y) > 0.88) reference.set(1, 0, 0)
    randomTangent.crossVectors(reference, normal).normalize()
    quaternion.setFromAxisAngle(normal, (accepted * GOLDEN_ANGLE) % (Math.PI * 2))
    randomTangent.applyQuaternion(quaternion)
    tangent.lerp(randomTangent, kind.type === 'face' ? 0.32 : kind.type === 'body' ? 0.25 : 0.42).normalize()

    const guard = random() < (kind.type === 'face' ? 0.28 : kind.type === 'body' ? 0.2 : 0.22)
    const lengthScale = kind.type === 'face'
      ? faceFiberLengthScale(root, kind.mode)
      : kind.type === 'body'
        ? bodyFiberLengthScale(root, kind)
        : 1
    const baseLength = kind.type === 'face'
      ? guard
        ? THREE.MathUtils.lerp(0.031, 0.047, random())
        : THREE.MathUtils.lerp(0.018, 0.033, Math.pow(random(), 0.8))
      : kind.type === 'body'
        ? guard
          ? THREE.MathUtils.lerp(0.055, 0.078, random())
          : THREE.MathUtils.lerp(0.031, 0.057, Math.pow(random(), 0.78))
      : guard
        ? THREE.MathUtils.lerp(0.022, 0.034, random())
        : THREE.MathUtils.lerp(0.012, 0.024, Math.pow(random(), 0.85))
    const width = kind.type === 'face'
      ? THREE.MathUtils.lerp(0.0018, guard ? 0.0036 : 0.003, Math.pow(random(), 1.5))
      : kind.type === 'body'
        ? THREE.MathUtils.lerp(0.0023, guard ? 0.0042 : 0.0035, Math.pow(random(), 1.45))
      : THREE.MathUtils.lerp(0.0015, guard ? 0.0032 : 0.0027, Math.pow(random(), 1.65))

    root.addScaledVector(normal, -0.0045)
    roots.set([root.x, root.y, root.z], accepted * 3)
    normals.set([normal.x, normal.y, normal.z], accepted * 3)
    tangents.set([tangent.x, tangent.y, tangent.z], accepted * 3)
    lengths[accepted] = baseLength * lengthScale
    widths[accepted] = width
    phases[accepted] = random()
    shades[accepted] = random()
    stiffness[accepted] = THREE.MathUtils.lerp(0.78, 1.35, random())
    accepted += 1
  }

  geometry.setAttribute('aRoot', new THREE.InstancedBufferAttribute(roots, 3))
  geometry.setAttribute('aNormal', new THREE.InstancedBufferAttribute(normals, 3))
  geometry.setAttribute('aTangent', new THREE.InstancedBufferAttribute(tangents, 3))
  geometry.setAttribute('aLength', new THREE.InstancedBufferAttribute(lengths, 1))
  geometry.setAttribute('aWidth', new THREE.InstancedBufferAttribute(widths, 1))
  geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1))
  geometry.setAttribute('aShade', new THREE.InstancedBufferAttribute(shades, 1))
  geometry.setAttribute('aStiffness', new THREE.InstancedBufferAttribute(stiffness, 1))
  geometry.instanceCount = accepted
  geometry.boundingSphere = surfaceGeometry.boundingSphere?.clone() ?? new THREE.Sphere(new THREE.Vector3(), 1)
  geometry.boundingSphere.radius += 0.08
  geometry.boundingBox = surfaceGeometry.boundingBox?.clone() ?? new THREE.Box3().setFromBufferAttribute(
    surfaceGeometry.getAttribute('position') as THREE.BufferAttribute,
  )
  geometry.boundingBox.expandByScalar(0.08)
  fiber.dispose()
  return geometry
}

const APE_FUR_VERTEX_SHADER = /* glsl */ `
  attribute vec3 aRoot;
  attribute vec3 aNormal;
  attribute vec3 aTangent;
  attribute float aLength;
  attribute float aWidth;
  attribute float aPhase;
  attribute float aShade;
  attribute float aStiffness;

  uniform float uTime;
  uniform float uActivity;
  uniform vec3 uForce;

  varying float vAcross;
  varying float vShade;
  varying float vTip;
  varying vec3 vFurNormal;

  void main() {
    float t = position.y;
    float tipWeight = t * t * (3.0 - 2.0 * t);
    float taper = mix(1.0, 0.04, pow(t, 0.78));
    vec3 normal = normalize(aNormal);
    vec3 tangent = normalize(aTangent - normal * dot(aTangent, normal));
    vec3 bitangent = normalize(cross(normal, tangent));
    vec3 ribbonDirection = tangent * position.x + bitangent * position.z;
    vec3 ribbonOffset = ribbonDirection * aWidth * taper;

    vec3 gravity = vec3(0.0, -1.0, 0.0);
    vec3 surfaceDroop = gravity - normal * dot(gravity, normal);
    vec3 comb = tangent * aLength * (0.3 + sin(aPhase * 18.8496) * 0.09);
    vec3 droop = surfaceDroop * aLength * 0.22;
    float waveA = sin(uTime * 1.35 + aPhase * 18.8496 + dot(aRoot, vec3(5.1, 7.4, 3.8)));
    float waveB = sin(uTime * 2.1 + aPhase * 9.4248 - dot(aRoot, vec3(3.2, 4.3, 6.6)));
    vec3 microMotion = (tangent * waveA + bitangent * waveB * 0.48)
      * (0.0016 + aLength * 0.018)
      * uActivity
      / max(0.65, aStiffness);

    vec3 center = aRoot
      + normal * (t * aLength * (1.0 - tipWeight * 0.22))
      + (comb + droop) * tipWeight
      + uForce * tipWeight * t / max(0.62, aStiffness)
      + microMotion * tipWeight;

    vec3 animatedNormal = normalize(normal + ribbonDirection * 0.2 - droop * tipWeight * 0.7 + uForce * tipWeight * 1.1);
    vAcross = position.x + position.z;
    vShade = aShade;
    vTip = t;
    vFurNormal = normalize(normalMatrix * animatedNormal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(center + ribbonOffset, 1.0);
  }
`

const APE_FUR_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uInkColor;
  uniform vec3 uDarkColor;
  uniform vec3 uMidColor;
  uniform vec3 uLightColor;

  varying float vAcross;
  varying float vShade;
  varying float vTip;
  varying vec3 vFurNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.38, 0.78, 0.5));
    float lightAmount = dot(normalize(vFurNormal), lightDirection) * 0.5 + 0.5;
    vec3 furColor = mix(uDarkColor, uMidColor, step(0.34, lightAmount));
    furColor = mix(furColor, uLightColor, step(0.72, lightAmount));
    furColor = mix(furColor, uLightColor, smoothstep(0.82, 0.98, vShade) * 0.24);
    furColor = mix(furColor, uDarkColor, (1.0 - smoothstep(0.0, 0.24, vTip)) * 0.3);
    float edge = smoothstep(0.7, 1.0, abs(vAcross));
    furColor = mix(furColor, uInkColor, edge * 0.18);
    gl_FragColor = vec4(furColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function createApeFurMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uActivity: { value: 1 },
      uForce: { value: new THREE.Vector3() },
      uInkColor: { value: new THREE.Color(APE_FUR_INK) },
      uDarkColor: { value: new THREE.Color(APE_FUR_DARK) },
      uMidColor: { value: new THREE.Color(APE_FUR_MID) },
      uLightColor: { value: new THREE.Color(APE_FUR_LIGHT) },
    },
    vertexShader: APE_FUR_VERTEX_SHADER,
    fragmentShader: APE_FUR_FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true,
    transparent: false,
    dithering: true,
  })
}

function ApeFurField({
  surfaceGeometry,
  kind,
  activity,
  animation,
  name,
}: {
  surfaceGeometry: THREE.BufferGeometry
  kind: FurKind
  activity: number
  animation: ApeSkinAnimation
  name: string
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const initialized = useRef(false)
  const previousPosition = useRef(new THREE.Vector3())
  const previousVelocity = useRef(new THREE.Vector3())
  const springForce = useRef(new THREE.Vector3())
  const springVelocity = useRef(new THREE.Vector3())
  const worldPosition = useMemo(() => new THREE.Vector3(), [])
  const worldVelocity = useMemo(() => new THREE.Vector3(), [])
  const targetForce = useMemo(() => new THREE.Vector3(), [])
  const springDelta = useMemo(() => new THREE.Vector3(), [])
  const furGeometry = useMemo(() => createApeFurGeometry(surfaceGeometry, kind), [kind, surfaceGeometry])
  const furMaterial = useMemo(() => createApeFurMaterial(), [])

  useEffect(() => () => {
    furGeometry.dispose()
    furMaterial.dispose()
  }, [furGeometry, furMaterial])

  useFrame(({ clock }, frameDelta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const delta = Math.min(frameDelta, 1 / 24)
    const time = clock.elapsedTime
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    mesh.getWorldPosition(worldPosition)

    if (!initialized.current) {
      previousPosition.current.copy(worldPosition)
      initialized.current = true
    }

    worldVelocity.copy(worldPosition).sub(previousPosition.current).divideScalar(Math.max(delta, 0.001))
    const isHand = kind.type === 'hand'
    const isBody = kind.type === 'body'
    targetForce.copy(worldVelocity).sub(previousVelocity.current).multiplyScalar(isHand ? -0.00072 : isBody ? -0.00105 : -0.00125)
    targetForce.clampLength(
      0,
      animation === 'hop'
        ? isHand
          ? 0.018
          : isBody
            ? 0.034
            : 0.042
        : isHand
          ? 0.014
          : isBody
            ? 0.024
            : 0.028,
    )
    targetForce.x += Math.sin(time * 0.76 + 0.4) * 0.004 * motion
    targetForce.y += Math.sin(time * 1.12 + 1.3) * 0.0018 * motion
    targetForce.z += Math.cos(time * 0.68 + 0.9) * 0.0032 * motion
    if (animation === 'grumble') targetForce.x += Math.sin(time * 17.5) * (isHand ? 0.003 : 0.006) * motion

    springDelta.copy(targetForce).sub(springForce.current)
    springVelocity.current.addScaledVector(springDelta, 20 * delta)
    springVelocity.current.multiplyScalar(Math.exp(-8.8 * delta))
    springForce.current.addScaledVector(springVelocity.current, delta).clampLength(0, isHand ? 0.022 : isBody ? 0.038 : 0.048)

    furMaterial.uniforms.uTime.value = time
    furMaterial.uniforms.uActivity.value = motion
    furMaterial.uniforms.uForce.value.copy(springForce.current)
    previousPosition.current.copy(worldPosition)
    previousVelocity.current.copy(worldVelocity)
  })

  return (
    <mesh
      ref={meshRef}
      name={name}
      geometry={furGeometry}
      material={furMaterial}
      frustumCulled={false}
      renderOrder={3}
    />
  )
}

export function ApeBodyTreatment({
  surfaceGeometry,
  center,
  radius,
  activity = 1,
  animation = 'idle',
}: ApeBodyTreatmentProps) {
  const [centerX, centerY, centerZ] = center
  const furKind = useMemo<FurKind>(
    () => ({ type: 'body', center: [centerX, centerY, centerZ], radius }),
    [centerX, centerY, centerZ, radius],
  )

  return (
    <group name="ape-skin-full-body-soft-fur-treatment">
      <ApeFurField
        surfaceGeometry={surfaceGeometry}
        kind={furKind}
        activity={activity}
        animation={animation}
        name="ape-skin-reactive-wraparound-body-fur"
      />
    </group>
  )
}

function ApeBareFaceMask({ mode }: { mode: FaceMode }) {
  const geometry = useMemo(() => createApeBareFaceGeometry(mode), [mode])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group name={`ape-skin-${mode}-feature-reserved-bare-face-mask`}>
      <OutlineMesh
        name="ape-skin-sculpted-m-shaped-primate-face"
        geometry={<primitive object={geometry} attach="geometry" />}
        outlineWidth={0.003}
        outlineColor={APE_FUR_DARK}
        material={<meshBasicMaterial color="#ffffff" vertexColors side={THREE.DoubleSide} />}
      />
    </group>
  )
}

export function ApeFaceTreatment({
  fitted = false,
  wizard = false,
  activity = 1,
  animation = 'idle',
}: ApeFaceTreatmentProps) {
  const mode: FaceMode = wizard ? 'wizard' : fitted ? 'fitted' : 'standalone'
  const surfaceGeometry = useMemo(() => createFaceSurfaceGeometry(mode), [mode])
  const furKind = useMemo<FurKind>(() => ({ type: 'face', mode }), [mode])

  useEffect(() => () => surfaceGeometry.dispose(), [surfaceGeometry])

  return (
    <group name={`ape-skin-${mode}-short-fur-face-treatment`}>
      <ApeFurField
        surfaceGeometry={surfaceGeometry}
        kind={furKind}
        activity={activity}
        animation={animation}
        name={`ape-skin-${mode}-reactive-short-fur-field`}
      />
      <ApeBareFaceMask mode={mode} />
    </group>
  )
}

export function ApeHandTreatment({
  side,
  center = [0, 0, 0],
  scale = [0.18, 0.18, 0.18],
  rotationZ = 0,
  activity = 1,
  animation = 'idle',
}: ApeHandTreatmentProps) {
  const [centerX, centerY, centerZ] = center
  const [scaleX, scaleY, scaleZ] = scale
  const surfaceGeometry = useMemo(
    () => createEllipsoidSurfaceGeometry([centerX, centerY, centerZ], [scaleX, scaleY, scaleZ], rotationZ),
    [centerX, centerY, centerZ, rotationZ, scaleX, scaleY, scaleZ],
  )
  const furKind = useMemo<FurKind>(
    () => ({ type: 'hand', side, center: [centerX, centerY, centerZ], scale: [scaleX, scaleY, scaleZ] }),
    [centerX, centerY, centerZ, scaleX, scaleY, scaleZ, side],
  )
  const palmZ = centerZ - scaleZ * 0.93

  useEffect(() => () => surfaceGeometry.dispose(), [surfaceGeometry])

  return (
    <group name={`ape-skin-${side === -1 ? 'left' : 'right'}-furred-hand-treatment`}>
      <ApeFurField
        surfaceGeometry={surfaceGeometry}
        kind={furKind}
        activity={activity}
        animation={animation}
        name={`ape-skin-${side === -1 ? 'left' : 'right'}-reactive-hand-fur`}
      />
      <mesh
        name="ape-skin-narrow-bare-primate-palm"
        position={[centerX + side * scaleX * 0.04, centerY - scaleY * 0.1, palmZ]}
        rotation-z={rotationZ + side * -0.14}
        scale={[scaleX * 0.36, scaleY * 0.56, Math.max(0.008, scaleZ * 0.07)]}
      >
        <sphereGeometry args={[1, 12, 7]} />
        <meshToonMaterial color={APE_SKIN_BASE} />
      </mesh>
      <mesh
        position={[centerX - side * scaleX * 0.035, centerY + scaleY * 0.055, palmZ - 0.006]}
        rotation-z={rotationZ + side * -0.34}
        scale={[scaleX * 0.12, scaleY * 0.035, 0.004]}
      >
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={APE_FUR_MID} />
      </mesh>
      <mesh
        position={[centerX + side * scaleX * 0.035, centerY - scaleY * 0.13, palmZ - 0.007]}
        rotation-z={rotationZ + side * 0.42}
        scale={[scaleX * 0.16, scaleY * 0.028, 0.004]}
      >
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={APE_SKIN_SHADE} />
      </mesh>
    </group>
  )
}
