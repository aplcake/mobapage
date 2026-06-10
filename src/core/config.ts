import type { Vec3Tuple } from './math'

export const GAME_CONFIG = {
  name: 'Psychedelic Slurper',
  arena: {
    halfWidth: 12.8,
    halfDepth: 8.1,
    floorSize: [28, 18] as [number, number],
  },
  camera: {
    fovDeg: 48,
    pitchDeg: 42,
    distance: 18,
    height: 13,
    target: [0, 0.2, 0] as Vec3Tuple,
    followLagSec: 0.09,
    shakeWorldScale: 0.018,
  },
  lighting: {
    ambientIntensity: 0.55,
    keyIntensity: 1.15,
    keyPosition: [4, 8, 5] as Vec3Tuple,
    fillIntensity: 0.25,
    fillPosition: [-5, 4, -4] as Vec3Tuple,
  },
  render: {
    clearColor: '#2B2638',
    dpr: {
      low: [1, 1] as [number, number],
      mid: [1, 1.5] as [number, number],
      high: [1.5, 2] as [number, number],
    },
  },
} as const

export type PerformanceTier = 'low' | 'mid' | 'high'
