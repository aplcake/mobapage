import type {
  LevelData,
  LevelId,
  TerrainZone,
  WorldBounds,
  WorldTransitionDefinition,
  Vec3,
} from "./levelTypes"
import { assertUniqueIds } from "../utils/ids"

export interface LevelValidationIssue {
  severity: "error" | "warning"
  code: string
  message: string
  id?: string
}

export interface LevelValidationResult {
  levelId: LevelId
  errors: LevelValidationIssue[]
  warnings: LevelValidationIssue[]
  ok: boolean
}

export function validateLevelData(level: LevelData, allLevels?: LevelData[]): LevelValidationResult {
  const errors: LevelValidationIssue[] = []
  const warnings: LevelValidationIssue[] = []
  const levelsForCrossReferences = allLevels ?? [level]

  addDuplicateIdIssues(level, errors)
  validateRequiredCollections(level, errors, warnings)
  validateTerrainZoneContracts(level, errors, warnings)
  validateReferences(level, levelsForCrossReferences, errors, warnings, Boolean(allLevels))
  validateSpawns(level, errors, warnings)
  validateTransitions(level, levelsForCrossReferences, errors, warnings, Boolean(allLevels))
  validatePaths(level, errors, warnings)

  return {
    levelId: level.id,
    errors,
    warnings,
    ok: errors.length === 0,
  }
}

function addDuplicateIdIssues(level: LevelData, errors: LevelValidationIssue[]): void {
  const groups: Array<[string, Array<{ id: string }>]> = [
    ["terrainZones", level.terrainZones],
    ["walkableSurfaces", level.walkableSurfaces],
    ["collisionVolumes", level.collisionVolumes],
    ["slopes", level.slopes],
    ["climbSurfaces", level.climbSurfaces],
    ["ledges", level.ledges],
    ["waterZones", level.waterZones],
    ["paths", level.paths],
    ["worldTransitions", level.worldTransitions],
    ["spawnPoints", level.spawnPoints],
    ["cameraZones", level.cameraZones],
    ["collectibles", level.collectibles],
    ["questItems", level.questItems],
    ["npcs", level.npcs],
    ["signs", level.signs],
    ["landmarks", level.landmarks],
    ["scatterZones", level.scatterZones],
  ]

  for (const [groupName, items] of groups) {
    for (const duplicate of assertUniqueIds(items, groupName)) {
      errors.push({
        severity: "error",
        code: "duplicate-id",
        message: `Duplicate id detected in ${duplicate}`,
      })
    }
  }
}

function validateRequiredCollections(
  level: LevelData,
  errors: LevelValidationIssue[],
  warnings: LevelValidationIssue[]
): void {
  if (level.terrainZones.length === 0) {
    errors.push({ severity: "error", code: "missing-terrain-zones", message: "Level has no terrain zones." })
  }

  if (level.spawnPoints.length === 0) {
    errors.push({ severity: "error", code: "missing-spawn-points", message: "Level has no spawn points." })
  }

  if (level.cameraZones.length === 0 && level.debug.requiredValidation.requireCameraZoneCoverage) {
    warnings.push({ severity: "warning", code: "missing-camera-zones", message: "Level has no camera zones." })
  }
}

function validateTerrainZoneContracts(
  level: LevelData,
  errors: LevelValidationIssue[],
  warnings: LevelValidationIssue[]
): void {
  for (const zone of level.terrainZones) {
    const hasSurface = level.walkableSurfaces.some(surface => surface.zoneId === zone.id)
    const hasCollider = level.collisionVolumes.some(volume => volume.zoneId === zone.id)

    if (zone.debug.validateHasWalkableSurface && !hasSurface) {
      errors.push({
        severity: "error",
        code: "zone-missing-walkable-surface",
        id: zone.id,
        message: `Terrain zone ${zone.id} requires at least one WalkableSurface.`,
      })
    }

    if (zone.debug.validateHasBlockingVolume && !hasCollider) {
      errors.push({
        severity: "error",
        code: "zone-missing-collision-volume",
        id: zone.id,
        message: `Terrain zone ${zone.id} requires at least one CollisionVolume.`,
      })
    }

    if (zone.connectsTo.length === 0 && zone.routeRole !== "secret") {
      warnings.push({
        severity: "warning",
        code: "zone-has-no-connections",
        id: zone.id,
        message: `Terrain zone ${zone.id} has no route connections.`,
      })
    }
  }
}

function validateReferences(
  level: LevelData,
  allLevels: LevelData[],
  errors: LevelValidationIssue[],
  warnings: LevelValidationIssue[],
  crossLevelStrict: boolean
): void {
  const zoneIds = new Set(level.terrainZones.map(zone => zone.id))

  for (const zone of level.terrainZones) {
    for (const targetZoneId of zone.connectsTo) {
      if (!zoneIds.has(targetZoneId)) {
        warnings.push({
          severity: "warning",
          code: "zone-connects-to-missing-zone",
          id: zone.id,
          message: `Terrain zone ${zone.id} connects to missing zone ${targetZoneId}. This may be intentional during early seeding.`,
        })
      }
    }
  }

  for (const surface of level.walkableSurfaces) {
    if (!zoneIds.has(surface.zoneId)) {
      errors.push({
        severity: "error",
        code: "surface-missing-zone",
        id: surface.id,
        message: `WalkableSurface ${surface.id} references missing zone ${surface.zoneId}.`,
      })
    }
  }

  for (const volume of level.collisionVolumes) {
    if (volume.zoneId && !zoneIds.has(volume.zoneId)) {
      errors.push({
        severity: "error",
        code: "volume-missing-zone",
        id: volume.id,
        message: `CollisionVolume ${volume.id} references missing zone ${volume.zoneId}.`,
      })
    }
  }

  const levelIds = new Set(allLevels.map(candidate => candidate.id))
  for (const transition of level.worldTransitions) {
    if (!levelIds.has(transition.toLevelId)) {
      const issue = {
        severity: crossLevelStrict ? "error" as const : "warning" as const,
        code: "transition-target-level-missing",
        id: transition.id,
        message: `World transition ${transition.id} targets missing level ${transition.toLevelId}. Pass all levels to validate cross-level targets strictly.`,
      }

      if (crossLevelStrict) errors.push(issue)
      else warnings.push(issue)
    }
  }
}

