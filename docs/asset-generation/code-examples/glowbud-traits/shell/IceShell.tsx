import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'
import { createShellOpeningSealGeometry } from './ShellOpeningSeal'

export const ICE_INK = '#101c2a'
export const ICE_DEEP = '#326e91'
export const ICE_SHADOW = '#5daac9'
export const ICE_BLUE = '#82d8ec'
export const ICE_FROST = '#c8f2f5'
export const ICE_CLOUD = '#efffff'
export const ICE_GLINT = '#ffffff'

type IceShellProps = {
  fitted?: boolean
}

type CrackSpec = {
  id: string
  points: [number, number, number][]
  radius: number
  color: string
}

type MeltLobeSpec = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
}

const ICE_CRACKS: CrackSpec[] = [
  {
    id: 'front-left-main',
    points: [[-0.56, 0.28, -0.55], [-0.49, 0.2, -0.62], [-0.51, 0.09, -0.655], [-0.41, 0.0, -0.67]],
    radius: 0.011,
    color: ICE_DEEP,
  },
  {
    id: 'front-left-branch',
    points: [[-0.5, 0.1, -0.66], [-0.59, 0.05, -0.62], [-0.63, -0.04, -0.58]],
    radius: 0.008,
    color: ICE_SHADOW,
  },
  {
    id: 'front-right-main',
    points: [[0.56, -0.06, -0.59], [0.5, -0.15, -0.64], [0.53, -0.25, -0.62], [0.43, -0.36, -0.58]],
    radius: 0.01,
    color: ICE_DEEP,
  },
  {
    id: 'right-side',
    points: [[0.78, 0.33, -0.08], [0.81, 0.21, 0.02], [0.79, 0.08, 0.11], [0.8, -0.06, 0.18]],
    radius: 0.009,
    color: ICE_DEEP,
  },
  {
    id: 'left-side-frost',
    points: [[-0.79, -0.08, 0.0], [-0.8, -0.19, 0.1], [-0.76, -0.3, 0.2]],
    radius: 0.008,
    color: ICE_CLOUD,
  },
  {
    id: 'rear-crown',
    points: [[-0.26, 0.48, 0.49], [-0.14, 0.4, 0.57], [-0.03, 0.43, 0.61], [0.09, 0.34, 0.61]],
    radius: 0.01,
    color: ICE_DEEP,
  },
  {
    id: 'rear-lower',
    points: [[0.35, -0.2, 0.57], [0.27, -0.3, 0.61], [0.18, -0.38, 0.56]],
    radius: 0.008,
    color: ICE_CLOUD,
  },
]

const ICE_MELT_LOBES: MeltLobeSpec[] = [
  { id: 'front-left', position: [-0.48, -0.54, -0.36], rotation: [0.08, 0.16, -0.08], scale: [0.25, 0.14, 0.24], color: ICE_BLUE },
  { id: 'front-center', position: [-0.05, -0.65, -0.42], rotation: [-0.04, 0.1, 0.02], scale: [0.25, 0.08, 0.16], color: ICE_BLUE },
  { id: 'front-right', position: [0.39, -0.58, -0.38], rotation: [0.04, -0.18, 0.06], scale: [0.24, 0.13, 0.23], color: ICE_SHADOW },
  { id: 'right-side', position: [0.72, -0.39, 0.08], rotation: [0.08, 0.04, -0.12], scale: [0.16, 0.24, 0.22], color: ICE_BLUE },
  { id: 'left-side', position: [-0.7, -0.31, 0.2], rotation: [-0.1, 0.08, 0.12], scale: [0.11, 0.18, 0.18], color: ICE_BLUE },
  { id: 'rear-left', position: [-0.34, -0.55, 0.45], rotation: [0.08, -0.12, 0.06], scale: [0.24, 0.13, 0.21], color: ICE_SHADOW },
  { id: 'rear-right', position: [0.28, -0.57, 0.49], rotation: [-0.05, 0.1, -0.04], scale: [0.27, 0.12, 0.2], color: ICE_BLUE },
]

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1)
}

function smoothstep01(value: number) {
  const clamped = clamp01(value)
  return clamped * clamped * (3 - 2 * clamped)
}

function hash(index: number, x: number, y: number, z: number) {
  const value = Math.sin(index * 19.19 + x * 67.7 + y * 109.3 + z * 47.1) * 43758.5453
  return value - Math.floor(value)
}

