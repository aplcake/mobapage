import { useMemo } from 'react'
import * as THREE from 'three'

export const MUSEUM_SCALE_ARENA_MODEL = 'museum-scale-roof-climb-v34'
export const MUSEUM_SCALE_ROOM_LIMIT = 700
export const MUSEUM_SCALE_FLOOR_Y = -2.075
export const MUSEUM_SCALE_START_POSITION = new THREE.Vector3(0, 0, 305)

export const MUSEUM_SCALE_PATH = {
  width: 160,
  length: 760,
  centerZ: 0,
} as const

const MUSEUM_APPROACH_HILL_TOP_HEIGHT = 5.45
const MUSEUM_BRIDGE_DECK_HEIGHT = 5.6
const MUSEUM_ENTRY_LANDING_HEIGHT = 6.15
const HORIZON_FLOOR_SIZE = 3200
const VISIBLE_GRASS_SIZE = HORIZON_FLOOR_SIZE
const PATH_EDGE_OPACITY = 0.2
const MIN_TOON_OUTLINE_PAD = 0.42
const MIN_THIN_TOON_OUTLINE_PAD = 0.72

const ARENA_PALETTE = {
  grass: '#95B999',
  grassDark: '#436047',
  grassMound: '#89AE86',
  grassMoundLight: '#B8D0A8',
  path: '#dce9e8',
  pathWarm: '#f1f2df',
  pathEdge: '#78908a',
  pathJoint: '#8fa39d',
  hiddenTrail: '#cfdab0',
  hiddenTrailWarm: '#eef0c8',
  hiddenTrailEdge: '#6e8866',
  climbSlope: '#b8d8a1',
  climbSlopeWarm: '#e2dca0',
  climbSlopeSide: '#6f8a66',
  moatWater: '#73cbd4',
  moatWaterDeep: '#3f8fa3',
  moatWaterLight: '#d4fff6',
  bridgeStone: '#d9d3ba',
  bridgeWarm: '#e8c97a',
  bridgeRail: '#b8a276',
  museumStone: '#d6dfdd',
  museumStoneLight: '#edf0df',
  museumCyan: '#c9e6e9',
  museumMauve: '#c7a4d9',
  museumCream: '#efe0a7',
  museumDoor: '#29223b',
  museumTeak: '#cf7c34',
  museumTeakLight: '#f6ad6a',
  museumWalnut: '#744126',
  museumMauveWall: '#976172',
  museumMauveDark: '#6f415a',
  museumGlass: '#91bed0',
  museumGlassDeep: '#567891',
  museumMullion: '#25283f',
  museumGold: '#e5b23e',
  museumFern: '#5f973a',
  museumFernLight: '#b4db61',
  rock: '#8d94a8',
  rockLight: '#b4bbc8',
  rockWarm: '#b9a7be',
  rockShadow: '#5e6274',
  cliffSide: '#74806f',
  cliffSideWarm: '#9a8795',
  mossShadow: '#5f7a5d',
  mushroomCap: '#ef474d',
  mushroomCapDeep: '#b82e47',
  mushroomCapGold: '#f6b94d',
  mushroomSpot: '#fffdf0',
  mushroomStem: '#f4e4bf',
  mushroomGills: '#d8bd93',
  bush: '#6f984e',
  bushLight: '#aacb74',
  bushBlue: '#70a992',
  bushDeep: '#4f7244',
  flowerPink: '#ef8edb',
  flowerCream: '#fff2ad',
  flowerBlue: '#8ce8ff',
  flowerViolet: '#caa1ff',
  flowerCoral: '#ff7c68',
  flowerYellow: '#ffe66a',
  steppingStone: '#bac2bf',
  steppingStoneTop: '#dce1cf',
  steppingStoneWarm: '#d8c29a',
  ink: '#17121f',
} as const

function getStableOutlineScale(scale: [number, number, number], outlineScale: number): [number, number, number] {
  return scale.map((axisSize) => {
    const minPad = axisSize < 4 ? MIN_THIN_TOON_OUTLINE_PAD : axisSize < 14 ? 0.56 : MIN_TOON_OUTLINE_PAD
    return Math.max(axisSize * outlineScale, axisSize + minPad)
  }) as [number, number, number]
}

type RockPiece = {
  offset: [number, number, number]
  scale: [number, number, number]
  rotation: [number, number, number]
  color: string
}

type RockFormation = {
  id: string
  position: [number, number, number]
  pieces: RockPiece[]
}

type TerrainMound = {
  id: string
  position: [number, number, number]
  scale: [number, number, number]
  rotation: [number, number, number]
  color: string
  highlight?: string
}

type TerrainShelf = {
  id: string
  position: [number, number, number]
  scale: [number, number, number]
  color: string
  topColor: string
  rotationY?: number
}

type AmanitaMushroomSpec = {
  offset: [number, number, number]
  size: number
  yaw: number
  lean: number
  capColor: string
  capSquash?: number
}

type AmanitaPatch = {
  id: string
  position: [number, number, number]
  yaw: number
  colliderRadius?: number
  clearHeight?: number
  mushrooms: AmanitaMushroomSpec[]
}

type WildflowerKind = 'daisy' | 'bell' | 'pom'

type WildflowerSpec = {
  offset: [number, number, number]
  height: number
  bloomSize: number
  color: string
  accent: string
  kind: WildflowerKind
  lean?: number
  yaw?: number
}

type WildflowerPatch = {
  id: string
  position: [number, number, number]
  yaw: number
  flowers: WildflowerSpec[]
}

type BushCluster = {
  id: string
  position: [number, number, number]
  yaw: number
  scale: [number, number, number]
  color: string
  accent: string
  colliderRadius?: number
  clearHeight?: number
}

type DecorativeStonePiece = {
  offset: [number, number, number]
  scale: [number, number, number]
  rotation: [number, number, number]
  color: string
}

type DecorativeStoneCluster = {
  id: string
  position: [number, number, number]
  yaw: number
  colliderRadius?: number
  clearHeight?: number
  pieces: DecorativeStonePiece[]
}

type PathSegment = {
  id: string
  x: number
  z: number
  width: number
  length: number
  yaw: number
  rise: number
}

type SteppingStone = {
  id: string
  label: string
  x: number
  z: number
  radiusX: number
  radiusZ: number
  height: number
  yaw: number
  color: string
  topColor: string
}

export type MuseumWalkableSurface = {
  id: string
  label: string
  kind: 'path' | 'bridge' | 'forecourt'
  x: number
  z: number
  halfX: number
  halfZ: number
  yaw?: number
}

export type MuseumWaterBoundary = {
  id: string
  label: string
  x: number
  z: number
  halfX: number
  halfZ: number
  yaw?: number
}

export type MuseumSlopeSurface = {
  id: string
  label: string
  x: number
  z: number
  halfX: number
  halfZ: number
  yaw?: number
  lowHeight: number
  highHeight: number
  riseAxis: 'x' | 'z'
  riseSign: 1 | -1
  color?: string
  sideColor?: string
}

export type MuseumSolidCollider =
  | {
      id: string
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
      kind: 'circle'
      x: number
      z: number
      radius: number
      clearHeight: number
      bounce: number
    }

export type MuseumHoppablePlatform = {
  id: string
  label: string
  shape?: 'box' | 'circle'
  x: number
  z: number
  halfX: number
  halfZ: number
  radius?: number
  yaw?: number
  height: number
}

const ROCK_FORMATIONS: RockFormation[] = [
  {
    id: 'arrival-left-mass',
    position: [-258, MUSEUM_SCALE_FLOOR_Y, 258],
    pieces: [
      { offset: [0, 17, 0], scale: [58, 34, 42], rotation: [0.04, 0.28, -0.08], color: ARENA_PALETTE.rock },
      { offset: [-39, 9.8, 14], scale: [35, 19.6, 27], rotation: [-0.08, -0.18, 0.12], color: ARENA_PALETTE.rockWarm },
      { offset: [36, 12.4, -11], scale: [33, 24, 28], rotation: [0.1, 0.52, 0.08], color: ARENA_PALETTE.rockLight },
      { offset: [-5, 31, -23], scale: [29, 24, 22], rotation: [-0.2, 0.1, 0.18], color: ARENA_PALETTE.rockShadow },
    ],
  },
  {
    id: 'arrival-right-mass',
    position: [318, MUSEUM_SCALE_FLOOR_Y, 198],
    pieces: [
      { offset: [0, 19, 0], scale: [62, 38, 46], rotation: [-0.06, -0.34, 0.1], color: ARENA_PALETTE.rockWarm },
      { offset: [45, 10.8, 16], scale: [36, 22, 30], rotation: [0.08, 0.18, -0.18], color: ARENA_PALETTE.rock },
      { offset: [-42, 14.2, -18], scale: [39, 28, 30], rotation: [0.14, -0.55, 0.04], color: ARENA_PALETTE.rockLight },
      { offset: [4, 37, -31], scale: [32, 27, 25], rotation: [-0.16, 0.32, -0.1], color: ARENA_PALETTE.rockShadow },
    ],
  },
  {
    id: 'mid-left-cliff',
    position: [-358, MUSEUM_SCALE_FLOOR_Y, -12],
    pieces: [
      { offset: [0, 20, 0], scale: [50, 40, 35], rotation: [0.1, 0.22, 0.08], color: ARENA_PALETTE.rock },
      { offset: [34, 12, 24], scale: [28, 24, 21], rotation: [-0.12, -0.38, 0.18], color: ARENA_PALETTE.rockLight },
      { offset: [-36, 13, -26], scale: [32, 26, 24], rotation: [0.16, 0.7, -0.08], color: ARENA_PALETTE.rockWarm },
      { offset: [-6, 39, -4], scale: [26, 28, 21], rotation: [-0.14, -0.12, 0.2], color: ARENA_PALETTE.rockShadow },
    ],
  },
  {
    id: 'mid-right-sentinel',
    position: [382, MUSEUM_SCALE_FLOOR_Y, -154],
    pieces: [
      { offset: [0, 24, 0], scale: [38, 48, 29], rotation: [-0.2, 0.18, 0.1], color: ARENA_PALETTE.rockLight },
      { offset: [-26, 11, 20], scale: [24, 22, 18], rotation: [0.18, -0.36, -0.14], color: ARENA_PALETTE.rock },
      { offset: [29, 14, -18], scale: [25, 28, 20], rotation: [-0.08, 0.58, 0.2], color: ARENA_PALETTE.rockWarm },
      { offset: [2, 50, -4], scale: [22, 27, 17], rotation: [0.22, -0.14, -0.08], color: ARENA_PALETTE.rockShadow },
    ],
  },
  {
    id: 'far-left-gate-rock',
    position: [-326, MUSEUM_SCALE_FLOOR_Y, -386],
    pieces: [
      { offset: [0, 16, 0], scale: [39, 32, 28], rotation: [0.04, -0.44, -0.08], color: ARENA_PALETTE.rockWarm },
      { offset: [31, 9, -5], scale: [22, 18, 17], rotation: [-0.2, 0.34, 0.12], color: ARENA_PALETTE.rockLight },
      { offset: [-28, 8, 18], scale: [21, 16, 18], rotation: [0.12, -0.16, 0.18], color: ARENA_PALETTE.rock },
    ],
  },
  {
    id: 'far-right-gate-rock',
    position: [336, MUSEUM_SCALE_FLOOR_Y, -394],
    pieces: [
      { offset: [0, 18, 0], scale: [42, 36, 30], rotation: [-0.1, 0.48, 0.08], color: ARENA_PALETTE.rockLight },
      { offset: [-32, 9, 0], scale: [24, 18, 18], rotation: [0.16, -0.32, -0.18], color: ARENA_PALETTE.rockWarm },
      { offset: [32, 11, 16], scale: [23, 22, 19], rotation: [-0.18, 0.18, 0.16], color: ARENA_PALETTE.rock },
    ],
  },
]

const TERRAIN_MOUNDS: TerrainMound[] = [
  {
    id: 'entry-left-soft-rise',
    position: [-418, MUSEUM_SCALE_FLOOR_Y + 6, 286],
    scale: [86, 12, 58],
    rotation: [0.03, 0.16, -0.015],
    color: ARENA_PALETTE.grassMound,
    highlight: ARENA_PALETTE.grassMoundLight,
  },
  {
    id: 'entry-right-soft-rise',
    position: [452, MUSEUM_SCALE_FLOOR_Y + 7, 214],
    scale: [92, 13, 62],
    rotation: [-0.02, -0.2, 0.02],
    color: ARENA_PALETTE.grassMound,
    highlight: ARENA_PALETTE.grassMoundLight,
  },
  {
    id: 'west-boulder-ridge-ground',
    position: [-462, MUSEUM_SCALE_FLOOR_Y + 12, -28],
    scale: [132, 22, 104],
    rotation: [0.04, -0.1, 0.018],
    color: ARENA_PALETTE.grassMound,
  },
  {
    id: 'east-broken-stone-ground',
    position: [482, MUSEUM_SCALE_FLOOR_Y + 14, -178],
    scale: [136, 25, 96],
    rotation: [-0.03, 0.22, -0.01],
    color: ARENA_PALETTE.grassMound,
  },
  {
    id: 'far-gate-left-rise',
    position: [-420, MUSEUM_SCALE_FLOOR_Y + 16, -430],
    scale: [110, 28, 82],
    rotation: [0.02, 0.28, 0.015],
    color: ARENA_PALETTE.grassMound,
  },
  {
    id: 'far-gate-right-rise',
    position: [432, MUSEUM_SCALE_FLOOR_Y + 17, -436],
    scale: [114, 30, 84],
    rotation: [-0.025, -0.24, -0.012],
    color: ARENA_PALETTE.grassMound,
  },
]

const TERRAIN_SHELVES: TerrainShelf[] = [
  {
    id: 'west-low-cliff-shelf',
    position: [-488, MUSEUM_SCALE_FLOOR_Y, 96],
    scale: [82, 5.2, 112],
    color: ARENA_PALETTE.cliffSide,
    topColor: ARENA_PALETTE.grassMoundLight,
    rotationY: 0.08,
  },
  {
    id: 'east-broken-stone-shelf',
    position: [502, MUSEUM_SCALE_FLOOR_Y, -116],
    scale: [88, 5.8, 116],
    color: ARENA_PALETTE.cliffSideWarm,
    topColor: ARENA_PALETTE.grassMoundLight,
    rotationY: -0.12,
  },
  {
    id: 'far-left-approach-shelf',
    position: [-474, MUSEUM_SCALE_FLOOR_Y, -306],
    scale: [80, 5.4, 92],
    color: ARENA_PALETTE.cliffSide,
    topColor: ARENA_PALETTE.grassMoundLight,
    rotationY: -0.2,
  },
  {
    id: 'far-right-approach-shelf',
    position: [488, MUSEUM_SCALE_FLOOR_Y, -318],
    scale: [84, 5.9, 96],
    color: ARENA_PALETTE.cliffSideWarm,
    topColor: ARENA_PALETTE.grassMoundLight,
    rotationY: 0.18,
  },
]

