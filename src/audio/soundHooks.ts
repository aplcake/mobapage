export type SoundEventName =
  | 'suctionBedStart'
  | 'suctionBedStop'
  | 'slimeCaptureSoft'
  | 'slimeStringTension'
  | 'gulpSmall'
  | 'gulpMedium'
  | 'gulpCluster'
  | 'recoilThunk'
  | 'reemergeBubble'
  | 'stretchSnapSeal'
  | 'stretchSnapStrain'
  | 'stretchSnapGulp'
  | 'stretchSnapPop'
  | 'stretchSnapCatch'

export function playSoundHook(name: SoundEventName, muted: boolean) {
  if (muted) return
  // Audio assets are intentionally not bundled in this handoff pass.
  // The named hook preserves event timing and keeps future audio integration scoped.
  void name
}
