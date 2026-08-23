import { MOBA_GALLERY_WORKS, MUSEUM_GALLERIES, type MuseumArtwork } from './museumPlan'
import {
  museumAssetKey,
  type AppliedAtriumInstallation,
  type MuseumAssetIdentity,
  type MuseumAssetSummary,
} from '../collection-registry/museumAssetTypes'
import { ownedNftMediaProxyUrl } from './ownedNfts'

export type AtriumResidentSlot = {
  id: string
  position: readonly [number, number, number]
  yaw: number
  colliderHalfSize: number
}

export type AtriumWallBay = {
  id: string
  side: 'west' | 'east'
  position: readonly [number, number, number]
  rotationY: number
  maxWidth: number
  maxHeight: number
  anchor: boolean
}

export type AtriumWallArtwork = {
  id: string
  title: string
  collection: string
  sourceUrl: string | null
  imageUrl: string
  animationUrl: string | null
  motionSheet: string | null
  motionSheetColumns: number | null
  motionSheetRows: number | null
  motionFrameDurationMs: number | null
  frameCount: number
  aspectRatio: number
  source: 'museum' | 'personal'
  identity?: MuseumAssetIdentity
}

export type AtriumArtworkFrameLayout = {
  mediaWidth: number
  mediaHeight: number
  frameWidth: number
  frameHeight: number
  outerWidth: number
  outerHeight: number
  labelY: number
  labelWidth: number
}

export type OpeningSalonMobaGallerySlot = {
  id: string
  tokenId: string
  position: readonly [number, number, number]
  rotationY: number
  maxWidth: number
  maxHeight: number
}

export const ATRIUM_REGISTRY_DEVICE_POSITION = [-2.65, -0.96, 11.25] as const

// A small collection hang on the Opening Salon's real side walls. These four
// positions sit between the topiaries, sconces, loop doors, and atrium entry.
// The other four MoBA Gallery works are interleaved through the atrium below.
export const OPENING_SALON_MOBA_GALLERY_SLOTS: readonly OpeningSalonMobaGallerySlot[] = [
  { id: 'south-west', tokenId: '1', position: [-5.71, 0.64, 0.42], rotationY: Math.PI / 2, maxWidth: 1.2, maxHeight: 1.28 },
  { id: 'south-east', tokenId: '3', position: [5.71, 0.64, 0.42], rotationY: -Math.PI / 2, maxWidth: 1.16, maxHeight: 1.28 },
  { id: 'north-west', tokenId: '5', position: [-5.71, 0.64, 8.34], rotationY: Math.PI / 2, maxWidth: 1.2, maxHeight: 1.28 },
  { id: 'north-east', tokenId: '7', position: [5.71, 0.64, 8.34], rotationY: -Math.PI / 2, maxWidth: 1.16, maxHeight: 1.28 },
] as const

// The permanent-gallery shells are centred at |x| 6.02 with 0.35m walls.
// Atrium frames sit just inside that face so the complete frame, label, and
// animated media remain visible instead of being buried in the wall panels.
export const ATRIUM_WALL_CENTER_X = 6.02
export const ATRIUM_WALL_THICKNESS = 0.35
export const ATRIUM_WALL_ART_FRAME_DEPTH = 0.12
export const ATRIUM_WALL_INTERIOR_FACE_X = ATRIUM_WALL_CENTER_X - ATRIUM_WALL_THICKNESS * 0.5
export const ATRIUM_WALL_ART_MOUNT_X = ATRIUM_WALL_INTERIOR_FACE_X - ATRIUM_WALL_ART_FRAME_DEPTH * 0.5 - 0.005

export const ATRIUM_RESIDENT_SLOTS: readonly AtriumResidentSlot[] = [
  { id: 'west-01', position: [-2.3, -1.9, 15.6], yaw: 0.62, colliderHalfSize: 0.5 },
  { id: 'east-01', position: [2.3, -1.9, 15.6], yaw: -0.52, colliderHalfSize: 0.5 },
  { id: 'west-02', position: [-2.3, -1.9, 17.55], yaw: 0.44, colliderHalfSize: 0.5 },
  { id: 'east-02', position: [2.3, -1.9, 17.55], yaw: -0.66, colliderHalfSize: 0.5 },
  { id: 'west-03', position: [-2.3, -1.9, 19.55], yaw: 0.58, colliderHalfSize: 0.5 },
  { id: 'east-03', position: [2.3, -1.9, 19.55], yaw: -0.42, colliderHalfSize: 0.5 },
  { id: 'west-04', position: [-2.3, -1.9, 21.55], yaw: 0.38, colliderHalfSize: 0.5 },
  { id: 'east-04', position: [2.3, -1.9, 21.55], yaw: -0.58, colliderHalfSize: 0.5 },
  { id: 'west-05', position: [-2.3, -1.9, 23.55], yaw: 0.68, colliderHalfSize: 0.5 },
  { id: 'east-05', position: [2.3, -1.9, 23.55], yaw: -0.34, colliderHalfSize: 0.5 },
] as const

