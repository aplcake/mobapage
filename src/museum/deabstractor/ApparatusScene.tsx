import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Ball, Bolt, Box, COLORS as C, Cylinder, InkMesh, Label, MachineNameplate, makeTexture, Pipe, roundedPath } from './ApparatusParts'
import { fittedText, TYPE } from './typography'
import { artworkFor, BEAT_COPY, getBeat, impactAt, MECHANICAL_TIMING, mechanismPose, passengerPose, sequencePose, smoothRange, stampContact, storySignals, type Procedure } from './sequence'
import { Receipt } from './Receipt'
import type { VerifiedArrival } from './transfer'
import { LOWER_ROLLER_Y, PAPER_FEED_DISTANCE, PRINTER, stampHeight, UPPER_ROLLER_Y } from './printerGeometry'
import { ABSTRACT as A, AbstractEmblem, paintAbstractMark } from './AbstractBrand'
import { receiptViewFrame } from './receiptView'
import { CABINET_PIVOT, createDeliveryHose, HOSE_COLLARS, HOSE_RADIUS, rubberPose } from './rubberMotion'
import { getToonRampTexture } from '../../shaders/toonRamp'
import { GALLERY, MuseumGallery } from './MuseumGallery'
import { TheatricalLighting } from './TheatricalLighting'
import { journeyCopy, waitingMotion, type LiveJourney } from './liveJourney'
import { BoardingRack } from './BoardingRack'

export type SceneClock = { elapsed: number; running: boolean; paused: boolean; procedure: Procedure; reducedMotion: boolean; journey?: LiveJourney; ambient?: number; holding?: boolean; holdTime?: number; waitBlend?: number }
type ClockRef = MutableRefObject<SceneClock>
type AttentionRef = MutableRefObject<boolean>
const SIGNAL_COLORS = { waiting: '#345b4b', active: '#ffd37d', done: '#a6edaa', bypassed: '#547569' }

