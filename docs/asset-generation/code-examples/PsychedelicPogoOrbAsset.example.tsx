import { useFrame } from '@react-three/fiber'
import { forwardRef, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'

export type PsychedelicPogoOrbMode = 'full' | 'body' | 'limbs' | 'face' | 'debug-rig'
export type PsychedelicPogoOrbAnimation =
  | 'still'
  | 'idle'
  | 'walk'
  | 'walk-2'
  | 'run'
  | 'stop'
  | 'hop'
  | 'forward-hop'
  | 'ball-bounce'
  | 'forward-ball-bounce'
  | 'reference-ball-bounce'
  | 'disco-point'
  | 'carlton-groove'
  | 'overhead-shimmy'
  | 'pogo-boogie'
  | 'ledge-fall'
  | 'reference-bounce'
export type PsychedelicPogoOrbExpression =
  | 'auto'
  | 'neutral'
  | 'happy'
  | 'blink'
  | 'squash'
  | 'surprised'
  | 'focused'
  | 'delighted'
  | 'effort'
type ConcretePogoOrbExpression = Exclude<PsychedelicPogoOrbExpression, 'auto'>
export type PsychedelicPogoOrbDebugMaterial =
  | 'none'
  | 'flat'
  | 'uv'
  | 'bands'
  | 'glow-off'
  | 'face-contrast'
  | 'super-psychedelic'
  | 'silhouette'

export type PsychedelicPogoOrbAssetProps = {
  mode?: PsychedelicPogoOrbMode
  animation?: PsychedelicPogoOrbAnimation
  activity?: number
  glowIntensity?: number
  colorCycleSpeed?: number
  colorCycleOffset?: number
  expression?: PsychedelicPogoOrbExpression
  debugMaterial?: PsychedelicPogoOrbDebugMaterial
  scale?: number
  position?: [number, number, number]
  phaseOverride?: number
  phaseOffset?: number
  animationTimeScale?: number
  transitionFromAnimation?: PsychedelicPogoOrbAnimation
  transitionFromActivity?: number
  transitionFromPhaseOverride?: number
  transitionBlend?: number
  verticalMotionScale?: number
}

function isJumpAssetAnimation(animation: PsychedelicPogoOrbAnimation) {
  return (
    animation === 'hop' ||
    animation === 'forward-hop' ||
    animation === 'ball-bounce' ||
    animation === 'forward-ball-bounce' ||
    animation === 'reference-ball-bounce' ||
    animation === 'reference-bounce' ||
    animation === 'ledge-fall'
  )
}

type PogoMotion = {
  phase: number
  prep: number
  compress: number
  launch: number
  airborne: number
  airProgress: number
  toeOff: number
  landingReach: number
  stretch: number
  land: number
  recovery: number
  bodyX: number
  bodyY: number
  bodyScaleX: number
  bodyScaleY: number
  bodyScaleZ: number
  bodyRotateZ: number
  bodyRotateX: number
  kneeOut: number
  legBend: number
  footPlant: number
  footRoll: number
  footSplay: number
  toeLift: number
  impactBurst: number
  legStretch: number
  armStretch: number
  armLag: number
  faceSquash: number
  shadowScale: number
  shadowOpacity: number
  glowPulse: number
  walk: number
  walkTravel: number
  shoeForward: number
  run: number
  forwardHop: number
  idleHop: number
  travelDirection: number
  idleStartX: number
  idleEndX: number
  idleTransfer: number
  idleReset: number
  pushLoad: number
  landLoad: number
  ballForm?: number
  limbAbsorb?: number
  limbMelt?: number
  socketMerge?: number
  charge?: number
  dive?: number
  reboundBoost?: number
  ballSpin?: number
  ballSpinForward?: number
  ballShock?: number
  faceHide?: number
  limbBodyY?: number
  discoPoint?: number
  carltonGroove?: number
  overheadShimmy?: number
  combinedDance?: number
}

const INK = '#17121f'
const FACE_INK = '#100b17'
const FACE_HIGHLIGHT = '#fff5cc'
const FACE_PATCH = '#f0fff2'
const SHADOW = '#1a1226'
const RIG_BLUE = '#5ce7ff'
const RIG_PINK = '#ff5fd2'
const RIG_YELLOW = '#ffe45c'

const Z_AXIS = new THREE.Vector3(0, 0, 1)
const X_AXIS = new THREE.Vector3(1, 0, 0)
const HIP_BLEND_OFFSET = new THREE.Vector3(0, -0.005, -0.055)
const SHOULDER_BLEND_OFFSET = new THREE.Vector3(0, 0, -0.045)
const HOSE_LENGTH_SEGMENTS = 18
const HOSE_RADIAL_SEGMENTS = 16
const LEG_HOSE_RADIUS = 0.108
const ARM_HOSE_RADIUS = 0.086
const SHOE_CONTACT_FLOOR_Y = -2.075
const SHOE_CONTACT_CLEARANCE = 0.018
const SHOE_LOCAL_BOTTOM_Y = -0.72
const POGO_BOOGIE_TIMING = {
  discoEnd: 0.23,
  discoToCarltonEnd: 0.32,
  carltonEnd: 0.49,
  carltonToWalkEnd: 0.58,
  walkEnd: 0.715,
  walkToOverheadEnd: 0.825,
  overheadEnd: 0.95,
}
const POGO_BOOGIE_DISCO_START_PHASE = 0.04
const POGO_BOOGIE_DISCO_HOLD_CYCLES = 2.18
const POGO_BOOGIE_DISCO_BRIDGE_EXIT_PHASE = 0.66
const POGO_BOOGIE_CARLTON_START_PHASE = 0.18
const POGO_BOOGIE_CARLTON_HOLD_CYCLES = 1.7
const POGO_BOOGIE_CARLTON_BRIDGE_EXIT_PHASE = POGO_BOOGIE_CARLTON_START_PHASE + POGO_BOOGIE_CARLTON_HOLD_CYCLES + 0.2
const POGO_BOOGIE_RUNNING_MAN_START_PHASE = 0.04
const POGO_BOOGIE_RUNNING_MAN_HOLD_CYCLES = 1.55
const POGO_BOOGIE_OVERHEAD_ENTRY_PHASE = 0.28
const POGO_BOOGIE_OVERHEAD_EXIT_PHASE = 1.34
const POGO_BOOGIE_OVERHEAD_WRAP_PHASE = 1.52

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function dampFactor(strength: number, delta: number) {
  return 1 - Math.exp(-strength * Math.min(0.05, Math.max(0, delta)))
}

function smoothstep01(value: number) {
  const amount = clamp01(value)
  return amount * amount * (3 - 2 * amount)
}

function smootherstep01(value: number) {
  const amount = clamp01(value)
  return amount * amount * amount * (amount * (amount * 6 - 15) + 10)
}

function pulse01(value: number, center: number, width: number) {
  return smoothstep01(1 - Math.abs(value - center) / width)
}

function softPulse01(value: number, center: number, width: number) {
  return smootherstep01(1 - Math.abs(value - center) / width)
}

function circularDistance(value: number, center: number) {
  return Math.abs((((value - center + 0.5) % 1) + 1) % 1 - 0.5)
}

function circularSignedDistance(value: number, center: number) {
  return (((value - center + 0.5) % 1) + 1) % 1 - 0.5
}

function circularPulse01(value: number, center: number, width: number) {
  return smoothstep01(1 - circularDistance(value, center) / width)
}

function circularSoftPulse01(value: number, center: number, width: number) {
  return smootherstep01(1 - circularDistance(value, center) / width)
}

function smoothWindow(value: number, start: number, end: number, edge: number) {
  return smoothstep01((value - start) / edge) * (1 - smoothstep01((value - end) / edge))
}

function getAnimationPeriod(animation: PsychedelicPogoOrbAnimation) {
  if (animation === 'idle') return 1.22
  if (animation === 'walk') return 0.96
  if (animation === 'walk-2') return 1.04
  if (animation === 'run') return 0.64
  if (animation === 'stop') return 0.46
  if (animation === 'forward-hop') return 1.02
  if (animation === 'ball-bounce') return 1.08
  if (animation === 'forward-ball-bounce') return 1.96
  if (animation === 'reference-ball-bounce') return 1.96
  if (animation === 'disco-point') return 1.24
  if (animation === 'carlton-groove') return 1.12
  if (animation === 'overhead-shimmy') return 0.96
  if (animation === 'pogo-boogie') return 11.4
  if (animation === 'ledge-fall') return 0.82
  if (animation === 'reference-bounce') return 1.32
  return 1.12
}

function markCombinedDanceMotion(motion: PogoMotion, phase: number, disco = 0, carlton = 0, overhead = 0): PogoMotion {
  return {
    ...motion,
    phase,
    discoPoint: disco,
    carltonGroove: carlton,
    overheadShimmy: overhead,
    combinedDance: 1,
  }
}

function getCombinedDanceMotion(phase: number, amount: number): PogoMotion {
  const { discoEnd, discoToCarltonEnd, carltonEnd, carltonToWalkEnd, walkEnd, walkToOverheadEnd, overheadEnd } =
    POGO_BOOGIE_TIMING
  const discoPhase = ((phase / discoEnd) * POGO_BOOGIE_DISCO_HOLD_CYCLES + POGO_BOOGIE_DISCO_START_PHASE) % 1
  const carltonHoldT = clamp01((phase - discoToCarltonEnd) / (carltonEnd - discoToCarltonEnd))
  const carltonPhase = (carltonHoldT * POGO_BOOGIE_CARLTON_HOLD_CYCLES + POGO_BOOGIE_CARLTON_START_PHASE) % 1
  const walkHoldT = clamp01((phase - carltonToWalkEnd) / (walkEnd - carltonToWalkEnd))
  const walkPhase = (walkHoldT * POGO_BOOGIE_RUNNING_MAN_HOLD_CYCLES + POGO_BOOGIE_RUNNING_MAN_START_PHASE) % 1
  const overheadHoldT = clamp01((phase - walkToOverheadEnd) / (overheadEnd - walkToOverheadEnd))
  const overheadPhase =
    POGO_BOOGIE_OVERHEAD_ENTRY_PHASE +
    overheadHoldT * (POGO_BOOGIE_OVERHEAD_EXIT_PHASE - POGO_BOOGIE_OVERHEAD_ENTRY_PHASE)
  const getRunningManMotion = (runningPhase: number) => {
    const motion = getPogoMotion(0, 'walk', amount, runningPhase)
    const beat = runningPhase * Math.PI * 2
    const doubleBeat = runningPhase * Math.PI * 4
    const punchSnap = Math.max(circularPulse01(runningPhase, 0.04, 0.12), circularPulse01(runningPhase, 0.54, 0.12))
    const kneePop = Math.max(circularPulse01(runningPhase, 0.27, 0.18), circularPulse01(runningPhase, 0.77, 0.18))

    return {
      ...motion,
      bodyX: motion.bodyX * 0.42 + Math.sin(beat + 0.35) * 0.045 * amount,
      bodyY: motion.bodyY + Math.max(0, Math.sin(doubleBeat - 0.32)) * 0.08 * amount,
      bodyRotateZ: motion.bodyRotateZ * 0.58 + Math.sin(beat + 0.4) * 0.115 * amount,
      bodyRotateX: motion.bodyRotateX + 0.065 * amount + punchSnap * 0.03,
      bodyScaleX: motion.bodyScaleX + punchSnap * 0.02,
      bodyScaleY: motion.bodyScaleY + kneePop * 0.035,
      armStretch: clamp01(0.4 + motion.armStretch * 0.55 + punchSnap * 0.34),
      armLag: motion.armLag * 0.6 + Math.sin(beat + 0.25) * 0.36,
      glowPulse: motion.glowPulse + punchSnap * 0.28 + kneePop * 0.12,
    }
  }

  if (phase < discoEnd) {
    return markCombinedDanceMotion(getDiscoPointMotion(discoPhase, amount), phase, 1, 0, 0)
  }

  if (phase < discoToCarltonEnd) {
    const t = (phase - discoEnd) / (discoToCarltonEnd - discoEnd)
    const bridge = smootherstep01(t)
    const bridgeArc = Math.sin(t * Math.PI)
    const fromMotion = getDiscoPointMotion(
      THREE.MathUtils.lerp((POGO_BOOGIE_DISCO_START_PHASE + POGO_BOOGIE_DISCO_HOLD_CYCLES) % 1, POGO_BOOGIE_DISCO_BRIDGE_EXIT_PHASE, t),
      amount,
    )
    const toMotion = getCarltonGrooveMotion(THREE.MathUtils.lerp(0.84, POGO_BOOGIE_CARLTON_START_PHASE, bridge), amount)
    const motion = blendPogoMotion(fromMotion, toMotion, bridge)
    motion.bodyX += Math.sin(t * Math.PI * 2 - 0.45) * 0.032 * amount
    motion.bodyY += bridgeArc * 0.12 * amount
    motion.bodyRotateZ += bridgeArc * -0.08 * amount
    motion.bodyRotateX += bridgeArc * 0.028 * amount
    motion.glowPulse += bridgeArc * 0.22
    return markCombinedDanceMotion(motion, phase, 1 - bridge, bridge, 0)
  }

  if (phase < carltonEnd) {
    return markCombinedDanceMotion(getCarltonGrooveMotion(carltonPhase, amount), phase, 0, 1, 0)
  }

  if (phase < carltonToWalkEnd) {
    const t = (phase - carltonEnd) / (carltonToWalkEnd - carltonEnd)
    const bridge = smootherstep01(t)
    const bridgeArc = Math.sin(t * Math.PI)
    const fromMotion = getCarltonGrooveMotion(
      THREE.MathUtils.lerp(
        POGO_BOOGIE_CARLTON_START_PHASE + POGO_BOOGIE_CARLTON_HOLD_CYCLES,
        POGO_BOOGIE_CARLTON_BRIDGE_EXIT_PHASE,
        t,
      ),
      amount,
    )
    const toMotion = getRunningManMotion(THREE.MathUtils.lerp(0.9, POGO_BOOGIE_RUNNING_MAN_START_PHASE, bridge))
    const motion = blendPogoMotion(fromMotion, toMotion, bridge)
    motion.bodyY += bridgeArc * 0.055 * amount
    motion.bodyRotateX += bridgeArc * 0.028 * amount
    motion.bodyRotateZ += bridgeArc * 0.035 * amount
    motion.glowPulse += bridgeArc * 0.18
    return markCombinedDanceMotion(motion, phase, 0, 1 - bridge, 0)
  }

  if (phase < walkEnd) {
    return markCombinedDanceMotion(getRunningManMotion(walkPhase), phase, 0, 0, 0)
  }

  if (phase < walkToOverheadEnd) {
    const t = (phase - walkEnd) / (walkToOverheadEnd - walkEnd)
    const bridge = smootherstep01(t)
    const bridgeArc = Math.sin(t * Math.PI)
    const fromMotion = getRunningManMotion(
      THREE.MathUtils.lerp(
        (POGO_BOOGIE_RUNNING_MAN_START_PHASE + POGO_BOOGIE_RUNNING_MAN_HOLD_CYCLES) % 1,
        0.96,
        t,
      ),
    )
    const toMotion = getOverheadShimmyMotion(THREE.MathUtils.lerp(0.02, POGO_BOOGIE_OVERHEAD_ENTRY_PHASE, bridge), amount)
    const motion = blendPogoMotion(fromMotion, toMotion, bridge)
    motion.bodyY += bridgeArc * 0.16 * amount
    motion.bodyRotateX += bridgeArc * 0.06 * amount
    motion.bodyRotateZ += bridgeArc * 0.06 * amount
    motion.glowPulse += bridgeArc * 0.22
    return markCombinedDanceMotion(motion, phase, 0, 0, bridge)
  }

  if (phase < overheadEnd) {
    return markCombinedDanceMotion(getOverheadShimmyMotion(overheadPhase, amount), phase, 0, 0, 1)
  }

  const t = (phase - overheadEnd) / (1 - overheadEnd)
  const bridge = smootherstep01(t)
  const bridgeArc = Math.sin(t * Math.PI)
  const fromMotion = getOverheadShimmyMotion(
    THREE.MathUtils.lerp(POGO_BOOGIE_OVERHEAD_EXIT_PHASE, POGO_BOOGIE_OVERHEAD_WRAP_PHASE, t),
    amount,
  )
  const toMotion = getDiscoPointMotion(
    (THREE.MathUtils.lerp(0.82, POGO_BOOGIE_DISCO_START_PHASE + 1, bridge) % 1 + 1) % 1,
    amount,
  )
  const motion = blendPogoMotion(fromMotion, toMotion, bridge)
  motion.bodyY += bridgeArc * 0.14 * amount
  motion.bodyRotateZ += bridgeArc * 0.08 * amount
  motion.bodyRotateX += bridgeArc * 0.035 * amount
  motion.glowPulse += bridgeArc * 0.2
  return markCombinedDanceMotion(motion, phase, bridge, 0, 1 - bridge)
}

function getDiscoPointMotion(phase: number, amount: number): PogoMotion {
  const intensity = Math.min(1.3, amount * 1.1)
  const sweepToHorizontal = smootherstep01((phase - 0.14) / 0.16)
  const horizontalHold = smoothWindow(phase, 0.27, 0.6, 0.08)
  const leftWiden = smootherstep01((phase - 0.34) / 0.14) * (1 - smootherstep01((phase - 0.6) / 0.05))
  const snapUp = smootherstep01((phase - 0.62) / 0.14)
  const pointHigh = phase < 0.14 ? 1 : phase < 0.62 ? 1 - sweepToHorizontal : snapUp
  const horizontalPoint = phase < 0.14 ? 0 : phase < 0.62 ? sweepToHorizontal : 1 - snapUp
  const hardTurn = circularPulse01(phase, 0.62, 0.08)
  const skyHit = Math.max(circularPulse01(phase, 0.78, 0.12), circularPulse01(phase, 0.02, 0.1))
  const shoulderShimmy = Math.sin(phase * Math.PI * 4 + 0.25)
  const hipCounter = THREE.MathUtils.lerp(0.72, -0.68, pointHigh) + hardTurn * 0.22 - horizontalPoint * 0.1 - leftWiden * 0.18
  const floorDip = clamp01(horizontalPoint * 0.32 + horizontalHold * 0.2 + leftWiden * 0.2 + hardTurn * 0.52 + Math.max(0, -shoulderShimmy) * 0.12)
  const toeGlint = Math.max(circularPulse01(phase, 0.34, 0.11), circularPulse01(phase, 0.72, 0.1))

  return {
    phase,
    prep: floorDip * 0.12 * intensity,
    compress: floorDip * 0.2 * intensity,
    launch: skyHit * 0.18 * intensity,
    airborne: 0,
    airProgress: 0,
    toeOff: toeGlint * 0.26 * intensity,
    landingReach: 0,
    stretch: clamp01((pointHigh * 0.16 + horizontalPoint * 0.18 + skyHit * 0.24) * intensity),
    land: floorDip * 0.1 * intensity,
    recovery: skyHit * 0.18 * intensity,
    bodyX: hipCounter * 0.12 * intensity,
    bodyY: 0.08 + skyHit * 0.065 - floorDip * 0.052 + hardTurn * 0.035 + Math.max(0, shoulderShimmy) * 0.026,
    bodyScaleX: 1 + floorDip * 0.058 - skyHit * 0.022,
    bodyScaleY: 1 - floorDip * 0.064 + pointHigh * 0.04 + skyHit * 0.044,
    bodyScaleZ: 1 + floorDip * 0.018 - skyHit * 0.012,
    bodyRotateZ: (-0.34 * pointHigh + horizontalPoint * 0.18 + leftWiden * 0.16 - hardTurn * 0.08 - skyHit * 0.06 + hipCounter * 0.05) * intensity,
    bodyRotateX: (0.09 + pointHigh * 0.035 + horizontalPoint * 0.04 + shoulderShimmy * 0.018) * intensity,
    kneeOut: 0.48 + floorDip * 0.34 + toeGlint * 0.1,
    legBend: 0.5 + floorDip * 0.24 + toeGlint * 0.08,
    footPlant: 1,
    footRoll: hipCounter * 0.12 + toeGlint * 0.08 - hardTurn * 0.04,
    footSplay: clamp01(0.28 + floorDip * 0.32 + skyHit * 0.12),
    toeLift: clamp01(toeGlint * 0.34 + skyHit * 0.08),
    impactBurst: floorDip * 0.12 + skyHit * 0.08,
    legStretch: clamp01(0.08 + skyHit * 0.08 - floorDip * 0.035),
    armStretch: clamp01(0.54 + pointHigh * 0.28 + horizontalPoint * 0.4 + skyHit * 0.16),
    armLag: horizontalPoint * -0.34 + leftWiden * -0.24 + skyHit * 0.42 + hardTurn * 0.28 + shoulderShimmy * 0.08,
    faceSquash: floorDip * 0.12,
    shadowScale: 1.02 + floorDip * 0.18 - skyHit * 0.08,
    shadowOpacity: clamp01(0.22 + floorDip * 0.08),
    glowPulse: pointHigh * 0.28 + horizontalPoint * 0.22 + toeGlint * 0.24 + skyHit * 0.38 + hardTurn * 0.12,
    walk: 0,
    walkTravel: 0,
    shoeForward: 0,
    run: 0,
    forwardHop: 0,
    idleHop: 0,
    travelDirection: 0,
    idleStartX: 0,
    idleEndX: 0,
    idleTransfer: 0,
    idleReset: 0,
    pushLoad: 0,
    landLoad: 0,
    discoPoint: intensity,
  }
}

function getCarltonGrooveMotion(phase: number, amount: number): PogoMotion {
  const intensity = Math.min(1.3, amount * 1.1)
  const beat = phase * Math.PI * 2
  const sideGroove = Math.sin(beat)
  const sideLean = Math.sin(beat - 0.18)
  const centerPulse = 1 - Math.abs(sideGroove)
  const crossSweep = Math.sin(beat + 0.18)
  const bounce = smootherstep01((Math.cos(beat * 2 - 0.18) + 1) * 0.5)
  const shoulderPop = Math.max(circularPulse01(phase, 0.16, 0.15), circularPulse01(phase, 0.66, 0.15))
  const handSnap = Math.max(circularPulse01(phase, 0.26, 0.13), circularPulse01(phase, 0.76, 0.13))
  const kneeDip = clamp01(0.22 + centerPulse * 0.38 + bounce * 0.32 + shoulderPop * 0.08)

  return {
    phase,
    prep: kneeDip * 0.08 * intensity,
    compress: kneeDip * 0.18 * intensity,
    launch: shoulderPop * 0.14 * intensity,
    airborne: 0,
    airProgress: 0,
    toeOff: handSnap * 0.22 * intensity,
    landingReach: 0,
    stretch: clamp01((shoulderPop * 0.18 + handSnap * 0.14 + Math.abs(crossSweep) * 0.04) * intensity),
    land: kneeDip * 0.08 * intensity,
    recovery: shoulderPop * 0.13 * intensity,
    bodyX: (sideGroove * 0.19 + crossSweep * 0.05) * intensity,
    bodyY: 0.07 + shoulderPop * 0.085 - kneeDip * 0.068 + Math.max(0, -Math.cos(beat * 2)) * 0.032,
    bodyScaleX: 1 + kneeDip * 0.056 - shoulderPop * 0.018 + Math.abs(crossSweep) * 0.012,
    bodyScaleY: 1 - kneeDip * 0.076 + shoulderPop * 0.06,
    bodyScaleZ: 1 + kneeDip * 0.02,
    bodyRotateZ: (-sideLean * 0.38 + crossSweep * 0.12 + shoulderPop * Math.sign(sideGroove || 1) * 0.05) * intensity,
    bodyRotateX: (0.13 + kneeDip * 0.045 + Math.sin(beat + 0.7) * 0.04 + shoulderPop * 0.03) * intensity,
    kneeOut: 0.5 + kneeDip * 0.44 + handSnap * 0.1,
    legBend: 0.54 + kneeDip * 0.32 + centerPulse * 0.1,
    footPlant: 1,
    footRoll: sideGroove * 0.18 + handSnap * 0.09,
    footSplay: clamp01(0.3 + kneeDip * 0.3 + shoulderPop * 0.14),
    toeLift: clamp01(handSnap * 0.34 + centerPulse * 0.14),
    impactBurst: kneeDip * 0.1 + shoulderPop * 0.08,
    legStretch: clamp01(0.06 + shoulderPop * 0.1 + handSnap * 0.04 - kneeDip * 0.025),
    armStretch: clamp01(0.5 + centerPulse * 0.24 + shoulderPop * 0.22 + handSnap * 0.16),
    armLag: -crossSweep * 0.72 + shoulderPop * 0.14 + Math.sin(beat * 2 - 0.45) * 0.14,
    faceSquash: kneeDip * 0.08,
    shadowScale: 1.02 + kneeDip * 0.17 - shoulderPop * 0.06,
    shadowOpacity: clamp01(0.22 + kneeDip * 0.08),
    glowPulse: shoulderPop * 0.36 + handSnap * 0.26 + bounce * 0.14,
    walk: 0,
    walkTravel: 0,
    shoeForward: 0,
    run: 0,
    forwardHop: 0,
    idleHop: 0,
    travelDirection: 0,
    idleStartX: 0,
    idleEndX: 0,
    idleTransfer: 0,
    idleReset: 0,
    pushLoad: 0,
    landLoad: 0,
    carltonGroove: intensity,
  }
}

function getOverheadShimmyMotion(phase: number, amount: number): PogoMotion {
  const intensity = Math.min(1.28, amount * 1.1)
  const beat = phase * Math.PI * 2
  const footWave = Math.sin(beat - 0.78)
  const hipWave = Math.sin(beat)
  const torsoWave = Math.sin(beat + 0.58)
  const shoulderWave = Math.sin(beat + 1.04)
  const crownWave = Math.sin(beat + 1.42)
  const ripple = Math.sin(beat * 3 + 0.2)
  const flutter = Math.max(circularPulse01(phase, 0.18, 0.11), circularPulse01(phase, 0.68, 0.11))
  const toeSwitch = Math.max(circularPulse01(phase, 0.3, 0.13), circularPulse01(phase, 0.8, 0.13))
  const bodyCrest = Math.max(0, crownWave)
  const kneeDip = clamp01(0.22 + (1 - Math.abs(footWave)) * 0.32 + Math.max(0, -torsoWave) * 0.18)

  return {
    phase,
    prep: kneeDip * 0.08 * intensity,
    compress: kneeDip * 0.16 * intensity,
    launch: bodyCrest * 0.1 * intensity + flutter * 0.04 * intensity,
    airborne: 0,
    airProgress: 0,
    toeOff: toeSwitch * 0.3 * intensity,
    landingReach: 0,
    stretch: clamp01((bodyCrest * 0.17 + flutter * 0.08 + Math.max(0, ripple) * 0.06) * intensity),
    land: kneeDip * 0.08 * intensity,
    recovery: bodyCrest * 0.1 * intensity + flutter * 0.08 * intensity,
    bodyX: (hipWave * 0.15 + shoulderWave * 0.07) * intensity,
    bodyY: 0.08 + bodyCrest * 0.082 + toeSwitch * 0.04 - kneeDip * 0.058 + Math.max(0, ripple) * 0.022,
    bodyScaleX: 1 + kneeDip * 0.05 - bodyCrest * 0.024 + Math.abs(hipWave) * 0.024,
    bodyScaleY: 1 - kneeDip * 0.072 + bodyCrest * 0.068,
    bodyScaleZ: 1 + kneeDip * 0.018 - bodyCrest * 0.012,
    bodyRotateZ: (hipWave * 0.22 + shoulderWave * 0.2 + ripple * 0.03) * intensity,
    bodyRotateX: (0.09 + kneeDip * 0.03 + torsoWave * 0.055 + crownWave * 0.03) * intensity,
    kneeOut: 0.46 + kneeDip * 0.28 + toeSwitch * 0.12,
    legBend: 0.52 + kneeDip * 0.24 + toeSwitch * 0.08,
    footPlant: 1,
    footRoll: footWave * 0.13 + toeSwitch * 0.08,
    footSplay: clamp01(0.22 + kneeDip * 0.24 + toeSwitch * 0.12),
    toeLift: clamp01(toeSwitch * 0.36 + bodyCrest * 0.12),
    impactBurst: kneeDip * 0.08 + toeSwitch * 0.08,
    legStretch: clamp01(0.08 + bodyCrest * 0.08 + toeSwitch * 0.04 - kneeDip * 0.02),
    armStretch: clamp01(0.66 + bodyCrest * 0.18 + flutter * 0.08 + Math.abs(shoulderWave) * 0.08),
    armLag: shoulderWave * 0.38 + crownWave * 0.16 + ripple * 0.08,
    faceSquash: kneeDip * 0.08,
    shadowScale: 1.02 + kneeDip * 0.15 - bodyCrest * 0.055,
    shadowOpacity: clamp01(0.22 + kneeDip * 0.07),
    glowPulse: bodyCrest * 0.26 + flutter * 0.18 + toeSwitch * 0.18 + Math.abs(ripple) * 0.1,
    walk: 0,
    walkTravel: 0,
    shoeForward: 0,
    run: 0,
    forwardHop: 0,
    idleHop: 0,
    travelDirection: 0,
    idleStartX: 0,
    idleEndX: 0,
    idleTransfer: 0,
    idleReset: 0,
    pushLoad: 0,
    landLoad: 0,
    overheadShimmy: intensity,
  }
}

function getBallBounceMotion(phase: number, amount: number, forward: boolean): PogoMotion {
  const intensity = Math.min(forward ? 1.42 : 1.36, amount * (forward ? 1.13 : 1.08))
  const anticipation = smoothWindow(phase, 0.06, 0.2, 0.055) * intensity
  const pullIn = smoothWindow(phase, 0.16, 0.36, 0.055) * intensity
  const pullSnap = pulse01(phase, 0.235, 0.075) * intensity
  const lockedBall = smoothWindow(phase, 0.28, 0.74, 0.09) * intensity
  const charge = pulse01(phase, 0.37, 0.15) * intensity
  const dive = smootherstep01((phase - 0.42) / 0.16) * (1 - smootherstep01((phase - 0.67) / 0.08)) * intensity
  const impact = pulse01(phase, 0.665, 0.07) * intensity
  const rebound = smoothWindow(phase, 0.68, 0.98, 0.09) * intensity
  const unroll = smootherstep01((phase - 0.78) / 0.18)
  const riseT = clamp01(phase / 0.34)
  const chargeT = clamp01((phase - 0.3) / 0.14)
  const diveT = clamp01((phase - 0.42) / 0.24)
  const reboundT = clamp01((phase - 0.68) / 0.32)
  const inheritedArc = 2.55 + Math.sin(riseT * Math.PI * 0.5) * 1.05
  const stallArc = THREE.MathUtils.lerp(inheritedArc, 3.72, smootherstep01(chargeT))
  const diveDrop = Math.pow(diveT, 2.25) * 3.95
  const reboundArc = Math.sin(reboundT * Math.PI * 0.72) * 5.42
  const bodyY = phase < 0.42 ? stallArc - charge * 0.12 : phase < 0.68 ? Math.max(0, stallArc - diveDrop) : reboundArc
  const ballForm = clamp01(lockedBall + pullIn * 0.65 - unroll * 0.7)
  const limbAbsorb = clamp01(pullIn + lockedBall * 0.72)
  const limbMelt = clamp01(smootherstep01((phase - 0.22) / 0.14) * (1 - unroll * 0.85))
  const preImpactStretch = pulse01(phase, 0.59, 0.075) * intensity
  const impactSquash = impact * 1.18
  const reboundStretch = pulse01(phase, 0.73, 0.11) * 1.08 * intensity
  const airborne = clamp01(smoothWindow(phase, 0.02, 0.99, 0.06) * intensity)
  const airProgress = clamp01(phase)

  return {
    phase,
    prep: anticipation * 0.36,
    compress: impactSquash,
    launch: clamp01(reboundStretch * 0.6 + pullSnap * 0.18),
    airborne,
    airProgress,
    toeOff: clamp01(reboundStretch * 0.42 + pullSnap * 0.08),
    landingReach: clamp01(impact * 0.7 + dive * 0.2),
    stretch: clamp01(preImpactStretch * 0.6 + reboundStretch * 0.78),
    land: impact,
    recovery: rebound,
    bodyX: forward ? Math.sin(phase * Math.PI * 2.2) * 0.035 * intensity : Math.sin(phase * Math.PI * 3) * 0.018 * intensity,
    bodyY,
    bodyScaleX: 1 + impactSquash * 0.62 - reboundStretch * 0.22 - preImpactStretch * 0.18 - ballForm * 0.018,
    bodyScaleY: 1 - impactSquash * 0.68 + reboundStretch * 0.72 + preImpactStretch * 0.42 + charge * 0.018,
    bodyScaleZ: 1 + impactSquash * 0.22 - reboundStretch * 0.08 + ballForm * 0.02,
    bodyRotateZ: (anticipation * -0.08 + pullSnap * 0.12 - impact * 0.1 + rebound * 0.05) * (forward ? 0.45 : 1),
    bodyRotateX: (forward ? 0.22 : 0.03) + dive * (forward ? 0.38 : 0.14) - impact * 0.08,
    kneeOut: 0.46 + anticipation * 0.44 + impact * 0.8 - ballForm * 0.18,
    legBend: 0.52 + anticipation * 0.34 + impact * 0.72 - ballForm * 0.16,
    footPlant: clamp01(impact * 1.2 + reboundStretch * 0.12 - airborne * 0.55),
    footRoll: anticipation * 0.12 + impact * 0.28 - reboundStretch * 0.12,
    footSplay: clamp01(anticipation * 0.22 + impact * 0.44 + ballForm * 0.08),
    toeLift: clamp01(pullSnap * 0.36 + dive * 0.16 + reboundStretch * 0.5),
    impactBurst: clamp01(impact * 1.2 + reboundStretch * 0.18),
    legStretch: clamp01(anticipation * 0.36 + preImpactStretch * 0.46 + reboundStretch * 0.58 - limbAbsorb * 0.28),
    armStretch: clamp01(anticipation * 0.48 + pullSnap * 0.18 + reboundStretch * 0.36 - limbAbsorb * 0.22),
    armLag: anticipation * -0.26 + pullSnap * 0.72 + dive * 0.38 - impact * 0.18 + rebound * 0.24,
    faceSquash: impactSquash * 0.94 + charge * 0.18,
    shadowScale: Math.max(0.18, 1.18 + impact * 0.58 + dive * 0.18 - clamp01(bodyY / 5.4) * 0.92),
    shadowOpacity: clamp01(0.28 + impact * 0.15 + dive * 0.06 - clamp01(bodyY / 5.4) * 0.24),
    glowPulse: charge * 0.72 + pullSnap * 0.24 + dive * 0.34 + impact * 0.46 + rebound * 0.26,
    walk: 0,
    walkTravel: 0,
    shoeForward: 1,
    run: 0,
    forwardHop: forward ? 1 : 0,
    idleHop: 0,
    travelDirection: forward ? 1 : 0,
    idleStartX: 0,
    idleEndX: 0,
    idleTransfer: 0,
    idleReset: 0,
    pushLoad: 0,
    landLoad: 0,
    ballForm,
    limbAbsorb,
    limbMelt,
    socketMerge: clamp01(limbMelt * 0.78 + charge * 0.42 + impact * 0.3),
    charge,
    dive,
    reboundBoost: rebound,
    ballSpin: phase * (forward ? 2.9 : 3.55) + dive * 0.38 + rebound * 0.16,
    ballSpinForward: forward ? 0.86 : 0.14,
    ballShock: impact,
    faceHide: clamp01(ballForm * 0.86 + dive * 0.28 - unroll * 0.9),
  }
}

function getReferenceBallBounceMotion(phase: number, amount: number, forward = false): PogoMotion {
  const forwardDrive = forward ? 1 : 0
  const referencePeakPhase = 0.532
  const wrapStartPhase = 0.215
  const splitPeakEnd = 0.405
  const wrapPeakPhase = 0.405
  const dropStartPhase = 0.345
  const impactPhase = forward ? 0.562 : 0.57
  const reboundPeak = forward ? 0.728 : 0.71
  const descentStartPhase = 0.77
  const getReferenceRiseMotion = (combinedPhase: number) => {
    const referencePhase = THREE.MathUtils.lerp(0, referencePeakPhase, smootherstep01(combinedPhase / splitPeakEnd))
    return getPogoMotion(0, 'reference-bounce', amount, referencePhase)
  }
  const referenceMotionAtPeak = getPogoMotion(0, 'reference-bounce', amount, referencePeakPhase)

  if (phase <= wrapStartPhase) {
    const riseMotion = getReferenceRiseMotion(phase)
    const riseT = smootherstep01(phase / wrapStartPhase)

    return {
      ...riseMotion,
      bodyX: riseMotion.bodyX + Math.sin(riseT * Math.PI) * 0.012 * forwardDrive,
      bodyRotateX: riseMotion.bodyRotateX + riseT * 0.09 * forwardDrive,
      bodyRotateZ: riseMotion.bodyRotateZ * (1 - forwardDrive * 0.18),
      armLag: riseMotion.armLag + riseT * 0.08 * forwardDrive,
      forwardHop: forwardDrive,
      shoeForward: Math.max(riseMotion.shoeForward, forwardDrive),
      travelDirection: forwardDrive,
    }
  }

  if (phase >= descentStartPhase) {
    const descentT = clamp01((phase - descentStartPhase) / (1 - descentStartPhase))
    const referencePhase = THREE.MathUtils.lerp(referencePeakPhase, 1, descentT)
    const referenceMotion = getPogoMotion(0, 'reference-bounce', amount, referencePhase)
    const highPeakY = referenceMotionAtPeak.bodyY + 2.82 * amount
    const extraHeight = (highPeakY - referenceMotionAtPeak.bodyY) * (1 - descentT)
    const bodyY = referenceMotion.bodyY + extraHeight
    const limbCarry = smootherstep01(descentT / 0.18)
    const limbBodyY = THREE.MathUtils.lerp(highPeakY, referenceMotion.bodyY, limbCarry)
    const height01 = clamp01(bodyY / Math.max(0.001, highPeakY))
    const forwardAirReach = forwardDrive * (1 - smootherstep01(descentT / 0.42))
    const forwardLean = forwardDrive * (0.1 + (1 - descentT) * 0.12)

    return {
      ...referenceMotion,
      phase: referencePhase,
      bodyX: referenceMotion.bodyX + Math.sin(referencePhase * Math.PI * 2 + 0.5) * 0.012 * forwardDrive,
      bodyY,
      limbBodyY,
      bodyRotateX: referenceMotion.bodyRotateX + forwardLean,
      bodyRotateZ: referenceMotion.bodyRotateZ * (1 - forwardDrive * 0.28),
      legStretch: clamp01(referenceMotion.legStretch + forwardAirReach * 0.08),
      armStretch: clamp01(referenceMotion.armStretch + forwardAirReach * 0.1),
      armLag: referenceMotion.armLag + forwardAirReach * 0.18,
      shadowScale: Math.max(0.14, referenceMotion.shadowScale - height01 * 0.32),
      shadowOpacity: clamp01(referenceMotion.shadowOpacity - height01 * 0.08),
      walkTravel: 0,
      shoeForward: 1,
      forwardHop: forwardDrive,
      travelDirection: forwardDrive,
      ballForm: 0,
      limbAbsorb: 0,
      limbMelt: 0,
      socketMerge: 0,
      charge: 0,
      dive: 0,
      reboundBoost: height01,
      ballSpin: 0,
      ballSpinForward: 0,
      ballShock: 0,
      faceHide: 0,
    }
  }

  const transitionT = clamp01((phase - wrapStartPhase) / (impactPhase - wrapStartPhase))
  const wrapT = clamp01((phase - wrapStartPhase) / (wrapPeakPhase - wrapStartPhase))
  const forceDropT = clamp01((phase - dropStartPhase) / (impactPhase - dropStartPhase))
  const spinT = clamp01((phase - wrapStartPhase) / 0.31)
  const morphT = wrapT
  const dropT = forceDropT
  const reboundT = clamp01((phase - impactPhase) / (reboundPeak - impactPhase))
  const spinEase = smootherstep01(spinT)
  const morphEase = smootherstep01(morphT)
  const wrapEase = smootherstep01(wrapT)
  const dropEase = clamp01(0.52 * Math.pow(forceDropT, 1.28) + 0.48 * smootherstep01(forceDropT))
  const reboundEase = 1 - Math.pow(1 - reboundT, 1.92)
  const openingStartPhase = forward ? 0.708 : impactPhase + 0.055
  const openingT = clamp01((phase - openingStartPhase) / (descentStartPhase - openingStartPhase))
  const openingEase = smootherstep01(openingT)
  const spinReleaseEase = smootherstep01(clamp01(openingT / 0.82))
  const openRollEase = smootherstep01(clamp01((openingT - 0.03) / 0.97))
  const openRollFloat = Math.sin(openRollEase * Math.PI)
  const apexFloatT = clamp01((phase - reboundPeak) / (descentStartPhase - reboundPeak))
  const apexFloatEase = smootherstep01(apexFloatT)
  const apexHang = phase >= reboundPeak ? Math.sin(apexFloatT * Math.PI) : 0
  const sealedBallForm = clamp01(morphEase * 0.98 + transitionT * 0.1 + reboundT * 0.42)
  const ballForm = clamp01(sealedBallForm * (1 - openingEase))
  const limbMelt = clamp01((morphEase * 0.98 + transitionT * 0.1) * (1 - openingEase))
  const openPosePhase = THREE.MathUtils.lerp(phase, referencePeakPhase, openingEase)
  const openAirProgress = THREE.MathUtils.lerp(phase, referenceMotionAtPeak.airProgress, openingEase)
  const impact = softPulse01(phase, impactPhase, forward ? 0.078 : 0.064)
  const wrapSqueeze = pulse01(phase, 0.355, forward ? 0.18 : 0.16)
  const dropStretch =
    softPulse01(phase, forward ? 0.52 : 0.53, forward ? 0.11 : 0.088) *
    (1 - smootherstep01((phase - (impactPhase + 0.018)) / 0.052))
  const reboundStretch =
    softPulse01(phase, forward ? 0.66 : 0.646, forward ? 0.15 : 0.13) *
    smootherstep01((phase - impactPhase) / 0.036) *
    (1 - openingEase * (forward ? 0.32 : 0.45))
  const referenceRiseMotion = getReferenceRiseMotion(Math.min(phase, splitPeakEnd))
  const wrapBaseMotion = phase < dropStartPhase ? referenceRiseMotion : referenceMotionAtPeak
  const firstPeakY = referenceMotionAtPeak.bodyY
  const maxPowerBoost = (forward ? 4.4 : 2.82) * amount
  const highPeakY = firstPeakY + maxPowerBoost
  const wrapLiftHeight = 1.08 * amount
  const dropStartRiseMotion = getReferenceRiseMotion(dropStartPhase)
  const dropStartWrapEase = smootherstep01((dropStartPhase - wrapStartPhase) / (wrapPeakPhase - wrapStartPhase))
  const wrapLift = wrapEase * wrapLiftHeight
  const wrapApexY = THREE.MathUtils.lerp(dropStartRiseMotion.bodyY, firstPeakY, dropStartWrapEase * 0.38) + dropStartWrapEase * wrapLiftHeight
  const impactSquashScale = forward ? 1.08 : 0.98
  const reboundStretchScale = forward ? 1.12 : 1.02
  const ballScaleX = 1 + impact * 0.9 * impactSquashScale + wrapSqueeze * 0.12 - reboundStretch * 0.26 * reboundStretchScale - dropStretch * 0.1 - dropT * 0.018
  const ballScaleY = 1 - impact * 0.54 * impactSquashScale - wrapSqueeze * 0.06 + reboundStretch * 0.92 * reboundStretchScale + dropStretch * 0.36
  const ballScaleZ = 1 + impact * 0.86 * impactSquashScale + wrapSqueeze * 0.28 - reboundStretch * 0.045 + dropStretch * 0.18
  const rawBodyScaleX = THREE.MathUtils.lerp(wrapBaseMotion.bodyScaleX, ballScaleX, morphEase)
  const rawBodyScaleY = THREE.MathUtils.lerp(wrapBaseMotion.bodyScaleY, ballScaleY, morphEase)
  const rawBodyScaleZ = THREE.MathUtils.lerp(wrapBaseMotion.bodyScaleZ, ballScaleZ, morphEase)
  const openedPeakScaleX = referenceMotionAtPeak.bodyScaleX + ballForm * 0.04
  const openedPeakScaleY = referenceMotionAtPeak.bodyScaleY - ballForm * 0.03
  const openedPeakScaleZ = referenceMotionAtPeak.bodyScaleZ + ballForm * 0.035
  const openFloatStretch = apexHang * (1 - ballForm) * 0.055
  const bodyScaleX = THREE.MathUtils.clamp(THREE.MathUtils.lerp(rawBodyScaleX, openedPeakScaleX, openingEase) - openFloatStretch * 0.38, 0.64, forward ? 2.05 : 1.86)
  const bodyScaleY = THREE.MathUtils.clamp(THREE.MathUtils.lerp(rawBodyScaleY, openedPeakScaleY, openingEase) + openFloatStretch, 0.42, forward ? 2.18 : 2.02)
  const bodyScaleZ = THREE.MathUtils.clamp(THREE.MathUtils.lerp(rawBodyScaleZ, openedPeakScaleZ, openingEase) - openFloatStretch * 0.16, 0.92, forward ? 2.02 : 1.78)
  const impactBite = impact * 0.17
  const ballFloorCenterY = SHOE_CONTACT_FLOOR_Y + bodyScaleY * 1.072 - impactBite
  const dropY = THREE.MathUtils.lerp(wrapApexY, ballFloorCenterY, dropEase)
  const reboundY = THREE.MathUtils.lerp(ballFloorCenterY, highPeakY, reboundEase)
  const dropSpin = spinEase * 1.52 + forceDropT * 2.35 + forwardDrive * forceDropT * 0.52
  const impactSpinCatch = smootherstep01((phase - 0.515) / 0.07)
  const reboundSpinRelease = smootherstep01((phase - 0.608) / 0.205)
  const impactAlignedSpin = 3.5 + reboundT * 0.18
  const ballSpin = THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(dropSpin, impactAlignedSpin, impactSpinCatch),
    4.08 + reboundT * 0.76 + forwardDrive * 0.34,
    reboundSpinRelease,
  )
  const slamSpinVisibility = smootherstep01((phase - 0.365) / 0.115)
  const visibleBallSpin = ballSpin * slamSpinVisibility * (1 - spinReleaseEase)
  const visibleBallSpinForward = THREE.MathUtils.lerp(0.18, 0.34, forwardDrive) * slamSpinVisibility * (1 - spinReleaseEase)
  const openRollVisible = openRollFloat * (1 - ballForm * 0.42)
  const floatRollVisible = apexHang * (1 - ballForm)
  const forwardLean = forwardDrive * (0.1 + dropT * 0.18 + reboundT * 0.08 + openRollVisible * 0.09 - impact * 0.04)
  const rawBodyRotateZ = referenceMotionAtPeak.bodyRotateZ * (1 - forwardDrive * 0.25) + spinEase * (0.16 - forwardDrive * 0.04) - impact * 0.08
  const rawBodyRotateX = referenceMotionAtPeak.bodyRotateX + wrapSqueeze * -0.05 + dropT * 0.28 - impact * 0.06 + forwardLean
  const openBodyRotateZ = referenceMotionAtPeak.bodyRotateZ * (1 - forwardDrive * 0.25) + openRollVisible * 0.115 + floatRollVisible * 0.055
  const openBodyRotateX =
    referenceMotionAtPeak.bodyRotateX -
    openRollVisible * 0.085 +
    floatRollVisible * 0.045 +
    forwardDrive * (0.16 + openRollVisible * 0.08 + apexHang * 0.06)
  const bodyRotateZ = THREE.MathUtils.lerp(rawBodyRotateZ, openBodyRotateZ, openRollEase)
  const bodyRotateX = THREE.MathUtils.lerp(rawBodyRotateX, openBodyRotateX, openRollEase)
  const floatedReboundY = highPeakY + apexHang * 0.34 * amount - apexFloatEase * apexHang * 0.055 * amount
  const bodyY =
    phase < dropStartPhase
      ? THREE.MathUtils.lerp(wrapBaseMotion.bodyY, firstPeakY, wrapEase * 0.38) + wrapLift
      : phase < impactPhase
        ? Math.max(ballFloorCenterY, dropY)
        : phase < reboundPeak
          ? reboundY
          : floatedReboundY
  const openingLimbBodyY = THREE.MathUtils.lerp(bodyY, referenceMotionAtPeak.bodyY, openingEase)
  const gracefulLimbReach = openRollVisible * (1 - ballForm * 0.3)

  return {
    ...wrapBaseMotion,
    phase: openPosePhase,
    prep: 0,
    compress: impact * (forward ? 2.15 : 1.68),
    launch: reboundStretch * (forward ? 1.24 : 1.02),
    airborne: 1.28,
    airProgress: openAirProgress,
    toeOff: reboundStretch * 0.58,
    landingReach: clamp01(impact * 0.5 + forwardDrive * reboundT * 0.08),
    stretch: clamp01(reboundStretch * 1.08 + dropStretch * 0.4 + apexHang * 0.14 + forwardDrive * (reboundStretch * 0.24 + apexHang * 0.08)),
    land: impact,
    recovery: reboundStretch * 0.32,
    bodyX: Math.sin(phase * Math.PI * 4.4) * THREE.MathUtils.lerp(0.018, 0.01, forwardDrive) + Math.sin(phase * Math.PI * 1.2 - 0.3) * 0.012 * forwardDrive,
    bodyY,
    limbBodyY: openingLimbBodyY,
    bodyScaleX,
    bodyScaleY,
    bodyScaleZ,
    bodyRotateZ,
    bodyRotateX,
    kneeOut: THREE.MathUtils.lerp(THREE.MathUtils.lerp(wrapBaseMotion.kneeOut, 0.36, morphEase), referenceMotionAtPeak.kneeOut, openingEase * 0.86),
    legBend: THREE.MathUtils.lerp(THREE.MathUtils.lerp(wrapBaseMotion.legBend, 0.46, morphEase), referenceMotionAtPeak.legBend, openingEase * 0.82),
    footPlant: 0,
    footRoll: 0,
    footSplay: 0,
    toeLift: 0,
    impactBurst: impact,
    legStretch: THREE.MathUtils.lerp(
      wrapBaseMotion.legStretch * (1 - morphEase),
      referenceMotionAtPeak.legStretch + openingEase * 0.2 + gracefulLimbReach * 0.14 + forwardDrive * (dropT * 0.04 + gracefulLimbReach * 0.04),
      openingEase,
    ),
    armStretch: THREE.MathUtils.lerp(
      wrapBaseMotion.armStretch * (1 - morphEase),
      referenceMotionAtPeak.armStretch + openingEase * 0.18 + gracefulLimbReach * 0.18 + forwardDrive * (dropT * 0.04 + gracefulLimbReach * 0.05),
      openingEase,
    ),
    armLag:
      wrapBaseMotion.armLag * (1 - morphEase) +
      spinEase * 0.42 +
      dropT * 0.26 -
      impact * 0.1 -
      openingEase * 0.18 +
      gracefulLimbReach * 0.22 +
      forwardDrive * (dropT * 0.16 + reboundT * 0.1 + gracefulLimbReach * 0.1),
    faceSquash: impact * (forward ? 1.18 : 0.9),
    shadowScale: Math.max(0.14, 1.08 + impact * (forward ? 1.05 : 0.78) - clamp01(bodyY / highPeakY) * 0.94),
    shadowOpacity: clamp01(0.25 + impact * (forward ? 0.3 : 0.22) - clamp01(bodyY / highPeakY) * 0.24),
    glowPulse: spinEase * 0.32 + wrapSqueeze * 0.28 + dropT * 0.3 + impact * (forward ? 0.9 : 0.72) + reboundStretch * 0.42,
    walk: 0,
    walkTravel: 0,
    shoeForward: 1,
    run: 0,
    forwardHop: forwardDrive,
    idleHop: 0,
    travelDirection: forwardDrive,
    idleStartX: 0,
    idleEndX: 0,
    idleTransfer: 0,
    idleReset: 0,
    pushLoad: 0,
    landLoad: 0,
    ballForm,
    limbAbsorb: ballForm,
    limbMelt,
    socketMerge: clamp01(limbMelt * 0.9 + impact * 0.28),
    charge: spinEase,
    dive: dropT,
    reboundBoost: reboundT,
    ballSpin: visibleBallSpin,
    ballSpinForward: visibleBallSpinForward,
    ballShock: impact,
    faceHide: clamp01(ballForm * 0.45),
  }
}

