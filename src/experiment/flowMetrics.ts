import { PRODUCTION_TUNING } from '../core/productionTuning'

export type FlowChainBreakReason =
  | 'none'
  | 'tooMuchTimeUnattached'
  | 'velocityTooLow'
  | 'deadStop'
  | 'noSlimeTarget'
  | 'manualReset'
  | 'levelComplete'
  | 'invalidState'

export type FlowSealBreakReason =
  | 'none'
  | 'tensionExceeded'
  | 'angleTooPoor'
  | 'slimeDepleted'
  | 'velocityTooHigh'
  | 'manualRelease'
  | 'unknown'

export type FlowSnapReason = 'none' | 'tensionExceeded' | 'deepEmbedPopOut' | 'manualRelease' | 'unknown'

export type FlowVector3 = {
  x: number
  y: number
  z: number
}

export type FlowMetricsConfig = {
  flowReattachWindowSeconds: number
  flowMinMomentumRetained: number
  flowMinSpeed: number
  deadStopSpeedThreshold: number
  deadStopDurationThreshold: number
  strongSealThreshold: number
  weakSealThreshold: number
  cleanSnapMomentumThreshold: number
  cleanSnapReattachWindow: number
  chainBreakUnattachedTime: number
  chainBreakLowSpeedDuration: number
  debugOverlayUpdateRate: number
  flowMetricsEnabled: boolean
}

export type FlowMetricsUpdateInput = {
  time: number
  dt: number
  attached: boolean
  targetId?: number | null
  speed: number
  sealStrength: number
  tension: number
  contactAngle?: number
  slimeMassRemaining?: number
  bagFillAmount?: number
  bagFillNormalized?: number
  embedActive?: boolean
}

export type FlowAttachEvent = {
  time: number
  targetId?: number | null
  speed: number
  sealStrength?: number
  contactAngle?: number
}

export type FlowDetachEvent = {
  time: number
  reason?: FlowSealBreakReason
  targetId?: number | null
  speed?: number
  sealStrength?: number
  tension?: number
  contactAngle?: number
}

export type FlowSnapEvent = {
  time: number
  reason?: FlowSnapReason
  sealBreakReason?: FlowSealBreakReason
  targetId?: number | null
  tension: number
  sealStrength: number
  velocityBefore: FlowVector3
  velocityAfter: FlowVector3
  snapImpulseApplied?: number
  contactAngle?: number
}

export type FlowGlugEvent = {
  time: number
  successful: boolean
  strength: number
  massTransferred: number
  sealStrength: number
  tension: number
  bagMassGained?: number
}

export type FlowMassTransferEvent = {
  time: number
  mass: number
  targetId?: number | null
}

export type FlowFullClearEvent = {
  time: number
  targetId?: number | null
  massConsumed?: number
}

export type FlowBagFillEvent = {
  time: number
  amount: number
  normalized: number
  massGained?: number
}

export type FlowGripEventKind = 'attempt' | 'attach' | 'release' | 'missedWindow' | 'spinout' | 'noContact'

export type FlowGripReleaseReason =
  | 'none'
  | 'perfectRelease'
  | 'goodRelease'
  | 'sloppyRelease'
  | 'missedWindow'
  | 'spinout'
  | 'noContact'
  | 'disabled'

export type FlowGripEvent = {
  time: number
  kind: FlowGripEventKind
  targetId?: number | null
  releaseQuality?: number
  holdTime?: number
  spinSpeed?: number
  massMultiplier?: number
  reason?: FlowGripReleaseReason
}

export type FlowMetricsDebugSnapshot = {
  isAttached: boolean
  currentAttachmentId: number | null
  currentTargetId: number | null
  currentAttachmentDuration: number
  totalAttachedTime: number
  totalUnattachedTime: number
  attachRatio: number
  attachmentCount: number
  averageAttachmentDuration: number
  averageUnattachedDuration: number
  timeSinceLastAttach: number
  timeSinceLastDetach: number
  timeSinceLastSnap: number
  snapToReattachTime: number
  bestSnapToReattachTime: number
  averageSnapToReattachTime: number
  currentChainLength: number
  bestChainLength: number
  currentChainDuration: number
  chainCount: number
  chainBreakReason: FlowChainBreakReason
  reattachWithinFlowWindow: boolean
  chainFlowWindowSeconds: number
  lastAttachmentTargetId: number | null
  currentAttachmentTargetId: number | null
  uniqueTargetsInChain: number
  chainMassConsumed: number
  chainGlugCount: number
  chainFullClears: number
  currentSpeed: number
  averageSpeed: number
  peakSpeed: number
  velocityAtAttach: number
  velocityBeforeSnap: number
  velocityAfterSnap: number
  momentumRetainedRatio: number
  averageMomentumRetainedRatio: number
  deadStopCount: number
  deadStopDuration: number
  timeBelowFlowSpeed: number
  postSnapLaunchQuality: number
  swingArcQuality: number
  movementWithSwingQuality: number
  glugsThisAttachment: number
  totalGlugCount: number
  glugCountThisChain: number
  averageGlugsPerAttachment: number
  strongGlugCount: number
  weakGlugCount: number
  failedGlugCount: number
  averageGlugStrength: number
  peakGlugStrength: number
  timeSinceLastGlug: number
  slimeMassConsumedThisAttachment: number
  slimeMassConsumedThisChain: number
  slimeMassConsumedTotal: number
  massPerGlug: number
  sealStrengthAtGlug: number
  tensionAtGlug: number
  bagFillGainedFromGlugs: number
  currentSealStrength: number
  averageSealStrengthThisAttachment: number
  peakSealStrengthThisAttachment: number
  weakSealTime: number
  strongSealTime: number
  embedTime: number
  embedCount: number
  snapFromWeakSealCount: number
  snapFromHighTensionCount: number
  sealBreakReason: FlowSealBreakReason
  contactAngleAtAttach: number
  contactAngleAtSnap: number
  tensionAtSnap: number
  sealStrengthAtSnap: number
  snapCount: number
  snapsThisChain: number
  snapReason: FlowSnapReason
  snapTension: number
  snapVelocityBefore: number
  snapVelocityAfter: number
  snapLaunchSpeed: number
  snapLaunchDirection: FlowVector3
  snapImpulseApplied: number
  reattachAfterSnapSuccess: boolean
  snapGeneratedChainContinuation: boolean
  cleanSnapCount: number
  messySnapCount: number
  slimeMassRemaining: number
  slimeMassConsumedPerTarget: Record<number, number>
  fullGlobClears: number
  fullClearDuringChainCount: number
  fullClearAfterStrongSealCount: number
  timeToClearGlob: number
  averageTimeToClearGlob: number
  residueCount: number
  stuckResidueEvents: number
  bagFillAmount: number
  bagFillNormalized: number
  bagFillGainedThisChain: number
  highestBagFill: number
  gripAttemptCount: number
  gripLatchCount: number
  gripReleaseCount: number
  gripPerfectReleaseCount: number
  gripGoodReleaseCount: number
  gripMissedReleaseCount: number
  gripSpinoutCount: number
  gripCurrentHoldTime: number
  gripBestReleaseQuality: number
  gripAverageReleaseQuality: number
  gripLastReleaseQuality: number
  gripLastReleaseReason: FlowGripReleaseReason
  gripLastTargetId: number | null
  gripMassMultiplierPeak: number
}

