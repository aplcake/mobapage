import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

export const GUARD_INK = '#171820'
export const GUARD_STEEL_DEEP = '#343842'
export const GUARD_STEEL_SHADOW = '#4b505b'
export const GUARD_STEEL_BASE = '#676d78'
export const GUARD_STEEL_MID = '#858b96'
export const GUARD_STEEL_LIGHT = '#b8bec7'
export const GUARD_BRASS = '#c69b43'
export const GUARD_BRASS_LIGHT = '#f1cd69'
export const GUARD_CREST_DARK = '#751d24'
export const GUARD_CREST_BASE = '#a72b31'
export const GUARD_CREST_MID = '#d74339'
export const GUARD_CREST_LIGHT = '#f36b4e'

const GUARD_CREST_FIBER_COUNT = 6200

type GuardAnimation = 'idle' | 'hop' | 'grumble'

type GuardShellProps = {
  fitted?: boolean
  activity?: number
  animation?: GuardAnimation
  hasHeadAccessory?: boolean
}

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

function createGuardHelmetGeometry() {
  const indexed = new THREE.SphereGeometry(1, 42, 28)
  const position = indexed.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const angle = Math.atan2(z, x)
    const crown = smoothstep01((y - 0.12) / 0.78)
    const shoulder = Math.exp(-((y - 0.03) ** 2) / 0.19)
    const lower = smoothstep01((-y - 0.18) / 0.7)
    const hammered = 1
      + Math.sin(angle * 7.0 + y * 4.7) * 0.009
      + Math.cos(angle * 11.0 - y * 5.1) * 0.005
    const crownTaper = 1 - crown * 0.085
    const lowerFlare = 1 + lower * 0.045

    let nextX = x * 0.805 * hammered * crownTaper * lowerFlare * (1 + shoulder * 0.025)
    let nextY = -0.018 + y * 0.71 + crown * 0.026
    let nextZ = -0.025 + z * 0.655 * hammered * (1 + lower * 0.035)

    nextX += Math.sin(y * 5.5 + z * 2.1) * 0.005
    nextZ += Math.cos(y * 4.8 - x * 2.7) * 0.006

    if (nextY < -0.5) {
      const settle = smoothstep01((-nextY - 0.5) / 0.17)
      nextY = THREE.MathUtils.lerp(nextY, -0.592 + Math.sin(angle * 8.0) * 0.004, settle * 0.88)
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
    const centerX = (
      sourcePosition.getX(index)
      + sourcePosition.getX(index + 1)
      + sourcePosition.getX(index + 2)
    ) / 3
    const centerY = (
      sourcePosition.getY(index)
      + sourcePosition.getY(index + 1)
      + sourcePosition.getY(index + 2)
    ) / 3
    const centerZ = (
      sourcePosition.getZ(index)
      + sourcePosition.getZ(index + 1)
      + sourcePosition.getZ(index + 2)
    ) / 3
    const aperture = Math.pow(Math.abs(centerX / 0.455), 3.4)
      + Math.pow(Math.abs((centerY + 0.035) / 0.345), 3.4)

    if (centerZ < -0.455 && aperture < 1.02) continue

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
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function superellipsePoint(angle: number, xRadius: number, yRadius: number) {
  const cosAngle = Math.cos(angle)
  const sinAngle = Math.sin(angle)
  return new THREE.Vector2(
    Math.sign(cosAngle || 1) * Math.pow(Math.abs(cosAngle), 0.59) * xRadius,
    Math.sign(sinAngle || 1) * Math.pow(Math.abs(sinAngle), 0.67) * yRadius,
  )
}

function createGuardOpeningWallGeometry() {
  const segments = 72
  const rings = 5
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings
    const ease = t * t * (3 - 2 * t)

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const lower = Math.max(0, -Math.sin(angle))
      const side = Math.abs(Math.cos(angle))
      const point = superellipsePoint(
        angle,
        THREE.MathUtils.lerp(0.395, 0.5 + side * 0.012, ease),
        THREE.MathUtils.lerp(0.29, 0.385 + lower * 0.015, ease),
      )
      vertices.push(
        point.x,
        -0.035 + point.y - lower * 0.008,
        THREE.MathUtils.lerp(-0.775, -0.505 + side * 0.032, ease),
      )
    }
  }

  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const row = segments + 1
      const base = ring * row + segment
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
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

function createGuardNeckGuardGeometry() {
  const geometry = new THREE.CylinderGeometry(1.075, 1.12, 0.145, 40, 3, false)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const angle = Math.atan2(z, x)
    const frontLift = z < 0 ? 0.014 : -0.004
    position.setXYZ(
      index,
      x * 0.725 * (1 + Math.sin(angle * 6.0) * 0.006),
      -0.565 + y + frontLift,
      z * (z > 0 ? 0.72 : 0.55),
    )
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createBentPlateGeometry(shape: THREE.Shape, depth = 0.075, sideWrap = 0.12) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.015,
    bevelThickness: 0.012,
    curveSegments: 10,
  })
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const wrap = Math.pow(Math.min(1, Math.abs(x) / 0.58), 2) * sideWrap
    position.setZ(index, -0.79 + z + wrap)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createGuardBrowGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.555, 0.2)
  shape.quadraticCurveTo(-0.34, 0.34, 0, 0.37)
  shape.quadraticCurveTo(0.34, 0.34, 0.555, 0.2)
  shape.lineTo(0.52, 0.105)
  shape.quadraticCurveTo(0.3, 0.22, 0, 0.235)
  shape.quadraticCurveTo(-0.3, 0.22, -0.52, 0.105)
  shape.closePath()
  return createBentPlateGeometry(shape, 0.08, 0.13)
}

