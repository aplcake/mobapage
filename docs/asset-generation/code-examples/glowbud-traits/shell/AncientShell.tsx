import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'
import { createShellOpeningSealGeometry } from './ShellOpeningSeal'

export const ANCIENT_INK = '#191810'
export const ANCIENT_STONE_DEEP = '#302d20'
export const ANCIENT_STONE_SHADOW = '#4b432d'
export const ANCIENT_STONE_BASE = '#6b5d3d'
export const ANCIENT_STONE_MID = '#88764c'
export const ANCIENT_STONE_LIGHT = '#b09b68'
export const ANCIENT_ROOT_DEEP = '#30261b'
export const ANCIENT_ROOT_BASE = '#59432a'
export const ANCIENT_ROOT_LIGHT = '#82633b'
export const ANCIENT_MOSS_DEEP = '#263a22'
export const ANCIENT_MOSS_BASE = '#3c572b'
export const ANCIENT_MOSS_MID = '#587038'
export const ANCIENT_MOSS_LIGHT = '#778b48'
export const ANCIENT_LICHEN = '#9b9c69'

type AncientAnimation = 'idle' | 'hop' | 'grumble'

type AncientShellProps = {
  fitted?: boolean
  hasHeadAccessory?: boolean
  activity?: number
  animation?: AncientAnimation
}

type RootSpec = {
  id: string
  points: [number, number, number][]
  baseRadius: number
  tipRadius: number
  color: string
  outlineWidth: number
}

type StoneSpec = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
  bareOnly?: boolean
}

type MossSpec = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
  bareOnly?: boolean
}

const ANCIENT_ROOT_SPECS: RootSpec[] = [
  {
    id: 'left-portal-root',
    points: [
      [-0.5, -0.53, -0.25],
      [-0.68, -0.31, -0.36],
      [-0.68, -0.02, -0.42],
      [-0.58, 0.26, -0.39],
      [-0.45, 0.5, -0.25],
    ],
    baseRadius: 0.072,
    tipRadius: 0.028,
    color: ANCIENT_ROOT_LIGHT,
    outlineWidth: 0.0045,
  },
  {
    id: 'right-portal-root',
    points: [
      [0.53, -0.5, -0.21],
      [0.69, -0.27, -0.32],
      [0.7, 0.03, -0.37],
      [0.61, 0.28, -0.34],
      [0.51, 0.45, -0.21],
    ],
    baseRadius: 0.066,
    tipRadius: 0.026,
    color: ANCIENT_ROOT_BASE,
    outlineWidth: 0.0045,
  },
  {
    id: 'rear-binding-root',
    points: [
      [-0.27, -0.54, 0.45],
      [-0.46, -0.31, 0.58],
      [-0.43, -0.03, 0.63],
      [-0.25, 0.29, 0.59],
      [0.01, 0.5, 0.44],
    ],
    baseRadius: 0.063,
    tipRadius: 0.022,
    color: ANCIENT_ROOT_LIGHT,
    outlineWidth: 0.004,
  },
  {
    id: 'left-root-fork',
    points: [
      [-0.68, -0.01, -0.41],
      [-0.73, 0.11, -0.29],
      [-0.69, 0.25, -0.15],
      [-0.6, 0.35, -0.05],
    ],
    baseRadius: 0.047,
    tipRadius: 0.014,
    color: ANCIENT_ROOT_BASE,
    outlineWidth: 0.0035,
  },
  {
    id: 'right-root-fork',
    points: [
      [0.69, 0.04, -0.36],
      [0.73, 0.16, -0.24],
      [0.68, 0.29, -0.1],
      [0.58, 0.38, 0.0],
    ],
    baseRadius: 0.043,
    tipRadius: 0.013,
    color: ANCIENT_ROOT_LIGHT,
    outlineWidth: 0.003,
  },
  {
    id: 'left-ground-buttress',
    points: [
      [-0.43, -0.46, 0.08],
      [-0.57, -0.57, 0.19],
      [-0.72, -0.625, 0.35],
    ],
    baseRadius: 0.13,
    tipRadius: 0.042,
    color: ANCIENT_ROOT_DEEP,
    outlineWidth: 0.008,
  },
  {
    id: 'right-ground-buttress',
    points: [
      [0.4, -0.49, 0.16],
      [0.56, -0.57, 0.29],
      [0.7, -0.625, 0.45],
    ],
    baseRadius: 0.12,
    tipRadius: 0.04,
    color: ANCIENT_ROOT_BASE,
    outlineWidth: 0.0075,
  },
]