export type FlowMetricsSessionSummary = {
  totalPlayTime: number
  attachRatio: number
  bestChainLength: number
  averageSnapToReattachTime: number
  bestSnapToReattachTime: number
  totalGlugs: number
  averageGlugsPerAttachment: number
  totalSlimeConsumed: number
  fullGlobClears: number
  averageMomentumRetained: number
  deadStopCount: number
  bestChainMassConsumed: number
  strongestSeal: number
  highestBagFill: number
  gripAttemptCount: number
  gripPerfectReleaseCount: number
  gripSpinoutCount: number
  gripBestReleaseQuality: number
}

export type FlowMetricsState = {
  now: number
  sessionStartTime: number
  totalPlayTime: number
  isAttached: boolean
  currentAttachmentId: number | null
  currentTargetId: number | null
  nextAttachmentId: number
  currentAttachmentStartTime: number
  currentUnattachedStartTime: number
  currentAttachmentDuration: number
  currentUnattachedDuration: number
  totalAttachedTime: number
  totalUnattachedTime: number
  attachmentCount: number
  completedAttachmentCount: number
  attachmentDurationTotal: number
  unattachedDurationTotal: number
  unattachedSegmentCount: number
  lastAttachTime: number
  lastDetachTime: number
  lastSnapTime: number
  snapToReattachTime: number
  bestSnapToReattachTime: number
  snapToReattachTotal: number
  snapToReattachCount: number
  reattachWithinFlowWindow: boolean
  currentChainLength: number
  bestChainLength: number
  currentChainStartTime: number
  currentChainDuration: number
  chainCount: number
  chainBreakReason: FlowChainBreakReason
  lastAttachmentTargetId: number | null
  currentAttachmentTargetId: number | null
  uniqueTargetsInChainSet: Set<number>
  chainMassConsumed: number
  bestChainMassConsumed: number
  chainGlugCount: number
  chainFullClears: number
  bagFillGainedThisChain: number
  currentSpeed: number
  speedTimeTotal: number
  speedIntegral: number
  averageSpeed: number
  peakSpeed: number
  velocityAtAttach: number
  velocityBeforeSnap: number
  velocityAfterSnap: number
  momentumRetainedRatio: number
  momentumRetainedTotal: number
  momentumRetainedCount: number
  deadStopCount: number
  deadStopDuration: number
  deadStopCandidateDuration: number
  deadStopActive: boolean
  timeBelowFlowSpeed: number
  postSnapLaunchQuality: number
  swingArcQuality: number
  movementWithSwingQuality: number
  glugsThisAttachment: number
  totalGlugCount: number
  glugCountThisChain: number
  strongGlugCount: number
  weakGlugCount: number
  failedGlugCount: number
  glugStrengthTotal: number
  peakGlugStrength: number
  lastGlugTime: number
  slimeMassConsumedThisAttachment: number
  slimeMassConsumedThisChain: number
  slimeMassConsumedTotal: number
  sealStrengthAtGlug: number
  tensionAtGlug: number
  bagFillGainedFromGlugs: number
  currentSealStrength: number
  sealStrengthThisAttachmentIntegral: number
  sealStrengthThisAttachmentTime: number
  peakSealStrengthThisAttachment: number
  strongestSeal: number
  weakSealTime: number
  strongSealTime: number
  embedTime: number
  embedCount: number
  embedActive: boolean
  snapFromWeakSealCount: number
  snapFromHighTensionCount: number
  sealBreakReason: FlowSealBreakReason
  contactAngleAtAttach: number
  contactAngleAtSnap: number
  tensionAtSnap: number
  sealStrengthAtSnap: number
  snapCount: number
  snapsThisChain: number
  snapReason: FlowSnapReason
  snapTension: number
  snapVelocityBefore: number
  snapVelocityAfter: number
  snapLaunchSpeed: number
  snapLaunchDirection: FlowVector3
  snapImpulseApplied: number
  reattachAfterSnapSuccess: boolean
  snapGeneratedChainContinuation: boolean
  cleanSnapCount: number
  messySnapCount: number
  pendingSnapClassification: boolean
  pendingSnapTime: number
  pendingSnapMomentumRatio: number
  slimeMassRemaining: number
  slimeMassConsumedPerTarget: Record<number, number>
  targetFirstAttachTime: Record<number, number>
  fullGlobClears: number
  fullClearDuringChainCount: number
  fullClearAfterStrongSealCount: number
  timeToClearGlob: number
  timeToClearGlobTotal: number
  timeToClearGlobCount: number
  residueCount: number
  stuckResidueEvents: number
  bagFillAmount: number
  bagFillNormalized: number
  highestBagFill: number
  gripAttemptCount: number
  gripLatchCount: number
  gripReleaseCount: number
  gripPerfectReleaseCount: number
  gripGoodReleaseCount: number
  gripMissedReleaseCount: number
  gripSpinoutCount: number
  gripCurrentHoldTime: number
  gripBestReleaseQuality: number
  gripReleaseQualityTotal: number
  gripReleaseQualityCount: number
  gripLastReleaseQuality: number
  gripLastReleaseReason: FlowGripReleaseReason
  gripLastTargetId: number | null
  gripMassMultiplierPeak: number
}

