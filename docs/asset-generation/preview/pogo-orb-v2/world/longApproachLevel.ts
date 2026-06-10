import { THREE } from '@/render/threeRuntime'

export const LONG_APPROACH_MODEL = 'option-d-long-approach-v1'
export const FLOOR_Y = -2.075
export const ROOM_LIMIT = 1320
export const CONTROL_BOUNDS = {
  minX: -1520,
  maxX: 1320,
  minZ: -1440,
  maxZ: 820,
} as const
export const NATURAL_BOUNDARY = {
  minX: CONTROL_BOUNDS.minX + 86,
  maxX: CONTROL_BOUNDS.maxX - 86,
  minZ: CONTROL_BOUNDS.minZ + 86,
  maxZ: CONTROL_BOUNDS.maxZ - 86,
  visualWidth: 250,
  shoulderWidth: 620,
  peakHeight: 104,
  shoulderHeight: 42,
} as const
export const START_POSITION = new THREE.Vector3(-338, 0, 276)
export const MUSEUM_HILL_START_Z = -176
export const MUSEUM_HILL_TOP_Z = -610
export const MUSEUM_HILL_CENTER_X = 520
export const MUSEUM_HILL_HALF_WIDTH = 292
export const MUSEUM_HILL_HEIGHT = 94
export const TRAIN_STATION_X = 72
export const TRAIN_STATION_Z = 656
export const TRAIN_TRACK_Z = 714

export const BEACH_LOUNGE_CHAIRS = [
  { id: 'main', x: -478, z: -252, yaw: -2.3, height: 14.7, halfX: 38, halfZ: 18 },
  { id: 'side', x: -522, z: -304, yaw: -1.86, height: 14.45, halfX: 35, halfZ: 18 },
] as const

export const PALETTE = {
  ink: '#17121f',
  grass: '#4fae3f',
  grassDeep: '#246b31',
  grassLight: '#83cf58',
  grassHigh: '#2f8e3b',
  path: '#d79b55',
  pathWarm: '#f2cf87',
  pathEdge: '#815c36',
  pathShadow: '#65472f',
  pathDot: '#fff1b6',
  hiddenPath: '#be7447',
  hiddenPathDot: '#ffdfa1',
  scenicPath: '#bdd99e',
  scenicPathDot: '#f2ffd6',
  beach: '#e6c571',
  beachLight: '#ffe5a4',
  beachWet: '#b89554',
  beachShadow: '#8f7441',
  caveRock: '#5f625e',
  caveRockLight: '#94928a',
  caveMoss: '#617f4c',
  glowPurple: '#b36dff',
  museumCream: '#efe1ba',
  museumMauve: '#a67a90',
  museumTeak: '#c77937',
  museumTeakDark: '#7d4427',
  museumGlass: '#91bed0',
  museumDoor: '#2a2144',
  lakeDeep: '#20728b',
  lake: '#32a7cf',
  lakeLight: '#84ddf2',
  lakeCelDark: '#0f697c',
  lakeCelMid: '#188aa2',
  lakeCelBright: '#49c4d8',
  lakeInk: '#0b5265',
  lakeShore: '#b69a58',
  lakeWetGrass: '#397c42',
} as const

export type PathPoint = {
  id: string
  x: number
  z: number
  radius: number
}

const NORTHWEST_LAKE_ANCHOR_POINTS: PathPoint[] = [
  { id: 'lake-northwest-crest', x: -1110, z: -1360, radius: 18 },
  { id: 'lake-far-back-bay', x: -1378, z: -1278, radius: 18 },
  { id: 'lake-west-bay', x: -1498, z: -1022, radius: 18 },
  { id: 'lake-west-reed-bank', x: -1458, z: -744, radius: 18 },
  { id: 'lake-low-bank', x: -1292, z: -526, radius: 18 },
  { id: 'lake-soft-front', x: -1010, z: -354, radius: 18 },
  { id: 'lake-front-marsh', x: -644, z: -286, radius: 18 },
  { id: 'lake-front-right-bank', x: -258, z: -386, radius: 18 },
  { id: 'lake-east-cove', x: -36, z: -610, radius: 18 },
  { id: 'lake-east-shoulder', x: -52, z: -904, radius: 18 },
  { id: 'lake-backwater-elbow', x: -280, z: -1168, radius: 18 },
  { id: 'lake-deep-curve', x: -646, z: -1342, radius: 18 },
  { id: 'lake-northwest-close', x: -1110, z: -1360, radius: 18 },
]

