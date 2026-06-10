import type { LevelData, PathDefinition, Vec3, WalkableSurface } from "../world/levelTypes"
import { samplePath, type PathSample } from "./pathGeometry"

export interface RouteCollisionStrip {
  id: string
  pathId: string
  surface: WalkableSurface
  fromSample: PathSample
  toSample: PathSample
}

export interface CoinTrailAnchor {
  id: string
  pathId: string
  t: number
  position: Vec3
}

export interface BuiltRoutePath {
  path: PathDefinition
  samples: PathSample[]
  collisionStrips: RouteCollisionStrip[]
  coinTrailAnchors: CoinTrailAnchor[]
}

export interface BuiltRouteLevel {
  level: LevelData
  paths: BuiltRoutePath[]
  generatedWalkableSurfaces: WalkableSurface[]
  coinTrailAnchors: CoinTrailAnchor[]
}

const PATH_SURFACE_Y_OFFSET = 0.02
const PATH_SURFACE_THICKNESS = 0.08

export function buildRouteLevel(level: LevelData): BuiltRouteLevel {
  const builtPaths = level.paths.map(buildRoutePath)
  const generatedWalkableSurfaces: WalkableSurface[] = []
  const coinTrailAnchors: CoinTrailAnchor[] = []

  for (const path of builtPaths) {
    for (const strip of path.collisionStrips) {
      generatedWalkableSurfaces.push(strip.surface)
    }

    for (const anchor of path.coinTrailAnchors) {
      coinTrailAnchors.push(anchor)
    }
  }

  return {
    level: {
      ...level,
      walkableSurfaces: [...level.walkableSurfaces, ...generatedWalkableSurfaces],
    },
    paths: builtPaths,
    generatedWalkableSurfaces,
    coinTrailAnchors,
  }
}

export function buildRoutePath(path: PathDefinition): BuiltRoutePath {
  const samples = samplePath(path)

  return {
    path,
    samples,
    collisionStrips: path.generated.createCollisionStrip ? buildCollisionStrips(path, samples) : [],
    coinTrailAnchors: path.generated.createCoinTrail ? buildCoinTrailAnchors(path, samples) : [],
  }
}

function buildCollisionStrips(path: PathDefinition, samples: PathSample[]): RouteCollisionStrip[] {
  const strips: RouteCollisionStrip[] = []

  for (let index = 0; index < samples.length - 1; index += 1) {
    const fromSample = samples[index]
    const toSample = samples[index + 1]
    const midpoint = midpointVec3(fromSample.point, toSample.point)
    const segment = subtractVec3(toSample.point, fromSample.point)
    const length = Math.hypot(segment.x, segment.z)

    if (length <= 0.001) continue

    const width = (fromSample.width + toSample.width) * 0.5
    const yawRadians = Math.atan2(segment.x, segment.z)
    const id = `generated-surface-${path.id}-${index.toString().padStart(2, "0")}`

    const surface: WalkableSurface = {
      id,
      label: `${path.label} Collision Strip ${index + 1}`,
      kind: "generatedPathStrip",
      zoneId: path.route.fromZoneId,
      center: { x: midpoint.x, y: midpoint.y + PATH_SURFACE_Y_OFFSET, z: midpoint.z },
      size: { x: width, y: PATH_SURFACE_THICKNESS, z: length + 0.35 },
      yawRadians,
      y: midpoint.y + PATH_SURFACE_Y_OFFSET,
      normal: { x: 0, y: 1, z: 0 },
      surfaceTags: ["ground", "path"],
      maxStableSlopeDegrees: 35,
      landingRules: {
        canLandFromAbove: true,
        snapDistance: 0.14,
      },
      debug: {
        color: path.debug.color,
        showNormal: false,
      },
    }

    strips.push({ id, pathId: path.id, surface, fromSample, toSample })
  }

  return strips
}

function buildCoinTrailAnchors(path: PathDefinition, samples: PathSample[]): CoinTrailAnchor[] {
  const anchorCount: number = path.route.importance === "critical" ? 12 : 5
  const anchors: CoinTrailAnchor[] = []

  for (let index = 0; index < anchorCount; index += 1) {
    const t = anchorCount === 1 ? 0.5 : (index + 1) / (anchorCount + 1)
    const sample = nearestSample(samples, t)

    if (!sample) continue

    anchors.push({
      id: `coin-anchor-${path.id}-${index.toString().padStart(2, "0")}`,
      pathId: path.id,
      t: sample.t,
      position: { x: sample.point.x, y: sample.point.y + 0.55, z: sample.point.z },
    })
  }

  return anchors
}

function nearestSample(samples: PathSample[], t: number): PathSample | undefined {
  return samples.reduce<PathSample | undefined>((best, sample) => {
    if (!best) return sample
    return Math.abs(sample.t - t) < Math.abs(best.t - t) ? sample : best
  }, undefined)
}

function midpointVec3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5,
    z: (a.z + b.z) * 0.5,
  }
}

function subtractVec3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }
}
