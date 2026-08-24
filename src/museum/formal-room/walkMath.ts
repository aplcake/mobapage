import { MUSEUM_WALK_ZONES } from './museumPlan'
import {
  MUSEUM_GALLERY_BENCH_COLLIDERS,
  MUSEUM_GALLERY_END_WALL_COLLIDERS,
  MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER as HOLIDAY_GIFT_VITRINE_COLLIDER,
  MUSEUM_GALLERY_PORTAL_RETURN_COLLIDERS,
  MUSEUM_GALLERY_THRESHOLD_WALL_COLLIDERS,
  MUSEUM_LOOP_WALL_RETURN_COLLIDERS,
} from './museumGalleryDesign'
import {
  MUSEUM_GALLERY_PLANT_SPECS,
  museumGalleryPlantPlanterBounds,
} from './museumTreeDesign'
import { MOBA_TWO_HEART_SCULPTURE_SPEC } from './mobaTwoHeartSculpture'
import { MONKEYDHASHY_CREATEBOX_SPEC } from './monkeydhashyCreatebox'
import { PERSONAL_GALLERY_DOOR_SPEC } from './personalGalleryDoor'

export const MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER = HOLIDAY_GIFT_VITRINE_COLLIDER

export type FormalWalkPoint = {
  x: number
  z: number
}

