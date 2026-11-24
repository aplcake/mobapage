import * as THREE from 'three'
import { MECHANICAL_TIMING as M, mechanismPose, passengerPose, smoothRange, type Procedure } from './sequence'

export const CABINET_PIVOT = 0.73
export const HOSE_RADIUS = 0.18
export const HOSE_COLLARS = [0.04, 0.17, 0.34, 0.5, 0.67, 0.85, 0.97]
export const HOSE_POINTS = [[-1.62, 3.95, -0.34], [-2.55, 4.3, -0.34], [-2.6, 5.5, -0.34], [-1.8, 5.92, -0.34], [1.8, 5.92, -0.34], [2.9, 5.4, -0.34], [3.08, 4.6, -0.34], [3.08, 4.12, -0.34]] as const
const curve = new THREE.CatmullRomCurve3(HOSE_POINTS.map(p => new THREE.Vector3(...p)))

function lobe(t: number, start: number, peak: number, end: number) {
  return smoothRange(t, start, peak) * (1 - smoothRange(t, peak, end))
}

export function rubberPose(t: number, procedure: Procedure, reduced = false) {
  let squeeze = 0, inhale = 0, rebound = 0
  if (procedure === 'evacuation' && !reduced) {
    M.pumps.forEach((peak, i) => {
      const weight = 0.78 + i * 0.11
      inhale += weight * lobe(t, peak - 0.4, peak - 0.25, peak - 0.14)
      squeeze += weight * lobe(t, peak - 0.19, peak, peak + 0.12)
      rebound += weight * lobe(t, peak + 0.04, peak + 0.19, peak + 0.42)
    })
    squeeze += 0.55 * lobe(t, M.relaunch - 0.3, M.relaunch - 0.07, M.relaunch + 0.05)
    rebound += 0.7 * lobe(t, M.relaunch, M.relaunch + 0.19, M.relaunch + 0.56)
  }
  const squash = squeeze * 0.17 - inhale * 0.035 - rebound * 0.065
  return {
    squeeze, inhale, rebound,
    scaleX: 1 + squash * 0.28,
    scaleY: 1 - squash,
    scaleZ: 1 + squash * 0.42,
    lean: squeeze * 0.035 - rebound * 0.015,
    bellowsHeight: 1 - squeeze * 0.64 + inhale * 0.18 + rebound * 0.16,
    bellowsWidth: 1 + squeeze * 0.24 - inhale * 0.035,
  }
}

export function cabinetPoint(point: readonly number[], pose: ReturnType<typeof rubberPose>, out: THREE.Vector3) {
  const x = point[0] * pose.scaleX, y = (point[1] - CABINET_PIVOT) * pose.scaleY
  return out.set(x * Math.cos(pose.lean) - y * Math.sin(pose.lean), CABINET_PIVOT + x * Math.sin(pose.lean) + y * Math.cos(pose.lean), point[2] * pose.scaleZ)
}

const SEGMENTS = 120, SIDES = 12

