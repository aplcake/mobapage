import type { LevelData } from "../world/levelTypes"

export interface LevelStats {
  terrainZones: number
  walkableSurfaces: number
  collisionVolumes: number
  slopes: number
  climbSurfaces: number
  ledges: number
  waterZones: number
  paths: number
  worldTransitions: number
  spawnPoints: number
  cameraZones: number
  collectibles: number
  questItems: number
  npcs: number
  signs: number
  landmarks: number
  scatterZones: number
}

export function getLevelStats(level: LevelData): LevelStats {
  return {
    terrainZones: level.terrainZones.length,
    walkableSurfaces: level.walkableSurfaces.length,
    collisionVolumes: level.collisionVolumes.length,
    slopes: level.slopes.length,
    climbSurfaces: level.climbSurfaces.length,
    ledges: level.ledges.length,
    waterZones: level.waterZones.length,
    paths: level.paths.length,
    worldTransitions: level.worldTransitions.length,
    spawnPoints: level.spawnPoints.length,
    cameraZones: level.cameraZones.length,
    collectibles: level.collectibles.length,
    questItems: level.questItems.length,
    npcs: level.npcs.length,
    signs: level.signs.length,
    landmarks: level.landmarks.length,
    scatterZones: level.scatterZones.length,
  }
}
