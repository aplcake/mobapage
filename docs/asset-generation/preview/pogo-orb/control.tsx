import { Canvas, useFrame } from '@react-three/fiber'
import { type PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import {
  PsychedelicPogoOrbAsset,
  type PsychedelicPogoOrbAnimation,
  type PsychedelicPogoOrbExpression,
} from '../../code-examples/PsychedelicPogoOrbAsset.example'
import {
  MuseumScalePathGrassArena,
  MUSEUM_SCALE_ARENA_MODEL,
  MUSEUM_SCALE_PATH,
  MUSEUM_SCALE_ROOM_LIMIT,
  MUSEUM_SCALE_START_POSITION,
  MUSEUM_HOPPABLE_PLATFORMS,
  MUSEUM_SOLID_COLLIDERS,
  MUSEUM_SLOPE_SURFACES,
  MUSEUM_WALKABLE_SURFACES,
  MUSEUM_WATER_BOUNDARIES,
  type MuseumSlopeSurface,
  type MuseumSolidCollider,
  type MuseumWalkableSurface,
  type MuseumWaterBoundary,
} from './arena/MuseumScalePathGrassArena'
import {
  canCollectMuseumGameplayGlyph,
  canTriggerMuseumDoorSeal,
  EMPTY_MUSEUM_GAMEPLAY_PROGRESS,
  isMuseumDoorSealActive,
  MUSEUM_DOOR_SEAL,
  MUSEUM_GAMEPLAY_COLLIDERS,
  MUSEUM_GAMEPLAY_GLYPHS,
  MUSEUM_GAMEPLAY_PLATFORMS,
  MUSEUM_GAMEPLAY_WATER_BOUNDARIES,
  MuseumScaleGameplayLayer,
  REQUIRED_MUSEUM_GAMEPLAY_GLYPH_IDS,
  type MuseumGameplayGlyphId,
  type MuseumGameplayProgress,
} from './arena/MuseumScaleGameplayLayer'

type CameraMode = 'follow' | 'overhead'

declare global {
  interface Window {
    __pogoControlState?: {
      x: number
      z: number
      height: number
      visualHeight: number
      groundHeight: number
      maxStandingJumpHeight: number
      maxRunningJumpHeight: number
      renderHeight: number
      landingCushion: number
      phaseOverride?: number
      ballMoveState: BallMoveState['kind']
      grounded: boolean
      animation: PsychedelicPogoOrbAnimation
      speed: number
      levelModel: string
      arenaPhase: string
      pathWidth: number
      pathLength: number
      pathToEnjoyableRatio: number
      surface: string
      cameraMode: CameraMode
      glyphCount: number
      requiredGlyphCount: number
      doorSealActive: boolean
      finishTriggered: boolean
    }
  }
}

type InputState = {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  run: boolean
  jump: boolean
  reset: boolean
}

type AvatarReadout = {
  animation: PsychedelicPogoOrbAnimation
  activity: number
  speed: number
  height: number
  groundHeight: number
  grounded: boolean
  surface: string
  glyphCount: number
  requiredGlyphCount: number
  doorSealActive: boolean
  finishTriggered: boolean
}

type CameraOrbit = {
  yaw: number
  pitch: number
  mode: CameraMode
}

type ControlAvatarProps = {
  animation: PsychedelicPogoOrbAnimation
  activity: number
  expression: PsychedelicPogoOrbExpression
  phaseOverride?: number
  transitionFromAnimation?: PsychedelicPogoOrbAnimation
  transitionFromActivity?: number
  transitionFromPhaseOverride?: number
  transitionBlend: number
}

type TransitionState = {
  fromAnimation: PsychedelicPogoOrbAnimation
  fromActivity: number
  fromPhaseOverride?: number
  elapsed: number
  duration: number
}

type StopState = {
  fromAnimation: PsychedelicPogoOrbAnimation
  elapsed: number
  duration: number
  startSpeed: number
}

type BallMoveState =
  | { kind: 'none' }
  | { kind: 'morph-charge'; elapsed: number; duration: number; wasMoving: boolean }
  | { kind: 'dive'; elapsed: number; wasMoving: boolean }
  | { kind: 'impact-rebound'; elapsed: number; duration: number; wasMoving: boolean }
  | { kind: 'unroll'; elapsed: number; duration: number; wasMoving: boolean }

type CourseCollider = MuseumSolidCollider
type CourseSlopeSurface = MuseumSlopeSurface
type CourseGroundContact = {
  height: number
  platform?: CourseStepPlatform
  slope?: CourseSlopeSurface
  propSlope?: CourseStepPlatform
}

type CourseStepPlatform = {
  id: string
  x: number
  z: number
  halfX: number
  halfZ: number
  shape?: 'box' | 'circle'
  radius?: number
  yaw?: number
  label?: string
  visual?: boolean
  height: number
  color: string
  topColor: string
  variant?:
    | 'block'
    | 'slab'
    | 'catch'
    | 'beam'
    | 'tower'
    | 'pillar'
    | 'roof'
    | 'finish'
    | 'walkway'
    | 'stair'
    | 'landing'
    | 'bench'
    | 'lily'
    | 'stone'
    | 'boulder'
    | 'sign'
    | 'canopy'
    | 'ledge'
}

type MuseumGlyphId = 'pond' | 'sign-boulder' | 'fern-ledge'

type MuseumGlyph = {
  id: MuseumGlyphId
  label: string
  x: number
  z: number
  height: number
  color: string
}

type MuseumProgress = {
  collectedTokenIds: MuseumGlyphId[]
  finishTriggered: boolean
}

const EMPTY_MUSEUM_PROGRESS: MuseumProgress = {
  collectedTokenIds: [],
  finishTriggered: false,
}

const FLOOR_Y = -2.075
const ROOM_LIMIT = MUSEUM_SCALE_ROOM_LIMIT
const WALK_SPEED = 13.46
const RUN_SPEED = 22.65
const ACCELERATION = 22
const BRAKE = 9.5
const STOP_BRAKE = 4.8
const AIR_ACCELERATION = 5.6
const AIR_DRAG = 0.62
const LEDGE_FALL_DRAG = 1.05
const TURN_SMOOTHING = 15
const GRAVITY = 24
const STANDING_JUMP_TARGET_APEX_HEIGHT = 7.45
const RUNNING_JUMP_TARGET_APEX_HEIGHT = 8.85
const JUMP_SPEED = Math.sqrt(2 * GRAVITY * STANDING_JUMP_TARGET_APEX_HEIGHT)
const RUN_JUMP_SPEED_MULTIPLIER = Math.sqrt(RUNNING_JUMP_TARGET_APEX_HEIGHT / STANDING_JUMP_TARGET_APEX_HEIGHT)
const STANDING_JUMP_APEX_HEIGHT = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY)
const RUNNING_JUMP_APEX_HEIGHT = (JUMP_SPEED * RUN_JUMP_SPEED_MULTIPLIER * JUMP_SPEED * RUN_JUMP_SPEED_MULTIPLIER) / (2 * GRAVITY)
const BALL_CHARGE_SECONDS = 0.16
const BALL_DIVE_SPEED = 31.5
const BALL_DIVE_GRAVITY_MULTIPLIER = 1.18
const BALL_REBOUND_APEX_HEIGHT = 10.8
const BALL_REBOUND_SPEED = Math.sqrt(2 * GRAVITY * BALL_REBOUND_APEX_HEIGHT)
const BALL_REBOUND_HORIZONTAL_MULTIPLIER = 1.08
const BALL_REBOUND_HORIZONTAL_BONUS = 2.8
const BALL_REBOUND_MAX_HORIZONTAL_SPEED = RUN_SPEED * 1.18
const BALL_IMPACT_SECONDS = 0.12
const BALL_UNROLL_SECONDS = 0.22
const SKY_LOW_HEIGHT = 6.8
const IDLE_CYCLE_SECONDS = 1.22
const DEFAULT_CAMERA_ZOOM = 2
const DEFAULT_CAMERA_YAW = 0
const DEFAULT_CAMERA_PITCH = 0
const MARIO_CAMERA_SHOULDER_YAW = -0.32
const MARIO_CAMERA_DISTANCE = 10.1
const MARIO_CAMERA_HEIGHT = 4.65
const MARIO_CAMERA_TARGET_HEIGHT = 0.62
const MARIO_CAMERA_MAX_LOOKAHEAD = 2.35
const MUSEUM_CAMERA_IDLE_LOOKAHEAD = 28
const OVERHEAD_CAMERA_BASE_HEIGHT = 660
const OVERHEAD_CAMERA_TARGET_Z = -170
const MIN_CAMERA_ZOOM = 0.72
const MAX_CAMERA_ZOOM = 7.2
const MIN_CAMERA_PITCH = -0.34
const MAX_CAMERA_PITCH = 0.92
const CAMERA_DRAG_YAW_SPEED = 0.006
const CAMERA_DRAG_PITCH_SPEED = 0.0045
const CAMERA_BUTTON_YAW_STEP = Math.PI / 8
const CAMERA_BUTTON_PITCH_STEP = 0.14
const LANDING_VISUAL_SECONDS = 0.15
const RAISED_PLATFORM_FOOTING_SECONDS = 0.045
const HOP_LAUNCH_PHASE = 0.13
const HOP_LANDING_PHASE = 0.95
const HOP_IMPACT_PHASE = 1.006
const HOP_RECOVERY_END_PHASE = 1.105
const RAISED_LANDING_SETTLE_SECONDS = 0.16
const LEDGE_FALL_PHASE_START = 0.1
const LEDGE_FALL_PHASE_END = 0.88
const LEDGE_FALL_MIN_DROP = 0.16
const GROUND_CONTACT_EPSILON = 0.018
const COYOTE_SECONDS = 0.1
const JUMP_BUFFER_SECONDS = 0.11
const RUN_AUTO_THRESHOLD = 16.38
const WALK_STRIDE_UNITS = 6.82
const RUN_STRIDE_UNITS = 10.2
const WALK_CADENCE_BOOST = 0.96
const RUN_CADENCE_BOOST = 1.02
const WALK_BRAKE_CADENCE = 1.05
const RUN_BRAKE_CADENCE = 1.42
const WALK_LANDING_CONTACT_PHASE = 0.035
const RUN_LANDING_CONTACT_PHASE = 0.06
const MOVING_LANDING_STEP_SECONDS = 0.36
const WALK_LANDING_CADENCE = 2.02
const RUN_LANDING_CADENCE = 2.62
const STOP_MIN_SPEED = 0.42
const PLAYER_COLLISION_RADIUS = 0.72
const PLATFORM_TOP_CLEARANCE_GRACE = 0.1
const PLATFORM_SIDE_CLEARANCE_GRACE = 0.22
const PLATFORM_LANDING_CATCH_GRACE = 0.16
const PLATFORM_AIR_LANDING_MARGIN = 0.08
const PLATFORM_TOP_MARGIN = 0.04
const PLATFORM_GROUNDED_SUPPORT_MARGIN = 0.86
const PLATFORM_EDGE_RELEASE_MARGIN = 0.18
const MAX_AUTO_STEP_HEIGHT = 0.44
const GROUNDED_VISUAL_DESCENT_SPEED = 14
const RAISED_LANDING_CUSHION = 0.035
const RAISED_LANDING_CUSHION_SECONDS = 0.08
const RENDERED_HEIGHT_DESCENT_DAMPING = 12
const LEVEL_MODEL = MUSEUM_SCALE_ARENA_MODEL
const LEVEL_MODEL_LABEL = LEVEL_MODEL.replace(/^museum-scale-/, '').replace(/-/g, ' ')
const START_POSITION = MUSEUM_SCALE_START_POSITION.clone()
const MCM_PALETTE = {
  ink: '#17121f',
  sage: '#94B597',
  sageLight: '#b8ccb7',
  path: '#d8e7e8',
  pathShadow: '#aebec3',
  teak: '#A86B45',
  teakShadow: '#74472B',
  teakLight: '#F3A06D',
  mauve: '#8B6878',
  mauveShadow: '#634252',
  glass: '#9EAFBD',
  sign: '#FFF1C5',
  stone: '#8F94B2',
  plantDark: '#2F4D32',
  plantMid: '#6F8A43',
  flowerPink: '#F27CFF',
  flowerYellow: '#F7F774',
  water: '#58bced',
} as const

const STEP_PLATFORMS: CourseStepPlatform[] = [...MUSEUM_HOPPABLE_PLATFORMS, ...MUSEUM_GAMEPLAY_PLATFORMS].map((platform) => ({
  ...platform,
  color: platform.shape === 'circle' ? MCM_PALETTE.stone : MCM_PALETTE.mauve,
  topColor: platform.shape === 'circle' ? MCM_PALETTE.sageLight : MCM_PALETTE.path,
  variant: platform.shape === 'circle' ? 'stone' : 'ledge',
  visual: false,
}))
const CANOPY_ROUTE: CourseStepPlatform[] = []
const COURSE_COLLIDERS: CourseCollider[] = [...MUSEUM_SOLID_COLLIDERS, ...MUSEUM_GAMEPLAY_COLLIDERS]
const COURSE_SLOPES: CourseSlopeSurface[] = [...MUSEUM_SLOPE_SURFACES]
const COURSE_WATER_BOUNDARIES: MuseumWaterBoundary[] = [...MUSEUM_WATER_BOUNDARIES, ...MUSEUM_GAMEPLAY_WATER_BOUNDARIES]

const MUSEUM_GLYPHS: MuseumGlyph[] = [
  { id: 'pond', label: 'Pond glyph', x: -15.95, z: -9.8, height: 1.18, color: '#78ffe2' },
  { id: 'sign-boulder', label: 'Sign glyph', x: 13.9, z: -12.25, height: 2.42, color: '#ffe269' },
  { id: 'fern-ledge', label: 'Fern glyph', x: -15.35, z: -39.6, height: 7.24, color: '#ff7bf0' },
]
const POND_WATER = { x: -16.25, z: -8.25, radiusX: 5.9, radiusZ: 3.95 }
const MUSEUM_GLOW_MOTES = [
  [-0.2, 0.16, 13.2, '#fff36d'],
  [0.3, 0.16, 9.6, '#78ffe2'],
  [-0.15, 0.16, 5.6, '#fff36d'],
  [0.22, 0.16, 1.8, '#78ffe2'],
  [-0.2, 0.16, -2.4, '#fff36d'],
  [-11.8, 0.16, -2.4, '#ff7bf0'],
  [-15.6, 1.22, -3.6, '#fff36d'],
  [-18.8, 0.46, -8.35, '#78ffe2'],
  [10.2, 0.42, -4.4, '#fff36d'],
  [16.4, 1.12, -9.2, '#ff7bf0'],
  [-4.1, 3.44, -33.4, '#78ffe2'],
  [-9.4, 5.74, -36.0, '#fff36d'],
] as const

function isJumpAnimation(animation: PsychedelicPogoOrbAnimation) {
  return (
    animation === 'hop' ||
    animation === 'forward-hop' ||
    animation === 'ball-bounce' ||
    animation === 'forward-ball-bounce' ||
    animation === 'reference-ball-bounce' ||
    animation === 'ledge-fall'
  )
}

function isBallAnimation(animation: PsychedelicPogoOrbAnimation) {
  return animation === 'ball-bounce' || animation === 'forward-ball-bounce' || animation === 'reference-ball-bounce'
}

function isLocomotionAnimation(animation: PsychedelicPogoOrbAnimation) {
  return animation === 'walk-2' || animation === 'run'
}

function transitionDuration(fromAnimation: PsychedelicPogoOrbAnimation, toAnimation: PsychedelicPogoOrbAnimation) {
  if (fromAnimation === toAnimation) return 0
  if (toAnimation === 'stop') return 0.08
  if (fromAnimation === 'stop' && toAnimation === 'idle') return 0.14
  if (fromAnimation === 'stop' && isLocomotionAnimation(toAnimation)) return 0.1
  if (isBallAnimation(toAnimation)) return 0.045
  if (isBallAnimation(fromAnimation)) return 0.12
  if (toAnimation === 'ledge-fall') return 0.08
  if (fromAnimation === 'ledge-fall' && toAnimation === 'idle') return 0.18
  if (fromAnimation === 'ledge-fall' && isLocomotionAnimation(toAnimation)) return 0.2
  if (fromAnimation === 'forward-hop' && (toAnimation === 'walk-2' || toAnimation === 'run')) return 0.24
  if (isLocomotionAnimation(fromAnimation) && toAnimation === 'idle') return 0.38
  if (fromAnimation === 'run' && toAnimation === 'walk-2') return 0.24
  if (fromAnimation === 'walk-2' && toAnimation === 'run') return 0.18
  if (isJumpAnimation(toAnimation)) return 0.1
  if (isJumpAnimation(fromAnimation)) return 0.24
  if (fromAnimation === 'idle' || toAnimation === 'idle') return 0.22
  return 0.16
}

