import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PALETTE } from '../core/palettes'
import { SLURPER_PARAMS } from '../core/parameters'
import { damp } from '../core/math'
import { OutlineMesh } from '../render/OutlineMesh'
import { createMouthRingMaterial, type MouthRingMaterial } from '../shaders/mouthRingMaterial'
import { getToonRampTexture } from '../shaders/toonRamp'
import { useGameStore } from '../stores/useGameStore'
import { useVacuumMotion } from '../systems/vacuum/useVacuumMotion'

function toon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getToonRampTexture()} />
}

export function VacuumRig() {
  const root = useRef<THREE.Group>(null)
  const mouthDisc = useRef<THREE.Group>(null)
  const flash = useRef(0)
  const motion = useVacuumMotion()
  const mouthMaterial = useMemo(() => createMouthRingMaterial(), []) as MouthRingMaterial

  useFrame(({ clock }, dt) => {
    if (!root.current) return
    const store = useGameStore.getState()
    const flashImpulse = store.drainMouthFlashImpulse()
    if (flashImpulse > 0) flash.current = Math.min(1.9, flash.current + flashImpulse * 0.2)
    flash.current = damp(flash.current, 0, 12, Math.min(dt, 0.04))
    const t = clock.elapsedTime
    const idleBob = Math.sin(t * SLURPER_PARAMS.vacuum.idleBobHz * Math.PI * 2) * SLURPER_PARAMS.vacuum.idleBobAmplitude
    root.current.position.copy(motion.position)
    root.current.position.y += idleBob
    root.current.rotation.y = motion.yaw
    root.current.scale.setScalar(1 + motion.recoil * 0.11 + flash.current * 0.025)
    mouthMaterial.uniforms.uTime.value = t
    mouthMaterial.uniforms.uPulse.value = Math.min(2.15, motion.mouthPulse + motion.recoil * 1.25 + flash.current)
    if (mouthDisc.current) {
      const pulse = 1 + Math.sin(t * SLURPER_PARAMS.vacuum.mouthPulseHz * Math.PI * 2) * 0.035 * motion.mouthPulse
      mouthDisc.current.scale.setScalar(pulse + motion.recoil * 0.28 + flash.current * 0.1)
    }
  })

  return (
    <group ref={root} position={[0, 0.6, 0]}>
      <group position={[0, 0, motion.recoil * 0.15]} scale={[1 + motion.recoil * 0.14, 1 - motion.recoil * 0.08, 1]}>
        <OutlineMesh
          position={[0, 0.15, 0.08]}
          scale={[1.7, 0.75, 1.0]}
          outlineWidth={SLURPER_PARAMS.outlines.vacuumHeroWorld}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          material={toon(PALETTE.uiSteel)}
        />
        <OutlineMesh
          position={[0, 0.18, 0.86]}
          scale={[0.9, 0.55, 0.66]}
          outlineWidth={SLURPER_PARAMS.outlines.vacuumHeroWorld}
          geometry={<sphereGeometry args={[1, 12, 8]} />}
          material={toon(PALETTE.rust)}
        />
        <OutlineMesh
          position={[-0.82, -0.32, 0.24]}
          rotation-z={Math.PI / 2}
          scale={[0.28, 0.28, 0.18]}
          outlineWidth={SLURPER_PARAMS.outlines.vacuumDetailWorld}
          geometry={<cylinderGeometry args={[1, 1, 1, 10]} />}
          material={toon(PALETTE.asphaltInk)}
        />
        <OutlineMesh
          position={[0.82, -0.32, 0.24]}
          rotation-z={Math.PI / 2}
          scale={[0.28, 0.28, 0.18]}
          outlineWidth={SLURPER_PARAMS.outlines.vacuumDetailWorld}
          geometry={<cylinderGeometry args={[1, 1, 1, 10]} />}
          material={toon(PALETTE.asphaltInk)}
        />
        <OutlineMesh
          position={[0, 0.48, 0.1]}
          scale={[0.55, 0.14, 0.08]}
          outlineWidth={SLURPER_PARAMS.outlines.vacuumDetailWorld}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          material={toon(PALETTE.bone)}
        />
      </group>
      <group ref={mouthDisc} position={[0, 0.18, -1.04]}>
        <OutlineMesh
          rotation-x={Math.PI / 2}
          scale={[0.84, 0.84, 0.84]}
          outlineWidth={SLURPER_PARAMS.outlines.vacuumHeroWorld}
          geometry={<torusGeometry args={[0.68, 0.16, 10, 24]} />}
          material={toon(PALETTE.warningYellow)}
        />
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}>
          <circleGeometry args={[0.64, 32]} />
          <primitive object={mouthMaterial} attach="material" />
        </mesh>
      </group>
      <mesh position={[0, -0.47, 0.22]} rotation-x={-Math.PI / 2} scale={[1.5, 0.82, 1]}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color="#18151E" transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </group>
  )
}