function Screen({ clock, token, portrait, attention, onActivate }: { clock: ClockRef; token: number; portrait: HTMLImageElement | null; attention: AttentionRef; onActivate: () => void }) {
  const { gl } = useThree()
  const lastPaint = useRef(-1)
  const texture = useMemo(() => makeTexture(768, 480, ctx => { ctx.fillStyle = '#153b32'; ctx.fillRect(0, 0, 768, 480) }), [])
  const geometry = useMemo(() => {
    const screen = new THREE.ShapeGeometry(roundedPath(2.68, 1.68, 0.15), 12)
    const uv = screen.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 1.34) / 2.68, (uv.getY(i) + 0.84) / 1.68)
    return screen
  }, [])
  useEffect(() => { lastPaint.current = -1 }, [portrait])
  useEffect(() => () => { texture.dispose(); geometry.dispose() }, [texture, geometry])
  useFrame(({ clock: frameClock }) => {
    if (frameClock.elapsedTime - lastPaint.current < 1 / 15) return
    lastPaint.current = frameClock.elapsedTime
    const state = clock.current
    const beat = getBeat(state.elapsed, state.procedure, state.running)
    const safe = artworkFor(state.elapsed, state.procedure) === 'safe'
    const journey = state.journey
    const time = state.ambient ?? state.elapsed
    const canvas = texture.image as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    const accent = attention.current && !state.running ? '#fff2bd' : safe ? '#a6edaa' : '#ffd37d'
    ctx.fillStyle = '#132d28'; ctx.fillRect(0, 0, 768, 480)
    ctx.fillStyle = accent; ctx.font = `500 25px ${TYPE.mono}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    const hasPassenger = !journey || journey.tokens.includes(token)
    ctx.fillText(hasPassenger ? `#${token}` : 'LIVE', 29, 39)
    paintAbstractMark(ctx, 631, 38, 48, A.green)
    if (!hasPassenger) {
      paintAbstractMark(ctx, 384, 210, 130, A.green)
    } else if (portrait) {
      ctx.imageSmoothingEnabled = false
      const time = state.elapsed > 0 ? state.elapsed : frameClock.elapsedTime
      const sway = state.reducedMotion ? 0 : Math.sin(time * 1.2) * 2
      ctx.drawImage(portrait, 192, 30 + sway, 384, 384)
    } else {
      ctx.textAlign = 'center'; ctx.fillText('TUNING IN...', 384, 240)
    }
    const signals = storySignals(state.elapsed, state.procedure, state.running)
    ctx.strokeStyle = '#345b4b'; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(100, 150); ctx.lineTo(100, 310); ctx.stroke()
    for (let i = 0; i < 3; i++) {
      const signal = signals[i], y = 150 + i * 80
      ctx.beginPath(); ctx.arc(100, y, 19, 0, Math.PI * 2)
      ctx.fillStyle = SIGNAL_COLORS[signal]; ctx.fill()
      if (signal === 'done' || signal === 'bypassed') {
        ctx.strokeStyle = '#132d28'; ctx.lineWidth = 4; ctx.beginPath()
        if (signal === 'done') { ctx.moveTo(91, y); ctx.lineTo(98, y + 7); ctx.lineTo(109, y - 7) }
        else { ctx.moveTo(91, y); ctx.lineTo(109, y) }
        ctx.stroke()
      }
      if (signal === 'active') {
        ctx.beginPath(); ctx.arc(100, y, 28, 0, Math.PI * 2)
        ctx.strokeStyle = '#ffd37d'; ctx.lineWidth = 3; ctx.stroke()
      }
    }
    ctx.strokeStyle = accent; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.arc(656, 185, 43, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath()
    if (safe) {
      ctx.moveTo(634, 185); ctx.lineTo(650, 201); ctx.lineTo(680, 169); ctx.stroke()
    } else if (!state.running) {
      ctx.moveTo(646, 163); ctx.lineTo(675, 185); ctx.lineTo(646, 207); ctx.closePath(); ctx.fillStyle = accent; ctx.fill()
    } else {
      ctx.arc(656, 185, 25, time * 2, time * 2 + Math.PI * 1.4); ctx.stroke()
    }
    if (journey?.tokens.length) {
      ctx.fillStyle = accent
      fittedText(ctx, `${journey.arrived.length}/${journey.tokens.length}`, 656, 278, 142, 34, 39, TYPE.mono, 500)
      fittedText(ctx, 'ARRIVED', 656, 317, 148, 20, 24, TYPE.mono, 500)
    }
    // The portrait keeps its original pixels; a surrounding passport border carries the state.
    ctx.strokeStyle = safe ? '#a6edaa' : '#ee775e'; ctx.lineWidth = 8
    ctx.strokeRect(185, 23, 398, 398)
    if ((beat === 'scan' || journey?.phase === 'connecting') && !state.reducedMotion) {
      const y = 35 + (Math.sin(time * 2.1) * 0.5 + 0.5) * 360
      ctx.fillStyle = '#e7ffc44a'; ctx.fillRect(192, y, 384, 14)
      ctx.fillStyle = '#edffd9'; ctx.fillRect(192, y + 8, 384, 2)
    }
    // Registration brackets make the original pixels feel held inside a real scanner.
    ctx.strokeStyle = accent; ctx.lineWidth = 3
    for (const [x, y, dx, dy] of [[181, 30, 1, 1], [587, 30, -1, 1], [181, 414, 1, -1], [587, 414, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, y + dy * 18); ctx.lineTo(x, y); ctx.lineTo(x + dx * 18, y); ctx.stroke()
    }
    ctx.fillStyle = accent
    fittedText(ctx, state.paused ? 'SCENE PAUSED' : journey && state.procedure !== 'inspection' && !safe ? journeyCopy(journey).screen : BEAT_COPY[beat].screen, 384, 452, 670, 28, 34, TYPE.mono, 500)
    ctx.fillStyle = '#071e1724'
    for (let y = 0; y < 480; y += 5) ctx.fillRect(0, y, 768, 1)
    texture.needsUpdate = true
  })
  return <mesh name="deabstractor-screen" position={[0, 3.24, 0.936]} geometry={geometry}
    onPointerOver={event => { event.stopPropagation(); if (!clock.current.running) { attention.current = true; gl.domElement.style.cursor = 'pointer' } }}
    onPointerOut={() => { attention.current = false; gl.domElement.style.cursor = '' }}
    onClick={event => { event.stopPropagation(); attention.current = false; gl.domElement.style.cursor = ''; if (!clock.current.running) onActivate() }}>
    <meshBasicMaterial map={texture} toneMapped={false} />
  </mesh>
}

function Gauge({ clock }: { clock: ClockRef }) {
  const needle = useRef<THREE.Group>(null)
  useFrame(() => {
    const state = clock.current, pose = sequencePose(state.elapsed, state.procedure)
    const motion = mechanismPose(state.elapsed, state.procedure, state.reducedMotion)
    if (needle.current) needle.current.rotation.z = 0.9 - pose.energy * 1.6 - pose.scanner * 0.3 - motion.strain * 0.45 - motion.pump * 0.6 + motion.needleSettle * 0.14
  })
  return <group position={[-2.14, 3.7, 0.25]} rotation={[0, 0.08, -0.09]}>
    <Cylinder radius={0.55} height={0.28} color={C.dark} rotation={[Math.PI / 2, 0, 0]} />
    <Cylinder radius={0.49} height={0.3} color={C.yellow} rotation={[Math.PI / 2, 0, 0]} />
    <Cylinder radius={0.415} height={0.016} color={C.pale} position={[0, 0, 0.162]} rotation={[Math.PI / 2, 0, 0]} />
    {Array.from({ length: 11 }, (_, i) => {
      const angle = (i / 10) * Math.PI * 1.4 - Math.PI * 0.2
      return <Box key={i} size={[0.018, i % 2 ? 0.045 : 0.075, 0.015]} color={i > 7 ? C.coral : C.dark} position={[Math.cos(angle) * 0.34, Math.sin(angle) * 0.34, 0.181]} rotation={[0, 0, angle - Math.PI / 2]} radius={0.003} outline={0} />
    })}
    <group ref={needle} position={[0, -0.03, 0.2]}>
      <Box size={[0.034, 0.32, 0.025]} color={C.coral} position={[0, 0.12, 0]} radius={0.01} />
      <Ball radius={0.055} color={C.ink} />
    </group>
    <Label text="VIBES" width={0.32} height={0.08} position={[0, -0.25, 0.182]} />
    <Pipe points={[[0, -0.45, -0.08], [0, -0.75, -0.08], [0.45, -0.88, -0.08]]} radius={0.065} color={C.dark} />
  </group>
}

function Fan({ clock }: { clock: ClockRef }) {
  const blades = useRef<THREE.Group>(null)
  useFrame(() => {
    const state = clock.current
    if (blades.current) blades.current.rotation.z = mechanismPose(state.elapsed, state.procedure, state.reducedMotion).rotor + (state.reducedMotion ? 0 : (state.ambient ?? 0) * .75)
  })
  return <group position={[-1.98, 1.88, 0.24]} rotation={[0, -0.2, 0]}>
    <Cylinder radius={0.56} height={0.35} color={C.dark} rotation={[Math.PI / 2, 0, 0]} />
    <Cylinder radius={0.49} height={0.37} color={C.coral} rotation={[Math.PI / 2, 0, 0]} />
    <Cylinder radius={0.41} height={0.02} color={C.ink} position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]} />
    <group ref={blades} position={[0, 0, 0.24]}>
      {[0, 1, 2, 3, 4].map(i => <group key={i} rotation={[0, 0, i * Math.PI * 2 / 5]}><Ball radius={0.19} color={C.steel} position={[0.04, 0.21, 0]} scale={[0.62, 1, 0.15]} outline={0} /></group>)}
    </group>
    <Ball radius={0.09} color={C.yellow} position={[0, 0, 0.29]} scale={[1, 1, 0.6]} />
    {[-0.25, -0.12, 0.12, 0.25].map(x => <Box key={x} size={[0.017, 0.69, 0.025]} position={[x, 0, 0.3]} color={C.dark} radius={0.005} outline={0} />)}
  </group>
}

