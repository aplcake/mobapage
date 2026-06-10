import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, type MutableRefObject } from "react"
import * as THREE from "three"
import { PsychedelicPogoOrbAdapter } from "../assets/PsychedelicPogoOrbAdapter"
import type { LevelData, Vec3 } from "../world/levelTypes"
import { createKeyboardInputTracker, type KeyboardInputTracker } from "../game/input"
import type { PlayerDebugSnapshot, PlayerState } from "../game/playerState"
import {
  createPlayerStateForLevel,
  defaultPlayerControllerTuning,
  snapshotPlayerState,
} from "../game/playerState"
import { updatePlayerMovement, type PlayerMovementInputFrame } from "../game/movement"
import { findActiveCameraZone } from "../game/cameraZones"
import {
  findActiveWorldTransition,
  isRuntimeWorldTransition,
  type RuntimeWorldTransition,
} from "../game/worldTransitions"
import {
  findCollectiblePickup,
  findQuestPrompt,
  type CollectiblePickup,
  type QuestRuntimeState,
  type RuntimeQuestPrompt,
} from "../game/questState"

interface PlayerControllerProps {
  level: LevelData
  questState: QuestRuntimeState
  spawnId?: string
  onPlayerDebugUpdate?: (snapshot: PlayerDebugSnapshot) => void
  onTransitionPromptUpdate?: (transition: RuntimeWorldTransition | undefined) => void
  onTransitionRequest?: (transition: RuntimeWorldTransition) => void
  onCollectiblePickup?: (pickup: CollectiblePickup) => void
  onQuestPromptUpdate?: (prompt: RuntimeQuestPrompt | undefined) => void
  onQuestFlagGrant?: (flag: string) => void
}

export function PlayerController({
  level,
  questState,
  spawnId,
  onPlayerDebugUpdate,
  onTransitionPromptUpdate,
  onTransitionRequest,
  onCollectiblePickup,
  onQuestPromptUpdate,
  onQuestFlagGrant,
}: PlayerControllerProps) {
  const groupRef = useRef<THREE.Group | null>(null)
  const trackerRef = useRef<KeyboardInputTracker | null>(null)
  const playerRef = useRef<PlayerState>(createPlayerStateForLevel(level))
  const transitionPromptIdRef = useRef<string | undefined>(undefined)
  const debugTimerRef = useRef(0)
  const { camera } = useThree()

  const tuning = useMemo(() => defaultPlayerControllerTuning, [])

  useEffect(() => {
    playerRef.current = createPlayerStateForLevel(level, tuning, spawnId)
    transitionPromptIdRef.current = undefined
    onTransitionPromptUpdate?.(undefined)
    updateGroupTransform(groupRef.current, playerRef.current)
    onPlayerDebugUpdate?.(
      snapshotPlayerState(playerRef.current, level, { contacts: [], blockedVolumeIds: [] })
    )
  }, [level, onPlayerDebugUpdate, onTransitionPromptUpdate, spawnId, tuning])

  useEffect(() => {
    const tracker = createKeyboardInputTracker(window)
    trackerRef.current = tracker

    return () => {
      tracker.dispose()
      trackerRef.current = null
    }
  }, [])

  useFrame((state, delta) => {
    const tracker = trackerRef.current
    if (!tracker) return

    const input = buildMovementInputFrame(tracker, state.camera)
    const result = updatePlayerMovement({
      player: playerRef.current,
      level,
      input,
      dt: delta,
      tuning,
    })

    result.player.activeCameraZoneId = findActiveCameraZone(level, result.player.position)?.id
    playerRef.current = result.player
    updateGroupTransform(groupRef.current, result.player)
    updateTransitionState({
      level,
      position: result.player.position,
      interactPressed: input.interactPressed,
      onTransitionPromptUpdate,
      onTransitionRequest,
      promptIdRef: transitionPromptIdRef,
    })
    updateQuestRuntime({
      level,
      questState,
      position: result.player.position,
      interactPressed: input.interactPressed,
      onCollectiblePickup,
      onQuestPromptUpdate,
      onQuestFlagGrant,
    })

    debugTimerRef.current += delta
    const debugInterval = 1 / tuning.debugSnapshotHz

    if (debugTimerRef.current >= debugInterval) {
      debugTimerRef.current = 0
      onPlayerDebugUpdate?.(snapshotPlayerState(result.player, level, result.collisionDebug))
    }
  })

  useFrame(() => {
    camera.near = 0.1
    camera.far = 400
  })

  return (
    <group ref={groupRef} name="player-controller-root">
      <PsychedelicPogoOrbAdapter position={{ x: 0, y: -0.5, z: 0 }} />
    </group>
  )
}

