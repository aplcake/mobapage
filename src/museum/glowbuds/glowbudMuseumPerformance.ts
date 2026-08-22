export type MuseumGlowbudPerformanceAnimation = 'wave' | 'boogie' | 'showcase' | 'hop'

export const GLOWBUD_MUSEUM_PERFORMANCE_STEPS: readonly {
  animation: MuseumGlowbudPerformanceAnimation
  duration: number
}[] = [
  { animation: 'wave', duration: 2.25 },
  { animation: 'boogie', duration: 2.95 },
  { animation: 'showcase', duration: 4.05 },
  { animation: 'hop', duration: 2.72 },
] as const

export const GLOWBUD_MUSEUM_PERFORMANCE_CYCLE_SECONDS = GLOWBUD_MUSEUM_PERFORMANCE_STEPS
  .reduce((total, step) => total + step.duration, 0)

function positiveModulo(value: number, modulus: number) {
  return ((value % modulus) + modulus) % modulus
}

export function glowbudMuseumPerformanceAtTime(tokenId: string, elapsedSeconds: number) {
  const numericTokenId = Number.parseInt(tokenId, 10) || 0
  const sequenceOffset = positiveModulo(numericTokenId, GLOWBUD_MUSEUM_PERFORMANCE_STEPS.length)
  const tokenTimeOffset = positiveModulo(numericTokenId * 17, 97) / 97
    * GLOWBUD_MUSEUM_PERFORMANCE_CYCLE_SECONDS
  const cycleTime = positiveModulo(
    elapsedSeconds + tokenTimeOffset,
    GLOWBUD_MUSEUM_PERFORMANCE_CYCLE_SECONDS,
  )

  let cursor = 0
  for (let index = 0; index < GLOWBUD_MUSEUM_PERFORMANCE_STEPS.length; index += 1) {
    const sequenceIndex = (index + sequenceOffset) % GLOWBUD_MUSEUM_PERFORMANCE_STEPS.length
    const step = GLOWBUD_MUSEUM_PERFORMANCE_STEPS[sequenceIndex]!
    const nextCursor = cursor + step.duration
    if (cycleTime < nextCursor || index === GLOWBUD_MUSEUM_PERFORMANCE_STEPS.length - 1) {
      return {
        animation: step.animation,
        cycleTime,
        progress: Math.min(1, Math.max(0, (cycleTime - cursor) / step.duration)),
        sequenceIndex,
      }
    }
    cursor = nextCursor
  }

  return { animation: 'wave' as const, cycleTime: 0, progress: 0, sequenceIndex: 0 }
}
