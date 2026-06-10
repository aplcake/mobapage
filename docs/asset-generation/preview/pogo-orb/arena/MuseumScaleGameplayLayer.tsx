import * as THREE from 'three'
import {
  MUSEUM_SCALE_FLOOR_Y,
  type MuseumHoppablePlatform,
  type MuseumSolidCollider,
  type MuseumWaterBoundary,
} from './MuseumScalePathGrassArena'

export type MuseumGameplayGlyphId = 'promenade' | 'pond' | 'sign'

export type MuseumGameplayProgress = {
  collectedGlyphIds: MuseumGameplayGlyphId[]
  finishTriggered: boolean
}

export type MuseumGameplayGlyph = {
  id: MuseumGameplayGlyphId
  label: string
  x: number
  z: number
  height: number
  radius: number
  heightTolerance: number
  color: string
}

export type MuseumDoorSeal = {
  id: string
  x: number
  z: number
  minHeight: number
  radius: number
}

type GameplayPlatform = MuseumHoppablePlatform & {
  visual:
    | 'plaque'
    | 'pond-stone'
    | 'pond-rim'
    | 'planter'
    | 'plinth'
    | 'sign'
    | 'door-helper'
    | 'bench'
    | 'vista-plinth'
  color: string
  topColor: string
}

type RoutePlanterSpec = {
  id: string
  x: number
  z: number
  yaw: number
  radius: number
  height: number
  leafScale: [number, number, number]
  color: string
  topColor: string
  leafColor: string
  colliderRadius: number
  clearHeight: number
}

const GAMEPLAY_PALETTE = {
  ink: '#17121f',
  stone: '#d8ddcf',
  stoneWarm: '#efe3b5',
  cyanStone: '#bfdee3',
  mauveStone: '#d8b6db',
  water: '#67c8d3',
  waterDeep: '#4aa4ba',
  planter: '#d9bd7c',
  planterSide: '#a88557',
  leaf: '#75a957',
  leafLight: '#b9d979',
  signPost: '#c4a06a',
  signFace: '#fff3be',
  signTop: '#9cc9ce',
  bench: '#b88b58',
  benchLight: '#e5c27b',
  socketStone: '#e5ddbd',
  socketInactive: '#7a7283',
  brass: '#d8b455',
  brassLight: '#fff0a7',
  lensGlass: '#83f5ff',
  cyanGlyph: '#78ffe2',
  goldGlyph: '#ffe269',
  pinkGlyph: '#ff7bf0',
} as const

const PLAQUE_PLATFORMS: GameplayPlatform[] = [
  { id: 'plaque-hop-1', label: 'museum plaque', visual: 'plaque', shape: 'box', x: -34, z: 222, halfX: 9.4, halfZ: 6.2, height: 0.8, yaw: -0.1, color: GAMEPLAY_PALETTE.stoneWarm, topColor: GAMEPLAY_PALETTE.cyanStone },
  { id: 'plaque-hop-2', label: 'museum plaque', visual: 'plaque', shape: 'box', x: -12, z: 195, halfX: 9.2, halfZ: 6.1, height: 1.1, yaw: 0.14, color: GAMEPLAY_PALETTE.stone, topColor: GAMEPLAY_PALETTE.mauveStone },
  { id: 'plaque-hop-3', label: 'museum plaque', visual: 'plaque', shape: 'box', x: 14, z: 166, halfX: 9.2, halfZ: 6.1, height: 1.4, yaw: -0.08, color: GAMEPLAY_PALETTE.cyanStone, topColor: GAMEPLAY_PALETTE.stoneWarm },
  { id: 'plaque-hop-4', label: 'museum plaque', visual: 'plaque', shape: 'box', x: 38, z: 137, halfX: 10.2, halfZ: 6.7, height: 1.2, yaw: 0.08, color: GAMEPLAY_PALETTE.mauveStone, topColor: GAMEPLAY_PALETTE.stone },
]