export function createFlowMetricsConfig(): FlowMetricsConfig {
  return { ...PRODUCTION_TUNING.flow }
}

export function createFlowMetricsState(now = 0): FlowMetricsState {
  return {
    now,
    sessionStartTime: now,
    totalPlayTime: 0,
    isAttached: false,
    currentAttachmentId: null,
    currentTargetId: null,
    nextAttachmentId: 1,
    currentAttachmentStartTime: now,
    currentUnattachedStartTime: now,
    currentAttachmentDuration: 0,
    currentUnattachedDuration: 0,
    totalAttachedTime: 0,
    totalUnattachedTime: 0,
    attachmentCount: 0,
    completedAttachmentCount: 0,
    attachmentDurationTotal: 0,
    unattachedDurationTotal: 0,
    unattachedSegmentCount: 0,
    lastAttachTime: Number.NEGATIVE_INFINITY,
    lastDetachTime: now,
    lastSnapTime: Number.NEGATIVE_INFINITY,
    snapToReattachTime: 0,
    bestSnapToReattachTime: 0,
    snapToReattachTotal: 0,
    snapToReattachCount: 0,
    reattachWithinFlowWindow: false,
    currentChainLength: 0,
    bestChainLength: 0,
    currentChainStartTime: now,
    currentChainDuration: 0,
    chainCount: 0,
    chainBreakReason: 'none',
    lastAttachmentTargetId: null,
    currentAttachmentTargetId: null,
    uniqueTargetsInChainSet: new Set<number>(),
    chainMassConsumed: 0,
    bestChainMassConsumed: 0,
    chainGlugCount: 0,
    chainFullClears: 0,
    bagFillGainedThisChain: 0,
    currentSpeed: 0,
    speedTimeTotal: 0,
    speedIntegral: 0,
    averageSpeed: 0,
    peakSpeed: 0,
    velocityAtAttach: 0,
    velocityBeforeSnap: 0,
    velocityAfterSnap: 0,
    momentumRetainedRatio: 0,
    momentumRetainedTotal: 0,
    momentumRetainedCount: 0,
    deadStopCount: 0,
    deadStopDuration: 0,
    deadStopCandidateDuration: 0,
    deadStopActive: false,
    timeBelowFlowSpeed: 0,
    postSnapLaunchQuality: 0,
    swingArcQuality: 0,
    movementWithSwingQuality: 0,
    glugsThisAttachment: 0,
    totalGlugCount: 0,
    glugCountThisChain: 0,
    strongGlugCount: 0,
    weakGlugCount: 0,
    failedGlugCount: 0,
    glugStrengthTotal: 0,
    peakGlugStrength: 0,
    lastGlugTime: Number.NEGATIVE_INFINITY,
    slimeMassConsumedThisAttachment: 0,
    slimeMassConsumedThisChain: 0,
    slimeMassConsumedTotal: 0,
    sealStrengthAtGlug: 0,
    tensionAtGlug: 0,
    bagFillGainedFromGlugs: 0,
    currentSealStrength: 0,
    sealStrengthThisAttachmentIntegral: 0,
    sealStrengthThisAttachmentTime: 0,
    peakSealStrengthThisAttachment: 0,
    strongestSeal: 0,
    weakSealTime: 0,
    strongSealTime: 0,
    embedTime: 0,
    embedCount: 0,
    embedActive: false,
    snapFromWeakSealCount: 0,
    snapFromHighTensionCount: 0,
    sealBreakReason: 'none',
    contactAngleAtAttach: 0,
    contactAngleAtSnap: 0,
    tensionAtSnap: 0,
    sealStrengthAtSnap: 0,
    snapCount: 0,
    snapsThisChain: 0,
    snapReason: 'none',
    snapTension: 0,
    snapVelocityBefore: 0,
    snapVelocityAfter: 0,
    snapLaunchSpeed: 0,
    snapLaunchDirection: { x: 0, y: 0, z: 0 },
    snapImpulseApplied: 0,
    reattachAfterSnapSuccess: false,
    snapGeneratedChainContinuation: false,
    cleanSnapCount: 0,
    messySnapCount: 0,
    pendingSnapClassification: false,
    pendingSnapTime: Number.NEGATIVE_INFINITY,
    pendingSnapMomentumRatio: 0,
    slimeMassRemaining: 0,
    slimeMassConsumedPerTarget: {},
    targetFirstAttachTime: {},
    fullGlobClears: 0,
    fullClearDuringChainCount: 0,
    fullClearAfterStrongSealCount: 0,
    timeToClearGlob: 0,
    timeToClearGlobTotal: 0,
    timeToClearGlobCount: 0,
    residueCount: 0,
    stuckResidueEvents: 0,
    bagFillAmount: 0,
    bagFillNormalized: 0,
    highestBagFill: 0,
    gripAttemptCount: 0,
    gripLatchCount: 0,
    gripReleaseCount: 0,
    gripPerfectReleaseCount: 0,
    gripGoodReleaseCount: 0,
    gripMissedReleaseCount: 0,
    gripSpinoutCount: 0,
    gripCurrentHoldTime: 0,
    gripBestReleaseQuality: 0,
    gripReleaseQualityTotal: 0,
    gripReleaseQualityCount: 0,
    gripLastReleaseQuality: 0,
    gripLastReleaseReason: 'none',
    gripLastTargetId: null,
    gripMassMultiplierPeak: 1,
  }
}