function validateSpawns(
  level: LevelData,
  errors: LevelValidationIssue[],
  warnings: LevelValidationIssue[]
): void {
  for (const spawn of level.spawnPoints) {
    if (spawn.levelId !== level.id) {
      errors.push({
        severity: "error",
        code: "spawn-level-id-mismatch",
        id: spawn.id,
        message: `Spawn ${spawn.id} has levelId ${spawn.levelId} but belongs to ${level.id}.`,
      })
    }

    if (!pointInsideWorldBounds(spawn.position, level.bounds)) {
      warnings.push({
        severity: "warning",
        code: "spawn-outside-world-bounds",
        id: spawn.id,
        message: `Spawn ${spawn.id} is outside world bounds.`,
      })
    }
  }
}

function validateTransitions(
  level: LevelData,
  allLevels: LevelData[],
  errors: LevelValidationIssue[],
  warnings: LevelValidationIssue[],
  crossLevelStrict: boolean
): void {
  for (const transition of level.worldTransitions) {
    if (transition.fromLevelId !== level.id) {
      errors.push({
        severity: "error",
        code: "transition-from-level-mismatch",
        id: transition.id,
        message: `Transition ${transition.id} has fromLevelId ${transition.fromLevelId} but is defined on ${level.id}.`,
      })
    }

    const targetLevel = allLevels.find(candidate => candidate.id === transition.toLevelId)
    if (!targetLevel) continue

    const hasTargetSpawn = targetLevel.spawnPoints.some(spawn => spawn.id === transition.targetSpawnId)
    if (!hasTargetSpawn && level.debug.requiredValidation.requireTransitionTargets && crossLevelStrict) {
      errors.push({
        severity: "error",
        code: "transition-target-spawn-missing",
        id: transition.id,
        message: `Transition ${transition.id} targets missing spawn ${transition.targetSpawnId} in ${transition.toLevelId}.`,
      })
    }

    if (!transition.trigger.requireButtonPress && transition.kind !== "debugWarp") {
      warnings.push({
        severity: "warning",
        code: "transition-auto-trigger",
        id: transition.id,
        message: `Transition ${transition.id} does not require a button press. This may cause accidental transitions.`,
      })
    }
  }
}

function validatePaths(
  level: LevelData,
  errors: LevelValidationIssue[],
  warnings: LevelValidationIssue[]
): void {
  const zoneIds = new Set(level.terrainZones.map(zone => zone.id))
  const pathIds = new Set(level.paths.map(path => path.id))

  for (const path of level.paths) {
    if (path.levelId !== level.id) {
      errors.push({
        severity: "error",
        code: "path-level-id-mismatch",
        id: path.id,
        message: `Path ${path.id} has levelId ${path.levelId} but belongs to ${level.id}.`,
      })
    }

    if (path.points.length < 2) {
      errors.push({
        severity: "error",
        code: "path-not-enough-points",
        id: path.id,
        message: `Path ${path.id} must have at least two points.`,
      })
    }

    if (!zoneIds.has(path.route.fromZoneId)) {
      warnings.push({
        severity: "warning",
        code: "path-from-zone-missing",
        id: path.id,
        message: `Path ${path.id} starts from missing zone ${path.route.fromZoneId}.`,
      })
    }

    if (!zoneIds.has(path.route.toZoneId)) {
      warnings.push({
        severity: "warning",
        code: "path-to-zone-missing",
        id: path.id,
        message: `Path ${path.id} targets missing zone ${path.route.toZoneId}.`,
      })
    }

    if (path.route.branchOfPathId && !pathIds.has(path.route.branchOfPathId)) {
      warnings.push({
        severity: "warning",
        code: "path-branch-parent-missing",
        id: path.id,
        message: `Path ${path.id} branches from missing path ${path.route.branchOfPathId}.`,
      })
    }
  }
}

function pointInsideWorldBounds(point: Vec3, bounds: WorldBounds): boolean {
  return (
    point.x >= bounds.min.x &&
    point.x <= bounds.max.x &&
    point.y >= bounds.min.y &&
    point.y <= bounds.max.y &&
    point.z >= bounds.min.z &&
    point.z <= bounds.max.z
  )
}

export function formatValidationResult(result: LevelValidationResult): string {
  const lines: string[] = []
  lines.push(`Validation result for ${result.levelId}: ${result.ok ? "ok" : "failed"}`)

  for (const error of result.errors) {
    lines.push(`[error:${error.code}] ${error.id ? `${error.id}: ` : ""}${error.message}`)
  }

  for (const warning of result.warnings) {
    lines.push(`[warning:${warning.code}] ${warning.id ? `${warning.id}: ` : ""}${warning.message}`)
  }

  return lines.join("\n")
}


export function validateProjectLevels(levels: LevelData[]): LevelValidationResult[] {
  return levels.map(level => validateLevelData(level, levels))
}
