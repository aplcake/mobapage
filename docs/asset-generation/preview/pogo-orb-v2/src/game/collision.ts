import type {
  CollisionVolume,
  LevelData,
  SlopeSurface,
  SpawnPoint,
  Vec3,
  WalkableSurface,
} from "../world/levelTypes"
import {
  add,
  boundsContainsPoint,
  clamp,
  closestHorizontalPushOutFromBox,
  cross,
  dot,
  lengthXZ,
  lerp,
  normalize,
  normalizeXZ,
  pointInsideCircleXZ,
  pointInsideOrientedRectXZ,
  pointInsidePolygonXZ,
  sub,
  verticalOverlapSphereBox,
} from "./collisionMath"
import type {
  PlayerCollisionDebugFrame,
  PlayerContactDebug,
  PlayerControllerTuning,
  PlayerState,
} from "./playerState"
import { getInitialSpawn, getSpawnById, resetPlayerToSpawn } from "./playerState"

export interface GroundHit {
  id: string
  label: string
  sourceKind: "walkableSurface" | "slopeSurface"
  surfaceY: number
  normal: Vec3
  slopeDegrees: number
  distanceFromSphereBottom: number
  snapDistance: number
}

export interface CollisionResolutionResult {
  player: PlayerState
  debug: PlayerCollisionDebugFrame
}

export function resolvePlayerCollision(params: {
  level: LevelData
  previousPlayer: PlayerState
  proposedPlayer: PlayerState
  tuning: PlayerControllerTuning
}): CollisionResolutionResult {
  const debug: PlayerCollisionDebugFrame = {
    contacts: [],
    blockedVolumeIds: [],
  }

  let player = clonePlayer(params.proposedPlayer)

  player.position = resolveBlockingVolumes({
    position: player.position,
    radius: player.radius,
    volumes: params.level.collisionVolumes,
    debug,
  })

  const groundHit = findBestGroundHit({
    level: params.level,
    previousPlayer: params.previousPlayer,
    proposedPlayer: player,
    tuning: params.tuning,
  })

  if (groundHit && canLand(params.previousPlayer, player, groundHit, params.tuning)) {
    player.position.y = groundHit.surfaceY + player.radius
    player.velocity.y = Math.max(0, player.velocity.y)
    player.grounded = true
    player.groundSurfaceId = groundHit.id
    player.groundNormal = groundHit.normal
    player.movementMode = groundHit.slopeDegrees > 0.1 ? "grounded" : "grounded"
    player.coyoteTimer = params.tuning.coyoteTime
    player.lastSafeSpawnId = player.lastSafeSpawnId || getInitialSpawn(params.level).id

    debug.contacts.push({
      id: `ground-${groundHit.id}`,
      kind: "ground",
      point: { x: player.position.x, y: groundHit.surfaceY, z: player.position.z },
      normal: groundHit.normal,
      label: groundHit.label,
    })
  } else {
    player.grounded = false
    player.groundSurfaceId = undefined
    player.groundNormal = { x: 0, y: 1, z: 0 }
    player.movementMode = "airborne"
  }

  player = resolveWaterAndBounds(params.level, player, debug)

  return { player, debug }
}

export function findBestGroundHit(params: {
  level: LevelData
  previousPlayer: PlayerState
  proposedPlayer: PlayerState
  tuning: PlayerControllerTuning
}): GroundHit | undefined {
  const hits: GroundHit[] = []
  const { level, proposedPlayer } = params

  for (const surface of level.walkableSurfaces) {
    const hit = groundHitFromWalkableSurface(surface, proposedPlayer.position, proposedPlayer.radius)
    if (hit) hits.push(hit)
  }

  for (const slope of level.slopes) {
    const hit = groundHitFromSlopeSurface(slope, proposedPlayer.position, proposedPlayer.radius)
    if (hit) hits.push(hit)
  }

  const currentBottom = proposedPlayer.position.y - proposedPlayer.radius
  const previousBottom = params.previousPlayer.position.y - params.previousPlayer.radius

  return hits
    .filter((hit) => {
      if (hit.slopeDegrees > params.tuning.maxWalkableSlopeDegrees) return false
      if (currentBottom > hit.surfaceY + hit.snapDistance) return false
      if (previousBottom < hit.surfaceY - params.tuning.maxStepUp) return false
      return true
    })
    .sort((a, b) => b.surfaceY - a.surfaceY)[0]
}

