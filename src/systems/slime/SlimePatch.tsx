import * as THREE from 'three'
import { SlimeState, type SlimePiece } from './slimeTypes'

const upAxis = new THREE.Vector3(0, 0, 1)
const direction = new THREE.Vector3()
const quaternion = new THREE.Quaternion()
const scale = new THREE.Vector3()

export function composeSlimeMatrix(piece: SlimePiece, mouth: THREE.Vector3, target: THREE.Matrix4, outline = 0) {
  if (piece.state === SlimeState.Gulped) {
    target.compose(piece.position, quaternion.identity(), scale.set(0.001, 0.001, 0.001))
    return target
  }

  direction.copy(mouth).sub(piece.position)
  if (direction.lengthSq() > 0.0001 && piece.stretch > 0.05) {
    direction.normalize()
    quaternion.setFromUnitVectors(upAxis, direction)
  } else {
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), piece.phase)
  }

  const reemergeScale = piece.state === SlimeState.Reemerging ? Math.max(0.12, piece.residueLife) : 1
  const residueFlatten = piece.state === SlimeState.Residue ? 0.22 : 1
  const stretchForShape = outline > 0 && piece.state === SlimeState.Stringing ? Math.min(piece.stretch, 0.32) : piece.stretch
  const radius = piece.radius + outline
  const stretchLength = 1 + stretchForShape * 2.2
  const strandWidth = outline > 0 && piece.state === SlimeState.Stringing
    ? Math.max(0.52, piece.strandWidth)
    : Math.max(0.22, piece.strandWidth)
  scale.set(
    radius * (1.3 - stretchForShape * 0.25) * strandWidth * reemergeScale,
    radius * residueFlatten * strandWidth * reemergeScale,
    radius * stretchLength * reemergeScale,
  )
  target.compose(piece.position, quaternion, scale)
  return target
}
