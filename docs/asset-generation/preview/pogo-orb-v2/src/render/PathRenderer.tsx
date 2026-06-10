import { useMemo } from "react"
import * as THREE from "three"
import { getToonMaterial } from "../assets/ToonMaterials"
import { buildPathRibbonGeometry } from "../utils/pathGeometry"
import type { BuiltRoutePath } from "../utils/routeBuilder"
import { getDebugMaterial } from "../assets/DebugMaterials"

interface PathRendererProps {
  builtPaths: BuiltRoutePath[]
}

export function PathRenderer({ builtPaths }: PathRendererProps) {
  return (
    <group name="path-ribbons">
      {builtPaths
        .filter(({ path }) => path.generated.createVisualRibbon)
        .map((builtPath) => (
          <PathRibbon key={builtPath.path.id} builtPath={builtPath} />
        ))}
    </group>
  )
}

function PathRibbon({ builtPath }: { builtPath: BuiltRoutePath }) {
  const { path } = builtPath
  const geometry = useMemo(() => buildPathRibbonGeometry(path), [path])
  const splineGeometry = useMemo(() => buildDebugSplineGeometry(builtPath), [builtPath])
  const material = getToonMaterial(path.materialId)
  const splineMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: path.debug.color, transparent: true, opacity: 0.9 }),
    [path.debug.color]
  )
  const splineLine = useMemo(() => new THREE.Line(splineGeometry, splineMaterial), [splineGeometry, splineMaterial])
  const coinAnchorMaterial = getDebugMaterial("#ffd84a", 0.9)
  const sampleMaterial = getDebugMaterial(path.debug.color, 0.75)

  return (
    <group name={`route-${path.id}`}>
      <mesh name={path.id} geometry={geometry} material={material} />

      {path.debug.showSpline ? <primitive object={splineLine} name={`debug-spline-${path.id}`} /> : null}

      {path.debug.showSamples
        ? builtPath.samples
            .filter((_, index) => index % 8 === 0)
            .map((sample) => (
              <mesh
                key={`${path.id}-sample-${sample.t.toFixed(3)}`}
                name={`debug-path-sample-${path.id}`}
                position={[sample.point.x, sample.point.y + 0.16, sample.point.z]}
                material={sampleMaterial}
              >
                <sphereGeometry args={[0.12, 10, 8]} />
              </mesh>
            ))
        : null}

      {builtPath.coinTrailAnchors.map((anchor) => (
        <mesh
          key={anchor.id}
          name={`debug-${anchor.id}`}
          position={[anchor.position.x, anchor.position.y, anchor.position.z]}
          material={coinAnchorMaterial}
        >
          <octahedronGeometry args={[0.22, 0]} />
        </mesh>
      ))}
    </group>
  )
}

function buildDebugSplineGeometry(builtPath: BuiltRoutePath): THREE.BufferGeometry {
  const positions = builtPath.samples.flatMap((sample) => [
    sample.point.x,
    sample.point.y + 0.22,
    sample.point.z,
  ])
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeBoundingSphere()
  return geometry
}