export function resetFlowMetrics(state: FlowMetricsState, now = 0) {
  Object.assign(state, createFlowMetricsState(now))
}

function vectorSpeed(vector: FlowVector3) {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z)
}

function normalizedDirection(vector: FlowVector3, speed: number): FlowVector3 {
  if (speed <= 0.0001) return { x: 0, y: 0, z: 0 }
  return { x: vector.x / speed, y: vector.y / speed, z: vector.z / speed }
}

function timeSince(now: number, previous: number) {
  if (!Number.isFinite(previous)) return 999
  return Math.max(0, now - previous)
}

function finishChain(state: FlowMetricsState, reason: FlowChainBreakReason) {
  if (state.currentChainLength <= 0) return
  state.bestChainMassConsumed = Math.max(state.bestChainMassConsumed, state.chainMassConsumed)
  state.chainBreakReason = reason
  state.currentChainLength = 0
  state.currentChainDuration = 0
  state.chainMassConsumed = 0
  state.chainGlugCount = 0
  state.glugCountThisChain = 0
  state.chainFullClears = 0
  state.bagFillGainedThisChain = 0
  state.uniqueTargetsInChainSet.clear()
  state.snapsThisChain = 0
}

function beginOrContinueChain(state: FlowMetricsState, event: FlowAttachEvent, config: FlowMetricsConfig) {
  const snapAge = timeSince(event.time, state.lastSnapTime)
  const targetId = typeof event.targetId === 'number' && event.targetId >= 0 ? event.targetId : null
  const attachmentGap = timeSince(event.time, state.lastAttachTime)
  const sameTargetRelatch = targetId !== null && state.lastAttachmentTargetId === targetId
  const minimumChainStepGap = Math.min(0.24, config.flowReattachWindowSeconds * 0.28)
  const meaningfulChainAdvance = attachmentGap >= minimumChainStepGap
    && (snapAge >= 0.04 || !sameTargetRelatch)
  const continuesChain = state.currentChainLength > 0
    && snapAge <= config.flowReattachWindowSeconds
    && event.speed >= config.flowMinSpeed * 0.45

  state.reattachWithinFlowWindow = snapAge <= config.flowReattachWindowSeconds
  if (!continuesChain) {
    if (state.currentChainLength > 0) finishChain(state, snapAge > config.flowReattachWindowSeconds ? 'tooMuchTimeUnattached' : 'velocityTooLow')
    state.chainCount += 1
    state.currentChainStartTime = event.time
    state.currentChainLength = 1
    state.chainMassConsumed = 0
    state.chainGlugCount = 0
    state.glugCountThisChain = 0
    state.chainFullClears = 0
    state.bagFillGainedThisChain = 0
    state.snapsThisChain = 0
    state.uniqueTargetsInChainSet.clear()
  } else if (meaningfulChainAdvance) {
    state.currentChainLength += 1
  }

  if (targetId !== null) {
    state.uniqueTargetsInChainSet.add(targetId)
  }
  state.bestChainLength = Math.max(state.bestChainLength, state.currentChainLength)
}

export function recordFlowAttach(state: FlowMetricsState, event: FlowAttachEvent, config: FlowMetricsConfig = createFlowMetricsConfig()) {
  if (!config.flowMetricsEnabled) return
  const targetId = typeof event.targetId === 'number' && event.targetId >= 0 ? event.targetId : null
  if (state.isAttached) {
    if (state.currentAttachmentTargetId === null && targetId !== null) {
      state.currentTargetId = targetId
      state.currentAttachmentTargetId = targetId
      state.lastAttachmentTargetId = targetId
      state.uniqueTargetsInChainSet.add(targetId)
    }
    return
  }

  if (!state.isAttached) {
    const unattachedDuration = Math.max(0, event.time - state.currentUnattachedStartTime)
    if (unattachedDuration > 0) {
      state.unattachedDurationTotal += unattachedDuration
      state.unattachedSegmentCount += 1
    }
  }

  beginOrContinueChain(state, event, config)

  const snapAge = timeSince(event.time, state.lastSnapTime)
  if (Number.isFinite(state.lastSnapTime) && snapAge <= config.flowReattachWindowSeconds) {
    state.snapToReattachTime = snapAge
    state.snapToReattachTotal += snapAge
    state.snapToReattachCount += 1
    state.bestSnapToReattachTime = state.bestSnapToReattachTime <= 0 ? snapAge : Math.min(state.bestSnapToReattachTime, snapAge)
    state.reattachAfterSnapSuccess = true
    state.snapGeneratedChainContinuation = state.currentChainLength > 1
  }

  if (state.pendingSnapClassification) {
    const clean = snapAge <= config.cleanSnapReattachWindow
      && state.pendingSnapMomentumRatio >= config.cleanSnapMomentumThreshold
      && event.speed >= config.flowMinSpeed * 0.45
    if (clean) state.cleanSnapCount += 1
    else state.messySnapCount += 1
    state.pendingSnapClassification = false
  }

  state.isAttached = true
  state.currentAttachmentId = state.nextAttachmentId
  state.nextAttachmentId += 1
  state.currentTargetId = targetId
  state.currentAttachmentTargetId = targetId
  state.lastAttachmentTargetId = targetId
  state.currentAttachmentStartTime = event.time
  state.currentAttachmentDuration = 0
  state.attachmentCount += 1
  state.lastAttachTime = event.time
  state.velocityAtAttach = event.speed
  state.glugsThisAttachment = 0
  state.slimeMassConsumedThisAttachment = 0
  state.sealStrengthThisAttachmentIntegral = 0
  state.sealStrengthThisAttachmentTime = 0
  state.peakSealStrengthThisAttachment = event.sealStrength ?? 0
  state.contactAngleAtAttach = event.contactAngle ?? 0
  if (targetId !== null && state.targetFirstAttachTime[targetId] === undefined) {
    state.targetFirstAttachTime[targetId] = event.time
  }
}