function createIceShellGeometry() {
  const segments = 24
  const rings = 16
  const openingTheta = 0.565
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings
    const theta = THREE.MathUtils.lerp(openingTheta, Math.PI, t)
    const radial = Math.sin(theta)
    const z = -Math.cos(theta)

    for (let segment = 0; segment <= segments; segment += 1) {
      const phi = (segment / segments) * Math.PI * 2
      const cosPhi = Math.cos(phi)
      const sinPhi = Math.sin(phi)
      const superellipse = 1 / Math.pow(Math.pow(Math.abs(cosPhi), 4.2) + Math.pow(Math.abs(sinPhi), 4.2), 1 / 4.2)
      const irregular = 1
        + Math.sin(phi * 3.0 + t * 7.2) * 0.014
        + Math.cos(phi * 5.0 - t * 4.4) * 0.009
      const crownSoftening = sinPhi > 0.18 ? 1 - (sinPhi - 0.18) * 0.035 : 1
      const lowerMelt = sinPhi < -0.22 ? 1 + Math.abs(sinPhi + 0.22) * 0.028 : 1
      const rightSag = cosPhi > 0.3 && sinPhi < 0 ? 1 + Math.abs(sinPhi) * 0.022 : 1

      let x = cosPhi * radial * 0.77 * superellipse * irregular * rightSag
      let y = -0.035 + sinPhi * radial * 0.655 * superellipse * irregular * crownSoftening * lowerMelt
      const nextZ = -0.065 + z * 0.64 * (1 + Math.sin(phi * 2.0 + t * 3.1) * 0.008)

      const topFlatten = smoothstep01((y - 0.48) / 0.18)
      const baseFlatten = smoothstep01((-y - 0.49) / 0.18)
      y = THREE.MathUtils.lerp(y, 0.635 + Math.sin(phi * 4.0) * 0.009, topFlatten * 0.5)
      y = THREE.MathUtils.lerp(y, -0.65 + Math.cos(phi * 3.0) * 0.012, baseFlatten * 0.58)
      x *= 1 + baseFlatten * 0.035

      vertices.push(x, y, nextZ)
    }
  }

  const row = segments + 1
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const base = ring * row + segment
      indices.push(base, base + 1, base + row)
      indices.push(base + 1, base + row + 1, base + row)
    }
  }

  const indexed = new THREE.BufferGeometry()
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  indexed.setIndex(indices)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.computeVertexNormals()
  applyIceColors(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function applyIceColors(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position as THREE.BufferAttribute
  const normal = geometry.attributes.normal as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deep = new THREE.Color(ICE_DEEP)
  const shadow = new THREE.Color(ICE_SHADOW)
  const blue = new THREE.Color(ICE_BLUE)
  const frost = new THREE.Color(ICE_FROST)
  const cloud = new THREE.Color(ICE_CLOUD)
  const color = new THREE.Color()

  for (let index = 0; index < position.count; index += 3) {
    const x = (position.getX(index) + position.getX(index + 1) + position.getX(index + 2)) / 3
    const y = (position.getY(index) + position.getY(index + 1) + position.getY(index + 2)) / 3
    const z = (position.getZ(index) + position.getZ(index + 1) + position.getZ(index + 2)) / 3
    const normalY = (normal.getY(index) + normal.getY(index + 1) + normal.getY(index + 2)) / 3
    const noise = hash(index / 3, x, y, z)

    color.copy(blue)
    color.lerp(frost, smoothstep01((y + 0.38) / 0.9) * 0.46)
    if (normalY > 0.42) color.lerp(cloud, 0.36)
    if (normalY < -0.38) color.lerp(deep, 0.25)
    if (noise < 0.18) color.lerp(shadow, 0.32)
    if (noise > 0.78) color.lerp(cloud, 0.44)

    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = (index + vertex) * 3
      colors[offset] = color.r
      colors[offset + 1] = color.g
      colors[offset + 2] = color.b
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function createIceOpeningGeometry() {
  const segments = 48
  const tubeSegments = 10
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const lower = Math.max(0, -sinAngle)
    const upper = Math.max(0, sinAngle)
    const side = Math.max(0, Math.abs(cosAngle) - 0.22)
    const meltRhythm = 1 + Math.sin(angle * 3.0 + 0.4) * 0.013 + Math.cos(angle * 7.0 - 0.6) * 0.008
    const centerX = 0.44 + side * 0.026
    const centerY = 0.324 + lower * 0.024
    const centerZ = -0.706 + side * 0.036 - lower * 0.012
    const radialRadius = (0.058 + lower * 0.016 + upper * 0.005 + side * 0.01) * meltRhythm
    const depthRadius = 0.044 + side * 0.012

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      vertices.push(
        0.027 + cosAngle * (centerX + tubeRadial * radialRadius) * meltRhythm,
        -0.035 + sinAngle * (centerY + tubeRadial * radialRadius) * meltRhythm - lower * 0.03,
        centerZ + tubeDepth * depthRadius + Math.max(0, tubeRadial) * (0.06 + side * 0.025),
      )
    }
  }

  const row = tubeSegments + 1
  for (let segment = 0; segment < segments; segment += 1) {
    for (let tube = 0; tube < tubeSegments; tube += 1) {
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
  applyIceColors(geometry)
  return geometry
}

const ICE_VERTEX_SHADER = /* glsl */ `
  attribute vec3 color;
  varying vec3 vColor;
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vColor = color;
    vLocalPosition = position;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ICE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uCloud;
  uniform vec3 uGlint;

  varying vec3 vColor;
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vec3 normal = normalize(vViewNormal);
    vec3 lightDirection = normalize(vec3(-0.46, 0.76, 0.54));
    float lightAmount = dot(normal, lightDirection) * 0.5 + 0.5;
    float toonLight = mix(0.7, 0.88, step(0.34, lightAmount));
    toonLight = mix(toonLight, 1.04, step(0.68, lightAmount));

    float cloudA = sin(dot(vLocalPosition, vec3(10.7, 14.9, 12.3)) + sin(vLocalPosition.z * 18.0) * 0.9);
    float cloudB = sin(dot(vLocalPosition, vec3(21.3, 8.7, 17.1)) - sin(vLocalPosition.x * 15.0) * 0.7);
    float cloudField = cloudA * 0.58 + cloudB * 0.42;
    float softCloud = smoothstep(0.12, 0.68, cloudField) * 0.28;
    float denseCloud = smoothstep(0.7, 0.94, abs(cloudA * cloudB)) * 0.22;
    float lowerBlue = smoothstep(-0.05, -0.62, vLocalPosition.y) * 0.2;
    float fresnel = pow(1.0 - abs(normal.z), 2.2);

    vec3 color = vColor;
    color = mix(color, uCloud, softCloud + denseCloud);
    color = mix(color, uDeep, lowerBlue);
    color = mix(color, uGlint, fresnel * 0.18);
    gl_FragColor = vec4(color * toonLight, 1.0);
  }
`

function IceSurfaceMaterial() {
  const uniforms = useMemo(
    () => ({
      uDeep: { value: new THREE.Color(ICE_DEEP) },
      uCloud: { value: new THREE.Color(ICE_CLOUD) },
      uGlint: { value: new THREE.Color(ICE_GLINT) },
    }),
    [],
  )

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={ICE_VERTEX_SHADER}
      fragmentShader={ICE_FRAGMENT_SHADER}
      side={THREE.FrontSide}
      depthTest
      depthWrite
      dithering
    />
  )
}

function IceCrack({ spec }: { spec: CrackSpec }) {
  const geometry = useMemo(
    () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spec.points.map((point) => new THREE.Vector3(...point))), 18, spec.radius, 5, false),
    [spec],
  )

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh name={`ice-shell-embedded-crack-${spec.id}`} geometry={geometry}>
      <meshToonMaterial color={spec.color} depthTest depthWrite />
    </mesh>
  )
}

