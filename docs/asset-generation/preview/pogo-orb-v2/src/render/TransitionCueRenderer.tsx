import { useMemo } from "react"
import * as THREE from "three"
import type { LevelData, WorldTransitionDefinition } from "../world/levelTypes"
import { getDebugMaterial } from "../assets/DebugMaterials"
import { boundsCenterTuple, boundsSizeTuple } from "../utils/renderBounds"

interface TransitionCueRendererProps {
  level: LevelData
}

export function TransitionCueRenderer({ level }: TransitionCueRendererProps) {
  const transitions = level.worldTransitions.filter(isVisibleCueTransition)

  return (
    <group name={`transition-cues-${level.id}`}>
      {transitions.map((transition) => (
        <TransitionCue key={transition.id} transition={transition} />
      ))}
    </group>
  )
}

function TransitionCue({ transition }: { transition: WorldTransitionDefinition }) {
  const center = boundsCenterTuple(transition.trigger.bounds)
  const size = boundsSizeTuple(transition.trigger.bounds)
  const material = getDebugMaterial(transition.debug.color, 0.55)
  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: transition.debug.color,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      }),
    [transition.debug.color]
  )

  return (
    <group name={`transition-cue-${transition.id}`} position={[center[0], center[1], center[2]]}>
      <mesh name={`transition-glow-${transition.id}`} material={material}>
        <sphereGeometry args={[Math.max(size[0], size[2]) * 0.42, 24, 14]} />
      </mesh>
      <mesh name={`transition-ring-${transition.id}`} rotation={[Math.PI * 0.5, 0, 0]} material={ringMaterial}>
        <torusGeometry args={[Math.max(size[0], size[2]) * 0.48, 0.08, 8, 32]} />
      </mesh>
    </group>
  )
}

function isVisibleCueTransition(transition: WorldTransitionDefinition): boolean {
  return transition.kind === "caveEntrance" || transition.kind === "caveExit"
}
