import { GAME_CONFIG } from '../core/config'

export function LightingRig() {
  return (
    <>
      <ambientLight intensity={GAME_CONFIG.lighting.ambientIntensity} />
      <directionalLight position={GAME_CONFIG.lighting.keyPosition} intensity={GAME_CONFIG.lighting.keyIntensity} />
      <directionalLight position={GAME_CONFIG.lighting.fillPosition} intensity={GAME_CONFIG.lighting.fillIntensity} />
    </>
  )
}
