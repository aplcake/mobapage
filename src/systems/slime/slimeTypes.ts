import * as THREE from 'three'

export enum SlimeState {
  Idle = 'idle',
  Captured = 'captured',
  Stretching = 'stretching',
  Stringing = 'stringing',
  Residue = 'residue',
  Gulped = 'gulped',
  Reemerging = 'reemerging',
}

export type SlimePiece = {
  id: number
  patchId: number
  state: SlimeState
  position: THREE.Vector3
  previousPosition: THREE.Vector3
  homePosition: THREE.Vector3
  velocity: THREE.Vector3
  radius: number
  vitality: number
  phase: number
  paletteIndex: number
  personalitySwirl: number
  suctionInfluence: number
  capturedAt: number
  gulpScheduledAt: number
  respawnAt: number
  stretch: number
  strandWidth: number
  residueLife: number
  reemergeSite: number
}

export type RespawnSite = {
  id: number
  position: THREE.Vector3
  radius: number
  mode: 'spout' | 'grate' | 'drain' | 'pump' | 'crack'
}

export type SlimeStepContext = {
  time: number
  dt: number
  mouth: THREE.Vector3
  suctionScale: number
  respawnSites: RespawnSite[]
}

export type SlimeStepResult = {
  gulped: boolean
  reemerged: boolean
}