function MeltLobe({ spec }: { spec: MeltLobeSpec }) {
  return (
    <mesh name={`ice-shell-melt-lobe-${spec.id}`} position={spec.position} rotation={spec.rotation} scale={spec.scale}>
      <dodecahedronGeometry args={[1, 1]} />
      <meshToonMaterial color={spec.color} depthTest depthWrite />
    </mesh>
  )
}

function IceIcicle({
  id,
  position,
  rotation = [0, 0, 0],
  length,
  radius,
}: {
  id: string
  position: [number, number, number]
  rotation?: [number, number, number]
  length: number
  radius: number
}) {
  return (
    <group name={`ice-shell-buried-root-icicle-${id}`} position={position} rotation={rotation}>
      <mesh position={[0, radius * 0.2, 0]} scale={[radius * 1.28, radius * 0.82, radius * 1.12]}>
        <sphereGeometry args={[1, 10, 6]} />
        <meshToonMaterial color={ICE_FROST} depthTest depthWrite />
      </mesh>
      <OutlineMesh
        position={[0, -length * 0.38, 0]}
        rotation={[0, 0, Math.PI]}
        outlineWidth={0.0035}
        outlineColor={ICE_INK}
        geometry={<coneGeometry args={[radius, length, 7, 1]} />}
        material={<meshToonMaterial color={ICE_BLUE} depthTest depthWrite />}
      />
    </group>
  )
}