function smoothClosedPath(points: PathPoint[], iterations: number) {
  let openPoints = points.slice(0, -1)
  for (let pass = 0; pass < iterations; pass += 1) {
    const nextPoints: PathPoint[] = []
    for (let index = 0; index < openPoints.length; index += 1) {
      const current = openPoints[index]
      const next = openPoints[(index + 1) % openPoints.length]
      nextPoints.push({
        id: `${current.id}-smooth-${pass}-a`,
        x: current.x * 0.75 + next.x * 0.25,
        z: current.z * 0.75 + next.z * 0.25,
        radius: current.radius,
      })
      nextPoints.push({
        id: `${current.id}-smooth-${pass}-b`,
        x: current.x * 0.25 + next.x * 0.75,
        z: current.z * 0.25 + next.z * 0.75,
        radius: current.radius,
      })
    }
    openPoints = nextPoints
  }

  return [
    ...openPoints,
    {
      ...openPoints[0],
      id: `${openPoints[0].id}-close`,
    },
  ]
}

export const NORTHWEST_LAKE_POINTS: PathPoint[] = smoothClosedPath(NORTHWEST_LAKE_ANCHOR_POINTS, 3)

export const NORTHWEST_LAKE_CENTER = { x: -790, z: -852 }
export const WATER_BLOCKER_BUFFER = 2.8

export type LevelSurface = {
  id: string
  label: string
  kind: 'path' | 'step' | 'cave' | 'forecourt' | 'prop'
  shape: 'box' | 'circle'
  x: number
  z: number
  halfX: number
  halfZ: number
  radius?: number
  yaw?: number
  height: number
  color: string
  topColor: string
}

