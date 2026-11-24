import { durationFor, MECHANICAL_TIMING as M, printerTiming, smoothRange, type Procedure } from './sequence'

type Curve = number | readonly number[]
export type SoundLayer = {
  name: string
  at: number
  duration: number
  source: 'sine' | 'triangle' | 'noise'
  pitch: Curve
  gain: number
  pan: Curve
  envelope: 'tap' | 'air' | 'motor'
  attack?: number
  q?: number
  flutter?: number
  wobble?: number
  room?: number
}

export const SCORE_TAIL = 1.4
export const SOUND_PEAK_LIMIT = 0.68

// A two-part plastic/wood detent: damped resonances, not a pitched notification.
// Short band-limited contact noise adds definition without a raw digital impulse.
export function controlClickSamples(rate: number, variation = 0) {
  const samples = new Float32Array(Math.ceil(rate * 0.09))
  const tune = [1, 0.96, 1.035][variation % 3]
  const lowpass = 1 - Math.exp(-2 * Math.PI * 4200 / rate)
  const highpass = 1 - Math.exp(-2 * Math.PI * 1100 / rate)
  let seed = 9317 + variation * 107, low = 0, lowMid = 0
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    low += lowpass * (seed / 2147483648 - 1 - low)
    lowMid += highpass * (low - lowMid)
    const time = i / rate
    let sample = 0
    for (const [at, strength, pitch] of [[0, 1, 480], [0.022, 0.43, 390]]) {
      const t = time - at
      if (t < 0) continue
      const attack = Math.min(1, t / 0.0008)
      sample += strength * attack * (
        0.18 * Math.sin(2 * Math.PI * pitch * tune * t) * Math.exp(-t / 0.008)
        + 0.075 * Math.sin(2 * Math.PI * pitch * 3.17 * tune * t) * Math.exp(-t / 0.003)
        + 0.16 * (low - lowMid) * Math.exp(-t / 0.0024))
    }
    samples[i] = sample * Math.min(1, (samples.length - 1 - i) / (rate * 0.006))
  }
  return samples
}

// Roller teeth follow distance, not time: cadence accelerates with the physical sheet.
export function rollerClickTimes(procedure: Procedure, count = 18) {
  const { feedStart, feedEnd } = printerTiming(procedure)
  return Array.from({ length: count }, (_, i) => {
    const distance = (i + 0.5) / count
    let low = 0, high = 1
    for (let n = 0; n < 24; n++) {
      const mid = (low + high) / 2
      if (smoothRange(mid, 0, 1) < distance) low = mid
      else high = mid
    }
    return feedStart + (low + high) / 2 * (feedEnd - feedStart)
  })
}