export function getPogoMotion(
  time: number,
  animation: PsychedelicPogoOrbAnimation,
  activity = 1,
  phaseOverride?: number,
): PogoMotion {
  const amount = Math.min(1.3, Math.max(0, activity))

  if (animation === 'still' || amount <= 0) {
    return {
      phase: phaseOverride ?? 0,
      prep: 0,
      compress: 0,
      launch: 0,
      airborne: 0,
      airProgress: 0,
      toeOff: 0,
      landingReach: 0,
      stretch: 0,
      land: 0,
      recovery: 0,
      bodyX: 0,
      bodyY: 0,
      bodyScaleX: 1,
      bodyScaleY: 1,
      bodyScaleZ: 1,
      bodyRotateZ: 0,
      bodyRotateX: 0,
      kneeOut: 0.34,
      legBend: 0.46,
      footPlant: 1,
      footRoll: 0,
      footSplay: 0,
      toeLift: 0,
      impactBurst: 0,
      legStretch: 0,
      armStretch: 0,
      armLag: 0,
      faceSquash: 0,
      shadowScale: 1,
      shadowOpacity: 0.22,
      glowPulse: 0,
      walk: 0,
      walkTravel: 0,
      shoeForward: 0,
      run: 0,
      forwardHop: 0,
      idleHop: 0,
      travelDirection: 0,
      idleStartX: 0,
      idleEndX: 0,
      idleTransfer: 0,
      idleReset: 0,
      pushLoad: 0,
      landLoad: 0,
    }
  }

  const period = getAnimationPeriod(animation)
  const phase = phaseOverride === undefined ? (time / period) % 1 : ((phaseOverride % 1) + 1) % 1

  if (animation === 'ball-bounce') {
    return getBallBounceMotion(phase, amount, false)
  }

  if (animation === 'forward-ball-bounce') {
    return getReferenceBallBounceMotion(phase, amount, true)
  }

  if (animation === 'reference-ball-bounce') {
    return getReferenceBallBounceMotion(phase, amount, false)
  }

  if (animation === 'disco-point') {
    return getDiscoPointMotion(phase, amount)
  }

  if (animation === 'carlton-groove') {
    return getCarltonGrooveMotion(phase, amount)
  }

  if (animation === 'overhead-shimmy') {
    return getOverheadShimmyMotion(phase, amount)
  }

  if (animation === 'pogo-boogie') {
    return getCombinedDanceMotion(phase, amount)
  }

  if (animation === 'ledge-fall') {
    const t = smootherstep01(phase)
    const surprise = smoothWindow(phase, 0.02, 0.38, 0.16) * amount
    const reach = smoothWindow(phase, 0.12, 0.72, 0.22) * amount
    const fallSettle = smoothstep01((phase - 0.34) / 0.5) * amount
    const legDangle = clamp01(reach * 0.72 + fallSettle * 0.34)
    const armFlail = clamp01(surprise * 0.9 + reach * 0.46)

    return {
      phase,
      prep: surprise * 0.12,
      compress: 0,
      launch: 0,
      airborne: clamp01(0.72 + fallSettle * 0.28),
      airProgress: phase,
      toeOff: surprise * 0.22,
      landingReach: 0,
      stretch: clamp01(reach * 0.2 + fallSettle * 0.1),
      land: 0,
      recovery: 0,
      bodyX: Math.sin(t * Math.PI * 1.4) * 0.035 * amount,
      bodyY: 0.1 - t * 0.18,
      bodyScaleX: 1 - reach * 0.035 + surprise * 0.025,
      bodyScaleY: 1 + reach * 0.07 - surprise * 0.035,
      bodyScaleZ: 1 - reach * 0.02,
      bodyRotateZ: -0.13 * amount + Math.sin(t * Math.PI * 1.8) * 0.06 * amount,
      bodyRotateX: 0.16 * amount + fallSettle * 0.12,
      kneeOut: 0.44 + legDangle * 0.16,
      legBend: 0.46 + legDangle * 0.22,
      footPlant: 0,
      footRoll: -0.1 - surprise * 0.08,
      footSplay: clamp01(0.16 + surprise * 0.22),
      toeLift: clamp01(0.38 + surprise * 0.24),
      impactBurst: 0,
      legStretch: clamp01(0.28 + legDangle * 0.36),
      armStretch: clamp01(0.36 + armFlail * 0.44),
      armLag: -0.38 * amount + Math.sin(t * Math.PI * 2.2) * 0.16 * amount,
      faceSquash: -surprise * 0.3,
      shadowScale: 0.82,
      shadowOpacity: 0.1,
      glowPulse: surprise * 0.16,
      walk: 0,
      walkTravel: 0,
      shoeForward: 0,
      run: 0,
      forwardHop: 0,
      idleHop: 0,
      travelDirection: 0,
      idleStartX: 0,
      idleEndX: 0,
      idleTransfer: 0,
      idleReset: 0,
      pushLoad: 0,
      landLoad: 0,
    }
  }

  if (animation === 'walk-2') {
    const intensity = Math.min(1.24, amount * 1.1)
    const step = Math.sin(phase * Math.PI * 2)
    const stepCos = Math.cos(phase * Math.PI * 2)
    const halfPhase = (phase * 2) % 1
    const walkBounce = Math.pow(Math.sin(halfPhase * Math.PI), 0.74) * intensity
    const contactLeft = circularSoftPulse01(phase, 0.035, 0.145)
    const contactRight = circularSoftPulse01(phase, 0.535, 0.145)
    const contact = Math.max(contactLeft, contactRight) * intensity
    const passing = Math.max(softPulse01(phase, 0.28, 0.285), softPulse01(phase, 0.78, 0.285)) * intensity
    const toePush = Math.max(softPulse01(phase, 0.375, 0.19), softPulse01(phase, 0.875, 0.19)) * intensity
    const footLift = Math.max(softPulse01(phase, 0.72, 0.24), circularSoftPulse01(phase, 0.22, 0.24)) * intensity
    const heelCatch = contact
    const bodyDrive = Math.sin(phase * Math.PI * 4 + 0.35) * 0.018
    const bodySquash = clamp01(contact * 0.86 + toePush * 0.1 - walkBounce * 0.1 - passing * 0.16)
    const bodyStretch = clamp01(walkBounce * 0.34 + passing * 0.38 + toePush * 0.3 + footLift * 0.12 - contact * 0.14)

    return {
      phase,
      prep: bodySquash * 0.2,
      compress: bodySquash * 0.22,
      launch: toePush * 0.24,
      airborne: 0,
      airProgress: phase,
      toeOff: toePush * 0.42,
      landingReach: heelCatch * 0.36,
      stretch: bodyStretch * 0.2 + toePush * 0.035,
      land: bodySquash * 0.18,
      recovery: bodyStretch * 0.18 + toePush * 0.05,
      bodyX: -step * 0.014 * intensity + Math.sin(phase * Math.PI * 4 + 0.3) * 0.005,
      bodyY: 0.028 + walkBounce * 0.07 + passing * 0.032 + toePush * 0.028 - bodySquash * 0.118,
      bodyScaleX: 1 + bodySquash * 0.115 - bodyStretch * 0.045,
      bodyScaleY: 1 - bodySquash * 0.15 + bodyStretch * 0.13,
      bodyScaleZ: 1 + bodySquash * 0.06 - bodyStretch * 0.04,
      bodyRotateZ: (-step * 0.04 + bodyDrive * 0.62) * intensity,
      bodyRotateX: (0.14 + stepCos * 0.06 + toePush * 0.052 - bodySquash * 0.04) * intensity,
      kneeOut: 0.52 + contact * 0.2 + passing * 0.34 + walkBounce * 0.06,
      legBend: 0.64 + contact * 0.18 + passing * 0.32 + walkBounce * 0.06,
      footPlant: 1,
      footRoll: step * 0.028 + toePush * 0.16 - heelCatch * 0.04,
      footSplay: clamp01(0.13 + contact * 0.13 + passing * 0.07),
      toeLift: clamp01(toePush * 0.3 + passing * 0.2 + footLift * 0.22),
      impactBurst: clamp01(bodySquash * 0.1),
      legStretch: clamp01(passing * 0.38 + toePush * 0.2 + walkBounce * 0.08),
      armStretch: clamp01(0.2 + passing * 0.28 + toePush * 0.18 + walkBounce * 0.06),
      armLag: -step * 0.28 + Math.sin(phase * Math.PI * 4 - 0.2) * 0.045,
      faceSquash: bodySquash * 0.16,
      shadowScale: 1.08 + bodySquash * 0.085 + bodyStretch * 0.032,
      shadowOpacity: clamp01(0.25 + bodySquash * 0.035),
      glowPulse: bodySquash * 0.065 + bodyStretch * 0.06 + toePush * 0.055,
      walk: 1,
      walkTravel: 1,
      shoeForward: 1,
      run: 0,
      forwardHop: 0,
      idleHop: 0,
      travelDirection: 1,
      idleStartX: 0,
      idleEndX: 0,
      idleTransfer: 0,
      idleReset: 0,
      pushLoad: 0,
      landLoad: 0,
    }
  }

  if (animation === 'run') {
    const intensity = Math.min(1.3, amount * 1.18)
    const step = Math.sin(phase * Math.PI * 2)
    const stepCos = Math.cos(phase * Math.PI * 2)
    const halfPhase = (phase * 2) % 1
    const runBounce = Math.pow(Math.sin(halfPhase * Math.PI), 0.78) * intensity
    const contactLeft = circularSoftPulse01(phase, 0.035, 0.108)
    const contactRight = circularSoftPulse01(phase, 0.535, 0.108)
    const contact = Math.max(contactLeft, contactRight) * intensity
    const load = Math.max(softPulse01(phase, 0.13, 0.15), softPulse01(phase, 0.63, 0.15)) * intensity
    const push = Math.max(softPulse01(phase, 0.275, 0.16), softPulse01(phase, 0.775, 0.16)) * intensity
    const passing = Math.max(softPulse01(phase, 0.395, 0.18), softPulse01(phase, 0.895, 0.18)) * intensity
    const airborneRun = Math.max(softPulse01(phase, 0.4, 0.22), circularSoftPulse01(phase, 0.9, 0.22)) * intensity
    const reach = Math.max(softPulse01(phase, 0.47, 0.14), circularSoftPulse01(phase, 0.97, 0.14)) * intensity
    const anticipation = Math.max(softPulse01(phase, 0.49, 0.12), circularSoftPulse01(phase, 0.99, 0.12)) * intensity
    const bodySquash = clamp01(contact * 0.42 + load * 0.78 + anticipation * 0.16 - runBounce * 0.1)
    const bodyStretch = clamp01(push * 0.48 + runBounce * 0.34 + airborneRun * 0.28 + passing * 0.2 + reach * 0.14 - load * 0.16)
    const torsoJive = Math.sin(phase * Math.PI * 4 + 0.48) * 0.025

    return {
      phase,
      prep: anticipation * 0.2,
      compress: bodySquash * 0.38,
      launch: push * 0.42,
      airborne: airborneRun,
      airProgress: phase,
      toeOff: push * 0.68,
      landingReach: contact * 0.44 + anticipation * 0.22,
      stretch: bodyStretch * 0.34,
      land: bodySquash * 0.32,
      recovery: passing * 0.2 + airborneRun * 0.1 + push * 0.08,
      bodyX: -step * 0.024 * intensity + Math.sin(phase * Math.PI * 4 + 0.2) * 0.008,
      bodyY: 0.14 + runBounce * 0.28 + airborneRun * 0.2 + push * 0.12 + bodyStretch * 0.08 - bodySquash * 0.26,
      bodyScaleX: 1 + bodySquash * 0.18 - bodyStretch * 0.09 + contact * 0.015,
      bodyScaleY: 1 - bodySquash * 0.235 + bodyStretch * 0.28,
      bodyScaleZ: 1 + bodySquash * 0.09 - bodyStretch * 0.055,
      bodyRotateZ: (-step * 0.058 + torsoJive) * intensity,
      bodyRotateX: (0.32 + stepCos * 0.065 + push * 0.08 - bodySquash * 0.048 + reach * 0.03) * intensity,
      kneeOut: 0.58 + bodySquash * 0.36 + passing * 0.24 + airborneRun * 0.1,
      legBend: 0.68 + bodySquash * 0.46 + passing * 0.3 - push * 0.08,
      footPlant: clamp01(contact * 1.1 + load * 1.15 + push * 0.72 + anticipation * 0.16),
      footRoll: step * 0.035 + push * 0.34 - contact * 0.12,
      footSplay: clamp01(0.16 + bodySquash * 0.22 + passing * 0.1),
      toeLift: clamp01(push * 0.62 + passing * 0.34 + airborneRun * 0.22 - contact * 0.1),
      impactBurst: clamp01(bodySquash * 0.18 + contact * 0.08),
      legStretch: clamp01(push * 0.46 + airborneRun * 0.5 + reach * 0.28 + passing * 0.18 - bodySquash * 0.14),
      armStretch: clamp01(0.24 + airborneRun * 0.38 + push * 0.28 + passing * 0.2),
      armLag: -step * 0.48 + Math.sin(phase * Math.PI * 4 - 0.35) * 0.1,
      faceSquash: bodySquash * 0.26,
      shadowScale: Math.max(0.72, 1.06 + bodySquash * 0.18 - airborneRun * 0.24 + passing * 0.04),
      shadowOpacity: clamp01(0.26 + bodySquash * 0.055 - airborneRun * 0.08),
      glowPulse: bodySquash * 0.1 + push * 0.12 + airborneRun * 0.06,
      walk: 1,
      walkTravel: 1,
      shoeForward: 1,
      run: 1,
      forwardHop: 0,
      idleHop: 0,
      travelDirection: 1,
      idleStartX: 0,
      idleEndX: 0,
      idleTransfer: 0,
      idleReset: 0,
      pushLoad: 0,
      landLoad: 0,
    }
  }

  if (animation === 'stop') {
    const intensity = Math.min(1.24, amount * 1.05)
    const t = phase
    const stopEase = smootherstep01(t)
    const catchLoad = softPulse01(t, 0.16, 0.22) * intensity
    const settleLoad = softPulse01(t, 0.82, 0.28) * intensity * 0.16
    const rebound = softPulse01(t, 0.42, 0.28) * intensity
    const forwardLean = (1 - stopEase) * 0.28 + catchLoad * 0.12 - rebound * 0.05
    const sideSettle = Math.sin(t * Math.PI * 2.1) * (1 - stopEase) * 0.035 * intensity
    const bodySquash = clamp01(catchLoad * 0.54 + settleLoad * 0.28)
    const bodyStretch = clamp01(rebound * 0.18)

    return {
      phase,
      prep: catchLoad * 0.18,
      compress: bodySquash * 0.36,
      launch: rebound * 0.08,
      airborne: 0,
      airProgress: t,
      toeOff: 0,
      landingReach: catchLoad * 0.2,
      stretch: bodyStretch,
      land: bodySquash * 0.42,
      recovery: rebound * 0.24 + stopEase * 0.04,
      bodyX: sideSettle,
      bodyY: -bodySquash * 0.16 + rebound * 0.052 - settleLoad * 0.035,
      bodyScaleX: 1 + bodySquash * 0.12 - bodyStretch * 0.035,
      bodyScaleY: 1 - bodySquash * 0.18 + bodyStretch * 0.14,
      bodyScaleZ: 1 + bodySquash * 0.055 - bodyStretch * 0.02,
      bodyRotateZ: sideSettle * 0.75,
      bodyRotateX: forwardLean,
      kneeOut: 0.5 + bodySquash * 0.48 + (1 - stopEase) * 0.08,
      legBend: 0.56 + bodySquash * 0.56 + (1 - stopEase) * 0.12,
      footPlant: 1,
      footRoll: (1 - stopEase) * 0.24 + catchLoad * 0.08 - rebound * 0.075,
      footSplay: clamp01(0.16 + bodySquash * 0.36 + (1 - stopEase) * 0.08),
      toeLift: clamp01(rebound * 0.08),
      impactBurst: clamp01(bodySquash * 0.12),
      legStretch: clamp01(rebound * 0.1 - bodySquash * 0.04),
      armStretch: clamp01(rebound * 0.12 + catchLoad * 0.04),
      armLag: -(1 - stopEase) * 0.38 + rebound * 0.22 - catchLoad * 0.08,
      faceSquash: bodySquash * 0.28,
      shadowScale: 1.06 + bodySquash * 0.12 - rebound * 0.025,
      shadowOpacity: clamp01(0.25 + bodySquash * 0.04),
      glowPulse: bodySquash * 0.08 + rebound * 0.05,
      walk: 0,
      walkTravel: 0,
      shoeForward: 1,
      run: 0,
      forwardHop: 0,
      idleHop: 0,
      travelDirection: 1,
      idleStartX: 0,
      idleEndX: 0,
      idleTransfer: 0,
      idleReset: 0,
      pushLoad: 0,
      landLoad: 0,
    }
  }

  if (animation === 'walk') {
    const intensity = Math.min(1.24, amount * 1.08)
    const stride = Math.sin(phase * Math.PI * 2)
    const counterStride = Math.cos(phase * Math.PI * 2)
    const doubleStep = Math.sin(phase * Math.PI * 4 - 0.18)
    const contactLeft = circularPulse01(phase, 0.035, 0.14)
    const contactRight = circularPulse01(phase, 0.535, 0.14)
    const contact = Math.max(contactLeft, contactRight) * intensity
    const passing = Math.max(pulse01(phase, 0.27, 0.22), pulse01(phase, 0.77, 0.22)) * intensity
    const toePush = Math.max(pulse01(phase, 0.35, 0.16), pulse01(phase, 0.85, 0.16)) * intensity
    const heelCatch = Math.max(contactLeft, contactRight) * intensity
    const torsoLift = passing * 0.105
    const torsoDrop = contact * 0.09
    const shoulderTick = Math.sin(phase * Math.PI * 4 + 0.72) * 0.025

    return {
      phase,
      prep: contact * 0.18,
      compress: contact * 0.18,
      launch: toePush * 0.28,
      airborne: 0,
      airProgress: phase,
      toeOff: toePush * 0.32,
      landingReach: heelCatch * 0.32,
      stretch: passing * 0.16 + toePush * 0.1,
      land: contact * 0.2,
      recovery: passing * 0.22,
      bodyX: -stride * 0.095 * intensity,
      bodyY: 0.065 + torsoLift - torsoDrop + toePush * 0.025,
      bodyScaleX: 1 + contact * 0.05 - passing * 0.025,
      bodyScaleY: 1 - contact * 0.065 + passing * 0.085,
      bodyScaleZ: 1 + contact * 0.024 - passing * 0.014,
      bodyRotateZ: (-stride * 0.13 + shoulderTick) * intensity,
      bodyRotateX: (0.105 + counterStride * 0.035 + toePush * 0.035 - contact * 0.025) * intensity,
      kneeOut: 0.52 + contact * 0.24 + passing * 0.1,
      legBend: 0.58 + contact * 0.2 + passing * 0.18,
      footPlant: 1,
      footRoll: stride * 0.12 + toePush * 0.22 - heelCatch * 0.08,
      footSplay: clamp01(0.28 + contact * 0.22 + Math.abs(stride) * 0.08),
      toeLift: clamp01(toePush * 0.26 + passing * 0.16),
      impactBurst: clamp01(contact * 0.11),
      legStretch: clamp01(passing * 0.22 + toePush * 0.14),
      armStretch: clamp01(0.1 + passing * 0.18 + toePush * 0.12),
      armLag: -stride * 0.26 + doubleStep * 0.08,
      faceSquash: contact * 0.14,
      shadowScale: 1.08 + contact * 0.08 + Math.abs(stride) * 0.04,
      shadowOpacity: clamp01(0.25 + contact * 0.035),
      glowPulse: contact * 0.08 + passing * 0.06 + toePush * 0.08,
      walk: 1,
      walkTravel: 0,
      shoeForward: 0,
      run: 0,
      forwardHop: 0,
      idleHop: 0,
      travelDirection: 1,
      idleStartX: 0,
      idleEndX: 0,
      idleTransfer: 0,
      idleReset: 0,
      pushLoad: 0,
      landLoad: 0,
    }
  }

  if (animation === 'idle') {
    const intensity = Math.min(1.05, amount)
    const beatA = circularPulse01(phase, 0.035, 0.15)
    const beatB = circularPulse01(phase, 0.535, 0.15)
    const contactBeat = Math.max(beatA, beatB)
    const reboundA = pulse01(phase, 0.18, 0.2)
    const reboundB = pulse01(phase, 0.68, 0.2)
    const rebound = Math.max(reboundA, reboundB) * intensity
    const settleA = pulse01(phase, 0.34, 0.22)
    const settleB = pulse01(phase, 0.84, 0.22)
    const settle = Math.max(settleA, settleB) * intensity
    const prep = Math.max(circularPulse01(phase, 0.94, 0.1), circularPulse01(phase, 0.44, 0.1)) * intensity * 0.16
    const compress = Math.min(0.52, (contactBeat * 0.42 + prep * 0.18) * intensity)
    const launch = rebound * 0.34
    const stretch = Math.min(0.38, rebound * 0.28 + settle * 0.075)
    const motionLand = clamp01(compress * 0.5 + contactBeat * 0.1)
    const motionRecovery = clamp01(rebound * 0.48 + settle * 0.16)
    const bobRise = rebound * 0.16 + settle * 0.045
    const rubberWobble = Math.sin(phase * Math.PI * 2 - 0.35)
    const secondaryWobble = Math.sin(phase * Math.PI * 4 + 0.65)
    const twoBeat = Math.sin(phase * Math.PI * 4 - 0.28)
    const jauntyLean = Math.sin(phase * Math.PI * 2 + 0.18)

    return {
      phase,
      prep,
      compress,
      launch,
      airborne: 0,
      airProgress: phase,
      toeOff: 0,
      landingReach: 0,
      stretch,
      land: motionLand,
      recovery: motionRecovery,
      bodyX: rubberWobble * 0.075 * intensity,
      bodyY: -compress * 0.44 + bobRise + stretch * 0.052 + motionRecovery * 0.016,
      bodyScaleX: 1 + compress * 0.24 - stretch * 0.12 + Math.abs(rubberWobble) * 0.018,
      bodyScaleY: 1 - compress * 0.3 + stretch * 0.36,
      bodyScaleZ: 1 + compress * 0.075 - stretch * 0.04,
      bodyRotateZ: (rubberWobble * 0.16 + secondaryWobble * 0.036 + launch * 0.045 - motionLand * 0.018) * amount,
      bodyRotateX: (0.08 + jauntyLean * 0.034 - prep * 0.02 + launch * 0.032 - motionLand * 0.018) * amount,
      kneeOut: 0.36 + prep * 0.1 + compress * 0.58 + motionLand * 0.12 + Math.abs(twoBeat) * 0.08 - stretch * 0.05,
      legBend: 0.52 + prep * 0.1 + compress * 0.68 + motionLand * 0.12 + Math.abs(twoBeat) * 0.1 - stretch * 0.09,
      footPlant: 1,
      footRoll: rubberWobble * 0.11 + twoBeat * 0.035 + compress * 0.14 - stretch * 0.07,
      footSplay: clamp01(prep * 0.08 + compress * 0.34 + motionLand * 0.12 + Math.abs(rubberWobble) * 0.08),
      toeLift: clamp01(launch * 0.13 + motionRecovery * 0.06),
      impactBurst: clamp01(compress * 0.16 + contactBeat * 0.08 + motionRecovery * 0.04),
      legStretch: clamp01(stretch * 0.2 + launch * 0.1 - compress * 0.07),
      armStretch: clamp01(stretch * 0.2 + launch * 0.11 - motionLand * 0.04),
      armLag: launch * 0.5 - compress * 0.2 + motionRecovery * 0.24 + rubberWobble * 0.08,
      faceSquash: compress * 0.72,
      shadowScale: Math.max(0.72, 1.02 + compress * 0.18 + motionLand * 0.05 - stretch * 0.04),
      shadowOpacity: clamp01(0.24 + compress * 0.06 + motionLand * 0.02),
      glowPulse: compress * 0.08 + launch * 0.1 + motionRecovery * 0.04,
      walk: 0,
      walkTravel: 0,
      shoeForward: 1,
      run: 0,
      forwardHop: 0,
      idleHop: 0,
      travelDirection: 0,
      idleStartX: 0,
      idleEndX: 0,
      idleTransfer: 0,
      idleReset: 1,
      pushLoad: 0,
      landLoad: 0,
    }
  }

  if (animation === 'forward-hop') {
    const intensity = Math.min(1.36, amount * 1.13)
    const airStart = 0.104
    const airEnd = 0.948
    const contact = circularPulse01(phase, 0.0, 0.102)
    const prep = circularPulse01(phase, 0.045, 0.11) * intensity * 0.5
    const launch = circularPulse01(phase, 0.135, 0.09) * intensity
    const recovery = circularPulse01(phase, 0.078, 0.12) * intensity * 0.78
    const airborne = smoothWindow(phase, airStart, airEnd, 0.045) * intensity
    const bottomT = circularSignedDistance(phase, 0.006)
    const springLoad = smootherstep01((bottomT + 0.104) / 0.096)
    const springRelease = 1 - smootherstep01((bottomT + 0.004) / 0.096)
    const springRecoil =
      smootherstep01((bottomT + 0.004) / 0.108) *
      (1 - smootherstep01((bottomT - 0.17) / 0.1))
    const springSquash = Math.min(1.18, springLoad * springRelease * intensity * 0.96 + prep * 0.035)
    const springRecoilStretch = springRecoil * intensity
    const bottomContact = clamp01(springSquash * 0.78 + springLoad * springRelease * 0.18)
    const bottomRecovery = clamp01(springRecoilStretch * 0.78 + recovery * 0.08)
    const stretch = Math.min(
      0.98,
      launch * 0.34 + springRecoilStretch * 0.48 + pulse01(phase, 0.182, 0.11) * airborne * 0.065 + bottomRecovery * 0.04,
    )
    const airT = clamp01((phase - airStart) / (airEnd - airStart))
    const peakT = 0.47
    const riseT = clamp01(airT / peakT)
    const fallT = clamp01((airT - peakT) / (1 - peakT))
    const riseArc = 1 - Math.pow(1 - riseT, 2.26)
    const fallArc = 1 - (0.06 * fallT + 0.94 * Math.pow(fallT, 2.2))
    const airArc = clamp01(airT < peakT ? riseArc : fallArc)
    const visualJumpHeight = 3.18
    const jumpLift = airArc * visualJumpHeight * amount
    const height01 = clamp01(jumpLift / visualJumpHeight)
    const airborne01 = clamp01(airborne / Math.max(0.01, intensity))
    const toeOff = smoothstep01(airT / 0.15) * airborne01
    const landingReach = smoothstep01((airT - 0.72) / 0.23)
    const ascentDrive = smoothWindow(airT, 0.04, 0.45, 0.16) * airborne01
    const apexCoast = smoothWindow(airT, 0.28, 0.68, 0.2) * airborne01
    const descentBrace = smootherstep01((airT - 0.66) / 0.26) * airborne01
    const hangReach = smoothWindow(airT, 0.07, 0.72, 0.16)
    const descentReach = smoothWindow(airT, 0.42, 0.95, 0.2)
    const launchSnap = pulse01(phase, 0.15, 0.064) * intensity
    const forwardLine = clamp01(ascentDrive * 0.46 + apexCoast * 0.3 + descentBrace * 0.18 + launch * 0.2)
    const springWobble = Math.sin(phase * Math.PI * 2 + 0.35)
    const followWobble = Math.sin(phase * Math.PI * 5.4 - 0.7) * (airborne * 0.16 + bottomRecovery * 0.36 + springRecoilStretch * 0.16)
    const impactBurst = clamp01(springSquash * 0.5 + bottomContact * 0.08)
    const footSplay = clamp01(prep * 0.16 + springSquash * 0.82 + bottomContact * 0.22 + bottomRecovery * 0.16)
    const footRoll = Math.sin(phase * Math.PI * 2 - 0.55) * 0.08 + springSquash * 0.32 - springRecoilStretch * 0.2 - launch * 0.08
    const toeLift = clamp01(launch * 0.64 + springRecoilStretch * 0.34 + airborne * 0.24 + bottomRecovery * 0.1 - bottomContact * 0.24)
    const legStretch = clamp01(
      stretch * 0.48 +
        launch * 0.42 +
        springRecoilStretch * 0.2 +
        launchSnap * 0.08 +
        airborne01 * 0.2 +
        hangReach * 0.38 +
        height01 * 0.28 +
        descentReach * 0.25 -
        springSquash * 0.34 -
        bottomContact * 0.25,
    )
    const armStretch = clamp01(stretch * 0.34 + airborne01 * 0.28 + hangReach * 0.2 + launch * 0.24 - bottomContact * 0.14)

    return {
      phase,
      prep,
      compress: springSquash,
      launch,
      airborne,
      airProgress: airT,
      toeOff,
      landingReach,
      stretch,
      land: bottomContact,
      recovery: bottomRecovery,
      bodyX: 0,
      bodyY:
        jumpLift -
        prep * 0.04 -
        springSquash * 0.76 -
        bottomContact * 0.07 +
        launchSnap * 0.045 +
        stretch * 0.075 +
        springRecoilStretch * 0.14 +
        bottomRecovery * 0.03 +
        impactBurst * 0.01,
      bodyScaleX: 1 + springSquash * 0.54 - stretch * 0.3 - launch * 0.035,
      bodyScaleY: 1 - springSquash * 0.58 + stretch * 0.82,
      bodyScaleZ: 1 + springSquash * 0.13 - stretch * 0.09,
      bodyRotateZ: (springWobble * 0.026 + followWobble * 0.052 + launch * 0.052 - bottomContact * 0.03 + bottomRecovery * 0.02) * amount,
      bodyRotateX:
        (0.15 +
          forwardLine * 0.16 -
          prep * 0.04 +
          launch * 0.13 -
          landingReach * 0.055 -
          bottomContact * 0.065 +
          bottomRecovery * 0.032) *
        amount,
      kneeOut: 0.34 + prep * 0.24 + springSquash * 1.24 + bottomContact * 0.2 + bottomRecovery * 0.14 - launch * 0.12 - airborne * 0.045,
      legBend: 0.48 + prep * 0.22 + springSquash * 1.16 + bottomContact * 0.16 + bottomRecovery * 0.12 - launch * 0.32 - airborne * 0.1,
      footPlant: clamp01(1 - airborne * 1.65 + prep * 0.4 + springSquash * 1.18 + bottomRecovery * 0.36 + launch * 0.24 + bottomContact * 0.5 + contact * 0.24),
      footRoll,
      footSplay,
      toeLift,
      impactBurst,
      legStretch,
      armStretch,
      armLag: airborne * 0.92 + launch * 0.66 - springSquash * 0.24 - bottomContact * 0.08 + bottomRecovery * 0.32,
      faceSquash: springSquash * 0.94,
      shadowScale: Math.max(0.14, 1.08 + prep * 0.08 + springSquash * 0.46 + bottomContact * 0.08 - height01 * 0.96),
      shadowOpacity: clamp01(0.26 + springSquash * 0.13 + bottomContact * 0.04 - height01 * 0.25),
      glowPulse: springSquash * 0.22 + launch * 0.32 + bottomContact * 0.08 + springRecoilStretch * 0.14 + bottomRecovery * 0.08,
      walk: 0,
      walkTravel: 0,
      shoeForward: 1,
      run: 0,
      forwardHop: 1,
      idleHop: 0,
      travelDirection: 1,
      idleStartX: 0,
      idleEndX: 0,
      idleTransfer: 0,
      idleReset: 0,
      pushLoad: 0,
      landLoad: 0,
    }
  }

  const reference = animation === 'reference-bounce'
  const intensity = Math.min(reference ? 1.48 : 1.32, amount * (reference ? 1.16 : 1.12))
  const airStart = reference ? 0.102 : 0.106
  const airEnd = reference ? 0.954 : 0.946
  const contact = circularPulse01(phase, 0.0, reference ? 0.114 : 0.102)
  const prep = circularPulse01(phase, 0.044, reference ? 0.124 : 0.108) * intensity * 0.48
  const launch = circularPulse01(phase, 0.13, reference ? 0.09 : 0.084) * intensity
  const recovery = circularPulse01(phase, 0.078, reference ? 0.134 : 0.116) * intensity * 0.82
  const airborne = smoothWindow(phase, airStart, airEnd, 0.045) * intensity
  const bottomT = circularSignedDistance(phase, 0.006)
  const springLoad = smootherstep01((bottomT + (reference ? 0.114 : 0.102)) / (reference ? 0.108 : 0.096))
  const springRelease = 1 - smootherstep01((bottomT + 0.006) / (reference ? 0.11 : 0.098))
  const springRecoil =
    smootherstep01((bottomT + 0.004) / (reference ? 0.116 : 0.108)) *
    (1 - smootherstep01((bottomT - (reference ? 0.178 : 0.176)) / (reference ? 0.102 : 0.1)))
  const springSquash = Math.min(
    reference ? 1.42 : 1.24,
    springLoad * springRelease * intensity * (reference ? 1.02 : 0.98) + prep * 0.035,
  )
  const springRecoilStretch = springRecoil * intensity
  const bottomContact = clamp01(springSquash * 0.78 + springLoad * springRelease * 0.18)
  const bottomRecovery = clamp01(springRecoilStretch * 0.8 + recovery * 0.08)
  const motionCompress = springSquash
  const motionLand = bottomContact
  const motionRecovery = bottomRecovery
  const stretch = Math.min(
    reference ? 1.18 : 0.98,
    launch * 0.32 + springRecoilStretch * 0.5 + pulse01(phase, 0.178, 0.1) * airborne * 0.06 + motionRecovery * 0.035,
  )
  const airT = clamp01((phase - airStart) / (airEnd - airStart))
  const peakT = reference ? 0.505 : 0.495
  const riseT = clamp01(airT / peakT)
  const fallT = clamp01((airT - peakT) / (1 - peakT))
  const riseArc = 1 - Math.pow(1 - riseT, reference ? 2.34 : 2.28)
  const fallPull = reference ? 0.055 : 0.065
  const fallArc = 1 - (fallPull * fallT + (1 - fallPull) * Math.pow(fallT, reference ? 2.22 : 2.28))
  const airArc = clamp01(airT < peakT ? riseArc : fallArc)
  const jumpLift = airArc * (reference ? 5.05 : 4.42) * amount
  const height01 = clamp01(jumpLift / (reference ? 5.05 : 4.42))
  const squash = springSquash
  const squashX = reference ? 0.62 : 0.56
  const squashY = reference ? 0.66 : 0.6
  const stretchY = reference ? 0.92 : 0.76
  const stretchX = reference ? 0.34 : 0.28
  const springWobble = Math.sin(phase * Math.PI * 2 + 0.35)
  const launchSnap = pulse01(phase, 0.15, 0.062) * intensity
  const followWobble = Math.sin(phase * Math.PI * 5.6 - 0.72) * (airborne * 0.18 + motionRecovery * 0.42 + springRecoilStretch * 0.18)
  const impactBurst = clamp01(springSquash * 0.52 + bottomContact * 0.07)
  const footSplay = clamp01(prep * 0.16 + motionCompress * 0.88 + motionLand * 0.22 + motionRecovery * 0.18)
  const footRoll = Math.sin(phase * Math.PI * 2 - 0.55) * 0.1 + motionCompress * 0.38 - springRecoilStretch * 0.26 - launch * 0.12
  const toeLift = clamp01(launch * 0.6 + springRecoilStretch * 0.38 + airborne * 0.2 + motionRecovery * 0.12 - motionLand * 0.28)
  const airborne01 = clamp01(airborne / Math.max(0.01, intensity))
  const toeOff = smoothstep01(airT / (reference ? 0.16 : 0.15)) * airborne01
  const landingReach = smoothstep01((airT - (reference ? 0.76 : 0.78)) / (reference ? 0.22 : 0.2))
  const hangReach = smoothWindow(airT, 0.06, 0.72, 0.16)
  const descentReach = smoothWindow(airT, 0.42, 0.95, 0.2)
  const legStretch = clamp01(
    stretch * 0.48 +
      launch * 0.4 +
      springRecoilStretch * 0.22 +
      launchSnap * 0.08 +
      airborne01 * 0.2 +
      hangReach * 0.38 +
      height01 * 0.32 +
      descentReach * 0.22 -
      motionCompress * 0.36 -
      motionLand * 0.28,
  )
  const armStretch = clamp01(stretch * 0.32 + airborne01 * 0.22 + hangReach * 0.18 + launch * 0.2 - motionLand * 0.16)

  return {
    phase,
    prep,
    compress: motionCompress,
    launch,
    airborne,
    airProgress: airT,
    toeOff,
    landingReach,
    stretch,
    land: motionLand,
    recovery: motionRecovery,
    bodyX: 0,
    bodyY:
      jumpLift -
      prep * 0.04 -
      motionCompress * (reference ? 0.88 : 0.78) -
      motionLand * (reference ? 0.12 : 0.08) +
      launchSnap * 0.04 +
      stretch * 0.07 +
      springRecoilStretch * 0.15 +
      motionRecovery * 0.03 +
      impactBurst * 0.01,
    bodyScaleX: 1 + squash * squashX - stretch * stretchX - launch * 0.04,
    bodyScaleY: 1 - squash * squashY + stretch * stretchY,
    bodyScaleZ: 1 + squash * (reference ? 0.18 : 0.14) - stretch * 0.1,
    bodyRotateZ:
      (Math.sin(phase * Math.PI * 2 + 0.25) * 0.045 +
        springWobble * 0.022 +
        followWobble * 0.062 +
        launch * 0.088 -
        motionLand * 0.044 +
        motionRecovery * 0.026) *
      amount,
    bodyRotateX: (-prep * 0.06 + launch * 0.12 - motionLand * 0.08 + motionRecovery * 0.04) * amount,
    kneeOut: 0.36 + prep * 0.28 + motionCompress * 1.42 + motionLand * 0.24 + motionRecovery * 0.18 - launch * 0.14 - airborne * 0.06,
    legBend: 0.5 + prep * 0.26 + motionCompress * 1.3 + motionLand * 0.2 + motionRecovery * 0.14 - launch * 0.4 - airborne * 0.14,
    footPlant: clamp01(1 - airborne * 1.7 + prep * 0.42 + motionCompress * 1.24 + motionRecovery * 0.42 + launch * 0.3 + motionLand * 0.46 + contact * 0.28),
    footRoll,
    footSplay,
    toeLift,
    impactBurst,
    legStretch,
    armStretch,
    armLag: airborne * 0.84 + launch * 0.62 - motionCompress * 0.32 - motionLand * 0.14 + motionRecovery * 0.34,
    faceSquash: squash * 1.02,
    shadowScale: Math.max(0.14, 1.08 + prep * 0.08 + squash * 0.5 + motionLand * 0.08 - height01 * 0.98),
    shadowOpacity: clamp01(0.26 + squash * 0.14 + motionLand * 0.04 - height01 * 0.25),
    glowPulse: springSquash * 0.24 + launch * 0.34 + motionLand * 0.08 + springRecoilStretch * 0.14 + motionRecovery * 0.08,
    walk: 0,
    walkTravel: 0,
    shoeForward: 1,
    run: 0,
    forwardHop: 0,
    idleHop: 0,
    travelDirection: 0,
    idleStartX: 0,
    idleEndX: 0,
    idleTransfer: 0,
    idleReset: 0,
    pushLoad: 0,
    landLoad: 0,
  }
}

