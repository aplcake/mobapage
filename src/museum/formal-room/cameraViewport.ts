export const FORMAL_ROOM_COMPACT_MAX_WIDTH = 700
export const FORMAL_ROOM_PHONE_MAX_SHORT_EDGE = 700

export const FORMAL_ROOM_EXPLORE_FOV = {
  portraitPhone: 62,
  shortLandscape: 54,
  desktop: 52,
} as const

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
