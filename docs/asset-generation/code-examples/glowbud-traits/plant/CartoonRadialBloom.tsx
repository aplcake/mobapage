import { useMemo, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const DEFAULT_INK = '#211827'

let neutralBloomRamp: THREE.DataTexture | null = null

export type CartoonRadialBloomPalette = {
  petalDeep: string
  petalMid: string
  petalLight: string
  centerDeep: string
  centerMid: string
  centerLight: string
  outline?: string
}

export type CartoonRadialBloomProps = {
  petalCount?: number
  petalLength?: number
  petalWidth?: number
  petalThickness?: number
  petalCurl?: number
  bloomDepth?: number
  palette: CartoonRadialBloomPalette
  centerStyle?: 'clustered' | 'button'
  seed?: number
}

type CartoonPetalGeometryOptions = {
  length: number
  width: number
  thickness: number
  curl: number
  depth: number
  deep: string
  mid: string
  light: string
  variation?: number
}

function createNeutralBloomRamp() {
  const texture = new THREE.DataTexture(
    new Uint8Array([
      86, 86, 94, 255,
      184, 184, 194, 255,
      255, 255, 255, 255,
    ]),
    3,
    1,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  )
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function getNeutralBloomRamp() {
  if (!neutralBloomRamp) neutralBloomRamp = createNeutralBloomRamp()
  return neutralBloomRamp
}

function seededUnit(seed: number, index: number, salt: number) {
  const value = Math.sin((seed + 1) * 91.713 + index * 37.719 + salt * 17.131) * 43758.5453
  return value - Math.floor(value)
}

export function createCartoonRadialPetalGeometry({
  length,
  width,
  thickness,
  curl,
  depth,
  deep,
  mid,
  light,
  variation = 0,
}: CartoonPetalGeometryOptions) {
  const lengthSegments = 11
  const widthSegments = 6
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deepColor = new THREE.Color(deep)
  const midColor = new THREE.Color(mid)
  const lightColor = new THREE.Color(light)
  const verticesPerLayer = (lengthSegments + 1) * (widthSegments + 1)
  const vertexIndex = (layer: number, step: number, across: number) =>
    layer * verticesPerLayer + step * (widthSegments + 1) + across

  for (let layer = 0; layer < 2; layer += 1) {
    const layerSign = layer === 0 ? 1 : -1
    for (let step = 0; step <= lengthSegments; step += 1) {
      const t = step / lengthSegments
      const body = THREE.MathUtils.smoothstep(t, 0.02, 0.38)
      const tip = THREE.MathUtils.smoothstep(t, 0.68, 1)
      const widthProfile = 0.15 + Math.sin((0.03 + t * 0.78) * Math.PI) * 0.9
      const halfWidth = width * widthProfile * (1 + variation * 0.035)
      const centerY = length * (t + Math.sin(t * Math.PI) * 0.025)
      const centerZ =
        curl * (Math.sin(t * Math.PI) * 0.68 + t * 0.24 - tip * 0.34)
        + variation * 0.004 * Math.sin(t * Math.PI)
      const halfThickness =
        thickness
        * (0.5 + body * 0.5)
        * THREE.MathUtils.lerp(1, 0.72, tip)

      for (let across = 0; across <= widthSegments; across += 1) {
        const u = (across / widthSegments) * 2 - 1
        const edge = Math.abs(u)
        const crossPuff =
          depth
          * (1 - u * u)
          * (0.22 + Math.sin(t * Math.PI) * 0.78)
        const softLip =
          Math.cos((u + 1) * Math.PI * 1.08 + variation)
          * length
          * 0.012
          * tip
        const x = u * halfWidth
        const y = centerY + softLip
        const z =
          centerZ
          + crossPuff
          + layerSign * halfThickness * (0.34 + (1 - edge) * 0.18)
        positions.push(x, y, z)

        const color = midColor
          .clone()
          .lerp(deepColor, (1 - body) * 0.24 + edge * 0.18)
          .lerp(lightColor, tip * (1 - edge) * 0.32 + (1 - edge) * 0.08)
        colors.push(color.r, color.g, color.b)
      }
    }
  }

  for (let step = 0; step < lengthSegments; step += 1) {
    for (let across = 0; across < widthSegments; across += 1) {
      const a = vertexIndex(0, step, across)
      const b = vertexIndex(0, step, across + 1)
      const c = vertexIndex(0, step + 1, across + 1)
      const d = vertexIndex(0, step + 1, across)
      indices.push(a, b, d, b, c, d)

      const backA = vertexIndex(1, step, across)
      const backB = vertexIndex(1, step, across + 1)
      const backC = vertexIndex(1, step + 1, across + 1)
      const backD = vertexIndex(1, step + 1, across)
      indices.push(backA, backD, backB, backB, backD, backC)
    }
  }

  for (let step = 0; step < lengthSegments; step += 1) {
    for (const across of [0, widthSegments]) {
      const frontA = vertexIndex(0, step, across)
      const frontB = vertexIndex(0, step + 1, across)
      const backA = vertexIndex(1, step, across)
      const backB = vertexIndex(1, step + 1, across)
      if (across === 0) {
        indices.push(frontA, backA, frontB, frontB, backA, backB)
      } else {
        indices.push(frontA, frontB, backA, frontB, backB, backA)
      }
    }
  }

  for (const step of [0, lengthSegments]) {
    for (let across = 0; across < widthSegments; across += 1) {
      const frontA = vertexIndex(0, step, across)
      const frontB = vertexIndex(0, step, across + 1)
      const backA = vertexIndex(1, step, across)
      const backB = vertexIndex(1, step, across + 1)
      if (step === 0) {
        indices.push(frontA, frontB, backA, frontB, backB, backA)
      } else {
        indices.push(frontA, backA, frontB, frontB, backA, backB)
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function BloomOutlinedMesh({
  geometry,
  material,
  position = [0, 0, 0],
  rotation,
  scale = [1, 1, 1],
  outlineWidth = 0.005,
  outlineColor = DEFAULT_INK,
}: {
  geometry: ReactElement
  material: ReactElement
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  outlineWidth?: number
  outlineColor?: string
}) {
  return (
    <OutlineMesh
      position={position}
      rotation={rotation}
      scale={scale}
      outlineWidth={outlineWidth}
      outlineColor={outlineColor}
      geometry={geometry}
      material={material}
    />
  )
}

export function CartoonRadialBloom({
  petalCount = 5,
  petalLength = 0.22,
  petalWidth = 0.13,
  petalThickness = 0.036,
  petalCurl = 0.05,
  bloomDepth = 0.04,
  palette,
  centerStyle = 'clustered',
  seed = 0,
}: CartoonRadialBloomProps) {
  const petals = useMemo(
    () =>
      Array.from({ length: petalCount }, (_, index) => {
        const angleJitter = (seededUnit(seed, index, 1) - 0.5) * 0.11
        const sizeJitter = (seededUnit(seed, index, 2) - 0.5) * 0.1
        const depthJitter = (seededUnit(seed, index, 3) - 0.5) * 0.024
        const angle = (index / petalCount) * Math.PI * 2 + angleJitter
        return {
          angle,
          depthJitter,
          size: 1 + sizeJitter,
          geometry: createCartoonRadialPetalGeometry({
            length: petalLength * (1 + sizeJitter * 0.55),
            width: petalWidth * (1 - sizeJitter * 0.28),
            thickness: petalThickness,
            curl: petalCurl * (0.92 + seededUnit(seed, index, 4) * 0.18),
            depth: bloomDepth,
            deep: palette.petalDeep,
            mid: palette.petalMid,
            light: palette.petalLight,
            variation: seededUnit(seed, index, 5) * 2 - 1,
          }),
        }
      }),
    [
      bloomDepth,
      palette.petalDeep,
      palette.petalLight,
      palette.petalMid,
      petalCount,
      petalCurl,
      petalLength,
      petalThickness,
      petalWidth,
      seed,
    ],
  )
  const centerSeeds = useMemo(
    () =>
      Array.from({ length: 13 }, (_, index) => {
        const radial = Math.sqrt((index + 0.5) / 13) * 0.078
        const angle = index * Math.PI * (3 - Math.sqrt(5)) + seed * 0.13
        return {
          position: [
            Math.cos(angle) * radial,
            Math.sin(angle) * radial,
            0.113 + (1 - radial / 0.078) * 0.018,
          ] as [number, number, number],
          scale: 0.011 + seededUnit(seed, index, 8) * 0.007,
          color: index % 4 === 0 ? palette.centerLight : palette.centerDeep,
        }
      }),
    [palette.centerDeep, palette.centerLight, seed],
  )
  const outline = palette.outline ?? DEFAULT_INK

  return (
    <group>
      {petals.map((petal, index) => (
        <BloomOutlinedMesh
          key={`radial-petal-${index}`}
          position={[
            Math.cos(petal.angle) * 0.018,
            Math.sin(petal.angle) * 0.018,
            -0.014 + petal.depthJitter,
          ]}
          rotation={[
            Math.sin(petal.angle) * 0.075 + petal.depthJitter * 1.4,
            -Math.cos(petal.angle) * 0.075,
            petal.angle - Math.PI / 2,
          ]}
          scale={[petal.size, petal.size, petal.size]}
          outlineWidth={0.006}
          outlineColor={outline}
          geometry={<primitive object={petal.geometry} attach="geometry" />}
          material={
            <meshToonMaterial
              vertexColors
              gradientMap={getNeutralBloomRamp()}
            />
          }
        />
      ))}
      <BloomOutlinedMesh
        position={[0, 0, 0.066]}
        scale={[0.108, 0.108, 0.065]}
        outlineWidth={0.006}
        outlineColor={outline}
        geometry={<sphereGeometry args={[1, 14, 8]} />}
        material={
          <meshToonMaterial
            color={palette.centerMid}
            gradientMap={getNeutralBloomRamp()}
          />
        }
      />
      {centerStyle === 'clustered'
        ? centerSeeds.map((centerSeed, index) => (
            <mesh
              key={`radial-center-seed-${index}`}
              position={centerSeed.position}
              scale={centerSeed.scale}
            >
              <sphereGeometry args={[1, 7, 5]} />
              <meshBasicMaterial color={centerSeed.color} />
            </mesh>
          ))
        : null}
      <mesh position={[-0.032, 0.038, 0.137]} scale={[0.022, 0.012, 0.008]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={palette.centerLight} />
      </mesh>
    </group>
  )
}
