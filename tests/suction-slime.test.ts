import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { SLURPER_PARAMS } from '../src/core/parameters'
import { PRODUCTION_TUNING } from '../src/core/productionTuning'
import { computeSuctionForce } from '../src/systems/suction/SuctionField'
import { isMouthGulpEligible, stepSlimePiece } from '../src/systems/slime/slimeMachine'
import { SlimeState, type RespawnSite, type SlimePiece } from '../src/systems/slime/slimeTypes'
import {
  computeContractionTarget,
  computeAnchoredControllerResponse,
  computeBagRewardResponse,
  computeCartoonActionAnimation,
  computeDeepSuctionEmbed,
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
} from '../src/experiment/slimePhysics'

const respawnSites: RespawnSite[] = [
  { id: 0, position: new THREE.Vector3(-2, 0.1, -1), radius: 1.1, mode: 'spout' },
  { id: 1, position: new THREE.Vector3(2, 0.1, 1), radius: 1.2, mode: 'grate' },
]

function piece(overrides: Partial<SlimePiece> = {}): SlimePiece {
  const position = overrides.position?.clone() ?? new THREE.Vector3(1.3, 0.24, 0)
  return {
    id: 12,
    patchId: 0,
    state: SlimeState.Captured,
    position,
    previousPosition: position.clone(),
    homePosition: position.clone(),
    velocity: new THREE.Vector3(),
    radius: 0.18,
    vitality: 0.7,
    phase: 0.25,
    paletteIndex: 1,
    personalitySwirl: 0.5,
    suctionInfluence: 0,
    capturedAt: 0,
    gulpScheduledAt: 0,
    respawnAt: 0,
    stretch: 0,
    strandWidth: 1,
    residueLife: 0,
    reemergeSite: 0,
    ...overrides,
  }
}

describe('computeSuctionForce', () => {
  it('points inward toward the mouth and keeps tangential force bounded', () => {
    const position = new THREE.Vector3(1.2, 0, 0)
    const mouth = new THREE.Vector3(0, 0, 0)
    const result = computeSuctionForce(position, new THREE.Vector3(), mouth, 1)
    const toMouth = mouth.clone().sub(position).normalize()

    expect(result.distance).toBeCloseTo(1.2)
    expect(result.inward.clone().normalize().dot(toMouth)).toBeGreaterThan(0.999)
    expect(result.tangent.length() / result.inward.length()).toBeLessThanOrEqual(SLURPER_PARAMS.slime.maxTangentialRatio + 1e-6)
    expect(result.total.dot(toMouth)).toBeGreaterThan(0)
  })

  it('uses damping against current velocity deterministically', () => {
    const result = computeSuctionForce(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(2, 0, 0),
      new THREE.Vector3(0, 0, 0),
      0,
    )

    expect(result.damping.x).toBeCloseTo(-1.8)
    expect(result.tangent.length()).toBeCloseTo(0)
  })
})

describe('mouth-only gulp eligibility', () => {
  it('allows only captured/stretching/stringing slime inside the mouth threshold', () => {
    const mouth = new THREE.Vector3(50, 0.24, 50)
    expect(isMouthGulpEligible(piece({ state: SlimeState.Captured, position: mouth.clone() }), mouth)).toBe(true)
    expect(isMouthGulpEligible(piece({ state: SlimeState.Stretching, position: mouth.clone() }), mouth)).toBe(true)
    expect(isMouthGulpEligible(piece({ state: SlimeState.Stringing, position: mouth.clone() }), mouth)).toBe(true)
    expect(isMouthGulpEligible(piece({ state: SlimeState.Idle, position: mouth.clone() }), mouth)).toBe(false)
    expect(isMouthGulpEligible(piece({ state: SlimeState.Residue, position: mouth.clone() }), mouth)).toBe(false)
    expect(isMouthGulpEligible(piece({ state: SlimeState.Captured, position: new THREE.Vector3(0.7, 0.24, 0) }), mouth)).toBe(false)
  })
})

describe('stepSlimePiece', () => {
  it('moves affected slime closer to the mouth in a deterministic step', () => {
    const mouth = new THREE.Vector3(0, 0.24, 0)
    const slime = piece({ position: new THREE.Vector3(1.25, 0.24, 0), state: SlimeState.Captured })
    const before = slime.position.distanceTo(mouth)

    const result = stepSlimePiece(slime, { time: 0.2, dt: 1 / 60, mouth, suctionScale: 1, respawnSites })

    expect(result.gulped).toBe(false)
    expect(slime.position.distanceTo(mouth)).toBeLessThan(before)
    expect(slime.suctionInfluence).toBeGreaterThan(0)
  })

  it('does not gulp slime that is outside the mouth threshold', () => {
    const mouth = new THREE.Vector3(0, 0.24, 0)
    const slime = piece({ position: new THREE.Vector3(0.8, 0.24, 0), state: SlimeState.Stringing, stretch: 1 })

    const result = stepSlimePiece(slime, { time: 0.4, dt: 1 / 60, mouth, suctionScale: 1, respawnSites })

    expect(result.gulped).toBe(false)
    expect(slime.position.distanceTo(mouth)).toBeGreaterThan(SLURPER_PARAMS.slime.mouthThreshold)
  })

  it('gulps only after mouth contact and schedules reemergence', () => {
    const mouth = new THREE.Vector3(0, 0.24, 0)
    const slime = piece({ position: new THREE.Vector3(0.05, 0.24, 0), state: SlimeState.Stringing, stretch: 1 })

    const result = stepSlimePiece(slime, { time: 1, dt: 1 / 60, mouth, suctionScale: 1, respawnSites })

    expect(result.gulped).toBe(true)
    expect([SlimeState.Gulped, SlimeState.Residue]).toContain(slime.state)
    expect(slime.gulpScheduledAt).toBe(1)
    expect(slime.respawnAt).toBeGreaterThan(1)
  })

  it('reemerges gulped slime from a respawn site instead of permanently removing it', () => {
    const mouth = new THREE.Vector3(0, 0.24, 0)
    const slime = piece({ state: SlimeState.Gulped, position: new THREE.Vector3(999, 999, 999), respawnAt: 2 })

    const first = stepSlimePiece(slime, { time: 2.1, dt: 1 / 60, mouth, suctionScale: 0.4, respawnSites })
    expect(first.gulped).toBe(false)
    expect(slime.state).toBe(SlimeState.Reemerging)

    let reemerged = false
    for (let i = 0; i < 90; i += 1) {
      const result = stepSlimePiece(slime, { time: 2.1 + i / 60, dt: 1 / 60, mouth, suctionScale: 0.4, respawnSites })
      reemerged = reemerged || result.reemerged
      if (reemerged) break
    }

    expect(reemerged).toBe(true)
    expect(slime.state).toBe(SlimeState.Idle)
    expect(slime.position.distanceTo(slime.homePosition)).toBeLessThan(0.001)
  })
})

