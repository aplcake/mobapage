import type { Bounds, LevelData, ScatterZone, Vec3 } from "../world/levelTypes"
import { boundsContainsPoint, isOrientedBounds, localToWorldYaw, lengthXZ, sub } from "../game/collisionMath"
import type { BuiltRouteLevel } from "./routeBuilder"

export interface ScatterInstance {
  id: string
  zoneId: string
  scatterType: ScatterZone["scatterType"]
  position: Vec3
  yawRadians: number
  scale: number
  color: string
}

export interface BuiltScatterLevel {
  instances: ScatterInstance[]
  byType: Map<ScatterZone["scatterType"], ScatterInstance[]>
  rejectedForPath: number
  rejectedForSpacing: number
  estimatedDrawCalls: number
}

export function buildScatterLevel(routeLevel: BuiltRouteLevel): BuiltScatterLevel {
  const instances: ScatterInstance[] = []
  let rejectedForPath = 0
  let rejectedForSpacing = 0

  for (const zone of routeLevel.level.scatterZones) {
    const result = buildScatterZone(routeLevel.level, routeLevel, zone, instances)
    instances.push(...result.instances)
    rejectedForPath += result.rejectedForPath
    rejectedForSpacing += result.rejectedForSpacing
  }

  const byType = new Map<ScatterZone["scatterType"], ScatterInstance[]>()
  for (const instance of instances) {
    const group = byType.get(instance.scatterType) ?? []
    group.push(instance)
    byType.set(instance.scatterType, group)
  }

  return {
    instances,
    byType,
    rejectedForPath,
    rejectedForSpacing,
    estimatedDrawCalls: new Set(instances.map((instance) => `${instance.scatterType}:${instance.color}`)).size,
  }
}

function buildScatterZone(
  level: LevelData,
  routeLevel: BuiltRouteLevel,
  zone: ScatterZone,
  existingInstances: ScatterInstance[]
) {
  const random = seededRandom(zone.seed)
  const instances: ScatterInstance[] = []
  const targetCount = getTargetCount(zone)
  const maxAttempts = Math.max(targetCount * 18, 60)
  const pathSamples: Array<{ point: Vec3; width: number }> = []
  for (const path of routeLevel.paths) {
    if (!zone.avoidPathIds?.includes(path.path.id)) continue

    path.samples.forEach((sample, index) => {
      if (index % 4 === 0) {
        pathSamples.push(sample)
      }
    })
  }
  let rejectedForPath = 0
  let rejectedForSpacing = 0

  for (let attempt = 0; attempt < maxAttempts && instances.length < targetCount; attempt += 1) {
    const position = sampleBoundsXZ(zone.bounds, zone.surfaceY, random)
    if (!boundsContainsPoint(zone.bounds, position)) continue
    if (isInsideAvoidedZone(level, zone, position)) continue

    if (isTooCloseToPath(position, pathSamples, zone.placementRules.minDistanceFromPlayerRoute)) {
      rejectedForPath += 1
      continue
    }

    if (isTooCloseToInstances(position, [...existingInstances, ...instances], zone.placementRules.minDistanceBetweenInstances)) {
      rejectedForSpacing += 1
      continue
    }

    const [minScale, maxScale] = zone.placementRules.randomScaleRange
    instances.push({
      id: `${zone.id}-${instances.length.toString().padStart(3, "0")}`,
      zoneId: zone.id,
      scatterType: zone.scatterType,
      position,
      yawRadians: zone.placementRules.randomYaw ? random() * Math.PI * 2 : 0,
      scale: minScale + (maxScale - minScale) * random(),
      color: zone.debug.color,
    })
  }

  return { instances, rejectedForPath, rejectedForSpacing }
}

function getTargetCount(zone: ScatterZone): number {
  const area = zone.bounds.size.x * zone.bounds.size.z
  return Math.min(zone.placementRules.maxInstances, Math.max(0, Math.round(area * zone.density)))
}

function sampleBoundsXZ(bounds: Bounds, y: number, random: () => number): Vec3 {
  const local = {
    x: (random() - 0.5) * bounds.size.x,
    y: 0,
    z: (random() - 0.5) * bounds.size.z,
  }

  if (isOrientedBounds(bounds)) {
    const world = localToWorldYaw(local, bounds.center, bounds.yawRadians)
    return { x: world.x, y, z: world.z }
  }

  return {
    x: bounds.center.x + local.x,
    y,
    z: bounds.center.z + local.z,
  }
}

function isInsideAvoidedZone(level: LevelData, zone: ScatterZone, position: Vec3): boolean {
  if (!zone.avoidZoneIds || zone.avoidZoneIds.length === 0) return false

  return level.terrainZones.some((candidate) =>
    zone.avoidZoneIds?.includes(candidate.id) && boundsContainsPoint(candidate.bounds, position)
  )
}

function isTooCloseToPath(
  position: Vec3,
  pathSamples: Array<{ point: Vec3; width: number }>,
  minDistance: number
): boolean {
  return pathSamples.some((sample) => {
    const clearance = minDistance + sample.width * 0.5
    return lengthXZ(sub(position, sample.point)) < clearance
  })
}

function isTooCloseToInstances(position: Vec3, instances: ScatterInstance[], minDistance: number): boolean {
  return instances.some((instance) => lengthXZ(sub(position, instance.position)) < minDistance)
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0xffffffff
  }
}
