import { describe, expect, it } from 'vitest'
import {
  createFlowMetricsConfig,
  createFlowMetricsState,
  getFlowDebugSnapshot,
  getFlowSessionSummary,
  recordFlowAttach,
  recordFlowBagFill,
  recordFlowFullClear,
  recordFlowGlug,
  recordFlowGrip,
  recordFlowSnap,
  resetFlowMetrics,
  updateFlowMetrics,
} from '../src/experiment/flowMetrics'

const config = {
  ...createFlowMetricsConfig(),
  flowReattachWindowSeconds: 1,
  cleanSnapReattachWindow: 1,
  flowMinSpeed: 1,
  deadStopSpeedThreshold: 0.2,
  deadStopDurationThreshold: 0.35,
  chainBreakUnattachedTime: 1,
  chainBreakLowSpeedDuration: 0.55,
}

describe('hidden flow metrics', () => {
  it('tracks attach rhythm, glug mass, clean snap, and fast reattach chains', () => {
    const state = createFlowMetricsState(0)

    recordFlowAttach(state, { time: 0.1, targetId: 1, speed: 1.8, sealStrength: 0.82 }, config)
    updateFlowMetrics(state, {
      time: 0.45,
      dt: 0.35,
      attached: true,
      targetId: 1,
      speed: 1.9,
      sealStrength: 0.9,
      tension: 0.35,
      embedActive: true,
    }, config)
    recordFlowGlug(state, {
      time: 0.5,
      successful: true,
      strength: 0.84,
      massTransferred: 0.18,
      sealStrength: 0.9,
      tension: 0.32,
      bagMassGained: 0.12,
    }, config)
    recordFlowSnap(state, {
      time: 0.72,
      reason: 'tensionExceeded',
      sealBreakReason: 'tensionExceeded',
      targetId: 1,
      tension: 0.86,
      sealStrength: 0.82,
      velocityBefore: { x: 2, y: 0, z: 0 },
      velocityAfter: { x: 1.7, y: 0, z: 0.2 },
      snapImpulseApplied: 0.5,
    }, config)
    recordFlowAttach(state, { time: 1.02, targetId: 2, speed: 1.4, sealStrength: 0.74 }, config)

    const snapshot = getFlowDebugSnapshot(state, config)
    expect(snapshot.attachmentCount).toBe(2)
    expect(snapshot.totalGlugCount).toBe(1)
    expect(snapshot.strongGlugCount).toBe(1)
    expect(snapshot.slimeMassConsumedTotal).toBeCloseTo(0.18)
    expect(snapshot.snapCount).toBe(1)
    expect(snapshot.cleanSnapCount).toBe(1)
    expect(snapshot.snapToReattachTime).toBeCloseTo(0.3)
    expect(snapshot.currentChainLength).toBe(2)
    expect(snapshot.uniqueTargetsInChain).toBe(2)
    expect(snapshot.reattachWithinFlowWindow).toBe(true)
  })

  it('breaks chains on slow unattached dead time', () => {
    const state = createFlowMetricsState(0)

    recordFlowAttach(state, { time: 0, targetId: 1, speed: 1.2, sealStrength: 0.7 }, config)
    recordFlowSnap(state, {
      time: 0.4,
      reason: 'tensionExceeded',
      sealBreakReason: 'tensionExceeded',
      targetId: 1,
      tension: 0.8,
      sealStrength: 0.7,
      velocityBefore: { x: 1.2, y: 0, z: 0 },
      velocityAfter: { x: 0.1, y: 0, z: 0 },
    }, config)
    updateFlowMetrics(state, { time: 0.8, dt: 0.4, attached: false, speed: 0.1, sealStrength: 0, tension: 0 }, config)
    updateFlowMetrics(state, { time: 1.35, dt: 0.55, attached: false, speed: 0.08, sealStrength: 0, tension: 0 }, config)
    recordFlowAttach(state, { time: 1.6, targetId: 2, speed: 0.7, sealStrength: 0.5 }, config)

    const snapshot = getFlowDebugSnapshot(state, config)
    expect(snapshot.deadStopCount).toBe(1)
    expect(snapshot.messySnapCount).toBe(1)
    expect(snapshot.chainBreakReason).toBe('deadStop')
    expect(snapshot.currentChainLength).toBe(1)
  })

  it('does not inflate chain length from rapid same-target relatch jitter', () => {
    const state = createFlowMetricsState(0)

    recordFlowAttach(state, { time: 0, targetId: 1, speed: 2, sealStrength: 0.8 }, config)
    recordFlowSnap(state, {
      time: 0.16,
      reason: 'tensionExceeded',
      sealBreakReason: 'tensionExceeded',
      targetId: 1,
      tension: 0.85,
      sealStrength: 0.78,
      velocityBefore: { x: 2, y: 0, z: 0 },
      velocityAfter: { x: 1.8, y: 0, z: 0.1 },
    }, config)
    recordFlowAttach(state, { time: 0.21, targetId: 1, speed: 1.7, sealStrength: 0.78 }, config)
    recordFlowSnap(state, {
      time: 0.36,
      reason: 'tensionExceeded',
      sealBreakReason: 'tensionExceeded',
      targetId: 1,
      tension: 0.9,
      sealStrength: 0.78,
      velocityBefore: { x: 1.7, y: 0, z: 0 },
      velocityAfter: { x: 1.6, y: 0, z: 0.2 },
    }, config)
    recordFlowAttach(state, { time: 0.52, targetId: 2, speed: 1.5, sealStrength: 0.8 }, config)

    const snapshot = getFlowDebugSnapshot(state, config)
    expect(snapshot.attachmentCount).toBe(3)
    expect(snapshot.currentChainLength).toBe(2)
    expect(snapshot.uniqueTargetsInChain).toBe(2)
    expect(snapshot.bestChainLength).toBe(2)
  })

  it('keeps clear and bag collection metrics hidden but queryable', () => {
    const state = createFlowMetricsState(0)

    recordFlowAttach(state, { time: 0.1, targetId: 4, speed: 1.3, sealStrength: 0.86 }, config)
    recordFlowGlug(state, {
      time: 0.25,
      successful: true,
      strength: 0.7,
      massTransferred: 0.22,
      sealStrength: 0.86,
      tension: 0.2,
      bagMassGained: 0.1,
    }, config)
    recordFlowFullClear(state, { time: 0.7, targetId: 4, massConsumed: 0.12 }, config)
    recordFlowBagFill(state, { time: 0.72, amount: 0.42, normalized: 0.28, massGained: 0.2 }, config)

    const snapshot = getFlowDebugSnapshot(state, config)
    const summary = getFlowSessionSummary(state)
    expect(snapshot.fullGlobClears).toBe(1)
    expect(snapshot.fullClearDuringChainCount).toBe(1)
    expect(snapshot.slimeMassConsumedPerTarget[4]).toBeCloseTo(0.34)
    expect(snapshot.bagFillAmount).toBeCloseTo(0.42)
    expect(summary.totalGlugs).toBe(1)
    expect(summary.fullGlobClears).toBe(1)
    expect(summary.highestBagFill).toBeCloseTo(0.28)
  })

  it('tracks right-click grip timing without creating visible scoring', () => {
    const state = createFlowMetricsState(0)

    recordFlowGrip(state, { time: 0.1, kind: 'attempt' }, config)
    recordFlowGrip(state, { time: 0.12, kind: 'attach', targetId: 7, spinSpeed: 2.8 }, config)
    recordFlowGrip(state, {
      time: 0.62,
      kind: 'missedWindow',
      targetId: 7,
      releaseQuality: 0.18,
      holdTime: 0.5,
      spinSpeed: 3.6,
      reason: 'missedWindow',
    }, config)
    recordFlowGrip(state, {
      time: 1.05,
      kind: 'release',
      targetId: 7,
      releaseQuality: 0.88,
      holdTime: 0.93,
      spinSpeed: 4.2,
      massMultiplier: 1.8,
      reason: 'perfectRelease',
    }, config)

    const snapshot = getFlowDebugSnapshot(state, config)
    const summary = getFlowSessionSummary(state)
    expect(snapshot.gripAttemptCount).toBe(1)
    expect(snapshot.gripLatchCount).toBe(1)
    expect(snapshot.gripMissedReleaseCount).toBe(1)
    expect(snapshot.gripReleaseCount).toBe(1)
    expect(snapshot.gripPerfectReleaseCount).toBe(1)
    expect(snapshot.gripBestReleaseQuality).toBeCloseTo(0.88)
    expect(snapshot.gripMassMultiplierPeak).toBeCloseTo(1.8)
    expect(summary.gripPerfectReleaseCount).toBe(1)
  })

  it('resets session metrics back to a clean hidden state', () => {
    const state = createFlowMetricsState(0)
    recordFlowAttach(state, { time: 0.1, targetId: 1, speed: 1.4, sealStrength: 0.8 }, config)
    recordFlowGlug(state, {
      time: 0.2,
      successful: true,
      strength: 0.7,
      massTransferred: 0.1,
      sealStrength: 0.8,
      tension: 0.2,
    }, config)

    resetFlowMetrics(state, 2)
    const snapshot = getFlowDebugSnapshot(state, config)
    expect(snapshot.attachmentCount).toBe(0)
    expect(snapshot.totalGlugCount).toBe(0)
    expect(snapshot.slimeMassConsumedTotal).toBe(0)
    expect(snapshot.currentChainLength).toBe(0)
    expect(snapshot.timeSinceLastAttach).toBe(999)
  })
})
