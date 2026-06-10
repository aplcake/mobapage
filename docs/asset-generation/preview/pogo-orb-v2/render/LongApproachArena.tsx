import { THREE, useMemo } from '@/render/threeRuntime'
import { GlowbudWizardCritterAsset, RedShellIdleCritterAsset } from '../../../code-examples/RedShellIdleCritterAsset.example'
import { MUSEUM_SCALE_FLOOR_Y, MuseumFacadeSilhouette, MuseumMobaSign } from '../../pogo-orb/arena/MuseumScalePathGrassArena'
import {
  BEACH_LOUNGE_CHAIRS,
  CAVE_PATH_POINTS,
  FLOOR_Y,
  GLOWBUD_CAVE_CENTER_X,
  GLOWBUD_CAVE_CENTER_Z,
  GLOWBUD_CAVE_YAW,
  LEVEL_SURFACES,
  MAIN_PATH_EDGE_EXTENSION_POINTS,
  MAIN_PATH_POINTS,
  MUSEUM_HILL_CENTER_X,
  MUSEUM_HILL_HALF_WIDTH,
  MUSEUM_HILL_START_Z,
  MUSEUM_HILL_TOP_Z,
  NATURAL_BOUNDARY,
  NORTHWEST_LAKE_CENTER,
  NORTHWEST_LAKE_POINTS,
  PALETTE,
  SCENIC_PATH_POINTS,
  TRAIN_STATION_X,
  TRAIN_STATION_Z,
  TRAIN_TRACK_Z,
  getGlowbudCaveWorldPoint,
  getTerrainHeight,
  signedDistanceToLake,
  type LevelSurface,
  type PathPoint,
} from '../world/longApproachLevel'

const TERRAIN_BASE_Y = FLOOR_Y - 24
const PATH_Y = FLOOR_Y - 0.02
const TERRAIN_LEFT = -1680
const TERRAIN_RIGHT = 1500
const TERRAIN_NEAR = 900
const TERRAIN_FAR = -1580
const HILL_FILL_LEFT = MUSEUM_HILL_CENTER_X - MUSEUM_HILL_HALF_WIDTH - 560
const HILL_FILL_RIGHT = MUSEUM_HILL_CENTER_X + MUSEUM_HILL_HALF_WIDTH + 430
const HILL_FILL_NEAR = MUSEUM_HILL_START_Z + 160
const HILL_FILL_FAR = MUSEUM_HILL_TOP_Z - 190
const MIN_TOON_OUTLINE_PAD = 0.42
const MIN_THIN_TOON_OUTLINE_PAD = 0.72

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function smootherstep01(value: number) {
  const t = clamp(value, 0, 1)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function terrainY(x: number, z: number, offset = 0) {
  return FLOOR_Y + getTerrainHeight(x, z) + offset
}

function getStableLocalOutlineScale(
  scale: [number, number, number],
  outlineScale: [number, number, number],
): [number, number, number] {
  return scale.map((axisSize, index) => {
    const minPad = axisSize < 4 ? MIN_THIN_TOON_OUTLINE_PAD : axisSize < 14 ? 0.56 : MIN_TOON_OUTLINE_PAD
    return Math.max(outlineScale[index], 1 + minPad / Math.max(0.001, axisSize))
  }) as [number, number, number]
}

function ToonBox({
  position,
  scale,
  color,
  outline = true,
  opacity = 1,
  yaw = 0,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
  outline?: boolean
  opacity?: number
  yaw?: number
}) {
  const stableOutlineScale = getStableLocalOutlineScale(scale, [1.035, 1.04, 1.035])

  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      {outline ? (
        <mesh scale={stableOutlineScale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color={PALETTE.ink}
            side={THREE.BackSide}
            transparent={opacity < 1}
            opacity={opacity < 1 ? 0.4 : 1}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
      ) : null}
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={color} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
      </mesh>
    </group>
  )
}

function ToonCylinder({
  position,
  scale,
  color,
  outline = true,
  segments = 24,
  yaw = 0,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
  outline?: boolean
  segments?: number
  yaw?: number
}) {
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      <mesh>
        <cylinderGeometry args={[0.5, 0.5, 1, segments]} />
        <meshToonMaterial color={color} />
      </mesh>
      {outline ? (
        <mesh scale={[1.075, 1.04, 1.075]}>
          <cylinderGeometry args={[0.5, 0.5, 1, segments]} />
          <meshBasicMaterial color={PALETTE.ink} side={THREE.BackSide} />
        </mesh>
      ) : null}
    </group>
  )
}

function ToonRock({
  position,
  scale,
  color,
  rotation = [0, 0, 0],
  outlineScale = 1.045,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
  rotation?: [number, number, number]
  outlineScale?: number
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh scale={[outlineScale, outlineScale, outlineScale]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <dodecahedronGeometry args={[1, 0]} />
        <meshToonMaterial color={color} />
      </mesh>
    </group>
  )
}

function ToonBlob({
  position,
  scale,
  color,
  rotation = [0, 0, 0],
  outlineScale = 1.055,
  opacity = 1,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
  rotation?: [number, number, number]
  outlineScale?: number
  opacity?: number
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh scale={[outlineScale, outlineScale, outlineScale]}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshBasicMaterial color={PALETTE.ink} side={THREE.BackSide} transparent={opacity < 1} opacity={opacity < 1 ? opacity * 0.5 : 1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1, 18, 12]} />
        <meshToonMaterial color={color} transparent={opacity < 1} opacity={opacity} />
      </mesh>
    </group>
  )
}

function ToonCone({
  position,
  scale,
  color,
  rotation = [0, 0, 0],
  segments = 9,
  outlineScale = 1.055,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
  rotation?: [number, number, number]
  segments?: number
  outlineScale?: number
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh scale={[outlineScale, outlineScale, outlineScale]}>
        <coneGeometry args={[0.5, 1, segments]} />
        <meshBasicMaterial color={PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <coneGeometry args={[0.5, 1, segments]} />
        <meshToonMaterial color={color} />
      </mesh>
    </group>
  )
}

function FlatOval({
  position,
  diameterX,
  diameterZ,
  color,
  opacity = 1,
  yaw = 0,
  segments = 24,
  renderOrder = 0,
}: {
  position: [number, number, number]
  diameterX: number
  diameterZ: number
  color: string
  opacity?: number
  yaw?: number
  segments?: number
  renderOrder?: number
}) {
  return (
    <group position={position} rotation={[0, yaw, 0]} renderOrder={renderOrder}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[diameterX, diameterZ, 1]}>
        <circleGeometry args={[0.5, segments]} />
        <meshBasicMaterial
          color={color}
          transparent={opacity < 1}
          opacity={opacity}
          depthWrite={false}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </group>
  )
}

const MAGIC_NATURE_PALETTE = {
  mushroomCap: '#ef474d',
  mushroomCapDeep: '#b82e47',
  mushroomCapGold: '#f6b94d',
  mushroomCapBlue: '#55c7df',
  mushroomCapViolet: '#b77dff',
  mushroomSpot: '#fffdf0',
  mushroomStem: '#f4e4bf',
  mushroomGills: '#d8bd93',
  leafDark: '#2f6b32',
  leaf: '#5fae45',
  leafLight: '#9fd36d',
  flowerPink: '#ef8edb',
  flowerCream: '#fff2ad',
  flowerBlue: '#8ce8ff',
  flowerViolet: '#caa1ff',
  flowerCoral: '#ff7c68',
  flowerYellow: '#ffe66a',
  glowMint: '#80ffdf',
} as const

const GROVE_GATE_X = 730
const GROVE_GATE_Z = 395
const GROVE_GATE_YAW = 2.4 + Math.PI / 2

function groveGatePoint(localX: number, localZ: number) {
  const cos = Math.cos(GROVE_GATE_YAW)
  const sin = Math.sin(GROVE_GATE_YAW)
  return {
    x: GROVE_GATE_X + localX * cos + localZ * sin,
    z: GROVE_GATE_Z - localX * sin + localZ * cos,
  }
}

type ForestMushroomSpec = {
  offset: [number, number, number]
  size: number
  yaw: number
  lean: number
  capColor: string
  capSquash?: number
  spots?: boolean
  glow?: boolean
}

type ForestMushroomPatch = {
  id: string
  x: number
  z: number
  yaw: number
  scale?: number
  baseX?: number
  baseZ?: number
  mushrooms: ForestMushroomSpec[]
}

type ForestFlowerKind = 'daisy' | 'bell' | 'pom'

type ForestFlowerSpec = {
  offset: [number, number, number]
  height: number
  bloomSize: number
  color: string
  accent: string
  kind: ForestFlowerKind
  lean?: number
  yaw?: number
}

type ForestFlowerPatch = {
  id: string
  x: number
  z: number
  yaw: number
  flowers: ForestFlowerSpec[]
}

const AMANITA_DECAL_SPOT_PATTERNS = [
  [
    { x: -0.08, z: -0.06, rx: 0.076, rz: 0.052, rotation: 0.06, opacity: 0.94 },
    { x: -0.34, z: 0.08, rx: 0.052, rz: 0.038, rotation: -0.22, opacity: 0.88 },
    { x: 0.32, z: 0.1, rx: 0.048, rz: 0.035, rotation: 0.3, opacity: 0.86 },
    { x: 0.14, z: -0.3, rx: 0.044, rz: 0.032, rotation: -0.14, opacity: 0.82 },
    { x: -0.47, z: -0.24, rx: 0.034, rz: 0.025, rotation: 0.26, opacity: 0.72 },
    { x: 0.47, z: -0.18, rx: 0.032, rz: 0.024, rotation: -0.34, opacity: 0.7 },
  ],
  [
    { x: 0.06, z: 0.02, rx: 0.08, rz: 0.05, rotation: -0.12, opacity: 0.95 },
    { x: -0.26, z: -0.24, rx: 0.058, rz: 0.038, rotation: 0.2, opacity: 0.86 },
    { x: 0.3, z: -0.25, rx: 0.05, rz: 0.036, rotation: -0.18, opacity: 0.84 },
    { x: -0.42, z: 0.18, rx: 0.04, rz: 0.028, rotation: -0.08, opacity: 0.76 },
    { x: 0.43, z: 0.2, rx: 0.038, rz: 0.028, rotation: 0.28, opacity: 0.74 },
  ],
  [
    { x: -0.12, z: -0.18, rx: 0.07, rz: 0.046, rotation: 0.18, opacity: 0.92 },
    { x: 0.24, z: 0.0, rx: 0.06, rz: 0.04, rotation: -0.28, opacity: 0.88 },
    { x: -0.36, z: 0.22, rx: 0.046, rz: 0.032, rotation: 0.34, opacity: 0.8 },
    { x: 0.0, z: 0.32, rx: 0.04, rz: 0.03, rotation: -0.04, opacity: 0.76 },
    { x: 0.48, z: -0.2, rx: 0.032, rz: 0.024, rotation: 0.16, opacity: 0.72 },
  ],
] as const

const DAISY_PETAL_ANGLES = [0, Math.PI * 0.34, Math.PI * 0.67, Math.PI, Math.PI * 1.34, Math.PI * 1.67] as const

function getAmanitaDecalSpots(mushroom: ForestMushroomSpec) {
  const seed = Math.abs(Math.round(mushroom.size * 19 + mushroom.yaw * 37 + mushroom.lean * 53 + mushroom.offset[0] * 0.7 + mushroom.offset[2] * 0.43))
  const pattern = AMANITA_DECAL_SPOT_PATTERNS[seed % AMANITA_DECAL_SPOT_PATTERNS.length]
  const spotCount = mushroom.size < 8 ? 4 : mushroom.size < 13 ? 5 : 6
  return pattern.slice(0, spotCount)
}