function Beacon({ clock }: { clock: ClockRef }) {
  const reflector = useRef<THREE.Group>(null)
  const bulb = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const state = clock.current
    if (reflector.current) reflector.current.rotation.y = mechanismPose(state.elapsed, state.procedure, state.reducedMotion).rotor * 0.65 + (state.reducedMotion ? 0 : (state.ambient ?? 0) * .35)
    if (bulb.current) (bulb.current.material as THREE.MeshBasicMaterial).color.set(artworkFor(state.elapsed, state.procedure) === 'safe' ? '#b6f2a0' : '#ffb45e')
  })
  return <group position={[0, 4.8, 0]}>
    <Cylinder radius={0.35} height={0.18} color={C.dark} />
    <Cylinder radius={0.27} height={0.14} color={C.yellow} position={[0, 0.13, 0]} />
    <mesh ref={bulb} position={[0, 0.39, 0]}><capsuleGeometry args={[0.16, 0.18, 5, 14]} /><meshBasicMaterial color="#ffb45e" /></mesh>
    <group ref={reflector} position={[0, 0.37, 0]}>
      <Ball radius={0.25} color={C.coral} position={[0, 0, -0.09]} scale={[1, 1.2, 0.4]} />
    </group>
    <Ball radius={0.28} color={C.pale} position={[0, 0.65, 0]} scale={[1, 0.2, 1]} />
    {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map(a => <Cylinder key={a} radius={0.016} height={0.48} color={C.dark} position={[Math.cos(a) * 0.25, 0.4, Math.sin(a) * 0.25]} outline={0} />)}
  </group>
}

