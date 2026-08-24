import * as THREE from 'three'
import {
  MUSEUM_ATRIUM_REAR_PASSAGE,
  MUSEUM_GALLERY_BY_ID,
  type MuseumArtwork,
  type MuseumGalleryId,
  type MuseumGalleryPlan,
} from './museumPlan'

export type PermanentMuseumGalleryId = Exclude<MuseumGalleryId, 'lobby'>
export type MuseumArtworkWall =
  | 'left'
  | 'right'
  | 'end-left'
  | 'end-right'
  | 'boundary-left-inner'
  | 'portal-south'
  | 'portal-north'
export type MuseumFrameStyle = 'portrait-gilt' | 'heart-float' | 'photo-mat' | 'winter-gilt' | 'winter-frost'
export type MuseumFloorPattern = 'parquet' | 'terrazzo' | 'limestone' | 'winter-rug'
export type MuseumWindowKind = 'amber-clerestory' | 'cobalt-clerestory' | 'daylight' | 'winter'
export type MuseumWindowView = 'courtyard' | 'outer-garden'

export const MUSEUM_GALLERY_WALL_BOTTOM = -1.94
export const MUSEUM_GALLERY_WALL_TOP = 3.15
export const MUSEUM_GALLERY_WINDOW_OPENING_PAD = 0.18
export const MUSEUM_GALLERY_BOUNDARY_MIN_X = -5.92
export const MUSEUM_GALLERY_BOUNDARY_MAX_X = 5.92
export const MUSEUM_GALLERY_BOUNDARY_WALL_THICKNESS = 0.34
export const MUSEUM_GALLERY_SIDE_WALL_CENTER_X = 6.02
export const MUSEUM_GALLERY_SIDE_WALL_THICKNESS = 0.35
export const MUSEUM_GALLERY_BOUNDARY_CASING_DEPTH = 0.08
export const MUSEUM_GALLERY_BOUNDARY_CASING_GAP = 0.012

export type MuseumPortalCasingBox = {
  id: string
  role: 'frame' | 'reveal'
  x: number
  y: number
  z: number
  width: number
  height: number
  depth: number
}

export const MOBA_ONE_PARQUET_SPEC = {
  rows: 20,
  lanes: 18,
  minX: -4.2,
  maxX: 4.2,
  endInset: 1.15,
  boardWidth: 0.4,
  boardDepth: 0.48,
  laneStagger: 0.5,
} as const

export function museumMobaOneParquetBoards(gallery: Pick<MuseumGalleryPlan, 'minZ' | 'maxZ'>) {
  const spec = MOBA_ONE_PARQUET_SPEC
  const usableDepth = gallery.maxZ - gallery.minZ - spec.endInset * 2
  return Array.from({ length: spec.rows * spec.lanes }, (_, index) => {
    const row = Math.floor(index / spec.lanes)
    const lane = index % spec.lanes
    const stagger = lane % 2 === 0 ? 0 : spec.laneStagger
    return {
      id: `portrait-parquet-${row}-${lane}`,
      row,
      lane,
      x: spec.minX + lane * ((spec.maxX - spec.minX) / (spec.lanes - 1)),
      z: gallery.minZ + spec.endInset + ((row + stagger) / (spec.rows - 0.5)) * usableDepth,
      width: spec.boardWidth,
      depth: spec.boardDepth,
    }
  })
}

export const MOBA_TWO_TERRAZZO_SPEC = {
  rows: 12,
  lanes: 9,
  minX: -4.38,
  maxX: 4.38,
  endInset: 1.05,
  minRadius: 0.014,
  maxRadius: 0.029,
} as const

const MOBA_TWO_TERRAZZO_COLORS = ['#d8ddd7', '#b4c5c0', '#d2a8b2', '#a9b9b6'] as const

export function museumMobaTwoTerrazzoChips(gallery: Pick<MuseumGalleryPlan, 'minZ' | 'maxZ'>) {
  const spec = MOBA_TWO_TERRAZZO_SPEC
  const usableDepth = gallery.maxZ - gallery.minZ - spec.endInset * 2
  return Array.from({ length: spec.rows * spec.lanes }, (_, index) => {
    const row = Math.floor(index / spec.lanes)
    const lane = index % spec.lanes
    const laneJitter = ((row * 5 + lane * 3) % 7 - 3) * 0.025
    const depthJitter = ((row * 2 + lane * 5) % 5 - 2) * 0.032
    const radiusT = ((row * 7 + lane * 11) % 9) / 8
    return {
      id: `heart-terrazzo-${row}-${lane}`,
      row,
      lane,
      x: spec.minX + lane * ((spec.maxX - spec.minX) / (spec.lanes - 1)) + laneJitter,
      z: gallery.minZ + spec.endInset + (row / (spec.rows - 1)) * usableDepth + depthJitter,
      radius: spec.minRadius + (spec.maxRadius - spec.minRadius) * radiusT,
      stretch: 1 + ((row * 3 + lane * 2) % 4) * 0.18,
      rotation: ((row * 13 + lane * 17) % 19) * 0.19,
      color: MOBA_TWO_TERRAZZO_COLORS[(row + lane * 2) % MOBA_TWO_TERRAZZO_COLORS.length],
    }
  })
}

export type MuseumGalleryBoundary = 'threshold' | 'end'

export type MuseumGalleryBoundaryOpening = {
  centerX: number
  minX: number
  maxX: number
  width: number
}

export type MuseumGalleryBoundaryWallPanel = {
  id: 'left' | 'right'
  centerX: number
  width: number
}

export type MuseumGalleryThresholdSignLayout = {
  lintelHeight: number
  railCenterY: number
  railHeight: number
  signCenterY: number
  signOuterHeight: number
  signInnerHeight: number
  signPlaneHeight: number
}