function emptyInput(): InputState {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false,
    jump: false,
    reset: false,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function museumProgressOrDefault(progress: MuseumProgress | undefined) {
  return progress ?? EMPTY_MUSEUM_PROGRESS
}

function hasMuseumGlyph(progress: MuseumProgress | undefined, id: MuseumGlyphId) {
  return museumProgressOrDefault(progress).collectedTokenIds.includes(id)
}

function seededPlatformYaw(platform: CourseStepPlatform) {
  let seed = 0
  for (let index = 0; index < platform.id.length; index += 1) seed += platform.id.charCodeAt(index) * (index + 1)
  return ((seed % 41) - 20) * 0.006
}

function dampFactor(strength: number, delta: number) {
  return 1 - Math.exp(-strength * delta)
}

function getRotatedLocalPoint(x: number, z: number, rect: { x: number; z: number; yaw?: number }) {
  const dx = x - rect.x
  const dz = z - rect.z
  const yaw = rect.yaw ?? 0
  if (Math.abs(yaw) < 0.0001) return { x: dx, z: dz }

  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  return {
    x: cos * dx - sin * dz,
    z: sin * dx + cos * dz,
  }
}

function getRotatedWorldNormal(x: number, z: number, yaw = 0) {
  if (Math.abs(yaw) < 0.0001) return { x, z }

  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  return {
    x: cos * x + sin * z,
    z: -sin * x + cos * z,
  }
}

function pointInMuseumRect(
  x: number,
  z: number,
  rect: MuseumWalkableSurface | MuseumWaterBoundary | Extract<CourseCollider, { kind: 'box' }>,
  margin = 0,
) {
  const local = getRotatedLocalPoint(x, z, rect)
  return Math.abs(local.x) <= rect.halfX + margin && Math.abs(local.z) <= rect.halfZ + margin
}

function pointInCoursePlatform(position: THREE.Vector3, platform: CourseStepPlatform, margin = 0) {
  if (platform.shape === 'circle') {
    const radius = platform.radius ?? Math.max(platform.halfX, platform.halfZ)
    return Math.hypot(position.x - platform.x, position.z - platform.z) <= radius + margin
  }

  const local = getRotatedLocalPoint(position.x, position.z, platform)
  return Math.abs(local.x) <= platform.halfX + margin && Math.abs(local.z) <= platform.halfZ + margin
}

function pointInCourseSlope(position: THREE.Vector3, slope: CourseSlopeSurface, margin = 0) {
  const local = getRotatedLocalPoint(position.x, position.z, slope)
  return Math.abs(local.x) <= slope.halfX + margin && Math.abs(local.z) <= slope.halfZ + margin
}

function getCourseSlopeHeightAt(position: THREE.Vector3, slope: CourseSlopeSurface) {
  const local = getRotatedLocalPoint(position.x, position.z, slope)
  const coordinate = slope.riseAxis === 'x' ? local.x : local.z
  const halfLength = slope.riseAxis === 'x' ? slope.halfX : slope.halfZ
  const progress =
    slope.riseSign === 1
      ? (coordinate + halfLength) / (halfLength * 2)
      : (halfLength - coordinate) / (halfLength * 2)

  return THREE.MathUtils.lerp(slope.lowHeight, slope.highHeight, clamp(progress, 0, 1))
}

function isClimbablePropPlatform(platform: CourseStepPlatform) {
  return platform.id.startsWith('top-bush-') || platform.id.startsWith('top-stone-') || platform.id.startsWith('top-amanita-')
}

function isMuseumRoofRoutePlatform(platform: CourseStepPlatform) {
  return platform.id.startsWith('museum-roof-stair') || platform.id === 'museum-lower-roof-edge'
}

function getAirLandingMarginForPlatform(platform: CourseStepPlatform) {
  return isMuseumRoofRoutePlatform(platform) ? PLAYER_COLLISION_RADIUS * 0.75 : PLATFORM_AIR_LANDING_MARGIN
}

function smoothRamp01(value: number) {
  const amount = clamp(value, 0, 1)
  return amount * amount * (3 - 2 * amount)
}

function getClimbablePropOuterRadius(platform: CourseStepPlatform) {
  const innerRadius = platform.radius ?? Math.max(platform.halfX, platform.halfZ)
  return innerRadius + clamp(platform.height * 2.35, 12, 24)
}

function getClimbablePropRampHeightAt(position: THREE.Vector3, platform: CourseStepPlatform, margin = 0) {
  if (!isClimbablePropPlatform(platform)) return undefined

  const innerRadius = platform.radius ?? Math.max(platform.halfX, platform.halfZ)
  const outerRadius = getClimbablePropOuterRadius(platform)
  const distance = Math.hypot(position.x - platform.x, position.z - platform.z)

  if (distance > outerRadius + margin) return undefined
  if (distance <= innerRadius) return platform.height

  const progress = (outerRadius - distance) / (outerRadius - innerRadius)
  return platform.height * smoothRamp01(progress)
}

function getClimbablePropPlatformForCollider(collider: CourseCollider) {
  return STEP_PLATFORMS.find((platform) => platform.id === `top-${collider.id}` && isClimbablePropPlatform(platform)) ?? null
}

function getMuseumSurface(position: THREE.Vector3) {
  const prioritySurface = MUSEUM_WALKABLE_SURFACES.find(
    (candidate) =>
      (candidate.kind === 'bridge' || candidate.kind === 'forecourt') &&
      pointInMuseumRect(position.x, position.z, candidate, PLAYER_COLLISION_RADIUS * 0.45),
  )
  if (prioritySurface) return prioritySurface

  const surface = MUSEUM_WALKABLE_SURFACES.find((candidate) => pointInMuseumRect(position.x, position.z, candidate, PLAYER_COLLISION_RADIUS * 0.45))
  if (surface) return surface

  return null
}

function getMuseumSurfaceLabel(position: THREE.Vector3) {
  const surface = getMuseumSurface(position)
  if (surface) return surface.label

  const water = COURSE_WATER_BOUNDARIES.find((candidate) => pointInMuseumRect(position.x, position.z, candidate, PLAYER_COLLISION_RADIUS * 0.15))
  return water ? `${water.label} edge` : 'grass'
}

function getPlaySurfaceLabel(position: THREE.Vector3, groundHeight: number) {
  if (groundHeight > GROUND_CONTACT_EPSILON) {
    const platform = getPlatformSupportAtHeight(position, groundHeight, PLATFORM_GROUNDED_SUPPORT_MARGIN)
    if (platform?.label) return platform.label

    const slope = getSlopeSupportAtHeight(position, groundHeight, PLATFORM_GROUNDED_SUPPORT_MARGIN)
    if (slope?.label) return slope.label

    const propSlope = getPropSlopeSupportAtHeight(position, groundHeight, PLATFORM_GROUNDED_SUPPORT_MARGIN)
    if (propSlope?.label) return propSlope.label
  }

  return getMuseumSurfaceLabel(position)
}

function isOnMuseumBridgeOrForecourt(position: THREE.Vector3, margin = PLAYER_COLLISION_RADIUS * 0.45) {
  const onMuseumTraversalSurface = MUSEUM_WALKABLE_SURFACES.some(
    (surface) =>
      (surface.kind === 'bridge' || surface.kind === 'forecourt') &&
      pointInMuseumRect(position.x, position.z, surface, margin),
  )

  if (onMuseumTraversalSurface) return true

  return STEP_PLATFORMS.some(
    (platform) =>
      (platform.label === 'pond rim' || platform.label === 'pond stone') &&
      pointInCoursePlatform(position, platform, margin),
  )
}

function getBlockingMuseumWater(position: THREE.Vector3) {
  if (isOnMuseumBridgeOrForecourt(position)) return null

  return COURSE_WATER_BOUNDARIES.find((water) => pointInMuseumRect(position.x, position.z, water, PLAYER_COLLISION_RADIUS * 0.1)) ?? null
}

function pushOutOfMuseumWater(position: THREE.Vector3, velocity: THREE.Vector3, water: MuseumWaterBoundary) {
  const local = getRotatedLocalPoint(position.x, position.z, water)
  const pushLeft = Math.abs(local.x + water.halfX)
  const pushRight = Math.abs(water.halfX - local.x)
  const pushNear = Math.abs(local.z + water.halfZ)
  const pushFar = Math.abs(water.halfZ - local.z)
  const minPush = Math.min(pushLeft, pushRight, pushNear, pushFar)
  let normal = { x: 0, z: 1 }
  let penetration = PLAYER_COLLISION_RADIUS

  if (minPush === pushLeft) {
    normal = { x: -1, z: 0 }
    penetration += pushLeft
  } else if (minPush === pushRight) {
    normal = { x: 1, z: 0 }
    penetration += pushRight
  } else if (minPush === pushNear) {
    normal = { x: 0, z: -1 }
    penetration += pushNear
  } else {
    normal = { x: 0, z: 1 }
    penetration += pushFar
  }

  const worldNormal = getRotatedWorldNormal(normal.x, normal.z, water.yaw)
  applyCollisionPush(position, velocity, worldNormal.x, worldNormal.z, penetration, 0.04)
}

function resolveMuseumWaterBoundary(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  previousPositionX: number,
  previousPositionZ: number,
) {
  const blockedWater = getBlockingMuseumWater(position)
  if (!blockedWater) return false

  const previousPosition = new THREE.Vector3(previousPositionX, position.y, previousPositionZ)
  const previousBlockedWater = getBlockingMuseumWater(previousPosition)

  if (!previousBlockedWater) {
    position.x = previousPositionX
    position.z = previousPositionZ
    velocity.x *= 0.16
    velocity.z *= 0.16
    return true
  }

  pushOutOfMuseumWater(position, velocity, blockedWater)
  return true
}

function applyCollisionPush(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  normalX: number,
  normalZ: number,
  penetration: number,
  bounce: number,
) {
  position.x += normalX * penetration
  position.z += normalZ * penetration

  const inwardSpeed = velocity.x * normalX + velocity.z * normalZ
  if (inwardSpeed < 0) {
    velocity.x -= normalX * inwardSpeed * (1 + bounce)
    velocity.z -= normalZ * inwardSpeed * (1 + bounce)
  }

  return true
}

function resolveBoxCourseCollision(position: THREE.Vector3, velocity: THREE.Vector3, collider: Extract<CourseCollider, { kind: 'box' }>) {
  const localPosition = getRotatedLocalPoint(position.x, position.z, collider)
  const minX = -collider.halfX
  const maxX = collider.halfX
  const minZ = -collider.halfZ
  const maxZ = collider.halfZ
  const closestX = clamp(localPosition.x, minX, maxX)
  const closestZ = clamp(localPosition.z, minZ, maxZ)
  const deltaX = localPosition.x - closestX
  const deltaZ = localPosition.z - closestZ
  const distanceSq = deltaX * deltaX + deltaZ * deltaZ

  if (distanceSq >= PLAYER_COLLISION_RADIUS * PLAYER_COLLISION_RADIUS) return false

  if (distanceSq > 0.000001) {
    const distance = Math.sqrt(distanceSq)
    const worldNormal = getRotatedWorldNormal(deltaX / distance, deltaZ / distance, collider.yaw)
    return applyCollisionPush(position, velocity, worldNormal.x, worldNormal.z, PLAYER_COLLISION_RADIUS - distance, collider.bounce)
  }

  const toLeft = Math.abs(localPosition.x - minX)
  const toRight = Math.abs(maxX - localPosition.x)
  const toFront = Math.abs(localPosition.z - minZ)
  const toBack = Math.abs(maxZ - localPosition.z)
  const minSide = Math.min(toLeft, toRight, toFront, toBack)

  if (minSide === toLeft) {
    const normal = getRotatedWorldNormal(-1, 0, collider.yaw)
    return applyCollisionPush(position, velocity, normal.x, normal.z, PLAYER_COLLISION_RADIUS + toLeft, collider.bounce)
  } else if (minSide === toRight) {
    const normal = getRotatedWorldNormal(1, 0, collider.yaw)
    return applyCollisionPush(position, velocity, normal.x, normal.z, PLAYER_COLLISION_RADIUS + toRight, collider.bounce)
  } else if (minSide === toFront) {
    const normal = getRotatedWorldNormal(0, -1, collider.yaw)
    return applyCollisionPush(position, velocity, normal.x, normal.z, PLAYER_COLLISION_RADIUS + toFront, collider.bounce)
  } else {
    const normal = getRotatedWorldNormal(0, 1, collider.yaw)
    return applyCollisionPush(position, velocity, normal.x, normal.z, PLAYER_COLLISION_RADIUS + toBack, collider.bounce)
  }
}

function resolveCircleCourseCollision(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  collider: Extract<CourseCollider, { kind: 'circle' }>,
) {
  const deltaX = position.x - collider.x
  const deltaZ = position.z - collider.z
  const radius = PLAYER_COLLISION_RADIUS + collider.radius
  const distanceSq = deltaX * deltaX + deltaZ * deltaZ

  if (distanceSq >= radius * radius) return false

  if (distanceSq <= 0.000001) {
    return applyCollisionPush(position, velocity, 0, 1, radius, collider.bounce)
  }

  const distance = Math.sqrt(distanceSq)
  return applyCollisionPush(position, velocity, deltaX / distance, deltaZ / distance, radius - distance, collider.bounce)
}

function resolveStepPlatformCollisions(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  jumpHeight: number,
  previousGroundHeight: number,
  verticalVelocity: number,
  moving: boolean,
) {
  let collided = false
  const canAutoStepFromCurrentGround = Math.abs(jumpHeight - previousGroundHeight) <= GROUND_CONTACT_EPSILON
  const noInputAirborneDescent =
    !moving && verticalVelocity <= 0 && jumpHeight > previousGroundHeight + GROUND_CONTACT_EPSILON

  for (const platform of STEP_PLATFORMS) {
    if (noInputAirborneDescent) continue

    const roofRouteAirPassThrough =
      isMuseumRoofRoutePlatform(platform) &&
      (verticalVelocity > 0 || jumpHeight > previousGroundHeight + GROUND_CONTACT_EPSILON)
    if (roofRouteAirPassThrough) continue

    const clearsTop = jumpHeight >= platform.height - PLATFORM_SIDE_CLEARANCE_GRACE
    const walkableStep = canAutoStepFromCurrentGround && platform.height > previousGroundHeight && platform.height - previousGroundHeight <= MAX_AUTO_STEP_HEIGHT
    const nearTopFootprint = pointInCoursePlatform(position, platform, PLAYER_COLLISION_RADIUS * 0.7)
    const descendingNearReachableTop =
      verticalVelocity <= 0 &&
      platform.height >= previousGroundHeight - GROUND_CONTACT_EPSILON &&
      platform.height - jumpHeight <= PLATFORM_SIDE_CLEARANCE_GRACE + PLATFORM_LANDING_CATCH_GRACE &&
      nearTopFootprint

    if (clearsTop || walkableStep || descendingNearReachableTop) continue

    if (platform.shape === 'circle') {
      collided =
        resolveCircleCourseCollision(position, velocity, {
          id: platform.id,
          kind: 'circle',
          x: platform.x,
          z: platform.z,
          radius: platform.radius ?? Math.max(platform.halfX, platform.halfZ),
          clearHeight: Math.max(0.02, platform.height - PLATFORM_TOP_CLEARANCE_GRACE),
          bounce: 0.08,
        }) || collided
    } else {
      collided =
        resolveBoxCourseCollision(position, velocity, {
          id: platform.id,
          kind: 'box',
          x: platform.x,
          z: platform.z,
          halfX: platform.halfX,
          halfZ: platform.halfZ,
          yaw: platform.yaw,
          clearHeight: Math.max(0.02, platform.height - PLATFORM_TOP_CLEARANCE_GRACE),
          bounce: 0.08,
        }) || collided
    }
  }

  return collided
}

function resolveSlopeSideCollisions(position: THREE.Vector3, velocity: THREE.Vector3, jumpHeight: number) {
  let collided = false

  for (const slope of COURSE_SLOPES) {
    if (!pointInCourseSlope(position, slope, PLAYER_COLLISION_RADIUS * 0.35)) continue

    const slopeHeight = getCourseSlopeHeightAt(position, slope)
    if (jumpHeight >= slopeHeight - MAX_AUTO_STEP_HEIGHT) continue

    collided =
      resolveBoxCourseCollision(position, velocity, {
        id: slope.id,
        kind: 'box',
        x: slope.x,
        z: slope.z,
        halfX: slope.halfX,
        halfZ: slope.halfZ,
        yaw: slope.yaw,
        clearHeight: Math.max(0.02, slopeHeight - MAX_AUTO_STEP_HEIGHT),
        bounce: 0.045,
      }) || collided
  }

  return collided
}

function resolveCourseCollisions(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  jumpHeight: number,
  previousGroundHeight: number,
  verticalVelocity: number,
  moving: boolean,
) {
  let collided = false

  for (const collider of COURSE_COLLIDERS) {
    if (jumpHeight >= collider.clearHeight) continue

    const climbableProp = getClimbablePropPlatformForCollider(collider)
    const climbableRampHeight = climbableProp
      ? getClimbablePropRampHeightAt(position, climbableProp, PLAYER_COLLISION_RADIUS * 0.4)
      : undefined
    if (climbableRampHeight !== undefined && jumpHeight >= climbableRampHeight - MAX_AUTO_STEP_HEIGHT) continue

    if (collider.kind === 'box') {
      collided = resolveBoxCourseCollision(position, velocity, collider) || collided
    } else {
      collided = resolveCircleCourseCollision(position, velocity, collider) || collided
    }
  }

  collided = resolveSlopeSideCollisions(position, velocity, jumpHeight) || collided
  collided = resolveStepPlatformCollisions(position, velocity, jumpHeight, previousGroundHeight, verticalVelocity, moving) || collided

  return collided
}

function getCourseGroundContact(position: THREE.Vector3, margin = PLATFORM_TOP_MARGIN, maxHeight = Infinity): CourseGroundContact {
  let groundHeight = 0
  let groundPlatform: CourseStepPlatform | undefined
  let groundSlope: CourseSlopeSurface | undefined
  let groundPropSlope: CourseStepPlatform | undefined

  for (const platform of STEP_PLATFORMS) {
    if (platform.height > maxHeight + GROUND_CONTACT_EPSILON) continue

    if (pointInCoursePlatform(position, platform, margin) && platform.height >= groundHeight) {
      groundHeight = platform.height
      groundPlatform = platform
      groundSlope = undefined
      groundPropSlope = undefined
    }

    const propRampHeight = getClimbablePropRampHeightAt(position, platform, margin)
    if (propRampHeight !== undefined && propRampHeight <= maxHeight + GROUND_CONTACT_EPSILON && propRampHeight > groundHeight + 0.001) {
      groundHeight = propRampHeight
      groundPlatform = undefined
      groundSlope = undefined
      groundPropSlope = platform
    }
  }

  for (const slope of COURSE_SLOPES) {
    if (!pointInCourseSlope(position, slope, margin)) continue

    const slopeHeight = getCourseSlopeHeightAt(position, slope)
    if (slopeHeight <= maxHeight + GROUND_CONTACT_EPSILON && slopeHeight >= groundHeight) {
      groundHeight = slopeHeight
      groundPlatform = undefined
      groundSlope = slope
      groundPropSlope = undefined
    }
  }

  return { height: groundHeight, platform: groundPlatform, slope: groundSlope, propSlope: groundPropSlope }
}

function crossedLandingHeight(previousHeight: number, currentHeight: number, candidateHeight: number) {
  const highPoint = Math.max(previousHeight, currentHeight)
  const lowPoint = Math.min(previousHeight, currentHeight)
  return highPoint >= candidateHeight - PLATFORM_LANDING_CATCH_GRACE && lowPoint <= candidateHeight + PLATFORM_LANDING_CATCH_GRACE
}

function getAirLandingContact(position: THREE.Vector3, previousHeight: number, currentHeight: number): CourseGroundContact {
  let groundHeight = 0
  let groundPlatform: CourseStepPlatform | undefined
  let groundSlope: CourseSlopeSurface | undefined
  let groundPropSlope: CourseStepPlatform | undefined

  for (const platform of STEP_PLATFORMS) {
    if (
      crossedLandingHeight(previousHeight, currentHeight, platform.height) &&
      pointInCoursePlatform(position, platform, getAirLandingMarginForPlatform(platform)) &&
      platform.height >= groundHeight
    ) {
      groundHeight = platform.height
      groundPlatform = platform
      groundSlope = undefined
      groundPropSlope = undefined
    }

    const propRampHeight = getClimbablePropRampHeightAt(position, platform, PLATFORM_AIR_LANDING_MARGIN)
    if (
      propRampHeight !== undefined &&
      crossedLandingHeight(previousHeight, currentHeight, propRampHeight) &&
      propRampHeight > groundHeight + 0.001
    ) {
      groundHeight = propRampHeight
      groundPlatform = undefined
      groundSlope = undefined
      groundPropSlope = platform
    }
  }

  for (const slope of COURSE_SLOPES) {
    if (!pointInCourseSlope(position, slope, PLATFORM_AIR_LANDING_MARGIN)) continue

    const slopeHeight = getCourseSlopeHeightAt(position, slope)
    if (crossedLandingHeight(previousHeight, currentHeight, slopeHeight) && slopeHeight >= groundHeight) {
      groundHeight = slopeHeight
      groundPlatform = undefined
      groundSlope = slope
      groundPropSlope = undefined
    }
  }

  return { height: groundHeight, platform: groundPlatform, slope: groundSlope, propSlope: groundPropSlope }
}

function getSupportedCourseGroundContact(position: THREE.Vector3, currentHeight: number, verticalVelocity: number) {
  const reachableHeight =
    currentHeight +
    (verticalVelocity > 0
      ? GROUND_CONTACT_EPSILON
      : Math.max(MAX_AUTO_STEP_HEIGHT, PLATFORM_LANDING_CATCH_GRACE))
  const preciseContact = getCourseGroundContact(position, PLATFORM_TOP_MARGIN, reachableHeight)

  if (currentHeight <= 0 || verticalVelocity > 0 || currentHeight > preciseContact.height + GROUND_CONTACT_EPSILON) {
    return preciseContact
  }

  const supportContact = getCourseGroundContact(
    position,
    PLATFORM_GROUNDED_SUPPORT_MARGIN,
    currentHeight + GROUND_CONTACT_EPSILON,
  )
  if (Math.abs(supportContact.height - currentHeight) <= GROUND_CONTACT_EPSILON) {
    return supportContact
  }

  return preciseContact
}

function getSupportedCourseGroundHeight(position: THREE.Vector3, currentHeight: number, verticalVelocity: number) {
  return getSupportedCourseGroundContact(position, currentHeight, verticalVelocity).height
}

function platformSupportsFootprint(position: THREE.Vector3, platform: CourseStepPlatform, margin = PLATFORM_GROUNDED_SUPPORT_MARGIN) {
  return pointInCoursePlatform(position, platform, margin)
}

function getPlatformSupportAtHeight(position: THREE.Vector3, height: number, margin = PLATFORM_GROUNDED_SUPPORT_MARGIN) {
  for (const platform of STEP_PLATFORMS) {
    if (Math.abs(platform.height - height) <= GROUND_CONTACT_EPSILON && platformSupportsFootprint(position, platform, margin)) {
      return platform
    }
  }

  return null
}

function getSlopeSupportAtHeight(position: THREE.Vector3, height: number, margin = PLATFORM_GROUNDED_SUPPORT_MARGIN) {
  for (const slope of COURSE_SLOPES) {
    if (!pointInCourseSlope(position, slope, margin)) continue

    const slopeHeight = getCourseSlopeHeightAt(position, slope)
    if (Math.abs(slopeHeight - height) <= 0.18) {
      return slope
    }
  }

  return null
}

function getPropSlopeSupportAtHeight(position: THREE.Vector3, height: number, margin = PLATFORM_GROUNDED_SUPPORT_MARGIN) {
  for (const platform of STEP_PLATFORMS) {
    const propSlopeHeight = getClimbablePropRampHeightAt(position, platform, margin)
    if (propSlopeHeight !== undefined && Math.abs(propSlopeHeight - height) <= 0.2) {
      return platform
    }
  }

  return null
}

function hasContinuousClimbSupportAtHeight(position: THREE.Vector3, height: number) {
  return (
    getSlopeSupportAtHeight(position, height, PLAYER_COLLISION_RADIUS * 0.55) !== null ||
    getPropSlopeSupportAtHeight(position, height, PLAYER_COLLISION_RADIUS * 0.55) !== null
  )
}

function smootherstep01(value: number) {
  const amount = clamp(value, 0, 1)
  return amount * amount * amount * (amount * (amount * 6 - 15) + 10)
}

function normalizePhase(value: number) {
  return ((value % 1) + 1) % 1
}

function isCameraControlTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('.camera-pad, .room-mark'))
}

