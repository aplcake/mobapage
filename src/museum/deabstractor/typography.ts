import { useEffect, useState } from 'react'

export const TYPE = {
  display: '"MoBA Grotesque", "Trebuchet MS", Arial, sans-serif',
  mono: '"MoBA Mono", "Courier New", monospace',
} as const

let fontsReady: Promise<unknown> | undefined

// Canvas textures need an explicit repaint after the local webfonts arrive.
export function useCanvasFonts() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let active = true
    fontsReady ??= Promise.allSettled([
      document.fonts.load('800 48px "MoBA Grotesque"'),
      document.fonts.load('500 24px "MoBA Mono"'),
    ])
    void fontsReady.then(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [])
  return ready
}

// Scale the whole glyph, never squeeze letters horizontally to fit a nameplate.
export function fittedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
  width: number, height: number, size: number, family: string = TYPE.display, weight = 800) {
  ctx.font = `${weight} ${size}px ${family}`
  const initial = ctx.measureText(text)
  const scale = Math.min(1, width / Math.max(1, initial.width), height / Math.max(1, initial.actualBoundingBoxAscent + initial.actualBoundingBoxDescent))
  ctx.font = `${weight} ${size * scale}px ${family}`
  const measured = ctx.measureText(text)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(text, x, y + (measured.actualBoundingBoxAscent - measured.actualBoundingBoxDescent) / 2)
}
