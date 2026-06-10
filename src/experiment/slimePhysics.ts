import { PRODUCTION_TUNING } from '../core/productionTuning'

export type StretchTargetInput = {
  anchorDistance: number
  speed: number
  suctionLoad: number
  suctionYield: number
  latchSeal: number
  slurp: number
  merge: number
  mergeTarget: number
}

export type AbsorptionInput = {
  smallSize: number
  largeSize: number
  distance: number
  desiredDistance: number
  merge: number
  coagulate: number
}

export type MergeCohesionInput = {
  distance: number
  desiredDistance: number
  mergeStrength: number
  relativeAlong: number
  relativeSpeed: number
  floorStick: number
  samePile: boolean
}

export type PoolingInput = {
  mass: number
  visibleMass: number
  merge: number
  coagulate: number
  compression: number
  settled: number
  absorb: number
}

export type SuctionDeformationInput = {
  distance: number
  ahead: number
  influence: number
  suctionLoad: number
  suctionYield: number
  latchSeal: number
  stretchMemory: number
  speed: number
  tetherStrain: number
}

export type IntakeContactInput = {
  distance: number
  ahead: number
  influence: number
  suctionLoad: number
  suctionYield: number
  latchSeal: number
  slurp: number
  mass: number
  visibleMass: number
  floorStick: number
  speed: number
  tetherStrain: number
}

export type IntakeMassTransferInput = {
  adhesion: number
  neck: number
  flow: number
  slurp: number
  suctionYield: number
  latchSeal: number
  visibleMass: number
  mass: number
  floorStick: number
  size: number
}

export type MouthContactSequenceInput = {
  distance: number
  ahead: number
  adhesion: number
  dimple: number
  funnel: number
  neck: number
  flow: number
  intakeFeed: number
  slurpPressure: number
  organicHold: number
  rimGrip: number
  suctionYield: number
  latchSeal: number
  slurp: number
  visibleMass: number
  mass: number
  floorStick: number
  speed: number
}

export type HoseSlimeInteractionPhase =
  | 'idle'
  | 'near'
  | 'touch'
  | 'seal'
  | 'stretch'
  | 'gulp'
  | 'strain'
  | 'pop'

export type HoseSlimeInteractionReadInput = {
  prePull: number
  surfacePull: number
  contactCompression: number
  sealRing: number
  sealStrength: number
  hookStrength: number
  bridge: number
  contactFeed: number
  glugPulse: number
  massFeed: number
  tension: number
  tetherStrain: number
  contactSnap: number
  release: number
  popJuice: number
  embedDepth: number
}

export type OrganicSuctionGripInput = {
  distance: number
  ahead: number
  influence: number
  adhesion: number
  dimple: number
  funnel: number
  neck: number
  flow: number
  latchSeal: number
  slurp: number
  suctionYield: number
  visibleMass: number
  mass: number
  floorStick: number
  mouthSettle: number
  controllerGrip: number
  intakeFeed: number
  speed: number
}

export type EasySuctionAssistInput = {
  distance: number
  ahead: number
  influence: number
  visibleMass: number
  floorStick: number
  suctionYield: number
  pointerDown: boolean
  active: boolean
  latchSeal: number
  grabReadiness: number
  adhesion: number
  magneticPull: number
  contactReadiness: number
  physicalContact?: number
  reattachGrace: number
  bodySpeed: number
}

export type PileSurfaceSuctionAssistInput = {
  surfaceDistance: number
  ahead: number
  influence: number
  visibleMass: number
  active: boolean
  latchSeal: number
  physicalContact?: number
}

export type PhysicalPileContactGateInput = {
  surfaceDistance: number
  patchDistance: number
  patchRadius: number
  verticalDistance: number
  existingContact?: number
}

export type LooseFragmentIntakeInput = {
  distance: number
  ahead: number
  visibleMass: number
  mass: number
  size: number
  floorStick: number
  suctionYield: number
  brush: number
  contactReadiness: number
  physicalContact: number
  latched: boolean
}

export type VisibleSlimeVacuumabilityInput = {
  distanceToMouth: number
  surfaceDistanceToMouth?: number
  visibleMass: number
  mass: number
  size?: number
  popProgress: number
  suctionActive: boolean
  latched: boolean
  levelCleared: boolean
  stuckAge: number
}

export type VisibleSlimeVacuumabilityResult = {
  visible: boolean
  gameplay: boolean
  fragment: boolean
  residue: boolean
  stranded: boolean
  autoCleanup: boolean
  mouthPopReady: boolean
  swallowReady: boolean
  mouthPull: number
  feed: number
  massDrain: number
  effectiveMass: number
}

export type SuctionCandidateScoreInput = {
  distance: number
  ahead: number
  influence: number
  visibleMass: number
  floorStick: number
  bodySpeed: number
  travelAlignment: number
  swingArc: number
  reattachGrace: number
  currentAnchor?: boolean
}

export type ElasticSnapBondInput = {
  latchAge: number
  latchSeal: number
  grip: number
  organicHold: number
  rimGrip: number
  contactRope: number
  contactFeed: number
  contactSnap: number
  stretchDistance: number
  tetherStrain: number
  swingTension: number
  bodySpeed: number
  slurp: number
  intakeFeed: number
  suctionYield: number
  visibleMass: number
  mass: number
  floorStick: number
  releaseMomentum: number
  cooldown: number
}

export type RhythmicGlugInput = {
  time: number
  seed: number
  latchAge: number
  readiness: number
  feed: number
  pressure: number
  neck: number
  visibleMass: number
  mass: number
  floorStick: number
  suctionYield: number
  contactResistance: number
}

export type GlugMassTransferEventInput = {
  time: number
  seed: number
  latchAge: number
  lastGlugAge: number
  cooldownRemaining: number
  detached: boolean
  sealQuality: number
  latchSeal: number
  feed: number
  pressure: number
  bridgeActive: number
  bridgeThickness: number
  visibleMass: number
  mass: number
  basePulse: number
  baseMassTransfer: number
  tetherStrain: number
  swingTension: number
}

export type DeepSuctionEmbedState =
  | 'searching'
  | 'airflow-influence'
  | 'surface-bite'
  | 'seal-contact'
  | 'deep-embed'
  | 'embed-lock'
  | 'embed-strain'
  | 'pop-out-snap'
  | 'recovery'

export type DeepSuctionEmbedReleaseReason =
  | 'none'
  | 'detached'
  | 'tension'
  | 'angle'
  | 'depleted'
  | 'timeout'

export type DeepSuctionEmbedInput = {
  dt: number
  currentDepth: number
  age: number
  latchAge: number
  detached: boolean
  distance: number
  ahead: number
  sealQuality: number
  latchSeal: number
  visibleMass: number
  mass: number
  bodySpeed: number
  tetherStrain: number
  swingTension: number
  bridgeIntent: number
  bridgeThickness: number
  glugStrength: number
  glugMassFlow: number
}

export type SuctionContactFlowInput = {
  distance: number
  ahead: number
  influence: number
  latchSeal: number
  candidateScore: number
  visibleMass: number
  mass: number
  floorStick: number
  suctionYield: number
  contactReadiness: number
  contactRope: number
  contactFeed: number
  intakeFlow: number
  intakeFeed: number
  rimGrip: number
  organicHold: number
  slurpPressure: number
  glugPulse: number
  glugMassTransfer: number
  tetherStrain: number
  swingTension: number
  bodySpeed: number
}

export type BagRewardInput = {
  collectedMass: number
  currentFill: number
  currentPressure: number
  currentBeauty: number
  incomingMass: number
  glugPulse: number
  glugMassFlow: number
  swallowPulse: number
  sealStrength?: number
  tension?: number
}

export type FullSlurpPayoffInput = {
  visibleMass: number
  intakeFeed: number
  contactFeed: number
  slurp: number
  glugPulse: number
  glugMassFlow: number
  neck: number
  rope: number
  latchAge: number
  distanceToMouth: number
  mass: number
  bagFill: number
  fragmentAbsorb: number
}

export type CartoonActionAnimationInput = {
  stretch: number
  contraction: number
  suction: number
  glugPulse: number
  glugMassFlow: number
  slide: number
  snap: number
  recoil: number
  bagFill: number
  bagPulse: number
  bagPressure: number
  completion: number
}

export type VisibleHoseSlurpInput = {
  intakeFlow: number
  massFeed: number
  contactNeck: number
  slurpPressure: number
  magneticPull: number
  organicHold: number
  gulpFlow: number
  mouthSettle: number
}

export type PremiumSlimeMaterialInput = {
  stretchMemory: number
  contraction: number
  compression: number
  mergeHeat: number
  surfaceTension: number
  poolPressure: number
  suctionStrain: number
  tendril: number
  intakeFlow: number
  intakeFeed: number
  visibleMass: number
  speed: number
  floorStick: number
  settled: number
  reemergeCharge: number
}

export type ElasticTetherInput = {
  distance: number
  currentRestLength: number
  pointerDistance: number
  pointerDown: boolean
  active: boolean
  hookStrength: number
  dt: number
}

export type SlimeGrabInput = {
  distance: number
  ahead: number
  suctionInfluence: number
  pointerDown: boolean
  active: boolean
  hookStrength: number
  releaseMomentum?: number
  bodySpeed?: number
}

export type AnchoredControllerInput = {
  hookStrength: number
  tetherStrain: number
  suctionReadiness: number
  swingTension: number
  bodySpeed: number
  distanceToHook: number
  pointerDown: boolean
  release: number
}

export type SwingFlowInput = {
  hookStrength: number
  tetherStrain: number
  swingTension: number
  bodySpeed: number
  distanceToHook: number
  restLength: number
  pointerDistance: number
  pointerDown: boolean
  active: boolean
  suctionReadiness: number
  releaseMomentum: number
}

export type SuctionPivotSwingInput = {
  hookStrength: number
  sealStrength: number
  sealQuality: number
  embedDepth: number
  embedLockStrength: number
  distanceToPivot: number
  restLength: number
  tetherStrain: number
  swingTension: number
  bodySpeed: number
  radialOutSpeed: number
  tangentialSpeed: number
  pointerTangentialIntent: number
  releaseMomentum: number
  reattachGrace: number
  pointerDown: boolean
  active: boolean
}

export type RightClickGripSwingInput = {
  active: boolean
  holdTime: number
  missedWindows: number
  spinAngle: number
  currentSpinSpeed: number
  dt: number
  distanceToGrip: number
  restLength: number
  bodySpeed: number
  sealStrength: number
  tension: number
}