// Persistent Three.js tube topology, refitted to one shared centerline. The surface,
// ink hull, stripe, collars and passenger all use these same frames, including at the sockets.
export function createDeliveryHose() {
  const body = new THREE.TubeGeometry(curve, SEGMENTS, HOSE_RADIUS, SIDES, false)
  const outline = body.clone(), stripe = body.clone()
  const geometries = [body, outline, stripe]
  const bases = Array.from({ length: SEGMENTS + 1 }, (_, i) => curve.getPointAt(i / SEGMENTS))
  const centers = bases.map(p => p.clone()), tangents = bases.map(() => new THREE.Vector3()), normals = bases.map(() => new THREE.Vector3()), binormals = bases.map(() => new THREE.Vector3())
  const radii = new Float32Array(SEGMENTS + 1).fill(HOSE_RADIUS)
  const delta = new THREE.Vector3(), up = new THREE.Vector3(0, 0, 1)
  let lastTime = -1, lastProcedure: Procedure | null = null, lastReduced = false
  for (const geometry of geometries) {
    for (const key of ['position', 'normal']) {
      const attribute = geometry.getAttribute(key)
      if (attribute instanceof THREE.BufferAttribute) attribute.setUsage(THREE.DynamicDrawUsage)
    }
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 4.5, 0), 6)
  }
  function update(t: number, procedure: Procedure, reduced = false) {
    if (t === lastTime && procedure === lastProcedure && reduced === lastReduced) return
    lastTime = t; lastProcedure = procedure; lastReduced = reduced
    const pose = rubberPose(t, procedure, reduced)
    const passenger = passengerPose(t, procedure, reduced)
    const drop = mechanismPose(t, procedure, reduced).dockDrop
    cabinetPoint(HOSE_POINTS[0], pose, delta).sub(bases[0])
    const active = procedure === 'evacuation' && !reduced
    const travel = active ? smoothRange(t, M.launch - 0.15, M.launch + 0.2) * (1 - smoothRange(t, M.arrival - 0.22, M.arrival)) : 0
    for (let i = 0; i <= SEGMENTS; i++) {
      const u = i / SEGMENTS, anchor = (1 - u) ** 3, free = Math.sin(Math.PI * u) ** 2
      let wave = 0
      if (active) {
        for (const peak of M.pumps) {
          const age = t - peak - u * 0.76
          if (age > 0 && age < 0.76) wave += Math.sin(age / 0.76 * Math.PI * 2) * Math.sin(age / 0.76 * Math.PI) * 0.3
        }
        const age = t - M.relaunch - u * 0.4
        if (age > 0 && age < 0.9) wave += Math.sin(age / 0.9 * Math.PI * 2) * Math.sin(age / 0.9 * Math.PI) * 0.26
      }
      const distance = (u - passenger.progress) / 0.09
      const payload = travel * Math.exp(-distance * distance * 2)
      const intake = active ? pose.squeeze * Math.exp(-(((u - 0.07) / 0.11) ** 2)) : 0
      centers[i].copy(bases[i]).addScaledVector(delta, anchor)
      centers[i].x += free * (wave * 0.42 + payload * 0.06)
      centers[i].y += free * (wave + payload * 0.13 + pose.inhale * 0.13) - drop * u ** 8
      centers[i].z += free * wave * 0.16
      radii[i] = HOSE_RADIUS * (1 + free * payload * 1.35 + Math.sin(Math.PI * u) * intake * 0.65)
    }
    for (let i = 0; i <= SEGMENTS; i++) {
      tangents[i].subVectors(centers[Math.min(i + 1, SEGMENTS)], centers[Math.max(i - 1, 0)]).normalize()
      normals[i].crossVectors(up, tangents[i]).normalize()
      binormals[i].crossVectors(tangents[i], normals[i]).normalize()
      for (let side = 0; side <= SIDES; side++) {
        const angle = side / SIDES * Math.PI * 2, c = -Math.cos(angle), s = Math.sin(angle)
        const index = i * (SIDES + 1) + side
        geometries.forEach((geometry, layer) => {
          const radius = layer === 0 ? radii[i] : layer === 1 ? radii[i] + 0.021 : radii[i] * 0.29
          const stripeLift = layer === 2 ? radii[i] * 0.77 : 0
          geometry.getAttribute('position').setXYZ(index,
            centers[i].x + normals[i].x * c * radius + binormals[i].x * (s * radius + stripeLift),
            centers[i].y + normals[i].y * c * radius + binormals[i].y * (s * radius + stripeLift),
            centers[i].z + normals[i].z * c * radius + binormals[i].z * (s * radius + stripeLift))
        })
      }
    }
    for (const geometry of geometries) {
      geometry.getAttribute('position').needsUpdate = true
      geometry.computeVertexNormals()
      const normal = geometry.getAttribute('normal')
      for (let ring = 0; ring <= SEGMENTS; ring++) {
        const first = ring * (SIDES + 1), last = first + SIDES
        delta.set(normal.getX(first) + normal.getX(last), normal.getY(first) + normal.getY(last), normal.getZ(first) + normal.getZ(last)).normalize()
        normal.setXYZ(first, delta.x, delta.y, delta.z)
        normal.setXYZ(last, delta.x, delta.y, delta.z)
      }
    }
  }
  function frame(u: number, point: THREE.Vector3, tangent: THREE.Vector3) {
    const index = Math.max(0, Math.min(SEGMENTS, u * SEGMENTS)), low = Math.floor(index), high = Math.min(SEGMENTS, low + 1), mix = index - low
    point.lerpVectors(centers[low], centers[high], mix)
    tangent.lerpVectors(tangents[low], tangents[high], mix).normalize()
    return THREE.MathUtils.lerp(radii[low], radii[high], mix)
  }
  update(0, 'evacuation')
  return { body, outline, stripe, update, frame, dispose: () => geometries.forEach(geometry => geometry.dispose()) }
}