function Scanner({ clock }: { clock: ClockRef }) {
  const arm = useRef<THREE.Group>(null)
  useFrame(() => {
    const state = clock.current
    const pose = sequencePose(state.elapsed, state.procedure)
    const motion = mechanismPose(state.elapsed, state.procedure, state.reducedMotion)
    if (arm.current) {
      arm.current.rotation.z = -0.7 + pose.scanner * 0.95 + motion.nod * 0.18
      arm.current.rotation.y = motion.scannerYaw
    }
  })
  return <group position={[-1.52, 4.42, -0.24]}>
    <Cylinder radius={0.17} height={0.34} color={C.yellow} rotation={[Math.PI / 2, 0, 0]} />
    <group ref={arm}>
      <Box size={[0.16, 0.86, 0.18]} color={C.coral} position={[0, 0.42, 0]} />
      <Cylinder radius={0.16} height={0.22} color={C.dark} position={[0, 0.88, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <Pipe points={[[0, 0.88, 0], [0.1, 0.95, 0.4], [0.44, 0.76, 1]]} radius={0.075} color={C.steel} />
      <group position={[0.44, 0.66, 1]} rotation={[0.35, 0, 0]}>
        <Cylinder radius={0.29} top={0.17} height={0.28} color={C.yellow} />
        <Cylinder radius={0.255} height={0.025} color={C.pale} position={[0, -0.145, 0]} />
      </group>
    </group>
  </group>
}

function Printer({ clock, token, onInspectReceipt, proof }: { clock: ClockRef; token: number; onInspectReceipt: () => void; proof?: VerifiedArrival }) {
  const stamp = useRef<THREE.Group>(null)
  const impact = useRef<THREE.Group>(null)
  const roller = useRef<THREE.Group>(null)
  useFrame(() => {
    const state = clock.current, pose = sequencePose(state.elapsed, state.procedure)
    if (stamp.current) stamp.current.position.y = stampHeight(pose.stampDown)
    if (roller.current) roller.current.rotation.y = pose.reveal * PAPER_FEED_DISTANCE / PRINTER.rollerRadius
    if (impact.current) {
      const punch = impactAt(state.elapsed, state.procedure)
      impact.current.visible = punch > 0 && !state.reducedMotion
      impact.current.scale.setScalar(0.8 + punch * 1.6)
    }
  })
  return <group position={[2.35, 0, 0.3]} rotation={[0, -0.18, 0]}>
    <Box size={[1.38, 0.25, 1.55]} color={C.dark} position={[0, 0.51, 0.06]} radius={0.13} />
    <Box size={[0.85, 0.94, 0.8]} color={C.teal} position={[0, 1.05, 0]} radius={0.14} />
    <Box size={[PRINTER.bodyWidth, PRINTER.bodyHeight, PRINTER.bodyDepth]} color={C.coral} position={[0, PRINTER.bodyTop - PRINTER.bodyHeight / 2, PRINTER.bodyFrontZ - PRINTER.bodyDepth / 2]} radius={0.18} />
    <Box size={[1.15, 0.04, 1.3]} color={C.steel} position={[0, 2.042, 0.1]} radius={0.018} outline={0} />
    <Box size={[1.35, 0.12, 1.5]} color={C.yellow} position={[0, PRINTER.trayTop - 0.06, PRINTER.trayFrontZ - 0.75]} radius={0.05} />
    {[-1, 1].map(side => <Box key={side} size={[0.16, 0.28, 0.22]} color={C.coral} position={[side * 0.61, 2.05, PRINTER.bendStartZ]} radius={0.045} />)}
    <Cylinder radius={PRINTER.rollerRadius} height={1.1} color={C.dark} position={[0, LOWER_ROLLER_Y, PRINTER.bendStartZ]} rotation={[0, 0, Math.PI / 2]} outline={0} />
    <group position={[0, UPPER_ROLLER_Y, PRINTER.bendStartZ]} rotation={[0, 0, Math.PI / 2]}>
      <group ref={roller}>
        <Cylinder radius={PRINTER.rollerRadius} height={1.1} color={C.dark} outline={0} />
        <Box size={[0.012, 1.03, 0.008]} color={C.steel} position={[0, 0, 0.06]} radius={0.003} outline={0} />
      </group>
    </group>
    <Receipt clock={clock} token={token} onInspect={onInspectReceipt} proof={proof} />
    <group ref={impact} position={[0, 2.09, 0.2]} visible={false}>
      {[-1, 1].map(side => <group key={side} position={[side * 0.5, 0.04, 0]} rotation={[0, 0, side * -0.6]}>
        <Box size={[0.06, 0.22, 0.045]} color={C.yellow} radius={0.01} position={[0, 0.06, 0]} />
        <Box size={[0.06, 0.13, 0.045]} color={C.pale} radius={0.01} position={[side * 0.13, -0.04, 0]} rotation={[0, 0, side * -0.5]} />
      </group>)}
    </group>
    <Box size={[0.19, 2.5, 0.24]} color={C.dark} position={[0.58, 2.35, -0.37]} />
    <Box size={[0.86, 0.18, 1.02]} color={C.yellow} position={[0.26, 3.55, -0.02]} />
    <Cylinder radius={0.11} height={0.4} color={C.dark} position={[0, 3.55, 0.09]} />
    <group ref={stamp} position={[0, PRINTER.stampRestY, 0.43]}>
      <Cylinder radius={0.055} height={1.4} color={C.steel} position={[0, 0.4, -0.34]} />
      <Ball radius={0.24} color={C.coral} position={[0, -0.1, -0.34]} scale={[1, 0.7, 1]} />
      <Box size={[0.76, 0.17, 0.46]} color={C.dark} position={[0, -0.36, -0.23]} />
      <Label text="100% NECESSARY" width={0.68} height={0.1} position={[0, -0.35, 0.006]} background={C.yellow} />
    </group>
    <Label text="CLEARANCE DEPT." width={1.03} height={0.15} position={[0, 1.63, 0.722]} background={C.coral} />
    <Bolt position={[-0.57, 1.53, 0.69]} /><Bolt position={[0.57, 1.53, 0.69]} />
  </group>
}

function PassengerPortrait({ portrait }: { portrait: HTMLImageElement | null }) {
  const texture = useMemo(() => makeTexture(256, 256, ctx => { ctx.fillStyle = C.mint; ctx.fillRect(0, 0, 256, 256) }), [])
  useEffect(() => {
    const ctx = (texture.image as HTMLCanvasElement).getContext('2d')!
    ctx.fillStyle = C.mint; ctx.fillRect(0, 0, 256, 256)
    if (portrait) { ctx.imageSmoothingEnabled = false; ctx.drawImage(portrait, 0, 0, 256, 256) }
    texture.needsUpdate = true
  }, [texture, portrait])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={[0, 0, 0.214]}><planeGeometry args={[0.45, 0.45]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
}

function DeliveryTube({ clock, portrait: portraitImage, count }: { clock: ClockRef; portrait: HTMLImageElement | null; count: number }) {
  const carriage = useRef<THREE.Group>(null)
  const receiver = useRef<THREE.Group>(null)
  const portrait = useRef<THREE.Group>(null)
  const dockLight = useRef<THREE.MeshBasicMaterial>(null)
  const collars = useRef<(THREE.Group | null)[]>([])
  const rig = useMemo(() => createDeliveryHose(), [])
  const vector = useMemo(() => new THREE.Vector3(), [])
  const tangent = useMemo(() => new THREE.Vector3(), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  useEffect(() => () => rig.dispose(), [rig])
  useFrame(() => {
    const state = clock.current
    const pose = passengerPose(state.elapsed, state.procedure, state.reducedMotion)
    const motion = mechanismPose(state.elapsed, state.procedure, state.reducedMotion)
    rig.update(state.elapsed, state.procedure, state.reducedMotion)
    collars.current.forEach((collar, i) => {
      if (!collar) return
      const radius = rig.frame(HOSE_COLLARS[i], vector, tangent)
      collar.position.copy(vector)
      collar.quaternion.setFromUnitVectors(up, tangent)
      collar.scale.set(radius / HOSE_RADIUS, 1, radius / HOSE_RADIUS)
    })
    if (!carriage.current) return
    carriage.current.visible = pose.visible
    const radius = rig.frame(pose.progress, vector, tangent)
    carriage.current.position.copy(vector); carriage.current.position.z += radius + 0.06
    if (receiver.current) receiver.current.position.y = 3.62 - motion.dockDrop
    const angle = Math.atan2(tangent.y, tangent.x) - Math.PI / 2
    carriage.current.rotation.z = angle
    carriage.current.scale.setScalar(pose.scale)
    if (portrait.current) portrait.current.rotation.z = -angle
    if (dockLight.current) dockLight.current.color.set(pose.arrived ? SIGNAL_COLORS.done : SIGNAL_COLORS.waiting)
  })
  return <group>
    <mesh geometry={rig.outline} name="deabstractor-hose-ink"><meshBasicMaterial color={C.ink} side={THREE.BackSide} /></mesh>
    <mesh geometry={rig.body} name="deabstractor-rubber-hose" castShadow receiveShadow><meshToonMaterial color={C.dark} gradientMap={getToonRampTexture()} /></mesh>
    <mesh geometry={rig.stripe} castShadow><meshToonMaterial color={C.yellow} gradientMap={getToonRampTexture()} /></mesh>
    {HOSE_COLLARS.map((u, i) => <group key={u} ref={group => { collars.current[i] = group }}><Cylinder radius={0.225} height={0.1} color={C.coral} outline={0.025} /></group>)}
    <group ref={receiver} name="deabstractor-receiving-cradle" position={[3.08, 3.62, -0.34]}>
      <Box size={[0.92, 0.12, 0.68]} color={C.dark} radius={0.04} />
      <Box size={[0.13, 0.38, 0.32]} color={C.coral} position={[-0.4, 0.16, 0]} radius={0.04} />
      <Box size={[0.13, 0.38, 0.32]} color={C.coral} position={[0.4, 0.16, 0]} radius={0.04} />
      <Pipe points={[[0.22, -0.04, -0.12], [0.22, -0.3, -0.12], [-0.16, -0.3, -0.12]]} radius={0.06} color={C.dark} />
      <mesh position={[0.42, 0.18, 0.17]}><sphereGeometry args={[0.065, 12, 8]} /><meshBasicMaterial ref={dockLight} color={SIGNAL_COLORS.waiting} /></mesh>
    </group>
    <group ref={carriage} name="deabstractor-passenger-carrier" visible={false}>
      <Box size={[0.7, 0.88, 0.36]} color={C.yellow} radius={0.17} />
      {[-1, 1].map(side => <Box key={side} size={[0.75, 0.08, 0.42]} color={C.coral} position={[0, side * 0.34, -0.02]} radius={0.03} />)}
      <Cylinder radius={0.34} height={0.032} color={C.dark} position={[0, 0, 0.19]} rotation={[Math.PI / 2, 0, 0]} />
      <group ref={portrait}><PassengerPortrait portrait={portraitImage} />{count > 1 && <Label text={`x${count}`} width={.37} height={.14} position={[.09, -.29, .235]} background={C.dark} color={C.pale} mono />}</group>
    </group>
  </group>
}

function Bellows({ clock }: { clock: ClockRef }) {
  const folds = useRef<THREE.Group>(null)
  const cap = useRef<THREE.Group>(null)
  useFrame(() => {
    const state = clock.current
    const pose = rubberPose(state.elapsed, state.procedure, state.reducedMotion)
    const breath = waitingMotion(state.holdTime ?? 0, Boolean(state.waitBlend), state.reducedMotion, state.waitBlend ?? 0).breath
    const height = pose.bellowsHeight * (1 - breath * .12)
    if (folds.current) folds.current.scale.set(pose.bellowsWidth * (1 + breath * .04), height, pose.bellowsWidth)
    if (cap.current) cap.current.position.y = 0.62 * height
  })
  return <group position={[-2.03, 2.05, 0.97]} rotation={[0, 0, -0.08]}>
    <Pipe points={[[0, 0, 0], [0, -0.17, -0.08], [0.48, -0.17, -0.26]]} radius={0.085} color={C.steel} />
    <Cylinder radius={0.29} height={0.11} color={C.yellow} />
    <group ref={folds} name="deabstractor-bellows">
      <Cylinder radius={0.18} height={0.62} color={C.dark} position={[0, 0.31, 0]} />
      {[0.07, 0.17, 0.27, 0.37, 0.47, 0.57].map(y => <Cylinder key={y} radius={0.265} top={0.18} height={0.15} color={C.coral} position={[0, y, 0]} outline={0.025} />)}
    </group>
    <group ref={cap} position={[0, 0.62, 0]}>
      <Cylinder radius={0.29} height={0.11} color={C.yellow} />
      <Cylinder radius={0.055} height={0.16} color={C.steel} position={[0, 0.1, 0]} />
      <Ball radius={0.14} color={C.dark} position={[0, 0.19, 0]} scale={[1.6, 0.5, 1]} />
    </group>
  </group>
}

function SteamVent({ clock }: { clock: ClockRef }) {
  const puffs = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!puffs.current) return
    const state = clock.current
    puffs.current.visible = state.procedure === 'evacuation' && !state.reducedMotion
    puffs.current.children.forEach((child, index) => {
      const age = (state.elapsed - MECHANICAL_TIMING.vents[index]) / 1.1
      child.visible = age > 0 && age < 1
      if (child.visible) {
        child.position.set(age * 0.45, age * 0.9 + 0.07, -age * 0.12)
        child.scale.setScalar(Math.sin(age * Math.PI) * 0.9)
      }
    })
  })
  return <group position={[1.27, 4.65, -0.24]}>
    <Cylinder radius={0.14} height={0.27} color={C.dark} />
    <Cylinder radius={0.2} height={0.09} color={C.yellow} position={[0, 0.16, 0]} />
    <Cylinder radius={0.13} height={0.01} color={C.ink} position={[0, 0.211, 0]} outline={0} />
    <group ref={puffs} position={[0, 0.21, 0]}>
      {[0, 1, 2].map(i => <group key={i} visible={false}>
        <Ball radius={0.2} color="#f0f1d8" outline={0.006} />
        <Ball radius={0.16} color="#f0f1d8" position={[0.16, 0.1, 0.02]} outline={0.006} />
        <Ball radius={0.13} color="#f0f1d8" position={[-0.12, 0.08, 0.01]} outline={0.006} />
      </group>)}
    </group>
  </group>
}

function ProcedureLights({ clock, attention }: { clock: ClockRef; attention: AttentionRef }) {
  const lights = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  useFrame(() => {
    const state = clock.current
    const signals = storySignals(state.elapsed, state.procedure, state.running)
    lights.current.forEach((light, i) => light?.color.set(
      !state.running && state.elapsed === 0 && i === 0 && attention.current ? '#fff2bd' : SIGNAL_COLORS[signals[i]],
    ))
  })
  return <group>
    {[-1.14, -0.75, -0.36].map((x, i) => <group key={x} position={[x, 1.96, 0.9]}>
      <Cylinder radius={0.14} height={0.1} color={C.steel} rotation={[Math.PI / 2, 0, 0]} />
      <mesh position={[0, 0, 0.059]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.108, 0.108, 0.022, 20]} />
        <meshBasicMaterial ref={material => { lights.current[i] = material }} color={SIGNAL_COLORS.waiting} />
      </mesh>
    </group>)}
  </group>
}

