import type { LevelData } from "../world/levelTypes"

interface SceneLightingProps {
  levelKind: LevelData["kind"]
}

export function SceneLighting({ levelKind }: SceneLightingProps) {
  if (levelKind === "interiorMiniLevel") {
    return (
      <>
        <ambientLight intensity={0.18} />
        <directionalLight position={[6, 10, -4]} intensity={0.45} color="#9fb6ff" />
        <pointLight position={[0, 6, 16]} intensity={1.85} distance={30} color="#9a74ff" />
        <pointLight position={[0, 1.5, -6]} intensity={0.7} distance={15} color="#70d6ff" />
      </>
    )
  }

  return (
    <>
      <ambientLight intensity={0.62} />
      <directionalLight position={[18, 28, -16]} intensity={1.25} />
      <hemisphereLight args={["#e5eeff", "#5a4d38", 0.5]} />
    </>
  )
}
