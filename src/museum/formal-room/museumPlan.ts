import galleryManifest from '../../../public/museum/formal-room/galleries/manifest.json'

export const MUSEUM_GALLERY_IDS = [
  'lobby',
  'moba-one',
  'moba-two',
  'photography',
  'holiday',
] as const

export type MuseumGalleryId = (typeof MUSEUM_GALLERY_IDS)[number]
export type MuseumAreaId = MuseumGalleryId | 'atrium'

export type MuseumTravelPose = {
  x: number
  z: number
  yaw: number
}

export type MuseumPoint = {
  x: number
  z: number
}

export type MuseumPlacement = MuseumPoint & {
  yaw: number
}

export type MuseumWalkZone = {
  id: string
  galleryId: MuseumGalleryId
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export type MuseumAtriumPortal = {
  id: string
  galleryId: MuseumGalleryId
  room: MuseumPoint
  atrium: MuseumPoint
  tangent: MuseumPoint
  halfWidth: number
}

export type MuseumArtwork = {
  id: string
  tokenId: string
  title: string
  artist?: string
  poster: string
  posterAtlasIndex: number
  motion: string | null
  motionSheet?: string | null
  motionSheetColumns?: number | null
  motionSheetRows?: number | null
  motionFrameDurationMs?: number | null
  frameCount: number
  featured: boolean
  width: number
  height: number
  sourceUrl: string
  collector?: {
    holderRank: number
    address: `0x${string}`
    label: string
  }
}

export type MuseumPosterAtlas = {
  version: number
  src: string
  columns: number
  rows: number
  cellSize: number
  width: number
  height: number
  workCount: number
  indexOrder: string
  sha256: string
}

export type MuseumGalleryPlan = {
  id: MuseumGalleryId
  shortTitle: string
  title: string
  eyebrow: string
  description: string
  nextPrompt: string
  accent: string
  wall: string
  wallLight: string
  floor: string
  trim: string
  light: string
  minZ: number
  maxZ: number
  placement: MuseumPlacement
  travelPose: MuseumTravelPose
  collectionUrl?: string
  artworks: readonly MuseumArtwork[]
}

type ManifestCollection = {
  collectionUrl: string
  works: MuseumArtwork[]
}

const collections = galleryManifest.collections as Record<string, ManifestCollection>

export const MUSEUM_POSTER_ATLAS = galleryManifest.posterAtlas as MuseumPosterAtlas

export function museumPosterAtlasUvBounds(posterAtlasIndex: number) {
  if (!Number.isInteger(posterAtlasIndex) || posterAtlasIndex < 0 || posterAtlasIndex >= MUSEUM_POSTER_ATLAS.workCount) {
    throw new RangeError(`Invalid museum poster atlas index: ${posterAtlasIndex}`)
  }
  const column = posterAtlasIndex % MUSEUM_POSTER_ATLAS.columns
  const row = Math.floor(posterAtlasIndex / MUSEUM_POSTER_ATLAS.columns)
  const insetU = 0.5 / MUSEUM_POSTER_ATLAS.width
  const insetV = 0.5 / MUSEUM_POSTER_ATLAS.height
  return {
    u0: column / MUSEUM_POSTER_ATLAS.columns + insetU,
    u1: (column + 1) / MUSEUM_POSTER_ATLAS.columns - insetU,
    v0: 1 - (row + 1) / MUSEUM_POSTER_ATLAS.rows + insetV,
    v1: 1 - row / MUSEUM_POSTER_ATLAS.rows - insetV,
  }
}

export const MOBA_GALLERY_WORKS: readonly MuseumArtwork[] = collections['moba-gallery'].works

export const MUSEUM_GALLERIES: readonly MuseumGalleryPlan[] = [
  {
    id: 'lobby',
    shortTitle: 'Opening Salon',
    title: 'Main Museum',
    eyebrow: 'Opening Salon',
    description: 'The Opening Salon, central atrium, and four connected galleries form the museum\'s main walk.',
    nextPrompt: 'Enter the atrium and choose any gallery',
    accent: '#d2a543',
    wall: '#356d69',
    wallLight: '#f3dfbc',
    floor: '#845034',
    trim: '#4d2d24',
    light: '#ffd88f',
    minZ: -0.72,
    maxZ: 10.35,
    placement: { x: 0, z: 0, yaw: 0 },
    travelPose: { x: 0, z: 5, yaw: Math.PI },
    artworks: [],
  },
  {
    id: 'moba-one',
    shortTitle: 'MoBA #1',
    title: 'Portraits of an Enjoyer',
    eyebrow: 'Exhibition 01 · 2024',
    description: 'A collector-led portrait salon drawn from the leading MoBA #1 holdings, set against oxblood plaster, walnut parquet, velvet, and candle-warm light.',
    nextPrompt: 'Next: Curated Hearts',
    accent: '#b0915e',
    wall: '#8a5f69',
    wallLight: '#c09b99',
    floor: '#63483e',
    trim: '#4a332e',
    light: '#f3ddbc',
    minZ: 10.35,
    maxZ: 23.2,
    placement: { x: -12.2, z: 6.8, yaw: 0 },
    travelPose: { x: -12.2, z: 8.5, yaw: Math.PI + 0.28 },
    collectionUrl: collections['moba-one'].collectionUrl,
    artworks: collections['moba-one'].works,
  },
  {
    id: 'moba-two',
    shortTitle: 'MoBA #2',
    title: 'Curated Hearts',
    eyebrow: 'Exhibition 02 · 2025',
    description: 'A collector-led salon of animated hearts held by leading MoBA #1 collectors, composed as a serene mineral-blue gallery of pearly terrazzo, garden light, and pale oak.',
    nextPrompt: 'Next: One Final Album',
    accent: '#cc788e',
    wall: '#839ba3',
    wallLight: '#c8d3cf',
    floor: '#aeb8b3',
    trim: '#40545a',
    light: '#f0f3ec',
    minZ: 23.2,
    maxZ: 36.25,
    placement: { x: -12.2, z: 19.65, yaw: 0 },
    travelPose: { x: -12.2, z: 21.4, yaw: Math.PI - 0.24 },
    collectionUrl: collections['moba-two'].collectionUrl,
    artworks: collections['moba-two'].works,
  },
  {
    id: 'photography',
    shortTitle: 'Photography',
    title: 'One Final Album',
    eyebrow: 'Photography Room · 2025',
    description: 'A serene north-light photography archive of mountain, mist, and field memory in warm limewash, Jura limestone, and natural ash.',
    nextPrompt: 'Next: Holiday Potluck',
    accent: '#956f60',
    wall: '#eee9de',
    wallLight: '#faf4e9',
    floor: '#c9c3b7',
    trim: '#59655f',
    light: '#f0f4ed',
    minZ: 36.25,
    maxZ: 49.25,
    placement: { x: 12.2, z: 32.7, yaw: Math.PI },
    travelPose: { x: 12.2, z: 31, yaw: 0 },
    collectionUrl: collections.photography.collectionUrl,
    artworks: collections.photography.works,
  },
  {
    id: 'holiday',
    shortTitle: 'Holiday Potluck',
    title: 'MoBA × Tweaks',
    eyebrow: 'Winter Gallery · 2024',
    description: 'Eleven Potluck works gathered in a cranberry-and-evergreen winter salon of frosted daylight, smoked oak, wool, and candle-warm brass.',
    nextPrompt: 'Opening Salon via the East Gallery Wing',
    accent: '#b39255',
    wall: '#76535c',
    wallLight: '#a9837c',
    floor: '#4b372f',
    trim: '#2f4438',
    light: '#f1dfbd',
    minZ: 49.25,
    maxZ: 62.15,
    placement: { x: 12.2, z: 19.7, yaw: Math.PI },
    travelPose: { x: 12.2, z: 17.9, yaw: 0 },
    collectionUrl: collections.holiday.collectionUrl,
    artworks: collections.holiday.works,
  },
] as const

export const MUSEUM_GALLERY_BY_ID = Object.fromEntries(
  MUSEUM_GALLERIES.map((gallery) => [gallery.id, gallery]),
) as Record<MuseumGalleryId, MuseumGalleryPlan>

export const MUSEUM_LOOP_PORTALS = {
  entry: {
    side: 'left' as const,
    salon: { x: -5.3, z: 5 },
    wing: { x: -7.05, z: 5 },
    tangent: { x: 0, z: 1 },
    halfWidth: 1.35,
  },
  return: {
    side: 'right' as const,
    salon: { x: 5.3, z: 5 },
    wing: { x: 7.05, z: 5 },
    tangent: { x: 0, z: 1 },
    halfWidth: 1.35,
  },
} as const

export const MUSEUM_GALLERY_ZONES: readonly MuseumWalkZone[] = [
  { id: 'lobby-main', galleryId: 'lobby', minX: -5.84, maxX: 5.84, minZ: -1.05, maxZ: 9.7 },
  { id: 'moba-one-link', galleryId: 'moba-one', minX: -12.65, maxX: -4.6, minZ: 3.15, maxZ: 6.85 },
  { id: 'moba-one-wing', galleryId: 'moba-one', minX: -18.05, maxX: -6.35, minZ: 5.9, maxZ: 20.1 },
  { id: 'moba-two-wing', galleryId: 'moba-two', minX: -18.05, maxX: -6.35, minZ: 19.2, maxZ: 33.45 },
  { id: 'moba-two-turn', galleryId: 'moba-two', minX: -12.65, maxX: 0.55, minZ: 31.85, maxZ: 35.5 },
  { id: 'photography-turn', galleryId: 'photography', minX: -0.55, maxX: 12.65, minZ: 31.85, maxZ: 35.5 },
  { id: 'photography-wing', galleryId: 'photography', minX: 6.35, maxX: 18.05, minZ: 19.2, maxZ: 33.45 },
  { id: 'holiday-wing', galleryId: 'holiday', minX: 6.35, maxX: 18.05, minZ: 5.9, maxZ: 20.1 },
  { id: 'holiday-link', galleryId: 'holiday', minX: 4.6, maxX: 12.65, minZ: 3.15, maxZ: 6.85 },
] as const

export const MUSEUM_ATRIUM_PORTALS = {
  salon: {
    id: 'salon-atrium',
    galleryId: 'lobby',
    room: { x: 0, z: 9.25 },
    atrium: { x: 0, z: 10.55 },
    tangent: { x: 1, z: 0 },
    halfWidth: 1.7,
  },
  mobaOne: {
    id: 'atrium-moba-one',
    galleryId: 'moba-one',
    room: { x: -7, z: 13.25 },
    atrium: { x: -5.25, z: 13.25 },
    tangent: { x: 0, z: 1 },
    halfWidth: 1.1,
  },
  holiday: {
    id: 'atrium-holiday',
    galleryId: 'holiday',
    room: { x: 7, z: 13.25 },
    atrium: { x: 5.25, z: 13.25 },
    tangent: { x: 0, z: 1 },
    halfWidth: 1.1,
  },
  mobaTwo: {
    id: 'atrium-moba-two',
    galleryId: 'moba-two',
    room: { x: -7, z: 26.15 },
    atrium: { x: -5.25, z: 26.15 },
    tangent: { x: 0, z: 1 },
    halfWidth: 1.1,
  },
  photography: {
    id: 'atrium-photography',
    galleryId: 'photography',
    room: { x: 7, z: 26.15 },
    atrium: { x: 5.25, z: 26.15 },
    tangent: { x: 0, z: 1 },
    halfWidth: 1.1,
  },
} as const satisfies Record<string, MuseumAtriumPortal>

export const MUSEUM_ATRIUM_REAR_PASSAGE = {
  id: 'atrium-rear-passage',
  atrium: { x: 0, z: 31.05 },
  turn: { x: 0, z: 33.35 },
  tangent: { x: 1, z: 0 },
  halfWidth: 2.05,
} as const

export const MUSEUM_ATRIUM_WALK_ZONES: readonly MuseumWalkZone[] = [
  { id: 'atrium-main', galleryId: 'lobby', minX: -5.68, maxX: 5.68, minZ: 9.5, maxZ: 31.65 },
  { id: 'atrium-salon-throat', galleryId: 'lobby', minX: -1.85, maxX: 1.85, minZ: 8.7, maxZ: 10.9 },
  { id: 'atrium-rear-throat', galleryId: 'lobby', minX: -2.3, maxX: 2.3, minZ: 30.8, maxZ: 33.25 },
  { id: 'atrium-moba-one-throat', galleryId: 'moba-one', minX: -7.2, maxX: -4.9, minZ: 11.8, maxZ: 14.7 },
  { id: 'atrium-holiday-throat', galleryId: 'holiday', minX: 4.9, maxX: 7.2, minZ: 11.8, maxZ: 14.7 },
  { id: 'atrium-moba-two-throat', galleryId: 'moba-two', minX: -7.2, maxX: -4.9, minZ: 24.7, maxZ: 27.6 },
  { id: 'atrium-photography-throat', galleryId: 'photography', minX: 4.9, maxX: 7.2, minZ: 24.7, maxZ: 27.6 },
] as const

export const MUSEUM_WALK_ZONES: readonly MuseumWalkZone[] = [
  ...MUSEUM_GALLERY_ZONES,
  ...MUSEUM_ATRIUM_WALK_ZONES,
] as const

export const MUSEUM_ATRIUM_WAYPOINTS = [
  { id: 'salon-side', galleryId: 'lobby', x: 0, z: 9.25 },
  { id: 'atrium-arrival', galleryId: 'lobby', x: 0, z: 11 },
  { id: 'south-cross-axis', galleryId: 'lobby', x: 0, z: 13.25 },
  { id: 'mobile-south', galleryId: 'lobby', x: 0, z: 17.4 },
  { id: 'mobile-medallion', galleryId: 'lobby', x: 0, z: 19.55 },
  { id: 'mobile-north', galleryId: 'lobby', x: 0, z: 21.8 },
  { id: 'north-cross-axis', galleryId: 'lobby', x: 0, z: 26.15 },
  { id: 'garden-belvedere', galleryId: 'lobby', x: 0, z: 30.8 },
  { id: 'personal-galleries-turn', galleryId: 'moba-two', x: 0, z: 33.35 },
] as const

export const MUSEUM_LOOP_WAYPOINTS = [
  { id: 'salon-start', galleryId: 'lobby', x: 0, z: 5 },
  { id: 'left-door', galleryId: 'lobby', x: -5.3, z: 5 },
  { id: 'left-link', galleryId: 'moba-one', x: -9.2, z: 5 },
  { id: 'moba-one-entry', galleryId: 'moba-one', x: -12.2, z: 7.2 },
  { id: 'moba-one-exit', galleryId: 'moba-one', x: -12.2, z: 18.7 },
  { id: 'moba-two-entry', galleryId: 'moba-two', x: -12.2, z: 20.7 },
  { id: 'moba-two-heart-south', galleryId: 'moba-two', x: -10.2, z: 24.6 },
  { id: 'moba-two-heart-north', galleryId: 'moba-two', x: -10.2, z: 27.8 },
  { id: 'moba-two-exit', galleryId: 'moba-two', x: -12.2, z: 33.8 },
  { id: 'turn-center', galleryId: 'photography', x: 0.75, z: 34 },
  { id: 'photography-door-approach', galleryId: 'photography', x: 12.2, z: 34 },
  { id: 'photography-entry', galleryId: 'photography', x: 12.2, z: 32.2 },
  { id: 'photography-exit', galleryId: 'photography', x: 12.2, z: 20.4 },
  { id: 'holiday-entry', galleryId: 'holiday', x: 12.2, z: 18.7 },
  { id: 'holiday-exit', galleryId: 'holiday', x: 11.16, z: 7.2 },
  { id: 'right-link', galleryId: 'holiday', x: 9.2, z: 5 },
  { id: 'right-door', galleryId: 'lobby', x: 5.3, z: 5 },
  { id: 'salon-finish', galleryId: 'lobby', x: 0, z: 5 },
] as const

export function museumGalleryAtPosition(point: MuseumPoint): MuseumGalleryId {
  return MUSEUM_GALLERY_ZONES.find((zone) => (
    point.x >= zone.minX
    && point.x <= zone.maxX
    && point.z >= zone.minZ
    && point.z <= zone.maxZ
  ))?.galleryId ?? 'lobby'
}

export function museumAreaAtPosition(point: MuseumPoint): MuseumAreaId {
  const inAtrium = MUSEUM_ATRIUM_WALK_ZONES
    .filter((zone) => zone.id === 'atrium-main' || zone.id === 'atrium-rear-throat')
    .some((zone) => (
      point.x >= zone.minX
      && point.x <= zone.maxX
      && point.z >= zone.minZ
      && point.z <= zone.maxZ
    ))
  if (inAtrium) return 'atrium'
  return museumGalleryAtPosition(point)
}

export function nextMuseumGallery(id: MuseumGalleryId): MuseumGalleryPlan {
  const index = MUSEUM_GALLERIES.findIndex((gallery) => gallery.id === id)
  return MUSEUM_GALLERIES[(index + 1) % MUSEUM_GALLERIES.length]
}

export const MUSEUM_ARTWORK_COUNT = MUSEUM_GALLERIES.reduce(
  (total, gallery) => total + gallery.artworks.length,
  0,
)