function initialCameraMode(): CameraMode {
  if (typeof window === 'undefined') return 'follow'

  const cameraParam = new URLSearchParams(window.location.search).get('camera')
  return cameraParam === 'overhead' || cameraParam === 'top' ? 'overhead' : 'follow'
}

function initialPlayerPosition() {
  if (typeof window === 'undefined') return START_POSITION.clone()

  const params = new URLSearchParams(window.location.search)
  const xParam = Number(params.get('x'))
  const zParam = Number(params.get('z'))

  if (params.has('x') && params.has('z') && Number.isFinite(xParam) && Number.isFinite(zParam)) {
    return new THREE.Vector3(clamp(xParam, -ROOM_LIMIT, ROOM_LIMIT), 0, clamp(zParam, -ROOM_LIMIT, ROOM_LIMIT))
  }

  switch (params.get('spawn')) {
    case 'plaques':
      return new THREE.Vector3(-44, 0, 246)
    case 'pond':
      return new THREE.Vector3(-88, 0, 78)
    case 'vista':
      return new THREE.Vector3(-46, 0, 96)
    case 'sign':
      return new THREE.Vector3(86, 0, -92)
    case 'steps':
      return new THREE.Vector3(0, 0, -462)
    case 'bridge':
      return new THREE.Vector3(0, 0, -392)
    case 'moat':
      return new THREE.Vector3(80, 0, -436)
    case 'side-bridge':
      return new THREE.Vector3(-158, 0, -390)
    case 'museum':
      return new THREE.Vector3(0, 0, -506)
    default:
      return START_POSITION.clone()
  }
}

function initialPlayerHeight() {
  if (typeof window === 'undefined') return 0

  const params = new URLSearchParams(window.location.search)
  const heightParam = Number(params.get('height') ?? params.get('h'))
  if ((params.has('height') || params.has('h')) && Number.isFinite(heightParam)) {
    return clamp(heightParam, 0, 140)
  }

  return getCourseGroundContact(initialPlayerPosition()).height
}

function initialMuseumGameplayProgress(): MuseumGameplayProgress {
  if (typeof window === 'undefined') return EMPTY_MUSEUM_GAMEPLAY_PROGRESS

  const params = new URLSearchParams(window.location.search)
  const glyphParam = params.get('glyphs')
  const requestedGlyphs =
    glyphParam === 'all'
      ? REQUIRED_MUSEUM_GAMEPLAY_GLYPH_IDS
      : glyphParam
        ?.split(',')
        .filter((id): id is MuseumGameplayGlyphId =>
          REQUIRED_MUSEUM_GAMEPLAY_GLYPH_IDS.includes(id as MuseumGameplayGlyphId),
        ) ?? []

  return {
    collectedGlyphIds: [...new Set(requestedGlyphs)],
    finishTriggered: params.get('complete') === '1',
  }
}

function estimateVisualJumpLift(animation: PsychedelicPogoOrbAnimation, phaseOverride?: number) {
  if (!isJumpAnimation(animation) || phaseOverride === undefined) return 0

  if (animation === 'ledge-fall') {
    const fallT = clamp((phaseOverride - LEDGE_FALL_PHASE_START) / (LEDGE_FALL_PHASE_END - LEDGE_FALL_PHASE_START), 0, 1)
    return (1 - smootherstep01(fallT)) * 0.72
  }

  if (animation === 'reference-ball-bounce' || animation === 'forward-ball-bounce') {
    if (phaseOverride < 0.365) return THREE.MathUtils.lerp(0.18, 7.55, smootherstep01(phaseOverride / 0.365))
    if (phaseOverride < 0.57) return THREE.MathUtils.lerp(7.55, 0.18, smootherstep01((phaseOverride - 0.365) / 0.205))
    if (phaseOverride < 0.705) {
      return THREE.MathUtils.lerp(0.18, 9.38, 1 - Math.pow(1 - clamp((phaseOverride - 0.57) / 0.135, 0, 1), 2.08))
    }
    if (phaseOverride < 0.762) {
      return 9.38 + Math.sin(clamp((phaseOverride - 0.705) / 0.057, 0, 1) * Math.PI) * 0.34
    }

    return THREE.MathUtils.lerp(9.38, 0.18, smootherstep01((phaseOverride - 0.762) / 0.238))
  }

  if (animation === 'ball-bounce') {
    if (phaseOverride < 0.42) return THREE.MathUtils.lerp(2.55, 3.72, smootherstep01(phaseOverride / 0.42))
    if (phaseOverride < 0.68) return THREE.MathUtils.lerp(3.72, 0.18, smootherstep01((phaseOverride - 0.42) / 0.26))
    return Math.sin(clamp((phaseOverride - 0.68) / 0.32, 0, 1) * Math.PI * 0.72) * 4.2
  }

  const jumpT = clamp((phaseOverride - HOP_LAUNCH_PHASE) / (HOP_LANDING_PHASE - HOP_LAUNCH_PHASE), 0, 1)
  const visualArc = Math.sin(jumpT * Math.PI)

  return visualArc * (animation === 'forward-hop' ? 2.25 : 3.05)
}

function lerpAngle(current: number, target: number, amount: number) {
  const fullTurn = Math.PI * 2
  const difference = ((((target - current) % fullTurn) + fullTurn + Math.PI) % fullTurn) - Math.PI
  return current + difference * amount
}

