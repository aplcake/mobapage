import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getToonRampTexture } from '../../shaders/toonRamp'
import { makeTexture } from './ApparatusParts'
import { sequencePose } from './sequence'
import { PRINTER, receiptPoint } from './printerGeometry'
import type { SceneClock } from './ApparatusScene'
import { canInspectReceipt } from './receiptView'
import type { VerifiedArrival } from './transfer'
import { fittedText, TYPE, useCanvasFonts } from './typography'

const ROWS = 40

export function paintReceipt(ctx: CanvasRenderingContext2D, token: number, safe: boolean, proof?: VerifiedArrival, passengers = 1) {
  ctx.fillStyle = '#f7f0d4'; ctx.fillRect(0, 0, 512, 768)
  ctx.strokeStyle = '#b7bea1'; ctx.lineWidth = 2; ctx.setLineDash([])
  ctx.strokeRect(20, 20, 472, 728)
  ctx.fillStyle = '#264e47'; ctx.fillRect(21, 21, 470, 70)
  ctx.fillStyle = '#fff5d9'
  fittedText(ctx, 'DE-ABSTRACTOR', 204, 55, 332, 34, 35)
  fittedText(ctx, '3000', 433, 55, 84, 26, 29, TYPE.mono, 500)
  ctx.fillStyle = '#264e47'
  fittedText(ctx, passengers > 1 ? `${passengers} BUDS ARRIVED` : `BUD #${token}`, 256, 144, 430, 53, 64)
  fittedText(ctx, proof ? 'ABSTRACT WALLET RECORD' : 'DEMONSTRATION COPY', 256, 196, 428, 22, 22, TYPE.mono, 500)
  ctx.setLineDash([5, 7]); ctx.strokeStyle = '#9fae91'
  ctx.beginPath(); ctx.moveTo(34, 228); ctx.lineTo(478, 228); ctx.stroke(); ctx.setLineDash([])
  ctx.font = `500 21px ${TYPE.mono}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  ctx.fillText('PIXELS', 44, 274); ctx.fillText('PERSONALITY', 44, 314)
  ctx.textAlign = 'right'; ctx.fillText('INTACT', 468, 274); ctx.fillText('WEIRD', 468, 314)
  if (safe) {
    ctx.save(); ctx.translate(256, 445); ctx.rotate(-0.07)
    ctx.strokeStyle = '#277557'; ctx.fillStyle = '#277557'; ctx.lineWidth = 7
    ctx.strokeRect(-204, -87, 408, 174)
    ctx.lineWidth = 1.5; ctx.strokeRect(-193, -76, 386, 152)
    fittedText(ctx, 'SAFE', 0, -16, 354, 84, 118)
    fittedText(ctx, 'STILL A LITTLE WEIRD', 0, 52, 358, 23, 24, TYPE.mono, 500)
    ctx.restore()
  } else {
    ctx.fillStyle = '#546e59'; fittedText(ctx, 'AWAITING THE STAMP', 256, 445, 420, 24, 24, TYPE.mono, 500)
  }
  ctx.fillStyle = '#264e47'
  for (let i = 0; i < 48; i++) ctx.fillRect(50 + i * 8.5, 576, 2 + ((token + i * 7) % 3), i % 4 === 0 ? 42 : 34)
  if (proof) {
    const address = 'hash' in proof ? proof.to : proof.address
    fittedText(ctx, `${address.slice(0, 8)}...${address.slice(-8)}`, 256, 650, 424, 22, 23, TYPE.mono, 500)
    fittedText(ctx, 'hash' in proof ? 'TRANSFER CONFIRMED ON ABSTRACT' : 'OWNERSHIP CHECKED - NO TRANSFER', 256, 688, 430, 19, 21, TYPE.mono, 500)
    fittedText(ctx, 'ETHEREUM AIRDROP IS SEPARATE', 256, 718, 430, 18, 21, TYPE.mono, 500)
  } else {
    fittedText(ctx, 'NO ASSETS WERE MOVED', 256, 666, 430, 25, 29)
    fittedText(ctx, 'MoBA / GLOWBUDS', 256, 710, 420, 18, 20, TYPE.mono, 500)
  }
}

export function Receipt({ clock, token, onInspect, proof }: { clock: MutableRefObject<SceneClock>; token: number; onInspect: () => void; proof?: VerifiedArrival }) {
  const fontsReady = useCanvasFonts()
  const { gl } = useThree()
  const inspectable = () => canInspectReceipt(clock.current.elapsed, clock.current.procedure, clock.current.running)
  const paintedSafe = useRef<boolean | null>(null)
  const lastFeed = useRef(-1)
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const count = (ROWS + 1) * 4
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage))
    const uv = new Float32Array(count * 2), indices: number[] = []
    for (let side = 0; side < 2; side++) for (let row = 0; row <= ROWS; row++) for (let edge = 0; edge < 2; edge++) {
      const index = side * (ROWS + 1) * 2 + row * 2 + edge
      uv[index * 2] = edge; uv[index * 2 + 1] = 1 - row / ROWS
    }
    for (let row = 0; row < ROWS; row++) { const a = row * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
    g.addGroup(0, indices.length, 0)
    const back = (ROWS + 1) * 2
    for (let row = 0; row < ROWS; row++) {
      const a = row * 2, b = back + a
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2)
      indices.push(a, b, a + 2, b, b + 2, a + 2)
      indices.push(a + 1, a + 3, b + 1, a + 3, b + 3, b + 1)
    }
    indices.push(0, 1, back, 1, back + 1, back)
    const end = ROWS * 2
    indices.push(end, back + end, end + 1, end + 1, back + end, back + end + 1)
    g.addGroup(ROWS * 6, indices.length - ROWS * 6, 1)
    g.setIndex(indices); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    return g
  }, [])
  const texture = useMemo(() => makeTexture(512, 768, ctx => paintReceipt(ctx, token, false, proof)), [token, proof, fontsReady]) // eslint-disable-line react-hooks/exhaustive-deps -- Loaded fonts change canvas glyph metrics.
  useEffect(() => { paintedSafe.current = null }, [texture])
  useEffect(() => () => { geometry.dispose() }, [geometry])
  useEffect(() => () => { texture.dispose() }, [texture])
  useFrame(() => {
    const pose = sequencePose(clock.current.elapsed, clock.current.procedure)
    if (paintedSafe.current !== pose.safe) {
      paintReceipt((texture.image as HTMLCanvasElement).getContext('2d')!, token, pose.safe, proof, clock.current.journey?.arrived.length || 1)
      texture.needsUpdate = true; paintedSafe.current = pose.safe
    }
    if (pose.reveal === lastFeed.current) return
    lastFeed.current = pose.reveal
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute
    // Advance a constant-length sheet along the exterior path, never through the housing.
    for (let side = 0; side < 2; side++) for (let row = 0; row <= ROWS; row++) for (let edge = 0; edge < 2; edge++) {
      const { y, z } = receiptPoint(row / ROWS, pose.reveal, side === 0 ? 1 : -1)
      const index = side * (ROWS + 1) * 2 + row * 2 + edge
      positions.setXYZ(index, (edge - 0.5) * PRINTER.paperWidth, y, z)
    }
    positions.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingSphere()
  })
  return <group name="deabstractor-receipt">
    <mesh geometry={geometry} castShadow receiveShadow
      onPointerOver={event => { if (inspectable()) { event.stopPropagation(); gl.domElement.style.cursor = 'zoom-in' } }}
      onPointerOut={() => { gl.domElement.style.cursor = '' }}
      onClick={event => { event.stopPropagation(); gl.domElement.style.cursor = ''; if (inspectable()) onInspect() }}>
      <meshToonMaterial attach="material-0" map={texture} gradientMap={getToonRampTexture()} />
      <meshToonMaterial attach="material-1" color="#ded7ba" gradientMap={getToonRampTexture()} />
    </mesh>
  </group>
}
