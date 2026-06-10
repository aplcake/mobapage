import type { LevelData } from "../levelTypes"
import {
  makeCollisionVolume,
  makeFlatSurface,
  makeSlopeSurface,
  makeSpawn,
  makeTransition,
} from "../collisionData"

export const glowbudWizardCaveSeed: LevelData = {
  id: "glowbud-wizard-cave",
  displayName: "Glowbud Wizard Cave",
  kind: "interiorMiniLevel",

  bounds: {
    min: { x: -18, y: -2, z: -12 },
    max: { x: 18, y: 10, z: 26 },
  },

  elevationBands: [
    { id: "cave-floor", label: "Cave Entry Floor", y: 0, tolerance: 0.05, gameplayRole: "safeFlat", debugColor: "#4f5a73" },
    { id: "cave-step-one", label: "Cave First Climb Step", y: 0.45, tolerance: 0.08, gameplayRole: "route", debugColor: "#68738e" },
    { id: "cave-step-two", label: "Cave Second Climb Step", y: 0.9, tolerance: 0.08, gameplayRole: "route", debugColor: "#7681a0" },
    { id: "wizard-platform", label: "Wizard Platform", y: 1.5, tolerance: 0.05, gameplayRole: "goalPlateau", debugColor: "#9a74ff" },
    { id: "secret-cache", label: "Secret Coin Cache", y: 1.8, tolerance: 0.05, gameplayRole: "secretRoute", debugColor: "#ffd84a" },
  ],

  terrainZones: [
    {
      id: "zone-cave-entry-floor",
      label: "Cave Entry Floor",
      kind: "caveRoom",
      bounds: { center: { x: 0, y: 0, z: -4 }, size: { x: 18, y: 1, z: 10 } },
      baseElevation: 0,
      materialId: "caveStone",
      routeRole: "start",
      connectsTo: ["zone-cave-main-climb-a", "zone-cave-exit-mouth"],
      debug: { color: "#536077", validateHasWalkableSurface: true, notes: "Safe arrival space. Exit trigger sits behind player." },
    },
    {
      id: "zone-cave-main-climb-a",
      label: "Cave Main Climb Step A",
      kind: "cavePlatform",
      bounds: { center: { x: -4, y: 0.45, z: 3 }, size: { x: 7, y: 1, z: 5 } },
      baseElevation: 0.45,
      materialId: "caveStone",
      routeRole: "mainRoute",
      connectsTo: ["zone-cave-entry-floor", "zone-cave-main-climb-b"],
      debug: { color: "#68738e", validateHasWalkableSurface: true },
    },
    {
      id: "zone-cave-main-climb-b",
      label: "Cave Main Climb Step B",
      kind: "cavePlatform",
      bounds: { center: { x: 3, y: 0.9, z: 9 }, size: { x: 7, y: 1, z: 5 } },
      baseElevation: 0.9,
      materialId: "caveStone",
      routeRole: "mainRoute",
      connectsTo: ["zone-cave-main-climb-a", "zone-cave-wizard-platform", "zone-cave-secret-route-a"],
      debug: { color: "#7681a0", validateHasWalkableSurface: true },
    },
    {
      id: "zone-cave-wizard-platform",
      label: "Elevated Glowbud Wizard Platform",
      kind: "cavePlatform",
      bounds: { center: { x: 0, y: 1.5, z: 17 }, size: { x: 10, y: 1, z: 8 } },
      baseElevation: 1.5,
      materialId: "caveStone",
      routeRole: "goal",
      connectsTo: ["zone-cave-main-climb-b", "zone-cave-secret-cache"],
      debug: { color: "#9a74ff", validateHasWalkableSurface: true, notes: "Primary cave objective area." },
    },
    {
      id: "zone-cave-secret-route-a",
      label: "Optional Hard Route Small Stone A",
      kind: "cavePlatform",
      bounds: { center: { x: 9, y: 0.8, z: 8 }, size: { x: 4, y: 1, z: 4 } },
      baseElevation: 0.8,
      materialId: "caveStone",
      routeRole: "secret",
      connectsTo: ["zone-cave-main-climb-b", "zone-cave-secret-route-b"],
      debug: { color: "#b78cff", validateHasWalkableSurface: true },
    },
    {
      id: "zone-cave-secret-route-b",
      label: "Optional Hard Route Small Stone B",
      kind: "cavePlatform",
      bounds: { center: { x: 11, y: 1.3, z: 14 }, size: { x: 3.5, y: 1, z: 3.5 } },
      baseElevation: 1.3,
      materialId: "caveStone",
      routeRole: "secret",
      connectsTo: ["zone-cave-secret-route-a", "zone-cave-secret-cache"],
      debug: { color: "#c9a0ff", validateHasWalkableSurface: true },
    },
    {
      id: "zone-cave-secret-cache",
      label: "Secret Coin Cache Shelf",
      kind: "secretShelf",
      bounds: { center: { x: 8, y: 1.8, z: 19 }, size: { x: 5, y: 1, z: 4 } },
      baseElevation: 1.8,
      materialId: "caveStone",
      routeRole: "secret",
      connectsTo: ["zone-cave-secret-route-b", "zone-cave-wizard-platform"],
      debug: { color: "#ffd84a", validateHasWalkableSurface: true, notes: "Optional secret cache. Not required for progress." },
    },
    {
      id: "zone-cave-exit-mouth",
      label: "Cave Exit Mouth",
      kind: "ledgeShelf",
      bounds: { center: { x: 0, y: 0, z: -10 }, size: { x: 9, y: 2, z: 3 } },
      baseElevation: 0,
      materialId: "caveStone",
      routeRole: "mainRoute",
      connectsTo: ["zone-cave-entry-floor"],
      debug: { color: "#8a5cff", notes: "Return trigger to overworld." },
    },
  ],

  walkableSurfaces: [
    makeFlatSurface({ id: "surface-cave-entry-floor", label: "Cave Entry Floor Surface", zoneId: "zone-cave-entry-floor", center: { x: 0, y: 0, z: -4 }, size: { x: 18, y: 0.1, z: 10 }, surfaceTags: ["ground", "cave"], color: "#536077" }),
    makeFlatSurface({ id: "surface-cave-main-terrace-01", label: "Cave Main Climb Terrace 01", zoneId: "zone-cave-main-climb-a", center: { x: 0, y: 0.15, z: 0 }, size: { x: 12, y: 0.1, z: 2.4 }, surfaceTags: ["ground", "cave", "path"], color: "#657089", snapDistance: 0.16 }),
    makeFlatSurface({ id: "surface-cave-main-terrace-02", label: "Cave Main Climb Terrace 02", zoneId: "zone-cave-main-climb-a", center: { x: 0, y: 0.3, z: 2 }, size: { x: 12, y: 0.1, z: 2.4 }, surfaceTags: ["ground", "cave", "path"], color: "#6c7791", snapDistance: 0.16 }),
    makeFlatSurface({ id: "surface-cave-main-terrace-03", label: "Cave Main Climb Terrace 03", zoneId: "zone-cave-main-climb-a", center: { x: 0, y: 0.45, z: 4 }, size: { x: 12, y: 0.1, z: 2.4 }, surfaceTags: ["ground", "cave", "path"], color: "#727c98", snapDistance: 0.16 }),
    makeFlatSurface({ id: "surface-cave-main-terrace-04", label: "Cave Main Climb Terrace 04", zoneId: "zone-cave-main-climb-b", center: { x: 0, y: 0.6, z: 6 }, size: { x: 12, y: 0.1, z: 2.4 }, surfaceTags: ["ground", "cave", "path"], color: "#78829f", snapDistance: 0.16 }),
    makeFlatSurface({ id: "surface-cave-main-terrace-05", label: "Cave Main Climb Terrace 05", zoneId: "zone-cave-main-climb-b", center: { x: 0, y: 0.75, z: 8 }, size: { x: 12, y: 0.1, z: 2.4 }, surfaceTags: ["ground", "cave", "path"], color: "#7e87a7", snapDistance: 0.16 }),
    makeFlatSurface({ id: "surface-cave-main-terrace-06", label: "Cave Main Climb Terrace 06", zoneId: "zone-cave-main-climb-b", center: { x: 0, y: 0.9, z: 10 }, size: { x: 12, y: 0.1, z: 2.4 }, surfaceTags: ["ground", "cave", "path"], color: "#858cb0", snapDistance: 0.16 }),
    makeFlatSurface({ id: "surface-cave-main-terrace-07", label: "Cave Main Climb Terrace 07", zoneId: "zone-cave-wizard-platform", center: { x: 0, y: 1.05, z: 12 }, size: { x: 12, y: 0.1, z: 2.4 }, surfaceTags: ["ground", "cave", "path"], color: "#8b8fbb", snapDistance: 0.16 }),
    makeFlatSurface({ id: "surface-cave-main-terrace-08", label: "Cave Main Climb Terrace 08", zoneId: "zone-cave-wizard-platform", center: { x: 0, y: 1.2, z: 14 }, size: { x: 12, y: 0.1, z: 2.4 }, surfaceTags: ["ground", "cave", "path"], color: "#9292c7", snapDistance: 0.16 }),
    makeFlatSurface({ id: "surface-cave-main-terrace-09", label: "Cave Main Climb Terrace 09", zoneId: "zone-cave-wizard-platform", center: { x: 0, y: 1.35, z: 16 }, size: { x: 12, y: 0.1, z: 2.4 }, surfaceTags: ["ground", "cave", "path", "wizardPlatform"], color: "#9994d5", snapDistance: 0.16 }),
    makeFlatSurface({ id: "surface-cave-main-climb-a", label: "Cave Main Climb Step A Surface", zoneId: "zone-cave-main-climb-a", center: { x: -4, y: 0.45, z: 4 }, size: { x: 7, y: 0.1, z: 2 }, surfaceTags: ["ground", "cave", "ledge"], color: "#68738e" }),
    makeFlatSurface({ id: "surface-cave-main-climb-b", label: "Cave Main Climb Step B Surface", zoneId: "zone-cave-main-climb-b", center: { x: 3, y: 0.9, z: 10.4 }, size: { x: 7, y: 0.1, z: 2.8 }, surfaceTags: ["ground", "cave", "ledge"], color: "#7681a0" }),
    makeFlatSurface({ id: "surface-cave-wizard-platform", label: "Glowbud Wizard Platform Surface", zoneId: "zone-cave-wizard-platform", center: { x: 0, y: 1.5, z: 18 }, size: { x: 10, y: 0.1, z: 6 }, surfaceTags: ["ground", "cave", "wizardPlatform"], color: "#9a74ff" }),
    makeFlatSurface({ id: "surface-cave-secret-route-a", label: "Secret Route Stone A", zoneId: "zone-cave-secret-route-a", center: { x: 9, y: 0.8, z: 8 }, size: { x: 4, y: 0.1, z: 4 }, surfaceTags: ["ground", "cave", "secret"], color: "#b78cff" }),
    makeFlatSurface({ id: "surface-cave-secret-route-b", label: "Secret Route Stone B", zoneId: "zone-cave-secret-route-b", center: { x: 11, y: 1.3, z: 14 }, size: { x: 3.5, y: 0.1, z: 3.5 }, surfaceTags: ["ground", "cave", "secret"], color: "#c9a0ff" }),
    makeFlatSurface({ id: "surface-cave-secret-cache-lip", label: "Secret Cache Narrow Lip", zoneId: "zone-cave-secret-cache", center: { x: 5.6, y: 1.65, z: 18.6 }, size: { x: 2.4, y: 0.1, z: 2.8 }, surfaceTags: ["ground", "cave", "secret"], color: "#d8b6ff", snapDistance: 0.16 }),
    makeFlatSurface({ id: "surface-cave-secret-cache", label: "Secret Coin Cache Surface", zoneId: "zone-cave-secret-cache", center: { x: 8, y: 1.8, z: 19 }, size: { x: 5, y: 0.1, z: 4 }, surfaceTags: ["ground", "cave", "secret"], color: "#ffd84a" }),
  ],

  collisionVolumes: [
    makeCollisionVolume({ id: "volume-cave-back-wall", label: "Cave Back Wall", kind: "wall", zoneId: "zone-cave-wizard-platform", center: { x: 0, y: 4, z: 23 }, size: { x: 34, y: 9, z: 1 }, collisionTags: ["caveWall"], color: "#374052" }),
    makeCollisionVolume({ id: "volume-cave-left-wall", label: "Cave Left Wall", kind: "wall", zoneId: "zone-cave-entry-floor", center: { x: -17, y: 4, z: 7 }, size: { x: 1, y: 9, z: 34 }, collisionTags: ["caveWall"], color: "#374052" }),
    makeCollisionVolume({ id: "volume-cave-right-wall", label: "Cave Right Wall", kind: "wall", zoneId: "zone-cave-entry-floor", center: { x: 17, y: 4, z: 7 }, size: { x: 1, y: 9, z: 34 }, collisionTags: ["caveWall"], color: "#374052" }),
    makeCollisionVolume({ id: "volume-cave-entry-side-blocker", label: "Cave Entry Side Blocker", kind: "wall", zoneId: "zone-cave-exit-mouth", center: { x: 0, y: 3, z: -12 }, size: { x: 34, y: 7, z: 1 }, collisionTags: ["caveWall"], color: "#374052" }),
  ],

  slopes: [
    makeSlopeSurface({ id: "slope-cave-main-climb-spine", label: "Cave Main Climb Spine", zoneId: "zone-cave-wizard-platform", start: { x: 0, y: 0, z: -1 }, end: { x: 0, y: 1.5, z: 17 }, width: 13, slopeDegrees: 8.2, connectFromSurfaceId: "surface-cave-entry-floor", connectToSurfaceId: "surface-cave-wizard-platform", materialId: "caveStone", color: "#8a7cff", surfaceTags: ["ground", "cave", "path", "wizardPlatform"] }),
    makeSlopeSurface({ id: "slope-cave-entry-to-step-a", label: "Entry Floor to Step A Ramp", zoneId: "zone-cave-main-climb-a", start: { x: -1.5, y: 0, z: -0.5 }, end: { x: -4, y: 0.45, z: 3 }, width: 7, slopeDegrees: 12, connectFromSurfaceId: "surface-cave-entry-floor", connectToSurfaceId: "surface-cave-main-climb-a", materialId: "caveStone", color: "#68738e", surfaceTags: ["ground", "cave", "path"] }),
    makeSlopeSurface({ id: "slope-cave-step-a-to-step-b", label: "Step A to Step B Ramp", zoneId: "zone-cave-main-climb-b", start: { x: -2, y: 0.45, z: 4.5 }, end: { x: 3, y: 0.9, z: 9.5 }, width: 9, slopeDegrees: 7, connectFromSurfaceId: "surface-cave-main-climb-a", connectToSurfaceId: "surface-cave-main-climb-b", materialId: "caveStone", color: "#7681a0", surfaceTags: ["ground", "cave", "path"] }),
    makeSlopeSurface({ id: "slope-cave-step-b-to-wizard-platform", label: "Step B to Wizard Platform Ramp", zoneId: "zone-cave-wizard-platform", start: { x: 2, y: 0.9, z: 11 }, end: { x: 0, y: 1.5, z: 15.5 }, width: 9, slopeDegrees: 12, connectFromSurfaceId: "surface-cave-main-climb-b", connectToSurfaceId: "surface-cave-wizard-platform", materialId: "caveStone", color: "#9a74ff", surfaceTags: ["ground", "cave", "path", "wizardPlatform"] }),
    makeSlopeSurface({ id: "slope-cave-secret-route-to-cache", label: "Optional Secret Cache Ramp", zoneId: "zone-cave-secret-cache", start: { x: 9, y: 0.8, z: 9 }, end: { x: 8, y: 1.8, z: 18 }, width: 3.2, slopeDegrees: 11, connectFromSurfaceId: "surface-cave-secret-route-a", connectToSurfaceId: "surface-cave-secret-cache", materialId: "caveStone", color: "#ffd84a", surfaceTags: ["ground", "cave", "secret"] }),
  ],

  climbSurfaces: [
    { id: "climb-cave-step-a", label: "Entry to Step A", zoneId: "zone-cave-main-climb-a", kind: "stoneShelf", center: { x: -4, y: 0.45, z: 3 }, size: { x: 7, y: 0.4, z: 5 }, topY: 0.45, requiredJumpHeight: 0.8, connectsFrom: ["surface-cave-entry-floor"], connectsTo: ["surface-cave-main-climb-a"], assist: "smallCoyoteTime", debug: { color: "#68738e", showRouteIndex: 1 } },
    { id: "climb-cave-step-b", label: "Step A to Step B", zoneId: "zone-cave-main-climb-b", kind: "stoneShelf", center: { x: 3, y: 0.9, z: 9 }, size: { x: 7, y: 0.4, z: 5 }, topY: 0.9, requiredJumpHeight: 0.9, connectsFrom: ["surface-cave-main-climb-a"], connectsTo: ["surface-cave-main-climb-b"], assist: "smallCoyoteTime", debug: { color: "#7681a0", showRouteIndex: 2 } },
    { id: "climb-cave-wizard-platform", label: "Step B to Wizard Platform", zoneId: "zone-cave-wizard-platform", kind: "stoneShelf", center: { x: 0, y: 1.5, z: 17 }, size: { x: 10, y: 0.4, z: 8 }, topY: 1.5, requiredJumpHeight: 1.0, connectsFrom: ["surface-cave-main-climb-b"], connectsTo: ["surface-cave-wizard-platform"], assist: "ledgeForgiveness", debug: { color: "#9a74ff", showRouteIndex: 3 } },
  ],

  ledges: [
    { id: "ledge-cave-wizard-platform-front", label: "Wizard Platform Front Drop", zoneId: "zone-cave-wizard-platform", edgeStart: { x: -5, y: 1.5, z: 13 }, edgeEnd: { x: 5, y: 1.5, z: 13 }, topSurfaceId: "surface-cave-wizard-platform", dropHeight: 1.2, behavior: "fallAllowed", debug: { color: "#9a74ff", validateDropHeight: true } },
  ],

  waterZones: [],

  paths: [],

  worldTransitions: [
    makeTransition({ id: "transition-cave-to-overworld", label: "Exit Cave", kind: "caveExit", fromLevelId: "glowbud-wizard-cave", toLevelId: "option-d-overworld", targetSpawnId: "spawn-return-from-cave", bounds: { center: { x: 0, y: 1, z: -7.5 }, size: { x: 9, y: 4, z: 5 } }, requireButtonPress: true, promptText: "Return Outside" }),
  ],

  spawnPoints: [
    makeSpawn({ id: "spawn-cave-entry", label: "Cave Entry Spawn", levelId: "glowbud-wizard-cave", position: { x: 0, y: 0.6, z: -7 }, kind: "initial", cameraZoneHint: "camera-zone-cave-room", color: "#8a5cff" }),
  ],

  cameraZones: [
    { id: "camera-zone-cave-room", label: "Cave Room Camera", bounds: { center: { x: 0, y: 4, z: 7 }, size: { x: 36, y: 14, z: 38 } }, priority: 10, mode: "caveRoom", camera: { targetOffset: { x: 0, y: 2, z: 4 }, cameraOffset: { x: 0, y: 8, z: -12 }, fovDegrees: 45, followLerp: 0.1, lookLerp: 0.14 }, constraints: { preventWallClip: true }, debug: { color: "#8a5cff", showBounds: true } },
  ],

  collectibles: [
    { id: "coin-cave-entry-01", label: "Cave Entry Coin 01", levelId: "glowbud-wizard-cave", kind: "coin", position: { x: -3, y: 0.85, z: -2 }, routeHint: "cave-entry", respawn: "never", value: 1, debug: { color: "#ffd84a", group: "cave-main" } },
    { id: "coin-cave-climb-01", label: "Cave Climb Coin 01", levelId: "glowbud-wizard-cave", kind: "coin", position: { x: 0, y: 1.35, z: 7 }, routeHint: "cave-main-climb", respawn: "never", value: 1, debug: { color: "#ffd84a", group: "cave-main" } },
    { id: "coin-cave-wizard-platform-01", label: "Wizard Platform Coin 01", levelId: "glowbud-wizard-cave", kind: "largeCoin", position: { x: -3.5, y: 2.3, z: 18 }, routeHint: "wizard-platform", respawn: "never", value: 3, debug: { color: "#ffef8a", group: "cave-main" } },
    { id: "coin-cave-secret-cache-special", label: "Secret Cache Special Coin", levelId: "glowbud-wizard-cave", kind: "specialCoin", position: { x: 8, y: 2.55, z: 19 }, routeHint: "secret-cache", requiredForProgress: false, respawn: "never", value: 10, debug: { color: "#9aff8a", group: "optional-secret" } },
  ],

  questItems: [
    { id: "quest-item-wizard-blessing", label: "Wizard Blessing", levelId: "glowbud-wizard-cave", kind: "wizardBlessing", source: "npcReward", grantsQuestFlag: "metGlowbudWizard", debug: { color: "#9aff8a" } },
    { id: "quest-item-secret-cache-coin", label: "Secret Cache Coin Mark", levelId: "glowbud-wizard-cave", kind: "specialCoin", source: "secretCache", grantsQuestFlag: "foundSecretCaveCoin", debug: { color: "#ffd84a" } },
  ],

  npcs: [
    { id: "npc-glowbud-wizard", label: "Glowbud Wizard", levelId: "glowbud-wizard-cave", kind: "glowbudWizard", position: { x: 2.6, y: 2.1, z: 18.2 }, yawRadians: -0.7, interaction: { radius: 3.2, promptText: "Glowbud Wizard: mark blessing", grantsQuestFlag: "metGlowbudWizard", dialogueId: "glowbud-wizard-simple" }, debug: { color: "#9aff8a" } },
  ],

  signs: [
    { id: "sign-cave-exit", label: "Cave Exit Sign", levelId: "glowbud-wizard-cave", position: { x: -4.8, y: 0.35, z: -6.2 }, yawRadians: 0.55, textId: "sign-cave-exit", signKind: "directional", pointsToward: "transition-cave-to-overworld", debug: { color: "#70d6ff" } },
    { id: "sign-wizard-platform", label: "Wizard Platform Sign", levelId: "glowbud-wizard-cave", position: { x: -4, y: 1.9, z: 16.2 }, yawRadians: 0.2, textId: "sign-wizard-platform", signKind: "lore", pointsToward: "npc-glowbud-wizard", debug: { color: "#9a74ff" } },
  ],

  landmarks: [],

  scatterZones: [
    { id: "scatter-cave-crystals-entry", label: "Cave Entry Crystal Scatter", levelId: "glowbud-wizard-cave", bounds: { center: { x: -8, y: 0, z: 2 }, size: { x: 8, y: 1, z: 10 } }, surfaceY: 0.08, scatterType: "caveCrystals", density: 0.18, seed: 401, placementRules: { minDistanceFromPlayerRoute: 2.4, minDistanceBetweenInstances: 1.4, maxInstances: 18, alignToSurfaceNormal: true, randomYaw: true, randomScaleRange: [0.6, 1.25] }, debug: { color: "#86f0ff", showCandidates: false } },
    { id: "scatter-cave-mushrooms-cache", label: "Secret Cache Mushroom Scatter", levelId: "glowbud-wizard-cave", bounds: { center: { x: 6.8, y: 1.8, z: 20 }, size: { x: 8, y: 1, z: 5 } }, surfaceY: 1.86, scatterType: "mushrooms", density: 0.16, seed: 402, placementRules: { minDistanceFromPlayerRoute: 1.5, minDistanceBetweenInstances: 1.1, maxInstances: 10, alignToSurfaceNormal: true, randomYaw: true, randomScaleRange: [0.65, 1.1] }, debug: { color: "#9a74ff", showCandidates: false } },
  ],

  debug: {
    authoringVersion: 1,
    requiredValidation: {
      requireWalkableForTerrainZones: true,
      requireColliderForSolidVisualZones: true,
      requireSpawnInsideWalkableSurface: true,
      requireCameraZoneCoverage: true,
      requireTransitionTargets: true,
    },
    debugToggles: {
      showTerrainZones: true,
      showWalkableSurfaces: true,
      showCollisionVolumes: true,
      showTriggers: true,
      showPathSplines: false,
      showCameraZones: true,
      showScatterZones: false,
    },
    notes: [
      "Cave is one-room and readable.",
      "Secret route is optional and not required for core progression.",
      "Package 09 adds simple collectibles, wizard flag interaction, and signs without dialogue trees.",
      "Package 11 scatter remains decorative and does not alter traversal collision.",
    ],
  },
}