describe('experimental jelly-wax slime physics helpers', () => {
  it('builds elastic tether strain while allowing pointer-controlled winch length', () => {
    const extended = computeElasticTether({
      distance: 1.75,
      currentRestLength: 1.1,
      pointerDistance: 1.8,
      pointerDown: true,
      active: true,
      hookStrength: 1,
      dt: 1 / 30,
    })
    const contracted = computeElasticTether({
      distance: 0.48,
      currentRestLength: extended.restLength,
      pointerDistance: 0.32,
      pointerDown: true,
      active: true,
      hookStrength: 1,
      dt: 1 / 30,
    })

    expect(extended.restLength).toBeGreaterThan(PRODUCTION_TUNING.hose.hoseRestLength * 1.75)
    expect(extended.restLength).toBeLessThanOrEqual(PRODUCTION_TUNING.hose.hoseMaxStretch)
    expect(extended.strain).toBeGreaterThan(0.15)
    expect(contracted.restLength).toBeLessThan(extended.restLength)
    expect(contracted.suctionReadiness).toBeGreaterThan(extended.suctionReadiness)
  })

  it('requires nearby forward slime before a hose grip becomes ready', () => {
    const ready = computeSlimeGrabReadiness({
      distance: 0.42,
      ahead: 0.92,
      suctionInfluence: 0.74,
      pointerDown: true,
      active: true,
      hookStrength: 0.35,
    })
    const farSide = computeSlimeGrabReadiness({
      distance: 1.4,
      ahead: 0.12,
      suctionInfluence: 0.1,
      pointerDown: false,
      active: false,
      hookStrength: 0,
    })

    expect(ready).toBeGreaterThan(0.45)
    expect(farSide).toBeLessThan(0.02)
  })

  it('scores attachment candidates by distance, travel direction, mass, and reattach grace', () => {
    const chainTarget = computeSuctionCandidateScore({
      distance: 0.62,
      ahead: 0.86,
      influence: 0.58,
      visibleMass: 0.92,
      floorStick: 0.38,
      bodySpeed: 3.1,
      travelAlignment: 0.88,
      swingArc: 0.74,
      reattachGrace: 0.64,
    })
    const strayResidue = computeSuctionCandidateScore({
      distance: 1.9,
      ahead: 0.08,
      influence: 0.06,
      visibleMass: 0.08,
      floorStick: 1,
      bodySpeed: 3.1,
      travelAlignment: 0,
      swingArc: 0.12,
      reattachGrace: 0,
    })
    const retainedAnchor = computeSuctionCandidateScore({
      distance: 0.78,
      ahead: 0.64,
      influence: 0.42,
      visibleMass: 0.72,
      floorStick: 0.44,
      bodySpeed: 1.8,
      travelAlignment: 0.42,
      swingArc: 0.5,
      reattachGrace: 0.1,
      currentAnchor: true,
    })

    expect(chainTarget).toBeGreaterThan(0.95)
    expect(chainTarget).toBeGreaterThan(strayResidue + 0.75)
    expect(retainedAnchor).toBeGreaterThan(0.65)
  })

  it('keeps tiny visible slime residue eligible for mouth-local suction', () => {
    const tinyAtMouth = computeSuctionCandidateScore({
      distance: 0.24,
      ahead: 0.82,
      influence: 0.52,
      visibleMass: 0.035,
      floorStick: 0.72,
      bodySpeed: 1.6,
      travelAlignment: 0.52,
      swingArc: 0.22,
      reattachGrace: 0,
    })
    const tinyOffAxis = computeSuctionCandidateScore({
      distance: 1.7,
      ahead: 0.04,
      influence: 0.04,
      visibleMass: 0.035,
      floorStick: 0.92,
      bodySpeed: 1.6,
      travelAlignment: 0.04,
      swingArc: 0.02,
      reattachGrace: 0,
    })

    expect(tinyAtMouth).toBeGreaterThan(0.7)
    expect(tinyAtMouth).toBeGreaterThan(tinyOffAxis + 0.5)
  })

  it('gates slurp strength behind mouth proximity, yield, and tether tension', () => {
    const far = computeSlurpReadiness(1.55, 0.75, 0.75, 0.4)
    const close = computeSlurpReadiness(0.38, 0.75, 0.75, 0.9)

    expect(far).toBeLessThan(0.12)
    expect(close).toBeGreaterThan(0.85)
  })

  it('requires suction load to overcome floor stick before yielding', () => {
    const resisting = computeJellyWaxYield(0.3, 1, 0.5, 0.5)
    const yielding = computeJellyWaxYield(1.05, 1, 0.5, 0.5)

    expect(resisting).toBeLessThan(0.05)
    expect(yielding).toBeGreaterThan(0.85)
  })

  it('stretches from anchor drag and then contracts when the stretch target drops', () => {
    const stretched = computeJellyWaxStretchTarget({
      anchorDistance: 0.62,
      speed: 0.9,
      suctionLoad: 1.1,
      suctionYield: 0.92,
      latchSeal: 0.8,
      slurp: 0.4,
      merge: 0.2,
      mergeTarget: 0.35,
    })
    const relaxed = computeJellyWaxStretchTarget({
      anchorDistance: 0.08,
      speed: 0.05,
      suctionLoad: 0.08,
      suctionYield: 0,
      latchSeal: 0,
      slurp: 0,
      merge: 0.1,
      mergeTarget: 0.1,
    })

    expect(stretched).toBeGreaterThan(1.3)
    expect(relaxed).toBeLessThan(0.2)
    expect(computeContractionTarget(stretched, relaxed)).toBeGreaterThan(1)
  })

  it('absorbs only smaller sticky fragments near a larger blob', () => {
    const closeSmall = computeFragmentAbsorption({
      smallSize: 0.04,
      largeSize: 0.11,
      distance: 0.1,
      desiredDistance: 0.22,
      merge: 0.9,
      coagulate: 0.7,
    })
    const equalSized = computeFragmentAbsorption({
      smallSize: 0.09,
      largeSize: 0.1,
      distance: 0.1,
      desiredDistance: 0.22,
      merge: 0.9,
      coagulate: 0.7,
    })

    expect(closeSmall).toBeGreaterThan(0.45)
    expect(equalSized).toBe(0)
  })

  it('turns close merging blobs into cohesive compressed wax seams', () => {
    const cohesive = computeMergeCohesion({
      distance: 0.12,
      desiredDistance: 0.22,
      mergeStrength: 0.82,
      relativeAlong: -0.4,
      relativeSpeed: 0.7,
      floorStick: 0.85,
      samePile: true,
    })
    const loose = computeMergeCohesion({
      distance: 0.38,
      desiredDistance: 0.22,
      mergeStrength: 0.18,
      relativeAlong: 0.05,
      relativeSpeed: 0.05,
      floorStick: 0.25,
      samePile: false,
    })

    expect(cohesive.compression).toBeGreaterThan(loose.compression)
    expect(cohesive.heat).toBeGreaterThan(0.35)
    expect(cohesive.surfaceTension).toBeGreaterThan(loose.surfaceTension)
  })

  it('settles merged visible mass into broader lower pooled wax', () => {
    const pooled = computePoolingSettle({
      mass: 1.2,
      visibleMass: 1,
      merge: 0.85,
      coagulate: 0.7,
      compression: 0.6,
      settled: 0.8,
      absorb: 0.3,
    })
    const loose = computePoolingSettle({
      mass: 0.7,
      visibleMass: 0.45,
      merge: 0.05,
      coagulate: 0.1,
      compression: 0,
      settled: 0.1,
      absorb: 0,
    })

    expect(pooled.pressure).toBeGreaterThan(loose.pressure)
    expect(pooled.spread).toBeGreaterThan(1.18)
    expect(pooled.height).toBeLessThan(loose.height)
  })

  it('turns close suction into directional strain and tendril thinning after yield', () => {
    const pulling = computeSuctionDeformation({
      distance: 0.42,
      ahead: 0.9,
      influence: 0.82,
      suctionLoad: 1.1,
      suctionYield: 0.78,
      latchSeal: 0.7,
      stretchMemory: 0.8,
      speed: 0.7,
      tetherStrain: 0.35,
    })
    const far = computeSuctionDeformation({
      distance: 1.8,
      ahead: 0.1,
      influence: 0.12,
      suctionLoad: 0.2,
      suctionYield: 0,
      latchSeal: 0,
      stretchMemory: 0.05,
      speed: 0.05,
      tetherStrain: 0,
    })

    expect(pulling.strain).toBeGreaterThan(0.55)
    expect(pulling.tendril).toBeGreaterThan(0.3)
    expect(pulling.thinning).toBeGreaterThan(far.thinning)
    expect(far.strain).toBeLessThan(0.05)
  })

  it('builds mouth-local adhesion, dimple, funnel, and neck only near the intake', () => {
    const contact = computeIntakeContact({
      distance: 0.34,
      ahead: 0.94,
      influence: 0.86,
      suctionLoad: 1.18,
      suctionYield: 0.82,
      latchSeal: 0.74,
      slurp: 0.52,
      mass: 1.05,
      visibleMass: 0.82,
      floorStick: 0.46,
      speed: 0.68,
      tetherStrain: 0.42,
    })
    const far = computeIntakeContact({
      distance: 1.65,
      ahead: 0.1,
      influence: 0.08,
      suctionLoad: 0.16,
      suctionYield: 0,
      latchSeal: 0,
      slurp: 0,
      mass: 1.2,
      visibleMass: 1,
      floorStick: 1,
      speed: 0.04,
      tetherStrain: 0,
    })

    expect(contact.adhesion).toBeGreaterThan(0.7)
    expect(contact.dimple).toBeGreaterThan(0.45)
    expect(contact.funnel).toBeGreaterThan(0.55)
    expect(contact.neck).toBeGreaterThan(0.45)
    expect(contact.surfacePull).toBeGreaterThan(0.4)
    expect(contact.compression).toBeGreaterThan(0.45)
    expect(contact.sealRing).toBeGreaterThan(0.35)
    expect(contact.flow).toBeGreaterThan(far.flow)
    expect(far.adhesion).toBeLessThan(0.02)
    expect(far.compression).toBe(0)
  })

  it('starts surface pull before hard mouth compression', () => {
    const preContact = computeIntakeContact({
      distance: 1.08,
      ahead: 0.9,
      influence: 0.72,
      suctionLoad: 0.82,
      suctionYield: 0.56,
      latchSeal: 0,
      slurp: 0.08,
      mass: 1.05,
      visibleMass: 0.96,
      floorStick: 0.58,
      speed: 0.32,
      tetherStrain: 0.06,
    })
    const bite = computeIntakeContact({
      distance: 0.42,
      ahead: 0.9,
      influence: 0.72,
      suctionLoad: 0.82,
      suctionYield: 0.56,
      latchSeal: 0.2,
      slurp: 0.18,
      mass: 1.05,
      visibleMass: 0.96,
      floorStick: 0.58,
      speed: 0.32,
      tetherStrain: 0.06,
    })

    expect(preContact.surfacePull).toBeGreaterThan(0.1)
    expect(preContact.compression).toBeLessThan(bite.compression)
    expect(preContact.sealRing).toBeLessThan(bite.sealRing)
    expect(bite.compression).toBeGreaterThan(0.3)
    expect(bite.sealRing).toBeGreaterThan(0.2)
  })

  it('feeds small yielded slime into the intake faster than resistant heavy slime', () => {
    const feeding = computeIntakeMassTransfer({
      adhesion: 0.92,
      neck: 0.82,
      flow: 0.88,
      slurp: 0.78,
      suctionYield: 0.86,
      latchSeal: 0.74,
      visibleMass: 0.22,
      mass: 0.82,
      floorStick: 0.2,
      size: 0.06,
    })
    const resisting = computeIntakeMassTransfer({
      adhesion: 0.24,
      neck: 0.08,
      flow: 0.12,
      slurp: 0.12,
      suctionYield: 0.1,
      latchSeal: 0.18,
      visibleMass: 1,
      mass: 1.22,
      floorStick: 0.95,
      size: 0.12,
    })

    expect(feeding.feedRate).toBeGreaterThan(resisting.feedRate + 0.45)
    expect(feeding.visibleMassTarget).toBeLessThan(0.65)
    expect(feeding.swallowReady).toBe(true)
    expect(resisting.swallowReady).toBe(false)
  })

  it('lets near-empty slime continue draining instead of stalling above a visible nub', () => {
    const tinyResidue = computeIntakeMassTransfer({
      adhesion: 0.88,
      neck: 0.78,
      flow: 0.84,
      slurp: 0.66,
      suctionYield: 0.92,
      latchSeal: 0.7,
      visibleMass: 0.045,
      mass: 0.08,
      floorStick: 0.18,
      size: 0.035,
    })

    expect(tinyResidue.feedRate).toBeGreaterThan(0.8)
    expect(tinyResidue.visibleMassTarget).toBeLessThan(0.14)
    expect(tinyResidue.swallowReady).toBe(true)
  })

  it('separates mouth contact into readiness, seal, dent, rope, feed, and snap stages', () => {
    const firstTouch = computeMouthContactSequence({
      distance: 0.52,
      ahead: 0.92,
      adhesion: 0.62,
      dimple: 0.38,
      funnel: 0.24,
      neck: 0.08,
      flow: 0.06,
      intakeFeed: 0.02,
      slurpPressure: 0.14,
      organicHold: 0.18,
      rimGrip: 0.48,
      suctionYield: 0.16,
      latchSeal: 0.1,
      slurp: 0.08,
      visibleMass: 1,
      mass: 1.18,
      floorStick: 0.82,
      speed: 0.22,
    })
    const feeding = computeMouthContactSequence({
      distance: 0.22,
      ahead: 0.98,
      adhesion: 0.95,
      dimple: 0.86,
      funnel: 0.9,
      neck: 0.78,
      flow: 0.88,
      intakeFeed: 0.72,
      slurpPressure: 0.84,
      organicHold: 0.74,
      rimGrip: 0.86,
      suctionYield: 0.88,
      latchSeal: 0.9,
      slurp: 0.82,
      visibleMass: 0.28,
      mass: 0.82,
      floorStick: 0.18,
      speed: 0.72,
    })
    const far = computeMouthContactSequence({
      distance: 1.7,
      ahead: 0.14,
      adhesion: 0.01,
      dimple: 0,
      funnel: 0,
      neck: 0,
      flow: 0,
      intakeFeed: 0,
      slurpPressure: 0,
      organicHold: 0,
      rimGrip: 0,
      suctionYield: 0,
      latchSeal: 0,
      slurp: 0,
      visibleMass: 1,
      mass: 1.2,
      floorStick: 1,
      speed: 0.04,
    })

    expect(firstTouch.readiness).toBeGreaterThan(0.28)
    expect(firstTouch.lipSeal).toBeGreaterThan(0.32)
    expect(firstTouch.contactCompression).toBeGreaterThan(0.25)
    expect(firstTouch.sealRing).toBeGreaterThan(0.25)
    expect(firstTouch.floatingRisk).toBeLessThan(0.45)
    expect(firstTouch.resistance).toBeGreaterThan(feeding.resistance)
    expect(firstTouch.feed).toBeLessThan(feeding.feed)
    expect(firstTouch.rope).toBeLessThan(feeding.rope)
    expect(feeding.dent).toBeGreaterThan(0.62)
    expect(feeding.contactCompression).toBeGreaterThan(firstTouch.contactCompression)
    expect(feeding.sealRing).toBeGreaterThan(firstTouch.sealRing)
    expect(feeding.tongue).toBeGreaterThan(0.72)
    expect(feeding.rope).toBeGreaterThan(0.65)
    expect(feeding.feed).toBeGreaterThan(0.78)
    expect(feeding.snap).toBeGreaterThan(0.25)
    expect(far.readiness).toBeLessThan(0.04)
    expect(far.floatingRisk).toBeGreaterThan(0.9)
    expect(far.feed).toBe(0)
  })

  it('stages hose-slime feedback as near, touch, seal, stretch, gulp, strain, then pop', () => {
    const baseReadInput = {
      prePull: 0.42,
      surfacePull: 0.38,
      contactCompression: 0.02,
      sealRing: 0,
      sealStrength: 0,
      hookStrength: 0,
      bridge: 0.04,
      contactFeed: 0,
      glugPulse: 0,
      massFeed: 0,
      tension: 0,
      tetherStrain: 0,
      contactSnap: 0,
      release: 0,
      popJuice: 0,
      embedDepth: 0,
    }
    const near = computeHoseSlimeInteractionRead(baseReadInput)
    const touch = computeHoseSlimeInteractionRead({
      ...baseReadInput,
      contactCompression: 0.34,
      sealRing: 0.08,
    })
    const seal = computeHoseSlimeInteractionRead({
      ...baseReadInput,
      contactCompression: 0.34,
      sealRing: 0.52,
      sealStrength: 0.74,
      hookStrength: 0.42,
    })
    const stretch = computeHoseSlimeInteractionRead({
      ...baseReadInput,
      contactCompression: 0.34,
      sealRing: 0.52,
      sealStrength: 0.74,
      hookStrength: 0.42,
      tension: 0.46,
      tetherStrain: 0.38,
    })
    const gulp = computeHoseSlimeInteractionRead({
      ...baseReadInput,
      contactCompression: 0.34,
      sealRing: 0.52,
      sealStrength: 0.74,
      hookStrength: 0.42,
      tension: 0.46,
      tetherStrain: 0.38,
      glugPulse: 0.48,
      massFeed: 0.36,
      contactFeed: 0.32,
    })
    const strain = computeHoseSlimeInteractionRead({
      ...baseReadInput,
      contactCompression: 0.34,
      sealRing: 0.52,
      sealStrength: 0.74,
      hookStrength: 0.42,
      glugPulse: 0.48,
      massFeed: 0.36,
      contactFeed: 0.32,
      tension: 1.08,
      tetherStrain: 0.92,
      contactSnap: 0.26,
    })
    const pop = computeHoseSlimeInteractionRead({
      ...baseReadInput,
      contactCompression: 0.34,
      sealRing: 0.52,
      sealStrength: 0.74,
      hookStrength: 0.42,
      glugPulse: 0.48,
      massFeed: 0.36,
      contactFeed: 0.32,
      tension: 1.08,
      tetherStrain: 0.92,
      contactSnap: 0.26,
      release: 0.44,
      popJuice: 0.64,
    })

    expect(near.phase).toBe('near')
    expect(touch.phase).toBe('touch')
    expect(seal.phase).toBe('seal')
    expect(stretch.phase).toBe('stretch')
    expect(gulp.phase).toBe('gulp')
    expect(strain.phase).toBe('strain')
    expect(pop.phase).toBe('pop')
    expect(gulp.materialFlow).toBeGreaterThan(seal.materialFlow)
    expect(strain.contactFocus).toBeGreaterThan(touch.contactFocus)
    expect(pop.rebound).toBeGreaterThan(strain.rebound)
  })

  it('creates organic magnetic grip near sticky slime contact without pulling far slime', () => {
    const stuck = computeOrganicSuctionGrip({
      distance: 0.36,
      ahead: 0.9,
      influence: 0.84,
      adhesion: 0.88,
      dimple: 0.64,
      funnel: 0.72,
      neck: 0.58,
      flow: 0.48,
      latchSeal: 0.66,
      slurp: 0.42,
      suctionYield: 0.74,
      visibleMass: 0.82,
      mass: 1.05,
      floorStick: 0.48,
      mouthSettle: 0.62,
      controllerGrip: 0.7,
      intakeFeed: 0.12,
      speed: 0.58,
    })
    const far = computeOrganicSuctionGrip({
      distance: 1.7,
      ahead: 0.08,
      influence: 0.04,
      adhesion: 0.02,
      dimple: 0,
      funnel: 0,
      neck: 0,
      flow: 0,
      latchSeal: 0,
      slurp: 0,
      suctionYield: 0.05,
      visibleMass: 1,
      mass: 1.2,
      floorStick: 0.95,
      mouthSettle: 0,
      controllerGrip: 0,
      intakeFeed: 0,
      speed: 0.04,
    })

    expect(stuck.magneticPull).toBeGreaterThan(0.55)
    expect(stuck.rimGrip).toBeGreaterThan(0.6)
    expect(stuck.stuckHold).toBeGreaterThan(0.25)
    expect(stuck.slurpPressure).toBeGreaterThan(far.slurpPressure + 0.45)
    expect(far.magneticPull).toBeLessThan(0.03)
  })

  it('turns active intake feed into hose pressure swelling without idle hose noise', () => {
    const feeding = computeVisibleHoseSlurp({
      intakeFlow: 0.72,
      massFeed: 0.66,
      contactNeck: 0.58,
      slurpPressure: 0.62,
      magneticPull: 0.5,
      organicHold: 0.42,
      gulpFlow: 0.34,
      mouthSettle: 0.48,
    })
    const idle = computeVisibleHoseSlurp({
      intakeFlow: 0.02,
      massFeed: 0,
      contactNeck: 0.02,
      slurpPressure: 0,
      magneticPull: 0.02,
      organicHold: 0,
      gulpFlow: 0,
      mouthSettle: 0,
    })

    expect(feeding.flow).toBeGreaterThan(0.55)
    expect(feeding.bolus).toBeGreaterThan(0.55)
    expect(feeding.tubeBulge).toBeGreaterThan(idle.tubeBulge + 0.35)
    expect(feeding.tubeBulge).toBeGreaterThan(0.55)
    expect(feeding.mouthThread).toBeGreaterThan(0.45)
    expect(idle.flow).toBeLessThan(0.04)
  })

  it('combines stretch, suction, pooling, and reemergence into premium material response', () => {
    const active = computePremiumSlimeMaterial({
      stretchMemory: 1.1,
      contraction: 0.55,
      compression: 0.42,
      mergeHeat: 0.7,
      surfaceTension: 0.82,
      poolPressure: 0.58,
      suctionStrain: 0.74,
      tendril: 0.62,
      intakeFlow: 0.72,
      intakeFeed: 0.5,
      visibleMass: 0.76,
      speed: 1.2,
      floorStick: 0.48,
      settled: 0.52,
      reemergeCharge: 0.64,
    })
    const idle = computePremiumSlimeMaterial({
      stretchMemory: 0.04,
      contraction: 0,
      compression: 0.05,
      mergeHeat: 0.04,
      surfaceTension: 0.06,
      poolPressure: 0.08,
      suctionStrain: 0,
      tendril: 0,
      intakeFlow: 0,
      intakeFeed: 0,
      visibleMass: 1,
      speed: 0.02,
      floorStick: 0.92,
      settled: 0.12,
      reemergeCharge: 0,
    })

    expect(active.chromaWake).toBeGreaterThan(idle.chromaWake + 0.3)
    expect(active.elasticMemory).toBeGreaterThan(idle.elasticMemory + 0.3)
    expect(active.seamAssimilation).toBeGreaterThan(idle.seamAssimilation)
    expect(active.strandTension).toBeGreaterThan(0.35)
    expect(active.returnBloom).toBeGreaterThan(idle.returnBloom)
  })

  it('makes a hooked vacuum feel planted while preserving swing and release momentum', () => {
    const hooked = computeAnchoredControllerResponse({
      hookStrength: 1.05,
      tetherStrain: 0.62,
      suctionReadiness: 0.74,
      swingTension: 1.1,
      bodySpeed: 2.4,
      distanceToHook: 0.72,
      pointerDown: true,
      release: 0.15,
    })
    const free = computeAnchoredControllerResponse({
      hookStrength: 0,
      tetherStrain: 0,
      suctionReadiness: 0,
      swingTension: 0.08,
      bodySpeed: 0.4,
      distanceToHook: 2.2,
      pointerDown: false,
      release: 0,
    })
    const released = computeAnchoredControllerResponse({
      hookStrength: 0.08,
      tetherStrain: 0.12,
      suctionReadiness: 0,
      swingTension: 1.3,
      bodySpeed: 3.1,
      distanceToHook: 1.5,
      pointerDown: false,
      release: 1,
    })

    expect(hooked.plantedGrip).toBeGreaterThan(free.plantedGrip + 0.3)
    expect(hooked.bodyDriveScale).toBeLessThan(free.bodyDriveScale)
    expect(hooked.tetherPullScale).toBeGreaterThan(free.tetherPullScale)
    expect(hooked.hoseSlideScale).toBeGreaterThan(free.hoseSlideScale)
    expect(released.releaseMomentum).toBeGreaterThan(0.45)
  })

  it('adds swing flow, winch pull, and reattach grace around living slime anchors', () => {
    const chained = computeSwingFlowResponse({
      hookStrength: 1.08,
      tetherStrain: 0.72,
      swingTension: 1.2,
      bodySpeed: 3.4,
      distanceToHook: 1.45,
      restLength: 1.05,
      pointerDistance: 1.55,
      pointerDown: true,
      active: true,
      suctionReadiness: 0.52,
      releaseMomentum: 0.7,
    })
    const parked = computeSwingFlowResponse({
      hookStrength: 0.05,
      tetherStrain: 0.02,
      swingTension: 0.04,
      bodySpeed: 0.18,
      distanceToHook: 1.45,
      restLength: 1.45,
      pointerDistance: 0.2,
      pointerDown: false,
      active: false,
      suctionReadiness: 0,
      releaseMomentum: 0,
    })
    const winched = computeSwingFlowResponse({
      hookStrength: 1,
      tetherStrain: 0.18,
      swingTension: 0.42,
      bodySpeed: 1.2,
      distanceToHook: 0.72,
      restLength: 1.16,
      pointerDistance: 0.54,
      pointerDown: true,
      active: true,
      suctionReadiness: 0.7,
      releaseMomentum: 0.1,
    })

    expect(chained.orbitIntent).toBeGreaterThan(parked.orbitIntent + 0.45)
    expect(chained.tangentCarry).toBeGreaterThan(parked.tangentCarry)
    expect(chained.dampingRelief).toBeGreaterThan(parked.dampingRelief + 0.55)
    expect(chained.reattachGrace).toBeGreaterThan(0.45)
    expect(winched.winchIntent).toBeGreaterThan(0.45)
    expect(winched.mouthAssist).toBeGreaterThan(0.45)
  })

  it('turns a strong suction lock into a readable pivot swing with hose overdrive', () => {
    const pivot = computeSuctionPivotSwing({
      hookStrength: 1.08,
      sealStrength: 1.02,
      sealQuality: 0.94,
      embedDepth: 0.46,
      embedLockStrength: 0.62,
      distanceToPivot: 2.12,
      restLength: 1.18,
      tetherStrain: 0.78,
      swingTension: 1.05,
      bodySpeed: 3.8,
      radialOutSpeed: 1.4,
      tangentialSpeed: 2.7,
      pointerTangentialIntent: 1.3,
      releaseMomentum: 0.22,
      reattachGrace: 0.18,
      pointerDown: true,
      active: true,
    })
    const weak = computeSuctionPivotSwing({
      hookStrength: 0.16,
      sealStrength: 0.12,
      sealQuality: 0.08,
      embedDepth: 0,
      embedLockStrength: 0,
      distanceToPivot: 1.08,
      restLength: 1.28,
      tetherStrain: 0.06,
      swingTension: 0.12,
      bodySpeed: 0.42,
      radialOutSpeed: 0,
      tangentialSpeed: 0.18,
      pointerTangentialIntent: 0,
      releaseMomentum: 0,
      reattachGrace: 0,
      pointerDown: false,
      active: false,
    })

    expect(pivot.locked).toBe(true)
    expect(pivot.radialPull).toBeGreaterThan(weak.radialPull + 3)
    expect(pivot.tangentialBoost).toBeGreaterThan(weak.tangentialBoost + 1)
    expect(pivot.tangentialPreserve).toBeGreaterThan(1.01)
    expect(pivot.hoseVisualStretch).toBeGreaterThan(1.4)
    expect(pivot.hoseTension).toBeGreaterThan(pivot.snapThreshold * 0.55)
    expect(pivot.hoseThinning).toBeGreaterThan(0.08)
    expect(weak.locked).toBe(false)
  })

  it('shrinks the right-click grip release window as spin pressure escalates', () => {
    const early = computeRightClickGripSwing({
      active: true,
      holdTime: 0.28,
      missedWindows: 0,
      spinAngle: 0.04,
      currentSpinSpeed: 2.4,
      dt: 1 / 60,
      distanceToGrip: 1.86,
      restLength: 1.18,
      bodySpeed: 2.7,
      sealStrength: 1.1,
      tension: 0.62,
    })
    const ready = computeRightClickGripSwing({
      active: true,
      holdTime: 0.84,
      missedWindows: 0,
      spinAngle: 0.04,
      currentSpinSpeed: 2.8,
      dt: 1 / 60,
      distanceToGrip: 1.86,
      restLength: 1.18,
      bodySpeed: 2.7,
      sealStrength: 1.1,
      tension: 0.62,
    })
    const late = computeRightClickGripSwing({
      active: true,
      holdTime: 2.8,
      missedWindows: 3,
      spinAngle: 0.72,
      currentSpinSpeed: 5.8,
      dt: 1 / 60,
      distanceToGrip: 2.22,
      restLength: 1.18,
      bodySpeed: 4.4,
      sealStrength: 1.2,
      tension: 1.12,
    })

    expect(early.phaseQuality).toBeGreaterThan(0.9)
    expect(early.releaseReadiness).toBeLessThan(0.05)
    expect(early.releaseQuality).toBeLessThan(0.08)
    expect(early.goodRelease).toBe(false)
    expect(ready.releaseCue).toBeGreaterThan(0.7)
    expect(ready.releaseReadiness).toBeGreaterThan(0.95)
    expect(ready.releaseQuality).toBeGreaterThan(0.9)
    expect(ready.goodRelease).toBe(true)
    expect(ready.massTransferMultiplier).toBeGreaterThan(early.massTransferMultiplier)
    expect(ready.massTransferMultiplier).toBeLessThan(1.32)
    expect(late.spinSpeed).toBeGreaterThan(early.spinSpeed)
    expect(late.releaseWindowWidth).toBeLessThan(ready.releaseWindowWidth)
    expect(late.dizzy).toBeGreaterThan(early.dizzy)
    expect(late.releaseQuality).toBeLessThan(ready.releaseQuality)
    expect(late.missPressure).toBeGreaterThan(early.missPressure)
  })

  it('keeps right-click grip readable by biasing early lock pull over immediate spin', () => {
    const settling = computeRightClickGripSwing({
      active: true,
      holdTime: 0.18,
      missedWindows: 0,
      spinAngle: 1.1,
      currentSpinSpeed: 0.9,
      dt: 1 / 60,
      distanceToGrip: 1.32,
      restLength: 1.18,
      bodySpeed: 1.4,
      sealStrength: 1.1,
      tension: 0.28,
    })
    const committed = computeRightClickGripSwing({
      active: true,
      holdTime: 1.18,
      missedWindows: 0,
      spinAngle: 0.08,
      currentSpinSpeed: 1.2,
      dt: 1 / 60,
      distanceToGrip: 1.86,
      restLength: 1.18,
      bodySpeed: 2.2,
      sealStrength: 1.15,
      tension: 0.62,
    })

    expect(settling.releaseReadiness).toBe(0)
    expect(settling.radialPull).toBeGreaterThan(settling.tangentialForce * 3)
    expect(settling.spinSpeed).toBeLessThan(1.05)
    expect(committed.releaseReadiness).toBeGreaterThan(0.95)
    expect(committed.tangentialForce).toBeGreaterThan(settling.tangentialForce)
    expect(committed.releaseQuality).toBeGreaterThan(0.85)
  })

  it('widens slime grab readiness during release carry without making far anchors random', () => {
    const carried = computeSlimeGrabReadiness({
      distance: 1.02,
      ahead: 0.82,
      suctionInfluence: 0.42,
      pointerDown: true,
      active: true,
      hookStrength: 0.08,
      releaseMomentum: 0.72,
      bodySpeed: 3.3,
    })
    const sameDistanceIdle = computeSlimeGrabReadiness({
      distance: 1.02,
      ahead: 0.82,
      suctionInfluence: 0.42,
      pointerDown: false,
      active: false,
      hookStrength: 0,
      releaseMomentum: 0,
      bodySpeed: 0.1,
    })
    const farSide = computeSlimeGrabReadiness({
      distance: 2.2,
      ahead: 0.14,
      suctionInfluence: 0.05,
      pointerDown: true,
      active: true,
      hookStrength: 0,
      releaseMomentum: 0.9,
      bodySpeed: 4,
    })

    expect(carried).toBeGreaterThan(sameDistanceIdle + 0.28)
    expect(farSide).toBeLessThan(0.04)
  })

	  it('keeps near-slime visual assist separate from physical lock until contact', () => {
    const nearPass = computeEasySuctionAssist({
      distance: 1.06,
      ahead: 0.68,
      influence: 0.42,
      visibleMass: 0.94,
      floorStick: 0.74,
      suctionYield: 0.32,
      pointerDown: false,
      active: true,
      latchSeal: 0,
      grabReadiness: 0.18,
      adhesion: 0.12,
      magneticPull: 0.1,
      contactReadiness: 0.14,
      reattachGrace: 0.16,
      bodySpeed: 1.9,
    })
    const contactPass = computeEasySuctionAssist({
      distance: 0.08,
      ahead: 0.68,
      influence: 0.42,
      visibleMass: 0.94,
      floorStick: 0.74,
      suctionYield: 0.32,
      pointerDown: false,
      active: true,
      latchSeal: 0,
      grabReadiness: 0.18,
      adhesion: 0.12,
      magneticPull: 0.1,
      contactReadiness: 0.14,
      reattachGrace: 0.16,
      bodySpeed: 1.9,
    })
    const farSide = computeEasySuctionAssist({
      distance: 2.3,
      ahead: 0.04,
      influence: 0.04,
      visibleMass: 1,
      floorStick: 1,
      suctionYield: 0,
      pointerDown: true,
      active: true,
      latchSeal: 0,
      grabReadiness: 0,
      adhesion: 0,
      magneticPull: 0,
      contactReadiness: 0,
      reattachGrace: 0,
      bodySpeed: 3.2,
    })

    expect(nearPass.brush).toBeGreaterThan(0.2)
    expect(nearPass.autoLatch).toBeLessThan(0.02)
    expect(nearPass.pullBoost).toBeLessThan(0.02)
    expect(nearPass.feedBoost).toBeLessThan(0.02)
    expect(nearPass.sealBoost).toBeLessThan(0.02)
    expect(nearPass.growthWake).toBeGreaterThan(0.28)
    expect(contactPass.autoLatch).toBeGreaterThan(0.22)
    expect(contactPass.pullBoost).toBeGreaterThan(0.28)
    expect(contactPass.feedBoost).toBeGreaterThan(0.16)
    expect(farSide.autoLatch).toBeLessThan(0.03)
	    expect(farSide.pullBoost).toBeLessThan(0.08)
	  })

	  it('gives a tactile near-slime brush before the hard lock distance', () => {
	    const brushBand = computeEasySuctionAssist({
	      distance: 1.58,
	      ahead: 0.58,
	      influence: 0.28,
	      visibleMass: 0.86,
	      floorStick: 0.62,
	      suctionYield: 0.3,
	      pointerDown: false,
	      active: true,
	      latchSeal: 0,
	      grabReadiness: 0.12,
	      adhesion: 0.06,
	      magneticPull: 0.08,
	      contactReadiness: 0.1,
	      reattachGrace: 0,
	      bodySpeed: 1.4,
	    })
	    const contactBand = computeEasySuctionAssist({
	      distance: 0.08,
	      ahead: 0.7,
	      influence: 0.42,
	      visibleMass: 0.86,
	      floorStick: 0.52,
	      suctionYield: 0.42,
	      pointerDown: false,
	      active: true,
	      latchSeal: 0,
	      grabReadiness: 0.22,
	      adhesion: 0.14,
	      magneticPull: 0.18,
	      contactReadiness: 0.18,
	      reattachGrace: 0,
	      bodySpeed: 1.2,
	    })
	    const miss = computeEasySuctionAssist({
	      distance: 2.86,
	      ahead: 0.04,
	      influence: 0.02,
	      visibleMass: 1,
	      floorStick: 1,
	      suctionYield: 0,
	      pointerDown: false,
	      active: true,
	      latchSeal: 0,
	      grabReadiness: 0,
	      adhesion: 0,
	      magneticPull: 0,
	      contactReadiness: 0,
	      reattachGrace: 0,
	      bodySpeed: 1.2,
	    })

	    expect(brushBand.brush).toBeGreaterThan(0.18)
	    expect(brushBand.pullBoost).toBeLessThan(0.02)
	    expect(brushBand.feedBoost).toBeLessThan(0.02)
	    expect(brushBand.autoLatch).toBeLessThan(0.02)
	    expect(contactBand.autoLatch).toBeGreaterThan(brushBand.autoLatch + 0.18)
	    expect(contactBand.feedBoost).toBeGreaterThan(brushBand.feedBoost + 0.18)
	    expect(miss.autoLatch).toBeLessThan(0.02)
	    expect(miss.pullBoost).toBeLessThan(0.05)
	  })

  it('uses the visible pile surface as a tactile suction target', () => {
    const nearVisibleEdge = computePileSurfaceSuctionAssist({
      surfaceDistance: 0.74,
      ahead: 0.58,
      influence: 0.3,
      visibleMass: 1.1,
      active: true,
      latchSeal: 0,
    })
    const closeVisibleEdge = computePileSurfaceSuctionAssist({
      surfaceDistance: 0.08,
      ahead: 0.7,
      influence: 0.46,
      visibleMass: 1.1,
      active: true,
      latchSeal: 0,
    })
    const distantPile = computePileSurfaceSuctionAssist({
      surfaceDistance: 2.6,
      ahead: 0.08,
      influence: 0.04,
      visibleMass: 1.1,
      active: true,
      latchSeal: 0,
    })

    expect(nearVisibleEdge.brush).toBeGreaterThan(0.08)
    expect(nearVisibleEdge.pullBoost).toBeLessThan(0.02)
    expect(nearVisibleEdge.feedBoost).toBeLessThan(0.02)
    expect(nearVisibleEdge.sealBoost).toBeLessThan(0.02)
    expect(closeVisibleEdge.lock).toBeGreaterThan(nearVisibleEdge.lock + 0.16)
    expect(closeVisibleEdge.sealBoost).toBeGreaterThan(0.18)
    expect(closeVisibleEdge.feedBoost).toBeGreaterThan(nearVisibleEdge.feedBoost)
    expect(distantPile.brush).toBeLessThan(0.02)
    expect(distantPile.sealBoost).toBeLessThan(0.02)
  })

  it('turns visible pile overlap into physical contact only at the local mouth patch', () => {
    const directlyOverPile = computePhysicalPileContactGate({
      surfaceDistance: 0.06,
      patchDistance: 0.12,
      patchRadius: 1.24,
      verticalDistance: 0.28,
    })
    const visuallyOverButFloating = computePhysicalPileContactGate({
      surfaceDistance: 0.06,
      patchDistance: 0.12,
      patchRadius: 1.24,
      verticalDistance: 1.4,
    })
    const nearbyPileWrongPatch = computePhysicalPileContactGate({
      surfaceDistance: 0.08,
      patchDistance: 1.6,
      patchRadius: 1.24,
      verticalDistance: 0.28,
    })
    const distantPile = computePhysicalPileContactGate({
      surfaceDistance: 1.1,
      patchDistance: 0.12,
      patchRadius: 1.24,
      verticalDistance: 0.28,
    })

    expect(directlyOverPile).toBeGreaterThan(PRODUCTION_TUNING.suction.contactPhysicsGateMin)
    expect(visuallyOverButFloating).toBeLessThan(0.02)
    expect(nearbyPileWrongPatch).toBeLessThan(0.02)
    expect(distantPile).toBeLessThan(0.02)
  })

  it('strengthens the edge magnet band while keeping distant piles quiet', () => {
    const outerEdge = computePileSurfaceSuctionAssist({
      surfaceDistance: 1.12,
      ahead: 0.52,
      influence: 0.32,
      visibleMass: 1.2,
      active: true,
      latchSeal: 0,
    })
    const lockEdge = computePileSurfaceSuctionAssist({
      surfaceDistance: 0.08,
      ahead: 0.7,
      influence: 0.46,
      visibleMass: 1.2,
      active: true,
      latchSeal: 0,
    })
    const missed = computePileSurfaceSuctionAssist({
      surfaceDistance: 2.7,
      ahead: 0.08,
      influence: 0.04,
      visibleMass: 1.2,
      active: true,
      latchSeal: 0,
    })

    expect(outerEdge.brush).toBeGreaterThan(0.13)
    expect(outerEdge.pullBoost).toBeLessThan(0.03)
    expect(outerEdge.sealBoost).toBeLessThan(0.03)
    expect(lockEdge.lock).toBeGreaterThan(0.5)
    expect(lockEdge.pullBoost).toBeGreaterThan(outerEdge.pullBoost + 0.42)
    expect(lockEdge.sealBoost).toBeGreaterThan(0.32)
    expect(missed.pullBoost).toBeLessThan(0.03)
    expect(missed.sealBoost).toBeLessThan(0.03)
  })

  it('pulls loose fragments into the mouth without becoming a hard suction lock', () => {
    const far = computeLooseFragmentIntake({
      distance: 1.7,
      ahead: 0.62,
      visibleMass: 0.72,
      mass: 0.66,
      size: 0.08,
      floorStick: 0.62,
      suctionYield: 0.2,
      brush: 0.28,
      contactReadiness: 0.12,
      physicalContact: 0,
      latched: false,
    })
    const nearMouth = computeLooseFragmentIntake({
      distance: 0.58,
      ahead: 0.74,
      visibleMass: 0.62,
      mass: 0.58,
      size: 0.075,
      floorStick: 0.46,
      suctionYield: 0.38,
      brush: 0.48,
      contactReadiness: 0.32,
      physicalContact: 0,
      latched: false,
    })
    const atMouth = computeLooseFragmentIntake({
      distance: 0.22,
      ahead: 0.78,
      visibleMass: 0.4,
      mass: 0.42,
      size: 0.07,
      floorStick: 0.32,
      suctionYield: 0.5,
      brush: 0.62,
      contactReadiness: 0.42,
      physicalContact: 0,
      latched: false,
    })
    const sealedPath = computeLooseFragmentIntake({
      distance: 0.22,
      ahead: 0.78,
      visibleMass: 0.4,
      mass: 0.42,
      size: 0.07,
      floorStick: 0.32,
      suctionYield: 0.5,
      brush: 0.62,
      contactReadiness: 0.42,
      physicalContact: 1,
      latched: true,
    })

    expect(far.active).toBe(true)
    expect(far.pull).toBeGreaterThan(0.5)
    expect(far.feed).toBeGreaterThan(0.05)
    expect(far.swallowReady).toBe(false)
    expect(nearMouth.active).toBe(true)
    expect(nearMouth.flow).toBeGreaterThan(0.25)
    expect(nearMouth.pull).toBeGreaterThan(1.6)
    expect(nearMouth.feed).toBeGreaterThan(0.2)
    expect(nearMouth.swallowReady).toBe(true)
    expect(atMouth.swallowReady).toBe(true)
    expect(atMouth.massDrain).toBeGreaterThanOrEqual(nearMouth.massDrain)
    expect(sealedPath.active).toBe(false)
    expect(sealedPath.flow).toBe(0)
    expect(sealedPath.feed).toBe(0)
  })

  it('classifies every visible tiny slime remnant as mouth-poppable or safe residue cleanup', () => {
    const tinyNearMouth = computeVisibleSlimeVacuumability({
      distanceToMouth: 0.28,
      visibleMass: 0.055,
      mass: 0.18,
      popProgress: 1,
      suctionActive: true,
      latched: false,
      levelCleared: false,
      stuckAge: 0,
    })
    const belowResidueThreshold = computeVisibleSlimeVacuumability({
      distanceToMouth: 1.4,
      visibleMass: PRODUCTION_TUNING.suction.slimeResidueAutoCleanVisibleMass * 0.6,
      mass: PRODUCTION_TUNING.suction.slimeResidueAutoCleanMass * 0.7,
      popProgress: 1,
      suctionActive: false,
      latched: false,
      levelCleared: false,
      stuckAge: 0,
    })
    const obviousBlob = computeVisibleSlimeVacuumability({
      distanceToMouth: 1.3,
      visibleMass: 0.72,
      mass: 0.9,
      popProgress: 1,
      suctionActive: false,
      latched: false,
      levelCleared: false,
      stuckAge: 0,
    })
    const tinyHighMassFloorLump = computeVisibleSlimeVacuumability({
      distanceToMouth: 1.5,
      surfaceDistanceToMouth: 1.18,
      visibleMass: 0.92,
      mass: 0.9,
      size: 0.08,
      popProgress: 1,
      suctionActive: false,
      latched: false,
      levelCleared: false,
      stuckAge: 0,
    })
    const clearedMote = computeVisibleSlimeVacuumability({
      distanceToMouth: 0.18,
      visibleMass: 0.6,
      mass: 0.8,
      popProgress: 1,
      suctionActive: true,
      latched: false,
      levelCleared: true,
      stuckAge: 0,
    })

    expect(tinyNearMouth.visible).toBe(true)
    expect(tinyNearMouth.residue).toBe(true)
    expect(tinyNearMouth.mouthPopReady).toBe(true)
    expect(tinyNearMouth.swallowReady).toBe(true)
    expect(tinyNearMouth.mouthPull).toBeGreaterThan(2)
    expect(tinyHighMassFloorLump.fragment).toBe(true)
    expect(tinyHighMassFloorLump.mouthPopReady).toBe(true)
    expect(tinyHighMassFloorLump.mouthPull).toBeGreaterThan(4)
    expect(belowResidueThreshold.autoCleanup).toBe(true)
    expect(obviousBlob.gameplay).toBe(true)
    expect(obviousBlob.autoCleanup).toBe(false)
    expect(clearedMote.visible).toBe(false)
    expect(clearedMote.mouthPopReady).toBe(false)
  })

  it('treats the visible surface of oversized slime piles as suckable contact', () => {
    const oldCappedSurfaceDistance = 2.15 - (
      PRODUCTION_TUNING.suction.pileSurfaceRadiusBase
      + 0.84
      + 0.09
    )
    const visibleSurfaceDistance = 2.15 - (
      PRODUCTION_TUNING.suction.pileSurfaceRadiusBase
      + Math.min(
        PRODUCTION_TUNING.suction.pileSurfaceMassRadiusMax,
        Math.sqrt(900) * PRODUCTION_TUNING.suction.pileSurfaceMassRadiusScale,
      )
      + 0.09
    )
    const enlargedPatchRadius = PRODUCTION_TUNING.suction.pileSurfacePatchRadius
      + 0.36
      + Math.min(
        PRODUCTION_TUNING.suction.pileSurfacePatchMassMax,
        Math.sqrt(900) * PRODUCTION_TUNING.suction.pileSurfacePatchMassScale,
      )
    const giantPileEdge = computePhysicalPileContactGate({
      surfaceDistance: visibleSurfaceDistance,
      patchDistance: enlargedPatchRadius * 0.16,
      patchRadius: enlargedPatchRadius,
      verticalDistance: 0.12,
    })
    const oldCapMiss = computePhysicalPileContactGate({
      surfaceDistance: oldCappedSurfaceDistance,
      patchDistance: PRODUCTION_TUNING.suction.pileSurfacePatchRadius + 0.36,
      patchRadius: PRODUCTION_TUNING.suction.pileSurfacePatchRadius + 0.36,
      verticalDistance: 0.12,
    })

    expect(visibleSurfaceDistance).toBeLessThan(PRODUCTION_TUNING.suction.physicalContactDistance)
    expect(giantPileEdge).toBeGreaterThan(0.65)
    expect(oldCapMiss).toBeLessThan(0.05)
  })

	  it('turns mouth-local airflow into bridge intent and stronger head-on seal quality', () => {
	    const headOn = computeSuctionContactFlow({
	      distance: 0.62,
	      ahead: 0.9,
	      influence: 0.54,
	      latchSeal: 0.24,
	      candidateScore: 0.92,
	      visibleMass: 0.88,
	      mass: 1.04,
	      floorStick: 0.42,
	      suctionYield: 0.62,
	      contactReadiness: 0.46,
	      contactRope: 0.18,
	      contactFeed: 0.24,
	      intakeFlow: 0.28,
	      intakeFeed: 0.14,
	      rimGrip: 0.56,
	      organicHold: 0.48,
	      slurpPressure: 0.34,
	      glugPulse: 0.1,
	      glugMassTransfer: 0.08,
	      tetherStrain: 0.22,
	      swingTension: 0.3,
	      bodySpeed: 2.1,
	    })
	    const glancing = computeSuctionContactFlow({
	      distance: 0.86,
	      ahead: 0.12,
	      influence: 0.18,
	      latchSeal: 0.02,
	      candidateScore: 0.34,
	      visibleMass: 0.88,
	      mass: 1.04,
	      floorStick: 0.84,
	      suctionYield: 0.16,
	      contactReadiness: 0.12,
	      contactRope: 0.04,
	      contactFeed: 0.04,
	      intakeFlow: 0.06,
	      intakeFeed: 0.02,
	      rimGrip: 0.08,
	      organicHold: 0.05,
	      slurpPressure: 0.04,
	      glugPulse: 0,
	      glugMassTransfer: 0,
	      tetherStrain: 0.34,
	      swingTension: 0.44,
	      bodySpeed: 2.1,
	    })

	    expect(headOn.preContactPull).toBeGreaterThan(0.2)
	    expect(headOn.bridgeIntent).toBeGreaterThan(0.45)
	    expect(headOn.bridgeThickness).toBeGreaterThan(glancing.bridgeThickness)
	    expect(headOn.sealQuality).toBeGreaterThan(glancing.sealQuality + 0.3)
		    expect(glancing.leak).toBeGreaterThan(headOn.leak)
		  })

		  it('starts bridge and feed signals at the slime rim before hard center contact', () => {
		    const rimBrush = computeSuctionContactFlow({
		      distance: 1.48,
		      ahead: 0.74,
		      influence: 0.34,
		      latchSeal: 0,
		      candidateScore: 0.48,
		      visibleMass: 0.9,
		      mass: 1,
		      floorStick: 0.52,
		      suctionYield: 0.36,
		      contactReadiness: 0.1,
		      contactRope: 0.02,
		      contactFeed: 0.04,
		      intakeFlow: 0.08,
		      intakeFeed: 0.04,
		      rimGrip: 0.06,
		      organicHold: 0.05,
		      slurpPressure: 0.06,
		      glugPulse: 0,
		      glugMassTransfer: 0,
		      tetherStrain: 0.08,
		      swingTension: 0.1,
		      bodySpeed: 1.6,
		    })
		    const missedEdge = computeSuctionContactFlow({
		      distance: 2.45,
		      ahead: 0.08,
		      influence: 0.02,
		      latchSeal: 0,
		      candidateScore: 0.04,
		      visibleMass: 0.9,
		      mass: 1,
		      floorStick: 0.82,
		      suctionYield: 0.08,
		      contactReadiness: 0,
		      contactRope: 0,
		      contactFeed: 0,
		      intakeFlow: 0,
		      intakeFeed: 0,
		      rimGrip: 0,
		      organicHold: 0,
		      slurpPressure: 0,
		      glugPulse: 0,
		      glugMassTransfer: 0,
		      tetherStrain: 0,
		      swingTension: 0,
		      bodySpeed: 1.6,
		    })

		    expect(rimBrush.preContactVisual).toBeGreaterThan(0.2)
		    expect(rimBrush.bridgeIntent).toBeGreaterThan(0.18)
		    expect(rimBrush.preContactPull).toBeGreaterThan(missedEdge.preContactPull + 0.12)
		    expect(rimBrush.bridgeIntent).toBeGreaterThan(missedEdge.bridgeIntent + 0.16)
		    expect(missedEdge.bridgeIntent).toBeLessThan(0.05)
		  })

		  it('keeps airflow bulge readable before physical contact', () => {
		    const approach = computeSuctionContactFlow({
		      distance: 1.95,
		      ahead: 0.82,
		      influence: 0.32,
		      latchSeal: 0,
		      candidateScore: 0.56,
		      visibleMass: 0.92,
		      mass: 1.05,
		      floorStick: 0.5,
		      suctionYield: 0.34,
		      contactReadiness: 0.08,
		      contactRope: 0,
		      contactFeed: 0.02,
		      intakeFlow: 0.04,
		      intakeFeed: 0.02,
		      rimGrip: 0.04,
		      organicHold: 0.04,
		      slurpPressure: 0.04,
		      glugPulse: 0,
		      glugMassTransfer: 0,
		      tetherStrain: 0,
		      swingTension: 0,
		      bodySpeed: 1.8,
		    })

		    expect(PRODUCTION_TUNING.suction.preContactPullRadius).toBeGreaterThan(3.2)
		    expect(PRODUCTION_TUNING.livingSlime.suctionBulgeStrength).toBeGreaterThan(1)
		    expect(approach.preContactVisual).toBeGreaterThan(0.7)
		    expect(approach.bridgeIntent).toBeGreaterThan(0.3)
		    expect(approach.preContactPull).toBeGreaterThan(0.8)
		  })

		  it('ties glug pulse mass transfer to bridge narrowing instead of instant deletion', () => {
	    const feeding = computeSuctionContactFlow({
	      distance: 0.48,
	      ahead: 0.84,
	      influence: 0.62,
	      latchSeal: 0.86,
	      candidateScore: 1.02,
	      visibleMass: 0.74,
	      mass: 1,
	      floorStick: 0.22,
	      suctionYield: 0.82,
	      contactReadiness: 0.68,
	      contactRope: 0.62,
	      contactFeed: 0.7,
	      intakeFlow: 0.76,
	      intakeFeed: 0.5,
	      rimGrip: 0.76,
	      organicHold: 0.72,
	      slurpPressure: 0.78,
	      glugPulse: 0.88,
	      glugMassTransfer: 0.92,
	      tetherStrain: 0.28,
	      swingTension: 0.42,
	      bodySpeed: 2.6,
	    })
	    const idle = computeSuctionContactFlow({
	      distance: 1.46,
	      ahead: 0.12,
	      influence: 0.06,
	      latchSeal: 0,
	      candidateScore: 0.08,
	      visibleMass: 1,
	      mass: 1,
	      floorStick: 1,
	      suctionYield: 0,
	      contactReadiness: 0,
	      contactRope: 0,
	      contactFeed: 0,
	      intakeFlow: 0,
	      intakeFeed: 0,
	      rimGrip: 0,
	      organicHold: 0,
	      slurpPressure: 0,
	      glugPulse: 0,
	      glugMassTransfer: 0,
	      tetherStrain: 0,
	      swingTension: 0,
	      bodySpeed: 0.4,
	    })

	    expect(feeding.massTransferRate).toBeGreaterThan(idle.massTransferRate + 0.12)
	    expect(feeding.pulseMass).toBeGreaterThan(0.02)
	    expect(feeding.bridgeNarrowing).toBeGreaterThan(idle.bridgeNarrowing + 0.2)
	    expect(feeding.pulseMass).toBeLessThan(0.09)
	  })

	  it('raises embed depth and lock strength for strong aligned suction contact', () => {
    const strongContact = {
      dt: 0.08,
      currentDepth: 0,
      age: 0,
      latchAge: 0.42,
      detached: false,
      distance: 0.44,
      ahead: 0.92,
      sealQuality: 1.24,
      latchSeal: 0.88,
      visibleMass: 0.9,
      mass: 1.1,
      bodySpeed: 1.4,
      tetherStrain: 0.22,
      swingTension: 0.32,
      bridgeIntent: 1.05,
      bridgeThickness: 0.32,
      glugStrength: 0.54,
      glugMassFlow: 0.36,
    }
    const bite = computeDeepSuctionEmbed(strongContact)
    const locked = computeDeepSuctionEmbed({
      ...strongContact,
      dt: 0.16,
      currentDepth: bite.embedDepth,
      age: bite.embedAge,
      latchAge: 0.78,
      glugStrength: 0.86,
      glugMassFlow: 0.52,
    })

    expect(bite.state).toBe('embed-lock')
    expect(bite.embedDepth).toBeGreaterThan(0.8)
    expect(bite.lockStrength).toBeGreaterThan(1.5)
    expect(bite.pocketDimple).toBeGreaterThan(1.2)
    expect(bite.rimOcclusion).toBeGreaterThan(1.2)
    expect(locked.embedDepth).toBeGreaterThan(bite.embedDepth)
    expect(locked.embedDepth).toBeGreaterThan(1.1)
    expect(locked.lockStrength).toBeGreaterThan(1.5)
    expect(locked.glugStrengthMultiplier).toBeGreaterThan(1)
	    expect(locked.bridgeThicknessMultiplier).toBeGreaterThan(1)
	  })

	  it('turns good edge contact into visible submerge instead of a shallow skim', () => {
	    const edgeBite = computeDeepSuctionEmbed({
	      dt: 0.12,
	      currentDepth: 0.05,
	      age: 0.08,
	      latchAge: 0.34,
	      detached: false,
	      distance: 0.74,
	      ahead: 0.66,
	      sealQuality: 0.72,
	      latchSeal: 0.58,
	      visibleMass: 0.88,
	      mass: 1.04,
	      bodySpeed: 2.2,
	      tetherStrain: 0.18,
	      swingTension: 0.26,
	      bridgeIntent: 0.72,
	      bridgeThickness: 0.26,
	      glugStrength: 0.34,
	      glugMassFlow: 0.22,
	    })

	    expect(edgeBite.state).toBe('embed-lock')
	    expect(edgeBite.embedDepth).toBeGreaterThan(0.9)
	    expect(edgeBite.lockStrength).toBeGreaterThan(1.4)
	    expect(edgeBite.rimOcclusion).toBeGreaterThan(1.2)
	    expect(edgeBite.pocketDimple).toBeGreaterThan(1.2)
	  })

	  it('keeps angled weak contact shallow and penalized', () => {
    const weak = computeDeepSuctionEmbed({
      dt: 0.16,
      currentDepth: 0.14,
      age: 0.2,
      latchAge: 0.38,
      detached: false,
      distance: 0.84,
      ahead: 0.16,
      sealQuality: 0.36,
      latchSeal: 0.18,
      visibleMass: 0.82,
      mass: 1.05,
      bodySpeed: 3.9,
      tetherStrain: 0.48,
      swingTension: 0.62,
      bridgeIntent: 0.28,
      bridgeThickness: 0.12,
      glugStrength: 0.08,
      glugMassFlow: 0.04,
    })

    expect(weak.embedDepth).toBeLessThan(0.14)
    expect(weak.lockStrength).toBeLessThan(0.16)
    expect(weak.pocketDimple).toBeLessThan(0.25)
    expect(weak.rimOcclusion).toBeLessThan(0.25)
    expect(weak.anglePenalty).toBeGreaterThan(0.2)
    expect(weak.state).not.toBe('embed-lock')
  })

  it('marks embedded high tension as a pop-out snap with release impulse', () => {
    const strained = computeDeepSuctionEmbed({
      dt: 0.08,
      currentDepth: 0.68,
      age: 0.74,
      latchAge: 0.9,
      detached: false,
      distance: 1.04,
      ahead: 0.64,
      sealQuality: 1.05,
      latchSeal: 0.82,
      visibleMass: 0.76,
      mass: 1.08,
      bodySpeed: 5.2,
      tetherStrain: 2.42,
      swingTension: 2.34,
      bridgeIntent: 0.9,
      bridgeThickness: 0.24,
      glugStrength: 0.48,
      glugMassFlow: 0.28,
    })

    expect(strained.state).toBe('pop-out-snap')
    expect(strained.snapReady).toBe(true)
    expect(strained.releaseReason).toBe('tension')
    expect(strained.popImpulse).toBeGreaterThan(0.5)
    expect(strained.slimeRecoil).toBeGreaterThan(0.4)
  })

  it('creates readable glug pulses only after mouth contact has load and feed', () => {
    const active = computeRhythmicGlugPulse({
      time: 0.28,
      seed: 1,
      latchAge: 0.5,
      readiness: 0.92,
      feed: 0.78,
      pressure: 0.86,
      neck: 0.72,
      visibleMass: 0.72,
      mass: 1.08,
      floorStick: 0.32,
      suctionYield: 0.82,
      contactResistance: 0.12,
    })
    const early = computeRhythmicGlugPulse({
      time: 0.28,
      seed: 1,
      latchAge: 0.04,
      readiness: 0.92,
      feed: 0.78,
      pressure: 0.86,
      neck: 0.72,
      visibleMass: 0.72,
      mass: 1.08,
      floorStick: 0.32,
      suctionYield: 0.82,
      contactResistance: 0.12,
    })
    const idle = computeRhythmicGlugPulse({
      time: 0.28,
      seed: 1,
      latchAge: 0.5,
      readiness: 0.04,
      feed: 0.02,
      pressure: 0.02,
      neck: 0.02,
      visibleMass: 1,
      mass: 1,
      floorStick: 1,
      suctionYield: 0.05,
      contactResistance: 0.7,
    })

    expect(active.pulse).toBeGreaterThan(0.65)
    expect(active.massTransfer).toBeGreaterThan(0.65)
    expect(active.bagPulse).toBeGreaterThan(0.55)
    expect(early.pulse).toBeLessThan(active.pulse * 0.2)
    expect(idle.massTransfer).toBeLessThan(0.08)
  })

  it('promotes a successful glug event into countable mass transfer and bridge surge', () => {
    const event = computeGlugMassTransferEvent({
      time: 1.2,
      seed: 0.4,
      latchAge: 0.72,
      lastGlugAge: 0.32,
      cooldownRemaining: 0,
      detached: false,
      sealQuality: 1.18,
      latchSeal: 0.9,
      feed: 0.86,
      pressure: 0.78,
      bridgeActive: 1.05,
      bridgeThickness: 0.34,
      visibleMass: 0.82,
      mass: 1.1,
      basePulse: 0.82,
      baseMassTransfer: 0.7,
      tetherStrain: 0.22,
      swingTension: 0.34,
    })

    expect(event.ready).toBe(true)
    expect(event.successful).toBe(true)
    expect(event.strength).toBeGreaterThan(0.6)
    expect(event.mass).toBeGreaterThan(0.02)
    expect(event.bridgeSurge).toBeGreaterThan(0.25)
    expect(event.bagPulse).toBeGreaterThan(0.35)
    expect(event.failedStrength).toBe(0)
  })

  it('allows sealed tiny slime to glug once it reaches the mouth', () => {
    const event = computeGlugMassTransferEvent({
      time: 1.2,
      seed: 0.4,
      latchAge: 0.72,
      lastGlugAge: 0.32,
      cooldownRemaining: 0,
      detached: false,
      sealQuality: 1.08,
      latchSeal: 0.84,
      feed: 0.82,
      pressure: 0.74,
      bridgeActive: 0.88,
      bridgeThickness: 0.24,
      visibleMass: 0.052,
      mass: 0.12,
      basePulse: 0.78,
      baseMassTransfer: 0.64,
      tetherStrain: 0.16,
      swingTension: 0.24,
    })

    expect(event.ready).toBe(true)
    expect(event.successful).toBe(true)
    expect(event.mass).toBeGreaterThan(0)
    expect(event.mass).toBeLessThanOrEqual(0.12 * 0.052)
  })

  it('keeps detached slime from transferring mass and makes weak seals stutter', () => {
    const detached = computeGlugMassTransferEvent({
      time: 1.2,
      seed: 0.4,
      latchAge: 0.72,
      lastGlugAge: 0.32,
      cooldownRemaining: 0,
      detached: true,
      sealQuality: 1.18,
      latchSeal: 0.9,
      feed: 0.86,
      pressure: 0.78,
      bridgeActive: 1.05,
      bridgeThickness: 0.34,
      visibleMass: 0.82,
      mass: 1.1,
      basePulse: 0.82,
      baseMassTransfer: 0.7,
      tetherStrain: 0.22,
      swingTension: 0.34,
    })
    const weak = computeGlugMassTransferEvent({
      time: 1.2,
      seed: 0.4,
      latchAge: 0.72,
      lastGlugAge: 0.34,
      cooldownRemaining: 0,
      detached: false,
      sealQuality: 0.44,
      latchSeal: 0.22,
      feed: 0.62,
      pressure: 0.54,
      bridgeActive: 0.42,
      bridgeThickness: 0.12,
      visibleMass: 0.8,
      mass: 1,
      basePulse: 0.55,
      baseMassTransfer: 0.28,
      tetherStrain: 0.76,
      swingTension: 0.94,
    })

    expect(detached.ready).toBe(false)
    expect(detached.mass).toBe(0)
    expect(weak.successful).toBe(false)
    expect(weak.mass).toBe(0)
    expect(weak.failedStrength).toBeGreaterThan(0.05)
  })

  it('turns collected slime mass into bag fill, pressure, beauty, and full-state pulse', () => {
    const idle = computeBagRewardResponse({
      collectedMass: 0,
      currentFill: 0.22,
      currentPressure: 0,
      currentBeauty: 0,
      incomingMass: 0,
      glugPulse: 0,
      glugMassFlow: 0,
      swallowPulse: 0,
    })
    const firstGlug = computeBagRewardResponse({
      collectedMass: 0,
      currentFill: 0.22,
      currentPressure: 0,
      currentBeauty: 0,
      incomingMass: 0.5,
      glugPulse: 0.72,
      glugMassFlow: 0.8,
      swallowPulse: 0.1,
    })
    const fullReward = computeBagRewardResponse({
      collectedMass: 6,
      currentFill: 0.98,
      currentPressure: 0.6,
      currentBeauty: 0.8,
      incomingMass: 0.9,
      glugPulse: 0.85,
      glugMassFlow: 0.9,
      swallowPulse: 1,
    })

    expect(firstGlug.fillTarget).toBeGreaterThan(idle.fillTarget + 0.04)
    expect(firstGlug.fillNormalized).toBeGreaterThan(idle.fillNormalized)
    expect(firstGlug.lastMassReceived).toBeCloseTo(0.5)
    expect(firstGlug.reactionStrength).toBeGreaterThan(0.45)
    expect(firstGlug.pressure).toBeGreaterThan(idle.pressure + 0.3)
    expect(firstGlug.pulse).toBeGreaterThan(0.45)
    expect(firstGlug.beauty).toBeGreaterThan(idle.beauty + 0.2)
    expect(firstGlug.nonUniformBulge).toBeGreaterThan(0.08)
    expect(firstGlug.glow).toBeGreaterThan(idle.glow)
    expect(firstGlug.internalMotion).toBeGreaterThan(idle.internalMotion)
    expect(firstGlug.scaleY).toBeGreaterThan(firstGlug.scaleZ)
    expect(fullReward.fillTarget).toBeGreaterThan(1)
    expect(fullReward.fullPulse).toBeGreaterThan(firstGlug.fullPulse + 0.45)
    expect(fullReward.wobble).toBeGreaterThan(firstGlug.wobble)
    expect(fullReward.chroma).toBeGreaterThan(firstGlug.chroma)
    expect(fullReward.nearFull).toBeGreaterThan(0.5)
    expect(fullReward.scaleX).toBeLessThanOrEqual(PRODUCTION_TUNING.bag.bagMaxSize)
    expect(fullReward.scaleY).toBeLessThanOrEqual(PRODUCTION_TUNING.bag.bagMaxSize * 1.04)
    expect(fullReward.scaleZ).toBeLessThanOrEqual(PRODUCTION_TUNING.bag.bagMaxSize)
  })

  it('makes strong sealed glugs produce larger bag reaction than weak sealed glugs', () => {
    const weak = computeBagRewardResponse({
      collectedMass: 1.4,
      currentFill: 0.52,
      currentPressure: 0.18,
      currentBeauty: 0.22,
      incomingMass: 0.32,
      glugPulse: 0.4,
      glugMassFlow: 0.32,
      swallowPulse: 0,
      sealStrength: 0.22,
      tension: 0.2,
    })
    const strong = computeBagRewardResponse({
      collectedMass: 1.4,
      currentFill: 0.52,
      currentPressure: 0.18,
      currentBeauty: 0.22,
      incomingMass: 0.32,
      glugPulse: 0.86,
      glugMassFlow: 0.82,
      swallowPulse: 0.1,
      sealStrength: 1.18,
      tension: 0.2,
    })

    expect(strong.collectedMass).toBeGreaterThan(weak.collectedMass)
    expect(strong.pulse).toBeGreaterThan(weak.pulse + 0.2)
    expect(strong.reactionStrength).toBeGreaterThan(weak.reactionStrength + 0.25)
    expect(strong.glow).toBeGreaterThan(weak.glow)
  })

  it('separates sticky snap-bond tension from normal feeding', () => {
    const stretched = computeElasticSnapBond({
      latchAge: 0.62,
      latchSeal: 1,
      grip: 0.9,
      organicHold: 0.82,
      rimGrip: 0.78,
      contactRope: 0.76,
      contactFeed: 0.42,
      contactSnap: 0.66,
      stretchDistance: 1.05,
      tetherStrain: 0.84,
      swingTension: 1.18,
      bodySpeed: 3.2,
      slurp: 0.34,
      intakeFeed: 0.3,
      suctionYield: 0.68,
      visibleMass: 0.78,
      mass: 1.08,
      floorStick: 0.34,
      releaseMomentum: 0.38,
      cooldown: 0,
    })
    const feeding = computeElasticSnapBond({
      latchAge: 0.62,
      latchSeal: 1,
      grip: 0.72,
      organicHold: 0.72,
      rimGrip: 0.72,
      contactRope: 0.48,
      contactFeed: 0.92,
      contactSnap: 0.2,
      stretchDistance: 0.42,
      tetherStrain: 0.18,
      swingTension: 0.28,
      bodySpeed: 0.8,
      slurp: 0.78,
      intakeFeed: 0.82,
      suctionYield: 0.88,
      visibleMass: 0.42,
      mass: 0.96,
      floorStick: 0.18,
      releaseMomentum: 0.12,
      cooldown: 0,
    })

    expect(stretched.tension).toBeGreaterThan(feeding.tension + 0.3)
    expect(stretched.snap).toBeGreaterThan(0.45)
    expect(stretched.releaseImpulse).toBeGreaterThan(feeding.releaseImpulse)
    expect(feeding.slurpBrake).toBeLessThan(stretched.slurpBrake)
  })

  it('turns physics state into readable cartoon action animation signals', () => {
    const idle = computeCartoonActionAnimation({
      stretch: 0.02,
      contraction: 0.02,
      suction: 0.03,
      glugPulse: 0,
      glugMassFlow: 0,
      slide: 0,
      snap: 0,
      recoil: 0,
      bagFill: 0.22,
      bagPulse: 0,
      bagPressure: 0,
      completion: 0,
    })
    const active = computeCartoonActionAnimation({
      stretch: 0.82,
      contraction: 0.26,
      suction: 0.94,
      glugPulse: 0.78,
      glugMassFlow: 0.62,
      slide: 0.72,
      snap: 0.48,
      recoil: 0.42,
      bagFill: 0.78,
      bagPulse: 0.68,
      bagPressure: 0.54,
      completion: 0.08,
    })
    const complete = computeCartoonActionAnimation({
      stretch: 0.28,
      contraction: 0.62,
      suction: 0.86,
      glugPulse: 0.7,
      glugMassFlow: 0.74,
      slide: 0.18,
      snap: 0.12,
      recoil: 0.5,
      bagFill: 1.12,
      bagPulse: 0.92,
      bagPressure: 0.9,
      completion: 1,
    })

    expect(idle.anticipation).toBeLessThan(0.05)
    expect(active.stretchSquash).toBeGreaterThan(idle.stretchSquash + 0.7)
    expect(active.slurpPull).toBeGreaterThan(0.7)
    expect(active.glugThump).toBeGreaterThan(0.65)
    expect(active.slideSmear).toBeGreaterThan(0.45)
    expect(active.snapPop).toBeGreaterThan(0.45)
    expect(active.strandPinch).toBeGreaterThan(0.65)
    expect(complete.bagOvershoot).toBeGreaterThan(active.bagOvershoot)
    expect(complete.completionFlourish).toBeGreaterThan(1)
    expect(complete.recoilWobble).toBeGreaterThan(idle.recoilWobble + 0.6)
  })

  it('separates full-slurp payoff from ordinary mid-feed suction', () => {
    const idle = computeFullSlurpPayoff({
      visibleMass: 1,
      intakeFeed: 0,
      contactFeed: 0,
      slurp: 0,
      glugPulse: 0,
      glugMassFlow: 0,
      neck: 0,
      rope: 0,
      latchAge: 0,
      distanceToMouth: 1.2,
      mass: 1,
      bagFill: 0.22,
      fragmentAbsorb: 0,
    })
    const midFeed = computeFullSlurpPayoff({
      visibleMass: 0.64,
      intakeFeed: 0.58,
      contactFeed: 0.44,
      slurp: 0.56,
      glugPulse: 0.38,
      glugMassFlow: 0.36,
      neck: 0.46,
      rope: 0.38,
      latchAge: 0.7,
      distanceToMouth: 0.42,
      mass: 1.05,
      bagFill: 0.56,
      fragmentAbsorb: 0.12,
    })
    const final = computeFullSlurpPayoff({
      visibleMass: 0.2,
      intakeFeed: 1.05,
      contactFeed: 0.95,
      slurp: 0.92,
      glugPulse: 0.82,
      glugMassFlow: 0.78,
      neck: 0.82,
      rope: 0.74,
      latchAge: 1.1,
      distanceToMouth: 0.28,
      mass: 1.12,
      bagFill: 0.88,
      fragmentAbsorb: 0.42,
    })

    expect(idle.nearEmpty).toBeLessThan(0.01)
    expect(midFeed.finalGlug).toBeLessThan(0.1)
    expect(final.nearEmpty).toBeGreaterThan(0.6)
    expect(final.finalStrand).toBeGreaterThan(0.65)
    expect(final.finalGlug).toBeGreaterThan(0.8)
    expect(final.bagReward).toBeGreaterThan(0.95)
    expect(final.cleanup).toBeGreaterThan(0.7)
    expect(final.chainReady).toBeGreaterThan(0.65)
  })
})