function Machine({ clock, token, portrait, attention, onActivate, onInspectReceipt, proof, journey }: { clock: ClockRef; token: number; portrait: HTMLImageElement | null; attention: AttentionRef; onActivate: () => void; onInspectReceipt: () => void; proof?: VerifiedArrival; journey?: LiveJourney }) {
  const { gl } = useThree()
  const body = useRef<THREE.Group>(null)
  const consoleFace = useRef<THREE.Group>(null)
  const lever = useRef<THREE.Group>(null)
  const grip = useRef<THREE.Group>(null)
  const leftBrace = useRef<THREE.Group>(null)
  const rightBrace = useRef<THREE.Group>(null)
  const frame = useMemo(() => {
    const shape = roundedPath(3.12, 2.12, 0.32)
    shape.holes.push(new THREE.Path(roundedPath(2.7, 1.7, 0.16).getPoints(16).reverse()))
    return new THREE.ExtrudeGeometry(shape, { depth: 0.13, steps: 1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 16 })
  }, [])
  useEffect(() => () => frame.dispose(), [frame])
  useEffect(() => () => { gl.domElement.style.cursor = '' }, [gl])
  useFrame(() => {
    const state = clock.current
    const motion = mechanismPose(state.elapsed, state.procedure, state.reducedMotion)
    const rubber = rubberPose(state.elapsed, state.procedure, state.reducedMotion)
    const waiting = waitingMotion(state.holdTime ?? 0, Boolean(state.waitBlend), state.reducedMotion, state.waitBlend ?? 0)
    if (body.current) {
      body.current.scale.set(rubber.scaleX * (1 + waiting.breath * .006), rubber.scaleY * (1 - waiting.breath * .006), rubber.scaleZ)
      body.current.rotation.z = rubber.lean + waiting.lean
    }
    // Keep the CRT's proportions and front depth while it follows the cabinet's height.
    if (consoleFace.current) consoleFace.current.scale.set(rubber.scaleY / rubber.scaleX, 1, 1 / rubber.scaleZ)
    if (lever.current) lever.current.rotation.x = 1.2 + motion.lever * 0.65
    if (grip.current) grip.current.scale.setScalar(attention.current && !state.running ? 1.12 : 1)
    if (leftBrace.current) leftBrace.current.rotation.z = motion.leftBrace * 0.22
    if (rightBrace.current) rightBrace.current.rotation.z = -motion.rightBrace * 0.22
  })
  return <group>
    <DeliveryTube clock={clock} portrait={portrait} count={journey?.tokens.length ?? 1} />
    <Box size={[3.6, 0.3, 2.05]} color={C.dark} position={[0, 0.58, 0]} radius={0.15} />
    <group position={[0, CABINET_PIVOT, 0]}><group ref={body} name="deabstractor-rubber-cabinet"><group position={[0, -CABINET_PIVOT, 0]}>
      <Box size={[3.08, 1.45, 1.55]} color={A.green} position={[0, 1.32, 0]} radius={0.25} />
      <Box size={[3.58, 2.86, 1.6]} color={A.green} position={[0, 3.21, -0.03]} radius={0.37} />
      <Box size={[3.45, 0.19, 1.52]} color={A.dark} position={[0, 4.45, 0.01]} radius={0.08} />
      <group ref={consoleFace} position={[0, 3.24, 0.84]}><group position={[0, -3.24, -0.84]}>
        <InkMesh geometry={frame} color={A.white} position={[0, 3.24, 0.84]} outline={0.008} />
        <Box size={[2.76, 1.77, 0.06]} color={C.ink} position={[0, 3.24, 0.88]} radius={0.15} outline={0} />
        <Screen clock={clock} token={token} portrait={portrait} attention={attention} onActivate={onActivate} />
      </group></group>
      <Label text="GLOWBUDS" width={1.8} height={0.26} position={[0.4, 4.45, 0.79]} background={A.dark} color={A.white} />
      <Box size={[2.87, 0.61, 0.16]} color={C.dark} position={[0, 1.95, 0.76]} radius={0.12} />
      <ProcedureLights clock={clock} attention={attention} />
      <Label text="DON'T PANIC" width={0.98} height={0.22} position={[0.55, 1.96, 0.85]} background={C.dark} color={C.pale} />
      <Box size={[2.67, 0.38, 0.045]} color={A.dark} position={[0, 1.41, 0.793]} radius={0.06} outline={0} />
      <MachineNameplate />
      <Box size={[2.3, 0.025, 0.014]} color={A.aqua} position={[0, 1.16, 0.789]} radius={0.005} outline={0} />
      <group position={[1.796, 3.15, -0.03]} rotation={[0, Math.PI / 2, 0]}>
        <Box size={[1.03, 1.62, 0.025]} color={A.dark} radius={0.12} outline={0.01} />
        <Box size={[0.9, 1.47, 0.035]} color={A.light} position={[0, 0, 0.022]} radius={0.1} outline={0} />
        <AbstractEmblem size={0.49} position={[0, 0.32, 0.058]} color={A.dark} />
        {Array.from({ length: 4 }, (_, i) => <Box key={i} size={[0.59, 0.055, 0.03]} color={A.dark} position={[0, -0.1 - i * 0.14, 0.05]} radius={0.02} outline={0} />)}
        <Bolt position={[-0.37, 0.62, 0.05]} /><Bolt position={[0.37, 0.62, 0.05]} />
      </group>
      {Array.from({ length: 11 }, (_, i) => <Box key={i} size={[0.1, 0.18, 0.024]} color={C.dark} position={[-0.83 + i * 0.165, 0.97, 0.788]} radius={0.02} outline={0} />)}
      {[[-1.52, 4.26], [1.52, 4.26], [-1.52, 2.2], [1.52, 2.2], [-1.25, 1.62], [1.25, 1.62]].map(([x, y]) => <Bolt key={`${x}-${y}`} position={[x, y, 0.81]} />)}
      <Gauge clock={clock} /><Fan clock={clock} /><Bellows clock={clock} /><Scanner clock={clock} /><Beacon clock={clock} /><SteamVent clock={clock} />
      <group position={[1.23, 1.97, 0.94]}>
        <Cylinder radius={0.16} height={0.35} color={C.yellow} rotation={[0, 0, Math.PI / 2]} />
        <group ref={lever} name="deabstractor-lever"
          onPointerOver={event => { event.stopPropagation(); if (!clock.current.running) { attention.current = true; gl.domElement.style.cursor = 'pointer' } }}
          onPointerOut={() => { attention.current = false; gl.domElement.style.cursor = '' }}
          onClick={event => { event.stopPropagation(); attention.current = false; gl.domElement.style.cursor = ''; if (!clock.current.running) onActivate() }}>
          <Cylinder radius={0.055} height={0.65} color={C.steel} position={[0.16, 0.28, 0]} />
          <group ref={grip} position={[0.16, 0.64, 0]}><Ball radius={0.18} color={C.yellow} /><Ball radius={0.05} color={C.pale} position={[-0.065, 0.1, 0.115]} outline={0} /></group>
        </group>
      </group>
    </group></group></group>
    {[-1, 1].map((side) => <group key={side} ref={side < 0 ? leftBrace : rightBrace} position={[side * 1.12, 1.045, 0]}>
      <Box size={[0.28, 0.78, 1.12]} color={C.yellow} position={[side * 0.14, -0.36, 0]} radius={0.07} />
      <Box size={[0.74, 0.19, 1.45]} color={C.dark} position={[side * 0.14, -0.68, 0]} radius={0.07} />
    </group>)}
    <Printer clock={clock} token={token} onInspectReceipt={onInspectReceipt} proof={proof} />
  </group>
}

