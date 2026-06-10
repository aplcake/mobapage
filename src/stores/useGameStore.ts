import { create } from 'zustand'
import type { PerformanceTier } from '../core/config'
import type { Vec3Tuple } from '../core/math'

export type PointerSnapshot = {
  isActive: boolean
  isDown: boolean
  world: Vec3Tuple
  previousWorld: Vec3Tuple
  velocity: Vec3Tuple
  speed: number
  pressure: number
  lastMoveAt: number
}

export type VacuumSnapshot = {
  position: Vec3Tuple
  mouth: Vec3Tuple
  velocity: Vec3Tuple
  yaw: number
  pulse: number
  recoil: number
}

export type DebugStats = {
  fps: number
  frameMs: number
  activeSlime: number
  affectedSlime: number
  gulpedTotal: number
  activeFX: number
  inwardPassRate: number
  inwardSamples: number
  inwardPassed: number
  inwardFailed: number
  inwardAverageDistanceDelta: number
}

export type FXBurst = {
  id: number
  position: Vec3Tuple
  count: number
  intensity: number
  palette: number
}

type GameStore = {
  muted: boolean
  reducedMotion: boolean
  debug: boolean
  performanceTier: PerformanceTier
  pointer: PointerSnapshot
  vacuum: VacuumSnapshot
  stats: DebugStats
  gulpedTotal: number
  fxBursts: FXBurst[]
  recoilImpulse: number
  mouthFlashImpulse: number
  stageShake: number
  setMuted: (muted: boolean) => void
  setReducedMotion: (reducedMotion: boolean) => void
  setDebug: (debug: boolean) => void
  setPerformanceTier: (performanceTier: PerformanceTier) => void
  setPointer: (pointer: PointerSnapshot) => void
  setVacuum: (vacuum: VacuumSnapshot) => void
  setStats: (stats: Partial<DebugStats>) => void
  registerGulp: (position: Vec3Tuple, count: number, intensity: number, palette?: number) => void
  consumeFXBursts: () => FXBurst[]
  drainRecoilImpulse: () => number
  drainMouthFlashImpulse: () => number
  setStageShake: (stageShake: number) => void
}

const ZERO: Vec3Tuple = [0, 0, 0]

export const useGameStore = create<GameStore>((set, get) => ({
  muted: true,
  reducedMotion: false,
  debug: false,
  performanceTier: 'mid',
  pointer: {
    isActive: false,
    isDown: false,
    world: ZERO,
    previousWorld: ZERO,
    velocity: ZERO,
    speed: 0,
    pressure: 0,
    lastMoveAt: 0,
  },
  vacuum: {
    position: [0, 0.55, 1.2],
    mouth: [0, 0.55, 0.1],
    velocity: ZERO,
    yaw: 0,
    pulse: 0,
    recoil: 0,
  },
  stats: {
    fps: 60,
    frameMs: 16.7,
    activeSlime: 0,
    affectedSlime: 0,
    gulpedTotal: 0,
    activeFX: 0,
    inwardPassRate: 1,
    inwardSamples: 0,
    inwardPassed: 0,
    inwardFailed: 0,
    inwardAverageDistanceDelta: 0,
  },
  gulpedTotal: 0,
  fxBursts: [],
  recoilImpulse: 0,
  mouthFlashImpulse: 0,
  stageShake: 0,
  setMuted: (muted) => set({ muted }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setDebug: (debug) => set({ debug }),
  setPerformanceTier: (performanceTier) => set({ performanceTier }),
  setPointer: (pointer) => set({ pointer }),
  setVacuum: (vacuum) => set({ vacuum }),
  setStats: (stats) => set((state) => ({ stats: { ...state.stats, ...stats } })),
  registerGulp: (position, count, intensity, palette = 0) =>
    set((state) => {
      const nextTotal = state.gulpedTotal + count
      const cluster = Math.min(1, Math.max(0, count - 1) / 8)
      const burst: FXBurst = {
        id: nextTotal + Date.now(),
        position,
        count,
        intensity,
        palette,
      }
      return {
        gulpedTotal: nextTotal,
        recoilImpulse: Math.min(3, state.recoilImpulse + intensity * (0.95 + cluster * 0.55)),
        mouthFlashImpulse: Math.min(3.2, state.mouthFlashImpulse + intensity * (1.05 + cluster * 0.65)),
        stageShake: Math.min(1, state.stageShake + intensity * (0.12 + cluster * 0.06)),
        fxBursts: [...state.fxBursts.slice(-10), burst],
        stats: { ...state.stats, gulpedTotal: nextTotal },
      }
    }),
  consumeFXBursts: () => {
    const bursts = get().fxBursts
    if (bursts.length === 0) return bursts
    set({ fxBursts: [] })
    return bursts
  },
  drainRecoilImpulse: () => {
    const impulse = get().recoilImpulse
    if (impulse <= 0) return 0
    set({ recoilImpulse: 0 })
    return impulse
  },
  drainMouthFlashImpulse: () => {
    const impulse = get().mouthFlashImpulse
    if (impulse <= 0) return 0
    set({ mouthFlashImpulse: 0 })
    return impulse
  },
  setStageShake: (stageShake) => set({ stageShake }),
}))
