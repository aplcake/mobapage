import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'
import { createShellOpeningSealGeometry } from './ShellOpeningSeal'

export const DIAMOND_INK = '#111522'
export const DIAMOND_DEEP = '#245378'
export const DIAMOND_SHADOW = '#6598b9'
export const DIAMOND_CYAN = '#6fe7ff'
export const DIAMOND_BODY = '#c8edf8'
export const DIAMOND_WHITE = '#fffdf7'
export const DIAMOND_LAVENDER = '#d8d4ff'
export const DIAMOND_BLUSH = '#ffd9ec'

type DiamondShellProps = {
  fitted?: boolean
}

type SparkleSpec = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  tint?: string
}

const DIAMOND_SPARKLES: SparkleSpec[] = [
  { id: 'front-crown', position: [-0.3, 0.48, -0.625], rotation: [0.08, 0, -0.1], scale: 1.08 },
  { id: 'front-right', position: [0.53, 0.17, -0.625], rotation: [0.02, -0.18, 0.16], scale: 0.82, tint: DIAMOND_CYAN },
  { id: 'front-left-low', position: [-0.49, -0.31, -0.61], rotation: [-0.04, 0.14, -0.12], scale: 0.72, tint: DIAMOND_BLUSH },
  { id: 'right-shoulder', position: [0.79, 0.3, -0.02], rotation: [0.03, -Math.PI / 2, 0.1], scale: 0.74 },
  { id: 'left-rear', position: [-0.69, 0.12, 0.44], rotation: [0.04, Math.PI * 0.72, -0.08], scale: 0.68, tint: DIAMOND_LAVENDER },
  { id: 'rear-crown', position: [0.18, 0.45, 0.61], rotation: [0.06, Math.PI, 0.18], scale: 0.92 },
  { id: 'rear-low', position: [-0.25, -0.35, 0.6], rotation: [-0.05, Math.PI, -0.12], scale: 0.64, tint: DIAMOND_CYAN },
]

function hash(index: number, x: number, y: number, z: number) {
  const value = Math.sin(index * 17.13 + x * 71.7 + y * 113.1 + z * 43.9) * 43758.5453
  return value - Math.floor(value)
}

