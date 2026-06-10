import {
  Canvas,
  THREE,
  advance,
  createRoot,
  type MutableRefObject,
  type PointerEvent,
  type WheelEvent,
  useEffect,
  useFrame,
  useRef,
  useState,
  useThree,
} from '@/render/threeRuntime'
import {
  PsychedelicPogoOrbAsset,
  type PsychedelicPogoOrbAnimation,
  type PsychedelicPogoOrbExpression,
} from '../../code-examples/PsychedelicPogoOrbAsset.example'
import { LongApproachArena } from './render/LongApproachArena'
import {
  CONTROL_BOUNDS,
  GLOW_SEEDS,
  GLOWBUD_CAVE_CENTER_X,
  GLOWBUD_CAVE_CENTER_Z,
  GLOWBUD_CAVE_YAW,
  LEVEL_COLLIDERS,
  LEVEL_SURFACES,
  LONG_APPROACH_MODEL,
  MUSEUM_HILL_CENTER_X,
  MUSEUM_HILL_TOP_Z,
  START_POSITION,
  getLakeBoundaryPush,
  getNaturalBoundaryPush,
  getSurfaceWorldHeight,
  getTerrainHeight,
  type LevelCollider,
  type LevelSurface,
} from './world/longApproachLevel'

type CameraMode = 'follow' | 'overhead'
type FrameRateCap = 30 | 60
export type ControlSpawnPreset = 'start' | 'hill' | 'museum' | 'cave'

type InputState = {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  moveX: number
  moveY: number
  run: boolean
  jump: boolean
  jumpQueued: boolean
  interact: boolean
  interactQueued: boolean
  reset: boolean
}

type Readout = {
  animation: PsychedelicPogoOrbAnimation
  grounded: boolean
  speed: number
  height: number
  surface: string
  seeds: number
  cameraMode: CameraMode
}

type AvatarRenderProps = {
  animation: PsychedelicPogoOrbAnimation
  expression: PsychedelicPogoOrbExpression
  phaseOverride?: number
  activity: number
}

type BallBounceStage = 'none' | 'slam' | 'rebound'
type MuseumEntryState = 'idle' | 'entering'

const PLAYER_RADIUS = 0.78
const WALK_SPEED = 34
const RUN_SPEED = 60
const RUN_ANIMATION_SPEED_THRESHOLD = 44
const WALK_CYCLE_DISTANCE = 15.6
const ACCELERATION = 26
const BRAKE = 13
const AIR_ACCELERATION = 6.6
const AIR_DRAG = 0.66
const GRAVITY = 24
const JUMP_SPEED = Math.sqrt(2 * GRAVITY * 8.8)
const RUN_JUMP_SPEED = Math.sqrt(2 * GRAVITY * 10.2)
const BALL_SLAM_SPEED = 22
const FORWARD_BALL_SLAM_SPEED = 32
const BALL_REBOUND_JUMP_SPEED = Math.sqrt(2 * GRAVITY * 18.5)
const FORWARD_BALL_REBOUND_JUMP_SPEED = Math.sqrt(2 * GRAVITY * 28)
const BALL_CONVERT_PHASE_START = 0.18
const BALL_SLAM_VISUAL_SECONDS = 0.38
const BALL_MIN_SLAM_SECONDS = 0.18
const BALL_CHAIN_REARM_PROGRESS = 0.36
const BALL_CHAIN_GROUND_GRACE = 0.34
const MUSEUM_ENTRY_TRIGGER_HALF_X = 106
const MUSEUM_ENTRY_TRIGGER_MIN_Z = MUSEUM_HILL_TOP_Z - 28
const MUSEUM_ENTRY_TRIGGER_MAX_Z = MUSEUM_HILL_TOP_Z + 86
const MUSEUM_ENTRY_SPAWN_X = 520
const MUSEUM_ENTRY_SPAWN_Z = -486
const MUSEUM_ENTRY_SPAWN_RADIUS = 104
const MUSEUM_ENTRY_CAMERA_SECONDS = 2.3
const MUSEUM_ENTRY_RETURN_DELAY_MS = 2650
const MUSEUM_ENTRY_DOOR_Z = MUSEUM_HILL_TOP_Z - 42
const MUSEUM_ENTRY_CAMERA_END_Z = MUSEUM_HILL_TOP_Z + 78
const JUMP_BUFFER_SECONDS = 0.14
const AUTO_STEP_HEIGHT = 0.72
const TERRAIN_SLOPE_STEP_HEIGHT = 3.6
const TERRAIN_DESCENT_SPEED = 82
const TERRAIN_RECOVERY_DEPTH = 0.42
const LANDING_GRACE = 0.2
const GROUND_EPSILON = 0.025
const CAMERA_DISTANCE = 22.5
const CAMERA_HEIGHT = 5.2
const CAMERA_TARGET_HEIGHT = 0.25
const CAMERA_LOOK_AHEAD = 0.55
const CAMERA_RUN_PULLBACK = 4.2
const CAMERA_RUN_LIFT = 0.9
const CAMERA_MOTION_LEAD = 2.2
const CAMERA_BASE_LOOK_UP = 0.05
const CAMERA_SPEED_LOOK_UP = 0.55
const CAMERA_AIR_LOOK_UP = 1.25
const CAMERA_UPHILL_SAMPLE_NEAR = 110
const CAMERA_UPHILL_SAMPLE_FAR = 240
const CAMERA_UPHILL_LOOK_STRENGTH = 0.85
const CAMERA_UPHILL_LOOK_MAX = 7
const CAMERA_GROUND_CLEARANCE = 6.1
const CAMERA_OCCLUSION_MARGIN = 10
const CAMERA_OCCLUSION_BACKOFF = 7
const CAMERA_OCCLUSION_HEIGHT_PADDING = 10
const CAMERA_OCCLUSION_MIN_DISTANCE = 15
const CAMERA_OCCLUSION_CLOSE_LIFT = 13
const CAMERA_OCCLUSION_SIDE_STEP = 7
const CAMERA_CAVE_SAFETY_LIFT = 72
const CAMERA_CAVE_YAW_RADIUS = 340
const DEFAULT_CAMERA_ZOOM = 3
const DEFAULT_CAMERA_YAW = 0
const DEFAULT_CAMERA_PITCH = -0.06
const MIN_CAMERA_ZOOM = 0.55
const MAX_CAMERA_ZOOM = 3.2
const MIN_CAMERA_PITCH = -0.5
const MAX_CAMERA_PITCH = 0.58
const CAMERA_DRAG_YAW_SPEED = 0.006
const CAMERA_DRAG_PITCH_SPEED = 0.0045
const CAMERA_WHEEL_ZOOM_SPEED = 0.0018
const OVERHEAD_CAMERA_HEIGHT = 1320
const OVERHEAD_CENTER = new THREE.Vector3(80, 0, -170)
const DEFAULT_FRAME_RATE_CAP: FrameRateCap = 60
const MOBILE_STICK_RADIUS = 58
const MOBILE_STICK_DEADZONE = 0.11

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function isOnMuseumEntrySteps(x: number, z: number) {
  const onSteps = (
    Math.abs(x - MUSEUM_HILL_CENTER_X) <= MUSEUM_ENTRY_TRIGGER_HALF_X &&
    z >= MUSEUM_ENTRY_TRIGGER_MIN_Z &&
    z <= MUSEUM_ENTRY_TRIGGER_MAX_Z
  )
  const nearMuseumSpawn = Math.hypot(x - MUSEUM_ENTRY_SPAWN_X, z - MUSEUM_ENTRY_SPAWN_Z) <= MUSEUM_ENTRY_SPAWN_RADIUS

  return onSteps || nearMuseumSpawn
}