const POND_PLATFORMS: GameplayPlatform[] = [
  { id: 'pond-rim-near', label: 'pond rim', visual: 'pond-rim', shape: 'box', x: -125, z: 57, halfX: 42, halfZ: 6.4, height: 1.0, color: GAMEPLAY_PALETTE.stoneWarm, topColor: GAMEPLAY_PALETTE.stone },
  { id: 'pond-rim-far', label: 'pond rim', visual: 'pond-rim', shape: 'box', x: -125, z: -7, halfX: 42, halfZ: 6.4, height: 1.0, color: GAMEPLAY_PALETTE.stoneWarm, topColor: GAMEPLAY_PALETTE.stone },
  { id: 'pond-rim-left', label: 'pond rim', visual: 'pond-rim', shape: 'box', x: -168, z: 25, halfX: 6.4, halfZ: 27, height: 1.0, color: GAMEPLAY_PALETTE.stoneWarm, topColor: GAMEPLAY_PALETTE.stone },
  { id: 'pond-rim-right', label: 'pond rim', visual: 'pond-rim', shape: 'box', x: -82, z: 25, halfX: 6.4, halfZ: 27, height: 1.0, color: GAMEPLAY_PALETTE.stoneWarm, topColor: GAMEPLAY_PALETTE.stone },
  { id: 'pond-stone-1', label: 'pond stone', visual: 'pond-stone', shape: 'circle', x: -105, z: 42, halfX: 7.2, halfZ: 7.2, radius: 7.2, height: 0.9, yaw: 0.2, color: GAMEPLAY_PALETTE.stone, topColor: GAMEPLAY_PALETTE.cyanStone },
  { id: 'pond-stone-2', label: 'pond stone', visual: 'pond-stone', shape: 'circle', x: -128, z: 18, halfX: 8.2, halfZ: 8.2, radius: 8.2, height: 1.15, yaw: -0.22, color: GAMEPLAY_PALETTE.mauveStone, topColor: GAMEPLAY_PALETTE.stoneWarm },
  { id: 'pond-stone-3', label: 'pond stone', visual: 'pond-stone', shape: 'circle', x: -151, z: -8, halfX: 7.6, halfZ: 7.6, radius: 7.6, height: 1.25, yaw: 0.34, color: GAMEPLAY_PALETTE.stone, topColor: GAMEPLAY_PALETTE.cyanStone },
]

const SIGN_CLIMB_PLATFORMS: GameplayPlatform[] = [
  { id: 'sign-climb-planter-1', label: 'planter step', visual: 'planter', shape: 'circle', x: 105, z: -118, halfX: 9, halfZ: 9, radius: 9, height: 1.6, color: GAMEPLAY_PALETTE.planterSide, topColor: GAMEPLAY_PALETTE.leafLight },
  { id: 'sign-climb-plinth-1', label: 'stone plinth', visual: 'plinth', shape: 'box', x: 122, z: -148, halfX: 11, halfZ: 8.6, height: 3.2, yaw: -0.08, color: GAMEPLAY_PALETTE.stone, topColor: GAMEPLAY_PALETTE.mauveStone },
  { id: 'sign-climb-sign-base', label: 'museum sign base', visual: 'sign', shape: 'box', x: 138, z: -178, halfX: 13, halfZ: 6.2, height: 5.0, yaw: 0.08, color: GAMEPLAY_PALETTE.signPost, topColor: GAMEPLAY_PALETTE.signFace },
  { id: 'sign-climb-sign-top', label: 'museum sign top', visual: 'sign', shape: 'box', x: 154, z: -210, halfX: 15.5, halfZ: 5.4, height: 7.2, yaw: -0.06, color: GAMEPLAY_PALETTE.signPost, topColor: GAMEPLAY_PALETTE.signTop },
]

const DOOR_HELPER_PLATFORMS: GameplayPlatform[] = [
  { id: 'forecourt-left-helper-plinth', label: 'door plinth', visual: 'door-helper', shape: 'box', x: -54, z: -516, halfX: 15, halfZ: 9, height: 14.6, yaw: 0.04, color: GAMEPLAY_PALETTE.stoneWarm, topColor: GAMEPLAY_PALETTE.cyanStone },
  { id: 'forecourt-right-helper-plinth', label: 'door plinth', visual: 'door-helper', shape: 'box', x: 54, z: -516, halfX: 15, halfZ: 9, height: 14.6, yaw: -0.04, color: GAMEPLAY_PALETTE.stoneWarm, topColor: GAMEPLAY_PALETTE.mauveStone },
]

