import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  GlowbudTraitAvatarAsset,
  GlowbudWizardCritterAsset,
  RedShellIdleCritterAsset,
  type GlowbudCompanionTrait,
  type GlowbudEyeTrait,
  type GlowbudFaceTrait,
  type GlowbudHeadTrait,
  type GlowbudHeldTrait,
  type GlowbudMouthTrait,
  type GlowbudNoseTrait,
  type GlowbudPotTrait,
  type GlowbudShellTrait,
  type GlowbudSkinTrait,
  type GlowbudTraitLoadout,
  type RedShellCritterAnimation,
} from '../../code-examples/RedShellIdleCritterAsset.example'

const params = new URLSearchParams(window.location.search)
const initialYaw = Number(params.get('yaw') ?? 0)
const initialPitch = Number(params.get('pitch') ?? -0.06)
const initialRoll = Number(params.get('roll') ?? 0)
const initialZoom = Number(params.get('zoom') ?? 1)
const initialOffsetX = Number(params.get('offsetX') ?? 0)
const initialOffsetY = Number(params.get('offsetY') ?? 0)
const initialOffsetZ = Number(params.get('offsetZ') ?? 0)
const asset = params.get('asset') ?? 'red'
const animationParam = params.get('animation')
const animation: RedShellCritterAnimation = animationParam === 'hop' || animationParam === 'grumble' ? animationParam : 'idle'
const sceneY = animation === 'hop' ? -0.32 : 0.02
const assetSceneY =
  asset === 'moss-venus-green' ? sceneY - 0.62 : asset === 'aero-venus' || asset === 'aero-venus-gray-staff-snail' ? sceneY - 0.1 : sceneY
const phaseParam = params.get('phase')
const phaseOverride = phaseParam === null ? undefined : Number(phaseParam)
const exportDuration = Number(params.get('exportDuration') ?? (animation === 'hop' ? 1.55 : animation === 'grumble' ? 2.55 : 4))
const cameraLoop = params.get('cameraLoop')
const queryTraitLoadout: GlowbudTraitLoadout = {
  shell: (params.get('shell') ?? 'seed-shell') as GlowbudShellTrait,
  head: (params.get('head') ?? 'none') as GlowbudHeadTrait,
  pot: (params.get('pot') ?? 'blue-flower-pot') as GlowbudPotTrait,
  companion: (params.get('companion') ?? 'none') as GlowbudCompanionTrait,
  held: (params.get('held') ?? 'none') as GlowbudHeldTrait,
  face: (params.get('face') ?? 'soft') as GlowbudFaceTrait,
  eyes: (params.get('eyes') ?? 'mellow') as GlowbudEyeTrait,
  mouth: (params.get('mouth') ?? 'classic-smile') as GlowbudMouthTrait,
  nose: (params.get('nose') ?? 'none') as GlowbudNoseTrait,
  skin: (params.get('skin') ?? 'glow-lime') as GlowbudSkinTrait,
}

declare global {
  interface Window {
    __setRedShellExportPhase?: (phase: number | undefined) => void
    __setRedShellExportView?: (view: Partial<ExportView>) => void
  }
}

type ExportView = {
  yaw: number
  pitch: number
  roll: number
  zoom: number
  offsetX: number
  offsetY: number
  offsetZ: number
}

function resolveLoopedView(view: ExportView, phase: number | undefined) {
  if (cameraLoop !== 'venus-orbit-zoom' || phase === undefined || !Number.isFinite(phase)) return view
  const loopPhase = ((phase % 1) + 1) % 1
  const zoomPulse = Math.sin(loopPhase * Math.PI) ** 2

  return {
    yaw: view.yaw + loopPhase * Math.PI * 2,
    pitch: view.pitch - zoomPulse * 0.07,
    roll: view.roll + Math.sin(loopPhase * Math.PI * 2) * 0.012,
    zoom: view.zoom + zoomPulse * 0.54,
    offsetX: view.offsetX,
    offsetY: view.offsetY - zoomPulse * 0.38,
    offsetZ: view.offsetZ,
  }
}

function ExportClock({ phase }: { phase?: number }) {
  useFrame(({ clock }) => {
    if (phase === undefined || !Number.isFinite(phase)) return
    clock.elapsedTime = phase * exportDuration
  }, -1000)

  return null
}

