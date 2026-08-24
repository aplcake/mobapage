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
  FORMAL_LOOK_PITCH_MAX,
  FORMAL_LOOK_PITCH_MIN,
  FORMAL_MOUSE_CURSOR_YAW_SPEED,
  FORMAL_TOUCH_LOOK_SENSITIVITY,
  resolveFormalCursorSteer,
  stepFormalLookOrientation,
} from './museumLookMath'
import {
  capFormalWalkDelta,
  FORMAL_WALK_COLLIDERS,
  FORMAL_WALK_START,
  getFormalWalkVector,
  resolveFormalWalkPosition,
  stepFormalWalkVelocity,
  type FormalWalkCollider,
} from './walkMath'
import { MONKEYDHASHY_CREATEBOX_SPEC } from './monkeydhashyCreatebox'

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
  if (review === 'plants-lobby') return { x: 0, z: 1.4, yaw: Math.PI }
  if (review === 'plants-atrium') return { x: 0, z: 14.1, yaw: Math.PI }
  if (review === 'artwork-placard') return { x: -14.8, z: 8.25, yaw: Math.PI / 2 }
  if (review === 'moba-one-curation') return { x: -12.2, z: 9.2, yaw: Math.PI }
  if (review === 'plants-moba-one-palm') return { x: -10, z: 10.37, yaw: -Math.PI / 2 }
  if (review === 'plants-moba-one-fern') return { x: -10, z: 14.83, yaw: -Math.PI / 2 }
  if (review === 'moba-one-left-wall') return { x: -12.2, z: 13.4, yaw: Math.PI / 2 }
  if (review === 'moba-one-right-wall') return { x: -12.2, z: 13.4, yaw: -Math.PI / 2 }
  if (review === 'moba-two-curation') return { x: -12.2, z: 22.35, yaw: Math.PI }
  if (review === 'plants-moba-two-hoya') return { x: -10, z: 23.27, yaw: -Math.PI / 2 }
  if (review === 'plants-moba-two-caladium') return { x: -10.5, z: 27.55, yaw: -Math.PI / 2 }
  if (review === 'moba-two-createbox') return MONKEYDHASHY_CREATEBOX_SPEC.reviewPose
  if (review === 'moba-two-left-wall') return { x: -12.2, z: 26.5, yaw: Math.PI / 2 }
  if (review === 'moba-two-right-wall') return { x: -12.2, z: 26.5, yaw: -Math.PI / 2 }
  if (review === 'plants-photography') return { x: 12.35, z: 25.4, yaw: -Math.PI / 2 }
  if (review === 'plants-holiday-pine') return { x: 10.7, z: 11.05, yaw: Math.PI / 2 }
  if (review === 'plants-holiday-poinsettia') return { x: 10.7, z: 16.01, yaw: Math.PI / 2 }
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
  input.resetRequested = false
  input.travelRequested = null
  input.draggingLook = false
}

const WALK_EYE_HEIGHT = -0.1
const WALK_SPEED = 3.05
const WALK_QUICK_SPEED = 4.55
const WALK_TURN_SPEED = 2.05
const MOUSE_CURSOR_PITCH_RESPONSE = 10

function damp(current: number, target: number, strength: number, delta: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-strength * delta))
}