// These bays intentionally sit between the atrium's actual columns, the two
// cross-axis portals, and the rear passage. They are inside the walls rather
// than adding objects to the walking floor.
const ATRIUM_WALL_BAY_SPECS = {
  west: [
    { z: 11.42, width: 0.82, height: 1.08, anchor: false },
    { z: 15.2, width: 0.88, height: 1.12, anchor: false },
    { z: 18.35, width: 1.34, height: 1.48, anchor: true },
    { z: 20.75, width: 1.34, height: 1.48, anchor: true },
    { z: 24, width: 0.9, height: 1.14, anchor: false },
    { z: 28.25, width: 0.92, height: 1.16, anchor: false },
  ],
  // Photography has two real courtyard windows flanking its atrium door.
  // Keep that architectural sequence open and hang the final pair on the
  // solid limewashed piers before and after the window group.
  east: [
    { z: 11.42, width: 0.82, height: 1.08, anchor: false },
    { z: 15.2, width: 0.88, height: 1.12, anchor: false },
    { z: 18.35, width: 1.34, height: 1.48, anchor: true },
    { z: 20.75, width: 1.34, height: 1.48, anchor: true },
    { z: 22, width: 0.72, height: 1.04, anchor: false },
    { z: 30.45, width: 0.9, height: 1.14, anchor: false },
  ],
} as const

export const ATRIUM_WALL_BAYS: readonly AtriumWallBay[] = (['west', 'east'] as const).flatMap((side) => (
  ATRIUM_WALL_BAY_SPECS[side].map((spec, index) => ({
    id: `${side}-${String(index + 1).padStart(2, '0')}`,
    side,
    position: [side === 'west' ? -ATRIUM_WALL_ART_MOUNT_X : ATRIUM_WALL_ART_MOUNT_X, 0.34, spec.z] as const,
    rotationY: side === 'west' ? Math.PI / 2 : -Math.PI / 2,
    maxWidth: spec.width,
    maxHeight: spec.height,
    anchor: spec.anchor,
  }))
))

export const ATRIUM_DEFAULT_RESIDENT_TOKEN_IDS = ['1', '73', '412'] as const

const defaultWork = (work: MuseumArtwork, collection: string) => ({ work, collection })
const mobaGalleryWork = (tokenId: string) => MOBA_GALLERY_WORKS.find((work) => work.tokenId === tokenId)!
const mobaOneWorks = MUSEUM_GALLERIES.find((gallery) => gallery.id === 'moba-one')!.artworks
const mobaTwoWorks = MUSEUM_GALLERIES.find((gallery) => gallery.id === 'moba-two')!.artworks
const photographyWorks = MUSEUM_GALLERIES.find((gallery) => gallery.id === 'photography')!.artworks
const holidayMotionWorks = MUSEUM_GALLERIES.find((gallery) => gallery.id === 'holiday')!.artworks
  .filter((work) => work.frameCount > 1)

// Interleave MoBA Gallery with the four established wings so the atrium reads
// as a museum-wide collection hang rather than a twelve-frame block from one show.
const DEFAULT_GALLERY_WORKS = [
  defaultWork(mobaGalleryWork('2'), 'MoBA Gallery'),
  defaultWork(mobaOneWorks[0]!, 'MoBA #1'),
  defaultWork(photographyWorks[0]!, 'One Final Album'),
  defaultWork(mobaGalleryWork('4'), 'MoBA Gallery'),
  defaultWork(mobaTwoWorks[0]!, 'MoBA #2'),
  defaultWork(holidayMotionWorks[0]!, 'Holiday Potluck'),
  defaultWork(mobaGalleryWork('6'), 'MoBA Gallery'),
  defaultWork(mobaOneWorks[1]!, 'MoBA #1'),
  defaultWork(photographyWorks[1]!, 'One Final Album'),
  defaultWork(mobaGalleryWork('9'), 'MoBA Gallery'),
  defaultWork(mobaTwoWorks[1]!, 'MoBA #2'),
  defaultWork(holidayMotionWorks[1]!, 'Holiday Potluck'),
] as const

