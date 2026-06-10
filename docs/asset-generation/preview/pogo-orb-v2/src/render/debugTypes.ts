export interface DebugToggles {
  showHud: boolean
  showTerrainZones: boolean
  showPaths: boolean
  showScatter: boolean
  showWalkableSurfaces: boolean
  showCollisionVolumes: boolean
  showTransitions: boolean
  showWaterZones: boolean
  showCameraZones: boolean
  showSurfaceNormals: boolean
  showValidationPanel: boolean
  showSpawnPoints: boolean
  showPlayerCollider: boolean
  showContactPoints: boolean
}

export const defaultDebugToggles: DebugToggles = {
  showHud: true,
  showTerrainZones: true,
  showPaths: true,
  showScatter: true,
  showWalkableSurfaces: false,
  showCollisionVolumes: false,
  showTransitions: true,
  showWaterZones: true,
  showCameraZones: false,
  showSurfaceNormals: false,
  showValidationPanel: true,
  showSpawnPoints: true,
  showPlayerCollider: true,
  showContactPoints: true,
}
