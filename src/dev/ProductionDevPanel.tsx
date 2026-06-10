'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  PRODUCTION_DEV_MODES,
  deriveStretchSnapGrappleState,
  deriveSuctionContactState,
  getProductionDevMode,
  isProductionDevModeId,
  type ProductionExperimentStatsSnapshot,
} from './productionDevModes'

function formatMetric(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0.00'
  return value.toFixed(2)
}

function withMode(id: string) {
  const params = new URLSearchParams()
  params.set('mode', id)
  params.set('dev', '1')
  return `/experiment-lab?${params.toString()}`
}

export function ProductionDevPanel() {
  const [enabled, setEnabled] = useState(false)
  const [modeId, setModeId] = useState('full-loop')
  const [stats, setStats] = useState<ProductionExperimentStatsSnapshot | null>(null)

  useEffect(() => {
    const syncLocation = () => {
      const params = new URLSearchParams(window.location.search)
      const requestedMode = params.get('mode')
      const shouldShow = window.location.pathname === '/experiment-lab'
        && (params.get('dev') === '1' || isProductionDevModeId(requestedMode))
      setEnabled(shouldShow)
      setModeId(isProductionDevModeId(requestedMode) ? requestedMode : 'full-loop')
    }

    syncLocation()
    window.addEventListener('popstate', syncLocation)
    return () => window.removeEventListener('popstate', syncLocation)
  }, [])

  useEffect(() => {
    if (!enabled) return undefined

    let frame = 0
    const tick = () => {
      const labWindow = window as unknown as { __EXPERIMENT_LAB_STATS__?: ProductionExperimentStatsSnapshot }
      setStats(labWindow.__EXPERIMENT_LAB_STATS__ ?? null)
      frame = window.setTimeout(tick, 160)
    }
    tick()
    return () => window.clearTimeout(frame)
  }, [enabled])

  const mode = useMemo(() => getProductionDevMode(modeId), [modeId])
  const suctionState = deriveSuctionContactState(stats)
  const stretchSnapState = stats?.stretchSnapState ?? deriveStretchSnapGrappleState(stats)
  const flow = stats?.flowMetrics

  if (!enabled) return null

  return (
    <aside className="productionDevPanel" aria-label="Production dev mode panel">
      <header>
        <strong>{mode.label}</strong>
        <span>{suctionState}</span>
      </header>
      <p>{mode.description}</p>
      <div className="productionDevGrid" aria-label="Live mechanics telemetry">
        <span>seal {formatMetric(stats?.slimeSealStrength)}</span>
        <span>tension {formatMetric(stats?.swingTension)}</span>
        <span>speed {formatMetric(stats?.bodySpeed)}</span>
        <span>arena r{formatMetric(stats?.arenaRadius)}</span>
        <span>piles {stats?.arenaPileCount ?? 0}</span>
        <span>clusters {stats?.arenaClusterCount ?? 0}</span>
        <span>isolated {stats?.arenaIsolatedSlimeCount ?? 0}</span>
        <span>near {formatMetric(stats?.arenaNearestSpacingMin)}-{formatMetric(stats?.arenaNearestSpacingMax)}</span>
        <span>accel {formatMetric(stats?.bodyAcceleration)}</span>
        <span>drift {formatMetric(stats?.bodyDriftFactor)}</span>
        <span>lat {formatMetric(stats?.bodyLateralSpeed)}</span>
        <span>facev {formatMetric(stats?.bodyFacingVelocityAngle)}</span>
        <span>vdir {formatMetric(stats?.bodyVelocityDirection)}</span>
        <span>keys {stats?.bodyInputActive ? `${stats.bodyInput?.x ?? 0},${stats.bodyInput?.z ?? 0}` : 'off'}</span>
        <span>mousebody {stats?.mouseBodyInputActive ? `${stats.mouseBodyInput?.x ?? 0},${stats.mouseBodyInput?.z ?? 0}` : 'off'}</span>
        <span>hose {stats?.hoseActive ? 'aim' : 'idle'}</span>
        <span>blow {stats?.hoseBlowActive ? formatMetric(stats?.hoseBlowStrength) : 'off'}</span>
        <span>bpush {formatMetric(stats?.hoseBlowPush)}</span>
        <span>bmotes {stats?.hoseBlowAffectedMotes ?? 0}</span>
        <span>haimlag {formatMetric(stats?.hoseAimLag)}</span>
        <span>hjitter {formatMetric(stats?.hoseAimJitter)}</span>
        <span>hstability {formatMetric(stats?.hoseAimStability)}</span>
        <span>hrext {formatMetric(stats?.hoseReachExtension)}</span>
        <span>hfwd {formatMetric(stats?.hoseReachForwardAmount)}</span>
        <span>hside {formatMetric(stats?.hoseReachSideAmount)}</span>
        <span>hvel {formatMetric(stats?.hoseMouthVelocity ? Math.hypot(stats.hoseMouthVelocity.x, stats.hoseMouthVelocity.z) : undefined)}</span>
        <span>hclamp {stats?.hoseReachClamped ? 'yes' : 'no'}</span>
        <span>hlock {stats?.hoseReachLockedToAnchor ? 'anchor' : 'free'}</span>
        <span>rgrip {stats?.rightClickGripEnabled ? 'on' : 'off'}</span>
        <span>strain {formatMetric(stats?.tetherStrain)}</span>
        <span>pivot {stats?.pivotLocked ? 'lock' : 'free'}</span>
        <span>ptime {formatMetric(stats?.pivotLockDuration)}</span>
        <span>pang {formatMetric(stats?.pivotAngularVelocity)}</span>
        <span>ptan {formatMetric(stats?.pivotTangentialSpeed)}</span>
        <span>prad {formatMetric(stats?.pivotRadialDistance)}</span>
        <span>pstretch {formatMetric(stats?.pivotHoseStretchRatio)}</span>
        <span>ptension {formatMetric(stats?.pivotTension)}</span>
        <span>pthresh {formatMetric(stats?.pivotSnapThreshold)}</span>
        <span>passist {formatMetric(stats?.pivotSwingAssist)}</span>
        <span>pviz {formatMetric(stats?.pivotHoseVisualStretch)}</span>
        <span>pthin {formatMetric(stats?.pivotHoseThinning)}</span>
        <span>pwob {formatMetric(stats?.pivotHoseWobble)}</span>
        <span>pread {formatMetric(stats?.pivotSnapReadiness)}</span>
        <span>pcool {formatMetric(stats?.pivotReattachCooldown)}</span>
        <span>pcand {stats?.pivotCandidateTargetId ?? -1}</span>
        <span>preason {stats?.pivotReleaseReason ?? 'none'}</span>
        <span>grip {stats?.gripActive ? 'lock' : stats?.gripState ?? 'idle'}</span>
        <span>gpid {stats?.gripTargetPileIndex ?? -1}</span>
        <span>gmid {stats?.gripTargetMoteId ?? -1}</span>
        <span>gpt {stats?.gripContactIndex ?? -1}</span>
        <span>ghold {formatMetric(stats?.gripHoldTime)}</span>
        <span>gspin {formatMetric(stats?.gripSpinSpeed)}</span>
        <span>gwin {formatMetric(stats?.gripReleaseWindowWidth)}</span>
        <span>gqual {formatMetric(stats?.gripReleaseQuality)}</span>
        <span>gready {formatMetric(stats?.gripReleaseReady)}</span>
        <span>gcue {formatMetric(stats?.gripReleaseCue)}</span>
        <span>gphase {formatMetric(stats?.gripReleasePhaseQuality)}</span>
        <span>gwarm {formatMetric(stats?.gripReleaseReadiness)}</span>
        <span>ggrace {formatMetric(stats?.gripReleaseGraceTimer)}</span>
        <span>gdizzy {formatMetric(stats?.gripDizzy)}</span>
        <span>gmiss {stats?.gripMissCount ?? 0}</span>
        <span>gclench {formatMetric(stats?.gripMissPulse)}</span>
        <span>gphys {formatMetric(stats?.gripPhysicalCue)}</span>
        <span>gpocket {formatMetric(stats?.gripPocketBiteCue)}</span>
        <span>ghose {formatMetric(stats?.gripHoseStrainCue)}</span>
        <span>gmouth {formatMetric(stats?.gripMouthAnticipationCue)}</span>
        <span>gboost {formatMetric(stats?.gripMassMultiplier)}</span>
        <span>gglug {formatMetric(stats?.gripGlugBoost)}</span>
        <span>glast {formatMetric(stats?.gripLastReleaseQuality)}</span>
        <span>greason {stats?.gripReleaseReason ?? 'none'}</span>
	        <span>release {formatMetric(stats?.tetherRelease)}</span>
        <span>reattach {formatMetric(stats?.postSnapReattachTimer)}</span>
        <span>sstate {stats?.suctionState ?? 'free'}</span>
        <span>grapple {stretchSnapState}</span>
        <span>preset {stats?.stretchSnapPreset ?? 'arcadeTug'}</span>
        <span>pspring {formatMetric(stats?.stretchSnapPresetValues?.springStrength)}</span>
        <span>pdamp {formatMetric(stats?.stretchSnapPresetValues?.damping)}</span>
        <span>pmax {formatMetric(stats?.stretchSnapPresetValues?.maxStretch)}</span>
        <span>pctrl {formatMetric(stats?.stretchSnapPresetValues?.playerControlWhileSealed)}</span>
        <span>pdrift {formatMetric(stats?.stretchSnapPresetValues?.driftRetentionWhileSealed)}</span>
        <span>pbounce {formatMetric(stats?.stretchSnapPresetValues?.elasticBounceAmount)}</span>
        <span>psnap {formatMetric(stats?.stretchSnapPresetValues?.snapPower)}</span>
        <span>pgrace {formatMetric(stats?.stretchSnapPresetValues?.reattachGraceDuration)}</span>
        <span>gage {formatMetric(stats?.stretchSnapStateAge)}</span>
        <span>gjuice {formatMetric(stats?.stretchSnapTensionJuice)}</span>
        <span>gcam {formatMetric(stats?.stretchSnapCameraImpulse)}</span>
        <span>gaudio {stats?.stretchSnapAudioCue ?? 'none'} {formatMetric(stats?.stretchSnapAudioIntensity)}</span>
        <span>arest {formatMetric(stats?.anchorRestLength)}</span>
        <span>adist {formatMetric(stats?.anchorCurrentDistance)}</span>
        <span>astretch {formatMetric(stats?.anchorStretch)}</span>
        <span>atension {formatMetric(stats?.anchorTension)}</span>
        <span>atvel {formatMetric(stats?.anchorTensionVelocity)}</span>
        <span>abounce {formatMetric(stats?.anchorElasticBounce)}</span>
        <span>arebound {formatMetric(stats?.anchorReboundImpulse)}</span>
        <span>actrl {formatMetric(stats?.anchorPlayerControlMultiplier)}</span>
        <span>adriftret {formatMetric(stats?.anchorDriftRetentionMultiplier)}</span>
        <span>aforce {formatMetric(stats?.anchorSpringForce)}</span>
        <span>adamp {formatMetric(stats?.anchorDampingForce)}</span>
        <span>adirto {formatMetric(stats?.anchorDirectionToAnchor?.x)} {formatMetric(stats?.anchorDirectionToAnchor?.z)}</span>
        <span>aspringv {formatMetric(stats?.anchorSpringForceVector?.x)} {formatMetric(stats?.anchorSpringForceVector?.z)}</span>
        <span>adampv {formatMetric(stats?.anchorDampingForceVector?.x)} {formatMetric(stats?.anchorDampingForceVector?.z)}</span>
        <span>aelastv {formatMetric(stats?.anchorElasticForceVector?.x)} {formatMetric(stats?.anchorElasticForceVector?.z)}</span>
        <span>alateral {formatMetric(stats?.anchorLateralDamping)}</span>
        <span>arad {formatMetric(stats?.anchorRadialVelocity)}</span>
        <span>atan {formatMetric(stats?.anchorTangentVelocity)}</span>
        <span>aover {formatMetric(stats?.anchorOverstretchTimer)}</span>
        <span>artens {formatMetric(stats?.anchorReleaseTension)}</span>
        <span>asnap {formatMetric(stats?.anchorSnapImpulseMagnitude)}</span>
        <span>adir {formatMetric(stats?.anchorReleaseDirection?.x)} {formatMetric(stats?.anchorReleaseDirection?.z)}</span>
        <span>aimp {formatMetric(stats?.anchorSnapImpulseVector?.x)} {formatMetric(stats?.anchorSnapImpulseVector?.z)}</span>
        <span>adot {formatMetric(stats?.anchorSnapDirectionDot)}</span>
        <span>asqueeze {formatMetric(stats?.anchorFinalSqueeze)}</span>
        <span>apreview {formatMetric(stats?.anchorReleasePreviewStrength)}</span>
        <span>avel {formatMetric(stats?.anchorPostReleaseVelocity)}</span>
        <span>acool {formatMetric(stats?.anchorPostReleaseControlTimer)}</span>
        <span>acurve {formatMetric(stats?.anchorPostReleaseControlCurve)}</span>
        <span>apop {formatMetric(stats?.anchorPopJuice)}</span>
        <span>agrace {formatMetric(stats?.anchorReattachGraceTimer)}</span>
        <span>acvar {stats?.reattachChainVariant ?? 'mid'}</span>
        <span>aradius {formatMetric(stats?.anchorReattachAssistRadius)}</span>
        <span>aangle {formatMetric(stats?.anchorReattachAssistAngle)}</span>
        <span>acone {formatMetric(stats?.anchorReattachAssistDirection?.x)} {formatMetric(stats?.anchorReattachAssistDirection?.z)}</span>
        <span>asame {formatMetric(stats?.anchorReattachCooldownTimer)}</span>
        <span>acand {stats?.anchorReattachCandidateMoteId ?? -1}</span>
        <span>acfit {formatMetric(stats?.anchorReattachCandidateScore)}</span>
        <span>arej {stats?.anchorReattachRejectedCandidateMoteId ?? -1}:{stats?.anchorReattachRejectedCandidateReason ?? 'none'} {formatMetric(stats?.anchorReattachRejectedCandidateScore)}</span>
        <span>aassist {formatMetric(stats?.anchorReattachAssistStrength)}</span>
        <span>acatch {formatMetric(stats?.anchorReattachCatchPulse)}</span>
        <span>achain {stats?.anchorReattachCatchCount ?? 0}</span>
        <span>anew {stats?.anchorReattachLastCatchTargetId ?? -1}</span>
        <span>apile {stats?.anchorReleaseTargetPileIndex ?? -1}</span>
        <span>newpile {stats?.anchorReattachLastCatchPileIndex ?? -1}</span>
        <span>aage {formatMetric(stats?.anchorAttachAge)}</span>
        <span>adrift {formatMetric(stats?.anchorDrift)}</span>
        <span>amax {formatMetric(stats?.anchorMaxDrift)}</span>
        <span>alock {formatMetric(stats?.anchorLockDrift)}</span>
        <span>alockmax {formatMetric(stats?.anchorMaxLockDrift)}</span>
        <span>adrift! {stats?.anchorDriftViolationCount ?? 0}</span>
        <span>abite {formatMetric(stats?.anchorSealCompressionTimer)}</span>
        <span>apulse {formatMetric(stats?.anchorSealSnapPulse)}</span>
        <span>areason {stats?.anchorReleaseReason ?? 'none'}</span>
	        <span>glug {formatMetric(stats?.glugPulse)}</span>
	        <span>event {formatMetric(stats?.glugEventStrength)}</span>
	        <span>fail {formatMetric(stats?.glugFailedStrength)}</span>
	        <span>bridge {stats?.bridgeActive ? 'on' : 'off'} {formatMetric(stats?.bridgeLength)}</span>
	        <span>thick {formatMetric(stats?.bridgeThickness)}</span>
	        <span>bstrain {formatMetric(stats?.bridgeStrain)}</span>
	        <span>quality {formatMetric(stats?.sealQuality)}</span>
	        <span>embed {stats?.embedState ?? 'none'}</span>
	        <span>depth {formatMetric(stats?.embedDepth)}</span>
	        <span>elock {formatMetric(stats?.embedLockStrength)}</span>
	        <span>ethresh {formatMetric(stats?.embedSnapThreshold)}</span>
	        <span>eangle {formatMetric(stats?.embedAnglePenalty)}</span>
	        <span>etension {formatMetric(stats?.embedTensionPenalty)}</span>
	        <span>erelease {stats?.embedReleaseReason ?? 'none'}</span>
	        <span>eglugs {stats?.embedGlugCount ?? 0}</span>
	        <span>emass {formatMetric(stats?.embedMassTransferred)}</span>
	        <span>epulse {formatMetric(stats?.embedPocketPulse)}</span>
	        <span>target {typeof stats?.sealTargetMoteId === 'number' ? stats.sealTargetMoteId : -1}</span>
	        <span>tpile {typeof stats?.sealTargetPileIndex === 'number' ? stats.sealTargetPileIndex : -1}</span>
	        <span>patch {stats?.contactPatch ? `${stats.contactPatch.x.toFixed(1)},${stats.contactPatch.z.toFixed(1)}` : 'none'}</span>
	        <span>mouth {stats?.mouthSurfaceContactState ?? 'floating'}</span>
	        <span>hphase {stats?.hoseSlimeInteractionPhase ?? 'idle'}</span>
	        <span>mdist {formatMetric(stats?.mouthSurfaceDistance)}</span>
	        <span>mcomp {formatMetric(stats?.mouthSurfaceCompression)}</span>
	        <span>mring {formatMetric(stats?.mouthSealRing)}</span>
	        <span>mfloat {formatMetric(stats?.mouthFloatingWarning)}</span>
	        <span>hnear {formatMetric(stats?.hoseSlimeNear)}</span>
	        <span>htouch {formatMetric(stats?.hoseSlimeTouch)}</span>
	        <span>hgul {formatMetric(stats?.hoseSlimeGulp)}</span>
	        <span>hpop {formatMetric(stats?.hoseSlimePop)}</span>
	        <span>gtimer {formatMetric(stats?.glugTimer)}</span>
	        <span>last {formatMetric(stats?.lastGlugTime)}</span>
	        <span>gcount {stats?.glugCountThisAttachment ?? 0}</span>
	        <span>gmass {formatMetric(stats?.glugEventMass)}</span>
	        <span>smass {formatMetric(stats?.currentSlimeMass)}</span>
	        <span>live {formatMetric(stats?.slimePhysics?.avgLivingPulse)}</span>
	        <span>creep {formatMetric(stats?.slimePhysics?.avgLivingCreep)}</span>
	        <span>congeal {formatMetric(stats?.slimePhysics?.avgLivingCongeal)}</span>
	        <span>split {formatMetric(stats?.slimePhysics?.avgLivingBreak)}</span>
	        <span>moved {formatMetric(stats?.massTransferredThisAttachment)}</span>
	        <span>bag {formatMetric(stats?.bagFill)}</span>
	        <span>bfill {formatMetric(stats?.bagFillAmount)}</span>
	        <span>bnorm {formatMetric(stats?.bagFillNormalized)}</span>
	        <span>blast {formatMetric(stats?.bagLastMassReceived)}</span>
	        <span>bpulse {formatMetric(stats?.bagPulse)}</span>
	        <span>bink {formatMetric(stats?.bagOutlineShock)}</span>
	        <span>bshock {formatMetric(stats?.bagShockwave)}</span>
	        <span>bwob {formatMetric(stats?.bagWobble)}</span>
	        <span>bpress {formatMetric(stats?.bagPressure)}</span>
	        <span>bglow {formatMetric(stats?.bagGlow)}</span>
	        <span>bbulge {formatMetric(stats?.bagNonUniformBulge)}</span>
	        <span>bscale {stats?.currentBagScale ? `${stats.currentBagScale.x.toFixed(1)},${stats.currentBagScale.y.toFixed(1)}` : '1.0,1.0'}</span>
	        <span>bglugs {stats?.bagGlugCountThisTest ?? 0}</span>
	        <span>nearfull {stats?.bagNearFull ? 'yes' : 'no'}</span>
	        <span>combo {stats?.slimeComboCount ?? 0}</span>
	        <span>cbest {stats?.slimeComboBest ?? 0}</span>
	        <span>cpulse {formatMetric(stats?.slimeComboPulse)}</span>
	        <span>cshock {formatMetric(stats?.slimeComboShockwave)}</span>
	        <span>attached {flow?.isAttached ? 'yes' : 'no'}</span>
	        <span>chain {flow?.currentChainLength ?? 0}</span>
	        <span>bestchain {flow?.bestChainLength ?? 0}</span>
	        <span>aratio {formatMetric(flow?.attachRatio)}</span>
	        <span>unatt {formatMetric(flow?.totalUnattachedTime)}</span>
	        <span>snaprt {formatMetric(flow?.snapToReattachTime)}</span>
	        <span>bestrt {formatMetric(flow?.bestSnapToReattachTime)}</span>
	        <span>mom {formatMetric(flow?.momentumRetainedRatio)}</span>
	        <span>dead {flow?.deadStopCount ?? 0}</span>
	        <span>fglugs {flow?.totalGlugCount ?? 0}</span>
	        <span>gatt {flow?.glugsThisAttachment ?? 0}</span>
	        <span>fmass {formatMetric(flow?.slimeMassConsumedThisAttachment)}</span>
	        <span>sealavg {formatMetric(flow?.averageSealStrengthThisAttachment)}</span>
	        <span>clean {flow?.cleanSnapCount ?? 0}</span>
	        <span>messy {flow?.messySnapCount ?? 0}</span>
	        <span>bagflow {formatMetric(flow?.bagFillGainedThisChain)}</span>
	        <span>break {flow?.chainBreakReason ?? 'none'}</span>
	        <span>gattempt {flow?.gripAttemptCount ?? 0}</span>
	        <span>glatch {flow?.gripLatchCount ?? 0}</span>
	        <span>grelease {flow?.gripReleaseCount ?? 0}</span>
	        <span>gperfect {flow?.gripPerfectReleaseCount ?? 0}</span>
	        <span>gspinout {flow?.gripSpinoutCount ?? 0}</span>
	        <span>gmissed {flow?.gripMissedReleaseCount ?? 0}</span>
	        <span>gbest {formatMetric(flow?.gripBestReleaseQuality)}</span>
	        <span>glast {flow?.gripLastReleaseReason ?? 'none'}</span>
	        <span>level {stats?.levelState ?? 'boot'}</span>
	        <span>diff {stats?.levelDifficulty ?? 'normal'}</span>
	        <span>phase {stats?.completionAnimationPhase ?? 'idle'}</span>
	        <span>start {formatMetric(stats?.slimeMassStart)}</span>
	        <span>remain {formatMetric(stats?.slimeMassRemaining)}</span>
	        <span>vslime {stats?.slimeVacuumableVisibleCount ?? 0}</span>
	        <span>tiny {stats?.slimeVacuumableTinyCount ?? 0}</span>
	        <span>stuck {stats?.slimeVacuumableStrandedCount ?? 0}</span>
	        <span>resfx {stats?.slimeVisualEffectResidueCount ?? 0}</span>
	        <span>clear {formatMetric(stats?.completionPercent)}</span>
	        <span>target {formatMetric(stats?.levelClearTarget)}</span>
	        <span>towin {formatMetric(stats?.levelProgressTowardTarget)}</span>
	        <span>ptarget {formatMetric(stats?.levelPartyTarget)}</span>
	        <span>party {formatMetric(stats?.levelPartyProgress)}</span>
	        <span>plight {formatMetric(stats?.levelProgressLighting)}</span>
	        <span>regen {formatMetric(stats?.levelRegenPressure)}</span>
	        <span>rrate {formatMetric(stats?.levelRegenRate)}</span>
	        <span>grow {formatMetric(stats?.levelSlimeGenerationRate)}</span>
	        <span>buds {stats?.levelSlimeGenerationBudCount ?? 0}</span>
	        <span>gpieces {stats?.levelSlimeGenerationActivePieces ?? 0}</span>
	        <span>gsup {formatMetric(stats?.levelSlimeGenerationSuppression)}</span>
	        <span>rpulse {formatMetric(stats?.levelRegenResetPulse)}</span>
	        <span>rbank {formatMetric(stats?.levelRegenBank)}</span>
	        <span>rmass {formatMetric(stats?.levelRegeneratedMass)}</span>
	        <span>cleaner {formatMetric(stats?.levelCleanupAssist)}</span>
	        <span>globs {stats?.majorGlobsRemaining ?? 0}</span>
	        <span>near {stats?.nearComplete ? 'yes' : 'no'}</span>
	        <span>done {stats?.completionTriggered ? 'yes' : 'no'}</span>
	        <span>ltime {formatMetric(stats?.timeInLevel)}</span>
	        <span>lsum {stats?.levelCompletionSummary ? `${stats.levelCompletionSummary.totalGlugs}g` : 'none'}</span>
	      </div>
      <nav aria-label="Production dev modes">
        {PRODUCTION_DEV_MODES.map((item) => (
          <a key={item.id} className={item.id === mode.id ? 'active' : undefined} href={withMode(item.id)}>
            {item.label}
          </a>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => {
          const params = new URLSearchParams(window.location.search)
          params.set('mode', mode.id)
          params.set('dev', '1')
          params.set('reset', String(Date.now()))
          window.location.href = `${window.location.pathname}?${params.toString()}`
        }}
      >
        Reset Mode
      </button>
    </aside>
  )
}