export function FormalRoomCameraRig({
  artworks,
  focusIndex,
  mode,
  inputRef,
  reducedMotion,
  controlsEnabled = true,
  extraColliders = [],
  onGalleryChange,
  onMuseumAreaChange,
  onTouchLook,
}: {
  artworks: readonly FormalRoomArtwork[]
  focusIndex: FormalRoomFocusIndex
  mode: FormalRoomViewMode
  inputRef: MutableRefObject<FormalWalkInputState>
  reducedMotion: boolean
  controlsEnabled?: boolean
  extraColliders?: readonly FormalWalkCollider[]
  onGalleryChange?: (galleryId: MuseumGalleryId) => void
  onMuseumAreaChange?: (areaId: MuseumAreaId) => void
  onTouchLook?: () => void
}) {
  const { camera, gl, pointer, size } = useThree()
  const initializedRef = useRef(false)
  const hasExplorePoseRef = useRef(false)
  const walkYawRef = useRef(0)
  const walkPitchRef = useRef(-0.04)
  const walkBobRef = useRef(0)
  const mouseCursorSteerRef = useRef({ x: 0, y: 0, active: false })
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
    walkPitchRef.current = THREE.MathUtils.clamp(pitch, FORMAL_LOOK_PITCH_MIN, FORMAL_LOOK_PITCH_MAX)
    walkBobRef.current = 0
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
    } else {
      resetFormalJumpState(jumpStateRef.current)
    }
  }, [inputRef, mode])

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
    if (mode !== 'explore' || captureEnabled || !controlsEnabled) {
      mouseCursorSteerRef.current.x = 0
      mouseCursorSteerRef.current.y = 0
      mouseCursorSteerRef.current.active = false
      gl.domElement.style.cursor = 'default'
      return
    }

    const canvas = gl.domElement
    const input = inputRef.current
    let touchPointerId: number | null = null
    let lastX = 0
    let lastY = 0
    let totalMovement = 0

    const clearCursorSteer = () => {
      mouseCursorSteerRef.current.x = 0
      mouseCursorSteerRef.current.y = 0
      mouseCursorSteerRef.current.active = false
    }

    const applyLookDelta = (
      deltaX: number,
      deltaY: number,
      sensitivity: Readonly<{ yaw: number; pitch: number }>,
    ) => {
      const nextLook = stepFormalLookOrientation({
        yaw: walkYawRef.current,
        pitch: walkPitchRef.current,
        deltaX,
        deltaY,
        sensitivity,
      })
      walkYawRef.current = nextLook.yaw
      walkPitchRef.current = nextLook.pitch
    }

    const finishTouchLook = (event?: PointerEvent) => {
      if (event?.pointerType === 'mouse') return
      if (event && touchPointerId !== null && event.pointerId !== touchPointerId) return
      if (totalMovement > 7) {
        input.suppressArtworkClickUntil = performance.now() + 180
      }
      input.draggingLook = false
      touchPointerId = null
      totalMovement = 0
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return
      if (touchPointerId !== null) return
      touchPointerId = event.pointerId
      lastX = event.clientX
      lastY = event.clientY
      totalMovement = 0
      input.draggingLook = true
      canvas.setPointerCapture?.(event.pointerId)
    }

    const handleMouseMove = (event: MouseEvent) => {
      const interactiveTarget = event.target instanceof Element
        && Boolean(event.target.closest('button, a, input, textarea, select, [role="dialog"]'))
      if (interactiveTarget) {
        clearCursorSteer()
        return
      }
      const bounds = canvas.getBoundingClientRect()
      const insideCanvas = event.clientX >= bounds.left
        && event.clientX <= bounds.right
        && event.clientY >= bounds.top
        && event.clientY <= bounds.bottom
      if (!insideCanvas) {
        clearCursorSteer()
        return
      }
      mouseCursorSteerRef.current.x = resolveFormalCursorSteer(event.clientX - bounds.left, bounds.width)
      mouseCursorSteerRef.current.y = resolveFormalCursorSteer(event.clientY - bounds.top, bounds.height, 0.14)
      mouseCursorSteerRef.current.active = true
    }

    const handleTouchPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return
      if (touchPointerId !== event.pointerId) return
      const deltaX = event.clientX - lastX
      const deltaY = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY
      const previousMovement = totalMovement
      totalMovement += Math.hypot(deltaX, deltaY)
      applyLookDelta(deltaX, deltaY, FORMAL_TOUCH_LOOK_SENSITIVITY)
      if (previousMovement <= 10 && totalMovement > 10) onTouchLook?.()
      event.preventDefault()
    }

    const handlePointerLeave = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') clearCursorSteer()
    }

    const suspendMouseLook = () => clearCursorSteer()

    canvas.style.cursor = 'crosshair'
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointerleave', handlePointerLeave)
    canvas.addEventListener('lostpointercapture', finishTouchLook)
    document.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('pointermove', handleTouchPointerMove, { passive: false })
    window.addEventListener('pointerup', finishTouchLook)
    window.addEventListener('pointercancel', finishTouchLook)
    window.addEventListener('blur', suspendMouseLook)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointerleave', handlePointerLeave)
      canvas.removeEventListener('lostpointercapture', finishTouchLook)
      document.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('pointermove', handleTouchPointerMove)
      window.removeEventListener('pointerup', finishTouchLook)
      window.removeEventListener('pointercancel', finishTouchLook)
      window.removeEventListener('blur', suspendMouseLook)
      clearCursorSteer()
      canvas.style.cursor = 'default'
      input.draggingLook = false
    }
  }, [captureEnabled, controlsEnabled, gl, inputRef, mode, onTouchLook])

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
      }
      if (input.resetRequested) {
        input.resetRequested = false
        clearFormalWalkInputState(input)
        walkPositionRef.current.set(FORMAL_WALK_START.x, WALK_EYE_HEIGHT, FORMAL_WALK_START.z)
        walkVelocityRef.current.set(0, 0, 0)
        resetFormalJumpState(jumpStateRef.current)
        walkYawRef.current = Math.PI
        walkPitchRef.current = -0.04
      }

      if (!controlsEnabled) {
        clearFormalWalkInputState(input)
        walkVelocityRef.current.set(0, 0, 0)
        resetFormalJumpState(jumpStateRef.current)
        walkBobRef.current = 0
        targetPosition.set(
          walkPositionRef.current.x,
          WALK_EYE_HEIGHT,
          walkPositionRef.current.z,
        )
        camera.position.copy(targetPosition)
        targetEuler.set(walkPitchRef.current, walkYawRef.current, 0, 'YXZ')
        targetQuaternion.setFromEuler(targetEuler)
        camera.quaternion.copy(targetQuaternion)
        if (perspective.isPerspectiveCamera) {
          perspective.fov = damp(perspective.fov, exploreFov, reducedMotion ? 30 : 12, delta)
          perspective.updateProjectionMatrix()
        }
        return
      }

      const turnAxis = Number(input.turnLeft) - Number(input.turnRight)
      const mouseCursorSteer = mouseCursorSteerRef.current
      walkYawRef.current += (
        turnAxis * WALK_TURN_SPEED
        - mouseCursorSteer.x * FORMAL_MOUSE_CURSOR_YAW_SPEED
      ) * delta
      if (mouseCursorSteer.active) {
        const cursorPitchTarget = THREE.MathUtils.lerp(
          FORMAL_LOOK_PITCH_MAX,
          FORMAL_LOOK_PITCH_MIN,
          (mouseCursorSteer.y + 1) / 2,
        )
        walkPitchRef.current = damp(
          walkPitchRef.current,
          cursorPitchTarget,
          MOUSE_CURSOR_PITCH_RESPONSE,
          delta,
        )
      }

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
      const velocity = walkVelocityRef.current
      const hasWalkInput = walkVector.magnitude > 0
      velocity.x = stepFormalWalkVelocity(velocity.x, desiredX, delta, hasWalkInput)
      velocity.z = stepFormalWalkVelocity(velocity.z, desiredZ, delta, hasWalkInput)

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

      camera.position.copy(targetPosition)

      targetEuler.set(walkPitchRef.current, walkYawRef.current, 0, 'YXZ')
      targetQuaternion.setFromEuler(targetEuler)
      camera.quaternion.copy(targetQuaternion)

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
