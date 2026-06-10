import type {
  Bounds,
  CollisionTag,
  CollisionVolume,
  CollisionVolumeKind,
  LandingRules,
  MaterialId,
  RectBounds,
  SlopeSurface,
  SurfaceTag,
  Vec3,
  WalkableSurface,
  WalkableSurfaceKind,
  WaterZone,
  WorldTransitionDefinition,
  LevelId,
  SpawnPoint,
} from "./levelTypes"

const DEFAULT_NORMAL: Vec3 = { x: 0, y: 1, z: 0 }

export function makeFlatSurface(params: {
  id: string
  label: string
  zoneId: string
  center: Vec3
  size: Vec3
  y?: number
  kind?: WalkableSurfaceKind
  yawRadians?: number
  surfaceTags?: SurfaceTag[]
  color?: string
  snapDistance?: number
}): WalkableSurface {
  return {
    id: params.id,
    label: params.label,
    kind: params.kind ?? (params.yawRadians === undefined ? "flatRect" : "orientedFlatRect"),
    zoneId: params.zoneId,
    center: params.center,
    size: params.size,
    yawRadians: params.yawRadians,
    y: params.y ?? params.center.y,
    normal: DEFAULT_NORMAL,
    surfaceTags: params.surfaceTags ?? ["ground"],
    maxStableSlopeDegrees: 35,
    landingRules: makeDefaultLandingRules(params.snapDistance),
    debug: {
      color: params.color ?? "#55cc66",
      showNormal: true,
    },
  }
}

export function makeRoundTopSurface(params: {
  id: string
  label: string
  zoneId: string
  center: Vec3
  radius: number
  y?: number
  surfaceTags?: SurfaceTag[]
  color?: string
  snapDistance?: number
}): WalkableSurface {
  return {
    id: params.id,
    label: params.label,
    kind: "roundTop",
    zoneId: params.zoneId,
    center: params.center,
    radius: params.radius,
    y: params.y ?? params.center.y,
    normal: DEFAULT_NORMAL,
    surfaceTags: params.surfaceTags ?? ["ground"],
    maxStableSlopeDegrees: 35,
    landingRules: makeDefaultLandingRules(params.snapDistance),
    debug: {
      color: params.color ?? "#b7a089",
      showNormal: true,
    },
  }
}

export function makeDefaultLandingRules(snapDistance = 0.08): LandingRules {
  return {
    canLandFromAbove: true,
    snapDistance,
  }
}

export function makeCollisionVolume(params: {
  id: string
  label: string
  kind?: CollisionVolumeKind
  zoneId?: string
  center: Vec3
  size?: Vec3
  radius?: number
  height?: number
  yawRadians?: number
  collisionTags?: CollisionTag[]
  response?: CollisionVolume["response"]
  color?: string
  visibleByDefault?: boolean
}): CollisionVolume {
  return {
    id: params.id,
    label: params.label,
    kind: params.kind ?? "aabb",
    zoneId: params.zoneId,
    center: params.center,
    size: params.size,
    radius: params.radius,
    height: params.height,
    yawRadians: params.yawRadians,
    collisionTags: params.collisionTags ?? ["terrainWall"],
    response: params.response ?? "block",
    debug: {
      color: params.color ?? "#ff5c5c",
      visibleByDefault: params.visibleByDefault ?? false,
    },
  }
}

export function makeSlopeSurface(params: {
  id: string
  label: string
  zoneId: string
  start: Vec3
  end: Vec3
  width: number
  slopeDegrees: number
  connectFromSurfaceId: string
  connectToSurfaceId: string
  materialId?: MaterialId
  color?: string
  surfaceTags?: SurfaceTag[]
}): SlopeSurface {
  return {
    id: params.id,
    label: params.label,
    zoneId: params.zoneId,
    start: params.start,
    end: params.end,
    width: params.width,
    maxWalkableSlopeDegrees: 35,
    slopeDegrees: params.slopeDegrees,
    surfaceTags: params.surfaceTags ?? ["ground", "path"],
    connectFromSurfaceId: params.connectFromSurfaceId,
    connectToSurfaceId: params.connectToSurfaceId,
    visual: {
      style: "naturalSlope",
      materialId: params.materialId ?? "pathDirt",
    },
    debug: {
      color: params.color ?? "#d19a4a",
      validateSlopeAngle: true,
    },
  }
}

export function makeWaterZone(params: {
  id: string
  label: string
  bounds: Bounds
  waterSurfaceY: number
  floorY: number
  resetSpawnId?: string
  behavior?: WaterZone["behavior"]
  opacity?: number
}): WaterZone {
  return {
    id: params.id,
    label: params.label,
    bounds: params.bounds,
    waterSurfaceY: params.waterSurfaceY,
    floorY: params.floorY,
    behavior: params.behavior ?? "reset",
    resetSpawnId: params.resetSpawnId,
    visual: {
      materialId: "water",
      ripple: true,
      opacity: params.opacity ?? 0.72,
    },
    debug: {
      color: "#3a8dff",
      showResetPlane: true,
    },
  }
}

export function makeTransition(params: {
  id: string
  label: string
  kind: WorldTransitionDefinition["kind"]
  fromLevelId: LevelId
  toLevelId: LevelId
  targetSpawnId: string
  bounds: RectBounds
  requireButtonPress?: boolean
  promptText?: string
  style?: WorldTransitionDefinition["transitionStyle"]
  color?: string
}): WorldTransitionDefinition {
  return {
    id: params.id,
    label: params.label,
    kind: params.kind,
    trigger: {
      bounds: params.bounds,
      requireButtonPress: params.requireButtonPress ?? true,
      promptText: params.promptText,
    },
    fromLevelId: params.fromLevelId,
    toLevelId: params.toLevelId,
    targetSpawnId: params.targetSpawnId,
    transitionStyle: params.style ?? "fadeToBlack",
    debug: {
      color: params.color ?? "#8a5cff",
      showTrigger: true,
    },
  }
}

export function makeSpawn(params: {
  id: string
  label: string
  levelId: LevelId
  position: Vec3
  yawRadians?: number
  kind?: SpawnPoint["kind"]
  cameraZoneHint?: string
  color?: string
}): SpawnPoint {
  return {
    id: params.id,
    label: params.label,
    levelId: params.levelId,
    position: params.position,
    yawRadians: params.yawRadians ?? 0,
    kind: params.kind ?? "checkpoint",
    cameraZoneHint: params.cameraZoneHint,
    debug: {
      color: params.color ?? "#ffffff",
    },
  }
}
