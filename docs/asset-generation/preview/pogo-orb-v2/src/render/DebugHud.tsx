import type { LevelData, LevelId, Vec3 } from "../world/levelTypes"
import type { PlayerDebugSnapshot } from "../game/playerState"
import type { QuestRuntimeState } from "../game/questState"
import { getLevelStats } from "../utils/levelStats"
import type { BuiltScatterLevel } from "../utils/scatterBuilder"
import { seedLevels } from "../world/levels/index.seed"
import { validateProjectLevels } from "../world/debugValidation"
import type { DebugToggles } from "./debugTypes"

interface DebugHudProps {
  level: LevelData
  scatterLevel: BuiltScatterLevel
  levelOptions: Array<{ id: LevelId; label: string }>
  activeLevelId: LevelId
  debug: DebugToggles
  questState: QuestRuntimeState
  playerDebug?: PlayerDebugSnapshot
  onLevelChange: (levelId: LevelId) => void
  onDebugChange: (patch: Partial<DebugToggles>) => void
}

const toggleLabels: Array<[keyof DebugToggles, string]> = [
  ["showTerrainZones", "Terrain zones"],
  ["showPaths", "Path ribbons"],
  ["showScatter", "Scatter"],
  ["showWalkableSurfaces", "Walkable surfaces"],
  ["showCollisionVolumes", "Collision volumes"],
  ["showTransitions", "Transition triggers"],
  ["showWaterZones", "Water zones"],
  ["showCameraZones", "Camera zones"],
  ["showSurfaceNormals", "Surface normals"],
  ["showValidationPanel", "Validation panel"],
  ["showSpawnPoints", "Spawn points"],
  ["showPlayerCollider", "Player collider"],
  ["showContactPoints", "Contact points"],
]

