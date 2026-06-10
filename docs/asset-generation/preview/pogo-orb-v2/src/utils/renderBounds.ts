import type { Bounds } from "../world/levelTypes"

export function boundsCenterTuple(bounds: Bounds): [number, number, number] {
  return [bounds.center.x, bounds.center.y, bounds.center.z]
}

export function boundsSizeTuple(bounds: Bounds): [number, number, number] {
  return [bounds.size.x, bounds.size.y, bounds.size.z]
}

export function boundsYawRadians(bounds: Bounds): number {
  return bounds.kind === "oriented" ? bounds.yawRadians : 0
}