function createGuardCheekGeometry(side: -1 | 1) {
  const shape = new THREE.Shape()
  const sx = (value: number) => value * side
  shape.moveTo(sx(0.37), 0.225)
  shape.quadraticCurveTo(sx(0.49), 0.28, sx(0.585), 0.16)
  shape.quadraticCurveTo(sx(0.63), -0.07, sx(0.59), -0.31)
  shape.quadraticCurveTo(sx(0.55), -0.43, sx(0.43), -0.49)
  shape.lineTo(sx(0.34), -0.395)
  shape.quadraticCurveTo(sx(0.405), -0.19, sx(0.385), 0.035)
  shape.closePath()
  return createBentPlateGeometry(shape, 0.09, 0.145)
}

function createGuardChinGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.31, -0.38)
  shape.quadraticCurveTo(-0.17, -0.44, 0, -0.43)
  shape.quadraticCurveTo(0.17, -0.44, 0.31, -0.38)
  shape.lineTo(0.265, -0.525)
  shape.quadraticCurveTo(0, -0.57, -0.265, -0.525)
  shape.closePath()
  return createBentPlateGeometry(shape, 0.08, 0.035)
}

function createGuardSeamGeometry(points: [number, number, number][], radius: number) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)))
  return new THREE.TubeGeometry(curve, Math.max(18, points.length * 8), radius, 6, false)
}

function crestRootHeight(z: number) {
  const normalized = THREE.MathUtils.clamp(z / 0.62, -1, 1)
  return 0.69 + (1 - normalized * normalized) * 0.055
}

function createCrestTrackGeometry(startZ: number, endZ: number, radius: number, yOffset: number) {
  const points = Array.from({ length: 8 }, (_, index) => {
    const z = THREE.MathUtils.lerp(startZ, endZ, index / 7)
    return new THREE.Vector3(0, crestRootHeight(z) + yOffset, z)
  })
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, radius, 8, false)
}

