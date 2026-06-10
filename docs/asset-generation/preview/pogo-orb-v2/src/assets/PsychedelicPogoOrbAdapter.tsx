import type { Vec3 } from "../world/levelTypes"
import { getToonMaterial } from "./ToonMaterials"

interface PsychedelicPogoOrbAdapterProps {
  position: Vec3
  yawRadians?: number
}

export function PsychedelicPogoOrbAdapter({ position, yawRadians = 0 }: PsychedelicPogoOrbAdapterProps) {
  return (
    <group name="psychedelic-pogo-orb-placeholder" position={[position.x, position.y + 0.5, position.z]} rotation={[0, yawRadians, 0]}>
      <mesh material={getToonMaterial("sealMagic")}>
        <sphereGeometry args={[0.5, 32, 18]} />
      </mesh>
      <mesh position={[0, 0.52, 0]} material={getToonMaterial("debug")}>
        <sphereGeometry args={[0.09, 16, 8]} />
      </mesh>
    </group>
  )
}

/*
Later, replace the placeholder with the reusable asset when its export shape is confirmed.
The expected source path from this file's target location is approximately:

../../../../code-examples/PsychedelicPogoOrbAsset.example

Do not make Folder 02 fail if that asset export name differs. Keep the placeholder until the import is verified.
*/
