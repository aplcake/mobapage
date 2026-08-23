'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { type MutableRefObject, useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { FormalRoomArtwork } from './artworks'
import { isFormalRoomCompactViewport, selectFormalRoomExploreFov } from './cameraViewport'
import {
  beginFormalJump,
  createFormalJumpState,
  resetFormalJumpState,
  stepFormalJumpState,
} from './jumpMath'
import {
  museumAreaAtPosition,
  museumGalleryAtPosition,
  type MuseumAreaId,
  type MuseumGalleryId,
  type MuseumTravelPose,
} from './museumPlan'
import {
  capFormalWalkDelta,
  FORMAL_WALK_COLLIDERS,
  FORMAL_WALK_START,
  getFormalWalkVector,
  resolveFormalWalkPosition,
  type FormalWalkCollider,
} from './walkMath'

export type FormalRoomViewMode = 'curated' | 'explore'

type MuseumCapturePose = {
  x: number
  z: number
  yaw: number
  pitch?: number
}

type MuseumCaptureWindow = Window & {
  __setMuseumCapturePose?: (pose: MuseumCapturePose) => void
  __museumCaptureReady?: boolean
}

function formalRoomReviewPose(): MuseumTravelPose | null {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null
  const review = new URLSearchParams(window.location.search).get('review')
  if (review === 'courtyard-door') return { x: -9.2, z: 6.5, yaw: 0 }
  if (review === 'burn-room-door') return { x: 9.2, z: 6.5, yaw: 0 }
  if (review === 'atrium-hang') return { x: 0, z: 19.55, yaw: Math.PI / 2 }
  if (review === 'artwork-placard') return { x: -14.8, z: 8.25, yaw: Math.PI / 2 }
  return null
}
export type FormalRoomFocusIndex = number | null

export type FormalWalkInputState = {
  forward: boolean
  backward: boolean
  strafeLeft: boolean
  strafeRight: boolean
  turnLeft: boolean
  turnRight: boolean
  sprint: boolean
  jumpRequested: boolean
  analogX: number
  analogY: number
  resetRequested: boolean
  travelRequested: MuseumTravelPose | null
  draggingLook: boolean
  suppressArtworkClickUntil: number
}

export function createFormalWalkInputState(): FormalWalkInputState {
  return {
    forward: false,
    backward: false,
    strafeLeft: false,
    strafeRight: false,
    turnLeft: false,
    turnRight: false,
    sprint: false,
    jumpRequested: false,
    analogX: 0,
    analogY: 0,
    resetRequested: false,
    travelRequested: null,
    draggingLook: false,
    suppressArtworkClickUntil: 0,
  }
}

export function clearFormalWalkInputState(input: FormalWalkInputState) {
  input.forward = false
  input.backward = false
  input.strafeLeft = false
  input.strafeRight = false
  input.turnLeft = false
  input.turnRight = false
  input.sprint = false
  input.jumpRequested = false
  input.analogX = 0
  input.analogY = 0
  input.travelRequested = null
  input.draggingLook = false
}

const WALK_EYE_HEIGHT = -0.1
const WALK_SPEED = 2.55
const WALK_QUICK_SPEED = 3.45
const WALK_TURN_SPEED = 1.52
const WALK_PITCH_MIN = -0.58
const WALK_PITCH_MAX = 0.58

function damp(current: number, target: number, strength: number, delta: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-strength * delta))
}