function updateQuestRuntime(params: {
  level: LevelData
  questState: QuestRuntimeState
  position: Vec3
  interactPressed: boolean
  onCollectiblePickup?: (pickup: CollectiblePickup) => void
  onQuestPromptUpdate?: (prompt: RuntimeQuestPrompt | undefined) => void
  onQuestFlagGrant?: (flag: string) => void
}): void {
  const pickup = findCollectiblePickup(params.level, params.position, params.questState)
  if (pickup) {
    params.onCollectiblePickup?.(pickup)
  }

  const prompt = findQuestPrompt(params.level, params.position, params.questState)
  params.onQuestPromptUpdate?.(prompt)

  if (prompt?.grantsQuestFlag && params.interactPressed) {
    params.onQuestFlagGrant?.(prompt.grantsQuestFlag)
  }
}

function updateTransitionState(params: {
  level: LevelData
  position: Vec3
  interactPressed: boolean
  onTransitionPromptUpdate?: (transition: RuntimeWorldTransition | undefined) => void
  onTransitionRequest?: (transition: RuntimeWorldTransition) => void
  promptIdRef: MutableRefObject<string | undefined>
}): void {
  const activeTransition = findActiveWorldTransition(params.level, params.position)
  const runtimeTransition =
    activeTransition && isRuntimeWorldTransition(activeTransition) ? activeTransition : undefined
  const nextPromptId = runtimeTransition?.id

  if (params.promptIdRef.current !== nextPromptId) {
    params.promptIdRef.current = nextPromptId
    params.onTransitionPromptUpdate?.(runtimeTransition)
  }

  if (runtimeTransition && params.interactPressed) {
    params.onTransitionRequest?.(runtimeTransition)
  }
}

function buildMovementInputFrame(
  tracker: KeyboardInputTracker,
  camera: THREE.Camera
): PlayerMovementInputFrame {
  const raw = tracker.getFrameInput()
  const moveDirectionWorld = cameraRelativeMoveVector(raw.moveX, raw.moveZ, camera)

  return {
    moveDirectionWorld,
    jumpPressed: raw.jumpPressed,
    jumpHeld: raw.jumpHeld,
    sprintHeld: raw.sprintHeld,
    interactPressed: raw.interactPressed,
    resetPressed: raw.resetPressed,
  }
}

function cameraRelativeMoveVector(moveX: number, moveZ: number, camera: THREE.Camera): Vec3 {
  if (moveX === 0 && moveZ === 0) return { x: 0, y: 0, z: 0 }

  const forward = new THREE.Vector3()
  camera.getWorldDirection(forward)
  forward.y = 0

  if (forward.lengthSq() <= 0.000001) {
    forward.set(0, 0, 1)
  }

  forward.normalize()

  const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize()
  const move = new THREE.Vector3()
    .addScaledVector(right, moveX)
    .addScaledVector(forward, moveZ)

  if (move.lengthSq() > 1) move.normalize()

  return { x: move.x, y: 0, z: move.z }
}

function updateGroupTransform(group: THREE.Group | null, player: PlayerState): void {
  if (!group) return

  group.position.set(player.position.x, player.position.y, player.position.z)
  group.rotation.set(0, player.yawRadians, 0)
}
