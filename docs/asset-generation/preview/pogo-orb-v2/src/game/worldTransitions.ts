import { boundsContainsPoint } from "./collisionMath"
import type { LevelData, Vec3, WorldTransitionDefinition } from "../world/levelTypes"

export type RuntimeWorldTransition = WorldTransitionDefinition & {
  kind: "caveEntrance" | "caveExit"
}

export function findActiveWorldTransition(
  level: LevelData,
  position: Vec3
): WorldTransitionDefinition | undefined {
  return level.worldTransitions.find((transition) =>
    boundsContainsPoint(transition.trigger.bounds, position)
  )
}

export function isRuntimeWorldTransition(
  transition: WorldTransitionDefinition
): transition is RuntimeWorldTransition {
  return transition.kind === "caveEntrance" || transition.kind === "caveExit"
}