function smootherstep01(value: number) {
  const t = Math.min(1, Math.max(0, value))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function plateauFalloff(distance: number, plateauRadius: number, falloffRadius: number) {
  if (distance <= plateauRadius) return 1
  return smootherstep01(1 - (distance - plateauRadius) / Math.max(1, falloffRadius - plateauRadius))
}

export function getMuseumHillHeight(x: number, z: number) {
  const approachProgress = smootherstep01((MUSEUM_HILL_START_Z - z) / (MUSEUM_HILL_START_Z - MUSEUM_HILL_TOP_Z))
  const centerDrift = 400 + approachProgress * 120
  const terrace = smootherstep01((approachProgress - 0.6) / 0.26)
  const distanceFromCenter = Math.abs(x - centerDrift)
  const broadWidth = 460 + terrace * 280
  const outerWidth = MUSEUM_HILL_HALF_WIDTH + 600 + terrace * 220
  const centralMound = Math.exp(-Math.pow(distanceFromCenter / broadWidth, 1.65))
  const broadShoulder = 0.12 * plateauFalloff(distanceFromCenter, broadWidth * 0.72, outerWidth)
  const lateralFalloff = Math.min(1, centralMound + broadShoulder)
  const rollingShoulder = Math.sin(approachProgress * Math.PI) * 3.6 * lateralFalloff
  const sideUndulation = Math.sin((x * 0.006 + z * 0.004) + approachProgress * 2.2) * 1.25 * lateralFalloff * (1 - terrace * 0.35)
  return MUSEUM_HILL_HEIGHT * approachProgress * lateralFalloff + rollingShoulder + sideUndulation
}

function radialRise(x: number, z: number, centerX: number, centerZ: number, radius: number, height: number) {
  const distance = Math.hypot(x - centerX, z - centerZ)
  return smootherstep01(1 - distance / radius) * height
}

function ovalRise(x: number, z: number, centerX: number, centerZ: number, radiusX: number, radiusZ: number, height: number) {
  const dx = (x - centerX) / radiusX
  const dz = (z - centerZ) / radiusZ
  const distance = Math.hypot(dx, dz)
  return smootherstep01(1 - distance) * height
}

function getBoundaryEdgeWeights(x: number, z: number) {
  return {
    left: smootherstep01((NATURAL_BOUNDARY.minX + NATURAL_BOUNDARY.visualWidth - x) / NATURAL_BOUNDARY.visualWidth),
    right: smootherstep01((x - (NATURAL_BOUNDARY.maxX - NATURAL_BOUNDARY.visualWidth)) / NATURAL_BOUNDARY.visualWidth),
    back: smootherstep01((NATURAL_BOUNDARY.minZ + NATURAL_BOUNDARY.visualWidth - z) / NATURAL_BOUNDARY.visualWidth),
    front: smootherstep01((z - (NATURAL_BOUNDARY.maxZ - NATURAL_BOUNDARY.visualWidth)) / NATURAL_BOUNDARY.visualWidth),
  }
}

function getBoundaryShoulderWeights(x: number, z: number) {
  return {
    left: smootherstep01((NATURAL_BOUNDARY.minX + NATURAL_BOUNDARY.shoulderWidth - x) / NATURAL_BOUNDARY.shoulderWidth),
    right: smootherstep01((x - (NATURAL_BOUNDARY.maxX - NATURAL_BOUNDARY.shoulderWidth)) / NATURAL_BOUNDARY.shoulderWidth),
    back: smootherstep01((NATURAL_BOUNDARY.minZ + NATURAL_BOUNDARY.shoulderWidth - z) / NATURAL_BOUNDARY.shoulderWidth),
    front: smootherstep01((z - (NATURAL_BOUNDARY.maxZ - NATURAL_BOUNDARY.shoulderWidth)) / NATURAL_BOUNDARY.shoulderWidth),
  }
}

export function getBoundaryHillHeight(x: number, z: number) {
  const weights = getBoundaryEdgeWeights(x, z)
  const shoulderWeights = getBoundaryShoulderWeights(x, z)
  const edge = Math.max(weights.left, weights.right, weights.back, weights.front)
  const shoulder = Math.max(shoulderWeights.left, shoulderWeights.right, shoulderWeights.back, shoulderWeights.front)
  if (shoulder <= 0) return 0

  const cornerMass = Math.min(1, shoulderWeights.left + shoulderWeights.right + shoulderWeights.back + shoulderWeights.front - shoulder)
  const foothill = Math.pow(shoulder, 1.35) * (1 - edge * 0.35)
  const organicRoll = (Math.sin(x * 0.007 + z * 0.004) + Math.sin(x * -0.004 + z * 0.009 + 2.15) * 0.55) * 5.2
  const ridgeBreak = (Math.sin(x * 0.018 + z * 0.011 + 0.6) + Math.sin(x * -0.014 + z * 0.017 + 1.2) * 0.45) * 4.8
  const lakeLandMask = smootherstep01((signedDistanceToLake(x, z) + 44) / 130)
  const ridge = foothill * NATURAL_BOUNDARY.shoulderHeight + edge * 14 + Math.pow(edge, 2.15) * NATURAL_BOUNDARY.peakHeight + Math.pow(cornerMass, 0.8) * 24
  return Math.max(0, (ridge + organicRoll * shoulder + ridgeBreak * edge) * lakeLandMask)
}

export function getNaturalBoundaryPush(x: number, z: number, radius: number) {
  const leftPenetration = NATURAL_BOUNDARY.minX + radius - x
  const rightPenetration = x - (NATURAL_BOUNDARY.maxX - radius)
  const backPenetration = NATURAL_BOUNDARY.minZ + radius - z
  const frontPenetration = z - (NATURAL_BOUNDARY.maxZ - radius)
  let pushX = 0
  let pushZ = 0

  if (leftPenetration > 0) pushX += leftPenetration
  if (rightPenetration > 0) pushX -= rightPenetration
  if (backPenetration > 0) pushZ += backPenetration
  if (frontPenetration > 0) pushZ -= frontPenetration

  const penetration = Math.hypot(pushX, pushZ)
  if (penetration <= 0.0001) return undefined

  return {
    normalX: pushX / penetration,
    normalZ: pushZ / penetration,
    penetration,
  }
}

function distanceToSegment(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const segmentX = bx - ax
  const segmentZ = bz - az
  const lengthSq = segmentX * segmentX + segmentZ * segmentZ
  if (lengthSq <= 0.0001) return Math.hypot(x - ax, z - az)

  const t = Math.min(1, Math.max(0, ((x - ax) * segmentX + (z - az) * segmentZ) / lengthSq))
  return Math.hypot(x - (ax + segmentX * t), z - (az + segmentZ * t))
}

export function signedDistanceToLake(x: number, z: number) {
  let inside = false
  let closest = Infinity

  for (let index = 0, previous = NORTHWEST_LAKE_POINTS.length - 1; index < NORTHWEST_LAKE_POINTS.length; previous = index, index += 1) {
    const current = NORTHWEST_LAKE_POINTS[index]
    const last = NORTHWEST_LAKE_POINTS[previous]
    const intersects = current.z > z !== last.z > z && x < ((last.x - current.x) * (z - current.z)) / (last.z - current.z + 0.000001) + current.x
    if (intersects) inside = !inside

    closest = Math.min(closest, distanceToSegment(x, z, current.x, current.z, last.x, last.z))
  }

  return inside ? -closest : closest
}

export function getLakeBoundaryPush(x: number, z: number, radius: number) {
  let inside = false
  let closest = Infinity
  let closestX = NORTHWEST_LAKE_CENTER.x
  let closestZ = NORTHWEST_LAKE_CENTER.z

  for (let index = 0, previous = NORTHWEST_LAKE_POINTS.length - 1; index < NORTHWEST_LAKE_POINTS.length; previous = index, index += 1) {
    const current = NORTHWEST_LAKE_POINTS[index]
    const last = NORTHWEST_LAKE_POINTS[previous]
    const intersects = current.z > z !== last.z > z && x < ((last.x - current.x) * (z - current.z)) / (last.z - current.z + 0.000001) + current.x
    if (intersects) inside = !inside

    const segmentX = last.x - current.x
    const segmentZ = last.z - current.z
    const lengthSq = segmentX * segmentX + segmentZ * segmentZ
    const t = lengthSq <= 0.0001 ? 0 : Math.min(1, Math.max(0, ((x - current.x) * segmentX + (z - current.z) * segmentZ) / lengthSq))
    const candidateX = current.x + segmentX * t
    const candidateZ = current.z + segmentZ * t
    const distance = Math.hypot(x - candidateX, z - candidateZ)
    if (distance < closest) {
      closest = distance
      closestX = candidateX
      closestZ = candidateZ
    }
  }

  const signedDistance = inside ? -closest : closest
  const minimumDistance = radius + WATER_BLOCKER_BUFFER
  if (signedDistance >= minimumDistance) return undefined

  const edgeToPointX = x - closestX
  const edgeToPointZ = z - closestZ
  const distance = Math.max(0.001, Math.hypot(edgeToPointX, edgeToPointZ))
  let normalX = edgeToPointX / distance
  let normalZ = edgeToPointZ / distance

  if (distance <= 0.002) {
    normalX = (x - NORTHWEST_LAKE_CENTER.x) / Math.max(1, Math.hypot(x - NORTHWEST_LAKE_CENTER.x, z - NORTHWEST_LAKE_CENTER.z))
    normalZ = (z - NORTHWEST_LAKE_CENTER.z) / Math.max(1, Math.hypot(x - NORTHWEST_LAKE_CENTER.x, z - NORTHWEST_LAKE_CENTER.z))
  }

  if (inside) {
    normalX *= -1
    normalZ *= -1
  }

  return {
    normalX,
    normalZ,
    penetration: minimumDistance - signedDistance,
    signedDistance,
  }
}

function distanceToPath(points: PathPoint[], x: number, z: number, margin: number) {
  let closest = Infinity
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]
    const end = points[index + 1]
    const segmentDistance = distanceToSegment(x, z, start.x, start.z, end.x, end.z)
    closest = Math.min(closest, segmentDistance - Math.max(start.radius, end.radius) - margin)
  }
  return closest
}

