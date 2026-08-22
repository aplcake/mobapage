import { useCallback, useEffect, useRef } from 'react'
import type { RedShellCritterAnimation } from '../../code-examples/RedShellIdleCritterAsset.example'

type AudioWindow = typeof window & {
  webkitAudioContext?: typeof AudioContext
}

type ToneShape = OscillatorType | 'chime'

export function useGlowbudDisplayAudio(muted: boolean) {
  const contextRef = useRef<AudioContext | null>(null)

  const getContext = useCallback(() => {
    if (muted) return null
    const AudioContextConstructor = window.AudioContext
      ?? (window as AudioWindow).webkitAudioContext
    if (!AudioContextConstructor) return null
    const context = contextRef.current ?? new AudioContextConstructor()
    contextRef.current = context
    if (context.state === 'suspended') void context.resume()
    return context
  }, [muted])

  const tone = useCallback((
    frequency: number,
    duration: number,
    volume: number,
    delay = 0,
    shape: ToneShape = 'triangle',
  ) => {
    const context = getContext()
    if (!context) return

    const start = context.currentTime + delay
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = shape === 'chime' ? 'sine' : shape
    oscillator.frequency.setValueAtTime(frequency, start)
    if (shape === 'chime') oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.012, start + duration)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.018)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }, [getContext])

  const sweep = useCallback((
    fromFrequency: number,
    toFrequency: number,
    duration: number,
    volume: number,
    delay = 0,
  ) => {
    const context = getContext()
    if (!context) return

    const start = context.currentTime + delay
    const oscillator = context.createOscillator()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(fromFrequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(toFrequency, start + duration)
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(Math.max(240, fromFrequency * 1.8), start)
    filter.frequency.exponentialRampToValueAtTime(Math.max(420, toFrequency * 2.2), start + duration)
    filter.Q.value = 1.1
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.028)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(filter)
    filter.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }, [getContext])

  const playUi = useCallback(() => {
    tone(310, 0.07, 0.025, 0, 'square')
  }, [tone])

  const playTrait = useCallback((categoryIndex: number) => {
    const root = 250 + (categoryIndex % 6) * 34
    const interval = categoryIndex % 3 === 0 ? 1.25 : categoryIndex % 3 === 1 ? 1.333 : 1.5
    sweep(root * 0.52, root * 1.08, 0.25, 0.018)
    tone(root, 0.09, 0.032, 0, 'triangle')
    tone(root * interval, 0.14, 0.024, 0.052, 'chime')
    tone(root * 2, 0.22, 0.014, 0.13, 'chime')
  }, [sweep, tone])

  const playPose = useCallback((animation: RedShellCritterAnimation) => {
    if (animation === 'hop') {
      tone(440, 0.1, 0.036, 0, 'triangle')
      tone(660, 0.11, 0.024, 0.055, 'chime')
      return
    }
    if (animation === 'grumble') {
      tone(145, 0.18, 0.036, 0, 'sawtooth')
      return
    }
    if (animation === 'wave') {
      tone(330, 0.13, 0.025, 0, 'triangle')
      tone(495, 0.2, 0.022, 0.075, 'chime')
      return
    }
    if (animation === 'boogie') {
      ;[220, 275, 330].forEach((frequency, index) => {
        tone(frequency, 0.11, 0.022, index * 0.095, 'triangle')
      })
      return
    }
    if (animation === 'showcase') {
      tone(392, 0.22, 0.021, 0, 'chime')
      tone(523.25, 0.28, 0.018, 0.12, 'chime')
    }
  }, [tone])

  const playReveal = useCallback(() => {
    ;[196, 293.66, 392, 587.33].forEach((frequency, index) => {
      tone(frequency, 0.46 - index * 0.035, 0.034, index * 0.095, index === 3 ? 'chime' : 'triangle')
    })
    tone(880, 0.48, 0.022, 0.36, 'chime')
    tone(1174.66, 0.58, 0.018, 0.43, 'chime')
  }, [tone])

  useEffect(() => () => {
    const context = contextRef.current
    contextRef.current = null
    if (context && context.state !== 'closed') void context.close()
  }, [])

  return { playUi, playTrait, playPose, playReveal }
}
