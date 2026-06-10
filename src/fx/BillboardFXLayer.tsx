'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PALETTE } from '../core/palettes'
import { vectorFromTuple } from '../core/math'
import { useGameStore } from '../stores/useGameStore'
import { FXPool } from './FXPool'

const matrix = new THREE.Matrix4()
const position = new THREE.Vector3()
const scale = new THREE.Vector3()
const burstPosition = new THREE.Vector3()

function writeEvents(mesh: THREE.InstancedMesh | null, events: ReturnType<FXPool['active']>, cameraQuaternion: THREE.Quaternion, time: number) {
  if (!mesh) return 0
  const max = mesh.count
  const count = Math.min(events.length, max)
  for (let i = 0; i < count; i += 1) {
    const event = events[i]
    const age = (time - event.startTime) / event.duration
    position.copy(event.position).addScaledVector(event.velocity, age)
    position.y += Math.sin(age * Math.PI) * 0.22
    const s = (0.14 + event.intensity * 0.15) * (1 + Math.sin(age * Math.PI) * 0.72)
    scale.setScalar(Math.max(0.001, s * (1 - age * 0.35)))
    matrix.compose(position, cameraQuaternion, scale)
    mesh.setMatrixAt(i, matrix)
  }
  for (let i = count; i < max; i += 1) {
    matrix.compose(position.set(999, 999, 999), cameraQuaternion, scale.setScalar(0.001))
    mesh.setMatrixAt(i, matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
  return count
}

export function BillboardFXLayer() {
  const { camera } = useThree()
  const pool = useMemo(() => new FXPool(), [])
  const starRef = useRef<THREE.InstancedMesh>(null)
  const puffRef = useRef<THREE.InstancedMesh>(null)
  const tickRef = useRef<THREE.InstancedMesh>(null)
  const frame = useRef(0)

  useFrame(({ clock }) => {
    const store = useGameStore.getState()
    const bursts = store.consumeFXBursts()
    bursts.forEach((burst) => {
      vectorFromTuple(burst.position, burstPosition)
      pool.spawnGulpBurst(burstPosition, burst.intensity, burst.palette, clock.elapsedTime, burst.count)
    })
    pool.update(clock.elapsedTime)
    const active =
      writeEvents(starRef.current, pool.active('starburst'), camera.quaternion, clock.elapsedTime) +
      writeEvents(puffRef.current, pool.active('puff'), camera.quaternion, clock.elapsedTime) +
      writeEvents(tickRef.current, [...pool.active('tick'), ...pool.active('debris')], camera.quaternion, clock.elapsedTime)
    frame.current += 1
    if (frame.current % 12 === 0) store.setStats({ activeFX: active })
  })

  return (
    <group>
      <instancedMesh ref={starRef} args={[undefined, undefined, 64]} frustumCulled={false}>
        <circleGeometry args={[1, 8]} />
        <meshBasicMaterial color={PALETTE.warningYellow} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={puffRef} args={[undefined, undefined, 128]} frustumCulled={false}>
        <circleGeometry args={[1, 10]} />
        <meshBasicMaterial color={PALETTE.bone} depthWrite={false} transparent opacity={0.76} />
      </instancedMesh>
      <instancedMesh ref={tickRef} args={[undefined, undefined, 128]} frustumCulled={false}>
        <planeGeometry args={[0.22, 0.7]} />
        <meshBasicMaterial color={PALETTE.offWhite} depthWrite={false} />
      </instancedMesh>
    </group>
  )
}
