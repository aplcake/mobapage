export type LevelId = "option-d-overworld" | "glowbud-wizard-cave"

export interface Vec2 {
  x: number
  z: number
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface RectBounds {
  kind?: "rect"
  center: Vec3
  size: Vec3
}

export interface OrientedBounds {
  kind: "oriented"
  center: Vec3
  size: Vec3
  yawRadians: number
}

export type Bounds = RectBounds | OrientedBounds

export interface WorldBounds {
  min: Vec3
  max: Vec3
}

export interface LevelData {
  id: LevelId
  displayName: string
  kind: "overworld" | "interiorMiniLevel"

  bounds: WorldBounds
  elevationBands: ElevationBand[]

  terrainZones: TerrainZone[]
  walkableSurfaces: WalkableSurface[]
  collisionVolumes: CollisionVolume[]
  slopes: SlopeSurface[]
  climbSurfaces: ClimbSurface[]
  ledges: LedgeSurface[]
  waterZones: WaterZone[]

  paths: PathDefinition[]
  worldTransitions: WorldTransitionDefinition[]
  spawnPoints: SpawnPoint[]
  cameraZones: CameraZone[]

  collectibles: CollectibleDefinition[]
  questItems: QuestItemDefinition[]
  npcs: NPCDefinition[]
  signs: SignDefinition[]
  landmarks: LandmarkDefinition[]
  scatterZones: ScatterZone[]

