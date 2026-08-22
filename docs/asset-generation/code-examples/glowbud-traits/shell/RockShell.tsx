import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

export const ROCK_SHELL_INK = '#171c1e'
export const ROCK_SHELL_DEEP = '#2d3435'
export const ROCK_SHELL_SHADOW = '#3b4445'
export const ROCK_SHELL_BASE = '#566061'
export const ROCK_SHELL_MID = '#707a79'
export const ROCK_SHELL_LIGHT = '#929a94'
export const ROCK_SHELL_WARM = '#736a59'
export const ROCK_SHELL_QUARTZ = '#9eaea5'

type RockShellProps = {
  fitted?: boolean
}

type RockCragSpec = {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
}

const ROCK_CROWN_CRAGS: RockCragSpec[] = [
  {
    position: [-0.51, 0.36, 0.03],
    rotation: [0.18, -0.32, -0.2],
    scale: [0.25, 0.2, 0.24],
    color: ROCK_SHELL_BASE,
  },
  {
    position: [-0.31, 0.48, 0.24],
    rotation: [-0.22, 0.24, 0.14],
    scale: [0.28, 0.2, 0.25],
    color: ROCK_SHELL_SHADOW,
  },
  {
    position: [0.06, 0.51, 0.34],
    rotation: [0.1, -0.28, -0.08],
    scale: [0.3, 0.19, 0.26],
    color: ROCK_SHELL_BASE,
  },
  {
    position: [0.35, 0.46, 0.22],
    rotation: [-0.14, 0.42, 0.18],
    scale: [0.27, 0.19, 0.25],
    color: ROCK_SHELL_MID,
  },
  {
    position: [0.53, 0.31, 0.02],
    rotation: [0.2, -0.18, 0.24],
    scale: [0.23, 0.19, 0.22],
    color: ROCK_SHELL_BASE,
  },
]

function smoothstep01(value: number) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1)
  return clamped * clamped * (3 - 2 * clamped)
}

function triangleNoise(index: number, x: number, y: number, z: number) {
  const value = Math.sin(index * 12.9898 + x * 78.233 + y * 37.719 + z * 49.157) * 43758.5453
  return value - Math.floor(value)
}

