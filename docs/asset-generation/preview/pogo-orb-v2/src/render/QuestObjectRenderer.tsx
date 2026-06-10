import type { LevelData } from "../world/levelTypes"
import type { QuestRuntimeState } from "../game/questState"
import { hasCollected } from "../game/questState"
import { getInkMaterial, getToonColorMaterial } from "../assets/ToonMaterials"

interface QuestObjectRendererProps {
  level: LevelData
  questState: QuestRuntimeState
}

export function QuestObjectRenderer({ level, questState }: QuestObjectRendererProps) {
  return (
    <group name={`quest-objects-${level.id}`}>
      {level.collectibles
        .filter((collectible) => !hasCollected(questState, collectible.id))
        .map((collectible) => (
          <group
            key={collectible.id}
            name={`collectible-${collectible.id}`}
            position={[collectible.position.x, collectible.position.y, collectible.position.z]}
          >
            <mesh material={getInkMaterial()} scale={[1.14, 1.14, 1.14]} rotation={[Math.PI * 0.5, 0, 0]}>
              {collectible.kind === "specialCoin" ? (
                <octahedronGeometry args={[0.55, 0]} />
              ) : (
                <cylinderGeometry args={[0.32, 0.32, 0.12, 18]} />
              )}
            </mesh>
            <mesh material={getToonColorMaterial(collectible.debug.color)} rotation={[Math.PI * 0.5, 0, 0]}>
              {collectible.kind === "specialCoin" ? (
                <octahedronGeometry args={[0.55, 0]} />
              ) : (
                <cylinderGeometry args={[0.32, 0.32, 0.12, 18]} />
              )}
            </mesh>
          </group>
        ))}

      {level.npcs.map((npc) => (
        <group key={npc.id} name={`npc-${npc.id}`} position={[npc.position.x, npc.position.y, npc.position.z]}>
          <mesh material={getInkMaterial()} scale={[1.12, 1.12, 1.12]}>
            <sphereGeometry args={[0.62, 18, 12]} />
          </mesh>
          <mesh material={getToonColorMaterial(npc.debug.color)}>
            <sphereGeometry args={[0.62, 18, 12]} />
          </mesh>
          <mesh position={[0, 0.72, 0]} material={getToonColorMaterial("#f7f4e8")}>
            <coneGeometry args={[0.28, 0.5, 12]} />
          </mesh>
          <mesh position={[0.18, 0.16, -0.55]} material={getToonColorMaterial("#101018")}>
            <sphereGeometry args={[0.08, 8, 6]} />
          </mesh>
          <mesh position={[-0.18, 0.16, -0.55]} material={getToonColorMaterial("#101018")}>
            <sphereGeometry args={[0.08, 8, 6]} />
          </mesh>
        </group>
      ))}

      {level.signs.map((sign) => (
        <group
          key={sign.id}
          name={`sign-${sign.id}`}
          position={[sign.position.x, sign.position.y, sign.position.z]}
          rotation={[0, sign.yawRadians, 0]}
        >
          <mesh position={[0, 0.65, 0]} material={getInkMaterial()} scale={[1.08, 1.08, 1.08]}>
            <boxGeometry args={[1.2, 0.72, 0.12]} />
          </mesh>
          <mesh position={[0, 0.65, 0]} material={getToonColorMaterial(sign.debug.color)}>
            <boxGeometry args={[1.2, 0.72, 0.12]} />
          </mesh>
          <mesh position={[0, 0.18, 0]} material={getToonColorMaterial("#5a3d24")}>
            <boxGeometry args={[0.16, 0.8, 0.16]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