const ROUTE_BENCH_PLATFORMS: GameplayPlatform[] = [
  { id: 'arrival-left-bench', label: 'route bench', visual: 'bench', shape: 'box', x: -84, z: 276, halfX: 18, halfZ: 4.8, height: 2.25, yaw: -0.2, color: GAMEPLAY_PALETTE.bench, topColor: GAMEPLAY_PALETTE.benchLight },
  { id: 'right-promenade-bench', label: 'route bench', visual: 'bench', shape: 'box', x: 88, z: 22, halfX: 18, halfZ: 4.8, height: 2.35, yaw: 0.18, color: GAMEPLAY_PALETTE.bench, topColor: GAMEPLAY_PALETTE.benchLight },
  { id: 'bridge-left-bench', label: 'route bench', visual: 'bench', shape: 'box', x: -82, z: -326, halfX: 20, halfZ: 4.8, height: 2.45, yaw: -0.04, color: GAMEPLAY_PALETTE.bench, topColor: GAMEPLAY_PALETTE.benchLight },
  { id: 'forecourt-right-bench', label: 'route bench', visual: 'bench', shape: 'box', x: 88, z: -442, halfX: 19, halfZ: 4.8, height: 2.45, yaw: 0.12, color: GAMEPLAY_PALETTE.bench, topColor: GAMEPLAY_PALETTE.benchLight },
]

const VISTA_PLATFORMS: GameplayPlatform[] = [
  { id: 'vista-viewer-step', label: 'vista viewer step', visual: 'plinth', shape: 'circle', x: -42, z: 92, halfX: 7.8, halfZ: 7.8, radius: 7.8, height: 1.25, yaw: 0.12, color: GAMEPLAY_PALETTE.stoneWarm, topColor: GAMEPLAY_PALETTE.cyanStone },
  { id: 'vista-viewer-plinth', label: 'vista viewer plinth', visual: 'vista-plinth', shape: 'circle', x: -58, z: 62, halfX: 12.4, halfZ: 12.4, radius: 12.4, height: 3.65, yaw: -0.18, color: GAMEPLAY_PALETTE.mauveStone, topColor: GAMEPLAY_PALETTE.stoneWarm },
]

export const MUSEUM_GAMEPLAY_PLATFORMS: GameplayPlatform[] = [
  ...PLAQUE_PLATFORMS,
  ...POND_PLATFORMS,
  ...SIGN_CLIMB_PLATFORMS,
  ...DOOR_HELPER_PLATFORMS,
  ...ROUTE_BENCH_PLATFORMS,
  ...VISTA_PLATFORMS,
]

