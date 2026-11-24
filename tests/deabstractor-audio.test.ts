import { describe, expect, it, vi, afterEach } from 'vitest'
import { apparatusScore, controlClickSamples, rollerClickTimes, SCORE_TAIL } from '../src/museum/deabstractor/audioScore'
import { durationFor, MECHANICAL_TIMING as M, mechanismPose, printerTiming, sequencePose } from '../src/museum/deabstractor/sequence'

describe('De-Abstractor sound direction and contact score', () => {
  for (const procedure of ['evacuation', 'inspection'] as const) {
    const score = apparatusScore(procedure)
    it(`${procedure}: every layer has bounded timing, gain, pitch and stereo position`, () => {
      for (const layer of score) {
        expect(layer.at).toBeGreaterThanOrEqual(0)
        expect(layer.duration).toBeGreaterThan(0)
        expect(layer.at + layer.duration + 0.1).toBeLessThan(durationFor(procedure) + SCORE_TAIL)
        expect(layer.gain).toBeGreaterThan(0)
        expect(layer.gain).toBeLessThanOrEqual(0.6)
        for (const pitch of [layer.pitch].flat()) {
          expect(pitch).toBeGreaterThan(35)
          expect(pitch).toBeLessThan(7000)
        }
        for (const pan of [layer.pan].flat()) expect(Math.abs(pan)).toBeLessThanOrEqual(0.45)
      }
      expect(score.map(layer => layer.at)).toEqual(score.map(layer => layer.at).sort((a, b) => a - b))
    })
    it(`${procedure}: stamp contact, return and feed agree with the actual geometry`, () => {
      const timing = printerTiming(procedure)
      const body = score.find(layer => layer.name === 'stamp:body')!
      expect(body.at).toBe(timing.contact)
      expect(sequencePose(body.at, procedure).stampDown).toBeCloseTo(1)
      const paper = score.find(layer => layer.name === 'paper-motor')!
      expect(paper.at).toBe(timing.feedStart)
      expect(paper.at + paper.duration).toBeCloseTo(timing.feedEnd)
      expect(sequencePose(paper.at, procedure).stampDown).toBe(0)
      expect(sequencePose(paper.at + paper.duration, procedure).reveal).toBe(1)
      expect(score.find(layer => layer.name === 'clearance-chime')!.at).toBeGreaterThanOrEqual(timing.feedEnd)
    })
    it(`${procedure}: roller teeth follow equal distances along the eased paper path`, () => {
      const clicks = rollerClickTimes(procedure)
      clicks.forEach((at, i) => expect(sequencePose(at, procedure).reveal).toBeCloseTo((i + 0.5) / clicks.length, 6))
      expect(clicks[1] - clicks[0]).toBeGreaterThan(clicks[9] - clicks[8])
      expect(clicks[17] - clicks[16]).toBeGreaterThan(clicks[9] - clicks[8])
    })
  }
  it('separates the two locks and all three pump contacts, with a quiet crest pause', () => {
    const score = apparatusScore('evacuation')
    expect(score.filter(layer => layer.name === 'brace-lock:body').map(layer => layer.at)).toEqual([M.leftLock, M.rightLock])
    expect(score.filter(layer => layer.name === 'pump-contact:body').map(layer => layer.at)).toEqual([...M.pumps])
    const flight = score.filter(layer => layer.name === 'carrier-air')
    expect(flight.map(layer => [layer.at, layer.at + layer.duration])).toEqual([[M.launch, M.crest], [M.relaunch, M.arrival]])
    expect(mechanismPose(score.find(layer => layer.name === 'dock-contact:body')!.at, 'evacuation').dockDrop).toBe(0)
    expect(apparatusScore('inspection').some(layer => /carrier|pump|brace|dock|crest/.test(layer.name))).toBe(false)
  })
})

