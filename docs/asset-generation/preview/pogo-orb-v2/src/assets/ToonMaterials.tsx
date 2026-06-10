import * as THREE from "three"
import type { MaterialId } from "../world/levelTypes"

const materialColors: Record<MaterialId, string> = {
  grass: "#63bf66",
  pathDirt: "#d7a957",
  cliffPath: "#a78762",
  cliffRock: "#5b5967",
  caveStone: "#3e4258",
  water: "#3b8bd9",
  museumStone: "#c9b58d",
  wood: "#8a5b35",
  sealMagic: "#9a74ff",
  debug: "#ffffff",
}

const materialCache = new Map<MaterialId, THREE.MeshToonMaterial>()
const colorMaterialCache = new Map<string, THREE.MeshToonMaterial>()
let inkMaterial: THREE.MeshBasicMaterial | undefined

export function getToonMaterial(materialId: MaterialId): THREE.MeshToonMaterial {
  const cached = materialCache.get(materialId)
  if (cached) return cached

  const material = new THREE.MeshToonMaterial({
    color: materialColors[materialId] ?? materialColors.debug,
  })

  materialCache.set(materialId, material)
  return material
}

export function getToonColorMaterial(color: string): THREE.MeshToonMaterial {
  const cached = colorMaterialCache.get(color)
  if (cached) return cached

  const material = new THREE.MeshToonMaterial({
    color,
  })

  colorMaterialCache.set(color, material)
  return material
}

export function getInkMaterial(): THREE.MeshBasicMaterial {
  if (inkMaterial) return inkMaterial

  inkMaterial = new THREE.MeshBasicMaterial({
    color: "#101018",
    side: THREE.BackSide,
  })

  return inkMaterial
}