function ClearanceSign({ clock }: { clock: ClockRef }) {
  const compact = useThree(state => state.size.width / state.size.height < 1.1)
  const plate = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!plate.current) return
    const state = clock.current
    const flip = state.procedure === 'inspection' ? 1 : state.reducedMotion
      ? Number(artworkFor(state.elapsed, state.procedure) === 'safe')
      : smoothRange(state.elapsed, stampContact(state.procedure) + 0.12, stampContact(state.procedure) + 0.95)
    plate.current.rotation.y = Math.PI * flip + Math.sin(flip * Math.PI) * 0.12
      + (state.procedure === 'evacuation' ? mechanismPose(state.elapsed, state.procedure, state.reducedMotion).signSettle * 0.14 : 0)
  })
  return <group position={compact ? [3.48, 0.27, 1.85] : [4.05, 0.27, 0.4]} rotation={[0, -0.12, 0]}>
    <Cylinder radius={0.4} height={0.09} color={C.dark} />
    <Cylinder radius={0.055} height={2.55} color={C.dark} position={[0, 1.28, 0]} />
    <group ref={plate} position={[0, 2.56, 0]} scale={compact ? 0.82 : 1}>
      <Box size={[1.48, 0.9, 0.19]} color={C.dark} radius={0.09} />
      <Label text="NOT SAFE" width={1.3} height={0.6} position={[0, 0, 0.102]} background={C.coral} />
      <Label text="SAFE" width={1.3} height={0.6} position={[0, 0, -0.102]} rotation={[0, Math.PI, 0]} background="#bee291" />
    </group>
    <Ball radius={0.11} color={C.yellow} position={[0, compact ? 2.97 : 3.08, 0]} />
  </group>
}

