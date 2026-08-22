import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

export const HEAVY_DUTY_INK = '#151a14'
export const HEAVY_DUTY_STEEL_DEEP = '#252d23'
export const HEAVY_DUTY_STEEL_SHADOW = '#35402f'
export const HEAVY_DUTY_STEEL_BASE = '#4a5a38'
export const HEAVY_DUTY_STEEL_MID = '#607043'
export const HEAVY_DUTY_STEEL_LIGHT = '#829052'
export const HEAVY_DUTY_EDGE_WEAR = '#aaa06f'
export const HEAVY_DUTY_STENCIL = '#d1c783'
export const HEAVY_DUTY_RUST = '#7b4b2d'
export const HEAVY_DUTY_MUD = '#584936'

type HeavyDutyShellProps = {
  fitted?: boolean
  hasHeadAccessory?: boolean
}

type PlateSpec = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
}

type BoltSpec = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  color?: string
}

type WeldSpec = {
  id: string
  points: [number, number, number][]
  radius: number
  color: string
}

const SIDE_PLATES: PlateSpec[] = [
  {
    id: 'left-upper-shoulder',
    position: [-0.735, 0.27, 0.08],
    rotation: [0.02, -0.06, -0.035],
    scale: [0.17, 0.2, 0.34],
    color: HEAVY_DUTY_STEEL_MID,
  },
  {
    id: 'right-upper-shoulder',
    position: [0.735, 0.255, 0.06],
    rotation: [-0.025, 0.05, 0.025],
    scale: [0.17, 0.19, 0.32],
    color: HEAVY_DUTY_STEEL_BASE,
  },
  {
    id: 'left-lower-skirt',
    position: [-0.745, -0.31, 0.16],
    rotation: [0.04, 0.09, 0.025],
    scale: [0.18, 0.22, 0.35],
    color: HEAVY_DUTY_STEEL_SHADOW,
  },
  {
    id: 'right-lower-skirt',
    position: [0.745, -0.3, 0.14],
    rotation: [-0.03, -0.08, -0.02],
    scale: [0.18, 0.22, 0.34],
    color: HEAVY_DUTY_STEEL_SHADOW,
  },
  {
    id: 'left-front-skirt',
    position: [-0.73, -0.32, -0.23],
    rotation: [-0.02, -0.12, -0.045],
    scale: [0.16, 0.18, 0.21],
    color: HEAVY_DUTY_STEEL_BASE,
  },
  {
    id: 'right-front-skirt',
    position: [0.73, -0.315, -0.23],
    rotation: [0.02, 0.12, 0.04],
    scale: [0.16, 0.18, 0.21],
    color: HEAVY_DUTY_STEEL_MID,
  },
]

const ARMOR_BOLTS: BoltSpec[] = [
  { id: 'brow-left', position: [-0.43, 0.32, -0.79], rotation: [Math.PI / 2, 0, 0] },
  { id: 'brow-right', position: [0.43, 0.32, -0.79], rotation: [Math.PI / 2, 0, 0] },
  { id: 'chin-left', position: [-0.27, -0.405, -0.795], rotation: [Math.PI / 2, 0, 0] },
  { id: 'chin-right', position: [0.27, -0.405, -0.795], rotation: [Math.PI / 2, 0, 0] },
  { id: 'left-shoulder-high', position: [-0.835, 0.34, 0.02], rotation: [0, 0, Math.PI / 2] },
  { id: 'left-skirt-low', position: [-0.845, -0.4, 0.18], rotation: [0, 0, Math.PI / 2] },
  { id: 'right-shoulder-high', position: [0.835, 0.33, 0.0], rotation: [0, 0, Math.PI / 2] },
  { id: 'right-skirt-low', position: [0.845, -0.39, 0.17], rotation: [0, 0, Math.PI / 2] },
  { id: 'rear-upper-left', position: [-0.3, 0.27, 0.686], rotation: [Math.PI / 2, 0, 0] },
  { id: 'rear-upper-right', position: [0.3, 0.27, 0.686], rotation: [Math.PI / 2, 0, 0] },
  { id: 'rear-lower-left', position: [-0.3, -0.25, 0.69], rotation: [Math.PI / 2, 0, 0] },
  { id: 'rear-lower-right', position: [0.3, -0.25, 0.69], rotation: [Math.PI / 2, 0, 0] },
]