const AMANITA_PATCHES: AmanitaPatch[] = [
  {
    id: 'arrival-left-amanitas',
    position: [-128, MUSEUM_SCALE_FLOOR_Y, 236],
    yaw: 0.24,
    colliderRadius: 12,
    clearHeight: 6.8,
    mushrooms: [
      { offset: [0, 0, 0], size: 7.8, yaw: 0.1, lean: -0.08, capColor: ARENA_PALETTE.mushroomCap },
      { offset: [-10, 0, 8], size: 4.8, yaw: -0.44, lean: 0.12, capColor: ARENA_PALETTE.mushroomCapDeep, capSquash: 0.86 },
      { offset: [9, 0, -7], size: 5.7, yaw: 0.7, lean: -0.16, capColor: ARENA_PALETTE.mushroomCapGold, capSquash: 1.08 },
    ],
  },
  {
    id: 'arrival-right-amanitas',
    position: [132, MUSEUM_SCALE_FLOOR_Y, 164],
    yaw: -0.38,
    colliderRadius: 14,
    clearHeight: 8.2,
    mushrooms: [
      { offset: [-5, 0, -2], size: 9.2, yaw: -0.25, lean: 0.1, capColor: ARENA_PALETTE.mushroomCap },
      { offset: [11, 0, 7], size: 5.2, yaw: 0.54, lean: -0.1, capColor: ARENA_PALETTE.mushroomCapDeep },
      { offset: [-14, 0, 10], size: 4.6, yaw: -0.8, lean: 0.18, capColor: ARENA_PALETTE.mushroomCapGold, capSquash: 0.9 },
    ],
  },
  {
    id: 'middle-left-amanita-ring',
    position: [-144, MUSEUM_SCALE_FLOOR_Y, -54],
    yaw: -0.14,
    colliderRadius: 15,
    clearHeight: 8.8,
    mushrooms: [
      { offset: [0, 0, 0], size: 10.1, yaw: 0.4, lean: -0.05, capColor: ARENA_PALETTE.mushroomCap },
      { offset: [-13, 0, -9], size: 6.2, yaw: -0.5, lean: 0.13, capColor: ARENA_PALETTE.mushroomCapDeep },
      { offset: [13, 0, 9], size: 5.4, yaw: 0.95, lean: -0.18, capColor: ARENA_PALETTE.mushroomCap },
      { offset: [2, 0, 17], size: 4.4, yaw: 0.1, lean: 0.2, capColor: ARENA_PALETTE.mushroomCapGold, capSquash: 0.84 },
    ],
  },
  {
    id: 'middle-right-amanita-clump',
    position: [154, MUSEUM_SCALE_FLOOR_Y, -150],
    yaw: 0.42,
    colliderRadius: 14,
    clearHeight: 8.4,
    mushrooms: [
      { offset: [-4, 0, 0], size: 8.6, yaw: -0.2, lean: 0.11, capColor: ARENA_PALETTE.mushroomCapDeep, capSquash: 1.06 },
      { offset: [10, 0, -8], size: 6.1, yaw: 0.6, lean: -0.14, capColor: ARENA_PALETTE.mushroomCap },
      { offset: [-13, 0, 10], size: 5.2, yaw: -0.82, lean: 0.08, capColor: ARENA_PALETTE.mushroomCapGold },
    ],
  },
  {
    id: 'moat-left-amanita-bank',
    position: [-226, MUSEUM_SCALE_FLOOR_Y, -360],
    yaw: -0.52,
    colliderRadius: 16,
    clearHeight: 9.2,
    mushrooms: [
      { offset: [0, 0, 0], size: 11.4, yaw: -0.12, lean: 0.06, capColor: ARENA_PALETTE.mushroomCap },
      { offset: [14, 0, -9], size: 7.2, yaw: 0.62, lean: -0.12, capColor: ARENA_PALETTE.mushroomCapDeep },
      { offset: [-13, 0, 12], size: 5.8, yaw: -0.76, lean: 0.16, capColor: ARENA_PALETTE.mushroomCapGold, capSquash: 0.86 },
    ],
  },
  {
    id: 'moat-right-amanita-bank',
    position: [230, MUSEUM_SCALE_FLOOR_Y, -350],
    yaw: 0.48,
    colliderRadius: 15,
    clearHeight: 8.8,
    mushrooms: [
      { offset: [0, 0, 0], size: 10.4, yaw: 0.26, lean: -0.08, capColor: ARENA_PALETTE.mushroomCapDeep },
      { offset: [-12, 0, -10], size: 6.5, yaw: -0.64, lean: 0.1, capColor: ARENA_PALETTE.mushroomCap },
      { offset: [13, 0, 12], size: 5.4, yaw: 0.88, lean: -0.16, capColor: ARENA_PALETTE.mushroomCapGold },
    ],
  },
  {
    id: 'entry-left-hero-amanita',
    position: [-168, MUSEUM_SCALE_FLOOR_Y, 292],
    yaw: -0.18,
    colliderRadius: 18,
    clearHeight: 10.8,
    mushrooms: [
      { offset: [0, 0, 0], size: 13.6, yaw: 0.12, lean: -0.07, capColor: ARENA_PALETTE.mushroomCap },
      { offset: [15, 0, 9], size: 7.4, yaw: 0.56, lean: 0.14, capColor: ARENA_PALETTE.mushroomCapDeep },
      { offset: [-14, 0, -8], size: 6.2, yaw: -0.58, lean: -0.12, capColor: ARENA_PALETTE.mushroomCapGold },
    ],
  },
  {
    id: 'east-path-hero-amanita',
    position: [176, MUSEUM_SCALE_FLOOR_Y, -36],
    yaw: 0.28,
    colliderRadius: 17,
    clearHeight: 10.2,
    mushrooms: [
      { offset: [0, 0, 0], size: 12.8, yaw: -0.16, lean: 0.08, capColor: ARENA_PALETTE.mushroomCap },
      { offset: [-14, 0, 10], size: 6.8, yaw: -0.72, lean: -0.12, capColor: ARENA_PALETTE.mushroomCapDeep },
      { offset: [13, 0, -9], size: 5.8, yaw: 0.66, lean: 0.18, capColor: ARENA_PALETTE.mushroomCapGold, capSquash: 0.9 },
    ],
  },
  {
    id: 'secret-grove-tall-amanitas',
    position: [-258, MUSEUM_SCALE_FLOOR_Y, -118],
    yaw: -0.32,
    colliderRadius: 19,
    clearHeight: 11.2,
    mushrooms: [
      { offset: [0, 0, 0], size: 14.2, yaw: 0.18, lean: -0.12, capColor: ARENA_PALETTE.mushroomCap },
      { offset: [-16, 0, 10], size: 7.8, yaw: -0.72, lean: 0.14, capColor: ARENA_PALETTE.mushroomCapDeep },
      { offset: [16, 0, -10], size: 6.4, yaw: 0.64, lean: -0.18, capColor: ARENA_PALETTE.mushroomCapGold, capSquash: 0.86 },
    ],
  },
  {
    id: 'right-bank-secret-amanitas',
    position: [272, MUSEUM_SCALE_FLOOR_Y, -476],
    yaw: 0.12,
    colliderRadius: 18,
    clearHeight: 10.6,
    mushrooms: [
      { offset: [0, 0, 0], size: 12.9, yaw: -0.26, lean: 0.08, capColor: ARENA_PALETTE.mushroomCap },
      { offset: [14, 0, 8], size: 7.1, yaw: 0.78, lean: -0.16, capColor: ARENA_PALETTE.mushroomCapDeep },
      { offset: [-14, 0, -9], size: 5.9, yaw: -0.66, lean: 0.14, capColor: ARENA_PALETTE.mushroomCapGold },
    ],
  },
]

const WILDFLOWER_PATCHES: WildflowerPatch[] = [
  {
    id: 'arrival-wildflower-spray',
    position: [-96, MUSEUM_SCALE_FLOOR_Y, 214],
    yaw: -0.28,
    flowers: [
      { offset: [-8, 0, -3], height: 6.2, bloomSize: 1.3, color: ARENA_PALETTE.flowerCream, accent: ARENA_PALETTE.flowerYellow, kind: 'daisy', lean: -0.12 },
      { offset: [-2, 0, 4], height: 7.8, bloomSize: 1.15, color: ARENA_PALETTE.flowerBlue, accent: ARENA_PALETTE.flowerCream, kind: 'bell', lean: 0.08 },
      { offset: [5, 0, -5], height: 5.4, bloomSize: 1.1, color: ARENA_PALETTE.flowerCoral, accent: ARENA_PALETTE.flowerCream, kind: 'pom', lean: 0.16 },
      { offset: [10, 0, 3], height: 6.9, bloomSize: 1.0, color: ARENA_PALETTE.flowerViolet, accent: ARENA_PALETTE.flowerYellow, kind: 'daisy', lean: -0.06 },
    ],
  },
  {
    id: 'right-grove-wildflowers',
    position: [174, MUSEUM_SCALE_FLOOR_Y, 126],
    yaw: 0.36,
    flowers: [
      { offset: [-9, 0, 2], height: 6.8, bloomSize: 1.08, color: ARENA_PALETTE.flowerPink, accent: ARENA_PALETTE.flowerCream, kind: 'pom', lean: 0.12 },
      { offset: [-3, 0, -6], height: 8.2, bloomSize: 1.2, color: ARENA_PALETTE.flowerCream, accent: ARENA_PALETTE.flowerCoral, kind: 'daisy', lean: -0.1 },
      { offset: [4, 0, 5], height: 6.0, bloomSize: 1.0, color: ARENA_PALETTE.flowerBlue, accent: ARENA_PALETTE.flowerYellow, kind: 'bell', lean: 0.18 },
      { offset: [11, 0, -2], height: 7.4, bloomSize: 1.08, color: ARENA_PALETTE.flowerYellow, accent: ARENA_PALETTE.flowerPink, kind: 'daisy', lean: -0.16 },
    ],
  },
  {
    id: 'pond-edge-stem-flowers',
    position: [-190, MUSEUM_SCALE_FLOOR_Y, 36],
    yaw: 0.14,
    flowers: [
      { offset: [-7, 0, -4], height: 5.8, bloomSize: 0.96, color: ARENA_PALETTE.flowerViolet, accent: ARENA_PALETTE.flowerCream, kind: 'bell', lean: -0.18 },
      { offset: [0, 0, 2], height: 7.0, bloomSize: 1.14, color: ARENA_PALETTE.flowerCream, accent: ARENA_PALETTE.flowerYellow, kind: 'daisy', lean: 0.08 },
      { offset: [8, 0, -3], height: 6.2, bloomSize: 1.08, color: ARENA_PALETTE.flowerCoral, accent: ARENA_PALETTE.flowerBlue, kind: 'pom', lean: 0.14 },
    ],
  },
  {
    id: 'museum-approach-flower-clump',
    position: [212, MUSEUM_SCALE_FLOOR_Y, -332],
    yaw: -0.42,
    flowers: [
      { offset: [-8, 0, 4], height: 7.2, bloomSize: 1.2, color: ARENA_PALETTE.flowerCream, accent: ARENA_PALETTE.flowerCoral, kind: 'daisy', lean: -0.1 },
      { offset: [-1, 0, -3], height: 5.9, bloomSize: 1.02, color: ARENA_PALETTE.flowerPink, accent: ARENA_PALETTE.flowerYellow, kind: 'pom', lean: 0.18 },
      { offset: [7, 0, 5], height: 7.8, bloomSize: 1.08, color: ARENA_PALETTE.flowerBlue, accent: ARENA_PALETTE.flowerCream, kind: 'bell', lean: -0.16 },
    ],
  },
]

const BUSH_CLUSTERS: BushCluster[] = [
  { id: 'arrival-left-soft-bush', position: [-106, MUSEUM_SCALE_FLOOR_Y, 304], yaw: -0.16, scale: [21, 8.2, 16], color: ARENA_PALETTE.bush, accent: ARENA_PALETTE.bushLight, colliderRadius: 16, clearHeight: 7.6 },
  { id: 'arrival-right-soft-bush', position: [112, MUSEUM_SCALE_FLOOR_Y, 260], yaw: 0.2, scale: [20, 7.6, 15], color: ARENA_PALETTE.bushBlue, accent: ARENA_PALETTE.bushLight, colliderRadius: 15, clearHeight: 7.2 },
  { id: 'west-path-bush-wall-a', position: [-118, MUSEUM_SCALE_FLOOR_Y, 112], yaw: 0.38, scale: [24, 9.4, 18], color: ARENA_PALETTE.bushDeep, accent: ARENA_PALETTE.bushLight, colliderRadius: 18, clearHeight: 8.2 },
  { id: 'east-path-bush-wall-a', position: [124, MUSEUM_SCALE_FLOOR_Y, 32], yaw: -0.24, scale: [23, 8.8, 17], color: ARENA_PALETTE.bush, accent: ARENA_PALETTE.bushBlue, colliderRadius: 17, clearHeight: 8 },
  { id: 'west-mid-bloom-bush', position: [-136, MUSEUM_SCALE_FLOOR_Y, -168], yaw: -0.46, scale: [25, 9.8, 19], color: ARENA_PALETTE.bushBlue, accent: ARENA_PALETTE.flowerPink, colliderRadius: 19, clearHeight: 8.4 },
  { id: 'east-mid-bloom-bush', position: [142, MUSEUM_SCALE_FLOOR_Y, -236], yaw: 0.34, scale: [25, 9.6, 18], color: ARENA_PALETTE.bushDeep, accent: ARENA_PALETTE.flowerCream, colliderRadius: 18, clearHeight: 8.3 },
  { id: 'forecourt-left-bush', position: [-192, MUSEUM_SCALE_FLOOR_Y, -328], yaw: 0.22, scale: [28, 10.5, 20], color: ARENA_PALETTE.bush, accent: ARENA_PALETTE.bushLight, colliderRadius: 20, clearHeight: 9.2 },
  { id: 'forecourt-right-bush', position: [196, MUSEUM_SCALE_FLOOR_Y, -318], yaw: -0.28, scale: [28, 10.2, 20], color: ARENA_PALETTE.bushBlue, accent: ARENA_PALETTE.flowerCream, colliderRadius: 20, clearHeight: 9.2 },
  { id: 'left-moat-low-bush', position: [-292, MUSEUM_SCALE_FLOOR_Y, -416], yaw: -0.12, scale: [22, 7.8, 15], color: ARENA_PALETTE.bushDeep, accent: ARENA_PALETTE.bushLight, colliderRadius: 16, clearHeight: 7.4 },
  { id: 'right-moat-low-bush', position: [300, MUSEUM_SCALE_FLOOR_Y, -420], yaw: 0.18, scale: [22, 7.8, 15], color: ARENA_PALETTE.bush, accent: ARENA_PALETTE.flowerPink, colliderRadius: 16, clearHeight: 7.4 },
  { id: 'arrival-left-wide-bush', position: [-158, MUSEUM_SCALE_FLOOR_Y, 210], yaw: 0.1, scale: [26, 8.6, 17], color: ARENA_PALETTE.bushBlue, accent: ARENA_PALETTE.flowerPink, colliderRadius: 18, clearHeight: 8.2 },
  { id: 'arrival-right-wide-bush', position: [164, MUSEUM_SCALE_FLOOR_Y, 118], yaw: -0.18, scale: [26, 8.9, 18], color: ARENA_PALETTE.bushDeep, accent: ARENA_PALETTE.bushLight, colliderRadius: 19, clearHeight: 8.4 },
  { id: 'west-middle-edge-bush', position: [-168, MUSEUM_SCALE_FLOOR_Y, 18], yaw: -0.36, scale: [24, 8.1, 16], color: ARENA_PALETTE.bush, accent: ARENA_PALETTE.flowerCream, colliderRadius: 17, clearHeight: 7.8 },
  { id: 'east-middle-edge-bush', position: [174, MUSEUM_SCALE_FLOOR_Y, -98], yaw: 0.32, scale: [25, 8.6, 17], color: ARENA_PALETTE.bushBlue, accent: ARENA_PALETTE.bushLight, colliderRadius: 18, clearHeight: 8.2 },
  { id: 'left-bridge-thicket', position: [-248, MUSEUM_SCALE_FLOOR_Y, -382], yaw: 0.46, scale: [23, 8.4, 16], color: ARENA_PALETTE.bushDeep, accent: ARENA_PALETTE.flowerPink, colliderRadius: 17, clearHeight: 8 },
  { id: 'right-bridge-thicket', position: [248, MUSEUM_SCALE_FLOOR_Y, -382], yaw: -0.4, scale: [23, 8.4, 16], color: ARENA_PALETTE.bush, accent: ARENA_PALETTE.flowerCream, colliderRadius: 17, clearHeight: 8 },
  { id: 'secret-grove-entry-bush', position: [-214, MUSEUM_SCALE_FLOOR_Y, 126], yaw: 0.28, scale: [31, 10.4, 21], color: ARENA_PALETTE.bushDeep, accent: ARENA_PALETTE.flowerCream, colliderRadius: 22, clearHeight: 9.6 },
  { id: 'secret-grove-inner-bush', position: [-294, MUSEUM_SCALE_FLOOR_Y, -42], yaw: -0.22, scale: [30, 10.1, 22], color: ARENA_PALETTE.bushBlue, accent: ARENA_PALETTE.flowerPink, colliderRadius: 22, clearHeight: 9.4 },
  { id: 'secret-grove-exit-bush', position: [-270, MUSEUM_SCALE_FLOOR_Y, -246], yaw: 0.38, scale: [27, 9.6, 20], color: ARENA_PALETTE.bush, accent: ARENA_PALETTE.bushLight, colliderRadius: 20, clearHeight: 9 },
  { id: 'right-stone-bank-bush', position: [304, MUSEUM_SCALE_FLOOR_Y, -452], yaw: -0.34, scale: [29, 9.8, 21], color: ARENA_PALETTE.bushBlue, accent: ARENA_PALETTE.flowerCream, colliderRadius: 21, clearHeight: 9.2 },
  { id: 'right-secret-pocket-bush', position: [344, MUSEUM_SCALE_FLOOR_Y, -514], yaw: 0.22, scale: [25, 8.6, 18], color: ARENA_PALETTE.bushDeep, accent: ARENA_PALETTE.flowerPink, colliderRadius: 18, clearHeight: 8.2 },
]

