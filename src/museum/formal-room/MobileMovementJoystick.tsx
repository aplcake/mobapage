'use client'

import {
  type KeyboardEvent,
  type MutableRefObject,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import type { FormalWalkInputState } from './FormalRoomCameraRig'
import styles from './FormalMuseumRoom.module.css'
import { resolveFormalJoystickInput } from './walkMath'

const KEYBOARD_TRAVEL = 38
const JOYSTICK_KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'])

export function MobileMovementJoystick({
  inputRef,
  disabled,
}: {
  inputRef: MutableRefObject<FormalWalkInputState>
  disabled: boolean
}) {
  const clusterRef = useRef<HTMLDivElement>(null)
  const padRef = useRef<HTMLButtonElement>(null)
  const knobRef = useRef<HTMLSpanElement>(null)
  const activePointerRef = useRef<number | null>(null)
  const centerRef = useRef({ x: 0, y: 0, maxTravel: KEYBOARD_TRAVEL })
  const heldKeyboardKeysRef = useRef(new Set<string>())

  const setJoystick = useCallback((deltaX: number, deltaY: number, maxTravel: number) => {
    const next = resolveFormalJoystickInput(deltaX, deltaY, maxTravel)
    inputRef.current.analogX = next.analogX
    inputRef.current.analogY = next.analogY
    knobRef.current?.style.setProperty('--joystick-x', `${next.knobX.toFixed(2)}px`)
    knobRef.current?.style.setProperty('--joystick-y', `${next.knobY.toFixed(2)}px`)
  }, [inputRef])

  const resetJoystick = useCallback(() => {
    activePointerRef.current = null
    heldKeyboardKeysRef.current.clear()
    inputRef.current.analogX = 0
    inputRef.current.analogY = 0
    clusterRef.current?.setAttribute('data-active', 'false')
    knobRef.current?.style.setProperty('--joystick-x', '0px')
    knobRef.current?.style.setProperty('--joystick-y', '0px')
  }, [inputRef])

  useEffect(() => {
    if (disabled) resetJoystick()
  }, [disabled, resetJoystick])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) resetJoystick()
    }
    window.addEventListener('blur', resetJoystick)
    window.addEventListener('orientationchange', resetJoystick)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('blur', resetJoystick)
      window.removeEventListener('orientationchange', resetJoystick)
      document.removeEventListener('visibilitychange', handleVisibility)
      resetJoystick()
    }
  }, [resetJoystick])

  const updateFromPointer = (event: PointerEvent<HTMLButtonElement>) => {
    const center = centerRef.current
    setJoystick(event.clientX - center.x, event.clientY - center.y, center.maxTravel)
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || activePointerRef.current !== null) return
    event.preventDefault()
    event.stopPropagation()
    const bounds = event.currentTarget.getBoundingClientRect()
    centerRef.current = {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
      maxTravel: Math.max(30, Math.min(bounds.width, bounds.height) * 0.33),
    }
    heldKeyboardKeysRef.current.clear()
    activePointerRef.current = event.pointerId
    clusterRef.current?.setAttribute('data-active', 'true')
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromPointer(event)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (activePointerRef.current !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    updateFromPointer(event)
  }

  const handlePointerRelease = (event: PointerEvent<HTMLButtonElement>) => {
    if (activePointerRef.current !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    resetJoystick()
  }

  const recomputeKeyboardJoystick = () => {
    const held = heldKeyboardKeysRef.current
    const right = held.has('arrowright') || held.has('d')
    const left = held.has('arrowleft') || held.has('a')
    const down = held.has('arrowdown') || held.has('s')
    const up = held.has('arrowup') || held.has('w')
    const x = Number(right) - Number(left)
    const y = Number(down) - Number(up)

    clusterRef.current?.setAttribute('data-active', held.size ? 'true' : 'false')
    setJoystick(x * KEYBOARD_TRAVEL, y * KEYBOARD_TRAVEL, KEYBOARD_TRAVEL)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const key = event.key.toLowerCase()
    if (!JOYSTICK_KEYS.has(key) || activePointerRef.current !== null) return
    event.preventDefault()
    event.stopPropagation()
    heldKeyboardKeysRef.current.add(key)
    recomputeKeyboardJoystick()
  }

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    const key = event.key.toLowerCase()
    if (!JOYSTICK_KEYS.has(key)) return
    event.preventDefault()
    event.stopPropagation()
    heldKeyboardKeysRef.current.delete(key)
    recomputeKeyboardJoystick()
  }

  return (
    <div ref={clusterRef} className={styles.mobileJoystickCluster} data-active="false">
      <span className={styles.mobileJoystickLabel} aria-hidden="true">Move</span>
      <button
        ref={padRef}
        type="button"
        className={styles.mobileJoystickPad}
        aria-label="Movement joystick. Drag in any direction to walk."
        aria-roledescription="virtual joystick"
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight W A S D"
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerRelease}
        onPointerCancel={handlePointerRelease}
        onLostPointerCapture={handlePointerRelease}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={resetJoystick}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className={styles.mobileJoystickCompass} aria-hidden="true"><i /><i /></span>
        <span ref={knobRef} className={styles.mobileJoystickKnob} aria-hidden="true"><i /></span>
      </button>
    </div>
  )
}