const ROUTE_PLANTERS: RoutePlanterSpec[] = [
  { id: 'arrival-left-planter', x: -118, z: 306, yaw: 0.16, radius: 7.8, height: 3.8, leafScale: [7.8, 3.6, 6.2], color: GAMEPLAY_PALETTE.planterSide, topColor: GAMEPLAY_PALETTE.planter, leafColor: GAMEPLAY_PALETTE.leafLight, colliderRadius: 8.8, clearHeight: 5.5 },
  { id: 'arrival-right-planter', x: 114, z: 242, yaw: -0.12, radius: 8.4, height: 4.0, leafScale: [8.8, 4.1, 6.8], color: GAMEPLAY_PALETTE.planterSide, topColor: GAMEPLAY_PALETTE.planter, leafColor: GAMEPLAY_PALETTE.leaf, colliderRadius: 9.5, clearHeight: 5.8 },
  { id: 'pond-route-planter', x: -94, z: 102, yaw: 0.34, radius: 7.4, height: 3.5, leafScale: [7.7, 3.4, 6.0], color: GAMEPLAY_PALETTE.planterSide, topColor: GAMEPLAY_PALETTE.planter, leafColor: GAMEPLAY_PALETTE.leafLight, colliderRadius: 8.4, clearHeight: 5.2 },
  { id: 'sign-route-planter', x: 96, z: -86, yaw: -0.28, radius: 7.2, height: 3.4, leafScale: [7.4, 3.3, 5.8], color: GAMEPLAY_PALETTE.planterSide, topColor: GAMEPLAY_PALETTE.planter, leafColor: GAMEPLAY_PALETTE.leaf, colliderRadius: 8.2, clearHeight: 5.1 },
  { id: 'forecourt-left-planter', x: -92, z: -448, yaw: 0.08, radius: 9.0, height: 4.5, leafScale: [9.8, 4.4, 7.2], color: GAMEPLAY_PALETTE.planterSide, topColor: GAMEPLAY_PALETTE.planter, leafColor: GAMEPLAY_PALETTE.leafLight, colliderRadius: 10.2, clearHeight: 6.2 },
  { id: 'forecourt-right-planter', x: 104, z: -474, yaw: -0.12, radius: 8.4, height: 4.2, leafScale: [9.0, 4.0, 6.8], color: GAMEPLAY_PALETTE.planterSide, topColor: GAMEPLAY_PALETTE.planter, leafColor: GAMEPLAY_PALETTE.leaf, colliderRadius: 9.6, clearHeight: 6.0 },
]

export const MUSEUM_GAMEPLAY_COLLIDERS: MuseumSolidCollider[] = [
  ...ROUTE_PLANTERS.map((planter) => ({
    id: `${planter.id}-collider`,
    kind: 'circle' as const,
    x: planter.x,
    z: planter.z,
    radius: planter.colliderRadius,
    clearHeight: planter.clearHeight,
    bounce: 0.04,
  })),
]

export const MUSEUM_GAMEPLAY_WATER_BOUNDARIES: MuseumWaterBoundary[] = [
  { id: 'pond-basin-water', label: 'pond water', x: -125, z: 25, halfX: 39, halfZ: 27 },
]

export const REQUIRED_MUSEUM_GAMEPLAY_GLYPH_IDS: MuseumGameplayGlyphId[] = ['promenade', 'pond', 'sign']

export const EMPTY_MUSEUM_GAMEPLAY_PROGRESS: MuseumGameplayProgress = {
  collectedGlyphIds: [],
  finishTriggered: false,
}

export const MUSEUM_GAMEPLAY_GLYPHS: MuseumGameplayGlyph[] = [
  { id: 'promenade', label: 'Promenade glyph', x: 48, z: 116, height: 2.4, radius: 8.4, heightTolerance: 3.6, color: GAMEPLAY_PALETTE.cyanGlyph },
  { id: 'pond', label: 'Pond glyph', x: -154, z: -10, height: 2.4, radius: 8.8, heightTolerance: 3.8, color: GAMEPLAY_PALETTE.goldGlyph },
  { id: 'sign', label: 'Sign glyph', x: 154, z: -214, height: 8.4, radius: 9.2, heightTolerance: 4.0, color: GAMEPLAY_PALETTE.pinkGlyph },
]

export const MUSEUM_DOOR_SEAL: MuseumDoorSeal = {
  id: 'museum-door-seal',
  x: 0,
  z: -520,
  minHeight: 12.0,
  radius: 29,
}

function progressOrDefault(progress?: MuseumGameplayProgress) {
  return progress ?? EMPTY_MUSEUM_GAMEPLAY_PROGRESS
}

export function hasMuseumGameplayGlyph(progress: MuseumGameplayProgress | undefined, id: MuseumGameplayGlyphId) {
  return progressOrDefault(progress).collectedGlyphIds.includes(id)
}

export function isMuseumDoorSealActive(progress?: MuseumGameplayProgress) {
  const safeProgress = progressOrDefault(progress)
  return REQUIRED_MUSEUM_GAMEPLAY_GLYPH_IDS.every((id) => safeProgress.collectedGlyphIds.includes(id))
}