const DECORATIVE_STONE_CLUSTERS: DecorativeStoneCluster[] = [
  {
    id: 'left-path-flat-stones',
    position: [-178, MUSEUM_SCALE_FLOOR_Y, 182],
    yaw: -0.22,
    colliderRadius: 14,
    clearHeight: 8.2,
    pieces: [
      { offset: [0, 4.2, 0], scale: [18, 8.4, 12], rotation: [0.08, 0.22, -0.08], color: ARENA_PALETTE.rockLight },
      { offset: [15, 2.8, -8], scale: [10, 5.6, 8], rotation: [-0.12, -0.44, 0.14], color: ARENA_PALETTE.rockWarm },
      { offset: [-13, 2.4, 7], scale: [9, 4.8, 7], rotation: [0.14, 0.66, -0.12], color: ARENA_PALETTE.rockShadow },
    ],
  },
  {
    id: 'right-path-stacked-stones',
    position: [184, MUSEUM_SCALE_FLOOR_Y, 82],
    yaw: 0.34,
    colliderRadius: 13,
    clearHeight: 8.8,
    pieces: [
      { offset: [0, 4.8, 0], scale: [13, 9.6, 11], rotation: [-0.12, 0.4, 0.12], color: ARENA_PALETTE.rockWarm },
      { offset: [-10, 8.2, -6], scale: [8, 7.2, 7], rotation: [0.18, -0.24, -0.14], color: ARENA_PALETTE.rockLight },
      { offset: [11, 3.1, 8], scale: [8, 5.4, 7], rotation: [-0.18, 0.72, 0.08], color: ARENA_PALETTE.rock },
    ],
  },
  {
    id: 'left-upper-chip-stones',
    position: [-210, MUSEUM_SCALE_FLOOR_Y, -246],
    yaw: 0.12,
    colliderRadius: 12,
    clearHeight: 7.4,
    pieces: [
      { offset: [0, 3.6, 0], scale: [14, 7.2, 10], rotation: [0.2, -0.36, 0.12], color: ARENA_PALETTE.rock },
      { offset: [-11, 2.4, -7], scale: [8, 4.8, 7], rotation: [-0.1, 0.5, -0.16], color: ARENA_PALETTE.rockWarm },
      { offset: [12, 2.7, 6], scale: [9, 5.4, 7], rotation: [0.08, -0.62, 0.14], color: ARENA_PALETTE.rockLight },
    ],
  },
  {
    id: 'right-upper-oblong-stones',
    position: [252, MUSEUM_SCALE_FLOOR_Y, -276],
    yaw: -0.28,
    colliderRadius: 15,
    clearHeight: 8.6,
    pieces: [
      { offset: [0, 4.2, 0], scale: [20, 7.8, 10], rotation: [0.06, 0.2, -0.1], color: ARENA_PALETTE.rockWarm },
      { offset: [17, 2.8, 7], scale: [10, 5.2, 7], rotation: [-0.16, -0.44, 0.12], color: ARENA_PALETTE.rockShadow },
      { offset: [-16, 3.2, -8], scale: [11, 6.2, 8], rotation: [0.12, 0.58, -0.06], color: ARENA_PALETTE.rockLight },
    ],
  },
]

const ROCK_FORMATION_COLLIDER_RADIUS: Record<string, number> = {
  'arrival-left-mass': 67,
  'arrival-right-mass': 70,
  'mid-left-cliff': 55,
  'mid-right-sentinel': 50,
  'far-left-gate-rock': 42,
  'far-right-gate-rock': 44,
}

const PATH_SEGMENTS: PathSegment[] = [
  { id: 'arrival-apron', x: 0, z: 292, width: 190, length: 190, yaw: 0.0, rise: 0.04 },
  { id: 'first-left-sweep', x: -24, z: 132, width: 178, length: 205, yaw: -0.085, rise: 1.18 },
  { id: 'middle-right-sweep', x: 20, z: -42, width: 172, length: 215, yaw: 0.095, rise: 2.74 },
  { id: 'upper-left-approach', x: -12, z: -222, width: 166, length: 220, yaw: -0.055, rise: 4.36 },
  { id: 'museum-forecourt-pad', x: 0, z: -352, width: 220, length: 118, yaw: 0.0, rise: MUSEUM_APPROACH_HILL_TOP_HEIGHT + 0.05 },
]

const HIDDEN_TRAIL_SEGMENTS: PathSegment[] = [
  { id: 'left-grove-entry-trail', x: -126, z: 202, width: 58, length: 132, yaw: -0.58, rise: 0.02 },
  { id: 'left-grove-bend-trail', x: -222, z: 82, width: 46, length: 174, yaw: -0.12, rise: 0.018 },
  { id: 'left-grove-pocket-trail', x: -246, z: -96, width: 42, length: 182, yaw: 0.18, rise: 0.018 },
  { id: 'left-grove-bridge-trail', x: -210, z: -286, width: 50, length: 168, yaw: -0.18, rise: 0.022 },
]

const RIGHT_STEPPING_STONES: SteppingStone[] = [
  { id: 'right-moat-stone-a', label: 'right stepping stones', x: 128, z: -378, radiusX: 21, radiusZ: 15, height: 0.34, yaw: -0.12, color: ARENA_PALETTE.steppingStone, topColor: ARENA_PALETTE.steppingStoneTop },
  { id: 'right-moat-stone-b', label: 'right stepping stones', x: 180, z: -410, radiusX: 24, radiusZ: 16, height: 0.38, yaw: 0.22, color: ARENA_PALETTE.steppingStoneWarm, topColor: ARENA_PALETTE.pathWarm },
  { id: 'right-moat-stone-c', label: 'right stepping stones', x: 236, z: -446, radiusX: 22, radiusZ: 15, height: 0.36, yaw: -0.3, color: ARENA_PALETTE.steppingStone, topColor: ARENA_PALETTE.steppingStoneTop },
  { id: 'right-moat-stone-d', label: 'right stepping stones', x: 298, z: -470, radiusX: 27, radiusZ: 18, height: 0.42, yaw: 0.16, color: ARENA_PALETTE.steppingStoneWarm, topColor: ARENA_PALETTE.pathWarm },
]

export const MUSEUM_SLOPE_SURFACES: MuseumSlopeSurface[] = [
  {
    id: 'main-promenade-uphill-grade',
    label: 'museum approach hill',
    x: 0,
    z: -50,
    halfX: 132,
    halfZ: 300,
    yaw: -0.015,
    lowHeight: 0.08,
    highHeight: MUSEUM_APPROACH_HILL_TOP_HEIGHT,
    riseAxis: 'z',
    riseSign: -1,
    color: ARENA_PALETTE.pathWarm,
    sideColor: ARENA_PALETTE.cliffSideWarm,
  },
  {
    id: 'museum-left-shoulder-grade',
    label: 'left museum hill shoulder',
    x: -246,
    z: -380,
    halfX: 48,
    halfZ: 116,
    yaw: -0.1,
    lowHeight: 2.25,
    highHeight: 5.35,
    riseAxis: 'z',
    riseSign: -1,
    color: ARENA_PALETTE.climbSlope,
    sideColor: ARENA_PALETTE.mossShadow,
  },
  {
    id: 'museum-right-shoulder-grade',
    label: 'right museum hill shoulder',
    x: 370,
    z: -422,
    halfX: 42,
    halfZ: 82,
    yaw: 0.18,
    lowHeight: 2.15,
    highHeight: 4.75,
    riseAxis: 'z',
    riseSign: -1,
    color: ARENA_PALETTE.climbSlope,
    sideColor: ARENA_PALETTE.mossShadow,
  },
  {
    id: 'left-meadow-rolling-slope',
    label: 'left rolling meadow',
    x: -298,
    z: -136,
    halfX: 82,
    halfZ: 106,
    yaw: 0.28,
    lowHeight: 0.35,
    highHeight: 3.2,
    riseAxis: 'z',
    riseSign: -1,
    color: ARENA_PALETTE.climbSlopeWarm,
    sideColor: ARENA_PALETTE.cliffSide,
  },
  {
    id: 'right-meadow-cross-slope',
    label: 'right rolling meadow',
    x: 300,
    z: 10,
    halfX: 96,
    halfZ: 70,
    yaw: -0.18,
    lowHeight: 0.28,
    highHeight: 2.85,
    riseAxis: 'x',
    riseSign: 1,
    color: ARENA_PALETTE.climbSlopeWarm,
    sideColor: ARENA_PALETTE.cliffSideWarm,
  },
  {
    id: 'left-grove-long-soft-slope',
    label: 'left grove slope',
    x: -226,
    z: 22,
    halfX: 38,
    halfZ: 122,
    yaw: -0.12,
    lowHeight: 0,
    highHeight: 3.25,
    riseAxis: 'z',
    riseSign: -1,
    color: ARENA_PALETTE.climbSlope,
    sideColor: ARENA_PALETTE.climbSlopeSide,
  },
  {
    id: 'west-shelf-grass-ramp',
    label: 'west shelf ramp',
    x: -430,
    z: 70,
    halfX: 70,
    halfZ: 42,
    yaw: 0.08,
    lowHeight: 0.15,
    highHeight: 5.2,
    riseAxis: 'x',
    riseSign: -1,
    color: ARENA_PALETTE.climbSlopeWarm,
    sideColor: ARENA_PALETTE.cliffSide,
  },
  {
    id: 'east-shelf-grass-ramp',
    label: 'east shelf ramp',
    x: 426,
    z: -146,
    halfX: 72,
    halfZ: 44,
    yaw: -0.12,
    lowHeight: 0.15,
    highHeight: 5.8,
    riseAxis: 'x',
    riseSign: 1,
    color: ARENA_PALETTE.climbSlopeWarm,
    sideColor: ARENA_PALETTE.cliffSideWarm,
  },
  {
    id: 'arrival-mound-learning-slope',
    label: 'arrival grass slope',
    x: -356,
    z: 286,
    halfX: 54,
    halfZ: 38,
    yaw: 0.14,
    lowHeight: 0,
    highHeight: 2.6,
    riseAxis: 'x',
    riseSign: -1,
    color: ARENA_PALETTE.climbSlope,
    sideColor: ARENA_PALETTE.mossShadow,
  },
  {
    id: 'right-bank-stone-slope',
    label: 'right bank slope',
    x: 308,
    z: -524,
    halfX: 46,
    halfZ: 44,
    yaw: 0.18,
    lowHeight: 0.42,
    highHeight: 3.8,
    riseAxis: 'z',
    riseSign: -1,
    color: ARENA_PALETTE.climbSlopeWarm,
    sideColor: ARENA_PALETTE.cliffSideWarm,
  },
]

const CLIMBABLE_AMANITA_PATCH_IDS = new Set([
  'arrival-left-amanitas',
  'arrival-right-amanitas',
  'middle-left-amanita-ring',
  'middle-right-amanita-clump',
  'moat-left-amanita-bank',
  'moat-right-amanita-bank',
])

const CLIMBABLE_AMANITA_TOPS: MuseumHoppablePlatform[] = AMANITA_PATCHES.filter((patch) =>
  CLIMBABLE_AMANITA_PATCH_IDS.has(patch.id),
).map((patch) => {
  const radius = Math.max(7, (patch.colliderRadius ?? 12) * 0.72)
  const height = Math.max(2.8, Math.min(8.35, (patch.clearHeight ?? 7.2) - 0.72))

  return {
    id: `top-amanita-${patch.id}`,
    label: 'amanita cap',
    shape: 'circle' as const,
    x: patch.position[0],
    z: patch.position[2],
    halfX: radius,
    halfZ: radius,
    radius,
    yaw: patch.yaw,
    height,
  }
})

const CLIMBABLE_BUSH_TOPS: MuseumHoppablePlatform[] = BUSH_CLUSTERS.map((bush) => {
  const radius = Math.max(8, (bush.colliderRadius ?? 14) * 0.76)
  const height = Math.max(2.8, Math.min(7.95, bush.scale[1] * 0.78))

  return {
    id: `top-bush-${bush.id}`,
    label: 'soft bush crown',
    shape: 'circle' as const,
    x: bush.position[0],
    z: bush.position[2],
    halfX: radius,
    halfZ: radius,
    radius,
    yaw: bush.yaw,
    height,
  }
})

const CLIMBABLE_STONE_TOPS: MuseumHoppablePlatform[] = DECORATIVE_STONE_CLUSTERS.map((cluster) => {
  const radius = Math.max(8, (cluster.colliderRadius ?? 12) * 0.78)
  const height = Math.max(3.2, Math.min(7.25, (cluster.clearHeight ?? 8) - 1.35))

  return {
    id: `top-stone-${cluster.id}`,
    label: 'low stone cluster',
    shape: 'circle' as const,
    x: cluster.position[0],
    z: cluster.position[2],
    halfX: radius,
    halfZ: radius,
    radius,
    yaw: cluster.yaw,
    height,
  }
})

const CLIMBABLE_PROP_TOPS: MuseumHoppablePlatform[] = [
  ...CLIMBABLE_AMANITA_TOPS,
  ...CLIMBABLE_BUSH_TOPS,
  ...CLIMBABLE_STONE_TOPS,
]

const CLIMBABLE_PROP_CLEAR_HEIGHT = new Map(
  CLIMBABLE_PROP_TOPS.map((platform) => [platform.id.replace(/^top-/, ''), Math.max(0.02, platform.height - 0.14)]),
)

function getClimbablePropClearHeight(colliderId: string, fallback: number) {
  return CLIMBABLE_PROP_CLEAR_HEIGHT.get(colliderId) ?? fallback
}

export const MUSEUM_WALKABLE_SURFACES: MuseumWalkableSurface[] = [
  ...PATH_SEGMENTS.map((segment) => ({
    id: segment.id,
    label: 'main path',
    kind: 'path' as const,
    x: segment.x,
    z: segment.z,
    halfX: segment.width * 0.5,
    halfZ: segment.length * 0.5,
    yaw: segment.yaw,
  })),
  ...HIDDEN_TRAIL_SEGMENTS.map((segment) => ({
    id: segment.id,
    label: 'hidden grove trail',
    kind: 'path' as const,
    x: segment.x,
    z: segment.z,
    halfX: segment.width * 0.5,
    halfZ: segment.length * 0.5,
    yaw: segment.yaw,
  })),
  ...RIGHT_STEPPING_STONES.map((stone) => ({
    id: stone.id,
    label: stone.label,
    kind: 'bridge' as const,
    x: stone.x,
    z: stone.z,
    halfX: stone.radiusX,
    halfZ: stone.radiusZ,
    yaw: stone.yaw,
  })),
  { id: 'main-bridge-deck', label: 'main bridge', kind: 'bridge', x: 0, z: -426, halfX: 44, halfZ: 68 },
  { id: 'side-bridge-deck', label: 'side bridge', kind: 'bridge', x: -158, z: -432, halfX: 24, halfZ: 69, yaw: -0.34 },
  { id: 'entry-landing', label: 'entry landing', kind: 'forecourt', x: 0, z: -462, halfX: 124, halfZ: 22 },
  { id: 'museum-steps-apron', label: 'museum steps', kind: 'forecourt', x: 0, z: -493, halfX: 128, halfZ: 40 },
]

export const MUSEUM_WATER_BOUNDARIES: MuseumWaterBoundary[] = [
  { id: 'front-moat-water', label: 'moat', x: 0, z: -436, halfX: 302, halfZ: 53 },
]

const MUSEUM_ROOF_STAIR_PLATFORMS: MuseumHoppablePlatform[] = [
  { id: 'museum-roof-stair-01', label: 'roof stair', shape: 'box', x: 58, z: -504.6, halfX: 13.6, halfZ: 8.8, height: 24.0 },
  { id: 'museum-roof-stair-02', label: 'roof stair', shape: 'box', x: 70, z: -504.1, halfX: 13.4, halfZ: 8.6, height: 29.35 },
  { id: 'museum-roof-stair-03', label: 'roof stair', shape: 'box', x: 82, z: -503.6, halfX: 13.2, halfZ: 8.4, height: 34.7 },
  { id: 'museum-roof-stair-04', label: 'roof stair', shape: 'box', x: 94, z: -503.1, halfX: 13.0, halfZ: 8.2, height: 40.05 },
  { id: 'museum-roof-stair-05', label: 'roof stair', shape: 'box', x: 106, z: -502.5, halfX: 12.8, halfZ: 8.0, height: 45.4 },
  { id: 'museum-roof-stair-06', label: 'roof stair', shape: 'box', x: 118, z: -501.9, halfX: 12.6, halfZ: 7.8, height: 50.75 },
  { id: 'museum-roof-stair-07', label: 'roof stair', shape: 'box', x: 130, z: -501.2, halfX: 12.4, halfZ: 7.6, height: 56.1 },
  { id: 'museum-roof-stair-landing', label: 'roof stair landing', shape: 'box', x: 144, z: -500.2, halfX: 17.5, halfZ: 10.2, height: 61.55 },
  { id: 'museum-roof-stair-08', label: 'roof stair', shape: 'box', x: 132, z: -499.3, halfX: 12.0, halfZ: 7.4, height: 67.0 },
  { id: 'museum-roof-stair-09', label: 'roof stair', shape: 'box', x: 120, z: -498.5, halfX: 11.8, halfZ: 7.2, height: 72.45 },
  { id: 'museum-roof-stair-10', label: 'roof stair', shape: 'box', x: 108, z: -497.7, halfX: 11.6, halfZ: 7.0, height: 77.9 },
  { id: 'museum-roof-stair-11', label: 'roof stair', shape: 'box', x: 96, z: -496.9, halfX: 11.4, halfZ: 6.8, height: 83.35 },
  { id: 'museum-roof-stair-12', label: 'roof stair', shape: 'box', x: 84, z: -496.1, halfX: 11.2, halfZ: 6.6, height: 88.8 },
  { id: 'museum-roof-stair-13', label: 'roof stair', shape: 'box', x: 72, z: -495.0, halfX: 11.0, halfZ: 6.4, height: 94.15 },
  { id: 'museum-roof-stair-14', label: 'roof stair', shape: 'box', x: 60, z: -493.8, halfX: 10.8, halfZ: 6.2, height: 98.65 },
  { id: 'museum-lower-roof-edge', label: 'museum lower roof', shape: 'box', x: 26, z: -493.8, halfX: 57, halfZ: 17, height: 99.0 },
]

