import { MUSEUM_GALLERY_BY_ID } from './museumPlan'

export type MuseumTreePosition = readonly [number, number, number]

export type MuseumAtriumPlantFamily = 'bird-of-paradise' | 'black-olive' | 'kentia-palm' | 'umbrella-tree'

export type MuseumGalleryPlantFamily =
  | 'portrait-palm'
  | 'portrait-fern'
  | 'heart-hoya'
  | 'mineral-caladium'
  | 'northlight-fern'
  | 'field-grass'
  | 'river-still-life'
  | 'winter-poinsettia'
  | 'winter-pine'

export type MuseumGalleryPlantSpec = {
  id: string
  galleryId: 'moba-one' | 'moba-two' | 'photography' | 'holiday'
  family: MuseumGalleryPlantFamily
  x: number
  t: number
  inset: number
  baseY: number
  scale: number
  yaw: number
  planterHalfExtent: number
  visualRadius: number
  visualHeight: number
}

export type MuseumExteriorTreeSpec = {
  id: string
  position: MuseumTreePosition
  color: string
  scale: number
  yaw: number
  variant: 0 | 1 | 2
}

/**
 * Gallery-local botanical accents. The darker NFT salons stay sparse while the
 * daylight room gets a small herbarium rhythm. All pieces hug the room edges so
 * the museum's central promenade remains open.
 */
export const MUSEUM_GALLERY_PLANT_SPECS: readonly MuseumGalleryPlantSpec[] = [
  {
    id: 'moba-one-threshold-palm',
    galleryId: 'moba-one',
    family: 'portrait-palm',
    x: 3.95,
    t: 0.25,
    inset: 0.72,
    baseY: -1.93,
    scale: 0.96,
    yaw: -0.3,
    planterHalfExtent: 0.42,
    visualRadius: 0.68,
    visualHeight: 2.04,
  },
  {
    id: 'moba-one-velvet-fern',
    galleryId: 'moba-one',
    family: 'portrait-fern',
    x: 3.85,
    t: 0.65,
    inset: 1.08,
    baseY: -1.93,
    scale: 0.84,
    yaw: 0.46,
    planterHalfExtent: 0.4,
    visualRadius: 0.7,
    visualHeight: 0.92,
  },
  {
    id: 'moba-two-hoya-trellis',
    galleryId: 'moba-two',
    family: 'heart-hoya',
    x: 3.95,
    t: 0.25,
    inset: 0.72,
    baseY: -1.93,
    scale: 0.98,
    yaw: Math.PI / 2,
    planterHalfExtent: 0.43,
    visualRadius: 0.66,
    visualHeight: 1.92,
  },
  {
    id: 'moba-two-caladium-cluster',
    galleryId: 'moba-two',
    family: 'mineral-caladium',
    x: 3.95,
    t: 0.62,
    inset: 0.78,
    baseY: -1.93,
    scale: 0.88,
    yaw: 0.38,
    planterHalfExtent: 0.41,
    visualRadius: 0.72,
    visualHeight: 1.02,
  },
  {
    id: 'photography-window-fern',
    galleryId: 'photography',
    family: 'northlight-fern',
    x: -4.72,
    t: 0.285,
    inset: 1.05,
    baseY: -1.93,
    scale: 0.9,
    yaw: -0.42,
    planterHalfExtent: 0.42,
    visualRadius: 0.72,
    visualHeight: 0.86,
  },
  {
    id: 'photography-field-grass',
    galleryId: 'photography',
    family: 'field-grass',
    x: -4.72,
    t: 0.68,
    inset: 1.05,
    baseY: -1.93,
    scale: 0.92,
    yaw: 0.28,
    planterHalfExtent: 0.38,
    visualRadius: 0.54,
    visualHeight: 1.34,
  },
  {
    id: 'photography-river-still-life',
    galleryId: 'photography',
    family: 'river-still-life',
    x: -3.92,
    t: 0.83,
    inset: 1.08,
    baseY: -1.93,
    scale: 0.9,
    yaw: -0.2,
    planterHalfExtent: 0.48,
    visualRadius: 0.72,
    visualHeight: 0.94,
  },
  {
    id: 'holiday-poinsettia',
    galleryId: 'holiday',
    family: 'winter-poinsettia',
    x: 3.8,
    t: 0.25,
    inset: 0.94,
    baseY: -1.93,
    scale: 0.84,
    yaw: -0.28,
    planterHalfExtent: 0.4,
    visualRadius: 0.66,
    visualHeight: 1.18,
  },
  {
    id: 'holiday-norfolk-pine',
    galleryId: 'holiday',
    family: 'winter-pine',
    x: 3.9,
    t: 0.7,
    inset: 0.94,
    baseY: -1.93,
    scale: 0.78,
    yaw: 0.22,
    planterHalfExtent: 0.42,
    visualRadius: 0.7,
    visualHeight: 2.12,
  },
] as const