const WELD_SPECS: WeldSpec[] = [
  {
    id: 'left-brow-weld',
    points: [
      [-0.55, 0.25, -0.685],
      [-0.49, 0.38, -0.65],
      [-0.37, 0.48, -0.565],
    ],
    radius: 0.013,
    color: HEAVY_DUTY_STEEL_LIGHT,
  },
  {
    id: 'right-brow-weld',
    points: [
      [0.55, 0.25, -0.685],
      [0.49, 0.38, -0.65],
      [0.37, 0.48, -0.565],
    ],
    radius: 0.013,
    color: HEAVY_DUTY_STEEL_LIGHT,
  },
  {
    id: 'rear-left-weld',
    points: [
      [-0.43, 0.3, 0.55],
      [-0.49, 0.07, 0.6],
      [-0.43, -0.19, 0.58],
    ],
    radius: 0.011,
    color: HEAVY_DUTY_STEEL_BASE,
  },
  {
    id: 'rear-right-weld',
    points: [
      [0.43, 0.3, 0.55],
      [0.49, 0.07, 0.6],
      [0.43, -0.19, 0.58],
    ],
    radius: 0.011,
    color: HEAVY_DUTY_STEEL_BASE,
  },
]

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1)
}

function smoothstep01(value: number) {
  const clamped = clamp01(value)
  return clamped * clamped * (3 - 2 * clamped)
}

function hash3(x: number, y: number, z: number) {
  return Math.abs(Math.sin(x * 71.7 + y * 117.3 + z * 43.1) * 43758.5453) % 1
}

function superellipsePoint(angle: number, xRadius: number, yRadius: number) {
  const cosAngle = Math.cos(angle)
  const sinAngle = Math.sin(angle)
  return new THREE.Vector2(
    Math.sign(cosAngle || 1) * Math.pow(Math.abs(cosAngle), 0.58) * xRadius,
    Math.sign(sinAngle || 1) * Math.pow(Math.abs(sinAngle), 0.64) * yRadius,
  )
}

