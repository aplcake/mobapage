import { useMemo, type ReactElement, type Ref } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

const INK = '#271407'
const GOLD_DEEP = '#6b2f12'
const GOLD_DARK = '#9c5518'
const GOLD_MID = '#d99119'
const GOLD_RICH = '#f4b51f'
const GOLD_LIGHT = '#ffd93f'
const GOLD_GLINT = '#fff3a6'
const SOIL_DEEP = '#2b1b18'
const SOIL_MID = '#4a2d20'
const SOIL_LIGHT = '#68412b'

const JEWEL_RUBY = '#e83c56'
const JEWEL_SAPPHIRE = '#32a6df'
const JEWEL_EMERALD = '#7fd63e'
const JEWEL_AMETHYST = '#b45be7'

let crownToonRamp: THREE.DataTexture | null = null

function getCrownToonRamp() {
  if (crownToonRamp) return crownToonRamp

  const colors = new Uint8Array([
    105, 48, 18, 255,
    221, 145, 25, 255,
    255, 224, 91, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  crownToonRamp = texture
  return texture
}

function toon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getCrownToonRamp()} />
}

function CrownOutlinedMesh({
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

function createCrownPointGeometry() {
  const profile = new THREE.Shape()
  profile.moveTo(-0.5, 0)
  profile.lineTo(-0.48, 0.38)
  profile.quadraticCurveTo(-0.34, 0.56, -0.19, 0.69)
  profile.quadraticCurveTo(-0.08, 0.82, 0, 1)
  profile.quadraticCurveTo(0.08, 0.82, 0.19, 0.69)
  profile.quadraticCurveTo(0.34, 0.56, 0.48, 0.38)
  profile.lineTo(0.5, 0)
  profile.closePath()

  const geometry = new THREE.ExtrudeGeometry(profile, {
    depth: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.035,
    bevelThickness: 0.04,
    curveSegments: 5,
  })
  geometry.translate(0, 0, -0.5)
  geometry.computeVertexNormals()
  return geometry
}

type CrownPointSpec = {
  angle: number
  height: number
  width: number
  depth: number
  color: string
  finial: string
}

const crownPoints: CrownPointSpec[] = [
  { angle: 0, height: 0.29, width: 0.17, depth: 0.105, color: GOLD_LIGHT, finial: JEWEL_SAPPHIRE },
  { angle: Math.PI * 0.25, height: 0.25, width: 0.14, depth: 0.1, color: GOLD_RICH, finial: JEWEL_RUBY },
  { angle: Math.PI * 0.5, height: 0.33, width: 0.16, depth: 0.105, color: GOLD_MID, finial: JEWEL_EMERALD },
  { angle: Math.PI * 0.75, height: 0.28, width: 0.145, depth: 0.1, color: GOLD_RICH, finial: JEWEL_AMETHYST },
  { angle: Math.PI, height: 0.37, width: 0.17, depth: 0.11, color: GOLD_LIGHT, finial: JEWEL_SAPPHIRE },
  { angle: Math.PI * 1.25, height: 0.27, width: 0.145, depth: 0.1, color: GOLD_MID, finial: JEWEL_RUBY },
  { angle: Math.PI * 1.5, height: 0.34, width: 0.16, depth: 0.105, color: GOLD_RICH, finial: JEWEL_EMERALD },
  { angle: Math.PI * 1.75, height: 0.25, width: 0.14, depth: 0.1, color: GOLD_MID, finial: JEWEL_AMETHYST },
]

const bezelJewels: Array<{
  angle: number
  y: number
  radius: number
  color: string
  faceted?: boolean
}> = [
  { angle: 0, y: 0.032, radius: 0.066, color: JEWEL_SAPPHIRE, faceted: true },
  { angle: Math.PI * 0.28, y: 0.018, radius: 0.052, color: JEWEL_RUBY },
  { angle: Math.PI * 0.56, y: -0.012, radius: 0.044, color: JEWEL_EMERALD, faceted: true },
  { angle: Math.PI * 0.86, y: -0.022, radius: 0.04, color: JEWEL_AMETHYST },
  { angle: Math.PI * 1.14, y: -0.018, radius: 0.04, color: JEWEL_SAPPHIRE },
  { angle: Math.PI * 1.44, y: -0.008, radius: 0.044, color: JEWEL_RUBY, faceted: true },
  { angle: Math.PI * 1.72, y: 0.016, radius: 0.052, color: JEWEL_EMERALD },
]

const soilMounds: Array<{
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
}> = [
  { position: [-0.14, 0.218, -0.07], rotation: [0, 0.3, -0.06], scale: [0.15, 0.03, 0.085], color: SOIL_MID },
  { position: [0.14, 0.216, -0.065], rotation: [0, -0.25, 0.05], scale: [0.145, 0.029, 0.083], color: SOIL_LIGHT },
  { position: [-0.115, 0.216, 0.085], rotation: [0, -0.18, 0.03], scale: [0.132, 0.028, 0.076], color: SOIL_LIGHT },
  { position: [0.12, 0.216, 0.082], rotation: [0, 0.22, -0.04], scale: [0.136, 0.029, 0.078], color: SOIL_MID },
  { position: [0, 0.223, 0], rotation: [0, 0.1, 0.02], scale: [0.18, 0.035, 0.116], color: SOIL_DEEP },
]

function CrownPoint({ spec, geometry }: { spec: CrownPointSpec; geometry: THREE.BufferGeometry }) {
  const x = Math.sin(spec.angle) * 0.405
  const z = -Math.cos(spec.angle) * 0.34

  return (
    <group position={[x, 0.105, z]} rotation-y={-spec.angle}>
      <CrownOutlinedMesh
        position={[0, 0, 0]}
        scale={[spec.width, spec.height, spec.depth]}
        outlineWidth={0.008}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={toon(spec.color)}
      />
      <CrownOutlinedMesh
        position={[0, spec.height * 0.995, 0]}
        scale={[0.027, 0.027, 0.024]}
        outlineWidth={0.003}
        geometry={<sphereGeometry args={[1, 8, 5]} />}
        material={toon(spec.finial)}
      />
      <mesh
        position={[-spec.width * 0.16, spec.height * 0.54, -spec.depth * 0.55]}
        rotation-z={-0.24}
        scale={[spec.width * 0.1, spec.height * 0.22, 0.006]}
      >
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GOLD_GLINT} depthTest />
      </mesh>
    </group>
  )
}

function CrownBezelJewel({
  angle,
  y,
  radius,
  color,
  faceted = false,
}: {
  angle: number
  y: number
  radius: number
  color: string
  faceted?: boolean
}) {
  const x = Math.sin(angle) * 0.424
  const z = -Math.cos(angle) * 0.355

  return (
    <group position={[x, y, z]} rotation-y={-angle}>
      <CrownOutlinedMesh
        position={[0, 0, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[radius * 1.34, radius * 1.34, 0.025]}
        outlineWidth={0.004}
        geometry={<cylinderGeometry args={[1, 1, 1, 12]} />}
        material={toon(GOLD_DEEP)}
      />
      <CrownOutlinedMesh
        position={[0, 0, -0.028]}
        scale={[radius, radius * 1.05, 0.035]}
        outlineWidth={0.003}
        geometry={faceted ? <octahedronGeometry args={[1, 0]} /> : <sphereGeometry args={[1, 10, 6]} />}
        material={
          <meshPhysicalMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.08}
            roughness={0.12}
            clearcoat={1}
            clearcoatRoughness={0.08}
            metalness={0.02}
            transmission={0.06}
            thickness={0.12}
            opacity={1}
            transparent={false}
          />
        }
      />
      <mesh position={[-radius * 0.25, radius * 0.28, -0.066]} scale={[radius * 0.22, radius * 0.12, 0.006]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color="#ffffff" depthTest />
      </mesh>
    </group>
  )
}

function CrownSparkle({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh scale={[0.006, 0.052, 0.006]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color="#fffbea" depthTest />
      </mesh>
      <mesh scale={[0.036, 0.006, 0.006]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color="#fffbea" depthTest />
      </mesh>
    </group>
  )
}

export function GoldCrownPotShell({ groupRef }: { groupRef: Ref<THREE.Group> }) {
  const pointGeometry = useMemo(() => createCrownPointGeometry(), [])

  return (
    <group ref={groupRef} rotation-z={-0.055}>
      <CrownOutlinedMesh
        position={[0, -0.115, 0]}
        scale={[0.42, 0.53, 0.35]}
        outlineWidth={0.017}
        geometry={<cylinderGeometry args={[1, 0.72, 1, 14, 2]} />}
        material={toon(GOLD_RICH)}
      />
      <CrownOutlinedMesh
        position={[0, -0.362, 0.004]}
        scale={[0.31, 0.072, 0.255]}
        outlineWidth={0.009}
        geometry={<cylinderGeometry args={[1, 0.9, 1, 14]} />}
        material={toon(GOLD_DEEP)}
      />
      <CrownOutlinedMesh
        position={[0, 0.055, 0]}
        scale={[0.445, 0.19, 0.37]}
        outlineWidth={0.01}
        geometry={<cylinderGeometry args={[1, 0.98, 1, 16]} />}
        material={toon(GOLD_MID)}
      />
      <mesh position={[-0.13, 0.108, -0.364]} rotation-z={-0.2} scale={[0.12, 0.02, 0.012]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={GOLD_GLINT} depthTest />
      </mesh>
      <mesh position={[0.15, -0.138, -0.32]} rotation-z={0.24} scale={[0.09, 0.014, 0.01]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={GOLD_DARK} depthTest />
      </mesh>

      {crownPoints.map((point, index) => (
        <CrownPoint key={`crown-point-${index}`} spec={point} geometry={pointGeometry} />
      ))}

      <CrownOutlinedMesh
        position={[0, 0.174, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1, 0.84, 1]}
        outlineWidth={0.01}
        geometry={<torusGeometry args={[0.385, 0.057, 7, 20]} />}
        material={toon(GOLD_LIGHT)}
      />
      <mesh position={[0, 0.176, 0]} scale={[0.375, 0.078, 0.31]}>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshBasicMaterial color={GOLD_DEEP} />
      </mesh>
      <CrownOutlinedMesh
        position={[0, 0.195, 0]}
        scale={[0.365, 0.058, 0.3]}
        outlineWidth={0.004}
        geometry={<cylinderGeometry args={[1, 1, 1, 18]} />}
        material={toon(SOIL_DEEP)}
      />
      <mesh position={[0, 0.208, 0]} scale={[0.355, 0.042, 0.29]}>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshBasicMaterial color={SOIL_DEEP} />
      </mesh>
      {soilMounds.map((mound, index) => (
        <mesh
          key={`crown-soil-mound-${index}`}
          position={mound.position}
          rotation={mound.rotation}
          scale={mound.scale}
        >
          <sphereGeometry args={[1, 9, 5]} />
          <meshToonMaterial color={mound.color} gradientMap={getCrownToonRamp()} />
        </mesh>
      ))}

      {bezelJewels.map((jewel, index) => (
        <CrownBezelJewel key={`crown-bezel-jewel-${index}`} {...jewel} />
      ))}
      <CrownSparkle position={[-0.245, 0.13, -0.367]} scale={0.72} />
      <CrownSparkle position={[0.258, -0.04, -0.344]} scale={0.5} />
      <mesh position={[0.008, -0.407, 0.018]} rotation-z={-0.06} scale={[0.27, 0.032, 0.086]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={INK} transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  )
}
