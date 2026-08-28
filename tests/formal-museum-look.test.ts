import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  FORMAL_LOOK_PITCH_MAX,
  FORMAL_LOOK_PITCH_MIN,
  FORMAL_MOUSE_CURSOR_YAW_SPEED,
  FORMAL_MOUSE_LOOK_SENSITIVITY,
  resolveFormalCursorSteer,
  stepFormalLookOrientation,
} from '../src/museum/formal-room/museumLookMath'

const cameraRigSource = readFileSync(
  new URL('../src/museum/formal-room/FormalRoomCameraRig.tsx', import.meta.url),
  'utf8',
)

describe('formal museum pointer look', () => {
  it('turns toward ordinary mouse movement without requiring a button state', () => {
    const next = stepFormalLookOrientation({
      yaw: 0,
      pitch: 0,
      deltaX: 24,
      deltaY: -18,
      sensitivity: FORMAL_MOUSE_LOOK_SENSITIVITY,
    })

    expect(next.yaw).toBeLessThan(0)
    expect(next.pitch).toBeGreaterThan(0)
  })

  it('keeps vertical look inside the comfortable museum range', () => {
    const lookingDown = stepFormalLookOrientation({
      yaw: 0,
      pitch: 0,
      deltaX: 0,
      deltaY: 10_000,
      sensitivity: FORMAL_MOUSE_LOOK_SENSITIVITY,
    })
    const lookingUp = stepFormalLookOrientation({
      yaw: 0,
      pitch: 0,
      deltaX: 0,
      deltaY: -10_000,
      sensitivity: FORMAL_MOUSE_LOOK_SENSITIVITY,
    })

    expect(lookingDown.pitch).toBeGreaterThanOrEqual(FORMAL_LOOK_PITCH_MIN)
    expect(lookingUp.pitch).toBeLessThanOrEqual(FORMAL_LOOK_PITCH_MAX)
  })

  it('ignores non-finite pointer deltas instead of jolting the camera', () => {
    expect(stepFormalLookOrientation({
      yaw: 0.7,
      pitch: -0.1,
      deltaX: Number.NaN,
      deltaY: Number.POSITIVE_INFINITY,
      sensitivity: FORMAL_MOUSE_LOOK_SENSITIVITY,
    })).toEqual({ yaw: expect.closeTo(0.7, 8), pitch: -0.1 })
  })

  it('turns the same amount when a busy browser batches an identical mouse sweep', () => {
    const totalDeltaX = 960
    const batched = stepFormalLookOrientation({
      yaw: 0,
      pitch: 0,
      deltaX: totalDeltaX,
      deltaY: 0,
      sensitivity: FORMAL_MOUSE_LOOK_SENSITIVITY,
    })

    let sampled = { yaw: 0, pitch: 0 }
    for (let sample = 0; sample < 10; sample += 1) {
      sampled = stepFormalLookOrientation({
        ...sampled,
        deltaX: totalDeltaX / 10,
        deltaY: 0,
        sensitivity: FORMAL_MOUSE_LOOK_SENSITIVITY,
      })
    }

    expect(batched.yaw).toBeCloseTo(sampled.yaw, 8)
    expect(batched.pitch).toBeCloseTo(sampled.pitch, 8)
  })

  it('produces centered, symmetric, bounded cursor steering', () => {
    const viewportSize = 1_000
    const leftEdge = resolveFormalCursorSteer(0, viewportSize)
    const center = resolveFormalCursorSteer(viewportSize / 2, viewportSize)
    const rightEdge = resolveFormalCursorSteer(viewportSize, viewportSize)

    expect(center).toBe(0)
    expect(leftEdge).toBeLessThan(0)
    expect(rightEdge).toBeGreaterThan(0)
    expect(Math.abs(leftEdge)).toBeCloseTo(Math.abs(rightEdge), 8)
    expect(Math.abs(leftEdge)).toBeLessThanOrEqual(1)
    expect(Math.abs(rightEdge)).toBeLessThanOrEqual(1)
  })

  it('keeps supplying turn intent while the pointer remains left or right', () => {
    const edgeTurn = resolveFormalCursorSteer(1_000, 1_000)
    let unwrappedYaw = 0

    for (let frame = 0; frame < 180; frame += 1) {
      unwrappedYaw -= edgeTurn * FORMAL_MOUSE_CURSOR_YAW_SPEED / 60
    }

    expect(Math.abs(unwrappedYaw)).toBeGreaterThan(Math.PI * 2)
  })

  it('turns well before the pointer reaches the edge', () => {
    expect(resolveFormalCursorSteer(250, 1_000)).toBeLessThan(-0.3)
    expect(resolveFormalCursorSteer(750, 1_000)).toBeGreaterThan(0.3)
  })

  it('fails safely for invalid cursor measurements', () => {
    expect(resolveFormalCursorSteer(Number.NaN, 1_000)).toBe(0)
    expect(resolveFormalCursorSteer(500, Number.POSITIVE_INFINITY)).toBe(0)
    expect(resolveFormalCursorSteer(500, 0)).toBe(0)
  })

  it('clears stale mouse edge-turn intent when touch look starts and ends', () => {
    const touchFinishLifecycle = cameraRigSource.slice(
      cameraRigSource.indexOf('const finishTouchLook'),
      cameraRigSource.indexOf('const handlePointerDown'),
    )
    const touchStartLifecycle = cameraRigSource.slice(
      cameraRigSource.indexOf('const handlePointerDown'),
      cameraRigSource.indexOf('const handleMouseMove'),
    )

    expect(touchStartLifecycle).toContain('clearCursorSteer()')
    expect(touchFinishLifecycle).toContain('clearCursorSteer()')
  })

  it('keeps touch compatibility events from arming continuous desktop steering', () => {
    const mouseMoveLifecycle = cameraRigSource.slice(
      cameraRigSource.indexOf('const handleMouseMove'),
      cameraRigSource.indexOf('const handleTouchPointerMove'),
    )
    const frameSteering = cameraRigSource.slice(
      cameraRigSource.indexOf('const turnAxis'),
      cameraRigSource.indexOf('if (input.jumpRequested)'),
    )

    expect(cameraRigSource).toContain("window.matchMedia('(hover: hover) and (pointer: fine)').matches")
    expect(mouseMoveLifecycle).toContain('!cursorSteeringEnabled')
    expect(mouseMoveLifecycle).toContain('performance.now() < suppressMouseSteerUntil')
    expect(frameSteering).toContain('mouseCursorSteer.active ? mouseCursorSteer.x : 0')
  })

  it('uses cached canvas bounds instead of forcing layout on every mouse sample', () => {
    const boundsLifecycle = cameraRigSource.slice(
      cameraRigSource.indexOf('let canvasBounds'),
      cameraRigSource.indexOf('const clearCursorSteer'),
    )
    const mouseMoveLifecycle = cameraRigSource.slice(
      cameraRigSource.indexOf('const handleMouseMove'),
      cameraRigSource.indexOf('const handleTouchPointerMove'),
    )

    expect(boundsLifecycle).toContain('canvas.getBoundingClientRect()')
    expect(mouseMoveLifecycle).toContain('const bounds = canvasBounds')
    expect(mouseMoveLifecycle).not.toContain('getBoundingClientRect()')
    expect(cameraRigSource).toContain('new ResizeObserver(refreshCanvasBounds)')
    expect(cameraRigSource).toContain("canvas.addEventListener('mouseenter', refreshCanvasBounds)")
  })

  it('keeps document-level clearing for overlays while steering only canvas-targeted moves', () => {
    const mouseMoveLifecycle = cameraRigSource.slice(
      cameraRigSource.indexOf('const handleMouseMove'),
      cameraRigSource.indexOf('const handleTouchPointerMove'),
    )
    const eventSetupStart = cameraRigSource.indexOf("canvas.style.cursor = cursorSteeringEnabled")
    const eventSetup = cameraRigSource.slice(
      eventSetupStart,
      cameraRigSource.indexOf('return () =>', eventSetupStart),
    )

    expect(mouseMoveLifecycle).toContain('if (event.target !== canvas)')
    expect(mouseMoveLifecycle).not.toContain('.closest(')
    expect(eventSetup).toContain('if (cursorSteeringEnabled)')
    expect(eventSetup).toContain("document.addEventListener('mousemove', handleMouseMove)")
  })
})
