import * as THREE from 'three'

export type FXKind = 'starburst' | 'puff' | 'tick' | 'splat' | 'debris'

export type FXEvent = {
  kind: FXKind
  position: THREE.Vector3
  velocity: THREE.Vector3
  startTime: number
  duration: number
  intensity: number
  palette: number
  frame: number
}
