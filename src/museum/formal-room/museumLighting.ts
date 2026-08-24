import {
  MUSEUM_GALLERY_BY_ID,
  type MuseumGalleryId,
  type MuseumGalleryPlan,
} from './museumPlan'
import { MONKEYDHASHY_CREATEBOX_SPEC } from './monkeydhashyCreatebox'

export type MuseumLightRole = 'key' | 'fill' | 'accent'

export type MuseumLightSource =
  | 'picture-light'
  | 'laylight'
  | 'clerestory'
  | 'north-light'
  | 'winter-window'
  | 'glass-roof'

export type MuseumSpotlightPlan = {
  id: string
  role: MuseumLightRole
  source: MuseumLightSource
  position: readonly [number, number, number]
  target: readonly [number, number, number]
  color: string
  intensity: number
  distance: number
  angle: number
  penumbra?: number
}

export type OpeningSalonArtworkLightPlan = MuseumSpotlightPlan & {
  artworkX: number
  artworkY: number
}

export type PermanentMuseumGalleryId = Exclude<MuseumGalleryId, 'lobby'>

export type MuseumGallerySurfaceLightingPlan = {
  wallEmissive: string
  lowerWallEmissive: string
  activeWallEmissiveIntensity: number
  inactiveWallEmissiveIntensity: number
  activeLowerWallEmissiveIntensity: number
  inactiveLowerWallEmissiveIntensity: number
  artworkWashColor: string
  artworkWashOpacity: number
}

export const MUSEUM_LIGHTING_BUDGET = {
  baselineLights: 2,
  openingSalonActiveLights: 4,
  atriumActiveLights: 6,
  galleryActiveLights: 3,
  maximumSimultaneousLights: 8,
  castsRealtimeShadows: false,
} as const

export const MUSEUM_BASE_LIGHTING = {
  ambient: {
    color: '#fff0dd',
    intensity: 0.38,
  },
  hemisphere: {
    skyColor: '#f1faf5',
    groundColor: '#586361',
    intensity: 0.62,
  },
} as const

export const MUSEUM_VIEWPORT_EXPOSURE = {
  desktop: 1.12,
  compact: 1.22,
  mobile: 1.34,
  compactMaxWidth: 920,
  mobileMaxWidth: 700,
} as const

export function museumToneMappingExposure(viewportWidth: number): number {
  if (viewportWidth <= MUSEUM_VIEWPORT_EXPOSURE.mobileMaxWidth) {
    return MUSEUM_VIEWPORT_EXPOSURE.mobile
  }
  if (viewportWidth <= MUSEUM_VIEWPORT_EXPOSURE.compactMaxWidth) {
    return MUSEUM_VIEWPORT_EXPOSURE.compact
  }
  return MUSEUM_VIEWPORT_EXPOSURE.desktop
}

/**
 * A restrained material response for each gallery. These are not extra lights:
 * they reproduce the soft ambient bounce that real museum plaster, stone, and
 * timber would pick up from the authored fixtures below.
 */
export const MUSEUM_GALLERY_SURFACE_LIGHTING: Readonly<Record<PermanentMuseumGalleryId, MuseumGallerySurfaceLightingPlan>> = {
  'moba-one': {
    wallEmissive: '#a76561',
    lowerWallEmissive: '#7a4b45',
    activeWallEmissiveIntensity: 0.18,
    inactiveWallEmissiveIntensity: 0.04,
    activeLowerWallEmissiveIntensity: 0.15,
    inactiveLowerWallEmissiveIntensity: 0.032,
    artworkWashColor: '#f3d5a3',
    artworkWashOpacity: 0.07,
  },
  'moba-two': {
    wallEmissive: '#c2d3d0',
    lowerWallEmissive: '#9ab3b6',
    activeWallEmissiveIntensity: 0.16,
    inactiveWallEmissiveIntensity: 0.042,
    activeLowerWallEmissiveIntensity: 0.14,
    inactiveLowerWallEmissiveIntensity: 0.034,
    artworkWashColor: '#dce9e5',
    artworkWashOpacity: 0.04,
  },
  photography: {
    wallEmissive: '#dce7e2',
    lowerWallEmissive: '#e1e2db',
    activeWallEmissiveIntensity: 0.12,
    inactiveWallEmissiveIntensity: 0.04,
    activeLowerWallEmissiveIntensity: 0.09,
    inactiveLowerWallEmissiveIntensity: 0.03,
    artworkWashColor: '#e6e9df',
    artworkWashOpacity: 0.03,
  },
  holiday: {
    wallEmissive: '#a66b70',
    lowerWallEmissive: '#52715e',
    activeWallEmissiveIntensity: 0.18,
    inactiveWallEmissiveIntensity: 0.04,
    activeLowerWallEmissiveIntensity: 0.15,
    inactiveLowerWallEmissiveIntensity: 0.032,
    artworkWashColor: '#f1d3a2',
    artworkWashOpacity: 0.055,
  },
} as const

