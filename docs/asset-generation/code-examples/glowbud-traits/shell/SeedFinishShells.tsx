import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

export type SeedFinishShellVariant = 'smooth' | 'stoic'

type SeedFinishShellProps = {
  fitted?: boolean
  variant: SeedFinishShellVariant
}

type SeedFinishPalette = {
  ink: string
  deep: string
  shadow: string
  base: string
  mid: string
  light: string
  glint: string
}

const SEED_FINISH_PALETTES: Record<SeedFinishShellVariant, SeedFinishPalette> = {
  smooth: {
    ink: '#261714',
    deep: '#4b2a22',
    shadow: '#6d3d30',
    base: '#8f513d',
    mid: '#ad6750',
    light: '#d38a69',
    glint: '#f3b88c',
  },
  stoic: {
    ink: '#202326',
    deep: '#3d4143',
    shadow: '#555a5c',
    base: '#6c7172',
    mid: '#85898a',
    light: '#a8adae',
    glint: '#c7cccd',
  },
}

export const SMOOTH_SHELL_SHADOW = '#5b342b'
export const STOIC_SHELL_SHADOW = '#45494b'

const BODY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying vec3 vNormalView;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

  void main() {
    vColor = color;
    vNormalView = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`

const SMOOTH_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying vec3 vNormalView;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vNormalView);
    vec3 viewDirection = normalize(-vViewPosition);
    vec3 lightDirection = normalize(vec3(-0.42, 0.78, 0.62));
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float toonLight = diffuse > 0.72 ? 1.08 : (diffuse > 0.36 ? 0.91 : 0.72);
    vec3 halfDirection = normalize(lightDirection + viewDirection);
    float satin = pow(max(dot(normal, halfDirection), 0.0), 18.0);
    float edgeGlow = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.2);
    float glazeGrain = sin(vWorldPosition.x * 31.0 + vWorldPosition.y * 23.0 - vWorldPosition.z * 17.0) * 0.008;
    vec3 color = vColor * (toonLight + glazeGrain);
    color += vec3(1.0, 0.68, 0.44) * satin * 0.24;
    color += vec3(0.18, 0.08, 0.055) * edgeGlow * 0.08;
    gl_FragColor = vec4(color, 1.0);
  }
`

const STOIC_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying vec3 vNormalView;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vNormalView);
    vec3 viewDirection = normalize(-vViewPosition);
    vec3 lightDirection = normalize(vec3(-0.42, 0.78, 0.62));
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float toonLight = diffuse > 0.72 ? 1.04 : (diffuse > 0.34 ? 0.88 : 0.69);
    vec3 halfDirection = normalize(lightDirection + viewDirection);
    float honedGlint = pow(max(dot(normal, halfDirection), 0.0), 42.0);
    float mineralGrain =
      sin(vWorldPosition.x * 83.0 + vWorldPosition.y * 67.0 + vWorldPosition.z * 49.0)
      * sin(vWorldPosition.x * 29.0 - vWorldPosition.y * 37.0 + vWorldPosition.z * 71.0);
    float mineralDust = mineralGrain * 0.018;
    float edgeShade = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.8);
    vec3 color = vColor * (toonLight + mineralDust);
    color += vec3(0.72, 0.76, 0.77) * honedGlint * 0.11;
    color -= vec3(0.08, 0.075, 0.07) * edgeShade * 0.16;
    gl_FragColor = vec4(color, 1.0);
  }
