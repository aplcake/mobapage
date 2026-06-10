import type { Bounds, OrientedBounds, RectBounds, Vec3 } from "../world/levelTypes"

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z }
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function scale(v: Vec3, scalar: number): Vec3 {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar }
}

export function distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function distanceXZ(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI
}

export function yawFromXZDirection(direction: Vec3): number {
  return Math.atan2(direction.x, direction.z)
}

export function isOrientedBounds(bounds: Bounds): bounds is OrientedBounds {
  return bounds.kind === "oriented" || "yawRadians" in bounds
}

export function isRectBounds(bounds: Bounds): bounds is RectBounds {
  return !isOrientedBounds(bounds)
}

export function boundsContainsPoint(bounds: Bounds, point: Vec3): boolean {
  if (!isOrientedBounds(bounds)) {
    return axisAlignedBoundsContainsPoint(bounds, point)
  }

  const dx = point.x - bounds.center.x
  const dz = point.z - bounds.center.z
  const cos = Math.cos(-bounds.yawRadians)
  const sin = Math.sin(-bounds.yawRadians)
  const localX = dx * cos - dz * sin
  const localZ = dx * sin + dz * cos

  return (
    Math.abs(localX) <= bounds.size.x * 0.5 &&
    Math.abs(point.y - bounds.center.y) <= bounds.size.y * 0.5 &&
    Math.abs(localZ) <= bounds.size.z * 0.5
  )
}

export function axisAlignedBoundsContainsPoint(bounds: RectBounds, point: Vec3): boolean {
  return (
    Math.abs(point.x - bounds.center.x) <= bounds.size.x * 0.5 &&
    Math.abs(point.y - bounds.center.y) <= bounds.size.y * 0.5 &&
    Math.abs(point.z - bounds.center.z) <= bounds.size.z * 0.5
  )
}