function ForestMushroom({ mushroom }: { mushroom: ForestMushroomSpec }) {
  const stemHeight = mushroom.size * 0.7
  const stemRadius = mushroom.size * 0.13
  const capRadius = mushroom.size * 0.52
  const capHeight = mushroom.size * 0.24 * (mushroom.capSquash ?? 1)
  const capY = stemHeight + capHeight * 0.42
  const leanOffset = Math.sin(mushroom.lean) * mushroom.size * 0.22
  const capZRadius = capRadius * 0.9
  const decalSpots = useMemo(() => (mushroom.spots === false ? [] : getAmanitaDecalSpots(mushroom)), [mushroom])

  return (
    <group position={mushroom.offset} rotation={[0, mushroom.yaw, mushroom.lean * 0.42]}>
      <mesh position={[leanOffset * 0.34, stemHeight * 0.5, 0]} rotation={[0, 0, mushroom.lean * 0.62]} scale={[stemRadius, stemHeight, stemRadius * 0.9]}>
        <cylinderGeometry args={[0.72, 1, 1, 14]} />
        <meshToonMaterial color={MAGIC_NATURE_PALETTE.mushroomStem} />
      </mesh>
      <mesh position={[leanOffset * 0.34, stemHeight * 0.5, 0]} rotation={[0, 0, mushroom.lean * 0.62]} scale={[stemRadius * 1.1, stemHeight * 1.02, stemRadius]}>
        <cylinderGeometry args={[0.72, 1, 1, 14]} />
        <meshBasicMaterial color={PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      <mesh position={[leanOffset, capY - capHeight * 0.28, 0]} scale={[capRadius * 0.84, mushroom.size * 0.045, capRadius * 0.74]}>
        <cylinderGeometry args={[1, 1, 1, 22]} />
        <meshToonMaterial color={MAGIC_NATURE_PALETTE.mushroomGills} />
      </mesh>
      <mesh position={[leanOffset, capY, 0]} scale={[capRadius, capHeight, capRadius * 0.9]}>
        <sphereGeometry args={[1, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshToonMaterial color={mushroom.capColor} />
      </mesh>
      <mesh position={[leanOffset, capY, 0]} scale={[capRadius * 1.045, capHeight * 1.06, capRadius * 0.94]}>
        <sphereGeometry args={[1, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshBasicMaterial color={PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      {decalSpots.map((spot, index) => {
        const localX = spot.x * capRadius
        const localZ = spot.z * capZRadius
        const normalizedDistance = Math.min(0.94, spot.x * spot.x + spot.z * spot.z)
        const localY = capHeight * Math.sqrt(Math.max(0.12, 1 - normalizedDistance))
        const normal = new THREE.Vector3(localX / (capRadius * capRadius), localY / (capHeight * capHeight), localZ / (capZRadius * capZRadius)).normalize()
        const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal))

        return (
          <group key={index} position={[leanOffset + localX, capY + localY + 0.01, localZ]} rotation={rotation}>
            <mesh rotation={[0, 0, spot.rotation]} scale={[mushroom.size * spot.rx, mushroom.size * spot.rz, 1]} renderOrder={3}>
              <circleGeometry args={[1, 20]} />
              <meshBasicMaterial
                color={MAGIC_NATURE_PALETTE.mushroomSpot}
                side={THREE.DoubleSide}
                transparent
                opacity={spot.opacity}
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={-4}
                polygonOffsetUnits={-4}
                toneMapped={false}
              />
            </mesh>
          </group>
        )
      })}
      {mushroom.glow ? (
        <>
          <mesh position={[leanOffset, capY + capHeight * 0.18, 0]} scale={[capRadius * 0.92, capHeight * 0.7, capRadius * 0.82]}>
            <sphereGeometry args={[1, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            <meshBasicMaterial color={MAGIC_NATURE_PALETTE.glowMint} transparent opacity={0.13} depthWrite={false} />
          </mesh>
          <pointLight color={MAGIC_NATURE_PALETTE.glowMint} intensity={0.18} distance={68} />
        </>
      ) : null}
    </group>
  )
}

function ForestMushroomPatch({ patch }: { patch: ForestMushroomPatch }) {
  const y = terrainY(patch.x, patch.z, 0.08)
  return (
    <group position={[patch.x, y, patch.z]} rotation={[0, patch.yaw, 0]} scale={[patch.scale ?? 1, patch.scale ?? 1, patch.scale ?? 1]}>
      <FlatOval position={[0, 0.08, 0]} diameterX={patch.baseX ?? 46} diameterZ={patch.baseZ ?? 30} color={PALETTE.ink} opacity={0.12} yaw={0.08} renderOrder={-2} />
      {patch.mushrooms.map((mushroom, index) => (
        <ForestMushroom key={`${patch.id}-${index}`} mushroom={mushroom} />
      ))}
    </group>
  )
}

function ForestWildflower({ flower }: { flower: ForestFlowerSpec }) {
  const lean = flower.lean ?? 0
  const bloomX = Math.sin(lean) * flower.height * 0.25
  const bloomSize = flower.bloomSize

  return (
    <group position={flower.offset} rotation={[0, flower.yaw ?? 0, 0]}>
      <mesh position={[0, flower.height * 0.5, 0]} rotation={[0, 0, lean]} scale={[0.22, flower.height, 0.22]}>
        <cylinderGeometry args={[1, 0.62, 1, 7]} />
        <meshBasicMaterial color={MAGIC_NATURE_PALETTE.leafDark} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.42, flower.height * 0.44, side * 0.08]} rotation={[0.1, side * 0.5, side * 0.42]} scale={[0.82, 0.22, 0.34]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshToonMaterial color={MAGIC_NATURE_PALETTE.leafLight} />
        </mesh>
      ))}
      <group position={[bloomX, flower.height, 0]} rotation={[0, flower.yaw ?? 0, -lean * 0.25]}>
        {flower.kind === 'daisy' ? (
          <>
            {DAISY_PETAL_ANGLES.map((angle) => (
              <mesh key={angle} position={[Math.cos(angle) * bloomSize * 0.62, 0, Math.sin(angle) * bloomSize * 0.34]} rotation={[0.08, -angle, 0.12]} scale={[bloomSize * 0.46, bloomSize * 0.22, bloomSize * 0.25]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshBasicMaterial color={flower.color} />
              </mesh>
            ))}
            <mesh scale={[bloomSize * 0.34, bloomSize * 0.34, bloomSize * 0.34]}>
              <sphereGeometry args={[1, 9, 7]} />
              <meshBasicMaterial color={flower.accent} />
            </mesh>
          </>
        ) : flower.kind === 'bell' ? (
          <>
            <mesh rotation={[Math.PI, 0, 0]} scale={[bloomSize * 0.72, bloomSize * 0.9, bloomSize * 0.72]}>
              <coneGeometry args={[1, 1.24, 9]} />
              <meshToonMaterial color={flower.color} />
            </mesh>
            <mesh position={[0, -bloomSize * 0.42, 0]} scale={[bloomSize * 0.62, bloomSize * 0.12, bloomSize * 0.62]}>
              <cylinderGeometry args={[1, 1, 1, 12]} />
              <meshBasicMaterial color={flower.accent} />
            </mesh>
          </>
        ) : (
          <>
            {[-0.44, 0, 0.44].map((x, index) => (
              <mesh key={x} position={[x * bloomSize, index === 1 ? bloomSize * 0.18 : 0, index === 1 ? -bloomSize * 0.18 : bloomSize * 0.12]} scale={[bloomSize * 0.46, bloomSize * 0.46, bloomSize * 0.46]}>
                <sphereGeometry args={[1, 9, 7]} />
                <meshBasicMaterial color={index === 1 ? flower.accent : flower.color} />
              </mesh>
            ))}
          </>
        )}
      </group>
    </group>
  )
}

function ForestFlowerPatch({ patch }: { patch: ForestFlowerPatch }) {
  const y = terrainY(patch.x, patch.z, 0.12)
  return (
    <group position={[patch.x, y, patch.z]} rotation={[0, patch.yaw, 0]}>
      <FlatOval position={[0, 0.04, 0]} diameterX={42} diameterZ={24} color={MAGIC_NATURE_PALETTE.leafDark} opacity={0.1} yaw={0.1} renderOrder={-2} />
      {patch.flowers.map((flower, index) => (
        <ForestWildflower key={`${patch.id}-${index}`} flower={flower} />
      ))}
    </group>
  )
}

function FernFan({ x, z, scale = 1, yaw = 0 }: { x: number; z: number; scale?: number; yaw?: number }) {
  const y = terrainY(x, z, 0.1)
  const leaves = [-34, -22, -10, 2, 14, 26, 38] as const
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <FlatOval position={[0, 0.04, 0]} diameterX={82} diameterZ={48} color={PALETTE.ink} opacity={0.1} yaw={0.2} renderOrder={-2} />
      {leaves.map((leafX, index) => (
        <ToonCone
          key={`forest-fern-${leafX}`}
          position={[leafX, 18 + (index % 2) * 3, -6 + Math.sin(index * 1.7) * 9]}
          rotation={[0.34 + index * 0.018, index * 0.56, index % 2 === 0 ? -0.22 : 0.2]}
          scale={[8, 36 + (index % 3) * 8, 8]}
          color={index % 2 === 0 ? MAGIC_NATURE_PALETTE.leafLight : MAGIC_NATURE_PALETTE.leaf}
          segments={5}
          outlineScale={1.04}
        />
      ))}
    </group>
  )
}

function GlowSporeCluster({ x, z, scale = 1, yaw = 0 }: { x: number; z: number; scale?: number; yaw?: number }) {
  const y = terrainY(x, z, 0.12)
  const spores = [
    [-18, 8, -6, 5, MAGIC_NATURE_PALETTE.glowMint],
    [0, 12, 4, 6, MAGIC_NATURE_PALETTE.flowerViolet],
    [18, 9, -1, 4.8, MAGIC_NATURE_PALETTE.flowerYellow],
  ] as const
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <FlatOval position={[0, 0.04, 0]} diameterX={56} diameterZ={34} color={MAGIC_NATURE_PALETTE.leafDark} opacity={0.12} renderOrder={-2} />
      {spores.map(([sx, sy, sz, radius, color], index) => (
        <group key={`glow-spore-${index}`} position={[sx, sy, sz]}>
          <ToonCylinder position={[0, -sy * 0.32, 0]} scale={[1.8, sy * 0.64, 1.8]} color={MAGIC_NATURE_PALETTE.leafDark} outline={false} segments={6} />
          <mesh scale={[radius, radius, radius]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.9} />
          </mesh>
          <mesh scale={[radius * 1.8, radius * 1.8, radius * 1.8]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function GiantToonFlower({
  x,
  z,
  scale = 1,
  yaw = 0,
  petalColor = MAGIC_NATURE_PALETTE.flowerPink,
  centerColor = MAGIC_NATURE_PALETTE.flowerYellow,
}: {
  x: number
  z: number
  scale?: number
  yaw?: number
  petalColor?: string
  centerColor?: string
}) {
  const y = terrainY(x, z, 0.12)
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <FlatOval position={[0, 0.04, 0]} diameterX={58} diameterZ={36} color={PALETTE.ink} opacity={0.1} renderOrder={-2} />
      <ToonCylinder position={[0, 24, 0]} scale={[3.2, 48, 3.2]} color={MAGIC_NATURE_PALETTE.leafDark} outline={false} segments={7} yaw={0.2} />
      {[-1, 1].map((side) => (
        <ToonBlob key={`giant-flower-leaf-${side}`} position={[side * 13, 24, 1]} scale={[14, 4.2, 7.5]} color={MAGIC_NATURE_PALETTE.leafLight} rotation={[0.1, side * 0.5, side * 0.36]} outlineScale={1.04} />
      ))}
      <group position={[0, 53, 0]} rotation={[0.08, 0, -0.08]}>
        {DAISY_PETAL_ANGLES.map((angle) => (
          <ToonBlob
            key={`giant-flower-petal-${angle}`}
            position={[Math.cos(angle) * 11, Math.sin(angle) * 1.2, Math.sin(angle) * 8]}
            scale={[11, 5.2, 6.8]}
            color={petalColor}
            rotation={[0.1, -angle, 0.14]}
            outlineScale={1.04}
          />
        ))}
        <ToonBlob position={[0, 0, 0]} scale={[8.2, 8.2, 8.2]} color={centerColor} outlineScale={1.05} />
      </group>
    </group>
  )
}

function FallenMagicLog({ x, z, scale = 1, yaw = 0 }: { x: number; z: number; scale?: number; yaw?: number }) {
  const y = terrainY(x, z, 0.18)
  const shelfCaps = [
    [-36, 8, -5, MAGIC_NATURE_PALETTE.mushroomCapGold],
    [-16, 10, 8, MAGIC_NATURE_PALETTE.mushroomCapDeep],
    [20, 8, -7, MAGIC_NATURE_PALETTE.mushroomCapViolet],
    [42, 9, 5, MAGIC_NATURE_PALETTE.mushroomCapBlue],
  ] as const
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <FlatOval position={[0, 0.03, 0]} diameterX={112} diameterZ={32} color={PALETTE.ink} opacity={0.12} yaw={0.05} renderOrder={-2} />
      <group position={[0, 9, 0]} rotation={[0, 0, Math.PI / 2]} scale={[13, 92, 13]}>
        <mesh scale={[1.06, 1.03, 1.06]}>
          <cylinderGeometry args={[0.5, 0.5, 1, 10]} />
          <meshBasicMaterial color={PALETTE.ink} side={THREE.BackSide} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.5, 0.5, 1, 10]} />
          <meshToonMaterial color="#7b4d2d" />
        </mesh>
      </group>
      <mesh position={[0, 10.2, 0]} rotation={[0, 0, Math.PI / 2]} scale={[8, 94, 8]}>
        <cylinderGeometry args={[0.5, 0.5, 1, 9]} />
        <meshToonMaterial color="#a7683a" />
      </mesh>
      <ToonBlob position={[-52, 10, 0]} scale={[12, 12, 12]} color="#5f3b25" outlineScale={1.04} />
      <ToonBlob position={[52, 10, 0]} scale={[12, 12, 12]} color="#5f3b25" outlineScale={1.04} />
      {shelfCaps.map(([capX, capY, capZ, color], index) => (
        <group key={`fallen-log-shelf-${index}`} position={[capX, capY, capZ]} rotation={[0.04, index * 0.28, 0.12]}>
          <ToonBlob position={[0, 0, 0]} scale={[10, 3.2, 6.5]} color={color} outlineScale={1.05} />
          <mesh position={[0, -2.2, 0]} scale={[8.2, 1.2, 4.8]}>
            <cylinderGeometry args={[1, 1, 1, 12]} />
            <meshToonMaterial color={MAGIC_NATURE_PALETTE.mushroomGills} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function CozyGroveBench({ x, z, scale = 1, yaw = 0 }: { x: number; z: number; scale?: number; yaw?: number }) {
  const y = terrainY(x, z, 0.18)
  const wood = '#9b6236'
  const woodLight = '#d19052'
  const vine = '#3f7a34'

  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <FlatOval position={[0, 0.04, 4]} diameterX={102} diameterZ={44} color={PALETTE.ink} opacity={0.1} yaw={0.08} renderOrder={-2} />
      <ToonBox position={[0, 8, 2]} scale={[72, 7.5, 14]} color={wood} outline />
      <ToonBox position={[0, 11.7, 2.8]} scale={[64, 2.3, 9]} color={woodLight} outline={false} />
      <ToonBox position={[0, 19, -10]} scale={[78, 7.2, 9]} color={wood} outline />
      <ToonBox position={[0, 25.2, -13.5]} scale={[72, 5.6, 7]} color={woodLight} outline={false} />
      {[-30, -10, 10, 30].map((slatX) => (
        <ToonCylinder key={`cozy-bench-back-slat-${slatX}`} position={[slatX, 17, -8]} scale={[2.4, 27, 2.4]} color="#6f4429" segments={7} yaw={0.18} />
      ))}
      {[-32, 32].map((legX) => (
        <group key={`cozy-bench-leg-${legX}`}>
          <ToonCylinder position={[legX, 3.6, 8]} scale={[4.2, 7.2, 4.2]} color="#6f4429" segments={7} />
          <ToonCylinder position={[legX, 3.7, -4]} scale={[4, 7.4, 4]} color="#6f4429" segments={7} />
        </group>
      ))}
      <GardenIronCurve points={[[-42, 25, -7], [-18, 31, -9], [9, 29, -10], [42, 26, -8]]} radius={0.9} color={vine} segments={42} />
      {[
        [-34, 27, -5, -0.34, MAGIC_NATURE_PALETTE.leafLight],
        [-18, 30, -7, 0.28, MAGIC_NATURE_PALETTE.leaf],
        [6, 29.5, -8, -0.18, MAGIC_NATURE_PALETTE.leafLight],
        [28, 28, -7, 0.36, MAGIC_NATURE_PALETTE.leaf],
      ].map(([leafX, leafY, leafZ, roll, color], index) => (
        <GardenLeaf
          key={`cozy-bench-leaf-${index}`}
          position={[leafX as number, leafY as number, leafZ as number]}
          rotation={[0.1, 0, roll as number]}
          scale={[1.8, 0.9, 1]}
          color={color as string}
        />
      ))}
      <GardenFlower position={[-46, 9.8, 12]} scale={0.68} petalColor={MAGIC_NATURE_PALETTE.flowerCream} centerColor={MAGIC_NATURE_PALETTE.flowerCoral} />
      <GardenFlower position={[46, 9.7, 12]} scale={0.62} petalColor={MAGIC_NATURE_PALETTE.flowerBlue} />
    </group>
  )
}

function CozyMushroomLantern({ x, z, scale = 1, yaw = 0, color = MAGIC_NATURE_PALETTE.mushroomCapGold }: { x: number; z: number; scale?: number; yaw?: number; color?: string }) {
  const y = terrainY(x, z, 0.12)

  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <FlatOval position={[0, 0.04, 0]} diameterX={34} diameterZ={22} color={PALETTE.ink} opacity={0.09} yaw={0.1} renderOrder={-2} />
      <ToonCylinder position={[0, 9, 0]} scale={[3.8, 18, 3.8]} color={MAGIC_NATURE_PALETTE.mushroomStem} segments={10} />
      <mesh position={[0, 20.5, 0]} scale={[13, 5.4, 11]}>
        <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshToonMaterial color={color} />
      </mesh>
      <mesh position={[0, 20.5, 0]} scale={[13.7, 5.9, 11.7]}>
        <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshBasicMaterial color={PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, 17.2, 0]} scale={[9.4, 1.4, 7.6]}>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshBasicMaterial color="#fff2a4" transparent opacity={0.72} depthWrite={false} />
      </mesh>
      <mesh position={[0, 16.8, 0]} scale={[18, 12, 16]}>
        <sphereGeometry args={[1, 14, 8]} />
        <meshBasicMaterial color="#fff2a4" transparent opacity={0.11} depthWrite={false} />
      </mesh>
      <pointLight color="#fff2a4" intensity={0.24} distance={92} />
    </group>
  )
}

function CozyStoneCircle({ x, z, scale = 1, yaw = 0 }: { x: number; z: number; scale?: number; yaw?: number }) {
  const y = terrainY(x, z, 0.12)
  const stones = [
    [-46, -8, 17, 4.2, 12, '#8a8f7b', -0.18],
    [-28, 24, 13, 3.8, 10, '#b8ad8d', 0.32],
    [5, 33, 14, 3.5, 10, '#7f8977', -0.44],
    [35, 14, 15, 4.1, 11, '#a19b82', 0.2],
    [42, -24, 13, 3.7, 10, '#727c70', -0.08],
    [0, -36, 12, 4.4, 11, '#a89b80', 0.46],
  ] as const

  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <FlatOval position={[0, 0.04, 0]} diameterX={128} diameterZ={86} color="#2f5c2f" opacity={0.14} yaw={0.1} renderOrder={-2} />
      <FlatOval position={[0, 0.08, 0]} diameterX={92} diameterZ={58} color="#b9d67a" opacity={0.34} yaw={-0.08} renderOrder={-1} />
      {stones.map(([stoneX, stoneZ, sx, sy, sz, color, stoneYaw], index) => (
        <ToonRock
          key={`cozy-stone-seat-${index}`}
          position={[stoneX, sy * 0.58, stoneZ]}
          scale={[sx, sy, sz]}
          color={color}
          rotation={[0.05, stoneYaw, index % 2 === 0 ? 0.08 : -0.06]}
          outlineScale={1.035}
        />
      ))}
      <CozyMushroomLantern x={0} z={0} scale={0.82} yaw={0.2} color={MAGIC_NATURE_PALETTE.mushroomCapGold} />
      <GardenFlower position={[-12, 2.2, 7]} scale={0.58} petalColor={MAGIC_NATURE_PALETTE.flowerViolet} />
      <GardenFlower position={[14, 2.3, -8]} scale={0.54} petalColor={MAGIC_NATURE_PALETTE.flowerCream} centerColor={MAGIC_NATURE_PALETTE.flowerCoral} />
    </group>
  )
}

function CozyPicnicTeaPatch({ x, z, scale = 1, yaw = 0 }: { x: number; z: number; scale?: number; yaw?: number }) {
  const y = terrainY(x, z, 0.14)
  const blanket = '#f7d986'
  const trim = '#ef8edb'

  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <FlatOval position={[0, 0.04, 0]} diameterX={112} diameterZ={72} color={PALETTE.ink} opacity={0.08} yaw={0.04} renderOrder={-2} />
      <mesh position={[0, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[78, 48, 1]} renderOrder={-1}>
        <circleGeometry args={[0.5, 28]} />
        <meshToonMaterial color={blanket} />
      </mesh>
      <mesh position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, Math.PI * 0.5]} scale={[68, 4.2, 1]} renderOrder={0}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={trim} />
      </mesh>
      <mesh position={[0, 0.44, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[46, 3.4, 1]} renderOrder={0}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#8ce8ff" />
      </mesh>
      <ToonCylinder position={[0, 5.8, 0]} scale={[11, 11.6, 11]} color="#7b4d2d" segments={9} />
      <ToonBlob position={[-26, 4.6, 14]} scale={[13, 4.6, 10]} color="#b77dff" rotation={[0.04, 0.28, -0.04]} outlineScale={1.035} />
      <ToonBlob position={[28, 4.4, -12]} scale={[12, 4.2, 9]} color="#8ce8ff" rotation={[0.02, -0.34, 0.06]} outlineScale={1.035} />
      {[-7, 7].map((cupX) => (
        <group key={`picnic-cup-${cupX}`} position={[cupX, 14, 2]}>
          <ToonCylinder position={[0, 0, 0]} scale={[2.8, 4.8, 2.8]} color="#fff2ad" segments={10} />
          <mesh position={[0, 2.8, 0]} scale={[2.2, 0.7, 2.2]}>
            <cylinderGeometry args={[1, 1, 1, 12]} />
            <meshBasicMaterial color="#caa1ff" />
          </mesh>
        </group>
      ))}
      <GardenFlower position={[0, 17, -4]} scale={0.62} petalColor={MAGIC_NATURE_PALETTE.flowerCoral} centerColor={MAGIC_NATURE_PALETTE.flowerCream} />
    </group>
  )
}

function CozyFlowerEdging({ x, z, scale = 1, yaw = 0 }: { x: number; z: number; scale?: number; yaw?: number }) {
  const y = terrainY(x, z, 0.16)
  const flowers = [
    [-58, 1.6, -8, MAGIC_NATURE_PALETTE.flowerCream],
    [-38, 1.8, 10, MAGIC_NATURE_PALETTE.flowerBlue],
    [-14, 1.6, 18, MAGIC_NATURE_PALETTE.flowerPink],
    [18, 1.7, 14, MAGIC_NATURE_PALETTE.flowerYellow],
    [42, 1.8, 2, MAGIC_NATURE_PALETTE.flowerViolet],
    [60, 1.6, -16, MAGIC_NATURE_PALETTE.flowerCoral],
  ] as const

  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <GardenIronCurve points={[[-68, 1.4, -16], [-42, 2, 12], [-8, 2.2, 22], [34, 2, 10], [70, 1.4, -20]]} radius={1.3} color="#527638" segments={54} />
      <GardenIronCurve points={[[-62, 1.2, -8], [-28, 1.7, 4], [0, 1.9, 8], [30, 1.6, 2], [62, 1.2, -10]]} radius={0.72} color="#91bb5a" segments={42} />
      {flowers.map(([flowerX, flowerY, flowerZ, color], index) => (
        <GardenFlower
          key={`cozy-edging-flower-${index}`}
          position={[flowerX, flowerY, flowerZ]}
          scale={0.62 + (index % 3) * 0.08}
          petalColor={color}
          centerColor={index % 2 === 0 ? MAGIC_NATURE_PALETTE.flowerYellow : MAGIC_NATURE_PALETTE.flowerCream}
        />
      ))}
    </group>
  )
}

function CozyGroveGardenNooks() {
  const stoneCircle = groveGatePoint(10, -132)
  const leftBench = groveGatePoint(-92, -118)
  const teaPatchA = groveGatePoint(54, -156)
  const flowerEdgeA = groveGatePoint(-112, -76)
  const flowerEdgeB = groveGatePoint(104, -86)
  const lanternA = groveGatePoint(-154, -118)
  const lanternB = groveGatePoint(142, -132)
  const fallenLog = groveGatePoint(18, -214)

  return (
    <group>
      <CozyStoneCircle x={stoneCircle.x} z={stoneCircle.z} scale={0.92} yaw={GROVE_GATE_YAW - 0.12} />
      <CozyGroveBench x={leftBench.x} z={leftBench.z} scale={0.78} yaw={GROVE_GATE_YAW + 0.92} />
      <CozyPicnicTeaPatch x={teaPatchA.x} z={teaPatchA.z} scale={0.72} yaw={GROVE_GATE_YAW + 0.28} />
      <CozyFlowerEdging x={flowerEdgeA.x} z={flowerEdgeA.z} scale={0.76} yaw={GROVE_GATE_YAW + 0.12} />
      <CozyFlowerEdging x={flowerEdgeB.x} z={flowerEdgeB.z} scale={0.72} yaw={GROVE_GATE_YAW - 0.16} />
      <CozyMushroomLantern x={lanternA.x} z={lanternA.z} scale={0.78} yaw={GROVE_GATE_YAW + 0.2} color={MAGIC_NATURE_PALETTE.mushroomCapGold} />
      <CozyMushroomLantern x={lanternB.x} z={lanternB.z} scale={0.76} yaw={GROVE_GATE_YAW - 0.28} color={MAGIC_NATURE_PALETTE.mushroomCapViolet} />
      <FallenMagicLog x={fallenLog.x} z={fallenLog.z} scale={0.42} yaw={GROVE_GATE_YAW + 0.58} />
    </group>
  )
}

const GROVE_GARDEN_MUSHROOM_PATCHES: ForestMushroomPatch[] = [
  {
    id: 'grove-gate-behind-left-amanita-family',
    ...groveGatePoint(-110, -118),
    yaw: GROVE_GATE_YAW - 0.28,
    scale: 0.88,
    baseX: 72,
    baseZ: 46,
    mushrooms: [
      { offset: [-8, 0, -2], size: 22.2, yaw: -0.18, lean: 0.08, capColor: MAGIC_NATURE_PALETTE.mushroomCap, capSquash: 0.9, glow: true },
      { offset: [26, 0, 16], size: 12.4, yaw: 0.72, lean: -0.12, capColor: MAGIC_NATURE_PALETTE.mushroomCapGold, capSquash: 0.86 },
    ],
  },
  {
    id: 'grove-gate-behind-center-red-caps',
    ...groveGatePoint(8, -166),
    yaw: GROVE_GATE_YAW + 0.18,
    scale: 0.84,
    baseX: 84,
    baseZ: 54,
    mushrooms: [
      { offset: [0, 0, 0], size: 24.8, yaw: 0.22, lean: -0.08, capColor: MAGIC_NATURE_PALETTE.mushroomCap, capSquash: 0.94, glow: true },
      { offset: [-34, 0, -14], size: 14.2, yaw: -0.72, lean: 0.14, capColor: MAGIC_NATURE_PALETTE.mushroomCapDeep, capSquash: 0.88 },
      { offset: [34, 0, 14], size: 10.8, yaw: 0.88, lean: -0.18, capColor: MAGIC_NATURE_PALETTE.mushroomCapViolet, spots: false },
    ],
  },
  {
    id: 'grove-gate-behind-right-blue-caps',
    ...groveGatePoint(116, -122),
    yaw: GROVE_GATE_YAW - 0.34,
    scale: 0.76,
    baseX: 68,
    baseZ: 44,
    mushrooms: [
      { offset: [-12, 0, -2], size: 19.4, yaw: -0.36, lean: 0.12, capColor: MAGIC_NATURE_PALETTE.mushroomCapBlue, spots: false, glow: true },
      { offset: [26, 0, 16], size: 12.8, yaw: 0.58, lean: -0.1, capColor: MAGIC_NATURE_PALETTE.mushroomCapViolet, spots: false, capSquash: 0.92 },
    ],
  },
  {
    id: 'grove-gate-rear-gold-cap-accent',
    ...groveGatePoint(42, -232),
    yaw: GROVE_GATE_YAW + 0.46,
    scale: 0.68,
    baseX: 58,
    baseZ: 38,
    mushrooms: [
      { offset: [0, 0, 0], size: 17.8, yaw: 0.26, lean: -0.08, capColor: MAGIC_NATURE_PALETTE.mushroomCapGold, capSquash: 0.8, glow: true },
      { offset: [-24, 0, 16], size: 10.4, yaw: -0.62, lean: 0.12, capColor: MAGIC_NATURE_PALETTE.mushroomCapDeep },
    ],
  },
]

const GROVE_GARDEN_FLOWER_PATCHES: ForestFlowerPatch[] = [
  {
    id: 'grove-gate-behind-daisy-spray',
    ...groveGatePoint(-88, -84),
    yaw: GROVE_GATE_YAW - 0.28,
    flowers: [
      { offset: [-11, 0, -4], height: 7.2, bloomSize: 1.28, color: MAGIC_NATURE_PALETTE.flowerCream, accent: MAGIC_NATURE_PALETTE.flowerYellow, kind: 'daisy', lean: -0.12 },
      { offset: [-2, 0, 6], height: 8.4, bloomSize: 1.12, color: MAGIC_NATURE_PALETTE.flowerBlue, accent: MAGIC_NATURE_PALETTE.flowerCream, kind: 'bell', lean: 0.08 },
      { offset: [8, 0, -5], height: 6.2, bloomSize: 1.12, color: MAGIC_NATURE_PALETTE.flowerCoral, accent: MAGIC_NATURE_PALETTE.flowerCream, kind: 'pom', lean: 0.16 },
      { offset: [15, 0, 4], height: 7.4, bloomSize: 1.02, color: MAGIC_NATURE_PALETTE.flowerViolet, accent: MAGIC_NATURE_PALETTE.flowerYellow, kind: 'daisy', lean: -0.06 },
    ],
  },
  {
    id: 'grove-gate-behind-glow-flower-bank',
    ...groveGatePoint(84, -94),
    yaw: GROVE_GATE_YAW + 0.34,
    flowers: [
      { offset: [-10, 0, 2], height: 7.8, bloomSize: 1.08, color: MAGIC_NATURE_PALETTE.flowerPink, accent: MAGIC_NATURE_PALETTE.flowerCream, kind: 'pom', lean: 0.12 },
      { offset: [-3, 0, -8], height: 9.2, bloomSize: 1.2, color: MAGIC_NATURE_PALETTE.flowerCream, accent: MAGIC_NATURE_PALETTE.flowerCoral, kind: 'daisy', lean: -0.1 },
      { offset: [6, 0, 7], height: 6.8, bloomSize: 1.0, color: MAGIC_NATURE_PALETTE.flowerBlue, accent: MAGIC_NATURE_PALETTE.flowerYellow, kind: 'bell', lean: 0.18 },
      { offset: [14, 0, -2], height: 8.2, bloomSize: 1.08, color: MAGIC_NATURE_PALETTE.flowerYellow, accent: MAGIC_NATURE_PALETTE.flowerPink, kind: 'daisy', lean: -0.16 },
    ],
  },
  {
    id: 'grove-gate-center-sweet-stems',
    ...groveGatePoint(2, -154),
    yaw: GROVE_GATE_YAW - 0.38,
    flowers: [
      { offset: [-8, 0, 4], height: 8.2, bloomSize: 1.18, color: MAGIC_NATURE_PALETTE.flowerCream, accent: MAGIC_NATURE_PALETTE.flowerCoral, kind: 'daisy', lean: -0.1 },
      { offset: [-1, 0, -3], height: 6.8, bloomSize: 1.04, color: MAGIC_NATURE_PALETTE.flowerPink, accent: MAGIC_NATURE_PALETTE.flowerYellow, kind: 'pom', lean: 0.18 },
      { offset: [8, 0, 5], height: 8.7, bloomSize: 1.08, color: MAGIC_NATURE_PALETTE.flowerBlue, accent: MAGIC_NATURE_PALETTE.flowerCream, kind: 'bell', lean: -0.16 },
    ],
  },
  {
    id: 'grove-gate-rear-wildflower-bank',
    ...groveGatePoint(-22, -238),
    yaw: GROVE_GATE_YAW + 0.18,
    flowers: [
      { offset: [-15, 0, -3], height: 7.4, bloomSize: 1.02, color: MAGIC_NATURE_PALETTE.flowerYellow, accent: MAGIC_NATURE_PALETTE.flowerPink, kind: 'daisy', lean: 0.08 },
      { offset: [-4, 0, 7], height: 8.8, bloomSize: 1.12, color: MAGIC_NATURE_PALETTE.flowerViolet, accent: MAGIC_NATURE_PALETTE.flowerCream, kind: 'bell', lean: -0.16 },
      { offset: [8, 0, -7], height: 6.4, bloomSize: 0.96, color: MAGIC_NATURE_PALETTE.flowerBlue, accent: MAGIC_NATURE_PALETTE.flowerYellow, kind: 'pom', lean: 0.18 },
      { offset: [17, 0, 4], height: 7.8, bloomSize: 1.08, color: MAGIC_NATURE_PALETTE.flowerCream, accent: MAGIC_NATURE_PALETTE.flowerCoral, kind: 'daisy', lean: -0.12 },
    ],
  },
]

function MagicalMushroomFlowerForest() {
  const fernA = groveGatePoint(-176, -70)
  const fernB = groveGatePoint(180, -88)
  const fernC = groveGatePoint(38, -238)
  const sporeA = groveGatePoint(-104, -182)
  const sporeB = groveGatePoint(116, -188)
  const flowerA = groveGatePoint(-190, -168)
  const flowerB = groveGatePoint(184, -150)
  const flowerC = groveGatePoint(10, -266)
  const log = groveGatePoint(136, -222)
  const bushA = groveGatePoint(-196, -52)
  const bushB = groveGatePoint(196, -58)
  const bushC = groveGatePoint(-178, -238)
  const bushD = groveGatePoint(194, -232)

  return (
    <group>
      {GROVE_GARDEN_MUSHROOM_PATCHES.map((patch) => (
        <ForestMushroomPatch key={patch.id} patch={patch} />
      ))}
      {GROVE_GARDEN_FLOWER_PATCHES.map((patch) => (
        <ForestFlowerPatch key={patch.id} patch={patch} />
      ))}
      <FernFan x={fernA.x} z={fernA.z} scale={0.66} yaw={GROVE_GATE_YAW + 0.42} />
      <FernFan x={fernB.x} z={fernB.z} scale={0.58} yaw={GROVE_GATE_YAW - 0.18} />
      <FernFan x={fernC.x} z={fernC.z} scale={0.52} yaw={GROVE_GATE_YAW + 0.22} />
      <GlowSporeCluster x={sporeA.x} z={sporeA.z} scale={0.62} yaw={GROVE_GATE_YAW - 0.24} />
      <GlowSporeCluster x={sporeB.x} z={sporeB.z} scale={0.54} yaw={GROVE_GATE_YAW + 0.34} />
      <GiantToonFlower x={flowerA.x} z={flowerA.z} scale={0.34} yaw={GROVE_GATE_YAW - 0.2} petalColor={MAGIC_NATURE_PALETTE.flowerCream} />
      <GiantToonFlower x={flowerB.x} z={flowerB.z} scale={0.32} yaw={GROVE_GATE_YAW + 0.32} petalColor={MAGIC_NATURE_PALETTE.flowerBlue} centerColor={MAGIC_NATURE_PALETTE.flowerCream} />
      <GiantToonFlower x={flowerC.x} z={flowerC.z} scale={0.3} yaw={GROVE_GATE_YAW - 0.42} petalColor={MAGIC_NATURE_PALETTE.flowerViolet} />
      <FallenMagicLog x={log.x} z={log.z} scale={0.34} yaw={GROVE_GATE_YAW - 0.22} />
      <FloweringBush x={bushA.x} z={bushA.z} scale={0.44} yaw={GROVE_GATE_YAW - 0.18} />
      <FloweringBush x={bushB.x} z={bushB.z} scale={0.4} yaw={GROVE_GATE_YAW + 0.4} />
      <FloweringBush x={bushC.x} z={bushC.z} scale={0.42} yaw={GROVE_GATE_YAW - 0.34} />
      <FloweringBush x={bushD.x} z={bushD.z} scale={0.38} yaw={GROVE_GATE_YAW + 0.28} />
      <CozyGroveGardenNooks />
    </group>
  )
}

const GROVE_STUMP_TOP_Y = 34
const GROVE_FLOWER_CRITTER_SCALE = 24
const GROVE_MUSEUM_LOOK_TARGET = { x: 520, z: -650 }

function yawToward(from: { x: number; z: number }, to: { x: number; z: number }) {
  return Math.atan2(to.x - from.x, to.z - from.z)
}

function MossDrip({ angle, height, width, y }: { angle: number; height: number; width: number; y: number }) {
  const radiusX = 40
  const radiusZ = 31
  return (
    <ToonBlob
      position={[Math.cos(angle) * radiusX, y, Math.sin(angle) * radiusZ]}
      scale={[width, height, width * 0.82]}
      color={MAGIC_NATURE_PALETTE.leaf}
      rotation={[0.08, -angle, 0.04]}
      outlineScale={1.025}
    />
  )
}

function StumpBarkStroke({ angle, y, height, color }: { angle: number; y: number; height: number; color: string }) {
  const radiusX = 43.5
  const radiusZ = 34
  return (
    <ToonCylinder
      position={[Math.cos(angle) * radiusX, y, Math.sin(angle) * radiusZ]}
      scale={[1.65, height, 1.15]}
      color={color}
      outline={false}
      segments={5}
      yaw={-angle}
    />
  )
}

function StumpFernFan({ position, yaw = 0, scale = 1 }: { position: [number, number, number]; yaw?: number; scale?: number }) {
  const blades = [-0.68, -0.34, 0, 0.34, 0.68] as const
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      {blades.map((spread, index) => (
        <ToonCone
          key={`stump-fern-frond-${index}`}
          position={[spread * 18, 8 + Math.abs(spread) * 3, Math.sin(index * 0.9) * 3]}
          scale={[3.8, 22 - Math.abs(spread) * 6, 3.8]}
          color={index % 2 === 0 ? MAGIC_NATURE_PALETTE.leafLight : MAGIC_NATURE_PALETTE.leaf}
          rotation={[0.42, spread * 0.82, spread * 0.34]}
          segments={5}
          outlineScale={1.03}
        />
      ))}
    </group>
  )
}

function AncientStumpScar({ angle, y, width, height, color = '#5a3522' }: { angle: number; y: number; width: number; height: number; color?: string }) {
  const radiusX = 44.2
  const radiusZ = 34.5
  return (
    <ToonBox
      position={[Math.cos(angle) * radiusX, y, Math.sin(angle) * radiusZ]}
      scale={[width, height, 1.15]}
      color={color}
      outline={false}
      yaw={-angle + 0.08}
    />
  )
}

function GroveFlowerCritterStumpVignette() {
  const groveFlowerCritter = groveGatePoint(-18, -218)
  const baseY = terrainY(groveFlowerCritter.x, groveFlowerCritter.z, 0.16)
  const flowerCritterYaw = yawToward(groveFlowerCritter, GROVE_MUSEUM_LOOK_TARGET)
  const barkStrokes = [
    [-0.18, 17, 17, '#6e4329'],
    [0.58, 18, 13, '#a36a3e'],
    [1.25, 15, 18, '#5d3824'],
    [2.08, 20, 14, '#8f5835'],
    [2.84, 14, 15, '#5a3522'],
    [3.58, 18, 13, '#a46d41'],
    [4.35, 13, 17, '#6b4128'],
    [5.12, 19, 14, '#8d5632'],
  ] as const
  const mossDrips = [
    [0.2, 8.4, 25, 5.4],
    [0.96, 7.8, 28, 4.6],
    [1.78, 6.4, 23, 4.2],
    [2.64, 7.2, 27, 4.8],
    [3.44, 8.8, 24, 5.2],
    [4.32, 6.6, 26, 4.4],
    [5.2, 7.6, 22, 4.6],
  ] as const
  const ancientScars = [
    [0.28, 19, 8, 1.35, '#57321f'],
    [0.28, 15, 5.4, 1.15, '#c59055'],
    [1.62, 17, 7.4, 1.2, '#4f2e1e'],
    [2.68, 21, 6.2, 1.08, '#c59055'],
    [4.1, 16, 7.8, 1.22, '#58351f'],
    [5.48, 20, 5.8, 1.0, '#c59055'],
  ] as const
  const sideLichen = [
    [-42, 10, 12, 8.6, 3.1, 6.4, MAGIC_NATURE_PALETTE.leafLight, -0.28],
    [38, 13, -9, 8.2, 3, 6.2, MAGIC_NATURE_PALETTE.leaf, 0.34],
    [-20, 24, -30, 9.6, 2.8, 5.2, MAGIC_NATURE_PALETTE.leafDark, 0.12],
    [15, 8, 30, 7.2, 2.6, 5.4, MAGIC_NATURE_PALETTE.leafLight, -0.18],
  ] as const
  const rimPebbles = [
    [-34, GROVE_STUMP_TOP_Y + 1.4, -20, 8, 3.6, 6, '#c99a5e', -0.2],
    [30, GROVE_STUMP_TOP_Y + 1.2, -24, 7, 3.2, 5, '#7a4a2e', 0.28],
    [40, GROVE_STUMP_TOP_Y + 1.3, 8, 6, 3.1, 7, '#b97942', -0.34],
    [-38, GROVE_STUMP_TOP_Y + 1.1, 12, 6.5, 2.8, 5.2, '#8d5936', 0.42],
  ] as const

  return (
    <group position={[groveFlowerCritter.x, baseY, groveFlowerCritter.z]} rotation={[0, GROVE_GATE_YAW - 0.34, 0]}>
      <FlatOval position={[0, 0.04, 0]} diameterX={126} diameterZ={96} color={PALETTE.ink} opacity={0.12} yaw={0.08} renderOrder={-2} />
      <FlatOval position={[2, 0.08, 4]} diameterX={106} diameterZ={76} color="#315d2f" opacity={0.14} yaw={-0.12} renderOrder={-1} />

      <mesh position={[0, GROVE_STUMP_TOP_Y * 0.5, 0]} scale={[86, GROVE_STUMP_TOP_Y, 68]}>
        <cylinderGeometry args={[0.48, 0.56, 1, 13]} />
        <meshBasicMaterial color={PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, GROVE_STUMP_TOP_Y * 0.5, 0]} scale={[80, GROVE_STUMP_TOP_Y, 62]}>
        <cylinderGeometry args={[0.48, 0.56, 1, 13]} />
        <meshToonMaterial color="#875532" />
      </mesh>
      <mesh position={[0, GROVE_STUMP_TOP_Y * 0.5 + 1.2, 0]} scale={[69, GROVE_STUMP_TOP_Y * 0.9, 51]}>
        <cylinderGeometry args={[0.5, 0.5, 1, 13]} />
        <meshToonMaterial color="#a86a3d" />
      </mesh>
      {barkStrokes.map(([angle, y, height, color], index) => (
        <StumpBarkStroke key={`grove-stump-bark-stroke-${index}`} angle={angle} y={y} height={height} color={color} />
      ))}
      {ancientScars.map(([angle, y, width, height, color], index) => (
        <AncientStumpScar key={`grove-stump-ancient-scar-${index}`} angle={angle} y={y} width={width} height={height} color={color} />
      ))}
      {sideLichen.map(([x, y, z, sx, sy, sz, color, yaw], index) => (
        <ToonBlob
          key={`grove-stump-side-lichen-${index}`}
          position={[x, y, z]}
          scale={[sx, sy, sz]}
          color={color}
          rotation={[0.06, yaw, 0.04]}
          outlineScale={1.018}
        />
      ))}

      <mesh position={[0, GROVE_STUMP_TOP_Y + 0.95, 0]} scale={[85, 3.2, 68]}>
        <cylinderGeometry args={[0.5, 0.5, 1, 13]} />
        <meshBasicMaterial color={PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, GROVE_STUMP_TOP_Y + 1.6, 0]} scale={[78, 3.2, 60]}>
        <cylinderGeometry args={[0.5, 0.5, 1, 13]} />
        <meshToonMaterial color="#d59b5c" />
      </mesh>
      <mesh position={[0, GROVE_STUMP_TOP_Y + 3.35, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[26, 18, 1]}>
        <torusGeometry args={[1, 0.035, 8, 42]} />
        <meshBasicMaterial color="#9e6137" transparent opacity={0.56} depthWrite={false} />
      </mesh>
      <mesh position={[-4, GROVE_STUMP_TOP_Y + 3.48, 2]} rotation={[Math.PI / 2, 0, 0.18]} scale={[14, 9.2, 1]}>
        <torusGeometry args={[1, 0.04, 8, 36]} />
        <meshBasicMaterial color="#8a512f" transparent opacity={0.48} depthWrite={false} />
      </mesh>
      <mesh position={[5, GROVE_STUMP_TOP_Y + 3.54, -2]} rotation={[Math.PI / 2, 0, -0.24]} scale={[37, 27, 1]}>
        <torusGeometry args={[1, 0.032, 8, 54]} />
        <meshBasicMaterial color="#f1bd7a" transparent opacity={0.44} depthWrite={false} />
      </mesh>

      <ToonBlob position={[-26, GROVE_STUMP_TOP_Y + 4.6, 8]} scale={[29, 4.8, 19]} color={MAGIC_NATURE_PALETTE.leaf} rotation={[0.04, -0.28, 0.03]} outlineScale={1.026} />
      <ToonBlob position={[22, GROVE_STUMP_TOP_Y + 4.2, -13]} scale={[31, 4.4, 16]} color={MAGIC_NATURE_PALETTE.leafLight} rotation={[0.02, 0.44, -0.04]} outlineScale={1.022} />
      <ToonBlob position={[4, GROVE_STUMP_TOP_Y + 4.4, 21]} scale={[20, 3.8, 12]} color={MAGIC_NATURE_PALETTE.leafDark} rotation={[0.03, 0.12, 0.02]} outlineScale={1.024} />
      {mossDrips.map(([angle, width, y, height], index) => (
        <MossDrip key={`grove-stump-moss-drip-${index}`} angle={angle} width={width} y={y} height={height} />
      ))}
      {rimPebbles.map(([x, y, z, sx, sy, sz, color, rockYaw], index) => (
        <ToonRock
          key={`grove-stump-rim-chip-${index}`}
          position={[x, y, z]}
          scale={[sx, sy, sz]}
          color={color}
          rotation={[0.08, rockYaw, index % 2 === 0 ? 0.06 : -0.05]}
          outlineScale={1.03}
        />
      ))}

      <ForestMushroom
        mushroom={{
          offset: [-58, 0.8, 30],
          size: 7.2,
          yaw: -0.28,
          lean: 0.12,
          capColor: MAGIC_NATURE_PALETTE.mushroomCap,
          capSquash: 0.88,
        }}
      />
      <ForestMushroom
        mushroom={{
          offset: [54, 0.8, 24],
          size: 5.8,
          yaw: 0.52,
          lean: -0.16,
          capColor: MAGIC_NATURE_PALETTE.mushroomCapBlue,
          spots: false,
        }}
      />
      <ForestWildflower
        flower={{
          offset: [-34, GROVE_STUMP_TOP_Y + 2.8, -26],
          height: 8.6,
          bloomSize: 1.08,
          color: MAGIC_NATURE_PALETTE.flowerCream,
          accent: MAGIC_NATURE_PALETTE.flowerCoral,
          kind: 'daisy',
          lean: -0.18,
        }}
      />
      <ForestWildflower
        flower={{
          offset: [34, GROVE_STUMP_TOP_Y + 2.8, -25],
          height: 7.4,
          bloomSize: 0.96,
          color: MAGIC_NATURE_PALETTE.flowerViolet,
          accent: MAGIC_NATURE_PALETTE.flowerYellow,
          kind: 'bell',
          lean: 0.16,
        }}
      />
      <StumpFernFan position={[-62, 1.2, -28]} scale={0.34} yaw={0.28} />
      <StumpFernFan position={[60, 1.2, -24]} scale={0.3} yaw={-0.22} />

      <group position={[0, GROVE_STUMP_TOP_Y + GROVE_FLOWER_CRITTER_SCALE * 0.74, 6]} rotation={[0, flowerCritterYaw - (GROVE_GATE_YAW - 0.34) + Math.PI, 0]}>
        <RedShellIdleCritterAsset animation="idle" activity={0.86} scale={GROVE_FLOWER_CRITTER_SCALE} />
      </group>
    </group>
  )
}

