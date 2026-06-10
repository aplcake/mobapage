import * as THREE from 'three'
import { PALETTE } from '../core/palettes'
import { SLURPER_PARAMS } from '../core/parameters'
import { OutlineMesh } from '../render/OutlineMesh'
import { getToonRampTexture } from '../shaders/toonRamp'
import type { RespawnSite } from '../systems/slime/slimeTypes'

export const RESPAWN_SITES: RespawnSite[] = [
  { id: 0, position: new THREE.Vector3(-8.8, 0.1, -4.6), radius: 1.5, mode: 'spout' },
  { id: 1, position: new THREE.Vector3(8.2, 0.1, -4.4), radius: 1.4, mode: 'grate' },
  { id: 2, position: new THREE.Vector3(-6.8, 0.1, 4.4), radius: 1.55, mode: 'drain' },
  { id: 3, position: new THREE.Vector3(6.3, 0.1, 3.9), radius: 1.45, mode: 'pump' },
  { id: 4, position: new THREE.Vector3(0.5, 0.1, 5.4), radius: 1.25, mode: 'crack' },
]

function toon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getToonRampTexture()} />
}

function SitePennant({ position, color, rotation = 0 }: { position: THREE.Vector3; color: string; rotation?: number }) {
  return (
    <group position={position} rotation-y={rotation}>
      <OutlineMesh
        position={[-0.55, 0.72, 0.42]}
        scale={[0.08, 1.18, 0.08]}
        outlineWidth={SLURPER_PARAMS.outlines.propSmallWorld}
        geometry={<cylinderGeometry args={[1, 1, 1, 6]} />}
        material={toon(PALETTE.outline)}
      />
      <OutlineMesh
        position={[-0.25, 1.22, 0.42]}
        rotation-z={-Math.PI / 2}
        scale={[0.42, 0.42, 0.12]}
        outlineWidth={SLURPER_PARAMS.outlines.propSmallWorld}
        geometry={<coneGeometry args={[1, 1, 3]} />}
        material={toon(color)}
      />
    </group>
  )
}

function PipeSpout({ position }: { position: THREE.Vector3 }) {
  return (
    <group position={position}>
      <OutlineMesh
        position={[-0.82, 0.92, 0.08]}
        scale={[0.42, 1.05, 0.42]}
        outlineWidth={SLURPER_PARAMS.outlines.propLargeWorld}
        geometry={<cylinderGeometry args={[1, 1, 1, 10]} />}
        material={toon(PALETTE.murkBlue)}
      />
      <OutlineMesh
        position={[0, 0.75, 0]}
        rotation-z={Math.PI / 2}
        scale={[0.6, 0.6, 1.4]}
        outlineWidth={SLURPER_PARAMS.outlines.propLargeWorld}
        geometry={<cylinderGeometry args={[0.52, 0.52, 1, 12]} />}
        material={toon(PALETTE.drainGreen)}
      />
      <OutlineMesh
        position={[0.25, 1.14, 0]}
        rotation-z={Math.PI / 2}
        scale={[0.22, 0.22, 0.88]}
        outlineWidth={SLURPER_PARAMS.outlines.propSmallWorld}
        geometry={<cylinderGeometry args={[1, 1, 1, 8]} />}
        material={toon(PALETTE.asphaltInk)}
      />
      <OutlineMesh
        position={[0.72, 0.75, 0]}
        rotation-z={Math.PI / 2}
        outlineWidth={SLURPER_PARAMS.outlines.propSmallWorld}
        geometry={<torusGeometry args={[0.55, 0.1, 8, 16]} />}
        material={toon(PALETTE.boneYellow)}
      />
      <OutlineMesh
        position={[1.02, 0.35, 0]}
        scale={[0.16, 0.24, 0.16]}
        outlineWidth={SLURPER_PARAMS.outlines.propSmallWorld}
        geometry={<sphereGeometry args={[1, 8, 6]} />}
        material={toon(PALETTE.slimeLime)}
      />
    </group>
  )
}

function FloorGrate({ position }: { position: THREE.Vector3 }) {
  return (
    <group position={position}>
      <OutlineMesh
        rotation-x={-Math.PI / 2}
        scale={[1.62, 1.02, 0.16]}
        outlineWidth={SLURPER_PARAMS.outlines.propLargeWorld}
        geometry={<cylinderGeometry args={[1, 1, 0.16, 8]} />}
        material={toon(PALETTE.asphaltInk)}
      />
      <OutlineMesh
        rotation-x={-Math.PI / 2}
        scale={[1.25, 0.42, 1]}
        outlineWidth={SLURPER_PARAMS.outlines.propSmallWorld}
        geometry={<boxGeometry args={[1, 1, 0.16]} />}
        material={toon(PALETTE.murkBlue)}
      />
      {[-0.45, 0, 0.45].map((x) => (
        <OutlineMesh
          key={x}
          position={[x, 0.08, 0]}
          rotation-x={-Math.PI / 2}
          scale={[0.06, 0.56, 1]}
          outlineWidth={0.01}
          geometry={<boxGeometry args={[1, 1, 0.1]} />}
          material={toon(PALETTE.outline)}
        />
      ))}
      {[-0.42, 0.42].map((angle) => (
        <OutlineMesh
          key={angle}
          position={[0, 0.12, 0]}
          rotation-y={angle}
          scale={[0.08, 0.18, 1.38]}
          outlineWidth={0.01}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          material={toon(PALETTE.bone)}
        />
      ))}
    </group>
  )
}