export function recordFlowDetach(state: FlowMetricsState, event: FlowDetachEvent, config: FlowMetricsConfig = createFlowMetricsConfig()) {
  if (!config.flowMetricsEnabled) return
  if (!state.isAttached) return

  const duration = Math.max(0, event.time - state.currentAttachmentStartTime)
  state.currentAttachmentDuration = duration
  state.attachmentDurationTotal += duration
  state.completedAttachmentCount += 1
  state.isAttached = false
  state.currentUnattachedStartTime = event.time
  state.currentUnattachedDuration = 0
  state.lastDetachTime = event.time
  state.sealBreakReason = event.reason ?? 'unknown'
  state.currentTargetId = null
  state.currentAttachmentTargetId = null

  if ((event.reason ?? 'none') !== 'none' && event.reason !== 'tensionExceeded') {
    finishChain(state, event.reason === 'slimeDepleted' ? 'noSlimeTarget' : 'invalidState')
  }
}

export function recordFlowSnap(state: FlowMetricsState, event: FlowSnapEvent, config: FlowMetricsConfig = createFlowMetricsConfig()) {
  if (!config.flowMetricsEnabled) return
  const beforeSpeed = vectorSpeed(event.velocityBefore)
  const afterSpeed = vectorSpeed(event.velocityAfter)
  const retained = beforeSpeed > 0.001 ? afterSpeed / beforeSpeed : afterSpeed > 0.001 ? 1 : 0

  state.snapCount += 1
  state.snapsThisChain += state.currentChainLength > 0 ? 1 : 0
  state.snapReason = event.reason ?? 'unknown'
  state.snapTension = event.tension
  state.snapVelocityBefore = beforeSpeed
  state.snapVelocityAfter = afterSpeed
  state.snapLaunchSpeed = afterSpeed
  state.snapLaunchDirection = normalizedDirection(event.velocityAfter, afterSpeed)
  state.snapImpulseApplied = event.snapImpulseApplied ?? Math.max(0, afterSpeed - beforeSpeed)
  state.velocityBeforeSnap = beforeSpeed
  state.velocityAfterSnap = afterSpeed
  state.momentumRetainedRatio = retained
  state.momentumRetainedTotal += retained
  state.momentumRetainedCount += 1
  state.postSnapLaunchQuality = Math.max(0, Math.min(1.6, retained * 0.72 + Math.min(1, afterSpeed / Math.max(0.001, config.flowMinSpeed * 2.4)) * 0.38))
  state.lastSnapTime = event.time
  state.snapToReattachTime = 0
  state.reattachAfterSnapSuccess = false
  state.snapGeneratedChainContinuation = false
  state.pendingSnapClassification = true
  state.pendingSnapTime = event.time
  state.pendingSnapMomentumRatio = retained
  state.tensionAtSnap = event.tension
  state.sealStrengthAtSnap = event.sealStrength
  state.contactAngleAtSnap = event.contactAngle ?? 0
  state.sealBreakReason = event.sealBreakReason ?? (event.tension >= PRODUCTION_TUNING.hose.tensionSnapThreshold ? 'tensionExceeded' : 'unknown')
  if (event.sealStrength <= config.weakSealThreshold) state.snapFromWeakSealCount += 1
  if (event.tension >= PRODUCTION_TUNING.hose.tensionSnapThreshold) state.snapFromHighTensionCount += 1

  recordFlowDetach(state, {
    time: event.time,
    reason: event.sealBreakReason ?? 'tensionExceeded',
    targetId: event.targetId,
    speed: afterSpeed,
    sealStrength: event.sealStrength,
    tension: event.tension,
    contactAngle: event.contactAngle,
  }, config)
}

export function recordFlowGlug(state: FlowMetricsState, event: FlowGlugEvent, config: FlowMetricsConfig = createFlowMetricsConfig()) {
  if (!config.flowMetricsEnabled) return
  state.lastGlugTime = event.time
  state.sealStrengthAtGlug = event.sealStrength
  state.tensionAtGlug = event.tension

  if (!event.successful) {
    state.failedGlugCount += 1
    return
  }

  state.totalGlugCount += 1
  state.glugsThisAttachment += 1
  state.glugCountThisChain += state.currentChainLength > 0 ? 1 : 0
  state.chainGlugCount += state.currentChainLength > 0 ? 1 : 0
  state.glugStrengthTotal += event.strength
  state.peakGlugStrength = Math.max(state.peakGlugStrength, event.strength)
  if (event.sealStrength >= config.strongSealThreshold || event.strength >= 0.72) state.strongGlugCount += 1
  else if (event.sealStrength <= config.weakSealThreshold || event.strength <= 0.38) state.weakGlugCount += 1

  if (event.massTransferred > 0) {
    recordFlowMassTransfer(state, { time: event.time, mass: event.massTransferred, targetId: state.currentAttachmentTargetId }, config)
  }
  if ((event.bagMassGained ?? 0) > 0) {
    state.bagFillGainedFromGlugs += event.bagMassGained ?? 0
  }
}

export function recordFlowMassTransfer(state: FlowMetricsState, event: FlowMassTransferEvent, config: FlowMetricsConfig = createFlowMetricsConfig()) {
  if (!config.flowMetricsEnabled) return
  const mass = Math.max(0, event.mass)
  if (mass <= 0) return

  state.slimeMassConsumedThisAttachment += mass
  state.slimeMassConsumedThisChain += mass
  state.slimeMassConsumedTotal += mass
  state.chainMassConsumed += state.currentChainLength > 0 ? mass : 0
  state.bestChainMassConsumed = Math.max(state.bestChainMassConsumed, state.chainMassConsumed)
  const targetId = typeof event.targetId === 'number' && event.targetId >= 0 ? event.targetId : state.currentAttachmentTargetId
  if (targetId !== null && targetId !== undefined) {
    state.slimeMassConsumedPerTarget[targetId] = (state.slimeMassConsumedPerTarget[targetId] ?? 0) + mass
  }
}