function SetDressing({ clock }: { clock: ClockRef }) {
  return <group>
    <MuseumGallery />
    <Cylinder radius={4.65} top={4.55} height={0.26} color={GALLERY.darkTeak} position={[0, 0.1, 0]} segments={96} outline={0.004} />
    <Cylinder radius={4.53} height={0.028} color={GALLERY.brass} position={[0, 0.233, 0]} segments={96} outline={0} />
    <Cylinder radius={4.42} height={0.025} color={GALLERY.stone} position={[0, 0.254, 0]} segments={96} outline={0} />
    <AbstractEmblem size={1.32} position={[-1.55, 0.269, 2.9]} rotation={[-Math.PI / 2, 0, -0.16]} color={A.dark} />
    <group position={[-7.35, 2.56, -5.3]} scale={0.67}>
      <Box size={[3.85, 1.37, 0.18]} color={A.dark} radius={0.09} />
      <Box size={[3.65, 1.17, 0.045]} color={A.white} position={[0, 0, 0.105]} radius={0.04} outline={0} />
      <Box size={[1.03, 1.17, 0.045]} color={A.green} position={[-1.31, 0, 0.117]} radius={0.04} outline={0} />
      <AbstractEmblem size={0.73} position={[-1.31, 0, 0.148]} color={A.dark} />
      <Label text="Abstract" width={2.28} height={0.65} position={[0.55, 0.17, 0.13]} background={A.white} color={A.dark} />
      <Label text="DEPARTURES" width={2.08} height={0.22} position={[0.55, -0.29, 0.13]} background={A.white} color={A.dark} />
      <Bolt position={[-1.81, 0.55, 0.134]} /><Bolt position={[1.81, -0.55, 0.134]} />
    </group>
    <group position={[-4.2, 0.28, -2.05]} rotation={[0, 0.2, 0]}>
      <Box size={[1.65, 0.76, 1.15]} color={C.coral} position={[0, 0.4, 0]} radius={0.12} />
      <Box size={[1.75, 0.14, 1.2]} color={C.yellow} position={[0, 0.8, 0]} />
      <Label text="EMERGENCY SNACKS" width={1.35} height={0.25} position={[0, 0.43, 0.585]} background={C.coral} />
      <Box size={[0.25, 0.3, 0.09]} color={C.dark} position={[0, 0.74, 0.62]} radius={0.025} />
    </group>
    <ClearanceSign clock={clock} />
    <Pipe points={[[-1.4, 0.4, -0.6], [-2.2, 0.3, -1.2], [-3, 0.29, -0.8], [-3.5, 0.29, -2.3], [-2.8, 0.29, -3.2], [-0.5, 0.29, -3.5]]} radius={0.075} color={C.dark} />
  </group>
}

