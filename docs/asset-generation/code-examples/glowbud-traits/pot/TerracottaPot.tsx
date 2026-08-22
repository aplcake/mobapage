import type { Ref, ReactElement } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const INK = '#241318'
const CLAY_DEEP = '#74252a'
const CLAY_SHADOW = '#96312f'
const CLAY_BODY = '#bd4035'
const CLAY_LIGHT = '#df6650'
const CLAY_DUST = '#b85d52'
const SOIL_DEEP = '#2b1b18'
const SOIL_MID = '#4a2d20'
const SOIL_LIGHT = '#68412b'

let terracottaToonRamp: THREE.DataTexture | null = null

function getTerracottaToonRamp() {
  if (terracottaToonRamp) return terracottaToonRamp

  const colors = new Uint8Array([
    104, 54, 58, 255,
    199, 101, 80, 255,
    245, 160, 123, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  terracottaToonRamp = texture
  return texture
}

function toon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getTerracottaToonRamp()} />
}

function TerracottaOutlinedMesh({
  geometry,
  material,
  position,
  rotation,
  scale,
  outlineWidth = 0.012,
}: {
  geometry: ReactElement
  material: ReactElement
  position: [number, number, number]
  rotation?: [number, number, number]
  scale: [number, number, number]
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

const clayMarks: Array<{
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
}> = [
  {
    position: [-0.18, 0.052, -0.342],
    rotation: [0.04, -0.08, -0.24],
    scale: [0.095, 0.024, 0.022],
    color: CLAY_LIGHT,
  },
  {
    position: [0.122, -0.086, -0.336],
    rotation: [-0.02, 0.06, 0.18],
    scale: [0.126, 0.027, 0.021],
    color: CLAY_DUST,
  },
  {
    position: [-0.018, -0.214, -0.292],
    rotation: [0.02, 0.02, -0.08],
    scale: [0.075, 0.018, 0.016],
    color: CLAY_SHADOW,
  },
  {
    position: [0.286, 0.034, -0.216],
    rotation: [-0.03, 0.62, 0.3],
    scale: [0.06, 0.018, 0.016],
    color: CLAY_LIGHT,
  },
]

const soilMounds: Array<{
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
}> = [
  {
    position: [-0.138, 0.216, -0.074],
    rotation: [0, 0.36, -0.08],
    scale: [0.15, 0.03, 0.092],
    color: SOIL_MID,
  },
  {
    position: [0.142, 0.215, -0.066],
    rotation: [0, -0.28, 0.06],
    scale: [0.145, 0.028, 0.088],
    color: SOIL_LIGHT,
  },
  {
    position: [-0.116, 0.214, 0.09],
    rotation: [0, -0.18, 0.03],
    scale: [0.13, 0.027, 0.078],
    color: SOIL_LIGHT,
  },
  {
    position: [0.12, 0.214, 0.086],
    rotation: [0, 0.24, -0.04],
    scale: [0.136, 0.029, 0.082],
    color: SOIL_MID,
  },
  {
    position: [0.004, 0.221, 0.002],
    rotation: [0, 0.12, 0.02],
    scale: [0.178, 0.034, 0.12],
    color: SOIL_DEEP,
  },
]

export function TerracottaPotShell({ groupRef }: { groupRef: Ref<THREE.Group> }) {
  return (
    <group ref={groupRef} rotation-z={-0.055}>
      <TerracottaOutlinedMesh
        position={[0, -0.112, 0]}
        scale={[0.405, 0.54, 0.345]}
        outlineWidth={0.016}
        geometry={<cylinderGeometry args={[1, 0.7, 1, 14, 2]} />}
        material={toon(CLAY_BODY)}
      />
      <TerracottaOutlinedMesh
        position={[0, -0.36, 0.004]}
        scale={[0.3, 0.07, 0.25]}
        outlineWidth={0.009}
        geometry={<cylinderGeometry args={[1, 0.9, 1, 14]} />}
        material={toon(CLAY_DEEP)}
      />
      <TerracottaOutlinedMesh
        position={[0, 0.112, 0]}
        scale={[0.438, 0.12, 0.37]}
        outlineWidth={0.011}
        geometry={<cylinderGeometry args={[1, 0.9, 1, 16]} />}
        material={toon(CLAY_SHADOW)}
      />
      <TerracottaOutlinedMesh
        position={[0, 0.174, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1, 0.84, 1]}
        outlineWidth={0.01}
        geometry={<torusGeometry args={[0.385, 0.057, 6, 18]} />}
        material={toon(CLAY_LIGHT)}
      />
      <mesh position={[0, 0.176, 0]} scale={[0.375, 0.074, 0.31]}>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshBasicMaterial color={CLAY_DEEP} />
      </mesh>
      <TerracottaOutlinedMesh
        position={[0, 0.195, 0]}
        scale={[0.365, 0.055, 0.3]}
        outlineWidth={0.004}
        geometry={<cylinderGeometry args={[1, 1, 1, 18]} />}
        material={toon(SOIL_DEEP)}
      />
      <mesh position={[0, 0.207, 0]} scale={[0.355, 0.04, 0.29]}>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshBasicMaterial color={SOIL_DEEP} />
      </mesh>
      {soilMounds.map((mound, index) => (
        <mesh
          key={`terracotta-soil-mound-${index}`}
          position={mound.position}
          rotation={mound.rotation}
          scale={mound.scale}
        >
          <sphereGeometry args={[1, 9, 5]} />
          <meshToonMaterial color={mound.color} gradientMap={getTerracottaToonRamp()} />
        </mesh>
      ))}
      {clayMarks.map((mark, index) => (
        <mesh
          key={`terracotta-clay-mark-${index}`}
          position={mark.position}
          rotation={mark.rotation}
          scale={mark.scale}
        >
          <sphereGeometry args={[1, 8, 4]} />
          <meshToonMaterial color={mark.color} gradientMap={getTerracottaToonRamp()} />
        </mesh>
      ))}
      <mesh position={[-0.126, 0.145, -0.358]} rotation-z={-0.2} scale={[0.118, 0.018, 0.014]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color="#f7a184" />
      </mesh>
      <mesh position={[0.008, -0.394, 0.018]} rotation-z={-0.06} scale={[0.268, 0.032, 0.086]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={INK} transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  )
}