function RedShellCritterNpcLayer() {
  const caveWizard = getGlowbudCaveWorldPoint(-68, 296)
  const caveWizardScale = 30

  return (
    <group>
      <GroveFlowerCritterStumpVignette />
      <group
        position={[caveWizard.x, terrainY(caveWizard.x, caveWizard.z, caveWizardScale * 0.58), caveWizard.z]}
        rotation={[0, GLOWBUD_CAVE_YAW + Math.PI + 0.16, 0]}
      >
        <GlowbudWizardCritterAsset animation="idle" activity={0.78} scale={caveWizardScale} />
      </group>
    </group>
  )
}

function CaveRuneGlyph({
  position,
  scale = 1,
  color = '#75fff0',
  variant = 0,
}: {
  position: [number, number, number]
  scale?: number
  color?: string
  variant?: number
}) {
  const strokes =
    variant % 3 === 0
      ? [
          [0, 6, 18, 2.2],
          [-7, -1, 2.2, 16],
          [7, -1, 2.2, 16],
        ]
      : variant % 3 === 1
        ? [
            [0, 0, 20, 2.2],
            [-6, 6, 2.2, 13],
            [6, -6, 2.2, 13],
          ]
        : [
            [0, 7, 16, 2.2],
            [0, -7, 16, 2.2],
            [0, 0, 2.2, 19],
          ]

  return (
    <group position={position} renderOrder={8}>
      {strokes.map(([x, y, sx, sy], index) => (
        <mesh key={`cave-rune-stroke-${variant}-${index}`} position={[x * scale, y * scale, 0]} scale={[sx * scale, sy * scale, 0.85]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.5]} scale={[5.5 * scale, 5.5 * scale, 1]}>
        <circleGeometry args={[0.5, 12]} />
        <meshBasicMaterial color="#fff5a8" transparent opacity={0.86} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function AncientSealedCaveDoor() {
  const archShape = useMemo(() => {
    const shape = new THREE.Shape()
    const radius = 64
    const bottomY = -62
    const archBaseY = 18
    shape.moveTo(-radius, bottomY)
    shape.lineTo(-radius, archBaseY)
    shape.absarc(0, archBaseY, radius, Math.PI, 0, false)
    shape.lineTo(radius, bottomY)
    shape.closePath()
    return shape
  }, [])
  const archFrameStones = [
    [-82, -14, 0, 18, 118, 14, '#70695f', 0.04],
    [82, -14, 0, 18, 118, 14, '#81786b', -0.03],
    [-54, 70, 2, 30, 24, 14, '#9f967f', -0.22],
    [-20, 86, 2, 28, 22, 14, '#776f63', -0.08],
    [20, 86, 2, 28, 22, 14, '#a99f87', 0.08],
    [54, 70, 2, 30, 24, 14, '#80786b', 0.22],
    [0, 99, 3, 31, 28, 16, '#c4b99c', 0],
  ] as const
  const verticalSlabs = [
    [-32, -18, 7, 52, 91, 8, '#73695d'],
    [32, -17, 7, 52, 89, 8, '#817467'],
  ] as const
  const carvedInsetPanels = [
    [-32, 26, 17, 37, 30, 2.2, '#5b554d'],
    [-32, -37, 17, 37, 30, 2.2, '#61584e'],
    [32, 26, 17, 37, 30, 2.2, '#665d52'],
    [32, -37, 17, 37, 30, 2.2, '#5a524b'],
  ] as const
  const carvedPanelCaps = [
    [-32, 43, 20, 42, 4, 4, '#978872'],
    [-32, 9, 20, 42, 4, 4, '#4d463f'],
    [-32, -20, 20, 42, 4, 4, '#91836f'],
    [-32, -54, 20, 42, 4, 4, '#4d463f'],
    [32, 43, 20, 42, 4, 4, '#a08f76'],
    [32, 9, 20, 42, 4, 4, '#4f4740'],
    [32, -20, 20, 42, 4, 4, '#948570'],
    [32, -54, 20, 42, 4, 4, '#4f4740'],
  ] as const
  const seamStones = [
    [0, 47, 22, 7, 18, 6, '#3a332f'],
    [0, 14, 22, 6, 23, 6, '#28242a'],
    [0, -20, 22, 7, 22, 6, '#3f372e'],
    [0, -52, 22, 6, 20, 6, '#28242a'],
  ] as const
  const hingeBosses = [
    [-66, 40, 19, '#9c8c74'],
    [-66, 4, 19, '#675e54'],
    [-66, -36, 19, '#9a8a72'],
    [66, 40, 19, '#6c6359'],
    [66, 4, 19, '#a19077'],
    [66, -36, 19, '#70665a'],
  ] as const
  const sealStuds = [
    [-46, 36, '#75fff0'],
    [46, 36, PALETTE.glowPurple],
    [-50, -32, '#f3ff93'],
    [50, -32, '#75fff0'],
    [-22, 66, '#f3ff93'],
    [24, 66, PALETTE.glowPurple],
  ] as const
  const cracks = [
    [-34, 8, 3, 30, -0.55],
    [35, 15, 2.6, 24, 0.42],
    [-8, -35, 2.5, 26, 0.08],
    [18, 52, 2.3, 18, -0.24],
  ] as const
  const outerPlinthStones = [
    [0, -88, 5, 188, 11, 22, '#5b5248', 0],
    [0, -75, 8, 158, 16, 20, '#91846d', 0],
    [-92, -52, 6, 18, 64, 20, '#6f675d', -0.03],
    [92, -52, 6, 18, 64, 20, '#837768', 0.03],
    [-78, 46, 7, 20, 82, 20, '#7f7567', 0.04],
    [78, 46, 7, 20, 82, 20, '#6b645d', -0.04],
    [0, 106, 8, 50, 24, 22, '#c8ba91', 0],
    [-50, 98, 7, 46, 16, 18, '#9d9279', -0.08],
    [50, 98, 7, 46, 16, 18, '#897d6c', 0.08],
  ] as const
  const doorFaceRunes = [
    [-32, 26, 24, 0.2, '#75fff0', 0],
    [32, 26, 24, 0.2, PALETTE.glowPurple, 1],
    [-32, -37, 24, 0.18, '#fff4a8', 2],
    [32, -37, 24, 0.18, '#75fff0', 0],
    [0, -3, 25, 0.18, '#d7bdff', 1],
  ] as const
  const smallSealOrbs = [
    [-31, 7, '#75fff0'],
    [31, 7, '#b36dff'],
    [0, 38, '#fff4a8'],
    [0, -24, '#75fff0'],
  ] as const

  return (
    <group position={[0, 60, 206]} renderOrder={8}>
      <mesh position={[0, 0, -1.8]} scale={[1.045, 1.05, 1]}>
        <shapeGeometry args={[archShape]} />
        <meshBasicMaterial color={PALETTE.ink} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0]} scale={[1, 1, 1]}>
        <shapeGeometry args={[archShape]} />
        <meshToonMaterial color="#4c435b" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -22, 2.2]} scale={[111, 78, 1]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#241d32" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      {outerPlinthStones.map(([x, y, z, sx, sy, sz, color, rotationZ], index) => (
        <group key={`ancient-door-outer-plinth-${index}`} position={[x, y, z]} rotation={[0, 0, rotationZ]}>
          <ToonBox position={[0, 0, 0]} scale={[sx, sy, sz]} color={color} outline />
        </group>
      ))}
      {verticalSlabs.map(([x, y, z, sx, sy, sz, color], index) => (
        <ToonBox
          key={`ancient-door-vertical-slab-${index}`}
          position={[x, y, z]}
          scale={[sx, sy, sz]}
          color={color}
          outline
        />
      ))}
      {carvedInsetPanels.map(([x, y, z, sx, sy, sz, color], index) => (
        <ToonBox key={`ancient-door-carved-panel-${index}`} position={[x, y, z]} scale={[sx, sy, sz]} color={color} outline={false} />
      ))}
      {carvedPanelCaps.map(([x, y, z, sx, sy, sz, color], index) => (
        <ToonBox key={`ancient-door-carved-panel-cap-${index}`} position={[x, y, z]} scale={[sx, sy, sz]} color={color} outline={false} />
      ))}
      {seamStones.map(([x, y, z, sx, sy, sz, color], index) => (
        <ToonBox key={`ancient-door-center-seam-stone-${index}`} position={[x, y, z]} scale={[sx, sy, sz]} color={color} outline={index % 2 === 0} />
      ))}
      {hingeBosses.map(([x, y, z, color], index) => (
        <mesh key={`ancient-door-hinge-boss-${index}`} position={[x, y, z]} scale={[7, 7, 3.2]} rotation={[Math.PI / 2, 0, index * 0.18]}>
          <cylinderGeometry args={[1, 1, 1, 8]} />
          <meshToonMaterial color={color} />
        </mesh>
      ))}
      <ToonBox position={[0, 18, 21]} scale={[112, 3.2, 2.2]} color="#a19278" outline={false} />
      <ToonBox position={[0, 13, 21.4]} scale={[104, 2.4, 1.8]} color="#4c443b" outline={false} />
      <ToonBox position={[0, -30, 21]} scale={[108, 3, 2.2]} color="#8c806c" outline={false} />
      <ToonBox position={[0, -35, 21.4]} scale={[100, 2.2, 1.8]} color="#4b4138" outline={false} />
      <mesh position={[0, 7, 19.5]} scale={[43, 43, 1]} renderOrder={9}>
        <torusGeometry args={[1, 0.08, 8, 40]} />
        <meshBasicMaterial color={PALETTE.ink} transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, 7, 21]} scale={[23, 23, 1]}>
        <torusGeometry args={[1, 0.12, 8, 34]} />
        <meshBasicMaterial color="#ffe59c" transparent opacity={0.94} />
      </mesh>
      <mesh position={[0, 7, 21.8]} scale={[34, 34, 1]} rotation={[0, 0, 0.22]} renderOrder={10}>
        <torusGeometry args={[1, 0.035, 8, 40]} />
        <meshBasicMaterial color="#75fff0" transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, 7, 22.2]} scale={[29, 29, 1]} rotation={[0, 0, -0.28]} renderOrder={10}>
        <torusGeometry args={[1, 0.028, 8, 34]} />
        <meshBasicMaterial color={PALETTE.glowPurple} transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 7, 22]} scale={[14, 14, 14]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshBasicMaterial color="#75fff0" transparent opacity={0.86} />
      </mesh>
      <mesh position={[0, 7, 23]} scale={[30, 30, 1]}>
        <circleGeometry args={[0.5, 28]} />
        <meshBasicMaterial color={PALETTE.glowPurple} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <CaveRuneGlyph position={[0, 7, 24]} scale={0.44} color="#fff4a8" variant={2} />
      {doorFaceRunes.map(([x, y, z, scale, color, variant], index) => (
        <CaveRuneGlyph key={`ancient-door-face-rune-${index}`} position={[x, y, z]} scale={scale} color={color} variant={variant} />
      ))}
      {sealStuds.map(([x, y, color], index) => (
        <mesh key={`ancient-door-seal-stud-${index}`} position={[x, y, 18]} scale={[5.2, 5.2, 5.2]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.88} />
        </mesh>
      ))}
      {smallSealOrbs.map(([x, y, color], index) => (
        <mesh key={`ancient-door-small-seal-orb-${index}`} position={[x, y, 24]} scale={[3.2, 3.2, 3.2]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} />
        </mesh>
      ))}
      {cracks.map(([x, y, sx, sy, rotationZ], index) => (
        <mesh key={`ancient-door-crack-${index}`} position={[x, y, 19]} rotation={[0, 0, rotationZ]} scale={[sx, sy, 1]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={PALETTE.ink} transparent opacity={0.48} />
        </mesh>
      ))}
      {archFrameStones.map(([x, y, z, sx, sy, sz, color, rotationZ], index) => (
        <group key={`ancient-door-frame-stone-${index}`} position={[x, y, z]} rotation={[0, 0, rotationZ]}>
          <ToonBox position={[0, 0, 4]} scale={[sx, sy, sz]} color={color} outline />
        </group>
      ))}
      <GardenIronCurve points={[[-72, 68, 16], [-38, 98, 20], [4, 102, 19], [54, 74, 17]]} radius={1.35} color="#3d6b35" segments={28} />
      <GardenIronCurve points={[[72, 56, 17], [38, 76, 21], [8, 82, 20], [-48, 58, 18]]} radius={1.05} color="#254d2d" segments={28} />
      <GardenIronCurve points={[[-50, -67, 22], [-22, -77, 25], [18, -76, 25], [50, -66, 22]]} radius={1.05} color="#75fff0" segments={28} />
      <GardenIronCurve points={[[-62, -61, 20], [-28, -52, 22], [28, -52, 22], [62, -61, 20]]} radius={0.82} color="#b36dff" segments={28} />
      <pointLight position={[0, 12, 26]} color="#75fff0" intensity={0.4} distance={142} />
    </group>
  )
}

function getTerrainColor(height: number) {
  const low = new THREE.Color('#62b746')
  const mid = new THREE.Color(PALETTE.grass)
  const high = new THREE.Color(PALETTE.grassHigh)
  const crown = new THREE.Color('#286f34')
  const lowToMid = smootherstep01(height / 20)
  const midToHigh = smootherstep01((height - 16) / 44)
  const hillCrown = smootherstep01((height - 58) / 38)
  return low.lerp(mid, lowToMid).lerp(high, midToHigh).lerp(crown, hillCrown * 0.24)
}

function terrainTextureNoise(x: number, z: number) {
  return (
    Math.sin(x * 0.029 + z * 0.017) * 0.5 +
    Math.sin(x * -0.013 + z * 0.041 + 1.7) * 0.35 +
    Math.sin(x * 0.071 + z * -0.052 + 3.1) * 0.15
  )
}

function terrainFineNoise(x: number, z: number) {
  return (
    Math.sin(x * 0.19 + z * 0.08 + 0.7) * 0.46 +
    Math.sin(x * -0.11 + z * 0.15 + 2.6) * 0.34 +
    Math.sin(x * 0.31 + z * -0.24 + 5.2) * 0.2
  )
}

function terrainBrushNoise(x: number, z: number) {
  return (
    Math.sin(x * 0.006 + z * 0.014 + 1.1) * 0.38 +
    Math.sin(x * -0.009 + z * 0.005 + 3.4) * 0.32 +
    Math.sin(x * 0.018 + z * -0.012 + 0.4) * 0.3
  )
}

function terrainStrokeNoise(x: number, z: number) {
  return (
    Math.sin(x * 0.042 + z * 0.011 + 0.6) * 0.42 +
    Math.sin(x * 0.029 + z * -0.036 + 2.8) * 0.34 +
    Math.sin(x * -0.067 + z * 0.021 + 5.5) * 0.24
  )
}

const NORTHWEST_LAKE_WATER_HEIGHT = 5.35

function getRenderPathSample(points: PathPoint[], x: number, z: number) {
  let closest = Infinity
  let closestProgress = 0
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]
    const end = points[index + 1]
    const segmentX = end.x - start.x
    const segmentZ = end.z - start.z
    const lengthSq = segmentX * segmentX + segmentZ * segmentZ
    const t = lengthSq <= 0.0001 ? 0 : clamp(((x - start.x) * segmentX + (z - start.z) * segmentZ) / lengthSq, 0, 1)
    const centerX = start.x + segmentX * t
    const centerZ = start.z + segmentZ * t
    const radius = THREE.MathUtils.lerp(start.radius, end.radius, t)
    const distance = Math.hypot(x - centerX, z - centerZ) - radius
    if (distance < closest) {
      closest = distance
      closestProgress = (index + t) / Math.max(1, points.length - 1)
    }
  }
  return { distance: closest, progress: closestProgress }
}

function getPathWearColor(x: number, z: number, terrainHeight: number) {
  const baseColor = getTerrainColor(terrainHeight)
  const grassMottle = terrainTextureNoise(x, z)
  const fineGrass = terrainTextureNoise(x * 2.9 + 17, z * 2.3 - 8)
  const brush = terrainBrushNoise(x, z)
  const heightShade = smootherstep01(terrainHeight / 88)
  const ridgeShade = smootherstep01((terrainHeight - 18) / 46)
  const lawnGlow = smootherstep01((z + 120) / 460) * (1 - smootherstep01((terrainHeight - 30) / 30))
  const contourStripe = Math.max(0, terrainFineNoise(x * 0.2 + terrainHeight * 1.7, z * 0.26 - terrainHeight * 0.9))
  const longGrassStrokes = Math.max(0, terrainStrokeNoise(x, z) - 0.16)
  const broadCelBand = Math.max(0, terrainTextureNoise(x * 0.42 + terrainHeight * 0.9, z * 0.38 - terrainHeight * 0.6))
  const meadowWash = Math.max(0, -terrainBrushNoise(x * 0.46 - 12, z * 0.44 + 19))
  baseColor.lerp(new THREE.Color(PALETTE.grassDeep), Math.max(0, grassMottle) * 0.1 + ridgeShade * 0.13)
  baseColor.lerp(new THREE.Color('#7fca4e'), Math.max(0, -grassMottle) * 0.026 + lawnGlow * 0.016 + meadowWash * 0.026)
  baseColor.lerp(new THREE.Color('#3e9d3f'), Math.max(0, fineGrass) * 0.02)
  baseColor.lerp(new THREE.Color('#235f2e'), Math.max(0, brush) * 0.086 + contourStripe * ridgeShade * 0.11 + broadCelBand * ridgeShade * 0.07)
  baseColor.lerp(new THREE.Color('#184b28'), longGrassStrokes * (0.032 + ridgeShade * 0.07))
  baseColor.lerp(new THREE.Color('#1f542b'), heightShade * 0.1)

  const lakeDistance = signedDistanceToLake(x, z)
  const beachEdgeNoise = terrainTextureNoise(x * 0.53 + 17, z * 0.49 - 11) * 26 + terrainBrushNoise(x * 0.38 - 9, z * 0.41 + 6) * 20
  const beachReach = 188 + terrainBrushNoise(x * 0.24 + 31, z * 0.22 - 14) * 38
  const beachWear = lakeDistance > -18 ? 1 - smootherstep01((lakeDistance + beachEdgeNoise - 2) / beachReach) : 0
  if (beachWear > 0.01) {
    const wetEdge = 1 - smootherstep01((lakeDistance + beachEdgeNoise - 2) / 52)
    const drySand = smootherstep01((lakeDistance + beachEdgeNoise - 12) / 122)
    const sandFleck = Math.max(0, terrainFineNoise(x * 0.72 + 34, z * 0.66 - 29))
    const brushShadow = Math.max(0, terrainBrushNoise(x * 0.5 - 8, z * 0.46 + 17))
    const scallop = Math.max(0, terrainTextureNoise(x * 0.88 - 21, z * 0.78 + 15) - 0.1)
    const beachColor = new THREE.Color(PALETTE.beachWet)
      .lerp(new THREE.Color(PALETTE.beach), drySand)
      .lerp(new THREE.Color(PALETTE.beachLight), sandFleck * 0.12 + scallop * 0.07 + Math.max(0, -beachEdgeNoise / 60) * 0.08)
      .lerp(new THREE.Color(PALETTE.beachShadow), brushShadow * 0.11 + wetEdge * 0.16)
    const outsideStrength = lakeDistance > 0 ? 0.9 : 0.18
    baseColor.lerp(beachColor, clamp(beachWear * outsideStrength, 0, 0.94))
    baseColor.lerp(new THREE.Color('#8bcf56'), Math.max(0, beachWear - 0.68) * (1 - wetEdge) * 0.05)
    baseColor.lerp(new THREE.Color('#7a6137'), wetEdge * Math.max(0, 1 - drySand) * 0.06)
  }

  const mainSample = getRenderPathSample(MAIN_PATH_POINTS, x, z)
  const mainExtensionSample = getRenderPathSample(MAIN_PATH_EDGE_EXTENSION_POINTS, x, z)
  const caveSample = getRenderPathSample(CAVE_PATH_POINTS, x, z)
  const scenicSample = getRenderPathSample(SCENIC_PATH_POINTS, x, z)
  const edgeBreakup = terrainTextureNoise(x * 1.27 + 41, z * 1.11 - 23) * 20 + Math.sin(x * 0.047 + z * 0.033) * 8
  const candidates: Array<{
    id: string
    distance: number
    progress: number
    color: THREE.Color
    inner: number
    feather: number
    strength: number
  }> = [
    { id: 'main', distance: mainSample.distance, progress: mainSample.progress, color: new THREE.Color(PALETTE.path), inner: 2, feather: 68, strength: 0.9 },
    { id: 'main-extension', distance: mainExtensionSample.distance, progress: mainExtensionSample.progress, color: new THREE.Color(PALETTE.path), inner: 2, feather: 68, strength: 0.9 },
    { id: 'cave', distance: caveSample.distance, progress: caveSample.progress, color: new THREE.Color(PALETTE.hiddenPath), inner: 2, feather: 50, strength: 0.5 },
    { id: 'scenic', distance: scenicSample.distance, progress: scenicSample.progress, color: new THREE.Color(PALETTE.scenicPath), inner: 2, feather: 46, strength: 0.38 },
  ]
  const winner = candidates.reduce<{
    id: string
    distance: number
    progress: number
    color: THREE.Color
    inner: number
    feather: number
    strength: number
    wear: number
  }>((best, candidate) => {
    const wear = 1 - smootherstep01((candidate.distance + candidate.inner + edgeBreakup) / candidate.feather)
    return wear * candidate.strength > best.wear ? { ...candidate, wear: wear * candidate.strength } : best
  }, { ...candidates[0], wear: 0 })

  if (winner.wear > 0.01) {
    const centerWear = 1 - smootherstep01((winner.distance + edgeBreakup * 0.2 + 10) / (winner.id === 'main' ? 46 : 34))
    const shoulderWear = 1 - smootherstep01((winner.distance + edgeBreakup * 0.55 - 2) / (winner.id === 'main' ? 86 : 58))
    const edgeWear = Math.max(0, shoulderWear - centerWear * 0.68)
    const crispPathLip = 1 - smootherstep01(Math.abs(winner.distance + edgeBreakup * 0.18) / (winner.id === 'main' ? 10 : 7))
    const dirtNoise = terrainTextureNoise(x * 1.8 - 12, z * 1.65 + 9)
    const packedDirtNoise = terrainFineNoise(x * 0.8 + 40, z * 0.72 - 13)
    const stoneFleck = terrainTextureNoise(x * 4.8 + 63, z * 4.1 - 45)
    const pathColor = winner.color.clone()
    pathColor.lerp(new THREE.Color(PALETTE.pathShadow), centerWear * (winner.id === 'main' ? 0.26 : 0.16))
    pathColor.lerp(new THREE.Color(PALETTE.pathWarm), edgeWear * (winner.id === 'main' ? 0.24 : 0.16))
    pathColor.lerp(new THREE.Color('#8b6940'), Math.max(0, dirtNoise) * 0.2 + Math.max(0, packedDirtNoise) * 0.08)
    pathColor.lerp(new THREE.Color('#f5d98e'), Math.max(0, -dirtNoise) * 0.1)
    pathColor.lerp(new THREE.Color(PALETTE.pathEdge), crispPathLip * (winner.id === 'main' ? 0.2 : 0.12))
    if (winner.id === 'main' && stoneFleck > 0.62 && winner.wear > 0.22) {
      pathColor.lerp(new THREE.Color(PALETTE.pathDot), 0.075 * smootherstep01((stoneFleck - 0.62) / 0.38))
    }
    if (winner.id === 'main' && winner.progress > 0.58 && centerWear > 0.2) {
      const hillTread = 1 - smootherstep01(Math.abs(Math.sin(winner.progress * Math.PI * 42)) / 0.24)
      const formalFade = smootherstep01((winner.progress - 0.58) / 0.12) * smootherstep01((0.99 - winner.progress) / 0.08)
      pathColor.lerp(new THREE.Color(PALETTE.pathEdge), hillTread * formalFade * edgeWear * 0.018)
    }
    baseColor.lerp(pathColor, clamp(winner.wear * (0.82 + terrainTextureNoise(x * 0.83, z * 0.89) * 0.06), 0, 0.88))
  }

  return baseColor
}

function buildOvalPath(id: string, centerX: number, centerZ: number, radiusX: number, radiusZ: number, pointRadius: number, count = 28): PathPoint[] {
  const points: PathPoint[] = []
  const seed = id.length * 0.37
  for (let index = 0; index <= count; index += 1) {
    const angle = (index / count) * Math.PI * 2
    const wobble =
      1 +
      Math.sin(angle * 2.1 + seed) * 0.055 +
      Math.sin(angle * 3.7 + seed * 1.9) * 0.035 +
      Math.sin(angle * 5.3 + seed * 0.7) * 0.018
    const driftX = Math.sin(angle * 1.3 + seed * 2.2) * radiusX * 0.018
    const driftZ = Math.cos(angle * 1.6 + seed * 1.3) * radiusZ * 0.018
    points.push({
      id: `${id}-${index}`,
      x: centerX + Math.cos(angle) * radiusX * wobble + driftX,
      z: centerZ + Math.sin(angle) * radiusZ * wobble + driftZ,
      radius: pointRadius,
    })
  }
  return points
}

type BoundarySide = 'left' | 'right' | 'back' | 'front'

function buildBoundaryRidgePath(id: string, side: BoundarySide, inset: number, pointRadius: number, count = 32, startT = 0, endT = 1): PathPoint[] {
  const points: PathPoint[] = []
  const seed = id.length * 0.43 + inset * 0.017
  for (let index = 0; index <= count; index += 1) {
    const localT = index / count
    const t = THREE.MathUtils.lerp(startT, endT, localT)
    const wobble = Math.sin(t * Math.PI * 3.1 + seed) * 22 + Math.sin(t * Math.PI * 7.4 + seed * 1.7) * 9
    const radiusWobble = 1 + Math.sin(t * Math.PI * 4.9 + seed * 0.6) * 0.08

    if (side === 'left' || side === 'right') {
      const z = THREE.MathUtils.lerp(NATURAL_BOUNDARY.minZ + 70, NATURAL_BOUNDARY.maxZ - 64, t)
      const sideSign = side === 'left' ? 1 : -1
      points.push({
        id: `${id}-${index}`,
        x: (side === 'left' ? NATURAL_BOUNDARY.minX + inset : NATURAL_BOUNDARY.maxX - inset) + wobble * sideSign,
        z: z + Math.sin(t * Math.PI * 5.2 + seed) * 12,
        radius: pointRadius * radiusWobble,
      })
    } else {
      const x = THREE.MathUtils.lerp(NATURAL_BOUNDARY.minX + 82, NATURAL_BOUNDARY.maxX - 82, t)
      const sideSign = side === 'back' ? 1 : -1
      points.push({
        id: `${id}-${index}`,
        x: x + Math.cos(t * Math.PI * 4.6 + seed) * 12,
        z: (side === 'back' ? NATURAL_BOUNDARY.minZ + inset : NATURAL_BOUNDARY.maxZ - inset) + wobble * sideSign,
        radius: pointRadius * radiusWobble,
      })
    }
  }
  return points
}

const SOUTHEAST_TERRAIN_CONTOURS = [
  buildOvalPath('southeast-highland-outer', 675, 565, 390, 250, 4.8),
  buildOvalPath('southeast-highland-mid', 682, 568, 290, 182, 4.2),
  buildOvalPath('southeast-highland-cap', 672, 590, 168, 104, 3.5),
  buildOvalPath('southeast-ridge-shoulder', 815, 485, 210, 230, 3.6),
  buildOvalPath('east-triangle-hill-outer', 980, -120, 330, 270, 4.4),
  buildOvalPath('east-triangle-hill-mid', 972, -114, 238, 194, 3.9),
  buildOvalPath('east-triangle-hill-cap', 988, -126, 142, 112, 3.2),
]

const MUSEUM_HILL_CONTOURS = [
  buildOvalPath('museum-hill-base-shadow', 520, -370, 520, 180, 4.4),
  buildOvalPath('museum-hill-middle-shadow', 510, -462, 385, 138, 4.2),
  buildOvalPath('museum-hill-crown-shadow', 520, -560, 260, 92, 3.6),
]

const EDGE_MOUNTAIN_CONTOURS = [
  buildBoundaryRidgePath('east-boundary-foothill', 'right', 182, 7.6, 42),
  buildBoundaryRidgePath('east-boundary-crest', 'right', 76, 8.4, 42),
  buildBoundaryRidgePath('north-right-boundary-foothill', 'back', 174, 6.9, 28, 0.68, 1),
  buildBoundaryRidgePath('north-right-boundary-crest', 'back', 82, 7.8, 28, 0.7, 1),
  buildBoundaryRidgePath('south-boundary-foothill', 'front', 168, 7.2, 38, 0.02, 0.94),
  buildBoundaryRidgePath('south-boundary-crest', 'front', 82, 7.9, 38, 0.02, 0.94),
  buildBoundaryRidgePath('west-front-boundary-foothill', 'left', 164, 6.7, 24, 0.69, 1),
  buildBoundaryRidgePath('west-front-boundary-crest', 'left', 82, 7.4, 24, 0.7, 1),
]

