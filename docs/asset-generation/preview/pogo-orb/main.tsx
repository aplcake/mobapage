import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import {
  PsychedelicPogoOrbAsset,
  type PsychedelicPogoOrbAnimation,
  type PsychedelicPogoOrbDebugMaterial,
  type PsychedelicPogoOrbExpression,
  type PsychedelicPogoOrbMode,
} from '../../code-examples/PsychedelicPogoOrbAsset.example'

type BackgroundMode = 'dark' | 'light' | 'checker'
type AnglePreset = 'front' | 'left-3q' | 'right-3q' | 'top-3q'

const ANIMATIONS: PsychedelicPogoOrbAnimation[] = [
  'still',
  'idle',
  'walk',
  'walk-2',
  'run',
  'stop',
  'hop',
  'forward-hop',
  'ball-bounce',
  'forward-ball-bounce',
  'reference-ball-bounce',
  'disco-point',
  'carlton-groove',
  'overhead-shimmy',
  'pogo-boogie',
  'ledge-fall',
  'reference-bounce',
]
const MODES: PsychedelicPogoOrbMode[] = ['full', 'body', 'limbs', 'face', 'debug-rig']
const EXPRESSIONS: PsychedelicPogoOrbExpression[] = [
  'auto',
  'neutral',
  'happy',
  'blink',
  'squash',
  'surprised',
  'focused',
  'delighted',
  'effort',
]
const DEBUG_MODES: PsychedelicPogoOrbDebugMaterial[] = [
  'none',
  'flat',
  'uv',
  'bands',
  'glow-off',
  'face-contrast',
  'super-psychedelic',
  'silhouette',
]
const BACKGROUNDS: BackgroundMode[] = ['dark', 'light', 'checker']
const ANGLES: Record<AnglePreset, { yaw: number; pitch: number; roll: number }> = {
  front: { yaw: 0, pitch: -0.03, roll: 0 },
  'left-3q': { yaw: -0.58, pitch: -0.05, roll: 0 },
  'right-3q': { yaw: 0.58, pitch: -0.05, roll: 0 },
  'top-3q': { yaw: -0.42, pitch: -0.42, roll: 0 },
}
const ANGLE_PRESETS = Object.keys(ANGLES) as AnglePreset[]
const MIN_ZOOM = 0.12
const MAX_ZOOM = 1.48

function titleCase(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function readEnumParam<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const value = new URLSearchParams(window.location.search).get(name)
  return allowed.includes(value as T) ? (value as T) : fallback
}

function readNumberParam(name: string, fallback: number, min: number, max: number) {
  const value = new URLSearchParams(window.location.search).get(name)
  if (value === null) return fallback
  const raw = Number(value)
  if (!Number.isFinite(raw)) return fallback
  return Math.min(max, Math.max(min, raw))
}

function readBoolParam(name: string, fallback = false) {
  const value = new URLSearchParams(window.location.search).get(name)
  if (value === '1' || value === 'true') return true
  if (value === '0' || value === 'false') return false
  return fallback
}

function setUrlParam(name: string, value: string | number | boolean | undefined) {
  const params = new URLSearchParams(window.location.search)
  if (value === undefined || value === '' || value === false) {
    params.delete(name)
  } else {
    params.set(name, String(value))
  }
  const query = params.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
}