function getPathValleyMask(x: number, z: number) {
  const mainPathDistance = distanceToPath(MAIN_PATH_POINTS, x, z, 58)
  const mainExtensionDistance = distanceToPath(MAIN_PATH_EDGE_EXTENSION_POINTS, x, z, 58)
  const cavePathDistance = distanceToPath(CAVE_PATH_POINTS, x, z, 42)
  const scenicPathDistance = distanceToPath(SCENIC_PATH_POINTS, x, z, 38)
  const pathClearance = Math.min(mainPathDistance, mainExtensionDistance, cavePathDistance, scenicPathDistance)
  return smootherstep01(pathClearance / 118)
}

function getSideMeadowSlopeHeight(x: number, z: number) {
  const pathMask = getPathValleyMask(x, z)
  const westBackHill = ovalRise(x, z, -650, -370, 300, 380, 27)
  const eastSpawnHill = ovalRise(x, z, 560, 330, 330, 320, 34)
  const southeastMeadowPlateau = ovalRise(x, z, 650, 600, 390, 280, 50)
  const southeastOuterRidge = ovalRise(x, z, 780, 470, 290, 350, 36)
  const southeastInnerKnoll = ovalRise(x, z, 450, 535, 230, 190, 28)
  const southeastLowSaddle = ovalRise(x, z, 565, 415, 280, 190, -6)
  const southeastFarShoulder = ovalRise(x, z, 880, 665, 280, 180, 22)
  const southeastEdgeShelf = ovalRise(x, z, 1050, 790, 430, 265, 48)
  const southeastCornerShoulder = ovalRise(x, z, 1320, 780, 330, 240, 34)
  const southeastEdgeSaddle = ovalRise(x, z, 880, 590, 270, 180, -5)
  const southeastBottleneckRidge = ovalRise(x, z, 1045, 360, 300, 285, 38)
  const southeastPathGateShoulder = ovalRise(x, z, 1165, 250, 260, 240, 28)
  const southeastPathGateSaddle = ovalRise(x, z, 870, 320, 210, 150, -4)
  const eastTriangleHill = ovalRise(x, z, 980, -120, 340, 290, 58)
  const eastTriangleShoulder = ovalRise(x, z, 850, -18, 285, 230, 24)
  const eastTriangleSaddle = ovalRise(x, z, 782, 82, 230, 180, -5)
  const eastReturnHill = ovalRise(x, z, 1140, 112, 255, 285, 48)
  const eastReturnHillShoulder = ovalRise(x, z, 1250, 260, 225, 210, 22)
  const eastReturnHillSaddle = ovalRise(x, z, 938, 186, 220, 180, -4)
  const eastUpperEdgeShoulder = ovalRise(x, z, 1465, -142, 380, 330, 38)
  const eastLowerEdgeShoulder = ovalRise(x, z, 1450, 282, 365, 335, 42)
  const eastEdgePocketSaddle = ovalRise(x, z, 1288, 64, 245, 190, -9)
  const eastMiddleHill = ovalRise(x, z, 660, -70, 280, 360, 27)
  const northWestHill = ovalRise(x, z, -330, -470, 270, 290, 17)
  const southWestShoulder = ovalRise(x, z, -650, 430, 260, 240, 21)
  const farEastMuseumShoulder = ovalRise(x, z, 760, -450, 220, 250, 16)
  const rollingNoise = (Math.sin(x * 0.012 + z * 0.007) + Math.sin(x * -0.006 + z * 0.011 + 1.9)) * 1.15
  const southeastRegion =
    southeastMeadowPlateau +
    southeastOuterRidge +
    southeastInnerKnoll +
    southeastLowSaddle +
    southeastFarShoulder +
    southeastEdgeShelf +
    southeastCornerShoulder +
    southeastEdgeSaddle +
    southeastBottleneckRidge +
    southeastPathGateShoulder +
    southeastPathGateSaddle
  const eastTriangleRegion =
    eastTriangleHill +
    eastTriangleShoulder +
    eastTriangleSaddle +
    eastReturnHill +
    eastReturnHillShoulder +
    eastReturnHillSaddle +
    eastUpperEdgeShoulder +
    eastLowerEdgeShoulder +
    eastEdgePocketSaddle
  const offPathHills = westBackHill + eastSpawnHill + southeastRegion + eastTriangleRegion + eastMiddleHill + northWestHill + southWestShoulder + farEastMuseumShoulder
  return Math.max(0, offPathHills + rollingNoise * smootherstep01(offPathHills / 18)) * pathMask
}

