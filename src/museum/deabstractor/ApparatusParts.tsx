import { useEffect, useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { getToonRampTexture } from '../../shaders/toonRamp'
import { fittedText, TYPE, useCanvasFonts } from './typography'

export const COLORS = { ink: '#192d2a', teal: '#328f86', mint: '#80cbb2', pale: '#eaf0c9', coral: '#ee775e', yellow: '#efbd53', steel: '#b8d0c4', dark: '#264e47', pink: '#d99691' }
export type V3 = [number, number, number]

export function InkMesh({ geometry, color, outline = 0.014, children, ...props }: {
  geometry: THREE.BufferGeometry; color: string; outline?: number; children?: ReactNode
  position?: V3; rotation?: V3; scale?: V3 | number
}) {
  return <group {...props}>
    {outline > 0 && <mesh geometry={geometry} scale={1 + outline}><meshBasicMaterial color={COLORS.ink} side={THREE.BackSide} /></mesh>}
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshToonMaterial color={color} gradientMap={getToonRampTexture()} />
      {children}
    </mesh>
  </group>
}

export function Box({ size, color, radius = 0.08, ...props }: { size: V3; color: string; radius?: number; position?: V3; rotation?: V3; outline?: number }) {
  const geometry = useMemo(() => new RoundedBoxGeometry(...size, 3, Math.min(radius, ...size.map(n => n / 2))), [size[0], size[1], size[2], radius]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry])
  return <InkMesh geometry={geometry} color={color} {...props} />
}

export function Cylinder({ radius, height, color, top = radius, segments = 24, ...props }: {
  radius: number; height: number; color: string; top?: number; segments?: number; position?: V3; rotation?: V3; outline?: number
}) {
  const geometry = useMemo(() => new THREE.CylinderGeometry(top, radius, height, segments), [top, radius, height, segments])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <InkMesh geometry={geometry} color={color} {...props} />
}

export function Ball({ radius, color, ...props }: { radius: number; color: string; position?: V3; scale?: V3; outline?: number }) {
  const geometry = useMemo(() => new THREE.SphereGeometry(radius, 20, 12), [radius])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <InkMesh geometry={geometry} color={color} {...props} />
}

export function Pipe({ points, radius = 0.07, color, ...props }: { points: V3[]; radius?: number; color: string; position?: V3; outline?: number }) {
  const signature = JSON.stringify(points)
  const geometry = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3((JSON.parse(signature) as V3[]).map(p => new THREE.Vector3(...p))), 32, radius, 8, false), [signature, radius])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <InkMesh geometry={geometry} color={color} {...props} />
}

export function makeTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  paint(context)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export function Label({ text, sub = '', width, height, position, color = COLORS.ink, background = COLORS.pale, rotation, border = false, mono = false }: {
  text: string; sub?: string; width: number; height: number; position: V3; color?: string; background?: string; rotation?: V3; border?: boolean; mono?: boolean
}) {
  const fontsReady = useCanvasFonts()
  const texture = useMemo(() => {
    const h = Math.max(32, Math.round(1024 * height / width))
    return makeTexture(1024, h, context => {
    context.fillStyle = background
    context.fillRect(0, 0, 1024, h)
    if (border) { context.strokeStyle = color; context.lineWidth = 8; context.strokeRect(12, 12, 1000, h - 24) }
    context.fillStyle = color
    fittedText(context, text, 512, h * (sub ? 0.38 : 0.5), 920, h * (sub ? 0.38 : 0.64), h * 0.88, mono ? TYPE.mono : TYPE.display, mono ? 500 : 800)
    if (sub) fittedText(context, sub, 512, h * 0.78, 900, h * 0.2, h * 0.26, TYPE.mono, 500)
    })
  }, [background, border, color, mono, height, sub, text, width, fontsReady]) // eslint-disable-line react-hooks/exhaustive-deps -- Loaded fonts change canvas glyph metrics.
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={position} rotation={rotation}><planeGeometry args={[width, height]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
}

export function Bolt({ position }: { position: V3 }) {
  return <group position={position}>
    <Cylinder radius={0.046} height={0.035} color={COLORS.steel} rotation={[Math.PI / 2, 0, 0]} segments={6} outline={0.06} />
    <Box size={[0.048, 0.008, 0.01]} color={COLORS.dark} position={[0, 0, 0.022]} radius={0.001} outline={0} />
  </group>
}

export function MachineNameplate() {
  const fontsReady = useCanvasFonts()
  const texture = useMemo(() => makeTexture(1536, 170, ctx => {
    ctx.fillStyle = '#05472a'; ctx.fillRect(0, 0, 1536, 170)
    ctx.strokeStyle = '#b4d7a7'; ctx.lineWidth = 3
    ctx.strokeRect(4, 4, 1528, 162)
    ctx.beginPath(); ctx.moveTo(1164, 32); ctx.lineTo(1164, 138); ctx.stroke()
    ctx.fillStyle = '#fff3cf'
    fittedText(ctx, 'DE-ABSTRACTOR', 580, 85, 1080, 100, 115)
    ctx.fillStyle = '#efbd53'
    fittedText(ctx, '3000', 1344, 85, 270, 90, 100, TYPE.mono, 500)
  }), [fontsReady]) // eslint-disable-line react-hooks/exhaustive-deps -- Loaded fonts change canvas glyph metrics.
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={[0, 1.41, 0.818]}><planeGeometry args={[2.53, 2.53 * 170 / 1536]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
}

export function roundedPath(width: number, height: number, radius: number) {
  const path = new THREE.Shape()
  const x = -width / 2, y = -height / 2
  path.moveTo(x + radius, y)
  path.lineTo(x + width - radius, y)
  path.quadraticCurveTo(x + width, y, x + width, y + radius)
  path.lineTo(x + width, y + height - radius)
  path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  path.lineTo(x + radius, y + height)
  path.quadraticCurveTo(x, y + height, x, y + height - radius)
  path.lineTo(x, y + radius)
  path.quadraticCurveTo(x, y, x + radius, y)
  return path
}
