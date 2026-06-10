import * as THREE from "three"

const debugMaterialCache = new Map<string, THREE.MeshBasicMaterial>()

export function getDebugMaterial(color: string, opacity = 0.35): THREE.MeshBasicMaterial {
  const key = `${color}:${opacity}`
  const cached = debugMaterialCache.get(key)
  if (cached) return cached

  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    wireframe: false,
  })

  debugMaterialCache.set(key, material)
  return material
}