function smootherstep01(value: number) {
  const t = clamp(value, 0, 1)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function dampFactor(strength: number, delta: number) {
  return 1 - Math.exp(-strength * delta)
}

function lerpAngle(current: number, target: number, amount: number) {
  const fullTurn = Math.PI * 2
  const difference = ((((target - current) % fullTurn) + fullTurn + Math.PI) % fullTurn) - Math.PI
  return current + difference * amount
}

function getLandmarkLookLift(x: number, z: number) {
  const caveDistance = Math.hypot(x - GLOWBUD_CAVE_CENTER_X, z - GLOWBUD_CAVE_CENTER_Z)
  const museumDistance = Math.hypot(x - MUSEUM_HILL_CENTER_X, z - MUSEUM_HILL_TOP_Z)
  const caveLift = smootherstep01(1 - caveDistance / 360) * 7
  const museumLift = smootherstep01(1 - museumDistance / 520) * 6

  return Math.max(caveLift, museumLift)
}

function getCaveCameraSafetyLift(x: number, z: number) {
  const caveDistance = Math.hypot(x - GLOWBUD_CAVE_CENTER_X, z - GLOWBUD_CAVE_CENTER_Z)

  return smootherstep01(1 - caveDistance / 260) * CAMERA_CAVE_SAFETY_LIFT
}

function getCameraMoveBasis(cameraYaw: number) {
  return {
    forwardX: -Math.sin(cameraYaw),
    forwardZ: -Math.cos(cameraYaw),
    rightX: Math.cos(cameraYaw),
    rightZ: -Math.sin(cameraYaw),
  }
}

function getPresetSpawnPosition(preset: ControlSpawnPreset) {
  switch (preset) {
    case 'hill':
      return new THREE.Vector3(390, 0, -392)
    case 'museum':
      return new THREE.Vector3(MUSEUM_ENTRY_SPAWN_X, 0, MUSEUM_ENTRY_SPAWN_Z)
    case 'cave':
      return new THREE.Vector3(-292, 0, 92)
    case 'start':
    default:
      return START_POSITION.clone()
  }
}

function getControlSpawnPosition(defaultSpawn: ControlSpawnPreset = 'start') {
  if (typeof window === 'undefined') return getPresetSpawnPosition(defaultSpawn)

  const params = new URLSearchParams(window.location.search)
  const x = Number(params.get('x'))
  const z = Number(params.get('z'))
  if (params.has('x') && params.has('z') && Number.isFinite(x) && Number.isFinite(z)) return new THREE.Vector3(x, 0, z)

  switch (params.get('spawn')) {
    case 'hill':
      return getPresetSpawnPosition('hill')
    case 'museum':
      return getPresetSpawnPosition('museum')
    case 'cave':
      return getPresetSpawnPosition('cave')
    default:
      return getPresetSpawnPosition(defaultSpawn)
  }
}

function getInitialCameraMode() {
  if (typeof window === 'undefined') return 'follow'
  return new URLSearchParams(window.location.search).get('camera') === 'overhead' ? 'overhead' : 'follow'
}

function getInitialCameraZoom() {
  if (typeof window === 'undefined') return DEFAULT_CAMERA_ZOOM

  const params = new URLSearchParams(window.location.search)
  if (!params.has('zoom')) return DEFAULT_CAMERA_ZOOM

  const zoom = Number(params.get('zoom'))
  return Number.isFinite(zoom) ? clamp(zoom, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM) : DEFAULT_CAMERA_ZOOM
}

function getInitialFrameRateCap(): FrameRateCap {
  if (typeof window === 'undefined') return DEFAULT_FRAME_RATE_CAP

  const params = new URLSearchParams(window.location.search)
  const fps = Number(params.get('fps') ?? params.get('frameRate'))
  return fps === 30 ? 30 : 60
}

function exposeWindowDebugState(key: '__pogoV2ControlState' | '__pogoV2PerfState', value: unknown) {
  if (typeof window === 'undefined') return
  if (!Object.isExtensible(window) && !Object.prototype.hasOwnProperty.call(window, key)) return

  try {
    Object.assign(window, { [key]: value })
  } catch {
    // Some embedded browser surfaces freeze window; gameplay should not depend on debug state.
  }
}

function isCameraControlTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('.camera-pad, .room-links, .mobile-controls, button, a'))
}

function getAvatarActivity(animation: PsychedelicPogoOrbAnimation, speed: number) {
  if (animation === 'walk-2') {
    return clamp((speed / WALK_SPEED) * 1.24, 0.96, 1.62)
  }

  if (animation === 'run') {
    return clamp((speed / RUN_SPEED) * 1.18, 1.02, 1.34)
  }

  if (animation === 'forward-hop') {
    return clamp((speed / RUN_SPEED) * 1.12, 0.96, 1.36)
  }

  if (animation === 'ball-bounce') {
    return 1.22
  }

  if (animation === 'reference-ball-bounce') {
    return 1.24
  }

  if (animation === 'forward-ball-bounce') {
    return clamp(1.26 + (speed / RUN_SPEED) * 0.28, 1.3, 1.58)
  }

  return clamp((speed / RUN_SPEED) * 1.1, 0.74, 1.24)
}

const INITIAL_AVATAR_PROPS: AvatarRenderProps = { animation: 'idle', expression: 'auto', activity: 0.9 }

function shouldUpdateAvatarProps(current: AvatarRenderProps, next: AvatarRenderProps) {
  if (current.animation !== next.animation || current.expression !== next.expression) return true
  if (Math.abs(current.activity - next.activity) > 0.02) return true
  if (current.phaseOverride === undefined || next.phaseOverride === undefined) return current.phaseOverride !== next.phaseOverride
  return Math.abs(current.phaseOverride - next.phaseOverride) > 0.0025
}

const ignoreReadout = () => undefined

function emptyInput(): InputState {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    moveX: 0,
    moveY: 0,
    run: false,
    jump: false,
    jumpQueued: false,
    interact: false,
    interactQueued: false,
    reset: false,
  }
}

function getLocalPoint(x: number, z: number, rect: { x: number; z: number; yaw?: number }) {
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

function getWorldNormal(x: number, z: number, yaw = 0) {
  if (Math.abs(yaw) < 0.0001) return { x, z }

  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  return {
    x: cos * x + sin * z,
    z: -sin * x + cos * z,
  }
}

function pointInBox(x: number, z: number, rect: { x: number; z: number; halfX: number; halfZ: number; yaw?: number }, margin = 0) {
  const local = getLocalPoint(x, z, rect)
  return Math.abs(local.x) <= rect.halfX + margin && Math.abs(local.z) <= rect.halfZ + margin
}

function intersectSegmentSlab(start: number, delta: number, min: number, max: number, range: { min: number; max: number }) {
  if (Math.abs(delta) < 0.000001) return start >= min && start <= max

  const tA = (min - start) / delta
  const tB = (max - start) / delta
  range.min = Math.max(range.min, Math.min(tA, tB))
  range.max = Math.min(range.max, Math.max(tA, tB))
  return range.min <= range.max
}

function getSegmentBoxHitT(start: THREE.Vector3, end: THREE.Vector3, collider: Extract<LevelCollider, { kind: 'box' }>, margin: number) {
  const localStart = getLocalPoint(start.x, start.z, collider)
  const localEnd = getLocalPoint(end.x, end.z, collider)
  const deltaX = localEnd.x - localStart.x
  const deltaZ = localEnd.z - localStart.z
  const range = { min: 0, max: 1 }

  if (!intersectSegmentSlab(localStart.x, deltaX, -collider.halfX - margin, collider.halfX + margin, range)) return undefined
  if (!intersectSegmentSlab(localStart.z, deltaZ, -collider.halfZ - margin, collider.halfZ + margin, range)) return undefined
  return clamp(range.min, 0, 1)
}

function getSegmentCircleHitT(start: THREE.Vector3, end: THREE.Vector3, collider: Extract<LevelCollider, { kind: 'circle' }>, margin: number) {
  const radius = collider.radius + margin
  const startX = start.x - collider.x
  const startZ = start.z - collider.z
  const deltaX = end.x - start.x
  const deltaZ = end.z - start.z
  const a = deltaX * deltaX + deltaZ * deltaZ
  if (a < 0.000001) return undefined

  const b = 2 * (startX * deltaX + startZ * deltaZ)
  const c = startX * startX + startZ * startZ - radius * radius
  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) return undefined

  const sqrtDiscriminant = Math.sqrt(discriminant)
  const tA = (-b - sqrtDiscriminant) / (2 * a)
  const tB = (-b + sqrtDiscriminant) / (2 * a)
  if (tA >= 0 && tA <= 1) return tA
  if (tB >= 0 && tB <= 1) return tB
  return undefined
}

function isCameraOccluder(collider: LevelCollider) {
  return collider.id !== 'train-track-boundary' && !collider.id.startsWith('garden-gate')
}

function getCameraOccluderTop(collider: LevelCollider) {
  const cameraHeight =
    collider.id.startsWith('museum') || collider.id.startsWith('glowbud-cave')
      ? Math.max(collider.clearHeight, 220)
      : collider.clearHeight
  return getTerrainHeight(collider.x, collider.z) + cameraHeight
}

function resolveCameraObstruction(desiredCameraPosition: THREE.Vector3, visibilityTarget: THREE.Vector3) {
  const targetToCameraDistance = visibilityTarget.distanceTo(desiredCameraPosition)
  if (targetToCameraDistance <= CAMERA_OCCLUSION_MIN_DISTANCE) {
    return { position: desiredCameraPosition, occluded: false }
  }

  let nearestHit = 1
  for (const collider of LEVEL_COLLIDERS) {
    if (!isCameraOccluder(collider)) continue

    const hitT =
      collider.kind === 'box'
        ? getSegmentBoxHitT(visibilityTarget, desiredCameraPosition, collider, CAMERA_OCCLUSION_MARGIN)
        : getSegmentCircleHitT(visibilityTarget, desiredCameraPosition, collider, CAMERA_OCCLUSION_MARGIN)
    if (hitT === undefined || hitT <= 0.035 || hitT >= nearestHit) continue

    const hitY = THREE.MathUtils.lerp(visibilityTarget.y, desiredCameraPosition.y, hitT)
    if (hitY > getCameraOccluderTop(collider) + CAMERA_OCCLUSION_HEIGHT_PADDING) continue
    nearestHit = hitT
  }

  if (nearestHit >= 1) return { position: desiredCameraPosition, occluded: false }

  const safeDistanceT = CAMERA_OCCLUSION_MIN_DISTANCE / targetToCameraDistance
  const safeT = clamp(nearestHit - CAMERA_OCCLUSION_BACKOFF / targetToCameraDistance, safeDistanceT, 1)
  return {
    position: visibilityTarget.clone().lerp(desiredCameraPosition, safeT),
    occluded: true,
  }
}

function pointInSurface(position: THREE.Vector3, surface: LevelSurface, margin = 0) {
  if (surface.shape === 'circle') {
    return Math.hypot(position.x - surface.x, position.z - surface.z) <= (surface.radius ?? surface.halfX) + margin
  }

  return pointInBox(position.x, position.z, surface, margin)
}

function getGroundContact(position: THREE.Vector3, maxHeight = Infinity, margin = PLAYER_RADIUS * 0.32) {
  const terrainHeight = getTerrainHeight(position.x, position.z)
  let contactHeight = terrainHeight
  let surfaceLabel = getTerrainContactLabel(terrainHeight)
  let surfaceId = terrainHeight > 0.18 ? 'museum-hill' : 'grass'

  for (const surface of LEVEL_SURFACES) {
    const surfaceHeight = getSurfaceWorldHeight(surface)
    if (surfaceHeight > maxHeight + GROUND_EPSILON) continue
    if (pointInSurface(position, surface, margin) && surfaceHeight >= contactHeight) {
      contactHeight = surfaceHeight
      surfaceLabel = surface.label
      surfaceId = surface.id
    }
  }

  return { height: contactHeight, label: surfaceLabel, id: surfaceId }
}