function canLand(
  previousPlayer: PlayerState,
  proposedPlayer: PlayerState,
  hit: GroundHit,
  tuning: PlayerControllerTuning
): boolean {
  const currentBottom = proposedPlayer.position.y - proposedPlayer.radius
  const previousBottom = previousPlayer.position.y - proposedPlayer.radius
  const fallingOrStable = proposedPlayer.velocity.y <= 0.05
  const nearSurface = currentBottom <= hit.surfaceY + hit.snapDistance
  const notTooFarBelow = currentBottom >= hit.surfaceY - tuning.allowedGroundPenetration
  const wasNotFarBelow = previousBottom >= hit.surfaceY - tuning.maxStepUp

  return fallingOrStable && nearSurface && notTooFarBelow && wasNotFarBelow
}

function groundHitFromWalkableSurface(
  surface: WalkableSurface,
  position: Vec3,
  radius: number
): GroundHit | undefined {
  if (!pointInsideWalkableSurfaceXZ(surface, position)) return undefined

  const surfaceY = surface.y
  const bottom = position.y - radius

  return {
    id: surface.id,
    label: surface.label,
    sourceKind: "walkableSurface",
    surfaceY,
    normal: surface.normal,
    slopeDegrees: 0,
    distanceFromSphereBottom: bottom - surfaceY,
    snapDistance: surface.landingRules.snapDistance,
  }
}

function pointInsideWalkableSurfaceXZ(surface: WalkableSurface, position: Vec3): boolean {
  if (surface.kind === "roundTop") {
    return pointInsideCircleXZ(position, surface.center, surface.radius ?? 0)
  }

  if (surface.kind === "polygon" && surface.polygonXZ) {
    return pointInsidePolygonXZ(position, surface.polygonXZ)
  }

  if (!surface.size) return false

  return pointInsideOrientedRectXZ(position, surface.center, surface.size, surface.yawRadians ?? 0)
}

function groundHitFromSlopeSurface(
  slope: SlopeSurface,
  position: Vec3,
  radius: number
): GroundHit | undefined {
  const start = slope.start
  const end = slope.end
  const line = sub(end, start)
  const lineXZ = { x: line.x, y: 0, z: line.z }
  const lengthSq = lineXZ.x * lineXZ.x + lineXZ.z * lineXZ.z

  if (lengthSq <= 0.000001) return undefined

  const fromStart = sub(position, start)
  const t = clamp((fromStart.x * lineXZ.x + fromStart.z * lineXZ.z) / lengthSq, 0, 1)
  const closest = {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
    z: lerp(start.z, end.z, t),
  }

  const lateral = { x: position.x - closest.x, y: 0, z: position.z - closest.z }
  if (lengthXZ(lateral) > slope.width * 0.5) return undefined

  const normal = getSlopeNormal(slope)
  const bottom = position.y - radius

  return {
    id: slope.id,
    label: slope.label,
    sourceKind: "slopeSurface",
    surfaceY: closest.y,
    normal,
    slopeDegrees: slope.slopeDegrees,
    distanceFromSphereBottom: bottom - closest.y,
    snapDistance: 0.12,
  }
}

function getSlopeNormal(slope: SlopeSurface): Vec3 {
  const slopeVector = normalize(sub(slope.end, slope.start))
  const horizontal = normalizeXZ(sub(slope.end, slope.start))
  const side = { x: -horizontal.z, y: 0, z: horizontal.x }
  const normal = normalize(cross(side, slopeVector))

  return normal.y < 0 ? { x: -normal.x, y: -normal.y, z: -normal.z } : normal
}

function resolveBlockingVolumes(params: {
  position: Vec3
  radius: number
  volumes: CollisionVolume[]
  debug: PlayerCollisionDebugFrame
}): Vec3 {
  let position = { ...params.position }

  for (const volume of params.volumes) {
    if (volume.response === "triggerOnly") continue

    if (volume.kind === "cylinder") {
      position = resolveCylinderVolume(position, params.radius, volume, params.debug)
      continue
    }

    position = resolveBoxLikeVolume(position, params.radius, volume, params.debug)
  }

  return position
}

function resolveBoxLikeVolume(
  position: Vec3,
  radius: number,
  volume: CollisionVolume,
  debug: PlayerCollisionDebugFrame
): Vec3 {
  if (!volume.size) return position
  if (!verticalOverlapSphereBox(position, radius, volume.center, volume.size.y)) return position

  const push = closestHorizontalPushOutFromBox({
    position,
    radius,
    center: volume.center,
    size: volume.size,
    yawRadians: volume.yawRadians,
  })

  if (!push) return position

  const resolved = add(position, push)
  const normal = normalizeXZ(push)

  debug.blockedVolumeIds.push(volume.id)
  debug.contacts.push({
    id: `wall-${volume.id}`,
    kind: "wall",
    point: { x: resolved.x - normal.x * radius, y: resolved.y, z: resolved.z - normal.z * radius },
    normal,
    label: volume.label,
  })

  return resolved
}