const ANCIENT_VINE_SPECS: RootSpec[] = [
  {
    id: 'left-moss-vine',
    points: [
      [-0.31, 0.57, -0.4],
      [-0.43, 0.43, -0.53],
      [-0.52, 0.26, -0.57],
      [-0.57, 0.09, -0.52],
    ],
    baseRadius: 0.035,
    tipRadius: 0.012,
    color: ANCIENT_MOSS_DEEP,
    outlineWidth: 0.0035,
  },
  {
    id: 'right-moss-vine',
    points: [
      [0.39, 0.5, -0.4],
      [0.52, 0.37, -0.51],
      [0.57, 0.2, -0.55],
      [0.55, 0.07, -0.51],
    ],
    baseRadius: 0.029,
    tipRadius: 0.01,
    color: ANCIENT_MOSS_BASE,
    outlineWidth: 0.003,
  },
]

const ANCIENT_PORTAL_CRACK_SPECS: RootSpec[] = [
  {
    id: 'left-upper-fracture',
    points: [
      [-0.36, 0.405, -0.632],
      [-0.42, 0.35, -0.64],
      [-0.39, 0.29, -0.646],
      [-0.44, 0.235, -0.64],
    ],
    baseRadius: 0.012,
    tipRadius: 0.005,
    color: ANCIENT_STONE_DEEP,
    outlineWidth: 0,
  },
  {
    id: 'right-lower-fracture',
    points: [
      [0.43, -0.055, -0.638],
      [0.385, -0.12, -0.645],
      [0.42, -0.18, -0.641],
      [0.38, -0.24, -0.632],
    ],
    baseRadius: 0.013,
    tipRadius: 0.005,
    color: ANCIENT_STONE_DEEP,
    outlineWidth: 0,
  },
]

const ANCIENT_CROWN_STONES: StoneSpec[] = [
  {
    id: 'left-crown-slab',
    position: [-0.47, 0.49, 0.02],
    rotation: [0.14, -0.28, -0.16],
    scale: [0.29, 0.18, 0.25],
    color: ANCIENT_STONE_BASE,
  },
  {
    id: 'right-crown-slab',
    position: [0.43, 0.48, 0.06],
    rotation: [-0.12, 0.35, 0.13],
    scale: [0.27, 0.17, 0.24],
    color: ANCIENT_STONE_MID,
  },
  {
    id: 'portal-keystone',
    position: [0.01, 0.435, -0.59],
    rotation: [0.08, 0.03, 0.035],
    scale: [0.17, 0.115, 0.12],
    color: ANCIENT_STONE_LIGHT,
  },
  {
    id: 'rear-crown-keystone',
    position: [-0.03, 0.58, 0.36],
    rotation: [0.16, 0.12, -0.04],
    scale: [0.32, 0.16, 0.25],
    color: ANCIENT_STONE_SHADOW,
    bareOnly: true,
  },
  {
    id: 'left-shoulder-block',
    position: [-0.7, 0.11, 0.05],
    rotation: [-0.08, 0.2, 0.19],
    scale: [0.16, 0.24, 0.22],
    color: ANCIENT_STONE_SHADOW,
  },
  {
    id: 'right-shoulder-block',
    position: [0.7, 0.04, 0.14],
    rotation: [0.12, -0.34, -0.17],
    scale: [0.16, 0.21, 0.21],
    color: ANCIENT_STONE_BASE,
  },
]