  debug: LevelDebugMetadata
}

export interface ElevationBand {
  id: string
  label: string
  y: number
  tolerance: number
  gameplayRole:
    | "safeFlat"
    | "route"
    | "raisedLandmark"
    | "hazardFloor"
    | "goalPlateau"
    | "secretRoute"
  debugColor: string
}

export type TerrainZoneKind =
  | "flatField"
  | "broadPath"
  | "cliffMass"
  | "ledgeShelf"
  | "mound"
  | "riverChannel"
  | "bridge"
  | "steppingStonePocket"
  | "forecourt"
  | "museumBase"
  | "doorSeal"
  | "caveRoom"
  | "cavePlatform"
  | "secretShelf"

export type MaterialId =
  | "grass"
  | "pathDirt"
  | "cliffPath"
  | "cliffRock"
  | "caveStone"
  | "water"
  | "museumStone"
  | "wood"
  | "sealMagic"
  | "debug"

export interface TerrainZone {
  id: string
  label: string
  kind: TerrainZoneKind
  bounds: Bounds
  baseElevation: number
  visualHeight?: number
  materialId: MaterialId
  routeRole: "start" | "mainRoute" | "branchRoute" | "landmark" | "hazard" | "goal" | "secret"
  connectsTo: string[]
  debug: TerrainZoneDebug
}

export interface TerrainZoneDebug {
  color: string
  validateHasWalkableSurface?: boolean
  validateHasBlockingVolume?: boolean
  notes?: string
}

export type WalkableSurfaceKind =
  | "flatRect"
  | "orientedFlatRect"
  | "roundTop"
  | "polygon"
  | "generatedPathStrip"

export type SurfaceTag =
  | "ground"
  | "path"
  | "grass"
  | "stone"
  | "bridge"
  | "ledge"
  | "cave"
  | "museum"
  | "wizardPlatform"
  | "secret"
  | "steppingStone"

export interface WalkableSurface {
  id: string
  label: string
  kind: WalkableSurfaceKind
  zoneId: string
  center: Vec3
  size?: Vec3
  radius?: number
  polygonXZ?: Vec2[]
  yawRadians?: number
  y: number
  normal: Vec3
  surfaceTags: SurfaceTag[]
  maxStableSlopeDegrees: number
  landingRules: LandingRules
  debug: SurfaceDebug
}

export interface LandingRules {
  canLandFromAbove: boolean
  minDownwardVelocity?: number
  snapDistance: number
}

export interface SurfaceDebug {
  color: string
  showNormal?: boolean
}

export type CollisionVolumeKind =
  | "aabb"
  | "orientedBox"
  | "cylinder"
  | "wall"
  | "rail"
  | "doorBlocker"
  | "decorativeSolid"

export type CollisionTag =
  | "terrainWall"
  | "cliffWall"
  | "museumWall"
  | "bridgeRail"
  | "waterBoundary"
  | "door"
  | "prop"
  | "caveWall"

export interface CollisionVolume {
  id: string
  label: string
  kind: CollisionVolumeKind
  zoneId?: string
  center: Vec3
  size?: Vec3
  radius?: number
  height?: number
  yawRadians?: number
  collisionTags: CollisionTag[]
  response: "block" | "pushOut" | "softPush" | "triggerOnly"
  debug: CollisionDebug
}

export interface CollisionDebug {
  color: string
  visibleByDefault?: boolean
}

export interface SlopeSurface {
  id: string
  label: string
  zoneId: string
  start: Vec3
  end: Vec3
  width: number
  maxWalkableSlopeDegrees: number
  slopeDegrees: number
  surfaceTags: SurfaceTag[]
  connectFromSurfaceId: string
  connectToSurfaceId: string
  visual: {
    style: "ramp" | "naturalSlope" | "stoneStairApprox"
    materialId: MaterialId
  }
  debug: {
    color: string
    validateSlopeAngle: boolean
  }
}

export interface ClimbSurface {
  id: string
  label: string
  zoneId: string
  kind: "rootStep" | "mushroomStep" | "stoneShelf" | "shortWallHop"
  center: Vec3
  size: Vec3
  yawRadians?: number
  topY: number
  requiredJumpHeight: number
  connectsFrom: string[]
  connectsTo: string[]
  assist: "none" | "smallCoyoteTime" | "ledgeForgiveness" | "cameraAssistOnly"
  debug: {
    color: string
    showRouteIndex?: number
  }
}

export interface LedgeSurface {
  id: string
  label: string
  zoneId: string
  edgeStart: Vec3
  edgeEnd: Vec3
  topSurfaceId: string
  dropHeight: number
  behavior: "fallAllowed" | "softPrevent" | "railProtected" | "deathDrop"
  debug: {
    color: string
    validateDropHeight?: boolean
  }
}

export interface WaterZone {
  id: string
  label: string
  bounds: Bounds
  waterSurfaceY: number
  floorY: number
  behavior: "reset" | "pushBack" | "shallowSlow" | "visualOnly"
  resetSpawnId?: string
  pushDirection?: Vec3
  visual: {
    materialId: "water"
    ripple?: boolean
    opacity: number
  }
  debug: {
    color: string
    showResetPlane: boolean
  }
}

export interface PathDefinition {
  id: string
  label: string
  levelId: LevelId
  kind: "mainPath" | "branchPath" | "bridgeApproach" | "forecourtApproach" | "caveClimbRoute"
  points: Vec3[]
  width: {
    default: number
    samples?: PathWidthSample[]
  }
  elevationMode: "usePointY" | "projectToSurface" | "manualSlope"
  materialId: MaterialId
  generated: {
    createVisualRibbon: boolean
    createCollisionStrip: boolean
    createBeveledEdges: boolean
    createCoinTrail?: boolean
    createScatterAvoidance?: boolean
  }
  route: {
    fromZoneId: string
    toZoneId: string
    branchOfPathId?: string
    importance: "critical" | "optional" | "secret"
  }
  debug: {
    color: string
    showSpline: boolean
    showSamples: boolean
  }
}

export interface PathWidthSample {
  t: number
  width: number
}

export interface WorldTransitionDefinition {
  id: string
  label: string
  kind: "caveEntrance" | "caveExit" | "doorAttempt" | "debugWarp"
  trigger: {
    bounds: Bounds
    requireButtonPress?: boolean
    promptText?: string
  }
  fromLevelId: LevelId
  toLevelId: LevelId
  targetSpawnId: string
  transitionStyle: "instant" | "fadeToBlack" | "irisGlow" | "walkThroughDoor"
  requirements?: QuestRequirement[]
  debug: {
    color: string
    showTrigger: boolean
  }
}

export interface QuestRequirement {
  kind: "hasQuestFlag" | "hasCollectible" | "hasSpecialCoin"
  id: string
}

export interface CameraZone {
  id: string
  label: string
  bounds: Bounds
  priority: number
  mode:
    | "defaultFollow"
    | "longApproach"
    | "cliffClimb"
    | "waterCrossing"
    | "museumReveal"
    | "caveRoom"
    | "doorSeal"
  camera: {
    targetOffset: Vec3
    cameraOffset: Vec3
    fovDegrees: number
    followLerp: number
    lookLerp: number
    minDistance?: number
    maxDistance?: number
  }
  constraints?: {
    lockYaw?: number
    yawRange?: [number, number]
    preventWallClip?: boolean
  }
  debug: {
    color: string
    showBounds: boolean
  }
}

export interface SpawnPoint {
  id: string
  label: string
  levelId: LevelId
  position: Vec3
  yawRadians: number
  kind: "initial" | "checkpoint" | "returnFromCave" | "waterReset" | "debug"
  cameraZoneHint?: string
  debug: {
    color: string
  }
}

export type CollectibleKind = "coin" | "largeCoin" | "specialCoin" | "glowbudSeed" | "debugToken"

export interface CollectibleDefinition {
  id: string
  label: string
  levelId: LevelId
  kind: CollectibleKind
  position: Vec3
  routeHint?: string
  requiredForProgress?: boolean
  respawn: "never" | "onLevelReload" | "onCheckpointReset"
  value: number
  debug: {
    color: string
    group?: string
  }
}

export interface CollectibleTrailDefinition {
  id: string
  pathId: string
  kind: CollectibleKind
  count: number
  startT: number
  endT: number
  yOffset: number
  lateralOffset?: number
  pattern: "even" | "arc" | "breadcrumb" | "riskReward"
}

export interface QuestItemDefinition {
  id: string
  label: string
  levelId: LevelId
  kind: "wizardBlessing" | "museumSealKey" | "specialCoin" | "bridgeToken"
  source: "npcReward" | "collectible" | "doorInteraction" | "secretCache"
  grantsQuestFlag?: string
  debug: {
    color: string
  }
}

export interface NPCDefinition {
  id: string
  label: string
  levelId: LevelId
  kind: "glowbudWizard" | "museumDoorSpirit" | "signpostGuide" | "debugNpc"
  position: Vec3
  yawRadians: number
  interaction: {
    radius: number
    promptText: string
    grantsQuestFlag?: string
    requiredQuestFlag?: string
    dialogueId: string
  }
  debug: {
    color: string
  }
}

export interface SignDefinition {
  id: string
  label: string
  levelId: LevelId
  position: Vec3
  yawRadians: number
  textId: string
  signKind: "directional" | "lore" | "controlHint" | "debug"
  pointsToward?: string
  debug: {
    color: string
  }
}

export interface LandmarkDefinition {
  id: string
  label: string
  levelId: LevelId
  kind: "vistaRock" | "signHill" | "caveEntrance" | "bridge" | "museumDoor" | "forecourtStatue"
  position: Vec3
  silhouetteRadius: number
  visibleFromZoneIds: string[]
  debug: {
    color: string
    validateLineOfSight?: boolean
  }
}

export interface ScatterZone {
  id: string
  label: string
  levelId: LevelId
  bounds: Bounds
  surfaceY: number
  avoidPathIds?: string[]
  avoidZoneIds?: string[]
  scatterType: "grassTufts" | "smallRocks" | "flowers" | "mushrooms" | "roots" | "caveCrystals"
  density: number
  seed: number
  placementRules: {
    minDistanceFromPlayerRoute: number
    minDistanceBetweenInstances: number
    maxInstances: number
    alignToSurfaceNormal: boolean
    randomYaw: boolean
    randomScaleRange: [number, number]
  }
  debug: {
    color: string
    showCandidates?: boolean
  }
}

export interface LevelDebugMetadata {
  authoringVersion: number
  requiredValidation: {
    requireWalkableForTerrainZones: boolean
    requireColliderForSolidVisualZones: boolean
    requireSpawnInsideWalkableSurface: boolean
    requireCameraZoneCoverage: boolean
    requireTransitionTargets: boolean
  }
  debugToggles: {
    showTerrainZones: boolean
    showWalkableSurfaces: boolean
    showCollisionVolumes: boolean
    showTriggers: boolean
    showPathSplines: boolean
    showCameraZones: boolean
    showScatterZones: boolean
  }
  notes: string[]
}