describe('Tactile control samples', () => {
  for (const rate of [44100, 48000]) {
    it(`${rate} Hz: short, bounded double contacts decay cleanly without clipped edges`, () => {
      const variants = [0, 1, 2].map(index => controlClickSamples(rate, index))
      for (const samples of variants) {
        expect(samples.length / rate).toBeCloseTo(0.09, 4)
        expect(samples[0]).toBe(0)
        expect(Math.abs(samples.at(-1)!)).toBe(0)
        expect(samples.every(Number.isFinite)).toBe(true)
        const peak = Math.max(...samples.map(Math.abs))
        expect(peak).toBeGreaterThan(0.07)
        expect(peak).toBeLessThan(0.3)
        const energy = (from: number, to: number) => samples.slice(Math.floor(from * rate), Math.floor(to * rate)).reduce((sum, sample) => sum + sample * sample, 0) / ((to - from) * rate)
        expect(energy(0.023, 0.03)).toBeGreaterThan(energy(0.016, 0.021))
        expect(energy(0.07, 0.089)).toBeLessThan(energy(0, 0.02) * 0.002)
        let step = 0
        for (let i = 1; i < samples.length; i++) step = Math.max(step, Math.abs(samples[i] - samples[i - 1]))
        expect(step).toBeLessThan(0.14)
      }
      expect(variants[0]).not.toEqual(variants[1])
      expect(variants[1]).not.toEqual(variants[2])
      expect(controlClickSamples(rate)).toEqual(variants[0])
    })
  }
})

function fakeContext() {
  const parameter = () => ({ value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn() })
  const voices: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = []
  const context = {
    currentTime: 0, state: 'running', destination: {}, sampleRate: 48000,
    createBuffer: vi.fn((channels: number, length: number) => {
      const data = Array.from({ length: channels }, () => new Float32Array(length))
      return { getChannelData: (index: number) => data[index] }
    }),
    createGain: vi.fn(() => ({ gain: parameter(), connect: vi.fn(), disconnect: vi.fn() })),
    createBufferSource: () => {
      const source = { buffer: null, start: vi.fn(), stop: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), onended: null }
      voices.push(source); return source
    },
    resume: vi.fn(async () => { context.state = 'running' }),
    suspend: vi.fn(async () => { context.state = 'suspended' }),
    close: vi.fn(async () => { context.state = 'closed' }),
  }
  return { context, voices }
}

