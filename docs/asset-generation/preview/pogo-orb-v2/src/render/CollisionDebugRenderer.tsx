import type { LevelData } from "../world/levelTypes"
import type { PlayerDebugSnapshot } from "../game/playerState"
import { getDebugMaterial } from "../assets/DebugMaterials"
import { boundsCenterTuple, boundsSizeTuple, boundsYawRadians } from "../utils/renderBounds"
import type { DebugToggles } from "./debugTypes"
import { useMemo } from "react"
import * as THREE from "three"

interface CollisionDebugRendererProps {
  level: LevelData
  debug: DebugToggles
  playerDebug?: PlayerDebugSnapshot
}

export function CollisionDebugRenderer({ level, debug, playerDebug }: CollisionDebugRendererProps) {
  return (
    <group name={`debug-${level.id}`}>
      {debug.showWalkableSurfaces
        ? level.walkableSurfaces.map((surface) => {
            const size: [number, number, number] = surface.size
              ? [surface.size.x, 0.035, surface.size.z]
              : [surface.radius ? surface.radius * 2 : 1, 0.035, surface.radius ? surface.radius * 2 : 1]

            return (
              <mesh
                key={surface.id}
                name={`debug-surface-${surface.id}`}
                position={[surface.center.x, surface.y + 0.04, surface.center.z]}
                rotation={[0, surface.yawRadians ?? 0, 0]}
                material={getDebugMaterial(surface.debug.color, 0.42)}
              >
                <boxGeometry args={size} />
              </mesh>
            )
          })
        : null}

      {debug.showCollisionVolumes
        ? level.collisionVolumes.map((volume) => {
            const size: [number, number, number] = volume.size
              ? [volume.size.x, volume.size.y, volume.size.z]
              : [volume.radius ? volume.radius * 2 : 1, volume.height ?? 1, volume.radius ? volume.radius * 2 : 1]

            return (
              <mesh
                key={volume.id}
                name={`debug-volume-${volume.id}`}
                position={[volume.center.x, volume.center.y, volume.center.z]}
                rotation={[0, volume.yawRadians ?? 0, 0]}
                material={getDebugMaterial(volume.debug.color, 0.28)}
              >
                <boxGeometry args={size} />
              </mesh>
            )
          })
        : null}

      {debug.showTransitions
        ? level.worldTransitions.map((transition) => (
            <mesh
              key={transition.id}
              name={`debug-transition-${transition.id}`}
              position={boundsCenterTuple(transition.trigger.bounds)}
              rotation={[0, boundsYawRadians(transition.trigger.bounds), 0]}
              material={getDebugMaterial(transition.debug.color, 0.22)}
            >
              <boxGeometry args={boundsSizeTuple(transition.trigger.bounds)} />
            </mesh>
          ))
        : null}

      {debug.showWaterZones
        ? level.waterZones.map((water) => (
            <mesh
              key={water.id}
              name={`debug-water-${water.id}`}
              position={boundsCenterTuple(water.bounds)}
              rotation={[0, boundsYawRadians(water.bounds), 0]}
              material={getDebugMaterial(water.debug.color, 0.25)}
            >
              <boxGeometry args={boundsSizeTuple(water.bounds)} />
            </mesh>
          ))
        : null}

      {debug.showCameraZones
        ? level.cameraZones.map((zone) => (
            <mesh
              key={zone.id}
              name={`debug-camera-${zone.id}`}
              position={boundsCenterTuple(zone.bounds)}
              rotation={[0, boundsYawRadians(zone.bounds), 0]}
              material={getDebugMaterial(zone.debug.color, 0.12)}
            >
              <boxGeometry args={boundsSizeTuple(zone.bounds)} />
            </mesh>
          ))
        : null}

      {debug.showSurfaceNormals
        ? level.walkableSurfaces.map((surface) => (
            <NormalArrow
              key={`normal-${surface.id}`}
              name={`debug-normal-${surface.id}`}
              origin={[surface.center.x, surface.y + 0.14, surface.center.z]}
              normal={[surface.normal.x, surface.normal.y, surface.normal.z]}
              color={surface.debug.color}
              length={0.85}
            />
          ))
        : null}

      {debug.showSurfaceNormals
        ? level.slopes.map((slope) => {
            const origin: [number, number, number] = [
              (slope.start.x + slope.end.x) * 0.5,
              (slope.start.y + slope.end.y) * 0.5 + 0.18,
              (slope.start.z + slope.end.z) * 0.5,
            ]
            const normal = getSlopeDebugNormal(slope.start, slope.end)

            return (
              <NormalArrow
                key={`normal-${slope.id}`}
                name={`debug-normal-${slope.id}`}
                origin={origin}
                normal={[normal.x, normal.y, normal.z]}
                color={slope.debug.color}
                length={1}
              />
            )
          })
        : null}

      {debug.showSpawnPoints
        ? level.spawnPoints.map((spawn) => (
            <mesh
              key={spawn.id}
              name={`debug-spawn-${spawn.id}`}
              position={[spawn.position.x, spawn.position.y + 0.35, spawn.position.z]}
              material={getDebugMaterial(spawn.debug.color, 0.9)}
            >
              <sphereGeometry args={[0.28, 16, 12]} />
            </mesh>
          ))
        : null}

      {debug.showPlayerCollider && playerDebug ? (
        <mesh
          name="debug-player-collider"
          position={[playerDebug.position.x, playerDebug.position.y, playerDebug.position.z]}
          material={getDebugMaterial("#ffffff", 0.18)}
        >
          <sphereGeometry args={[playerDebug.radius, 24, 16]} />
        </mesh>
      ) : null}

      {debug.showContactPoints && playerDebug
        ? playerDebug.contacts.map((contact) => (
            <mesh
              key={contact.id}
              name={`debug-contact-${contact.id}`}
              position={[contact.point.x, contact.point.y + 0.04, contact.point.z]}
              material={getDebugMaterial(contact.kind === "ground" ? "#55ff8a" : "#ff6b6b", 0.9)}
            >
              <sphereGeometry args={[0.14, 12, 8]} />
            </mesh>
          ))
        : null}
    </group>
  )
}

function NormalArrow({
  name,
  origin,
  normal,
  color,
  length,
}: {
  name: string
  origin: [number, number, number]
  normal: [number, number, number]
  color: string
  length: number
}) {
  const arrow = useMemo(() => {
    const direction = new THREE.Vector3(...normal).normalize()
    const start = new THREE.Vector3(...origin)
    return new THREE.ArrowHelper(direction, start, length, color, length * 0.3, length * 0.18)
  }, [color, length, normal, origin])

  arrow.name = name
  return <primitive object={arrow} />
}

function getSlopeDebugNormal(start: { x: number; y: number; z: number }, end: { x: number; y: number; z: number }) {
  const slopeVector = new THREE.Vector3(end.x - start.x, end.y - start.y, end.z - start.z).normalize()
  const horizontal = new THREE.Vector3(end.x - start.x, 0, end.z - start.z).normalize()
  const side = new THREE.Vector3(-horizontal.z, 0, horizontal.x).normalize()
  const normal = new THREE.Vector3().crossVectors(side, slopeVector).normalize()

  if (normal.y < 0) normal.multiplyScalar(-1)
  return { x: normal.x, y: normal.y, z: normal.z }
}
