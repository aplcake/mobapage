import type { Bounds, OrientedBounds, RectBounds, Vec2, Vec3 } from "../world/levelTypes"

export const UP: Vec3 = { x: 0, y: 1, z: 0 }

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function scale(v: Vec3, scalar: number): Vec3 {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar }
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

export function length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

export function lengthXZ(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.z * v.z)
}

export function normalize(v: Vec3): Vec3 {
  const len = length(v)
  if (len <= 0.000001) return { x: 0, y: 0, z: 0 }
  return { x: v.x / len, y: v.y / len, z: v.z / len }
}

export function normalizeXZ(v: Vec3): Vec3 {
  const len = lengthXZ(v)
  if (len <= 0.000001) return { x: 0, y: 0, z: 0 }
  return { x: v.x / len, y: 0, z: v.z / len }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(current + maxDelta, target)
  if (current > target) return Math.max(current - maxDelta, target)
  return target
}

export function isOrientedBounds(bounds: Bounds): bounds is OrientedBounds {
  return bounds.kind === "oriented" || "yawRadians" in bounds
}

export function boundsContainsPoint(bounds: Bounds, point: Vec3): boolean {
  if (isOrientedBounds(bounds)) return orientedBoundsContainsPoint(bounds, point)
  return rectBoundsContainsPoint(bounds, point)
}

export function rectBoundsContainsPoint(bounds: RectBounds, point: Vec3): boolean {
  return (
    Math.abs(point.x - bounds.center.x) <= bounds.size.x * 0.5 &&
    Math.abs(point.y - bounds.center.y) <= bounds.size.y * 0.5 &&
    Math.abs(point.z - bounds.center.z) <= bounds.size.z * 0.5
  )
}

export function orientedBoundsContainsPoint(bounds: OrientedBounds, point: Vec3): boolean {
  const local = worldToLocalYaw(point, bounds.center, bounds.yawRadians)

  return (
    Math.abs(local.x) <= bounds.size.x * 0.5 &&
    Math.abs(local.y) <= bounds.size.y * 0.5 &&
    Math.abs(local.z) <= bounds.size.z * 0.5
  )
}

export function worldToLocalYaw(point: Vec3, center: Vec3, yawRadians = 0): Vec3 {
  const dx = point.x - center.x
  const dz = point.z - center.z
  const cos = Math.cos(-yawRadians)
  const sin = Math.sin(-yawRadians)

  return {
    x: dx * cos - dz * sin,
    y: point.y - center.y,
    z: dx * sin + dz * cos,
  }
}

export function localToWorldYaw(local: Vec3, center: Vec3, yawRadians = 0): Vec3 {
  const cos = Math.cos(yawRadians)
  const sin = Math.sin(yawRadians)

  return {
    x: local.x * cos - local.z * sin + center.x,
    y: local.y + center.y,
    z: local.x * sin + local.z * cos + center.z,
  }
}

export function pointInsideOrientedRectXZ(point: Vec3, center: Vec3, size: Vec3, yawRadians = 0): boolean {
  const local = worldToLocalYaw(point, center, yawRadians)
  return Math.abs(local.x) <= size.x * 0.5 && Math.abs(local.z) <= size.z * 0.5
}

export function pointInsideCircleXZ(point: Vec3, center: Vec3, radius: number): boolean {
  const dx = point.x - center.x
  const dz = point.z - center.z
  return dx * dx + dz * dz <= radius * radius
}

export function pointInsidePolygonXZ(point: Vec3, polygon: Vec2[]): boolean {
  if (polygon.length < 3) return false

  let inside = false
  let j = polygon.length - 1

  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]
    const b = polygon[j]
    const intersects =
      a.z > point.z !== b.z > point.z &&
      point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z + Number.EPSILON) + a.x

    if (intersects) inside = !inside
    j = i
  }

  return inside
}

export function yawFromMove(move: Vec3, fallbackYaw: number): number {
  if (Math.abs(move.x) + Math.abs(move.z) < 0.0001) return fallbackYaw
  return Math.atan2(move.x, move.z)
}

export function closestHorizontalPushOutFromBox(params: {
  position: Vec3
  radius: number
  center: Vec3
  size: Vec3
  yawRadians?: number
}): Vec3 | undefined {
  const { position, radius, center, size, yawRadians = 0 } = params
  const local = worldToLocalYaw(position, center, yawRadians)
  const halfX = size.x * 0.5
  const halfZ = size.z * 0.5

  const closestX = clamp(local.x, -halfX, halfX)
  const closestZ = clamp(local.z, -halfZ, halfZ)
  const dx = local.x - closestX
  const dz = local.z - closestZ
  const distanceSq = dx * dx + dz * dz
  const radiusSq = radius * radius

  if (distanceSq > radiusSq) return undefined

  let pushLocal: Vec3

  if (distanceSq > 0.000001) {
    const distance = Math.sqrt(distanceSq)
    const penetration = radius - distance
    pushLocal = { x: (dx / distance) * penetration, y: 0, z: (dz / distance) * penetration }
  } else {
    const pushX = halfX + radius - Math.abs(local.x)
    const pushZ = halfZ + radius - Math.abs(local.z)

    if (pushX < pushZ) {
      pushLocal = { x: local.x >= 0 ? pushX : -pushX, y: 0, z: 0 }
    } else {
      pushLocal = { x: 0, y: 0, z: local.z >= 0 ? pushZ : -pushZ }
    }
  }

  const worldBefore = localToWorldYaw({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, yawRadians)
  const worldAfter = localToWorldYaw(pushLocal, { x: 0, y: 0, z: 0 }, yawRadians)

  return {
    x: worldAfter.x - worldBefore.x,
    y: 0,
    z: worldAfter.z - worldBefore.z,
  }
}

export function verticalOverlapSphereBox(position: Vec3, radius: number, center: Vec3, sizeY: number): boolean {
  const bottom = position.y - radius
  const top = position.y + radius
  const boxBottom = center.y - sizeY * 0.5
  const boxTop = center.y + sizeY * 0.5

  if (bottom >= boxTop - 0.02) return false
  return top >= boxBottom && bottom <= boxTop
}