function createHeavyDutyHullGeometry() {
  const indexed = new THREE.SphereGeometry(1, 44, 30)
  const position = indexed.attributes.position as THREE.BufferAttribute
  const normal = new THREE.Vector3()
  const dentDirections = [
    { direction: new THREE.Vector3(-0.72, 0.22, -0.66).normalize(), depth: 0.026, hardness: 34 },
    { direction: new THREE.Vector3(0.8, -0.3, 0.5).normalize(), depth: 0.022, hardness: 38 },
    { direction: new THREE.Vector3(-0.22, 0.66, 0.72).normalize(), depth: 0.017, hardness: 42 },
  ]

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    normal.set(x, y, z).normalize()

    let dent = 0
    for (const spec of dentDirections) {
      dent += Math.exp((normal.dot(spec.direction) - 1) * spec.hardness) * spec.depth
    }

    const sideShoulder = Math.exp(-((y - 0.08) ** 2) / 0.23)
    const lowerSkirt = smoothstep01((-y - 0.22) / 0.58)
    const crownTaper = smoothstep01((y - 0.2) / 0.68)
    const boxX = Math.sign(x || 1) * Math.pow(Math.abs(x), 0.83)
    const boxY = Math.sign(y || 1) * Math.pow(Math.abs(y), 0.87)
    const boxZ = Math.sign(z || 1) * Math.pow(Math.abs(z), 0.88)
    const castRipple = 1
      + Math.sin(Math.atan2(z, x) * 8 + y * 5.5) * 0.006
      + Math.cos(y * 13 - x * 4.2) * 0.004
      - dent

    let nextX = boxX * 0.81 * castRipple * (1 + sideShoulder * 0.035 + lowerSkirt * 0.025)
    let nextY = -0.005 + boxY * 0.655 * castRipple
    const nextZ = -0.005 + boxZ * 0.655 * castRipple * (1 + lowerSkirt * 0.025)

    nextX *= 1 - crownTaper * 0.035
    if (nextY > 0.57) nextY = THREE.MathUtils.lerp(nextY, 0.63, smoothstep01((nextY - 0.57) / 0.09) * 0.52)
    if (nextY < -0.51) nextY = THREE.MathUtils.lerp(nextY, -0.59, smoothstep01((-nextY - 0.51) / 0.12) * 0.72)

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
  const color = new THREE.Color()
  const deep = new THREE.Color(HEAVY_DUTY_STEEL_DEEP)
  const shadow = new THREE.Color(HEAVY_DUTY_STEEL_SHADOW)
  const base = new THREE.Color(HEAVY_DUTY_STEEL_BASE)
  const mid = new THREE.Color(HEAVY_DUTY_STEEL_MID)
  const light = new THREE.Color(HEAVY_DUTY_STEEL_LIGHT)
  const mud = new THREE.Color(HEAVY_DUTY_MUD)

  for (let index = 0; index < sourcePosition.count; index += 3) {
    const centerX = (sourcePosition.getX(index) + sourcePosition.getX(index + 1) + sourcePosition.getX(index + 2)) / 3
    const centerY = (sourcePosition.getY(index) + sourcePosition.getY(index + 1) + sourcePosition.getY(index + 2)) / 3
    const centerZ = (sourcePosition.getZ(index) + sourcePosition.getZ(index + 1) + sourcePosition.getZ(index + 2)) / 3
    const aperture = Math.pow(Math.abs(centerX / 0.465), 4.2)
      + Math.pow(Math.abs((centerY + 0.02) / 0.35), 4.2)

    if (centerZ < -0.47 && aperture < 1.03) continue

    const faceNormalY = (sourceNormal.getY(index) + sourceNormal.getY(index + 1) + sourceNormal.getY(index + 2)) / 3
    const random = hash3(centerX, centerY, centerZ)
    const panelBias = Math.sin(Math.atan2(centerZ, centerX) * 5.0 + centerY * 2.8)
    color.copy(base)
    if (faceNormalY > 0.42) color.lerp(light, 0.2)
    if (panelBias > 0.66) color.lerp(mid, 0.24)
    if (panelBias < -0.72) color.lerp(shadow, 0.27)
    if (random > 0.8) color.lerp(mid, 0.16)
    if (random < 0.12) color.lerp(deep, 0.18)
    const mudAmount = smoothstep01((-centerY - 0.33) / 0.24) * (0.45 + random * 0.2)
    color.lerp(mud, mudAmount)

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

function createHeavyDutyOpeningWallGeometry() {
  const segments = 72
  const rings = 5
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings
    const ease = smoothstep01(t)
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const lower = Math.max(0, -Math.sin(angle))
      const side = Math.abs(Math.cos(angle))
      const point = superellipsePoint(
        angle,
        THREE.MathUtils.lerp(0.405, 0.505 + side * 0.012, ease),
        THREE.MathUtils.lerp(0.292, 0.385 + lower * 0.01, ease),
      )
      vertices.push(
        point.x,
        -0.02 + point.y,
        THREE.MathUtils.lerp(-0.79, -0.505 + side * 0.025, ease),
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

function createBentArmorPlateGeometry(shape: THREE.Shape, depth = 0.09, sideWrap = 0.13) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.014,
    bevelThickness: 0.014,
    curveSegments: 10,
  })
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const wrap = Math.pow(Math.min(1, Math.abs(x) / 0.58), 2) * sideWrap
    position.setZ(index, -0.805 + z + wrap)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createBrowPlateGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.57, 0.28)
  shape.lineTo(-0.47, 0.405)
  shape.quadraticCurveTo(0, 0.5, 0.47, 0.405)
  shape.lineTo(0.57, 0.28)
  shape.lineTo(0.52, 0.2)
  shape.quadraticCurveTo(0, 0.285, -0.52, 0.2)
  shape.closePath()
  return createBentArmorPlateGeometry(shape, 0.105, 0.145)
}

