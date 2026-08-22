import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'
import { ApeBodyTreatment, type ApeSkinAnimation } from '../skin/ApeSkin'

export type NakedBodyFinish = 'classic' | 'gold' | 'zombie' | 'ape' | 'alien'

export type NakedBodyPalette = {
  base: string
  shade: string
  light: string
  dot: string
  finish: NakedBodyFinish
}

type NakedBodyProps = {
  palette: NakedBodyPalette
  activity?: number
  animation?: ApeSkinAnimation
}

const NAKED_BODY_INK = '#211522'
const NAKED_BODY_RADIUS = 0.64
const NAKED_BODY_CENTER: [number, number, number] = [0, 0.045, -0.055]

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1)
}

function smoothstep01(value: number) {
  const clamped = clamp01(value)
  return clamped * clamped * (3 - 2 * clamped)
}

function bodyNoise(x: number, y: number, z: number) {
  return (
    Math.sin(x * 8.1 + y * 5.3 - z * 4.7) * 0.55
    + Math.cos(x * 14.7 - y * 9.1 + z * 7.3) * 0.3
    + Math.sin((x - y + z) * 23.0) * 0.15
  )
}

function paintNakedBody(geometry: THREE.BufferGeometry, palette: NakedBodyPalette) {
  const position = geometry.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const base = new THREE.Color(palette.base)
  const shade = new THREE.Color(palette.shade)
  const light = new THREE.Color(palette.light)
  const dot = new THREE.Color(palette.dot)
  const color = new THREE.Color()

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const front = smoothstep01((-z - 0.04) / 0.58)
    const underside = smoothstep01((-y - 0.18) / 0.34)
    const side = smoothstep01((Math.abs(x) - 0.38) / 0.34)
    const upperLeftGlow = Math.exp(-((x + 0.22) ** 2) / 0.16 - ((y - 0.2) ** 2) / 0.22) * front
    const organic = bodyNoise(x, y, z)

    color.copy(base)
    color.lerp(light, upperLeftGlow * 0.34 + Math.max(0, organic) * 0.025)
    color.lerp(shade, underside * 0.28 + side * 0.08 + Math.max(0, -organic) * 0.018)

    if (palette.finish === 'gold') {
      const satinBand = Math.exp(-((x + 0.08) ** 2) / 0.22 - ((y - 0.13) ** 2) / 0.09) * front
      color.lerp(light, satinBand * 0.24)
    } else if (palette.finish === 'zombie') {
      const mottling = 0.5 + 0.5 * Math.sin(x * 13.0 + y * 8.0 - z * 11.0 + organic)
      color.lerp(dot, smoothstep01((mottling - 0.58) / 0.42) * 0.17)
      color.lerp(shade, underside * 0.12)
    } else if (palette.finish === 'ape') {
      const dorsal = smoothstep01((z + 0.05) / 0.56)
      const warmBelly = Math.exp(-(x * x) / 0.28 - ((y + 0.06) ** 2) / 0.32) * front
      color.lerp(shade, dorsal * 0.24)
      color.lerp(light, warmBelly * 0.11)
    } else if (palette.finish === 'alien') {
      const pearlBand = 0.5 + 0.5 * Math.sin(y * 8.0 - x * 3.2 + z * 4.4)
      color.lerp(light, pearlBand * front * 0.12)
      color.lerp(dot, Math.max(0, organic) * 0.04)
    }

    const offset = index * 3
    colors[offset] = color.r
    colors[offset + 1] = color.g
    colors[offset + 2] = color.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function createNakedBodyGeometry(palette: NakedBodyPalette) {
  const geometry = new THREE.SphereGeometry(NAKED_BODY_RADIUS, 40, 28)
  geometry.translate(...NAKED_BODY_CENTER)
  geometry.computeVertexNormals()
  paintNakedBody(geometry, palette)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export function NakedBody({ palette, activity = 1, animation = 'idle' }: NakedBodyProps) {
  const bodyGeometry = useMemo(
    () => createNakedBodyGeometry(palette),
    [palette],
  )

  useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry])

  return (
    <group
      name="naked-glowbud-soft-grounded-body"
      userData={{
        trait: 'Naked',
        construction: 'perfect-spherical-shell-free-body-with-full-type-surface-treatment',
      }}
    >
      <OutlineMesh
        name="naked-glowbud-perfect-round-body-mesh"
        outlineWidth={0.046}
        outlineColor={NAKED_BODY_INK}
        geometry={<primitive object={bodyGeometry} attach="geometry" />}
        material={(
          <meshToonMaterial
            color="#ffffff"
            vertexColors
            side={THREE.DoubleSide}
          />
        )}
      />
      {palette.finish === 'ape' ? (
        <ApeBodyTreatment
          surfaceGeometry={bodyGeometry}
          center={NAKED_BODY_CENTER}
          radius={NAKED_BODY_RADIUS}
          activity={activity}
          animation={animation}
        />
      ) : null}
    </group>
  )
}