export function apparatusScore(procedure: Procedure): SoundLayer[] {
  const layers: SoundLayer[] = []
  const add = (name: string, at: number, duration: number, source: SoundLayer['source'], pitch: Curve, gain: number, pan: Curve, extra: Partial<SoundLayer> = {}) => {
    layers.push({ name, at, duration, source, pitch, gain, pan, envelope: 'tap', room: 0.08, ...extra })
  }
  const tap = (name: string, at: number, pitch: number, gain: number, pan: number) => {
    add(`${name}:body`, at, 0.105, 'sine', [pitch * 1.14, pitch, pitch * 0.98], gain, pan, { attack: 0.0015, room: 0.035 })
    add(`${name}:contact`, at, 0.022, 'noise', [3100, 2100], gain * 0.82, pan, { attack: 0.0008, q: 0.85, room: 0.008 })
    add(`${name}:housing`, at + 0.001, 0.058, 'sine', pitch * 3.17, gain * 0.27, pan, { attack: 0.001, room: 0.025 })
    add(`${name}:catch`, at + 0.026, 0.026, 'noise', [1850, 1150], gain * 0.32, pan, { attack: 0.001, q: 1.1, room: 0.008 })
  }
  const servo = (name: string, at: number, duration: number, pan: number, pitch: Curve = [160, 260, 130]) => {
    add(`${name}:gear`, at, duration, 'triangle', pitch, 0.042, pan, { envelope: 'motor', flutter: 31, room: 0.035 })
    add(`${name}:friction`, at, duration, 'noise', [720, 1500, 680], 0.034, pan, { envelope: 'motor', q: 0.7, room: 0.02 })
  }
  const air = (name: string, at: number, duration: number, pan: Curve, gain = 0.14) => {
    add(name, at, duration, 'noise', [480, 1800, 950, 360], gain, pan, { envelope: 'air', q: 0.65, room: 0.04 })
  }

  // Friendly analogue equipment: a physical lever, two curious scans, then an acknowledgement.
  tap('lever-detent', 0.12, 230, 0.2, -0.32)
  servo('lever', 0.14, 0.34, -0.32, [220, 145])
  tap('lever-seat', 0.48, 145, 0.15, -0.32)
  for (const [index, at] of [0.6, 1.65].entries()) {
    servo('scanner-sweep', at, index ? 1.15 : 1, -0.4, index ? [390, 240, 310] : [250, 410, 310])
    add('scanner-glass', at + 0.48, 0.2, 'sine', index ? [880, 1046.5] : [659.25, 880], 0.06, -0.4, { attack: 0.015 })
    tap('scanner-endstop', index ? 2.8 : 1.6, index ? 360 : 410, 0.065, -0.4)
  }
  add('scan-acknowledged', 2.88, 0.28, 'sine', 1046.5, 0.08, -0.36)
  add('scan-acknowledged', 2.99, 0.32, 'sine', 1318.5, 0.05, -0.36)

  if (procedure === 'evacuation') {
    for (const [at, pan, pitch] of [[M.leftLock, -0.38, 125], [M.rightLock, 0.14, 146]]) {
      servo('brace-slide', at - 0.4, 0.4, pan)
      tap('brace-lock', at, pitch, 0.32, pan)
      add('brace-rubber', at, 0.2, 'triangle', [95, 52], 0.045, pan)
    }
    add('pressure-motor', 5.1, M.launch - 5.1, 'triangle', [62, 85, 145, 220], 0.07, -0.2, { envelope: 'motor', flutter: 24, room: 0.025 })
    air('pressure-bellows', 5.1, M.launch - 5.1, -0.2, 0.045)
    M.pumps.forEach((at, i) => {
      air('pump-inhale', at - 0.23, 0.23, -0.18, 0.08 + i * 0.02)
      tap('pump-contact', at, 140 + i * 27, 0.24 + i * 0.035, -0.18)
      add('pump-squeak', at + 0.018, 0.2, 'sine', [310 + i * 50, 190 + i * 35], 0.065, -0.18, { wobble: 11 })
      add('bellows-rebound', at + 0.12, 0.24, 'sine', [170 + i * 25, 320 + i * 35, 185], 0.055, -0.18, { wobble: 14, room: 0.05 })
    })
    for (const [at, end, pan, endPan, second] of [[M.launch, M.crest, -0.3, 0.04, 0], [M.relaunch, M.arrival, 0.04, 0.38, 1]]) {
      const length = end - at
      air('carrier-air', at, length, [pan, endPan], 0.17)
      add('carrier-whistle', at, length, 'sine', second ? [270, 530, 410, 180] : [180, 440, 610, 270], 0.085, [pan, endPan], { envelope: 'motor', wobble: 8, room: 0.12 })
      add('carrier-body', at, length, 'triangle', second ? [83, 140, 112, 67] : [75, 130, 150, 90], 0.075, [pan, endPan], { envelope: 'motor', flutter: 18 })
    }
    // An elastic complaint, then actual breathing space before relaunch.
    add('crest-spring', M.crest, 0.3, 'sine', [420, 170, 240, 150], 0.12, 0.04, { wobble: 18, room: 0.05 })
    tap('relaunch-valve', M.relaunch, 190, 0.19, 0.04)
    tap('dock-contact', M.arrival, 112, 0.32, 0.38)
    add('dock-cushion', M.arrival, 0.34, 'sine', [160, 67, 95, 70], 0.16, 0.38)
    air('dock-exhaust', M.vents[2], 0.4, 0.38, 0.1)
    servo('brace-release-left', 14.8, 1.2, -0.38, [160, 100])
    servo('brace-release-right', 15.05, 1.2, 0.14, [190, 115])
    tap('brace-park-left', 16, 160, 0.1, -0.38)
    tap('brace-park-right', 16.25, 180, 0.1, 0.14)
  }

  const printer = printerTiming(procedure)
  const pan = 0.32
  air('stamp-descent', printer.contact - 0.27, 0.27, pan, 0.13)
  // Rubber slap + low body + a small brass resonance, all at physical contact.
  add('stamp:body', printer.contact, 0.27, 'sine', [125, 65, 43], 0.5, pan, { attack: 0.0015, room: 0.085 })
  add('stamp:rubber', printer.contact, 0.065, 'noise', [1700, 900], 0.42, pan, { attack: 0.001, q: 0.7, room: 0.045 })
  add('stamp:face', printer.contact, 0.019, 'noise', [3500, 2200], 0.24, pan, { attack: 0.0008, q: 0.85, room: 0.012 })
  add('stamp:wood', printer.contact + 0.002, 0.075, 'triangle', [360, 295, 285], 0.16, pan, { attack: 0.001, room: 0.045 })
  for (const [i, hz] of [477, 763, 1129].entries()) {
    add('stamp:brass', printer.contact + 0.009, 0.24 - i * 0.045, 'sine', hz, 0.045 / (i + 1), pan)
  }
  servo('stamp-return', printer.contact + 0.2, 0.6, pan, [125, 215, 150])
  tap('stamp-return-seat', printer.contact + 0.8, 210, 0.09, pan)

  const feedLength = printer.feedEnd - printer.feedStart
  add('paper-motor', printer.feedStart, feedLength, 'triangle', [100, 190, 245, 190, 100], 0.045, pan, { envelope: 'motor', flutter: 43, room: 0.015 })
  add('paper-fibre', printer.feedStart, feedLength, 'noise', [1100, 2250, 3000, 2100, 850], 0.07, pan, { envelope: 'motor', q: 0.6, flutter: 61, room: 0.012 })
  rollerClickTimes(procedure).forEach((at, i) => {
    const accent = i % 3 === 0 ? 1 : 0.78
    add('roller-tooth', at, 0.017, 'noise', [2850 + (i % 3) * 160, 1650], 0.22 * accent, pan, { attack: 0.0008, q: 1.1, room: 0.008 })
    add('roller-hub', at, 0.05, 'sine', [540 + (i % 2) * 45, 460], 0.075 * accent, pan, { attack: 0.001, room: 0.012 })
    add('roller-pawl', at + 0.018, 0.012, 'noise', 2500, 0.045 * accent, pan, { attack: 0.0008, q: 0.8, room: 0.005 })
  })
  air('paper-laydown', printer.feedEnd - 0.035, 0.17, pan, 0.14)
  tap('roller-stop', printer.feedEnd, 260, 0.09, pan)

  // A compact celesta-like signature. No looping music competing with the actions.
  for (const [i, hz] of [698.46, 880, 1046.5].entries()) {
    const at = printer.clear + i * 0.105
    add('clearance-chime', at, 0.75 - i * 0.08, 'sine', hz, 0.145, 0.16 + i * 0.06, { attack: 0.007, room: 0.16 })
    add('clearance-chime:bell', at, 0.19, 'sine', hz * 2.003, 0.03, 0.16 + i * 0.06, { room: 0.12 })
  }
  add('clearance-warmth', printer.clear, 0.75, 'sine', 349.23, 0.07, 0.2, { attack: 0.025, room: 0.12 })
  return layers.sort((a, b) => a.at - b.at)
}