function isTerrainContact(contactId: string) {
  return contactId === 'grass' || contactId === 'museum-hill'
}

function getTerrainContactLabel(terrainHeight: number) {
  return terrainHeight > 0.18 ? 'raised terrain' : 'grass'
}

function crossedHeight(previousHeight: number, currentHeight: number, candidateHeight: number) {
  return previousHeight >= candidateHeight - LANDING_GRACE && currentHeight <= candidateHeight + LANDING_GRACE
}

function getLandingContact(position: THREE.Vector3, previousHeight: number, currentHeight: number) {
  const terrainHeight = getTerrainHeight(position.x, position.z)
  let contact = {
    height: terrainHeight,
    label: getTerrainContactLabel(terrainHeight),
    id: terrainHeight > 0.18 ? 'museum-hill' : 'grass',
  }

  for (const surface of LEVEL_SURFACES) {
    const surfaceHeight = getSurfaceWorldHeight(surface)
    if (crossedHeight(previousHeight, currentHeight, surfaceHeight) && pointInSurface(position, surface, PLAYER_RADIUS * 0.62) && surfaceHeight >= contact.height) {
      contact = { height: surfaceHeight, label: surface.label, id: surface.id }
    }
  }

  if (crossedHeight(previousHeight, currentHeight, terrainHeight) || currentHeight <= terrainHeight + LANDING_GRACE) return contact
  return contact.height > terrainHeight ? contact : undefined
}

function applyPush(position: THREE.Vector3, velocity: THREE.Vector3, normalX: number, normalZ: number, penetration: number, bounce: number) {
  position.x += normalX * penetration
  position.z += normalZ * penetration
  const inwardSpeed = velocity.x * normalX + velocity.z * normalZ
  if (inwardSpeed < 0) {
    velocity.x -= normalX * inwardSpeed * (1 + bounce)
    velocity.z -= normalZ * inwardSpeed * (1 + bounce)
  }
}

function resolveBoxCollision(position: THREE.Vector3, velocity: THREE.Vector3, collider: Extract<LevelCollider, { kind: 'box' }>) {
  const local = getLocalPoint(position.x, position.z, collider)
  const closestX = clamp(local.x, -collider.halfX, collider.halfX)
  const closestZ = clamp(local.z, -collider.halfZ, collider.halfZ)
  const dx = local.x - closestX
  const dz = local.z - closestZ
  const distanceSq = dx * dx + dz * dz

  if (distanceSq >= PLAYER_RADIUS * PLAYER_RADIUS) return

  if (distanceSq > 0.000001) {
    const distance = Math.sqrt(distanceSq)
    const normal = getWorldNormal(dx / distance, dz / distance, collider.yaw)
    applyPush(position, velocity, normal.x, normal.z, PLAYER_RADIUS - distance, collider.bounce)
    return
  }

  const left = Math.abs(local.x + collider.halfX)
  const right = Math.abs(collider.halfX - local.x)
  const front = Math.abs(local.z + collider.halfZ)
  const back = Math.abs(collider.halfZ - local.z)
  const minSide = Math.min(left, right, front, back)
  const localNormal = minSide === left ? [-1, 0] : minSide === right ? [1, 0] : minSide === front ? [0, -1] : [0, 1]
  const normal = getWorldNormal(localNormal[0], localNormal[1], collider.yaw)
  applyPush(position, velocity, normal.x, normal.z, PLAYER_RADIUS + minSide, collider.bounce)
}

function resolveCircleCollision(position: THREE.Vector3, velocity: THREE.Vector3, collider: Extract<LevelCollider, { kind: 'circle' }>) {
  const dx = position.x - collider.x
  const dz = position.z - collider.z
  const radius = PLAYER_RADIUS + collider.radius
  const distanceSq = dx * dx + dz * dz
  if (distanceSq >= radius * radius) return

  if (distanceSq <= 0.000001) {
    applyPush(position, velocity, 0, 1, radius, collider.bounce)
    return
  }

  const distance = Math.sqrt(distanceSq)
  applyPush(position, velocity, dx / distance, dz / distance, radius - distance, collider.bounce)
}

function resolveLakeCollision(position: THREE.Vector3, velocity: THREE.Vector3) {
  const push = getLakeBoundaryPush(position.x, position.z, PLAYER_RADIUS)
  if (!push) return false

  applyPush(position, velocity, push.normalX, push.normalZ, push.penetration, 0)
  return true
}

function resolveNaturalBoundaryCollision(position: THREE.Vector3, velocity: THREE.Vector3) {
  const push = getNaturalBoundaryPush(position.x, position.z, PLAYER_RADIUS)
  if (!push) return false

  applyPush(position, velocity, push.normalX, push.normalZ, push.penetration, 0.02)
  return true
}

function resolveCollisions(position: THREE.Vector3, velocity: THREE.Vector3, height: number) {
  for (const collider of LEVEL_COLLIDERS) {
    const colliderClearHeight = getTerrainHeight(collider.x, collider.z) + collider.clearHeight
    if (height >= colliderClearHeight) continue
    if (collider.kind === 'box') {
      resolveBoxCollision(position, velocity, collider)
    } else {
      resolveCircleCollision(position, velocity, collider)
    }
  }
}