export function museumGalleryThresholdSignLayout(
  gallery: Pick<MuseumGalleryPlan, 'id'>,
): MuseumGalleryThresholdSignLayout {
  if (gallery.id === 'holiday') {
    return {
      lintelHeight: 0.72,
      railCenterY: 2.38,
      railHeight: 0.035,
      signCenterY: 1.98,
      signOuterHeight: 0.66,
      signInnerHeight: 0.54,
      signPlaneHeight: 0.46,
    }
  }

  return {
    lintelHeight: gallery.id === 'photography' ? 0.54 : gallery.id === 'moba-one' ? 0.5 : 0.72,
    railCenterY: 2.38,
    railHeight: gallery.id === 'moba-one' ? 0.07 : 0.09,
    signCenterY: 2.3,
    signOuterHeight: 0.8,
    signInnerHeight: 0.68,
    signPlaneHeight: 0.58,
  }
}

export type MuseumLoopWallReturnSpec = {
  id: string
  galleryId: PermanentMuseumGalleryId
  x: number
  z: number
  depth: number
  thickness: number
}

export type MuseumStructuralSlabSpec = {
  id: string
  galleryId: PermanentMuseumGalleryId
  kind: 'gallery' | 'connector' | 'turn'
  x: number
  z: number
  depth: number
  floorWidth: number
  ceilingWidth: number
}

export type MuseumAtriumRearWallSegment = {
  id: string
  x: number
  z: number
  width: number
  depth: number
}

export const MUSEUM_LOOP_WALL_RETURNS: readonly MuseumLoopWallReturnSpec[] = [
  { id: 'moba-one-connector-west-return', galleryId: 'moba-one', x: -12.785, z: 5.04, depth: 3.84, thickness: 0.2 },
  { id: 'holiday-connector-east-return', galleryId: 'holiday', x: 12.785, z: 5.09, depth: 3.94, thickness: 0.2 },
  { id: 'moba-two-rear-turn-west-return', galleryId: 'moba-two', x: -12.785, z: 33.92, depth: 3.18, thickness: 0.2 },
  { id: 'photography-rear-turn-east-return', galleryId: 'photography', x: 12.785, z: 33.92, depth: 3.18, thickness: 0.2 },
] as const

export const MUSEUM_LOOP_WALL_RETURN_COLLIDERS = MUSEUM_LOOP_WALL_RETURNS.map((wall) => ({
  id: wall.id,
  minX: wall.x - wall.thickness * 0.5 - 0.04,
  maxX: wall.x + wall.thickness * 0.5 + 0.04,
  minZ: wall.z - wall.depth * 0.5 - 0.04,
  maxZ: wall.z + wall.depth * 0.5 + 0.04,
}))

const ATRIUM_REAR_OUTER_X = 6.32
const ATRIUM_REAR_OPENING_HALF_WIDTH = MUSEUM_ATRIUM_REAR_PASSAGE.halfWidth + 0.42
const ATRIUM_REAR_SIDE_WIDTH = ATRIUM_REAR_OUTER_X - ATRIUM_REAR_OPENING_HALF_WIDTH
const ATRIUM_REAR_SIDE_CENTER_X = ATRIUM_REAR_OPENING_HALF_WIDTH + ATRIUM_REAR_SIDE_WIDTH * 0.5
const ATRIUM_REAR_CENTER_Z = 32.35

export const MUSEUM_ATRIUM_REAR_WALL_SEGMENTS: readonly MuseumAtriumRearWallSegment[] = [
  {
    id: 'atrium-rear-west-infill',
    x: -ATRIUM_REAR_SIDE_CENTER_X,
    z: ATRIUM_REAR_CENTER_Z,
    width: ATRIUM_REAR_SIDE_WIDTH,
    depth: 0.7,
  },
  {
    id: 'atrium-rear-east-infill',
    x: ATRIUM_REAR_SIDE_CENTER_X,
    z: ATRIUM_REAR_CENTER_Z,
    width: ATRIUM_REAR_SIDE_WIDTH,
    depth: 0.7,
  },
] as const

export type MuseumArtworkSlot = {
  id: string
  artworkId: string
  wall: MuseumArtworkWall
  t?: number
  y: number
  scale: number
  roll?: number
  featured?: boolean
  lamp?: boolean
  frameStyle: MuseumFrameStyle
}

export type MuseumWindowSpec = {
  id: string
  wall: 'left' | 'right'
  t: number
  y: number
  width: number
  height: number
  kind: MuseumWindowKind
  view: MuseumWindowView
}