export const MUSEUM_HOPPABLE_PLATFORMS: MuseumHoppablePlatform[] = [
  { id: 'hilltop-forecourt-apron', label: 'hilltop forecourt', shape: 'box', x: 0, z: -382, halfX: 118, halfZ: 34, height: MUSEUM_APPROACH_HILL_TOP_HEIGHT },
  { id: 'main-bridge-platform', label: 'main bridge', shape: 'box', x: 0, z: -426, halfX: 44, halfZ: 68, height: MUSEUM_BRIDGE_DECK_HEIGHT },
  { id: 'side-bridge-platform', label: 'side bridge', shape: 'box', x: -158, z: -432, halfX: 24, halfZ: 69, yaw: -0.34, height: MUSEUM_BRIDGE_DECK_HEIGHT },
  { id: 'entry-landing-platform', label: 'entry landing', shape: 'box', x: 0, z: -462, halfX: 124, halfZ: 22, height: MUSEUM_ENTRY_LANDING_HEIGHT },
  { id: 'museum-steps-apron-platform', label: 'museum steps apron', shape: 'box', x: 0, z: -493, halfX: 128, halfZ: 40, height: MUSEUM_ENTRY_LANDING_HEIGHT },
  { id: 'museum-step-low', label: 'museum low step', shape: 'box', x: 0, z: -468, halfX: 126, halfZ: 19, height: 6.4 },
  { id: 'museum-step-mid', label: 'museum middle step', shape: 'box', x: 0, z: -490, halfX: 110, halfZ: 17, height: 12.6 },
  { id: 'museum-step-upper', label: 'museum upper step', shape: 'box', x: 0, z: -512, halfX: 94, halfZ: 15, height: 18.8 },
  ...MUSEUM_ROOF_STAIR_PLATFORMS,
  ...RIGHT_STEPPING_STONES.map((stone) => ({
    id: stone.id,
    label: stone.label,
    shape: 'circle' as const,
    x: stone.x,
    z: stone.z,
    halfX: stone.radiusX,
    halfZ: stone.radiusZ,
    radius: Math.max(stone.radiusX, stone.radiusZ) * 0.92,
    yaw: stone.yaw,
    height: stone.height,
  })),
  ...TERRAIN_SHELVES.map((shelf) => ({
    id: `shelf-top-${shelf.id}`,
    label: 'cliff shelf',
    shape: 'box' as const,
    x: shelf.position[0],
    z: shelf.position[2],
    halfX: shelf.scale[0] * 0.52,
    halfZ: shelf.scale[2] * 0.52,
    yaw: shelf.rotationY,
    height: shelf.scale[1],
  })),
  ...CLIMBABLE_PROP_TOPS,
]

export const MUSEUM_SOLID_COLLIDERS: MuseumSolidCollider[] = [
  ...ROCK_FORMATIONS.map((formation) => ({
    id: `rock-${formation.id}`,
    kind: 'circle' as const,
    x: formation.position[0],
    z: formation.position[2],
    radius: ROCK_FORMATION_COLLIDER_RADIUS[formation.id] ?? 54,
    clearHeight: 92,
    bounce: 0.07,
  })),
  ...AMANITA_PATCHES.flatMap((patch) =>
    patch.colliderRadius
      ? [
          {
            id: `amanita-${patch.id}`,
            kind: 'circle' as const,
            x: patch.position[0],
            z: patch.position[2],
            radius: patch.colliderRadius,
            clearHeight: getClimbablePropClearHeight(`amanita-${patch.id}`, patch.clearHeight ?? 7),
            bounce: 0.06,
          },
        ]
      : [],
  ),
  ...BUSH_CLUSTERS.flatMap((bush) =>
    bush.colliderRadius
      ? [
          {
            id: `bush-${bush.id}`,
            kind: 'circle' as const,
            x: bush.position[0],
            z: bush.position[2],
            radius: bush.colliderRadius,
            clearHeight: getClimbablePropClearHeight(`bush-${bush.id}`, bush.clearHeight ?? 8),
            bounce: 0.055,
          },
        ]
      : [],
  ),
  ...DECORATIVE_STONE_CLUSTERS.flatMap((cluster) =>
    cluster.colliderRadius
      ? [
          {
            id: `stone-${cluster.id}`,
            kind: 'circle' as const,
            x: cluster.position[0],
            z: cluster.position[2],
            radius: cluster.colliderRadius,
            clearHeight: getClimbablePropClearHeight(`stone-${cluster.id}`, cluster.clearHeight ?? 8),
            bounce: 0.08,
          },
        ]
      : [],
  ),
  { id: 'museum-main-mass', kind: 'box', x: 0, z: -556, halfX: 98, halfZ: 26, clearHeight: 180, bounce: 0.05 },
  { id: 'museum-left-wing', kind: 'box', x: -144, z: -576, halfX: 52, halfZ: 24, clearHeight: 116, bounce: 0.05 },
  { id: 'museum-right-wing', kind: 'box', x: 144, z: -604, halfX: 52, halfZ: 72, clearHeight: 116, bounce: 0.05 },
  { id: 'museum-glass-atrium-front', kind: 'box', x: 126, z: -596, halfX: 64, halfZ: 71, clearHeight: 96, bounce: 0.05 },
  { id: 'museum-moba-sign', kind: 'box', x: -252, z: -342, halfX: 34, halfZ: 7, yaw: 0.14, clearHeight: 30, bounce: 0.06 },
  { id: 'museum-moba-sign-boulder', kind: 'circle', x: -194, z: -333, radius: 25, clearHeight: 28, bounce: 0.08 },
  { id: 'main-bridge-left-rail', kind: 'box', x: -56.2, z: -426, halfX: 3.2, halfZ: 58, clearHeight: MUSEUM_BRIDGE_DECK_HEIGHT + 4.8, bounce: 0.08 },
  { id: 'main-bridge-right-rail', kind: 'box', x: 56.2, z: -426, halfX: 3.2, halfZ: 58, clearHeight: MUSEUM_BRIDGE_DECK_HEIGHT + 4.8, bounce: 0.08 },
  { id: 'side-bridge-left-rail', kind: 'box', x: -174.6, z: -426, halfX: 2.8, halfZ: 60, yaw: -0.34, clearHeight: MUSEUM_BRIDGE_DECK_HEIGHT + 4.8, bounce: 0.08 },
  { id: 'side-bridge-right-rail', kind: 'box', x: -141.4, z: -438, halfX: 2.8, halfZ: 60, yaw: -0.34, clearHeight: MUSEUM_BRIDGE_DECK_HEIGHT + 4.8, bounce: 0.08 },
]

function GrassStrokes() {
  const strokes = useMemo(
    () =>
      Array.from({ length: 320 }, (_, index) => {
        const column = index % 40
        const row = Math.floor(index / 40)
        const x = -300 + column * 15.2 + ((index * 17) % 11) * 0.28
        const z = -350 + row * 98 + ((index * 23) % 13) * 0.36
        const onPath = Math.abs(x) < MUSEUM_SCALE_PATH.width * 0.52

        return {
          id: index,
          x: onPath ? x + Math.sign(x || 1) * (MUSEUM_SCALE_PATH.width * 0.7 + (index % 9) * 4.2) : x,
          z,
          width: 0.22 + (index % 4) * 0.08,
          length: 2.4 + (index % 5) * 0.38,
          yaw: ((index % 9) - 4) * 0.08,
          opacity: 0.07 + (index % 3) * 0.028,
        }
      }),
    [],
  )

  return (
    <>
      {strokes.map((stroke) => (
        <mesh
          key={stroke.id}
          position={[stroke.x, MUSEUM_SCALE_FLOOR_Y + 0.024, stroke.z]}
          rotation={[0, stroke.yaw, 0]}
          scale={[stroke.width, 0.03, stroke.length]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.grassDark} transparent opacity={stroke.opacity} />
        </mesh>
      ))}
    </>
  )
}