const ANCIENT_MOSS_SPECS: MossSpec[] = [
  { id: 'crown-left-a', position: [-0.49, 0.59, -0.08], rotation: [0.02, -0.2, -0.12], scale: [0.24, 0.09, 0.17], color: ANCIENT_MOSS_BASE },
  { id: 'crown-left-b', position: [-0.29, 0.63, -0.03], rotation: [0.08, 0.12, 0.04], scale: [0.18, 0.08, 0.14], color: ANCIENT_MOSS_MID },
  { id: 'crown-right-a', position: [0.34, 0.6, 0.02], rotation: [-0.08, 0.2, 0.08], scale: [0.22, 0.085, 0.16], color: ANCIENT_MOSS_BASE },
  { id: 'crown-right-b', position: [0.53, 0.51, -0.06], rotation: [0.06, -0.22, -0.12], scale: [0.16, 0.07, 0.13], color: ANCIENT_MOSS_LIGHT },
  { id: 'rear-top-a', position: [-0.04, 0.67, 0.31], rotation: [0.16, 0.1, -0.03], scale: [0.24, 0.085, 0.17], color: ANCIENT_MOSS_DEEP, bareOnly: true },
  { id: 'rear-top-b', position: [0.19, 0.62, 0.39], rotation: [0.23, -0.16, 0.06], scale: [0.17, 0.07, 0.13], color: ANCIENT_MOSS_BASE, bareOnly: true },
  { id: 'left-brow-a', position: [-0.49, 0.405, -0.61], rotation: [0.24, 0.25, -0.15], scale: [0.145, 0.052, 0.105], color: ANCIENT_MOSS_MID },
  { id: 'left-brow-b', position: [-0.35, 0.47, -0.595], rotation: [0.2, -0.12, 0.08], scale: [0.11, 0.045, 0.085], color: ANCIENT_MOSS_LIGHT },
  { id: 'right-brow', position: [0.46, 0.42, -0.6], rotation: [0.18, 0.28, 0.12], scale: [0.13, 0.05, 0.095], color: ANCIENT_MOSS_BASE },
  { id: 'left-side-a', position: [-0.73, 0.16, -0.22], rotation: [0.12, 0.1, -0.32], scale: [0.14, 0.06, 0.11], color: ANCIENT_MOSS_DEEP },
  { id: 'left-side-b', position: [-0.74, -0.02, -0.1], rotation: [-0.08, -0.16, -0.2], scale: [0.12, 0.052, 0.1], color: ANCIENT_MOSS_MID },
  { id: 'right-side-a', position: [0.72, 0.18, 0.02], rotation: [-0.1, 0.16, 0.28], scale: [0.15, 0.058, 0.11], color: ANCIENT_MOSS_BASE },
  { id: 'rear-left', position: [-0.53, 0.28, 0.51], rotation: [0.24, -0.12, -0.18], scale: [0.18, 0.065, 0.13], color: ANCIENT_MOSS_DEEP },
  { id: 'rear-right', position: [0.44, 0.31, 0.54], rotation: [0.25, 0.18, 0.12], scale: [0.19, 0.07, 0.14], color: ANCIENT_MOSS_MID },
  { id: 'lower-left-root', position: [-0.58, -0.42, -0.21], rotation: [-0.12, 0.24, -0.24], scale: [0.13, 0.052, 0.1], color: ANCIENT_MOSS_DEEP },
]

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1)
}

function smoothstep01(value: number) {
  const clamped = clamp01(value)
  return clamped * clamped * (3 - 2 * clamped)
}

function angularDistance(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
}

function triangleNoise(index: number, x: number, y: number, z: number) {
  const value = Math.sin(index * 12.9898 + x * 67.19 + y * 47.71 + z * 83.17) * 43758.5453
  return value - Math.floor(value)
}

function ancientCrackSignal(angle: number, y: number) {
  const crackAPath = -2.15 + y * 0.34 + Math.sin(y * 8.4) * 0.07
  const crackBPath = -0.12 - y * 0.28 + Math.sin(y * 10.2 + 1.2) * 0.055
  const crackCPath = 1.72 + y * 0.22 + Math.sin(y * 7.1 + 0.4) * 0.08
  const crackA = (1 - smoothstep01(angularDistance(angle, crackAPath) / 0.037)) * smoothstep01((y + 0.55) / 0.45)
  const crackB = (1 - smoothstep01(angularDistance(angle, crackBPath) / 0.033)) * smoothstep01((0.52 - y) / 0.35)
  const crackC = (1 - smoothstep01(angularDistance(angle, crackCPath) / 0.04)) * smoothstep01((y + 0.42) / 0.42)
  return Math.max(crackA, crackB, crackC)
}