function SolidTerrainGround() {
  const geometry = useMemo(() => {
    const xSteps = 244
    const zSteps = 208
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    const vertexIndex = (xIndex: number, zIndex: number) => zIndex * (xSteps + 1) + xIndex

    for (let zIndex = 0; zIndex <= zSteps; zIndex += 1) {
      const zT = zIndex / zSteps
      const z = THREE.MathUtils.lerp(TERRAIN_NEAR, TERRAIN_FAR, zT)
      for (let xIndex = 0; xIndex <= xSteps; xIndex += 1) {
        const xT = xIndex / xSteps
        const x = THREE.MathUtils.lerp(TERRAIN_LEFT, TERRAIN_RIGHT, xT)
        const terrainHeight = getTerrainHeight(x, z)
        const color = getPathWearColor(x, z, terrainHeight)
        positions.push(x, FLOOR_Y + terrainHeight + 0.05, z)
        colors.push(color.r, color.g, color.b)
      }
    }

    for (let zIndex = 0; zIndex < zSteps; zIndex += 1) {
      for (let xIndex = 0; xIndex < xSteps; xIndex += 1) {
        const a = vertexIndex(xIndex, zIndex)
        const b = vertexIndex(xIndex + 1, zIndex)
        const c = vertexIndex(xIndex, zIndex + 1)
        const d = vertexIndex(xIndex + 1, zIndex + 1)
        indices.push(a, c, b, b, c, d)
      }
    }

    const addSkirtVertex = (topIndex: number) => {
      const x = positions[topIndex * 3]
      const z = positions[topIndex * 3 + 2]
      const skirtIndex = positions.length / 3
      positions.push(x, TERRAIN_BASE_Y, z)
      colors.push(colors[topIndex * 3] * 0.72, colors[topIndex * 3 + 1] * 0.72, colors[topIndex * 3 + 2] * 0.72)
      return skirtIndex
    }

    for (let xIndex = 0; xIndex < xSteps; xIndex += 1) {
      const topA = vertexIndex(xIndex, 0)
      const topB = vertexIndex(xIndex + 1, 0)
      const bottomA = addSkirtVertex(topA)
      const bottomB = addSkirtVertex(topB)
      indices.push(topA, topB, bottomA, topB, bottomB, bottomA)

      const farA = vertexIndex(xIndex, zSteps)
      const farB = vertexIndex(xIndex + 1, zSteps)
      const farBottomA = addSkirtVertex(farA)
      const farBottomB = addSkirtVertex(farB)
      indices.push(farA, farBottomA, farB, farB, farBottomA, farBottomB)
    }

    for (let zIndex = 0; zIndex < zSteps; zIndex += 1) {
      const leftTopA = vertexIndex(0, zIndex)
      const leftTopB = vertexIndex(0, zIndex + 1)
      const leftBottomA = addSkirtVertex(leftTopA)
      const leftBottomB = addSkirtVertex(leftTopB)
      indices.push(leftTopA, leftBottomA, leftTopB, leftTopB, leftBottomA, leftBottomB)

      const rightTopA = vertexIndex(xSteps, zIndex)
      const rightTopB = vertexIndex(xSteps, zIndex + 1)
      const rightBottomA = addSkirtVertex(rightTopA)
      const rightBottomB = addSkirtVertex(rightTopB)
      indices.push(rightTopA, rightTopB, rightBottomA, rightTopB, rightBottomB, rightBottomA)
    }

    const hillGeometry = new THREE.BufferGeometry()
    hillGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    hillGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    hillGeometry.setIndex(indices)
    hillGeometry.computeVertexNormals()
    return hillGeometry
  }, [])

  return (
    <mesh geometry={geometry} renderOrder={-10}>
      <meshToonMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  )
}

function HillUndersideFill() {
  const geometry = useMemo(() => {
    const xSteps = 64
    const zSteps = 54
    const positions: number[] = []
    const indices: number[] = []
    const topVertexIndex = (xIndex: number, zIndex: number) => zIndex * (xSteps + 1) + xIndex

    for (let zIndex = 0; zIndex <= zSteps; zIndex += 1) {
      const z = THREE.MathUtils.lerp(HILL_FILL_NEAR, HILL_FILL_FAR, zIndex / zSteps)
      for (let xIndex = 0; xIndex <= xSteps; xIndex += 1) {
        const x = THREE.MathUtils.lerp(HILL_FILL_LEFT, HILL_FILL_RIGHT, xIndex / xSteps)
        positions.push(x, terrainY(x, z, -2.4), z)
      }
    }

    const addBaseVertex = (topIndex: number) => {
      const x = positions[topIndex * 3]
      const z = positions[topIndex * 3 + 2]
      const baseIndex = positions.length / 3
      positions.push(x, TERRAIN_BASE_Y + 2, z)
      return baseIndex
    }

    const addSide = (topA: number, topB: number) => {
      const baseA = addBaseVertex(topA)
      const baseB = addBaseVertex(topB)
      indices.push(topA, topB, baseA, topB, baseB, baseA)
    }

    for (let xIndex = 0; xIndex < xSteps; xIndex += 1) {
      addSide(topVertexIndex(xIndex, 0), topVertexIndex(xIndex + 1, 0))
      addSide(topVertexIndex(xIndex + 1, zSteps), topVertexIndex(xIndex, zSteps))
    }

    for (let zIndex = 0; zIndex < zSteps; zIndex += 1) {
      addSide(topVertexIndex(0, zIndex + 1), topVertexIndex(0, zIndex))
      addSide(topVertexIndex(xSteps, zIndex), topVertexIndex(xSteps, zIndex + 1))
    }

    const hillGeometry = new THREE.BufferGeometry()
    hillGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    hillGeometry.setIndex(indices)
    hillGeometry.computeVertexNormals()
    return hillGeometry
  }, [])

  return (
    <mesh geometry={geometry} renderOrder={-12}>
      <meshBasicMaterial color="#3f8b3d" side={THREE.DoubleSide} />
    </mesh>
  )
}

function getPathDistanceData(points: PathPoint[]) {
  const distances = [0]
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    distances.push(distances[index - 1] + Math.hypot(current.x - previous.x, current.z - previous.z))
  }
  return {
    distances,
    total: distances[distances.length - 1] || 1,
  }
}

function getPathWidthAt(points: PathPoint[], distances: number[], totalDistance: number, u: number, widthScale: number) {
  const targetDistance = totalDistance * u
  for (let index = 0; index < points.length - 1; index += 1) {
    const startDistance = distances[index]
    const endDistance = distances[index + 1]
    if (targetDistance <= endDistance || index === points.length - 2) {
      const t = (targetDistance - startDistance) / Math.max(0.001, endDistance - startDistance)
      return THREE.MathUtils.lerp(points[index].radius, points[index + 1].radius, clamp(t, 0, 1)) * 2 * widthScale
    }
  }
  return points[points.length - 1].radius * 2 * widthScale
}

function pathNoise(u: number, seed: number) {
  return Math.sin(u * Math.PI * 7.3 + seed) * 0.55 + Math.sin(u * Math.PI * 17.1 + seed * 1.71) * 0.28
}

function ContinuousTerrainPathMesh({
  points,
  color,
  widthScale,
  elevated,
  renderOrder,
  opacity = 1,
  polygonOffsetUnits = -1,
  organicAmount = 0,
  seed = 0,
}: {
  points: PathPoint[]
  color: string
  widthScale: number
  elevated: number
  renderOrder: number
  opacity?: number
  polygonOffsetUnits?: number
  organicAmount?: number
  seed?: number
}) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((point) => new THREE.Vector3(point.x, 0, point.z)),
      false,
      'centripetal',
      0.24,
    )
    const { distances, total } = getPathDistanceData(points)
    const steps = Math.max(36, points.length * 18)
    const positions: number[] = []
    const indices: number[] = []

    for (let index = 0; index <= steps; index += 1) {
      const u = index / steps
      const center = curve.getPointAt(u)
      const tangent = curve.getTangentAt(u)
      const tangentLength = Math.max(0.001, Math.hypot(tangent.x, tangent.z))
      const normalX = tangent.z / tangentLength
      const normalZ = -tangent.x / tangentLength
      const baseHalfWidth = getPathWidthAt(points, distances, total, u, widthScale) * 0.5
      const lateralDrift = pathNoise(u + 0.13, seed + 0.9) * organicAmount * baseHalfWidth * 0.08
      const leftWidth = baseHalfWidth * (1 + pathNoise(u + 0.02, seed + 1.7) * organicAmount * 0.11)
      const rightWidth = baseHalfWidth * (1 + pathNoise(u + 0.41, seed + 4.2) * organicAmount * 0.1)
      const centerX = center.x + normalX * lateralDrift
      const centerZ = center.z + normalZ * lateralDrift
      const leftX = centerX - normalX * leftWidth
      const leftZ = centerZ - normalZ * leftWidth
      const rightX = centerX + normalX * rightWidth
      const rightZ = centerZ + normalZ * rightWidth
      positions.push(leftX, terrainY(leftX, leftZ, PATH_Y - FLOOR_Y + elevated), leftZ)
      positions.push(rightX, terrainY(rightX, rightZ, PATH_Y - FLOOR_Y + elevated), rightZ)
    }

    for (let index = 0; index < steps; index += 1) {
      const a = index * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3
      indices.push(a, c, b, b, c, d)
    }

    const pathGeometry = new THREE.BufferGeometry()
    pathGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    pathGeometry.setIndex(indices)
    pathGeometry.computeVertexNormals()
    return pathGeometry
  }, [elevated, organicAmount, points, seed, widthScale])

  return (
    <mesh geometry={geometry} renderOrder={renderOrder}>
      <meshBasicMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={false}
        side={THREE.FrontSide}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={polygonOffsetUnits}
      />
    </mesh>
  )
}

function TerrainContourBands() {
  return (
    <group>
      {MUSEUM_HILL_CONTOURS.map((points, index) => (
        <ContinuousTerrainPathMesh
          key={points[0].id}
          points={points}
          color={index === 0 ? '#2a6b31' : index === 1 ? '#1e552b' : '#6dbe48'}
          widthScale={1}
          elevated={0.2 + index * 0.014}
          renderOrder={7 + index}
          opacity={index === 2 ? 0.12 : 0.135}
          polygonOffsetUnits={-8 - index}
          organicAmount={0.76}
          seed={index * 2.41 + 8.8}
        />
      ))}
      {SOUTHEAST_TERRAIN_CONTOURS.map((points, index) => (
        <ContinuousTerrainPathMesh
          key={points[0].id}
          points={points}
          color={index === 0 ? '#1f5f2d' : index === 1 ? '#2e8439' : '#78c64f'}
          widthScale={1}
          elevated={0.18 + index * 0.012}
          renderOrder={8 + index}
          opacity={index === 2 ? 0.18 : index > 3 ? 0.13 : 0.15}
          polygonOffsetUnits={-7 - index}
          organicAmount={1}
          seed={index * 3.17 + 2.4}
        />
      ))}
      {EDGE_MOUNTAIN_CONTOURS.map((points, index) => {
        const isCrest = index % 2 === 1
        return (
          <ContinuousTerrainPathMesh
            key={points[0].id}
            points={points}
            color={isCrest ? '#1d632e' : '#7fcb54'}
            widthScale={1}
            elevated={0.22 + index * 0.006}
            renderOrder={5 + index}
            opacity={isCrest ? 0.18 : 0.11}
            polygonOffsetUnits={-10 - index}
            organicAmount={0.92}
            seed={index * 2.83 + 12.1}
          />
        )
      })}
    </group>
  )
}

function TerrainInkHatching() {
  const { positions, colors } = useMemo(() => {
    const linePositions: number[] = []
    const lineColors: number[] = []
    const palettes = [
      new THREE.Color('#1b5d2c'),
      new THREE.Color('#2f8339'),
      new THREE.Color('#81cf54'),
      new THREE.Color('#7b5b36'),
    ]
    for (let index = 0; index < 240; index += 1) {
      const region = index % 4
      const x =
        region === 0
          ? -1040 + Math.sin(index * 5.71) * 470
          : region === 1
            ? 560 + Math.sin(index * 3.39) * 610
            : region === 2
              ? Math.sin(index * 8.13) * 1050
              : 180 + Math.sin(index * 6.21) * 520
      const z =
        region === 0
          ? -660 + Math.cos(index * 4.19) * 330
          : region === 1
            ? 130 + Math.cos(index * 5.27) * 610
            : region === 2
              ? 520 + Math.cos(index * 2.91) * 260
              : -370 + Math.cos(index * 7.61) * 280
      const terrainHeight = getTerrainHeight(x, z)
      const pathSample = Math.min(
        Math.abs(getRenderPathSample(MAIN_PATH_POINTS, x, z).distance),
        Math.abs(getRenderPathSample(MAIN_PATH_EDGE_EXTENSION_POINTS, x, z).distance),
        Math.abs(getRenderPathSample(CAVE_PATH_POINTS, x, z).distance),
        Math.abs(getRenderPathSample(SCENIC_PATH_POINTS, x, z).distance),
      )
      if (signedDistanceToLake(x, z) < 16 || pathSample < 22) continue

      const yaw = Math.sin(index * 1.93) * 0.85 + terrainHeight * 0.006
      const length = region === 3 ? 18 + Math.sin(index) * 4 : 10 + Math.sin(index * 1.7) * 5
      const dx = Math.sin(yaw) * length
      const dz = Math.cos(yaw) * length
      const y = terrainY(x, z, 0.28)
      const color = palettes[(index + (terrainHeight > 26 ? 1 : 0)) % palettes.length]
      linePositions.push(x - dx * 0.5, y, z - dz * 0.5, x + dx * 0.5, y, z + dz * 0.5)
      lineColors.push(color.r, color.g, color.b, color.r, color.g, color.b)
    }
    return { positions: linePositions, colors: lineColors }
  }, [])

  return (
    <lineSegments renderOrder={10}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(positions), 3]} />
        <bufferAttribute attach="attributes-color" args={[new Float32Array(colors), 3]} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.18} depthWrite={false} />
    </lineSegments>
  )
}

function PathInkLines() {
  const { positions, colors } = useMemo(() => {
    const linePositions: number[] = []
    const lineColors: number[] = []
    const edgeColor = new THREE.Color('#7a5a31')
    const treadColor = new THREE.Color('#f5d98e')
    const shadowColor = new THREE.Color('#76562f')

    const pushLine = (ax: number, az: number, bx: number, bz: number, color: THREE.Color, yOffset = 0.36) => {
      linePositions.push(ax, terrainY(ax, az, yOffset), az, bx, terrainY(bx, bz, yOffset), bz)
      lineColors.push(color.r, color.g, color.b, color.r, color.g, color.b)
    }

    const addInkForPath = (points: PathPoint[], count: number, treadStart: number, phaseOffset: number) => {
      const curve = new THREE.CatmullRomCurve3(
        points.map((point) => new THREE.Vector3(point.x, 0, point.z)),
        false,
        'centripetal',
        0.24
      )
      const { distances, total } = getPathDistanceData(points)

      for (let index = 0; index < count; index += 1) {
        const u = index / (count - 1)
        const nextU = Math.min(1, u + 0.008)
        const center = curve.getPointAt(u)
        const next = curve.getPointAt(nextU)
        const tangent = curve.getTangentAt(u)
        const tangentLength = Math.max(0.001, Math.hypot(tangent.x, tangent.z))
        const normalX = tangent.z / tangentLength
        const normalZ = -tangent.x / tangentLength
        const width = getPathWidthAt(points, distances, total, u, 1)
        const edgeNoise = Math.sin((index + phaseOffset) * 1.91) * 2.4 + Math.sin((index + phaseOffset) * 4.77) * 1.2
        const color = index % 7 === 0 ? shadowColor : edgeColor

        if (index % 2 === 0) {
          pushLine(
            center.x - normalX * (width * 0.55 + edgeNoise),
            center.z - normalZ * (width * 0.55 + edgeNoise),
            next.x - normalX * (width * 0.55 + edgeNoise * 0.7),
            next.z - normalZ * (width * 0.55 + edgeNoise * 0.7),
            color
          )
        }
        if (index % 3 === 0) {
          pushLine(
            center.x + normalX * (width * 0.55 - edgeNoise),
            center.z + normalZ * (width * 0.55 - edgeNoise),
            next.x + normalX * (width * 0.55 - edgeNoise * 0.7),
            next.z + normalZ * (width * 0.55 - edgeNoise * 0.7),
            color
          )
        }
        if (u > treadStart && index % 5 === 0) {
          const treadWidth = width * (0.34 + Math.sin((index + phaseOffset) * 0.8) * 0.03)
          pushLine(
            center.x - normalX * treadWidth,
            center.z - normalZ * treadWidth,
            center.x + normalX * treadWidth,
            center.z + normalZ * treadWidth,
            treadColor,
            0.38
          )
        }
      }
    }

    addInkForPath(MAIN_PATH_POINTS, 118, 0.58, 0)
    addInkForPath(MAIN_PATH_EDGE_EXTENSION_POINTS, 76, 0.18, 19)

    return { positions: linePositions, colors: lineColors }
  }, [])

  return (
    <lineSegments renderOrder={14}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(positions), 3]} />
        <bufferAttribute attach="attributes-color" args={[new Float32Array(colors), 3]} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.26} depthWrite={false} />
    </lineSegments>
  )
}

function LakeSurfaceMesh({
  points,
  center = NORTHWEST_LAKE_CENTER,
  scale = 1,
  yOffset = 0,
  color,
  opacity,
  renderOrder,
}: {
  points: PathPoint[]
  center?: { x: number; z: number }
  scale?: number
  yOffset?: number
  color: string
  opacity: number
  renderOrder: number
}) {
  const geometry = useMemo(() => {
    const baseVertices = points.slice(0, -1).map((point) => ({
      x: center.x + (point.x - center.x) * scale,
      z: center.z + (point.z - center.z) * scale,
    }))
    const vertices = baseVertices
    const positions: number[] = []
    const indices: number[] = []
    positions.push(center.x, FLOOR_Y + NORTHWEST_LAKE_WATER_HEIGHT + yOffset, center.z)

    vertices.forEach((vertex) => {
      positions.push(vertex.x, FLOOR_Y + NORTHWEST_LAKE_WATER_HEIGHT + yOffset, vertex.z)
    })

    vertices.forEach((_, index) => {
      const current = index + 1
      const next = index === vertices.length - 1 ? 1 : index + 2
      indices.push(0, current, next)
    })

    const lakeGeometry = new THREE.BufferGeometry()
    lakeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    lakeGeometry.setIndex(indices)
    lakeGeometry.computeVertexNormals()
    return lakeGeometry
  }, [center.x, center.z, points, scale, yOffset])

  return (
    <mesh geometry={geometry} renderOrder={renderOrder}>
      <meshBasicMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity >= 1}
        depthTest
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-2}
      />
    </mesh>
  )
}

function LakeOrganicPatchMesh({
  center,
  radiusX,
  radiusZ,
  yaw = 0,
  seed = 0,
  color,
  opacity,
  yOffset,
  renderOrder,
}: {
  center: [number, number]
  radiusX: number
  radiusZ: number
  yaw?: number
  seed?: number
  color: string
  opacity: number
  yOffset: number
  renderOrder: number
}) {
  const [centerX, centerZ] = center
  const geometry = useMemo(() => {
    const positions: number[] = [centerX, FLOOR_Y + NORTHWEST_LAKE_WATER_HEIGHT + yOffset, centerZ]
    const indices: number[] = []
    const steps = 28
    for (let index = 0; index < steps; index += 1) {
      const angle = (index / steps) * Math.PI * 2
      const wobble = 1 + Math.sin(angle * 2.3 + seed) * 0.09 + Math.sin(angle * 4.7 + seed * 1.4) * 0.045
      const localX = Math.cos(angle) * radiusX * wobble
      const localZ = Math.sin(angle) * radiusZ * wobble
      const x = centerX + Math.cos(yaw) * localX - Math.sin(yaw) * localZ
      const z = centerZ + Math.sin(yaw) * localX + Math.cos(yaw) * localZ
      positions.push(x, FLOOR_Y + NORTHWEST_LAKE_WATER_HEIGHT + yOffset, z)
    }
    for (let index = 0; index < steps; index += 1) {
      indices.push(0, index + 1, index === steps - 1 ? 1 : index + 2)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }, [centerX, centerZ, radiusX, radiusZ, seed, yaw, yOffset])

  return (
    <mesh geometry={geometry} renderOrder={renderOrder}>
      <meshBasicMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-4}
      />
    </mesh>
  )
}

function LakeRibbonMesh({
  start,
  control,
  end,
  width,
  color,
  opacity,
  yOffset,
  renderOrder,
  segments = 26,
}: {
  start: [number, number]
  control: [number, number]
  end: [number, number]
  width: number
  color: string
  opacity: number
  yOffset: number
  renderOrder: number
  segments?: number
}) {
  const [startX, startZ] = start
  const [controlX, controlZ] = control
  const [endX, endZ] = end
  const geometry = useMemo(() => {
    const samples: Array<{ x: number; z: number }> = []
    const sample = (t: number) => {
      const inv = 1 - t
      return {
        x: inv * inv * startX + 2 * inv * t * controlX + t * t * endX,
        z: inv * inv * startZ + 2 * inv * t * controlZ + t * t * endZ,
      }
    }

    for (let index = 0; index <= segments; index += 1) {
      samples.push(sample(index / segments))
    }

    const positions: number[] = []
    const indices: number[] = []
    const y = FLOOR_Y + NORTHWEST_LAKE_WATER_HEIGHT + yOffset

    samples.forEach((point, index) => {
      const previous = samples[Math.max(0, index - 1)]
      const next = samples[Math.min(samples.length - 1, index + 1)]
      const tangentX = next.x - previous.x
      const tangentZ = next.z - previous.z
      const tangentLength = Math.max(0.001, Math.hypot(tangentX, tangentZ))
      const normalX = tangentZ / tangentLength
      const normalZ = -tangentX / tangentLength
      const taper = Math.sin((index / segments) * Math.PI)
      const localWidth = width * (0.22 + taper * 0.78) * (1 + Math.sin(index * 1.7) * 0.06)
      positions.push(point.x - normalX * localWidth, y, point.z - normalZ * localWidth)
      positions.push(point.x + normalX * localWidth, y, point.z + normalZ * localWidth)
    })

    for (let index = 0; index < samples.length - 1; index += 1) {
      const a = index * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }

    const ribbonGeometry = new THREE.BufferGeometry()
    ribbonGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    ribbonGeometry.setIndex(indices)
    ribbonGeometry.computeVertexNormals()
    return ribbonGeometry
  }, [controlX, controlZ, endX, endZ, segments, startX, startZ, width, yOffset])

  return (
    <mesh geometry={geometry} renderOrder={renderOrder}>
      <meshBasicMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-6}
      />
    </mesh>
  )
}

function LakeWaterLinework() {
  const { positions, colors } = useMemo(() => {
    const linePositions: number[] = []
    const lineColors: number[] = []
    const waterY = FLOOR_Y + NORTHWEST_LAKE_WATER_HEIGHT + 0.78
    const midLine = new THREE.Color('#0f7e95')
    const brightLine = new THREE.Color('#c9f9ff')
    const paleLine = new THREE.Color('#75def0')

    const pushLine = (ax: number, az: number, bx: number, bz: number, color: THREE.Color) => {
      const midX = (ax + bx) * 0.5
      const midZ = (az + bz) * 0.5
      if (signedDistanceToLake(midX, midZ) > -8) return
      linePositions.push(ax, waterY, az, bx, waterY, bz)
      lineColors.push(color.r, color.g, color.b, color.r, color.g, color.b)
    }

    const pushCurve = (
      start: [number, number],
      control: [number, number],
      end: [number, number],
      color: THREE.Color,
      steps: number,
      skipEvery = 0,
    ) => {
      for (let index = 0; index < steps; index += 1) {
        if (skipEvery > 0 && index % skipEvery === 0) continue
        const t0 = index / steps
        const t1 = (index + 0.78) / steps
        const sample = (t: number) => {
          const inv = 1 - t
          return {
            x: inv * inv * start[0] + 2 * inv * t * control[0] + t * t * end[0],
            z: inv * inv * start[1] + 2 * inv * t * control[1] + t * t * end[1],
          }
        }
        const a = sample(t0)
        const b = sample(t1)
        pushLine(a.x, a.z, b.x, b.z, color)
      }
    }

    pushCurve([-1240, -920], [-1000, -970], [-718, -902], midLine, 14, 3)
    pushCurve([-1210, -760], [-890, -690], [-526, -776], midLine, 14, 3)
    pushCurve([-1118, -1212], [-892, -1292], [-646, -1154], paleLine, 13, 3)
    pushCurve([-1038, -608], [-812, -526], [-560, -594], brightLine, 12, 4)
    pushCurve([-1428, -760], [-1260, -700], [-1108, -724], paleLine, 10, 3)
    pushCurve([-840, -1010], [-700, -948], [-540, -936], brightLine, 9, 3)

    for (let index = 0; index < 42; index += 1) {
      const x = -1330 + Math.sin(index * 2.71) * 420 + Math.cos(index * 0.63) * 180
      const z = -912 + Math.cos(index * 1.91) * 330 + Math.sin(index * 0.57) * 150
      if (signedDistanceToLake(x, z) > -32) continue
      const yaw = Math.sin(index * 1.21) * 1.1
      const length = 18 + Math.sin(index * 1.93) * 7
      const dx = Math.sin(yaw) * length
      const dz = Math.cos(yaw) * length
      pushLine(x - dx * 0.5, z - dz * 0.5, x + dx * 0.5, z + dz * 0.5, index % 4 === 0 ? brightLine : paleLine)
    }

    return { positions: linePositions, colors: lineColors }
  }, [])

  return (
    <lineSegments renderOrder={41}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(positions), 3]} />
        <bufferAttribute attach="attributes-color" args={[new Float32Array(colors), 3]} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.2} depthWrite={false} />
    </lineSegments>
  )
}

function LakeCelShadePatches() {
  return (
    <group>
      <LakeSurfaceMesh points={NORTHWEST_LAKE_POINTS} scale={1} yOffset={0.08} color="#07556b" opacity={1} renderOrder={29} />
      <LakeSurfaceMesh points={NORTHWEST_LAKE_POINTS} scale={0.982} yOffset={0.14} color="#0b7890" opacity={0.86} renderOrder={30} />
      <LakeSurfaceMesh points={NORTHWEST_LAKE_POINTS} scale={0.9} yOffset={0.2} color="#139ab5" opacity={0.58} renderOrder={31} />
      <LakeSurfaceMesh points={NORTHWEST_LAKE_POINTS} scale={0.72} yOffset={0.28} color="#42c5da" opacity={0.28} renderOrder={32} />
      <LakeSurfaceMesh points={NORTHWEST_LAKE_POINTS} scale={0.48} yOffset={0.34} color="#a9f2f8" opacity={0.1} renderOrder={33} />
      <LakeOrganicPatchMesh
        center={[-1080, -1138]}
        radiusX={330}
        radiusZ={108}
        yaw={0.12}
        seed={1.2}
        color="#064f61"
        opacity={0.28}
        yOffset={0.42}
        renderOrder={34}
      />
      <LakeOrganicPatchMesh
        center={[-912, -820]}
        radiusX={386}
        radiusZ={108}
        yaw={0.04}
        seed={2.7}
        color="#1fb4c8"
        opacity={0.12}
        yOffset={0.48}
        renderOrder={35}
      />
      <LakeOrganicPatchMesh
        center={[-775, -565]}
        radiusX={214}
        radiusZ={52}
        yaw={0.1}
        seed={4.6}
        color="#8ceaf2"
        opacity={0.08}
        yOffset={0.54}
        renderOrder={36}
      />
      <LakeOrganicPatchMesh
        center={[-900, -1212]}
        radiusX={178}
        radiusZ={38}
        yaw={0.18}
        seed={6.3}
        color="#bbf7ff"
        opacity={0.08}
        yOffset={0.62}
        renderOrder={37}
      />
      <LakeRibbonMesh start={[-1354, -1008]} control={[-1116, -1094]} end={[-720, -1034]} width={24} color="#084c5c" opacity={0.24} yOffset={0.64} renderOrder={38} />
      <LakeRibbonMesh start={[-1314, -758]} control={[-948, -638]} end={[-526, -770]} width={24} color="#6de0ed" opacity={0.16} yOffset={0.68} renderOrder={39} />
      <LakeRibbonMesh start={[-1098, -1228]} control={[-844, -1306]} end={[-604, -1144]} width={18} color="#c4fbff" opacity={0.16} yOffset={0.72} renderOrder={40} />
      <LakeRibbonMesh start={[-996, -590]} control={[-792, -520]} end={[-550, -604]} width={15} color="#d8fdff" opacity={0.15} yOffset={0.76} renderOrder={40} segments={18} />
      <LakeRibbonMesh start={[-1412, -880]} control={[-1230, -790]} end={[-1008, -820]} width={12} color="#b9f7ff" opacity={0.14} yOffset={0.78} renderOrder={40} segments={18} />
      <LakeRibbonMesh start={[-1160, -690]} control={[-930, -605]} end={[-680, -690]} width={13} color="#d8fdff" opacity={0.12} yOffset={0.8} renderOrder={40} segments={18} />
      <LakeRibbonMesh start={[-1218, -1186]} control={[-1030, -1256]} end={[-840, -1188]} width={9} color="#e9feff" opacity={0.11} yOffset={0.82} renderOrder={40} segments={16} />
      <LakeWaterLinework />
    </group>
  )
}

function LakeBeachInkLines() {
  const { positions, colors } = useMemo(() => {
    const linePositions: number[] = []
    const lineColors: number[] = []
    const curve = new THREE.CatmullRomCurve3(
      NORTHWEST_LAKE_POINTS.map((point) => new THREE.Vector3(point.x, 0, point.z)),
      false,
      'centripetal',
      0.24,
    )
    const wetColor = new THREE.Color('#6f653f')
    const grainColor = new THREE.Color('#fff0ae')
    const shadowColor = new THREE.Color('#87693b')
    const waterLineColor = new THREE.Color('#105f77')

    const pushLine = (ax: number, az: number, bx: number, bz: number, color: THREE.Color, yOffset = 0.54) => {
      linePositions.push(ax, terrainY(ax, az, yOffset), az, bx, terrainY(bx, bz, yOffset), bz)
      lineColors.push(color.r, color.g, color.b, color.r, color.g, color.b)
    }

    for (let index = 0; index < 104; index += 1) {
      const u = index / 104
      const nextU = Math.min(1, u + 0.006)
      const center = curve.getPointAt(u)
      const next = curve.getPointAt(nextU)
      const tangent = curve.getTangentAt(u)
      const tangentLength = Math.max(0.001, Math.hypot(tangent.x, tangent.z))
      const tangentX = tangent.x / tangentLength
      const tangentZ = tangent.z / tangentLength
      const toEdgeX = center.x - NORTHWEST_LAKE_CENTER.x
      const toEdgeZ = center.z - NORTHWEST_LAKE_CENTER.z
      const toEdgeLength = Math.max(1, Math.hypot(toEdgeX, toEdgeZ))
      const outwardX = toEdgeX / toEdgeLength
      const outwardZ = toEdgeZ / toEdgeLength
      const nextOutX = next.x - NORTHWEST_LAKE_CENTER.x
      const nextOutZ = next.z - NORTHWEST_LAKE_CENTER.z
      const nextOutLength = Math.max(1, Math.hypot(nextOutX, nextOutZ))
      const nextOutwardX = nextOutX / nextOutLength
      const nextOutwardZ = nextOutZ / nextOutLength
      const wobble = Math.sin(index * 1.71) * 5.2 + Math.sin(index * 4.3) * 2.6

      if (index % 2 === 0) {
        pushLine(
          center.x + outwardX * (18 + wobble * 0.4),
          center.z + outwardZ * (18 + wobble * 0.4),
          next.x + nextOutwardX * (18 + wobble * 0.3),
          next.z + nextOutwardZ * (18 + wobble * 0.3),
          index % 8 === 0 ? waterLineColor : wetColor,
          0.62,
        )
      }

      if (index % 3 === 0) {
        const centerX = center.x + outwardX * (74 + wobble)
        const centerZ = center.z + outwardZ * (74 + wobble)
        const length = 16 + Math.sin(index * 0.9) * 7
        const sideWiggle = Math.sin(index * 2.12) * 8
        pushLine(
          centerX - tangentX * length * 0.5 + outwardX * sideWiggle,
          centerZ - tangentZ * length * 0.5 + outwardZ * sideWiggle,
          centerX + tangentX * length * 0.5 + outwardX * sideWiggle,
          centerZ + tangentZ * length * 0.5 + outwardZ * sideWiggle,
          index % 9 === 0 ? shadowColor : grainColor,
          0.5,
        )
      }
    }

    return { positions: linePositions, colors: lineColors }
  }, [])

  return (
    <lineSegments renderOrder={27}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(positions), 3]} />
        <bufferAttribute attach="attributes-color" args={[new Float32Array(colors), 3]} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.26} depthWrite={false} />
    </lineSegments>
  )
}

