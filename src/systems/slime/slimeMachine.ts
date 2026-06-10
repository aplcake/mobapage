import * as THREE from 'three'
import { clamp01, damp, seededNoise, signedSeededNoise } from '../../core/math'
import { SLURPER_PARAMS } from '../../core/parameters'
import { computeSuctionForce } from '../suction/SuctionField'
import { SlimeState, type RespawnSite, type SlimePiece, type SlimeStepContext, type SlimeStepResult } from './slimeTypes'

const tempForce = new THREE.Vector3()
const tempHome = new THREE.Vector3()
const tempSource = new THREE.Vector3()

export function chooseRespawnSite(id: number, sites: RespawnSite[]) {
  return sites[id % sites.length]
}

export function createSlimePieces(count: number, respawnSites: RespawnSite[]): SlimePiece[] {
  return Array.from({ length: count }, (_, id) => {
    const site = chooseRespawnSite(id, respawnSites)
    const ring = Math.floor(id / respawnSites.length)
    const angle = seededNoise(id + 1) * Math.PI * 2
    const radius = seededNoise(id + 3) * site.radius + 0.35 + (ring % 6) * 0.05
    const homePosition = new THREE.Vector3(
      site.position.x + Math.cos(angle) * radius,
      0.24,
      site.position.z + Math.sin(angle) * radius,
    )
    return {
      id,
      patchId: site.id,
      state: SlimeState.Idle,
      position: homePosition.clone(),
      previousPosition: homePosition.clone(),
      homePosition,
      velocity: new THREE.Vector3(),
      radius: 0.13 + seededNoise(id + 5) * 0.11,
      vitality: 0.45 + seededNoise(id + 7) * 0.55,
      phase: seededNoise(id + 11) * Math.PI * 2,
      paletteIndex: id % 4,
      personalitySwirl: 0.35 + seededNoise(id + 13) * 0.65,
      suctionInfluence: 0,
      capturedAt: 0,
      gulpScheduledAt: 0,
      respawnAt: 0,
      stretch: 0,
      strandWidth: 1,
      residueLife: 0,
      reemergeSite: site.id,
    }
  })
}

export function nextSlimeState(
  state: SlimeState,
  ageMs: number,
  distanceToMouth: number,
  suctionRadius: number,
  stretch: number,
): SlimeState {
  if (state === SlimeState.Idle && distanceToMouth < suctionRadius) return SlimeState.Captured
  if (state === SlimeState.Captured && ageMs > 90) return SlimeState.Stretching
  if (state === SlimeState.Stretching && (distanceToMouth < suctionRadius * 0.35 || stretch > 0.55)) return SlimeState.Stringing
  return state
}

export function isMouthGulpEligible(piece: SlimePiece, mouth: THREE.Vector3, mouthThreshold = SLURPER_PARAMS.slime.mouthThreshold) {
  const mouthContactEligible =
    piece.state === SlimeState.Captured || piece.state === SlimeState.Stretching || piece.state === SlimeState.Stringing
  return mouthContactEligible && piece.position.distanceTo(mouth) <= mouthThreshold
}

function rehomePiece(piece: SlimePiece, sites: RespawnSite[]) {
  const site = chooseRespawnSite(piece.id + piece.patchId + Math.floor(piece.respawnAt * 10), sites)
  const angle = seededNoise(piece.id + piece.respawnAt + 17) * Math.PI * 2
  const radius = site.radius * (0.35 + seededNoise(piece.id + piece.respawnAt + 19) * 0.65)
  piece.homePosition.set(site.position.x + Math.cos(angle) * radius, 0.24, site.position.z + Math.sin(angle) * radius)
  piece.position.copy(piece.homePosition).add(new THREE.Vector3(0, -0.18, 0))
  piece.previousPosition.copy(piece.position)
  piece.reemergeSite = site.id
  piece.patchId = site.id
}

function currentReemergeSite(piece: SlimePiece, sites: RespawnSite[]) {
  return sites.find((site) => site.id === piece.reemergeSite) ?? chooseRespawnSite(piece.id, sites)
}

