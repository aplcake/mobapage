import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'
import { createShellOpeningSealGeometry } from './ShellOpeningSeal'

export const GEMSTONE_INK = '#210b32'
export const GEMSTONE_DEEP = '#491177'
export const GEMSTONE_SHADOW = '#651d99'
export const GEMSTONE_BODY = '#8731cc'
export const GEMSTONE_MAGENTA = '#bd4ce1'
export const GEMSTONE_LAVENDER = '#d8a0f2'
export const GEMSTONE_BLUSH = '#f2c8ff'
export const GEMSTONE_GLINT = '#fff4ff'

type GemstoneShellProps = {
  fitted?: boolean
}

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1)
}

function smoothstep01(value: number) {
  const clamped = clamp01(value)
  return clamped * clamped * (3 - 2 * clamped)
}

function deterministicFacet(index: number, x: number, y: number, z: number) {
  const value = Math.sin(index * 12.9898 + x * 57.21 + y * 91.73 + z * 43.11) * 43758.5453
  return value - Math.floor(value)
}

function broadHighlight(x: number, y: number, centerX: number, centerY: number, radiusX: number, radiusY: number) {
  const dx = (x - centerX) / radiusX
  const dy = (y - centerY) / radiusY
  return Math.exp(-(dx * dx + dy * dy) * 1.7)
}