function LakeBeachOrganicDetails() {
  const details = useMemo(() => {
    const lakeCurve = new THREE.CatmullRomCurve3(
      NORTHWEST_LAKE_POINTS.map((point) => new THREE.Vector3(point.x, 0, point.z)),
      false,
      'centripetal',
      0.24,
    )
    const beachDetails: Array<{
      id: string
      kind: 'sandPatch' | 'wetPatch' | 'dune' | 'grass' | 'pebble' | 'foam'
      x: number
      z: number
      yaw: number
      scale: number
      width: number
      depth: number
      color: string
      opacity: number
    }> = []

    for (let index = 0; index < 58; index += 1) {
      const u = (index + 0.35 + Math.sin(index * 2.17) * 0.12) / 58
      const center = lakeCurve.getPointAt(u)
      const tangent = lakeCurve.getTangentAt(u)
      const tangentLength = Math.max(0.001, Math.hypot(tangent.x, tangent.z))
      const tangentX = tangent.x / tangentLength
      const tangentZ = tangent.z / tangentLength
      const toEdgeX = center.x - NORTHWEST_LAKE_CENTER.x
      const toEdgeZ = center.z - NORTHWEST_LAKE_CENTER.z
      const toEdgeLength = Math.max(1, Math.hypot(toEdgeX, toEdgeZ))
      const outwardX = toEdgeX / toEdgeLength
      const outwardZ = toEdgeZ / toEdgeLength
      const yaw = Math.atan2(tangentX, tangentZ) + Math.sin(index * 1.41) * 0.22
      const ripple = Math.sin(index * 1.89) * 1.8 + Math.sin(index * 4.33) * 0.9

      if (index % 2 === 0) {
        const offset = 62 + Math.sin(index * 1.31) * 30 + ripple * 9
        beachDetails.push({
          id: `beach-sand-patch-${index}`,
          kind: 'sandPatch',
          x: center.x + outwardX * offset + tangentX * Math.sin(index * 0.77) * 18,
          z: center.z + outwardZ * offset + tangentZ * Math.sin(index * 0.77) * 18,
          yaw,
          scale: 1,
          width: 56 + Math.sin(index * 0.93) * 18,
          depth: 18 + Math.cos(index * 1.27) * 7,
          color: index % 6 === 0 ? PALETTE.beachLight : PALETTE.beach,
          opacity: index % 6 === 0 ? 0.18 : 0.22,
        })
      }

      if (index % 5 === 1) {
        const offset = 118 + Math.sin(index * 1.72) * 38
        beachDetails.push({
          id: `beach-dune-${index}`,
          kind: 'dune',
          x: center.x + outwardX * offset - tangentX * Math.cos(index * 0.84) * 12,
          z: center.z + outwardZ * offset - tangentZ * Math.cos(index * 0.84) * 12,
          yaw: yaw + 0.12,
          scale: 0.76 + Math.sin(index * 2.31) * 0.12,
          width: 28 + Math.sin(index * 1.2) * 7,
          depth: 8 + Math.cos(index * 1.7) * 2.5,
          color: '#d6b866',
          opacity: 0.9,
        })
      }

      if (index % 4 === 2) {
        const offset = 142 + Math.sin(index * 2.04) * 40
        beachDetails.push({
          id: `beach-grass-${index}`,
          kind: 'grass',
          x: center.x + outwardX * offset + tangentX * Math.sin(index * 1.08) * 22,
          z: center.z + outwardZ * offset + tangentZ * Math.sin(index * 1.08) * 22,
          yaw: yaw + Math.PI * 0.5,
          scale: 0.62 + Math.sin(index * 1.9) * 0.16,
          width: 1,
          depth: 1,
          color: '#71994d',
          opacity: 1,
        })
      }

      if (index % 7 === 3) {
        const offset = 46 + Math.sin(index * 1.66) * 16
        beachDetails.push({
          id: `beach-pebble-${index}`,
          kind: 'pebble',
          x: center.x + outwardX * offset + tangentX * Math.sin(index * 1.49) * 20,
          z: center.z + outwardZ * offset + tangentZ * Math.sin(index * 1.49) * 20,
          yaw: yaw + Math.sin(index) * 0.5,
          scale: 0.76 + Math.sin(index * 2.13) * 0.14,
          width: 9 + Math.sin(index * 1.17) * 2.5,
          depth: 5.4 + Math.cos(index * 0.91) * 1.8,
          color: index % 14 === 3 ? '#bcb79b' : '#968d73',
          opacity: 1,
        })
      }

      if (index % 6 === 0) {
        const offset = 8 + Math.sin(index * 2.4) * 7
        beachDetails.push({
          id: `beach-wet-patch-${index}`,
          kind: 'wetPatch',
          x: center.x + outwardX * offset + tangentX * Math.sin(index * 0.91) * 18,
          z: center.z + outwardZ * offset + tangentZ * Math.sin(index * 0.91) * 18,
          yaw,
          scale: 1,
          width: 70 + Math.sin(index * 0.88) * 18,
          depth: 10 + Math.cos(index * 1.6) * 3,
          color: PALETTE.beachWet,
          opacity: 0.22,
        })
      }

      if (index % 11 === 4) {
        const offset = -10 + Math.sin(index * 1.28) * 6
        beachDetails.push({
          id: `beach-foam-${index}`,
          kind: 'foam',
          x: center.x + outwardX * offset + tangentX * Math.sin(index * 1.37) * 16,
          z: center.z + outwardZ * offset + tangentZ * Math.sin(index * 1.37) * 16,
          yaw,
          scale: 1,
          width: 62 + Math.sin(index * 1.3) * 14,
          depth: 6 + Math.cos(index * 1.5) * 2,
          color: '#d8fbff',
          opacity: 0.2,
        })
      }
    }

    return beachDetails.filter((detail) => detail.kind === 'foam' || signedDistanceToLake(detail.x, detail.z) > 4)
  }, [])

  return (
    <group>
      {details.map((detail) => {
        if (detail.kind === 'sandPatch' || detail.kind === 'wetPatch' || detail.kind === 'foam') {
          const yOffset = detail.kind === 'foam' ? 0.68 : detail.kind === 'wetPatch' ? 0.56 : 0.48
          return (
            <FlatOval
              key={detail.id}
              position={[detail.x, terrainY(detail.x, detail.z, yOffset), detail.z]}
              diameterX={Math.max(8, detail.width)}
              diameterZ={Math.max(4, detail.depth)}
              color={detail.color}
              opacity={detail.opacity}
              yaw={detail.yaw}
              segments={22}
              renderOrder={detail.kind === 'foam' ? 32 : detail.kind === 'wetPatch' ? 15 : 13}
            />
          )
        }

        if (detail.kind === 'dune') {
          return (
            <group key={detail.id} position={[detail.x, terrainY(detail.x, detail.z, 0.43), detail.z]} rotation={[0, detail.yaw, 0]} scale={[detail.scale, detail.scale, detail.scale]}>
              <FlatOval position={[0, 0.02, 0]} diameterX={detail.width * 2.25} diameterZ={detail.depth * 2.1} color="#a88944" opacity={0.1} yaw={0.02} renderOrder={12} />
              <FlatOval position={[4, 0.06, -1]} diameterX={detail.width * 1.54} diameterZ={detail.depth * 1.12} color={PALETTE.beachLight} opacity={0.16} yaw={0.08} renderOrder={14} />
              <FlatOval position={[-7, 0.08, 2]} diameterX={detail.width * 0.92} diameterZ={detail.depth * 0.72} color="#c6aa5b" opacity={0.12} yaw={-0.1} renderOrder={14} />
            </group>
          )
        }

        if (detail.kind === 'pebble') {
          return (
            <group key={detail.id} position={[detail.x, terrainY(detail.x, detail.z, 0.92), detail.z]} rotation={[0, detail.yaw, 0]} scale={[detail.scale, detail.scale, detail.scale]}>
              <FlatOval position={[0, -0.48, 0]} diameterX={detail.width * 3.6} diameterZ={detail.depth * 2.6} color={PALETTE.ink} opacity={0.1} yaw={0.08} renderOrder={12} />
              <ToonRock position={[0, 0.62, 0]} scale={[detail.width * 0.72, 1.6, detail.depth * 0.68]} color={detail.color} rotation={[0.03, 0.2, -0.04]} outlineScale={1.035} />
              <ToonRock position={[detail.width * 0.62, 0.5, -detail.depth * 0.44]} scale={[detail.width * 0.34, 1.05, detail.depth * 0.36]} color="#d4c89d" rotation={[0.1, -0.42, 0.06]} outlineScale={1.03} />
            </group>
          )
        }

        const blades = [-12, -5, 2, 9, 16] as const
        return (
          <group key={detail.id} position={[detail.x, terrainY(detail.x, detail.z, 0.36), detail.z]} rotation={[0, detail.yaw, 0]} scale={[detail.scale, detail.scale, detail.scale]}>
            <FlatOval position={[1, 0.04, 1]} diameterX={34} diameterZ={16} color="#45793d" opacity={0.16} yaw={0.1} renderOrder={12} />
            {blades.map((bladeX, bladeIndex) => (
              <ToonCone
                key={`${detail.id}-blade-${bladeX}`}
                position={[bladeX, 10 + bladeIndex * 0.8, Math.sin(bladeIndex) * 4]}
                rotation={[0.22 + bladeIndex * 0.04, bladeIndex * 0.62, bladeIndex % 2 === 0 ? -0.22 : 0.18]}
                scale={[4.5, 23 + (bladeIndex % 3) * 5, 4.5]}
                color={bladeIndex % 2 === 0 ? '#7faa52' : '#4f833f'}
                segments={5}
                outlineScale={1.035}
              />
            ))}
          </group>
        )
      })}
    </group>
  )
}

function BeachUmbrella({ position, yaw = 0 }: { position: [number, number, number]; yaw?: number }) {
  const stripeColors = ['#ffe885', '#ff7f8e', '#79ddff', '#fff1b2', '#ff9f68', '#8fe28c', '#ffd1e8', '#7ec8ff'] as const

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <FlatOval position={[2, 0.06, 2]} diameterX={76} diameterZ={52} color={PALETTE.ink} opacity={0.13} yaw={0.1} renderOrder={12} />
      <group rotation={[0, 0, -0.08]}>
        <ToonCylinder position={[0, 31, 0]} scale={[3.4, 62, 3.4]} color="#8a5a34" segments={8} />
        <ToonCylinder position={[0, 31.5, 0]} scale={[1.7, 60, 1.7]} color="#f3c274" outline={false} segments={8} />
      </group>
      <ToonCone position={[0, 61, 0]} scale={[94, 28, 94]} color="#ffe27e" segments={16} outlineScale={1.035} />
      <group position={[0, 51.2, 0]}>
        {stripeColors.map((color, index) => {
          const panelYaw = (index / stripeColors.length) * Math.PI * 2
          return (
            <group key={`beach-umbrella-panel-${color}`} rotation={[0, panelYaw, 0]}>
              <ToonBox position={[0, 0.2, 22]} scale={[7.8, 1.2, 44]} color={color} outline={false} opacity={0.9} />
            </group>
          )
        })}
      </group>
      {stripeColors.map((color, index) => {
        const angle = (index / stripeColors.length) * Math.PI * 2
        const x = Math.sin(angle) * 45
        const z = Math.cos(angle) * 45
        return <ToonBlob key={`beach-umbrella-fringe-${color}`} position={[x, 45, z]} scale={[5.5, 3.2, 5.5]} color={index % 2 === 0 ? '#fff3bc' : color} outlineScale={1.03} />
      })}
      <ToonBlob position={[0, 77, 0]} scale={[7, 6, 7]} color="#ff8193" outlineScale={1.04} />
    </group>
  )
}

function BeachLoungeChair({
  position,
  yaw = 0,
  accent = '#51b9c6',
  towel = '#ff8ba0',
  pillow = '#fff7c8',
}: {
  position: [number, number, number]
  yaw?: number
  accent?: string
  towel?: string
  pillow?: string
}) {
  const plankColor = '#fff1bd'
  const wood = '#b9773e'
  const darkWood = '#6b442b'

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <FlatOval position={[2, 0.05, 4]} diameterX={102} diameterZ={56} color={PALETTE.ink} opacity={0.14} yaw={0.02} renderOrder={12} />
      <ToonBox position={[10, 6.4, 13]} scale={[76, 5.2, 34]} color={wood} outline />
      <ToonBox position={[10, 10.3, 13]} scale={[66, 2.6, 26]} color={plankColor} outline={false} />
      <ToonBox position={[10, 13.5, 13]} scale={[70, 2.4, 28]} color={pillow} outline={false} />
      {[-28, -14, 0, 14, 28].map((x, index) => (
        <ToonBox key={`beach-chair-seat-slat-${x}`} position={[x + 10, 14.7, 13]} scale={[4.8, 1.4, 25]} color={index === 2 ? accent : index % 2 === 0 ? '#f8d98d' : '#ffe8a7'} outline={false} />
      ))}
      <ToonBox position={[10, 15.3, -2]} scale={[76, 2.8, 4.2]} color={darkWood} outline={false} />
      <ToonBox position={[10, 15.3, 29]} scale={[76, 2.8, 4.2]} color={darkWood} outline={false} />
      <group position={[-26, 25.5, -9]} rotation={[-0.58, 0, 0]}>
        <ToonBox position={[0, 0, 0]} scale={[44, 5.4, 42]} color="#d98951" outline />
        <ToonBox position={[0, 3.5, 0]} scale={[35, 2.1, 32]} color={plankColor} outline={false} />
        <ToonBox position={[-12, 5.7, 0]} scale={[4, 2, 34]} color={accent} outline={false} />
        <ToonBox position={[0, 5.72, 0]} scale={[4, 2, 34]} color={pillow} outline={false} />
        <ToonBox position={[12, 5.7, 0]} scale={[4, 2, 34]} color={towel} outline={false} />
        <ToonBlob position={[0, 9.8, 18]} scale={[13, 4, 7]} color={pillow} rotation={[0.04, 0.1, -0.08]} outlineScale={1.035} />
      </group>
      {[
        [-22, 3.8, 29],
        [40, 3.8, 29],
        [-24, 3.8, -2],
        [42, 3.8, -2],
      ].map(([x, y, z], index) => (
        <ToonCylinder key={`beach-chair-leg-${index}`} position={[x, y, z]} scale={[2.8, 7.6, 2.8]} color={darkWood} segments={7} />
      ))}
    </group>
  )
}

function BeachSideTable({ position, yaw = 0 }: { position: [number, number, number]; yaw?: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <FlatOval position={[0, 0.03, 0]} diameterX={44} diameterZ={34} color={PALETTE.ink} opacity={0.1} yaw={0.08} renderOrder={12} />
      <ToonCylinder position={[0, 10, 0]} scale={[8, 20, 8]} color="#b9773e" segments={10} />
      <ToonCylinder position={[0, 21.5, 0]} scale={[34, 4.8, 26]} color="#fff1bd" segments={12} />
      <ToonCylinder position={[0, 23.8, 0]} scale={[27, 1.8, 20]} color="#51b9c6" outline={false} segments={12} />
      <ToonBlob position={[-8, 27.4, 1]} scale={[4.2, 3.4, 4.2]} color="#ff8193" outlineScale={1.035} />
      <ToonCylinder position={[-8, 25.8, 1]} scale={[1.1, 4.2, 1.1]} color="#fff1bd" outline={false} segments={8} />
    </group>
  )
}

function BeachCabanaHut({ position, yaw = 0 }: { position: [number, number, number]; yaw?: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <FlatOval position={[0, 0.05, 5]} diameterX={104} diameterZ={82} color={PALETTE.ink} opacity={0.13} yaw={0.08} renderOrder={12} />
      <ToonBox position={[0, 24, 0]} scale={[64, 48, 48]} color="#f5d99f" outline />
      <ToonBox position={[0, 48.8, -1]} scale={[78, 12, 62]} color="#e8893f" outline />
      <ToonBox position={[0, 55.6, 2]} scale={[84, 2.4, 64]} color="#ffd18a" outline={false} />
      <ToonBox position={[0, 30, 24.4]} scale={[25, 34, 2.2]} color="#825333" outline={false} />
      <ToonBox position={[0, 49.8, 26]} scale={[70, 5.5, 3.2]} color="#201925" outline={false} />
      <ToonBox position={[-23, 29, 24.8]} scale={[15, 16, 2.4]} color="#7acbdd" outline={false} />
      <ToonBox position={[-23, 29, 26.2]} scale={[17, 2.3, 1.2]} color="#fff7cf" outline={false} />
      <ToonBox position={[-23, 29, 26.3]} scale={[2.3, 16, 1.2]} color="#fff7cf" outline={false} />
      <ToonBox position={[24, 29, 24.8]} scale={[15, 16, 2.4]} color="#ffabc1" outline={false} />
      <ToonBox position={[24, 29, 26.2]} scale={[17, 2.3, 1.2]} color="#fff7cf" outline={false} />
      <ToonBox position={[24, 29, 26.3]} scale={[2.3, 16, 1.2]} color="#fff7cf" outline={false} />
      {[-24, 0, 24].map((x, index) => (
        <ToonBox key={`beach-hut-front-board-${x}`} position={[x, 25, 25.7]} scale={[2.2, 36, 1.4]} color={index === 1 ? '#d39b64' : '#c68c58'} outline={false} opacity={0.72} />
      ))}
      <ToonBox position={[0, 8, 29]} scale={[76, 5.5, 12]} color="#b96f39" outline />
      <ToonBox position={[0, 12, 29]} scale={[66, 2, 8]} color="#ffd18a" outline={false} />
    </group>
  )
}

function BeachShellCluster({ position, yaw = 0 }: { position: [number, number, number]; yaw?: number }) {
  const shells = [
    [-8, 0.8, 2, '#fff3c2', 6.6, 2.2, 4.4],
    [4, 0.9, -1, '#ffd1cf', 5.4, 2, 3.8],
    [12, 0.72, 5, '#d5f6ff', 4.6, 1.7, 3.2],
  ] as const

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <FlatOval position={[2, -0.02, 2]} diameterX={34} diameterZ={16} color={PALETTE.ink} opacity={0.08} yaw={0.12} renderOrder={12} />
      {shells.map(([x, y, z, color, sx, sy, sz], index) => (
        <ToonBlob key={`beach-shell-${index}`} position={[x, y, z]} scale={[sx, sy, sz]} color={color} rotation={[0.08, index * 0.7, -0.05]} outlineScale={1.035} />
      ))}
    </group>
  )
}

function BeachsideRestNook() {
  const mainChair = BEACH_LOUNGE_CHAIRS[0]
  const sideChair = BEACH_LOUNGE_CHAIRS[1]
  const hutX = -350
  const hutZ = -238
  const umbrellaX = -426
  const umbrellaZ = -282
  const tableX = -455
  const tableZ = -303
  const shellsX = -402
  const shellsZ = -206

  return (
    <group>
      <FlatOval position={[-418, terrainY(-418, -250, 0.42), -250]} diameterX={250} diameterZ={132} color={PALETTE.beachLight} opacity={0.13} yaw={-0.32} renderOrder={14} segments={28} />
      <FlatOval position={[-446, terrainY(-446, -272, 0.46), -272]} diameterX={176} diameterZ={84} color="#cba253" opacity={0.12} yaw={-0.22} renderOrder={14} segments={24} />
      <FlatOval position={[-493, terrainY(-493, -282, 0.5), -282]} diameterX={170} diameterZ={92} color="#fff1bd" opacity={0.1} yaw={-0.34} renderOrder={15} segments={24} />
      <BeachCabanaHut position={[hutX, terrainY(hutX, hutZ, 0.36), hutZ]} yaw={-2.42} />
      <BeachUmbrella position={[umbrellaX, terrainY(umbrellaX, umbrellaZ, 0.36), umbrellaZ]} yaw={-2.14} />
      <BeachLoungeChair position={[mainChair.x, terrainY(mainChair.x, mainChair.z, 0.42), mainChair.z]} yaw={mainChair.yaw} />
      <BeachLoungeChair position={[sideChair.x, terrainY(sideChair.x, sideChair.z, 0.42), sideChair.z]} yaw={sideChair.yaw} accent="#ff8ba0" towel="#7edbe5" pillow="#fff6cf" />
      <BeachSideTable position={[tableX, terrainY(tableX, tableZ, 0.32), tableZ]} yaw={-2.06} />
      <BeachShellCluster position={[shellsX, terrainY(shellsX, shellsZ, 0.62), shellsZ]} yaw={-0.28} />
      {[-46, -20, 6, 32, 58].map((offset, index) => (
        <ToonBox
          key={`beach-nook-plank-${offset}`}
          position={[-494 + offset * 0.18, terrainY(-494 + offset * 0.18, -286 + offset * 0.08, 0.92), -286 + offset]}
          scale={[118 - index * 4, 1.35, 7.5]}
          color={index % 2 === 0 ? '#e7bb70' : '#f2cf87'}
          outline={false}
          opacity={0.54}
          yaw={-0.46}
        />
      ))}
      <ToonBox position={[-472, terrainY(-472, -222, 1.2), -222]} scale={[54, 2.4, 24]} color="#ffb4ca" outline={false} opacity={0.92} yaw={-0.35} />
      <ToonBox position={[-472, terrainY(-472, -222, 1.45), -222]} scale={[48, 1.2, 4]} color="#fff7c8" outline={false} opacity={0.9} yaw={-0.35} />
      <ToonBox position={[-472, terrainY(-472, -222, 1.5), -213]} scale={[48, 1.2, 3.2]} color="#7edbe5" outline={false} opacity={0.86} yaw={-0.35} />
    </group>
  )
}

function NorthwestLakeFeature() {
  const bankDetails = useMemo(() => {
    const details: Array<{
      id: string
      x: number
      z: number
      kind: 'reed' | 'stone' | 'lily'
      yaw: number
      scale: number
    }> = []
    const segmentCount = NORTHWEST_LAKE_POINTS.length - 1
    for (let index = 0; index < 64; index += 1) {
      const edgeIndex = index % segmentCount
      const start = NORTHWEST_LAKE_POINTS[edgeIndex]
      const end = NORTHWEST_LAKE_POINTS[edgeIndex + 1]
      const t = (Math.sin(index * 2.31) + 1) * 0.5
      const edgeX = THREE.MathUtils.lerp(start.x, end.x, t)
      const edgeZ = THREE.MathUtils.lerp(start.z, end.z, t)
      const outX = edgeX - NORTHWEST_LAKE_CENTER.x
      const outZ = edgeZ - NORTHWEST_LAKE_CENTER.z
      const outLength = Math.max(1, Math.hypot(outX, outZ))
      const outwardX = outX / outLength
      const outwardZ = outZ / outLength
      const kind = index % 11 === 0 ? 'lily' : index % 5 === 0 ? 'stone' : 'reed'
      const shoreOffset = kind === 'lily' ? -32 - Math.sin(index * 1.8) * 10 : 28 + Math.sin(index * 3.4) * 34
      const x = edgeX + outwardX * shoreOffset + Math.sin(index * 5.13) * 10
      const z = edgeZ + outwardZ * shoreOffset + Math.cos(index * 4.77) * 10
      details.push({
        id: `lake-bank-${index}`,
        x,
        z,
        kind,
        yaw: Math.sin(index * 1.87) * Math.PI,
        scale: 0.75 + Math.sin(index * 2.73) * 0.18,
      })
    }
    return details
  }, [])

  return (
    <group>
      <ContinuousTerrainPathMesh points={NORTHWEST_LAKE_POINTS} color={PALETTE.beachShadow} widthScale={8.9} elevated={0.18} renderOrder={8} opacity={0.12} polygonOffsetUnits={-10} organicAmount={0.98} seed={9.2} />
      <ContinuousTerrainPathMesh points={NORTHWEST_LAKE_POINTS} color={PALETTE.beach} widthScale={6.9} elevated={0.22} renderOrder={9} opacity={0.22} polygonOffsetUnits={-9} organicAmount={1.05} seed={12.4} />
      <ContinuousTerrainPathMesh points={NORTHWEST_LAKE_POINTS} color={PALETTE.beachLight} widthScale={4.2} elevated={0.26} renderOrder={10} opacity={0.14} polygonOffsetUnits={-8} organicAmount={1.08} seed={4.7} />
      <ContinuousTerrainPathMesh points={NORTHWEST_LAKE_POINTS} color={PALETTE.beachWet} widthScale={2.15} elevated={0.3} renderOrder={11} opacity={0.34} polygonOffsetUnits={-7} organicAmount={0.78} seed={15.8} />
      <LakeBeachOrganicDetails />
      <LakeBeachInkLines />
      <LakeCelShadePatches />
      <BeachsideRestNook />
      {bankDetails.map((detail) => {
        const y = terrainY(detail.x, detail.z, 0.35)
        if (detail.kind === 'stone') {
          return null
        }
        if (detail.kind === 'lily') {
          return (
            <FlatOval
              key={detail.id}
              position={[detail.x, FLOOR_Y + NORTHWEST_LAKE_WATER_HEIGHT + 0.42, detail.z]}
              diameterX={12 * detail.scale}
              diameterZ={6.5 * detail.scale}
              color="#6fa763"
              opacity={0.52}
              yaw={detail.yaw}
              segments={18}
              renderOrder={36}
            />
          )
        }
        return (
          <group key={detail.id} position={[detail.x, y, detail.z]} rotation={[0, detail.yaw, 0]} scale={[detail.scale, detail.scale, detail.scale]}>
            <ToonCylinder position={[-2, 2.1, 0]} scale={[1.2, 4.2, 1.2]} color="#6b8d55" outline={false} segments={8} yaw={0.08} />
            <ToonCylinder position={[2, 1.65, 1.5]} scale={[1, 3.3, 1]} color="#8ca95b" outline={false} segments={8} yaw={-0.12} />
          </group>
        )
      })}
    </group>
  )
}

function SurfaceBlock({ surface }: { surface: LevelSurface }) {
  const baseY = terrainY(surface.x, surface.z)
  const isStep = surface.kind === 'step'
  const isCaveLanding = surface.kind === 'cave' && surface.id !== 'glowbud-cave-site'

  if (surface.id === 'glowbud-cave-site') {
    return (
      <group position={[surface.x, baseY + surface.height + 0.04, surface.z]} rotation={[0, surface.yaw ?? 0, 0]}>
        <FlatOval position={[0, 0.06, 0]} diameterX={surface.halfX * 2.32} diameterZ={surface.halfZ * 2.34} color="#2d4e2f" opacity={0.18} yaw={0.02} renderOrder={12} />
        <FlatOval position={[-18, 0.1, 10]} diameterX={surface.halfX * 1.82} diameterZ={surface.halfZ * 1.66} color={PALETTE.caveMoss} opacity={0.28} yaw={-0.08} renderOrder={13} />
        <FlatOval position={[12, 0.16, -8]} diameterX={surface.halfX * 1.28} diameterZ={surface.halfZ * 1.08} color="#9b927c" opacity={0.32} yaw={0.08} renderOrder={14} />
        <FlatOval position={[0, 0.22, 38]} diameterX={surface.halfX * 1.04} diameterZ={surface.halfZ * 0.42} color="#39342e" opacity={0.2} yaw={0.02} renderOrder={15} />
      </group>
    )
  }

  if (surface.shape === 'circle') {
    return (
      <group position={[surface.x, baseY, surface.z]} rotation={[0, surface.yaw ?? 0, 0]}>
        <ToonCylinder position={[0, surface.height * 0.5, 0]} scale={[surface.halfX * 2, surface.height, surface.halfZ * 2]} color={surface.color} outline={false} segments={32} />
        <ToonCylinder position={[0, surface.height + 0.045, 0]} scale={[surface.halfX * 1.9, 0.09, surface.halfZ * 1.9]} color={surface.topColor} outline={false} segments={32} />
      </group>
    )
  }

  return (
    <group position={[surface.x, baseY, surface.z]} rotation={[0, surface.yaw ?? 0, 0]}>
      {isStep ? (
        <ToonBox
          position={[0, surface.height * 0.5 - 0.018, 0]}
          scale={[surface.halfX * 2.025, Math.max(0.12, surface.height + 0.03), surface.halfZ * 2.08]}
          color={PALETTE.ink}
          outline={false}
          opacity={0.82}
        />
      ) : null}
      <ToonBox position={[0, surface.height * 0.5, 0]} scale={[surface.halfX * 2, Math.max(0.08, surface.height), surface.halfZ * 2]} color={surface.color} outline={isCaveLanding} />
      <ToonBox position={[0, surface.height + 0.045, 0]} scale={[surface.halfX * (isStep ? 1.9 : isCaveLanding ? 1.68 : 1.92), 0.09, surface.halfZ * (isStep ? 1.82 : isCaveLanding ? 1.52 : 1.92)]} color={surface.topColor} outline={false} />
      {isCaveLanding ? (
        <>
          <ToonBox position={[surface.halfX * -0.28, surface.height + 0.102, 0]} scale={[surface.halfX * 0.24, 0.025, surface.halfZ * 1.02]} color="#4d463e" outline={false} opacity={0.24} yaw={0.08} />
          <ToonBox position={[surface.halfX * 0.3, surface.height + 0.104, surface.halfZ * -0.04]} scale={[surface.halfX * 0.2, 0.025, surface.halfZ * 0.92]} color="#d2c29d" outline={false} opacity={0.2} yaw={-0.08} />
        </>
      ) : null}
    </group>
  )
}

