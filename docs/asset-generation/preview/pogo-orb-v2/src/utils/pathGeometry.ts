import * as THREE from "three"
import type { PathDefinition, Vec3 } from "../world/levelTypes"

export interface PathSample {
  t: number
  point: Vec3
  tangent: Vec3
  width: number
}

export function buildPathRibbonGeometry(path: PathDefinition): THREE.BufferGeometry {
  const samples = samplePath(path)

  if (samples.length < 2) {
    return new THREE.BufferGeometry()
  }

  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]
    const center = toVector3(sample.point)
    const tangent = toVector3(sample.tangent).normalize()
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()

    const left = center.clone().addScaledVector(side, sample.width * 0.5)
    const right = center.clone().addScaledVector(side, -sample.width * 0.5)

    positions.push(left.x, left.y, left.z)
    positions.push(right.x, right.y, right.z)

    normals.push(0, 1, 0)
    normals.push(0, 1, 0)

    uvs.push(0, sample.t)
    uvs.push(1, sample.t)

    if (i < samples.length - 1) {
      const a = i * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3

      indices.push(a, c, b)
      indices.push(c, d, b)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return geometry
}

export function samplePath(path: PathDefinition, segments = getPathSegmentCount(path)): PathSample[] {
  if (path.points.length < 2) return []

  const curve = buildPathCurve(path)

  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments
    const point = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t).normalize()

    return {
      t,
      point: { x: point.x, y: point.y, z: point.z },
      tangent: { x: tangent.x, y: tangent.y, z: tangent.z },
      width: samplePathWidth(path, t),
    }
  })
}

export function buildPathCurve(path: PathDefinition): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    path.points.map((point) => new THREE.Vector3(point.x, point.y + 0.035, point.z)),
    false,
    "catmullrom",
    0.5
  )
}

export function getPathSegmentCount(path: PathDefinition): number {
  return Math.max(12, path.points.length * 16)
}

export function samplePathWidth(path: PathDefinition, t: number): number {
  const samples = path.width.samples
  if (!samples?.length) return path.width.default

  const sorted = [...samples].sort((a, b) => a.t - b.t)

  if (t <= sorted[0].t) return sorted[0].width
  if (t >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].width

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i]
    const next = sorted[i + 1]

    if (t >= current.t && t <= next.t) {
      const localT = (t - current.t) / (next.t - current.t)
      return current.width + (next.width - current.width) * localT
    }
  }

  return path.width.default
}

function toVector3(value: Vec3): THREE.Vector3 {
  return new THREE.Vector3(value.x, value.y, value.z)
}
