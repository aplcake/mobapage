import { useFrame, useThree } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import type { LevelData, Vec3 } from "../world/levelTypes"
import { findActiveCameraZone, getCameraZoneById } from "../game/cameraZones"

interface CameraRigProps {
  level: LevelData
  focusPoint?: Vec3
  activeCameraZoneId?: string
}

function toVector3(value: Vec3 | undefined, fallback: THREE.Vector3) {
  if (!value) return fallback.clone()
  return new THREE.Vector3(value.x, value.y, value.z)
}

function getDefaultCameraOffset(level: LevelData) {
  if (level.kind === "interiorMiniLevel") {
    return new THREE.Vector3(0, 9, -15)
  }

  return new THREE.Vector3(18, 16, -24)
}

export function CameraRig({ level, focusPoint, activeCameraZoneId }: CameraRigProps) {
  const { camera } = useThree()
  const smoothedFocusRef = useRef(new THREE.Vector3())
  const smoothedLookAtRef = useRef(new THREE.Vector3())

  const fallbackFocus = useMemo(() => {
    const centerX = (level.bounds.min.x + level.bounds.max.x) * 0.5
    const centerY = (level.bounds.min.y + level.bounds.max.y) * 0.35
    const centerZ = (level.bounds.min.z + level.bounds.max.z) * 0.45
    return new THREE.Vector3(centerX, centerY, centerZ)
  }, [level])

  useFrame(() => {
    const rawFocus = toVector3(focusPoint, fallbackFocus)
    const activeZone = getCameraZoneById(level, activeCameraZoneId) ?? findActiveCameraZone(level, rawFocus)
    const cameraSettings = activeZone?.camera
    const targetOffset = toVector3(cameraSettings?.targetOffset, new THREE.Vector3(0, level.kind === "interiorMiniLevel" ? 1.4 : 1.05, 0))
    const cameraOffset = toVector3(cameraSettings?.cameraOffset, getDefaultCameraOffset(level))
    const followLerp = cameraSettings?.followLerp ?? (level.kind === "interiorMiniLevel" ? 0.16 : 0.1)
    const lookLerp = cameraSettings?.lookLerp ?? (level.kind === "interiorMiniLevel" ? 0.14 : 0.08)
    const targetFov = cameraSettings?.fovDegrees ?? (level.kind === "interiorMiniLevel" ? 45 : 48)
    const desiredLookAt = rawFocus.clone().add(targetOffset)

    if (smoothedFocusRef.current.lengthSq() <= 0.000001) {
      smoothedFocusRef.current.copy(rawFocus)
      smoothedLookAtRef.current.copy(desiredLookAt)
    } else {
      smoothedFocusRef.current.lerp(rawFocus, followLerp)
      smoothedLookAtRef.current.lerp(desiredLookAt, lookLerp)
    }

    const focus = smoothedFocusRef.current
    const desired = focus.clone().add(cameraOffset)

    camera.position.lerp(desired, followLerp)
    camera.lookAt(smoothedLookAtRef.current)
    if ("fov" in camera && Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, lookLerp)
      camera.updateProjectionMatrix()
    }
  })

  return null
}