function GlowbudCaveEntrance() {
  const caveX = GLOWBUD_CAVE_CENTER_X
  const caveZ = GLOWBUD_CAVE_CENTER_Z
  const caveYaw = GLOWBUD_CAVE_YAW
  const baseY = terrainY(caveX, caveZ)
  const rearMountainRocks = [
    [-430, 42, -42, 142, 96, 126, '#6f7268', -0.08, 0.38, -0.08],
    [-362, 96, -158, 194, 138, 154, '#565c53', 0.04, 0.2, 0.08],
    [-220, 144, -244, 214, 166, 168, '#676a60', -0.08, -0.1, -0.06],
    [-46, 188, -310, 244, 194, 178, '#464d45', 0.12, 0.06, 0.06],
    [164, 168, -278, 238, 176, 172, '#5e6259', -0.1, -0.16, -0.08],
    [342, 106, -176, 206, 144, 154, '#73756b', 0.08, -0.28, 0.08],
    [440, 48, -42, 150, 100, 132, '#5b6158', 0.03, -0.44, 0.06],
    [-502, 24, 88, 110, 64, 90, '#858278', -0.03, 0.52, -0.08],
    [500, 28, 84, 116, 70, 96, '#7d7c73', 0.04, -0.54, 0.07],
    [-312, 232, -364, 134, 82, 108, '#3f473f', 0.12, 0.22, 0.06],
    [38, 282, -402, 180, 92, 122, '#52584f', -0.06, -0.08, -0.04],
    [300, 232, -340, 142, 82, 112, '#414940', 0.08, -0.24, 0.08],
  ] as const
  const entranceArchRocks = [
    [-186, 34, 136, 74, 84, 50, '#777a70', 0.1, -0.18, -0.1],
    [188, 36, 136, 78, 88, 52, '#858278', -0.06, 0.2, 0.1],
    [-146, 102, 108, 70, 58, 38, '#8d897d', 0.14, 0.08, 0.06],
    [148, 104, 108, 74, 60, 40, '#76786f', -0.1, -0.1, -0.06],
    [-76, 150, 94, 82, 46, 34, '#9a927f', 0.06, 0.22, 0.02],
    [78, 152, 94, 86, 48, 36, '#787b71', -0.06, -0.24, -0.04],
    [0, 188, 82, 118, 52, 38, '#a49a84', 0.05, 0.28, 0.02],
    [-238, 24, 154, 58, 40, 40, '#676c64', -0.04, 0.34, -0.03],
    [238, 26, 154, 62, 42, 42, '#6f736a', 0.06, -0.32, 0.04],
    [0, 126, 112, 56, 28, 22, '#c1b89d', 0.08, 0.04, 0.02],
  ] as const
  const sideButtressRocks = [
    [-300, 54, 146, 88, 96, 72, '#6c7067', -0.08, 0.28, -0.06],
    [-366, 84, 82, 104, 112, 92, '#535951', 0.08, 0.18, 0.05],
    [-392, 72, 10, 118, 92, 106, '#818077', -0.04, -0.08, -0.08],
    [300, 56, 146, 92, 98, 74, '#777a70', 0.08, -0.3, 0.06],
    [370, 86, 82, 108, 114, 96, '#5b6057', -0.08, -0.18, -0.05],
    [394, 74, 8, 122, 94, 108, '#8b887d', 0.04, 0.1, 0.08],
  ] as const
  const mossShelves = [
    [-220, 104, 72, 84, 12, 34],
    [212, 108, 70, 86, 12, 34],
    [-86, 174, 24, 116, 14, 38],
    [96, 176, 18, 112, 14, 38],
    [-292, 164, -146, 132, 16, 46],
    [-36, 248, -236, 156, 18, 50],
    [248, 168, -144, 126, 16, 44],
    [-472, 84, -18, 92, 12, 36],
    [460, 86, -24, 96, 12, 38],
  ] as const
  const runeTablets = [
    [-198, 36, 170, 34, 46, 10, '#675e56', '#75fff0', -0.18, 0],
    [198, 37, 170, 36, 48, 10, '#766a5d', '#b36dff', 0.16, 1],
    [-78, 118, 132, 24, 30, 8, '#827866', '#f3ff93', -0.08, 2],
    [78, 120, 132, 24, 30, 8, '#70685b', '#75fff0', 0.08, 3],
  ] as const
  const hangingRoots = [
    [-70, 92, 134, 3.8, 42, 3.8, '#2f462b'],
    [-28, 104, 130, 3.2, 30, 3.2, '#435b32'],
    [34, 104, 130, 3.4, 34, 3.4, '#2f462b'],
    [76, 90, 134, 3.4, 38, 3.4, '#435b32'],
  ] as const
  const crystalAccents = [
    [-88, 16, 164, 9, 22, 9, '#67ffe2'],
    [90, 16, 164, 8, 19, 8, PALETTE.glowPurple],
    [8, 13, 176, 6, 15, 6, '#f3ff93'],
    [-206, 12, 140, 6, 14, 6, '#75fff0'],
    [214, 12, 142, 6, 14, 6, '#b36dff'],
  ] as const
  const sealMarkerStones = [
    [-178, 44, 210, 22, 82, 22, '#6e675f', '#75fff0', -0.12, 0],
    [178, 44, 210, 22, 82, 22, '#7d7466', PALETTE.glowPurple, 0.12, 1],
    [-232, 24, 248, 24, 44, 20, '#948975', '#fff4a8', 0.18, 2],
    [232, 24, 248, 24, 44, 20, '#6f685f', '#75fff0', -0.18, 0],
  ] as const

  return (
    <group position={[caveX, baseY + 0.72, caveZ]} rotation={[0, caveYaw, 0]}>
      <FlatOval position={[-18, 0.1, -64]} diameterX={650} diameterZ={372} color={PALETTE.ink} opacity={0.14} yaw={-0.08} renderOrder={-2} />
      <FlatOval position={[-4, 0.15, -24]} diameterX={500} diameterZ={282} color="#244527" opacity={0.1} yaw={-0.08} renderOrder={-1} />
      <FlatOval position={[0, 0.22, 190]} diameterX={206} diameterZ={112} color={PALETTE.ink} opacity={0.08} yaw={0.02} renderOrder={-1} />

      <FlatOval position={[0, 0.28, 292]} diameterX={260} diameterZ={126} color="#75fff0" opacity={0.08} yaw={0.02} renderOrder={16} />
      <FlatOval position={[0, 0.34, 292]} diameterX={214} diameterZ={92} color={PALETTE.ink} opacity={0.07} yaw={0.02} renderOrder={17} />
      <GardenIronCurve points={[[-120, 1.35, 262], [-54, 1.45, 290], [0, 1.5, 300], [54, 1.45, 290], [120, 1.35, 262]]} radius={0.46} color="#405b38" segments={38} />
      <GardenIronCurve points={[[-96, 1.55, 252], [-36, 1.6, 272], [36, 1.6, 272], [96, 1.55, 252]]} radius={0.34} color="#5d4f64" segments={32} />

      <ToonRock position={[-44, 28, -180]} scale={[444, 54, 118]} color="#4a5048" rotation={[0.02, -0.08, 0.02]} outlineScale={1.018} />
      <ToonRock position={[-76, 64, -238]} scale={[372, 46, 92]} color="#5f665b" rotation={[-0.02, 0.08, -0.02]} outlineScale={1.018} />
      <ToonRock position={[-22, 104, -292]} scale={[308, 38, 76]} color="#414941" rotation={[0.02, -0.04, 0.01]} outlineScale={1.018} />
      <ToonRock position={[0, 10, -70]} scale={[540, 20, 252]} color="#4d554c" rotation={[0, 0.02, 0]} outlineScale={1.012} />

      {rearMountainRocks.map(([x, y, z, sx, sy, sz, color, rx, ry, rz], index) => (
        <ToonRock
          key={`glowbud-mountain-mass-${index}`}
          position={[x, y, z]}
          scale={[sx, sy, sz]}
          color={color}
          rotation={[rx, ry, rz]}
          outlineScale={1.025}
        />
      ))}

      {sideButtressRocks.map(([x, y, z, sx, sy, sz, color, rx, ry, rz], index) => (
        <ToonRock
          key={`glowbud-side-buttress-rock-${index}`}
          position={[x, y, z]}
          scale={[sx, sy, sz]}
          color={color}
          rotation={[rx, ry, rz]}
          outlineScale={1.03}
        />
      ))}

      {entranceArchRocks.map(([x, y, z, sx, sy, sz, color, rx, ry, rz], index) => (
        <ToonRock
          key={`glowbud-portal-arch-stone-${index}`}
          position={[x, y, z]}
          scale={[sx, sy, sz]}
          color={color}
          rotation={[rx, ry, rz]}
          outlineScale={1.035}
        />
      ))}

      <ToonRock position={[-116, 56, 72]} scale={[84, 100, 56]} color="#60645d" rotation={[0.08, -0.32, -0.08]} outlineScale={1.032} />
      <ToonRock position={[118, 58, 72]} scale={[90, 104, 58]} color="#6a6d64" rotation={[-0.08, 0.32, 0.08]} outlineScale={1.032} />
      <ToonRock position={[-58, 128, 58]} scale={[98, 68, 50]} color="#555b52" rotation={[0.1, 0.18, 0.08]} outlineScale={1.032} />
      <ToonRock position={[60, 132, 56]} scale={[102, 70, 52]} color="#5e625a" rotation={[-0.1, -0.22, -0.08]} outlineScale={1.032} />
      <ToonRock position={[0, 176, 64]} scale={[94, 36, 38]} color="#c4b99c" rotation={[0.04, 0.1, 0.02]} outlineScale={1.036} />

      <GardenIronCurve points={[[-212, 170, 82], [-156, 136, 126], [-220, 78, 166]]} radius={2.2} color="#2d4a29" segments={24} />
      <GardenIronCurve points={[[214, 172, 82], [152, 136, 126], [218, 80, 166]]} radius={2.2} color="#2f522b" segments={24} />
      <GardenIronCurve points={[[-104, 174, 82], [-28, 196, 74], [92, 174, 82]]} radius={2.5} color="#75fff0" segments={28} />
      <GardenIronCurve points={[[-96, 156, 96], [-18, 174, 88], [94, 156, 96]]} radius={1.6} color="#b36dff" segments={26} />

      <mesh position={[0, 64, 188]} scale={[204, 146, 1]} renderOrder={2}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial color={PALETTE.ink} transparent opacity={0.88} />
      </mesh>
      <mesh position={[0, 36, 188]} scale={[148, 76, 1]} renderOrder={2}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={PALETTE.ink} transparent opacity={0.88} />
      </mesh>
      <AncientSealedCaveDoor />
      <mesh position={[0, 12, 202]} scale={[138, 34, 1]} renderOrder={3}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={PALETTE.ink} transparent opacity={0.52} />
      </mesh>
      <pointLight position={[0, 64, 214]} color="#75fff0" intensity={0.26} distance={230} />
      <pointLight position={[16, 46, 216]} color={PALETTE.glowPurple} intensity={0.2} distance={180} />

      {runeTablets.map(([x, y, z, sx, sy, sz, stoneColor, runeColor, yaw, variant], index) => (
        <group key={`glowbud-rune-tablet-${index}`} position={[x, y, z]} rotation={[0, yaw, 0]}>
          <ToonBox position={[0, 0, 0]} scale={[sx, sy, sz]} color={stoneColor} outline />
          <CaveRuneGlyph position={[0, 2, sz * 0.58]} scale={0.72} color={runeColor} variant={variant} />
        </group>
      ))}

      {hangingRoots.map(([x, y, z, sx, sy, sz, color], index) => (
        <ToonCylinder key={`glowbud-hanging-root-${index}`} position={[x, y, z]} scale={[sx, sy, sz]} color={color} outline={false} segments={7} yaw={index * 0.37} />
      ))}

      {mossShelves.map(([x, y, z, sx, sy, sz], index) => (
        <mesh key={`cave-moss-cap-${index}`} position={[x, y, z]} rotation={[-0.12, index * 0.8, 0.04]} scale={[sx, sy, sz]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshToonMaterial color={PALETTE.caveMoss} />
        </mesh>
      ))}

      {crystalAccents.map(([x, y, z, sx, sy, sz, color], index) => (
        <group key={`glowbud-cave-crystal-${index}`} position={[x as number, y as number, z as number]} rotation={[0, index * 0.65, 0]}>
          <mesh scale={[sx as number, sy as number, sz as number]}>
            <coneGeometry args={[0.5, 1, 5]} />
            <meshBasicMaterial color={color as string} transparent opacity={0.78} />
          </mesh>
          <pointLight color={color as string} intensity={0.35} distance={92} />
        </group>
      ))}
      {sealMarkerStones.map(([x, y, z, sx, sy, sz, stoneColor, runeColor, yaw, variant], index) => (
        <group key={`glowbud-seal-marker-stone-${index}`} position={[x, y, z]} rotation={[0, yaw, 0]}>
          <ToonRock position={[0, 0, 0]} scale={[sx, sy, sz]} color={stoneColor} rotation={[0.03, 0, index % 2 === 0 ? -0.04 : 0.04]} outlineScale={1.03} />
          <CaveRuneGlyph position={[0, 3, sz * 0.62]} scale={0.58} color={runeColor} variant={variant} />
        </group>
      ))}
    </group>
  )
}

function GardenIronCurve({
  points,
  radius = 0.9,
  color = '#14101d',
  segments = 30,
}: {
  points: [number, number, number][]
  radius?: number
  color?: string
  segments?: number
}) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        points.map((point) => new THREE.Vector3(point[0], point[1], point[2])),
        false,
        'centripetal',
        0.38,
      ),
    [points],
  )

  return (
    <mesh>
      <tubeGeometry args={[curve, segments, radius, 8, false]} />
      <meshToonMaterial color={color} />
    </mesh>
  )
}

function GardenLeaf({
  position,
  scale,
  rotation = [0, 0, 0],
  color = '#5f9f3a',
  outline = true,
  renderOrder = 0,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  rotation?: [number, number, number]
  color?: string
  outline?: boolean
  renderOrder?: number
}) {
  return (
    <group position={position} rotation={rotation} scale={scale} renderOrder={renderOrder}>
      {outline ? (
        <mesh position={[0, 0, -0.035]} scale={[1.08, 1.08, 1]}>
          <circleGeometry args={[1, 14]} />
          <meshBasicMaterial
            color={PALETTE.ink}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
      ) : null}
      <mesh position={[0, 0, 0.035]} scale={[0.92, 0.72, 1]}>
        <circleGeometry args={[1, 14]} />
        <meshBasicMaterial
          color={color}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </group>
  )
}

function GardenFlower({
  position,
  scale = 1,
  petalColor = '#f6b0d7',
  centerColor = '#fff2a6',
}: {
  position: [number, number, number]
  scale?: number
  petalColor?: string
  centerColor?: string
}) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = (index / 5) * Math.PI * 2
        return (
          <mesh key={`garden-flower-petal-${index}`} position={[Math.cos(angle) * 1.25, Math.sin(angle) * 1.25, 0]} scale={[1.05, 0.72, 1]} rotation={[0, 0, angle]}>
            <circleGeometry args={[1, 12]} />
            <meshBasicMaterial color={petalColor} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
      <mesh position={[0, 0, 0.04]} scale={[0.72, 0.72, 1]}>
        <circleGeometry args={[1, 12]} />
        <meshBasicMaterial color={centerColor} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function GardenGateSignText() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 248
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const drawTrackedText = (text: string, x: number, y: number, tracking: number) => {
        const widths = [...text].map((char) => ctx.measureText(char).width)
        const totalWidth = widths.reduce((sum, width) => sum + width, 0) + tracking * (text.length - 1)
        let cursor = x - totalWidth * 0.5

        ;[true, false].forEach((stroke) => {
          cursor = x - totalWidth * 0.5
          ;[...text].forEach((char, index) => {
            const charX = cursor + widths[index] * 0.5
            if (stroke) {
              ctx.strokeText(char, charX, y)
            } else {
              ctx.fillText(char, charX, y)
            }
            cursor += widths[index] + tracking
          })
        })
      }

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineJoin = 'round'
      ctx.shadowColor = 'rgba(48, 29, 15, 0.28)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 5

      ctx.font = 'italic 700 48px Georgia, Times New Roman, serif'
      ctx.lineWidth = 7
      ctx.strokeStyle = '#fff4c8'
      ctx.fillStyle = '#49752f'
      ctx.strokeText('The', canvas.width / 2, 83)
      ctx.fillText('The', canvas.width / 2, 83)

      ctx.shadowBlur = 10
      ctx.shadowOffsetY = 6
      ctx.font = '800 118px Georgia, Times New Roman, serif'
      ctx.lineWidth = 10
      ctx.strokeStyle = '#fff0b6'
      ctx.fillStyle = '#684022'
      drawTrackedText('GROVE', canvas.width / 2, 158, 8)

      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
      ctx.globalAlpha = 0.55
      ctx.strokeStyle = '#d5a857'
      ctx.lineWidth = 4
      drawTrackedText('GROVE', canvas.width / 2, 158, 8)
      ctx.globalAlpha = 1

      ctx.strokeStyle = '#8a5d31'
      ctx.lineWidth = 7
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(116, 216)
      ctx.bezierCurveTo(238, 252, 380, 248, 452, 206)
      ctx.moveTo(572, 206)
      ctx.bezierCurveTo(644, 248, 786, 252, 908, 216)
      ctx.stroke()

      ctx.strokeStyle = '#365f2f'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(188, 61)
      ctx.bezierCurveTo(282, 28, 368, 35, 436, 64)
      ctx.moveTo(588, 64)
      ctx.bezierCurveTo(656, 35, 742, 28, 836, 61)
      ctx.stroke()

      ctx.fillStyle = '#78aa4b'
      ;[
        [180, 64, 19, 10, -0.45],
        [224, 51, 15, 8, 0.28],
        [314, 45, 13, 7, -0.2],
        [710, 45, 13, 7, 0.2],
        [800, 51, 15, 8, -0.28],
        [844, 64, 19, 10, 0.45],
        [334, 225, 13, 7, 0.46],
        [690, 225, 13, 7, -0.46],
      ].forEach(([x, y, rx, ry, rotation]) => {
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(rotation)
        ctx.beginPath()
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })
    }

    const signTexture = new THREE.CanvasTexture(canvas)
    signTexture.colorSpace = THREE.SRGBColorSpace
    signTexture.anisotropy = 4
    signTexture.needsUpdate = true
    return signTexture
  }, [])

  return (
    <group>
      <mesh position={[0, 55.4, 5.42]} scale={[63, 15.2, 1]} renderOrder={9}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>
      <mesh position={[0, 55.4, -5.42]} rotation={[0, Math.PI, 0]} scale={[63, 15.2, 1]} renderOrder={9}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>
    </group>
  )
}

function GardenVines() {
  const leafColor = '#6eb54a'
  const leafDark = '#3f7c35'
  const leafLight = '#9ccc62'
  const vineColor = '#2f6f31'

  return (
    <group>
      <GardenIronCurve points={[[-48, 8, 8], [-51, 18, 8.6], [-40, 29, 8.9], [-47, 42, 8.4], [-35, 55, 7.6]]} radius={0.75} color={vineColor} segments={38} />
      <GardenIronCurve points={[[47, 8, 8], [50, 20, 8.5], [39, 31, 8.8], [47, 43, 8.2], [35, 55, 7.5]]} radius={0.75} color={vineColor} segments={38} />
      <GardenIronCurve points={[[-42, 58.6, 3.8], [-20, 63.2, 5.2], [8, 60.5, 5.4], [28, 63.4, 4.7], [48, 59.2, 3.9]]} radius={0.82} color={vineColor} segments={42} />
      <GardenIronCurve points={[[-58, 52.5, 5.4], [-38, 69, 6.6], [-12, 71.5, 7.2], [0, 67, 7.7], [12, 71.5, 7.2], [38, 69, 6.6], [58, 52.5, 5.4]]} radius={0.7} color={vineColor} segments={58} />
      <GardenIronCurve points={[[-29, 26.5, 11], [-17, 36.8, 11.4], [0, 40.5, 11.8], [17, 36.8, 11.4], [29, 26.5, 11]]} radius={0.66} color={vineColor} segments={42} />
      <GardenIronCurve points={[[-62, 21, 8.8], [-78, 24, 9.1], [-87, 20, 8.7], [-96, 26, 8.9]]} radius={0.62} color={vineColor} segments={26} />
      <GardenIronCurve points={[[62, 21, 8.8], [78, 24, 9.1], [87, 20, 8.7], [96, 26, 8.9]]} radius={0.62} color={vineColor} segments={26} />

      {[
        [-50, 15, 9.7, -0.35, leafColor],
        [-42, 27, 10, 0.45, leafDark],
        [-47, 39, 9.8, -0.18, leafColor],
        [-35, 51, 9.1, 0.32, leafDark],
        [50, 17, 9.6, 0.3, leafColor],
        [39, 30, 9.8, -0.42, leafDark],
        [47, 42, 9.4, 0.2, leafColor],
        [36, 53, 8.8, -0.34, leafDark],
        [-28, 61.8, 6.2, 0.72, leafColor],
        [-7, 61.4, 6.4, -0.54, leafDark],
        [17, 62.6, 6.1, 0.4, leafColor],
        [39, 60.4, 5.3, -0.25, leafDark],
        [-22, 32.8, 12.1, 0.22, leafColor],
        [-8, 39.1, 12.6, -0.38, leafDark],
        [9, 39.0, 12.6, 0.36, leafColor],
        [23, 32.6, 12.1, -0.24, leafDark],
        [-18, 21.2, 11.8, -0.1, leafColor],
        [18, 21.4, 11.8, 0.12, leafColor],
        [-76, 23, 10, -0.5, leafColor],
        [77, 23, 10, 0.5, leafColor],
        [-51, 58.4, 6.8, -0.5, leafLight],
        [52, 58.2, 6.7, 0.48, leafLight],
        [-34, 67.2, 7.4, 0.24, leafColor],
        [35, 67.0, 7.4, -0.24, leafColor],
        [-5, 68.0, 8.0, -0.18, leafLight],
        [5, 68.0, 8.0, 0.18, leafLight],
      ].map(([x, y, z, roll, color], index) => (
        <GardenLeaf
          key={`garden-gate-leaf-${index}`}
          position={[x as number, y as number, (z as number) + 0.48]}
          rotation={[0.15, 0, roll as number]}
          scale={[2.15, 1.12, 1]}
          color={color as string}
          outline={false}
          renderOrder={5}
        />
      ))}

      <GardenFlower position={[-21, 61.8, 6.9]} scale={1.05} petalColor="#eaa0d8" />
      <GardenFlower position={[22, 62.6, 6.4]} scale={0.9} petalColor="#fff2ad" centerColor="#ef7da8" />
      <GardenFlower position={[-46, 35, 10.4]} scale={0.75} petalColor="#b5f1ff" />
      <GardenFlower position={[45, 38, 10.2]} scale={0.78} petalColor="#ffb68c" />
      <GardenFlower position={[-13, 38.6, 12.8]} scale={0.76} petalColor="#f5a9d8" />
      <GardenFlower position={[13, 38.2, 12.8]} scale={0.7} petalColor="#fff2ad" centerColor="#82d66c" />
      <GardenFlower position={[-43, 65.2, 8.2]} scale={0.78} petalColor="#ffe7a0" centerColor="#ef7da8" />
      <GardenFlower position={[42, 65.4, 8.1]} scale={0.74} petalColor="#c7f2ff" centerColor="#fff2ad" />
      <GardenFlower position={[0, 67.2, 8.7]} scale={0.68} petalColor="#e7b0ff" centerColor="#fff2ad" />
    </group>
  )
}

function WroughtGardenGatePanel() {
  const metalColor = '#12101a'
  const highlightColor = '#2c2534'

  return (
    <group>
      <ToonBox position={[0, 9.2, 8.4]} scale={[68, 2.2, 2.4]} color={metalColor} outline={false} />
      <GardenIronCurve points={[[-34, 10, 8.5], [-23, 27, 8.8], [0, 35.5, 9.2], [23, 27, 8.8], [34, 10, 8.5]]} radius={1.18} color={metalColor} segments={48} />
      <GardenIronCurve points={[[-29, 10, 8.8], [-20, 22, 9.1], [-10, 30, 9.1], [-6, 33, 9]]} radius={0.82} color={metalColor} segments={30} />
      <GardenIronCurve points={[[29, 10, 8.8], [20, 22, 9.1], [10, 30, 9.1], [6, 33, 9]]} radius={0.82} color={metalColor} segments={30} />
      {[-22, -11, 0, 11, 22].map((x, index) => (
        <GardenIronCurve
          key={`arched-garden-bar-${x}`}
          points={[
            [x, 8.6, 9.3],
            [x * 0.92, 17.5 + Math.abs(index - 2) * 0.9, 9.4],
            [x * 0.72, 26 + (2 - Math.abs(index - 2)) * 2.2, 9.4],
            [x * 0.34, 32 - Math.abs(index - 2) * 2.2, 9.2],
          ]}
          radius={0.72}
          color={metalColor}
          segments={28}
        />
      ))}
      <GardenIronCurve points={[[-25, 12, 10.4], [-10, 17, 10.8], [-22, 23, 10.6], [-6, 29, 10.7]]} radius={0.62} color={highlightColor} segments={34} />
      <GardenIronCurve points={[[25, 12, 10.4], [10, 17, 10.8], [22, 23, 10.6], [6, 29, 10.7]]} radius={0.62} color={highlightColor} segments={34} />
      <GardenIronCurve points={[[-7, 17.5, 10.9], [-2.5, 22, 11], [2.5, 22, 11], [7, 17.5, 10.9]]} radius={0.58} color={highlightColor} segments={28} />
      <GardenIronCurve points={[[-34, 14, 10.8], [-45, 19, 10.9], [-36, 25, 10.8], [-48, 28, 10.6]]} radius={0.48} color={highlightColor} segments={30} />
      <GardenIronCurve points={[[34, 14, 10.8], [45, 19, 10.9], [36, 25, 10.8], [48, 28, 10.6]]} radius={0.48} color={highlightColor} segments={30} />
      <GardenIronCurve points={[[-37, 9.8, 10.5], [-24, 6, 10.8], [-14, 9.8, 10.7], [-4, 7.2, 10.8], [0, 10.2, 10.9], [4, 7.2, 10.8], [14, 9.8, 10.7], [24, 6, 10.8], [37, 9.8, 10.5]]} radius={0.44} color={highlightColor} segments={48} />
      <GardenFlower position={[0, 23.3, 11.6]} scale={0.66} petalColor="#d7f8c8" centerColor="#fff2ad" />
    </group>
  )
}

function GardenEntryGate() {
  const gateX = GROVE_GATE_X
  const gateZ = GROVE_GATE_Z
  const y = terrainY(gateX, gateZ)
  const yaw = GROVE_GATE_YAW
  const brickColor = '#986840'
  const brickTop = '#efc878'
  const stoneCream = '#fff1bc'
  const metalColor = '#15111d'
  const goldTrim = '#d8a33e'

  return (
    <group position={[gateX, y, gateZ]} rotation={[0, yaw, 0]}>
      <ToonBox position={[0, 0.85, -1]} scale={[136, 1.7, 27]} color="#6f4d31" outline />
      <ToonBox position={[0, 2.2, -1]} scale={[124, 1.6, 20]} color="#e0a86a" outline={false} />
      {[-42, 42].map((x) => (
        <group key={`garden-gate-pillar-${x}`} position={[x, 0, 0]}>
          <ToonBox position={[0, 9.8, 0]} scale={[22, 19.6, 19.5]} color={brickColor} outline />
          <ToonBox position={[0, 21.4, 0]} scale={[28, 5.6, 23.5]} color={brickTop} outline />
          <ToonBox position={[0, 24.9, 0]} scale={[22, 1.5, 18]} color={stoneCream} outline={false} />
          <ToonBox position={[0, 17.6, 9.4]} scale={[16, 1.3, 1.1]} color="#7e4d35" outline={false} />
          <ToonBox position={[-3.5, 10.4, 9.5]} scale={[7, 1.1, 1]} color="#7e4d35" outline={false} />
          <ToonBox position={[4.5, 5.5, 9.55]} scale={[8, 1, 1]} color="#e7b985" outline={false} />
          <ToonCylinder position={[0, 36, 0]} scale={[6.4, 26, 6.4]} color={metalColor} segments={8} />
          <mesh position={[0, 50, 0]} scale={[8, 8, 8]}>
            <coneGeometry args={[0.5, 1, 8]} />
            <meshBasicMaterial color={PALETTE.ink} />
          </mesh>
          <ToonCylinder position={[0, 49.6, 0]} scale={[5.7, 2.1, 5.7]} color={goldTrim} segments={8} />
          <ToonBlob position={[x < 0 ? -8 : 8, 3.2, 9]} scale={[7.5, 1.7, 4.2]} color="#4f8c36" outlineScale={1.02} />
        </group>
      ))}
      <WroughtGardenGatePanel />
      {[-1, 1].map((side) => (
        <group key={`entry-gate-side-return-${side}`} position={[side * 70, 11, 7]} rotation={[0, side * 0.28, 0]}>
          <ToonBox position={[0, -8.4, 0]} scale={[54, 3.2, 9]} color={brickColor} outline />
          <ToonBox position={[0, -5.8, 0]} scale={[48, 1.6, 6]} color={brickTop} outline={false} />
          <GardenIronCurve points={[[-24, 4.4, -0.4], [-14, 15, -0.2], [0, 19, -0.2], [14, 15, -0.2], [24, 4.4, -0.4]]} radius={0.82} color={metalColor} segments={36} />
          <ToonBox position={[0, 7, -0.4]} scale={[48, 1.8, 1.7]} color={metalColor} outline={false} />
          {[-16, 0, 16].map((barX) => (
            <GardenIronCurve
              key={`entry-gate-side-bar-${side}-${barX}`}
              points={[
                [barX, -3.2, -0.3],
                [barX * 0.9, 6, -0.15],
                [barX * 0.55, 14, -0.12],
                [barX * 0.22, 18, -0.18],
              ]}
              radius={0.58}
              color={metalColor}
              segments={24}
            />
          ))}
        </group>
      ))}
      {[-58, 58].map((x) => (
        <group key={`grove-gate-planter-${x}`} position={[x, 0, 11]}>
          <ToonCylinder position={[0, 4.4, 0]} scale={[7.4, 8.8, 7.4]} color="#d8a466" outline segments={8} />
          <ToonBlob position={[0, 10.5, 0]} scale={[9.8, 4.2, 7]} color="#5f9f3a" outlineScale={1.025} />
          <GardenFlower position={[-2.7, 14.2, 4.4]} scale={0.72} petalColor="#ffeaa0" centerColor="#ef7da8" />
          <GardenFlower position={[2.4, 13.4, 4.8]} scale={0.62} petalColor="#d5f5ff" centerColor="#fff2ad" />
          <GardenLeaf position={[0.3, 13.0, 4.2]} rotation={[0.1, 0, x < 0 ? 0.45 : -0.45]} scale={[2.2, 1.2, 1]} color="#86c95a" />
        </group>
      ))}
      <ToonBox position={[0, 54.0, -0.3]} scale={[82, 10.6, 6.2]} color="#8b5d35" outline />
      <ToonBox position={[0, 54.7, 2.95]} scale={[70, 7.5, 1.2]} color={stoneCream} outline={false} />
      <ToonBox position={[0, 54.7, 4.05]} scale={[62, 5.7, 0.8]} color="#fff8cf" outline={false} />
      <ToonBox position={[0, 54.7, -3.55]} scale={[70, 7.5, 1.2]} color={stoneCream} outline={false} />
      <ToonBox position={[0, 54.7, -4.65]} scale={[62, 5.7, 0.8]} color="#fff8cf" outline={false} />
      <GardenGateSignText />
      <ToonBox position={[0, 60.9, -0.3]} scale={[92, 2.6, 7.4]} color={PALETTE.ink} outline={false} />
      <ToonBox position={[0, 62.9, 0.1]} scale={[74, 2.2, 5.5]} color={goldTrim} outline={false} />
      <GardenIronCurve points={[[-39, 62.2, 4.8], [-23, 70.5, 5.4], [0, 66.2, 5.8], [23, 70.5, 5.4], [39, 62.2, 4.8]]} radius={0.72} color={metalColor} segments={52} />
      <GardenIronCurve points={[[-20, 62.2, 6.2], [-11, 68.4, 6.7], [-2, 63.8, 6.9]]} radius={0.48} color={metalColor} segments={28} />
      <GardenIronCurve points={[[20, 62.2, 6.2], [11, 68.4, 6.7], [2, 63.8, 6.9]]} radius={0.48} color={metalColor} segments={28} />
      <ToonBlob position={[0, 66.8, 5.8]} scale={[3.8, 3.8, 1.4]} color={goldTrim} outlineScale={1.035} />
      <GardenVines />
    </group>
  )
}

