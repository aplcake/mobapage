import { PRODUCTION_TUNING } from '../core/productionTuning'
import type { FlowMetricsDebugSnapshot, FlowMetricsSessionSummary } from '../experiment/flowMetrics'

export type ProductionLevelState = 'boot' | 'ready' | 'playing' | 'nearComplete' | 'completing' | 'complete' | 'postComplete'
export type ProductionCompletionAnimationPhase = 'idle' | 'hit' | 'build' | 'disco-release' | 'settle' | 'summary'
export type ProductionLevelDifficulty = 'easy' | 'normal' | 'hard'
export type ProductionReattachChainVariant = 'easy' | 'medium' | 'hard'
export type ProductionStretchSnapPreset = keyof typeof PRODUCTION_TUNING.stretchSnapPresets
export type HoseSlimeInteractionPhase = 'idle' | 'near' | 'touch' | 'seal' | 'stretch' | 'gulp' | 'strain' | 'pop'

export const PRODUCTION_DEV_MODES = [
  {
    id: 'full-loop',
    label: 'Full Loop',
    description: 'Current integrated experiment with all copied localhost:3002 prototype behaviour intact.',
  },
  {
    id: 'movement-lab',
    label: 'Body Drift',
    description: 'Empty arena body-only drive test for acceleration, coast, drift, facing, and force telemetry.',
  },
  {
    id: 'suction-contact',
    label: 'Push Pull',
    description: 'One-glob elastic suction lab for radial spring pull, tension bounce, preset switching, and pop release.',
  },
  {
    id: 'glug-rhythm',
    label: 'Glug Rhythm',
    description: 'Inspect one-pile repeated glug events, mass transfer, bridge surge, mouth pulse, and bag response.',
  },
  {
    id: 'deep-embed',
    label: 'Deep Embed',
    description: 'Inspect hose-head submerge depth, embedded lock, stronger glugging, strain, and pop-out release.',
  },
  {
    id: 'pivot-swing-lab',
    label: 'Pivot Swing',
    description: 'Inspect suction lock as a true pivot, angular swing, hose overstretch, snap fling, and reattach.',
  },
  {
    id: 'grip-swing-lab',
    label: 'Grip Swing',
    description: 'Inspect right-click slime grip contact points, timing-window release, spin escalation, and spinout.',
  },
  {
    id: 'hose-swing',
    label: 'Hose Swing',
    description: 'Inspect anchored hose tip, body motion, stretch, swing tension, snap, and fling.',
  },
  {
    id: 'reattach-chain',
    label: 'Catch Chain',
    description: 'Inspect two-glob stretch-snap pop release, grace-window catch assist, and same-anchor cooldown.',
  },
  {
    id: 'multi-glob-chain',
    label: 'Multi Glob',
    description: 'Inspect reattach grace, momentum carry, and chain flow across slime piles.',
  },
  {
    id: 'slime-material',
    label: 'Slime Material',
    description: 'Inspect slime thickness, colour response, deformation, settling, and reference adaptation.',
  },
  {
    id: 'bag-fill',
    label: 'Bag Fill',
    description: 'Inspect mass-driven bag fill, pulse, swelling, pressure, beauty, and near-full response.',
  },
] as const

export type ProductionDevModeId = (typeof PRODUCTION_DEV_MODES)[number]['id']

