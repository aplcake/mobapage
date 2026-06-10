import * as THREE from 'three'
import type { SlimePiece } from '../slime/slimeTypes'

export type InwardInvariantSample = {
  pieceId: number
  movedInward: boolean
  distanceDelta: number
  state: string
}

export type InwardInvariantSummary = {
  samples: number
  passed: number
  failed: number
  passRate: number
  averageDistanceDelta: number
}

export function checkInwardInvariant(piece: SlimePiece, mouth: THREE.Vector3): InwardInvariantSample | null {
  if (piece.suctionInfluence <= 0.05 || piece.state === 'gulped' || piece.state === 'reemerging') return null
  const prev = piece.previousPosition.distanceTo(mouth)
  const next = piece.position.distanceTo(mouth)
  const distanceDelta = next - prev
  return {
    pieceId: piece.id,
    movedInward: distanceDelta <= 0.01,
    distanceDelta,
    state: piece.state,
  }
}

export function summarizeInvariant(samples: InwardInvariantSample[]): InwardInvariantSummary {
  if (samples.length === 0) {
    return { samples: 0, passed: 0, failed: 0, passRate: 1, averageDistanceDelta: 0 }
  }
  const passed = samples.filter((sample) => sample.movedInward).length
  const distanceTotal = samples.reduce((total, sample) => total + sample.distanceDelta, 0)
  return {
    samples: samples.length,
    passed,
    failed: samples.length - passed,
    passRate: passed / samples.length,
    averageDistanceDelta: distanceTotal / samples.length,
  }
}