export type MuseumGalleryWindowBounds = {
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export type MuseumGalleryAtriumPortalSpec = {
  id: string
  wall: 'right'
  t: number
  width: number
  top: number
  transomWindowId: string | null
}

export type MuseumGalleryWallOpening = {
  id: string
  kind: 'window' | 'atrium-portal'
  bounds: MuseumGalleryWindowBounds
}

export type MuseumGalleryWallPanel = {
  id: string
  wall: 'left' | 'right'
  centerY: number
  centerZ: number
  height: number
  width: number
}

export type MuseumGalleryPortalReturn = {
  id: 'portal-south' | 'portal-north'
  centerX: number
  centerZ: number
  length: number
  thickness: number
  wallRotationY: number
  artworkRotationY: number
}

export type MuseumPhotographyIntroSignLayout = {
  position: readonly [number, number, number]
  rotationY: number
  size: readonly [number, number]
}

export type MuseumSkylightSpec = {
  id: string
  t: number
  width: number
  depth: number
  drift: number
}

export type MuseumBenchSpec = {
  x: number
  t: number
  rotationY: number
  length: number
  depth: number
  upholstery: string
  frame: string
}

export type MuseumGalleryInteriorPlan = {
  id: PermanentMuseumGalleryId
  architecture: 'portrait-salon' | 'heart-gallery' | 'daylight-gallery' | 'winter-conservatory'
  floorPattern: MuseumFloorPattern
  daylight: string
  artworkSlots: readonly MuseumArtworkSlot[]
  windows: readonly MuseumWindowSpec[]
  skylights: readonly MuseumSkylightSpec[]
  bench: MuseumBenchSpec
}

export const MUSEUM_GALLERY_ATRIUM_PORTALS: Record<PermanentMuseumGalleryId, MuseumGalleryAtriumPortalSpec> = {
  'moba-one': {
    id: 'moba-one-atrium-portal',
    wall: 'right',
    t: 0.5,
    width: 2.4,
    top: 2.5,
    transomWindowId: 'amber-right',
  },
  'moba-two': {
    id: 'moba-two-atrium-portal',
    wall: 'right',
    t: 0.5,
    width: 2.4,
    top: 2.5,
    transomWindowId: 'cobalt-right',
  },
  photography: {
    id: 'photography-atrium-portal',
    wall: 'right',
    t: 0.5,
    width: 2.4,
    top: 2.5,
    transomWindowId: null,
  },
  holiday: {
    id: 'holiday-atrium-portal',
    wall: 'right',
    t: 0.5,
    width: 2.4,
    top: 2.5,
    transomWindowId: 'winter-right',
  },
}

export const MUSEUM_ATRIUM_COLUMN_ZS = [10.55, 16.2, 22.9, 29.35] as const
export const MUSEUM_ATRIUM_COLUMN_VERTICALS = {
  base: { centerY: -1.72, height: 0.42 },
  shaft: { centerY: 0.845, height: 4.66 },
  capital: { centerY: 3.315, height: 0.23 },
} as const

const portraitGilt = 'portrait-gilt' as const
const heartFloat = 'heart-float' as const
const photoMat = 'photo-mat' as const
const winterGilt = 'winter-gilt' as const
const winterFrost = 'winter-frost' as const

export const MUSEUM_GALLERY_INTERIORS: Record<PermanentMuseumGalleryId, MuseumGalleryInteriorPlan> = {
  'moba-one': {
    id: 'moba-one',
    architecture: 'portrait-salon',
    floorPattern: 'parquet',
    daylight: '#f3ddbc',
    artworkSlots: [
      { id: 'left-a', artworkId: 'moba-one-471', wall: 'left', t: 0.08, y: 0.14, scale: 1.02, roll: -0.007, lamp: true, frameStyle: portraitGilt },
      { id: 'left-b', artworkId: 'moba-one-226', wall: 'left', t: 0.285, y: 0.38, scale: 0.82, roll: 0.006, frameStyle: portraitGilt },
      { id: 'left-c', artworkId: 'moba-one-161', wall: 'left', t: 0.48, y: -0.06, scale: 0.9, roll: -0.006, frameStyle: portraitGilt },
      { id: 'left-d', artworkId: 'moba-one-114', wall: 'left', t: 0.675, y: 0.34, scale: 0.78, roll: 0.007, frameStyle: portraitGilt },
      { id: 'left-e', artworkId: 'moba-one-261', wall: 'left', t: 0.88, y: 0.1, scale: 1.06, roll: -0.006, lamp: true, frameStyle: portraitGilt },
      { id: 'right-a', artworkId: 'moba-one-461', wall: 'right', t: 0.12, y: 0.28, scale: 0.84, roll: 0.006, frameStyle: portraitGilt },
      { id: 'right-b', artworkId: 'moba-one-341', wall: 'portal-south', y: 0.08, scale: 0.94, roll: -0.007, frameStyle: portraitGilt },
      { id: 'right-c', artworkId: 'moba-one-279', wall: 'portal-north', y: 0.18, scale: 0.78, roll: 0.006, frameStyle: portraitGilt },
      { id: 'right-d', artworkId: 'moba-one-376', wall: 'right', t: 0.75, y: 0.1, scale: 1.02, roll: -0.006, lamp: true, frameStyle: portraitGilt },
      { id: 'right-e', artworkId: 'moba-one-584', wall: 'right', t: 0.95, y: 0.3, scale: 0.76, roll: 0.007, frameStyle: portraitGilt },
      { id: 'end-feature', artworkId: 'moba-one-394', wall: 'end-left', y: 0.16, scale: 1.16, featured: true, lamp: true, frameStyle: portraitGilt },
      { id: 'end-companion', artworkId: 'moba-one-427', wall: 'end-right', y: 0.1, scale: 0.96, lamp: true, frameStyle: portraitGilt },
    ],
    windows: [
      { id: 'amber-left', wall: 'left', t: 0.58, y: 2.28, width: 2.6, height: 0.92, kind: 'amber-clerestory', view: 'outer-garden' },
      { id: 'amber-right', wall: 'right', t: 0.5, y: 2.22, width: 2.05, height: 0.52, kind: 'amber-clerestory', view: 'courtyard' },
    ],
    skylights: [
      { id: 'salon-light-a', t: 0.3, width: 4.15, depth: 1.55, drift: 0.55 },
      { id: 'salon-light-b', t: 0.7, width: 4.15, depth: 1.55, drift: -0.45 },
    ],
    bench: { x: -3.35, t: 0.3, rotationY: Math.PI / 2, length: 2.58, depth: 0.7, upholstery: '#825261', frame: '#38251f' },
  },
  'moba-two': {
    id: 'moba-two',
    architecture: 'heart-gallery',
    floorPattern: 'terrazzo',
    daylight: '#e8efea',
    artworkSlots: [
      { id: 'left-a', artworkId: 'moba-two-170', wall: 'boundary-left-inner', y: 0.1, scale: 0.82, frameStyle: heartFloat },
      { id: 'left-b', artworkId: 'moba-two-2142', wall: 'right', t: 0.32, y: 0.18, scale: 0.8, frameStyle: heartFloat },
      { id: 'left-c', artworkId: 'moba-two-586', wall: 'left', t: 0.6, y: 0.08, scale: 0.9, frameStyle: heartFloat },
      { id: 'left-d', artworkId: 'moba-two-532', wall: 'left', t: 0.775, y: 0.18, scale: 0.8, frameStyle: heartFloat },
      { id: 'left-e', artworkId: 'moba-two-473', wall: 'left', t: 0.95, y: 0.1, scale: 0.9, frameStyle: heartFloat },
      { id: 'right-a', artworkId: 'moba-two-2210', wall: 'right', t: 0.1, y: 0.12, scale: 0.88, frameStyle: heartFloat },
      { id: 'right-b', artworkId: 'moba-two-2139', wall: 'portal-south', y: 0.08, scale: 1, frameStyle: heartFloat },
      { id: 'right-c', artworkId: 'moba-two-2173', wall: 'portal-north', y: 0.12, scale: 0.86, frameStyle: heartFloat },
      { id: 'right-d', artworkId: 'moba-two-2097', wall: 'right', t: 0.73, y: 0.08, scale: 1.04, frameStyle: heartFloat },
      { id: 'right-e', artworkId: 'moba-two-2204', wall: 'right', t: 0.92, y: 0.16, scale: 0.84, frameStyle: heartFloat },
      { id: 'end-companion', artworkId: 'moba-two-2149', wall: 'end-left', y: 0.12, scale: 0.98, frameStyle: heartFloat },
      { id: 'end-feature', artworkId: 'moba-two-220', wall: 'end-right', y: 0.16, scale: 1.18, featured: true, lamp: true, frameStyle: heartFloat },
    ],
    windows: [
      { id: 'cobalt-left', wall: 'left', t: 0.59, y: 2.22, width: 2.7, height: 0.9, kind: 'cobalt-clerestory', view: 'outer-garden' },
      { id: 'cobalt-right', wall: 'right', t: 0.5, y: 2.22, width: 2.05, height: 0.52, kind: 'cobalt-clerestory', view: 'courtyard' },
    ],
    skylights: [
      { id: 'heart-light-a', t: 0.18, width: 4.1, depth: 1.35, drift: 0.32 },
      { id: 'heart-light-b', t: 0.5, width: 4.55, depth: 1.75, drift: 0 },
      { id: 'heart-light-c', t: 0.82, width: 4.1, depth: 1.35, drift: 0.34 },
    ],
    bench: { x: 3.05, t: 0.18, rotationY: Math.PI / 2, length: 2.56, depth: 0.72, upholstery: '#718f92', frame: '#b39d78' },
  },
  photography: {
    id: 'photography',
    architecture: 'daylight-gallery',
    floorPattern: 'limestone',
    daylight: '#edf2ec',
    artworkSlots: [
      { id: 'left-a', artworkId: 'photography-2669', wall: 'left', t: 0.055, y: 0.16, scale: 1.02, frameStyle: photoMat },
      { id: 'left-b', artworkId: 'photography-2668', wall: 'left', t: 0.5, y: 0.18, scale: 0.96, frameStyle: photoMat },
      { id: 'left-c', artworkId: 'photography-2667', wall: 'left', t: 0.945, y: 0.15, scale: 1.04, frameStyle: photoMat },
      { id: 'right-a', artworkId: 'photography-2666', wall: 'right', t: 0.055, y: 0.17, scale: 1, frameStyle: photoMat },
      { id: 'right-b', artworkId: 'photography-2665', wall: 'portal-south', y: 0.18, scale: 0.72, frameStyle: photoMat },
      { id: 'right-c', artworkId: 'photography-2664', wall: 'right', t: 0.945, y: 0.18, scale: 1, frameStyle: photoMat },
      { id: 'end-left', artworkId: 'photography-2663', wall: 'end-left', y: 0.16, scale: 1.12, frameStyle: photoMat },
      { id: 'end-right', artworkId: 'photography-2662', wall: 'end-right', y: 0.16, scale: 1.12, frameStyle: photoMat },
    ],
    windows: [
      { id: 'day-left-a', wall: 'left', t: 0.285, y: 1.52, width: 0.82, height: 2.4, kind: 'daylight', view: 'outer-garden' },
      { id: 'day-left-b', wall: 'left', t: 0.715, y: 1.52, width: 0.82, height: 2.4, kind: 'daylight', view: 'outer-garden' },
      { id: 'day-right-a', wall: 'right', t: 0.285, y: 1.52, width: 0.82, height: 2.4, kind: 'daylight', view: 'courtyard' },
      { id: 'day-right-b', wall: 'right', t: 0.715, y: 1.52, width: 0.82, height: 2.4, kind: 'daylight', view: 'courtyard' },
    ],
    skylights: [
      { id: 'photo-light-a', t: 0.2, width: 4.7, depth: 1.55, drift: 0.42 },
      { id: 'photo-light-b', t: 0.5, width: 5.2, depth: 1.75, drift: -0.3 },
      { id: 'photo-light-c', t: 0.8, width: 4.7, depth: 1.55, drift: 0.38 },
    ],
    bench: { x: 3.4, t: 0.78, rotationY: Math.PI / 2, length: 2.85, depth: 0.72, upholstery: '#c9c8be', frame: '#9a8062' },
  },
  holiday: {
    id: 'holiday',
    architecture: 'winter-conservatory',
    floorPattern: 'winter-rug',
    daylight: '#f2dfbd',
    artworkSlots: [
      { id: 'left-a', artworkId: 'holiday-11', wall: 'left', t: 0.07, y: 0.13, scale: 1.02, roll: -0.006, lamp: true, frameStyle: winterGilt },
      { id: 'left-b', artworkId: 'holiday-10', wall: 'left', t: 0.285, y: 0.18, scale: 0.96, roll: 0.006, frameStyle: winterFrost },
      { id: 'left-c', artworkId: 'holiday-9', wall: 'left', t: 0.5, y: 0.14, scale: 0.96, roll: -0.004, frameStyle: winterGilt },
      { id: 'left-d', artworkId: 'holiday-8', wall: 'left', t: 0.715, y: 0.17, scale: 0.94, roll: 0.006, frameStyle: winterFrost },
      { id: 'left-e', artworkId: 'holiday-7', wall: 'left', t: 0.93, y: 0.12, scale: 1.03, roll: -0.005, frameStyle: winterGilt },
      { id: 'right-a', artworkId: 'holiday-6', wall: 'right', t: 0.08, y: 0.15, scale: 0.98, roll: 0.005, frameStyle: winterFrost },
      { id: 'right-b', artworkId: 'holiday-5', wall: 'portal-south', y: 0.14, scale: 1, roll: -0.004, frameStyle: winterGilt },
      { id: 'right-c', artworkId: 'holiday-4', wall: 'portal-north', y: 0.16, scale: 0.98, roll: 0.004, frameStyle: winterFrost },
      { id: 'right-d', artworkId: 'holiday-3', wall: 'right', t: 0.88, y: 0.13, scale: 1.06, roll: -0.005, lamp: true, frameStyle: winterGilt },
      { id: 'end-feature', artworkId: 'holiday-1', wall: 'end-left', y: 0.16, scale: 1.16, featured: true, lamp: true, frameStyle: winterGilt },
      { id: 'end-companion', artworkId: 'holiday-2', wall: 'end-right', y: 0.12, scale: 1.03, lamp: true, frameStyle: winterFrost },
    ],
    windows: [
      { id: 'winter-left', wall: 'left', t: 0.6, y: 2.3, width: 2.45, height: 1, kind: 'winter', view: 'outer-garden' },
      { id: 'winter-right', wall: 'right', t: 0.5, y: 2.22, width: 2.05, height: 0.52, kind: 'winter', view: 'courtyard' },
    ],
    skylights: [
      { id: 'winter-light-a', t: 0.28, width: 4.4, depth: 1.55, drift: 0.35 },
      { id: 'winter-light-b', t: 0.72, width: 4.4, depth: 1.55, drift: -0.32 },
    ],
    bench: { x: 3.45, t: 0.8, rotationY: Math.PI / 2, length: 2.62, depth: 0.72, upholstery: '#704750', frame: '#5b4333' },
  },
}

export const HOLIDAY_GIFT_VITRINE_SPEC = {
  id: 'holiday-gift-vitrine',
  galleryId: 'holiday' as const,
  x: -4.5,
  t: 0.6,
  width: 1.05,
  depth: 0.82,
  colliderPadding: 0.06,
} as const

export const HOLIDAY_CEILING_STAR_SPECS = [
  { id: 'holiday-star-ivory-a', x: -0.32, t: 0.43, y: 2.75, scale: 0.24, color: '#f0dfbd', yaw: 0, roll: -0.08, animated: false },
  { id: 'holiday-star-ivory-b', x: 0.24, t: 0.5, y: 2.69, scale: 0.32, color: '#e7d5b2', yaw: Math.PI / 2, roll: 0.04, animated: false },
  { id: 'holiday-star-cranberry', x: -0.12, t: 0.57, y: 2.76, scale: 0.22, color: '#8e5b63', yaw: Math.PI / 4, roll: 0.12, animated: false },
] as const

export const HOLIDAY_RETURN_WREATH_SPEC = {
  centerY: 2.48,
  wallOffset: 0.46,
  outerRadius: 0.52,
  tubeRadius: 0.1,
  bowCenterY: -0.49,
  bowHeight: 0.34,
} as const

export type MuseumArtworkDisplay = MuseumArtworkSlot & {
  work: MuseumArtwork
  position: readonly [number, number, number]
  rotationY: number
}

export function museumGalleryZ(gallery: MuseumGalleryPlan, t: number, inset = 1.45) {
  return THREE.MathUtils.lerp(gallery.minZ + inset, gallery.maxZ - inset, t)
}

export function museumGalleryWindowBounds(
  gallery: MuseumGalleryPlan,
  spec: MuseumWindowSpec,
): MuseumGalleryWindowBounds {
  const centerZ = museumGalleryZ(gallery, spec.t, 1.05)
  const paddedWidth = spec.width + MUSEUM_GALLERY_WINDOW_OPENING_PAD
  const paddedHeight = spec.height + MUSEUM_GALLERY_WINDOW_OPENING_PAD
  return {
    minY: spec.y - paddedHeight * 0.5,
    maxY: spec.y + paddedHeight * 0.5,
    minZ: centerZ - paddedWidth * 0.5,
    maxZ: centerZ + paddedWidth * 0.5,
  }
}

export function museumGalleryAtriumPortalBounds(
  gallery: MuseumGalleryPlan,
): MuseumGalleryWindowBounds {
  if (gallery.id === 'lobby') {
    throw new Error('The Opening Salon atrium portal is authored in the salon shell')
  }
  const portal = MUSEUM_GALLERY_ATRIUM_PORTALS[gallery.id]
  const centerZ = museumGalleryZ(gallery, portal.t, 0)
  return {
    minY: MUSEUM_GALLERY_WALL_BOTTOM,
    maxY: portal.top,
    minZ: centerZ - portal.width * 0.5,
    maxZ: centerZ + portal.width * 0.5,
  }
}

export function museumGalleryAtriumPortalCasing(
  gallery: MuseumGalleryPlan,
): readonly MuseumPortalCasingBox[] {
  const bounds = museumGalleryAtriumPortalBounds(gallery)
  const centerZ = (bounds.minZ + bounds.maxZ) * 0.5
  const openingWidth = bounds.maxZ - bounds.minZ
  const openingHeight = bounds.maxY - bounds.minY
  const wallFaceX = MUSEUM_GALLERY_SIDE_WALL_CENTER_X - MUSEUM_GALLERY_SIDE_WALL_THICKNESS * 0.5
  const frameDepth = 0.14
  const revealDepth = 0.04
  const layerGap = 0.012
  const frameX = wallFaceX - frameDepth * 0.5 - layerGap
  const revealX = frameX - frameDepth * 0.5 - layerGap - revealDepth * 0.5
  const frameJambWidth = gallery.id === 'moba-one' ? 0.18 : 0.22
  const frameHeaderHeight = gallery.id === 'moba-one' ? 0.28 : 0.32
  const revealJambWidth = 0.08
  const revealHeaderHeight = 0.08

  return [
    {
      id: 'south-frame', role: 'frame', x: frameX,
      y: bounds.minY + openingHeight * 0.5, z: bounds.minZ - frameJambWidth * 0.5,
      width: frameDepth, height: openingHeight, depth: frameJambWidth,
    },
    {
      id: 'north-frame', role: 'frame', x: frameX,
      y: bounds.minY + openingHeight * 0.5, z: bounds.maxZ + frameJambWidth * 0.5,
      width: frameDepth, height: openingHeight, depth: frameJambWidth,
    },
    {
      id: 'header-frame', role: 'frame', x: frameX,
      y: bounds.maxY + frameHeaderHeight * 0.5, z: centerZ,
      width: frameDepth, height: frameHeaderHeight, depth: openingWidth,
    },
    {
      id: 'south-reveal', role: 'reveal', x: revealX,
      y: bounds.minY + (openingHeight - revealHeaderHeight) * 0.5, z: bounds.minZ + revealJambWidth * 0.5,
      width: revealDepth, height: openingHeight - revealHeaderHeight, depth: revealJambWidth,
    },
    {
      id: 'north-reveal', role: 'reveal', x: revealX,
      y: bounds.minY + (openingHeight - revealHeaderHeight) * 0.5, z: bounds.maxZ - revealJambWidth * 0.5,
      width: revealDepth, height: openingHeight - revealHeaderHeight, depth: revealJambWidth,
    },
    {
      id: 'header-reveal', role: 'reveal', x: revealX,
      y: bounds.maxY - revealHeaderHeight * 0.5, z: centerZ,
      width: revealDepth, height: revealHeaderHeight, depth: openingWidth - revealJambWidth * 2,
    },
  ]
}

export function museumGalleryBoundaryCasingZ(wallZ: number) {
  return wallZ
    - MUSEUM_GALLERY_BOUNDARY_WALL_THICKNESS * 0.5
    - MUSEUM_GALLERY_BOUNDARY_CASING_GAP
    - MUSEUM_GALLERY_BOUNDARY_CASING_DEPTH * 0.5
}

export function museumGalleryWindowIsAtriumTransom(
  gallery: MuseumGalleryPlan,
  spec: MuseumWindowSpec,
) {
  if (gallery.id === 'lobby') return false
  return MUSEUM_GALLERY_ATRIUM_PORTALS[gallery.id].transomWindowId === spec.id
}

export function museumGalleryWallOpenings(
  gallery: MuseumGalleryPlan,
  wall: 'left' | 'right',
): readonly MuseumGalleryWallOpening[] {
  if (gallery.id === 'lobby') return []
  const windows = MUSEUM_GALLERY_INTERIORS[gallery.id].windows
    .filter((spec) => spec.wall === wall && !museumGalleryWindowIsAtriumTransom(gallery, spec))
    .map((spec) => ({
      id: spec.id,
      kind: 'window' as const,
      bounds: museumGalleryWindowBounds(gallery, spec),
    }))
  const portal = MUSEUM_GALLERY_ATRIUM_PORTALS[gallery.id]
  if (portal.wall !== wall) return windows
  return [
    ...windows,
    {
      id: portal.id,
      kind: 'atrium-portal' as const,
      bounds: museumGalleryAtriumPortalBounds(gallery),
    },
  ]
}

export function museumGalleryWallPanels(
  gallery: MuseumGalleryPlan,
  wall: 'left' | 'right',
): readonly MuseumGalleryWallPanel[] {
  if (gallery.id === 'lobby') return []
  const wallStart = gallery.minZ
  const wallEnd = gallery.maxZ
  const openings = museumGalleryWallOpenings(gallery, wall)
  const panels: MuseumGalleryWallPanel[] = []

  const addPanel = (id: string, minZ: number, maxZ: number, minY: number, maxY: number) => {
    const width = maxZ - minZ
    const height = maxY - minY
    if (width <= 0.02 || height <= 0.02) return
    panels.push({
      id: `${gallery.id}-${wall}-${id}`,
      wall,
      centerY: (minY + maxY) * 0.5,
      centerZ: (minZ + maxZ) * 0.5,
      height,
      width,
    })
  }

  const zStops = [...new Set([
    wallStart,
    wallEnd,
    ...openings.flatMap((opening) => [opening.bounds.minZ, opening.bounds.maxZ]),
  ])].sort((first, second) => first - second)

  for (let zIndex = 1; zIndex < zStops.length; zIndex += 1) {
    const minZ = zStops[zIndex - 1]
    const maxZ = zStops[zIndex]
    const middleZ = (minZ + maxZ) * 0.5
    const blockedY = openings
      .filter((opening) => middleZ > opening.bounds.minZ && middleZ < opening.bounds.maxZ)
      .map((opening) => ({
        min: Math.max(MUSEUM_GALLERY_WALL_BOTTOM, opening.bounds.minY),
        max: Math.min(MUSEUM_GALLERY_WALL_TOP, opening.bounds.maxY),
      }))
      .sort((first, second) => first.min - second.min)

    const mergedY: { min: number; max: number }[] = []
    for (const interval of blockedY) {
      const last = mergedY.at(-1)
      if (!last || interval.min > last.max + 0.0001) mergedY.push({ ...interval })
      else last.max = Math.max(last.max, interval.max)
    }

    let cursorY = MUSEUM_GALLERY_WALL_BOTTOM
    for (let yIndex = 0; yIndex < mergedY.length; yIndex += 1) {
      const interval = mergedY[yIndex]
      addPanel(`z${zIndex}-y${yIndex}`, minZ, maxZ, cursorY, interval.min)
      cursorY = Math.max(cursorY, interval.max)
    }
    addPanel(`z${zIndex}-after`, minZ, maxZ, cursorY, MUSEUM_GALLERY_WALL_TOP)
  }
  return panels
}

function museumGalleryBoundaryUsesOuterHall(
  gallery: MuseumGalleryPlan,
  boundary: MuseumGalleryBoundary,
) {
  return (
    (gallery.id === 'moba-one' && boundary === 'threshold')
    || (gallery.id === 'moba-two' && boundary === 'end')
    || (gallery.id === 'photography' && boundary === 'threshold')
    || (gallery.id === 'holiday' && boundary === 'end')
  )
}

export function museumGalleryBoundaryOpening(
  gallery: MuseumGalleryPlan,
  boundary: MuseumGalleryBoundary,
): MuseumGalleryBoundaryOpening {
  const minX = museumGalleryBoundaryUsesOuterHall(gallery, boundary) ? -0.66 : -2.74
  const maxX = 2.74
  return {
    centerX: (minX + maxX) * 0.5,
    minX,
    maxX,
    width: maxX - minX,
  }
}

export function museumGalleryBoundaryWallPanels(
  gallery: MuseumGalleryPlan,
  boundary: MuseumGalleryBoundary,
): readonly MuseumGalleryBoundaryWallPanel[] {
  const opening = museumGalleryBoundaryOpening(gallery, boundary)
  return [
    {
      id: 'left',
      centerX: (MUSEUM_GALLERY_BOUNDARY_MIN_X + opening.minX) * 0.5,
      width: opening.minX - MUSEUM_GALLERY_BOUNDARY_MIN_X,
    },
    {
      id: 'right',
      centerX: (opening.maxX + MUSEUM_GALLERY_BOUNDARY_MAX_X) * 0.5,
      width: MUSEUM_GALLERY_BOUNDARY_MAX_X - opening.maxX,
    },
  ]
}

export function museumGalleryPortalReturns(
  gallery: MuseumGalleryPlan,
): readonly MuseumGalleryPortalReturn[] {
  if (gallery.id === 'lobby') return []
  const portal = MUSEUM_GALLERY_ATRIUM_PORTALS[gallery.id]
  const centerZ = museumGalleryZ(gallery, portal.t, 0)
  const length = 1.9
  const centerX = 4.78
  const flare = 0.3
  return [
    {
      id: 'portal-south',
      centerX,
      centerZ: centerZ - 1.5,
      length,
      thickness: 0.18,
      wallRotationY: -flare,
      artworkRotationY: -flare,
    },
    {
      id: 'portal-north',
      centerX,
      centerZ: centerZ + 1.5,
      length,
      thickness: 0.18,
      wallRotationY: flare,
      artworkRotationY: Math.PI + flare,
    },
  ]
}

export function museumPhotographyIntroSignLayout(
  gallery: MuseumGalleryPlan,
): MuseumPhotographyIntroSignLayout {
  if (gallery.id !== 'photography') {
    throw new Error('The north-light introduction plaque belongs to the Photography gallery')
  }
  const northReturn = museumGalleryPortalReturns(gallery).find((portalReturn) => (
    portalReturn.id === 'portal-north'
  ))!
  const rotationY = northReturn.artworkRotationY
  const surfaceOffset = 0.18
  return {
    position: [
      northReturn.centerX + Math.sin(rotationY) * surfaceOffset,
      1.22,
      northReturn.centerZ + Math.cos(rotationY) * surfaceOffset,
    ],
    rotationY,
    size: [1.36, 0.46],
  }
}

export function museumGalleryArtworkDisplays(gallery: MuseumGalleryPlan): readonly MuseumArtworkDisplay[] {
  if (gallery.id === 'lobby') return []
  const interior = MUSEUM_GALLERY_INTERIORS[gallery.id]
  const artworkById = new Map(gallery.artworks.map((work) => [work.id, work]))

  return interior.artworkSlots.map((slot) => {
    const work = artworkById.get(slot.artworkId)
    if (!work) throw new Error(`${gallery.id}: artwork slot ${slot.id} references missing work ${slot.artworkId}`)
    if (Boolean(slot.featured) !== work.featured) {
      throw new Error(`${gallery.id}: artwork slot ${slot.id} featured state does not match ${slot.artworkId}`)
    }

    if (slot.wall === 'left' || slot.wall === 'right') {
      const side = slot.wall === 'left' ? -1 : 1
      return {
        ...slot,
        work,
        position: [side * 5.65, slot.y, museumGalleryZ(gallery, slot.t ?? 0.5)] as const,
        rotationY: side < 0 ? Math.PI / 2 : -Math.PI / 2,
      }
    }

    if (slot.wall === 'portal-south' || slot.wall === 'portal-north') {
      const portalReturn = museumGalleryPortalReturns(gallery).find((candidate) => candidate.id === slot.wall)
      if (!portalReturn) throw new Error(`${gallery.id}: missing ${slot.wall} return wall`)
      const mountOffset = 0.18
      return {
        ...slot,
        work,
        position: [
          portalReturn.centerX + Math.sin(portalReturn.artworkRotationY) * mountOffset,
          slot.y,
          portalReturn.centerZ + Math.cos(portalReturn.artworkRotationY) * mountOffset,
        ] as const,
        rotationY: portalReturn.artworkRotationY,
      }
    }

    if (slot.wall === 'boundary-left-inner') {
      return {
        ...slot,
        work,
        position: [-1.75, slot.y, gallery.maxZ - 0.42] as const,
        rotationY: Math.PI,
      }
    }

    return {
      ...slot,
      work,
      position: [slot.wall === 'end-left' ? -4.18 : 4.18, slot.y, gallery.maxZ - 0.42] as const,
      rotationY: Math.PI,
    }
  })
}

function localMuseumPointToWorld(gallery: MuseumGalleryPlan, x: number, z: number) {
  const localZ = z - gallery.minZ
  const cosine = Math.cos(gallery.placement.yaw)
  const sine = Math.sin(gallery.placement.yaw)
  return {
    x: gallery.placement.x + x * cosine + localZ * sine,
    z: gallery.placement.z - x * sine + localZ * cosine,
  }
}

const PERMANENT_GALLERY_IDS = ['moba-one', 'moba-two', 'photography', 'holiday'] as const

const galleryStructuralSlabs = PERMANENT_GALLERY_IDS.map((galleryId): MuseumStructuralSlabSpec => {
  const gallery = MUSEUM_GALLERY_BY_ID[galleryId]
  const center = localMuseumPointToWorld(gallery, 0, (gallery.minZ + gallery.maxZ) * 0.5)
  return {
    id: `${galleryId}-gallery-slab`,
    galleryId,
    kind: 'gallery',
    x: Number(center.x.toFixed(6)),
    z: Number(center.z.toFixed(6)),
    depth: gallery.maxZ - gallery.minZ,
    floorWidth: 12.05,
    ceilingWidth: 11.95,
  }
})

/**
 * The loop's structural floor and ceiling slabs meet at shared edges rather
 * than overlapping on one plane. Keeping this data shared by renderer and
 * tests prevents the moving moire/shard artifacts caused by depth fighting.
 */
export const MUSEUM_STRUCTURAL_SLABS: readonly MuseumStructuralSlabSpec[] = [
  ...galleryStructuralSlabs,
  {
    id: 'moba-one-connector-slab',
    galleryId: 'moba-one',
    kind: 'connector',
    x: -9.2,
    z: 5,
    depth: 3.6,
    floorWidth: 7,
    ceilingWidth: 7,
  },
  {
    id: 'holiday-connector-slab',
    galleryId: 'holiday',
    kind: 'connector',
    x: 9.2,
    z: 5,
    depth: 3.6,
    floorWidth: 7,
    ceilingWidth: 7,
  },
  {
    id: 'north-turn-slab',
    galleryId: 'photography',
    kind: 'turn',
    x: 0,
    z: 34.1,
    depth: 2.8,
    floorWidth: 25.4,
    ceilingWidth: 25.4,
  },
] as const

const holidayGiftVitrineGallery = MUSEUM_GALLERY_BY_ID[HOLIDAY_GIFT_VITRINE_SPEC.galleryId]
const holidayGiftVitrineCenter = localMuseumPointToWorld(
  holidayGiftVitrineGallery,
  HOLIDAY_GIFT_VITRINE_SPEC.x,
  museumGalleryZ(holidayGiftVitrineGallery, HOLIDAY_GIFT_VITRINE_SPEC.t, 1.1),
)

export const MUSEUM_HOLIDAY_GIFT_VITRINE_COLLIDER = {
  id: HOLIDAY_GIFT_VITRINE_SPEC.id,
  minX: holidayGiftVitrineCenter.x - HOLIDAY_GIFT_VITRINE_SPEC.width * 0.5 - HOLIDAY_GIFT_VITRINE_SPEC.colliderPadding,
  maxX: holidayGiftVitrineCenter.x + HOLIDAY_GIFT_VITRINE_SPEC.width * 0.5 + HOLIDAY_GIFT_VITRINE_SPEC.colliderPadding,
  minZ: holidayGiftVitrineCenter.z - HOLIDAY_GIFT_VITRINE_SPEC.depth * 0.5 - HOLIDAY_GIFT_VITRINE_SPEC.colliderPadding,
  maxZ: holidayGiftVitrineCenter.z + HOLIDAY_GIFT_VITRINE_SPEC.depth * 0.5 + HOLIDAY_GIFT_VITRINE_SPEC.colliderPadding,
} as const

export const MUSEUM_GALLERY_BENCH_COLLIDERS = Object.values(MUSEUM_GALLERY_INTERIORS).map((interior) => {
  const gallery = MUSEUM_GALLERY_BY_ID[interior.id]
  const center = localMuseumPointToWorld(gallery, interior.bench.x, museumGalleryZ(gallery, interior.bench.t, 1.1))
  const yaw = gallery.placement.yaw + interior.bench.rotationY
  const outlinePadding = 0.04
  const halfX = Math.abs(Math.cos(yaw)) * interior.bench.length * 0.5
    + Math.abs(Math.sin(yaw)) * interior.bench.depth * 0.5
    + outlinePadding
  const halfZ = Math.abs(Math.sin(yaw)) * interior.bench.length * 0.5
    + Math.abs(Math.cos(yaw)) * interior.bench.depth * 0.5
    + outlinePadding
  return {
    id: `${interior.id}-bench`,
    minX: center.x - halfX,
    maxX: center.x + halfX,
    minZ: center.z - halfZ,
    maxZ: center.z + halfZ,
  }
})

function museumGalleryBoundaryWallColliders(
  boundary: MuseumGalleryBoundary,
) {
  return Object.values(MUSEUM_GALLERY_INTERIORS).flatMap((interior) => {
    const gallery = MUSEUM_GALLERY_BY_ID[interior.id]
    const localHalfZ = MUSEUM_GALLERY_BOUNDARY_WALL_THICKNESS * 0.5 + 0.04
    const cosine = Math.cos(gallery.placement.yaw)
    const sine = Math.sin(gallery.placement.yaw)
    const localZ = boundary === 'threshold' ? gallery.minZ + 0.08 : gallery.maxZ - 0.18

    return museumGalleryBoundaryWallPanels(gallery, boundary).map((panel) => {
      const localHalfX = panel.width * 0.5 + 0.04
      const halfX = Math.abs(cosine) * localHalfX + Math.abs(sine) * localHalfZ
      const halfZ = Math.abs(sine) * localHalfX + Math.abs(cosine) * localHalfZ
      const center = localMuseumPointToWorld(gallery, panel.centerX, localZ)
      return {
        id: `${interior.id}-${boundary}-wall-${panel.id}`,
        minX: center.x - halfX,
        maxX: center.x + halfX,
        minZ: center.z - halfZ,
        maxZ: center.z + halfZ,
      }
    })
  })
}

export const MUSEUM_GALLERY_END_WALL_COLLIDERS = museumGalleryBoundaryWallColliders('end')
export const MUSEUM_GALLERY_THRESHOLD_WALL_COLLIDERS = museumGalleryBoundaryWallColliders('threshold')

export const MUSEUM_GALLERY_PORTAL_RETURN_COLLIDERS = Object.values(MUSEUM_GALLERY_INTERIORS).flatMap((interior) => {
  const gallery = MUSEUM_GALLERY_BY_ID[interior.id]
  return museumGalleryPortalReturns(gallery).map((portalReturn) => {
    const center = localMuseumPointToWorld(gallery, portalReturn.centerX, portalReturn.centerZ)
    const yaw = gallery.placement.yaw + portalReturn.wallRotationY
    const halfLocalX = portalReturn.length * 0.5 + 0.04
    const halfLocalZ = portalReturn.thickness * 0.5 + 0.04
    const halfX = Math.abs(Math.cos(yaw)) * halfLocalX + Math.abs(Math.sin(yaw)) * halfLocalZ
    const halfZ = Math.abs(Math.sin(yaw)) * halfLocalX + Math.abs(Math.cos(yaw)) * halfLocalZ
    return {
      id: `${gallery.id}-${portalReturn.id}-wall`,
      minX: center.x - halfX,
      maxX: center.x + halfX,
      minZ: center.z - halfZ,
      maxZ: center.z + halfZ,
    }
  })
})
