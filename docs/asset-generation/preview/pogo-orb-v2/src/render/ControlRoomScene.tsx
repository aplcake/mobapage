import { Canvas } from "@react-three/fiber"
import { useMemo, useState } from "react"
import type { LevelId } from "../world/levelTypes"
import { seedLevelById } from "../world/levels/index.seed"
import type { PlayerDebugSnapshot } from "../game/playerState"
import type { RuntimeWorldTransition } from "../game/worldTransitions"
import {
  createInitialQuestRuntimeState,
  type CollectiblePickup,
  type QuestRuntimeState,
  type RuntimeQuestPrompt,
} from "../game/questState"
import { buildRouteLevel } from "../utils/routeBuilder"
import { buildScatterLevel } from "../utils/scatterBuilder"
import { DebugHud } from "./DebugHud"
import { LevelScene } from "./LevelScene"
import { defaultDebugToggles, type DebugToggles } from "./debugTypes"

const orderedLevelIds: LevelId[] = ["option-d-overworld", "glowbud-wizard-cave"]
type TransitionPhase = "idle" | "fadeOut" | "fadeIn"

export function ControlRoomScene() {
  const [activeLevelId, setActiveLevelId] = useState<LevelId>("option-d-overworld")
  const [activeSpawnId, setActiveSpawnId] = useState<string | undefined>()
  const [debugToggles, setDebugToggles] = useState<DebugToggles>(defaultDebugToggles)
  const [playerDebug, setPlayerDebug] = useState<PlayerDebugSnapshot | undefined>()
  const [activeTransitionPrompt, setActiveTransitionPrompt] = useState<RuntimeWorldTransition | undefined>()
  const [activeQuestPrompt, setActiveQuestPrompt] = useState<RuntimeQuestPrompt | undefined>()
  const [questState, setQuestState] = useState<QuestRuntimeState>(createInitialQuestRuntimeState)
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("idle")

  const activeLevel = seedLevelById[activeLevelId]
  const builtRouteLevel = useMemo(() => buildRouteLevel(activeLevel), [activeLevel])
  const builtScatterLevel = useMemo(() => buildScatterLevel(builtRouteLevel), [builtRouteLevel])

  const levelOptions = useMemo(
    () =>
      orderedLevelIds.map((levelId) => ({
        id: levelId,
        label: seedLevelById[levelId].displayName,
      })),
    []
  )

  function patchDebugToggles(patch: Partial<DebugToggles>) {
    setDebugToggles((current) => ({ ...current, ...patch }))
  }

  function changeLevel(levelId: LevelId) {
    setPlayerDebug(undefined)
    setActiveTransitionPrompt(undefined)
    setActiveQuestPrompt(undefined)
    setActiveSpawnId(undefined)
    setActiveLevelId(levelId)
  }

  function collectPickup(pickup: CollectiblePickup) {
    setQuestState((current) => {
      if (current.collectedIds.includes(pickup.collectible.id)) return current
      const questFlags = [...current.questFlags]
      if (pickup.collectible.kind === "specialCoin" && !questFlags.includes("foundSecretCaveCoin")) {
        questFlags.push("foundSecretCaveCoin")
      }
      return {
        ...current,
        collectedIds: [...current.collectedIds, pickup.collectible.id],
        questFlags,
      }
    })
  }

  function grantQuestFlag(flag: string) {
    setQuestState((current) => {
      if (current.questFlags.includes(flag)) return current
      return {
        ...current,
        questFlags: [...current.questFlags, flag],
      }
    })
  }

  function requestWorldTransition(transition: RuntimeWorldTransition) {
    if (transitionPhase !== "idle") return

    setActiveTransitionPrompt(undefined)
    setTransitionPhase("fadeOut")

    window.setTimeout(() => {
      setPlayerDebug(undefined)
      setActiveLevelId(transition.toLevelId)
      setActiveSpawnId(transition.targetSpawnId)
      setTransitionPhase("fadeIn")

      window.setTimeout(() => {
        setTransitionPhase("idle")
      }, 260)
    }, 260)
  }

  return (
    <main className="control-room">
      <div className="canvas-shell" aria-hidden="true">
        <Canvas shadows={false} camera={{ position: [28, 24, -34], fov: 48, near: 0.1, far: 400 }}>
          <LevelScene
            routeLevel={builtRouteLevel}
            scatterLevel={builtScatterLevel}
            debug={debugToggles}
            questState={questState}
            spawnId={activeSpawnId}
            playerDebug={playerDebug}
            onPlayerDebugUpdate={setPlayerDebug}
            onTransitionPromptUpdate={setActiveTransitionPrompt}
            onTransitionRequest={requestWorldTransition}
            onCollectiblePickup={collectPickup}
            onQuestPromptUpdate={setActiveQuestPrompt}
            onQuestFlagGrant={grantQuestFlag}
          />
        </Canvas>
      </div>

      {debugToggles.showHud ? (
        <DebugHud
          level={builtRouteLevel.level}
          scatterLevel={builtScatterLevel}
          levelOptions={levelOptions}
          activeLevelId={activeLevelId}
          debug={debugToggles}
          questState={questState}
          playerDebug={playerDebug}
          onLevelChange={changeLevel}
          onDebugChange={patchDebugToggles}
        />
      ) : null}

      {activeTransitionPrompt && transitionPhase === "idle" ? (
        <div className="transition-prompt">
          {activeTransitionPrompt.trigger.promptText ?? "Enter"}
          <kbd>E</kbd>
        </div>
      ) : activeQuestPrompt && transitionPhase === "idle" ? (
        <div className="transition-prompt">
          {activeQuestPrompt.promptText}
          <kbd>{activeQuestPrompt.grantsQuestFlag ? "E" : "Info"}</kbd>
        </div>
      ) : null}

      <div
        className={`transition-fade transition-fade-${transitionPhase}`}
        aria-hidden="true"
      />
    </main>
  )
}