export type ProductionExperimentStatsSnapshot = {
  devMode?: ProductionDevModeId
  reattachChainVariant?: ProductionReattachChainVariant
  stretchSnapPreset?: ProductionStretchSnapPreset
  stretchSnapPresetValues?: {
    springStrength: number
    damping: number
    maxStretch: number
    playerControlWhileSealed: number
    driftRetentionWhileSealed: number
    elasticBounceAmount: number
    snapPower: number
    reattachGraceDuration: number
  }
  slimeSealStrength?: number
  hoseHookStrength?: number
  swingTension?: number
  bodySpeed?: number
  bodyAcceleration?: number
  bodyDriftFactor?: number
  bodyLateralSpeed?: number
  bodyFacingVelocityAngle?: number
  bodyVelocityDirection?: number
  bodyPosition?: { x: number; y: number; z: number }
  bodyVelocity?: { x: number; y: number; z: number }
  baseVelocity?: { x: number; y: number; z: number }
  playerMovementForce?: { x: number; y: number; z: number }
  suctionForce?: { x: number; y: number; z: number }
  snapImpulse?: { x: number; y: number; z: number }
  externalForces?: { x: number; y: number; z: number }
  movementModel?: string
  arenaModel?: string
  slimeLayoutModel?: string
  arenaRadius?: number
  arenaPlayableRadius?: number
  arenaPileCount?: number
  arenaClusterCount?: number
  arenaClusterDensity?: number
  arenaIsolatedSlimeCount?: number
  arenaNearestSpacingMin?: number
  arenaNearestSpacingMax?: number
  arenaNearestSpacingAvg?: number
  arenaMinimumSlimeSpacing?: number
  arenaMaximumSlimeSpacing?: number
  arenaClusterToClusterDistanceBias?: number
  arenaCenterPlacementBias?: number
  arenaOuterRingPlacementBias?: number
  mouthPosition?: { x: number; y: number; z: number }
  mouthForward?: { x: number; y: number; z: number }
  mouthSurfaceContactState?: 'floating' | 'touching' | 'embedded'
  mouthSurfaceDistance?: number
  mouthSurfaceCompression?: number
  mouthSealRing?: number
  mouthFloatingWarning?: number
  hoseSlimeInteractionPhase?: HoseSlimeInteractionPhase
  hoseSlimeNear?: number
  hoseSlimeTouch?: number
  hoseSlimeSeal?: number
  hoseSlimeStretch?: number
  hoseSlimeGulp?: number
  hoseSlimeStrain?: number
  hoseSlimePop?: number
  controlModel?: string
  bodyInputActive?: boolean
  bodyInput?: { x: number; z: number }
  mouseBodyInputActive?: boolean
  mouseBodyInput?: { x: number; z: number }
  hoseActive?: boolean
  hoseBlowActive?: boolean
  hoseBlowStrength?: number
  hoseBlowPressure?: number
  hoseBlowPush?: number
  hoseBlowAffectedMotes?: number
  hoseBlowMaxDistance?: number
  hoseTarget?: { x: number; y: number; z: number }
  hoseAimPoint?: { x: number; y: number; z: number }
  hoseAimLag?: number
  hoseAimJitter?: number
  hoseAimResponsiveness?: number
  hoseAimStability?: number
  cursorWorldPosition?: { x: number; y: number; z: number }
  hoseReachCenter?: { x: number; y: number; z: number }
  desiredHoseMouthPosition?: { x: number; y: number; z: number }
  actualHoseMouthPosition?: { x: number; y: number; z: number }
  hoseMouthVelocity?: { x: number; y: number; z: number }
  hoseReachClamped?: boolean
  hoseReachExtension?: number
  hoseReachForwardAmount?: number
  hoseReachSideAmount?: number
  hoseReachTargetClampedDistance?: number
  hoseReachLockedToAnchor?: boolean
  rightClickGripEnabled?: boolean
  suctionApproachSettle?: number
  suctionApproachPull?: number
  suctionApproachLocked?: boolean
  tetherStrain?: number
  tetherRelease?: number
  pivotLocked?: boolean
  pivotPoint?: { x: number; y: number; z: number }
  pivotLockDuration?: number
  pivotAngularVelocity?: number
  pivotTangentialSpeed?: number
  pivotRadialDistance?: number
  pivotHoseStretchRatio?: number
  pivotTension?: number
  pivotSnapThreshold?: number
  pivotSwingAssist?: number
  pivotHoseVisualStretch?: number
  pivotHoseThinning?: number
  pivotHoseWobble?: number
  pivotSnapReadiness?: number
  pivotReattachCooldown?: number
  pivotCandidateTargetId?: number
  pivotReleaseReason?: string
  gripActive?: boolean
  gripState?: string
  gripTargetPileIndex?: number
  gripTargetMoteId?: number
  gripContactIndex?: number
  gripPoint?: { x: number; y: number; z: number }
  gripHoldTime?: number
  gripSpinSpeed?: number
  gripSpinAngle?: number
  gripReleaseWindowWidth?: number
  gripReleaseQuality?: number
  gripReleaseReady?: number
  gripReleaseCue?: number
  gripReleaseReadiness?: number
  gripReleasePhaseQuality?: number
  gripReleaseGraceTimer?: number
  gripDizzy?: number
  gripMissCount?: number
  gripMissPulse?: number
  gripSpinoutPulse?: number
  gripPhysicalCue?: number
  gripPocketBiteCue?: number
  gripHoseStrainCue?: number
  gripMouthAnticipationCue?: number
  gripMassMultiplier?: number
  gripGlugBoost?: number
  gripLastReleaseQuality?: number
  gripReleaseReason?: string
  suctionReadiness?: number
  suctionState?: 'free' | 'seeking' | 'prePull' | 'contact' | 'sealed' | 'releasing'
  stretchSnapState?: StretchSnapGrappleState
  stretchSnapStateAge?: number
  stretchSnapTensionJuice?: number
  stretchSnapCameraImpulse?: number
  stretchSnapAudioCue?: string
  stretchSnapAudioIntensity?: number
  anchorWorldPosition?: { x: number; y: number; z: number }
  anchorInitialWorldPosition?: { x: number; y: number; z: number }
  anchorReleasePoint?: { x: number; y: number; z: number }
  anchorReleaseDirection?: { x: number; y: number; z: number }
  anchorSnapImpulseVector?: { x: number; y: number; z: number }
  anchorSnapDirectionDot?: number
  anchorReleasePreviewStrength?: number
  anchorFinalSqueeze?: number
  anchorRestLength?: number
  anchorCurrentDistance?: number
  anchorAttachAge?: number
  anchorDrift?: number
  anchorMaxDrift?: number
  anchorLockDrift?: number
  anchorMaxLockDrift?: number
  anchorDriftViolationCount?: number
  anchorDriftViolationPulse?: number
  anchorSealSnapPulse?: number
  anchorSealCompressionTimer?: number
  anchorReleaseReason?: string
  anchorStretch?: number
  anchorTension?: number
  anchorTensionVelocity?: number
  anchorElasticBounce?: number
  anchorReboundImpulse?: number
  anchorPlayerControlMultiplier?: number
  anchorDriftRetentionMultiplier?: number
  anchorDirectionToAnchor?: { x: number; y: number; z: number }
  anchorSpringForceVector?: { x: number; y: number; z: number }
  anchorDampingForceVector?: { x: number; y: number; z: number }
  anchorElasticForceVector?: { x: number; y: number; z: number }
  anchorSpringForce?: number
  anchorDampingForce?: number
  anchorLateralDamping?: number
  anchorRadialVelocity?: number
  anchorTangentVelocity?: number
  anchorOverstretchTimer?: number
  anchorReleaseTension?: number
  anchorSnapImpulseMagnitude?: number
  anchorPostReleaseVelocity?: number
  anchorPostReleaseControlTimer?: number
  anchorPostReleaseControlCurve?: number
  anchorPopJuice?: number
  anchorReattachGraceTimer?: number
  anchorReattachCooldownTimer?: number
  anchorReattachCandidateMoteId?: number
  anchorReattachCandidateScore?: number
  anchorReattachAssistDirection?: { x: number; y: number; z: number }
  anchorReattachRejectedCandidateMoteId?: number
  anchorReattachRejectedCandidateScore?: number
  anchorReattachRejectedCandidateReason?: string
  anchorReattachAssistRadius?: number
  anchorReattachAssistAngle?: number
  anchorReattachAssistStrength?: number
  anchorReattachCatchPulse?: number
  anchorReattachCatchCount?: number
  anchorReattachLastCatchTargetId?: number
  anchorReattachLastCatchPileIndex?: number
  anchorReleaseTargetPileIndex?: number
	  sealTargetMoteId?: number
	  sealTargetPileIndex?: number
	  postSnapReattachTimer?: number
	  contactPatch?: { x: number; y: number; z: number }
	  bridgeActive?: boolean
	  bridgeLength?: number
	  bridgeThickness?: number
	  sealQuality?: number
	  glugTimer?: number
	  lastGlugTime?: number
	  glugCountThisAttachment?: number
	  glugEventStrength?: number
	  glugEventMass?: number
	  glugFailedStrength?: number
	  currentSlimeMass?: number
	  bridgeStrain?: number
	  massTransferredThisAttachment?: number
	  embedState?: string
	  embedDepth?: number
	  embedLockStrength?: number
	  embedSnapThreshold?: number
	  embedAnglePenalty?: number
	  embedTensionPenalty?: number
	  embedReleaseReason?: string
	  embedGlugCount?: number
	  embedMassTransferred?: number
	  embedPocketPulse?: number
	  embedRimOcclusion?: number
	  embedFleckBurst?: number
	  glugPulse?: number
  glugMassFlow?: number
  glugCycles?: number
  bagFill?: number
  bagPressure?: number
  bagPulse?: number
  bagOutlineShock?: number
  bagShockwave?: number
  bagShockwaveAge?: number
  bagBeauty?: number
  bagCollectedMass?: number
  bagFillAmount?: number
  bagFillNormalized?: number
  bagLastMassReceived?: number
  bagReactionStrength?: number
  bagNonUniformBulge?: number
  bagGlow?: number
  bagInternalMotion?: number
  bagNearFull?: boolean
  bagGlugCountThisTest?: number
  currentBagScale?: { x: number; y: number; z: number }
  bagWobble?: number
  bagFullPulse?: number
  bagSlimeChroma?: number
  comboModel?: string
  slimeComboCount?: number
  slimeComboBest?: number
  slimeComboTimer?: number
  slimeComboPulse?: number
  slimeComboBurst?: number
  slimeComboShockwave?: number
  slimeComboShockwaveAge?: number
  slimeComboActive?: boolean
  slimeComboLastPileIndex?: number
  flowMetricsModel?: string
  flowMetrics?: FlowMetricsDebugSnapshot
  flowSummary?: FlowMetricsSessionSummary
  levelModel?: string
  levelState?: ProductionLevelState
  slimeMassStart?: number
  slimeMassRemaining?: number
  completionPercent?: number
  majorGlobsRemaining?: number
  nearComplete?: boolean
  completionTriggered?: boolean
  completionAnimationPhase?: ProductionCompletionAnimationPhase
  completionAnimationTime?: number
  timeInLevel?: number
  levelCompletionSummary?: {
    time: number
    slimeClearedPercent: number
    bestChainLength: number
    totalGlugs: number
    attachRatio: number
    momentumRetained: number
    bagFillNormalized: number
  } | null
  levelCompletionSnapshot?: FlowMetricsSessionSummary | null
  levelDifficulty?: ProductionLevelDifficulty
  levelClearTarget?: number
  levelProgressTowardTarget?: number
  levelRegenRate?: number
  levelPartyTarget?: number
  levelPartyProgress?: number
  levelProgressLighting?: number
  levelRegenPressure?: number
  levelRegeneratedMass?: number
  levelRegenBank?: number
  levelCleanupAssist?: number
  levelRegenResetPulse?: number
  levelSlimeGenerationModel?: string
  levelSlimeGenerationRate?: number
  levelSlimeGenerationAddedMass?: number
  levelSlimeGenerationBudCount?: number
  levelSlimeGenerationActivePieces?: number
  levelSlimeGenerationSuppression?: number
  allVisibleSlimeVacuumableModel?: string
  slimeVacuumableVisibleCount?: number
  slimeVacuumableTinyCount?: number
  slimeVacuumableStrandedCount?: number
  slimeGameplayVisibleMass?: number
  slimeVisualEffectResidueCount?: number
  completionCycles?: number
  controller?: {
    releaseMomentum?: number
    reattachGrace?: number
    anchorLoad?: number
    swingFlow?: number
  }
  slimePhysics?: {
    avgLivingPulse?: number
    avgLivingCreep?: number
    avgLivingCongeal?: number
    avgLivingBreak?: number
    avgReferenceDrift?: number
    avgReferenceMerge?: number
    avgReferenceSplit?: number
    avgReferenceRelocation?: number
    avgContactReadiness?: number
    avgContactFunnel?: number
    avgContactFeed?: number
    avgContactSnap?: number
    avgEasySuctionPull?: number
    avgHoseFlow?: number
  }
}