function createCheekPlateGeometry(side: -1 | 1) {
  const sx = (value: number) => value * side
  const shape = new THREE.Shape()
  shape.moveTo(sx(0.39), 0.24)
  shape.lineTo(sx(0.55), 0.29)
  shape.lineTo(sx(0.615), 0.13)
  shape.lineTo(sx(0.585), -0.29)
  shape.lineTo(sx(0.46), -0.405)
  shape.lineTo(sx(0.36), -0.32)
  shape.quadraticCurveTo(sx(0.415), -0.08, sx(0.39), 0.24)
  shape.closePath()
  return createBentArmorPlateGeometry(shape, 0.11, 0.155)
}

function createChinPlateGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.34, -0.31)
  shape.quadraticCurveTo(0, -0.365, 0.34, -0.31)
  shape.lineTo(0.29, -0.48)
  shape.quadraticCurveTo(0, -0.545, -0.29, -0.48)
  shape.closePath()
  return createBentArmorPlateGeometry(shape, 0.1, 0.045)
}

function createWeldGeometry(spec: WeldSpec) {
  const curve = new THREE.CatmullRomCurve3(
    spec.points.map((point) => new THREE.Vector3(...point)),
    false,
    'centripetal',
    0.45,
  )
  return new THREE.TubeGeometry(curve, 28, spec.radius, 7, false)
}

