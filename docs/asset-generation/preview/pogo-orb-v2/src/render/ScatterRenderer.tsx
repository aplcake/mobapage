import { useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { getToonColorMaterial } from "../assets/ToonMaterials"
import type { ScatterInstance } from "../utils/scatterBuilder"

interface ScatterRendererProps {
  instances: ScatterInstance[]
}

export function ScatterRenderer({ instances }: ScatterRendererProps) {
  const batches = useMemo(() => groupScatterInstances(instances), [instances])

  return (
    <group name="procedural-scatter">
      {batches.map((batch) => (
        <ScatterBatch key={batch.key} batch={batch} />
      ))}
    </group>
  )
}

interface ScatterBatchData {
  key: string
  scatterType: ScatterInstance["scatterType"]
  color: string
  instances: ScatterInstance[]
}

function ScatterBatch({ batch }: { batch: ScatterBatchData }) {
  const meshRef = useRef<THREE.InstancedMesh | null>(null)
  const geometry = useMemo(() => getScatterGeometry(batch.scatterType), [batch.scatterType])
  const material = getToonColorMaterial(getScatterColor(batch.scatterType, batch.color))

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    const rotation = new THREE.Euler()

    batch.instances.forEach((instance, index) => {
      position.set(instance.position.x, instance.position.y, instance.position.z)
      rotation.set(0, instance.yawRadians, 0)
      quaternion.setFromEuler(rotation)
      scale.setScalar(instance.scale)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(index, matrix)
    })

    mesh.instanceMatrix.needsUpdate = true
  }, [batch.instances])

  return (
    <instancedMesh
      ref={meshRef}
      name={`scatter-${batch.key}`}
      args={[geometry, material, batch.instances.length]}
      frustumCulled
    />
  )
}

function groupScatterInstances(instances: ScatterInstance[]): ScatterBatchData[] {
  const batches = new Map<string, ScatterBatchData>()

  for (const instance of instances) {
    const key = `${instance.scatterType}:${instance.color}`
    const batch = batches.get(key) ?? {
      key,
      scatterType: instance.scatterType,
      color: instance.color,
      instances: [],
    }
    batch.instances.push(instance)
    batches.set(key, batch)
  }

  return [...batches.values()]
}

function getScatterGeometry(type: ScatterInstance["scatterType"]): THREE.BufferGeometry {
  switch (type) {
    case "grassTufts":
      return new THREE.ConeGeometry(0.14, 0.58, 5)
    case "flowers":
      return new THREE.SphereGeometry(0.16, 8, 6)
    case "smallRocks":
      return new THREE.DodecahedronGeometry(0.34, 0)
    case "mushrooms":
      return new THREE.SphereGeometry(0.24, 10, 6)
    case "caveCrystals":
      return new THREE.OctahedronGeometry(0.38, 0)
    case "roots":
      return new THREE.CapsuleGeometry(0.12, 0.48, 3, 6)
    default:
      return new THREE.BoxGeometry(0.3, 0.3, 0.3)
  }
}

function getScatterColor(type: ScatterInstance["scatterType"], fallback: string): string {
  if (type === "grassTufts") return "#5ed368"
  if (type === "flowers") return "#ffcf5a"
  if (type === "smallRocks") return "#777988"
  if (type === "mushrooms") return "#9a74ff"
  if (type === "caveCrystals") return "#86f0ff"
  if (type === "roots") return "#7a5436"
  return fallback
}