function createGemstoneShellGeometry() {
  const segments = 24
  const rings = 14
  const openingTheta = 0.56
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
      const superellipse = 1 / Math.pow(
        Math.pow(Math.abs(cosPhi), 3.15) + Math.pow(Math.abs(sinPhi), 3.15),
        1 / 3.15,
      )
      const cushion = 1 + (superellipse - 1) * 0.28
      const broadFacetCut = 1
        + Math.cos(phi * 4) * 0.008
        + Math.sin(phi * 3 + ring * 1.25) * 0.007
      const sideShoulder = Math.abs(cosPhi) > 0.54 ? 1 + (Math.abs(cosPhi) - 0.54) * 0.018 : 1
      const crownLift = sinPhi > 0.2 ? 1 + (sinPhi - 0.2) * 0.018 : 1

      let x = cosPhi * radial * 0.815 * cushion * broadFacetCut * sideShoulder
      let y = -0.035 + sinPhi * radial * 0.7 * cushion * broadFacetCut * crownLift
      const nextZ = -0.07 + z * 0.655 * (1 + Math.cos(phi * 2 - t * 3.0) * 0.006)

      const topTable = smoothstep01((y - 0.5) / 0.17)
      const baseTable = smoothstep01((-y - 0.49) / 0.18)
      y = THREE.MathUtils.lerp(y, 0.675 + Math.cos(phi * 4) * 0.005, topTable * 0.28)
      y = THREE.MathUtils.lerp(y, -0.665 + Math.sin(phi * 3) * 0.006, baseTable * 0.3)
      x *= 1 + baseTable * 0.022

      vertices.push(x, y, nextZ)
    }
  }

  const row = segments + 1
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const base = ring * row + segment
      if ((ring + Math.floor(segment / 2)) % 2 === 0) {
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
  applyGemstoneFacetColors(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function applyGemstoneFacetColors(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position as THREE.BufferAttribute
  const normal = geometry.attributes.normal as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deep = new THREE.Color(GEMSTONE_DEEP)
  const shadow = new THREE.Color(GEMSTONE_SHADOW)
  const body = new THREE.Color(GEMSTONE_BODY)
  const magenta = new THREE.Color(GEMSTONE_MAGENTA)
  const lavender = new THREE.Color(GEMSTONE_LAVENDER)
  const blush = new THREE.Color(GEMSTONE_BLUSH)
  const glint = new THREE.Color(GEMSTONE_GLINT)
  const color = new THREE.Color()

  for (let index = 0; index < position.count; index += 3) {
    const x = (position.getX(index) + position.getX(index + 1) + position.getX(index + 2)) / 3
    const y = (position.getY(index) + position.getY(index + 1) + position.getY(index + 2)) / 3
    const z = (position.getZ(index) + position.getZ(index + 1) + position.getZ(index + 2)) / 3
    const nx = (normal.getX(index) + normal.getX(index + 1) + normal.getX(index + 2)) / 3
    const ny = (normal.getY(index) + normal.getY(index + 1) + normal.getY(index + 2)) / 3
    const nz = (normal.getZ(index) + normal.getZ(index + 1) + normal.getZ(index + 2)) / 3
    const front = smoothstep01((-z + 0.02) / 0.62)
    const rear = smoothstep01((z - 0.06) / 0.54)
    const facet = deterministicFacet(index / 3, x, y, z)
    const crownRibbon = broadHighlight(x, y, -0.24, 0.3, 0.42, 0.3) * front
    const rightFlash = broadHighlight(x, y, 0.39, 0.12, 0.3, 0.34) * front
    const rearFlash = broadHighlight(x, y, -0.24, 0.25, 0.46, 0.34) * rear
    const frontPinFlash = Math.max(
      broadHighlight(x, y, -0.24, 0.38, 0.13, 0.12),
      broadHighlight(x, y, 0.36, 0.02, 0.11, 0.1),
    ) * front
    const rearPinFlash = broadHighlight(x, y, -0.12, 0.26, 0.13, 0.12) * rear

    color.copy(body)
    color.lerp(lavender, crownRibbon * 0.64)
    color.lerp(magenta, rightFlash * 0.38)
    color.lerp(lavender, rearFlash * 0.38)
    if (ny > 0.46) color.lerp(blush, 0.28)
    if (ny < -0.44) color.lerp(deep, 0.3)
    if (nx > 0.5) color.lerp(magenta, 0.18)
    if (nx < -0.56) color.lerp(shadow, 0.22)
    if (nz > 0.48) color.lerp(shadow, 0.13)
    if (facet < 0.13) color.lerp(deep, 0.2)
    if (facet > 0.9) color.lerp(blush, 0.26)
    color.lerp(glint, smoothstep01((Math.max(frontPinFlash, rearPinFlash) - 0.4) / 0.5) * 0.78)

    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = (index + vertex) * 3
      colors[offset] = color.r
      colors[offset + 1] = color.g
      colors[offset + 2] = color.b
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function createGemstoneOpeningGeometry() {
  const segments = 40
  const tubeSegments = 8
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const lower = Math.max(0, -sinAngle)
    const side = Math.max(0, Math.abs(cosAngle) - 0.28)
    const cushion = 1 - Math.cos(angle * 4) * 0.018
    const centerX = 0.442 + side * 0.018
    const centerY = 0.323 + lower * 0.014
    const centerZ = -0.708 + side * 0.025 - lower * 0.008
    const radialRadius = (0.057 + side * 0.008 + lower * 0.006) * cushion
    const depthRadius = 0.047 + side * 0.009

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      vertices.push(
        0.026 + cosAngle * (centerX + tubeRadial * radialRadius) * cushion,
        -0.036 + sinAngle * (centerY + tubeRadial * radialRadius) * cushion - lower * 0.02,
        centerZ + tubeDepth * depthRadius + Math.max(0, tubeRadial) * (0.055 + side * 0.018),
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
  applyGemstoneFacetColors(geometry)
  return geometry
}

function GemstoneCoreMaterial() {
  return (
    <meshPhysicalMaterial
      color="#ffffff"
      vertexColors
      flatShading
      roughness={0.16}
      metalness={0.015}
      clearcoat={1}
      clearcoatRoughness={0.06}
      reflectivity={1}
      ior={1.62}
      emissive={GEMSTONE_DEEP}
      emissiveIntensity={0.045}
      depthTest
      depthWrite
    />
  )
}

function GemstoneGlazeMaterial() {
  return (
    <meshPhysicalMaterial
      color="#f7ddff"
      vertexColors
      flatShading
      roughness={0.055}
      metalness={0}
      clearcoat={1}
      clearcoatRoughness={0.022}
      reflectivity={1}
      ior={1.7}
      transparent
      opacity={0.64}
      transmission={0.22}
      thickness={0.88}
      attenuationColor={GEMSTONE_BODY}
      attenuationDistance={0.9}
      depthTest
      depthWrite={false}
    />
  )
}

export function GemstoneShell({ fitted = false }: GemstoneShellProps) {
  const geometry = useMemo(() => createGemstoneShellGeometry(), [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group name="gemstone-shell-display-grade-cushion-body">
      <mesh
        name="gemstone-shell-opaque-depth-core"
        position={[0, -0.005, 0.025]}
        scale={[0.955, 0.948, 0.955]}
      >
        <primitive object={geometry} attach="geometry" />
        <GemstoneCoreMaterial />
      </mesh>
      <OutlineMesh
        name="gemstone-shell-polished-cushion-hull"
        outlineWidth={fitted ? 0.046 : 0.056}
        outlineColor={GEMSTONE_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<GemstoneGlazeMaterial />}
      />
    </group>
  )
}

export function GemstoneShellOpeningLip() {
  const openingGeometry = useMemo(() => createGemstoneOpeningGeometry(), [])
  const sealGeometry = useMemo(() => {
    const seal = createShellOpeningSealGeometry({
      segments: 40,
      rings: 6,
      centerX: 0.026,
      centerY: -0.036,
      frontXRadius: 0.486,
      frontYRadius: 0.36,
      backXRadius: 0.555,
      backYRadius: 0.432,
      frontZ: -0.646,
      backZ: -0.47,
      sideDepth: 0.012,
    })
    applyGemstoneFacetColors(seal)
    return seal
  }, [])

  useEffect(() => () => {
    openingGeometry.dispose()
    sealGeometry.dispose()
  }, [openingGeometry, sealGeometry])

  return (
    <group name="gemstone-shell-polished-aperture">
      <mesh name="gemstone-shell-continuous-aperture-seal">
        <primitive object={sealGeometry} attach="geometry" />
        <GemstoneCoreMaterial />
      </mesh>
      <OutlineMesh
        name="gemstone-shell-cushion-cut-opening-bezel"
        outlineWidth={0.014}
        outlineColor={GEMSTONE_INK}
        geometry={<primitive object={openingGeometry} attach="geometry" />}
        material={<GemstoneCoreMaterial />}
      />
    </group>
  )
}
