import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'
import { createShellOpeningSealGeometry } from './ShellOpeningSeal'

export const SPIKEY_INK = '#171725'
export const SPIKEY_ROCK_DEEP = '#25263a'
export const SPIKEY_ROCK_SHADOW = '#343653'
export const SPIKEY_ROCK_BASE = '#4b4f75'
export const SPIKEY_ROCK_MID = '#626a96'
export const SPIKEY_ROCK_LIGHT = '#94a4c5'
export const SPIKEY_SPIKE_CYAN = '#9fd6e8'
export const SPIKEY_SPIKE_CORAL = '#e56b5f'
export const SPIKEY_SPIKE_MINT = '#8fcf9e'
export const SPIKEY_SPIKE_GOLD = '#e5bd61'
export const SPIKEY_SPIKE_LAVENDER = '#b79bd9'

type SpikeyShellProps = {
  fitted?: boolean
  hasHeadAccessory?: boolean
}

type SpikeySpikeSpec = {
  id: string
  position: [number, number, number]
  direction: [number, number, number]
  scale: [number, number, number]
  color: string
  seed: number
  bareOnly?: boolean
}

const SPIKE_UP = new THREE.Vector3(0, 1, 0)

const SPIKEY_SPIKE_SPECS: SpikeySpikeSpec[] = [
  {
    id: 'crown-hero',
    position: [0, 0.625, 0.055],
    direction: [0.02, 1, 0.06],
    scale: [0.36, 0.54, 0.36],
    color: SPIKEY_SPIKE_CYAN,
    seed: 11,
    bareOnly: true,
  },
  {
    id: 'crown-left',
    position: [-0.355, 0.5, -0.01],
    direction: [-0.38, 0.9, -0.08],
    scale: [0.29, 0.44, 0.29],
    color: SPIKEY_SPIKE_LAVENDER,
    seed: 17,
  },
  {
    id: 'crown-right',
    position: [0.36, 0.485, 0.035],
    direction: [0.4, 0.88, 0.12],
    scale: [0.3, 0.46, 0.3],
    color: SPIKEY_SPIKE_CORAL,
    seed: 23,
  },
  {
    id: 'crown-rear',
    position: [0.015, 0.485, 0.465],
    direction: [0.02, 0.66, 0.78],
    scale: [0.3, 0.44, 0.3],
    color: SPIKEY_SPIKE_MINT,
    seed: 29,
    bareOnly: true,
  },
  {
    id: 'front-left',
    position: [-0.49, 0.33, -0.43],
    direction: [-0.58, 0.61, -0.54],
    scale: [0.23, 0.34, 0.23],
    color: SPIKEY_SPIKE_CYAN,
    seed: 31,
  },
  {
    id: 'front-right',
    position: [0.5, 0.315, -0.42],
    direction: [0.59, 0.58, -0.56],
    scale: [0.24, 0.35, 0.24],
    color: SPIKEY_SPIKE_GOLD,
    seed: 37,
  },
  {
    id: 'shoulder-left',
    position: [-0.64, 0.285, -0.07],
    direction: [-0.8, 0.58, -0.14],
    scale: [0.29, 0.43, 0.29],
    color: SPIKEY_SPIKE_GOLD,
    seed: 41,
  },
  {
    id: 'shoulder-right',
    position: [0.645, 0.27, -0.035],
    direction: [0.82, 0.55, -0.08],
    scale: [0.3, 0.45, 0.3],
    color: SPIKEY_SPIKE_CYAN,
    seed: 43,
  },
  {
    id: 'side-left',
    position: [-0.765, 0.0, 0.08],
    direction: [-0.98, 0.08, 0.16],
    scale: [0.28, 0.42, 0.28],
    color: SPIKEY_SPIKE_CORAL,
    seed: 47,
  },
  {
    id: 'side-right',
    position: [0.765, 0.025, 0.105],
    direction: [0.98, 0.1, 0.18],
    scale: [0.29, 0.44, 0.29],
    color: SPIKEY_SPIKE_MINT,
    seed: 53,
  },
  {
    id: 'lower-left',
    position: [-0.65, -0.315, 0.14],
    direction: [-0.78, -0.48, 0.2],
    scale: [0.24, 0.34, 0.24],
    color: SPIKEY_SPIKE_LAVENDER,
    seed: 59,
  },
  {
    id: 'lower-right',
    position: [0.65, -0.32, 0.16],
    direction: [0.78, -0.47, 0.23],
    scale: [0.25, 0.36, 0.25],
    color: SPIKEY_SPIKE_GOLD,
    seed: 61,
  },
  {
    id: 'rear-upper-left',
    position: [-0.38, 0.31, 0.52],
    direction: [-0.4, 0.46, 0.82],
    scale: [0.29, 0.43, 0.29],
    color: SPIKEY_SPIKE_CYAN,
    seed: 67,
  },
  {
    id: 'rear-upper-right',
    position: [0.405, 0.285, 0.52],
    direction: [0.42, 0.43, 0.82],
    scale: [0.28, 0.42, 0.28],
    color: SPIKEY_SPIKE_MINT,
    seed: 71,
  },
  {
    id: 'rear-hero',
    position: [0.09, 0.075, 0.61],
    direction: [0.43, 0.3, 0.85],
    scale: [0.32, 0.54, 0.32],
    color: SPIKEY_SPIKE_CORAL,
    seed: 73,
  },
  {
    id: 'rear-mid-left',
    position: [-0.56, -0.055, 0.47],
    direction: [-0.58, -0.06, 0.82],
    scale: [0.25, 0.36, 0.25],
    color: SPIKEY_SPIKE_LAVENDER,
    seed: 79,
  },
  {
    id: 'rear-mid-right',
    position: [0.55, -0.08, 0.48],
    direction: [0.56, -0.08, 0.83],
    scale: [0.25, 0.37, 0.25],
    color: SPIKEY_SPIKE_GOLD,
    seed: 83,
  },
  {
    id: 'rear-lower-left',
    position: [-0.34, -0.4, 0.4],
    direction: [-0.38, -0.58, 0.74],
    scale: [0.22, 0.31, 0.22],
    color: SPIKEY_SPIKE_CORAL,
    seed: 89,
  },
  {
    id: 'rear-lower-center',
    position: [0.02, -0.47, 0.39],
    direction: [0.02, -0.68, 0.72],
    scale: [0.24, 0.34, 0.24],
    color: SPIKEY_SPIKE_CYAN,
    seed: 97,
  },
  {
    id: 'rear-lower-right',
    position: [0.37, -0.39, 0.4],
    direction: [0.4, -0.55, 0.75],
    scale: [0.23, 0.32, 0.23],
    color: SPIKEY_SPIKE_MINT,
    seed: 101,
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

function applySpikeyFacetColors(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position as THREE.BufferAttribute
  const normal = geometry.attributes.normal as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deep = new THREE.Color(SPIKEY_ROCK_DEEP)
  const shadow = new THREE.Color(SPIKEY_ROCK_SHADOW)
  const base = new THREE.Color(SPIKEY_ROCK_BASE)
  const mid = new THREE.Color(SPIKEY_ROCK_MID)
  const light = new THREE.Color(SPIKEY_ROCK_LIGHT)
  const color = new THREE.Color()

  for (let index = 0; index < position.count; index += 3) {
    const x = (position.getX(index) + position.getX(index + 1) + position.getX(index + 2)) / 3
    const y = (position.getY(index) + position.getY(index + 1) + position.getY(index + 2)) / 3
    const z = (position.getZ(index) + position.getZ(index + 1) + position.getZ(index + 2)) / 3
    const normalY = (normal.getY(index) + normal.getY(index + 1) + normal.getY(index + 2)) / 3
    const noise = triangleNoise(index / 3, x, y, z)

    color.copy(base)
    if (normalY > 0.42) color.lerp(light, 0.34)
    if (normalY < -0.3) color.lerp(deep, 0.34)
    if (noise < 0.17) color.lerp(shadow, 0.34)
    if (noise > 0.76) color.lerp(mid, 0.38)
    if (Math.sin(y * 18.0 + z * 4.2 + x * 2.4) > 0.76) color.lerp(light, 0.12)

    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = (index + vertex) * 3
      colors[offset] = color.r
      colors[offset + 1] = color.g
      colors[offset + 2] = color.b
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function createSpikeyShellGeometry() {
  const indexed = new THREE.SphereGeometry(1, 30, 20)
  const position = indexed.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const angle = Math.atan2(z, x)
    const crown = smoothstep01((y - 0.08) / 0.86)
    const lower = smoothstep01((-y - 0.2) / 0.7)
    const shoulder = Math.exp(-((y - 0.08) ** 2) / 0.24)
    const crag = 1
      + Math.sin(angle * 5.0 + y * 5.4) * 0.028
      + Math.cos(angle * 8.0 - y * 3.8) * 0.017
      + Math.sin((x - z) * 8.2 + y * 4.1) * 0.012
    const crownTaper = 1 - crown * 0.06
    const lowerFlare = 1 + lower * 0.055

    let nextX = x * 0.825 * crag * crownTaper * lowerFlare * (1 + shoulder * 0.018)
    let nextY = -0.035 + y * 0.72 * crag + crown * 0.014
    let nextZ = -0.035 + z * 0.685 * crag * (1 + (z > 0 ? 0.055 : 0.015))

    nextX += Math.sin(y * 7.2 + z * 3.1) * 0.007
    nextZ += Math.cos(y * 6.6 - x * 4.2) * 0.008

    if (nextY < -0.51) {
      const settle = smoothstep01((-nextY - 0.51) / 0.18)
      nextY = THREE.MathUtils.lerp(nextY, -0.6 + Math.sin(angle * 7.0) * 0.006, settle * 0.85)
      nextX *= 1 + settle * 0.025
    }

    position.setXYZ(index, nextX, nextY, nextZ)
  }

  position.needsUpdate = true
  indexed.computeVertexNormals()
  const source = indexed.toNonIndexed()
  indexed.dispose()
  const sourcePosition = source.attributes.position as THREE.BufferAttribute
  const positions: number[] = []

  for (let index = 0; index < sourcePosition.count; index += 3) {
    const centerX = (sourcePosition.getX(index) + sourcePosition.getX(index + 1) + sourcePosition.getX(index + 2)) / 3
    const centerY = (sourcePosition.getY(index) + sourcePosition.getY(index + 1) + sourcePosition.getY(index + 2)) / 3
    const centerZ = (sourcePosition.getZ(index) + sourcePosition.getZ(index + 1) + sourcePosition.getZ(index + 2)) / 3
    const aperture = Math.pow(Math.abs(centerX / 0.47), 3.2)
      + Math.pow(Math.abs((centerY + 0.045) / 0.355), 3.2)

    if (centerZ < -0.475 && aperture < 1.04) continue

    for (let vertex = 0; vertex < 3; vertex += 1) {
      positions.push(
        sourcePosition.getX(index + vertex),
        sourcePosition.getY(index + vertex),
        sourcePosition.getZ(index + vertex),
      )
    }
  }

  source.dispose()
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  applySpikeyFacetColors(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createSpikeyOpeningGeometry() {
  const segments = 48
  const tubeSegments = 8
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const lower = Math.max(0, -Math.sin(angle))
    const upper = Math.max(0, Math.sin(angle))
    const side = Math.abs(Math.cos(angle))
    const chippedRhythm = 1 + Math.sin(angle * 5.0 + 0.6) * 0.018 + Math.cos(angle * 9.0) * 0.009
    const point = superellipsePoint(angle, 0.475 + side * 0.012, 0.355 + lower * 0.014)

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      const radialRadius = (0.064 + lower * 0.012 + side * 0.006) * chippedRhythm

      vertices.push(
        point.x + Math.cos(angle) * tubeRadial * radialRadius,
        -0.045 + point.y + Math.sin(angle) * tubeRadial * radialRadius - upper * 0.004,
        -0.718 + tubeDepth * (0.05 + side * 0.008) + Math.max(0, tubeRadial) * 0.075,
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
  applySpikeyFacetColors(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createSpikeySpikeGeometry(seed: number) {
  const random = mulberry32(seed)
  const sides = 10
  const rings = [
    { y: -0.36, radius: 0.3 },
    { y: -0.12, radius: 0.46 },
    { y: 0.08, radius: 0.43 },
    { y: 0.38, radius: 0.31 },
    { y: 0.67, radius: 0.18 },
    { y: 0.9, radius: 0.042 },
  ]
  const vertices: number[] = []
  const indices: number[] = []
  const bendX = (random() * 2 - 1) * 0.11
  const bendZ = (random() * 2 - 1) * 0.09
  const phase = random() * Math.PI * 2

  rings.forEach((ring, ringIndex) => {
    const t = ringIndex / (rings.length - 1)
    const centerX = bendX * t * t
    const centerZ = bendZ * t * t

    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2 + phase
      const irregularity = 1 + Math.sin(angle * 3 + seed) * 0.035 + (random() - 0.5) * 0.035
      vertices.push(
        centerX + Math.cos(angle) * ring.radius * irregularity,
        ring.y,
        centerZ + Math.sin(angle) * ring.radius * irregularity,
      )
    }
  })

  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let side = 0; side < sides; side += 1) {
      const nextSide = (side + 1) % sides
      const base = ring * sides + side
      const nextRing = (ring + 1) * sides + side
      indices.push(base, nextRing, ring * sides + nextSide)
      indices.push(ring * sides + nextSide, nextRing, (ring + 1) * sides + nextSide)
    }
  }

  const bottomCenter = vertices.length / 3
  vertices.push(0, -0.36, 0)
  const tipIndex = vertices.length / 3
  vertices.push(bendX * 1.12, 1.06, bendZ * 1.12)

  for (let side = 0; side < sides; side += 1) {
    const nextSide = (side + 1) % sides
    indices.push(bottomCenter, nextSide, side)
    const lastRing = (rings.length - 1) * sides
    indices.push(lastRing + side, lastRing + nextSide, tipIndex)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

const SPIKEY_ROCK_VERTEX_SHADER = /* glsl */ `
  attribute vec3 color;

  varying vec3 vFacetColor;
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vFacetColor = color;
    vLocalPosition = position;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SPIKEY_ROCK_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uDeepColor;
  uniform vec3 uLightColor;

  varying vec3 vFacetColor;
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.42, 0.8, 0.46));
    float lightAmount = dot(normalize(vViewNormal), lightDirection) * 0.5 + 0.5;
    float lightBand = mix(0.66, 0.84, step(0.3, lightAmount));
    lightBand = mix(lightBand, 1.05, step(0.7, lightAmount));

    float fractureA = abs(sin(vLocalPosition.y * 17.0 + vLocalPosition.x * 6.4 + sin(vLocalPosition.z * 8.0) * 0.7));
    float fractureB = abs(sin(vLocalPosition.z * 15.0 - vLocalPosition.y * 5.1 + sin(vLocalPosition.x * 10.0) * 0.6));
    float fractureBreak = step(0.08, sin(dot(vLocalPosition, vec3(31.0, 43.0, 37.0))));
    float fracture = (1.0 - smoothstep(0.0, 0.055, min(fractureA, fractureB))) * fractureBreak * 0.36;
    float grain = sin(dot(vLocalPosition, vec3(57.0, 39.0, 63.0))) * sin(dot(vLocalPosition, vec3(29.0, 71.0, 47.0)));
    float mineralFleck = step(0.9, grain) * 0.16;

    vec3 rockColor = vFacetColor * lightBand;
    rockColor = mix(rockColor, uDeepColor, fracture);
    rockColor = mix(rockColor, uLightColor * mix(0.78, 1.0, lightAmount), mineralFleck);

    gl_FragColor = vec4(rockColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const SPIKEY_SPIKE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vLocalPosition = position;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SPIKEY_SPIKE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uShadowColor;
  uniform vec3 uBaseColor;
  uniform vec3 uLightColor;

  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.5, 0.76, 0.42));
    float lightAmount = dot(normalize(vViewNormal), lightDirection) * 0.5 + 0.5;
    vec3 spikeColor = mix(uShadowColor, uBaseColor, step(0.28, lightAmount));
    spikeColor = mix(spikeColor, uLightColor, step(0.72, lightAmount));
    spikeColor = mix(spikeColor, uShadowColor, (1.0 - smoothstep(-0.18, 0.18, vLocalPosition.y)) * 0.28);
    spikeColor = mix(spikeColor, uLightColor, smoothstep(0.7, 1.0, vLocalPosition.y) * 0.18);

    gl_FragColor = vec4(spikeColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function SpikeyRockMaterial() {
  const uniforms = useMemo(
    () => ({
      uDeepColor: { value: new THREE.Color(SPIKEY_ROCK_DEEP) },
      uLightColor: { value: new THREE.Color(SPIKEY_ROCK_LIGHT) },
    }),
    [],
  )

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={SPIKEY_ROCK_VERTEX_SHADER}
      fragmentShader={SPIKEY_ROCK_FRAGMENT_SHADER}
      side={THREE.FrontSide}
      depthTest
      depthWrite
      dithering
    />
  )
}

function SpikeySpikeMaterial({ color }: { color: string }) {
  const uniforms = useMemo(() => {
    const base = new THREE.Color(color)
    return {
      uShadowColor: { value: base.clone().offsetHSL(0, 0.04, -0.2) },
      uBaseColor: { value: base },
      uLightColor: { value: base.clone().offsetHSL(0, -0.05, 0.17) },
    }
  }, [color])

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={SPIKEY_SPIKE_VERTEX_SHADER}
      fragmentShader={SPIKEY_SPIKE_FRAGMENT_SHADER}
      side={THREE.FrontSide}
      depthTest
      depthWrite
      dithering
    />
  )
}

function SpikeySpike({ spec }: { spec: SpikeySpikeSpec }) {
  const geometry = useMemo(() => createSpikeySpikeGeometry(spec.seed), [spec.seed])
  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(
      SPIKE_UP,
      new THREE.Vector3(...spec.direction).normalize(),
    ),
    [spec.direction],
  )

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group
      name={`spikey-shell-buried-spike-${spec.id}`}
      position={spec.position}
      quaternion={quaternion}
      scale={spec.scale}
    >
      <OutlineMesh
        outlineWidth={0.045}
        outlineColor={SPIKEY_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<SpikeySpikeMaterial color={spec.color} />}
      />
    </group>
  )
}

export function SpikeyShell({ fitted = false, hasHeadAccessory = false }: SpikeyShellProps) {
  const geometry = useMemo(() => createSpikeyShellGeometry(), [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group name="spikey-shell-rocky-armored-body">
      <OutlineMesh
        name="spikey-shell-craggy-indigo-body"
        outlineWidth={fitted ? 0.044 : 0.054}
        outlineColor={SPIKEY_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<SpikeyRockMaterial />}
      />
      <group name="spikey-shell-multicolor-spike-field">
        {SPIKEY_SPIKE_SPECS.filter((spec) => !hasHeadAccessory || !spec.bareOnly).map((spec) => (
          <SpikeySpike key={spec.id} spec={spec} />
        ))}
      </group>
    </group>
  )
}

export function SpikeyShellOpeningLip() {
  const geometry = useMemo(() => createSpikeyOpeningGeometry(), [])
  const sealGeometry = useMemo(() => {
    const seal = createShellOpeningSealGeometry({
      segments: 64,
      rings: 7,
      centerY: -0.045,
      frontXRadius: 0.535,
      frontYRadius: 0.41,
      backXRadius: 0.566,
      backYRadius: 0.438,
      frontZ: -0.63,
      backZ: -0.405,
      xCurve: 0.61,
      yCurve: 0.68,
      lowerDrop: 0.012,
      upperLift: 0.004,
      sideDepth: 0.016,
      surfaceRipple: 0.005,
      ripplePhase: 0.6,
    })
    applySpikeyFacetColors(seal)
    return seal
  }, [])

  useEffect(() => () => {
    geometry.dispose()
    sealGeometry.dispose()
  }, [geometry, sealGeometry])

  return (
    <group name="spikey-shell-true-face-aperture">
      <mesh name="spikey-shell-continuous-aperture-seal">
        <primitive object={sealGeometry} attach="geometry" />
        <SpikeyRockMaterial />
      </mesh>
      <OutlineMesh
        name="spikey-shell-faceted-opening-lip"
        outlineWidth={0.016}
        outlineColor={SPIKEY_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<SpikeyRockMaterial />}
      />
    </group>
  )
}