export function museumGalleryPlantLocalPosition(spec: MuseumGalleryPlantSpec): MuseumTreePosition {
  const gallery = MUSEUM_GALLERY_BY_ID[spec.galleryId]
  const z = gallery.minZ + spec.inset + (gallery.maxZ - gallery.minZ - spec.inset * 2) * spec.t
  return [spec.x, spec.baseY, z]
}

export function museumGalleryPlantPlanterBounds(spec: MuseumGalleryPlantSpec) {
  const gallery = MUSEUM_GALLERY_BY_ID[spec.galleryId]
  const [localX, , localZ] = museumGalleryPlantLocalPosition(spec)
  const offsetZ = localZ - gallery.minZ
  const cosine = Math.cos(gallery.placement.yaw)
  const sine = Math.sin(gallery.placement.yaw)
  const centerX = gallery.placement.x + localX * cosine + offsetZ * sine
  const centerZ = gallery.placement.z - localX * sine + offsetZ * cosine
  const halfExtent = spec.planterHalfExtent * spec.scale + 0.04
  return {
    id: `${spec.id}-planter`,
    minX: centerX - halfExtent,
    maxX: centerX + halfExtent,
    minZ: centerZ - halfExtent,
    maxZ: centerZ + halfExtent,
  }
}

export const MUSEUM_EXTERIOR_TREE_SPECS: readonly MuseumExteriorTreeSpec[] = [
  { id: 'west-garden-south', position: [-20.2, -1.96, 10.4], color: '#66845b', scale: 1.02, yaw: -0.3, variant: 0 },
  { id: 'west-garden-center', position: [-21.7, -1.96, 17.2], color: '#486e58', scale: 1.14, yaw: 0.24, variant: 1 },
  { id: 'west-garden-north', position: [-20.5, -1.96, 25.7], color: '#708b5d', scale: 0.94, yaw: -0.12, variant: 2 },
  { id: 'east-garden-south', position: [20.3, -1.96, 11.8], color: '#587d66', scale: 0.98, yaw: 0.36, variant: 2 },
  { id: 'east-garden-center', position: [21.8, -1.96, 19.8], color: '#405f55', scale: 1.12, yaw: -0.2, variant: 0 },
  { id: 'east-garden-north', position: [20.4, -1.96, 28.2], color: '#78906d', scale: 0.9, yaw: 0.14, variant: 1 },
  { id: 'entry-garden-west-outer', position: [-10.7, -1.96, 0.65], color: '#607956', scale: 1.08, yaw: 0.18, variant: 1 },
  { id: 'entry-garden-west-inner', position: [-7.25, -1.96, -0.55], color: '#77895a', scale: 0.86, yaw: -0.4, variant: 2 },
  { id: 'entry-garden-east-inner', position: [7.4, -1.96, 0.4], color: '#536f5a', scale: 0.92, yaw: 0.3, variant: 0 },
  { id: 'entry-garden-east-outer', position: [10.8, -1.96, -0.7], color: '#6f845f', scale: 1.06, yaw: -0.16, variant: 1 },
  { id: 'rear-garden-west-outer', position: [-9.8, -1.96, 38.6], color: '#456f5c', scale: 1.1, yaw: -0.28, variant: 2 },
  { id: 'rear-garden-west-inner', position: [-4.8, -1.96, 40.3], color: '#66885d', scale: 0.9, yaw: 0.34, variant: 0 },
  { id: 'rear-garden-east-inner', position: [4.6, -1.96, 39.4], color: '#547a61', scale: 0.96, yaw: -0.22, variant: 1 },
  { id: 'rear-garden-east-outer', position: [10.2, -1.96, 38.2], color: '#719064', scale: 1.08, yaw: 0.2, variant: 2 },
] as const
