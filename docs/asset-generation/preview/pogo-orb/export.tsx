import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import {
  PsychedelicPogoOrbAsset,
  type PsychedelicPogoOrbAnimation,
  type PsychedelicPogoOrbDebugMaterial,
  type PsychedelicPogoOrbExpression,
} from '../../code-examples/PsychedelicPogoOrbAsset.example'

const params = new URLSearchParams(window.location.search)
const yaw = Number(params.get('yaw') ?? 0)
const pitch = Number(params.get('pitch') ?? -0.03)
const roll = Number(params.get('roll') ?? 0)
const zoom = Number(params.get('zoom') ?? 1)
const glowIntensity = Number(params.get('glowIntensity') ?? 1)
const colorCycleSpeed = Number(params.get('colorCycleSpeed') ?? 1)
const phaseParam = params.get('phase')
const phaseOverride = phaseParam === null ? undefined : Number(phaseParam)
const animationParam = params.get('animation')
const debugParam = params.get('debugMaterial')
const expressionParam = params.get('expression')
const floorEnabled = params.get('floor') !== '0'
const animation: PsychedelicPogoOrbAnimation =
  animationParam === 'still' ||
  animationParam === 'walk' ||
  animationParam === 'walk-2' ||
  animationParam === 'run' ||
  animationParam === 'stop' ||
  animationParam === 'hop' ||
  animationParam === 'forward-hop' ||
  animationParam === 'ball-bounce' ||
  animationParam === 'forward-ball-bounce' ||
  animationParam === 'reference-ball-bounce' ||
  animationParam === 'disco-point' ||
  animationParam === 'carlton-groove' ||
  animationParam === 'overhead-shimmy' ||
  animationParam === 'pogo-boogie' ||
  animationParam === 'ledge-fall' ||
  animationParam === 'reference-bounce'
    ? animationParam
    : 'idle'
const debugMaterial: PsychedelicPogoOrbDebugMaterial =
  debugParam === 'flat' ||
  debugParam === 'uv' ||
  debugParam === 'bands' ||
  debugParam === 'glow-off' ||
  debugParam === 'face-contrast' ||
  debugParam === 'super-psychedelic' ||
  debugParam === 'silhouette'
    ? debugParam
    : 'none'
const expression: PsychedelicPogoOrbExpression =
  expressionParam === 'neutral' ||
  expressionParam === 'happy' ||
  expressionParam === 'blink' ||
  expressionParam === 'squash' ||
  expressionParam === 'surprised' ||
  expressionParam === 'focused' ||
  expressionParam === 'delighted' ||
  expressionParam === 'effort'
    ? expressionParam
    : 'auto'

declare global {
  interface Window {
    __setPogoOrbExportPhase?: (phase: number | undefined) => void
  }
}

function FloorReference() {
  return (
    <group position={[0, -2.075, 0.16]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-8}>
      <mesh scale={[2.6, 1.14, 1]} renderOrder={-8}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color="#dfe9f1" transparent opacity={0.72} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh scale={[2.6, 1.14, 1]} renderOrder={-7}>
        <ringGeometry args={[0.965, 1, 72]} />
        <meshBasicMaterial color="#9daabd" transparent opacity={0.42} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {[-0.42, 0, 0.42].map((lineOffset) => (
        <mesh key={lineOffset} position={[0, lineOffset, 0.006]} scale={[1.82 - Math.abs(lineOffset) * 0.72, 0.018, 1]} renderOrder={-6}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#9daabd" transparent opacity={0.23} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function ExportScene() {
  const [runtimePhaseOverride, setRuntimePhaseOverride] = useState<number | undefined>(phaseOverride)

  useEffect(() => {
    window.__setPogoOrbExportPhase = setRuntimePhaseOverride
    return () => {
      delete window.__setPogoOrbExportPhase
    }
  }, [])

  return (
    <Canvas
      camera={{ position: [0, 0.05, 7.4], fov: 34 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      dpr={[1, 1.5]}
      style={{ width: '100vw', height: '100vh', background: 'transparent' }}
    >
      <ambientLight intensity={0.94} color="#dbe3ff" />
      <hemisphereLight args={['#fff1a8', '#8af8ff', 0.46]} />
      <directionalLight position={[-4.5, 7.5, 4.2]} intensity={2.65} color="#fff0ac" />
      <directionalLight position={[4.8, 3.2, -4.4]} intensity={0.92} color="#82ecff" />
      <pointLight position={[-2.8, 1.2, 3.2]} intensity={0.38} color="#ff82cf" />
      <group position={[0, 0.34, 0]} rotation={[pitch, Math.PI + yaw, roll]}>
        <group scale={1.08 * zoom}>
          {floorEnabled ? <FloorReference /> : null}
          <PsychedelicPogoOrbAsset
            animation={animation}
            activity={1}
            glowIntensity={glowIntensity}
            colorCycleSpeed={colorCycleSpeed}
            expression={expression}
            debugMaterial={debugMaterial}
            scale={1}
            phaseOverride={runtimePhaseOverride}
          />
        </group>
      </group>
    </Canvas>
  )
}

createRoot(document.getElementById('root') as HTMLElement).render(<ExportScene />)