function ExportScene() {
  const [runtimePhaseOverride, setRuntimePhaseOverride] = useState<number | undefined>(phaseOverride)
  const [runtimeView, setRuntimeView] = useState<ExportView>({
    yaw: initialYaw,
    pitch: initialPitch,
    roll: initialRoll,
    zoom: initialZoom,
    offsetX: initialOffsetX,
    offsetY: initialOffsetY,
    offsetZ: initialOffsetZ,
  })

  useEffect(() => {
    window.__setRedShellExportPhase = setRuntimePhaseOverride
    window.__setRedShellExportView = (nextView) => {
      setRuntimeView((currentView) => ({
        yaw: Number.isFinite(nextView.yaw) ? Number(nextView.yaw) : currentView.yaw,
        pitch: Number.isFinite(nextView.pitch) ? Number(nextView.pitch) : currentView.pitch,
        roll: Number.isFinite(nextView.roll) ? Number(nextView.roll) : currentView.roll,
        zoom: Number.isFinite(nextView.zoom) ? Number(nextView.zoom) : currentView.zoom,
        offsetX: Number.isFinite(nextView.offsetX) ? Number(nextView.offsetX) : currentView.offsetX,
        offsetY: Number.isFinite(nextView.offsetY) ? Number(nextView.offsetY) : currentView.offsetY,
        offsetZ: Number.isFinite(nextView.offsetZ) ? Number(nextView.offsetZ) : currentView.offsetZ,
      }))
    }
    return () => {
      delete window.__setRedShellExportPhase
      delete window.__setRedShellExportView
    }
  }, [])

  const resolvedView = resolveLoopedView(runtimeView, runtimePhaseOverride)

  return (
    <Canvas
      camera={{ position: [0, 0.05, 7.4], fov: 34 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      dpr={[1, 1.5]}
      style={{ width: '100vw', height: '100vh', background: 'transparent' }}
    >
      <ExportClock phase={runtimePhaseOverride} />
      <ambientLight intensity={1.08} color="#ffe0f7" />
      <hemisphereLight args={['#fff3cb', '#8eefff', 0.42]} />
      <directionalLight position={[-4.5, 7.6, 4.8]} intensity={3.25} color="#fff1a2" />
      <directionalLight position={[4.6, 3.8, -4.2]} intensity={0.72} color="#91f4ff" />
      <pointLight position={[-1.8, 1.2, 3.4]} intensity={0.42} color="#ffd3a6" />
      <group
        rotation={[resolvedView.pitch, Math.PI + resolvedView.yaw, resolvedView.roll]}
        position={[resolvedView.offsetX, assetSceneY + resolvedView.offsetY, resolvedView.offsetZ]}
      >
        {asset === 'wizard' ? (
          <GlowbudWizardCritterAsset animation={animation} scale={1.16 * resolvedView.zoom} activity={1} />
        ) : asset === 'trait' ? (
          <GlowbudTraitAvatarAsset
            animation={animation}
            scale={1.02 * resolvedView.zoom}
            activity={1}
            traits={queryTraitLoadout}
          />
        ) : asset === 'moss-venus-green' ? (
          <GlowbudTraitAvatarAsset
            animation={animation}
            scale={1.02 * resolvedView.zoom}
            activity={1}
            traits={{
              shell: 'moss-shell',
              head: 'venus-flytrap',
              pot: 'blue-flower-pot',
              held: 'none',
              face: 'soft',
              skin: 'glow-lime',
              flytrap: 'friendly-bite',
            }}
          />
        ) : asset === 'aero-venus' ? (
          <GlowbudTraitAvatarAsset
            animation={animation}
            scale={0.98 * resolvedView.zoom}
            activity={1}
            traits={{
              shell: 'aero-metal-shell',
              head: 'venus-flytrap',
              pot: 'blue-flower-pot',
              companion: 'none',
              held: 'none',
              face: 'soft',
              eyes: 'mellow',
              mouth: 'classic-smile',
              skin: 'red',
              flytrap: 'friendly-bite',
            }}
          />
        ) : asset === 'aero-venus-gray-staff-snail' ? (
          <GlowbudTraitAvatarAsset
            animation={animation}
            scale={0.96 * resolvedView.zoom}
            activity={1}
            traits={{
              shell: 'aero-metal-shell',
              head: 'venus-flytrap',
              pot: 'blue-flower-pot',
              companion: 'cartoon-snail',
              held: 'wizard-staff',
              face: 'soft',
              eyes: 'mellow',
              mouth: 'classic-smile',
              skin: 'stone-gray',
              flytrap: 'friendly-bite',
            }}
          />
        ) : asset === 'duo' ? (
          <>
            <group position={[-1.25, 0, 0]}>
              <RedShellIdleCritterAsset mode="dressed" animation={animation} scale={0.82 * resolvedView.zoom} activity={1} />
            </group>
            <group position={[1.25, 0.02, 0]}>
              <GlowbudWizardCritterAsset animation={animation} scale={0.84 * resolvedView.zoom} activity={1} />
            </group>
          </>
        ) : (
          <RedShellIdleCritterAsset mode="dressed" animation={animation} scale={1.16 * resolvedView.zoom} activity={1} />
        )}
      </group>
    </Canvas>
  )
}

createRoot(document.getElementById('root') as HTMLElement).render(<ExportScene />)
