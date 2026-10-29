// One physical paper path shared by the receipt, rollers, stamp, and clearance tests.
export const PRINTER = {
  paperWidth: 0.94,
  paperLength: 1.2,
  paperHalfThickness: 0.008,
  bedY: 2.074,
  bedStartZ: -0.5,
  bendStartZ: 0.76,
  trayTop: 1.4,
  trayFrontZ: 1.78,
  bodyTop: 2.03,
  bodyFrontZ: 0.705,
  bodyWidth: 1.4,
  bodyHeight: 0.66,
  bodyDepth: 1.33,
  rollerRadius: 0.06,
  stampRestY: 3.18,
  stampSoleOffset: 0.445,
} as const

const BEND_RADIUS = (PRINTER.bedY - PRINTER.trayTop - PRINTER.paperHalfThickness) / 2
const QUARTER_ARC = BEND_RADIUS * Math.PI / 2
const START = PRINTER.bedStartZ - PRINTER.bendStartZ
export const PAPER_FEED_DISTANCE = -0.02 - START
export const UPPER_ROLLER_Y = PRINTER.bedY + PRINTER.paperHalfThickness + PRINTER.rollerRadius + 0.006
export const LOWER_ROLLER_Y = PRINTER.bedY - PRINTER.paperHalfThickness - PRINTER.rollerRadius - 0.004

export function stampHeight(down: number) {
  const contact = PRINTER.bedY + PRINTER.paperHalfThickness + PRINTER.stampSoleOffset + 0.002
  return PRINTER.stampRestY + (contact - PRINTER.stampRestY) * down
}

export function receiptPoint(v: number, feed: number, surface = 0) {
  const distance = START + feed * PAPER_FEED_DISTANCE + v * PRINTER.paperLength
  let y: number, z: number, ny: number, nz: number
  if (distance <= 0) {
    y = PRINTER.bedY; z = PRINTER.bendStartZ + distance; ny = 1; nz = 0
  } else if (distance < QUARTER_ARC) {
    const angle = distance / BEND_RADIUS
    y = PRINTER.bedY - BEND_RADIUS * (1 - Math.cos(angle))
    z = PRINTER.bendStartZ + BEND_RADIUS * Math.sin(angle)
    ny = Math.cos(angle); nz = Math.sin(angle)
  } else if (distance < QUARTER_ARC * 2) {
    const angle = (distance - QUARTER_ARC) / BEND_RADIUS
    y = PRINTER.bedY - BEND_RADIUS * (1 + Math.sin(angle))
    z = PRINTER.bendStartZ + BEND_RADIUS * (2 - Math.cos(angle))
    ny = Math.sin(angle); nz = Math.cos(angle)
  } else {
    y = PRINTER.trayTop + PRINTER.paperHalfThickness
    z = PRINTER.bendStartZ + BEND_RADIUS * 2 + distance - QUARTER_ARC * 2
    ny = 1; nz = 0
  }
  const thickness = surface * PRINTER.paperHalfThickness
  return { y: y + thickness * ny, z: z + thickness * nz }
}