export function canCollectMuseumGameplayGlyph(
  glyph: MuseumGameplayGlyph,
  position: { x: number; z: number },
  jumpHeight: number,
  collected: boolean,
) {
  if (collected) return false

  const distance = Math.hypot(position.x - glyph.x, position.z - glyph.z)
  const heightDelta = Math.abs(jumpHeight - glyph.height)
  return distance <= glyph.radius && heightDelta <= glyph.heightTolerance
}

export function canTriggerMuseumDoorSeal(
  doorSeal: MuseumDoorSeal,
  position: { x: number; z: number },
  jumpHeight: number,
  active: boolean,
  completed: boolean,
) {
  if (!active || completed || jumpHeight < doorSeal.minHeight) return false

  return Math.hypot(position.x - doorSeal.x, position.z - doorSeal.z) <= doorSeal.radius
}

function OutlinedGameplayBox({
  platform,
  outlineScale = 1.035,
}: {
  platform: GameplayPlatform
  outlineScale?: number
}) {
  const y = MUSEUM_SCALE_FLOOR_Y + platform.height * 0.5
  const height = Math.max(0.24, platform.height)

  return (
    <group position={[platform.x, 0, platform.z]} rotation={[0, platform.yaw ?? 0, 0]}>
      <mesh position={[0, y, 0]} scale={[platform.halfX * 2, height, platform.halfZ * 2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={platform.color} />
      </mesh>
      <mesh position={[0, y, 0]} scale={[platform.halfX * 2 * outlineScale, height * 1.03, platform.halfZ * 2 * outlineScale]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={GAMEPLAY_PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, MUSEUM_SCALE_FLOOR_Y + platform.height + 0.09, 0]} scale={[platform.halfX * 1.55, 0.12, platform.halfZ * 1.35]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={platform.topColor} />
      </mesh>
    </group>
  )
}

function GameplayBench({ platform }: { platform: GameplayPlatform }) {
  const y = MUSEUM_SCALE_FLOOR_Y + platform.height
  const length = platform.halfX * 2
  const depth = platform.halfZ * 2

  return (
    <group position={[platform.x, 0, platform.z]} rotation={[0, platform.yaw ?? 0, 0]}>
      <mesh position={[0, y - 0.32, 0]} scale={[length, 0.64, depth]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={platform.color} />
      </mesh>
      <mesh position={[0, y - 0.32, 0]} scale={[length * 1.045, 0.7, depth * 1.08]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={GAMEPLAY_PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, y + 0.05, 0]} scale={[length * 0.88, 0.12, depth * 0.72]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={platform.topColor} />
      </mesh>
      {[-0.62, 0.62].map((xSide) =>
        [-0.48, 0.48].map((zSide) => (
          <mesh
            key={`${xSide}-${zSide}`}
            position={[xSide * platform.halfX, MUSEUM_SCALE_FLOOR_Y + (platform.height - 0.64) * 0.5, zSide * platform.halfZ]}
            scale={[1.35, Math.max(0.6, platform.height - 0.64), 1.15]}
          >
            <cylinderGeometry args={[1, 0.82, 1, 10]} />
            <meshToonMaterial color={GAMEPLAY_PALETTE.planterSide} />
          </mesh>
        )),
      )}
    </group>
  )
}

function OutlinedGameplayCylinder({ platform }: { platform: GameplayPlatform }) {
  const radius = platform.radius ?? Math.max(platform.halfX, platform.halfZ)
  const height = Math.max(0.24, platform.height)

  return (
    <group position={[platform.x, 0, platform.z]} rotation={[0, platform.yaw ?? 0, 0]}>
      <mesh position={[0, MUSEUM_SCALE_FLOOR_Y + height * 0.5, 0]} scale={[radius, height, radius * 0.86]}>
        <cylinderGeometry args={[1, 1.05, 1, 26]} />
        <meshToonMaterial color={platform.color} />
      </mesh>
      <mesh position={[0, MUSEUM_SCALE_FLOOR_Y + height * 0.5, 0]} scale={[radius * 1.045, height * 1.03, radius * 0.9]}>
        <cylinderGeometry args={[1, 1.05, 1, 26]} />
        <meshBasicMaterial color={GAMEPLAY_PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, MUSEUM_SCALE_FLOOR_Y + height + 0.08, 0]} scale={[radius * 0.74, 0.12, radius * 0.62]}>
        <cylinderGeometry args={[1, 1, 1, 24]} />
        <meshToonMaterial color={platform.topColor} />
      </mesh>
      {platform.visual === 'planter' ? (
        <mesh position={[0, MUSEUM_SCALE_FLOOR_Y + height + 1.0, 0]} scale={[radius * 0.7, 1.35, radius * 0.52]}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshToonMaterial color={GAMEPLAY_PALETTE.leafLight} />
        </mesh>
      ) : null}
    </group>
  )
}

function PondWater() {
  return (
    <group position={[-125, MUSEUM_SCALE_FLOOR_Y + 0.045, 25]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[46, 34, 1]}>
        <circleGeometry args={[1, 56]} />
        <meshBasicMaterial color={GAMEPLAY_PALETTE.waterDeep} transparent opacity={0.42} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0.18]} scale={[35, 23, 1]}>
        <circleGeometry args={[1, 44]} />
        <meshBasicMaterial color={GAMEPLAY_PALETTE.water} transparent opacity={0.42} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function RoutePlanter({ planter }: { planter: RoutePlanterSpec }) {
  const baseY = MUSEUM_SCALE_FLOOR_Y + planter.height * 0.5

  return (
    <group position={[planter.x, 0, planter.z]} rotation={[0, planter.yaw, 0]}>
      <mesh position={[0, baseY, 0]} scale={[planter.radius, planter.height, planter.radius * 0.84]}>
        <cylinderGeometry args={[1, 1.08, 1, 18]} />
        <meshToonMaterial color={planter.color} />
      </mesh>
      <mesh position={[0, baseY, 0]} scale={[planter.radius * 1.06, planter.height * 1.04, planter.radius * 0.9]}>
        <cylinderGeometry args={[1, 1.08, 1, 18]} />
        <meshBasicMaterial color={GAMEPLAY_PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, MUSEUM_SCALE_FLOOR_Y + planter.height + 0.2, 0]} scale={[planter.radius * 0.78, 0.26, planter.radius * 0.64]}>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshToonMaterial color={planter.topColor} />
      </mesh>
      <mesh position={[-planter.radius * 0.1, MUSEUM_SCALE_FLOOR_Y + planter.height + planter.leafScale[1] * 0.35, 0]} scale={planter.leafScale}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshToonMaterial color={planter.leafColor} />
      </mesh>
      <mesh position={[planter.radius * 0.34, MUSEUM_SCALE_FLOOR_Y + planter.height + planter.leafScale[1] * 0.22, -planter.radius * 0.18]} scale={[planter.leafScale[0] * 0.58, planter.leafScale[1] * 0.62, planter.leafScale[2] * 0.6]}>
        <sphereGeometry args={[1, 14, 8]} />
        <meshToonMaterial color={GAMEPLAY_PALETTE.leafLight} />
      </mesh>
    </group>
  )
}

function RouteAffordanceProps() {
  return (
    <group>
      {ROUTE_PLANTERS.map((planter) => (
        <RoutePlanter key={planter.id} planter={planter} />
      ))}
    </group>
  )
}

function GameplayPlatforms() {
  return (
    <group>
      {MUSEUM_GAMEPLAY_PLATFORMS.map((platform) =>
        platform.visual === 'bench' ? (
          <GameplayBench key={platform.id} platform={platform} />
        ) : platform.shape === 'circle' ? (
          <OutlinedGameplayCylinder key={platform.id} platform={platform} />
        ) : (
          <OutlinedGameplayBox key={platform.id} platform={platform} />
        ),
      )}
    </group>
  )
}

export function MuseumScaleGameplayLayer({ progress }: { progress?: MuseumGameplayProgress }) {
  void progress

  return (
    <group>
      <PondWater />
      <GameplayPlatforms />
      <RouteAffordanceProps />
    </group>
  )
}