function TrainBallastStrip({
  width,
  color,
  opacity,
  yOffset,
  zOffset = 0,
}: {
  width: number
  color: string
  opacity: number
  yOffset: number
  zOffset?: number
}) {
  const geometry = useMemo(() => {
    const steps = 40
    const positions: number[] = []
    const indices: number[] = []
    const startX = TERRAIN_LEFT - 70
    const endX = TERRAIN_RIGHT + 70

    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps
      const x = THREE.MathUtils.lerp(startX, endX, t)
      const ripple = Math.sin(t * Math.PI * 7.2) * 4 + Math.sin(t * Math.PI * 15.1 + 0.6) * 2.2
      const frontZ = TRAIN_TRACK_Z + zOffset - width * 0.5 + ripple
      const backZ = TRAIN_TRACK_Z + zOffset + width * 0.5 + ripple * 0.55
      positions.push(x, terrainY(x, frontZ, yOffset), frontZ, x, terrainY(x, backZ, yOffset), backZ)
    }

    for (let index = 0; index < steps; index += 1) {
      const a = index * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3
      indices.push(a, c, b, b, c, d)
    }

    const ballastGeometry = new THREE.BufferGeometry()
    ballastGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    ballastGeometry.setIndex(indices)
    ballastGeometry.computeVertexNormals()
    return ballastGeometry
  }, [width, yOffset, zOffset])

  return (
    <mesh geometry={geometry} renderOrder={17}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-4}
      />
    </mesh>
  )
}

function TrainRailRibbon({
  zOffset,
  width,
  yOffset,
  color,
  opacity = 1,
  renderOrder = 21,
}: {
  zOffset: number
  width: number
  yOffset: number
  color: string
  opacity?: number
  renderOrder?: number
}) {
  const geometry = useMemo(() => {
    const steps = 96
    const positions: number[] = []
    const indices: number[] = []
    const startX = TERRAIN_LEFT - 172
    const endX = TERRAIN_RIGHT + 172

    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps
      const x = THREE.MathUtils.lerp(startX, endX, t)
      const frontZ = TRAIN_TRACK_Z + zOffset - width * 0.5
      const backZ = TRAIN_TRACK_Z + zOffset + width * 0.5
      positions.push(x, terrainY(x, frontZ, yOffset), frontZ, x, terrainY(x, backZ, yOffset), backZ)
    }

    for (let index = 0; index < steps; index += 1) {
      const a = index * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3
      indices.push(a, c, b, b, c, d)
    }

    const railGeometry = new THREE.BufferGeometry()
    railGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    railGeometry.setIndex(indices)
    railGeometry.computeVertexNormals()
    return railGeometry
  }, [width, yOffset, zOffset])

  return (
    <mesh geometry={geometry} renderOrder={renderOrder}>
      <meshBasicMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity >= 1}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-3}
        polygonOffsetUnits={-7}
      />
    </mesh>
  )
}

function TrainSleeper({ x, index }: { x: number; index: number }) {
  const woodColor = index % 4 === 0 ? '#8a5a32' : index % 4 === 2 ? '#a97945' : '#966538'
  const y = terrainY(x, TRAIN_TRACK_Z, 1.28)

  return (
    <group position={[x, y, TRAIN_TRACK_Z]} renderOrder={20}>
      <ToonBox position={[0, 0, 0]} scale={[12.8, 3.2, 70]} color={woodColor} outline={index % 5 === 0} />
      <ToonBox position={[0, 2.2, 0]} scale={[9.2, 1.2, 58]} color="#c59255" outline={false} />
      {[-19, 19].map((railZ) => (
        <group key={`departure-rail-fastener-${index}-${railZ}`}>
          <ToonBox position={[-4.2, 4.2, railZ]} scale={[2.3, 1.1, 8]} color="#343139" outline={false} />
          <ToonBox position={[4.2, 4.2, railZ]} scale={[2.3, 1.1, 8]} color="#343139" outline={false} />
          <ToonBox position={[0, 4.9, railZ]} scale={[8.8, 0.9, 2.4]} color="#67696b" outline={false} />
        </group>
      ))}
    </group>
  )
}

function DepartureRailLine() {
  const sleeperCount = 68
  const sleeperStartX = TERRAIN_LEFT - 96
  const sleeperEndX = TERRAIN_RIGHT + 96
  const sleeperSpacing = (sleeperEndX - sleeperStartX) / (sleeperCount - 1)
  const sleepers = Array.from({ length: sleeperCount }, (_, index) => sleeperStartX + sleeperSpacing * index)

  return (
    <group>
      <TrainBallastStrip width={136} color="#4d493b" opacity={0.24} yOffset={0.18} />
      <TrainBallastStrip width={100} color="#7a7054" opacity={0.36} yOffset={0.26} zOffset={-2} />
      <TrainBallastStrip width={54} color="#2c2a2b" opacity={0.16} yOffset={0.36} />

      {sleepers.map((x, index) => (
        <TrainSleeper key={`departure-rail-sleeper-${index}`} x={x} index={index} />
      ))}

      {[-19, 19].map((railZ) => (
        <group key={`departure-rail-${railZ}`}>
          <TrainRailRibbon zOffset={railZ} width={9.8} yOffset={5.9} color="#121016" renderOrder={22} />
          <TrainRailRibbon zOffset={railZ - 0.55} width={4.4} yOffset={8.8} color="#5d6166" renderOrder={23} />
          <TrainRailRibbon zOffset={railZ - 1.15} width={1.35} yOffset={10.1} color="#b7bdc0" opacity={0.62} renderOrder={24} />
        </group>
      ))}
    </group>
  )
}

function StationLamp({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={[scale, scale, scale]}>
      <ToonCylinder position={[0, 17, 0]} scale={[3.8, 34, 3.8]} color="#1b1722" segments={8} />
      <ToonBox position={[0, 36, 0]} scale={[17, 5, 17]} color="#2c2230" outline={false} />
      <ToonBox position={[0, 36.2, 7.4]} scale={[12, 3.4, 1.2]} color="#fff2b8" outline={false} opacity={0.9} />
      <mesh position={[0, 34.8, 8.7]} scale={[15, 9, 1]}>
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial color="#fff0a2" transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  )
}

function StationFlowerCrate({
  position,
  yaw = 0,
  scale = 1,
}: {
  position: [number, number, number]
  yaw?: number
  scale?: number
}) {
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <ToonBox position={[0, 3.5, 0]} scale={[25, 7, 12]} color="#87502d" outline />
      <ToonBox position={[0, 7.1, 0]} scale={[28, 1.5, 13]} color="#c98547" outline={false} />
      {[-8, 0, 8].map((flowerX, index) => (
        <group key={`station-crate-flower-${flowerX}`} position={[flowerX, 10.8 + index * 0.35, 0.6 - index * 1.2]}>
          <ToonBlob position={[-2, 0, 0]} scale={[2.8, 2, 2.4]} color={index === 1 ? '#ffd6ef' : '#f7acd2'} outlineScale={1.02} />
          <ToonBlob position={[2, 0.3, 0.3]} scale={[2.4, 1.9, 2.2]} color={index === 2 ? '#ffe7a3' : '#b9e87a'} outlineScale={1.02} />
          <ToonBlob position={[0, 0.7, -1.6]} scale={[2.2, 1.7, 2]} color="#fbf7c6" outlineScale={1.02} />
          <ToonBlob position={[0, -1.2, 0]} scale={[4.4, 1.2, 2.8]} color="#4f8f38" outlineScale={1.02} />
        </group>
      ))}
    </group>
  )
}

function DepartureTrainStation() {
  const stationY = terrainY(TRAIN_STATION_X, TRAIN_STATION_Z)
  const platformTop = 1.16

  return (
    <group>
      <DepartureRailLine />

      <group position={[TRAIN_STATION_X, stationY, TRAIN_STATION_Z]} rotation={[0, -0.08, 0]}>
        <FlatOval position={[0, 0.1, 8]} diameterX={270} diameterZ={138} color="#18131d" opacity={0.045} yaw={0.03} />
        <ToonBox position={[0, platformTop * 0.5, 0]} scale={[232, platformTop, 108]} color="#8f5d35" outline />
        <ToonBox position={[0, platformTop + 0.14, 0]} scale={[216, 0.28, 92]} color="#f8dda1" outline={false} />
        <ToonBox position={[0, platformTop + 0.42, -51]} scale={[214, 0.62, 7]} color="#c99155" outline={false} />
        <ToonBox position={[-112, platformTop + 0.42, 0]} scale={[7, 0.62, 92]} color="#c99155" outline={false} />
        <ToonBox position={[112, platformTop + 0.42, 0]} scale={[7, 0.62, 92]} color="#c99155" outline={false} />
        <ToonBox position={[0, platformTop + 1.18, 48]} scale={[214, 2.7, 6.2]} color="#201925" outline={false} />
        <ToonBox position={[0, platformTop + 3.0, 42]} scale={[196, 1.65, 4.2]} color="#f8dda1" outline={false} />
        <ToonBox position={[-91, platformTop + 2.7, -46]} scale={[6.2, 4.9, 12]} color="#5e3e27" outline={false} />
        <ToonBox position={[91, platformTop + 2.7, -46]} scale={[6.2, 4.9, 12]} color="#5e3e27" outline={false} />
        <ToonBox position={[22, 0.74, -68]} scale={[128, 0.42, 30]} color="#e7c67c" outline={false} yaw={0.03} />
        <ToonBox position={[22, 1.06, -68]} scale={[108, 0.18, 5]} color="#b9874f" outline={false} yaw={0.03} />
        <ToonBox position={[-24, 1.07, -86]} scale={[34, 0.16, 4]} color="#b9874f" outline={false} yaw={0.01} />
        <ToonBox position={[48, 1.07, -84]} scale={[30, 0.16, 4]} color="#b9874f" outline={false} yaw={-0.03} />

        <group position={[-116, platformTop, -18]}>
          <ToonBox position={[0, 18, -25]} scale={[82, 35, 8]} color="#c7804a" outline />
          <ToonBox position={[0, 23, -20.2]} scale={[64, 17, 1.8]} color="#fff0bd" outline={false} />
          <ToonBox position={[0, 34, -19.6]} scale={[52, 2.5, 2.1]} color="#704426" outline={false} />
          {[-42, 42].map((postX) => (
            <ToonCylinder key={`station-canopy-post-${postX}`} position={[postX, 23, 8]} scale={[5, 45, 5]} color="#6f4328" segments={8} />
          ))}
          <ToonBox position={[0, 48, -8]} scale={[104, 12, 70]} color="#e69635" outline />
          <ToonBox position={[0, 54.6, -5]} scale={[112, 2.5, 76]} color="#ffd07a" outline={false} />
          <ToonBox position={[-1, 58, -6]} scale={[90, 4, 13]} color="#241926" outline />
          <ToonBox position={[-1, 58.4, -0.8]} scale={[68, 1.8, 1.3]} color="#fff5ca" outline={false} />

          <ToonBox position={[10, 8.8, 16]} scale={[56, 6, 12]} color="#7f4a2c" outline />
          <ToonBox position={[10, 14.2, 15]} scale={[60, 5, 9]} color="#c9874d" outline={false} />
          <ToonBox position={[-16, 5.2, 18]} scale={[6, 10, 6]} color="#241926" outline={false} />
          <ToonBox position={[36, 5.2, 18]} scale={[6, 10, 6]} color="#241926" outline={false} />
        </group>

        <StationFlowerCrate position={[54, platformTop + 0.3, -39]} yaw={0.05} scale={0.86} />
        <StationFlowerCrate position={[-50, platformTop + 0.3, -40]} yaw={-0.04} scale={0.8} />

        <StationLamp x={84} z={-28} scale={1.04} />
        <StationLamp x={102} z={36} scale={0.86} />

        {[-72, -36, 36, 72].map((x, index) => (
          <ToonCylinder key={`station-front-bollard-${index}`} position={[x, platformTop + 6.2, 48]} scale={[4.2, 13.2, 4.2]} color="#19141f" segments={8} />
        ))}
        {[-74, 74].map((x, index) => (
          <ToonBox key={`station-safety-chain-${index}`} position={[x * 0.72, platformTop + 13.4, 49.8]} scale={[32, 2.6, 2.6]} color="#19141f" outline={false} yaw={index === 0 ? -0.04 : 0.04} />
        ))}

        {[-114, 116].map((x, index) => (
          <group key={`departure-arrow-paver-${index}`} position={[x, platformTop + 0.24, 18 + index * 14]} rotation={[0, 0.18 - index * 0.1, 0]}>
            <ToonBox position={[0, 0, 0]} scale={[34, 0.3, 13]} color="#f2c779" outline={false} opacity={0.72} />
            <ToonBox position={[14, 0.1, 0]} scale={[6, 0.34, 19]} color="#f2c779" outline={false} opacity={0.66} />
          </group>
        ))}
      </group>
    </group>
  )
}

function FoliageBase({
  diameterX,
  diameterZ,
  yaw = 0,
}: {
  diameterX: number
  diameterZ: number
  yaw?: number
}) {
  return <FlatOval position={[0, 0.12, 0]} diameterX={diameterX} diameterZ={diameterZ} color="#174927" opacity={0.14} yaw={yaw} renderOrder={-1} />
}

function RoundCanopyTree({ x, z, scale = 1, yaw = 0 }: { x: number; z: number; scale?: number; yaw?: number }) {
  const y = terrainY(x, z)
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <FoliageBase diameterX={92} diameterZ={76} yaw={0.1} />
      <ToonCylinder position={[0, 25, 0]} scale={[11, 50, 11]} color="#7a4a28" segments={9} />
      <ToonCylinder position={[0, 27, 0]} scale={[5.2, 54, 5.2]} color="#a96a36" outline={false} segments={8} />
      <ToonBlob position={[0, 78, 0]} scale={[44, 38, 42]} color="#46933d" />
      <ToonBlob position={[-28, 66, 8]} scale={[30, 28, 30]} color="#5fb346" outlineScale={1.045} />
      <ToonBlob position={[28, 69, -6]} scale={[32, 30, 31]} color="#3f8638" outlineScale={1.045} />
      <ToonBlob position={[6, 96, -8]} scale={[34, 30, 32]} color="#6ac14c" outlineScale={1.04} />
      <ToonBlob position={[0, 76, 2]} scale={[54, 32, 48]} color="#275f30" outlineScale={1.035} opacity={0.18} />
    </group>
  )
}

function TieredPineTree({ x, z, scale = 1, yaw = 0 }: { x: number; z: number; scale?: number; yaw?: number }) {
  const y = terrainY(x, z)
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <FoliageBase diameterX={76} diameterZ={70} yaw={-0.2} />
      <ToonCylinder position={[0, 19, 0]} scale={[9, 38, 9]} color="#6c4228" segments={8} />
      <ToonCone position={[0, 48, 0]} scale={[86, 58, 86]} color="#214f2c" segments={8} outlineScale={1.035} />
      <ToonCone position={[0, 72, -2]} scale={[72, 54, 72]} color="#2d7435" segments={8} outlineScale={1.035} />
      <ToonCone position={[0, 96, -4]} scale={[56, 50, 56]} color="#45913e" segments={8} outlineScale={1.035} />
      <ToonCone position={[0, 121, -4]} scale={[34, 42, 34]} color="#70c856" segments={8} outlineScale={1.035} />
    </group>
  )
}

function CypressPoplarTree({ x, z, scale = 1, yaw = 0 }: { x: number; z: number; scale?: number; yaw?: number }) {
  const y = terrainY(x, z)
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <FoliageBase diameterX={62} diameterZ={56} yaw={0.1} />
      <ToonCylinder position={[0, 24, 0]} scale={[8, 48, 8]} color="#77492a" segments={8} />
      <ToonBlob position={[0, 62, 0]} scale={[26, 54, 25]} color="#2d7438" />
      <ToonBlob position={[2, 94, -1]} scale={[22, 50, 22]} color="#3c9140" outlineScale={1.045} />
      <ToonBlob position={[-1, 126, 0]} scale={[18, 40, 18]} color="#6ac04d" outlineScale={1.04} />
    </group>
  )
}

function WillowCanopyTree({ x, z, scale = 1, yaw = 0 }: { x: number; z: number; scale?: number; yaw?: number }) {
  const y = terrainY(x, z)
  const hangingLeaves = [
    [-34, 48, 10, '#3d873b'],
    [-18, 44, -12, '#5ba847'],
    [0, 42, 18, '#78bd50'],
    [22, 46, -6, '#4c983d'],
    [38, 50, 9, '#6db84b'],
  ] as const
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <FoliageBase diameterX={112} diameterZ={86} yaw={-0.12} />
      <group rotation={[0, 0, -0.08]}>
        <ToonCylinder position={[0, 29, 0]} scale={[10, 58, 10]} color="#7f512e" segments={9} />
        <ToonCylinder position={[3, 31, 0]} scale={[4.5, 60, 4.5]} color="#b8783d" outline={false} segments={8} />
      </group>
      <ToonBlob position={[0, 84, 0]} scale={[48, 30, 42]} color="#4d9b3f" outlineScale={1.04} />
      <ToonBlob position={[-36, 74, 8]} scale={[34, 28, 30]} color="#6dbc4c" outlineScale={1.04} />
      <ToonBlob position={[35, 76, -4]} scale={[34, 28, 30]} color="#3e8437" outlineScale={1.04} />
      <ToonBlob position={[4, 101, -5]} scale={[38, 25, 34]} color="#87cf58" outlineScale={1.035} />
      {hangingLeaves.map(([leafX, leafY, leafZ, color], index) => (
        <ToonBlob
          key={`willow-hanging-leaf-${index}`}
          position={[leafX, leafY, leafZ]}
          scale={[8.5, 22 + (index % 2) * 5, 6.5]}
          color={color}
          rotation={[0.08, index * 0.52, leafX < 0 ? -0.08 : 0.08]}
          outlineScale={1.035}
        />
      ))}
    </group>
  )
}

function BlossomSaplingTree({ x, z, scale = 1, yaw = 0 }: { x: number; z: number; scale?: number; yaw?: number }) {
  const y = terrainY(x, z)
  const blossoms = [
    [-22, 52, 10, '#ffd7f2'],
    [-6, 66, -12, '#fff4ba'],
    [18, 58, 8, '#c9f2ff'],
    [30, 48, -6, '#ffb8d8'],
    [2, 46, 18, '#f7d8ff'],
  ] as const
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <FoliageBase diameterX={78} diameterZ={56} yaw={0.18} />
      <ToonCylinder position={[0, 20, 0]} scale={[7.5, 40, 7.5]} color="#8a552e" segments={8} />
      <ToonBlob position={[-12, 48, 3]} scale={[24, 23, 22]} color="#5fae45" outlineScale={1.04} />
      <ToonBlob position={[14, 50, -5]} scale={[26, 24, 24]} color="#7fc855" outlineScale={1.04} />
      <ToonBlob position={[1, 62, 2]} scale={[28, 24, 25]} color="#9ad565" outlineScale={1.035} />
      {blossoms.map(([flowerX, flowerY, flowerZ, color], index) => (
        <ToonBlob key={`blossom-sapling-flower-${index}`} position={[flowerX, flowerY, flowerZ]} scale={[4.6, 4.6, 4.6]} color={color} outlineScale={1.08} />
      ))}
    </group>
  )
}

function FloweringBush({ x, z, scale = 1, yaw = 0 }: { x: number; z: number; scale?: number; yaw?: number }) {
  const y = terrainY(x, z)
  const flowers = [
    [-24, 24, 4, '#ff7eb6'],
    [-10, 30, -10, '#fff6a8'],
    [10, 26, 9, '#90e8ff'],
    [28, 23, -2, '#ff9b60'],
    [4, 34, 1, '#f7cbff'],
  ] as const
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <FoliageBase diameterX={72} diameterZ={55} yaw={-0.24} />
      <ToonBlob position={[-22, 14, 0]} scale={[25, 17, 20]} color="#4b9b3e" outlineScale={1.04} />
      <ToonBlob position={[4, 18, -2]} scale={[30, 22, 24]} color="#66ba49" outlineScale={1.04} />
      <ToonBlob position={[26, 13, 2]} scale={[22, 16, 18]} color="#347836" outlineScale={1.04} />
      {flowers.map(([fx, fy, fz, color], index) => (
        <ToonBlob key={`sample-flower-${index}`} position={[fx, fy, fz]} scale={[5.6, 5.6, 5.6]} color={color} outlineScale={1.08} />
      ))}
    </group>
  )
}

function LowShrubAndGrass({ x, z, scale = 1, yaw = 0 }: { x: number; z: number; scale?: number; yaw?: number }) {
  const y = terrainY(x, z)
  const blades = [-32, -22, -12, 0, 12, 24, 34] as const
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <FoliageBase diameterX={82} diameterZ={52} yaw={0.32} />
      <ToonBlob position={[-18, 11, 1]} scale={[24, 14, 18]} color="#497f35" outlineScale={1.04} />
      <ToonBlob position={[12, 13, -2]} scale={[31, 16, 22]} color="#77bd4f" outlineScale={1.04} />
      <ToonBlob position={[34, 9, 4]} scale={[18, 12, 15]} color="#2f6b32" outlineScale={1.04} />
      {blades.map((bladeX, index) => (
        <ToonCone
          key={`sample-grass-blade-${bladeX}`}
          position={[bladeX, 16 + (index % 2) * 3, -10 + Math.sin(index) * 7]}
          rotation={[0.24 + index * 0.025, index * 0.68, index % 2 === 0 ? -0.18 : 0.16]}
          scale={[8, 30 + (index % 3) * 7, 8]}
          color={index % 2 === 0 ? '#80c958' : '#4c9b3e'}
          segments={5}
          outlineScale={1.04}
        />
      ))}
    </group>
  )
}

type PathsideRock = {
  offset: [number, number]
  scale: [number, number, number]
  color: string
  rotation: [number, number, number]
}

type PathsideRockPatch = {
  id: string
  x: number
  z: number
  yaw: number
  scale: number
  rocks: PathsideRock[]
}

type PathsideFlowerPatch = {
  id: string
  x: number
  z: number
  yaw: number
  scale: number
  flowers: ForestFlowerSpec[]
}

type PathsideGrassTuft = {
  id: string
  x: number
  z: number
  yaw: number
  scale: number
  colorA?: string
  colorB?: string
}

type PathsideAccentPlacement = {
  id: string
  x: number
  z: number
  yaw: number
  scale: number
}

const PATHSIDE_ROCK_PATCHES: PathsideRockPatch[] = [
  {
    id: 'spawn-soft-stones',
    x: -430,
    z: 198,
    yaw: -0.18,
    scale: 0.72,
    rocks: [
      { offset: [-10, -4], scale: [11, 4.2, 7], color: '#b8b69d', rotation: [0.08, 0.42, -0.03] },
      { offset: [5, 5], scale: [7, 3.2, 5.6], color: '#8f967f', rotation: [-0.04, -0.22, 0.06] },
      { offset: [17, -7], scale: [5.4, 2.5, 4.5], color: '#d4caa5', rotation: [0.02, 0.88, 0.04] },
    ],
  },
  {
    id: 'main-bend-pebbles',
    x: 214,
    z: 314,
    yaw: 0.34,
    scale: 0.64,
    rocks: [
      { offset: [-14, 3], scale: [9, 3.6, 6.8], color: '#aaa98f', rotation: [0.05, -0.36, 0.04] },
      { offset: [2, -5], scale: [6.4, 2.8, 5], color: '#777f6e', rotation: [-0.02, 0.48, -0.04] },
      { offset: [14, 7], scale: [4.8, 2.2, 4], color: '#cac09d', rotation: [0.08, 0.12, 0.06] },
    ],
  },
  {
    id: 'right-hill-foot-stones',
    x: 978,
    z: -178,
    yaw: -0.42,
    scale: 0.78,
    rocks: [
      { offset: [-13, -6], scale: [13, 4.4, 8], color: '#7d846f', rotation: [0.06, 0.62, -0.02] },
      { offset: [8, 3], scale: [8, 3.2, 6.2], color: '#c4bd9d', rotation: [-0.04, -0.32, 0.04] },
      { offset: [20, -8], scale: [5.8, 2.6, 4.6], color: '#9aa083', rotation: [0.04, 0.2, 0.08] },
    ],
  },
  {
    id: 'museum-forecourt-side-stones',
    x: 410,
    z: -420,
    yaw: 0.18,
    scale: 0.68,
    rocks: [
      { offset: [-16, -3], scale: [9.8, 3.6, 6.6], color: '#c7c0a4', rotation: [0.03, 0.18, -0.02] },
      { offset: [1, 5], scale: [7.2, 3, 5.4], color: '#858d78', rotation: [0.08, -0.44, 0.04] },
      { offset: [13, -6], scale: [5.2, 2.3, 4.1], color: '#d8ceaa', rotation: [-0.03, 0.68, -0.04] },
    ],
  },
  {
    id: 'cave-spur-worn-stones',
    x: -540,
    z: 156,
    yaw: -0.32,
    scale: 0.62,
    rocks: [
      { offset: [-11, 5], scale: [8.8, 3.4, 6.2], color: '#8f9780', rotation: [0.06, -0.2, 0.04] },
      { offset: [3, -4], scale: [6.6, 2.8, 5.2], color: '#c9c29f', rotation: [0.02, 0.52, -0.04] },
      { offset: [16, 2], scale: [4.8, 2.2, 3.8], color: '#6f7567', rotation: [-0.05, -0.72, 0.03] },
    ],
  },
  {
    id: 'departure-path-stone-chip',
    x: -54,
    z: 816,
    yaw: 0.24,
    scale: 0.66,
    rocks: [
      { offset: [-12, -5], scale: [8.4, 3.2, 5.4], color: '#b4ae8f', rotation: [0.06, 0.38, 0.03] },
      { offset: [5, 4], scale: [6.2, 2.4, 4.8], color: '#858b74', rotation: [-0.04, -0.18, -0.03] },
      { offset: [15, -3], scale: [4.6, 2.1, 3.4], color: '#d3c69f', rotation: [0.04, 0.84, 0.05] },
    ],
  },
]

const PATHSIDE_FLOWER_PATCHES: PathsideFlowerPatch[] = [
  {
    id: 'gate-little-flowers',
    x: 660,
    z: 434,
    yaw: -0.28,
    scale: 0.82,
    flowers: [
      { offset: [-10, 0, 0], height: 6.4, bloomSize: 1.04, color: MAGIC_NATURE_PALETTE.flowerCream, accent: MAGIC_NATURE_PALETTE.flowerYellow, kind: 'daisy', lean: -0.12 },
      { offset: [0, 0, 7], height: 7.2, bloomSize: 0.96, color: MAGIC_NATURE_PALETTE.flowerBlue, accent: MAGIC_NATURE_PALETTE.flowerCream, kind: 'bell', lean: 0.1 },
      { offset: [10, 0, -3], height: 5.8, bloomSize: 0.9, color: MAGIC_NATURE_PALETTE.flowerPink, accent: MAGIC_NATURE_PALETTE.flowerYellow, kind: 'pom', lean: 0.16 },
    ],
  },
  {
    id: 'museum-slope-flower-sprig',
    x: 690,
    z: -258,
    yaw: 0.22,
    scale: 0.74,
    flowers: [
      { offset: [-8, 0, 3], height: 5.8, bloomSize: 0.86, color: MAGIC_NATURE_PALETTE.flowerViolet, accent: MAGIC_NATURE_PALETTE.flowerCream, kind: 'daisy', lean: -0.08 },
      { offset: [2, 0, -6], height: 6.8, bloomSize: 0.92, color: MAGIC_NATURE_PALETTE.flowerCream, accent: MAGIC_NATURE_PALETTE.flowerCoral, kind: 'daisy', lean: 0.14 },
      { offset: [12, 0, 5], height: 5.4, bloomSize: 0.84, color: MAGIC_NATURE_PALETTE.flowerBlue, accent: MAGIC_NATURE_PALETTE.flowerYellow, kind: 'bell', lean: -0.14 },
    ],
  },
  {
    id: 'lake-path-edge-flowers',
    x: -262,
    z: -238,
    yaw: -0.18,
    scale: 0.66,
    flowers: [
      { offset: [-9, 0, 1], height: 5.6, bloomSize: 0.82, color: MAGIC_NATURE_PALETTE.flowerCream, accent: MAGIC_NATURE_PALETTE.flowerYellow, kind: 'daisy', lean: 0.1 },
      { offset: [0, 0, -5], height: 6.2, bloomSize: 0.84, color: MAGIC_NATURE_PALETTE.flowerCoral, accent: MAGIC_NATURE_PALETTE.flowerCream, kind: 'pom', lean: -0.12 },
      { offset: [10, 0, 4], height: 5.2, bloomSize: 0.76, color: MAGIC_NATURE_PALETTE.flowerBlue, accent: MAGIC_NATURE_PALETTE.flowerCream, kind: 'bell', lean: 0.18 },
    ],
  },
  {
    id: 'train-stop-flower-sprig',
    x: 246,
    z: 624,
    yaw: 0.36,
    scale: 0.7,
    flowers: [
      { offset: [-8, 0, -2], height: 5.6, bloomSize: 0.86, color: MAGIC_NATURE_PALETTE.flowerYellow, accent: MAGIC_NATURE_PALETTE.flowerPink, kind: 'daisy', lean: -0.08 },
      { offset: [2, 0, 5], height: 6.4, bloomSize: 0.9, color: MAGIC_NATURE_PALETTE.flowerCream, accent: MAGIC_NATURE_PALETTE.flowerCoral, kind: 'pom', lean: 0.12 },
      { offset: [10, 0, -4], height: 5.2, bloomSize: 0.74, color: MAGIC_NATURE_PALETTE.flowerViolet, accent: MAGIC_NATURE_PALETTE.flowerCream, kind: 'bell', lean: -0.16 },
    ],
  },
]