export type FormalWalkBounds = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export type FormalWalkCollider = {
  id?: string
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export const FORMAL_WALK_PLAYER_RADIUS = 0.34
export const FORMAL_WALK_ACCELERATION = 32
export const FORMAL_WALK_BRAKING = 42

export const FORMAL_WALK_BOUNDS: FormalWalkBounds = {
  minX: -18.05,
  maxX: 18.05,
  minZ: -1.05,
  maxZ: 35.5,
}

export const FORMAL_WALK_START: FormalWalkPoint = {
  x: 0,
  z: 5,
}

export const MUSEUM_ATRIUM_COLLIDERS: readonly FormalWalkCollider[] = [
  { id: 'atrium-west-bench', minX: -4.075, maxX: -3.425, minZ: 18.1, maxZ: 21 },
  { id: 'atrium-east-bench', minX: 3.425, maxX: 4.075, minZ: 18.1, maxZ: 21 },
]

export const MUSEUM_GALLERY_PLANT_COLLIDERS: readonly FormalWalkCollider[] = (
  MUSEUM_GALLERY_PLANT_SPECS.map(museumGalleryPlantPlanterBounds)
)

export const FORMAL_WALK_COLLIDERS: readonly FormalWalkCollider[] = [
  {
    id: 'opening-salon-bench',
    minX: -1.72,
    maxX: 1.72,
    minZ: 2.28,
    maxZ: 3.72,
  },
  MOBA_TWO_HEART_SCULPTURE_SPEC.collider,
  MONKEYDHASHY_CREATEBOX_SPEC.collider,
  PERSONAL_GALLERY_DOOR_SPEC.collider,
  MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER,
  ...MUSEUM_GALLERY_BENCH_COLLIDERS,
  ...MUSEUM_GALLERY_END_WALL_COLLIDERS,
  ...MUSEUM_GALLERY_THRESHOLD_WALL_COLLIDERS,
  ...MUSEUM_GALLERY_PORTAL_RETURN_COLLIDERS,
  ...MUSEUM_LOOP_WALL_RETURN_COLLIDERS,
  ...MUSEUM_ATRIUM_COLLIDERS,
  ...MUSEUM_GALLERY_PLANT_COLLIDERS,
]

export function capFormalWalkDelta(delta: number) {
  // Preserve real elapsed time through an ordinary hitch. Segment sweeping
  // below already protects colliders, while the upper bound still prevents a
  // backgrounded tab from teleporting the visitor on resume.
  return Math.min(0.12, Math.max(0, delta))
}

export function stepFormalWalkVelocity(
  current: number,
  target: number,
  delta: number,
  hasInput: boolean,
) {
  if (!Number.isFinite(current) || !Number.isFinite(target) || !Number.isFinite(delta)) return 0
  const strength = hasInput ? FORMAL_WALK_ACCELERATION : FORMAL_WALK_BRAKING
  return current + (target - current) * (1 - Math.exp(-strength * Math.max(0, delta)))
}

export const FORMAL_JOYSTICK_DEADZONE = 0.13

export function resolveFormalJoystickInput(
  deltaX: number,
  deltaY: number,
  maxTravel: number,
  deadzone = FORMAL_JOYSTICK_DEADZONE,
) {
  if (
    !Number.isFinite(deltaX)
    || !Number.isFinite(deltaY)
    || !Number.isFinite(maxTravel)
    || maxTravel <= 0
  ) {
    return { analogX: 0, analogY: 0, knobX: 0, knobY: 0, magnitude: 0 }
  }

  const distance = Math.hypot(deltaX, deltaY)
  if (distance < 0.0001) {
    return { analogX: 0, analogY: 0, knobX: 0, knobY: 0, magnitude: 0 }
  }

  const directionX = deltaX / distance
  const directionY = deltaY / distance
  const visualMagnitude = Math.min(1, distance / maxTravel)
  const safeDeadzone = Math.min(0.8, Math.max(0, deadzone))
  const inputMagnitude = visualMagnitude <= safeDeadzone
    ? 0
    : (visualMagnitude - safeDeadzone) / (1 - safeDeadzone)

  return {
    analogX: directionX * inputMagnitude,
    analogY: -directionY * inputMagnitude,
    knobX: directionX * visualMagnitude * maxTravel,
    knobY: directionY * visualMagnitude * maxTravel,
    magnitude: inputMagnitude,
  }
}

export function getFormalWalkVector(forwardAxis: number, strafeAxis: number, yaw: number) {
  const inputLength = Math.hypot(forwardAxis, strafeAxis)
  if (inputLength < 0.0001) return { x: 0, z: 0, magnitude: 0 }

  const scale = inputLength > 1 ? 1 / inputLength : 1
  const forward = forwardAxis * scale
  const strafe = strafeAxis * scale

  return {
    x: -Math.sin(yaw) * forward + Math.cos(yaw) * strafe,
    z: -Math.cos(yaw) * forward - Math.sin(yaw) * strafe,
    magnitude: Math.min(1, inputLength),
  }
}

export function isFormalWalkPointWalkable(point: FormalWalkPoint, radius = FORMAL_WALK_PLAYER_RADIUS) {
  return MUSEUM_WALK_ZONES.some((zone) => (
    point.x >= zone.minX + radius
    && point.x <= zone.maxX - radius
    && point.z >= zone.minZ + radius
    && point.z <= zone.maxZ - radius
  ))
}

function intersectsCollider(point: FormalWalkPoint, radius: number, colliders = FORMAL_WALK_COLLIDERS) {
  return colliders.some((collider) => (
    point.x > collider.minX - radius
    && point.x < collider.maxX + radius
    && point.z > collider.minZ - radius
    && point.z < collider.maxZ + radius
  ))
}

function canTraverseWalkSegment(
  from: FormalWalkPoint,
  to: FormalWalkPoint,
  radius: number,
  colliders: readonly FormalWalkCollider[],
) {
  const distance = Math.hypot(to.x - from.x, to.z - from.z)
  const steps = Math.max(1, Math.ceil(distance / 0.12))
  for (let step = 1; step <= steps; step += 1) {
    const point = {
      x: from.x + ((to.x - from.x) * step) / steps,
      z: from.z + ((to.z - from.z) * step) / steps,
    }
    if (!isFormalWalkPointWalkable(point, radius) || intersectsCollider(point, radius, colliders)) return false
  }
  return true
}

export function resolveFormalWalkPosition(
  current: FormalWalkPoint,
  proposed: FormalWalkPoint,
  radius = FORMAL_WALK_PLAYER_RADIUS,
  colliders: readonly FormalWalkCollider[] = FORMAL_WALK_COLLIDERS,
) {
  const resolveXThenZ = () => {
    const xStep = { x: proposed.x, z: current.z }
    const resolvedX = !canTraverseWalkSegment(current, xStep, radius, colliders)
      ? current.x
      : xStep.x
    const zStep = { x: resolvedX, z: proposed.z }
    const resolvedZ = !canTraverseWalkSegment({ x: resolvedX, z: current.z }, zStep, radius, colliders)
      ? current.z
      : zStep.z
    return { x: resolvedX, z: resolvedZ }
  }

  const resolveZThenX = () => {
    const zStep = { x: current.x, z: proposed.z }
    const resolvedZ = !canTraverseWalkSegment(current, zStep, radius, colliders)
      ? current.z
      : zStep.z
    const xStep = { x: proposed.x, z: resolvedZ }
    const resolvedX = !canTraverseWalkSegment({ x: current.x, z: resolvedZ }, xStep, radius, colliders)
      ? current.x
      : xStep.x
    return { x: resolvedX, z: resolvedZ }
  }

  const xFirst = resolveXThenZ()
  const zFirst = resolveZThenX()
  const remainingDistanceSquared = (point: FormalWalkPoint) => (
    (proposed.x - point.x) ** 2 + (proposed.z - point.z) ** 2
  )
  return remainingDistanceSquared(zFirst) < remainingDistanceSquared(xFirst) ? zFirst : xFirst
}