function roundedRectSoftMask(x: number, z: number, centerX: number, centerZ: number, halfX: number, halfZ: number, feather: number) {
  const qx = Math.abs(x - centerX) - halfX
  const qz = Math.abs(z - centerZ) - halfZ
  const outsideDistance = Math.hypot(Math.max(qx, 0), Math.max(qz, 0))
  const insideDistance = Math.min(Math.max(qx, qz), 0)
  const signedDistance = outsideDistance + insideDistance
  return 1 - smootherstep01((signedDistance + feather) / (feather * 2))
}

function getTrainStationYardHeight(x: number, z: number, currentHeight: number) {
  const stationPadMask = roundedRectSoftMask(x, z, TRAIN_STATION_X, TRAIN_STATION_Z + 10, 334, 126, 94)
  const trackBedMask = roundedRectSoftMask(x, z, TRAIN_STATION_X, TRAIN_TRACK_Z, 470, 42, 84)
  const approachPadMask = roundedRectSoftMask(x, z, TRAIN_STATION_X + 10, TRAIN_STATION_Z - 96, 228, 62, 86)
  const mask = Math.min(1, Math.max(stationPadMask, trackBedMask * 0.98, approachPadMask * 0.94))
  const stationYardHeight = 124

  return currentHeight * (1 - mask) + stationYardHeight * mask
}