function useKeyboardInput(inputRef: MutableRefObject<InputState>) {
  useEffect(() => {
    const setKey = (code: string, key: string, isDown: boolean, queuePress = isDown) => {
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
          if (queuePress) input.jumpQueued = true
          return true
        case 'KeyE':
          input.interact = isDown
          if (queuePress) input.interactQueued = true
          return true
        case 'KeyR':
          input.reset = isDown
          return true
        default:
          if (key === 'Shift') {
            input.run = isDown
            return true
          }
          if (key === ' ' || key === 'Spacebar') {
            input.jump = isDown
            if (queuePress) input.jumpQueued = true
            return true
          }
          if (key.toLowerCase() === 'e') {
            input.interact = isDown
            if (queuePress) input.interactQueued = true
            return true
          }
          return false
      }
    }

    const down = (event: KeyboardEvent) => {
      if (setKey(event.code, event.key, true, !event.repeat)) event.preventDefault()
    }
    const up = (event: KeyboardEvent) => {
      if (setKey(event.code, event.key, false)) event.preventDefault()
    }
    const clear = () => {
      inputRef.current = emptyInput()
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [inputRef])
}

function estimateJumpPhase(jumpElapsed: number, jumpDuration: number, grounded: boolean, landingTimer: number) {
  if (landingTimer > 0) {
    const t = 1 - landingTimer / 0.18
    return THREE.MathUtils.lerp(1.0, 1.105, clamp(t, 0, 1))
  }
  if (grounded) return undefined
  const t = clamp(jumpElapsed / Math.max(0.001, jumpDuration), 0, 1)
  return THREE.MathUtils.lerp(0.13, 0.95, t)
}

function estimateBallBouncePhase(
  jumpElapsed: number,
  jumpDuration: number,
  grounded: boolean,
  landingTimer: number,
  stage: BallBounceStage,
) {
  if (landingTimer > 0) {
    const t = 1 - landingTimer / 0.18
    return THREE.MathUtils.lerp(0.9, 0.985, clamp(t, 0, 1))
  }
  if (grounded) return undefined
  if (stage === 'slam') {
    const slamT = clamp(jumpElapsed / BALL_SLAM_VISUAL_SECONDS, 0, 1)
    if (slamT < 0.22) {
      return THREE.MathUtils.lerp(BALL_CONVERT_PHASE_START, 0.385, smootherstep01(slamT / 0.22))
    }
    if (slamT < 0.54) {
      return THREE.MathUtils.lerp(0.385, 0.552, Math.pow((slamT - 0.22) / 0.32, 0.82))
    }
    return THREE.MathUtils.lerp(0.552, 0.562, smootherstep01((slamT - 0.54) / 0.46))
  }
  const splatT = clamp(jumpElapsed / 0.15, 0, 1)
  if (splatT < 1) return THREE.MathUtils.lerp(0.562, 0.632, smootherstep01(splatT))

  const springT = clamp((jumpElapsed - 0.15) / 0.28, 0, 1)
  if (springT < 1) return THREE.MathUtils.lerp(0.632, 0.716, 1 - Math.pow(1 - springT, 2.0))

  const t = clamp((jumpElapsed - 0.43) / Math.max(0.001, jumpDuration - 0.43), 0, 1)
  return THREE.MathUtils.lerp(0.716, 0.94, smootherstep01(t))
}

function getBallSlamSpeed(forward: boolean, dropHeight: number) {
  const baseSpeed = forward ? FORWARD_BALL_SLAM_SPEED : BALL_SLAM_SPEED
  return baseSpeed + clamp(dropHeight, 0, 16) * (forward ? 0.42 : 0.32)
}

function getBallReboundSpeed(forward: boolean, dropHeight: number) {
  const reboundHeight = forward
    ? clamp(10.5 + dropHeight * 1.08, 9.5, 30)
    : clamp(7.5 + dropHeight * 0.9, 6.2, 21)
  const computedSpeed = Math.sqrt(2 * GRAVITY * reboundHeight)
  return forward
    ? THREE.MathUtils.lerp(computedSpeed, FORWARD_BALL_REBOUND_JUMP_SPEED, 0.18)
    : THREE.MathUtils.lerp(computedSpeed, BALL_REBOUND_JUMP_SPEED, 0.14)
}

function getForwardImpulseDirection(moveDirection: THREE.Vector3, velocity: THREE.Vector3) {
  if (moveDirection.lengthSq() > 0.001) return moveDirection

  const horizontalSpeed = Math.hypot(velocity.x, velocity.z)
  if (horizontalSpeed > 0.001) {
    return new THREE.Vector3(velocity.x / horizontalSpeed, 0, velocity.z / horizontalSpeed)
  }

  return undefined
}

function PlayerController({
  defaultSpawn,
  cameraMode,
  cameraYaw,
  cameraPitch,
  cameraZoom,
  inputRef,
  museumEntryState,
  onMuseumEntryAvailabilityChange,
  onRequestMuseumEntry,
  onReadout,
  collectedSeeds,
  onCollectSeed,
}: {
  defaultSpawn: ControlSpawnPreset
  cameraMode: CameraMode
  cameraYaw: number
  cameraPitch: number
  cameraZoom: number
  inputRef: MutableRefObject<InputState>
  museumEntryState: MuseumEntryState
  onMuseumEntryAvailabilityChange: (available: boolean) => void
  onRequestMuseumEntry: () => void
  onReadout: (readout: Readout) => void
  collectedSeeds: string[]
  onCollectSeed: (seedId: string) => void
}) {
  const playerRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const [spawn] = useState(() => {
    const position = getControlSpawnPosition(defaultSpawn)
    return {
      position,
      height: getTerrainHeight(position.x, position.z),
    }
  })
  const positionRef = useRef(spawn.position.clone())
  const previousPositionRef = useRef(spawn.position.clone())
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0))
  const moveDirectionRef = useRef(new THREE.Vector3(0, 0, 0))
  const heightRef = useRef(spawn.height)
  const yVelocityRef = useRef(0)
  const groundedRef = useRef(true)
  const jumpHeldRef = useRef(false)
  const jumpBufferRef = useRef(0)
  const jumpElapsedRef = useRef(0)
  const jumpDurationRef = useRef((JUMP_SPEED * 2) / GRAVITY)
  const airBallConvertAvailableRef = useRef(false)
  const ballBounceStageRef = useRef<BallBounceStage>('none')
  const ballSlamStartHeightRef = useRef(spawn.height)
  const ballChainGroundGraceRef = useRef(0)
  const landingTimerRef = useRef(0)
  const facingRef = useRef(0)
  const surfaceRef = useRef('grass')
  const animationRef = useRef<PsychedelicPogoOrbAnimation>('idle')
  const jumpAnimationRef = useRef<PsychedelicPogoOrbAnimation>('hop')
  const walkPhaseRef = useRef(0)
  const readoutTimerRef = useRef(0)
  const cameraRigYawRef = useRef(cameraYaw)
  const lastManualCameraYawRef = useRef(cameraYaw)
  const cameraFocusRef = useRef(new THREE.Vector3(spawn.position.x, spawn.height + CAMERA_TARGET_HEIGHT, spawn.position.z))
  const cameraLookLiftRef = useRef(CAMERA_BASE_LOOK_UP)
  const collectedSeedsRef = useRef(collectedSeeds)
  const onCollectSeedRef = useRef(onCollectSeed)
  const onMuseumEntryAvailabilityChangeRef = useRef(onMuseumEntryAvailabilityChange)
  const onRequestMuseumEntryRef = useRef(onRequestMuseumEntry)
  const museumEntryTimerRef = useRef(0)
  const lastMuseumEntryAvailableRef = useRef(false)
  const avatarPropsRef = useRef<AvatarRenderProps>(INITIAL_AVATAR_PROPS)
  const [avatarProps, setAvatarProps] = useState<AvatarRenderProps>(INITIAL_AVATAR_PROPS)

  useEffect(() => {
    collectedSeedsRef.current = collectedSeeds
  }, [collectedSeeds])

  useEffect(() => {
    onCollectSeedRef.current = onCollectSeed
  }, [onCollectSeed])

  useEffect(() => {
    onMuseumEntryAvailabilityChangeRef.current = onMuseumEntryAvailabilityChange
  }, [onMuseumEntryAvailabilityChange])

  useEffect(() => {
    onRequestMuseumEntryRef.current = onRequestMuseumEntry
  }, [onRequestMuseumEntry])

  useEffect(() => {
    if (museumEntryState !== 'entering') return
    museumEntryTimerRef.current = 0
    lastMuseumEntryAvailableRef.current = false
    onMuseumEntryAvailabilityChangeRef.current(false)
    inputRef.current = emptyInput()
  }, [inputRef, museumEntryState])

  useEffect(() => {
    return () => {
      onMuseumEntryAvailabilityChangeRef.current(false)
    }
  }, [])

  useFrame((state, frameDelta) => {
    const delta = Math.min(frameDelta, 1 / 30)
    const input = inputRef.current
    const position = positionRef.current
    const velocity = velocityRef.current
    const moveDirection = moveDirectionRef.current

    if (input.reset) {
      position.copy(spawn.position)
      previousPositionRef.current.copy(spawn.position)
      velocity.set(0, 0, 0)
      heightRef.current = spawn.height
      yVelocityRef.current = 0
      groundedRef.current = true
      jumpBufferRef.current = 0
      jumpElapsedRef.current = 0
      airBallConvertAvailableRef.current = false
      ballBounceStageRef.current = 'none'
      ballSlamStartHeightRef.current = spawn.height
      ballChainGroundGraceRef.current = 0
      landingTimerRef.current = 0
      jumpAnimationRef.current = 'hop'
      walkPhaseRef.current = 0
      cameraFocusRef.current.set(spawn.position.x, spawn.height + CAMERA_TARGET_HEIGHT, spawn.position.z)
      cameraLookLiftRef.current = CAMERA_BASE_LOOK_UP
      input.jumpQueued = false
      input.reset = false
    }

    const museumEntryActive = museumEntryState === 'entering'
    if (museumEntryActive) {
      input.forward = false
      input.backward = false
      input.left = false
      input.right = false
      input.moveX = 0
      input.moveY = 0
      input.run = false
      input.jump = false
      input.jumpQueued = false
      input.interact = false
      input.interactQueued = false
      velocity.set(0, 0, 0)
      yVelocityRef.current = 0
      groundedRef.current = true
      ballBounceStageRef.current = 'none'
      landingTimerRef.current = 0
    }

    previousPositionRef.current.copy(position)

    const rightInput = clamp(Number(input.right) - Number(input.left) + input.moveX, -1, 1)
    const forwardInput = clamp(Number(input.forward) - Number(input.backward) + input.moveY, -1, 1)
    const inputMagnitude = clamp(Math.hypot(rightInput, forwardInput), 0, 1)
    const manualCameraDelta = ((((cameraYaw - lastManualCameraYawRef.current) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    if (Math.abs(manualCameraDelta) > 0.00001) {
      cameraRigYawRef.current += manualCameraDelta
      lastManualCameraYawRef.current = cameraYaw
    }

    const cameraBasis = getCameraMoveBasis(cameraRigYawRef.current)

    moveDirection.set(
      cameraBasis.rightX * rightInput + cameraBasis.forwardX * forwardInput,
      0,
      cameraBasis.rightZ * rightInput + cameraBasis.forwardZ * forwardInput,
    )

    const moving = moveDirection.lengthSq() > 0.001
    if (moving) moveDirection.normalize()

    const runIntent = (input.run || inputMagnitude > 0.82) && moving
    const analogSpeedScale = inputMagnitude >= 0.995 ? 1 : THREE.MathUtils.lerp(0.38, 1, smootherstep01(inputMagnitude))
    const targetSpeed = (runIntent ? RUN_SPEED : WALK_SPEED) * analogSpeedScale
    const targetVelocityX = moving ? moveDirection.x * targetSpeed : 0
    const targetVelocityZ = moving ? moveDirection.z * targetSpeed : 0
    const grounded = groundedRef.current
    const horizontalDamp = dampFactor(grounded ? (moving ? ACCELERATION : BRAKE) : AIR_ACCELERATION, delta)
    velocity.x = THREE.MathUtils.lerp(velocity.x, targetVelocityX, horizontalDamp)
    velocity.z = THREE.MathUtils.lerp(velocity.z, targetVelocityZ, horizontalDamp)
    if (!grounded) {
      const drag = Math.exp(-AIR_DRAG * delta)
      velocity.x *= drag
      velocity.z *= drag
    }

    position.x = clamp(position.x + velocity.x * delta, CONTROL_BOUNDS.minX, CONTROL_BOUNDS.maxX)
    position.z = clamp(position.z + velocity.z * delta, CONTROL_BOUNDS.minZ, CONTROL_BOUNDS.maxZ)
    let blockedByWater = resolveLakeCollision(position, velocity)
    let blockedByBoundary = resolveNaturalBoundaryCollision(position, velocity)

    const jumpPressed = input.jumpQueued || (input.jump && !jumpHeldRef.current)
    if (jumpPressed) {
      jumpBufferRef.current = JUMP_BUFFER_SECONDS
      input.jumpQueued = false
    } else {
      jumpBufferRef.current = Math.max(0, jumpBufferRef.current - delta)
    }

    const currentGround = getGroundContact(position, heightRef.current + AUTO_STEP_HEIGHT)
    const preJumpSpeed = Math.hypot(velocity.x, velocity.z)
    const runJumpIntent = input.run && (moving || preJumpSpeed > WALK_SPEED * 0.45)
    const forwardJumpIntent = moving || preJumpSpeed > WALK_SPEED * 0.35

    const startBallSlam = (forwardBallJumpIntent: boolean, availableDropHeight: number) => {
      const launchedJumpAnimation: PsychedelicPogoOrbAnimation = forwardBallJumpIntent ? 'forward-ball-bounce' : 'reference-ball-bounce'
      const impulseDirection = forwardBallJumpIntent ? getForwardImpulseDirection(moveDirection, velocity) : undefined
      const slamGround = getGroundContact(position, heightRef.current + AUTO_STEP_HEIGHT).height
      const minimumVisualDrop = forwardBallJumpIntent ? 1.18 : 0.92
      const visualDropHeight = Math.max(availableDropHeight, minimumVisualDrop)
      if (heightRef.current < slamGround + minimumVisualDrop) {
        heightRef.current = slamGround + minimumVisualDrop
      }
      const slamSpeed = getBallSlamSpeed(forwardBallJumpIntent, visualDropHeight)

      jumpAnimationRef.current = launchedJumpAnimation
      jumpBufferRef.current = 0
      jumpElapsedRef.current = 0
      jumpDurationRef.current = BALL_SLAM_VISUAL_SECONDS
      landingTimerRef.current = 0
      airBallConvertAvailableRef.current = false
      ballChainGroundGraceRef.current = 0
      ballBounceStageRef.current = 'slam'
      ballSlamStartHeightRef.current = heightRef.current
      groundedRef.current = false
      yVelocityRef.current = Math.min(yVelocityRef.current, -slamSpeed)

      if (impulseDirection) {
        velocity.x += impulseDirection.x * 1.45
        velocity.z += impulseDirection.z * 1.45
      }
    }

    const reboundProgress =
      ballBounceStageRef.current === 'rebound' ? clamp(jumpElapsedRef.current / Math.max(0.001, jumpDurationRef.current), 0, 1) : 0
    const canChainAirBallBounce =
      !groundedRef.current &&
      (airBallConvertAvailableRef.current || (ballBounceStageRef.current === 'rebound' && reboundProgress > BALL_CHAIN_REARM_PROGRESS))
    const canChainGroundBallBounce = groundedRef.current && ballChainGroundGraceRef.current > 0

    if (jumpBufferRef.current > 0 && canChainGroundBallBounce) {
      const horizontalSpeed = Math.hypot(velocity.x, velocity.z)
      const forwardBallJumpIntent = moving || horizontalSpeed > WALK_SPEED * 0.28
      heightRef.current += 0.24
      startBallSlam(forwardBallJumpIntent, 0.85)
    } else if (jumpBufferRef.current > 0 && groundedRef.current) {
      const launchedJumpAnimation: PsychedelicPogoOrbAnimation = forwardJumpIntent ? 'forward-hop' : 'hop'
      const launchedJumpSpeed = runJumpIntent ? RUN_JUMP_SPEED : JUMP_SPEED
      yVelocityRef.current = launchedJumpSpeed
      heightRef.current += 0.002
      groundedRef.current = false
      jumpBufferRef.current = 0
      jumpElapsedRef.current = 0
      airBallConvertAvailableRef.current = true
      ballBounceStageRef.current = 'none'
      ballChainGroundGraceRef.current = 0
      jumpAnimationRef.current = launchedJumpAnimation
      jumpDurationRef.current = (launchedJumpSpeed * 2) / GRAVITY
      if (forwardJumpIntent) {
        const launchImpulse = runJumpIntent ? 5.2 : 2.4
        const launchDirection = moving ? moveDirection : getForwardImpulseDirection(moveDirection, velocity)
        if (launchDirection) {
          velocity.x += launchDirection.x * launchImpulse
          velocity.z += launchDirection.z * launchImpulse
        }
      }
    } else if (jumpBufferRef.current > 0 && canChainAirBallBounce) {
      const horizontalSpeed = Math.hypot(velocity.x, velocity.z)
      const forwardBallJumpIntent = moving || horizontalSpeed > WALK_SPEED * 0.35
      const dropHeight = Math.max(0, heightRef.current - getGroundContact(position, heightRef.current + AUTO_STEP_HEIGHT).height)
      startBallSlam(forwardBallJumpIntent, dropHeight)
    } else if (groundedRef.current) {
      const groundDelta = currentGround.height - heightRef.current
      if (Math.abs(groundDelta) <= AUTO_STEP_HEIGHT) {
        heightRef.current = currentGround.height
        yVelocityRef.current = 0
        surfaceRef.current = currentGround.label
      } else if (isTerrainContact(currentGround.id) && groundDelta > 0 && groundDelta <= TERRAIN_SLOPE_STEP_HEIGHT) {
        heightRef.current = currentGround.height
        yVelocityRef.current = 0
        surfaceRef.current = currentGround.label
      } else if (isTerrainContact(currentGround.id) && groundDelta < 0) {
        heightRef.current = Math.max(currentGround.height, heightRef.current - TERRAIN_DESCENT_SPEED * delta)
        yVelocityRef.current = 0
        surfaceRef.current = currentGround.label
      } else if (currentGround.height < heightRef.current - GROUND_EPSILON) {
        groundedRef.current = false
        yVelocityRef.current = Math.min(yVelocityRef.current, 0)
        jumpElapsedRef.current = 0
        jumpDurationRef.current = 0.5
        airBallConvertAvailableRef.current = false
        ballBounceStageRef.current = 'none'
        ballChainGroundGraceRef.current = 0
      }
    }

    const previousHeight = heightRef.current
    if (!groundedRef.current) {
      jumpElapsedRef.current += delta
      yVelocityRef.current -= GRAVITY * delta
      heightRef.current += yVelocityRef.current * delta

      const landing = yVelocityRef.current <= 0 ? getLandingContact(position, previousHeight, heightRef.current) : undefined
      if (landing && heightRef.current <= landing.height + LANDING_GRACE) {
        surfaceRef.current = landing.label
        airBallConvertAvailableRef.current = false
        if (ballBounceStageRef.current === 'slam') {
          if (jumpElapsedRef.current < BALL_MIN_SLAM_SECONDS) {
            heightRef.current = landing.height + 0.004
            yVelocityRef.current = 0
            jumpDurationRef.current = BALL_SLAM_VISUAL_SECONDS
          } else {
            const forwardBallRebound = jumpAnimationRef.current === 'forward-ball-bounce'
            const slamDropHeight = Math.max(0, ballSlamStartHeightRef.current - landing.height)
            const reboundSpeed = getBallReboundSpeed(forwardBallRebound, slamDropHeight)
            if (forwardBallRebound) {
              const reboundDirection = getForwardImpulseDirection(moveDirection, velocity)
              velocity.x *= 0.82
              velocity.z *= 0.82
              if (reboundDirection) {
                velocity.x += reboundDirection.x * 1.15
                velocity.z += reboundDirection.z * 1.15
              }
            }
            heightRef.current = landing.height + 0.003
            yVelocityRef.current = reboundSpeed
            groundedRef.current = false
            jumpElapsedRef.current = 0
            jumpDurationRef.current = (reboundSpeed * 2) / GRAVITY
            landingTimerRef.current = 0
            ballBounceStageRef.current = 'rebound'
          }
        } else {
          heightRef.current = landing.height
          yVelocityRef.current = 0
          groundedRef.current = true
          landingTimerRef.current = ballBounceStageRef.current === 'rebound' ? 0.14 : 0.18
          ballChainGroundGraceRef.current = ballBounceStageRef.current === 'rebound' ? BALL_CHAIN_GROUND_GRACE : 0
          ballBounceStageRef.current = 'none'
        }
      }
    } else {
      landingTimerRef.current = Math.max(0, landingTimerRef.current - delta)
      ballChainGroundGraceRef.current = Math.max(0, ballChainGroundGraceRef.current - delta)
    }

    resolveCollisions(position, velocity, heightRef.current)
    blockedByWater = resolveLakeCollision(position, velocity) || blockedByWater
    blockedByBoundary = resolveNaturalBoundaryCollision(position, velocity) || blockedByBoundary

    const terrainRecoveryHeight = getTerrainHeight(position.x, position.z)
    if (heightRef.current < terrainRecoveryHeight - TERRAIN_RECOVERY_DEPTH) {
      heightRef.current = terrainRecoveryHeight
      yVelocityRef.current = 0
      groundedRef.current = true
      jumpElapsedRef.current = 0
      jumpBufferRef.current = 0
      airBallConvertAvailableRef.current = false
      ballBounceStageRef.current = 'none'
      ballChainGroundGraceRef.current = 0
      landingTimerRef.current = 0.08
      surfaceRef.current = getTerrainContactLabel(terrainRecoveryHeight)
    }

    if (blockedByWater) {
      surfaceRef.current = 'water edge'
    } else if (blockedByBoundary) {
      surfaceRef.current = 'boundary hill'
    }

    const museumEntryAvailable = !museumEntryActive && isOnMuseumEntrySteps(position.x, position.z)
    if (museumEntryAvailable !== lastMuseumEntryAvailableRef.current) {
      lastMuseumEntryAvailableRef.current = museumEntryAvailable
      onMuseumEntryAvailabilityChangeRef.current(museumEntryAvailable)
    }
    if (input.interactQueued) {
      if (museumEntryAvailable) onRequestMuseumEntryRef.current()
      input.interactQueued = false
    }

    for (const seed of GLOW_SEEDS) {
      if (collectedSeedsRef.current.includes(seed.id)) continue
      const distance = Math.hypot(position.x - seed.x, position.z - seed.z)
      if (distance < 10 && Math.abs(heightRef.current - seed.height) < 5.5) {
        onCollectSeedRef.current(seed.id)
      }
    }

    const speed = Math.hypot(velocity.x, velocity.z)
    const directionForFacing =
      speed > 0.18 ? new THREE.Vector3(velocity.x / speed, 0, velocity.z / speed) : moving ? moveDirection : undefined
    if (directionForFacing) {
      const targetFacing = Math.atan2(-directionForFacing.x, -directionForFacing.z)
      facingRef.current = lerpAngle(facingRef.current, targetFacing, dampFactor(15, delta))
    }

    const activeJumpAnimation = jumpAnimationRef.current
    let animation: PsychedelicPogoOrbAnimation = 'idle'
    if (!groundedRef.current) animation = activeJumpAnimation
    else if (landingTimerRef.current > 0) animation = activeJumpAnimation
    else if (speed > RUN_ANIMATION_SPEED_THRESHOLD) animation = 'run'
    else if (speed > 0.7) animation = 'walk-2'
    animationRef.current = animation
    const allSeedsCollected = GLOW_SEEDS.length > 0 && collectedSeedsRef.current.length >= GLOW_SEEDS.length
    const expression: PsychedelicPogoOrbExpression =
      museumEntryActive
        ? 'delighted'
        : !groundedRef.current
          ? 'focused'
          : allSeedsCollected
            ? 'delighted'
            : speed > RUN_ANIMATION_SPEED_THRESHOLD
              ? 'effort'
              : 'auto'
    if (animation === 'walk-2' && groundedRef.current) {
      walkPhaseRef.current = (walkPhaseRef.current + (speed * delta) / WALK_CYCLE_DISTANCE) % 1
    }

    const usingBallBounce = animation === 'ball-bounce' || animation === 'forward-ball-bounce' || animation === 'reference-ball-bounce'
    const jumpPhaseOverride = usingBallBounce
      ? estimateBallBouncePhase(
          jumpElapsedRef.current,
          jumpDurationRef.current,
          groundedRef.current,
          landingTimerRef.current,
          ballBounceStageRef.current,
        )
      : estimateJumpPhase(jumpElapsedRef.current, jumpDurationRef.current, groundedRef.current, landingTimerRef.current)
    const phaseOverride = animation === 'walk-2' && jumpPhaseOverride === undefined ? walkPhaseRef.current : jumpPhaseOverride

    if (playerRef.current) {
      playerRef.current.position.set(position.x, heightRef.current, position.z)
      playerRef.current.rotation.y = facingRef.current
    }

    const nextAvatarProps: AvatarRenderProps = {
      animation,
      expression,
      phaseOverride,
      activity: getAvatarActivity(animation, speed),
    }
    if (shouldUpdateAvatarProps(avatarPropsRef.current, nextAvatarProps)) {
      avatarPropsRef.current = nextAvatarProps
      setAvatarProps(nextAvatarProps)
    }

    if (museumEntryActive) {
      museumEntryTimerRef.current += delta
      const entryT = smootherstep01(museumEntryTimerRef.current / MUSEUM_ENTRY_CAMERA_SECONDS)
      const targetGround = getTerrainHeight(MUSEUM_HILL_CENTER_X, MUSEUM_ENTRY_DOOR_Z)
      const cameraGround = getTerrainHeight(MUSEUM_HILL_CENTER_X, MUSEUM_ENTRY_CAMERA_END_Z)
      const doorTarget = new THREE.Vector3(MUSEUM_HILL_CENTER_X, targetGround + 34 + entryT * 18, MUSEUM_ENTRY_DOOR_Z)
      const doorCameraPosition = new THREE.Vector3(
        MUSEUM_HILL_CENTER_X,
        cameraGround + THREE.MathUtils.lerp(30, 22, entryT),
        MUSEUM_ENTRY_CAMERA_END_Z,
      )
      camera.up.set(0, 1, 0)
      camera.position.lerp(doorCameraPosition, dampFactor(3.8 + entryT * 8, delta))
      camera.lookAt(doorTarget)
      if ('fov' in camera) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, 34, dampFactor(4.6, delta))
        camera.updateProjectionMatrix()
      }
    } else if (cameraMode === 'overhead') {
      const overheadTarget = new THREE.Vector3(OVERHEAD_CENTER.x, CAMERA_TARGET_HEIGHT, OVERHEAD_CENTER.z)
      const overheadPosition = new THREE.Vector3(OVERHEAD_CENTER.x, OVERHEAD_CAMERA_HEIGHT / cameraZoom, OVERHEAD_CENTER.z)
      camera.up.set(cameraBasis.forwardX, 0, cameraBasis.forwardZ).normalize()
      camera.position.lerp(overheadPosition, dampFactor(8, delta))
      camera.lookAt(overheadTarget)
    } else {
      camera.up.set(0, 1, 0)
      const cameraSpeedT = smootherstep01(speed / RUN_SPEED)
      if (speed > 1.2) {
        const travelYaw = Math.atan2(-velocity.x, -velocity.z)
        const cameraFollowStrength = THREE.MathUtils.lerp(1.6, 4.2, cameraSpeedT)
        cameraRigYawRef.current = lerpAngle(cameraRigYawRef.current, travelYaw, dampFactor(cameraFollowStrength, delta))
      }

      const caveCameraDistance = Math.hypot(position.x - GLOWBUD_CAVE_CENTER_X, position.z - GLOWBUD_CAVE_CENTER_Z)
      const caveYawBias = smootherstep01(1 - caveCameraDistance / CAMERA_CAVE_YAW_RADIUS)
      if (caveYawBias > 0.001) {
        const caveForwardX = (GLOWBUD_CAVE_CENTER_X - position.x) / Math.max(1, caveCameraDistance)
        const caveForwardZ = (GLOWBUD_CAVE_CENTER_Z - position.z) / Math.max(1, caveCameraDistance)
        const caveCameraYaw = Math.atan2(-caveForwardX, -caveForwardZ)
        cameraRigYawRef.current = lerpAngle(cameraRigYawRef.current, caveCameraYaw, dampFactor(3.8 * caveYawBias, delta))
      }

      const rigYaw = cameraRigYawRef.current
      const cameraForwardX = -Math.sin(rigYaw)
      const cameraForwardZ = -Math.cos(rigYaw)
      const motionLeadScale = speed > 0.4 ? (CAMERA_MOTION_LEAD * cameraSpeedT) / Math.max(speed, 0.001) : 0
      const dynamicTargetHeight = CAMERA_TARGET_HEIGHT + cameraSpeedT * 0.65 + (groundedRef.current ? 0 : 1.15)
      const dynamicLookAhead = CAMERA_LOOK_AHEAD + cameraSpeedT * 4.8
      const focusTarget = new THREE.Vector3(
        position.x + cameraForwardX * dynamicLookAhead + velocity.x * motionLeadScale,
        heightRef.current + dynamicTargetHeight,
        position.z + cameraForwardZ * dynamicLookAhead + velocity.z * motionLeadScale,
      )
      cameraFocusRef.current.lerp(focusTarget, dampFactor(8.8 + cameraSpeedT * 3.2, delta))

      const distance = (CAMERA_DISTANCE + CAMERA_RUN_PULLBACK * cameraSpeedT + (groundedRef.current ? 0 : 4.8)) / Math.sqrt(cameraZoom)
      const pitchScale = Math.cos(cameraPitch)
      const cameraLift = CAMERA_HEIGHT + CAMERA_RUN_LIFT * cameraSpeedT + (groundedRef.current ? 0 : 4.6)
      const currentTerrainHeight = getTerrainHeight(position.x, position.z)
      const nearTerrainHeight = getTerrainHeight(
        position.x + cameraForwardX * CAMERA_UPHILL_SAMPLE_NEAR,
        position.z + cameraForwardZ * CAMERA_UPHILL_SAMPLE_NEAR,
      )
      const farTerrainHeight = getTerrainHeight(
        position.x + cameraForwardX * CAMERA_UPHILL_SAMPLE_FAR,
        position.z + cameraForwardZ * CAMERA_UPHILL_SAMPLE_FAR,
      )
      const uphillLookLift = clamp(
        Math.max(nearTerrainHeight - currentTerrainHeight, farTerrainHeight - currentTerrainHeight) * CAMERA_UPHILL_LOOK_STRENGTH,
        0,
        CAMERA_UPHILL_LOOK_MAX,
      )
      const landmarkLookLift = getLandmarkLookLift(position.x, position.z)
      const closeCameraT = smootherstep01((cameraZoom - 1) / 1.2)
      const scenicLookLift = Math.max(uphillLookLift, landmarkLookLift) * THREE.MathUtils.lerp(1, 0.08, closeCameraT)
      const automaticLookLift =
        CAMERA_BASE_LOOK_UP +
        CAMERA_SPEED_LOOK_UP * cameraSpeedT +
        (groundedRef.current ? 0 : CAMERA_AIR_LOOK_UP) +
        scenicLookLift
      cameraLookLiftRef.current = THREE.MathUtils.lerp(cameraLookLiftRef.current, automaticLookLift, dampFactor(5.8, delta))
      const lookAheadTarget = new THREE.Vector3(
        cameraFocusRef.current.x,
        cameraFocusRef.current.y + cameraLookLiftRef.current,
        cameraFocusRef.current.z,
      )
      const cameraPosition = new THREE.Vector3(
        cameraFocusRef.current.x - cameraForwardX * distance * pitchScale,
        cameraFocusRef.current.y + cameraLift / Math.sqrt(cameraZoom) + Math.sin(cameraPitch) * 36,
        cameraFocusRef.current.z - cameraForwardZ * distance * pitchScale,
      )
      const caveSafetyLift = getCaveCameraSafetyLift(position.x, position.z) * THREE.MathUtils.lerp(1, 0.24, closeCameraT)
      if (caveYawBias > 0.001 && closeCameraT > 0.001) {
        const caveEscapeX = caveCameraDistance > 1 ? (position.x - GLOWBUD_CAVE_CENTER_X) / caveCameraDistance : Math.sin(GLOWBUD_CAVE_YAW)
        const caveEscapeZ = caveCameraDistance > 1 ? (position.z - GLOWBUD_CAVE_CENTER_Z) / caveCameraDistance : Math.cos(GLOWBUD_CAVE_YAW)
        const caveEscapeDistance = 180 * caveYawBias * closeCameraT
        cameraPosition.x += caveEscapeX * caveEscapeDistance
        cameraPosition.z += caveEscapeZ * caveEscapeDistance
        cameraPosition.y += 28 * caveYawBias * closeCameraT
      }
      const terrainCameraFloor =
        getTerrainHeight(cameraPosition.x, cameraPosition.z) + CAMERA_GROUND_CLEARANCE + caveSafetyLift * 0.35
      cameraPosition.y = Math.max(cameraPosition.y + caveSafetyLift, terrainCameraFloor)
      const visibilityTarget = new THREE.Vector3(position.x, heightRef.current + CAMERA_TARGET_HEIGHT, position.z)
      const cameraObstruction = resolveCameraObstruction(cameraPosition, visibilityTarget)
      const finalCameraPosition = cameraObstruction.position.clone()
      if (cameraObstruction.occluded) {
        const shoulderSide = speed > 0.8 ? Math.sign(velocity.x * cameraForwardZ - velocity.z * cameraForwardX) || 1 : 1
        finalCameraPosition.x += Math.cos(rigYaw) * CAMERA_OCCLUSION_SIDE_STEP * shoulderSide
        finalCameraPosition.z += -Math.sin(rigYaw) * CAMERA_OCCLUSION_SIDE_STEP * shoulderSide
        finalCameraPosition.y += CAMERA_OCCLUSION_CLOSE_LIFT + caveSafetyLift * 0.18
      }
      const finalTerrainCameraFloor =
        getTerrainHeight(finalCameraPosition.x, finalCameraPosition.z) + CAMERA_GROUND_CLEARANCE + caveSafetyLift * 0.35
      finalCameraPosition.y = Math.max(finalCameraPosition.y, finalTerrainCameraFloor)
      camera.position.lerp(finalCameraPosition, dampFactor((cameraObstruction.occluded ? 15 : 9.2) + cameraSpeedT * 3, delta))
      camera.lookAt(lookAheadTarget)
    }

    jumpHeldRef.current = input.jump
    readoutTimerRef.current += delta
    if (readoutTimerRef.current > 0.08) {
      readoutTimerRef.current = 0
      onReadout({
        animation,
        grounded: groundedRef.current,
        speed,
        height: heightRef.current,
        surface: surfaceRef.current,
        seeds: collectedSeedsRef.current.length,
        cameraMode,
      })
      exposeWindowDebugState('__pogoV2ControlState', {
        x: position.x,
        z: position.z,
        height: heightRef.current,
        grounded: groundedRef.current,
        animation,
        speed,
        surface: surfaceRef.current,
        seeds: collectedSeedsRef.current.length,
        model: LONG_APPROACH_MODEL,
        ballStage: ballBounceStageRef.current,
        museumEntryAvailable,
        museumEntryState,
      })
    }
  })

  return (
    <group ref={playerRef} position={[spawn.position.x, spawn.height, spawn.position.z]}>
      <PsychedelicPogoOrbAsset
        animation={avatarProps.animation}
        expression={avatarProps.expression}
        debugMaterial="super-psychedelic"
        glowIntensity={1.55}
        colorCycleSpeed={2.1}
        activity={avatarProps.activity}
        phaseOverride={avatarProps.phaseOverride}
        scale={1}
      />
    </group>
  )
}