export function recordFlowFullClear(state: FlowMetricsState, event: FlowFullClearEvent, config: FlowMetricsConfig = createFlowMetricsConfig()) {
  if (!config.flowMetricsEnabled) return
  state.fullGlobClears += 1
  state.chainFullClears += state.currentChainLength > 0 ? 1 : 0
  if (state.currentChainLength > 0) state.fullClearDuringChainCount += 1
  if (state.peakSealStrengthThisAttachment >= config.strongSealThreshold) state.fullClearAfterStrongSealCount += 1
  if ((event.massConsumed ?? 0) > 0) {
    recordFlowMassTransfer(state, { time: event.time, mass: event.massConsumed ?? 0, targetId: event.targetId }, config)
  }
  const targetId = typeof event.targetId === 'number' && event.targetId >= 0 ? event.targetId : state.currentAttachmentTargetId
  if (targetId !== null && targetId !== undefined && state.targetFirstAttachTime[targetId] !== undefined) {
    state.timeToClearGlob = Math.max(0, event.time - state.targetFirstAttachTime[targetId])
    state.timeToClearGlobTotal += state.timeToClearGlob
    state.timeToClearGlobCount += 1
  }
}

export function recordFlowBagFill(state: FlowMetricsState, event: FlowBagFillEvent, config: FlowMetricsConfig = createFlowMetricsConfig()) {
  if (!config.flowMetricsEnabled) return
  const gained = Math.max(0, event.massGained ?? event.amount - state.bagFillAmount)
  state.bagFillAmount = Math.max(0, event.amount)
  state.bagFillNormalized = Math.max(0, Math.min(1, event.normalized))
  state.highestBagFill = Math.max(state.highestBagFill, state.bagFillNormalized)
  state.bagFillGainedThisChain += state.currentChainLength > 0 ? gained : 0
}

export function recordFlowGrip(state: FlowMetricsState, event: FlowGripEvent, config: FlowMetricsConfig = createFlowMetricsConfig()) {
  if (!config.flowMetricsEnabled) return
  const targetId = typeof event.targetId === 'number' && event.targetId >= 0 ? event.targetId : null
  const quality = Math.max(0, Math.min(1, event.releaseQuality ?? 0))
  state.gripLastTargetId = targetId ?? state.gripLastTargetId
  state.gripCurrentHoldTime = Math.max(0, event.holdTime ?? state.gripCurrentHoldTime)
  state.gripMassMultiplierPeak = Math.max(state.gripMassMultiplierPeak, event.massMultiplier ?? 1)

  if (event.kind === 'attempt') {
    state.gripAttemptCount += 1
    state.gripLastReleaseReason = event.reason ?? 'none'
    return
  }
  if (event.kind === 'noContact') {
    state.gripLastReleaseReason = 'noContact'
    return
  }
  if (event.kind === 'attach') {
    state.gripLatchCount += 1
    state.gripLastReleaseReason = 'none'
    return
  }
  if (event.kind === 'missedWindow') {
    state.gripMissedReleaseCount += 1
    state.gripLastReleaseQuality = quality
    state.gripLastReleaseReason = 'missedWindow'
    return
  }
  if (event.kind === 'spinout') {
    state.gripSpinoutCount += 1
    state.gripReleaseCount += 1
    state.gripLastReleaseQuality = quality
    state.gripBestReleaseQuality = Math.max(state.gripBestReleaseQuality, quality)
    state.gripReleaseQualityTotal += quality
    state.gripReleaseQualityCount += 1
    state.gripLastReleaseReason = 'spinout'
    return
  }

  state.gripReleaseCount += 1
  state.gripLastReleaseQuality = quality
  state.gripBestReleaseQuality = Math.max(state.gripBestReleaseQuality, quality)
  state.gripReleaseQualityTotal += quality
  state.gripReleaseQualityCount += 1
  const reason = event.reason ?? (quality >= 0.82 ? 'perfectRelease' : quality >= 0.6 ? 'goodRelease' : 'sloppyRelease')
  state.gripLastReleaseReason = reason
  if (reason === 'perfectRelease') state.gripPerfectReleaseCount += 1
  else if (reason === 'goodRelease') state.gripGoodReleaseCount += 1
}

