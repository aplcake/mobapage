'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { damp, seededNoise } from '../core/math'
import { PALETTE } from '../core/palettes'
import { PRODUCTION_TUNING } from '../core/productionTuning'
import { deriveStretchSnapGrappleState, isProductionDevModeId, type ProductionDevModeId, type StretchSnapGrappleState } from '../dev/productionDevModes'
import { playSoundHook, type SoundEventName } from '../audio/soundHooks'
import { createMouthRingMaterial, type MouthRingMaterial } from '../shaders/mouthRingMaterial'
import {
  EXPERIMENT_DETAIL_INK,
  EXPERIMENT_SOFT_INK,
  ExperimentOutlineMesh,
  createBagPulseMaterial,
  createInstancedInkOutlineMaterial,
  createSlimeSurfaceMaterial,
  getExperimentToonRampTexture,
  setBasicInstancedOpacity,
  syncInstancedOutlineMatrices,
  toon,
  updateSlimeSurfaceUniforms,
  type BagPulseMaterial,
  type SlimeSurfaceMaterial,
} from './experimentMaterials'
import { computeSuctionForce } from '../systems/suction/SuctionField'
import {
  computeAnchoredControllerResponse,
  computeBagRewardResponse,
  computeCartoonActionAnimation,
  computeDeepSuctionEmbed,
  computeContractionTarget,
  computeElasticSnapBond,
  computeElasticTether,
  computeEasySuctionAssist,
  computeFragmentAbsorption,
  computeFullSlurpPayoff,
  computeGlugMassTransferEvent,
  computeHoseSlimeInteractionRead,
  computeIntakeContact,
  computeIntakeMassTransfer,
  computeJellyWaxStretchTarget,
  computeJellyWaxYield,
  computeLooseFragmentIntake,
  computeMergeCohesion,
  computeMouthContactSequence,
  computeOrganicSuctionGrip,
  computePileSurfaceSuctionAssist,
  computePhysicalPileContactGate,
  computePremiumSlimeMaterial,
  computePoolingSettle,
  computeRhythmicGlugPulse,
  computeVisibleHoseSlurp,
  computeSlimeGrabReadiness,
  computeSlurpReadiness,
  computeSuctionContactFlow,
  computeSuctionCandidateScore,
  computeSuctionPivotSwing,
  computeVisibleSlimeVacuumability,
  computeRightClickGripSwing,
  computeSwingFlowResponse,
  computeSuctionDeformation,
  type DeepSuctionEmbedReleaseReason,
  type DeepSuctionEmbedState,
  type HoseSlimeInteractionPhase,
} from './slimePhysics'
import {
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
  type FlowMetricsDebugSnapshot,
  type FlowMetricsSessionSummary,
  type FlowMetricsState,
} from './flowMetrics'

type LevelState = 'boot' | 'ready' | 'playing' | 'nearComplete' | 'completing' | 'complete' | 'shopping' | 'defeated'
type CompletionAnimationPhase = 'idle' | 'hit' | 'build' | 'disco-release' | 'settle' | 'summary'
type DefeatAnimationPhase = 'idle' | 'warning' | 'gulped' | 'flood' | 'buried' | 'summary'
type LevelDifficulty = 'easy' | 'normal' | 'hard'
type GripSwingState = 'idle' | 'searching' | 'locked' | 'release-window' | 'overdrive' | 'spinout' | 'recovery'
type GripReleaseReason = 'none' | 'perfectRelease' | 'goodRelease' | 'sloppyRelease' | 'missedWindow' | 'spinout' | 'noContact' | 'disabled'
// Sticky suction responsibilities:
// free: no committed slime point; seeking may update candidates.
// prePull: mouth-local suction can still score/replace candidates before the bite.
// sealed: exactly one captured world anchor is immutable until release.
// releasing: visual/physics cooldown after a manual or tension break clears the anchor.
type StickySuctionState = 'free' | 'seeking' | 'prePull' | 'contact' | 'sealed' | 'releasing'
type StickySuctionReleaseReason =
  | 'none'
  | 'manual'
  | 'overstretch'
  | 'lostSlime'
  | 'bodyIntersection'
  | 'debug'
  | 'disabled'
  | 'reset'
type ReattachRejectReason = 'none' | 'sameAnchorCooldown' | 'needsExitDistance' | 'behindTravel' | 'tooFar' | 'weakCandidate' | 'heldCandidate'
type ReattachChainVariant = 'easy' | 'medium' | 'hard'
type StretchSnapFeelPreset = keyof typeof PRODUCTION_TUNING.stretchSnapPresets
type StretchSnapPresetTuning = (typeof PRODUCTION_TUNING.stretchSnapPresets)[StretchSnapFeelPreset]
type StretchSnapSoundEvent = Extract<SoundEventName, 'stretchSnapSeal' | 'stretchSnapStrain' | 'stretchSnapGulp' | 'stretchSnapPop' | 'stretchSnapCatch'>

type LevelCompletionSummary = {
  time: number
  slimeClearedPercent: number
  bestChainLength: number
  totalGlugs: number
  attachRatio: number
  momentumRetained: number
  bagFillNormalized: number
  currencyEarned: number
  stylePoints: number
  gunkValue: number
  coinValue: number
}

type VacuumRuntime = {
  position: THREE.Vector3
  velocity: THREE.Vector3
  baseVelocity: THREE.Vector3
  playerMovementForce: THREE.Vector3
  suctionForce: THREE.Vector3
  snapImpulse: THREE.Vector3
  externalForces: THREE.Vector3
  previousVelocity: THREE.Vector3
  target: THREE.Vector3
  cursorWorldPosition: THREE.Vector3
  hoseTarget: THREE.Vector3
  hoseAimPoint: THREE.Vector3
  hoseAimLag: number
  hoseAimJitter: number
  hoseAimResponsiveness: number
  hoseAimStability: number
  hoseAimReach: number
  hoseReachCenter: THREE.Vector3
  desiredHoseMouthPosition: THREE.Vector3
  actualHoseMouthPosition: THREE.Vector3
  hoseMouthVelocity: THREE.Vector3
  hoseReachLocal: THREE.Vector3
  hoseReachClamped: boolean
  hoseReachExtension: number
  hoseReachForwardAmount: number
  hoseReachSideAmount: number
  hoseReachTargetClampedDistance: number
  hoseReachLockedToAnchor: boolean
  hoseBodyForwardClearance: number
  hoseBodySideClearance: number
  hoseBodyPlanarClearance: number
  hoseBodyIntersectionRisk: number
  hoseBlowInputActive: boolean
  hoseBlowStrength: number
  hoseBlowPressure: number
  hoseBlowPush: number
  hoseBlowAffectedMotes: number
  hoseBlowMaxDistance: number
  hoseBlowReleasePulse: number
  mouth: THREE.Vector3
  slimeSealPoint: THREE.Vector3
  slimeHookPoint: THREE.Vector3
  slimeSealAnchorPoint: THREE.Vector3
  hoseHookOffset: THREE.Vector3
  hoseHookVelocity: THREE.Vector3
  snapMomentum: THREE.Vector3
  forward: THREE.Vector3
  mouthForward: THREE.Vector3
  devMode: ProductionDevModeId
  reattachChainVariant: ReattachChainVariant
  stretchSnapPreset: StretchSnapFeelPreset
  sealTargetMoteId: number
  sealTargetPileIndex: number
  sealTargetScore: number
  postSnapReattachTimer: number
  yaw: number
  pulse: number
  recoil: number
  flash: number
  gulpFlow: number
  gulpAge: number
  glugPulse: number
  glugMassFlow: number
  glugCycles: number
  glugLastAt: number
  glugLastAge: number
  glugCountThisAttachment: number
  glugEventStrength: number
  glugEventMass: number
  glugFailedStrength: number
  bagFill: number
  bagFillTarget: number
  bagPulse: number
  bagOutlineShock: number
  bagShockwave: number
  bagShockwaveAge: number
  bagPressure: number
  bagBeauty: number
  bagCollectedMass: number
  bagFillAmount: number
  bagFillNormalized: number
  bagLastMassReceived: number
  bagReactionStrength: number
  bagNonUniformBulge: number
  bagGlow: number
  bagInternalMotion: number
  bagNearFull: boolean
  bagGlugCountThisTest: number
  bagPulseDelayTimer: number
  bagQueuedPulse: number
  bagQueuedWobble: number
  bagQueuedBeauty: number
  bagQueuedFullPulse: number
  bagScaleX: number
  bagScaleY: number
  bagScaleZ: number
  bagWobble: number
  bagFullPulse: number
  bagSlimeChroma: number
  bagSlimeColor: THREE.Color
  bagSlimeColorTarget: THREE.Color
  bagSlimeTintStrength: number
  bagSlimeTintPulse: number
  slimeComboCount: number
  slimeComboBest: number
  slimeComboTimer: number
  slimeComboPulse: number
  slimeComboBurst: number
  slimeComboShockwave: number
  slimeComboShockwaveAge: number
  slimeComboLabelAge: number
  slimeComboLastMoteId: number
  slimeComboLastPileIndex: number
  slimeComboWorldPosition: THREE.Vector3
  animationAnticipation: number
  animationStretch: number
  animationSlurp: number
  animationGlug: number
  animationSlide: number
  animationSnap: number
  animationRecoil: number
  animationBag: number
  animationCompletion: number
  animationMouthTug: number
  animationBodyJolt: number
  animationStrandPinch: number
  slimeCompletionNearEmpty: number
  slimeCompletionFinalStrand: number
  slimeCompletionFinalGlug: number
  slimeCompletionCleanup: number
  slimeCompletionChainReady: number
  slimeSealDemand: number
  slimeSealStrength: number
  slimeSealAge: number
  suctionState: StickySuctionState
  stretchSnapState: StretchSnapGrappleState
  stretchSnapPreviousState: StretchSnapGrappleState
  stretchSnapStateAge: number
  stretchSnapTensionJuice: number
  stretchSnapCameraImpulse: number
  stretchSnapAudioCue: StretchSnapSoundEvent | 'none'
  stretchSnapAudioIntensity: number
  stretchSnapLastAudioAt: number
  anchorWorldPosition: THREE.Vector3
  anchorInitialWorldPosition: THREE.Vector3
  anchorReleasePoint: THREE.Vector3
  anchorReleaseDirection: THREE.Vector3
  anchorSnapImpulseVector: THREE.Vector3
  anchorSnapDirectionDot: number
  anchorReleasePreviewStrength: number
  anchorFinalSqueeze: number
  anchorRestLength: number
  anchorCurrentDistance: number
  anchorAttachStartedAt: number
  anchorAttachAge: number
  anchorDrift: number
  anchorMaxDrift: number
  anchorLockDrift: number
  anchorMaxLockDrift: number
  anchorDriftViolationCount: number
  anchorDriftViolationPulse: number
  anchorLastDriftViolationAt: number
  anchorSealSnapPulse: number
  anchorSealCompressionTimer: number
  anchorReleaseReason: StickySuctionReleaseReason
  anchorQueuedReleaseReason: StickySuctionReleaseReason
  anchorReleaseTargetMoteId: number
  anchorReleaseTargetPileIndex: number
  anchorStretch: number
  anchorTension: number
  anchorPreviousTension: number
  anchorTensionVelocity: number
  anchorElasticBounce: number
  anchorReboundImpulse: number
  anchorPlayerControlMultiplier: number
  anchorDriftRetentionMultiplier: number
  anchorDirectionToAnchor: THREE.Vector3
  anchorSpringForceVector: THREE.Vector3
  anchorDampingForceVector: THREE.Vector3
  anchorElasticForceVector: THREE.Vector3
  anchorSpringForce: number
  anchorDampingForce: number
  anchorLateralDamping: number
  anchorRadialVelocity: number
  anchorTangentVelocity: number
  anchorLatchInfluence: number
  anchorLatchPivotActive: boolean
  anchorLatchTurnForce: number
  anchorLatchTangentPreserve: number
  anchorLatchRadialDamping: number
  anchorLatchAngularVelocity: number
  anchorLatchDirection: THREE.Vector3
  anchorLatchOffAxis: number
  anchorLatchRedirectStrength: number
  anchorLatchPivotKick: number
  anchorOverstretchTimer: number
  anchorReleaseTension: number
  anchorSnapImpulseMagnitude: number
  anchorPostReleaseVelocity: number
  anchorPostReleaseControlTimer: number
  anchorPostReleaseControlCurve: number
  anchorPopJuice: number
  anchorPopRing: number
  anchorReattachGraceTimer: number
  anchorReattachCooldownTimer: number
  anchorReattachCandidateMoteId: number
  anchorReattachCandidateScore: number
  anchorReattachCandidateAge: number
  anchorReattachCandidatePoint: THREE.Vector3
  anchorReattachAssistDirection: THREE.Vector3
  anchorReattachRejectedCandidateMoteId: number
  anchorReattachRejectedCandidateScore: number
  anchorReattachRejectedCandidateReason: ReattachRejectReason
  anchorReattachAssistStrength: number
  anchorReattachCatchPulse: number
  anchorReattachCatchCount: number
  anchorReattachLastCatchAt: number
  anchorReattachLastCatchTargetId: number
  anchorReattachLastCatchPileIndex: number
  hoseHookStrength: number
  swingTension: number
  swingEnergy: number
  bodyControl: number
  hoseWildness: number
  hoseContactSettle: number
  tetherRestLength: number
  tetherStrain: number
  tetherRelease: number
  suctionReadiness: number
  controllerGripQuality: number
  controllerMouthSettle: number
  suctionApproachSettle: number
  suctionApproachPull: number
  suctionApproachLocked: boolean
  controllerReleaseMomentum: number
  controllerSwingFlow: number
  controllerWinchPull: number
  controllerReattachGrace: number
  controllerAnchorLoad: number
  pivotLocked: boolean
  pivotPoint: THREE.Vector3
  pivotLockDuration: number
  pivotAngularVelocity: number
  pivotTangentialSpeed: number
  pivotRadialDistance: number
  pivotHoseStretchRatio: number
  pivotTension: number
  pivotSnapThreshold: number
  pivotSwingAssist: number
  pivotHoseVisualStretch: number
  pivotHoseThinning: number
  pivotHoseWobble: number
  pivotSnapReadiness: number
  pivotReattachCooldown: number
  pivotCandidateTargetId: number
  pivotReleaseReason: string
  gripInputDown: boolean
  gripRequestQueued: boolean
  gripReleaseQueued: boolean
  gripActive: boolean
  gripState: GripSwingState
  gripTargetPileIndex: number
  gripTargetMoteId: number
  gripContactIndex: number
  gripContactPoint: THREE.Vector3
  gripLockPoint: THREE.Vector3
  gripHoldTime: number
  gripSpinAngle: number
  gripSpinSpeed: number
  gripReleaseWindowWidth: number
  gripReleaseQuality: number
  gripReleaseReady: number
  gripReleaseCue: number
  gripReleaseReadiness: number
  gripReleasePhaseQuality: number
  gripReleaseGraceTimer: number
  gripDizzy: number
  gripMissCount: number
  gripMissPulse: number
  gripWindowWasOpen: boolean
  gripLockPulse: number
  gripEntryPull: number
  gripPhysicalCue: number
  gripPocketBiteCue: number
  gripHoseStrainCue: number
  gripMouthAnticipationCue: number
  gripSpinoutPulse: number
  gripCoughPulse: number
  gripCooldown: number
  gripMassMultiplier: number
  gripGlugBoost: number
  gripLastReleaseQuality: number
  gripReleaseReason: GripReleaseReason
  slimeColourActivity: number
  slimeColourOpal: number
  slimeColourPocket: number
  slimeColourVein: number
  slimeColourDrift: number
  slimePhysicsStretch: number
  slimePhysicsContraction: number
  slimePhysicsYield: number
  slimePhysicsMergeHeat: number
  slimePhysicsAbsorbing: number
  slimePhysicsSurfaceTension: number
  slimePhysicsPoolPressure: number
  slimePhysicsSuctionStrain: number
  slimePhysicsTendrils: number
  slimeLivingPulse: number
  slimeLivingCreep: number
  slimeLivingCongeal: number
  slimeLivingBreak: number
  slimeReferenceDrift: number
  slimeReferenceMerge: number
  slimeReferenceSplit: number
  slimeReferenceRelocation: number
  slimeContactAdhesion: number
  slimeContactFunnel: number
  slimeContactNeck: number
  slimeContactReadiness: number
  slimeContactDent: number
  slimeContactRope: number
  slimeContactFeed: number
  slimeContactSnap: number
  slimeSnapBondGrip: number
  slimeSnapBondTension: number
  slimeSnapBondStrain: number
  slimeSnapBondBreak: number
  slimeIntakeFlow: number
  slimeMassFeed: number
  slimeMaterialWake: number
  slimeMaterialDepth: number
  slimeMaterialElastic: number
  slimeMagneticPull: number
  slimeOrganicHold: number
  slimeEasySuctionAssist: number
  slimeEasySuctionPull: number
  slimeEasySuctionFeed: number
  slimeGrowthWake: number
  slimeVacuumableVisibleCount: number
  slimeVacuumableTinyCount: number
  slimeVacuumableStrandedCount: number
  slimeGameplayVisibleMass: number
  slimeVisualEffectResidueCount: number
  slimeHoseFlow: number
  slimeHoseBolus: number
  slimeHoseBulge: number
  slimeMouthThread: number
  suctionContactBridgeActive: number
  suctionContactBridgeLength: number
  suctionContactBridgeThickness: number
  suctionContactSealQuality: number
  suctionContactPatchPoint: THREE.Vector3
  mouthSurfaceContactState: 'floating' | 'touching' | 'embedded'
  mouthSurfaceDistance: number
  mouthSurfaceCompression: number
  mouthSealRing: number
  mouthFloatingWarning: number
  hoseSlimeInteractionPhase: HoseSlimeInteractionPhase
  hoseSlimeNear: number
  hoseSlimeTouch: number
  hoseSlimeSeal: number
  hoseSlimeStretch: number
  hoseSlimeGulp: number
  hoseSlimeStrain: number
  hoseSlimePop: number
  suctionContactGlugTimer: number
  suctionContactMassTransferred: number
  suctionContactCurrentMass: number
  suctionContactBridgeStrain: number
  deepEmbedState: DeepSuctionEmbedState
  deepEmbedDepth: number
  deepEmbedLockStrength: number
  deepEmbedSnapThreshold: number
  deepEmbedAnglePenalty: number
  deepEmbedTensionPenalty: number
  deepEmbedReleaseReason: DeepSuctionEmbedReleaseReason
  deepEmbedGlugCount: number
  deepEmbedMassTransferred: number
  deepEmbedPocketPulse: number
  deepEmbedRimOcclusion: number
  deepEmbedFleckBurst: number
  snapBreakPoint: THREE.Vector3
  snapBreakPulse: number
  snapBreakCycles: number
  flowMetrics: FlowMetricsState
  levelState: LevelState
  levelReadyAt: number
  levelStartedAt: number
  levelCompletedAt: number
  levelTime: number
  levelStartMass: number
  levelRemainingMass: number
  levelCompletionPercent: number
  levelMajorGlobsRemaining: number
  levelNearComplete: boolean
  levelCompletionTriggered: boolean
  levelCompletionTriggerTimer: number
  levelCompletionAnimationTime: number
  levelCompletionPhase: CompletionAnimationPhase
  levelCompletionPhaseTime: number
  levelCompletionPulse: number
  levelDiscoIntensity: number
  levelCompletionGlow: number
  levelCompletionHoseWobble: number
  levelCompletionVacuumBounce: number
  levelCompletionVacuumSpin: number
  levelCompletionSummaryReady: boolean
  levelCompletionSnapshot: FlowMetricsSessionSummary | null
  levelCompletionSummary: LevelCompletionSummary | null
  levelWaveIndex: number
  levelWaveTimeLimit: number
  levelTimeRemaining: number
  levelNoCollectionTime: number
  levelNoCollectionPressure: number
  levelSlowCleanupPressure: number
  levelSlowCleanupDeficit: number
  levelLossProgress: number
  levelVisibleGunkCoverage: number
  levelVisualClearPercent: number
  levelGunkDanger: number
  levelGunkOvergrowth: number
  levelGunkOvergrowthCleanupCredit: number
  levelSlimeFloorTakeover: number
  levelRawVisibleMass: number
  levelTideVisibleMotes: number
  levelTideActiveMotes: number
  levelSlimeGenerationRate: number
  levelSlimeGenerationAddedMass: number
  levelSlimeGenerationBudCount: number
  levelSlimeGenerationBudBudget: number
  levelSlimeGenerationActivePieces: number
  levelSlimeGenerationSuppression: number
  levelCollectedMassAtStart: number
  levelLastRawCollectedMass: number
  levelLastCollectedMass: number
  levelLastCleanupProgress: number
  levelNoGunkGraceSeconds: number
  levelOvertakePressure: number
  levelOvertakeDanger: number
  levelOvertakePulse: number
  levelDefeatTriggered: boolean
  levelDefeatedAt: number
  levelDefeatAnimationTime: number
  levelDefeatPhase: DefeatAnimationPhase
  levelDefeatGunkSpread: number
  levelDefeatVacuumSink: number
  levelShopReady: boolean
  levelCurrencyEarned: number
  levelStylePoints: number
  levelGunkValue: number
  levelCoinValue: number
  levelPileStartMasses: number[]
  levelDifficulty: LevelDifficulty
  levelClearTarget: number
  levelProgressTowardTarget: number
  levelRegenRate: number
  levelPartyProgress: number
  levelRegenPressure: number
  levelRegenBank: number
  levelRegenCursor: number
  levelRegeneratedMass: number
  levelCleanupAssist: number
  levelRegenResetPulse: number
  levelResetRequested: number
  levelResetSerial: number
  active: boolean
  pointerDown: boolean
  hoseActive: boolean
  bodyInputX: number
  bodyInputZ: number
  bodyInputActive: boolean
  lastBodyInputX: number
  lastBodyInputZ: number
  lastBodyInputActive: boolean
  movementAcceleration: number
  movementDriftFactor: number
  movementLateralSpeed: number
  movementFacingVelocityAngle: number
  movementVelocityDirection: number
  movementInputChangeBoost: number
  movementSkid: number
  movementLean: number
  movementSquash: number
  movementWobble: number
  mouseBodyInputX: number
  mouseBodyInputZ: number
  mouseBodyInputActive: boolean
  swallowCycles: number
  completionCycles: number
  fps: number
  frameMs: number
  maxFrameMs: number
}

type Mote = {
  position: THREE.Vector3
  velocity: THREE.Vector3
  home: THREE.Vector3
  anchor: THREE.Vector3
  seed: number
  size: number
  swirl: number
  palette: number
  spawnHue: number
  pigmentHue: number
  colorBloom: number
  warmth: number
  jelly: number
  floorStick: number
  mass: number
  visibleMass: number
  merge: number
  mergeTarget: number
  strain: number
  stretchMemory: number
  contraction: number
  compression: number
  mergeHeat: number
  surfaceTension: number
  poolPressure: number
  suctionLoad: number
  suctionYield: number
  suctionStrain: number
  tendril: number
  intakeNear: number
  intakeAdhesion: number
  intakeDimple: number
  intakeFunnel: number
  intakeNeck: number
  intakeFlow: number
  intakeFeed: number
  intakeRecoil: number
  glugPulse: number
  glugPhase: number
  glugCooldown: number
  glugLastAt: number
  glugCountThisAttachment: number
  glugEventStrength: number
  glugEventMass: number
  glugFailedStrength: number
  completionNearEmpty: number
  completionFinalStrand: number
  completionFinalGlug: number
  completionCleanup: number
  completionChainReady: number
  completionMetricsRecorded: number
  contactReadiness: number
  contactLipSeal: number
  contactCompression: number
  contactSealRing: number
  contactDent: number
  contactTongue: number
  contactRope: number
  contactFeed: number
  contactSnap: number
  contactResistance: number
  mouthContactConnected: number
  flowBridge: number
  flowBridgeLength: number
  flowBridgeThickness: number
  flowBridgePulse: number
  flowBridgeSurge: number
  flowBridgeStrain: number
  flowBridgeBreak: number
  sealQuality: number
  sealLeak: number
  attachmentMassTransferred: number
  deepEmbedState: DeepSuctionEmbedState
  deepEmbedDepth: number
  deepEmbedAge: number
  deepEmbedLockStrength: number
  deepEmbedSnapThreshold: number
  deepEmbedAnglePenalty: number
  deepEmbedTensionPenalty: number
  deepEmbedReleaseReason: DeepSuctionEmbedReleaseReason
  deepEmbedGlugCount: number
  deepEmbedMassTransferred: number
  deepEmbedPocketPulse: number
  deepEmbedDimple: number
  deepEmbedRimOcclusion: number
  deepEmbedHoseWobble: number
  deepEmbedPopPulse: number
  deepEmbedFleckBurst: number
  snapBondGrip: number
  snapBondTension: number
  snapBondStrain: number
  snapBondUnstable: number
  snapBondBreak: number
  snapBondSnap: number
  snapBondRecoil: number
  snapBondCooldown: number
  mouthMagnetism: number
  rimGrip: number
  organicHold: number
  slurpPressure: number
  easySuctionAssist: number
  easySuctionPull: number
  easySuctionFeed: number
  growthWake: number
  growthEnergy: number
  growthCooldown: number
  growthTarget: number
  generationPulse: number
  materialWake: number
  waxDepth: number
  seamAssimilation: number
  elasticMemory: number
  strandTension: number
  reemergeCharge: number
  livingPulse: number
  livingCreep: number
  livingCongeal: number
  livingBreak: number
  livingFlow: number
  edgeWobble: number
  tearEnergy: number
  tearCooldown: number
  absorb: number
  absorbTarget: number
  stuckResidueAge: number
  levelCleared: number
  pileIndex: number
  popAge: number
  popDuration: number
  coagulate: number
  settled: number
  mound: number
  latched: number
  latchAge: number
  slurp: number
  sealPoint: THREE.Vector3
}

type SlimePile = {
  baseCenter: THREE.Vector3
  center: THREE.Vector3
  targetCenter: THREE.Vector3
  targetMass: number
  mass: number
  pulse: number
  targetChroma: number
  chroma: number
  absorbedMass: number
  livingPulse: number
  livingCreep: number
  livingCongeal: number
  livingBreak: number
  referenceDrift: number
  referenceMerge: number
  referenceSplit: number
  referenceRelocation: number
  mergeGroup: string
  hue: number
  seed: number
}

type SlimeResidue = {
  position: THREE.Vector3
  color: THREE.Color
  age: number
  life: number
  size: number
  yaw: number
  seed: number
  strength: number
}

type SlimeColorRole = 'body' | 'rim' | 'cap' | 'bridge' | 'strand' | 'residue' | 'mound' | 'pileLobe' | 'anchor'
type BagFillDevPreset = 'small-glug' | 'large-glug' | 'medium-fill' | 'high-fill' | 'near-full' | 'reset'
type SlimeComboReward = {
  active: boolean
  streak: number
  level: number
  massMultiplier: number
  pulseMultiplier: number
}

declare global {
  interface Window {
    __EXPERIMENT_LAB_STATS__?: {
      mode: string
      devMode?: ProductionDevModeId
      reattachChainVariant?: ReattachChainVariant
      stretchSnapPreset?: StretchSnapFeelPreset
      stretchSnapPresetValues?: StretchSnapPresetTuning
      experimentOnly: boolean
      vacuumCloneOf: string
      vacuumPrototypeLocked: boolean
      vacuumOnly: boolean
      slimePrototypeLocked: boolean
      slimePrototypeRoute: string
	      gameplayPressure: boolean
	      suctionModel: string
	      suctionLatchAssistModel?: string
	      suctionLatchContactRadius?: number
	      suctionLatchSurfaceLockReach?: number
	      suctionLatchStickyThreshold?: number
	      suctionLatchPivotStrength?: number
	      suctionLatchEdgeVisibleFloor?: number
	      visualModel: string
      slimeVacuumInteraction: string
      allVisibleSlimeVacuumableModel?: string
      slimeVacuumableVisibleCount?: number
      slimeVacuumableTinyCount?: number
      slimeVacuumableStrandedCount?: number
      slimeGameplayVisibleMass?: number
      slimeVisualEffectResidueCount?: number
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
      vacuumMounted: boolean
      testMoteCount: number
      testMoteStyle: string
      mergeModel: string
      slimeMaterialModel: string
      slimeColorModel: string
      vehiclePhysicsModel: string
      slimePhysicsModel: string
      bagRewardModel?: string
      flowMetricsModel?: string
      completionPayoffModel?: string
      levelBackgroundModel?: string
      dpr: number
      slimeSealStrength: number
      slimeSealAge: number
      suctionState?: StickySuctionState
      stretchSnapState?: StretchSnapGrappleState
      stretchSnapStateAge?: number
      stretchSnapTensionJuice?: number
      stretchSnapCameraImpulse?: number
      stretchSnapAudioCue?: StretchSnapSoundEvent | 'none'
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
      anchorReleaseReason?: StickySuctionReleaseReason
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
      anchorLatchInfluence?: number
      anchorLatchPivotActive?: boolean
      anchorLatchTurnForce?: number
      anchorLatchTangentPreserve?: number
      anchorLatchRadialDamping?: number
      anchorLatchAngularVelocity?: number
      anchorLatchDirection?: { x: number; y: number; z: number }
      anchorLatchOffAxis?: number
      anchorLatchRedirectStrength?: number
      anchorLatchPivotKick?: number
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
      anchorReattachRejectedCandidateReason?: ReattachRejectReason
      anchorReattachAssistRadius?: number
      anchorReattachAssistAngle?: number
      anchorReattachAssistStrength?: number
      anchorReattachCatchPulse?: number
      anchorReattachCatchCount?: number
      anchorReattachLastCatchTargetId?: number
      anchorReattachLastCatchPileIndex?: number
      anchorReleaseTargetPileIndex?: number
      hoseHookStrength: number
      hoseHookOffset?: { x: number; y: number; z: number }
      hoseHookVelocity?: { x: number; y: number; z: number }
      hoseHookVelocityMagnitude?: number
      hoseContactSettle?: number
      swingTension: number
      bodyControl: number
      hoseWildness: number
      tetherRestLength: number
      tetherStrain: number
      tetherRelease: number
      suctionReadiness: number
      suctionApproachSettle?: number
      suctionApproachPull?: number
      suctionApproachLocked?: boolean
		      bodySpeed?: number
		      bodyAcceleration?: number
		      bodyDriftFactor?: number
		      bodyLateralSpeed?: number
		      bodyFacingVelocityAngle?: number
		      bodyVelocityDirection?: number
		      bodyYaw?: number
		      bodyPosition?: { x: number; y: number; z: number }
		      bodyVelocity?: { x: number; y: number; z: number }
		      baseVelocity?: { x: number; y: number; z: number }
		      playerMovementForce?: { x: number; y: number; z: number }
		      suctionForce?: { x: number; y: number; z: number }
		      snapImpulse?: { x: number; y: number; z: number }
		      externalForces?: { x: number; y: number; z: number }
		      movementModel?: string
		      mouthPosition?: { x: number; y: number; z: number }
		      slimeHookPoint?: { x: number; y: number; z: number }
		      mouthHookDistance?: number
		      mouthForwardToHookAlignment?: number
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
		      bodyForward?: { x: number; y: number; z: number }
	      mouthForward?: { x: number; y: number; z: number }
      controlModel?: string
      bodyInputActive?: boolean
      bodyInput?: { x: number; z: number }
      mouseBodyInputActive?: boolean
      mouseBodyInput?: { x: number; z: number }
      hoseActive?: boolean
      hoseBlowModel?: string
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
      hoseAimReach?: number
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
      hoseBodyForwardClearance?: number
      hoseBodySideClearance?: number
      hoseBodyPlanarClearance?: number
      hoseBodyIntersectionRisk?: number
      hoseAimReachLimits?: {
        min: number
        idle: number
        max: number
        reachOffsetForward: number
        reachRadius: number
        reachMinDistance: number
        reachMaxDistance: number
        reachSideLimit: number
        reachBackwardLimit: number
        bodyUnlatchMinForward: number
        bodyUnlatchMinDistance: number
        bodyUnlatchSideClearance: number
        visualBaseLength: number
        elasticRestLength: number
        elasticMaxStretch: number
      }
      rightClickGripEnabled?: boolean
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
      gripLockPulse?: number
      gripEntryPull?: number
      gripPhysicalCue?: number
      gripPocketBiteCue?: number
      gripHoseStrainCue?: number
      gripMouthAnticipationCue?: number
      gripSpinoutPulse?: number
      gripMassMultiplier?: number
      gripGlugBoost?: number
      gripLastReleaseQuality?: number
      gripReleaseReason?: string
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
	      embedState?: DeepSuctionEmbedState
	      embedDepth?: number
	      embedLockStrength?: number
	      embedSnapThreshold?: number
	      embedAnglePenalty?: number
	      embedTensionPenalty?: number
	      embedReleaseReason?: DeepSuctionEmbedReleaseReason
	      embedGlugCount?: number
	      embedMassTransferred?: number
	      embedPocketPulse?: number
	      embedRimOcclusion?: number
	      embedFleckBurst?: number
	      glugPulse?: number
      glugMassFlow?: number
      glugCycles?: number
      completionCycles?: number
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
      flowMetrics?: FlowMetricsDebugSnapshot
      flowSummary?: FlowMetricsSessionSummary
      levelModel?: string
      levelState?: LevelState
      slimeMassStart?: number
      slimeMassRemaining?: number
      completionPercent?: number
      majorGlobsRemaining?: number
      nearComplete?: boolean
      completionTriggered?: boolean
      completionAnimationPhase?: CompletionAnimationPhase
      completionAnimationTime?: number
      timeInLevel?: number
      levelCompletionSummary?: LevelCompletionSummary | null
      levelCompletionSnapshot?: FlowMetricsSessionSummary | null
      levelDifficulty?: LevelDifficulty
      levelClearTarget?: number
      levelWaveIndex?: number
      levelWaveTimeLimit?: number
      levelWaveExhausted?: boolean
      levelWaveExhaustionProgress?: number
      levelWaveGenerationMultiplier?: number
      levelCanCompleteAfterWave?: boolean
      levelTimeRemaining?: number
      levelNoCollectionTime?: number
      levelNoCollectionPressure?: number
      levelSlowCleanupPressure?: number
      levelSlowCleanupDeficit?: number
      levelLossProgress?: number
      levelVisibleGunkCoverage?: number
      levelVisualClearPercent?: number
      levelGunkDanger?: number
      levelGunkDangerBaseline?: number
      levelGunkMeterBalance?: number
      levelGunkOvergrowth?: number
      levelGunkOvergrowthCleanupCredit?: number
      levelLinearGunkCoverageTarget?: number
      levelSlimeFloorTakeover?: number
      levelRawVisibleMass?: number
      levelTideVisibleMotes?: number
      levelTideActiveMotes?: number
      levelSlimeGenerationModel?: string
      levelSlimeGenerationRate?: number
      levelSlimeGenerationAddedMass?: number
      levelSlimeGenerationBudCount?: number
      levelSlimeGenerationActivePieces?: number
      levelSlimeGenerationSuppression?: number
      levelCollectedMassAtStart?: number
      levelNoGunkGraceSeconds?: number
      levelOvertakePressure?: number
      levelOvertakeDanger?: number
      levelDefeatTriggered?: boolean
      levelDefeatPhase?: DefeatAnimationPhase
      levelDefeatGunkSpread?: number
      levelDefeatVacuumSink?: number
      defeatFinaleModel?: string
      levelShopReady?: boolean
      levelCurrencyEarned?: number
      levelStylePoints?: number
      levelGunkValue?: number
      levelCoinValue?: number
      levelProgressTowardTarget?: number
      levelPlayerCleanupActive?: boolean
      levelRegenRate?: number
      levelPartyTarget?: number
      levelPartyProgress?: number
      levelPartySync?: number
      levelProgressLighting?: number
      levelBackgroundProgress?: number
      levelBackgroundThrob?: number
      levelBackgroundColor?: string
      levelDiscoIntensity?: number
      levelCompletionGlow?: number
      levelCompletionPulse?: number
      levelRegenPressure?: number
      levelRegeneratedMass?: number
      levelRegenBank?: number
      levelCleanupAssist?: number
      levelRegenResetPulse?: number
      animationModel?: string
      animation?: {
        anticipation: number
        stretch: number
        slurp: number
        glug: number
        slide: number
        snap: number
        recoil: number
        bag: number
        completion: number
        mouthTug: number
        bodyJolt: number
        strandPinch: number
      }
      completion?: {
        nearEmpty: number
        finalStrand: number
        finalGlug: number
        cleanup: number
        chainReady: number
      }
      slimeColour?: {
        activity: number
        opal: number
        pocket: number
        vein: number
        drift: number
      }
      slimePhysics?: {
        avgStretch: number
        avgContraction: number
        avgSuctionYield: number
        avgMergeHeat: number
        absorbingFragments: number
      avgSurfaceTension?: number
      avgPoolPressure?: number
      avgSuctionStrain?: number
      avgTendrils?: number
      avgLivingPulse?: number
      avgLivingCreep?: number
      avgLivingCongeal?: number
      avgLivingBreak?: number
      avgReferenceDrift?: number
      avgReferenceMerge?: number
      avgReferenceSplit?: number
      avgReferenceRelocation?: number
      avgContactAdhesion?: number
        avgContactFunnel?: number
        avgContactNeck?: number
        avgContactReadiness?: number
        avgContactDent?: number
        avgContactRope?: number
        avgContactFeed?: number
        avgContactSnap?: number
        avgSnapBondGrip?: number
        avgSnapBondTension?: number
        avgSnapBondStrain?: number
        avgSnapBondBreak?: number
        avgIntakeFlow?: number
        avgMassFeed?: number
        avgMaterialWake?: number
        avgMaterialDepth?: number
        avgMaterialElastic?: number
        avgMagneticPull?: number
        avgOrganicHold?: number
        avgEasySuctionAssist?: number
        avgEasySuctionPull?: number
        avgEasySuctionFeed?: number
        avgGrowthWake?: number
        avgHoseFlow?: number
        avgHoseBolus?: number
        avgCompletionNearEmpty?: number
        avgCompletionFinalStrand?: number
        avgCompletionFinalGlug?: number
        avgCompletionCleanup?: number
      }
      controller?: {
        gripQuality: number
        mouthSettle: number
        releaseMomentum: number
        swingFlow?: number
        winchPull?: number
        reattachGrace?: number
        anchorLoad?: number
      }
      techniques: string[]
      perf?: {
        fps: number
        frameMs: number
        maxFrameMs: number
      }
    }
    __EXPERIMENT_LAB_BAG_FILL_DEV__?: (preset: BagFillDevPreset) => void
    __EXPERIMENT_LAB_COMBO_DEV__?: {
      hit: (count?: number) => number
      burst: (count?: number) => number
    }
    __EXPERIMENT_LAB_LEVEL_DEV__?: {
      reset: () => void
      complete: () => void
      defeat: () => void
      shop: () => void
      survive: () => void
      idleLoss: (seconds?: number) => number
      overtake: (amount?: number) => number
      difficulty: (difficulty: LevelDifficulty) => void
      level: (level: 1 | 2 | 3) => LevelDifficulty
    }
    __EXPERIMENT_LAB_LEVEL_MASS_DEV__?: {
      cleanup: (completionPercent: number) => number | null
      restore: () => void
    }
    __EXPERIMENT_LAB_SUCTION_PRESET_DEV__?: (preset: string) => StretchSnapFeelPreset | null
    __EXPERIMENT_LAB_FLOW_SUMMARY__?: FlowMetricsSessionSummary
  }
}

const VACUUM_DPR = 0.65
const MOTE_COUNT = 620
const ARENA_RADIUS = PRODUCTION_TUNING.arena.radius
const ARENA_PLAYABLE_RADIUS = ARENA_RADIUS - PRODUCTION_TUNING.arena.playablePadding
const ARENA_RESPAWN_RADIUS = ARENA_RADIUS + PRODUCTION_TUNING.arena.respawnPadding
const RIBBON_COUNT = 16
const FLOW_BEAD_COUNT = 12
const COMIC_FLECK_COUNT = 12
const COMIC_SLASH_COUNT = 7
const COMIC_DOT_COUNT = 5
const TRUNK_BAND_COUNT = 12
const TRUNK_CURVE_POINT_COUNT = 16
const TRUNK_TUBE_SEGMENTS = 56
const TRUNK_RADIAL_SEGMENTS = 10
const CONTROLLER_PHYSICS = {
  bodyMass: PRODUCTION_TUNING.movement.bodyMass,
  freeDrive: PRODUCTION_TUNING.movement.steeringForce,
  hookedDrive: 4.6,
  tetherSpring: PRODUCTION_TUNING.hose.hoseElasticity,
  tetherDamping: 3.1,
  swingDrive: PRODUCTION_TUNING.movement.swingAssistStrength,
  sealHold: PRODUCTION_TUNING.suction.sealStrengthBase,
  releaseDampingRelief: 1.45,
} as const
const SNAP_BOND_PHYSICS = {
  gripReinforce: 0.26,
  slurpBrake: 0.46,
  breakThreshold: PRODUCTION_TUNING.hose.tensionSnapThreshold,
  releaseImpulse: PRODUCTION_TUNING.hose.snapImpulseScale,
  slimeRecoil: 1.18,
  reattachCooldown: PRODUCTION_TUNING.hose.postSnapReattachDelay,
} as const
const GLUG_RHYTHM = {
  suctionBoost: 0.42,
  massPulse: 0.82,
  mouthThump: 0.2,
  bagFillPerPulse: 0.034,
  bagFillPerFlow: 0.018,
  bagPressure: 0.44,
  cooldown: PRODUCTION_TUNING.glug.gulpPulseRate,
} as const
const EASY_SUCTION_TUNING = {
  visibleFloor: 0.08,
  latchThreshold: 0.11,
  brushSealThreshold: 0.035,
  magneticPullForce: 1.18,
  pressureBoost: 0.56,
  feedAcceleration: 0.72,
  growthWakeMass: 0.2,
} as const
const BAG_REWARD_TUNING = {
  flowMassScale: 0.26,
  glugMassScale: 0.42,
  swallowMassScale: 0.86,
  pressurePulse: PRODUCTION_TUNING.bag.bagPulseStrength,
  beautyPulse: 0.88,
  fullPulse: PRODUCTION_TUNING.bag.bagFullPulseStrength,
  wobble: PRODUCTION_TUNING.bag.bagWobbleStrength,
} as const
const FIRST_LEVEL_TUNING = PRODUCTION_TUNING.level
const LEVEL_TIDE_BASELINE_MOTE_COUNT = Math.max(
  1,
  Math.min(MOTE_COUNT - 1, Math.round(MOTE_COUNT * FIRST_LEVEL_TUNING.gunkTideBaselineMoteRatio)),
)
const LEVEL_TIDE_OVERGROWTH_MOTE_COUNT = Math.max(1, MOTE_COUNT - LEVEL_TIDE_BASELINE_MOTE_COUNT)
const LEVEL_DIFFICULTIES: LevelDifficulty[] = ['easy', 'normal', 'hard']
const LEVEL_DIFFICULTY_LABELS: Record<LevelDifficulty, string> = {
  easy: 'Level 1',
  normal: 'Level 2',
  hard: 'Level 3',
}
const SLIME_MATERIAL_POLISH = {
  wakeToColour: 0.32,
  wakeToStretch: 0.18,
  waxDepthToPocket: 0.22,
  seamToMergeWidth: 0.18,
  elasticToRecoil: 0.24,
  returnBloomToSpawn: 0.46,
} as const
const SLIME_MOTE_FLOOR_Y = 0.045
const SLIME_MOTE_SHADOW_Y = 0.012
const SLIME_MERGE_BRIDGE_COUNT = 56
const SLIME_MERGE_DISTANCE = 0.32
const SLIME_PILE_LOBES_PER_CENTER = 8
const SLIME_TIDE_MAX_SIZE_SCALE = 0.34
const SLIME_TIDE_OVERGROWTH_BLOB_GROWTH = 1.16 * SLIME_TIDE_MAX_SIZE_SCALE
const SLIME_TIDE_BASELINE_BLOB_GROWTH = 0.32 * SLIME_TIDE_MAX_SIZE_SCALE
const SLIME_TIDE_COVERAGE_SCALE_GAIN = 3.0 * SLIME_TIDE_MAX_SIZE_SCALE
const SLIME_ACCENT_TIDE_GROWTH_LIMIT = 0.23
const SLIME_ACCENT_MAX_YAW_WOBBLE = 0.055
const SLIME_PILE_LOBE_MAX_STRETCH = 1.18
const SLIME_BODY_LOBE_MAX_STRETCH = 1.06
const SLIME_TIDE_BODY_ROUNDNESS_MAX = 0.78
const SLIME_BODY_LOBES_PER_MOTE = 3
const SLIME_BODY_LOBE_COUNT = MOTE_COUNT * SLIME_BODY_LOBES_PER_MOTE
const SLIME_RESIDUE_COUNT = 84
const SLIME_INTAKE_CHAIN_REACH = 0.92
type SlimePilePlacementKind = 'cluster' | 'lane' | 'isolated'
type SlimePilePlacement = {
  x: number
  z: number
  group: string
  kind: SlimePilePlacementKind
}
const SLIME_PILE_LAYOUT: SlimePilePlacement[] = [
  { x: -5.95, z: -2.95, group: 'west-skid', kind: 'cluster' },
  { x: -5.16, z: -2.28, group: 'west-skid', kind: 'cluster' },
  { x: -6.62, z: -2.1, group: 'west-skid', kind: 'cluster' },
  { x: -5.72, z: -3.78, group: 'west-skid', kind: 'cluster' },
  { x: -1.42, z: 5.42, group: 'north-pop', kind: 'cluster' },
  { x: -0.5, z: 6.22, group: 'north-pop', kind: 'cluster' },
  { x: 0.42, z: 5.32, group: 'north-pop', kind: 'cluster' },
  { x: -0.28, z: 4.42, group: 'north-pop', kind: 'cluster' },
  { x: 5.12, z: 1.46, group: 'east-chain', kind: 'cluster' },
  { x: 5.94, z: 2.22, group: 'east-chain', kind: 'cluster' },
  { x: 6.64, z: 1.02, group: 'east-chain', kind: 'cluster' },
  { x: 4.58, z: 2.72, group: 'east-chain', kind: 'cluster' },
  { x: 2.42, z: -5.08, group: 'south-recatch', kind: 'cluster' },
  { x: 3.5, z: -5.76, group: 'south-recatch', kind: 'cluster' },
  { x: 4.54, z: -4.74, group: 'south-recatch', kind: 'cluster' },
  { x: -2.48, z: 0.52, group: 'middle-lane', kind: 'lane' },
  { x: -0.15, z: -1.18, group: 'middle-lane', kind: 'lane' },
  { x: 2.1, z: 0.18, group: 'middle-lane', kind: 'lane' },
  { x: 3.82, z: -1.72, group: 'middle-lane', kind: 'lane' },
  { x: -7.26, z: 1.84, group: 'west-lone', kind: 'isolated' },
  { x: 0.88, z: 7.28, group: 'north-lone', kind: 'isolated' },
  { x: 7.34, z: -2.72, group: 'east-lone', kind: 'isolated' },
  { x: -1.62, z: -6.86, group: 'south-lone', kind: 'isolated' },
  { x: 0.28, z: 1.42, group: 'center-pocket', kind: 'isolated' },
]
const SLIME_PILE_CENTERS = SLIME_PILE_LAYOUT.map(({ x, z }) => ({ x, z }))
const DEV_MODE_PILE_CENTERS: Partial<Record<ProductionDevModeId, typeof SLIME_PILE_CENTERS>> = {
  'movement-lab': [],
  'suction-contact': [
    { x: -0.18, z: 1.02 },
  ],
  'glug-rhythm': [
    { x: -0.12, z: 1.02 },
    { x: 0.18, z: 1.2 },
    { x: -0.42, z: 1.22 },
    { x: 0.42, z: 0.9 },
    { x: -0.72, z: 0.86 },
    { x: 0.76, z: 1.22 },
    { x: -0.08, z: 0.52 },
  ],
  'deep-embed': [
    { x: -0.1, z: 1.02 },
    { x: 0.18, z: 1.12 },
    { x: -0.36, z: 1.18 },
    { x: 0.42, z: 0.84 },
    { x: -0.68, z: 0.78 },
    { x: 0.72, z: 1.18 },
    { x: -0.05, z: 0.42 },
  ],
  'pivot-swing-lab': [
    { x: -0.28, z: 0.82 },
    { x: 1.82, z: 1.18 },
    { x: -2.12, z: 1.24 },
    { x: 2.68, z: -0.56 },
    { x: -2.82, z: -0.72 },
    { x: 0.58, z: -1.58 },
    { x: 3.32, z: 1.42 },
  ],
  'grip-swing-lab': [
    { x: -0.2, z: 0.72 },
    { x: 1.58, z: 1.18 },
    { x: -1.86, z: 1.24 },
    { x: 2.42, z: -0.72 },
    { x: -2.58, z: -0.84 },
    { x: 0.46, z: -1.52 },
    { x: 3.08, z: 1.46 },
  ],
  'bag-fill': [
    { x: -0.08, z: 1.0 },
    { x: 0.24, z: 1.16 },
    { x: -0.38, z: 1.16 },
    { x: 0.5, z: 0.9 },
    { x: -0.66, z: 0.86 },
    { x: 0.78, z: 1.22 },
    { x: -0.04, z: 0.48 },
  ],
  'hose-swing': [
    { x: -0.22, z: 0.88 },
    { x: 1.42, z: 1.28 },
    { x: -1.72, z: 1.16 },
    { x: 2.44, z: -0.24 },
    { x: -2.62, z: -0.32 },
    { x: 0.44, z: -1.28 },
    { x: 3.1, z: 1.52 },
  ],
  'reattach-chain': [
    { x: -0.28, z: 0.82 },
    { x: -2.18, z: -0.86 },
  ],
  'multi-glob-chain': [
    { x: -3.18, z: 0.88 },
    { x: -1.78, z: -0.74 },
    { x: -0.22, z: 1.14 },
    { x: 1.42, z: -0.62 },
    { x: 2.92, z: 1.08 },
    { x: 3.58, z: -1.42 },
    { x: -3.68, z: -1.22 },
  ],
}
const REATTACH_CHAIN_VARIANT_CENTERS: Record<ReattachChainVariant, Array<{ x: number; z: number }>> = {
  easy: [
    { x: -0.26, z: 0.82 },
    { x: -1.72, z: -0.48 },
  ],
  medium: [
    { x: -0.28, z: 0.82 },
    { x: -2.18, z: -0.86 },
  ],
  hard: [
    { x: -0.24, z: 0.86 },
    { x: -2.78, z: -1.16 },
  ],
}
const MAX_SLIME_PILE_CENTER_COUNT = Math.max(
  SLIME_PILE_CENTERS.length,
  ...Object.values(DEV_MODE_PILE_CENTERS).map((centers) => centers.length),
  ...Object.values(REATTACH_CHAIN_VARIANT_CENTERS).map((centers) => centers.length),
)
const SLIME_PILE_LOBE_COUNT = MAX_SLIME_PILE_CENTER_COUNT * SLIME_PILE_LOBES_PER_CENTER
const SLIME_PILE_CLUSTER_COUNT = new Set(
  SLIME_PILE_LAYOUT.filter((placement) => placement.kind === 'cluster').map((placement) => placement.group),
).size
const SLIME_PILE_ISOLATED_COUNT = SLIME_PILE_LAYOUT.filter((placement) => placement.kind === 'isolated').length
const SLIME_PILE_REFERENCE_GROUPS = Array.from(new Set(SLIME_PILE_LAYOUT.map((placement) => placement.group)))
const STRETCH_SNAP_PRESET_ALIASES: Record<string, StretchSnapFeelPreset> = {
  chunky: 'heavySuction',
  heavy: 'heavySuction',
  chunkysuction: 'heavySuction',
  chunkyheavy: 'heavySuction',
  'chunky-heavy': 'heavySuction',
  heavysuction: 'heavySuction',
  'heavy-suction': 'heavySuction',
  rubber: 'rubberSnap',
  band: 'rubberSnap',
  snap: 'rubberSnap',
  rubberband: 'rubberSnap',
  'rubber-band': 'rubberSnap',
  rubbersnap: 'rubberSnap',
  'rubber-snap': 'rubberSnap',
  arcade: 'arcadeTug',
  tug: 'arcadeTug',
  grapple: 'arcadeTug',
  arcadegrapple: 'arcadeTug',
  'arcade-grapple': 'arcadeTug',
  arcadetug: 'arcadeTug',
  'arcade-tug': 'arcadeTug',
}
const SLIME_REFERENCE_HUES = [0.49, 0.56, 0.64, 0.77, 0.88, 0.04, 0.13, 0.31]

function getSlimeReferenceMergeGroup(devMode: ProductionDevModeId, index: number, pileCount: number) {
  if (getModePileCenters(devMode) === SLIME_PILE_CENTERS) {
    return SLIME_PILE_LAYOUT[index]?.group ?? `full-${index % Math.max(1, SLIME_PILE_REFERENCE_GROUPS.length)}`
  }
  if (pileCount <= 3) return 'dev-core'
  const groupCount = Math.max(2, Math.min(4, Math.ceil(pileCount / 2)))
  return `dev-${index % groupCount}`
}

const SLIME_COLOUR_TUNING = {
  idleDriftRate: 0.0044,
  activeDriftRate: 0.0115,
  minSaturation: 0.62,
  maxSaturation: 1,
  baseSaturation: 0.76,
  minLightness: 0.46,
  maxLightness: 0.84,
  baseLightness: 0.61,
  opalMix: 0.34,
  pocketDepth: 0.1,
  warmHighlightHue: 0.128,
  coolShadowHue: 0.63,
}
const SLIME_COLOR_ROLES: Record<SlimeColorRole, {
  hue: number
  saturation: number
  lightness: number
  paletteMix: number
  warmth: number
}> = {
  body: { hue: 0, saturation: 0.08, lightness: 0, paletteMix: 0.2, warmth: 0.02 },
  rim: { hue: 0.052, saturation: 0.12, lightness: 0.105, paletteMix: 0.28, warmth: 0.1 },
  cap: { hue: 0.135, saturation: 0.14, lightness: 0.025, paletteMix: 0.44, warmth: 0.16 },
  bridge: { hue: 0.028, saturation: 0.1, lightness: 0.035, paletteMix: 0.3, warmth: 0.08 },
  strand: { hue: 0.092, saturation: 0.12, lightness: 0.11, paletteMix: 0.42, warmth: 0.22 },
  residue: { hue: 0.018, saturation: 0.1, lightness: 0.085, paletteMix: 0.26, warmth: 0.14 },
  mound: { hue: -0.022, saturation: 0.07, lightness: 0.025, paletteMix: 0.22, warmth: 0.02 },
  pileLobe: { hue: 0.112, saturation: 0.12, lightness: 0.045, paletteMix: 0.34, warmth: 0.1 },
  anchor: { hue: 0.034, saturation: 0.08, lightness: 0.03, paletteMix: 0.24, warmth: 0.04 },
}
const tempObject = new THREE.Object3D()
const rightVector = new THREE.Vector3()
const sourceVector = new THREE.Vector3()
const deltaVector = new THREE.Vector3()
const mouthVector = new THREE.Vector3()
const sealVector = new THREE.Vector3()
const sealErrorVector = new THREE.Vector3()
const sealDirectionVector = new THREE.Vector3()
const hoseHookTargetVector = new THREE.Vector3()
const hoseReachForwardVector = new THREE.Vector3()
const hoseReachRightVector = new THREE.Vector3()
const hoseReachCursorVector = new THREE.Vector3()
const hoseReachBodyVector = new THREE.Vector3()
const hoseReachDesiredVector = new THREE.Vector3()
const hoseReachDeltaVector = new THREE.Vector3()
const hoseReachPreviousMouthVector = new THREE.Vector3()
const hoseBodySafetyVector = new THREE.Vector3()
const hoseBodySafetyForwardVector = new THREE.Vector3()
const hoseBodySafetyRightVector = new THREE.Vector3()
const bodyHookVector = new THREE.Vector3()
const swingTangentVector = new THREE.Vector3()
const cruiseVector = new THREE.Vector3()
const candidateDirectionVector = new THREE.Vector3()
const candidateBodyVector = new THREE.Vector3()
const zeroVector = new THREE.Vector3()
const arcadeInputVector = new THREE.Vector3()
const arcadeVelocityVector = new THREE.Vector3()
const arcadeLateralVector = new THREE.Vector3()
const arcadeDesiredVector = new THREE.Vector3()
const frameStartVelocityVector = new THREE.Vector3()
const frameStartPositionVector = new THREE.Vector3()
const slurpTargetVector = new THREE.Vector3()
const pointerHookVector = new THREE.Vector3()
const slimeSlideTargetVector = new THREE.Vector3()
const slimeSurfaceVector = new THREE.Vector3()
const slimeSlideTangentVector = new THREE.Vector3()
const slimeSnapbackVector = new THREE.Vector3()
const snapReleaseVector = new THREE.Vector3()
const snapTangentVector = new THREE.Vector3()
const latchTangentVector = new THREE.Vector3()
const latchPostTangentVector = new THREE.Vector3()
const latchPivotDirectionVector = new THREE.Vector3()
const latchPivotVelocityVector = new THREE.Vector3()
const mouthSlurpPointVector = new THREE.Vector3()
const intakePatchVector = new THREE.Vector3()
const intakeFunnelVector = new THREE.Vector3()
const intakeChainVector = new THREE.Vector3()
const hoseLockedTipLocalVector = new THREE.Vector3()
const hoseLockedTipDeltaVector = new THREE.Vector3()
const hoseLockedTipRightVector = new THREE.Vector3()
const hoseReachTipLocalVector = new THREE.Vector3()
const hoseCartoonBendMidVector = new THREE.Vector3()
const bridgeMidVector = new THREE.Vector3()
const pileVector = new THREE.Vector3()
const tideMoteTargetVector = new THREE.Vector3()
const slimeBudTargetVector = new THREE.Vector3()
const slimeBudDirectionVector = new THREE.Vector3()
const pileLeanVector = new THREE.Vector3()
const slurpStrandVector = new THREE.Vector3()
const slurpStrandMidVector = new THREE.Vector3()
const strandAxis = new THREE.Vector3(0, 1, 0)
const trunkAxis = new THREE.Vector3(0, 0, 1)
const trunkMouthAxis = new THREE.Vector3(0, 0, -1)
const BAG_WAVE_PALETTE = ['#78ffe2', '#ff79d8', '#ffe36d', '#9ec8ff', '#b28cff', '#7df59a', '#ff9f7a', '#f3f0ff']
const FLOW_BEAD_PALETTE = ['#fff2a3', '#6bd8ff', '#f47bdc', '#aaf6c8']
const DISCO_BEAM_PALETTE = ['#fff0a8', '#ff9ed8', '#8fe7dd', '#b9a6ff', '#ffbd86', '#9eea8f', '#86caff', '#ffd2a4']
const PROGRESS_BACKGROUND_BASE = new THREE.Color('#ffd8f2')
const PROGRESS_BACKGROUND_SOFT = new THREE.Color('#fff7d1')
const PROGRESS_BACKGROUND_FLASH = new THREE.Color('#ffe98e')
const PROGRESS_BACKGROUND_REGEN = new THREE.Color('#d9c6ff')
const PROGRESS_BACKGROUND_PALETTE = [
  new THREE.Color('#ffd8f2'),
  new THREE.Color('#c9f7ff'),
  new THREE.Color('#fff1a8'),
  new THREE.Color('#ffc9ee'),
  new THREE.Color('#d8c8ff'),
  new THREE.Color('#c2ffd8'),
]
const trunkProfileCenter = new THREE.Vector3()
const trunkProfileVertex = new THREE.Vector3()
const slimeBodyColor = new THREE.Color()
const slimeRimColor = new THREE.Color()
const slimeCapColor = new THREE.Color()
const slimeAccentColor = new THREE.Color()
const slimeBridgeColor = new THREE.Color()
const slimeMoundColor = new THREE.Color()
const slimeResidueColor = new THREE.Color()
const slimeWarmColor = new THREE.Color('#f8e6b0')
const slimePaletteColor = new THREE.Color()
const slimePocketColor = new THREE.Color()
const slimeGlowColor = new THREE.Color()
const bagIntakeColor = new THREE.Color()
const bagDevSmallColor = new THREE.Color('#78ffe2')
const bagDevLargeColor = new THREE.Color('#ff79d8')
const bagComboColor = new THREE.Color('#ffe36d')
const bagBandColorA = new THREE.Color()
const bagBandColorB = new THREE.Color()
const bagBandColorC = new THREE.Color()
const bagBandGold = new THREE.Color('#ffe36d')
const bagBandCyan = new THREE.Color('#86f7ff')
const progressBackgroundStatsColor = new THREE.Color()

function easeOutBack(value: number) {
  const c1 = 1.7
  const c3 = c1 + 1
  return 1 + c3 * (value - 1) ** 3 + c1 * (value - 1) ** 2
}

function makeBurstGeometry(spikes: number, innerRadius: number, outerRadius: number) {
  const shape = new THREE.Shape()
  const steps = spikes * 2
  for (let index = 0; index < steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2 - Math.PI / 2
    const wobble = 1 + Math.sin(index * 2.17) * 0.055
    const radius = (index % 2 === 0 ? outerRadius : innerRadius) * wobble
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}

function DetailRivet({
  position,
  scale = 0.018,
  color = PALETTE.bone,
}: {
  position: [number, number, number]
  scale?: number
  color?: string
}) {
  return (
    <ExperimentOutlineMesh
      position={position}
      scale={[scale, scale, scale]}
      outlineWidth={0.004}
      geometry={<sphereGeometry args={[1, 8, 6]} />}
      material={toon(color)}
    />
  )
}

function clampWorld(target: THREE.Vector3) {
  const distance = Math.hypot(target.x, target.z)
  if (distance > ARENA_PLAYABLE_RADIUS && distance > 0.0001) {
    const scale = ARENA_PLAYABLE_RADIUS / distance
    target.x *= scale
    target.z *= scale
  }
  target.y = 0.62
  return target
}

function clampSlimeFloorPoint(target: THREE.Vector3) {
  const distance = Math.hypot(target.x, target.z)
  if (distance > ARENA_PLAYABLE_RADIUS && distance > 0.0001) {
    const scale = ARENA_PLAYABLE_RADIUS / distance
    target.x *= scale
    target.z *= scale
  }
  target.y = SLIME_MOTE_FLOOR_Y
  return target
}

function isOutsideArena(position: THREE.Vector3, boundaryRadius: number = ARENA_RADIUS) {
  return Math.hypot(position.x, position.z) > boundaryRadius
}

function dampAngle(current: number, target: number, lambda: number, dt: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + delta * (1 - Math.exp(-lambda * dt))
}

function clampAngleAround(value: number, center: number, limit: number) {
  const delta = Math.atan2(Math.sin(value - center), Math.cos(value - center))
  return center + clampValue(delta, -limit, limit)
}

function yawForRenderedVacuumForward(direction: THREE.Vector3) {
  return Math.atan2(-direction.x, -direction.z)
}

function setRenderedVacuumForwardFromYaw(target: THREE.Vector3, yaw: number) {
  target.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize()
}

function getSafeHoseReachForward(state: VacuumRuntime, target: THREE.Vector3) {
  target.copy(state.forward)
  target.y = 0
  if (target.lengthSq() < 0.0001) {
    setRenderedVacuumForwardFromYaw(target, state.yaw)
    target.y = 0
  }
  if (target.lengthSq() < 0.0001) target.set(0, 0, 1)
  return target.normalize()
}

function resetHoseCursorReachState(state: VacuumRuntime) {
  const movement = PRODUCTION_TUNING.movement
  getSafeHoseReachForward(state, hoseReachForwardVector)
  hoseReachRightVector.set(-hoseReachForwardVector.z, 0, hoseReachForwardVector.x)
  if (hoseReachRightVector.lengthSq() < 0.0001) hoseReachRightVector.set(1, 0, 0)
  hoseReachRightVector.normalize()
  const idleDistance = clampValue(
    movement.hoseAimBodyIdleReach,
    movement.hoseReachMinDistance,
    movement.hoseReachMaxDistance,
  )
  state.cursorWorldPosition.copy(state.position).addScaledVector(hoseReachForwardVector, idleDistance)
  state.cursorWorldPosition.y = state.position.y
  state.hoseReachCenter.copy(state.position).addScaledVector(hoseReachForwardVector, movement.hoseReachOffsetForward)
  state.hoseReachCenter.y = state.position.y
  state.desiredHoseMouthPosition.copy(state.position).addScaledVector(hoseReachForwardVector, idleDistance)
  state.desiredHoseMouthPosition.y = state.position.y + 0.1
  state.actualHoseMouthPosition.copy(state.desiredHoseMouthPosition)
  state.hoseMouthVelocity.set(0, 0, 0)
  state.hoseTarget.copy(state.desiredHoseMouthPosition)
  state.hoseAimPoint.copy(state.actualHoseMouthPosition)
  state.hoseAimReach = idleDistance
  state.hoseAimLag = 0
  state.hoseAimJitter = 0
  state.hoseAimResponsiveness = movement.hoseAimIdleResponsiveness
  state.hoseAimStability = 1
  state.hoseReachClamped = false
  state.hoseReachExtension = smooth01(
    (idleDistance - movement.hoseReachMinDistance)
      / Math.max(0.001, movement.hoseReachMaxDistance - movement.hoseReachMinDistance),
  )
  state.hoseReachForwardAmount = idleDistance
  state.hoseReachSideAmount = 0
  state.hoseReachTargetClampedDistance = 0
  state.hoseReachLockedToAnchor = false
  state.hoseBodyForwardClearance = idleDistance
  state.hoseBodySideClearance = 0
  state.hoseBodyPlanarClearance = idleDistance
  state.hoseBodyIntersectionRisk = 0
  state.hoseReachLocal.set(0, 0.1, -idleDistance)
  state.mouth.copy(state.actualHoseMouthPosition)
  state.mouthForward.copy(hoseReachForwardVector)
}

function updateHoseCursorReach(
  state: VacuumRuntime,
  dt: number,
  hoseIntentActive: boolean,
) {
  const movement = PRODUCTION_TUNING.movement
  getSafeHoseReachForward(state, hoseReachForwardVector)
  hoseReachRightVector.set(-hoseReachForwardVector.z, 0, hoseReachForwardVector.x)
  if (hoseReachRightVector.lengthSq() < 0.0001) hoseReachRightVector.set(1, 0, 0)
  hoseReachRightVector.normalize()

  state.hoseReachCenter.copy(state.position).addScaledVector(hoseReachForwardVector, movement.hoseReachOffsetForward)
  state.hoseReachCenter.y = state.position.y

  const endpointLocked = state.suctionState === 'sealed' && state.sealTargetMoteId >= 0
  if (endpointLocked) {
    hoseReachPreviousMouthVector.copy(state.actualHoseMouthPosition)
    state.desiredHoseMouthPosition.copy(state.anchorWorldPosition)
    state.actualHoseMouthPosition.copy(state.anchorWorldPosition)
    state.hoseMouthVelocity.set(0, 0, 0)
    state.hoseTarget.copy(state.desiredHoseMouthPosition)
    state.hoseAimPoint.copy(state.actualHoseMouthPosition)
    state.hoseAimLag = 0
    state.hoseAimJitter = damp(
      state.hoseAimJitter,
      0,
      movement.hoseAimJitterFallDamping,
      dt,
    )
    state.hoseAimResponsiveness = movement.hoseAimContactResponsiveness
    state.hoseAimStability = 1
    state.hoseReachClamped = true
    state.hoseReachTargetClampedDistance = 0
    state.hoseReachLockedToAnchor = true
  } else {
    const cursorValid = Number.isFinite(state.cursorWorldPosition.x)
      && Number.isFinite(state.cursorWorldPosition.y)
      && Number.isFinite(state.cursorWorldPosition.z)
    if (!cursorValid) {
      state.cursorWorldPosition.copy(state.position).addScaledVector(
        hoseReachForwardVector,
        movement.hoseAimBodyIdleReach,
      )
      state.cursorWorldPosition.y = state.position.y
    }

    let bodyForwardDistance: number = movement.hoseAimBodyIdleReach
    let sideAmount: number = 0
    if (hoseIntentActive) {
      hoseReachBodyVector.copy(state.cursorWorldPosition).sub(state.position)
      hoseReachBodyVector.y = 0
      hoseReachCursorVector.copy(state.cursorWorldPosition).sub(state.hoseReachCenter)
      hoseReachCursorVector.y = 0
      bodyForwardDistance = hoseReachBodyVector.dot(hoseReachForwardVector)
      sideAmount = hoseReachCursorVector.dot(hoseReachRightVector)
    }

    const unclampedForwardDistance = bodyForwardDistance
    const minDistance = Math.max(
      movement.hoseReachMinDistance,
      movement.hoseReachOffsetForward - movement.hoseReachBackwardLimit,
    )
    const maxDistance = Math.min(
      movement.hoseReachMaxDistance,
      movement.hoseReachOffsetForward + movement.hoseReachRadius,
    )
    bodyForwardDistance = clampValue(bodyForwardDistance, minDistance, maxDistance)
    const extensionAlpha = smooth01(
      (bodyForwardDistance - minDistance) / Math.max(0.001, maxDistance - minDistance),
    )
    const sideLimit = movement.hoseReachSideLimit * (0.42 + extensionAlpha * 0.58)
    const unclampedSideAmount = sideAmount
    sideAmount = clampValue(sideAmount, -sideLimit, sideLimit)

    hoseReachDesiredVector.copy(state.position)
      .addScaledVector(hoseReachForwardVector, bodyForwardDistance)
      .addScaledVector(hoseReachRightVector, sideAmount)
    hoseReachDesiredVector.y = state.position.y + 0.1
    hoseReachDeltaVector.copy(hoseReachDesiredVector).sub(state.position)
    hoseReachDeltaVector.y = 0
    const desiredDistance = hoseReachDeltaVector.length()
    const unclampedDesiredDistance = desiredDistance
    let clampedDesiredDistance = desiredDistance
    if (desiredDistance > maxDistance || desiredDistance < minDistance) {
      const safeDistance = desiredDistance > 0.0001 ? desiredDistance : 1
      const clampedDistance = clampValue(desiredDistance, minDistance, maxDistance)
      clampedDesiredDistance = clampedDistance
      hoseReachDeltaVector.multiplyScalar(clampedDistance / safeDistance)
      hoseReachDesiredVector.copy(state.position).add(hoseReachDeltaVector)
      hoseReachDesiredVector.y = state.position.y + 0.1
      bodyForwardDistance = hoseReachDeltaVector.dot(hoseReachForwardVector)
      sideAmount = hoseReachDeltaVector.dot(hoseReachRightVector)
    }

    state.desiredHoseMouthPosition.copy(hoseReachDesiredVector)
    clampWorld(state.desiredHoseMouthPosition)
    state.desiredHoseMouthPosition.y = state.position.y + 0.1

    hoseReachPreviousMouthVector.copy(state.actualHoseMouthPosition)
    if (
      !Number.isFinite(state.actualHoseMouthPosition.x)
      || !Number.isFinite(state.actualHoseMouthPosition.y)
      || !Number.isFinite(state.actualHoseMouthPosition.z)
      || state.actualHoseMouthPosition.distanceToSquared(state.position) > 9
    ) {
      state.actualHoseMouthPosition.copy(state.desiredHoseMouthPosition)
      hoseReachPreviousMouthVector.copy(state.actualHoseMouthPosition)
    }

    hoseReachDeltaVector.copy(state.desiredHoseMouthPosition).sub(state.actualHoseMouthPosition)
    const targetDistance = hoseReachDeltaVector.length()
    const response = hoseIntentActive ? movement.hoseReachSmoothing : movement.hoseReturnSpeed
    const elasticRate = response / (1 + extensionAlpha * movement.hoseElasticLag)
    const alpha = 1 - Math.exp(-elasticRate * dt)
    const maxStep = movement.hoseMouthMaxSpeed
      * (hoseIntentActive ? 1 : 0.64)
      * (1 - extensionAlpha * 0.18)
      * dt
    if (targetDistance > 0.0001) {
      const step = Math.min(targetDistance * alpha, maxStep)
      state.actualHoseMouthPosition.addScaledVector(hoseReachDeltaVector, step / targetDistance)
    }
    clampWorld(state.actualHoseMouthPosition)
    state.actualHoseMouthPosition.y = state.position.y + 0.1
    if (dt > 0.0001) {
      state.hoseMouthVelocity.copy(state.actualHoseMouthPosition)
        .sub(hoseReachPreviousMouthVector)
        .multiplyScalar(1 / dt)
    }
    state.hoseTarget.copy(state.desiredHoseMouthPosition)
    state.hoseAimPoint.copy(state.actualHoseMouthPosition)
    state.hoseAimLag = state.actualHoseMouthPosition.distanceTo(state.desiredHoseMouthPosition)
    const aimDeadZone = movement.hoseAimDeadZone
    const hoseAimJitterTarget = state.hoseAimLag > aimDeadZone
      ? Math.min(state.hoseAimLag, movement.hoseAimStabilityLagLimit)
      : 0
    state.hoseAimJitter = damp(
      state.hoseAimJitter,
      hoseAimJitterTarget,
      hoseAimJitterTarget > state.hoseAimJitter
        ? movement.hoseAimJitterRiseDamping
        : movement.hoseAimJitterFallDamping,
      dt,
    )
    state.hoseAimResponsiveness = elasticRate
    state.hoseAimStability = 1 - smooth01(
      state.hoseAimJitter / Math.max(0.001, movement.hoseAimStabilityLagLimit),
    )
    state.hoseReachClamped = Math.abs(unclampedForwardDistance - bodyForwardDistance) > 0.01
      || Math.abs(unclampedSideAmount - sideAmount) > 0.01
      || Math.abs(unclampedDesiredDistance - clampedDesiredDistance) > 0.01
    state.hoseReachTargetClampedDistance = Math.max(
      Math.abs(unclampedForwardDistance - bodyForwardDistance),
      Math.abs(unclampedSideAmount - sideAmount),
      Math.abs(unclampedDesiredDistance - clampedDesiredDistance),
    )
    state.hoseReachLockedToAnchor = false
  }

  hoseReachBodyVector.copy(state.actualHoseMouthPosition).sub(state.position)
  hoseReachBodyVector.y = 0
  const mouthDistance = hoseReachBodyVector.length()
  if (mouthDistance > 0.0001) {
    state.hoseReachForwardAmount = hoseReachBodyVector.dot(hoseReachForwardVector)
    state.hoseReachSideAmount = hoseReachBodyVector.dot(hoseReachRightVector)
    state.mouthForward.copy(hoseReachBodyVector).multiplyScalar(1 / mouthDistance)
  } else {
    state.hoseReachForwardAmount = 0
    state.hoseReachSideAmount = 0
    state.mouthForward.copy(hoseReachForwardVector)
  }
  state.hoseAimReach = mouthDistance
  state.hoseReachExtension = smooth01(
    (mouthDistance - movement.hoseReachMinDistance)
      / Math.max(0.001, movement.hoseReachMaxDistance - movement.hoseReachMinDistance),
  )
  const localForwardAmount = state.hoseReachLockedToAnchor
    ? state.hoseReachForwardAmount
    : Math.max(movement.hoseReachMinDistance, state.hoseReachForwardAmount)
  state.hoseReachLocal.set(
    state.hoseReachSideAmount,
    0.1,
    -localForwardAmount,
  )
  state.mouth.copy(state.actualHoseMouthPosition)
}

function measureHoseBodyIntersectionRisk(
  state: VacuumRuntime,
  point: THREE.Vector3,
  writeDebug = false,
) {
  const movement = PRODUCTION_TUNING.movement
  getSafeHoseReachForward(state, hoseBodySafetyForwardVector)
  hoseBodySafetyRightVector.set(-hoseBodySafetyForwardVector.z, 0, hoseBodySafetyForwardVector.x)
  if (hoseBodySafetyRightVector.lengthSq() < 0.0001) hoseBodySafetyRightVector.set(1, 0, 0)
  hoseBodySafetyRightVector.normalize()
  hoseBodySafetyVector.copy(point).sub(state.position)
  hoseBodySafetyVector.y = 0

  const forwardClearance = hoseBodySafetyVector.dot(hoseBodySafetyForwardVector)
  const sideClearance = hoseBodySafetyVector.dot(hoseBodySafetyRightVector)
  const planarClearance = hoseBodySafetyVector.length()
  const sideInsideBodyBand = Math.abs(sideClearance) <= movement.hoseBodyUnlatchSideClearance
  const forwardRisk = sideInsideBodyBand
    ? smooth01(
      (movement.hoseBodyUnlatchMinForward - forwardClearance)
        / Math.max(0.001, movement.hoseBodyUnlatchMinForward + 0.18),
    )
    : 0
  const closeRisk = smooth01(
    (movement.hoseBodyUnlatchMinDistance - planarClearance)
      / Math.max(0.001, movement.hoseBodyUnlatchMinDistance),
  )
  const risk = Math.max(forwardRisk, closeRisk)

  if (writeDebug) {
    state.hoseBodyForwardClearance = forwardClearance
    state.hoseBodySideClearance = sideClearance
    state.hoseBodyPlanarClearance = planarClearance
    state.hoseBodyIntersectionRisk = risk
  }

  return risk
}

function updateHoseBodySafety(state: VacuumRuntime) {
  const endpointLocked = state.suctionState === 'sealed' || state.hoseReachLockedToAnchor
  const livePoint = endpointLocked
    ? state.anchorWorldPosition
    : state.actualHoseMouthPosition
  const risk = measureHoseBodyIntersectionRisk(state, livePoint, true)
  if (!endpointLocked) state.hoseBodyIntersectionRisk = 0
  return endpointLocked ? risk : 0
}

function smooth01(value: number) {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped * clamped * (3 - clamped * 2)
}

function smoothWindow(cycle: number, riseStart: number, riseEnd: number, fallStart: number, fallEnd: number) {
  return smooth01((cycle - riseStart) / Math.max(0.0001, riseEnd - riseStart))
    * (1 - smooth01((cycle - fallStart) / Math.max(0.0001, fallEnd - fallStart)))
}

function wrap01(value: number) {
  return value - Math.floor(value)
}

function clampValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function lerpWrappedHue(from: number, to: number, amount: number) {
  let delta = wrap01(to) - wrap01(from)
  if (delta > 0.5) delta -= 1
  if (delta < -0.5) delta += 1
  return wrap01(from + delta * Math.max(0, Math.min(1, amount)))
}

function getHarmonicPaletteHue(value: number) {
  const scaled = wrap01(value) * SLIME_REFERENCE_HUES.length
  const index = Math.floor(scaled)
  const blend = smooth01(scaled - index)
  const from = SLIME_REFERENCE_HUES[index % SLIME_REFERENCE_HUES.length]
  const to = SLIME_REFERENCE_HUES[(index + 1) % SLIME_REFERENCE_HUES.length]
  return lerpWrappedHue(from, to, blend)
}

function setSlimeHueColor(target: THREE.Color, hue: number, energy: number, lightnessOffset = 0, saturationOffset = 0) {
  const saturation = Math.min(
    SLIME_COLOUR_TUNING.maxSaturation,
    Math.max(SLIME_COLOUR_TUNING.minSaturation, SLIME_COLOUR_TUNING.baseSaturation + energy * 0.31 + saturationOffset),
  )
  const lightness = Math.max(
    SLIME_COLOUR_TUNING.minLightness,
    Math.min(SLIME_COLOUR_TUNING.maxLightness, SLIME_COLOUR_TUNING.baseLightness + energy * 0.055 + lightnessOffset),
  )
  target.setHSL(wrap01(hue), saturation, lightness)
  return target
}

function getMonochromeHue(mote: Mote, t: number) {
  const quietPalette = getHarmonicPaletteHue(mote.palette * 0.23 + 0.02)
  const spawnHue = lerpWrappedHue(mote.spawnHue, quietPalette, 0.16)
  return wrap01(spawnHue + Math.sin(t * 0.34 + mote.seed) * 0.014 + Math.sin(t * 0.15 + mote.seed * 1.7) * 0.008)
}

function getTechnicolorHue(mote: Mote, pile: SlimePile, t: number, offset = 0) {
  const activity = smooth01(mote.colorBloom * 0.5 + mote.suctionYield * 0.36 + mote.stretchMemory * 0.28 + mote.mergeHeat * 0.24 + mote.slurp * 0.28 + mote.intakeFlow * 0.22 + mote.mouthMagnetism * 0.16 + mote.slurpPressure * 0.18 + mote.contactFeed * 0.18 + mote.contactRope * 0.14)
  const swirl = Math.sin(t * (0.18 + mote.warmth * 0.055 + activity * 0.14) + mote.seed * 0.71 + offset * 6.2) * (0.018 + activity * 0.018)
  const pressure = mote.coagulate * 0.044
    + mote.merge * 0.034
    + mote.mergeHeat * 0.035
    + mote.compression * 0.03
    + mote.strain * 0.024
    + mote.stretchMemory * 0.04
    + mote.contraction * 0.018
    + mote.suctionYield * 0.045
    + mote.slurp * 0.052
    + mote.intakeFunnel * 0.032
    + mote.intakeFlow * 0.04
    + mote.mouthMagnetism * 0.025
    + mote.slurpPressure * 0.03
    + mote.contactDent * 0.018
    + mote.contactRope * 0.026
    + mote.contactFeed * 0.032
    + pile.chroma * 0.02
  const driftRate = SLIME_COLOUR_TUNING.idleDriftRate + activity * SLIME_COLOUR_TUNING.activeDriftRate
  const familyHue = getHarmonicPaletteHue(pile.seed * 0.061 + mote.palette * 0.24 + offset * 0.16)
  const paletteHue = getHarmonicPaletteHue(mote.palette + mote.pigmentHue * 0.34 + offset * 0.48 + t * driftRate)
  const mixedHue = lerpWrappedHue(
    lerpWrappedHue(pile.hue, familyHue, 0.34),
    paletteHue,
    0.28 + smooth01(pile.chroma) * 0.14 + smooth01(mote.colorBloom) * 0.12 + activity * 0.08,
  )
  return wrap01(mixedHue + swirl + pressure * (0.84 + activity * 0.22))
}

function applyReferenceSlimeColor(
  target: THREE.Color,
  mote: Mote,
  pile: SlimePile,
  t: number,
  offset = 0,
  lightnessOffset = 0,
  role: SlimeColorRole = 'body',
) {
  const roleTune = SLIME_COLOR_ROLES[role]
  const speedEnergy = Math.min(1, mote.velocity.length() * 0.18)
  const stretchEnergy = smooth01(
    mote.strain * 0.44
      + mote.stretchMemory * 0.5
      + mote.suctionLoad * 0.18
      + mote.suctionYield * 0.36
      + mote.intakeDimple * 0.12
      + mote.intakeFunnel * 0.22
      + mote.intakeFlow * 0.24
      + mote.contactDent * 0.14
      + mote.contactRope * 0.2
      + mote.contactFeed * 0.22
      + mote.mouthMagnetism * 0.14
      + mote.rimGrip * 0.12
      + mote.organicHold * 0.14
      + mote.slurpPressure * 0.18
      + mote.materialWake * 0.18
      + mote.elasticMemory * 0.16
      + mote.strandTension * 0.18
      + mote.jelly * 0.14
      + mote.slurp * 0.62
      + speedEnergy * 0.36,
  )
  const compressionEnergy = smooth01(mote.compression * 0.82 + mote.poolPressure * 0.42 + mote.waxDepth * 0.34 + mote.absorb * 0.42 + mote.settled * 0.18)
  const mergeEnergy = smooth01(mote.mergeHeat * 0.72 + mote.merge * 0.34 + mote.surfaceTension * 0.18 + mote.seamAssimilation * 0.22)
  const suctionEnergy = smooth01(mote.suctionStrain * 0.5 + mote.tendril * 0.36 + mote.strandTension * 0.24 + mote.suctionYield * 0.22 + mote.intakeFunnel * 0.28 + mote.intakeFlow * 0.34 + mote.contactRope * 0.24 + mote.contactFeed * 0.3 + mote.mouthMagnetism * 0.2 + mote.slurpPressure * 0.24)
  const opalEnergy = smooth01(mote.jelly * 0.2 + mote.colorBloom * 0.28 + mote.materialWake * 0.22 + mote.stretchMemory * 0.22 + suctionEnergy * 0.28 + pile.chroma * 0.16)
  const pocketEnergy = smooth01(compressionEnergy * 0.58 + mote.poolPressure * 0.26 + mote.waxDepth * 0.24 + mote.settled * 0.22 + mote.coagulate * 0.24 + mergeEnergy * 0.16)
  const bloomEnergy = smooth01(
    mote.colorBloom * 0.64
      + mote.coagulate * 0.36
      + mote.merge * 0.26
      + mergeEnergy * 0.34
      + mote.materialWake * 0.24
      + mote.seamAssimilation * 0.16
      + mote.reemergeCharge * 0.2
      + mote.settled * 0.22
      + mote.contraction * 0.18
      + mote.intakeAdhesion * 0.14
      + mote.intakeFlow * 0.28
      + mote.intakeFeed * 0.2
      + mote.contactLipSeal * 0.14
      + mote.contactFeed * 0.18
      + mote.rimGrip * 0.12
      + mote.organicHold * 0.16,
  )
  const energy = smooth01(bloomEnergy * 0.6 + stretchEnergy * 0.42 + mergeEnergy * 0.2 + suctionEnergy * 0.2 + opalEnergy * 0.18 + pile.chroma * 0.14)
  const idleHue = getMonochromeHue(mote, t)
  const technicolorHue = getTechnicolorHue(mote, pile, t, offset + roleTune.hue)
  const reactionHue = getHarmonicPaletteHue(
    mote.palette
      + t * 0.008
      + mote.slurp * 0.12
      + mote.strain * 0.06
      + mote.stretchMemory * 0.08
      + mote.suctionYield * 0.07
      + mote.suctionStrain * 0.05
      + mote.tendril * 0.035
      + mote.intakeFlow * 0.046
      + mote.intakeFeed * 0.032
      + mote.contactRope * 0.026
      + mote.contactFeed * 0.034
      + mote.mouthMagnetism * 0.026
      + mote.slurpPressure * 0.034
      + mote.materialWake * 0.038
      + mote.elasticMemory * 0.03
      + mote.reemergeCharge * 0.026
      + mote.mergeHeat * 0.04
      + mote.surfaceTension * 0.024
      + offset * 0.27,
  )
  const baseHue = lerpWrappedHue(idleHue, technicolorHue, Math.min(0.84, 0.18 + energy * 0.54 + roleTune.paletteMix))
  const opalHue = getHarmonicPaletteHue(mote.palette + mote.pigmentHue * 0.18 + pile.seed * 0.043 + t * 0.0025 + offset * 0.11)
  const finalHue = lerpWrappedHue(
    baseHue,
    lerpWrappedHue(reactionHue, opalHue, SLIME_COLOUR_TUNING.opalMix * opalEnergy),
    Math.min(0.4, stretchEnergy * 0.14 + mergeEnergy * 0.07 + opalEnergy * 0.08 + Math.max(0, roleTune.warmth) * 0.18),
  )

  setSlimeHueColor(target, finalHue, 0.26 + energy * 0.48, lightnessOffset + roleTune.lightness, roleTune.saturation)
  slimePaletteColor.copy(setSlimeHueColor(
    slimePaletteColor,
    technicolorHue,
    0.54 + energy * 0.42,
    lightnessOffset + roleTune.lightness + 0.032,
    roleTune.saturation + 0.04,
  ))
  target.lerp(slimePaletteColor, Math.min(0.82, bloomEnergy * (0.2 + pile.chroma * 0.25) + mergeEnergy * 0.16 + opalEnergy * 0.12 + roleTune.paletteMix * 0.34))

  if (stretchEnergy > 0.05 || roleTune.warmth > 0) {
    const glowHue = lerpWrappedHue(finalHue, SLIME_COLOUR_TUNING.warmHighlightHue, 0.2 + opalEnergy * 0.16 + Math.max(0, roleTune.warmth) * 0.32)
    slimeGlowColor.copy(setSlimeHueColor(slimeGlowColor, glowHue, 0.68 + stretchEnergy * 0.22 + opalEnergy * 0.12, lightnessOffset + 0.1 + roleTune.lightness * 0.34, 0.06))
    target.lerp(slimeGlowColor, Math.min(0.4, stretchEnergy * 0.15 + suctionEnergy * 0.08 + mote.suctionYield * 0.055 + mote.intakeFlow * 0.065 + mote.materialWake * 0.05 + opalEnergy * 0.06 + Math.max(0, roleTune.warmth) * 0.08))
  }

  if (mergeEnergy > 0.03 && (role === 'bridge' || role === 'body' || role === 'cap')) {
    const seamHue = lerpWrappedHue(pile.hue, technicolorHue, 0.5 + mergeEnergy * 0.18 + opalEnergy * 0.06)
    slimeBridgeColor.copy(setSlimeHueColor(slimeBridgeColor, seamHue, 0.62 + mergeEnergy * 0.24 + mote.surfaceTension * 0.08, lightnessOffset + 0.04 + roleTune.lightness * 0.4, roleTune.saturation + 0.035))
    target.lerp(slimeBridgeColor, Math.min(0.22, mergeEnergy * 0.12 + mote.surfaceTension * 0.035))
  }

  const depthMix = Math.min(
    0.16,
    (mote.settled * 0.035 + mote.merge * 0.024 + mote.coagulate * 0.024 + mote.waxDepth * SLIME_MATERIAL_POLISH.waxDepthToPocket + pocketEnergy * SLIME_COLOUR_TUNING.pocketDepth) * (role === 'mound' || role === 'anchor' ? 1.4 : 1),
  )
  if (depthMix > 0.001) {
    slimePocketColor.copy(setSlimeHueColor(slimePocketColor, lerpWrappedHue(finalHue, SLIME_COLOUR_TUNING.coolShadowHue, 0.18 + pocketEnergy * 0.12), 0.4 + energy * 0.18, lightnessOffset - 0.15, -0.05))
    target.lerp(slimePocketColor, depthMix)
  }
  return target
}

function applyPileSlimeColor(
  target: THREE.Color,
  pile: SlimePile,
  t: number,
  offset = 0,
  lightnessOffset = 0,
  role: SlimeColorRole = 'mound',
) {
  const roleTune = SLIME_COLOR_ROLES[role]
  const energy = smooth01(pile.chroma * 0.78 + pile.pulse * 0.22 + pile.mass * 0.035)
  const slowHue = getHarmonicPaletteHue(pile.seed * 0.071 + offset * 0.38 + t * (SLIME_COLOUR_TUNING.idleDriftRate + energy * 0.002))
  const baseHue = wrap01(pile.hue + Math.sin(t * 0.12 + pile.seed + offset * 2.1) * (0.014 + energy * 0.012) + roleTune.hue)
  const hue = lerpWrappedHue(baseHue, slowHue, 0.2 + energy * 0.2 + roleTune.paletteMix * 0.3)
  setSlimeHueColor(target, hue, 0.36 + pile.chroma * 0.44 + energy * 0.16, lightnessOffset + roleTune.lightness, roleTune.saturation)
  slimePaletteColor.copy(setSlimeHueColor(slimePaletteColor, slowHue, 0.58 + energy * 0.28, lightnessOffset + roleTune.lightness + 0.035, roleTune.saturation + 0.03))
  target.lerp(slimePaletteColor, Math.min(0.46, 0.15 + energy * 0.22 + roleTune.paletteMix * 0.18))
  return target
}

function getInitialDevMode(): ProductionDevModeId {
  if (typeof window === 'undefined') return 'full-loop'
  const params = new URLSearchParams(window.location.search)
  const requestedMode = params.get('mode')
  return isProductionDevModeId(requestedMode) ? requestedMode : 'full-loop'
}

function isExperimentDevQueryEnabled() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('dev') === '1'
}

function isLevelDifficulty(value: string | null): value is LevelDifficulty {
  return value === 'easy' || value === 'normal' || value === 'hard'
}

function getInitialLevelDifficulty(): LevelDifficulty {
  if (typeof window === 'undefined') return 'normal'
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('difficulty') ?? params.get('levelDifficulty')
  return isLevelDifficulty(requested) ? requested : 'normal'
}

function isReattachChainVariant(value: string | null): value is ReattachChainVariant {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

function getInitialReattachChainVariant(): ReattachChainVariant {
  if (typeof window === 'undefined') return 'medium'
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('catch') ?? params.get('reattach') ?? params.get('distance')
  return isReattachChainVariant(requested) ? requested : 'medium'
}

function normalizeStretchSnapPreset(value: string | null): StretchSnapFeelPreset | null {
  if (!value) return null
  const compact = value.trim().replace(/\s+/g, '-')
  const lower = compact.toLowerCase()
  if (lower in STRETCH_SNAP_PRESET_ALIASES) return STRETCH_SNAP_PRESET_ALIASES[lower]
  if (compact in PRODUCTION_TUNING.stretchSnapPresets) return compact as StretchSnapFeelPreset
  return null
}

function getInitialStretchSnapPreset(): StretchSnapFeelPreset {
  if (typeof window === 'undefined') return 'arcadeTug'
  const params = new URLSearchParams(window.location.search)
  return normalizeStretchSnapPreset(
    params.get('preset') ?? params.get('suction') ?? params.get('pushpull') ?? params.get('grapple') ?? params.get('feel'),
  ) ?? 'arcadeTug'
}

function getStretchSnapPresetTuning(state: VacuumRuntime): StretchSnapPresetTuning {
  return PRODUCTION_TUNING.stretchSnapPresets[state.stretchSnapPreset] ?? PRODUCTION_TUNING.stretchSnapPresets.arcadeTug
}

function cycleStretchSnapPreset(current: StretchSnapFeelPreset, direction: -1 | 1) {
  const presets = Object.keys(PRODUCTION_TUNING.stretchSnapPresets) as StretchSnapFeelPreset[]
  const index = Math.max(0, presets.indexOf(current))
  return presets[(index + direction + presets.length) % presets.length]
}

function getStretchSnapMaxStretch(state: VacuumRuntime) {
  return Math.max(0.001, getStretchSnapPresetTuning(state).maxStretch)
}

function getStretchSnapReattachGraceDuration(state: VacuumRuntime) {
  return Math.max(0.001, getStretchSnapPresetTuning(state).reattachGraceDuration)
}

function getLevelDifficultyConfig(difficulty: LevelDifficulty) {
  return FIRST_LEVEL_TUNING.difficulty[difficulty]
}

function getLevelCleanupTarget(difficulty: LevelDifficulty) {
  const config = getLevelDifficultyConfig(difficulty)
  return clampValue(config.cleanupTarget, 0.2, 0.96)
}

function getLevelRegenStartProgress(difficulty: LevelDifficulty) {
  return clampValue(getLevelDifficultyConfig(difficulty).regenStartCompletion ?? FIRST_LEVEL_TUNING.regenStartCompletion, 0.02, 0.9)
}

function getLevelWaveIndex(difficulty: LevelDifficulty) {
  return LEVEL_DIFFICULTIES.indexOf(difficulty) + 1
}

function getLevelWaveTimeLimit(difficulty: LevelDifficulty) {
  return Math.max(30, getLevelDifficultyConfig(difficulty).waveTimeLimitSeconds)
}

function computeLevelCurrency(state: VacuumRuntime) {
  const summary = getFlowSessionSummary(state.flowMetrics)
  const gunkValue = Math.max(0, Math.round(state.levelCompletionPercent * state.levelStartMass * FIRST_LEVEL_TUNING.currencyGunkScale))
  const stylePoints = Math.max(0, Math.round(
    summary.bestChainLength * FIRST_LEVEL_TUNING.currencyStyleChainValue
      + summary.totalGlugs * FIRST_LEVEL_TUNING.currencyStyleGlugValue
      + clampValue(summary.averageMomentumRetained, 0, 1.2) * FIRST_LEVEL_TUNING.currencyMomentumValue
      + clampValue(state.bagFillNormalized, 0, 1.4) * FIRST_LEVEL_TUNING.currencyBagFillValue,
  ))
  const coinValue = 0
  return {
    currencyEarned: gunkValue + stylePoints + coinValue,
    stylePoints,
    gunkValue,
    coinValue,
  }
}

function cycleLevelDifficulty(current: LevelDifficulty, direction: -1 | 1) {
  const index = LEVEL_DIFFICULTIES.indexOf(current)
  return LEVEL_DIFFICULTIES[(index + direction + LEVEL_DIFFICULTIES.length) % LEVEL_DIFFICULTIES.length]
}

function computeReversiblePartyTarget(
  completionPercent: number,
  regenPressure: number,
  regenResetPulse: number,
  difficulty: LevelDifficulty,
) {
  const progressTowardTarget = clampValue(completionPercent, 0, 1.15)
  const rawParty = smooth01(
    (progressTowardTarget - FIRST_LEVEL_TUNING.partyBuildupStart)
      / Math.max(0.001, FIRST_LEVEL_TUNING.partyFullAt - FIRST_LEVEL_TUNING.partyBuildupStart),
  )
  const difficultyScale = Math.max(0.001, getLevelDifficultyConfig(difficulty).regenPressureScale)
  const regenLoad = clampValue(regenPressure / difficultyScale, 0, 1.35)
  const regenDrag = regenLoad
    * FIRST_LEVEL_TUNING.partyRegenReverseStrength
    * (0.22 + rawParty * 0.58)
    + regenResetPulse * 0.48
  return clampValue(rawParty - regenDrag, 0, 1)
}

function computeLevelPartySync(state: VacuumRuntime) {
  if (!isFirstLevelMode(state.devMode)) return 0
  if (state.levelDefeatTriggered || state.levelState === 'defeated') return 0
  const progressMeter = clampValue(state.levelProgressTowardTarget, 0, 1.18)
  const progressDriven = progressMeter * (0.9 + smooth01(progressMeter) * 0.34)
  const reversibleParty = computeReversiblePartyTarget(
    state.levelCompletionPercent,
    state.levelRegenPressure,
    state.levelRegenResetPulse,
    state.levelDifficulty,
  )
  const regenDrag = state.levelCompletionTriggered
    ? 0
    : clampValue(state.levelRegenPressure * 0.1 + state.levelRegenResetPulse * 0.18, 0, 0.7)
  const completionBoost = state.levelCompletionTriggered
    ? Math.max(
      1,
      state.levelCompletionPulse * 0.24,
      state.levelDiscoIntensity * 0.56,
      state.levelCompletionGlow * 0.52,
    )
    : 0
  return clampValue(Math.max(progressDriven, reversibleParty) - regenDrag + completionBoost, 0, 1.35)
}

function computeProgressLightingSignal(state: VacuumRuntime) {
  if (!isFirstLevelMode(state.devMode)) return 0
  const progress = computeLevelPartySync(state)
  return smooth01(
    (progress - FIRST_LEVEL_TUNING.partyLightingStart)
      / Math.max(0.001, FIRST_LEVEL_TUNING.partyLightingFullAt - FIRST_LEVEL_TUNING.partyLightingStart),
  )
}

function computeProgressBackgroundSignal(state: VacuumRuntime, t: number) {
  if (!isFirstLevelMode(state.devMode)) {
    return { progress: 0, throb: 0, regenMute: 0 }
  }
  if (state.levelDefeatTriggered || state.levelState === 'defeated') {
    return { progress: 0, throb: 0, regenMute: 1 }
  }
  const progressLighting = computeProgressLightingSignal(state)
  const partySync = computeLevelPartySync(state)
  const finale = state.levelCompletionTriggered
    ? clampValue(
      state.levelDiscoIntensity * 0.48
        + state.levelCompletionGlow * 0.34
        + state.levelCompletionPulse * 0.12,
      0,
      1.2,
    )
    : 0
  const progress = clampValue(
    Math.max(
      state.levelProgressTowardTarget,
      state.levelPartyProgress,
      partySync,
      progressLighting,
      finale,
    ),
    0,
    1.35,
  )
  const regenMute = state.levelCompletionTriggered
    ? 0
    : clampValue(
      state.levelRegenPressure * 0.16
        + state.levelRegenResetPulse * 0.24,
      0,
      0.8,
    )
  const pulseRate = FIRST_LEVEL_TUNING.backgroundThrobRate * (1 + progress * 0.72 + finale * 0.35)
  const pulse = (Math.sin(t * pulseRate * Math.PI * 2) + 1) * 0.5
  const groove = smooth01(pulse)
  const throb = clampValue(
    (progress * FIRST_LEVEL_TUNING.backgroundThrobStrength
      + finale * FIRST_LEVEL_TUNING.backgroundFinaleBoost)
      * (0.44 + groove * 0.56)
      * (1 - regenMute * 0.32),
    0,
    0.86,
  )
  return { progress, throb, regenMute }
}

function applyProgressBackgroundColor(state: VacuumRuntime, t: number, target: THREE.Color) {
  const signal = computeProgressBackgroundSignal(state, t)
  const safeProgress = Number.isFinite(signal.progress) ? signal.progress : 0
  const safeRegenMute = Number.isFinite(signal.regenMute) ? signal.regenMute : 0
  const safeThrob = Number.isFinite(signal.throb) ? signal.throb : 0
  const paletteProgress = clampValue(
    safeProgress * FIRST_LEVEL_TUNING.backgroundProgressColorStrength
      - safeRegenMute * FIRST_LEVEL_TUNING.backgroundRegenMuteStrength,
    0,
    1,
  )
  const cycle = paletteProgress * (PROGRESS_BACKGROUND_PALETTE.length - 1)
  const index = clampValue(
    Math.floor(Number.isFinite(cycle) ? cycle : 0),
    0,
    Math.max(0, PROGRESS_BACKGROUND_PALETTE.length - 2),
  )
  const blend = smooth01(cycle - index)
  target
    .copy(PROGRESS_BACKGROUND_PALETTE[index] ?? PROGRESS_BACKGROUND_BASE)
    .lerp(PROGRESS_BACKGROUND_PALETTE[index + 1] ?? PROGRESS_BACKGROUND_BASE, blend)
  target.lerp(PROGRESS_BACKGROUND_FLASH, clampValue(safeThrob, 0, 1) * 0.2)
  target.lerp(PROGRESS_BACKGROUND_SOFT, clampValue(safeThrob, 0, 1) * 0.12)
  if (safeRegenMute > 0) {
    target.lerp(
      PROGRESS_BACKGROUND_REGEN,
      safeRegenMute * FIRST_LEVEL_TUNING.backgroundRegenMuteStrength,
    )
  }
  target.lerp(PROGRESS_BACKGROUND_BASE, 1 - smooth01(paletteProgress))
  return signal
}

function getModePileCenters(mode: ProductionDevModeId) {
  if (mode === 'reattach-chain') {
    return REATTACH_CHAIN_VARIANT_CENTERS[getInitialReattachChainVariant()]
  }
  return DEV_MODE_PILE_CENTERS[mode] ?? SLIME_PILE_CENTERS
}

function computeNearestPileSpacing(centers: Array<{ x: number; z: number }>) {
  if (centers.length < 2) {
    return { minimum: 0, maximum: 0, average: 0 }
  }
  let minimum = Number.POSITIVE_INFINITY
  let maximum = 0
  let total = 0
  for (let index = 0; index < centers.length; index += 1) {
    const center = centers[index]
    let nearest = Number.POSITIVE_INFINITY
    for (let otherIndex = 0; otherIndex < centers.length; otherIndex += 1) {
      if (otherIndex === index) continue
      const other = centers[otherIndex]
      const distance = Math.hypot(center.x - other.x, center.z - other.z)
      nearest = Math.min(nearest, distance)
    }
    minimum = Math.min(minimum, nearest)
    maximum = Math.max(maximum, nearest)
    total += nearest
  }
  return {
    minimum,
    maximum,
    average: total / centers.length,
  }
}

function getArenaLayoutDebug(mode: ProductionDevModeId) {
  const centers = getModePileCenters(mode)
  const spacing = computeNearestPileSpacing(centers)
  const usesTraversalLayout = centers === SLIME_PILE_CENTERS
  return {
    arenaModel: PRODUCTION_TUNING.arena.model,
    slimeLayoutModel: usesTraversalLayout ? 'authored-cluster-lane-isolated-v1' : `${mode}-focused-layout`,
    radius: ARENA_RADIUS,
    playableRadius: ARENA_PLAYABLE_RADIUS,
    pileCount: centers.length,
    clusterCount: usesTraversalLayout ? SLIME_PILE_CLUSTER_COUNT : Math.min(1, centers.length),
    clusterDensity: usesTraversalLayout ? PRODUCTION_TUNING.arena.clusterDensity : centers.length,
    isolatedCount: usesTraversalLayout ? SLIME_PILE_ISOLATED_COUNT : 0,
    nearestSpacingMin: spacing.minimum,
    nearestSpacingMax: spacing.maximum,
    nearestSpacingAvg: spacing.average,
    minimumSlimeSpacing: PRODUCTION_TUNING.arena.minimumSlimeSpacing,
    maximumSlimeSpacing: PRODUCTION_TUNING.arena.maximumSlimeSpacing,
    clusterToClusterDistanceBias: PRODUCTION_TUNING.arena.clusterToClusterDistanceBias,
    centerPlacementBias: PRODUCTION_TUNING.arena.centerPlacementBias,
    outerRingPlacementBias: PRODUCTION_TUNING.arena.outerRingPlacementBias,
  }
}

function getModePileCenter(mode: ProductionDevModeId, index: number, target: THREE.Vector3) {
  const centers = getModePileCenters(mode)
  const center = centers[index % centers.length]
  target.set(center.x, SLIME_MOTE_FLOOR_Y, center.z)
  return target
}

type GripContactCandidate = {
  pileIndex: number
  moteId: number
  contactIndex: number
  point: THREE.Vector3
  score: number
  distance: number
}

function getGripContactPoint(pile: SlimePile, contactIndex: number, target: THREE.Vector3) {
  const count = Math.max(1, Math.floor(PRODUCTION_TUNING.grip.gripContactPointCount))
  const angle = pile.seed * 4.73 + (contactIndex / count) * Math.PI * 2
  const radius = PRODUCTION_TUNING.grip.gripContactRadius * (contactIndex % 2 === 0 ? 0.72 : 1)
  target.set(
    pile.center.x + Math.cos(angle) * radius,
    0.52,
    pile.center.z + Math.sin(angle) * radius,
  )
  return target
}

function findNearestMoteForGrip(motes: Mote[], pileIndex: number, point: THREE.Vector3) {
  let bestMoteId = -1
  let bestDistanceSq = Number.POSITIVE_INFINITY
  for (let i = 0; i < motes.length; i += 1) {
    const mote = motes[i]
    if (mote.pileIndex !== pileIndex || mote.visibleMass < 0.08 || mote.levelCleared > 0.5) continue
    const dx = mote.position.x - point.x
    const dz = mote.position.z - point.z
    const distanceSq = dx * dx + dz * dz
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq
      bestMoteId = i
    }
  }
  return bestMoteId
}

function findGripContactCandidate(state: VacuumRuntime, piles: SlimePile[], motes: Mote[]) {
  const tuning = PRODUCTION_TUNING.grip
  let best: GripContactCandidate | null = null
  for (let pileIndex = 0; pileIndex < piles.length; pileIndex += 1) {
    const pile = piles[pileIndex]
    const pileMass = Math.max(pile.mass, pile.targetMass, pile.absorbedMass * 0.2)
    if (pileMass < tuning.gripMinPileMass) continue
    for (let contactIndex = 0; contactIndex < tuning.gripContactPointCount; contactIndex += 1) {
      getGripContactPoint(pile, contactIndex, pileVector)
      sourceVector.copy(pileVector).sub(state.mouth)
      sourceVector.y *= 0.35
      const distance = Math.max(0.001, sourceVector.length())
      if (distance > tuning.gripSearchRadius) continue
      const ahead = Math.max(0, sourceVector.dot(state.mouthForward) / distance)
      const bodySpeed = state.velocity.length()
      const travelAlignment = bodySpeed > 0.001 ? Math.max(0, state.velocity.dot(sourceVector) / (bodySpeed * distance)) : ahead
      const massGate = smooth01((pileMass - tuning.gripMinPileMass) / Math.max(0.001, 1.1 - tuning.gripMinPileMass))
      const distanceGate = smooth01((tuning.gripSearchRadius - distance) / tuning.gripSearchRadius)
      const score = distanceGate * 0.58 + ahead * 0.18 + travelAlignment * 0.16 + massGate * 0.2
      if (!best || score > best.score) {
        const moteId = findNearestMoteForGrip(motes, pileIndex, pileVector)
        if (moteId < 0) continue
        best = {
          pileIndex,
          moteId,
          contactIndex,
          point: pileVector.clone(),
          score,
          distance,
        }
      }
    }
  }
  return best
}

function startGripContact(state: VacuumRuntime, candidate: GripContactCandidate, t: number) {
  state.gripActive = true
  state.gripState = 'locked'
  state.gripTargetPileIndex = candidate.pileIndex
  state.gripTargetMoteId = candidate.moteId
  state.gripContactIndex = candidate.contactIndex
  state.gripContactPoint.copy(candidate.point)
  state.gripLockPoint.copy(candidate.point)
  state.gripHoldTime = 0
  state.gripSpinAngle = Math.atan2(state.position.z - candidate.point.z, state.position.x - candidate.point.x)
  state.gripSpinSpeed = PRODUCTION_TUNING.grip.gripSpinStartSpeed
  state.gripReleaseWindowWidth = PRODUCTION_TUNING.grip.gripReleaseWindowBase
  state.gripReleaseQuality = 0
  state.gripReleaseReady = 0
  state.gripReleaseCue = 0
  state.gripReleaseReadiness = 0
  state.gripReleasePhaseQuality = 0
  state.gripReleaseGraceTimer = 0
  state.gripDizzy = 0
  state.gripMissCount = 0
  state.gripMissPulse = 0
  state.gripWindowWasOpen = false
  state.gripMassMultiplier = 1
  state.gripGlugBoost = 1
  state.gripLockPulse = 1
  state.gripEntryPull = 1
  state.gripPhysicalCue = 0.72
  state.gripPocketBiteCue = 0.64
  state.gripHoseStrainCue = 0.28
  state.gripMouthAnticipationCue = 0.42
  state.gripReleaseCue = 0
  state.gripReleaseReadiness = 0
  state.gripReleasePhaseQuality = 0
  state.gripReleaseGraceTimer = 0
  state.gripMissPulse = 0
  state.gripReleaseReason = 'none'
  state.pivotReleaseReason = 'rightClickGrip'
  state.sealTargetMoteId = candidate.moteId
  state.sealTargetPileIndex = candidate.pileIndex
  state.sealTargetScore = Math.max(state.sealTargetScore, candidate.score + 1)
  state.slimeSealPoint.copy(candidate.point)
  state.slimeSealAnchorPoint.copy(candidate.point)
  state.slimeHookPoint.copy(candidate.point)
  state.slimeSealDemand = Math.max(state.slimeSealDemand, PRODUCTION_TUNING.grip.gripSealStrength)
  state.slimeSealStrength = Math.max(state.slimeSealStrength, 0.72)
  state.hoseHookStrength = Math.max(state.hoseHookStrength, 0.82)
  state.deepEmbedDepth = Math.max(state.deepEmbedDepth, PRODUCTION_TUNING.embed.embedDepthMax * 0.38)
  state.deepEmbedLockStrength = Math.max(state.deepEmbedLockStrength, PRODUCTION_TUNING.grip.gripLockStrength * 0.62)
  state.deepEmbedPocketPulse = Math.max(state.deepEmbedPocketPulse, 0.82)
  state.animationMouthTug = Math.max(state.animationMouthTug, 0.82)
  state.animationAnticipation = Math.max(state.animationAnticipation, 0.54)
  sourceVector.copy(candidate.point).sub(state.position)
  sourceVector.y *= 0.24
  if (sourceVector.lengthSq() > 0.0001) {
    sourceVector.normalize()
    const towardLockSpeed = state.velocity.dot(sourceVector)
    state.velocity.addScaledVector(
      sourceVector,
      Math.max(0.18, PRODUCTION_TUNING.grip.gripLockSuctionImpulse - Math.max(0, towardLockSpeed) * 0.35),
    )
    candidateBodyVector.copy(state.velocity).addScaledVector(sourceVector, -state.velocity.dot(sourceVector))
    state.velocity.addScaledVector(
      candidateBodyVector,
      -Math.min(0.42, PRODUCTION_TUNING.grip.gripOrbitControlStrength * 0.28),
    )
  }
  recordFlowGrip(state.flowMetrics, {
    time: t,
    kind: 'attach',
    targetId: candidate.moteId,
    holdTime: 0,
    spinSpeed: state.gripSpinSpeed,
  })
}

function isFirstLevelMode(mode: ProductionDevModeId) {
  return mode === 'full-loop'
}

function isMovementLabMode(mode: ProductionDevModeId) {
  return mode === 'movement-lab'
}

function computeLevelMoteMass(mote: Mote) {
  if (mote.levelCleared > 0.5) return 0
  return Math.max(0, mote.mass * mote.visibleMass)
}

function isTideOvergrowthMoteIndex(index: number) {
  return index >= LEVEL_TIDE_BASELINE_MOTE_COUNT
}

function isBigSlimeColonyMoteIndex(index: number) {
  if (!isTideOvergrowthMoteIndex(index)) return false
  const tideSlot = index - LEVEL_TIDE_BASELINE_MOTE_COUNT
  return tideSlot % 6 <= 4 || seededNoise(index * 6.37 + 17.8) > 0.86
}

function computeGunkTideProgress(state: VacuumRuntime) {
  return clampValue(state.levelGunkOvergrowth, 0, 1.45)
}

function computeLinearGunkCoverageTarget(state: VacuumRuntime) {
  const baseline = clampValue(FIRST_LEVEL_TUNING.gunkCoverageBaseline, 0.05, 0.8)
  const lossCoverage = clampValue(FIRST_LEVEL_TUNING.gunkCoverageLoss, baseline + 0.05, 1)
  const tide = clampValue(computeGunkTideProgress(state), 0, 1)
  return baseline + (lossCoverage - baseline) * tide
}

function computeImmediateTideSprout(state: VacuumRuntime) {
  if (!isFirstLevelMode(state.devMode)) return 0
  if (state.levelCompletionTriggered) return 0
  const sproutSeconds = Math.max(0.05, FIRST_LEVEL_TUNING.gunkTideImmediateSproutSeconds)
  return smooth01((state.levelTime + sproutSeconds) / sproutSeconds)
}

function computeSlimeFloorTakeoverCoverage(state: VacuumRuntime) {
  if (!isFirstLevelMode(state.devMode)) return 0
  const baseline = clampValue(FIRST_LEVEL_TUNING.gunkCoverageBaseline, 0.05, 0.8)
  const lossCoverage = clampValue(FIRST_LEVEL_TUNING.gunkCoverageLoss, baseline + 0.05, 1)
  return clampValue(
    Math.max(0, state.levelVisibleGunkCoverage - baseline),
    0,
    lossCoverage - baseline,
  )
}

function computeTideMoteActivation(state: VacuumRuntime, moteIndex: number) {
  if (!isFirstLevelMode(state.devMode)) return 0
  if (!isTideOvergrowthMoteIndex(moteIndex)) return 1
  const tide = computeGunkTideProgress(state)
  const tideSlot = moteIndex - LEVEL_TIDE_BASELINE_MOTE_COUNT
  const stagger = tideSlot / Math.max(1, LEVEL_TIDE_OVERGROWTH_MOTE_COUNT - 1)
  const window = Math.max(0.18, FIRST_LEVEL_TUNING.gunkTideSproutWindow)
  const threshold = stagger * 0.92 - window * 0.35
  const immediateSprout = computeImmediateTideSprout(state)
  const immediateBand = 0.42
  const immediateSlotStrength = smooth01((immediateBand - stagger) / immediateBand)
  const immediateActivation = immediateSprout * immediateSlotStrength * 0.42
  const linearActivation = smooth01((tide - threshold) / window)
  const defeatFloodNudge = state.levelDefeatTriggered
    ? smooth01(state.levelDefeatAnimationTime / Math.max(0.001, FIRST_LEVEL_TUNING.defeatFloodDuration)) * 0.12
    : 0
  return Math.max(
    immediateActivation,
    linearActivation,
    smooth01((tide + defeatFloodNudge - threshold) / window),
  )
}

function computeTideVisibleMassTarget(state: VacuumRuntime, moteIndex: number) {
  if (!isFirstLevelMode(state.devMode)) return 1
  const tide = computeGunkTideProgress(state)
  if (!isTideOvergrowthMoteIndex(moteIndex)) {
    return 1 + smooth01(tide) * (FIRST_LEVEL_TUNING.gunkTideBaselineMassGrowth - 1) * 0.26
  }
  const activation = computeTideMoteActivation(state, moteIndex)
  const bigColony = isBigSlimeColonyMoteIndex(moteIndex)
  const maxVisible = bigColony ? 1.28 : 1.02
  const colonyBoost = bigColony ? 1.48 + smooth01(tide) * 0.22 : 1
  return activation <= 0.001
    ? 0
    : Math.min(maxVisible, activation * FIRST_LEVEL_TUNING.gunkTideVisibleGrowth * colonyBoost)
}

function computeTideMassTarget(state: VacuumRuntime, moteIndex: number, baseMass: number) {
  if (!isFirstLevelMode(state.devMode)) return baseMass
  const tide = computeGunkTideProgress(state)
  if (!isTideOvergrowthMoteIndex(moteIndex)) {
    return baseMass * (1 + smooth01(tide) * (FIRST_LEVEL_TUNING.gunkTideBaselineMassGrowth - 1))
  }
  const activation = computeTideMoteActivation(state, moteIndex)
  const colonyBoost = isBigSlimeColonyMoteIndex(moteIndex) ? 1.58 + smooth01(tide) * 0.24 : 1
  return activation <= 0.001
    ? Math.max(0.08, baseMass * 0.12)
    : baseMass * (0.22 + activation * (FIRST_LEVEL_TUNING.gunkTideOvergrowthMassGrowth - 0.22)) * colonyBoost
}

function resolveTidePileIndex(runtime: VacuumRuntime, moteIndex: number) {
  const centers = getModePileCenters(runtime.devMode)
  const safeCount = Math.max(1, centers.length)
  const tideSlot = Math.max(0, moteIndex - LEVEL_TIDE_BASELINE_MOTE_COUNT)
  return ((tideSlot * 5 + Math.floor(tideSlot / 2) * 3) % safeCount + safeCount) % safeCount
}

function resolveTideMoteHome(runtime: VacuumRuntime, moteIndex: number, t: number, target: THREE.Vector3) {
  const tideSlot = Math.max(0, moteIndex - LEVEL_TIDE_BASELINE_MOTE_COUNT)
  const totalSlots = Math.max(1, LEVEL_TIDE_OVERGROWTH_MOTE_COUNT)
  const basePileIndex = resolveTidePileIndex(runtime, moteIndex)
  const pileCenter = getModePileCenter(runtime.devMode, basePileIndex, target)
  const tide = computeGunkTideProgress(runtime)
  const bigColony = isBigSlimeColonyMoteIndex(moteIndex)
  const ringSeed = (tideSlot + 0.5) / totalSlots
  const organicSeed = seededNoise(moteIndex * 2.47 + 14.3)
  const colonySlot = Math.floor(tideSlot / 6)
  const colonyMember = tideSlot % 6
  const colonyAngle = colonySlot * 2.399963229728653
    + seededNoise(colonySlot * 5.37 + 0.41) * Math.PI * 2
    + Math.sin(t * 0.045 + colonySlot * 0.27) * 0.08
  const colonyRing = ARENA_PLAYABLE_RADIUS
    * FIRST_LEVEL_TUNING.gunkTideSpreadRadius
    * (0.18 + Math.sqrt(seededNoise(colonySlot * 8.41 + 19.6)) * 0.74)
  const angle = tideSlot * (bigColony ? 1.047197551 : 2.399963229728653)
    + seededNoise(moteIndex * 5.37 + 0.41) * 0.76
    + Math.sin(t * 0.055 + moteIndex * 0.19) * 0.1
  const arenaRing = ARENA_PLAYABLE_RADIUS
    * FIRST_LEVEL_TUNING.gunkTideSpreadRadius
    * (bigColony
      ? (0.16 + Math.sqrt(seededNoise(moteIndex * 8.41 + 19.6)) * 0.76 + organicSeed * 0.16)
      : (0.1 + Math.sqrt(ringSeed) * 0.78 + organicSeed * 0.14))
  const clusterBias = bigColony
    ? 0.02 + seededNoise(moteIndex * 3.11 + 4.8) * 0.08
    : 0.08 + seededNoise(moteIndex * 3.11 + 4.8) * 0.14
  const creep = 1 + smooth01(tide) * 0.1
  if (bigColony) {
    const memberAngle = colonyMember * 1.047197551
      + seededNoise(moteIndex * 4.13 + 2.6) * 0.76
      + Math.sin(t * 0.07 + moteIndex * 0.11) * 0.08
    const memberRadius = (0.16 + seededNoise(moteIndex * 9.17 + 3.4) * 0.76) * (1 + smooth01(tide) * 0.18)
    target.set(
      Math.cos(colonyAngle) * colonyRing * creep + Math.cos(memberAngle) * memberRadius,
      SLIME_MOTE_FLOOR_Y + 0.04,
      Math.sin(colonyAngle) * colonyRing * creep + Math.sin(memberAngle) * memberRadius,
    )
  } else {
    target.set(
      pileCenter.x * clusterBias + Math.cos(angle) * arenaRing * creep * (1 - clusterBias),
      SLIME_MOTE_FLOOR_Y + 0.04,
      pileCenter.z * clusterBias + Math.sin(angle + Math.cos(t * 0.045 + moteIndex) * 0.07) * arenaRing * creep * (1 - clusterBias),
    )
  }
  clampSlimeFloorPoint(target)
  target.y = SLIME_MOTE_FLOOR_Y + 0.04
  return target
}

function computeGunkCoverageFromMass(rawRemainingMass: number, startMass: number, _overgrowth = 0) {
  const baseline = clampValue(FIRST_LEVEL_TUNING.gunkCoverageBaseline, 0.05, 0.8)
  const lossCoverage = clampValue(FIRST_LEVEL_TUNING.gunkCoverageLoss, baseline + 0.05, 1)
  const rawRemainingFraction = clampValue(
    rawRemainingMass / Math.max(0.001, startMass),
    0,
    (lossCoverage / baseline) * 1.08,
  )
  return clampValue(rawRemainingFraction * baseline, 0, 1)
}

function computeVisualClearFromCoverage(coverage: number) {
  const baseline = clampValue(FIRST_LEVEL_TUNING.gunkCoverageBaseline, 0.05, 0.8)
  const winCoverage = clampValue(FIRST_LEVEL_TUNING.gunkCoverageWin, 0.005, baseline - 0.01)
  return clampValue((baseline - coverage) / Math.max(0.001, baseline - winCoverage), 0, 1)
}

function computeGunkDangerFromCoverage(coverage: number) {
  const baseline = clampValue(FIRST_LEVEL_TUNING.gunkDangerBaseline, 0.05, 0.9)
  const coverageBaseline = clampValue(FIRST_LEVEL_TUNING.gunkCoverageBaseline, 0.05, 0.8)
  const winCoverage = clampValue(FIRST_LEVEL_TUNING.gunkCoverageWin, 0.005, coverageBaseline - 0.01)
  const lossCoverage = clampValue(FIRST_LEVEL_TUNING.gunkCoverageLoss, coverageBaseline + 0.05, 1)
  if (coverage >= coverageBaseline) {
    return clampValue(
      baseline + ((coverage - coverageBaseline) / Math.max(0.001, lossCoverage - coverageBaseline)) * (1 - baseline),
      baseline,
      1,
    )
  }
  return clampValue(
    baseline - ((coverageBaseline - coverage) / Math.max(0.001, coverageBaseline - winCoverage)) * baseline,
    0,
    baseline,
  )
}

function syncLevelCoverageFromMass(state: VacuumRuntime, rawRemainingMass: number) {
  const rawCoverage = computeGunkCoverageFromMass(rawRemainingMass, state.levelStartMass, state.levelGunkOvergrowth)
  const baseline = clampValue(FIRST_LEVEL_TUNING.gunkCoverageBaseline, 0.05, 0.8)
  const lossCoverage = clampValue(FIRST_LEVEL_TUNING.gunkCoverageLoss, baseline + 0.05, 1)
  const coverage = clampValue(rawCoverage, 0, 1)
  state.levelSlimeFloorTakeover = clampValue(Math.max(0, coverage - baseline), 0, lossCoverage - baseline)
  state.levelVisibleGunkCoverage = coverage
  state.levelVisualClearPercent = computeVisualClearFromCoverage(coverage)
  return coverage
}

function computeCompletionWinDrain(state: VacuumRuntime) {
  if (!isFirstLevelMode(state.devMode) || !state.levelCompletionTriggered || state.levelDefeatTriggered) return 0
  return smooth01(
    state.levelCompletionAnimationTime
      / Math.max(0.001, FIRST_LEVEL_TUNING.completionFreezeDuration + FIRST_LEVEL_TUNING.completionBuildDuration),
  )
}

function isVisibleCoverageClear(state: VacuumRuntime) {
  return state.levelVisibleGunkCoverage <= FIRST_LEVEL_TUNING.gunkCoverageWin
}

function computeWaveExhaustionProgress(state: VacuumRuntime) {
  if (!isFirstLevelMode(state.devMode)) return 0
  const fadeSeconds = Math.max(0.001, FIRST_LEVEL_TUNING.waveExhaustionFadeSeconds)
  return smooth01((state.levelTime - state.levelWaveTimeLimit) / fadeSeconds)
}

function isWaveExhaustedForClear(state: VacuumRuntime) {
  return !isFirstLevelMode(state.devMode)
    || computeWaveExhaustionProgress(state) >= clampValue(FIRST_LEVEL_TUNING.waveClearUnlockExhaustion, 0, 1)
}

function computeWaveGenerationMultiplier(state: VacuumRuntime) {
  const exhausted = computeWaveExhaustionProgress(state)
  const postWaveMultiplier = clampValue(FIRST_LEVEL_TUNING.postWaveGenerationMultiplier, 0, 1)
  return clampValue(1 - (1 - postWaveMultiplier) * exhausted, postWaveMultiplier, 1)
}

function canTriggerLevelCompletionFromCoverage(state: VacuumRuntime) {
  return isVisibleCoverageClear(state) && isWaveExhaustedForClear(state)
}

function isVisibleCoverageOvertaken(state: VacuumRuntime) {
  const tideVisibleRatio = state.levelTideVisibleMotes / Math.max(1, LEVEL_TIDE_OVERGROWTH_MOTE_COUNT)
  return state.levelVisibleGunkCoverage >= FIRST_LEVEL_TUNING.gunkCoverageLoss
    && state.levelGunkOvergrowth >= 1
    && tideVisibleRatio >= 0.985
}

function computeMotePileMasses(motes: Mote[], pileCount: number) {
  const masses = Array.from({ length: pileCount }, () => 0)
  for (const mote of motes) {
    if (mote.levelCleared > 0.5) continue
    const pileIndex = ((mote.pileIndex % pileCount) + pileCount) % pileCount
    masses[pileIndex] += computeLevelMoteMass(mote)
  }
  return masses
}

function makeLevelCompletionSummary(state: VacuumRuntime): LevelCompletionSummary {
  const summary = getFlowSessionSummary(state.flowMetrics)
  const currency = state.levelDefeatTriggered && !state.levelCompletionTriggered
    ? { currencyEarned: 0, stylePoints: 0, gunkValue: 0, coinValue: 0 }
    : computeLevelCurrency(state)
  return {
    time: metric(state.levelTime, 2),
    slimeClearedPercent: metric(state.levelCompletionPercent * 100, 1),
    bestChainLength: summary.bestChainLength,
    totalGlugs: summary.totalGlugs,
    attachRatio: metric(summary.attachRatio, 3),
    momentumRetained: metric(summary.averageMomentumRetained, 3),
    bagFillNormalized: metric(state.bagFillNormalized, 3),
    currencyEarned: currency.currencyEarned,
    stylePoints: currency.stylePoints,
    gunkValue: currency.gunkValue,
    coinValue: currency.coinValue,
  }
}

function initializeLevelMassState(state: VacuumRuntime, motes: Mote[], t: number) {
  const pileCount = getModePileCenters(state.devMode).length
  const pileMasses = computeMotePileMasses(motes, pileCount)
  const totalMass = pileMasses.reduce((sum, mass) => sum + mass, 0)
  state.levelPileStartMasses = pileMasses
  state.levelStartMass = totalMass
  state.levelRemainingMass = totalMass
  state.levelCompletionPercent = 0
  state.levelMajorGlobsRemaining = pileMasses.filter((mass) => mass > 0.001).length
  state.levelNearComplete = false
  state.levelCompletionTriggered = false
  state.levelCompletionTriggerTimer = 0
  state.levelCompletionAnimationTime = 0
  state.levelCompletionPhase = 'idle'
  state.levelCompletionPhaseTime = 0
  state.levelCompletionPulse = 0
  state.levelDiscoIntensity = 0
  state.levelCompletionGlow = 0
  state.levelCompletionHoseWobble = 0
  state.levelCompletionVacuumBounce = 0
  state.levelCompletionVacuumSpin = 0
  state.levelCompletionSummaryReady = false
  state.levelCompletionSnapshot = null
  state.levelCompletionSummary = null
  state.levelWaveIndex = getLevelWaveIndex(state.levelDifficulty)
  state.levelWaveTimeLimit = getLevelWaveTimeLimit(state.levelDifficulty)
  state.levelTimeRemaining = state.levelWaveTimeLimit
  state.levelNoCollectionTime = 0
  state.levelNoCollectionPressure = 0
  state.levelSlowCleanupPressure = 0
  state.levelSlowCleanupDeficit = 0
  state.levelLossProgress = 0
  state.levelVisibleGunkCoverage = FIRST_LEVEL_TUNING.gunkCoverageBaseline
  state.levelVisualClearPercent = 0
  state.levelGunkDanger = FIRST_LEVEL_TUNING.gunkDangerBaseline
  state.levelGunkOvergrowth = 0
  state.levelGunkOvergrowthCleanupCredit = 0
  state.levelSlimeFloorTakeover = 0
  state.levelRawVisibleMass = totalMass
  state.levelTideVisibleMotes = 0
  state.levelTideActiveMotes = 0
  state.levelSlimeGenerationRate = 0
  state.levelSlimeGenerationAddedMass = 0
  state.levelSlimeGenerationBudCount = 0
  state.levelSlimeGenerationBudBudget = 0
  state.levelSlimeGenerationActivePieces = 0
  state.levelSlimeGenerationSuppression = 0
  state.levelCollectedMassAtStart = state.bagCollectedMass
  state.levelLastRawCollectedMass = state.bagCollectedMass
  state.levelLastCollectedMass = state.bagCollectedMass
  state.levelLastCleanupProgress = 0
  state.levelNoGunkGraceSeconds = FIRST_LEVEL_TUNING.noCollectionGraceSeconds
    * getLevelDifficultyConfig(state.levelDifficulty).noCollectionGraceScale
  state.levelOvertakePressure = 0
  state.levelOvertakeDanger = 0
  state.levelOvertakePulse = 0
  state.levelDefeatTriggered = false
  state.levelDefeatedAt = -1
  state.levelDefeatAnimationTime = 0
  state.levelDefeatPhase = 'idle'
  state.levelDefeatGunkSpread = 0
  state.levelDefeatVacuumSink = 0
  state.levelShopReady = false
  state.levelCurrencyEarned = 0
  state.levelStylePoints = 0
  state.levelGunkValue = 0
  state.levelCoinValue = 0
  state.levelClearTarget = getLevelCleanupTarget(state.levelDifficulty)
  state.levelProgressTowardTarget = 0
  state.levelRegenRate = 0
  state.levelPartyProgress = 0
  state.levelRegenPressure = 0
  state.levelRegenBank = 0
  state.levelRegenCursor = 0
  state.levelRegeneratedMass = 0
  state.levelCleanupAssist = 0
  state.levelRegenResetPulse = 0
  state.levelReadyAt = t
  state.levelStartedAt = t
  state.levelCompletedAt = -1
  state.levelTime = 0
  state.levelState = isFirstLevelMode(state.devMode) ? 'ready' : 'playing'
  resetFlowMetrics(state.flowMetrics, t)
}

type LevelTriggerOptions = {
  force?: boolean
}

function triggerLevelCompletion(state: VacuumRuntime, t: number, options: LevelTriggerOptions = {}) {
  if (!isFirstLevelMode(state.devMode) || state.levelCompletionTriggered) return
  if (state.levelDefeatTriggered) return
  if (!options.force && !canTriggerLevelCompletionFromCoverage(state)) return
  state.levelCompletionTriggered = true
  state.levelState = 'completing'
  state.levelCompletedAt = t
  state.levelCompletionAnimationTime = 0
  state.levelCompletionPhaseTime = 0
  state.levelCompletionPhase = 'hit'
  state.levelShopReady = false
  const currency = computeLevelCurrency(state)
  state.levelCurrencyEarned = currency.currencyEarned
  state.levelStylePoints = currency.stylePoints
  state.levelGunkValue = currency.gunkValue
  state.levelCoinValue = currency.coinValue
  state.levelVisibleGunkCoverage = Math.min(state.levelVisibleGunkCoverage, FIRST_LEVEL_TUNING.gunkCoverageWin)
  state.levelVisualClearPercent = 1
  state.levelGunkDanger = Math.min(state.levelGunkDanger, computeGunkDangerFromCoverage(state.levelVisibleGunkCoverage))
  state.levelGunkOvergrowth = 0
  state.levelGunkOvergrowthCleanupCredit = 0
  state.levelCompletionSnapshot = getFlowSessionSummary(state.flowMetrics)
  state.levelCompletionSummary = makeLevelCompletionSummary(state)
  state.levelCompletionSummaryReady = false
  state.active = false
  state.pointerDown = false
  state.sealTargetMoteId = -1
  state.sealTargetScore = 0
  state.slimeSealDemand = 0
  state.slimeSealStrength *= 0.32
  state.hoseHookStrength *= 0.42
  state.tetherRelease = Math.max(state.tetherRelease, 0.72)
  state.controllerReleaseMomentum = Math.max(state.controllerReleaseMomentum, 0.58)
  state.controllerReattachGrace = Math.max(state.controllerReattachGrace, 0.42)
  state.flash = Math.min(1.8, state.flash + 1.08)
  state.recoil = Math.min(1.8, state.recoil + 0.54)
  state.gulpFlow = Math.min(2.25, state.gulpFlow + 1.04)
  state.gulpAge = 0
  state.bagQueuedPulse = Math.min(3.1, Math.max(state.bagQueuedPulse, FIRST_LEVEL_TUNING.bagCompletionPulseStrength))
  state.bagQueuedWobble = Math.min(2.65, Math.max(state.bagQueuedWobble, FIRST_LEVEL_TUNING.bagCompletionPulseStrength * 0.82))
  state.bagQueuedBeauty = Math.min(2.05, Math.max(state.bagQueuedBeauty, 1.32))
  state.bagQueuedFullPulse = Math.min(2.0, Math.max(state.bagQueuedFullPulse, 1.38))
  state.bagPulseDelayTimer = Math.max(state.bagPulseDelayTimer, PRODUCTION_TUNING.bag.bagPulseDelay)
  state.bagFullPulse = Math.min(2.05, Math.max(state.bagFullPulse, FIRST_LEVEL_TUNING.bagCompletionPulseStrength))
  state.animationCompletion = Math.max(state.animationCompletion, 1.7)
  state.animationBag = Math.max(state.animationBag, 1.42)
  state.animationRecoil = Math.max(state.animationRecoil, 1.05)
  state.animationBodyJolt = Math.max(state.animationBodyJolt, 1.02)
  state.animationMouthTug = Math.max(state.animationMouthTug, 0.92)
  state.swallowCycles += 1
}

function triggerLevelDefeat(state: VacuumRuntime, t: number, options: LevelTriggerOptions = {}) {
  if (!isFirstLevelMode(state.devMode) || state.levelCompletionTriggered || state.levelDefeatTriggered) return
  if (!options.force && !isVisibleCoverageOvertaken(state)) return
  state.levelDefeatTriggered = true
  state.levelState = 'defeated'
  state.levelDefeatedAt = t
  state.levelDefeatAnimationTime = 0
  state.levelDefeatPhase = 'gulped'
  state.levelOvertakePressure = Math.max(state.levelOvertakePressure, FIRST_LEVEL_TUNING.overtakeLossThreshold)
  state.levelOvertakeDanger = 1
  state.levelOvertakePulse = Math.max(state.levelOvertakePulse, FIRST_LEVEL_TUNING.defeatGunkPulseStrength)
  state.levelNoCollectionTime = Math.max(state.levelNoCollectionTime, state.levelNoGunkGraceSeconds + FIRST_LEVEL_TUNING.noCollectionRampSeconds)
  state.levelNoCollectionPressure = Math.max(state.levelNoCollectionPressure, 1)
  state.levelSlowCleanupPressure = Math.max(state.levelSlowCleanupPressure, 1)
  state.levelSlowCleanupDeficit = Math.max(state.levelSlowCleanupDeficit, 1)
  state.levelLossProgress = 1
  state.levelVisibleGunkCoverage = Math.max(state.levelVisibleGunkCoverage, FIRST_LEVEL_TUNING.gunkCoverageLoss)
  state.levelVisualClearPercent = 0
  state.levelGunkDanger = 1
  state.levelSlimeFloorTakeover = Math.max(state.levelSlimeFloorTakeover, computeSlimeFloorTakeoverCoverage(state))
  state.levelDefeatGunkSpread = Math.max(state.levelDefeatGunkSpread, 0.1)
  state.levelDefeatVacuumSink = 0
  state.levelPartyProgress = 0
  state.levelCompletionPulse = 0
  state.levelDiscoIntensity = 0
  state.levelCompletionGlow = 0
  state.levelCompletionHoseWobble = 0
  state.levelCompletionVacuumBounce = 0
  state.levelCompletionVacuumSpin = 0
  state.levelCompletionPhase = 'idle'
  state.levelShopReady = false
  state.levelCurrencyEarned = 0
  state.levelStylePoints = 0
  state.levelGunkValue = 0
  state.levelCoinValue = 0
  state.levelCompletionSummaryReady = true
  state.levelCompletionSummary = makeLevelCompletionSummary(state)
  state.active = false
  state.pointerDown = false
  state.hoseActive = false
  state.suctionState = 'releasing'
  state.anchorReleaseReason = 'disabled'
  state.anchorQueuedReleaseReason = 'disabled'
  state.sealTargetMoteId = -1
  state.sealTargetScore = 0
  state.slimeSealDemand = 0
  state.slimeSealStrength *= 0.2
  state.hoseHookStrength *= 0.22
  state.tetherRelease = Math.max(state.tetherRelease, 0.88)
  state.controllerReleaseMomentum = Math.max(state.controllerReleaseMomentum, 0.7)
  state.flash = Math.min(state.flash, 0.22)
  state.recoil = Math.min(1.15, Math.max(state.recoil, 0.32))
  state.gulpFlow = 0
  state.gulpAge = 0
  state.bagQueuedPulse = 0
  state.bagQueuedWobble = 0
  state.bagQueuedBeauty = 0
  state.bagQueuedFullPulse = 0
  state.bagPulseDelayTimer = 0
  state.bagPulse = Math.min(state.bagPulse, 0.18)
  state.bagFullPulse = Math.min(state.bagFullPulse, 0.18)
  state.animationCompletion = 0
  state.animationBag = 0
  state.animationRecoil = Math.max(state.animationRecoil, 0.34)
  state.animationBodyJolt = Math.max(state.animationBodyJolt, 1.18)
  state.animationMouthTug = Math.max(state.animationMouthTug, 0.34)
}

function applyVisibleGunkTideGrowth(state: VacuumRuntime, motes: Mote[], piles: SlimePile[], t: number, dt: number) {
  if (!isFirstLevelMode(state.devMode)) return
  const activeWave = state.levelState === 'ready' || state.levelState === 'playing' || state.levelState === 'nearComplete'
  const active = (activeWave && !state.levelCompletionTriggered) || state.levelDefeatTriggered
  if (!active) {
    state.levelTideVisibleMotes = 0
    state.levelTideActiveMotes = 0
    return
  }

  const tide = computeGunkTideProgress(state)
  let visibleTideMotes = 0
  let activeTideMotes = 0

  for (let index = 0; index < motes.length; index += 1) {
    const mote = motes[index]
    const overgrowthMote = isTideOvergrowthMoteIndex(index)
    const bigColonyMote = isBigSlimeColonyMoteIndex(index)
    const activation = computeTideMoteActivation(state, index)
    if (overgrowthMote && activation > 0.035) activeTideMotes += 1
    if (mote.levelCleared > 0.5) continue

    const baseMass = 0.84 + seededNoise(mote.seed + 64.2) * 0.34
    const organicGrowthTarget = Math.max(0, mote.growthTarget)
    const targetVisible = Math.max(computeTideVisibleMassTarget(state, index), organicGrowthTarget)
    const targetMass = computeTideMassTarget(state, index, baseMass)
    if (overgrowthMote) {
      const targetHome = resolveTideMoteHome(state, index, t, tideMoteTargetVector)
      mote.pileIndex = resolveTidePileIndex(state, index)
      if (mote.visibleMass < 0.012 && targetVisible > 0.014) {
        const emergenceVisibleMass = Math.min(
          targetVisible,
          bigColonyMote ? 0.72 + activation * 0.38 : 0.26 + activation * 0.28,
        )
        mote.home.copy(targetHome)
        mote.anchor.copy(targetHome)
        mote.position.copy(targetHome)
        mote.visibleMass = Math.max(mote.visibleMass, emergenceVisibleMass)
        mote.mass = Math.max(mote.mass, bigColonyMote ? 0.96 + activation * 0.68 : 0.3 + activation * 0.34)
        mote.growthTarget = Math.max(mote.growthTarget, Math.min(bigColonyMote ? 1.3 : 1.06, emergenceVisibleMass + (bigColonyMote ? 0.62 : 0.46)))
        mote.popDuration = Math.max(mote.popDuration, 0.24 + activation * 0.18)
        mote.popAge = Math.max(mote.popAge, mote.popDuration * 0.34)
        mote.reemergeCharge = Math.max(mote.reemergeCharge, bigColonyMote ? 0.52 + activation * 0.36 : 0.2 + activation * 0.26)
        mote.growthWake = Math.max(mote.growthWake, bigColonyMote ? 0.74 + activation * 0.4 : 0.46 + activation * 0.34)
        mote.livingCongeal = Math.max(mote.livingCongeal, bigColonyMote ? 0.7 + activation * 0.46 : 0.36 + activation * 0.4)
        mote.mound = Math.max(mote.mound, bigColonyMote ? 0.72 + activation * 0.46 : 0.32 + activation * 0.4)
      } else {
        mote.home.lerp(targetHome, Math.min(1, dt * (0.42 + tide * 0.42)))
        if (mote.visibleMass < 0.12) mote.position.lerp(mote.home, Math.min(1, dt * 2.6))
      }
      if (activation <= 0.001 && !state.levelDefeatTriggered && organicGrowthTarget <= 0.025) {
        mote.visibleMass = damp(mote.visibleMass, 0, 3.6, dt)
        mote.mass = damp(mote.mass, 0.08, 2.2, dt)
        continue
      }
    }

    const activelyDraining = mote.latched > 0.5
      || mote.intakeFeed > 0.04
      || mote.attachmentMassTransferred > 0.012
      || mote.absorbTarget > 0.08
      || state.levelCompletionTriggered
    const visibleRate = targetVisible > mote.visibleMass
      ? (overgrowthMote ? 1.38 + Math.max(activation, organicGrowthTarget) * (bigColonyMote ? 2.35 : 1.8) : 0.84 + tide * 1.1)
      : 1.8
    if (!activelyDraining || state.levelDefeatTriggered) {
      mote.visibleMass = damp(
        mote.visibleMass,
        targetVisible,
        visibleRate,
        dt,
      )
    }
    const defendedMassTarget = state.levelDefeatTriggered
      ? targetMass
      : overgrowthMote
        ? targetMass
        : Math.max(mote.mass, targetMass)
    mote.mass = damp(
      mote.mass,
      defendedMassTarget,
      defendedMassTarget > mote.mass ? 0.68 + tide * 0.92 : 2.5,
      dt,
    )
    if (mote.visibleMass > 0.06) {
      visibleTideMotes += overgrowthMote ? 1 : 0
      mote.growthWake = Math.max(mote.growthWake, (tide * 0.18 + activation * 0.26) * dt * 4.8)
      mote.livingPulse = Math.max(mote.livingPulse, tide * 0.22 + activation * (bigColonyMote ? 0.32 : 0.22))
      mote.livingCreep = Math.max(mote.livingCreep, tide * 0.2 + activation * (bigColonyMote ? 0.34 : 0.24))
      mote.livingCongeal = Math.max(mote.livingCongeal, tide * 0.28 + activation * (bigColonyMote ? 0.48 : 0.3))
      mote.colorBloom = Math.max(mote.colorBloom, tide * 0.12 + activation * (bigColonyMote ? 0.22 : 0.15))
      mote.mound = Math.max(mote.mound, tide * 0.32 + activation * (bigColonyMote ? 0.56 : 0.34))
    }
  }

  for (const pile of piles) {
    pile.livingCreep = Math.max(pile.livingCreep, tide * 0.2)
    pile.livingCongeal = Math.max(pile.livingCongeal, tide * 0.18)
    pile.livingPulse = Math.max(pile.livingPulse, tide * 0.14)
    pile.targetChroma += tide * 0.05
  }

  state.levelTideVisibleMotes = visibleTideMotes
  state.levelTideActiveMotes = activeTideMotes
}

function findContinuousSlimeBudSlot(state: VacuumRuntime, motes: Mote[], parent: Mote, parentIndex: number, t: number) {
  const start = Math.floor(seededNoise(parent.seed + t * 0.29 + parentIndex * 0.13) * motes.length) % motes.length
  for (let attempts = 0; attempts < motes.length; attempts += 1) {
    const index = (start + attempts * 37) % motes.length
    if (index === parentIndex) continue
    const candidate = motes[index]
    const overgrowthCandidate = isTideOvergrowthMoteIndex(index)
    const dormant = candidate.levelCleared > 0.5
      || candidate.visibleMass < 0.022
      || (overgrowthCandidate && candidate.growthTarget < 0.04 && candidate.visibleMass < 0.07)
    if (!dormant) continue
    if (candidate.latched > 0.5 || candidate.intakeFeed > 0.03 || candidate.flowBridge > 0.05) continue
    const mouthDistance = Math.hypot(candidate.position.x - state.mouth.x, candidate.position.z - state.mouth.z)
    if (mouthDistance < PRODUCTION_TUNING.livingSlime.slimeGrowthSuppressionRadius * 0.55) continue
    return index
  }
  return -1
}

function seedContinuousSlimeBud(child: Mote, parent: Mote, state: VacuumRuntime, t: number, childIndex: number) {
  spawnMote(child, state, t + childIndex * 0.013, childIndex)
  child.levelCleared = 0
  child.pileIndex = parent.pileIndex
  child.palette = parent.palette
  child.spawnHue = parent.spawnHue
  child.pigmentHue = lerpWrappedHue(parent.pigmentHue, seededNoise(child.seed + t * 0.17), 0.18)

  const tuning = PRODUCTION_TUNING.livingSlime
  const parentColonyStrength = smooth01((parent.visibleMass + parent.mass - 0.82) / 1.18)
  const satelliteBud = parentColonyStrength > 0.12
    && seededNoise(child.seed + childIndex * 0.37 + t * 0.19) > 0.28
  const pileCenter = getModePileCenter(state.devMode, parent.pileIndex, pileVector)
  slimeBudDirectionVector.copy(parent.position).sub(pileCenter)
  slimeBudDirectionVector.y = 0
  if (slimeBudDirectionVector.lengthSq() < 0.0001) {
    const angle = parent.seed * 2.399963229728653 + seededNoise(child.seed + t * 0.11) * Math.PI * 2
    slimeBudDirectionVector.set(Math.cos(angle), 0, Math.sin(angle))
  } else {
    slimeBudDirectionVector.normalize()
    const angleOffset = (seededNoise(child.seed + 42.7 + t * 0.07) - 0.5) * Math.PI * 0.72
    const cos = Math.cos(angleOffset)
    const sin = Math.sin(angleOffset)
    const x = slimeBudDirectionVector.x
    const z = slimeBudDirectionVector.z
    slimeBudDirectionVector.set(x * cos - z * sin, 0, x * sin + z * cos)
  }

  if (satelliteBud) {
    const satelliteAngle = child.seed * 3.883222077
      + seededNoise(child.seed + t * 0.07) * Math.PI * 2
      + state.levelSlimeGenerationBudCount * 0.23
    const satelliteRing = ARENA_PLAYABLE_RADIUS
      * FIRST_LEVEL_TUNING.gunkTideSpreadRadius
      * (0.14 + Math.sqrt(seededNoise(child.seed + 115.2)) * 0.8)
    slimeBudTargetVector.set(
      Math.cos(satelliteAngle) * satelliteRing,
      SLIME_MOTE_FLOOR_Y + child.size * 0.42,
      Math.sin(satelliteAngle + Math.sin(t * 0.08 + child.seed) * 0.12) * satelliteRing,
    )
    const mouthDistance = Math.hypot(
      slimeBudTargetVector.x - state.mouth.x,
      slimeBudTargetVector.z - state.mouth.z,
    )
    if (mouthDistance < tuning.slimeGrowthSuppressionRadius * 0.72) {
      slimeBudTargetVector.x += slimeBudDirectionVector.x * tuning.slimeGrowthSuppressionRadius * 0.92
      slimeBudTargetVector.z += slimeBudDirectionVector.z * tuning.slimeGrowthSuppressionRadius * 0.92
    }
  } else {
    const budDistance = tuning.slimeBudSpawnRadius
      * (0.52 + seededNoise(child.seed + 75.4) * 1)
      * (1 + parentColonyStrength * 0.7)
    slimeBudTargetVector.copy(parent.position).addScaledVector(slimeBudDirectionVector, budDistance)
  }
  slimeBudTargetVector.y = SLIME_MOTE_FLOOR_Y + child.size * 0.42
  clampSlimeFloorPoint(slimeBudTargetVector)
  slimeBudTargetVector.y = SLIME_MOTE_FLOOR_Y + child.size * 0.42

  child.home.copy(slimeBudTargetVector)
  child.anchor.copy(slimeBudTargetVector)
  child.position.copy(parent.position).lerp(slimeBudTargetVector, satelliteBud ? 0.12 : 0.2)
  child.position.y = SLIME_MOTE_FLOOR_Y + child.size * 0.42
  child.velocity.copy(slimeBudDirectionVector).multiplyScalar(
    (satelliteBud ? 0.18 : 0.12) + seededNoise(child.seed + 88.1) * 0.1,
  )
  child.velocity.y = 0.04 + seededNoise(child.seed + 91.4) * 0.055
  const seededBudMass = tuning.slimeBudMinMass
    + seededNoise(child.seed + 96.2) * Math.max(0, tuning.slimeBudMaxMass - tuning.slimeBudMinMass)
  child.mass = Math.min(
    1.58,
    seededBudMass + parentColonyStrength * 0.5 + (satelliteBud ? 0.24 : 0),
  )
  child.visibleMass = Math.max(
    PRODUCTION_TUNING.suction.slimeVacuumableVisibleThreshold * 4.5,
    0.36
      + seededNoise(child.seed + 99.4) * 0.24
      + parentColonyStrength * 0.32
      + (satelliteBud ? 0.16 : 0),
  )
  child.growthTarget = Math.min(
    1.3,
    child.visibleMass
      + 0.5
      + parentColonyStrength * 0.36
      + seededNoise(child.seed + 101.8) * 0.26,
  )
  child.growthEnergy = 0
  child.growthCooldown = tuning.slimePostGlugGrowthCooldown * 0.12
  child.generationPulse = Math.max(child.generationPulse, tuning.slimeGrowthVisualPulseStrength)
  child.growthWake = Math.max(child.growthWake, 0.78 + parentColonyStrength * 0.28)
  child.materialWake = Math.max(child.materialWake, 0.72 + parentColonyStrength * 0.22)
  child.reemergeCharge = Math.max(child.reemergeCharge, 0.8)
  child.livingPulse = Math.max(child.livingPulse, 0.68 + parentColonyStrength * 0.2)
  child.livingCreep = Math.max(child.livingCreep, 0.58 + parentColonyStrength * 0.24)
  child.livingCongeal = Math.max(child.livingCongeal, 0.76 + parentColonyStrength * 0.3)
  child.colorBloom = Math.max(child.colorBloom, 0.54 + parentColonyStrength * 0.18)
  child.mound = Math.max(child.mound, 0.7 + parentColonyStrength * 0.28)
  child.popDuration = Math.max(child.popDuration, tuning.slimeBudMatureTime)
  child.popAge = child.popDuration * (satelliteBud ? 0.24 : 0.32)
}

function applyContinuousSlimeGeneration(state: VacuumRuntime, motes: Mote[], piles: SlimePile[], t: number, dt: number) {
  if (!isFirstLevelMode(state.devMode)) return
  const tuning = PRODUCTION_TUNING.livingSlime
  const activeWave = state.levelState === 'ready' || state.levelState === 'playing' || state.levelState === 'nearComplete'
  const active = Boolean(tuning.slimeGenerationEnabled)
    && activeWave
    && !state.levelCompletionTriggered
    && !state.levelDefeatTriggered
  if (!active) {
    state.levelSlimeGenerationRate = 0
    state.levelSlimeGenerationActivePieces = 0
    state.levelSlimeGenerationSuppression = damp(state.levelSlimeGenerationSuppression, 1, 3.2, dt)
    state.levelSlimeGenerationBudBudget = 0
    for (const mote of motes) {
      mote.growthTarget = damp(mote.growthTarget, 0, 2.8, dt)
      mote.growthEnergy = Math.max(0, mote.growthEnergy - dt * 0.12)
      mote.growthCooldown = Math.max(0, mote.growthCooldown - dt)
      mote.generationPulse = damp(mote.generationPulse, 0, 3.4, dt)
    }
    return
  }

  const visibleThreshold = PRODUCTION_TUNING.suction.slimeVacuumableVisibleThreshold
  let currentMass = 0
  let activePieces = 0
  for (const mote of motes) {
    const moteMass = computeLevelMoteMass(mote)
    currentMass += moteMass
    if (mote.levelCleared < 0.5 && (mote.visibleMass > visibleThreshold || mote.growthTarget > visibleThreshold)) {
      activePieces += 1
    }
  }

  const startMass = Math.max(0.001, state.levelStartMass)
  const maxTotalMass = startMass * tuning.slimeMaxTotalMassScale
  const capPressure = smooth01(
    (currentMass - maxTotalMass * 0.86)
      / Math.max(0.001, maxTotalMass * 0.14),
  )
  const capMultiplier = clampValue(1 - capPressure, 0, 1)
  const waveExhaustedForCleanup = isWaveExhaustedForClear(state)
  const waveGenerationMultiplier = computeWaveGenerationMultiplier(state)
  const nearCompleteMultiplier = waveExhaustedForCleanup && (state.levelNearComplete || state.levelVisualClearPercent > 0.82)
    ? tuning.slimeNearCompleteGrowthMultiplier
    : 1
  const playerCleanupActive = state.pointerDown
    || state.hoseActive
    || state.suctionState === 'sealed'
    || state.hoseHookStrength > 0.08
    || state.slimeSealStrength > 0.08
  const ignoredMultiplier = playerCleanupActive
    ? 0.96
    : tuning.slimeIgnoredGrowthMultiplier
      * (0.96 + smooth01((state.levelTime + 2.5) / 5.5) * 0.12)
      * (1 + clampValue(state.levelNoCollectionPressure, 0, 1) * 0.12)
      * (1 + clampValue(state.levelSlowCleanupPressure, 0, 1) * 0.1)
  const tideLift = 1 + smooth01(state.levelGunkOvergrowth) * 0.34
  const earlyGrowthKick = 1 + (1 - smooth01(state.levelTime / 8)) * 0.58
  const baseGrowthRate = tuning.slimeBaseGrowthRate
    * ignoredMultiplier
    * nearCompleteMultiplier
    * capMultiplier
    * tideLift
    * earlyGrowthKick
    * waveGenerationMultiplier

  state.levelSlimeGenerationBudBudget = Math.min(
    16,
    state.levelSlimeGenerationBudBudget
      + dt
        * tuning.slimeBudSpawnChance
        * (playerCleanupActive ? 1.55 : 2.65)
        * nearCompleteMultiplier
        * capMultiplier
        * waveGenerationMultiplier
        * (activePieces < tuning.slimeMaxActivePieces ? 1 : 0),
  )

  let addedMass = 0
  let suppressionTotal = 0
  let growthCandidates = 0
  let buds = 0
  const maxBudsThisFrame = Math.min(7, Math.floor(state.levelSlimeGenerationBudBudget))

  for (let index = 0; index < motes.length; index += 1) {
    const mote = motes[index]
    mote.growthCooldown = Math.max(0, mote.growthCooldown - dt)
    mote.generationPulse = damp(mote.generationPulse, 0, 3.4, dt)
    if (mote.levelCleared > 0.5) continue

    const activelyDraining = mote.latched > 0.5
      || mote.intakeFeed > 0.035
      || mote.attachmentMassTransferred > 0.01
      || mote.glugPulse > 0.08
      || mote.completionCleanup > 0.03
    if (activelyDraining) {
      mote.growthCooldown = Math.max(mote.growthCooldown, tuning.slimePostGlugGrowthCooldown)
      mote.growthTarget = Math.min(mote.growthTarget, mote.visibleMass)
      mote.growthEnergy = Math.max(0, mote.growthEnergy - dt * 0.4)
      continue
    }

    const visible = mote.visibleMass > visibleThreshold || mote.growthTarget > visibleThreshold
    if (!visible) continue

    const mouthDistance = Math.hypot(mote.position.x - state.mouth.x, mote.position.z - state.mouth.z)
    const nearMouth = smooth01(
      (tuning.slimeGrowthSuppressionRadius - mouthDistance)
        / Math.max(0.001, tuning.slimeGrowthSuppressionRadius),
    )
    const suctionSuppression = (state.hoseActive || state.pointerDown || state.suctionState !== 'free' || state.hoseHookStrength > 0.08)
      ? tuning.slimeSuctionGrowthSuppression
      : 0
    const cooldownSuppression = smooth01(mote.growthCooldown / Math.max(0.001, tuning.slimePostGlugGrowthCooldown))
    const suppression = clampValue(
      nearMouth * tuning.slimeNearVacuumGrowthSuppression
        + nearMouth * suctionSuppression
        + cooldownSuppression * 0.42,
      0,
      0.72,
    )
    suppressionTotal += suppression
    growthCandidates += 1
    const localGrowthMultiplier = (1 - suppression)
      * (0.7 + mote.visibleMass * tuning.slimeGrowthByMassScale)
      * (0.86 + seededNoise(mote.seed + t * 0.21) * tuning.slimeGrowthNoiseStrength)
    const growth = baseGrowthRate * localGrowthMultiplier * dt
    if (growth <= 0.000001) continue

    const beforeMass = computeLevelMoteMass(mote)
    const overgrowthMote = isTideOvergrowthMoteIndex(index)
    const bigColonyMote = isBigSlimeColonyMoteIndex(index)
    const visibleCap = overgrowthMote ? (bigColonyMote ? 1.28 : 1.02) : 1.42
    const massCap = overgrowthMote ? tuning.slimeBudMaxMass * (bigColonyMote ? 2.7 : 2.18) : 1.78
    const colonyMultiplier = bigColonyMote ? 1.32 : 1
    mote.visibleMass = Math.min(visibleCap, mote.visibleMass + growth * tuning.slimeLobeExpansionRate * 5.8 * colonyMultiplier)
    mote.mass = Math.min(massCap, mote.mass + growth * (0.72 + mote.visibleMass * 0.16))
    mote.growthTarget = Math.max(mote.growthTarget, Math.min(visibleCap, mote.visibleMass + growth * 3.4))
    mote.growthEnergy += growth
      * (2.2 + mote.visibleMass * 1.05)
      * (overgrowthMote ? (bigColonyMote ? 1.72 : 1.08) : 1.42)
    mote.generationPulse = Math.max(mote.generationPulse, Math.min(1, growth * 24) * tuning.slimeGrowthVisualPulseStrength)
    mote.growthWake = Math.max(mote.growthWake, Math.min(0.52, growth * 12))
    mote.livingPulse = Math.max(mote.livingPulse, Math.min(0.58, growth * 14))
    mote.livingCreep = Math.max(mote.livingCreep, Math.min(0.5, growth * 13 + tuning.slimeEdgeCreepRate * 0.025))
    mote.livingCongeal = Math.max(mote.livingCongeal, Math.min(bigColonyMote ? 0.68 : 0.52, growth * 14))
    mote.colorBloom = Math.max(mote.colorBloom, Math.min(0.34, growth * 8))
    mote.mound = Math.max(mote.mound, Math.min(bigColonyMote ? 0.68 : 0.52, growth * 14))
    addedMass += Math.max(0, computeLevelMoteMass(mote) - beforeMass)

    if (
      buds < maxBudsThisFrame
      && state.levelSlimeGenerationBudBudget >= 1
      && activePieces + buds < tuning.slimeMaxActivePieces
      && mote.growthEnergy >= tuning.slimeBudThreshold
      && (mote.visibleMass > 0.1 || mote.mass > 0.42)
      && nearMouth < 0.28
      && !state.levelNearComplete
    ) {
      const childIndex = findContinuousSlimeBudSlot(state, motes, mote, index, t)
      if (childIndex >= 0) {
        const child = motes[childIndex]
        const beforeChildMass = computeLevelMoteMass(child)
        seedContinuousSlimeBud(child, mote, state, t, childIndex)
        mote.growthEnergy = Math.max(
          0,
          mote.growthEnergy - tuning.slimeBudThreshold * (0.74 + (bigColonyMote ? 0.16 : 0.32)),
        )
        mote.growthCooldown = Math.max(mote.growthCooldown, tuning.slimePostGlugGrowthCooldown * 0.22)
        state.levelSlimeGenerationBudBudget -= 1
        addedMass += Math.max(0, computeLevelMoteMass(child) - beforeChildMass)
        activePieces += 1
        buds += 1
      }
    }
  }

  for (const pile of piles) {
    pile.livingPulse = Math.max(pile.livingPulse, baseGrowthRate * 2.2)
    pile.livingCreep = Math.max(pile.livingCreep, baseGrowthRate * 2.6)
    pile.livingCongeal = Math.max(pile.livingCongeal, baseGrowthRate * 1.9)
    pile.targetChroma += baseGrowthRate * 0.08
  }

  state.levelSlimeGenerationRate = baseGrowthRate
  state.levelSlimeGenerationAddedMass += addedMass
  state.levelSlimeGenerationBudCount += buds
  state.levelSlimeGenerationActivePieces = activePieces
  state.levelSlimeGenerationSuppression = growthCandidates > 0 ? suppressionTotal / growthCandidates : 0
}

function applyFirstLevelRegeneration(state: VacuumRuntime, motes: Mote[], t: number, dt: number) {
  if (!isFirstLevelMode(state.devMode)) return
  const active = (state.levelState === 'playing' || state.levelState === 'nearComplete')
    && !state.levelCompletionTriggered
    && state.levelTime >= FIRST_LEVEL_TUNING.regenGraceSeconds
  const config = getLevelDifficultyConfig(state.levelDifficulty)
  const progressTowardTarget = clampValue(state.levelProgressTowardTarget, 0, 1.25)
  const regenStartProgress = getLevelRegenStartProgress(state.levelDifficulty)
  const noCollectionPressure = clampValue(state.levelNoCollectionPressure * config.noCollectionPressureScale, 0, 1.35)
  const slowCleanupPressure = clampValue(state.levelSlowCleanupPressure * (config.slowCleanupPressureScale ?? 1), 0, 1.35)
  const lossPressure = clampValue(state.levelLossProgress, 0, 1.35)
  if (!active) {
    state.levelRegenPressure = damp(state.levelRegenPressure, 0, 3.8, dt)
    state.levelRegenBank = Math.max(0, state.levelRegenBank - dt * 0.65)
    state.levelRegenResetPulse = damp(state.levelRegenResetPulse, 0, 5.0, dt)
    state.levelRegenRate = 0
    return
  }

  const rawProgressGate = clampValue(
    (progressTowardTarget - regenStartProgress)
      / Math.max(0.001, 1 - regenStartProgress),
    0,
    1,
  )
  const progressGate = Math.max(smooth01(rawProgressGate), rawProgressGate * 0.42)
  const pressureTarget = (
    progressGate * config.regenPressureScale * (0.62 + progressTowardTarget * 0.46)
      + noCollectionPressure * 0.64
      + slowCleanupPressure * FIRST_LEVEL_TUNING.slowCleanupRegenBoost
      + lossPressure * 0.36
  )
  state.levelRegenPressure = damp(
    state.levelRegenPressure,
    pressureTarget,
    pressureTarget > state.levelRegenPressure ? 2.8 : 5.0,
    dt,
  )
  const activeSuction = state.suctionState !== 'free' || state.hoseHookStrength > 0.08 || state.slimeSealStrength > 0.08
  const playerPressing = state.bodyInputActive || state.pointerDown || state.hoseActive || activeSuction
  const idleRegrowth = playerPressing ? 1 : FIRST_LEVEL_TUNING.regenIdleMultiplier
  const noCollectionRegenBoost = 1
    + noCollectionPressure * FIRST_LEVEL_TUNING.noCollectionRegenBoost
    + slowCleanupPressure * FIRST_LEVEL_TUNING.slowCleanupRegenBoost
    + lossPressure * 0.64
  const regenRate = config.regenerationRate * state.levelRegenPressure * idleRegrowth * noCollectionRegenBoost
  state.levelRegenRate = regenRate
  if (regenRate <= 0.0001) return

  let regeneratedMass = 0
  for (let index = 0; index < motes.length; index += 1) {
    const mote = motes[index]
    if (mote.levelCleared > 0.5) continue
    const before = computeLevelMoteMass(mote)
    const tideVisibleLimit = isFirstLevelMode(state.devMode)
      ? Math.max(1, computeTideVisibleMassTarget(state, index))
      : 1
    const tideMassLimit = isFirstLevelMode(state.devMode)
      ? Math.max(1.05, computeTideMassTarget(state, index, 0.84 + seededNoise(mote.seed + 64.2) * 0.34))
      : 1.05
    const visibleDeficit = Math.max(0, tideVisibleLimit - mote.visibleMass)
    const restore = regenRate
      * dt
      * (0.18 + visibleDeficit * 0.82)
      * (0.84 + seededNoise(mote.seed + t * 0.17) * 0.32)
    mote.visibleMass = Math.min(tideVisibleLimit, mote.visibleMass + restore)
    mote.mass = Math.max(mote.mass, Math.min(tideMassLimit, mote.visibleMass + restore * 0.28))
    mote.colorBloom = Math.max(mote.colorBloom, restore * (2.4 + noCollectionPressure * 1.4))
    mote.reemergeCharge = Math.max(mote.reemergeCharge, restore * (1.6 + noCollectionPressure * 0.9))
    regeneratedMass += Math.max(0, computeLevelMoteMass(mote) - before)
  }

  const regenBankPieceScale = Math.sqrt(motes.length)
  state.levelRegenBank += regenRate * dt * regenBankPieceScale * (0.34 + progressGate * 0.52 + noCollectionPressure * 0.32)
  state.levelRegenBank = Math.min(state.levelRegenBank, FIRST_LEVEL_TUNING.regenBankReviveCost * config.reviveCostScale * 1.35)
  let attempts = 0
  const reviveCost = FIRST_LEVEL_TUNING.regenBankReviveCost * config.reviveCostScale
  let revives = 0
  const maxRevives = 1
  while (state.levelRegenBank >= reviveCost && attempts < motes.length && revives < maxRevives) {
    const index = state.levelRegenCursor % motes.length
    const mote = motes[index]
    state.levelRegenCursor = (state.levelRegenCursor + 1) % motes.length
    attempts += 1
    if (mote.levelCleared <= 0.5 && mote.visibleMass > 0.3) continue
    const before = computeLevelMoteMass(mote)
    if (mote.levelCleared > 0.5) {
      spawnMote(mote, state, t + index * 0.017, index)
      mote.visibleMass = FIRST_LEVEL_TUNING.regenReviveVisibleMass
      mote.mass = Math.max(mote.mass, FIRST_LEVEL_TUNING.regenReviveVisibleMass + 0.18)
      mote.popDuration = Math.max(mote.popDuration, 0.58)
    } else {
      const tideVisibleLimit = isFirstLevelMode(state.devMode)
        ? Math.max(0.62, computeTideVisibleMassTarget(state, index))
        : 0.62
      mote.visibleMass = Math.min(tideVisibleLimit, mote.visibleMass + FIRST_LEVEL_TUNING.regenReviveVisibleMass * 0.46)
      mote.mass = Math.max(mote.mass, mote.visibleMass + 0.08)
      mote.popAge = Math.max(0, mote.popAge)
    }
    mote.colorBloom = Math.max(mote.colorBloom, 0.46)
    mote.reemergeCharge = Math.max(mote.reemergeCharge, 0.42)
    regeneratedMass += Math.max(0, computeLevelMoteMass(mote) - before)
    state.levelRegenBank -= reviveCost
    revives += 1
  }

  if (regeneratedMass > 0) {
    state.levelRegeneratedMass += regeneratedMass
  }
}

function updateFirstLevelProgress(state: VacuumRuntime, motes: Mote[], t: number, dt: number) {
  if (!isFirstLevelMode(state.devMode)) return

  if (state.levelState === 'ready' && (t - state.levelReadyAt > 0.24 || state.pointerDown || state.active)) {
    state.levelState = 'playing'
    state.levelStartedAt = t
    state.levelTime = 0
    resetFlowMetrics(state.flowMetrics, t)
  }

  const pileCount = getModePileCenters(state.devMode).length
  const pileMasses = computeMotePileMasses(motes, pileCount)
  const rawRemainingMass = pileMasses.reduce((sum, mass) => sum + mass, 0)
  const startMass = Math.max(0.001, state.levelStartMass)
  const remainingMass = rawRemainingMass
  const remainingFraction = remainingMass / startMass
  const rawRemainingFraction = rawRemainingMass / startMass
  const visibleGunkCoverage = syncLevelCoverageFromMass(state, rawRemainingMass)
  const visualClearPercent = state.levelVisualClearPercent
  const config = getLevelDifficultyConfig(state.levelDifficulty)
  const cleanupTarget = getLevelCleanupTarget(state.levelDifficulty)
  const playerCleanupActive = state.pointerDown
    || state.hoseActive
    || state.bodyInputActive
    || state.suctionState === 'sealed'
    || state.hoseHookStrength > 0.08
    || state.slimeSealStrength > 0.08
  const rawBagGain = Math.max(0, state.bagCollectedMass - state.levelLastRawCollectedMass)
  if (rawBagGain > 0.0001 && !playerCleanupActive) {
    state.levelCollectedMassAtStart = Math.min(
      state.bagCollectedMass,
      state.levelCollectedMassAtStart + rawBagGain,
    )
  }
  state.levelLastRawCollectedMass = state.bagCollectedMass
  const completionPercent = visualClearPercent
  const progressTowardTarget = clampValue(completionPercent, 0, 1.35)
  let majorGlobsRemaining = 0
  for (let index = 0; index < pileCount; index += 1) {
    const startingPileMass = Math.max(0.001, state.levelPileStartMasses[index] ?? state.levelStartMass / Math.max(1, pileCount))
    const relativeMass = pileMasses[index] / startingPileMass
    if (relativeMass > FIRST_LEVEL_TUNING.majorGlobClearThreshold && pileMasses[index] > 0.42) {
      majorGlobsRemaining += 1
    }
  }

  state.levelRemainingMass = remainingMass
  state.levelRawVisibleMass = rawRemainingMass
  state.levelCompletionPercent = completionPercent
  state.levelClearTarget = cleanupTarget
  state.levelProgressTowardTarget = progressTowardTarget
  state.levelMajorGlobsRemaining = majorGlobsRemaining
  state.levelTime = Math.max(0, t - state.levelStartedAt)
  state.levelWaveIndex = getLevelWaveIndex(state.levelDifficulty)
  state.levelWaveTimeLimit = getLevelWaveTimeLimit(state.levelDifficulty)
  state.levelNoGunkGraceSeconds = FIRST_LEVEL_TUNING.noCollectionGraceSeconds * config.noCollectionGraceScale
  state.levelTimeRemaining = Math.max(0, state.levelWaveTimeLimit - state.levelTime)
  const waveProgress = clampValue(state.levelTime / Math.max(0.001, state.levelWaveTimeLimit), 0, 1.25)
  const waveExhaustedForCleanup = isWaveExhaustedForClear(state)
  const waveExhaustionProgress = computeWaveExhaustionProgress(state)
  const nearCompleteByCoverage = progressTowardTarget >= Math.max(0.1, 1 - FIRST_LEVEL_TUNING.nearCompleteTargetOffset) || majorGlobsRemaining <= 1
  state.levelNearComplete = waveExhaustedForCleanup && nearCompleteByCoverage
  if (state.levelState === 'playing' && state.levelNearComplete) state.levelState = 'nearComplete'
  if (state.levelState === 'nearComplete' && !state.levelNearComplete && !state.levelCompletionTriggered) state.levelState = 'playing'
  const activeWave = (state.levelState === 'playing' || state.levelState === 'nearComplete')
    && !state.levelCompletionTriggered
    && !state.levelDefeatTriggered
  const slowCleanupGraceProgress = clampValue(FIRST_LEVEL_TUNING.slowCleanupGraceProgress, 0, 0.92)
  const slowCleanupProgressWindow = Math.max(0.001, 1 - slowCleanupGraceProgress)
  const slowCleanupExpectedProgress = Math.pow(
    smooth01((waveProgress - slowCleanupGraceProgress) / slowCleanupProgressWindow),
    Math.max(0.25, FIRST_LEVEL_TUNING.slowCleanupExpectedCurve),
  )
  const slowCleanupBuffer = FIRST_LEVEL_TUNING.slowCleanupProgressBuffer * (config.slowCleanupBufferScale ?? 1)
  const slowCleanupDeficit = clampValue(slowCleanupExpectedProgress - progressTowardTarget - slowCleanupBuffer, 0, 1.3)
  const slowCleanupPressureTarget = clampValue(
    slowCleanupDeficit * (config.slowCleanupPressureScale ?? 1),
    0,
    1.45,
  )
  state.levelSlowCleanupDeficit = damp(
    state.levelSlowCleanupDeficit,
    activeWave ? slowCleanupDeficit : 0,
    activeWave ? 4.8 : 2.3,
    dt,
  )
  if (activeWave) {
    const slowCleanupRise = FIRST_LEVEL_TUNING.slowCleanupPressureRise
    const slowCleanupFall = FIRST_LEVEL_TUNING.slowCleanupPressureFall
    state.levelSlowCleanupPressure = damp(
      state.levelSlowCleanupPressure,
      slowCleanupPressureTarget,
      slowCleanupPressureTarget > state.levelSlowCleanupPressure ? slowCleanupRise : slowCleanupFall,
      dt,
    )
  } else if (state.levelDefeatTriggered) {
    state.levelSlowCleanupPressure = Math.max(state.levelSlowCleanupPressure, 1)
    state.levelSlowCleanupDeficit = Math.max(state.levelSlowCleanupDeficit, 1)
  } else {
    state.levelSlowCleanupPressure = damp(state.levelSlowCleanupPressure, 0, FIRST_LEVEL_TUNING.slowCleanupPressureFall, dt)
    state.levelSlowCleanupDeficit = damp(state.levelSlowCleanupDeficit, 0, FIRST_LEVEL_TUNING.slowCleanupPressureFall, dt)
  }
  const collectedMassDelta = playerCleanupActive
    ? Math.max(0, state.bagCollectedMass - state.levelLastCollectedMass)
    : 0
  const cleanupProgressDelta = Math.max(0, progressTowardTarget - state.levelLastCleanupProgress)
  const collectedGunkRegistered = collectedMassDelta >= FIRST_LEVEL_TUNING.noCollectionMassEpsilon
  const visibleCleanupRegistered = playerCleanupActive
    && cleanupProgressDelta >= FIRST_LEVEL_TUNING.noCollectionProgressEpsilon
  const cleanupRegistered = collectedGunkRegistered || visibleCleanupRegistered
  const meaningfulCleanup = cleanupRegistered
  if (activeWave) {
    if (state.levelTime < state.levelNoGunkGraceSeconds) {
      state.levelNoCollectionTime = 0
      state.levelNoCollectionPressure = damp(state.levelNoCollectionPressure, 0, FIRST_LEVEL_TUNING.noCollectionPressureFall, dt)
    } else {
      if (meaningfulCleanup) {
        state.levelNoCollectionTime = Math.max(0, state.levelNoCollectionTime - dt * (2.2 + cleanupProgressDelta * 3.4))
      } else {
        state.levelNoCollectionTime += dt * (1.05 + state.levelSlowCleanupDeficit * 3.2 + state.levelSlowCleanupPressure * 1.15)
      }
      const noCollectionRamp = Math.max(
        0.001,
        FIRST_LEVEL_TUNING.noCollectionRampSeconds * (0.88 + config.noCollectionGraceScale * 0.22),
      )
      const noCollectionTarget = clampValue(
        (
          smooth01(state.levelNoCollectionTime / noCollectionRamp)
            + state.levelSlowCleanupPressure * FIRST_LEVEL_TUNING.slowCleanupNoCollectionBias
        ) * config.noCollectionPressureScale,
        0,
        1.24,
      )
      const noCollectionFall = meaningfulCleanup
        ? FIRST_LEVEL_TUNING.noCollectionPressureFall * (1.1 + cleanupProgressDelta * 2.1 + collectedMassDelta * 8.5)
        : FIRST_LEVEL_TUNING.noCollectionPressureFall
      state.levelNoCollectionPressure = damp(
        state.levelNoCollectionPressure,
        noCollectionTarget,
        noCollectionTarget > state.levelNoCollectionPressure
          ? FIRST_LEVEL_TUNING.noCollectionPressureRise
          : noCollectionFall,
        dt,
      )
    }
  } else if (state.levelDefeatTriggered) {
    state.levelNoCollectionTime = Math.max(state.levelNoCollectionTime, state.levelNoGunkGraceSeconds + FIRST_LEVEL_TUNING.noCollectionRampSeconds)
    state.levelNoCollectionPressure = Math.max(state.levelNoCollectionPressure, 1)
    state.levelSlowCleanupPressure = Math.max(state.levelSlowCleanupPressure, 1)
    state.levelSlowCleanupDeficit = Math.max(state.levelSlowCleanupDeficit, 1)
  } else {
    state.levelNoCollectionTime = Math.max(0, state.levelNoCollectionTime - dt * 1.3)
    state.levelNoCollectionPressure = damp(state.levelNoCollectionPressure, 0, FIRST_LEVEL_TUNING.noCollectionPressureFall, dt)
  }
  state.levelLastCollectedMass = damp(
    state.levelLastCollectedMass,
    state.bagCollectedMass,
    meaningfulCleanup ? 10.5 : 2.3,
    dt,
  )
  state.levelLastCleanupProgress = damp(
    state.levelLastCleanupProgress,
    progressTowardTarget,
    meaningfulCleanup ? 8.8 : 1.9,
    dt,
  )
  if (activeWave) {
    const coverageDangerSignal = clampValue(
      (visibleGunkCoverage - FIRST_LEVEL_TUNING.gunkCoverageBaseline)
        / Math.max(0.001, FIRST_LEVEL_TUNING.gunkCoverageLoss - FIRST_LEVEL_TUNING.gunkCoverageBaseline),
      0,
      1.24,
    )
    const massPressure = smooth01(
      (remainingFraction - config.overtakeMassStart)
        / Math.max(0.001, 1 - config.overtakeMassStart),
    )
    const timePressure = smooth01(
      (waveProgress - FIRST_LEVEL_TUNING.overtakeTimeRampStart)
        / Math.max(0.001, 1 - FIRST_LEVEL_TUNING.overtakeTimeRampStart),
    )
    const uncleanedPressure = 1 - clampValue(progressTowardTarget, 0, 1)
    const visualClearRelief = clampValue(progressTowardTarget * 0.22, 0, 0.22)
    const clearRelief = FIRST_LEVEL_TUNING.overtakeClearRelief * (1 - clampValue(state.levelSlowCleanupPressure, 0, 1) * 0.82)
    const overtakeTarget = clampValue(
      (
        coverageDangerSignal * 0.84
          + massPressure * FIRST_LEVEL_TUNING.overtakeMassWeight * (0.18 + timePressure * 0.82)
          + uncleanedPressure * (0.18 + timePressure * 0.28)
          + timePressure * FIRST_LEVEL_TUNING.overtakeTimeWeight
          + state.levelRegenPressure * FIRST_LEVEL_TUNING.overtakeRegenWeight
          + state.levelNoCollectionPressure * FIRST_LEVEL_TUNING.noCollectionOvertakeBoost
          + state.levelSlowCleanupPressure * FIRST_LEVEL_TUNING.slowCleanupOvertakeBoost
          - progressTowardTarget * clearRelief
          - visualClearRelief
      ) * config.overtakePressureScale,
      0,
      1.24,
    )
    state.levelOvertakePressure = damp(
      state.levelOvertakePressure,
      overtakeTarget,
      overtakeTarget > state.levelOvertakePressure ? FIRST_LEVEL_TUNING.overtakePressureRise : FIRST_LEVEL_TUNING.overtakePressureFall,
      dt,
    )
    const preStreamCoverageLossReached = visibleGunkCoverage >= FIRST_LEVEL_TUNING.gunkCoverageLoss
    const preStreamCoverageWinReached = canTriggerLevelCompletionFromCoverage(state)
      && rawRemainingFraction <= FIRST_LEVEL_TUNING.gunkCoverageWin / Math.max(0.001, FIRST_LEVEL_TUNING.gunkCoverageBaseline) + 0.03
    if (preStreamCoverageLossReached && isVisibleCoverageOvertaken(state)) {
      triggerLevelDefeat(state, t)
      return
    }
    if (preStreamCoverageWinReached) {
      state.levelCompletionTriggerTimer += dt
      if (state.levelCompletionTriggerTimer >= FIRST_LEVEL_TUNING.completionTriggerDelay) {
        triggerLevelCompletion(state, t)
      }
      return
    }

    const collectedFractionDelta = playerCleanupActive
      ? Math.max(0, collectedMassDelta / startMass)
      : 0
    const cleanupDangerRelief = clampValue(
      progressTowardTarget * FIRST_LEVEL_TUNING.gunkDangerCleanupRelief
        + (meaningfulCleanup ? Math.min(0.22, collectedFractionDelta * 4.4) : 0),
      0,
      0.92,
    )
    const streamDifficultyScale = clampValue(config.noCollectionPressureScale, 0.72, 1.24)
    const overgrowthFillSeconds = Math.max(
      8,
      FIRST_LEVEL_TUNING.gunkOvergrowthLinearFillSeconds / streamDifficultyScale,
    )
    const cleanupStreamFloor = clampValue(FIRST_LEVEL_TUNING.gunkOvergrowthMinStreamWhileCleaning, 0.2, 1)
    const cleanupStreamDrag = clampValue(progressTowardTarget * 0.26, 0, 0.26)
    const cleanupStreamScale = playerCleanupActive
      ? Math.max(cleanupStreamFloor, 1 - cleanupStreamDrag)
      : 1
    const linearOvergrowthClock = clampValue(
      (state.levelTime / overgrowthFillSeconds) * cleanupStreamScale * (1 - waveExhaustionProgress)
        + FIRST_LEVEL_TUNING.postWaveOvergrowthTarget * waveExhaustionProgress,
      0,
      1.45,
    )
    const cleanupOvergrowthDrain = meaningfulCleanup
      ? (cleanupProgressDelta + collectedFractionDelta * 1.35) * FIRST_LEVEL_TUNING.gunkOvergrowthCleanupDrain
      : 0
    state.levelGunkOvergrowthCleanupCredit = clampValue(
      state.levelGunkOvergrowthCleanupCredit + cleanupOvergrowthDrain,
      0,
      Math.max(0, linearOvergrowthClock),
    )
    state.levelGunkOvergrowth = clampValue(
      linearOvergrowthClock - state.levelGunkOvergrowthCleanupCredit,
      0,
      1.45,
    )
    const syncedVisibleGunkCoverage = syncLevelCoverageFromMass(state, rawRemainingMass)
    const syncedCoverageGunkDanger = computeGunkDangerFromCoverage(syncedVisibleGunkCoverage)
    state.levelGunkDanger = damp(
      state.levelGunkDanger,
      syncedCoverageGunkDanger,
      syncedCoverageGunkDanger > state.levelGunkDanger ? 3.2 : 4.4 + cleanupDangerRelief * 2.6,
      dt,
    )
    const cleanupRelief = meaningfulCleanup
      ? 1.1 + cleanupProgressDelta * 5.4 + collectedFractionDelta * 10
      : state.levelSlowCleanupPressure > 0.16 ? 0.72 : 1
    const syncedCoverageLossSignal = clampValue(
      (syncedVisibleGunkCoverage - FIRST_LEVEL_TUNING.gunkCoverageBaseline)
        / Math.max(0.001, FIRST_LEVEL_TUNING.gunkCoverageLoss - FIRST_LEVEL_TUNING.gunkCoverageBaseline),
      0,
      1,
    )
    state.levelLossProgress = damp(
      state.levelLossProgress,
      syncedCoverageLossSignal,
      syncedCoverageLossSignal > state.levelLossProgress
        ? Math.max(FIRST_LEVEL_TUNING.noCollectionPressureRise, FIRST_LEVEL_TUNING.slowCleanupPressureRise * 0.95)
        : FIRST_LEVEL_TUNING.noCollectionPressureFall * cleanupRelief,
      dt,
    )
    const coverageLossReached = syncedVisibleGunkCoverage >= FIRST_LEVEL_TUNING.gunkCoverageLoss
    const coverageWinReached = canTriggerLevelCompletionFromCoverage(state)
      && rawRemainingFraction <= FIRST_LEVEL_TUNING.gunkCoverageWin / Math.max(0.001, FIRST_LEVEL_TUNING.gunkCoverageBaseline) + 0.03
    if (coverageLossReached && isVisibleCoverageOvertaken(state)) {
      triggerLevelDefeat(state, t)
      return
    }
    if (coverageWinReached) {
      state.levelCompletionTriggerTimer += dt
      if (state.levelCompletionTriggerTimer >= FIRST_LEVEL_TUNING.completionTriggerDelay) {
        triggerLevelCompletion(state, t)
      }
      return
    }
    if (!state.levelCompletionTriggered) {
      state.levelCompletionTriggerTimer = 0
    }
  } else if (state.levelDefeatTriggered) {
    state.levelOvertakePressure = Math.max(state.levelOvertakePressure, FIRST_LEVEL_TUNING.overtakeLossThreshold)
    state.levelLossProgress = Math.max(state.levelLossProgress, 1)
    state.levelVisibleGunkCoverage = Math.max(state.levelVisibleGunkCoverage, FIRST_LEVEL_TUNING.gunkCoverageLoss)
    state.levelVisualClearPercent = 0
    state.levelGunkDanger = Math.max(state.levelGunkDanger, 1)
    state.levelSlimeFloorTakeover = Math.max(state.levelSlimeFloorTakeover, computeSlimeFloorTakeoverCoverage(state))
  } else {
    state.levelOvertakePressure = damp(state.levelOvertakePressure, 0, 2.2, dt)
    state.levelLossProgress = damp(state.levelLossProgress, 0, 3.4, dt)
    state.levelGunkDanger = damp(state.levelGunkDanger, FIRST_LEVEL_TUNING.gunkDangerBaseline, 2.6, dt)
    state.levelGunkOvergrowth = damp(state.levelGunkOvergrowth, 0, 2.8, dt)
    state.levelGunkOvergrowthCleanupCredit = damp(state.levelGunkOvergrowthCleanupCredit, 0, 2.8, dt)
  }
  state.levelOvertakeDanger = clampValue(
    Math.max(
      (state.levelOvertakePressure - FIRST_LEVEL_TUNING.overtakeWarningThreshold)
        / Math.max(0.001, FIRST_LEVEL_TUNING.overtakeLossThreshold - FIRST_LEVEL_TUNING.overtakeWarningThreshold),
      state.levelLossProgress,
      state.levelGunkDanger,
    ),
    0,
    1,
  )
  const dangerPulse = state.levelOvertakeDanger * smooth01((Math.sin(state.levelTime * Math.PI * 1.45) + 1) * 0.5)
  state.levelOvertakePulse = damp(state.levelOvertakePulse, dangerPulse, state.levelDefeatTriggered ? 1.8 : 3.8, dt)
  const partyAfterRegen = computeReversiblePartyTarget(
    completionPercent,
    state.levelRegenPressure,
    state.levelRegenResetPulse,
    state.levelDifficulty,
  )
  state.levelPartyProgress = damp(
    state.levelPartyProgress,
    partyAfterRegen,
    partyAfterRegen > state.levelPartyProgress ? 1.75 : 8.5,
    dt,
  )
  state.levelCleanupAssist = clampValue(
    smooth01((completionPercent - FIRST_LEVEL_TUNING.finalCleanupStart) / Math.max(0.001, 1 - FIRST_LEVEL_TUNING.finalCleanupStart))
      * config.finalCleanupMultiplier
      + (state.levelCompletionTriggered ? 0.78 * config.finalCleanupMultiplier : 0),
    0,
    1.65,
  )
  if (progressTowardTarget <= FIRST_LEVEL_TUNING.regenResetThreshold && state.levelPartyProgress > 0.08) {
    state.levelRegenResetPulse = Math.max(state.levelRegenResetPulse, 0.72)
  } else {
    state.levelRegenResetPulse = damp(state.levelRegenResetPulse, 0, 3.6, dt)
  }
}

function updateLevelCompletionAnimation(state: VacuumRuntime, dt: number) {
  if (state.levelDefeatTriggered || state.levelState === 'defeated') {
    state.levelCompletionPulse = 0
    state.levelDiscoIntensity = 0
    state.levelCompletionGlow = 0
    state.levelCompletionHoseWobble = 0
    state.levelCompletionVacuumBounce = 0
    state.levelCompletionVacuumSpin = 0
    state.levelPartyProgress = 0
    state.levelCompletionPhase = 'idle'
    return
  }

  if (state.levelState !== 'completing' && state.levelState !== 'complete' && state.levelState !== 'shopping') {
    const party = computeLevelPartySync(state)
    const regenDrag = Math.max(0, state.levelRegenPressure * 0.18 + state.levelRegenResetPulse * 0.32)
    const partyBeat = (Math.sin(state.levelTime * FIRST_LEVEL_TUNING.discoBeamPulseRate * Math.PI * 2) + 1) * 0.5
    const partyGroove = smooth01(partyBeat)
    const partyPulse = party * (0.12 + partyGroove * 0.1)
    state.levelCompletionPulse = damp(state.levelCompletionPulse, partyPulse, 3.8, dt)
    state.levelDiscoIntensity = damp(state.levelDiscoIntensity, clampValue(party * 0.68 - regenDrag, 0, 0.78), 4.2, dt)
    state.levelCompletionGlow = damp(state.levelCompletionGlow, clampValue(party * 0.76 - regenDrag * 0.68, 0, 0.84), 3.6, dt)
    state.levelCompletionHoseWobble = damp(state.levelCompletionHoseWobble, party * 0.14, party <= 0.02 ? 6.0 : 2.8, dt)
    state.levelCompletionVacuumBounce = damp(state.levelCompletionVacuumBounce, 0, 4.4, dt)
    state.levelCompletionVacuumSpin = damp(state.levelCompletionVacuumSpin, 0, 3.8, dt)
    if (!state.levelCompletionTriggered) state.levelCompletionPhase = 'idle'
    return
  }

  state.levelCompletionAnimationTime += dt
  const time = state.levelCompletionAnimationTime
  const freezeEnd = FIRST_LEVEL_TUNING.completionFreezeDuration
  const buildEnd = freezeEnd + FIRST_LEVEL_TUNING.completionBuildDuration
  const releaseEnd = buildEnd + FIRST_LEVEL_TUNING.discoReleaseDuration
  const settleEnd = releaseEnd + FIRST_LEVEL_TUNING.completionSettleDuration
  let phase: CompletionAnimationPhase = 'summary'
  let phaseStart = settleEnd
  if (time < freezeEnd) {
    phase = 'hit'
    phaseStart = 0
  } else if (time < buildEnd) {
    phase = 'build'
    phaseStart = freezeEnd
  } else if (time < releaseEnd) {
    phase = 'disco-release'
    phaseStart = buildEnd
  } else if (time < settleEnd) {
    phase = 'settle'
    phaseStart = releaseEnd
  }
  state.levelCompletionPhase = phase
  state.levelCompletionPhaseTime = Math.max(0, time - phaseStart)

  const hit = phase === 'hit' ? 1 - smooth01(time / Math.max(0.001, freezeEnd)) : 0
  const build = phase === 'build' ? smooth01(state.levelCompletionPhaseTime / Math.max(0.001, FIRST_LEVEL_TUNING.completionBuildDuration)) : phase === 'disco-release' || phase === 'settle' || phase === 'summary' ? 1 : 0
  const releaseProgress = phase === 'disco-release'
    ? state.levelCompletionPhaseTime / Math.max(0.001, FIRST_LEVEL_TUNING.discoReleaseDuration)
    : phase === 'settle' || phase === 'summary' ? 1 : 0
  const release = phase === 'disco-release' ? 1 : phase === 'settle' ? 1 - smooth01(state.levelCompletionPhaseTime / Math.max(0.001, FIRST_LEVEL_TUNING.completionSettleDuration)) : 0
  const pulseWave = (Math.sin(time * FIRST_LEVEL_TUNING.discoBeamPulseRate * Math.PI * 2) + 1) * 0.5
  const completionCharge = clampValue(Math.max(1, state.levelProgressTowardTarget, state.levelPartyProgress), 1, 1.28)
  const grooveWave = smooth01(pulseWave)
  const releaseBurst = release * (0.62 + grooveWave * 0.28)
  const energyPulse = Math.max(hit * 0.82, build * (0.48 + grooveWave * 0.1), releaseBurst)
    * FIRST_LEVEL_TUNING.discoEnergyPulseStrength
    * (0.78 + completionCharge * 0.12)

  state.levelCompletionPulse = Math.max(state.levelCompletionPulse, energyPulse)
  state.levelDiscoIntensity = damp(
    state.levelDiscoIntensity,
    clampValue(
      build * 0.46
        + release * FIRST_LEVEL_TUNING.discoBeamIntensity * (0.72 + grooveWave * 0.18)
        + (phase === 'settle' ? 0.42 * (1 - smooth01(state.levelCompletionPhaseTime / Math.max(0.001, FIRST_LEVEL_TUNING.completionSettleDuration))) : 0),
      0,
      1.42,
    ),
    phase === 'disco-release' ? 4.4 : 2.6,
    dt,
  )
  state.levelCompletionGlow = damp(
    state.levelCompletionGlow,
    clampValue(
      0.18
        + build * 0.38
        + release * FIRST_LEVEL_TUNING.completionGlowStrength * (0.64 + grooveWave * 0.18),
      0,
      1.34,
    ),
    phase === 'disco-release' ? 4.6 : 2.4,
    dt,
  )
  state.levelCompletionHoseWobble = damp(
    state.levelCompletionHoseWobble,
    clampValue((hit * 0.42 + build * 0.32 + release * (0.52 + grooveWave * 0.2)) * FIRST_LEVEL_TUNING.hoseCompletionWobbleStrength, 0, 1.02),
    4.2,
    dt,
  )
  state.levelCompletionVacuumBounce = damp(
    state.levelCompletionVacuumBounce,
    clampValue((hit * 0.52 + build * 0.14 + release * (0.34 + grooveWave * 0.28)) * FIRST_LEVEL_TUNING.vacuumCompletionBounceStrength, 0, 0.78),
    4.8,
    dt,
  )
  state.levelCompletionVacuumSpin = damp(
    state.levelCompletionVacuumSpin,
    clampValue(release * (0.18 + releaseProgress * 0.22 + grooveWave * 0.12) * FIRST_LEVEL_TUNING.vacuumCompletionSpinStrength, 0, 0.5),
    3.8,
    dt,
  )
  state.flash = Math.min(1.05, Math.max(state.flash, energyPulse * 0.2))
  state.bagPulse = Math.min(1.65, Math.max(state.bagPulse, energyPulse * 0.28))
  state.bagFullPulse = Math.min(1.35, Math.max(state.bagFullPulse, energyPulse * 0.24))
  state.animationCompletion = Math.max(state.animationCompletion, energyPulse * 0.54)
  state.animationBag = Math.max(state.animationBag, energyPulse * 0.34)
  state.animationRecoil = Math.max(state.animationRecoil, energyPulse * 0.18)

  if (time >= settleEnd && state.levelState === 'completing') {
    state.levelState = 'complete'
    state.levelCompletionSummaryReady = true
    state.levelCompletionPhase = 'summary'
  }
  if (state.levelState === 'complete' && time >= settleEnd + FIRST_LEVEL_TUNING.summaryDelay + FIRST_LEVEL_TUNING.shopBreakDelay) {
    state.levelState = 'shopping'
    state.levelShopReady = true
    state.levelCompletionSummaryReady = true
    state.levelCompletionPhase = 'summary'
  }
}

function updateLevelDefeatAnimation(state: VacuumRuntime, dt: number) {
  if (!isFirstLevelMode(state.devMode)) return
  if (!state.levelDefeatTriggered) {
    state.levelDefeatGunkSpread = damp(state.levelDefeatGunkSpread, 0, 2.8, dt)
    state.levelDefeatVacuumSink = damp(state.levelDefeatVacuumSink, 0, 3.6, dt)
    if (state.levelOvertakeDanger > 0.45) {
      state.levelDefeatPhase = 'warning'
    } else if (state.levelDefeatPhase === 'warning') {
      state.levelDefeatPhase = 'idle'
    }
    return
  }

  state.levelDefeatAnimationTime += dt
  const time = state.levelDefeatAnimationTime
  const buildEnd = FIRST_LEVEL_TUNING.defeatBuildDuration
  const floodEnd = buildEnd + FIRST_LEVEL_TUNING.defeatFloodDuration
  const settleEnd = floodEnd + FIRST_LEVEL_TUNING.defeatSettleDuration
  let phase: DefeatAnimationPhase = 'summary'
  if (time < buildEnd) {
    phase = 'gulped'
  } else if (time < floodEnd) {
    phase = 'flood'
  } else if (time < settleEnd) {
    phase = 'buried'
  }
  state.levelDefeatPhase = phase

  const build = smooth01(Math.min(time, buildEnd) / Math.max(0.001, buildEnd))
  const flood = smooth01(clampValue((time - buildEnd) / Math.max(0.001, FIRST_LEVEL_TUNING.defeatFloodDuration), 0, 1))
  const settle = smooth01(clampValue((time - floodEnd) / Math.max(0.001, FIRST_LEVEL_TUNING.defeatSettleDuration), 0, 1))
  const pulse = smooth01((Math.sin(time * Math.PI * (1.6 + flood * 0.7)) + 1) * 0.5)
  const floodStartPressure = FIRST_LEVEL_TUNING.lossFloodStartPressure
  const floodLossSignal = Math.max(state.levelOvertakePressure, state.levelLossProgress)
  const floodGate = smooth01(
    (floodLossSignal - floodStartPressure)
      / Math.max(0.001, FIRST_LEVEL_TUNING.overtakeLossThreshold - floodStartPressure),
  )
  const overrun = clampValue(
    build * 0.28
      + flood * (0.72 + floodGate * 0.36)
      + settle * 0.18
      + state.levelNoCollectionPressure * 0.16
      + state.levelLossProgress * 0.12,
    0,
    1.45,
  )
  const defeatOvergrowthTarget = Math.max(
    state.levelGunkOvergrowth,
    clampValue(0.86 + flood * 0.32 + settle * 0.12, 0.86, 1.45),
  )
  state.levelGunkOvergrowth = damp(
    state.levelGunkOvergrowth,
    defeatOvergrowthTarget,
    phase === 'flood' ? 1.8 : 1.15,
    dt,
  )
  state.levelDefeatGunkSpread = damp(state.levelDefeatGunkSpread, overrun, phase === 'flood' ? 3.0 : 3.6, dt)
  state.levelVisibleGunkCoverage = Math.max(state.levelVisibleGunkCoverage, FIRST_LEVEL_TUNING.gunkCoverageLoss)
  state.levelVisualClearPercent = 0
  state.levelSlimeFloorTakeover = Math.max(state.levelSlimeFloorTakeover, computeSlimeFloorTakeoverCoverage(state))
  state.levelDefeatVacuumSink = damp(
    state.levelDefeatVacuumSink,
    clampValue(
      (
        flood * 0.58
          + settle * 0.24
          + state.levelNoCollectionPressure * 0.08
          + state.levelLossProgress * 0.06
      ) * FIRST_LEVEL_TUNING.lossVacuumSubmergeStrength,
      0,
      0.92,
    ),
    2.35,
    dt,
  )
  state.levelOvertakePulse = Math.max(
    state.levelOvertakePulse,
    (0.45 + pulse * 0.42 + floodGate * 0.16) * FIRST_LEVEL_TUNING.defeatGunkPulseStrength,
  )
  state.levelDiscoIntensity = damp(state.levelDiscoIntensity, 0, 6.4, dt)
  state.levelCompletionGlow = damp(state.levelCompletionGlow, 0, 6.0, dt)
  state.levelCompletionPulse = damp(state.levelCompletionPulse, 0, 5.4, dt)
  state.levelDiscoIntensity = 0
  state.levelCompletionGlow = 0
  state.levelCompletionPulse = 0
  state.animationCompletion = 0
  state.animationBodyJolt = Math.max(state.animationBodyJolt, build * 0.72 + pulse * flood * 0.18)
  state.animationBag = 0
  state.flash = Math.min(state.flash, 0.16)
  state.recoil = Math.max(state.recoil, build * 0.12 + flood * 0.06)
}

function clearMoteForFirstLevel(mote: Mote, runtime: VacuumRuntime) {
  mote.levelCleared = 1
  mote.latched = 0
  mote.latchAge = 0
  mote.mass = 0
  mote.visibleMass = 0
  mote.floorStick = 1
  mote.popAge = -999
  mote.popDuration = 0.48
  mote.slurp = 0
  mote.intakeFeed = 0
  mote.attachmentMassTransferred = 0
  mote.absorbTarget = 0
  mote.stuckResidueAge = 0
  mote.growthEnergy = 0
  mote.growthCooldown = 0
  mote.growthTarget = 0
  mote.generationPulse = 0
  mote.growthWake = 0
  mote.mouthContactConnected = 0
  mote.flowBridge = 0
  mote.flowBridgeLength = 0
  mote.flowBridgeThickness = PRODUCTION_TUNING.suction.flowBridgeMinThickness
  mote.deepEmbedDepth = 0
  mote.deepEmbedState = 'searching'
  getModePileCenter(runtime.devMode, mote.pileIndex, mote.position)
  mote.home.copy(mote.position)
  mote.anchor.copy(mote.position)
  mote.sealPoint.copy(mote.position)
  mote.velocity.set(0, 0, 0)
}

function requestLevelReset(state: VacuumRuntime) {
  state.levelResetRequested += 1
}

function setLevelDifficulty(state: VacuumRuntime, difficulty: LevelDifficulty) {
  state.levelDifficulty = difficulty
  requestLevelReset(state)
}

function resetRuntimeForReplay(state: VacuumRuntime, t: number) {
  const mode = state.devMode
  const difficulty = state.levelDifficulty
  const nextSerial = state.levelResetSerial + 1
  const fresh = createRuntime(mode)
  Object.assign(state, fresh)
  state.levelDifficulty = difficulty
  state.levelClearTarget = getLevelCleanupTarget(difficulty)
  state.levelWaveIndex = getLevelWaveIndex(difficulty)
  state.levelWaveTimeLimit = getLevelWaveTimeLimit(difficulty)
  state.levelTimeRemaining = state.levelWaveTimeLimit
  state.levelNoCollectionTime = 0
  state.levelNoCollectionPressure = 0
  state.levelSlowCleanupPressure = 0
  state.levelSlowCleanupDeficit = 0
  state.levelLossProgress = 0
  state.levelVisibleGunkCoverage = FIRST_LEVEL_TUNING.gunkCoverageBaseline
  state.levelVisualClearPercent = 0
  state.levelGunkDanger = FIRST_LEVEL_TUNING.gunkDangerBaseline
  state.levelGunkOvergrowth = 0
  state.levelGunkOvergrowthCleanupCredit = 0
  state.levelCollectedMassAtStart = state.bagCollectedMass
  state.levelLastRawCollectedMass = state.bagCollectedMass
  state.levelLastCollectedMass = state.bagCollectedMass
  state.levelLastCleanupProgress = 0
  state.levelNoGunkGraceSeconds = FIRST_LEVEL_TUNING.noCollectionGraceSeconds
    * getLevelDifficultyConfig(difficulty).noCollectionGraceScale
  state.levelResetSerial = nextSerial
  state.levelResetRequested = 0
  resetFlowMetrics(state.flowMetrics, t)
}

function applyRuntimeDevPreset(state: VacuumRuntime) {
  switch (state.devMode) {
    case 'movement-lab':
      state.position.set(-2.6, 0.62, 0.2)
      state.velocity.set(0, 0, 0)
      state.target.set(-2.6, 0.62, -0.9)
      state.yaw = Math.PI
      state.active = false
      break
    case 'suction-contact':
      state.position.set(-0.42, 0.62, -0.66)
      state.velocity.set(0, 0, 0)
      state.target.set(-0.04, 0.62, 0.96)
      state.yaw = Math.PI
      state.active = false
      break
    case 'glug-rhythm':
      state.position.set(-0.18, 0.62, -0.02)
      state.velocity.set(0, 0, 0)
      state.target.set(0.02, 0.62, 1.02)
      state.yaw = Math.PI
      state.active = false
      break
    case 'deep-embed':
      state.position.set(-0.24, 0.62, -0.08)
      state.velocity.set(0, 0, 0)
      state.target.set(0.04, 0.62, 1.06)
      state.yaw = Math.PI
      state.active = false
      break
    case 'pivot-swing-lab':
      state.position.set(-1.72, 0.62, 0.04)
      state.velocity.set(0, 0, 0)
      state.target.set(2.04, 0.62, 0.78)
      state.yaw = Math.PI * 0.82
      state.active = false
      break
    case 'grip-swing-lab':
      state.position.set(-1.54, 0.62, 0.02)
      state.velocity.set(0, 0, 0)
      state.target.set(1.88, 0.62, 0.72)
      state.yaw = Math.PI * 0.8
      state.active = false
      break
    case 'bag-fill':
      state.position.set(-0.18, 0.62, -0.04)
      state.velocity.set(0, 0, 0)
      state.target.set(0.04, 0.62, 1)
      state.yaw = Math.PI
      state.active = false
      break
    case 'hose-swing':
      state.position.set(-1.34, 0.62, 0.18)
      state.velocity.set(0, 0, 0)
      state.target.set(1.8, 0.62, 0.72)
      state.yaw = Math.PI * 0.86
      state.active = false
      break
    case 'reattach-chain':
      if (state.reattachChainVariant === 'easy') {
        state.position.set(-0.76, 0.62, 0.34)
      } else {
        state.position.set(-1.34, 0.62, -0.08)
      }
      state.velocity.set(0, 0, 0)
      state.target.set(-0.34, 0.62, 0.82)
      state.yaw = Math.PI * 0.92
      state.active = false
      break
    case 'multi-glob-chain':
      state.position.set(-3.84, 0.62, -0.22)
      state.velocity.set(0, 0, 0)
      state.target.set(-2.28, 0.62, 0.8)
      state.yaw = Math.PI * 0.78
      state.active = false
      break
    default:
      state.position.set(-4.12, 0.62, -1.38)
      state.velocity.set(0, 0, 0)
      state.target.set(-3.18, 0.62, -0.62)
      state.yaw = Math.PI * 0.74
      state.active = false
      break
  }
  setRenderedVacuumForwardFromYaw(state.forward, state.yaw)
  resetHoseCursorReachState(state)
}

function isStretchSnapLabMode(mode: ProductionDevModeId) {
  return mode === 'suction-contact' || mode === 'reattach-chain'
}

function triggerStretchSnapCue(state: VacuumRuntime, cue: StretchSnapSoundEvent, intensity: number, t: number) {
  const safeIntensity = clampValue(intensity, 0, 1.8)
  if (safeIntensity <= 0.025) return
  if (state.stretchSnapAudioCue === cue && t - state.stretchSnapLastAudioAt < 0.16) return
  state.stretchSnapAudioCue = cue
  state.stretchSnapAudioIntensity = Math.max(state.stretchSnapAudioIntensity, safeIntensity)
  state.stretchSnapLastAudioAt = t
  playSoundHook(cue, false)
}

function updateStretchSnapGrappleState(state: VacuumRuntime, t: number, dt: number) {
  const previous = state.stretchSnapState
  const next = deriveStretchSnapGrappleState({
    suctionState: state.suctionState,
    sealTargetMoteId: state.sealTargetMoteId,
    slimeSealStrength: state.slimeSealStrength,
    hoseHookStrength: state.hoseHookStrength,
    suctionReadiness: state.suctionReadiness,
    suctionApproachPull: state.suctionApproachPull,
    anchorStretch: state.anchorStretch,
    anchorTension: state.anchorTension,
    anchorPopJuice: state.anchorPopJuice,
    anchorPostReleaseControlTimer: state.anchorPostReleaseControlTimer,
    anchorReattachGraceTimer: state.anchorReattachGraceTimer,
    anchorReattachCatchPulse: state.anchorReattachCatchPulse,
    postSnapReattachTimer: state.postSnapReattachTimer,
    tetherRelease: state.tetherRelease,
  })
  state.stretchSnapPreviousState = previous
  if (next !== previous) {
    state.stretchSnapState = next
    state.stretchSnapStateAge = 0
    if (next === 'sealed') triggerStretchSnapCue(state, 'stretchSnapSeal', 0.42 + state.slimeSealStrength * 0.2, t)
    if (next === 'stretched') triggerStretchSnapCue(state, 'stretchSnapStrain', 0.24 + state.anchorTension * 0.72, t)
    if (next === 'snapping') triggerStretchSnapCue(state, 'stretchSnapPop', 0.34 + state.anchorReleaseTension * 0.92, t)
    if (next === 'caught') triggerStretchSnapCue(state, 'stretchSnapCatch', 0.44 + state.anchorReattachCatchPulse * 0.72, t)
  } else {
    state.stretchSnapStateAge += dt
  }
  const tensionJuice = clampValue(
    state.anchorTension * PRODUCTION_TUNING.suction.stretchSnapTensionJuiceScale,
    0,
    1.45,
  )
  state.stretchSnapTensionJuice = damp(
    state.stretchSnapTensionJuice,
    tensionJuice,
    tensionJuice > state.stretchSnapTensionJuice ? 12.4 : 5.8,
    dt,
  )
  if (state.glugEventStrength > 0.22 && (state.suctionState === 'sealed' || state.anchorTension > 0.08)) {
    triggerStretchSnapCue(state, 'stretchSnapGulp', Math.min(1.2, state.glugEventStrength + state.anchorTension * 0.28), t)
  }
}

function isSameAnchorReattachSuppressed(
  state: VacuumRuntime,
  point: THREE.Vector3,
  candidate?: { moteId: number; score: number; pileIndex?: number },
) {
  if (!candidate || state.anchorReleaseTargetMoteId < 0) return false
  const sameMote = candidate.moteId === state.anchorReleaseTargetMoteId
  const samePile = typeof candidate.pileIndex === 'number'
    && state.anchorReleaseTargetPileIndex >= 0
    && candidate.pileIndex === state.anchorReleaseTargetPileIndex
  if (!sameMote && !samePile) return false
  const exitDistance = Math.max(
    state.position.distanceTo(state.anchorReleasePoint),
    state.mouth.distanceTo(state.anchorReleasePoint),
  )
  if (samePile && state.anchorReattachGraceTimer > 0.015) return true
  if (state.anchorReattachCooldownTimer > 0.015) return true
  if ((sameMote || samePile) && exitDistance < PRODUCTION_TUNING.suction.reattachMinimumExitDistanceFromOldAnchor) return true
  return sameMote && point.distanceTo(state.anchorReleasePoint) < PRODUCTION_TUNING.suction.reattachSameAnchorReturnRadius
}

function recordReattachRejectedCandidate(
  state: VacuumRuntime,
  moteId: number,
  reason: ReattachRejectReason,
  score: number,
) {
  if (reason === 'none' || state.anchorReattachGraceTimer <= 0.015) return
  if (score < state.anchorReattachRejectedCandidateScore && state.anchorReattachRejectedCandidateReason !== 'none') return
  state.anchorReattachRejectedCandidateMoteId = moteId
  state.anchorReattachRejectedCandidateScore = Math.max(score, state.anchorReattachRejectedCandidateScore)
  state.anchorReattachRejectedCandidateReason = reason
}

function isGraceReattachCandidate(state: VacuumRuntime, candidate?: { moteId: number; score: number; pileIndex?: number }) {
  return Boolean(
    candidate
      && state.anchorReattachGraceTimer > 0.015
      && candidate.moteId >= 0
      && candidate.moteId !== state.anchorReleaseTargetMoteId
      && (typeof candidate.pileIndex !== 'number'
        || state.anchorReleaseTargetPileIndex < 0
        || candidate.pileIndex !== state.anchorReleaseTargetPileIndex)
      && (state.anchorReattachCandidateMoteId < 0 || state.anchorReattachCandidateMoteId === candidate.moteId),
  )
}

function registerSlimeSeal(
  state: VacuumRuntime,
  point: THREE.Vector3,
  strength: number,
  candidate?: { moteId: number; score: number; pileIndex?: number },
) {
  const graceCandidate = isGraceReattachCandidate(state, candidate)
  if (state.anchorPostReleaseControlTimer > 0.015 && !graceCandidate) return
  if (isSameAnchorReattachSuppressed(state, point, candidate)) return
  const nextStrength = Math.min(1.35, strength)
  const current = state.slimeSealDemand
  if (state.suctionState === 'sealed' && state.sealTargetMoteId >= 0) {
    if (candidate && candidate.moteId !== state.sealTargetMoteId) return
    enforceStickyAnchorImmutability(state, state.flowMetrics.now)
    state.anchorDrift = state.slimeHookPoint.distanceTo(state.anchorWorldPosition)
    state.anchorMaxDrift = Math.max(state.anchorMaxDrift, state.anchorDrift)
    state.slimeSealPoint.copy(state.anchorWorldPosition)
    state.slimeSealAnchorPoint.copy(state.anchorWorldPosition)
    state.slimeHookPoint.copy(state.anchorWorldPosition)
    state.slimeSealDemand = Math.max(current, nextStrength)
    return
  }
  if (candidate) {
    const sameTarget = state.sealTargetMoteId === candidate.moteId
    const hasLockedTarget = state.sealTargetMoteId >= 0 && state.hoseHookStrength > 0.18
    const pivotLocked = state.pivotLocked || state.gripActive || state.deepEmbedLockStrength > 0.32
    const approachTargetLock = state.sealTargetMoteId >= 0
      && !sameTarget
      && state.hoseHookStrength > 0.06
      && state.slimeSealStrength > 0.05
      && (state.suctionApproachLocked || state.slimeSealAge < PRODUCTION_TUNING.suction.suctionApproachTargetSwitchLockSeconds)
    if (state.gripActive && !sameTarget) return
    const stickyAbsorbLock = state.sealTargetMoteId >= 0
      && !sameTarget
      && state.hoseHookStrength > 0.08
      && (state.slimeSealAge > 0.18 || state.deepEmbedDepth > 0.08 || pivotLocked)
      && state.slimeSealStrength > 0.08
    if ((stickyAbsorbLock || approachTargetLock) && !graceCandidate) return
    const switchMargin = PRODUCTION_TUNING.suction.targetSwitchMargin
      + (pivotLocked || state.deepEmbedDepth > 0.08 ? 0.82 : 0)
      + (state.suctionApproachLocked ? 0.48 : 0)
      - (graceCandidate ? 0.86 : 0)
    const canSwitch = !hasLockedTarget
      || sameTarget
      || graceCandidate
      || candidate.score > state.sealTargetScore + switchMargin
      || state.slimeSealStrength < 0.12
    if (!canSwitch) return
    state.sealTargetMoteId = candidate.moteId
    state.sealTargetPileIndex = candidate.pileIndex ?? state.sealTargetPileIndex
    state.sealTargetScore = Math.max(candidate.score, sameTarget ? state.sealTargetScore * 0.94 : 0)
    const anchorRetention = Math.max(
      PRODUCTION_TUNING.hose.anchorRetention,
      pivotLocked ? 0.93 : 0,
      state.gripActive ? 0.98 : 0,
      state.deepEmbedDepth > 0.12 ? 0.9 : 0,
    )
    state.slimeSealAnchorPoint.lerp(point, sameTarget ? Math.min(0.09, 1 - anchorRetention) : 1)
	  }
	  const stablePocketLock = state.suctionApproachLocked
	    || state.deepEmbedDepth > 0.06
	    || state.deepEmbedLockStrength > 0.18
	    || state.controllerMouthSettle > 0.26
	  if (nextStrength > current + 0.001) {
	    state.slimeSealPoint.lerp(point, current > 0.01 ? (stablePocketLock ? 0.055 : 0.24) : 1)
	  } else if (current > 0.01) {
	    state.slimeSealPoint.lerp(point, stablePocketLock ? 0.025 : 0.08)
	  } else {
	    state.slimeSealPoint.copy(point)
	  }
  state.slimeSealDemand = Math.max(current, nextStrength)
}

function enforceStickyAnchorImmutability(state: VacuumRuntime, t: number) {
  if (state.suctionState !== 'sealed') return
  const drift = state.anchorWorldPosition.distanceTo(state.anchorInitialWorldPosition)
  state.anchorLockDrift = drift
  state.anchorMaxLockDrift = Math.max(state.anchorMaxLockDrift, drift)
  if (drift <= PRODUCTION_TUNING.suction.stickyAnchorDriftTolerance) return

  state.anchorDriftViolationCount += 1
  state.anchorDriftViolationPulse = Math.max(
    state.anchorDriftViolationPulse,
    PRODUCTION_TUNING.suction.stickyAnchorDebugViolationPulse,
  )
  if (state.devMode === 'suction-contact' && t - state.anchorLastDriftViolationAt > 0.45) {
    state.anchorLastDriftViolationAt = t
    console.warn('[Vacuum Head] Sticky anchor drift corrected', {
      drift,
      tolerance: PRODUCTION_TUNING.suction.stickyAnchorDriftTolerance,
      anchor: state.anchorInitialWorldPosition.toArray(),
    })
  }
  state.anchorWorldPosition.copy(state.anchorInitialWorldPosition)
  state.anchorReleasePoint.copy(state.anchorInitialWorldPosition)
  state.slimeSealPoint.copy(state.anchorInitialWorldPosition)
  state.slimeSealAnchorPoint.copy(state.anchorInitialWorldPosition)
  state.slimeHookPoint.copy(state.anchorInitialWorldPosition)
  state.pivotPoint.copy(state.anchorInitialWorldPosition)
  state.anchorLockDrift = 0
}

function captureStickyAnchor(state: VacuumRuntime, t: number) {
  const preset = getStretchSnapPresetTuning(state)
  const initialDistance = state.position.distanceTo(state.slimeSealPoint)
  const releasedTargetId = state.anchorReleaseTargetMoteId
  const caughtDuringReattach = state.anchorReattachGraceTimer > 0.015
    && state.sealTargetMoteId >= 0
    && state.sealTargetMoteId !== releasedTargetId
  state.anchorWorldPosition.copy(state.slimeSealPoint)
  state.anchorInitialWorldPosition.copy(state.anchorWorldPosition)
  state.anchorReleasePoint.copy(state.anchorWorldPosition)
  state.anchorReleaseDirection.set(0, 0, 0)
  state.anchorSnapImpulseVector.set(0, 0, 0)
  state.snapImpulse.set(0, 0, 0)
  state.anchorSnapDirectionDot = 0
  state.anchorReleasePreviewStrength = 0
  state.anchorFinalSqueeze = 0
  state.slimeSealAnchorPoint.copy(state.anchorWorldPosition)
  state.slimeHookPoint.copy(state.anchorWorldPosition)
  state.anchorRestLength = Math.max(0.2, PRODUCTION_TUNING.suction.elasticRestLength)
  state.anchorCurrentDistance = initialDistance
  state.anchorAttachStartedAt = t
  state.anchorAttachAge = 0
  state.anchorDrift = 0
  state.anchorMaxDrift = 0
  state.anchorLockDrift = 0
  state.anchorMaxLockDrift = 0
  state.anchorDriftViolationCount = 0
  state.anchorDriftViolationPulse = 0
  state.anchorSealSnapPulse = Math.max(state.anchorSealSnapPulse, PRODUCTION_TUNING.suction.stickyAnchorVisualPulse)
  state.mouthSurfaceContactState = 'embedded'
  state.mouthSurfaceDistance = 0
  state.deepEmbedState = state.deepEmbedDepth > PRODUCTION_TUNING.embed.embedDepthMax * 0.46 ? 'embed-lock' : 'deep-embed'
  state.deepEmbedDepth = Math.max(state.deepEmbedDepth, PRODUCTION_TUNING.embed.embedDepthMax * 0.42)
  state.deepEmbedLockStrength = Math.max(state.deepEmbedLockStrength, 0.72 + state.slimeSealStrength * 0.22)
  state.deepEmbedPocketPulse = Math.max(state.deepEmbedPocketPulse, 0.68 + state.slimeSealStrength * 0.14)
  state.deepEmbedRimOcclusion = Math.max(state.deepEmbedRimOcclusion, 0.54 + state.slimeSealStrength * 0.12)
  state.mouthSurfaceCompression = Math.max(state.mouthSurfaceCompression, 0.72 + state.slimeSealStrength * 0.14)
  state.mouthSealRing = Math.max(state.mouthSealRing, 0.76 + state.slimeSealStrength * 0.14)
  state.mouthFloatingWarning = 0
  state.suctionContactPatchPoint.copy(state.anchorWorldPosition)
  state.anchorSealCompressionTimer = Math.max(
    state.anchorSealCompressionTimer,
    PRODUCTION_TUNING.suction.stickyAnchorSealBitePause,
  )
  state.anchorReleaseReason = 'none'
  state.anchorQueuedReleaseReason = 'none'
  state.anchorReleaseTargetMoteId = state.sealTargetMoteId
  state.anchorReleaseTargetPileIndex = state.sealTargetPileIndex
  state.anchorStretch = Math.max(0, initialDistance - state.anchorRestLength)
  state.anchorTension = clampValue(state.anchorStretch / Math.max(0.001, preset.maxStretch), 0, 1)
  state.anchorPreviousTension = state.anchorTension
  state.anchorTensionVelocity = 0
  state.anchorElasticBounce = 0
  state.anchorReboundImpulse = 0
  state.anchorPlayerControlMultiplier = preset.playerControlWhileSealed
  state.anchorDriftRetentionMultiplier = preset.driftRetentionWhileSealed
  state.anchorDirectionToAnchor.set(0, 0, 1)
  state.anchorSpringForceVector.set(0, 0, 0)
  state.anchorDampingForceVector.set(0, 0, 0)
  state.anchorElasticForceVector.set(0, 0, 0)
  state.anchorSpringForce = 0
  state.anchorDampingForce = 0
  state.anchorLateralDamping = 0
  state.anchorRadialVelocity = 0
  state.anchorTangentVelocity = 0
  state.anchorLatchInfluence = 0
  state.anchorLatchPivotActive = false
  state.anchorLatchTurnForce = 0
  state.anchorLatchTangentPreserve = 0
  state.anchorLatchRadialDamping = 0
  state.anchorLatchAngularVelocity = 0
  state.anchorLatchDirection.set(0, 0, 0)
  state.anchorLatchOffAxis = 0
  state.anchorLatchRedirectStrength = 0
  state.anchorLatchPivotKick = 0
  state.anchorOverstretchTimer = 0
  state.anchorReleaseTension = 0
  state.anchorSnapImpulseMagnitude = 0
  state.anchorPostReleaseVelocity = state.velocity.length()
  state.anchorPostReleaseControlTimer = 0
  state.anchorPostReleaseControlCurve = 0
  state.anchorPopJuice = 0
  state.anchorPopRing = 0
  state.anchorReattachRejectedCandidateMoteId = -1
  state.anchorReattachRejectedCandidateScore = 0
  state.anchorReattachRejectedCandidateReason = 'none'
  if (caughtDuringReattach) {
    const catchStrength = Math.max(
      0.28,
      state.anchorReattachAssistStrength,
      state.anchorReattachCandidateScore * 0.72,
    )
    state.anchorRestLength = clampValue(
      initialDistance * 0.74,
      PRODUCTION_TUNING.suction.elasticRestLength,
      PRODUCTION_TUNING.suction.elasticMaxStretch,
    )
    state.anchorStretch = Math.max(0, initialDistance - state.anchorRestLength)
    state.anchorTension = clampValue(
      state.anchorStretch / Math.max(0.001, preset.maxStretch),
      0,
      1,
    )
    state.anchorPreviousTension = state.anchorTension
    snapReleaseVector.copy(state.anchorWorldPosition).sub(state.position)
    snapReleaseVector.y = 0
    if (snapReleaseVector.lengthSq() > 0.0001) {
      snapReleaseVector.normalize()
      const awayFromCatchSpeed = Math.max(0, -state.velocity.dot(snapReleaseVector))
      state.velocity.addScaledVector(snapReleaseVector, awayFromCatchSpeed * 0.48)
      state.velocity.addScaledVector(
        snapReleaseVector,
        PRODUCTION_TUNING.suction.reattachCatchTugStrength * catchStrength,
      )
    }
    state.anchorReattachCatchPulse = Math.max(
      state.anchorReattachCatchPulse,
      PRODUCTION_TUNING.suction.reattachCatchPulse * catchStrength,
    )
    state.anchorReattachCatchCount += 1
    state.anchorReattachLastCatchAt = t
    state.anchorReattachLastCatchTargetId = state.sealTargetMoteId
    state.anchorReattachLastCatchPileIndex = state.sealTargetPileIndex
    state.anchorReattachGraceTimer = 0
    state.anchorReattachCooldownTimer = 0
    state.anchorReattachCandidateMoteId = -1
    state.anchorReattachCandidateScore = 0
    state.anchorReattachCandidateAge = 0
    state.anchorReattachRejectedCandidateMoteId = -1
    state.anchorReattachRejectedCandidateScore = 0
    state.anchorReattachRejectedCandidateReason = 'none'
    state.anchorReattachAssistStrength = 0
    state.animationMouthTug = Math.max(state.animationMouthTug, 0.46 + catchStrength * 0.36)
    state.animationBodyJolt = Math.max(state.animationBodyJolt, 0.1 + catchStrength * 0.18)
    state.animationStretch = Math.max(state.animationStretch, 0.18 + catchStrength * 0.2)
    state.flash = Math.max(state.flash, 0.12 + catchStrength * 0.18)
    state.stretchSnapCameraImpulse = Math.max(
      state.stretchSnapCameraImpulse,
      PRODUCTION_TUNING.suction.stretchSnapCameraImpulseScale * (0.42 + catchStrength * 0.64),
    )
    triggerStretchSnapCue(state, 'stretchSnapCatch', 0.5 + catchStrength * 0.5, t)
  } else {
    state.animationMouthTug = Math.max(state.animationMouthTug, 0.54 + state.slimeSealStrength * 0.18)
    state.animationBodyJolt = Math.max(state.animationBodyJolt, 0.08 + state.slimeSealStrength * 0.05)
    state.animationStretch = Math.max(state.animationStretch, 0.16)
    state.deepEmbedPocketPulse = Math.max(state.deepEmbedPocketPulse, 0.28 + state.slimeSealStrength * 0.08)
    state.flash = Math.max(state.flash, 0.1 + state.slimeSealStrength * 0.08)
    triggerStretchSnapCue(state, 'stretchSnapSeal', 0.42 + state.slimeSealStrength * 0.24, t)
  }
}

function releaseStickyAnchor(state: VacuumRuntime, reason: StickySuctionReleaseReason, t = state.flowMetrics.now) {
  const preset = getStretchSnapPresetTuning(state)
  const wasSealed = state.suctionState === 'sealed'
  const targetId = state.sealTargetMoteId
  const flowSnapVelocityBefore = { x: state.velocity.x, y: state.velocity.y, z: state.velocity.z }
  const liveDistance = state.position.distanceTo(state.anchorWorldPosition)
  const liveStretch = Math.max(0, liveDistance - state.anchorRestLength)
  const liveTension = clampValue(
    liveStretch / Math.max(0.001, preset.maxStretch),
    0,
    1,
  )
  const releaseTension = clampValue(
    Math.max(state.anchorTension, liveTension),
    0,
    1,
  )
  state.anchorReleaseReason = reason
  state.anchorReleaseTension = releaseTension
  state.anchorReleaseTargetMoteId = state.sealTargetMoteId
  state.anchorReleaseTargetPileIndex = state.sealTargetPileIndex
  state.anchorReleasePoint.copy(state.anchorWorldPosition)
  snapReleaseVector.copy(state.position).sub(state.anchorWorldPosition)
  snapReleaseVector.y = 0
  if (snapReleaseVector.lengthSq() < 0.0001) {
    snapReleaseVector.copy(state.forward).multiplyScalar(-1)
    snapReleaseVector.y = 0
  }
  if (snapReleaseVector.lengthSq() > 0.0001) {
    snapReleaseVector.normalize()
  } else {
    snapReleaseVector.set(1, 0, 0)
  }
  state.anchorReleaseDirection.copy(snapReleaseVector)

  const releaseScale = clampValue(
    reason === 'manual'
      ? Math.max(0.12, releaseTension)
      : reason === 'debug'
        ? Math.max(0.48, releaseTension)
        : reason === 'lostSlime'
          ? Math.max(0.22, releaseTension * 0.74)
          : reason === 'bodyIntersection'
            ? Math.max(0.32, releaseTension * 0.68)
            : Math.max(0.72, releaseTension),
    0,
    1,
  )
  const storedElasticRelease = wasSealed
    ? clampValue(
      state.anchorReleasePreviewStrength * 0.26
        + Math.max(0, state.anchorTensionVelocity) * 0.055
        + state.anchorElasticBounce * 0.22
        + state.anchorLatchInfluence * 0.16
        + smooth01(state.anchorTangentVelocity / Math.max(0.001, PRODUCTION_TUNING.suction.latchInfluenceMaxTangentSpeed)) * 0.18
        + state.deepEmbedLockStrength * 0.05,
      0,
      0.82,
    )
    : 0
  const snapReleaseLoad = clampValue(
    releaseScale + storedElasticRelease * (reason === 'manual' ? 0.34 : 0.58),
    0,
    1.38,
  )
  let snapImpulse = 0
  let radialImpulseApplied = 0
  if (wasSealed) {
    const radialSpeedBeforeSnap = state.velocity.dot(snapReleaseVector)
    snapTangentVector.copy(state.velocity).addScaledVector(snapReleaseVector, -radialSpeedBeforeSnap)
    const releaseLateralDamping = clampValue(
      PRODUCTION_TUNING.suction.snapLateralVelocityDamping
        * (0.28 + snapReleaseLoad * 0.42)
        * (1 - storedElasticRelease * 0.24),
      0,
      0.66,
    )
    state.velocity.addScaledVector(snapTangentVector, -releaseLateralDamping)
    snapImpulse = clampValue(
      PRODUCTION_TUNING.suction.snapMinPower + preset.snapPower * snapReleaseLoad,
      PRODUCTION_TUNING.suction.snapMinPower,
      PRODUCTION_TUNING.suction.snapMaxPower,
    )
    state.velocity.addScaledVector(snapReleaseVector, snapImpulse)
    radialImpulseApplied += snapImpulse
    const minSnapVelocity = PRODUCTION_TUNING.suction.minSnapVelocity
      * (reason === 'manual'
        ? 0.42 + snapReleaseLoad * 0.58
        : reason === 'lostSlime' || reason === 'bodyIntersection'
          ? 0.38 + snapReleaseLoad * 0.42
          : 0.82 + snapReleaseLoad * 0.36)
    const radialSpeedAfterSnap = state.velocity.dot(snapReleaseVector)
    if (radialSpeedAfterSnap < minSnapVelocity) {
      const snapCorrection = minSnapVelocity - radialSpeedAfterSnap
      state.velocity.addScaledVector(snapReleaseVector, snapCorrection)
      radialImpulseApplied += snapCorrection
    }
    const maxSnapVelocity = PRODUCTION_TUNING.suction.maxSnapVelocity * (0.92 + snapReleaseLoad * 0.32)
    const releaseSpeed = state.velocity.length()
    if (releaseSpeed > maxSnapVelocity) {
      state.velocity.multiplyScalar(maxSnapVelocity / releaseSpeed)
    }
  }
  state.anchorSnapImpulseVector.copy(snapReleaseVector).multiplyScalar(radialImpulseApplied)
  state.snapImpulse.copy(state.anchorSnapImpulseVector)
  state.snapMomentum.copy(state.anchorSnapImpulseVector)
  const flowSnapVelocityAfter = { x: state.velocity.x, y: state.velocity.y, z: state.velocity.z }
  state.anchorSnapImpulseMagnitude = radialImpulseApplied
  state.anchorPostReleaseVelocity = state.velocity.length()
  state.anchorSnapDirectionDot = radialImpulseApplied > 0
    ? clampValue(candidateDirectionVector.copy(state.anchorSnapImpulseVector).normalize().dot(snapReleaseVector), -1, 1)
    : 0
  if (wasSealed && snapImpulse > 0) {
    recordFlowSnap(state.flowMetrics, {
      time: t,
      reason: reason === 'manual' ? 'manualRelease' : reason === 'overstretch' || reason === 'debug' ? 'tensionExceeded' : 'unknown',
      sealBreakReason: reason === 'manual' ? 'manualRelease' : reason === 'overstretch' || reason === 'debug' ? 'tensionExceeded' : 'unknown',
      targetId,
      tension: releaseTension,
      sealStrength: Math.max(state.slimeSealStrength, state.suctionContactSealQuality),
      velocityBefore: flowSnapVelocityBefore,
      velocityAfter: flowSnapVelocityAfter,
      snapImpulseApplied: radialImpulseApplied,
      contactAngle: Math.max(0, state.deepEmbedAnglePenalty),
    })
  }
  if (wasSealed && state.devMode === 'suction-contact') {
    console.info('[Vacuum Head] Sticky anchor release', {
      reason,
      releaseTension,
      releaseDir: state.anchorReleaseDirection.toArray(),
      impulseMagnitude: radialImpulseApplied,
      directionDot: state.anchorSnapDirectionDot,
      postReleaseSpeed: state.anchorPostReleaseVelocity,
    })
  }
  state.anchorPostReleaseControlTimer = Math.max(
    state.anchorPostReleaseControlTimer,
    PRODUCTION_TUNING.suction.postReleaseControlDampTime * (0.84 + snapReleaseLoad * 0.28),
  )
  state.anchorPostReleaseControlCurve = 1
  state.anchorReleasePreviewStrength = Math.max(state.anchorReleasePreviewStrength, 0.48 + snapReleaseLoad * 0.52)
  state.anchorFinalSqueeze = Math.max(
    state.anchorFinalSqueeze,
    PRODUCTION_TUNING.suction.snapFinalSqueezeStrength * (0.42 + snapReleaseLoad * 0.58),
  )
  if (wasSealed) {
    state.anchorReattachGraceTimer = Math.max(
      state.anchorReattachGraceTimer,
      preset.reattachGraceDuration,
    )
    state.anchorReattachCooldownTimer = Math.max(
      state.anchorReattachCooldownTimer,
      PRODUCTION_TUNING.suction.reattachCooldownSameAnchor,
    )
    state.anchorReattachCandidateMoteId = -1
    state.anchorReattachCandidateScore = 0
    state.anchorReattachCandidateAge = 0
    state.anchorReattachCandidatePoint.copy(state.anchorReleasePoint)
    state.anchorReattachAssistDirection.copy(snapReleaseVector)
    state.anchorReattachRejectedCandidateMoteId = -1
    state.anchorReattachRejectedCandidateScore = 0
    state.anchorReattachRejectedCandidateReason = 'none'
    state.anchorReattachAssistStrength = Math.max(0.32, releaseTension, snapReleaseLoad * 0.72)
  }
  const reasonPopScale = reason === 'overstretch'
    ? 1.18
    : reason === 'manual'
      ? 0.68 + snapReleaseLoad * 0.42
      : reason === 'lostSlime'
        ? 0.72
        : reason === 'bodyIntersection'
          ? 0.82
          : 1
  const popStrength = Math.max(
    0.18,
    (0.34 + snapReleaseLoad * 0.88) * PRODUCTION_TUNING.suction.popJuiceAmount * reasonPopScale,
  )
  state.anchorElasticBounce = Math.max(
    state.anchorElasticBounce,
    popStrength * PRODUCTION_TUNING.suction.elasticBounceAmount * 0.32,
  )
  state.anchorReboundImpulse = Math.max(
    state.anchorReboundImpulse,
    radialImpulseApplied * PRODUCTION_TUNING.suction.reboundImpulseScale * 0.04,
  )
  state.anchorPopJuice = Math.max(state.anchorPopJuice, popStrength)
  state.anchorPopRing = Math.max(state.anchorPopRing, popStrength)
  state.stretchSnapCameraImpulse = Math.max(
    state.stretchSnapCameraImpulse,
    PRODUCTION_TUNING.suction.stretchSnapCameraImpulseScale * (0.28 + snapReleaseLoad * 1.18) * reasonPopScale,
  )
  triggerStretchSnapCue(state, 'stretchSnapPop', 0.24 + snapReleaseLoad * 0.92, t)
  state.tetherRelease = Math.max(
    state.tetherRelease,
    popStrength * PRODUCTION_TUNING.suction.hoseRecoilAmount * (1 + storedElasticRelease * 0.22),
  )
  state.animationSnap = Math.max(state.animationSnap, 0.2 + snapReleaseLoad * 0.78)
  state.animationRecoil = Math.max(state.animationRecoil, 0.16 + snapReleaseLoad * 0.76)
  state.animationStretch = Math.max(state.animationStretch, 0.14 + snapReleaseLoad * 0.52)
  state.animationMouthTug = Math.max(state.animationMouthTug, 0.2 + snapReleaseLoad * 0.68)
  state.animationBodyJolt = Math.max(state.animationBodyJolt, 0.08 + snapReleaseLoad * 0.34)
  state.flash = Math.max(state.flash, 0.1 + snapReleaseLoad * 0.38)
  state.recoil = Math.max(state.recoil, 0.06 + snapReleaseLoad * 0.28)
  state.gulpFlow = Math.min(state.gulpFlow, Math.max(0, 0.24 - snapReleaseLoad * 0.16))
  state.glugPulse = Math.max(state.glugPulse, snapReleaseLoad * 0.28)
  state.deepEmbedState = 'pop-out-snap'
  state.deepEmbedReleaseReason = reason === 'overstretch' || reason === 'debug' ? 'tension' : 'detached'
  state.deepEmbedFleckBurst = Math.max(state.deepEmbedFleckBurst, popStrength * 0.42)
  state.deepEmbedPocketPulse = Math.max(state.deepEmbedPocketPulse, popStrength * 0.54)
  state.slimeSealDemand = 0
  state.slimeSealStrength = 0
  state.hoseHookStrength = 0
  state.sealTargetMoteId = -1
  state.sealTargetPileIndex = -1
  state.sealTargetScore = 0
  state.anchorSealCompressionTimer = 0
  state.suctionApproachPull = 0
  state.suctionApproachSettle = 0
  state.suctionApproachLocked = false
  state.anchorOverstretchTimer = 0
  state.anchorQueuedReleaseReason = 'none'
  state.hoseReachLockedToAnchor = false
  state.suctionState = 'releasing'
}

function requestStickyAnchorRelease(state: VacuumRuntime, reason: StickySuctionReleaseReason = 'manual') {
  if (state.suctionState === 'sealed') {
    state.anchorQueuedReleaseReason = reason
  }
}

function updateStickySuctionState(state: VacuumRuntime, t: number, dt: number, hookDemand: number) {
  const preset = getStretchSnapPresetTuning(state)
  const previousState = state.suctionState
  const hasTarget = state.sealTargetMoteId >= 0
  const liveBodyIntersectionRisk = updateHoseBodySafety(state)
  const candidateBodyIntersectionRisk = hasTarget
    ? measureHoseBodyIntersectionRisk(state, state.slimeSealPoint)
    : 0
  const candidateWouldIntersectBody = candidateBodyIntersectionRisk > 0.001
  const releaseCooldownActive = state.anchorPostReleaseControlTimer > 0.015
  const graceCatchReady = state.anchorReattachGraceTimer > 0.015
    && hasTarget
    && state.sealTargetMoteId !== state.anchorReleaseTargetMoteId
    && (state.anchorReleaseTargetPileIndex < 0 || state.sealTargetPileIndex !== state.anchorReleaseTargetPileIndex)
    && (state.anchorReattachCandidateMoteId < 0 || state.anchorReattachCandidateMoteId === state.sealTargetMoteId)
  const sameAnchorCooldown = hasTarget
    && (state.sealTargetMoteId === state.anchorReleaseTargetMoteId
      || (state.anchorReleaseTargetPileIndex >= 0 && state.sealTargetPileIndex === state.anchorReleaseTargetPileIndex))
    && state.anchorReattachCooldownTimer > 0.015
  const sealReady = (!releaseCooldownActive || graceCatchReady)
    && !sameAnchorCooldown
    && hasTarget
    && !candidateWouldIntersectBody
    && state.slimeSealStrength >= PRODUCTION_TUNING.suction.stickySealStrengthThreshold
    && state.hoseHookStrength >= PRODUCTION_TUNING.suction.stickySealHookThreshold
  const contactReady = hasTarget && !candidateWouldIntersectBody && (
    state.mouthSurfaceContactState === 'touching'
      || state.mouthSurfaceContactState === 'embedded'
      || state.mouthSurfaceCompression > 0.1
      || state.mouthSealRing > 0.12
      || state.mouthSurfaceDistance < PRODUCTION_TUNING.suction.physicalContactGraceDistance
  )
  const releaseStrength = PRODUCTION_TUNING.suction.stickySealReleaseStrength
  const reattachCatchStabilizing = state.anchorReattachLastCatchTargetId === state.sealTargetMoteId
    && t - state.anchorReattachLastCatchAt < PRODUCTION_TUNING.suction.reattachCatchStabilizeTime
  const overstretchActive = !reattachCatchStabilizing && (
    state.anchorTension >= PRODUCTION_TUNING.suction.overstretchThreshold
    || state.anchorStretch >= preset.maxStretch
    || state.anchorCurrentDistance >= state.anchorRestLength + preset.maxStretch
  )
  state.anchorOverstretchTimer = previousState === 'sealed' && overstretchActive
    ? state.anchorOverstretchTimer + dt
    : damp(state.anchorOverstretchTimer, 0, 10.5, dt)
  const latchMotionHold = previousState === 'sealed'
    && state.anchorAttachAge < PRODUCTION_TUNING.suction.latchInfluenceMotionHoldSeconds
    && state.velocity.length() > PRODUCTION_TUNING.suction.latchInfluenceMinSpeed * 0.72
  const latchOverstretchHold = latchMotionHold
    && state.anchorLatchInfluence > 0.16
    && state.anchorTension < 1.08
  const hardOverstretchRelease = state.anchorStretch >= preset.maxStretch * 1.72
    || state.anchorCurrentDistance >= state.anchorRestLength + preset.maxStretch * 1.72
  const overstretchRelease = hardOverstretchRelease || (!latchOverstretchHold && (
    state.anchorOverstretchTimer >= PRODUCTION_TUNING.suction.overstretchHoldTime
    || state.anchorStretch >= preset.maxStretch * 1.16
  ))
  const targetMissing = !hasTarget
  const sealLost = hookDemand < releaseStrength && state.hoseHookStrength < releaseStrength && !latchMotionHold
  const bodyIntersectionRelease = previousState === 'sealed' && liveBodyIntersectionRisk > 0.001
  if (previousState === 'sealed') {
    if (state.anchorQueuedReleaseReason !== 'none') {
      releaseStickyAnchor(state, state.anchorQueuedReleaseReason, t)
    } else if (targetMissing) {
      releaseStickyAnchor(state, 'lostSlime', t)
    } else if (bodyIntersectionRelease) {
      releaseStickyAnchor(state, 'bodyIntersection', t)
    } else if (overstretchRelease) {
      releaseStickyAnchor(state, 'overstretch', t)
    } else if (sealLost) {
      releaseStickyAnchor(state, 'lostSlime', t)
    }
  } else if (sealReady) {
    state.suctionState = 'sealed'
    captureStickyAnchor(state, t)
  } else if (contactReady) {
    state.suctionState = 'contact'
  } else if (previousState === 'releasing' && (state.hoseHookStrength > 0.08 || state.tetherRelease > 0.05)) {
    state.suctionState = 'releasing'
  } else if (hasTarget || hookDemand > 0.035 || state.suctionApproachPull > 0.02) {
    state.suctionState = 'prePull'
  } else if (state.suctionReadiness > 0.012 || state.slimeMagneticPull > 0.012 || state.slimeContactReadiness > 0.012) {
    state.suctionState = 'seeking'
  } else {
    state.suctionState = 'free'
    state.anchorQueuedReleaseReason = 'none'
  }

  if (state.suctionState === 'sealed') {
    enforceStickyAnchorImmutability(state, t)
    state.anchorCurrentDistance = state.position.distanceTo(state.anchorWorldPosition)
    state.anchorStretch = Math.max(0, state.anchorCurrentDistance - state.anchorRestLength)
    state.anchorAttachAge = Math.max(0, t - state.anchorAttachStartedAt)
    state.anchorDrift = Math.max(state.anchorDrift, state.slimeHookPoint.distanceTo(state.anchorWorldPosition))
    state.anchorMaxDrift = Math.max(state.anchorMaxDrift, state.anchorDrift)
    state.slimeSealPoint.copy(state.anchorWorldPosition)
    state.slimeSealAnchorPoint.copy(state.anchorWorldPosition)
    state.slimeHookPoint.copy(state.anchorWorldPosition)
    state.pivotPoint.copy(state.anchorWorldPosition)
    enforceStickyAnchorImmutability(state, t)
  } else if (state.suctionState === 'contact') {
    state.mouthSurfaceCompression = Math.max(state.mouthSurfaceCompression, 0.24)
    state.mouthSealRing = Math.max(state.mouthSealRing, 0.26)
    state.animationMouthTug = Math.max(state.animationMouthTug, previousState === 'contact' ? 0.12 : 0.28)
    state.controllerMouthSettle = Math.max(state.controllerMouthSettle, 0.22)
    state.anchorSealSnapPulse = Math.max(state.anchorSealSnapPulse, previousState === 'contact' ? 0.16 : 0.34)
  } else {
    state.anchorCurrentDistance = state.position.distanceTo(state.anchorWorldPosition)
    state.anchorStretch = Math.max(0, state.anchorCurrentDistance - state.anchorRestLength)
    state.anchorAttachAge = state.anchorAttachStartedAt > -900 ? Math.max(0, t - state.anchorAttachStartedAt) : 0
    if (state.suctionState === 'free') {
      state.anchorDrift = 0
      state.anchorLockDrift = 0
    }
  }
}

function createOrganicBlobGeometry(widthSegments: number, heightSegments: number, seed: number, lumpStrength: number) {
  const geometry = new THREE.SphereGeometry(1, widthSegments, heightSegments)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const vertex = new THREE.Vector3()

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index)
    const angle = Math.atan2(vertex.z, vertex.x)
    const vertical = vertex.y
    const foot = smooth01((-vertical - 0.24) / 0.76)
    const crown = smooth01((vertical + 0.1) / 1.1)
    const shoulder = Math.sin(angle * 2.0 + seed) * 0.12
      + Math.sin(angle * 3.0 - seed * 1.7 + vertical * 2.2) * 0.08
      + Math.sin(angle * 5.0 + seed * 0.6 - vertical * 1.4) * 0.045
    const sideSag = Math.sin(angle + seed * 1.9) * 0.09 * (1 - Math.abs(vertical) * 0.55)
    const radialScale = 1 + shoulder * lumpStrength + foot * 0.12 - crown * 0.035
    const zScale = 1 + sideSag * lumpStrength
    const flattenedY = vertex.y * (1 - foot * 0.22) + foot * 0.12

    position.setXYZ(
      index,
      vertex.x * radialScale,
      flattenedY * (1 + Math.sin(angle * 2.4 + seed) * 0.035 * lumpStrength),
      vertex.z * radialScale * zScale,
    )
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function createRuntime(devMode: ProductionDevModeId = 'full-loop'): VacuumRuntime {
  const state: VacuumRuntime = {
    position: new THREE.Vector3(-0.35, 0.62, 0.15),
    velocity: new THREE.Vector3(),
    baseVelocity: new THREE.Vector3(),
    playerMovementForce: new THREE.Vector3(),
    suctionForce: new THREE.Vector3(),
    snapImpulse: new THREE.Vector3(),
    externalForces: new THREE.Vector3(),
    previousVelocity: new THREE.Vector3(),
    target: new THREE.Vector3(0.45, 0.62, 0.25),
    cursorWorldPosition: new THREE.Vector3(0.45, 0.62, 0.95),
    hoseTarget: new THREE.Vector3(0.45, 0.62, 0.95),
    hoseAimPoint: new THREE.Vector3(0.45, 0.62, 0.95),
    hoseAimLag: 0,
    hoseAimJitter: 0,
    hoseAimResponsiveness: PRODUCTION_TUNING.movement.hoseAimIdleResponsiveness,
    hoseAimStability: 1,
    hoseAimReach: PRODUCTION_TUNING.movement.hoseAimBodyIdleReach,
    hoseReachCenter: new THREE.Vector3(-0.35, 0.62, 0.43),
    desiredHoseMouthPosition: new THREE.Vector3(-0.35, 0.72, 0.37),
    actualHoseMouthPosition: new THREE.Vector3(-0.35, 0.72, 0.37),
    hoseMouthVelocity: new THREE.Vector3(),
    hoseReachLocal: new THREE.Vector3(0, 0.1, -PRODUCTION_TUNING.movement.hoseAimBodyIdleReach),
    hoseReachClamped: false,
    hoseReachExtension: 0,
    hoseReachForwardAmount: PRODUCTION_TUNING.movement.hoseAimBodyIdleReach,
    hoseReachSideAmount: 0,
    hoseReachTargetClampedDistance: 0,
    hoseReachLockedToAnchor: false,
    hoseBodyForwardClearance: PRODUCTION_TUNING.movement.hoseAimBodyIdleReach,
    hoseBodySideClearance: 0,
    hoseBodyPlanarClearance: PRODUCTION_TUNING.movement.hoseAimBodyIdleReach,
    hoseBodyIntersectionRisk: 0,
    hoseBlowInputActive: false,
    hoseBlowStrength: 0,
    hoseBlowPressure: 0,
    hoseBlowPush: 0,
    hoseBlowAffectedMotes: 0,
    hoseBlowMaxDistance: 0,
    hoseBlowReleasePulse: 0,
    mouth: new THREE.Vector3(-0.35, 0.72, 1.18),
    slimeSealPoint: new THREE.Vector3(-0.35, 0.52, 1.1),
    slimeHookPoint: new THREE.Vector3(-0.35, 0.52, 1.1),
    slimeSealAnchorPoint: new THREE.Vector3(-0.35, 0.52, 1.1),
    hoseHookOffset: new THREE.Vector3(),
    hoseHookVelocity: new THREE.Vector3(),
    snapMomentum: new THREE.Vector3(),
    forward: new THREE.Vector3(0, 0, 1),
    mouthForward: new THREE.Vector3(0, 0, 1),
    devMode,
    reattachChainVariant: getInitialReattachChainVariant(),
    stretchSnapPreset: getInitialStretchSnapPreset(),
    sealTargetMoteId: -1,
    sealTargetPileIndex: -1,
    sealTargetScore: 0,
    postSnapReattachTimer: 0,
    yaw: Math.PI,
    pulse: 0.55,
    recoil: 0,
    flash: 0,
    gulpFlow: 0,
    gulpAge: 9,
    glugPulse: 0,
    glugMassFlow: 0,
    glugCycles: 0,
    glugLastAt: -999,
    glugLastAge: 999,
    glugCountThisAttachment: 0,
    glugEventStrength: 0,
    glugEventMass: 0,
    glugFailedStrength: 0,
    bagFill: 0.22,
    bagFillTarget: 0.22,
    bagPulse: 0,
    bagOutlineShock: 0,
    bagShockwave: 0,
    bagShockwaveAge: 99,
    bagPressure: 0,
    bagBeauty: 0,
    bagCollectedMass: 0,
    bagFillAmount: 0,
    bagFillNormalized: 0,
    bagLastMassReceived: 0,
    bagReactionStrength: 0,
    bagNonUniformBulge: 0,
    bagGlow: 0,
    bagInternalMotion: 0,
    bagNearFull: false,
    bagGlugCountThisTest: 0,
    bagPulseDelayTimer: 0,
    bagQueuedPulse: 0,
    bagQueuedWobble: 0,
    bagQueuedBeauty: 0,
    bagQueuedFullPulse: 0,
    bagScaleX: 1,
    bagScaleY: 1,
    bagScaleZ: 1,
	    bagWobble: 0,
	    bagFullPulse: 0,
	    bagSlimeChroma: 0,
	    bagSlimeColor: new THREE.Color('#78ffe2'),
	    bagSlimeColorTarget: new THREE.Color('#78ffe2'),
	    bagSlimeTintStrength: 0,
	    bagSlimeTintPulse: 0,
    slimeComboCount: 0,
    slimeComboBest: 0,
    slimeComboTimer: 0,
    slimeComboPulse: 0,
    slimeComboBurst: 0,
    slimeComboShockwave: 0,
    slimeComboShockwaveAge: 99,
    slimeComboLabelAge: 99,
    slimeComboLastMoteId: -1,
    slimeComboLastPileIndex: -1,
    slimeComboWorldPosition: new THREE.Vector3(-0.35, 0.72, 0.37),
	    animationAnticipation: 0,
    animationStretch: 0,
    animationSlurp: 0,
    animationGlug: 0,
    animationSlide: 0,
    animationSnap: 0,
    animationRecoil: 0,
    animationBag: 0,
    animationCompletion: 0,
    animationMouthTug: 0,
    animationBodyJolt: 0,
    animationStrandPinch: 0,
    slimeCompletionNearEmpty: 0,
    slimeCompletionFinalStrand: 0,
    slimeCompletionFinalGlug: 0,
    slimeCompletionCleanup: 0,
    slimeCompletionChainReady: 0,
    slimeSealDemand: 0,
    slimeSealStrength: 0,
    slimeSealAge: 0,
    suctionState: 'free',
    stretchSnapState: 'free',
    stretchSnapPreviousState: 'free',
    stretchSnapStateAge: 0,
    stretchSnapTensionJuice: 0,
    stretchSnapCameraImpulse: 0,
    stretchSnapAudioCue: 'none',
    stretchSnapAudioIntensity: 0,
    stretchSnapLastAudioAt: -999,
    anchorWorldPosition: new THREE.Vector3(-0.35, 0.52, 1.1),
    anchorInitialWorldPosition: new THREE.Vector3(-0.35, 0.52, 1.1),
    anchorReleasePoint: new THREE.Vector3(-0.35, 0.52, 1.1),
    anchorReleaseDirection: new THREE.Vector3(),
    anchorSnapImpulseVector: new THREE.Vector3(),
    anchorSnapDirectionDot: 0,
    anchorReleasePreviewStrength: 0,
    anchorFinalSqueeze: 0,
    anchorRestLength: PRODUCTION_TUNING.suction.elasticRestLength,
    anchorCurrentDistance: 0,
    anchorAttachStartedAt: -999,
    anchorAttachAge: 0,
    anchorDrift: 0,
    anchorMaxDrift: 0,
    anchorLockDrift: 0,
    anchorMaxLockDrift: 0,
    anchorDriftViolationCount: 0,
    anchorDriftViolationPulse: 0,
    anchorLastDriftViolationAt: -999,
    anchorSealSnapPulse: 0,
    anchorSealCompressionTimer: 0,
    anchorReleaseReason: 'none',
    anchorQueuedReleaseReason: 'none',
    anchorReleaseTargetMoteId: -1,
    anchorReleaseTargetPileIndex: -1,
    anchorStretch: 0,
    anchorTension: 0,
    anchorPreviousTension: 0,
    anchorTensionVelocity: 0,
    anchorElasticBounce: 0,
    anchorReboundImpulse: 0,
    anchorPlayerControlMultiplier: 1,
    anchorDriftRetentionMultiplier: PRODUCTION_TUNING.movement.driftRetention,
    anchorDirectionToAnchor: new THREE.Vector3(0, 0, 1),
    anchorSpringForceVector: new THREE.Vector3(),
    anchorDampingForceVector: new THREE.Vector3(),
    anchorElasticForceVector: new THREE.Vector3(),
    anchorSpringForce: 0,
    anchorDampingForce: 0,
    anchorLateralDamping: 0,
    anchorRadialVelocity: 0,
    anchorTangentVelocity: 0,
    anchorLatchInfluence: 0,
    anchorLatchPivotActive: false,
    anchorLatchTurnForce: 0,
    anchorLatchTangentPreserve: 0,
    anchorLatchRadialDamping: 0,
    anchorLatchAngularVelocity: 0,
    anchorLatchDirection: new THREE.Vector3(),
    anchorLatchOffAxis: 0,
    anchorLatchRedirectStrength: 0,
    anchorLatchPivotKick: 0,
    anchorOverstretchTimer: 0,
    anchorReleaseTension: 0,
    anchorSnapImpulseMagnitude: 0,
    anchorPostReleaseVelocity: 0,
    anchorPostReleaseControlTimer: 0,
    anchorPostReleaseControlCurve: 0,
    anchorPopJuice: 0,
    anchorPopRing: 0,
    anchorReattachGraceTimer: 0,
    anchorReattachCooldownTimer: 0,
    anchorReattachCandidateMoteId: -1,
    anchorReattachCandidateScore: 0,
    anchorReattachCandidateAge: 0,
    anchorReattachCandidatePoint: new THREE.Vector3(-0.35, 0.52, 1.1),
    anchorReattachAssistDirection: new THREE.Vector3(0, 0, 1),
    anchorReattachRejectedCandidateMoteId: -1,
    anchorReattachRejectedCandidateScore: 0,
    anchorReattachRejectedCandidateReason: 'none',
    anchorReattachAssistStrength: 0,
    anchorReattachCatchPulse: 0,
    anchorReattachCatchCount: 0,
    anchorReattachLastCatchAt: -999,
    anchorReattachLastCatchTargetId: -1,
    anchorReattachLastCatchPileIndex: -1,
    hoseHookStrength: 0,
    swingTension: 0,
    swingEnergy: 0,
    bodyControl: 0.42,
    hoseWildness: 0.44,
    hoseContactSettle: 0,
    tetherRestLength: PRODUCTION_TUNING.hose.hoseRestLength,
    tetherStrain: 0,
    tetherRelease: 0,
    suctionReadiness: 0,
    controllerGripQuality: 0,
    controllerMouthSettle: 0,
    suctionApproachSettle: 0,
    suctionApproachPull: 0,
    suctionApproachLocked: false,
    controllerReleaseMomentum: 0,
    controllerSwingFlow: 0,
    controllerWinchPull: 0,
    controllerReattachGrace: 0,
    controllerAnchorLoad: 0,
    pivotLocked: false,
    pivotPoint: new THREE.Vector3(-0.35, 0.52, 1.1),
    pivotLockDuration: 0,
    pivotAngularVelocity: 0,
    pivotTangentialSpeed: 0,
    pivotRadialDistance: 0,
    pivotHoseStretchRatio: 0,
    pivotTension: 0,
    pivotSnapThreshold: PRODUCTION_TUNING.pivot.snapTensionThreshold,
    pivotSwingAssist: 0,
    pivotHoseVisualStretch: 0,
    pivotHoseThinning: 0,
    pivotHoseWobble: 0,
    pivotSnapReadiness: 0,
    pivotReattachCooldown: 0,
    pivotCandidateTargetId: -1,
    pivotReleaseReason: 'none',
    gripInputDown: false,
    gripRequestQueued: false,
    gripReleaseQueued: false,
    gripActive: false,
    gripState: 'idle',
    gripTargetPileIndex: -1,
    gripTargetMoteId: -1,
    gripContactIndex: -1,
    gripContactPoint: new THREE.Vector3(-0.35, 0.52, 1.1),
    gripLockPoint: new THREE.Vector3(-0.35, 0.52, 1.1),
    gripHoldTime: 0,
    gripSpinAngle: 0,
    gripSpinSpeed: 0,
    gripReleaseWindowWidth: PRODUCTION_TUNING.grip.gripReleaseWindowBase,
    gripReleaseQuality: 0,
    gripReleaseReady: 0,
    gripReleaseCue: 0,
    gripReleaseReadiness: 0,
    gripReleasePhaseQuality: 0,
    gripReleaseGraceTimer: 0,
    gripDizzy: 0,
    gripMissCount: 0,
    gripMissPulse: 0,
    gripWindowWasOpen: false,
    gripLockPulse: 0,
    gripEntryPull: 0,
    gripPhysicalCue: 0,
    gripPocketBiteCue: 0,
    gripHoseStrainCue: 0,
    gripMouthAnticipationCue: 0,
    gripSpinoutPulse: 0,
    gripCoughPulse: 0,
    gripCooldown: 0,
    gripMassMultiplier: 1,
    gripGlugBoost: 1,
    gripLastReleaseQuality: 0,
    gripReleaseReason: 'none',
    slimeColourActivity: 0,
    slimeColourOpal: 0,
    slimeColourPocket: 0,
    slimeColourVein: 0,
    slimeColourDrift: 0,
    slimePhysicsStretch: 0,
    slimePhysicsContraction: 0,
    slimePhysicsYield: 0,
    slimePhysicsMergeHeat: 0,
    slimePhysicsAbsorbing: 0,
    slimePhysicsSurfaceTension: 0,
    slimePhysicsPoolPressure: 0,
    slimePhysicsSuctionStrain: 0,
    slimePhysicsTendrils: 0,
    slimeLivingPulse: 0,
    slimeLivingCreep: 0,
    slimeLivingCongeal: 0,
    slimeLivingBreak: 0,
    slimeReferenceDrift: 0,
    slimeReferenceMerge: 0,
    slimeReferenceSplit: 0,
    slimeReferenceRelocation: 0,
    slimeContactAdhesion: 0,
    slimeContactFunnel: 0,
    slimeContactNeck: 0,
    slimeContactReadiness: 0,
    slimeContactDent: 0,
    slimeContactRope: 0,
    slimeContactFeed: 0,
    slimeContactSnap: 0,
    slimeSnapBondGrip: 0,
    slimeSnapBondTension: 0,
    slimeSnapBondStrain: 0,
    slimeSnapBondBreak: 0,
    slimeIntakeFlow: 0,
    slimeMassFeed: 0,
    slimeMaterialWake: 0,
    slimeMaterialDepth: 0,
    slimeMaterialElastic: 0,
    slimeMagneticPull: 0,
    slimeOrganicHold: 0,
    slimeEasySuctionAssist: 0,
  slimeEasySuctionPull: 0,
  slimeEasySuctionFeed: 0,
  slimeGrowthWake: 0,
  slimeVacuumableVisibleCount: 0,
  slimeVacuumableTinyCount: 0,
  slimeVacuumableStrandedCount: 0,
  slimeGameplayVisibleMass: 0,
  slimeVisualEffectResidueCount: 0,
	    slimeHoseFlow: 0,
	    slimeHoseBolus: 0,
	    slimeHoseBulge: 0,
	    slimeMouthThread: 0,
	    suctionContactBridgeActive: 0,
	    suctionContactBridgeLength: 0,
		    suctionContactBridgeThickness: 0,
		    suctionContactSealQuality: 0,
		    suctionContactPatchPoint: new THREE.Vector3(-0.35, 0.72, 1.33),
		    mouthSurfaceContactState: 'floating',
		    mouthSurfaceDistance: 999,
		    mouthSurfaceCompression: 0,
		    mouthSealRing: 0,
		    mouthFloatingWarning: 0,
		    hoseSlimeInteractionPhase: 'idle',
		    hoseSlimeNear: 0,
		    hoseSlimeTouch: 0,
		    hoseSlimeSeal: 0,
		    hoseSlimeStretch: 0,
		    hoseSlimeGulp: 0,
		    hoseSlimeStrain: 0,
		    hoseSlimePop: 0,
		    suctionContactGlugTimer: 0,
	    suctionContactMassTransferred: 0,
	    suctionContactCurrentMass: 0,
	    suctionContactBridgeStrain: 0,
	    deepEmbedState: 'searching',
	    deepEmbedDepth: 0,
	    deepEmbedLockStrength: 0,
	    deepEmbedSnapThreshold: PRODUCTION_TUNING.embed.embedSnapThreshold,
	    deepEmbedAnglePenalty: 0,
	    deepEmbedTensionPenalty: 0,
	    deepEmbedReleaseReason: 'none',
	    deepEmbedGlugCount: 0,
	    deepEmbedMassTransferred: 0,
	    deepEmbedPocketPulse: 0,
	    deepEmbedRimOcclusion: 0,
	    deepEmbedFleckBurst: 0,
	    snapBreakPoint: new THREE.Vector3(-0.35, 0.72, 1.33),
    snapBreakPulse: 0,
    snapBreakCycles: 0,
    flowMetrics: createFlowMetricsState(0),
    levelState: 'boot',
    levelReadyAt: 0,
    levelStartedAt: 0,
    levelCompletedAt: -1,
    levelTime: 0,
    levelStartMass: 0,
    levelRemainingMass: 0,
    levelCompletionPercent: 0,
    levelMajorGlobsRemaining: 0,
    levelNearComplete: false,
    levelCompletionTriggered: false,
    levelCompletionTriggerTimer: 0,
    levelCompletionAnimationTime: 0,
    levelCompletionPhase: 'idle',
    levelCompletionPhaseTime: 0,
    levelCompletionPulse: 0,
    levelDiscoIntensity: 0,
    levelCompletionGlow: 0,
    levelCompletionHoseWobble: 0,
    levelCompletionVacuumBounce: 0,
    levelCompletionVacuumSpin: 0,
    levelCompletionSummaryReady: false,
    levelCompletionSnapshot: null,
    levelCompletionSummary: null,
    levelWaveIndex: getLevelWaveIndex(getInitialLevelDifficulty()),
    levelWaveTimeLimit: getLevelWaveTimeLimit(getInitialLevelDifficulty()),
    levelTimeRemaining: getLevelWaveTimeLimit(getInitialLevelDifficulty()),
    levelNoCollectionTime: 0,
    levelNoCollectionPressure: 0,
    levelSlowCleanupPressure: 0,
    levelSlowCleanupDeficit: 0,
    levelLossProgress: 0,
  levelVisibleGunkCoverage: FIRST_LEVEL_TUNING.gunkCoverageBaseline,
  levelVisualClearPercent: 0,
  levelGunkDanger: FIRST_LEVEL_TUNING.gunkDangerBaseline,
  levelGunkOvergrowth: 0,
  levelGunkOvergrowthCleanupCredit: 0,
  levelSlimeFloorTakeover: 0,
  levelRawVisibleMass: 0,
  levelTideVisibleMotes: 0,
  levelTideActiveMotes: 0,
  levelSlimeGenerationRate: 0,
  levelSlimeGenerationAddedMass: 0,
  levelSlimeGenerationBudCount: 0,
  levelSlimeGenerationBudBudget: 0,
  levelSlimeGenerationActivePieces: 0,
  levelSlimeGenerationSuppression: 0,
  levelCollectedMassAtStart: 0,
    levelLastRawCollectedMass: 0,
    levelLastCollectedMass: 0,
    levelLastCleanupProgress: 0,
    levelNoGunkGraceSeconds: FIRST_LEVEL_TUNING.noCollectionGraceSeconds
      * getLevelDifficultyConfig(getInitialLevelDifficulty()).noCollectionGraceScale,
    levelOvertakePressure: 0,
    levelOvertakeDanger: 0,
    levelOvertakePulse: 0,
    levelDefeatTriggered: false,
    levelDefeatedAt: -1,
    levelDefeatAnimationTime: 0,
    levelDefeatPhase: 'idle',
    levelDefeatGunkSpread: 0,
    levelDefeatVacuumSink: 0,
    levelShopReady: false,
    levelCurrencyEarned: 0,
    levelStylePoints: 0,
    levelGunkValue: 0,
    levelCoinValue: 0,
    levelPileStartMasses: [],
    levelDifficulty: getInitialLevelDifficulty(),
    levelClearTarget: getLevelCleanupTarget(getInitialLevelDifficulty()),
    levelProgressTowardTarget: 0,
    levelRegenRate: 0,
    levelPartyProgress: 0,
    levelRegenPressure: 0,
    levelRegenBank: 0,
    levelRegenCursor: 0,
    levelRegeneratedMass: 0,
    levelCleanupAssist: 0,
    levelRegenResetPulse: 0,
    levelResetRequested: 0,
    levelResetSerial: 0,
    active: false,
    pointerDown: false,
    hoseActive: false,
    bodyInputX: 0,
    bodyInputZ: 0,
    bodyInputActive: false,
    lastBodyInputX: 0,
    lastBodyInputZ: 0,
    lastBodyInputActive: false,
    movementAcceleration: 0,
    movementDriftFactor: 0,
    movementLateralSpeed: 0,
    movementFacingVelocityAngle: 0,
    movementVelocityDirection: 0,
    movementInputChangeBoost: 0,
    movementSkid: 0,
    movementLean: 0,
    movementSquash: 0,
    movementWobble: 0,
    mouseBodyInputX: 0,
    mouseBodyInputZ: 0,
    mouseBodyInputActive: false,
    swallowCycles: 0,
    completionCycles: 0,
    fps: 60,
    frameMs: 16.7,
    maxFrameMs: 16.7,
  }
  applyRuntimeDevPreset(state)
  return state
}

function triggerBagInkShock(state: VacuumRuntime, strength: number) {
  const shock = clampValue(strength * PRODUCTION_TUNING.bag.bagOutlineShockStrength, 0, 2.85)
  if (shock <= 0.001) return
  state.bagOutlineShock = Math.min(2.85, Math.max(state.bagOutlineShock, shock))
  state.bagShockwave = Math.min(3.0, Math.max(state.bagShockwave, shock * PRODUCTION_TUNING.bag.bagShockwaveStrength))
  state.bagShockwaveAge = 0
}

function registerSlimeComboHit(
  state: VacuumRuntime,
  moteId: number,
  pileIndex: number,
  worldPosition: THREE.Vector3,
  strength = 1,
): SlimeComboReward {
  if (!isFirstLevelMode(state.devMode)) {
    return { active: false, streak: 0, level: 0, massMultiplier: 1, pulseMultiplier: 1 }
  }
  const comboWasAlive = state.slimeComboTimer > 0
  state.slimeComboCount = comboWasAlive
    ? Math.min(PRODUCTION_TUNING.bag.comboMaxStreak, state.slimeComboCount + 1)
    : 1
  state.slimeComboBest = Math.max(state.slimeComboBest, state.slimeComboCount)
  state.slimeComboTimer = PRODUCTION_TUNING.bag.comboWindowSeconds
  state.slimeComboLabelAge = 0
  state.slimeComboLastMoteId = moteId
  state.slimeComboLastPileIndex = pileIndex
  state.slimeComboWorldPosition.copy(worldPosition)

  const active = state.slimeComboCount >= PRODUCTION_TUNING.bag.comboMinStreak
  const level = active
    ? clampValue(
      (state.slimeComboCount - PRODUCTION_TUNING.bag.comboMinStreak + 1)
        / Math.max(1, PRODUCTION_TUNING.bag.comboMaxStreak - PRODUCTION_TUNING.bag.comboMinStreak + 1),
      0,
      1,
    )
    : 0
  const anticipation = active ? 0.58 + level * 0.72 : 0.16
  const comboStrength = anticipation * clampValue(strength, 0.45, 1.65)
  state.slimeComboPulse = Math.min(2.25, Math.max(state.slimeComboPulse, comboStrength * (active ? 1.08 : 0.32)))
  state.slimeComboBurst = Math.min(2.4, Math.max(state.slimeComboBurst, active ? comboStrength : 0))
  state.slimeComboShockwave = Math.min(
    3.2,
    Math.max(state.slimeComboShockwave, active ? comboStrength * PRODUCTION_TUNING.bag.comboRingStrength : 0),
  )
  if (active) state.slimeComboShockwaveAge = 0
  state.bagPulse = Math.min(2.85, state.bagPulse + comboStrength * PRODUCTION_TUNING.bag.comboPulseBoost * (active ? 0.7 : 0.18))
  state.bagWobble = Math.min(2.45, Math.max(state.bagWobble, comboStrength * 0.72))
  state.bagBeauty = Math.min(2.35, Math.max(state.bagBeauty, 0.55 + level * PRODUCTION_TUNING.bag.comboGlowBoost))
  state.bagGlow = Math.min(2.65, Math.max(state.bagGlow, active ? 0.85 + level * PRODUCTION_TUNING.bag.comboGlowBoost : 0.28))
  state.bagFullPulse = Math.min(2.45, Math.max(state.bagFullPulse, active ? 0.62 + level * 0.84 : state.bagFullPulse))
  state.bagReactionStrength = Math.min(3.2, Math.max(state.bagReactionStrength, comboStrength * 1.12))
  state.bagNonUniformBulge = Math.min(1.58, Math.max(state.bagNonUniformBulge, active ? 0.62 + level * 0.6 : 0.18))
  state.bagSlimeChroma = Math.min(2.55, Math.max(state.bagSlimeChroma, active ? 0.9 + level * 0.7 : state.bagSlimeChroma))
  state.bagSlimeColorTarget.lerp(bagComboColor, active ? 0.42 + level * 0.24 : 0.16)
  state.bagSlimeTintPulse = Math.min(2.65, state.bagSlimeTintPulse + (active ? 0.52 + level * 0.42 : 0.12))
  state.animationBag = Math.max(state.animationBag, active ? 0.82 + level * 0.56 : 0.24)
  state.animationBodyJolt = Math.max(state.animationBodyJolt, active ? 0.38 + level * 0.24 : state.animationBodyJolt)
  if (active) {
    triggerBagInkShock(state, PRODUCTION_TUNING.bag.comboShockBoost * comboStrength)
  }

  return {
    active,
    streak: state.slimeComboCount,
    level,
    massMultiplier: active ? 1 + PRODUCTION_TUNING.bag.comboMassBoost * (0.8 + level) : 1,
    pulseMultiplier: active ? 1 + PRODUCTION_TUNING.bag.comboPulseBoost * (0.48 + level * 0.62) : 1,
  }
}

function triggerSlimeComboDevBurst(state: VacuumRuntime, count = 5) {
  const hits = Math.max(PRODUCTION_TUNING.bag.comboMinStreak, Math.min(PRODUCTION_TUNING.bag.comboMaxStreak, Math.round(count)))
  let reward: SlimeComboReward = { active: false, streak: 0, level: 0, massMultiplier: 1, pulseMultiplier: 1 }
  for (let index = 0; index < hits; index += 1) {
    reward = registerSlimeComboHit(state, 9000 + index, index % 7, state.mouth, 1.12)
  }
  if (reward.active) {
    feedBagReward(
      state,
      0.18 * hits * reward.massMultiplier,
      0.82 * reward.pulseMultiplier,
      0.58 * reward.pulseMultiplier,
      0.74 * reward.pulseMultiplier,
      { sealStrength: 0.82, countGlug: false, slimeColor: bagComboColor },
    )
  }
  return reward.streak
}

function feedBagReward(
  state: VacuumRuntime,
  incomingMass: number,
  glugPulse: number,
  glugMassFlow: number,
  swallowPulse: number,
  options: { sealStrength?: number; countGlug?: boolean; slimeColor?: THREE.Color } = {},
) {
  const previousBagFillAmount = state.bagFillAmount
  const reward = computeBagRewardResponse({
    collectedMass: state.bagCollectedMass,
    currentFill: state.bagFillTarget,
    currentPressure: state.bagPressure,
    currentBeauty: state.bagBeauty,
    incomingMass,
    glugPulse,
    glugMassFlow,
    swallowPulse,
    sealStrength: options.sealStrength ?? state.suctionContactSealQuality,
    tension: state.tetherStrain,
  })
  state.bagCollectedMass = reward.collectedMass
  state.bagFillAmount = reward.collectedMass
  state.bagFillNormalized = reward.fillNormalized
  if (reward.lastMassReceived > 0.0005) state.bagLastMassReceived = reward.lastMassReceived
  state.bagReactionStrength = Math.min(3, Math.max(state.bagReactionStrength, reward.reactionStrength))
  state.bagNonUniformBulge = Math.min(1.35, Math.max(state.bagNonUniformBulge, reward.nonUniformBulge))
  state.bagGlow = Math.min(2.25, Math.max(state.bagGlow, reward.glow))
  state.bagInternalMotion = Math.min(2.35, Math.max(state.bagInternalMotion, reward.internalMotion))
  state.bagNearFull = reward.nearFull > 0.5
  state.bagScaleX = Math.min(PRODUCTION_TUNING.bag.bagMaxSize, Math.max(state.bagScaleX, reward.scaleX))
  state.bagScaleY = Math.min(PRODUCTION_TUNING.bag.bagMaxSize * 1.1, Math.max(state.bagScaleY, reward.scaleY))
  state.bagScaleZ = Math.min(PRODUCTION_TUNING.bag.bagMaxSize, Math.max(state.bagScaleZ, reward.scaleZ))
  state.bagFillTarget = Math.min(PRODUCTION_TUNING.bag.bagMaxScale, Math.max(state.bagFillTarget, reward.fillTarget))
  const inkShock = reward.lastMassReceived > 0.0005
    ? reward.pulse * 0.74
      + reward.wobble * 0.34
      + reward.reactionStrength * 0.24
      + reward.fullPulse * 0.34
      + reward.lastMassReceived * 2.35
      + glugPulse * 0.28
      + swallowPulse * 0.18
    : 0
  if (options.countGlug && reward.lastMassReceived > 0.0005) {
    state.bagGlugCountThisTest += 1
    state.bagQueuedPulse = Math.min(2.05, Math.max(state.bagQueuedPulse, reward.pulse * BAG_REWARD_TUNING.pressurePulse))
    state.bagQueuedWobble = Math.min(1.8, Math.max(state.bagQueuedWobble, reward.wobble * BAG_REWARD_TUNING.wobble))
    state.bagQueuedBeauty = Math.min(2.15, Math.max(state.bagQueuedBeauty, reward.beauty * BAG_REWARD_TUNING.beautyPulse))
    state.bagQueuedFullPulse = Math.min(2.1, Math.max(state.bagQueuedFullPulse, reward.fullPulse * BAG_REWARD_TUNING.fullPulse))
    state.bagPulseDelayTimer = Math.max(state.bagPulseDelayTimer, PRODUCTION_TUNING.bag.bagPulseDelay)
  } else {
    state.bagPulse = Math.min(1.9, state.bagPulse + reward.pulse * BAG_REWARD_TUNING.pressurePulse * 0.44)
    state.bagWobble = Math.min(1.65, Math.max(state.bagWobble, reward.wobble * BAG_REWARD_TUNING.wobble * 0.42))
    triggerBagInkShock(state, inkShock * 0.72)
  }
  state.bagPressure = Math.min(2.15, Math.max(state.bagPressure, reward.pressure))
  state.bagBeauty = Math.min(2.05, Math.max(state.bagBeauty, reward.beauty))
  state.bagFullPulse = Math.min(2.1, Math.max(state.bagFullPulse, reward.fullPulse * BAG_REWARD_TUNING.fullPulse))
  state.bagSlimeChroma = Math.min(2.25, Math.max(state.bagSlimeChroma, reward.chroma))
  if (reward.lastMassReceived > 0.0005 && options.slimeColor) {
    const tintImpulse = clampValue(
      reward.lastMassReceived * 4.6 + reward.pulse * 0.18 + glugPulse * 0.2 + reward.fillNormalized * 0.22,
      0.18,
      1,
    )
    state.bagSlimeColorTarget.lerp(options.slimeColor, tintImpulse)
    state.bagSlimeColor.lerp(options.slimeColor, Math.min(0.9, tintImpulse * 0.88))
    state.bagSlimeTintStrength = Math.min(2.6, Math.max(state.bagSlimeTintStrength, tintImpulse * 1.18 + reward.fillNormalized * 0.58 + reward.chroma * 0.08))
    state.bagSlimeTintPulse = Math.min(2.4, state.bagSlimeTintPulse + tintImpulse * (1.08 + reward.pulse * 0.1))
  }
  recordFlowBagFill(state.flowMetrics, {
    time: state.flowMetrics.now,
    amount: reward.collectedMass,
    normalized: reward.fillNormalized,
    massGained: Math.max(0, reward.collectedMass - previousBagFillAmount),
  })
  return reward
}

function resetBagRewardState(state: VacuumRuntime) {
  state.bagFill = PRODUCTION_TUNING.bag.bagBaseScale
  state.bagFillTarget = PRODUCTION_TUNING.bag.bagBaseScale
  state.bagPulse = 0
  state.bagPressure = 0
  state.bagBeauty = 0
  state.bagCollectedMass = 0
  state.bagFillAmount = 0
  state.bagFillNormalized = 0
  state.bagLastMassReceived = 0
  state.bagReactionStrength = 0
  state.bagNonUniformBulge = 0
  state.bagGlow = 0
  state.bagInternalMotion = 0
  state.bagNearFull = false
  state.bagGlugCountThisTest = 0
  state.bagPulseDelayTimer = 0
  state.bagQueuedPulse = 0
  state.bagQueuedWobble = 0
  state.bagQueuedBeauty = 0
  state.bagQueuedFullPulse = 0
  state.bagScaleX = 1
  state.bagScaleY = 1
  state.bagScaleZ = 1
  state.bagWobble = 0
  state.bagFullPulse = 0
  state.bagSlimeChroma = 0
  state.bagSlimeColor.set('#78ffe2')
  state.bagSlimeColorTarget.set('#78ffe2')
  state.bagSlimeTintStrength = 0
  state.bagSlimeTintPulse = 0
  state.bagOutlineShock = 0
  state.bagShockwave = 0
  state.bagShockwaveAge = 99
  state.slimeComboCount = 0
  state.slimeComboBest = 0
  state.slimeComboTimer = 0
  state.slimeComboPulse = 0
  state.slimeComboBurst = 0
  state.slimeComboShockwave = 0
  state.slimeComboShockwaveAge = 99
  state.slimeComboLabelAge = 99
  state.slimeComboLastMoteId = -1
  state.slimeComboLastPileIndex = -1
  state.slimeComboWorldPosition.copy(state.mouth)
  state.animationBag = 0
}

function seedBagFillState(state: VacuumRuntime, normalizedFill: number, pulseStrength: number) {
  const fillAmount = clampValue(normalizedFill, 0, 1) * PRODUCTION_TUNING.bag.bagFillAmountMax
  const previousBagFillAmount = state.bagFillAmount
  const reward = computeBagRewardResponse({
    collectedMass: fillAmount,
    currentFill: state.bagFillTarget,
    currentPressure: state.bagPressure,
    currentBeauty: state.bagBeauty,
    incomingMass: 0,
    glugPulse: pulseStrength,
    glugMassFlow: pulseStrength * 0.58,
    swallowPulse: pulseStrength * 0.28,
    sealStrength: 1.16,
    tension: state.tetherStrain,
  })
  state.bagCollectedMass = reward.collectedMass
  state.bagFillAmount = reward.collectedMass
  state.bagFillNormalized = reward.fillNormalized
  state.bagFillTarget = Math.max(state.bagFillTarget, reward.fillTarget)
  state.bagFill = Math.max(state.bagFill, reward.fillTarget)
  state.bagPulse = Math.min(2.6, state.bagPulse + reward.pulse * 0.54)
  state.bagPressure = Math.min(2.15, Math.max(state.bagPressure, reward.pressure))
  state.bagBeauty = Math.min(2.05, Math.max(state.bagBeauty, reward.beauty))
  state.bagWobble = Math.min(2.05, Math.max(state.bagWobble, reward.wobble))
  state.bagFullPulse = Math.min(2.1, Math.max(state.bagFullPulse, reward.fullPulse))
  state.bagSlimeChroma = Math.min(2.25, Math.max(state.bagSlimeChroma, reward.chroma))
  state.bagSlimeColorTarget.copy(bagDevSmallColor).lerp(bagDevLargeColor, clampValue(normalizedFill, 0, 1))
  state.bagSlimeColor.copy(state.bagSlimeColorTarget)
  state.bagSlimeTintStrength = Math.min(2.35, Math.max(state.bagSlimeTintStrength, 0.36 + normalizedFill * 1.42 + pulseStrength * 0.34))
  state.bagSlimeTintPulse = Math.min(2.1, Math.max(state.bagSlimeTintPulse, pulseStrength * 0.62))
  state.bagReactionStrength = Math.min(3, Math.max(state.bagReactionStrength, reward.reactionStrength))
  state.bagNonUniformBulge = Math.min(1.35, Math.max(state.bagNonUniformBulge, reward.nonUniformBulge))
  state.bagGlow = Math.min(2.25, Math.max(state.bagGlow, reward.glow))
  state.bagInternalMotion = Math.min(2.35, Math.max(state.bagInternalMotion, reward.internalMotion))
  state.bagScaleX = Math.max(state.bagScaleX, reward.scaleX)
  state.bagScaleY = Math.max(state.bagScaleY, reward.scaleY)
  state.bagScaleZ = Math.max(state.bagScaleZ, reward.scaleZ)
  state.bagNearFull = reward.nearFull > 0.5
  triggerBagInkShock(state, reward.pulse * 0.54 + reward.fullPulse * 0.4 + pulseStrength * 0.72 + reward.reactionStrength * 0.2)
  state.animationBag = Math.max(state.animationBag, 0.4 + pulseStrength * 0.5)
  recordFlowBagFill(state.flowMetrics, {
    time: state.flowMetrics.now,
    amount: reward.collectedMass,
    normalized: reward.fillNormalized,
    massGained: Math.max(0, reward.collectedMass - previousBagFillAmount),
  })
}

function applyBagFillDevPreset(state: VacuumRuntime, preset: BagFillDevPreset) {
  if (state.devMode !== 'bag-fill') return
  if (preset === 'reset') {
    resetBagRewardState(state)
    resetFlowMetrics(state.flowMetrics, state.flowMetrics.now)
    return
  }
  if (preset === 'small-glug') {
    feedBagReward(state, 0.18, 0.55, 0.34, 0.05, { sealStrength: 0.58, countGlug: true, slimeColor: bagDevSmallColor })
    return
  }
  if (preset === 'large-glug') {
    feedBagReward(state, 0.72, 0.98, 0.88, 0.18, { sealStrength: 1.26, countGlug: true, slimeColor: bagDevLargeColor })
    return
  }
  if (preset === 'medium-fill') seedBagFillState(state, 0.45, 0.45)
  else if (preset === 'high-fill') seedBagFillState(state, 0.72, 0.62)
  else if (preset === 'near-full') seedBagFillState(state, 0.94, 0.95)
}

function spawnMote(mote: Mote, runtime: VacuumRuntime, t: number, spawnSlot = 0) {
  const centers = getModePileCenters(runtime.devMode)
  let pileIndex = Math.floor(seededNoise(mote.seed + 24.1 + t * 0.19) * centers.length) % centers.length
  if (centers === SLIME_PILE_CENTERS) {
    pileIndex = (spawnSlot * 7 + Math.floor(spawnSlot / Math.max(1, centers.length)) * 5) % centers.length
  } else if (runtime.devMode === 'suction-contact' || runtime.devMode === 'glug-rhythm' || runtime.devMode === 'deep-embed' || runtime.devMode === 'bag-fill') {
    pileIndex = seededNoise(mote.seed + spawnSlot * 0.17) > 0.24 ? 0 : 1 + (spawnSlot % 2)
  } else if (runtime.devMode === 'hose-swing') {
    pileIndex = seededNoise(mote.seed + spawnSlot * 0.23) > 0.3 ? 0 : 1 + (spawnSlot % 2)
  } else if (runtime.devMode === 'reattach-chain' || runtime.devMode === 'multi-glob-chain') {
    pileIndex = spawnSlot % centers.length
  }
  const resolvedPileIndex = ((pileIndex % centers.length) + centers.length) % centers.length
  const pileCenter = getModePileCenter(runtime.devMode, resolvedPileIndex, pileVector)
  const angle = seededNoise(mote.seed + 31.6 + t * 0.13) * Math.PI * 2
  const returnEnergy = Math.min(1.15, runtime.gulpFlow * 0.3 + runtime.flash * 0.12 + runtime.controllerReleaseMomentum * 0.1 + runtime.slimeGrowthWake * 0.18)
  const modeCompactness = runtime.devMode === 'suction-contact' || runtime.devMode === 'glug-rhythm' || runtime.devMode === 'deep-embed' || runtime.devMode === 'hose-swing' || runtime.devMode === 'reattach-chain' || runtime.devMode === 'bag-fill' ? 0.72 : 1
  const distance = 0.34 + seededNoise(mote.seed + 39.2 + t * 0.09) * (0.88 + returnEnergy * 0.28) * modeCompactness
  const oval = 0.72 + seededNoise(mote.seed + 47.5) * 0.62

  mote.pileIndex = resolvedPileIndex
  mote.home.copy(pileCenter)
  mote.home.x += Math.cos(angle) * distance * oval
  mote.home.z += Math.sin(angle) * distance * (1.22 - oval * 0.28)
  mote.home.y = SLIME_MOTE_FLOOR_Y + mote.size * 0.42
  clampWorld(mote.home)
  mote.home.y = SLIME_MOTE_FLOOR_Y + mote.size * 0.42
  mote.position.copy(mote.home)
  mote.anchor.copy(mote.home)
  mote.velocity.set(
    Math.cos(angle + Math.PI) * (0.1 + seededNoise(mote.seed + 12.4) * 0.13 + returnEnergy * 0.05) + Math.cos(angle + Math.PI / 2) * (0.035 + returnEnergy * 0.018),
    0.02 + seededNoise(mote.seed + 14.7) * 0.045 + returnEnergy * 0.035,
    Math.sin(angle + Math.PI) * (0.1 + seededNoise(mote.seed + 17.2) * 0.13 + returnEnergy * 0.05) + Math.sin(angle + Math.PI / 2) * (0.035 + returnEnergy * 0.018),
  )
  mote.mass = 0.84 + seededNoise(mote.seed + 64.2 + t * 0.017) * 0.34
  mote.visibleMass = 1
  if (isFirstLevelMode(runtime.devMode) && isTideOvergrowthMoteIndex(spawnSlot) && !runtime.levelDefeatTriggered) {
    const tideHome = resolveTideMoteHome(runtime, spawnSlot, t, tideMoteTargetVector)
    mote.pileIndex = resolveTidePileIndex(runtime, spawnSlot)
    mote.home.copy(tideHome)
    mote.position.copy(tideHome)
    mote.anchor.copy(tideHome)
    mote.mass = 0.08 + seededNoise(mote.seed + 67.4) * 0.08
    mote.visibleMass = 0
  }
  mote.jelly = 0
  mote.floorStick = 1
  mote.merge = 0
  mote.mergeTarget = 0
  mote.strain = 0
  mote.stretchMemory = 0
  mote.contraction = 0
  mote.compression = 0
  mote.mergeHeat = 0
  mote.surfaceTension = 0
  mote.poolPressure = 0
  mote.suctionLoad = 0
  mote.suctionYield = 0
  mote.suctionStrain = 0
  mote.tendril = 0
  mote.intakeNear = 0
  mote.intakeAdhesion = 0
  mote.intakeDimple = 0
  mote.intakeFunnel = 0
  mote.intakeNeck = 0
  mote.intakeFlow = 0
  mote.intakeFeed = 0
  mote.intakeRecoil = 0
  mote.glugPulse = 0
  mote.glugPhase = 0
  mote.glugCooldown = 0
  mote.glugLastAt = -999
  mote.glugCountThisAttachment = 0
  mote.glugEventStrength = 0
  mote.glugEventMass = 0
  mote.glugFailedStrength = 0
  mote.completionNearEmpty = 0
  mote.completionFinalStrand = 0
  mote.completionFinalGlug = 0
  mote.completionCleanup = 0
  mote.completionChainReady = 0
  mote.completionMetricsRecorded = 0
	  mote.contactReadiness = 0
	  mote.contactLipSeal = 0
	  mote.contactCompression = 0
	  mote.contactSealRing = 0
	  mote.contactDent = 0
  mote.contactTongue = 0
  mote.contactRope = 0
	  mote.contactFeed = 0
	  mote.contactSnap = 0
	  mote.contactResistance = 0
	  mote.mouthContactConnected = 0
	  mote.flowBridge = 0
	  mote.flowBridgeLength = 0
	  mote.flowBridgeThickness = PRODUCTION_TUNING.suction.flowBridgeMinThickness
	  mote.flowBridgePulse = 0
	  mote.flowBridgeSurge = 0
	  mote.flowBridgeStrain = 0
	  mote.flowBridgeBreak = 0
	  mote.sealQuality = 0
	  mote.sealLeak = 0
	  mote.attachmentMassTransferred = 0
	  mote.deepEmbedState = 'searching'
	  mote.deepEmbedDepth = 0
	  mote.deepEmbedAge = 0
	  mote.deepEmbedLockStrength = 0
	  mote.deepEmbedSnapThreshold = PRODUCTION_TUNING.embed.embedSnapThreshold
	  mote.deepEmbedAnglePenalty = 0
	  mote.deepEmbedTensionPenalty = 0
	  mote.deepEmbedReleaseReason = 'none'
	  mote.deepEmbedGlugCount = 0
	  mote.deepEmbedMassTransferred = 0
	  mote.deepEmbedPocketPulse = 0
	  mote.deepEmbedDimple = 0
	  mote.deepEmbedRimOcclusion = 0
	  mote.deepEmbedHoseWobble = 0
	  mote.deepEmbedPopPulse = 0
	  mote.deepEmbedFleckBurst = 0
	  mote.snapBondGrip = 0
  mote.snapBondTension = 0
  mote.snapBondStrain = 0
  mote.snapBondUnstable = 0
  mote.snapBondBreak = 0
  mote.snapBondSnap = 0
  mote.snapBondRecoil = 0
  mote.snapBondCooldown = 0
  mote.mouthMagnetism = 0
  mote.rimGrip = 0
  mote.organicHold = 0
  mote.slurpPressure = 0
  mote.easySuctionAssist = 0
  mote.easySuctionPull = 0
  mote.easySuctionFeed = 0
  mote.growthWake = 0
  mote.growthEnergy = 0
  mote.growthCooldown = 0
  mote.growthTarget = mote.visibleMass
  mote.generationPulse = 0
  mote.materialWake = returnEnergy * SLIME_MATERIAL_POLISH.returnBloomToSpawn
  mote.waxDepth = 0
  mote.seamAssimilation = 0
  mote.elasticMemory = returnEnergy * 0.18
  mote.strandTension = 0
  mote.reemergeCharge = returnEnergy
  mote.livingPulse = 0
  mote.livingCreep = 0
  mote.livingCongeal = 0
  mote.livingBreak = 0
  mote.livingFlow = 0
  mote.edgeWobble = 0
  mote.tearEnergy = 0
  mote.tearCooldown = 0
  mote.absorb = 0
  mote.absorbTarget = 0
  mote.stuckResidueAge = 0
  mote.levelCleared = 0
  mote.palette = seededNoise(mote.seed + 51.8 + t * 0.035)
  mote.spawnHue = lerpWrappedHue(0.47 + seededNoise(mote.seed + 53.9 + t * 0.05) * 0.09, getHarmonicPaletteHue(mote.palette * 0.2 + 0.03), 0.18)
  mote.pigmentHue = seededNoise(mote.seed + 57.2 + t * 0.09)
  mote.colorBloom = returnEnergy * 0.42
  mote.popAge = mote.visibleMass <= 0.001
    ? -999
    : -seededNoise(mote.seed + 18.4 + t * 0.11) * (0.68 + returnEnergy * 0.4)
  mote.popDuration = 0.32 + seededNoise(mote.seed + 21.9) * 0.24 + returnEnergy * 0.12
  mote.coagulate = 0
  mote.settled = 0
  mote.mound = 0
  mote.latched = 0
  mote.latchAge = 0
  mote.slurp = 0
  mote.sealPoint.copy(mote.position)
}

function makeMotes(runtime: VacuumRuntime) {
  if (isMovementLabMode(runtime.devMode)) return []

  return Array.from({ length: MOTE_COUNT }, (_, index) => {
    const seed = index * 3.173 + 1.11
    const mote: Mote = {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      home: new THREE.Vector3(),
      anchor: new THREE.Vector3(),
      seed,
      size: 0.052 + seededNoise(seed + 2.4) * 0.055,
      swirl: 0.16 + seededNoise(seed + 4.6) * 0.36,
      palette: seededNoise(seed + 6.8),
      spawnHue: lerpWrappedHue(0.47 + seededNoise(seed + 6.8) * 0.09, getHarmonicPaletteHue(seededNoise(seed + 6.8) * 0.2 + 0.03), 0.18),
      pigmentHue: seededNoise(seed + 8.4),
      colorBloom: 0,
      warmth: seededNoise(seed + 9.1),
      jelly: 0,
      floorStick: 1,
      mass: 1,
      visibleMass: 1,
      merge: 0,
      mergeTarget: 0,
      strain: 0,
      stretchMemory: 0,
      contraction: 0,
      compression: 0,
      mergeHeat: 0,
      surfaceTension: 0,
      poolPressure: 0,
      suctionLoad: 0,
      suctionYield: 0,
      suctionStrain: 0,
      tendril: 0,
      intakeNear: 0,
      intakeAdhesion: 0,
      intakeDimple: 0,
      intakeFunnel: 0,
      intakeNeck: 0,
      intakeFlow: 0,
      intakeFeed: 0,
      intakeRecoil: 0,
      glugPulse: 0,
      glugPhase: 0,
      glugCooldown: 0,
      glugLastAt: -999,
      glugCountThisAttachment: 0,
      glugEventStrength: 0,
      glugEventMass: 0,
      glugFailedStrength: 0,
      completionNearEmpty: 0,
      completionFinalStrand: 0,
      completionFinalGlug: 0,
      completionCleanup: 0,
      completionChainReady: 0,
      completionMetricsRecorded: 0,
	      contactReadiness: 0,
	      contactLipSeal: 0,
	      contactCompression: 0,
	      contactSealRing: 0,
	      contactDent: 0,
      contactTongue: 0,
      contactRope: 0,
	      contactFeed: 0,
	      contactSnap: 0,
	      contactResistance: 0,
	      mouthContactConnected: 0,
	      flowBridge: 0,
	      flowBridgeLength: 0,
	      flowBridgeThickness: PRODUCTION_TUNING.suction.flowBridgeMinThickness,
	      flowBridgePulse: 0,
	      flowBridgeSurge: 0,
	      flowBridgeStrain: 0,
	      flowBridgeBreak: 0,
	      sealQuality: 0,
	      sealLeak: 0,
	      attachmentMassTransferred: 0,
	      deepEmbedState: 'searching',
	      deepEmbedDepth: 0,
	      deepEmbedAge: 0,
	      deepEmbedLockStrength: 0,
	      deepEmbedSnapThreshold: PRODUCTION_TUNING.embed.embedSnapThreshold,
	      deepEmbedAnglePenalty: 0,
	      deepEmbedTensionPenalty: 0,
	      deepEmbedReleaseReason: 'none',
	      deepEmbedGlugCount: 0,
	      deepEmbedMassTransferred: 0,
	      deepEmbedPocketPulse: 0,
	      deepEmbedDimple: 0,
	      deepEmbedRimOcclusion: 0,
	      deepEmbedHoseWobble: 0,
	      deepEmbedPopPulse: 0,
	      deepEmbedFleckBurst: 0,
	      snapBondGrip: 0,
      snapBondTension: 0,
      snapBondStrain: 0,
      snapBondUnstable: 0,
      snapBondBreak: 0,
      snapBondSnap: 0,
      snapBondRecoil: 0,
      snapBondCooldown: 0,
      mouthMagnetism: 0,
      rimGrip: 0,
      organicHold: 0,
      slurpPressure: 0,
      easySuctionAssist: 0,
      easySuctionPull: 0,
      easySuctionFeed: 0,
      growthWake: 0,
      growthEnergy: 0,
      growthCooldown: 0,
      growthTarget: 1,
      generationPulse: 0,
      materialWake: 0,
      waxDepth: 0,
      seamAssimilation: 0,
      elasticMemory: 0,
      strandTension: 0,
      reemergeCharge: 0,
      livingPulse: 0,
      livingCreep: 0,
      livingCongeal: 0,
      livingBreak: 0,
      livingFlow: 0,
      edgeWobble: 0,
      tearEnergy: 0,
      tearCooldown: 0,
      absorb: 0,
      absorbTarget: 0,
      stuckResidueAge: 0,
      levelCleared: 0,
      pileIndex: 0,
      popAge: 0,
      popDuration: 0.48,
      coagulate: 0,
      settled: 0,
      mound: 0,
      latched: 0,
      latchAge: 0,
      slurp: 0,
      sealPoint: new THREE.Vector3(),
    }
    spawnMote(mote, runtime, index * 0.37, index)
    return mote
  })
}

function makeSlimePiles(devMode: ProductionDevModeId): SlimePile[] {
  const centers = getModePileCenters(devMode)
  return centers.map((center, index) => {
    const baseCenter = new THREE.Vector3(center.x, SLIME_MOTE_FLOOR_Y, center.z)
    return {
      baseCenter,
      center: baseCenter.clone(),
      targetCenter: baseCenter.clone(),
      targetMass: 0,
      mass: 0,
      pulse: 0,
      targetChroma: 0,
      chroma: 0,
      absorbedMass: 0,
      livingPulse: 0,
      livingCreep: 0,
      livingCongeal: 0,
      livingBreak: 0,
      referenceDrift: 0,
      referenceMerge: 0,
      referenceSplit: 0,
      referenceRelocation: 0,
      mergeGroup: getSlimeReferenceMergeGroup(devMode, index, centers.length),
      hue: SLIME_REFERENCE_HUES[index % SLIME_REFERENCE_HUES.length],
      seed: index * 5.37 + 2.8,
    }
  })
}

function ensureDeepEmbedRuntimeDefaults(state: VacuumRuntime) {
  state.baseVelocity ??= new THREE.Vector3()
  state.playerMovementForce ??= new THREE.Vector3()
  state.suctionForce ??= new THREE.Vector3()
  state.snapImpulse ??= new THREE.Vector3()
  state.externalForces ??= new THREE.Vector3()
  state.previousVelocity ??= new THREE.Vector3()
  state.cursorWorldPosition ??= new THREE.Vector3(state.target.x, state.target.y, state.target.z)
  state.hoseTarget ??= new THREE.Vector3(state.target.x, state.target.y, state.target.z)
  state.hoseAimPoint ??= state.hoseTarget.clone()
  state.hoseAimLag ??= 0
  state.hoseAimJitter ??= 0
  state.hoseAimResponsiveness ??= PRODUCTION_TUNING.movement.hoseAimIdleResponsiveness
  state.hoseAimStability ??= 1
  state.hoseAimReach ??= state.hoseAimPoint.distanceTo(state.position)
  state.hoseReachCenter ??= new THREE.Vector3()
  state.desiredHoseMouthPosition ??= state.hoseTarget.clone()
  state.actualHoseMouthPosition ??= state.hoseAimPoint.clone()
  state.hoseMouthVelocity ??= new THREE.Vector3()
  state.hoseReachLocal ??= new THREE.Vector3()
  state.hoseReachClamped ??= false
  state.hoseReachExtension ??= 0
  state.hoseReachForwardAmount ??= state.hoseAimReach
  state.hoseReachSideAmount ??= 0
  state.hoseReachTargetClampedDistance ??= 0
  state.hoseReachLockedToAnchor ??= false
  state.hoseBodyForwardClearance ??= state.hoseReachForwardAmount
  state.hoseBodySideClearance ??= state.hoseReachSideAmount
  state.hoseBodyPlanarClearance ??= state.hoseAimReach
  state.hoseBodyIntersectionRisk ??= 0
  state.mouthForward ??= state.forward.clone()
  state.reattachChainVariant ??= getInitialReattachChainVariant()
  state.stretchSnapPreset ??= getInitialStretchSnapPreset()
  state.stretchSnapPreset = normalizeStretchSnapPreset(state.stretchSnapPreset as string) ?? getInitialStretchSnapPreset()
  state.sealTargetPileIndex ??= -1
  state.suctionState ??= 'free'
  state.stretchSnapState ??= 'free'
  state.stretchSnapPreviousState ??= state.stretchSnapState
  state.stretchSnapStateAge ??= 0
  state.stretchSnapTensionJuice ??= 0
  state.stretchSnapCameraImpulse ??= 0
  state.stretchSnapAudioCue ??= 'none'
  state.stretchSnapAudioIntensity ??= 0
  state.stretchSnapLastAudioAt ??= -999
  state.anchorWorldPosition ??= new THREE.Vector3()
  state.anchorInitialWorldPosition ??= state.anchorWorldPosition.clone()
  state.anchorReleasePoint ??= new THREE.Vector3()
  state.anchorReleaseDirection ??= new THREE.Vector3()
  state.anchorSnapImpulseVector ??= new THREE.Vector3()
  state.anchorSnapDirectionDot ??= 0
  state.anchorReleasePreviewStrength ??= 0
  state.anchorFinalSqueeze ??= 0
  state.anchorRestLength ??= PRODUCTION_TUNING.hose.hoseRestLength
  state.anchorCurrentDistance ??= 0
  state.anchorAttachStartedAt ??= -999
  state.anchorAttachAge ??= 0
  state.anchorDrift ??= 0
  state.anchorMaxDrift ??= 0
  state.anchorLockDrift ??= 0
  state.anchorMaxLockDrift ??= 0
  state.anchorDriftViolationCount ??= 0
  state.anchorDriftViolationPulse ??= 0
  state.anchorLastDriftViolationAt ??= -999
  state.anchorSealSnapPulse ??= 0
  state.anchorSealCompressionTimer ??= 0
  state.anchorReleaseReason ??= 'none'
  state.anchorQueuedReleaseReason ??= 'none'
  state.anchorReleaseTargetMoteId ??= -1
  state.anchorReleaseTargetPileIndex ??= -1
  state.anchorStretch ??= 0
  state.anchorTension ??= 0
  state.anchorPreviousTension ??= state.anchorTension
  state.anchorTensionVelocity ??= 0
  state.anchorElasticBounce ??= 0
  state.anchorReboundImpulse ??= 0
  state.anchorPlayerControlMultiplier ??= 1
  state.anchorDriftRetentionMultiplier ??= PRODUCTION_TUNING.movement.driftRetention
  state.anchorDirectionToAnchor ??= new THREE.Vector3(0, 0, 1)
  state.anchorSpringForceVector ??= new THREE.Vector3()
  state.anchorDampingForceVector ??= new THREE.Vector3()
  state.anchorElasticForceVector ??= new THREE.Vector3()
  state.anchorSpringForce ??= 0
  state.anchorDampingForce ??= 0
  state.anchorLateralDamping ??= 0
  state.anchorRadialVelocity ??= 0
  state.anchorTangentVelocity ??= 0
  state.anchorLatchInfluence ??= 0
  state.anchorLatchPivotActive ??= false
  state.anchorLatchTurnForce ??= 0
  state.anchorLatchTangentPreserve ??= 0
  state.anchorLatchRadialDamping ??= 0
  state.anchorLatchAngularVelocity ??= 0
  state.anchorLatchDirection ??= new THREE.Vector3()
  state.anchorLatchOffAxis ??= 0
  state.anchorLatchRedirectStrength ??= 0
  state.anchorLatchPivotKick ??= 0
  state.anchorOverstretchTimer ??= 0
  state.anchorReleaseTension ??= 0
  state.anchorSnapImpulseMagnitude ??= 0
  state.anchorPostReleaseVelocity ??= 0
  state.anchorPostReleaseControlTimer ??= 0
  state.anchorPostReleaseControlCurve ??= 0
  state.anchorPopJuice ??= 0
  state.anchorPopRing ??= 0
  state.anchorReattachGraceTimer ??= 0
  state.anchorReattachCooldownTimer ??= 0
  state.anchorReattachCandidateMoteId ??= -1
  state.anchorReattachCandidateScore ??= 0
  state.anchorReattachCandidateAge ??= 0
  state.anchorReattachCandidatePoint ??= new THREE.Vector3()
  state.anchorReattachAssistDirection ??= new THREE.Vector3(0, 0, 1)
  state.anchorReattachRejectedCandidateMoteId ??= -1
  state.anchorReattachRejectedCandidateScore ??= 0
  state.anchorReattachRejectedCandidateReason ??= 'none'
  state.anchorReattachAssistStrength ??= 0
  state.anchorReattachCatchPulse ??= 0
  state.anchorReattachCatchCount ??= 0
  state.anchorReattachLastCatchAt ??= -999
  state.anchorReattachLastCatchTargetId ??= -1
  state.anchorReattachLastCatchPileIndex ??= -1
  state.hoseActive ??= false
  state.hoseBlowInputActive ??= false
  state.hoseBlowStrength ??= 0
  state.hoseBlowPressure ??= 0
  state.hoseBlowPush ??= 0
  state.hoseBlowAffectedMotes ??= 0
  state.hoseBlowMaxDistance ??= 0
  state.hoseBlowReleasePulse ??= 0
  state.bodyInputX ??= 0
  state.bodyInputZ ??= 0
  state.bodyInputActive ??= false
  state.lastBodyInputX ??= 0
  state.lastBodyInputZ ??= 0
  state.lastBodyInputActive ??= false
  state.movementAcceleration ??= 0
  state.movementDriftFactor ??= 0
  state.movementLateralSpeed ??= 0
  state.movementFacingVelocityAngle ??= 0
  state.movementVelocityDirection ??= 0
  state.movementInputChangeBoost ??= 0
  state.movementSkid ??= 0
  state.movementLean ??= 0
  state.movementSquash ??= 0
  state.movementWobble ??= 0
  state.mouseBodyInputX ??= 0
  state.mouseBodyInputZ ??= 0
  state.mouseBodyInputActive ??= false
  state.pivotLocked ??= false
	  state.suctionApproachSettle ??= 0
	  state.suctionApproachPull ??= 0
	  state.suctionApproachLocked ??= false
	  state.hoseContactSettle ??= 0
	  state.mouthSurfaceContactState ??= 'floating'
	  state.mouthSurfaceDistance ??= 999
	  state.mouthSurfaceCompression ??= 0
	  state.mouthSealRing ??= 0
	  state.mouthFloatingWarning ??= 0
	  state.hoseSlimeInteractionPhase ??= 'idle'
	  state.hoseSlimeNear ??= 0
	  state.hoseSlimeTouch ??= 0
	  state.hoseSlimeSeal ??= 0
	  state.hoseSlimeStretch ??= 0
	  state.hoseSlimeGulp ??= 0
	  state.hoseSlimeStrain ??= 0
	  state.hoseSlimePop ??= 0
	  state.pivotPoint ??= new THREE.Vector3()
  state.pivotLockDuration ??= 0
  state.pivotAngularVelocity ??= 0
  state.pivotTangentialSpeed ??= 0
  state.pivotRadialDistance ??= 0
  state.pivotHoseStretchRatio ??= 0
  state.pivotTension ??= 0
  state.pivotSnapThreshold ??= PRODUCTION_TUNING.pivot.snapTensionThreshold
  state.pivotSwingAssist ??= 0
  state.pivotHoseVisualStretch ??= 0
  state.pivotHoseThinning ??= 0
  state.pivotHoseWobble ??= 0
  state.pivotSnapReadiness ??= 0
  state.pivotReattachCooldown ??= 0
  state.pivotCandidateTargetId ??= -1
  state.pivotReleaseReason ??= 'none'
  state.gripInputDown ??= false
  state.gripRequestQueued ??= false
  state.gripReleaseQueued ??= false
  state.gripActive ??= false
  state.gripState ??= 'idle'
  state.gripTargetPileIndex ??= -1
  state.gripTargetMoteId ??= -1
  state.gripContactIndex ??= -1
  state.gripContactPoint ??= new THREE.Vector3()
  state.gripLockPoint ??= new THREE.Vector3()
  state.gripHoldTime ??= 0
  state.gripSpinAngle ??= 0
  state.gripSpinSpeed ??= 0
  state.gripReleaseWindowWidth ??= PRODUCTION_TUNING.grip.gripReleaseWindowBase
  state.gripReleaseQuality ??= 0
  state.gripReleaseReady ??= 0
  state.gripReleaseCue ??= 0
  state.gripReleaseReadiness ??= 0
  state.gripReleasePhaseQuality ??= 0
  state.gripReleaseGraceTimer ??= 0
  state.gripDizzy ??= 0
  state.gripMissCount ??= 0
  state.gripMissPulse ??= 0
  state.gripWindowWasOpen ??= false
  state.gripLockPulse ??= 0
  state.gripEntryPull ??= 0
  state.gripPhysicalCue ??= 0
  state.gripPocketBiteCue ??= 0
  state.gripHoseStrainCue ??= 0
  state.gripMouthAnticipationCue ??= 0
  state.gripSpinoutPulse ??= 0
  state.gripCoughPulse ??= 0
  state.gripCooldown ??= 0
  state.gripMassMultiplier ??= 1
  state.gripGlugBoost ??= 1
  state.gripLastReleaseQuality ??= 0
  state.gripReleaseReason ??= 'none'
  state.deepEmbedState ??= 'searching'
  state.deepEmbedDepth ??= 0
  state.deepEmbedLockStrength ??= 0
  state.deepEmbedSnapThreshold ??= PRODUCTION_TUNING.embed.embedSnapThreshold
  state.deepEmbedAnglePenalty ??= 0
  state.deepEmbedTensionPenalty ??= 0
  state.deepEmbedReleaseReason ??= 'none'
  state.deepEmbedGlugCount ??= 0
  state.deepEmbedMassTransferred ??= 0
  state.deepEmbedPocketPulse ??= 0
  state.deepEmbedRimOcclusion ??= 0
  state.deepEmbedFleckBurst ??= 0
}

function metric(value: number | null | undefined, digits = 3) {
  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return Number(safeValue.toFixed(digits))
}

function makeSlimeResidues(): SlimeResidue[] {
  return Array.from({ length: SLIME_RESIDUE_COUNT }, (_, index) => ({
    position: new THREE.Vector3(0, -40, 0),
    color: new THREE.Color('#48d2d7'),
    age: 99,
    life: 1,
    size: 0.01,
    yaw: 0,
    seed: index * 2.47 + 5.3,
    strength: 0,
  }))
}

function VacuumCamera({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const { camera, size } = useThree()
  const basePosition = useMemo(() => new THREE.Vector3(0, ARENA_RADIUS * 1.34, ARENA_RADIUS * 1.9), [])
  const baseTarget = useMemo(() => new THREE.Vector3(0, 0.2, -0.12), [])
  const cameraOffset = useMemo(() => new THREE.Vector3(), [])
  const lookOffset = useMemo(() => new THREE.Vector3(), [])
  const leadOffset = useMemo(() => new THREE.Vector3(), [])
  const cameraTargetPosition = useMemo(() => new THREE.Vector3(), [])
  const cameraTargetLook = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const narrow = size.width / Math.max(1, size.height) < 0.72
    basePosition.set(
      0,
      ARENA_RADIUS * (narrow ? 1.74 : 1.34),
      ARENA_RADIUS * (narrow ? 2.52 : 1.9),
    )
    baseTarget.set(0, narrow ? 0.18 : 0.2, narrow ? -0.18 : -0.12)
    camera.position.copy(basePosition)
    camera.lookAt(baseTarget)
    camera.updateProjectionMatrix()
  }, [basePosition, baseTarget, camera, size.height, size.width])

  useFrame(({ clock }, dt) => {
    const state = runtime.current
    const cappedDt = Math.min(dt, 0.04)
    leadOffset.copy(state.velocity)
    leadOffset.y = 0
    leadOffset.multiplyScalar(PRODUCTION_TUNING.movement.cameraSpeedLead)
    leadOffset.clampLength(0, PRODUCTION_TUNING.movement.cameraMaxLead)
    cameraTargetPosition.copy(basePosition).add(leadOffset)
    cameraTargetLook.copy(baseTarget).addScaledVector(leadOffset, 0.38)
    const impulse = clampValue(state.stretchSnapCameraImpulse, 0, 0.24)
    if (impulse <= 0.001) {
      camera.position.lerp(
        cameraTargetPosition,
        1 - Math.exp(-PRODUCTION_TUNING.movement.cameraLeadSmoothing * cappedDt),
      )
      camera.lookAt(cameraTargetLook)
      return
    }
    const t = clock.elapsedTime
    cameraOffset.set(
      Math.sin(t * 42.0) * impulse * 0.22,
      Math.sin(t * 31.0 + 0.8) * impulse * 0.06,
      Math.cos(t * 37.0) * impulse * 0.18,
    )
    lookOffset.set(
      Math.sin(t * 28.0 + 1.1) * impulse * 0.035,
      0,
      Math.cos(t * 24.0) * impulse * 0.035,
    )
    camera.position.copy(cameraTargetPosition).add(cameraOffset)
    camera.lookAt(lookOffset.add(cameraTargetLook))
  })

  return null
}

function VacuumPointer({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const { camera, gl } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const floor = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const hit = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const element = gl.domElement

    function update(event: PointerEvent, active: boolean) {
      const state = runtime.current
      const rect = element.getBoundingClientRect()
      ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
      raycaster.setFromCamera(ndc, camera)
      raycaster.ray.intersectPlane(floor, hit)
      hit.y = 0.62
      clampWorld(hit)
      state.cursorWorldPosition.copy(hit)
      state.hoseActive = true
      // Mouse/pointer input is hose-only. Body translation and body yaw are
      // driven exclusively by Arrow/WASD input in VacuumKeyboardBodyControls.
      if (!active) state.hoseActive = false
    }

    function onMove(event: PointerEvent) {
      update(event, true)
    }

    function onDown(event: PointerEvent) {
      if (event.button === 2) {
        event.preventDefault()
        runtime.current.gripInputDown = false
        runtime.current.gripRequestQueued = false
        runtime.current.gripReleaseQueued = false
        element.setPointerCapture?.(event.pointerId)
        update(event, true)
        return
      }
      if (event.button !== 0) return
      runtime.current.hoseBlowInputActive = true
      runtime.current.pointerDown = false
      runtime.current.active = true
      element.setPointerCapture?.(event.pointerId)
      update(event, true)
    }

    function onUp(event: PointerEvent) {
      if (event.button === 2) {
        event.preventDefault()
        runtime.current.gripInputDown = false
        runtime.current.gripReleaseQueued = false
        update(event, true)
        element.releasePointerCapture?.(event.pointerId)
        return
      }
      if (event.button !== 0) return
      runtime.current.hoseBlowReleasePulse = Math.max(
        runtime.current.hoseBlowReleasePulse,
        runtime.current.hoseBlowStrength * 0.7,
      )
      runtime.current.hoseBlowInputActive = false
      runtime.current.pointerDown = false
      update(event, true)
      element.releasePointerCapture?.(event.pointerId)
    }

    function onLeave() {
      runtime.current.active = false
      runtime.current.hoseActive = false
      runtime.current.pointerDown = false
      runtime.current.hoseBlowInputActive = false
      runtime.current.gripInputDown = false
    }

    function preventContext(event: Event) {
      event.preventDefault()
    }

    element.addEventListener('pointerdown', onDown)
    element.addEventListener('pointerleave', onLeave)
    element.addEventListener('contextmenu', preventContext)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)

    return () => {
      element.removeEventListener('pointerdown', onDown)
      element.removeEventListener('pointerleave', onLeave)
      element.removeEventListener('contextmenu', preventContext)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [camera, floor, gl.domElement, hit, ndc, raycaster, runtime])

  return null
}

function VacuumKeyboardBodyControls({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  useEffect(() => {
    const pressed = new Set<string>()
    const controlCodes = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'])
    const blowCodes = new Set(['Space'])

    function sync() {
      const left = pressed.has('ArrowLeft') || pressed.has('KeyA')
      const right = pressed.has('ArrowRight') || pressed.has('KeyD')
      const up = pressed.has('ArrowUp') || pressed.has('KeyW')
      const down = pressed.has('ArrowDown') || pressed.has('KeyS')
      let x = (right ? 1 : 0) - (left ? 1 : 0)
      let z = (down ? 1 : 0) - (up ? 1 : 0)
      const length = Math.hypot(x, z)
      if (length > 0.001) {
        x /= length
        z /= length
      } else {
        x = 0
        z = 0
      }
      const state = runtime.current
      state.bodyInputX = x
      state.bodyInputZ = z
      state.bodyInputActive = length > 0.001
      if (state.bodyInputActive) state.active = true
    }

    function shouldIgnore(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      return Boolean(target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    }

    function onKeyDown(event: KeyboardEvent) {
      if (shouldIgnore(event)) return
      if (blowCodes.has(event.code)) {
        event.preventDefault()
        runtime.current.hoseBlowInputActive = true
        runtime.current.pointerDown = false
        runtime.current.active = true
        return
      }
      if (!controlCodes.has(event.code)) return
      event.preventDefault()
      pressed.add(event.code)
      sync()
    }

    function onKeyUp(event: KeyboardEvent) {
      if (blowCodes.has(event.code)) {
        event.preventDefault()
        runtime.current.hoseBlowReleasePulse = Math.max(
          runtime.current.hoseBlowReleasePulse,
          runtime.current.hoseBlowStrength * 0.7,
        )
        runtime.current.hoseBlowInputActive = false
        return
      }
      if (!controlCodes.has(event.code)) return
      event.preventDefault()
      pressed.delete(event.code)
      sync()
    }

    function onBlur() {
      pressed.clear()
      runtime.current.hoseBlowInputActive = false
      sync()
    }

    const debugWindow = window as Window & {
      __EXPERIMENT_LAB_STICKY_RELEASE_DEV__?: (reason?: StickySuctionReleaseReason) => void
    }
    debugWindow.__EXPERIMENT_LAB_STICKY_RELEASE_DEV__ = (reason = 'debug') => {
      requestStickyAnchorRelease(runtime.current, reason)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      delete debugWindow.__EXPERIMENT_LAB_STICKY_RELEASE_DEV__
    }
  }, [runtime])

  return null
}

function VacuumMotion({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  useFrame(({ clock }, dt) => {
    const state = runtime.current
    ensureDeepEmbedRuntimeDefaults(state)
    const cappedDt = Math.min(dt, 0.04)
    const t = clock.elapsedTime
    if (isMovementLabMode(state.devMode) && state.levelResetRequested > 0) {
      resetRuntimeForReplay(state, t)
      ensureDeepEmbedRuntimeDefaults(state)
    }
    frameStartVelocityVector.copy(state.velocity)
    frameStartPositionVector.copy(state.position)
    state.playerMovementForce.set(0, 0, 0)
    state.suctionForce.set(0, 0, 0)
    state.externalForces.set(0, 0, 0)
    state.snapImpulse.multiplyScalar(Math.exp(-10 * cappedDt))
    const stretchSnapLab = isStretchSnapLabMode(state.devMode)
    const stretchSnapPreset = getStretchSnapPresetTuning(state)

    updateLevelCompletionAnimation(state, cappedDt)
    updateLevelDefeatAnimation(state, cappedDt)
    const levelControlLocked = state.levelCompletionTriggered || state.levelDefeatTriggered || state.levelState === 'shopping'
    const hasBodyInput = !levelControlLocked && state.bodyInputActive && Math.hypot(state.bodyInputX, state.bodyInputZ) > 0.001
    const blowInputActive = !levelControlLocked && PRODUCTION_TUNING.blow.enabled && state.hoseBlowInputActive
    const blowTarget = blowInputActive ? 1 : 0
    state.hoseBlowStrength = damp(
      state.hoseBlowStrength,
      blowTarget,
      blowTarget > state.hoseBlowStrength ? PRODUCTION_TUNING.blow.riseDamping : PRODUCTION_TUNING.blow.fallDamping,
      cappedDt,
    )
    const hoseBlowActive = state.hoseBlowStrength > 0.035
    state.hoseBlowPressure = damp(
      state.hoseBlowPressure,
      hoseBlowActive ? state.hoseBlowStrength : 0,
      hoseBlowActive ? PRODUCTION_TUNING.blow.pressureRiseDamping : PRODUCTION_TUNING.blow.pressureFallDamping,
      cappedDt,
    )
    if (hoseBlowActive) {
      state.active = true
      state.pointerDown = false
      state.anchorReattachGraceTimer = 0
      state.controllerReattachGrace = 0
      state.postSnapReattachTimer = 0
      state.suctionApproachPull = 0
      state.suctionApproachSettle = 0
      state.suctionApproachLocked = false
      state.slimeSealDemand = 0
      if (state.suctionState === 'sealed') {
        requestStickyAnchorRelease(state, 'manual')
      } else {
        state.slimeSealStrength = damp(state.slimeSealStrength, 0, 18, cappedDt)
        state.hoseHookStrength = damp(state.hoseHookStrength, 0, 18, cappedDt)
        if (state.hoseHookStrength < 0.12) {
          state.sealTargetMoteId = -1
          state.sealTargetPileIndex = -1
          state.sealTargetScore = 0
        }
      }
      state.tetherRelease = Math.max(state.tetherRelease, state.hoseBlowStrength * PRODUCTION_TUNING.blow.hoseRecoil)
      state.animationMouthTug = Math.max(state.animationMouthTug, state.hoseBlowStrength * 0.32)
      state.animationRecoil = Math.max(state.animationRecoil, state.hoseBlowStrength * 0.18)
      state.recoil = Math.max(state.recoil, state.hoseBlowStrength * 0.08)
    }
    const hoseIntentActive = state.hoseActive || state.pointerDown || hoseBlowActive
    updateHoseCursorReach(state, cappedDt, hoseIntentActive)
    const hoseAimContactCalm = clampValue(
      Math.max(
        state.hoseContactSettle * 0.9,
        state.controllerMouthSettle * 0.76,
        state.suctionApproachPull * 0.72,
        state.deepEmbedLockStrength * 0.48,
        state.mouthSealRing * 0.42,
        state.slimeOrganicHold * 0.36,
      ),
      0,
      1,
    )
    state.hoseAimResponsiveness *= 1 - hoseAimContactCalm * 0.28
    candidateBodyVector.copy(state.hoseAimPoint).sub(state.position)
    candidateBodyVector.y = 0
    state.mouseBodyInputX = 0
    state.mouseBodyInputZ = 0
    state.mouseBodyInputActive = false
    if (hasBodyInput) {
      candidateBodyVector.set(state.bodyInputX, 0, state.bodyInputZ)
      state.target.copy(state.position).addScaledVector(candidateBodyVector, PRODUCTION_TUNING.movement.keyboardTargetLead)
      state.target.y = 0.62
      clampWorld(state.target)
    } else {
      candidateBodyVector.copy(state.position)
      candidateBodyVector.y = 0.62
      clampWorld(candidateBodyVector)
      state.target.lerp(candidateBodyVector, Math.min(1, cappedDt * 8))
    }
    state.postSnapReattachTimer = Math.max(0, state.postSnapReattachTimer - cappedDt)
    state.anchorPostReleaseControlTimer = Math.max(0, state.anchorPostReleaseControlTimer - cappedDt)
    state.anchorReattachGraceTimer = Math.max(0, state.anchorReattachGraceTimer - cappedDt)
    state.anchorReattachCooldownTimer = Math.max(0, state.anchorReattachCooldownTimer - cappedDt)
    state.anchorReattachCatchPulse = damp(state.anchorReattachCatchPulse, 0, 5.2, cappedDt)
    state.anchorReattachAssistStrength = state.anchorReattachGraceTimer > 0
      ? damp(state.anchorReattachAssistStrength, 0.18, 1.8, cappedDt)
      : damp(state.anchorReattachAssistStrength, 0, 4.2, cappedDt)
    if (state.anchorReattachGraceTimer > 0.015) {
      state.anchorReattachCandidateAge += cappedDt
      state.anchorReattachCandidateScore *= Math.exp(-5.4 * cappedDt)
      state.anchorReattachRejectedCandidateMoteId = -1
      state.anchorReattachRejectedCandidateScore = 0
      state.anchorReattachRejectedCandidateReason = 'none'
      candidateDirectionVector.copy(state.velocity)
      candidateDirectionVector.y = 0
      if (candidateDirectionVector.lengthSq() < 0.01 && state.anchorReleaseDirection.lengthSq() > 0.001) {
        candidateDirectionVector.copy(state.anchorReleaseDirection)
      }
      candidateDirectionVector.y = 0
      if (candidateDirectionVector.lengthSq() > 0.0001) {
        candidateDirectionVector.normalize()
        state.anchorReattachAssistDirection.lerp(candidateDirectionVector, Math.min(1, cappedDt * 12))
        state.anchorReattachAssistDirection.normalize()
      }
    } else {
      state.anchorReattachCandidateMoteId = -1
      state.anchorReattachCandidateScore = 0
      state.anchorReattachCandidateAge = 0
      state.anchorReattachRejectedCandidateMoteId = -1
      state.anchorReattachRejectedCandidateScore = 0
      state.anchorReattachRejectedCandidateReason = 'none'
    }
    state.anchorPopJuice = damp(state.anchorPopJuice, 0, 5.6, cappedDt)
    state.anchorPopRing = damp(state.anchorPopRing, 0, 4.8, cappedDt)
    state.anchorReleasePreviewStrength = damp(state.anchorReleasePreviewStrength, 0, 4.6, cappedDt)
    state.anchorFinalSqueeze = damp(state.anchorFinalSqueeze, 0, 8.2, cappedDt)
    state.anchorSealSnapPulse = damp(state.anchorSealSnapPulse, 0, 6.6, cappedDt)
    state.anchorDriftViolationPulse = damp(state.anchorDriftViolationPulse, 0, 5.4, cappedDt)
    state.anchorSealCompressionTimer = Math.max(0, state.anchorSealCompressionTimer - cappedDt)
    state.pivotReattachCooldown = Math.max(0, state.pivotReattachCooldown - cappedDt)
    state.gripCooldown = Math.max(0, state.gripCooldown - cappedDt)
    state.gripReleaseGraceTimer = Math.max(0, state.gripReleaseGraceTimer - cappedDt)
    state.gripLockPulse = damp(state.gripLockPulse, 0, 4.6, cappedDt)
    state.gripEntryPull = damp(
      state.gripEntryPull,
      state.gripActive ? Math.max(0, 1 - smooth01(state.gripHoldTime / 0.72)) : 0,
      state.gripActive ? 7.4 : 5.2,
      cappedDt,
    )
    state.gripMissPulse = damp(state.gripMissPulse, 0, 5.4, cappedDt)
    state.gripSpinoutPulse = damp(state.gripSpinoutPulse, 0, 3.8, cappedDt)
    state.gripCoughPulse = damp(state.gripCoughPulse, 0, 3.2, cappedDt)
    if (!PRODUCTION_TUNING.grip.rightClickGripEnabled && state.gripActive) {
      state.gripActive = false
      state.gripInputDown = false
      state.gripRequestQueued = false
      state.gripReleaseQueued = false
      state.gripState = 'idle'
      state.gripReleaseReason = 'disabled'
      state.gripMassMultiplier = 1
      state.gripGlugBoost = 1
    }
    if (state.gripActive) {
      state.gripHoldTime += cappedDt
      state.slimeSealPoint.copy(state.gripLockPoint)
      state.slimeSealAnchorPoint.copy(state.gripLockPoint)
      state.slimeHookPoint.lerp(state.gripLockPoint, Math.min(0.72, cappedDt * 18))
      state.slimeSealDemand = Math.max(state.slimeSealDemand, PRODUCTION_TUNING.grip.gripSealStrength)
      state.slimeSealStrength = Math.max(state.slimeSealStrength, 0.68)
      state.hoseHookStrength = Math.max(state.hoseHookStrength, 0.72)
      state.deepEmbedLockStrength = Math.max(state.deepEmbedLockStrength, PRODUCTION_TUNING.grip.gripLockStrength * 0.52)
    }
    state.sealTargetScore *= Math.exp(-1.6 * cappedDt)

    const previousHookStrength = state.hoseHookStrength
    const previousSwingTension = state.swingTension
    if (
      state.suctionState === 'sealed'
      && state.sealTargetMoteId >= 0
      && state.anchorQueuedReleaseReason === 'none'
    ) {
      state.slimeSealDemand = Math.max(
        state.slimeSealDemand,
        PRODUCTION_TUNING.suction.stickyAnchorHoldStrength,
      )
    }
    state.slimeSealStrength = damp(state.slimeSealStrength, state.slimeSealDemand, state.slimeSealDemand > 0.01 ? 12 : 5.5, cappedDt)
    const hookDemand = Math.min(1.25, Math.max(state.slimeSealDemand, state.slimeSealStrength * 0.72))
    if (previousHookStrength > 0.18 && hookDemand < 0.08) {
      state.tetherRelease = Math.max(state.tetherRelease, previousSwingTension * 0.64 + previousHookStrength * 0.18)
    }
    state.hoseHookStrength = damp(state.hoseHookStrength, hookDemand, hookDemand > 0.01 ? 10.5 : 4.8, cappedDt)
    if (hookDemand < 0.035 && state.hoseHookStrength < 0.08) {
      state.sealTargetMoteId = -1
      state.sealTargetPileIndex = -1
      state.sealTargetScore = 0
    }
    updateStickySuctionState(state, t, cappedDt, hookDemand)
    if (state.suctionState === 'sealed' && state.anchorSealCompressionTimer > 0.001) {
      const bite = clampValue(
        state.anchorSealCompressionTimer / Math.max(0.001, PRODUCTION_TUNING.suction.stickyAnchorSealBitePause),
        0,
        1,
      )
      state.velocity.multiplyScalar(Math.exp(-(4.8 + bite * 5.8) * cappedDt))
      state.animationMouthTug = Math.max(state.animationMouthTug, 0.32 + bite * 0.2)
      state.deepEmbedPocketPulse = Math.max(state.deepEmbedPocketPulse, bite * 0.18)
    }
    if (state.slimeSealStrength > 0.015) {
      state.slimeSealAge += cappedDt
      if (state.suctionState === 'sealed') {
        state.slimeSealPoint.copy(state.anchorWorldPosition)
        state.slimeSealAnchorPoint.copy(state.anchorWorldPosition)
        state.slimeHookPoint.copy(state.anchorWorldPosition)
      }
      const activeAnchorRetention = Math.max(
        PRODUCTION_TUNING.hose.anchorRetention,
        state.pivotLocked ? 0.94 : 0,
        state.gripActive ? 0.98 : 0,
        state.deepEmbedLockStrength > 0.24 ? 0.91 : 0,
        state.suctionApproachLocked ? 0.96 : 0,
      )
      candidateBodyVector.copy(state.slimeSealAnchorPoint).lerp(
        state.slimeSealPoint,
        1 - activeAnchorRetention,
      )
      const steadyPocketFollow = state.suctionApproachLocked
        || state.deepEmbedDepth > 0.08
        || state.deepEmbedLockStrength > 0.22
        || state.controllerMouthSettle > 0.34
      const hookFollowRate = steadyPocketFollow
        ? 1.35 + state.hoseHookStrength * 0.82 + state.deepEmbedDepth * 0.32
        : 3.6 + state.hoseHookStrength * 2.4 + state.deepEmbedDepth * 0.8
      const hookFollowCap = steadyPocketFollow ? 0.038 : 0.16
      if (state.suctionState === 'sealed') {
        state.slimeHookPoint.copy(state.anchorWorldPosition)
      } else {
        state.slimeHookPoint.lerp(candidateBodyVector, Math.min(hookFollowCap, cappedDt * hookFollowRate))
      }
	      sealErrorVector.copy(state.slimeHookPoint).sub(state.mouth)
      sealErrorVector.y *= 0.58
      const sealHold = Math.min(1, state.slimeSealStrength)
      const sealedAnchorBody = state.suctionState === 'sealed' && !state.gripActive
      if (!sealedAnchorBody && !hasBodyInput && !hoseIntentActive) {
        state.target.addScaledVector(sealErrorVector, 0.04 * sealHold)
      }
      const sealedHoldScale = sealedAnchorBody ? 0.22 : 1
      const sealHoldCorrection = Math.min(
        (0.095 + state.controllerMouthSettle * 0.045 + state.slimeOrganicHold * 0.03) * sealedHoldScale,
        (CONTROLLER_PHYSICS.sealHold + sealHold * 1.7 + state.controllerMouthSettle * 0.55 + state.slimeOrganicHold * 0.46) * sealHold * sealedHoldScale * cappedDt,
      )
      state.velocity.addScaledVector(sealErrorVector, sealHoldCorrection)
      state.velocity.multiplyScalar(Math.exp(-(0.72 + state.slimeOrganicHold * 0.36) * sealHold * sealedHoldScale * cappedDt))
	      sealDirectionVector.copy(state.slimeHookPoint).sub(state.position)
      sealDirectionVector.y = 0
    } else {
      state.slimeSealAge = 0
      state.slimeHookPoint.lerp(state.mouth, Math.min(0.35, cappedDt * 5.2))
      sealDirectionVector.set(0, 0, 0)
    }
    state.slimeSealDemand = 0

    if (state.hoseHookStrength > 0.01) {
      sealErrorVector.copy(state.slimeHookPoint).sub(state.mouth)
      sealErrorVector.y *= 0.72
      rightVector.set(-state.forward.z, 0, state.forward.x)
      if (rightVector.lengthSq() < 0.0001) rightVector.set(1, 0, 0)
      rightVector.normalize()
      hoseHookTargetVector.set(
        clampValue(sealErrorVector.dot(rightVector), -0.72, 0.72),
        clampValue(sealErrorVector.y, -0.18, 0.42),
        clampValue(-sealErrorVector.dot(state.forward), -0.82, 0.28),
      )
      hoseHookTargetVector.multiplyScalar(Math.min(1, state.hoseHookStrength))
    } else if (hoseIntentActive) {
      sealErrorVector.copy(state.hoseAimPoint).sub(state.mouth)
      sealErrorVector.y *= 0.36
      candidateDirectionVector.copy(state.forward)
      candidateDirectionVector.y = 0
      if (candidateDirectionVector.lengthSq() < 0.0001) {
        candidateDirectionVector.set(0, 0, -1)
      } else {
        candidateDirectionVector.normalize()
      }
      rightVector.set(-candidateDirectionVector.z, 0, candidateDirectionVector.x)
      if (rightVector.lengthSq() < 0.0001) rightVector.set(1, 0, 0)
      rightVector.normalize()
      hoseHookTargetVector.set(
        clampValue(
          sealErrorVector.dot(rightVector) * PRODUCTION_TUNING.movement.hoseMouseBendStrength,
          -PRODUCTION_TUNING.movement.hoseMouseBendMax,
          PRODUCTION_TUNING.movement.hoseMouseBendMax,
        ),
        clampValue(sealErrorVector.y * 0.18, -0.1, 0.18),
        clampValue(
          -sealErrorVector.dot(candidateDirectionVector) * PRODUCTION_TUNING.movement.hoseMouseReachStrength,
          -0.44,
          0.18,
        ),
      )
    } else {
      hoseHookTargetVector.set(0, 0, 0)
    }
    const sealedContact = state.suctionState === 'sealed'
    const hoseContactSettle = clampValue(
      state.hoseHookStrength
        * Math.max(
          sealedContact ? 1 : 0,
          state.suctionState === 'contact' ? 0.68 : 0,
          state.mouthSurfaceContactState === 'embedded' ? 0.86 : 0,
          state.mouthSurfaceContactState === 'touching' ? 0.62 : 0,
          state.suctionApproachPull * 0.92,
          state.controllerMouthSettle * 0.84,
          state.deepEmbedLockStrength * 0.42,
          state.slimeOrganicHold * 0.38,
        )
        * (1 - state.pivotSnapReadiness * 0.35),
      0,
      1,
    )
    state.hoseContactSettle = damp(
      state.hoseContactSettle,
      hoseContactSettle,
      hoseContactSettle > state.hoseContactSettle ? 12.5 : 7.2,
      cappedDt,
    )
    if (hoseContactSettle > 0.01) {
      hoseHookTargetVector.lerp(
        state.hoseHookOffset,
        Math.min(0.22, hoseContactSettle * 0.16),
      )
    }
    deltaVector.copy(hoseHookTargetVector).sub(state.hoseHookOffset)
    const hoseContactSpring = state.hoseHookStrength > 0.01
      ? PRODUCTION_TUNING.movement.hoseContactSpring * (sealedContact ? 1.45 : 1) * (1 - hoseContactSettle * 0.28)
      : 24
    const hoseContactDamping = state.hoseHookStrength > 0.01
      ? PRODUCTION_TUNING.movement.hoseContactDamping * (sealedContact ? 1.18 : 1)
        + PRODUCTION_TUNING.movement.hoseContactSettleDamping * hoseContactSettle
      : 7.2
    const hoseHookDrive = hoseContactSpring + state.hoseHookStrength * 4.8 * (1 - hoseContactSettle * 0.38)
    state.hoseHookVelocity.addScaledVector(deltaVector, hoseHookDrive * cappedDt)
    state.hoseHookVelocity.multiplyScalar(Math.exp(-(hoseContactDamping + Math.min(1, state.hoseHookStrength) * 6.2) * cappedDt))
    const contactVelocityLimit = 1.28
      + (PRODUCTION_TUNING.movement.hoseContactVelocityLimit - 1.28) * hoseContactSettle
    state.hoseHookVelocity.clampLength(0, state.hoseHookStrength > 0.01 ? contactVelocityLimit : 1.05)
    state.hoseHookOffset.addScaledVector(state.hoseHookVelocity, cappedDt)
    const contactOffsetLimit = (sealedContact ? 0.94 : 0.84)
      + (PRODUCTION_TUNING.movement.hoseContactOffsetLimit - (sealedContact ? 0.94 : 0.84)) * hoseContactSettle
    state.hoseHookOffset.clampLength(0, state.hoseHookStrength > 0.01 ? contactOffsetLimit : 0.52)

    const hook = Math.min(1, state.hoseHookStrength)
    const stickyAnchorOnly = state.suctionState === 'sealed' && !state.gripActive
    if (!stickyAnchorOnly && hook <= 0.015) {
      state.anchorLatchInfluence = damp(state.anchorLatchInfluence, 0, 6.0, cappedDt)
      state.anchorLatchPivotActive = false
      state.anchorLatchTurnForce = damp(state.anchorLatchTurnForce, 0, 6.0, cappedDt)
      state.anchorLatchTangentPreserve = damp(state.anchorLatchTangentPreserve, 0, 6.0, cappedDt)
      state.anchorLatchRadialDamping = damp(state.anchorLatchRadialDamping, 0, 6.0, cappedDt)
      state.anchorLatchAngularVelocity = damp(state.anchorLatchAngularVelocity, 0, 6.0, cappedDt)
      state.anchorLatchDirection.lerp(zeroVector, Math.min(1, cappedDt * 6.0))
      state.anchorLatchOffAxis = damp(state.anchorLatchOffAxis, 0, 6.0, cappedDt)
      state.anchorLatchRedirectStrength = damp(state.anchorLatchRedirectStrength, 0, 6.0, cappedDt)
      state.anchorLatchPivotKick = damp(state.anchorLatchPivotKick, 0, 6.0, cappedDt)
    }
    const stretchSnapNoOrbit = PRODUCTION_TUNING.suction.stretchSnapOrbitSuppression > 0.5
      && !state.gripActive && (
      stickyAnchorOnly
      || state.suctionState === 'seeking'
      || state.suctionState === 'prePull'
      || state.suctionState === 'contact'
      || state.anchorReattachGraceTimer > 0.015
      || state.anchorPopJuice > 0.015
      || state.anchorReattachCatchPulse > 0.015
      || stretchSnapLab
    )
    let contactCaptureSteady = 0
    const postReleaseRaw = clampValue(
      state.anchorPostReleaseControlTimer
        / Math.max(0.001, PRODUCTION_TUNING.suction.postReleaseControlDampTime),
      0,
      1,
    )
    const postReleaseShape = Math.pow(
      smooth01(postReleaseRaw),
      PRODUCTION_TUNING.suction.postReleaseSteeringReturnCurve,
    )
    state.anchorPostReleaseControlCurve = postReleaseShape
    const sealedInputScale = stickyAnchorOnly
      ? stretchSnapPreset.playerControlWhileSealed
      : clampValue(1 - postReleaseShape * 0.35, 0.58, 1)
    state.anchorPlayerControlMultiplier = stickyAnchorOnly ? sealedInputScale : damp(state.anchorPlayerControlMultiplier, 1, 6.2, cappedDt)
    state.anchorDriftRetentionMultiplier = stickyAnchorOnly
      ? stretchSnapPreset.driftRetentionWhileSealed
      : damp(state.anchorDriftRetentionMultiplier, PRODUCTION_TUNING.movement.driftRetention, 6.2, cappedDt)
    const bodySteeringActive = hasBodyInput
    const controlTarget = (
      hasBodyInput
        ? 1
        : 0
    ) * (1 - hook * 0.18) * sealedInputScale + (hasBodyInput ? state.suctionReadiness * 0.08 : 0)
    state.bodyControl = damp(state.bodyControl, controlTarget, 5.8, cappedDt)
    deltaVector.copy(state.target).sub(state.position)
    arcadeInputVector.set(state.bodyInputX, 0, state.bodyInputZ)
    const inputLength = arcadeInputVector.length()
    if (inputLength > 0.001) arcadeInputVector.multiplyScalar(1 / inputLength)
    const previousInputActive = state.lastBodyInputActive
    const previousInputDot = previousInputActive && inputLength > 0.001
      ? clampValue(
        arcadeInputVector.x * state.lastBodyInputX + arcadeInputVector.z * state.lastBodyInputZ,
        -1,
        1,
      )
      : 1
    const sharpInputChange = hasBodyInput && previousInputActive
      ? smooth01((-previousInputDot + 0.18) / 1.18)
      : 0
    const hookControlScale = clampValue(1 - hook * 0.36 + state.controllerReattachGrace * 0.12, 0.52, 1)
    const tensionSpeedScale = stickyAnchorOnly
      ? clampValue(1 - state.anchorTension * PRODUCTION_TUNING.suction.tensionSpeedPenalty, 0.62, 1)
      : 1
    const baseControlScale = sealedInputScale * hookControlScale * tensionSpeedScale
    if (hasBodyInput) {
      const acceleration = PRODUCTION_TUNING.movement.acceleration
        * baseControlScale
        * (1 + sharpInputChange * PRODUCTION_TUNING.movement.speedBoostFromInputChange)
      state.playerMovementForce.copy(arcadeInputVector).multiplyScalar(acceleration)
      state.velocity.addScaledVector(arcadeInputVector, acceleration * cappedDt)
      if (sharpInputChange > 0.04) {
        state.velocity.addScaledVector(
          arcadeInputVector,
          sharpInputChange * PRODUCTION_TUNING.movement.reverseRebound,
        )
        state.animationBodyJolt = Math.max(
          state.animationBodyJolt,
          sharpInputChange * PRODUCTION_TUNING.movement.wobbleStrength,
        )
      }
    } else {
      arcadeVelocityVector.copy(state.velocity)
      arcadeVelocityVector.y = 0
      const brake = PRODUCTION_TUNING.movement.deceleration + PRODUCTION_TUNING.movement.keyboardNoInputBrake
      state.playerMovementForce.copy(arcadeVelocityVector).multiplyScalar(-brake)
      state.velocity.multiplyScalar(Math.exp(-brake * cappedDt))
    }
    const controllerDriveScale = clampValue(1 - state.controllerGripQuality * 0.22 - state.controllerReattachGrace * 0.14 + state.controllerMouthSettle * 0.12, 0.5, 1.08)
    const driveGain = PRODUCTION_TUNING.movement.turnResponsiveness
      * (0.72 + state.bodyControl * 0.34)
      * controllerDriveScale
      * baseControlScale
    if (hasBodyInput) {
      arcadeVelocityVector.copy(state.velocity)
      arcadeVelocityVector.y = 0
      const speed = arcadeVelocityVector.length()
      if (speed > 0.001 && arcadeInputVector.lengthSq() > 0.0001) {
        const speedBeforeTurn = speed
        arcadeVelocityVector.multiplyScalar(1 / speed)
        const redirectAlpha = (1 - Math.exp(-driveGain * cappedDt))
          * clampValue(1 - state.anchorDriftRetentionMultiplier * 0.54, 0.14, 0.82)
        arcadeVelocityVector.lerp(arcadeInputVector, redirectAlpha)
        if (arcadeVelocityVector.lengthSq() > 0.0001) {
          arcadeVelocityVector.normalize().multiplyScalar(speedBeforeTurn)
          state.velocity.x = arcadeVelocityVector.x
          state.velocity.z = arcadeVelocityVector.z
        }
      }
    }
    cruiseVector.copy(state.forward)
    if (deltaVector.lengthSq() > 0.04) {
      candidateDirectionVector.copy(deltaVector)
      candidateDirectionVector.y = 0
      if (candidateDirectionVector.lengthSq() > 0.0001) {
        candidateDirectionVector.normalize()
        cruiseVector.lerp(candidateDirectionVector, hasBodyInput ? 0.42 : 0.08)
      }
    }
    const cruiseForce = PRODUCTION_TUNING.movement.cruiseForce
      * (state.devMode === 'glug-rhythm' ? 0.72 : state.devMode === 'hose-swing' || state.devMode === 'multi-glob-chain' ? 1.18 : 1)
      * (0.48 + (1 - hook) * 0.32 + state.controllerReattachGrace * 0.22 + state.tetherRelease * 0.18)
      * (hasBodyInput ? 1 : 0)
    state.velocity.addScaledVector(cruiseVector, cruiseForce * cappedDt)
    if (bodySteeringActive && deltaVector.lengthSq() > 0.0064) {
      const velocityTowardInput = state.velocity.dot(arcadeInputVector)
      arcadeLateralVector.copy(state.velocity).addScaledVector(arcadeInputVector, -velocityTowardInput)
      arcadeLateralVector.y = 0
      const lateralBrake = 1 - Math.exp(
        -PRODUCTION_TUNING.movement.lateralFriction
          * (1 - state.anchorDriftRetentionMultiplier * 0.42)
          * hookControlScale
          * cappedDt,
      )
      state.velocity.addScaledVector(arcadeLateralVector, -lateralBrake)
      if (velocityTowardInput < 0) {
        state.velocity.addScaledVector(
          arcadeInputVector,
          -velocityTowardInput
            * PRODUCTION_TUNING.movement.pointerBrakeStrength
            * hookControlScale
            * cappedDt,
        )
      }
    }
    state.baseVelocity.copy(state.velocity)

    if (hook > 0.015) {
      bodyHookVector.copy(state.slimeHookPoint).sub(state.position)
      bodyHookVector.y *= 0.46
      const hookDistance = Math.max(0.001, bodyHookVector.length())
      bodyHookVector.multiplyScalar(1 / hookDistance)
      pointerHookVector.copy(state.hoseAimPoint).sub(state.slimeHookPoint)
      pointerHookVector.y *= 0.22
      const mouthHookDistance = Math.max(0.001, sealErrorVector.copy(state.slimeHookPoint).sub(state.mouth).length())
      const mouthContactVerifiedForMotion = stickyAnchorOnly
        || state.suctionState === 'sealed'
        || state.suctionState === 'contact'
        || state.mouthSurfaceDistance < PRODUCTION_TUNING.suction.physicalContactGraceDistance
      const physicalContactMotionGate = clampValue(
        Math.max(
          mouthContactVerifiedForMotion && state.mouthSurfaceContactState === 'embedded' ? 1 : 0,
          mouthContactVerifiedForMotion && state.mouthSurfaceContactState === 'touching' ? 0.86 : 0,
          mouthContactVerifiedForMotion ? smooth01((state.mouthSurfaceCompression - 0.08) / 0.34) : 0,
          mouthContactVerifiedForMotion ? smooth01((state.mouthSealRing - 0.1) / 0.38) : 0,
          mouthContactVerifiedForMotion ? smooth01((state.deepEmbedDepth - 0.035) / 0.28) : 0,
          state.suctionContactBridgeActive > 0.08
            ? smooth01(
              (PRODUCTION_TUNING.suction.physicalContactGraceDistance - state.mouthSurfaceDistance)
                / Math.max(0.001, PRODUCTION_TUNING.suction.physicalContactGraceDistance),
            )
            : 0,
        ),
        0,
        1,
      )
      const physicalSealForMotion = stickyAnchorOnly
        || state.suctionState === 'sealed'
        || state.suctionState === 'releasing'
        || (
          state.slimeSealAge > 0.035
          && state.slimeSealStrength > PRODUCTION_TUNING.suction.stickySealReleaseStrength
          && physicalContactMotionGate > PRODUCTION_TUNING.suction.contactPhysicsGateMin
        )
        || physicalContactMotionGate > 0.05
      const approachFreshGate = smooth01(
        (PRODUCTION_TUNING.suction.suctionApproachMaxSettleSeconds - state.slimeSealAge)
          / Math.max(0.001, PRODUCTION_TUNING.suction.suctionApproachMaxSettleSeconds),
      )
      const approachBiteGate = smooth01(
        (PRODUCTION_TUNING.suction.suctionApproachSettleSeconds - state.slimeSealAge)
          / Math.max(0.001, PRODUCTION_TUNING.suction.suctionApproachSettleSeconds),
      )
      const approachMouthGapGate = smooth01(
        (mouthHookDistance - PRODUCTION_TUNING.suction.suctionApproachMouthLockDistance)
          / Math.max(0.001, 1.16 - PRODUCTION_TUNING.suction.suctionApproachMouthLockDistance),
      )
      const approachSettleTarget = clampValue(
        hook
          * approachFreshGate
          * Math.max(approachBiteGate, approachMouthGapGate * (1 - state.controllerMouthSettle * 0.64))
          * (state.gripActive ? 0 : 1)
          * (1 - Math.min(0.72, state.deepEmbedLockStrength * 0.38))
          * (physicalSealForMotion ? 1 : 0),
        0,
        1,
      )
      state.suctionApproachSettle = damp(
        state.suctionApproachSettle,
        approachSettleTarget,
        approachSettleTarget > state.suctionApproachSettle ? 15.5 : 8.6,
        cappedDt,
      )
      state.suctionApproachPull = damp(
        state.suctionApproachPull,
        state.suctionApproachSettle * Math.max(state.slimeSealStrength, hook * 0.62),
        state.suctionApproachSettle > 0.02 ? 16.5 : 7.2,
        cappedDt,
      )
      const approachSuppression = clampValue(
        state.suctionApproachSettle * PRODUCTION_TUNING.suction.suctionApproachTangentSuppression,
        0,
        0.95,
      )
      const tether = computeElasticTether({
        distance: hookDistance,
        currentRestLength: state.tetherRestLength,
        pointerDistance: Math.max(0.001, pointerHookVector.length()),
        pointerDown: hoseIntentActive,
        active: state.active || hoseIntentActive,
        hookStrength: state.hoseHookStrength,
        dt: cappedDt,
      })
      const controllerResponse = computeAnchoredControllerResponse({
        hookStrength: state.hoseHookStrength,
        tetherStrain: tether.strain,
        suctionReadiness: tether.suctionReadiness,
        swingTension: state.swingTension,
        bodySpeed: state.velocity.length(),
        distanceToHook: hookDistance,
        pointerDown: hoseIntentActive,
        release: state.tetherRelease,
      })
      const swingFlow = computeSwingFlowResponse({
        hookStrength: state.hoseHookStrength,
        tetherStrain: tether.strain,
        swingTension: state.swingTension,
        bodySpeed: state.velocity.length(),
        distanceToHook: hookDistance,
        restLength: tether.restLength,
        pointerDistance: Math.max(0.001, pointerHookVector.length()),
        pointerDown: hoseIntentActive,
        active: state.active || hoseIntentActive,
        suctionReadiness: Math.max(tether.suctionReadiness, controllerResponse.mouthSettle),
        releaseMomentum: state.controllerReleaseMomentum,
      })
      state.controllerGripQuality = damp(state.controllerGripQuality, controllerResponse.plantedGrip, 8.4, cappedDt)
      state.controllerMouthSettle = damp(state.controllerMouthSettle, Math.max(controllerResponse.mouthSettle, swingFlow.mouthAssist * 0.86, state.suctionApproachPull * 0.26), 8.8, cappedDt)
      state.controllerReleaseMomentum = damp(state.controllerReleaseMomentum, stickyAnchorOnly || stretchSnapNoOrbit ? 0 : controllerResponse.releaseMomentum * (1 - approachSuppression * 0.9), controllerResponse.releaseMomentum > state.controllerReleaseMomentum ? 10.5 : 3.4, cappedDt)
      state.controllerSwingFlow = damp(state.controllerSwingFlow, stickyAnchorOnly || stretchSnapNoOrbit ? 0 : swingFlow.orbitIntent * (1 - approachSuppression), swingFlow.orbitIntent > state.controllerSwingFlow ? 9.4 : 4.6, cappedDt)
      state.controllerWinchPull = damp(state.controllerWinchPull, stickyAnchorOnly || stretchSnapNoOrbit ? 0 : swingFlow.winchIntent * (1 - approachSuppression * 0.35), swingFlow.winchIntent > state.controllerWinchPull ? 9.0 : 4.2, cappedDt)
      state.controllerReattachGrace = damp(state.controllerReattachGrace, stickyAnchorOnly || stretchSnapNoOrbit ? 0 : swingFlow.reattachGrace * (1 - approachSuppression * 0.55), swingFlow.reattachGrace > state.controllerReattachGrace ? 8.8 : 3.8, cappedDt)
      state.controllerAnchorLoad = damp(state.controllerAnchorLoad, swingFlow.anchorLoad, swingFlow.anchorLoad > state.controllerAnchorLoad ? 9.0 : 4.4, cappedDt)
      state.tetherRestLength = tether.restLength
      state.tetherStrain = damp(state.tetherStrain, tether.strain, 9.2, cappedDt)
      state.suctionReadiness = damp(state.suctionReadiness, Math.max(tether.suctionReadiness, controllerResponse.mouthSettle * 0.86, swingFlow.mouthAssist * 0.92), 8.5, cappedDt)
      const stretch = clampValue(tether.stretch, -0.5, 1.55)
      if (stickyAnchorOnly) {
        state.anchorCurrentDistance = hookDistance
        state.anchorStretch = Math.max(0, hookDistance - state.anchorRestLength)
        const rawAnchorTension = clampValue(
          state.anchorStretch / Math.max(0.001, stretchSnapPreset.maxStretch),
          0,
          1,
        )
        const rawTensionVelocity = (rawAnchorTension - state.anchorPreviousTension) / Math.max(0.0001, cappedDt)
        state.anchorPreviousTension = rawAnchorTension
        state.anchorTensionVelocity = damp(
          state.anchorTensionVelocity,
          rawTensionVelocity,
          PRODUCTION_TUNING.suction.tensionVelocitySmoothing,
          cappedDt,
        )
        state.anchorTension = damp(
          state.anchorTension,
          rawAnchorTension,
          rawAnchorTension > state.anchorTension
            ? PRODUCTION_TUNING.suction.elasticTensionRiseDamping
            : PRODUCTION_TUNING.suction.elasticTensionFallDamping,
          cappedDt,
        )
        snapReleaseVector.copy(state.position).sub(state.anchorWorldPosition)
        snapReleaseVector.y = 0
        if (snapReleaseVector.lengthSq() > 0.0001) {
          snapReleaseVector.normalize()
          state.anchorReleaseDirection.copy(snapReleaseVector)
        }
        const releasePreview = smooth01(
          (state.anchorTension - PRODUCTION_TUNING.suction.stretchSnapHighTensionThreshold)
            / Math.max(0.001, PRODUCTION_TUNING.suction.overstretchThreshold - PRODUCTION_TUNING.suction.stretchSnapHighTensionThreshold),
        )
        state.anchorReleasePreviewStrength = Math.max(state.anchorReleasePreviewStrength, releasePreview)
        const finalSqueeze = releasePreview * smooth01(
          state.anchorOverstretchTimer
            / Math.max(0.001, PRODUCTION_TUNING.suction.snapFinalSqueezeDuration),
        ) * PRODUCTION_TUNING.suction.snapFinalSqueezeStrength
          state.anchorFinalSqueeze = Math.max(state.anchorFinalSqueeze, finalSqueeze)
        const forceTension = rawAnchorTension
        const anchorRadialVelocity = state.velocity.dot(bodyHookVector)
        candidateBodyVector.copy(state.velocity).addScaledVector(bodyHookVector, -anchorRadialVelocity)
        const anchorLateralSpeed = candidateBodyVector.length()
        const stretchEase = smooth01(state.anchorStretch / Math.max(0.001, stretchSnapPreset.maxStretch))
        const springForce = state.anchorStretch
          * stretchSnapPreset.springStrength
          * (0.42 + hook * 0.58)
          * (0.82 + stretchEase * 0.18)
        const dampingForce = -anchorRadialVelocity
          * stretchSnapPreset.damping
          * (0.28 + forceTension * 0.72)
          * hook
        const radialForce = clampValue(
          springForce + dampingForce,
          -PRODUCTION_TUNING.suction.elasticMaxRadialForce,
          PRODUCTION_TUNING.suction.elasticMaxRadialForce,
        )
        state.anchorDirectionToAnchor.copy(bodyHookVector)
        state.anchorSpringForceVector.copy(bodyHookVector).multiplyScalar(springForce)
        state.anchorDampingForceVector.copy(bodyHookVector).multiplyScalar(dampingForce)
        state.anchorElasticForceVector.copy(bodyHookVector).multiplyScalar(radialForce)
        state.velocity.addScaledVector(
          bodyHookVector,
          radialForce * cappedDt / CONTROLLER_PHYSICS.bodyMass,
        )
        snapTangentVector.copy(bodyHookVector).multiplyScalar(-1)
        const towardAnchorSpeed = Math.max(0, anchorRadialVelocity)
        const fallingTension = clampValue(-state.anchorTensionVelocity, 0, 6)
        const bounceTarget = fallingTension
          * stretchSnapPreset.elasticBounceAmount
          * PRODUCTION_TUNING.suction.elasticBounceAmount
          * (1 + PRODUCTION_TUNING.suction.reboundBoost * stretchEase)
          * smooth01(towardAnchorSpeed / Math.max(0.001, PRODUCTION_TUNING.suction.maxBounceVelocity * 1.8))
          * (0.35 + stretchEase * 0.65)
        state.anchorElasticBounce = damp(
          state.anchorElasticBounce,
          bounceTarget,
          bounceTarget > state.anchorElasticBounce
            ? PRODUCTION_TUNING.suction.bounceFrequency
            : PRODUCTION_TUNING.suction.bounceDamping,
          cappedDt,
        )
        const awayAnchorSpeed = Math.max(0, state.velocity.dot(snapTangentVector))
        const reboundBudget = Math.max(0, PRODUCTION_TUNING.suction.maxBounceVelocity - awayAnchorSpeed)
        const reboundImpulse = Math.min(
          reboundBudget,
          state.anchorElasticBounce
            * PRODUCTION_TUNING.suction.reboundImpulseScale
            * PRODUCTION_TUNING.suction.maxBounceVelocity
            * 0.42,
        )
        if (reboundImpulse > 0.0001) {
          state.velocity.addScaledVector(snapTangentVector, reboundImpulse)
          state.anchorElasticForceVector.addScaledVector(
            snapTangentVector,
            reboundImpulse * CONTROLLER_PHYSICS.bodyMass / Math.max(0.0001, cappedDt),
          )
        }
        state.anchorReboundImpulse = damp(
          state.anchorReboundImpulse,
          reboundImpulse,
          reboundImpulse > state.anchorReboundImpulse ? 16 : 6.2,
          cappedDt,
        )
        const latchRadialVelocity = state.velocity.dot(bodyHookVector)
        latchTangentVector.copy(state.velocity).addScaledVector(bodyHookVector, -latchRadialVelocity)
        const latchTangentSpeed = latchTangentVector.length()
        const latchHoldEase = smooth01(
          (state.anchorAttachAge - PRODUCTION_TUNING.suction.latchInfluenceHoldDelay)
            / Math.max(0.001, PRODUCTION_TUNING.suction.latchInfluenceRampTime),
        )
        const latchSpeedEase = Math.max(
          smooth01(
            (state.velocity.length() - PRODUCTION_TUNING.suction.latchInfluenceMinSpeed)
              / Math.max(
                0.001,
                PRODUCTION_TUNING.movement.maxSpeed * 0.48 - PRODUCTION_TUNING.suction.latchInfluenceMinSpeed,
              ),
          ),
          smooth01(
            (latchTangentSpeed - PRODUCTION_TUNING.suction.latchInfluenceMinSpeed)
              / Math.max(
                0.001,
                PRODUCTION_TUNING.movement.maxSpeed * 0.38 - PRODUCTION_TUNING.suction.latchInfluenceMinSpeed,
              ),
          ) * 0.9,
        )
        const latchTensionEase = smooth01(
          (state.anchorTension - PRODUCTION_TUNING.suction.latchInfluenceMinTension)
            / Math.max(0.001, 1 - PRODUCTION_TUNING.suction.latchInfluenceMinTension),
        )
        const latchInfluenceTarget = clampValue(
          latchHoldEase
            * latchSpeedEase
            * (0.78 + stretchEase * 0.24 + latchTensionEase * 0.22),
          0,
          1,
        )
        state.anchorLatchInfluence = damp(
          state.anchorLatchInfluence,
          latchInfluenceTarget,
          latchInfluenceTarget > state.anchorLatchInfluence ? 42 : 8.2,
          cappedDt,
        )
        state.anchorLatchPivotActive = state.anchorLatchInfluence > 0.025 && latchTangentSpeed > 0.12
        const latchHookAuthority = stickyAnchorOnly ? Math.max(hook, 0.82) : hook
        let latchTurnForce = 0
        let latchRadialDamping = 0
        let latchAngularVelocity = 0
        const latchTangentPreserve = clampValue(
          PRODUCTION_TUNING.suction.latchInfluenceTangentPreserve * state.anchorLatchInfluence,
          0,
          0.92,
        )
        const latchPlanarSpeed = Math.hypot(state.velocity.x, state.velocity.z)
        const latchOffAxis = latchPlanarSpeed > 0.0001
          ? Math.abs(
            (state.velocity.x / latchPlanarSpeed) * bodyHookVector.z
              - (state.velocity.z / latchPlanarSpeed) * bodyHookVector.x,
          )
          : 0
        let latchRedirectStrength = 0
        let latchPivotKick = 0
        if (state.anchorLatchPivotActive && latchTangentSpeed > 0.0001) {
          latchTangentVector.multiplyScalar(1 / latchTangentSpeed)
          const latchTangentLimit = PRODUCTION_TUNING.suction.latchInfluenceMaxTangentSpeed
            * (0.86 + state.anchorTension * 0.14)
          latchTurnForce = clampValue(
            latchTangentSpeed
              * PRODUCTION_TUNING.suction.latchInfluenceTurnStrength
              * state.anchorLatchInfluence
              * latchHookAuthority
              * (0.75 + state.anchorTension * 0.25),
            0,
            PRODUCTION_TUNING.suction.latchInfluenceMaxTurnForce,
          )
          const tangentBudget = Math.max(0, latchTangentLimit - latchTangentSpeed)
          const tangentImpulse = Math.min(
            tangentBudget,
            latchTurnForce * cappedDt / CONTROLLER_PHYSICS.bodyMass,
          )
          if (tangentImpulse > 0.0001) {
            state.velocity.addScaledVector(latchTangentVector, tangentImpulse)
          }
          if (latchRadialVelocity < 0) {
            latchRadialDamping = clampValue(
              -latchRadialVelocity
                * PRODUCTION_TUNING.suction.latchInfluenceRadialDamping
                * state.anchorLatchInfluence
                * cappedDt,
              0,
              PRODUCTION_TUNING.suction.maxBounceVelocity * 0.55,
            )
            state.velocity.addScaledVector(bodyHookVector, latchRadialDamping)
          }
          const latchOffAxisBoost = clampValue(
            0.36 + latchOffAxis * PRODUCTION_TUNING.suction.latchInfluenceOffAxisBoost,
            0.36,
            1.75,
          )
          latchRedirectStrength = clampValue(
            state.anchorLatchInfluence
              * latchOffAxisBoost
              * PRODUCTION_TUNING.suction.latchInfluenceVelocityRedirect
              * latchHookAuthority
              * (0.68 + state.anchorTension * 0.32),
            0,
            0.98,
          )
          latchPivotDirectionVector
            .copy(latchTangentVector)
            .multiplyScalar(0.34 + state.anchorTension * 0.1)
            .addScaledVector(
              bodyHookVector,
              PRODUCTION_TUNING.suction.latchInfluenceInwardBend
                * (0.78 + stretchEase * 0.32 + latchOffAxis * 0.18),
            )
          latchPivotDirectionVector.y = 0
          if (latchPivotDirectionVector.lengthSq() > 0.0001) {
            latchPivotDirectionVector.normalize()
            latchPivotVelocityVector
              .copy(latchPivotDirectionVector)
              .multiplyScalar(
                clampValue(
                  Math.max(
                    PRODUCTION_TUNING.suction.latchInfluenceMinSpeed,
                    state.velocity.length() * (0.92 + state.anchorLatchInfluence * 0.08),
                  ),
                  0,
                  PRODUCTION_TUNING.movement.maxSpeed * 1.18,
                ),
              )
            latchPivotVelocityVector.y = state.velocity.y
            state.velocity.lerp(latchPivotVelocityVector, latchRedirectStrength)
          }
          latchPivotKick = clampValue(
            PRODUCTION_TUNING.suction.latchInfluencePivotKick
              * state.anchorLatchInfluence
              * latchOffAxisBoost
              * latchHookAuthority
              * (0.64 + stretchEase * 0.36)
              * cappedDt,
            0,
            PRODUCTION_TUNING.suction.maxBounceVelocity * 1.8,
          )
          if (latchPivotKick > 0.0001) {
            state.velocity.addScaledVector(bodyHookVector, latchPivotKick)
          }
          const postLatchRadialVelocity = state.velocity.dot(bodyHookVector)
          latchPostTangentVector.copy(state.velocity).addScaledVector(bodyHookVector, -postLatchRadialVelocity)
          const postLatchTangentSpeed = latchPostTangentVector.length()
          if (postLatchTangentSpeed > latchTangentLimit) {
            state.velocity.addScaledVector(
              latchPostTangentVector,
              (latchTangentLimit / postLatchTangentSpeed) - 1,
            )
          }
          const latchSpeedCap = PRODUCTION_TUNING.movement.maxSpeed * 1.24
          const latchPostSpeed = state.velocity.length()
          if (latchPostSpeed > latchSpeedCap) {
            state.velocity.multiplyScalar(latchSpeedCap / latchPostSpeed)
          }
          const angularSign = bodyHookVector.x * latchTangentVector.z - bodyHookVector.z * latchTangentVector.x >= 0 ? 1 : -1
          latchAngularVelocity = angularSign * Math.min(postLatchTangentSpeed, latchTangentLimit) / Math.max(0.15, hookDistance)
          state.anchorLatchDirection.copy(latchTangentVector)
        } else {
          state.anchorLatchDirection.lerp(zeroVector, Math.min(1, cappedDt * 7.5))
        }
        const lateralDampingBase = clampValue(
          PRODUCTION_TUNING.suction.elasticLateralDamping * (0.28 + forceTension * 0.72) * hook * cappedDt,
          0,
          0.68,
        )
        const lateralDamping = lateralDampingBase * (1 - latchTangentPreserve)
        const dampRadialVelocity = state.velocity.dot(bodyHookVector)
        candidateBodyVector.copy(state.velocity).addScaledVector(bodyHookVector, -dampRadialVelocity)
        const dampTangentSpeed = candidateBodyVector.length()
        state.velocity.addScaledVector(candidateBodyVector, -lateralDamping)
        state.anchorSpringForce = damp(state.anchorSpringForce, springForce, 8.2, cappedDt)
        state.anchorDampingForce = damp(state.anchorDampingForce, Math.abs(dampingForce), 8.2, cappedDt)
        state.anchorLateralDamping = damp(state.anchorLateralDamping, lateralDamping, 8.2, cappedDt)
        state.anchorRadialVelocity = damp(state.anchorRadialVelocity, dampRadialVelocity, 9.0, cappedDt)
        state.anchorTangentVelocity = damp(state.anchorTangentVelocity, Math.max(anchorLateralSpeed, dampTangentSpeed), 8.0, cappedDt)
        state.anchorLatchTurnForce = damp(state.anchorLatchTurnForce, latchTurnForce, 8.4, cappedDt)
        state.anchorLatchTangentPreserve = damp(state.anchorLatchTangentPreserve, latchTangentPreserve, 8.4, cappedDt)
        state.anchorLatchRadialDamping = damp(state.anchorLatchRadialDamping, latchRadialDamping, 8.4, cappedDt)
        state.anchorLatchAngularVelocity = damp(state.anchorLatchAngularVelocity, latchAngularVelocity, 8.4, cappedDt)
        state.anchorLatchOffAxis = damp(state.anchorLatchOffAxis, latchOffAxis, 8.4, cappedDt)
        state.anchorLatchRedirectStrength = damp(state.anchorLatchRedirectStrength, latchRedirectStrength, 8.4, cappedDt)
        state.anchorLatchPivotKick = damp(state.anchorLatchPivotKick, latchPivotKick, 8.4, cappedDt)
        const latchJuice = state.anchorLatchInfluence * smooth01(dampTangentSpeed / Math.max(0.001, PRODUCTION_TUNING.suction.latchInfluenceMaxTangentSpeed))
        state.animationSlide = Math.max(state.animationSlide, latchJuice * 0.24)
        state.animationBodyJolt = Math.max(state.animationBodyJolt, latchJuice * 0.14)
        state.animationMouthTug = Math.max(state.animationMouthTug, latchJuice * 0.24)
        state.pivotHoseWobble = Math.max(state.pivotHoseWobble, latchJuice * 0.28)
        const stretchSnapJuice = clampValue(
          state.anchorTension * PRODUCTION_TUNING.suction.stretchSnapTensionJuiceScale,
          0,
          2.1,
        )
        state.tetherStrain = Math.max(state.tetherStrain, stretchSnapJuice)
        state.swingTension = Math.max(state.swingTension, stretchSnapJuice * 1.18)
        state.pivotHoseVisualStretch = Math.max(
          state.pivotHoseVisualStretch,
          stretchSnapJuice * 2.35 + state.anchorReleasePreviewStrength * 0.46,
        )
        state.pivotHoseThinning = Math.max(
          state.pivotHoseThinning,
          stretchSnapJuice * PRODUCTION_TUNING.suction.elasticHoseThinAmount * 1.08,
        )
        state.pivotHoseWobble = Math.max(
          state.pivotHoseWobble,
          stretchSnapJuice * PRODUCTION_TUNING.suction.elasticWobbleAmount + state.anchorElasticBounce * 0.24,
        )
        state.animationStretch = Math.max(
          state.animationStretch,
          stretchSnapJuice * PRODUCTION_TUNING.suction.elasticBodySquash + state.anchorElasticBounce * 0.16,
        )
        state.animationMouthTug = Math.max(
          state.animationMouthTug,
          stretchSnapJuice * PRODUCTION_TUNING.suction.elasticMouthStrain + state.anchorReleasePreviewStrength * 0.18,
        )
        state.animationBodyJolt = Math.max(state.animationBodyJolt, stretchSnapJuice * 0.08 + state.anchorElasticBounce * 0.18)
        state.animationGlug = Math.max(state.animationGlug, stretchSnapJuice * 0.16 + state.anchorElasticBounce * 0.09)
        state.glugPulse = Math.max(state.glugPulse, stretchSnapJuice * 0.08 + state.anchorElasticBounce * 0.045)
        state.deepEmbedPocketPulse = Math.max(state.deepEmbedPocketPulse, stretchSnapJuice * 0.12 + finalSqueeze * 0.14)
        state.animationMouthTug = Math.max(state.animationMouthTug, finalSqueeze * 0.42)
        state.animationStretch = Math.max(state.animationStretch, finalSqueeze * 0.3)
        if (state.anchorTension > PRODUCTION_TUNING.suction.stretchSnapHighTensionThreshold) {
          state.stretchSnapCameraImpulse = Math.max(
            state.stretchSnapCameraImpulse,
            PRODUCTION_TUNING.suction.stretchSnapCameraImpulseScale * state.anchorTension * 0.2,
          )
        }
      } else {
        state.anchorStretch = damp(state.anchorStretch, 0, 5.4, cappedDt)
        state.anchorTension = damp(state.anchorTension, 0, 6.0, cappedDt)
        state.anchorPreviousTension = damp(state.anchorPreviousTension, 0, 6.0, cappedDt)
        state.anchorTensionVelocity = damp(state.anchorTensionVelocity, 0, 6.0, cappedDt)
        state.anchorElasticBounce = damp(state.anchorElasticBounce, 0, 6.0, cappedDt)
        state.anchorReboundImpulse = damp(state.anchorReboundImpulse, 0, 6.0, cappedDt)
        state.anchorDirectionToAnchor.lerp(trunkAxis, Math.min(1, cappedDt * 6.0))
        state.anchorSpringForceVector.lerp(zeroVector, Math.min(1, cappedDt * 6.0))
        state.anchorDampingForceVector.lerp(zeroVector, Math.min(1, cappedDt * 6.0))
        state.anchorElasticForceVector.lerp(zeroVector, Math.min(1, cappedDt * 6.0))
        state.anchorSpringForce = damp(state.anchorSpringForce, 0, 6.0, cappedDt)
        state.anchorDampingForce = damp(state.anchorDampingForce, 0, 6.0, cappedDt)
        state.anchorLateralDamping = damp(state.anchorLateralDamping, 0, 6.0, cappedDt)
        state.anchorRadialVelocity = damp(state.anchorRadialVelocity, 0, 6.0, cappedDt)
        state.anchorTangentVelocity = damp(state.anchorTangentVelocity, 0, 6.0, cappedDt)
        state.anchorLatchInfluence = damp(state.anchorLatchInfluence, 0, 6.0, cappedDt)
        state.anchorLatchPivotActive = false
        state.anchorLatchTurnForce = damp(state.anchorLatchTurnForce, 0, 6.0, cappedDt)
        state.anchorLatchTangentPreserve = damp(state.anchorLatchTangentPreserve, 0, 6.0, cappedDt)
        state.anchorLatchRadialDamping = damp(state.anchorLatchRadialDamping, 0, 6.0, cappedDt)
        state.anchorLatchAngularVelocity = damp(state.anchorLatchAngularVelocity, 0, 6.0, cappedDt)
        state.anchorLatchDirection.lerp(zeroVector, Math.min(1, cappedDt * 6.0))
        state.anchorLatchOffAxis = damp(state.anchorLatchOffAxis, 0, 6.0, cappedDt)
        state.anchorLatchRedirectStrength = damp(state.anchorLatchRedirectStrength, 0, 6.0, cappedDt)
        state.anchorLatchPivotKick = damp(state.anchorLatchPivotKick, 0, 6.0, cappedDt)
      }
      swingTangentVector.set(bodyHookVector.z, 0, -bodyHookVector.x)
      if (swingTangentVector.lengthSq() > 0.0001) swingTangentVector.normalize()
      const mouthPocketProximity = smooth01(
        (PRODUCTION_TUNING.suction.suctionApproachMouthLockDistance + 0.58 - mouthHookDistance)
          / 0.58,
      )
      if (state.suctionApproachPull > 0.015 && physicalSealForMotion && !state.gripActive && !stickyAnchorOnly) {
        const towardHookSpeed = state.velocity.dot(bodyHookVector)
        const approachSpeedTarget = PRODUCTION_TUNING.suction.suctionApproachMaxSpeed
          * (0.9 + Math.min(1, state.slimeSealStrength) * 0.14)
          * (1 - mouthPocketProximity * 0.42)
        const missingHookSpeed = Math.max(0, approachSpeedTarget - towardHookSpeed)
        state.velocity.addScaledVector(
          bodyHookVector,
          missingHookSpeed
            * PRODUCTION_TUNING.suction.suctionApproachPullStrength
            * state.suctionApproachPull
            * cappedDt,
        )
        const refreshedHookSpeed = state.velocity.dot(bodyHookVector)
        if (refreshedHookSpeed > approachSpeedTarget) {
          const pocketLandingBrake = 1 - Math.exp(
            -(7.6 + PRODUCTION_TUNING.suction.suctionPocketCaptureStopDamping * 0.45)
              * mouthPocketProximity
              * state.suctionApproachPull
              * cappedDt,
          )
          state.velocity.addScaledVector(bodyHookVector, -(refreshedHookSpeed - approachSpeedTarget) * pocketLandingBrake)
        }
        const landedHookSpeed = state.velocity.dot(bodyHookVector)
        candidateBodyVector.copy(state.velocity).addScaledVector(bodyHookVector, -landedHookSpeed)
        const lateralSettle = 1 - Math.exp(
          -PRODUCTION_TUNING.suction.suctionApproachLateralDamping
            * state.suctionApproachPull
            * (0.85 + mouthPocketProximity * 0.45)
            * cappedDt,
        )
        state.velocity.addScaledVector(candidateBodyVector, -lateralSettle)
        const approachSpeedLimit = approachSpeedTarget * (1.12 + state.suctionApproachPull * 0.16)
        const approachSpeed = state.velocity.length()
        if (approachSpeed > approachSpeedLimit) {
          state.velocity.multiplyScalar(approachSpeedLimit / approachSpeed)
        }
      }
      const contactMagnet = stickyAnchorOnly
        ? 0
        : clampValue(
          hook
            * (physicalSealForMotion ? 1 : 0)
            * Math.max(
              state.suctionApproachPull,
              state.controllerMouthSettle * 0.7,
              state.suctionContactSealQuality * 0.34,
              state.deepEmbedLockStrength * 0.22,
            )
            * (1 - state.pivotSnapReadiness * 0.28),
          0,
          1,
        )
	      if (contactMagnet > 0.01 && !state.gripActive && !stickyAnchorOnly) {
	        const towardHookSpeed = state.velocity.dot(bodyHookVector)
	        const missingHookSpeed = Math.max(0, PRODUCTION_TUNING.suction.suctionContactMaxMagnetSpeed - towardHookSpeed)
        state.velocity.addScaledVector(
          bodyHookVector,
          missingHookSpeed * PRODUCTION_TUNING.suction.suctionContactMagnetStrength * contactMagnet * cappedDt,
        )
        const refreshedHookSpeed = state.velocity.dot(bodyHookVector)
        candidateBodyVector.copy(state.velocity).addScaledVector(bodyHookVector, -refreshedHookSpeed)
	        const contactTangentDamping = 1 - Math.exp(-PRODUCTION_TUNING.suction.suctionContactTangentDamping * contactMagnet * cappedDt)
	        state.velocity.addScaledVector(candidateBodyVector, -contactTangentDamping)
	      }
	      const pocketCapture = stickyAnchorOnly
	        ? 0
	        : clampValue(
	          hook
              * (physicalSealForMotion ? 1 : 0)
	            * Math.max(state.suctionApproachPull, state.controllerMouthSettle * 0.78, state.deepEmbedLockStrength * 0.36)
	            * smooth01((PRODUCTION_TUNING.suction.suctionApproachMouthLockDistance + 0.24 - mouthHookDistance) / 0.34),
	          0,
	          1,
	        )
	      if (pocketCapture > 0.01 && !state.gripActive && !stickyAnchorOnly) {
	        const towardHookSpeed = state.velocity.dot(bodyHookVector)
	        if (towardHookSpeed > 0) {
	          const pocketRestSpeed = PRODUCTION_TUNING.suction.suctionApproachMaxSpeed
	            * (0.1 + (1 - smooth01(state.deepEmbedDepth / Math.max(0.001, PRODUCTION_TUNING.embed.embedDepthMax))) * 0.08)
	          const pocketStop = 1 - Math.exp(
	            -(
	              PRODUCTION_TUNING.suction.suctionPocketCaptureStopDamping
	              + state.deepEmbedLockStrength * 1.4
	            ) * pocketCapture * cappedDt,
	          )
	          state.velocity.addScaledVector(bodyHookVector, -Math.max(0, towardHookSpeed - pocketRestSpeed) * pocketStop)
	        }
	        const pocketLateralVelocity = state.velocity.dot(bodyHookVector)
	        candidateBodyVector.copy(state.velocity).addScaledVector(bodyHookVector, -pocketLateralVelocity)
	        const pocketTangentSettle = 1 - Math.exp(
	          -PRODUCTION_TUNING.suction.suctionPocketCaptureTangentDamping * pocketCapture * cappedDt,
	        )
	        state.velocity.addScaledVector(candidateBodyVector, -pocketTangentSettle)
	        state.controllerMouthSettle = Math.max(state.controllerMouthSettle, pocketCapture * 0.72)
        state.deepEmbedDepth = Math.max(
          state.deepEmbedDepth,
          PRODUCTION_TUNING.embed.embedDepthMax * 0.38 * pocketCapture * Math.min(1, state.slimeSealStrength),
        )
          const pocketBitePulse = pocketCapture * mouthPocketProximity * Math.min(1, state.slimeSealStrength)
          state.deepEmbedPocketPulse = Math.max(state.deepEmbedPocketPulse, pocketBitePulse * 0.32)
          state.deepEmbedRimOcclusion = Math.max(state.deepEmbedRimOcclusion, pocketBitePulse * 0.2)
          state.deepEmbedLockStrength = Math.max(state.deepEmbedLockStrength, pocketBitePulse * 0.18)
          state.animationMouthTug = Math.max(state.animationMouthTug, pocketBitePulse * 0.18)
          state.animationSlurp = Math.max(state.animationSlurp, pocketBitePulse * 0.1)
	      }
      const settledSealSwingReturn = smooth01((state.slimeSealAge - 0.48) / 0.5)
        * smooth01((tether.strain - 0.42) / 0.58)
        * (1 - mouthPocketProximity * 0.22)
      const contactSettleControl = clampValue(
        Math.max(approachSuppression, contactMagnet * 0.94, pocketCapture * 0.96)
          * (1 - smooth01((tether.strain - 0.72) / 0.56) * 0.62)
          * (1 - settledSealSwingReturn * 0.32),
        0,
        1,
      )
      contactCaptureSteady = contactSettleControl
	      const radialVelocity = state.velocity.dot(bodyHookVector)
      const tangentialVelocity = swingTangentVector.lengthSq() > 0.0001
        ? state.velocity.dot(swingTangentVector)
        : 0
      const pointerTangentialIntent = swingTangentVector.lengthSq() > 0.0001
        ? pointerHookVector.dot(swingTangentVector) + deltaVector.dot(swingTangentVector) * 0.32
        : 0
      const pivot = computeSuctionPivotSwing({
        hookStrength: state.hoseHookStrength,
        sealStrength: state.slimeSealStrength,
        sealQuality: state.suctionContactSealQuality,
        embedDepth: state.deepEmbedDepth,
        embedLockStrength: state.deepEmbedLockStrength,
        distanceToPivot: hookDistance,
        restLength: tether.restLength,
        tetherStrain: tether.strain,
        swingTension: state.swingTension,
        bodySpeed: state.velocity.length(),
        radialOutSpeed: Math.max(0, -radialVelocity),
        tangentialSpeed: tangentialVelocity,
        pointerTangentialIntent,
        releaseMomentum: state.controllerReleaseMomentum,
        reattachGrace: state.controllerReattachGrace,
        pointerDown: hoseIntentActive,
        active: state.active || hoseIntentActive,
      })
      const usefulPivotStretch = hookDistance > PRODUCTION_TUNING.hose.hoseRestLength * 1.08
        || tether.strain > 0.72
        || state.slimeSealAge > PRODUCTION_TUNING.suction.suctionApproachMaxSettleSeconds * 1.35
      const pivotReady = !stretchSnapNoOrbit
        && !stickyAnchorOnly
        && (
          state.gripActive
          || (
            state.slimeSealAge > PRODUCTION_TUNING.suction.suctionApproachPivotDelay
            && (
              state.suctionApproachSettle < PRODUCTION_TUNING.suction.suctionApproachPivotSettleGate
              || state.slimeSealAge > PRODUCTION_TUNING.suction.suctionApproachMaxSettleSeconds * 1.2
            )
            && usefulPivotStretch
          )
        )
      const pivotLocked = pivotReady && pivot.locked
      state.suctionApproachLocked = physicalSealForMotion && !pivotReady && !state.gripActive && (state.suctionApproachSettle > 0.08 || state.hoseHookStrength > 0.28)
      state.pivotLocked = pivotLocked
      state.pivotPoint.copy(state.slimeHookPoint)
      state.pivotLockDuration = pivotLocked ? state.pivotLockDuration + cappedDt : 0
      state.pivotAngularVelocity = damp(state.pivotAngularVelocity, pivotLocked ? pivot.angularVelocity : 0, 8.2, cappedDt)
      state.pivotTangentialSpeed = damp(state.pivotTangentialSpeed, pivotLocked ? Math.abs(pivot.tangentialSpeed) : 0, 8.2, cappedDt)
      state.pivotRadialDistance = damp(state.pivotRadialDistance, pivot.radialDistance, 8.2, cappedDt)
      state.pivotHoseStretchRatio = damp(state.pivotHoseStretchRatio, pivotReady ? pivot.stretchRatio : pivot.stretchRatio * 0.24, 9.5, cappedDt)
      state.pivotTension = damp(state.pivotTension, pivotLocked ? pivot.hoseTension : pivot.hoseTension * 0.08, 10.4, cappedDt)
      state.pivotSnapThreshold = damp(state.pivotSnapThreshold, pivot.snapThreshold, 6.8, cappedDt)
      state.pivotSwingAssist = damp(state.pivotSwingAssist, pivotLocked ? pivot.tangentialBoost / Math.max(0.001, PRODUCTION_TUNING.pivot.pivotSwingAssistStrength) : 0, 8.6, cappedDt)
      state.pivotHoseVisualStretch = damp(state.pivotHoseVisualStretch, pivotReady ? pivot.hoseVisualStretch : pivot.hoseVisualStretch * 0.28, 10.8, cappedDt)
      state.pivotHoseThinning = damp(state.pivotHoseThinning, pivotReady ? pivot.hoseThinning : pivot.hoseThinning * 0.18, 9.8, cappedDt)
      state.pivotHoseWobble = damp(state.pivotHoseWobble, pivotReady ? pivot.hoseWobble : pivot.hoseWobble * 0.16, 10.2, cappedDt)
      state.pivotSnapReadiness = damp(state.pivotSnapReadiness, pivotLocked ? pivot.snapReadiness : 0, 10.4, cappedDt)
      const contactSwingFreedom = clampValue(
        clampValue(
          1 - Math.max(approachSuppression, contactMagnet * 0.96, pocketCapture * 0.92)
            * (1 - smooth01((tether.strain - 0.72) / 0.62) * 0.62),
          0.04,
          1,
        ) + settledSealSwingReturn * 0.24,
        0.04,
        1,
      )
      if (state.gripActive) {
        const visibleGripOrbitAngle = Math.atan2(
          state.position.z - state.gripLockPoint.z,
          state.position.x - state.gripLockPoint.x,
        )
        const grip = computeRightClickGripSwing({
          active: true,
          holdTime: state.gripHoldTime,
          missedWindows: state.gripMissCount,
          spinAngle: visibleGripOrbitAngle,
          currentSpinSpeed: state.gripSpinSpeed,
          dt: cappedDt,
          distanceToGrip: hookDistance,
          restLength: tether.restLength,
          bodySpeed: state.velocity.length(),
          sealStrength: Math.max(state.slimeSealStrength, state.suctionContactSealQuality),
          tension: Math.max(state.swingTension, state.pivotTension, state.tetherStrain),
        })
        state.gripSpinSpeed = grip.spinSpeed
        state.gripSpinAngle = visibleGripOrbitAngle
        const refreshedGrip = computeRightClickGripSwing({
          active: true,
          holdTime: state.gripHoldTime,
          missedWindows: state.gripMissCount,
          spinAngle: state.gripSpinAngle,
          currentSpinSpeed: state.gripSpinSpeed,
          dt: cappedDt,
          distanceToGrip: hookDistance,
          restLength: tether.restLength,
          bodySpeed: state.velocity.length(),
          sealStrength: Math.max(state.slimeSealStrength, state.suctionContactSealQuality),
          tension: Math.max(state.swingTension, state.pivotTension, state.tetherStrain),
        })
        state.gripReleaseWindowWidth = refreshedGrip.releaseWindowWidth
        state.gripReleaseQuality = refreshedGrip.releaseQuality
        state.gripReleaseReadiness = refreshedGrip.releaseReadiness
        state.gripReleasePhaseQuality = refreshedGrip.phaseQuality
        state.gripReleaseCue = damp(
          state.gripReleaseCue,
          refreshedGrip.releaseCue,
          refreshedGrip.releaseCue > state.gripReleaseCue ? 14 : 5.2,
          cappedDt,
        )
        state.gripReleaseReady = damp(
          state.gripReleaseReady,
          refreshedGrip.releaseQuality >= PRODUCTION_TUNING.grip.gripReleaseQualityThreshold ? 1 : 0,
          12,
          cappedDt,
        )
        const gripLockCueLoad = Math.max(state.gripLockPulse * 0.62, state.gripEntryPull * 0.36)
        const gripReleasePressure = clampValue(
          (
            state.gripReleaseCue * 0.76
            + refreshedGrip.releaseReadiness * refreshedGrip.phaseQuality * 0.34
            + state.gripReleaseReady * 0.18
          ) * PRODUCTION_TUNING.grip.gripPhysicalCueStrength,
          0,
          1.25,
        )
        const gripMissPressure = clampValue(
          state.gripMissPulse * PRODUCTION_TUNING.grip.gripMissClenchVisualStrength
            + refreshedGrip.missPressure * 0.12,
          0,
          1.25,
        )
        const gripPhysicalCueTarget = Math.max(gripLockCueLoad, gripReleasePressure, gripMissPressure * 0.82)
        state.gripPhysicalCue = damp(
          state.gripPhysicalCue,
          gripPhysicalCueTarget,
          gripPhysicalCueTarget > state.gripPhysicalCue ? 12.6 : 5.2,
          cappedDt,
        )
        state.gripPocketBiteCue = damp(
          state.gripPocketBiteCue,
          clampValue(
            (
              gripLockCueLoad * 0.45
              + gripReleasePressure * 0.56
              + gripMissPressure * 0.72
            ) * PRODUCTION_TUNING.grip.gripPocketBiteCueStrength,
            0,
            1.15,
          ),
          11.2,
          cappedDt,
        )
        state.gripHoseStrainCue = damp(
          state.gripHoseStrainCue,
          clampValue(
            (
              gripReleasePressure * 0.62
              + gripMissPressure * 0.84
              + refreshedGrip.dizzy * 0.28
            ) * PRODUCTION_TUNING.grip.gripHoseStrainCueStrength,
            0,
            1.2,
          ),
          10.8,
          cappedDt,
        )
        state.gripMouthAnticipationCue = damp(
          state.gripMouthAnticipationCue,
          clampValue(
            (
              gripLockCueLoad * 0.36
              + gripReleasePressure * 0.8
              + gripMissPressure * 0.32
            ) * PRODUCTION_TUNING.grip.gripMouthAnticipationStrength,
            0,
            1.1,
          ),
          12.4,
          cappedDt,
        )
        state.gripDizzy = refreshedGrip.dizzy
        state.gripMassMultiplier = refreshedGrip.massTransferMultiplier
        state.gripGlugBoost = refreshedGrip.glugStrengthMultiplier
        state.pivotLocked = true
        state.pivotPoint.copy(state.gripLockPoint)
        state.pivotHoseVisualStretch = Math.max(state.pivotHoseVisualStretch, pivot.hoseVisualStretch + state.gripMissCount * 0.12)
        state.pivotHoseWobble = Math.max(
          state.pivotHoseWobble,
          0.42 + state.gripDizzy * 0.52 + state.gripReleaseCue * 0.24 + state.gripMissPulse * 0.3 + state.gripHoseStrainCue * 0.42,
        )
        state.pivotSnapReadiness = Math.max(state.pivotSnapReadiness, refreshedGrip.dizzy * 0.42 + state.gripReleaseCue * 0.1)
        state.deepEmbedPocketPulse = Math.max(
          state.deepEmbedPocketPulse,
          state.gripReleaseCue * 0.18 + state.gripMissPulse * 0.28 + state.gripPocketBiteCue * 0.34,
        )
        state.animationAnticipation = Math.max(state.animationAnticipation, state.gripReleaseCue * 0.22 + state.gripMouthAnticipationCue * 0.34)
        state.animationMouthTug = Math.max(state.animationMouthTug, state.gripMouthAnticipationCue * 0.42 + state.gripPocketBiteCue * 0.18)

        if (refreshedGrip.releaseQuality >= PRODUCTION_TUNING.grip.gripReleaseQualityThreshold) {
          state.gripWindowWasOpen = true
          state.gripReleaseGraceTimer = PRODUCTION_TUNING.grip.gripReleaseLateGraceSeconds
          state.gripState = 'release-window'
        } else if (state.gripWindowWasOpen && state.gripInputDown && refreshedGrip.releaseQuality < PRODUCTION_TUNING.grip.gripReleaseQualityThreshold * 0.28) {
          state.gripMissCount += 1
          state.gripWindowWasOpen = false
          state.gripState = 'overdrive'
          state.gripReleaseReason = 'missedWindow'
          state.gripMissPulse = Math.max(state.gripMissPulse, PRODUCTION_TUNING.grip.gripMissCueStrength)
          state.gripReleaseGraceTimer = 0
          state.animationSnap = Math.max(state.animationSnap, 0.22)
          state.animationRecoil = Math.max(state.animationRecoil, 0.18)
          state.gripSpinSpeed = Math.min(
            PRODUCTION_TUNING.grip.gripSpinMaxSpeed,
            state.gripSpinSpeed + PRODUCTION_TUNING.grip.gripSpinMissBoost,
          )
          recordFlowGrip(state.flowMetrics, {
            time: t,
            kind: 'missedWindow',
            targetId: state.gripTargetMoteId,
            releaseQuality: refreshedGrip.releaseQuality,
            holdTime: state.gripHoldTime,
            spinSpeed: state.gripSpinSpeed,
            massMultiplier: refreshedGrip.massTransferMultiplier,
            reason: 'missedWindow',
          })
        } else if (state.gripMissCount > 0) {
          state.gripState = 'overdrive'
        } else {
          state.gripState = 'locked'
        }

        const releaseGrip = (reason: GripReleaseReason, quality: number, spinout: boolean) => {
          const flowSnapVelocityBefore = { x: state.velocity.x, y: state.velocity.y, z: state.velocity.z }
          snapReleaseVector.copy(state.position).sub(state.gripLockPoint)
          snapReleaseVector.y *= 0.2
          if (snapReleaseVector.lengthSq() > 0.0001) snapReleaseVector.normalize()
          else snapReleaseVector.copy(bodyHookVector).multiplyScalar(-1)
          const impulse = refreshedGrip.releaseImpulse * (spinout ? 0.48 : 1)
          // Stretch-snap release is radial: no sideways shove around the slime pocket.
          const tangentImpulse = 0
          state.velocity.addScaledVector(snapReleaseVector, impulse)
          state.velocity.multiplyScalar(1 + quality * 0.08)
          const flowSnapVelocityAfter = { x: state.velocity.x, y: state.velocity.y, z: state.velocity.z }
          state.snapMomentum.copy(state.velocity)
          state.tetherRelease = Math.max(state.tetherRelease, refreshedGrip.releaseImpulse * 0.42, quality)
          state.controllerReleaseMomentum = Math.max(state.controllerReleaseMomentum, 0.38 + quality * 0.58)
          state.controllerReattachGrace = Math.max(state.controllerReattachGrace, 0.36 + quality * 0.48)
          state.postSnapReattachTimer = Math.max(state.postSnapReattachTimer, PRODUCTION_TUNING.grip.gripPostReleaseReattachDelay + quality * 0.12)
          state.pivotReattachCooldown = Math.max(state.pivotReattachCooldown, PRODUCTION_TUNING.grip.gripPostReleaseReattachDelay)
          state.pivotReleaseReason = spinout ? 'gripSpinout' : 'gripRelease'
          state.gripActive = false
          state.gripInputDown = false
          state.gripReleaseQueued = false
          state.gripState = spinout ? 'spinout' : 'recovery'
          state.gripCooldown = PRODUCTION_TUNING.grip.gripCooldown
          state.gripReleaseCue = 0
          state.gripReleaseGraceTimer = 0
          state.gripWindowWasOpen = false
          state.gripSpinoutPulse = Math.max(state.gripSpinoutPulse, spinout ? PRODUCTION_TUNING.grip.gripCoughBurstStrength : quality * 0.46)
          state.gripCoughPulse = Math.max(state.gripCoughPulse, spinout ? 1 : 0)
          state.gripLastReleaseQuality = quality
          state.gripReleaseReason = reason
          state.gripMassMultiplier = 1
          state.gripGlugBoost = 1
          state.hoseHookStrength = Math.min(state.hoseHookStrength, spinout ? 0.1 : 0.24)
          state.slimeSealStrength *= spinout ? 0.12 : 0.24
          state.slimeSealDemand = 0
          state.sealTargetMoteId = -1
          state.sealTargetScore = 0
          if (spinout && state.bagCollectedMass > 0.001) {
            const lostMass = Math.min(state.bagCollectedMass, PRODUCTION_TUNING.grip.gripCoughMassLoss)
            state.bagCollectedMass = Math.max(0, state.bagCollectedMass - lostMass)
            state.bagFillAmount = state.bagCollectedMass
            state.bagFillNormalized = clampValue(state.bagFillAmount / Math.max(0.001, PRODUCTION_TUNING.bag.bagFillAmountMax), 0, 1)
            state.bagFillTarget = Math.max(PRODUCTION_TUNING.bag.bagBaseScale, state.bagFillTarget - lostMass * PRODUCTION_TUNING.bag.bagFillPerMass)
            state.bagPulse = Math.min(2.2, state.bagPulse + 0.42)
            state.bagWobble = Math.min(1.9, state.bagWobble + 0.48)
            recordFlowBagFill(state.flowMetrics, {
              time: t,
              amount: state.bagFillAmount,
              normalized: state.bagFillNormalized,
              massGained: -lostMass,
            })
          }
          recordFlowGrip(state.flowMetrics, {
            time: t,
            kind: spinout ? 'spinout' : 'release',
            targetId: state.gripTargetMoteId,
            releaseQuality: quality,
            holdTime: state.gripHoldTime,
            spinSpeed: state.gripSpinSpeed,
            massMultiplier: refreshedGrip.massTransferMultiplier,
            reason,
          })
          recordFlowSnap(state.flowMetrics, {
            time: t,
            reason: 'manualRelease',
            sealBreakReason: spinout ? 'velocityTooHigh' : 'manualRelease',
            targetId: state.gripTargetMoteId,
            tension: Math.max(state.pivotTension, state.swingTension, state.tetherStrain),
            sealStrength: Math.max(state.slimeSealStrength, state.suctionContactSealQuality),
            velocityBefore: flowSnapVelocityBefore,
            velocityAfter: flowSnapVelocityAfter,
            snapImpulseApplied: impulse + Math.abs(tangentImpulse),
            contactAngle: Math.max(0, 1 - quality),
          })
        }

        if (refreshedGrip.spinoutReady) {
          releaseGrip('spinout', 0, true)
        } else if (state.gripReleaseQueued) {
          state.gripReleaseQueued = false
          const releaseThreshold = PRODUCTION_TUNING.grip.gripReleaseQualityThreshold
          const graceReleaseQuality = state.gripReleaseGraceTimer > 0
            ? Math.max(refreshedGrip.releaseQuality, releaseThreshold * 0.72)
            : refreshedGrip.releaseQuality
          const releaseWasValid = refreshedGrip.releaseQuality >= releaseThreshold
            || (state.gripReleaseGraceTimer > 0 && refreshedGrip.releaseReadiness > 0.62 && refreshedGrip.phaseQuality > PRODUCTION_TUNING.grip.gripReleaseCueLeadQuality)
          if (releaseWasValid) {
            const reason: GripReleaseReason = refreshedGrip.perfectRelease
              ? 'perfectRelease'
              : refreshedGrip.goodRelease
                ? 'goodRelease'
                : 'sloppyRelease'
            releaseGrip(reason, graceReleaseQuality, false)
          } else {
            state.gripMissCount += 1
            state.gripWindowWasOpen = false
            state.gripState = 'overdrive'
            state.gripReleaseReason = 'missedWindow'
            state.gripMissPulse = Math.max(state.gripMissPulse, PRODUCTION_TUNING.grip.gripMissCueStrength)
            state.gripReleaseGraceTimer = 0
            state.animationSnap = Math.max(state.animationSnap, 0.24)
            state.animationRecoil = Math.max(state.animationRecoil, 0.18)
            state.gripSpinSpeed = Math.min(
              PRODUCTION_TUNING.grip.gripSpinMaxSpeed,
              state.gripSpinSpeed + PRODUCTION_TUNING.grip.gripSpinMissBoost,
            )
            recordFlowGrip(state.flowMetrics, {
              time: t,
              kind: 'missedWindow',
              targetId: state.gripTargetMoteId,
              releaseQuality: refreshedGrip.releaseQuality,
              holdTime: state.gripHoldTime,
              spinSpeed: state.gripSpinSpeed,
              massMultiplier: refreshedGrip.massTransferMultiplier,
              reason: 'missedWindow',
            })
          }
        }

        if (state.gripActive) {
          const pointerOrbitIntent = clampValue(pointerTangentialIntent / 1.35, -1, 1)
          const currentOrbitSign = Math.abs(tangentialVelocity) > 0.04 ? Math.sign(tangentialVelocity) : Math.sign(state.gripSpinSpeed || 1)
          const tangentSign = Math.abs(pointerOrbitIntent) > 0.12 ? Math.sign(pointerOrbitIntent) : currentOrbitSign
          const tangentAuthority = clampValue(
            PRODUCTION_TUNING.grip.gripTangentialIntentFloor
              + Math.abs(pointerOrbitIntent) * PRODUCTION_TUNING.grip.gripOrbitControlStrength,
            0.18,
            0.96,
          )
          const entryPull = Math.max(state.gripEntryPull, state.gripLockPulse * 0.35)
          state.velocity.addScaledVector(bodyHookVector, refreshedGrip.radialPull * (1 + entryPull * 0.3) * cappedDt / CONTROLLER_PHYSICS.bodyMass)
          if (PRODUCTION_TUNING.suction.stretchSnapOrbitSuppression <= 0.5) {
            state.velocity.addScaledVector(
              swingTangentVector,
              tangentSign
                * refreshedGrip.tangentialForce
                * tangentAuthority
                * (1 - entryPull * 0.72)
                * cappedDt
                / CONTROLLER_PHYSICS.bodyMass,
            )
          }
          state.swingTension = Math.max(state.swingTension, Math.min(2.8, state.tetherStrain + state.gripDizzy * 0.38 + state.gripMissCount * 0.12))
        }
      } else {
        state.gripReleaseQueued = false
        state.gripReleaseReady = damp(state.gripReleaseReady, 0, 5.8, cappedDt)
        state.gripReleaseCue = damp(state.gripReleaseCue, 0, 5.8, cappedDt)
        state.gripReleaseReadiness = damp(state.gripReleaseReadiness, 0, 4.8, cappedDt)
        state.gripReleasePhaseQuality = damp(state.gripReleasePhaseQuality, 0, 4.8, cappedDt)
        state.gripPhysicalCue = damp(state.gripPhysicalCue, state.gripMissPulse * 0.12, 5.6, cappedDt)
        state.gripPocketBiteCue = damp(state.gripPocketBiteCue, 0, 5.2, cappedDt)
        state.gripHoseStrainCue = damp(state.gripHoseStrainCue, 0, 5.0, cappedDt)
        state.gripMouthAnticipationCue = damp(state.gripMouthAnticipationCue, 0, 5.4, cappedDt)
        state.gripDizzy = damp(state.gripDizzy, 0, 3.2, cappedDt)
        state.gripSpinSpeed = damp(state.gripSpinSpeed, 0, 3.0, cappedDt)
        state.gripMassMultiplier = damp(state.gripMassMultiplier, 1, 4.2, cappedDt)
        state.gripGlugBoost = damp(state.gripGlugBoost, 1, 4.2, cappedDt)
        if (state.gripCooldown <= 0 && (state.gripState === 'recovery' || state.gripState === 'searching' || state.gripState === 'spinout')) state.gripState = 'idle'
      }
      state.controllerReattachGrace = stickyAnchorOnly || stretchSnapNoOrbit
        ? damp(state.controllerReattachGrace, 0, 5.6, cappedDt)
        : Math.max(state.controllerReattachGrace, (pivotLocked ? pivot.reattachGrace : pivot.reattachGrace * 0.16) * 0.58)
      if (state.anchorReattachGraceTimer > 0.015) {
        const anchorGrace = state.anchorReattachGraceTimer
          / Math.max(0.001, stretchSnapPreset.reattachGraceDuration)
        state.controllerReattachGrace = Math.max(
          state.controllerReattachGrace,
          anchorGrace * (0.38 + state.anchorReattachAssistStrength * 0.34),
        )
      }
      const pullGain = (CONTROLLER_PHYSICS.tetherSpring + state.pulse * 2.1) * hook * controllerResponse.tetherPullScale * (stickyAnchorOnly ? 0.72 : swingFlow.tetherPullBoost) * cappedDt / CONTROLLER_PHYSICS.bodyMass
      if (!stickyAnchorOnly && !stretchSnapNoOrbit && stretch > -0.18) {
        state.velocity.addScaledVector(bodyHookVector, stretch * pullGain * (1 + pivot.lockStrength * 0.08))
      }
      if (pivotLocked) {
        state.velocity.addScaledVector(bodyHookVector, pivot.radialPull * cappedDt / CONTROLLER_PHYSICS.bodyMass)
      }
      const alongVelocity = state.velocity.dot(bodyHookVector)
      if (!stickyAnchorOnly) {
        state.velocity.addScaledVector(bodyHookVector, -alongVelocity * CONTROLLER_PHYSICS.tetherDamping * hook * cappedDt)
      }
      if (!stickyAnchorOnly && !stretchSnapNoOrbit && swingTangentVector.lengthSq() > 0.0001) {
        const tangentDriveScale = clampValue(1 - contactSettleControl * 0.62 + settledSealSwingReturn * 0.18, 0.12, 1)
        const tangentDrive = (pointerHookVector.dot(swingTangentVector) * 0.58 + deltaVector.dot(swingTangentVector) * 0.16) * tangentDriveScale
        state.velocity.addScaledVector(swingTangentVector, tangentDrive * hook * controllerResponse.hoseSlideScale * swingFlow.slideFreedom * (0.72 + state.bodyControl) * CONTROLLER_PHYSICS.swingDrive * contactSwingFreedom * cappedDt)
        const tangentSign = tangentialVelocity !== 0 ? Math.sign(tangentialVelocity) : pointerTangentialIntent >= 0 ? 1 : -1
        if (pivotLocked) {
          const pivotTangentFreedom = clampValue(contactSwingFreedom + pivot.snapReadiness * 0.14 + settledSealSwingReturn * 0.08, 0.08, 0.92)
          const settledPivotFreedom = pivotTangentFreedom * (1 - contactSettleControl * 0.36)
          state.velocity.addScaledVector(swingTangentVector, tangentSign * pivot.tangentialBoost * settledPivotFreedom * cappedDt / CONTROLLER_PHYSICS.bodyMass)
          state.velocity.addScaledVector(swingTangentVector, tangentialVelocity * (pivot.tangentialPreserve - 1) * 2.4 * settledPivotFreedom * cappedDt)
        }
        const carriedTangentialVelocity = state.velocity.dot(swingTangentVector)
        state.velocity.addScaledVector(swingTangentVector, tangentialVelocity * hook * (swingFlow.tangentCarry - 0.9) * 0.28 * contactSwingFreedom * cappedDt)
        state.velocity.addScaledVector(swingTangentVector, carriedTangentialVelocity * hook * (PRODUCTION_TUNING.pivot.pivotAttachVelocityRetention - 0.9) * 0.36 * contactSwingFreedom * cappedDt)
      }
      state.swingTension = damp(state.swingTension, Math.min(2.6, state.tetherStrain * 1.08 + hook * 0.28 + controllerResponse.swingSlide * 0.13 + swingFlow.anchorLoad * 0.28 + state.controllerSwingFlow * 0.16 + Math.max(0, Math.abs(stretch) - 0.08) * 0.3 + state.anchorTension * 0.72 + state.deepEmbedLockStrength * 0.14 + state.deepEmbedDepth * 0.08 + (pivotLocked ? pivot.hoseTension * 0.34 + pivot.snapReadiness * 0.18 : 0)), 8.2, cappedDt)
    } else {
      const controllerResponse = computeAnchoredControllerResponse({
        hookStrength: state.hoseHookStrength,
        tetherStrain: state.tetherStrain,
        suctionReadiness: state.suctionReadiness,
        swingTension: state.swingTension,
        bodySpeed: state.velocity.length(),
        distanceToHook: 2.2,
        pointerDown: hoseIntentActive,
        release: state.tetherRelease,
      })
      state.controllerGripQuality = damp(state.controllerGripQuality, 0, 5.4, cappedDt)
      state.controllerMouthSettle = damp(state.controllerMouthSettle, 0, 5.2, cappedDt)
      state.suctionApproachSettle = damp(state.suctionApproachSettle, 0, 8.4, cappedDt)
      state.suctionApproachPull = damp(state.suctionApproachPull, 0, 8.4, cappedDt)
      state.suctionApproachLocked = false
      state.controllerReleaseMomentum = damp(state.controllerReleaseMomentum, controllerResponse.releaseMomentum, 4.2, cappedDt)
      state.controllerSwingFlow = damp(state.controllerSwingFlow, 0, 4.8, cappedDt)
      state.controllerWinchPull = damp(state.controllerWinchPull, 0, 4.8, cappedDt)
      state.controllerReattachGrace = damp(state.controllerReattachGrace, Math.min(0.82, state.controllerReleaseMomentum * 0.64), 3.8, cappedDt)
      state.controllerAnchorLoad = damp(state.controllerAnchorLoad, 0, 4.6, cappedDt)
      state.pivotLocked = false
      state.pivotLockDuration = 0
      state.pivotAngularVelocity = damp(state.pivotAngularVelocity, 0, 5.2, cappedDt)
      state.pivotTangentialSpeed = damp(state.pivotTangentialSpeed, 0, 5.2, cappedDt)
      state.pivotRadialDistance = damp(state.pivotRadialDistance, 0, 5.2, cappedDt)
      state.pivotHoseStretchRatio = damp(state.pivotHoseStretchRatio, 0, 5.8, cappedDt)
      state.pivotTension = damp(state.pivotTension, 0, 5.8, cappedDt)
      state.pivotSnapThreshold = damp(state.pivotSnapThreshold, PRODUCTION_TUNING.pivot.snapTensionThreshold, 4.4, cappedDt)
      state.pivotSwingAssist = damp(state.pivotSwingAssist, 0, 5.8, cappedDt)
      state.pivotHoseVisualStretch = damp(state.pivotHoseVisualStretch, 0, 6.2, cappedDt)
      state.pivotHoseThinning = damp(state.pivotHoseThinning, 0, 6.2, cappedDt)
      state.pivotHoseWobble = damp(state.pivotHoseWobble, 0, 6.2, cappedDt)
      state.pivotSnapReadiness = damp(state.pivotSnapReadiness, 0, 6.2, cappedDt)
      state.tetherRestLength = damp(
        state.tetherRestLength,
        PRODUCTION_TUNING.hose.hoseRestLength,
        3.2,
        cappedDt,
      )
      state.tetherStrain = damp(state.tetherStrain, 0, 5.6, cappedDt)
      state.anchorStretch = damp(state.anchorStretch, 0, 5.4, cappedDt)
      state.anchorTension = damp(state.anchorTension, 0, 6.0, cappedDt)
      state.anchorSpringForce = damp(state.anchorSpringForce, 0, 6.0, cappedDt)
      state.anchorDampingForce = damp(state.anchorDampingForce, 0, 6.0, cappedDt)
      state.anchorLateralDamping = damp(state.anchorLateralDamping, 0, 6.0, cappedDt)
      state.anchorRadialVelocity = damp(state.anchorRadialVelocity, 0, 6.0, cappedDt)
      state.anchorTangentVelocity = damp(state.anchorTangentVelocity, 0, 6.0, cappedDt)
      state.suctionReadiness = damp(state.suctionReadiness, 0, 5.4, cappedDt)
      state.swingTension = damp(state.swingTension, 0, 6.2, cappedDt)
    }
    state.tetherRelease = damp(state.tetherRelease, 0, 3.0, cappedDt)
    state.swingEnergy = damp(
      state.swingEnergy,
		      Math.min(2.65, state.swingTension + state.velocity.length() * 0.055 + state.hoseHookStrength * 0.22 + state.anchorTension * 0.16 + state.tetherRelease * 0.3 + state.controllerSwingFlow * 0.22 + state.controllerReattachGrace * 0.12 + state.pivotTension * 0.24 + state.pivotHoseStretchRatio * 0.16 + state.gripDizzy * 0.18 + state.gripReleaseReady * 0.16 + state.gripReleaseCue * 0.12 + state.gripPhysicalCue * 0.12 + state.gripHoseStrainCue * 0.16 + state.gripMissPulse * 0.1),
      5.2,
      cappedDt,
    )
    const contactWildnessCalm = clampValue(
      Math.max(
        state.suctionState === 'sealed' ? 1 : 0,
        state.suctionState === 'contact' ? 0.82 : 0,
        state.suctionState === 'prePull' ? 0.46 : 0,
        state.suctionState === 'seeking' ? 0.24 : 0,
        state.mouthSurfaceContactState === 'embedded' ? 0.9 : 0,
        state.mouthSurfaceContactState === 'touching' ? 0.72 : 0,
        state.mouthSurfaceCompression * 0.62,
        state.mouthSealRing * 0.5,
        state.suctionReadiness * 0.36,
        state.slimeContactReadiness * 0.56,
        state.slimeMagneticPull * 0.42,
        contactCaptureSteady,
        state.controllerMouthSettle * 0.58,
        state.suctionApproachPull * 0.72,
        state.hoseContactSettle * 2.2,
      ),
      0,
      1,
    )
    const hoseWildnessTarget = 0.34 + state.pulse * 0.14 + state.hoseHookStrength * 0.24 + state.swingEnergy * 0.22 + state.tetherStrain * 0.12 + state.anchorTension * 0.08 + state.anchorPopJuice * 0.12 + state.anchorReattachCatchPulse * 0.18 + state.hoseBlowPressure * 0.34 + state.hoseBlowReleasePulse * 0.22 + state.controllerGripQuality * 0.08 + state.controllerSwingFlow * 0.1 + state.controllerWinchPull * 0.08 + state.controllerReleaseMomentum * 0.12 + state.tetherRelease * 0.09 + state.pivotHoseWobble * 0.28 + state.pivotHoseVisualStretch * 0.08 + state.pivotSnapReadiness * 0.13 + state.gripReleaseReady * 0.18 + state.gripReleaseCue * 0.14 + state.gripPhysicalCue * 0.1 + state.gripHoseStrainCue * 0.18 + state.gripMissPulse * 0.16 + state.gripDizzy * 0.2 + state.gripSpinoutPulse * 0.26 + state.glugPulse * 0.18 + state.glugEventStrength * 0.14 + state.deepEmbedDepth * 0.14 + state.deepEmbedPocketPulse * 0.08 + state.levelCompletionHoseWobble * 0.34 + state.bagPulse * 0.08 + state.slimeMagneticPull * 0.08 + state.slimeOrganicHold * 0.1 + state.flash * 0.18
    const hoseAimNoiseCalm = hoseIntentActive
      ? PRODUCTION_TUNING.movement.hoseAimNoiseCalm * clampValue(0.82 + (1 - state.hoseAimStability) * 0.18, 0, 1)
      : 0
    const hoseWildnessFloor = PRODUCTION_TUNING.movement.hoseContactWildnessFloor
      + (0.18 - PRODUCTION_TUNING.movement.hoseContactWildnessFloor) * (1 - contactWildnessCalm)
    state.hoseWildness = damp(
      state.hoseWildness,
      Math.max(
        hoseWildnessFloor,
        hoseWildnessTarget
          * (1 - contactWildnessCalm * PRODUCTION_TUNING.movement.hoseContactWildnessCalm)
          * (1 - hoseAimNoiseCalm),
      ),
      contactWildnessCalm > 0.2 ? 9.4 : 5.6,
      cappedDt,
    )

    const dampingFloor = hook > 0.05
      ? PRODUCTION_TUNING.pivot.attachedDamping
      : PRODUCTION_TUNING.pivot.freeDamping
    const contactSteadyDamping = clampValue(
      hook
        * Math.max(
          state.controllerMouthSettle * 0.74,
          state.suctionApproachPull * 0.54,
          contactCaptureSteady * 0.9,
          state.deepEmbedLockStrength * 0.24,
          state.slimeOrganicHold * 0.22,
        )
        * (1 - state.pivotSnapReadiness * 0.46),
      0,
      1,
    )
    const bodyChaosStability = clampValue(
      Math.max(
        contactSteadyDamping,
        hook
          * Math.max(
            state.controllerMouthSettle * 0.68,
            state.suctionApproachPull * 0.62,
            contactCaptureSteady * 0.78,
            state.deepEmbedLockStrength * 0.28,
            state.slimeOrganicHold * 0.26,
          ),
      )
        * (1 - state.pivotSnapReadiness * 0.34),
      0,
      1,
    )
	    const bodyDamping = Math.max(
	      dampingFloor,
	      PRODUCTION_TUNING.movement.bodyDamping
	        - hook * 1.72
	        - state.tetherRelease * CONTROLLER_PHYSICS.releaseDampingRelief
        - state.controllerReleaseMomentum * 0.42
        - state.controllerSwingFlow * 0.72
        - state.controllerReattachGrace * 0.36
        - state.pivotTension * 0.52
        - state.pivotSwingAssist * 0.72
        - state.pivotSnapReadiness * 0.34
      - (state.gripActive ? 0.62 : 0),
    ) + PRODUCTION_TUNING.movement.contactSteadyDamping * contactSteadyDamping
    state.velocity.multiplyScalar(Math.exp(-bodyDamping * cappedDt))
    if (bodyChaosStability > 0.015 && hook > 0.015 && !state.gripActive && !stickyAnchorOnly) {
      const radialSpeed = state.velocity.dot(bodyHookVector)
      candidateDirectionVector.copy(state.velocity).addScaledVector(bodyHookVector, -radialSpeed)
      if (candidateDirectionVector.lengthSq() > 0.0001) {
        const lateralCalm = 1 - Math.exp(
          -(
            4.4
            + state.controllerMouthSettle * 4.8
            + state.suctionApproachPull * 3.2
            + state.deepEmbedLockStrength * 1.2
          )
          * bodyChaosStability
          * cappedDt,
        )
        state.velocity.addScaledVector(candidateDirectionVector, -lateralCalm)
      }
    }
    const speedLimit = Math.max(
      1.32,
      PRODUCTION_TUNING.movement.maxSpeed
        + state.pivotSnapReadiness * 0.46
        + state.tetherRelease * 0.34
        + state.gripDizzy * 0.28
        + state.gripReleaseReady * 0.2
        - (stickyAnchorOnly ? state.anchorTension * PRODUCTION_TUNING.suction.tensionSpeedPenalty : 0)
        - bodyChaosStability * 0.24,
    )
    const currentVehicleSpeed = state.velocity.length()
    if (currentVehicleSpeed > speedLimit) {
      state.velocity.multiplyScalar(speedLimit / currentVehicleSpeed)
    }
    if (!hasBodyInput) {
      if (state.velocity.lengthSq() < 0.0025) state.velocity.set(0, 0, 0)
    }
    state.externalForces.copy(state.velocity).sub(state.baseVelocity)
    if (cappedDt > 0.0001) state.externalForces.multiplyScalar(1 / cappedDt)
    if (hook > 0.015 || state.suctionApproachPull > 0.015 || state.suctionState !== 'free') {
      state.suctionForce.copy(state.externalForces)
    } else {
      state.suctionForce.set(0, 0, 0)
    }
    arcadeVelocityVector.copy(state.velocity)
    arcadeVelocityVector.y = 0
    const planarSpeed = arcadeVelocityVector.length()
    if (planarSpeed > 0.001) {
      state.movementVelocityDirection = yawForRenderedVacuumForward(arcadeVelocityVector)
      const driftAxis = hasBodyInput && arcadeInputVector.lengthSq() > 0.0001
        ? arcadeInputVector
        : state.forward
      const towardDriftAxis = arcadeVelocityVector.dot(driftAxis)
      arcadeLateralVector.copy(arcadeVelocityVector).addScaledVector(driftAxis, -towardDriftAxis)
      state.movementLateralSpeed = damp(state.movementLateralSpeed, arcadeLateralVector.length(), 9.2, cappedDt)
      state.movementDriftFactor = damp(
        state.movementDriftFactor,
        clampValue(arcadeLateralVector.length() / Math.max(0.001, planarSpeed), 0, 1),
        8.4,
        cappedDt,
      )
      const forwardAlignment = clampValue(state.forward.dot(arcadeVelocityVector) / planarSpeed, -1, 1)
      state.movementFacingVelocityAngle = damp(
        state.movementFacingVelocityAngle,
        Math.acos(forwardAlignment),
        8.0,
        cappedDt,
      )
      rightVector.set(-state.forward.z, 0, state.forward.x)
      if (rightVector.lengthSq() < 0.0001) rightVector.set(1, 0, 0)
      rightVector.normalize()
      const signedSideSpeed = arcadeVelocityVector.dot(rightVector)
      state.movementLean = damp(
        state.movementLean,
        clampValue(-signedSideSpeed / Math.max(0.001, PRODUCTION_TUNING.movement.maxSpeed), -1, 1)
          * PRODUCTION_TUNING.movement.leanStrength,
        9.5,
        cappedDt,
      )
    } else {
      state.movementLateralSpeed = damp(state.movementLateralSpeed, 0, 8.0, cappedDt)
      state.movementDriftFactor = damp(state.movementDriftFactor, 0, 8.0, cappedDt)
      state.movementFacingVelocityAngle = damp(state.movementFacingVelocityAngle, 0, 8.0, cappedDt)
      state.movementLean = damp(state.movementLean, 0, 8.0, cappedDt)
    }
    const accelerationMagnitude = frameStartVelocityVector.distanceTo(state.velocity) / Math.max(0.0001, cappedDt)
    state.movementAcceleration = damp(state.movementAcceleration, accelerationMagnitude, 10.2, cappedDt)
    state.movementInputChangeBoost = damp(state.movementInputChangeBoost, sharpInputChange, sharpInputChange > state.movementInputChangeBoost ? 12 : 5.2, cappedDt)
    state.movementSkid = damp(
      state.movementSkid,
      smooth01((planarSpeed - PRODUCTION_TUNING.movement.skidSpeedThreshold) / 1.8)
        * smooth01((state.movementDriftFactor - PRODUCTION_TUNING.movement.skidDriftThreshold) / 0.46),
      8.2,
      cappedDt,
    )
    state.movementSquash = damp(
      state.movementSquash,
      clampValue(
        accelerationMagnitude / Math.max(0.001, PRODUCTION_TUNING.movement.acceleration * 1.4),
        0,
        1,
      ) * PRODUCTION_TUNING.movement.squashStrength,
      9.6,
      cappedDt,
    )
    state.movementWobble = damp(
      state.movementWobble,
      Math.max(sharpInputChange, state.movementSkid * 0.42) * PRODUCTION_TUNING.movement.wobbleStrength,
      6.8,
      cappedDt,
    )
    if (state.pivotLocked) {
      const clampedVehicleSpeed = state.velocity.length()
      state.pivotTangentialSpeed = Math.min(state.pivotTangentialSpeed, clampedVehicleSpeed)
      if (state.pivotRadialDistance > 0.001) {
        const angularSign = state.pivotAngularVelocity >= 0 ? 1 : -1
        state.pivotAngularVelocity = angularSign * Math.min(
          Math.abs(state.pivotAngularVelocity),
          clampedVehicleSpeed / state.pivotRadialDistance,
        )
      }
    }
    state.position.addScaledVector(state.velocity, cappedDt)
    clampWorld(state.position)

    const bodyFacingActive = hasBodyInput || state.velocity.lengthSq() > 0.01
    if (hasBodyInput) {
      candidateDirectionVector.copy(state.velocity)
      candidateDirectionVector.y = 0
      if (candidateDirectionVector.lengthSq() > 0.01) {
        candidateDirectionVector.normalize()
        const velocityFacingBlend = clampValue(
          PRODUCTION_TUNING.movement.velocityFacingBlend - state.movementInputChangeBoost * 0.22,
          0.35,
          0.82,
        )
        candidateDirectionVector.multiplyScalar(velocityFacingBlend)
        arcadeDesiredVector.copy(arcadeInputVector).multiplyScalar(1 - velocityFacingBlend)
        candidateDirectionVector.add(arcadeDesiredVector)
      } else {
        candidateDirectionVector.copy(arcadeInputVector)
      }
      if (candidateDirectionVector.lengthSq() > 0.0001) {
        candidateDirectionVector.normalize()
        state.yaw = dampAngle(
          state.yaw,
          yawForRenderedVacuumForward(candidateDirectionVector),
          PRODUCTION_TUNING.movement.keyboardTurnRate
            * (1 + Math.min(0.32, state.movementInputChangeBoost * 0.18)),
          cappedDt,
        )
      }
    } else if (bodyFacingActive) {
      candidateDirectionVector.copy(state.velocity)
      candidateDirectionVector.y = 0
      if (candidateDirectionVector.lengthSq() > 0.0001) {
        candidateDirectionVector.normalize()
        state.yaw = dampAngle(
          state.yaw,
          yawForRenderedVacuumForward(candidateDirectionVector),
          hook > 0.08 || state.suctionApproachSettle > 0.1 ? 2.8 : 3.6,
          cappedDt,
        )
      }
    } else if (state.gripActive && hasBodyInput) {
      snapReleaseVector.copy(state.position).sub(state.gripLockPoint)
      snapReleaseVector.y = 0
      if (snapReleaseVector.lengthSq() > 0.0001) snapReleaseVector.normalize()
      snapTangentVector.set(snapReleaseVector.z, 0, -snapReleaseVector.x)
      if (snapTangentVector.lengthSq() > 0.0001) snapTangentVector.normalize()
      const tangentYaw = yawForRenderedVacuumForward(snapTangentVector)
      state.yaw = dampAngle(state.yaw, tangentYaw + Math.sin(state.gripSpinAngle) * 0.18, 10.5, cappedDt)
    }
      const cameraReadableYawNeeded = hoseIntentActive
        || hook > 0.08
        || state.suctionApproachSettle > 0.1
        || state.suctionState === 'sealed'
	    if (cameraReadableYawNeeded) {
	      const cameraReadableLimit = hoseIntentActive
	        ? PRODUCTION_TUNING.movement.cameraReadableAimYawLimit
	        : hook > 0.08 || state.suctionApproachSettle > 0.1 || state.suctionState === 'sealed'
	          ? PRODUCTION_TUNING.movement.cameraReadableHookedYawLimit
	          : PRODUCTION_TUNING.movement.cameraReadableIdleYawLimit
	      const cameraReadableBias = hoseIntentActive
	        ? PRODUCTION_TUNING.movement.cameraReadableAimBias
	        : hook > 0.08 || state.suctionApproachSettle > 0.1 || state.suctionState === 'sealed'
	          ? PRODUCTION_TUNING.movement.cameraReadableHookedBias
	          : PRODUCTION_TUNING.movement.cameraReadableIdleBias
	      const cameraReadableYaw = clampAngleAround(
	        state.yaw,
	        PRODUCTION_TUNING.movement.cameraReadableYawCenter,
	        cameraReadableLimit,
	      )
	      if (Math.abs(Math.atan2(Math.sin(cameraReadableYaw - state.yaw), Math.cos(cameraReadableYaw - state.yaw))) > 0.002) {
	        state.yaw = dampAngle(state.yaw, cameraReadableYaw, cameraReadableBias, cappedDt)
	      }
	      state.yaw = clampAngleAround(
	        state.yaw,
	        PRODUCTION_TUNING.movement.cameraReadableYawCenter,
	        Math.min(
	          Math.PI / 2 - 0.04,
	          cameraReadableLimit + PRODUCTION_TUNING.movement.cameraReadableHardClampPadding,
	        ),
	      )
	    }

	    setRenderedVacuumForwardFromYaw(state.forward, state.yaw)
    hoseReachBodyVector.copy(state.position).sub(frameStartPositionVector)
    if (!state.hoseReachLockedToAnchor && hoseReachBodyVector.lengthSq() > 0.000001) {
      state.actualHoseMouthPosition.add(hoseReachBodyVector)
    }
    updateHoseCursorReach(state, 0, hoseIntentActive)
    state.lastBodyInputX = hasBodyInput ? arcadeInputVector.x : 0
    state.lastBodyInputZ = hasBodyInput ? arcadeInputVector.z : 0
    state.lastBodyInputActive = hasBodyInput
    state.previousVelocity.copy(state.velocity)
    state.pulse = damp(state.pulse, Math.max(hoseIntentActive ? 1.2 : 0.82, 0.96 + state.slimeSealStrength * 0.42 + state.hoseBlowPressure * PRODUCTION_TUNING.blow.mouthPulse + state.levelCompletionPulse * 0.18 + state.gripReleaseReady * 0.18 + state.gripMouthAnticipationCue * 0.16 + state.gripDizzy * 0.14), 6.5, cappedDt)
    state.hoseBlowReleasePulse = damp(state.hoseBlowReleasePulse, 0, 7.8, cappedDt)
    state.recoil = damp(state.recoil, 0, 9.5, cappedDt)
    state.flash = damp(state.flash, 0, 8.8, cappedDt)
    state.gulpAge += cappedDt
	    state.gulpFlow = damp(state.gulpFlow, 0, 4.2, cappedDt)
	    state.glugPulse = damp(state.glugPulse, 0, 8.5, cappedDt)
	    state.glugMassFlow = damp(state.glugMassFlow, 0, 6.2, cappedDt)
	    state.glugLastAge = state.glugLastAt > -900 ? t - state.glugLastAt : 999
	    state.glugEventStrength = damp(state.glugEventStrength, 0, 7.4, cappedDt)
	    state.glugEventMass = damp(state.glugEventMass, 0, 6.2, cappedDt)
	    state.glugFailedStrength = damp(state.glugFailedStrength, 0, 5.8, cappedDt)
	    state.deepEmbedDepth = damp(state.deepEmbedDepth, 0, PRODUCTION_TUNING.embed.embedDepthFallSpeed, cappedDt)
	    state.deepEmbedLockStrength = damp(state.deepEmbedLockStrength, 0, 4.4, cappedDt)
	    state.deepEmbedAnglePenalty = damp(state.deepEmbedAnglePenalty, 0, 4.6, cappedDt)
	    state.deepEmbedTensionPenalty = damp(state.deepEmbedTensionPenalty, 0, 4.6, cappedDt)
	    state.deepEmbedPocketPulse = damp(state.deepEmbedPocketPulse, 0, 6.6, cappedDt)
	    state.deepEmbedRimOcclusion = damp(state.deepEmbedRimOcclusion, 0, 4.6, cappedDt)
	    state.deepEmbedFleckBurst = damp(state.deepEmbedFleckBurst, 0, 5.6, cappedDt)
	    if (state.suctionState === 'sealed' && state.sealTargetMoteId >= 0) {
	      const sealedEmbedFloor = PRODUCTION_TUNING.embed.embedDepthMax * clampValue(
	        0.28 + state.anchorTension * 0.12 + state.anchorSealSnapPulse * 0.1,
	        0.28,
	        0.54,
	      )
	      state.deepEmbedDepth = Math.max(state.deepEmbedDepth, sealedEmbedFloor)
	      state.deepEmbedLockStrength = Math.max(state.deepEmbedLockStrength, 0.48 + state.anchorTension * 0.22 + state.anchorSealSnapPulse * 0.18)
	      state.deepEmbedPocketPulse = Math.max(state.deepEmbedPocketPulse, 0.44 + state.anchorTension * 0.22)
	      state.deepEmbedRimOcclusion = Math.max(state.deepEmbedRimOcclusion, 0.38 + state.anchorTension * 0.18)
	      state.deepEmbedState = 'embed-lock'
	    }
	    if (state.deepEmbedState === 'pop-out-snap' && state.deepEmbedFleckBurst < 0.035 && state.snapBreakPulse < 0.08) {
	      state.deepEmbedState = 'recovery'
	    } else if (state.deepEmbedState === 'recovery' && state.postSnapReattachTimer <= 0.015 && state.deepEmbedDepth < 0.02) {
	      state.deepEmbedState = 'searching'
	      state.deepEmbedReleaseReason = 'none'
	    }
	    if (state.deepEmbedDepth < 0.02 && state.deepEmbedState !== 'pop-out-snap' && state.deepEmbedState !== 'recovery') {
	      state.deepEmbedState = 'searching'
	      state.deepEmbedReleaseReason = 'none'
	      state.deepEmbedGlugCount = 0
	      state.deepEmbedMassTransferred = 0
	      state.deepEmbedSnapThreshold = PRODUCTION_TUNING.embed.embedSnapThreshold
	    }
	    state.suctionContactGlugTimer = Math.max(0, state.suctionContactGlugTimer - cappedDt)
	    state.slimeCompletionNearEmpty = damp(state.slimeCompletionNearEmpty, 0, 4.6, cappedDt)
    state.slimeCompletionFinalStrand = damp(state.slimeCompletionFinalStrand, 0, 4.8, cappedDt)
    state.slimeCompletionFinalGlug = damp(state.slimeCompletionFinalGlug, 0, 5.8, cappedDt)
    state.slimeCompletionCleanup = damp(state.slimeCompletionCleanup, 0, 3.4, cappedDt)
    state.slimeCompletionChainReady = damp(state.slimeCompletionChainReady, 0, 3.8, cappedDt)
    if (state.bagPulseDelayTimer > 0) state.bagPulseDelayTimer = Math.max(0, state.bagPulseDelayTimer - cappedDt)
    if (state.bagPulseDelayTimer <= 0 && state.bagQueuedPulse > 0.001) {
      state.bagPulse = Math.min(2.6, state.bagPulse + state.bagQueuedPulse)
      state.bagWobble = Math.min(2.05, Math.max(state.bagWobble, state.bagQueuedWobble))
      state.bagBeauty = Math.min(2.05, Math.max(state.bagBeauty, state.bagQueuedBeauty))
      state.bagFullPulse = Math.min(2.1, Math.max(state.bagFullPulse, state.bagQueuedFullPulse))
      state.animationBag = Math.max(state.animationBag, 0.46 + state.bagQueuedPulse * 0.46)
      triggerBagInkShock(
        state,
        state.bagQueuedPulse * 0.74 + state.bagQueuedWobble * 0.34 + state.bagQueuedFullPulse * 0.28,
      )
      state.bagQueuedPulse = 0
      state.bagQueuedWobble = 0
      state.bagQueuedBeauty = 0
      state.bagQueuedFullPulse = 0
    }
    state.slimeComboTimer = Math.max(0, state.slimeComboTimer - cappedDt)
    state.slimeComboLabelAge = Math.min(99, state.slimeComboLabelAge + cappedDt)
    state.slimeComboPulse = damp(state.slimeComboPulse, 0, PRODUCTION_TUNING.bag.comboDamping, cappedDt)
    state.slimeComboBurst = damp(state.slimeComboBurst, 0, PRODUCTION_TUNING.bag.comboDamping * 1.08, cappedDt)
    state.slimeComboShockwave = damp(state.slimeComboShockwave, 0, PRODUCTION_TUNING.bag.comboDamping * 1.18, cappedDt)
    state.slimeComboShockwaveAge = Math.min(99, state.slimeComboShockwaveAge + cappedDt)
    if (state.slimeComboTimer <= 0 && state.slimeComboPulse < 0.035 && state.slimeComboBurst < 0.035) {
      state.slimeComboCount = 0
      state.slimeComboLastMoteId = -1
      state.slimeComboLastPileIndex = -1
    }
    state.bagPulse = damp(state.bagPulse, 0, PRODUCTION_TUNING.bag.bagPulseDecay, cappedDt)
    state.bagOutlineShock = damp(state.bagOutlineShock, 0, PRODUCTION_TUNING.bag.bagOutlineShockDecay, cappedDt)
    state.bagShockwave = damp(state.bagShockwave, 0, PRODUCTION_TUNING.bag.bagShockwaveDecay, cappedDt)
    state.bagShockwaveAge = Math.min(99, state.bagShockwaveAge + cappedDt)
    state.bagPressure = damp(
      state.bagPressure,
      state.bagFillNormalized * PRODUCTION_TUNING.bag.bagPressureByFill + state.bagFullPulse * 0.34 + state.bagReactionStrength * 0.13,
      1.05,
      cappedDt,
    )
    state.bagBeauty = damp(
      state.bagBeauty,
      Math.min(2.05, state.bagFillNormalized * PRODUCTION_TUNING.bag.bagColourIntensityByFill + state.bagPressure * 0.44 + state.bagSlimeChroma * 0.22 + state.bagGlow * 0.16),
      0.9,
      cappedDt,
    )
	    state.bagWobble = damp(state.bagWobble, Math.max(0, state.bagPressure - 0.45) * 0.2, PRODUCTION_TUNING.bag.bagWobbleDamping, cappedDt)
	    state.bagFullPulse = damp(state.bagFullPulse, 0, 3.8, cappedDt)
	    state.bagSlimeChroma = damp(state.bagSlimeChroma, Math.min(2.25, state.bagBeauty * 0.86 + state.bagFillNormalized * 0.36 + state.bagGlow * 0.16), 0.78, cappedDt)
	    state.bagSlimeTintPulse = damp(state.bagSlimeTintPulse, 0, 5.8, cappedDt)
	    state.bagSlimeTintStrength = damp(
	      state.bagSlimeTintStrength,
	      Math.min(2.15, state.bagFillNormalized * 0.9 + state.bagBeauty * 0.34 + state.bagSlimeTintPulse * 0.42 + state.bagSlimeChroma * 0.16),
	      1.22,
	      cappedDt,
	    )
	    state.bagSlimeColor.lerp(
	      state.bagSlimeColorTarget,
	      1 - Math.exp(-(3.2 + state.bagSlimeTintPulse * 4.2) * cappedDt),
	    )
	    state.bagReactionStrength = damp(state.bagReactionStrength, 0, 4.6, cappedDt)
    state.bagNonUniformBulge = damp(state.bagNonUniformBulge, state.bagFillNormalized * 0.16 + state.bagPressure * 0.15 + state.bagReactionStrength * 0.07, 2.2, cappedDt)
    state.bagGlow = damp(state.bagGlow, state.bagFillNormalized * PRODUCTION_TUNING.bag.bagGlowByFill + state.bagBeauty * 0.24 + state.bagSlimeChroma * 0.08, 0.9, cappedDt)
    state.bagInternalMotion = damp(
      state.bagInternalMotion,
      state.bagFillNormalized * PRODUCTION_TUNING.bag.bagInternalMotionSpeed + state.glugMassFlow * 0.24 + state.bagPulse * 0.08,
      0.82,
      cappedDt,
    )
    state.snapBreakPulse = damp(state.snapBreakPulse, 0, 6.4, cappedDt)
    state.bagFillTarget = Math.min(PRODUCTION_TUNING.bag.bagMaxScale, Math.max(PRODUCTION_TUNING.bag.bagBaseScale, state.bagFillTarget))
    state.bagFill = damp(state.bagFill, state.bagFillTarget, state.bagFillTarget > state.bagFill ? PRODUCTION_TUNING.bag.bagFillSmoothing : 0.16, cappedDt)
    const comboScaleBoost = Math.min(
      PRODUCTION_TUNING.bag.comboBagScaleBoost,
      (state.slimeComboBurst * 0.1 + state.slimeComboPulse * 0.044 + state.slimeComboShockwave * 0.032)
        * smooth01((state.slimeComboCount - PRODUCTION_TUNING.bag.comboMinStreak + 1) / 2),
    )
    state.bagScaleX = damp(
      state.bagScaleX,
      Math.min(PRODUCTION_TUNING.bag.bagMaxSize + comboScaleBoost, 1 + state.bagFillNormalized * 0.18 + state.bagNonUniformBulge * 0.26 + state.bagPulse * 0.034 + comboScaleBoost * 0.9),
      2.2,
      cappedDt,
    )
    state.bagScaleY = damp(
      state.bagScaleY,
      Math.min(PRODUCTION_TUNING.bag.bagMaxSize * 1.1 + comboScaleBoost * 1.2, 1 + state.bagFillNormalized * 0.24 + state.bagPressure * 0.06 + state.bagPulse * 0.046 + comboScaleBoost * 1.16),
      2.2,
      cappedDt,
    )
    state.bagScaleZ = damp(
      state.bagScaleZ,
      Math.min(PRODUCTION_TUNING.bag.bagMaxSize + comboScaleBoost, 1 + state.bagFillNormalized * 0.16 + state.bagNonUniformBulge * 0.23 + state.bagWobble * 0.028 + comboScaleBoost * 0.82),
      2.2,
      cappedDt,
    )
    updateStretchSnapGrappleState(state, t, cappedDt)
    state.stretchSnapCameraImpulse = damp(state.stretchSnapCameraImpulse, 0, 5.2, cappedDt)
    state.stretchSnapAudioIntensity = damp(state.stretchSnapAudioIntensity, 0, 6.2, cappedDt)
    if (state.stretchSnapAudioIntensity < 0.012 && t - state.stretchSnapLastAudioAt > 0.28) {
      state.stretchSnapAudioCue = 'none'
    }
    state.bagNearFull = state.bagFillNormalized >= PRODUCTION_TUNING.bag.bagFullThreshold || state.bagFill >= 1.12

    state.frameMs = cappedDt * 1000
    state.maxFrameMs = Math.max(state.maxFrameMs * 0.96, state.frameMs)
    state.fps = 1 / Math.max(cappedDt, 0.0001)
    const flowBodySpeed = state.velocity.length()
    updateFlowMetrics(state.flowMetrics, {
      time: t,
      dt: cappedDt,
      attached: state.sealTargetMoteId >= 0 && state.hoseHookStrength > 0.12,
      targetId: state.sealTargetMoteId >= 0 ? state.sealTargetMoteId : null,
      speed: flowBodySpeed,
      sealStrength: Math.max(state.slimeSealStrength, state.suctionContactSealQuality),
      tension: Math.max(state.tetherStrain, state.swingTension, state.slimeSnapBondTension, state.pivotTension),
      contactAngle: state.deepEmbedAnglePenalty,
      slimeMassRemaining: state.suctionContactCurrentMass,
      bagFillAmount: state.bagFillAmount,
      bagFillNormalized: state.bagFillNormalized,
      embedActive: state.deepEmbedDepth > 0.08 || state.deepEmbedState === 'deep-embed' || state.deepEmbedState === 'embed-lock',
    })
    const flowMetricsSnapshot = getFlowDebugSnapshot(state.flowMetrics)
    const flowSummary = getFlowSessionSummary(state.flowMetrics)
    const activeStretchSnapPreset = getStretchSnapPresetTuning(state)
    const arenaLayoutDebug = getArenaLayoutDebug(state.devMode)
    const levelBackgroundSignal = applyProgressBackgroundColor(state, t, progressBackgroundStatsColor)
    candidateDirectionVector.copy(state.slimeHookPoint).sub(state.mouth)
    const mouthToHookDistance = candidateDirectionVector.length()
    const mouthForwardToHookAlignment = mouthToHookDistance > 0.0001
      ? state.mouthForward.dot(candidateDirectionVector.multiplyScalar(1 / mouthToHookDistance))
      : 1

    window.__VACUUM_LAB_STATS__ = undefined
    window.__LIQUID_LAB_STATS__ = undefined
    window.__EXPERIMENT_LAB_FLOW_SUMMARY__ = flowSummary
    window.__EXPERIMENT_LAB_STATS__ = {
      mode: 'experimental-lab',
      devMode: state.devMode,
      reattachChainVariant: state.reattachChainVariant,
      stretchSnapPreset: state.stretchSnapPreset,
      stretchSnapPresetValues: activeStretchSnapPreset,
      experimentOnly: true,
      vacuumCloneOf: '/vacuum-lab',
      vacuumPrototypeLocked: true,
      vacuumOnly: true,
      slimePrototypeLocked: true,
      slimePrototypeRoute: '/slime-prototype',
      gameplayPressure: isFirstLevelMode(state.devMode),
	      suctionModel: 'elastic-push-pull-radial-spring-latch-stretch-snap-v33',
	      suctionLatchAssistModel: 'all-size-edge-contact-latch-grab-v1',
	      suctionLatchContactRadius: PRODUCTION_TUNING.suction.physicalContactGraceDistance,
	      suctionLatchSurfaceLockReach: PRODUCTION_TUNING.suction.pileSurfaceLockReach,
	      suctionLatchStickyThreshold: PRODUCTION_TUNING.suction.stickySealStrengthThreshold,
	      suctionLatchPivotStrength: PRODUCTION_TUNING.suction.latchInfluenceTurnStrength,
	      suctionLatchEdgeVisibleFloor: EASY_SUCTION_TUNING.visibleFloor,
	      visualModel: 'bright-pastel-toon-hero-clarity-v1',
	      slimeVacuumInteraction: 'organic-slime-suction-bridge-glug-strain-snap-v34',
      allVisibleSlimeVacuumableModel: PRODUCTION_TUNING.suction.allVisibleSlimeVacuumableModel,
      slimeVacuumableVisibleCount: state.slimeVacuumableVisibleCount,
      slimeVacuumableTinyCount: state.slimeVacuumableTinyCount,
      slimeVacuumableStrandedCount: state.slimeVacuumableStrandedCount,
      slimeGameplayVisibleMass: metric(state.slimeGameplayVisibleMass, 3),
      slimeVisualEffectResidueCount: state.slimeVisualEffectResidueCount,
      arenaModel: arenaLayoutDebug.arenaModel,
      slimeLayoutModel: arenaLayoutDebug.slimeLayoutModel,
      arenaRadius: metric(arenaLayoutDebug.radius, 2),
      arenaPlayableRadius: metric(arenaLayoutDebug.playableRadius, 2),
      arenaPileCount: arenaLayoutDebug.pileCount,
      arenaClusterCount: arenaLayoutDebug.clusterCount,
      arenaClusterDensity: metric(arenaLayoutDebug.clusterDensity, 2),
      arenaIsolatedSlimeCount: arenaLayoutDebug.isolatedCount,
      arenaNearestSpacingMin: metric(arenaLayoutDebug.nearestSpacingMin, 2),
      arenaNearestSpacingMax: metric(arenaLayoutDebug.nearestSpacingMax, 2),
      arenaNearestSpacingAvg: metric(arenaLayoutDebug.nearestSpacingAvg, 2),
      arenaMinimumSlimeSpacing: metric(arenaLayoutDebug.minimumSlimeSpacing, 2),
      arenaMaximumSlimeSpacing: metric(arenaLayoutDebug.maximumSlimeSpacing, 2),
      arenaClusterToClusterDistanceBias: metric(arenaLayoutDebug.clusterToClusterDistanceBias, 2),
      arenaCenterPlacementBias: metric(arenaLayoutDebug.centerPlacementBias, 2),
      arenaOuterRingPlacementBias: metric(arenaLayoutDebug.outerRingPlacementBias, 2),
      vacuumMounted: true,
      testMoteCount: isMovementLabMode(state.devMode) ? 0 : MOTE_COUNT,
      testMoteStyle: isMovementLabMode(state.devMode)
        ? 'slime-disabled-empty-body-drift-lab'
        : 'native-jelly-wax-technicolor-slurpable-slime-piles',
      mergeModel: 'organic-reference-soft-congeal-seams-v7',
      slimeMaterialModel: 'experiment-native-toon-organic-slime-behaviour-v6',
      slimeColorModel: 'living-organic-pulse-technicolour-v5',
	      vehiclePhysicsModel: 'floaty-ice-drift-body-elastic-suction-stretch-snap-fling-v20',
	      slimePhysicsModel: 'viscoelastic-jelly-wax-organic-behaviour-v22',
      bagRewardModel: 'combo-streak-bag-boogie-shock-v22',
      comboModel: 'slime-streak-combo-bag-boogie-v1',
      flowMetricsModel: 'hidden-flow-measurement-v21',
      levelModel: 'linear-battle-slime-tide-v52',
      defeatFinaleModel: 'ninety-nine-coverage-slime-only-loss-v51',
      animationModel: 'aaa-cartoon-state-language-v14',
      completionPayoffModel: 'groovy-technicolor-disco-payoff-v17',
      levelBackgroundModel: 'progress-reactive-psychedelic-throb-v1',
      dpr: VACUUM_DPR,
      slimeSealStrength: metric(state.slimeSealStrength, 3),
      slimeSealAge: metric(state.slimeSealAge, 2),
      suctionState: state.suctionState,
      stretchSnapState: state.stretchSnapState,
      stretchSnapStateAge: metric(state.stretchSnapStateAge, 3),
      stretchSnapTensionJuice: metric(state.stretchSnapTensionJuice, 3),
      stretchSnapCameraImpulse: metric(state.stretchSnapCameraImpulse, 3),
      stretchSnapAudioCue: state.stretchSnapAudioCue,
      stretchSnapAudioIntensity: metric(state.stretchSnapAudioIntensity, 3),
      anchorWorldPosition: {
        x: metric(state.anchorWorldPosition.x, 2),
        y: metric(state.anchorWorldPosition.y, 2),
        z: metric(state.anchorWorldPosition.z, 2),
      },
      anchorInitialWorldPosition: {
        x: metric(state.anchorInitialWorldPosition.x, 2),
        y: metric(state.anchorInitialWorldPosition.y, 2),
        z: metric(state.anchorInitialWorldPosition.z, 2),
      },
      anchorReleasePoint: {
        x: metric(state.anchorReleasePoint.x, 2),
        y: metric(state.anchorReleasePoint.y, 2),
        z: metric(state.anchorReleasePoint.z, 2),
      },
      anchorReleaseDirection: {
        x: metric(state.anchorReleaseDirection.x, 3),
        y: metric(state.anchorReleaseDirection.y, 3),
        z: metric(state.anchorReleaseDirection.z, 3),
      },
      anchorSnapImpulseVector: {
        x: metric(state.anchorSnapImpulseVector.x, 3),
        y: metric(state.anchorSnapImpulseVector.y, 3),
        z: metric(state.anchorSnapImpulseVector.z, 3),
      },
      anchorSnapDirectionDot: metric(state.anchorSnapDirectionDot, 3),
      anchorReleasePreviewStrength: metric(state.anchorReleasePreviewStrength, 3),
      anchorFinalSqueeze: metric(state.anchorFinalSqueeze, 3),
      anchorRestLength: metric(state.anchorRestLength, 3),
      anchorCurrentDistance: metric(state.anchorCurrentDistance, 3),
      anchorAttachAge: metric(state.anchorAttachAge, 3),
      anchorDrift: metric(state.anchorDrift, 3),
      anchorMaxDrift: metric(state.anchorMaxDrift, 3),
      anchorLockDrift: metric(state.anchorLockDrift, 4),
      anchorMaxLockDrift: metric(state.anchorMaxLockDrift, 4),
      anchorDriftViolationCount: state.anchorDriftViolationCount,
      anchorDriftViolationPulse: metric(state.anchorDriftViolationPulse, 3),
      anchorSealSnapPulse: metric(state.anchorSealSnapPulse, 3),
      anchorSealCompressionTimer: metric(state.anchorSealCompressionTimer, 3),
      anchorReleaseReason: state.anchorReleaseReason,
      anchorStretch: metric(state.anchorStretch, 3),
      anchorTension: metric(state.anchorTension, 3),
      anchorTensionVelocity: metric(state.anchorTensionVelocity, 3),
      anchorElasticBounce: metric(state.anchorElasticBounce, 3),
      anchorReboundImpulse: metric(state.anchorReboundImpulse, 3),
      anchorPlayerControlMultiplier: metric(state.anchorPlayerControlMultiplier, 3),
      anchorDriftRetentionMultiplier: metric(state.anchorDriftRetentionMultiplier, 3),
      anchorDirectionToAnchor: {
        x: metric(state.anchorDirectionToAnchor.x, 3),
        y: metric(state.anchorDirectionToAnchor.y, 3),
        z: metric(state.anchorDirectionToAnchor.z, 3),
      },
      anchorSpringForceVector: {
        x: metric(state.anchorSpringForceVector.x, 3),
        y: metric(state.anchorSpringForceVector.y, 3),
        z: metric(state.anchorSpringForceVector.z, 3),
      },
      anchorDampingForceVector: {
        x: metric(state.anchorDampingForceVector.x, 3),
        y: metric(state.anchorDampingForceVector.y, 3),
        z: metric(state.anchorDampingForceVector.z, 3),
      },
      anchorElasticForceVector: {
        x: metric(state.anchorElasticForceVector.x, 3),
        y: metric(state.anchorElasticForceVector.y, 3),
        z: metric(state.anchorElasticForceVector.z, 3),
      },
      anchorSpringForce: metric(state.anchorSpringForce, 3),
      anchorDampingForce: metric(state.anchorDampingForce, 3),
      anchorLateralDamping: metric(state.anchorLateralDamping, 3),
      anchorRadialVelocity: metric(state.anchorRadialVelocity, 3),
      anchorTangentVelocity: metric(state.anchorTangentVelocity, 3),
      anchorLatchInfluence: metric(state.anchorLatchInfluence, 3),
      anchorLatchPivotActive: state.anchorLatchPivotActive,
      anchorLatchTurnForce: metric(state.anchorLatchTurnForce, 3),
      anchorLatchTangentPreserve: metric(state.anchorLatchTangentPreserve, 3),
      anchorLatchRadialDamping: metric(state.anchorLatchRadialDamping, 3),
      anchorLatchAngularVelocity: metric(state.anchorLatchAngularVelocity, 3),
      anchorLatchDirection: {
        x: metric(state.anchorLatchDirection.x, 3),
        y: metric(state.anchorLatchDirection.y, 3),
        z: metric(state.anchorLatchDirection.z, 3),
      },
      anchorLatchOffAxis: metric(state.anchorLatchOffAxis, 3),
      anchorLatchRedirectStrength: metric(state.anchorLatchRedirectStrength, 3),
      anchorLatchPivotKick: metric(state.anchorLatchPivotKick, 3),
      anchorOverstretchTimer: metric(state.anchorOverstretchTimer, 3),
      anchorReleaseTension: metric(state.anchorReleaseTension, 3),
      anchorSnapImpulseMagnitude: metric(state.anchorSnapImpulseMagnitude, 3),
      anchorPostReleaseVelocity: metric(state.anchorPostReleaseVelocity, 3),
      anchorPostReleaseControlTimer: metric(state.anchorPostReleaseControlTimer, 3),
      anchorPostReleaseControlCurve: metric(state.anchorPostReleaseControlCurve, 3),
      anchorPopJuice: metric(state.anchorPopJuice, 3),
      anchorReattachGraceTimer: metric(state.anchorReattachGraceTimer, 3),
      anchorReattachCooldownTimer: metric(state.anchorReattachCooldownTimer, 3),
      anchorReattachCandidateMoteId: state.anchorReattachCandidateMoteId,
      anchorReattachCandidateScore: metric(state.anchorReattachCandidateScore, 3),
      anchorReattachAssistDirection: {
        x: metric(state.anchorReattachAssistDirection.x, 3),
        y: metric(state.anchorReattachAssistDirection.y, 3),
        z: metric(state.anchorReattachAssistDirection.z, 3),
      },
      anchorReattachRejectedCandidateMoteId: state.anchorReattachRejectedCandidateMoteId,
      anchorReattachRejectedCandidateScore: metric(state.anchorReattachRejectedCandidateScore, 3),
      anchorReattachRejectedCandidateReason: state.anchorReattachRejectedCandidateReason,
      anchorReattachAssistRadius: metric(PRODUCTION_TUNING.suction.reattachAssistRadius, 3),
      anchorReattachAssistAngle: metric(PRODUCTION_TUNING.suction.reattachAssistAngle, 3),
      anchorReattachAssistStrength: metric(state.anchorReattachAssistStrength, 3),
      anchorReattachCatchPulse: metric(state.anchorReattachCatchPulse, 3),
      anchorReattachCatchCount: state.anchorReattachCatchCount,
      anchorReattachLastCatchTargetId: state.anchorReattachLastCatchTargetId,
      anchorReattachLastCatchPileIndex: state.anchorReattachLastCatchPileIndex,
      anchorReleaseTargetPileIndex: state.anchorReleaseTargetPileIndex,
      hoseHookStrength: metric(state.hoseHookStrength, 3),
      hoseHookOffset: {
        x: metric(state.hoseHookOffset.x, 3),
        y: metric(state.hoseHookOffset.y, 3),
        z: metric(state.hoseHookOffset.z, 3),
      },
      hoseHookVelocity: {
        x: metric(state.hoseHookVelocity.x, 3),
        y: metric(state.hoseHookVelocity.y, 3),
        z: metric(state.hoseHookVelocity.z, 3),
      },
      hoseHookVelocityMagnitude: metric(state.hoseHookVelocity.length(), 3),
      hoseContactSettle: metric(state.hoseContactSettle, 3),
      swingTension: metric(state.swingTension, 3),
      bodyControl: metric(state.bodyControl, 3),
      hoseWildness: metric(state.hoseWildness, 3),
      tetherRestLength: metric(state.tetherRestLength, 3),
      tetherStrain: metric(state.tetherStrain, 3),
      tetherRelease: metric(state.tetherRelease, 3),
      suctionReadiness: metric(state.suctionReadiness, 3),
      suctionApproachSettle: metric(state.suctionApproachSettle, 3),
      suctionApproachPull: metric(state.suctionApproachPull, 3),
      suctionApproachLocked: state.suctionApproachLocked,
	      bodySpeed: metric(flowBodySpeed, 3),
	      bodyAcceleration: metric(state.movementAcceleration, 3),
	      bodyDriftFactor: metric(state.movementDriftFactor, 3),
	      bodyLateralSpeed: metric(state.movementLateralSpeed, 3),
	      bodyFacingVelocityAngle: metric(state.movementFacingVelocityAngle, 3),
	      bodyVelocityDirection: metric(state.movementVelocityDirection, 3),
	      bodyYaw: metric(state.yaw, 4),
      bodyPosition: {
        x: metric(state.position.x, 2),
        y: metric(state.position.y, 2),
        z: metric(state.position.z, 2),
      },
      bodyVelocity: {
        x: metric(state.velocity.x, 3),
        y: metric(state.velocity.y, 3),
        z: metric(state.velocity.z, 3),
      },
      baseVelocity: {
        x: metric(state.baseVelocity.x, 3),
        y: metric(state.baseVelocity.y, 3),
        z: metric(state.baseVelocity.z, 3),
      },
      playerMovementForce: {
        x: metric(state.playerMovementForce.x, 3),
        y: metric(state.playerMovementForce.y, 3),
        z: metric(state.playerMovementForce.z, 3),
      },
      suctionForce: {
        x: metric(state.suctionForce.x, 3),
        y: metric(state.suctionForce.y, 3),
        z: metric(state.suctionForce.z, 3),
      },
      snapImpulse: {
        x: metric(state.snapImpulse.x, 3),
        y: metric(state.snapImpulse.y, 3),
        z: metric(state.snapImpulse.z, 3),
      },
      externalForces: {
        x: metric(state.externalForces.x, 3),
        y: metric(state.externalForces.y, 3),
        z: metric(state.externalForces.z, 3),
      },
      movementModel: 'floaty-ice-drift-body-overdrive-v3',
	      mouthPosition: {
	        x: metric(state.mouth.x, 2),
	        y: metric(state.mouth.y, 2),
	        z: metric(state.mouth.z, 2),
	      },
		      slimeHookPoint: {
		        x: metric(state.slimeHookPoint.x, 2),
		        y: metric(state.slimeHookPoint.y, 2),
		        z: metric(state.slimeHookPoint.z, 2),
		      },
		      mouthHookDistance: metric(mouthToHookDistance, 3),
		      mouthForwardToHookAlignment: metric(mouthForwardToHookAlignment, 3),
		      mouthSurfaceContactState: state.mouthSurfaceContactState,
		      mouthSurfaceDistance: metric(state.mouthSurfaceDistance, 3),
		      mouthSurfaceCompression: metric(state.mouthSurfaceCompression, 3),
		      mouthSealRing: metric(state.mouthSealRing, 3),
		      mouthFloatingWarning: metric(state.mouthFloatingWarning, 3),
		      hoseSlimeInteractionPhase: state.hoseSlimeInteractionPhase,
		      hoseSlimeNear: metric(state.hoseSlimeNear, 3),
		      hoseSlimeTouch: metric(state.hoseSlimeTouch, 3),
		      hoseSlimeSeal: metric(state.hoseSlimeSeal, 3),
		      hoseSlimeStretch: metric(state.hoseSlimeStretch, 3),
		      hoseSlimeGulp: metric(state.hoseSlimeGulp, 3),
		      hoseSlimeStrain: metric(state.hoseSlimeStrain, 3),
		      hoseSlimePop: metric(state.hoseSlimePop, 3),
		      bodyForward: {
        x: metric(state.forward.x, 3),
        y: metric(state.forward.y, 3),
        z: metric(state.forward.z, 3),
      },
	      mouthForward: {
        x: metric(state.mouthForward.x, 3),
        y: metric(state.mouthForward.y, 3),
        z: metric(state.mouthForward.z, 3),
      },
      controlModel: 'keyboard-body-cursor-hose-reach-reverse-blow-v2',
      bodyInputActive: state.bodyInputActive,
      bodyInput: {
        x: metric(state.bodyInputX, 2),
        z: metric(state.bodyInputZ, 2),
      },
      mouseBodyInputActive: state.mouseBodyInputActive,
      mouseBodyInput: {
        x: metric(state.mouseBodyInputX, 2),
        z: metric(state.mouseBodyInputZ, 2),
      },
      hoseActive: state.hoseActive,
      hoseBlowModel: PRODUCTION_TUNING.blow.model,
      hoseBlowActive: state.hoseBlowStrength > 0.035,
      hoseBlowStrength: metric(state.hoseBlowStrength, 3),
      hoseBlowPressure: metric(state.hoseBlowPressure, 3),
      hoseBlowPush: metric(state.hoseBlowPush, 3),
      hoseBlowAffectedMotes: state.hoseBlowAffectedMotes,
      hoseBlowMaxDistance: metric(state.hoseBlowMaxDistance, 3),
      hoseTarget: {
        x: metric(state.hoseTarget.x, 2),
        y: metric(state.hoseTarget.y, 2),
        z: metric(state.hoseTarget.z, 2),
      },
      hoseAimPoint: {
        x: metric(state.hoseAimPoint.x, 2),
        y: metric(state.hoseAimPoint.y, 2),
        z: metric(state.hoseAimPoint.z, 2),
      },
      hoseAimLag: metric(state.hoseAimLag, 3),
      hoseAimJitter: metric(state.hoseAimJitter, 3),
      hoseAimResponsiveness: metric(state.hoseAimResponsiveness, 3),
      hoseAimStability: metric(state.hoseAimStability, 3),
      hoseAimReach: metric(state.hoseAimReach, 3),
      cursorWorldPosition: {
        x: metric(state.cursorWorldPosition.x, 2),
        y: metric(state.cursorWorldPosition.y, 2),
        z: metric(state.cursorWorldPosition.z, 2),
      },
      hoseReachCenter: {
        x: metric(state.hoseReachCenter.x, 2),
        y: metric(state.hoseReachCenter.y, 2),
        z: metric(state.hoseReachCenter.z, 2),
      },
      desiredHoseMouthPosition: {
        x: metric(state.desiredHoseMouthPosition.x, 2),
        y: metric(state.desiredHoseMouthPosition.y, 2),
        z: metric(state.desiredHoseMouthPosition.z, 2),
      },
      actualHoseMouthPosition: {
        x: metric(state.actualHoseMouthPosition.x, 2),
        y: metric(state.actualHoseMouthPosition.y, 2),
        z: metric(state.actualHoseMouthPosition.z, 2),
      },
      hoseMouthVelocity: {
        x: metric(state.hoseMouthVelocity.x, 3),
        y: metric(state.hoseMouthVelocity.y, 3),
        z: metric(state.hoseMouthVelocity.z, 3),
      },
      hoseReachClamped: state.hoseReachClamped,
      hoseReachExtension: metric(state.hoseReachExtension, 3),
      hoseReachForwardAmount: metric(state.hoseReachForwardAmount, 3),
      hoseReachSideAmount: metric(state.hoseReachSideAmount, 3),
      hoseReachTargetClampedDistance: metric(state.hoseReachTargetClampedDistance, 3),
      hoseReachLockedToAnchor: state.hoseReachLockedToAnchor,
      hoseBodyForwardClearance: metric(state.hoseBodyForwardClearance, 3),
      hoseBodySideClearance: metric(state.hoseBodySideClearance, 3),
      hoseBodyPlanarClearance: metric(state.hoseBodyPlanarClearance, 3),
      hoseBodyIntersectionRisk: metric(state.hoseBodyIntersectionRisk, 3),
      hoseAimReachLimits: {
        min: metric(PRODUCTION_TUNING.movement.hoseAimBodyReachMin, 3),
        idle: metric(PRODUCTION_TUNING.movement.hoseAimBodyIdleReach, 3),
        max: metric(PRODUCTION_TUNING.movement.hoseAimBodyReachMax, 3),
        reachOffsetForward: metric(PRODUCTION_TUNING.movement.hoseReachOffsetForward, 3),
        reachRadius: metric(PRODUCTION_TUNING.movement.hoseReachRadius, 3),
        reachMinDistance: metric(PRODUCTION_TUNING.movement.hoseReachMinDistance, 3),
        reachMaxDistance: metric(PRODUCTION_TUNING.movement.hoseReachMaxDistance, 3),
        reachSideLimit: metric(PRODUCTION_TUNING.movement.hoseReachSideLimit, 3),
        reachBackwardLimit: metric(PRODUCTION_TUNING.movement.hoseReachBackwardLimit, 3),
        bodyUnlatchMinForward: metric(PRODUCTION_TUNING.movement.hoseBodyUnlatchMinForward, 3),
        bodyUnlatchMinDistance: metric(PRODUCTION_TUNING.movement.hoseBodyUnlatchMinDistance, 3),
        bodyUnlatchSideClearance: metric(PRODUCTION_TUNING.movement.hoseBodyUnlatchSideClearance, 3),
        visualBaseLength: metric(PRODUCTION_TUNING.movement.hoseVisualBaseLength, 3),
        elasticRestLength: metric(PRODUCTION_TUNING.suction.elasticRestLength, 3),
        elasticMaxStretch: metric(PRODUCTION_TUNING.suction.elasticMaxStretch, 3),
      },
      rightClickGripEnabled: PRODUCTION_TUNING.grip.rightClickGripEnabled,
      pivotLocked: state.pivotLocked,
      pivotPoint: {
        x: metric(state.pivotPoint.x, 2),
        y: metric(state.pivotPoint.y, 2),
        z: metric(state.pivotPoint.z, 2),
      },
      pivotLockDuration: metric(state.pivotLockDuration, 3),
      pivotAngularVelocity: metric(state.pivotAngularVelocity, 3),
      pivotTangentialSpeed: metric(state.pivotTangentialSpeed, 3),
      pivotRadialDistance: metric(state.pivotRadialDistance, 3),
      pivotHoseStretchRatio: metric(state.pivotHoseStretchRatio, 3),
      pivotTension: metric(state.pivotTension, 3),
      pivotSnapThreshold: metric(state.pivotSnapThreshold, 3),
      pivotSwingAssist: metric(state.pivotSwingAssist, 3),
      pivotHoseVisualStretch: metric(state.pivotHoseVisualStretch, 3),
      pivotHoseThinning: metric(state.pivotHoseThinning, 3),
      pivotHoseWobble: metric(state.pivotHoseWobble, 3),
      pivotSnapReadiness: metric(state.pivotSnapReadiness, 3),
      pivotReattachCooldown: metric(state.pivotReattachCooldown, 3),
      pivotCandidateTargetId: state.pivotCandidateTargetId,
      pivotReleaseReason: state.pivotReleaseReason,
      gripActive: state.gripActive,
      gripState: state.gripState,
      gripTargetPileIndex: state.gripTargetPileIndex,
      gripTargetMoteId: state.gripTargetMoteId,
      gripContactIndex: state.gripContactIndex,
      gripPoint: {
        x: metric(state.gripLockPoint.x, 2),
        y: metric(state.gripLockPoint.y, 2),
        z: metric(state.gripLockPoint.z, 2),
      },
      gripHoldTime: metric(state.gripHoldTime, 3),
      gripSpinSpeed: metric(state.gripSpinSpeed, 3),
      gripSpinAngle: metric(state.gripSpinAngle, 3),
      gripReleaseWindowWidth: metric(state.gripReleaseWindowWidth, 3),
      gripReleaseQuality: metric(state.gripReleaseQuality, 3),
      gripReleaseReady: metric(state.gripReleaseReady, 3),
      gripReleaseCue: metric(state.gripReleaseCue, 3),
      gripReleaseReadiness: metric(state.gripReleaseReadiness, 3),
      gripReleasePhaseQuality: metric(state.gripReleasePhaseQuality, 3),
      gripReleaseGraceTimer: metric(state.gripReleaseGraceTimer, 3),
      gripDizzy: metric(state.gripDizzy, 3),
      gripMissCount: state.gripMissCount,
      gripMissPulse: metric(state.gripMissPulse, 3),
      gripLockPulse: metric(state.gripLockPulse, 3),
      gripEntryPull: metric(state.gripEntryPull, 3),
      gripPhysicalCue: metric(state.gripPhysicalCue, 3),
      gripPocketBiteCue: metric(state.gripPocketBiteCue, 3),
      gripHoseStrainCue: metric(state.gripHoseStrainCue, 3),
      gripMouthAnticipationCue: metric(state.gripMouthAnticipationCue, 3),
      gripSpinoutPulse: metric(state.gripSpinoutPulse, 3),
      gripMassMultiplier: metric(state.gripMassMultiplier, 3),
      gripGlugBoost: metric(state.gripGlugBoost, 3),
      gripLastReleaseQuality: metric(state.gripLastReleaseQuality, 3),
      gripReleaseReason: state.gripReleaseReason,
	      sealTargetMoteId: state.sealTargetMoteId,
	      sealTargetPileIndex: state.sealTargetPileIndex,
	      postSnapReattachTimer: metric(state.postSnapReattachTimer, 3),
	      contactPatch: {
	        x: metric(state.suctionContactPatchPoint?.x, 2),
	        y: metric(state.suctionContactPatchPoint?.y, 2),
	        z: metric(state.suctionContactPatchPoint?.z, 2),
	      },
	      bridgeActive: state.suctionContactBridgeActive > 0.05,
	      bridgeLength: metric(state.suctionContactBridgeLength, 3),
	      bridgeThickness: metric(state.suctionContactBridgeThickness, 3),
	      sealQuality: metric(state.suctionContactSealQuality, 3),
	      glugTimer: metric(state.suctionContactGlugTimer, 3),
	      lastGlugTime: metric(state.glugLastAge, 3),
	      glugCountThisAttachment: state.glugCountThisAttachment,
	      glugEventStrength: metric(state.glugEventStrength, 3),
	      glugEventMass: metric(state.glugEventMass, 3),
	      glugFailedStrength: metric(state.glugFailedStrength, 3),
	      currentSlimeMass: metric(state.suctionContactCurrentMass, 3),
	      bridgeStrain: metric(state.suctionContactBridgeStrain, 3),
	      massTransferredThisAttachment: metric(state.suctionContactMassTransferred, 3),
	      embedState: state.deepEmbedState,
	      embedDepth: metric(state.deepEmbedDepth, 3),
	      embedLockStrength: metric(state.deepEmbedLockStrength, 3),
	      embedSnapThreshold: metric(state.deepEmbedSnapThreshold, 3),
	      embedAnglePenalty: metric(state.deepEmbedAnglePenalty, 3),
	      embedTensionPenalty: metric(state.deepEmbedTensionPenalty, 3),
	      embedReleaseReason: state.deepEmbedReleaseReason,
	      embedGlugCount: state.deepEmbedGlugCount,
	      embedMassTransferred: metric(state.deepEmbedMassTransferred, 3),
	      embedPocketPulse: metric(state.deepEmbedPocketPulse, 3),
	      embedRimOcclusion: metric(state.deepEmbedRimOcclusion, 3),
	      embedFleckBurst: metric(state.deepEmbedFleckBurst, 3),
	      glugPulse: metric(state.glugPulse, 3),
      glugMassFlow: metric(state.glugMassFlow, 3),
      glugCycles: state.glugCycles,
      completionCycles: state.completionCycles,
      bagFill: metric(state.bagFill, 3),
      bagPressure: metric(state.bagPressure, 3),
      bagPulse: metric(state.bagPulse, 3),
      bagOutlineShock: metric(state.bagOutlineShock, 3),
      bagShockwave: metric(state.bagShockwave, 3),
      bagShockwaveAge: metric(state.bagShockwaveAge, 3),
      bagBeauty: metric(state.bagBeauty, 3),
      bagCollectedMass: metric(state.bagCollectedMass, 3),
      bagFillAmount: metric(state.bagFillAmount, 3),
      bagFillNormalized: metric(state.bagFillNormalized, 3),
      bagLastMassReceived: metric(state.bagLastMassReceived, 3),
      bagReactionStrength: metric(state.bagReactionStrength, 3),
      bagNonUniformBulge: metric(state.bagNonUniformBulge, 3),
      bagGlow: metric(state.bagGlow, 3),
      bagInternalMotion: metric(state.bagInternalMotion, 3),
      bagNearFull: state.bagNearFull,
      bagGlugCountThisTest: state.bagGlugCountThisTest,
      currentBagScale: {
        x: metric(state.bagScaleX, 3),
        y: metric(state.bagScaleY, 3),
        z: metric(state.bagScaleZ, 3),
      },
      bagWobble: metric(state.bagWobble, 3),
      bagFullPulse: metric(state.bagFullPulse, 3),
      bagSlimeChroma: metric(state.bagSlimeChroma, 3),
      slimeComboCount: state.slimeComboCount,
      slimeComboBest: state.slimeComboBest,
      slimeComboTimer: metric(state.slimeComboTimer, 3),
      slimeComboPulse: metric(state.slimeComboPulse, 3),
      slimeComboBurst: metric(state.slimeComboBurst, 3),
      slimeComboShockwave: metric(state.slimeComboShockwave, 3),
      slimeComboShockwaveAge: metric(state.slimeComboShockwaveAge, 3),
      slimeComboActive: state.slimeComboCount >= PRODUCTION_TUNING.bag.comboMinStreak && state.slimeComboTimer > 0,
      slimeComboLastPileIndex: state.slimeComboLastPileIndex,
      flowMetrics: flowMetricsSnapshot,
      flowSummary,
      levelState: state.levelState,
      slimeMassStart: metric(state.levelStartMass, 3),
      slimeMassRemaining: metric(state.levelRemainingMass, 3),
      completionPercent: metric(state.levelCompletionPercent, 3),
      majorGlobsRemaining: state.levelMajorGlobsRemaining,
      nearComplete: state.levelNearComplete,
      completionTriggered: state.levelCompletionTriggered,
      completionAnimationPhase: state.levelCompletionPhase,
      completionAnimationTime: metric(state.levelCompletionAnimationTime, 3),
      timeInLevel: metric(state.levelTime, 2),
      levelCompletionSummary: state.levelCompletionSummary,
      levelCompletionSnapshot: state.levelCompletionSnapshot,
      levelDifficulty: state.levelDifficulty,
      levelClearTarget: metric(state.levelClearTarget, 3),
      levelWaveIndex: state.levelWaveIndex,
      levelWaveTimeLimit: metric(state.levelWaveTimeLimit, 2),
      levelWaveExhausted: isWaveExhaustedForClear(state),
      levelWaveExhaustionProgress: metric(computeWaveExhaustionProgress(state), 3),
      levelWaveGenerationMultiplier: metric(computeWaveGenerationMultiplier(state), 3),
      levelCanCompleteAfterWave: canTriggerLevelCompletionFromCoverage(state),
      levelTimeRemaining: metric(state.levelTimeRemaining, 2),
      levelNoCollectionTime: metric(state.levelNoCollectionTime, 2),
      levelNoCollectionPressure: metric(state.levelNoCollectionPressure, 3),
      levelSlowCleanupPressure: metric(state.levelSlowCleanupPressure, 3),
      levelSlowCleanupDeficit: metric(state.levelSlowCleanupDeficit, 3),
      levelLossProgress: metric(state.levelLossProgress, 3),
      levelVisibleGunkCoverage: metric(state.levelVisibleGunkCoverage, 3),
      levelVisualClearPercent: metric(state.levelVisualClearPercent, 3),
      levelGunkDanger: metric(state.levelGunkDanger, 3),
      levelGunkDangerBaseline: metric(FIRST_LEVEL_TUNING.gunkDangerBaseline, 3),
      levelGunkMeterBalance: metric(
        state.levelGunkDanger >= FIRST_LEVEL_TUNING.gunkDangerBaseline
          ? clampValue(
            (state.levelGunkDanger - FIRST_LEVEL_TUNING.gunkDangerBaseline)
              / Math.max(0.001, 1 - FIRST_LEVEL_TUNING.gunkDangerBaseline),
            0,
            1,
          )
          : -clampValue(
            (FIRST_LEVEL_TUNING.gunkDangerBaseline - state.levelGunkDanger)
              / Math.max(0.001, FIRST_LEVEL_TUNING.gunkDangerBaseline),
            0,
            1,
          ),
        3,
      ),
      levelGunkOvergrowth: metric(state.levelGunkOvergrowth, 3),
      levelGunkOvergrowthCleanupCredit: metric(state.levelGunkOvergrowthCleanupCredit, 3),
      levelLinearGunkCoverageTarget: metric(computeLinearGunkCoverageTarget(state), 3),
      levelSlimeFloorTakeover: metric(state.levelSlimeFloorTakeover, 3),
      levelRawVisibleMass: metric(state.levelRawVisibleMass, 3),
      levelTideVisibleMotes: state.levelTideVisibleMotes,
      levelTideActiveMotes: state.levelTideActiveMotes,
      levelSlimeGenerationModel: PRODUCTION_TUNING.livingSlime.continuousGenerationModel,
      levelSlimeGenerationRate: metric(state.levelSlimeGenerationRate, 4),
      levelSlimeGenerationAddedMass: metric(state.levelSlimeGenerationAddedMass, 3),
      levelSlimeGenerationBudCount: state.levelSlimeGenerationBudCount,
      levelSlimeGenerationActivePieces: state.levelSlimeGenerationActivePieces,
      levelSlimeGenerationSuppression: metric(state.levelSlimeGenerationSuppression, 3),
      levelCollectedMassAtStart: metric(state.levelCollectedMassAtStart, 3),
      levelNoGunkGraceSeconds: metric(state.levelNoGunkGraceSeconds, 2),
      levelOvertakePressure: metric(state.levelOvertakePressure, 3),
      levelOvertakeDanger: metric(state.levelOvertakeDanger, 3),
      levelDefeatTriggered: state.levelDefeatTriggered,
      levelDefeatPhase: state.levelDefeatPhase,
      levelDefeatGunkSpread: metric(state.levelDefeatGunkSpread, 3),
      levelDefeatVacuumSink: metric(state.levelDefeatVacuumSink, 3),
      levelShopReady: state.levelShopReady,
      levelCurrencyEarned: state.levelCurrencyEarned,
      levelStylePoints: state.levelStylePoints,
      levelGunkValue: state.levelGunkValue,
      levelCoinValue: state.levelCoinValue,
      levelProgressTowardTarget: metric(state.levelProgressTowardTarget, 3),
      levelPlayerCleanupActive: state.pointerDown
        || state.hoseActive
        || state.bodyInputActive
        || state.suctionState === 'sealed'
        || state.hoseHookStrength > 0.08
        || state.slimeSealStrength > 0.08,
      levelRegenRate: metric(state.levelRegenRate, 3),
      levelPartyTarget: metric(computeReversiblePartyTarget(
        state.levelCompletionPercent,
        state.levelRegenPressure,
        state.levelRegenResetPulse,
        state.levelDifficulty,
      ), 3),
      levelPartyProgress: metric(state.levelPartyProgress, 3),
      levelPartySync: metric(computeLevelPartySync(state), 3),
      levelProgressLighting: metric(computeProgressLightingSignal(state), 3),
      levelBackgroundProgress: metric(levelBackgroundSignal.progress, 3),
      levelBackgroundThrob: metric(levelBackgroundSignal.throb, 3),
      levelBackgroundColor: `#${progressBackgroundStatsColor.getHexString()}`,
      levelDiscoIntensity: metric(state.levelDiscoIntensity, 3),
      levelCompletionGlow: metric(state.levelCompletionGlow, 3),
      levelCompletionPulse: metric(state.levelCompletionPulse, 3),
      levelRegenPressure: metric(state.levelRegenPressure, 3),
      levelRegeneratedMass: metric(state.levelRegeneratedMass, 3),
      levelRegenBank: metric(state.levelRegenBank, 3),
      levelCleanupAssist: metric(state.levelCleanupAssist, 3),
      levelRegenResetPulse: metric(state.levelRegenResetPulse, 3),
      animation: {
        anticipation: metric(state.animationAnticipation, 3),
        stretch: metric(state.animationStretch, 3),
        slurp: metric(state.animationSlurp, 3),
        glug: metric(state.animationGlug, 3),
        slide: metric(state.animationSlide, 3),
        snap: metric(state.animationSnap, 3),
        recoil: metric(state.animationRecoil, 3),
        bag: metric(state.animationBag, 3),
        completion: metric(state.animationCompletion, 3),
        mouthTug: metric(state.animationMouthTug, 3),
        bodyJolt: metric(state.animationBodyJolt, 3),
        strandPinch: metric(state.animationStrandPinch, 3),
      },
      completion: {
        nearEmpty: metric(state.slimeCompletionNearEmpty, 3),
        finalStrand: metric(state.slimeCompletionFinalStrand, 3),
        finalGlug: metric(state.slimeCompletionFinalGlug, 3),
        cleanup: metric(state.slimeCompletionCleanup, 3),
        chainReady: metric(state.slimeCompletionChainReady, 3),
      },
      controller: {
        gripQuality: metric(state.controllerGripQuality, 3),
        mouthSettle: metric(state.controllerMouthSettle, 3),
        releaseMomentum: metric(state.controllerReleaseMomentum, 3),
        swingFlow: metric(state.controllerSwingFlow, 3),
        winchPull: metric(state.controllerWinchPull, 3),
        reattachGrace: metric(state.controllerReattachGrace, 3),
        anchorLoad: metric(state.controllerAnchorLoad, 3),
      },
      slimeColour: {
        activity: metric(state.slimeColourActivity, 3),
        opal: metric(state.slimeColourOpal, 3),
        pocket: metric(state.slimeColourPocket, 3),
        vein: metric(state.slimeColourVein, 3),
        drift: metric(state.slimeColourDrift, 3),
      },
      slimePhysics: {
        avgStretch: metric(state.slimePhysicsStretch, 3),
        avgContraction: metric(state.slimePhysicsContraction, 3),
        avgSuctionYield: metric(state.slimePhysicsYield, 3),
        avgMergeHeat: metric(state.slimePhysicsMergeHeat, 3),
        absorbingFragments: metric(state.slimePhysicsAbsorbing, 0),
        avgSurfaceTension: metric(state.slimePhysicsSurfaceTension, 3),
        avgPoolPressure: metric(state.slimePhysicsPoolPressure, 3),
        avgSuctionStrain: metric(state.slimePhysicsSuctionStrain, 3),
        avgTendrils: metric(state.slimePhysicsTendrils, 3),
        avgLivingPulse: metric(state.slimeLivingPulse, 3),
        avgLivingCreep: metric(state.slimeLivingCreep, 3),
        avgLivingCongeal: metric(state.slimeLivingCongeal, 3),
        avgLivingBreak: metric(state.slimeLivingBreak, 3),
        avgReferenceDrift: metric(state.slimeReferenceDrift, 3),
        avgReferenceMerge: metric(state.slimeReferenceMerge, 3),
        avgReferenceSplit: metric(state.slimeReferenceSplit, 3),
        avgReferenceRelocation: metric(state.slimeReferenceRelocation, 3),
        avgContactAdhesion: metric(state.slimeContactAdhesion, 3),
        avgContactFunnel: metric(state.slimeContactFunnel, 3),
        avgContactNeck: metric(state.slimeContactNeck, 3),
        avgContactReadiness: metric(state.slimeContactReadiness, 3),
        avgContactDent: metric(state.slimeContactDent, 3),
        avgContactRope: metric(state.slimeContactRope, 3),
        avgContactFeed: metric(state.slimeContactFeed, 3),
        avgContactSnap: metric(state.slimeContactSnap, 3),
        avgSnapBondGrip: metric(state.slimeSnapBondGrip, 3),
        avgSnapBondTension: metric(state.slimeSnapBondTension, 3),
        avgSnapBondStrain: metric(state.slimeSnapBondStrain, 3),
        avgSnapBondBreak: metric(state.slimeSnapBondBreak, 3),
        avgIntakeFlow: metric(state.slimeIntakeFlow, 3),
        avgMassFeed: metric(state.slimeMassFeed, 3),
        avgMaterialWake: metric(state.slimeMaterialWake, 3),
        avgMaterialDepth: metric(state.slimeMaterialDepth, 3),
        avgMaterialElastic: metric(state.slimeMaterialElastic, 3),
        avgMagneticPull: metric(state.slimeMagneticPull, 3),
        avgOrganicHold: metric(state.slimeOrganicHold, 3),
        avgEasySuctionAssist: metric(state.slimeEasySuctionAssist, 3),
        avgEasySuctionPull: metric(state.slimeEasySuctionPull, 3),
        avgEasySuctionFeed: metric(state.slimeEasySuctionFeed, 3),
        avgGrowthWake: metric(state.slimeGrowthWake, 3),
        avgHoseFlow: metric(state.slimeHoseFlow, 3),
        avgHoseBolus: metric(state.slimeHoseBolus, 3),
        avgCompletionNearEmpty: metric(state.slimeCompletionNearEmpty, 3),
        avgCompletionFinalStrand: metric(state.slimeCompletionFinalStrand, 3),
        avgCompletionFinalGlug: metric(state.slimeCompletionFinalGlug, 3),
        avgCompletionCleanup: metric(state.slimeCompletionCleanup, 3),
      },
      techniques: [
        'third-dev-window',
        'experiment-vacuum-1-to-1-duplicate',
        'experimental-attempt-wiped',
        'irregular-blob-geometry',
        'non-spherical-slime-motes',
        'asymmetric-slime-lobes',
        'lumpy-coagulated-mounds',
        'organic-slime-silhouette-audit',
        'slumped-asymmetric-slime-puddles',
        'flattened-coagulated-blob-mounds',
        'side-lobe-coalescence-breakup',
        'monochrome-spawn-swirl',
        'technicolor-coagulation-bloom',
        'controlled-harmonic-slime-palette',
        'slow-idle-hue-breathing',
        'activity-reactive-pigment-warmth',
        'shared-layer-colour-inheritance',
        'waxy-depth-shadow-pockets',
        'soft-inner-glow-colour-core',
        'iridescent-edge-shift',
        'flow-map-marble-drift',
        'strain-slurp-colour-wake',
        'pressure-blended-pigment',
        'merged-color-identity-blending',
        'colored-wet-seam-fill',
        'puddle-marble-color-revival',
        'premium-technicolour-palette-config',
        'opalescent-depth-glaze',
        'combed-wax-pigment-veins',
        'suction-awakened-internal-flow',
        'cool-pocket-warm-glaze-balance',
        'state-reactive-colour-currents',
        'reference-combed-paint-rivers-v4',
        'capillary-spectral-veins-v4',
        'posterized-psychedelic-cell-pools-v4',
        'toon-pastel-opalescent-slime-v4',
        'calm-living-slime-idle-crawl-v6',
        'smooth-moss-fungi-congeal-v6',
        'lava-lamp-pile-breathing-v5',
        'slow-organic-slime-anchor-creep-v6',
        'anti-muddy-palette-balance',
        'iridescent-meniscus-edge-shift',
        'calm-idle-opal-drift',
        'aaa-state-coupled-material-memory',
        'material-wake-colour-currents',
        'wax-depth-pocket-response',
        'elastic-memory-band-pullback',
        'reemergence-return-bloom',
        'organic-magnetic-slime-grip',
        'sticky-jelly-rim-hold',
        'mouth-settle-slime-magnetism',
        'stuck-until-slurped-contact',
        'natural-rim-drag-before-gulp',
        'hose-expansion-glug-slurp-v9',
        'rhythmic-mouth-local-glug-v10',
        'persistent-physical-bag-fill-v10',
        'bag-pulse-connected-to-glug-cycles',
        'glug-driven-mouth-body-hose-thump',
        'elastic-snap-bond-animation-v10',
        'slime-strand-neck-pinch-on-glug',
        'swing-flow-preserved-through-slurp',
        'physical-reward-bag-glug-fill-v11',
        'collected-slime-bag-mass-state-v11',
        'nonuniform-pressurized-bag-swell-v11',
        'bag-beauty-escalates-with-fill-v11',
        'full-bag-squash-wobble-pulse-v11',
        'posterized-filled-bag-slime-bands-v11',
        'swing-chain-slime-anchor-flow-v12',
        'momentum-preserving-anchor-release-v12',
        'forgiving-slime-reattach-window-v12',
        'winch-in-mouth-positioning-v12',
        'tangent-carry-swing-arc-v12',
        'state-driven-cartoon-action-language-v13',
        'event-burst-attach-glug-snap-complete-v13',
        'tension-squash-stretch-exaggeration-v13',
        'glug-linked-mouth-body-bag-pulse-v13',
        'completion-flourish-without-ui-v13',
        'full-slurp-completion-payoff-v14',
        'near-empty-final-strand-v14',
        'last-glug-bag-reward-pulse-v14',
        'clean-residue-collapse-v14',
                'chain-ready-after-completion-v14',
                'easy-reactive-slime-suction-growth-v15',
                'forgiving-mouth-local-suction-assist-v15',
                'flyby-slime-auto-seal-v15',
                'growth-wake-refilling-slime-piles-v15',
                'highly-reactive-low-aim-slurp-v15',
                'core-kinetic-loop-dev-mode-seeding-v16',
                'persistent-slime-seal-target-v16',
                'direction-aware-reattach-scoring-v16',
                'momentum-preserving-snap-fling-v16',
                'suction-contact-flow-bridge-seal-glug-v17',
                'elastic-push-pull-radial-spring-v28',
                'suction-tension-velocity-bounce-v28',
                'no-orbit-release-pop-v28',
                'glug-rhythm-mass-transfer-event-v18',
                'event-counted-slime-mass-transfer-v18',
                'bridge-surge-on-glug-v18',
                'weak-seal-stutter-glug-v18',
                'mass-driven-squishy-bag-fill-v19',
                'delayed-glug-to-bag-pulse-v19',
                'nonuniform-pressurized-bag-bulge-v19',
                'fill-normalized-bag-beauty-v19',
                'bag-fill-dev-telemetry-v19',
                'deep-suction-embed-pocket-lock-v20',
                'hose-head-submerge-depth-v20',
                'slime-lip-rim-occlusion-v20',
                'embedded-glug-strength-modifier-v20',
                'pop-out-snap-recoil-v20',
                'hidden-flow-metrics-v21',
                'attachment-rhythm-tracker-v21',
                'snap-reattach-chain-tracker-v21',
                'glug-mass-quality-tracker-v21',
                'dev-only-flow-readout-v21',
                'finite-first-level-shell-v22',
                'mass-threshold-level-clear-v22',
                'disco-completion-event-v22',
                'completion-flow-summary-snapshot-v22',
                'resettable-full-loop-level-v22',
                'regenerating-slime-pressure-v23',
                'difficulty-adjustable-level-pressure-v23',
                'progressive-party-buildup-v23',
                'party-effects-reverse-on-regrowth-v23',
                'forgiving-final-cleanup-assist-v23',
                'no-black-completion-artifacts-v23',
                'cleanup-vs-regenerating-slime-v24',
                'three-swappable-difficulty-levels-v24',
                'threshold-clear-battle-v24',
                'baseline-regrowth-pressure-v24',
                'wave-defense-overtake-loss-v25',
                'idle-no-gunk-loss-pressure-v26',
                'arena-wide-psychedelic-gunk-flood-v26',
                'shop-break-placeholder-v25',
                'style-gunk-coin-currency-telemetry-v25',
                'psychedelic-gunk-subsume-defeat-v25',
                'progress-synced-gunkometer-disco-v16',
                'high-intensity-completion-party-v16',
                'meter-and-world-party-beat-sync-v16',
                'no-visible-slime-shapes-in-hose',
                'loose-fragment-mouth-intake-v27',
                'stable-local-suction-targeting-v28',
                'aaa-core-loop-polish-v26',
                'deeper-suction-pocket-read-v26',
                'cartoony-hose-strain-overdrive-v26',
                'chunky-glug-bridge-surge-v26',
                'pressurized-bag-reward-v26',
                'slime-streak-combo-bag-boogie-v1',
                'combo-bonus-bag-fill-shockwaves-v1',
                'reverse-blow-herd-combo-strategy-v1',
                'large-chunk-reverse-blow-pusher-v2',
                'snap-fling-reattach-polish-v26',
                'disco-completion-energy-v26',
        'internal-pressure-hose-swell',
        'accordion-glug-slurp-transfer',
        'mouth-to-bag-pressure-transfer-v9',
        'glug-glug-hose-expansion-readability',
        'sticky-jelly-to-hose-pressure-path',
        'bag-driven-vacuum-vehicle',
        'front-hose-slime-hook',
        'two-mass-bag-hose-steering',
        'slurp-swing-tether-physics',
        'viscoelastic-stretch-memory',
        'yield-before-slurp-suction',
        'elastic-contraction-snapback',
        'compression-darkening',
        'physics-driven-pigment-response',
        'sticky-fragment-absorption',
        'merge-heat-seam-blending',
        'mass-conserving-pile-pooling',
        'edge-wobble-relaxation',
        'tension-tear-residue',
        'surface-tension-merge-cohesion',
        'pooled-wax-mass-settling',
        'directional-suction-deformation',
        'tendril-sheet-thinning',
        'state-driven-physical-colour',
        'mouth-local-intake-zone',
        'staged-mouth-contact-sequence-v8',
        'near-contact-edge-tremble',
        'lip-seal-before-feed',
        'resistance-before-yield',
        'tongue-to-rope-necking',
        'snap-recoil-after-feed',
        'rim-adhesion-contact-patch',
        'suction-dimple-funnel-formation',
        'necking-rope-before-slurp',
        'visible-mass-feed-into-mouth',
        'nearby-slime-chain-tug',
        'elastic-break-recoil-settle',
        'cartoon-hose-stretch-bend',
        'hard-to-control-nozzle-front',
        'body-bag-drive-authority',
        'suction-anchor-swinging',
        'swinging-slurping-motion',
        'elastic-rest-length-tether',
        'player-winch-distance-control',
        'heavy-body-tension-inertia',
        'anchored-controller-grip-quality',
        'mouth-settle-heavy-body-assist',
        'release-momentum-preservation-v2',
        'hose-slide-force-scaling',
        'sliding-slime-grip-point',
        'proximity-gated-slurp-readiness',
        'release-momentum-preservation',
        'suction-ready-mouth-range',
        'readability-clamped-body-yaw',
        'constant-pile-coagulation-drift',
        'experiment-native-jelly-wax-material',
        'toon-wet-gloss-bands',
        'bright-pastel-psychedelic-toon-v1',
        'hero-face-clarity-v1',
        'translated-reference-marble-glaze',
        'thick-translucent-color-depth',
        'slurp-strand-mouth-bridge',
        'contact-residue-smears',
        'seal-stretch-tear-stream',
        'colored-wet-emergence-ripples',
        'sticky-mouth-seal',
        'progressive-slurp-contact-latch',
        'vacuum-holds-on-slime-contact',
        'slime-vacuum-force-coupling',
        'mouth-contact-before-gulp',
        'seal-releases-after-swallow',
        'cartoon-slime-pop-emergence',
        'small-blob-field-regrowth',
        'nearby-pile-coagulation',
        'raised-3d-slime-mounds',
        'bending-coagulated-ooze-piles',
        'grounded-jelly-slime-motes',
        'floor-stuck-slime-globs',
        'adhesive-slime-floor-drag',
        'elastic-ground-stick',
        'mucus-anchor-drag',
        'elastic-ground-smears',
        'soft-merge-slime-bridges',
        'pinched-slime-merge-necks',
        'organic-slime-morphing-globs',
        'short-slime-stringing',
        'squash-stretch-slime-motes',
        'colored-meniscus-test-globs',
        'jelly-lift-into-mouth',
        'separate-vacuum-lab-route',
        'locked-slime-prototype-route',
        'pointer-spring-vacuum-body',
        'cartoon-hose-sucker',
        'corrugated-hose-body',
        'elephant-trunk-vacuum-hose',
        'continuous-single-hose-body',
        'gapless-hose-core',
        'curve-locked-corrugation-bands',
        'single-sweeping-hose-bend',
        'damped-front-nozzle-wiggle',
        'low-frequency-hose-physics',
        'endpoint-locked-nozzle',
        'hose-nozzle-overlap-collar',
        'thin-zany-trunk-hose',
        'up-down-arching-hose',
        'rubber-hose-flail-curve',
        'eyes-cleared-front-read',
        'oldschool-vacuum-bag-body',
        'cloth-bag-squash-recoil',
        'opaque-matte-vacuum-bag',
        'gulp-inflating-bag-animation',
        'organic-undercloth-bag-bloom',
        'soft-aurora-bag-takeover',
        'single-field-gulp-color-diffusion',
        'cartoon-bag-bulge-pop',
        'aaa-vacuum-character-polish',
        'eye-focus-intake-reactivity',
        'weighted-body-squash-recoil',
        'organic-suction-pulse-beads',
        'restrained-tapered-flow-ribbons',
        'cohesive-vacuum-energy-loop',
        'thoughtful-vacuum-accessory-kit',
        'animated-pressure-gauge',
        'service-rivet-plates',
        'bag-cinch-hardware',
        'hose-clamp-screws',
        'dangling-inspection-tag',
        'surface-fastened-accessories',
        'bag-accessory-surface-fit',
        'vacuum-part-overlap-audit',
        'bag-patch-artifact-removed',
        'gulp-recoil-flow-through-body',
        'traveling-intake-shockwave',
        'hose-to-bag-gulp-transfer',
        'satisfying-swallow-recoil-layer',
        'flowy-rubber-hose-animation',
        'hose-mounted-face-clearance',
        'eye-hose-clearance-orbit',
        'hose-eye-stalks',
        'mouth-endpoint-clearance',
        'small-snuffling-nozzle-mouth',
        'accordion-suction-pulse',
        'out-of-control-hose-wobble',
        'funny-hose-detailing',
        'mouth-forward-suction-field',
        'computeSuctionForce-test-motes',
        'layered-air-ribbons',
        'mouth-pulse-flash',
        'original-cel-comic-bam-burst',
        'gulp-impact-starburst',
        'short-lived-pop-shards',
        'precise-nozzle-entry-impact-fx',
        'micro-comic-pop-variants',
        'small-clustered-gulp-animations',
        'recoil-on-swallow-cycle',
        'no-score-no-progression',
      ],
      perf: {
        fps: metric(state.fps, 1),
        frameMs: metric(state.frameMs, 1),
        maxFrameMs: metric(state.maxFrameMs, 1),
      },
    }
  })

  return null
}

const STAGE_PROGRESS_LIGHTS = [
  {
    position: new THREE.Vector3(0, 0.007, 0.18),
    rotationZ: 0,
    scale: new THREE.Vector3(8.4, 0.55, 1),
    color: '#8ee9ff',
    opacity: 0.74,
    phase: 0.15,
  },
  {
    position: new THREE.Vector3(0.3, 0.009, -1.28),
    rotationZ: -0.26,
    scale: new THREE.Vector3(8.6, 0.38, 1),
    color: '#ff91df',
    opacity: 0.58,
    phase: 0.62,
  },
  {
    position: new THREE.Vector3(-2.6, 0.004, -0.8),
    rotationZ: 0.18,
    scale: new THREE.Vector3(2.4, 1.35, 1),
    color: '#a2ff9b',
    opacity: 0.46,
    phase: 1.05,
  },
  {
    position: new THREE.Vector3(2.5, 0.006, 0.65),
    rotationZ: -0.12,
    scale: new THREE.Vector3(2.9, 1.5, 1),
    color: '#ffe48a',
    opacity: 0.52,
    phase: 1.52,
  },
]

function Stage({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const lights = useRef<Array<THREE.Mesh | null>>([])
  const lightMaterials = useMemo(
    () =>
      STAGE_PROGRESS_LIGHTS.map((light) =>
        new THREE.MeshBasicMaterial({
          color: light.color,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          toneMapped: false,
        }),
      ),
    [],
  )

  useFrame(({ clock }) => {
    const state = runtime.current
    const t = clock.elapsedTime
    const defeated = state.levelDefeatTriggered || state.levelState === 'defeated'
    const lossFinaleMode = defeated || (!state.levelCompletionTriggered && state.levelDefeatPhase !== 'idle')
    const party = lossFinaleMode ? 0 : computeProgressLightingSignal(state)
    const partySync = lossFinaleMode ? 0 : computeLevelPartySync(state)
    const beat = smooth01((Math.sin(t * FIRST_LEVEL_TUNING.discoBeamPulseRate * Math.PI * 2) + 1) * 0.5)
    const regenFade = lossFinaleMode
      ? 0
      : state.levelCompletionTriggered
      ? 1
      : clampValue(1 - state.levelRegenPressure * 0.34 - state.levelRegenResetPulse * 0.46, 0, 1)
    const finale = !lossFinaleMode && state.levelCompletionTriggered
      ? clampValue(state.levelDiscoIntensity * 0.44 + state.levelCompletionGlow * 0.32 + state.levelCompletionPulse * 0.05, 0, 1.1)
      : 0
    const intensity = lossFinaleMode ? 0 : clampValue(Math.max(party * regenFade, partySync * 0.5 * regenFade, finale), 0, 1.1)
    for (let index = 0; index < STAGE_PROGRESS_LIGHTS.length; index += 1) {
      const mesh = lights.current[index]
      if (!mesh) continue
      if (lossFinaleMode) {
        mesh.visible = false
        lightMaterials[index].opacity = 0
        continue
      }
      const config = STAGE_PROGRESS_LIGHTS[index]
      const material = lightMaterials[index]
      const paletteIndex = (index + Math.floor(t * (state.levelCompletionTriggered ? 1.35 : 0.6)) + Math.floor(partySync * 3)) % DISCO_BEAM_PALETTE.length
      material.color.set(DISCO_BEAM_PALETTE[paletteIndex])
      const localBeat = 0.78
        + beat * 0.18
        + Math.sin(t * 0.62 + config.phase * Math.PI * 2) * 0.05
      const opacity = FIRST_LEVEL_TUNING.partyLightingMaxOpacity
        * config.opacity
        * intensity
        * clampValue(localBeat, 0.52, 1.18)
      mesh.visible = opacity > 0.01
      mesh.position.copy(config.position)
      mesh.rotation.set(-Math.PI / 2, 0, config.rotationZ + Math.sin(t * (0.16 + intensity * 0.08) + config.phase) * 0.025 * intensity)
      mesh.scale.set(
        config.scale.x * (0.9 + intensity * 0.22),
        config.scale.y * (0.88 + intensity * 0.28 + beat * intensity * 0.08),
        1,
      )
      material.opacity = opacity
    }
  })

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.015, 0]} scale={[ARENA_RADIUS, ARENA_RADIUS, 1]}>
        <circleGeometry args={[1, 128]} />
        <meshToonMaterial color="#a981ea" gradientMap={getExperimentToonRampTexture()} />
      </mesh>
      {Array.from({ length: PRODUCTION_TUNING.arena.radialGuideCount }, (_, index) => {
        const angle = (index / PRODUCTION_TUNING.arena.radialGuideCount) * Math.PI * 2
        return (
          <mesh
            key={`arena-radial-guide-${index}`}
            position={[0, 0.002, 0]}
            rotation-y={angle}
            scale={[0.018, 0.006, ARENA_RADIUS * 1.72]}
            renderOrder={9}
            frustumCulled={false}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#d8b8ee" transparent opacity={0.035} depthWrite={false} toneMapped={false} />
          </mesh>
        )
      })}
      {[0.28, 0.48, 0.68, 0.86].slice(0, PRODUCTION_TUNING.arena.floorRingCount).map((fraction, index) => (
        <mesh key={`arena-floor-ring-${index}`} rotation-x={Math.PI / 2} position={[0, 0.006 + index * 0.001, 0]} renderOrder={11} frustumCulled={false}>
          <torusGeometry args={[ARENA_RADIUS * fraction, 0.014, 6, 128]} />
          <meshBasicMaterial color={index % 2 === 0 ? '#cab0ea' : '#bda0dc'} transparent opacity={0.08} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      <mesh rotation-x={Math.PI / 2} position={[0, 0.016, 0]} renderOrder={14} frustumCulled={false}>
        <torusGeometry args={[ARENA_RADIUS, 0.075, 8, 160]} />
        <meshBasicMaterial color="#4c2f6e" depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, 0.022, 0]} renderOrder={15} frustumCulled={false}>
        <torusGeometry args={[ARENA_RADIUS - 0.18, 0.026, 8, 160]} />
        <meshBasicMaterial color="#c9a6ec" transparent opacity={0.42} depthWrite={false} toneMapped={false} />
      </mesh>
      {STAGE_PROGRESS_LIGHTS.map((light, index) => (
        <mesh
          key={`stage-progress-light-${index}`}
          ref={(node) => {
            lights.current[index] = node
          }}
          material={lightMaterials[index]}
          position={light.position}
          rotation-x={-Math.PI / 2}
          rotation-z={light.rotationZ}
          scale={light.scale}
          renderOrder={8 + index}
          frustumCulled={false}
          visible={false}
        >
          {index < 2 ? <planeGeometry args={[1, 1, 1, 1]} /> : <circleGeometry args={[1, 32]} />}
        </mesh>
      ))}
    </group>
  )
}

const MOVEMENT_LAB_MARKERS = [
  { x: -3.4, z: -1.6, scaleX: 0.9, scaleZ: 0.28, color: '#8ee9ff' },
  { x: -1.35, z: 1.45, scaleX: 0.34, scaleZ: 0.34, color: '#ffe48a' },
  { x: 1.2, z: -1.25, scaleX: 1.05, scaleZ: 0.24, color: '#ff91df' },
  { x: 3.1, z: 1.25, scaleX: 0.42, scaleZ: 0.42, color: '#a2ff9b' },
]

function MovementLabMarkers({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const visible = isMovementLabMode(runtime.current.devMode)
  if (!visible) return null

  return (
    <group frustumCulled={false}>
      {MOVEMENT_LAB_MARKERS.map((marker, index) => (
        <group key={`movement-lab-marker-${index}`} position={[marker.x, 0.014, marker.z]} rotation-x={-Math.PI / 2}>
          <mesh scale={[marker.scaleX, marker.scaleZ, 1]} renderOrder={18} frustumCulled={false}>
            <circleGeometry args={[1, 28]} />
            <meshBasicMaterial color={marker.color} transparent opacity={0.28} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh scale={[marker.scaleX * 0.88, 0.018, 1]} renderOrder={19} frustumCulled={false}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#2b1d3f" transparent opacity={0.42} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function BodyMotionTrails({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const leftSkid = useRef<THREE.Mesh>(null)
  const rightSkid = useRef<THREE.Mesh>(null)
  const speedSlash = useRef<THREE.Mesh>(null)
  const skidMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: '#ff89de',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    }),
    [],
  )
  const slashMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: '#fff59a',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    }),
    [],
  )

  useFrame(() => {
    const state = runtime.current
    arcadeVelocityVector.copy(state.velocity)
    arcadeVelocityVector.y = 0
    const speed = arcadeVelocityVector.length()
    const skid = clampValue(state.movementSkid, 0, 1)
    const streak = clampValue((speed - 2.1) / Math.max(0.001, PRODUCTION_TUNING.movement.maxSpeed - 2.1), 0, 1)
    const visible = skid > 0.035 || streak > 0.12
    const direction = arcadeVelocityVector.lengthSq() > 0.001
      ? arcadeVelocityVector.normalize()
      : state.forward
    rightVector.set(-direction.z, 0, direction.x)
    if (rightVector.lengthSq() < 0.0001) rightVector.set(1, 0, 0)
    rightVector.normalize()
    const yaw = Math.atan2(direction.x, direction.z)
    const length = 0.42 + speed * 0.13 + skid * 0.28
    const width = 0.04 + skid * 0.032
    const opacity = visible ? clampValue(0.05 + skid * 0.2, 0, 0.24) : 0
    const slashOpacity = visible ? clampValue(streak * 0.18 + skid * 0.06, 0, 0.22) : 0
    skidMaterial.opacity = opacity
    slashMaterial.opacity = slashOpacity

    const updateSkid = (mesh: THREE.Mesh | null, side: number) => {
      if (!mesh) return
      mesh.visible = visible
      mesh.position.copy(state.position)
      mesh.position.addScaledVector(direction, -0.52)
      mesh.position.addScaledVector(rightVector, side * 0.23)
      mesh.position.y = 0.026
      mesh.rotation.set(-Math.PI / 2, 0, yaw + Math.sin(state.movementWobble * 11 + side) * 0.05)
      mesh.scale.set(length, width, 1)
    }
    updateSkid(leftSkid.current, -1)
    updateSkid(rightSkid.current, 1)
    if (speedSlash.current) {
      speedSlash.current.visible = visible
      speedSlash.current.position.copy(state.position)
      speedSlash.current.position.addScaledVector(direction, -0.84)
      speedSlash.current.position.y = 0.032
      speedSlash.current.rotation.set(-Math.PI / 2, 0, yaw)
      speedSlash.current.scale.set(0.48 + speed * 0.09, 0.026 + streak * 0.018, 1)
    }
  })

  return (
    <group frustumCulled={false}>
      <mesh ref={leftSkid} material={skidMaterial} renderOrder={27} frustumCulled={false} visible={false}>
        <circleGeometry args={[1, 18]} />
      </mesh>
      <mesh ref={rightSkid} material={skidMaterial} renderOrder={27} frustumCulled={false} visible={false}>
        <circleGeometry args={[1, 18]} />
      </mesh>
      <mesh ref={speedSlash} material={slashMaterial} renderOrder={28} frustumCulled={false} visible={false}>
        <circleGeometry args={[1, 18]} />
      </mesh>
    </group>
  )
}

function HoseCursorReachDebugCue({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const zone = useRef<THREE.Mesh>(null)
  const cursor = useRef<THREE.Mesh>(null)
  const desired = useRef<THREE.Mesh>(null)
  const actual = useRef<THREE.Mesh>(null)
  const lagLine = useRef<THREE.Mesh>(null)
  const centerLine = useRef<THREE.Mesh>(null)
  const scratch = useMemo(() => ({
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
    mid: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    xAxis: new THREE.Vector3(1, 0, 0),
  }), [])
  const zoneMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#7ee8ff',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  }), [])
  const cursorMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  }), [])
  const desiredMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffe66d',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  }), [])
  const actualMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ff6fd8',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  }), [])
  const lineMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#9ef7ff',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  }), [])
  const centerMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#f8ff7a',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  }), [])

  useFrame(({ clock }) => {
    const state = runtime.current
    const visible = state.devMode === 'suction-contact' || state.devMode === 'movement-lab'
    const t = clock.elapsedTime
    const opacity = visible ? 1 : 0
    zoneMaterial.opacity = 0.09 * opacity
    cursorMaterial.opacity = 0.22 * opacity
    desiredMaterial.opacity = (state.hoseReachClamped ? 0.52 : 0.34) * opacity
    actualMaterial.opacity = (0.4 + state.hoseReachExtension * 0.22) * opacity
    lineMaterial.opacity = clampValue(0.14 + state.hoseAimLag * 0.28, 0, 0.42) * opacity
    centerMaterial.opacity = 0.18 * opacity

    if (zone.current) {
      zone.current.visible = visible
      zone.current.position.set(state.hoseReachCenter.x, 0.038, state.hoseReachCenter.z)
      zone.current.rotation.set(-Math.PI / 2, 0, Math.atan2(state.forward.x, state.forward.z))
      zone.current.scale.set(
        PRODUCTION_TUNING.movement.hoseReachSideLimit,
        PRODUCTION_TUNING.movement.hoseReachRadius,
        1,
      )
    }
    if (cursor.current) {
      cursor.current.visible = visible
      cursor.current.position.set(state.cursorWorldPosition.x, 0.082, state.cursorWorldPosition.z)
      cursor.current.rotation.set(-Math.PI / 2, 0, t * 0.45)
      cursor.current.scale.setScalar(0.055)
    }
    if (desired.current) {
      desired.current.visible = visible
      desired.current.position.set(state.desiredHoseMouthPosition.x, 0.11, state.desiredHoseMouthPosition.z)
      desired.current.rotation.set(Math.PI / 2, 0, t * 1.15)
      desired.current.scale.setScalar(0.075 + (state.hoseReachClamped ? 0.025 : 0))
    }
    if (actual.current) {
      actual.current.visible = visible
      actual.current.position.set(state.actualHoseMouthPosition.x, 0.14, state.actualHoseMouthPosition.z)
      actual.current.rotation.set(Math.PI / 2, 0, -t * 1.4)
      actual.current.scale.setScalar(0.085 + state.hoseReachExtension * 0.025)
    }

    const updateLine = (mesh: THREE.Mesh | null, start: THREE.Vector3, end: THREE.Vector3, width: number) => {
      if (!mesh) return
      mesh.visible = visible
      if (!visible) return
      scratch.start.set(start.x, 0.12, start.z)
      scratch.end.set(end.x, 0.12, end.z)
      scratch.direction.copy(scratch.end).sub(scratch.start)
      const length = scratch.direction.length()
      if (length < 0.025) {
        mesh.visible = false
        return
      }
      scratch.direction.multiplyScalar(1 / length)
      scratch.mid.copy(scratch.start).lerp(scratch.end, 0.5)
      mesh.position.copy(scratch.mid)
      mesh.quaternion.setFromUnitVectors(scratch.xAxis, scratch.direction)
      mesh.scale.set(length, width, width)
    }
    updateLine(lagLine.current, state.actualHoseMouthPosition, state.desiredHoseMouthPosition, 0.025)
    updateLine(centerLine.current, state.position, state.hoseReachCenter, 0.018)
  })

  return (
    <group frustumCulled={false}>
      <mesh ref={zone} material={zoneMaterial} renderOrder={29} frustumCulled={false} visible={false}>
        <circleGeometry args={[1, 48]} />
      </mesh>
      <mesh ref={cursor} material={cursorMaterial} renderOrder={91} frustumCulled={false} visible={false}>
        <circleGeometry args={[1, 18]} />
      </mesh>
      <mesh ref={desired} material={desiredMaterial} renderOrder={92} frustumCulled={false} visible={false}>
        <torusGeometry args={[1, 0.12, 8, 24]} />
      </mesh>
      <mesh ref={actual} material={actualMaterial} renderOrder={93} frustumCulled={false} visible={false}>
        <torusGeometry args={[1, 0.12, 8, 24]} />
      </mesh>
      <mesh ref={lagLine} material={lineMaterial} renderOrder={90} frustumCulled={false} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <mesh ref={centerLine} material={centerMaterial} renderOrder={89} frustumCulled={false} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  )
}

function trunkRadiusAt(pct: number) {
  return 0.185 - pct * 0.04 + Math.sin(pct * Math.PI) * 0.016
}

function hoseGlugPressureAt(pct: number, t: number, state?: VacuumRuntime) {
  if (!state) return 0
  const slurpEnergy = clampValue(
    state.slimeHoseFlow * 0.72
      + state.slimeHoseBolus * 0.48
      + state.slimeHoseBulge * 0.56
      + state.slimeMouthThread * 0.18
      + state.glugPulse * 0.72
      + state.glugMassFlow * 0.36
      + state.animationGlug * 0.55
      + state.animationSlurp * 0.3
      + state.animationMouthTug * 0.15
      + state.deepEmbedPocketPulse * 0.34
      + state.deepEmbedDepth * 0.18,
    0,
    1.9,
  )
  const pace = 0.28 + state.slimeHoseFlow * 0.2 + state.slimeHoseBolus * 0.12 + state.glugPulse * 0.16 + state.animationGlug * 0.08
  const travel = (t * pace + state.swallowCycles * 0.11 + state.glugCycles * 0.07) % 1
  const centerA = 1 - travel
  const centerB = 1 - ((travel + 0.2) % 1)
  const centerC = 1 - ((travel + 0.41) % 1)
  const slurpBand = slurpEnergy > 0.012
    ? (
      Math.exp(-((pct - centerA) ** 2) * 72)
      + Math.exp(-((pct - centerB) ** 2) * 78) * 0.72
      + Math.exp(-((pct - centerC) ** 2) * 86) * 0.5
    ) * slurpEnergy
    : 0
  const gulpCenter = 1 - state.gulpAge * 2.45
  const gulpBand = state.gulpFlow > 0.005 && gulpCenter > -0.32
    ? Math.exp(-((pct - gulpCenter) ** 2) * 92) * state.gulpFlow * Math.max(0, 1 - state.gulpAge / 0.9)
    : 0

  return clampValue(slurpBand + gulpBand, 0, 2.1)
}

function setTrunkPoint(
  target: THREE.Vector3,
  pct: number,
  t: number,
  suction: number,
  flash: number,
  recoil: number,
  gulpFlow = 0,
  gulpAge = 9,
  state?: VacuumRuntime,
) {
  const sideEnvelope = Math.sin(pct * Math.PI)
  const lead = pct ** 1.25
  const frontEnvelope = smooth01((pct - 0.58) / 0.42)
  const blowPressure = state ? clampValue(state.hoseBlowPressure + state.hoseBlowReleasePulse * 0.42, 0, 1.35) : 0
  const hoseAimActive = state && (state.hoseActive || state.pointerDown || blowPressure > 0.035)
  const hoseAimInfluence = hoseAimActive
    ? PRODUCTION_TUNING.movement.hoseMouseBendInfluence
    : 0
  const hoseOffsetInfluence = state ? Math.max(Math.min(1.12, state.hoseHookStrength), hoseAimInfluence) : 0
  const hookEnvelope = hoseOffsetInfluence * frontEnvelope * (0.28 + lead * 0.72)
  const swingEnergy = state ? state.swingEnergy : 0
  const anchorTension = state ? state.anchorTension : 0
  const anchorStretchVisual = state
    ? smooth01(state.anchorStretch / getStretchSnapMaxStretch(state))
    : 0
  const sealedStrainEnergy = state
    ? clampValue(
      anchorTension * 0.86
        + anchorStretchVisual * 0.5
        + state.anchorReleasePreviewStrength * 0.42
        + state.anchorElasticBounce * 0.24
        + state.anchorFinalSqueeze * 0.24,
      0,
      1.75,
    )
    : 0
  const contactCalm = state
    ? clampValue(
      Math.max(
        state.controllerMouthSettle * 0.72,
        state.suctionApproachPull * 0.86,
        state.hoseContactSettle * 0.92,
        anchorTension * 0.36,
        state.deepEmbedLockStrength * 0.4,
        state.slimeOrganicHold * 0.32,
        state.mouthSurfaceCompression * 0.5,
        state.mouthSealRing * 0.42,
        state.suctionState === 'prePull' ? 0.42 : 0,
        state.suctionState === 'seeking' ? 0.2 : 0,
        state.suctionReadiness * 0.32,
        state.slimeContactReadiness * 0.5,
        state.slimeMagneticPull * 0.38,
      ),
      0,
      1,
    )
    : 0
  const suctionContactStability = state
    ? clampValue(
      Math.max(
        contactCalm,
        state.hoseContactSettle,
        state.suctionState === 'sealed' ? 1 : 0,
        state.suctionState === 'contact' ? 0.74 : 0,
        state.suctionState === 'prePull' ? 0.42 : 0,
        state.suctionState === 'seeking' ? 0.18 : 0,
        state.mouthSurfaceContactState === 'embedded' ? 0.88 : 0,
        state.mouthSurfaceContactState === 'touching' ? 0.68 : 0,
      ),
      0,
      1,
    )
    : 0
  const highFrequencyCalmBase = 1 - suctionContactStability * PRODUCTION_TUNING.movement.hoseContactHighFrequencyCalm
  const highFrequencyCalm = state && state.suctionState === 'sealed'
    ? clampValue(highFrequencyCalmBase + sealedStrainEnergy * 0.48, 0.18, 1)
    : highFrequencyCalmBase
  const contactWildnessCalm = state && state.suctionState === 'sealed'
    ? 0.38
    : PRODUCTION_TUNING.movement.hoseContactWildnessCalm
  const contactStabilityWildnessCalm = state && state.suctionState === 'sealed' ? 0.38 : 0.88
  const hoseWildness = state
    ? (state.hoseWildness + state.animationSlide * 0.12 + state.animationRecoil * 0.08)
      * (1 - contactCalm * contactWildnessCalm)
      * (1 - suctionContactStability * contactStabilityWildnessCalm)
      * (1 - (hoseAimActive ? PRODUCTION_TUNING.movement.hoseAimNoiseCalm : 0))
      + sealedStrainEnergy * 0.26
    : suction
  const gripQuality = state ? state.controllerGripQuality : 0
  const mouthSettle = state ? state.controllerMouthSettle : 0
  const releaseMomentum = state ? state.controllerReleaseMomentum : 0
  const embedDepth = state ? smooth01(state.deepEmbedDepth / Math.max(0.001, PRODUCTION_TUNING.embed.embedDepthMax)) : 0
  const embedLock = state ? state.deepEmbedLockStrength : 0
  const embedPocket = state ? state.deepEmbedPocketPulse : 0
  const pivotStretch = state ? state.pivotHoseVisualStretch : 0
  const pivotTension = state ? state.pivotTension : 0
  const pivotWobble = state ? state.pivotHoseWobble : 0
  const pivotSnapReady = state ? state.pivotSnapReadiness : 0
  const actionStretch = state ? state.animationStretch : 0
  const actionSlurp = state ? state.animationSlurp : 0
  const actionSnap = state ? state.animationSnap : 0
  const actionMouth = state ? state.animationMouthTug : 0
  const phase = pct * 2.65
  const flowPhase = pct * 5.65
  const gulpCenter = 1 - gulpAge * 2.45
  const gulpFade = Math.max(0, 1 - gulpAge / 0.9)
  const gulpBand = gulpFlow > 0.005 && gulpCenter > -0.32
    ? Math.exp(-((pct - gulpCenter) ** 2) * 92) * gulpFlow * gulpFade
    : 0
  const hoseGlug = hoseGlugPressureAt(pct, t, state)
  const bodySway = Math.sin(t * 2.0 + 0.35) * 0.05 * (suction + swingEnergy * 0.35) * sideEnvelope * (1 - (hoseAimActive ? 0.24 : 0))
  const tensionReach = state
    ? (state.tetherStrain + anchorTension * 0.72 + anchorStretchVisual * 0.38 + actionStretch * 0.42 + pivotStretch * 0.78 + pivotTension * 0.34)
      * frontEnvelope
      * (0.22 + lead * 0.44)
    : 0
  const embedReach = embedDepth * frontEnvelope * (0.06 + lead * 0.22) * (0.78 + embedLock * 0.22)
  const readinessCurl = state ? (state.suctionReadiness + mouthSettle * 0.42) * frontEnvelope * Math.sin(pct * Math.PI) * 0.045 : 0
  const rubberWave = sideEnvelope * hoseWildness * (
    Math.sin(t * 1.55 + flowPhase) * 0.068
    + Math.sin(t * 2.35 - pct * 4.6) * 0.034
    + Math.sin(t * 8.2 + phase * 1.25) * anchorTension * PRODUCTION_TUNING.suction.elasticWobbleAmount * 0.042 * highFrequencyCalm
    + Math.sin(t * 7.2 + phase) * embedDepth * PRODUCTION_TUNING.embed.embedHoseWobbleStrength * 0.025 * highFrequencyCalm
    + Math.sin(t * 11.2 + phase * 1.35) * pivotWobble * 0.048 * highFrequencyCalm
  )
  const verticalWave = sideEnvelope * (suction + swingEnergy * 0.28) * (
    Math.sin(t * 1.85 + pct * 4.2) * 0.04
    + Math.sin(t * 3.05 - pct * 3.35) * 0.017
  )
  const depthWave = sideEnvelope * (suction + swingEnergy * 0.22) * Math.sin(t * 1.35 + pct * 5.1) * 0.026
  const blowWave = blowPressure
    * frontEnvelope
    * (Math.sin(t * 13.4 - pct * 10.8) * 0.042 + Math.sin(t * 6.2 + pct * 7.4) * 0.028)
    * (0.35 + lead * 0.65)
  const anchorWhip = frontEnvelope
    * sealedStrainEnergy
    * (
      Math.sin(t * 6.4 + phase * 1.4) * 0.075
      + Math.sin(t * 10.8 - phase * 1.1) * 0.026
    )
  const frontWhip = frontEnvelope * (hoseWildness + swingEnergy * 0.42 + releaseMomentum * 0.24 + actionSnap * 0.24) * (
    Math.sin(t * 4.15 + phase) * 0.082
    + Math.sin(t * 6.85 + phase * 1.4) * 0.027
  ) * (1 - contactCalm * (state && state.suctionState === 'sealed' ? 0.52 : PRODUCTION_TUNING.movement.hoseContactFrontWhipCalm))
    * (1 - suctionContactStability * (state && state.suctionState === 'sealed' ? 0.38 : 0.92))
    * (1 - anchorTension * 0.08)
    + anchorWhip
  const pivotWhip = frontEnvelope
    * (pivotWobble + pivotSnapReady * 0.72 + pivotTension * 0.2)
    * (Math.sin(t * 9.6 + phase * 1.2) * 0.086 + Math.sin(t * 15.4 - phase) * 0.026)
    * (1 - suctionContactStability * (state && state.suctionState === 'sealed' ? 0.42 : 0.94))
  const recoilLag = recoil * (0.98 - pct * 0.42)
  const frontCurl = frontEnvelope * Math.sin((pct - 0.58) * Math.PI * 1.35) * 0.072
  const baseX = sideEnvelope * 0.32 + frontCurl - pct * 0.035
  const baseY = 0.16 + sideEnvelope * 0.5 - pct * 0.07
  const baseZ = PRODUCTION_TUNING.movement.hoseVisualBaseZ
    - pct * PRODUCTION_TUNING.movement.hoseVisualBaseLength
    + sideEnvelope * 0.055

	  target.set(
	    baseX
      + bodySway
      + rubberWave
      + frontWhip
      + pivotWhip
      + (state ? state.hoseHookOffset.x * hookEnvelope : 0)
      + Math.sin(t * 3.8 + phase) * gripQuality * frontEnvelope * 0.018
      + Math.sin(t * 5.6 + phase) * swingEnergy * frontEnvelope * 0.03
      + Math.sin(t * 12.4 + phase * 1.7) * gulpBand * 0.028
      + Math.sin(t * 7.2 + phase) * hoseGlug * 0.024
      + blowWave * (0.7 + sideEnvelope * 0.3)
      + Math.sin(t * 11.4 + phase * 1.3) * embedPocket * frontEnvelope * 0.03
      + Math.sin(t * 9.4 + phase * 1.2) * actionMouth * frontEnvelope * 0.024
      + Math.sin(t * 11.0 + phase) * flash * 0.014 * lead * frontEnvelope,
    baseY
      + gulpBand * (0.035 + sideEnvelope * 0.03)
      + hoseGlug * (0.034 + sideEnvelope * 0.028)
      + verticalWave
      + Math.sin(t * 8.4 + phase) * pivotWobble * frontEnvelope * 0.034
      + (state ? state.hoseHookOffset.y * hookEnvelope : 0)
      + mouthSettle * frontEnvelope * 0.018
      - embedDepth * frontEnvelope * 0.072 * PRODUCTION_TUNING.embed.embedTipSubmergeScale
      + embedPocket * frontEnvelope * 0.022
      + Math.sin(t * 2.55 + 0.7) * 0.026 * sideEnvelope * suction
      + Math.sin(t * 5.1 + phase) * 0.024 * frontEnvelope * suction
      + blowPressure * frontEnvelope * (0.018 + sideEnvelope * 0.014)
      + actionSlurp * frontEnvelope * (0.014 + sideEnvelope * 0.012)
      + sideEnvelope * recoil * 0.026,
    baseZ
      + depthWave
      + (state ? state.hoseHookOffset.z * hookEnvelope : 0)
      - tensionReach
      - embedReach
      - pivotSnapReady * frontEnvelope * (0.026 + lead * 0.042)
      - readinessCurl
      + Math.cos(t * 4.7 + phase) * swingEnergy * frontEnvelope * 0.025
      + Math.sin(t * 8.8 + pct * 6.0) * gulpBand * 0.018
      + Math.cos(t * 6.2 + pct * 5.2) * hoseGlug * 0.014
      + Math.sin(t * 3.1 + phase * 0.6) * 0.018 * frontEnvelope * suction
	      + blowPressure * frontEnvelope * (0.028 + lead * 0.055)
	      - actionMouth * frontEnvelope * 0.022
	      - recoilLag * 0.024,
	  )
  if (state) {
      const endpointLock = smooth01((pct - 0.94) / 0.06)
      const maxReachInfluence = state.suctionState === 'sealed'
        ? 1
        : 0.92 + endpointLock * 0.08
      const cartoonReachEnvelope = Math.pow(
        smooth01((pct - PRODUCTION_TUNING.movement.hoseCartoonBendStart)
          / Math.max(0.001, 1 - PRODUCTION_TUNING.movement.hoseCartoonBendStart)),
        PRODUCTION_TUNING.movement.hoseCartoonBendEase,
      )
      const reachInfluence = clampValue(
        cartoonReachEnvelope
          * (0.18 + lead * 0.46 + state.hoseReachExtension * 0.28 + (state.hoseActive || state.pointerDown || state.hoseBlowPressure > 0.035 ? 0.16 : 0)),
        0,
        maxReachInfluence,
      )
      if (reachInfluence > 0.001) {
        const stretchArc = Math.sin(cartoonReachEnvelope * Math.PI) * state.hoseReachExtension
        const sideBow = clampValue(
          Math.abs(state.hoseReachSideAmount) / Math.max(0.001, PRODUCTION_TUNING.movement.hoseReachSideLimit),
          0,
          1,
        )
        hoseReachTipLocalVector.set(
          state.hoseReachLocal.x * (0.08 + cartoonReachEnvelope * 0.92),
          state.hoseReachLocal.y + sideEnvelope * (0.34 + cartoonReachEnvelope * 0.18),
          state.hoseReachLocal.z * (0.12 + cartoonReachEnvelope * 0.88),
        )
        hoseReachTipLocalVector.x += Math.sign(state.hoseReachSideAmount)
          * stretchArc
          * sideBow
          * PRODUCTION_TUNING.movement.hoseCartoonStretchSideBow
        hoseReachTipLocalVector.y += stretchArc
          * PRODUCTION_TUNING.movement.hoseCartoonStretchArcLift
        target.lerp(hoseReachTipLocalVector, reachInfluence)
      }
    }
		  if (state && (state.hoseHookStrength > 0.04 || embedDepth > 0.05 || state.deepEmbedRimOcclusion > 0.05)) {
		    const effectiveTipLock = clampValue(
		      Math.max(
		        state.hoseHookStrength,
		        state.suctionState === 'sealed' ? 1 : 0,
		        state.suctionState === 'contact' ? 0.72 : 0,
		        embedDepth * PRODUCTION_TUNING.embed.embedTipLockDepthScale,
		        state.deepEmbedRimOcclusion * PRODUCTION_TUNING.embed.embedTipLockOcclusionScale,
		        embedLock * 0.42,
		      ),
		      0,
		      1,
		    )
		    const embeddedTipRaw = clampValue(
		      effectiveTipLock
		        * frontEnvelope
		        * Math.max(
		          state.suctionState === 'sealed' ? 1 : 0,
		          state.suctionState === 'contact' ? 0.48 : 0,
		          state.mouthSurfaceContactState === 'embedded' ? 0.86 : 0,
		          state.suctionApproachLocked ? 0.58 : 0,
		          state.controllerMouthSettle * 0.76,
		          embedDepth * 1.62,
		          embedLock * 0.58,
		          state.deepEmbedRimOcclusion * 0.46,
		          state.slimeOrganicHold * 0.28,
		        ),
		      0,
		      1,
		    )
		    const embeddedTip = embeddedTipRaw * (0.78 + state.hoseContactSettle * 0.22)
		    if (embeddedTip > 0.01) {
	      hoseLockedTipRightVector.set(-state.forward.z, 0, state.forward.x)
	      if (hoseLockedTipRightVector.lengthSq() < 0.0001) hoseLockedTipRightVector.set(1, 0, 0)
	      hoseLockedTipRightVector.normalize()
	      hoseLockedTipDeltaVector.copy(state.slimeHookPoint).sub(state.position)
	      hoseLockedTipLocalVector.set(
	        hoseLockedTipDeltaVector.dot(hoseLockedTipRightVector),
		        hoseLockedTipDeltaVector.y + 0.006 - embedDepth * 0.17 * PRODUCTION_TUNING.embed.embedTipSubmergeScale - state.deepEmbedRimOcclusion * 0.052,
		        -hoseLockedTipDeltaVector.dot(state.forward) - embedDepth * 0.165 * PRODUCTION_TUNING.embed.embedTipSubmergeScale - state.deepEmbedRimOcclusion * 0.03,
	      )
	      target.lerp(hoseLockedTipLocalVector, embeddedTip)
	    }
	  }
	}

function makeTrunkGeometry(points: THREE.Vector3[], radiusOffset = 0, radiusPressureAt?: (pct: number) => number) {
  stabilizeTrunkPoints(points)
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.55)
  const geometry = new THREE.TubeGeometry(curve, TRUNK_TUBE_SEGMENTS, trunkRadiusAt(0.42) + radiusOffset, TRUNK_RADIAL_SEGMENTS, false)

  if (radiusPressureAt) {
    const position = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let segment = 0; segment <= TRUNK_TUBE_SEGMENTS; segment += 1) {
      const pct = segment / TRUNK_TUBE_SEGMENTS
      const pressure = radiusPressureAt(pct)
      if (pressure <= 0.001) continue
      const radiusScale = 1 + pressure
      curve.getPointAt(pct, trunkProfileCenter)
      for (let radial = 0; radial <= TRUNK_RADIAL_SEGMENTS; radial += 1) {
        const vertexIndex = segment * (TRUNK_RADIAL_SEGMENTS + 1) + radial
        trunkProfileVertex.fromBufferAttribute(position, vertexIndex)
        trunkProfileVertex.sub(trunkProfileCenter).multiplyScalar(radiusScale).add(trunkProfileCenter)
        position.setXYZ(vertexIndex, trunkProfileVertex.x, trunkProfileVertex.y, trunkProfileVertex.z)
      }
    }
    position.needsUpdate = true
    geometry.computeVertexNormals()
  }

  return geometry
}

function stabilizeTrunkPoints(points: THREE.Vector3[]) {
  if (points.length < 4) {
    for (let index = points.length; index < 4; index += 1) {
      const point = new THREE.Vector3()
      setTrunkPoint(point, index / 3, 0, 0.8, 0, 0)
      points.push(point)
    }
  }
  const last = Math.max(1, points.length - 1)
  for (let index = 0; index < points.length; index += 1) {
    let point = points[index]
    if (!point) {
      point = new THREE.Vector3()
      points[index] = point
    }
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) {
      setTrunkPoint(point, index / last, 0, 0.8, 0, 0)
    }
    if (index > 0 && point.distanceToSquared(points[index - 1]) < 0.000001) {
      point.z -= 0.002 * (index + 1)
      point.y += 0.001 * (index % 2 === 0 ? 1 : -1)
    }
  }
}

function softenTrunkBends(points: THREE.Vector3[], scratch: THREE.Vector3[], state: VacuumRuntime) {
  const last = points.length - 1
  const passes = Math.max(0, Math.floor(PRODUCTION_TUNING.movement.hoseCartoonBendSmoothingPasses))
  if (last < 3 || passes <= 0) return
  const baseRelaxation = clampValue(PRODUCTION_TUNING.movement.hoseCartoonBendRelaxation, 0, 0.48)
  const stretchRelaxation = 0.78 + state.hoseReachExtension * 0.22 + state.anchorTension * 0.08
  for (let pass = 0; pass < passes; pass += 1) {
    scratch[0].copy(points[0])
    scratch[last].copy(points[last])
    for (let index = 1; index < last; index += 1) {
      const pct = index / last
      const rootLock = smooth01((pct - 0.08) / 0.28)
      const tipLock = 1 - smooth01((pct - 0.9) / 0.1) * 0.46
      const bendWeight = Math.sin(pct * Math.PI) * rootLock * tipLock * baseRelaxation * stretchRelaxation
      hoseCartoonBendMidVector.copy(points[index - 1]).add(points[index + 1]).multiplyScalar(0.5)
      scratch[index].copy(points[index]).lerp(hoseCartoonBendMidVector, clampValue(bendWeight, 0, 0.52))
    }
    for (let index = 1; index < last; index += 1) {
      points[index].copy(scratch[index])
    }
  }
}

function ContinuousTrunk({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const body = useRef<THREE.Mesh>(null)
  const outline = useRef<THREE.Mesh>(null)
  const bands = useRef<Array<THREE.Group | null>>([])
  const smoothScratch = useMemo(() => Array.from({ length: TRUNK_CURVE_POINT_COUNT }, () => new THREE.Vector3()), [])
  const points = useMemo(
    () => Array.from({ length: TRUNK_CURVE_POINT_COUNT }, (_, index) => {
      const point = new THREE.Vector3()
      setTrunkPoint(point, index / (TRUNK_CURVE_POINT_COUNT - 1), 0, 0.8, 0, 0)
      return point
    }),
    [],
  )
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.55), [points])
  const bandPosition = useMemo(() => new THREE.Vector3(), [])
  const bandTangent = useMemo(() => new THREE.Vector3(), [])
  const bodyGeometry = useMemo(() => makeTrunkGeometry(points), [points])
  const outlineGeometry = useMemo(() => makeTrunkGeometry(points, 0.044), [points])
  const bodyMaterial = useMemo(
    () => new THREE.MeshToonMaterial({ color: '#68e7ef', gradientMap: getExperimentToonRampTexture() }),
    [],
  )
  const outlineMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: EXPERIMENT_SOFT_INK, side: THREE.BackSide }), [])
  useFrame(({ clock }) => {
    const state = runtime.current
    const t = clock.elapsedTime
    const suction = Math.max(0.45, state.pulse) + state.flash * 0.35

    for (let index = 0; index < points.length; index += 1) {
      setTrunkPoint(points[index], index / (points.length - 1), t, suction, state.flash, state.recoil, state.gulpFlow, state.gulpAge, state)
    }
    softenTrunkBends(points, smoothScratch, state)
    stabilizeTrunkPoints(points)
    curve.updateArcLengths()

    const radiusPressure = (pct: number) => {
      const glug = hoseGlugPressureAt(pct, t, state)
      const embedFront = smooth01((pct - 0.62) / 0.38) * state.deepEmbedDepth * 0.145
      const pivotBand = smooth01((pct - 0.48) / 0.52) * state.pivotSnapReadiness * 0.07
      const blowCenter = (t * 1.9 + state.hoseBlowReleasePulse * 0.18) % 1
      const blowBand = state.hoseBlowPressure > 0.012
        ? Math.exp(-((pct - blowCenter) ** 2) * 54) * state.hoseBlowPressure * 0.12
        : 0
      return glug * (0.16 + state.slimeHoseFlow * 0.055 + state.slimeHoseBolus * 0.035) + embedFront + pivotBand + blowBand
    }

    if (body.current) {
      const previous = body.current.geometry
      body.current.geometry = makeTrunkGeometry(points, 0, radiusPressure)
      previous.dispose()
    }
    if (outline.current) {
      const previous = outline.current.geometry
      outline.current.geometry = makeTrunkGeometry(points, 0.044, (pct) => radiusPressure(pct) * 0.9)
      previous.dispose()
    }

    for (let index = 0; index < TRUNK_BAND_COUNT; index += 1) {
      const band = bands.current[index]
      if (!band) continue
      const pct = (index + 0.5) / TRUNK_BAND_COUNT
      const phase = index * 0.74
      const gulpCenter = 1 - state.gulpAge * 2.45
      const gulpBand = state.gulpFlow > 0.005 && gulpCenter > -0.32
        ? Math.exp(-((pct - gulpCenter) ** 2) * 105) * state.gulpFlow * Math.max(0, 1 - state.gulpAge / 0.9)
        : 0
      const hoseGlug = hoseGlugPressureAt(pct, t, state)
      const blowAccordion = state.hoseBlowPressure * Math.sin(t * 14.6 - pct * 9.4 + phase) * 0.052
      const accordion = Math.sin(t * 10.4 + phase) * 0.026 * suction + state.recoil * 0.035 + gulpBand * 0.15 + hoseGlug * (0.34 + Math.sin(t * 14.2 + phase) * 0.045) + blowAccordion
      curve.getPointAt(pct, bandPosition)
      curve.getTangentAt(pct, bandTangent).normalize()
      band.position.copy(bandPosition)
      band.quaternion.setFromUnitVectors(trunkAxis, bandTangent)
      const tensionNarrow = Math.max(
        0.62,
        1 - smooth01((pct - 0.45) / 0.55) * (
          state.tetherStrain * 0.13
          + state.anchorTension * PRODUCTION_TUNING.suction.elasticHoseThinAmount
          + state.controllerGripQuality * 0.045
          + state.pivotHoseThinning * 1.08
          + state.pivotSnapReadiness * 0.04
        ),
      )
      const readyThrob = (state.suctionReadiness + state.controllerMouthSettle * 0.46) * smooth01((pct - 0.66) / 0.34) * 0.07
      band.scale.setScalar(trunkRadiusAt(pct) * (1.09 + accordion + readyThrob + hoseGlug * 0.18 + state.hoseBlowPressure * 0.11 + state.pivotSnapReadiness * 0.05) * tensionNarrow)
    }
  })

  return (
    <group>
      <mesh ref={outline} geometry={outlineGeometry} material={outlineMaterial} frustumCulled={false} />
      <mesh ref={body} geometry={bodyGeometry} material={bodyMaterial} frustumCulled={false} />
      {Array.from({ length: TRUNK_BAND_COUNT }, (_, index) => (
        <group
          key={index}
          ref={(node) => {
            bands.current[index] = node
          }}
        >
          <ExperimentOutlineMesh
            outlineWidth={0.035}
            outlineColor={EXPERIMENT_SOFT_INK}
            geometry={<torusGeometry args={[1, 0.08, 8, 20]} />}
            material={toon(index % 2 === 0 ? '#ecd15f' : '#cf6170')}
          />
        </group>
      ))}
    </group>
  )
}

function VacuumBody({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const root = useRef<THREE.Group>(null)
  const bodyShell = useRef<THREE.Group>(null)
  const bag = useRef<THREE.Group>(null)
  const bagOutlineShell = useRef<THREE.Mesh>(null)
  const bagFrontContour = useRef<THREE.Mesh>(null)
  const bagShockRingA = useRef<THREE.Mesh>(null)
  const bagShockRingB = useRef<THREE.Mesh>(null)
  const bagShockRingC = useRef<THREE.Mesh>(null)
  const bagEnergyBandA = useRef<THREE.Mesh>(null)
  const bagEnergyBandB = useRef<THREE.Mesh>(null)
  const bagEnergyBandC = useRef<THREE.Mesh>(null)
  const bagHighlight = useRef<THREE.Mesh>(null)
  const eyeGroup = useRef<THREE.Group>(null)
  const leftPupil = useRef<THREE.Mesh>(null)
  const rightPupil = useRef<THREE.Mesh>(null)
  const leftBrow = useRef<THREE.Group>(null)
  const rightBrow = useRef<THREE.Group>(null)
  const grin = useRef<THREE.Group>(null)
  const gaugeNeedle = useRef<THREE.Group>(null)
  const inspectionTag = useRef<THREE.Group>(null)
  const mouthDisc = useRef<THREE.Group>(null)
  const bagFill = useRef(0.22)
  const bagKick = useRef(0)
  const lastBagCycle = useRef(0)
  const lastGlugCycle = useRef(0)
  const bagWaveCursor = useRef(0)
  const bagWaveStarts = useRef([-9, -9, -9, -9])
  const bagWaveColors = useRef([
    new THREE.Color(BAG_WAVE_PALETTE[0]),
    new THREE.Color(BAG_WAVE_PALETTE[1]),
    new THREE.Color(BAG_WAVE_PALETTE[2]),
    new THREE.Color(BAG_WAVE_PALETTE[3]),
  ])
  const bagBloomCenters = useRef([
    new THREE.Vector2(-0.22, -0.12),
    new THREE.Vector2(0.18, 0.16),
    new THREE.Vector2(-0.04, 0.24),
    new THREE.Vector2(0.24, -0.18),
  ])
  const nozzleAnchor = useMemo(() => new THREE.Vector3(), [])
  const nozzleBefore = useMemo(() => new THREE.Vector3(), [])
  const nozzleTangent = useMemo(() => new THREE.Vector3(), [])
  const nozzleWorldPosition = useMemo(() => new THREE.Vector3(), [])
  const nozzleBeforeWorldPosition = useMemo(() => new THREE.Vector3(), [])
  const bodyVisualPosition = useMemo(() => new THREE.Vector3(), [])
  const bodyVisualRotation = useMemo(() => new THREE.Vector3(), [])
  const bodyVisualScale = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  const bodyTargetPosition = useMemo(() => new THREE.Vector3(), [])
  const bodyTargetRotation = useMemo(() => new THREE.Vector3(), [])
  const bodyTargetScale = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  const bodyVisualReady = useRef(false)
  const eyeAnchor = useMemo(() => new THREE.Vector3(), [])
  const eyeBefore = useMemo(() => new THREE.Vector3(), [])
  const eyeTangent = useMemo(() => new THREE.Vector3(), [])
  const eyeSide = useMemo(() => new THREE.Vector3(), [])
  const bagMaterial = useMemo(() => createBagPulseMaterial(), [])
  const mouthMaterial = useMemo(() => {
    const material = createMouthRingMaterial()
    material.side = THREE.DoubleSide
    return material
  }, []) as MouthRingMaterial

  useFrame(({ clock }, dt) => {
    const state = runtime.current
    const rootGroup = root.current
    if (!rootGroup) return
    const cappedDt = Math.min(dt, 0.04)
    const t = clock.elapsedTime
    const suction = state.pulse + state.flash * 0.55
    const swingFlex = state.swingEnergy
    const hookTension = state.swingTension
    const actionStretch = state.animationStretch
    const actionSlurp = state.animationSlurp
    const actionGlug = state.animationGlug
    const actionSnap = state.animationSnap
    const actionRecoil = state.animationRecoil
    const actionBag = state.animationBag
    const actionComplete = state.animationCompletion
    const actionMouth = state.animationMouthTug
    const actionJolt = state.animationBodyJolt
    const levelPulse = state.levelCompletionPulse
    const levelDisco = state.levelDiscoIntensity
    const completionBounce = state.levelCompletionVacuumBounce
    const completionSpin = state.levelCompletionVacuumSpin
    const completionGlow = state.levelCompletionGlow
    const defeatSink = state.levelDefeatVacuumSink
    const defeatWobble = state.levelDefeatGunkSpread
    const defeatSubmerge = FIRST_LEVEL_TUNING.lossVacuumSubmergeStrength
    const gulpFade = state.gulpFlow * Math.max(0, 1 - state.gulpAge / 0.95)
    const intakeHit = state.gulpFlow * Math.exp(-((state.gulpAge - 0.05) ** 2) * 120)
    const bodyHit = Math.max(state.gulpFlow * Math.exp(-((state.gulpAge - 0.22) ** 2) * 44), actionJolt * 0.34)
	    const bagTransfer = Math.max(state.gulpFlow * Math.exp(-((state.gulpAge - 0.4) ** 2) * 30), actionBag * 0.36 + actionComplete * 0.2)
	    const glugHit = Math.max(state.glugPulse * Math.exp(-((state.gulpAge - 0.08) ** 2) * 22), actionGlug * 0.48)
	    const slimeTintForWave = clampValue(state.bagSlimeTintStrength + state.bagSlimeTintPulse * 0.62, 0, 1)
    const bodyContactStability = clampValue(
      state.hoseHookStrength
        * Math.max(
          state.controllerMouthSettle * 0.82,
          state.suctionApproachPull * 0.72,
          state.deepEmbedLockStrength * 0.36,
          state.slimeOrganicHold * 0.32,
          state.pivotLocked ? 0.28 : 0,
        ),
      0,
      1,
    )
    const bodyMicroMotion = PRODUCTION_TUNING.movement.bodyMicroMotionScale * (1 - bodyContactStability * 0.72)
    const bodyImpactMotion = 0.58 - bodyContactStability * 0.34
    const bodyFlickerCalm = 1 - bodyContactStability * 0.55
	    const swallowed = state.swallowCycles - lastBagCycle.current
    if (swallowed > 0) {
      const events = Math.min(swallowed, 4)
      for (let index = 0; index < events; index += 1) {
        const slot = bagWaveCursor.current % 4
        const cycle = lastBagCycle.current + index + 1
        bagWaveStarts.current[slot] = t - index * 0.045
	        bagWaveColors.current[slot]
	          .set(BAG_WAVE_PALETTE[cycle % BAG_WAVE_PALETTE.length])
	          .lerp(state.bagSlimeColor, 0.58 + slimeTintForWave * 0.3)
        bagBloomCenters.current[slot].set((seededNoise(cycle * 7.31 + 0.4) - 0.5) * 0.72, (seededNoise(cycle * 4.73 + 2.1) - 0.5) * 0.54)
        bagWaveCursor.current += 1
      }
      bagFill.current = Math.min(PRODUCTION_TUNING.bag.bagMaxScale, bagFill.current + swallowed * 0.13)
      bagKick.current = Math.min(1.28, bagKick.current + swallowed * 0.46)
      lastBagCycle.current = state.swallowCycles
    }
    const glugged = state.glugCycles - lastGlugCycle.current
    if (glugged > 0) {
      const events = Math.min(glugged, 4)
      for (let index = 0; index < events; index += 1) {
        const slot = bagWaveCursor.current % 4
        const cycle = lastGlugCycle.current + index + 1
        bagWaveStarts.current[slot] = t - index * 0.035
	        bagWaveColors.current[slot]
	          .set(BAG_WAVE_PALETTE[(cycle + 3) % BAG_WAVE_PALETTE.length])
	          .lerp(state.bagSlimeColor, 0.5 + slimeTintForWave * 0.32)
        bagBloomCenters.current[slot].set((seededNoise(cycle * 5.41 + 0.8) - 0.5) * 0.68, (seededNoise(cycle * 6.13 + 1.6) - 0.5) * 0.52)
        bagWaveCursor.current += 1
      }
      bagKick.current = Math.min(1.28, bagKick.current + events * 0.17 + state.glugPulse * 0.26)
      lastGlugCycle.current = state.glugCycles
    }
    const fillTarget = clampValue(
      state.bagFill + state.bagPressure * 0.062 + state.bagFullPulse * 0.045 + state.bagReactionStrength * 0.028,
      PRODUCTION_TUNING.bag.bagBaseScale * 0.82,
      PRODUCTION_TUNING.bag.bagMaxScale,
    )
    bagFill.current = damp(bagFill.current, fillTarget, fillTarget > bagFill.current ? 2.8 : 0.42, cappedDt)
    bagKick.current = damp(bagKick.current, 0, 4.2, cappedDt)
    const bob = Math.sin(t * 3.2) * 0.016 * bodyMicroMotion
    const bodySpeedStretch = smooth01(state.velocity.length() / Math.max(0.001, PRODUCTION_TUNING.movement.maxSpeed))
      * PRODUCTION_TUNING.movement.stretchStrength
    const bodyDriveSquash = state.movementSquash
    const bodyTurnLean = state.movementLean
    const bodyTurnWobble = Math.sin(t * 12.5) * state.movementWobble
    bodyTargetPosition.copy(state.position)
    bodyTargetPosition.addScaledVector(state.forward, -(
      intakeHit * 0.032
        + bodyHit * 0.024 * bodyImpactMotion
        + glugHit * 0.022 * bodyImpactMotion
        + hookTension * 0.014
        + actionSlurp * 0.018
        + actionMouth * 0.012
    ))
    bodyTargetPosition.y += bob
      + state.recoil * 0.008
      + bodyHit * 0.012 * bodyImpactMotion
      + glugHit * 0.008 * bodyImpactMotion
      + actionRecoil * 0.01
      + actionComplete * 0.01
      + Math.sin(t * 2.4) * swingFlex * 0.005 * bodyMicroMotion
      + Math.abs(Math.sin(t * 5.4)) * completionBounce
      + levelPulse * 0.014
      - defeatSink * 0.32 * defeatSubmerge
    bodyTargetRotation.set(
      Math.sin(t * 3.4) * 0.008 * suction * bodyMicroMotion
        - intakeHit * 0.018
        - glugHit * 0.012 * bodyImpactMotion
        - actionMouth * 0.012
        - bodyDriveSquash * 0.55
        + Math.sin(t * 2.3) * hookTension * 0.011
        + Math.sin(t * 5.2) * completionBounce * 0.08,
      state.yaw
        + Math.sin(t * 1.9) * 0.015 * suction * bodyMicroMotion
        + Math.sin(t * 8.0) * 0.004 * state.flash * bodyFlickerCalm
        + bodyHit * 0.018 * bodyImpactMotion
        + glugHit * 0.01 * bodyImpactMotion
        + actionJolt * 0.01 * bodyImpactMotion
        + Math.sin(t * 1.6) * swingFlex * 0.011 * bodyFlickerCalm
        + Math.sin(t * 4.2) * completionSpin,
      Math.sin(t * 4.0) * 0.012 * suction * bodyMicroMotion
        + state.recoil * 0.016
        + Math.sin(t * 7.2) * gulpFade * 0.008 * bodyFlickerCalm
        + Math.sin(t * 6.8) * glugHit * 0.008 * bodyImpactMotion
        + bodyTurnLean
        + bodyTurnWobble
        + actionSnap * 0.018
        + actionRecoil * 0.012
        + Math.sin(t * 3.2) * hookTension * 0.022 * bodyFlickerCalm
        + Math.sin(t * 6.2) * completionBounce * 0.16
        + Math.sin(t * 10.6) * defeatWobble * 0.08,
    )
    bodyTargetScale.set(
      1 + bodyDriveSquash * 0.42 + state.recoil * 0.038 + state.flash * 0.016 * bodyFlickerCalm + bodyHit * 0.025 * bodyImpactMotion + glugHit * 0.021 * bodyImpactMotion + actionJolt * 0.014 * bodyImpactMotion + actionSnap * 0.018 + hookTension * 0.012 * bodyFlickerCalm + completionBounce * 0.13 + defeatSink * 0.09 * defeatSubmerge,
      1 - bodyDriveSquash * 0.34 + state.flash * 0.012 + intakeHit * 0.012 + glugHit * 0.009 * bodyImpactMotion + actionComplete * 0.014 - hookTension * 0.008 - actionSlurp * 0.012 + levelPulse * 0.02 - defeatSink * 0.16 * defeatSubmerge,
      1 + bodySpeedStretch + bodyDriveSquash * 0.2 - state.recoil * 0.018 - intakeHit * 0.018 - glugHit * 0.014 * bodyImpactMotion - actionMouth * 0.016 + bodyHit * 0.012 * bodyImpactMotion + actionStretch * 0.014 + swingFlex * 0.009 - completionBounce * 0.064 + defeatSink * 0.07 * defeatSubmerge,
    )
    if (!bodyVisualReady.current || bodyVisualPosition.distanceToSquared(state.position) > 3.24) {
      bodyVisualReady.current = true
      bodyVisualPosition.copy(bodyTargetPosition)
      bodyVisualRotation.copy(bodyTargetRotation)
      bodyVisualScale.copy(bodyTargetScale)
    } else {
      const visualPositionRate = PRODUCTION_TUNING.movement.bodyVisualPositionSmoothing * (1 - bodyContactStability * 0.5)
      const visualRotationRate = PRODUCTION_TUNING.movement.bodyVisualRotationSmoothing * (1 - bodyContactStability * 0.62)
      const visualScaleRate = PRODUCTION_TUNING.movement.bodyVisualScaleSmoothing * (1 - bodyContactStability * 0.32)
      bodyVisualPosition.lerp(bodyTargetPosition, 1 - Math.exp(-visualPositionRate * cappedDt))
      bodyVisualRotation.x = damp(bodyVisualRotation.x, bodyTargetRotation.x, visualRotationRate, cappedDt)
      bodyVisualRotation.y = dampAngle(bodyVisualRotation.y, bodyTargetRotation.y, visualRotationRate, cappedDt)
      bodyVisualRotation.z = damp(bodyVisualRotation.z, bodyTargetRotation.z, visualRotationRate, cappedDt)
      bodyVisualScale.lerp(bodyTargetScale, 1 - Math.exp(-visualScaleRate * cappedDt))
    }
    rootGroup.position.copy(bodyVisualPosition)
    rootGroup.rotation.set(bodyVisualRotation.x, bodyVisualRotation.y, bodyVisualRotation.z)
    rootGroup.scale.copy(bodyVisualScale)
    if (bodyShell.current) {
      const bodyBreath = Math.sin(t * 3.6) * 0.004 * suction * bodyMicroMotion
      bodyShell.current.position.set(
        0,
        0.02 + bodyBreath - state.recoil * 0.008 + bodyHit * 0.008 * bodyImpactMotion + actionComplete * 0.006,
        state.recoil * 0.012 + actionRecoil * 0.008 - state.flash * 0.004 - intakeHit * 0.012 - actionSlurp * 0.012,
      )
      bodyShell.current.scale.set(
        1 + state.recoil * 0.022 + bodyHit * 0.024 * bodyImpactMotion + actionJolt * 0.012 * bodyImpactMotion,
        1 - state.recoil * 0.012 + state.flash * 0.008 + intakeHit * 0.01 + actionComplete * 0.011,
        1 + state.flash * 0.009 - intakeHit * 0.014 - actionMouth * 0.011 + bodyHit * 0.02 * bodyImpactMotion + actionRecoil * 0.012,
      )
    }
    if (bag.current) {
      const inhale = Math.sin(t * 7.8) * 0.028 * suction
      const fill = bagFill.current
      const fillNormalized = state.bagFillNormalized || smooth01((fill - PRODUCTION_TUNING.bag.bagBaseScale) / (PRODUCTION_TUNING.bag.bagMaxScale - PRODUCTION_TUNING.bag.bagBaseScale))
      const kick = bagKick.current
      const bagReaction = state.bagReactionStrength
      const bagBulge = state.bagNonUniformBulge
      const bagGlow = state.bagGlow
      const internalMotion = state.bagInternalMotion
      const comboPulse = state.slimeComboPulse
      const comboBurst = state.slimeComboBurst
      const comboShock = state.slimeComboShockwave
      const comboVisualLevel = clampValue(Math.max(comboPulse * 0.78, comboBurst, comboShock * 0.64), 0, 2.2)
      const pressure = state.bagPressure + state.bagPulse * 0.46 + glugHit * 0.38 + state.bagFullPulse * 0.66 + actionBag * 0.48 + actionComplete * 0.34 + levelPulse * 0.38 + completionGlow * 0.24 + bagReaction * 0.22 + comboPulse * 0.4 + comboBurst * 0.3
      const rewardWobble = state.bagWobble + state.bagFullPulse * 0.8 + actionBag * 0.64 + actionComplete * 0.58 + levelDisco * 0.34 + bagBulge * 0.68 + comboPulse * 0.52 + comboBurst * 0.84
      const pressureShimmy = Math.sin(t * (6.4 + internalMotion * 0.46 + comboPulse * 0.9) + fill * 3.8) * rewardWobble * 0.028 + Math.sin(t * 9.2 + state.glugCycles * 0.37) * (state.bagPulse + actionGlug * 0.5 + bagGlow * 0.18 + comboBurst * 0.34) * 0.014
      const bagSway = Math.sin(t * 2.15 + fill * 3.2) * 0.018 * suction + kick * 0.014 + Math.sin(t * 2.9) * hookTension * 0.026 + Math.sin(t * 8.4) * glugHit * 0.02 + actionComplete * 0.018 + pressureShimmy
      bag.current.position.set(bagSway, 0.67 + fill * 0.05 + fillNormalized * 0.06 + kick * 0.032 + bagTransfer * 0.044 + pressure * 0.03 + actionComplete * 0.02 + swingFlex * 0.01, 0.81 + fill * 0.045 + fillNormalized * 0.05 + bagTransfer * 0.036 + pressure * 0.026 + actionBag * 0.026 + hookTension * 0.012)
      bag.current.rotation.x = -0.24 + Math.sin(t * 3.0) * 0.026 * suction - state.recoil * 0.04 - kick * 0.06 - bagTransfer * 0.068 - glugHit * 0.052 - actionBag * 0.054 - hookTension * 0.025 - rewardWobble * 0.018
      bag.current.rotation.y = Math.sin(t * 2.35) * 0.018 * suction + kick * 0.044 + bagTransfer * 0.054 + glugHit * 0.042 + actionComplete * 0.026 + Math.sin(t * 2.45) * swingFlex * 0.035 + Math.sin(t * 6.4) * rewardWobble * 0.032
      bag.current.rotation.z = Math.sin(t * 4.7) * 0.018 * suction + state.flash * 0.018 + Math.sin(t * 8.4) * kick * 0.046 + Math.sin(t * 9.6) * bagTransfer * 0.056 + Math.sin(t * 9.8) * glugHit * 0.06 + actionComplete * 0.036 + Math.sin(t * 4.2) * hookTension * 0.028 + Math.sin(t * 6.8 + fill) * rewardWobble * 0.044
      const asymmetricBulge = bagBulge * (0.84 + Math.sin(t * 3.25 + fillNormalized * 4.1) * 0.14)
      const pressureShoulder = pressure * (0.12 + fillNormalized * 0.055) + bagReaction * 0.052
      const bagMaxSize = PRODUCTION_TUNING.bag.bagMaxSize + PRODUCTION_TUNING.bag.comboBagScaleBoost * comboVisualLevel
      const stateScaleX = Math.max(0, state.bagScaleX - 1)
      const stateScaleY = Math.max(0, state.bagScaleY - 1)
      const stateScaleZ = Math.max(0, state.bagScaleZ - 1)
      bag.current.scale.set(
        clampValue(1.02 + fill * 0.15 + fillNormalized * 0.14 + kick * 0.14 + inhale * 0.1 + bagTransfer * 0.13 + pressureShoulder * 0.62 + asymmetricBulge * 0.23 + actionBag * 0.085 + actionComplete * 0.05 + rewardWobble * 0.04 + stateScaleX * 0.48 + hookTension * 0.018 + comboBurst * 0.07, 0.94, bagMaxSize),
        clampValue(1.02 + fill * 0.2 + fillNormalized * 0.18 + kick * 0.16 - inhale * (0.48 + bagReaction * 0.06) + state.recoil * 0.025 + bagTransfer * 0.14 + glugHit * 0.068 + state.bagFullPulse * 0.068 + actionComplete * 0.07 + stateScaleY * 0.48 - hookTension * 0.008 + comboBurst * 0.09, 0.92, bagMaxSize * 1.12),
        clampValue(1.02 + fill * 0.14 + fillNormalized * 0.13 + kick * 0.13 + inhale * 0.06 + bagTransfer * 0.125 + pressureShoulder * 0.56 + asymmetricBulge * 0.2 + actionBag * 0.075 + rewardWobble * 0.036 + stateScaleZ * 0.48 + swingFlex * 0.014 + comboPulse * 0.05, 0.94, bagMaxSize),
      )
      const outlineShock = clampValue(
        state.bagOutlineShock + state.bagShockwave * 0.42 + comboShock * 0.62 + state.bagPulse * 0.18 + glugHit * 0.22 + actionBag * 0.16 + comboBurst * 0.2,
        0,
        3.4,
      )
      if (bagOutlineShell.current) {
        const outlineVibration = PRODUCTION_TUNING.bag.bagOutlineVibration * outlineShock
        const outlinePulse = PRODUCTION_TUNING.bag.bagOutlinePulseWidth * outlineShock
        bagOutlineShell.current.scale.set(
          0.72 + PRODUCTION_TUNING.bag.bagOutlineWidth + outlinePulse * 0.66 + Math.sin(t * 42.0 + fill * 4.1) * outlineVibration,
          1.0 + PRODUCTION_TUNING.bag.bagOutlineWidth * 0.9 + outlinePulse * 0.96 + Math.sin(t * 48.0 + 0.7) * outlineVibration * 0.82,
          0.54 + PRODUCTION_TUNING.bag.bagOutlineWidth * 0.72 + outlinePulse * 0.54 + Math.sin(t * 37.0 + 1.3) * outlineVibration * 0.58,
        )
        bagOutlineShell.current.rotation.z = Math.sin(t * 31.0 + fill) * outlineShock * 0.012 + Math.sin(t * 7.4) * rewardWobble * 0.006
      }
      if (bagFrontContour.current) {
        const contourPulse = 0.035 + outlineShock * 0.036
        bagFrontContour.current.position.z = -0.535 - outlineShock * 0.006
        bagFrontContour.current.rotation.z = 0.14 + Math.sin(t * 22.0 + fill * 2.7) * outlineShock * 0.014
        bagFrontContour.current.scale.set(
          0.77 + fillNormalized * 0.05 + contourPulse + Math.sin(t * 34.0) * outlineShock * 0.006,
          1.02 + fillNormalized * 0.045 + contourPulse * 0.86 + Math.cos(t * 38.0 + 0.5) * outlineShock * 0.006,
          0.014,
        )
        const material = bagFrontContour.current.material as THREE.MeshBasicMaterial
        material.opacity = clampValue(0.76 + outlineShock * 0.08, 0.76, 0.96)
      }
      const shockPower = clampValue(state.bagShockwave + comboShock * 0.92, 0, 3.6)
      const shockDuration = PRODUCTION_TUNING.bag.bagShockwaveDuration + comboVisualLevel * 0.08
      const updateBagShockRing = (target: THREE.Mesh | null, index: number) => {
        if (!target) return
        const shockAge = Math.min(state.bagShockwaveAge, state.slimeComboShockwaveAge + (comboShock > 0.02 ? 0 : 99))
        const phase = (shockAge - index * PRODUCTION_TUNING.bag.bagShockwaveRingSpacing) / shockDuration
        const visible = shockPower > 0.025 && phase > 0 && phase < 1
        target.visible = visible
        const material = target.material as THREE.MeshBasicMaterial
        if (!visible) {
          material.opacity = 0
          return
        }
        const pop = Math.sin(phase * Math.PI)
        const spread = phase * (0.24 + shockPower * 0.102 + comboVisualLevel * 0.075)
        target.position.z = -0.502 - phase * 0.026
        target.rotation.z = index * 0.3 + Math.sin(t * 4.2 + index * 1.6) * 0.12 + outlineShock * 0.02
        target.scale.set(
          0.78 + fillNormalized * 0.06 + spread,
          1.04 + pressure * 0.014 + spread * 0.72,
          0.012,
        )
        material.color.set(
          comboVisualLevel > 0.45 && index === 2
            ? '#78ffe2'
            : comboVisualLevel > 0.2 && index === 1
              ? '#ffe36d'
              : comboVisualLevel > 0.12
                ? '#ff79d8'
                : EXPERIMENT_SOFT_INK,
        )
        material.opacity = clampValue(pop * shockPower * (0.42 - index * 0.06), 0, 0.82)
      }
      updateBagShockRing(bagShockRingA.current, 0)
      updateBagShockRing(bagShockRingB.current, 1)
      updateBagShockRing(bagShockRingC.current, 2)
      const bandStrength = clampValue(fillNormalized * 0.82 + bagGlow * 0.36 + state.bagPulse * 0.12 + state.bagFullPulse * 0.2 + actionBag * 0.14 + state.bagSlimeChroma * 0.12 + comboPulse * 0.3 + comboBurst * 0.34, 0, 2.25)
      bagBandColorA.copy(state.bagSlimeColor).lerp(bagBandGold, 0.18 + fillNormalized * 0.08)
      bagBandColorB.copy(state.bagSlimeColor).lerp(bagBandCyan, 0.24 + state.bagSlimeChroma * 0.08)
      bagBandColorC.copy(bagBandGold).lerp(state.bagSlimeColor, 0.58 + slimeTintForWave * 0.26)
      if (bagEnergyBandA.current) {
        const material = bagEnergyBandA.current.material as THREE.MeshBasicMaterial
        bagEnergyBandA.current.visible = bandStrength > 0.04
        bagEnergyBandA.current.rotation.z = 0.18 + Math.sin(t * 1.25 + fillNormalized * 2.2) * 0.09 + state.bagPulse * 0.032
        bagEnergyBandA.current.scale.set(0.37 + fillNormalized * 0.1 + bandStrength * 0.026, 0.094 + pressure * 0.014, 0.012)
        material.color.copy(bagBandColorA)
        material.opacity = clampValue(0.24 + bandStrength * 0.42 + state.bagPulse * 0.1, 0, 0.82)
      }
      if (bagEnergyBandB.current) {
        const material = bagEnergyBandB.current.material as THREE.MeshBasicMaterial
        bagEnergyBandB.current.visible = bandStrength > 0.1
        bagEnergyBandB.current.rotation.z = -0.38 + Math.sin(t * 1.05 + 1.7) * 0.12 - state.bagFullPulse * 0.034
        bagEnergyBandB.current.scale.set(0.29 + fillNormalized * 0.1 + bandStrength * 0.022, 0.076 + bagReaction * 0.01, 0.012)
        material.color.copy(bagBandColorB)
        material.opacity = clampValue(0.18 + bandStrength * 0.38 + state.bagFullPulse * 0.13, 0, 0.78)
      }
      if (bagEnergyBandC.current) {
        const material = bagEnergyBandC.current.material as THREE.MeshBasicMaterial
        bagEnergyBandC.current.visible = bandStrength > 0.16
        bagEnergyBandC.current.rotation.z = 0.74 + Math.sin(t * 1.14 + 3.1) * 0.1
        bagEnergyBandC.current.scale.set(0.25 + fillNormalized * 0.1 + bandStrength * 0.018, 0.058 + pressure * 0.01, 0.012)
        material.color.copy(bagBandColorC)
        material.opacity = clampValue(0.14 + bandStrength * 0.34 + state.bagPulse * 0.08, 0, 0.72)
      }
      if (bagHighlight.current) {
        const material = bagHighlight.current.material as THREE.MeshBasicMaterial
        bagHighlight.current.scale.set(0.13 + fillNormalized * 0.03 + pressure * 0.01, 0.05 + bandStrength * 0.008, 0.018)
        bagHighlight.current.position.set(-0.15 + Math.sin(t * 1.2) * 0.01, 0.2 + fillNormalized * 0.04, -0.456)
        material.opacity = clampValue(0.18 + bagGlow * 0.14 + state.bagPulse * 0.06, 0.12, 0.42)
      }
    }
    if (gaugeNeedle.current) {
      const gaugeKick = Math.min(1, state.pulse * 0.48 + state.flash * 0.54 + bagKick.current * 0.16 + bodyHit * 0.22 + bagTransfer * 0.28)
      gaugeNeedle.current.rotation.z = -0.62 + gaugeKick * 1.05 + Math.sin(t * 13.0) * state.flash * 0.08
    }
    if (inspectionTag.current) {
      const tagSwing = Math.sin(t * 6.1) * 0.08 * suction + state.recoil * 0.11 + bagKick.current * 0.08 + bagTransfer * 0.16
      inspectionTag.current.rotation.z = -0.18 + tagSwing
      inspectionTag.current.position.y = -0.08 + Math.sin(t * 5.2) * 0.008 * suction
    }
    bagMaterial.uniforms.uTime.value = t
    bagMaterial.uniforms.uPulse.value = suction + bagKick.current * 2.1 + bagTransfer * 1.72 + state.glugPulse * 1.35 + state.bagPulse * 1.22 + state.bagFullPulse * 1.02 + state.bagInternalMotion * 0.36 + actionBag * 1.08 + actionComplete * 0.78 + levelPulse * 0.86 + state.slimeComboPulse * 1.36 + state.slimeComboBurst * 1.18
    bagMaterial.uniforms.uFill.value = bagFill.current + bagKick.current * 0.4 + bagTransfer * 0.24 + state.bagBeauty * 0.16 + state.bagFillNormalized * 0.22 + actionBag * 0.08 + completionGlow * 0.04 + state.slimeComboBurst * 0.1
    bagMaterial.uniforms.uPressure.value = state.bagPressure + state.bagPulse * 0.36 + state.bagFullPulse * 0.52 + state.bagReactionStrength * 0.24 + actionBag * 0.3 + actionComplete * 0.22 + levelPulse * 0.24 + state.slimeComboPulse * 0.52
    bagMaterial.uniforms.uBeauty.value = state.bagBeauty + state.bagSlimeChroma * 0.24 + state.bagGlow * 0.42 + state.bagInternalMotion * 0.08 + actionComplete * 0.13 + completionGlow * 0.32 + state.slimeComboBurst * 0.32
    bagMaterial.uniforms.uFullPulse.value = Math.max(state.bagFullPulse, actionComplete * 0.55, levelPulse * 0.46, state.slimeComboBurst * 0.88)
	    bagMaterial.uniforms.uWobble.value = state.bagWobble + bagKick.current * 0.18 + actionBag * 0.22 + actionComplete * 0.16 + levelDisco * 0.16 + state.slimeComboPulse * 0.34 + state.slimeComboBurst * 0.45
	    bagMaterial.uniforms.uSuctionActive.value = Math.min(1.8, (state.hoseActive || state.pointerDown ? 1 : state.active ? 0.88 : 0) + bagKick.current * 0.6 + bagTransfer * 0.56 + state.glugPulse * 0.42 + state.bagFullPulse * 0.28 + actionGlug * 0.24 + actionComplete * 0.16 + levelDisco * 0.28 + state.slimeComboBurst * 0.36)
	    bagMaterial.uniforms.uSlimeTint.value.copy(state.bagSlimeColor)
	    bagMaterial.uniforms.uTintStrength.value = Math.min(2.9, state.bagSlimeTintStrength + state.bagSlimeTintPulse * 0.88 + state.bagSlimeChroma * 0.18 + state.slimeComboPulse * 0.18)
	    bagMaterial.uniforms.uWaveColor0.value.copy(bagWaveColors.current[0])
    bagMaterial.uniforms.uWaveColor1.value.copy(bagWaveColors.current[1])
    bagMaterial.uniforms.uWaveColor2.value.copy(bagWaveColors.current[2])
    bagMaterial.uniforms.uWaveColor3.value.copy(bagWaveColors.current[3])
    bagMaterial.uniforms.uWaveAge0.value = t - bagWaveStarts.current[0]
    bagMaterial.uniforms.uWaveAge1.value = t - bagWaveStarts.current[1]
    bagMaterial.uniforms.uWaveAge2.value = t - bagWaveStarts.current[2]
    bagMaterial.uniforms.uWaveAge3.value = t - bagWaveStarts.current[3]
    bagMaterial.uniforms.uBloomCenter0.value.copy(bagBloomCenters.current[0])
    bagMaterial.uniforms.uBloomCenter1.value.copy(bagBloomCenters.current[1])
    bagMaterial.uniforms.uBloomCenter2.value.copy(bagBloomCenters.current[2])
    bagMaterial.uniforms.uBloomCenter3.value.copy(bagBloomCenters.current[3])
    if (eyeGroup.current) {
      const focus = Math.min(1, state.pulse * 0.36 + state.flash * 0.48 + bodyHit * 0.22 + (state.hoseActive || state.pointerDown ? 0.2 : 0))
      const defeatSad = clampValue(
        Math.max(defeatSink, defeatWobble * 0.72, state.levelDefeatTriggered ? 0.58 : 0),
        0,
        1,
      )
      const faceSuction = Math.max(0.45, state.pulse) + state.flash * 0.35
      const eyePct = 0.55 + Math.sin(t * 1.12) * 0.014 * suction
      setTrunkPoint(eyeAnchor, eyePct, t + 0.08, faceSuction, state.flash, state.recoil, state.gulpFlow, state.gulpAge, state)
      setTrunkPoint(eyeBefore, Math.max(0.08, eyePct - 0.08), t + 0.08, faceSuction, state.flash, state.recoil, state.gulpFlow, state.gulpAge, state)
      eyeTangent.copy(eyeAnchor).sub(eyeBefore).normalize()
      eyeSide.set(-eyeTangent.z, 0, eyeTangent.x)
      if (eyeSide.lengthSq() < 0.001) eyeSide.set(1, 0, 0)
      eyeSide.normalize()
      const hoseY = eyeAnchor.y
      const orbit = Math.sin(t * 2.2 + 0.4) * 0.024 * suction + state.flash * 0.01
      const eyeLift = trunkRadiusAt(eyePct) * 1.34 + PRODUCTION_TUNING.movement.hoseEyeLift + focus * 0.014 - defeatSad * 0.032
      eyeAnchor
        .addScaledVector(eyeSide, orbit - 0.006)
      eyeAnchor.y = Math.max(hoseY + eyeLift, eyeAnchor.y + eyeLift)
      eyeAnchor.z -= 0.042 + focus * 0.014 - defeatSad * 0.012
      eyeGroup.current.position.set(
        eyeAnchor.x + Math.sin(t * 6.2) * 0.004 * suction,
        eyeAnchor.y + Math.sin(t * 4.6) * 0.005 * suction - defeatSad * 0.042,
        eyeAnchor.z,
      )
      eyeGroup.current.rotation.set(
        -0.062 + Math.sin(t * 4.0) * 0.01 * suction + eyeTangent.y * 0.08 - defeatSad * 0.11,
        Math.sin(t * 3.8) * 0.012 * suction - eyeTangent.x * 0.1,
        Math.sin(t * 8.0) * 0.012 * state.flash + orbit * 0.18 - defeatSad * 0.06,
      )
      if (leftPupil.current && rightPupil.current) {
        const jitterX = Math.sin(t * 6.8) * 0.003 * suction
        const jitterY = Math.cos(t * 5.9) * 0.0025 * suction
        const pupilDrift = PRODUCTION_TUNING.movement.hosePupilDumbDrift
        const pupilCross = PRODUCTION_TUNING.movement.hosePupilCross + focus * 0.006 + defeatSad * 0.024
        leftPupil.current.position.set(
          -PRODUCTION_TUNING.movement.hoseEyeSpread
            + pupilCross
            + jitterX
            + Math.sin(t * 1.35 + 0.35) * pupilDrift,
          -0.014
            - focus * 0.006
            - defeatSad * 0.038
            - PRODUCTION_TUNING.movement.hoseEyeWonk * 0.08
            + jitterY
            + Math.cos(t * 1.35) * pupilDrift * 0.55,
          -0.065,
        )
        rightPupil.current.position.set(
          PRODUCTION_TUNING.movement.hoseEyeSpread
            - pupilCross
            + jitterX
            + Math.sin(t * 1.1 + 2.1) * pupilDrift * 0.62,
          -0.006
            - focus * 0.004
            - defeatSad * 0.038
            + PRODUCTION_TUNING.movement.hoseEyeWonk * 0.08
            - jitterY
            + Math.sin(t * 1.6 + 1.3) * pupilDrift * 0.45,
          -0.065,
        )
        leftPupil.current.scale.set(0.076 + state.flash * 0.004 - defeatSad * 0.012, 0.09 + focus * 0.005 + defeatSad * 0.018, 0.02)
        rightPupil.current.scale.set(0.074 + state.flash * 0.004 - defeatSad * 0.012, 0.087 + focus * 0.005 + defeatSad * 0.018, 0.02)
      }
      if (leftBrow.current && rightBrow.current) {
        leftBrow.current.rotation.z = 0.08 + PRODUCTION_TUNING.movement.hoseBrowGoofyTilt * 0.42 + focus * 0.018 + state.flash * 0.014 - defeatSad * 0.46
        rightBrow.current.rotation.z = -0.08 - PRODUCTION_TUNING.movement.hoseBrowGoofyTilt * 0.42 - focus * 0.016 - state.flash * 0.012 + defeatSad * 0.46
        leftBrow.current.position.y = 0.216 + focus * 0.006 + PRODUCTION_TUNING.movement.hoseEyeWonk * 0.06 - defeatSad * 0.038
        rightBrow.current.position.y = 0.216 + focus * 0.005 - PRODUCTION_TUNING.movement.hoseEyeWonk * 0.04 - defeatSad * 0.038
      }
      if (grin.current) {
        grin.current.position.y = -0.098 - focus * 0.004 + state.flash * 0.005 - defeatSad * 0.04
        grin.current.scale.set(1 + focus * 0.06 - defeatSad * 0.16, 1 + state.flash * 0.18 - defeatSad * 0.24, 1)
        grin.current.rotation.z = Math.sin(t * 6.8) * 0.018 * state.flash + defeatSad * Math.PI
      }
    }
    mouthMaterial.uniforms.uTime.value = t
    mouthMaterial.uniforms.uPulse.value = state.pulse + state.flash * 1.4 + intakeHit * 0.9 + state.glugPulse * 0.85 + state.slimeMouthThread * 0.42 + actionMouth * 0.6 + actionGlug * 0.38
    if (mouthDisc.current) {
      const pulse = Math.sin(t * 12.0) * 0.018 * suction * (0.75 + bodyMicroMotion * 0.25)
      const trunkSuction = Math.max(0.45, state.pulse) + state.flash * 0.35
	      setTrunkPoint(nozzleAnchor, 1, t, trunkSuction, state.flash, state.recoil, state.gulpFlow, state.gulpAge, state)
	      setTrunkPoint(nozzleBefore, 0.94, t, trunkSuction, state.flash, state.recoil, state.gulpFlow, state.gulpAge, state)
	      nozzleAnchor.y += 0.02
	      nozzleBefore.y += 0.02
	      nozzleTangent.copy(nozzleAnchor).sub(nozzleBefore).normalize()
		      const embedDepthN = smooth01(state.deepEmbedDepth / Math.max(0.001, PRODUCTION_TUNING.embed.embedDepthMax))
		      const effectiveMouthLock = clampValue(
		        Math.max(
		          state.hoseHookStrength,
		          state.mouthSurfaceCompression * 0.54,
		          state.mouthSealRing * 0.44,
		          embedDepthN * PRODUCTION_TUNING.embed.embedTipLockDepthScale,
		          state.deepEmbedRimOcclusion * PRODUCTION_TUNING.embed.embedTipLockOcclusionScale,
		          state.deepEmbedLockStrength * 0.38,
		        ),
		        0,
		        1,
		      )
		      const embeddedMouth = clampValue(
		        effectiveMouthLock * Math.max(
		          state.suctionApproachLocked ? 0.22 : 0,
		          state.controllerMouthSettle * 0.42,
		          state.mouthSurfaceCompression * 0.62,
		          state.mouthSealRing * 0.44,
		          embedDepthN,
		          state.deepEmbedLockStrength * 0.18,
		        ),
	        0,
	        1,
	      )
      const mouthWiggleCalm = 1 - clampValue(
        embeddedMouth * 0.78
          + state.hoseContactSettle * 0.54
          + (state.suctionState === 'sealed' ? 0.72 : state.suctionState === 'contact' ? 0.42 : 0)
          + (state.hoseActive || state.pointerDown ? PRODUCTION_TUNING.movement.hoseAimMouthWiggleCalm * 0.24 : 0),
        0,
        0.97,
      )
      rootGroup.updateMatrixWorld(true)
      if (bodyShell.current) {
        nozzleWorldPosition.copy(nozzleAnchor)
        bodyShell.current.localToWorld(nozzleWorldPosition)
        rootGroup.worldToLocal(nozzleWorldPosition)
        nozzleBeforeWorldPosition.copy(nozzleBefore)
        bodyShell.current.localToWorld(nozzleBeforeWorldPosition)
        rootGroup.worldToLocal(nozzleBeforeWorldPosition)
      } else {
        nozzleWorldPosition.copy(nozzleAnchor)
        nozzleBeforeWorldPosition.copy(nozzleBefore)
      }
      mouthDisc.current.position.copy(nozzleWorldPosition)
      nozzleTangent.copy(nozzleWorldPosition).sub(nozzleBeforeWorldPosition)
      if (nozzleTangent.lengthSq() > 0.0004) {
        nozzleTangent.normalize()
      } else {
        nozzleTangent.copy(nozzleAnchor).sub(nozzleBefore).normalize()
      }
      mouthDisc.current.quaternion.setFromUnitVectors(trunkMouthAxis, nozzleTangent)
      mouthDisc.current.rotateZ(Math.sin(t * 7.2) * 0.032 * suction * mouthWiggleCalm)
      mouthDisc.current.rotateX(Math.sin(t * 5.8) * 0.012 * suction * mouthWiggleCalm)
      mouthDisc.current.rotateY(Math.sin(t * 5.2 + 0.8) * 0.016 * suction * mouthWiggleCalm)
	      mouthDisc.current.scale.set(
	        1 + pulse + state.flash * 0.08 + intakeHit * 0.12 + glugHit * 0.18 + actionMouth * 0.12 + state.slimeMouthThread * 0.08 - embeddedMouth * 0.1,
	        1 - pulse * 0.6 + state.recoil * 0.035 + intakeHit * 0.04 - glugHit * 0.04 - actionGlug * 0.04 + state.slimeMouthThread * 0.035 - embeddedMouth * 0.14,
	        1 + state.recoil * 0.08 + intakeHit * 0.08 + glugHit * 0.1 + actionSlurp * 0.08 + state.slimeMouthThread * 0.06 - embeddedMouth * 0.18,
	      )
    }
  })

  return (
    <group ref={root}>
      <group ref={bodyShell} position={[0, 0.02, 0]}>
        <ExperimentOutlineMesh
          position={[0, 0.14, 0.58]}
          rotation-x={Math.PI / 2}
          scale={[0.72, 0.47, 0.78]}
          outlineWidth={0.05}
          geometry={<cylinderGeometry args={[0.88, 1, 1, 16]} />}
          material={toon('#78c8d5')}
        />
        <ExperimentOutlineMesh
          position={[0, 0.17, -0.05]}
          rotation-x={Math.PI / 2}
          scale={[0.34, 0.27, 0.36]}
          outlineWidth={0.032}
          geometry={<cylinderGeometry args={[1, 0.74, 1, 14]} />}
          material={toon('#ff766d')}
        />
        <ExperimentOutlineMesh
          position={[0, 0.2, 0.19]}
          scale={[1, 0.84, 1]}
          outlineWidth={0.019}
          geometry={<torusGeometry args={[0.32, 0.042, 8, 22]} />}
          material={toon(PALETTE.warningYellow)}
        />
        <group position={[-0.31, 0.46, -0.42]} rotation-x={Math.PI / 2}>
          <ExperimentOutlineMesh
            scale={[0.13, 0.13, 0.025]}
            outlineWidth={0.012}
            geometry={<cylinderGeometry args={[1, 1, 1, 16]} />}
            material={toon(PALETTE.bone)}
          />
          <mesh position={[0, 0, -0.032]} scale={[0.086, 0.086, 0.008]}>
            <cylinderGeometry args={[1, 1, 1, 16]} />
            <meshBasicMaterial color="#8beeff" toneMapped={false} />
          </mesh>
          {[
            [-0.055, 0.066, -0.046, 0.45],
            [0, 0.078, -0.046, 0],
            [0.055, 0.066, -0.046, -0.45],
          ].map(([x, y, z, rotate], index) => (
            <mesh key={`gauge-tick-${index}`} position={[x, y, z]} rotation-z={rotate} scale={[0.008, 0.026, 0.006]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={EXPERIMENT_DETAIL_INK} />
            </mesh>
          ))}
          <group ref={gaugeNeedle} position={[0, 0, -0.056]}>
            <mesh position={[0.036, 0, 0]} scale={[0.046, 0.007, 0.006]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={PALETTE.rust} />
            </mesh>
            <mesh scale={[0.014, 0.014, 0.007]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshBasicMaterial color={EXPERIMENT_DETAIL_INK} />
            </mesh>
          </group>
        </group>
        <group position={[0.29, 0.43, -0.4]} rotation-z={-0.04}>
          <ExperimentOutlineMesh
            scale={[0.19, 0.066, 0.025]}
            outlineWidth={0.01}
            geometry={<boxGeometry args={[1, 1, 1]} />}
            material={toon('#99cfdd')}
          />
          <DetailRivet position={[-0.078, 0.025, -0.018]} scale={0.012} color={PALETTE.warningYellow} />
          <DetailRivet position={[0.078, 0.025, -0.018]} scale={0.012} color={PALETTE.warningYellow} />
          <DetailRivet position={[-0.078, -0.025, -0.018]} scale={0.012} color={PALETTE.warningYellow} />
          <DetailRivet position={[0.078, -0.025, -0.018]} scale={0.012} color={PALETTE.warningYellow} />
          {[-0.038, 0, 0.038].map((x) => (
            <mesh key={`service-slot-${x}`} position={[x, 0, -0.032]} scale={[0.018, 0.034, 0.006]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={EXPERIMENT_DETAIL_INK} />
            </mesh>
          ))}
        </group>
        <group ref={eyeGroup} position={[0, 0.83, -0.68]} rotation-x={-0.08}>
          {[-1, 1].map((side) => (
            <ExperimentOutlineMesh
              key={`eye-read-pad-${side}`}
              position={[
                side * PRODUCTION_TUNING.movement.hoseEyeSpread + side * PRODUCTION_TUNING.movement.hoseEyeWonk * 0.04,
                -0.002,
                0.058,
              ]}
              scale={[0.174, 0.214, 0.014]}
              outlineWidth={0.012}
              geometry={<sphereGeometry args={[1, 14, 8]} />}
              material={toon('#fff0b6')}
            />
          ))}
          <ExperimentOutlineMesh
            position={[-PRODUCTION_TUNING.movement.hoseEyeSpread * 0.72, -0.125, 0.018]}
            rotation-z={0.11}
            scale={[0.018, 0.102, 0.022]}
            outlineWidth={0.007}
            geometry={<cylinderGeometry args={[1, 1, 1, 8]} />}
            material={toon(PALETTE.bone)}
          />
          <ExperimentOutlineMesh
            position={[PRODUCTION_TUNING.movement.hoseEyeSpread * 0.72, -0.125, 0.018]}
            rotation-z={-0.11}
            scale={[0.018, 0.102, 0.022]}
            outlineWidth={0.007}
            geometry={<cylinderGeometry args={[1, 1, 1, 8]} />}
            material={toon(PALETTE.bone)}
          />
          <group ref={leftBrow} position={[-PRODUCTION_TUNING.movement.hoseEyeSpread, 0.216, -0.082]} rotation-z={0.12}>
            <ExperimentOutlineMesh
              scale={[0.078, 0.017, 0.026]}
              outlineWidth={0.005}
              geometry={<boxGeometry args={[1, 1, 1]} />}
              material={toon(EXPERIMENT_DETAIL_INK)}
            />
          </group>
          <group ref={rightBrow} position={[PRODUCTION_TUNING.movement.hoseEyeSpread, 0.216, -0.082]} rotation-z={-0.12}>
            <ExperimentOutlineMesh
              scale={[0.078, 0.017, 0.026]}
              outlineWidth={0.005}
              geometry={<boxGeometry args={[1, 1, 1]} />}
              material={toon(EXPERIMENT_DETAIL_INK)}
            />
          </group>
          <ExperimentOutlineMesh
            position={[
              -PRODUCTION_TUNING.movement.hoseEyeSpread - PRODUCTION_TUNING.movement.hoseEyeWonk * 0.12,
              -PRODUCTION_TUNING.movement.hoseEyeWonk * 0.08,
              0,
            ]}
            scale={[
              0.146 * PRODUCTION_TUNING.movement.hoseEyeGoofyScale,
              0.182 * (PRODUCTION_TUNING.movement.hoseEyeGoofyScale + 0.02),
              0.086,
            ]}
            outlineWidth={0.023}
            geometry={<sphereGeometry args={[1, 12, 8]} />}
            material={toon(PALETTE.offWhite)}
          />
          <mesh ref={leftPupil} position={[-PRODUCTION_TUNING.movement.hoseEyeSpread + PRODUCTION_TUNING.movement.hosePupilCross, -0.014, -0.065]} scale={[0.072, 0.086, 0.018]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color={EXPERIMENT_DETAIL_INK} />
          </mesh>
          <mesh
            position={[
              -PRODUCTION_TUNING.movement.hoseEyeSpread - 0.036,
              0.058,
              -0.074,
            ]}
            scale={[0.046, 0.05, 0.007]}
          >
            <sphereGeometry args={[1, 8, 5]} />
            <meshBasicMaterial color="#fff9e8" toneMapped={false} />
          </mesh>
          <ExperimentOutlineMesh
            position={[
              PRODUCTION_TUNING.movement.hoseEyeSpread + PRODUCTION_TUNING.movement.hoseEyeWonk * 0.1,
              PRODUCTION_TUNING.movement.hoseEyeWonk * 0.06,
              0.002,
            ]}
            scale={[
              0.142 * PRODUCTION_TUNING.movement.hoseEyeGoofyScale,
              0.178 * PRODUCTION_TUNING.movement.hoseEyeGoofyScale,
              0.084,
            ]}
            outlineWidth={0.023}
            geometry={<sphereGeometry args={[1, 12, 8]} />}
            material={toon(PALETTE.offWhite)}
          />
          <mesh ref={rightPupil} position={[PRODUCTION_TUNING.movement.hoseEyeSpread - PRODUCTION_TUNING.movement.hosePupilCross, -0.006, -0.065]} scale={[0.07, 0.083, 0.018]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color={EXPERIMENT_DETAIL_INK} />
          </mesh>
          <mesh
            position={[
              PRODUCTION_TUNING.movement.hoseEyeSpread - 0.036,
              0.058,
              -0.074,
            ]}
            scale={[0.044, 0.048, 0.007]}
          >
            <sphereGeometry args={[1, 8, 5]} />
            <meshBasicMaterial color="#fff9e8" toneMapped={false} />
          </mesh>
          <group ref={grin} position={[0, -0.098, -0.086]}>
            <ExperimentOutlineMesh
              rotation-z={Math.PI}
              scale={[1, 0.78, 1]}
              outlineWidth={0.006}
              geometry={<torusGeometry args={[PRODUCTION_TUNING.movement.hoseSmileWidth, 0.014, 8, 18, Math.PI]} />}
              material={toon(EXPERIMENT_DETAIL_INK)}
            />
          </group>
        </group>
        <group ref={bag} position={[0, 0.67, 0.81]}>
          <group scale={[0.72, 0.72, 0.72]}>
          <mesh ref={bagOutlineShell} scale={[0.64, 0.9, 0.48]} renderOrder={7} frustumCulled={false}>
            <sphereGeometry args={[1, 20, 14]} />
            <meshBasicMaterial color={EXPERIMENT_SOFT_INK} side={THREE.FrontSide} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh scale={[0.58, 0.84, 0.43]} renderOrder={8} frustumCulled={false}>
            <sphereGeometry args={[1, 28, 18]} />
            <primitive object={bagMaterial} attach="material" />
          </mesh>
          <mesh ref={bagFrontContour} position={[0, 0.02, -0.535]} scale={[0.82, 1.05, 0.014]} renderOrder={16} frustumCulled={false}>
            <torusGeometry args={[1, 0.026, 8, 64]} />
            <meshBasicMaterial color={EXPERIMENT_SOFT_INK} transparent opacity={0.82} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh ref={bagShockRingA} position={[0, 0.02, -0.492]} scale={[0.35, 0.22, 0.012]} renderOrder={13} visible={false} frustumCulled={false}>
            <torusGeometry args={[1, 0.035, 8, 44]} />
            <meshBasicMaterial color={EXPERIMENT_SOFT_INK} transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
          </mesh>
          <mesh ref={bagShockRingB} position={[0, 0.02, -0.492]} scale={[0.35, 0.22, 0.012]} renderOrder={14} visible={false} frustumCulled={false}>
            <torusGeometry args={[1, 0.03, 8, 40]} />
            <meshBasicMaterial color={EXPERIMENT_SOFT_INK} transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
          </mesh>
          <mesh ref={bagShockRingC} position={[0, 0.02, -0.492]} scale={[0.35, 0.22, 0.012]} renderOrder={15} visible={false} frustumCulled={false}>
            <torusGeometry args={[1, 0.026, 8, 36]} />
            <meshBasicMaterial color={EXPERIMENT_SOFT_INK} transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
          </mesh>
          <mesh ref={bagEnergyBandA} position={[0.01, 0.04, -0.445]} scale={[0.02, 0.02, 0.012]} renderOrder={9} frustumCulled={false}>
            <torusGeometry args={[1, 0.13, 8, 40]} />
            <meshBasicMaterial color="#ff79d8" transparent opacity={0.42} depthWrite={false} />
          </mesh>
          <mesh ref={bagEnergyBandB} position={[-0.035, -0.055, -0.452]} scale={[0.02, 0.02, 0.012]} renderOrder={10} frustumCulled={false}>
            <torusGeometry args={[1, 0.12, 8, 40]} />
            <meshBasicMaterial color="#ffe36d" transparent opacity={0.34} depthWrite={false} />
          </mesh>
          <mesh ref={bagEnergyBandC} position={[0.07, 0.12, -0.458]} scale={[0.02, 0.02, 0.012]} renderOrder={11} frustumCulled={false}>
            <torusGeometry args={[1, 0.1, 8, 36]} />
            <meshBasicMaterial color="#78ffe2" transparent opacity={0.3} depthWrite={false} />
          </mesh>
          <mesh ref={bagHighlight} position={[-0.15, 0.2, -0.456]} scale={[0.02, 0.02, 0.018]} renderOrder={12} frustumCulled={false}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color="#f3f0ff" transparent opacity={0.24} depthWrite={false} />
          </mesh>
          <ExperimentOutlineMesh
            position={[0, 0.02, -0.468]}
            scale={[0.32, 0.022, 0.014]}
            outlineWidth={0.005}
            geometry={<boxGeometry args={[1, 1, 1]} />}
            material={toon(EXPERIMENT_DETAIL_INK)}
          />
          {[-0.345, 0.345].map((x) => (
            <group key={`bag-buckle-${x}`} position={[x, 0.03, -0.365]} rotation-z={x < 0 ? 0.08 : -0.08}>
              <ExperimentOutlineMesh
                scale={[0.056, 0.086, 0.03]}
                outlineWidth={0.007}
                geometry={<boxGeometry args={[1, 1, 1]} />}
                material={toon(PALETTE.warningYellow)}
              />
              <mesh position={[0, 0, -0.018]} scale={[0.026, 0.044, 0.008]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color={EXPERIMENT_DETAIL_INK} />
              </mesh>
            </group>
          ))}
          <ExperimentOutlineMesh
            position={[0.335, -0.037, -0.365]}
            rotation-z={-0.12}
            scale={[0.014, 0.064, 0.01]}
            outlineWidth={0.004}
            geometry={<boxGeometry args={[1, 1, 1]} />}
            material={toon(EXPERIMENT_DETAIL_INK)}
          />
          <group ref={inspectionTag} position={[0.335, -0.08, -0.372]} rotation-z={-0.18}>
            <ExperimentOutlineMesh
              rotation-x={Math.PI / 2}
              scale={[0.032, 0.032, 0.01]}
              outlineWidth={0.004}
              geometry={<torusGeometry args={[1, 0.18, 6, 12]} />}
              material={toon(PALETTE.warningYellow)}
            />
            <ExperimentOutlineMesh
              position={[0, -0.07, -0.006]}
              rotation-z={0.12}
              scale={[0.052, 0.076, 0.014]}
              outlineWidth={0.005}
              geometry={<boxGeometry args={[1, 1, 1]} />}
              material={toon(PALETTE.bone)}
            />
            <mesh position={[0, -0.072, -0.016]} scale={[0.026, 0.009, 0.004]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={PALETTE.rust} />
            </mesh>
          </group>
          </group>
        </group>
        <group position={[0, 0.0, 0.06]}>
          <ExperimentOutlineMesh
            position={[-0.46, 0.0, 0.72]}
            rotation-z={Math.PI / 2}
            scale={[0.18, 0.18, 0.12]}
            outlineWidth={0.024}
            geometry={<cylinderGeometry args={[1, 1, 1, 12]} />}
            material={toon(EXPERIMENT_DETAIL_INK)}
          />
          <ExperimentOutlineMesh
            position={[-0.58, 0.0, 0.72]}
            rotation-z={Math.PI / 2}
            scale={[0.068, 0.068, 0.026]}
            outlineWidth={0.009}
            geometry={<cylinderGeometry args={[1, 1, 1, 12]} />}
            material={toon(PALETTE.warningYellow)}
          />
          <ExperimentOutlineMesh
            position={[0.46, 0.0, 0.72]}
            rotation-z={Math.PI / 2}
            scale={[0.18, 0.18, 0.12]}
            outlineWidth={0.024}
            geometry={<cylinderGeometry args={[1, 1, 1, 12]} />}
            material={toon(EXPERIMENT_DETAIL_INK)}
          />
          <ExperimentOutlineMesh
            position={[0.58, 0.0, 0.72]}
            rotation-z={Math.PI / 2}
            scale={[0.068, 0.068, 0.026]}
            outlineWidth={0.009}
            geometry={<cylinderGeometry args={[1, 1, 1, 12]} />}
            material={toon(PALETTE.warningYellow)}
          />
        </group>
        <ExperimentOutlineMesh
          position={[-0.44, 0.63, 0.61]}
          scale={[0.08, 0.48, 0.09]}
          outlineWidth={0.02}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          material={toon(EXPERIMENT_DETAIL_INK)}
        />
        <ExperimentOutlineMesh
          position={[0.44, 0.63, 0.61]}
          scale={[0.08, 0.48, 0.09]}
          outlineWidth={0.02}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          material={toon(EXPERIMENT_DETAIL_INK)}
        />
        <ExperimentOutlineMesh
          position={[0, 0.9, 0.6]}
          scale={[0.58, 0.1, 0.14]}
          outlineWidth={0.024}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          material={toon(PALETTE.bone)}
        />
        {[-0.25, 0, 0.25].map((x) => (
          <ExperimentOutlineMesh
            key={`handle-grip-${x}`}
            position={[x, 0.925, 0.49]}
            scale={[0.032, 0.038, 0.03]}
            outlineWidth={0.006}
            geometry={<boxGeometry args={[1, 1, 1]} />}
            material={toon(x === 0 ? PALETTE.warningYellow : '#f0a65c')}
          />
        ))}
        <ContinuousTrunk runtime={runtime} />
      </group>
      <group ref={mouthDisc} position={[-0.035, 0.1, -1.43]}>
        <ExperimentOutlineMesh
          rotation-x={Math.PI / 2}
          scale={[0.26, 0.21, 0.23]}
          outlineWidth={0.032}
          geometry={<cylinderGeometry args={[0.8, 1, 1, 16]} />}
          material={toon('#ffa15c')}
        />
        <ExperimentOutlineMesh
          position={[0, 0, 0.08]}
          scale={[1, 0.78, 1]}
          outlineWidth={0.026}
          geometry={<torusGeometry args={[0.22, 0.048, 8, 24]} />}
          material={toon('#ffa15c')}
        />
        <ExperimentOutlineMesh
          position={[0, 0, -0.17]}
          scale={[1, 0.78, 1]}
          outlineWidth={0.032}
          geometry={<torusGeometry args={[0.245, 0.058, 10, 28]} />}
          material={toon(PALETTE.warningYellow)}
        />
        <ExperimentOutlineMesh
          position={[0, 0.01, -0.18]}
          scale={[1, 0.72, 1]}
          outlineWidth={0.014}
          geometry={<torusGeometry args={[0.152, 0.022, 8, 18]} />}
          material={toon(EXPERIMENT_DETAIL_INK)}
        />
        {[
          [-0.18, 0.12, -0.19],
          [0.18, 0.12, -0.19],
          [-0.18, -0.12, -0.19],
          [0.18, -0.12, -0.19],
        ].map(([x, y, z], index) => (
          <DetailRivet
            key={`nozzle-clamp-screw-${index}`}
            position={[x, y, z]}
            scale={0.018}
            color={index % 2 === 0 ? PALETTE.bone : PALETTE.warningYellow}
          />
        ))}
        <ExperimentOutlineMesh
          position={[-0.095, 0.19, -0.18]}
          rotation-z={0.22}
          scale={[0.038, 0.082, 0.034]}
          outlineWidth={0.011}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          material={toon(PALETTE.bone)}
        />
        <ExperimentOutlineMesh
          position={[0.1, -0.19, -0.18]}
          rotation-z={-0.2}
          scale={[0.038, 0.082, 0.034]}
          outlineWidth={0.011}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          material={toon(PALETTE.bone)}
        />
        <mesh position={[0, 0, -0.19]} scale={[1, 0.72, 1]}>
          <circleGeometry args={[0.195, 36]} />
          <primitive object={mouthMaterial} attach="material" />
        </mesh>
      </group>
      <mesh position={[0, -0.46, 0.28]} rotation-x={-Math.PI / 2} scale={[1.5, 0.86, 1]}>
        <circleGeometry args={[1, 30]} />
        <meshBasicMaterial color="#8b6bc7" transparent opacity={0.14} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

function SuctionRibbon({
  runtime,
  index,
}: {
  runtime: MutableRefObject<VacuumRuntime>
  index: number
}) {
  const mesh = useRef<THREE.Mesh>(null)
  const sideSeed = seededNoise(index + 2.4) * 2 - 1
  const depthSeed = seededNoise(index + 8.7)
  const liftSeed = seededNoise(index + 16.1)

  useFrame(({ clock }) => {
    const state = runtime.current
    const target = mesh.current
    if (!target) return
    const t = clock.elapsedTime
    const forward = state.mouthForward
    rightVector.set(-forward.z, 0, forward.x).normalize()
    const blow = clampValue(state.hoseBlowStrength + state.hoseBlowReleasePulse * 0.35, 0, 1.25)
    const activeFlow = blow > 0.035
      ? 1.42 + blow * 0.88
      : state.hoseActive || state.pointerDown ? 1.18 : state.active ? 0.94 : 0.68
    const rawFlow = (t * activeFlow * (0.72 + depthSeed * 0.42) + index * 0.19) % 1
    const flow = blow > 0.035 ? 1 - rawFlow : rawFlow
    const throatFocus = 1 - flow
    const focused = throatFocus * throatFocus
    const depth = 0.38 + depthSeed * 2.45 + flow * 1.62
    const side = sideSeed * (0.18 + depth * 0.28) * (0.45 + flow * 0.48) + Math.sin(t * 1.7 + index) * 0.09
    const lift = 0.2 + liftSeed * 0.44 + Math.sin(t * 2.1 + index) * 0.04
    mouthVector.copy(state.mouth)
    sourceVector.copy(mouthVector)
      .addScaledVector(forward, depth)
      .addScaledVector(rightVector, side)
    sourceVector.y = lift
    deltaVector.copy(sourceVector).sub(mouthVector)
    target.position.copy(mouthVector).add(sourceVector).multiplyScalar(0.5)
    target.position.y += Math.sin(flow * Math.PI) * 0.055
    target.rotation.set(0, Math.atan2(deltaVector.x, deltaVector.z), 0)
    target.scale.set(0.018 + focused * 0.065 + state.flash * 0.018 + blow * 0.018, 0.014, deltaVector.length() * (0.72 + state.pulse * 0.075 + blow * 0.045))
    const material = target.material as THREE.MeshBasicMaterial
    material.opacity = Math.min(0.42, (0.07 + focused * 0.24 + state.flash * 0.05 + blow * 0.12) * (0.66 + state.pulse * 0.2))
  })

  return (
    <mesh ref={mesh} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={index % 3 === 0 ? '#f7ef93' : index % 3 === 1 ? '#6bd8ff' : '#f47bdc'} transparent opacity={0.18} depthWrite={false} />
    </mesh>
  )
}

function SuctionRibbons({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  return (
    <group>
      {Array.from({ length: RIBBON_COUNT }, (_, index) => (
        <SuctionRibbon key={index} runtime={runtime} index={index} />
      ))}
    </group>
  )
}

function SuctionPulseBead({
  runtime,
  index,
}: {
  runtime: MutableRefObject<VacuumRuntime>
  index: number
}) {
  const { camera } = useThree()
  const mesh = useRef<THREE.Mesh>(null)
  const sideSeed = seededNoise(index * 2.37 + 4.2) * 2 - 1
  const liftSeed = seededNoise(index * 3.11 + 7.8)
  const speedSeed = seededNoise(index * 1.83 + 1.2)
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: FLOW_BEAD_PALETTE[index % FLOW_BEAD_PALETTE.length],
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [index],
  )

  useFrame(({ clock }) => {
    const target = mesh.current
    if (!target) return
    const state = runtime.current
    const t = clock.elapsedTime
    const blow = clampValue(state.hoseBlowStrength + state.hoseBlowReleasePulse * 0.45, 0, 1.25)
    const active = blow > 0.035 ? 1.28 + blow * 0.42 : state.hoseActive || state.pointerDown ? 1 : state.active ? 0.74 : 0.34
    const travel = (t * (0.72 + speedSeed * 0.6) * (0.7 + active * 0.64) + index * 0.137) % 1
    const focus = blow > 0.035 ? 1 - smooth01(travel) : smooth01(travel)
    const forward = state.mouthForward
    rightVector.set(-forward.z, 0, forward.x).normalize()
    const depth = 2.45 - focus * 2.25
    const side = sideSeed * (0.46 * (1 - focus) + 0.035) + Math.sin(t * 2.4 + index) * 0.045 * (1 - focus)
    const lift = 0.16 + liftSeed * 0.42 + Math.sin(t * 2.9 + index * 0.43) * 0.028 * (1 - focus)
    target.position.copy(state.mouth)
      .addScaledVector(forward, depth)
      .addScaledVector(rightVector, side)
    target.position.y = lift + focus * 0.04
    target.quaternion.copy(camera.quaternion)
    const pop = Math.sin(travel * Math.PI)
    const size = 0.035 + focus * 0.078 + state.flash * 0.018
    target.scale.set(size * (1 + focus * 0.85), size * (0.64 + pop * 0.22), 1)
    material.opacity = Math.min(0.84, (0.08 + focus * 0.42 + state.flash * 0.12 + blow * 0.18) * pop * (0.42 + active * 0.74))
  })

  return (
    <mesh ref={mesh} material={material} renderOrder={74} frustumCulled={false}>
      <circleGeometry args={[1, 14]} />
    </mesh>
  )
}

function SuctionPulseBeads({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  return (
    <group>
      {Array.from({ length: FLOW_BEAD_COUNT }, (_, index) => (
        <SuctionPulseBead key={index} runtime={runtime} index={index} />
      ))}
    </group>
  )
}

function SuctionMotes({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const pileBaseMesh = useRef<THREE.InstancedMesh>(null)
  const pileMoundMesh = useRef<THREE.InstancedMesh>(null)
  const pileMoundOutlineMesh = useRef<THREE.InstancedMesh>(null)
  const pileLobeMesh = useRef<THREE.InstancedMesh>(null)
  const pileLobeOutlineMesh = useRef<THREE.InstancedMesh>(null)
  const bodyMesh = useRef<THREE.InstancedMesh>(null)
  const bodyOutlineMesh = useRef<THREE.InstancedMesh>(null)
  const bodyLobeMesh = useRef<THREE.InstancedMesh>(null)
  const bodyLobeOutlineMesh = useRef<THREE.InstancedMesh>(null)
  const rimMesh = useRef<THREE.InstancedMesh>(null)
  const capMesh = useRef<THREE.InstancedMesh>(null)
  const shadowMesh = useRef<THREE.InstancedMesh>(null)
  const bridgeMesh = useRef<THREE.InstancedMesh>(null)
  const bridgeOutlineMesh = useRef<THREE.InstancedMesh>(null)
  const bridgeShadowMesh = useRef<THREE.InstancedMesh>(null)
  const bridgeStringMesh = useRef<THREE.InstancedMesh>(null)
  const anchorSmearMesh = useRef<THREE.InstancedMesh>(null)
  const popRingMesh = useRef<THREE.InstancedMesh>(null)
  const slurpStrandMesh = useRef<THREE.InstancedMesh>(null)
  const slurpStrandOutlineMesh = useRef<THREE.InstancedMesh>(null)
  const intakeFunnelMesh = useRef<THREE.InstancedMesh>(null)
  const contactPatchMesh = useRef<THREE.InstancedMesh>(null)
  const residueMesh = useRef<THREE.InstancedMesh>(null)
  const initialized = useRef(false)
  const residueCursor = useRef(0)
  const lastResetSerial = useRef(-1)
  const initialRuntime = runtime.current
  const slimeEnabled = !isMovementLabMode(initialRuntime.devMode)
  const motes = useMemo(() => slimeEnabled ? makeMotes(initialRuntime) : [], [initialRuntime, slimeEnabled])
  const piles = useMemo(() => slimeEnabled ? makeSlimePiles(initialRuntime.devMode) : [], [initialRuntime.devMode, slimeEnabled])
  const residues = useMemo(() => makeSlimeResidues(), [])
  const bodyGeometry = useMemo(() => createOrganicBlobGeometry(18, 12, 1.7, 0.72), [])
  const bodyLobeGeometry = useMemo(() => createOrganicBlobGeometry(12, 8, 4.2, 0.9), [])
  const pileMoundGeometry = useMemo(() => createOrganicBlobGeometry(18, 10, 7.4, 1.45), [])
  const pileLobeGeometry = useMemo(() => createOrganicBlobGeometry(12, 8, 9.8, 1.22), [])
  const slimeBodyMaterial = useMemo(() => createSlimeSurfaceMaterial({ gloss: 0.38, rim: 0.34, depth: 0.9, warmth: 0.32 }), [])
  const slimeMoundMaterial = useMemo(() => createSlimeSurfaceMaterial({ gloss: 0.32, rim: 0.3, depth: 0.86, warmth: 0.3 }), [])
  const slimeLobeMaterial = useMemo(() => createSlimeSurfaceMaterial({ gloss: 0.44, rim: 0.38, depth: 0.94, warmth: 0.36 }), [])
  const slimeCapMaterial = useMemo(() => createSlimeSurfaceMaterial({ alpha: 0.52, gloss: 0.24, rim: 0.18, depth: 0.78, warmth: 0.36, depthWrite: false }), [])
  const slimeOutlineMaterial = useMemo(() => createInstancedInkOutlineMaterial(0.062, 0.98), [])
  const slimeFineOutlineMaterial = useMemo(() => createInstancedInkOutlineMaterial(0.032, 0.92), [])

  useEffect(() => {
    if (!slimeEnabled) return undefined
    const devMass = {
      cleanup: (completionPercent: number) => {
        const state = runtime.current
        if (!isFirstLevelMode(state.devMode)) return null
        const targetCompletion = clampValue(completionPercent, 0, 0.96)
        let remainingBudget = Math.max(0, state.levelStartMass * (1 - targetCompletion))
        for (const mote of motes) {
          const moteMass = Math.max(0.001, mote.mass)
          const visibleMass = clampValue(remainingBudget / moteMass, 0, 1)
          mote.levelCleared = visibleMass <= 0.025 ? 1 : 0
          mote.visibleMass = visibleMass
          mote.mass = Math.max(mote.mass, moteMass)
          mote.colorBloom = Math.max(mote.colorBloom, 0.42)
          mote.reemergeCharge = Math.max(mote.reemergeCharge, 0.18)
          mote.popAge = Math.max(mote.popAge, 0)
          mote.popDuration = Math.max(mote.popDuration, 0.32)
          remainingBudget = Math.max(0, remainingBudget - moteMass)
        }
        const cleanupBudgetMass = Math.max(0.001, state.levelStartMass * getLevelCleanupTarget(state.levelDifficulty))
        state.bagCollectedMass = Math.max(
          state.bagCollectedMass,
          state.levelCollectedMassAtStart + cleanupBudgetMass * targetCompletion,
        )
        state.levelLastRawCollectedMass = state.bagCollectedMass
        state.levelRegenBank = 0
        state.levelRegeneratedMass = 0
        return targetCompletion
      },
      restore: () => {
        const state = runtime.current
        for (let index = 0; index < motes.length; index += 1) {
          spawnMote(motes[index], state, state.flowMetrics.now + index * 0.013, index)
          motes[index].visibleMass = 1
          motes[index].mass = 1
        }
        initializeLevelMassState(state, motes, state.flowMetrics.now)
      },
    }
    window.__EXPERIMENT_LAB_LEVEL_MASS_DEV__ = devMass
    return () => {
      if (window.__EXPERIMENT_LAB_LEVEL_MASS_DEV__ === devMass) {
        window.__EXPERIMENT_LAB_LEVEL_MASS_DEV__ = undefined
      }
    }
  }, [motes, runtime, slimeEnabled])

	  useFrame(({ clock }, dt) => {
    if (!slimeEnabled) return
	    const pileBaseTarget = pileBaseMesh.current
    const pileMoundTarget = pileMoundMesh.current
    const pileMoundOutlineTarget = pileMoundOutlineMesh.current
    const pileLobeTarget = pileLobeMesh.current
    const pileLobeOutlineTarget = pileLobeOutlineMesh.current
    const bodyTarget = bodyMesh.current
    const bodyOutlineTarget = bodyOutlineMesh.current
    const bodyLobeTarget = bodyLobeMesh.current
    const bodyLobeOutlineTarget = bodyLobeOutlineMesh.current
    const rimTarget = rimMesh.current
    const capTarget = capMesh.current
    const shadowTarget = shadowMesh.current
    const bridgeTarget = bridgeMesh.current
    const bridgeOutlineTarget = bridgeOutlineMesh.current
    const bridgeShadowTarget = bridgeShadowMesh.current
    const bridgeStringTarget = bridgeStringMesh.current
    const anchorSmearTarget = anchorSmearMesh.current
    const popRingTarget = popRingMesh.current
    const slurpStrandTarget = slurpStrandMesh.current
    const slurpStrandOutlineTarget = slurpStrandOutlineMesh.current
    const intakeFunnelTarget = intakeFunnelMesh.current
    const contactPatchTarget = contactPatchMesh.current
    const residueTarget = residueMesh.current
    if (!pileBaseTarget || !pileMoundTarget || !pileMoundOutlineTarget || !pileLobeTarget || !pileLobeOutlineTarget || !bodyTarget || !bodyOutlineTarget || !bodyLobeTarget || !bodyLobeOutlineTarget || !rimTarget || !capTarget || !shadowTarget || !bridgeTarget || !bridgeOutlineTarget || !bridgeShadowTarget || !bridgeStringTarget || !anchorSmearTarget || !popRingTarget || !slurpStrandTarget || !slurpStrandOutlineTarget || !intakeFunnelTarget || !contactPatchTarget || !residueTarget) return
    const state = runtime.current
    const cappedDt = Math.min(dt, 0.04)
    const t = clock.elapsedTime
    const livingTuning = PRODUCTION_TUNING.livingSlime
    let bestPivotCandidateScore = -1
    state.pivotCandidateTargetId = state.sealTargetMoteId
	    const partyArtifactFade = clampValue(
	      1 - state.levelPartyProgress * 0.82 - state.levelCompletionGlow * 0.68 - state.levelDiscoIntensity * 0.18,
	      0.08,
	      1,
	    )
    slimeOutlineMaterial.uniforms.uWidth.value = 0.062
    slimeOutlineMaterial.uniforms.uOpacity.value = 0.98
    slimeFineOutlineMaterial.uniforms.uWidth.value = 0.032
    slimeFineOutlineMaterial.uniforms.uOpacity.value = 0.92
	    setBasicInstancedOpacity(pileBaseTarget, 0.1 * partyArtifactFade)
	    setBasicInstancedOpacity(shadowTarget, 0)
	    setBasicInstancedOpacity(bridgeShadowTarget, 0)
    if (state.levelResetRequested > 0) {
      resetRuntimeForReplay(state, t)
      initialized.current = false
    }
    const mouth = state.mouth
    const forward = state.mouthForward
    const hoseBlowActive = PRODUCTION_TUNING.blow.enabled && state.hoseBlowStrength > 0.035
    const blowStrength = hoseBlowActive ? clampValue(state.hoseBlowStrength, 0, 1.25) : 0
    const suctionIntentActive = (state.hoseActive || state.pointerDown) && !hoseBlowActive
    const suctionActiveForSlime = !hoseBlowActive && (state.active || suctionIntentActive)
    const suctionColourIntent = suctionIntentActive ? 0.58 : hoseBlowActive ? 0.42 : state.active ? 0.16 : 0
    const motionColour = Math.min(0.24, state.velocity.length() * 0.1 + state.swingTension * 0.08 + state.hoseHookStrength * 0.05)
    const colourActivity = Math.min(
      1.65,
      state.slimeSealStrength * 0.34
        + state.slimePhysicsStretch * 0.5
        + state.slimePhysicsYield * 0.42
        + state.slimePhysicsMergeHeat * 0.34
        + state.slimePhysicsSurfaceTension * 0.2
        + state.slimePhysicsPoolPressure * 0.18
        + state.slimePhysicsSuctionStrain * 0.3
        + state.slimePhysicsTendrils * 0.22
        + state.slimeContactAdhesion * 0.16
        + state.slimeContactFunnel * 0.26
        + state.slimeContactNeck * 0.22
        + state.slimeContactDent * 0.18
        + state.slimeContactRope * 0.24
        + state.slimeContactFeed * 0.26
        + state.slimeContactSnap * 0.14
        + state.slimeSnapBondTension * 0.18
        + state.deepEmbedDepth * 0.22
        + state.deepEmbedPocketPulse * 0.14
        + state.glugPulse * 0.22
        + state.glugMassFlow * 0.18
	        + state.bagPulse * 0.08
	        + state.levelCompletionGlow * 0.34
	        + state.levelDiscoIntensity * 0.22
	        + state.slimeIntakeFlow * 0.3
        + state.slimeMassFeed * 0.18
        + state.slimeEasySuctionAssist * 0.18
        + state.slimeEasySuctionFeed * 0.22
        + state.slimeGrowthWake * 0.12
        + state.slimeLivingPulse * livingTuning.internalFlowStrength * 0.18
        + state.slimeLivingCreep * livingTuning.edgeCreepStrength * 0.16
        + state.suctionContactBridgeActive * livingTuning.bridgeOrganicness * 0.12
        + state.hoseBlowPressure * 0.34
        + state.slimeMaterialWake * SLIME_MATERIAL_POLISH.wakeToColour
        + state.slimeMaterialElastic * 0.16
        + state.slimeMagneticPull * 0.18
        + state.slimeOrganicHold * 0.22
        + state.flash * 0.2
        + state.gulpFlow * 0.18
        + suctionColourIntent
        + motionColour,
    )
    const opalStrength = Math.min(1.45, 0.3 + state.slimePhysicsStretch * 0.46 + state.slimePhysicsSuctionStrain * 0.22 + state.slimeContactFunnel * 0.15 + state.slimeContactFeed * 0.1 + state.slimeMaterialWake * 0.2 + state.slimeMagneticPull * 0.1 + state.slimeSealStrength * 0.14 + state.slimeLivingPulse * livingTuning.materialIdleBreathStrength * 0.08 + colourActivity * 0.24)
    const pocketStrength = Math.min(1.22, 0.16 + state.slimePhysicsMergeHeat * 0.24 + state.slimePhysicsPoolPressure * 0.2 + state.slimePhysicsContraction * 0.18 + state.slimeMaterialDepth * 0.22 + state.deepEmbedDepth * 0.18 + state.deepEmbedPocketPulse * 0.1)
    const veinStrength = Math.min(1.52, 0.34 + state.slimePhysicsStretch * 0.3 + state.slimePhysicsYield * 0.38 + state.slimePhysicsTendrils * 0.34 + state.slimeContactRope * 0.2 + state.slimeIntakeFlow * 0.24 + state.slimeEasySuctionFeed * 0.14 + state.slimeOrganicHold * 0.1 + state.slimeMaterialElastic * 0.2 + state.suctionContactBridgeStrain * livingTuning.bridgeOrganicness * 0.08 + colourActivity * 0.28)
    const paletteDrift = t * (SLIME_COLOUR_TUNING.idleDriftRate + colourActivity * SLIME_COLOUR_TUNING.activeDriftRate + state.slimeLivingCreep * livingTuning.internalFlowStrength * 0.008)
    updateSlimeSurfaceUniforms(slimeBodyMaterial, t, colourActivity, opalStrength, pocketStrength, veinStrength, paletteDrift)
    updateSlimeSurfaceUniforms(slimeMoundMaterial, t, colourActivity * 0.72, opalStrength * 0.72, pocketStrength * 1.12, veinStrength * 0.78, paletteDrift * 0.82)
    updateSlimeSurfaceUniforms(slimeLobeMaterial, t, colourActivity * 0.94, opalStrength, pocketStrength, veinStrength, paletteDrift * 1.08)
    updateSlimeSurfaceUniforms(slimeCapMaterial, t, colourActivity * 1.05, opalStrength * 1.16, pocketStrength * 0.64, veinStrength * 1.18, paletteDrift * 1.24)

            if (!initialized.current || lastResetSerial.current !== state.levelResetSerial) {
              for (let i = 0; i < motes.length; i += 1) {
                spawnMote(motes[i], state, t + i * 0.37, i)
              }
              for (let i = 0; i < piles.length; i += 1) {
                piles[i].center.copy(piles[i].baseCenter)
                piles[i].targetCenter.copy(piles[i].baseCenter)
                piles[i].targetMass = 0
                piles[i].mass = 0
                piles[i].pulse = 0
                piles[i].targetChroma = 0
                piles[i].chroma = 0
                piles[i].absorbedMass = 0
                piles[i].livingPulse = 0
                piles[i].livingCreep = 0
                piles[i].livingCongeal = 0
                piles[i].livingBreak = 0
                piles[i].referenceDrift = 0
                piles[i].referenceMerge = 0
                piles[i].referenceSplit = 0
                piles[i].referenceRelocation = 0
              }
              for (let i = 0; i < residues.length; i += 1) {
                residues[i].age = 99
                residues[i].life = 1
                residues[i].position.set(0, -40, 0)
                residues[i].strength = 0
              }
              residueCursor.current = 0
              initializeLevelMassState(state, motes, t)
              initialized.current = true
              lastResetSerial.current = state.levelResetSerial
            }

    if (state.gripRequestQueued && !PRODUCTION_TUNING.grip.rightClickGripEnabled) {
      state.gripRequestQueued = false
      state.gripInputDown = false
      state.gripReleaseQueued = false
      state.gripState = 'idle'
      state.gripReleaseReason = 'disabled'
    }

    if (state.gripRequestQueued) {
      state.gripRequestQueued = false
      recordFlowGrip(state.flowMetrics, {
        time: t,
        kind: 'attempt',
        targetId: null,
        holdTime: 0,
        spinSpeed: state.gripSpinSpeed,
      })
      const candidate = findGripContactCandidate(state, piles, motes)
      if (candidate && state.gripCooldown <= 0) {
        startGripContact(state, candidate, t)
      } else {
        state.gripState = 'searching'
        state.gripReleaseReason = 'noContact'
        state.gripCooldown = Math.max(state.gripCooldown, 0.08)
        recordFlowGrip(state.flowMetrics, {
          time: t,
          kind: 'noContact',
          targetId: null,
          reason: 'noContact',
        })
      }
    }

    for (let i = 0; i < motes.length; i += 1) {
      motes[i].mergeTarget = 0
      motes[i].absorbTarget = 0
      motes[i].compression = damp(motes[i].compression, 0, 3.8, cappedDt)
      motes[i].mergeHeat = damp(motes[i].mergeHeat, 0, 2.8, cappedDt)
      motes[i].surfaceTension = damp(motes[i].surfaceTension, 0, 2.5, cappedDt)
      motes[i].poolPressure = damp(motes[i].poolPressure, 0, 1.8, cappedDt)
      motes[i].suctionStrain = damp(motes[i].suctionStrain, 0, 4.2, cappedDt)
      motes[i].tendril = damp(motes[i].tendril, 0, 3.4, cappedDt)
      motes[i].intakeNear = damp(motes[i].intakeNear, 0, 4.4, cappedDt)
      motes[i].intakeAdhesion = damp(motes[i].intakeAdhesion, 0, 4.0, cappedDt)
      motes[i].intakeDimple = damp(motes[i].intakeDimple, 0, 4.8, cappedDt)
      motes[i].intakeFunnel = damp(motes[i].intakeFunnel, 0, 4.2, cappedDt)
      motes[i].intakeNeck = damp(motes[i].intakeNeck, 0, 3.6, cappedDt)
	      motes[i].intakeFlow = damp(motes[i].intakeFlow, 0, 3.2, cappedDt)
	      if (motes[i].latched < 0.5) motes[i].intakeFeed = damp(motes[i].intakeFeed, 0, 2.4, cappedDt)
	      if (motes[i].latched < 0.5) motes[i].attachmentMassTransferred = damp(motes[i].attachmentMassTransferred, 0, 2.8, cappedDt)
	      motes[i].intakeRecoil = damp(motes[i].intakeRecoil, 0, 4.8, cappedDt)
      motes[i].glugPulse = damp(motes[i].glugPulse, 0, 5.8, cappedDt)
      motes[i].glugCooldown = Math.max(0, motes[i].glugCooldown - cappedDt)
      motes[i].glugEventStrength = damp(motes[i].glugEventStrength, 0, 7.4, cappedDt)
      motes[i].glugEventMass = damp(motes[i].glugEventMass, 0, 6.2, cappedDt)
      motes[i].glugFailedStrength = damp(motes[i].glugFailedStrength, 0, 5.8, cappedDt)
      motes[i].contactReadiness = damp(motes[i].contactReadiness, 0, 4.6, cappedDt)
      motes[i].contactLipSeal = damp(motes[i].contactLipSeal, 0, 4.0, cappedDt)
      motes[i].contactDent = damp(motes[i].contactDent, 0, 4.4, cappedDt)
      motes[i].contactTongue = damp(motes[i].contactTongue, 0, 4.0, cappedDt)
      motes[i].contactRope = damp(motes[i].contactRope, 0, 3.7, cappedDt)
	      motes[i].contactFeed = damp(motes[i].contactFeed, 0, 3.8, cappedDt)
	      motes[i].contactSnap = damp(motes[i].contactSnap, 0, 4.8, cappedDt)
	      motes[i].contactResistance = damp(motes[i].contactResistance, 0, 4.2, cappedDt)
	      motes[i].flowBridge = damp(motes[i].flowBridge, 0, 3.4, cappedDt)
	      motes[i].flowBridgeLength = damp(motes[i].flowBridgeLength, 0, 3.2, cappedDt)
	      motes[i].flowBridgeThickness = damp(motes[i].flowBridgeThickness, PRODUCTION_TUNING.suction.flowBridgeMinThickness, 3.4, cappedDt)
	      motes[i].flowBridgePulse = damp(motes[i].flowBridgePulse, 0, 7.2, cappedDt)
	      motes[i].flowBridgeSurge = damp(motes[i].flowBridgeSurge, 0, PRODUCTION_TUNING.glug.gulpBridgeRecoverySpeed, cappedDt)
	      motes[i].flowBridgeStrain = damp(motes[i].flowBridgeStrain, 0, 4.4, cappedDt)
	      motes[i].flowBridgeBreak = damp(motes[i].flowBridgeBreak, 0, 5.6, cappedDt)
	      motes[i].sealQuality = damp(motes[i].sealQuality, 0, 3.4, cappedDt)
	      motes[i].sealLeak = damp(motes[i].sealLeak, 0, 4.6, cappedDt)
	      if (motes[i].latched < 0.5) {
	        motes[i].deepEmbedDepth = damp(motes[i].deepEmbedDepth, 0, PRODUCTION_TUNING.embed.embedDepthFallSpeed, cappedDt)
	        motes[i].deepEmbedAge = 0
	        if (motes[i].deepEmbedDepth < 0.035) motes[i].deepEmbedState = 'searching'
	      }
	      motes[i].deepEmbedLockStrength = damp(motes[i].deepEmbedLockStrength, 0, 4.2, cappedDt)
	      motes[i].deepEmbedAnglePenalty = damp(motes[i].deepEmbedAnglePenalty, 0, 4.4, cappedDt)
	      motes[i].deepEmbedTensionPenalty = damp(motes[i].deepEmbedTensionPenalty, 0, 4.4, cappedDt)
	      motes[i].deepEmbedPocketPulse = damp(motes[i].deepEmbedPocketPulse, 0, 6.8, cappedDt)
	      motes[i].deepEmbedDimple = damp(motes[i].deepEmbedDimple, 0, 4.8, cappedDt)
	      motes[i].deepEmbedRimOcclusion = damp(motes[i].deepEmbedRimOcclusion, 0, 4.2, cappedDt)
	      motes[i].deepEmbedHoseWobble = damp(motes[i].deepEmbedHoseWobble, 0, 4.8, cappedDt)
	      motes[i].deepEmbedPopPulse = damp(motes[i].deepEmbedPopPulse, 0, 5.8, cappedDt)
	      motes[i].deepEmbedFleckBurst = damp(motes[i].deepEmbedFleckBurst, 0, 5.6, cappedDt)
	      motes[i].snapBondGrip = damp(motes[i].snapBondGrip, 0, 4.4, cappedDt)
      motes[i].snapBondTension = damp(motes[i].snapBondTension, 0, 4.2, cappedDt)
      motes[i].snapBondStrain = damp(motes[i].snapBondStrain, 0, 4.0, cappedDt)
      motes[i].snapBondUnstable = damp(motes[i].snapBondUnstable, 0, 4.4, cappedDt)
      motes[i].snapBondBreak = damp(motes[i].snapBondBreak, 0, 4.6, cappedDt)
      motes[i].snapBondSnap = damp(motes[i].snapBondSnap, 0, 6.2, cappedDt)
      motes[i].snapBondRecoil = damp(motes[i].snapBondRecoil, 0, 5.4, cappedDt)
      motes[i].snapBondCooldown = Math.max(0, motes[i].snapBondCooldown - cappedDt)
      motes[i].mouthMagnetism = damp(motes[i].mouthMagnetism, 0, 4.0, cappedDt)
      motes[i].rimGrip = damp(motes[i].rimGrip, 0, 3.8, cappedDt)
      motes[i].organicHold = damp(motes[i].organicHold, 0, 3.4, cappedDt)
      motes[i].slurpPressure = damp(motes[i].slurpPressure, 0, 3.6, cappedDt)
      motes[i].edgeWobble = damp(motes[i].edgeWobble, 0, 3.4, cappedDt)
      motes[i].livingPulse = damp(motes[i].livingPulse, 0, 1.6, cappedDt)
      motes[i].livingCreep = damp(motes[i].livingCreep, 0, 1.6, cappedDt)
      motes[i].livingCongeal = damp(motes[i].livingCongeal, 0, 1.6, cappedDt)
      motes[i].livingBreak = damp(motes[i].livingBreak, 0, 1.6, cappedDt)
      motes[i].livingFlow = damp(motes[i].livingFlow, 0, 1.6, cappedDt)
    }

    for (let i = 0; i < piles.length; i += 1) {
      const completionWinDrain = computeCompletionWinDrain(state)
      piles[i].targetMass = 0
      piles[i].targetChroma = 0
      piles[i].absorbedMass = damp(piles[i].absorbedMass, 0, completionWinDrain > 0.01 ? 7.2 : 0.9, cappedDt)
      piles[i].livingPulse = 0
      piles[i].livingCreep = 0
      piles[i].livingCongeal = 0
      piles[i].livingBreak = 0
    }

    let referenceDriftTotal = 0
    let referenceMergeTotal = 0
    let referenceSplitTotal = 0
    let referenceRelocationTotal = 0
    for (let i = 0; i < piles.length; i += 1) {
      const pile = piles[i]
      let groupX = 0
      let groupZ = 0
      let groupCount = 0
      for (let j = 0; j < piles.length; j += 1) {
        if (piles[j].mergeGroup !== pile.mergeGroup) continue
        groupX += piles[j].baseCenter.x
        groupZ += piles[j].baseCenter.z
        groupCount += 1
      }
      const safeGroupCount = Math.max(1, groupCount)
      groupX /= safeGroupCount
      groupZ /= safeGroupCount

      const cycle = wrap01(t * livingTuning.mergeWindowSpeed + seededNoise(pile.seed + 4.4) * 0.76)
      const mergeWindow = smoothWindow(cycle, 0.16, 0.39, 0.58, 0.88)
      const splitWindow = smoothWindow(wrap01(cycle + 0.48), 0.1, 0.3, 0.52, 0.84)
      const slowPhase = t * livingTuning.relocationCycleSpeed + pile.seed * 0.61
      const stickyCycle = wrap01(t * livingTuning.relocationCycleSpeed * 0.82 + seededNoise(pile.seed + 9.8))
      const stickyHold = smoothWindow(stickyCycle, 0.04, 0.24, 0.54, 0.84)
      const snapPulse = Math.pow(Math.max(0, Math.sin(stickyCycle * Math.PI * 2 - Math.PI * 0.62)), 8) * 0.22
      const crawlPulse = 0.46
        + Math.sin(slowPhase * 1.15 + pile.seed) * 0.16
        + Math.sin(slowPhase * 1.9 + pile.seed * 0.37) * 0.06
        + snapPulse * 0.18
      const driftAuthority = (0.44 + Math.max(0, crawlPulse) * 0.28 + snapPulse * 0.18) * (1 - stickyHold * 0.18)
      const driftRadius = livingTuning.relocationRadius * (0.42 + seededNoise(pile.seed + 12.7) * 0.2) * driftAuthority
      pile.targetCenter.set(
        pile.baseCenter.x
          + Math.sin(slowPhase + pile.seed * 0.22) * driftRadius
          + Math.sin(slowPhase * 1.83 + pile.seed * 1.17) * driftRadius * 0.34,
        SLIME_MOTE_FLOOR_Y,
        pile.baseCenter.z
          + Math.cos(slowPhase * 0.91 + pile.seed * 0.48) * driftRadius
          + Math.sin(slowPhase * 1.48 + pile.seed * 0.76) * driftRadius * 0.3,
      )

      const slipAngle = pile.seed * 1.43 + Math.sin(slowPhase * 0.42) * 1.1
      pile.targetCenter.x += Math.cos(slipAngle) * snapPulse * livingTuning.relocationSnapStrength
      pile.targetCenter.z += Math.sin(slipAngle) * snapPulse * livingTuning.relocationSnapStrength

      const groupPhase = t * livingTuning.mergeWindowSpeed * 0.92 + seededNoise(pile.seed + safeGroupCount * 0.33) * Math.PI * 2
      const meetX = groupX + Math.sin(groupPhase) * livingTuning.relocationRadius * 0.16
      const meetZ = groupZ + Math.cos(groupPhase * 0.72 + pile.seed * 0.12) * livingTuning.relocationRadius * 0.16
      const mergePull = mergeWindow * livingTuning.mergeWindowStrength * (safeGroupCount > 1 ? 1 : 0.38)
      const meetOffsetAngle = pile.seed * 2.11 + t * 0.026
      const meetOffset = 0.08 + seededNoise(pile.seed + 15.2) * 0.08
      pile.targetCenter.x += (meetX + Math.cos(meetOffsetAngle) * meetOffset - pile.targetCenter.x) * mergePull
      pile.targetCenter.z += (meetZ + Math.sin(meetOffsetAngle) * meetOffset - pile.targetCenter.z) * mergePull

      let splitX = pile.baseCenter.x - groupX
      let splitZ = pile.baseCenter.z - groupZ
      let splitDistance = Math.hypot(splitX, splitZ)
      if (splitDistance < 0.001) {
        splitX = Math.cos(pile.seed * 2.7)
        splitZ = Math.sin(pile.seed * 2.7)
        splitDistance = 1
      }
      splitX /= splitDistance
      splitZ /= splitDistance
      const splitPush = splitWindow * livingTuning.splitWindowStrength * livingTuning.relocationRadius * (0.26 + seededNoise(pile.seed + 18.6) * 0.14)
      pile.targetCenter.x += splitX * splitPush
      pile.targetCenter.z += splitZ * splitPush
      clampSlimeFloorPoint(pile.targetCenter)

      const sealedAnchorCalm = state.suctionState === 'sealed' && state.sealTargetPileIndex === i ? 0.2 : 1
      const gripCalm = state.gripActive && state.gripTargetPileIndex === i ? 0.42 : 1
      const followRate = livingTuning.referencePathStrength
        * (0.5 + Math.max(0, crawlPulse) * 0.24 + snapPulse * 0.18 + mergeWindow * 0.54 + splitWindow * 0.24)
        * sealedAnchorCalm
        * gripCalm
      pile.center.lerp(pile.targetCenter, Math.min(0.07, cappedDt * followRate))
      pile.center.y = SLIME_MOTE_FLOOR_Y

      pile.referenceDrift = Math.min(1.8, Math.hypot(pile.center.x - pile.baseCenter.x, pile.center.z - pile.baseCenter.z))
      pile.referenceMerge = mergeWindow
      pile.referenceSplit = splitWindow
      pile.referenceRelocation = clampValue(Math.max(0, crawlPulse * 0.38 + snapPulse * 0.28), 0, 1.2)
      referenceDriftTotal += pile.referenceDrift
      referenceMergeTotal += pile.referenceMerge
      referenceSplitTotal += pile.referenceSplit
      referenceRelocationTotal += pile.referenceRelocation
    }
    const pileCount = Math.max(1, piles.length)
    state.slimeReferenceDrift = referenceDriftTotal / pileCount
    state.slimeReferenceMerge = referenceMergeTotal / pileCount
    state.slimeReferenceSplit = referenceSplitTotal / pileCount
    state.slimeReferenceRelocation = referenceRelocationTotal / pileCount
    applyVisibleGunkTideGrowth(state, motes, piles, t, cappedDt)
    applyContinuousSlimeGeneration(state, motes, piles, t, cappedDt)

    for (let i = 0; i < motes.length; i += 1) {
      const a = motes[i]
      for (let j = i + 1; j < motes.length; j += 1) {
        const b = motes[j]
        if (a.visibleMass < 0.08 || b.visibleMass < 0.08) continue
        const dx = b.position.x - a.position.x
        const dz = b.position.z - a.position.z
        const planarDistance = Math.max(0.001, Math.hypot(dx, dz))
        const mergeReach = SLIME_MERGE_DISTANCE + (a.size + b.size) * 1.72
        const samePile = a.pileIndex === b.pileIndex
        if (samePile) {
          const groupReach = 1.42 + (a.size + b.size) * 4.25
          if (planarDistance < groupReach) {
            const groupStrength = smooth01(1 - planarDistance / groupReach) * 0.62
            const nx = dx / planarDistance
            const nz = dz / planarDistance
            const drift = groupStrength * cappedDt * (0.22 + Math.min(a.floorStick, b.floorStick) * 0.5)
            a.velocity.x += nx * drift
            a.velocity.z += nz * drift
            b.velocity.x -= nx * drift
            b.velocity.z -= nz * drift
            a.mergeTarget = Math.max(a.mergeTarget, groupStrength * 0.68)
            b.mergeTarget = Math.max(b.mergeTarget, groupStrength * 0.68)
            a.seamAssimilation = Math.max(a.seamAssimilation, groupStrength * livingTuning.mergeSeamSwirlStrength * 0.72)
            b.seamAssimilation = Math.max(b.seamAssimilation, groupStrength * livingTuning.mergeSeamSwirlStrength * 0.72)
            a.livingCongeal = Math.max(a.livingCongeal, groupStrength * 0.46)
            b.livingCongeal = Math.max(b.livingCongeal, groupStrength * 0.46)
            a.livingFlow = Math.max(a.livingFlow, groupStrength * livingTuning.internalFlowStrength * 1.18)
            b.livingFlow = Math.max(b.livingFlow, groupStrength * livingTuning.internalFlowStrength * 1.18)
            a.mound = Math.max(a.mound, groupStrength * 0.24)
            b.mound = Math.max(b.mound, groupStrength * 0.24)
          }
        }
        const pileA = piles[((a.pileIndex % piles.length) + piles.length) % piles.length]
        const pileB = piles[((b.pileIndex % piles.length) + piles.length) % piles.length]
        const referenceGroupMerge = !samePile && pileA.mergeGroup === pileB.mergeGroup
          ? Math.min(pileA.referenceMerge, pileB.referenceMerge)
          : 0
        if (referenceGroupMerge > 0.035 && planarDistance < livingTuning.groupMergeReach) {
          const groupMergeStrength = smooth01(1 - planarDistance / livingTuning.groupMergeReach)
            * referenceGroupMerge
            * livingTuning.groupMergePullStrength
            * Math.min(a.visibleMass, b.visibleMass)
          const nx = dx / planarDistance
          const nz = dz / planarDistance
          const pull = groupMergeStrength * cappedDt * (0.5 + Math.min(a.floorStick, b.floorStick) * 0.72)
          a.velocity.x += nx * pull
          a.velocity.z += nz * pull
          b.velocity.x -= nx * pull
          b.velocity.z -= nz * pull
          a.mergeTarget = Math.max(a.mergeTarget, groupMergeStrength * 0.82)
          b.mergeTarget = Math.max(b.mergeTarget, groupMergeStrength * 0.82)
          a.surfaceTension = Math.max(a.surfaceTension, groupMergeStrength * 0.56)
          b.surfaceTension = Math.max(b.surfaceTension, groupMergeStrength * 0.56)
          a.edgeWobble = Math.max(a.edgeWobble, groupMergeStrength * 0.34)
          b.edgeWobble = Math.max(b.edgeWobble, groupMergeStrength * 0.34)
          a.seamAssimilation = Math.max(a.seamAssimilation, groupMergeStrength * livingTuning.mergeSeamSwirlStrength)
          b.seamAssimilation = Math.max(b.seamAssimilation, groupMergeStrength * livingTuning.mergeSeamSwirlStrength)
          a.materialWake = Math.max(a.materialWake, groupMergeStrength * livingTuning.internalFlowStrength * 0.42)
          b.materialWake = Math.max(b.materialWake, groupMergeStrength * livingTuning.internalFlowStrength * 0.42)
          a.colorBloom = Math.max(a.colorBloom, groupMergeStrength * 0.16)
          b.colorBloom = Math.max(b.colorBloom, groupMergeStrength * 0.16)
        }
        const aPulling = a.latched > 0.5 && a.intakeFlow > 0.08
        const bPulling = b.latched > 0.5 && b.intakeFlow > 0.08
        if (aPulling !== bPulling && planarDistance < SLIME_INTAKE_CHAIN_REACH) {
          const puller = aPulling ? a : b
          const follower = aPulling ? b : a
          const chainStrength = smooth01((SLIME_INTAKE_CHAIN_REACH - planarDistance) / SLIME_INTAKE_CHAIN_REACH)
            * puller.intakeFlow
            * (0.34 + puller.suctionYield * 0.42 + puller.intakeNeck * 0.24)
            * Math.max(0.24, Math.min(1, follower.visibleMass))
          intakeChainVector.copy(puller.sealPoint).lerp(mouth, 0.28 + puller.intakeFlow * 0.3).sub(follower.position)
          intakeChainVector.y = 0
          if (intakeChainVector.lengthSq() > 0.0001) {
            intakeChainVector.normalize()
            follower.velocity.x += intakeChainVector.x * chainStrength * cappedDt * (0.64 + follower.suctionYield * 0.28)
            follower.velocity.z += intakeChainVector.z * chainStrength * cappedDt * (0.64 + follower.suctionYield * 0.28)
            follower.stretchMemory = Math.max(follower.stretchMemory, chainStrength * 0.28)
            follower.suctionStrain = Math.max(follower.suctionStrain, chainStrength * 0.42)
            follower.tendril = Math.max(follower.tendril, chainStrength * 0.18)
            follower.colorBloom = Math.max(follower.colorBloom, chainStrength * 0.36)
            follower.edgeWobble = Math.max(follower.edgeWobble, chainStrength * 0.34)
            follower.livingCongeal = Math.max(follower.livingCongeal, chainStrength * livingTuning.depletionCrawlStrength * 0.48)
            follower.livingFlow = Math.max(follower.livingFlow, chainStrength * livingTuning.internalFlowStrength * 0.58)
            follower.seamAssimilation = Math.max(follower.seamAssimilation, chainStrength * livingTuning.mergeSeamSwirlStrength * 0.42)
          }
        }
        if (planarDistance > mergeReach) continue
        const groundContact = Math.min(a.floorStick, b.floorStick)
        const mergeStrength = smooth01(1 - planarDistance / mergeReach) * (0.32 + groundContact * 0.68)
        const desiredDistance = (a.size + b.size) * (1.16 + (1 - mergeStrength) * 0.42)
        const nx = dx / planarDistance
        const nz = dz / planarDistance
        const pull = (planarDistance - desiredDistance) * mergeStrength * cappedDt * 1.55
        const relativeX = b.velocity.x - a.velocity.x
        const relativeZ = b.velocity.z - a.velocity.z
        const relativeAlong = relativeX * nx + relativeZ * nz
        const relativeSpeed = Math.hypot(relativeX, relativeZ)
        const cohesion = computeMergeCohesion({
          distance: planarDistance,
          desiredDistance,
          mergeStrength,
          relativeAlong,
          relativeSpeed,
          floorStick: groundContact,
          samePile,
        })
        const compressionPulse = cohesion.compression
        const mergeHeatPulse = cohesion.heat
        const dampedPull = (cohesion.pull + cohesion.damping) * cappedDt + pull * 0.24
        a.velocity.x += nx * dampedPull
        a.velocity.z += nz * dampedPull
        b.velocity.x -= nx * dampedPull
        b.velocity.z -= nz * dampedPull
        a.mergeTarget = Math.max(a.mergeTarget, mergeStrength)
        b.mergeTarget = Math.max(b.mergeTarget, mergeStrength)
        a.compression = Math.max(a.compression, compressionPulse)
        b.compression = Math.max(b.compression, compressionPulse)
        a.mergeHeat = Math.max(a.mergeHeat, mergeHeatPulse)
        b.mergeHeat = Math.max(b.mergeHeat, mergeHeatPulse)
        a.surfaceTension = Math.max(a.surfaceTension, cohesion.surfaceTension)
        b.surfaceTension = Math.max(b.surfaceTension, cohesion.surfaceTension)

        const small = a.size * a.visibleMass <= b.size * b.visibleMass ? a : b
        const large = small === a ? b : a
        const absorbStrength = computeFragmentAbsorption({
          smallSize: small.size * small.visibleMass,
          largeSize: large.size * large.visibleMass,
          distance: planarDistance,
          desiredDistance,
          merge: Math.max(a.merge, b.merge, mergeStrength),
          coagulate: Math.max(a.coagulate, b.coagulate),
        })
        if (absorbStrength > 0.035 && small.latched < 0.5 && large.latched < 0.5) {
          const towardLarge = small === a ? 1 : -1
          small.absorbTarget = Math.max(small.absorbTarget, absorbStrength)
          small.velocity.x += nx * towardLarge * absorbStrength * cappedDt * 0.92
          small.velocity.z += nz * towardLarge * absorbStrength * cappedDt * 0.92
          large.velocity.x -= nx * towardLarge * absorbStrength * cappedDt * 0.14
          large.velocity.z -= nz * towardLarge * absorbStrength * cappedDt * 0.14
          large.mergeHeat = Math.max(large.mergeHeat, absorbStrength * 0.86)
          large.compression = Math.max(large.compression, absorbStrength * 0.44)
          large.surfaceTension = Math.max(large.surfaceTension, absorbStrength * 0.58)
          large.poolPressure = Math.max(large.poolPressure, absorbStrength * 0.42)
          small.surfaceTension = Math.max(small.surfaceTension, absorbStrength * 0.32)
          large.seamAssimilation = Math.max(large.seamAssimilation, absorbStrength * livingTuning.mergeSeamSwirlStrength)
          small.seamAssimilation = Math.max(small.seamAssimilation, absorbStrength * livingTuning.mergeSeamSwirlStrength * 0.64)
          large.livingCongeal = Math.max(large.livingCongeal, absorbStrength * 0.38)
          small.livingFlow = Math.max(small.livingFlow, absorbStrength * livingTuning.internalFlowStrength * 0.58)
        }
      }
    }

    let hoseBlowPushTotal = 0
    let hoseBlowAffectedMotes = 0
    let hoseBlowMaxDistance = 0
    let slimeVacuumableVisibleCount = 0
    let slimeVacuumableTinyCount = 0
    let slimeVacuumableStrandedCount = 0
    let slimeGameplayVisibleMass = 0

    for (let i = 0; i < motes.length; i += 1) {
      const mote = motes[i]
      const overgrowthTideMote = isFirstLevelMode(state.devMode) && isTideOvergrowthMoteIndex(i)
      const tideEmergenceTarget = isFirstLevelMode(state.devMode)
        && !state.levelCompletionTriggered
        && mote.levelCleared < 0.5
        && (state.levelState === 'ready' || state.levelState === 'playing' || state.levelState === 'nearComplete' || state.levelDefeatTriggered)
        ? computeTideVisibleMassTarget(state, i)
        : 0
      const emergingTideMote = overgrowthTideMote
        && tideEmergenceTarget > PRODUCTION_TUNING.suction.slimeVacuumableVisibleThreshold
        && !state.levelDefeatTriggered
      mote.popAge += cappedDt
      const popProgress = smooth01(mote.popAge / mote.popDuration)
      const visibleProgress = Math.max(0, popProgress)
      const stickyAnchorActive = state.suctionState === 'sealed' && state.sealTargetMoteId === i
      const stickyAnchorReleaseActive = state.anchorPopJuice > 0.015 && state.anchorReleaseTargetMoteId === i
      const stickyContactOriginActive = stickyAnchorActive || (
        state.sealTargetMoteId === i
        && state.hoseHookStrength > 0.08
        && (state.slimeSealAge > 0.12 || state.deepEmbedDepth > 0.06 || state.pivotLocked)
      )
	      const suctionOrigin = stickyContactOriginActive ? state.slimeHookPoint : mouth
	      sourceVector.copy(mote.position).sub(suctionOrigin)
	      const distance = Math.max(0.001, sourceVector.length())
	      const edgeDistance = Math.max(
	        0.001,
	        distance - mote.size * PRODUCTION_TUNING.suction.edgeContactForgiveness,
	      )
	      const rawAhead = Math.max(0, sourceVector.dot(forward) / distance)
      const ahead = stickyContactOriginActive
        ? Math.max(rawAhead, 0.62 + Math.min(0.24, state.hoseHookStrength * 0.16))
        : rawAhead
      const force = computeSuctionForce(mote.position, mote.velocity, suctionOrigin, mote.swirl)
      if (hoseBlowActive) {
        force.influence = 0
        force.inward.set(0, 0, 0)
        force.tangent.set(0, 0, 0)
        force.damping.set(0, 0, 0)
        force.total.set(0, 0, 0)
      }
      if (stickyAnchorReleaseActive) {
        slimeSnapbackVector.copy(mote.position).sub(state.anchorReleasePoint)
        slimeSnapbackVector.y *= 0.2
        if (slimeSnapbackVector.lengthSq() > 0.0001) {
          slimeSnapbackVector.normalize()
          const pop = state.anchorPopJuice
          mote.velocity.addScaledVector(slimeSnapbackVector, pop * cappedDt * 0.62)
          mote.contactSnap = Math.max(mote.contactSnap, pop * 0.72)
          mote.intakeRecoil = Math.max(mote.intakeRecoil, pop * 0.64)
          mote.flowBridgeBreak = Math.max(mote.flowBridgeBreak, pop * 0.58)
          mote.deepEmbedPopPulse = Math.max(mote.deepEmbedPopPulse, pop * 0.72)
          mote.deepEmbedFleckBurst = Math.max(mote.deepEmbedFleckBurst, pop * 0.34)
          mote.edgeWobble = Math.max(mote.edgeWobble, pop * 0.46)
        }
      }
      let latchSeal = mote.latched > 0.5 ? smooth01((mote.latchAge + 0.04) / 0.26) : 0
      const currentSpeed = mote.velocity.length()
      const levelCleanupAssist = isFirstLevelMode(state.devMode)
        ? Math.max(state.levelCleanupAssist, state.levelCompletionTriggered ? 1 : 0)
        : 0
      const pile = piles[mote.pileIndex % piles.length]
      if (hoseBlowActive && visibleProgress > EASY_SUCTION_TUNING.visibleFloor && mote.levelCleared < 0.5) {
        slimeSurfaceVector.copy(mote.position).sub(mouth)
        slimeSurfaceVector.y *= 0.14
        const blowOriginDistance = Math.max(0.001, slimeSurfaceVector.length())
        const blowDistance = Math.max(0.001, blowOriginDistance - mote.size * 0.48)
        const blowForwardAlignment = Math.max(0, slimeSurfaceVector.dot(forward) / blowOriginDistance)
        const blowDistanceGate = Math.pow(
          smooth01((PRODUCTION_TUNING.blow.radius - blowDistance) / Math.max(0.001, PRODUCTION_TUNING.blow.radius)),
          PRODUCTION_TUNING.blow.falloffPower,
        )
        const blowConeGate = smooth01(
          (blowForwardAlignment - PRODUCTION_TUNING.blow.coneDotMin)
            / Math.max(0.001, 1 - PRODUCTION_TUNING.blow.coneDotMin),
        )
        const blowNearGate = smooth01(
          (PRODUCTION_TUNING.blow.nearRadius - blowDistance) / Math.max(0.001, PRODUCTION_TUNING.blow.nearRadius),
        )
        const blowInfluence = clampValue(
          blowStrength
            * Math.max(blowDistanceGate * blowConeGate, blowNearGate * 0.58)
            * (0.44 + Math.min(1, mote.visibleMass) * 0.56),
          0,
          1.45,
        )
        if (blowInfluence > 0.002) {
          if (slimeSurfaceVector.lengthSq() > 0.0001) slimeSurfaceVector.normalize()
          else slimeSurfaceVector.copy(forward)
          slimeSlideTangentVector.set(-forward.z, 0, forward.x)
          if (slimeSlideTangentVector.lengthSq() < 0.0001) slimeSlideTangentVector.set(1, 0, 0)
          slimeSlideTangentVector.normalize().multiplyScalar(seededNoise(mote.seed + t * 0.37) > 0.5 ? 1 : -1)
          slimeSurfaceVector
            .lerp(forward, PRODUCTION_TUNING.blow.forwardBias * (0.48 + blowConeGate * 0.52))
            .addScaledVector(
              slimeSlideTangentVector,
              (seededNoise(mote.seed + t * 0.91) * 2 - 1)
                * PRODUCTION_TUNING.blow.sideScatter
                * (0.14 + blowInfluence * 0.28),
            )
          if (slimeSurfaceVector.lengthSq() > 0.0001) slimeSurfaceVector.normalize()
          const pushForce = blowInfluence
            * PRODUCTION_TUNING.blow.force
            * (1 + blowNearGate * PRODUCTION_TUNING.blow.nearForce)
            * (0.58 + mote.floorStick * 0.42)
          mote.velocity.addScaledVector(slimeSurfaceVector, cappedDt * pushForce)
          mote.velocity.y += cappedDt * pushForce * (0.018 + blowNearGate * 0.025)
          const planarBlowSpeed = Math.hypot(mote.velocity.x, mote.velocity.z)
          if (planarBlowSpeed > PRODUCTION_TUNING.blow.maxMoteSpeed) {
            const speedScale = PRODUCTION_TUNING.blow.maxMoteSpeed / planarBlowSpeed
            mote.velocity.x *= speedScale
            mote.velocity.z *= speedScale
          }
          const anchorShift = cappedDt * blowInfluence * PRODUCTION_TUNING.blow.anchorPushStrength
          const homeShift = cappedDt * blowInfluence * PRODUCTION_TUNING.blow.homePushStrength
          mote.anchor.addScaledVector(slimeSurfaceVector, anchorShift)
          mote.home.addScaledVector(slimeSurfaceVector, homeShift)
          clampSlimeFloorPoint(mote.anchor)
          clampSlimeFloorPoint(mote.home)
          mote.home.y = SLIME_MOTE_FLOOR_Y + mote.size * 0.42
          const pileMassSignal = Math.max(
            0,
            pile.mass * 0.52 + pile.targetMass * 0.34 + pile.absorbedMass * 0.18 + mote.visibleMass,
          )
          const chunkMassBoost = clampValue(
            Math.sqrt(pileMassSignal) * 0.18,
            0,
            PRODUCTION_TUNING.blow.chunkPushMassBoost,
          )
          const pileShift = cappedDt
            * blowInfluence
            * PRODUCTION_TUNING.blow.pilePushStrength
            * (0.42 + Math.min(1, mote.visibleMass) * 0.58)
          const chunkShift = cappedDt
            * blowInfluence
            * PRODUCTION_TUNING.blow.chunkPushStrength
            * (0.55 + blowNearGate * 0.45)
            * (0.8 + chunkMassBoost)
          const totalPileShift = pileShift + chunkShift
          pile.center.addScaledVector(slimeSurfaceVector, totalPileShift)
          pile.targetCenter.addScaledVector(
            slimeSurfaceVector,
            totalPileShift * (0.85 + PRODUCTION_TUNING.blow.pileConvergeAssist),
          )
          clampSlimeFloorPoint(pile.center)
          clampSlimeFloorPoint(pile.targetCenter)
          if (mote.latched > 0.5) {
            mote.latched = 0
            mote.latchAge = 0
            latchSeal = 0
            mote.velocity.addScaledVector(
              slimeSurfaceVector,
              PRODUCTION_TUNING.blow.unlatchImpulse * blowInfluence,
            )
            mote.sealLeak = Math.max(mote.sealLeak, 0.62)
            mote.deepEmbedState = 'pop-out-snap'
            mote.deepEmbedDepth = 0
            mote.deepEmbedPopPulse = Math.max(mote.deepEmbedPopPulse, blowInfluence * 0.58)
            mote.flowBridgeBreak = Math.max(mote.flowBridgeBreak, blowInfluence * 0.72)
            mote.snapBondCooldown = Math.max(mote.snapBondCooldown, 0.16)
          }
          if (state.sealTargetMoteId === i && state.suctionState !== 'sealed') {
            state.sealTargetMoteId = -1
            state.sealTargetPileIndex = -1
            state.sealTargetScore = 0
            state.slimeSealDemand = 0
            state.slimeSealStrength = 0
            state.hoseHookStrength = 0
            state.suctionState = 'releasing'
          }
          mote.edgeWobble = Math.max(mote.edgeWobble, blowInfluence * 0.68)
          mote.intakeRecoil = Math.max(mote.intakeRecoil, blowInfluence * 0.52)
          mote.contactSnap = Math.max(mote.contactSnap, blowInfluence * 0.24)
          mote.livingFlow = Math.max(mote.livingFlow, blowInfluence * 0.76)
          mote.livingBreak = Math.max(mote.livingBreak, blowInfluence * 0.46)
          mote.stretchMemory = Math.max(mote.stretchMemory, blowInfluence * 0.42)
          mote.tendril = Math.max(mote.tendril, blowInfluence * 0.18)
          mote.materialWake = Math.max(mote.materialWake, blowInfluence * PRODUCTION_TUNING.blow.visualWake)
          mote.colorBloom = Math.max(mote.colorBloom, blowInfluence * 0.38)
          mote.reemergeCharge = Math.max(mote.reemergeCharge, blowInfluence * 0.18)
          pile.livingCreep = Math.max(pile.livingCreep, blowInfluence * 0.58)
          pile.livingBreak = Math.max(pile.livingBreak, blowInfluence * 0.34)
          pile.targetChroma += blowInfluence * 0.18
          hoseBlowPushTotal += pushForce * blowInfluence
          hoseBlowAffectedMotes += blowInfluence > 0.08 ? 1 : 0
          hoseBlowMaxDistance = Math.max(hoseBlowMaxDistance, blowDistance)
        }
      }
      const pileMassForContact = Math.max(
        pile.mass,
        pile.targetMass,
        pile.absorbedMass * 0.35,
        mote.visibleMass * 0.7,
      )
      const pileSurfaceRadius = PRODUCTION_TUNING.suction.pileSurfaceRadiusBase
        + Math.min(
          PRODUCTION_TUNING.suction.pileSurfaceMassRadiusMax,
          Math.sqrt(Math.max(0, pileMassForContact)) * PRODUCTION_TUNING.suction.pileSurfaceMassRadiusScale,
        )
        + mote.size * 0.35
      const pileMouthDx = pile.center.x - suctionOrigin.x
      const pileMouthDz = pile.center.z - suctionOrigin.z
      const pileMouthDistance = Math.max(0.001, Math.hypot(pileMouthDx, pileMouthDz))
      const pileSurfaceDistance = Math.max(0.001, pileMouthDistance - pileSurfaceRadius)
      slimeSurfaceVector.set(-pileMouthDx, 0, -pileMouthDz)
      if (slimeSurfaceVector.lengthSq() > 0.0001) slimeSurfaceVector.normalize()
      else slimeSurfaceVector.set(0, 0, 1)
      slimeSlideTargetVector.copy(pile.center).addScaledVector(slimeSurfaceVector, pileSurfaceRadius)
      const pilePatchDx = mote.position.x - slimeSlideTargetVector.x
      const pilePatchDz = mote.position.z - slimeSlideTargetVector.z
      const pilePatchDistance = Math.max(0.001, Math.hypot(pilePatchDx, pilePatchDz))
      const pileSurfacePatchRadius = PRODUCTION_TUNING.suction.pileSurfacePatchRadius
        + mote.size * 1.4
        + Math.min(
          PRODUCTION_TUNING.suction.pileSurfacePatchMassMax,
          Math.sqrt(Math.max(0, pileMassForContact)) * PRODUCTION_TUNING.suction.pileSurfacePatchMassScale,
        )
      const pileSurfaceContactDistance = pileSurfaceDistance
        + Math.max(0, pilePatchDistance - pileSurfacePatchRadius) * 0.72
      const pileSurfaceVerticalDistance = Math.abs(mouth.y - (SLIME_MOTE_FLOOR_Y + mote.size * 0.52))
      const directPileContactGate = computePhysicalPileContactGate({
        surfaceDistance: pileSurfaceDistance,
        patchDistance: pilePatchDistance,
        patchRadius: pileSurfacePatchRadius,
        verticalDistance: pileSurfaceVerticalDistance,
      })
      const contactDistance = Math.min(edgeDistance, pileSurfaceContactDistance)
      const physicalContactGate = clampValue(
        Math.max(
          smooth01(
            (PRODUCTION_TUNING.suction.physicalContactDistance - contactDistance)
              / Math.max(0.001, PRODUCTION_TUNING.suction.physicalContactDistance),
          ),
          directPileContactGate,
          latchSeal * smooth01(
            (PRODUCTION_TUNING.suction.physicalContactGraceDistance - contactDistance)
              / Math.max(0.001, PRODUCTION_TUNING.suction.physicalContactGraceDistance),
          ),
          stickyContactOriginActive ? 1 : 0,
        ),
        0,
        1,
      )
      let mouthBridgePhysicallyConnected = stickyAnchorActive
        || (
          (state.suctionState === 'contact' || state.suctionState === 'sealed')
          && mote.latched > 0.5
          && contactDistance < PRODUCTION_TUNING.suction.pileSurfaceContactGraceDistance
        )
	      const finalCleanupProximity = smooth01(
	        (FIRST_LEVEL_TUNING.finalCleanupPullRadius - contactDistance)
	          / Math.max(0.001, FIRST_LEVEL_TUNING.finalCleanupPullRadius),
	      )
      const finalCleanupPull = hoseBlowActive ? 0 : levelCleanupAssist * finalCleanupProximity
      if (finalCleanupPull > 0.01 && mote.levelCleared < 0.5 && visibleProgress > 0.025) {
        slimeSurfaceVector.copy(mouth).sub(mote.position)
        slimeSurfaceVector.y *= 0.42
        if (slimeSurfaceVector.lengthSq() > 0.0001) {
          slimeSurfaceVector.normalize()
          const cleanupForce = finalCleanupPull
            * FIRST_LEVEL_TUNING.finalCleanupPullStrength
            * getLevelDifficultyConfig(state.levelDifficulty).suctionAssistMultiplier
          mote.velocity.addScaledVector(slimeSurfaceVector, cappedDt * cleanupForce)
          mote.edgeWobble = Math.max(mote.edgeWobble, finalCleanupPull * 0.18)
          mote.colorBloom = Math.max(mote.colorBloom, finalCleanupPull * 0.28)
          mote.contactFeed = Math.max(mote.contactFeed, finalCleanupPull * 0.16)
          mote.intakeFeed = Math.max(mote.intakeFeed, finalCleanupPull * 0.1)
        }
      }
	      const suctionDeformation = computeSuctionDeformation({
	        distance: contactDistance,
        ahead,
        influence: force.influence,
        suctionLoad: mote.suctionLoad,
        suctionYield: mote.suctionYield,
        latchSeal,
        stretchMemory: mote.stretchMemory,
        speed: currentSpeed,
        tetherStrain: state.tetherStrain,
      })
	      const intakePreview = computeIntakeContact({
	        distance: contactDistance,
        ahead,
        influence: force.influence,
        suctionLoad: mote.suctionLoad,
        suctionYield: mote.suctionYield,
        latchSeal,
        slurp: mote.slurp,
        mass: mote.mass,
        visibleMass: mote.visibleMass,
        floorStick: mote.floorStick,
        speed: currentSpeed,
        tetherStrain: state.tetherStrain,
      })
	      const organicPreview = computeOrganicSuctionGrip({
	        distance: contactDistance,
        ahead,
        influence: force.influence,
        adhesion: intakePreview.adhesion,
        dimple: intakePreview.dimple,
        funnel: intakePreview.funnel,
        neck: intakePreview.neck,
        flow: intakePreview.flow,
        latchSeal,
        slurp: mote.slurp,
        suctionYield: mote.suctionYield,
        visibleMass: mote.visibleMass,
        mass: mote.mass,
        floorStick: mote.floorStick,
        mouthSettle: state.controllerMouthSettle,
        controllerGrip: state.controllerGripQuality,
        intakeFeed: mote.intakeFeed,
        speed: currentSpeed,
      })
	      const contactPreview = computeMouthContactSequence({
	        distance: contactDistance,
        ahead,
        adhesion: intakePreview.adhesion,
        dimple: intakePreview.dimple,
        funnel: intakePreview.funnel,
        neck: intakePreview.neck,
        flow: intakePreview.flow,
        intakeFeed: mote.intakeFeed,
        slurpPressure: organicPreview.slurpPressure,
        organicHold: organicPreview.stuckHold,
        rimGrip: organicPreview.rimGrip,
        suctionYield: mote.suctionYield,
        latchSeal,
        slurp: mote.slurp,
        visibleMass: mote.visibleMass,
        mass: mote.mass,
        floorStick: mote.floorStick,
        speed: currentSpeed,
      })
	      const grabReadiness = computeSlimeGrabReadiness({
	        distance: contactDistance,
        ahead,
        suctionInfluence: force.influence,
        pointerDown: suctionIntentActive,
        active: suctionActiveForSlime,
        hookStrength: state.hoseHookStrength,
        releaseMomentum: state.controllerReattachGrace + state.controllerReleaseMomentum * 0.45,
        bodySpeed: state.velocity.length(),
      })
      const easySuction = computeEasySuctionAssist({
	        distance: contactDistance,
        ahead,
        influence: force.influence,
        visibleMass: mote.visibleMass,
        floorStick: mote.floorStick,
        suctionYield: mote.suctionYield,
        pointerDown: suctionIntentActive,
        active: suctionActiveForSlime,
        latchSeal,
        grabReadiness,
        adhesion: intakePreview.adhesion,
        magneticPull: organicPreview.magneticPull,
        contactReadiness: contactPreview.readiness,
        physicalContact: physicalContactGate,
        reattachGrace: Math.max(
          state.controllerReattachGrace,
          state.postSnapReattachTimer / Math.max(0.001, PRODUCTION_TUNING.hose.postSnapReattachDelay + 0.12),
          state.anchorReattachGraceTimer / getStretchSnapReattachGraceDuration(state),
        ),
        bodySpeed: state.velocity.length(),
      })
      const pileSurfaceAssist = computePileSurfaceSuctionAssist({
        surfaceDistance: pileSurfaceContactDistance,
        ahead,
        influence: force.influence,
        visibleMass: Math.max(mote.visibleMass, Math.min(1.35, pileMassForContact * 0.24)),
        active: suctionActiveForSlime,
        latchSeal,
        physicalContact: physicalContactGate,
      })
      const reattachGrace = Math.max(
        state.controllerReattachGrace,
        state.postSnapReattachTimer / Math.max(0.001, PRODUCTION_TUNING.hose.postSnapReattachDelay + 0.12),
        state.anchorReattachGraceTimer / getStretchSnapReattachGraceDuration(state),
      )
      candidateDirectionVector.copy(mote.position).sub(mouth)
      candidateDirectionVector.y = 0
      const candidateDistanceSq = candidateDirectionVector.lengthSq()
      if (candidateDistanceSq > 0.0001) candidateDirectionVector.normalize()
      candidateBodyVector.copy(mote.position).sub(state.position)
      candidateBodyVector.y = 0
      if (candidateBodyVector.lengthSq() > 0.0001) candidateBodyVector.normalize()
      const bodySpeed = state.velocity.length()
      const manualGrip = state.gripActive && state.gripTargetMoteId === i
      const gripPileActive = state.gripActive && state.gripTargetPileIndex === mote.pileIndex
      const gripRecoveryTarget = !state.gripActive
        && state.gripTargetMoteId === i
        && (state.gripState === 'spinout' || state.gripState === 'recovery')
      if (gripRecoveryTarget && mote.latched > 0.5) {
        mote.latched = 0
        mote.latchAge = 0
        mote.sealLeak = Math.max(mote.sealLeak, state.gripState === 'spinout' ? 0.72 : 0.36)
        mote.deepEmbedDepth = 0
        mote.deepEmbedState = state.gripState === 'spinout' ? 'pop-out-snap' : 'recovery'
        mote.deepEmbedPopPulse = Math.max(mote.deepEmbedPopPulse, state.gripSpinoutPulse)
        mote.snapBondCooldown = Math.max(mote.snapBondCooldown, PRODUCTION_TUNING.grip.gripCooldown)
      }
      if (state.gripCoughPulse > 0.025 && state.gripTargetPileIndex === mote.pileIndex) {
        slimeSurfaceVector.copy(mote.position).sub(state.position)
        slimeSurfaceVector.y *= 0.18
        if (slimeSurfaceVector.lengthSq() > 0.0001) slimeSurfaceVector.normalize()
        else slimeSurfaceVector.set(Math.sin(mote.seed), 0, Math.cos(mote.seed)).normalize()
        const cough = state.gripCoughPulse * PRODUCTION_TUNING.grip.gripCoughBurstStrength
        mote.velocity.addScaledVector(slimeSurfaceVector, cappedDt * cough * (1.2 + seededNoise(mote.seed + t) * 0.6))
        mote.edgeWobble = Math.max(mote.edgeWobble, cough * 0.28)
        mote.colorBloom = Math.max(mote.colorBloom, cough * 0.42)
        mote.flowBridgeBreak = Math.max(mote.flowBridgeBreak, cough * 0.28)
        mote.intakeRecoil = Math.max(mote.intakeRecoil, cough * 0.22)
        mote.sealLeak = Math.max(mote.sealLeak, cough * 0.18)
      }
      const travelAlignment = bodySpeed > 0.001
        ? Math.max(0, state.velocity.dot(candidateDirectionVector) / bodySpeed)
        : ahead * 0.5
      const swingArc = Math.max(
        Math.abs(candidateDirectionVector.x * state.mouthForward.z - candidateDirectionVector.z * state.mouthForward.x),
        Math.abs(candidateBodyVector.x * state.mouthForward.z - candidateBodyVector.z * state.mouthForward.x) * 0.72,
      )
	      const baseCandidateScore = computeSuctionCandidateScore({
	        distance: contactDistance,
        ahead,
        influence: force.influence,
        visibleMass: mote.visibleMass,
        floorStick: mote.floorStick,
        bodySpeed,
        travelAlignment,
        swingArc,
        reattachGrace,
        currentAnchor: state.sealTargetMoteId === i,
      })
      const anchorGrace = clampValue(
        state.anchorReattachGraceTimer / getStretchSnapReattachGraceDuration(state),
        0,
        1,
      )
      const justReleasedAnchor = state.anchorReleaseTargetMoteId === i
        || (state.anchorReleaseTargetPileIndex >= 0 && mote.pileIndex === state.anchorReleaseTargetPileIndex)
      const releaseExitDistance = Math.max(
        state.position.distanceTo(state.anchorReleasePoint),
        state.mouth.distanceTo(state.anchorReleasePoint),
      )
      const needsExitDistance = justReleasedAnchor
        && releaseExitDistance < PRODUCTION_TUNING.suction.reattachMinimumExitDistanceFromOldAnchor
      const sameAnchorSuppressed = anchorGrace > 0
        && justReleasedAnchor
        && (state.anchorReattachCooldownTimer > 0.015
          || needsExitDistance
          || (state.anchorReleaseTargetPileIndex >= 0 && mote.pileIndex === state.anchorReleaseTargetPileIndex)
          || mote.position.distanceTo(state.anchorReleasePoint) < PRODUCTION_TUNING.suction.reattachSameAnchorReturnRadius)
	      const assistDistanceGate = smooth01(
	        (PRODUCTION_TUNING.suction.reattachAssistRadius - contactDistance)
	          / Math.max(0.001, PRODUCTION_TUNING.suction.reattachAssistRadius),
	      )
      const assistAngleGate = smooth01(
        (travelAlignment - PRODUCTION_TUNING.suction.reattachAssistAngle)
          / Math.max(0.001, 1 - PRODUCTION_TUNING.suction.reattachAssistAngle),
      )
      const reattachDistanceEligible = contactDistance <= PRODUCTION_TUNING.suction.reattachAssistMaxContactDistance
      const reattachTravelEligible = travelAlignment >= PRODUCTION_TUNING.suction.reattachAssistMinTravelAlignment
        || physicalContactGate > PRODUCTION_TUNING.suction.contactPhysicsGateMin
      const stableCandidateHold = state.anchorReattachCandidateMoteId === i ? 0.22 : 0
      const newTargetPreference = justReleasedAnchor
        ? Math.max(0.08, 1 - PRODUCTION_TUNING.suction.reattachSameGlobPenalty)
        : 1 + anchorGrace * PRODUCTION_TUNING.suction.reattachNewTargetPreference
      const reattachAssistScore = sameAnchorSuppressed || !reattachDistanceEligible || !reattachTravelEligible
        ? 0
        : anchorGrace
          * assistDistanceGate
          * (0.26 + assistAngleGate * 0.56 + travelAlignment * PRODUCTION_TUNING.suction.reattachVelocityBias)
          * (0.58 + Math.min(1, mote.visibleMass) * 0.26 + stableCandidateHold)
          * (0.74 + state.anchorReattachAssistStrength * 0.42)
          * newTargetPreference
      if (anchorGrace > 0.015 && reattachAssistScore > 0.045) {
        const currentCandidateExpired = state.anchorReattachCandidateAge > PRODUCTION_TUNING.suction.reattachCandidateHoldTime * 2.4
          && state.anchorReattachCandidateScore < PRODUCTION_TUNING.suction.reattachCandidateMinScore
        const switchMargin = PRODUCTION_TUNING.suction.reattachCandidateSwitchMargin
          * (state.anchorReattachCandidateAge < PRODUCTION_TUNING.suction.reattachCandidateHoldTime ? 1.45 : 1)
        const canClaimCandidate = state.anchorReattachCandidateMoteId < 0
          || state.anchorReattachCandidateMoteId === i
          || reattachAssistScore > state.anchorReattachCandidateScore + switchMargin
          || currentCandidateExpired
        if (canClaimCandidate) {
          if (state.anchorReattachCandidateMoteId !== i) state.anchorReattachCandidateAge = 0
          state.anchorReattachCandidateMoteId = i
          state.anchorReattachCandidateScore = Math.max(state.anchorReattachCandidateScore, reattachAssistScore)
          state.anchorReattachCandidatePoint.copy(mote.position)
        } else {
          recordReattachRejectedCandidate(state, i, 'heldCandidate', reattachAssistScore)
        }
      } else if (anchorGrace > 0.015) {
	          const rejectReason: ReattachRejectReason = sameAnchorSuppressed
	            ? (needsExitDistance ? 'needsExitDistance' : 'sameAnchorCooldown')
	          : !reattachDistanceEligible
	            ? 'tooFar'
            : !reattachTravelEligible
              ? 'behindTravel'
              : 'weakCandidate'
        recordReattachRejectedCandidate(
          state,
          i,
          rejectReason,
          Math.max(reattachAssistScore, assistDistanceGate * 0.2 + assistAngleGate * 0.2 + Math.min(1, mote.visibleMass) * 0.05),
        )
      }
      const stableReattachCandidate = anchorGrace > 0.015
        && state.anchorReattachCandidateMoteId === i
        && !sameAnchorSuppressed
        && reattachDistanceEligible
        && reattachTravelEligible
        && state.anchorReattachCandidateScore >= PRODUCTION_TUNING.suction.reattachCandidateMinScore
      const reattachPhysicalContactGate = stableReattachCandidate
        ? smooth01(
          (PRODUCTION_TUNING.suction.physicalReattachContactDistance - contactDistance)
            / Math.max(0.001, PRODUCTION_TUNING.suction.physicalReattachContactDistance),
        )
        : 0
      const reattachAssistedContactGate = stableReattachCandidate
        ? clampValue(
          Math.max(
            reattachPhysicalContactGate,
            reattachAssistScore * (0.54 + state.anchorReattachAssistStrength * 0.2),
          ),
          0,
          1,
        )
        : 0
      const reattachSealContactGate = Math.max(
        physicalContactGate,
        reattachPhysicalContactGate,
        reattachAssistedContactGate,
      )
	      const canCreatePhysicalSeal = !hoseBlowActive && (
	        manualGrip
	          || stickyAnchorActive
	          || physicalContactGate > PRODUCTION_TUNING.suction.contactPhysicsGateMin
	          || reattachPhysicalContactGate > PRODUCTION_TUNING.suction.contactPhysicsGateMin
	          || reattachAssistedContactGate > PRODUCTION_TUNING.suction.contactPhysicsGateMin
	          || pileSurfaceAssist.lock > 0.1
	          || pileSurfaceAssist.sealBoost > 0.12
	          || (finalCleanupPull > 0.78 && contactDistance < PRODUCTION_TUNING.suction.physicalContactGraceDistance)
	      )
      const physicalContactEffectGate = canCreatePhysicalSeal
        ? Math.max(
          physicalContactGate,
          reattachSealContactGate,
          manualGrip || stickyAnchorActive ? 1 : 0,
        )
        : 0
	      let candidateScore = baseCandidateScore
	        + (stableReattachCandidate ? reattachAssistScore * PRODUCTION_TUNING.suction.reattachAssistStrength : 0)
	      const pivotCandidateScore = candidateScore + travelAlignment * 0.18 + reattachGrace * 0.14 + swingArc * 0.12
	      if (pivotCandidateScore > bestPivotCandidateScore) {
	        bestPivotCandidateScore = pivotCandidateScore
	        state.pivotCandidateTargetId = i
	      }
	      const baseCandidateBoost = smooth01((candidateScore - 0.22) / 0.82)
	      const tactileBrushProximity = smooth01(
	        (PRODUCTION_TUNING.suction.tactileBrushRadius - contactDistance)
	          / Math.max(0.001, PRODUCTION_TUNING.suction.tactileBrushRadius),
	      )
	      const tactileLockProximity = smooth01(
	        (PRODUCTION_TUNING.suction.tactileLockRadius - contactDistance)
	          / Math.max(0.001, PRODUCTION_TUNING.suction.tactileLockRadius),
	      )
	      const tactileFacing = clampValue(
	        0.38
	          + ahead * 0.42
	          + force.influence * 0.16
	          + easySuction.brush * 0.22
	          + baseCandidateBoost * 0.18,
	        0,
	        1.28,
	      )
	      const tactileBrush = clampValue(
	        tactileBrushProximity * tactileFacing * (0.7 + Math.min(1, mote.visibleMass) * 0.22)
            + pileSurfaceAssist.brush,
	        0,
	        1.35,
	      )
	      const tactileLock = clampValue(
	        tactileLockProximity * (
	          0.42
	            + ahead * 0.34
	            + easySuction.autoLatch * 0.3
	            + baseCandidateBoost * 0.22
	            + tactileBrush * 0.18
	        )
            + pileSurfaceAssist.lock,
	        0,
	        1.25,
	      )
	      candidateScore = Math.min(1.75, candidateScore + tactileBrush * 0.16 + tactileLock * 0.3 + pileSurfaceAssist.sealBoost * 0.22)
	      const candidateBoost = smooth01((candidateScore - 0.22) / 0.82)
			      const previewContactFlow = computeSuctionContactFlow({
		        distance: contactDistance,
	        ahead,
	        influence: force.influence,
	        latchSeal,
	        candidateScore,
	        visibleMass: mote.visibleMass,
	        mass: mote.mass,
	        floorStick: mote.floorStick,
	        suctionYield: mote.suctionYield,
	        contactReadiness: contactPreview.readiness,
	        contactRope: mote.contactRope,
	        contactFeed: mote.contactFeed,
	        intakeFlow: mote.intakeFlow,
	        intakeFeed: mote.intakeFeed,
	        rimGrip: organicPreview.rimGrip,
	        organicHold: organicPreview.stuckHold,
	        slurpPressure: organicPreview.slurpPressure,
	        glugPulse: mote.glugPulse,
	        glugMassTransfer: state.glugMassFlow,
	        tetherStrain: state.tetherStrain,
	        swingTension: state.swingTension,
	        bodySpeed,
	      })
      const targetHoldActive = state.sealTargetMoteId >= 0
        && state.sealTargetMoteId !== i
        && !stableReattachCandidate
        && !manualGrip
        && (state.suctionState === 'prePull'
          || state.suctionState === 'contact'
          || state.suctionApproachLocked
          || state.slimeSealAge < PRODUCTION_TUNING.suction.suctionTargetHoldSeconds
          || state.hoseHookStrength > 0.08)
      const stickyTargetSwitchPenalty = state.pivotLocked || state.deepEmbedDepth > 0.08 || state.slimeSealAge > 0.18 ? 0.82 : 0
      const targetHoldSwitchPenalty = targetHoldActive ? 0.62 : 0
      const targetAllowsLatch = state.sealTargetMoteId < 0
        || state.sealTargetMoteId === i
        || stableReattachCandidate
        || manualGrip
        || (!targetHoldActive && state.hoseHookStrength < 0.12)
        || candidateScore > state.sealTargetScore + PRODUCTION_TUNING.suction.targetSwitchMargin + stickyTargetSwitchPenalty + targetHoldSwitchPenalty
        || finalCleanupPull > 0.42
      const sealCandidate = { moteId: i, score: candidateScore, pileIndex: mote.pileIndex }
      if (stableReattachCandidate && visibleProgress > EASY_SUCTION_TUNING.visibleFloor && mote.latched < 0.5) {
        slimeSurfaceVector.copy(mouth).sub(mote.position)
        slimeSurfaceVector.y *= 0.34
        if (slimeSurfaceVector.lengthSq() > 0.0001) {
          slimeSurfaceVector.normalize()
          slimeSlideTargetVector.copy(mote.position).addScaledVector(
            slimeSurfaceVector,
            mote.size * (0.78 + reattachAssistScore * 0.36),
          )
          slimeSlideTargetVector.y = Math.max(SLIME_MOTE_FLOOR_Y + mote.size * 0.56, mote.position.y + mote.size * 0.14)
          if (canCreatePhysicalSeal) {
            registerSlimeSeal(
              state,
              slimeSlideTargetVector,
              (0.36 + reattachAssistScore * 0.5 + state.anchorReattachAssistStrength * 0.18) * reattachSealContactGate,
              sealCandidate,
            )
          }
          mote.velocity.addScaledVector(slimeSurfaceVector, cappedDt * reattachAssistScore * 0.52)
          mote.contactReadiness = Math.max(mote.contactReadiness, reattachAssistScore * 0.36)
          mote.contactDent = Math.max(mote.contactDent, reattachAssistScore * 0.24)
          mote.colorBloom = Math.max(mote.colorBloom, reattachAssistScore * 0.28)
        }
      }
	      mote.easySuctionAssist = damp(
	        mote.easySuctionAssist,
	        Math.max(easySuction.brush, candidateBoost * 0.18, tactileBrush * 0.82, tactileLock * 0.7, pileSurfaceAssist.brush),
	        Math.max(easySuction.brush, tactileBrush, pileSurfaceAssist.brush) > mote.easySuctionAssist ? 12.4 : 4.4,
	        cappedDt,
	      )
	      mote.easySuctionPull = damp(
	        mote.easySuctionPull,
	        Math.max(
	          easySuction.pullBoost,
	          candidateBoost * reattachGrace * 0.22 * physicalContactEffectGate,
	          tactileBrush * physicalContactGate * PRODUCTION_TUNING.suction.tactileBrushPullStrength,
	          tactileLock * physicalContactGate * 0.52,
	          pileSurfaceAssist.pullBoost,
	        ),
	        Math.max(easySuction.pullBoost, tactileBrush, pileSurfaceAssist.pullBoost) > mote.easySuctionPull ? 13.4 : 4.4,
	        cappedDt,
	      )
	      mote.easySuctionFeed = damp(
	        mote.easySuctionFeed,
	        Math.max(
	          easySuction.feedBoost,
	          candidateBoost * 0.14 * physicalContactEffectGate,
	          tactileBrush * physicalContactGate * 0.12,
	          tactileLock * physicalContactGate * PRODUCTION_TUNING.suction.tactileFeedBoost,
	          pileSurfaceAssist.feedBoost,
	        ),
	        Math.max(easySuction.feedBoost, tactileLock, pileSurfaceAssist.feedBoost) > mote.easySuctionFeed ? 12.8 : 4.0,
	        cappedDt,
	      )
      mote.growthWake = damp(
        mote.growthWake,
        easySuction.growthWake,
        easySuction.growthWake > mote.growthWake ? 6.8 : 2.4,
        cappedDt,
      )
	      const contactEligible = !hoseBlowActive
          && visibleProgress > EASY_SUCTION_TUNING.visibleFloor
          && canCreatePhysicalSeal
          && !sameAnchorSuppressed
	        && targetAllowsLatch
				        && (manualGrip || stableReattachCandidate || grabReadiness > 0.18 || intakePreview.adhesion > 0.14 || organicPreview.magneticPull > 0.14 || organicPreview.rimGrip > 0.14 || contactPreview.lipSeal > 0.16 || easySuction.autoLatch > EASY_SUCTION_TUNING.latchThreshold || tactileLock > 0.14 || tactileBrush > 0.34 || pileSurfaceAssist.lock > 0.12 || pileSurfaceAssist.brush > 0.22 || pileSurfaceAssist.sealBoost > 0.14 || candidateScore > 0.54 || previewContactFlow.sealQuality > 0.22 || finalCleanupPull > 0.28)
				        && (manualGrip || stableReattachCandidate || suctionIntentActive || tactileLock > 0.2 || tactileBrush > 0.44 || pileSurfaceAssist.lock > 0.16 || pileSurfaceAssist.brush > 0.32 || pileSurfaceAssist.sealBoost > 0.18 || contactDistance < 1.12 || (suctionActiveForSlime && (contactDistance < 1.5 || candidateScore > 0.68 || previewContactFlow.bridgeIntent > 0.42)) || easySuction.autoLatch > 0.22 || candidateScore > 0.74 || previewContactFlow.bridgeIntent > 0.42 || finalCleanupPull > 0.34)
	        && mote.snapBondCooldown <= 0.02
      mouthBridgePhysicallyConnected = mouthBridgePhysicallyConnected
        || contactEligible
        || (
          state.sealTargetMoteId === i
          && (state.suctionState === 'contact' || state.suctionState === 'sealed')
        )
      mote.mouthContactConnected = mouthBridgePhysicallyConnected ? 1 : 0
	      if (!hoseBlowActive && !contactEligible && previewContactFlow.bridgeIntent > 0.08 && visibleProgress > 0.04 && mote.latched < 0.5) {
	        slimeSurfaceVector.copy(mouth).sub(mote.position)
	        slimeSurfaceVector.y *= 0.34
	        if (slimeSurfaceVector.lengthSq() > 0.0001) {
	          slimeSurfaceVector.normalize()
	          const previewAirflow = Math.max(previewContactFlow.preContactVisual, previewContactFlow.bridgeIntent)
	          slimeSlideTargetVector.copy(mote.position).addScaledVector(slimeSurfaceVector, mote.size * (0.62 + previewContactFlow.bridgeIntent * 0.84 + previewContactFlow.preContactVisual * 0.2))
	          slimeSlideTargetVector.y = Math.max(SLIME_MOTE_FLOOR_Y + mote.size * 0.52, mote.position.y + mote.size * (0.1 + previewAirflow * 0.06))
	          mote.sealPoint.lerp(slimeSlideTargetVector, Math.min(0.24, cappedDt * (3.6 + previewAirflow * 3.2)))
            mote.velocity.addScaledVector(slimeSurfaceVector, cappedDt * previewContactFlow.preContactPull * 0.32)
            mote.contactReadiness = Math.max(mote.contactReadiness, previewAirflow * 0.28)
            mote.contactTongue = Math.max(mote.contactTongue, previewAirflow * livingTuning.suctionBulgeStrength * 0.18)
            mote.intakeFunnel = Math.max(mote.intakeFunnel, previewAirflow * 0.16)
            mote.flowBridge = Math.max(mote.flowBridge, previewContactFlow.bridgeIntent * livingTuning.bridgeOrganicness * 0.42)
            mote.flowBridgeThickness = Math.max(
              mote.flowBridgeThickness,
              PRODUCTION_TUNING.suction.flowBridgeMinThickness + previewAirflow * 0.07,
            )
            mote.edgeWobble = Math.max(mote.edgeWobble, previewAirflow * 0.24)
            mote.colorBloom = Math.max(mote.colorBloom, previewAirflow * 0.18)
		        }
		      }
		      if (!hoseBlowActive && !contactEligible && Math.max(tactileBrush, pileSurfaceAssist.brush) > 0.14 && visibleProgress > 0.08 && mote.latched < 0.5) {
		        slimeSurfaceVector.copy(mouth).sub(mote.position)
		        slimeSurfaceVector.y *= 0.36
		        if (slimeSurfaceVector.lengthSq() > 0.0001) {
		          slimeSurfaceVector.normalize()
		          const tactileSurfaceBrush = Math.max(tactileBrush, pileSurfaceAssist.brush)
		          const tactileSurfaceLock = Math.max(tactileLock, pileSurfaceAssist.lock)
		          slimeSlideTargetVector.copy(mote.position).addScaledVector(
		            slimeSurfaceVector,
		            mote.size * (0.56 + tactileSurfaceBrush * 0.58 + tactileSurfaceLock * 0.4),
		          )
		          slimeSlideTargetVector.y = Math.max(
		            SLIME_MOTE_FLOOR_Y + mote.size * 0.52,
		            mote.position.y + mote.size * (0.1 + tactileSurfaceLock * 0.1),
		          )
			          mote.velocity.addScaledVector(slimeSurfaceVector, cappedDt * tactileSurfaceBrush * 0.32)
			          mote.contactReadiness = Math.max(mote.contactReadiness, tactileSurfaceBrush * 0.34)
			          mote.contactFeed = Math.max(mote.contactFeed, tactileSurfaceLock * 0.24 * Math.max(physicalContactEffectGate, pileSurfaceAssist.lock))
			          mote.intakeFeed = Math.max(mote.intakeFeed, tactileSurfaceLock * 0.18 * Math.max(physicalContactEffectGate, pileSurfaceAssist.lock))
			          mote.edgeWobble = Math.max(mote.edgeWobble, tactileSurfaceBrush * 0.32)
		          mote.colorBloom = Math.max(mote.colorBloom, tactileSurfaceBrush * 0.22 + tactileSurfaceLock * 0.1)
		        }
		      }
	      if (!hoseBlowActive && !contactEligible && grabReadiness > 0.13 && visibleProgress > 0.7 && mote.latched < 0.5 && (suctionIntentActive || state.controllerReattachGrace > 0.08)) {
        slimeSurfaceVector.copy(mouth).sub(mote.position)
        slimeSurfaceVector.y *= 0.42
        if (slimeSurfaceVector.lengthSq() > 0.0001) {
          slimeSurfaceVector.normalize()
          slimeSlideTargetVector.copy(mote.position).addScaledVector(slimeSurfaceVector, mote.size * (0.62 + grabReadiness * 0.26))
          slimeSlideTargetVector.y = Math.max(SLIME_MOTE_FLOOR_Y + mote.size * 0.5, mote.position.y + mote.size * 0.1)
          mote.edgeWobble = Math.max(mote.edgeWobble, grabReadiness * 0.14 + state.controllerReattachGrace * 0.08)
          mote.colorBloom = Math.max(mote.colorBloom, grabReadiness * 0.1)
        }
      }
      if (!hoseBlowActive && !contactEligible && easySuction.brush > EASY_SUCTION_TUNING.brushSealThreshold && visibleProgress > 0.45 && mote.latched < 0.5) {
        slimeSurfaceVector.copy(mouth).sub(mote.position)
        slimeSurfaceVector.y *= 0.38
        if (slimeSurfaceVector.lengthSq() > 0.0001) {
          slimeSurfaceVector.normalize()
          slimeSlideTargetVector.copy(mote.position).addScaledVector(
            slimeSurfaceVector,
            mote.size * (0.66 + easySuction.autoLatch * 0.44 + easySuction.aimEase * 0.22),
          )
          slimeSlideTargetVector.y = Math.max(SLIME_MOTE_FLOOR_Y + mote.size * 0.52, mote.position.y + mote.size * (0.1 + easySuction.autoLatch * 0.08))
          mote.velocity.addScaledVector(slimeSurfaceVector, cappedDt * easySuction.pullBoost * EASY_SUCTION_TUNING.magneticPullForce)
          mote.edgeWobble = Math.max(mote.edgeWobble, easySuction.brush * 0.26)
          mote.colorBloom = Math.max(mote.colorBloom, easySuction.feedBoost * 0.22 + easySuction.growthWake * 0.1)
          mote.reemergeCharge = Math.max(mote.reemergeCharge, easySuction.growthWake * 0.14)
        }
      }
      if (!hoseBlowActive && !contactEligible && organicPreview.magneticPull > 0.16 && visibleProgress > 0.7) {
        slimeSurfaceVector.copy(mouth).sub(mote.position)
        if (slimeSurfaceVector.lengthSq() > 0.0001) slimeSurfaceVector.normalize()
        slimeSlideTargetVector.copy(mote.position).addScaledVector(slimeSurfaceVector, mote.size * (0.62 + organicPreview.magneticPull * 0.28))
        slimeSlideTargetVector.y = Math.max(SLIME_MOTE_FLOOR_Y + mote.size * 0.5, mote.position.y + mote.size * 0.12)
        mote.edgeWobble = Math.max(mote.edgeWobble, organicPreview.magneticPull * 0.08)
      }
      if (!hoseBlowActive && contactPreview.readiness > 0.035 && visibleProgress > 0.7) {
        slimeSurfaceVector.copy(mouth).sub(mote.position)
        slimeSurfaceVector.y *= 0.34
        if (slimeSurfaceVector.lengthSq() > 0.0001) {
          slimeSurfaceVector.normalize()
          const preContactPull = contactPreview.readiness * (0.08 + contactPreview.lipSeal * 0.08) * Math.max(0.22, 1 - contactPreview.resistance * 0.28)
          mote.velocity.addScaledVector(slimeSurfaceVector, cappedDt * preContactPull)
          mote.edgeWobble = Math.max(mote.edgeWobble, contactPreview.readiness * 0.2 + contactPreview.dent * 0.16)
          mote.colorBloom = Math.max(mote.colorBloom, contactPreview.readiness * 0.18 + contactPreview.lipSeal * 0.14)
        }
      }
	      if (contactEligible && mote.latched < 0.5) {
	        mote.latched = 1
	        mote.latchAge = 0
	        mote.attachmentMassTransferred = 0
	        mote.glugLastAt = -999
	        mote.glugCountThisAttachment = 0
	        mote.glugEventStrength = 0
	        mote.glugEventMass = 0
	        mote.glugFailedStrength = 0
	        mote.deepEmbedState = 'surface-bite'
	        mote.deepEmbedAge = 0
	        mote.deepEmbedGlugCount = 0
	        mote.deepEmbedMassTransferred = 0
	        mote.deepEmbedReleaseReason = 'none'
	        mote.slurp = Math.max(mote.slurp, easySuction.feedBoost * 0.08)
        slimeSurfaceVector.copy(mouth).sub(mote.position)
        if (slimeSurfaceVector.lengthSq() > 0.0001) slimeSurfaceVector.normalize()
        mote.sealPoint.copy(mote.position).addScaledVector(slimeSurfaceVector, mote.size * (0.66 + contactPreview.dent * 0.18 + contactPreview.tongue * 0.12 + easySuction.autoLatch * 0.16))
	        mote.sealPoint.y = Math.max(SLIME_MOTE_FLOOR_Y + mote.size * 0.54, mote.position.y + mote.size * (0.12 + contactPreview.lipSeal * 0.06 + easySuction.autoLatch * 0.04))
        if (manualGrip) {
          mote.sealPoint.copy(state.gripLockPoint)
          mote.sealPoint.y = Math.max(SLIME_MOTE_FLOOR_Y + mote.size * 0.58, state.gripLockPoint.y)
        }
        if (stickyAnchorActive) {
          mote.sealPoint.copy(state.anchorWorldPosition)
        }
        if (stableReattachCandidate) {
          mote.contactSnap = Math.max(mote.contactSnap, 0.28 + reattachAssistScore * 0.22)
          mote.flowBridge = Math.max(mote.flowBridge, 0.36 + reattachAssistScore * 0.24)
          mote.deepEmbedPocketPulse = Math.max(mote.deepEmbedPocketPulse, 0.22 + reattachAssistScore * 0.18)
        }
		        const mouthBite = clampValue(
		          Math.max(
		            contactPreview.contactCompression,
		            intakePreview.compression,
		            contactPreview.lipSeal * 0.86,
		            contactPreview.dent * 0.82,
		            intakePreview.adhesion * 0.7,
		            easySuction.autoLatch * 0.58,
			            tactileLock * 0.5,
			            tactileBrush * 0.22,
			            pileSurfaceAssist.lock * 0.74,
			            pileSurfaceAssist.sealBoost * 0.48,
			            previewContactFlow.sealQuality * 0.28,
		          ),
		          0,
		          1.65,
		        )
		        intakePatchVector.set(
		          pile.center.x - (pileMouthDx / pileMouthDistance) * pileSurfaceRadius,
		          Math.max(SLIME_MOTE_FLOOR_Y + mote.size * 0.56, mote.position.y + mote.size * 0.16),
		          pile.center.z - (pileMouthDz / pileMouthDistance) * pileSurfaceRadius,
		        )
		        const visiblePuddleBlend = clampValue(
		          0.18
		            + pileSurfaceAssist.lock * 0.22
		            + pileSurfaceAssist.brush * 0.1
		            + smooth01((edgeDistance - pileSurfaceContactDistance + 0.24) / 0.48) * 0.2,
		          0,
		          0.58,
		        )
			        if (!manualGrip && !stickyAnchorActive) {
			          mote.sealPoint.lerp(intakePatchVector, visiblePuddleBlend)
			        }
		        mote.sealPoint.y = Math.max(
		          SLIME_MOTE_FLOOR_Y + mote.size * 0.5,
		          mote.sealPoint.y - mouthBite * PRODUCTION_TUNING.suction.mouthSealPointInset * 0.14,
		        )
		        const initialBiteDepthN = clampValue(
		          0.22
		            + mouthBite * 0.22
		            + previewContactFlow.sealQuality * 0.08
		            + pileSurfaceAssist.lock * 0.08
		            + tactileLock * 0.06,
		          0.2,
		          0.62,
		        )
		        const initialBiteDepth = PRODUCTION_TUNING.embed.embedDepthMax * initialBiteDepthN
		        mote.deepEmbedState = initialBiteDepthN > 0.42 ? 'deep-embed' : 'seal-contact'
		        mote.deepEmbedDepth = Math.max(mote.deepEmbedDepth, initialBiteDepth)
		        mote.deepEmbedLockStrength = Math.max(mote.deepEmbedLockStrength, initialBiteDepthN * 0.9 + mouthBite * 0.18)
		        mote.deepEmbedPocketPulse = Math.max(mote.deepEmbedPocketPulse, 0.4 + mouthBite * 0.36)
		        mote.deepEmbedDimple = Math.max(mote.deepEmbedDimple, initialBiteDepthN * 0.74 + mouthBite * 0.18)
		        mote.deepEmbedRimOcclusion = Math.max(mote.deepEmbedRimOcclusion, initialBiteDepthN * 0.7 + mouthBite * 0.16)
		        mote.deepEmbedHoseWobble = Math.max(mote.deepEmbedHoseWobble, 0.12 + mouthBite * 0.14)
		        mote.contactCompression = Math.max(mote.contactCompression, mouthBite * 1.12)
		        mote.contactSealRing = Math.max(
		          mote.contactSealRing,
		          contactPreview.sealRing,
		          intakePreview.sealRing,
		          mouthBite * 0.96,
		        )
		        mote.contactDent = Math.max(mote.contactDent, 0.46 + mouthBite * 0.48)
		        mote.contactLipSeal = Math.max(mote.contactLipSeal, 0.5 + mouthBite * 0.42)
		        mote.rimGrip = Math.max(mote.rimGrip, 0.46 + mouthBite * 0.34)
		        mote.organicHold = Math.max(mote.organicHold, 0.34 + mouthBite * 0.28)
		        mote.intakeDimple = Math.max(mote.intakeDimple, initialBiteDepthN * 0.46 + mouthBite * 0.18)
		        state.controllerMouthSettle = Math.max(state.controllerMouthSettle, 0.46 + mouthBite * 0.52)
		        state.deepEmbedPocketPulse = Math.max(state.deepEmbedPocketPulse, 0.36 + mouthBite * 0.32)
		        state.deepEmbedRimOcclusion = Math.max(state.deepEmbedRimOcclusion, initialBiteDepthN * 0.72 + mouthBite * 0.2)
		        state.deepEmbedDepth = Math.max(
		          state.deepEmbedDepth,
		          initialBiteDepth,
		        )
		        state.deepEmbedLockStrength = Math.max(state.deepEmbedLockStrength, mote.deepEmbedLockStrength)
		        registerSlimeSeal(
		          state,
		          mote.sealPoint,
			          PRODUCTION_TUNING.suction.mouthAnchorBiteStrength
			            + previewContactFlow.sealQuality * 0.32
			            + easySuction.sealBoost * 0.24
			            + pileSurfaceAssist.sealBoost * 0.28
			            + pileSurfaceAssist.lock * 0.2
			            + mouthBite * 0.58
			            + initialBiteDepthN * 0.26,
		          sealCandidate,
		        )
		        mote.flowBridge = Math.max(mote.flowBridge, previewContactFlow.bridgeIntent, 0.38, mouthBite * 0.42)
		        mote.flowBridgeLength = Math.max(mote.flowBridgeLength, previewContactFlow.bridgeLength)
		        mote.flowBridgeThickness = Math.max(mote.flowBridgeThickness, previewContactFlow.bridgeThickness * (1 + initialBiteDepthN * 0.28))
	        mote.sealQuality = Math.max(mote.sealQuality, previewContactFlow.sealQuality)
	        state.flash = Math.min(1.5, state.flash + 0.1)
        state.recoil = Math.min(1.5, state.recoil + 0.055)
        recordFlowAttach(state.flowMetrics, {
          time: t,
          targetId: i,
          speed: bodySpeed,
          sealStrength: previewContactFlow.sealQuality,
          contactAngle: 1 - clampValue(ahead, 0, 1),
        })
        latchSeal = smooth01((mote.latchAge + 0.04) / 0.26)
      }
	      const freeCapture = Math.max(
	        smooth01((1.18 - contactDistance) / 1.18) * Math.max(0.15, ahead),
        easySuction.pullBoost * 0.38,
        pileSurfaceAssist.pullBoost * 0.44,
        finalCleanupPull * 0.54,
      )
      const rawCaptureLift = hoseBlowActive ? 0 : Math.max(freeCapture, latchSeal * 0.92)
      const suctionPressure = hoseBlowActive
        ? 0
        : Math.max(
          force.influence * (0.74 + ahead * 0.36) + easySuction.pullBoost * EASY_SUCTION_TUNING.pressureBoost + finalCleanupPull * 0.28,
          rawCaptureLift,
        )
      mote.suctionLoad = damp(
        mote.suctionLoad,
        Math.min(1.85, suctionPressure + suctionDeformation.resistance * 0.18 + intakePreview.near * 0.12 + intakePreview.adhesion * 0.08 + organicPreview.magneticPull * 0.16 + latchSeal * 0.72 + grabReadiness * 0.24 + easySuction.pullBoost * 0.36 + easySuction.feedBoost * 0.18 + state.hoseHookStrength * 0.16 + (gripPileActive ? 0.18 : 0)),
        suctionPressure > mote.suctionLoad ? 5.2 : 2.6,
        cappedDt,
      )
      const yieldTarget = computeJellyWaxYield(mote.suctionLoad, mote.floorStick, mote.coagulate, mote.merge, latchSeal)
      mote.suctionYield = damp(mote.suctionYield, yieldTarget, yieldTarget > mote.suctionYield ? 7.0 : 3.6, cappedDt)
      mote.suctionStrain = damp(mote.suctionStrain, suctionDeformation.strain, suctionDeformation.strain > mote.suctionStrain ? 8.0 : 3.8, cappedDt)
      mote.tendril = damp(mote.tendril, suctionDeformation.tendril, suctionDeformation.tendril > mote.tendril ? 7.2 : 3.0, cappedDt)
	      const intakeContact = computeIntakeContact({
	        distance: contactDistance,
        ahead,
        influence: force.influence,
        suctionLoad: mote.suctionLoad,
        suctionYield: mote.suctionYield,
        latchSeal,
        slurp: mote.slurp,
        mass: mote.mass,
        visibleMass: mote.visibleMass,
        floorStick: mote.floorStick,
        speed: currentSpeed,
        tetherStrain: state.tetherStrain,
      })
	      const easyNear = hoseBlowActive ? 0 : Math.max(intakeContact.near, easySuction.brush * 0.62, pileSurfaceAssist.brush * 0.56)
	      const easyAdhesion = hoseBlowActive ? 0 : Math.max(intakeContact.adhesion, easySuction.autoLatch * 0.54, pileSurfaceAssist.sealBoost * 0.46)
	      const easyCompression = hoseBlowActive ? 0 : Math.max(intakeContact.compression, easySuction.autoLatch * 0.34, pileSurfaceAssist.lock * 0.42)
	      const easySealRing = hoseBlowActive ? 0 : Math.max(intakeContact.sealRing, easyCompression * 0.64, pileSurfaceAssist.sealBoost * 0.46)
	      const easyDimple = hoseBlowActive ? 0 : Math.max(intakeContact.dimple, easySuction.brush * 0.26, pileSurfaceAssist.brush * 0.24, easyCompression * 0.48)
	      const easyFunnel = hoseBlowActive ? 0 : Math.max(intakeContact.funnel, easySuction.pullBoost * 0.3, pileSurfaceAssist.pullBoost * 0.28, easyCompression * 0.18)
	      const easyNeck = hoseBlowActive ? 0 : Math.max(intakeContact.neck, easySuction.feedBoost * 0.24, pileSurfaceAssist.feedBoost * 0.3)
	      const easyFlow = hoseBlowActive ? 0 : Math.max(intakeContact.flow, easySuction.feedBoost * 0.34, pileSurfaceAssist.feedBoost * 0.38)
      mote.intakeNear = damp(mote.intakeNear, easyNear, easyNear > mote.intakeNear ? 10 : 4.5, cappedDt)
      mote.intakeAdhesion = damp(mote.intakeAdhesion, easyAdhesion, easyAdhesion > mote.intakeAdhesion ? 11 : 4.2, cappedDt)
      mote.intakeDimple = damp(mote.intakeDimple, easyDimple, easyDimple > mote.intakeDimple ? 10 : 4, cappedDt)
      mote.intakeFunnel = damp(mote.intakeFunnel, easyFunnel, easyFunnel > mote.intakeFunnel ? 9.2 : 3.8, cappedDt)
      mote.intakeNeck = damp(mote.intakeNeck, easyNeck, easyNeck > mote.intakeNeck ? 8.8 : 3.4, cappedDt)
      mote.intakeFlow = damp(mote.intakeFlow, easyFlow, easyFlow > mote.intakeFlow ? 8.6 : 3.0, cappedDt)
	      const organicGrip = computeOrganicSuctionGrip({
	        distance: contactDistance,
        ahead,
        influence: force.influence,
        adhesion: intakeContact.adhesion,
        dimple: intakeContact.dimple,
        funnel: intakeContact.funnel,
        neck: intakeContact.neck,
        flow: intakeContact.flow,
        latchSeal,
        slurp: mote.slurp,
        suctionYield: mote.suctionYield,
        visibleMass: mote.visibleMass,
        mass: mote.mass,
        floorStick: mote.floorStick,
        mouthSettle: state.controllerMouthSettle,
        controllerGrip: state.controllerGripQuality,
        intakeFeed: mote.intakeFeed,
        speed: currentSpeed,
      })
      const easyMagneticPull = hoseBlowActive ? 0 : Math.max(organicGrip.magneticPull, easySuction.pullBoost * 0.5, pileSurfaceAssist.pullBoost * 0.64)
      const easyRimGrip = hoseBlowActive ? 0 : Math.max(organicGrip.rimGrip, easySuction.autoLatch * 0.46, pileSurfaceAssist.sealBoost * 0.42)
      const easyOrganicHold = hoseBlowActive ? 0 : Math.max(organicGrip.stuckHold, easySuction.autoLatch * 0.38, pileSurfaceAssist.lock * 0.34)
      const easySlurpPressure = hoseBlowActive ? 0 : Math.max(organicGrip.slurpPressure, easySuction.feedBoost * 0.38, pileSurfaceAssist.feedBoost * 0.44)
      mote.mouthMagnetism = damp(mote.mouthMagnetism, easyMagneticPull, easyMagneticPull > mote.mouthMagnetism ? 9.4 : 3.8, cappedDt)
      mote.rimGrip = damp(mote.rimGrip, easyRimGrip, easyRimGrip > mote.rimGrip ? 9.0 : 3.4, cappedDt)
      mote.organicHold = damp(mote.organicHold, easyOrganicHold, easyOrganicHold > mote.organicHold ? 8.4 : 3.0, cappedDt)
      mote.slurpPressure = damp(mote.slurpPressure, easySlurpPressure, easySlurpPressure > mote.slurpPressure ? 8.8 : 3.2, cappedDt)
		      const contactSequence = computeMouthContactSequence({
		        distance: contactDistance,
	        ahead,
	        adhesion: intakeContact.adhesion,
        dimple: intakeContact.dimple,
        funnel: intakeContact.funnel,
        neck: intakeContact.neck,
        flow: intakeContact.flow,
        intakeFeed: mote.intakeFeed,
        slurpPressure: organicGrip.slurpPressure,
        organicHold: organicGrip.stuckHold,
        rimGrip: organicGrip.rimGrip,
        suctionYield: mote.suctionYield,
        latchSeal,
        slurp: mote.slurp,
        visibleMass: mote.visibleMass,
        mass: mote.mass,
	        floorStick: mote.floorStick,
	        speed: currentSpeed,
	      })
			      const contactFlow = computeSuctionContactFlow({
			        distance: contactDistance,
	        ahead,
	        influence: force.influence,
	        latchSeal,
	        candidateScore,
	        visibleMass: mote.visibleMass,
	        mass: mote.mass,
	        floorStick: mote.floorStick,
	        suctionYield: mote.suctionYield,
	        contactReadiness: contactSequence.readiness,
	        contactRope: mote.contactRope,
	        contactFeed: mote.contactFeed,
	        intakeFlow: mote.intakeFlow,
	        intakeFeed: mote.intakeFeed,
	        rimGrip: organicGrip.rimGrip,
	        organicHold: organicGrip.stuckHold,
	        slurpPressure: organicGrip.slurpPressure,
	        glugPulse: mote.glugPulse,
	        glugMassTransfer: state.glugMassFlow,
	        tetherStrain: state.tetherStrain,
	        swingTension: state.swingTension,
	        bodySpeed,
	      })
      const moteMouthDistance = mote.position.distanceTo(mouth)
      const visibleSlimeSurfaceRadius = mote.size
        * (1.15 + Math.min(1.25, mote.visibleMass) * 2.25 + Math.min(1.2, mote.mass) * 0.28)
        + PRODUCTION_TUNING.suction.visibleSlimeSurfacePickupPadding
      const visibleSlimeSurfaceDistance = Math.max(
        0.001,
        Math.min(contactDistance, moteMouthDistance - visibleSlimeSurfaceRadius),
      )
      const visibleSlimeLoosePiece = mote.visibleMass < 0.72 || mote.mass < 0.55
      const visibleSlimeBodyDistance = Math.hypot(mote.position.x - state.position.x, mote.position.z - state.position.z)
      const visibleSlimeContactPickup = visibleSlimeSurfaceDistance
        < PRODUCTION_TUNING.suction.visibleSlimeContactPickupRadius
        || (
          visibleSlimeLoosePiece
          && visibleSlimeBodyDistance < PRODUCTION_TUNING.suction.visibleSlimeBodyPickupRadius
        )
		      const looseFragmentIntake = computeLooseFragmentIntake({
		        distance: Math.min(moteMouthDistance, visibleSlimeSurfaceDistance + mote.size * 0.72),
		        ahead: Math.max(rawAhead, ahead * 0.52),
		        visibleMass: mote.visibleMass,
		        mass: mote.mass,
		        size: mote.size,
		        floorStick: mote.floorStick,
		        suctionYield: mote.suctionYield,
		        brush: Math.max(easySuction.brush, pileSurfaceAssist.brush, tactileBrush * 0.82, contactFlow.preContactVisual * 0.64),
		        contactReadiness: Math.max(contactSequence.readiness, contactFlow.preContactVisual, intakeContact.surfacePull * 0.72),
		        physicalContact: physicalContactGate,
		        latched: mote.latched > 0.5,
		      })
      const visibleSlimeVacuumability = computeVisibleSlimeVacuumability({
        distanceToMouth: moteMouthDistance,
        surfaceDistanceToMouth: visibleSlimeSurfaceDistance,
        visibleMass: mote.visibleMass,
        mass: mote.mass,
        size: mote.size,
        popProgress: visibleProgress,
        suctionActive: !hoseBlowActive && (
          suctionActiveForSlime
          || suctionIntentActive
          || physicalContactGate > 0.04
          || tactileBrush > 0.12
          || pileSurfaceAssist.brush > 0.08
          || visibleSlimeContactPickup
        ),
        latched: mote.latched > 0.5,
        levelCleared: mote.levelCleared > 0.5,
        stuckAge: mote.stuckResidueAge,
      })
      const residueAutoCleanupActive = visibleSlimeVacuumability.autoCleanup && !emergingTideMote
      if (visibleSlimeVacuumability.visible) {
        slimeVacuumableVisibleCount += 1
        slimeGameplayVisibleMass += visibleSlimeVacuumability.effectiveMass
        if (visibleSlimeVacuumability.residue || visibleSlimeVacuumability.fragment) slimeVacuumableTinyCount += 1
        if (visibleSlimeVacuumability.stranded) slimeVacuumableStrandedCount += 1
      }
				      const easyContactReadiness = Math.max(contactSequence.readiness, easySuction.brush * 0.5, pileSurfaceAssist.brush * 0.42, pileSurfaceAssist.lock * 0.34)
			      const easyContactCompression = Math.max(contactSequence.contactCompression, easyCompression, easySuction.autoLatch * 0.34, pileSurfaceAssist.lock * 0.54)
			      const easyContactSealRing = Math.max(contactSequence.sealRing, easySealRing, easyContactCompression * 0.64)
			      const easyContactLipSeal = Math.max(contactSequence.lipSeal, easySuction.autoLatch * 0.4, pileSurfaceAssist.sealBoost * 0.42, easyContactSealRing * 0.34)
			      const easyContactDent = Math.max(contactSequence.dent, easySuction.brush * 0.24, pileSurfaceAssist.brush * 0.22, easyContactCompression * 0.54)
			      const easyContactTongue = Math.max(contactSequence.tongue, easySuction.pullBoost * 0.22, pileSurfaceAssist.pullBoost * 0.2, contactFlow.preContactVisual * 0.2, intakeContact.surfacePull * 0.2)
			      const easyContactRope = Math.max(contactSequence.rope, easySuction.feedBoost * 0.22, pileSurfaceAssist.feedBoost * 0.2, contactFlow.bridgeIntent * 0.5)
			      const easyContactFeed = Math.max(contactSequence.feed, easySuction.feedBoost * 0.38, pileSurfaceAssist.feedBoost * 0.24, contactFlow.bridgeIntent * 0.3)
		      mote.contactReadiness = damp(mote.contactReadiness, easyContactReadiness, easyContactReadiness > mote.contactReadiness ? 10.4 : 4.4, cappedDt)
		      mote.contactLipSeal = damp(mote.contactLipSeal, easyContactLipSeal, easyContactLipSeal > mote.contactLipSeal ? 9.8 : 4.0, cappedDt)
		      mote.contactCompression = damp(mote.contactCompression, easyContactCompression, easyContactCompression > mote.contactCompression ? 12.2 : 4.4, cappedDt)
		      mote.contactSealRing = damp(mote.contactSealRing, easyContactSealRing, easyContactSealRing > mote.contactSealRing ? 12.8 : 4.8, cappedDt)
		      mote.contactDent = damp(mote.contactDent, easyContactDent, easyContactDent > mote.contactDent ? 9.6 : 4.0, cappedDt)
	      mote.contactTongue = damp(mote.contactTongue, easyContactTongue, easyContactTongue > mote.contactTongue ? 9.2 : 3.8, cappedDt)
	      mote.contactRope = damp(mote.contactRope, easyContactRope, easyContactRope > mote.contactRope ? 8.6 : 3.2, cappedDt)
	      mote.contactFeed = damp(mote.contactFeed, easyContactFeed, easyContactFeed > mote.contactFeed ? 9.4 : 3.4, cappedDt)
	      mote.contactSnap = damp(mote.contactSnap, contactSequence.snap, contactSequence.snap > mote.contactSnap ? 8.2 : 4.8, cappedDt)
	      mote.contactResistance = damp(mote.contactResistance, contactSequence.resistance, contactSequence.resistance > mote.contactResistance ? 8.8 : 4.2, cappedDt)
	      mote.flowBridge = damp(mote.flowBridge, contactFlow.bridgeIntent, contactFlow.bridgeIntent > mote.flowBridge ? 10.2 : 3.4, cappedDt)
	      mote.flowBridgeLength = damp(mote.flowBridgeLength, contactFlow.bridgeLength, contactFlow.bridgeLength > mote.flowBridgeLength ? 9.2 : 3.6, cappedDt)
	      mote.flowBridgeThickness = damp(mote.flowBridgeThickness, contactFlow.bridgeThickness, contactFlow.bridgeThickness > mote.flowBridgeThickness ? 10.4 : 4.0, cappedDt)
	      mote.sealQuality = damp(mote.sealQuality, contactFlow.sealQuality, contactFlow.sealQuality > mote.sealQuality ? 10.8 : 4.0, cappedDt)
	      mote.sealLeak = damp(mote.sealLeak, contactFlow.leak, contactFlow.leak > mote.sealLeak ? 8.8 : 4.8, cappedDt)
	      if (!hoseBlowActive && contactFlow.preContactVisual > 0.02 && visibleProgress > 0.04 && mote.latched < 0.5) {
	        slimeSurfaceVector.copy(mouth).sub(mote.position)
	        slimeSurfaceVector.y *= 0.34
	        if (slimeSurfaceVector.lengthSq() > 0.0001) {
	          slimeSurfaceVector.normalize()
		          const organicBulge = contactFlow.preContactVisual * livingTuning.suctionBulgeStrength
		          const organicBridge = Math.max(contactFlow.bridgeIntent, contactFlow.preContactVisual * 0.46) * livingTuning.bridgeOrganicness
		          const approachPressure = Math.max(contactFlow.preContactVisual, organicBulge * 0.72, organicBridge * 0.64)
		          mote.velocity.addScaledVector(slimeSurfaceVector, cappedDt * contactFlow.preContactPull * (1.12 + organicBulge * 0.22 + organicBridge * 0.1))
		          mote.edgeWobble = Math.max(mote.edgeWobble, contactFlow.preContactVisual * 0.42 + organicBulge * 0.28)
		          mote.tendril = Math.max(mote.tendril, contactFlow.preContactVisual * 0.38 + organicBridge * 0.24)
		          mote.contactDent = Math.max(mote.contactDent, intakeContact.surfacePull * 0.16 + organicBulge * 0.2)
		          mote.contactCompression = Math.max(mote.contactCompression, intakeContact.surfacePull * 0.22 + organicBulge * 0.14)
		          mote.contactTongue = Math.max(mote.contactTongue, organicBulge * 0.36 + organicBridge * 0.24)
		          mote.contactRope = Math.max(mote.contactRope, organicBridge * 0.28)
		          mote.intakeFunnel = Math.max(mote.intakeFunnel, approachPressure * 0.24)
		          mote.flowBridge = Math.max(mote.flowBridge, organicBridge * 0.56, contactFlow.bridgeIntent * 0.44)
		          mote.flowBridgeThickness = Math.max(
		            mote.flowBridgeThickness,
		            PRODUCTION_TUNING.suction.flowBridgeMinThickness + organicBulge * 0.105 + organicBridge * 0.075,
		          )
		          mote.livingFlow = Math.max(mote.livingFlow, organicBulge * 0.48)
		          mote.livingPulse = Math.max(mote.livingPulse, organicBulge * 0.38)
		          mote.materialWake = Math.max(mote.materialWake, organicBridge * 0.34)
		          mote.colorBloom = Math.max(mote.colorBloom, contactFlow.preContactVisual * 0.3 + organicBulge * 0.18)
	          slimeSlideTargetVector.copy(mote.position).addScaledVector(
	            slimeSurfaceVector,
	            mote.size * (0.74 + contactFlow.bridgeIntent * 0.72 + contactFlow.preContactVisual * 0.24),
	          )
          slimeSlideTargetVector.y = Math.max(SLIME_MOTE_FLOOR_Y + mote.size * 0.52, mote.position.y + mote.size * (0.12 + approachPressure * 0.08))
          mote.sealPoint.lerp(slimeSlideTargetVector, Math.min(0.34, cappedDt * (4.2 + contactFlow.bridgeIntent * 5.6 + contactFlow.preContactVisual * 2.8)))
          if (stickyAnchorActive) {
            mote.sealPoint.copy(state.anchorWorldPosition)
          }
        }
      }
		      if (!hoseBlowActive && easyMagneticPull > 0.035) {
        slimeSurfaceVector.copy(mouth).sub(mote.position)
        if (slimeSurfaceVector.lengthSq() > 0.0001) {
          slimeSurfaceVector.normalize()
          const magneticForce = easyMagneticPull * (0.5 + mote.suctionYield * 0.32 + easyRimGrip * 0.24 + easySuction.pullBoost * 0.3 + pileSurfaceAssist.pullBoost * 0.22)
          mote.velocity.addScaledVector(slimeSurfaceVector, cappedDt * magneticForce)
          mote.edgeWobble = Math.max(mote.edgeWobble, easyRimGrip * 0.2 + easySuction.brush * 0.08)
        }
      }
      const visibleSlimeMouthPopActive = !hoseBlowActive
        && visibleSlimeVacuumability.mouthPull > 0.01
        && mote.latched < 0.5
      if (!hoseBlowActive && (looseFragmentIntake.active || visibleSlimeMouthPopActive) && visibleProgress > 0.01 && mote.latched < 0.5) {
	        slimeSurfaceVector.copy(mouth).sub(mote.position)
	        slimeSurfaceVector.y *= 0.58
	        if (slimeSurfaceVector.lengthSq() > 0.0001) {
	          slimeSurfaceVector.normalize()
	          const inwardSpeed = mote.velocity.dot(slimeSurfaceVector)
          const fragmentFlow = Math.max(looseFragmentIntake.flow, visibleSlimeVacuumability.feed)
          const fragmentFeed = Math.max(looseFragmentIntake.feed, visibleSlimeVacuumability.feed)
          const fragmentPull = Math.max(looseFragmentIntake.pull, visibleSlimeVacuumability.mouthPull)
          const fragmentMassDrain = Math.max(looseFragmentIntake.massDrain, visibleSlimeVacuumability.massDrain)
          const fragmentBridge = Math.max(looseFragmentIntake.bridge, visibleSlimeVacuumability.feed * 0.28)
          const fragmentSwallowProximity = Math.max(looseFragmentIntake.swallowProximity, visibleSlimeVacuumability.feed)
	          const maxFlowSpeed = PRODUCTION_TUNING.suction.looseFragmentMaxFlowSpeed
	            * (0.42 + fragmentFlow * 0.7 + fragmentSwallowProximity * 0.24)
	          const catchUp = Math.max(0, maxFlowSpeed - inwardSpeed)
	          mote.velocity.addScaledVector(
	            slimeSurfaceVector,
	            cappedDt * (fragmentPull + catchUp * 4.2),
	          )
	          candidateBodyVector.copy(mote.velocity).addScaledVector(slimeSurfaceVector, -inwardSpeed)
	          mote.velocity.addScaledVector(
	            candidateBodyVector,
	            -Math.min(0.84, looseFragmentIntake.hoverDamping * cappedDt),
	          )
	          mote.intakeFlow = Math.max(mote.intakeFlow, fragmentFlow * 0.52)
	          mote.intakeFeed = Math.max(mote.intakeFeed, fragmentFeed * 0.48)
	          mote.contactFeed = Math.max(mote.contactFeed, fragmentFeed * 0.34)
	          mote.flowBridge = Math.max(mote.flowBridge, fragmentBridge)
	          mote.flowBridgeLength = Math.max(mote.flowBridgeLength, mote.position.distanceTo(mouth))
	          mote.flowBridgeThickness = Math.max(
	            mote.flowBridgeThickness,
	            PRODUCTION_TUNING.suction.flowBridgeMinThickness + fragmentFeed * 0.065,
	          )
	          mote.slurp = Math.max(mote.slurp, fragmentFeed * 0.22)
	          mote.absorbTarget = Math.max(mote.absorbTarget, fragmentMassDrain * 0.2)
	          mote.edgeWobble = Math.max(mote.edgeWobble, fragmentFlow * 0.16)
	          mote.colorBloom = Math.max(mote.colorBloom, fragmentFeed * 0.2)
	        }
	      }
      const captureLift = hoseBlowActive ? 0 : Math.max(freeCapture * (0.2 + mote.suctionYield * 0.8 + easySuction.pullBoost * 0.24), latchSeal * 0.92, easySuction.autoLatch * 0.32)
	      const coneGate = hoseBlowActive
        ? 0
        : Math.max(
	        Math.max(0.08, ahead) * Math.max(0, 1 - contactDistance / 4.35) * (0.32 + mote.suctionYield * 0.68),
          latchSeal * 0.86,
          easySuction.pullBoost * 0.46,
          pileSurfaceAssist.pullBoost * 0.42,
          finalCleanupPull * 0.74,
        )
      const pileDx = pile.center.x - mote.position.x
      const pileDz = pile.center.z - mote.position.z
      const pileDistance = Math.max(0.001, Math.hypot(pileDx, pileDz))
      const pileReach = 2.12 + mote.size * 4.8
      const pilePull = smooth01((pileReach - pileDistance) / pileReach) * (1 - captureLift) * (1 - latchSeal * 0.94) * visibleProgress
      const crawlPulse = 0.48
        + Math.sin(t * (0.58 + mote.warmth * 0.22) + mote.seed) * 0.14
        + Math.sin(t * 1.08 + mote.seed * 0.41) * 0.045
      const pileNx = pileDx / pileDistance
      const pileNz = pileDz / pileDistance
      const livingContactCalm = 1 - Math.min(
        0.88,
        captureLift * livingTuning.contactCalm
          + latchSeal * 0.74
          + mote.suctionYield * 0.28
          + mote.intakeFlow * 0.22
          + mote.contactFeed * 0.18,
      )
      const livingGate = visibleProgress * Math.max(0.18, livingContactCalm) * Math.max(0.22, mote.floorStick)
      const referenceRelocationSignal = pile.referenceRelocation * livingGate
      const referenceMergeSignal = pile.referenceMerge * livingGate
      const referenceSplitSignal = pile.referenceSplit * livingGate
      const livingSuctionRipple = visibleProgress * clampValue(
        contactFlow.preContactVisual * livingTuning.suctionRippleStrength
          + contactFlow.bridgeIntent * livingTuning.bridgeOrganicness * 0.16
          + easyMagneticPull * 0.14
          + mote.glugPulse * 0.16
          + mote.intakeRecoil * livingTuning.recoilSettleStrength * 0.1,
        0,
        1.35,
      )
      const livingPulseTarget = Math.max(
        (
        0.45
          + Math.sin(t * livingTuning.pulseSpeed + mote.seed * 1.71) * 0.28
          + Math.sin(t * livingTuning.pulseSpeed * 1.93 + mote.seed * 0.41) * 0.16
        ) * livingGate,
        referenceRelocationSignal * 0.56,
        referenceMergeSignal * 0.32,
        livingSuctionRipple * 0.46,
      )
      const livingCongealTarget = Math.max(
        smooth01(
          0.5
            + Math.sin(t * livingTuning.congealCycleSpeed + pile.seed * 0.72 + mote.seed * 0.13) * 0.42
            + Math.sin(t * livingTuning.congealCycleSpeed * 2.1 + mote.seed * 0.34) * 0.18,
        ) * livingGate,
        referenceMergeSignal * (0.74 + livingTuning.mergeWindowStrength * 0.28),
        livingSuctionRipple * 0.24,
      )
      const livingBreakTarget = Math.max(
        smooth01(
          0.46
            + Math.sin(t * livingTuning.breakApartCycleSpeed + mote.seed * 0.93) * 0.48
            - livingCongealTarget * 0.3,
        ) * livingGate,
        referenceSplitSignal * (0.72 + livingTuning.splitWindowStrength * 0.24),
        mote.flowBridgeBreak * livingTuning.bridgeRecoilStrength * 0.18,
      )
      const livingFlowTarget = Math.max(
        smooth01(
          0.5
            + Math.sin(t * livingTuning.flowCycleSpeed + mote.seed * 1.37) * 0.36
            + Math.cos(t * livingTuning.flowCycleSpeed * 1.67 + pile.seed) * 0.2,
        ) * livingGate,
        referenceRelocationSignal,
        livingSuctionRipple * 0.62,
      )
      mote.livingPulse = damp(mote.livingPulse, livingPulseTarget, livingPulseTarget > mote.livingPulse ? 1.35 : 0.82, cappedDt)
      mote.livingCreep = damp(mote.livingCreep, livingFlowTarget, livingFlowTarget > mote.livingCreep ? 1.18 : 0.72, cappedDt)
      mote.livingCongeal = damp(mote.livingCongeal, livingCongealTarget, livingCongealTarget > mote.livingCongeal ? 1.08 : 0.68, cappedDt)
      mote.livingBreak = damp(mote.livingBreak, livingBreakTarget, livingBreakTarget > mote.livingBreak ? 0.82 : 0.58, cappedDt)
      mote.livingFlow = damp(mote.livingFlow, livingFlowTarget, livingFlowTarget > mote.livingFlow ? 1.14 : 0.7, cappedDt)
      const radialOutX = -pileNx
      const radialOutZ = -pileNz
      const tangentSign = seededNoise(mote.seed + 86.2) > 0.5 ? 1 : -1
      const tangentX = -pileNz * tangentSign
      const tangentZ = pileNx * tangentSign
      const livingCreepForce = livingTuning.creepStrength * mote.livingCreep * (0.25 + mote.floorStick * 0.45)
      const livingCongealForce = livingTuning.congealStrength * mote.livingCongeal * (0.34 + pilePull * 0.5)
      const livingBreakForce = livingTuning.breakApartStrength * mote.livingBreak * (0.24 + (1 - pilePull) * 0.24)
      const livingPulseForce = livingTuning.idleMotionStrength * mote.livingPulse * 0.12
      const livingEdgeCreepForce = livingTuning.edgeCreepStrength
        * (mote.livingFlow * 0.54 + mote.livingBreak * 0.28 + livingSuctionRipple * 0.18)
        * (0.2 + mote.floorStick * 0.32)
      mote.velocity.x += (pileNx * livingCongealForce + radialOutX * livingBreakForce + tangentX * livingCreepForce) * cappedDt
      mote.velocity.z += (pileNz * livingCongealForce + radialOutZ * livingBreakForce + tangentZ * livingCreepForce) * cappedDt
      mote.velocity.x += (radialOutX * livingEdgeCreepForce * 0.34 + tangentX * livingEdgeCreepForce * 0.66) * cappedDt
      mote.velocity.z += (radialOutZ * livingEdgeCreepForce * 0.34 + tangentZ * livingEdgeCreepForce * 0.66) * cappedDt
      mote.velocity.x += Math.sin(t * 1.6 + mote.seed * 2.17) * livingPulseForce * cappedDt
      mote.velocity.z += Math.cos(t * 1.45 + mote.seed * 1.73) * livingPulseForce * cappedDt
      if (mote.latched < 0.5 && mote.levelCleared < 0.5) {
        const homePhase = mote.seed * 2.39 + t * (livingTuning.relocationCycleSpeed * 2.1 + mote.swirl * 0.018)
        const homeSpread = (0.18 + mote.size * 4.4)
          * (1 + referenceSplitSignal * 0.48 - referenceMergeSignal * 0.42 + referenceRelocationSignal * 0.08)
        const targetHomeX = pile.center.x
          + Math.cos(homePhase + Math.sin(t * 0.18 + mote.seed) * 0.34) * homeSpread
          + tangentX * referenceRelocationSignal * 0.1
        const targetHomeZ = pile.center.z
          + Math.sin(homePhase * 0.93 + Math.cos(t * 0.16 + mote.seed * 0.7) * 0.32) * homeSpread
          + tangentZ * referenceRelocationSignal * 0.1
        const homeFollow = Math.min(
          0.07,
          cappedDt
            * livingTuning.homeFollowStrength
            * livingContactCalm
            * (0.28 + referenceRelocationSignal * 0.18 + referenceMergeSignal * 0.28 + referenceSplitSignal * 0.12),
        )
        mote.home.x += (targetHomeX - mote.home.x) * homeFollow
        mote.home.z += (targetHomeZ - mote.home.z) * homeFollow
        const homeDistance = Math.hypot(mote.home.x, mote.home.z)
        if (homeDistance > ARENA_PLAYABLE_RADIUS && homeDistance > 0.0001) {
          const homeScale = ARENA_PLAYABLE_RADIUS / homeDistance
          mote.home.x *= homeScale
          mote.home.z *= homeScale
        }
        mote.home.y = SLIME_MOTE_FLOOR_Y + mote.size * 0.42
        const migrationPull = livingTuning.referencePathStrength
          * (0.16 + referenceRelocationSignal * 0.16 + referenceMergeSignal * 0.2 + referenceSplitSignal * 0.08)
          * visibleProgress
        mote.velocity.x += (mote.home.x - mote.position.x) * migrationPull * cappedDt
        mote.velocity.z += (mote.home.z - mote.position.z) * migrationPull * cappedDt
        mote.reemergeCharge = Math.max(
          mote.reemergeCharge,
          (referenceSplitSignal * 0.18 + referenceRelocationSignal * 0.08 + referenceMergeSignal * 0.08)
            * livingTuning.sproutPopStrength,
        )
        mote.colorBloom = Math.max(mote.colorBloom, (referenceMergeSignal + referenceSplitSignal) * 0.1)
        mote.materialWake = Math.max(mote.materialWake, referenceRelocationSignal * 0.1)
      }
      const anchorTargetRadius = Math.min(
        livingTuning.maxAnchorDrift,
        livingTuning.anchorCreepRadius * (0.36 + mote.livingCreep * 0.44 + mote.livingBreak * 0.22),
      )
      pileVector.set(
        mote.home.x
          + Math.sin(t * livingTuning.flowCycleSpeed + mote.seed) * anchorTargetRadius
          + radialOutX * mote.livingBreak * livingTuning.anchorCreepRadius * 0.14
          - radialOutX * mote.livingCongeal * livingTuning.anchorCreepRadius * 0.14,
        mote.anchor.y,
        mote.home.z
          + Math.cos(t * livingTuning.flowCycleSpeed * 0.87 + mote.seed * 1.31) * anchorTargetRadius
          + radialOutZ * mote.livingBreak * livingTuning.anchorCreepRadius * 0.14
          - radialOutZ * mote.livingCongeal * livingTuning.anchorCreepRadius * 0.14,
      )
      clampWorld(pileVector)
      const anchorCrawl = cappedDt * livingTuning.anchorCrawlRate * livingGate * (0.36 + mote.floorStick * 0.42)
      mote.anchor.x += (pileVector.x - mote.anchor.x) * anchorCrawl
      mote.anchor.z += (pileVector.z - mote.anchor.z) * anchorCrawl
      mote.mergeTarget = Math.max(mote.mergeTarget, mote.livingCongeal * 0.24)
      mote.surfaceTension = Math.max(mote.surfaceTension, mote.livingCongeal * 0.18)
      mote.poolPressure = Math.max(mote.poolPressure, mote.livingPulse * livingTuning.materialIdleBreathStrength * 0.18)
      mote.tendril = Math.max(mote.tendril, mote.livingBreak * 0.11)
      mote.edgeWobble = Math.max(mote.edgeWobble, mote.livingPulse * 0.08 + mote.livingBreak * 0.08 + mote.livingCreep * livingTuning.edgeCreepStrength * 0.12)
      mote.materialWake = Math.max(mote.materialWake, mote.livingFlow * livingTuning.internalFlowStrength * 0.32)
      pile.livingPulse = Math.max(pile.livingPulse, mote.livingPulse)
      pile.livingCreep = Math.max(pile.livingCreep, mote.livingCreep)
      pile.livingCongeal = Math.max(pile.livingCongeal, mote.livingCongeal)
      pile.livingBreak = Math.max(pile.livingBreak, mote.livingBreak)
      mote.velocity.x += pileNx * pilePull * crawlPulse * (0.34 + mote.floorStick * 0.34) * cappedDt
      mote.velocity.z += pileNz * pilePull * crawlPulse * (0.34 + mote.floorStick * 0.34) * cappedDt
      mote.velocity.x += Math.sin(t * 0.82 + mote.seed * 1.7) * pilePull * 0.006 * cappedDt
      mote.velocity.z += Math.cos(t * 0.76 + mote.seed * 1.3) * pilePull * 0.005 * cappedDt
      const pull = coneGate * state.pulse * cappedDt
      const yieldPull = 0.62 + mote.suctionYield * 0.68
      mote.velocity.x += force.total.x * pull * yieldPull * (0.86 + latchSeal * 0.5)
      mote.velocity.z += force.total.z * pull * yieldPull * (0.86 + latchSeal * 0.5)
      mote.velocity.y += force.total.y * pull * (0.08 + captureLift * 1.16 + latchSeal * 0.42 + mote.suctionYield * 0.22)
      mote.velocity.x += Math.sin(t * 1.7 + mote.seed) * 0.016 * cappedDt * (1 - captureLift) * (1 - mote.suctionYield * 0.7)
      mote.velocity.z += Math.cos(t * 1.4 + mote.seed * 1.3) * 0.014 * cappedDt * (1 - captureLift) * (1 - mote.suctionYield * 0.7)

      let intakeSwallowReady = false
      if (mote.latched > 0.5) {
        mote.latchAge += cappedDt
	        const slurpReadiness = Math.max(
	          computeSlurpReadiness(contactDistance, latchSeal, mote.suctionYield, state.swingTension),
          easySuction.feedBoost * 0.48 + easySuction.autoLatch * 0.18,
        )
        slimeSurfaceVector.copy(mouth).sub(mote.position)
        slimeSurfaceVector.y *= 0.24
        if (slimeSurfaceVector.lengthSq() > 0.0001) slimeSurfaceVector.normalize()
        slimeSlideTargetVector.copy(mote.position).addScaledVector(
          slimeSurfaceVector,
          mote.size * (0.78 + slurpReadiness * 1.36 + mote.organicHold * 0.28 + mote.rimGrip * 0.16) + mote.stretchMemory * 0.08,
        )
        slimeSlideTangentVector.set(slimeSurfaceVector.z, 0, -slimeSurfaceVector.x)
        if (slimeSlideTangentVector.lengthSq() > 0.0001) {
          slimeSlideTangentVector.normalize()
          const slideSpeed = clampValue(state.velocity.dot(slimeSlideTangentVector) * 0.18, -0.28, 0.28)
          slimeSlideTargetVector.addScaledVector(
            slimeSlideTangentVector,
            slideSpeed * (0.42 + latchSeal * 0.34 + state.controllerGripQuality * 0.14 + state.controllerSwingFlow * 0.3 + state.controllerReattachGrace * 0.16) * (1 - slurpReadiness * 0.32) * (1 - mote.organicHold * 0.18),
          )
        }
        slimeSlideTargetVector.y = Math.max(SLIME_MOTE_FLOOR_Y + mote.size * 0.54, mote.position.y + mote.size * (0.12 + slurpReadiness * 0.24 + mote.rimGrip * 0.05))
        if (manualGrip) {
          slimeSlideTargetVector.copy(state.gripLockPoint)
          slimeSlideTargetVector.y = Math.max(SLIME_MOTE_FLOOR_Y + mote.size * 0.58, state.gripLockPoint.y)
        }
        if (stickyAnchorActive) {
          slimeSlideTargetVector.copy(state.anchorWorldPosition)
        }
	        const anchorSlideRate = (1 - PRODUCTION_TUNING.hose.anchorSlideFriction)
	          * (1.35 + state.swingTension * 0.5 + state.controllerSwingFlow * 0.62 + mote.rimGrip * 0.72 + mote.sealLeak * 0.72)
	          * (1 - slurpReadiness * 0.28 + Math.min(0.24, mote.sealLeak * PRODUCTION_TUNING.suction.weakSealSlipRate))
	          * (1 - smooth01(mote.deepEmbedDepth / Math.max(0.001, PRODUCTION_TUNING.embed.embedDepthMax)) * (0.5 + mote.deepEmbedLockStrength * 0.22))
            * (1 - (state.pivotLocked ? 0.34 : 0) - smooth01(state.pivotLockDuration / Math.max(0.001, PRODUCTION_TUNING.pivot.pivotLockMinDuration)) * 0.12)
	        if (stickyAnchorActive) {
	          mote.sealPoint.copy(state.anchorWorldPosition)
	          const anchorStrain = state.anchorTension
	          const anchorDepthN = smooth01(mote.deepEmbedDepth / Math.max(0.001, PRODUCTION_TUNING.embed.embedDepthMax))
	          const anchorCup = clampValue(
	            0.72
	              + anchorStrain * 0.58
	              + state.anchorSealSnapPulse * 0.34
	              + anchorDepthN * 0.42,
	            0.72,
	            1.65,
	          )
	          mote.contactDent = Math.max(mote.contactDent, anchorCup * PRODUCTION_TUNING.suction.elasticSlimeDent * 0.96)
	          mote.contactCompression = Math.max(mote.contactCompression, 0.58 + anchorCup * 0.22 + anchorStrain * 0.2)
	          mote.contactSealRing = Math.max(mote.contactSealRing, 0.68 + anchorCup * 0.18 + anchorStrain * 0.18)
	          mote.intakeDimple = Math.max(mote.intakeDimple, anchorCup * 0.34)
	          mote.contactLipSeal = Math.max(mote.contactLipSeal, 0.58 + anchorCup * 0.18 + anchorStrain * 0.16)
	          mote.rimGrip = Math.max(mote.rimGrip, 0.46 + anchorCup * 0.22 + anchorStrain * 0.14)
	          mote.organicHold = Math.max(mote.organicHold, 0.38 + anchorCup * 0.16 + anchorStrain * 0.1)
	          mote.deepEmbedDimple = Math.max(mote.deepEmbedDimple, anchorCup * 0.52)
	          mote.deepEmbedRimOcclusion = Math.max(mote.deepEmbedRimOcclusion, anchorCup * 0.48)
	          mote.deepEmbedPocketPulse = Math.max(mote.deepEmbedPocketPulse, anchorCup * 0.34 + state.anchorSealSnapPulse * 0.18)
          mote.flowBridge = Math.max(mote.flowBridge, 0.72 + anchorStrain * 0.2 + state.anchorReleasePreviewStrength * 0.12)
          mote.flowBridgeThickness = Math.max(mote.flowBridgeThickness, 0.32 + anchorCup * 0.18 + anchorStrain * 0.28)
          mote.flowBridgeLength = Math.max(mote.flowBridgeLength, state.anchorCurrentDistance * (0.4 + anchorStrain * 0.28 + anchorDepthN * 0.08))
          mote.flowBridgeStrain = Math.max(mote.flowBridgeStrain, anchorStrain * 0.86 + state.anchorReleasePreviewStrength * 0.42)
          mote.strandTension = Math.max(mote.strandTension, anchorStrain * 0.72)
          mote.tendril = Math.max(mote.tendril, anchorStrain * 0.18 + state.anchorElasticBounce * 0.1)
          mote.edgeWobble = Math.max(mote.edgeWobble, anchorStrain * 0.28 + state.anchorElasticBounce * 0.16)
          mote.slurpPressure = Math.max(mote.slurpPressure, 0.42 + anchorCup * 0.18 + anchorStrain * 0.28)
          mote.intakeFlow = Math.max(mote.intakeFlow, 0.28 + anchorStrain * 0.18)
          mote.contactFeed = Math.min(
            1.3,
            mote.contactFeed + cappedDt * (0.14 + anchorStrain * 0.2 + state.anchorReleasePreviewStrength * 0.12),
          )
        } else {
          mote.sealPoint.lerp(slimeSlideTargetVector, manualGrip ? Math.min(0.82, cappedDt * 18) : Math.min(PRODUCTION_TUNING.hose.maxAnchorSlide, cappedDt * anchorSlideRate))
        }
        const slurpResistance = (Math.max(0, 1 - mote.suctionYield) * 0.35 + Math.max(0, 1 - mote.slurp) * mote.floorStick * 0.12)
          * (1 - easySuction.aimEase * 0.22)
        const sealStretchDistance = mote.sealPoint.distanceTo(mouth)
        const snapBond = computeElasticSnapBond({
          latchAge: mote.latchAge,
          latchSeal,
          grip: grabReadiness + easySuction.autoLatch * 0.28 + candidateBoost * 0.16 + mote.intakeAdhesion * 0.42 + mote.contactLipSeal * 0.22 + (manualGrip ? PRODUCTION_TUNING.grip.gripLockStrength * 0.42 : 0),
          organicHold: mote.organicHold,
          rimGrip: mote.rimGrip,
          contactRope: mote.contactRope,
          contactFeed: mote.contactFeed,
          contactSnap: mote.contactSnap,
          stretchDistance: sealStretchDistance,
          tetherStrain: state.tetherStrain,
          swingTension: state.swingTension,
          bodySpeed: state.velocity.length(),
          slurp: mote.slurp,
          intakeFeed: mote.intakeFeed,
          suctionYield: mote.suctionYield,
          visibleMass: mote.visibleMass,
          mass: mote.mass,
          floorStick: mote.floorStick,
          releaseMomentum: state.controllerReleaseMomentum,
          cooldown: mote.snapBondCooldown,
        })
        mote.snapBondGrip = damp(mote.snapBondGrip, snapBond.grip, snapBond.grip > mote.snapBondGrip ? 9.0 : 4.2, cappedDt)
        mote.snapBondTension = damp(mote.snapBondTension, snapBond.tension, snapBond.tension > mote.snapBondTension ? 9.0 : 4.0, cappedDt)
        mote.snapBondStrain = damp(mote.snapBondStrain, snapBond.strain, snapBond.strain > mote.snapBondStrain ? 8.6 : 4.0, cappedDt)
        mote.snapBondUnstable = damp(mote.snapBondUnstable, snapBond.unstable, snapBond.unstable > mote.snapBondUnstable ? 8.4 : 4.6, cappedDt)
        mote.snapBondBreak = damp(mote.snapBondBreak, snapBond.breakReady, snapBond.breakReady > mote.snapBondBreak ? 9.4 : 5.2, cappedDt)
        mote.snapBondSnap = damp(mote.snapBondSnap, snapBond.snap, snapBond.snap > mote.snapBondSnap ? 11.5 : 6.6, cappedDt)
        mote.snapBondRecoil = Math.max(mote.snapBondRecoil, snapBond.recoil)
        const glug = computeRhythmicGlugPulse({
          time: t,
          seed: mote.seed,
          latchAge: mote.latchAge,
          readiness: slurpReadiness,
          feed: Math.max(mote.contactFeed, mote.intakeFeed * 0.74, mote.intakeFlow * 0.58, easySuction.feedBoost * 0.38),
          pressure: Math.max(mote.slurpPressure, mote.intakeFlow * 0.5, mote.intakeNeck * 0.34, easySuction.pullBoost * 0.28),
          neck: Math.max(mote.intakeNeck, mote.contactRope),
          visibleMass: mote.visibleMass,
          mass: mote.mass,
          floorStick: mote.floorStick,
          suctionYield: mote.suctionYield,
          contactResistance: mote.contactResistance,
        })
        mote.glugPhase = glug.phase
        mote.glugPulse = damp(mote.glugPulse, glug.pulse, glug.pulse > mote.glugPulse ? 13.5 : 5.6, cappedDt)
        const slurpPulseGate = Math.max(0.18, 0.66 + glug.suctionBoost * GLUG_RHYTHM.suctionBoost - snapBond.slurpBrake * SNAP_BOND_PHYSICS.slurpBrake)
        mote.slurp = Math.min(
          1.08,
          mote.slurp + cappedDt
            * (0.3 + state.pulse * 0.24 + latchSeal * 0.26 + Math.min(1, mote.latchAge) * 0.18)
            * (0.16 + slurpReadiness * 0.74 + state.suctionReadiness * 0.22 + mote.suctionYield * 0.18 + mote.intakeFlow * 0.16 + mote.slurpPressure * 0.22 + mote.organicHold * 0.12 + mote.contactRope * 0.2 + mote.contactFeed * 0.22 + easySuction.feedBoost * 0.2 - mote.contactResistance * 0.08)
            * slurpPulseGate,
        )
	        const massTransfer = computeIntakeMassTransfer({
	          adhesion: mote.intakeAdhesion + mote.rimGrip * 0.18 + mote.contactLipSeal * 0.12,
	          neck: mote.intakeNeck + mote.contactRope * 0.18 + easySuction.feedBoost * 0.1,
          flow: mote.intakeFlow + mote.slurpPressure * 0.2 + mote.contactFeed * 0.14 + easySuction.feedBoost * 0.18,
          slurp: mote.slurp,
          suctionYield: mote.suctionYield,
          latchSeal,
          visibleMass: mote.visibleMass,
          mass: mote.mass,
	          floorStick: mote.floorStick,
	          size: mote.size,
	        })
		        const activeContactFlow = computeSuctionContactFlow({
		          distance: contactDistance,
	          ahead,
	          influence: force.influence,
	          latchSeal,
	          candidateScore,
	          visibleMass: mote.visibleMass,
	          mass: mote.mass,
	          floorStick: mote.floorStick,
	          suctionYield: mote.suctionYield,
	          contactReadiness: mote.contactReadiness,
	          contactRope: mote.contactRope,
	          contactFeed: mote.contactFeed,
	          intakeFlow: mote.intakeFlow,
	          intakeFeed: mote.intakeFeed,
	          rimGrip: mote.rimGrip,
	          organicHold: mote.organicHold,
	          slurpPressure: mote.slurpPressure,
	          glugPulse: glug.pulse,
	          glugMassTransfer: glug.massTransfer * Math.max(0.18, massTransfer.feedRate),
	          tetherStrain: state.tetherStrain,
	          swingTension: state.swingTension,
	          bodySpeed,
        })
        const gripMassMultiplier = manualGrip ? state.gripMassMultiplier : 1
        const gripGlugMultiplier = manualGrip ? state.gripGlugBoost : 1
        const passiveIntakeMultiplier = 0.44 + state.controllerReattachGrace * 0.08
        const gripIntakeMultiplier = manualGrip ? 1.08 + (gripMassMultiplier - 1) * 0.65 : passiveIntakeMultiplier
        const gripVisualFeedMultiplier = manualGrip ? 1.05 + (gripGlugMultiplier - 1) * 0.72 : 0.86
        const stickyStrainFeedMultiplier = stickyAnchorActive
          ? 1.18 + state.anchorTension * 0.72 + state.anchorReleasePreviewStrength * 0.28 + state.anchorElasticBounce * 0.12
          : 1
	        const previousEmbedDepth = mote.deepEmbedDepth
	        const eventMassFlow = glug.massTransfer
            * Math.max(0.18, massTransfer.feedRate)
            * (manualGrip ? 0.92 + (gripMassMultiplier - 1) * 0.22 : 0.42 * stickyStrainFeedMultiplier)
	        const embedContactDistance = stickyAnchorActive
	          ? Math.min(contactDistance, PRODUCTION_TUNING.suction.physicalContactDistance * 0.22)
	          : contactDistance
	        const embedAhead = stickyAnchorActive ? Math.max(ahead, 0.82) : ahead
	        const embedLatchSeal = stickyAnchorActive ? Math.max(latchSeal, 0.74) : latchSeal
	        const embedSealQuality = Math.max(
	          activeContactFlow.sealQuality,
	          stickyAnchorActive ? state.slimeSealStrength + 0.28 : 0,
	          manualGrip ? PRODUCTION_TUNING.grip.gripSealStrength : 0,
	        )
	        const embedBridgeIntent = stickyAnchorActive
	          ? Math.max(activeContactFlow.bridgeIntent, 0.86)
	          : activeContactFlow.bridgeIntent
		        const embed = computeDeepSuctionEmbed({
	          dt: cappedDt,
	          currentDepth: mote.deepEmbedDepth,
	          age: mote.deepEmbedAge,
	          latchAge: mote.latchAge,
	          detached: mote.latched < 0.5 || embedLatchSeal < 0.08,
		          distance: embedContactDistance,
	          ahead: embedAhead,
	          sealQuality: embedSealQuality,
	          latchSeal: embedLatchSeal,
	          visibleMass: mote.visibleMass,
	          mass: mote.mass,
	          bodySpeed,
	          tetherStrain: state.tetherStrain,
	          swingTension: state.swingTension,
	          bridgeIntent: embedBridgeIntent,
	          bridgeThickness: activeContactFlow.bridgeThickness,
	          glugStrength: Math.max(glug.pulse, mote.glugEventStrength, mote.glugPulse) * gripVisualFeedMultiplier,
	          glugMassFlow: eventMassFlow,
	        })
	        mote.deepEmbedState = embed.state
	        mote.deepEmbedDepth = embed.embedDepth
	        mote.deepEmbedAge = embed.embedAge
	        mote.deepEmbedLockStrength = Math.max(mote.deepEmbedLockStrength, embed.lockStrength)
	        mote.deepEmbedSnapThreshold = embed.snapThreshold
	        mote.deepEmbedAnglePenalty = Math.max(mote.deepEmbedAnglePenalty, embed.anglePenalty)
	        mote.deepEmbedTensionPenalty = Math.max(mote.deepEmbedTensionPenalty, embed.tensionPenalty)
	        mote.deepEmbedReleaseReason = embed.releaseReason
		        mote.deepEmbedPocketPulse = Math.max(mote.deepEmbedPocketPulse, embed.pocketPulse)
		        mote.deepEmbedDimple = Math.max(mote.deepEmbedDimple, embed.pocketDimple)
		        mote.deepEmbedRimOcclusion = Math.max(mote.deepEmbedRimOcclusion, embed.rimOcclusion)
		        mote.deepEmbedHoseWobble = Math.max(mote.deepEmbedHoseWobble, embed.hoseWobble)
	        if (previousEmbedDepth < 0.1 && embed.embedDepth > 0.18) {
	          mote.deepEmbedFleckBurst = Math.max(mote.deepEmbedFleckBurst, 0.22 + embed.embedDepthNormalized * 0.22)
	        }
			        mote.contactDent = Math.max(mote.contactDent, embed.pocketDimple * 0.48)
			        mote.contactCompression = Math.max(mote.contactCompression, embed.pocketDimple * 0.44 + embed.rimOcclusion * 0.22)
			        mote.contactSealRing = Math.max(mote.contactSealRing, embed.rimOcclusion * 0.5 + embed.lockStrength * 0.16)
			        mote.intakeDimple = Math.max(mote.intakeDimple, embed.pocketDimple * 0.42)
		        mote.intakeFunnel = Math.max(mote.intakeFunnel, embed.embedDepthNormalized * 0.4)
		        mote.contactRope = Math.max(mote.contactRope, embed.embedDepthNormalized * 0.26)
		        mote.rimGrip = Math.max(mote.rimGrip, embed.lockStrength * 0.22 + embed.rimOcclusion * 0.08)
		        mote.organicHold = Math.max(mote.organicHold, embed.lockStrength * 0.18 + embed.rimOcclusion * 0.06)
          if (state.pivotLocked && state.sealTargetMoteId === i) {
            const pivotHold = Math.min(1.25, state.pivotTension * 0.34 + state.pivotHoseStretchRatio * 0.24 + state.pivotSnapReadiness * 0.18)
            mote.contactDent = Math.max(mote.contactDent, pivotHold * PRODUCTION_TUNING.pivot.slimePocketDimpleStrength * 0.34)
            mote.deepEmbedDimple = Math.max(mote.deepEmbedDimple, pivotHold * PRODUCTION_TUNING.pivot.slimePocketDimpleStrength * 0.22)
            mote.rimGrip = Math.max(mote.rimGrip, pivotHold * PRODUCTION_TUNING.pivot.slimePocketHoldVisualStrength * 0.16)
            mote.organicHold = Math.max(mote.organicHold, pivotHold * 0.1)
            mote.flowBridgeStrain = Math.max(mote.flowBridgeStrain, pivotHold * 0.36)
            mote.edgeWobble = Math.max(mote.edgeWobble, pivotHold * 0.28)
          }
          if (manualGrip) {
            const gripHold = Math.min(
              1.55,
              0.38
                + state.gripReleaseReady * 0.22
                + state.gripPhysicalCue * 0.28
                + state.gripPocketBiteCue * 0.34
                + state.gripDizzy * 0.28
                + state.gripMissCount * 0.08,
            )
            mote.contactDent = Math.max(mote.contactDent, gripHold * 0.42)
            mote.deepEmbedDimple = Math.max(mote.deepEmbedDimple, gripHold * 0.3 + state.gripPocketBiteCue * 0.18)
            mote.rimGrip = Math.max(mote.rimGrip, gripHold * 0.28 + state.gripPocketBiteCue * 0.14)
            mote.organicHold = Math.max(mote.organicHold, gripHold * 0.22 + state.gripPhysicalCue * 0.08)
            mote.slurpPressure = Math.max(mote.slurpPressure, state.gripMouthAnticipationCue * 0.32 + state.gripPocketBiteCue * 0.16)
            mote.flowBridge = Math.max(mote.flowBridge, 0.58 + gripHold * 0.12 + state.gripPhysicalCue * 0.08)
            mote.flowBridgeStrain = Math.max(mote.flowBridgeStrain, gripHold * 0.42 + state.gripHoseStrainCue * 0.32)
            mote.deepEmbedPocketPulse = Math.max(mote.deepEmbedPocketPulse, state.gripPocketBiteCue * 0.34 + state.gripMissPulse * 0.18)
            mote.intakeDimple = Math.max(mote.intakeDimple, state.gripPocketBiteCue * 0.2)
            mote.intakeFunnel = Math.max(mote.intakeFunnel, state.gripMouthAnticipationCue * 0.16)
            mote.edgeWobble = Math.max(mote.edgeWobble, gripHold * 0.2 + state.gripHoseStrainCue * 0.14)
            mote.colorBloom = Math.max(mote.colorBloom, state.gripReleaseReady * 0.24 + state.gripPhysicalCue * 0.22 + state.gripDizzy * 0.14)
          }
	        const embedBridgeThickness = activeContactFlow.bridgeThickness
            * embed.bridgeThicknessMultiplier
            * (manualGrip ? 1.04 + state.gripPhysicalCue * 0.12 + state.gripHoseStrainCue * 0.06 : 1)
            * (state.pivotLocked && state.sealTargetMoteId === i ? 1 + state.pivotTension * 0.08 : 1)
	        const glugEvent = computeGlugMassTransferEvent({
	          time: t,
	          seed: mote.seed,
	          latchAge: mote.latchAge,
	          lastGlugAge: mote.glugLastAt > -900 ? t - mote.glugLastAt : 999,
	          cooldownRemaining: mote.glugCooldown,
	          detached: mote.latched < 0.5 || latchSeal < 0.08,
	          sealQuality: Math.max(activeContactFlow.sealQuality, manualGrip ? PRODUCTION_TUNING.grip.gripSealStrength : 0) + embed.lockStrength * 0.14,
	          latchSeal,
	          feed: Math.max(mote.contactFeed, mote.intakeFeed * 0.8, mote.intakeFlow * 0.6, massTransfer.feedRate * 0.72) * embed.glugStrengthMultiplier * gripVisualFeedMultiplier * stickyStrainFeedMultiplier,
	          pressure: Math.max(mote.slurpPressure, mote.intakeFlow * 0.5, mote.intakeNeck * 0.34, glug.suctionBoost * 0.44) * (manualGrip ? 1.05 : stickyStrainFeedMultiplier) + embed.embedDepthNormalized * 0.18,
	          bridgeActive: activeContactFlow.bridgeIntent + embed.embedDepthNormalized * 0.24 + (manualGrip ? 0.22 : 0),
	          bridgeThickness: embedBridgeThickness,
	          visibleMass: mote.visibleMass,
	          mass: mote.mass,
	          basePulse: glug.pulse * embed.glugStrengthMultiplier * gripVisualFeedMultiplier * stickyStrainFeedMultiplier,
	          baseMassTransfer: eventMassFlow * embed.massTransferMultiplier * gripIntakeMultiplier * stickyStrainFeedMultiplier,
	          tetherStrain: state.tetherStrain,
	          swingTension: state.swingTension,
	        })
	        mote.flowBridge = Math.max(mote.flowBridge, activeContactFlow.bridgeIntent + embed.embedDepthNormalized * 0.22)
	        mote.flowBridgeLength = Math.max(mote.flowBridgeLength, activeContactFlow.bridgeLength)
	        mote.flowBridgeThickness = Math.max(mote.flowBridgeThickness, embedBridgeThickness)
	        mote.flowBridgePulse = Math.max(mote.flowBridgePulse, activeContactFlow.bridgeNarrowing, glugEvent.bridgeNarrowing)
	        mote.flowBridgeSurge = Math.max(mote.flowBridgeSurge, glugEvent.bridgeSurge)
	        mote.flowBridgeStrain = Math.max(mote.flowBridgeStrain, glugEvent.bridgeStrain, embed.strain * 0.42)
	        mote.sealQuality = Math.max(mote.sealQuality, activeContactFlow.sealQuality)
	        mote.sealLeak = Math.max(mote.sealLeak, activeContactFlow.leak)
	        mote.attachmentMassTransferred = Math.min(
	          1.15,
	          mote.attachmentMassTransferred + activeContactFlow.massTransferRate * embed.massTransferMultiplier * gripIntakeMultiplier * cappedDt * 0.34,
	        )
	        mote.intakeFeed = Math.min(
	          1.2,
	          mote.intakeFeed + massTransfer.feedRate * embed.massTransferMultiplier * gripIntakeMultiplier * cappedDt * (0.45 + slurpReadiness * 0.26 + state.suctionReadiness * 0.16 + mote.intakeNeck * 0.14 + mote.slurpPressure * 0.26 + mote.organicHold * 0.12 + mote.contactRope * 0.18 + mote.contactFeed * 0.22 + activeContactFlow.bridgeIntent * 0.14 + embed.embedDepthNormalized * 0.1 + easySuction.feedBoost * EASY_SUCTION_TUNING.feedAcceleration + glug.massTransfer * GLUG_RHYTHM.massPulse),
        )
        mote.intakeRecoil = Math.max(mote.intakeRecoil, massTransfer.recoil * 0.28 + mote.contactSnap * 0.24 + glug.recoil * 0.42 + snapBond.recoil * 0.18)
        state.glugPulse = Math.max(state.glugPulse, mote.glugPulse)
        state.glugMassFlow = Math.max(state.glugMassFlow, eventMassFlow)
	        feedBagReward(
	          state,
	          massTransfer.feedRate * glug.massTransfer * gripIntakeMultiplier * cappedDt * (BAG_REWARD_TUNING.flowMassScale + mote.mass * 0.04 + easySuction.feedBoost * 0.06),
	          mote.glugPulse,
	          eventMassFlow,
	          0,
	          {
	            sealStrength: activeContactFlow.sealQuality,
	            slimeColor: applyReferenceSlimeColor(bagIntakeColor, mote, pile, t, 0.18 + mote.glugPulse * 0.08, 0.1, 'strand'),
	          },
	        )
	        if (glugEvent.successful) {
	          mote.glugCooldown = glugEvent.interval
	          mote.glugLastAt = t
	          mote.glugCountThisAttachment += 1
	          if (embed.embedDepthNormalized > 0.28) {
	            mote.deepEmbedGlugCount += 1
	            mote.deepEmbedMassTransferred += glugEvent.mass
	          }
	          mote.glugEventStrength = Math.max(mote.glugEventStrength, glugEvent.strength)
	          mote.glugEventMass = Math.max(mote.glugEventMass, glugEvent.mass)
	          mote.glugFailedStrength = damp(mote.glugFailedStrength, 0, 9.0, cappedDt)
	          mote.attachmentMassTransferred = Math.min(
	            1.22,
	            mote.attachmentMassTransferred + Math.max(glugEvent.mass, activeContactFlow.pulseMass * 0.42),
	          )
	          mote.flowBridgePulse = Math.max(mote.flowBridgePulse, glugEvent.bridgeNarrowing + glug.neckPinch * 0.28)
	          mote.flowBridgeSurge = Math.max(mote.flowBridgeSurge, glugEvent.bridgeSurge)
	          mote.deepEmbedPocketPulse = Math.max(mote.deepEmbedPocketPulse, embed.pocketPulse + glugEvent.strength * embed.embedDepthNormalized * 0.22)
	          mote.deepEmbedDimple = Math.max(mote.deepEmbedDimple, embed.pocketDimple + glugEvent.strength * embed.embedDepthNormalized * 0.14)
	          mote.flowBridgeThickness = Math.max(
	            PRODUCTION_TUNING.suction.flowBridgeMinThickness,
	            mote.flowBridgeThickness * (1 - glugEvent.bridgeNarrowing * 0.28),
	          )
	          const depletionCrawl = glugEvent.strength
	            * livingTuning.depletionCrawlStrength
	            * (0.58 + embed.embedDepthNormalized * 0.32 + activeContactFlow.bridgeIntent * 0.18)
	          mote.contraction = Math.max(mote.contraction, depletionCrawl * 0.34)
	          mote.intakeDimple = Math.max(mote.intakeDimple, depletionCrawl * 0.26)
	          mote.contactDent = Math.max(mote.contactDent, depletionCrawl * 0.2)
	          mote.poolPressure = Math.max(mote.poolPressure, depletionCrawl * 0.18)
	          mote.seamAssimilation = Math.max(mote.seamAssimilation, depletionCrawl * livingTuning.mergeSeamSwirlStrength)
	          mote.livingCongeal = Math.max(mote.livingCongeal, depletionCrawl * 0.46)
	          mote.livingFlow = Math.max(mote.livingFlow, depletionCrawl * livingTuning.internalFlowStrength * 0.9)
	          mote.materialWake = Math.max(mote.materialWake, depletionCrawl * 0.22)
	          slimeSurfaceVector.copy(mote.sealPoint).sub(mouth)
	          slimeSurfaceVector.y *= 0.28
	          if (slimeSurfaceVector.lengthSq() > 0.0001) {
	            slimeSurfaceVector.normalize()
	            state.velocity.addScaledVector(slimeSurfaceVector, glugEvent.hoseTug * 0.045)
	            state.velocity.addScaledVector(state.forward, -glugEvent.bodyBump * 0.46)
	            mote.velocity.addScaledVector(slimeSurfaceVector, -glugEvent.slimeRecoil * 0.11)
	          }
	          state.glugCycles += 1
	          state.glugLastAt = t
	          state.glugLastAge = 0
	          state.glugCountThisAttachment = Math.max(state.glugCountThisAttachment, mote.glugCountThisAttachment)
	          state.glugEventStrength = Math.max(state.glugEventStrength, glugEvent.strength)
	          state.glugEventMass = Math.max(state.glugEventMass, glugEvent.mass)
	          state.glugFailedStrength = damp(state.glugFailedStrength, 0, 9.0, cappedDt)
	          if (embed.embedDepthNormalized > 0.28) {
	            state.deepEmbedGlugCount = Math.max(state.deepEmbedGlugCount, mote.deepEmbedGlugCount)
	            state.deepEmbedMassTransferred = Math.max(state.deepEmbedMassTransferred, mote.deepEmbedMassTransferred)
	          }
	          state.suctionContactGlugTimer = Math.max(state.suctionContactGlugTimer, PRODUCTION_TUNING.glug.mouthPulseDuration)
	          state.gulpFlow = Math.min(1.95, Math.max(state.gulpFlow, 0.34 + glug.bodyThump * 0.54 + glug.massTransfer * 0.22 + glugEvent.strength * 0.28))
          state.gulpAge = Math.min(state.gulpAge, 0.04)
	          const bagReward = feedBagReward(
	            state,
	            glugEvent.bagMass + glug.massTransfer * BAG_REWARD_TUNING.glugMassScale * (0.18 + mote.mass * 0.08),
	            glugEvent.bagPulse,
	            glugEvent.mass,
	            PRODUCTION_TUNING.glug.bagPulseDelay,
	            {
	              sealStrength: activeContactFlow.sealQuality,
	              countGlug: true,
	              slimeColor: applyReferenceSlimeColor(bagIntakeColor, mote, pile, t, 0.28 + glugEvent.strength * 0.16, 0.12, 'strand'),
	            },
	          )
          recordFlowGlug(state.flowMetrics, {
            time: t,
            successful: true,
            strength: glugEvent.strength,
            massTransferred: glugEvent.mass,
            sealStrength: Math.max(activeContactFlow.sealQuality, manualGrip ? PRODUCTION_TUNING.grip.gripSealStrength : 0),
            tension: state.tetherStrain,
            bagMassGained: bagReward.lastMassReceived,
          })
          state.flash = Math.min(1.5, state.flash + glug.bodyThump * 0.045 + glugEvent.mouthPulse)
          state.recoil = Math.min(1.5, state.recoil + glug.bodyThump * GLUG_RHYTHM.mouthThump + glugEvent.bodyBump)
          state.animationGlug = Math.max(state.animationGlug, glugEvent.strength * 0.82 + glug.pulse * 0.28)
          state.animationSlurp = Math.max(state.animationSlurp, glug.suctionBoost * 0.52 + mote.slurpPressure * 0.16 + glugEvent.strength * 0.12)
          state.animationMouthTug = Math.max(state.animationMouthTug, glugEvent.hoseTug * 0.78 + mote.intakeNeck * 0.18 + embed.embedDepthNormalized * 0.08)
          state.animationBodyJolt = Math.max(state.animationBodyJolt, glugEvent.bodyBump * 2.35 + glug.bodyThump * 0.16 + embed.embedDepthNormalized * glugEvent.strength * 0.045)
          state.animationBag = Math.max(state.animationBag, glugEvent.bagPulse * 0.68)
          state.animationStrandPinch = Math.max(state.animationStrandPinch, glugEvent.bridgeNarrowing * 0.86 + glug.neckPinch * 0.28)
        } else if (glugEvent.failedStrength > 0.04) {
          mote.glugCooldown = glugEvent.interval * 0.64
          mote.glugLastAt = t
          mote.glugFailedStrength = Math.max(mote.glugFailedStrength, glugEvent.failedStrength)
          mote.flowBridgePulse = Math.max(mote.flowBridgePulse, glugEvent.bridgeNarrowing)
          mote.flowBridgeSurge = Math.max(mote.flowBridgeSurge, glugEvent.bridgeSurge)
          mote.sealLeak = Math.max(mote.sealLeak, 0.12 + glugEvent.failedStrength * 0.24)
          mote.intakeRecoil = Math.max(mote.intakeRecoil, glugEvent.slimeRecoil * 0.34)
          state.glugFailedStrength = Math.max(state.glugFailedStrength, glugEvent.failedStrength)
          recordFlowGlug(state.flowMetrics, {
            time: t,
            successful: false,
            strength: glugEvent.failedStrength,
            massTransferred: 0,
            sealStrength: Math.max(activeContactFlow.sealQuality, manualGrip ? PRODUCTION_TUNING.grip.gripSealStrength : 0),
            tension: state.tetherStrain,
          })
          state.suctionContactGlugTimer = Math.max(state.suctionContactGlugTimer, glugEvent.interval * 0.5)
          state.animationStrandPinch = Math.max(state.animationStrandPinch, glugEvent.failedStrength * 0.24)
        }
        const fullSlurp = computeFullSlurpPayoff({
          visibleMass: mote.visibleMass,
          intakeFeed: mote.intakeFeed,
          contactFeed: mote.contactFeed,
          slurp: mote.slurp,
          glugPulse: mote.glugPulse,
          glugMassFlow: glug.massTransfer * Math.max(0.18, massTransfer.feedRate),
          neck: Math.max(mote.intakeNeck, mote.contactRope),
          rope: mote.contactRope,
          latchAge: mote.latchAge,
	          distanceToMouth: contactDistance,
          mass: mote.mass,
          bagFill: state.bagFill,
          fragmentAbsorb: mote.absorb,
        })
        mote.completionNearEmpty = damp(mote.completionNearEmpty, fullSlurp.nearEmpty, fullSlurp.nearEmpty > mote.completionNearEmpty ? 10.4 : 4.4, cappedDt)
        mote.completionFinalStrand = damp(mote.completionFinalStrand, fullSlurp.finalStrand, fullSlurp.finalStrand > mote.completionFinalStrand ? 11.2 : 4.8, cappedDt)
        mote.completionFinalGlug = damp(mote.completionFinalGlug, fullSlurp.finalGlug, fullSlurp.finalGlug > mote.completionFinalGlug ? 12.5 : 5.0, cappedDt)
        mote.completionCleanup = damp(mote.completionCleanup, fullSlurp.cleanup, fullSlurp.cleanup > mote.completionCleanup ? 8.8 : 3.4, cappedDt)
        mote.completionChainReady = damp(mote.completionChainReady, fullSlurp.chainReady, fullSlurp.chainReady > mote.completionChainReady ? 8.4 : 3.6, cappedDt)
        if (fullSlurp.nearEmpty > 0.06) {
          mote.intakeNeck = Math.max(mote.intakeNeck, fullSlurp.finalStrand * 0.62)
          mote.contactRope = Math.max(mote.contactRope, fullSlurp.finalStrand * 0.58)
          mote.contactFeed = Math.min(1.24, mote.contactFeed + fullSlurp.finalGlug * cappedDt * 0.18)
          mote.intakeFeed = Math.min(1.24, mote.intakeFeed + fullSlurp.finalGlug * cappedDt * 0.24)
          mote.slurp = Math.min(1.12, mote.slurp + fullSlurp.finalGlug * cappedDt * 0.16)
          mote.contraction = Math.max(mote.contraction, fullSlurp.nearEmpty * livingTuning.recoilSettleStrength * 0.28)
          mote.livingCongeal = Math.max(mote.livingCongeal, fullSlurp.cleanup * livingTuning.depletionCrawlStrength * 0.38)
          mote.seamAssimilation = Math.max(mote.seamAssimilation, fullSlurp.cleanup * livingTuning.mergeSeamSwirlStrength * 0.36)
          mote.intakeRecoil = Math.max(mote.intakeRecoil, fullSlurp.recoil * 0.46)
          mote.edgeWobble = Math.max(mote.edgeWobble, fullSlurp.recoil * 0.35)
          state.slimeCompletionNearEmpty = Math.max(state.slimeCompletionNearEmpty, fullSlurp.nearEmpty)
          state.slimeCompletionFinalStrand = Math.max(state.slimeCompletionFinalStrand, fullSlurp.finalStrand)
          state.slimeCompletionFinalGlug = Math.max(state.slimeCompletionFinalGlug, fullSlurp.finalGlug)
          state.slimeCompletionCleanup = Math.max(state.slimeCompletionCleanup, fullSlurp.cleanup)
          state.slimeCompletionChainReady = Math.max(state.slimeCompletionChainReady, fullSlurp.chainReady)
          state.animationStrandPinch = Math.max(state.animationStrandPinch, fullSlurp.finalStrand * 0.72)
          state.animationCompletion = Math.max(state.animationCompletion, fullSlurp.finalGlug * 0.78)
          state.animationBag = Math.max(state.animationBag, fullSlurp.bagReward * 0.46)
          state.animationMouthTug = Math.max(state.animationMouthTug, fullSlurp.finalGlug * 0.58)
        }
        intakeSwallowReady = massTransfer.swallowReady
          || fullSlurp.finalGlug > 0.62
          || (mote.intakeFeed > 0.88 && mote.slurp > 0.74 && mote.intakeFlow > 0.36)
          || (mote.contactFeed > 1.02 && mote.visibleMass < 0.32)
        mouthSlurpPointVector.copy(mouth).addScaledVector(forward, -(0.035 + mote.slurp * (0.26 + mote.size * 1.45) + mote.contactFeed * 0.05 + glug.neckPinch * 0.04))
        mouthSlurpPointVector.y -= mote.slurp * 0.045 + mote.contactRope * 0.012 + glug.pulse * 0.012
        slurpTargetVector.copy(mote.sealPoint).lerp(mouthSlurpPointVector, 0.24 + slurpReadiness * 0.68 + mote.intakeFlow * 0.08 + mote.slurpPressure * 0.1 + mote.contactRope * 0.1 + mote.contactFeed * 0.14 + glug.suctionBoost * 0.12)
        sealVector.copy(slurpTargetVector).sub(mote.position)
        mote.velocity.addScaledVector(sealVector, cappedDt * (6.2 + slurpReadiness * 9.8 + mote.slurp * 5.6 + mote.suctionYield * 4.0 + mote.intakeFlow * 2.6 + state.controllerMouthSettle * 1.4 + mote.mouthMagnetism * 1.7 + mote.slurpPressure * 2.5 + mote.contactDent * 1.2 + mote.contactRope * 2.0 + mote.contactFeed * 2.4 + easySuction.pullBoost * 2.4 + easySuction.feedBoost * 2.0 + glug.suctionBoost * 2.2 + snapBond.grip * SNAP_BOND_PHYSICS.gripReinforce - slurpResistance * 1.6 - mote.contactResistance * 0.7))
        mote.velocity.addScaledVector(force.inward, cappedDt * mote.suctionLoad * (1.0 + slurpReadiness * 1.48 + mote.intakeFlow * 0.5 + mote.mouthMagnetism * 0.32 + mote.slurpPressure * 0.4 + mote.contactFeed * 0.34 + easySuction.pullBoost * 0.34 + easySuction.feedBoost * 0.28 + glug.massTransfer * 0.36))
        mote.velocity.addScaledVector(state.velocity, cappedDt * (0.12 + state.tetherStrain * 0.12 + slurpReadiness * 0.1))
        mote.velocity.multiplyScalar(Math.exp(-(1.28 + mote.slurp * 1.18 + slurpReadiness * 0.74 + mote.organicHold * 0.32 + mote.rimGrip * 0.16 + mote.contactFeed * 0.18 + glug.neckPinch * 0.14 - slurpResistance * 0.2 - mote.contactResistance * 0.08) * cappedDt))
        mote.anchor.lerp(mote.sealPoint, Math.min(0.16, cappedDt * (1.2 + state.tetherStrain * 0.8 + mote.intakeFlow * 0.5 + mote.organicHold * 0.38 + mote.contactTongue * 0.18)))
	        registerSlimeSeal(
	          state,
	          manualGrip ? state.gripLockPoint : mote.sealPoint,
	          0.42
	            + latchSeal * 0.5
	            + slurpReadiness * 0.58
	            + mote.slurp * 0.22
	            + grabReadiness * 0.28
	            + easySuction.sealBoost * 0.42
	            + pileSurfaceAssist.sealBoost * 0.32
	            + pileSurfaceAssist.lock * 0.24
	            + tactileLock * 0.2
	            + tactileBrush * 0.1
	            + candidateBoost * 0.18
	            + mote.intakeAdhesion * 0.22
	            + mote.rimGrip * 0.26
	            + mote.organicHold * 0.28
	            + mote.slurpPressure * 0.18
	            + mote.contactLipSeal * 0.24
	            + mote.contactRope * 0.28
	            + mote.contactFeed * 0.26
	            + mote.sealQuality * 0.22
	            + embed.lockStrength * 0.2
	            - mote.sealLeak * 0.1
	            + state.controllerGripQuality * 0.08
	            + state.controllerSwingFlow * 0.08
	            + state.controllerWinchPull * 0.08
	            + snapBond.grip * 0.12
	            + snapBond.tension * 0.1
	            + glug.pulse * 0.08
	            + (manualGrip ? PRODUCTION_TUNING.grip.gripSealStrength * 0.42 : 0),
	          sealCandidate,
	        )
        const pivotSnapGate = state.pivotLocked
          ? Math.max(SNAP_BOND_PHYSICS.breakThreshold, Math.min(1.85, state.pivotSnapThreshold * 0.86))
          : SNAP_BOND_PHYSICS.breakThreshold
        if (!manualGrip && !stickyAnchorActive && (snapBond.snap > pivotSnapGate || embed.snapReady || (state.pivotLocked && state.pivotSnapReadiness > 1.04)) && mote.snapBondCooldown <= 0 && mote.intakeFeed < 0.98) {
          const residue = residues[residueCursor.current % residues.length]
          residueCursor.current += 1
          residue.position.copy(mote.sealPoint).lerp(mouth, 0.28)
          residue.position.y = SLIME_MOTE_FLOOR_Y + 0.02
          applyReferenceSlimeColor(slimeResidueColor, mote, pile, t, 0.42 + snapBond.snap * 0.08, 0.12, 'residue')
          residue.color.copy(slimeResidueColor).lerp(slimeWarmColor, 0.2)
          residue.age = 0
          residue.life = Math.min(
            PRODUCTION_TUNING.suction.visualSlimeEffectMaxLife,
            0.34 + Math.max(snapBond.recoil, embed.slimeRecoil) * 0.36,
          )
          residue.size = mote.size * (0.68 + Math.max(mote.snapBondStrain, embed.strain * 0.52) * 0.62 + embed.embedDepthNormalized * 0.18)
          residue.yaw = Math.atan2(mote.velocity.x + force.inward.x * 0.45, mote.velocity.z + force.inward.z * 0.45)
          residue.seed = mote.seed + state.glugCycles * 0.31
                  residue.strength = 0.48 + Math.max(snapBond.recoil, embed.slimeRecoil) * 0.32 + embed.fleckStrength * 0.16
                  snapReleaseVector.copy(mote.position).sub(mouth)
                  snapReleaseVector.y *= 0.28
                  if (snapReleaseVector.lengthSq() > 0.0001) snapReleaseVector.normalize()
                  else snapReleaseVector.copy(state.forward).multiplyScalar(-1)
                  const flowSnapVelocityBefore = { x: state.velocity.x, y: state.velocity.y, z: state.velocity.z }
                  const pivotSnapOverdrive = 1 + state.pivotSnapReadiness * (PRODUCTION_TUNING.pivot.snapFlingImpulseScale - 1)
                  const snapDamp = clampValue(PRODUCTION_TUNING.pivot.snapMomentumPreserve, 0.12, 1)
                  const snapImpulse = Math.max(snapBond.releaseImpulse
                    * SNAP_BOND_PHYSICS.releaseImpulse
                    * (0.48 + state.tetherStrain * 0.18 + state.swingTension * 0.08 + state.pivotTension * 0.16)
                    * pivotSnapOverdrive, embed.popImpulse * (0.52 + state.tetherStrain * 0.18 + state.swingTension * 0.08 + state.pivotSnapReadiness * 0.14))
                    * snapDamp
                  // Keep pop-out readable as suction release: radial away from the pocket, never orbit/tangent.
                  const tangentImpulse = 0
                  state.velocity.addScaledVector(snapReleaseVector, snapImpulse)
                  state.velocity.multiplyScalar(1 + Math.max(snapBond.momentumCarry, embed.popImpulse * 0.34, state.pivotSnapReadiness * 0.32) * 0.035 * snapDamp)
                  const flowSnapVelocityAfter = { x: state.velocity.x, y: state.velocity.y, z: state.velocity.z }
                  state.snapMomentum.copy(state.velocity)
                  state.tetherRelease = Math.max(state.tetherRelease, snapBond.momentumCarry, embed.popImpulse * 0.58, state.pivotSnapReadiness * PRODUCTION_TUNING.pivot.hoseSnapRecoilStrength)
                  state.controllerReleaseMomentum = Math.max(state.controllerReleaseMomentum, snapBond.momentumCarry * 0.94, embed.popImpulse * 0.52, state.pivotSnapReadiness * 0.58)
                  state.controllerReattachGrace = Math.max(state.controllerReattachGrace, 0.34 + snapBond.momentumCarry * 0.44, 0.28 + embed.popImpulse * 0.32, 0.38 + state.pivotSnapReadiness * 0.34)
                  state.postSnapReattachTimer = Math.max(state.postSnapReattachTimer, PRODUCTION_TUNING.hose.postSnapReattachDelay + 0.12, PRODUCTION_TUNING.embed.embedReattachCooldown, PRODUCTION_TUNING.pivot.postSnapReattachDelay + state.pivotSnapReadiness * 0.1)
                  state.pivotReattachCooldown = Math.max(state.pivotReattachCooldown, PRODUCTION_TUNING.pivot.postSnapReattachDelay + state.pivotSnapReadiness * 0.14)
                  state.pivotReleaseReason = embed.snapReady ? 'deepEmbedPopOut' : state.pivotSnapReadiness > 0.45 ? 'pivotTension' : 'tensionExceeded'
                  state.pivotHoseWobble = Math.max(state.pivotHoseWobble, state.pivotSnapReadiness * PRODUCTION_TUNING.pivot.hoseSnapRecoilStrength)
                  recordFlowSnap(state.flowMetrics, {
                    time: t,
                    reason: embed.snapReady ? 'deepEmbedPopOut' : 'tensionExceeded',
                    sealBreakReason: embed.releaseReason === 'angle' ? 'angleTooPoor' : embed.releaseReason === 'depleted' ? 'slimeDepleted' : 'tensionExceeded',
                    targetId: i,
                    tension: Math.max(snapBond.tension, embed.tensionPenalty, state.pivotTension),
                    sealStrength: activeContactFlow.sealQuality,
                    velocityBefore: flowSnapVelocityBefore,
                    velocityAfter: flowSnapVelocityAfter,
                    snapImpulseApplied: snapImpulse + Math.abs(tangentImpulse),
                    contactAngle: 1 - clampValue(ahead, 0, 1),
                  })
	                  const bridgeRecoil = Math.max(activeContactFlow.breakRecoil, mote.flowBridgeBreak, embed.slimeRecoil * 0.58, embed.popImpulse * 0.34)
	                  mote.velocity.addScaledVector(
	                    snapReleaseVector,
	                    Math.max(snapBond.recoil, embed.slimeRecoil)
	                      * SNAP_BOND_PHYSICS.slimeRecoil
	                      * (0.46 + bridgeRecoil * PRODUCTION_TUNING.suction.slimeRecoilStrength * 0.12),
	                  )
	                  mote.flowBridgeBreak = Math.max(mote.flowBridgeBreak, bridgeRecoil, snapBond.recoil * PRODUCTION_TUNING.suction.bridgeBreakRecoil, embed.slimeRecoil * 0.64)
	                  mote.flowBridge = Math.min(mote.flowBridge, 0.18)
	                  mote.flowBridgePulse = Math.max(mote.flowBridgePulse, 0.62 + bridgeRecoil * 0.28)
	          mote.intakeRecoil = Math.max(mote.intakeRecoil, snapBond.recoil, embed.slimeRecoil)
          mote.edgeWobble = Math.max(mote.edgeWobble, 0.42 + Math.max(snapBond.recoil, embed.slimeRecoil) * 0.32)
          mote.contraction = Math.max(mote.contraction, 0.34 + Math.max(snapBond.recoil, embed.slimeRecoil) * 0.22)
          mote.stretchMemory *= 0.82
                  mote.latched = 0
                  mote.latchAge = 0
	                  mote.slurp *= 0.72
	                  mote.sealLeak = Math.max(mote.sealLeak, 0.34 + bridgeRecoil * 0.22)
	                  mote.deepEmbedState = embed.snapReady ? 'pop-out-snap' : mote.deepEmbedState
	                  mote.deepEmbedDepth = 0
	                  mote.deepEmbedPopPulse = Math.max(mote.deepEmbedPopPulse, embed.popImpulse)
	                  mote.deepEmbedFleckBurst = Math.max(mote.deepEmbedFleckBurst, embed.fleckStrength)
	                  mote.deepEmbedReleaseReason = embed.releaseReason
	                  mote.snapBondCooldown = Math.max(SNAP_BOND_PHYSICS.reattachCooldown, PRODUCTION_TUNING.embed.embedReattachCooldown)
                  if (state.sealTargetMoteId === i) {
                    state.sealTargetMoteId = -1
                    state.sealTargetScore = 0
                    state.slimeSealDemand = 0
                    state.slimeSealStrength *= 0.22
                    state.hoseHookStrength = Math.min(state.hoseHookStrength, 0.18)
                  }
          state.snapBreakPoint.copy(residue.position)
          state.deepEmbedState = embed.snapReady ? 'pop-out-snap' : state.deepEmbedState
          state.deepEmbedReleaseReason = embed.releaseReason
          state.deepEmbedFleckBurst = Math.max(state.deepEmbedFleckBurst, embed.fleckStrength)
          state.snapBreakPulse = Math.max(state.snapBreakPulse, snapBond.recoil, embed.popImpulse * 0.72)
          state.snapBreakCycles += 1
          state.flash = Math.min(1.5, state.flash + 0.12 + Math.max(snapBond.snap, embed.popImpulse * 0.4) * 0.08)
          state.animationSnap = Math.max(state.animationSnap, snapBond.snap, embed.popImpulse * 0.5)
          state.animationRecoil = Math.max(state.animationRecoil, Math.max(snapBond.recoil, embed.slimeRecoil) * 0.82)
          state.animationSlide = Math.max(state.animationSlide, Math.max(snapBond.momentumCarry, embed.popImpulse * 0.42) * 0.42)
          state.animationStrandPinch = Math.max(state.animationStrandPinch, Math.max(snapBond.strain, embed.strain * 0.58) * 0.58)
          latchSeal = 0
        }
      } else {
        mote.completionNearEmpty = damp(mote.completionNearEmpty, 0, 4.2, cappedDt)
        mote.completionFinalStrand = damp(mote.completionFinalStrand, 0, 4.4, cappedDt)
        mote.completionFinalGlug = damp(mote.completionFinalGlug, 0, 5.2, cappedDt)
        mote.completionCleanup = damp(mote.completionCleanup, 0, 3.6, cappedDt)
        mote.completionChainReady = damp(mote.completionChainReady, 0, 3.6, cappedDt)
      }

      mote.coagulate = damp(mote.coagulate, pilePull, 5.2, cappedDt)
      mote.settled = damp(mote.settled, smooth01((1.0 - pileDistance) / 1.0) * (1 - captureLift) * visibleProgress, 4.4, cappedDt)
      mote.mound = damp(mote.mound, Math.min(1.55, (mote.settled * 0.84 + mote.coagulate * 0.24) * (0.88 + pile.mass * 0.032)), 3.6, cappedDt)
      const pooling = computePoolingSettle({
        mass: mote.mass,
        visibleMass: mote.visibleMass,
        merge: mote.merge,
        coagulate: mote.coagulate,
        compression: mote.compression,
        settled: mote.settled,
        absorb: mote.absorb,
      })
      mote.poolPressure = damp(mote.poolPressure, pooling.pressure, pooling.pressure > mote.poolPressure ? 5.4 : 2.4, cappedDt)
      mote.colorBloom = damp(
        mote.colorBloom,
        Math.min(
          1,
          mote.coagulate * 0.92
            + mote.merge * 0.5
            + mote.mergeHeat * 0.42
            + mote.surfaceTension * 0.24
            + mote.poolPressure * 0.28
            + mote.suctionStrain * 0.24
            + mote.tendril * 0.18
            + mote.easySuctionAssist * 0.14
            + mote.easySuctionFeed * 0.18
            + mote.growthWake * 0.12
            + mote.generationPulse * 0.18
            + mote.materialWake * 0.3
            + mote.waxDepth * 0.12
            + mote.seamAssimilation * 0.18
            + mote.elasticMemory * 0.16
            + mote.reemergeCharge * 0.22
            + mote.livingPulse * PRODUCTION_TUNING.livingSlime.colorPulseStrength
            + mote.livingCongeal * 0.18
            + mote.livingBreak * 0.16
            + mote.intakeDimple * 0.18
            + mote.intakeFunnel * 0.28
            + mote.intakeNeck * 0.24
            + mote.intakeFlow * 0.34
            + mote.mouthMagnetism * 0.22
            + mote.rimGrip * 0.18
            + mote.organicHold * 0.22
            + mote.slurpPressure * 0.28
            + mote.settled * 0.45
            + mote.compression * 0.24
            + mote.contraction * 0.22
            + mote.suctionYield * 0.22
            + latchSeal * 0.42
            + mote.slurp * 0.46
            + mote.intakeFeed * 0.28
            + mote.glugPulse * 0.18
            + mote.completionNearEmpty * 0.22
            + mote.completionFinalStrand * 0.2
            + mote.completionFinalGlug * 0.26
            + mote.snapBondTension * 0.12
            + mote.strain * 0.16,
        ),
        4.9,
        cappedDt,
      )
      const visibleTideMass = isFirstLevelMode(state.devMode)
        ? computeLevelMoteMass(mote) * 0.12
        : 0
      pile.targetMass += (mote.settled + mote.coagulate * 0.28 + mote.poolPressure * 0.16 + mote.absorb * 0.12 + mote.livingCongeal * 0.12 + mote.livingPulse * 0.08 + mote.generationPulse * 0.12 + easySuction.growthWake * EASY_SUCTION_TUNING.growthWakeMass + visibleTideMass) * (0.34 + mote.size * 7.2) * visibleProgress
      pile.targetChroma += (mote.colorBloom + mote.merge * 0.28 + mote.mergeHeat * 0.24 + mote.surfaceTension * 0.12 + mote.settled * 0.14 + mote.livingPulse * 0.22 + mote.livingFlow * 0.16 + mote.generationPulse * 0.22 + easySuction.growthWake * 0.14) * visibleProgress * 0.32
      pile.absorbedMass = Math.min(3, pile.absorbedMass + mote.absorb * mote.mass * visibleProgress * cappedDt * 4.8 + mote.intakeFeed * mote.slurpPressure * mote.mass * visibleProgress * cappedDt * (0.34 + mote.contactFeed * 0.1 + easySuction.feedBoost * 0.08))

      const moundLift = mote.mound * (0.08 + mote.size * 0.95)
      const targetY = SLIME_MOTE_FLOOR_Y + mote.size * 0.42 + moundLift + captureLift * (mouth.y - SLIME_MOTE_FLOOR_Y) * 0.82
	      const floorGrip = Math.max(0, 1 - captureLift * (0.46 + mote.suctionYield * 0.54) - latchSeal * (0.28 + state.suctionReadiness * 0.22 + state.controllerMouthSettle * 0.08) - mote.intakeFunnel * 0.16 - mote.intakeFlow * 0.18 - mote.glugPulse * 0.08 - mote.contactDent * 0.12 - mote.contactRope * 0.16 - mote.contactFeed * 0.18 - mote.flowBridge * 0.12 - mote.deepEmbedDepth * 0.14 - mote.deepEmbedDimple * 0.08 - mote.sealQuality * 0.08 + mote.sealLeak * 0.06 - mote.completionFinalStrand * 0.1 - mote.completionFinalGlug * 0.16 - mote.mouthMagnetism * 0.1 - mote.slurpPressure * 0.12 - looseFragmentIntake.flow * 0.2 - looseFragmentIntake.feed * 0.16 - easySuction.pullBoost * 0.12 - easySuction.feedBoost * 0.1 - state.tetherStrain * 0.07)
      const anchorTension = floorGrip * (0.64 + mote.merge * 0.46 + mote.coagulate * 0.24)
      mote.velocity.x += (mote.anchor.x - mote.position.x) * anchorTension * 2.35 * cappedDt
      mote.velocity.z += (mote.anchor.z - mote.position.z) * anchorTension * 2.35 * cappedDt
      mote.velocity.y += (targetY - mote.position.y) * (12 + floorGrip * 24) * cappedDt
      mote.velocity.x *= Math.exp(-(0.72 + floorGrip * 1.65) * cappedDt)
      mote.velocity.z *= Math.exp(-(0.72 + floorGrip * 1.65) * cappedDt)
      mote.velocity.y *= Math.exp((floorGrip ? -10.5 : -2.2) * cappedDt)
      mote.position.addScaledVector(mote.velocity, cappedDt)
      mote.anchor.x += (mote.position.x - mote.anchor.x) * cappedDt * (0.38 + captureLift * 0.12)
      mote.anchor.z += (mote.position.z - mote.anchor.z) * cappedDt * (0.38 + captureLift * 0.12)
      mote.anchor.x += (pile.center.x - mote.anchor.x) * cappedDt * mote.coagulate * 0.16
      mote.anchor.z += (pile.center.z - mote.anchor.z) * cappedDt * mote.coagulate * 0.16
      mote.anchor.y = SLIME_MOTE_FLOOR_Y + mote.size * 0.36
      if (mote.position.y < SLIME_MOTE_FLOOR_Y + mote.size * 0.36) {
        mote.position.y = SLIME_MOTE_FLOOR_Y + mote.size * 0.36
        mote.velocity.y = Math.max(0, mote.velocity.y) * 0.18
      }
      mote.mergeTarget = Math.max(mote.mergeTarget, latchSeal * 0.62)
      mote.merge = damp(mote.merge, mote.mergeTarget, 8.2, cappedDt)
      const planarAnchorDistance = Math.hypot(mote.position.x - mote.anchor.x, mote.position.z - mote.anchor.z)
      const moteSpeed = mote.velocity.length()
      const stretchTarget = computeJellyWaxStretchTarget({
        anchorDistance: planarAnchorDistance,
        speed: moteSpeed + mote.glugPulse * 0.12,
        suctionLoad: mote.suctionLoad + mote.intakeFunnel * 0.18 + mote.contactDent * 0.12 + mote.mouthMagnetism * 0.16 + mote.snapBondTension * 0.16 + easySuction.pullBoost * 0.14,
        suctionYield: mote.suctionYield + mote.intakeFlow * 0.12 + mote.contactFeed * 0.08 + mote.slurpPressure * 0.1 + mote.glugPulse * 0.08 + easySuction.feedBoost * 0.08,
        latchSeal,
        slurp: mote.slurp + mote.intakeNeck * 0.14 + mote.contactRope * 0.1 + mote.organicHold * 0.12 + mote.snapBondStrain * 0.12 + mote.deepEmbedDepth * 0.12 + easySuction.feedBoost * 0.08,
        merge: mote.merge,
        mergeTarget: mote.mergeTarget,
      })
      const previousStretch = mote.stretchMemory
      mote.stretchMemory = damp(mote.stretchMemory, stretchTarget, stretchTarget > mote.stretchMemory ? 8.5 : 2.2, cappedDt)
      mote.contraction = damp(
        mote.contraction,
        computeContractionTarget(previousStretch, stretchTarget),
        stretchTarget < previousStretch ? 7.0 : 4.2,
        cappedDt,
      )
      if (mote.contraction > 0.01 && floorGrip > 0.08) {
        slimeSnapbackVector.copy(mote.anchor).sub(mote.position)
        slimeSnapbackVector.y = 0
        const snapbackDistance = slimeSnapbackVector.length()
        if (snapbackDistance > 0.001) {
          slimeSnapbackVector.multiplyScalar(1 / snapbackDistance)
          const snapbackForce = mote.contraction * (1.15 + mote.surfaceTension * 0.42 + mote.poolPressure * 0.22) * floorGrip
          mote.velocity.x += slimeSnapbackVector.x * snapbackForce * cappedDt
          mote.velocity.z += slimeSnapbackVector.z * snapbackForce * cappedDt
          mote.velocity.x *= Math.exp(-mote.contraction * 0.18 * cappedDt)
          mote.velocity.z *= Math.exp(-mote.contraction * 0.18 * cappedDt)
        }
      }
      const materialResponse = computePremiumSlimeMaterial({
        stretchMemory: mote.stretchMemory,
        contraction: mote.contraction,
        compression: mote.compression,
        mergeHeat: mote.mergeHeat,
        surfaceTension: mote.surfaceTension,
        poolPressure: mote.poolPressure,
        suctionStrain: mote.suctionStrain,
        tendril: mote.tendril,
        intakeFlow: mote.intakeFlow + mote.slurpPressure * 0.18 + mote.contactFeed * 0.12 + mote.glugPulse * 0.18 + mote.deepEmbedPocketPulse * 0.12 + mote.completionFinalGlug * 0.18 + easySuction.feedBoost * 0.16,
        intakeFeed: mote.intakeFeed + mote.contactRope * 0.1 + mote.organicHold * 0.08 + mote.snapBondTension * 0.08 + mote.deepEmbedDepth * 0.08 + mote.completionFinalStrand * 0.1 + easySuction.feedBoost * 0.1,
        visibleMass: mote.visibleMass,
        speed: moteSpeed,
        floorStick: mote.floorStick,
        settled: mote.settled,
        reemergeCharge: mote.reemergeCharge + easySuction.growthWake * 0.18,
      })
      mote.materialWake = damp(mote.materialWake, materialResponse.chromaWake, materialResponse.chromaWake > mote.materialWake ? 7.4 : 2.8, cappedDt)
      mote.waxDepth = damp(mote.waxDepth, materialResponse.waxDepth, materialResponse.waxDepth > mote.waxDepth ? 5.8 : 2.6, cappedDt)
      mote.seamAssimilation = damp(mote.seamAssimilation, materialResponse.seamAssimilation, materialResponse.seamAssimilation > mote.seamAssimilation ? 5.6 : 2.4, cappedDt)
      mote.elasticMemory = damp(mote.elasticMemory, materialResponse.elasticMemory, materialResponse.elasticMemory > mote.elasticMemory ? 7.0 : 3.0, cappedDt)
      mote.strandTension = damp(mote.strandTension, materialResponse.strandTension, materialResponse.strandTension > mote.strandTension ? 7.0 : 2.8, cappedDt)
      mote.reemergeCharge = damp(mote.reemergeCharge, easySuction.growthWake * 0.18, 1.55, cappedDt)
      if (materialResponse.returnBloom > 0.04) {
        mote.colorBloom = Math.max(mote.colorBloom, materialResponse.returnBloom * 0.36)
      }
      pile.targetChroma += (mote.materialWake * 0.14 + mote.seamAssimilation * 0.08) * visibleProgress
      pile.absorbedMass = Math.min(3, pile.absorbedMass + mote.intakeFeed * mote.mass * visibleProgress * cappedDt * (0.22 + mote.slurpPressure * 0.18 + mote.contactFeed * 0.1 + easySuction.feedBoost * 0.08))
      mote.absorb = damp(mote.absorb, mote.absorbTarget, mote.absorbTarget > mote.absorb ? 5.6 : 2.6, cappedDt)
	      const absorptionMassTarget = 1 - smooth01(mote.absorb) * 0.72
	      const cleanupDrainGate = finalCleanupPull
	        * smooth01((FIRST_LEVEL_TUNING.finalCleanupSwallowRadius - distance) / Math.max(0.001, FIRST_LEVEL_TUNING.finalCleanupSwallowRadius))
	        * (mote.latched > 0.5 || state.levelCompletionTriggered ? 1 : 0.42)
	      const cleanupMassTarget = cleanupDrainGate > 0.02
	        ? Math.max(0.02, 1 - cleanupDrainGate * FIRST_LEVEL_TUNING.finalCleanupMassDrain * getLevelDifficultyConfig(state.levelDifficulty).finalCleanupMultiplier)
	        : 1
	      const completionWinDrain = computeCompletionWinDrain(state)
	      const completionWinMassTarget = completionWinDrain > 0
	        ? Math.max(0.005, 1 - completionWinDrain * 1.08)
	        : 1
	      const intakeMassTarget = mote.latched > 0.5
	        ? Math.max(0.035, 1 - mote.intakeFeed * (0.52 + mote.intakeFlow * 0.18 + mote.glugPulse * 0.16 + mote.slurp * 0.12 + mote.slurpPressure * 0.14 + mote.contactFeed * 0.18 + mote.contactRope * 0.1) - mote.attachmentMassTransferred * (0.46 + mote.sealQuality * 0.18 + mote.flowBridge * 0.12) - mote.completionCleanup * 0.42 - mote.completionFinalGlug * 0.2)
	        : 1
      const visibleSlimeRelativeDrainScale = PRODUCTION_TUNING.suction.visibleSlimeRelativeDrainScale
      const looseFragmentMassTarget = !hoseBlowActive && looseFragmentIntake.active && mote.latched < 0.5
        ? Math.max(
          PRODUCTION_TUNING.suction.slimeResidueIntakeTargetFloor,
          mote.visibleMass * (1 - looseFragmentIntake.massDrain * visibleSlimeRelativeDrainScale),
        )
        : 1
      const visibleResidueMassTarget = !hoseBlowActive
        && mote.latched < 0.5
        && (visibleSlimeVacuumability.mouthPull > 0.01 || residueAutoCleanupActive)
        ? Math.max(
          residueAutoCleanupActive ? 0 : PRODUCTION_TUNING.suction.slimeResidueIntakeTargetFloor,
          mote.visibleMass * (1 - visibleSlimeVacuumability.massDrain * visibleSlimeRelativeDrainScale),
        )
        : 1
      const naturalVisibleMassTarget = Math.min(
        absorptionMassTarget,
        intakeMassTarget,
        cleanupMassTarget,
        looseFragmentMassTarget,
        visibleResidueMassTarget,
        completionWinMassTarget,
      )
      const visibleMassDrainActive = mote.absorbTarget > 0.05
        || mote.intakeFeed > 0.03
        || mote.attachmentMassTransferred > 0.01
        || easySuction.feedBoost > 0.1
        || cleanupDrainGate > 0.02
        || completionWinDrain > 0.01
        || (!hoseBlowActive && looseFragmentIntake.active)
        || visibleSlimeVacuumability.mouthPull > 0.01
        || residueAutoCleanupActive
      const tideVisibleMassTarget = tideEmergenceTarget > 0
        ? Math.max(tideEmergenceTarget, mote.growthTarget)
        : 0
      const visibleMassTarget = state.levelDefeatTriggered
        ? Math.max(naturalVisibleMassTarget, tideVisibleMassTarget)
        : overgrowthTideMote
          ? (visibleMassDrainActive ? Math.min(naturalVisibleMassTarget, tideVisibleMassTarget) : tideVisibleMassTarget)
          : visibleMassDrainActive
          ? naturalVisibleMassTarget
          : Math.max(naturalVisibleMassTarget, tideVisibleMassTarget)
      mote.visibleMass = damp(
        mote.visibleMass,
        visibleMassTarget,
        visibleMassDrainActive ? 5.4 + mote.completionFinalGlug * 3.2 + mote.completionCleanup * 1.6 + easySuction.feedBoost * 2.2 + mote.glugPulse * 2.4 + cleanupDrainGate * 6.0 + completionWinDrain * 9.5 + looseFragmentIntake.massDrain * 5.6 + visibleSlimeVacuumability.massDrain * 5.8 : 2.4,
        cappedDt,
      )
	      if (isFirstLevelMode(state.devMode) && state.levelCompletionTriggered && completionWinDrain > 0.92 && mote.visibleMass < 0.045) {
	        clearMoteForFirstLevel(mote, state)
	      }
      if (residueAutoCleanupActive && mote.visibleMass < PRODUCTION_TUNING.suction.slimeVacuumableVisibleThreshold) {
        if (isFirstLevelMode(state.devMode)) {
          clearMoteForFirstLevel(mote, state)
        } else {
          mote.mass = 0
          mote.visibleMass = 0
          mote.popAge = -999
        }
      }
      const visibleSlimeHasResponse = contactEligible
        || mote.latched > 0.5
        || looseFragmentIntake.active
        || visibleSlimeVacuumability.mouthPull > 0.01
        || finalCleanupPull > 0.01
        || tactileBrush > 0.08
        || easySuction.pullBoost > 0.025
      if (visibleSlimeVacuumability.residue && mote.levelCleared < 0.5 && !visibleSlimeHasResponse) {
        mote.stuckResidueAge += cappedDt
      } else {
        mote.stuckResidueAge = Math.max(0, mote.stuckResidueAge - cappedDt * 2.4)
      }
      mote.edgeWobble = Math.min(
        1.45,
        Math.max(mote.edgeWobble, moteSpeed * 0.34 + mote.stretchMemory * 0.22 + mote.mergeHeat * 0.28 + mote.contraction * 0.2 + mote.intakeRecoil * 0.28 + mote.glugPulse * 0.18 + mote.completionFinalGlug * 0.22 + mote.completionFinalStrand * 0.16 + mote.snapBondRecoil * 0.2 + mote.contactReadiness * 0.16 + mote.contactSnap * 0.22 + mote.rimGrip * 0.16 + mote.organicHold * 0.18),
      )
      mote.strain = damp(
        mote.strain,
        Math.min(
          1,
          mote.mergeTarget * 0.58
            + mote.velocity.length() * 0.07
            + captureLift * 0.28
            + easySuction.pullBoost * 0.18
            + easySuction.feedBoost * 0.14
            + latchSeal * 0.26
            + mote.stretchMemory * 0.34
            + mote.contraction * 0.18
            + mote.intakeFunnel * 0.16
            + mote.intakeFlow * 0.2
            + mote.contactDent * 0.12
            + mote.contactRope * 0.16
	            + mote.contactFeed * 0.18
	            + mote.flowBridge * 0.22
	            + mote.sealQuality * 0.18
	            + mote.mouthMagnetism * 0.14
            + mote.slurpPressure * 0.16
            + mote.glugPulse * 0.16
            + mote.completionNearEmpty * 0.12
            + mote.completionFinalStrand * 0.16
            + mote.snapBondStrain * 0.18,
        ),
        7.6,
        cappedDt,
      )
      mote.jelly = damp(
        mote.jelly,
        Math.min(1.65, force.influence * 0.86 + moteSpeed * 0.1 + mote.edgeWobble * 0.24 + state.flash * 0.18 + latchSeal * 0.3 + mote.contactReadiness * 0.08 + mote.contactFeed * 0.12 + mote.completionFinalGlug * 0.12 + mote.organicHold * 0.16 + mote.slurpPressure * 0.12 + easySuction.pullBoost * 0.14 + easySuction.feedBoost * 0.1),
        5.8,
        cappedDt,
      )
      mote.floorStick = damp(mote.floorStick, floorGrip, 7.4, cappedDt)

      const swallowDistance = mote.position.distanceTo(mouth)
      const nearEmptyReady = mote.visibleMass < 0.36 && (mote.completionNearEmpty > 0.12 || mote.intakeFeed > 0.82)
      const cleanupSwallowReady = finalCleanupPull > 0.58
        && (distance < FIRST_LEVEL_TUNING.finalCleanupSwallowRadius || state.levelCompletionTriggered)
        && mote.visibleMass < (state.levelCompletionTriggered ? 0.72 : 0.52)
	      const finalPayoffReady = mote.completionFinalGlug > 0.42 || cleanupSwallowReady || (nearEmptyReady && (mote.completionFinalStrand > 0.1 || intakeSwallowReady))
	      const closeDrained = mote.latchAge > 1.25 && swallowDistance < 0.56 && mote.visibleMass < 0.44
	      const latchSwallowed = mote.latched > 0.5 && (finalPayoffReady || (mote.slurp >= 1 && nearEmptyReady) || closeDrained)
	      const looseFragmentSwallowed = mote.latched < 0.5
	        && looseFragmentIntake.swallowReady
	        && swallowDistance < PRODUCTION_TUNING.suction.looseFragmentSwallowRadius * 1.22
	        && (mote.visibleMass < 0.62 || looseFragmentIntake.swallowProximity > 0.78)
      const visibleResidueSwallowed = mote.latched < 0.5
        && visibleSlimeVacuumability.swallowReady
        && (visibleSlimeVacuumability.fragment || visibleSlimeVacuumability.residue || mote.visibleMass < 0.72 || mote.mass < 0.55)
        && swallowDistance < PRODUCTION_TUNING.suction.slimeResidueMouthPopRadius * 0.72
      const looseLikeSwallowed = looseFragmentSwallowed || visibleResidueSwallowed
      const looseLikeFeed = Math.max(looseFragmentIntake.feed, visibleSlimeVacuumability.feed)
      const looseLikeMassDrain = Math.max(looseFragmentIntake.massDrain, visibleSlimeVacuumability.massDrain)
      const looseLikeBridge = Math.max(looseFragmentIntake.bridge, visibleSlimeVacuumability.feed * 0.28)
	      const outOfArena = isOutsideArena(mote.position, ARENA_RESPAWN_RADIUS)
	      const mouthSwallowed = latchSwallowed || looseLikeSwallowed

	      if (mouthSwallowed || outOfArena) {
	        const completionPulse = latchSwallowed
	          ? Math.max(0.44, mote.completionFinalGlug, mote.completionNearEmpty * 0.68)
	          : looseLikeSwallowed
	            ? Math.max(0.16, looseLikeFeed * 0.42)
	          : 0
	        const completionCleanup = latchSwallowed
	          ? Math.max(mote.completionCleanup, completionPulse * 0.72)
	          : looseLikeSwallowed
	            ? looseLikeMassDrain * 0.34
	          : 0
	        const completionBagReward = latchSwallowed
	          ? Math.min(1.55, mote.completionFinalGlug * 0.72 + mote.completionFinalStrand * 0.28 + completionCleanup * 0.18)
	          : looseLikeSwallowed
	            ? Math.min(0.55, looseLikeFeed * 0.42 + looseLikeMassDrain * 0.22)
	          : 0
	        const residue = residues[residueCursor.current % residues.length]
	        residueCursor.current += 1
	        residue.position.copy(mote.position).lerp(mouthSwallowed ? mouth : mote.sealPoint, latchSwallowed ? 0.64 + completionCleanup * 0.16 : looseLikeSwallowed ? 0.86 : 0.12)
	        residue.position.y = SLIME_MOTE_FLOOR_Y + 0.021
	        applyReferenceSlimeColor(slimeResidueColor, mote, pile, t, 0.22 + mote.slurp * 0.18 + completionPulse * 0.08, 0.1, 'residue')
	        residue.color.copy(slimeResidueColor).lerp(slimeWarmColor, 0.12 + Math.min(0.28, mote.slurp * 0.12 + completionPulse * 0.1))
	        residue.age = 0
	        residue.life = Math.min(
          latchSwallowed
            ? PRODUCTION_TUNING.suction.visualSlimeEffectMaxLife
            : PRODUCTION_TUNING.suction.visualSlimeResidueMaxLife,
          latchSwallowed
            ? 0.42 + seededNoise(mote.seed + t * 0.31) * 0.28 + (1 - completionCleanup) * 0.34
            : looseLikeSwallowed
              ? 0.14 + seededNoise(mote.seed + t * 0.31) * 0.08
              : 0.28 + seededNoise(mote.seed + t * 0.31) * 0.18,
        )
	        residue.size = mote.size * (latchSwallowed
	          ? (0.72 + mote.slurp * 0.56 + mote.merge * 0.16) * (1 - completionCleanup * 0.28)
	          : looseLikeSwallowed
	            ? (0.2 + Math.max(looseFragmentIntake.flow, visibleSlimeVacuumability.feed) * 0.22)
	          : 0.58 + mote.slurp * 0.32 + mote.merge * 0.12)
	        residue.yaw = Math.atan2(mote.velocity.x + force.inward.x * 0.8, mote.velocity.z + force.inward.z * 0.8)
	        residue.seed = mote.seed + state.swallowCycles * 0.73
	        residue.strength = latchSwallowed
	          ? 0.46 + completionPulse * 0.34 + mote.completionFinalStrand * 0.12
	          : looseLikeSwallowed
	            ? 0.12 + looseLikeFeed * 0.12
	            : 0.38
        if (latchSwallowed) {
          registerSlimeSeal(state, mouth, 1.18 + completionPulse * 0.2, sealCandidate)
        }
        state.swallowCycles += 1
        if (latchSwallowed && mote.completionMetricsRecorded < 0.5) {
          recordFlowFullClear(state.flowMetrics, {
            time: t,
            targetId: i,
            massConsumed: Math.max(mote.attachmentMassTransferred * mote.mass, completionBagReward * 0.04),
          })
          mote.completionMetricsRecorded = 1
	        }
	        const comboReward = latchSwallowed
	          ? registerSlimeComboHit(state, i, mote.pileIndex, mouth, 0.92 + completionPulse * 0.44 + completionBagReward * 0.22)
	          : { active: false, streak: 0, level: 0, massMultiplier: 1, pulseMultiplier: 1 }
	        if (latchSwallowed) state.completionCycles += 1
	        const looseSwallowJuice = looseLikeSwallowed ? 0.34 : 1
	        state.flash = Math.min(1.5, state.flash + (0.28 + mote.slurp * 0.08 + completionPulse * 0.12) * looseSwallowJuice)
	        state.recoil = Math.min(1.5, state.recoil + (0.2 + mote.slurp * 0.06 + completionPulse * 0.18) * looseSwallowJuice)
	        state.gulpFlow = Math.min(1.95, state.gulpFlow + (0.54 + mote.slurp * 0.1 + completionPulse * 0.28) * looseSwallowJuice)
	        state.gulpAge = 0
	        state.slimeCompletionFinalGlug = Math.max(state.slimeCompletionFinalGlug, completionPulse * (looseLikeSwallowed ? 0.34 : 1))
	        state.slimeCompletionCleanup = Math.max(state.slimeCompletionCleanup, completionCleanup * (looseLikeSwallowed ? 0.34 : 1))
	        state.slimeCompletionChainReady = Math.max(state.slimeCompletionChainReady, mote.completionChainReady, completionPulse * 0.7 * (looseLikeSwallowed ? 0.28 : 1))
	        state.animationCompletion = Math.max(state.animationCompletion, looseLikeSwallowed ? 0.08 + completionPulse * 0.1 : 0.74 + mote.slurp * 0.22 + completionPulse * 0.34 + state.bagFullPulse * 0.18)
	        state.animationBag = Math.max(state.animationBag, looseLikeSwallowed ? 0.12 + completionBagReward * 0.22 : 0.48 + mote.intakeFeed * 0.18 + completionBagReward * 0.38 + state.bagFullPulse * 0.24)
	        state.animationRecoil = Math.max(state.animationRecoil, looseLikeSwallowed ? 0.08 + completionPulse * 0.08 : 0.34 + mote.intakeRecoil * 0.18 + completionPulse * 0.22)
	        state.animationGlug = Math.max(state.animationGlug, looseLikeSwallowed ? looseLikeFeed * 0.18 : Math.max(mote.glugPulse, 0.34 + completionPulse * 0.4) * 0.64)
	        state.animationMouthTug = Math.max(state.animationMouthTug, looseLikeSwallowed ? 0.12 + looseLikeFeed * 0.16 : 0.42 + completionPulse * 0.46)
	        state.animationBodyJolt = Math.max(state.animationBodyJolt, looseLikeSwallowed ? 0.08 + completionPulse * 0.08 : 0.38 + completionPulse * 0.42)
	        state.animationStrandPinch = Math.max(state.animationStrandPinch, looseLikeSwallowed ? looseLikeBridge * 0.16 : 0.44 + mote.completionFinalStrand * 0.46)
	        state.controllerReattachGrace = Math.max(state.controllerReattachGrace, mote.completionChainReady * 0.36 + completionPulse * 0.18)
	        state.controllerReleaseMomentum = Math.max(state.controllerReleaseMomentum, mote.completionChainReady * 0.18)
	        feedBagReward(
	          state,
	          looseLikeSwallowed
	            ? (visibleResidueSwallowed ? PRODUCTION_TUNING.suction.slimeResidueBagMassScale : PRODUCTION_TUNING.suction.looseFragmentBagMassScale) * mote.mass * (0.36 + looseLikeFeed * 0.64)
	            : BAG_REWARD_TUNING.swallowMassScale * (0.42 + mote.visibleMass * 0.24 + mote.intakeFeed * 0.22 + mote.mass * 0.08 + completionBagReward * 0.22) * comboReward.massMultiplier,
	          looseLikeSwallowed
	            ? Math.max(0.08, looseLikeFeed * 0.32)
	            : Math.max(mote.glugPulse, 0.34 + completionPulse * 0.38) * comboReward.pulseMultiplier,
	          looseLikeSwallowed
	            ? Math.max(looseLikeFeed * 0.34, looseLikeMassDrain * 0.22)
	            : Math.max(mote.intakeFeed, mote.contactFeed, 0.42 + mote.completionFinalStrand * 0.28) * comboReward.pulseMultiplier,
	          looseLikeSwallowed ? 0.16 + completionBagReward * 0.16 : (1 + completionBagReward * 0.28) * comboReward.pulseMultiplier,
	          {
	            sealStrength: looseLikeSwallowed ? 0.12 + looseLikeFeed * 0.28 : Math.max(mote.sealQuality, latchSeal),
	            countGlug: latchSwallowed,
	            slimeColor: applyReferenceSlimeColor(bagIntakeColor, mote, pile, t, 0.34 + completionPulse * 0.2, 0.14, 'strand'),
	          },
	        )
        if (isFirstLevelMode(state.devMode)) {
          clearMoteForFirstLevel(mote, state)
        } else {
          spawnMote(mote, state, t + i * 0.13, i)
        }
      }

      const speed = Math.min(1, mote.velocity.length() * 0.18)
      const wobble = Math.sin(t * (4.8 + mote.warmth * 2.4) + mote.seed) * 0.09
      const suctionStretch = Math.max(force.influence * 0.9, captureLift) * (0.45 + ahead * 0.55)
        + latchSeal * (0.42 + mote.slurp * 0.86)
        + mote.glugPulse * 0.24
        + state.hoseSlimeNear * 0.08
        + state.hoseSlimeStretch * 0.16
        + state.hoseSlimeStrain * 0.18
        + state.hoseSlimePop * 0.12
        + mote.snapBondTension * 0.2
        + mote.suctionStrain * 0.32
        + mote.tendril * 0.18
        + mote.intakeDimple * 0.18
        + mote.intakeFunnel * 0.34
        + mote.intakeNeck * 0.24
	      + mote.contactDent * 0.18
	      + mote.contactCompression * 0.18
	      + mote.contactSealRing * 0.12
	      + mote.contactTongue * 0.22
	        + mote.contactRope * 0.24
	        + mote.contactFeed * 0.22
	        + mote.flowBridge * 0.28
	        + mote.sealQuality * 0.14
	        + mote.deepEmbedDepth * 0.36
	        + mote.deepEmbedDimple * 0.18
	        + mote.easySuctionPull * 0.22
        + mote.easySuctionFeed * 0.16
        + mote.mouthMagnetism * 0.18
        + mote.organicHold * 0.12
        + mote.slurpPressure * 0.22
        + mote.completionNearEmpty * 0.18
        + mote.completionFinalStrand * 0.24
        + mote.completionFinalGlug * 0.16
      const massScale = 0.46 + mote.visibleMass * 0.54
      const base = mote.size * (0.72 + mote.mass * 0.28) * massScale
      const popOvershoot = mote.popAge >= 0 && mote.popAge < mote.popDuration
        ? 1 + Math.sin(Math.min(1, mote.popAge / mote.popDuration) * Math.PI) * 0.42
        : 1
      const completionPinch = Math.max(mote.completionFinalStrand, mote.completionFinalGlug * 0.72)
      const swallowPinch = mote.latched > 0.5 ? Math.min(1.35, smooth01((mote.slurp - 0.58) / 0.42) + completionPinch * 0.42) : 0
      const drawScale = visibleProgress * popOvershoot * Math.max(0.04, 1 - swallowPinch * 0.48 - mote.completionCleanup * 0.2)
      const tideBlobGrowth = isFirstLevelMode(state.devMode) && !state.levelCompletionTriggered && mote.levelCleared < 0.5
        ? smooth01(state.levelGunkOvergrowth) * (overgrowthTideMote ? SLIME_TIDE_OVERGROWTH_BLOB_GROWTH : SLIME_TIDE_BASELINE_BLOB_GROWTH)
        : 0
      const localActionGate = clampValue(
        0.12
          + latchSeal * 0.52
          + mote.suctionYield * 0.16
          + mote.intakeFlow * 0.18
          + mote.contactFeed * 0.16
          + state.hoseSlimeTouch * 0.12
          + state.hoseSlimeSeal * 0.16
          + state.hoseSlimeGulp * 0.12
          + state.hoseSlimeStrain * 0.1
          + mote.easySuctionAssist * 0.16
          + mote.easySuctionFeed * 0.14
          + mote.completionNearEmpty * 0.16
          + mote.snapBondTension * 0.14
          + mote.deepEmbedDepth * 0.16
          + mote.visibleMass * 0.08,
        0,
        1.12,
      )
      const actionStretchSquash = state.animationStretch * localActionGate
      const actionSlurpPull = state.animationSlurp * clampValue(localActionGate + mote.slurp * 0.24 + mote.intakeFeed * 0.18 + mote.easySuctionFeed * 0.16, 0, 1.22)
      const actionGlugThump = state.animationGlug * clampValue(0.12 + mote.glugPulse * 0.62 + latchSeal * 0.24 + mote.intakeFeed * 0.18, 0, 1.18)
      const actionSlideSmear = state.animationSlide * clampValue(0.16 + state.hoseHookStrength * 0.24 + latchSeal * 0.24 + mote.floorStick * 0.18, 0, 1.1)
      const actionSnapPop = state.animationSnap * clampValue(0.14 + mote.snapBondStrain * 0.42 + mote.deepEmbedPopPulse * 0.24 + mote.contactSnap * 0.22 + mote.intakeRecoil * 0.14, 0, 1.16)
      const actionRecoilWobble = state.animationRecoil * clampValue(0.16 + mote.intakeRecoil * 0.34 + mote.contraction * 0.2 + mote.edgeWobble * 0.12, 0, 1.14)
      const actionStrandPinch = state.animationStrandPinch * clampValue(0.12 + mote.intakeNeck * 0.34 + mote.contactRope * 0.28 + mote.glugPulse * 0.22 + mote.completionFinalStrand * 0.28 + latchSeal * 0.12, 0, 1.18)
      const actionCompletion = state.animationCompletion * clampValue(0.08 + swallowPinch * 0.42 + mote.intakeFeed * 0.18 + mote.completionFinalGlug * 0.24 + mote.visibleMass * 0.08, 0, 1.08)
      mote.tearCooldown = Math.max(0, mote.tearCooldown - cappedDt)
      const tearTarget = Math.max(0, mote.stretchMemory * 0.55 + mote.suctionStrain * 0.26 + mote.tendril * 0.34 + mote.intakeNeck * 0.34 + mote.contactRope * 0.32 + mote.contactFeed * 0.18 + mote.intakeFlow * 0.2 + latchSeal * 0.42 + mote.suctionYield * 0.24 - mote.surfaceTension * 0.12 - 0.62)
      mote.tearEnergy = damp(mote.tearEnergy, tearTarget, tearTarget > mote.tearEnergy ? 6.5 : 2.5, cappedDt)
      if (mote.latched > 0.5 && (mote.tearEnergy > 0.16 || mote.contactSnap > 0.34) && mote.tearCooldown <= 0 && drawScale > 0.08) {
        const residue = residues[residueCursor.current % residues.length]
        residueCursor.current += 1
        residue.position.copy(mote.position).lerp(mote.sealPoint, 0.58)
        residue.position.y = SLIME_MOTE_FLOOR_Y + 0.019
        applyReferenceSlimeColor(slimeResidueColor, mote, pile, t, 0.34 + mote.tearEnergy * 0.16, 0.11, 'residue')
        residue.color.copy(slimeResidueColor).lerp(slimeWarmColor, 0.12 + Math.min(0.22, mote.tearEnergy * 0.1))
        residue.age = 0
        residue.life = Math.min(
          PRODUCTION_TUNING.suction.visualSlimeEffectMaxLife,
          0.42 + mote.tearEnergy * 0.5 + mote.contactSnap * 0.18,
        )
        residue.size = mote.size * (0.75 + mote.stretchMemory * 0.55 + mote.contactSnap * 0.18)
        residue.yaw = Math.atan2(mote.velocity.x + force.inward.x * 0.55, mote.velocity.z + force.inward.z * 0.55)
        residue.seed = mote.seed + mote.tearCooldown + state.swallowCycles * 0.43
        residue.strength = 0.42 + mote.tearEnergy + mote.contactSnap * 0.24
        mote.tearCooldown = 0.24 + seededNoise(mote.seed + t * 0.23) * 0.18
        mote.stretchMemory *= 0.88
        mote.intakeRecoil = Math.max(mote.intakeRecoil, 0.4 + mote.tearEnergy * 0.24 + mote.contactSnap * 0.22)
        mote.velocity.addScaledVector(force.inward, -(mote.tearEnergy + mote.contactSnap * 0.42) * cappedDt * (0.72 + mote.intakeNeck * 0.48 + mote.contactRope * 0.22))
      }
      const settledSlump = smooth01(mote.settled * 0.82 + mote.coagulate * 0.36)
      const organicOval = 0.82 + seededNoise(mote.seed + 71.4) * 0.44
      const organicSide = 1.06 - (organicOval - 1) * 0.34 + seededNoise(mote.seed + 74.8) * 0.18
      const longScale = base * drawScale * (
        1.18
          + speed * 0.62
          + suctionStretch * 1.12
          + mote.stretchMemory * 0.72
          + mote.merge * 0.48
          + mote.surfaceTension * 0.18
          + mote.strain * 0.2
          + mote.coagulate * 0.24
          + settledSlump * 0.42
          + mote.poolPressure * 0.18
          + mote.intakeFunnel * 0.22
	          + mote.contactTongue * 0.2
	          + mote.contactRope * 0.18
	          + mote.flowBridge * 0.18
	          + mote.deepEmbedDepth * 0.2
	          + mote.glugPulse * 0.12
          + mote.snapBondStrain * 0.14
          + mote.intakeRecoil * 0.12
          + mote.mouthMagnetism * 0.12
          + mote.organicHold * 0.1
          + mote.materialWake * SLIME_MATERIAL_POLISH.wakeToStretch
          + mote.elasticMemory * 0.16
          + mote.strandTension * 0.12
          + mote.livingPulse * 0.2
          + mote.livingFlow * 0.18
          + mote.livingBreak * 0.26
          + mote.edgeWobble * 0.16
          + actionStretchSquash * 0.28
          + actionSlurpPull * 0.34
          + actionGlugThump * 0.12
          + actionSlideSmear * 0.08
          + actionSnapPop * 0.12
          + wobble * 0.26
          - mote.contraction * 0.18
          - mote.compression * 0.08
      ) * organicOval * pooling.spread * (1 + tideBlobGrowth * 0.9)
      const sideScale = base * drawScale * (
        1.0
          + mote.floorStick * 0.24
          + mote.merge * 0.24
          + mote.mound * 0.12
          + settledSlump * 0.32
          + mote.poolPressure * 0.2
          + mote.compression * 0.28
          + mote.contraction * 0.22
          + mote.waxDepth * 0.18
          + mote.seamAssimilation * 0.12
          + mote.livingPulse * 0.14
          + mote.livingCongeal * 0.18
          - mote.livingBreak * 0.06
          + mote.intakeDimple * 0.18
	          + mote.contactDent * 0.16
	          + mote.contactCompression * 0.18
	          + mote.contactSealRing * 0.12
	          + mote.rimGrip * 0.12
          + mote.deepEmbedDimple * 0.16
          + mote.deepEmbedRimOcclusion * 0.1
          + actionGlugThump * 0.08
          + actionRecoilWobble * 0.12
          + actionCompletion * 0.08
          - suctionStretch * 0.14
          - suctionDeformation.thinning * 0.18
          - mote.intakeNeck * 0.16
          - mote.intakeFlow * 0.12
          - mote.glugPulse * 0.08
          - actionSlurpPull * 0.12
          - actionStrandPinch * 0.08
	          - mote.contactRope * 0.14
	          - mote.flowBridge * 0.08
          - mote.contactFeed * 0.08
          - mote.strandTension * 0.08
          - mote.stretchMemory * 0.16
          - wobble * 0.18
      ) * organicSide * (1 + mote.surfaceTension * 0.08) * (1 + tideBlobGrowth * 0.74)
      const heightScale = base * drawScale * (
        0.28
          + captureLift * 1.0
          + mote.jelly * 0.08
          + mote.merge * 0.08
          + mote.mound * 0.58
          + mote.compression * 0.2
          + mote.contraction * 0.14
          + mote.surfaceTension * 0.06
          + mote.waxDepth * 0.1
          + mote.seamAssimilation * 0.04
          + mote.livingPulse * 0.08
          + mote.livingCongeal * 0.14
          - mote.livingBreak * 0.04
          + mote.intakeRecoil * 0.1
          + mote.contactSnap * 0.08
          + mote.rimGrip * 0.06
          + mote.deepEmbedDimple * 0.14
          + mote.deepEmbedPocketPulse * 0.08
          + actionRecoilWobble * 0.16
          + actionSnapPop * 0.12
          + actionCompletion * 0.14
          - speed * 0.07
          - settledSlump * 0.08
          - mote.poolPressure * 0.14
          - mote.stretchMemory * 0.08
          - actionSlurpPull * 0.08
          - suctionDeformation.thinning * 0.08
          - mote.intakeFlow * 0.1
          - mote.contactFeed * 0.08
          - mote.materialWake * 0.04
          - swallowPinch * 0.18
      ) * pooling.height * (1 + tideBlobGrowth * 0.18)
      const yaw = Math.abs(mote.velocity.x) + Math.abs(mote.velocity.z) > 0.001
        ? Math.atan2(mote.velocity.x, mote.velocity.z)
        : Math.atan2(force.inward.x, force.inward.z)
      const activeDeformation = clampValue(suctionStretch * 0.24 + localActionGate * 0.12 + speed * 0.18, 0, 0.58)
      const tideBodyRoundness = clampValue(
        tideBlobGrowth * (overgrowthTideMote ? SLIME_TIDE_BODY_ROUNDNESS_MAX : 0.24) * (1 - activeDeformation),
        0,
        SLIME_TIDE_BODY_ROUNDNESS_MAX,
      )
      const roundedFootprint = Math.sqrt(Math.max(0.0001, longScale * sideScale))
      const tideCoverageScale = overgrowthTideMote
        ? 1 + tideBodyRoundness * SLIME_TIDE_COVERAGE_SCALE_GAIN
        : 1 + tideBodyRoundness * 0.16
      const visualLongScale = (longScale + (roundedFootprint * 1.08 - longScale) * tideBodyRoundness) * tideCoverageScale
      const visualSideScale = (sideScale + (roundedFootprint * 0.98 - sideScale) * tideBodyRoundness) * tideCoverageScale
      const visualHeightScale = heightScale * (1 + tideBodyRoundness * 0.12) * (1 + tideBodyRoundness * 0.08)
      const passiveTideYaw = seededNoise(mote.seed + 91.3) * Math.PI * 2
        + Math.sin(t * 0.18 + mote.seed) * SLIME_ACCENT_MAX_YAW_WOBBLE
      const visualYaw = yaw + (passiveTideYaw - yaw) * tideBodyRoundness
      const drawY = Math.max(SLIME_MOTE_FLOOR_Y + visualHeightScale * 0.82, mote.position.y)
      applyReferenceSlimeColor(slimeBodyColor, mote, pile, t, 0, 0.0, 'body')
      applyReferenceSlimeColor(slimeRimColor, mote, pile, t, 0.12, 0.14, 'rim')
      applyReferenceSlimeColor(slimeCapColor, mote, pile, t, 0.34 + Math.sin(t * 0.16 + mote.seed) * 0.025, 0.02, 'cap')
      slimeCapColor.lerp(slimeBodyColor, 0.28)

      tempObject.position.set(mote.position.x, SLIME_MOTE_SHADOW_Y, mote.position.z)
      tempObject.rotation.set(-Math.PI / 2, 0, visualYaw)
      tempObject.scale.set(visualLongScale * (1.05 + mote.floorStick * 0.18 + mote.merge * 0.18), visualSideScale * (0.95 + mote.floorStick * 0.16 + mote.merge * 0.12), 1)
      tempObject.updateMatrix()
      shadowTarget.setMatrixAt(i, tempObject.matrix)

      if (mote.popAge >= 0 && mote.popAge < mote.popDuration * 1.2) {
        const popFlash = Math.sin(Math.min(1, mote.popAge / (mote.popDuration * 1.2)) * Math.PI)
        tempObject.position.set(mote.home.x, SLIME_MOTE_FLOOR_Y + 0.03, mote.home.z)
        tempObject.rotation.set(-Math.PI / 2, 0, mote.seed)
        tempObject.scale.set(base * (1.1 + popProgress * 3.0), base * (0.42 + popFlash * 0.82), 1)
      } else if (mote.deepEmbedPopPulse > 0.035 || mote.deepEmbedFleckBurst > 0.035) {
        const popStrength = Math.max(mote.deepEmbedPopPulse, mote.deepEmbedFleckBurst)
        tempObject.position.copy(mote.sealPoint)
        tempObject.position.y = SLIME_MOTE_FLOOR_Y + 0.04
        tempObject.rotation.set(-Math.PI / 2, 0, yaw + Math.sin(t * 7.2 + mote.seed) * 0.18)
        tempObject.scale.set(
          base * (1.05 + popStrength * 2.2 + mote.deepEmbedDepth * 0.6),
          base * (0.24 + popStrength * 0.72),
          1,
        )
      } else {
        tempObject.position.set(0, -40, 0)
        tempObject.rotation.set(0, 0, 0)
        tempObject.scale.setScalar(0.001)
      }
      tempObject.updateMatrix()
      popRingTarget.setMatrixAt(i, tempObject.matrix)
      popRingTarget.setColorAt(i, slimeRimColor)

      const anchorDx = mote.position.x - mote.anchor.x
      const anchorDz = mote.position.z - mote.anchor.z
      const anchorLength = Math.hypot(anchorDx, anchorDz)
      if (anchorLength > 0.018 && mote.floorStick > 0.22) {
        tempObject.position.set((mote.position.x + mote.anchor.x) * 0.5, SLIME_MOTE_FLOOR_Y + 0.014, (mote.position.z + mote.anchor.z) * 0.5)
        tempObject.rotation.set(-Math.PI / 2, 0, Math.atan2(anchorDx, anchorDz))
        tempObject.scale.set(
          anchorLength * (0.56 + mote.merge * 0.2 + mote.surfaceTension * 0.12 + mote.stretchMemory * 0.18 + mote.suctionStrain * 0.06 + actionSlideSmear * 0.08),
          base * (0.2 + mote.floorStick * 0.1 + mote.merge * 0.07 + mote.poolPressure * 0.06 + mote.contraction * 0.05 + actionRecoilWobble * 0.025),
          1,
        )
      } else {
        tempObject.position.set(0, -40, 0)
        tempObject.rotation.set(0, 0, 0)
        tempObject.scale.setScalar(0.001)
      }
      tempObject.updateMatrix()
      anchorSmearTarget.setMatrixAt(i, tempObject.matrix)
      applyReferenceSlimeColor(slimeAccentColor, mote, pile, t, 0.08, -0.04, 'anchor')
      anchorSmearTarget.setColorAt(i, slimeAccentColor)

	      const approachBridgeVisual = !mouthBridgePhysicallyConnected && mote.latched < 0.5
	        ? clampValue(
	          mote.flowBridge * 0.86
	            + mote.contactTongue * 0.34
	            + mote.tendril * 0.22
	            + mote.intakeFunnel * 0.18,
	          0,
	          1.05,
	        )
	        : 0
	      const strandBridgeConnected = mouthBridgePhysicallyConnected && (
	        stickyAnchorActive
	          || stickyAnchorReleaseActive
	          || mote.latched > 0.5
	          || state.sealTargetMoteId === i
	          || mote.deepEmbedDepth > 0.035
	          || mote.glugPulse > 0.12
	          || mote.intakeFeed > 0.72
	      )
	      const bridgeActivity = strandBridgeConnected ? Math.max(latchSeal, mote.flowBridge) : 0
	      if (bridgeActivity > 0.045 && drawScale > 0.02) {
	        slurpStrandVector.copy(mouth).addScaledVector(forward, -0.075).sub(mote.sealPoint)
	        const strandLength = slurpStrandVector.length()
	        if (strandLength > 0.035 && strandLength < PRODUCTION_TUNING.suction.flowBridgeMaxLength) {
	          slurpStrandMidVector.copy(mote.sealPoint).addScaledVector(slurpStrandVector, 0.5)
	          slurpStrandVector.normalize()
	          tempObject.position.copy(slurpStrandMidVector)
	          tempObject.quaternion.setFromUnitVectors(strandAxis, slurpStrandVector)
	          const tensionPull = Math.min(1.45, state.swingTension * 0.56 + state.hoseHookStrength * 0.18 + mote.snapBondTension * 0.38 + mote.deepEmbedDepth * 0.28 + mote.deepEmbedLockStrength * 0.12 + mote.glugPulse * 0.18 + mote.flowBridgeStrain * 0.24)
	          const glugSqueeze = Math.sin(mote.glugPhase * Math.PI * 2) * 0.5 + 0.5
	          const bridgeNarrow = Math.min(0.78, mote.flowBridgePulse * 0.58 + mote.flowBridgeSurge * 0.22 + mote.sealLeak * 0.22)
	          const bridgeOrganicSignal = Math.min(
	            1.45,
	            bridgeActivity * livingTuning.bridgeOrganicness
	              + mote.livingFlow * 0.16
	              + mote.materialWake * 0.12
	              + mote.glugEventStrength * 0.14,
	          )
	          const bridgeRecoilSignal = Math.min(
	            1.35,
	            mote.flowBridgeBreak * livingTuning.bridgeRecoilStrength
	              + mote.intakeRecoil * 0.14
	              + mote.contactSnap * 0.1
	              + actionRecoilWobble * 0.12,
	          )
	          const strandPulse = 1
	            + Math.sin(t * 10.5 + mote.seed) * 0.08 * bridgeActivity
	            + Math.sin(t * 5.8 + mote.seed * 0.37) * 0.035 * tensionPull
	            + Math.sin(t * 3.1 + mote.seed * 1.71) * bridgeOrganicSignal * 0.055
	            + glugSqueeze * (mote.glugPulse * 0.1 + mote.glugEventStrength * 0.12 + actionGlugThump * 0.08 + mote.completionFinalGlug * 0.08)
	            + actionSnapPop * 0.05
	            + mote.flowBridgeBreak * 0.08
	          const strandRadius = base
	            * drawScale
	            * (0.26 + bridgeActivity * 0.2 + mote.flowBridgeThickness * 0.42 + mote.deepEmbedDepth * 0.11 + mote.slurp * 0.08 + mote.suctionYield * 0.05 + mote.surfaceTension * 0.035 + mote.rimGrip * 0.045 + mote.contactLipSeal * 0.04)
	            * (1 + bridgeOrganicSignal * 0.18 + bridgeRecoilSignal * 0.04)
	            * (1 - swallowPinch * 0.34)
	            * (1 - tensionPull * 0.16)
	            * (1 - mote.glugPulse * 0.12)
	            * (1 - actionStrandPinch * 0.14)
	            * (1 - bridgeNarrow * 0.28)
	            * (1 - mote.snapBondUnstable * 0.18)
	            * (1 - mote.stretchMemory * 0.08)
	            * (1 - mote.tendril * 0.12)
            * (1 - mote.strandTension * 0.1)
            * (1 - mote.slurpPressure * 0.08)
            * (1 - mote.contactRope * 0.16)
            * (1 - mote.contactFeed * 0.1)
            * (1 - mote.completionFinalStrand * 0.18)
            * (1 - mote.completionFinalGlug * 0.12)
	          const displayedStrandLength = Math.min(
	            strandLength * (0.82 + bridgeActivity * 0.08 + mote.slurp * 0.18 + tensionPull * 0.08 + mote.deepEmbedDepth * 0.12 + mote.glugPulse * 0.12 + mote.flowBridgeSurge * 0.16 + bridgeOrganicSignal * 0.08 + bridgeRecoilSignal * 0.06 + actionSlurpPull * 0.16 + actionGlugThump * 0.08 + mote.completionFinalStrand * 0.14 + mote.completionFinalGlug * 0.08 + mote.snapBondStrain * 0.08 + actionSnapPop * 0.06 + mote.flowBridgeBreak * 0.1 + mote.stretchMemory * 0.08 + mote.tendril * 0.14 + mote.strandTension * 0.12 + mote.contactRope * 0.16 + mote.contactFeed * 0.12 + mote.organicHold * 0.06),
	            state.suctionState === 'sealed' && stickyAnchorActive ? 3.05 : 1.75,
	          )
	          tempObject.scale.set(
	            strandRadius * strandPulse,
	            displayedStrandLength,
	            strandRadius * (0.7 + mote.jelly * 0.05 + tensionPull * 0.05 + mote.glugPulse * 0.08 + mote.glugEventStrength * 0.07 + bridgeOrganicSignal * 0.08 + bridgeRecoilSignal * 0.06 + actionRecoilWobble * 0.06 + mote.contraction * 0.04 + mote.surfaceTension * 0.04 + mote.contactSnap * 0.05),
	          )
        } else {
          tempObject.position.set(0, -40, 0)
          tempObject.rotation.set(0, 0, 0)
          tempObject.scale.setScalar(0.001)
        }
      } else {
        tempObject.position.set(0, -40, 0)
        tempObject.rotation.set(0, 0, 0)
        tempObject.scale.setScalar(0.001)
      }
      tempObject.updateMatrix()
      slurpStrandTarget.setMatrixAt(i, tempObject.matrix)
	      applyReferenceSlimeColor(slimeAccentColor, mote, pile, t, 0.2 + mote.slurp * 0.22 + mote.flowBridge * 0.05 + mote.glugPulse * 0.04, 0.11 + mote.glugPulse * 0.04, 'strand')
	      slimeAccentColor.lerp(slimeWarmColor, 0.1 + bridgeActivity * 0.14 + mote.glugPulse * 0.12 + mote.completionFinalGlug * 0.16)
      slurpStrandTarget.setColorAt(i, slimeAccentColor)

	      const funnelVisualConnected = mouthBridgePhysicallyConnected || approachBridgeVisual > 0.045
		      if (
		        funnelVisualConnected
		        && Math.max(mote.intakeFunnel, mote.flowBridge * 0.52, mote.deepEmbedDepth * 0.36) > 0.035
		        && drawScale > 0.025
		      ) {
	        intakeFunnelVector.copy(mote.position).lerp(mote.sealPoint, 0.56 + mote.intakeFlow * 0.14 + mote.contactTongue * 0.1)
	        intakeFunnelVector.y = Math.max(SLIME_MOTE_FLOOR_Y + 0.028, mote.position.y * 0.55 + mote.sealPoint.y * 0.45)
        intakePatchVector.copy(mote.sealPoint).sub(mote.position)
        intakePatchVector.y = 0
        const funnelLength = Math.max(0.04, intakePatchVector.length())
        const funnelYaw = funnelLength > 0.001 ? Math.atan2(intakePatchVector.x, intakePatchVector.z) : yaw
        tempObject.position.copy(intakeFunnelVector)
        tempObject.rotation.set(-Math.PI / 2, 0, funnelYaw + Math.sin(t * 7.4 + mote.seed) * mote.intakeRecoil * 0.04)
	        tempObject.scale.set(
		          Math.min(1.12, funnelLength * (0.66 + mote.intakeFunnel * 0.42 + mote.flowBridge * 0.2 + livingTuning.bridgeTaperStrength * mote.flowBridge * 0.08 + mote.deepEmbedDepth * 0.16 + mote.contactTongue * 0.26 + mote.intakeFlow * 0.22 + mote.mouthMagnetism * 0.12 + actionSlurpPull * 0.12)),
		          base * drawScale * (0.26 + mote.intakeDimple * 0.24 + mote.deepEmbedDimple * 0.3 + mote.deepEmbedRimOcclusion * 0.22 + mote.deepEmbedDepth * 0.12 + mote.contactDent * 0.18 + mote.intakeFunnel * 0.26 + mote.flowBridgeThickness * 0.12 + livingTuning.bridgeTaperStrength * mote.contactTongue * 0.08 + mote.glugPulse * 0.12 + actionGlugThump * 0.08 + mote.rimGrip * 0.1 + mote.materialWake * 0.08 - mote.intakeNeck * 0.08 - actionStrandPinch * 0.06 - mote.contactRope * 0.08 - mote.strandTension * 0.06 - mote.slurpPressure * 0.05),
	          1,
	        )
      } else {
        tempObject.position.set(0, -40, 0)
        tempObject.rotation.set(0, 0, 0)
        tempObject.scale.setScalar(0.001)
      }
      tempObject.updateMatrix()
      intakeFunnelTarget.setMatrixAt(i, tempObject.matrix)
      applyReferenceSlimeColor(slimeAccentColor, mote, pile, t, 0.16 + mote.intakeFlow * 0.12, 0.08 + mote.intakeFlow * 0.06, 'strand')
      slimeAccentColor.lerp(slimeWarmColor, 0.12 + mote.intakeFlow * 0.16)
      intakeFunnelTarget.setColorAt(i, slimeAccentColor)

      const pocketEmbedN = smooth01(mote.deepEmbedDepth / Math.max(0.001, PRODUCTION_TUNING.embed.embedDepthMax))
      const stickyAnchorMark = stickyAnchorActive
        ? PRODUCTION_TUNING.suction.stickyAnchorVisualPulse
          + state.anchorTension * 0.42
          + state.anchorSealSnapPulse * 0.36
          + pocketEmbedN * 0.42
        : stickyAnchorReleaseActive
          ? state.anchorPopRing * 0.72
          : 0
      const pocketVisualConnected = mouthBridgePhysicallyConnected || stickyAnchorActive || stickyAnchorReleaseActive
			      if (
			        pocketVisualConnected
			        && Math.max(mote.intakeAdhesion, mote.sealQuality * 0.34, mote.deepEmbedDepth * 0.42, mote.deepEmbedRimOcclusion * 0.36, mote.contactCompression * 0.42, mote.contactSealRing * 0.48, state.hoseSlimeTouch * 0.28, state.hoseSlimeSeal * 0.36, stickyAnchorMark) > 0.035
			        && drawScale > 0.025
			      ) {
	        const anchorPatchSource = stickyAnchorReleaseActive ? state.anchorReleasePoint : mote.sealPoint
	        const pocketMouthBlend = stickyAnchorReleaseActive
	          ? 0.02
		          : clampValue(0.06 + mote.intakeFlow * 0.06 - mote.deepEmbedDepth * 0.045 - mote.deepEmbedRimOcclusion * 0.026 - mote.contactSealRing * 0.018 - stickyAnchorMark * 0.008, 0.006, 0.1)
	        intakePatchVector.copy(anchorPatchSource).lerp(
	          mouth,
	          pocketMouthBlend,
	        )
	        intakePatchVector.y = Math.max(SLIME_MOTE_FLOOR_Y + 0.018, anchorPatchSource.y + 0.002 - mote.deepEmbedDepth * 0.048 - mote.deepEmbedRimOcclusion * 0.014 - stickyAnchorMark * 0.004)
        tempObject.position.copy(intakePatchVector)
	        tempObject.rotation.set(-Math.PI / 2, 0, yaw + Math.sin(t * 8.5 + mote.seed) * (0.04 + mote.intakeNeck * 0.05))
	        tempObject.scale.set(
				          base * drawScale * (0.48 + stickyAnchorMark * 0.42 + mote.intakeAdhesion * 0.34 + mote.sealQuality * 0.12 + mote.deepEmbedDepth * 0.72 + mote.deepEmbedDimple * 0.44 + mote.deepEmbedRimOcclusion * 0.22 + mote.intakeDimple * 0.18 + mote.contactLipSeal * 0.2 + mote.contactDent * 0.18 + mote.contactCompression * 0.3 + mote.contactSealRing * 0.36 + state.hoseSlimeTouch * 0.1 + state.hoseSlimeSeal * 0.16 + state.hoseSlimeStrain * 0.12 + mote.rimGrip * 0.22 + actionSlurpPull * 0.08),
			          base * drawScale * (0.18 + stickyAnchorMark * 0.24 + mote.intakeDimple * 0.18 + mote.deepEmbedRimOcclusion * 0.42 + mote.deepEmbedDimple * 0.18 + mote.intakeNeck * 0.08 + mote.flowBridgeThickness * 0.12 + mote.glugPulse * 0.06 + actionStrandPinch * 0.06 + mote.contactRope * 0.06 + mote.contactCompression * 0.22 + mote.contactSealRing * 0.3 + state.hoseSlimeSeal * 0.1 + state.hoseSlimeGulp * 0.08 + mote.organicHold * 0.1),
	          1,
	        )
      } else {
        tempObject.position.set(0, -40, 0)
        tempObject.rotation.set(0, 0, 0)
        tempObject.scale.setScalar(0.001)
      }
      tempObject.updateMatrix()
      contactPatchTarget.setMatrixAt(i, tempObject.matrix)
      applyReferenceSlimeColor(slimeAccentColor, mote, pile, t, 0.28 + mote.intakeNeck * 0.08, 0.12, 'rim')
      slimeAccentColor.lerp(slimeWarmColor, 0.16 + mote.intakeFlow * 0.18)
      contactPatchTarget.setColorAt(i, slimeAccentColor)

      tempObject.position.set(mote.position.x, SLIME_MOTE_FLOOR_Y + 0.012 + captureLift * 0.13, mote.position.z)
      tempObject.rotation.set(-Math.PI / 2, 0, visualYaw)
      tempObject.scale.set(visualLongScale * (1.08 + mote.elasticMemory * 0.04), visualSideScale * (1.02 + mote.waxDepth * 0.04), 1)
      tempObject.updateMatrix()
      rimTarget.setMatrixAt(i, tempObject.matrix)
      rimTarget.setColorAt(i, slimeRimColor)

      const capCohesion = clampValue(1 - mote.materialWake * 0.08 - mote.intakeFlow * 0.06 + mote.waxDepth * 0.04, 0.72, 1.08)
      tempObject.position.set(
        mote.position.x + Math.sin(mote.seed * 2.1 + mote.elasticMemory * 0.4) * visualLongScale * 0.14,
        drawY + visualHeightScale * (0.5 + mote.waxDepth * 0.035),
        mote.position.z + Math.cos(mote.seed * 1.9 + mote.elasticMemory * 0.3) * visualSideScale * 0.13,
      )
      tempObject.rotation.set(-Math.PI / 2, 0, visualYaw + Math.sin(mote.seed) * 0.32)
      tempObject.scale.set(visualLongScale * (0.12 + mote.warmth * 0.05 + mote.seamAssimilation * 0.018) * capCohesion, visualSideScale * (0.085 + mote.waxDepth * 0.02 + mote.materialWake * 0.012), 1)
      tempObject.updateMatrix()
      capTarget.setMatrixAt(i, tempObject.matrix)
      capTarget.setColorAt(i, slimeCapColor)

      tempObject.position.set(mote.position.x, drawY, mote.position.z)
      tempObject.rotation.set(
        Math.sin(t * 3.1 + mote.seed) * (0.06 * mote.jelly + actionRecoilWobble * 0.025 + actionGlugThump * 0.016),
        visualYaw,
        Math.cos(t * 2.7 + mote.seed) * (0.05 * mote.jelly + actionSnapPop * 0.026 + actionCompletion * 0.018),
      )
      tempObject.scale.set(visualLongScale, visualHeightScale, visualSideScale)
      tempObject.updateMatrix()
      bodyTarget.setMatrixAt(i, tempObject.matrix)
      bodyTarget.setColorAt(i, slimeBodyColor)

      for (let lobe = 0; lobe < SLIME_BODY_LOBES_PER_MOTE; lobe += 1) {
        const lobeSlot = i * SLIME_BODY_LOBES_PER_MOTE + lobe
        if (drawScale < 0.04) {
          tempObject.position.set(0, -40, 0)
          tempObject.rotation.set(0, 0, 0)
          tempObject.scale.setScalar(0.001)
        } else {
          const lobeSeed = mote.seed + lobe * 4.71
          const accentTideGrowth = clampValue(tideBlobGrowth, 0, SLIME_ACCENT_TIDE_GROWTH_LIMIT)
          const lobeAngle = seededNoise(lobeSeed) * Math.PI * 2
            + lobe * Math.PI * 0.73
            + Math.sin(t * (0.22 + mote.edgeWobble * 0.08) + lobeSeed) * (0.026 + mote.edgeWobble * 0.026)
            + Math.sin(t * PRODUCTION_TUNING.livingSlime.flowCycleSpeed * 0.46 + lobeSeed) * mote.livingFlow * SLIME_ACCENT_MAX_YAW_WOBBLE
          const lobeDrift = 0.2
            + seededNoise(lobeSeed + 1.9) * 0.24
            + mote.merge * 0.08
            + mote.mound * 0.08
            + mote.stretchMemory * 0.028
            + mote.livingBreak * 0.08
            + mote.livingCreep * 0.045
            + actionStretchSquash * 0.024
            + actionRecoilWobble * 0.018
            - mote.contraction * 0.035
          const lobeSize = base * drawScale * (
            0.4
              + seededNoise(lobeSeed + 2.6) * 0.22
              + mote.coagulate * 0.08
              + mote.mound * 0.1
              + mote.compression * 0.06
              + mote.poolPressure * 0.05
              + mote.livingPulse * 0.08
              + mote.livingCongeal * 0.09
              + actionRecoilWobble * 0.04
              + actionCompletion * 0.035
              - mote.absorb * 0.08
          ) * (1 + accentTideGrowth * 0.88)
          tempObject.position.set(
            mote.position.x + Math.sin(lobeAngle) * visualLongScale * lobeDrift,
            drawY + visualHeightScale * (0.08 + seededNoise(lobeSeed + 3.4) * 0.13),
            mote.position.z + Math.cos(lobeAngle) * visualSideScale * (0.38 + seededNoise(lobeSeed + 4.1) * 0.18),
          )
          tempObject.rotation.set(
            Math.sin(t * 0.36 + lobeSeed) * 0.035,
            lobeAngle,
            Math.cos(t * 0.32 + lobeSeed) * 0.035,
          )
          tempObject.scale.set(
            lobeSize * (SLIME_BODY_LOBE_MAX_STRETCH + mote.strain * 0.08 + mote.stretchMemory * 0.07 + actionStretchSquash * 0.05 + actionSlurpPull * 0.04 + settledSlump * 0.08),
            lobeSize * (0.58 + mote.jelly * 0.05 + mote.mound * 0.08 + mote.contraction * 0.04 + mote.livingPulse * 0.045 + actionRecoilWobble * 0.035),
            lobeSize * (0.86 + mote.merge * 0.08 + mote.surfaceTension * 0.05 + mote.compression * 0.07 + mote.livingCongeal * 0.05 + actionGlugThump * 0.035 + settledSlump * 0.08),
          )
        }
        tempObject.updateMatrix()
        bodyLobeTarget.setMatrixAt(lobeSlot, tempObject.matrix)
        applyReferenceSlimeColor(slimeAccentColor, mote, pile, t, 0.05 + lobe * 0.06, 0.018, 'body')
        slimeAccentColor.lerp(slimeBodyColor, 0.64)
        bodyLobeTarget.setColorAt(lobeSlot, slimeAccentColor)
      }
    }

    let stretchTotal = 0
    let contractionTotal = 0
    let yieldTotal = 0
    let mergeHeatTotal = 0
    let surfaceTensionTotal = 0
    let poolPressureTotal = 0
    let suctionStrainTotal = 0
    let tendrilTotal = 0
    let livingPulseTotal = 0
    let livingCreepTotal = 0
    let livingCongealTotal = 0
    let livingBreakTotal = 0
    let contactAdhesionTotal = 0
    let contactFunnelTotal = 0
    let contactNeckTotal = 0
	    let contactReadinessTotal = 0
	    let contactDentTotal = 0
	    let contactCompressionTotal = 0
	    let contactSealRingTotal = 0
		    let contactRopeTotal = 0
	    let contactFeedTotal = 0
	    let contactSnapTotal = 0
	    let flowBridgeMax = 0
	    let connectedFlowBridgeTotal = 0
	    let connectedFlowBridgeMax = 0
	    let connectedFlowBridgeLength = 0
	    let connectedFlowBridgeThickness = 0
	    let connectedFlowBridgeStrain = 0
	    let connectedSealQualityMax = 0
	    let connectedMassTransferredMax = 0
	    let connectedCurrentSlimeMass = 0
	    let connectedGlugCountThisAttachment = 0
	    let connectedGlugEventStrength = 0
	    let connectedGlugEventMass = 0
	    let connectedGlugFailedStrength = 0
	    let connectedLastGlugTime = 999
	    let connectedContactFeedTotal = 0
	    let connectedMassFeedTotal = 0
	    let deepEmbedDepthMax = 0
	    let deepEmbedState: DeepSuctionEmbedState = 'searching'
	    let deepEmbedLockStrength = 0
	    let deepEmbedSnapThreshold: number = PRODUCTION_TUNING.embed.embedSnapThreshold
	    let deepEmbedAnglePenalty = 0
	    let deepEmbedTensionPenalty = 0
	    let deepEmbedReleaseReason: DeepSuctionEmbedReleaseReason = 'none'
	    let deepEmbedGlugCount = 0
	    let deepEmbedMassTransferred = 0
	    let deepEmbedPocketPulse = 0
		    let deepEmbedRimOcclusion = 0
		    let deepEmbedFleckBurst = 0
		    let mouthSurfaceDistanceMin = 999
		    let mouthSurfaceCompressionMax = 0
		    let mouthSealRingMax = 0
		    let mouthFloatingWarningMax = 0
	    let snapBondGripTotal = 0
    let snapBondTensionTotal = 0
    let snapBondStrainTotal = 0
    let snapBondBreakTotal = 0
    let intakeFlowTotal = 0
    let massFeedTotal = 0
    let materialWakeTotal = 0
    let materialDepthTotal = 0
    let materialElasticTotal = 0
    let magneticPullTotal = 0
    let organicHoldTotal = 0
    let easySuctionAssistTotal = 0
    let easySuctionPullTotal = 0
    let easySuctionFeedTotal = 0
    let growthWakeTotal = 0
    let slurpPressureTotal = 0
    let completionNearEmptyTotal = 0
    let completionFinalStrandTotal = 0
    let completionFinalGlugTotal = 0
    let completionCleanupTotal = 0
    let completionChainReadyTotal = 0
    let absorbingFragments = 0
    for (let index = 0; index < motes.length; index += 1) {
      const mote = motes[index]
      stretchTotal += mote.stretchMemory
      contractionTotal += mote.contraction
      yieldTotal += mote.suctionYield
      mergeHeatTotal += mote.mergeHeat
      surfaceTensionTotal += mote.surfaceTension
      poolPressureTotal += mote.poolPressure
      suctionStrainTotal += mote.suctionStrain
      tendrilTotal += mote.tendril
      livingPulseTotal += mote.livingPulse
      livingCreepTotal += mote.livingCreep
      livingCongealTotal += mote.livingCongeal
      livingBreakTotal += mote.livingBreak
      contactAdhesionTotal += mote.intakeAdhesion
      contactFunnelTotal += mote.intakeFunnel
      contactNeckTotal += mote.intakeNeck
	      contactReadinessTotal += mote.contactReadiness
	      contactDentTotal += mote.contactDent
	      contactCompressionTotal += mote.contactCompression
	      contactSealRingTotal += mote.contactSealRing
	      contactRopeTotal += mote.contactRope
	      contactFeedTotal += mote.contactFeed
	      contactSnapTotal += mote.contactSnap
	      if (mote.mouthContactConnected > 0.5) {
	        connectedContactFeedTotal += mote.contactFeed
	        connectedMassFeedTotal += mote.intakeFeed
	        connectedFlowBridgeTotal += mote.flowBridge
	        connectedSealQualityMax = Math.max(connectedSealQualityMax, mote.sealQuality)
	        if (mote.flowBridge > connectedFlowBridgeMax) {
	          connectedFlowBridgeMax = mote.flowBridge
	          connectedFlowBridgeLength = mote.flowBridgeLength
	          connectedFlowBridgeThickness = mote.flowBridgeThickness
	          connectedFlowBridgeStrain = mote.flowBridgeStrain
	          connectedMassTransferredMax = mote.attachmentMassTransferred
	          connectedCurrentSlimeMass = mote.mass * mote.visibleMass
	          connectedGlugCountThisAttachment = mote.glugCountThisAttachment
	          connectedGlugEventStrength = mote.glugEventStrength
	          connectedGlugEventMass = mote.glugEventMass
	          connectedGlugFailedStrength = mote.glugFailedStrength
	          connectedLastGlugTime = mote.glugLastAt > -900 ? t - mote.glugLastAt : 999
	        }
	      }
	      if (mote.flowBridge > flowBridgeMax) {
	        flowBridgeMax = mote.flowBridge
	        state.suctionContactPatchPoint.copy(mote.sealPoint)
	      }
		      if (mote.deepEmbedDepth > deepEmbedDepthMax || mote.deepEmbedPopPulse > deepEmbedFleckBurst) {
	        deepEmbedDepthMax = mote.deepEmbedDepth
	        deepEmbedState = mote.deepEmbedState
	        deepEmbedLockStrength = mote.deepEmbedLockStrength
	        deepEmbedSnapThreshold = mote.deepEmbedSnapThreshold
	        deepEmbedAnglePenalty = mote.deepEmbedAnglePenalty
	        deepEmbedTensionPenalty = mote.deepEmbedTensionPenalty
	        deepEmbedReleaseReason = mote.deepEmbedReleaseReason
	        deepEmbedGlugCount = mote.deepEmbedGlugCount
	        deepEmbedMassTransferred = mote.deepEmbedMassTransferred
	        deepEmbedPocketPulse = mote.deepEmbedPocketPulse
	        deepEmbedRimOcclusion = mote.deepEmbedRimOcclusion
		        deepEmbedFleckBurst = Math.max(mote.deepEmbedFleckBurst, mote.deepEmbedPopPulse)
		      }
		      const mouthSurfaceDistance = mote.sealPoint.distanceTo(mouth)
		      const mouthSurfaceHasPhysicalContext = (state.suctionState === 'sealed' && state.sealTargetMoteId === index)
		        || state.suctionState === 'contact'
		        || mote.mouthContactConnected > 0.5
		        || mouthSurfaceDistance < PRODUCTION_TUNING.suction.physicalContactGraceDistance
		        || (mote.latched > 0.5 && mouthSurfaceDistance < PRODUCTION_TUNING.suction.pileSurfaceContactGraceDistance)
		      const mouthSurfaceSignal = mouthSurfaceHasPhysicalContext
		        ? Math.max(
		          mote.contactReadiness,
		          mote.contactCompression,
		          mote.contactSealRing,
		          mote.intakeAdhesion * 0.72,
		          mote.deepEmbedDepth * 0.62,
		        )
		        : 0
		      if (mouthSurfaceSignal > 0.035) {
		        mouthSurfaceDistanceMin = Math.min(mouthSurfaceDistanceMin, mouthSurfaceDistance)
		        mouthSurfaceCompressionMax = Math.max(mouthSurfaceCompressionMax, mote.contactCompression)
		        mouthSealRingMax = Math.max(mouthSealRingMax, mote.contactSealRing)
		        mouthFloatingWarningMax = Math.max(
		          mouthFloatingWarningMax,
		          smooth01(
		            (mouthSurfaceDistance - PRODUCTION_TUNING.suction.mouthFloatingDistanceWarn)
		              / Math.max(0.001, PRODUCTION_TUNING.suction.mouthFloatingDistanceWarn),
		          ) * mouthSurfaceSignal * (1 - Math.min(0.8, mote.contactCompression * 0.42)),
		        )
		      }
	      snapBondGripTotal += mote.snapBondGrip
      snapBondTensionTotal += mote.snapBondTension
      snapBondStrainTotal += mote.snapBondStrain
      snapBondBreakTotal += mote.snapBondBreak
      intakeFlowTotal += mote.intakeFlow
      massFeedTotal += mote.intakeFeed
      materialWakeTotal += mote.materialWake
      materialDepthTotal += mote.waxDepth
      materialElasticTotal += mote.elasticMemory
      magneticPullTotal += mote.mouthMagnetism
      organicHoldTotal += mote.organicHold
      easySuctionAssistTotal += mote.easySuctionAssist
      easySuctionPullTotal += mote.easySuctionPull
      easySuctionFeedTotal += mote.easySuctionFeed
      growthWakeTotal += mote.growthWake
      slurpPressureTotal += mote.slurpPressure
      completionNearEmptyTotal += mote.completionNearEmpty
      completionFinalStrandTotal += mote.completionFinalStrand
      completionFinalGlugTotal += mote.completionFinalGlug
      completionCleanupTotal += mote.completionCleanup
      completionChainReadyTotal += mote.completionChainReady
      if (mote.absorb > 0.08) absorbingFragments += 1
	    }
	    const moteCount = Math.max(1, motes.length)
	    const connectedAvgFlowBridge = connectedFlowBridgeTotal / moteCount
    const averageBlowPush = hoseBlowPushTotal / Math.max(1, hoseBlowAffectedMotes)
    state.hoseBlowPush = damp(
      state.hoseBlowPush,
      hoseBlowActive ? averageBlowPush : 0,
      hoseBlowActive && averageBlowPush > state.hoseBlowPush ? 11.5 : 5.2,
      cappedDt,
    )
    state.hoseBlowAffectedMotes = hoseBlowActive ? hoseBlowAffectedMotes : 0
    state.hoseBlowMaxDistance = damp(
      state.hoseBlowMaxDistance,
      hoseBlowActive ? hoseBlowMaxDistance : 0,
      hoseBlowActive ? 8.4 : 4.2,
      cappedDt,
    )
    state.slimePhysicsStretch = stretchTotal / moteCount
    state.slimePhysicsContraction = contractionTotal / moteCount
    state.slimePhysicsYield = yieldTotal / moteCount
    state.slimePhysicsMergeHeat = mergeHeatTotal / moteCount
    state.slimePhysicsAbsorbing = absorbingFragments
    state.slimePhysicsSurfaceTension = surfaceTensionTotal / moteCount
    state.slimePhysicsPoolPressure = poolPressureTotal / moteCount
    state.slimePhysicsSuctionStrain = suctionStrainTotal / moteCount
    state.slimePhysicsTendrils = tendrilTotal / moteCount
    state.slimeLivingPulse = livingPulseTotal / moteCount
    state.slimeLivingCreep = livingCreepTotal / moteCount
    state.slimeLivingCongeal = livingCongealTotal / moteCount
    state.slimeLivingBreak = livingBreakTotal / moteCount
    state.slimeContactAdhesion = contactAdhesionTotal / moteCount
    state.slimeContactFunnel = contactFunnelTotal / moteCount
    state.slimeContactNeck = contactNeckTotal / moteCount
	    state.slimeContactReadiness = contactReadinessTotal / moteCount
	    state.slimeContactDent = Math.max(contactDentTotal / moteCount, contactCompressionTotal / moteCount * 0.56)
	    const sealedAnchorSurfaceContact = state.suctionState === 'sealed' && state.sealTargetMoteId >= 0
	    const sealedAnchorCompression = sealedAnchorSurfaceContact
	      ? clampValue(
	        0.58
	          + state.anchorTension * 0.24
	          + state.anchorSealSnapPulse * 0.12
	          + deepEmbedDepthMax * 0.22,
	        0.58,
	        0.94,
	      )
	      : 0
	    state.mouthSurfaceDistance = sealedAnchorSurfaceContact ? 0 : mouthSurfaceDistanceMin
	    state.mouthSurfaceCompression = damp(
	      state.mouthSurfaceCompression,
	      Math.max(mouthSurfaceCompressionMax, sealedAnchorCompression),
	      Math.max(mouthSurfaceCompressionMax, sealedAnchorCompression) > state.mouthSurfaceCompression ? 13.6 : 5.6,
	      cappedDt,
	    )
	    state.mouthSealRing = damp(
	      state.mouthSealRing,
	      Math.max(mouthSealRingMax, sealedAnchorSurfaceContact ? 0.66 + state.anchorTension * 0.18 : 0),
	      Math.max(mouthSealRingMax, sealedAnchorSurfaceContact ? 0.66 + state.anchorTension * 0.18 : 0) > state.mouthSealRing ? 13.8 : 5.8,
	      cappedDt,
	    )
	    const mouthFloatingWarningTarget = sealedAnchorSurfaceContact || state.suctionState === 'releasing'
	      ? 0
	      : mouthFloatingWarningMax
	    state.mouthFloatingWarning = damp(
	      state.mouthFloatingWarning,
	      mouthFloatingWarningTarget,
	      mouthFloatingWarningTarget > state.mouthFloatingWarning ? 10.4 : 5.2,
	      cappedDt,
	    )
      const mouthDistanceInsideContactGrace = mouthSurfaceDistanceMin < PRODUCTION_TUNING.suction.physicalContactGraceDistance
      const mouthDistanceInsideFloatingWarn = mouthSurfaceDistanceMin < PRODUCTION_TUNING.suction.mouthFloatingDistanceWarn
      const mouthContactSignalHasPhysicalContext = sealedAnchorSurfaceContact
        || mouthDistanceInsideContactGrace
        || (state.suctionState === 'contact' && mouthDistanceInsideFloatingWarn)
      const mouthPhysicallyTouching = mouthContactSignalHasPhysicalContext && (
        state.mouthSurfaceCompression > 0.12
          || state.mouthSealRing > 0.16
          || state.mouthSurfaceDistance < PRODUCTION_TUNING.suction.physicalContactDistance
      )
      const liveMouthSurfaceSignal = sealedAnchorSurfaceContact
        || mouthDistanceInsideContactGrace
        || (
          mouthContactSignalHasPhysicalContext
          && (
            mouthSurfaceCompressionMax > 0.05
            || mouthSealRingMax > 0.05
            || deepEmbedDepthMax > 0.025
            || flowBridgeMax > 0.08
          )
        )
	    if (sealedAnchorSurfaceContact) {
	      state.suctionContactPatchPoint.copy(state.anchorWorldPosition)
	    }
	    state.mouthSurfaceContactState = sealedAnchorSurfaceContact
	      ? (deepEmbedDepthMax > 0.08 || state.anchorTension > 0.1 || state.mouthSurfaceCompression > 0.62 ? 'embedded' : 'touching')
	      : liveMouthSurfaceSignal && mouthContactSignalHasPhysicalContext && (deepEmbedDepthMax > 0.14 || state.mouthSurfaceCompression > 0.58)
	      ? 'embedded'
	      : liveMouthSurfaceSignal && mouthContactSignalHasPhysicalContext && mouthPhysicallyTouching
	        ? 'touching'
	        : 'floating'
		    state.slimeContactRope = Math.max(contactRopeTotal / moteCount, contactSealRingTotal / moteCount * 0.28)
	    state.slimeContactFeed = contactFeedTotal / moteCount
	    state.slimeContactSnap = contactSnapTotal / moteCount
	    const connectedContactSignal = sealedAnchorSurfaceContact
	      || mouthContactSignalHasPhysicalContext
	      || connectedFlowBridgeMax > 0.05
	    const activeConnectedContactSignal = connectedContactSignal
	      && (state.suctionState === 'contact' || state.suctionState === 'sealed')
	      && state.mouthSurfaceContactState !== 'floating'
	    const activeConnectedFlowBridgeMax = activeConnectedContactSignal ? connectedFlowBridgeMax : 0
	    const activeConnectedFlowBridgeLength = activeConnectedContactSignal ? connectedFlowBridgeLength : 0
	    const activeConnectedFlowBridgeThickness = activeConnectedContactSignal ? connectedFlowBridgeThickness : 0
	    const activeConnectedFlowBridgeStrain = activeConnectedContactSignal ? connectedFlowBridgeStrain : 0
	    const activeConnectedSealQuality = activeConnectedContactSignal ? connectedSealQualityMax : 0
	    state.suctionContactBridgeActive = activeConnectedFlowBridgeMax
	    state.suctionContactBridgeLength = activeConnectedFlowBridgeLength
	    state.suctionContactBridgeThickness = activeConnectedFlowBridgeThickness
	    state.suctionContactSealQuality = activeConnectedSealQuality
	    state.suctionContactMassTransferred = activeConnectedContactSignal ? connectedMassTransferredMax : 0
	    state.suctionContactCurrentMass = activeConnectedContactSignal ? connectedCurrentSlimeMass : 0
	    state.suctionContactBridgeStrain = activeConnectedFlowBridgeStrain
	    state.glugCountThisAttachment = activeConnectedContactSignal ? connectedGlugCountThisAttachment : 0
	    state.glugEventStrength = Math.max(state.glugEventStrength, activeConnectedContactSignal ? connectedGlugEventStrength : 0)
	    state.glugEventMass = Math.max(state.glugEventMass, activeConnectedContactSignal ? connectedGlugEventMass : 0)
	    state.glugFailedStrength = Math.max(state.glugFailedStrength, activeConnectedContactSignal ? connectedGlugFailedStrength : 0)
	    state.glugLastAge = activeConnectedContactSignal ? Math.min(state.glugLastAge, connectedLastGlugTime) : state.glugLastAge
	    state.deepEmbedDepth = Math.max(state.deepEmbedDepth, deepEmbedDepthMax)
	    state.deepEmbedState = deepEmbedDepthMax > 0.02 || deepEmbedState === 'pop-out-snap' ? deepEmbedState : state.deepEmbedState
	    state.deepEmbedLockStrength = Math.max(state.deepEmbedLockStrength, deepEmbedLockStrength)
	    state.deepEmbedSnapThreshold = deepEmbedSnapThreshold
	    state.deepEmbedAnglePenalty = Math.max(state.deepEmbedAnglePenalty, deepEmbedAnglePenalty)
	    state.deepEmbedTensionPenalty = Math.max(state.deepEmbedTensionPenalty, deepEmbedTensionPenalty)
	    if (deepEmbedReleaseReason !== 'none') state.deepEmbedReleaseReason = deepEmbedReleaseReason
	    state.deepEmbedGlugCount = Math.max(state.deepEmbedGlugCount, deepEmbedGlugCount)
	    state.deepEmbedMassTransferred = Math.max(state.deepEmbedMassTransferred, deepEmbedMassTransferred)
	    state.deepEmbedPocketPulse = Math.max(state.deepEmbedPocketPulse, deepEmbedPocketPulse)
	    state.deepEmbedRimOcclusion = Math.max(state.deepEmbedRimOcclusion, deepEmbedRimOcclusion)
	    state.deepEmbedFleckBurst = Math.max(state.deepEmbedFleckBurst, deepEmbedFleckBurst)
	    const hoseSlimeRead = computeHoseSlimeInteractionRead({
	      prePull: Math.max(state.suctionReadiness, state.suctionApproachPull, easySuctionPullTotal / moteCount),
	      surfacePull: Math.max(easySuctionAssistTotal / moteCount, magneticPullTotal / moteCount, state.slimeContactReadiness),
	      contactCompression: activeConnectedContactSignal ? state.mouthSurfaceCompression : 0,
	      sealRing: activeConnectedContactSignal ? state.mouthSealRing : 0,
	      sealStrength: activeConnectedContactSignal ? Math.max(state.slimeSealStrength, state.suctionContactSealQuality) : 0,
	      hookStrength: activeConnectedContactSignal ? state.hoseHookStrength : 0,
	      bridge: activeConnectedContactSignal ? Math.max(state.suctionContactBridgeActive, connectedAvgFlowBridge) : 0,
	      contactFeed: activeConnectedContactSignal ? connectedContactFeedTotal / moteCount : 0,
	      glugPulse: activeConnectedContactSignal ? Math.max(state.glugPulse, state.glugEventStrength) : 0,
	      massFeed: activeConnectedContactSignal ? Math.max(state.glugMassFlow, connectedMassFeedTotal / moteCount) : 0,
	      tension: activeConnectedContactSignal ? Math.max(state.swingTension, state.anchorTension, state.pivotTension) : 0,
	      tetherStrain: activeConnectedContactSignal ? Math.max(state.tetherStrain, snapBondStrainTotal / moteCount) : 0,
	      contactSnap: activeConnectedContactSignal ? Math.max(state.slimeContactSnap, snapBondBreakTotal / moteCount, state.pivotSnapReadiness) : 0,
	      release: Math.max(state.tetherRelease, state.anchorPostReleaseControlTimer, state.deepEmbedFleckBurst),
	      popJuice: Math.max(state.anchorPopJuice, state.snapBreakPulse),
	      embedDepth: activeConnectedContactSignal ? state.deepEmbedDepth : 0,
	    })
	    state.hoseSlimeInteractionPhase = !activeConnectedContactSignal && hoseSlimeRead.phase === 'gulp'
	      ? (hoseSlimeRead.pop > 0.08 ? 'pop' : hoseSlimeRead.near > 0.035 ? 'near' : 'idle')
	      : hoseSlimeRead.phase
	    const hoseSlimeTouchTarget = activeConnectedContactSignal ? hoseSlimeRead.touch : 0
	    const hoseSlimeSealTarget = activeConnectedContactSignal ? hoseSlimeRead.seal : 0
	    const hoseSlimeStretchTarget = activeConnectedContactSignal ? hoseSlimeRead.stretch : 0
	    const hoseSlimeStrainTarget = activeConnectedContactSignal ? hoseSlimeRead.strain : 0
	    state.hoseSlimeNear = damp(state.hoseSlimeNear, hoseSlimeRead.near, hoseSlimeRead.near > state.hoseSlimeNear ? 12.4 : 5.2, cappedDt)
	    state.hoseSlimeTouch = damp(
	      state.hoseSlimeTouch,
	      hoseSlimeTouchTarget,
	      activeConnectedContactSignal && hoseSlimeTouchTarget > state.hoseSlimeTouch ? 13.2 : activeConnectedContactSignal ? 5.6 : 48,
	      cappedDt,
	    )
	    state.hoseSlimeSeal = damp(
	      state.hoseSlimeSeal,
	      hoseSlimeSealTarget,
	      activeConnectedContactSignal && hoseSlimeSealTarget > state.hoseSlimeSeal ? 12.8 : activeConnectedContactSignal ? 5.4 : 48,
	      cappedDt,
	    )
	    state.hoseSlimeStretch = damp(
	      state.hoseSlimeStretch,
	      hoseSlimeStretchTarget,
	      activeConnectedContactSignal && hoseSlimeStretchTarget > state.hoseSlimeStretch ? 9.4 : activeConnectedContactSignal ? 4.6 : 44,
	      cappedDt,
	    )
	    state.hoseSlimeGulp = damp(
	      state.hoseSlimeGulp,
	      activeConnectedContactSignal ? hoseSlimeRead.gulp : 0,
	      activeConnectedContactSignal && hoseSlimeRead.gulp > state.hoseSlimeGulp ? 13.6 : activeConnectedContactSignal ? 6.4 : 60,
	      cappedDt,
	    )
	    state.hoseSlimeStrain = damp(
	      state.hoseSlimeStrain,
	      hoseSlimeStrainTarget,
	      activeConnectedContactSignal && hoseSlimeStrainTarget > state.hoseSlimeStrain ? 11.2 : activeConnectedContactSignal ? 5.2 : 50,
	      cappedDt,
	    )
	    state.hoseSlimePop = damp(state.hoseSlimePop, hoseSlimeRead.pop, hoseSlimeRead.pop > state.hoseSlimePop ? 14.0 : 6.8, cappedDt)
    state.slimeSnapBondGrip = snapBondGripTotal / moteCount
    state.slimeSnapBondTension = snapBondTensionTotal / moteCount
    state.slimeSnapBondStrain = snapBondStrainTotal / moteCount
    state.slimeSnapBondBreak = snapBondBreakTotal / moteCount
    state.slimeIntakeFlow = intakeFlowTotal / moteCount
    state.slimeMassFeed = massFeedTotal / moteCount
    state.slimeMaterialWake = materialWakeTotal / moteCount
    state.slimeMaterialDepth = materialDepthTotal / moteCount
    state.slimeMaterialElastic = materialElasticTotal / moteCount
    state.slimeMagneticPull = magneticPullTotal / moteCount
    state.slimeOrganicHold = organicHoldTotal / moteCount
    state.slimeEasySuctionAssist = easySuctionAssistTotal / moteCount
    state.slimeEasySuctionPull = easySuctionPullTotal / moteCount
    state.slimeEasySuctionFeed = easySuctionFeedTotal / moteCount
    state.slimeGrowthWake = growthWakeTotal / moteCount
    state.slimeVacuumableVisibleCount = slimeVacuumableVisibleCount
    state.slimeVacuumableTinyCount = slimeVacuumableTinyCount
    state.slimeVacuumableStrandedCount = slimeVacuumableStrandedCount
    state.slimeGameplayVisibleMass = slimeGameplayVisibleMass
    state.slimeCompletionNearEmpty = Math.max(state.slimeCompletionNearEmpty, completionNearEmptyTotal / moteCount)
    state.slimeCompletionFinalStrand = Math.max(state.slimeCompletionFinalStrand, completionFinalStrandTotal / moteCount)
    state.slimeCompletionFinalGlug = Math.max(state.slimeCompletionFinalGlug, completionFinalGlugTotal / moteCount)
    state.slimeCompletionCleanup = Math.max(state.slimeCompletionCleanup, completionCleanupTotal / moteCount)
    state.slimeCompletionChainReady = Math.max(state.slimeCompletionChainReady, completionChainReadyTotal / moteCount)
	    const connectedIntakeFlow = activeConnectedContactSignal ? state.slimeIntakeFlow : 0
	    const connectedMassFeed = activeConnectedContactSignal ? state.slimeMassFeed : 0
	    const connectedContactNeck = activeConnectedContactSignal
	      ? Math.max(state.slimeContactNeck, connectedAvgFlowBridge * 0.54, state.deepEmbedDepth * 0.48)
	      : 0
	    const visibleHoseSlurp = computeVisibleHoseSlurp({
	      intakeFlow: connectedIntakeFlow,
	      massFeed: connectedMassFeed,
	      contactNeck: connectedContactNeck,
      slurpPressure: activeConnectedContactSignal ? slurpPressureTotal / moteCount : 0,
      magneticPull: activeConnectedContactSignal ? state.slimeMagneticPull : 0,
      organicHold: activeConnectedContactSignal ? state.slimeOrganicHold : 0,
      gulpFlow: activeConnectedContactSignal
        ? Math.max(state.gulpFlow, state.glugPulse * 0.82 + state.glugMassFlow * 0.28 + state.deepEmbedPocketPulse * 0.24)
        : 0,
      mouthSettle: state.controllerMouthSettle,
    })
    state.slimeHoseFlow = damp(
      state.slimeHoseFlow,
      visibleHoseSlurp.flow,
      visibleHoseSlurp.flow > state.slimeHoseFlow ? 11.5 : 3.2,
      cappedDt,
    )
    state.slimeHoseBolus = damp(
      state.slimeHoseBolus,
      visibleHoseSlurp.bolus,
      visibleHoseSlurp.bolus > state.slimeHoseBolus ? 12.2 : 3.6,
      cappedDt,
    )
    state.slimeHoseBulge = damp(
      state.slimeHoseBulge,
      visibleHoseSlurp.tubeBulge,
      visibleHoseSlurp.tubeBulge > state.slimeHoseBulge ? 10.4 : 4.0,
      cappedDt,
    )
    state.slimeMouthThread = damp(
      state.slimeMouthThread,
      visibleHoseSlurp.mouthThread,
      visibleHoseSlurp.mouthThread > state.slimeMouthThread ? 10.8 : 3.8,
      cappedDt,
    )
	    if (!activeConnectedContactSignal && state.mouthSurfaceContactState === 'floating') {
	      state.mouthSurfaceCompression = Math.min(state.mouthSurfaceCompression, 0.035)
	      state.mouthSealRing = Math.min(state.mouthSealRing, 0.035)
	      state.hoseSlimeTouch = Math.min(state.hoseSlimeTouch, 0.035)
	      state.hoseSlimeSeal = Math.min(state.hoseSlimeSeal, 0.035)
	      state.hoseSlimeStretch = Math.min(state.hoseSlimeStretch, 0.035)
	      state.hoseSlimeGulp = Math.min(state.hoseSlimeGulp, 0.025)
	      state.hoseSlimeStrain = Math.min(state.hoseSlimeStrain, 0.035)
	      state.slimeHoseFlow = Math.min(state.slimeHoseFlow, 0.025)
	      state.slimeHoseBolus = Math.min(state.slimeHoseBolus, 0.025)
	      state.slimeHoseBulge = Math.min(state.slimeHoseBulge, 0.025)
	      state.slimeMouthThread = Math.min(state.slimeMouthThread, 0.025)
	    }
	    const disconnectedFloatingAnimation = !activeConnectedContactSignal && state.mouthSurfaceContactState === 'floating'
	    const completionAnimationSignal = Math.max(
	      state.animationCompletion * 0.72,
	      state.slimeCompletionFinalGlug,
	      state.slimeCompletionCleanup * 0.78,
	      state.levelCompletionPulse * 0.9,
	      state.levelDiscoIntensity * 0.54,
	      state.gulpFlow * smooth01((state.bagFill - 0.72) / 0.52),
	    )
	    const connectedStretchAnimation = activeConnectedContactSignal
	      ? Math.max(
	          state.slimePhysicsStretch,
	          state.slimeSnapBondStrain * 0.82,
	          state.tetherStrain * 0.34,
	          state.pivotHoseStretchRatio * 0.62,
	          state.pivotTension * 0.36,
	          state.hoseSlimeStretch * 0.58,
	          state.hoseSlimeStrain * 0.48,
	        )
	      : Math.max(state.snapBreakPulse * 0.08, state.hoseSlimePop * 0.12)
	    const connectedContractionAnimation = activeConnectedContactSignal
	      ? Math.max(
	          state.slimePhysicsContraction,
	          state.slimeContactSnap * 0.44,
	          state.snapBreakPulse * 0.32,
	          state.hoseSlimeTouch * 0.3,
	          state.hoseSlimePop * 0.46,
	        )
	      : Math.max(state.snapBreakPulse * 0.1, state.hoseSlimePop * 0.16)
	    const connectedSuctionAnimation = activeConnectedContactSignal
	      ? Math.max(
	          state.slimeIntakeFlow,
	          state.slimeMassFeed * 0.82,
	          state.slimeContactFeed * 0.86,
	          state.slimeMagneticPull * 0.72,
	          state.slimeHoseFlow * 0.68,
	          state.hoseSlimeSeal * 0.62,
	          state.deepEmbedDepth * 0.72,
	        )
	      : Math.max(state.hoseSlimeNear * 0.12, state.slimeEasySuctionAssist * 0.035)
	    const connectedGlugAnimation = activeConnectedContactSignal
	      ? Math.max(state.glugPulse, state.slimeHoseBolus * 0.56, state.deepEmbedPocketPulse * 0.64, state.hoseSlimeGulp * 0.74)
	      : 0
	    const connectedMassFlowAnimation = activeConnectedContactSignal
	      ? Math.max(state.glugMassFlow, state.slimeMassFeed * 0.34, state.hoseSlimeGulp * 0.24)
	      : 0
	    const connectedSnapAnimation = Math.max(
	      state.snapBreakPulse * 0.74,
	      state.deepEmbedFleckBurst * 0.64,
	      state.hoseSlimePop * 0.86,
	      activeConnectedContactSignal
	        ? Math.max(
	            state.slimeSnapBondBreak,
	            state.slimeContactSnap * 0.44,
	            state.pivotSnapReadiness * 0.72,
	            state.hoseSlimeStrain * 0.34,
	          )
	        : 0,
	    )
	    const connectedRecoilAnimation = Math.max(
	      state.recoil,
	      state.snapBreakPulse,
	      state.deepEmbedFleckBurst * 0.58,
	      state.animationRecoil * 0.64,
	      state.hoseSlimePop * 0.58,
	      activeConnectedContactSignal ? Math.max(state.slimeContactSnap * 0.52, state.pivotHoseWobble * 0.28) : 0,
	    )
    const cartoonAnimation = computeCartoonActionAnimation({
      stretch: connectedStretchAnimation,
      contraction: connectedContractionAnimation,
      suction: Math.max(connectedSuctionAnimation, completionAnimationSignal * 0.18),
      glugPulse: Math.max(connectedGlugAnimation, completionAnimationSignal * 0.32),
      glugMassFlow: Math.max(connectedMassFlowAnimation, completionAnimationSignal * 0.18),
      slide: Math.max(state.controllerSwingFlow, state.controllerReattachGrace * 0.64, state.controllerWinchPull * 0.28, state.pivotSwingAssist * 0.72),
      snap: connectedSnapAnimation,
      recoil: connectedRecoilAnimation,
      bagFill: state.bagFill,
      bagPulse: Math.max(state.bagPulse, state.bagFullPulse * 0.64),
      bagPressure: state.bagPressure,
	      completion: completionAnimationSignal,
    })
    state.animationAnticipation = damp(
      state.animationAnticipation,
      cartoonAnimation.anticipation,
      cartoonAnimation.anticipation > state.animationAnticipation ? 9.2 : 4.0,
      cappedDt,
    )
    state.animationStretch = damp(
      state.animationStretch,
      cartoonAnimation.stretchSquash,
      cartoonAnimation.stretchSquash > state.animationStretch ? 8.8 : 3.6,
      cappedDt,
    )
    state.animationSlurp = damp(
      state.animationSlurp,
      cartoonAnimation.slurpPull,
      cartoonAnimation.slurpPull > state.animationSlurp ? 9.8 : 4.2,
      cappedDt,
    )
    state.animationGlug = damp(
      state.animationGlug,
      cartoonAnimation.glugThump,
      cartoonAnimation.glugThump > state.animationGlug ? 11.5 : 6.0,
      cappedDt,
    )
    state.animationSlide = damp(
      state.animationSlide,
      cartoonAnimation.slideSmear,
      cartoonAnimation.slideSmear > state.animationSlide ? 8.0 : 4.2,
      cappedDt,
    )
    state.animationSnap = damp(
      state.animationSnap,
      cartoonAnimation.snapPop,
      cartoonAnimation.snapPop > state.animationSnap ? 12.0 : 6.4,
      cappedDt,
    )
    state.animationRecoil = damp(
      state.animationRecoil,
      cartoonAnimation.recoilWobble,
      cartoonAnimation.recoilWobble > state.animationRecoil ? 9.2 : 4.4,
      cappedDt,
    )
    state.animationBag = damp(
      state.animationBag,
      cartoonAnimation.bagOvershoot,
      cartoonAnimation.bagOvershoot > state.animationBag ? 8.6 : 3.6,
      cappedDt,
    )
    state.animationCompletion = damp(
      state.animationCompletion,
      cartoonAnimation.completionFlourish,
      cartoonAnimation.completionFlourish > state.animationCompletion ? 8.2 : 2.8,
      cappedDt,
    )
    state.animationMouthTug = damp(
      state.animationMouthTug,
      cartoonAnimation.mouthTug,
      cartoonAnimation.mouthTug > state.animationMouthTug ? 10.6 : 5.2,
      cappedDt,
    )
    state.animationBodyJolt = damp(
      state.animationBodyJolt,
      cartoonAnimation.bodyJolt,
      cartoonAnimation.bodyJolt > state.animationBodyJolt ? 10.4 : 5.0,
      cappedDt,
    )
    state.animationStrandPinch = damp(
      state.animationStrandPinch,
      cartoonAnimation.strandPinch,
      cartoonAnimation.strandPinch > state.animationStrandPinch ? 10.8 : 5.0,
      cappedDt,
    )
	    if (disconnectedFloatingAnimation) {
	      const nearAllowance = Math.min(0.08, state.hoseSlimeNear * 0.08)
	      const popAllowance = Math.min(0.08, state.hoseSlimePop * 0.08 + state.snapBreakPulse * 0.04)
	      state.animationGlug = Math.min(state.animationGlug, 0.04)
	      state.animationSlurp = Math.min(state.animationSlurp, nearAllowance + popAllowance)
	      state.animationMouthTug = Math.min(state.animationMouthTug, nearAllowance + popAllowance)
	      state.animationStrandPinch = Math.min(state.animationStrandPinch, popAllowance)
	    }
    state.slimeColourActivity = colourActivity
    state.slimeColourOpal = opalStrength
    state.slimeColourPocket = pocketStrength
    state.slimeColourVein = veinStrength
    state.slimeColourDrift = paletteDrift

    shadowTarget.instanceMatrix.needsUpdate = true
    anchorSmearTarget.instanceMatrix.needsUpdate = true
    popRingTarget.instanceMatrix.needsUpdate = true
    slurpStrandTarget.instanceMatrix.needsUpdate = true
    intakeFunnelTarget.instanceMatrix.needsUpdate = true
    contactPatchTarget.instanceMatrix.needsUpdate = true
    rimTarget.instanceMatrix.needsUpdate = true
    capTarget.instanceMatrix.needsUpdate = true
    bodyTarget.instanceMatrix.needsUpdate = true
    bodyLobeTarget.instanceMatrix.needsUpdate = true
    if (anchorSmearTarget.instanceColor) anchorSmearTarget.instanceColor.needsUpdate = true
    if (popRingTarget.instanceColor) popRingTarget.instanceColor.needsUpdate = true
    if (slurpStrandTarget.instanceColor) slurpStrandTarget.instanceColor.needsUpdate = true
    if (intakeFunnelTarget.instanceColor) intakeFunnelTarget.instanceColor.needsUpdate = true
    if (contactPatchTarget.instanceColor) contactPatchTarget.instanceColor.needsUpdate = true
    if (rimTarget.instanceColor) rimTarget.instanceColor.needsUpdate = true
    if (capTarget.instanceColor) capTarget.instanceColor.needsUpdate = true
    if (bodyTarget.instanceColor) bodyTarget.instanceColor.needsUpdate = true
    if (bodyLobeTarget.instanceColor) bodyLobeTarget.instanceColor.needsUpdate = true

    let bridgeIndex = 0
    for (let i = 0; i < motes.length && bridgeIndex < SLIME_MERGE_BRIDGE_COUNT; i += 1) {
      const a = motes[i]
      for (let j = i + 1; j < motes.length && bridgeIndex < SLIME_MERGE_BRIDGE_COUNT; j += 1) {
        const b = motes[j]
        if (a.visibleMass < 0.08 || b.visibleMass < 0.08) continue
        const dx = b.position.x - a.position.x
        const dz = b.position.z - a.position.z
        const planarDistance = Math.max(0.001, Math.hypot(dx, dz))
        const mergeReach = SLIME_MERGE_DISTANCE + (a.size + b.size) * 2.05
        if (planarDistance > mergeReach) continue
        const bridgeStrength = smooth01(1 - planarDistance / mergeReach)
          * Math.min(a.floorStick, b.floorStick)
          * (0.45 + Math.max(a.merge, b.merge) * 0.45 + Math.max(a.mergeHeat, b.mergeHeat) * 0.1)
        if (bridgeStrength < 0.075) continue
        const physicalHeat = Math.max(a.mergeHeat, b.mergeHeat)
        const compression = Math.max(a.compression, b.compression)
        const surfaceTension = Math.max(a.surfaceTension, b.surfaceTension)
        const seamAssimilation = Math.max(a.seamAssimilation, b.seamAssimilation)
        const edge = Math.max(a.edgeWobble, b.edgeWobble)
        const yaw = Math.atan2(dx, dz) + Math.sin(t * 1.1 + a.seed + b.seed) * edge * 0.025
        const stringer = smooth01((0.54 - planarDistance) / 0.54) * (0.42 + bridgeStrength * 0.5 + physicalHeat * 0.08)
        const width = Math.max(0.018, (a.size + b.size) * (0.42 + bridgeStrength * 0.54 + compression * 0.22 + physicalHeat * 0.16 + surfaceTension * 0.1 + seamAssimilation * SLIME_MATERIAL_POLISH.seamToMergeWidth))
        const length = planarDistance * (0.58 + bridgeStrength * 0.2 + surfaceTension * 0.06 - compression * 0.08)
        bridgeMidVector.set((a.position.x + b.position.x) * 0.5, SLIME_MOTE_SHADOW_Y + 0.004, (a.position.z + b.position.z) * 0.5)

        tempObject.position.copy(bridgeMidVector)
        tempObject.rotation.set(-Math.PI / 2, 0, yaw)
        tempObject.scale.set(length * 1.12, width * (1.2 + bridgeStrength * 0.55), 1)
        tempObject.updateMatrix()
        bridgeShadowTarget.setMatrixAt(bridgeIndex, tempObject.matrix)

        tempObject.position.set(bridgeMidVector.x, SLIME_MOTE_FLOOR_Y + 0.024 + bridgeStrength * 0.018 + compression * 0.012, bridgeMidVector.z)
        tempObject.rotation.set(-Math.PI / 2, 0, yaw + Math.sin(t * (1.1 + edge * 0.4) + i + j) * (0.025 + edge * 0.03))
        tempObject.scale.set(length, width * (0.86 + bridgeStrength * 0.48 + compression * 0.18 + surfaceTension * 0.08), 1)
        tempObject.updateMatrix()
        bridgeTarget.setMatrixAt(bridgeIndex, tempObject.matrix)
        applyReferenceSlimeColor(slimeBridgeColor, a, piles[a.pileIndex % piles.length], t, 0.18 + b.pigmentHue * 0.12, 0.06, 'bridge')
        applyReferenceSlimeColor(slimeAccentColor, b, piles[b.pileIndex % piles.length], t, 0.42 + a.pigmentHue * 0.08, 0.08, 'bridge')
        slimeBridgeColor.lerp(slimeAccentColor, 0.36 + bridgeStrength * 0.2)
        slimeBridgeColor.lerp(slimeWarmColor, Math.min(0.2, physicalHeat * 0.08 + compression * 0.08 + surfaceTension * 0.04 + seamAssimilation * 0.04))
        bridgeTarget.setColorAt(bridgeIndex, slimeBridgeColor)

        tempObject.position.set(bridgeMidVector.x, SLIME_MOTE_FLOOR_Y + 0.044 + bridgeStrength * 0.024 + physicalHeat * 0.009, bridgeMidVector.z)
        tempObject.rotation.set(-Math.PI / 2, 0, yaw + Math.sin(t * 1.5 + a.seed) * (0.035 + edge * 0.035))
        tempObject.scale.set(length * (0.72 + stringer * 0.32 + physicalHeat * 0.08 + surfaceTension * 0.06 + seamAssimilation * 0.04), width * (0.14 + stringer * 0.12 + surfaceTension * 0.035), 1)
        tempObject.updateMatrix()
        bridgeStringTarget.setMatrixAt(bridgeIndex, tempObject.matrix)
        slimeAccentColor.copy(slimeBridgeColor).lerp(slimeWarmColor, 0.28 + stringer * 0.18)
        bridgeStringTarget.setColorAt(bridgeIndex, slimeAccentColor)
        bridgeIndex += 1
      }
    }

    for (let index = bridgeIndex; index < SLIME_MERGE_BRIDGE_COUNT; index += 1) {
      tempObject.position.set(0, -40, 0)
      tempObject.rotation.set(0, 0, 0)
      tempObject.scale.setScalar(0.001)
      tempObject.updateMatrix()
      bridgeShadowTarget.setMatrixAt(index, tempObject.matrix)
      bridgeTarget.setMatrixAt(index, tempObject.matrix)
      bridgeStringTarget.setMatrixAt(index, tempObject.matrix)
    }
    bridgeShadowTarget.instanceMatrix.needsUpdate = true
    bridgeTarget.instanceMatrix.needsUpdate = true
    bridgeStringTarget.instanceMatrix.needsUpdate = true
    if (bridgeTarget.instanceColor) bridgeTarget.instanceColor.needsUpdate = true
    if (bridgeStringTarget.instanceColor) bridgeStringTarget.instanceColor.needsUpdate = true

    const levelWinDrain = computeCompletionWinDrain(state)
    const levelWinKeep = Math.max(0.012, 1 - levelWinDrain * 1.18)
    for (let index = 0; index < piles.length; index += 1) {
      const pile = piles[index]
      const tideOvergrowth = isFirstLevelMode(state.devMode)
        ? clampValue(state.levelGunkOvergrowth, 0, 1.45)
        : 0
      const drainedAbsorbedMass = levelWinDrain > 0.01 ? pile.absorbedMass * levelWinKeep : pile.absorbedMass
      pile.mass = damp(pile.mass, pile.targetMass * levelWinKeep, levelWinDrain > 0.01 ? 9.8 : 3.0, cappedDt)
      pile.pulse = damp(
        pile.pulse,
        Math.min(1.45, (pile.targetMass * 0.11 + drainedAbsorbedMass * 0.06) * levelWinKeep + tideOvergrowth * 0.16),
        levelWinDrain > 0.01 ? 9.0 : 3.6,
        cappedDt,
      )
      pile.chroma = damp(
        pile.chroma,
        Math.min(1.15, (pile.targetChroma + drainedAbsorbedMass * 0.08) * levelWinKeep + tideOvergrowth * 0.18),
        levelWinDrain > 0.01 ? 8.4 : 3.4,
        cappedDt,
      )
      const livingBreath = Math.sin(t * PRODUCTION_TUNING.livingSlime.pulseSpeed + pile.seed) * PRODUCTION_TUNING.livingSlime.pileBreathStrength * pile.livingPulse
      const livingFlow = Math.sin(t * PRODUCTION_TUNING.livingSlime.flowCycleSpeed + pile.seed * 0.47) * pile.livingCreep
      const livingCongeal = Math.min(1.4, pile.livingCongeal)
      const livingBreak = Math.min(1.4, pile.livingBreak)
      const mass = Math.max(0, (pile.mass + drainedAbsorbedMass * 0.35) * (1 + tideOvergrowth * 0.52))
      const rootMass = Math.sqrt(mass)
      const radius = 0.2 + rootMass * (0.14 + tideOvergrowth * 0.035)
      const height = Math.min(0.54, 0.055 + rootMass * 0.052 + pile.pulse * 0.012 + livingCongeal * 0.018 + pile.livingPulse * 0.01 + tideOvergrowth * 0.065)
      const asymX = 1.08 + seededNoise(pile.seed + 11.2) * 0.42 + Math.sin(t * 0.31 + pile.seed) * (0.035 + pile.livingPulse * 0.045) + livingBreath * 0.12
      const asymZ = 0.72 + seededNoise(pile.seed + 17.6) * 0.32 + Math.cos(t * 0.27 + pile.seed) * (0.03 + pile.livingPulse * 0.04) - livingBreath * 0.08
      const mouthDistance = pile.center.distanceTo(mouth)
      const suctionLean = smooth01((2.2 - mouthDistance) / 2.2) * state.pulse
      pileLeanVector.copy(mouth).sub(pile.center)
      pileLeanVector.y = 0
      if (pileLeanVector.lengthSq() > 0.0001) pileLeanVector.normalize()

      tempObject.position.set(pile.center.x, SLIME_MOTE_SHADOW_Y + 0.003, pile.center.z)
      tempObject.rotation.set(-Math.PI / 2, 0, Math.sin(t * 0.42 + pile.seed) * (0.12 + pile.livingCreep * 0.08))
      tempObject.scale.set(
        radius * (1.78 + pile.pulse * 0.18 + livingBreak * 0.12 + pile.livingCreep * 0.08 + tideOvergrowth * 0.42) * asymX,
        radius * (1.02 + pile.pulse * 0.1 + livingCongeal * 0.08 - livingBreak * 0.04 + tideOvergrowth * 0.28) * asymZ,
        1,
      )
      tempObject.updateMatrix()
      pileBaseTarget.setMatrixAt(index, tempObject.matrix)

      tempObject.position.set(
        pile.center.x + pileLeanVector.x * suctionLean * 0.055 + Math.sin(t * PRODUCTION_TUNING.livingSlime.flowCycleSpeed + pile.seed) * livingFlow * 0.035,
        SLIME_MOTE_FLOOR_Y + height * (0.88 + livingCongeal * 0.04),
        pile.center.z + pileLeanVector.z * suctionLean * 0.055 + Math.cos(t * PRODUCTION_TUNING.livingSlime.flowCycleSpeed * 0.8 + pile.seed) * livingFlow * 0.035,
      )
      tempObject.rotation.set(
        pileLeanVector.z * suctionLean * 0.22 + Math.sin(t * 0.9 + pile.seed) * (0.025 + pile.livingPulse * 0.025),
        Math.sin(t * 0.4 + pile.seed) * (0.18 + pile.livingCreep * 0.08),
        -pileLeanVector.x * suctionLean * 0.22 + Math.cos(t * 0.82 + pile.seed) * (0.025 + pile.livingPulse * 0.025),
      )
      tempObject.scale.set(
        radius * (0.92 + pile.pulse * 0.08 + livingBreak * 0.1 + pile.livingCreep * 0.04) * asymX,
        height * (0.82 + pile.pulse * 0.1 + livingCongeal * 0.14 + pile.livingPulse * 0.04 + tideOvergrowth * 0.22),
        radius * (0.66 + pile.pulse * 0.08 + livingCongeal * 0.06) * asymZ,
      )
      tempObject.updateMatrix()
      pileMoundTarget.setMatrixAt(index, tempObject.matrix)
      applyPileSlimeColor(slimeMoundColor, pile, t, 0.05, 0.02, 'mound')
      pileMoundTarget.setColorAt(index, slimeMoundColor)
    }
    for (let index = piles.length; index < MAX_SLIME_PILE_CENTER_COUNT; index += 1) {
      tempObject.position.set(0, -40, 0)
      tempObject.rotation.set(0, 0, 0)
      tempObject.scale.setScalar(0.001)
      tempObject.updateMatrix()
      pileBaseTarget.setMatrixAt(index, tempObject.matrix)
      pileMoundTarget.setMatrixAt(index, tempObject.matrix)
    }

    const activePileLobeCount = piles.length * SLIME_PILE_LOBES_PER_CENTER
    for (let index = 0; index < SLIME_PILE_LOBE_COUNT; index += 1) {
      if (index >= activePileLobeCount || piles.length === 0) {
        tempObject.position.set(0, -40, 0)
        tempObject.rotation.set(0, 0, 0)
        tempObject.scale.setScalar(0.001)
        tempObject.updateMatrix()
        pileLobeTarget.setMatrixAt(index, tempObject.matrix)
        continue
      }
      const pileIndex = index % piles.length
      const lobeIndex = Math.floor(index / piles.length)
      const pile = piles[pileIndex]
      const tideOvergrowth = isFirstLevelMode(state.devMode)
        ? clampValue(state.levelGunkOvergrowth, 0, 1.45)
        : 0
      const drainedAbsorbedMass = levelWinDrain > 0.01 ? pile.absorbedMass * levelWinKeep : pile.absorbedMass
      const mass = Math.max(0, (pile.mass + drainedAbsorbedMass * 0.35) * (1 + tideOvergrowth * 0.52))
      if (mass < 0.08) {
        tempObject.position.set(0, -40, 0)
        tempObject.rotation.set(0, 0, 0)
        tempObject.scale.setScalar(0.001)
        tempObject.updateMatrix()
        pileLobeTarget.setMatrixAt(index, tempObject.matrix)
        continue
      }
      const livingCongeal = Math.min(1.4, pile.livingCongeal)
      const livingBreak = Math.min(1.4, pile.livingBreak)
      const livingFlow = Math.min(1.4, pile.livingCreep)
      const accentTideGrowth = clampValue(tideOvergrowth, 0, SLIME_ACCENT_TIDE_GROWTH_LIMIT)
      const baseAngle = seededNoise(pile.seed + lobeIndex * 3.17) * Math.PI * 2
      const angle = baseAngle
        + Math.sin(t * 0.18 + lobeIndex) * (0.018 + pile.livingPulse * 0.018)
        + Math.sin(t * PRODUCTION_TUNING.livingSlime.flowCycleSpeed * 0.52 + pile.seed + lobeIndex) * livingFlow * SLIME_ACCENT_MAX_YAW_WOBBLE
      const rootMass = Math.sqrt(mass)
      const ring = (0.15 + rootMass * (0.088 + accentTideGrowth * 0.012)) * (0.62 + seededNoise(pile.seed + lobeIndex * 4.3) * 0.52 + livingBreak * 0.08 - livingCongeal * 0.06 + accentTideGrowth * 0.08)
      const lobeMass = smooth01((mass - lobeIndex * 0.16) / 1.8)
      const lobeSize = (0.092 + seededNoise(pile.seed + lobeIndex * 5.6) * 0.095) * (0.92 + lobeMass * 0.84 + pile.livingPulse * 0.1 + livingCongeal * 0.08 + accentTideGrowth * 0.24)
      const mouthDistance = pile.center.distanceTo(mouth)
      const suctionLean = smooth01((2.2 - mouthDistance) / 2.2) * state.pulse
      pileLeanVector.copy(mouth).sub(pile.center)
      pileLeanVector.y = 0
      if (pileLeanVector.lengthSq() > 0.0001) pileLeanVector.normalize()
      tempObject.position.set(
        pile.center.x + Math.cos(angle) * ring + pileLeanVector.x * suctionLean * (0.04 + lobeIndex * 0.006),
        SLIME_MOTE_FLOOR_Y + 0.055 + lobeMass * (0.026 + rootMass * 0.012) + Math.sin(t * 1.2 + pile.seed + lobeIndex) * (0.007 + pile.livingPulse * 0.012 + livingCongeal * 0.006),
        pile.center.z + Math.sin(angle) * ring + pileLeanVector.z * suctionLean * (0.04 + lobeIndex * 0.006),
      )
      tempObject.rotation.set(
        Math.sin(t * 0.28 + lobeIndex) * 0.028,
        angle,
        Math.cos(t * 0.24 + pile.seed) * 0.028,
      )
      tempObject.scale.set(
        lobeSize * (SLIME_PILE_LOBE_MAX_STRETCH + seededNoise(pile.seed + lobeIndex * 6.1) * 0.14 + livingBreak * 0.08 + livingFlow * 0.04),
        lobeSize * (0.52 + lobeMass * 0.14 + pile.livingPulse * 0.05 + livingCongeal * 0.05),
        lobeSize * (0.94 + seededNoise(pile.seed + lobeIndex * 7.7) * 0.12 + livingCongeal * 0.08),
      )
      tempObject.updateMatrix()
      pileLobeTarget.setMatrixAt(index, tempObject.matrix)
      applyPileSlimeColor(slimeMoundColor, pile, t, 0.16 + lobeIndex * 0.045, 0.08, 'pileLobe')
      pileLobeTarget.setColorAt(index, slimeMoundColor)
    }

    let activeSlimeResidueEffects = 0
    for (let index = 0; index < residues.length; index += 1) {
      const residue = residues[index]
      if (PRODUCTION_TUNING.suction.visualSlimeResidueEnabled && residue.age < residue.life) {
        activeSlimeResidueEffects += 1
        residue.age += cappedDt
        const progress = Math.min(1, residue.age / residue.life)
        const fade = 1 - smooth01(progress)
        const crawl = Math.sin(t * 1.2 + residue.seed) * 0.018 * fade
        tempObject.position.set(
          residue.position.x + Math.cos(residue.yaw + Math.PI / 2) * crawl,
          SLIME_MOTE_FLOOR_Y + 0.018,
          residue.position.z + Math.sin(residue.yaw + Math.PI / 2) * crawl,
        )
        tempObject.rotation.set(-Math.PI / 2, 0, residue.yaw + Math.sin(t * 0.72 + residue.seed) * 0.08 * fade)
        tempObject.scale.set(
          residue.size * (1.25 + progress * 0.78) * fade,
          residue.size * (0.34 + residue.strength * 0.22 + Math.sin(t * 2.2 + residue.seed) * 0.025) * fade,
          1,
        )
        slimeResidueColor.copy(residue.color).lerp(slimeWarmColor, (0.08 + progress * 0.18) * residue.strength)
      } else {
        tempObject.position.set(0, -40, 0)
        tempObject.rotation.set(0, 0, 0)
        tempObject.scale.setScalar(0.001)
        slimeResidueColor.set('#48d2d7')
      }
      tempObject.updateMatrix()
      residueTarget.setMatrixAt(index, tempObject.matrix)
      residueTarget.setColorAt(index, slimeResidueColor)
    }
    state.slimeVisualEffectResidueCount = activeSlimeResidueEffects

    pileBaseTarget.instanceMatrix.needsUpdate = true
    pileMoundTarget.instanceMatrix.needsUpdate = true
    pileLobeTarget.instanceMatrix.needsUpdate = true
    residueTarget.instanceMatrix.needsUpdate = true
    syncInstancedOutlineMatrices(pileMoundOutlineTarget, pileMoundTarget)
    syncInstancedOutlineMatrices(pileLobeOutlineTarget, pileLobeTarget)
    syncInstancedOutlineMatrices(bodyOutlineTarget, bodyTarget)
    syncInstancedOutlineMatrices(bodyLobeOutlineTarget, bodyLobeTarget)
    syncInstancedOutlineMatrices(bridgeOutlineTarget, bridgeTarget)
    syncInstancedOutlineMatrices(slurpStrandOutlineTarget, slurpStrandTarget)
	    if (pileMoundTarget.instanceColor) pileMoundTarget.instanceColor.needsUpdate = true
	    if (pileLobeTarget.instanceColor) pileLobeTarget.instanceColor.needsUpdate = true
	    if (residueTarget.instanceColor) residueTarget.instanceColor.needsUpdate = true
	    applyFirstLevelRegeneration(state, motes, t, cappedDt)
	    updateFirstLevelProgress(state, motes, t, cappedDt)
	  })

  if (!slimeEnabled) return null

	  return (
    <group>
      <instancedMesh ref={pileBaseMesh} args={[undefined, undefined, MAX_SLIME_PILE_CENTER_COUNT]} renderOrder={24} frustumCulled={false}>
        <circleGeometry args={[1, 28]} />
        <meshBasicMaterial color="#d99cff" transparent opacity={0.14} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={pileMoundOutlineMesh} args={[undefined, undefined, MAX_SLIME_PILE_CENTER_COUNT]} renderOrder={58} frustumCulled={false}>
        <primitive attach="geometry" object={pileMoundGeometry} />
        <primitive attach="material" object={slimeOutlineMaterial} />
      </instancedMesh>
      <instancedMesh ref={pileMoundMesh} args={[undefined, undefined, MAX_SLIME_PILE_CENTER_COUNT]} renderOrder={59} frustumCulled={false}>
        <primitive attach="geometry" object={pileMoundGeometry} />
        <primitive attach="material" object={slimeMoundMaterial} />
      </instancedMesh>
      <instancedMesh ref={pileLobeOutlineMesh} args={[undefined, undefined, SLIME_PILE_LOBE_COUNT]} renderOrder={60} frustumCulled={false}>
        <primitive attach="geometry" object={pileLobeGeometry} />
        <primitive attach="material" object={slimeOutlineMaterial} />
      </instancedMesh>
      <instancedMesh ref={pileLobeMesh} args={[undefined, undefined, SLIME_PILE_LOBE_COUNT]} renderOrder={61} frustumCulled={false}>
        <primitive attach="geometry" object={pileLobeGeometry} />
        <primitive attach="material" object={slimeLobeMaterial} />
      </instancedMesh>
      <instancedMesh ref={shadowMesh} args={[undefined, undefined, MOTE_COUNT]} renderOrder={20} frustumCulled={false}>
        <circleGeometry args={[1, 18]} />
        <meshBasicMaterial color="#b28bea" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={anchorSmearMesh} args={[undefined, undefined, MOTE_COUNT]} renderOrder={58} visible={false} frustumCulled={false}>
        <circleGeometry args={[1, 18]} />
        <meshBasicMaterial color="#63f1ff" vertexColors transparent opacity={0} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={residueMesh} args={[undefined, undefined, SLIME_RESIDUE_COUNT]} renderOrder={57} frustumCulled={false}>
        <circleGeometry args={[1, 18]} />
        <meshBasicMaterial color="#8dfff0" vertexColors transparent opacity={0} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={bridgeShadowMesh} args={[undefined, undefined, SLIME_MERGE_BRIDGE_COUNT]} renderOrder={22} frustumCulled={false}>
        <circleGeometry args={[1, 18]} />
        <meshBasicMaterial color="#ff92da" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={bridgeOutlineMesh} args={[undefined, undefined, SLIME_MERGE_BRIDGE_COUNT]} renderOrder={59} visible={false} frustumCulled={false}>
        <circleGeometry args={[1, 28]} />
        <primitive attach="material" object={slimeFineOutlineMaterial} />
      </instancedMesh>
      <instancedMesh ref={bridgeMesh} args={[undefined, undefined, SLIME_MERGE_BRIDGE_COUNT]} renderOrder={60} frustumCulled={false}>
        <circleGeometry args={[1, 28]} />
        <meshBasicMaterial color="#5fe8f1" vertexColors transparent opacity={0.74} depthWrite={false} toneMapped={false} />
      </instancedMesh>
	      <instancedMesh ref={bridgeStringMesh} args={[undefined, undefined, SLIME_MERGE_BRIDGE_COUNT]} renderOrder={67} visible={false} frustumCulled={false}>
	        <circleGeometry args={[1, 18]} />
	        <meshBasicMaterial color="#e0fff6" vertexColors transparent opacity={0} depthWrite={false} toneMapped={false} />
	      </instancedMesh>
	      <instancedMesh ref={slurpStrandOutlineMesh} args={[undefined, undefined, MOTE_COUNT]} renderOrder={69} visible={false} frustumCulled={false}>
	        <cylinderGeometry args={[1, 1, 1, 10, 1]} />
	        <primitive attach="material" object={slimeFineOutlineMaterial} />
	      </instancedMesh>
	      <instancedMesh ref={slurpStrandMesh} args={[undefined, undefined, MOTE_COUNT]} renderOrder={70} visible={false} frustumCulled={false}>
	        <cylinderGeometry args={[1, 1, 1, 10, 1]} />
	        <meshBasicMaterial color="#ebfff8" vertexColors transparent opacity={0} depthWrite={false} toneMapped={false} />
	      </instancedMesh>
	      <instancedMesh ref={intakeFunnelMesh} args={[undefined, undefined, MOTE_COUNT]} renderOrder={69} frustumCulled={false}>
	        <circleGeometry args={[1, 20]} />
	        <meshBasicMaterial color="#d4fff3" vertexColors transparent opacity={0.48} depthWrite={false} toneMapped={false} />
	      </instancedMesh>
	      <instancedMesh ref={contactPatchMesh} args={[undefined, undefined, MOTE_COUNT]} renderOrder={71} frustumCulled={false}>
	        <circleGeometry args={[1, 18]} />
	        <meshBasicMaterial color="#fff6a9" vertexColors transparent opacity={0.66} depthWrite={false} toneMapped={false} />
	      </instancedMesh>
      <instancedMesh ref={popRingMesh} args={[undefined, undefined, MOTE_COUNT]} renderOrder={68} frustumCulled={false}>
        <torusGeometry args={[1, 0.045, 6, 18]} />
        <meshBasicMaterial color="#b6fff1" vertexColors transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={rimMesh} args={[undefined, undefined, MOTE_COUNT]} renderOrder={62} frustumCulled={false}>
        <torusGeometry args={[1, 0.045, 6, 28]} />
        <meshBasicMaterial color="#c8fff3" vertexColors transparent opacity={0.34} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={bodyOutlineMesh} args={[undefined, undefined, MOTE_COUNT]} renderOrder={63} frustumCulled={false}>
        <primitive attach="geometry" object={bodyGeometry} />
        <primitive attach="material" object={slimeOutlineMaterial} />
      </instancedMesh>
      <instancedMesh ref={bodyMesh} args={[undefined, undefined, MOTE_COUNT]} renderOrder={64} frustumCulled={false}>
        <primitive attach="geometry" object={bodyGeometry} />
        <primitive attach="material" object={slimeBodyMaterial} />
      </instancedMesh>
      <instancedMesh ref={bodyLobeOutlineMesh} args={[undefined, undefined, SLIME_BODY_LOBE_COUNT]} renderOrder={64} frustumCulled={false}>
        <primitive attach="geometry" object={bodyLobeGeometry} />
        <primitive attach="material" object={slimeOutlineMaterial} />
      </instancedMesh>
      <instancedMesh ref={bodyLobeMesh} args={[undefined, undefined, SLIME_BODY_LOBE_COUNT]} renderOrder={65} frustumCulled={false}>
        <primitive attach="geometry" object={bodyLobeGeometry} />
        <primitive attach="material" object={slimeLobeMaterial} />
      </instancedMesh>
      <instancedMesh ref={capMesh} args={[undefined, undefined, MOTE_COUNT]} renderOrder={66} frustumCulled={false}>
        <circleGeometry args={[1, 16]} />
        <primitive attach="material" object={slimeCapMaterial} />
      </instancedMesh>
    </group>
  )
}

function MouthFlash({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const ring = useRef<THREE.Mesh>(null)
  const puff = useRef<THREE.Mesh>(null)

  useFrame(() => {
	    const state = runtime.current
	    rightVector.set(-state.mouthForward.z, 0, state.mouthForward.x).normalize()
		    const mouth = state.mouth
		    const mouthVisualConnected =
		      state.mouthSurfaceContactState !== 'floating' && (state.suctionState === 'contact' || state.suctionState === 'sealed')
		    const visualSlimeContactFeed = mouthVisualConnected ? state.slimeContactFeed : 0
		    const visualSlimeContactSnap = mouthVisualConnected ? state.slimeContactSnap : 0
		    const visualHoseSlimeNear = mouthVisualConnected ? state.hoseSlimeNear : Math.min(state.hoseSlimeNear, 0.18)
		    const visualHoseSlimeTouch = mouthVisualConnected ? state.hoseSlimeTouch : 0
		    const visualHoseSlimeSeal = mouthVisualConnected ? state.hoseSlimeSeal : 0
		    const visualHoseSlimeGulp = mouthVisualConnected ? state.hoseSlimeGulp : 0
		    const visualHoseSlimeStrain = mouthVisualConnected ? state.hoseSlimeStrain : 0
		    const visualDeepEmbedDepth = mouthVisualConnected ? state.deepEmbedDepth : 0
		    const visualDeepEmbedRimOcclusion = mouthVisualConnected ? state.deepEmbedRimOcclusion : 0
		    const visualDeepEmbedPocketPulse = mouthVisualConnected ? state.deepEmbedPocketPulse : 0
		    const visualSlimeIntakeFlow = mouthVisualConnected ? state.slimeIntakeFlow : 0
		    const visualSlimeMagneticPull = mouthVisualConnected ? state.slimeMagneticPull : Math.min(state.slimeMagneticPull, 0.035)
		    const visualSlimeOrganicHold = mouthVisualConnected ? state.slimeOrganicHold : 0
		    const visualSlimeMouthThread = mouthVisualConnected ? state.slimeMouthThread : 0
		    const visualAnimationSlurp = mouthVisualConnected ? state.animationSlurp : Math.min(state.animationSlurp, 0.08)
		    const visualAnimationGlug = mouthVisualConnected ? state.animationGlug : Math.min(state.animationGlug, 0.04)
		    const visualAnimationMouthTug = mouthVisualConnected ? state.animationMouthTug : Math.min(state.animationMouthTug, 0.08)
		    const visualAnimationStrandPinch = mouthVisualConnected ? state.animationStrandPinch : Math.min(state.animationStrandPinch, 0.08)
		    const embedSink = state.deepEmbedDepth * PRODUCTION_TUNING.embed.embedTipSubmergeScale
		    const contactSink = state.mouthSurfaceCompression * 0.055
		      + state.mouthSealRing * 0.026
		      + state.hoseSlimeTouch * 0.026
		      + state.hoseSlimeSeal * 0.018
		      + state.hoseSlimeStrain * 0.014
		    if (ring.current) {
		      ring.current.position.copy(mouth).addScaledVector(state.mouthForward, 0.012 - embedSink * 0.086 - contactSink * 0.44)
		      ring.current.position.y += 0.004 - embedSink * 0.03 - contactSink * 0.3
	      ring.current.rotation.set(Math.PI / 2, 0, -state.yaw)
	      ring.current.scale.setScalar(0.36 + state.flash * 0.34 + state.pulse * 0.045 + state.slimeContactAdhesion * 0.08 + state.slimeContactReadiness * 0.06 + state.slimeContactDent * 0.06 + state.slimeContactRope * 0.08 + state.mouthSurfaceCompression * 0.12 + state.mouthSealRing * 0.14 + visualHoseSlimeNear * 0.06 + visualHoseSlimeTouch * 0.1 + visualHoseSlimeSeal * 0.14 + visualHoseSlimeGulp * 0.08 + visualHoseSlimeStrain * 0.12 + visualDeepEmbedDepth * 0.32 + visualDeepEmbedRimOcclusion * 0.22 + visualSlimeIntakeFlow * 0.1 + visualSlimeMagneticPull * 0.07 + visualSlimeOrganicHold * 0.06 + state.controllerMouthSettle * 0.06 + visualSlimeMouthThread * 0.12 + visualAnimationMouthTug * 0.12 + visualAnimationGlug * 0.08 + state.gripMouthAnticipationCue * 0.12 + state.gripPocketBiteCue * 0.08)
	      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = 0.06 + state.flash * 0.28 + state.slimeContactAdhesion * 0.08 + state.slimeContactReadiness * 0.04 + state.slimeContactRope * 0.06 + visualSlimeContactFeed * 0.06 + state.mouthSurfaceCompression * 0.08 + state.mouthSealRing * 0.1 + visualHoseSlimeNear * 0.035 + visualHoseSlimeTouch * 0.06 + visualHoseSlimeSeal * 0.08 + visualHoseSlimeGulp * 0.05 + visualHoseSlimeStrain * 0.06 + visualDeepEmbedDepth * 0.12 + visualDeepEmbedRimOcclusion * 0.08 + visualDeepEmbedPocketPulse * 0.05 + visualSlimeIntakeFlow * 0.1 + visualSlimeMagneticPull * 0.05 + visualSlimeOrganicHold * 0.04 + state.controllerMouthSettle * 0.04 + visualSlimeMouthThread * 0.1 + visualAnimationMouthTug * 0.08 + state.gripMouthAnticipationCue * 0.08
	    }
		    if (puff.current) {
		      puff.current.position.copy(mouth).addScaledVector(state.mouthForward, 0.052 - embedSink * 0.105 - contactSink * 0.32)
		      puff.current.position.y += 0.014 - embedSink * 0.028 - contactSink * 0.22
	      puff.current.rotation.set(Math.PI / 2, 0, -state.yaw)
	      puff.current.scale.set(0.42 + state.flash * 0.46 + state.slimeContactFunnel * 0.18 + state.slimeContactDent * 0.1 + state.mouthSurfaceCompression * 0.16 + state.mouthSealRing * 0.12 + visualHoseSlimeTouch * 0.08 + visualHoseSlimeSeal * 0.08 + visualHoseSlimeGulp * 0.1 + visualHoseSlimeStrain * 0.1 + visualDeepEmbedDepth * 0.38 + visualDeepEmbedRimOcclusion * 0.18 + visualDeepEmbedPocketPulse * 0.16 + visualSlimeContactFeed * 0.12 + visualSlimeMagneticPull * 0.08 + state.controllerGripQuality * 0.05 + visualSlimeMouthThread * 0.14 + visualAnimationSlurp * 0.16 + visualAnimationGlug * 0.12 + state.gripMouthAnticipationCue * 0.14 + state.gripPocketBiteCue * 0.1, 0.2 + state.flash * 0.22 + state.slimeContactRope * 0.08 + state.mouthSealRing * 0.08 + visualHoseSlimeGulp * 0.06 + visualHoseSlimeStrain * 0.06 + visualDeepEmbedRimOcclusion * 0.18 + visualDeepEmbedDepth * 0.06 + visualSlimeIntakeFlow * 0.08 + visualSlimeOrganicHold * 0.05 + state.controllerMouthSettle * 0.04 + visualSlimeMouthThread * 0.08 + visualAnimationStrandPinch * 0.08 + state.gripHoseStrainCue * 0.06, 1)
	      ;(puff.current.material as THREE.MeshBasicMaterial).opacity = 0.04 + state.flash * 0.18 + visualSlimeContactFeed * 0.06 + visualSlimeContactSnap * 0.04 + visualHoseSlimeNear * 0.025 + visualHoseSlimeTouch * 0.04 + visualHoseSlimeSeal * 0.05 + visualHoseSlimeGulp * 0.05 + visualHoseSlimeStrain * 0.05 + visualDeepEmbedDepth * 0.12 + visualDeepEmbedRimOcclusion * 0.08 + visualDeepEmbedPocketPulse * 0.06 + visualSlimeIntakeFlow * 0.08 + visualSlimeMagneticPull * 0.04 + visualSlimeOrganicHold * 0.035 + state.controllerMouthSettle * 0.035 + visualSlimeMouthThread * 0.08 + visualAnimationSlurp * 0.06
	    }
  })

  return (
    <group>
      <mesh ref={ring} frustumCulled={false}>
        <torusGeometry args={[0.62, 0.05, 8, 28]} />
        <meshBasicMaterial color="#fff2a3" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <mesh ref={puff} frustumCulled={false}>
        <circleGeometry args={[1, 28]} />
        <meshBasicMaterial color="#78e5ff" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  )
}

function BamBurstLayer({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const { camera } = useThree()
  const group = useRef<THREE.Group>(null)
  const burst = useRef<THREE.Mesh>(null)
  const burstOutline = useRef<THREE.Mesh>(null)
  const snapBurst = useRef<THREE.Mesh>(null)
  const snapOutline = useRef<THREE.Mesh>(null)
  const corePop = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const pinchRing = useRef<THREE.Mesh>(null)
  const flecks = useRef<Array<THREE.Mesh | null>>([])
  const slashes = useRef<Array<THREE.Mesh | null>>([])
  const dots = useRef<Array<THREE.Mesh | null>>([])
  const startedAt = useRef(-10)
  const lastCycle = useRef(0)
  const lastSnapCycle = useRef(0)
  const burstKind = useRef<'gulp' | 'snap' | 'complete'>('gulp')
  const strength = useRef(1)
  const variant = useRef(0)
  const burstGeometry = useMemo(() => makeBurstGeometry(11, 0.34, 0.82), [])
  const burstOutlineGeometry = useMemo(() => makeBurstGeometry(11, 0.39, 0.92), [])
  const snapGeometry = useMemo(() => makeBurstGeometry(7, 0.28, 0.6), [])
  const snapOutlineGeometry = useMemo(() => makeBurstGeometry(7, 0.32, 0.68), [])
  const burstMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#f6d34f',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    [],
  )
  const outlineMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: EXPERIMENT_SOFT_INK,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    [],
  )
  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fff2a3',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    [],
  )
  const snapMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#f47bdc',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    [],
  )
  const coreMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fff8c4',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    [],
  )
  const fleckMaterials = useMemo(
    () =>
      Array.from({ length: COMIC_FLECK_COUNT }, (_, index) => {
        const colors = ['#f47bdc', '#6bd8ff', '#fff2a3', '#83ef79']
        return new THREE.MeshBasicMaterial({
          color: colors[index % colors.length],
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
          depthTest: false,
          toneMapped: false,
        })
      }),
    [],
  )
  const dotMaterials = useMemo(
    () =>
      Array.from({ length: COMIC_DOT_COUNT }, (_, index) => {
        const colors = ['#6bd8ff', '#fff2a3', '#f47bdc']
        return new THREE.MeshBasicMaterial({
          color: colors[index % colors.length],
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
          depthTest: false,
          toneMapped: false,
        })
      }),
    [],
  )
  const slashMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fff8c4',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    [],
  )

  useFrame(({ clock }) => {
    const state = runtime.current
    const now = clock.elapsedTime
    const swallowed = state.swallowCycles - lastCycle.current
    if (swallowed > 0) {
      startedAt.current = now
      const completeHit = Math.max(state.animationCompletion, state.bagFullPulse * 0.7)
      strength.current = Math.min(1.48, 0.78 + swallowed * 0.08 + state.flash * 0.16 + completeHit * 0.22)
      variant.current = state.swallowCycles % 4
      burstKind.current = completeHit > 0.48 ? 'complete' : 'gulp'
      lastCycle.current = state.swallowCycles
    }
    const snapped = state.snapBreakCycles - lastSnapCycle.current
    if (snapped > 0) {
      startedAt.current = now
      strength.current = Math.min(1.18, 0.66 + state.snapBreakPulse * 0.3 + snapped * 0.06)
      variant.current = state.snapBreakCycles % 4
      burstKind.current = 'snap'
      lastSnapCycle.current = state.snapBreakCycles
    }

    const age = now - startedAt.current
    const isSnapBurst = burstKind.current === 'snap'
    const isCompleteBurst = burstKind.current === 'complete'
    const duration = isSnapBurst ? 0.32 : isCompleteBurst ? 0.58 : 0.46
    const gulpVisible = age >= 0 && age < duration
    const idleWave = (Math.sin(now * 8.4 + state.swallowCycles * 0.73) + 1) * 0.5
    const idleStrength = 0.34 + idleWave * 0.36
    const visible = gulpVisible || state.pulse > 0.5
    const layer = group.current
    if (!layer) return
    layer.visible = visible

    const fade = gulpVisible ? Math.max(0, 1 - age / duration) : idleStrength
    const pop = gulpVisible ? easeOutBack(Math.min(1, Math.max(0, age) / 0.18)) : 0.26 + idleWave * 0.16
    const snap = gulpVisible ? Math.sin(Math.min(1, Math.max(0, age) / 0.16) * Math.PI) : idleStrength
    const impact = gulpVisible ? strength.current : 0.36
    layer.position.copy(isSnapBurst ? state.snapBreakPoint : state.mouth).addScaledVector(state.mouthForward, isSnapBurst ? 0 : 0.012)
    layer.position.y += 0.014
    layer.quaternion.copy(camera.quaternion)
    layer.rotateZ(Math.sin(now * 13.0) * 0.03 + state.swallowCycles * 0.47)
    layer.scale.setScalar(gulpVisible ? 0.18 + pop * (isSnapBurst ? 0.14 : isCompleteBurst ? 0.27 : variant.current === 1 ? 0.22 : 0.17) * impact : 0.34 + idleWave * 0.055)

    if (burst.current) {
      ;(burst.current.material as THREE.MeshBasicMaterial).opacity = gulpVisible ? (isCompleteBurst ? 0.5 : variant.current === 2 ? 0.26 : 0.42) * fade : 0.32 * idleStrength
      burst.current.scale.set(0.8 + pop * (isCompleteBurst ? 0.2 : 0.12), 0.62 + pop * (isCompleteBurst ? 0.14 : 0.08), 1)
      burst.current.rotation.z = -age * 3.6
    }
    if (burstOutline.current) {
      ;(burstOutline.current.material as THREE.MeshBasicMaterial).opacity = gulpVisible ? (isCompleteBurst ? 0.38 : variant.current === 2 ? 0.48 : 0.72) * fade : 0.78 * idleStrength
      burstOutline.current.scale.set(0.86 + pop * (isCompleteBurst ? 0.22 : 0.14), 0.66 + pop * (isCompleteBurst ? 0.16 : 0.1), 1)
      burstOutline.current.rotation.z = -age * 3.6
    }
    if (snapBurst.current) {
      const snapOffset = variant.current % 2 === 0 ? -0.2 : 0.18
      ;(snapBurst.current.material as THREE.MeshBasicMaterial).opacity = 0.46 * fade * snap
      snapBurst.current.position.set(snapOffset, 0.14 * Math.sin(state.swallowCycles), 0.017)
      snapBurst.current.scale.set(0.42 + pop * 0.14, 0.36 + pop * 0.1, 1)
      snapBurst.current.rotation.z = age * 6.5 + variant.current
    }
    if (snapOutline.current) {
      const snapOffset = variant.current % 2 === 0 ? -0.2 : 0.18
      ;(snapOutline.current.material as THREE.MeshBasicMaterial).opacity = (isCompleteBurst ? 0.28 : 0.62) * fade * snap
      snapOutline.current.position.set(snapOffset, 0.14 * Math.sin(state.swallowCycles), 0.016)
      snapOutline.current.scale.set(0.47 + pop * 0.16, 0.4 + pop * 0.12, 1)
      snapOutline.current.rotation.z = age * 6.5 + variant.current
    }
    if (corePop.current) {
      ;(corePop.current.material as THREE.MeshBasicMaterial).opacity = gulpVisible ? (isCompleteBurst ? 1 : 0.9) * fade : 0.55 * idleStrength
      corePop.current.position.set(Math.sin(now * 10.0) * 0.035, Math.cos(now * 8.0) * 0.026, 0.07)
      corePop.current.rotation.set(age * 6.0, now * 4.0, age * 3.0)
      corePop.current.scale.setScalar(0.22 + snap * 0.12 + (isCompleteBurst ? pop * 0.08 : 0))
    }
    if (ring.current) {
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = gulpVisible ? (isCompleteBurst ? 0.42 : 0.34) * fade : 0.38 * idleStrength
      ring.current.scale.set(0.4 + pop * (isCompleteBurst ? 0.62 : 0.5) * impact, 0.28 + pop * (isCompleteBurst ? 0.36 : 0.28) * impact, 1)
    }
    if (pinchRing.current) {
      ;(pinchRing.current.material as THREE.MeshBasicMaterial).opacity = gulpVisible ? 0.42 * fade * snap : 0.28 * snap
      pinchRing.current.scale.set(0.24 + pop * 0.2, 0.12 + pop * 0.14, 1)
      pinchRing.current.rotation.z = Math.PI * 0.5 + age * 5.0
    }

    for (let index = 0; index < COMIC_FLECK_COUNT; index += 1) {
      const fleck = flecks.current[index]
      if (!fleck) continue
      const angle = (index / COMIC_FLECK_COUNT) * Math.PI * 2 + state.swallowCycles * 0.19
      const stagger = 0.68 + seededNoise(index + state.swallowCycles * 0.31) * 0.5
      const travel = (0.18 + pop * 0.54) * stagger
      fleck.position.set(Math.cos(angle) * travel, Math.sin(angle) * travel * 0.62, 0.022 + index * 0.001)
      fleck.rotation.z = angle + age * 7.0
      fleck.scale.set(0.07 + pop * (isCompleteBurst ? 0.09 : 0.07), 0.026 + fade * 0.012, 0.012)
      ;(fleck.material as THREE.MeshBasicMaterial).opacity = gulpVisible ? (isCompleteBurst ? 0.76 : 0.68) * fade : (index < 5 ? 0.26 * idleStrength : 0)
    }

    for (let index = 0; index < COMIC_SLASH_COUNT; index += 1) {
      const slash = slashes.current[index]
      if (!slash) continue
      const angle = (index / COMIC_SLASH_COUNT) * Math.PI * 2 + variant.current * 0.6
      const travel = 0.34 + pop * 0.46 + (index % 2) * 0.08
      slash.position.set(Math.cos(angle) * travel, Math.sin(angle) * travel * 0.54, 0.038 + index * 0.001)
      slash.rotation.z = angle + Math.PI / 2
      slash.scale.set(0.16 + snap * 0.08, 0.018 + fade * 0.01, 0.01)
      ;(slash.material as THREE.MeshBasicMaterial).opacity = gulpVisible ? 0.44 * fade * (0.45 + snap) : (index < 4 ? 0.24 * idleStrength : 0)
    }

    for (let index = 0; index < COMIC_DOT_COUNT; index += 1) {
      const dot = dots.current[index]
      if (!dot) continue
      const angle = (index / COMIC_DOT_COUNT) * Math.PI * 2 - state.swallowCycles * 0.28
      const travel = 0.12 + pop * (0.28 + index * 0.018)
      dot.position.set(Math.cos(angle) * travel * 0.82, Math.sin(angle) * travel * 0.52, 0.052 + index * 0.001)
      dot.scale.setScalar(0.055 + snap * 0.035)
      ;(dot.material as THREE.MeshBasicMaterial).opacity = gulpVisible ? 0.58 * fade : 0.3 * idleStrength
    }
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={burstOutline} geometry={burstOutlineGeometry} material={outlineMaterial} renderOrder={86} frustumCulled={false} />
      <mesh ref={burst} geometry={burstGeometry} material={burstMaterial} position={[0, 0, 0.01]} renderOrder={87} frustumCulled={false} />
      <mesh ref={snapOutline} geometry={snapOutlineGeometry} material={outlineMaterial} renderOrder={88} frustumCulled={false} />
      <mesh ref={snapBurst} geometry={snapGeometry} material={snapMaterial} renderOrder={89} frustumCulled={false} />
      <mesh ref={corePop} material={coreMaterial} position={[0, 0, 0.07]} renderOrder={93} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
      </mesh>
      <mesh ref={ring} material={ringMaterial} position={[0, 0, 0.02]} renderOrder={88} frustumCulled={false}>
        <torusGeometry args={[0.42, 0.04, 8, 24]} />
      </mesh>
      <mesh ref={pinchRing} material={ringMaterial} position={[0, 0, 0.025]} renderOrder={89} frustumCulled={false}>
        <torusGeometry args={[0.34, 0.036, 8, 20]} />
      </mesh>
      {Array.from({ length: COMIC_SLASH_COUNT }, (_, index) => (
        <mesh
          key={`slash-${index}`}
          ref={(node) => {
            slashes.current[index] = node
          }}
          material={slashMaterial}
          position={[0, 0, 0.03 + index * 0.001]}
          renderOrder={90}
          frustumCulled={false}
        >
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      ))}
      {Array.from({ length: COMIC_FLECK_COUNT }, (_, index) => (
        <mesh
          key={`fleck-${index}`}
          ref={(node) => {
            flecks.current[index] = node
          }}
          material={fleckMaterials[index]}
          position={[0, 0, 0.03 + index * 0.001]}
          renderOrder={91}
          frustumCulled={false}
        >
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      ))}
      {Array.from({ length: COMIC_DOT_COUNT }, (_, index) => (
        <mesh
          key={`dot-${index}`}
          ref={(node) => {
            dots.current[index] = node
          }}
          material={dotMaterials[index]}
          position={[0, 0, 0.045 + index * 0.001]}
          renderOrder={92}
          frustumCulled={false}
        >
          <circleGeometry args={[1, 10]} />
        </mesh>
      ))}
    </group>
  )
}

function CompletionDiscoEvent({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const beams = useRef<Array<THREE.Mesh | null>>([])
  const glow = useRef<THREE.Mesh>(null)
  const pulseRing = useRef<THREE.Mesh>(null)
  const beamMaterials = useMemo(
    () =>
      Array.from({ length: FIRST_LEVEL_TUNING.discoBeamCount }, (_, index) =>
        new THREE.MeshBasicMaterial({
          color: DISCO_BEAM_PALETTE[index % DISCO_BEAM_PALETTE.length],
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
          toneMapped: false,
        }),
      ),
    [],
  )
  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fff19a',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  )
  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#f47bdc',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  )

  useFrame(({ clock }) => {
    const state = runtime.current
    const t = clock.elapsedTime
    const progressLighting = computeProgressLightingSignal(state)
    const partySync = computeLevelPartySync(state)
    const defeated = state.levelDefeatTriggered || state.levelState === 'defeated'
    const lossFinaleMode = defeated || (!state.levelCompletionTriggered && state.levelDefeatPhase !== 'idle')
    if (lossFinaleMode) {
      for (const beam of beams.current) {
        if (!beam) continue
        beam.visible = false
        ;(beam.material as THREE.MeshBasicMaterial).opacity = 0
      }
      if (glow.current) {
        glow.current.visible = false
        ;(glow.current.material as THREE.MeshBasicMaterial).opacity = 0
      }
      if (pulseRing.current) {
        pulseRing.current.visible = false
        ;(pulseRing.current.material as THREE.MeshBasicMaterial).opacity = 0
      }
      return
    }
    const triggered = state.levelCompletionTriggered && !defeated
    const intensity = clampValue(
      defeated
        ? 0
        : triggered
        ? state.levelDiscoIntensity * 0.9 + state.levelCompletionGlow * 0.38 + state.levelCompletionPulse * 0.08
        : progressLighting * 0.28 + partySync * 0.26,
      0,
      1.45,
    )
    const pulseRate = FIRST_LEVEL_TUNING.discoBeamPulseRate * (triggered ? 0.72 : 0.46)
    const pulse = smooth01((Math.sin(t * pulseRate * Math.PI * 2) + 1) * 0.5)
    const completionCenterX = state.position.x * 0.18
    const completionCenterZ = state.position.z * 0.12
    for (let index = 0; index < FIRST_LEVEL_TUNING.discoBeamCount; index += 1) {
      const beam = beams.current[index]
      if (!beam) continue
      const material = beam.material as THREE.MeshBasicMaterial
      beam.visible = intensity > 0.03
      const colorIndex = (index + Math.floor(t * (triggered ? 1.6 : 0.72)) + Math.floor(partySync * 3)) % DISCO_BEAM_PALETTE.length
      material.color.set(DISCO_BEAM_PALETTE[colorIndex])
      const angle = (index / FIRST_LEVEL_TUNING.discoBeamCount) * Math.PI * 2 + Math.sin(t * (0.24 + intensity * 0.04) + index) * 0.18
      const orbit = 1.45 + seededNoise(index * 9.1 + 0.4) * 2.35 + intensity * 0.18
      beam.position.set(
        completionCenterX + Math.cos(angle + t * 0.06) * orbit,
        2.02 + intensity * 0.05,
        completionCenterZ + Math.sin(angle - t * 0.045) * (orbit * 0.58),
      )
      beam.rotation.set(0.18 + Math.sin(t * 0.34 + index) * 0.06, angle + Math.PI / 4, Math.sin(t * 0.42 + index) * 0.1)
      const beat = 0.68 + pulse * 0.28 + Math.sin(t * 0.9 + index * 0.9) * 0.06
      beam.scale.set(
        FIRST_LEVEL_TUNING.discoBeamSpread * (0.82 + beat * 0.24),
        1.0 + intensity * 0.38,
        FIRST_LEVEL_TUNING.discoBeamSpread * (1.02 + seededNoise(index + 3.2) * 0.26),
      )
      const opacityCap = triggered ? 0.42 : 0.12
      material.opacity = beam.visible
        ? Math.min(opacityCap, intensity * (triggered ? 0.1 + beat * 0.12 : 0.028 + beat * 0.035))
        : 0
    }
    if (glow.current) {
      glow.current.visible = intensity > 0.04
      glow.current.position.set(completionCenterX, 0.018, completionCenterZ)
      glow.current.rotation.set(-Math.PI / 2, 0, t * 0.035)
      glow.current.scale.set(4.0 + intensity * 2.2, 2.55 + intensity * 1.1, 1)
      ;(glow.current.material as THREE.MeshBasicMaterial).opacity = Math.min(triggered ? 0.32 : 0.12, 0.035 + intensity * 0.1 + pulse * intensity * 0.035)
    }
    if (pulseRing.current) {
      const ringPulse = state.levelCompletionPulse * 0.72 + intensity * (0.22 + pulse * 0.26)
      pulseRing.current.visible = ringPulse > 0.035
      pulseRing.current.position.copy(state.position)
      pulseRing.current.position.y = 0.05
      pulseRing.current.rotation.set(-Math.PI / 2, 0, t * (0.18 + intensity * 0.04))
      pulseRing.current.scale.set(0.95 + ringPulse * 1.8, 0.62 + ringPulse * 1.05, 1)
      ;(pulseRing.current.material as THREE.MeshBasicMaterial).opacity = Math.min(triggered ? 0.36 : 0.16, ringPulse * (triggered ? 0.14 : 0.065))
    }
  })

  return (
    <group>
      {Array.from({ length: FIRST_LEVEL_TUNING.discoBeamCount }, (_, index) => (
        <mesh
          key={`disco-beam-${index}`}
          ref={(node) => {
            beams.current[index] = node
          }}
          material={beamMaterials[index]}
          renderOrder={10}
          frustumCulled={false}
        >
          <coneGeometry args={[0.42, 5.6, 4, 1, true]} />
        </mesh>
      ))}
      <mesh ref={glow} material={glowMaterial} renderOrder={18} frustumCulled={false}>
        <circleGeometry args={[1, 48]} />
      </mesh>
      <mesh ref={pulseRing} material={ringMaterial} renderOrder={76} frustumCulled={false}>
        <torusGeometry args={[1, 0.035, 8, 42]} />
      </mesh>
    </group>
  )
}

function GripLockCue({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const core = useRef<THREE.Mesh>(null)
  const bite = useRef<THREE.Mesh>(null)
  const ringMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffe66d',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  }), [])
  const coreMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ff4bd8',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  }), [])
  const biteMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#150b27',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  }), [])

  useFrame(({ clock }) => {
    const state = runtime.current
    const root = group.current
    if (!root) return
    const scaffold = PRODUCTION_TUNING.grip.gripRingScaffoldStrength
    const lockCue = Math.max(
      state.gripLockPulse * scaffold,
      state.gripActive ? (0.18 + state.gripReleaseReady * 0.24 + state.gripReleaseCue * 0.22 + state.gripEntryPull * 0.2) * scaffold : 0,
      state.gripMissPulse * 0.32 * scaffold,
      state.gripPhysicalCue * 0.18,
      state.gripPocketBiteCue * 0.2,
      state.gripSpinoutPulse * 0.18,
    )
    if (lockCue < 0.015) {
      root.visible = false
      return
    }
    const t = clock.elapsedTime
    root.visible = true
    root.position.set(state.gripLockPoint.x, 0.14 + state.deepEmbedDepth * 0.05, state.gripLockPoint.z)
    root.rotation.set(Math.PI / 2, 0, t * (1.2 + state.gripSpinSpeed * 0.1))
    const releaseCue = Math.max(state.gripReleaseCue, state.gripReleaseReady * 0.72)
    const missCue = Math.max(state.gripMissPulse, state.gripSpinoutPulse * 0.34)
    const readyPulse = releaseCue * (0.85 + Math.sin(t * 13.5) * 0.15)
    const radius = 0.25 + lockCue * 0.18 + readyPulse * 0.06 + state.gripPhysicalCue * 0.05 + state.gripDizzy * 0.04 + missCue * 0.05
    root.scale.setScalar(radius)
    ringMaterial.color.set(missCue > 0.08 ? '#ff6b57' : releaseCue > 0.16 ? '#8dff94' : '#ffe66d')
    coreMaterial.color.set(missCue > 0.08 ? '#ff4c7d' : releaseCue > 0.16 ? '#69ffd4' : '#ff4bd8')
    biteMaterial.color.set(missCue > 0.08 ? '#42121e' : '#150b27')
    ringMaterial.opacity = clampValue((0.08 + lockCue * 0.36 + readyPulse * 0.12 + missCue * 0.1) * scaffold, 0, 0.5)
    coreMaterial.opacity = clampValue(0.06 + state.gripEntryPull * 0.14 + state.gripPhysicalCue * 0.18 + releaseCue * 0.18 + missCue * 0.12, 0, 0.48)
    biteMaterial.opacity = clampValue(0.12 + state.gripPocketBiteCue * 0.28 + (state.gripActive ? 0.12 + state.gripDizzy * 0.08 : state.gripLockPulse * 0.12) + missCue * 0.16, 0, 0.6)
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(t * (9.5 + releaseCue * 5.5)) * (0.025 + releaseCue * 0.02) + state.gripEntryPull * 0.06 + missCue * 0.06)
    if (core.current) core.current.scale.setScalar(0.44 + state.gripEntryPull * 0.12 + state.gripPhysicalCue * 0.1 + releaseCue * 0.1 + missCue * 0.06)
    if (bite.current) bite.current.scale.set(0.68 + state.gripPocketBiteCue * 0.18 + state.gripDizzy * 0.08 + missCue * 0.12, 0.48 + state.gripEntryPull * 0.12 + state.gripPocketBiteCue * 0.18 + releaseCue * 0.06, 1)
  })

  return (
    <group ref={group} visible={false} frustumCulled={false}>
      <mesh ref={bite} material={biteMaterial} renderOrder={70} frustumCulled={false}>
        <circleGeometry args={[1, 36]} />
      </mesh>
      <mesh ref={core} material={coreMaterial} renderOrder={74} frustumCulled={false}>
        <circleGeometry args={[1, 36]} />
      </mesh>
      <mesh ref={ring} material={ringMaterial} renderOrder={78} frustumCulled={false}>
        <torusGeometry args={[1, 0.055, 8, 48]} />
      </mesh>
    </group>
  )
}

function StickyAnchorDebugCue({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const core = useRef<THREE.Mesh>(null)
  const line = useRef<THREE.Mesh>(null)
  const releasePreview = useRef<THREE.Mesh>(null)
  const snapImpulse = useRef<THREE.Mesh>(null)
  const scratch = useMemo(() => ({
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
    mid: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    xAxis: new THREE.Vector3(1, 0, 0),
  }), [])
  const ringMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffe66d',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  }), [])
  const coreMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#5dffe8',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  }), [])
  const lineMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#9ef7ff',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  }), [])
  const releasePreviewMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ff9f43',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  }), [])
  const snapImpulseMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#f8ff7a',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  }), [])

  useFrame(({ clock }) => {
    const state = runtime.current
    const root = group.current
    if (!root) return
    const sealedVisible = state.devMode === 'suction-contact' && state.suctionState === 'sealed'
    const releaseVisible = state.devMode === 'suction-contact' && state.anchorPopJuice > 0.015
    const visible = sealedVisible || releaseVisible
    root.visible = sealedVisible
    if (!visible) {
      ringMaterial.opacity = 0
      coreMaterial.opacity = 0
      lineMaterial.opacity = 0
      releasePreviewMaterial.opacity = 0
      snapImpulseMaterial.opacity = 0
      if (line.current) line.current.visible = false
      if (releasePreview.current) releasePreview.current.visible = false
      if (snapImpulse.current) snapImpulse.current.visible = false
      return
    }

    const t = clock.elapsedTime
    const warning = clampValue(state.anchorDriftViolationPulse, 0, 1)
    const bitePulse = clampValue(Math.max(state.anchorSealSnapPulse, state.anchorSealCompressionTimer * 5.5), 0, 1)
    const radius = PRODUCTION_TUNING.suction.stickyAnchorDebugMarkerRadius * (1 + bitePulse * 0.28 + warning * 0.18)
    root.position.set(state.anchorWorldPosition.x, 0.18 + state.deepEmbedDepth * 0.035, state.anchorWorldPosition.z)
    root.rotation.set(Math.PI / 2, 0, t * (0.45 + bitePulse * 1.4))
    root.scale.setScalar(radius)
    ringMaterial.color.set(warning > 0.01 ? '#ff5f7a' : '#ffe66d')
    coreMaterial.color.set(warning > 0.01 ? '#ff2d55' : '#5dffe8')
    ringMaterial.opacity = clampValue(0.22 + bitePulse * 0.22 + warning * 0.2, 0, 0.58)
    coreMaterial.opacity = clampValue(0.16 + bitePulse * 0.18 + warning * 0.18, 0, 0.5)
    lineMaterial.opacity = clampValue(0.2 + state.anchorTension * 0.16 + warning * 0.2, 0, 0.52)
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(t * 10.5) * 0.025 + bitePulse * 0.12)
    if (core.current) core.current.scale.setScalar(0.38 + bitePulse * 0.12 + warning * 0.06)

    const lineMesh = line.current
    if (lineMesh) {
      scratch.start.set(state.anchorWorldPosition.x, 0.17, state.anchorWorldPosition.z)
      scratch.end.set(state.mouth.x, 0.17, state.mouth.z)
      scratch.direction.copy(scratch.end).sub(scratch.start)
      const length = scratch.direction.length()
      if (!sealedVisible || length < 0.025) {
        lineMesh.visible = false
      } else {
        lineMesh.visible = true
        scratch.direction.multiplyScalar(1 / length)
        scratch.mid.copy(scratch.start).lerp(scratch.end, 0.5)
        lineMesh.position.copy(scratch.mid)
        lineMesh.quaternion.setFromUnitVectors(scratch.xAxis, scratch.direction)
        lineMesh.scale.set(
          length,
          PRODUCTION_TUNING.suction.stickyAnchorDebugLineWidth,
          PRODUCTION_TUNING.suction.stickyAnchorDebugLineWidth,
        )
      }
    }
    const previewMesh = releasePreview.current
    const previewStrength = clampValue(state.anchorReleasePreviewStrength, 0, 1)
    if (previewMesh && sealedVisible && previewStrength > 0.02 && state.anchorReleaseDirection.lengthSq() > 0.001) {
      scratch.start.set(state.anchorWorldPosition.x, 0.22, state.anchorWorldPosition.z)
      scratch.direction.copy(state.anchorReleaseDirection).setY(0)
      scratch.direction.normalize()
      const previewLength = PRODUCTION_TUNING.suction.releaseDirectionDebugLength * (0.34 + previewStrength * 0.66)
      scratch.end.copy(scratch.start).addScaledVector(scratch.direction, previewLength)
      scratch.mid.copy(scratch.start).lerp(scratch.end, 0.5)
      previewMesh.visible = true
      previewMesh.position.copy(scratch.mid)
      previewMesh.quaternion.setFromUnitVectors(scratch.xAxis, scratch.direction)
      previewMesh.scale.set(previewLength, 0.04, 0.04)
      releasePreviewMaterial.opacity = clampValue(0.18 + previewStrength * 0.44, 0, 0.66)
    } else if (previewMesh) {
      previewMesh.visible = false
      releasePreviewMaterial.opacity = 0
    }
    const impulseMesh = snapImpulse.current
    if (impulseMesh && releaseVisible && state.anchorSnapImpulseVector.lengthSq() > 0.001) {
      scratch.start.set(state.anchorReleasePoint.x, 0.25, state.anchorReleasePoint.z)
      scratch.direction.copy(state.anchorSnapImpulseVector).setY(0)
      const impulseMagnitude = scratch.direction.length()
      scratch.direction.multiplyScalar(1 / Math.max(0.001, impulseMagnitude))
      const impulseLength = PRODUCTION_TUNING.suction.snapImpulseDebugLength * clampValue(impulseMagnitude, 0.12, 2.4)
      scratch.end.copy(scratch.start).addScaledVector(scratch.direction, impulseLength)
      scratch.mid.copy(scratch.start).lerp(scratch.end, 0.5)
      impulseMesh.visible = true
      impulseMesh.position.copy(scratch.mid)
      impulseMesh.quaternion.setFromUnitVectors(scratch.xAxis, scratch.direction)
      impulseMesh.scale.set(impulseLength, 0.055, 0.055)
      snapImpulseMaterial.opacity = clampValue(0.22 + state.anchorPopJuice * 0.38, 0, 0.72)
    } else if (impulseMesh) {
      impulseMesh.visible = false
      snapImpulseMaterial.opacity = 0
    }
  })

  return (
    <group frustumCulled={false}>
      <group ref={group} visible={false} frustumCulled={false}>
        <mesh ref={core} material={coreMaterial} renderOrder={86} frustumCulled={false}>
          <circleGeometry args={[1, 32]} />
        </mesh>
        <mesh ref={ring} material={ringMaterial} renderOrder={88} frustumCulled={false}>
          <torusGeometry args={[1, 0.07, 8, 48]} />
        </mesh>
      </group>
      <mesh ref={line} material={lineMaterial} visible={false} renderOrder={85} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <mesh ref={releasePreview} material={releasePreviewMaterial} visible={false} renderOrder={89} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <mesh ref={snapImpulse} material={snapImpulseMaterial} visible={false} renderOrder={90} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  )
}

function ReattachAssistCue({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const mouthRing = useRef<THREE.Mesh>(null)
  const candidateRing = useRef<THREE.Mesh>(null)
  const assistDirection = useRef<THREE.Mesh>(null)
  const scratch = useMemo(() => ({
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
    mid: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    xAxis: new THREE.Vector3(1, 0, 0),
  }), [])
  const mouthMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#76f6ff',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  }), [])
  const candidateMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#fff08a',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  }), [])
  const directionMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#8df7ff',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  }), [])

  useFrame(({ clock }) => {
    const state = runtime.current
    const grace = clampValue(
      state.anchorReattachGraceTimer / getStretchSnapReattachGraceDuration(state),
      0,
      1,
    )
    const visible = state.devMode === 'reattach-chain' && grace > 0.015
    if (mouthRing.current) mouthRing.current.visible = visible
    if (candidateRing.current) candidateRing.current.visible = visible && state.anchorReattachCandidateMoteId >= 0
    if (assistDirection.current) assistDirection.current.visible = visible
    if (!visible) {
      mouthMaterial.opacity = 0
      candidateMaterial.opacity = 0
      directionMaterial.opacity = 0
      return
    }
    const t = clock.elapsedTime
    const pulse = 0.88 + Math.sin(t * 11.5) * 0.08 + state.anchorReattachCatchPulse * 0.08
    if (mouthRing.current) {
      mouthRing.current.position.set(state.mouth.x, 0.13, state.mouth.z)
      mouthRing.current.rotation.set(Math.PI / 2, 0, t * 0.35)
      mouthRing.current.scale.setScalar(PRODUCTION_TUNING.suction.reattachAssistRadius * pulse)
    }
    if (assistDirection.current) {
      scratch.start.set(state.mouth.x, 0.18, state.mouth.z)
      scratch.direction.copy(state.anchorReattachAssistDirection)
      scratch.direction.y = 0
      if (scratch.direction.lengthSq() < 0.0001) scratch.direction.copy(state.anchorReleaseDirection).setY(0)
      if (scratch.direction.lengthSq() > 0.0001) {
        scratch.direction.normalize()
        const length = PRODUCTION_TUNING.suction.reattachAssistRadius * (0.82 + grace * 0.12)
        scratch.end.copy(scratch.start).addScaledVector(scratch.direction, length)
        scratch.mid.copy(scratch.start).lerp(scratch.end, 0.5)
        assistDirection.current.position.copy(scratch.mid)
        assistDirection.current.quaternion.setFromUnitVectors(scratch.xAxis, scratch.direction)
        assistDirection.current.scale.set(length, 0.035, 0.035)
      }
    }
    if (candidateRing.current) {
      candidateRing.current.position.set(
        state.anchorReattachCandidatePoint.x,
        0.17,
        state.anchorReattachCandidatePoint.z,
      )
      candidateRing.current.rotation.set(Math.PI / 2, 0, -t * 1.6)
      candidateRing.current.scale.setScalar(0.25 + state.anchorReattachCandidateScore * 0.16 + state.anchorReattachCatchPulse * 0.05)
    }
    mouthMaterial.opacity = clampValue(0.04 + grace * 0.12, 0, 0.18)
    candidateMaterial.opacity = clampValue(0.12 + state.anchorReattachCandidateScore * 0.24 + state.anchorReattachCatchPulse * 0.1, 0, 0.48)
    directionMaterial.opacity = clampValue(0.06 + grace * 0.22, 0, 0.32)
  })

  return (
    <group frustumCulled={false}>
      <mesh ref={mouthRing} material={mouthMaterial} visible={false} renderOrder={82} frustumCulled={false}>
        <torusGeometry args={[1, 0.018, 8, 64]} />
      </mesh>
      <mesh ref={candidateRing} material={candidateMaterial} visible={false} renderOrder={84} frustumCulled={false}>
        <torusGeometry args={[1, 0.052, 8, 42]} />
      </mesh>
      <mesh ref={assistDirection} material={directionMaterial} visible={false} renderOrder={83} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  )
}

function ProgressReactiveBackground({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const { scene } = useThree()
  const backgroundColor = useMemo(() => PROGRESS_BACKGROUND_BASE.clone(), [])

  useEffect(() => {
    scene.background = backgroundColor
    return () => {
      scene.background = PROGRESS_BACKGROUND_BASE.clone()
    }
  }, [backgroundColor, scene])

  useFrame(({ clock }) => {
    applyProgressBackgroundColor(runtime.current, clock.elapsedTime, backgroundColor)
    scene.background = backgroundColor
  })

  return null
}

function VacuumScene({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {

  return (
    <>
      <ProgressReactiveBackground runtime={runtime} />
      <VacuumCamera runtime={runtime} />
      <VacuumPointer runtime={runtime} />
      <VacuumKeyboardBodyControls runtime={runtime} />
      <VacuumMotion runtime={runtime} />
      <ambientLight intensity={1.08} color="#ffe0f7" />
      <hemisphereLight args={['#fff3cb', '#8eefff', 0.42]} />
      <directionalLight position={[-4.5, 7.6, 4.8]} intensity={3.25} color="#fff1a2" />
      <Stage runtime={runtime} />
      <MovementLabMarkers runtime={runtime} />
      <BodyMotionTrails runtime={runtime} />
      <HoseCursorReachDebugCue runtime={runtime} />
      <CompletionDiscoEvent runtime={runtime} />
      <GripLockCue runtime={runtime} />
      <StickyAnchorDebugCue runtime={runtime} />
      <ReattachAssistCue runtime={runtime} />
      <SuctionRibbons runtime={runtime} />
      <SuctionPulseBeads runtime={runtime} />
      <SuctionMotes runtime={runtime} />
      <MouthFlash runtime={runtime} />
      <BamBurstLayer runtime={runtime} />
      <VacuumBody runtime={runtime} />
      <BagFillDevTriggers runtime={runtime} />
      <LevelDevTriggers runtime={runtime} />
    </>
  )
}

function BagFillDevTriggers({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  useEffect(() => {
    const apply = (preset: BagFillDevPreset) => applyBagFillDevPreset(runtime.current, preset)
    const comboDev = {
      hit: (count: number = PRODUCTION_TUNING.bag.comboMinStreak) => triggerSlimeComboDevBurst(runtime.current, count),
      burst: (count: number = 5) => triggerSlimeComboDevBurst(runtime.current, count),
    }
    const keyMap: Record<string, BagFillDevPreset> = {
      '0': 'reset',
      '1': 'small-glug',
      '2': 'large-glug',
      '3': 'medium-fill',
      '4': 'high-fill',
      '5': 'near-full',
    }

    function onKeyDown(event: KeyboardEvent) {
      const preset = keyMap[event.key]
      const key = event.key.toLowerCase()
      if (runtime.current.devMode === 'full-loop' && isExperimentDevQueryEnabled() && event.shiftKey && key === 'b') {
        event.preventDefault()
        comboDev.burst(6)
        return
      }
      if (!preset || runtime.current.devMode !== 'bag-fill') return
      apply(preset)
    }

    window.__EXPERIMENT_LAB_BAG_FILL_DEV__ = apply
    window.__EXPERIMENT_LAB_COMBO_DEV__ = comboDev
    window.addEventListener('keydown', onKeyDown)
    return () => {
      if (window.__EXPERIMENT_LAB_BAG_FILL_DEV__ === apply) {
        window.__EXPERIMENT_LAB_BAG_FILL_DEV__ = undefined
      }
      if (window.__EXPERIMENT_LAB_COMBO_DEV__ === comboDev) {
        window.__EXPERIMENT_LAB_COMBO_DEV__ = undefined
      }
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [runtime])

  return null
}

function LevelDevTriggers({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  useEffect(() => {
    const setSuctionPreset = (preset: string) => {
      const normalized = normalizeStretchSnapPreset(preset)
      if (!normalized) return null
      runtime.current.stretchSnapPreset = normalized
      const tuning = getStretchSnapPresetTuning(runtime.current)
      runtime.current.anchorPlayerControlMultiplier = tuning.playerControlWhileSealed
      runtime.current.anchorDriftRetentionMultiplier = tuning.driftRetentionWhileSealed
      return normalized
    }
    const levelDev = {
      reset: () => requestLevelReset(runtime.current),
      complete: () => triggerLevelCompletion(runtime.current, runtime.current.flowMetrics.now, { force: true }),
      defeat: () => triggerLevelDefeat(runtime.current, runtime.current.flowMetrics.now, { force: true }),
      shop: () => {
        if (!runtime.current.levelCompletionTriggered) {
          triggerLevelCompletion(runtime.current, runtime.current.flowMetrics.now, { force: true })
        }
        runtime.current.levelState = 'shopping'
        runtime.current.levelShopReady = true
        runtime.current.levelCompletionSummaryReady = true
        return runtime.current.levelCurrencyEarned
      },
      survive: () => {
	        const state = runtime.current
	        if (!isFirstLevelMode(state.devMode)) return
	        const now = state.flowMetrics.now
	        const clearUnlockSeconds = state.levelWaveTimeLimit
	          + Math.max(0.001, FIRST_LEVEL_TUNING.waveExhaustionFadeSeconds)
	            * clampValue(FIRST_LEVEL_TUNING.waveClearUnlockExhaustion, 0, 1)
	        if (state.levelState === 'ready') {
	          state.levelState = 'playing'
	          state.levelStartedAt = now - clearUnlockSeconds
	        } else {
	          state.levelStartedAt = Math.min(state.levelStartedAt, now - clearUnlockSeconds)
	        }
	        state.levelTime = Math.max(clearUnlockSeconds, now - state.levelStartedAt)
        state.levelTimeRemaining = 0
        if (canTriggerLevelCompletionFromCoverage(state)) triggerLevelCompletion(state, now)
      },
      idleLoss: (seconds: number = 40) => {
        const state = runtime.current
        if (!isFirstLevelMode(state.devMode)) return state.levelOvertakePressure
        const simulatedIdleSeconds = clampValue(seconds, 0, 240)
        const now = state.flowMetrics.now
        const config = getLevelDifficultyConfig(state.levelDifficulty)
        state.levelNoGunkGraceSeconds = FIRST_LEVEL_TUNING.noCollectionGraceSeconds * config.noCollectionGraceScale
        if (state.levelState === 'ready') {
          state.levelState = 'playing'
          state.levelStartedAt = now - simulatedIdleSeconds
        }
        state.levelTime = Math.max(state.levelTime, simulatedIdleSeconds)
        state.levelTimeRemaining = Math.max(0, state.levelWaveTimeLimit - state.levelTime)
        const noCollectionRamp = Math.max(
          0.001,
          FIRST_LEVEL_TUNING.noCollectionRampSeconds * (0.88 + config.noCollectionGraceScale * 0.22),
        )
        state.levelNoCollectionTime = Math.max(
          state.levelNoCollectionTime,
          state.levelNoGunkGraceSeconds + simulatedIdleSeconds,
        )
        const noCollectionTarget = clampValue(
          smooth01(state.levelNoCollectionTime / noCollectionRamp) * config.noCollectionPressureScale,
          0,
          1.24,
        )
        state.levelNoCollectionPressure = Math.max(state.levelNoCollectionPressure, noCollectionTarget)
        const waveProgress = clampValue(state.levelTime / Math.max(0.001, state.levelWaveTimeLimit), 0, 1.25)
        const slowCleanupGraceProgress = clampValue(FIRST_LEVEL_TUNING.slowCleanupGraceProgress, 0, 0.92)
        const slowCleanupExpected = Math.pow(
          smooth01((waveProgress - slowCleanupGraceProgress) / Math.max(0.001, 1 - slowCleanupGraceProgress)),
          Math.max(0.25, FIRST_LEVEL_TUNING.slowCleanupExpectedCurve),
        )
        const slowCleanupDeficit = clampValue(
          slowCleanupExpected
            - state.levelProgressTowardTarget
            - FIRST_LEVEL_TUNING.slowCleanupProgressBuffer * (config.slowCleanupBufferScale ?? 1),
          0,
          1.3,
        )
        state.levelSlowCleanupDeficit = Math.max(state.levelSlowCleanupDeficit, slowCleanupDeficit)
        state.levelSlowCleanupPressure = Math.max(
          state.levelSlowCleanupPressure,
          clampValue(slowCleanupDeficit * (config.slowCleanupPressureScale ?? 1), 0, 1.24),
        )
        const timePressure = smooth01(
          (waveProgress - FIRST_LEVEL_TUNING.overtakeTimeRampStart)
            / Math.max(0.001, 1 - FIRST_LEVEL_TUNING.overtakeTimeRampStart),
        )
        const pressureTarget = clampValue(
          timePressure * FIRST_LEVEL_TUNING.overtakeTimeWeight
            + state.levelNoCollectionPressure * FIRST_LEVEL_TUNING.noCollectionOvertakeBoost
            + state.levelSlowCleanupPressure * FIRST_LEVEL_TUNING.slowCleanupOvertakeBoost
            + state.levelRegenPressure * FIRST_LEVEL_TUNING.overtakeRegenWeight,
          0,
          1.24,
        )
        state.levelOvertakePressure = Math.max(state.levelOvertakePressure, pressureTarget * config.overtakePressureScale)
        const overtakeDanger = clampValue(
          (state.levelOvertakePressure - FIRST_LEVEL_TUNING.overtakeWarningThreshold)
            / Math.max(0.001, FIRST_LEVEL_TUNING.overtakeLossThreshold - FIRST_LEVEL_TUNING.overtakeWarningThreshold),
          0,
          1,
        )
        state.levelLossProgress = Math.max(
          state.levelLossProgress,
          clampValue(
            Math.max(
              state.levelNoCollectionPressure * 0.96,
              state.levelSlowCleanupPressure * 1.1,
              state.levelSlowCleanupDeficit * 0.82,
              overtakeDanger,
            ),
            0,
            1.24,
          ),
        )
        const streamDifficultyScale = clampValue(config.noCollectionPressureScale, 0.72, 1.24)
        const overgrowthFillSeconds = Math.max(
          8,
          FIRST_LEVEL_TUNING.gunkOvergrowthLinearFillSeconds / streamDifficultyScale,
        )
        state.levelGunkOvergrowth = Math.max(
          state.levelGunkOvergrowth,
          clampValue(simulatedIdleSeconds / overgrowthFillSeconds, 0, 1.45),
        )
        state.levelVisibleGunkCoverage = Math.max(state.levelVisibleGunkCoverage, syncLevelCoverageFromMass(state, state.levelRawVisibleMass || state.levelStartMass))
        state.levelVisualClearPercent = computeVisualClearFromCoverage(state.levelVisibleGunkCoverage)
        state.levelGunkDanger = Math.max(
          state.levelGunkDanger,
          computeGunkDangerFromCoverage(state.levelVisibleGunkCoverage),
        )
        state.levelOvertakeDanger = clampValue(Math.max(overtakeDanger, state.levelLossProgress), 0, 1)
        if (isVisibleCoverageOvertaken(state)) {
          triggerLevelDefeat(state, now)
        }
        return state.levelLossProgress
      },
      overtake: (amount: number = 0.2) => {
        const state = runtime.current
        if (!isFirstLevelMode(state.devMode)) return state.levelOvertakePressure
        const overtakeStep = clampValue(amount, 0, 1.5)
        state.levelOvertakePressure = clampValue(state.levelOvertakePressure + overtakeStep, 0, 1.24)
        state.levelOvertakeDanger = clampValue(
          (state.levelOvertakePressure - FIRST_LEVEL_TUNING.overtakeWarningThreshold)
            / Math.max(0.001, FIRST_LEVEL_TUNING.overtakeLossThreshold - FIRST_LEVEL_TUNING.overtakeWarningThreshold),
          0,
          1,
        )
        state.levelLossProgress = Math.max(state.levelLossProgress, state.levelOvertakeDanger)
        state.levelGunkDanger = Math.max(state.levelGunkDanger, state.levelOvertakeDanger)
        state.levelGunkOvergrowth = Math.max(state.levelGunkOvergrowth, clampValue(state.levelOvertakePressure, 0, 1.45))
        state.levelVisibleGunkCoverage = Math.max(state.levelVisibleGunkCoverage, syncLevelCoverageFromMass(state, state.levelRawVisibleMass || state.levelStartMass))
        state.levelVisualClearPercent = computeVisualClearFromCoverage(state.levelVisibleGunkCoverage)
        state.levelGunkDanger = Math.max(
          state.levelGunkDanger,
          computeGunkDangerFromCoverage(state.levelVisibleGunkCoverage),
        )
        if (isVisibleCoverageOvertaken(state)) {
          triggerLevelDefeat(state, state.flowMetrics.now)
        }
        return state.levelOvertakePressure
      },
      difficulty: (difficulty: LevelDifficulty) => {
        setLevelDifficulty(runtime.current, difficulty)
      },
      level: (level: 1 | 2 | 3) => {
        const difficulty = LEVEL_DIFFICULTIES[level - 1] ?? 'easy'
        setLevelDifficulty(runtime.current, difficulty)
        return difficulty
      },
    }

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      const key = event.key.toLowerCase()
      if (key === 'r') {
        requestLevelReset(runtime.current)
      } else if (key === 'c' && event.shiftKey && runtime.current.devMode === 'full-loop') {
        triggerLevelCompletion(runtime.current, runtime.current.flowMetrics.now, { force: true })
      } else if (key === 'l' && event.shiftKey && runtime.current.devMode === 'full-loop') {
        triggerLevelDefeat(runtime.current, runtime.current.flowMetrics.now, { force: true })
      } else if (key === 'p') {
        event.preventDefault()
        if (!event.repeat) {
          const direction = event.shiftKey ? -1 : 1
          runtime.current.stretchSnapPreset = cycleStretchSnapPreset(runtime.current.stretchSnapPreset, direction)
          const tuning = getStretchSnapPresetTuning(runtime.current)
          runtime.current.anchorPlayerControlMultiplier = tuning.playerControlWhileSealed
          runtime.current.anchorDriftRetentionMultiplier = tuning.driftRetentionWhileSealed
        }
      } else if (key === '[') {
        setLevelDifficulty(runtime.current, cycleLevelDifficulty(runtime.current.levelDifficulty, -1))
      } else if (key === ']') {
        setLevelDifficulty(runtime.current, cycleLevelDifficulty(runtime.current.levelDifficulty, 1))
      } else if (runtime.current.devMode === 'full-loop' && (key === '1' || key === '2' || key === '3')) {
        levelDev.level(Number(key) as 1 | 2 | 3)
      }
    }

    window.__EXPERIMENT_LAB_LEVEL_DEV__ = levelDev
    window.__EXPERIMENT_LAB_SUCTION_PRESET_DEV__ = setSuctionPreset
    window.addEventListener('keydown', onKeyDown)
    return () => {
      if (window.__EXPERIMENT_LAB_LEVEL_DEV__ === levelDev) {
        window.__EXPERIMENT_LAB_LEVEL_DEV__ = undefined
      }
      if (window.__EXPERIMENT_LAB_SUCTION_PRESET_DEV__ === setSuctionPreset) {
        window.__EXPERIMENT_LAB_SUCTION_PRESET_DEV__ = undefined
      }
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [runtime])

  return null
}

function SlimeComboToast({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const [snapshot, setSnapshot] = useState({
    devMode: runtime.current.devMode,
    streak: runtime.current.slimeComboCount,
    best: runtime.current.slimeComboBest,
    pulse: runtime.current.slimeComboPulse,
    burst: runtime.current.slimeComboBurst,
    shock: runtime.current.slimeComboShockwave,
    timer: runtime.current.slimeComboTimer,
    labelAge: runtime.current.slimeComboLabelAge,
  })

  useEffect(() => {
    const tick = () => {
      const state = runtime.current
      setSnapshot({
        devMode: state.devMode,
        streak: state.slimeComboCount,
        best: state.slimeComboBest,
        pulse: state.slimeComboPulse,
        burst: state.slimeComboBurst,
        shock: state.slimeComboShockwave,
        timer: state.slimeComboTimer,
        labelAge: state.slimeComboLabelAge,
      })
    }
    tick()
    const frame = window.setInterval(tick, 70)
    return () => window.clearInterval(frame)
  }, [runtime])

  if (snapshot.devMode !== 'full-loop') return null
  const active = snapshot.streak >= PRODUCTION_TUNING.bag.comboMinStreak
    && (snapshot.timer > 0 || snapshot.pulse > 0.08 || snapshot.burst > 0.06)
    && snapshot.labelAge < PRODUCTION_TUNING.bag.comboLabelDuration + 0.7
  if (!active) return null

  const comboPower = clampValue(
    Math.max(snapshot.pulse * 0.58, snapshot.burst, snapshot.shock * 0.45)
      + smooth01((snapshot.streak - PRODUCTION_TUNING.bag.comboMinStreak + 1) / 4) * 0.38,
    0,
    1.7,
  )
  const comboWord = snapshot.streak >= 6
    ? 'BAG BOOGIE'
    : snapshot.streak >= 4
      ? 'GUNK STREAK'
      : 'SLURP STREAK'

  return (
    <aside
      className={`slimeComboToast${snapshot.streak >= 5 ? ' comboBig' : ''}`}
      aria-label={`${comboWord} combo ${snapshot.streak}`}
      style={{
        '--combo-power': comboPower,
        '--combo-scale': 1 + comboPower * 0.055,
        '--combo-hop': `${-2 - comboPower * 7}px`,
      } as CSSProperties}
    >
      <span aria-hidden="true" />
      <strong>{comboWord}</strong>
      <b>x{snapshot.streak}</b>
      <em>bag bonus</em>
    </aside>
  )
}

function LevelCompletionOverlay({ runtime }: { runtime: MutableRefObject<VacuumRuntime> }) {
  const [snapshot, setSnapshot] = useState<{
    devMode: ProductionDevModeId
    state: LevelState
    phase: CompletionAnimationPhase
    defeatPhase: DefeatAnimationPhase
    difficulty: LevelDifficulty
    waveIndex: number
    timeRemaining: number
    waveTimeLimit: number
    noCollectionTime: number
    noCollectionPressure: number
    slowCleanupPressure: number
    slowCleanupDeficit: number
    lossProgress: number
    visibleGunkCoverage: number
    visualClearPercent: number
    gunkDanger: number
    gunkOvergrowth: number
    noGunkGraceSeconds: number
    overtakePressure: number
    overtakeDanger: number
    shopReady: boolean
    currencyEarned: number
    stylePoints: number
    gunkValue: number
    coinValue: number
    clearTarget: number
    progressTowardTarget: number
    completionPercent: number
    remainingMass: number
    regenPressure: number
    regenRate: number
    partyProgress: number
    partySync: number
    progressLighting: number
    discoIntensity: number
    completionGlow: number
    majorGlobsRemaining: number
    time: number
    summary: LevelCompletionSummary | null
    ready: boolean
  }>({
    devMode: runtime.current.devMode,
    state: runtime.current.levelState,
    phase: runtime.current.levelCompletionPhase,
    defeatPhase: runtime.current.levelDefeatPhase,
    difficulty: runtime.current.levelDifficulty,
    waveIndex: runtime.current.levelWaveIndex,
    timeRemaining: runtime.current.levelTimeRemaining,
    waveTimeLimit: runtime.current.levelWaveTimeLimit,
    noCollectionTime: runtime.current.levelNoCollectionTime,
    noCollectionPressure: runtime.current.levelNoCollectionPressure,
    slowCleanupPressure: runtime.current.levelSlowCleanupPressure,
    slowCleanupDeficit: runtime.current.levelSlowCleanupDeficit,
    lossProgress: runtime.current.levelLossProgress,
    visibleGunkCoverage: runtime.current.levelVisibleGunkCoverage,
    visualClearPercent: runtime.current.levelVisualClearPercent,
    gunkDanger: runtime.current.levelGunkDanger,
    gunkOvergrowth: runtime.current.levelGunkOvergrowth,
    noGunkGraceSeconds: runtime.current.levelNoGunkGraceSeconds,
    overtakePressure: runtime.current.levelOvertakePressure,
    overtakeDanger: runtime.current.levelOvertakeDanger,
    shopReady: runtime.current.levelShopReady,
    currencyEarned: runtime.current.levelCurrencyEarned,
    stylePoints: runtime.current.levelStylePoints,
    gunkValue: runtime.current.levelGunkValue,
    coinValue: runtime.current.levelCoinValue,
    clearTarget: runtime.current.levelClearTarget,
    progressTowardTarget: runtime.current.levelProgressTowardTarget,
    completionPercent: runtime.current.levelCompletionPercent,
    remainingMass: runtime.current.levelRemainingMass,
    regenPressure: runtime.current.levelRegenPressure,
    regenRate: runtime.current.levelRegenRate,
    partyProgress: runtime.current.levelPartyProgress,
    partySync: computeLevelPartySync(runtime.current),
    progressLighting: computeProgressLightingSignal(runtime.current),
    discoIntensity: runtime.current.levelDiscoIntensity,
    completionGlow: runtime.current.levelCompletionGlow,
    majorGlobsRemaining: runtime.current.levelMajorGlobsRemaining,
    time: runtime.current.levelTime,
    summary: runtime.current.levelCompletionSummary,
    ready: runtime.current.levelCompletionSummaryReady,
  })

  useEffect(() => {
    const tick = () => {
      const state = runtime.current
      setSnapshot({
        devMode: state.devMode,
        state: state.levelState,
        phase: state.levelCompletionPhase,
        defeatPhase: state.levelDefeatPhase,
        difficulty: state.levelDifficulty,
        waveIndex: state.levelWaveIndex,
        timeRemaining: state.levelTimeRemaining,
        waveTimeLimit: state.levelWaveTimeLimit,
        noCollectionTime: state.levelNoCollectionTime,
        noCollectionPressure: state.levelNoCollectionPressure,
        slowCleanupPressure: state.levelSlowCleanupPressure,
        slowCleanupDeficit: state.levelSlowCleanupDeficit,
        lossProgress: state.levelLossProgress,
        visibleGunkCoverage: state.levelVisibleGunkCoverage,
        visualClearPercent: state.levelVisualClearPercent,
        gunkDanger: state.levelGunkDanger,
        gunkOvergrowth: state.levelGunkOvergrowth,
        noGunkGraceSeconds: state.levelNoGunkGraceSeconds,
        overtakePressure: state.levelOvertakePressure,
        overtakeDanger: state.levelOvertakeDanger,
        shopReady: state.levelShopReady,
        currencyEarned: state.levelCurrencyEarned,
        stylePoints: state.levelStylePoints,
        gunkValue: state.levelGunkValue,
        coinValue: state.levelCoinValue,
        clearTarget: state.levelClearTarget,
        progressTowardTarget: state.levelProgressTowardTarget,
        completionPercent: state.levelCompletionPercent,
        remainingMass: state.levelRemainingMass,
        regenPressure: state.levelRegenPressure,
        regenRate: state.levelRegenRate,
        partyProgress: state.levelPartyProgress,
        partySync: computeLevelPartySync(state),
        progressLighting: computeProgressLightingSignal(state),
        discoIntensity: state.levelDiscoIntensity,
        completionGlow: state.levelCompletionGlow,
        majorGlobsRemaining: state.levelMajorGlobsRemaining,
        time: state.levelTime,
        summary: state.levelCompletionSummary,
        ready: state.levelCompletionSummaryReady,
      })
    }
    tick()
    const frame = window.setInterval(tick, 140)
    return () => window.clearInterval(frame)
  }, [runtime])

  if (snapshot.devMode !== 'full-loop') return null

  const progress = clampValue(snapshot.visualClearPercent, 0, 1)
  const isDefeated = snapshot.state === 'defeated'
  const isShop = snapshot.state === 'shopping'
  const isCompletionState = snapshot.state === 'completing' || snapshot.state === 'complete' || isShop
  const activeWaveMeter = !isCompletionState && !isShop
  const dangerBaseline = clampValue(FIRST_LEVEL_TUNING.gunkDangerBaseline, 0.05, 0.9)
  const coverageDanger = computeGunkDangerFromCoverage(snapshot.visibleGunkCoverage)
  const danger = isDefeated
    ? 1
    : clampValue(coverageDanger, 0, 1)
  const dangerBalance = danger >= dangerBaseline
    ? clampValue((danger - dangerBaseline) / Math.max(0.001, 1 - dangerBaseline), 0, 1)
    : -clampValue((dangerBaseline - danger) / Math.max(0.001, dangerBaseline), 0, 1)
  const safeLevel = activeWaveMeter || isDefeated ? Math.max(0, -dangerBalance) : progress
  const threatLevel = activeWaveMeter || isDefeated ? Math.max(0, dangerBalance) : 0
  const meterGaugeLabel = isDefeated
    ? 'GUNKED'
    : activeWaveMeter
      ? threatLevel > 0.5
        ? 'DANGER'
        : threatLevel > 0.32
          ? 'SWELL'
          : safeLevel > 0.22
            ? 'CLEAR'
            : 'STEADY'
      : isShop
        ? 'CLEAR'
        : 'SURVIVED'
  const meterStateLabel = isDefeated
    ? 'overtaken'
    : isShop
      ? 'gunkbucks'
      : activeWaveMeter
        ? threatLevel > 0.5
          ? 'takeover danger'
          : threatLevel > 0.32
            ? 'gunk rising'
            : safeLevel > 0.22
            ? 'room clearing'
            : 'neutral tide'
        : 'survived'
  const meterNeedleAngle = activeWaveMeter || isDefeated ? -dangerBalance * 58 : -58 + progress * 116
  const meterVerb = meterStateLabel
  const visibleGunkPercent = Math.round(clampValue(snapshot.visibleGunkCoverage, 0, 1) * 100)
  const showDevLevelToolbar = isExperimentDevQueryEnabled()
  const useDangerGauge = activeWaveMeter || isDefeated

  return (
    <>
      <aside
        className={`levelCompletionOverlay simpleGunkMeterOverlay${threatLevel > 0.08 || isDefeated ? ' dangerActive' : ''}${safeLevel > 0.08 && !isDefeated ? ' safeActive' : ''}${useDangerGauge && threatLevel <= 0.08 && safeLevel <= 0.08 && !isDefeated ? ' neutralActive' : ''}${isDefeated ? ' defeatedActive' : ''}${isShop ? ' shopActive' : ''}`}
        aria-label={`Gunk pressure gauge, wave ${snapshot.waveIndex}, ${meterVerb}, ${visibleGunkPercent}% gunk cover`}
        style={{
          '--clean-progress': progress,
          '--clean-percent': `${progress * 100}%`,
          '--danger-level': danger,
          '--meter-balance': dangerBalance,
          '--safe-level': safeLevel,
          '--threat-level': threatLevel,
          '--meter-needle-angle': `${meterNeedleAngle}deg`,
          '--gauge-good-level': safeLevel,
          '--gauge-danger-level': threatLevel,
          '--simple-danger-tilt': `${-2 + threatLevel * 1.8}deg`,
          '--simple-danger-drop': `${threatLevel * 2}px`,
          '--simple-danger-saturation': 1.02 + threatLevel * 0.16,
          '--simple-danger-brightness': 1 - threatLevel * 0.03,
        } as CSSProperties}
      >
        <span className="simpleGunkMeterShadow" aria-hidden="true" />
        <div className={`simpleGunkMeterObject ${useDangerGauge ? 'dangerGauge' : 'progressGauge'}`} aria-hidden="true">
          <div className="simpleGunkGauge">
            <span className="simpleGunkGaugeCase" />
            <span className="simpleGunkGaugeGlass" />
            <span className="simpleGunkArc simpleGunkArcDanger" />
            <span className="simpleGunkArc simpleGunkArcNeutral" />
            <span className="simpleGunkArc simpleGunkArcSafe" />
            <span className="simpleGunkTick simpleGunkTickLeft" />
            <span className="simpleGunkTick simpleGunkTickCenter" />
            <span className="simpleGunkTick simpleGunkTickRight" />
            <span className="simpleGunkNeedle">
              <i />
            </span>
            <span className="simpleGunkHub" />
            <span className="simpleGunkMeterLabel">GUNK</span>
            <span className="simpleGunkMeterState">{meterGaugeLabel}</span>
          </div>
        </div>
      </aside>
      {showDevLevelToolbar ? (
        <div className="levelDevToolbar" aria-label="Dev level controls">
          <span>Dev Levels</span>
          <div className="levelDevToolbarButtons" aria-label="Level difficulty">
            {LEVEL_DIFFICULTIES.map((difficulty, index) => (
              <button
                key={difficulty}
                type="button"
                className={difficulty === snapshot.difficulty ? 'active' : undefined}
                aria-label={LEVEL_DIFFICULTY_LABELS[difficulty]}
                aria-pressed={difficulty === snapshot.difficulty}
                title={LEVEL_DIFFICULTY_LABELS[difficulty]}
                onClick={() => setLevelDifficulty(runtime.current, difficulty)}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="levelDevResetButton"
            aria-label={snapshot.ready ? 'Replay level' : 'Reset level'}
            title={snapshot.ready ? 'Replay level' : 'Reset level'}
            onClick={() => requestLevelReset(runtime.current)}
          >
            R
          </button>
        </div>
      ) : null}
    </>
  )
}

export function ExperimentLab() {
  const devMode = useMemo(() => getInitialDevMode(), [])
  const runtime = useRef(createRuntime(devMode))

  return (
    <div className="vacuumLab">
      <Canvas
        dpr={VACUUM_DPR}
        camera={{ fov: 44, position: [0, ARENA_RADIUS * 1.34, ARENA_RADIUS * 1.9], near: 0.1, far: 80 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <VacuumScene runtime={runtime} />
      </Canvas>
      <LevelCompletionOverlay runtime={runtime} />
      <SlimeComboToast runtime={runtime} />
    </div>
  )
}