export type SuctionContactState =
  | 'free-motion'
  | 'airflow-influence'
  | 'flow-bridge-forming'
  | 'seal-contact'
  | 'anchored-suction-grip'
  | 'stretch-and-gulp'
  | 'tension-and-snap'
  | 'fling-and-recovery'

export type StretchSnapGrappleState =
  | 'free'
  | 'seeking'
  | 'prePull'
  | 'contact'
  | 'sealed'
  | 'stretched'
  | 'snapping'
  | 'graceReattach'
  | 'caught'
  | 'recovery'

export function isProductionDevModeId(value: string | null): value is ProductionDevModeId {
  return PRODUCTION_DEV_MODES.some((mode) => mode.id === value)
}

export function getProductionDevMode(value: string | null) {
  if (isProductionDevModeId(value)) {
    return PRODUCTION_DEV_MODES.find((mode) => mode.id === value) ?? PRODUCTION_DEV_MODES[0]
  }
  return PRODUCTION_DEV_MODES[0]
}

export function deriveStretchSnapGrappleState(stats?: ProductionExperimentStatsSnapshot | null): StretchSnapGrappleState {
  if (!stats) return 'free'

  const suctionState = stats.suctionState ?? 'free'
  const hasTarget = (stats.sealTargetMoteId ?? -1) >= 0
  const tension = stats.anchorTension ?? 0
  const stretch = stats.anchorStretch ?? 0
  const seal = stats.slimeSealStrength ?? 0
  const hook = stats.hoseHookStrength ?? 0
  const grace = Math.max(stats.anchorReattachGraceTimer ?? 0, stats.postSnapReattachTimer ?? 0)
  const catchPulse = stats.anchorReattachCatchPulse ?? 0
  const pop = Math.max(stats.anchorPopJuice ?? 0, stats.tetherRelease ?? 0, stats.anchorPostReleaseControlTimer ?? 0)
  const stretchedThreshold = PRODUCTION_TUNING.suction.stretchSnapStretchedThreshold
  const seeking = Math.max(
    stats.suctionReadiness ?? 0,
    stats.suctionApproachPull ?? 0,
    stats.slimePhysics?.avgEasySuctionPull ?? 0,
    stats.slimePhysics?.avgContactReadiness ?? 0,
  )

  if (catchPulse > 0.08) return 'caught'
  if (suctionState === 'releasing' || (stats.anchorPostReleaseControlTimer ?? 0) > 0.015 || (stats.anchorPopJuice ?? 0) > 0.18) return 'snapping'
  if (grace > 0.015) return 'graceReattach'
  if (suctionState === 'sealed') {
    if (tension > stretchedThreshold || stretch > stretchedThreshold) return 'stretched'
    return 'sealed'
  }
  if (suctionState === 'contact') return 'contact'
  if (suctionState === 'prePull') return 'prePull'
  if (suctionState === 'seeking') return 'seeking'
  if (hasTarget || seal > 0.05 || hook > 0.04 || seeking > 0.01) return 'seeking'
  if (pop > 0.025) return 'recovery'
  return 'free'
}