function createCrestFiberPrimitive() {
  const segments = 8
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

function createGuardCrestFiberGeometry(hasHeadAccessory: boolean) {
  const random = mulberry32(hasHeadAccessory ? 0x6aa4d003 : 0x6aa4d001)
  const count = hasHeadAccessory ? 4400 : GUARD_CREST_FIBER_COUNT
  const fiber = createCrestFiberPrimitive()
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

  const normal = new THREE.Vector3()
  const tangent = new THREE.Vector3()

  for (let index = 0; index < count; index += 1) {
    const u = random()
    const section = hasHeadAccessory ? (random() < 0.52 ? -1 : 1) : 0
    const z = hasHeadAccessory
      ? section < 0
        ? THREE.MathUtils.lerp(-0.585, -0.285, u)
        : THREE.MathUtils.lerp(0.285, 0.585, u)
      : THREE.MathUtils.lerp(-0.585, 0.585, u)
    const endBlend = THREE.MathUtils.clamp(Math.abs(z) / 0.585, 0, 1)
    const halfWidth = THREE.MathUtils.lerp(0.155, 0.115, endBlend)
    const x = (random() * 2 - 1) * halfWidth * Math.pow(random(), 0.34)
    const arch = Math.max(0, 1 - Math.pow(z / 0.61, 2))
    const rootY = crestRootHeight(z) + 0.018
      + (1 - Math.pow(x / Math.max(halfWidth, 0.001), 2)) * 0.02
    const lengthEnvelope = THREE.MathUtils.lerp(0.29, 0.475, Math.pow(arch, 0.58))

    normal.set(x * 2.35, 1, z * -0.075).normalize()
    tangent.set(0.13 * Math.sin(z * 6.4), 0.035, 1).normalize()

    roots.set([x, rootY - 0.006, z], index * 3)
    normals.set([normal.x, normal.y, normal.z], index * 3)
    tangents.set([tangent.x, tangent.y, tangent.z], index * 3)
    lengths[index] = lengthEnvelope
      * THREE.MathUtils.lerp(0.82, 1.08, Math.pow(random(), 0.72))
    widths[index] = THREE.MathUtils.lerp(0.0038, 0.0069, Math.pow(random(), 1.5))
    phases[index] = random()
    shades[index] = random()
    stiffness[index] = THREE.MathUtils.lerp(0.72, 1.12, random())
  }

  geometry.setAttribute('aRoot', new THREE.InstancedBufferAttribute(roots, 3))
  geometry.setAttribute('aNormal', new THREE.InstancedBufferAttribute(normals, 3))
  geometry.setAttribute('aTangent', new THREE.InstancedBufferAttribute(tangents, 3))
  geometry.setAttribute('aLength', new THREE.InstancedBufferAttribute(lengths, 1))
  geometry.setAttribute('aWidth', new THREE.InstancedBufferAttribute(widths, 1))
  geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1))
  geometry.setAttribute('aShade', new THREE.InstancedBufferAttribute(shades, 1))
  geometry.setAttribute('aStiffness', new THREE.InstancedBufferAttribute(stiffness, 1))
  geometry.instanceCount = count
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.92, 0), 1.02)
  geometry.boundingBox = new THREE.Box3(
    new THREE.Vector3(-0.28, 0.61, -0.72),
    new THREE.Vector3(0.28, 1.36, 0.72),
  )
  fiber.dispose()
  return geometry
}

