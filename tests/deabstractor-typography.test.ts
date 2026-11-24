import { describe, expect, it, vi } from 'vitest'
import { fittedText } from '../src/museum/deabstractor/typography'
import { paintReceipt } from '../src/museum/deabstractor/Receipt'
import type { VerifiedArrival } from '../src/museum/deabstractor/transfer'

function canvas() {
  const context = {
    font: '', fillText: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn(), setLineDash: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    measureText(text: string) {
      const size = Number(this.font.match(/([\d.]+)px/)?.[1] ?? 0)
      return { width: text.length * size * 0.6, actualBoundingBoxAscent: size * 0.7, actualBoundingBoxDescent: size * 0.2 }
    },
  }
  return context as unknown as CanvasRenderingContext2D
}

describe('De-Abstractor lettering', () => {
  it.each([[90, 100], [1000, 12]])('fits both width and height without horizontally squeezing glyphs (%s x %s)', (width, height) => {
    const ctx = canvas()
    fittedText(ctx, 'DE-ABSTRACTOR', 100, 60, width, height, 72)
    const measure = ctx.measureText('DE-ABSTRACTOR')
    expect(measure.width).toBeLessThanOrEqual(width + 0.001)
    expect(measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent).toBeLessThanOrEqual(height + 0.001)
    expect(vi.mocked(ctx.fillText).mock.calls[0]).toHaveLength(3)
    expect(vi.mocked(ctx.fillText).mock.calls[0][2]).toBeCloseTo(60 + (measure.actualBoundingBoxAscent - measure.actualBoundingBoxDescent) / 2)
  })
  it('keeps demo, ownership-check and transfer receipts distinct after the redesign', () => {
    const address = '0x1111111111111111111111111111111111111111'
    const records: (VerifiedArrival | undefined)[] = [undefined, { token: 968, address, checkId: 'test' }, { token: 968, from: address, to: address, hash: `0x${'a'.repeat(64)}` }]
    const expected = ['NO ASSETS WERE MOVED', 'OWNERSHIP CHECKED - NO TRANSFER', 'TRANSFER CONFIRMED ON ABSTRACT']
    records.forEach((proof, index) => {
      const ctx = canvas()
      paintReceipt(ctx, 968, true, proof)
      const text = vi.mocked(ctx.fillText).mock.calls.map(call => call[0])
      expect(text).toContain(expected[index])
      expected.filter((_, other) => other !== index).forEach(absent => expect(text).not.toContain(absent))
      expect(text.includes('ETHEREUM AIRDROP IS SEPARATE')).toBe(Boolean(proof))
      expect(text).toContain('SAFE')
    })
  })
})