export function FormalRoomCameraRig({
  artworks,
  focusIndex,
  mode,
  inputRef,
  reducedMotion,
  extraColliders = [],
  onGalleryChange,
  onMuseumAreaChange,
}: {
  artworks: readonly FormalRoomArtwork[]
  focusIndex: FormalRoomFocusIndex
  mode: FormalRoomViewMode
  inputRef: MutableRefObject<FormalWalkInputState>
  reducedMotion: boolean
  extraColliders?: readonly FormalWalkCollider[]
  onGalleryChange?: (galleryId: MuseumGalleryId) => void
  onMuseumAreaChange?: (areaId: MuseumAreaId) => void
}) {
  const { camera, gl, pointer, size } = useThree()
  const initializedRef = useRef(false)
  const hasExplorePoseRef = useRef(false)
  const exploreBlendRef = useRef(1)
  const walkYawRef = useRef(0)
  const walkPitchRef = useRef(-0.04)
  const walkBobRef = useRef(0)
  const jumpStateRef = useRef(createFormalJumpState())
  const walkPositionRef = useRef(new THREE.Vector3(FORMAL_WALK_START.x, WALK_EYE_HEIGHT, FORMAL_WALK_START.z))
  const walkVelocityRef = useRef(new THREE.Vector3())
  const galleryRef = useRef<MuseumGalleryId>('lobby')
  const areaRef = useRef<MuseumAreaId>('lobby')
  const lookAtRef = useRef(new THREE.Vector3(0, 0.28, -1.9))
  const targetPosition = useMemo(() => new THREE.Vector3(), [])
  const targetLookAt = useMemo(() => new THREE.Vector3(), [])
  const targetEuler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), [])
  const targetQuaternion = useMemo(() => new THREE.Quaternion(), [])
  const activeColliders = useMemo(
    () => extraColliders.length ? [...FORMAL_WALK_COLLIDERS, ...extraColliders] : FORMAL_WALK_COLLIDERS,
    [extraColliders],
  )
  const compactViewport = isFormalRoomCompactViewport(size.width)
  const exploreFov = selectFormalRoomExploreFov(size.width, size.height)
  const captureEnabled = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('capture') === '1'

  const setCapturePose = useCallback(({ x, z, yaw, pitch = -0.04 }: MuseumCapturePose) => {
    clearFormalWalkInputState(inputRef.current)
    walkPositionRef.current.set(x, WALK_EYE_HEIGHT, z)
    walkVelocityRef.current.set(0, 0, 0)
    resetFormalJumpState(jumpStateRef.current)
    walkYawRef.current = yaw
    walkPitchRef.current = THREE.MathUtils.clamp(pitch, WALK_PITCH_MIN, WALK_PITCH_MAX)
    walkBobRef.current = 0
    exploreBlendRef.current = 1
    camera.position.set(x, WALK_EYE_HEIGHT, z)
    targetEuler.set(walkPitchRef.current, yaw, 0, 'YXZ')
    camera.quaternion.setFromEuler(targetEuler)
  }, [camera, inputRef, targetEuler])

  useEffect(() => {
    clearFormalWalkInputState(inputRef.current)
    if (mode === 'explore') {
      if (!hasExplorePoseRef.current) {
        const reviewPose = formalRoomReviewPose()
        walkPositionRef.current.set(
          reviewPose?.x ?? FORMAL_WALK_START.x,
          WALK_EYE_HEIGHT,
          reviewPose?.z ?? FORMAL_WALK_START.z,
        )
        walkYawRef.current = reviewPose?.yaw ?? Math.PI
        walkPitchRef.current = -0.04
        walkVelocityRef.current.set(0, 0, 0)
        resetFormalJumpState(jumpStateRef.current)
        hasExplorePoseRef.current = true
      }
      exploreBlendRef.current = reducedMotion ? 1 : 0
    } else {
      resetFormalJumpState(jumpStateRef.current)
    }
  }, [inputRef, mode, reducedMotion])

  useEffect(() => {
    if (mode !== 'explore' || !captureEnabled || typeof window === 'undefined') return
    const captureWindow = window as MuseumCaptureWindow
    captureWindow.__setMuseumCapturePose = setCapturePose
    captureWindow.__museumCaptureReady = true
    return () => {
      if (captureWindow.__setMuseumCapturePose === setCapturePose) {
        delete captureWindow.__setMuseumCapturePose
        delete captureWindow.__museumCaptureReady
      }
    }
  }, [captureEnabled, mode, setCapturePose])

  useEffect(() => {
    if (mode !== 'explore') {
      gl.domElement.style.cursor = 'default'
      return
    }

    const canvas = gl.domElement
    const input = inputRef.current
    let pointerId: number | null = null
    let lastX = 0
    let lastY = 0
    let totalMovement = 0

    const finishDrag = (event?: PointerEvent) => {
      if (event && pointerId !== null && event.pointerId !== pointerId) return
      if (totalMovement > 7) {
        input.suppressArtworkClickUntil = performance.now() + 180
      }
      input.draggingLook = false
      pointerId = null
      totalMovement = 0
      canvas.style.cursor = 'grab'
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      pointerId = event.pointerId
      lastX = event.clientX
      lastY = event.clientY
      totalMovement = 0
      input.draggingLook = true
      canvas.style.cursor = 'grabbing'
      canvas.setPointerCapture?.(event.pointerId)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return
      const deltaX = event.clientX - lastX
      const deltaY = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY
      totalMovement += Math.hypot(deltaX, deltaY)
      walkYawRef.current -= deltaX * 0.0032
      walkPitchRef.current = THREE.MathUtils.clamp(
        walkPitchRef.current - deltaY * 0.0026,
        WALK_PITCH_MIN,
        WALK_PITCH_MAX,
      )
      event.preventDefault()
    }

    canvas.style.cursor = 'grab'
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove, { passive: false })
    canvas.addEventListener('pointerup', finishDrag)
    canvas.addEventListener('pointercancel', finishDrag)
    canvas.addEventListener('lostpointercapture', finishDrag)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', finishDrag)
      canvas.removeEventListener('pointercancel', finishDrag)
      canvas.removeEventListener('lostpointercapture', finishDrag)
      canvas.style.cursor = 'default'
      input.draggingLook = false
    }
  }, [gl, inputRef, mode])

  useFrame(({ clock }, rawDelta) => {
    if (mode === 'explore' && captureEnabled && typeof window !== 'undefined') {
      const captureWindow = window as MuseumCaptureWindow
      captureWindow.__setMuseumCapturePose = setCapturePose
      captureWindow.__museumCaptureReady = true
    }
    const delta = capFormalWalkDelta(rawDelta)
    const perspective = camera as THREE.PerspectiveCamera

    if (mode === 'explore') {
      const input = inputRef.current
      if (input.travelRequested) {
        const destination = input.travelRequested
        input.travelRequested = null
        walkPositionRef.current.set(destination.x, WALK_EYE_HEIGHT, destination.z)
        walkVelocityRef.current.set(0, 0, 0)
        resetFormalJumpState(jumpStateRef.current)
        walkYawRef.current = destination.yaw
        walkPitchRef.current = -0.04
        exploreBlendRef.current = reducedMotion ? 1 : 0
      }
      if (input.resetRequested) {
        input.resetRequested = false
        clearFormalWalkInputState(input)
        walkPositionRef.current.set(FORMAL_WALK_START.x, WALK_EYE_HEIGHT, FORMAL_WALK_START.z)
        walkVelocityRef.current.set(0, 0, 0)
        resetFormalJumpState(jumpStateRef.current)
        walkYawRef.current = Math.PI
        walkPitchRef.current = -0.04
        exploreBlendRef.current = reducedMotion ? 1 : 0
      }

      const turnAxis = Number(input.turnLeft) - Number(input.turnRight)
      walkYawRef.current += turnAxis * WALK_TURN_SPEED * delta

      if (input.jumpRequested) {
        input.jumpRequested = false
        beginFormalJump(jumpStateRef.current, reducedMotion)
      }
      stepFormalJumpState(jumpStateRef.current, delta)

      const forwardAxis = Number(input.forward) - Number(input.backward) + input.analogY
      const strafeAxis = Number(input.strafeRight) - Number(input.strafeLeft) + input.analogX
      const walkVector = getFormalWalkVector(forwardAxis, strafeAxis, walkYawRef.current)
      const targetSpeed = input.sprint ? WALK_QUICK_SPEED : WALK_SPEED
      const desiredX = walkVector.x * targetSpeed
      const desiredZ = walkVector.z * targetSpeed
      const velocityStrength = walkVector.magnitude > 0 ? 11 : 9
      const velocity = walkVelocityRef.current
      velocity.x = damp(velocity.x, desiredX, velocityStrength, delta)
      velocity.z = damp(velocity.z, desiredZ, velocityStrength, delta)

      const walkPosition = walkPositionRef.current
      const resolved = resolveFormalWalkPosition(
        { x: walkPosition.x, z: walkPosition.z },
        { x: walkPosition.x + velocity.x * delta, z: walkPosition.z + velocity.z * delta },
        undefined,
        activeColliders,
      )
      if (Math.abs(resolved.x - (walkPosition.x + velocity.x * delta)) > 0.001) velocity.x = 0
      if (Math.abs(resolved.z - (walkPosition.z + velocity.z * delta)) > 0.001) velocity.z = 0
      walkPosition.x = resolved.x
      walkPosition.z = resolved.z

      const galleryId = museumGalleryAtPosition({ x: walkPosition.x, z: walkPosition.z })
      if (galleryRef.current !== galleryId) {
        galleryRef.current = galleryId
        onGalleryChange?.(galleryId)
      }
      const areaId = museumAreaAtPosition({ x: walkPosition.x, z: walkPosition.z })
      if (areaRef.current !== areaId) {
        areaRef.current = areaId
        onMuseumAreaChange?.(areaId)
      }

      const movementAmount = Math.min(1, Math.hypot(velocity.x, velocity.z) / WALK_SPEED)
      const bobTarget = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 7.2) * 0.012 * movementAmount
      walkBobRef.current = damp(walkBobRef.current, bobTarget, 13, delta)
      targetPosition.set(
        walkPosition.x,
        WALK_EYE_HEIGHT + walkBobRef.current + jumpStateRef.current.height,
        walkPosition.z,
      )

      exploreBlendRef.current = reducedMotion ? 1 : damp(exploreBlendRef.current, 1, 5.8, delta)
      const positionStrength = exploreBlendRef.current < 0.92 ? 6.5 : 24
      camera.position.lerp(targetPosition, 1 - Math.exp(-positionStrength * delta))

      targetEuler.set(walkPitchRef.current, walkYawRef.current, 0, 'YXZ')
      targetQuaternion.setFromEuler(targetEuler)
      camera.quaternion.slerp(targetQuaternion, 1 - Math.exp(-(reducedMotion ? 30 : 20) * delta))

      if (perspective.isPerspectiveCamera) {
        perspective.fov = damp(perspective.fov, exploreFov, reducedMotion ? 30 : 8, delta)
        perspective.updateProjectionMatrix()
      }
      return
    }

    const focusedArtwork = focusIndex === null ? null : artworks[focusIndex]

    if (focusedArtwork) {
      const x = focusedArtwork.position[0]
      targetPosition.set(
        compactViewport ? x * 0.94 : x * 0.52,
        compactViewport ? 0.62 : 0.78,
        compactViewport ? 6.9 : 5.9,
      )
      targetLookAt.set(x, focusedArtwork.position[1] - 0.03, -1.72)
    } else {
      targetPosition.set(0, compactViewport ? 0.78 : 0.66, 8.55)
      targetLookAt.set(0, 0.25, -1.72)
    }

    if (!reducedMotion && !focusedArtwork) {
      targetPosition.x += pointer.x * (compactViewport ? 0.05 : 0.18)
      targetPosition.y += pointer.y * (compactViewport ? 0.025 : 0.08)
    }

    if (!initializedRef.current) {
      initializedRef.current = true
      camera.position.set(targetPosition.x, targetPosition.y + 0.34, targetPosition.z + (reducedMotion ? 0 : 1))
      lookAtRef.current.copy(targetLookAt)
    }

    const cameraStrength = reducedMotion ? 24 : focusedArtwork ? 5.4 : 3.4
    camera.position.lerp(targetPosition, 1 - Math.exp(-cameraStrength * delta))
    lookAtRef.current.lerp(targetLookAt, 1 - Math.exp(-(reducedMotion ? 24 : 6.5) * delta))
    camera.lookAt(lookAtRef.current)

    if (perspective.isPerspectiveCamera) {
      const targetFov = compactViewport ? (focusedArtwork ? 47 : 58) : focusedArtwork ? 38 : 43
      perspective.fov = damp(perspective.fov, targetFov, reducedMotion ? 24 : 6, delta)
      perspective.updateProjectionMatrix()
    }
  })

  return null
}