describe('De-Abstractor transport lifecycle', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.doUnmock('../src/museum/deabstractor/audioScore'); vi.resetModules() })
  async function setup(delayed = false) {
    vi.resetModules()
    let finish: (buffer: { duration: number }) => void = () => {}
    vi.doMock('../src/museum/deabstractor/audioScore', () => ({ controlClickSamples, renderApparatusScore: vi.fn(() => delayed ? new Promise(resolve => { finish = resolve }) : Promise.resolve({ duration: 20 })) }))
    const { context, voices } = fakeContext()
    vi.stubGlobal('AudioContext', class { constructor() { return context } })
    const { ApparatusAudio } = await import('../src/museum/deabstractor/audio')
    const player = new ApparatusAudio()
    await player.unlock()
    player.begin('evacuation')
    await Promise.resolve(); await Promise.resolve()
    return { player, context, voices, finish }
  }
  it('keeps one voice during normal playback, seeks with a fade after a stall, and never bursts missed cues', async () => {
    const { player, context, voices } = await setup()
    player.sync(0.02, true)
    context.currentTime = 4
    player.sync(4.02, true)
    expect(voices).toHaveLength(1)
    context.currentTime = 6
    player.sync(4.1, true)
    expect(voices).toHaveLength(2)
    expect(voices[0].stop).toHaveBeenCalledWith(6.015)
    expect(voices[1].start).toHaveBeenCalledWith(6, 4.1)
  })
  it('mute does not restart the track; pausing freezes it; skip closes it', async () => {
    vi.useFakeTimers()
    const { player, context, voices } = await setup()
    player.sync(0.1, true)
    player.setEnabled(false)
    context.currentTime = 2
    player.sync(2.1, true)
    player.setEnabled(true)
    expect(voices).toHaveLength(1)
    player.setPaused(true)
    expect(context.state).toBe('suspended')
    player.sync(2.1, true)
    expect(voices).toHaveLength(1)
    player.setPaused(false)
    player.sync(2.1, true)
    expect(voices).toHaveLength(1)
    player.stop()
    const master = context.createGain.mock.results[0].value.gain
    expect(master.cancelScheduledValues).toHaveBeenCalledWith(2)
    expect(master.linearRampToValueAtTime).toHaveBeenCalledWith(0, 2.012)
    await vi.advanceTimersByTimeAsync(25)
    expect(context.close).toHaveBeenCalledOnce()
    player.sync(5, true)
    expect(voices).toHaveLength(1)
  })
  it('late synthesis joins the current scene instead of starting from the beginning', async () => {
    const { player, voices, finish } = await setup(true)
    player.sync(2, true)
    expect(voices).toHaveLength(0)
    finish({ duration: 20 })
    await Promise.resolve(); await Promise.resolve()
    player.sync(2.1, true)
    expect(voices[0].start).toHaveBeenCalledWith(0, 2.1)
  })
  it('retires the score at a proof gate without repeatedly restarting it or playing future cues', async () => {
    const { player, context, voices } = await setup()
    player.sync(8, true)
    player.sync(8.05, true, true)
    for (let i = 0; i < 100; i++) { context.currentTime = i / 100; player.sync(8.05, true, true) }
    expect(voices).toHaveLength(1)
    expect(voices[0].stop).toHaveBeenCalledOnce()
    expect(player.diagnostics().holding).toBe(true)
    expect(player.diagnostics().position).toBe(null)
    context.currentTime = 1
    player.sync(8.1, true, false)
    expect(voices).toHaveLength(2)
    expect(voices[1].start).toHaveBeenCalledWith(1, 8.1)
  })
  it('can stand down without losing the audio context unlocked by the user', async () => {
    const { player, context } = await setup()
    player.sync(5, true)
    player.halt()
    expect(context.close).not.toHaveBeenCalled()
    expect(player.diagnostics().running).toBe(false)
    expect(player.diagnostics().ready).toBe(false)
    player.begin('evacuation')
    await Promise.resolve(); await Promise.resolve()
    expect(player.diagnostics().state).toBe('running')
    expect(player.diagnostics().ready).toBe(true)
  })
  it('a stopped player cannot be resurrected by a pending render', async () => {
    const { player, voices, finish } = await setup(true)
    player.stop()
    finish({ duration: 20 })
    await Promise.resolve(); await Promise.resolve()
    player.sync(1, true)
    expect(player.diagnostics().ready).toBe(false)
    expect(voices).toHaveLength(0)
  })
  it('reuses three short control samples and bounds rapid repeat sounds', async () => {
    const { player, context, voices } = await setup()
    player.tick(); player.tick(); player.tick()
    await Promise.resolve(); await Promise.resolve()
    expect(voices).toHaveLength(1)
    expect(context.createBuffer).toHaveBeenCalledTimes(3)
    context.currentTime = 0.05
    player.tick()
    await Promise.resolve(); await Promise.resolve()
    expect(voices).toHaveLength(2)
    expect(context.createBuffer).toHaveBeenCalledTimes(3)
  })
  it('control clicks obey mute/pause and cannot play after a stop while unlocking', async () => {
    const { player, voices } = await setup()
    player.setEnabled(false); player.tick()
    player.setPaused(true); player.setEnabled(true); player.tick()
    await Promise.resolve(); await Promise.resolve()
    expect(voices).toHaveLength(0)
    player.setPaused(false)
    player.tick(); player.stop()
    await Promise.resolve(); await Promise.resolve()
    expect(voices).toHaveLength(0)
  })
})