export function deriveSuctionContactState(stats?: ProductionExperimentStatsSnapshot | null): SuctionContactState {
  if (!stats) return 'free-motion'
  if (stats.hoseSlimeInteractionPhase === 'pop') return 'fling-and-recovery'
  if (stats.hoseSlimeInteractionPhase === 'strain') return 'tension-and-snap'
  if (stats.hoseSlimeInteractionPhase === 'gulp' || stats.hoseSlimeInteractionPhase === 'stretch') return 'stretch-and-gulp'
  if (stats.hoseSlimeInteractionPhase === 'seal') return 'anchored-suction-grip'
  if (stats.hoseSlimeInteractionPhase === 'touch') return 'seal-contact'
  if (stats.suctionState === 'contact') return 'seal-contact'
  if (stats.hoseSlimeInteractionPhase === 'near') return 'airflow-influence'
  if (stats.suctionState === 'sealed') return 'anchored-suction-grip'
  if (stats.suctionState === 'releasing') return 'seal-contact'
  if (stats.suctionState === 'prePull') return 'airflow-influence'
  if (stats.suctionState === 'seeking') return 'airflow-influence'

  const seal = stats.slimeSealStrength ?? 0
  const hook = stats.hoseHookStrength ?? 0
  const tension = stats.swingTension ?? 0
  const strain = stats.tetherStrain ?? 0
  const release = stats.tetherRelease ?? 0
  const pivotTension = stats.pivotTension ?? 0
  const pivotReady = stats.pivotSnapReadiness ?? 0
  const pivotLocked = stats.pivotLocked ? 1 : 0
  const gripActive = stats.gripActive ? 1 : 0
  const gripDizzy = stats.gripDizzy ?? 0
  const glug = Math.max(
    stats.glugPulse ?? 0,
    stats.glugMassFlow ?? 0,
    stats.glugEventStrength ?? 0,
    stats.slimePhysics?.avgHoseFlow ?? 0,
  )
  const feed = Math.max(stats.slimePhysics?.avgContactFeed ?? 0, stats.suctionReadiness ?? 0)
  const contact = Math.max(stats.slimePhysics?.avgContactReadiness ?? 0, stats.slimePhysics?.avgContactFunnel ?? 0)
  const prePull = Math.max(stats.slimePhysics?.avgEasySuctionPull ?? 0, stats.suctionReadiness ?? 0, stats.suctionApproachPull ?? 0)
	  const releaseMomentum = stats.controller?.releaseMomentum ?? 0
	  const postSnapReattach = Math.max(stats.postSnapReattachTimer ?? 0, stats.anchorReattachGraceTimer ?? 0)
	  const snap = Math.max(stats.slimePhysics?.avgContactSnap ?? 0, release, pivotReady)
	  const embedDepth = stats.embedDepth ?? 0
	  const embedState = stats.embedState ?? 'searching'
	  const bridge = Math.max(
	    stats.bridgeActive ? 0.08 : 0,
	    stats.bridgeThickness ?? 0,
	    (stats.bridgeLength ?? 0) > 0.05 ? 0.04 : 0,
	  )
	  const sealQuality = stats.sealQuality ?? seal

		  if (snap > 0.18 || releaseMomentum > 0.32 || postSnapReattach > 0.08 || embedState === 'pop-out-snap' || embedState === 'recovery') return 'fling-and-recovery'
		  if (stats.suctionApproachLocked || (stats.suctionApproachSettle ?? 0) > 0.18) return 'airflow-influence'
	  if (tension > 1.05 || strain > 0.82 || pivotTension > 0.86 || gripDizzy > 0.86 || embedState === 'embed-strain') return 'tension-and-snap'
	  if (glug > 0.12 || gripActive > 0 || (feed > 0.08 && sealQuality > 0.55)) return 'stretch-and-gulp'
	  if ((sealQuality > 0.82 && hook > 0.62) || pivotLocked > 0 || gripActive > 0 || embedDepth > 0.32 || embedState === 'embed-lock' || embedState === 'deep-embed') return 'anchored-suction-grip'
	  if (seal > 0.34 || sealQuality > 0.34 || contact > 0.045) return 'seal-contact'
	  if (bridge > 0.04 || contact > 0.018 || feed > 0.025) return 'flow-bridge-forming'
  if (prePull > 0.008) return 'airflow-influence'
  return 'free-motion'
}
