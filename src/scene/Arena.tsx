import { PALETTE } from '../core/palettes'
import { GAME_CONFIG } from '../core/config'
import { SLURPER_PARAMS } from '../core/parameters'
import { OutlineMesh } from '../render/OutlineMesh'
import { getToonRampTexture } from '../shaders/toonRamp'
import { RespawnProps } from './RespawnProps'

function toon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getToonRampTexture()} />
}

function BoundaryRail({ x, z, rotation = 0, length = 3 }: { x: number; z: number; rotation?: number; length?: number }) {
  return (
    <OutlineMesh
      position={[x, 0.34, z]}
      rotation-y={rotation}
      scale={[length, 0.34, 0.3]}
      outlineWidth={SLURPER_PARAMS.outlines.propLargeWorld}
      geometry={<boxGeometry args={[1, 1, 1]} />}
      material={toon(PALETTE.plankPurple)}
    />
  )
}

function LandmarkSign() {
  return (
    <group position={[-1.8, 0, -7.25]} rotation-y={0.08} rotation-z={-0.08}>
      <OutlineMesh
        position={[0, 1.8, 0]}
        scale={[2.3, 0.8, 0.18]}
        outlineWidth={SLURPER_PARAMS.outlines.propLargeWorld}
        geometry={<boxGeometry args={[1, 1, 1]} />}
        material={toon(PALETTE.boneYellow)}
      />
      {[-0.72, -0.24, 0.24, 0.72].map((x, index) => (
        <OutlineMesh
          key={x}
          position={[x, 1.83, -0.12]}
          scale={[0.18, 0.54 - index * 0.04, 0.08]}
          outlineWidth={0.008}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          material={toon(index % 2 ? PALETTE.slimeCyan : PALETTE.slimeMagenta)}
        />
      ))}
      <OutlineMesh
        position={[-0.92, 0.82, 0]}
        scale={[0.13, 1.05, 0.13]}
        outlineWidth={SLURPER_PARAMS.outlines.propSmallWorld}
        geometry={<cylinderGeometry args={[1, 1, 1, 6]} />}
        material={toon(PALETTE.rust)}
      />
      <OutlineMesh
        position={[0.92, 0.82, 0]}
        scale={[0.13, 1.05, 0.13]}
        outlineWidth={SLURPER_PARAMS.outlines.propSmallWorld}
        geometry={<cylinderGeometry args={[1, 1, 1, 6]} />}
        material={toon(PALETTE.rust)}
      />
    </group>
  )
}

export function Arena() {
  const [floorWidth, floorDepth] = GAME_CONFIG.arena.floorSize
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[floorWidth, floorDepth, 1, 1]} />
        <meshToonMaterial color={PALETTE.hauntedFloor} gradientMap={getToonRampTexture()} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}>
        <ringGeometry args={[6.3, 6.45, 9]} />
        <meshBasicMaterial color={PALETTE.deepPurple} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => {
        const t = i / 14
        const angle = t * Math.PI * 2
        const x = Math.cos(angle) * 12.7
        const z = Math.sin(angle) * 8
        return <BoundaryRail key={i} x={x} z={z} rotation={-angle + Math.PI / 2} length={i % 3 === 0 ? 2.6 : 1.8} />
      })}
      {Array.from({ length: 22 }, (_, i) => {
        const x = ((i * 5.7) % 24) - 12
        const z = ((i * 3.2) % 15) - 7
        return (
          <mesh key={i} position={[x, 0.018, z]} rotation-x={-Math.PI / 2} rotation-z={i * 0.73}>
            <planeGeometry args={[0.45 + (i % 4) * 0.12, 0.06]} />
            <meshBasicMaterial color={i % 2 ? PALETTE.deepPurple : PALETTE.rust} />
          </mesh>
        )
      })}
      <LandmarkSign />
      <RespawnProps />
    </group>
  )
}
