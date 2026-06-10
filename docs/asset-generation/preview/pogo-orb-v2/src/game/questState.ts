import type {
  CollectibleDefinition,
  LevelData,
  NPCDefinition,
  SignDefinition,
  Vec3,
  WorldTransitionDefinition,
} from "../world/levelTypes"
import { boundsContainsPoint, lengthXZ, sub } from "./collisionMath"

export interface QuestRuntimeState {
  collectedIds: string[]
  questFlags: string[]
}

export interface RuntimeQuestPrompt {
  id: string
  label: string
  promptText: string
  kind: "npc" | "sign" | "doorSeal"
  grantsQuestFlag?: string
}

export interface CollectiblePickup {
  collectible: CollectibleDefinition
}

const collectiblePickupRadius = 1.05
const signInteractionRadius = 2.4

export function createInitialQuestRuntimeState(): QuestRuntimeState {
  return {
    collectedIds: [],
    questFlags: [],
  }
}

export function hasCollected(state: QuestRuntimeState, collectibleId: string): boolean {
  return state.collectedIds.includes(collectibleId)
}

export function hasQuestFlag(state: QuestRuntimeState, flag: string | undefined): boolean {
  return Boolean(flag && state.questFlags.includes(flag))
}

export function findCollectiblePickup(
  level: LevelData,
  position: Vec3,
  state: QuestRuntimeState
): CollectiblePickup | undefined {
  const collectible = level.collectibles.find((candidate) => {
    if (hasCollected(state, candidate.id)) return false
    if (Math.abs(candidate.position.y - position.y) > 2.4) return false
    return lengthXZ(sub(candidate.position, position)) <= collectiblePickupRadius
  })

  return collectible ? { collectible } : undefined
}

export function findQuestPrompt(
  level: LevelData,
  position: Vec3,
  state: QuestRuntimeState
): RuntimeQuestPrompt | undefined {
  const npc = findNpcPrompt(level.npcs, position, state)
  if (npc) return npc

  const door = findDoorSealPrompt(level.worldTransitions, position)
  if (door) return door

  return findSignPrompt(level.signs, position)
}

function findNpcPrompt(
  npcs: NPCDefinition[],
  position: Vec3,
  state: QuestRuntimeState
): RuntimeQuestPrompt | undefined {
  const npc = npcs.find((candidate) => {
    if (candidate.interaction.requiredQuestFlag && !hasQuestFlag(state, candidate.interaction.requiredQuestFlag)) {
      return false
    }
    return lengthXZ(sub(candidate.position, position)) <= candidate.interaction.radius
  })

  if (!npc) return undefined

  const alreadyGranted = hasQuestFlag(state, npc.interaction.grantsQuestFlag)
  return {
    id: npc.id,
    label: npc.label,
    promptText: alreadyGranted ? `${npc.label}: blessing already marked` : npc.interaction.promptText,
    kind: "npc",
    grantsQuestFlag: alreadyGranted ? undefined : npc.interaction.grantsQuestFlag,
  }
}

function findSignPrompt(signs: SignDefinition[], position: Vec3): RuntimeQuestPrompt | undefined {
  const sign = signs.find((candidate) => lengthXZ(sub(candidate.position, position)) <= signInteractionRadius)

  if (!sign) return undefined

  return {
    id: sign.id,
    label: sign.label,
    promptText: getSignPromptText(sign),
    kind: "sign",
  }
}

function findDoorSealPrompt(
  transitions: WorldTransitionDefinition[],
  position: Vec3
): RuntimeQuestPrompt | undefined {
  const door = transitions.find((transition) => transition.kind === "doorAttempt" && boundsContainsPoint(transition.trigger.bounds, position))

  if (!door) return undefined

  return {
    id: door.id,
    label: door.label,
    promptText: door.trigger.promptText ?? "Seal locked",
    kind: "doorSeal",
  }
}

function getSignPromptText(sign: SignDefinition): string {
  if (sign.textId === "sign-route-preview") return "Museum path ahead. Cave branch climbs left."
  if (sign.textId === "sign-museum-seal") return "Museum seal is locked. Wizard blessing is tracked in debug."
  if (sign.textId === "sign-cave-exit") return "The cave mouth returns to the long approach."
  if (sign.textId === "sign-wizard-platform") return "Glowbud Wizard platform. Secrets are optional."
  return sign.label
}
