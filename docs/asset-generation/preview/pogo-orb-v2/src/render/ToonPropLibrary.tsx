import type { LevelData } from "../world/levelTypes"
import { getInkMaterial, getToonColorMaterial, getToonMaterial } from "../assets/ToonMaterials"

interface ToonPropLibraryProps {
  level: LevelData
}

export function ToonPropLibrary({ level }: ToonPropLibraryProps) {
  if (level.id === "glowbud-wizard-cave") {
    return (
      <group name="toon-props-cave">
        <CaveCrystalCluster position={[-9, 0.15, 2]} scale={1.1} />
        <CaveCrystalCluster position={[9.5, 0.95, 10.5]} scale={0.8} />
        <CaveCrystalCluster position={[-8, 1.55, 18.5]} scale={0.9} />
        <CaveMushroomPatch position={[5.8, 1.85, 20.8]} />
        <ChunkyRockStack position={[-11.5, 0.1, -3]} />
      </group>
    )
  }

  return (
    <group name="toon-props-overworld">
      <ToonTree position={[-12, 0.15, 10]} scale={1.15} />
      <ToonTree position={[13, 0.15, 24]} scale={0.95} />
      <ToonTree position={[20, 2.2, 52]} scale={0.9} />
      <ChunkyRockStack position={[-32, 6.15, 68]} />
      <ChunkyRockStack position={[17, 2.2, 38]} />
      <MuseumPillar position={[-8, 4.1, 132]} />
      <MuseumPillar position={[8, 4.1, 132]} />
      <MuseumSealVisual position={[0, 5.25, 139.2]} />
    </group>
  )
}

function ToonTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale} name="toon-tree">
      <mesh position={[0, 1.05, 0]} material={getInkMaterial()} scale={[1.16, 1.08, 1.16]}>
        <cylinderGeometry args={[0.34, 0.52, 2.1, 7]} />
      </mesh>
      <mesh position={[0, 1.05, 0]} material={getToonColorMaterial("#7a5436")}>
        <cylinderGeometry args={[0.3, 0.46, 2.1, 7]} />
      </mesh>
      <mesh position={[0, 2.35, 0]} material={getInkMaterial()} scale={[1.1, 1.1, 1.1]}>
        <icosahedronGeometry args={[1.25, 1]} />
      </mesh>
      <mesh position={[0, 2.35, 0]} material={getToonColorMaterial("#5fcf66")}>
        <icosahedronGeometry args={[1.18, 1]} />
      </mesh>
      <mesh position={[0.45, 2.72, -0.15]} material={getToonColorMaterial("#85e06d")}>
        <icosahedronGeometry args={[0.46, 0]} />
      </mesh>
    </group>
  )
}

function ChunkyRockStack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} name="chunky-rock-stack">
      <mesh position={[0, 0.45, 0]} material={getInkMaterial()} scale={[1.08, 1.08, 1.08]}>
        <dodecahedronGeometry args={[0.72, 0]} />
      </mesh>
      <mesh position={[0, 0.45, 0]} material={getToonColorMaterial("#777988")}>
        <dodecahedronGeometry args={[0.66, 0]} />
      </mesh>
      <mesh position={[0.72, 0.32, -0.28]} material={getInkMaterial()} scale={[1.08, 1.08, 1.08]}>
        <dodecahedronGeometry args={[0.48, 0]} />
      </mesh>
      <mesh position={[0.72, 0.32, -0.28]} material={getToonColorMaterial("#595b6a")}>
        <dodecahedronGeometry args={[0.43, 0]} />
      </mesh>
    </group>
  )
}

function CaveCrystalCluster({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale} name="cave-crystal-cluster">
      <CrystalBlade position={[0, 0.65, 0]} scale={[0.55, 1.25, 0.55]} />
      <CrystalBlade position={[0.55, 0.45, 0.2]} scale={[0.38, 0.85, 0.38]} />
      <CrystalBlade position={[-0.48, 0.38, -0.16]} scale={[0.32, 0.72, 0.32]} />
    </group>
  )
}

function CrystalBlade({ position, scale }: { position: [number, number, number]; scale: [number, number, number] }) {
  return (
    <group position={position} scale={scale}>
      <mesh material={getInkMaterial()} scale={[1.1, 1.1, 1.1]}>
        <octahedronGeometry args={[0.62, 0]} />
      </mesh>
      <mesh material={getToonColorMaterial("#86f0ff")}>
        <octahedronGeometry args={[0.56, 0]} />
      </mesh>
    </group>
  )
}

function CaveMushroomPatch({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} name="cave-mushroom-patch">
      <Mushroom position={[0, 0, 0]} cap="#9a74ff" />
      <Mushroom position={[0.55, -0.04, 0.28]} cap="#70d6ff" scale={0.72} />
      <Mushroom position={[-0.45, -0.05, -0.2]} cap="#ffd84a" scale={0.58} />
    </group>
  )
}

function Mushroom({
  position,
  cap,
  scale = 1,
}: {
  position: [number, number, number]
  cap: string
  scale?: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.22, 0]} material={getToonColorMaterial("#e8dcc4")}>
        <cylinderGeometry args={[0.09, 0.12, 0.44, 7]} />
      </mesh>
      <mesh position={[0, 0.48, 0]} material={getInkMaterial()} scale={[1.08, 1.08, 1.08]}>
        <sphereGeometry args={[0.28, 10, 6]} />
      </mesh>
      <mesh position={[0, 0.48, 0]} material={getToonColorMaterial(cap)}>
        <sphereGeometry args={[0.25, 10, 6]} />
      </mesh>
    </group>
  )
}

function MuseumPillar({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} name="museum-pillar">
      <mesh position={[0, 1.4, 0]} material={getInkMaterial()} scale={[1.06, 1.02, 1.06]}>
        <cylinderGeometry args={[0.72, 0.86, 2.8, 8]} />
      </mesh>
      <mesh position={[0, 1.4, 0]} material={getToonMaterial("museumStone")}>
        <cylinderGeometry args={[0.66, 0.8, 2.8, 8]} />
      </mesh>
      <mesh position={[0, 2.95, 0]} material={getToonColorMaterial("#a99069")}>
        <boxGeometry args={[1.8, 0.35, 1.25]} />
      </mesh>
    </group>
  )
}

function MuseumSealVisual({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} name="museum-seal-visual">
      <mesh material={getInkMaterial()} scale={[1.08, 1.08, 1.08]}>
        <torusGeometry args={[2.2, 0.18, 8, 36]} />
      </mesh>
      <mesh material={getToonMaterial("sealMagic")}>
        <torusGeometry args={[2.2, 0.14, 8, 36]} />
      </mesh>
      <mesh material={getToonColorMaterial("#d665ff")} rotation={[0, 0, Math.PI * 0.25]}>
        <boxGeometry args={[0.32, 3.6, 0.12]} />
      </mesh>
      <mesh material={getToonColorMaterial("#d665ff")} rotation={[0, 0, -Math.PI * 0.25]}>
        <boxGeometry args={[0.32, 3.6, 0.12]} />
      </mesh>
    </group>
  )
}
