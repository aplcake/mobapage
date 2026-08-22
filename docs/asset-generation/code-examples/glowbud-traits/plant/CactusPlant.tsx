import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const INK = '#182016'
const CACTUS_DEEP = '#355d25'
const CACTUS_SHADOW = '#4f7b2f'
const CACTUS_MID = '#6da934'
const CACTUS_LIGHT = '#91c84d'
const CACTUS_GLOW = '#acd965'
const AREOLE_CREAM = '#d7d0a0'
const AREOLE_LIGHT = '#eee4b5'
const BUD_DEEP = '#7d241f'
const BUD_RED = '#b6322f'
const BUD_LIGHT = '#d85142'
const SOIL_DEEP = '#2b1b18'
const SOIL_MID = '#4a2d20'
const SOIL_LIGHT = '#68412b'
const MAIN_PALETTE: [string, string, string] = [CACTUS_DEEP, CACTUS_SHADOW, CACTUS_MID]
const RIGHT_PALETTE: [string, string, string] = [CACTUS_SHADOW, CACTUS_MID, CACTUS_LIGHT]

let cactusToonRamp: THREE.DataTexture | null = null

function getCactusToonRamp() {
  if (cactusToonRamp) return cactusToonRamp

  const colors = new Uint8Array([
    44, 69, 34, 255,
    105, 160, 55, 255,
    177, 217, 103, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  cactusToonRamp = texture
  return texture
}

function toon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getCactusToonRamp()} />
}

function CactusOutlinedMesh({
  geometry,
  material,
  position = [0, 0, 0],
  rotation,
  scale = [1, 1, 1],
  outlineWidth = 0.008,
}: {
  geometry: ReactElement
  material: ReactElement
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  outlineWidth?: number
}) {
  return (
    <OutlineMesh
      position={position}
      rotation={rotation}
      scale={scale}
      outlineWidth={outlineWidth}
      outlineColor={INK}
      geometry={geometry}
      material={material}
    />
  )
}

