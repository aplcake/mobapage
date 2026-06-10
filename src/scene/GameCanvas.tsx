'use client'

import { Canvas } from '@react-three/fiber'
import { useEffect } from 'react'
import { GAME_CONFIG } from '../core/config'
import { Arena } from './Arena'
import { CameraRig } from './CameraRig'
import { LightingRig } from './LightingRig'
import { VacuumRig } from './VacuumRig'
import { SlimeField } from '../systems/slime/SlimeField'
import { usePointerToWorld } from '../systems/input/usePointerToWorld'
import { BillboardFXLayer } from '../fx/BillboardFXLayer'
import { MutePlate } from '../ui/MutePlate'
import { DebugPanel } from '../ui/DebugPanel'
import { useGameStore } from '../stores/useGameStore'

function SceneRoot() {
  usePointerToWorld()
  return (
    <>
      <CameraRig />
      <LightingRig />
      <Arena />
      <SlimeField />
      <VacuumRig />
      <BillboardFXLayer />
    </>
  )
}

export function GameCanvas() {
  const tier = useGameStore((state) => state.performanceTier)
  const setReducedMotion = useGameStore((state) => state.setReducedMotion)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(media.matches)
    const onChange = () => setReducedMotion(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [setReducedMotion])

  return (
    <div className="gameSurface">
      <Canvas
        dpr={GAME_CONFIG.render.dpr[tier]}
        camera={{ fov: GAME_CONFIG.camera.fovDeg, position: [0, GAME_CONFIG.camera.height, GAME_CONFIG.camera.distance] }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[GAME_CONFIG.render.clearColor]} />
        <SceneRoot />
      </Canvas>
      <div className="uiLayer">
        <MutePlate />
        <DebugPanel />
      </div>
    </div>
  )
}
