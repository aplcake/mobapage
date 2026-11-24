import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Box, Cylinder, COLORS as C, Label, makeTexture } from './ApparatusParts'
import { portraitUrl } from './transfer'
import type { SceneClock } from './ApparatusScene'
import type { LiveJourney } from './liveJourney'
import { fittedText, TYPE } from './typography'

function BoardingTicket({ token, seat, total, arrived, clock }: { token: number; seat: number; total: number; arrived: boolean; clock: MutableRefObject<SceneClock> }) {
  const ticket = useRef<THREE.Group>(null)
  const born = useRef<number | null>(null)
  const texture = useMemo(() => makeTexture(256, 300, ctx => {
    ctx.fillStyle = C.pale; ctx.fillRect(0, 0, 256, 300)
    ctx.fillStyle = C.dark; fittedText(ctx, `#${token}`, 128, 145, 220, 42, 48, TYPE.mono, 500)
  }), [token])
  useEffect(() => {
    const image = new Image()
    let alive = true
    image.onload = () => {
      if (!alive) return
      const ctx = (texture.image as HTMLCanvasElement).getContext('2d')!
      ctx.fillStyle = C.pale; ctx.fillRect(0, 0, 256, 300)
      ctx.imageSmoothingEnabled = false; ctx.drawImage(image, 10, 10, 236, 236)
      ctx.fillStyle = C.dark; fittedText(ctx, `#${token}`, 128, 276, 226, 32, 36, TYPE.mono, 500)
      texture.needsUpdate = true
    }
    image.src = portraitUrl(token)
    return () => { alive = false; image.onload = null; texture.dispose() }
  }, [texture, token])
  useFrame(() => {
    if (!ticket.current) return
    const state = clock.current, time = state.ambient ?? 0
    born.current ??= time
    const age = Math.max(0, time - born.current - seat * .055)
    const settle = state.reducedMotion ? 1 : 1 - Math.exp(-age * 9) * Math.cos(age * 10)
    ticket.current.position.y = .77 + (settle - 1) * .55
    ticket.current.scale.setScalar(Math.max(.001, Math.min(1, age * 5)))
    ticket.current.rotation.z = state.reducedMotion ? 0 : (1 - settle) * (seat % 2 ? -.18 : .18)
  })
  return <group ref={ticket} position={[(seat - (total - 1) / 2) * .5, .77, 0]}>
    <Box size={[.47, .62, .11]} color={arrived ? '#43d490' : C.yellow} radius={.045} />
    <mesh position={[0, 0, .061]}><planeGeometry args={[.41, .48]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
    <Box size={[.12, .065, .14]} color={C.dark} position={[0, -.29, -.015]} radius={.014} />
  </group>
}

export function BoardingRack({ journey, clock }: { journey?: LiveJourney; clock: MutableRefObject<SceneClock> }) {
  if (!journey?.tokens.length) return null
  const visible = journey.tokens.slice(0, 5)
  return <group name="deabstractor-boarding-rack" position={[-2.7, .28, 1.27]} rotation={[0, .2, 0]}>
    <Box size={[2.7, .16, .58]} color={C.dark} position={[0, .08, 0]} radius={.07} />
    {[-1.04, 1.04].map(x => <Cylinder key={x} radius={.065} height={.5} color={C.steel} position={[x, .36, 0]} />)}
    <Box size={[2.66, .29, .22]} color={C.teal} position={[0, .48, 0]} radius={.06} />
    <Label text={journey.arrived.length ? `${journey.arrived.length} / ${journey.tokens.length} ARRIVED` : `${journey.tokens.length} PASSENGER${journey.tokens.length === 1 ? '' : 'S'}`} width={2.35} height={.18} position={[0, .45, .116]} background={C.teal} color={C.pale} mono />
    {visible.map((token, seat) => <BoardingTicket key={token} token={token} seat={seat} total={visible.length} arrived={journey.arrived.includes(token)} clock={clock} />)}
  </group>
}