const GUARD_METAL_VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vLocalPosition = position;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const GUARD_METAL_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uDeepColor;
  uniform vec3 uShadowColor;
  uniform vec3 uBaseColor;
  uniform vec3 uMidColor;
  uniform vec3 uLightColor;

  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.44, 0.8, 0.46));
    float lightAmount = dot(normalize(vViewNormal), lightDirection) * 0.5 + 0.5;
    vec3 metalColor = uBaseColor;
    metalColor = mix(uDeepColor, uShadowColor, step(0.22, lightAmount));
    metalColor = mix(metalColor, uBaseColor, step(0.4, lightAmount));
    metalColor = mix(metalColor, uMidColor, step(0.63, lightAmount));
    metalColor = mix(metalColor, uLightColor, step(0.84, lightAmount));

    float brushed = sin(vLocalPosition.y * 112.0 + vLocalPosition.x * 17.0)
      * sin(vLocalPosition.z * 93.0 - vLocalPosition.x * 11.0);
    float hammered = sin(dot(vLocalPosition, vec3(31.0, 47.0, 39.0)))
      * sin(dot(vLocalPosition, vec3(71.0, 29.0, 53.0)));
    metalColor *= 1.0 + brushed * 0.014 + hammered * 0.01;
    metalColor = mix(metalColor, uLightColor, step(0.965, hammered) * 0.08);

    gl_FragColor = vec4(metalColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const GUARD_CREST_VERTEX_SHADER = /* glsl */ `
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
    float fineTip = tipWeight * t;
    float taper = mix(1.0, 0.045, pow(t, 0.84));
    vec3 normal = normalize(aNormal);
    vec3 tangent = normalize(aTangent - normal * dot(aTangent, normal));
    vec3 bitangent = normalize(cross(normal, tangent));
    vec3 ribbonDirection = tangent * position.x + bitangent * position.z;
    vec3 ribbonOffset = ribbonDirection * aWidth * taper;

    vec3 gravity = vec3(0.0, -1.0, 0.0);
    vec3 surfaceDroop = gravity - normal * dot(gravity, normal);
    vec3 backwardComb = tangent * aLength * (0.055 + sin(aPhase * 12.566) * 0.028);
    vec3 sideComb = bitangent * aLength * sin(aPhase * 18.8496) * 0.042;
    vec3 droop = surfaceDroop * aLength * mix(0.18, 0.34, 1.0 - aStiffness * 0.3);
    float breezeA = sin(uTime * 1.5 + aPhase * 18.8496 + dot(aRoot, vec3(3.2, 7.1, 4.7)));
    float breezeB = sin(uTime * 2.25 + aPhase * 9.4248 - dot(aRoot, vec3(6.1, 2.4, 3.7)));
    vec3 microMotion = (tangent * breezeA + bitangent * breezeB * 0.55)
      * (0.006 + aLength * 0.032)
      * uActivity
      / max(0.62, aStiffness);

    vec3 center = aRoot
      + normal * (t * aLength * (1.0 - tipWeight * 0.24))
      + (backwardComb + sideComb + droop) * tipWeight
      + uForce * fineTip / max(0.58, aStiffness)
      + microMotion * fineTip;

    vec3 animatedNormal = normalize(normal + ribbonDirection * 0.3 - droop * tipWeight * 0.65 + uForce * fineTip * 1.4);
    vAcross = position.x + position.z;
    vShade = aShade;
    vTip = t;
    vFurNormal = normalize(normalMatrix * animatedNormal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(center + ribbonOffset, 1.0);
  }
`

const GUARD_CREST_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uDarkColor;
  uniform vec3 uMidColor;
  uniform vec3 uLightColor;

  varying float vAcross;
  varying float vShade;
  varying float vTip;
  varying vec3 vFurNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.4, 0.8, 0.48));
    float lightAmount = dot(normalize(vFurNormal), lightDirection) * 0.5 + 0.5;
    vec3 furColor = mix(uDarkColor, uMidColor, step(0.32, lightAmount));
    furColor = mix(furColor, uLightColor, step(0.7, lightAmount));
    furColor = mix(furColor, uLightColor, smoothstep(0.82, 0.98, vShade) * 0.24);
    furColor = mix(furColor, uDarkColor, (1.0 - smoothstep(0.0, 0.24, vTip)) * 0.34);
    float edge = smoothstep(0.72, 1.0, abs(vAcross));
    furColor = mix(furColor, uDarkColor, edge * 0.14);
    gl_FragColor = vec4(furColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function GuardMetalMaterial() {
  const uniforms = useMemo(
    () => ({
      uDeepColor: { value: new THREE.Color(GUARD_STEEL_DEEP) },
      uShadowColor: { value: new THREE.Color(GUARD_STEEL_SHADOW) },
      uBaseColor: { value: new THREE.Color(GUARD_STEEL_BASE) },
      uMidColor: { value: new THREE.Color(GUARD_STEEL_MID) },
      uLightColor: { value: new THREE.Color(GUARD_STEEL_LIGHT) },
    }),
    [],
  )

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={GUARD_METAL_VERTEX_SHADER}
      fragmentShader={GUARD_METAL_FRAGMENT_SHADER}
      side={THREE.FrontSide}
      depthTest
      depthWrite
      dithering
    />
  )
}

function createGuardCrestMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uActivity: { value: 1 },
      uForce: { value: new THREE.Vector3() },
      uDarkColor: { value: new THREE.Color(GUARD_CREST_DARK) },
      uMidColor: { value: new THREE.Color(GUARD_CREST_MID) },
      uLightColor: { value: new THREE.Color(GUARD_CREST_LIGHT) },
    },
    vertexShader: GUARD_CREST_VERTEX_SHADER,
    fragmentShader: GUARD_CREST_FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true,
    transparent: false,
    dithering: true,
  })
}

function GuardSeam({
  name,
  points,
  radius = 0.01,
  color = GUARD_STEEL_LIGHT,
}: {
  name: string
  points: [number, number, number][]
  radius?: number
  color?: string
}) {
  const geometry = useMemo(() => createGuardSeamGeometry(points, radius), [points, radius])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh name={name} geometry={geometry}>
      <meshBasicMaterial color={color} depthTest depthWrite />
    </mesh>
  )
}

function GuardCrestBase({ hasHeadAccessory }: { hasHeadAccessory: boolean }) {
  const sections = useMemo(
    () => hasHeadAccessory
      ? [
          { start: -0.535, end: -0.31 },
          { start: 0.31, end: 0.535 },
        ]
      : [{ start: -0.535, end: 0.535 }],
    [hasHeadAccessory],
  )
  const tracks = useMemo(
    () => sections.map((section) => ({
      mount: createCrestTrackGeometry(section.start, section.end, 0.042, -0.018),
      core: createCrestTrackGeometry(section.start, section.end, 0.092, 0.04),
    })),
    [sections],
  )

  useEffect(
    () => () => {
      tracks.forEach((track) => {
        track.mount.dispose()
        track.core.dispose()
      })
    },
    [tracks],
  )

  return (
    <group name="guard-shell-crested-helmet-track">
      {tracks.map((track, index) => (
        <group key={`guard-crest-track-${index}`}>
          <OutlineMesh
            name={`guard-shell-crest-mount-${index}`}
            outlineWidth={0.006}
            outlineColor={GUARD_INK}
            geometry={<primitive object={track.mount} attach="geometry" />}
            material={<meshToonMaterial color={GUARD_STEEL_DEEP} />}
          />
          <OutlineMesh
            name={`guard-shell-red-wool-core-${index}`}
            outlineWidth={0.004}
            outlineColor={GUARD_CREST_DARK}
            geometry={<primitive object={track.core} attach="geometry" />}
            material={<meshToonMaterial color={GUARD_CREST_BASE} />}
          />
        </group>
      ))}
      {([-1, 1] as const).map((end) => {
        const z = end * 0.548
        return (
          <OutlineMesh
            key={`guard-shell-crest-end-cap-${end}`}
            name={`guard-shell-brass-crest-clamp-${end}`}
            position={[0, crestRootHeight(z) + 0.039, z]}
            rotation-x={Math.PI / 2}
            scale={[0.046, 0.02, 0.046]}
            outlineWidth={0.008}
            outlineColor={GUARD_INK}
            geometry={<cylinderGeometry args={[1, 1, 1, 12]} />}
            material={<meshToonMaterial color={GUARD_BRASS} />}
          />
        )
      })}
    </group>
  )
}