function FrameRateController({ frameRateCap }: { frameRateCap: FrameRateCap }) {
  const rootState = useThree()

  useEffect(() => {
    if (frameRateCap === 60) {
      return () => undefined
    }

    let animationFrame = 0
    let lastFrameTime = performance.now() - 1000 / 30

    const tick = (now: number) => {
      animationFrame = requestAnimationFrame(tick)

      const frameInterval = 1000 / 30
      const elapsed = now - lastFrameTime
      if (elapsed < frameInterval - 0.75) return

      lastFrameTime = now - (elapsed % frameInterval)
      advance(now / 1000, true, rootState)
    }

    animationFrame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [frameRateCap, rootState])

  return null
}

declare global {
  interface Window {
    __pogoV2ControlState?: {
      x: number
      z: number
      height: number
      grounded: boolean
      animation: PsychedelicPogoOrbAnimation
      speed: number
      surface: string
      seeds: number
      model: string
      ballStage: BallBounceStage
      museumEntryAvailable: boolean
      museumEntryState: MuseumEntryState
    }
    __pogoV2PerfState?: {
      frameRateCap: FrameRateCap
    }
  }
}

function Scene({
  defaultSpawn,
  cameraMode,
  cameraYaw,
  cameraPitch,
  cameraZoom,
  frameRateCap,
  inputRef,
  museumEntryState,
  onMuseumEntryAvailabilityChange,
  onRequestMuseumEntry,
  onReadout,
  collectedSeeds,
  onCollectSeed,
}: {
  defaultSpawn: ControlSpawnPreset
  cameraMode: CameraMode
  cameraYaw: number
  cameraPitch: number
  cameraZoom: number
  frameRateCap: FrameRateCap
  inputRef: MutableRefObject<InputState>
  museumEntryState: MuseumEntryState
  onMuseumEntryAvailabilityChange: (available: boolean) => void
  onRequestMuseumEntry: () => void
  onReadout: (readout: Readout) => void
  collectedSeeds: string[]
  onCollectSeed: (seedId: string) => void
}) {
  return (
    <>
      <FrameRateController frameRateCap={frameRateCap} />
      <color attach="background" args={['#91d8ff']} />
      <LongApproachArena />
      <PlayerController
        defaultSpawn={defaultSpawn}
        cameraMode={cameraMode}
        cameraYaw={cameraYaw}
        cameraPitch={cameraPitch}
        cameraZoom={cameraZoom}
        inputRef={inputRef}
        museumEntryState={museumEntryState}
        onMuseumEntryAvailabilityChange={onMuseumEntryAvailabilityChange}
        onRequestMuseumEntry={onRequestMuseumEntry}
        onReadout={onReadout}
        collectedSeeds={collectedSeeds}
        onCollectSeed={onCollectSeed}
      />
    </>
  )
}

function MobileControls({ inputRef }: { inputRef: MutableRefObject<InputState> }) {
  const activeStickPointerRef = useRef<number | null>(null)
  const [stickState, setStickState] = useState({ active: false, x: 0, y: 0, power: 0 })

  const clearStick = () => {
    activeStickPointerRef.current = null
    inputRef.current.moveX = 0
    inputRef.current.moveY = 0
    setStickState({ active: false, x: 0, y: 0, power: 0 })
  }

  const updateStick = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const centerX = box.left + box.width / 2
    const centerY = box.top + box.height / 2
    const rawX = (event.clientX - centerX) / MOBILE_STICK_RADIUS
    const rawY = (event.clientY - centerY) / MOBILE_STICK_RADIUS
    const magnitude = Math.min(1, Math.hypot(rawX, rawY))

    if (magnitude < MOBILE_STICK_DEADZONE) {
      inputRef.current.moveX = 0
      inputRef.current.moveY = 0
      setStickState({ active: true, x: 0, y: 0, power: 0 })
      return
    }

    const normalizedX = rawX / Math.max(0.001, Math.hypot(rawX, rawY))
    const normalizedY = rawY / Math.max(0.001, Math.hypot(rawX, rawY))
    const scaledMagnitude = Math.pow((magnitude - MOBILE_STICK_DEADZONE) / (1 - MOBILE_STICK_DEADZONE), 1.08)
    const moveX = normalizedX * scaledMagnitude
    const moveY = -normalizedY * scaledMagnitude

    inputRef.current.moveX = moveX
    inputRef.current.moveY = moveY
    setStickState({
      active: true,
      x: normalizedX * MOBILE_STICK_RADIUS * magnitude,
      y: normalizedY * MOBILE_STICK_RADIUS * magnitude,
      power: scaledMagnitude,
    })
  }

  function handleStickDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    activeStickPointerRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    updateStick(event)
  }

  function handleStickMove(event: PointerEvent<HTMLDivElement>) {
    if (activeStickPointerRef.current !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    updateStick(event)
  }

  function handleStickUp(event: PointerEvent<HTMLDivElement>) {
    if (activeStickPointerRef.current !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    clearStick()
  }

  const setJumpButton = (isDown: boolean) => {
    inputRef.current.jump = isDown
    if (isDown) inputRef.current.jumpQueued = true
  }

  const setRunButton = (isDown: boolean) => {
    inputRef.current.run = isDown
  }

  const setResetButton = () => {
    inputRef.current.reset = true
  }

  const handleActionPointerDown = (event: PointerEvent<HTMLButtonElement>, action: 'jump' | 'run' | 'reset') => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    if (action === 'jump') setJumpButton(true)
    if (action === 'run') setRunButton(true)
    if (action === 'reset') setResetButton()
  }

  const handleActionPointerUp = (event: PointerEvent<HTMLButtonElement>, action: 'jump' | 'run' | 'reset') => {
    event.preventDefault()
    event.stopPropagation()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (action === 'jump') setJumpButton(false)
    if (action === 'run') setRunButton(false)
  }

  useEffect(() => {
    const input = inputRef.current
    return () => {
      input.moveX = 0
      input.moveY = 0
      input.run = false
      input.jump = false
    }
  }, [inputRef])

  return (
    <div className="mobile-controls" aria-label="Mobile movement controls">
      <div
        className={`mobile-stick ${stickState.active ? 'is-active' : ''}`}
        onPointerDown={handleStickDown}
        onPointerMove={handleStickMove}
        onPointerUp={handleStickUp}
        onPointerCancel={handleStickUp}
      >
        <div className="mobile-stick-ring" />
        <div
          className="mobile-stick-thumb"
          style={{
            transform: `translate3d(${stickState.x}px, ${stickState.y}px, 0) scale(${1 + stickState.power * 0.08})`,
          }}
        />
      </div>
      <div className="mobile-action-cluster">
        <button
          type="button"
          className="mobile-action-button mobile-action-run"
          onPointerDown={(event) => handleActionPointerDown(event, 'run')}
          onPointerUp={(event) => handleActionPointerUp(event, 'run')}
          onPointerCancel={(event) => handleActionPointerUp(event, 'run')}
        >
          Run
        </button>
        <button
          type="button"
          className="mobile-action-button mobile-action-jump"
          onPointerDown={(event) => handleActionPointerDown(event, 'jump')}
          onPointerUp={(event) => handleActionPointerUp(event, 'jump')}
          onPointerCancel={(event) => handleActionPointerUp(event, 'jump')}
        >
          Jump
        </button>
        <button
          type="button"
          className="mobile-action-button mobile-action-reset"
          onPointerDown={(event) => handleActionPointerDown(event, 'reset')}
          onPointerUp={(event) => handleActionPointerUp(event, 'reset')}
          onPointerCancel={(event) => handleActionPointerUp(event, 'reset')}
        >
          Reset
        </button>
      </div>
    </div>
  )
}

