import { controlClickSamples, renderApparatusScore } from './audioScore'
import { type Procedure } from './sequence'

const scores = new Map<Procedure, Promise<AudioBuffer>>()
function scoreFor(procedure: Procedure) {
  let score = scores.get(procedure)
  if (!score) {
    score = renderApparatusScore(procedure).catch(error => { scores.delete(procedure); throw error })
    scores.set(procedure, score)
  }
  return score
}

export class ApparatusAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private voice: { source: AudioBufferSourceNode; level: GainNode; started: number; offset: number } | null = null
  private buffer: AudioBuffer | null = null
  private procedure: Procedure | null = null
  private enabled = true
  private paused = false
  private generation = 0
  private elapsed = 0
  private running = false
  private clickBuffers: AudioBuffer[] | null = null
  private clickIndex = 0
  private lastClickAt = -Infinity
  private holding = false
  private lastHoldAt = -Infinity

  // Offline synthesis is silent and cached. Live playback remains gated by a user gesture.
  prepare() {
    void scoreFor('evacuation').then(() => scoreFor('inspection')).catch(() => {})
  }

  async unlock() {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' })
      this.master = this.context.createGain()
      this.master.gain.value = this.enabled ? 0.78 : 0
      this.master.connect(this.context.destination)
    }
    if (this.context.state === 'suspended' && !this.paused) await this.context.resume()
  }

  begin(procedure: Procedure) {
    this.retireVoice()
    this.buffer = null
    this.procedure = procedure
    this.elapsed = 0
    this.running = true
    this.holding = false
    const generation = ++this.generation
    void scoreFor(procedure).then(buffer => {
      if (generation === this.generation) this.buffer = buffer
    }).catch(() => {})
  }

  setEnabled(value: boolean) {
    this.enabled = value
    if (this.context && this.master) this.master.gain.setTargetAtTime(value ? 0.78 : 0, this.context.currentTime, 0.012)
  }

  setPaused(value: boolean) {
    this.paused = value
    if (!this.context || this.context.state === 'closed') return
    void (value ? this.context.suspend() : this.context.resume()).catch(() => {})
  }

  private retireVoice() {
    const voice = this.voice, context = this.context
    this.voice = null
    if (!voice || !context) return
    voice.level.gain.cancelScheduledValues(context.currentTime)
    voice.level.gain.setValueAtTime(voice.level.gain.value, context.currentTime)
    voice.level.gain.linearRampToValueAtTime(0, context.currentTime + 0.012)
    voice.source.stop(context.currentTime + 0.015)
  }

  // One rendered buffer means muted/unlocked/late frames never queue stale cue bursts.
  // The scene is authoritative, including its deliberate slowdown on a stalled frame.
  sync(elapsed: number, running: boolean, holding = false) {
    this.elapsed = elapsed
    this.running = running
    const context = this.context
    if (holding) {
      if (!this.holding) { this.retireVoice(); this.lastHoldAt = context?.currentTime ?? 0 }
      this.holding = true
      // A quiet pneumatic detent every two seconds, not a repeated slice of the
      // departure score. No arrival chime can play while proof is outstanding.
      if (running && context?.state === 'running' && !this.paused && context.currentTime - this.lastHoldAt >= 2) {
        this.lastHoldAt = context.currentTime; this.tick()
      }
      return
    }
    this.holding = false
    if (!context || context.state !== 'running' || this.paused || !this.buffer || !this.master || !this.procedure) return
    if (!running) return // Let the final chime decay; skip/reset explicitly calls stop().
    const position = this.voice ? this.voice.offset + context.currentTime - this.voice.started : elapsed
    if (this.voice && Math.abs(position - elapsed) <= 0.055) return
    this.retireVoice()
    if (elapsed >= this.buffer.duration) return
    const source = context.createBufferSource(), level = context.createGain()
    source.buffer = this.buffer
    level.gain.setValueAtTime(0, context.currentTime)
    level.gain.linearRampToValueAtTime(1, context.currentTime + 0.009)
    source.connect(level); level.connect(this.master)
    this.voice = { source, level, offset: elapsed, started: context.currentTime }
    source.onended = () => { source.disconnect(); level.disconnect(); if (this.voice?.source === source) this.voice = null }
    source.start(context.currentTime, elapsed)
  }

  tick() {
    if (!this.enabled || this.paused) return
    const generation = this.generation
    void this.unlock().then(() => {
      const context = this.context
      if (!context || !this.master || !this.enabled || this.paused || generation !== this.generation) return
      const now = context.currentTime
      if (now - this.lastClickAt < 0.045) return
      this.lastClickAt = now
      this.clickBuffers ??= [0, 1, 2].map(variation => {
        const samples = controlClickSamples(context.sampleRate, variation)
        const buffer = context.createBuffer(1, samples.length, context.sampleRate)
        buffer.getChannelData(0).set(samples)
        return buffer
      })
      const source = context.createBufferSource()
      source.buffer = this.clickBuffers[this.clickIndex++ % this.clickBuffers.length]
      source.connect(this.master)
      source.onended = () => source.disconnect()
      source.start(now)
    }).catch(() => {})
  }

  diagnostics() {
    const context = this.context, voice = this.voice
    return {
      state: context?.state ?? 'locked', ready: Boolean(this.buffer), enabled: this.enabled,
      paused: this.paused, running: this.running, scene: this.elapsed,
      position: context && voice ? voice.offset + context.currentTime - voice.started : null,
      procedure: this.procedure,
      holding: this.holding,
    }
  }

  halt() {
    ++this.generation
    this.retireVoice()
    this.running = false; this.holding = false; this.buffer = null
  }

  stop() {
    ++this.generation
    const context = this.context
    this.retireVoice()
    if (context?.state === 'running' && this.master) {
      // UI detents also need a short release when navigation interrupts them.
      this.master.gain.cancelScheduledValues(context.currentTime)
      this.master.gain.setValueAtTime(this.master.gain.value, context.currentTime)
      this.master.gain.linearRampToValueAtTime(0, context.currentTime + 0.012)
    }
    this.running = false
    this.lastClickAt = -Infinity
    this.voice = null; this.context = null; this.master = null; this.buffer = null; this.procedure = null
    if (context && context.state !== 'closed') {
      if (context.state === 'running') setTimeout(() => { void context.close().catch(() => {}) }, 20)
      else void context.close().catch(() => {})
    }
  }
}