function createPaintedCactusTube(
  points: Array<[number, number, number]>,
  radius: number,
  palette: [string, string, string],
) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    'centripetal',
  )
  const geometry = new THREE.TubeGeometry(curve, Math.max(16, points.length * 7), radius, 10, false)
  const uv = geometry.attributes.uv as THREE.BufferAttribute
  const colors = new Float32Array(geometry.attributes.position.count * 3)
  const dark = new THREE.Color(palette[0])
  const mid = new THREE.Color(palette[1])
  const light = new THREE.Color(palette[2])

  // Hard axial and radial paint bands preserve the source palette without adding loose surface pieces.
  for (let index = 0; index < geometry.attributes.position.count; index += 1) {
    const axial = uv.getX(index)
    const radial = uv.getY(index)
    let color = mid

    if (axial < 0.18 || radial < 0.08 || radial > 0.92) color = dark
    if (radial > 0.22 && radial < 0.39) color = light
    if (axial > 0.66 && radial > 0.48 && radial < 0.78) color = light

    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function PaintedCactusLimb({
  points,
  radius,
  palette,
  outlineWidth,
}: {
  points: Array<[number, number, number]>
  radius: number
  palette: [string, string, string]
  outlineWidth: number
}) {
  const geometry = useMemo(
    () => createPaintedCactusTube(points, radius, palette),
    [points, radius, palette],
  )
  const end = points[points.length - 1]

  return (
    <>
      <OutlineMesh
        outlineWidth={outlineWidth}
        outlineColor={INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<meshToonMaterial vertexColors gradientMap={getCactusToonRamp()} />}
      />
      <CactusOutlinedMesh
        position={end}
        scale={[radius * 1.03, radius * 1.08, radius]}
        outlineWidth={outlineWidth * 0.68}
        geometry={<sphereGeometry args={[1, 10, 6]} />}
        material={toon(palette[1])}
      />
    </>
  )
}

function EmbeddedAreole({
  position,
  rotation = [0, 0, 0],
  scale = [0.026, 0.031, 0.014],
  color = AREOLE_CREAM,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  color?: string
}) {
  return (
    <CactusOutlinedMesh
      position={position}
      rotation={rotation}
      scale={scale}
      outlineWidth={0.0025}
      geometry={<sphereGeometry args={[1, 8, 5]} />}
      material={toon(color)}
    />
  )
}

function CreamTipTuft({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <CactusOutlinedMesh
        position={[0, 0.008, 0]}
        scale={[0.048, 0.052, 0.043]}
        outlineWidth={0.004}
        geometry={<sphereGeometry args={[1, 9, 6]} />}
        material={toon(AREOLE_CREAM)}
      />
      <mesh position={[-0.012, 0.024, -0.035]} scale={[0.017, 0.021, 0.009]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color={AREOLE_LIGHT} />
      </mesh>
    </group>
  )
}

function RedBloomBud({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <CactusOutlinedMesh
        position={[0, -0.004, 0]}
        scale={[0.044, 0.044, 0.04]}
        outlineWidth={0.004}
        geometry={<sphereGeometry args={[1, 9, 6]} />}
        material={toon(BUD_DEEP)}
      />
      {[
        { position: [-0.018, 0.018, 0], scale: [0.026, 0.032, 0.026] },
        { position: [0.018, 0.02, 0.002], scale: [0.026, 0.034, 0.026] },
        { position: [0, 0.035, -0.004], scale: [0.028, 0.034, 0.028] },
      ].map((petal, index) => (
        <CactusOutlinedMesh
          key={`cactus-red-bud-petal-${index}`}
          position={petal.position as [number, number, number]}
          scale={petal.scale as [number, number, number]}
          outlineWidth={0.002}
          geometry={<sphereGeometry args={[1, 8, 5]} />}
          material={toon(index === 2 ? BUD_LIGHT : BUD_RED)}
        />
      ))}
    </group>
  )
}

function CactusSoilNest() {
  const mounds: Array<{
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
    color: string
  }> = [
    {
      position: [-0.08, 0.065, -0.02],
      rotation: [0, 0.22, -0.08],
      scale: [0.12, 0.025, 0.075],
      color: SOIL_MID,
    },
    {
      position: [0.085, 0.064, -0.018],
      rotation: [0, -0.26, 0.06],
      scale: [0.118, 0.024, 0.072],
      color: SOIL_LIGHT,
    },
    {
      position: [0.008, 0.062, 0.042],
      rotation: [0, 0.12, 0.02],
      scale: [0.13, 0.023, 0.068],
      color: SOIL_DEEP,
    },
  ]

  return (
    <group>
      {mounds.map((mound, index) => (
        <mesh
          key={`cactus-soil-mound-${index}`}
          position={mound.position}
          rotation={mound.rotation}
          scale={mound.scale}
        >
          <sphereGeometry args={[1, 9, 5]} />
          <meshToonMaterial color={mound.color} gradientMap={getCactusToonRamp()} />
        </mesh>
      ))}
    </group>
  )
}

const MAIN_POINTS: Array<[number, number, number]> = [
  [0, -0.045, 0],
  [0.006, 0.18, 0],
  [0.018, 0.4, 0.008],
  [-0.045, 0.585, 0.002],
  [-0.07, 0.83, 0.008],
]

const RIGHT_POINTS: Array<[number, number, number]> = [
  [0.005, 0.315, 0.002],
  [0.088, 0.34, 0.014],
  [0.17, 0.415, 0.026],
  [0.17, 0.61, 0.032],
]

const LEFT_POINTS: Array<[number, number, number]> = [
  [-0.004, 0.215, -0.004],
  [-0.092, 0.238, -0.014],
  [-0.155, 0.305, -0.022],
  [-0.16, 0.455, -0.018],
]

export function CactusPlant({ activity = 1 }: { activity?: number }) {
  const plant = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!plant.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const t = clock.elapsedTime
    const sway = Math.sin(t * 0.78 + 0.45) * 0.009 * motion
    const breathe = Math.sin(t * 1.22 + 0.3) * 0.0035 * motion

    plant.current.rotation.z = -0.012 + sway
    plant.current.rotation.x = Math.sin(t * 0.63 + 1.1) * 0.005 * motion
    plant.current.scale.set(1 + breathe, 1 - breathe * 0.35, 1 + breathe * 0.45)
  })

  return (
    <group ref={plant}>
      <CactusSoilNest />
      <CactusOutlinedMesh
        position={[0.004, 0.064, 0.002]}
        scale={[0.086, 0.12, 0.07]}
        outlineWidth={0.007}
        geometry={<sphereGeometry args={[1, 10, 6]} />}
        material={toon(CACTUS_DEEP)}
      />
      <PaintedCactusLimb
        points={MAIN_POINTS}
        radius={0.071}
        outlineWidth={0.011}
        palette={MAIN_PALETTE}
      />
      <PaintedCactusLimb
        points={RIGHT_POINTS}
        radius={0.061}
        outlineWidth={0.009}
        palette={RIGHT_PALETTE}
      />
      <PaintedCactusLimb
        points={LEFT_POINTS}
        radius={0.052}
        outlineWidth={0.008}
        palette={MAIN_PALETTE}
      />

      <mesh position={[0.092, 0.353, 0.016]} scale={[0.094, 0.082, 0.074]}>
        <sphereGeometry args={[1, 10, 6]} />
        <meshToonMaterial color={CACTUS_MID} gradientMap={getCactusToonRamp()} />
      </mesh>
      <mesh position={[-0.094, 0.247, -0.012]} scale={[0.084, 0.071, 0.066]}>
        <sphereGeometry args={[1, 10, 6]} />
        <meshToonMaterial color={CACTUS_SHADOW} gradientMap={getCactusToonRamp()} />
      </mesh>

      <CreamTipTuft position={[-0.07, 0.872, 0.008]} />
      <RedBloomBud position={[-0.16, 0.492, -0.018]} />

      <EmbeddedAreole
        position={[-0.07, 0.662, -0.061]}
        rotation={[-0.18, 0, -0.08]}
        scale={[0.029, 0.034, 0.014]}
        color={AREOLE_LIGHT}
      />
      <EmbeddedAreole
        position={[0.168, 0.485, -0.022]}
        rotation={[-0.18, 0, 0.08]}
        scale={[0.026, 0.031, 0.014]}
      />
      <EmbeddedAreole
        position={[0.225, 0.48, 0.03]}
        rotation={[0, Math.PI / 2, 0.04]}
        scale={[0.018, 0.031, 0.027]}
        color={AREOLE_LIGHT}
      />
      <EmbeddedAreole
        position={[-0.207, 0.323, -0.018]}
        rotation={[0, Math.PI / 2, -0.08]}
        scale={[0.017, 0.029, 0.026]}
      />
      <EmbeddedAreole
        position={[0.005, 0.275, -0.066]}
        rotation={[-0.12, 0, 0.05]}
        scale={[0.022, 0.027, 0.012]}
        color={AREOLE_LIGHT}
      />

      {[
        [-0.018, 0.15, -0.066],
        [0.014, 0.36, -0.068],
        [-0.052, 0.535, -0.065],
        [-0.102, 0.744, -0.055],
        [0.156, 0.565, -0.016],
        [-0.151, 0.39, -0.064],
      ].map((position, index) => (
        <mesh
          key={`cactus-painted-areole-${index}`}
          position={position as [number, number, number]}
          scale={[0.012, 0.016, 0.007]}
        >
          <sphereGeometry args={[1, 7, 4]} />
          <meshBasicMaterial color={index % 2 === 0 ? AREOLE_CREAM : CACTUS_GLOW} />
        </mesh>
      ))}
    </group>
  )
}
