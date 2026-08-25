export const FORMAL_ROOM_COMPACT_MAX_WIDTH = 700
export const FORMAL_ROOM_PHONE_MAX_SHORT_EDGE = 700

export const FORMAL_ROOM_EXPLORE_FOV = {
  portraitPhone: 62,
  shortLandscape: 54,
  desktop: 52,
} as const

export const FORMAL_ROOM_FOV_PROJECTION_EPSILON = 0.01

export type FormalRoomFovFrame = {
  fov: number
  shouldUpdateProjection: boolean
}

function isPositiveDimension(value: number) {
  return Number.isFinite(value) && value > 0
}

export function isFormalRoomCompactViewport(width: number) {
  return isPositiveDimension(width) && width <= FORMAL_ROOM_COMPACT_MAX_WIDTH
}

export function selectFormalRoomExploreFov(width: number, height: number) {
  if (!isPositiveDimension(width) || !isPositiveDimension(height)) {
    return FORMAL_ROOM_EXPLORE_FOV.desktop
  }

  if (height >= width && isFormalRoomCompactViewport(width)) {
    return FORMAL_ROOM_EXPLORE_FOV.portraitPhone
  }

  if (width > height && height <= FORMAL_ROOM_PHONE_MAX_SHORT_EDGE) {
    return FORMAL_ROOM_EXPLORE_FOV.shortLandscape
  }

  return FORMAL_ROOM_EXPLORE_FOV.desktop
}

export function stepFormalRoomFovProjection(
  currentFov: number,
  targetFov: number,
  lastProjectedFov: number,
  strength: number,
  delta: number,
): FormalRoomFovFrame {
  if (
    !Number.isFinite(currentFov)
    || !Number.isFinite(targetFov)
    || !Number.isFinite(lastProjectedFov)
    || !Number.isFinite(strength)
    || !Number.isFinite(delta)
  ) {
    return { fov: currentFov, shouldUpdateProjection: false }
  }

  const alpha = 1 - Math.exp(-Math.max(0, strength) * Math.max(0, delta))
  const dampedFov = currentFov + (targetFov - currentFov) * alpha
  const settled = Math.abs(targetFov - dampedFov) <= FORMAL_ROOM_FOV_PROJECTION_EPSILON
  const fov = settled ? targetFov : dampedFov
  const projectedDelta = Math.abs(fov - lastProjectedFov)

  return {
    fov,
    shouldUpdateProjection: projectedDelta >= FORMAL_ROOM_FOV_PROJECTION_EPSILON
      || (settled && projectedDelta > Number.EPSILON),
  }
}