function blendPogoMotion(fromMotion: PogoMotion, toMotion: PogoMotion, amount: number): PogoMotion {
  const blend = smootherstep01(amount)
  const blended = {} as PogoMotion

  for (const key of Object.keys(toMotion) as Array<keyof PogoMotion>) {
    blended[key] = THREE.MathUtils.lerp(fromMotion[key] ?? 0, toMotion[key] ?? 0, blend)
  }

  if ('limbBodyY' in fromMotion || 'limbBodyY' in toMotion) {
    blended.limbBodyY = THREE.MathUtils.lerp(fromMotion.limbBodyY ?? fromMotion.bodyY, toMotion.limbBodyY ?? toMotion.bodyY, blend)
  }

  return blended
}

function debugModeValue(debugMaterial: PsychedelicPogoOrbDebugMaterial) {
  switch (debugMaterial) {
    case 'uv':
      return 2
    case 'bands':
      return 3
    case 'glow-off':
      return 4
    case 'face-contrast':
      return 5
    case 'silhouette':
      return 6
    case 'super-psychedelic':
      return 7
    case 'flat':
      return 1
    case 'none':
    default:
      return 0
  }
}

function createPsychedelicWrapperMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uGlowIntensity: { value: 1 },
      uColorCycleSpeed: { value: 1 },
      uColorCycleOffset: { value: 0 },
      uActivity: { value: 1 },
      uDebugMode: { value: 0 },
      uRootInverse: { value: new THREE.Matrix4() },
      uEmissionCenter: { value: new THREE.Vector3(0, 0, 0) },
      uBodyScale: { value: new THREE.Vector3(1, 1, 1) },
    },
    vertexShader: `
      uniform mat4 uRootInverse;
      varying vec3 vWrapperPosition;

      void main() {
        vWrapperPosition = (uRootInverse * modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uGlowIntensity;
      uniform float uColorCycleSpeed;
      uniform float uColorCycleOffset;
      uniform float uActivity;
      uniform int uDebugMode;
      uniform vec3 uEmissionCenter;
      uniform vec3 uBodyScale;
      varying vec3 vWrapperPosition;

      vec3 hsv2rgb(vec3 c) {
        vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
        return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
      }

      void main() {
        vec3 rawP = vWrapperPosition - uEmissionCenter;
        vec3 safeScale = max(uBodyScale, vec3(0.35));
        float bodyField = smoothstep(1.55, 0.52, length(rawP));
        vec3 p = mix(rawP, rawP / safeScale, bodyField);
        float limbSoftening = smoothstep(1.02, 2.18, length(p));
        vec3 q = mix(p, p * 0.72, limbSoftening);
        vec3 n = normalize(vec3(q.x, q.y * 0.78 + 0.18, q.z * 0.9));
        float colorCyclePhase = fract(uColorCycleOffset);
        float t = uTime * max(0.05, uColorCycleSpeed) + colorCyclePhase * 19.0;
        float lat = asin(clamp(n.y, -1.0, 1.0));
        float lon = atan(n.x, -n.z);
        float lowerWrap = smoothstep(0.42, 2.05, -q.y);
        float waveA = sin(lat * 6.35 + sin(lon * 1.8 + t * 0.38) * 1.35 + t * 0.78);
        float waveB = sin(q.y * 3.25 - abs(q.x) * 2.85 + q.z * 1.35 + sin(q.z * 3.2 - t * 0.3) * 0.92 - t * 0.52);
        float chevron = sin(abs(q.x) * 4.35 + q.y * 3.72 + q.z * 1.8 - t * 0.64 + sin(lon * 2.15) * 0.52);
        float spiralFold = sin(lon * 3.8 + lat * 5.4 + q.y * 1.45 - t * 0.94 + sin(q.x * 2.55 + t * 0.36) * 1.0);
        float liquidKnot = sin((q.x * q.x - q.y * 0.72 + q.z * 1.12) * 3.75 + t * 0.82 + sin(lon * 2.25 - t * 0.28) * 0.72);
        float nestedRibbon = sin(lat * 7.8 + abs(q.x) * 5.35 - q.y * 2.05 + q.z * 0.95 + t * 0.96);
        float broadBands = smoothstep(-0.22, 0.78, waveA * 0.46 + waveB * 0.42 + chevron * 0.36);
        float ribbon = smoothstep(0.12, 0.92, sin(lat * 6.25 + abs(q.x) * 3.95 + q.y * 1.3 - t * 0.68) * 0.5 + 0.5);
        float hue = fract(colorCyclePhase + t * 0.052 + n.y * 0.075 + q.x * 0.021 + lowerWrap * 0.08 + waveA * 0.036 + waveB * 0.03 + chevron * 0.018);
        vec3 colorA = hsv2rgb(vec3(hue, 0.78, 0.95));
        vec3 colorB = hsv2rgb(vec3(fract(hue + 0.18), 0.82, 0.98));
        vec3 colorC = hsv2rgb(vec3(fract(hue + 0.42), 0.72, 0.92));
        vec3 color = mix(colorA, colorB, broadBands);
        color = mix(color, colorC, ribbon * 0.34);

        float rootRadius = length(vec3(q.x * 0.82, q.y * 0.52, q.z * 0.82));
        float coreFalloff = 1.0 - clamp(rootRadius * 0.36, 0.0, 0.62);
        float innerLight = 0.74 + coreFalloff * 0.2 + lowerWrap * 0.12;
        float rim = pow(1.0 - abs(n.z), 1.8) * (0.2 + lowerWrap * 0.1);
        float bandLight = 0.13 * broadBands + 0.09 * ribbon;
        float glow = max(0.0, uGlowIntensity);

        float onOrbBody = smoothstep(1.28, 0.64, length(p));
        float faceForward = smoothstep(0.54, 0.88, -n.z) * onOrbBody;
        float faceZone = smoothstep(0.46, 0.0, length(vec2(n.x * 1.22, (n.y - 0.02) * 1.64))) * faceForward;
        color = mix(color, vec3(0.77, 0.97, 0.92), faceZone * 0.18);
        color *= innerLight + bandLight + rim * glow;
        color += color * (0.13 + 0.2 * broadBands + lowerWrap * 0.09) * glow;

        if (uDebugMode == 1) {
          color = vec3(0.36, 0.95, 1.0);
        } else if (uDebugMode == 2) {
          color = vec3(fract((lon + 3.14159) / 6.28318), fract((p.y + 2.2) / 4.4), 0.9);
        } else if (uDebugMode == 3) {
          color = vec3(broadBands, ribbon, 1.0 - broadBands * 0.45);
        } else if (uDebugMode == 4) {
          color = mix(vec3(0.27, 0.91, 0.96), vec3(0.14, 0.58, 0.72), broadBands * 0.38);
        } else if (uDebugMode == 5) {
          color = mix(color * 0.72, vec3(0.92, 1.0, 0.82), faceZone * 0.78);
        } else if (uDebugMode == 6) {
          color = vec3(0.08, 0.06, 0.12);
        } else if (uDebugMode == 7) {
          float hyperBands = smoothstep(-0.42, 0.96, waveA * 0.4 + waveB * 0.32 + chevron * 0.34 + spiralFold * 0.3 + liquidKnot * 0.24);
          float hotRibbon = smoothstep(0.18, 0.98, nestedRibbon * 0.5 + 0.5);
          float plasmaVein = smoothstep(0.16, 0.92, sin(lon * 3.85 + q.y * 2.55 + spiralFold * 0.7 - t * 1.04) * 0.5 + 0.5);
          float hyperHue = fract(t * 0.076 + q.x * 0.05 + q.y * 0.04 + lowerWrap * 0.13 + spiralFold * 0.058 + liquidKnot * 0.042 + plasmaVein * 0.07);
          vec3 hyperA = hsv2rgb(vec3(hyperHue, 0.94, 0.92));
          vec3 hyperB = hsv2rgb(vec3(fract(hyperHue + 0.24), 0.9, 0.96));
          vec3 hyperC = hsv2rgb(vec3(fract(hyperHue + 0.52), 0.88, 0.9));
          vec3 hyperD = hsv2rgb(vec3(fract(hyperHue + 0.72), 0.78, 0.94));
          color = mix(hyperA, hyperB, hyperBands);
          color = mix(color, hyperC, hotRibbon * 0.46);
          color = mix(color, hyperD, plasmaVein * 0.34);
          color *= 0.78 + coreFalloff * 0.18 + lowerWrap * 0.14 + hyperBands * 0.18 + hotRibbon * 0.1;
          color += color * (0.1 + plasmaVein * 0.14 + hotRibbon * 0.12) * glow;
        }

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })
}

function createRubberHoseGeometry() {
  const ringCount = HOSE_LENGTH_SEGMENTS + 1
  const vertexCount = ringCount * HOSE_RADIAL_SEGMENTS
  const positions = new Float32Array(vertexCount * 3)
  const indices: number[] = []

  for (let segment = 0; segment < HOSE_LENGTH_SEGMENTS; segment += 1) {
    for (let radial = 0; radial < HOSE_RADIAL_SEGMENTS; radial += 1) {
      const nextRadial = (radial + 1) % HOSE_RADIAL_SEGMENTS
      const current = segment * HOSE_RADIAL_SEGMENTS + radial
      const next = segment * HOSE_RADIAL_SEGMENTS + nextRadial
      const upper = (segment + 1) * HOSE_RADIAL_SEGMENTS + radial
      const upperNext = (segment + 1) * HOSE_RADIAL_SEGMENTS + nextRadial
      indices.push(current, upper, next)
      indices.push(next, upper, upperNext)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  return geometry
}

function quadraticPoint(start: THREE.Vector3, control: THREE.Vector3, end: THREE.Vector3, t: number) {
  const inv = 1 - t
  return start
    .clone()
    .multiplyScalar(inv * inv)
    .add(control.clone().multiplyScalar(2 * inv * t))
    .add(end.clone().multiplyScalar(t * t))
}

function quadraticTangent(start: THREE.Vector3, control: THREE.Vector3, end: THREE.Vector3, t: number) {
  return control
    .clone()
    .sub(start)
    .multiplyScalar(2 * (1 - t))
    .add(end.clone().sub(control).multiplyScalar(2 * t))
    .normalize()
}

function updateRubberHoseGeometry(
  geometry: THREE.BufferGeometry,
  start: THREE.Vector3,
  bend: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  startInset = 0,
  endInset = 0,
) {
  const position = geometry.attributes.position as THREE.BufferAttribute
  const control = bend
    .clone()
    .multiplyScalar(2)
    .sub(start.clone().add(end).multiplyScalar(0.5))
  const tStart = clamp01(startInset)
  const tEnd = clamp01(1 - endInset)
  const tSpan = Math.max(0.01, tEnd - tStart)

  for (let segment = 0; segment <= HOSE_LENGTH_SEGMENTS; segment += 1) {
    const t = tStart + (segment / HOSE_LENGTH_SEGMENTS) * tSpan
    const center = quadraticPoint(start, control, end, t)
    const tangent = quadraticTangent(start, control, end, t)
    const reference = Math.abs(tangent.dot(Z_AXIS)) > 0.86 ? X_AXIS : Z_AXIS
    const normal = tangent.clone().cross(reference).normalize()
    const binormal = normal.clone().cross(tangent).normalize()

    for (let radial = 0; radial < HOSE_RADIAL_SEGMENTS; radial += 1) {
      const angle = (radial / HOSE_RADIAL_SEGMENTS) * Math.PI * 2
      const ringPoint = center
        .clone()
        .add(normal.clone().multiplyScalar(Math.cos(angle) * radius))
        .add(binormal.clone().multiplyScalar(Math.sin(angle) * radius))
      position.setXYZ(segment * HOSE_RADIAL_SEGMENTS + radial, ringPoint.x, ringPoint.y, ringPoint.z)
    }
  }

  position.needsUpdate = true
}

function RubberHoseCurve({
  hoseRef,
  radius,
  wrapperMaterial,
  outlineColor = INK,
}: {
  hoseRef: MutableRefObject<THREE.Group | null>
  radius: number
  wrapperMaterial: THREE.Material
  outlineColor?: string
}) {
  const fillGeometry = useMemo(() => createRubberHoseGeometry(), [])
  const outlineGeometry = useMemo(() => createRubberHoseGeometry(), [])

  function assignGroup(node: THREE.Group | null) {
    hoseRef.current = node
    if (node) {
      node.userData.fillGeometry = fillGeometry
      node.userData.outlineGeometry = outlineGeometry
      node.userData.radius = radius
    }
  }

  return (
    <group ref={assignGroup}>
      <mesh geometry={outlineGeometry} frustumCulled={false}>
        <meshBasicMaterial color={outlineColor} side={THREE.BackSide} />
      </mesh>
      <mesh geometry={fillGeometry} material={wrapperMaterial} frustumCulled={false} />
    </group>
  )
}

const ToonBulb = forwardRef<
  THREE.Group,
  {
    wrapperMaterial: THREE.Material
    outlineColor?: string
  }
>(function ToonBulb({ wrapperMaterial, outlineColor = INK }, ref) {
  return (
    <group ref={ref}>
      <mesh scale={1.18}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshBasicMaterial color={outlineColor} side={THREE.BackSide} />
      </mesh>
      <mesh material={wrapperMaterial}>
        <sphereGeometry args={[1, 18, 12]} />
      </mesh>
    </group>
  )
})

const SeamBlendBulb = forwardRef<THREE.Group, { wrapperMaterial: THREE.Material }>(function SeamBlendBulb(
  { wrapperMaterial },
  ref,
) {
  return (
    <group ref={ref}>
      <mesh material={wrapperMaterial}>
        <sphereGeometry args={[1, 18, 12]} />
      </mesh>
    </group>
  )
})

const ShoePad = forwardRef<THREE.Group, { wrapperMaterial: THREE.Material; side: -1 | 1 }>(function ShoePad(
  { wrapperMaterial, side },
  ref,
) {
  const rootRef = useRef<THREE.Group | null>(null)
  const toeRef = useRef<THREE.Group | null>(null)

  function assignRoot(node: THREE.Group | null) {
    rootRef.current = node
    if (typeof ref === 'function') {
      ref(node)
    } else if (ref) {
      ;(ref as MutableRefObject<THREE.Group | null>).current = node
    }
    if (node) node.userData.toeGroup = toeRef.current
  }

  function assignToe(node: THREE.Group | null) {
    toeRef.current = node
    if (rootRef.current) rootRef.current.userData.toeGroup = node
  }

  return (
    <group ref={assignRoot}>
      <mesh position={[side * 0.52, -0.07, 0]} scale={[1.22, 0.7, 0.84]}>
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>
      <mesh position={[side * 0.02, 0.03, 0.01]} scale={[0.32, 0.42, 0.54]}>
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>
      <mesh position={[side * 0.65, -0.3, 0.045]} scale={[1.22, 0.25, 0.72]}>
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
        <sphereGeometry args={[1, 22, 12]} />
      </mesh>

      <mesh position={[side * 0.52, -0.07, 0]} scale={[1.04, 0.56, 0.68]} material={wrapperMaterial}>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>
      <mesh position={[side * 0.015, 0.035, 0.02]} scale={[0.22, 0.3, 0.4]} material={wrapperMaterial}>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>
      <mesh position={[side * 0.65, -0.265, 0.07]} scale={[1, 0.16, 0.56]} material={wrapperMaterial}>
        <sphereGeometry args={[1, 22, 12]} />
      </mesh>
      <group ref={assignToe} position={[side * 0.62, -0.02, 0.02]}>
        <mesh position={[side * 0.46, -0.005, 0]} scale={[0.94, 0.61, 0.72]}>
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
          <sphereGeometry args={[1, 24, 16]} />
        </mesh>
        <mesh position={[side * 0.46, 0.015, 0]} scale={[0.81, 0.49, 0.58]} material={wrapperMaterial}>
          <sphereGeometry args={[1, 24, 16]} />
        </mesh>
        <mesh position={[side * 0.41, 0.15, -0.31]} scale={[0.23, 0.065, 0.12]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color="#fff6a8" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
})

function FootImpactFx({
  impactRef,
  material,
  side,
}: {
  impactRef: MutableRefObject<THREE.Group | null>
  material: THREE.MeshBasicMaterial
  side: -1 | 1
}) {
  return (
    <group ref={impactRef} visible={false} renderOrder={-1}>
      <group rotation-x={-Math.PI / 2}>
        <mesh scale={[1, 0.48, 1]} material={material} renderOrder={5}>
          <ringGeometry args={[0.24, 0.43, 54]} />
        </mesh>
        <mesh position={[side * 0.26, 0.08, 0.006]} scale={[0.2, 0.07, 1]} material={material} renderOrder={5}>
          <circleGeometry args={[1, 18]} />
        </mesh>
        <mesh position={[side * -0.18, -0.07, 0.006]} scale={[0.15, 0.055, 1]} material={material} renderOrder={5}>
          <circleGeometry args={[1, 16]} />
        </mesh>
      </group>
    </group>
  )
}

function SocketOval({
  position,
  scale,
  opacity = 0.24,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number]
  scale: [number, number, number]
  opacity?: number
  rotation?: [number, number, number]
}) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} renderOrder={4}>
      <sphereGeometry args={[1, 18, 8]} />
      <meshBasicMaterial color="#fff8c8" transparent opacity={opacity} depthWrite={false} depthTest={false} />
    </mesh>
  )
}

function RigMarker({
  markerRef,
  color,
}: {
  markerRef: MutableRefObject<THREE.Group | null>
  color: string
}) {
  return (
    <group ref={markerRef}>
      <mesh scale={0.05}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh scale={0.038}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}

function CurveStroke({
  points,
  radius = 0.014,
  color = FACE_INK,
  renderOrder = 12,
}: {
  points: Array<[number, number, number]>
  radius?: number
  color?: string
  renderOrder?: number
}) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)))
    return new THREE.TubeGeometry(curve, 18, radius, 6, false)
  }, [points, radius])

  return (
    <mesh geometry={geometry} renderOrder={renderOrder}>
      <meshBasicMaterial color={color} depthWrite={false} />
    </mesh>
  )
}

function OvalEye({
  position,
  scale,
  highlight = true,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  highlight?: boolean
}) {
  return (
    <group position={position}>
      <mesh scale={scale} renderOrder={12}>
        <sphereGeometry args={[1, 18, 10]} />
        <meshBasicMaterial color={FACE_INK} depthWrite={false} />
      </mesh>
      {highlight ? (
        <mesh position={[-0.014, 0.032, -0.014]} scale={[scale[0] * 0.22, scale[1] * 0.18, scale[2] * 0.58]} renderOrder={13}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color={FACE_HIGHLIGHT} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  )
}

function FaceVariant({
  variant,
  variantRef,
}: {
  variant: ConcretePogoOrbExpression
  variantRef: MutableRefObject<THREE.Group | null>
}) {
  if (variant === 'happy') {
    return (
      <group ref={variantRef}>
        <CurveStroke points={[[-0.25, 0.12, 0], [-0.18, 0.075, -0.01], [-0.09, 0.112, 0]]} radius={0.014} />
        <CurveStroke points={[[0.09, 0.112, 0], [0.18, 0.075, -0.01], [0.25, 0.12, 0]]} radius={0.014} />
        <CurveStroke points={[[-0.14, -0.16, 0], [-0.05, -0.255, -0.01], [0.08, -0.242, -0.01], [0.17, -0.14, 0]]} radius={0.018} />
        <mesh position={[-0.34, -0.05, -0.01]} scale={[0.034, 0.02, 0.008]} renderOrder={11}>
          <sphereGeometry args={[1, 8, 5]} />
          <meshBasicMaterial color="#ff9ec9" transparent opacity={0.52} depthWrite={false} />
        </mesh>
        <mesh position={[0.34, -0.05, -0.01]} scale={[0.034, 0.02, 0.008]} renderOrder={11}>
          <sphereGeometry args={[1, 8, 5]} />
          <meshBasicMaterial color="#ff9ec9" transparent opacity={0.52} depthWrite={false} />
        </mesh>
      </group>
    )
  }

  if (variant === 'blink') {
    return (
      <group ref={variantRef}>
        <CurveStroke points={[[-0.25, 0.096, 0], [-0.18, 0.078, -0.01], [-0.1, 0.092, 0]]} radius={0.014} />
        <CurveStroke points={[[0.1, 0.092, 0], [0.18, 0.078, -0.01], [0.25, 0.096, 0]]} radius={0.014} />
        <CurveStroke points={[[-0.085, -0.18, 0], [0, -0.216, -0.01], [0.09, -0.18, 0]]} radius={0.014} />
      </group>
    )
  }

  if (variant === 'squash') {
    return (
      <group ref={variantRef} scale={[1.18, 0.68, 1]}>
        <mesh position={[-0.18, 0.08, 0]} scale={[0.095, 0.024, 0.012]} renderOrder={12}>
          <sphereGeometry args={[1, 12, 6]} />
          <meshBasicMaterial color={FACE_INK} depthWrite={false} />
        </mesh>
        <mesh position={[0.18, 0.08, 0]} scale={[0.095, 0.024, 0.012]} renderOrder={12}>
          <sphereGeometry args={[1, 12, 6]} />
          <meshBasicMaterial color={FACE_INK} depthWrite={false} />
        </mesh>
        <CurveStroke points={[[-0.13, -0.17, 0], [-0.02, -0.184, -0.01], [0.12, -0.168, 0]]} radius={0.015} />
      </group>
    )
  }

  if (variant === 'surprised') {
    return (
      <group ref={variantRef}>
        <OvalEye position={[-0.18, 0.122, 0]} scale={[0.085, 0.136, 0.012]} />
        <OvalEye position={[0.18, 0.112, 0]} scale={[0.081, 0.128, 0.012]} />
        <mesh position={[0, -0.17, 0]} scale={[0.064, 0.08, 0.012]} renderOrder={12}>
          <sphereGeometry args={[1, 14, 8]} />
          <meshBasicMaterial color={FACE_INK} depthWrite={false} />
        </mesh>
        <mesh position={[0.034, -0.146, -0.012]} scale={[0.02, 0.026, 0.008]} renderOrder={13}>
          <sphereGeometry args={[1, 8, 5]} />
          <meshBasicMaterial color={FACE_HIGHLIGHT} transparent opacity={0.62} depthWrite={false} />
        </mesh>
      </group>
    )
  }

  if (variant === 'focused') {
    return (
      <group ref={variantRef}>
        <CurveStroke points={[[-0.278, 0.226, 0], [-0.21, 0.214, -0.01], [-0.122, 0.182, 0]]} radius={0.011} />
        <CurveStroke points={[[0.122, 0.182, 0], [0.21, 0.214, -0.01], [0.278, 0.226, 0]]} radius={0.011} />
        <group rotation-z={-0.08}>
          <OvalEye position={[-0.18, 0.108, 0]} scale={[0.048, 0.096, 0.012]} />
        </group>
        <group rotation-z={0.08}>
          <OvalEye position={[0.18, 0.108, 0]} scale={[0.046, 0.092, 0.012]} />
        </group>
        <CurveStroke points={[[-0.108, -0.18, 0], [-0.028, -0.202, -0.01], [0.078, -0.184, -0.01]]} radius={0.013} />
      </group>
    )
  }

  if (variant === 'delighted') {
    return (
      <group ref={variantRef}>
        <OvalEye position={[-0.19, 0.13, 0]} scale={[0.07, 0.124, 0.012]} />
        <OvalEye position={[0.19, 0.124, 0]} scale={[0.068, 0.12, 0.012]} />
        <CurveStroke points={[[-0.17, -0.145, 0], [-0.07, -0.256, -0.01], [0.072, -0.252, -0.01], [0.18, -0.136, 0]]} radius={0.018} />
        <mesh position={[-0.35, -0.045, -0.01]} scale={[0.038, 0.021, 0.008]} renderOrder={11}>
          <sphereGeometry args={[1, 8, 5]} />
          <meshBasicMaterial color="#ff9ec9" transparent opacity={0.48} depthWrite={false} />
        </mesh>
        <mesh position={[0.35, -0.045, -0.01]} scale={[0.038, 0.021, 0.008]} renderOrder={11}>
          <sphereGeometry args={[1, 8, 5]} />
          <meshBasicMaterial color="#ff9ec9" transparent opacity={0.48} depthWrite={false} />
        </mesh>
      </group>
    )
  }

  if (variant === 'effort') {
    return (
      <group ref={variantRef} scale={[1.12, 0.78, 1]}>
        <mesh position={[-0.18, 0.102, 0]} scale={[0.08, 0.03, 0.012]} renderOrder={12}>
          <sphereGeometry args={[1, 12, 6]} />
          <meshBasicMaterial color={FACE_INK} depthWrite={false} />
        </mesh>
        <mesh position={[0.18, 0.098, 0]} scale={[0.078, 0.03, 0.012]} renderOrder={12}>
          <sphereGeometry args={[1, 12, 6]} />
          <meshBasicMaterial color={FACE_INK} depthWrite={false} />
        </mesh>
        <CurveStroke points={[[-0.145, -0.166, 0], [-0.062, -0.194, -0.01], [0.026, -0.168, -0.01], [0.108, -0.194, -0.01], [0.16, -0.166, 0]]} radius={0.014} />
      </group>
    )
  }

  return (
    <group ref={variantRef}>
      <OvalEye position={[-0.18, 0.105, 0]} scale={[0.058, 0.122, 0.012]} />
      <OvalEye position={[0.18, 0.105, 0]} scale={[0.056, 0.118, 0.012]} />
      <CurveStroke points={[[-0.09, -0.178, 0], [-0.02, -0.218, -0.01], [0.072, -0.202, -0.01], [0.12, -0.16, 0]]} radius={0.014} />
    </group>
  )
}

function suggestAutoExpression(motion: PogoMotion, time: number): ConcretePogoOrbExpression {
  const blinkGate = Math.sin(time * 2.1) > 0.988 || Math.sin(time * 0.73 + 1.7) > 0.996
  const impact = clamp01(motion.land + motion.impactBurst * 1.2 + motion.compress * 0.2)
  const loadedSpring = clamp01(motion.faceSquash * 0.72 + motion.compress * 0.54 + motion.prep * 0.12)
  const takeoff = clamp01(motion.launch * 0.72 + motion.stretch * 0.72 + motion.toeOff * 0.18)
  const airborneJoy = clamp01(motion.airborne * 0.52 + motion.recovery * 0.48 + motion.legStretch * 0.12)
  const travelIntent = clamp01(motion.walkTravel * (0.5 + motion.run * 0.65) + motion.forwardHop * 0.32)
  const activeStride = clamp01(motion.walk * (0.5 + motion.run * 0.5))

  if ((motion.combinedDance ?? 0) > 0.35) return 'delighted'
  if ((motion.discoPoint ?? 0) > 0.35) return motion.phase > 0.28 && motion.phase < 0.68 ? 'surprised' : 'happy'
  if ((motion.carltonGroove ?? 0) > 0.35) return Math.sin(motion.phase * Math.PI * 4 - 0.3) > 0 ? 'delighted' : 'happy'
  if ((motion.overheadShimmy ?? 0) > 0.35) return Math.sin(motion.phase * Math.PI * 4 + 0.2) > -0.2 ? 'happy' : 'delighted'
  if (impact > 0.64 || loadedSpring > 0.62) return 'effort'
  if (
    takeoff > 0.52 ||
    (motion.forwardHop > 0.24 && motion.airProgress > 0.12 && motion.airProgress < 0.72) ||
    (motion.airborne > 0.68 && motion.airProgress < 0.72)
  ) {
    return 'surprised'
  }
  if (travelIntent > 0.64 && activeStride > 0.42) {
    return motion.run > 0.52 || Math.sin(motion.phase * Math.PI * 2) > 0.15 ? 'focused' : 'delighted'
  }
  if (motion.recovery > 0.42 || airborneJoy > 0.5) return 'delighted'
  if (blinkGate && motion.compress < 0.14 && motion.land < 0.14 && motion.launch < 0.18 && activeStride < 0.22) return 'blink'
  if (motion.faceSquash > 0.26 || motion.prep > 0.32) return 'squash'
  return 'neutral'
}

function expressionPriority(expression: ConcretePogoOrbExpression) {
  switch (expression) {
    case 'surprised':
      return 5
    case 'effort':
      return 4
    case 'focused':
      return 3
    case 'delighted':
    case 'happy':
      return 2
    case 'squash':
      return 1.5
    case 'blink':
      return 1
    case 'neutral':
    default:
      return 0
  }
}

function expressionHoldSeconds(expression: ConcretePogoOrbExpression) {
  switch (expression) {
    case 'surprised':
      return 0.24
    case 'effort':
      return 0.16
    case 'focused':
      return 0.22
    case 'delighted':
    case 'happy':
      return 0.26
    case 'squash':
      return 0.14
    case 'blink':
      return 0.07
    case 'neutral':
    default:
      return 0.12
  }
}

function resolveExpression(
  expression: PsychedelicPogoOrbExpression,
  motion: PogoMotion,
  time: number,
  autoExpressionRef?: MutableRefObject<ConcretePogoOrbExpression>,
  autoExpressionHoldUntilRef?: MutableRefObject<number>,
): ConcretePogoOrbExpression {
  if (expression !== 'auto') return expression
  const suggested = suggestAutoExpression(motion, time)

  if (!autoExpressionRef || !autoExpressionHoldUntilRef) return suggested

  const current = autoExpressionRef.current
  if (current === suggested) return current

  const canInterrupt =
    time >= autoExpressionHoldUntilRef.current ||
    expressionPriority(suggested) > expressionPriority(current) ||
    suggested === 'surprised' ||
    suggested === 'effort'

  if (canInterrupt) {
    autoExpressionRef.current = suggested
    autoExpressionHoldUntilRef.current = time + expressionHoldSeconds(suggested)
    return suggested
  }

  return current
}

function applyFaceMotion(
  group: THREE.Group | null,
  motion: PogoMotion,
  activeExpression: ConcretePogoOrbExpression,
  time: number,
) {
  if (!group) return
  const squash = clamp01(motion.faceSquash)
  const stretch = clamp01(motion.stretch * 0.82 + motion.legStretch * 0.18)
  const faceHide = clamp01(motion.faceHide ?? 0)
  const airSmile = activeExpression === 'happy' || activeExpression === 'delighted' ? 1 : 0
  const surprise = activeExpression === 'surprised' ? 1 : 0
  const focus = activeExpression === 'focused' ? 1 : 0
  const effort = activeExpression === 'effort' ? 1 : 0
  const idleFloat = Math.sin(time * 3.1 + 0.4) * 0.006
  const settleWobble = Math.sin(motion.phase * Math.PI * 2 + 0.9) * (motion.airborne + motion.recovery) * 0.012

  group.position.set(
    settleWobble,
    -squash * 0.032 + stretch * 0.044 + airSmile * 0.018 + surprise * 0.018 - effort * 0.01 + idleFloat,
    -1.028 - surprise * 0.004,
  )
  group.rotation.set(0, 0, -motion.bodyRotateZ * 0.32 + settleWobble * 0.75 + surprise * 0.025 + focus * 0.012 - effort * 0.01)
  group.scale.set(
    1 + squash * 0.2 - stretch * 0.05 + surprise * 0.055 + effort * 0.08,
    1 - squash * 0.22 + stretch * 0.13 + airSmile * 0.035 + surprise * 0.035 - effort * 0.08,
    1,
  )
  group.scale.multiplyScalar(1 - faceHide * 0.62)
  group.visible = faceHide < 0.96
}

function placeRubberHose(
  group: THREE.Group | null,
  start: THREE.Vector3,
  bend: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
) {
  if (!group) return
  const fillGeometry = group.userData.fillGeometry as THREE.BufferGeometry | undefined
  const outlineGeometry = group.userData.outlineGeometry as THREE.BufferGeometry | undefined
  if (fillGeometry) updateRubberHoseGeometry(fillGeometry, start, bend, end, radius)
  if (outlineGeometry) updateRubberHoseGeometry(outlineGeometry, start, bend, end, radius + 0.044, 0.065, 0.08)
}

function placeBulb(group: THREE.Group | null, position: THREE.Vector3, scale: number | [number, number, number]) {
  if (!group) return
  group.position.copy(position)
  if (Array.isArray(scale)) {
    group.scale.set(scale[0], scale[1], scale[2])
  } else {
    group.scale.setScalar(scale)
  }
}

function setGroupOpacityOrVisibility(group: THREE.Group | null, visibleAmount: number) {
  if (!group) return
  group.visible = visibleAmount > 0.035
}

function shoeHoseEndpoint(
  group: THREE.Group | null,
  side: -1 | 1,
  fallback: THREE.Vector3,
  target: THREE.Vector3,
  localOffset: THREE.Vector3,
) {
  if (!group) return target.copy(fallback)
  localOffset.set(side * 0.012, 0.34, 0.02).multiply(group.scale).applyEuler(group.rotation)
  return target.copy(group.position).add(localOffset)
}

function sideLandingPulse(phase: number, side: -1 | 1) {
  return circularPulse01(phase, 0.006 + side * 0.002, 0.108) * 0.42
}

function getFootSpringForces(motion: PogoMotion, side: -1 | 1) {
  const airborne01 = clamp01(motion.airborne / 1.32)
  const air = motion.airProgress
  const apexSync = smoothWindow(air, 0.32, 0.74, 0.16) * airborne01
  const sideLead = (side === -1 ? -0.018 : 0.018) * (1 - apexSync * 0.94)
  const toeAir = clamp01(air + sideLead)
  const whipAir = clamp01(air + sideLead * 0.65)
  const recoilAir = clamp01(air - sideLead * 0.45)
  const catchAir = clamp01(air - sideLead * 0.5)
  const heelLoad = clamp01(motion.prep * 0.34 + motion.compress * 0.88 + motion.land * 0.34 + motion.impactBurst * 0.2)
  const toePress =
    circularPulse01(motion.phase, side === -1 ? 0.124 : 0.138, 0.078) *
    clamp01(motion.compress * 0.28 + motion.launch * 0.8 + motion.toeLift * 0.36)
  const takeoffRoll = smoothWindow(toeAir, 0, 0.18, 0.07) * airborne01 * clamp01(motion.launch * 0.74 + motion.toeLift * 0.46)
  const toeFlick = pulse01(toeAir, 0.075, 0.078) * airborne01
  const ascentTuck = smoothWindow(toeAir, 0.045, 0.58, 0.18) * airborne01 * (1 - motion.landingReach * 0.78)
  const snapTuck = smoothWindow(whipAir, 0.12, 0.58, 0.18) * airborne01 * (1 - motion.landingReach * 0.72)
  const whip = pulse01(whipAir, 0.24, 0.22) * airborne01 * (1 - motion.landingReach * 0.42)
  const recoil = pulse01(recoilAir, 0.55, 0.34) * airborne01 * (1 - motion.landingReach * 0.55)
  const apexHang = pulse01(recoilAir, 0.6, 0.46) * airborne01 * (1 - motion.landingReach * 0.42)
  const airRelax = pulse01(recoilAir, 0.56, 0.42) * airborne01 * (1 - motion.landingReach * 0.42)
  const fallLag = smoothWindow(recoilAir, 0.38, 0.9, 0.26) * airborne01 * (1 - motion.landingReach * 0.62)
  const descentUnfold =
    smootherstep01((recoilAir - 0.8) / 0.26) * (1 - smootherstep01((recoilAir - 0.99) / 0.2)) * airborne01
  const landingBrace = smootherstep01((catchAir - 0.84) / 0.18) * airborne01
  const catchReach = smootherstep01((catchAir - 0.9) / 0.14) * airborne01
  const plantRebound =
    circularPulse01(motion.phase, side === -1 ? 0.05 : 0.076, 0.07) *
    clamp01(motion.recovery * 0.78 + motion.impactBurst * 0.36)
  const contactCatch = clamp01(
    motion.land * 0.72 + motion.impactBurst * 0.5 + motion.recovery * 0.18 + plantRebound * 0.24,
  )

  return {
    heelLoad,
    toePress,
    takeoffRoll,
    toeFlick,
    ascentTuck,
    snapTuck,
    whip,
    recoil,
    apexHang,
    airRelax,
    fallLag,
    descentUnfold,
    landingBrace,
    catchReach,
    plantRebound,
    contactCatch,
  }
}

function getArmSpringForces(motion: PogoMotion, side: -1 | 1) {
  const airborne01 = clamp01(motion.airborne / 1.32)
  const sideLead = side === -1 ? -0.022 : 0.022
  const armAir = clamp01(motion.airProgress + sideLead)
  const landingReach = smoothstep01(motion.landingReach)
  const ascentSwing = smoothWindow(armAir, 0.06, 0.48, 0.16) * airborne01 * (1 - landingReach * 0.18)
  const launchPump = pulse01(armAir, 0.24, 0.26) * airborne01 * (1 - landingReach * 0.34)
  const launchDrag = clamp01(motion.launch * 0.5 + pulse01(armAir, 0.12, 0.22) * airborne01 * 0.22)
  const pumpUp = clamp01(motion.launch * 0.42 + ascentSwing * 0.5 + launchPump * 0.36)
  const apexFloat = pulse01(armAir, 0.46, 0.32) * airborne01 * (1 - landingReach * 0.3)
  const descentSweep = smoothstep01((armAir - 0.54) / 0.24) * airborne01 * (1 - landingReach * 0.4)
  const descentLift = descentSweep * (1 - landingReach * 0.2)
  const impactWhip =
    circularPulse01(motion.phase, side === -1 ? 0.988 : 0.012, 0.066) *
    clamp01(motion.land + motion.impactBurst * 0.92)
  const reboundFlick =
    circularPulse01(motion.phase, side === -1 ? 0.052 : 0.084, 0.082) *
    clamp01(motion.recovery + motion.impactBurst * 0.4)
  const backswing = clamp01(
    motion.prep * 0.46 + motion.compress * 0.84 + motion.land * 0.2 + descentSweep * 0.22 - ascentSwing * 0.2 - launchPump * 0.16,
  )
  const compressionCurl = clamp01(motion.prep * 0.34 + motion.compress * 0.9 + motion.land * 0.64)
  const curl = clamp01(compressionCurl + backswing * 0.28 + descentSweep * 0.06 - pumpUp * 0.16 - apexFloat * 0.12 + impactWhip * 0.1)
  const splay = clamp01(pumpUp * 0.42 + ascentSwing * 0.28 + apexFloat * 0.66 + reboundFlick * 0.28 - backswing * 0.16 - descentSweep * 0.1)
  const drop = clamp01(backswing * 0.54 + descentSweep * 0.5 + impactWhip * 0.62 - pumpUp * 0.22 - apexFloat * 0.16 - reboundFlick * 0.24)
  const lift = clamp01(pumpUp * 0.5 + ascentSwing * 0.2 + apexFloat * 0.42 + reboundFlick * 0.32 - descentSweep * 0.22 - impactWhip * 0.16)
  const swingForward = clamp01(launchPump * 0.32 + ascentSwing * 0.24 + reboundFlick * 0.34 - descentSweep * 0.14)
  const swingBack = clamp01(backswing * 0.46 + descentSweep * 0.54 + impactWhip * 0.2 - pumpUp * 0.2)
  const hoseBow = clamp01(splay * 0.36 + motion.armStretch * 0.42 + ascentSwing * 0.24 + apexFloat * 0.22 + swingBack * 0.2 - curl * 0.08)
  const flutter =
    Math.sin(motion.phase * Math.PI * 4.8 + side * 0.7) * (pumpUp * 0.018 + apexFloat * 0.018) +
    Math.sin(motion.phase * Math.PI * 7.2 - side * 0.4) * (reboundFlick * 0.026 + impactWhip * 0.018)

  return {
    launchDrag,
    pumpUp,
    ascentSwing,
    apexFloat,
    descentLift,
    descentSweep,
    impactWhip,
    reboundFlick,
    backswing,
    curl,
    splay,
    drop,
    lift,
    swingForward,
    swingBack,
    hoseBow,
    flutter,
  }
}

function placeShoe(
  group: THREE.Group | null,
  position: THREE.Vector3,
  side: -1 | 1,
  pressure: number,
  motion: PogoMotion,
) {
  if (!group) return
  const solverBodyY = motion.limbBodyY ?? motion.bodyY
  const footRelease = 1 - motion.footPlant
  const sideImpact = sideLandingPulse(motion.phase, side)
  const footSpring = getFootSpringForces(motion, side)
  const rollingContact = clamp01(sideImpact * 0.85 + motion.impactBurst * 0.45 + pressure * 0.25 + footSpring.contactCatch * 0.18)
  const legStretch = clamp01(motion.legStretch)
  const landingReach = smoothstep01(motion.landingReach)
  const airborne01 = clamp01(motion.airborne / 1.32)
  const ascentFootLag = smoothWindow(motion.airProgress, 0.08, 0.46, 0.16) * airborne01 * (1 - landingReach * 0.72)
  const ascentFootCatch = smoothWindow(motion.airProgress, 0.28, 0.62, 0.18) * airborne01 * (1 - landingReach * 0.76)
  const ascentBodyDrag = smoothWindow(motion.airProgress, 0.08, 0.58, 0.2) * airborne01 * (1 - landingReach * 0.72)
  const idleHop = clamp01(motion.idleHop)
  const idleTransfer = clamp01(motion.idleTransfer)
  const idleReset = clamp01(motion.idleReset)
  const travelDirection = motion.travelDirection === 0 ? 1 : Math.sign(motion.travelDirection)
  const pushSide = -travelDirection
  const landSide = Math.sign(motion.idleEndX)
  const pushFootLoad = idleTransfer * motion.pushLoad * (side === pushSide ? 1 : 0)
  const landFootLoad = idleTransfer * motion.landLoad * (side === landSide ? 1 : 0)
  const roleLoad = clamp01(pushFootLoad + landFootLoad)
  const singleFootCue = idleTransfer * clamp01(Math.max(motion.pushLoad, motion.landLoad) - roleLoad * 0.96)
  const transferFreeCarry = idleTransfer * clamp01(1 - roleLoad * 1.08)
  const idleGatherContact = idleReset
  const idleSupportContact = idleHop > 0 ? clamp01(roleLoad + idleGatherContact) : 1
  const vintageIdle = idleReset * (1 - idleHop)
  const vintageStep = Math.sin(motion.phase * Math.PI * 2 + (side === -1 ? 0 : Math.PI))
  const vintageHeel = vintageIdle * clamp01((vintageStep + 1) * 0.5)
  const vintageToePress = vintageIdle * clamp01((1 - vintageStep) * 0.5)
  const walkAmount = clamp01(motion.walk)
  const walkTravel = clamp01(motion.walkTravel)
  const shoeForward = clamp01(motion.shoeForward)
  const runAmount = clamp01(motion.run)
  const walkPhase = ((motion.phase + (side === -1 ? 0 : 0.5)) % 1 + 1) % 1
  const walkSwing = walkAmount * smoothWindow(walkPhase, 0.42, 0.95, 0.16)
  const walkHeel = walkAmount * circularSoftPulse01(walkPhase, 0.025, 0.145)
  const walkToeSlap = walkTravel * walkAmount * softPulse01(walkPhase, 0.17, 0.15)
  const walkToe = walkAmount * softPulse01(walkPhase, 0.37, 0.19)
  const walkLift = walkAmount * Math.sin(smootherstep01((walkPhase - 0.42) / 0.53) * Math.PI) * walkSwing
  const walkContact = walkTravel * walkAmount * clamp01(walkHeel * 0.54 + walkToeSlap * 0.58 + walkToe * 0.3)
  const runSwingRaw = clamp01((walkPhase - 0.34) / 0.62)
  const runSwing = runAmount * smoothWindow(walkPhase, 0.34, 0.98, 0.14)
  const runLift = runAmount * Math.sin(smootherstep01(runSwingRaw) * Math.PI) * runSwing
  const shoeLift = Math.max(walkLift, runLift)
  const runImpact = runAmount * clamp01(walkHeel * 0.34 + walkToeSlap * 0.68 + motion.compress * 0.62)
  const runToeCurl = runAmount * clamp01(walkToeSlap * 0.42 + walkToe * 0.5 + motion.toeLift * 0.26)
  const runSoleFlex = runAmount * clamp01(walkHeel * 0.18 + walkToeSlap * 0.78 + walkToe * 0.66 + motion.toeLift * 0.18)
  const walkFrontDepth = walkTravel * clamp01((-position.z + 0.18) / 0.88)
  const walkBackDepth = walkTravel * clamp01((position.z - 0.02) / 0.6)
  const floorFlat = idleSupportContact * clamp01(
    motion.compress * 0.72 +
      motion.land * 0.62 +
      motion.impactBurst * 0.28 +
      footSpring.contactCatch * 0.3 +
      pressure * 0.16 -
      footRelease * 0.42 +
      walkContact * 0.44 +
      runImpact * 0.32 +
      runSoleFlex * 0.42,
  )

  const rawScaleX =
    0.41 +
    pressure * 0.072 +
    rollingContact * 0.052 +
    footSpring.heelLoad * 0.028 +
    footSpring.toePress * 0.052 +
    footRelease * 0.022 +
    legStretch * 0.052 +
    footSpring.ascentTuck * 0.008 +
    footSpring.airRelax * 0.012 +
    footSpring.landingBrace * 0.026 +
    footSpring.whip * 0.034 -
    footSpring.recoil * 0.014 -
    footSpring.plantRebound * 0.012 +
    vintageHeel * 0.058 +
    walkToe * 0.045 +
    walkHeel * 0.03 +
    walkToeSlap * 0.012 +
    runImpact * 0.052 +
    walkFrontDepth * 0.036 -
    walkBackDepth * 0.018
  const rawScaleY =
    0.315 -
    pressure * 0.038 -
    rollingContact * 0.032 +
    footSpring.heelLoad * 0.018 -
    footSpring.toePress * 0.018 +
    motion.toeLift * 0.012 -
    legStretch * 0.022 +
    footSpring.ascentTuck * 0.018 +
    footSpring.snapTuck * 0.012 +
    footSpring.airRelax * 0.02 +
    footSpring.recoil * 0.018 +
    footSpring.plantRebound * 0.026 -
    vintageToePress * 0.022 +
    vintageHeel * 0.016 -
    walkHeel * 0.02 +
    shoeLift * 0.025 +
    walkToeSlap * 0.006 +
    runImpact * -0.034 +
    walkFrontDepth * 0.006 -
    walkBackDepth * 0.004
  const rawScaleZ =
    0.365 +
    pressure * 0.03 +
    rollingContact * 0.042 -
    footSpring.heelLoad * 0.016 +
    footSpring.toePress * 0.022 +
    legStretch * 0.01 +
    footSpring.toeFlick * 0.016 +
    footSpring.ascentTuck * 0.012 +
    footSpring.landingBrace * 0.028 +
    footSpring.plantRebound * 0.014 +
    walkHeel * 0.035 +
    walkToeSlap * 0.018 +
    runImpact * 0.034 +
    walkFrontDepth * 0.048 -
    walkBackDepth * 0.014
  const shoeOutwardBias = THREE.MathUtils.lerp(0.045, 0.025, clamp01(footRelease + footSpring.ascentTuck * 0.35))
  const desiredPosition = position.clone().add(
    new THREE.Vector3(
      side *
        (shoeOutwardBias +
          motion.footSplay * 0.032 +
          sideImpact * 0.018 +
          legStretch * 0.026 +
          footSpring.snapTuck * 0.018 -
          footSpring.ascentTuck * 0.026 +
          ascentFootCatch * 0.038 -
          footSpring.toePress * 0.026 +
          footSpring.landingBrace * 0.02 +
          footSpring.whip * 0.026 -
          footSpring.recoil * 0.016),
      -0.03 -
        rollingContact * 0.008 +
        floorFlat * 0.058 +
        footSpring.heelLoad * 0.012 -
        footSpring.toePress * 0.02 +
        footSpring.takeoffRoll * 0.012 +
        footRelease * 0.024 +
        legStretch * 0.012 +
        footSpring.ascentTuck * 0.022 +
        footSpring.snapTuck * 0.044 -
        ascentFootLag * 0.035 +
        ascentFootCatch * 0.01 -
        Math.max(0, solverBodyY) * ascentBodyDrag * 0.025 +
        (singleFootCue + transferFreeCarry * 0.7) * 0.58 +
        footSpring.whip * 0.028 +
        footSpring.recoil * 0.028 -
        footSpring.catchReach * 0.018 +
        footSpring.plantRebound * 0.026,
      0.02 +
        footRelease * 0.038 +
        legStretch * 0.02 +
        footSpring.toeFlick * 0.024 +
        footSpring.takeoffRoll * 0.026 +
        footSpring.ascentTuck * 0.024 +
        footSpring.airRelax * 0.018 +
        footSpring.recoil * 0.016 -
        walkFrontDepth * 0.025 +
        walkBackDepth * 0.018,
    ),
  )
  const rawFloorCenterY = SHOE_CONTACT_FLOOR_Y + SHOE_CONTACT_CLEARANCE - SHOE_LOCAL_BOTTOM_Y * rawScaleY
  const floorSquashWindow = THREE.MathUtils.lerp(0.08, 0.052, runAmount)
  const floorSquash = clamp01(((rawFloorCenterY - desiredPosition.y) / floorSquashWindow) * floorFlat)
  const idleBottomContact =
    vintageIdle * (1 - walkAmount) * (1 - runAmount) * clamp01(motion.compress * 1.42 + motion.land * 0.72 + floorSquash * 0.42)
  const toeCurlFloorContribution = floorSquash * THREE.MathUtils.lerp(0.92, 0.34, idleBottomContact)
  const rawToeCurl = clamp01(
    walkToeSlap * 0.74 +
      walkToe * 0.68 +
      walkContact * 0.12 +
      footSpring.toePress * 0.42 +
      footSpring.takeoffRoll * 0.24 +
      vintageToePress * 0.34 +
      runToeCurl * 0.58 +
      runSoleFlex * 0.72 +
      toeCurlFloorContribution +
      sideImpact * 0.18,
  )
  const toeCurl = THREE.MathUtils.lerp(rawToeCurl, Math.min(rawToeCurl, 0.34), idleBottomContact * 0.86)
  const runToeBend = runAmount * clamp01(runSoleFlex * 0.78 + floorSquash * 0.9 + runImpact * 0.45)
  const scaleY = Math.max(0.19, rawScaleY - floorSquash * 0.065 - runToeBend * 0.014)
  const toeFloorLift =
    toeCurl * 0.026 + floorSquash * (0.014 + idleBottomContact * 0.018) + runToeCurl * 0.02 + runToeBend * 0.048
  const floorCenterY = SHOE_CONTACT_FLOOR_Y + SHOE_CONTACT_CLEARANCE + toeFloorLift - SHOE_LOCAL_BOTTOM_Y * scaleY
  group.position.copy(desiredPosition)
  group.position.y = Math.max(desiredPosition.y, floorCenterY)
  const toeGroup = group.userData.toeGroup as THREE.Group | null | undefined
  if (toeGroup) {
    toeGroup.position.set(
      side * 0.62,
      -0.02 + toeCurl * 0.038 + floorSquash * 0.012 + runToeBend * 0.035,
      0.02 - toeCurl * 0.018 - runToeBend * 0.026,
    )
    toeGroup.rotation.set(0, 0, side * (toeCurl * 0.52 + runToeBend * 0.38))
    toeGroup.scale.set(
      1 + toeCurl * 0.045 + runToeBend * 0.036,
      1 - toeCurl * 0.07 + floorSquash * 0.015 - runToeBend * 0.032,
      1 + toeCurl * 0.025 + runToeBend * 0.018,
    )
  }
  const rawPitch =
    -motion.toeLift * 0.22 -
      footSpring.takeoffRoll * 0.2 -
      footSpring.toeFlick * 0.32 -
      footSpring.ascentTuck * 0.16 -
      footSpring.snapTuck * 0.08 -
      ascentFootCatch * 0.12 +
      ascentFootLag * 0.04 -
      footSpring.whip * 0.16 +
      footSpring.recoil * 0.16 +
      footSpring.landingBrace * 0.08 +
      footSpring.catchReach * 0.12 +
      footSpring.plantRebound * 0.11 +
      sideImpact * 0.14 -
      pressure * 0.035 +
      vintageHeel * 0.36 -
      vintageToePress * 0.08 +
      walkHeel * 0.66 -
      walkToeSlap * 0.44 -
      walkToe * 0.38 -
      shoeLift * 0.18 +
      runAmount * (walkHeel * 0.14 + runToeBend * 0.32 - walkToeSlap * 0.08 - walkToe * 0.06)
  const rawYaw =
    side *
    (motion.footRoll * 0.12 +
      footRelease * 0.082 +
      footSpring.toeFlick * 0.064 +
      footSpring.takeoffRoll * 0.028 +
      footSpring.ascentTuck * 0.024 -
      footSpring.recoil * 0.042 +
      vintageHeel * 0.078 -
      vintageToePress * 0.026 +
      walkAmount * 0.06 +
      walkHeel * 0.045 +
      walkTravel * (walkHeel * 0.04 - walkToe * 0.03))
  const rawRoll =
    side *
    (-0.22 -
      motion.footSplay * 0.19 -
      pressure * 0.068 -
      sideImpact * 0.064 -
      footSpring.toePress * 0.05 -
      footSpring.landingBrace * 0.036 -
      footSpring.whip * 0.046)
  const forwardToeAmount = clamp01(walkTravel + shoeForward * THREE.MathUtils.lerp(1, 0.68, idleBottomContact))
  const walkForwardYaw =
    side * (Math.PI * (0.39 + runAmount * 0.04 - idleBottomContact * vintageIdle * 0.045) + walkHeel * 0.055 - walkToe * 0.036)
  const shapedYaw = THREE.MathUtils.lerp(rawYaw, walkForwardYaw, forwardToeAmount * 0.92)
  const flatYawTarget = THREE.MathUtils.lerp(
    side * (0.155 + motion.footSplay * 0.02),
    walkForwardYaw,
    forwardToeAmount * 0.96,
  )
  const shapedRoll = THREE.MathUtils.lerp(rawRoll, rawRoll * 0.32, forwardToeAmount * 0.88)
  const flatRollTarget = THREE.MathUtils.lerp(
    side * (-0.022 - motion.footSplay * 0.008),
    side * -0.018,
    forwardToeAmount * 0.78,
  )
  const contactFlat = clamp01(floorFlat + walkContact * 0.72 + runToeBend * 0.46 + runImpact * 0.2)
  group.rotation.set(
    THREE.MathUtils.lerp(
      rawPitch,
      0.012 + footSpring.plantRebound * 0.018 + runToeBend * 0.052,
      contactFlat * 0.82 + floorSquash * 0.18,
    ),
    THREE.MathUtils.lerp(shapedYaw, flatYawTarget, contactFlat * 0.64),
    THREE.MathUtils.lerp(shapedRoll, flatRollTarget, contactFlat * 0.82 + floorSquash * 0.18),
  )
  group.scale.set(
    rawScaleX + floorSquash * 0.13 + runToeBend * 0.035,
    scaleY,
    rawScaleZ + floorSquash * 0.065 + runToeBend * 0.018,
  )
}

function placeFootImpact(
  group: THREE.Group | null,
  material: THREE.MeshBasicMaterial,
  position: THREE.Vector3,
  side: -1 | 1,
  amount: number,
) {
  if (!group) return
  group.visible = amount > 0.025
  group.position.set(position.x + side * 0.58, -2.025, position.z + 0.07)
  group.rotation.set(0, 0, side * (0.1 + amount * 0.12))
  group.scale.set(0.58 + amount * 0.86, 0.42 + amount * 0.5, 1)
  material.opacity = amount * 0.64
}

function placeBallImpact(
  group: THREE.Group | null,
  material: THREE.MeshBasicMaterial,
  side: -1 | 1,
  motion: PogoMotion,
  amount: number,
) {
  if (!group) return
  group.visible = amount > 0.025
  group.position.set(motion.bodyX + side * 0.2, -2.03, 0.08)
  group.rotation.set(0, 0, side * (0.06 + amount * 0.08))
  group.scale.set(1.04 + amount * 1.45, 0.64 + amount * 0.72, 1)
  material.opacity = amount * 0.58
}

function setFaceVariantVisible(
  refs: Array<[ConcretePogoOrbExpression, MutableRefObject<THREE.Group | null>]>,
  active: ConcretePogoOrbExpression,
) {
  refs.forEach(([name, ref]) => {
    if (ref.current) ref.current.visible = name === active
  })
}

function transformBodyPoint(local: THREE.Vector3, motion: PogoMotion, bodyQuaternion: THREE.Quaternion) {
  return local
    .clone()
    .multiply(new THREE.Vector3(motion.bodyScaleX, motion.bodyScaleY, motion.bodyScaleZ))
    .applyQuaternion(bodyQuaternion)
    .add(new THREE.Vector3(motion.bodyX, motion.bodyY, 0))
}

function limbPose(side: -1 | 1, motion: PogoMotion, bodyQuaternion: THREE.Quaternion) {
  const hipLocal = new THREE.Vector3(side * 0.42, -0.78, -0.03)
  const shoulderLocal = new THREE.Vector3(side * 0.86, -0.05, -0.08)
  const hip = transformBodyPoint(hipLocal, motion, bodyQuaternion)
  const shoulder = transformBodyPoint(shoulderLocal, motion, bodyQuaternion)
  const solverBodyY = motion.limbBodyY ?? motion.bodyY
  const launchLift = motion.launch * 0.62
  const kneeOut = motion.kneeOut
  const legBend = motion.legBend
  const footRelease = 1 - motion.footPlant
  const landingReach = smoothstep01(motion.landingReach)
  const toeOff = smoothstep01(motion.toeOff)
  const footSpring = getFootSpringForces(motion, side)
  const idleHop = clamp01(motion.idleHop)
  const idleTransfer = clamp01(motion.idleTransfer)
  const travelDirection = motion.travelDirection === 0 ? 1 : Math.sign(motion.travelDirection)
  const pushSide = -travelDirection
  const landSide = Math.sign(motion.idleEndX)
  const pushFootLoad = idleTransfer * motion.pushLoad * (side === pushSide ? 1 : 0)
  const landFootLoad = idleTransfer * motion.landLoad * (side === landSide ? 1 : 0)
  const roleLoad = clamp01(pushFootLoad + landFootLoad)
  const singleFootCue = idleTransfer * clamp01(Math.max(motion.pushLoad, motion.landLoad) - roleLoad * 0.96)
  const transferFreeCarry = idleTransfer * clamp01(1 - roleLoad * 1.08)
  const vintageIdle = clamp01(motion.idleReset) * (1 - idleHop)
  const vintageStep = Math.sin(motion.phase * Math.PI * 2 + (side === -1 ? 0 : Math.PI))
  const vintageHeel = vintageIdle * clamp01((vintageStep + 1) * 0.5)
  const vintageCounter = vintageIdle * Math.sin(motion.phase * Math.PI * 2 + (side === -1 ? Math.PI : 0))
  const walkAmount = clamp01(motion.walk)
  const walkTravel = clamp01(motion.walkTravel)
  const runAmount = clamp01(motion.run)
  const forwardHop = clamp01(motion.forwardHop)
  const idleFreeLift = clamp01(
    transferFreeCarry * 0.34 + transferFreeCarry * clamp01(motion.airborne / 1.32) * 0.74 + singleFootCue * 1.08,
  )
  const idleAirTuck = smoothWindow(motion.airProgress, 0.08, 0.74, 0.18)
  const idleSingleFootTuck = smootherstep01(singleFootCue)
  const idleFreeTuck = idleFreeLift * clamp01(idleAirTuck + idleSingleFootTuck * 0.96 + transferFreeCarry * 0.44)
  const airborneFollow = smoothstep01(
    clamp01(
      footRelease +
        toeOff * 0.12 +
        footSpring.toeFlick * 0.16 +
        footSpring.ascentTuck * 0.12 +
        idleFreeLift * 0.18 -
        roleLoad * 0.12 -
        landingReach * 0.08 +
        transferFreeCarry * 0.86,
    ),
  )
  const legStretch = clamp01(motion.legStretch)
  const armStretch = clamp01(motion.armStretch)
  const looseness = motion.airborne + motion.recovery + motion.land * 0.35
  const sideWave = Math.sin(motion.phase * Math.PI * 2 + side * 0.68)
  const oppositeWave = Math.sin(motion.phase * Math.PI * 2 - side * 0.42)
  const apexFootSync = smoothWindow(motion.airProgress, 0.32, 0.74, 0.16) * clamp01(motion.airborne / 1.32)
  const postApexFloat = smoothWindow(motion.airProgress, 0.48, 0.73, 0.18) * clamp01(motion.airborne / 1.32) * (1 - landingReach * 0.5)
  const ascentFootLag = smoothWindow(motion.airProgress, 0.08, 0.46, 0.16) * clamp01(motion.airborne / 1.32) * (1 - landingReach * 0.72)
  const ascentFootCatch = smoothWindow(motion.airProgress, 0.28, 0.62, 0.18) * clamp01(motion.airborne / 1.32) * (1 - landingReach * 0.76)
  const ascentBodyDrag = smoothWindow(motion.airProgress, 0.08, 0.58, 0.2) * clamp01(motion.airborne / 1.32) * (1 - landingReach * 0.72)
  const apexFootCurl = smoothWindow(motion.airProgress, 0.34, 0.68, 0.18) * clamp01(motion.airborne / 1.32) * (1 - landingReach * 0.76)
  const forwardAir = forwardHop * clamp01(motion.airborne / 1.36)
  const forwardTrail =
    forwardHop *
    (smoothWindow(motion.airProgress, 0.035, 0.5, 0.16) * forwardAir * (1 - landingReach * 0.58) + motion.launch * 0.18)
  const forwardTuck = forwardHop * smoothWindow(motion.airProgress, 0.18, 0.68, 0.18) * forwardAir * (1 - landingReach * 0.52)
  const forwardReach = forwardHop * smootherstep01((motion.airProgress - 0.62) / 0.28) * forwardAir
  const forwardBrace = forwardHop * clamp01(forwardReach * 0.74 + motion.land * 0.48 + motion.impactBurst * 0.28)
  const forwardLandingFoot = forwardHop * (side === -1 ? 1 : 0)
  const forwardFreeFoot = forwardHop * (side === 1 ? 1 : 0)
  const forwardLandingLoad = forwardLandingFoot * forwardBrace
  const forwardLandingStride = forwardLandingFoot * clamp01(forwardBrace * 0.65 + motion.land * 0.42 + motion.impactBurst * 0.26 + landingReach * 0.18)
  const forwardFreeTuck = forwardFreeFoot * clamp01(forwardTuck * 0.42 + forwardReach * 0.78 + motion.land * 0.52 + motion.recovery * 0.24)
  const transferAir = idleTransfer * clamp01(motion.airborne / 1.32)
  const transferPushTrail =
    transferAir * (side === pushSide ? 1 : 0) * smoothWindow(motion.airProgress, 0.04, 0.46, 0.15) * (1 - motion.landLoad * 0.7)
  const transferCatchReach =
    transferAir * (side === landSide ? 1 : 0) * smootherstep01((motion.airProgress - 0.62) / 0.24) * (1 - motion.pushLoad * 0.5)
  const legSideWave = sideWave * (1 - apexFootSync * 0.86)
  const legOppositeWave = oppositeWave * (1 - apexFootSync * 0.86)
  const sideImpact = sideLandingPulse(motion.phase, side)
  const rollingContact = clamp01(sideImpact * 0.82 + motion.impactBurst * 0.42 + motion.compress * 0.16)
  const plantedFlat = clamp01(
    motion.compress * 0.82 + motion.land * 0.58 + rollingContact * 0.36 + footSpring.contactCatch * 0.22 - footRelease * 0.34,
  )
  const overheadShimmy = clamp01(motion.overheadShimmy ?? 0)
  const carltonGroove = clamp01(motion.carltonGroove ?? 0)
  const discoPoint = clamp01(motion.discoPoint ?? 0)
  const combinedDance = clamp01(motion.combinedDance ?? 0)

  if (combinedDance > 0.001) {
    const phase = motion.phase
    const { discoEnd, discoToCarltonEnd, carltonEnd, carltonToWalkEnd, walkEnd, walkToOverheadEnd, overheadEnd } =
      POGO_BOOGIE_TIMING
    const getWeights = () => {
      if (phase < discoEnd) return { disco: 1, carlton: 0, runningMan: 0, overhead: 0 }
      if (phase < discoToCarltonEnd) {
        const t = smootherstep01((phase - discoEnd) / (discoToCarltonEnd - discoEnd))
        return { disco: 1 - t, carlton: t, runningMan: 0, overhead: 0 }
      }
      if (phase < carltonEnd) return { disco: 0, carlton: 1, runningMan: 0, overhead: 0 }
      if (phase < carltonToWalkEnd) {
        const t = smootherstep01((phase - carltonEnd) / (carltonToWalkEnd - carltonEnd))
        return { disco: 0, carlton: 1 - t, runningMan: t, overhead: 0 }
      }
      if (phase < walkEnd) return { disco: 0, carlton: 0, runningMan: 1, overhead: 0 }
      if (phase < walkToOverheadEnd) {
        const t = smootherstep01((phase - walkEnd) / (walkToOverheadEnd - walkEnd))
        return { disco: 0, carlton: 0, runningMan: 1 - t, overhead: t }
      }
      if (phase < overheadEnd) return { disco: 0, carlton: 0, runningMan: 0, overhead: 1 }
      const t = smootherstep01((phase - overheadEnd) / (1 - overheadEnd))
      return { disco: t, carlton: 0, runningMan: 0, overhead: 1 - t }
    }
    const weights = getWeights()
    let discoPhase = ((phase / discoEnd) * POGO_BOOGIE_DISCO_HOLD_CYCLES + POGO_BOOGIE_DISCO_START_PHASE) % 1
    let carltonPhase =
      (clamp01((phase - discoToCarltonEnd) / (carltonEnd - discoToCarltonEnd)) * POGO_BOOGIE_CARLTON_HOLD_CYCLES +
        POGO_BOOGIE_CARLTON_START_PHASE) %
      1
    let runningManPhase =
      (clamp01((phase - carltonToWalkEnd) / (walkEnd - carltonToWalkEnd)) * POGO_BOOGIE_RUNNING_MAN_HOLD_CYCLES +
        POGO_BOOGIE_RUNNING_MAN_START_PHASE) %
      1
    let overheadPhase =
      POGO_BOOGIE_OVERHEAD_ENTRY_PHASE +
      clamp01((phase - walkToOverheadEnd) / (overheadEnd - walkToOverheadEnd)) *
        (POGO_BOOGIE_OVERHEAD_EXIT_PHASE - POGO_BOOGIE_OVERHEAD_ENTRY_PHASE)
    let discoToCarltonT = 0
    let carltonToWalkT = 0
    let walkToOverheadT = 0
    let overheadToDiscoT = 0
    if (phase >= discoEnd && phase < discoToCarltonEnd) {
      discoToCarltonT = (phase - discoEnd) / (discoToCarltonEnd - discoEnd)
      discoPhase = THREE.MathUtils.lerp(
        (POGO_BOOGIE_DISCO_START_PHASE + POGO_BOOGIE_DISCO_HOLD_CYCLES) % 1,
        POGO_BOOGIE_DISCO_BRIDGE_EXIT_PHASE,
        discoToCarltonT,
      )
      carltonPhase = THREE.MathUtils.lerp(0.84, POGO_BOOGIE_CARLTON_START_PHASE, smootherstep01(discoToCarltonT))
    } else if (phase >= carltonEnd && phase < carltonToWalkEnd) {
      carltonToWalkT = (phase - carltonEnd) / (carltonToWalkEnd - carltonEnd)
      carltonPhase = THREE.MathUtils.lerp(
        POGO_BOOGIE_CARLTON_START_PHASE + POGO_BOOGIE_CARLTON_HOLD_CYCLES,
        POGO_BOOGIE_CARLTON_BRIDGE_EXIT_PHASE,
        carltonToWalkT,
      )
      runningManPhase = THREE.MathUtils.lerp(0.9, POGO_BOOGIE_RUNNING_MAN_START_PHASE, smootherstep01(carltonToWalkT))
    } else if (phase >= walkEnd && phase < walkToOverheadEnd) {
      walkToOverheadT = (phase - walkEnd) / (walkToOverheadEnd - walkEnd)
      runningManPhase = THREE.MathUtils.lerp(
        (POGO_BOOGIE_RUNNING_MAN_START_PHASE + POGO_BOOGIE_RUNNING_MAN_HOLD_CYCLES) % 1,
        0.96,
        walkToOverheadT,
      )
      overheadPhase = THREE.MathUtils.lerp(0.02, POGO_BOOGIE_OVERHEAD_ENTRY_PHASE, smootherstep01(walkToOverheadT))
    } else if (phase >= overheadEnd) {
      overheadToDiscoT = (phase - overheadEnd) / (1 - overheadEnd)
      overheadPhase = THREE.MathUtils.lerp(POGO_BOOGIE_OVERHEAD_EXIT_PHASE, POGO_BOOGIE_OVERHEAD_WRAP_PHASE, overheadToDiscoT)
      discoPhase =
        (THREE.MathUtils.lerp(0.82, POGO_BOOGIE_DISCO_START_PHASE + 1, smootherstep01(overheadToDiscoT)) % 1 + 1) % 1
    }
    const mixPose = {
      hip: new THREE.Vector3(),
      knee: new THREE.Vector3(),
      foot: new THREE.Vector3(),
      shoulder: new THREE.Vector3(),
      elbow: new THREE.Vector3(),
      hand: new THREE.Vector3(),
    }
    const addPose = (
      weight: number,
      pose: {
        hip: THREE.Vector3
        knee: THREE.Vector3
        foot: THREE.Vector3
        shoulder: THREE.Vector3
        elbow: THREE.Vector3
        hand: THREE.Vector3
      },
    ) => {
      if (weight <= 0) return
      mixPose.hip.addScaledVector(pose.hip, weight)
      mixPose.knee.addScaledVector(pose.knee, weight)
      mixPose.foot.addScaledVector(pose.foot, weight)
      mixPose.shoulder.addScaledVector(pose.shoulder, weight)
      mixPose.elbow.addScaledVector(pose.elbow, weight)
      mixPose.hand.addScaledVector(pose.hand, weight)
    }
    const discoPose = () => {
      const sweepToHorizontal = smootherstep01((discoPhase - 0.14) / 0.16)
      const leftWiden = smootherstep01((discoPhase - 0.34) / 0.14) * (1 - smootherstep01((discoPhase - 0.6) / 0.05))
      const snapUp = smootherstep01((discoPhase - 0.62) / 0.14)
      const pointHigh = discoPhase < 0.14 ? 1 : discoPhase < 0.62 ? 1 - sweepToHorizontal : snapUp
      const horizontalPoint = discoPhase < 0.14 ? 0 : discoPhase < 0.62 ? sweepToHorizontal : 1 - snapUp
      const hardTurn = circularPulse01(discoPhase, 0.62, 0.08)
      const skyHit = Math.max(circularPulse01(discoPhase, 0.78, 0.12), circularPulse01(discoPhase, 0.02, 0.1))
      const shoulderShimmy = Math.sin(discoPhase * Math.PI * 4 + side * 0.55)
      const hipPop = THREE.MathUtils.lerp(0.72, -0.68, pointHigh) + hardTurn * 0.22 - horizontalPoint * 0.1 - leftWiden * 0.18
      const support = clamp01(0.5 + side * hipPop * 0.5)
      const tap = clamp01(1 - support)
      const footPose = new THREE.Vector3(
        motion.bodyX * 0.14 + side * (0.46 + support * 0.08 + horizontalPoint * 0.03 - tap * 0.025),
        -1.94 + tap * 0.13 + hardTurn * 0.04 + Math.max(0, shoulderShimmy) * 0.026,
        -0.035 + side * 0.045 - support * 0.045 + tap * 0.075 + horizontalPoint * 0.04,
      )
      const kneePose = new THREE.Vector3(
        THREE.MathUtils.lerp(hip.x, footPose.x, 0.52) + side * (0.4 + support * 0.14 + tap * 0.08 + hardTurn * 0.08),
        (hip.y + footPose.y) * 0.5 - 0.2 - support * 0.07 + tap * 0.17 + skyHit * 0.035,
        THREE.MathUtils.lerp(hip.z, footPose.z, 0.58) + side * Math.sin(discoPhase * Math.PI * 2 + side * 0.4) * 0.025,
      )

      if (side === 1) {
        const highHand = new THREE.Vector3(shoulder.x + 1.12 + skyHit * 0.12, shoulder.y + 1.92 + skyHit * 0.16, shoulder.z - 0.43)
        const horizontalHand = new THREE.Vector3(
          shoulder.x + 0.28 + horizontalPoint * 0.05 - leftWiden * 0.72,
          shoulder.y + 0.08 + hardTurn * 0.03 + leftWiden * 0.05,
          shoulder.z - 1.48 - horizontalPoint * 0.18 - leftWiden * 0.08,
        )
        const highElbow = new THREE.Vector3(shoulder.x + 0.36 + skyHit * 0.08, shoulder.y + 0.88 + skyHit * 0.1, shoulder.z - 0.04)
        const horizontalElbow = new THREE.Vector3(
          shoulder.x + 0.18 + horizontalPoint * 0.04 - leftWiden * 0.34,
          shoulder.y + 0.05 - hardTurn * 0.02,
          shoulder.z - 0.82 - horizontalPoint * 0.08 - leftWiden * 0.04,
        )
        const handPose =
          discoPhase < 0.14 || discoPhase >= 0.76
            ? highHand
            : discoPhase < 0.62
              ? highHand.clone().lerp(horizontalHand, sweepToHorizontal)
              : horizontalHand.clone().lerp(highHand, snapUp)
        const elbowPose =
          discoPhase < 0.14 || discoPhase >= 0.76
            ? highElbow
            : discoPhase < 0.62
              ? highElbow.clone().lerp(horizontalElbow, sweepToHorizontal)
              : horizontalElbow.clone().lerp(highElbow, snapUp)
        return { hip, knee: kneePose, foot: footPose, shoulder, elbow: elbowPose, hand: handPose }
      }

      const waistBounce = Math.sin(discoPhase * Math.PI * 4 + 0.45)
      return {
        hip,
        knee: kneePose,
        foot: footPose,
        shoulder,
        elbow: new THREE.Vector3(shoulder.x + side * (0.72 + hardTurn * 0.08), shoulder.y - 0.56 + skyHit * 0.05 + waistBounce * 0.026, shoulder.z + 0.08 + waistBounce * 0.045),
        hand: new THREE.Vector3(hip.x + side * (0.34 + hardTurn * 0.035), hip.y + 0.15 + waistBounce * 0.032 + skyHit * 0.025, hip.z - 0.13 + support * 0.05 + waistBounce * 0.035),
      }
    }
    const carltonPose = () => {
      const beat = carltonPhase * Math.PI * 2
      const grooveSide = Math.sin(beat)
      const crossSweep = Math.sin(beat + 0.18)
      const centerPulse = 1 - Math.abs(grooveSide)
      const shoulderPop = Math.max(circularPulse01(carltonPhase, 0.18, 0.14), circularPulse01(carltonPhase, 0.68, 0.14))
      const handSnap = Math.max(circularPulse01(carltonPhase, 0.28, 0.12), circularPulse01(carltonPhase, 0.78, 0.12))
      const sideLoad = clamp01(0.5 + side * grooveSide * 0.5)
      const freeStep = 1 - sideLoad
      const heelPop = Math.max(0, Math.sin(beat * 2 + side * 0.45))
      const footPose = new THREE.Vector3(
        motion.bodyX * 0.14 + side * (0.46 + sideLoad * 0.11 + freeStep * 0.045),
        -1.94 + freeStep * 0.14 + heelPop * 0.062 + shoulderPop * 0.018,
        -0.04 + side * 0.035 + freeStep * 0.12 - sideLoad * 0.055 + crossSweep * 0.025,
      )
      const kneePose = new THREE.Vector3(
        THREE.MathUtils.lerp(hip.x, footPose.x, 0.54) + side * (0.36 + sideLoad * 0.2 + freeStep * 0.16 + centerPulse * 0.12),
        (hip.y + footPose.y) * 0.5 - 0.23 - sideLoad * 0.06 + freeStep * 0.14 + shoulderPop * 0.04,
        THREE.MathUtils.lerp(hip.z, footPose.z, 0.58) + Math.sin(beat + side * 0.62) * 0.035 + crossSweep * 0.025,
      )
      const sharedSweep = crossSweep * 0.54
      const frontPump = smootherstep01((Math.cos(beat * 2 - 0.18) + 1) * 0.5)
      const forwardReach = 0.62 + frontPump * 0.46 + centerPulse * 0.14
      const elbowFlare = side * (0.62 + centerPulse * 0.24 + frontPump * 0.12)
      const armHeightStagger = side * 0.12 * crossSweep
      return {
        hip,
        knee: kneePose,
        foot: footPose,
        shoulder,
        elbow: new THREE.Vector3(
          shoulder.x + elbowFlare + crossSweep * 0.34,
          shoulder.y - (0.12 - shoulderPop * 0.18 - centerPulse * 0.14) + Math.sin(beat * 2 - 0.25 + side * 0.3) * 0.055 + armHeightStagger,
          shoulder.z - 0.24 - forwardReach * 0.26 + side * 0.025,
        ),
        hand: new THREE.Vector3(
          hip.x + sharedSweep + side * (0.24 + centerPulse * 0.08) + Math.sin(beat * 3 + side * 0.5) * 0.045,
          shoulder.y - (0.36 - shoulderPop * 0.32 - centerPulse * 0.2) + handSnap * 0.095 + armHeightStagger * 0.62,
          shoulder.z - 0.9 - forwardReach * 0.68 + side * 0.035,
        ),
      }
    }
    const overheadPose = () => {
      const beat = overheadPhase * Math.PI * 2
      const footWave = Math.sin(beat - 0.78)
      const hipWave = Math.sin(beat)
      const torsoWave = Math.sin(beat + 0.58)
      const shoulderWave = Math.sin(beat + 1.04)
      const handWave = Math.sin(beat + 1.42 + side * 0.18)
      const sideCrest = Math.sin(beat + 1.25 + side * 1.2)
      const ripple = Math.sin(beat * 2 + side * 0.55)
      const wristFlutter = Math.sin(beat * 4 + side * 0.85) * 0.26 + ripple * 0.14
      const stepSwitch = Math.sin(beat + side * Math.PI)
      const footCross = smootherstep01((stepSwitch + 1) * 0.5)
      const support = smootherstep01((side * footWave + 1) * 0.5)
      const footPose = new THREE.Vector3(
        motion.bodyX * 0.18 + side * (0.35 + support * 0.12 - footCross * 0.17) + hipWave * 0.04,
        -1.94 + footCross * 0.15 + Math.max(0, -torsoWave) * 0.06 + support * 0.035,
        -0.035 + side * 0.022 + footCross * 0.13 - support * 0.06 + hipWave * 0.048,
      )
      return {
        hip,
        knee: new THREE.Vector3(
          THREE.MathUtils.lerp(hip.x, footPose.x, 0.54) + side * (0.36 + support * 0.16 - footCross * 0.09) - hipWave * 0.075,
          (hip.y + footPose.y) * 0.5 - 0.2 - support * 0.045 + footCross * 0.17 + Math.max(0, torsoWave) * 0.055,
          THREE.MathUtils.lerp(hip.z, footPose.z, 0.58) + side * 0.025 + torsoWave * 0.065,
        ),
        foot: footPose,
        shoulder,
        elbow: new THREE.Vector3(
          shoulder.x + side * (0.76 + sideCrest * 0.14) - torsoWave * 0.13,
          shoulder.y + 0.68 + sideCrest * 0.11 + Math.max(0, shoulderWave) * 0.08 - support * 0.035 + Math.max(0, -handWave) * 0.055,
          shoulder.z - 0.07 + side * 0.025 - wristFlutter * 0.02 + torsoWave * 0.08,
        ),
        hand: new THREE.Vector3(
          shoulder.x + side * (0.5 + sideCrest * 0.12 + wristFlutter * 0.03) + torsoWave * 0.21,
          shoulder.y + 1.48 + sideCrest * 0.13 + Math.max(0, handWave) * 0.11 + Math.max(0, -side * shoulderWave) * 0.07,
          shoulder.z - 0.3 + side * 0.06 + handWave * 0.095 + hipWave * 0.07,
        ),
      }
    }
    const runningManPose = () => {
      const walkPhase = ((runningManPhase + (side === -1 ? 0 : 0.5)) % 1 + 1) % 1
      const armPhase = ((runningManPhase + (side === 1 ? 0 : 0.5)) % 1 + 1) % 1
      const swing = smoothWindow(walkPhase, 0.38, 0.95, 0.14)
      const swingT = smootherstep01((walkPhase - 0.38) / 0.57)
      const liftArc = Math.sin(swingT * Math.PI) * swing
      const heelStrike = circularPulse01(walkPhase, 0.02, 0.14)
      const toePushDance = pulse01(walkPhase, 0.34, 0.17)
      const passingKnee = pulse01(walkPhase, 0.68, 0.28) * swing
      const slide = Math.cos(walkPhase * Math.PI * 2 - 0.18)
      const punchForward = smootherstep01((Math.cos(armPhase * Math.PI * 2) + 1) * 0.5)
      const punchBack = 1 - punchForward
      const punchHit = circularSoftPulse01(armPhase, 0.02, 0.16)
      const elbowMid = 1 - Math.abs(Math.cos(armPhase * Math.PI * 2))
      const wristWobble = Math.sin(armPhase * Math.PI * 6 + side * 0.65) * 0.045
      const footPose = new THREE.Vector3(
        motion.bodyX * 0.12 + side * (0.62 + heelStrike * 0.08 + liftArc * 0.16 + slide * 0.055),
        -1.88 + liftArc * 0.78 + toePushDance * 0.11 + heelStrike * 0.026,
        -0.04 + slide * 0.2 - liftArc * 0.06 + side * 0.018,
      )
      const kneePose = new THREE.Vector3(
        hip.x + side * (0.54 + liftArc * 0.42 + passingKnee * 0.24 + heelStrike * 0.1),
        (hip.y + footPose.y) * 0.5 - 0.1 + liftArc * 0.42 + passingKnee * 0.18 - heelStrike * 0.03,
        THREE.MathUtils.lerp(hip.z, footPose.z, 0.58) - liftArc * 0.08 + side * 0.012,
      )
      const elbowPose = new THREE.Vector3(
        shoulder.x + side * (0.82 + elbowMid * 0.28 + punchBack * 0.22 + wristWobble),
        shoulder.y - (0.02 + punchBack * 0.36 - punchForward * 0.12 - elbowMid * 0.1 - punchHit * 0.08),
        shoulder.z - 0.18 - punchForward * 0.36 + punchBack * 0.14 + wristWobble * 0.35,
      )
      const handPose = new THREE.Vector3(
        shoulder.x + side * (1.04 + elbowMid * 0.34 + punchBack * 0.28 + wristWobble * 1.4),
        shoulder.y - (0.08 + punchBack * 0.5 - punchForward * 0.2 - elbowMid * 0.16 - punchHit * 0.13),
        shoulder.z - 0.42 - punchForward * 0.84 + punchBack * 0.22 - wristWobble * 0.45,
      )

      return { hip, knee: kneePose, foot: footPose, shoulder, elbow: elbowPose, hand: handPose }
    }

    type CombinedDancePose = {
      hip: THREE.Vector3
      knee: THREE.Vector3
      foot: THREE.Vector3
      shoulder: THREE.Vector3
      elbow: THREE.Vector3
      hand: THREE.Vector3
    }
    const blendDancePose = (fromPose: CombinedDancePose, toPose: CombinedDancePose, t: number): CombinedDancePose => {
      const ease = smootherstep01(t)
      return {
        hip: fromPose.hip.clone().lerp(toPose.hip, ease),
        knee: fromPose.knee.clone().lerp(toPose.knee, ease),
        foot: fromPose.foot.clone().lerp(toPose.foot, ease),
        shoulder: fromPose.shoulder.clone().lerp(toPose.shoulder, ease),
        elbow: fromPose.elbow.clone().lerp(toPose.elbow, ease),
        hand: fromPose.hand.clone().lerp(toPose.hand, ease),
      }
    }

    if (discoToCarltonT > 0) {
      const arc = Math.sin(discoToCarltonT * Math.PI)
      const pulse = Math.sin(discoToCarltonT * Math.PI * 2 - 0.25)
      const pose = blendDancePose(discoPose(), carltonPose(), discoToCarltonT)
      pose.hand.x += side * 0.14 * arc + (side === 1 ? -0.12 : 0.06) * arc
      pose.hand.y += (side === 1 ? -0.18 : 0.12) * arc + pulse * 0.024
      pose.hand.z += -0.22 * arc
      pose.elbow.x += side * 0.22 * arc
      pose.elbow.y += 0.08 * arc
      pose.elbow.z += -0.08 * arc
      pose.knee.x += side * 0.06 * arc
      pose.knee.y += 0.035 * arc
      pose.foot.y += Math.max(0, pulse) * 0.028
      return pose
    }

    if (carltonToWalkT > 0) {
      const arc = Math.sin(carltonToWalkT * Math.PI)
      const pose = blendDancePose(carltonPose(), runningManPose(), carltonToWalkT)
      pose.hand.x += side * 0.12 * arc
      pose.hand.y += 0.045 * arc
      pose.hand.z += -0.22 * arc
      pose.elbow.x += side * 0.14 * arc
      pose.elbow.y += 0.045 * arc
      pose.knee.y += 0.015 * arc
      return pose
    }

    if (walkToOverheadT > 0) {
      const arc = Math.sin(walkToOverheadT * Math.PI)
      const pose = blendDancePose(runningManPose(), overheadPose(), walkToOverheadT)
      pose.hand.x += side * 0.12 * arc
      pose.hand.y += 0.24 * arc
      pose.hand.z += 0.08 * arc
      pose.elbow.x += side * 0.11 * arc
      pose.elbow.y += 0.16 * arc
      pose.knee.y += 0.04 * arc
      return pose
    }

    if (overheadToDiscoT > 0) {
      const arc = Math.sin(overheadToDiscoT * Math.PI)
      const pose = blendDancePose(overheadPose(), discoPose(), overheadToDiscoT)
      pose.hand.x += (side === 1 ? 0.14 : -0.06) * arc
      pose.hand.y += (side === 1 ? 0.08 : -0.08) * arc
      pose.hand.z += -0.08 * arc
      pose.elbow.x += side * 0.08 * arc
      pose.elbow.y += 0.08 * arc
      return pose
    }

    addPose(weights.disco, discoPose())
    addPose(weights.carlton, carltonPose())
    addPose(weights.runningMan, runningManPose())
    addPose(weights.overhead, overheadPose())

    const totalWeight = Math.max(0.001, weights.disco + weights.carlton + weights.runningMan + weights.overhead)
    mixPose.hip.divideScalar(totalWeight)
    mixPose.knee.divideScalar(totalWeight)
    mixPose.foot.divideScalar(totalWeight)
    mixPose.shoulder.divideScalar(totalWeight)
    mixPose.elbow.divideScalar(totalWeight)
    mixPose.hand.divideScalar(totalWeight)

    const bridgeLift =
      smoothWindow(phase, discoEnd, discoToCarltonEnd, 0.02) +
      smoothWindow(phase, carltonEnd, carltonToWalkEnd, 0.02) +
      smoothWindow(phase, walkEnd, walkToOverheadEnd, 0.02) +
      smoothWindow(phase, overheadEnd, 1, 0.02)
    mixPose.hand.y += Math.sin(phase * Math.PI * 8 + side * 0.5) * 0.02 * bridgeLift
    mixPose.elbow.x += side * 0.03 * bridgeLift

    return mixPose
  }

  if (overheadShimmy > 0.001) {
    const beat = motion.phase * Math.PI * 2
    const footWave = Math.sin(beat - 0.78)
    const hipWave = Math.sin(beat)
    const torsoWave = Math.sin(beat + 0.58)
    const shoulderWave = Math.sin(beat + 1.04)
    const handWave = Math.sin(beat + 1.42 + side * 0.18)
    const sideCrest = Math.sin(beat + 1.25 + side * 1.2)
    const ripple = Math.sin(beat * 3 + side * 0.55)
    const wristFlutter = Math.sin(beat * 6 + side * 0.85) * 0.45 + ripple * 0.25
    const stepSwitch = Math.sin(beat + side * Math.PI)
    const footCross = smootherstep01((stepSwitch + 1) * 0.5)
    const support = smootherstep01((side * footWave + 1) * 0.5)
    const sideReach = side * shoulderWave
    const foot = new THREE.Vector3(
      motion.bodyX * 0.18 + side * (0.35 + support * 0.12 - footCross * 0.17) + hipWave * 0.04,
      -1.94 + footCross * 0.15 + Math.max(0, -torsoWave) * 0.06 + support * 0.035,
      -0.035 + side * 0.022 + footCross * 0.13 - support * 0.06 + hipWave * 0.048,
    )
    const knee = new THREE.Vector3(
      THREE.MathUtils.lerp(hip.x, foot.x, 0.54) + side * (0.36 + support * 0.16 - footCross * 0.09) - hipWave * 0.075,
      (hip.y + foot.y) * 0.5 - 0.2 - support * 0.045 + footCross * 0.17 + Math.max(0, torsoWave) * 0.055,
      THREE.MathUtils.lerp(hip.z, foot.z, 0.58) + side * 0.025 + torsoWave * 0.065,
    )
    const hand = new THREE.Vector3(
      shoulder.x + side * (0.5 + sideCrest * 0.12 + wristFlutter * 0.035) + torsoWave * 0.19,
      shoulder.y + 1.5 + sideCrest * 0.14 + Math.max(0, handWave) * 0.13 + Math.max(0, -sideReach) * 0.08,
      shoulder.z - 0.3 + side * 0.06 + handWave * 0.1 + hipWave * 0.06,
    )
    const elbow = new THREE.Vector3(
      shoulder.x + side * (0.76 + sideCrest * 0.14) - torsoWave * 0.13,
      shoulder.y + 0.68 + sideCrest * 0.11 + Math.max(0, shoulderWave) * 0.08 - support * 0.035 + Math.max(0, -handWave) * 0.055,
      shoulder.z - 0.07 + side * 0.025 - wristFlutter * 0.02 + torsoWave * 0.08,
    )

    return { hip, knee, foot, shoulder, elbow, hand }
  }

  if (carltonGroove > 0.001) {
    const beat = motion.phase * Math.PI * 2
    const grooveSide = Math.sin(beat)
    const crossSweep = Math.sin(beat + 0.18)
    const centerPulse = 1 - Math.abs(grooveSide)
    const shoulderPop = Math.max(circularPulse01(motion.phase, 0.18, 0.14), circularPulse01(motion.phase, 0.68, 0.14))
    const handSnap = Math.max(circularPulse01(motion.phase, 0.28, 0.12), circularPulse01(motion.phase, 0.78, 0.12))
    const sideLoad = clamp01(0.5 + side * grooveSide * 0.5)
    const freeStep = 1 - sideLoad
    const heelPop = Math.max(0, Math.sin(beat * 2 + side * 0.45))
    const foot = new THREE.Vector3(
      motion.bodyX * 0.14 + side * (0.46 + sideLoad * 0.11 + freeStep * 0.045),
      -1.94 + freeStep * 0.14 + heelPop * 0.062 + shoulderPop * 0.018,
      -0.04 + side * 0.035 + freeStep * 0.12 - sideLoad * 0.055 + crossSweep * 0.025,
    )
    const knee = new THREE.Vector3(
      THREE.MathUtils.lerp(hip.x, foot.x, 0.54) + side * (0.36 + sideLoad * 0.2 + freeStep * 0.16 + centerPulse * 0.12),
      (hip.y + foot.y) * 0.5 - 0.23 - sideLoad * 0.06 + freeStep * 0.14 + shoulderPop * 0.04,
      THREE.MathUtils.lerp(hip.z, foot.z, 0.58) + Math.sin(beat + side * 0.62) * 0.035 + crossSweep * 0.025,
    )
    const sharedSweep = crossSweep * 0.54
    const sharedElbowSweep = crossSweep * 0.34
    const wristFlick = Math.sin(beat * 3 + side * 0.5) * 0.045 * carltonGroove
    const elbowBounce = Math.sin(beat * 2 - 0.25 + side * 0.3) * 0.055 * carltonGroove
    const frontPump = smootherstep01((Math.cos(beat * 2 - 0.18) + 1) * 0.5)
    const forwardReach = 0.62 + frontPump * 0.46 + centerPulse * 0.14
    const elbowFlare = side * (0.58 + centerPulse * 0.22 + frontPump * 0.12)
    const handSideOffset = side * (0.24 + centerPulse * 0.08)
    const armHeightStagger = side * 0.12 * crossSweep
    const elbow = new THREE.Vector3(
      shoulder.x + elbowFlare + sharedElbowSweep,
      shoulder.y - (0.12 - shoulderPop * 0.18 - centerPulse * 0.14) + elbowBounce + armHeightStagger,
      shoulder.z - 0.24 - forwardReach * 0.26 + side * 0.025,
    )
    const hand = new THREE.Vector3(
      hip.x + sharedSweep + handSideOffset + wristFlick,
      shoulder.y - (0.36 - shoulderPop * 0.32 - centerPulse * 0.2) + handSnap * 0.095 + armHeightStagger * 0.62,
      shoulder.z - 0.9 - forwardReach * 0.68 + side * 0.035 + wristFlick * 0.25,
    )

    return { hip, knee, foot, shoulder, elbow, hand }
  }

  if (discoPoint > 0.001) {
    const phase = motion.phase
    const sweepToHorizontal = smootherstep01((phase - 0.14) / 0.16)
    const leftWiden = smootherstep01((phase - 0.34) / 0.14) * (1 - smootherstep01((phase - 0.6) / 0.05))
    const snapUp = smootherstep01((phase - 0.62) / 0.14)
    const pointHigh = phase < 0.14 ? 1 : phase < 0.62 ? 1 - sweepToHorizontal : snapUp
    const horizontalPoint = phase < 0.14 ? 0 : phase < 0.62 ? sweepToHorizontal : 1 - snapUp
    const hardTurn = circularPulse01(phase, 0.62, 0.08)
    const skyHit = Math.max(circularPulse01(phase, 0.78, 0.12), circularPulse01(phase, 0.02, 0.1))
    const shoulderShimmy = Math.sin(phase * Math.PI * 4 + side * 0.55)
    const hipPop = THREE.MathUtils.lerp(0.72, -0.68, pointHigh) + hardTurn * 0.22 - horizontalPoint * 0.1 - leftWiden * 0.18
    const support = clamp01(0.5 + side * hipPop * 0.5)
    const tap = clamp01(1 - support)
    const foot = new THREE.Vector3(
      motion.bodyX * 0.14 + side * (0.46 + support * 0.08 + horizontalPoint * 0.03 - tap * 0.025),
      -1.94 + tap * 0.13 + hardTurn * 0.04 + Math.max(0, shoulderShimmy) * 0.026,
      -0.035 + side * 0.045 - support * 0.045 + tap * 0.075 + horizontalPoint * 0.04,
    )
    const knee = new THREE.Vector3(
      THREE.MathUtils.lerp(hip.x, foot.x, 0.52) + side * (0.4 + support * 0.14 + tap * 0.08 + hardTurn * 0.08),
      (hip.y + foot.y) * 0.5 - 0.2 - support * 0.07 + tap * 0.17 + skyHit * 0.035,
      THREE.MathUtils.lerp(hip.z, foot.z, 0.58) + side * Math.sin(phase * Math.PI * 2 + side * 0.4) * 0.025,
    )

    if (side === 1) {
      const highHand = new THREE.Vector3(
        shoulder.x + 1.12 + skyHit * 0.12,
        shoulder.y + 1.92 + skyHit * 0.16,
        shoulder.z - 0.43 + shoulderShimmy * 0.025,
      )
      const horizontalHand = new THREE.Vector3(
        shoulder.x + 0.28 + horizontalPoint * 0.05 - leftWiden * 0.72,
        shoulder.y + 0.08 + hardTurn * 0.03 + leftWiden * 0.05,
        shoulder.z - 1.48 - horizontalPoint * 0.18 - leftWiden * 0.08,
      )
      const cornerHand = new THREE.Vector3(
        shoulder.x + 0.2 - leftWiden * 0.52 + hardTurn * 0.04,
        shoulder.y + 0.12 + hardTurn * 0.08,
        shoulder.z - 1.38 - leftWiden * 0.06 - hardTurn * 0.12,
      )
      const highElbow = new THREE.Vector3(
        shoulder.x + 0.36 + skyHit * 0.08,
        shoulder.y + 0.88 + skyHit * 0.1,
        shoulder.z - 0.04,
      )
      const horizontalElbow = new THREE.Vector3(
        shoulder.x + 0.18 + horizontalPoint * 0.04 - leftWiden * 0.34,
        shoulder.y + 0.05 - hardTurn * 0.02,
        shoulder.z - 0.82 - horizontalPoint * 0.08 - leftWiden * 0.04,
      )
      const cornerElbow = new THREE.Vector3(
        shoulder.x + 0.14 - leftWiden * 0.24 + hardTurn * 0.04,
        shoulder.y + 0.08,
        shoulder.z - 0.78 - leftWiden * 0.04 - hardTurn * 0.08,
      )
      const hand =
        phase < 0.14 || phase >= 0.76
          ? highHand
          : phase < 0.62
            ? highHand.clone().lerp(horizontalHand, sweepToHorizontal)
            : cornerHand.clone().lerp(highHand, snapUp)
      const elbow =
        phase < 0.14 || phase >= 0.76
          ? highElbow
          : phase < 0.62
            ? highElbow.clone().lerp(horizontalElbow, sweepToHorizontal)
            : cornerElbow.clone().lerp(highElbow, snapUp)
      hand.x += hardTurn * -0.08 + skyHit * 0.08 + Math.sin(phase * Math.PI * 6 + 0.4) * 0.026 * discoPoint
      hand.y += skyHit * 0.1 * discoPoint
      elbow.x += hardTurn * -0.04 + skyHit * 0.04
      elbow.z += Math.cos(phase * Math.PI * 4 + 0.2) * 0.032 * discoPoint

      return { hip, knee, foot, shoulder, elbow, hand }
    }

    const waistBounce = Math.sin(phase * Math.PI * 4 + 0.45)
    const elbow = new THREE.Vector3(
      shoulder.x + side * (0.72 + hardTurn * 0.08 + pointHigh * 0.04),
      shoulder.y - (0.56 - skyHit * 0.05) + waistBounce * 0.026,
      shoulder.z + 0.08 + waistBounce * 0.045,
    )
    const hand = new THREE.Vector3(
      hip.x + side * (0.34 + hardTurn * 0.035),
      hip.y + 0.15 + waistBounce * 0.032 + skyHit * 0.025,
      hip.z - 0.13 + support * 0.05 + waistBounce * 0.035,
    )

    return { hip, knee, foot, shoulder, elbow, hand }
  }

  if (walkAmount > 0.001) {
    const walkPhase = ((motion.phase + (side === -1 ? 0 : 0.5)) % 1 + 1) % 1

    if (runAmount > 0.001) {
      const stanceEnd = 0.44
      const inStance = walkPhase < stanceEnd
      const stanceT = smootherstep01(walkPhase / stanceEnd)
      const swingRaw = clamp01((walkPhase - stanceEnd) / (1 - stanceEnd))
      const swingT = smootherstep01(swingRaw)
      const liftArc = inStance ? 0 : Math.sin(swingT * Math.PI)
      const heelStrike = circularSoftPulse01(walkPhase, 0.035, 0.116)
      const load = softPulse01(walkPhase, 0.13, 0.15)
      const toePushRun = softPulse01(walkPhase, 0.275, 0.155)
      const passingRun = inStance ? 0 : softPulse01(walkPhase, 0.56, 0.28)
      const reachRun = inStance ? 0 : softPulse01(walkPhase, 0.84, 0.22)
      const preLand = inStance ? 0 : smootherstep01((swingT - 0.76) / 0.22)
      const archLift = Math.pow(liftArc, 0.7)
      const footDrag = inStance ? 0 : Math.sin(swingT * Math.PI * 2) * 0.026
      const frontZ = -2.06
      const backZ = 1.78
      const travelZ = inStance
        ? THREE.MathUtils.lerp(frontZ, backZ, stanceT)
        : THREE.MathUtils.lerp(backZ, frontZ, swingT)
      const runLane =
        side *
        (0.45 +
          load * 0.06 +
          toePushRun * 0.04 +
          archLift * 0.055 +
          reachRun * 0.05 -
          heelStrike * 0.016)
      const foot = new THREE.Vector3(
        motion.bodyX * 0.1 + runLane,
        -1.955 +
          archLift * 1.68 +
          passingRun * 0.2 +
          toePushRun * 0.12 +
          heelStrike * 0.025 -
          load * 0.045 -
          preLand * 0.09,
        travelZ - archLift * 0.34 + toePushRun * 0.18 - preLand * 0.04 + footDrag,
      )
      const knee = new THREE.Vector3(
        THREE.MathUtils.lerp(hip.x, foot.x, 0.52) +
          side * (0.25 + load * 0.13 + archLift * 0.36 + passingRun * 0.12 + toePushRun * 0.055 + reachRun * 0.035),
        (hip.y + foot.y) * 0.5 -
          0.16 -
          load * 0.058 +
          archLift * 0.78 +
          passingRun * 0.24 +
          toePushRun * 0.09,
        THREE.MathUtils.lerp(hip.z, foot.z, 0.56) -
          archLift * 0.54 -
          passingRun * 0.18 +
          toePushRun * 0.16 +
          reachRun * 0.04 +
          sideWave * 0.008,
      )
      const armPhase = ((motion.phase + (side === 1 ? 0.02 : 0.52)) % 1 + 1) % 1
      const elbowPhase = ((armPhase + 0.048) % 1 + 1) % 1
      const handPhase = ((armPhase - 0.098) % 1 + 1) % 1
      const elbowForward = Math.cos(elbowPhase * Math.PI * 2)
      const handForward = Math.cos(handPhase * Math.PI * 2)
      const elbowMid = 1 - Math.abs(elbowForward)
      const handMid = 1 - Math.abs(handForward)
      const elbowForward01 = smootherstep01((elbowForward + 1) * 0.5)
      const elbowBack01 = 1 - elbowForward01
      const handForward01 = smootherstep01((handForward + 1) * 0.5)
      const handBack01 = 1 - handForward01
      const circularWhip = Math.sin(handPhase * Math.PI * 4 + side * 0.65) * 0.05
      const noodleDrop = Math.sin(handPhase * Math.PI * 6 - side * 0.4) * handMid * 0.036
      const elbow = new THREE.Vector3(
        shoulder.x + side * (0.36 + elbowMid * 0.48 + elbowBack01 * 0.2 - elbowForward01 * 0.025 + circularWhip),
        shoulder.y - (0.26 + elbowBack01 * 0.5 - elbowForward01 * 0.22 - elbowMid * 0.15 + load * 0.035),
        shoulder.z + 0.08 - elbowForward * 0.72 + elbowMid * 0.09 + circularWhip * 0.4,
      )
      const hand = new THREE.Vector3(
        shoulder.x + side * (0.58 + handMid * 0.62 + handBack01 * 0.28 - handForward01 * 0.02 + circularWhip * 1.1),
        shoulder.y -
          (0.68 +
            handBack01 * 0.5 -
            handForward01 * 0.58 -
            handMid * 0.2 +
            load * 0.03 -
            toePushRun * 0.08 +
            noodleDrop),
        shoulder.z + 0.1 - handForward * 1.08 + handMid * 0.14 - noodleDrop * 0.72,
      )

      return { hip, knee, foot, shoulder, elbow, hand }
    }

    if (walkTravel > 0.001) {
      const stanceEnd = 0.52
      const inStance = walkPhase < stanceEnd
      const stanceT = smootherstep01(walkPhase / stanceEnd)
      const swingRaw = clamp01((walkPhase - stanceEnd) / (1 - stanceEnd))
      const swingT = smootherstep01(swingRaw)
      const liftArc = inStance ? 0 : Math.sin(swingT * Math.PI)
      const heelStrike = circularSoftPulse01(walkPhase, 0.025, 0.145)
      const toeSlap = softPulse01(walkPhase, 0.17, 0.15)
      const toePushWalk = softPulse01(walkPhase, 0.39, 0.18)
      const pressLoad = clamp01(heelStrike * 0.28 + toeSlap * 0.62 + toePushWalk * 0.36)
      const archLift = Math.pow(liftArc, 0.82)
      const swingDrag = inStance ? 0 : Math.sin(swingT * Math.PI * 2) * 0.018
      const passingKnee = (inStance ? 0 : softPulse01(walkPhase, 0.72, 0.3)) * walkAmount
      const frontZ = -1.78
      const backZ = 1.66
      const travelZ = inStance
        ? THREE.MathUtils.lerp(frontZ, backZ, stanceT)
        : THREE.MathUtils.lerp(backZ, frontZ, swingT)
      const frontness = clamp01((backZ - travelZ) / (backZ - frontZ))
      const backness = 1 - frontness
      const trackX =
        side *
        (0.43 +
          pressLoad * 0.032 -
          heelStrike * 0.012 -
          archLift * 0.018 -
          backness * 0.018 +
          frontness * 0.024 +
          toePushWalk * 0.02)
      const foot = new THREE.Vector3(
        motion.bodyX * 0.16 + trackX,
        -1.945 +
          archLift * 1.44 +
          toePushWalk * 0.095 +
          heelStrike * 0.03 -
          toeSlap * 0.014 -
          motion.compress * 0.012,
        travelZ - archLift * 0.36 + toePushWalk * 0.1 + swingDrag,
      )
      const knee = new THREE.Vector3(
        THREE.MathUtils.lerp(hip.x, foot.x, 0.54) +
          side * (0.21 + archLift * 0.26 + passingKnee * 0.15 + pressLoad * 0.055),
        (hip.y + foot.y) * 0.5 - 0.16 + archLift * 0.76 + passingKnee * 0.24 + toePushWalk * 0.07 - heelStrike * 0.026,
        THREE.MathUtils.lerp(hip.z, foot.z, 0.62) - archLift * 0.43 - passingKnee * 0.17 + sideWave * 0.005,
      )
      const armPhase = ((motion.phase + (side === 1 ? 0.08 : 0.58)) % 1 + 1) % 1
      const elbowPhase = ((armPhase + 0.038) % 1 + 1) % 1
      const handPhase = ((armPhase - 0.068) % 1 + 1) % 1
      const elbowForward = Math.cos(elbowPhase * Math.PI * 2)
      const handForward = Math.cos(handPhase * Math.PI * 2)
      const elbowMidSwing = 1 - Math.abs(elbowForward)
      const handMidSwing = 1 - Math.abs(handForward)
      const elbowForward01 = smootherstep01((elbowForward + 1) * 0.5)
      const elbowBack01 = 1 - elbowForward01
      const handForward01 = smootherstep01((handForward + 1) * 0.5)
      const handBack01 = 1 - handForward01
      const armSnap = Math.sin(handPhase * Math.PI * 4 + side * 0.5) * 0.048
      const elbowFlop = Math.sin(elbowPhase * Math.PI * 4 - side * 0.4) * elbowMidSwing * 0.028
      const handFlop = Math.sin(handPhase * Math.PI * 6 + side * 0.7) * handMidSwing * 0.032
      const elbowRubberCurve = 0.15 + elbowMidSwing * 0.4 + handMidSwing * 0.06
      const handRubberReach = 0.1 + handMidSwing * 0.42
      const elbow = new THREE.Vector3(
        shoulder.x +
          side * (0.27 + elbowRubberCurve + elbowBack01 * 0.145 - elbowForward01 * 0.012 + elbowFlop),
        shoulder.y - (0.34 + elbowBack01 * 0.38 - elbowForward01 * 0.14 - elbowMidSwing * 0.12 + heelStrike * 0.014),
        shoulder.z + 0.08 - elbowForward * 0.48 + elbowMidSwing * 0.058 - elbowFlop * 0.42,
      )
      const hand = new THREE.Vector3(
        shoulder.x +
          side * (0.52 + handRubberReach + handBack01 * 0.18 - handForward01 * 0.014 + armSnap * 1.05),
        shoulder.y -
          (0.7 +
            handBack01 * 0.38 -
            handForward01 * 0.48 -
            handMidSwing * 0.15 +
            heelStrike * 0.024 -
            toePushWalk * 0.052 +
            handFlop),
        shoulder.z + 0.12 - handForward * 0.82 + handMidSwing * 0.09 - handFlop * 0.66,
      )

      return { hip, knee, foot, shoulder, elbow, hand }
    }

    const swing = smoothWindow(walkPhase, 0.4, 0.95, 0.13)
    const swingT = smootherstep01((walkPhase - 0.4) / 0.55)
    const liftArc = Math.sin(swingT * Math.PI) * swing
    const heelStrike = circularPulse01(walkPhase, 0.02, 0.14)
    const toePushWalk = pulse01(walkPhase, 0.34, 0.17)
    const passingKnee = pulse01(walkPhase, 0.68, 0.28) * swing
    const groundSlide = Math.sin(walkPhase * Math.PI * 2 - 0.72)
    const foot = new THREE.Vector3(
      motion.bodyX * 0.25 +
        side *
          (0.55 +
            motion.footSplay * 0.08 +
            heelStrike * 0.08 +
            toePushWalk * 0.08 +
            liftArc * 0.14 +
            groundSlide * 0.055),
      -1.945 + liftArc * 0.58 + toePushWalk * 0.07 + heelStrike * 0.024 - motion.compress * 0.018,
      -0.025 + Math.cos(walkPhase * Math.PI * 2 - 0.1) * 0.12 + liftArc * 0.045,
    )
    const knee = new THREE.Vector3(
      hip.x +
        side *
          (0.32 +
            liftArc * 0.38 +
            heelStrike * 0.15 +
            toePushWalk * 0.14 +
            passingKnee * 0.18 +
            sideWave * 0.012),
      (hip.y + foot.y) * 0.5 - 0.2 + liftArc * 0.34 + passingKnee * 0.12 - heelStrike * 0.05,
      foot.z * 0.56 + shoulder.z * 0.08 + sideWave * 0.012,
    )
    const armPhase = motion.phase + (side === -1 ? 0.5 : 0)
    const armSwing = Math.sin(armPhase * Math.PI * 2)
    const armPump = Math.abs(armSwing)
    const armSnap = Math.sin(armPhase * Math.PI * 4 + 0.4) * 0.035
    const elbow = new THREE.Vector3(
      shoulder.x + side * (0.34 + armPump * 0.08 - armSwing * 0.1 + armSnap),
      shoulder.y - (0.43 - armPump * 0.06 + heelStrike * 0.03),
      shoulder.z + 0.09 + armSwing * 0.13 + armPump * 0.035,
    )
    const hand = new THREE.Vector3(
      shoulder.x + side * (0.52 + armPump * 0.12 - armSwing * 0.23 + armSnap * 1.4),
      shoulder.y - (0.78 - armPump * 0.13 + heelStrike * 0.045 - toePushWalk * 0.03),
      shoulder.z + 0.13 + armSwing * 0.24 + armPump * 0.06,
    )

    return { hip, knee, foot, shoulder, elbow, hand }
  }

  const pushAnchorX = THREE.MathUtils.lerp(motion.idleStartX, motion.bodyX, smoothstep01(motion.airProgress / 0.58) * 0.74)
  const landAnchorX = THREE.MathUtils.lerp(motion.bodyX, motion.idleEndX, smoothstep01((motion.airProgress - 0.55) / 0.34))
  const pushAnchorWeight = clamp01(pushFootLoad + (side === pushSide ? toeOff * 0.3 : 0)) * (1 - landFootLoad * 0.8)
  const landAnchorWeight = clamp01(landFootLoad + (landFootLoad > 0 ? landingReach * 0.5 : 0))
  const pushSupportX = THREE.MathUtils.lerp(motion.bodyX, pushAnchorX, pushAnchorWeight)
  const landSupportX = THREE.MathUtils.lerp(motion.bodyX, landAnchorX, landAnchorWeight)
  const landDominance = smootherstep01((landAnchorWeight - pushAnchorWeight + 0.2) / 0.4)
  const idleAnchorX = idleHop * THREE.MathUtils.lerp(pushSupportX, landSupportX, landDominance)
  const hipFootCenterX = idleHop * motion.bodyX
  const plantedKneeCenterX = idleHop * THREE.MathUtils.lerp(idleAnchorX, motion.bodyX, 0.46)
  const plantedFoot = new THREE.Vector3(
    idleAnchorX +
    side *
      (0.42 +
        motion.land * 0.052 +
        motion.footSplay * 0.052 +
        sideImpact * 0.04 +
        roleLoad * 0.035 -
        idleFreeTuck * 0.16 +
        vintageHeel * 0.05 +
        footSpring.toePress * 0.026 +
        footSpring.plantRebound * 0.024 +
        forwardLandingLoad * 0.024 -
        forwardLandingStride * 0.018 -
        forwardFreeTuck * 0.12 +
        legSideWave * looseness * 0.008),
    -1.94 +
      plantedFlat * 0.058 +
      idleFreeTuck * 0.68 +
      forwardFreeTuck * 0.46 -
      forwardLandingLoad * 0.018 +
      motion.land * 0.006 -
      motion.compress * 0.026 -
      footSpring.heelLoad * 0.006 -
      footSpring.toePress * 0.01 -
      rollingContact * 0.016 +
      footSpring.plantRebound * 0.018 +
      legOppositeWave * looseness * 0.008,
    -0.02 -
      forwardHop * (motion.compress * 0.048 + motion.land * 0.025) +
      forwardFreeTuck * 0.18 -
      forwardLandingLoad * 0.08 +
      -forwardLandingStride * 0.92 +
      forwardBrace * 0.018 +
      sideImpact * 0.024 +
      legSideWave * looseness * 0.006,
  )
  const ascentTuck = clamp01(
    footSpring.ascentTuck * 0.68 + footSpring.snapTuck * 0.22 - footSpring.airRelax * 0.08 - footSpring.apexHang * 0.12,
  )
  const visibleLegStretch = clamp01(
    legStretch * (1 - ascentTuck * 0.18 - footSpring.fallLag * 0.08 - postApexFloat * 0.06 - apexFootCurl * 0.16) +
      footSpring.descentUnfold * 0.045 +
      footSpring.apexHang * 0.04,
  )
  const visibleWhip = footSpring.whip * (1 - ascentTuck * 0.68)
  const springTrail = smoothstep01(motion.airProgress / 0.62) * (1 - landingReach * 0.34) * (1 - ascentTuck * 0.16)
  const descentDrop = smoothstep01((motion.airProgress - 0.76) / 0.2) * (1 - landingReach * 0.24)
  const airborneLegSpread = clamp01((springTrail + footSpring.apexHang * 0.04) * (1 - landingReach * 0.42))
  const trailingLegLength = Math.max(
    0.86,
    1.14 +
      visibleLegStretch * 0.9 +
      springTrail * 0.05 +
      footSpring.toeFlick * 0.16 +
      footSpring.snapTuck * 0.025 -
      ascentTuck * 0.7 +
      ascentFootLag * 0.38 +
      ascentBodyDrag * 0.24 -
      ascentFootCatch * 0.18 -
      apexFootCurl * 0.36 +
      postApexFloat * -0.18 +
      visibleWhip * 0.28 -
      footSpring.recoil * 0.26 +
      descentDrop * 0.38 -
      footSpring.apexHang * 0.22 +
      footSpring.airRelax * 0.12 +
      footSpring.fallLag * -0.18 +
      footSpring.descentUnfold * 0.16 +
      footSpring.landingBrace * 0.06 +
      footSpring.catchReach * 0.22 +
      footSpring.plantRebound * 0.08 +
      forwardTrail * 0.2 -
      forwardTuck * 0.16 +
      forwardReach * 0.1 +
      forwardFreeTuck * 0.18 -
      forwardLandingLoad * 0.08 +
      motion.toeLift * 0.14 -
      transferPushTrail * 0.16 +
      transferCatchReach * 0.11 -
      motion.launch * 0.1 -
      motion.land * 0.12,
  )
  const hipDrivenFoot = new THREE.Vector3(
    hipFootCenterX +
    side *
      (0.42 -
        motion.launch * 0.07 +
        toeOff * 0.035 +
        footRelease * 0.04 +
        motion.toeLift * 0.024 +
        visibleLegStretch * 0.056 +
        airborneLegSpread * 0.09 +
        idleFreeTuck * -0.18 -
        roleLoad * 0.03 +
        transferPushTrail * 0.12 +
        transferCatchReach * 0.08 +
        footSpring.toeFlick * 0.034 +
        footSpring.snapTuck * 0.028 -
        ascentFootCatch * 0.12 -
        apexFootCurl * 0.11 +
        ascentFootLag * 0.035 -
        ascentTuck * 0.095 +
        footSpring.airRelax * 0.04 +
        footSpring.landingBrace * 0.07 +
        visibleWhip * 0.058 -
        footSpring.recoil * 0.034 +
        legSideWave * looseness * 0.012),
    hip.y -
      trailingLegLength +
      launchLift * 0.09 +
      ascentTuck * 0.18 +
      footSpring.snapTuck * 0.035 +
      footSpring.fallLag * 0.13 -
      ascentFootLag * 0.14 -
      Math.max(0, solverBodyY) * ascentBodyDrag * 0.16 +
      ascentFootCatch * 0.035 +
      idleFreeTuck * 0.68 -
      roleLoad * 0.035 +
      apexFootCurl * 0.11 -
      transferPushTrail * 0.2 -
      transferCatchReach * 0.1 -
      descentDrop * 0.045 -
      footSpring.descentUnfold * 0.012 +
      footSpring.apexHang * 0.14 +
      postApexFloat * 0.12 +
      footSpring.takeoffRoll * 0.04 -
      footSpring.landingBrace * 0.015 -
      footSpring.recoil * 0.065 -
      footSpring.catchReach * 0.025,
    -0.005 +
      footRelease * 0.125 +
      motion.toeLift * 0.04 +
      visibleLegStretch * 0.032 +
      forwardTrail * 0.6 +
      forwardTuck * 0.18 -
      forwardReach * 0.48 -
      forwardBrace * 0.12 +
      -forwardLandingStride * 0.28 +
      forwardFreeTuck * 0.24 -
      forwardLandingLoad * 0.08 +
      footSpring.toeFlick * 0.032 +
      ascentTuck * 0.026 +
      ascentFootCatch * 0.04 +
      apexFootCurl * 0.048 +
      footSpring.recoil * 0.04 +
      legSideWave * looseness * 0.012,
  )
  const landingFoot = new THREE.Vector3(
    plantedFoot.x + side * (0.015 + motion.footSplay * 0.012),
    plantedFoot.y +
      (1 - landingReach) * (0.16 + visibleLegStretch * 0.06 + footSpring.descentUnfold * 0.02) +
      forwardFreeTuck * 0.28 -
      forwardLandingLoad * 0.012,
    plantedFoot.z +
      (1 - landingReach) * 0.03 -
      forwardReach * 0.3 -
      forwardBrace * 0.055 +
      -forwardLandingStride * 0.18 +
      forwardFreeTuck * 0.18 -
      forwardLandingLoad * 0.04 +
      sideImpact * 0.012,
  )
  const groundSearch = smootherstep01(smootherstep01((motion.airProgress - 0.84) / 0.16))
  const landingBlend = clamp01(groundSearch * 0.5 + footSpring.landingBrace * 0.045 + footSpring.catchReach * 0.1)
  const airborneFoot = hipDrivenFoot.lerp(landingFoot, landingBlend)
  const foot = new THREE.Vector3(
    THREE.MathUtils.lerp(plantedFoot.x, airborneFoot.x, airborneFollow),
    THREE.MathUtils.lerp(plantedFoot.y, airborneFoot.y, airborneFollow),
    THREE.MathUtils.lerp(plantedFoot.z, airborneFoot.z, airborneFollow),
  )
  const plantedKneeSideOffset = THREE.MathUtils.lerp(
    0.66 +
      kneeOut * 0.52 +
      motion.footSplay * 0.07 +
      sideImpact * 0.044 +
      roleLoad * 0.04 -
      idleFreeTuck * 0.14 +
      vintageHeel * 0.22 +
      legSideWave * (motion.compress + motion.land + motion.recovery) * 0.012,
    0.5 +
      kneeOut * 0.22 +
      motion.footSplay * 0.026 +
      sideImpact * 0.018 +
      vintageHeel * 0.055 +
      legSideWave * (motion.compress + motion.land + motion.recovery) * 0.004,
    vintageIdle * (1 - idleHop) * 0.92,
  )
  const plantedKnee = new THREE.Vector3(
    plantedKneeCenterX + side * plantedKneeSideOffset,
    -1.26 -
      legBend * 0.285 +
      motion.compress * 0.1 +
      motion.launch * 0.08 +
      sideImpact * 0.05 -
      forwardFreeTuck * 0.18 -
      forwardLandingLoad * 0.038 -
      vintageHeel * 0.2 -
      legOppositeWave * looseness * 0.01,
    -0.03 -
      forwardHop * motion.compress * 0.055 +
      forwardBrace * 0.032 +
      -forwardLandingStride * 0.16 +
      forwardFreeTuck * 0.1 -
      forwardLandingLoad * 0.04 +
      footRelease * 0.06 +
      legSideWave * looseness * 0.008,
  )
  const airborneKnee = new THREE.Vector3(
    hipFootCenterX +
    side *
      (0.54 +
        airborneLegSpread * 0.2 +
        visibleLegStretch * 0.04 +
        motion.airborne * 0.02 -
        ascentTuck * 0.17 +
        idleFreeTuck * -0.18 -
        roleLoad * 0.03 +
        transferPushTrail * 0.08 +
        transferCatchReach * 0.06 +
        ascentFootCatch * 0.08 -
        apexFootCurl * 0.12 -
        forwardFreeTuck * 0.12 +
        forwardLandingLoad * 0.03 -
        forwardLandingStride * 0.06 -
        footSpring.apexHang * 0.025 +
        legSideWave * looseness * 0.008),
    (hip.y + foot.y) * 0.5 -
      0.13 -
      visibleLegStretch * 0.052 +
      motion.launch * 0.08 +
      ascentTuck * 0.2 +
      apexFootCurl * 0.16 +
      forwardFreeTuck * 0.24 -
      forwardLandingLoad * 0.04 +
      footSpring.apexHang * 0.035,
    foot.z * (0.62 + visibleLegStretch * 0.12) +
      forwardTrail * 0.24 -
      forwardTuck * 0.06 -
      forwardReach * 0.2 +
      -forwardLandingStride * 0.08 +
      ascentTuck * 0.018 +
      footSpring.apexHang * 0.012 +
      legSideWave * looseness * 0.01,
  )
  const knee = plantedKnee.lerp(airborneKnee, airborneFollow)

  const armSpring = getArmSpringForces(motion, side)
  const impactDrag = clamp01(motion.land * 0.78 + motion.impactBurst * 0.52)
  const reboundLift = clamp01(motion.recovery * 0.55 + sideImpact * 0.14)
  const armLagSwing = motion.armLag * 0.05
  const forwardArmTrail = forwardHop * (motion.launch * 0.12 + forwardTrail * 0.18 + forwardTuck * 0.04 - forwardReach * 0.12)
  const forwardArmBrace = forwardHop * (forwardReach * 0.18 + forwardBrace * 0.12)
  const handOvershootY =
    Math.sin(motion.phase * Math.PI * 4.8 + side * 0.52) *
    (armSpring.pumpUp * 0.026 + armSpring.descentSweep * 0.024 + motion.recovery * 0.024 + armSpring.apexFloat * 0.018)
  const handOvershootX =
    Math.sin(motion.phase * Math.PI * 4.4 - side * 0.74) *
    (armSpring.pumpUp * 0.024 + armSpring.descentSweep * 0.022 + armSpring.reboundFlick * 0.03 + armSpring.apexFloat * 0.016)
  const elbow = new THREE.Vector3(
    shoulder.x +
      side *
        (0.34 +
          armSpring.splay * 0.48 -
          armSpring.curl * 0.32 -
          armSpring.backswing * 0.08 +
          armSpring.descentSweep * 0.1 +
          armStretch * 0.14 +
          armSpring.reboundFlick * 0.08 +
          armLagSwing +
          vintageCounter * 0.24 +
          sideWave * (0.012 + looseness * 0.012)),
    shoulder.y -
      (0.42 +
        armSpring.drop * 0.34 +
        armStretch * 0.14 -
        armSpring.curl * 0.12 -
        armSpring.lift * 0.3 -
        armSpring.pumpUp * 0.04 -
        reboundLift * 0.08 +
        armSpring.hoseBow * 0.3) +
      vintageHeel * 0.13 +
      oppositeWave * looseness * 0.008,
    shoulder.z +
      0.09 +
      armSpring.swingForward * 0.07 -
      armSpring.swingBack * 0.07 +
      armSpring.launchDrag * 0.025 +
      armSpring.apexFloat * 0.042 +
      armStretch * 0.03 +
      armSpring.hoseBow * 0.052 +
      armSpring.flutter * 0.18 +
      forwardArmTrail -
      forwardArmBrace +
      vintageCounter * 0.08 +
      sideWave * looseness * 0.008,
  )
  const hand = new THREE.Vector3(
    shoulder.x +
      side *
        (0.49 +
          armSpring.splay * 0.82 -
          armSpring.curl * 0.46 -
          armSpring.backswing * 0.12 +
          armSpring.descentSweep * 0.16 +
          armSpring.launchDrag * 0.035 +
          armSpring.reboundFlick * 0.14 +
          armStretch * 0.2 +
          armLagSwing * 1.2 +
          handOvershootX +
          vintageCounter * 0.42 +
          sideWave * (0.018 + looseness * 0.014)),
    shoulder.y -
      (0.78 +
        armSpring.drop * 0.62 +
        armStretch * 0.24 +
        impactDrag * 0.12 +
        armSpring.impactWhip * 0.22 -
        armSpring.curl * 0.16 -
        armSpring.lift * 0.55 -
        armSpring.pumpUp * 0.035 -
        reboundLift * 0.16 -
        armSpring.reboundFlick * 0.2) +
      oppositeWave * looseness * 0.012 +
      vintageHeel * 0.22 +
      handOvershootY,
    shoulder.z +
      0.13 +
      armSpring.swingForward * 0.11 -
      armSpring.swingBack * 0.12 +
      armSpring.launchDrag * 0.038 +
      armSpring.apexFloat * 0.064 +
      armSpring.descentLift * 0.028 +
      armStretch * 0.046 +
      armSpring.flutter * 0.28 +
      forwardArmTrail * 1.35 -
      forwardArmBrace * 1.25 +
      vintageCounter * 0.12 +
      sideWave * looseness * 0.01,
  )

  const ballForm = clamp01(motion.ballForm ?? 0)
  if (ballForm > 0.001) {
    const absorb = smootherstep01(motion.limbAbsorb ?? 0)
    const melt = smootherstep01(motion.limbMelt ?? 0)
    const anticipation = clamp01(motion.prep * 1.9) * (1 - absorb)

    const handSocket = transformBodyPoint(new THREE.Vector3(side * 0.72, -0.06, -0.56), motion, bodyQuaternion)
    const footSocket = transformBodyPoint(new THREE.Vector3(side * 0.34, -0.66, -0.56), motion, bodyQuaternion)
    const elbowSocketWrap = transformBodyPoint(new THREE.Vector3(side * 0.88, -0.2, -0.42), motion, bodyQuaternion)
    const kneeSocketWrap = transformBodyPoint(new THREE.Vector3(side * 0.5, -0.92, -0.42), motion, bodyQuaternion)

    hand.add(new THREE.Vector3(side * 0.18, -0.18, 0.1).multiplyScalar(anticipation))
    foot.add(new THREE.Vector3(side * 0.12, -0.28, 0.16).multiplyScalar(anticipation))
    hand.lerp(handSocket, absorb)
    elbow.lerp(elbowSocketWrap, absorb * 0.86)
    foot.lerp(footSocket, absorb)
    knee.lerp(kneeSocketWrap, absorb * 0.88)

    const surfaceTuck = melt * 0.18
    hand.lerp(transformBodyPoint(new THREE.Vector3(side * 0.64, -0.1, -0.72), motion, bodyQuaternion), surfaceTuck)
    foot.lerp(transformBodyPoint(new THREE.Vector3(side * 0.29, -0.68, -0.72), motion, bodyQuaternion), surfaceTuck)
  }

  return { hip, knee, foot, shoulder, elbow, hand }
}

export function PsychedelicPogoOrbAsset({
  mode = 'full',
  animation = 'idle',
  activity = 1,
  glowIntensity = 1,
  colorCycleSpeed = 1,
  colorCycleOffset = 0,
  expression = 'auto',
  debugMaterial = 'none',
  scale = 1,
  position = [0, 0, 0],
  phaseOverride,
  phaseOffset = 0,
  animationTimeScale = 1,
  transitionFromAnimation,
  transitionFromActivity,
  transitionFromPhaseOverride,
  transitionBlend = 1,
  verticalMotionScale = 1,
}: PsychedelicPogoOrbAssetProps) {
  const rootGroupRef = useRef<THREE.Group>(null)
  const bodyMotionRef = useRef<THREE.Group>(null)
  const shadowRef = useRef<THREE.Mesh>(null)
  const shadowMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const pointLightRef = useRef<THREE.PointLight>(null)
  const facePatchMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const leftImpactFxRef = useRef<THREE.Group>(null)
  const rightImpactFxRef = useRef<THREE.Group>(null)

  const leftLegHoseRef = useRef<THREE.Group>(null)
  const rightLegHoseRef = useRef<THREE.Group>(null)
  const leftArmHoseRef = useRef<THREE.Group>(null)
  const rightArmHoseRef = useRef<THREE.Group>(null)

  const leftHipRef = useRef<THREE.Group>(null)
  const leftFootRef = useRef<THREE.Group>(null)
  const rightHipRef = useRef<THREE.Group>(null)
  const rightFootRef = useRef<THREE.Group>(null)
  const leftShoulderRef = useRef<THREE.Group>(null)
  const leftHandRef = useRef<THREE.Group>(null)
  const rightShoulderRef = useRef<THREE.Group>(null)
  const rightHandRef = useRef<THREE.Group>(null)

  const faceRigRef = useRef<THREE.Group>(null)
  const neutralFaceRef = useRef<THREE.Group>(null)
  const happyFaceRef = useRef<THREE.Group>(null)
  const blinkFaceRef = useRef<THREE.Group>(null)
  const squashFaceRef = useRef<THREE.Group>(null)
  const surprisedFaceRef = useRef<THREE.Group>(null)
  const focusedFaceRef = useRef<THREE.Group>(null)
  const delightedFaceRef = useRef<THREE.Group>(null)
  const effortFaceRef = useRef<THREE.Group>(null)
  const autoExpressionRef = useRef<ConcretePogoOrbExpression>('neutral')
  const autoExpressionHoldUntilRef = useRef(0)

  const leftHipMarkerRef = useRef<THREE.Group>(null)
  const leftKneeMarkerRef = useRef<THREE.Group>(null)
  const leftFootMarkerRef = useRef<THREE.Group>(null)
  const rightHipMarkerRef = useRef<THREE.Group>(null)
  const rightKneeMarkerRef = useRef<THREE.Group>(null)
  const rightFootMarkerRef = useRef<THREE.Group>(null)

  const bodyQuaternion = useMemo(() => new THREE.Quaternion(), [])
  const bodyEuler = useMemo(() => new THREE.Euler(), [])
  const rootInverseMatrix = useMemo(() => new THREE.Matrix4(), [])
  const emissionCenter = useMemo(() => new THREE.Vector3(), [])
  const patternEmissionCenter = useMemo(() => new THREE.Vector3(), [])
  const patternBodyScale = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  const patternBodyScaleTarget = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  const leftHipBlendPosition = useMemo(() => new THREE.Vector3(), [])
  const rightHipBlendPosition = useMemo(() => new THREE.Vector3(), [])
  const leftShoulderBlendPosition = useMemo(() => new THREE.Vector3(), [])
  const rightShoulderBlendPosition = useMemo(() => new THREE.Vector3(), [])
  const leftShoeHoseEndpoint = useMemo(() => new THREE.Vector3(), [])
  const rightShoeHoseEndpoint = useMemo(() => new THREE.Vector3(), [])
  const leftShoeEndpointOffset = useMemo(() => new THREE.Vector3(), [])
  const rightShoeEndpointOffset = useMemo(() => new THREE.Vector3(), [])
  const wrapperMaterial = useMemo(() => createPsychedelicWrapperMaterial(), [])
  const leftImpactMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ff86dc',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    [],
  )
  const rightImpactMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#5ce7ff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    [],
  )

  const showBody = mode !== 'limbs'
  const showLimbs = mode === 'full' || mode === 'limbs' || mode === 'debug-rig'
  const showFace = (mode === 'full' || mode === 'face' || mode === 'debug-rig') && debugMaterial !== 'silhouette'
  const showSockets = showLimbs && showBody
  const showShadow = mode !== 'body' && mode !== 'face'
  const showRig = mode === 'debug-rig'
  const diffusionVisible = debugMaterial === 'none' || debugMaterial === 'face-contrast' || debugMaterial === 'super-psychedelic'
  const haloVisible = diffusionVisible && glowIntensity > 0.02

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    const targetTime = phaseOverride === undefined ? time * animationTimeScale + phaseOffset * getAnimationPeriod(animation) : time
    const targetMotion = getPogoMotion(targetTime, animation, activity, phaseOverride)
    const motion =
      transitionFromAnimation && transitionBlend < 0.999
        ? blendPogoMotion(
            getPogoMotion(
              transitionFromPhaseOverride === undefined
                ? time * animationTimeScale + phaseOffset * getAnimationPeriod(transitionFromAnimation)
                : time,
              transitionFromAnimation,
              transitionFromActivity ?? activity,
              transitionFromPhaseOverride,
            ),
            targetMotion,
            transitionBlend,
          )
        : targetMotion
    const spinRadians = (motion.ballSpin ?? 0) * Math.PI * 2
    const spinForward = clamp01(motion.ballSpinForward ?? 0)
    bodyEuler.set(motion.bodyRotateX + spinForward * spinRadians, 0, motion.bodyRotateZ + (1 - spinForward) * spinRadians)
    bodyQuaternion.setFromEuler(bodyEuler)
    const scaledBodyY = motion.bodyY * verticalMotionScale
    const scaledLimbBodyY = motion.limbBodyY === undefined ? undefined : motion.limbBodyY * verticalMotionScale
    const rigMotion = verticalMotionScale === 1 ? motion : { ...motion, bodyY: scaledBodyY, limbBodyY: scaledLimbBodyY }

    if (bodyMotionRef.current) {
      bodyMotionRef.current.position.set(motion.bodyX, scaledBodyY, 0)
      bodyMotionRef.current.rotation.copy(bodyEuler)
      bodyMotionRef.current.scale.set(motion.bodyScaleX, motion.bodyScaleY, motion.bodyScaleZ)
    }

    const debugValue = debugModeValue(debugMaterial)
    if (rootGroupRef.current) {
      rootGroupRef.current.updateWorldMatrix(true, false)
      rootInverseMatrix.copy(rootGroupRef.current.matrixWorld).invert()
      wrapperMaterial.uniforms.uRootInverse.value.copy(rootInverseMatrix)
    }
    wrapperMaterial.uniforms.uTime.value = time
    wrapperMaterial.uniforms.uGlowIntensity.value =
      debugMaterial === 'glow-off' || debugMaterial === 'flat' || debugMaterial === 'silhouette'
        ? 0
        : glowIntensity * (1 + motion.glowPulse * 0.45)
    wrapperMaterial.uniforms.uColorCycleSpeed.value = colorCycleSpeed
    wrapperMaterial.uniforms.uColorCycleOffset.value = ((colorCycleOffset % 1) + 1) % 1
    wrapperMaterial.uniforms.uActivity.value = activity
    wrapperMaterial.uniforms.uDebugMode.value = debugValue
    emissionCenter.set(motion.bodyX, scaledBodyY, 0)
    patternBodyScaleTarget.set(motion.bodyScaleX, motion.bodyScaleY, motion.bodyScaleZ)
    const materialFollow = dampFactor(motion.walk > 0.03 || motion.run > 0.03 ? 42 : 90, delta)
    patternEmissionCenter.lerp(emissionCenter, materialFollow)
    patternBodyScale.lerp(patternBodyScaleTarget, materialFollow)
    wrapperMaterial.uniforms.uEmissionCenter.value.copy(patternEmissionCenter)
    wrapperMaterial.uniforms.uBodyScale.value.copy(patternBodyScale)

    if (pointLightRef.current) {
      pointLightRef.current.visible = haloVisible
      pointLightRef.current.intensity = haloVisible ? 0.55 * glowIntensity * (1 + motion.glowPulse * 0.35) : 0
      pointLightRef.current.color.setHSL((time * 0.065 * colorCycleSpeed + colorCycleOffset) % 1, 0.78, 0.58)
    }

    if (shadowRef.current) {
      shadowRef.current.position.x = motion.bodyX * 0.72
      shadowRef.current.scale.set(0.82 * motion.shadowScale, 0.28 * motion.shadowScale, 1)
    }

    if (shadowMaterialRef.current) {
      shadowMaterialRef.current.opacity = clamp01(motion.shadowOpacity)
    }

    if (facePatchMaterialRef.current) {
      facePatchMaterialRef.current.opacity = debugMaterial === 'face-contrast' ? 0.28 : debugMaterial === 'super-psychedelic' ? 0 : 0.105
    }

    const left = limbPose(-1, rigMotion, bodyQuaternion)
    const right = limbPose(1, rigMotion, bodyQuaternion)
    const legStretchRadius = clamp01(motion.legStretch * 0.95 + motion.launch * 0.12 - motion.land * 0.22)
    const armStretchRadius = clamp01(motion.armStretch * 0.85 + motion.launch * 0.06 - motion.land * 0.2)
    const walkArmRoundness = clamp01(motion.walk) * 0.085
    const limbMelt = clamp01(motion.limbMelt ?? 0)
    const socketMerge = clamp01(motion.socketMerge ?? 0)
    const limbVisible = 1 - smootherstep01((limbMelt - 0.82) / 0.16)
    const activeBallForm = clamp01(motion.ballForm ?? 0)
    const ballShock = clamp01(motion.ballShock ?? 0)
    const animatedLegRadius = LEG_HOSE_RADIUS * (1 - legStretchRadius * 0.22 + Math.max(motion.compress, motion.land) * 0.075) * (1 - limbMelt * 0.58)
    const animatedArmRadius =
      ARM_HOSE_RADIUS *
      (1 - armStretchRadius * (0.13 - walkArmRoundness) + Math.max(motion.compress, motion.land) * 0.025 + walkArmRoundness) *
      (1 - limbMelt * 0.64)

    placeRubberHose(leftArmHoseRef.current, left.shoulder, left.elbow, left.hand, animatedArmRadius)
    placeRubberHose(rightArmHoseRef.current, right.shoulder, right.elbow, right.hand, animatedArmRadius)

    const runImpactAmount = clamp01(motion.run)
    const walkTravelImpactAmount = clamp01(motion.walkTravel) * (1 - runImpactAmount)
    const baseImpactAmount = clamp01(motion.land + motion.impactBurst * 0.82)
    const jumpImpactGate = isJumpAssetAnimation(animation) ? ballShock : 1
    const leftImpact = Math.max(
      sideLandingPulse(motion.phase, -1) * baseImpactAmount,
      runImpactAmount * circularSoftPulse01(motion.phase, 0.035, 0.075) * clamp01(motion.land + motion.impactBurst),
      walkTravelImpactAmount * circularSoftPulse01(motion.phase, 0.035, 0.088) * baseImpactAmount * 0.42,
    ) * jumpImpactGate
    const rightImpact = Math.max(
      sideLandingPulse(motion.phase, 1) * baseImpactAmount,
      runImpactAmount * circularSoftPulse01(motion.phase, 0.535, 0.075) * clamp01(motion.land + motion.impactBurst),
      walkTravelImpactAmount * circularSoftPulse01(motion.phase, 0.535, 0.088) * baseImpactAmount * 0.42,
    ) * jumpImpactGate
    if (activeBallForm > 0.42 && ballShock > 0.025) {
      placeBallImpact(leftImpactFxRef.current, leftImpactMaterial, -1, motion, ballShock)
      placeBallImpact(rightImpactFxRef.current, rightImpactMaterial, 1, motion, ballShock)
    } else {
      placeFootImpact(leftImpactFxRef.current, leftImpactMaterial, left.foot, -1, leftImpact)
      placeFootImpact(rightImpactFxRef.current, rightImpactMaterial, right.foot, 1, rightImpact)
    }

    const footPressure = Math.min(1.55, Math.max(motion.land, motion.compress * 0.86, motion.prep * 0.44) + motion.impactBurst * 0.26)

    placeBulb(leftHipRef.current, leftHipBlendPosition.copy(left.hip).add(HIP_BLEND_OFFSET), [
      0.26 - motion.legStretch * 0.012 + socketMerge * 0.04,
      0.205 + motion.legStretch * 0.02 + Math.max(motion.compress, motion.land) * 0.018 + socketMerge * 0.025,
      0.19,
    ])
    placeShoe(leftFootRef.current, left.foot, -1, footPressure, rigMotion)
    if (leftFootRef.current) leftFootRef.current.scale.multiplyScalar(1 - limbMelt * 0.48)
    shoeHoseEndpoint(leftFootRef.current, -1, left.foot, leftShoeHoseEndpoint, leftShoeEndpointOffset)
    placeBulb(rightHipRef.current, rightHipBlendPosition.copy(right.hip).add(HIP_BLEND_OFFSET), [
      0.26 - motion.legStretch * 0.012 + socketMerge * 0.04,
      0.205 + motion.legStretch * 0.02 + Math.max(motion.compress, motion.land) * 0.018 + socketMerge * 0.025,
      0.19,
    ])
    placeShoe(rightFootRef.current, right.foot, 1, footPressure, rigMotion)
    if (rightFootRef.current) rightFootRef.current.scale.multiplyScalar(1 - limbMelt * 0.48)
    shoeHoseEndpoint(rightFootRef.current, 1, right.foot, rightShoeHoseEndpoint, rightShoeEndpointOffset)
    placeRubberHose(leftLegHoseRef.current, left.hip, left.knee, leftShoeHoseEndpoint, animatedLegRadius)
    placeRubberHose(rightLegHoseRef.current, right.hip, right.knee, rightShoeHoseEndpoint, animatedLegRadius)
    const leftArmSpring = getArmSpringForces(motion, -1)
    const rightArmSpring = getArmSpringForces(motion, 1)
    placeBulb(leftShoulderRef.current, leftShoulderBlendPosition.copy(left.shoulder).add(SHOULDER_BLEND_OFFSET), [
      0.205 - motion.armStretch * 0.008 + leftArmSpring.impactWhip * 0.012 + socketMerge * 0.035,
      0.17 + motion.armStretch * 0.016 + leftArmSpring.reboundFlick * 0.01 + socketMerge * 0.024,
      0.17,
    ])
    placeBulb(leftHandRef.current, left.hand, [
      0.22 + leftArmSpring.impactWhip * 0.028 + leftArmSpring.descentSweep * 0.012 + motion.airborne * 0.012 - motion.armStretch * 0.022 - limbMelt * 0.075,
      0.205 -
        leftArmSpring.impactWhip * 0.018 +
        leftArmSpring.pumpUp * 0.024 +
        motion.armStretch * 0.036 +
        leftArmSpring.reboundFlick * 0.026 -
        limbMelt * 0.062,
      0.185 + motion.airborne * 0.014 + leftArmSpring.reboundFlick * 0.012 - limbMelt * 0.052,
    ])
    placeBulb(rightShoulderRef.current, rightShoulderBlendPosition.copy(right.shoulder).add(SHOULDER_BLEND_OFFSET), [
      0.205 - motion.armStretch * 0.008 + rightArmSpring.impactWhip * 0.012 + socketMerge * 0.035,
      0.17 + motion.armStretch * 0.016 + rightArmSpring.reboundFlick * 0.01 + socketMerge * 0.024,
      0.17,
    ])
    placeBulb(rightHandRef.current, right.hand, [
      0.22 + rightArmSpring.impactWhip * 0.028 + rightArmSpring.descentSweep * 0.012 + motion.airborne * 0.012 - motion.armStretch * 0.022 - limbMelt * 0.075,
      0.205 -
        rightArmSpring.impactWhip * 0.018 +
        rightArmSpring.pumpUp * 0.024 +
        motion.armStretch * 0.036 +
        rightArmSpring.reboundFlick * 0.026 -
        limbMelt * 0.062,
      0.185 + motion.airborne * 0.014 + rightArmSpring.reboundFlick * 0.012 - limbMelt * 0.052,
    ])

    setGroupOpacityOrVisibility(leftArmHoseRef.current, limbVisible)
    setGroupOpacityOrVisibility(rightArmHoseRef.current, limbVisible)
    setGroupOpacityOrVisibility(leftLegHoseRef.current, limbVisible)
    setGroupOpacityOrVisibility(rightLegHoseRef.current, limbVisible)
    setGroupOpacityOrVisibility(leftHipRef.current, limbVisible)
    setGroupOpacityOrVisibility(rightHipRef.current, limbVisible)
    setGroupOpacityOrVisibility(leftShoulderRef.current, limbVisible)
    setGroupOpacityOrVisibility(rightShoulderRef.current, limbVisible)
    setGroupOpacityOrVisibility(leftHandRef.current, limbVisible)
    setGroupOpacityOrVisibility(rightHandRef.current, limbVisible)
    setGroupOpacityOrVisibility(leftFootRef.current, limbVisible)
    setGroupOpacityOrVisibility(rightFootRef.current, limbVisible)

    placeBulb(leftHipMarkerRef.current, left.hip, 1)
    placeBulb(leftKneeMarkerRef.current, left.knee, 1)
    placeBulb(leftFootMarkerRef.current, left.foot, 1)
    placeBulb(rightHipMarkerRef.current, right.hip, 1)
    placeBulb(rightKneeMarkerRef.current, right.knee, 1)
    placeBulb(rightFootMarkerRef.current, right.foot, 1)

    const activeExpression = resolveExpression(expression, motion, time, autoExpressionRef, autoExpressionHoldUntilRef)
    applyFaceMotion(faceRigRef.current, motion, activeExpression, time)
    setFaceVariantVisible(
      [
        ['neutral', neutralFaceRef],
        ['happy', happyFaceRef],
        ['blink', blinkFaceRef],
        ['squash', squashFaceRef],
        ['surprised', surprisedFaceRef],
        ['focused', focusedFaceRef],
        ['delighted', delightedFaceRef],
        ['effort', effortFaceRef],
      ],
      activeExpression,
    )
  })

  return (
    <group ref={rootGroupRef} position={position} scale={scale}>
      {showShadow ? (
        <mesh ref={shadowRef} position={[0, -2.02, 0.05]} rotation-x={-Math.PI / 2} renderOrder={-2}>
          <circleGeometry args={[1, 48]} />
          <meshBasicMaterial ref={shadowMaterialRef} color={SHADOW} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      ) : null}
      {showShadow && showLimbs ? (
        <>
          <FootImpactFx impactRef={leftImpactFxRef} material={leftImpactMaterial} side={-1} />
          <FootImpactFx impactRef={rightImpactFxRef} material={rightImpactMaterial} side={1} />
        </>
      ) : null}

      <group ref={bodyMotionRef}>
        {showBody ? (
          <>
            <mesh scale={1.072} renderOrder={0}>
              <sphereGeometry args={[1, 42, 28]} />
              <meshBasicMaterial color={INK} side={THREE.BackSide} />
            </mesh>
            <mesh renderOrder={1} material={wrapperMaterial}>
              <sphereGeometry args={[0.965, 48, 32]} />
            </mesh>
            {diffusionVisible ? (
              <mesh scale={1.008} renderOrder={2}>
                <sphereGeometry args={[1, 48, 30]} />
                <meshBasicMaterial color="#eaffee" transparent opacity={0.18} depthWrite={false} />
              </mesh>
            ) : null}
            {haloVisible ? (
              <mesh scale={1.105} renderOrder={-1}>
                <sphereGeometry args={[1, 36, 22]} />
                <meshBasicMaterial
                  color="#65fff3"
                  transparent
                  opacity={0.13 * glowIntensity}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                  side={THREE.BackSide}
                />
              </mesh>
            ) : null}
            {showSockets ? (
              <>
                <SocketOval
                  position={[-0.875, -0.05, -0.49]}
                  scale={[0.16, 0.23, 0.024]}
                  opacity={0.18}
                  rotation={[0, 0.16, -0.18]}
                />
                <SocketOval
                  position={[0.875, -0.05, -0.49]}
                  scale={[0.16, 0.23, 0.024]}
                  opacity={0.18}
                  rotation={[0, -0.16, 0.18]}
                />
                <SocketOval
                  position={[-0.425, -0.785, -0.48]}
                  scale={[0.25, 0.16, 0.026]}
                  opacity={0.26}
                  rotation={[0, 0.15, 0.1]}
                />
                <SocketOval
                  position={[0.425, -0.785, -0.48]}
                  scale={[0.25, 0.16, 0.026]}
                  opacity={0.26}
                  rotation={[0, -0.15, -0.1]}
                />
              </>
            ) : null}
            {showFace ? (
              <group ref={faceRigRef} position={[0, 0, -1.028]}>
                <mesh scale={[0.56, 0.42, 1]} renderOrder={7}>
                  <circleGeometry args={[1, 48]} />
                  <meshBasicMaterial
                    ref={facePatchMaterialRef}
                    color={FACE_PATCH}
                    transparent
                    opacity={0.105}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                <FaceVariant variant="neutral" variantRef={neutralFaceRef} />
                <FaceVariant variant="happy" variantRef={happyFaceRef} />
                <FaceVariant variant="blink" variantRef={blinkFaceRef} />
                <FaceVariant variant="squash" variantRef={squashFaceRef} />
                <FaceVariant variant="surprised" variantRef={surprisedFaceRef} />
                <FaceVariant variant="focused" variantRef={focusedFaceRef} />
                <FaceVariant variant="delighted" variantRef={delightedFaceRef} />
                <FaceVariant variant="effort" variantRef={effortFaceRef} />
              </group>
            ) : null}
          </>
        ) : null}
      </group>

      {showLimbs ? (
        <group>
          <RubberHoseCurve hoseRef={leftLegHoseRef} radius={LEG_HOSE_RADIUS} wrapperMaterial={wrapperMaterial} />
          <RubberHoseCurve hoseRef={rightLegHoseRef} radius={LEG_HOSE_RADIUS} wrapperMaterial={wrapperMaterial} />
          <RubberHoseCurve hoseRef={leftArmHoseRef} radius={ARM_HOSE_RADIUS} wrapperMaterial={wrapperMaterial} />
          <RubberHoseCurve hoseRef={rightArmHoseRef} radius={ARM_HOSE_RADIUS} wrapperMaterial={wrapperMaterial} />

          <SeamBlendBulb ref={leftHipRef} wrapperMaterial={wrapperMaterial} />
          <ShoePad ref={leftFootRef} wrapperMaterial={wrapperMaterial} side={-1} />
          <SeamBlendBulb ref={rightHipRef} wrapperMaterial={wrapperMaterial} />
          <ShoePad ref={rightFootRef} wrapperMaterial={wrapperMaterial} side={1} />
          <SeamBlendBulb ref={leftShoulderRef} wrapperMaterial={wrapperMaterial} />
          <ToonBulb ref={leftHandRef} wrapperMaterial={wrapperMaterial} />
          <SeamBlendBulb ref={rightShoulderRef} wrapperMaterial={wrapperMaterial} />
          <ToonBulb ref={rightHandRef} wrapperMaterial={wrapperMaterial} />
        </group>
      ) : null}

      {showRig ? (
        <group>
          <RigMarker markerRef={leftHipMarkerRef} color={RIG_BLUE} />
          <RigMarker markerRef={leftKneeMarkerRef} color={RIG_PINK} />
          <RigMarker markerRef={leftFootMarkerRef} color={RIG_YELLOW} />
          <RigMarker markerRef={rightHipMarkerRef} color={RIG_BLUE} />
          <RigMarker markerRef={rightKneeMarkerRef} color={RIG_PINK} />
          <RigMarker markerRef={rightFootMarkerRef} color={RIG_YELLOW} />
        </group>
      ) : null}

      <pointLight ref={pointLightRef} position={[0, 0.16, -0.4]} intensity={0.48} distance={3.2} color="#65fff3" />
    </group>
  )
}
