import type { OwnedNftAnimationKind } from './ownedNfts'

export type FormalRoomMotionAttempt = 'image' | 'video'

export const FORMAL_ROOM_ANIMATED_IMAGE_MAX_FPS = 15
export const FORMAL_ROOM_ANIMATED_IMAGE_MOBILE_LONG_EDGE = 512
export const FORMAL_ROOM_ANIMATED_IMAGE_DESKTOP_LONG_EDGE = 768
export const FORMAL_ROOM_POSTER_MOBILE_LONG_EDGE = 768
export const FORMAL_ROOM_POSTER_DESKTOP_LONG_EDGE = 1024

export function formalRoomMotionAttemptOrder(
  hint: OwnedNftAnimationKind | undefined,
): readonly FormalRoomMotionAttempt[] {
  if (hint === 'image') return ['image']
  if (hint === 'video') return ['video']
  return ['video', 'image']
}

export function formalRoomAnimatedImageLongEdge(viewportWidth: number): number {
  return viewportWidth <= 700
    ? FORMAL_ROOM_ANIMATED_IMAGE_MOBILE_LONG_EDGE
    : FORMAL_ROOM_ANIMATED_IMAGE_DESKTOP_LONG_EDGE
}

export function formalRoomPosterLongEdge(viewportWidth: number): number {
  return viewportWidth <= 700
    ? FORMAL_ROOM_POSTER_MOBILE_LONG_EDGE
    : FORMAL_ROOM_POSTER_DESKTOP_LONG_EDGE
}

export function shouldPaintFormalRoomAnimationFrame(
  nowMs: number,
  lastPaintedAtMs: number,
  active: boolean,
): boolean {
  if (!active) return false
  return nowMs - lastPaintedAtMs >= 1000 / FORMAL_ROOM_ANIMATED_IMAGE_MAX_FPS
}

export function containFormalRoomMotion(
  frameSize: readonly [number, number],
  mediaSize: readonly [number, number],
  inset = 0.964,
): readonly [number, number] {
  const frameWidth = Math.max(Number.EPSILON, frameSize[0]) * inset
  const frameHeight = Math.max(Number.EPSILON, frameSize[1]) * inset
  const mediaWidth = Math.max(Number.EPSILON, mediaSize[0])
  const mediaHeight = Math.max(Number.EPSILON, mediaSize[1])
  const scale = Math.min(frameWidth / mediaWidth, frameHeight / mediaHeight)
  return [mediaWidth * scale, mediaHeight * scale]
}
