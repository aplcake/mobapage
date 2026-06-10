import { useMemo } from "react"
import type { LevelData, TerrainZone } from "../world/levelTypes"
import { getInkMaterial, getToonMaterial } from "../assets/ToonMaterials"
import { boundsCenterTuple, boundsSizeTuple, boundsYawRadians } from "../utils/renderBounds"

interface TerrainRendererProps {
  level: LevelData
}

export function TerrainRenderer({ level }: TerrainRendererProps) {
  const zones = useMemo(() => level.terrainZones, [level])

  return (
    <group name={`terrain-${level.id}`}>
      {zones.map((zone) => (
        <TerrainZoneMesh key={zone.id} zone={zone} />
      ))}
    </group>
  )
}

function TerrainZoneMesh({ zone }: { zone: TerrainZone }) {
  const center = boundsCenterTuple(zone.bounds)
  const size = boundsSizeTuple(zone.bounds)
  const yaw = boundsYawRadians(zone.bounds)
  const material = getToonMaterial(zone.materialId)

  const adjustedCenter: [number, number, number] = [
    center[0],
    zone.baseElevation + Math.max(size[1], zone.visualHeight ?? size[1]) * 0.5 - 0.05,
    center[2],
  ]

  const adjustedSize: [number, number, number] = [
    size[0],
    Math.max(0.1, zone.visualHeight ?? size[1]),
    size[2],
  ]

  const outlineSize: [number, number, number] = [
    adjustedSize[0] + 0.12,
    adjustedSize[1] + 0.12,
    adjustedSize[2] + 0.12,
  ]

  return (
    <group name={zone.id} position={adjustedCenter} rotation={[0, yaw, 0]}>
      <mesh name={`${zone.id}-ink`} material={getInkMaterial()}>
        <boxGeometry args={outlineSize} />
      </mesh>
      <mesh name={`${zone.id}-toon`} material={material}>
        <boxGeometry args={adjustedSize} />
      </mesh>
    </group>
  )
}
