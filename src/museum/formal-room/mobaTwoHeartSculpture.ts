export const MOBA_TWO_HEART_SCULPTURE_SPEC = {
  id: 'moba-two-bouncing-heart',
  landmark: 'curated-hearts-sculpture',
  originArtworkId: 'yes-yes',
  localPosition: [0, 0, 29.725] as const,
  worldCenter: [-12.2, 26.175] as const,
  fixedYaw: -0.18,
  heartRestY: 0.04,
  bounceHeight: 0.46,
  cycleSeconds: 1.68,
  podiumTopY: -0.88,
  collider: {
    id: 'moba-two-bouncing-heart',
    minX: -12.95,
    maxX: -11.45,
    minZ: 25.475,
    maxZ: 26.875,
  },
} as const

export type MobaTwoHeartMotion = {
  height: number
  scaleX: number
  scaleY: number
  scaleZ: number
  rotationZ: number
  shadowScale: number
  shadowOpacity: number
  lightPoolPulse: number
}

const REST_MOTION: MobaTwoHeartMotion = {
  height: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  rotationZ: 0,
  shadowScale: 1,
  shadowOpacity: 0.22,
  lightPoolPulse: 0,
}

function normalizePhase(phase: number) {
  if (!Number.isFinite(phase)) return 0
  return ((phase % 1) + 1) % 1
}

function pulse(t: number) {
  return Math.sin(Math.PI * Math.min(1, Math.max(0, t)))
}

/**
 * A single authored Yes / Yes bounce: crouch, fast launch, soft apex,
 * crisp landing, then a tiny settle. The outer installation never moves,
 * which keeps its podium, light pool, and walk collider perfectly aligned.
 */
export function mobaTwoHeartMotionAtPhase(
  rawPhase: number,
  reducedMotion = false,
): MobaTwoHeartMotion {
  if (reducedMotion) return REST_MOTION
  const phase = normalizePhase(rawPhase)

  if (phase < 0.12) {
    const anticipation = pulse(phase / 0.12)
    return {
      height: -0.025 * anticipation,
      scaleX: 1 + anticipation * 0.055,
      scaleY: 1 - anticipation * 0.08,
      scaleZ: 1 + anticipation * 0.055,
      rotationZ: 0,
      shadowScale: 1 + anticipation * 0.035,
      shadowOpacity: 0.22 + anticipation * 0.025,
      lightPoolPulse: anticipation * 0.08,
    }
  }

  if (phase < 0.72) {
    const flight = (phase - 0.12) / 0.6
    const arc = 16 * flight * flight * (1 - flight) * (1 - flight)
    const launchStretch = flight < 0.36 ? pulse(flight / 0.36) : 0
    return {
      height: MOBA_TWO_HEART_SCULPTURE_SPEC.bounceHeight * arc,
      scaleX: 1 - launchStretch * 0.035,
      scaleY: 1 + launchStretch * 0.07,
      scaleZ: 1 - launchStretch * 0.025,
      rotationZ: Math.sin(flight * Math.PI) * 0.012,
      shadowScale: 1 - arc * 0.24,
      shadowOpacity: 0.22 - arc * 0.115,
      lightPoolPulse: arc * 0.05,
    }
  }

  if (phase < 0.86) {
    const landing = pulse((phase - 0.72) / 0.14)
    return {
      height: 0.018 * landing,
      scaleX: 1 + landing * 0.095,
      scaleY: 1 - landing * 0.125,
      scaleZ: 1 + landing * 0.095,
      rotationZ: -landing * 0.009,
      shadowScale: 1 + landing * 0.055,
      shadowOpacity: 0.22 + landing * 0.035,
      lightPoolPulse: landing,
    }
  }

  const settleT = (phase - 0.86) / 0.14
  const settle = pulse(settleT) * (1 - settleT)
  return {
    height: settle * 0.035,
    scaleX: 1 + settle * 0.018,
    scaleY: 1 - settle * 0.024,
    scaleZ: 1 + settle * 0.018,
    rotationZ: settle * 0.006,
    shadowScale: 1 - settle * 0.02,
    shadowOpacity: 0.22 - settle * 0.012,
    lightPoolPulse: settle * 0.18,
  }
}