function applyAncientSurfaceColors(geometry: THREE.BufferGeometry, portal = false) {
  const position = geometry.attributes.position as THREE.BufferAttribute
  const normal = geometry.attributes.normal as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deep = new THREE.Color(ANCIENT_STONE_DEEP)
  const shadow = new THREE.Color(ANCIENT_STONE_SHADOW)
  const base = new THREE.Color(ANCIENT_STONE_BASE)
  const mid = new THREE.Color(ANCIENT_STONE_MID)
  const light = new THREE.Color(ANCIENT_STONE_LIGHT)
  const moss = new THREE.Color(ANCIENT_MOSS_BASE)
  const lichen = new THREE.Color(ANCIENT_LICHEN)
  const color = new THREE.Color()

  for (let index = 0; index < position.count; index += 3) {
    const x = (position.getX(index) + position.getX(index + 1) + position.getX(index + 2)) / 3
    const y = (position.getY(index) + position.getY(index + 1) + position.getY(index + 2)) / 3
    const z = (position.getZ(index) + position.getZ(index + 1) + position.getZ(index + 2)) / 3
    const normalY = (normal.getY(index) + normal.getY(index + 1) + normal.getY(index + 2)) / 3
    const noise = triangleNoise(index / 3, x, y, z)
    const angle = Math.atan2(z, x)
    const crack = ancientCrackSignal(angle, y)
    const dampShelf = smoothstep01((normalY + 0.05) / 0.78) * smoothstep01((y + 0.08) / 0.62)
    const mossField = Math.sin(x * 15.7 + z * 10.1) * Math.sin(y * 18.3 - z * 7.7)

    color.copy(portal ? mid : base)
    if (normalY > 0.42) color.lerp(light, portal ? 0.2 : 0.32)
    if (normalY < -0.28) color.lerp(deep, 0.3)
    if (noise < 0.14) color.lerp(shadow, portal ? 0.18 : 0.26)
    if (noise > 0.8) color.lerp(mid, 0.24)
    if (crack > 0.08) color.lerp(deep, crack * 0.66)
    if (portal) {
      const blockPhase = ((angle + Math.PI) / (Math.PI * 2) * 13) % 1
      const blockJoint = Math.min(blockPhase, 1 - blockPhase)
      if (blockJoint < 0.075) color.lerp(deep, 0.62)
      else if (Math.floor((angle + Math.PI) / (Math.PI * 2) * 13) % 2 === 0) color.lerp(light, 0.12)
    }
    if (!portal && mossField > 0.46 && dampShelf > 0.24) color.lerp(moss, dampShelf * 0.38)
    if (!portal && mossField < -0.76 && noise > 0.55) color.lerp(lichen, 0.24)

    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = (index + vertex) * 3
      colors[offset] = color.r
      colors[offset + 1] = color.g
      colors[offset + 2] = color.b
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function createAncientShellGeometry() {
  const indexed = new THREE.SphereGeometry(1, 44, 30)
  const position = indexed.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const angle = Math.atan2(z, x)
    const crown = smoothstep01((y - 0.16) / 0.78)
    const lower = smoothstep01((-y - 0.2) / 0.72)
    const shoulder = Math.exp(-((y - 0.04) ** 2) / 0.22)
    const potSaddle = Math.exp(-(x ** 2) / 0.13 - ((z + 0.02) ** 2) / 0.15) * crown
    const broadErosion = Math.sin(angle * 4.0 + y * 2.8) * 0.025
      + Math.cos(angle * 7.0 - y * 4.1) * 0.014
      + Math.sin((x - z) * 11.0 + y * 4.4) * 0.007
    const oldDentA = Math.exp(-((x + 0.48) ** 2) / 0.07 - ((y - 0.18) ** 2) / 0.12 - ((z - 0.22) ** 2) / 0.22)
    const oldDentB = Math.exp(-((x - 0.38) ** 2) / 0.08 - ((y + 0.32) ** 2) / 0.08 - ((z + 0.1) ** 2) / 0.22)
    const crack = ancientCrackSignal(angle, y)
    const radial = 1 + broadErosion + shoulder * 0.028 + lower * 0.045 - crown * 0.02 - crack * 0.032 - oldDentA * 0.045 - oldDentB * 0.035

    let nextX = x * 0.81 * radial * (1 + lower * 0.025)
    let nextY = -0.03 + y * 0.75 * radial - potSaddle * 0.047
    let nextZ = -0.045 + z * 0.67 * radial * (1 + (z > 0 ? 0.045 : 0.016))

    nextX += Math.sin(y * 5.9 + z * 3.1) * 0.006
    nextZ += Math.cos(y * 5.2 - x * 3.8) * 0.006

    if (nextY < -0.51) {
      const settle = smoothstep01((-nextY - 0.51) / 0.18)
      nextY = THREE.MathUtils.lerp(nextY, -0.605 + Math.sin(angle * 5.0 + 0.3) * 0.007, settle * 0.88)
      nextX *= 1 + settle * 0.035
      nextZ *= 1 + settle * 0.025
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
    const aperture = Math.pow(Math.abs((centerX - 0.012) / 0.485), 3.35)
      + Math.pow(Math.abs((centerY + 0.04) / 0.36), 3.35)

    if (centerZ < -0.49 && aperture < 1.04) continue

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
  applyAncientSurfaceColors(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function superellipsePoint(angle: number, xRadius: number, yRadius: number) {
  const cosAngle = Math.cos(angle)
  const sinAngle = Math.sin(angle)
  return new THREE.Vector2(
    Math.sign(cosAngle || 1) * Math.pow(Math.abs(cosAngle), 0.6) * xRadius,
    Math.sign(sinAngle || 1) * Math.pow(Math.abs(sinAngle), 0.66) * yRadius,
  )
}

function createAncientPortalGeometry() {
  const segments = 48
  const tubeSegments = 8
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const upper = Math.max(0, Math.sin(angle))
    const lower = Math.max(0, -Math.sin(angle))
    const side = Math.abs(Math.cos(angle))
    const blockIndex = Math.floor((segment / segments) * 13)
    const blockWear = 1 + Math.sin(blockIndex * 7.17) * 0.028 + Math.cos(blockIndex * 3.91) * 0.013
    const point = superellipsePoint(angle, 0.49 + side * 0.008, 0.36 + upper * 0.018 + lower * 0.008)

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      const radialRadius = (0.069 + upper * 0.018 + lower * 0.057 + side * 0.008) * blockWear
      const bodyMelt = Math.max(0, tubeRadial) * (0.09 + upper * 0.035 + side * 0.025)
      const ageChip = Math.sin(angle * 9 + tubeAngle * 2.0) * 0.004

      vertices.push(
        0.012 + point.x + Math.cos(angle) * tubeRadial * radialRadius + ageChip,
        -0.04 + point.y + Math.sin(angle) * tubeRadial * radialRadius - lower * 0.012,
        -0.716 + tubeDepth * (0.05 + side * 0.008) + bodyMelt,
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
  applyAncientSurfaceColors(geometry, true)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createAncientPortalTunnelGeometry() {
  const segments = 48
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const upper = Math.max(0, Math.sin(angle))
    const lower = Math.max(0, -Math.sin(angle))
    const frontPoint = superellipsePoint(angle, 0.447, 0.318 + upper * 0.008)
    const backPoint = superellipsePoint(angle, 0.426, 0.292 - lower * 0.065)

    vertices.push(
      0.012 + frontPoint.x,
      -0.04 + frontPoint.y,
      -0.711,
      0.012 + backPoint.x,
      -0.04 + backPoint.y,
      -0.47,
    )
  }

  for (let segment = 0; segment < segments; segment += 1) {
    const front = segment * 2
    const back = front + 1
    const nextFront = front + 2
    const nextBack = front + 3
    indices.push(front, nextFront, back)
    indices.push(nextFront, nextBack, back)
  }

  const indexed = new THREE.BufferGeometry()
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  indexed.setIndex(indices)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.computeVertexNormals()
  applyAncientSurfaceColors(geometry, true)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createSweptRootGeometry(spec: RootSpec) {
  const curve = new THREE.CatmullRomCurve3(
    spec.points.map((point) => new THREE.Vector3(...point)),
    false,
    'centripetal',
    0.45,
  )
  const ringCount = Math.max(18, spec.points.length * 7)
  const sides = 9
  const vertices: number[] = []
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
    const reference = Math.abs(tangent.dot(worldForward)) > 0.9 ? worldUp : worldForward
    normalA.crossVectors(tangent, reference).normalize()
    normalB.crossVectors(normalA, tangent).normalize()
    if (ring > 0 && normalA.dot(previousNormalA) < 0) {
      normalA.negate()
      normalB.negate()
    }
    previousNormalA.copy(normalA)

    const radius = THREE.MathUtils.lerp(spec.baseRadius, spec.tipRadius, smoothstep01(t))
      * (1 + Math.sin(t * 15 + spec.id.length) * 0.035)
    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2
      const radial = Math.cos(angle) * radius
      const depth = Math.sin(angle) * radius * 0.78
      const vertex = center.clone().addScaledVector(normalA, radial).addScaledVector(normalB, depth)
      vertices.push(vertex.x, vertex.y, vertex.z)
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

  const start = curve.getPointAt(0)
  const end = curve.getPointAt(1)
  const startIndex = vertices.length / 3
  vertices.push(start.x, start.y, start.z)
  const endIndex = vertices.length / 3
  vertices.push(end.x, end.y, end.z)
  for (let side = 0; side < sides; side += 1) {
    const nextSide = (side + 1) % sides
    indices.push(startIndex, nextSide, side)
    const lastRing = ringCount * sides
    indices.push(lastRing + side, lastRing + nextSide, endIndex)
  }

  const indexed = new THREE.BufferGeometry()
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  indexed.setIndex(indices)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

const ANCIENT_VERTEX_SHADER = /* glsl */ `
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

const ANCIENT_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uDeepColor;
  uniform vec3 uMossColor;
  uniform vec3 uLichenColor;

  varying vec3 vSurfaceColor;
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  float angleDistance(float a, float b) {
    return abs(atan(sin(a - b), cos(a - b)));
  }

  void main() {
    vec3 lightDirection = normalize(vec3(-0.45, 0.8, 0.42));
    float lightAmount = dot(normalize(vViewNormal), lightDirection) * 0.5 + 0.5;
    float lightBand = mix(0.68, 0.86, step(0.3, lightAmount));
    lightBand = mix(lightBand, 1.05, step(0.7, lightAmount));

    float angle = atan(vLocalPosition.z, vLocalPosition.x);
    float crackPathA = -2.15 + vLocalPosition.y * 0.34 + sin(vLocalPosition.y * 8.4) * 0.07;
    float crackPathB = -0.12 - vLocalPosition.y * 0.28 + sin(vLocalPosition.y * 10.2 + 1.2) * 0.055;
    float crackPathC = 1.72 + vLocalPosition.y * 0.22 + sin(vLocalPosition.y * 7.1 + 0.4) * 0.08;
    float crackA = (1.0 - smoothstep(0.012, 0.037, angleDistance(angle, crackPathA))) * smoothstep(-0.55, -0.1, vLocalPosition.y);
    float crackB = (1.0 - smoothstep(0.011, 0.033, angleDistance(angle, crackPathB))) * (1.0 - smoothstep(0.17, 0.52, vLocalPosition.y));
    float crackC = (1.0 - smoothstep(0.014, 0.04, angleDistance(angle, crackPathC))) * smoothstep(-0.42, 0.0, vLocalPosition.y);
    float crack = max(crackA, max(crackB, crackC));

    float stoneGrain = sin(dot(vLocalPosition, vec3(51.0, 43.0, 61.0)))
      * sin(dot(vLocalPosition, vec3(29.0, 67.0, 37.0)));
    float pore = smoothstep(0.72, 0.94, stoneGrain) * 0.11;
    float ageBand = sin((vLocalPosition.y + vLocalPosition.z * 0.14) * 24.0 + sin(vLocalPosition.x * 8.0) * 0.7);
    float bandWear = smoothstep(0.76, 0.94, ageBand) * 0.08;
    float lichenField = sin(vLocalPosition.x * 16.0 + vLocalPosition.z * 9.0)
      * sin(vLocalPosition.y * 19.0 - vLocalPosition.z * 7.0);
    float upperShelf = smoothstep(-0.02, 0.54, vLocalPosition.y) * smoothstep(-0.08, 0.58, vViewNormal.y);
    float mossPatch = smoothstep(0.48, 0.78, lichenField) * upperShelf;
    float paleLichen = smoothstep(0.74, 0.94, -lichenField * stoneGrain) * 0.34;

    vec3 surfaceColor = vSurfaceColor * lightBand;
    surfaceColor = mix(surfaceColor, uDeepColor, crack * 0.7 + pore);
    surfaceColor = mix(surfaceColor, uMossColor * lightBand, mossPatch * 0.38);
    surfaceColor = mix(surfaceColor, uLichenColor * lightBand, paleLichen);
    surfaceColor = mix(surfaceColor, uDeepColor, bandWear);

    gl_FragColor = vec4(surfaceColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function AncientSurfaceMaterial() {
  const uniforms = useMemo(
    () => ({
      uDeepColor: { value: new THREE.Color(ANCIENT_STONE_DEEP) },
      uMossColor: { value: new THREE.Color(ANCIENT_MOSS_BASE) },
      uLichenColor: { value: new THREE.Color(ANCIENT_LICHEN) },
    }),
    [],
  )

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={ANCIENT_VERTEX_SHADER}
      fragmentShader={ANCIENT_FRAGMENT_SHADER}
      side={THREE.FrontSide}
      depthTest
      depthWrite
      dithering
    />
  )
}

function AncientRoot({ spec }: { spec: RootSpec }) {
  const geometry = useMemo(() => createSweptRootGeometry(spec), [spec])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <OutlineMesh
      name={`ancient-shell-root-${spec.id}`}
      outlineWidth={spec.outlineWidth}
      outlineColor={ANCIENT_INK}
      geometry={<primitive object={geometry} attach="geometry" />}
      material={<meshToonMaterial color={spec.color} />}
    />
  )
}

function AncientStone({ spec }: { spec: StoneSpec }) {
  return (
    <OutlineMesh
      name={`ancient-shell-temple-stone-${spec.id}`}
      position={spec.position}
      rotation={spec.rotation}
      scale={spec.scale}
      outlineWidth={0.008}
      outlineColor={ANCIENT_INK}
      geometry={<dodecahedronGeometry args={[1, 0]} />}
      material={<meshToonMaterial color={spec.color} />}
    />
  )
}

function AncientCarvedCrack({ spec }: { spec: RootSpec }) {
  const geometry = useMemo(() => createSweptRootGeometry(spec), [spec])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh name={`ancient-shell-carved-crack-${spec.id}`}>
      <primitive object={geometry} attach="geometry" />
      <meshToonMaterial color={spec.color} depthTest depthWrite />
    </mesh>
  )
}

function AncientMossClump({ spec }: { spec: MossSpec }) {
  return (
    <group
      name={`ancient-shell-moss-clump-${spec.id}`}
      position={spec.position}
      rotation={spec.rotation}
      scale={[spec.scale[0], spec.scale[1] * 1.55, spec.scale[2]]}
    >
      <OutlineMesh
        name={`ancient-shell-moss-clump-${spec.id}-heart`}
        scale={[0.86, 0.88, 0.9]}
        outlineWidth={0.004}
        outlineColor={ANCIENT_MOSS_DEEP}
        geometry={<icosahedronGeometry args={[1, 1]} />}
        material={<meshToonMaterial color={spec.color} />}
      />
      <OutlineMesh
        name={`ancient-shell-moss-clump-${spec.id}-left-lobe`}
        position={[-0.43, 0.035, 0.04]}
        scale={[0.62, 0.7, 0.68]}
        outlineWidth={0.0035}
        outlineColor={ANCIENT_MOSS_DEEP}
        geometry={<icosahedronGeometry args={[1, 1]} />}
        material={<meshToonMaterial color={spec.color} />}
      />
      <OutlineMesh
        name={`ancient-shell-moss-clump-${spec.id}-right-lobe`}
        position={[0.4, 0.045, -0.025]}
        scale={[0.58, 0.66, 0.64]}
        outlineWidth={0.0035}
        outlineColor={ANCIENT_MOSS_DEEP}
        geometry={<icosahedronGeometry args={[1, 1]} />}
        material={<meshToonMaterial color={spec.color} />}
      />
    </group>
  )
}

export function AncientShell({
  fitted = false,
  hasHeadAccessory = false,
  activity = 1,
  animation = 'idle',
}: AncientShellProps) {
  const bodyGeometry = useMemo(() => createAncientShellGeometry(), [])
  const moss = useRef<THREE.Group>(null)

  useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry])

  useFrame(({ clock }) => {
    if (!moss.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const hopSettle = animation === 'hop' ? Math.sin(t * 5.8) * 0.008 : 0
    const grumble = animation === 'grumble' ? Math.sin(t * 10.4) * 0.004 : 0
    moss.current.rotation.z = Math.sin(t * 0.72 + 0.4) * 0.004 * motion + hopSettle * motion + grumble * motion
    moss.current.position.y = Math.sin(t * 0.9) * 0.003 * motion
  })

  return (
    <group name="ancient-shell-root-bound-temple-ruin">
      <OutlineMesh
        name="ancient-shell-weathered-petrified-body"
        outlineWidth={fitted ? 0.044 : 0.054}
        outlineColor={ANCIENT_INK}
        geometry={<primitive object={bodyGeometry} attach="geometry" />}
        material={<AncientSurfaceMaterial />}
      />
      <group name="ancient-shell-deep-root-buttresses">
        {ANCIENT_ROOT_SPECS.map((spec) => <AncientRoot key={spec.id} spec={spec} />)}
      </group>
      <group name="ancient-shell-weathered-temple-crown">
        {ANCIENT_CROWN_STONES.filter((spec) => !spec.bareOnly || !hasHeadAccessory).map((spec) => (
          <AncientStone key={spec.id} spec={spec} />
        ))}
      </group>
      <group ref={moss} name="ancient-shell-damp-ledge-moss-colonies">
        {ANCIENT_MOSS_SPECS.filter((spec) => !spec.bareOnly || !hasHeadAccessory).map((spec) => (
          <AncientMossClump key={spec.id} spec={spec} />
        ))}
        {ANCIENT_VINE_SPECS.map((spec) => <AncientRoot key={spec.id} spec={spec} />)}
      </group>
    </group>
  )
}

export function AncientShellOpeningPortal() {
  const geometry = useMemo(() => createAncientPortalGeometry(), [])
  const tunnelGeometry = useMemo(() => createAncientPortalTunnelGeometry(), [])
  const sealGeometry = useMemo(() => {
    const seal = createShellOpeningSealGeometry({
      segments: 48,
      rings: 6,
      centerX: 0.012,
      centerY: -0.04,
      frontXRadius: 0.548,
      frontYRadius: 0.42,
      backXRadius: 0.578,
      backYRadius: 0.45,
      frontZ: -0.617,
      backZ: -0.425,
      xCurve: 0.6,
      yCurve: 0.66,
      lowerDrop: 0.012,
      upperLift: 0.007,
      sideDepth: 0.014,
      surfaceRipple: 0.009,
      ripplePhase: 0.7,
    })
    applyAncientSurfaceColors(seal, true)
    return seal
  }, [])

  useEffect(
    () => () => {
      geometry.dispose()
      tunnelGeometry.dispose()
      sealGeometry.dispose()
    },
    [geometry, sealGeometry, tunnelGeometry],
  )

  return (
    <group name="ancient-shell-true-carved-face-portal">
      <mesh name="ancient-shell-continuous-aperture-seal">
        <primitive object={sealGeometry} attach="geometry" />
        <AncientSurfaceMaterial />
      </mesh>
      <OutlineMesh
        name="ancient-shell-eroded-block-arch"
        outlineWidth={0.016}
        outlineColor={ANCIENT_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<AncientSurfaceMaterial />}
      />
      <mesh name="ancient-shell-carved-portal-tunnel">
        <primitive object={tunnelGeometry} attach="geometry" />
        <AncientSurfaceMaterial />
      </mesh>
      <OutlineMesh
        name="ancient-shell-buried-stone-threshold"
        position={[0.012, -0.335, -0.535]}
        rotation={[0.02, 0, 0.012]}
        scale={[0.39, 0.072, 0.17]}
        outlineWidth={0.006}
        outlineColor={ANCIENT_INK}
        geometry={<dodecahedronGeometry args={[1, 0]} />}
        material={<meshToonMaterial color={ANCIENT_STONE_SHADOW} />}
      />
      <group name="ancient-shell-carved-fracture-inlays">
        {ANCIENT_PORTAL_CRACK_SPECS.map((spec) => <AncientCarvedCrack key={spec.id} spec={spec} />)}
      </group>
    </group>
  )
}
