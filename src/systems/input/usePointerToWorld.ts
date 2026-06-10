'use client'

import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GAME_CONFIG } from '../../core/config'
import { clampArena, tupleFromVector } from '../../core/math'
import { useGameStore, type PointerSnapshot } from '../../stores/useGameStore'

const raycaster = new THREE.Raycaster()
const ndc = new THREE.Vector2()
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

export function usePointerToWorld() {
  const { camera, gl } = useThree()
  const previous = useMemo(() => new THREE.Vector3(), [])
  const current = useMemo(() => new THREE.Vector3(), [])
  const velocity = useMemo(() => new THREE.Vector3(), [])
  const lastTime = useMemo(() => ({ value: performance.now() }), [])
  const isDown = useMemo(() => ({ value: false }), [])

  useEffect(() => {
    const element = gl.domElement

    function updatePointer(event: PointerEvent, active: boolean) {
      const rect = element.getBoundingClientRect()
      ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
      raycaster.setFromCamera(ndc, camera)
      raycaster.ray.intersectPlane(floorPlane, current)
      clampArena(current, GAME_CONFIG.arena.halfWidth - 0.8, GAME_CONFIG.arena.halfDepth - 0.8)

      const now = performance.now()
      const dt = Math.max((now - lastTime.value) / 1000, 0.001)
      velocity.copy(current).sub(previous).multiplyScalar(1 / dt)
      const snapshot: PointerSnapshot = {
        isActive: active,
        isDown: isDown.value,
        world: tupleFromVector(current),
        previousWorld: tupleFromVector(previous),
        velocity: tupleFromVector(velocity),
        speed: velocity.length(),
        pressure: event.pressure || (isDown.value ? 0.85 : 0.35),
        lastMoveAt: now,
      }
      useGameStore.getState().setPointer(snapshot)
      previous.copy(current)
      lastTime.value = now
    }

    function onPointerMove(event: PointerEvent) {
      updatePointer(event, true)
    }

    function onPointerDown(event: PointerEvent) {
      isDown.value = true
      element.setPointerCapture?.(event.pointerId)
      updatePointer(event, true)
    }

    function onPointerUp(event: PointerEvent) {
      isDown.value = false
      updatePointer(event, true)
      element.releasePointerCapture?.(event.pointerId)
    }

    function onPointerLeave() {
      const state = useGameStore.getState().pointer
      useGameStore.getState().setPointer({ ...state, isActive: false, isDown: false, speed: 0, pressure: 0 })
    }

    function preventContext(event: Event) {
      event.preventDefault()
    }

    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('pointerup', onPointerUp)
    element.addEventListener('pointercancel', onPointerUp)
    element.addEventListener('pointerleave', onPointerLeave)
    element.addEventListener('contextmenu', preventContext)

    return () => {
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointerup', onPointerUp)
      element.removeEventListener('pointercancel', onPointerUp)
      element.removeEventListener('pointerleave', onPointerLeave)
      element.removeEventListener('contextmenu', preventContext)
    }
  }, [camera, current, gl.domElement, isDown, lastTime, previous, velocity])
}