export function stepSlimePiece(piece: SlimePiece, context: SlimeStepContext): SlimeStepResult {
  const params = SLURPER_PARAMS.slime
  const { time, dt, mouth, suctionScale, respawnSites } = context
  const result: SlimeStepResult = { gulped: false, reemerged: false }
  const cappedDt = Math.min(dt, 0.04)

  piece.previousPosition.copy(piece.position)

  if (piece.state === SlimeState.Gulped) {
    if (time >= piece.respawnAt) {
      rehomePiece(piece, respawnSites)
      piece.state = SlimeState.Reemerging
      piece.velocity.set(0, 0.35, 0)
      piece.residueLife = 0
    }
    return result
  }

  if (piece.state === SlimeState.Reemerging) {
    const site = currentReemergeSite(piece, respawnSites)
    piece.residueLife = clamp01(piece.residueLife + cappedDt * (site.mode === 'spout' ? 1.9 : 2.25))
    const progress = piece.residueLife
    const eased = 1 - Math.pow(1 - progress, 2)
    tempSource.copy(site.position)
    tempSource.y = 0.02
    piece.position.lerpVectors(tempSource, piece.homePosition, eased)
    const arc = Math.sin(progress * Math.PI)

    if (site.mode === 'spout') {
      piece.position.y = 0.24 + arc * 0.74
      piece.position.x += (1 - progress) * 0.58
    } else if (site.mode === 'grate') {
      piece.position.y = 0.07 + arc * 0.24
      piece.position.x += Math.sin(progress * Math.PI * 4 + piece.phase) * 0.16 * (1 - progress)
      piece.position.z += Math.cos(progress * Math.PI * 4 + piece.phase) * 0.16 * (1 - progress)
    } else if (site.mode === 'drain') {
      piece.position.y = 0.06 + arc * 0.18
      piece.position.z += (1 - progress) * 0.46
    } else if (site.mode === 'pump') {
      piece.position.y = 0.16 + arc * 0.48
      piece.position.x += Math.sin(piece.phase) * (1 - progress) * 0.5
    } else {
      piece.position.y = 0.055 + arc * 0.28
      piece.position.x += Math.cos(piece.phase) * arc * 0.25
      piece.position.z += Math.sin(piece.phase) * arc * 0.25
    }

    if (piece.residueLife >= 1) {
      piece.state = SlimeState.Idle
      piece.position.copy(piece.homePosition)
      piece.velocity.set(0, 0, 0)
      piece.residueLife = 0
      result.reemerged = true
    }
    return result
  }

  const distanceToMouth = piece.position.distanceTo(mouth)
  const affected = distanceToMouth < params.suctionRadius * (0.72 + suctionScale * 0.42)
  const ageMs = (time - piece.capturedAt) * 1000
  const next = nextSlimeState(piece.state, ageMs, distanceToMouth, params.suctionRadius, piece.stretch)
  if (next !== piece.state) {
    piece.state = next
    if (next === SlimeState.Captured) piece.capturedAt = time
  }

  if (affected && piece.state === SlimeState.Idle) {
    piece.state = SlimeState.Captured
    piece.capturedAt = time
  }

  if (piece.state === SlimeState.Captured || piece.state === SlimeState.Stretching || piece.state === SlimeState.Stringing) {
    const force = computeSuctionForce(piece.position, piece.velocity, mouth, piece.personalitySwirl)
    piece.suctionInfluence = clamp01(force.influence * (0.45 + suctionScale * 0.75))
    tempForce.copy(force.total).multiplyScalar(piece.suctionInfluence * (0.8 + suctionScale * 0.55))
    piece.velocity.addScaledVector(tempForce, cappedDt)
    piece.velocity.multiplyScalar(Math.exp(-1.8 * cappedDt))
    piece.position.addScaledVector(piece.velocity, cappedDt)
    piece.stretch = damp(piece.stretch, piece.state === SlimeState.Stringing ? 1 : 0.65, 8, cappedDt)
    piece.strandWidth = damp(piece.strandWidth, piece.state === SlimeState.Stringing ? 0.26 : 0.68, 9, cappedDt)
  } else if (piece.state === SlimeState.Residue) {
    piece.residueLife = clamp01(piece.residueLife + cappedDt * 2.6)
    piece.stretch = damp(piece.stretch, 0, 7, cappedDt)
    piece.suctionInfluence = damp(piece.suctionInfluence, 0, 8, cappedDt)
    if (piece.residueLife >= 1) {
      piece.state = SlimeState.Gulped
      piece.respawnAt = time + params.reemergeDelaySec * (0.78 + seededNoise(piece.id + time) * 0.7)
    }
  } else {
    const driftScale = params.idleWanderRadius * (0.35 + piece.vitality * 0.65)
    tempHome.copy(piece.homePosition)
    tempHome.x += Math.sin(time * (0.45 + piece.vitality * 0.3) + piece.phase) * driftScale
    tempHome.z += Math.cos(time * (0.38 + piece.vitality * 0.2) + piece.phase * 1.3) * driftScale
    tempHome.y = 0.22 + Math.sin(time * 1.2 + piece.phase) * params.idleBreathAmp * 0.12
    piece.velocity.addScaledVector(tempHome.sub(piece.position), 3.2 * cappedDt)
    piece.velocity.multiplyScalar(Math.exp(-3.5 * cappedDt))
    piece.position.addScaledVector(piece.velocity, cappedDt)
    piece.suctionInfluence = damp(piece.suctionInfluence, 0, 6, cappedDt)
    piece.stretch = damp(piece.stretch, 0, 7, cappedDt)
    piece.strandWidth = damp(piece.strandWidth, 1, 7, cappedDt)
  }

  if (isMouthGulpEligible(piece, mouth, params.mouthThreshold)) {
    piece.state = seededNoise(piece.id + time) > 0.28 ? SlimeState.Gulped : SlimeState.Residue
    piece.gulpScheduledAt = time
    piece.residueLife = piece.state === SlimeState.Residue ? 0.15 : 0
    piece.respawnAt = time + params.reemergeDelaySec * (0.8 + seededNoise(piece.id + time + 31) * 0.8)
    piece.velocity.set(signedSeededNoise(piece.id + 2) * 0.06, 0, signedSeededNoise(piece.id + 4) * 0.06)
    result.gulped = true
  }

  return result
}

export function slimeStateToAttribute(state: SlimeState) {
  switch (state) {
    case SlimeState.Captured:
      return 1
    case SlimeState.Stretching:
      return 2
    case SlimeState.Stringing:
      return 3
    case SlimeState.Residue:
      return 4
    case SlimeState.Reemerging:
      return 5
    case SlimeState.Gulped:
      return 6
    case SlimeState.Idle:
    default:
      return 0
  }
}
