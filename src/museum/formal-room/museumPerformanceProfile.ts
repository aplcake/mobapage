export type MuseumPerformanceTier = 'compact' | 'balanced' | 'showcase'

export type MuseumPerformanceSignals = {
  viewportWidth: number
  coarsePointer: boolean
  saveData: boolean
  deviceMemoryGb?: number
  hardwareConcurrency?: number
}

export type MuseumPerformanceProfile = {
  tier: MuseumPerformanceTier
  dpr: [number, number]
  antialias: boolean
  activeMotionFps: number
  distantMotionFps: number
  featuredMotionEdge: number
  standardMotionEdge: number
  artworkMotionDistance: number
  glowbudMotionFps: number
  distantGlowbudMotionFps: number
}

export type MuseumDetailVisibilitySignals = {
  distance: number
  projectedX: number
  projectedY: number
  projectedZ: number
  maxDistance: number
  wasDetailed: boolean
}

export function resolveMuseumDetailVisibility({
  distance,
  projectedX,
  projectedY,
  projectedZ,
  maxDistance,
  wasDetailed,
}: MuseumDetailVisibilitySignals) {
  const distanceLimit = maxDistance + (wasDetailed ? 2.5 : 0)
  const viewMargin = wasDetailed ? 1.55 : 1.3
  return distance <= distanceLimit
    && projectedZ >= -1
    && projectedZ <= 1
    && Math.abs(projectedX) <= viewMargin
    && Math.abs(projectedY) <= viewMargin
}

const MUSEUM_PERFORMANCE_PROFILES: Record<MuseumPerformanceTier, MuseumPerformanceProfile> = {
  compact: {
    tier: 'compact',
    dpr: [0.86, 0.86],
    antialias: false,
    activeMotionFps: 8,
    distantMotionFps: 2,
    featuredMotionEdge: 384,
    standardMotionEdge: 256,
    artworkMotionDistance: 16,
    glowbudMotionFps: 12,
    distantGlowbudMotionFps: 6,
  },
  balanced: {
    tier: 'balanced',
    dpr: [0.82, 0.82],
    antialias: true,
    activeMotionFps: 10,
    distantMotionFps: 2,
    featuredMotionEdge: 448,
    standardMotionEdge: 288,
    artworkMotionDistance: 16,
    glowbudMotionFps: 15,
    distantGlowbudMotionFps: 8,
  },
  showcase: {
    tier: 'showcase',
    dpr: [0.9, 0.9],
    antialias: true,
    activeMotionFps: 10,
    distantMotionFps: 2,
    featuredMotionEdge: 512,
    standardMotionEdge: 320,
    artworkMotionDistance: 18,
    glowbudMotionFps: 18,
    distantGlowbudMotionFps: 8,
  },
}

export function resolveMuseumPerformanceProfile(
  signals: MuseumPerformanceSignals,
): MuseumPerformanceProfile {
  const limitedMemory = signals.deviceMemoryGb !== undefined && signals.deviceMemoryGb <= 4
  const limitedCpu = signals.hardwareConcurrency !== undefined && signals.hardwareConcurrency <= 4
  if (
    signals.coarsePointer
    || signals.viewportWidth <= 760
    || signals.saveData
    || limitedMemory
    || limitedCpu
  ) {
    return MUSEUM_PERFORMANCE_PROFILES.compact
  }

  const moderateMemory = signals.deviceMemoryGb !== undefined && signals.deviceMemoryGb <= 8
  const moderateCpu = signals.hardwareConcurrency !== undefined && signals.hardwareConcurrency <= 8
  if (signals.viewportWidth <= 1180 || moderateMemory || moderateCpu) {
    return MUSEUM_PERFORMANCE_PROFILES.balanced
  }

  return MUSEUM_PERFORMANCE_PROFILES.showcase
}

type MuseumNavigator = Navigator & {
  deviceMemory?: number
  connection?: {
    saveData?: boolean
  }
}

export function readMuseumPerformanceSignals(): MuseumPerformanceSignals {
  if (typeof window === 'undefined') {
    return {
      viewportWidth: 1024,
      coarsePointer: false,
      saveData: false,
    }
  }
  const browserNavigator = window.navigator as MuseumNavigator
  return {
    viewportWidth: window.innerWidth,
    coarsePointer: typeof window.matchMedia === 'function'
      && window.matchMedia('(hover: none) and (pointer: coarse)').matches,
    saveData: Boolean(browserNavigator.connection?.saveData),
    deviceMemoryGb: browserNavigator.deviceMemory,
    hardwareConcurrency: browserNavigator.hardwareConcurrency,
  }
}