export function getTerrainHeight(x: number, z: number) {
  const museumHillHeight = getMuseumHillHeight(x, z)
  const museumDominanceMask = 1 - smootherstep01((museumHillHeight - 28) / 42)
  const leftExplorationRise = radialRise(x, z, -430, -145, 178, 7.8)
  const rightLawnRise = radialRise(x, z, 466, 74, 214, 6.4)
  const spawnShoulder = radialRise(x, z, -470, 362, 130, 3.2)
  const boundaryHillHeight = getBoundaryHillHeight(x, z)
  const baseHeight = museumHillHeight + getSideMeadowSlopeHeight(x, z) * museumDominanceMask + leftExplorationRise + rightLawnRise + spawnShoulder + boundaryHillHeight
  const lakeDistance = signedDistanceToLake(x, z)
  const lakeBasinMask = 1 - smootherstep01((lakeDistance + 24) / 150)
  const lakeAdjustedHeight = Math.max(0, baseHeight * (1 - lakeBasinMask * 0.92))
  return Math.max(0, getTrainStationYardHeight(x, z, lakeAdjustedHeight))
}

export function getSurfaceWorldHeight(surface: LevelSurface) {
  return getTerrainHeight(surface.x, surface.z) + surface.height
}

export type LevelCollider =
  | {
      id: string
      label: string
      kind: 'box'
      x: number
      z: number
      halfX: number
      halfZ: number
      yaw?: number
      clearHeight: number
      bounce: number
    }
  | {
      id: string
      label: string
      kind: 'circle'
      x: number
      z: number
      radius: number
      clearHeight: number
      bounce: number
    }

export type MapMarker = {
  id: string
  label: string
  x: number
  z: number
  kind: 'spawn' | 'landmark' | 'quest' | 'museum'
}

export type GlowSeed = {
  id: string
  label: string
  x: number
  z: number
  height: number
}

export const MAIN_PATH_POINTS: PathPoint[] = [
  { id: 'spawn-lawn', x: -338, z: 276, radius: 30 },
  { id: 'edge-drift-a', x: -236, z: 264, radius: 33 },
  { id: 'edge-drift-b', x: -28, z: 250, radius: 35 },
  { id: 'outer-lawn-run', x: 206, z: 226, radius: 37 },
  { id: 'right-edge-approach', x: 484, z: 170, radius: 40 },
  { id: 'edge-long-straight', x: 742, z: 62, radius: 42 },
  { id: 'edge-hill-foot', x: 982, z: -106, radius: 43 },
  { id: 'outer-hill-sweep', x: 1218, z: -224, radius: 43 },
  { id: 'edge-map-touch', x: 1302, z: -344, radius: 46 },
  { id: 'edge-switchback-top', x: 1192, z: -496, radius: 44 },
  { id: 'museum-return-sweep', x: 820, z: -536, radius: 42 },
  { id: 'forecourt-turn-in', x: 608, z: -500, radius: 42 },
  { id: 'museum-forecourt', x: 520, z: -486, radius: 54 },
]

export const MAIN_PATH_EDGE_EXTENSION_POINTS: PathPoint[] = [
  { id: 'lower-curve-join', x: 10, z: 246, radius: 37 },
  { id: 'lower-left-sweep-a', x: 82, z: 354, radius: 42 },
  { id: 'lower-left-sweep-b', x: 28, z: 494, radius: 44 },
  { id: 'lower-left-sweep-c', x: 132, z: 654, radius: 45 },
  { id: 'lower-left-sweep-d', x: 66, z: 814, radius: 46 },
  { id: 'lower-left-map-exit', x: 138, z: 1048, radius: 54 },
]

export const CAVE_PATH_POINTS: PathPoint[] = [
  { id: 'cave-spur-start', x: -292, z: 250, radius: 15 },
  { id: 'cave-lakeward-sweep', x: -492, z: 208, radius: 16 },
  { id: 'cave-root-ramp', x: -696, z: 130, radius: 16 },
  { id: 'cave-platform-approach', x: -850, z: 126, radius: 18 },
  { id: 'glowbud-cave-platform', x: -990, z: 224, radius: 62 },
]

export const GLOWBUD_CAVE_CENTER_X = -1160
export const GLOWBUD_CAVE_CENTER_Z = 120
export const GLOWBUD_CAVE_YAW = 0.92

export function getGlowbudCaveWorldPoint(localX: number, localZ: number) {
  const cos = Math.cos(GLOWBUD_CAVE_YAW)
  const sin = Math.sin(GLOWBUD_CAVE_YAW)
  return {
    x: GLOWBUD_CAVE_CENTER_X + cos * localX + sin * localZ,
    z: GLOWBUD_CAVE_CENTER_Z - sin * localX + cos * localZ,
  }
}

function makeGlowbudCaveSurface(
  id: string,
  label: string,
  localX: number,
  localZ: number,
  halfX: number,
  halfZ: number,
  height: number,
  color: string,
  topColor: string,
): LevelSurface {
  return {
    id,
    label,
    kind: 'cave',
    shape: 'box',
    ...getGlowbudCaveWorldPoint(localX, localZ),
    halfX,
    halfZ,
    yaw: GLOWBUD_CAVE_YAW,
    height,
    color,
    topColor,
  }
}