const HEAVY_DUTY_VERTEX_SHADER = /* glsl */ `
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

const HEAVY_DUTY_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uDeepSteel;
  uniform vec3 uBareSteel;
  uniform vec3 uRust;
  uniform vec3 uMud;

  varying vec3 vSurfaceColor;
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vec3 normal = normalize(vViewNormal);
    vec3 lightDirection = normalize(vec3(-0.48, 0.82, 0.38));
    float lightAmount = dot(normal, lightDirection) * 0.5 + 0.5;
    float toonBand = mix(0.64, 0.84, step(0.31, lightAmount));
    toonBand = mix(toonBand, 1.08, step(0.72, lightAmount));

    float angle = atan(vLocalPosition.z, vLocalPosition.x);
    float horizontalSeam = 1.0 - smoothstep(0.012, 0.032, abs(vLocalPosition.y + 0.285));
    float crownSeam = 1.0 - smoothstep(0.012, 0.035, abs(vLocalPosition.y - 0.36));
    float verticalSeam = 1.0 - smoothstep(0.012, 0.032, abs(sin(angle * 4.0 + 0.22)));
    float seam = max(horizontalSeam * 0.45, max(crownSeam * 0.35, verticalSeam * 0.18));

    float grainA = sin(dot(vLocalPosition, vec3(47.0, 71.0, 31.0)));
    float grainB = sin(dot(vLocalPosition, vec3(83.0, 29.0, 59.0)) + 1.4);
    float castPore = smoothstep(0.84, 0.985, grainA * grainB) * 0.13;
    float longScratch = smoothstep(0.965, 0.998, sin(vLocalPosition.x * 78.0 + vLocalPosition.y * 13.0 + vLocalPosition.z * 24.0));
    longScratch *= smoothstep(0.18, 0.9, abs(grainB));
    float chip = longScratch * 0.52 + castPore;

    float rustField = sin(vLocalPosition.x * 19.0 - vLocalPosition.z * 14.0)
      * sin(vLocalPosition.y * 27.0 + vLocalPosition.z * 8.0);
    float rustPocket = smoothstep(0.78, 0.96, rustField) * (seam * 0.62 + castPore * 0.4);
    float mudLine = (1.0 - smoothstep(-0.58, -0.22, vLocalPosition.y))
      * (0.62 + 0.22 * sin(vLocalPosition.x * 14.0 + vLocalPosition.z * 9.0));

    vec3 surfaceColor = vSurfaceColor * toonBand;
    surfaceColor = mix(surfaceColor, uDeepSteel * toonBand, seam + castPore * 0.35);
    surfaceColor = mix(surfaceColor, uBareSteel * toonBand, chip * 0.42);
    surfaceColor = mix(surfaceColor, uRust * toonBand, rustPocket * 0.58);
    surfaceColor = mix(surfaceColor, uMud * toonBand, clamp(mudLine, 0.0, 0.55));

    gl_FragColor = vec4(surfaceColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function HeavyDutySurfaceMaterial() {
  const uniforms = useMemo(
    () => ({
      uDeepSteel: { value: new THREE.Color(HEAVY_DUTY_STEEL_DEEP) },
      uBareSteel: { value: new THREE.Color(HEAVY_DUTY_EDGE_WEAR) },
      uRust: { value: new THREE.Color(HEAVY_DUTY_RUST) },
      uMud: { value: new THREE.Color(HEAVY_DUTY_MUD) },
    }),
    [],
  )

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={HEAVY_DUTY_VERTEX_SHADER}
      fragmentShader={HEAVY_DUTY_FRAGMENT_SHADER}
      side={THREE.FrontSide}
      depthTest
      depthWrite
      dithering
    />
  )
}

function ArmorPlate({ spec }: { spec: PlateSpec }) {
  return (
    <OutlineMesh
      name={`heavy-duty-shell-plate-${spec.id}`}
      position={spec.position}
      rotation={spec.rotation}
      scale={spec.scale}
      outlineWidth={0.007}
      outlineColor={HEAVY_DUTY_INK}
      geometry={<boxGeometry args={[1, 1, 1, 2, 2, 2]} />}
      material={<meshToonMaterial color={spec.color} />}
    />
  )
}

function ArmorBolt({ spec }: { spec: BoltSpec }) {
  return (
    <OutlineMesh
      name={`heavy-duty-shell-recessed-bolt-${spec.id}`}
      position={spec.position}
      rotation={spec.rotation}
      outlineWidth={0.004}
      outlineColor={HEAVY_DUTY_INK}
      geometry={<cylinderGeometry args={[0.034, 0.038, 0.038, 8, 1]} />}
      material={<meshToonMaterial color={spec.color ?? HEAVY_DUTY_EDGE_WEAR} />}
    />
  )
}

function WeldSeam({ spec }: { spec: WeldSpec }) {
  const geometry = useMemo(() => createWeldGeometry(spec), [spec])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh name={`heavy-duty-shell-buried-weld-${spec.id}`}>
      <primitive object={geometry} attach="geometry" />
      <meshToonMaterial color={spec.color} />
    </mesh>
  )
}

function HandPort({ side }: { side: -1 | 1 }) {
  return (
    <group
      name={`heavy-duty-shell-${side < 0 ? 'left' : 'right'}-armored-hand-port`}
      position={[side * 0.785, -0.02, -0.035]}
      rotation={[0, Math.PI / 2, 0]}
    >
      <OutlineMesh
        outlineWidth={0.008}
        outlineColor={HEAVY_DUTY_INK}
        geometry={<torusGeometry args={[0.17, 0.045, 8, 28]} />}
        material={<meshToonMaterial color={HEAVY_DUTY_STEEL_SHADOW} />}
      />
      <mesh position={[0, 0, 0.02]} scale={[0.135, 0.135, 0.02]}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color={HEAVY_DUTY_STEEL_DEEP} side={THREE.DoubleSide} depthTest depthWrite />
      </mesh>
    </group>
  )
}

function RearEngineDeck() {
  return (
    <group name="heavy-duty-shell-rear-engine-deck">
      <OutlineMesh
        position={[0, 0.02, 0.615]}
        scale={[0.43, 0.3, 0.09]}
        outlineWidth={0.009}
        outlineColor={HEAVY_DUTY_INK}
        geometry={<boxGeometry args={[1, 1, 1, 2, 2, 2]} />}
        material={<meshToonMaterial color={HEAVY_DUTY_STEEL_SHADOW} />}
      />
      {[-0.18, -0.06, 0.06, 0.18].map((y, index) => (
        <OutlineMesh
          key={`heavy-duty-rear-louver-${index}`}
          name={`heavy-duty-shell-rear-louver-${index}`}
          position={[0, y + 0.02, 0.697]}
          rotation={[0.12, 0, 0]}
          scale={[0.32, 0.025, 0.035]}
          outlineWidth={0.004}
          outlineColor={HEAVY_DUTY_INK}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          material={<meshToonMaterial color={index % 2 === 0 ? HEAVY_DUTY_STEEL_BASE : HEAVY_DUTY_STEEL_MID} />}
        />
      ))}
      <OutlineMesh
        position={[-0.49, -0.34, 0.43]}
        rotation={[Math.PI / 2, 0, 0.12]}
        outlineWidth={0.006}
        outlineColor={HEAVY_DUTY_INK}
        geometry={<cylinderGeometry args={[0.075, 0.09, 0.12, 10, 2]} />}
        material={<meshToonMaterial color={HEAVY_DUTY_STEEL_DEEP} />}
      />
    </group>
  )
}

function HatchCrown({ hasHeadAccessory }: { hasHeadAccessory: boolean }) {
  return (
    <group name="heavy-duty-shell-low-turret-hatch">
      <OutlineMesh
        position={[0, 0.595, 0.055]}
        scale={[1, 1, 0.88]}
        outlineWidth={0.012}
        outlineColor={HEAVY_DUTY_INK}
        geometry={<cylinderGeometry args={[0.315, 0.37, 0.145, 10, 2]} />}
        material={<meshToonMaterial color={HEAVY_DUTY_STEEL_SHADOW} />}
      />
      {hasHeadAccessory ? null : (
        <>
          <OutlineMesh
            position={[0.015, 0.685, 0.05]}
            rotation={[0.015, 0.05, -0.025]}
            scale={[1, 1, 0.88]}
            outlineWidth={0.011}
            outlineColor={HEAVY_DUTY_INK}
            geometry={<cylinderGeometry args={[0.285, 0.305, 0.085, 10, 2]} />}
            material={<meshToonMaterial color={HEAVY_DUTY_STEEL_MID} />}
          />
          <group name="heavy-duty-shell-buried-hatch-grab">
            {[-0.075, 0.075].map((x) => (
              <OutlineMesh
                key={`heavy-duty-hatch-grab-root-${x}`}
                position={[x, 0.735, 0.035]}
                scale={[0.026, 0.035, 0.035]}
                outlineWidth={0.0035}
                outlineColor={HEAVY_DUTY_INK}
                geometry={<boxGeometry args={[1, 1, 1]} />}
                material={<meshToonMaterial color={HEAVY_DUTY_EDGE_WEAR} />}
              />
            ))}
            <OutlineMesh
              position={[0, 0.76, 0.035]}
              scale={[0.1, 0.018, 0.028]}
              outlineWidth={0.0035}
              outlineColor={HEAVY_DUTY_INK}
              geometry={<boxGeometry args={[1, 1, 1]} />}
              material={<meshToonMaterial color={HEAVY_DUTY_EDGE_WEAR} />}
            />
            {[-0.14, 0.14].map((x) => (
              <OutlineMesh
                key={`heavy-duty-hatch-hinge-${x}`}
                position={[x, 0.72, 0.205]}
                rotation={[0, 0, Math.PI / 2]}
                outlineWidth={0.003}
                outlineColor={HEAVY_DUTY_INK}
                geometry={<cylinderGeometry args={[0.035, 0.035, 0.07, 8, 1]} />}
                material={<meshToonMaterial color={HEAVY_DUTY_STEEL_DEEP} />}
              />
            ))}
          </group>
        </>
      )}
    </group>
  )
}

function TacticalStencil() {
  return (
    <group name="heavy-duty-shell-faded-tactical-chevron">
      <mesh position={[0.47, 0.085, -0.754]} rotation={[0, 0, -0.5]} scale={[0.13, 0.024, 0.015]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={HEAVY_DUTY_STENCIL} />
      </mesh>
      <mesh position={[0.515, 0.015, -0.737]} rotation={[0, 0, -0.5]} scale={[0.105, 0.022, 0.014]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={HEAVY_DUTY_STENCIL} />
      </mesh>
    </group>
  )
}

export function HeavyDutyShell({ fitted = false, hasHeadAccessory = false }: HeavyDutyShellProps) {
  const bodyGeometry = useMemo(() => createHeavyDutyHullGeometry(), [])

  useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry])

  return (
    <group name="heavy-duty-shell-armored-tank-hull">
      <OutlineMesh
        name="heavy-duty-shell-one-piece-cast-armor-body"
        outlineWidth={fitted ? 0.046 : 0.056}
        outlineColor={HEAVY_DUTY_INK}
        geometry={<primitive object={bodyGeometry} attach="geometry" />}
        material={<HeavyDutySurfaceMaterial />}
      />
      <group name="heavy-duty-shell-overlapping-side-skirts">
        {SIDE_PLATES.map((spec) => <ArmorPlate key={spec.id} spec={spec} />)}
      </group>
      <HandPort side={-1} />
      <HandPort side={1} />
      <HatchCrown hasHeadAccessory={hasHeadAccessory} />
      <RearEngineDeck />
      <group name="heavy-duty-shell-recessed-fasteners">
        {ARMOR_BOLTS.slice(4).map((spec) => <ArmorBolt key={spec.id} spec={spec} />)}
      </group>
      <group name="heavy-duty-shell-buried-weld-seams">
        {WELD_SPECS.map((spec) => <WeldSeam key={spec.id} spec={spec} />)}
      </group>
    </group>
  )
}

export function HeavyDutyShellOpeningArmor() {
  const wallGeometry = useMemo(() => createHeavyDutyOpeningWallGeometry(), [])
  const browGeometry = useMemo(() => createBrowPlateGeometry(), [])
  const leftCheekGeometry = useMemo(() => createCheekPlateGeometry(-1), [])
  const rightCheekGeometry = useMemo(() => createCheekPlateGeometry(1), [])
  const chinGeometry = useMemo(() => createChinPlateGeometry(), [])

  useEffect(
    () => () => {
      wallGeometry.dispose()
      browGeometry.dispose()
      leftCheekGeometry.dispose()
      rightCheekGeometry.dispose()
      chinGeometry.dispose()
    },
    [wallGeometry, browGeometry, leftCheekGeometry, rightCheekGeometry, chinGeometry],
  )

  return (
    <group name="heavy-duty-shell-protected-face-mantlet">
      <mesh name="heavy-duty-shell-deep-armored-face-tunnel">
        <primitive object={wallGeometry} attach="geometry" />
        <meshToonMaterial color={HEAVY_DUTY_STEEL_DEEP} side={THREE.DoubleSide} depthTest depthWrite />
      </mesh>
      <OutlineMesh
        name="heavy-duty-shell-reinforced-brow-plate"
        outlineWidth={0.012}
        outlineColor={HEAVY_DUTY_INK}
        geometry={<primitive object={browGeometry} attach="geometry" />}
        material={<meshToonMaterial color={HEAVY_DUTY_STEEL_MID} />}
      />
      <OutlineMesh
        name="heavy-duty-shell-left-cheek-plate"
        outlineWidth={0.011}
        outlineColor={HEAVY_DUTY_INK}
        geometry={<primitive object={leftCheekGeometry} attach="geometry" />}
        material={<meshToonMaterial color={HEAVY_DUTY_STEEL_BASE} />}
      />
      <OutlineMesh
        name="heavy-duty-shell-right-cheek-plate"
        outlineWidth={0.011}
        outlineColor={HEAVY_DUTY_INK}
        geometry={<primitive object={rightCheekGeometry} attach="geometry" />}
        material={<meshToonMaterial color={HEAVY_DUTY_STEEL_SHADOW} />}
      />
      <OutlineMesh
        name="heavy-duty-shell-reinforced-chin-plate"
        outlineWidth={0.011}
        outlineColor={HEAVY_DUTY_INK}
        geometry={<primitive object={chinGeometry} attach="geometry" />}
        material={<meshToonMaterial color={HEAVY_DUTY_STEEL_SHADOW} />}
      />
      <OutlineMesh
        name="heavy-duty-shell-buried-lower-threshold"
        position={[0, -0.345, -0.56]}
        scale={[0.38, 0.065, 0.155]}
        outlineWidth={0.006}
        outlineColor={HEAVY_DUTY_INK}
        geometry={<boxGeometry args={[1, 1, 1, 2, 2, 2]} />}
        material={<meshToonMaterial color={HEAVY_DUTY_STEEL_DEEP} />}
      />
      <group name="heavy-duty-shell-front-recessed-fasteners">
        {ARMOR_BOLTS.slice(0, 4).map((spec) => <ArmorBolt key={spec.id} spec={spec} />)}
      </group>
      <TacticalStencil />
    </group>
  )
}