function HorizonGrassStrokes() {
  const strokes = useMemo(
    () =>
      Array.from({ length: 240 }, (_, index) => {
        const column = index % 48
        const row = Math.floor(index / 48)
        const x = -760 + column * 32.2 + ((index * 19) % 17) * 0.44
        const z = -720 + row * 186 + ((index * 29) % 23) * 0.58

        return {
          id: index,
          x,
          z,
          width: 0.24 + (index % 5) * 0.09,
          length: 5.8 + (index % 7) * 0.82,
          yaw: ((index % 13) - 6) * 0.045,
          opacity: 0.026 + (index % 4) * 0.01,
        }
      }),
    [],
  )

  return (
    <>
      {strokes.map((stroke) => (
        <mesh
          key={stroke.id}
          position={[stroke.x, MUSEUM_SCALE_FLOOR_Y - 0.006, stroke.z]}
          rotation={[0, stroke.yaw, 0]}
          scale={[stroke.width, 0.02, stroke.length]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.grassDark} transparent opacity={stroke.opacity} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}

function ScaleRock({ piece }: { piece: RockPiece }) {
  return (
    <group position={piece.offset} rotation={piece.rotation} scale={piece.scale}>
      <mesh>
        <dodecahedronGeometry args={[1, 0]} />
        <meshToonMaterial color={piece.color} />
      </mesh>
      <mesh scale={[1.035, 1.035, 1.035]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

function ScaleRockFormation({ formation }: { formation: RockFormation }) {
  return (
    <group position={formation.position}>
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[76, 52, 1]} renderOrder={-1}>
        <circleGeometry args={[1, 44]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {formation.pieces.map((piece, index) => (
        <ScaleRock key={`${formation.id}-${index}`} piece={piece} />
      ))}
    </group>
  )
}

function TerrainMoundMesh({ mound }: { mound: TerrainMound }) {
  return (
    <group position={mound.position} rotation={mound.rotation}>
      <mesh scale={mound.scale}>
        <sphereGeometry args={[1, 26, 12, 0, Math.PI * 2, 0, Math.PI * 0.54]} />
        <meshToonMaterial color={mound.color} />
      </mesh>
      <mesh scale={[mound.scale[0] * 1.012, mound.scale[1] * 1.04, mound.scale[2] * 1.012]}>
        <sphereGeometry args={[1, 26, 12, 0, Math.PI * 2, 0, Math.PI * 0.54]} />
        <meshBasicMaterial color={ARENA_PALETTE.mossShadow} side={THREE.BackSide} transparent opacity={0.62} />
      </mesh>
      {mound.highlight ? (
        <mesh position={[0, mound.scale[1] * 0.54, -mound.scale[2] * 0.1]} rotation={[-Math.PI / 2, 0, 0.08]} scale={[mound.scale[0] * 0.46, mound.scale[2] * 0.22, 1]}>
          <circleGeometry args={[1, 36]} />
          <meshBasicMaterial color={mound.highlight} transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
      <mesh position={[0, -mound.scale[1] * 0.46, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[mound.scale[0] * 0.82, mound.scale[2] * 0.68, 1]} renderOrder={-2}>
        <circleGeometry args={[1, 52]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function TerrainShelfMesh({ shelf }: { shelf: TerrainShelf }) {
  const [width, height, depth] = shelf.scale

  return (
    <group position={shelf.position} rotation={[0, shelf.rotationY ?? 0, 0]}>
      <mesh position={[0, height * 0.5, 0]} scale={shelf.scale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={shelf.color} />
      </mesh>
      <mesh position={[0, height * 0.5, 0]} scale={[width * 1.02, height * 1.04, depth * 1.02]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, height + 0.12, 0]} scale={[width * 0.96, 0.24, depth * 0.94]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={shelf.topColor} />
      </mesh>
      <mesh position={[0, height + 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[width * 0.34, depth * 0.21, 1]}>
        <circleGeometry args={[1, 40]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[width * 0.66, depth * 0.58, 1]} renderOrder={-2}>
        <circleGeometry args={[1, 52]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function SlopeRampMesh({ slope }: { slope: MuseumSlopeSurface }) {
  const heightDelta = slope.highHeight - slope.lowHeight
  const localLength = slope.riseAxis === 'z' ? slope.halfZ * 2 : slope.halfX * 2
  const angle = Math.atan2(heightDelta, localLength)
  const thickness = 0.72
  const rotationX = slope.riseAxis === 'z' ? (slope.riseSign === -1 ? angle : -angle) : 0
  const rotationZ = slope.riseAxis === 'x' ? (slope.riseSign === 1 ? angle : -angle) : 0
  const centerY = MUSEUM_SCALE_FLOOR_Y + (slope.lowHeight + slope.highHeight) * 0.5 - thickness * 0.5

  return (
    <group>
      <mesh
        position={[slope.x, MUSEUM_SCALE_FLOOR_Y + 0.028, slope.z]}
        rotation={[-Math.PI / 2, 0, slope.yaw ?? 0]}
        scale={[slope.halfX * 1.18, slope.halfZ * 1.16, 1]}
        renderOrder={-2}
      >
        <circleGeometry args={[1, 44]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <group position={[slope.x, centerY, slope.z]} rotation={[rotationX, slope.yaw ?? 0, rotationZ]}>
        <mesh scale={[slope.halfX * 2, thickness, slope.halfZ * 2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshToonMaterial color={slope.color ?? ARENA_PALETTE.climbSlope} />
        </mesh>
        <mesh position={[0, thickness * 0.54, 0]} scale={[slope.halfX * 1.42, 0.04, slope.halfZ * 1.36]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.045} depthWrite={false} />
        </mesh>
        {[
          { key: 'left', position: [-slope.halfX, thickness * 0.58, 0] as const, scale: [0.95, 0.14, slope.halfZ * 2.02] as const },
          { key: 'right', position: [slope.halfX, thickness * 0.58, 0] as const, scale: [0.95, 0.14, slope.halfZ * 2.02] as const },
          { key: 'near', position: [0, thickness * 0.58, -slope.halfZ] as const, scale: [slope.halfX * 2.02, 0.14, 0.95] as const },
          { key: 'far', position: [0, thickness * 0.58, slope.halfZ] as const, scale: [slope.halfX * 2.02, 0.14, 0.95] as const },
        ].map((edge) => (
          <mesh key={edge.key} position={edge.position} scale={edge.scale}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.42} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

const AMANITA_DECAL_SPOT_PATTERNS = [
  [
    { x: -0.31, z: -0.28, rx: 0.072, rz: 0.05, rotation: -0.28, opacity: 0.92 },
    { x: 0.24, z: -0.1, rx: 0.058, rz: 0.043, rotation: 0.24, opacity: 0.95 },
    { x: -0.08, z: 0.24, rx: 0.046, rz: 0.032, rotation: -0.18, opacity: 0.88 },
    { x: 0.44, z: 0.24, rx: 0.038, rz: 0.028, rotation: 0.42, opacity: 0.84 },
    { x: -0.52, z: 0.08, rx: 0.034, rz: 0.024, rotation: -0.06, opacity: 0.82 },
    { x: 0.05, z: 0.48, rx: 0.03, rz: 0.022, rotation: 0.2, opacity: 0.78 },
    { x: 0.5, z: -0.36, rx: 0.026, rz: 0.02, rotation: -0.34, opacity: 0.76 },
  ],
  [
    { x: 0.18, z: -0.32, rx: 0.076, rz: 0.052, rotation: 0.18, opacity: 0.94 },
    { x: -0.32, z: -0.06, rx: 0.056, rz: 0.04, rotation: -0.38, opacity: 0.92 },
    { x: 0.36, z: 0.14, rx: 0.046, rz: 0.034, rotation: 0.32, opacity: 0.88 },
    { x: -0.04, z: 0.34, rx: 0.04, rz: 0.028, rotation: -0.1, opacity: 0.84 },
    { x: -0.54, z: 0.22, rx: 0.032, rz: 0.024, rotation: 0.22, opacity: 0.8 },
    { x: 0.58, z: -0.12, rx: 0.028, rz: 0.02, rotation: -0.2, opacity: 0.78 },
    { x: 0.08, z: 0.54, rx: 0.024, rz: 0.018, rotation: 0.48, opacity: 0.74 },
  ],
  [
    { x: -0.04, z: -0.34, rx: 0.068, rz: 0.046, rotation: -0.12, opacity: 0.92 },
    { x: -0.42, z: -0.18, rx: 0.052, rz: 0.038, rotation: 0.34, opacity: 0.9 },
    { x: 0.28, z: 0.06, rx: 0.052, rz: 0.036, rotation: -0.42, opacity: 0.88 },
    { x: -0.18, z: 0.28, rx: 0.04, rz: 0.028, rotation: 0.12, opacity: 0.84 },
    { x: 0.52, z: 0.34, rx: 0.032, rz: 0.024, rotation: -0.24, opacity: 0.78 },
    { x: 0.5, z: -0.32, rx: 0.028, rz: 0.02, rotation: 0.28, opacity: 0.76 },
  ],
  [
    { x: -0.24, z: -0.2, rx: 0.062, rz: 0.044, rotation: 0.22, opacity: 0.92 },
    { x: 0.3, z: -0.26, rx: 0.05, rz: 0.036, rotation: -0.22, opacity: 0.9 },
    { x: 0.02, z: 0.18, rx: 0.044, rz: 0.032, rotation: 0.36, opacity: 0.86 },
    { x: -0.48, z: 0.2, rx: 0.034, rz: 0.024, rotation: -0.14, opacity: 0.8 },
    { x: 0.48, z: 0.16, rx: 0.032, rz: 0.024, rotation: 0.18, opacity: 0.78 },
  ],
] as const

function getAmanitaDecalSpots(mushroom: AmanitaMushroomSpec) {
  const seed = Math.abs(
    Math.round(
      mushroom.size * 19 +
        mushroom.yaw * 37 +
        mushroom.lean * 53 +
        (mushroom.capSquash ?? 1) * 23 +
        mushroom.offset[0] * 0.7 +
        mushroom.offset[2] * 0.43,
    ),
  )
  const pattern = AMANITA_DECAL_SPOT_PATTERNS[seed % AMANITA_DECAL_SPOT_PATTERNS.length]
  const spotCount = mushroom.size < 5.4 ? 3 : mushroom.size < 7.4 ? 4 : mushroom.size < 10.5 ? 5 : 7

  return pattern.slice(0, spotCount)
}

function AmanitaMushroom({ mushroom }: { mushroom: AmanitaMushroomSpec }) {
  const stemHeight = mushroom.size * 0.7
  const stemRadius = mushroom.size * 0.13
  const capRadius = mushroom.size * 0.52
  const capHeight = mushroom.size * 0.24 * (mushroom.capSquash ?? 1)
  const capY = stemHeight + capHeight * 0.42
  const leanOffset = Math.sin(mushroom.lean) * mushroom.size * 0.22
  const capZRadius = capRadius * 0.9
  const decalSpots = useMemo(() => getAmanitaDecalSpots(mushroom), [mushroom])

  return (
    <group position={mushroom.offset} rotation={[0, mushroom.yaw, mushroom.lean * 0.42]}>
      <mesh position={[leanOffset * 0.34, stemHeight * 0.5, 0]} rotation={[0, 0, mushroom.lean * 0.62]} scale={[stemRadius, stemHeight, stemRadius * 0.9]}>
        <cylinderGeometry args={[0.72, 1, 1, 16]} />
        <meshToonMaterial color={ARENA_PALETTE.mushroomStem} />
      </mesh>
      <mesh position={[leanOffset * 0.34, stemHeight * 0.5, 0]} rotation={[0, 0, mushroom.lean * 0.62]} scale={[stemRadius * 1.1, stemHeight * 1.02, stemRadius]}>
        <cylinderGeometry args={[0.72, 1, 1, 16]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      <mesh position={[leanOffset, capY - capHeight * 0.28, 0]} scale={[capRadius * 0.84, mushroom.size * 0.045, capRadius * 0.74]}>
        <cylinderGeometry args={[1, 1, 1, 28]} />
        <meshToonMaterial color={ARENA_PALETTE.mushroomGills} />
      </mesh>
      <mesh position={[leanOffset, capY, 0]} scale={[capRadius, capHeight, capRadius * 0.9]}>
        <sphereGeometry args={[1, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshToonMaterial color={mushroom.capColor} />
      </mesh>
      <mesh position={[leanOffset, capY, 0]} scale={[capRadius * 1.045, capHeight * 1.06, capRadius * 0.94]}>
        <sphereGeometry args={[1, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      {decalSpots.map((spot, index) => {
        const localX = spot.x * capRadius
        const localZ = spot.z * capZRadius
        const normalizedDistance = Math.min(0.94, spot.x * spot.x + spot.z * spot.z)
        const localY = capHeight * Math.sqrt(Math.max(0.12, 1 - normalizedDistance))
        const normal = new THREE.Vector3(
          localX / (capRadius * capRadius),
          localY / (capHeight * capHeight),
          localZ / (capZRadius * capZRadius),
        ).normalize()
        const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal))

        return (
          <group key={index} position={[leanOffset + localX, capY + localY + 0.01, localZ]} rotation={rotation}>
            <mesh rotation={[0, 0, spot.rotation]} scale={[mushroom.size * spot.rx, mushroom.size * spot.rz, 1]} renderOrder={3}>
              <circleGeometry args={[1, 24]} />
              <meshBasicMaterial
                color={ARENA_PALETTE.mushroomSpot}
                side={THREE.DoubleSide}
                transparent
                opacity={spot.opacity}
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={-4}
                polygonOffsetUnits={-4}
                toneMapped={false}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function AmanitaPatchMesh({ patch }: { patch: AmanitaPatch }) {
  return (
    <group position={patch.position} rotation={[0, patch.yaw, 0]}>
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[patch.colliderRadius ? patch.colliderRadius * 1.4 : 20, patch.colliderRadius ? patch.colliderRadius : 14, 1]} renderOrder={-2}>
        <circleGeometry args={[1, 36]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.13} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {patch.mushrooms.map((mushroom, index) => (
        <AmanitaMushroom key={`${patch.id}-${index}`} mushroom={mushroom} />
      ))}
    </group>
  )
}

const DAISY_PETAL_ANGLES = [0, Math.PI * 0.34, Math.PI * 0.67, Math.PI, Math.PI * 1.34, Math.PI * 1.67] as const

function Wildflower({ flower }: { flower: WildflowerSpec }) {
  const lean = flower.lean ?? 0
  const bloomX = Math.sin(lean) * flower.height * 0.25
  const bloomSize = flower.bloomSize

  return (
    <group position={flower.offset} rotation={[0, flower.yaw ?? 0, 0]}>
      <mesh position={[0, flower.height * 0.5, 0]} rotation={[0, 0, lean]} scale={[0.22, flower.height, 0.22]}>
        <cylinderGeometry args={[1, 0.62, 1, 7]} />
        <meshBasicMaterial color={ARENA_PALETTE.grassDark} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.42, flower.height * 0.44, side * 0.08]}
          rotation={[0.1, side * 0.5, side * 0.42]}
          scale={[0.82, 0.22, 0.34]}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <meshToonMaterial color={ARENA_PALETTE.bushLight} />
        </mesh>
      ))}
      <group position={[bloomX, flower.height, 0]} rotation={[0, flower.yaw ?? 0, -lean * 0.25]}>
        {flower.kind === 'daisy' ? (
          <>
            {DAISY_PETAL_ANGLES.map((angle) => (
              <mesh
                key={angle}
                position={[Math.cos(angle) * bloomSize * 0.62, 0, Math.sin(angle) * bloomSize * 0.34]}
                rotation={[0.08, -angle, 0.12]}
                scale={[bloomSize * 0.46, bloomSize * 0.22, bloomSize * 0.25]}
              >
                <sphereGeometry args={[1, 8, 6]} />
                <meshBasicMaterial color={flower.color} />
              </mesh>
            ))}
            <mesh scale={[bloomSize * 0.34, bloomSize * 0.34, bloomSize * 0.34]}>
              <sphereGeometry args={[1, 9, 7]} />
              <meshBasicMaterial color={flower.accent} />
            </mesh>
          </>
        ) : flower.kind === 'bell' ? (
          <>
            <mesh rotation={[Math.PI, 0, 0]} scale={[bloomSize * 0.72, bloomSize * 0.9, bloomSize * 0.72]}>
              <coneGeometry args={[1, 1.24, 9]} />
              <meshToonMaterial color={flower.color} />
            </mesh>
            <mesh position={[0, -bloomSize * 0.42, 0]} scale={[bloomSize * 0.62, bloomSize * 0.12, bloomSize * 0.62]}>
              <cylinderGeometry args={[1, 1, 1, 12]} />
              <meshBasicMaterial color={flower.accent} />
            </mesh>
          </>
        ) : (
          <>
            {[-0.44, 0, 0.44].map((x, index) => (
              <mesh key={x} position={[x * bloomSize, index === 1 ? bloomSize * 0.18 : 0, index === 1 ? -bloomSize * 0.18 : bloomSize * 0.12]} scale={[bloomSize * 0.46, bloomSize * 0.46, bloomSize * 0.46]}>
                <sphereGeometry args={[1, 9, 7]} />
                <meshBasicMaterial color={index === 1 ? flower.accent : flower.color} />
              </mesh>
            ))}
          </>
        )}
      </group>
    </group>
  )
}

function WildflowerPatchMesh({ patch }: { patch: WildflowerPatch }) {
  return (
    <group position={patch.position} rotation={[0, patch.yaw, 0]}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[18, 10, 1]} renderOrder={-2}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color={ARENA_PALETTE.grassDark} transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {patch.flowers.map((flower, index) => (
        <Wildflower key={`${patch.id}-${index}`} flower={flower} />
      ))}
    </group>
  )
}

const BUSH_LOBES = [
  { offset: [-0.42, 0.42, -0.02], scale: [0.48, 0.42, 0.44] },
  { offset: [0.0, 0.52, -0.08], scale: [0.58, 0.5, 0.5] },
  { offset: [0.42, 0.4, 0.03], scale: [0.46, 0.4, 0.42] },
  { offset: [-0.12, 0.36, 0.36], scale: [0.42, 0.35, 0.34] },
  { offset: [0.24, 0.32, -0.42], scale: [0.38, 0.33, 0.36] },
] as const

function DecorativeBush({ bush }: { bush: BushCluster }) {
  return (
    <group position={bush.position} rotation={[0, bush.yaw, 0]}>
      <mesh position={[0, 0.034, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[bush.scale[0] * 0.82, bush.scale[2] * 0.68, 1]} renderOrder={-2}>
        <circleGeometry args={[1, 42]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {BUSH_LOBES.map((lobe, index) => (
        <group key={`${bush.id}-${index}`} position={[lobe.offset[0] * bush.scale[0], lobe.offset[1] * bush.scale[1], lobe.offset[2] * bush.scale[2]]}>
          <mesh scale={[lobe.scale[0] * bush.scale[0], lobe.scale[1] * bush.scale[1], lobe.scale[2] * bush.scale[2]]}>
            <sphereGeometry args={[1, 18, 12]} />
            <meshToonMaterial color={index === 1 ? bush.accent : bush.color} />
          </mesh>
          <mesh scale={[lobe.scale[0] * bush.scale[0] * 1.05, lobe.scale[1] * bush.scale[1] * 1.06, lobe.scale[2] * bush.scale[2] * 1.05]}>
            <sphereGeometry args={[1, 18, 12]} />
            <meshBasicMaterial color={ARENA_PALETTE.ink} side={THREE.BackSide} transparent opacity={0.68} />
          </mesh>
        </group>
      ))}
      {[-0.28, 0.18, 0.44].map((x, index) => (
        <mesh key={x} position={[x * bush.scale[0], bush.scale[1] * (0.82 + index * 0.03), (0.08 - index * 0.2) * bush.scale[2]]} scale={[1.15, 1.15, 1.15]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color={index % 2 === 0 ? ARENA_PALETTE.flowerCream : ARENA_PALETTE.flowerPink} />
        </mesh>
      ))}
    </group>
  )
}

function DecorativeStoneClusterMesh({ cluster }: { cluster: DecorativeStoneCluster }) {
  return (
    <group position={cluster.position} rotation={[0, cluster.yaw, 0]}>
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[cluster.colliderRadius ? cluster.colliderRadius * 1.32 : 18, cluster.colliderRadius ? cluster.colliderRadius * 0.9 : 12, 1]} renderOrder={-2}>
        <circleGeometry args={[1, 34]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {cluster.pieces.map((piece, index) => (
        <ScaleRock key={`${cluster.id}-${index}`} piece={piece} />
      ))}
    </group>
  )
}

function MuseumScaleOrnamentalProps() {
  return (
    <group>
      {BUSH_CLUSTERS.map((bush) => (
        <DecorativeBush key={bush.id} bush={bush} />
      ))}
      {AMANITA_PATCHES.map((patch) => (
        <AmanitaPatchMesh key={patch.id} patch={patch} />
      ))}
      {WILDFLOWER_PATCHES.map((patch) => (
        <WildflowerPatchMesh key={patch.id} patch={patch} />
      ))}
      {DECORATIVE_STONE_CLUSTERS.map((cluster) => (
        <DecorativeStoneClusterMesh key={cluster.id} cluster={cluster} />
      ))}
    </group>
  )
}

function MuseumScaleTerrain() {
  return (
    <group>
      {TERRAIN_MOUNDS.map((mound) => (
        <TerrainMoundMesh key={mound.id} mound={mound} />
      ))}
      {MUSEUM_SLOPE_SURFACES.map((slope) => (
        <SlopeRampMesh key={slope.id} slope={slope} />
      ))}
      {TERRAIN_SHELVES.map((shelf) => (
        <TerrainShelfMesh key={shelf.id} shelf={shelf} />
      ))}
    </group>
  )
}

function OutlinedBox({
  position,
  scale,
  color,
  outlineScale = 1.018,
  fog = true,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
  outlineScale?: number
  fog?: boolean
}) {
  const stableOutlineScale = getStableOutlineScale(scale, outlineScale)

  return (
    <group position={position}>
      <mesh scale={stableOutlineScale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color={ARENA_PALETTE.ink}
          side={THREE.BackSide}
          fog={fog}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <mesh scale={scale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={color} fog={fog} />
      </mesh>
    </group>
  )
}

function MuseumWallScuffs({
  z,
  marks,
  color = ARENA_PALETTE.ink,
}: {
  z: number
  marks: Array<[number, number, number, number]>
  color?: string
}) {
  return (
    <group>
      {marks.map(([x, y, width, height], index) => (
        <mesh key={`${x}-${y}-${index}`} position={[x, MUSEUM_SCALE_FLOOR_Y + y, z]} scale={[width, height, 0.24]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={color} transparent opacity={0.13} />
        </mesh>
      ))}
    </group>
  )
}

function MuseumPanelSeams({
  z,
  y,
  height,
  xs,
  opacity = 0.2,
}: {
  z: number
  y: number
  height: number
  xs: number[]
  opacity?: number
}) {
  return (
    <group>
      {xs.map((x) => (
        <mesh key={x} position={[x, MUSEUM_SCALE_FLOOR_Y + y, z]} scale={[1.15, height, 0.32]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={opacity} />
        </mesh>
      ))}
    </group>
  )
}

function PottedFern({
  position,
  scale = 1,
}: {
  position: [number, number, number]
  scale?: number
}) {
  const leaves = [
    { x: -0.9, z: 0, yaw: -0.52, pitch: -0.28, color: ARENA_PALETTE.museumFern },
    { x: -0.45, z: -0.35, yaw: -0.18, pitch: -0.18, color: ARENA_PALETTE.museumFernLight },
    { x: 0.0, z: 0.04, yaw: 0.08, pitch: -0.08, color: ARENA_PALETTE.museumFern },
    { x: 0.5, z: -0.32, yaw: 0.32, pitch: -0.18, color: ARENA_PALETTE.museumFernLight },
    { x: 0.9, z: 0.1, yaw: 0.58, pitch: -0.3, color: ARENA_PALETTE.museumFern },
  ]

  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh position={[0, 3.1, 0]} scale={[4.4, 5.2, 4.4]}>
        <cylinderGeometry args={[1, 0.76, 1, 18]} />
        <meshToonMaterial color={ARENA_PALETTE.museumCream} />
      </mesh>
      <mesh position={[0, 3.1, 0]} scale={[4.72, 5.36, 4.72]}>
        <cylinderGeometry args={[1, 0.76, 1, 18]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      {leaves.map((leaf, index) => (
        <mesh
          key={index}
          position={[leaf.x * 4.2, 7.2 + (index % 2) * 0.5, leaf.z * 4]}
          rotation={[leaf.pitch, leaf.yaw, 0.08 * (index - 2)]}
          scale={[5.2, 1.1, 2.0]}
        >
          <sphereGeometry args={[1, 14, 8]} />
          <meshToonMaterial color={leaf.color} />
        </mesh>
      ))}
      <mesh position={[0, 5.7, 0]} scale={[2.8, 1.1, 2.8]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color={ARENA_PALETTE.grassDark} />
      </mesh>
    </group>
  )
}

function MuseumDoorPlanter({ x }: { x: number }) {
  return (
    <group position={[x, MUSEUM_SCALE_FLOOR_Y + 18.8, -508]}>
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[10.8, 7.2, 1]} renderOrder={-1}>
        <circleGeometry args={[1, 28]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 4.0, 0]} scale={[8.8, 7.4, 8.8]}>
        <cylinderGeometry args={[1, 0.78, 1, 18]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumCream} fog={false} />
      </mesh>
      <mesh position={[0, 4.0, 0]} scale={[9.28, 7.7, 9.28]}>
        <cylinderGeometry args={[1, 0.78, 1, 18]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, 7.4, 0]} scale={[8.1, 1.2, 8.1]}>
        <cylinderGeometry args={[1, 0.92, 1, 18]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} />
      </mesh>
      <mesh position={[0, 8.9, 0]} scale={[9.2, 3.4, 7.1]}>
        <sphereGeometry args={[1, 16, 9]} />
        <meshToonMaterial color={ARENA_PALETTE.bushLight} />
      </mesh>
      <mesh position={[0, 8.2, -1.1]} scale={[6.2, 1.6, 5.2]}>
        <sphereGeometry args={[1, 14, 8]} />
        <meshToonMaterial color={ARENA_PALETTE.museumFern} />
      </mesh>
      {[
        [-4.8, 11.6, -1.4, ARENA_PALETTE.flowerPink],
        [-2.1, 12.6, 0.4, ARENA_PALETTE.flowerCream],
        [1.4, 12.2, -0.8, ARENA_PALETTE.flowerBlue],
        [4.4, 11.4, 0.8, ARENA_PALETTE.flowerYellow],
        [0.2, 13.2, 1.2, ARENA_PALETTE.flowerViolet],
      ].map(([offsetX, offsetY, offsetZ, color], index) => (
        <mesh key={`door-planter-bloom-${x}-${index}`} position={[Number(offsetX), Number(offsetY), Number(offsetZ)]} scale={[1.55, 1.55, 1.55]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color={String(color)} />
        </mesh>
      ))}
    </group>
  )
}

function MuseumEntryTreads({ showProcessionalSlabs = true }: { showProcessionalSlabs?: boolean } = {}) {
  const floorY = MUSEUM_SCALE_FLOOR_Y
  const treads = [
    { y: 6.58, z: -448.6, width: 250, highlightWidth: 238 },
    { y: 12.72, z: -472.6, width: 218, highlightWidth: 206 },
    { y: 18.92, z: -496.2, width: 186, highlightWidth: 174 },
  ]
  const processionalSlabs = Array.from({ length: 7 }, (_, index) => ({
    z: -328 - index * 24,
    width: 76 - index * 3,
    opacity: 0.16 + index * 0.014,
  }))

  return (
    <group>
      {treads.map((tread) => (
        <group key={tread.z}>
          <mesh position={[0, floorY + tread.y, tread.z]} scale={[tread.width, 0.42, 1.5]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.25} />
          </mesh>
          <mesh position={[0, floorY + tread.y + 0.26, tread.z + 1.7]} scale={[tread.highlightWidth, 0.38, 1.2]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.moatWaterLight} transparent opacity={0.34} />
          </mesh>
          <mesh position={[-tread.width * 0.46, floorY + tread.y - 2.2, tread.z + 0.3]} scale={[2.2, 4.2, 1.6]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.23} />
          </mesh>
          <mesh position={[tread.width * 0.46, floorY + tread.y - 2.2, tread.z + 0.3]} scale={[2.2, 4.2, 1.6]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.23} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, floorY + 19.35, -522.5]} scale={[118, 0.42, 1.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.26} />
      </mesh>
      {showProcessionalSlabs ? (
        <>
          {processionalSlabs.map((slab) => (
            <mesh key={slab.z} position={[0, floorY + 0.22, slab.z]} scale={[slab.width, 0.06, 16]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={ARENA_PALETTE.museumStoneLight} transparent opacity={slab.opacity} depthWrite={false} />
            </mesh>
          ))}
          {[-39, 39].map((x) => (
            <mesh key={`processional-edge-${x}`} position={[x, floorY + 0.25, -400]} scale={[1.2, 0.06, 170]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={ARENA_PALETTE.pathJoint} transparent opacity={0.16} depthWrite={false} />
            </mesh>
          ))}
          {[0, 1, 2, 3].map((index) => (
            <mesh key={index} position={[0, floorY + 0.18, -365 + index * 38]} scale={[58 - index * 3, 0.06, 1.2]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={ARENA_PALETTE.pathJoint} transparent opacity={0.18} depthWrite={false} />
            </mesh>
          ))}
        </>
      ) : null}
    </group>
  )
}

function makeChamferedRectShape(width: number, height: number, corner: number) {
  const halfWidth = width * 0.5
  const halfHeight = height * 0.5
  const cut = Math.min(corner, halfWidth * 0.45, halfHeight * 0.45)
  const shape = new THREE.Shape()

  shape.moveTo(-halfWidth + cut, halfHeight)
  shape.lineTo(halfWidth - cut, halfHeight)
  shape.lineTo(halfWidth, halfHeight - cut)
  shape.lineTo(halfWidth, -halfHeight + cut)
  shape.lineTo(halfWidth - cut, -halfHeight)
  shape.lineTo(-halfWidth + cut, -halfHeight)
  shape.lineTo(-halfWidth, -halfHeight + cut)
  shape.lineTo(-halfWidth, halfHeight - cut)
  shape.closePath()

  return shape
}

function MuseumLedgeFlowerCluster({
  position,
  scale = 1,
  colors = [ARENA_PALETTE.flowerPink, ARENA_PALETTE.flowerCream, ARENA_PALETTE.museumFernLight],
}: {
  position: [number, number, number]
  scale?: number
  colors?: string[]
}) {
  const blooms = [
    { x: -3.6, y: 1.4, z: -0.5, size: 1.2 },
    { x: -1.1, y: 2.8, z: 0.2, size: 1.45 },
    { x: 1.7, y: 2.1, z: -0.2, size: 1.25 },
    { x: 4.0, y: 1.0, z: 0.35, size: 1.0 },
  ]

  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0.18]} scale={[9.4, 1.15, 2.8]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={ARENA_PALETTE.grassDark} />
      </mesh>
      {blooms.map((bloom, index) => (
        <group key={`${bloom.x}-${index}`} position={[bloom.x, bloom.y, bloom.z]}>
          <mesh position={[0, -1.6, 0]} scale={[0.28, 3.2, 0.28]}>
            <cylinderGeometry args={[1, 0.7, 1, 6]} />
            <meshBasicMaterial color={ARENA_PALETTE.grassDark} />
          </mesh>
          <mesh scale={[bloom.size, bloom.size, bloom.size]}>
            <sphereGeometry args={[1, 9, 7]} />
            <meshBasicMaterial color={colors[index % colors.length]} />
          </mesh>
          <mesh position={[0.65, 0.2, 0.08]} scale={[bloom.size * 0.62, bloom.size * 0.62, bloom.size * 0.62]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color={colors[(index + 1) % colors.length]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function MuseumMobaSign({
  position = [-252, 0, -342],
  yaw = 0.14,
}: {
  position?: [number, number, number]
  yaw?: number
}) {
  const floorY = MUSEUM_SCALE_FLOOR_Y
  const signOutlineShape = useMemo(() => makeChamferedRectShape(1, 1, 0.18), [])
  const signFaceShape = useMemo(() => makeChamferedRectShape(1, 1, 0.15), [])
  const signTextTexture = useMemo(() => {
    if (typeof document === 'undefined') {
      return null
    }

    const canvas = document.createElement('canvas')
    const width = 960
    const height = 280
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')

    if (!context) {
      return null
    }

    context.clearRect(0, 0, width, height)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.lineJoin = 'round'

    const drawTrackedText = (text: string, x: number, y: number, tracking: number) => {
      const widths = [...text].map((char) => context.measureText(char).width)
      const totalWidth = widths.reduce((sum, charWidth) => sum + charWidth, 0) + tracking * (text.length - 1)
      let cursor = x - totalWidth * 0.5

      ;[true, false].forEach((stroke) => {
        cursor = x - totalWidth * 0.5
        ;[...text].forEach((char, index) => {
          const charX = cursor + widths[index] * 0.5
          if (stroke) {
            context.strokeText(char, charX, y)
          } else {
            context.fillText(char, charX, y)
          }
          cursor += widths[index] + tracking
        })
      })
    }

    context.fillStyle = 'rgba(255, 247, 209, 0.5)'
    context.fillRect(72, 54, width - 144, height - 108)

    context.strokeStyle = ARENA_PALETTE.museumGold
    context.lineWidth = 8
    context.beginPath()
    context.moveTo(118, 72)
    context.lineTo(width - 118, 72)
    context.moveTo(118, height - 72)
    context.lineTo(width - 118, height - 72)
    context.stroke()

    context.strokeStyle = ARENA_PALETTE.museumWalnut
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(150, 92)
    context.lineTo(width - 150, 92)
    context.moveTo(150, height - 92)
    context.lineTo(width - 150, height - 92)
    context.stroke()

    context.shadowColor = 'rgba(58, 32, 19, 0.26)'
    context.shadowBlur = 7
    context.shadowOffsetY = 5
    context.font = '900 102px Georgia, Times New Roman, serif'
    context.lineWidth = 9
    context.strokeStyle = ARENA_PALETTE.museumCream
    context.fillStyle = ARENA_PALETTE.museumWalnut
    drawTrackedText('MoBA', width * 0.5, height * 0.46, 26)

    context.shadowBlur = 0
    context.shadowOffsetY = 0
    context.fillStyle = ARENA_PALETTE.museumGold
    ;[
      [276, 128],
      [394, 128],
      [618, 128],
      [738, 128],
    ].forEach(([x, y]) => {
      context.beginPath()
      context.arc(x, y, 8, 0, Math.PI * 2)
      context.fill()
    })

    context.font = '700 24px Georgia, Times New Roman, serif'
    context.fillStyle = ARENA_PALETTE.museumMauveDark
    {
      const subtitle = 'MUSEUM OF BASED ARTS'
      const tracking = 5
      const widths = [...subtitle].map((char) => context.measureText(char).width)
      const totalWidth = widths.reduce((sum, charWidth) => sum + charWidth, 0) + tracking * (subtitle.length - 1)
      let cursor = width * 0.5 - totalWidth * 0.5

      ;[...subtitle].forEach((char, index) => {
        context.fillText(char, cursor + widths[index] * 0.5, height * 0.73)
        cursor += widths[index] + tracking
      })
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true

    return texture
  }, [])

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, floorY + 1.1, 10]} rotation={[-Math.PI / 2, 0, 0]} scale={[54, 27, 1]} renderOrder={-1}>
        <circleGeometry args={[1, 36]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.11} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {[-25, 25].map((x) => (
        <mesh key={x} position={[x, floorY + 7.4, 0]} scale={[2.6, 14.8, 2.6]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshToonMaterial color={ARENA_PALETTE.museumWalnut} />
        </mesh>
      ))}
      <mesh position={[0, floorY + 17, 2.1]} scale={[72, 27, 1]}>
        <shapeGeometry args={[signOutlineShape]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumWalnut} />
      </mesh>
      <mesh position={[0, floorY + 17, 2.5]} scale={[65, 21, 1]}>
        <shapeGeometry args={[signFaceShape]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumStoneLight} />
      </mesh>
      <mesh position={[0, floorY + 17, -2.1]} rotation={[0, Math.PI, 0]} scale={[72, 27, 1]}>
        <shapeGeometry args={[signOutlineShape]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumWalnut} />
      </mesh>
      <mesh position={[0, floorY + 17, -2.5]} rotation={[0, Math.PI, 0]} scale={[65, 21, 1]}>
        <shapeGeometry args={[signFaceShape]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumStoneLight} />
      </mesh>
      <mesh position={[0, floorY + 27.8, 2.8]} scale={[59, 2.7, 1.1]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} />
      </mesh>
      <mesh position={[0, floorY + 27.8, -2.8]} scale={[59, 2.7, 1.1]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} />
      </mesh>
      {signTextTexture ? (
        <>
          <mesh position={[0, floorY + 16.9, 3.12]} scale={[60, 17.5, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={signTextTexture} transparent toneMapped={false} />
          </mesh>
          <mesh position={[0, floorY + 16.9, -3.12]} rotation={[0, Math.PI, 0]} scale={[60, 17.5, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={signTextTexture} transparent toneMapped={false} />
          </mesh>
        </>
      ) : null}
      <mesh position={[58, floorY + 9.5, 7]} rotation={[0.08, 0.4, -0.05]} scale={[25, 16, 20]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshToonMaterial color={ARENA_PALETTE.rockLight} />
      </mesh>
      <mesh position={[45, floorY + 5, -5]} rotation={[-0.04, -0.32, 0.08]} scale={[15, 8, 12]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshToonMaterial color={ARENA_PALETTE.rockWarm} />
      </mesh>
      <mesh position={[36, floorY + 2.8, 17]} scale={[9, 3.2, 7]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={ARENA_PALETTE.bushLight} />
      </mesh>
      <mesh position={[35, floorY + 6.2, 18]} scale={[2.6, 2.6, 2.6]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color={ARENA_PALETTE.flowerPink} />
      </mesh>
    </group>
  )
}

function MuseumGlassAtrium() {
  const floorY = MUSEUM_SCALE_FLOOR_Y
  const atriumX = 116
  const frontZ = -527.5
  const atriumDepth = 368
  const atriumZ = frontZ - atriumDepth * 0.5
  const backZ = frontZ - atriumDepth
  const frontInteriorZ = frontZ - 17
  const midInteriorZ = frontZ - 132
  const rearInteriorZ = frontZ - 284
  const lowerSteps = Array.from({ length: 7 }, (_, index) => ({
    x: 80 + index * 9.4,
    z: frontInteriorZ - index * 11.8,
    y: 18.5 + index * 5.15,
    width: 18 - index * 0.45,
  }))
  const upperSteps = Array.from({ length: 7 }, (_, index) => ({
    x: 142 - index * 9.2,
    z: midInteriorZ - index * 12.4,
    y: 65 + index * 5.05,
    width: 17.5 - index * 0.35,
  }))
  const verticalMullions = [-52, -26, 0, 26, 52]
  const horizontalMullions = [17, 47, 77]
  const depthFrameZs = [frontZ - 28, frontZ - 92, frontZ - 156, frontZ - 224, frontZ - 294, backZ + 28]
  const floorBandZs = [frontInteriorZ, frontZ - 72, midInteriorZ, frontZ - 196, rearInteriorZ, frontZ - 340, backZ + 24]

  return (
    <group>
      <mesh position={[atriumX, floorY + 49, frontZ]} scale={[111, 85, 1.2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumGlassDeep} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh position={[atriumX, floorY + 16, backZ]} scale={[106, 21, 2.4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={ARENA_PALETTE.museumGlassDeep} transparent opacity={0.38} depthWrite={false} />
      </mesh>
      <mesh position={[atriumX, floorY + 52, backZ]} scale={[106, 18, 2.4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={ARENA_PALETTE.museumCyan} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh position={[atriumX, floorY + 86, backZ]} scale={[106, 14, 2.4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={ARENA_PALETTE.museumStoneLight} transparent opacity={0.28} depthWrite={false} />
      </mesh>

      <mesh position={[atriumX, floorY + 96.5, frontZ + 0.9]} scale={[114, 4.2, 3.4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumMullion} transparent opacity={0.84} />
      </mesh>
      <mesh position={[atriumX, floorY + 3.3, frontZ + 0.9]} scale={[114, 6, 4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumMullion} transparent opacity={0.86} />
      </mesh>
      <mesh position={[atriumX - 58, floorY + 49.5, frontZ + 0.9]} scale={[4.2, 92, 3.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumMullion} transparent opacity={0.82} />
      </mesh>
      <mesh position={[atriumX + 58, floorY + 49.5, frontZ + 0.9]} scale={[4.2, 92, 3.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumMullion} transparent opacity={0.82} />
      </mesh>
      {[-1, 1].map((side) =>
        [20, 51, 82].map((y) => (
          <mesh
            key={`atrium-depth-side-${side}-${y}`}
            position={[atriumX + side * 58.5, floorY + y, atriumZ]}
            scale={[3.2, 2.1, atriumDepth * 0.92]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.museumMullion} transparent opacity={0.42} />
          </mesh>
        )),
      )}
      {depthFrameZs.map((z, index) => (
        <group key={`atrium-depth-frame-${z}`}>
          <mesh position={[atriumX, floorY + 4.8, z]} scale={[110, 2.2, 1.2]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.museumMullion} transparent opacity={0.34 - index * 0.035} />
          </mesh>
          <mesh position={[atriumX, floorY + 95.8, z]} scale={[110, 1.7, 1.1]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.museumMullion} transparent opacity={0.28 - index * 0.03} />
          </mesh>
          <mesh position={[atriumX - 57, floorY + 49, z]} scale={[1.4, 86, 1.1]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.museumMullion} transparent opacity={0.22 - index * 0.02} />
          </mesh>
          <mesh position={[atriumX + 57, floorY + 49, z]} scale={[1.4, 86, 1.1]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.museumMullion} transparent opacity={0.22 - index * 0.02} />
          </mesh>
        </group>
      ))}
      {verticalMullions.map((x) => (
        <mesh key={`atrium-vertical-${x}`} position={[atriumX + x, floorY + 49.5, frontZ + 1.1]} scale={[1.55, 87, 2.2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.museumMullion} transparent opacity={0.66} />
        </mesh>
      ))}
      {horizontalMullions.map((y) => (
        <mesh key={`atrium-horizontal-${y}`} position={[atriumX, floorY + y, frontZ + 1.15]} scale={[112, 1.75, 2.2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.museumMullion} transparent opacity={0.64} />
        </mesh>
      ))}
      {floorBandZs.map((z, index) => (
        <mesh key={`atrium-floor-band-${z}`} position={[atriumX, floorY + 3.72, z]} scale={[96 - (index % 2) * 12, 0.55, 1.5]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={index % 2 === 0 ? ARENA_PALETTE.moatWaterLight : ARENA_PALETTE.museumStoneLight} transparent opacity={0.16} depthWrite={false} />
        </mesh>
      ))}

      <OutlinedBox position={[94, floorY + 15.5, frontInteriorZ - 4]} scale={[54, 5.4, 32]} color={ARENA_PALETTE.museumGlassDeep} outlineScale={1.018} />
      <mesh position={[94, floorY + 19.1, frontInteriorZ - 3.7]} scale={[49, 1.4, 28]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.moatWaterLight} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <OutlinedBox position={[136, floorY + 55.5, midInteriorZ - 4]} scale={[44, 6.4, 33]} color={ARENA_PALETTE.museumWalnut} outlineScale={1.026} />
      <mesh position={[136, floorY + 60.1, midInteriorZ - 3.7]} scale={[40, 1.6, 29]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.28} />
      </mesh>
      <OutlinedBox position={[94, floorY + 91.5, rearInteriorZ - 2]} scale={[56, 5.2, 31]} color={ARENA_PALETTE.museumGlassDeep} outlineScale={1.018} />

      {[
        { x: 102, z: frontInteriorZ - 18, y: 35.5, rotation: -0.55, height: 63 },
        { x: 116, z: midInteriorZ - 18, y: 74.5, rotation: 0.54, height: 60 },
      ].map((rail) => (
        <mesh
          key={`atrium-stair-rail-${rail.x}`}
          position={[rail.x, floorY + rail.y, rail.z]}
          rotation={[0, 0, rail.rotation]}
          scale={[2.2, rail.height, 1.6]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.museumMullion} transparent opacity={0.58} />
        </mesh>
      ))}
      {lowerSteps.map((step, index) => (
        <group key={`atrium-lower-stair-${index}`}>
          <mesh position={[step.x, floorY + step.y - 2.9, step.z - 0.7]} scale={[step.width, 2.4, 13.4]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.2} />
          </mesh>
          <OutlinedBox
            position={[step.x, floorY + step.y, step.z]}
            scale={[step.width, 4.6, 13.8]}
            color={index % 2 === 0 ? ARENA_PALETTE.museumWalnut : ARENA_PALETTE.museumTeak}
            outlineScale={1.028}
          />
          <mesh position={[step.x, floorY + step.y + 2.8, step.z + 7.1]} scale={[step.width - 1.8, 0.9, 1]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.42} />
          </mesh>
        </group>
      ))}
      {upperSteps.map((step, index) => (
        <group key={`atrium-upper-stair-${index}`}>
          <mesh position={[step.x, floorY + step.y - 2.8, step.z - 0.7]} scale={[step.width, 2.3, 13]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.19} />
          </mesh>
          <OutlinedBox
            position={[step.x, floorY + step.y, step.z]}
            scale={[step.width, 4.4, 13.4]}
            color={index % 2 === 0 ? ARENA_PALETTE.museumTeak : ARENA_PALETTE.museumWalnut}
            outlineScale={1.028}
          />
          <mesh position={[step.x, floorY + step.y + 2.65, step.z + 6.9]} scale={[step.width - 1.8, 0.85, 1]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.36} />
          </mesh>
        </group>
      ))}

      <OutlinedBox position={[165, floorY + 31, rearInteriorZ + 5]} scale={[24, 34, 18]} color={ARENA_PALETTE.museumWalnut} outlineScale={1.03} />
      <mesh position={[165, floorY + 44, rearInteriorZ + 14.5]} scale={[18, 2.4, 2.2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.36} />
      </mesh>
      <OutlinedBox position={[165, floorY + 31, rearInteriorZ + 15]} scale={[18, 22, 2.6]} color={ARENA_PALETTE.museumStone} outlineScale={1.04} />
      <mesh position={[165, floorY + 33.5, rearInteriorZ + 16.7]} scale={[8.2, 8.2, 1]}>
        <dodecahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.moatWaterLight} transparent opacity={0.78} depthWrite={false} />
      </mesh>
      <mesh position={[165, floorY + 33.5, rearInteriorZ + 17.4]} scale={[4.7, 4.7, 1]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshToonMaterial color={ARENA_PALETTE.museumGlassDeep} />
      </mesh>

      <OutlinedBox position={[158, floorY + 78.5, backZ + 7]} scale={[23, 21, 3.2]} color={ARENA_PALETTE.museumGlassDeep} outlineScale={1.035} />
      <mesh position={[158, floorY + 78.5, backZ + 9]} scale={[16, 14, 1.2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumMauve} transparent opacity={0.78} />
      </mesh>
      <mesh position={[154.2, floorY + 78.8, backZ + 10]} scale={[2.2, 2.2, 1]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color={ARENA_PALETTE.flowerYellow} />
      </mesh>
      {[
        [-3.4, 2.8, ARENA_PALETTE.flowerBlue],
        [3.2, 2.7, ARENA_PALETTE.flowerPink],
        [-1.4, -3.1, ARENA_PALETTE.flowerCream],
        [4.2, -2.5, ARENA_PALETTE.museumFernLight],
      ].map(([x, y, color], index) => (
        <mesh key={`atrium-art-flower-${index}`} position={[158 + Number(x), floorY + 78.5 + Number(y), backZ + 10.3]} scale={[1.9, 1.9, 0.8]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color={String(color)} />
        </mesh>
      ))}

      {[
        { x: 82, y: 83, h: 27 },
        { x: 150, y: 22, h: 25 },
      ].map((accent) => (
        <mesh key={`atrium-soft-reflection-${accent.x}`} position={[accent.x, floorY + accent.y, frontZ + 2.4]} rotation={[0, 0, -0.18]} scale={[2.1, accent.h, 0.9]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.moatWaterLight} transparent opacity={0.13} depthWrite={false} />
        </mesh>
      ))}
      <mesh position={[atriumX, floorY + 9.5, frontZ + 3]} scale={[110, 5, 5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumGlassDeep} transparent opacity={0.45} />
      </mesh>
      <mesh position={[atriumX, floorY + 9.5, backZ + 2]} scale={[110, 4.2, 4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumGlassDeep} transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

function MuseumRoofStairRoute() {
  const stairTreads = MUSEUM_ROOF_STAIR_PLATFORMS.filter((platform) => platform.id.startsWith('museum-roof-stair'))
  const finalLanding = MUSEUM_ROOF_STAIR_PLATFORMS.find((platform) => platform.id === 'museum-lower-roof-edge')
  const treadThickness = 3.1

  return (
    <group>
      <mesh position={[103, MUSEUM_SCALE_FLOOR_Y + 41.6, -510.2]} rotation={[0, 0, -0.39]} scale={[2.4, 94, 2.2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.48} />
      </mesh>
      <mesh position={[108, MUSEUM_SCALE_FLOOR_Y + 41.8, -496.1]} rotation={[0, 0, -0.39]} scale={[1.7, 87, 1.6]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.42} />
      </mesh>
      <mesh position={[111, MUSEUM_SCALE_FLOOR_Y + 78.2, -509.8]} rotation={[0, 0, 0.42]} scale={[2.2, 89, 2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.46} />
      </mesh>
      <mesh position={[106, MUSEUM_SCALE_FLOOR_Y + 78.5, -495.7]} rotation={[0, 0, 0.42]} scale={[1.6, 82, 1.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.4} />
      </mesh>

      {stairTreads.map((platform, index) => {
        const isLanding = platform.id.endsWith('landing')
        const isHard = platform.id.includes('06') || platform.id.includes('07') || platform.id.includes('08') || platform.id.includes('09') || platform.id.includes('10')
        const color = isLanding
          ? ARENA_PALETTE.museumCream
          : isHard
            ? ARENA_PALETTE.museumStone
            : index % 2 === 0
              ? ARENA_PALETTE.museumStoneLight
              : ARENA_PALETTE.museumCream
        const topColor = isHard ? ARENA_PALETTE.moatWaterLight : ARENA_PALETTE.museumTeakLight

        return (
          <group key={platform.id}>
            <OutlinedBox
              position={[platform.x, MUSEUM_SCALE_FLOOR_Y + platform.height - treadThickness * 0.5, platform.z]}
              scale={[platform.halfX * 2, treadThickness, platform.halfZ * 2]}
              color={color}
              outlineScale={1.035}
              fog={false}
            />
            <mesh position={[platform.x, MUSEUM_SCALE_FLOOR_Y + platform.height + 0.08, platform.z + platform.halfZ * 0.46]} scale={[platform.halfX * 1.64, 0.18, 1.1]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={topColor} transparent opacity={isHard ? 0.28 : 0.34} />
            </mesh>
            <mesh position={[platform.x, MUSEUM_SCALE_FLOOR_Y + platform.height - treadThickness - 1.2, platform.z - platform.halfZ - 5.2]} scale={[platform.halfX * 1.45, 2.2, 8.8]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.17} />
            </mesh>
          </group>
        )
      })}

      {finalLanding ? (
        <group>
          <OutlinedBox
            position={[finalLanding.x, MUSEUM_SCALE_FLOOR_Y + finalLanding.height - 2.2, finalLanding.z]}
            scale={[finalLanding.halfX * 2, 4.4, finalLanding.halfZ * 2]}
            color={ARENA_PALETTE.museumTeak}
            outlineScale={1.018}
            fog={false}
          />
          <mesh position={[finalLanding.x, MUSEUM_SCALE_FLOOR_Y + finalLanding.height + 0.08, finalLanding.z + finalLanding.halfZ * 0.64]} scale={[finalLanding.halfX * 1.74, 0.18, 1.5]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.46} />
          </mesh>
          <mesh position={[-26, MUSEUM_SCALE_FLOOR_Y + finalLanding.height + 0.16, finalLanding.z + 1]} scale={[22, 0.18, 20]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.museumStoneLight} transparent opacity={0.16} depthWrite={false} />
          </mesh>
          <mesh position={[58, MUSEUM_SCALE_FLOOR_Y + finalLanding.height + 0.16, finalLanding.z + 1]} scale={[16, 0.18, 18]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.museumStoneLight} transparent opacity={0.12} depthWrite={false} />
          </mesh>
        </group>
      ) : null}
    </group>
  )
}

function MuseumDoorBlock() {
  const floorY = MUSEUM_SCALE_FLOOR_Y
  const frontZ = -526

  return (
    <group>
      <mesh position={[0, floorY + 74.8, frontZ + 4.7]} scale={[86, 5.4, 2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.2} />
      </mesh>
      <mesh position={[0, floorY + 76.4, frontZ + 5.35]} scale={[76, 2.4, 1.1]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.58} />
      </mesh>

      <OutlinedBox position={[0, floorY + 45, frontZ - 0.2]} scale={[76, 62, 6]} color={ARENA_PALETTE.museumMauveDark} outlineScale={1.028} />
      <OutlinedBox position={[0, floorY + 45, frontZ + 1.5]} scale={[68, 58, 3.1]} color={ARENA_PALETTE.museumGold} outlineScale={1.014} />
      <mesh position={[0, floorY + 45, frontZ + 3.3]} scale={[59, 51, 1.3]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.22} />
      </mesh>

      {[-14.7, 14.7].map((x) => (
        <group key={`front-door-panel-${x}`}>
          <mesh position={[x, floorY + 44.4, frontZ + 4.1]} scale={[28, 49, 1.5]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.museumTeak} fog={false} />
          </mesh>
          <mesh position={[x, floorY + 56.5, frontZ + 5]} scale={[19, 16, 0.8]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.museumWalnut} transparent opacity={0.34} />
          </mesh>
          <mesh position={[x, floorY + 33.4, frontZ + 5]} scale={[19, 14, 0.8]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.museumWalnut} transparent opacity={0.22} />
          </mesh>
          <mesh position={[x, floorY + 69.2, frontZ + 5.05]} scale={[24, 1.8, 0.9]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.35} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, floorY + 44.5, frontZ + 5.35]} scale={[1.5, 49.5, 1]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.46} />
      </mesh>
      <mesh position={[0, floorY + 19.3, frontZ + 5.45]} scale={[58, 2.2, 1]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.34} />
      </mesh>
      {[-8.8, 8.8].map((x) => (
        <mesh key={`front-door-handle-${x}`} position={[x, floorY + 42.4, frontZ + 5.8]} scale={[5.6, 1.7, 0.9]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} />
        </mesh>
      ))}
      {[-22.5, 22.5].map((x) => (
        <mesh key={`front-door-side-gold-${x}`} position={[x, floorY + 45, frontZ + 5.55]} scale={[1.1, 43, 0.8]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.3} />
        </mesh>
      ))}

      <OutlinedBox position={[0, floorY + 19.8, frontZ + 13]} scale={[84, 7.4, 15]} color={ARENA_PALETTE.museumWalnut} outlineScale={1.018} />
      <mesh position={[0, floorY + 24.5, frontZ + 7.8]} scale={[78, 3.1, 6]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.36} />
      </mesh>
      <mesh position={[0, floorY + 19.55, frontZ + 22]} scale={[92, 1.9, 3]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.2} />
      </mesh>
      <MuseumDoorPlanter x={-55} />
      <MuseumDoorPlanter x={55} />
    </group>
  )
}

export function MuseumFacadeSilhouette({
  showMobaSign = true,
  showProcessionalSlabs = true,
}: {
  showMobaSign?: boolean
  showProcessionalSlabs?: boolean
} = {}) {
  const floorY = MUSEUM_SCALE_FLOOR_Y

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, floorY + 0.08, -512]} rotation={[-Math.PI / 2, 0, 0]} scale={[238, 96, 1]} renderOrder={-1}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      <OutlinedBox position={[0, floorY + 3.2, -468]} scale={[252, 6.4, 38]} color={ARENA_PALETTE.museumCream} fog={false} />
      <OutlinedBox position={[0, floorY + 9.2, -490]} scale={[220, 6.8, 34]} color={ARENA_PALETTE.museumStoneLight} fog={false} />
      <OutlinedBox position={[0, floorY + 15.2, -512]} scale={[188, 7.2, 30]} color={ARENA_PALETTE.museumStone} fog={false} />
      <MuseumEntryTreads showProcessionalSlabs={showProcessionalSlabs} />
      <MuseumGlassAtrium />
      <MuseumRoofStairRoute />

      <OutlinedBox position={[-44, floorY + 48, -556]} scale={[166, 76, 36]} color={ARENA_PALETTE.museumMauveWall} fog={false} />
      <mesh position={[-44, floorY + 78.5, -536.1]} scale={[164, 4.8, 2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.16} />
      </mesh>
      <MuseumWallScuffs
        z={-536.6}
        marks={[
          [-58, 34, 16, 1.8],
          [-42, 39, 9, 1.4],
          [34, 48, 14, 1.7],
          [54, 29, 10, 1.4],
          [-86, 58, 12, 1.6],
        ]}
      />
      <MuseumPanelSeams z={-536.3} y={48} height={64} xs={[-96, -24, 34]} opacity={0.18} />

      <OutlinedBox position={[-58, floorY + 91, -526]} scale={[230, 16, 70]} color={ARENA_PALETTE.museumTeak} outlineScale={1.012} fog={false} />
      <mesh position={[-58, floorY + 83.4, -526]} scale={[226, 6, 66]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={ARENA_PALETTE.museumWalnut} />
      </mesh>
      <mesh position={[-58, floorY + 100, -489.7]} scale={[230, 2.2, 3]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} />
      </mesh>
      <mesh position={[-58, floorY + 90.2, -562.4]} scale={[226, 9.4, 2.2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={ARENA_PALETTE.museumWalnut} />
      </mesh>
      <mesh position={[-58, floorY + 82.2, -489]} scale={[230, 5.8, 2.2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.12} />
      </mesh>
      <OutlinedBox position={[-82, floorY + 119, -566]} scale={[204, 44, 36]} color={ARENA_PALETTE.museumWalnut} fog={false} />
      <mesh position={[-82, floorY + 121, -546.2]} scale={[198, 35, 1.9]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={ARENA_PALETTE.museumWalnut} />
      </mesh>
      <mesh position={[-82, floorY + 105.8, -545.6]} scale={[198, 5.6, 2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.14} />
      </mesh>
      <mesh position={[-82, floorY + 139.2, -545.5]} scale={[198, 4.4, 2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.18} />
      </mesh>
      <MuseumPanelSeams z={-544.8} y={121} height={34} xs={[-160, -118, -74, -30, 18]} opacity={0.2} />
      {[
        [-149, 125, 20, 1.6],
        [-63, 131, 15, 1.4],
        [12, 118, 23, 1.7],
      ].map(([x, y, width, height], index) => (
        <mesh key={`top-gallery-warm-scuff-${index}`} position={[x, floorY + y, -543.9]} scale={[width, height, 0.32]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.09} />
        </mesh>
      ))}

      <OutlinedBox position={[-82, floorY + 146.5, -544]} scale={[216, 13, 48]} color={ARENA_PALETTE.museumMauveDark} outlineScale={1.012} fog={false} />
      <mesh position={[-82, floorY + 152.8, -519.6]} scale={[214, 2.4, 2.4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.flowerPink} transparent opacity={0.48} />
      </mesh>
      <mesh position={[-82, floorY + 130.5, -517.9]} scale={[208, 18, 2.6]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumWalnut} fog={false} />
      </mesh>
      <MuseumPanelSeams z={-516.3} y={130.5} height={15} xs={[-150, -102, -54, -6, 42]} opacity={0.2} />
      <mesh position={[-82, floorY + 140.4, -516.5]} scale={[208, 2.4, 2.2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.38} />
      </mesh>
      <mesh position={[-82, floorY + 139.8, -508.8]} scale={[202, 3.2, 9]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={ARENA_PALETTE.museumCream} />
      </mesh>
      <mesh position={[-82, floorY + 142.5, -504.2]} scale={[199, 2.2, 2.4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.34} />
      </mesh>
      <mesh position={[-82, floorY + 137.4, -503.8]} scale={[200, 3.4, 2.6]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.16} />
      </mesh>
      <mesh position={[-92, floorY + 160, -548]} scale={[206, 9.4, 46]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} side={THREE.BackSide} />
      </mesh>
      <mesh position={[-92, floorY + 160, -548]} scale={[200, 8.8, 42]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={ARENA_PALETTE.museumTeak} fog={false} />
      </mesh>
      <mesh position={[-92, floorY + 155.2, -526.1]} scale={[199, 2.5, 3.4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.5} />
      </mesh>
      <mesh position={[-92, floorY + 154.4, -568.8]} scale={[198, 4.6, 2.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={ARENA_PALETTE.museumWalnut} />
      </mesh>

      {[
        { x: -142, scale: 1.72, z: -499.6 },
        { x: -92, scale: 1.86, z: -499.2 },
        { x: -42, scale: 1.68, z: -499.8 },
      ].map((fern) => (
        <group key={`top-balcony-fern-${fern.x}`}>
          <mesh position={[fern.x, floorY + 139.7, fern.z + 0.4]} rotation={[-Math.PI / 2, 0, 0]} scale={[8.4 * fern.scale, 5.8 * fern.scale, 1]} renderOrder={-1}>
            <circleGeometry args={[1, 32]} />
            <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.13} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <PottedFern position={[fern.x, floorY + 137.7, fern.z]} scale={fern.scale} />
        </group>
      ))}
      <MuseumLedgeFlowerCluster position={[-16, floorY + 142.6, -500.5]} scale={0.44} colors={[ARENA_PALETTE.flowerCream, ARENA_PALETTE.flowerPink, ARENA_PALETTE.museumFernLight]} />

      <OutlinedBox position={[86, floorY + 150, -713]} scale={[212, 25, 378]} color={ARENA_PALETTE.museumTeak} outlineScale={1.012} fog={false} />
      <mesh position={[86, floorY + 163.1, -713]} scale={[202, 1.4, 356]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} transparent opacity={0.2} />
      </mesh>
      <mesh position={[86, floorY + 137.8, -523.6]} scale={[202, 4.2, 4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.museumTeakLight} />
      </mesh>
      <mesh position={[194.1, floorY + 149.3, -713]} scale={[3.4, 21, 366]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={ARENA_PALETTE.museumWalnut} />
      </mesh>
      <mesh position={[86, floorY + 136.1, -711]} scale={[208, 6.2, 360]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={ARENA_PALETTE.museumWalnut} />
      </mesh>
      <mesh position={[86, floorY + 137.1, -902.4]} scale={[204, 4.2, 4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.14} />
      </mesh>
      <OutlinedBox position={[-44, floorY + 48, -704]} scale={[166, 76, 286]} color={ARENA_PALETTE.museumMauveWall} outlineScale={1.01} fog={false} />
      <mesh position={[-44, floorY + 79.4, -704]} scale={[164, 5.2, 276]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.12} />
      </mesh>
      <mesh position={[-44, floorY + 17.8, -844]} scale={[162, 6.4, 4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={ARENA_PALETTE.museumMauveDark} />
      </mesh>
      <mesh position={[-44, floorY + 82.4, -844]} scale={[162, 5.2, 4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={ARENA_PALETTE.museumMauveDark} />
      </mesh>
      <MuseumPanelSeams z={-846.8} y={48} height={64} xs={[-96, -24, 34]} opacity={0.18} />

      <MuseumDoorBlock />
      {showMobaSign ? <MuseumMobaSign /> : null}
    </group>
  )
}

function makeCapsuleShape(width: number, length: number) {
  const radius = width * 0.5
  const straightHalf = Math.max(0, length * 0.5 - radius)
  const points: THREE.Vector2[] = []
  const segments = 28

  for (let index = 0; index <= segments; index += 1) {
    const angle = Math.PI - (index / segments) * Math.PI
    points.push(new THREE.Vector2(Math.cos(angle) * radius, straightHalf + Math.sin(angle) * radius))
  }

  for (let index = 0; index <= segments; index += 1) {
    const angle = -(index / segments) * Math.PI
    points.push(new THREE.Vector2(Math.cos(angle) * radius, -straightHalf + Math.sin(angle) * radius))
  }

  return new THREE.Shape(points)
}

function PathCapsuleSurface({
  width,
  length,
  color,
  opacity = 1,
  y = 0,
  toon = false,
}: {
  width: number
  length: number
  color: string
  opacity?: number
  y?: number
  toon?: boolean
}) {
  const shape = useMemo(() => makeCapsuleShape(width, length), [length, width])

  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <shapeGeometry args={[shape, 12]} />
      {toon ? (
        <meshToonMaterial color={color} transparent={opacity < 1} opacity={opacity} side={THREE.DoubleSide} />
      ) : (
        <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} side={THREE.DoubleSide} />
      )}
    </mesh>
  )
}

function PathSegmentSurface({ segment, index }: { segment: PathSegment; index: number }) {
  const seamCount = Math.max(2, Math.floor(segment.length / 46))
  const seamPositions = useMemo(
    () => Array.from({ length: seamCount }, (_, seamIndex) => -segment.length * 0.5 + ((seamIndex + 1) * segment.length) / (seamCount + 1)),
    [seamCount, segment.length],
  )
  const segmentY = MUSEUM_SCALE_FLOOR_Y + segment.rise
  const terraceWidth = segment.width + 32
  const terraceLength = segment.length + 20
  const terraceOpacity = 0.08 + (index % 2) * 0.018

  return (
    <group position={[segment.x, segmentY, segment.z]} rotation={[0, segment.yaw, 0]}>
      <PathCapsuleSurface width={terraceWidth} length={terraceLength} color={ARENA_PALETTE.pathEdge} opacity={terraceOpacity} y={-0.018} />
      <PathCapsuleSurface width={segment.width} length={segment.length} color={ARENA_PALETTE.path} y={0.014} toon />
      <PathCapsuleSurface width={segment.width * 0.78} length={segment.length * 0.72} color={ARENA_PALETTE.pathWarm} opacity={0.07} y={0.028} />

      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * segment.width * 0.5, 0.038, 0]} scale={[0.74, 0.08, segment.length * 0.9]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.pathEdge} transparent opacity={PATH_EDGE_OPACITY + 0.04} />
        </mesh>
      ))}
      {seamPositions.map((z, seamIndex) => (
        <mesh key={z} position={[0, 0.046, z]} scale={[segment.width * (seamIndex % 2 === 0 ? 0.7 : 0.55), 0.04, 0.16]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.pathJoint} transparent opacity={0.13} />
        </mesh>
      ))}
    </group>
  )
}

function HiddenTrailSegmentSurface({ segment, index }: { segment: PathSegment; index: number }) {
  const seamCount = Math.max(2, Math.floor(segment.length / 54))
  const seamPositions = useMemo(
    () => Array.from({ length: seamCount }, (_, seamIndex) => -segment.length * 0.5 + ((seamIndex + 1) * segment.length) / (seamCount + 1)),
    [seamCount, segment.length],
  )
  const segmentY = MUSEUM_SCALE_FLOOR_Y + segment.rise

  return (
    <group position={[segment.x, segmentY, segment.z]} rotation={[0, segment.yaw, 0]}>
      <PathCapsuleSurface width={segment.width + 18} length={segment.length + 24} color={ARENA_PALETTE.hiddenTrailEdge} opacity={0.12} y={-0.02} />
      <PathCapsuleSurface width={segment.width} length={segment.length} color={ARENA_PALETTE.hiddenTrail} opacity={0.78} y={0.018} toon />
      <PathCapsuleSurface width={segment.width * 0.62} length={segment.length * 0.68} color={ARENA_PALETTE.hiddenTrailWarm} opacity={0.2} y={0.032} />
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * segment.width * 0.46, 0.044, 0]} scale={[0.42, 0.06, segment.length * 0.76]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.grassDark} transparent opacity={0.12} />
        </mesh>
      ))}
      {seamPositions.map((z, seamIndex) => (
        <mesh key={z} position={[0, 0.052, z]} scale={[segment.width * (0.34 + (seamIndex % 2) * 0.14), 0.035, 0.12]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.pathJoint} transparent opacity={0.12} />
        </mesh>
      ))}
      {index === 0 ? (
        <mesh position={[0, 0.058, segment.length * 0.42]} rotation={[-Math.PI / 2, 0, 0]} scale={[segment.width * 0.18, segment.width * 0.1, 1]}>
          <ringGeometry args={[0.58, 1, 24]} />
          <meshBasicMaterial color={ARENA_PALETTE.flowerCream} transparent opacity={0.42} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
    </group>
  )
}

function SteppingStoneMesh({ stone }: { stone: SteppingStone }) {
  const floorY = MUSEUM_SCALE_FLOOR_Y

  return (
    <group position={[stone.x, floorY, stone.z]} rotation={[0, stone.yaw, 0]}>
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[stone.radiusX * 1.15, stone.radiusZ * 1.05, 1]} renderOrder={-1}>
        <circleGeometry args={[1, 34]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, stone.height * 0.5, 0]} scale={[stone.radiusX, stone.height, stone.radiusZ]}>
        <cylinderGeometry args={[1, 1.04, 1, 28]} />
        <meshToonMaterial color={stone.color} />
      </mesh>
      <mesh position={[0, stone.height * 0.46, 0]} scale={[stone.radiusX * 1.04, stone.height * 0.92, stone.radiusZ * 1.04]}>
        <cylinderGeometry args={[1, 1.04, 1, 28]} />
        <meshBasicMaterial color={ARENA_PALETTE.ink} side={THREE.BackSide} transparent opacity={0.58} />
      </mesh>
      <mesh position={[0, stone.height + 0.07, 0]} scale={[stone.radiusX * 0.82, 0.06, stone.radiusZ * 0.78]}>
        <cylinderGeometry args={[1, 1, 1, 28]} />
        <meshToonMaterial color={stone.topColor} />
      </mesh>
      <mesh position={[stone.radiusX * 0.18, stone.height + 0.124, -stone.radiusZ * 0.08]} rotation={[-Math.PI / 2, 0, -0.18]} scale={[stone.radiusX * 0.3, stone.radiusZ * 0.1, 1]}>
        <circleGeometry args={[1, 18]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function BridgeDeck({
  position,
  yaw = 0,
  width,
  length,
}: {
  position: [number, number, number]
  yaw?: number
  width: number
  length: number
}) {
  const plankPositions = useMemo(
    () => Array.from({ length: 7 }, (_, index) => -length * 0.39 + (index * length * 0.78) / 6),
    [length],
  )

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <OutlinedBox position={[0, -0.52, 0]} scale={[width, 1.14, length]} color={ARENA_PALETTE.bridgeStone} outlineScale={1.012} />
      <PathCapsuleSurface width={width * 0.86} length={length * 0.88} color={ARENA_PALETTE.bridgeWarm} opacity={0.32} y={0.07} />
      {plankPositions.map((z) => (
        <mesh key={z} position={[0, 0.112, z]} scale={[width * 0.74, 0.06, 0.7]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.2} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <OutlinedBox
          key={side}
          position={[side * width * 0.52, 1.08, 0]}
          scale={[4.4, 3.2, length * 0.88]}
          color={ARENA_PALETTE.bridgeRail}
          outlineScale={1.028}
        />
      ))}
      {[-1, 1].map((end) => (
        <mesh key={end} position={[0, 0.14, end * length * 0.48]} scale={[width * 0.96, 0.09, 2.2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={ARENA_PALETTE.ink} transparent opacity={0.32} />
        </mesh>
      ))}
      {[-1, 1].flatMap((side) =>
        [-1, 1].map((end) => (
          <OutlinedBox
            key={`${side}-${end}`}
            position={[side * width * 0.52, 3.16, end * length * 0.41]}
            scale={[7.4, 6.3, 7.4]}
            color={ARENA_PALETTE.bridgeRail}
            outlineScale={1.04}
          />
        )),
      )}
    </group>
  )
}

function MuseumMoatAndBridges() {
  const floorY = MUSEUM_SCALE_FLOOR_Y

  return (
    <group>
      <group position={[0, floorY - 0.012, -436]} rotation={[0, Math.PI / 2, 0]}>
        <PathCapsuleSurface width={128} length={620} color={ARENA_PALETTE.moatWaterDeep} y={0} toon />
        <PathCapsuleSurface width={104} length={575} color={ARENA_PALETTE.moatWater} y={0.05} toon />
        <PathCapsuleSurface width={18} length={470} color={ARENA_PALETTE.moatWaterLight} y={0.1} />
      </group>

      <OutlinedBox position={[0, floorY + MUSEUM_ENTRY_LANDING_HEIGHT - 0.44, -462]} scale={[286, 1.08, 46]} color={ARENA_PALETTE.bridgeStone} outlineScale={1.01} />
      <group position={[0, 0, -462]}>
        <PathCapsuleSurface width={252} length={36} color={ARENA_PALETTE.pathWarm} opacity={0.24} y={floorY + MUSEUM_ENTRY_LANDING_HEIGHT + 0.122} />
      </group>

      <BridgeDeck position={[0, floorY + MUSEUM_BRIDGE_DECK_HEIGHT, -426]} width={108} length={132} />
      <BridgeDeck position={[-158, floorY + MUSEUM_BRIDGE_DECK_HEIGHT, -432]} yaw={-0.34} width={64} length={142} />
      {RIGHT_STEPPING_STONES.map((stone) => (
        <SteppingStoneMesh key={stone.id} stone={stone} />
      ))}
    </group>
  )
}

function MuseumScaleRocks() {
  return (
    <group>
      {ROCK_FORMATIONS.map((formation) => (
        <ScaleRockFormation key={formation.id} formation={formation} />
      ))}
    </group>
  )
}

function PathSurface() {
  return (
    <group>
      {PATH_SEGMENTS.map((segment, index) => (
        <PathSegmentSurface key={segment.id} segment={segment} index={index} />
      ))}
      {HIDDEN_TRAIL_SEGMENTS.map((segment, index) => (
        <HiddenTrailSegmentSurface key={segment.id} segment={segment} index={index} />
      ))}
    </group>
  )
}

export function MuseumScalePathGrassArena() {
  return (
    <group>
      <mesh position={[0, MUSEUM_SCALE_FLOOR_Y - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[VISIBLE_GRASS_SIZE, VISIBLE_GRASS_SIZE]} />
        <meshToonMaterial color={ARENA_PALETTE.grass} />
      </mesh>
      <PathSurface />
      <MuseumMoatAndBridges />
      <MuseumScaleTerrain />
      <MuseumScaleOrnamentalProps />
      <MuseumFacadeSilhouette />
      <MuseumScaleRocks />
      <HorizonGrassStrokes />
      <GrassStrokes />
    </group>
  )
}
