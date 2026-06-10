import type { LevelData } from "../world/levelTypes"
import type { PlayerDebugSnapshot } from "../game/playerState"
import type { BuiltRouteLevel } from "../utils/routeBuilder"
import type { BuiltScatterLevel } from "../utils/scatterBuilder"
import { CameraRig } from "./CameraRig"
import { CollisionDebugRenderer } from "./CollisionDebugRenderer"
import { PathRenderer } from "./PathRenderer"
import { PlayerController } from "./PlayerController"
import { SceneLighting } from "./SceneLighting"
import { TerrainRenderer } from "./TerrainRenderer"
import { TransitionCueRenderer } from "./TransitionCueRenderer"
import { ToonPropLibrary } from "./ToonPropLibrary"
import { ScatterRenderer } from "./ScatterRenderer"
import type { DebugToggles } from "./debugTypes"
import type { RuntimeWorldTransition } from "../game/worldTransitions"
import type { CollectiblePickup, QuestRuntimeState, RuntimeQuestPrompt } from "../game/questState"
import { QuestObjectRenderer } from "./QuestObjectRenderer"

interface LevelSceneProps {
  routeLevel: BuiltRouteLevel
  scatterLevel: BuiltScatterLevel
  debug: DebugToggles
  questState: QuestRuntimeState
  spawnId?: string
  playerDebug?: PlayerDebugSnapshot
  onPlayerDebugUpdate?: (snapshot: PlayerDebugSnapshot) => void
  onTransitionPromptUpdate?: (transition: RuntimeWorldTransition | undefined) => void
  onTransitionRequest?: (transition: RuntimeWorldTransition) => void
  onCollectiblePickup?: (pickup: CollectiblePickup) => void
  onQuestPromptUpdate?: (prompt: RuntimeQuestPrompt | undefined) => void
  onQuestFlagGrant?: (flag: string) => void
}

export function LevelScene({
  routeLevel,
  scatterLevel,
  debug,
  questState,
  spawnId,
  playerDebug,
  onPlayerDebugUpdate,
  onTransitionPromptUpdate,
  onTransitionRequest,
  onCollectiblePickup,
  onQuestPromptUpdate,
  onQuestFlagGrant,
}: LevelSceneProps) {
  const level: LevelData = routeLevel.level
  const initialSpawn =
    level.spawnPoints.find((spawn) => spawn.kind === "initial") ?? level.spawnPoints[0]


  return (
    <>
      <color attach="background" args={[level.kind === "overworld" ? "#20283f" : "#10121c"]} />
      <fog attach="fog" args={[level.kind === "overworld" ? "#20283f" : "#10121c", 72, 210]} />

      <SceneLighting levelKind={level.kind} />
      <CameraRig
        level={level}
        focusPoint={playerDebug?.position ?? initialSpawn?.position}
        activeCameraZoneId={playerDebug?.activeCameraZoneId}
      />

      {debug.showTerrainZones ? <TerrainRenderer level={level} /> : null}
      <ToonPropLibrary level={level} />
      {debug.showPaths ? <PathRenderer builtPaths={routeLevel.paths} /> : null}
      {debug.showScatter ? <ScatterRenderer instances={scatterLevel.instances} /> : null}
      <QuestObjectRenderer level={level} questState={questState} />
      <TransitionCueRenderer level={level} />

      <PlayerController
        level={level}
        spawnId={spawnId}
        onPlayerDebugUpdate={onPlayerDebugUpdate}
        onTransitionPromptUpdate={onTransitionPromptUpdate}
        onTransitionRequest={onTransitionRequest}
        questState={questState}
        onCollectiblePickup={onCollectiblePickup}
        onQuestPromptUpdate={onQuestPromptUpdate}
        onQuestFlagGrant={onQuestFlagGrant}
      />

      <CollisionDebugRenderer level={level} debug={debug} playerDebug={playerDebug} />
    </>
  )
}