function interpolate(curve: Curve, t: number) {
  if (typeof curve === 'number') return curve
  const index = Math.min(curve.length - 1, t * (curve.length - 1)), low = Math.floor(index)
  return curve[low] + (curve[Math.min(low + 1, curve.length - 1)] - curve[low]) * (index - low)
}

function automate(parameter: AudioParam, at: number, duration: number, value: (t: number) => number) {
  const count = Math.max(96, Math.ceil(duration * 512))
  parameter.setValueCurveAtTime(Float32Array.from({ length: count }, (_, i) => value(i / (count - 1))), at, duration)
}

export async function renderApparatusScore(procedure: Procedure): Promise<AudioBuffer> {
  const rate = 44100
  const context = new OfflineAudioContext(2, Math.ceil((durationFor(procedure) + SCORE_TAIL) * rate), rate)
  const dry = context.createGain(), room = context.createGain()
  const highpass = context.createBiquadFilter(), lowpass = context.createBiquadFilter()
  highpass.type = 'highpass'; highpass.frequency.value = 38
  lowpass.type = 'lowpass'; lowpass.frequency.value = 6100; lowpass.Q.value = 0.5
  dry.connect(highpass); highpass.connect(lowpass); lowpass.connect(context.destination)
  // Quiet early reflections place everything in the same little mechanical cabinet.
  for (const [delay, gain, pan] of [[0.029, 0.32, -0.3], [0.057, 0.18, 0.35], [0.091, 0.08, -0.15]]) {
    const echo = context.createDelay(0.2), level = context.createGain(), stereo = context.createStereoPanner()
    echo.delayTime.value = delay; level.gain.value = gain; stereo.pan.value = pan
    room.connect(echo); echo.connect(level); level.connect(stereo); stereo.connect(highpass)
  }
  const noise = context.createBuffer(1, rate * 3, rate)
  const data = noise.getChannelData(0)
  let seed = 8675309
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    data[i] = seed / 2147483648 - 1
  }
  for (const [index, layer] of apparatusScore(procedure).entries()) {
    const source = layer.source === 'noise' ? context.createBufferSource() : context.createOscillator()
    const filter = context.createBiquadFilter(), envelope = context.createGain(), stereo = context.createStereoPanner(), send = context.createGain()
    if (source instanceof AudioBufferSourceNode) {
      source.buffer = noise; source.loop = true
      filter.type = 'bandpass'; filter.Q.value = layer.q ?? 0.8
      automate(filter.frequency, layer.at, layer.duration, t => interpolate(layer.pitch, t))
    } else {
      source.type = layer.source === 'noise' ? 'sine' : layer.source
      automate(source.frequency, layer.at, layer.duration, t => interpolate(layer.pitch, t) * (1 + (layer.wobble ? 0.045 * Math.sin(t * layer.duration * layer.wobble * Math.PI * 2) * (1 - t) : 0)))
      filter.type = 'lowpass'; filter.frequency.value = 4200; filter.Q.value = 0.5
    }
    automate(envelope.gain, layer.at, layer.duration, t => {
      const attack = Math.min(1, t * layer.duration / (layer.attack ?? 0.004))
      const shape = layer.envelope === 'motor' ? Math.sin(Math.PI * t) ** 0.7
        : layer.envelope === 'air' ? Math.sin(Math.PI * t) ** 1.2
          : Math.exp(-6 * t) * Math.min(1, (1 - t) * 30)
      const flutter = layer.flutter ? 0.84 + 0.16 * Math.sin(t * layer.duration * layer.flutter * Math.PI * 2) : 1
      return layer.gain * attack * shape * flutter
    })
    automate(stereo.pan, layer.at, layer.duration, t => interpolate(layer.pan, t))
    send.gain.value = layer.room ?? 0.08
    source.connect(filter); filter.connect(envelope); envelope.connect(stereo); stereo.connect(dry); stereo.connect(send); send.connect(room)
    if (source instanceof AudioBufferSourceNode) source.start(layer.at, (index * 0.173) % 2)
    else source.start(layer.at)
    source.stop(layer.at + layer.duration)
  }
  const rendered = await context.startRendering()
  let peak = 0
  for (let channel = 0; channel < 2; channel++) {
    for (const sample of rendered.getChannelData(channel)) peak = Math.max(peak, Math.abs(sample))
  }
  // Fixed mix gain plus a peak guard, never per-cue normalization or pumping compression.
  const gain = Math.min(1.18, SOUND_PEAK_LIMIT / Math.max(peak, 0.001))
  for (let channel = 0; channel < 2; channel++) {
    const samples = rendered.getChannelData(channel)
    for (let i = 0; i < samples.length; i++) samples[i] *= gain
  }
  return rendered
}