export function IceShell({ fitted = false }: IceShellProps) {
  const geometry = useMemo(() => createIceShellGeometry(), [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group name="ice-shell-clouded-rounded-block-body">
      <OutlineMesh
        name="ice-shell-frosted-hull"
        outlineWidth={fitted ? 0.045 : 0.055}
        outlineColor={ICE_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<IceSurfaceMaterial />}
      />
      <group name="ice-shell-integrated-melt-lobes">
        {ICE_MELT_LOBES.map((spec) => (
          <MeltLobe key={spec.id} spec={spec} />
        ))}
      </group>
      <group name="ice-shell-depth-tested-crack-network">
        {ICE_CRACKS.filter((spec) => spec.id !== 'right-side').map((spec) => (
          <IceCrack key={spec.id} spec={spec} />
        ))}
      </group>
      <group name="ice-shell-crown-frost-bulges">
        <mesh position={[-0.42, 0.535, 0.04]} rotation={[0.12, -0.16, -0.06]} scale={[0.23, 0.075, 0.22]}>
          <dodecahedronGeometry args={[1, 1]} />
          <meshToonMaterial color={ICE_FROST} depthTest depthWrite />
        </mesh>
        <mesh position={[0.02, 0.585, 0.12]} rotation={[-0.08, 0.14, 0.04]} scale={[0.28, 0.07, 0.25]}>
          <dodecahedronGeometry args={[1, 1]} />
          <meshToonMaterial color={ICE_FROST} depthTest depthWrite />
        </mesh>
        <mesh position={[0.43, 0.52, 0.03]} rotation={[0.08, 0.18, 0.08]} scale={[0.21, 0.07, 0.21]}>
          <dodecahedronGeometry args={[1, 1]} />
          <meshToonMaterial color={ICE_BLUE} depthTest depthWrite />
        </mesh>
      </group>
    </group>
  )
}

export function IceShellOpeningLip() {
  const geometry = useMemo(() => createIceOpeningGeometry(), [])
  const sealGeometry = useMemo(() => {
    const seal = createShellOpeningSealGeometry({
      segments: 48,
      rings: 6,
      centerX: 0.027,
      centerY: -0.035,
      frontXRadius: 0.515,
      frontYRadius: 0.382,
      backXRadius: 0.557,
      backYRadius: 0.432,
      frontZ: -0.625,
      backZ: -0.49,
      xCurve: 0.9,
      yCurve: 0.9,
      lowerDrop: 0.015,
      sideDepth: 0.012,
      surfaceRipple: 0.004,
      ripplePhase: 0.4,
    })
    applyIceColors(seal)
    return seal
  }, [])

  useEffect(() => () => {
    geometry.dispose()
    sealGeometry.dispose()
  }, [geometry, sealGeometry])

  return (
    <group name="ice-shell-melting-frozen-aperture">
      <mesh name="ice-shell-continuous-aperture-seal">
        <primitive object={sealGeometry} attach="geometry" />
        <IceSurfaceMaterial />
      </mesh>
      <OutlineMesh
        name="ice-shell-rounded-opening-lip"
        outlineWidth={0.012}
        outlineColor={ICE_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<IceSurfaceMaterial />}
      />
      <mesh position={[0.015, -0.337, -0.75]} rotation-z={0.018} scale={[0.35, 0.022, 0.012]}>
        <sphereGeometry args={[1, 14, 5]} />
        <meshToonMaterial color={ICE_DEEP} depthTest depthWrite />
      </mesh>
      <IceIcicle id="left-brow" position={[-0.355, 0.212, -0.748]} rotation={[0.02, 0.08, -0.08]} length={0.14} radius={0.035} />
      <IceIcicle id="right-brow" position={[0.372, 0.18, -0.746]} rotation={[-0.02, -0.06, 0.07]} length={0.105} radius={0.03} />
      <IceIcicle id="lower-right-melt" position={[0.405, -0.235, -0.735]} rotation={[0.02, -0.12, 0.12]} length={0.085} radius={0.027} />
    </group>
  )
}