function applyRockFacetColors(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position as THREE.BufferAttribute
  const normal = geometry.attributes.normal as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deep = new THREE.Color(ROCK_SHELL_DEEP)
  const shadow = new THREE.Color(ROCK_SHELL_SHADOW)
  const base = new THREE.Color(ROCK_SHELL_BASE)
  const mid = new THREE.Color(ROCK_SHELL_MID)
  const light = new THREE.Color(ROCK_SHELL_LIGHT)
  const warm = new THREE.Color(ROCK_SHELL_WARM)
  const color = new THREE.Color()

  for (let index = 0; index < position.count; index += 3) {
    const x = (position.getX(index) + position.getX(index + 1) + position.getX(index + 2)) / 3
    const y = (position.getY(index) + position.getY(index + 1) + position.getY(index + 2)) / 3
    const z = (position.getZ(index) + position.getZ(index + 1) + position.getZ(index + 2)) / 3
    const normalY = (normal.getY(index) + normal.getY(index + 1) + normal.getY(index + 2)) / 3
    const noise = triangleNoise(index / 3, x, y, z)
    const sediment = Math.sin(y * 25 + z * 3.8 + Math.sin(x * 8.4) * 0.9)

    color.copy(base)
    if (normalY > 0.42) color.lerp(light, 0.36)
    if (normalY < -0.35) color.lerp(deep, 0.3)
    if (noise < 0.18) color.lerp(shadow, 0.32)
    if (noise > 0.78) color.lerp(mid, 0.32)
    if (sediment > 0.68 && noise > 0.24) color.lerp(warm, 0.24)

    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = (index + vertex) * 3
      colors[offset] = color.r
      colors[offset + 1] = color.g
      colors[offset + 2] = color.b
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function createRockShellGeometry() {
  const source = new THREE.SphereGeometry(1, 20, 13, 0, Math.PI * 2, 0.5, Math.PI - 0.5)
  source.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(0, -0.04, -0.075),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -0.035)),
      new THREE.Vector3(0.83, 0.74, 0.67),
    ),
  )

  const position = source.attributes.position as THREE.BufferAttribute
  const center = new THREE.Vector3(0, -0.04, -0.075)

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const localX = (x - center.x) / 0.83
    const localY = (y - center.y) / 0.74
    const localZ = (z - center.z) / 0.67
    const angle = Math.atan2(localZ, localX)
    const crown = smoothstep01((localY - 0.12) / 0.78)
    const base = smoothstep01((-localY - 0.34) / 0.52)
    const shoulder = smoothstep01((Math.abs(localX) - 0.28) / 0.54) * (1 - crown * 0.38)
    const broadStrata =
      Math.sin(angle * 3.1 + localY * 2.7) * 0.046
      + Math.cos(angle * 5.2 - localY * 3.6) * 0.03
      + Math.sin((localX - localZ) * 9.4 + localY * 2.2) * 0.014
    const leftCrown = Math.exp(-((localX + 0.36) ** 2) / 0.12 - ((localY - 0.72) ** 2) / 0.08 - ((localZ - 0.08) ** 2) / 0.36)
    const rearCrown = Math.exp(-((localX - 0.1) ** 2) / 0.32 - ((localY - 0.73) ** 2) / 0.07 - ((localZ - 0.48) ** 2) / 0.16)
    const rightChip = Math.exp(-((localX - 0.61) ** 2) / 0.06 - ((localY - 0.34) ** 2) / 0.08 - ((localZ + 0.2) ** 2) / 0.16)
    const lowerChip = Math.exp(-((localX + 0.22) ** 2) / 0.11 - ((localY + 0.7) ** 2) / 0.05 - ((localZ + 0.24) ** 2) / 0.2)
    const potSaddle = Math.exp(-(localX ** 2) / 0.12 - ((localZ + 0.02) ** 2) / 0.12) * crown
    const mass = 1 + broadStrata + shoulder * 0.055 + base * 0.048 + leftCrown * 0.065 + rearCrown * 0.055 - rightChip * 0.075 - lowerChip * 0.04

    let nextX = center.x + (x - center.x) * mass * (1 + shoulder * 0.035)
    let nextY = center.y + (y - center.y) * mass + leftCrown * 0.022 + rearCrown * 0.026 - potSaddle * 0.045
    const nextZ = center.z + (z - center.z) * mass * (1 + (localZ > 0 ? 0.045 : 0.018))

    if (nextY < -0.51) {
      const settle = smoothstep01((-nextY - 0.51) / 0.16)
      nextY = THREE.MathUtils.lerp(nextY, -0.595 + Math.sin(nextX * 11.2) * 0.008, settle * 0.72)
      nextX *= 1 + settle * 0.035
    }

    position.setXYZ(index, nextX, nextY, nextZ)
  }

  position.needsUpdate = true
  const geometry = source.toNonIndexed()
  source.dispose()
  geometry.computeVertexNormals()
  applyRockFacetColors(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createRockOpeningGeometry() {
  const segments = 40
  const tubeSegments = 7
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const lower = Math.max(0, -sinAngle)
    const upper = Math.max(0, sinAngle)
    const side = Math.max(0, Math.abs(cosAngle) - 0.2)
    const chippedRhythm = 1 + Math.sin(angle * 3 + 0.4) * 0.022 + Math.cos(angle * 7 - 0.3) * 0.013
    const centerX = 0.442 + side * 0.038 - upper * 0.006
    const centerY = 0.326 + lower * 0.026 - upper * 0.006
    const centerZ = -0.706 - lower * 0.018 + side * 0.04
    const radialRadius = (0.064 + lower * 0.012 + side * 0.012) * chippedRhythm
    const depthRadius = 0.046 + side * 0.012

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      const shellMelt = Math.max(0, tubeRadial) * (0.074 + side * 0.044)

      vertices.push(
        0.028 + cosAngle * (centerX + tubeRadial * radialRadius) * chippedRhythm,
        -0.032 + sinAngle * (centerY + tubeRadial * radialRadius) * chippedRhythm - lower * 0.03,
        centerZ + tubeDepth * depthRadius + shellMelt - Math.max(0, -tubeRadial) * 0.016,
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
  applyRockFacetColors(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

const ROCK_VERTEX_SHADER = /* glsl */ `
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

const ROCK_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uDeepColor;
  uniform vec3 uWarmColor;
  uniform vec3 uQuartzColor;

  varying vec3 vFacetColor;
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.42, 0.78, 0.48));
    float lightAmount = dot(normalize(vViewNormal), lightDirection) * 0.5 + 0.5;
    float lightBand = mix(0.64, 0.82, step(0.28, lightAmount));
    lightBand = mix(lightBand, 1.04, step(0.68, lightAmount));

    float grainA = sin(dot(vLocalPosition, vec3(43.7, 31.1, 37.9)) + sin(vLocalPosition.y * 19.0));
    float grainB = sin(dot(vLocalPosition, vec3(18.3, 47.1, 29.7)) - vLocalPosition.x * 12.0);
    float grain = step(0.32, grainA * grainB) * 0.045 - step(0.48, -grainA * grainB) * 0.035;

    float strataWave = sin((vLocalPosition.y + vLocalPosition.z * 0.16) * 28.0 + sin(vLocalPosition.x * 8.6) * 0.82);
    float warmStrata = smoothstep(0.7, 0.92, strataWave) * 0.22;

    float veinFieldA = abs(vLocalPosition.x * 0.58 + vLocalPosition.y * 0.24 + sin(vLocalPosition.z * 7.6 + vLocalPosition.y * 2.2 + sin(vLocalPosition.x * 21.0) * 0.34) * 0.075 + 0.12);
    float veinFieldB = abs(vLocalPosition.y * 0.5 - vLocalPosition.z * 0.38 + sin(vLocalPosition.x * 8.8 - vLocalPosition.z * 2.4 + sin(vLocalPosition.y * 24.0) * 0.3) * 0.052 - 0.17);
    float veinBreak = mix(0.38, 1.0, step(-0.18, sin(dot(vLocalPosition, vec3(31.0, 23.0, 27.0)))));
    float quartzVein = max(
      1.0 - smoothstep(0.006, 0.019, veinFieldA),
      (1.0 - smoothstep(0.005, 0.015, veinFieldB)) * 0.68
    ) * veinBreak;

    float fractureField = abs(vLocalPosition.x * 0.2 - vLocalPosition.y * 0.62 + sin(vLocalPosition.z * 9.4 + vLocalPosition.x * 2.0) * 0.045 - 0.23);
    float fracture = (1.0 - smoothstep(0.006, 0.02, fractureField)) * 0.42;
    float poreNoise = sin(dot(vLocalPosition, vec3(71.0, 53.0, 67.0))) * sin(dot(vLocalPosition, vec3(47.0, 79.0, 41.0)));
    float mineralPore = step(0.82, poreNoise) * 0.13;

    vec3 rockColor = vFacetColor * (lightBand + grain);
    rockColor = mix(rockColor, uWarmColor * lightBand, warmStrata);
    rockColor = mix(rockColor, uQuartzColor * mix(0.72, 1.0, lightAmount), quartzVein * 0.56);
    rockColor = mix(rockColor, uDeepColor, fracture);
    rockColor = mix(rockColor, uDeepColor, mineralPore);

    gl_FragColor = vec4(rockColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function RockSurfaceMaterial() {
  const uniforms = useMemo(
    () => ({
      uDeepColor: { value: new THREE.Color(ROCK_SHELL_DEEP) },
      uWarmColor: { value: new THREE.Color(ROCK_SHELL_WARM) },
      uQuartzColor: { value: new THREE.Color(ROCK_SHELL_QUARTZ) },
    }),
    [],
  )

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={ROCK_VERTEX_SHADER}
      fragmentShader={ROCK_FRAGMENT_SHADER}
      side={THREE.FrontSide}
      depthTest
      depthWrite
      dithering
    />
  )
}

function RockCrownCrag({ spec, index }: { spec: RockCragSpec; index: number }) {
  return (
    <OutlineMesh
      name={`rock-shell-crown-crag-${index}`}
      position={spec.position}
      rotation={spec.rotation}
      scale={spec.scale}
      outlineWidth={0.008}
      outlineColor={ROCK_SHELL_INK}
      geometry={<dodecahedronGeometry args={[1, 0]} />}
      material={<meshToonMaterial color={spec.color} />}
    />
  )
}

export function RockShell({ fitted = false }: RockShellProps) {
  const geometry = useMemo(() => createRockShellGeometry(), [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group name="rock-shell-geological-body">
      <OutlineMesh
        name="rock-shell-body"
        outlineWidth={fitted ? 0.042 : 0.052}
        outlineColor={ROCK_SHELL_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<RockSurfaceMaterial />}
      />
      <group name="rock-shell-embedded-crag-crown">
        {ROCK_CROWN_CRAGS.map((spec, index) => (
          <RockCrownCrag key={`rock-shell-crown-crag-${index}`} spec={spec} index={index} />
        ))}
      </group>
    </group>
  )
}

export function RockShellOpeningLip() {
  const geometry = useMemo(() => createRockOpeningGeometry(), [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group name="rock-shell-faceted-opening">
      <OutlineMesh
        name="rock-shell-opening-lip"
        outlineWidth={0.014}
        outlineColor={ROCK_SHELL_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<RockSurfaceMaterial />}
      />
      <mesh position={[0.018, -0.331, -0.752]} rotation-z={0.02} scale={[0.35, 0.022, 0.01]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={ROCK_SHELL_DEEP} transparent opacity={0.34} depthTest depthWrite={false} />
      </mesh>
    </group>
  )
}
