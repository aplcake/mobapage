import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const avatarSource = readFileSync(
  new URL('../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx', import.meta.url),
  'utf8',
)

const displaySource = readFileSync(
  new URL('../docs/asset-generation/preview/red-shell/display.tsx', import.meta.url),
  'utf8',
)

const audioSource = readFileSync(
  new URL('../docs/asset-generation/preview/red-shell/glowbudsDisplayAudio.ts', import.meta.url),
  'utf8',
)

describe('Glowbud automatic performance system', () => {
  it('layers shared ambient acting without disturbing held-item contact', () => {
    expect(avatarSource).toContain('function getAmbientLifeMotion')
    expect(avatarSource).toContain('function useAnimationActionTimer')
    expect(avatarSource).toContain('action.current.animation !== animation')
    expect(avatarSource).toContain('const doubleBlink = Math.max(')
    expect(avatarSource).toContain('const greeting = !holdsItem')
    expect(avatarSource).toContain('function AmbientPlantMotionRig')
    expect(avatarSource).toContain('<GlowbudAnimationContext.Provider value={animation}>')
    expect(avatarSource).toContain('ambient.plantSway - hop.rotateZ')
  })

  it('adds authored performances without replacing selected traits or breaking held-item contact', () => {
    expect(avatarSource).toContain("| 'wave'")
    expect(avatarSource).toContain("| 'boogie'")
    expect(avatarSource).toContain("| 'showcase'")
    expect(avatarSource).toContain('function getDirectedPerformanceMotion')
    expect(avatarSource).toContain('showcaseTurn: showcaseArc * Math.PI * 0.87')
    expect(avatarSource).toContain("const performanceWaveSide: -1 | 1 = heldTrait === 'wizard-staff' ? 1 : -1")
    expect(avatarSource).toContain('performance.heldLift * (holdsItem ? 1 : 0)')
    expect(avatarSource).toContain('performance.plantRotateZ')
    expect(avatarSource).toContain('performance.companionLook')
  })

  it('directs sparse actions automatically while keeping deterministic capture overrides', () => {
    expect(displaySource).toContain('function readAutomaticPerformanceEnabled()')
    expect(displaySource).toContain("has('animation')")
    expect(displaySource).toContain("'wave',\n      'hop',\n      'boogie',\n      'showcase'")
    expect(displaySource).toContain('const DIRECTED_ANIMATION_DURATIONS: Record<RedShellCritterAnimation, number>')
    expect(displaySource).toContain("|| requested === 'wave'")
    expect(displaySource).toContain("|| requested === 'boogie'")
    expect(displaySource).toContain("|| requested === 'showcase'")
    expect(displaySource).toContain("performanceMode: automaticPerformance ? 'automatic' : 'directed'")
    expect(displaySource).toContain('data-animation={animation}')
    expect(displaySource).toContain("data-performance-mode={automaticPerformance ? 'automatic' : 'directed'}")
    expect(displaySource).toContain('prefers-reduced-motion: reduce')
    expect(displaySource).not.toContain('aria-label="Animation"')
    expect(displaySource).not.toContain('chooseAnimation')
  })

  it('gives each hidden performance a restrained matching sound cue', () => {
    expect(audioSource).toContain("animation === 'wave'")
    expect(audioSource).toContain("animation === 'boogie'")
    expect(audioSource).toContain("animation === 'showcase'")
  })
})