function useKeyboardInput() {
  const inputRef = useRef<InputState>(emptyInput())

  useEffect(() => {
    const setKey = (code: string, isDown: boolean) => {
      const input = inputRef.current

      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
          input.forward = isDown
          return true
        case 'KeyS':
        case 'ArrowDown':
          input.backward = isDown
          return true
        case 'KeyA':
        case 'ArrowLeft':
          input.left = isDown
          return true
        case 'KeyD':
        case 'ArrowRight':
          input.right = isDown
          return true
        case 'ShiftLeft':
        case 'ShiftRight':
          input.run = isDown
          return true
        case 'Space':
          input.jump = isDown
          return true
        case 'KeyR':
          input.reset = isDown
          return true
        default:
          return false
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (setKey(event.code, true)) {
        event.preventDefault()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (setKey(event.code, false)) {
        event.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    const clearInput = () => {
      inputRef.current = emptyInput()
    }
    const handleVisibilityChange = () => {
      if (document.hidden) clearInput()
    }
    window.addEventListener('blur', clearInput)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', clearInput)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return inputRef
}

function RoomPad({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh renderOrder={-5}>
        <circleGeometry args={[0.48, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.38} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.006]} renderOrder={-4}>
        <ringGeometry args={[0.37, 0.49, 48]} />
        <meshBasicMaterial color="#17121f" transparent opacity={0.48} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function RoomRail({ position, scale }: { position: [number, number, number]; scale: [number, number, number] }) {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color="#506a86" />
      </mesh>
      <mesh scale={[1.04, 1.08, 1.04]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#17121f" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

function RoomCorner({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.24, 16, 12]} />
        <meshToonMaterial color="#ffe269" />
      </mesh>
      <mesh scale={1.08}>
        <sphereGeometry args={[0.24, 16, 12]} />
        <meshBasicMaterial color="#17121f" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

function CourseGroundRing({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh renderOrder={-3}>
        <ringGeometry args={[0.7, 0.92, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.006]} renderOrder={-2}>
        <ringGeometry args={[0.88, 0.98, 48]} />
        <meshBasicMaterial color="#17121f" transparent opacity={0.38} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function CoursePost({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, FLOOR_Y, z]}>
      <CourseGroundRing position={[0, 0.026, 0]} color={color} />
      <mesh position={[0, 0.68, 0]}>
        <cylinderGeometry args={[0.28, 0.36, 1.36, 18]} />
        <meshToonMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.68, 0]} scale={[1.1, 1.05, 1.1]}>
        <cylinderGeometry args={[0.28, 0.36, 1.36, 18]} />
        <meshBasicMaterial color="#17121f" side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, 1.46, 0]}>
        <sphereGeometry args={[0.42, 18, 12]} />
        <meshToonMaterial color="#fff36d" />
      </mesh>
      <mesh position={[0, 1.46, 0]} scale={1.09}>
        <sphereGeometry args={[0.42, 18, 12]} />
        <meshBasicMaterial color="#17121f" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

function CourseBlock({
  position,
  scale,
  color,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
}) {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={color} />
      </mesh>
      <mesh scale={[1.06, 1.05, 1.06]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#17121f" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

function CourseStepBlock({ platform }: { platform: CourseStepPlatform }) {
  const width = platform.halfX * 2
  const depth = platform.halfZ * 2
  const variant = platform.variant ?? 'block'
  const isMuseumPlatform =
    variant === 'stair' ||
    variant === 'landing' ||
    variant === 'bench' ||
    variant === 'lily' ||
    variant === 'stone' ||
    variant === 'boulder' ||
    variant === 'sign' ||
    variant === 'canopy' ||
    variant === 'ledge'
  const isBroadLanding = variant === 'catch' || variant === 'roof' || variant === 'finish' || variant === 'landing' || variant === 'canopy' || variant === 'ledge'
  const isTallPlatform = variant === 'tower' || variant === 'pillar' || variant === 'roof' || variant === 'finish' || variant === 'boulder' || variant === 'sign'
  const isSkyColumn = platform.height >= SKY_LOW_HEIGHT
  const topInset = variant === 'beam' ? 0.9 : variant === 'roof' || variant === 'finish' || isMuseumPlatform ? 0.98 : variant === 'catch' ? 0.97 : 0.96
  const topDepthInset = variant === 'beam' ? 0.84 : variant === 'roof' || variant === 'finish' || isMuseumPlatform ? 0.98 : variant === 'catch' ? 0.97 : 0.95
  const targetInner = isBroadLanding ? 0.66 : variant === 'tower' ? 0.52 : 0.46
  const targetOuter = isBroadLanding ? 0.88 : variant === 'tower' ? 0.7 : 0.62
  const sideStripeOpacity = isMuseumPlatform ? 0.1 : variant === 'beam' ? 0.34 : isTallPlatform ? 0.24 : 0.16
  const sideOpacity = isSkyColumn ? 0.26 : 1
  const outlineOpacity = isSkyColumn ? 0.24 : 1

  if (variant === 'lily') {
    return (
      <group position={[platform.x, FLOOR_Y + platform.height, platform.z]} rotation={[0, seededPlatformYaw(platform), 0]}>
        <mesh position={[0, -platform.height * 0.5, 0]} scale={[width * 0.94, platform.height, depth * 0.92]}>
          <cylinderGeometry args={[0.5, 0.58, 1, 28]} />
          <meshToonMaterial color={platform.color} />
        </mesh>
        <mesh position={[0, 0.04, 0]} scale={[width * 0.98, 0.08, depth * 0.98]}>
          <cylinderGeometry args={[0.5, 0.54, 1, 30]} />
          <meshToonMaterial color={platform.topColor} />
        </mesh>
        <mesh position={[0, 0.04, 0]} scale={[width * 1.04, 0.09, depth * 1.04]}>
          <cylinderGeometry args={[0.5, 0.54, 1, 30]} />
          <meshBasicMaterial color={MCM_PALETTE.ink} side={THREE.BackSide} />
        </mesh>
        <mesh position={[width * 0.16, 0.1, -depth * 0.1]} rotation={[-Math.PI / 2, 0, 0.25]} renderOrder={-1}>
          <circleGeometry args={[0.28, 18]} />
          <meshBasicMaterial color={MCM_PALETTE.flowerYellow} transparent opacity={0.72} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    )
  }

  return (
    <group position={[platform.x, FLOOR_Y, platform.z]}>
      {!isMuseumPlatform ? <CourseGroundRing position={[0, 0.024, 0]} color={platform.color} /> : null}
      <mesh position={[0, platform.height * 0.5, 0]} scale={[width, platform.height, depth]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={platform.color} transparent={isSkyColumn} opacity={sideOpacity} depthWrite={!isSkyColumn} />
      </mesh>
      <mesh position={[0, platform.height * 0.5, 0]} scale={[width * 1.035, platform.height * 1.04, depth * 1.035]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#17121f" side={THREE.BackSide} transparent={isSkyColumn} opacity={outlineOpacity} depthWrite={!isSkyColumn} />
      </mesh>
      <mesh position={[0, platform.height + 0.035, 0]} scale={[width * topInset, 0.07, depth * topDepthInset]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={platform.topColor} />
      </mesh>
      <mesh position={[0, platform.height + 0.035, 0]} scale={[width * Math.min(0.995, topInset + 0.025), 0.08, depth * Math.min(0.995, topDepthInset + 0.025)]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#17121f" side={THREE.BackSide} />
      </mesh>
      {(variant === 'beam' || variant === 'roof') && (
        <>
          <mesh position={[-width * 0.26, platform.height + 0.088, 0]} scale={[0.12, 0.052, depth * 0.78]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#17121f" transparent opacity={sideStripeOpacity} />
          </mesh>
          <mesh position={[width * 0.26, platform.height + 0.088, 0]} scale={[0.12, 0.052, depth * 0.78]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#17121f" transparent opacity={sideStripeOpacity} />
          </mesh>
        </>
      )}
      {isTallPlatform &&
        [0.28, 0.56, 0.84].map((band) => (
          <mesh key={band} position={[0, Math.max(0.18, platform.height * band), 0]} scale={[width * 1.02, 0.035, depth * 1.02]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#17121f" transparent opacity={sideStripeOpacity} />
          </mesh>
        ))}
      {!isMuseumPlatform && (
        <mesh position={[0, platform.height + 0.088, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
          <ringGeometry args={[targetInner, targetOuter, 40]} />
          <meshBasicMaterial color="#17121f" transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {isBroadLanding && !isMuseumPlatform && (
        <mesh position={[0, platform.height + 0.088, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
          <ringGeometry args={[1.04, 1.2, 52]} />
          <meshBasicMaterial color={platform.color} transparent opacity={0.26} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {variant === 'finish' && (
        <group position={[0, platform.height + 0.22, 0]}>
          <mesh position={[width * 0.34, 2.26, depth * 0.18]}>
            <cylinderGeometry args={[0.08, 0.12, 4.52, 18]} />
            <meshBasicMaterial color="#78ffe2" transparent opacity={0.42} depthWrite={false} />
          </mesh>
          <mesh position={[width * 0.34, 4.72, depth * 0.18]}>
            <sphereGeometry args={[0.42, 20, 14]} />
            <meshBasicMaterial color="#fff36d" transparent opacity={0.72} depthWrite={false} />
          </mesh>
          <mesh position={[-width * 0.34, 1.16, -depth * 0.24]}>
            <cylinderGeometry args={[0.09, 0.12, 2.32, 16]} />
            <meshToonMaterial color="#17121f" />
          </mesh>
          <mesh position={[-width * 0.18, 2.08, -depth * 0.24]} scale={[1.45, 0.62, 0.08]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshToonMaterial color="#ff6fd8" />
          </mesh>
          <mesh position={[-width * 0.18, 2.08, -depth * 0.24]} scale={[1.5, 0.66, 0.1]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#17121f" side={THREE.BackSide} />
          </mesh>
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
            <ringGeometry args={[1.32, 1.58, 64]} />
            <meshBasicMaterial color="#ff6fd8" transparent opacity={0.42} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  )
}

function CourseHurdle({ x, z, width, color }: { x: number; z: number; width: number; color: string }) {
  return (
    <group position={[x, FLOOR_Y, z]}>
      <CourseGroundRing position={[-width * 0.5, 0.024, 0]} color={color} />
      <CourseGroundRing position={[width * 0.5, 0.024, 0]} color={color} />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * width * 0.5, 0.48, 0]}>
          <mesh>
            <cylinderGeometry args={[0.16, 0.2, 0.96, 16]} />
            <meshToonMaterial color="#78ffe2" />
          </mesh>
          <mesh scale={[1.1, 1.05, 1.1]}>
            <cylinderGeometry args={[0.16, 0.2, 0.96, 16]} />
            <meshBasicMaterial color="#17121f" side={THREE.BackSide} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.92, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.17, 0.17, width, 18]} />
        <meshToonMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.92, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.08, 1.08, 1.02]}>
        <cylinderGeometry args={[0.17, 0.17, width, 18]} />
        <meshBasicMaterial color="#17121f" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

function CourseRouteDots({ platforms }: { platforms: CourseStepPlatform[] }) {
  const dots = useMemo(
    () =>
      platforms.flatMap((platform, platformIndex) => {
        const nextPlatform = platforms[platformIndex + 1]
        if (!nextPlatform) return []

        const dotCount = platformIndex === platforms.length - 2 ? 4 : 3
        return Array.from({ length: dotCount }, (_, dotIndex) => {
          const progress = (dotIndex + 1) / (dotCount + 1)
          return {
            id: `${platform.id}-${nextPlatform.id}-${dotIndex}`,
            x: THREE.MathUtils.lerp(platform.x, nextPlatform.x, progress),
            z: THREE.MathUtils.lerp(platform.z, nextPlatform.z, progress),
            y: THREE.MathUtils.lerp(platform.height, nextPlatform.height, progress) + 0.28,
            scale: 0.14 + progress * 0.04,
            color: dotIndex % 2 === 0 ? '#78ffe2' : '#ff6fd8',
          }
        })
      }),
    [platforms],
  )

  return (
    <group>
      {dots.map((dot) => (
        <group key={dot.id} position={[dot.x, FLOOR_Y + dot.y, dot.z]}>
          <mesh>
            <sphereGeometry args={[dot.scale, 14, 10]} />
            <meshBasicMaterial color={dot.color} transparent opacity={0.58} depthWrite={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[dot.scale * 1.65, dot.scale * 2.25, 28]} />
            <meshBasicMaterial color="#17121f" transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function ToonBox({
  position,
  scale,
  color,
  opacity = 1,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
  opacity?: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={color} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
      </mesh>
      <mesh scale={[1.035, 1.045, 1.035]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={MCM_PALETTE.ink} side={THREE.BackSide} transparent={opacity < 1} opacity={opacity < 1 ? Math.min(0.42, opacity) : 1} />
      </mesh>
    </group>
  )
}

function ToonCylinder({
  position,
  scale,
  color,
  segments = 22,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
  segments?: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <cylinderGeometry args={[0.5, 0.5, 1, segments]} />
        <meshToonMaterial color={color} />
      </mesh>
      <mesh scale={[1.08, 1.04, 1.08]}>
        <cylinderGeometry args={[0.5, 0.5, 1, segments]} />
        <meshBasicMaterial color={MCM_PALETTE.ink} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

function FlowerPatch({ x, z, color = MCM_PALETTE.flowerPink }: { x: number; z: number; color?: string }) {
  return (
    <group position={[x, FLOOR_Y + 0.16, z]}>
      <ToonCylinder position={[0, 0.08, 0]} scale={[0.16, 0.28, 0.16]} color={MCM_PALETTE.plantMid} segments={10} />
      {[0, 1, 2, 3].map((index) => {
        const angle = (index / 4) * Math.PI * 2
        return (
          <mesh key={index} position={[Math.cos(angle) * 0.22, 0.33, Math.sin(angle) * 0.22]} scale={[0.18, 0.1, 0.18]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshToonMaterial color={index % 2 === 0 ? color : MCM_PALETTE.flowerYellow} />
          </mesh>
        )
      })}
    </group>
  )
}

function Planter({ x, z, height = 1.22, glow = 0 }: { x: number; z: number; height?: number; glow?: number }) {
  return (
    <group position={[x, FLOOR_Y, z]}>
      <ToonCylinder position={[0, height * 0.38, 0]} scale={[1.3, height * 0.76, 1.3]} color="#fff4a8" segments={24} />
      <ToonCylinder position={[0, height * 0.82, 0]} scale={[1.55, 0.2, 1.55]} color="#f5d16d" segments={24} />
      <mesh position={[0, height + 0.14, 0]} scale={[1.42 + glow * 0.18, 0.22, 1.42 + glow * 0.18]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshBasicMaterial color={glow > 0.2 ? '#fff36d' : MCM_PALETTE.plantMid} transparent opacity={0.42 + glow * 0.32} depthWrite={false} />
      </mesh>
      {[-0.36, 0, 0.36].map((offset, index) => (
        <mesh key={offset} position={[offset * 0.9, height + 0.36 + index * 0.04, index === 1 ? -0.16 : 0.1]} scale={[0.2, 0.16, 0.2]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color={index === 1 ? '#78ffe2' : MCM_PALETTE.flowerPink} />
        </mesh>
      ))}
    </group>
  )
}

function PottedFern({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, FLOOR_Y + 6.34, z]}>
      <ToonCylinder position={[0, 0.33, 0]} scale={[0.82, 0.66, 0.82]} color="#fff2a4" segments={18} />
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = -0.9 + index * 0.45
        return (
          <mesh key={index} position={[Math.sin(angle) * 0.45, 0.92 + Math.cos(index) * 0.08, Math.cos(angle) * 0.36]} rotation={[0.2, angle, 0.2]} scale={[0.22, 0.12, 0.92]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshToonMaterial color={index % 2 === 0 ? MCM_PALETTE.plantDark : MCM_PALETTE.plantMid} />
          </mesh>
        )
      })}
    </group>
  )
}

function MuseumFacade({ progress }: { progress?: MuseumProgress }) {
  const safeProgress = museumProgressOrDefault(progress)
  const doorReady = safeProgress.collectedTokenIds.length >= MUSEUM_GLYPHS.length
  const glow = doorReady ? safeProgress.finishTriggered ? 1 : 0.62 : 0

  return (
    <group>
      <ToonBox position={[-5.2, FLOOR_Y + 2.05, -40.25]} scale={[18.6, 4.1, 1.25]} color={MCM_PALETTE.mauve} />
      <ToonBox position={[-6.8, FLOOR_Y + 5.08, -40.0]} scale={[15.6, 1.0, 1.12]} color={MCM_PALETTE.mauveShadow} />
      <ToonBox position={[-6.8, FLOOR_Y + 5.72, -39.92]} scale={[15.8, 0.28, 1.16]} color="#ba78a4" />
      <ToonBox position={[-7.4, FLOOR_Y + 4.25, -39.74]} scale={[11.4, 1.52, 1.02]} color={MCM_PALETTE.teakShadow} />
      <ToonBox position={[-7.4, FLOOR_Y + 2.96, -35.85]} scale={[18.8, 0.52, 5.25]} color={MCM_PALETTE.teak} />
      <ToonBox position={[-7.4, FLOOR_Y + 3.25, -32.95]} scale={[18.95, 0.14, 0.18]} color={MCM_PALETTE.teakLight} />
      <ToonBox position={[9.8, FLOOR_Y + 6.85, -40.5]} scale={[15.5, 0.76, 7.35]} color={MCM_PALETTE.teak} />
      <ToonBox position={[9.8, FLOOR_Y + 6.36, -36.5]} scale={[15.65, 0.18, 0.24]} color={MCM_PALETTE.teakLight} />
      <ToonBox position={[11.6, FLOOR_Y + 2.74, -38.8]} scale={[9.4, 5.0, 1.12]} color={MCM_PALETTE.glass} opacity={0.48} />
      {[-2, -1, 0, 1, 2].map((index) => (
        <ToonBox key={index} position={[7.2 + index * 2.18, FLOOR_Y + 2.82, -38.18]} scale={[0.11, 4.8, 0.18]} color={MCM_PALETTE.ink} />
      ))}
      <ToonBox position={[11.5, FLOOR_Y + 2.15, -38.02]} scale={[8.7, 0.12, 0.16]} color={MCM_PALETTE.ink} />
      <ToonBox position={[10.2, FLOOR_Y + 2.15, -38.55]} scale={[5.8, 0.36, 1.0]} color="#c8d7df" />
      {Array.from({ length: 9 }, (_, index) => (
        <ToonBox
          key={`atrium-lower-${index}`}
          position={[7.4 + index * 0.58, FLOOR_Y + 1.42 + index * 0.18, -37.85]}
          scale={[0.55, 0.16, 1.12]}
          color={MCM_PALETTE.teakShadow}
        />
      ))}
      {Array.from({ length: 9 }, (_, index) => (
        <ToonBox
          key={`atrium-upper-${index}`}
          position={[14.5 - index * 0.58, FLOOR_Y + 3.22 + index * 0.18, -37.86]}
          scale={[0.55, 0.16, 1.12]}
          color={MCM_PALETTE.teakShadow}
        />
      ))}
      <ToonBox position={[0, FLOOR_Y + 3.62, -38.68]} scale={[4.4, 3.72, 0.62]} color={MCM_PALETTE.teakShadow} />
      <ToonBox position={[-1.12, FLOOR_Y + 3.48, -38.28]} scale={[1.86, 3.08, 0.26]} color={MCM_PALETTE.teak} />
      <ToonBox position={[1.12, FLOOR_Y + 3.48, -38.28]} scale={[1.86, 3.08, 0.26]} color={MCM_PALETTE.teak} />
      <ToonBox position={[0, FLOOR_Y + 5.25, -38.02]} scale={[4.85, 0.18, 0.22]} color={doorReady ? '#fff36d' : '#dba85e'} />
      <mesh position={[0, FLOOR_Y + 3.7, -37.94]} scale={[5.8 + glow * 0.4, 4.7 + glow * 0.35, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fff36d" transparent opacity={0.05 + glow * 0.22} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <Planter x={-4.1} z={-33.6} height={1.18} glow={glow} />
      <Planter x={4.1} z={-33.6} height={1.18} glow={glow} />
      <ToonBox position={[-19.1, FLOOR_Y + 2.58, -35.3]} scale={[0.58, 5.15, 0.72]} color={MCM_PALETTE.teakShadow} />
      {[-17.4, -15.35, -13.3].map((x) => <PottedFern key={x} x={x} z={-39.6} />)}
    </group>
  )
}

function PondLoop() {
  return (
    <group>
      <mesh position={[POND_WATER.x, FLOOR_Y + 0.035, POND_WATER.z]} rotation={[-Math.PI / 2, 0, -0.16]} scale={[POND_WATER.radiusX, POND_WATER.radiusZ, 1]}>
        <circleGeometry args={[1, 56]} />
        <meshToonMaterial color={MCM_PALETTE.water} transparent opacity={0.84} />
      </mesh>
      <mesh position={[POND_WATER.x, FLOOR_Y + 0.062, POND_WATER.z]} rotation={[-Math.PI / 2, 0, -0.16]} scale={[POND_WATER.radiusX * 1.08, POND_WATER.radiusZ * 1.1, 1]}>
        <ringGeometry args={[0.88, 1, 64]} />
        <meshToonMaterial color={MCM_PALETTE.teakShadow} />
      </mesh>
      <mesh position={[POND_WATER.x - 1.5, FLOOR_Y + 0.08, POND_WATER.z + 0.3]} rotation={[-Math.PI / 2, 0, -0.08]} scale={[2.2, 0.08, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#d8f7ff" transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <FlowerPatch x={-20.1} z={-5.4} color="#ffe269" />
      <FlowerPatch x={-12.2} z={-10.8} color="#ff7bf0" />
    </group>
  )
}

function BenchRoute() {
  return (
    <group>
      <ToonBox position={[-15.8, FLOOR_Y + 1.02, -4.9]} scale={[9.45, 0.42, 0.55]} color={MCM_PALETTE.teakShadow} />
      <ToonBox position={[-15.8, FLOOR_Y + 1.18, -3.6]} scale={[9.1, 0.36, 1.84]} color={MCM_PALETTE.teak} />
      <ToonBox position={[-19.4, FLOOR_Y + 0.45, -2.72]} scale={[0.28, 0.9, 0.32]} color={MCM_PALETTE.ink} />
      <ToonBox position={[-12.2, FLOOR_Y + 0.45, -2.72]} scale={[0.28, 0.9, 0.32]} color={MCM_PALETTE.ink} />
    </group>
  )
}

function SignAndBoulderRoute() {
  return (
    <group>
      <ToonBox position={[12.15, FLOOR_Y + 1.02, -13.15]} scale={[7.5, 2.04, 0.36]} color={MCM_PALETTE.teakShadow} />
      <ToonBox position={[12.15, FLOOR_Y + 1.18, -12.84]} scale={[6.86, 1.52, 0.32]} color={MCM_PALETTE.sign} />
      <ToonBox position={[10.95, FLOOR_Y + 1.21, -12.6]} scale={[0.32, 0.78, 0.08]} color={MCM_PALETTE.mauveShadow} />
      <ToonBox position={[12.1, FLOOR_Y + 1.21, -12.6]} scale={[0.28, 0.58, 0.08]} color={MCM_PALETTE.mauveShadow} />
      <ToonBox position={[13.1, FLOOR_Y + 1.21, -12.6]} scale={[0.34, 0.86, 0.08]} color={MCM_PALETTE.mauveShadow} />
      {[0.1, 0.32, 0.55].map((scale, index) => (
        <mesh key={index} position={[15.4 + index * 1.4, FLOOR_Y + 0.74 + index * 0.26, -8.6 - index * 1.05]} scale={[3.2 - index * 0.62, 1.14 + index * 0.22, 2.25 - index * 0.38]} rotation={[0.02, 0.26 - index * 0.2, 0.03]}>
          <dodecahedronGeometry args={[1 + scale, 0]} />
          <meshToonMaterial color={index === 1 ? '#a1a7c4' : MCM_PALETTE.stone} />
        </mesh>
      ))}
      <FlowerPatch x={18.9} z={-5.1} color="#ffe269" />
      <FlowerPatch x={8.7} z={-9.3} color="#ff7bf0" />
    </group>
  )
}

function MuseumGlyphMarker({ glyph, collected }: { glyph: MuseumGlyph; collected: boolean }) {
  const group = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime
    group.current.visible = !collected
    group.current.position.y = FLOOR_Y + glyph.height + Math.sin(t * 3.2 + glyph.x) * 0.12
    group.current.rotation.y = t * 1.7
    const pulse = 1 + Math.sin(t * 4.8 + glyph.z) * 0.07
    group.current.scale.setScalar(pulse)
  })

  return (
    <group ref={group} position={[glyph.x, FLOOR_Y + glyph.height, glyph.z]}>
      <mesh>
        <octahedronGeometry args={[0.56, 0]} />
        <meshBasicMaterial color={glyph.color} transparent opacity={0.86} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.74, 0.055, 8, 36]} />
        <meshBasicMaterial color={MCM_PALETTE.ink} transparent opacity={0.64} depthWrite={false} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[0.86, 0.035, 8, 36]} />
        <meshBasicMaterial color="#fff8cd" transparent opacity={0.38} depthWrite={false} />
      </mesh>
    </group>
  )
}

function MuseumGlyphs({ progress }: { progress?: MuseumProgress }) {
  return (
    <group>
      {MUSEUM_GLYPHS.map((glyph) => (
        <MuseumGlyphMarker key={glyph.id} glyph={glyph} collected={hasMuseumGlyph(progress, glyph.id)} />
      ))}
    </group>
  )
}

function GlowMotes() {
  return (
    <group>
      {MUSEUM_GLOW_MOTES.map(([x, y, z, color], index) => (
        <group key={index} position={[x, FLOOR_Y + y, z]}>
          <mesh>
            <sphereGeometry args={[0.18, 12, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.66} depthWrite={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.28, 0.36, 24]} />
            <meshBasicMaterial color={MCM_PALETTE.ink} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function McmMuseumCourtyardLevel({ progress }: { progress?: MuseumProgress }) {
  const safeProgress = museumProgressOrDefault(progress)

  return (
    <group>
      <MuseumFacade progress={safeProgress} />
      <PondLoop />
      <BenchRoute />
      <SignAndBoulderRoute />
      {STEP_PLATFORMS.filter((platform) => platform.visual !== false).map((platform) => (
        <CourseStepBlock key={platform.id} platform={platform} />
      ))}
      <CourseRouteDots platforms={CANOPY_ROUTE} />
      <MuseumGlyphs progress={safeProgress} />
      <GlowMotes />
    </group>
  )
}

const LEGACY_CONTROL_ROOM_VISUAL_COUNT = [
  RoomPad,
  RoomRail,
  RoomCorner,
  CoursePost,
  CourseBlock,
  CourseStepBlock,
  CourseHurdle,
  McmMuseumCourtyardLevel,
].length

function ControlRoomFloor({ progress }: { progress: MuseumGameplayProgress }) {
  return (
    <>
      <MuseumScalePathGrassArena />
      <MuseumScaleGameplayLayer progress={progress} />
    </>
  )
}

function PlayerController({
  cameraZoom,
  cameraOrbit,
  onReadout,
  progress,
  onCollectGlyph,
  onFinish,
}: {
  cameraZoom: number
  cameraOrbit: CameraOrbit
  onReadout: (readout: AvatarReadout) => void
  progress: MuseumGameplayProgress
  onCollectGlyph: (glyphId: MuseumGameplayGlyphId) => void
  onFinish: () => void
}) {
  const inputRef = useKeyboardInput()
  const playerRef = useRef<THREE.Group>(null)
  const [startPosition] = useState(() => initialPlayerPosition())
  const [startHeight] = useState(() => initialPlayerHeight())
  const progressRef = useRef(progress)
  const onCollectGlyphRef = useRef(onCollectGlyph)
  const onFinishRef = useRef(onFinish)
  const positionRef = useRef(startPosition.clone())
  const lastSafePositionRef = useRef(startPosition.clone())
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0))
  const moveDirectionRef = useRef(new THREE.Vector3(0, 0, 0))
  const cameraTargetRef = useRef(new THREE.Vector3(0, MARIO_CAMERA_TARGET_HEIGHT, 0))
  const cameraLookAheadRef = useRef(new THREE.Vector3(0, 0, 0))
  const cameraLookAheadTargetRef = useRef(new THREE.Vector3(0, 0, 0))
  const cameraPositionRef = useRef(
    new THREE.Vector3(
      Math.sin(MARIO_CAMERA_SHOULDER_YAW) * MARIO_CAMERA_DISTANCE,
      MARIO_CAMERA_HEIGHT,
      Math.cos(MARIO_CAMERA_SHOULDER_YAW) * MARIO_CAMERA_DISTANCE,
    ),
  )
  const facingRef = useRef(0)
  const cameraHeadingRef = useRef(MARIO_CAMERA_SHOULDER_YAW)
  const jumpHeightRef = useRef(startHeight)
  const visualHeightRef = useRef(startHeight)
  const renderedHeightRef = useRef(startHeight)
  const verticalVelocityRef = useRef(0)
  const jumpCooldownRef = useRef(0)
  const coyoteTimerRef = useRef(0)
  const jumpBufferTimerRef = useRef(0)
  const raisedPlatformFootingTimerRef = useRef(0)
  const raisedPlatformFootingHeightRef = useRef(0)
  const groundedPlatformRef = useRef<CourseStepPlatform | null>(null)
  const ledgeFallOriginHeightRef = useRef(0)
  const jumpHeldRef = useRef(false)
  const jumpAnimationRef = useRef<PsychedelicPogoOrbAnimation>('hop')
  const ballMoveStateRef = useRef<BallMoveState>({ kind: 'none' })
  const ballMoveUsedRef = useRef(false)
  const ballMovePhaseRef = useRef(0)
  const landingStepTimerRef = useRef(0)
  const landingStepElapsedRef = useRef(0)
  const jumpElapsedRef = useRef(0)
  const jumpDurationRef = useRef(0.8)
  const landingTimerRef = useRef(0)
  const landingPhaseStartRef = useRef(HOP_LANDING_PHASE)
  const landingPhaseDurationRef = useRef(LANDING_VISUAL_SECONDS)
  const landingCushionRef = useRef(0)
  const bumpExpressionTimerRef = useRef(0)
  const animationRef = useRef<PsychedelicPogoOrbAnimation>('idle')
  const activityRef = useRef(0.8)
  const phaseOverrideRef = useRef<number | undefined>(undefined)
  const locomotionPhaseRef = useRef(0)
  const idlePhaseRef = useRef(0)
  const transitionRef = useRef<TransitionState | null>(null)
  const stopStateRef = useRef<StopState | null>(null)
  const readoutTimerRef = useRef(0)
  const initialAvatarProps: ControlAvatarProps = {
    animation: 'idle' as PsychedelicPogoOrbAnimation,
    activity: 0.8,
    expression: 'auto',
    phaseOverride: undefined as number | undefined,
    transitionBlend: 1,
  }
  const [avatarProps, setAvatarPropsState] = useState<ControlAvatarProps>(initialAvatarProps)
  const avatarPropsRef = useRef<ControlAvatarProps>(initialAvatarProps)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    onCollectGlyphRef.current = onCollectGlyph
  }, [onCollectGlyph])

  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  function setAvatarProps(nextAvatarProps: ControlAvatarProps) {
    avatarPropsRef.current = nextAvatarProps
    setAvatarPropsState(nextAvatarProps)
  }

  function collectGlyphOnce(glyphId: MuseumGameplayGlyphId) {
    const current = progressRef.current
    if (current.collectedGlyphIds.includes(glyphId)) return

    progressRef.current = {
      ...current,
      collectedGlyphIds: [...current.collectedGlyphIds, glyphId],
    }
    onCollectGlyphRef.current(glyphId)
  }

  function finishSliceOnce() {
    const current = progressRef.current
    if (current.finishTriggered) return

    progressRef.current = {
      ...current,
      finishTriggered: true,
    }
    onFinishRef.current()
  }

  useFrame((state, frameDelta) => {
    const delta = Math.min(frameDelta, 1 / 30)
    const input = inputRef.current
    const position = positionRef.current
    const velocity = velocityRef.current
    const moveDirection = moveDirectionRef.current

    if (input.reset) {
      position.copy(startPosition)
      lastSafePositionRef.current.copy(startPosition)
      velocity.set(0, 0, 0)
      jumpHeightRef.current = startHeight
      visualHeightRef.current = startHeight
      renderedHeightRef.current = startHeight
      verticalVelocityRef.current = 0
      jumpCooldownRef.current = 0.12
      coyoteTimerRef.current = 0
      jumpBufferTimerRef.current = 0
      raisedPlatformFootingTimerRef.current = 0
      raisedPlatformFootingHeightRef.current = 0
      groundedPlatformRef.current = null
      ledgeFallOriginHeightRef.current = 0
      jumpElapsedRef.current = 0
      jumpDurationRef.current = 0.8
      jumpAnimationRef.current = 'hop'
      ballMoveStateRef.current = { kind: 'none' }
      ballMoveUsedRef.current = false
      ballMovePhaseRef.current = 0
      landingCushionRef.current = 0
      landingPhaseStartRef.current = HOP_LANDING_PHASE
      landingPhaseDurationRef.current = LANDING_VISUAL_SECONDS
      landingStepTimerRef.current = 0
      landingStepElapsedRef.current = 0
      landingTimerRef.current = 0
      bumpExpressionTimerRef.current = 0
      phaseOverrideRef.current = undefined
      locomotionPhaseRef.current = 0
      idlePhaseRef.current = 0
      transitionRef.current = null
      stopStateRef.current = null
      animationRef.current = 'idle'
      activityRef.current = 0.8
      facingRef.current = 0
      cameraHeadingRef.current = MARIO_CAMERA_SHOULDER_YAW
      cameraLookAheadRef.current.set(0, 0, 0)
      cameraLookAheadTargetRef.current.set(0, 0, 0)
    }

    moveDirection.set(0, 0, 0)
    const rightInput = Number(input.right) - Number(input.left)
    const forwardInput = Number(input.forward) - Number(input.backward)
    const controlCameraAngle = cameraHeadingRef.current + cameraOrbit.yaw
    const cameraForwardX = -Math.sin(controlCameraAngle)
    const cameraForwardZ = -Math.cos(controlCameraAngle)
    const cameraRightX = Math.cos(controlCameraAngle)
    const cameraRightZ = -Math.sin(controlCameraAngle)
    moveDirection.x = cameraRightX * rightInput + cameraForwardX * forwardInput
    moveDirection.z = cameraRightZ * rightInput + cameraForwardZ * forwardInput

    const moving = moveDirection.lengthSq() > 0.001
    if (moving) {
      moveDirection.normalize()
    }
    const runIntent = input.run && moving
    if (moving && stopStateRef.current) {
      stopStateRef.current = null
    }

    const currentGroundedPlatform = groundedPlatformRef.current
    const platformSupportedBeforeMove =
      currentGroundedPlatform !== null &&
      verticalVelocityRef.current <= 0 &&
      Math.abs(jumpHeightRef.current - currentGroundedPlatform.height) <= GROUND_CONTACT_EPSILON &&
      platformSupportsFootprint(
        position,
        currentGroundedPlatform,
        PLATFORM_GROUNDED_SUPPORT_MARGIN + PLATFORM_EDGE_RELEASE_MARGIN,
      )
    const groundHeightBeforeMove = platformSupportedBeforeMove
      ? currentGroundedPlatform.height
      : getSupportedCourseGroundHeight(position, jumpHeightRef.current, verticalVelocityRef.current)
    const supportedBeforeMove =
      Math.abs(jumpHeightRef.current - groundHeightBeforeMove) <= GROUND_CONTACT_EPSILON && verticalVelocityRef.current <= 0
    raisedPlatformFootingTimerRef.current = Math.max(0, raisedPlatformFootingTimerRef.current - delta)
    const raisedPlatformFootingActive =
      raisedPlatformFootingTimerRef.current > 0 &&
      supportedBeforeMove &&
      Math.abs(groundHeightBeforeMove - raisedPlatformFootingHeightRef.current) <= GROUND_CONTACT_EPSILON
    const airborneBeforeMove =
      !supportedBeforeMove ||
      verticalVelocityRef.current > 0 ||
      jumpHeightRef.current > groundHeightBeforeMove + GROUND_CONTACT_EPSILON
    const targetSpeed = runIntent ? RUN_SPEED : WALK_SPEED
    const targetVelocityX = moving ? moveDirection.x * targetSpeed : 0
    const targetVelocityZ = moving ? moveDirection.z * targetSpeed : 0
    const speedBeforeDamping = Math.hypot(velocity.x, velocity.z)
    const brakingIntoStop = !moving && (stopStateRef.current !== null || (isLocomotionAnimation(animationRef.current) && speedBeforeDamping > STOP_MIN_SPEED))
    if (airborneBeforeMove) {
      const airDrag = Math.exp(-(jumpAnimationRef.current === 'ledge-fall' ? LEDGE_FALL_DRAG : AIR_DRAG) * delta)
      if (moving) {
        const airControl = dampFactor(AIR_ACCELERATION, delta)
        velocity.x = THREE.MathUtils.lerp(velocity.x, targetVelocityX, airControl)
        velocity.z = THREE.MathUtils.lerp(velocity.z, targetVelocityZ, airControl)
        velocity.x *= airDrag
        velocity.z *= airDrag
      } else {
        velocity.x *= airDrag
        velocity.z *= airDrag
      }
    } else {
      const horizontalDamp = dampFactor(moving ? ACCELERATION : brakingIntoStop ? STOP_BRAKE : BRAKE, delta)
      velocity.x = THREE.MathUtils.lerp(velocity.x, targetVelocityX, horizontalDamp)
      velocity.z = THREE.MathUtils.lerp(velocity.z, targetVelocityZ, horizontalDamp)
    }

    const previousPositionX = position.x
    const previousPositionZ = position.z
    position.x = clamp(position.x + velocity.x * delta, -ROOM_LIMIT, ROOM_LIMIT)
    position.z = clamp(position.z + velocity.z * delta, -ROOM_LIMIT, ROOM_LIMIT)

    if (Math.abs(position.x) >= ROOM_LIMIT) {
      velocity.x *= -0.18
    }

    if (Math.abs(position.z) >= ROOM_LIMIT) {
      velocity.z *= -0.18
    }

    if (
      raisedPlatformFootingActive &&
      getSupportedCourseGroundHeight(position, jumpHeightRef.current, verticalVelocityRef.current) <
        raisedPlatformFootingHeightRef.current - GROUND_CONTACT_EPSILON
    ) {
      position.x = previousPositionX
      position.z = previousPositionZ
      velocity.x = 0
      velocity.z = 0
    }

    if (
      !moving &&
      supportedBeforeMove &&
      groundHeightBeforeMove > 0 &&
      getSupportedCourseGroundHeight(position, jumpHeightRef.current, verticalVelocityRef.current) <
        groundHeightBeforeMove - GROUND_CONTACT_EPSILON
    ) {
      position.x = previousPositionX
      position.z = previousPositionZ
      velocity.x = 0
      velocity.z = 0
    }

    jumpCooldownRef.current = Math.max(0, jumpCooldownRef.current - delta)
    jumpBufferTimerRef.current = Math.max(0, jumpBufferTimerRef.current - delta)
    landingTimerRef.current = Math.max(0, landingTimerRef.current - delta)
    bumpExpressionTimerRef.current = Math.max(0, bumpExpressionTimerRef.current - delta)
    const jumpPressed = input.jump && !jumpHeldRef.current
    if (jumpPressed) {
      jumpBufferTimerRef.current = JUMP_BUFFER_SECONDS
    }
    if (supportedBeforeMove) {
      coyoteTimerRef.current = COYOTE_SECONDS
    } else {
      coyoteTimerRef.current = Math.max(0, coyoteTimerRef.current - delta)
    }
    const platformSupportedAfterMove =
      currentGroundedPlatform !== null &&
      verticalVelocityRef.current <= 0 &&
      Math.abs(jumpHeightRef.current - currentGroundedPlatform.height) <= GROUND_CONTACT_EPSILON &&
      platformSupportsFootprint(
        position,
        currentGroundedPlatform,
        PLATFORM_GROUNDED_SUPPORT_MARGIN + PLATFORM_EDGE_RELEASE_MARGIN,
      )
    let groundHeight = platformSupportedAfterMove
      ? currentGroundedPlatform.height
      : getSupportedCourseGroundHeight(position, jumpHeightRef.current, verticalVelocityRef.current)
    const supportLostAfterMove =
      supportedBeforeMove &&
      groundHeightBeforeMove > 0 &&
      groundHeight < groundHeightBeforeMove - LEDGE_FALL_MIN_DROP &&
      !platformSupportedAfterMove &&
      verticalVelocityRef.current <= 0 &&
      !jumpPressed
    if (supportLostAfterMove) {
      const dropHeight = Math.max(groundHeightBeforeMove - groundHeight, LEDGE_FALL_MIN_DROP)
      jumpAnimationRef.current = 'ledge-fall'
      jumpElapsedRef.current = 0
      jumpDurationRef.current = clamp(Math.sqrt((2 * dropHeight) / GRAVITY) * 1.32, 0.34, 0.68)
      jumpHeightRef.current = groundHeightBeforeMove
      verticalVelocityRef.current = Math.min(verticalVelocityRef.current, 0)
      groundedPlatformRef.current = null
      ledgeFallOriginHeightRef.current = groundHeightBeforeMove
      landingTimerRef.current = 0
      landingCushionRef.current = 0
      landingPhaseStartRef.current = HOP_LANDING_PHASE
      landingPhaseDurationRef.current = LANDING_VISUAL_SECONDS
      landingStepTimerRef.current = 0
      landingStepElapsedRef.current = 0
      phaseOverrideRef.current = LEDGE_FALL_PHASE_START
    }
    if (
      !supportLostAfterMove &&
      verticalVelocityRef.current <= 0 &&
      groundHeight > jumpHeightRef.current &&
      hasContinuousClimbSupportAtHeight(position, groundHeight)
    ) {
      jumpHeightRef.current = groundHeight
      verticalVelocityRef.current = 0
    }
    if (
      supportedBeforeMove &&
      !supportLostAfterMove &&
      !jumpPressed &&
      verticalVelocityRef.current <= 0 &&
      Math.abs(groundHeight - jumpHeightRef.current) <= MAX_AUTO_STEP_HEIGHT
    ) {
      jumpHeightRef.current = groundHeight
      verticalVelocityRef.current = 0
    }
    const groundedAtStart =
      Math.abs(jumpHeightRef.current - groundHeight) <= GROUND_CONTACT_EPSILON && verticalVelocityRef.current <= 0
    const ballMoveActiveAtStart = ballMoveStateRef.current.kind !== 'none'
    const canBallMove =
      !groundedAtStart &&
      !ballMoveUsedRef.current &&
      !ballMoveActiveAtStart &&
      jumpAnimationRef.current !== 'ledge-fall' &&
      jumpHeightRef.current > groundHeight + GROUND_CONTACT_EPSILON

    if (jumpPressed && canBallMove) {
      const wasMoving = moving || Math.hypot(velocity.x, velocity.z) > 0.55
      ballMoveStateRef.current = { kind: 'morph-charge', elapsed: 0, duration: BALL_CHARGE_SECONDS, wasMoving }
      ballMoveUsedRef.current = true
      ballMovePhaseRef.current = 0.08
      jumpAnimationRef.current = wasMoving ? 'forward-ball-bounce' : 'ball-bounce'
      jumpBufferTimerRef.current = 0
      landingTimerRef.current = 0
      landingStepTimerRef.current = 0
      landingStepElapsedRef.current = 0
      phaseOverrideRef.current = ballMovePhaseRef.current
    }

    if ((groundedAtStart || coyoteTimerRef.current > 0) && jumpBufferTimerRef.current > 0 && jumpCooldownRef.current <= 0) {
      const launchSpeed = runIntent ? JUMP_SPEED * RUN_JUMP_SPEED_MULTIPLIER : JUMP_SPEED
      verticalVelocityRef.current = launchSpeed
      jumpHeightRef.current = Math.max(jumpHeightRef.current, groundedAtStart ? groundHeight : groundHeightBeforeMove) + 0.001
      jumpCooldownRef.current = 0.2
      coyoteTimerRef.current = 0
      jumpBufferTimerRef.current = 0
      jumpElapsedRef.current = 0
      jumpDurationRef.current = (launchSpeed * 2) / GRAVITY
      jumpAnimationRef.current = Math.hypot(velocity.x, velocity.z) > 0.55 || moving ? 'forward-hop' : 'hop'
      ballMoveStateRef.current = { kind: 'none' }
      ballMoveUsedRef.current = false
      ballMovePhaseRef.current = 0
      groundedPlatformRef.current = null
      ledgeFallOriginHeightRef.current = 0
      landingTimerRef.current = 0
      landingCushionRef.current = 0
      landingPhaseStartRef.current = HOP_LANDING_PHASE
      landingPhaseDurationRef.current = LANDING_VISUAL_SECONDS
      phaseOverrideRef.current = HOP_LAUNCH_PHASE
    }

    const jumpHeightBeforePhysics = jumpHeightRef.current
    const airborneBeforePhysics = jumpHeightRef.current > groundHeight + GROUND_CONTACT_EPSILON || verticalVelocityRef.current > 0
    let landedThisFrame = false
    const ballMoveStateBeforePhysics = ballMoveStateRef.current
    if (ballMoveStateBeforePhysics.kind === 'morph-charge') {
      const nextElapsed = ballMoveStateBeforePhysics.elapsed + delta
      const chargeT = clamp(nextElapsed / ballMoveStateBeforePhysics.duration, 0, 1)
      verticalVelocityRef.current = THREE.MathUtils.lerp(
        verticalVelocityRef.current,
        Math.max(verticalVelocityRef.current, 0) * 0.18,
        dampFactor(18, delta),
      )
      jumpHeightRef.current += verticalVelocityRef.current * delta * 0.25
      ballMovePhaseRef.current = THREE.MathUtils.lerp(0.08, 0.42, chargeT)
      phaseOverrideRef.current = ballMovePhaseRef.current

      if (nextElapsed >= ballMoveStateBeforePhysics.duration) {
        verticalVelocityRef.current = -BALL_DIVE_SPEED
        ballMoveStateRef.current = { kind: 'dive', elapsed: 0, wasMoving: ballMoveStateBeforePhysics.wasMoving }
      } else {
        ballMoveStateRef.current = { ...ballMoveStateBeforePhysics, elapsed: nextElapsed }
      }
    } else if (ballMoveStateBeforePhysics.kind === 'dive') {
      const nextElapsed = ballMoveStateBeforePhysics.elapsed + delta
      verticalVelocityRef.current -= GRAVITY * BALL_DIVE_GRAVITY_MULTIPLIER * delta
      jumpHeightRef.current += verticalVelocityRef.current * delta
      ballMovePhaseRef.current = THREE.MathUtils.lerp(0.42, 0.66, clamp(nextElapsed / 0.24, 0, 1))
      phaseOverrideRef.current = ballMovePhaseRef.current

      if (ballMoveStateBeforePhysics.wasMoving) {
        const speed = Math.hypot(velocity.x, velocity.z)
        const capped = Math.min(speed * 1.01, BALL_REBOUND_MAX_HORIZONTAL_SPEED)
        if (speed > 0.001) {
          velocity.x = (velocity.x / speed) * capped
          velocity.z = (velocity.z / speed) * capped
        }
      }

      if (crossedLandingHeight(jumpHeightBeforePhysics, jumpHeightRef.current, groundHeight) && jumpHeightRef.current <= groundHeight && verticalVelocityRef.current <= 0) {
        const impactSpeed = Math.abs(verticalVelocityRef.current)
        jumpHeightRef.current = groundHeight + 0.001
        verticalVelocityRef.current = Math.max(BALL_REBOUND_SPEED, impactSpeed * 0.72 + JUMP_SPEED * 0.34)
        if (ballMoveStateBeforePhysics.wasMoving) {
          const speed = Math.hypot(velocity.x, velocity.z)
          if (speed > 0.001) {
            const boosted = Math.min(
              speed * BALL_REBOUND_HORIZONTAL_MULTIPLIER + BALL_REBOUND_HORIZONTAL_BONUS,
              BALL_REBOUND_MAX_HORIZONTAL_SPEED,
            )
            velocity.x = (velocity.x / speed) * boosted
            velocity.z = (velocity.z / speed) * boosted
          }
        }
        ballMovePhaseRef.current = 0.68
        phaseOverrideRef.current = ballMovePhaseRef.current
        ballMoveStateRef.current = {
          kind: 'impact-rebound',
          elapsed: 0,
          duration: BALL_IMPACT_SECONDS,
          wasMoving: ballMoveStateBeforePhysics.wasMoving,
        }
      } else {
        ballMoveStateRef.current = { ...ballMoveStateBeforePhysics, elapsed: nextElapsed }
      }
    } else if (airborneBeforePhysics) {
      jumpElapsedRef.current += delta
      verticalVelocityRef.current -= GRAVITY * delta
      jumpHeightRef.current += verticalVelocityRef.current * delta

      const crossedGroundDuringPhysics = crossedLandingHeight(jumpHeightBeforePhysics, jumpHeightRef.current, groundHeight)
      if (crossedGroundDuringPhysics && jumpHeightRef.current <= groundHeight && verticalVelocityRef.current <= 0) {
        const landingDuration = groundHeight > 0 ? RAISED_LANDING_SETTLE_SECONDS : LANDING_VISUAL_SECONDS
        jumpHeightRef.current = groundHeight
        verticalVelocityRef.current = 0
        landedThisFrame = true
        landingPhaseStartRef.current = HOP_IMPACT_PHASE
        landingPhaseDurationRef.current = landingDuration
        landingTimerRef.current = landingDuration
        if (jumpAnimationRef.current === 'forward-hop') {
          const landingSpeed = Math.hypot(velocity.x, velocity.z)
          locomotionPhaseRef.current = runIntent || landingSpeed > RUN_AUTO_THRESHOLD ? RUN_LANDING_CONTACT_PHASE : WALK_LANDING_CONTACT_PHASE
          landingStepTimerRef.current = MOVING_LANDING_STEP_SECONDS
          landingStepElapsedRef.current = 0
        }
        phaseOverrideRef.current = HOP_IMPACT_PHASE
      } else {
        const jumpProgress = clamp(jumpElapsedRef.current / jumpDurationRef.current, 0, 1)
        if (jumpAnimationRef.current === 'ledge-fall') {
          phaseOverrideRef.current = THREE.MathUtils.lerp(
            LEDGE_FALL_PHASE_START,
            LEDGE_FALL_PHASE_END,
            smootherstep01(jumpProgress),
          )
        } else {
          phaseOverrideRef.current = THREE.MathUtils.lerp(HOP_LAUNCH_PHASE, HOP_LANDING_PHASE, jumpProgress)
        }
      }
    } else if (landingTimerRef.current > 0) {
      const landingDuration = Math.max(0.001, landingPhaseDurationRef.current)
      const landingProgress = smootherstep01(1 - landingTimerRef.current / landingDuration)
      if (landingProgress < 0.18) {
        phaseOverrideRef.current = THREE.MathUtils.lerp(
          landingPhaseStartRef.current,
          HOP_IMPACT_PHASE,
          smootherstep01(landingProgress / 0.18),
        )
      } else {
        phaseOverrideRef.current = THREE.MathUtils.lerp(
          HOP_IMPACT_PHASE,
          HOP_RECOVERY_END_PHASE,
          smootherstep01((landingProgress - 0.18) / 0.82),
        )
      }
    } else {
      phaseOverrideRef.current = undefined
    }

    const ballMoveStateAfterPhysics = ballMoveStateRef.current
    if (ballMoveStateAfterPhysics.kind === 'impact-rebound') {
      const nextElapsed = Math.min(ballMoveStateAfterPhysics.duration, ballMoveStateAfterPhysics.elapsed + delta)
      const impactT = clamp(nextElapsed / ballMoveStateAfterPhysics.duration, 0, 1)
      ballMovePhaseRef.current = THREE.MathUtils.lerp(0.68, 0.82, smootherstep01(impactT))
      phaseOverrideRef.current = ballMovePhaseRef.current
      if (nextElapsed >= ballMoveStateAfterPhysics.duration) {
        ballMoveStateRef.current = {
          kind: 'unroll',
          elapsed: 0,
          duration: BALL_UNROLL_SECONDS,
          wasMoving: ballMoveStateAfterPhysics.wasMoving,
        }
      } else {
        ballMoveStateRef.current = { ...ballMoveStateAfterPhysics, elapsed: nextElapsed }
      }
    } else if (ballMoveStateAfterPhysics.kind === 'unroll') {
      const nextElapsed = Math.min(ballMoveStateAfterPhysics.duration, ballMoveStateAfterPhysics.elapsed + delta)
      const unrollT = clamp(nextElapsed / ballMoveStateAfterPhysics.duration, 0, 1)
      ballMovePhaseRef.current = THREE.MathUtils.lerp(0.82, 0.995, smootherstep01(unrollT))
      phaseOverrideRef.current = ballMovePhaseRef.current
      if (nextElapsed >= ballMoveStateAfterPhysics.duration) {
        ballMoveStateRef.current = { kind: 'none' }
        jumpAnimationRef.current = ballMoveStateAfterPhysics.wasMoving ? 'forward-hop' : 'hop'
      } else {
        ballMoveStateRef.current = { ...ballMoveStateAfterPhysics, elapsed: nextElapsed }
      }
    }
    if (landingStepTimerRef.current > 0) {
      landingStepElapsedRef.current = Math.min(MOVING_LANDING_STEP_SECONDS, landingStepElapsedRef.current + delta)
    }
    landingStepTimerRef.current = Math.max(0, landingStepTimerRef.current - delta)

    const preCollisionPositionX = position.x
    const preCollisionPositionZ = position.z
    const preCollisionVelocityX = velocity.x
    const preCollisionVelocityZ = velocity.z
    const preserveNoInputAirbornePosition =
      !moving &&
      airborneBeforePhysics &&
      jumpHeightBeforePhysics > groundHeightBeforeMove + GROUND_CONTACT_EPSILON &&
      verticalVelocityRef.current <= 0
    const preCollisionLandingContact =
      airborneBeforePhysics && verticalVelocityRef.current <= 0
        ? getAirLandingContact(position, jumpHeightBeforePhysics, jumpHeightRef.current)
        : undefined
    const hitObstacle = resolveCourseCollisions(
      position,
      velocity,
      jumpHeightRef.current,
      groundHeightBeforeMove,
      verticalVelocityRef.current,
      moving,
    )
    const hitMuseumWaterBoundary = resolveMuseumWaterBoundary(
      position,
      velocity,
      preCollisionPositionX,
      preCollisionPositionZ,
    )
    const hitTraversalObstacle = hitObstacle || hitMuseumWaterBoundary
    if (
      preserveNoInputAirbornePosition &&
      Math.hypot(position.x - preCollisionPositionX, position.z - preCollisionPositionZ) > 0.001
    ) {
      position.x = preCollisionPositionX
      position.z = preCollisionPositionZ
      velocity.x = preCollisionVelocityX
      velocity.z = preCollisionVelocityZ
    }
    const platformSupportedAfterCollision =
      currentGroundedPlatform !== null &&
      verticalVelocityRef.current <= 0 &&
      Math.abs(jumpHeightRef.current - currentGroundedPlatform.height) <= GROUND_CONTACT_EPSILON &&
      platformSupportsFootprint(
        position,
        currentGroundedPlatform,
        PLATFORM_GROUNDED_SUPPORT_MARGIN + PLATFORM_EDGE_RELEASE_MARGIN,
      )
    groundHeight = platformSupportedAfterCollision
      ? currentGroundedPlatform.height
      : getSupportedCourseGroundHeight(position, jumpHeightRef.current, verticalVelocityRef.current)
    const postCollisionLandingContact =
      airborneBeforePhysics && verticalVelocityRef.current <= 0
        ? getAirLandingContact(position, jumpHeightBeforePhysics, jumpHeightRef.current)
        : undefined
    if (!moving && airborneBeforePhysics && !preCollisionLandingContact && postCollisionLandingContact) {
      position.x = preCollisionPositionX
      position.z = preCollisionPositionZ
      groundHeight = getSupportedCourseGroundHeight(position, jumpHeightRef.current, verticalVelocityRef.current)
    }
    const rawLandingContact = preCollisionLandingContact ?? (moving ? postCollisionLandingContact : undefined)
    const landingContact =
      rawLandingContact &&
      jumpAnimationRef.current === 'ledge-fall' &&
      rawLandingContact.height >= ledgeFallOriginHeightRef.current - GROUND_CONTACT_EPSILON
        ? undefined
        : rawLandingContact
    if (landingContact && landingContact.height > groundHeight) {
      groundHeight = landingContact.height
    }
    if (
      !airborneBeforePhysics &&
      verticalVelocityRef.current <= 0 &&
      groundHeight > jumpHeightRef.current &&
      hasContinuousClimbSupportAtHeight(position, groundHeight)
    ) {
      jumpHeightRef.current = groundHeight
      verticalVelocityRef.current = 0
    }
    const crossedReachablePlatformTop =
      groundHeight > 0 &&
      airborneBeforePhysics &&
      verticalVelocityRef.current <= 0 &&
      jumpHeightBeforePhysics >= groundHeight - PLATFORM_LANDING_CATCH_GRACE &&
      jumpHeightRef.current <= groundHeight + PLATFORM_LANDING_CATCH_GRACE
    if (
      !airborneBeforePhysics &&
      verticalVelocityRef.current <= 0 &&
      groundHeight > jumpHeightRef.current &&
      groundHeight - jumpHeightRef.current <= MAX_AUTO_STEP_HEIGHT
    ) {
      jumpHeightRef.current = groundHeight
      verticalVelocityRef.current = 0
    }
    const crossedGroundAfterCollision = crossedLandingHeight(jumpHeightBeforePhysics, jumpHeightRef.current, groundHeight)
    if (
      ((jumpHeightRef.current <= groundHeight && crossedGroundAfterCollision) || crossedReachablePlatformTop) &&
      (verticalVelocityRef.current < 0 || airborneBeforePhysics)
    ) {
      const landingDuration = groundHeight > 0 ? RAISED_LANDING_SETTLE_SECONDS : LANDING_VISUAL_SECONDS
      jumpHeightRef.current = groundHeight
      verticalVelocityRef.current = 0
      landedThisFrame = true
      landingPhaseStartRef.current = HOP_IMPACT_PHASE
      landingPhaseDurationRef.current = landingDuration
      landingTimerRef.current = landingDuration
      phaseOverrideRef.current = HOP_IMPACT_PHASE
    }
    if (landedThisFrame) {
      ledgeFallOriginHeightRef.current = 0
      groundedPlatformRef.current =
        groundHeight > 0 ? getPlatformSupportAtHeight(position, groundHeight, PLATFORM_GROUNDED_SUPPORT_MARGIN) : null
      visualHeightRef.current = groundHeight
      landingCushionRef.current = groundHeight > 0 ? Math.max(landingCushionRef.current, RAISED_LANDING_CUSHION) : 0
      renderedHeightRef.current = visualHeightRef.current + landingCushionRef.current
    }
    if (landedThisFrame && groundHeight > 0) {
      raisedPlatformFootingTimerRef.current = RAISED_PLATFORM_FOOTING_SECONDS
      raisedPlatformFootingHeightRef.current = groundHeight

      if (!moving) {
        landingStepTimerRef.current = 0
        landingStepElapsedRef.current = 0
      }
    }
    if (
      !airborneBeforePhysics &&
      verticalVelocityRef.current <= 0 &&
      Math.abs(jumpHeightRef.current - groundHeight) <= GROUND_CONTACT_EPSILON
    ) {
      jumpHeightRef.current = groundHeight
      groundedPlatformRef.current =
        groundHeight > 0 ? getPlatformSupportAtHeight(position, groundHeight, PLATFORM_GROUNDED_SUPPORT_MARGIN) : null
    }
    const heightAboveGround = Math.max(0, jumpHeightRef.current - groundHeight)
    if (hitTraversalObstacle && heightAboveGround <= 0.08) {
      bumpExpressionTimerRef.current = 0.18
    }
    position.x = clamp(position.x, -ROOM_LIMIT, ROOM_LIMIT)
    position.z = clamp(position.z, -ROOM_LIMIT, ROOM_LIMIT)

    const physicsAirborneNow = heightAboveGround > GROUND_CONTACT_EPSILON || verticalVelocityRef.current > 0
    if (!physicsAirborneNow && groundHeight <= 0.05) {
      lastSafePositionRef.current.copy(position)
    }

    let horizontalSpeed = Math.hypot(velocity.x, velocity.z)
    if (landedThisFrame && !moving && horizontalSpeed > 0) {
      velocity.x *= 0.26
      velocity.z *= 0.26
      if (Math.hypot(velocity.x, velocity.z) < 0.45) {
        velocity.x = 0
        velocity.z = 0
      }
      landingStepTimerRef.current = 0
      landingStepElapsedRef.current = 0
      horizontalSpeed = Math.hypot(velocity.x, velocity.z)
    }
    const directionForFacing = moving || horizontalSpeed > 0.12 ? new THREE.Vector3(velocity.x, 0, velocity.z) : null

    if (directionForFacing && directionForFacing.lengthSq() > 0.001) {
      directionForFacing.normalize()
      const targetFacing = Math.atan2(-directionForFacing.x, -directionForFacing.z)
      facingRef.current = lerpAngle(facingRef.current, targetFacing, dampFactor(TURN_SMOOTHING, delta))
    }

	    const physicsAirborne = heightAboveGround > GROUND_CONTACT_EPSILON || verticalVelocityRef.current > 0
	    if (physicsAirborne && stopStateRef.current) {
	      stopStateRef.current = null
	    }
    if (!physicsAirborne && landingTimerRef.current <= 0 && ballMoveStateRef.current.kind === 'none') {
      ballMoveUsedRef.current = false
    }
	    if (physicsAirborne) {
	      landingCushionRef.current = 0
	    } else if (landingCushionRef.current > 0) {
      landingCushionRef.current = Math.max(0, landingCushionRef.current - (RAISED_LANDING_CUSHION / RAISED_LANDING_CUSHION_SECONDS) * delta)
    }
    const visualHeightTarget = jumpHeightRef.current
    const visualHeightDelta = Math.abs(visualHeightTarget - visualHeightRef.current)
    if (!physicsAirborne && verticalVelocityRef.current <= 0) {
      const settleStrength = visualHeightRef.current > visualHeightTarget ? 9.5 : visualHeightDelta <= MAX_AUTO_STEP_HEIGHT + 0.04 ? 15 : 22
      const settledVisualHeight = THREE.MathUtils.lerp(visualHeightRef.current, visualHeightTarget, dampFactor(settleStrength, delta))
      visualHeightRef.current =
        visualHeightRef.current > visualHeightTarget
          ? Math.max(visualHeightTarget, Math.max(settledVisualHeight, visualHeightRef.current - GROUNDED_VISUAL_DESCENT_SPEED * delta))
          : settledVisualHeight
      if (Math.abs(visualHeightTarget - visualHeightRef.current) <= 0.006) {
        visualHeightRef.current = visualHeightTarget
      }
    } else {
      visualHeightRef.current = THREE.MathUtils.lerp(visualHeightRef.current, visualHeightTarget, dampFactor(34, delta))
      if (Math.abs(visualHeightTarget - visualHeightRef.current) <= 0.01) {
        visualHeightRef.current = visualHeightTarget
      }
    }
    const movingLandingStepCandidate = moving && landingStepTimerRef.current > 0 && horizontalSpeed > 0.18
    const poseAirborne = physicsAirborne || (landingTimerRef.current > 0 && !movingLandingStepCandidate)

    if (!moving && !poseAirborne && stopStateRef.current === null && isLocomotionAnimation(animationRef.current) && horizontalSpeed > STOP_MIN_SPEED) {
      stopStateRef.current = {
        fromAnimation: animationRef.current,
        elapsed: 0,
        duration: clamp(0.32 + horizontalSpeed * 0.012 + (animationRef.current === 'run' ? 0.08 : 0), 0.34, 0.58),
        startSpeed: horizontalSpeed,
      }
    }
    if (stopStateRef.current && !moving && !poseAirborne) {
      stopStateRef.current.elapsed = Math.min(stopStateRef.current.duration, stopStateRef.current.elapsed + delta)
    }
    const stopState = stopStateRef.current
    const stopActive = Boolean(stopState && !moving && !poseAirborne && stopState.elapsed < stopState.duration)
    if (stopState && !stopActive && !moving && !poseAirborne) {
      stopStateRef.current = null
      idlePhaseRef.current = 0.035
      velocity.x = 0
      velocity.z = 0
      horizontalSpeed = 0
    }
    const movingLandingStep = movingLandingStepCandidate
    const ballMoveState = ballMoveStateRef.current
    const ballMoveActive = ballMoveState.kind !== 'none'
    const nextAnimation: PsychedelicPogoOrbAnimation = ballMoveActive
      ? ballMoveState.wasMoving
        ? 'forward-ball-bounce'
        : 'ball-bounce'
      : poseAirborne
        ? jumpAnimationRef.current
        : movingLandingStep
          ? runIntent || horizontalSpeed > RUN_AUTO_THRESHOLD
            ? 'run'
            : 'walk-2'
          : stopActive
            ? 'stop'
          : runIntent || horizontalSpeed > RUN_AUTO_THRESHOLD
              ? 'run'
              : horizontalSpeed > 0.18
                ? 'walk-2'
                : 'idle'
    const activityMax = poseAirborne
      ? nextAnimation === 'forward-ball-bounce' || nextAnimation === 'ball-bounce'
        ? 1.42
        : nextAnimation === 'forward-hop'
          ? 1.32
          : 1.24
      : nextAnimation === 'run'
        ? 1.16
        : nextAnimation === 'stop'
          ? 1.04
          : 1.08
    const targetActivity = clamp(
      poseAirborne
        ? 1.06 + horizontalSpeed * (nextAnimation === 'forward-hop' || nextAnimation === 'forward-ball-bounce' ? 0.034 : 0.024)
        : nextAnimation === 'stop'
          ? 0.78 + (stopState?.startSpeed ?? horizontalSpeed) * 0.012
        : 0.74 + horizontalSpeed * 0.034 + Number(nextAnimation === 'run') * 0.04,
      0.74,
      activityMax,
    )
    const nextActivity = THREE.MathUtils.lerp(
      activityRef.current,
      targetActivity,
      dampFactor(isJumpAnimation(nextAnimation) ? 14 : 9.5, delta),
    )
    activityRef.current = nextActivity

    if (animationRef.current !== nextAnimation) {
      const currentAvatarProps = avatarPropsRef.current
      const isMovingLandingHandoff =
        (currentAvatarProps.animation === 'forward-hop' || currentAvatarProps.animation === 'forward-ball-bounce') &&
        (nextAnimation === 'walk-2' || nextAnimation === 'run')
      if (nextAnimation === 'idle') {
        idlePhaseRef.current = currentAvatarProps.animation === 'stop' ? 0.035 : normalizePhase(currentAvatarProps.phaseOverride ?? locomotionPhaseRef.current)
      } else if (currentAvatarProps.animation === 'idle' && isLocomotionAnimation(nextAnimation)) {
        locomotionPhaseRef.current = normalizePhase(currentAvatarProps.phaseOverride ?? idlePhaseRef.current)
      }
      transitionRef.current = {
        fromAnimation: currentAvatarProps.animation,
        fromActivity: currentAvatarProps.activity,
        fromPhaseOverride: isMovingLandingHandoff ? HOP_IMPACT_PHASE : currentAvatarProps.phaseOverride,
        elapsed: 0,
        duration: transitionDuration(currentAvatarProps.animation, nextAnimation),
      }
      animationRef.current = nextAnimation
    }

    let nextPhaseOverride = isJumpAnimation(nextAnimation)
      ? ballMoveActive
        ? ballMovePhaseRef.current
        : phaseOverrideRef.current ?? HOP_RECOVERY_END_PHASE
      : nextAnimation === 'idle'
        ? idlePhaseRef.current
        : nextAnimation === 'stop' && stopState
          ? clamp(stopState.elapsed / stopState.duration, 0, 1)
          : undefined

    if (nextAnimation === 'walk-2' || nextAnimation === 'run') {
      const strideUnits = nextAnimation === 'run' ? RUN_STRIDE_UNITS : WALK_STRIDE_UNITS
      const cadenceBoost = nextAnimation === 'run' ? RUN_CADENCE_BOOST : WALK_CADENCE_BOOST
      const travelCadence = (horizontalSpeed / strideUnits) * cadenceBoost
      const landingCadence = nextAnimation === 'run' ? RUN_LANDING_CADENCE : WALK_LANDING_CADENCE
      const landingStepActive = landingStepTimerRef.current > 0
      const landingStepT = smootherstep01(landingStepElapsedRef.current / MOVING_LANDING_STEP_SECONDS)
      const brakeCadence =
        !moving && horizontalSpeed > 0.18
          ? (nextAnimation === 'run' ? RUN_BRAKE_CADENCE : WALK_BRAKE_CADENCE) *
            smootherstep01(horizontalSpeed / (nextAnimation === 'run' ? RUN_AUTO_THRESHOLD : WALK_SPEED))
          : 0
      const groundedCadence = landingStepActive
        ? THREE.MathUtils.lerp(travelCadence * 0.38, Math.max(travelCadence, landingCadence), landingStepT)
        : Math.max(travelCadence, brakeCadence)
      locomotionPhaseRef.current = (locomotionPhaseRef.current + groundedCadence * delta) % 1
      nextPhaseOverride = locomotionPhaseRef.current
    } else if (nextAnimation === 'idle') {
      const idleRate = (0.86 + nextActivity * 0.18) / IDLE_CYCLE_SECONDS
      idlePhaseRef.current = normalizePhase(idlePhaseRef.current + idleRate * delta)
      nextPhaseOverride = idlePhaseRef.current
    }

    let transitionBlend = 1
    const transition = transitionRef.current
    if (transition && transition.duration > 0) {
      transition.elapsed += delta
      transitionBlend = clamp(transition.elapsed / transition.duration, 0, 1)
      if (transitionBlend >= 1) {
        transitionRef.current = null
        transitionBlend = 1
      }
    } else if (transition) {
      transitionRef.current = null
    }

    const activeTransition = transitionBlend < 1 ? transitionRef.current : null
    const nextExpression: PsychedelicPogoOrbExpression = bumpExpressionTimerRef.current > 0 ? 'effort' : 'auto'
    const nextAvatarProps: ControlAvatarProps = {
      animation: nextAnimation,
      activity: nextActivity,
      expression: nextExpression,
      phaseOverride: nextPhaseOverride,
      transitionBlend,
      transitionFromAnimation: activeTransition?.fromAnimation,
      transitionFromActivity: activeTransition?.fromActivity,
      transitionFromPhaseOverride: activeTransition?.fromPhaseOverride,
    }
    const currentAvatarProps = avatarPropsRef.current
    const phaseChanged =
      nextPhaseOverride === undefined
        ? currentAvatarProps.phaseOverride !== undefined
        : currentAvatarProps.phaseOverride === undefined || Math.abs(nextPhaseOverride - currentAvatarProps.phaseOverride) > 0.008
    const transitionChanged =
      currentAvatarProps.transitionFromAnimation !== nextAvatarProps.transitionFromAnimation ||
      currentAvatarProps.transitionFromPhaseOverride !== nextAvatarProps.transitionFromPhaseOverride ||
      Math.abs(currentAvatarProps.transitionBlend - nextAvatarProps.transitionBlend) > 0.025

    if (
      currentAvatarProps.animation !== nextAvatarProps.animation ||
      currentAvatarProps.expression !== nextAvatarProps.expression ||
      Math.abs(currentAvatarProps.activity - nextActivity) > 0.025 ||
      phaseChanged ||
      transitionChanged
    ) {
      setAvatarProps(nextAvatarProps)
    }

    const renderHeightTarget = visualHeightRef.current + landingCushionRef.current
    if (physicsAirborne || renderHeightTarget >= renderedHeightRef.current) {
      renderedHeightRef.current = renderHeightTarget
    } else {
      renderedHeightRef.current = Math.max(
        renderHeightTarget,
        THREE.MathUtils.lerp(renderedHeightRef.current, renderHeightTarget, dampFactor(RENDERED_HEIGHT_DESCENT_DAMPING, delta)),
      )
    }

    if (playerRef.current) {
      playerRef.current.position.set(position.x, renderedHeightRef.current, position.z)
      playerRef.current.rotation.y = facingRef.current
    }

    const visualJumpLift = estimateVisualJumpLift(nextAnimation, phaseOverrideRef.current) * 0.08
    const renderHeight = renderedHeightRef.current
    const cameraLookAhead = cameraLookAheadRef.current
    const cameraLookAheadTarget = cameraLookAheadTargetRef.current
    const cameraLeadDistance = clamp(horizontalSpeed * 0.13, 0, MARIO_CAMERA_MAX_LOOKAHEAD)
    if (horizontalSpeed > 0.18) {
      cameraLookAheadTarget.set(velocity.x, 0, velocity.z).normalize().multiplyScalar(cameraLeadDistance)
    } else {
      cameraLookAheadTarget.set(0, 0, -MUSEUM_CAMERA_IDLE_LOOKAHEAD)
    }
    cameraLookAhead.lerp(cameraLookAheadTarget, dampFactor(physicsAirborne ? 4.4 : 6.6, delta))
    if (cameraOrbit.mode === 'overhead') {
      state.camera.up.set(0, 0, -1)
      const overheadHeight = OVERHEAD_CAMERA_BASE_HEIGHT * cameraZoom
      const overheadTarget = cameraTargetRef.current.set(0, 0, OVERHEAD_CAMERA_TARGET_Z)
      const overheadPosition = cameraPositionRef.current.set(0, overheadHeight, OVERHEAD_CAMERA_TARGET_Z)
      state.camera.position.lerp(overheadPosition, dampFactor(8.4, delta))
      state.camera.lookAt(overheadTarget)
    } else {
      state.camera.up.set(0, 1, 0)
      const cameraTarget = cameraTargetRef.current.set(
        position.x + cameraLookAhead.x,
        MARIO_CAMERA_TARGET_HEIGHT + renderHeight * 0.64 + visualJumpLift * 0.42,
        position.z + cameraLookAhead.z,
      )
      const baseDistance = MARIO_CAMERA_DISTANCE * cameraZoom
      const baseAngle = cameraHeadingRef.current + cameraOrbit.yaw
      const pitchScale = Math.cos(cameraOrbit.pitch)
      const cameraPosition = cameraPositionRef.current.set(
        position.x + Math.sin(baseAngle) * baseDistance * pitchScale,
        MARIO_CAMERA_HEIGHT * cameraZoom + Math.sin(cameraOrbit.pitch) * 4.15 * cameraZoom + renderHeight * 0.66 + visualJumpLift * 0.48,
        position.z + Math.cos(baseAngle) * baseDistance * pitchScale,
      )
      state.camera.position.lerp(cameraPosition, dampFactor(7.2, delta))
      state.camera.lookAt(cameraTarget)
    }

    for (const glyph of MUSEUM_GAMEPLAY_GLYPHS) {
      const collected = progressRef.current.collectedGlyphIds.includes(glyph.id)
      if (canCollectMuseumGameplayGlyph(glyph, position, jumpHeightRef.current, collected)) {
        collectGlyphOnce(glyph.id)
      }
    }
    const doorSealActive = isMuseumDoorSealActive(progressRef.current)
    if (canTriggerMuseumDoorSeal(MUSEUM_DOOR_SEAL, position, jumpHeightRef.current, doorSealActive, progressRef.current.finishTriggered)) {
      finishSliceOnce()
    }
    const progressSnapshot = progressRef.current

    readoutTimerRef.current += delta
    if (readoutTimerRef.current > 0.12) {
      readoutTimerRef.current = 0
      onReadout({
        animation: nextAnimation,
        activity: nextActivity,
        speed: horizontalSpeed,
        height: jumpHeightRef.current,
        groundHeight,
        grounded: !physicsAirborne,
        surface: getPlaySurfaceLabel(position, groundHeight),
        glyphCount: progressSnapshot.collectedGlyphIds.length,
        requiredGlyphCount: REQUIRED_MUSEUM_GAMEPLAY_GLYPH_IDS.length,
        doorSealActive,
        finishTriggered: progressSnapshot.finishTriggered,
      })
    }
    window.__pogoControlState = {
      x: position.x,
      z: position.z,
      height: jumpHeightRef.current,
      visualHeight: visualHeightRef.current,
      groundHeight,
      maxStandingJumpHeight: STANDING_JUMP_APEX_HEIGHT,
      maxRunningJumpHeight: RUNNING_JUMP_APEX_HEIGHT,
      renderHeight,
      landingCushion: landingCushionRef.current,
      phaseOverride: nextPhaseOverride,
      ballMoveState: ballMoveStateRef.current.kind,
      grounded: !physicsAirborne,
      animation: nextAnimation,
      speed: horizontalSpeed,
      levelModel: LEVEL_MODEL,
      arenaPhase: 'museum-readable-hill-no-mounds-v26',
      pathWidth: MUSEUM_SCALE_PATH.width,
      pathLength: MUSEUM_SCALE_PATH.length,
      pathToEnjoyableRatio: MUSEUM_SCALE_PATH.width / (PLAYER_COLLISION_RADIUS * 2),
      surface: getPlaySurfaceLabel(position, groundHeight),
      cameraMode: cameraOrbit.mode,
      glyphCount: progressSnapshot.collectedGlyphIds.length,
      requiredGlyphCount: REQUIRED_MUSEUM_GAMEPLAY_GLYPH_IDS.length,
      doorSealActive,
      finishTriggered: progressSnapshot.finishTriggered,
    }

    jumpHeldRef.current = input.jump
  })

  return (
    <group ref={playerRef}>
      <PsychedelicPogoOrbAsset
        animation={avatarProps.animation}
        activity={avatarProps.activity}
        colorCycleSpeed={2.4}
        debugMaterial="super-psychedelic"
        expression={avatarProps.expression}
        glowIntensity={1.6}
        phaseOverride={avatarProps.phaseOverride}
        scale={0.82}
        transitionBlend={avatarProps.transitionBlend}
        transitionFromActivity={avatarProps.transitionFromActivity}
        transitionFromAnimation={avatarProps.transitionFromAnimation}
        transitionFromPhaseOverride={avatarProps.transitionFromPhaseOverride}
        verticalMotionScale={0}
      />
    </group>
  )
}

function ControlRoomScene({
  cameraZoom,
  cameraOrbit,
  onReadout,
  progress,
  onCollectGlyph,
  onFinish,
}: {
  cameraZoom: number
  cameraOrbit: CameraOrbit
  onReadout: (readout: AvatarReadout) => void
  progress: MuseumGameplayProgress
  onCollectGlyph: (glyphId: MuseumGameplayGlyphId) => void
  onFinish: () => void
}) {
  return (
    <>
      <color attach="background" args={['#8ed4ff']} />
      <fog attach="fog" args={cameraOrbit.mode === 'overhead' ? ['#8ed4ff', 1800, 3200] : ['#8ed4ff', 240, 1250]} />
      <ambientLight intensity={1.05} color="#fff5df" />
      <hemisphereLight args={['#fff1a8', '#75ccd8', 0.46]} />
      <directionalLight position={[4, 8, 5]} intensity={1.85} color="#fff0ac" />
      <directionalLight position={[-5, 4, -3]} intensity={0.5} color="#8befff" />
      <ControlRoomFloor progress={progress} />
      <PlayerController
        cameraOrbit={cameraOrbit}
        cameraZoom={cameraZoom}
        onReadout={onReadout}
        onCollectGlyph={onCollectGlyph}
        onFinish={onFinish}
        progress={progress}
      />
    </>
  )
}

function ControlRoomApp() {
  const [readout, setReadout] = useState<AvatarReadout>({
    animation: 'idle',
    activity: 0.86,
    speed: 0,
    height: 0,
    groundHeight: 0,
    grounded: true,
    surface: 'main path',
    glyphCount: 0,
    requiredGlyphCount: REQUIRED_MUSEUM_GAMEPLAY_GLYPH_IDS.length,
    doorSealActive: false,
    finishTriggered: false,
  })
  const [progress, setProgress] = useState<MuseumGameplayProgress>(() => initialMuseumGameplayProgress())
  const [cameraZoom, setCameraZoom] = useState(DEFAULT_CAMERA_ZOOM)
  const [cameraYaw, setCameraYaw] = useState(DEFAULT_CAMERA_YAW)
  const [cameraPitch, setCameraPitch] = useState(DEFAULT_CAMERA_PITCH)
  const [cameraMode, setCameraMode] = useState<CameraMode>(initialCameraMode)
  const cameraDragRef = useRef({ active: false })
  const cameraOrbit = useMemo(() => ({ yaw: cameraYaw, pitch: cameraPitch, mode: cameraMode }), [cameraYaw, cameraMode, cameraPitch])
  const cameraYawDegrees = Math.round(THREE.MathUtils.radToDeg(cameraYaw))
  const cameraPitchDegrees = Math.round(THREE.MathUtils.radToDeg(cameraPitch))
  const pathToEnjoyableRatio = Math.round(MUSEUM_SCALE_PATH.width / (PLAYER_COLLISION_RADIUS * 2))

  const collectGlyph = (glyphId: MuseumGameplayGlyphId) => {
    setProgress((current) => {
      if (current.collectedGlyphIds.includes(glyphId)) return current

      return {
        ...current,
        collectedGlyphIds: [...current.collectedGlyphIds, glyphId],
      }
    })
  }

  const finishSlice = () => {
    setProgress((current) => current.finishTriggered ? current : { ...current, finishTriggered: true })
  }

  const rotateCamera = (yawDelta: number, pitchDelta = 0) => {
    setCameraYaw((current) => current + yawDelta)
    if (pitchDelta !== 0) {
      setCameraPitch((current) => clamp(current + pitchDelta, MIN_CAMERA_PITCH, MAX_CAMERA_PITCH))
    }
  }

  const resetCamera = () => {
    setCameraYaw(DEFAULT_CAMERA_YAW)
    setCameraPitch(DEFAULT_CAMERA_PITCH)
    setCameraZoom(DEFAULT_CAMERA_ZOOM)
    setCameraMode('follow')
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isCameraControlTarget(event.target)) return
    cameraDragRef.current.active = true
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!cameraDragRef.current.active) return
    setCameraYaw((current) => current - event.movementX * CAMERA_DRAG_YAW_SPEED)
    setCameraPitch((current) => clamp(current + event.movementY * CAMERA_DRAG_PITCH_SPEED, MIN_CAMERA_PITCH, MAX_CAMERA_PITCH))
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    cameraDragRef.current.active = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div
      className="control-room"
      data-level-model={LEVEL_MODEL}
      data-arena-phase="museum-readable-hill-no-mounds-v26"
      data-path-length={MUSEUM_SCALE_PATH.length}
      data-path-width={MUSEUM_SCALE_PATH.width}
      data-path-to-enjoyable-ratio={pathToEnjoyableRatio}
      data-legacy-visual-count={LEGACY_CONTROL_ROOM_VISUAL_COUNT}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={(event) => {
        setCameraZoom((current) => clamp(current + event.deltaY * 0.0018, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM))
      }}
    >
      <Canvas
        camera={{
          position: [
            Math.sin(MARIO_CAMERA_SHOULDER_YAW) * MARIO_CAMERA_DISTANCE,
            MARIO_CAMERA_HEIGHT,
            Math.cos(MARIO_CAMERA_SHOULDER_YAW) * MARIO_CAMERA_DISTANCE,
          ],
          fov: 45,
          near: 0.1,
          far: 2200,
        }}
      >
        <ControlRoomScene
          cameraOrbit={cameraOrbit}
          cameraZoom={cameraZoom}
          onCollectGlyph={collectGlyph}
          onFinish={finishSlice}
          onReadout={setReadout}
          progress={progress}
        />
      </Canvas>
      <button className="room-mark" type="button" onClick={() => { window.location.href = '/' }}>
        Preview
      </button>
      <div className="camera-pad" aria-label="Camera controls" onPointerDown={(event) => { event.stopPropagation() }}>
        <button type="button" aria-label="Rotate camera left" onClick={() => { rotateCamera(-CAMERA_BUTTON_YAW_STEP) }}>
          &lt;
        </button>
        <button type="button" aria-label="Tilt camera up" onClick={() => { rotateCamera(0, CAMERA_BUTTON_PITCH_STEP) }}>
          ^
        </button>
        <button type="button" aria-label="Rotate camera right" onClick={() => { rotateCamera(CAMERA_BUTTON_YAW_STEP) }}>
          &gt;
        </button>
        <button type="button" aria-label="Tilt camera down" onClick={() => { rotateCamera(0, -CAMERA_BUTTON_PITCH_STEP) }}>
          v
        </button>
        <button type="button" aria-label="Reset camera" onClick={resetCamera}>
          0
        </button>
        <button
          type="button"
          aria-label="Toggle overhead map camera"
          className={cameraMode === 'overhead' ? 'is-active' : undefined}
          onClick={() => {
            setCameraMode((current) => (current === 'overhead' ? 'follow' : 'overhead'))
          }}
        >
          Top
        </button>
      </div>
      <div className="room-hud" aria-hidden="true">
        <span>{readout.animation}</span>
        <span>{readout.grounded ? 'grounded' : 'airborne'}</span>
        <span>{readout.surface}</span>
        <span>{LEVEL_MODEL_LABEL}</span>
        <span>{readout.glyphCount}/{readout.requiredGlyphCount} glyphs</span>
        <span>{readout.finishTriggered ? 'slice complete' : readout.doorSealActive ? 'seal active' : 'seal locked'}</span>
        <span>{MUSEUM_SCALE_PATH.width}u wide</span>
        <span>{readout.speed.toFixed(1)} m/s</span>
        <span>{readout.activity.toFixed(2)}x</span>
        <span>{readout.height.toFixed(1)} y</span>
        <span>{readout.groundHeight.toFixed(1)} floor</span>
        <span>{cameraZoom.toFixed(1)} zoom</span>
        <span>{cameraYawDegrees} cam</span>
        <span>{cameraPitchDegrees} tilt</span>
        <span>{cameraMode}</span>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root') as HTMLElement).render(<ControlRoomApp />)
