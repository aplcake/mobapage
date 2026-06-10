import type { LevelData, Vec3 } from "../world/levelTypes"
import { approach, lengthXZ, normalizeXZ, yawFromMove } from "./collisionMath"
import { resolvePlayerCollision, shouldUpdateLastSafeSpawn } from "./collision"
import type {
  PlayerCollisionDebugFrame,
  PlayerControllerTuning,
  PlayerState,
} from "./playerState"
import { defaultPlayerControllerTuning, getSpawnById, resetPlayerToSpawn } from "./playerState"

export interface PlayerMovementInputFrame {
  moveDirectionWorld: Vec3
  jumpPressed: boolean
  jumpHeld: boolean
  sprintHeld: boolean
  interactPressed: boolean
  resetPressed: boolean
}

export interface PlayerMovementUpdateResult {
  player: PlayerState
  collisionDebug: PlayerCollisionDebugFrame
}

export function updatePlayerMovement(params: {
  player: PlayerState
  level: LevelData
  input: PlayerMovementInputFrame
  dt: number
  tuning?: PlayerControllerTuning
}): PlayerMovementUpdateResult {
  const tuning = params.tuning ?? defaultPlayerControllerTuning
  const dt = Math.min(Math.max(params.dt, 0), 1 / 30)
  const previous = clonePlayer(params.player)
  let next = clonePlayer(params.player)

  next.previousPosition = { ...params.player.position }
  next.coyoteTimer = next.grounded ? tuning.coyoteTime : Math.max(0, next.coyoteTimer - dt)
  next.jumpBufferTimer = params.input.jumpPressed ? tuning.jumpBufferTime : Math.max(0, next.jumpBufferTimer - dt)

  if (params.input.resetPressed) {
    const resetSpawn = getSpawnById(params.level, next.lastSafeSpawnId) ?? params.level.spawnPoints[0]
    if (resetSpawn) {
      next = resetPlayerToSpawn(next, resetSpawn)
      return {
        player: next,
        collisionDebug: {
          contacts: [],
          blockedVolumeIds: [],
          resetToSpawnId: resetSpawn.id,
        },
      }
    }
  }

  next = applyHorizontalMovement(next, params.input, tuning, dt)
  next = applyJump(next, tuning)
  next = applyGravity(next, tuning, dt)
  next = integrate(next, dt)

  const resolved = resolvePlayerCollision({
    level: params.level,
    previousPlayer: previous,
    proposedPlayer: next,
    tuning,
  })

  next = resolved.player

  if (shouldUpdateLastSafeSpawn(next)) {
    const checkpoint = params.level.spawnPoints.find((spawn) => spawn.kind === "checkpoint")
    if (checkpoint && Math.abs(next.position.z - checkpoint.position.z) < 8) {
      next.lastSafeSpawnId = checkpoint.id
    }
  }

  return {
    player: next,
    collisionDebug: resolved.debug,
  }
}

function applyHorizontalMovement(
  player: PlayerState,
  input: PlayerMovementInputFrame,
  tuning: PlayerControllerTuning,
  dt: number
): PlayerState {
  const next = clonePlayer(player)
  const desiredDirection = normalizeXZ(input.moveDirectionWorld)
  const hasInput = lengthXZ(desiredDirection) > 0.001
  const maxSpeed = tuning.walkSpeed * (input.sprintHeld ? tuning.sprintMultiplier : 1)

  if (hasInput) {
    const acceleration = next.grounded ? tuning.groundAcceleration : tuning.airAcceleration
    const desiredVelocityX = desiredDirection.x * maxSpeed
    const desiredVelocityZ = desiredDirection.z * maxSpeed

    next.velocity.x = approach(next.velocity.x, desiredVelocityX, acceleration * dt)
    next.velocity.z = approach(next.velocity.z, desiredVelocityZ, acceleration * dt)
    next.yawRadians = yawFromMove(desiredDirection, next.yawRadians)
  } else if (next.grounded) {
    next.velocity.x = approach(next.velocity.x, 0, tuning.groundFriction * dt)
    next.velocity.z = approach(next.velocity.z, 0, tuning.groundFriction * dt)
  }

  return next
}

function applyJump(player: PlayerState, tuning: PlayerControllerTuning): PlayerState {
  const next = clonePlayer(player)
  const canJump = next.jumpBufferTimer > 0 && next.coyoteTimer > 0

  if (!canJump) return next

  next.velocity.y = Math.sqrt(2 * tuning.gravity * tuning.jumpHeight)
  next.grounded = false
  next.groundSurfaceId = undefined
  next.movementMode = "airborne"
  next.coyoteTimer = 0
  next.jumpBufferTimer = 0

  return next
}

function applyGravity(player: PlayerState, tuning: PlayerControllerTuning, dt: number): PlayerState {
  const next = clonePlayer(player)

  if (!next.grounded) {
    next.velocity.y = Math.max(next.velocity.y - tuning.gravity * dt, -tuning.terminalFallSpeed)
  }

  return next
}

function integrate(player: PlayerState, dt: number): PlayerState {
  const next = clonePlayer(player)

  next.position.x += next.velocity.x * dt
  next.position.y += next.velocity.y * dt
  next.position.z += next.velocity.z * dt

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
