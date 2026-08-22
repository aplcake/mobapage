import * as THREE from 'three'

export type ShellOpeningSealSpec = {
  segments?: number
  rings?: number
  centerX?: number
  centerY?: number
  frontXRadius: number
  frontYRadius: number
  backXRadius: number
  backYRadius: number
  frontZ: number
  backZ: number
  xCurve?: number
  yCurve?: number
  lowerDrop?: number
  upperLift?: number
  sideDepth?: number
  surfaceRipple?: number
  ripplePhase?: number
}

function smoothstep01(value: number) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1)
  return clamped * clamped * (3 - 2 * clamped)
}

function curvedAxis(value: number, curve: number) {
  return Math.sign(value || 1) * Math.pow(Math.abs(value), curve)
}

/**
 * Builds the buried transition between a decorative face rim and its shell body.
 * Both open ends intentionally sit inside existing geometry, making the seal
 * continuous without adding another visible outline around the aperture.
 */
export function createShellOpeningSealGeometry(spec: ShellOpeningSealSpec) {
  const segments = spec.segments ?? 48
  const rings = spec.rings ?? 5
  const centerX = spec.centerX ?? 0
  const centerY = spec.centerY ?? 0
  const xCurve = spec.xCurve ?? 1
  const yCurve = spec.yCurve ?? 1
  const lowerDrop = spec.lowerDrop ?? 0
  const upperLift = spec.upperLift ?? 0
  const sideDepth = spec.sideDepth ?? 0
  const surfaceRipple = spec.surfaceRipple ?? 0
  const ripplePhase = spec.ripplePhase ?? 0
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings
    const eased = smoothstep01(t)
    const xRadius = THREE.MathUtils.lerp(spec.frontXRadius, spec.backXRadius, eased)
    const yRadius = THREE.MathUtils.lerp(spec.frontYRadius, spec.backYRadius, eased)
    const baseZ = THREE.MathUtils.lerp(spec.frontZ, spec.backZ, eased)

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const cosAngle = Math.cos(angle)
      const sinAngle = Math.sin(angle)
      const side = Math.abs(cosAngle)
      const lower = Math.max(0, -sinAngle)
      const upper = Math.max(0, sinAngle)
      const ripple = 1 + Math.sin(angle * 3 + ripplePhase) * surfaceRipple * (1 - eased * 0.45)
      const bridgeArch = Math.sin(t * Math.PI)

      vertices.push(
        centerX + curvedAxis(cosAngle, xCurve) * xRadius * ripple,
        centerY
          + curvedAxis(sinAngle, yCurve) * yRadius * ripple
          - lower * lowerDrop * (1 - eased * 0.35)
          + upper * upperLift * (1 - eased * 0.35),
        baseZ + side * sideDepth * bridgeArch,
      )
    }
  }

  const row = segments + 1
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const base = ring * row + segment
      indices.push(base, base + 1, base + row)
      indices.push(base + 1, base + row + 1, base + row)
    }
  }

  const indexed = new THREE.BufferGeometry()
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  indexed.setIndex(indices)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