function FloorReference({ background }: { background: BackgroundMode }) {
  const isDark = background === 'dark'
  const fillColor = isDark ? '#352a4e' : '#dfe9f1'
  const lineColor = isDark ? '#90a5ff' : '#9daabd'
  const floorOpacity = isDark ? 0.58 : 0.82
  const lineOpacity = isDark ? 0.36 : 0.42

  return (
    <group position={[0, -2.075, 0.16]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-8}>
      <mesh scale={[2.6, 1.14, 1]} renderOrder={-8}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color={fillColor} transparent opacity={floorOpacity} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh scale={[2.6, 1.14, 1]} renderOrder={-7}>
        <ringGeometry args={[0.965, 1, 72]} />
        <meshBasicMaterial color={lineColor} transparent opacity={lineOpacity} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {[-0.42, 0, 0.42].map((lineOffset) => (
        <mesh key={lineOffset} position={[0, lineOffset, 0.006]} scale={[1.82 - Math.abs(lineOffset) * 0.72, 0.018, 1]} renderOrder={-6}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={lineColor} transparent opacity={lineOpacity * 0.56} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function PreviewScene({
  mode,
  animation,
  expression,
  debugMaterial,
  background,
  angle,
  zoom,
  glowEnabled,
  glowIntensity,
  colorCycleSpeed,
  freezePhase,
  phase,
  floorEnabled,
}: {
  mode: PsychedelicPogoOrbMode
  animation: PsychedelicPogoOrbAnimation
  expression: PsychedelicPogoOrbExpression
  debugMaterial: PsychedelicPogoOrbDebugMaterial
  background: BackgroundMode
  angle: AnglePreset
  zoom: number
  glowEnabled: boolean
  glowIntensity: number
  colorCycleSpeed: number
  freezePhase: boolean
  phase: number
  floorEnabled: boolean
}) {
  const anglePreset = ANGLES[angle]
  const backgroundColor = background === 'dark' ? '#221934' : '#f8fbff'
  const effectiveGlowIntensity = glowEnabled ? glowIntensity : 0

  return (
    <Canvas
      camera={{ position: [0, 0.05, 7.4], fov: 34 }}
      gl={{ antialias: true, alpha: background === 'checker' }}
      dpr={[1, 1.5]}
    >
      {background === 'checker' ? null : <color attach="background" args={[backgroundColor]} />}
      <ambientLight intensity={background === 'dark' ? 0.78 : 1.02} color={background === 'dark' ? '#bbc7ff' : '#fff5df'} />
      <hemisphereLight args={['#fff1a8', '#8af8ff', background === 'dark' ? 0.46 : 0.38]} />
      <directionalLight position={[-4.5, 7.5, 4.2]} intensity={2.65} color="#fff0ac" />
      <directionalLight position={[4.8, 3.2, -4.4]} intensity={0.92} color="#82ecff" />
      <pointLight position={[-2.8, 1.2, 3.2]} intensity={0.38} color="#ff82cf" />
      <group
        position={[0, 0.34, 0]}
        rotation={[anglePreset.pitch, Math.PI + anglePreset.yaw, anglePreset.roll]}
      >
        <group scale={1.08 * zoom}>
          {floorEnabled ? <FloorReference background={background} /> : null}
          <PsychedelicPogoOrbAsset
            mode={mode}
            animation={animation}
            activity={1}
            glowIntensity={effectiveGlowIntensity}
            colorCycleSpeed={colorCycleSpeed}
            expression={expression}
            debugMaterial={debugMaterial}
            scale={1}
            phaseOverride={freezePhase ? phase : undefined}
          />
        </group>
      </group>
      <OrbitControls enablePan={false} enableDamping minDistance={3.2} maxDistance={8.4} />
    </Canvas>
  )
}

function App() {
  const [mode, setMode] = useState<PsychedelicPogoOrbMode>(() => readEnumParam('mode', MODES, 'full'))
  const [animation, setAnimation] = useState<PsychedelicPogoOrbAnimation>(() => readEnumParam('animation', ANIMATIONS, 'idle'))
  const [expression, setExpression] = useState<PsychedelicPogoOrbExpression>(() => readEnumParam('expression', EXPRESSIONS, 'auto'))
  const [debugMaterial, setDebugMaterial] = useState<PsychedelicPogoOrbDebugMaterial>(() => readEnumParam('debugMaterial', DEBUG_MODES, 'none'))
  const [background, setBackground] = useState<BackgroundMode>(() => readEnumParam('background', BACKGROUNDS, 'dark'))
  const [angle, setAngle] = useState<AnglePreset>(() => readEnumParam('angle', ANGLE_PRESETS, 'front'))
  const [zoom, setZoom] = useState(() => readNumberParam('zoom', 0.38, MIN_ZOOM, MAX_ZOOM))
  const [glowEnabled, setGlowEnabled] = useState(() => readBoolParam('glow', true))
  const [floorEnabled, setFloorEnabled] = useState(() => readBoolParam('floor', true))
  const [glowIntensity, setGlowIntensity] = useState(() => readNumberParam('glowIntensity', 1, 0, 1.6))
  const [colorCycleSpeed, setColorCycleSpeed] = useState(() => readNumberParam('colorCycleSpeed', 1, 0, 2.4))
  const [freezePhase, setFreezePhase] = useState(() => readBoolParam('freeze', false))
  const [phase, setPhase] = useState(() => readNumberParam('phase', 0.2, 0, 1))

  function choose<T extends string>(name: string, next: T, setter: (value: T) => void) {
    setter(next)
    setUrlParam(name, next)
  }

  function chooseNumber(name: string, next: number, setter: (value: number) => void) {
    const rounded = Number(next.toFixed(2))
    setter(rounded)
    setUrlParam(name, rounded)
  }

  return (
    <main className="preview-shell">
      <header className="toolbar">
        <div className="title">
          <strong>Psychedelic Pogo Orb</strong>
          <span>{titleCase(animation)} / {titleCase(debugMaterial)}</span>
          <a className="nav-link" href="/control.html">Control Room</a>
        </div>

        <div className="control">
          <label htmlFor="mode-control">Mode</label>
          <select id="mode-control" value={mode} onChange={(event) => choose('mode', event.target.value as PsychedelicPogoOrbMode, setMode)}>
            {MODES.map((value) => (
              <option key={value} value={value}>{titleCase(value)}</option>
            ))}
          </select>
        </div>

        <div className="control">
          <label htmlFor="animation-control">Animation</label>
          <select id="animation-control" value={animation} onChange={(event) => choose('animation', event.target.value as PsychedelicPogoOrbAnimation, setAnimation)}>
            {ANIMATIONS.map((value) => (
              <option key={value} value={value}>{titleCase(value)}</option>
            ))}
          </select>
        </div>

        <div className="control">
          <label htmlFor="expression-control">Expression</label>
          <select id="expression-control" value={expression} onChange={(event) => choose('expression', event.target.value as PsychedelicPogoOrbExpression, setExpression)}>
            {EXPRESSIONS.map((value) => (
              <option key={value} value={value}>{titleCase(value)}</option>
            ))}
          </select>
        </div>

        <div className="control">
          <label htmlFor="debug-control">Material</label>
          <select id="debug-control" value={debugMaterial} onChange={(event) => choose('debugMaterial', event.target.value as PsychedelicPogoOrbDebugMaterial, setDebugMaterial)}>
            {DEBUG_MODES.map((value) => (
              <option key={value} value={value}>{titleCase(value)}</option>
            ))}
          </select>
        </div>

        <div className="control">
          <label htmlFor="angle-control">Angle</label>
          <select id="angle-control" value={angle} onChange={(event) => choose('angle', event.target.value as AnglePreset, setAngle)}>
            {ANGLE_PRESETS.map((value) => (
              <option key={value} value={value}>{titleCase(value)}</option>
            ))}
          </select>
        </div>

        <div className="control">
          <label htmlFor="background-control">Background</label>
          <select id="background-control" value={background} onChange={(event) => choose('background', event.target.value as BackgroundMode, setBackground)}>
            {BACKGROUNDS.map((value) => (
              <option key={value} value={value}>{titleCase(value)}</option>
            ))}
          </select>
        </div>

        <div className="control">
          <label htmlFor="zoom-control">Zoom</label>
          <div className="inline-range">
            <input
              id="zoom-control"
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.04}
              value={zoom}
              onChange={(event) => chooseNumber('zoom', Number(event.target.value), setZoom)}
            />
            <span className="range-readout">{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        <div className="control">
          <label htmlFor="glow-control">Glow</label>
          <button
            id="glow-control"
            type="button"
            className="toggle"
            aria-pressed={glowEnabled}
            onClick={() => {
              setGlowEnabled((current) => {
                const next = !current
                setUrlParam('glow', next ? '1' : '0')
                return next
              })
            }}
          >
            {glowEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <div className="control">
          <label htmlFor="floor-control">Floor</label>
          <button
            id="floor-control"
            type="button"
            className="toggle"
            aria-pressed={floorEnabled}
            onClick={() => {
              setFloorEnabled((current) => {
                const next = !current
                setUrlParam('floor', next ? '1' : '0')
                return next
              })
            }}
          >
            {floorEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <div className="control">
          <label htmlFor="intensity-control">Intensity</label>
          <div className="inline-range">
            <input
              id="intensity-control"
              type="range"
              min={0}
              max={1.6}
              step={0.05}
              value={glowIntensity}
              onChange={(event) => chooseNumber('glowIntensity', Number(event.target.value), setGlowIntensity)}
            />
            <span className="range-readout">{glowIntensity.toFixed(2)}</span>
          </div>
        </div>

        <div className="control">
          <label htmlFor="speed-control">Cycle</label>
          <div className="inline-range">
            <input
              id="speed-control"
              type="range"
              min={0}
              max={2.4}
              step={0.05}
              value={colorCycleSpeed}
              onChange={(event) => chooseNumber('colorCycleSpeed', Number(event.target.value), setColorCycleSpeed)}
            />
            <span className="range-readout">{colorCycleSpeed.toFixed(2)}</span>
          </div>
        </div>

        <div className="control">
          <label htmlFor="freeze-control">Freeze</label>
          <button
            id="freeze-control"
            type="button"
            className="toggle"
            aria-pressed={freezePhase}
            onClick={() => {
              setFreezePhase((current) => {
                const next = !current
                setUrlParam('freeze', next ? '1' : '0')
                return next
              })
            }}
          >
            {freezePhase ? 'On' : 'Off'}
          </button>
        </div>

        <div className="control">
          <label htmlFor="phase-control">Phase</label>
          <div className="inline-range">
            <input
              id="phase-control"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={phase}
              onChange={(event) => chooseNumber('phase', Number(event.target.value), setPhase)}
            />
            <span className="range-readout">{phase.toFixed(2)}</span>
          </div>
        </div>
      </header>

      <section className={`stage ${background === 'checker' ? 'is-checker' : ''}`}>
        <PreviewScene
          mode={mode}
          animation={animation}
          expression={expression}
          debugMaterial={debugMaterial}
          background={background}
          angle={angle}
          zoom={zoom}
          glowEnabled={glowEnabled}
          glowIntensity={glowIntensity}
          colorCycleSpeed={colorCycleSpeed}
          freezePhase={freezePhase}
          phase={phase}
          floorEnabled={floorEnabled}
        />
        <div className="badge" aria-hidden="true">
          <span>{titleCase(angle)}</span>
          <span>{glowEnabled ? 'Glow On' : 'Glow Off'}</span>
          <span>{freezePhase ? `Phase ${phase.toFixed(2)}` : 'Live'}</span>
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />)