export const ATRIUM_DEFAULT_ARTWORKS: readonly AtriumWallArtwork[] = DEFAULT_GALLERY_WORKS.map(({ work, collection }) => ({
  id: `museum-${work.id}`,
  title: work.title,
  collection,
  sourceUrl: work.sourceUrl,
  imageUrl: work.poster,
  animationUrl: work.motion,
  motionSheet: work.motionSheet ?? null,
  motionSheetColumns: work.motionSheetColumns ?? null,
  motionSheetRows: work.motionSheetRows ?? null,
  motionFrameDurationMs: work.motionFrameDurationMs ?? null,
  frameCount: work.frameCount,
  aspectRatio: Math.max(0.45, Math.min(2, work.width / work.height)),
  source: 'museum',
}))

export function personalAtriumArtwork(asset: MuseumAssetSummary): AtriumWallArtwork | null {
  if (!asset.imageUrl) return null
  return {
    id: `personal-${asset.key}`,
    title: asset.title,
    collection: asset.collection,
    sourceUrl: null,
    imageUrl: ownedNftMediaProxyUrl(asset.imageUrl, 'room'),
    animationUrl: asset.animationUrl ? ownedNftMediaProxyUrl(asset.animationUrl, 'motion') : null,
    motionSheet: null,
    motionSheetColumns: null,
    motionSheetRows: null,
    motionFrameDurationMs: null,
    frameCount: asset.animationUrl ? 2 : 1,
    aspectRatio: 1,
    source: 'personal',
    identity: {
      collectionId: asset.collectionId,
      chainId: asset.chainId,
      contract: asset.contract,
      tokenId: asset.tokenId,
    },
  }
}

export function atriumArtworkFrameLayout(
  bay: AtriumWallBay,
  aspectRatio: number,
): AtriumArtworkFrameLayout {
  const ratio = Math.max(0.42, Math.min(2.35, aspectRatio || 1))
  const maximumMediaWidth = Math.max(0.32, bay.maxWidth - 0.26)
  const maximumMediaHeight = Math.max(0.4, bay.maxHeight - 0.26)
  const mediaWidth = ratio >= maximumMediaWidth / maximumMediaHeight
    ? maximumMediaWidth
    : maximumMediaHeight * ratio
  const mediaHeight = ratio >= maximumMediaWidth / maximumMediaHeight
    ? maximumMediaWidth / ratio
    : maximumMediaHeight
  const frameWidth = mediaWidth + 0.16
  const frameHeight = mediaHeight + 0.16
  const outerWidth = frameWidth + 0.1
  const outerHeight = frameHeight + 0.1
  return {
    mediaWidth,
    mediaHeight,
    frameWidth,
    frameHeight,
    outerWidth,
    outerHeight,
    labelY: -outerHeight * 0.5 - 0.14,
    labelWidth: Math.min(0.78, outerWidth * 0.82),
  }
}

export function buildAtriumWallInstallation(
  installation: AppliedAtriumInstallation | null,
  assets: readonly MuseumAssetSummary[],
) {
  if (!installation) return ATRIUM_DEFAULT_ARTWORKS
  const owned = new Map(assets.map((asset) => [asset.key, asset]))
  const personal = installation.artworks
    .map((identity) => owned.get(museumAssetKey(identity)))
    .flatMap((asset) => asset ? [personalAtriumArtwork(asset)] : [])
    .filter((artwork): artwork is AtriumWallArtwork => artwork !== null)
  return ATRIUM_DEFAULT_ARTWORKS.map((defaultArtwork, index) => personal[index] ?? defaultArtwork)
}

export function selectedResidentAssets(
  installation: AppliedAtriumInstallation | null,
  assets: readonly MuseumAssetSummary[],
) {
  if (!installation) return ATRIUM_DEFAULT_RESIDENT_TOKEN_IDS.map((tokenId) => ({
    collectionId: 'glowbuds',
    chainId: 2741,
    contract: '0x40148d9aec2d0aed12ccf556cd7cd79c15197644' as const,
    tokenId,
    key: `glowbuds:2741:0x40148d9aec2d0aed12ccf556cd7cd79c15197644:${tokenId}`,
    category: 'resident' as const,
    title: `Museum Resident · Glowbud #${tokenId}`,
    collection: 'Museum Residents',
    imageUrl: null,
    animationUrl: null,
    attributes: [],
  }))
  const byKey = new Map(assets.map((asset) => [asset.key, asset]))
  return installation.glowbuds.flatMap((identity) => {
    const asset = byKey.get(museumAssetKey(identity))
    return asset ? [asset] : []
  })
}

export function atriumResidentColliders(count: number) {
  return ATRIUM_RESIDENT_SLOTS.slice(0, count).map((slot) => ({
    id: `atrium-personal-resident-${slot.id}`,
    minX: slot.position[0] - slot.colliderHalfSize,
    maxX: slot.position[0] + slot.colliderHalfSize,
    minZ: slot.position[2] - slot.colliderHalfSize,
    maxZ: slot.position[2] + slot.colliderHalfSize,
  }))
}