function resolveCylinderVolume(
  position: Vec3,
  radius: number,
  volume: CollisionVolume,
  debug: PlayerCollisionDebugFrame
): Vec3 {
  const volumeRadius = volume.radius ?? 0
  const volumeHeight = volume.height ?? volume.size?.y ?? 1

  if (!verticalOverlapSphereBox(position, radius, volume.center, volumeHeight)) return position

  const delta = { x: position.x - volume.center.x, y: 0, z: position.z - volume.center.z }
  const distance = lengthXZ(delta)
  const minDistance = volumeRadius + radius

  if (distance >= minDistance) return position

  const normal = distance > 0.000001 ? { x: delta.x / distance, y: 0, z: delta.z / distance } : { x: 1, y: 0, z: 0 }
  const penetration = minDistance - distance
  const resolved = { x: position.x + normal.x * penetration, y: position.y, z: position.z + normal.z * penetration }

  debug.blockedVolumeIds.push(volume.id)
  debug.contacts.push({
    id: `wall-${volume.id}`,
    kind: "wall",
    point: { x: resolved.x - normal.x * radius, y: resolved.y, z: resolved.z - normal.z * radius },
    normal,
    label: volume.label,
  })

  return resolved
}

function resolveWaterAndBounds(level: LevelData, player: PlayerState, debug: PlayerCollisionDebugFrame): PlayerState {
  let next = player
  const sphereBottom = player.position.y - player.radius

  for (const water of level.waterZones) {
    if (water.behavior !== "reset") continue
    if (!boundsContainsPoint(water.bounds, player.position)) continue
    if (sphereBottom >= water.waterSurfaceY) continue

    const resetSpawn = getSpawnById(level, water.resetSpawnId ?? player.lastSafeSpawnId) ?? getInitialSpawn(level)
    next = resetPlayerToSpawn(player, resetSpawn)
    next.lastSafeSpawnId = resetSpawn.id
    next.waterResetCount = player.waterResetCount + 1

    debug.waterZoneId = water.id
    debug.resetToSpawnId = resetSpawn.id
    debug.contacts.push({
      id: `water-${water.id}`,
      kind: "water",
      point: { x: player.position.x, y: water.waterSurfaceY, z: player.position.z },
      normal: { x: 0, y: 1, z: 0 },
      label: water.label,
    })

    return next
  }

  if (player.position.y < level.bounds.min.y - 8) {
    const resetSpawn = getSpawnById(level, player.lastSafeSpawnId) ?? getInitialSpawn(level)
    next = resetPlayerToSpawn(player, resetSpawn)
    next.lastSafeSpawnId = resetSpawn.id

    debug.resetToSpawnId = resetSpawn.id
    debug.contacts.push({
      id: "bounds-fall-reset",
      kind: "bounds",
      point: { ...player.position },
      normal: { x: 0, y: 1, z: 0 },
      label: "World bounds reset",
    })

    return next
  }

  next.position.x = clamp(next.position.x, level.bounds.min.x + next.radius, level.bounds.max.x - next.radius)
  next.position.z = clamp(next.position.z, level.bounds.min.z + next.radius, level.bounds.max.z - next.radius)

  return next
}

function clonePlayer(player: PlayerState): PlayerState {
  return {
    ...player,
    position: { ...player.position },
    previousPosition: { ...player.previousPosition },
    velocity: { ...player.velocity },
    groundNormal: { ...player.groundNormal },
  }
}

export function shouldUpdateLastSafeSpawn(player: PlayerState): boolean {
  return player.grounded && Boolean(player.groundSurfaceId)
}

export function findHighestWalkableYAtXZ(level: LevelData, position: Vec3): number | undefined {
  const hits: number[] = []

  for (const surface of level.walkableSurfaces) {
    if (pointInsideWalkableSurfaceXZ(surface, position)) hits.push(surface.y)
  }

  for (const slope of level.slopes) {
    const hit = groundHitFromSlopeSurface(slope, position, 0.5)
    if (hit) hits.push(hit.surfaceY)
  }

  return hits.sort((a, b) => b - a)[0]
}

export function getGroundInclineDegrees(normal: Vec3): number {
  return Math.acos(clamp(dot(normalize(normal), { x: 0, y: 1, z: 0 }), -1, 1)) * (180 / Math.PI)
}

export function getSpawnForReset(level: LevelData, player: PlayerState): SpawnPoint {
  return getSpawnById(level, player.lastSafeSpawnId) ?? getInitialSpawn(level)
}
