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
  MUSEUM_ATRIUM_TREE_SPECS,
  museumAtriumTreePlanterBounds,
} from './museumTreeDesign'

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
  ...MUSEUM_ATRIUM_TREE_SPECS.map(museumAtriumTreePlanterBounds),
]

export const FORMAL_WALK_COLLIDERS: readonly FormalWalkCollider[] = [
  {
    id: 'opening-salon-bench',
    minX: -1.72,
    maxX: 1.72,
    minZ: 2.28,
    maxZ: 3.72,
  },
  {
    id: 'moba-two-bouncing-heart',
    minX: -16.8,
    maxX: -15.3,
    minZ: 25.45,
    maxZ: 26.85,
  },
  MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER,
  ...MUSEUM_GALLERY_BENCH_COLLIDERS,
  ...MUSEUM_GALLERY_END_WALL_COLLIDERS,
  ...MUSEUM_GALLERY_THRESHOLD_WALL_COLLIDERS,
  ...MUSEUM_GALLERY_PORTAL_RETURN_COLLIDERS,
  ...MUSEUM_LOOP_WALL_RETURN_COLLIDERS,
  ...MUSEUM_ATRIUM_COLLIDERS,
]

export function capFormalWalkDelta(delta: number) {
  return Math.min(0.05, Math.max(0, delta))
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