export const OPENING_SALON_ARTWORK_LIGHTS: readonly OpeningSalonArtworkLightPlan[] = [
  {
    id: 'salon-heart-picture-light',
    role: 'fill',
    source: 'picture-light',
    artworkX: -3.55,
    artworkY: 0.28,
    position: [-2.91, 3.24, 2.55],
    target: [-3.55, 0.28, -1.75],
    color: '#f4d3a3',
    intensity: 2.95,
    distance: 8.2,
    angle: 0.36,
    penumbra: 0.9,
  },
  {
    id: 'salon-enjoyable-picture-light',
    role: 'key',
    source: 'picture-light',
    artworkX: 0,
    artworkY: 0.5,
    position: [0, 3.24, 2.55],
    target: [0, 0.5, -1.75],
    color: '#ffedbd',
    intensity: 4.35,
    distance: 8.8,
    angle: 0.44,
    penumbra: 0.92,
  },
  {
    id: 'salon-curated-heart-picture-light',
    role: 'fill',
    source: 'picture-light',
    artworkX: 3.55,
    artworkY: 0.28,
    position: [2.91, 3.24, 2.55],
    target: [3.55, 0.28, -1.75],
    color: '#f4d3a3',
    intensity: 2.95,
    distance: 8.2,
    angle: 0.36,
    penumbra: 0.9,
  },
] as const

export const OPENING_SALON_ARCHITECTURAL_LIGHTS: readonly MuseumSpotlightPlan[] = [
  {
    id: 'salon-warm-ceiling-wash',
    role: 'accent',
    source: 'laylight',
    position: [-3.7, 3.3, 3.2],
    target: [1.6, -1.05, 0.8],
    color: '#f1c990',
    intensity: 2.05,
    distance: 9,
    angle: 0.82,
    penumbra: 0.94,
  },
] as const

export const MUSEUM_ATRIUM_LIGHTING_PLAN: readonly MuseumSpotlightPlan[] = [
  {
    id: 'atrium-glass-roof-daylight',
    role: 'key',
    source: 'glass-roof',
    position: [-3.8, 5.18, 13.7],
    target: [1.35, -1.58, 21.9],
    color: '#ffe2ab',
    intensity: 4.9,
    distance: 18,
    angle: 0.74,
    penumbra: 0.94,
  },
  {
    id: 'atrium-mobile-counterlight',
    role: 'accent',
    source: 'glass-roof',
    position: [3.45, 4.95, 27],
    target: [-1.3, 0.2, 20.3],
    color: '#d6ebe7',
    intensity: 3.55,
    distance: 15,
    angle: 1.02,
    penumbra: 0.92,
  },
  {
    id: 'atrium-moba-one-portal-spill',
    role: 'fill',
    source: 'laylight',
    position: [-6.55, 2.15, 13.25],
    target: [-4.55, 0.1, 13.25],
    color: '#f3ddbc',
    intensity: 0.7,
    distance: 4.6,
    angle: 0.64,
    penumbra: 0.9,
  },
  {
    id: 'atrium-holiday-portal-spill',
    role: 'fill',
    source: 'winter-window',
    position: [6.55, 2.15, 13.25],
    target: [4.55, 0.1, 13.25],
    color: '#f2dfbd',
    intensity: 0.65,
    distance: 4.6,
    angle: 0.64,
    penumbra: 0.9,
  },
  {
    id: 'atrium-moba-two-portal-spill',
    role: 'fill',
    source: 'clerestory',
    position: [-6.55, 2.15, 26.15],
    target: [-4.55, 0.1, 26.15],
    color: '#e5ede8',
    intensity: 0.62,
    distance: 4.6,
    angle: 0.64,
    penumbra: 0.9,
  },
  {
    id: 'atrium-photography-portal-spill',
    role: 'fill',
    source: 'north-light',
    position: [6.55, 2.15, 26.15],
    target: [4.55, 0.1, 26.15],
    color: '#e8f1ed',
    intensity: 0.62,
    distance: 4.6,
    angle: 0.64,
    penumbra: 0.9,
  },
] as const

function galleryZ(gallery: MuseumGalleryPlan, t: number, inset = 1.45) {
  return gallery.minZ + inset + (gallery.maxZ - inset - (gallery.minZ + inset)) * t
}

const mobaOne = MUSEUM_GALLERY_BY_ID['moba-one']
const mobaTwo = MUSEUM_GALLERY_BY_ID['moba-two']
const photography = MUSEUM_GALLERY_BY_ID.photography
const holiday = MUSEUM_GALLERY_BY_ID.holiday