export function DebugHud({
  level,
  scatterLevel,
  levelOptions,
  activeLevelId,
  debug,
  questState,
  playerDebug,
  onLevelChange,
  onDebugChange,
}: DebugHudProps) {
  const stats = getLevelStats(level)
  const validationResults = validateProjectLevels(seedLevels)
  const activeValidation = validationResults.find((result) => result.levelId === level.id)
  const totalErrors = validationResults.reduce((count, result) => count + result.errors.length, 0)
  const totalWarnings = validationResults.reduce((count, result) => count + result.warnings.length, 0)
  const scatterDrawCallWarning = scatterLevel.estimatedDrawCalls > 12

  return (
    <aside className="debug-hud">
      <h1>Option D Playable Shell</h1>
      <p>Folder 03 adds live kinematic movement and explicit collision resolution.</p>

      <div className="debug-controls">
        <label>
          Active level
          <select value={activeLevelId} onChange={(event) => onLevelChange(event.target.value as LevelId)}>
            {levelOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className="debug-grid">
        <dt>Level id</dt>
        <dd>{level.id}</dd>
        <dt>Kind</dt>
        <dd>{level.kind}</dd>
        <dt>Terrain zones</dt>
        <dd>{stats.terrainZones}</dd>
        <dt>Walkable</dt>
        <dd>{stats.walkableSurfaces}</dd>
        <dt>Volumes</dt>
        <dd>{stats.collisionVolumes}</dd>
        <dt>Paths</dt>
        <dd>{stats.paths}</dd>
        <dt>Transitions</dt>
        <dd>{stats.worldTransitions}</dd>
        <dt>Spawns</dt>
        <dd>{stats.spawnPoints}</dd>
        <dt>Camera zones</dt>
        <dd>{stats.cameraZones}</dd>
        <dt>Water zones</dt>
        <dd>{stats.waterZones}</dd>
        <dt>Scatter zones</dt>
        <dd>{stats.scatterZones}</dd>
      </dl>

      <h2 className="hud-subhead">Performance</h2>
      <dl className="debug-grid">
        <dt>Scatter instances</dt>
        <dd>{scatterLevel.instances.length}</dd>
        <dt>Scatter batches</dt>
        <dd>{scatterLevel.estimatedDrawCalls}</dd>
        <dt>Path rejects</dt>
        <dd>{scatterLevel.rejectedForPath}</dd>
        <dt>Spacing rejects</dt>
        <dd>{scatterLevel.rejectedForSpacing}</dd>
        <dt>Draw calls</dt>
        <dd>{scatterDrawCallWarning ? "review" : "ok"}</dd>
      </dl>

      <h2 className="hud-subhead">Player</h2>
      <dl className="debug-grid">
        <dt>Position</dt>
        <dd>{playerDebug ? formatVec3(playerDebug.position) : "none"}</dd>
        <dt>Velocity</dt>
        <dd>{playerDebug ? formatVec3(playerDebug.velocity) : "none"}</dd>
        <dt>Grounded</dt>
        <dd>{playerDebug ? String(playerDebug.grounded) : "none"}</dd>
        <dt>Mode</dt>
        <dd>{playerDebug?.movementMode ?? "none"}</dd>
        <dt>Surface</dt>
        <dd>{playerDebug?.groundSurfaceId ?? "none"}</dd>
        <dt>Camera zone</dt>
        <dd>{playerDebug?.activeCameraZoneId ?? "none"}</dd>
        <dt>Ground normal</dt>
        <dd>{playerDebug ? formatVec3(playerDebug.groundNormal) : "none"}</dd>
        <dt>Last spawn</dt>
        <dd>{playerDebug?.lastSafeSpawnId ?? "none"}</dd>
        <dt>Contacts</dt>
        <dd>{playerDebug?.contactCount ?? 0}</dd>
        <dt>Blocked</dt>
        <dd>{playerDebug?.blockedVolumeIds.length ?? 0}</dd>
        <dt>Water resets</dt>
        <dd>{playerDebug?.waterResetCount ?? 0}</dd>
      </dl>

      <h2 className="hud-subhead">Quest</h2>
      <dl className="debug-grid">
        <dt>Collected</dt>
        <dd>{questState.collectedIds.length}</dd>
        <dt>Flags</dt>
        <dd>{questState.questFlags.length > 0 ? questState.questFlags.join(", ") : "none"}</dd>
      </dl>

      <div className="debug-controls">
        {toggleLabels.map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="checkbox"
              checked={Boolean(debug[key])}
              onChange={(event) => onDebugChange({ [key]: event.target.checked })}
            />
          </label>
        ))}
      </div>

      {debug.showValidationPanel ? (
        <section className="validation-panel" aria-label="Validation">
          <h2 className="hud-subhead">Validation</h2>
          <dl className="debug-grid">
            <dt>Project</dt>
            <dd>{totalErrors === 0 ? "ok" : "failed"}</dd>
            <dt>Errors</dt>
            <dd>{totalErrors}</dd>
            <dt>Warnings</dt>
            <dd>{totalWarnings}</dd>
            <dt>Active level</dt>
            <dd>{activeValidation?.ok ? "ok" : "failed"}</dd>
          </dl>
          {activeValidation && activeValidation.errors.length + activeValidation.warnings.length > 0 ? (
            <ul className="validation-list">
              {[...activeValidation.errors, ...activeValidation.warnings].slice(0, 6).map((issue) => (
                <li key={`${issue.severity}-${issue.code}-${issue.id ?? issue.message}`}>
                  <strong>{issue.severity}</strong> {issue.code}
                </li>
              ))}
            </ul>
          ) : (
            <p className="validation-empty">No active level validation issues.</p>
          )}
        </section>
      ) : null}

      <div className="hud-footer">
        Controls: WASD or arrows move, Space jumps, Shift sprints, R resets, E uses cave transitions.
      </div>
    </aside>
  )
}

function formatVec3(value: Vec3): string {
  return `${value.x.toFixed(2)}, ${value.y.toFixed(2)}, ${value.z.toFixed(2)}`
}
