export function triggerHaptic(intensity: number, pointerActive: boolean) {
  if (!pointerActive || typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  const ms = Math.round(10 + Math.min(30, intensity * 18))
  navigator.vibrate(ms)
}