export function updateFlowMetrics(state: FlowMetricsState, input: FlowMetricsUpdateInput, config: FlowMetricsConfig = createFlowMetricsConfig()) {
  if (!config.flowMetricsEnabled) return
  const dt = Math.max(0, input.dt)
  state.now = input.time
  state.totalPlayTime = Math.max(0, input.time - state.sessionStartTime)

  if (input.attached && !state.isAttached) {
    recordFlowAttach(state, {
      time: input.time,
      targetId: input.targetId,
      speed: input.speed,
      sealStrength: input.sealStrength,
      contactAngle: input.contactAngle,
    }, config)
  } else if (!input.attached && state.isAttached) {
    recordFlowDetach(state, {
      time: input.time,
      targetId: state.currentAttachmentTargetId,
      speed: input.speed,
      sealStrength: input.sealStrength,
      tension: input.tension,
      contactAngle: input.contactAngle,
      reason: 'unknown',
    }, config)
  }

  state.currentSpeed = input.speed
  state.peakSpeed = Math.max(state.peakSpeed, input.speed)
  state.speedIntegral += input.speed * dt
  state.speedTimeTotal += dt
  state.averageSpeed = state.speedTimeTotal > 0 ? state.speedIntegral / state.speedTimeTotal : 0
  state.currentSealStrength = input.sealStrength
  state.strongestSeal = Math.max(state.strongestSeal, input.sealStrength)
  state.slimeMassRemaining = input.slimeMassRemaining ?? state.slimeMassRemaining
  if (typeof input.bagFillAmount === 'number' || typeof input.bagFillNormalized === 'number') {
    recordFlowBagFill(state, {
      time: input.time,
      amount: input.bagFillAmount ?? state.bagFillAmount,
      normalized: input.bagFillNormalized ?? state.bagFillNormalized,
    }, config)
  }

  if (state.isAttached) {
    state.currentAttachmentDuration = Math.max(0, input.time - state.currentAttachmentStartTime)
    state.totalAttachedTime += dt
    state.sealStrengthThisAttachmentIntegral += input.sealStrength * dt
    state.sealStrengthThisAttachmentTime += dt
    state.peakSealStrengthThisAttachment = Math.max(state.peakSealStrengthThisAttachment, input.sealStrength)
    if (input.sealStrength <= config.weakSealThreshold) state.weakSealTime += dt
    if (input.sealStrength >= config.strongSealThreshold) state.strongSealTime += dt
    if (input.embedActive) {
      state.embedTime += dt
      if (!state.embedActive) state.embedCount += 1
      state.embedActive = true
    } else {
      state.embedActive = false
    }
  } else {
    state.currentUnattachedDuration = Math.max(0, input.time - state.currentUnattachedStartTime)
    state.totalUnattachedTime += dt
    state.embedActive = false
  }

  if (state.currentChainLength > 0) {
    state.currentChainDuration = Math.max(0, input.time - state.currentChainStartTime)
    if (!state.isAttached && state.currentUnattachedDuration > config.chainBreakUnattachedTime) {
      finishChain(state, 'tooMuchTimeUnattached')
    }
  }

  if (input.speed < config.deadStopSpeedThreshold) {
    state.deadStopCandidateDuration += dt
    state.deadStopDuration += dt
    if (!state.deadStopActive && state.deadStopCandidateDuration >= config.deadStopDurationThreshold) {
      state.deadStopActive = true
      state.deadStopCount += 1
      if (!state.isAttached) finishChain(state, 'deadStop')
    }
  } else {
    state.deadStopCandidateDuration = 0
    state.deadStopActive = false
  }

  if (input.speed < config.flowMinSpeed) state.timeBelowFlowSpeed += dt
  if (!state.isAttached && state.currentChainLength > 0 && timeSince(input.time, state.lastDetachTime) > config.chainBreakLowSpeedDuration && input.speed < config.flowMinSpeed * 0.4) {
    finishChain(state, 'velocityTooLow')
  }

  if (state.pendingSnapClassification && timeSince(input.time, state.pendingSnapTime) > config.cleanSnapReattachWindow) {
    state.messySnapCount += 1
    state.pendingSnapClassification = false
  }

  state.movementWithSwingQuality = state.totalPlayTime > 0
    ? Math.max(0, Math.min(1.5, (state.averageSpeed / Math.max(config.flowMinSpeed, 0.001)) * 0.45 + getAttachRatio(state) * 0.55))
    : 0
  state.swingArcQuality = Math.max(0, Math.min(1.35, state.momentumRetainedRatio * 0.6 + (state.reattachWithinFlowWindow ? 0.35 : 0)))
}

function getAttachRatio(state: FlowMetricsState) {
  const measured = state.totalAttachedTime + state.totalUnattachedTime
  return measured > 0 ? state.totalAttachedTime / measured : 0
}