function DrainMouth({ position }: { position: THREE.Vector3 }) {
  return (
    <group position={position}>
      <OutlineMesh
        position={[0, 0.1, 0]}
        rotation-x={-Math.PI / 2}
        scale={[1.48, 0.92, 0.32]}
        outlineWidth={SLURPER_PARAMS.outlines.propLargeWorld}
        geometry={<sphereGeometry args={[1, 16, 8]} />}
        material={toon(PALETTE.asphaltInk)}
      />
      {[-0.45, 0, 0.45].map((x) => (
        <OutlineMesh
          key={x}
          position={[x, 0.28, -0.04]}
          scale={[0.08, 0.28, 0.12]}
          outlineWidth={0.012}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          material={toon(PALETTE.bone)}
        />
      ))}
      {[-0.68, -0.22, 0.22, 0.68].map((x, i) => (
        <OutlineMesh
          key={`upper-${x}`}
          position={[x, 0.46, -0.18]}
          rotation-z={(i % 2 ? -1 : 1) * 0.16}
          scale={[0.12, 0.36, 0.13]}
          outlineWidth={0.012}
          geometry={<coneGeometry args={[1, 1, 4]} />}
          material={toon(PALETTE.boneYellow)}
        />
      ))}
    </group>
  )
}

function PumpSeam({ position }: { position: THREE.Vector3 }) {
  return (
    <group position={position} rotation-y={-0.3}>
      <OutlineMesh
        position={[0, 0.62, 0]}
        scale={[0.75, 0.75, 0.9]}
        outlineWidth={SLURPER_PARAMS.outlines.propLargeWorld}
        geometry={<sphereGeometry args={[1, 12, 8]} />}
        material={toon(PALETTE.rust)}
      />
      <OutlineMesh
        position={[0, 1.34, 0]}
        scale={[0.42, 0.42, 0.42]}
        outlineWidth={SLURPER_PARAMS.outlines.propSmallWorld}
        geometry={<cylinderGeometry args={[0.7, 0.7, 0.2, 12]} />}
        material={toon(PALETTE.boneYellow)}
      />
      <OutlineMesh
        position={[0.64, 1.12, 0]}
        rotation-z={-0.72}
        scale={[0.12, 0.78, 0.12]}
        outlineWidth={SLURPER_PARAMS.outlines.propSmallWorld}
        geometry={<boxGeometry args={[1, 1, 1]} />}
        material={toon(PALETTE.asphaltInk)}
      />
      <OutlineMesh
        position={[-0.48, 0.7, 0.58]}
        rotation-x={Math.PI / 2}
        scale={[0.28, 0.28, 0.28]}
        outlineWidth={SLURPER_PARAMS.outlines.propSmallWorld}
        geometry={<torusGeometry args={[0.72, 0.08, 8, 14]} />}
        material={toon(PALETTE.offWhite)}
      />
    </group>
  )
}

function CrackBloom({ position }: { position: THREE.Vector3 }) {
  return (
    <group position={position}>
      {Array.from({ length: 5 }, (_, i) => {
        const angle = (i / 5) * Math.PI * 2
        return (
          <OutlineMesh
            key={i}
            position={[Math.cos(angle) * 0.24, 0.035, Math.sin(angle) * 0.2]}
            rotation-y={angle}
            scale={[0.08, 0.04, 0.72]}
            outlineWidth={0.01}
            geometry={<boxGeometry args={[1, 1, 1]} />}
            material={toon(i % 2 ? PALETTE.rust : PALETTE.outline)}
          />
        )
      })}
      <OutlineMesh
        position={[0, 0.16, 0]}
        scale={[0.28, 0.2, 0.28]}
        outlineWidth={SLURPER_PARAMS.outlines.propSmallWorld}
        geometry={<sphereGeometry args={[1, 8, 6]} />}
        material={toon(PALETTE.slimeMagenta)}
      />
    </group>
  )
}

export function RespawnProps() {
  return (
    <group>
      <SitePennant position={RESPAWN_SITES[0].position} color={PALETTE.slimeLime} rotation={0.25} />
      <SitePennant position={RESPAWN_SITES[1].position} color={PALETTE.boneYellow} rotation={-0.45} />
      <SitePennant position={RESPAWN_SITES[2].position} color={PALETTE.slimeMagenta} rotation={0.8} />
      <SitePennant position={RESPAWN_SITES[3].position} color={PALETTE.warningYellow} rotation={-0.9} />
      <SitePennant position={RESPAWN_SITES[4].position} color={PALETTE.slimeCyan} rotation={0.05} />
      <PipeSpout position={RESPAWN_SITES[0].position} />
      <FloorGrate position={RESPAWN_SITES[1].position} />
      <DrainMouth position={RESPAWN_SITES[2].position} />
      <PumpSeam position={RESPAWN_SITES[3].position} />
      <CrackBloom position={RESPAWN_SITES[4].position} />
    </group>
  )
}
