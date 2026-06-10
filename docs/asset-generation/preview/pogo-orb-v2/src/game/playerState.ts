import type { LevelData, SpawnPoint, Vec3 } from "../world/levelTypes"

export type PlayerMovementMode = "grounded" | "airborne" | "sliding" | "resetting"

export interface PlayerControllerTuning {
  radius: number
  walkSpeed: number
  sprintMultiplier: number
  groundAcceleration: number
  airAcceleration: number
  groundFriction: number
  gravity: number
  jumpHeight: number
  terminalFallSpeed: number
  maxWalkableSlopeDegrees: number
  groundSnapDistance: number
  allowedGroundPenetration: number
  maxStepUp: number
  coyoteTime: number
  jumpBufferTime: number
  debugSnapshotHz: number
}

export const defaultPlayerControllerTuning: PlayerControllerTuning = {
  radius: 0.5,
  walkSpeed: 7.2,
  sprintMultiplier: 1.25,
  groundAcceleration: 42,
  airAcceleration: 17,
  groundFriction: 34,
  gravity: 24,
  jumpHeight: 2.45,
  terminalFallSpeed: 36,
  maxWalkableSlopeDegrees: 35,
  groundSnapDistance: 0.1,
  allowedGroundPenetration: 0.18,
  maxStepUp: 0.3,
  coyoteTime: 0.09,
  jumpBufferTime: 0.1,
  debugSnapshotHz: 12,
}

export interface PlayerState {
  position: Vec3
  previousPosition: Vec3
  velocity: Vec3
  radius: number
  yawRadians: number
  grounded: boolean
  groundSurfaceId?: string
  groundNormal: Vec3
  lastSafeSpawnId: string
  activeCameraZoneId?: string
  movementMode: PlayerMovementMode
  coyoteTimer: number
  jumpBufferTimer: number
  waterResetCount: number
}

export interface PlayerContactDebug {
  id: string
  kind: "ground" | "wall" | "water" | "bounds"
  point: Vec3
  normal: Vec3
  label: string
}

export interface PlayerCollisionDebugFrame {
  contacts: PlayerContactDebug[]
  blockedVolumeIds: string[]
  waterZoneId?: string
  resetToSpawnId?: string
}

export interface PlayerDebugSnapshot {
  levelId: string
  position: Vec3
  velocity: Vec3
  radius: number
  yawRadians: number
  grounded: boolean
  groundSurfaceId?: string
  groundNormal: Vec3
  lastSafeSpawnId: string
  activeCameraZoneId?: string
  movementMode: PlayerMovementMode
  contactCount: number
  blockedVolumeIds: string[]
  contacts: PlayerContactDebug[]
  waterResetCount: number
}

export function createPlayerStateFromSpawn(
  spawn: SpawnPoint,
  tuning: PlayerControllerTuning = defaultPlayerControllerTuning
): PlayerState {
  return {
    position: copyVec3(spawn.position),
    previousPosition: copyVec3(spawn.position),
    velocity: { x: 0, y: 0, z: 0 },
    radius: tuning.radius,
    yawRadians: spawn.yawRadians,
    grounded: false,
    groundSurfaceId: undefined,
    groundNormal: { x: 0, y: 1, z: 0 },
    lastSafeSpawnId: spawn.id,
    activeCameraZoneId: spawn.cameraZoneHint,
    movementMode: "airborne",
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    waterResetCount: 0,
  }
}

export function createPlayerStateForLevel(
  level: LevelData,
  tuning: PlayerControllerTuning = defaultPlayerControllerTuning,
  spawnId?: string
): PlayerState {
  const spawn = spawnId ? getSpawnById(level, spawnId) ?? getInitialSpawn(level) : getInitialSpawn(level)
  return createPlayerStateFromSpawn(spawn, tuning)
}

export function getInitialSpawn(level: LevelData): SpawnPoint {
  const spawn = level.spawnPoints.find((candidate) => candidate.kind === "initial") ?? level.spawnPoints[0]

  if (!spawn) {
    throw new Error(`Level ${level.id} has no spawn points.`)
  }

  return spawn
}

export function getSpawnById(level: LevelData, spawnId: string): SpawnPoint | undefined {
  return level.spawnPoints.find((spawn) => spawn.id === spawnId)
}

export function resetPlayerToSpawn(player: PlayerState, spawn: SpawnPoint): PlayerState {
  return {
    ...player,
    position: copyVec3(spawn.position),
    previousPosition: copyVec3(spawn.position),
    velocity: { x: 0, y: 0, z: 0 },
    yawRadians: spawn.yawRadians,
    grounded: false,
    groundSurfaceId: undefined,
    groundNormal: { x: 0, y: 1, z: 0 },
    activeCameraZoneId: spawn.cameraZoneHint,
    movementMode: "resetting",
    coyoteTimer: 0,
    jumpBufferTimer: 0,
  }
}

export function snapshotPlayerState(
  player: PlayerState,
  level: LevelData,
  collisionDebug: PlayerCollisionDebugFrame
): PlayerDebugSnapshot {
  return {
    levelId: level.id,
    position: copyVec3(player.position),
    velocity: copyVec3(player.velocity),
    radius: player.radius,
    yawRadians: player.yawRadians,
    grounded: player.grounded,
    groundSurfaceId: player.groundSurfaceId,
    groundNormal: copyVec3(player.groundNormal),
    lastSafeSpawnId: player.lastSafeSpawnId,
    activeCameraZoneId: player.activeCameraZoneId,
    movementMode: player.movementMode,
    contactCount: collisionDebug.contacts.length,
    blockedVolumeIds: [...collisionDebug.blockedVolumeIds],
    contacts: collisionDebug.contacts.map((contact) => ({
      ...contact,
      point: copyVec3(contact.point),
      normal: copyVec3(contact.normal),
    })),
    waterResetCount: player.waterResetCount,
  }
}

export function copyVec3(value: Vec3): Vec3 {
  return { x: value.x, y: value.y, z: value.z }
}