const PATHSIDE_GRASS_TUFTS: PathsideGrassTuft[] = [
  { id: 'spawn-tuft-left', x: -264, z: 186, yaw: 0.24, scale: 0.64 },
  { id: 'spawn-tuft-right', x: -80, z: 334, yaw: -0.16, scale: 0.48, colorA: '#97d85f' },
  { id: 'main-curve-tuft-a', x: 352, z: 292, yaw: -0.32, scale: 0.5 },
  { id: 'main-curve-tuft-b', x: 574, z: 216, yaw: 0.38, scale: 0.48, colorB: '#3e8839' },
  { id: 'hill-switchback-tuft-a', x: 1112, z: -288, yaw: -0.18, scale: 0.58 },
  { id: 'hill-switchback-tuft-b', x: 1034, z: -488, yaw: 0.22, scale: 0.54, colorA: '#8fd15a' },
  { id: 'museum-path-tuft-a', x: 604, z: -384, yaw: -0.44, scale: 0.46 },
  { id: 'cave-spur-tuft-a', x: -390, z: 238, yaw: 0.2, scale: 0.46, colorB: '#2e7033' },
  { id: 'cave-spur-tuft-b', x: -720, z: 96, yaw: -0.36, scale: 0.5, colorA: '#a5de6a' },
  { id: 'lower-path-tuft-a', x: 146, z: 572, yaw: 0.3, scale: 0.52 },
  { id: 'lower-path-tuft-b', x: -22, z: 706, yaw: -0.28, scale: 0.44, colorA: '#92d25b' },
  { id: 'lower-path-tuft-c', x: 214, z: 880, yaw: 0.18, scale: 0.5 },
]

const PATHSIDE_FERN_PATCHES: PathsideAccentPlacement[] = [
  { id: 'spawn-little-fern-a', x: -344, z: 292, yaw: -0.4, scale: 0.28 },
  { id: 'spawn-little-fern-b', x: 102, z: 394, yaw: 0.32, scale: 0.24 },
  { id: 'main-bend-fern-a', x: 426, z: 342, yaw: -0.28, scale: 0.26 },
  { id: 'main-bend-fern-b', x: 748, z: 186, yaw: 0.42, scale: 0.24 },
  { id: 'right-hill-fern-a', x: 1138, z: -102, yaw: -0.16, scale: 0.28 },
  { id: 'right-hill-fern-b', x: 1052, z: -346, yaw: 0.36, scale: 0.25 },
  { id: 'museum-fern-a', x: 514, z: -358, yaw: -0.2, scale: 0.24 },
  { id: 'cave-spur-fern-a', x: -616, z: 232, yaw: 0.3, scale: 0.26 },
  { id: 'departure-fern-a', x: 78, z: 638, yaw: -0.26, scale: 0.25 },
]

const PATHSIDE_FLOWERING_BUSHLETS: PathsideAccentPlacement[] = [
  { id: 'spawn-bloom-bushlet', x: -168, z: 248, yaw: 0.18, scale: 0.22 },
  { id: 'main-curve-bloom-bushlet', x: 626, z: 286, yaw: -0.32, scale: 0.2 },
  { id: 'hill-foot-bloom-bushlet', x: 990, z: -34, yaw: 0.28, scale: 0.2 },
  { id: 'museum-side-bloom-bushlet', x: 730, z: -300, yaw: -0.12, scale: 0.18 },
  { id: 'lower-path-bloom-bushlet', x: 310, z: 686, yaw: 0.34, scale: 0.2 },
]

function PathsideRockCluster({ patch }: { patch: PathsideRockPatch }) {
  const y = terrainY(patch.x, patch.z, 0.14)
  return (
    <group position={[patch.x, y, patch.z]} rotation={[0, patch.yaw, 0]} scale={[patch.scale, patch.scale, patch.scale]}>
      <FlatOval position={[2, 0.04, 0]} diameterX={54} diameterZ={34} color={PALETTE.ink} opacity={0.055} yaw={0.12} renderOrder={-2} />
      {patch.rocks.map((rock, index) => (
        <ToonRock
          key={`${patch.id}-rock-${index}`}
          position={[rock.offset[0], 1.1 + index * 0.08, rock.offset[1]]}
          scale={rock.scale}
          color={rock.color}
          rotation={rock.rotation}
          outlineScale={1.035}
        />
      ))}
    </group>
  )
}

function PathsideFlowerSprig({ patch }: { patch: PathsideFlowerPatch }) {
  const y = terrainY(patch.x, patch.z, 0.14)
  return (
    <group position={[patch.x, y, patch.z]} rotation={[0, patch.yaw, 0]} scale={[patch.scale, patch.scale, patch.scale]}>
      <FlatOval position={[0, 0.04, 0]} diameterX={34} diameterZ={22} color={MAGIC_NATURE_PALETTE.leafDark} opacity={0.045} yaw={0.2} renderOrder={-2} />
      {patch.flowers.map((flower, index) => (
        <ForestWildflower key={`${patch.id}-flower-${index}`} flower={flower} />
      ))}
    </group>
  )
}

function PathsideGrassTuft({ tuft }: { tuft: PathsideGrassTuft }) {
  const y = terrainY(tuft.x, tuft.z, 0.1)
  const blades = [-12, -6, 0, 7, 13] as const
  return (
    <group position={[tuft.x, y, tuft.z]} rotation={[0, tuft.yaw, 0]} scale={[tuft.scale, tuft.scale, tuft.scale]}>
      <FlatOval position={[0, 0.03, 0]} diameterX={32} diameterZ={18} color="#235f2e" opacity={0.045} yaw={0.1} renderOrder={-2} />
      {blades.map((bladeX, index) => (
        <ToonCone
          key={`${tuft.id}-blade-${bladeX}`}
          position={[bladeX, 11 + (index % 2) * 2.2, Math.sin(index * 1.4) * 4]}
          rotation={[0.28 + index * 0.025, index * 0.7, index % 2 === 0 ? -0.16 : 0.18]}
          scale={[5.2, 22 + (index % 3) * 4, 5.2]}
          color={index % 2 === 0 ? tuft.colorA ?? '#79c956' : tuft.colorB ?? '#4a9a3c'}
          segments={5}
          outlineScale={1.035}
        />
      ))}
    </group>
  )
}

function PathsideNaturalDetailScatter() {
  return (
    <group>
      {PATHSIDE_ROCK_PATCHES.map((patch) => (
        <PathsideRockCluster key={patch.id} patch={patch} />
      ))}
      {PATHSIDE_FLOWER_PATCHES.map((patch) => (
        <PathsideFlowerSprig key={patch.id} patch={patch} />
      ))}
      {PATHSIDE_GRASS_TUFTS.map((tuft) => (
        <PathsideGrassTuft key={tuft.id} tuft={tuft} />
      ))}
      {PATHSIDE_FERN_PATCHES.map((fern) => (
        <FernFan key={fern.id} x={fern.x} z={fern.z} scale={fern.scale} yaw={fern.yaw} />
      ))}
      {PATHSIDE_FLOWERING_BUSHLETS.map((bush) => (
        <FloweringBush key={bush.id} x={bush.x} z={bush.z} scale={bush.scale} yaw={bush.yaw} />
      ))}
    </group>
  )
}

type MapTreeKind = 'round' | 'pine' | 'cypress' | 'willow' | 'blossom'

type MapTreePlacement = {
  id: string
  kind: MapTreeKind
  x: number
  z: number
  scale: number
  yaw: number
}

type MapShrubPlacement = {
  id: string
  x: number
  z: number
  scale: number
  yaw: number
}

const MAP_TREE_PLACEMENTS: MapTreePlacement[] = [
  // Lake rim: trees sit back from the beach so the shoreline and water blocker stay visually honest.
  { id: 'lake-back-round-a', kind: 'round', x: -1474, z: -1416, scale: 0.66, yaw: -0.3 },
  { id: 'lake-back-pine-a', kind: 'pine', x: -1296, z: -1500, scale: 0.72, yaw: 0.24 },
  { id: 'lake-back-round-b', kind: 'round', x: -1036, z: -1518, scale: 0.58, yaw: 0.46 },
  { id: 'lake-back-pine-b', kind: 'pine', x: -760, z: -1490, scale: 0.56, yaw: -0.2 },
  { id: 'lake-west-willow-a', kind: 'willow', x: -1482, z: -610, scale: 0.5, yaw: 0.32 },
  { id: 'lake-south-willow-a', kind: 'willow', x: -1138, z: -238, scale: 0.44, yaw: -0.16 },
  { id: 'lake-south-round-a', kind: 'round', x: -760, z: -194, scale: 0.42, yaw: 0.18 },
  { id: 'lake-east-cypress-a', kind: 'cypress', x: -94, z: -1018, scale: 0.5, yaw: 0.1 },
  { id: 'lake-east-blossom-a', kind: 'blossom', x: 42, z: -820, scale: 0.42, yaw: -0.34 },

  // Glowbud grove: denser, varied silhouettes around the cave while preserving the cave threshold.
  { id: 'grove-left-pine-a', kind: 'pine', x: -1438, z: 286, scale: 0.68, yaw: -0.32 },
  { id: 'grove-left-round-a', kind: 'round', x: -1346, z: 488, scale: 0.54, yaw: 0.24 },
  { id: 'grove-left-willow-a', kind: 'willow', x: -1182, z: 464, scale: 0.44, yaw: 0.12 },
  { id: 'grove-center-blossom-a', kind: 'blossom', x: -1038, z: 424, scale: 0.48, yaw: -0.18 },
  { id: 'grove-right-pine-a', kind: 'pine', x: -856, z: 432, scale: 0.54, yaw: 0.36 },
  { id: 'grove-right-cypress-a', kind: 'cypress', x: -676, z: 342, scale: 0.5, yaw: -0.16 },
  { id: 'grove-entrance-round-a', kind: 'round', x: -650, z: 52, scale: 0.42, yaw: 0.28 },

  // Museum hill shoulders: refined garden accents that frame the destination without blocking the facade.
  { id: 'museum-left-cypress-a', kind: 'cypress', x: 262, z: -786, scale: 0.52, yaw: -0.14 },
  { id: 'museum-left-blossom-a', kind: 'blossom', x: 152, z: -610, scale: 0.42, yaw: 0.28 },
  { id: 'museum-right-cypress-a', kind: 'cypress', x: 936, z: -736, scale: 0.62, yaw: 0.16 },
  { id: 'museum-right-round-a', kind: 'round', x: 1112, z: -566, scale: 0.54, yaw: -0.3 },
  { id: 'museum-right-pine-a', kind: 'pine', x: 1248, z: -392, scale: 0.58, yaw: 0.22 },
  { id: 'museum-slope-blossom-a', kind: 'blossom', x: 760, z: -214, scale: 0.36, yaw: -0.26 },

  // Eastern hill belt: spaced silhouettes that make the ridge feel natural, not like a fence row.
  { id: 'east-hill-round-a', kind: 'round', x: 1296, z: -36, scale: 0.54, yaw: 0.34 },
  { id: 'east-hill-cypress-a', kind: 'cypress', x: 1342, z: 214, scale: 0.58, yaw: -0.22 },
  { id: 'east-overlook-pine-a', kind: 'pine', x: 1132, z: 554, scale: 0.64, yaw: 0.08 },
  { id: 'east-overlook-round-a', kind: 'round', x: 926, z: 742, scale: 0.52, yaw: -0.36 },
  { id: 'east-overlook-blossom-a', kind: 'blossom', x: 732, z: 604, scale: 0.4, yaw: 0.24 },

  // Lower entry/train approach: greenery thickens the edge but leaves the rail boundary readable.
  { id: 'entry-left-round-a', kind: 'round', x: -382, z: 792, scale: 0.6, yaw: 0.2 },
  { id: 'entry-left-pine-a', kind: 'pine', x: -112, z: 846, scale: 0.52, yaw: -0.16 },
  { id: 'entry-right-cypress-a', kind: 'cypress', x: 338, z: 818, scale: 0.46, yaw: 0.32 },
  { id: 'entry-right-round-a', kind: 'round', x: 580, z: 724, scale: 0.5, yaw: -0.24 },

  // Spawn lawn: sparse silhouettes so the first read stays open and controllable.
  { id: 'spawn-left-round-a', kind: 'round', x: -594, z: 442, scale: 0.46, yaw: -0.28 },
  { id: 'spawn-right-blossom-a', kind: 'blossom', x: 312, z: 508, scale: 0.34, yaw: 0.2 },
]

const MAP_SHRUB_PLACEMENTS: MapShrubPlacement[] = [
  // Lake and beach transition: low silhouettes only, preserving the clean water edge.
  { id: 'lake-rim-shrub-a', x: -1518, z: -1210, scale: 0.42, yaw: -0.2 },
  { id: 'lake-rim-shrub-b', x: -1218, z: -1442, scale: 0.38, yaw: 0.32 },
  { id: 'lake-rim-shrub-c', x: -860, z: -1458, scale: 0.34, yaw: -0.42 },
  { id: 'lake-west-bank-shrub-a', x: -1414, z: -530, scale: 0.34, yaw: 0.18 },
  { id: 'lake-south-bank-shrub-a', x: -1012, z: -208, scale: 0.32, yaw: -0.36 },
  { id: 'lake-south-bank-shrub-b', x: -512, z: -188, scale: 0.28, yaw: 0.22 },
  { id: 'lake-east-bank-shrub-a', x: 32, z: -960, scale: 0.34, yaw: 0.22 },
  { id: 'lake-east-bank-shrub-b', x: -82, z: -288, scale: 0.28, yaw: 0.48 },

  // Glowbud grove: the densest nature zone, but kept around the cave rather than across the cave path.
  { id: 'grove-left-shrub-a', x: -1392, z: 352, scale: 0.42, yaw: -0.28 },
  { id: 'grove-left-shrub-b', x: -1246, z: 526, scale: 0.34, yaw: 0.18 },
  { id: 'grove-mid-shrub-a', x: -1088, z: 382, scale: 0.36, yaw: -0.2 },
  { id: 'grove-mid-shrub-b', x: -934, z: 496, scale: 0.32, yaw: 0.34 },
  { id: 'grove-right-shrub-a', x: -742, z: 398, scale: 0.34, yaw: -0.08 },
  { id: 'grove-entrance-shrub-a', x: -682, z: 178, scale: 0.28, yaw: 0.24 },

  // Museum shoulders: ornamental, smaller, and set aside from the playable forecourt.
  { id: 'museum-shoulder-shrub-a', x: 332, z: -676, scale: 0.32, yaw: -0.36 },
  { id: 'museum-shoulder-shrub-b', x: 820, z: -724, scale: 0.34, yaw: 0.16 },
  { id: 'museum-shoulder-shrub-c', x: 1088, z: -440, scale: 0.36, yaw: -0.08 },
  { id: 'museum-slope-shrub-a', x: 636, z: -230, scale: 0.24, yaw: 0.28 },

  // Eastern hills and gate: clustered accents, not a hedge wall.
  { id: 'east-hill-shrub-a', x: 1212, z: 94, scale: 0.4, yaw: 0.34 },
  { id: 'east-hill-shrub-b', x: 1128, z: 356, scale: 0.38, yaw: -0.16 },
  { id: 'east-hill-shrub-c', x: 1004, z: 636, scale: 0.34, yaw: 0.28 },
  { id: 'gate-meadow-shrub-a', x: 776, z: 464, scale: 0.3, yaw: -0.22 },
  { id: 'gate-meadow-shrub-b', x: 596, z: 536, scale: 0.28, yaw: 0.16 },

  // Entry/train area and spawn: texture at the edges, open movement in the middle.
  { id: 'entry-shrub-a', x: -282, z: 688, scale: 0.34, yaw: 0.14 },
  { id: 'entry-shrub-b', x: -50, z: 750, scale: 0.3, yaw: -0.32 },
  { id: 'entry-shrub-c', x: 214, z: 762, scale: 0.32, yaw: 0.22 },
  { id: 'entry-shrub-d', x: 474, z: 642, scale: 0.32, yaw: -0.12 },
  { id: 'spawn-shrub-a', x: -498, z: 338, scale: 0.32, yaw: 0.36 },
  { id: 'spawn-shrub-b', x: -120, z: 414, scale: 0.28, yaw: -0.2 },
  { id: 'spawn-shrub-c', x: 238, z: 386, scale: 0.28, yaw: 0.12 },
]

function MapTree({ tree }: { tree: MapTreePlacement }) {
  if (tree.kind === 'pine') return <TieredPineTree x={tree.x} z={tree.z} scale={tree.scale} yaw={tree.yaw} />
  if (tree.kind === 'cypress') return <CypressPoplarTree x={tree.x} z={tree.z} scale={tree.scale} yaw={tree.yaw} />
  if (tree.kind === 'willow') return <WillowCanopyTree x={tree.x} z={tree.z} scale={tree.scale} yaw={tree.yaw} />
  if (tree.kind === 'blossom') return <BlossomSaplingTree x={tree.x} z={tree.z} scale={tree.scale} yaw={tree.yaw} />
  return <RoundCanopyTree x={tree.x} z={tree.z} scale={tree.scale} yaw={tree.yaw} />
}

function MapFoliageScatter() {
  return (
    <group>
      {MAP_TREE_PLACEMENTS.map((tree) => (
        <MapTree key={tree.id} tree={tree} />
      ))}
      {MAP_SHRUB_PLACEMENTS.map((shrub) => (
        <LowShrubAndGrass key={shrub.id} x={shrub.x} z={shrub.z} scale={shrub.scale} yaw={shrub.yaw} />
      ))}
    </group>
  )
}

function CompletedMuseumDestination() {
  const museumHillY = getTerrainHeight(520, -486)
  const signX = 268
  const signZ = -432

  return (
    <>
      <group position={[520, museumHillY, -90]}>
        <MuseumFacadeSilhouette showMobaSign={false} showProcessionalSlabs={false} />
      </group>
      <GardenEntryGate />
      <GlowbudCaveEntrance />
      <MuseumMobaSign position={[signX, terrainY(signX, signZ) - MUSEUM_SCALE_FLOOR_Y, signZ]} yaw={0.14} />
    </>
  )
}

function SkyWashBlob({
  position,
  scale,
  color,
  opacity,
  yaw = 0,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
  opacity: number
  yaw?: number
}) {
  return (
    <mesh position={position} rotation={[0, yaw, 0]} scale={scale}>
      <sphereGeometry args={[1, 36, 12]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} fog={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

function SkyBrushStroke({
  position,
  scale,
  yaw = 0,
  roll = 0,
  color = '#f4fbff',
  opacity = 0.16,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  yaw?: number
  roll?: number
  color?: string
  opacity?: number
}) {
  return (
    <group position={position} rotation={[0, yaw, roll]} scale={scale}>
      <mesh>
        <sphereGeometry args={[1, 20, 8]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} fog={false} />
      </mesh>
      <mesh position={[0.12, -0.16, -0.02]} scale={[0.62, 0.34, 0.7]}>
        <sphereGeometry args={[1, 16, 8]} />
        <meshBasicMaterial color="#9edff2" transparent opacity={opacity * 0.36} depthWrite={false} fog={false} />
      </mesh>
    </group>
  )
}

function ToonSunburst({
  position,
  yaw = 0,
  scale = 1,
}: {
  position: [number, number, number]
  yaw?: number
  scale?: number
}) {
  const rays = [0, Math.PI * 0.22, Math.PI * 0.45, Math.PI * 0.72, Math.PI, Math.PI * 1.28, Math.PI * 1.55, Math.PI * 1.78] as const
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={[scale, scale, scale]} renderOrder={-75}>
      <mesh scale={[410, 410, 1]}>
        <circleGeometry args={[1, 56]} />
        <meshBasicMaterial color="#fff8c8" transparent opacity={0.11} depthWrite={false} fog={false} />
      </mesh>
      <mesh scale={[270, 270, 1]}>
        <circleGeometry args={[1, 56]} />
        <meshBasicMaterial color="#ffeaa0" transparent opacity={0.3} depthWrite={false} fog={false} />
      </mesh>
      <mesh scale={[150, 150, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial color="#fff6b9" transparent opacity={0.62} depthWrite={false} fog={false} />
      </mesh>
      {rays.map((angle, index) => (
        <mesh
          key={`toon-sunburst-ray-${index}`}
          position={[Math.cos(angle) * 210, Math.sin(angle) * 210, -2]}
          rotation={[0, 0, angle]}
          scale={[82 + (index % 2) * 18, 15, 1]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#fff0a4" transparent opacity={0.13} depthWrite={false} fog={false} />
        </mesh>
      ))}
    </group>
  )
}

function ToonCloud({
  position,
  scale,
  yaw = 0,
  warmth = 0,
  depth = 1,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  yaw?: number
  warmth?: number
  depth?: number
}) {
  const cloudWhite = warmth > 0.5 ? '#fff4d7' : '#f7fbff'
  const cloudBright = warmth > 0.5 ? '#fff9e8' : '#ffffff'
  const cloudCool = warmth > 0.5 ? '#dceadc' : '#d7edf8'
  const cloudBlue = warmth > 0.5 ? '#c5dec8' : '#b8dcef'
  const puffs = [
    [-0.7, 0, 0.03, 0.42, 0.28, 0.26, cloudCool],
    [-0.42, 0.08, 0.01, 0.58, 0.38, 0.32, cloudWhite],
    [-0.08, 0.24, -0.05, 0.7, 0.52, 0.4, cloudBright],
    [0.34, 0.18, 0.02, 0.62, 0.44, 0.36, cloudWhite],
    [0.72, 0.02, -0.03, 0.48, 0.32, 0.28, cloudCool],
    [0.08, -0.1, 0.08, 1.05, 0.24, 0.28, cloudWhite],
    [-0.28, -0.18, 0.1, 0.68, 0.22, 0.24, cloudBlue],
    [0.42, -0.16, 0.1, 0.62, 0.2, 0.23, cloudBlue],
  ] as const

  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      <mesh position={[0.05, -0.24, -0.03]} scale={[1.46, 0.18, 0.38 * depth]}>
        <sphereGeometry args={[1, 18, 10]} />
        <meshBasicMaterial color="#6db7d6" transparent opacity={0.18} depthWrite={false} fog={false} />
      </mesh>
      {puffs.map(([x, y, z, sx, sy, sz, color], index) => (
        <group key={`sky-cloud-puff-${index}`} position={[x, y, z * depth]} scale={[sx, sy, sz * depth]}>
          <mesh scale={[1.075, 1.075, 1.075]}>
            <sphereGeometry args={[1, 18, 10]} />
            <meshBasicMaterial color="#3d87ad" transparent opacity={0.22} side={THREE.BackSide} depthWrite={false} fog={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[1, 18, 10]} />
            <meshToonMaterial color={color} transparent opacity={0.96} depthWrite={false} fog={false} />
          </mesh>
        </group>
      ))}
      {[
        [-0.52, 0.17, -0.32, 0.34, 0.22, 0.16],
        [0.18, 0.34, -0.36, 0.42, 0.26, 0.18],
        [0.56, 0.1, -0.3, 0.28, 0.18, 0.15],
      ].map(([x, y, z, sx, sy, sz], index) => (
        <mesh key={`sky-cloud-back-puff-${index}`} position={[x, y, z * depth]} scale={[sx, sy, sz * depth]}>
          <sphereGeometry args={[1, 16, 9]} />
          <meshToonMaterial color={cloudCool} transparent opacity={0.78} depthWrite={false} fog={false} />
        </mesh>
      ))}
    </group>
  )
}

function DistantCloudBank({
  position,
  yaw = 0,
  scale = 1,
  warmth = 0,
}: {
  position: [number, number, number]
  yaw?: number
  scale?: number
  warmth?: number
}) {
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <SkyWashBlob position={[0, -30, -22]} scale={[560, 48, 92]} color={warmth > 0.5 ? '#fff0c4' : '#d9f7ff'} opacity={0.075} yaw={0.02} />
      <ToonCloud position={[-360, 6, 0]} scale={[128, 42, 48]} yaw={-0.12} warmth={warmth} depth={1.08} />
      <ToonCloud position={[-175, 22, -18]} scale={[176, 60, 62]} yaw={0.02} warmth={warmth} depth={1.18} />
      <ToonCloud position={[42, 12, 4]} scale={[154, 52, 56]} yaw={0.12} warmth={warmth} depth={1.08} />
      <ToonCloud position={[230, 26, -14]} scale={[198, 66, 68]} yaw={-0.04} warmth={warmth} depth={1.22} />
      <ToonCloud position={[462, 8, 10]} scale={[132, 44, 50]} yaw={0.18} warmth={warmth} depth={1.04} />
    </group>
  )
}

function CloudGarland({
  position,
  yaw = 0,
  scale = 1,
}: {
  position: [number, number, number]
  yaw?: number
  scale?: number
}) {
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      <ToonCloud position={[-210, 4, 0]} scale={[150, 54, 60]} yaw={-0.04} depth={1.18} />
      <ToonCloud position={[0, 28, -18]} scale={[190, 66, 70]} yaw={0.06} warmth={1} depth={1.26} />
      <ToonCloud position={[230, -4, 8]} scale={[145, 50, 58]} yaw={0.14} depth={1.12} />
    </group>
  )
}

function SkyAtmosphere() {
  return (
    <group renderOrder={-80}>
      <SkyWashBlob position={[0, 720, -1760]} scale={[3600, 1040, 360]} color="#7fd0ff" opacity={0.2} />
      <SkyWashBlob position={[0, 250, -1650]} scale={[3400, 520, 320]} color="#d9f6ff" opacity={0.13} />
      <SkyWashBlob position={[-1460, 290, -340]} scale={[320, 900, 520]} color="#c7f0ff" opacity={0.12} yaw={0.12} />
      <SkyWashBlob position={[1510, 300, -220]} scale={[320, 940, 560]} color="#b8ecff" opacity={0.1} yaw={-0.14} />
      <SkyBrushStroke position={[-1540, 430, -1280]} scale={[260, 20, 32]} yaw={0.18} roll={0.08} opacity={0.13} />
      <SkyBrushStroke position={[1540, 408, -1080]} scale={[230, 17, 30]} yaw={-0.28} roll={-0.05} opacity={0.12} />
      <SkyBrushStroke position={[1360, 438, 980]} scale={[280, 18, 34]} yaw={0.22} roll={0.04} color="#fff6d6" opacity={0.11} />
      <SkyBrushStroke position={[-1540, 352, 900]} scale={[220, 16, 30]} yaw={-0.18} roll={-0.06} opacity={0.1} />

      <ToonSunburst position={[-1620, 680, -1840]} yaw={0.08} scale={0.86} />

      <CloudGarland position={[-980, 650, -1760]} yaw={-0.08} scale={1.05} />
      <CloudGarland position={[960, 594, -1720]} yaw={0.2} scale={0.9} />
      <DistantCloudBank position={[-1180, 326, -1760]} yaw={0.12} scale={0.92} warmth={1} />
      <DistantCloudBank position={[880, 312, -1740]} yaw={-0.18} scale={0.76} />
      <DistantCloudBank position={[1540, 292, 860]} yaw={0.24} scale={0.58} warmth={1} />
      <DistantCloudBank position={[-1640, 304, 680]} yaw={-0.28} scale={0.56} />
      <ToonCloud position={[-1640, 500, -1060]} scale={[190, 82, 86]} yaw={0.28} warmth={1} depth={1.2} />
      <ToonCloud position={[1600, 468, -900]} scale={[172, 72, 78]} yaw={-0.36} depth={1.16} />
      <ToonCloud position={[-1690, 410, -140]} scale={[154, 62, 68]} yaw={0.18} />
      <ToonCloud position={[1580, 660, 260]} scale={[218, 90, 92]} yaw={0.12} warmth={1} depth={1.28} />
      <ToonCloud position={[-1520, 526, 760]} scale={[184, 76, 84]} yaw={-0.22} />
      <ToonCloud position={[360, 500, 1060]} scale={[210, 84, 92]} yaw={0.18} warmth={1} depth={1.22} />
      <ToonCloud position={[1400, 392, 1010]} scale={[132, 52, 58]} yaw={-0.08} />
      <ToonCloud position={[-260, 420, -1660]} scale={[118, 48, 52]} yaw={0.24} warmth={1} />
      <ToonCloud position={[1360, 406, -1280]} scale={[112, 44, 48]} yaw={-0.18} />
      <ToonCloud position={[-1540, 326, -680]} scale={[128, 44, 50]} yaw={0.16} warmth={1} depth={1.08} />
      <ToonCloud position={[1280, 318, -640]} scale={[120, 40, 46]} yaw={0.26} warmth={1} />
      <ToonCloud position={[-1600, 306, 260]} scale={[122, 40, 48]} yaw={-0.18} />
      <ToonCloud position={[1320, 318, 620]} scale={[142, 46, 52]} yaw={0.2} warmth={1} depth={1.1} />
    </group>
  )
}

export function LongApproachArena() {
  return (
    <group>
      <SkyAtmosphere />
      <ambientLight intensity={0.78} color="#fff4d6" />
      <hemisphereLight args={['#fff4be', '#69c5dc', 0.74]} />
      <directionalLight position={[-240, 360, 180]} intensity={2.6} color="#fff1b8" />
      <directionalLight position={[240, 180, -220]} intensity={0.82} color="#88eaff" />

      <mesh position={[0, FLOOR_Y - 10, -120]} rotation={[-Math.PI / 2, 0, 0]} scale={[3200, 2600, 1]} renderOrder={-40}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#4fae3f" side={THREE.DoubleSide} />
      </mesh>
      <HillUndersideFill />
      <SolidTerrainGround />
      <TerrainInkHatching />
      <TerrainContourBands />
      <PathInkLines />
      <NorthwestLakeFeature />

      {LEVEL_SURFACES.filter((surface) => surface.kind === 'cave').map((surface) => (
        <SurfaceBlock key={surface.id} surface={surface} />
      ))}
      <CompletedMuseumDestination />
      <DepartureTrainStation />
      <MagicalMushroomFlowerForest />
      <RedShellCritterNpcLayer />
      <MapFoliageScatter />
      <PathsideNaturalDetailScatter />
    </group>
  )
}