function createDiamondShellGeometry() {
  const segments = 20
  const rings = 12
  const openingTheta = 0.56
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings
    const theta = THREE.MathUtils.lerp(openingTheta, Math.PI, t)
    const radial = Math.sin(theta)
    const z = -Math.cos(theta)
    const ringCut = 1 + Math.sin(t * Math.PI * 7.0 + 0.35) * 0.014
    const crown = Math.max(0, Math.min(1, (radial - 0.66) / 0.34))

    for (let segment = 0; segment <= segments; segment += 1) {
      const phi = (segment / segments) * Math.PI * 2
      const cosPhi = Math.cos(phi)
      const sinPhi = Math.sin(phi)
      const octagonalCut = 1 + Math.cos(phi * 8) * 0.018
      const asymmetricBrilliance = 1 + Math.sin(phi * 3 + ring * 1.7) * 0.009
      const lowerPavilion = sinPhi < -0.35 ? 1 - Math.abs(sinPhi + 0.35) * 0.035 : 1
      const upperCrown = sinPhi > 0.28 ? 1 + (sinPhi - 0.28) * 0.026 : 1

      vertices.push(
        cosPhi * radial * 0.825 * octagonalCut * ringCut * asymmetricBrilliance,
        -0.03 + sinPhi * radial * 0.715 * ringCut * lowerPavilion * upperCrown,
        -0.075 + z * 0.65 * (1 + crown * 0.018),
      )
    }
  }

  const row = segments + 1
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const base = ring * row + segment
      const flip = (ring + segment) % 2 === 0
      if (flip) {
        indices.push(base, base + 1, base + row)
        indices.push(base + 1, base + row + 1, base + row)
      } else {
        indices.push(base, base + row + 1, base + row)
        indices.push(base, base + 1, base + row + 1)
      }
    }
  }

  const indexed = new THREE.BufferGeometry()
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  indexed.setIndex(indices)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.computeVertexNormals()
  applyDiamondFacetColors(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function applyDiamondFacetColors(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position as THREE.BufferAttribute
  const normal = geometry.attributes.normal as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deep = new THREE.Color(DIAMOND_DEEP)
  const shadow = new THREE.Color(DIAMOND_SHADOW)
  const cyan = new THREE.Color(DIAMOND_CYAN)
  const body = new THREE.Color(DIAMOND_BODY)
  const white = new THREE.Color(DIAMOND_WHITE)
  const lavender = new THREE.Color(DIAMOND_LAVENDER)
  const blush = new THREE.Color(DIAMOND_BLUSH)
  const color = new THREE.Color()

  for (let index = 0; index < position.count; index += 3) {
    const x = (position.getX(index) + position.getX(index + 1) + position.getX(index + 2)) / 3
    const y = (position.getY(index) + position.getY(index + 1) + position.getY(index + 2)) / 3
    const z = (position.getZ(index) + position.getZ(index + 1) + position.getZ(index + 2)) / 3
    const nx = (normal.getX(index) + normal.getX(index + 1) + normal.getX(index + 2)) / 3
    const ny = (normal.getY(index) + normal.getY(index + 1) + normal.getY(index + 2)) / 3
    const nz = (normal.getZ(index) + normal.getZ(index + 1) + normal.getZ(index + 2)) / 3
    const facetHash = hash(index / 3, x, y, z)

    color.copy(body)
    if (ny > 0.32) color.lerp(white, 0.58)
    if (ny < -0.42) color.lerp(deep, 0.34)
    if (nx > 0.3) color.lerp(cyan, 0.42)
    if (nx < -0.42) color.lerp(lavender, 0.34)
    if (nz > 0.35) color.lerp(shadow, 0.18)
    if (facetHash < 0.16) color.lerp(deep, 0.48)
    if (facetHash > 0.84) color.lerp(white, 0.62)
    if (facetHash > 0.72 && facetHash < 0.79) color.lerp(blush, 0.3)

    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = (index + vertex) * 3
      colors[offset] = color.r
      colors[offset + 1] = color.g
      colors[offset + 2] = color.b
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function createDiamondOpeningGeometry() {
  const segments = 32
  const tubeSegments = 6
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const lower = Math.max(0, -sinAngle)
    const side = Math.max(0, Math.abs(cosAngle) - 0.26)
    const facetPulse = 1 + Math.cos(angle * 8) * 0.014
    const centerX = 0.44 + side * 0.02
    const centerY = 0.322 + lower * 0.016
    const centerZ = -0.705 + side * 0.025 - lower * 0.008
    const radialRadius = (0.052 + lower * 0.008 + side * 0.008) * facetPulse
    const depthRadius = 0.042 + side * 0.008

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      vertices.push(
        0.026 + cosAngle * (centerX + tubeRadial * radialRadius) * facetPulse,
        -0.036 + sinAngle * (centerY + tubeRadial * radialRadius) * facetPulse - lower * 0.022,
        centerZ + tubeDepth * depthRadius + Math.max(0, tubeRadial) * 0.052,
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
  applyDiamondFacetColors(geometry)
  return geometry
}

function DiamondMaterial() {
  return (
    <meshPhysicalMaterial
      vertexColors
      flatShading
      roughness={0.09}
      metalness={0.02}
      clearcoat={1}
      clearcoatRoughness={0.055}
      reflectivity={1}
      ior={1.72}
      depthTest
      depthWrite
    />
  )
}

function DiamondSparkle({ spec }: { spec: SparkleSpec }) {
  const tint = spec.tint ?? DIAMOND_WHITE
  return (
    <group name={`diamond-precision-glint-${spec.id}`} position={spec.position} rotation={spec.rotation} scale={spec.scale}>
      <mesh scale={[0.015, 0.125, 0.01]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={tint} depthTest depthWrite />
      </mesh>
      <mesh scale={[0.105, 0.015, 0.01]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={DIAMOND_WHITE} depthTest depthWrite />
      </mesh>
      <mesh rotation-z={Math.PI / 4} scale={[0.011, 0.062, 0.009]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={DIAMOND_CYAN} depthTest depthWrite />
      </mesh>
      <mesh scale={[0.023, 0.023, 0.017]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={DIAMOND_WHITE} depthTest depthWrite />
      </mesh>
    </group>
  )
}

export function DiamondShell({ fitted = false }: DiamondShellProps) {
  const geometry = useMemo(() => createDiamondShellGeometry(), [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group name="diamond-shell-precision-brilliant-body">
      <OutlineMesh
        name="diamond-shell-brilliant-cut-hull"
        outlineWidth={fitted ? 0.044 : 0.054}
        outlineColor={DIAMOND_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<DiamondMaterial />}
      />
      <group name="diamond-shell-controlled-sparkle-field">
        {DIAMOND_SPARKLES.map((spec) => (
          <DiamondSparkle key={spec.id} spec={spec} />
        ))}
      </group>
    </group>
  )
}

export function DiamondShellOpeningLip() {
  const geometry = useMemo(() => createDiamondOpeningGeometry(), [])
  const sealGeometry = useMemo(() => {
    const seal = createShellOpeningSealGeometry({
      segments: 32,
      rings: 5,
      centerX: 0.026,
      centerY: -0.036,
      frontXRadius: 0.48,
      frontYRadius: 0.357,
      backXRadius: 0.54,
      backYRadius: 0.418,
      frontZ: -0.64,
      backZ: -0.5,
      sideDepth: 0.01,
    })
    applyDiamondFacetColors(seal)
    return seal
  }, [])

  useEffect(() => () => {
    geometry.dispose()
    sealGeometry.dispose()
  }, [geometry, sealGeometry])

  return (
    <group name="diamond-shell-faceted-aperture">
      <mesh name="diamond-shell-continuous-aperture-seal">
        <primitive object={sealGeometry} attach="geometry" />
        <DiamondMaterial />
      </mesh>
      <OutlineMesh
        name="diamond-shell-precision-opening-lip"
        outlineWidth={0.012}
        outlineColor={DIAMOND_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<DiamondMaterial />}
      />
      <mesh position={[0.016, -0.329, -0.748]} rotation-z={0.02} scale={[0.35, 0.018, 0.009]}>
        <sphereGeometry args={[1, 12, 4]} />
        <meshBasicMaterial color={DIAMOND_DEEP} depthTest depthWrite />
      </mesh>
      <DiamondSparkle
        spec={{ id: 'opening-crown', position: [-0.22, 0.286, -0.758], rotation: [0, 0, -0.06], scale: 0.58 }}
      />
    </group>
  )
}