export const GLOWBUD_CAVE_ENTRY_SURFACES: LevelSurface[] = [
  makeGlowbudCaveSurface('glowbud-cave-threshold-step', 'glowbud cave threshold step', 0, 188, 76, 16, 0.32, '#63594c', '#9a927e'),
  makeGlowbudCaveSurface('glowbud-cave-left-landing-stone', 'glowbud cave left landing stone', -64, 218, 38, 14, 0.28, '#807769', '#a09278'),
  makeGlowbudCaveSurface('glowbud-cave-right-landing-stone', 'glowbud cave right landing stone', 62, 218, 40, 14, 0.28, '#706756', '#93846e'),
  makeGlowbudCaveSurface('glowbud-cave-center-hop-stone', 'glowbud cave center hop stone', -4, 252, 54, 15, 0.24, '#796f60', '#9a8c72'),
  makeGlowbudCaveSurface('glowbud-cave-front-landing', 'glowbud cave front landing', 0, 316, 84, 22, 0.26, '#786c5b', '#a09278'),
  makeGlowbudCaveSurface('glowbud-cave-outer-hop-stone', 'glowbud cave outer hop stone', 0, 370, 60, 17, 0.22, '#6e6256', '#8f806a'),
]

export const SCENIC_PATH_POINTS: PathPoint[] = [
  { id: 'east-branch-start', x: 386, z: 120, radius: 13 },
  { id: 'hill-thread-a', x: 570, z: 250, radius: 14 },
  { id: 'hill-thread-b', x: 742, z: 410, radius: 15 },
  { id: 'hill-thread-c', x: 890, z: 570, radius: 15 },
  { id: 'east-overlook-pad', x: 1012, z: 692, radius: 22 },
]

export const LEVEL_SURFACES: LevelSurface[] = [
  { id: 'museum-step-low', label: 'museum low step', kind: 'step', shape: 'box', x: 520, z: -552, halfX: 92, halfZ: 18, height: 0.42, color: PALETTE.museumCream, topColor: '#f5efd8' },
  { id: 'museum-step-mid', label: 'museum middle step', kind: 'step', shape: 'box', x: 520, z: -580, halfX: 78, halfZ: 16, height: 0.52, color: PALETTE.museumCream, topColor: '#f5efd8' },
  { id: 'museum-step-upper', label: 'museum upper step', kind: 'step', shape: 'box', x: 520, z: -606, halfX: 64, halfZ: 14, height: 0.62, color: PALETTE.museumCream, topColor: '#f5efd8' },
  { id: 'glowbud-cave-site', label: 'glowbud cave threshold', kind: 'cave', shape: 'box', ...getGlowbudCaveWorldPoint(0, 176), halfX: 148, halfZ: 58, yaw: GLOWBUD_CAVE_YAW, height: 0.12, color: PALETTE.caveRock, topColor: PALETTE.caveMoss },
  ...GLOWBUD_CAVE_ENTRY_SURFACES,
  { id: 'departure-station-platform', label: 'departure train stop', kind: 'forecourt', shape: 'box', x: TRAIN_STATION_X, z: TRAIN_STATION_Z, halfX: 118, halfZ: 54, height: 1.16, color: PALETTE.pathEdge, topColor: PALETTE.beachLight },
  ...BEACH_LOUNGE_CHAIRS.map((chair) => ({
    id: `beach-lounge-chair-${chair.id}`,
    label: `${chair.id === 'main' ? 'main' : 'side'} beach lounge chair`,
    kind: 'prop' as const,
    shape: 'box' as const,
    x: chair.x,
    z: chair.z,
    halfX: chair.halfX,
    halfZ: chair.halfZ,
    yaw: chair.yaw,
    height: chair.height,
    color: PALETTE.pathEdge,
    topColor: PALETTE.beachLight,
  })),
]

