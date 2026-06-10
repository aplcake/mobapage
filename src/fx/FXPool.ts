import * as THREE from 'three'
import { SLURPER_PARAMS } from '../core/parameters'
import { seededNoise } from '../core/math'
import type { FXEvent, FXKind } from './fxTypes'

const KIND_DURATIONS: Record<FXKind, number> = {
  starburst: 0.14,
  puff: 0.28,
  tick: 0.1,
  splat: 0.22,
  debris: 0.26,
}

export class FXPool {
  events: FXEvent[] = []

  spawnGulpBurst(position: THREE.Vector3, intensity: number, palette: number, time: number, count = 1) {
    const base = position.clone()
    const total = Math.min(34, 5 + Math.round(intensity * 10) + Math.min(10, count) * 2)
    const starCount = count > 5 ? 3 : count > 2 ? 2 : 1
    for (let s = 0; s < starCount; s += 1) {
      const offsetAngle = (s / starCount) * Math.PI * 2
      const offset = new THREE.Vector3(Math.cos(offsetAngle) * 0.1 * s, 0.02 * s, Math.sin(offsetAngle) * 0.1 * s)
      this.add('starburst', base.clone().add(offset), new THREE.Vector3(), time + s * 0.025, intensity * (1 - s * 0.12), palette)
    }
    for (let i = 0; i < total; i += 1) {
      const angle = (i / total) * Math.PI * 2
      const ring = i % 2 === 0 ? 1 : 0.55
      const speed = 0.38 + seededNoise(i + time) * (0.85 + intensity * 0.28)
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed * ring,
        0.36 + seededNoise(i + 4) * 0.44 + Math.min(0.22, count * 0.018),
        Math.sin(angle) * speed * ring,
      )
      const kind = i % 5 === 0 ? 'debris' : i % 3 === 0 ? 'tick' : 'puff'
      this.add(kind, base, velocity, time + seededNoise(i + 9) * 0.04, intensity, palette)
    }
  }

  add(kind: FXKind, position: THREE.Vector3, velocity: THREE.Vector3, time: number, intensity: number, palette: number) {
    if (this.events.length >= SLURPER_PARAMS.fx.maxEvents) this.events.shift()
    this.events.push({
      kind,
      position: position.clone(),
      velocity: velocity.clone(),
      startTime: time,
      duration: KIND_DURATIONS[kind] * (0.8 + intensity * 0.45),
      intensity,
      palette,
      frame: 0,
    })
  }

  update(time: number) {
    this.events = this.events.filter((event) => time - event.startTime < event.duration)
  }

  active(kind?: FXKind) {
    return kind ? this.events.filter((event) => event.kind === kind) : this.events
  }
}
