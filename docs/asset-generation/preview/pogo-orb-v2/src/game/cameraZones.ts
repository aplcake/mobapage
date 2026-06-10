import type { CameraZone, LevelData, Vec3 } from "../world/levelTypes"
import { boundsContainsPoint } from "./collisionMath"

export function findActiveCameraZone(level: LevelData, position: Vec3): CameraZone | undefined {
  return level.cameraZones
    .filter((zone) => boundsContainsPoint(zone.bounds, position))
    .sort((a, b) => b.priority - a.priority)[0]
}

export function getCameraZoneById(level: LevelData, cameraZoneId?: string): CameraZone | undefined {
  if (!cameraZoneId) return undefined
  return level.cameraZones.find((zone) => zone.id === cameraZoneId)
}