export const LEVEL_COLLIDERS: LevelCollider[] = [
  { id: 'museum-building', label: 'museum facade', kind: 'box', x: 520, z: -650, halfX: 116, halfZ: 36, clearHeight: 14, bounce: 0.05 },
  { id: 'museum-left-depth-wing', label: 'museum deep wing', kind: 'box', x: 476, z: -794, halfX: 84, halfZ: 144, clearHeight: 116, bounce: 0.05 },
  { id: 'museum-glass-depth-wing', label: 'museum glass depth wing', kind: 'box', x: 606, z: -803, halfX: 108, halfZ: 190, clearHeight: 116, bounce: 0.05 },
  { id: 'garden-gate-left-pillar', label: 'garden gate pillar', kind: 'circle', x: 758, z: 364, radius: 13, clearHeight: 62, bounce: 0.08 },
  { id: 'garden-gate-right-pillar', label: 'garden gate pillar', kind: 'circle', x: 702, z: 426, radius: 13, clearHeight: 62, bounce: 0.08 },
  { id: 'grove-flower-critter-stump', label: 'grove flower critter mossy stump', kind: 'circle', x: 902.91, z: 528.98, radius: 46, clearHeight: 56, bounce: 0.05 },
  { id: 'glowbud-cave-sealed-door', label: 'sealed ancient cave door', kind: 'box', ...getGlowbudCaveWorldPoint(0, 206), halfX: 84, halfZ: 20, yaw: GLOWBUD_CAVE_YAW, clearHeight: 124, bounce: 0.03 },
  { id: 'glowbud-cave-left-front-pillar', label: 'glowbud cave left entrance rock', kind: 'circle', ...getGlowbudCaveWorldPoint(-154, 128), radius: 68, clearHeight: 148, bounce: 0.04 },
  { id: 'glowbud-cave-right-front-pillar', label: 'glowbud cave right entrance rock', kind: 'circle', ...getGlowbudCaveWorldPoint(154, 128), radius: 70, clearHeight: 152, bounce: 0.04 },
  { id: 'glowbud-cave-left-wall', label: 'glowbud cave left wall', kind: 'box', ...getGlowbudCaveWorldPoint(-320, -44), halfX: 78, halfZ: 236, yaw: GLOWBUD_CAVE_YAW - 0.08, clearHeight: 186, bounce: 0.04 },
  { id: 'glowbud-cave-right-wall', label: 'glowbud cave right wall', kind: 'box', ...getGlowbudCaveWorldPoint(322, -38), halfX: 84, halfZ: 232, yaw: GLOWBUD_CAVE_YAW + 0.08, clearHeight: 188, bounce: 0.04 },
  { id: 'glowbud-cave-back-wall', label: 'glowbud cave rear mountain wall', kind: 'box', ...getGlowbudCaveWorldPoint(-10, -236), halfX: 308, halfZ: 86, yaw: GLOWBUD_CAVE_YAW, clearHeight: 222, bounce: 0.04 },
  { id: 'glowbud-cave-left-rear-boulder', label: 'glowbud cave rear boulder', kind: 'circle', ...getGlowbudCaveWorldPoint(-430, -126), radius: 88, clearHeight: 186, bounce: 0.04 },
  { id: 'glowbud-cave-right-rear-boulder', label: 'glowbud cave rear boulder', kind: 'circle', ...getGlowbudCaveWorldPoint(420, -120), radius: 92, clearHeight: 190, bounce: 0.04 },
  { id: 'glowbud-cave-crown-mass', label: 'glowbud cave crown rock', kind: 'circle', ...getGlowbudCaveWorldPoint(6, -138), radius: 124, clearHeight: 236, bounce: 0.04 },
  { id: 'train-track-boundary', label: 'departure rail boundary', kind: 'box', x: 0, z: TRAIN_TRACK_Z, halfX: 1660, halfZ: 28, clearHeight: 900, bounce: 0.02 },
  { id: 'train-station-hut', label: 'train station hut', kind: 'box', x: TRAIN_STATION_X - 112, z: TRAIN_STATION_Z - 24, halfX: 46, halfZ: 24, clearHeight: 78, bounce: 0.04 },
]

export const GLOW_SEEDS: GlowSeed[] = []

export const MAP_MARKERS: MapMarker[] = [
  { id: 'spawn', label: 'Start: Spawn Lawn', x: -338, z: 276, kind: 'spawn' },
  { id: 'long-lawn-path', label: '2 Edge Lawn Path', x: 742, z: 62, kind: 'landmark' },
  { id: 'glowbud-cave-platform', label: '3 Glowbud Cave Platform', x: -990, z: 224, kind: 'quest' },
  { id: 'museum-forecourt', label: '7 Museum Forecourt', x: 520, z: -486, kind: 'museum' },
  { id: 'departure-station', label: 'Departure Train Stop', x: TRAIN_STATION_X, z: TRAIN_STATION_Z, kind: 'landmark' },
]

export const CAMERA_ZONE_LABELS = [
  'Follow camera on open lawn/path',
  'Open layout camera for the cave-site and museum approach',
  'Overhead camera for layout audits',
] as const
