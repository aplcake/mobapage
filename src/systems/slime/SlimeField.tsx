'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SLURPER_PARAMS } from '../../core/parameters'
import { tupleFromVector, vectorFromTuple } from '../../core/math'
import { getOutlineMaterial } from '../../shaders/outlineMaterial'
import { createSlimeMaterial, type SlimeMaterial } from '../../shaders/slimeMaterial'
import { useGameStore } from '../../stores/useGameStore'
import { triggerHaptic } from '../../haptics/haptics'
import { playSoundHook } from '../../audio/soundHooks'
import { RESPAWN_SITES } from '../../scene/RespawnProps'
import { checkInwardInvariant, summarizeInvariant, type InwardInvariantSample } from '../suction/invariantChecks'
import { createSlimePieces, slimeStateToAttribute, stepSlimePiece } from './slimeMachine'
import { composeSlimeMatrix } from './SlimePatch'

const matrix = new THREE.Matrix4()
const outlineMatrix = new THREE.Matrix4()
const mouth = new THREE.Vector3()

export function SlimeField() {
  const tier = useGameStore((state) => state.performanceTier)
  const count =
    tier === 'high'
      ? SLURPER_PARAMS.performance.activePiecesHigh
      : tier === 'low'
        ? SLURPER_PARAMS.performance.activePiecesLow
        : SLURPER_PARAMS.performance.activePiecesMid
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const outlineRef = useRef<THREE.InstancedMesh>(null)
  const frameCount = useRef(0)
  const invariantWindow = useRef<InwardInvariantSample[]>([])
  const pieces = useMemo(() => createSlimePieces(count, RESPAWN_SITES), [count])
  const material = useMemo(() => createSlimeMaterial(0), []) as SlimeMaterial
  const phase = useMemo(() => Float32Array.from(pieces.map((piece) => piece.phase)), [pieces])
  const vitality = useMemo(() => Float32Array.from(pieces.map((piece) => piece.vitality)), [pieces])
  const states = useMemo(() => new Float32Array(count), [count])
  const stretch = useMemo(() => new Float32Array(count), [count])
  const residue = useMemo(() => new Float32Array(count), [count])
  const palette = useMemo(() => Float32Array.from(pieces.map((piece) => piece.paletteIndex)), [pieces])

  useFrame(({ clock }, dt) => {
    const mesh = meshRef.current
    const outline = outlineRef.current
    if (!mesh || !outline) return

    const store = useGameStore.getState()
    vectorFromTuple(store.vacuum.mouth, mouth)
    const suctionScale = Math.max(0.22, store.vacuum.pulse)
    let gulpedThisFrame = 0
    let affected = 0
    const samples: InwardInvariantSample[] = []

    for (let i = 0; i < pieces.length; i += 1) {
      const piece = pieces[i]
      const result = stepSlimePiece(piece, {
        time: clock.elapsedTime,
        dt,
        mouth,
        suctionScale,
        respawnSites: RESPAWN_SITES,
      })
      if (result.gulped) gulpedThisFrame += 1
      if (piece.suctionInfluence > 0.05) affected += 1
      const sample = checkInwardInvariant(piece, mouth)
      if (sample) samples.push(sample)

      composeSlimeMatrix(piece, mouth, matrix)
      composeSlimeMatrix(piece, mouth, outlineMatrix, SLURPER_PARAMS.outlines.slimeSmallWorld)
      mesh.setMatrixAt(i, matrix)
      outline.setMatrixAt(i, outlineMatrix)
      states[i] = slimeStateToAttribute(piece.state)
      stretch[i] = piece.stretch
      residue[i] = piece.residueLife
    }

    mesh.instanceMatrix.needsUpdate = true
    outline.instanceMatrix.needsUpdate = true
    const geometry = mesh.geometry as THREE.InstancedBufferGeometry
    ;(geometry.getAttribute('aState') as THREE.InstancedBufferAttribute).needsUpdate = true
    ;(geometry.getAttribute('aStretch') as THREE.InstancedBufferAttribute).needsUpdate = true
    ;(geometry.getAttribute('aResidueLife') as THREE.InstancedBufferAttribute).needsUpdate = true

    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uMouthPosition.value.copy(mouth)
    material.uniforms.uSuction.value = suctionScale

    if (gulpedThisFrame > 0) {
      const intensity = Math.min(1.7, 0.42 + Math.sqrt(gulpedThisFrame) * 0.34)
      store.registerGulp(tupleFromVector(mouth), gulpedThisFrame, intensity, gulpedThisFrame % 4)
      triggerHaptic(intensity, store.pointer.isDown)
      playSoundHook(gulpedThisFrame > 8 ? 'gulpCluster' : gulpedThisFrame > 3 ? 'gulpMedium' : 'gulpSmall', store.muted)
    }

    invariantWindow.current.push(...samples)
    if (invariantWindow.current.length > 1600) invariantWindow.current.splice(0, invariantWindow.current.length - 1600)
    frameCount.current += 1
    if (frameCount.current % 10 === 0) {
      const summary = summarizeInvariant(invariantWindow.current)
      store.setStats({
        activeSlime: pieces.length,
        affectedSlime: affected,
        inwardPassRate: summary.passRate,
        inwardSamples: summary.samples,
        inwardPassed: summary.passed,
        inwardFailed: summary.failed,
        inwardAverageDistanceDelta: summary.averageDistanceDelta,
        frameMs: dt * 1000,
        fps: 1 / Math.max(dt, 0.0001),
      })
    }
  })

  return (
    <group>
      <instancedMesh ref={outlineRef} args={[undefined, undefined, count]} frustumCulled={false} material={getOutlineMaterial()}>
        <icosahedronGeometry args={[1, 1]} />
      </instancedMesh>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]}>
          <instancedBufferAttribute attach="attributes-aPhase" args={[phase, 1]} />
          <instancedBufferAttribute attach="attributes-aVitality" args={[vitality, 1]} />
          <instancedBufferAttribute attach="attributes-aState" args={[states, 1]} />
          <instancedBufferAttribute attach="attributes-aStretch" args={[stretch, 1]} />
          <instancedBufferAttribute attach="attributes-aResidueLife" args={[residue, 1]} />
          <instancedBufferAttribute attach="attributes-aPalette" args={[palette, 1]} />
        </icosahedronGeometry>
        <primitive object={material} attach="material" />
      </instancedMesh>
    </group>
  )
}