function CameraDirector({ clock, receiptView }: { clock: ClockRef; receiptView: AttentionRef }) {
  const { camera, scene, size, pointer } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(0, 2.6, 0), [])
  const lookTarget = useMemo(() => new THREE.Vector3(), [])
  const previousFrame = useRef({ width: 0, height: 0, reduced: false })
  const receiptFrame = useMemo(() => receiptViewFrame(size.width / size.height), [size.width, size.height])
  useFrame((_, delta) => {
    const state = clock.current
    const reframing = size.width !== previousFrame.current.width || size.height !== previousFrame.current.height || state.reducedMotion !== previousFrame.current.reduced
    if (state.paused && !reframing) return
    previousFrame.current.width = size.width
    previousFrame.current.height = size.height
    previousFrame.current.reduced = state.reducedMotion
    const aspect = size.width / size.height
    const small = aspect < 1.1 || (Boolean(state.journey) && size.width < 600)
    const overviewDistance = small ? Math.max(16.5, (state.journey ? 13.4 : 12.2) / aspect) : 16.4
    // Portrait framing must not wash out the machine simply because its camera is farther away.
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = Math.max(23, overviewDistance + 6)
      scene.fog.far = scene.fog.near + 25
    }
    const inspect = state.procedure === 'inspection'
    const t = state.reducedMotion ? 0 : state.elapsed
    const close = smoothRange(t, 0.2, 1.8) * (1 - smoothRange(t, 3, 4.8))
    const printer = smoothRange(t, inspect ? 2.9 : 10.95, inspect ? 3.75 : 11.7) * (1 - smoothRange(t, inspect ? 4.8 : 14.8, inspect ? 6 : 17))
    const transport = inspect ? 0 : smoothRange(t, 5.2, 7) * (1 - smoothRange(t, 9.7, 11.4))
    const parallax = state.reducedMotion || state.running || receiptView.current ? 0 : 0.3
    target.set(4.9 - close * 3.8 - transport * 6 - printer * 0.1 + pointer.x * parallax, 4.7 + transport * 0.85 - printer * 1.1 + pointer.y * parallax * 0.35, overviewDistance - (small ? 0.9 : 2.8) * close - printer * (small ? 6.6 : 7.3))
    if (receiptView.current) target.set(...receiptFrame.position)
    const alpha = reframing || state.reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 4)
    camera.position.lerp(target, alpha)
    lookTarget.set((small ? state.journey ? .1 : .8 : 0) + printer * (small ? 1.6 : 2.05), 2.9 + close * 0.4 + transport * 0.35 - printer * 0.65, 0.1 + printer * 0.3)
    if (receiptView.current) lookTarget.set(...receiptFrame.look)
    look.lerp(lookTarget, alpha)
    // Finish the detail move at rest instead of endlessly chasing subpixel positions.
    if (receiptView.current) {
      if (camera.position.distanceToSquared(target) < 0.000009) camera.position.copy(target)
      if (look.distanceToSquared(lookTarget) < 0.000009) look.copy(lookTarget)
    }
    camera.lookAt(look)
    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = small ? 37 : 36
      if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix() }
    }
  })
  return null
}

export function ApparatusScene({ clock, token, portrait, attention, receiptView, onActivate, onInspectReceipt, proof, journey }: { clock: ClockRef; token: number; portrait: HTMLImageElement | null; attention: AttentionRef; receiptView: AttentionRef; onActivate: () => void; onInspectReceipt: () => void; proof?: VerifiedArrival; journey?: LiveJourney }) {
  return <>
    <color attach="background" args={[GALLERY.deepTeal]} />
    <fog attach="fog" args={[GALLERY.teal, 23, 48]} />
    <TheatricalLighting clock={clock} />
    <SetDressing clock={clock} />
    <Machine clock={clock} token={token} portrait={portrait} attention={attention} onActivate={onActivate} onInspectReceipt={onInspectReceipt} proof={proof} journey={journey} />
    <BoardingRack journey={journey} clock={clock} />
    <CameraDirector clock={clock} receiptView={receiptView} />
  </>
}