function GuardReactiveCrest({
  activity,
  animation,
  hasHeadAccessory,
}: {
  activity: number
  animation: GuardAnimation
  hasHeadAccessory: boolean
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
  const geometry = useMemo(() => createGuardCrestFiberGeometry(hasHeadAccessory), [hasHeadAccessory])
  const material = useMemo(() => createGuardCrestMaterial(), [])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(({ clock }, frameDelta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const delta = Math.min(frameDelta, 1 / 24)
    const time = clock.elapsedTime
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    mesh.getWorldPosition(worldPosition)

    if (!initialized.current) {
      previousPosition.current.copy(worldPosition)
      previousVelocity.current.set(0, 0, 0)
      initialized.current = true
    }

    worldVelocity.copy(worldPosition).sub(previousPosition.current).divideScalar(Math.max(delta, 0.001))
    targetForce.copy(worldVelocity).sub(previousVelocity.current).divideScalar(Math.max(delta, 0.001)).multiplyScalar(-0.0028)
    targetForce.clampLength(0, animation === 'hop' ? 0.12 : 0.075)
    targetForce.x += Math.sin(time * 0.74) * 0.01 * motion
    targetForce.z += Math.cos(time * 0.63 + 0.8) * 0.014 * motion
    if (animation === 'grumble') targetForce.x += Math.sin(time * 18.5) * 0.02 * motion

    springDelta.copy(targetForce).sub(springForce.current)
    springVelocity.current.addScaledVector(springDelta, 19 * delta)
    springVelocity.current.multiplyScalar(Math.exp(-7.2 * delta))
    springForce.current.addScaledVector(springVelocity.current, delta).clampLength(0, 0.13)

    material.uniforms.uTime.value = time
    material.uniforms.uActivity.value = motion
    material.uniforms.uForce.value.copy(springForce.current)
    previousPosition.current.copy(worldPosition)
    previousVelocity.current.copy(worldVelocity)
  })

  return (
    <mesh
      ref={meshRef}
      name="guard-shell-reactive-horsehair-crest"
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={3}
    />
  )
}

function GuardHelmetAccents() {
  const crownLine = useMemo<[number, number, number][]>(
    () => [
      [0, 0.63, -0.06],
      [0, 0.58, -0.31],
      [0, 0.45, -0.51],
      [0, 0.31, -0.63],
    ],
    [],
  )

  return (
    <group name="guard-shell-forged-details">
      <GuardSeam name="guard-shell-raised-crown-ridge" points={crownLine} radius={0.025} />
      {([-1, 1] as const).map((side) => (
        <group key={`guard-shell-side-hardware-${side}`}>
          <OutlineMesh
            name={`guard-shell-cheek-pivot-${side}`}
            position={[side * 0.545, 0.12, -0.655]}
            rotation-y={side * -0.22}
            scale={[0.06, 0.06, 0.025]}
            outlineWidth={0.008}
            outlineColor={GUARD_INK}
            geometry={<sphereGeometry args={[1, 12, 7]} />}
            material={<meshToonMaterial color={GUARD_BRASS} />}
          />
          <mesh position={[side * 0.532, 0.137, -0.681]} scale={[0.018, 0.018, 0.008]}>
            <sphereGeometry args={[1, 8, 5]} />
            <meshBasicMaterial color={GUARD_BRASS_LIGHT} depthTest depthWrite />
          </mesh>
        </group>
      ))}
      <OutlineMesh
        name="guard-shell-central-brow-boss"
        position={[0, 0.273, -0.822]}
        rotation-z={Math.PI / 4}
        scale={[0.058, 0.058, 0.032]}
        outlineWidth={0.008}
        outlineColor={GUARD_INK}
        geometry={<octahedronGeometry args={[1, 0]} />}
        material={<meshToonMaterial color={GUARD_BRASS} />}
      />
      {[-0.34, 0.34].map((x) => (
        <mesh key={`guard-shell-brow-rivet-${x}`} position={[x, 0.235, -0.79]} scale={[0.026, 0.026, 0.014]}>
          <sphereGeometry args={[1, 9, 5]} />
          <meshToonMaterial color={GUARD_STEEL_LIGHT} depthTest depthWrite />
        </mesh>
      ))}
    </group>
  )
}

export function GuardShell({
  fitted = false,
  activity = 1,
  animation = 'idle',
  hasHeadAccessory = false,
}: GuardShellProps) {
  const bodyGeometry = useMemo(() => createGuardHelmetGeometry(), [])
  const neckGeometry = useMemo(() => createGuardNeckGuardGeometry(), [])

  useEffect(
    () => () => {
      bodyGeometry.dispose()
      neckGeometry.dispose()
    },
    [bodyGeometry, neckGeometry],
  )

  return (
    <group name="guard-shell-roman-helmet">
      <OutlineMesh
        name="guard-shell-forged-bowl"
        outlineWidth={fitted ? 0.044 : 0.052}
        outlineColor={GUARD_INK}
        geometry={<primitive object={bodyGeometry} attach="geometry" />}
        material={<GuardMetalMaterial />}
      />
      <OutlineMesh
        name="guard-shell-flared-neck-guard"
        outlineWidth={0.022}
        outlineColor={GUARD_INK}
        geometry={<primitive object={neckGeometry} attach="geometry" />}
        material={<GuardMetalMaterial />}
      />
      <GuardHelmetAccents />
      {!hasHeadAccessory && (
        <group name="guard-shell-bare-head-horsehair-crest">
          <GuardCrestBase hasHeadAccessory={false} />
          <GuardReactiveCrest activity={activity} animation={animation} hasHeadAccessory={false} />
        </group>
      )}
    </group>
  )
}

export function GuardShellOpeningArmor() {
  const wallGeometry = useMemo(() => createGuardOpeningWallGeometry(), [])
  const browGeometry = useMemo(() => createGuardBrowGeometry(), [])
  const leftCheekGeometry = useMemo(() => createGuardCheekGeometry(-1), [])
  const rightCheekGeometry = useMemo(() => createGuardCheekGeometry(1), [])
  const chinGeometry = useMemo(() => createGuardChinGeometry(), [])

  useEffect(
    () => () => {
      wallGeometry.dispose()
      browGeometry.dispose()
      leftCheekGeometry.dispose()
      rightCheekGeometry.dispose()
      chinGeometry.dispose()
    },
    [browGeometry, chinGeometry, leftCheekGeometry, rightCheekGeometry, wallGeometry],
  )

  return (
    <group name="guard-shell-armored-face-opening">
      <mesh name="guard-shell-recessed-opening-wall" geometry={wallGeometry}>
        <meshToonMaterial color={GUARD_STEEL_DEEP} side={THREE.DoubleSide} depthTest depthWrite />
      </mesh>
      <OutlineMesh
        name="guard-shell-brow-reinforcement"
        outlineWidth={0.014}
        outlineColor={GUARD_INK}
        geometry={<primitive object={browGeometry} attach="geometry" />}
        material={<GuardMetalMaterial />}
      />
      <OutlineMesh
        name="guard-shell-left-cheek-guard"
        outlineWidth={0.014}
        outlineColor={GUARD_INK}
        geometry={<primitive object={leftCheekGeometry} attach="geometry" />}
        material={<GuardMetalMaterial />}
      />
      <OutlineMesh
        name="guard-shell-right-cheek-guard"
        outlineWidth={0.014}
        outlineColor={GUARD_INK}
        geometry={<primitive object={rightCheekGeometry} attach="geometry" />}
        material={<GuardMetalMaterial />}
      />
      <OutlineMesh
        name="guard-shell-lower-neck-bridge"
        outlineWidth={0.013}
        outlineColor={GUARD_INK}
        geometry={<primitive object={chinGeometry} attach="geometry" />}
        material={<GuardMetalMaterial />}
      />
    </group>
  )
}