function smooth01(value: number) {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped * clamped * (3 - clamped * 2)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function computeJellyWaxYield(
  suctionLoad: number,
  floorStick: number,
  coagulate: number,
  merge: number,
  latchSeal = 0,
) {
  const yieldThreshold = 0.28 + floorStick * 0.2 + coagulate * 0.1 + merge * 0.04
  return Math.max(latchSeal, smooth01((suctionLoad - yieldThreshold) / 0.56))
}

export function computeJellyWaxStretchTarget(input: StretchTargetInput) {
  return Math.min(
    1.75,
    input.anchorDistance * 1.42
      + input.speed * 0.26
      + input.suctionLoad * 0.16
      + input.suctionYield * 0.38
      + input.latchSeal * (0.32 + input.slurp * 0.38)
      + Math.max(input.merge, input.mergeTarget) * 0.12,
  )
}

export function computeContractionTarget(previousStretch: number, stretchTarget: number) {
  const release = previousStretch - stretchTarget
  return release > 0.025 ? Math.min(1.25, release * 1.75) : 0
}

export function computeFragmentAbsorption(input: AbsorptionInput) {
  if (input.smallSize >= input.largeSize * 0.82) return 0
  const close = smooth01((input.desiredDistance * 0.96 - input.distance) / Math.max(0.001, input.desiredDistance * 0.96))
  const sticky = smooth01(input.merge * 0.72 + input.coagulate * 0.46)
  return close * sticky
}

export function computeMergeCohesion(input: MergeCohesionInput) {
  const overlap = smooth01((input.desiredDistance - input.distance) / Math.max(0.001, input.desiredDistance))
  const waxSeal = smooth01(input.mergeStrength * 0.72 + input.floorStick * 0.28 + (input.samePile ? 0.08 : 0))
  const pull = (input.distance - input.desiredDistance) * input.mergeStrength * (1.14 + waxSeal * 0.72)
  const damping = input.relativeAlong * input.mergeStrength * (0.38 + waxSeal * 0.42)
  const compression = clamp(overlap * (0.26 + input.relativeSpeed * 0.15 + waxSeal * 0.22), 0, 1.4)
  const heat = clamp(input.mergeStrength * (0.42 + input.relativeSpeed * 0.16 + compression * 0.36 + (input.samePile ? 0.08 : 0)), 0, 1.45)
  const surfaceTension = clamp(waxSeal * (0.34 + overlap * 0.52 + input.mergeStrength * 0.18), 0, 1.25)

  return {
    pull,
    damping,
    compression,
    heat,
    surfaceTension,
  }
}

export function computePoolingSettle(input: PoolingInput) {
  const material = clamp(input.mass * input.visibleMass, 0, 1.7)
  const pressure = smooth01(
    material * 0.18
      + input.merge * 0.28
      + input.coagulate * 0.24
      + input.compression * 0.32
      + input.settled * 0.18
      + input.absorb * 0.22,
  )

  return {
    pressure,
    spread: 1 + pressure * 0.34 + input.merge * 0.08,
    height: clamp(1 - pressure * 0.24 + input.compression * 0.08, 0.64, 1.16),
  }
}

export function computeSuctionDeformation(input: SuctionDeformationInput) {
  const tuning = PRODUCTION_TUNING.suction
  const reachDistance = Math.max(1.42, tuning.preContactPullRadius * 0.92)
  const reach = smooth01((reachDistance - input.distance) / reachDistance)
  const facing = clamp(input.ahead * 0.82 + input.influence * 0.5 + input.latchSeal * 0.42, 0, 1.65)
  const directional = reach * facing
  const resistance = smooth01(input.suctionLoad * (1 - input.suctionYield) * (0.72 + input.ahead * 0.28))
  const strain = clamp(
    directional * (0.38 + input.suctionLoad * 0.28 + input.suctionYield * 0.48 + input.latchSeal * 0.48)
      + input.tetherStrain * 0.16
      + input.speed * 0.04,
    0,
    1.55,
  )
  const tendril = smooth01((strain + directional * 0.2 + input.stretchMemory * 0.32 + input.suctionYield * 0.26 + input.latchSeal * 0.28 - 0.34) / 1.08)

  return {
    resistance,
    strain,
    tendril,
    thinning: clamp(tendril * (0.26 + input.suctionYield * 0.42 + input.latchSeal * 0.24), 0, 0.82),
  }
}

export function computeIntakeContact(input: IntakeContactInput) {
  const tuning = PRODUCTION_TUNING.suction
  const aligned = clamp(input.ahead * 0.76 + input.influence * 0.3 + input.latchSeal * 0.52, 0, 1.35)
  const surfacePullReach = smooth01(
    (tuning.mouthSurfacePullRadius - input.distance) / Math.max(0.001, tuning.mouthSurfacePullRadius),
  )
  const surfacePull = clamp(
    surfacePullReach
      * (0.3 + input.ahead * 0.42 + input.influence * 0.28 + input.suctionLoad * 0.12)
      * (0.58 + input.visibleMass * 0.28 + input.suctionYield * 0.18),
    0,
    1.35,
  )
  const contactCompression = clamp(
    smooth01(
      (tuning.mouthContactCompressionDistance - input.distance)
        / Math.max(0.001, tuning.mouthContactCompressionDistance),
    )
      * (0.38 + aligned * 0.36 + input.latchSeal * 0.28 + input.suctionYield * 0.18)
      * (0.74 + input.visibleMass * 0.18),
    0,
    1.45,
  )
  const near = Math.max(
    smooth01((1.1 - input.distance) / 1.1) * aligned,
    surfacePull * 0.34,
  )
  const materialResistance = clamp(
    input.mass * input.visibleMass * (0.16 + input.floorStick * 0.14) * (1 - input.suctionYield * 0.42),
    0,
    0.55,
  )
  const adhesion = clamp(
    smooth01((0.78 - input.distance) / 0.62) * (0.42 + aligned * 0.42)
      + input.latchSeal * 0.76
      + input.suctionLoad * 0.08
      + contactCompression * 0.18
      + surfacePull * 0.08
      - materialResistance * 0.08,
    0,
    1.25,
  )
  const dimple = clamp(
    near * (0.22 + input.suctionLoad * 0.3)
      + adhesion * 0.32
      + input.tetherStrain * 0.08
      + contactCompression * tuning.mouthContactCompressionStrength
      + surfacePull * 0.1
      - materialResistance * 0.08,
    0,
    1.35,
  )
  const funnel = clamp(
    dimple * 0.44
      + adhesion * (0.28 + input.suctionYield * 0.34)
      + input.slurp * 0.26
      + input.speed * 0.025
      + contactCompression * 0.18
      - materialResistance * 0.08,
    0,
    1.45,
  )
  const neck = smooth01((funnel + input.suctionYield * 0.24 + input.slurp * 0.38 - 0.44) / 1.02)
  const flow = clamp(
    neck * (0.34 + input.slurp * 0.36 + input.suctionYield * 0.28)
      + adhesion * 0.12
      + input.latchSeal * 0.08,
    0,
    1.35,
  )

  return {
    near,
    adhesion,
    dimple,
    funnel,
    neck,
    flow,
    surfacePull,
    compression: contactCompression,
    sealRing: clamp(
      (adhesion * 0.44 + dimple * 0.22 + contactCompression * 0.42 + input.latchSeal * 0.22)
        * tuning.mouthSealRingStrength,
      0,
      1.55,
    ),
    rimStick: clamp(adhesion * 0.64 + input.latchSeal * 0.44, 0, 1.2),
  }
}

export function computeIntakeMassTransfer(input: IntakeMassTransferInput) {
  const suctionTuning = PRODUCTION_TUNING.suction
  const smallFragmentEase = smooth01((0.12 - input.size) / 0.12) * 0.22
  const tinyMassEase = smooth01((0.18 - input.visibleMass) / 0.18) * 0.16
  const massResistance = clamp(
    input.mass * 0.12
      + Math.max(input.visibleMass, suctionTuning.tinySlimeVisibleMassFloor) * 0.08
      + input.floorStick * (1 - input.suctionYield) * 0.22,
    0,
    0.55,
  )
  const feedRate = clamp(
    (input.flow * 0.62
      + input.neck * 0.24
      + input.slurp * 0.32
      + input.adhesion * 0.08
      + input.latchSeal * 0.08
      + smallFragmentEase
      + tinyMassEase
      - massResistance)
      * (0.58 + input.suctionYield * 0.42),
    0,
    1.35,
  )
  const visibleMassTarget = clamp(
    1 - feedRate * (0.34 + input.slurp * 0.24 + input.neck * 0.16 + tinyMassEase * 0.38),
    suctionTuning.tinySlimeIntakeTargetFloor,
    1,
  )

  return {
    feedRate,
    visibleMassTarget,
    swallowReady: input.visibleMass < 0.24 && input.slurp > 0.62 && feedRate > 0.2,
    recoil: clamp(input.neck * 0.3 + input.flow * 0.24 + input.slurp * 0.16, 0, 1),
  }
}

export function computeMouthContactSequence(input: MouthContactSequenceInput) {
  const tuning = PRODUCTION_TUNING.suction
  const alignment = clamp(
    input.ahead * 0.78
      + input.adhesion * 0.22
      + input.rimGrip * 0.12
      + input.latchSeal * 0.36,
    0,
    1.55,
  )
  const nearField = smooth01((0.98 - input.distance) / 0.98) * alignment
  const massLag = clamp(
    input.mass * input.visibleMass * 0.15
      + input.floorStick * (1 - input.suctionYield) * 0.2
      + Math.max(0, 1 - input.slurp) * input.visibleMass * 0.06
      - input.intakeFeed * 0.12,
    0,
    0.62,
  )
  const readiness = clamp(
    nearField * (0.46 + input.speed * 0.04)
      + input.adhesion * 0.22
      + input.slurpPressure * 0.08
      - massLag * 0.08,
    0,
    1.25,
  )
  const lipSeal = clamp(
    input.adhesion * 0.42
      + input.rimGrip * 0.34
      + input.organicHold * 0.18
      + input.latchSeal * 0.3
      + readiness * 0.08
      - massLag * 0.08,
    0,
    1.45,
  )
  const contactCompression = clamp(
    input.dimple * 0.44
      + nearField * 0.22
      + input.adhesion * 0.16
      + lipSeal * 0.18
      + input.latchSeal * 0.28
      - massLag * 0.05,
    0,
    1.55,
  )
  const dent = clamp(
    input.dimple * 0.5
      + readiness * 0.22
      + lipSeal * 0.1
      + input.slurpPressure * 0.08
      + contactCompression * 0.22
      - massLag * 0.06,
    0,
    1.35,
  )
  const tongue = clamp(
    input.funnel * 0.46
      + dent * 0.24
      + lipSeal * 0.18
      + input.suctionYield * 0.1
      + input.slurp * 0.08
      - massLag * 0.09,
    0,
    1.45,
  )
  const rope = smooth01(
    (input.neck * 0.64
      + input.flow * 0.28
      + tongue * 0.2
      + input.slurp * 0.2
      + input.suctionYield * 0.14
      + input.intakeFeed * 0.1
      - massLag * 0.12
      - 0.28)
      / 0.88,
  )
  const feed = clamp(
    input.flow * 0.34
      + input.intakeFeed * 0.44
      + input.slurpPressure * 0.24
      + rope * 0.24
      + input.latchSeal * 0.08
      - massLag * 0.15,
    0,
    1.45,
  )
  const snap = smooth01(
    (rope * 0.42
      + input.slurp * 0.28
      + input.intakeFeed * 0.3
      + (1 - input.visibleMass) * 0.28
      + input.speed * 0.02
      - 0.52)
      / 0.72,
  )

  return {
    readiness,
    lipSeal,
    contactCompression,
    sealRing: clamp(
      (lipSeal * 0.5 + contactCompression * 0.42 + dent * 0.18 + input.latchSeal * 0.18)
        * tuning.mouthSealRingStrength,
      0,
      1.65,
    ),
    dent,
    tongue,
    rope,
    feed,
    snap,
    floatingRisk: clamp(
      smooth01((input.distance - tuning.mouthFloatingDistanceWarn) / 0.58) * (1 - lipSeal * 0.34),
      0,
      1,
    ),
    resistance: clamp(massLag + lipSeal * (1 - input.suctionYield) * 0.18, 0, 1),
  }
}

export function computeHoseSlimeInteractionRead(input: HoseSlimeInteractionReadInput) {
  const near = clamp(input.prePull * 0.42 + input.surfacePull * 0.58 + input.bridge * 0.12, 0, 1.35)
  const touch = clamp(
    input.contactCompression * 0.82
      + input.surfacePull * 0.14
      + input.sealRing * 0.08,
    0,
    1.45,
  )
  const seal = clamp(
    input.sealRing * 0.72
      + input.sealStrength * 0.28
      + input.hookStrength * 0.2
      + input.embedDepth * 0.18,
    0,
    1.55,
  )
  const stretch = clamp(
    Math.max(input.tension, input.tetherStrain) * (0.58 + seal * 0.16)
      + input.hookStrength * 0.14
      + input.bridge * 0.08,
    0,
    1.65,
  )
  const gulp = clamp(
    input.glugPulse * 0.6
      + input.massFeed * 0.38
      + input.contactFeed * 0.34
      + input.bridge * 0.1,
    0,
    1.55,
  )
  const strain = clamp(
    smooth01((Math.max(input.tension, input.tetherStrain) - 0.58) / 0.72) * 0.82
      + input.contactSnap * 0.42
      + input.embedDepth * 0.12,
    0,
    1.55,
  )
  const pop = clamp(input.release * 0.72 + input.popJuice * 0.86 + input.contactSnap * 0.28, 0, 1.65)

  let phase: HoseSlimeInteractionPhase = 'idle'
  if (near > 0.035) phase = 'near'
  if (touch > 0.12) phase = 'touch'
  if (seal > 0.18) phase = 'seal'
  if (stretch > 0.24 && seal > 0.12) phase = 'stretch'
  if (gulp > 0.16 && seal > 0.12) phase = 'gulp'
  if (strain > 0.24 && seal > 0.1) phase = 'strain'
  if (pop > 0.28) phase = 'pop'

  return {
    phase,
    near,
    touch,
    seal,
    stretch,
    gulp,
    strain,
    pop,
    contactFocus: clamp(touch * 0.42 + seal * 0.46 + strain * 0.18, 0, 1.55),
    materialFlow: clamp(gulp * 0.58 + input.massFeed * 0.28 + input.bridge * 0.22, 0, 1.55),
    rebound: clamp(pop * 0.72 + input.contactSnap * 0.3, 0, 1.55),
  }
}

export function computeSuctionContactFlow(input: SuctionContactFlowInput) {
  const suction = PRODUCTION_TUNING.suction
  const glug = PRODUCTION_TUNING.glug
  const visible = clamp(input.visibleMass, 0, 1.2)
  const headOn = clamp(input.ahead, 0, 1)
  const contactLoad = clamp(
    input.contactReadiness * 0.38
      + input.contactRope * 0.28
      + input.contactFeed * 0.3
      + input.intakeFlow * 0.28
      + input.intakeFeed * 0.18
      + input.slurpPressure * 0.22
      + input.latchSeal * 0.44,
    0,
    1.85,
  )
  const materialEase = clamp(
    0.54
      + visible * 0.22
      + input.suctionYield * 0.28
      - input.floorStick * (1 - input.suctionYield) * 0.16
      - input.mass * visible * 0.035,
    0.32,
    1.18,
  )
  const preReach = smooth01((suction.preContactPullRadius - input.distance) / suction.preContactPullRadius)
  const preFacing = clamp(headOn * 0.82 + input.influence * 0.38 + input.candidateScore * 0.28, 0, 1.5)
  const preContact = clamp(preReach * preFacing * materialEase, 0, 1.72)
	  const bridgeReach = smooth01((suction.flowBridgeStartDistance - input.distance) / suction.flowBridgeStartDistance)
	  const bridgeIntent = clamp(
	    bridgeReach * (0.44 + headOn * 0.5 + input.candidateScore * 0.4 + contactLoad * 0.3 + input.influence * 0.12 + preContact * 0.18)
	      + input.latchSeal * 0.68
	      + input.contactRope * 0.56
	      + input.contactFeed * 0.28,
    0,
    1.52,
  )
  const distancePenalty = smooth01(input.distance / Math.max(0.001, suction.flowBridgeStartDistance)) * suction.sealDistancePenalty
  const anglePenalty = (1 - headOn) * suction.sealAnglePenalty * (1 - input.latchSeal * 0.46)
  const sealQuality = clamp(
    suction.sealStrengthBase
      * (input.latchSeal * 0.36
        + input.rimGrip * 0.24
        + input.organicHold * 0.22
	        + input.candidateScore * 0.16
	        + contactLoad * 0.2
	        + bridgeIntent * 0.2
	        + preContact * 0.05)
      * materialEase
      - distancePenalty
      - anglePenalty,
    0,
    1.65,
  )
  const tensionLoad = clamp(input.tetherStrain * 0.46 + input.swingTension * 0.34 + input.bodySpeed * 0.035, 0, 1.7)
  const weakSeal = smooth01((0.86 - sealQuality) / 0.86)
  const leak = clamp(weakSeal * suction.sealLeakRate * (0.5 + tensionLoad * 0.58 + bridgeIntent * 0.28), 0, 0.55)
  const slip = clamp(weakSeal * suction.weakSealSlipRate * (0.36 + tensionLoad * 0.76), 0, 0.78)
  const glugLoad = clamp(
    input.glugMassTransfer * 0.48
	      + input.glugPulse * glug.gulpPulseStrength
	      + input.contactFeed * 0.2
	      + input.intakeFeed * 0.12
	      + sealQuality * 0.08
	      + bridgeIntent * 0.08,
    0,
    1.8,
  )
  const bridgeNarrowing = clamp(
    input.glugPulse * glug.gulpBridgeNarrowAmount
      + leak * 0.24
      + Math.max(0, tensionLoad - 0.62) * 0.18,
    0,
    0.82,
  )
  const bridgeThickness = clamp(
    suction.flowBridgeMinThickness
      + suction.flowBridgeBaseThickness
        * (0.24 + visible * 0.28 + bridgeIntent * 0.38 + sealQuality * 0.26 + glugLoad * 0.18)
        * (1 - bridgeNarrowing * 0.46),
    suction.flowBridgeMinThickness,
    suction.flowBridgeBaseThickness * 1.9,
  )
  const massTransferRate = clamp(
    PRODUCTION_TUNING.suction.slimeMassTransferRate
      * (0.2 + sealQuality * 0.38 + bridgeIntent * 0.26 + glugLoad * 0.5)
      * Math.max(0.18, visible)
      * (1 - leak * 0.42),
    0,
    0.52,
  )
  const pulseMass = clamp(
    glug.gulpMassPerPulse
      * glugLoad
      * (0.38 + sealQuality * 0.38 + bridgeIntent * 0.28)
      * Math.max(0.24, visible),
    0,
    glug.gulpMassPerPulse * 3.1,
  )
  const breakRecoil = clamp(
    Math.max(0, tensionLoad - suction.sealBreakTension) * bridgeIntent * 0.44
      + leak * 0.3
      + slip * 0.22,
    0,
    1.2,
  )

  return {
    preContactPull: clamp(preContact * suction.preContactPullStrength, 0, 2.45),
    preContactVisual: clamp(preContact * suction.preContactVisualStrength + bridgeIntent * 0.36, 0, 2.25),
    bridgeIntent,
    bridgeLength: clamp(input.distance, 0.035, suction.flowBridgeMaxLength),
    bridgeThickness,
    sealQuality,
    leak,
    slip,
    massTransferRate,
    pulseMass,
    bridgeNarrowing,
    breakRecoil,
  }
}

export function computeDeepSuctionEmbed(input: DeepSuctionEmbedInput) {
  const tuning = PRODUCTION_TUNING.embed
  const suction = PRODUCTION_TUNING.suction
  const dt = clamp(input.dt, 0, 0.08)
  const visible = clamp(input.visibleMass, 0, 1.2)
  const availableMass = clamp(input.mass * visible, 0, 2.6)
  const depthMax = Math.max(0.001, tuning.embedDepthMax)
  const currentDepth = clamp(input.currentDepth, 0, depthMax)
  const currentDepthN = clamp(currentDepth / depthMax, 0, 1)
  const sealLoad = Math.max(input.sealQuality, input.latchSeal * suction.sealStrengthBase)
  const sealGate = smooth01((sealLoad - tuning.embedSealStrengthMin) / Math.max(0.001, tuning.embedEnableThreshold - tuning.embedSealStrengthMin))
  const alignment = clamp(input.ahead, 0, 1)
  const alignmentGate = smooth01((alignment - 0.18) / 0.52)
  const contactGate = Math.max(
    smooth01((suction.flowBridgeStartDistance - input.distance) / Math.max(0.001, suction.flowBridgeStartDistance)),
    input.latchSeal * 0.95,
    sealGate * 0.16,
  )
  const massGate = smooth01((availableMass - PRODUCTION_TUNING.glug.slimeNearEmptyThreshold * 0.48) / 0.82)
  const durationGate = smooth01((input.latchAge - 0.035) / 0.34)
  const glugLoad = clamp(input.glugStrength * 0.62 + input.glugMassFlow * 0.46 + input.bridgeIntent * 0.28, 0, 1.8)
  const speedEntryPenalty = smooth01((input.bodySpeed - 3.6) / 2.4) * tuning.embedVelocityPenalty * (1 - currentDepthN * 0.58)
  const anglePenalty = clamp((1 - alignmentGate) * tuning.embedAnglePenalty * (1 - currentDepthN * 0.42), 0, 1)
  const tensionLoad = clamp(input.tetherStrain * 0.58 + input.swingTension * 0.42, 0, 2.1)
  const tensionPenalty = clamp(smooth01((tensionLoad - 0.58) / 0.88) * tuning.embedTensionPenalty, 0, 1.1)
  const nearEmpty = smooth01((PRODUCTION_TUNING.glug.slimeNearEmptyThreshold * 1.18 - availableMass) / Math.max(0.001, PRODUCTION_TUNING.glug.slimeNearEmptyThreshold * 1.18))
  const facingHold = 0.28 + alignmentGate * 0.72
  const pocketQuality = clamp(
    sealGate
      * (0.4 + alignmentGate * 0.34 + contactGate * 0.28 + durationGate * 0.24 + glugLoad * 0.2)
      * (0.52 + massGate * 0.48)
      * facingHold
      - anglePenalty * 0.34
      - speedEntryPenalty * 0.25
      - tensionPenalty * 0.22
      - nearEmpty * 0.24,
    0,
    1.58,
  )
  const puddleBite = clamp(
    sealGate
      * contactGate
      * Math.max(input.latchSeal * 0.98, input.bridgeIntent * 0.64, glugLoad * 0.28)
      * (0.46 + alignmentGate * 0.54)
      * (0.58 + massGate * 0.42),
    0,
    1.38,
  )
  const latchedSubmerge = clamp(
    sealGate
      * smooth01((input.latchSeal - 0.18) / 0.44)
      * contactGate
      * (0.5 + alignmentGate * 0.5)
      * (1 - nearEmpty * 0.5),
    0,
    1,
  )
  const contactCup = clamp(sealGate * contactGate * alignmentGate * (0.44 + input.latchSeal * 0.36 + input.bridgeIntent * 0.18), 0, 1)
  const desiredDepth = input.detached ? 0 : clamp(
    (pocketQuality + puddleBite * tuning.embedSurfaceBiteBoost) * depthMax
      + latchedSubmerge * tuning.embedLatchedSubmergeBoost * depthMax
      + contactCup * depthMax * 0.1,
    0,
    depthMax,
  )
  const rate = desiredDepth > currentDepth
    ? tuning.embedDepthRiseSpeed * (0.74 + sealGate * 0.26)
    : tuning.embedDepthFallSpeed * (1 + tensionPenalty * 0.42 + nearEmpty * 0.34)
  const depthBlend = desiredDepth > currentDepth
    ? Math.min(0.74, rate * dt)
    : Math.min(1, rate * dt)
  const depth = clamp(currentDepth + (desiredDepth - currentDepth) * depthBlend, 0, depthMax)
  const depthN = clamp(depth / depthMax, 0, 1)
  const age = depth > 0.035 && !input.detached ? input.age + dt : 0
  const lockStrength = clamp(
    depthN
      * tuning.embedLockStrength
      * (0.5 + sealGate * 0.38 + alignmentGate * 0.2 + massGate * 0.14)
      * (0.4 + alignmentGate * 0.6)
      * (1 - tensionPenalty * 0.16)
      * (1 - nearEmpty * 0.22),
    0,
    2.25,
  )
  const snapThreshold = clamp(
    tuning.embedSnapThreshold
      + lockStrength * 0.28
      + massGate * 0.1
      - nearEmpty * 0.18
      - anglePenalty * 0.12,
    0.52,
    1.42,
  )
  const strain = clamp(tensionLoad * 0.72 + anglePenalty * 0.22 + speedEntryPenalty * 0.12 - lockStrength * 0.12, 0, 1.8)
  const timedOut = age > tuning.embedMaxDuration && strain > snapThreshold * 0.62
  const overTensioned = tensionLoad > snapThreshold * 1.18 && strain > snapThreshold * 0.82
  const snapReady = !input.detached
    && depthN > 0.36
    && age > tuning.embedMinDuration
    && (strain > snapThreshold || overTensioned || timedOut || (nearEmpty > 0.78 && glugLoad > 0.22))
  let releaseReason: DeepSuctionEmbedReleaseReason = 'none'
  if (input.detached && currentDepth > 0.04) releaseReason = 'detached'
  else if (snapReady && nearEmpty > 0.78 && glugLoad > 0.22) releaseReason = 'depleted'
  else if (snapReady && timedOut) releaseReason = 'timeout'
  else if (snapReady && anglePenalty > tensionPenalty && anglePenalty > 0.38) releaseReason = 'angle'
  else if (snapReady) releaseReason = 'tension'

  let state: DeepSuctionEmbedState = 'searching'
  if (input.detached) state = currentDepth > 0.04 ? 'recovery' : 'searching'
  else if (snapReady) state = 'pop-out-snap'
  else if (depthN > 0.48 && strain > snapThreshold * 0.7) state = 'embed-strain'
  else if (depthN > 0.52) state = 'embed-lock'
  else if (depthN > 0.2) state = 'deep-embed'
  else if (sealLoad > tuning.embedSealStrengthMin * 0.86 || input.latchSeal > 0.16) state = 'seal-contact'
  else if (input.bridgeIntent > 0.16 || contactGate > 0.22) state = 'surface-bite'
  else if (contactGate > 0.08) state = 'airflow-influence'

  const multiplierLoad = depthN * (0.82 + lockStrength * 0.28 + glugLoad * 0.1)
  return {
    state,
    embedDepth: snapReady ? Math.max(depth * 0.18, 0.04) : depth,
    targetDepth: desiredDepth,
    embedDepthNormalized: depthN,
    embedAge: age,
    lockStrength,
    anglePenalty,
    tensionPenalty,
    velocityPenalty: speedEntryPenalty,
    slip: clamp((1 - lockStrength * 0.42) * tensionPenalty * tuning.embedSlipRate + anglePenalty * 0.12, 0, 0.62),
    snapThreshold,
    strain,
    snapReady,
    releaseReason,
    glugStrengthMultiplier: 1 + multiplierLoad * (tuning.embedGlugStrengthMultiplier - 1),
    massTransferMultiplier: 1 + multiplierLoad * (tuning.embedMassTransferMultiplier - 1),
    bridgeThicknessMultiplier: 1 + multiplierLoad * (tuning.embedBridgeThicknessMultiplier - 1),
    hoseStretchMultiplier: 1 + depthN * (tuning.embedHoseStretchMultiplier - 1),
    hoseWobble: depthN * tuning.embedHoseWobbleStrength * (0.42 + strain * 0.48 + glugLoad * 0.24),
    pocketRadius: tuning.embedPocketRadius * (0.45 + depthN * 0.55) * (0.86 + input.bridgeThickness * 0.32),
    pocketDimple: clamp(depthN * tuning.embedPocketDimpleStrength * (0.72 + glugLoad * 0.24 + strain * 0.18), 0, 1.42),
	    rimOcclusion: clamp(depthN * tuning.embedRimOcclusionStrength * (0.72 + lockStrength * 0.32 + input.glugStrength * 0.12 + puddleBite * 0.16), 0, 1.48),
    pocketPulse: clamp(depthN * (0.22 + input.glugStrength * 0.46 + input.glugMassFlow * 0.28 + strain * 0.16), 0, 1.42),
    popImpulse: snapReady
      ? clamp(tuning.embedPopImpulseScale * (0.38 + lockStrength * 0.36 + strain * 0.3), 0, 1.75)
      : 0,
    slimeRecoil: snapReady
      ? clamp(tuning.embedSlimeRecoilStrength * (0.42 + depthN * 0.34 + strain * 0.24 + lockStrength * 0.12), 0, 1.45)
      : 0,
    fleckStrength: snapReady
      ? clamp(depthN * (0.48 + strain * 0.42), 0, 1.42)
      : clamp(depthN * smooth01((age - 0.04) / 0.16) * (0.16 + glugLoad * 0.1), 0, 0.5),
  }
}

export function computeElasticSnapBond(input: ElasticSnapBondInput) {
  const ageGate = smooth01((input.latchAge - 0.14) / 0.32)
  const cooldownGate = 1 - smooth01(input.cooldown / 0.24)
  const fedMass = smooth01(input.intakeFeed * 0.76 + input.slurp * 0.34 + input.contactFeed * 0.24)
  const contactGrip = clamp(
    input.grip * 0.26
      + input.latchSeal * 0.28
      + input.organicHold * 0.22
      + input.rimGrip * 0.2
      + input.contactRope * 0.08
      + input.suctionYield * 0.08
      - fedMass * 0.12,
    0,
    1.45,
  )
  const stretchLoad = smooth01((input.stretchDistance - 0.28 + input.slurp * 0.04) / 0.96)
  const controllerLoad = clamp(
    input.tetherStrain * 0.48
      + input.swingTension * 0.34
      + input.releaseMomentum * 0.16
      + smooth01((input.bodySpeed - 0.35) / 3.4) * 0.2,
    0,
    1.7,
  )
  const materialHold = clamp(
    input.mass * input.visibleMass * 0.12
      + input.floorStick * (1 - input.suctionYield) * 0.2
      + (1 - input.visibleMass) * 0.04,
    0,
    0.62,
  )
  const tension = clamp(
    contactGrip * (stretchLoad * 0.58 + controllerLoad * 0.46 + input.contactRope * 0.14)
      + input.contactSnap * 0.12
      - materialHold * 0.16,
    0,
    1.8,
  )
  const strain = smooth01(
    (tension * 0.58
      + stretchLoad * 0.32
      + input.contactRope * 0.22
      + input.contactSnap * 0.18
      - 0.2)
      / 1.02,
  )
  const unstable = smooth01(
    (strain * 0.5
      + tension * 0.36
      + input.contactSnap * 0.22
      + fedMass * 0.12
      - 0.46)
      / 0.62,
  )
  const breakThreshold = clamp(
    0.58
      + materialHold * 0.2
      + input.floorStick * (1 - input.suctionYield) * 0.08
      - fedMass * 0.16
      - input.slurp * 0.08,
    0.38,
    0.82,
  )
  const breakReady = smooth01(
    (tension * 0.58
      + strain * 0.44
      + unstable * 0.32
      + input.contactSnap * 0.18
      - breakThreshold)
      / 0.56,
  )
  const snap = clamp(breakReady * ageGate * cooldownGate, 0, 1)

  return {
    grip: contactGrip,
    tension,
    strain,
    unstable,
    breakReady,
    snap,
    recoil: clamp((unstable * 0.42 + snap * 0.58) * (0.72 + contactGrip * 0.24), 0, 1.35),
    releaseImpulse: clamp(snap * (0.42 + tension * 0.38 + controllerLoad * 0.26), 0, 1.35),
    momentumCarry: clamp(snap * (0.34 + controllerLoad * 0.34 + input.swingTension * 0.12), 0, 1.2),
    slurpBrake: clamp(strain * 0.2 + unstable * 0.18 - fedMass * 0.1, 0, 0.38),
    regripEase: clamp(1 - snap * 0.58 + input.contactFeed * 0.14, 0.28, 1.08),
  }
}

export function computeRhythmicGlugPulse(input: RhythmicGlugInput) {
  const ageGate = smooth01((input.latchAge - 0.08) / 0.34)
  const mouthLoad = clamp(
    input.readiness * 0.34
      + input.feed * 0.28
      + input.pressure * 0.24
      + input.neck * 0.2
      + input.suctionYield * 0.12
      - input.contactResistance * 0.14,
    0,
    1.55,
  )
  const massLag = clamp(input.mass * input.visibleMass * 0.08 + input.floorStick * (1 - input.suctionYield) * 0.16, 0, 0.44)
  const rhythmEnergy = clamp(mouthLoad * (0.86 + input.visibleMass * 0.22) - massLag * 0.18, 0, 1.45) * ageGate
  const cadence = 2.25 + input.pressure * 0.62 + input.feed * 0.48 - massLag * 0.25
  const phase = input.time * cadence + input.seed * 0.23 + input.latchAge * 0.18
  const wave = Math.sin(phase * Math.PI * 2)
  const crest = smooth01((wave - 0.38) / 0.62)
  const aftershock = smooth01((-wave - 0.18) / 0.82) * 0.35
  const pulse = clamp((crest + aftershock * 0.42) * rhythmEnergy, 0, 1.45)
  const pinch = clamp((crest * 0.72 + input.neck * 0.22 + input.feed * 0.12) * rhythmEnergy, 0, 1.35)

  return {
    phase,
    pulse,
    suctionBoost: clamp(pulse * 0.52 + rhythmEnergy * 0.18, 0, 1.1),
    massTransfer: clamp(pulse * 0.64 + input.feed * 0.24 + input.pressure * 0.16, 0, 1.3),
    neckPinch: pinch,
    recoil: clamp((aftershock * 0.5 + crest * 0.22) * rhythmEnergy, 0, 0.9),
    bagPulse: clamp(pulse * 0.7 + rhythmEnergy * 0.18, 0, 1.35),
    bodyThump: clamp(pulse * 0.5 + input.pressure * 0.12, 0, 1.1),
  }
}

export function computeGlugMassTransferEvent(input: GlugMassTransferEventInput) {
  const tuning = PRODUCTION_TUNING.glug
  const visible = clamp(input.visibleMass, 0, 1.2)
  const availableMass = clamp(input.mass * visible, 0, 2.4)
  const effectiveAvailableMass = Math.max(
    availableMass,
    input.mass > 0.001 && visible > 0.001 ? PRODUCTION_TUNING.suction.tinySlimeGlugMassGateFloor : 0,
  )
  const sealLoad = Math.max(input.sealQuality, input.latchSeal * PRODUCTION_TUNING.suction.sealStrengthBase)
  const sealGate = smooth01((sealLoad - 0.24) / 0.84) * smooth01((input.latchAge - 0.08) / 0.28)
  const feedLoad = clamp(input.feed * 0.38 + input.pressure * 0.28 + input.basePulse * 0.3 + input.baseMassTransfer * 0.2, 0, 1.7)
  const bridgeLoad = clamp(input.bridgeActive * 0.32 + input.bridgeThickness * 1.36, 0, 1.38)
  const weakSeal = smooth01((0.72 - sealLoad) / 0.72)
  const tensionLoad = clamp(input.tetherStrain * 0.56 + input.swingTension * 0.36, 0, 1.8)
  const strainedSeal = smooth01((tensionLoad - 0.68) / 0.74)
  const massGate = smooth01((effectiveAvailableMass - tuning.slimeNearEmptyThreshold * 0.42) / Math.max(0.001, tuning.slimeNearEmptyThreshold * 2.4))
  const jitter = Math.sin(input.time * 1.7 + input.seed * 5.13) * tuning.gulpTimingJitter
  const interval = clamp(
    tuning.gulpPulseRate
      + jitter
      + weakSeal * 0.058
      + strainedSeal * 0.036
      - sealGate * 0.045
      - feedLoad * 0.018,
    tuning.gulpPulseRateMin,
    tuning.gulpPulseRateMax,
  )
  const buildup = smooth01(input.lastGlugAge / Math.max(0.001, interval))
  const canAttempt = !input.detached
    && input.cooldownRemaining <= 0
    && input.lastGlugAge >= interval
    && sealGate > 0.08
    && massGate > 0.04
  const penalty = clamp(1 - weakSeal * tuning.weakSealGulpPenalty - strainedSeal * tuning.strainedSealGulpPenalty, 0.12, 1)
  const quality = clamp(
    sealGate
      * (0.28 + feedLoad * 0.46 + bridgeLoad * 0.24 + buildup * 0.22)
      * penalty
      * (0.42 + massGate * 0.58),
    0,
    1.62,
  )
  const successful = canAttempt && quality > 0.18
  const failedStrength = canAttempt && !successful
    ? clamp((0.18 + weakSeal * 0.42 + strainedSeal * 0.34) * (0.42 + feedLoad * 0.36 + bridgeLoad * 0.16), 0, 0.95)
    : 0
  const strength = successful
    ? clamp(quality * (0.78 + input.basePulse * 0.2 + input.baseMassTransfer * 0.14), 0, 1.75)
    : 0
  const nearEmpty = smooth01((tuning.slimeNearEmptyThreshold * 1.2 - effectiveAvailableMass) / Math.max(0.001, tuning.slimeNearEmptyThreshold * 1.2))
  const mass = successful
    ? clamp(
      tuning.gulpMassPerPulse
        * (0.48 + strength * 1.02 + sealGate * tuning.gulpStrengthBySeal * 0.28)
        * (1 - strainedSeal * 0.18)
        * Math.max(0.18, visible)
        * (nearEmpty > 0.02 ? 0.58 + nearEmpty * 0.42 : 1),
      0,
      Math.min(availableMass, tuning.gulpMassPerPulse * 4.2),
    )
    : 0
  const bridgeStrain = clamp(input.bridgeActive * (tensionLoad * 0.52 + strainedSeal * 0.38 + weakSeal * 0.18), 0, 1.35)
  const bridgeNarrowing = clamp(strength * tuning.gulpBridgeNarrowAmount * (0.9 + bridgeStrain * 0.28) + failedStrength * 0.12, 0, 0.86)

  return {
    ready: canAttempt,
    successful,
    strength,
    failedStrength,
    interval,
    buildup,
    mass,
    bagMass: mass * tuning.bagFillPerMass,
    bridgeNarrowing,
    bridgeSurge: clamp(strength * tuning.gulpBridgeSurgeSpeed + failedStrength * 0.18, 0, 1.45),
    bridgeRecovery: tuning.gulpBridgeRecoverySpeed,
    bridgeStrain,
    mouthPulse: strength * tuning.mouthPulseScale,
    hoseTug: clamp(strength * tuning.hoseGlugTugStrength * (0.76 + sealGate * 0.26), 0, 1.04),
    bodyBump: clamp(strength * tuning.bodyGlugBumpStrength * (0.76 + input.pressure * 0.26), 0, 0.34),
    slimeRecoil: clamp(strength * 0.32 + failedStrength * 0.36 + bridgeStrain * 0.14, 0, 1.1),
    bagPulse: clamp(strength * PRODUCTION_TUNING.bag.bagPulseStrength + mass * 4.2, 0, 1.6),
    weakSeal,
    strainedSeal,
    nearEmpty,
  }
}

export function computeBagRewardResponse(input: BagRewardInput) {
  const tuning = PRODUCTION_TUNING.bag
  const incoming = clamp(input.incomingMass, 0, 2.4)
  const seal = clamp(input.sealStrength ?? 0.74, 0, 1.65)
  const sealQuality = smooth01((seal - 0.14) / 1.02)
  const tension = clamp(input.tension ?? 0, 0, 1.8)
  const tensionPressure = smooth01((tension - 0.48) / 0.9)
  const glugLoad = clamp(input.glugPulse * 0.36 + input.glugMassFlow * 0.32 + input.swallowPulse * 0.44, 0, 1.5)
  const collectedMass = clamp(
    input.collectedMass + incoming * tuning.bagFillPerMass * (0.78 + glugLoad * 0.32 + sealQuality * 0.16),
    0,
    tuning.bagFillAmountMax,
  )
  const fillNormalized = clamp(collectedMass / tuning.bagFillAmountMax, 0, 1)
  const visualFill = clamp(1 - Math.exp(-collectedMass * 0.58), 0, 1)
  const fillTarget = clamp(
    Math.max(input.currentFill * 0.995, tuning.bagBaseScale + visualFill * (tuning.bagMaxScale - tuning.bagBaseScale)),
    tuning.bagBaseScale,
    tuning.bagMaxScale,
  )
  const fullness = smooth01(visualFill)
  const nearFull = smooth01((visualFill - tuning.bagFullThreshold) / Math.max(0.001, 1 - tuning.bagFullThreshold))
  const freshMass = smooth01((incoming * tuning.bagReactionByGlugMass + glugLoad * 0.44 + sealQuality * 0.16) / 0.52)
  const reactionStrength = clamp(
    freshMass * (1.12 + fullness * 0.58 + sealQuality * tuning.bagReactionBySealStrength * 0.36)
      + glugLoad * 0.62
      + input.swallowPulse * 0.54
      + nearFull * freshMass * 0.42,
    0,
    3.15,
  )
  const pressure = clamp(
    input.currentPressure * 0.16
      + fullness * tuning.bagPressureByFill
      + freshMass * (1.08 + nearFull * 0.68)
      + glugLoad * 0.24
      + Math.max(0, fillTarget - 1.02) * 2.1,
    0,
    2.65,
  )
  const pulse = clamp(
    freshMass * tuning.bagPulseStrength * (1.18 + fullness * 0.68)
      + input.glugPulse * 0.72
      + input.swallowPulse * 0.86
      + nearFull * freshMass * 0.62,
    0,
    3.25,
  )
  const wobble = clamp((pressure * 0.46 + pulse * 0.54 + nearFull * 0.38) * tuning.bagWobbleStrength, 0, 2.35)
  const beauty = clamp(
    Math.max(input.currentBeauty * 0.8, fullness * 1.06)
      + freshMass * 0.44
      + nearFull * 0.28
      + input.swallowPulse * 0.22,
    0,
    1.9,
  )
  const fullPulse = clamp(
    nearFull * (freshMass * 0.92 + input.swallowPulse * 0.58 + input.glugPulse * 0.36) * tuning.bagFullPulseStrength,
    0,
    2.05,
  )
  const chroma = clamp(beauty * tuning.bagColourIntensityByFill + pulse * 0.16 + pressure * 0.14, 0, 2.25)
  const nonUniformBulge = clamp(
    (fullness * 0.48 + pressure * 0.66 + reactionStrength * 0.48 + tensionPressure * 0.1) * tuning.bagNonUniformBulgeStrength,
    0,
    1.52,
  )
  const glow = clamp(fullness * tuning.bagGlowByFill + beauty * 0.46 + nearFull * 0.28 + pulse * 0.14, 0, 2.15)
  const internalMotion = clamp(
    fullness * tuning.bagInternalMotionSpeed + glugLoad * 0.42 + pressure * 0.16 + reactionStrength * 0.18,
    0,
    2.35,
  )
  const scaleX = clamp(1 + visualFill * 0.19 + nonUniformBulge * 0.32 + pulse * 0.044, 1, tuning.bagMaxSize)
  const scaleY = clamp(1 + visualFill * 0.34 + pressure * 0.11 + pulse * 0.096 - tensionPressure * 0.008, 1, tuning.bagMaxSize * 1.04)
  const scaleZ = clamp(1 + visualFill * 0.16 + nonUniformBulge * 0.18 + wobble * 0.026, 1, tuning.bagMaxSize)

  return {
    collectedMass,
    fillNormalized,
    fillTarget,
    fullness,
    visualFill,
    nearFull,
    lastMassReceived: incoming,
    reactionStrength,
    pressure,
    pulse,
    wobble,
    beauty,
    fullPulse,
    chroma,
    nonUniformBulge,
    glow,
    internalMotion,
    scaleX,
    scaleY,
    scaleZ,
  }
}

export function computeFullSlurpPayoff(input: FullSlurpPayoffInput) {
  const depletion = smooth01((0.44 - input.visibleMass) / 0.36)
  const mouthClose = smooth01((0.74 - input.distanceToMouth) / 0.62)
  const ageGate = smooth01((input.latchAge - 0.22) / 0.58)
  const feedCommit = smooth01(
    (input.intakeFeed * 0.52
      + input.contactFeed * 0.32
      + input.slurp * 0.34
      + input.glugMassFlow * 0.18
      - 0.42) / 0.72,
  )
  const strandLoad = clamp(
    input.neck * 0.46
      + input.rope * 0.34
      + input.glugPulse * 0.24
      + input.glugMassFlow * 0.18,
    0,
    1.65,
  )
  const nearEmpty = clamp(
    depletion
      * (0.52 + feedCommit * 0.56)
      * (0.72 + mouthClose * 0.24)
      * (0.64 + ageGate * 0.36),
    0,
    1.25,
  )
  const finalStrand = clamp(
    nearEmpty
      * (0.28 + strandLoad * 0.52 + input.slurp * 0.18 + mouthClose * 0.12),
    0,
    1.35,
  )
  const finalGlugGate = smooth01((nearEmpty + finalStrand + feedCommit + mouthClose - 1.45) / 1.18)
  const finalGlug = clamp(
    finalGlugGate * (0.72 + input.glugPulse * 0.22 + input.glugMassFlow * 0.24),
    0,
    1.35,
  )
  const cleanup = clamp(nearEmpty * 0.42 + finalGlug * 0.44 + input.fragmentAbsorb * 0.12, 0, 1.15)
  const recoil = clamp(finalStrand * 0.25 + finalGlug * 0.5 + input.glugPulse * nearEmpty * 0.16, 0, 1.3)
  const fullBag = smooth01((input.bagFill - 0.72) / 0.5)
  const bagReward = clamp(finalGlug * 0.72 + finalStrand * 0.26 + nearEmpty * 0.18 + fullBag * finalGlug * 0.18, 0, 1.55)
  const chainReady = clamp(finalGlug * 0.46 + cleanup * 0.34 + mouthClose * nearEmpty * 0.12, 0, 1.15)
  const finalMassBonus = clamp((0.24 + input.mass * 0.16) * (0.6 + finalGlug * 0.5) + nearEmpty * 0.14, 0, 0.76)
  const residueCollapse = clamp(cleanup * 0.56 + finalGlug * 0.28, 0, 1.2)

  return {
    nearEmpty,
    finalStrand,
    finalGlug,
    cleanup,
    recoil,
    bagReward,
    chainReady,
    finalMassBonus,
    residueCollapse,
  }
}

export function computeCartoonActionAnimation(input: CartoonActionAnimationInput) {
  const suction = clamp(input.suction, 0, 1.65)
  const stretchLoad = clamp(input.stretch * 0.86 + input.contraction * 0.26 + suction * 0.4, 0, 1.9)
  const glugLoad = clamp(input.glugPulse * 0.88 + input.glugMassFlow * 0.48 + input.bagPulse * 0.14, 0, 2)
  const slideLoad = clamp(input.slide * 0.62 + stretchLoad * 0.12 + suction * 0.08, 0, 1.35)
  const snapLoad = clamp(input.snap * 0.96 + input.recoil * 0.48, 0, 1.82)
  const fillPressure = clamp(input.bagFill * 0.46 + input.bagPressure * 0.62 + input.bagPulse * 0.28, 0, 1.88)
  const fullState = smooth01((input.bagFill - 0.78) / 0.44)
  const completionLoad = clamp(input.completion * 0.9 + fullState * input.completion * 0.32 + input.bagPulse * 0.12, 0, 1.6)

  return {
    anticipation: clamp(smooth01((stretchLoad + suction * 0.46 + slideLoad * 0.18 - 0.08) / 1.12), 0, 1.28),
    stretchSquash: clamp(stretchLoad * 0.72 + input.contraction * 0.2 + snapLoad * 0.16, 0, 1.62),
    slurpPull: clamp(suction * 0.62 + glugLoad * 0.32 + stretchLoad * 0.18, 0, 1.62),
    glugThump: clamp(glugLoad * (0.76 + smooth01((suction - 0.12) / 0.9) * 0.24), 0, 1.72),
    slideSmear: clamp(slideLoad, 0, 1.25),
    snapPop: clamp(snapLoad, 0, 1.62),
    recoilWobble: clamp(input.recoil * 0.68 + snapLoad * 0.32 + input.contraction * 0.2 + completionLoad * 0.14, 0, 1.62),
    bagOvershoot: clamp(fillPressure * 0.42 + input.bagPulse * 0.48 + glugLoad * 0.22 + fullState * 0.22, 0, 1.72),
    completionFlourish: clamp(completionLoad, 0, 1.45),
    mouthTug: clamp(suction * 0.42 + glugLoad * 0.52 + snapLoad * 0.14, 0, 1.62),
    bodyJolt: clamp(glugLoad * 0.26 + snapLoad * 0.24 + input.recoil * 0.16 + completionLoad * 0.16, 0, 1.18),
    strandPinch: clamp(glugLoad * 0.48 + stretchLoad * 0.28 + snapLoad * 0.22 + suction * 0.16, 0, 1.68),
    settleDamping: clamp(0.35 + input.contraction * 0.22 + input.bagPressure * 0.12 + snapLoad * 0.1, 0.35, 0.9),
  }
}

export function computeOrganicSuctionGrip(input: OrganicSuctionGripInput) {
  const alignment = clamp(
    input.ahead * 0.7
      + input.influence * 0.34
      + input.latchSeal * 0.42
      + input.mouthSettle * 0.22,
    0,
    1.55,
  )
  const nearField = smooth01((0.96 - input.distance) / 0.96) * alignment
  const massDrag = clamp(
    input.mass * input.visibleMass * 0.08
      + input.floorStick * (1 - input.suctionYield) * 0.16,
    0,
    0.38,
  )
  const magneticPull = clamp(
    nearField * (0.42 + input.adhesion * 0.28 + input.suctionYield * 0.18)
      + input.controllerGrip * 0.12
      + input.mouthSettle * 0.16
      - massDrag * 0.12,
    0,
    1.35,
  )
  const rimGrip = clamp(
    input.adhesion * 0.5
      + input.dimple * 0.16
      + input.funnel * 0.1
      + input.latchSeal * 0.42
      + input.mouthSettle * 0.14
      - massDrag * 0.1,
    0,
    1.45,
  )
  const stuckHold = smooth01(
    rimGrip * 0.48
      + input.neck * 0.18
      + input.flow * 0.12
      + input.latchSeal * 0.22
      + input.controllerGrip * 0.08
      - input.intakeFeed * 0.16,
  )
  const slurpPressure = clamp(
    input.flow * 0.34
      + input.neck * 0.24
      + input.suctionYield * 0.2
      + stuckHold * 0.22
      + input.slurp * 0.12
      + input.mouthSettle * 0.08
      - massDrag * 0.16,
    0,
    1.4,
  )
  const rimDrag = clamp(
    stuckHold * (0.22 + input.visibleMass * 0.24)
      + rimGrip * 0.14
      + input.floorStick * magneticPull * 0.08,
    0,
    0.74,
  )
  const slurpLock = smooth01(
    stuckHold * 0.42
      + slurpPressure * 0.36
      + input.mouthSettle * 0.18
      + Math.min(1, input.speed) * 0.02,
  )

  return {
    magneticPull,
    rimGrip,
    stuckHold,
    slurpPressure,
    rimDrag,
    slurpLock,
  }
}

export function computeVisibleHoseSlurp(input: VisibleHoseSlurpInput) {
  const feed = smooth01(
    input.massFeed * 1.05
      + input.intakeFlow * 0.58
      + input.slurpPressure * 0.34
      + input.contactNeck * 0.28
      + input.gulpFlow * 0.42
      - 0.05,
  )
  const grip = smooth01(
    input.magneticPull * 0.28
      + input.organicHold * 0.28
      + input.mouthSettle * 0.22
      + input.contactNeck * 0.18,
  )
  const flow = clamp(feed * (0.72 + grip * 0.38) + input.gulpFlow * 0.32, 0, 1.6)
  const bolus = clamp(
    input.massFeed * 0.72
      + input.gulpFlow * 0.48
      + input.slurpPressure * 0.22
      + grip * 0.16,
    0,
    1.7,
  )
  const tubeBulge = clamp(flow * 0.42 + bolus * 0.28 + grip * 0.12, 0, 1.3)
  const mouthThread = clamp(
    input.intakeFlow * 0.45
      + input.massFeed * 0.32
      + input.slurpPressure * 0.22
      + input.gulpFlow * 0.28,
    0,
    1.45,
  )

  return {
    flow,
    bolus,
    tubeBulge,
    mouthThread,
  }
}

export function computePremiumSlimeMaterial(input: PremiumSlimeMaterialInput) {
  const activePull = smooth01(
    input.suctionStrain * 0.34
      + input.tendril * 0.24
      + input.intakeFlow * 0.38
      + input.intakeFeed * 0.2
      + input.speed * 0.08,
  )
  const cohesiveBody = smooth01(
    input.mergeHeat * 0.28
      + input.surfaceTension * 0.36
      + input.poolPressure * 0.22
      + input.settled * 0.16
      + input.floorStick * 0.08,
  )
  const elasticMemory = smooth01(
    input.stretchMemory * 0.34
      + input.contraction * 0.34
      + input.surfaceTension * 0.18
      + input.reemergeCharge * 0.12,
  )
  const waxDepth = clamp(
    input.compression * 0.28
      + input.poolPressure * 0.3
      + input.visibleMass * 0.1
      + cohesiveBody * 0.22
      + input.floorStick * 0.08
      - input.intakeFlow * 0.08,
    0,
    1.35,
  )
  const chromaWake = clamp(
    activePull * 0.48
      + elasticMemory * 0.22
      + cohesiveBody * 0.18
      + input.reemergeCharge * 0.2,
    0,
    1.45,
  )
  const seamAssimilation = clamp(
    cohesiveBody * 0.72
      + input.mergeHeat * 0.16
      + input.compression * 0.08,
    0,
    1.3,
  )
  const strandTension = smooth01(
    input.tendril * 0.28
      + input.intakeFlow * 0.34
      + input.intakeFeed * 0.18
      + input.suctionStrain * 0.22
      + input.stretchMemory * 0.14
      - input.poolPressure * 0.08,
  )
  const returnBloom = clamp(
    input.reemergeCharge * 0.56
      + input.contraction * 0.14
      + seamAssimilation * 0.08
      + chromaWake * 0.12,
    0,
    1.2,
  )

  return {
    chromaWake,
    waxDepth,
    elasticMemory,
    seamAssimilation,
    strandTension,
    returnBloom,
  }
}

export function computeElasticTether(input: ElasticTetherInput) {
  const hook = clamp(input.hookStrength, 0, 1.25)
  const restBase = PRODUCTION_TUNING.hose.hoseRestLength
  const maxStretch = PRODUCTION_TUNING.hose.hoseMaxStretch
  const minLength = input.pointerDown ? restBase * 0.53 : restBase * 0.68
  const maxLength = input.pointerDown ? maxStretch : maxStretch * 0.76
  const pointerLength = clamp(input.pointerDistance, minLength, maxLength)
  const idleLength = input.active ? restBase : restBase * 0.87
  const desiredRestLength = hook > 0.05 ? pointerLength : idleLength
  const restLambda = input.pointerDown ? 8.5 : input.active ? 5.2 : 3.8
  const easedRestLength = input.currentRestLength + (desiredRestLength - input.currentRestLength) * (1 - Math.exp(-restLambda * input.dt))
  const restLength = clamp(easedRestLength, minLength, maxLength)
  const stretch = input.distance - restLength
  const strain = smooth01((stretch + restBase * 0.1) / (maxStretch - restBase + 0.22)) * hook
  const slack = smooth01((restLength - input.distance) / 0.68) * hook
  const suctionReadiness = smooth01((0.92 - input.distance) / 0.58) * hook

  return {
    restLength,
    stretch,
    strain,
    slack,
    suctionReadiness,
    driveAuthority: clamp(1 - hook * 0.58 + suctionReadiness * 0.16, 0.34, 1),
  }
}

export function computeAnchoredControllerResponse(input: AnchoredControllerInput) {
  const hook = clamp(input.hookStrength, 0, 1.25)
  const strain = clamp(input.tetherStrain, 0, 1.6)
  const swing = clamp(input.swingTension, 0, 1.8)
  const readiness = clamp(input.suctionReadiness, 0, 1)
  const distance = clamp(input.distanceToHook, 0, 3.2)
  const speed = clamp(input.bodySpeed, 0, 8)
  const plantedGrip = smooth01(hook * 0.42 + strain * 0.24 + readiness * 0.24 + (input.pointerDown ? 0.08 : 0))
  const mouthSettle = smooth01(readiness * 0.58 + hook * 0.16 + strain * 0.12 - distance * 0.05)
  const swingSlide = smooth01(swing * 0.34 + hook * 0.22 + speed * 0.035 + (input.pointerDown ? 0.08 : 0))

  return {
    plantedGrip,
    mouthSettle,
    swingSlide,
    bodyDriveScale: clamp(1 - plantedGrip * 0.24 - strain * 0.08 + mouthSettle * 0.16, 0.52, 1.08),
    tetherPullScale: clamp(0.82 + plantedGrip * 0.22 + strain * 0.32 + readiness * 0.24, 0.72, 1.7),
    hoseSlideScale: clamp(0.82 + swingSlide * 0.38 + plantedGrip * 0.16, 0.76, 1.42),
    releaseMomentum: clamp(input.release * 0.42 + swing * 0.08 + speed * 0.025, 0, 0.86),
  }
}

export function computeSwingFlowResponse(input: SwingFlowInput) {
  const hook = clamp(input.hookStrength, 0, 1.25)
  const strain = clamp(input.tetherStrain, 0, 1.6)
  const swing = clamp(input.swingTension, 0, 1.9)
  const speed = clamp(input.bodySpeed, 0, 8)
  const release = clamp(input.releaseMomentum, 0, 1.2)
  const distance = clamp(input.distanceToHook, 0, 3.3)
  const rest = clamp(input.restLength, 0.58, 2.55)
  const pointer = clamp(input.pointerDistance, 0, 2.8)
  const stretchLoad = smooth01((distance - rest + 0.12) / 1.05) * hook
  const orbitIntent = smooth01(
    hook * 0.28
      + strain * 0.22
      + swing * 0.2
      + smooth01((speed - 0.42) / 3.1) * 0.22
      + smooth01((pointer - 0.24) / 1.45) * (input.pointerDown ? 0.14 : 0.07),
  )
  const winchIntent = smooth01(
    (rest - distance + 0.18) / 0.74
      + input.suctionReadiness * 0.28
      + (input.pointerDown ? 0.16 : 0),
  ) * hook
  const mouthAssist = smooth01(input.suctionReadiness * 0.52 + hook * 0.18 + winchIntent * 0.22 - distance * 0.045)
  const reattachGrace = clamp(release * 0.52 + smooth01((speed - 0.55) / 3.6) * 0.2 + (input.active ? 0.08 : 0) + (input.pointerDown ? 0.12 : 0), 0, 0.9)

  return {
    orbitIntent,
    winchIntent,
    mouthAssist,
    reattachGrace,
    tetherPullBoost: clamp(0.88 + stretchLoad * 0.48 + winchIntent * 0.34 + mouthAssist * 0.18, 0.76, 1.88),
    tangentCarry: clamp(0.9 + orbitIntent * 0.48 + smooth01((speed - 0.65) / 3.8) * 0.16, 0.84, 1.58),
    slideFreedom: clamp(0.78 + orbitIntent * 0.36 + reattachGrace * 0.18 + mouthAssist * 0.12, 0.72, 1.48),
    dampingRelief: clamp(orbitIntent * 0.72 + release * 0.5 + stretchLoad * 0.22, 0, 1.45),
    anchorLoad: clamp(hook * 0.36 + strain * 0.28 + swing * 0.2 + winchIntent * 0.16, 0, 1.55),
  }
}

export function computeSuctionPivotSwing(input: SuctionPivotSwingInput) {
  const tuning = PRODUCTION_TUNING.pivot
  const hook = clamp(input.hookStrength, 0, 1.35)
  const seal = clamp(Math.max(input.sealStrength, input.sealQuality), 0, 1.45)
  const embedN = clamp(input.embedDepth / Math.max(0.001, PRODUCTION_TUNING.embed.embedDepthMax), 0, 1)
  const embedLock = clamp(input.embedLockStrength, 0, 1.5)
  const distance = Math.max(0.001, input.distanceToPivot)
  const restLength = clamp(input.restLength, tuning.hoseRestLength * 0.52, tuning.hoseMaxStretch)
  const speed = clamp(input.bodySpeed, 0, 9)
  const tangentSpeedAbs = Math.abs(input.tangentialSpeed)
  const radialOut = clamp(input.radialOutSpeed, 0, 8)
  const pointerIntent = clamp(Math.abs(input.pointerTangentialIntent), 0, 3.6)
  const sealGate = smooth01((seal - 0.24) / 0.74)
  const embedGate = smooth01(embedN * 1.35 + embedLock * 0.32)
  const lockGate = clamp(hook * (0.34 + sealGate * 0.38 + embedGate * 0.28), 0, 1.28)
  const locked = lockGate > 0.28 && distance > restLength * 0.34
  const rawStretchRatio = Math.max(0, distance / Math.max(0.001, restLength) - 0.72)
  const stretchRatio = clamp(rawStretchRatio * tuning.hosePhysicsStretchMultiplier * hook, 0, 3.05)
  const angularVelocity = input.tangentialSpeed / distance
  const swingLoad = smooth01(tangentSpeedAbs / 3.2) * 0.28
    + smooth01(pointerIntent / 1.8) * (input.pointerDown || input.active ? 0.22 : 0.08)
    + smooth01(radialOut / 2.1) * 0.24
  const lockStrength = clamp(
    lockGate
      * tuning.pivotLockStrength
      * (0.56 + sealGate * 0.2 + embedGate * 0.18 + swingLoad * 0.12)
      * (1 + embedLock * 0.12),
    0,
    2.55,
  )
  const hoseTension = clamp(
    (stretchRatio * 0.72
      + input.tetherStrain * 0.58
      + input.swingTension * 0.38
      + smooth01(radialOut / 2.4) * 0.3
      + embedN * 0.2)
      * (0.64 + lockStrength * 0.32),
    0,
    3.15,
  )
  const snapThreshold = clamp(
    tuning.snapTensionThreshold
      + lockStrength * 0.18
      + embedN * 0.12
      - (1 - sealGate) * tuning.snapAnglePenalty,
    0.58,
    1.58,
  )
  const snapReadiness = clamp(
    smooth01((hoseTension - snapThreshold * 0.68) / Math.max(0.001, snapThreshold * 0.58))
      + smooth01((speed - tuning.snapVelocityThreshold) / 2.4) * stretchRatio * 0.26,
    0,
    1.5,
  )
  const radialPull = locked
    ? lockStrength * tuning.pivotRadialPullStrength * (0.3 + hoseTension * 0.5 + stretchRatio * 0.22)
    : 0
  const tangentialBoost = locked
    ? lockStrength * tuning.pivotSwingAssistStrength * (0.2 + swingLoad * 0.58 + snapReadiness * 0.16)
    : 0
  const tangentialPreserve = locked
    ? clamp(1 + (tuning.pivotTangentialPreserve - 1) * (0.34 + lockStrength * 0.22 + stretchRatio * 0.18), 1, 1.72)
    : 1
  const hoseVisualStretch = clamp(
    (stretchRatio * 0.82 + hoseTension * 0.34 + embedN * 0.22 + snapReadiness * 0.2)
      * tuning.hoseVisualStretchMultiplier,
    0,
    4.2,
  )
  const dampingRelief = locked
    ? clamp(lockStrength * 0.42 + hoseTension * 0.28 + snapReadiness * 0.24, 0, 1.65)
    : 0
  const reattachGrace = clamp(
    input.reattachGrace
      + input.releaseMomentum * 0.22
      + snapReadiness * 0.18
      + smooth01(speed / 4.2) * 0.12,
    0,
    1.4,
  )

  return {
    locked,
    lockStrength,
    radialPull,
    tangentialBoost,
    tangentialPreserve,
    angularVelocity,
    tangentialSpeed: input.tangentialSpeed,
    radialDistance: distance,
    stretchRatio,
    hoseTension,
    snapThreshold,
    snapReadiness,
    snapFlingScale: clamp(1 + snapReadiness * (tuning.snapFlingImpulseScale - 1), 1, tuning.snapFlingImpulseScale + 0.35),
    dampingRelief,
    reattachGrace,
    hoseVisualStretch,
    hoseThinning: clamp((hoseTension + snapReadiness * 0.62) * tuning.hoseThinningByTension, 0, 0.54),
    hoseWobble: clamp((hoseTension * 0.58 + snapReadiness * 0.54 + embedN * 0.22) * tuning.hoseWobbleByTension, 0, 1.85),
    warning: hoseTension > tuning.hoseOverstretchWarningThreshold ? 1 : 0,
  }
}

export function computeRightClickGripSwing(input: RightClickGripSwingInput) {
  const tuning = PRODUCTION_TUNING.grip
  if (!input.active) {
    return {
      active: false,
      spinSpeed: 0,
      releaseWindowWidth: tuning.gripReleaseWindowBase,
      releasePhaseDistance: Math.PI,
      phaseQuality: 0,
      releaseReadiness: 0,
      releaseQuality: 0,
      releaseCue: 0,
      missPressure: 0,
      goodRelease: false,
      perfectRelease: false,
      dizzy: 0,
      spinoutReady: false,
      radialPull: 0,
      tangentialForce: 0,
      massTransferMultiplier: 1,
      glugStrengthMultiplier: 1,
      releaseImpulse: 0,
    }
  }

  const hold = Math.max(0, input.holdTime)
  const misses = Math.max(0, input.missedWindows)
  const seal = clamp(input.sealStrength, 0, 1.6)
  const tension = clamp(input.tension, 0, 2.6)
  const bodySpeed = clamp(input.bodySpeed, 0, 9)
  const stretchRatio = clamp(input.distanceToGrip / Math.max(0.001, input.restLength) - 0.82, 0, 2.4)
  const lockSettleSeconds = Math.max(0.1, tuning.gripLockSettleSeconds)
  const postSettleHold = Math.max(0, hold - lockSettleSeconds * 0.35)
  const spinTarget = clamp(
    tuning.gripSpinStartSpeed
      + postSettleHold * tuning.gripSpinAcceleration
      + misses * tuning.gripSpinMissBoost
      + tension * 0.26
      + bodySpeed * 0.04,
    tuning.gripSpinStartSpeed,
    tuning.gripSpinMaxSpeed,
  )
  const spinBlend = 1 - Math.exp(-(4.6 + misses * 0.55) * Math.max(0, input.dt))
  const spinSpeed = input.currentSpinSpeed + (spinTarget - input.currentSpinSpeed) * spinBlend
  const releaseWindowWidth = clamp(
    tuning.gripReleaseWindowBase
      - hold * tuning.gripReleaseWindowShrinkRate
      - misses * tuning.gripReleaseWindowMin * 0.38,
    tuning.gripReleaseWindowMin,
    tuning.gripReleaseWindowBase,
  )
  const releasePhaseDistance = Math.abs(Math.atan2(Math.sin(input.spinAngle), Math.cos(input.spinAngle)))
  const phaseQuality = clamp(1 - releasePhaseDistance / Math.max(0.001, releaseWindowWidth), 0, 1)
  const releaseReadiness = smooth01(
    (hold - tuning.gripReleaseWarmupSeconds) / Math.max(0.001, tuning.gripReleaseWarmupFade),
  )
  const releaseQuality = phaseQuality * releaseReadiness
  const releaseCueLead = Math.min(tuning.gripReleaseCueLeadQuality, tuning.gripReleaseQualityThreshold - 0.001)
  const releaseCue = clamp(
    smooth01((phaseQuality - releaseCueLead) / Math.max(0.001, tuning.gripReleaseQualityThreshold - releaseCueLead))
      * releaseReadiness
      * tuning.gripReleaseCueStrength,
    0,
    1,
  )
  const missPressure = clamp(
    hold / Math.max(0.001, tuning.gripMaxHoldTime) * 0.52
      + spinSpeed / Math.max(0.001, tuning.gripSpinMaxSpeed) * 0.18
      + misses * 0.22
      + (releaseReadiness > 0.05 && phaseQuality < releaseCueLead ? 0.08 : 0),
    0,
    1.2,
  )
  const goodRelease = releaseQuality >= tuning.gripGoodReleaseThreshold
  const perfectRelease = releaseQuality >= tuning.gripPerfectReleaseThreshold
  const dizzy = clamp(
    hold / Math.max(0.001, tuning.gripMaxHoldTime)
      + spinSpeed / Math.max(0.001, tuning.gripSpinMaxSpeed) * 0.18
      + misses * 0.1,
    0,
    1.35,
  )
  const entryPull = 1 - smooth01(hold / lockSettleSeconds)
  const spinRamp = smooth01((hold - lockSettleSeconds * 0.42) / (lockSettleSeconds + 0.28))
  const lockLoad = clamp(0.52 + seal * 0.24 + tension * 0.12 + stretchRatio * 0.14 + entryPull * 0.18, 0.36, 1.25)
  const massBoost = tuning.gripMassTransferMultiplier - 1
  const glugBoost = tuning.gripGlugStrengthMultiplier - 1

  return {
    active: true,
    spinSpeed,
    releaseWindowWidth,
    releasePhaseDistance,
    phaseQuality,
    releaseReadiness,
    releaseQuality,
    releaseCue,
    missPressure,
    goodRelease,
    perfectRelease,
    dizzy,
    spinoutReady: dizzy >= tuning.gripDizzySpinoutThreshold,
    radialPull: tuning.gripRadialPullStrength * lockLoad * (0.74 + stretchRatio * 0.08 + entryPull * 0.42),
    tangentialForce: tuning.gripTangentialForce
      * (tuning.gripTangentialIntentFloor + spinRamp * 0.42 + spinSpeed / Math.max(0.001, tuning.gripSpinMaxSpeed) * 0.2),
    massTransferMultiplier: 1 + massBoost * (0.58 + releaseQuality * 0.42),
    glugStrengthMultiplier: 1 + glugBoost * (0.62 + seal * 0.2 + releaseQuality * 0.18),
    releaseImpulse: tuning.gripReleaseImpulseScale
      * (0.52 + releaseQuality * 0.62 + spinSpeed / Math.max(0.001, tuning.gripSpinMaxSpeed) * 0.28 + stretchRatio * 0.14)
      * (perfectRelease ? tuning.gripPerfectImpulseMultiplier : 1),
  }
}

export function computeSlimeGrabReadiness(input: SlimeGrabInput) {
  const release = clamp(input.releaseMomentum ?? 0, 0, 1.2)
  const speed = clamp(input.bodySpeed ?? 0, 0, 7)
  const reach = (input.pointerDown ? 1.2 : input.active ? 0.98 : 0.64)
    + release * 0.38
    + smooth01((speed - 0.5) / 3.2) * 0.2
  const distanceGate = smooth01((reach - input.distance) / reach)
  const facingGate = clamp(input.ahead * 0.78 + input.suctionInfluence * 0.32 + input.hookStrength * 0.16 + release * 0.12, 0, 1)
  return distanceGate * facingGate
}

export function computeSuctionCandidateScore(input: SuctionCandidateScoreInput) {
  const seekRadius = Math.max(
    PRODUCTION_TUNING.suction.suctionSeekRadius,
    PRODUCTION_TUNING.pivot.reattachSearchRadius * (0.72 + clamp(input.reattachGrace, 0, 1) * 0.28),
  )
  const attachmentRadius = PRODUCTION_TUNING.suction.attachmentRadius
  const distanceGate = smooth01((seekRadius - input.distance) / seekRadius)
  const latchGate = smooth01((attachmentRadius * 1.28 - input.distance) / (attachmentRadius * 1.28))
  const travel = clamp(input.travelAlignment, 0, 1)
  const swingArc = clamp(input.swingArc, 0, 1)
  const reattach = clamp(input.reattachGrace, 0, 1)
  const speed = clamp(input.bodySpeed, 0, 7)
  const tinySlimeEase = smooth01((0.18 - input.visibleMass) / 0.18)
  const massPreference = clamp(
    0.58
      + input.visibleMass * PRODUCTION_TUNING.suction.substantialMassPreference
      + smooth01((input.visibleMass - 0.18) / 0.62) * 0.24
      + tinySlimeEase * PRODUCTION_TUNING.suction.tinySlimeCandidateBonus,
    PRODUCTION_TUNING.suction.tinySlimeCandidateFloor,
    1.18,
  )
  const alignment = clamp(
    input.ahead * 0.44
      + input.influence * 0.2
      + travel * PRODUCTION_TUNING.suction.directionAlignmentWeight
      + swingArc * 0.16
      + reattach * 0.12
      + (input.currentAnchor ? 0.32 : 0),
    0,
    1.42,
  )
  const flybyForgiveness = smooth01((speed - 0.42) / 3.2) * (0.08 + reattach * 0.12)
  const floorDragPenalty = input.floorStick * (1 - input.influence) * 0.08

  return clamp(
    (distanceGate * 0.42
      + latchGate * 0.34
      + alignment * 0.38
      + reattach * (PRODUCTION_TUNING.suction.reattachTargetBias + PRODUCTION_TUNING.pivot.reattachDirectionBias * 0.42)
      + flybyForgiveness
      - floorDragPenalty)
      * massPreference,
    0,
    1.75,
  )
}

export function computeEasySuctionAssist(input: EasySuctionAssistInput) {
  const intent = input.pointerDown || input.active
  const speed = clamp(input.bodySpeed, 0, 7)
  const visible = clamp(input.visibleMass, 0, 1.2)
  const physicalContact = clamp(
    Math.max(
      input.physicalContact ?? smooth01(
        (PRODUCTION_TUNING.suction.physicalContactDistance - input.distance)
          / Math.max(0.001, PRODUCTION_TUNING.suction.physicalContactDistance),
      ),
      input.latchSeal,
    ),
    0,
    1,
  )
  const floorRelease = clamp(1 - input.floorStick * 0.44 + input.suctionYield * 0.34, 0.55, 1.18)
	  const brushReach = (intent ? 2.72 : 1.92)
	    + clamp(input.reattachGrace, 0, 1) * 0.4
	    + smooth01((speed - 0.45) / 3.8) * 0.3
	  const proximity = smooth01((brushReach - input.distance) / brushReach)
  const lockProximity = smooth01(
    (PRODUCTION_TUNING.suction.tactileLockRadius + 0.5 - input.distance)
      / Math.max(0.001, PRODUCTION_TUNING.suction.tactileLockRadius + 0.5),
  )
	  const facing = clamp(0.46 + input.ahead * 0.5 + input.influence * 0.26 + proximity * 0.1, 0, 1.34)
  const surfaceSignal = clamp(
    input.grabReadiness * 0.34
      + input.adhesion * 0.22
      + input.magneticPull * 0.28
      + input.contactReadiness * 0.2
      + input.reattachGrace * 0.12
      + input.latchSeal * 0.32,
    0,
    1.25,
	  )
	  const brush = clamp(
	    proximity * facing * floorRelease * (0.76 + visible * 0.2)
	      + surfaceSignal * 0.34
	      + input.latchSeal * 0.42,
	    0,
	    1.35,
	  )
	  const latchIntent = smooth01((brush - 0.045) / 0.24)
  const autoLatchCloseness = 0.52 + lockProximity * 0.48 + input.latchSeal * 0.12 + input.reattachGrace * 0.14
	  const rawAutoLatch = latchIntent * (0.58 + (intent ? 0.38 : 0.16) + input.reattachGrace * 0.32 + visible * 0.1) * autoLatchCloseness
	  const autoLatch = clamp(rawAutoLatch * physicalContact, 0, 1.28)
	  const pullBoost = clamp((brush * 0.78 + rawAutoLatch * 0.46 + proximity * Math.max(input.ahead, 0.1) * 0.25) * physicalContact, 0, 1.28)
	  const feedBoost = clamp((rawAutoLatch * 0.5 + proximity * Math.max(input.ahead, 0.2) * (0.26 + lockProximity * 0.18) + input.latchSeal * 0.2) * physicalContact, 0, 1.1)

  return {
    brush,
    autoLatch,
    pullBoost,
    feedBoost,
    sealBoost: clamp((rawAutoLatch * 0.34 + brush * 0.22) * physicalContact, 0, 0.9),
    aimEase: clamp(proximity * (0.48 + autoLatch * 0.38), 0, 1.22),
    growthWake: clamp(proximity * 0.52 + autoLatch * 0.5 + feedBoost * 0.22, 0, 1.18),
  }
}

export function computePileSurfaceSuctionAssist(input: PileSurfaceSuctionAssistInput) {
  const brushReach = Math.max(0.001, PRODUCTION_TUNING.suction.pileSurfaceBrushReach)
  const lockReach = Math.max(0.001, PRODUCTION_TUNING.suction.pileSurfaceLockReach)
  const brushProximity = smooth01((brushReach - input.surfaceDistance) / brushReach)
  const lockProximity = smooth01((lockReach - input.surfaceDistance) / lockReach)
  const physicalContact = clamp(
    Math.max(
      input.physicalContact ?? smooth01(
        (PRODUCTION_TUNING.suction.physicalContactDistance - input.surfaceDistance)
          / Math.max(0.001, PRODUCTION_TUNING.suction.physicalContactDistance),
      ),
      input.latchSeal,
    ),
    0,
    1,
  )
  const visible = clamp(input.visibleMass, 0, 1.35)
  const facing = clamp(
    0.46
      + input.ahead * 0.42
      + input.influence * 0.24
      + (input.active ? 0.22 : 0)
      + input.latchSeal * 0.28,
    0,
    1.22,
  )
  const brush = clamp(
    brushProximity * facing * (0.88 + visible * 0.24)
      * PRODUCTION_TUNING.suction.pileSurfaceAssistStrength,
    0,
    1.18,
  )
  const lock = clamp(
    lockProximity * (0.58 + input.ahead * 0.32 + input.influence * 0.22 + brush * 0.68 + input.latchSeal * 0.22) * physicalContact,
    0,
    1.08,
  )

  return {
    brush,
    lock,
    pullBoost: clamp((brush * 0.94 + lock * 0.68) * physicalContact, 0, 1.22),
    feedBoost: clamp((lock * PRODUCTION_TUNING.suction.pileSurfaceFeedBoost + brush * 0.18) * physicalContact, 0, 0.92),
    sealBoost: clamp(
      (lock * PRODUCTION_TUNING.suction.pileSurfaceSealStrength + brush * 0.22) * physicalContact,
      0,
      1.02,
    ),
  }
}

export function computePhysicalPileContactGate(input: PhysicalPileContactGateInput) {
  const tuning = PRODUCTION_TUNING.suction
  const surfaceGate = smooth01(
    (tuning.pileSurfaceContactGraceDistance - input.surfaceDistance)
      / Math.max(0.001, tuning.pileSurfaceContactGraceDistance),
  )
  const localPatchRadius = Math.max(0.001, input.patchRadius * 0.72)
  const patchGate = smooth01((localPatchRadius - input.patchDistance) / localPatchRadius)
  const verticalGate = smooth01(
    (tuning.pileSurfaceVerticalContactDistance - input.verticalDistance)
      / Math.max(0.001, tuning.pileSurfaceVerticalContactDistance),
  )

  return clamp(
    Math.max(input.existingContact ?? 0, surfaceGate * patchGate * verticalGate),
    0,
    1,
  )
}

export function computeLooseFragmentIntake(input: LooseFragmentIntakeInput) {
  const tuning = PRODUCTION_TUNING.suction
  const activeGate = input.latched ? 0 : 1
  const distance = Math.max(0.001, input.distance)
  const visible = clamp(input.visibleMass, 0, 1.2)
  const proximity = smooth01((tuning.looseFragmentFlowRadius - distance) / Math.max(0.001, tuning.looseFragmentFlowRadius))
  const swallowProximity = smooth01(
    (tuning.looseFragmentSwallowRadius - distance)
      / Math.max(0.001, tuning.looseFragmentSwallowRadius),
  )
  const tinyAssist = clamp(
    1
      + smooth01((0.34 - visible) / 0.34) * 0.52
      + smooth01((0.3 - input.mass) / 0.3) * 0.34
      + smooth01((0.095 - input.size) / 0.095) * 0.22,
    1,
    1.86,
  )
  const fragmentEase = clamp(
    0.54
      + smooth01((0.16 - input.size) / 0.16) * 0.28
      + smooth01((0.86 - visible) / 0.86) * 0.2
      + clamp(1 - input.mass, 0, 0.28),
    0.46,
    1.18,
  )
  const mouthAuthority = clamp(
    0.24
      + input.ahead * 0.5
      + input.brush * 0.22
      + input.contactReadiness * 0.16
      + input.physicalContact * 0.16
      + input.suctionYield * 0.08,
    0,
    1.24,
  )
  const floorRelease = clamp(1 - input.floorStick * 0.16 + input.suctionYield * 0.16, 0.62, 1.16)
  const flow = clamp(
    proximity * mouthAuthority * fragmentEase * floorRelease * tinyAssist * activeGate,
    0,
    1.42,
  )
  const feed = clamp(
    (flow * tuning.looseFragmentFeedStrength + swallowProximity * mouthAuthority * 0.62) * activeGate,
    0,
    1.42,
  )
  const pull = clamp(
    flow * tuning.looseFragmentFlowStrength * (0.74 + swallowProximity * 0.58) * tinyAssist,
    0,
    tuning.looseFragmentFlowStrength * 1.68,
  )
  const massDrain = clamp(
    (feed * 0.62 + swallowProximity * 0.34)
      * tuning.looseFragmentMassDrain
      * (0.78 + fragmentEase * 0.22),
    0,
    0.985,
  )
  const hoverDamping = clamp(
    tuning.looseFragmentHoverDamping * (0.34 + flow * 0.66 + swallowProximity * 0.18),
    0,
    tuning.looseFragmentHoverDamping * 1.18,
  )
  const bridge = clamp(flow * (0.24 + swallowProximity * 0.38), 0, 0.82)
  const swallowReady = activeGate > 0
    && feed > 0.18
    && (
      swallowProximity > 0.38
        || (visible < 0.36 && proximity > 0.42)
        || (visible < 0.18 && proximity > 0.3)
    )

  return {
    active: flow > 0.025,
    flow,
    pull,
    feed,
    massDrain,
    hoverDamping,
    bridge,
    swallowProximity,
    swallowReady,
  }
}

export function computeVisibleSlimeVacuumability(input: VisibleSlimeVacuumabilityInput): VisibleSlimeVacuumabilityResult {
  const tuning = PRODUCTION_TUNING.suction
  const visibleMass = Math.max(0, input.visibleMass)
  const mass = Math.max(0, input.mass)
  const size = Math.max(0, input.size ?? 1)
  const effectiveMass = visibleMass * mass
  const visible = !input.levelCleared
    && input.popProgress > 0.01
    && visibleMass > tuning.slimeVacuumableVisibleThreshold
  const smallFloorPiece = visible
    && !input.latched
    && size > 0
    && size <= tuning.slimeSmallPieceSizeThreshold
  const fragment = visible && !input.latched && (visibleMass < 0.64 || mass < 0.52 || smallFloorPiece)
  const residue = visible && !input.latched && (
    visibleMass <= Math.max(tuning.tinySlimeVisibleMassFloor * 1.35, 0.074)
      || effectiveMass <= tuning.slimeResidueAutoCleanMass * 5.5
  )
  const gameplay = visible && !residue
  const surfaceDistance = Math.max(
    0.001,
    Math.min(input.distanceToMouth, input.surfaceDistanceToMouth ?? input.distanceToMouth),
  )
  const smallAssist = (fragment || residue)
    ? clamp(
      1
        + smooth01((0.32 - visibleMass) / 0.32) * 0.46
        + smooth01((0.28 - mass) / 0.28) * 0.34
        + (smallFloorPiece ? 0.42 : 0),
      1,
      2.12,
    )
    : 1
  const pickupRadius = (fragment || residue)
    ? Math.max(
      tuning.slimeResidueMouthPopRadius,
      tuning.visibleSlimeSurfacePickupRadius * (residue ? 1.12 : smallFloorPiece ? 1.08 : 1),
    )
    : tuning.slimeResidueMouthPopRadius
  const closePickupRadius = Math.max(0.001, tuning.visibleSlimeContactPickupRadius)
  const contactPickup = visible && !input.latched && surfaceDistance <= closePickupRadius
  const distance = surfaceDistance
  const proximity = smooth01(
    (pickupRadius - distance)
      / Math.max(0.001, pickupRadius),
  )
  const closePop = smooth01(
    (closePickupRadius - distance)
      / closePickupRadius,
  )
  const passiveSmallPickup = visible
    && !input.latched
    && (fragment || residue)
    && proximity > (smallFloorPiece ? 0.035 : 0.08)
  const suctionGate = (input.suctionActive || contactPickup || passiveSmallPickup) && !input.latched ? 1 : 0
  const mouthPopReady = visible
    && suctionGate > 0
    && (fragment || residue || proximity > 0.74)
    && proximity > (fragment || residue ? 0.06 : 0.12)
  const feed = clamp(
    (proximity * tuning.slimeResidueMouthPopFeed * smallAssist + closePop * 0.42 + (residue ? 0.18 : 0)) * suctionGate,
    0,
    1.42,
  )
  const mouthPull = clamp(
    proximity
      * tuning.slimeResidueMouthPopPull
      * (0.62 + feed * 0.62)
      * (residue ? 1.34 : fragment ? 1.08 : 0.78)
      * smallAssist
      * suctionGate,
    0,
    tuning.slimeResidueMouthPopPull * 1.92,
  )
  const massDrain = clamp(
    (feed * 0.72 + closePop * 0.42) * (residue ? 1.26 : fragment ? 1.08 : 0.82),
    0,
    0.99,
  )
  const autoCleanup = !input.latched
    && !input.levelCleared
    && visibleMass > 0
    && visibleMass <= tuning.slimeResidueAutoCleanVisibleMass
    && effectiveMass <= tuning.slimeResidueAutoCleanMass
  const stranded = residue
    && input.stuckAge >= tuning.slimeResidueStuckSeconds
    && proximity > 0.08
    && !mouthPopReady
  const swallowReady = mouthPopReady && (
    closePop > 0.26
      || (residue && proximity > 0.36)
      || (fragment && proximity > (smallFloorPiece ? 0.34 : 0.5) && massDrain > (smallFloorPiece ? 0.3 : 0.42))
      || massDrain > 0.68
  )

  return {
    visible,
    gameplay,
    fragment,
    residue,
    stranded,
    autoCleanup,
    mouthPopReady,
    swallowReady,
    mouthPull,
    feed,
    massDrain,
    effectiveMass,
  }
}

export function computeSlurpReadiness(distance: number, latchSeal: number, suctionYield: number, swingTension: number) {
  const proximity = smooth01((0.82 - distance) / 0.54)
  return clamp(
    proximity * (0.54 + suctionYield * 0.36)
      + latchSeal * 0.08
      + Math.min(1, swingTension) * 0.08,
    0,
    1,
  )
}