function CourtyardControlsIntro() {
  return (
    <aside className="courtyardControlsIntro" aria-label="Basic courtyard controls">
      <div className="courtyardControlsIntroGlow" aria-hidden="true" />
      <p className="courtyardControlsIntroLine">
        <span className="courtyardControlsIntroKeys" aria-hidden="true">
          <span>←</span>
          <span>↑</span>
          <span>↓</span>
          <span>→</span>
        </span>
        <span className="courtyardControlsIntroText">drift around the courtyard</span>
      </p>
      <p className="courtyardControlsIntroLine">
        <span className="courtyardControlsIntroKey">Space</span>
        <span className="courtyardControlsIntroText">jump, then tap again to curl and bounce</span>
      </p>
    </aside>
  )
}

export function App({
  defaultSpawn = 'start',
  polished = false,
}: {
  defaultSpawn?: ControlSpawnPreset
  polished?: boolean
}) {
  const [cameraMode, setCameraMode] = useState<CameraMode>(() => getInitialCameraMode())
  const [cameraYaw, setCameraYaw] = useState(DEFAULT_CAMERA_YAW)
  const [cameraPitch, setCameraPitch] = useState(DEFAULT_CAMERA_PITCH)
  const [cameraZoom, setCameraZoom] = useState(() => getInitialCameraZoom())
  const [frameRateCap, setFrameRateCap] = useState<FrameRateCap>(() => getInitialFrameRateCap())
  const [collectedSeeds, setCollectedSeeds] = useState<string[]>([])
  const [museumEntryAvailable, setMuseumEntryAvailable] = useState(false)
  const [museumEntryState, setMuseumEntryState] = useState<MuseumEntryState>('idle')
  const museumEntryStateRef = useRef<MuseumEntryState>('idle')
  const cameraDragRef = useRef({ active: false })
  const inputRef = useRef<InputState>(emptyInput())
  const [readout, setReadout] = useState<Readout>({
    animation: 'idle',
    grounded: true,
    speed: 0,
    height: 0,
    surface: 'grass',
    seeds: 0,
    cameraMode: 'follow',
  })

  useKeyboardInput(inputRef)

  useEffect(() => {
    museumEntryStateRef.current = museumEntryState
  }, [museumEntryState])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!polished) {
      const url = new URL(window.location.href)
      url.searchParams.set('fps', String(frameRateCap))
      window.history.replaceState(null, '', url)
    }
    document.documentElement.dataset.frameRateCap = String(frameRateCap)
    delete document.documentElement.dataset.measuredFrameRate
    exposeWindowDebugState('__pogoV2PerfState', {
      frameRateCap,
    })
  }, [frameRateCap, polished])

  useEffect(() => {
    if (museumEntryState !== 'entering') return
    const timeout = window.setTimeout(() => {
      window.location.assign('/')
    }, MUSEUM_ENTRY_RETURN_DELAY_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [museumEntryState])

  function collectSeed(seedId: string) {
    setCollectedSeeds((current) => (current.includes(seedId) ? current : [...current, seedId]))
  }

  function beginMuseumEntry() {
    if (museumEntryStateRef.current === 'entering') return
    museumEntryStateRef.current = 'entering'
    inputRef.current = emptyInput()
    setMuseumEntryAvailable(false)
    setMuseumEntryState('entering')
  }

  function rotateCamera(amount: number) {
    setCameraYaw((current) => current + amount)
  }

  function updateZoom(amount: number) {
    setCameraZoom((current) => clamp(current + amount, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM))
  }

  function resetCamera(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.blur()
    setCameraYaw(DEFAULT_CAMERA_YAW)
    setCameraPitch(DEFAULT_CAMERA_PITCH)
    setCameraZoom(DEFAULT_CAMERA_ZOOM)
    setCameraMode('follow')
  }

  function toggleFrameRate(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.blur()
    setFrameRateCap((current) => (current === 60 ? 30 : 60))
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || isCameraControlTarget(event.target)) return
    cameraDragRef.current.active = true
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!cameraDragRef.current.active) return
    setCameraYaw((current) => current - event.movementX * CAMERA_DRAG_YAW_SPEED)
    setCameraPitch((current) => clamp(current + event.movementY * CAMERA_DRAG_PITCH_SPEED, MIN_CAMERA_PITCH, MAX_CAMERA_PITCH))
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    cameraDragRef.current.active = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (isCameraControlTarget(event.target)) return
    setCameraZoom((current) => clamp(current - event.deltaY * CAMERA_WHEEL_ZOOM_SPEED, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM))
  }

  const cameraYawDegrees = Math.round(THREE.MathUtils.radToDeg(cameraYaw))
  const cameraPitchDegrees = Math.round(THREE.MathUtils.radToDeg(cameraPitch))
  const canvasDpr: [number, number] = polished ? [0.82, 1] : [1, 1.5]
  const canvasGl = {
    antialias: !polished,
    powerPreference: 'high-performance' as const,
  }

  return (
    <div
      className={`control-room${polished ? ' control-room-polished' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <Canvas
        camera={{ position: [0, 12, 18], fov: 52, near: 1, far: 3500 }}
        dpr={canvasDpr}
        gl={canvasGl}
        frameloop={frameRateCap === 30 ? 'never' : 'always'}
        shadows={false}
      >
        <Scene
          defaultSpawn={defaultSpawn}
          cameraMode={cameraMode}
          cameraYaw={cameraYaw}
          cameraPitch={cameraPitch}
          cameraZoom={cameraZoom}
          frameRateCap={frameRateCap}
          inputRef={inputRef}
          museumEntryState={museumEntryState}
          onMuseumEntryAvailabilityChange={setMuseumEntryAvailable}
          onRequestMuseumEntry={beginMuseumEntry}
          onReadout={polished ? ignoreReadout : setReadout}
          collectedSeeds={collectedSeeds}
          onCollectSeed={collectSeed}
        />
      </Canvas>
      {polished ? <CourtyardControlsIntro /> : null}
      <MobileControls inputRef={inputRef} />
      {museumEntryAvailable && museumEntryState === 'idle' ? (
        <button type="button" className="controlMuseumEntryButton" onClick={beginMuseumEntry} aria-label="Enter museum">
          <span className="controlMuseumEntryKey">E</span>
          <span>Enter Museum</span>
        </button>
      ) : null}
      {museumEntryState === 'entering' ? <div className="controlMuseumEntryWhiteout" aria-hidden="true" /> : null}
      {!polished ? (
        <>
          <div className="legend-panel">
            <strong>Option D V2: Long Approach</strong>
            <p>
              New arena shell using the existing orb asset. Follow the pale path to the museum, branch left to the future Glowbud cave platform, and use overhead view to audit placement.
            </p>
          </div>
          <div className="room-links">
            <a href="../pogo-orb/control.html">V1 Ref</a>
          </div>
          <div className="camera-pad" aria-label="Camera controls">
            <button type="button" onClick={() => rotateCamera(-Math.PI / 8)}>{'<'}</button>
            <button type="button" onClick={() => updateZoom(0.18)}>+</button>
            <button type="button" onClick={() => rotateCamera(Math.PI / 8)}>{'>'}</button>
            <button type="button" onClick={() => updateZoom(-0.18)}>-</button>
            <button type="button" onClick={resetCamera}>0</button>
            <button
              type="button"
              className={cameraMode === 'overhead' ? 'is-active' : ''}
              onClick={() => setCameraMode((current) => (current === 'follow' ? 'overhead' : 'follow'))}
            >
              Top
            </button>
          </div>
          <div className="frame-rate-panel" aria-label="Frame rate controls">
            <button type="button" className={frameRateCap === 60 ? 'is-active' : ''} onClick={toggleFrameRate}>
              {frameRateCap} FPS
            </button>
          </div>
          <div className="room-hud">
            <span>{readout.animation}</span>
            <span>{readout.grounded ? 'grounded' : 'airborne'}</span>
            <span>{readout.speed.toFixed(1)} m/s</span>
            <span>{readout.height.toFixed(1)} y</span>
            <span>{readout.surface}</span>
            <span>{GLOW_SEEDS.length > 0 ? `${readout.seeds}/${GLOW_SEEDS.length} seeds` : 'no seeds'}</span>
            <span>{cameraZoom.toFixed(1)} zoom</span>
            <span>{cameraYawDegrees} cam</span>
            <span>{cameraPitchDegrees} tilt</span>
            <span>{readout.cameraMode}</span>
            <span>{frameRateCap} fps cap</span>
            <span>{LONG_APPROACH_MODEL}</span>
          </div>
        </>
      ) : null}
    </div>
  )
}

const rootElement = typeof document === 'undefined' ? null : document.getElementById('root')
if (rootElement) createRoot(rootElement).render(<App />)

export default App