export const MUSEUM_GALLERY_LIGHTING_PLANS: Readonly<Record<PermanentMuseumGalleryId, readonly MuseumSpotlightPlan[]>> = {
  'moba-one': [
    {
      id: 'moba-one-feature-picture-light',
      role: 'key',
      source: 'picture-light',
      position: [-1.6, 2.92, mobaOne.maxZ - 3.1],
      target: [-4.18, 0.16, mobaOne.maxZ - 0.42],
      color: '#ffe0ae',
      intensity: 4.9,
      distance: 7.2,
      angle: 0.46,
      penumbra: 0.9,
    },
    {
      id: 'moba-one-south-laylight-wash',
      role: 'fill',
      source: 'laylight',
      position: [2.2, 3.02, galleryZ(mobaOne, 0.3, 0.95)],
      target: [-4.9, -0.12, galleryZ(mobaOne, 0.43, 1.2)],
      color: '#f5d3ab',
      intensity: 2.7,
      distance: 11,
      angle: 0.8,
      penumbra: 0.92,
    },
    {
      id: 'moba-one-clerestory-wash',
      role: 'accent',
      source: 'clerestory',
      position: [-5.42, 2.46, galleryZ(mobaOne, 0.58, 1.05)],
      target: [4.7, -0.28, galleryZ(mobaOne, 0.63, 1.05)],
      color: '#f0cf9c',
      intensity: 2.2,
      distance: 8.8,
      angle: 0.58,
      penumbra: 0.9,
    },
  ],
  'moba-two': [
    {
      id: 'moba-two-createbox-prismatic-key',
      role: 'key',
      source: 'picture-light',
      position: MONKEYDHASHY_CREATEBOX_SPEC.lights[0].position,
      target: MONKEYDHASHY_CREATEBOX_SPEC.lights[0].target,
      color: MONKEYDHASHY_CREATEBOX_SPEC.lights[0].color,
      intensity: MONKEYDHASHY_CREATEBOX_SPEC.lights[0].intensity,
      distance: MONKEYDHASHY_CREATEBOX_SPEC.lights[0].distance,
      angle: MONKEYDHASHY_CREATEBOX_SPEC.lights[0].angle,
      penumbra: MONKEYDHASHY_CREATEBOX_SPEC.lights[0].penumbra,
    },
    {
      id: 'moba-two-sculpture-oculus-light',
      role: 'accent',
      source: 'laylight',
      position: [-1.45, 2.9, 28.4],
      target: [0, 0.04, 29.725],
      color: '#ffd0dc',
      intensity: 3.15,
      distance: 6.4,
      angle: 0.46,
      penumbra: 0.92,
    },
    {
      id: 'moba-two-mineral-wall-wash',
      role: 'fill',
      source: 'clerestory',
      position: [-5.35, 2.55, galleryZ(mobaTwo, 0.59, 1.05)],
      target: [4.35, -0.1, galleryZ(mobaTwo, 0.64, 1.05)],
      color: '#d9e8e2',
      intensity: 2.5,
      distance: 10.4,
      angle: 0.68,
      penumbra: 0.92,
    },
  ],
  photography: [
    {
      id: 'photography-end-diptych-light',
      role: 'key',
      source: 'picture-light',
      position: [-0.7, 2.94, photography.maxZ - 3.2],
      target: [0, 0.18, photography.maxZ - 0.42],
      color: '#f0eee4',
      intensity: 4,
      distance: 8.4,
      angle: 0.82,
      penumbra: 0.9,
    },
    {
      id: 'photography-south-northlight-wash',
      role: 'fill',
      source: 'north-light',
      position: [-2.6, 3.02, galleryZ(photography, 0.24, 0.95)],
      target: [5.5, 0.3, galleryZ(photography, 0.38, 1.2)],
      color: '#dbeae7',
      intensity: 3.05,
      distance: 11.4,
      angle: 0.78,
      penumbra: 0.92,
    },
    {
      id: 'photography-north-northlight-wash',
      role: 'accent',
      source: 'north-light',
      position: [2.6, 3.02, galleryZ(photography, 0.76, 0.95)],
      target: [-5.5, 0.28, galleryZ(photography, 0.64, 1.2)],
      color: '#ead7bd',
      intensity: 2.3,
      distance: 11.2,
      angle: 0.8,
      penumbra: 0.92,
    },
  ],
  holiday: [
    {
      id: 'holiday-feature-picture-light',
      role: 'key',
      source: 'picture-light',
      position: [-1.2, 2.92, holiday.maxZ - 3.2],
      target: [-4.18, 0.16, holiday.maxZ - 0.42],
      color: '#f5d4a4',
      intensity: 4,
      distance: 8.8,
      angle: 0.48,
      penumbra: 0.9,
    },
    {
      id: 'holiday-companion-picture-light',
      role: 'accent',
      source: 'picture-light',
      position: [1.2, 2.92, holiday.maxZ - 3.2],
      target: [4.18, 0.16, holiday.maxZ - 0.42],
      color: '#e8eee8',
      intensity: 3,
      distance: 8.8,
      angle: 0.48,
      penumbra: 0.9,
    },
    {
      id: 'holiday-winter-window-wash',
      role: 'fill',
      source: 'winter-window',
      position: [-4.35, 2.85, galleryZ(holiday, 0.6, 1.05)],
      target: [3.9, 0.24, galleryZ(holiday, 0.55, 1.2)],
      color: '#d9e7e3',
      intensity: 2.4,
      distance: 10.5,
      angle: 0.74,
      penumbra: 0.94,
    },
  ],
} as const