export function getFlowDebugSnapshot(state: FlowMetricsState, config: FlowMetricsConfig = createFlowMetricsConfig()): FlowMetricsDebugSnapshot {
  return {
    isAttached: state.isAttached,
    currentAttachmentId: state.currentAttachmentId,
    currentTargetId: state.currentTargetId,
    currentAttachmentDuration: state.currentAttachmentDuration,
    totalAttachedTime: state.totalAttachedTime,
    totalUnattachedTime: state.totalUnattachedTime,
    attachRatio: getAttachRatio(state),
    attachmentCount: state.attachmentCount,
    averageAttachmentDuration: state.completedAttachmentCount > 0 ? state.attachmentDurationTotal / state.completedAttachmentCount : state.currentAttachmentDuration,
    averageUnattachedDuration: state.unattachedSegmentCount > 0 ? state.unattachedDurationTotal / state.unattachedSegmentCount : state.currentUnattachedDuration,
    timeSinceLastAttach: timeSince(state.now, state.lastAttachTime),
    timeSinceLastDetach: timeSince(state.now, state.lastDetachTime),
    timeSinceLastSnap: timeSince(state.now, state.lastSnapTime),
    snapToReattachTime: state.snapToReattachTime,
    bestSnapToReattachTime: state.bestSnapToReattachTime,
    averageSnapToReattachTime: state.snapToReattachCount > 0 ? state.snapToReattachTotal / state.snapToReattachCount : 0,
    currentChainLength: state.currentChainLength,
    bestChainLength: state.bestChainLength,
    currentChainDuration: state.currentChainDuration,
    chainCount: state.chainCount,
    chainBreakReason: state.chainBreakReason,
    reattachWithinFlowWindow: state.reattachWithinFlowWindow,
    chainFlowWindowSeconds: config.flowReattachWindowSeconds,
    lastAttachmentTargetId: state.lastAttachmentTargetId,
    currentAttachmentTargetId: state.currentAttachmentTargetId,
    uniqueTargetsInChain: state.uniqueTargetsInChainSet.size,
    chainMassConsumed: state.chainMassConsumed,
    chainGlugCount: state.chainGlugCount,
    chainFullClears: state.chainFullClears,
    currentSpeed: state.currentSpeed,
    averageSpeed: state.averageSpeed,
    peakSpeed: state.peakSpeed,
    velocityAtAttach: state.velocityAtAttach,
    velocityBeforeSnap: state.velocityBeforeSnap,
    velocityAfterSnap: state.velocityAfterSnap,
    momentumRetainedRatio: state.momentumRetainedRatio,
    averageMomentumRetainedRatio: state.momentumRetainedCount > 0 ? state.momentumRetainedTotal / state.momentumRetainedCount : 0,
    deadStopCount: state.deadStopCount,
    deadStopDuration: state.deadStopDuration,
    timeBelowFlowSpeed: state.timeBelowFlowSpeed,
    postSnapLaunchQuality: state.postSnapLaunchQuality,
    swingArcQuality: state.swingArcQuality,
    movementWithSwingQuality: state.movementWithSwingQuality,
    glugsThisAttachment: state.glugsThisAttachment,
    totalGlugCount: state.totalGlugCount,
    glugCountThisChain: state.glugCountThisChain,
    averageGlugsPerAttachment: state.attachmentCount > 0 ? state.totalGlugCount / state.attachmentCount : 0,
    strongGlugCount: state.strongGlugCount,
    weakGlugCount: state.weakGlugCount,
    failedGlugCount: state.failedGlugCount,
    averageGlugStrength: state.totalGlugCount > 0 ? state.glugStrengthTotal / state.totalGlugCount : 0,
    peakGlugStrength: state.peakGlugStrength,
    timeSinceLastGlug: timeSince(state.now, state.lastGlugTime),
    slimeMassConsumedThisAttachment: state.slimeMassConsumedThisAttachment,
    slimeMassConsumedThisChain: state.slimeMassConsumedThisChain,
    slimeMassConsumedTotal: state.slimeMassConsumedTotal,
    massPerGlug: state.totalGlugCount > 0 ? state.slimeMassConsumedTotal / state.totalGlugCount : 0,
    sealStrengthAtGlug: state.sealStrengthAtGlug,
    tensionAtGlug: state.tensionAtGlug,
    bagFillGainedFromGlugs: state.bagFillGainedFromGlugs,
    currentSealStrength: state.currentSealStrength,
    averageSealStrengthThisAttachment: state.sealStrengthThisAttachmentTime > 0 ? state.sealStrengthThisAttachmentIntegral / state.sealStrengthThisAttachmentTime : state.currentSealStrength,
    peakSealStrengthThisAttachment: state.peakSealStrengthThisAttachment,
    weakSealTime: state.weakSealTime,
    strongSealTime: state.strongSealTime,
    embedTime: state.embedTime,
    embedCount: state.embedCount,
    snapFromWeakSealCount: state.snapFromWeakSealCount,
    snapFromHighTensionCount: state.snapFromHighTensionCount,
    sealBreakReason: state.sealBreakReason,
    contactAngleAtAttach: state.contactAngleAtAttach,
    contactAngleAtSnap: state.contactAngleAtSnap,
    tensionAtSnap: state.tensionAtSnap,
    sealStrengthAtSnap: state.sealStrengthAtSnap,
    snapCount: state.snapCount,
    snapsThisChain: state.snapsThisChain,
    snapReason: state.snapReason,
    snapTension: state.snapTension,
    snapVelocityBefore: state.snapVelocityBefore,
    snapVelocityAfter: state.snapVelocityAfter,
    snapLaunchSpeed: state.snapLaunchSpeed,
    snapLaunchDirection: state.snapLaunchDirection,
    snapImpulseApplied: state.snapImpulseApplied,
    reattachAfterSnapSuccess: state.reattachAfterSnapSuccess,
    snapGeneratedChainContinuation: state.snapGeneratedChainContinuation,
    cleanSnapCount: state.cleanSnapCount,
    messySnapCount: state.messySnapCount,
    slimeMassRemaining: state.slimeMassRemaining,
    slimeMassConsumedPerTarget: state.slimeMassConsumedPerTarget,
    fullGlobClears: state.fullGlobClears,
    fullClearDuringChainCount: state.fullClearDuringChainCount,
    fullClearAfterStrongSealCount: state.fullClearAfterStrongSealCount,
    timeToClearGlob: state.timeToClearGlob,
    averageTimeToClearGlob: state.timeToClearGlobCount > 0 ? state.timeToClearGlobTotal / state.timeToClearGlobCount : 0,
    residueCount: state.residueCount,
    stuckResidueEvents: state.stuckResidueEvents,
    bagFillAmount: state.bagFillAmount,
    bagFillNormalized: state.bagFillNormalized,
    bagFillGainedThisChain: state.bagFillGainedThisChain,
    highestBagFill: state.highestBagFill,
    gripAttemptCount: state.gripAttemptCount,
    gripLatchCount: state.gripLatchCount,
    gripReleaseCount: state.gripReleaseCount,
    gripPerfectReleaseCount: state.gripPerfectReleaseCount,
    gripGoodReleaseCount: state.gripGoodReleaseCount,
    gripMissedReleaseCount: state.gripMissedReleaseCount,
    gripSpinoutCount: state.gripSpinoutCount,
    gripCurrentHoldTime: state.gripCurrentHoldTime,
    gripBestReleaseQuality: state.gripBestReleaseQuality,
    gripAverageReleaseQuality: state.gripReleaseQualityCount > 0 ? state.gripReleaseQualityTotal / state.gripReleaseQualityCount : 0,
    gripLastReleaseQuality: state.gripLastReleaseQuality,
    gripLastReleaseReason: state.gripLastReleaseReason,
    gripLastTargetId: state.gripLastTargetId,
    gripMassMultiplierPeak: state.gripMassMultiplierPeak,
  }
}

export function getFlowSessionSummary(state: FlowMetricsState): FlowMetricsSessionSummary {
  const snapshot = getFlowDebugSnapshot(state)
  return {
    totalPlayTime: state.totalPlayTime,
    attachRatio: snapshot.attachRatio,
    bestChainLength: state.bestChainLength,
    averageSnapToReattachTime: snapshot.averageSnapToReattachTime,
    bestSnapToReattachTime: state.bestSnapToReattachTime,
    totalGlugs: state.totalGlugCount,
    averageGlugsPerAttachment: snapshot.averageGlugsPerAttachment,
    totalSlimeConsumed: state.slimeMassConsumedTotal,
    fullGlobClears: state.fullGlobClears,
    averageMomentumRetained: snapshot.averageMomentumRetainedRatio,
    deadStopCount: state.deadStopCount,
    bestChainMassConsumed: state.bestChainMassConsumed,
    strongestSeal: state.strongestSeal,
    highestBagFill: state.highestBagFill,
    gripAttemptCount: state.gripAttemptCount,
    gripPerfectReleaseCount: state.gripPerfectReleaseCount,
    gripSpinoutCount: state.gripSpinoutCount,
    gripBestReleaseQuality: state.gripBestReleaseQuality,
  }
}
