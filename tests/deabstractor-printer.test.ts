import { describe, expect, it } from 'vitest'
import { LOWER_ROLLER_Y, PRINTER, receiptPoint, stampHeight, UPPER_ROLLER_Y } from '../src/museum/deabstractor/printerGeometry'
import { durationFor, sequencePose, stampContact } from '../src/museum/deabstractor/sequence'

describe('De-Abstractor physical paper feed', () => {
  it('keeps both paper surfaces outside the housing, rollers, and tray throughout the feed', () => {
    for (let feed = 0; feed <= 1; feed += 0.01) {
      for (let row = 0; row <= 100; row++) {
        for (const side of [-1, 1]) {
          const p = receiptPoint(row / 100, feed, side)
          expect(p.y).toBeGreaterThanOrEqual(PRINTER.trayTop - 1e-10)
          expect(p.z).toBeLessThan(PRINTER.trayFrontZ - 0.1)
          if (p.z <= PRINTER.bodyFrontZ + 0.012) {
            expect(p.y).toBeGreaterThan(PRINTER.bodyTop + 0.02)
          }
          for (const rollerY of [UPPER_ROLLER_Y, LOWER_ROLLER_Y]) {
            const clearance = Math.hypot(p.y - rollerY, p.z - PRINTER.bendStartZ)
            expect(clearance).toBeGreaterThan(PRINTER.rollerRadius + 0.001)
          }
        }
      }
    }
  })

  it('feeds a fixed-length sheet instead of stretching or shrinking it between poses', () => {
    for (const feed of [0, 0.15, 0.35, 0.5, 0.75, 1]) {
      let length = 0, previous = receiptPoint(0, feed)
      for (let row = 1; row <= 200; row++) {
        const point = receiptPoint(row / 200, feed)
        length += Math.hypot(point.y - previous.y, point.z - previous.z)
        previous = point
      }
      expect(length).toBeCloseTo(PRINTER.paperLength, 4)
    }
  })

  it('loads flat on the platen, then rests on the tray with its tail retained by the rollers', () => {
    for (const v of [0, 0.25, 0.5, 0.75, 1]) expect(receiptPoint(v, 0).y).toBe(PRINTER.bedY)
    expect(receiptPoint(0, 0).z).toBeCloseTo(PRINTER.bedStartZ)
    expect(receiptPoint(0, 1).z).toBeCloseTo(PRINTER.bendStartZ - 0.02)
    expect(receiptPoint(1, 1, -1).y).toBeCloseTo(PRINTER.trayTop)
    expect(receiptPoint(1, 1).z).toBeGreaterThan(PRINTER.bodyFrontZ + 0.7)
  })

  it('touches the paper without punching through it and fully lifts before either procedure feeds', () => {
    const paperTop = PRINTER.bedY + PRINTER.paperHalfThickness
    const contactGap = stampHeight(1) - PRINTER.stampSoleOffset - paperTop
    expect(contactGap).toBeCloseTo(0.002)
    for (const procedure of ['evacuation', 'inspection'] as const) {
      expect(sequencePose(stampContact(procedure), procedure).stampDown).toBeCloseTo(1)
      for (let t = 0; t <= durationFor(procedure); t += 0.005) {
        const pose = sequencePose(t, procedure)
        expect(stampHeight(pose.stampDown) - PRINTER.stampSoleOffset).toBeGreaterThanOrEqual(paperTop)
        if (pose.reveal > 0) expect(pose.stampDown).toBe(0)
      }
    }
  })
})
