import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { InkMesh, type V3 } from './ApparatusParts'

// Official abs.xyz nav artwork and brand tokens, checked 2026-10-22.
// Preserve the actual three-part mark rather than approximating it with an asterisk.
export const ABSTRACT = {
  green: '#00de73', light: '#19e783', dark: '#05472a', aqua: '#36f197', white: '#f9f8f5',
} as const
const MARK_PATHS = [
  'M15.821 14.984L20.642 19.759L18.38 21.999L13.56 17.225C13.146 16.815 12.602 16.592 12.015 16.592C11.429 16.592 10.884 16.815 10.471 17.225L5.651 21.999L3.389 19.759L8.209 14.984H15.818H15.821Z',
  'M16.626 13.608L23.209 15.353L24.036 12.29L17.453 10.545C16.889 10.396 16.42 10.038 16.127 9.536C15.834 9.037 15.758 8.453 15.909 7.895L17.671 1.374L14.579 0.556L12.816 7.076L16.623 13.604L16.626 13.608Z',
  'M7.409 13.608L0.827 15.353L0 12.29L6.583 10.545C7.146 10.396 7.616 10.038 7.909 9.536C8.202 9.037 8.277 8.453 8.127 7.895L6.365 1.374L9.457 0.556L11.219 7.076L7.413 13.604L7.409 13.608Z',
] as const
let canvasPaths: Path2D[] | undefined

export function paintAbstractMark(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, color: string) {
  canvasPaths ??= MARK_PATHS.map(path => new Path2D(path))
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(width / 24.036, width / 24.036)
  ctx.fillStyle = color
  canvasPaths.forEach(path => ctx.fill(path))
  ctx.restore()
}

export function AbstractEmblem({ size, position, rotation, color = ABSTRACT.white }: {
  size: number; position: V3; rotation?: V3; color?: string
}) {
  const geometry = useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">${MARK_PATHS.map(d => `<path d="${d}"/>`).join('')}</svg>`
    const shapes = new SVGLoader().parse(svg).paths.flatMap(path => SVGLoader.createShapes(path))
    const result = new THREE.ExtrudeGeometry(shapes, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 2, curveSegments: 10 })
    result.translate(-12.018, -11.2775, -0.3)
    // Rotate instead of reflecting Y: back faces and winding remain correct.
    result.rotateX(Math.PI)
    result.scale(1 / 24.036, 1 / 24.036, 1 / 24.036)
    return result
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <InkMesh geometry={geometry} color={color} position={position} rotation={rotation} scale={size} outline={0.008} />
}
