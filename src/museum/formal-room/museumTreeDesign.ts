export type MuseumTreePosition = readonly [number, number, number]

export type MuseumExteriorTreeSpec = {
  id: string
  position: MuseumTreePosition
  color: string
  scale: number
  yaw: number
  variant: 0 | 1 | 2
}

export type MuseumAtriumTreeSpec = {
  id: string
  position: MuseumTreePosition
  canopy: readonly [string, string, string]
  scale: number
  yaw: number
  variant: 0 | 1 | 2
}

export const MUSEUM_ATRIUM_TREE_VISUAL_RADIUS = 1.08
export const MUSEUM_ATRIUM_TREE_PLANTER_HALF_EXTENT = 0.74

export const MUSEUM_ATRIUM_TREE_SPECS: readonly MuseumAtriumTreeSpec[] = [
  { id: 'atrium-south-west', position: [-4.35, -1.96, 16.65], canopy: ['#3f6650', '#5f865e', '#88a370'], scale: 0.86, yaw: -0.18, variant: 0 },
  { id: 'atrium-south-east', position: [4.35, -1.96, 16.65], canopy: ['#456b59', '#668b69', '#91a779'], scale: 0.84, yaw: 0.42, variant: 1 },
  { id: 'atrium-north-west', position: [-4.35, -1.96, 30.1], canopy: ['#355f54', '#537d70', '#78988a'], scale: 0.9, yaw: 0.2, variant: 2 },
  { id: 'atrium-north-east', position: [4.6, -1.96, 28], canopy: ['#4f704d', '#708c5f', '#9baa74'], scale: 0.9, yaw: -0.36, variant: 0 },
] as const

export function museumAtriumTreePlanterBounds(spec: MuseumAtriumTreeSpec) {
  const halfExtent = MUSEUM_ATRIUM_TREE_PLANTER_HALF_EXTENT * spec.scale
  return {
    id: `${spec.id}-planter`,
    minX: spec.position[0] - halfExtent,
    maxX: spec.position[0] + halfExtent,
    minZ: spec.position[2] - halfExtent,
    maxZ: spec.position[2] + halfExtent,
  }
}

export const MUSEUM_EXTERIOR_TREE_SPECS: readonly MuseumExteriorTreeSpec[] = [
  { id: 'west-garden-south', position: [-20.2, -1.96, 10.4], color: '#66845b', scale: 1.02, yaw: -0.3, variant: 0 },
  { id: 'west-garden-center', position: [-21.7, -1.96, 17.2], color: '#486e58', scale: 1.14, yaw: 0.24, variant: 1 },
  { id: 'west-garden-north', position: [-20.5, -1.96, 25.7], color: '#708b5d', scale: 0.94, yaw: -0.12, variant: 2 },
  { id: 'east-garden-south', position: [20.3, -1.96, 11.8], color: '#587d66', scale: 0.98, yaw: 0.36, variant: 2 },
  { id: 'east-garden-center', position: [21.8, -1.96, 19.8], color: '#405f55', scale: 1.12, yaw: -0.2, variant: 0 },
  { id: 'east-garden-north', position: [20.4, -1.96, 28.2], color: '#78906d', scale: 0.9, yaw: 0.14, variant: 1 },
  { id: 'entry-garden-west-outer', position: [-10.7, -1.96, 0.65], color: '#607956', scale: 1.08, yaw: 0.18, variant: 1 },
  { id: 'entry-garden-west-inner', position: [-7.25, -1.96, -0.55], color: '#77895a', scale: 0.86, yaw: -0.4, variant: 2 },
  { id: 'entry-garden-east-inner', position: [7.4, -1.96, 0.4], color: '#536f5a', scale: 0.92, yaw: 0.3, variant: 0 },
  { id: 'entry-garden-east-outer', position: [10.8, -1.96, -0.7], color: '#6f845f', scale: 1.06, yaw: -0.16, variant: 1 },
  { id: 'rear-garden-west-outer', position: [-9.8, -1.96, 38.6], color: '#456f5c', scale: 1.1, yaw: -0.28, variant: 2 },
  { id: 'rear-garden-west-inner', position: [-4.8, -1.96, 40.3], color: '#66885d', scale: 0.9, yaw: 0.34, variant: 0 },
  { id: 'rear-garden-east-inner', position: [4.6, -1.96, 39.4], color: '#547a61', scale: 0.96, yaw: -0.22, variant: 1 },
  { id: 'rear-garden-east-outer', position: [10.2, -1.96, 38.2], color: '#719064', scale: 1.08, yaw: 0.2, variant: 2 },
] as const