`

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1)
}

function smoothstep01(value: number) {
  const clamped = clamp01(value)
  return clamped * clamped * (3 - 2 * clamped)
}

function surfaceNoise(x: number, y: number, z: number) {
  return (
    Math.sin(x * 11.7 + y * 7.4 - z * 4.9) * 0.56
    + Math.cos(x * 19.3 - y * 13.1 + z * 8.2) * 0.29
    + Math.sin((x + y - z) * 31.0) * 0.15
  )
}

function paintSeedFamilyBody(
  geometry: THREE.BufferGeometry,
  variant: SeedFinishShellVariant,
) {
  const palette = SEED_FINISH_PALETTES[variant]
  const position = geometry.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deep = new THREE.Color(palette.deep)
  const shadow = new THREE.Color(palette.shadow)
  const base = new THREE.Color(palette.base)
  const mid = new THREE.Color(palette.mid)
  const light = new THREE.Color(palette.light)
  const glint = new THREE.Color(palette.glint)
  const color = new THREE.Color()

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const topLight = smoothstep01((y + 0.2) / 0.82)
    const lowerShade = smoothstep01((-y - 0.12) / 0.56)
    const sideShade = smoothstep01((Math.abs(x) - 0.38) / 0.35)
    const frontRead = smoothstep01((-z - 0.08) / 0.58)
    const noise = surfaceNoise(x, y, z)

    color.copy(base)

    if (variant === 'smooth') {
      const broadGlaze = Math.exp(-((x + 0.2) ** 2) / 0.13 - ((y - 0.22) ** 2) / 0.24) * frontRead
      const warmBand = 0.5 + 0.5 * Math.sin(y * 5.2 + x * 1.9 - z * 0.8)
      color.lerp(mid, 0.16 + topLight * 0.18 + warmBand * 0.045)
      color.lerp(light, broadGlaze * 0.34 + topLight * frontRead * 0.08)
      color.lerp(glint, broadGlaze * 0.08)
      color.lerp(shadow, lowerShade * 0.22 + sideShade * 0.08)
      color.lerp(deep, Math.max(0, noise) * 0.018)
    } else {
      const strata = 0.5 + 0.5 * Math.sin(y * 17.0 + x * 3.2 + Math.sin(z * 7.0) * 0.65)
      const broadStoneLight = Math.exp(-((x + 0.17) ** 2) / 0.2 - ((y - 0.18) ** 2) / 0.34) * frontRead
      color.lerp(mid, topLight * 0.18 + strata * 0.08)
      color.lerp(light, broadStoneLight * 0.2 + Math.max(0, noise) * 0.025)
      color.lerp(shadow, lowerShade * 0.28 + sideShade * 0.12 + (1 - strata) * 0.055)
      color.lerp(deep, smoothstep01((-z + 0.18) / 0.9) * 0.06)
    }

    const offset = index * 3
    colors[offset] = color.r
    colors[offset + 1] = color.g
    colors[offset + 2] = color.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function createSeedFamilyBodyGeometry(variant: SeedFinishShellVariant) {
  const geometry = new THREE.SphereGeometry(1, 36, 22, 0, Math.PI * 2, 0.55, Math.PI - 0.55)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const organic = 1 + 0.012 * Math.sin(x * 5.4 + y * 2.8) + 0.007 * Math.cos(z * 4.6 - x * 1.8)
    const finishTexture = variant === 'stoic' ? 1 + surfaceNoise(x, y, z) * 0.0035 : 1
    const broadPlump = 1 + 0.032 * Math.max(0, 1 - y * y * 1.15)
    const sideBias = x > 0 ? 1.016 : 0.993
    const topSquash = y > 0.58 ? 0.955 : 1
    const bottomSpread = y < -0.24 ? 1.052 : 1
    const baseWeight = y < -0.42 ? 0.92 : 1
    const backFullness = z > 0 ? 1.065 : 0.995
    const frontSnugFullness = z < -0.46 ? 1.018 : 1
    const seedLean = y > 0.2 ? -0.014 : 0.004
    const surface = organic * finishTexture

    position.setXYZ(
      index,
      x * surface * broadPlump * sideBias * bottomSpread + seedLean,
      y * surface * topSquash * baseWeight - (x > 0.54 ? 0.008 : 0),
      z * surface * broadPlump * backFullness * frontSnugFullness * (y < -0.2 ? 1.025 : 1),
    )
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(0, -0.035, -0.08),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -0.035)),
      new THREE.Vector3(0.815, 0.735, 0.64),
    ),
  )
  geometry.computeVertexNormals()
  paintSeedFamilyBody(geometry, variant)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createSeedFamilyOpeningGeometry(variant: SeedFinishShellVariant) {
  const palette = SEED_FINISH_PALETTES[variant]
  const segments = 96
  const tubeSegments = 20
  const vertices: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deep = new THREE.Color(palette.deep)
  const base = new THREE.Color(palette.base)
  const mid = new THREE.Color(palette.mid)
  const light = new THREE.Color(palette.light)
  const color = new THREE.Color()

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const lower = Math.max(0, -sinAngle)
    const upper = Math.max(0, sinAngle)
    const side = Math.max(0, Math.abs(cosAngle) - 0.24)
    const sideTuck = side * side
    const organic = 1 + Math.sin(angle * 3.2 + 0.5) * 0.008 + Math.cos(angle * 5.7 - 0.4) * 0.005
    const centerX = 0.438 + sideTuck * 0.034 - lower * 0.002
    const centerY = 0.324 + lower * 0.022 - upper * 0.003
    const centerZ = -0.71 - lower * 0.014 + sideTuck * 0.046
    const radialRadius = 0.058 + lower * 0.01 + sideTuck * 0.018
    const depthRadius = 0.04 + sideTuck * 0.014

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      const shellSideMelt = Math.max(0, tubeRadial) * (0.074 + sideTuck * 0.046)
      const faceSideRoll = Math.max(0, -tubeRadial) * (0.018 + lower * 0.003)

      vertices.push(
        0.028 + cosAngle * (centerX + tubeRadial * radialRadius) * organic,
        -0.032 + sinAngle * (centerY + tubeRadial * radialRadius) * organic - lower * 0.03,
        centerZ + tubeDepth * depthRadius + shellSideMelt - faceSideRoll,
      )

      color.copy(base)
      color.lerp(deep, Math.max(0, -tubeRadial) * 0.44 + lower * 0.12)
      color.lerp(mid, Math.max(0, tubeRadial) * 0.2)
      color.lerp(light, upper * Math.max(0, tubeRadial) * (variant === 'smooth' ? 0.28 : 0.16))
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    for (let tube = 0; tube < tubeSegments; tube += 1) {
      const row = tubeSegments + 1
      const baseIndex = segment * row + tube
      indices.push(baseIndex, baseIndex + row, baseIndex + 1)
      indices.push(baseIndex + 1, baseIndex + row, baseIndex + row + 1)
    }
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

function SeedFinishMaterial({ variant }: { variant: SeedFinishShellVariant }) {
  return (
    <shaderMaterial
      vertexShader={BODY_VERTEX_SHADER}
      fragmentShader={variant === 'smooth' ? SMOOTH_FRAGMENT_SHADER : STOIC_FRAGMENT_SHADER}
      vertexColors
      depthTest
      depthWrite
      toneMapped
    />
  )
}

export function SeedFinishShell({ fitted = false, variant }: SeedFinishShellProps) {
  const palette = SEED_FINISH_PALETTES[variant]
  const bodyGeometry = useMemo(() => createSeedFamilyBodyGeometry(variant), [variant])

  useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry])

  return (
    <group
      name={`seed-family-${variant}-shared-silhouette`}
      userData={{
        trait: variant === 'smooth' ? 'Smooth' : 'Stoic',
        construction: 'seed-family-shared-silhouette-painted-vertex-finish',
      }}
    >
      <OutlineMesh
        name={
          variant === 'smooth'
            ? 'seed-family-smooth-satin-glaze'
            : 'seed-family-stoic-honed-mineral-banding'
        }
        outlineWidth={fitted ? 0.05 : 0.06}
        outlineColor={palette.ink}
        geometry={<primitive object={bodyGeometry} attach="geometry" />}
        material={<SeedFinishMaterial variant={variant} />}
      />
    </group>
  )
}

export function SeedFinishShellOpeningLip({ variant }: { variant: SeedFinishShellVariant }) {
  const palette = SEED_FINISH_PALETTES[variant]
  const openingGeometry = useMemo(() => createSeedFamilyOpeningGeometry(variant), [variant])

  useEffect(() => () => openingGeometry.dispose(), [openingGeometry])

  return (
    <group
      name={`seed-family-${variant}-continuous-opening-cowl`}
      userData={{ construction: 'seed-family-continuous-opening-cowl' }}
    >
      <OutlineMesh
        outlineWidth={0.012}
        outlineColor={palette.ink}
        geometry={<primitive object={openingGeometry} attach="geometry" />}
        material={<SeedFinishMaterial variant={variant} />}
      />
    </group>
  )
}
