import * as THREE from 'three'
import { SLIME_FAMILIES } from '../core/palettes'

export type SlimeMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uTime: { value: number }
    uMouthPosition: { value: THREE.Vector3 }
    uSuction: { value: number }
    uPalette0: { value: THREE.Color }
    uPalette1: { value: THREE.Color }
    uPalette2: { value: THREE.Color }
    uPalette3: { value: THREE.Color }
    uPalette4: { value: THREE.Color }
  }
}

export function createSlimeMaterial(paletteIndex = 0): SlimeMaterial {
  const palette = SLIME_FAMILIES[paletteIndex % SLIME_FAMILIES.length]

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMouthPosition: { value: new THREE.Vector3() },
      uSuction: { value: 0 },
      uPalette0: { value: new THREE.Color(palette[0]) },
      uPalette1: { value: new THREE.Color(palette[1]) },
      uPalette2: { value: new THREE.Color(palette[2]) },
      uPalette3: { value: new THREE.Color(palette[3]) },
      uPalette4: { value: new THREE.Color(palette[4]) },
    },
    vertexShader: `
      attribute float aPhase;
      attribute float aVitality;
      attribute float aState;
      attribute float aStretch;
      attribute float aResidueLife;
      attribute float aPalette;

      uniform float uTime;
      uniform vec3 uMouthPosition;
      uniform float uSuction;

      varying vec3 vWorldPosition;
      varying float vBandSeed;
      varying float vState;
      varying float vResidueLife;
      varying float vPalette;

      void main() {
        vec3 transformed = position;
        vec4 rawWorld = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vec3 toMouth = normalize(uMouthPosition - rawWorld.xyz);
        float breath = sin(uTime * (1.6 + aVitality) + aPhase) * 0.035 * (1.0 - aResidueLife);
        transformed += normal * breath;
        transformed += toMouth * aStretch * uSuction * 0.22;
        transformed -= normal * aStretch * uSuction * 0.04;

        vec4 world = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        vWorldPosition = world.xyz;
        vBandSeed = aPhase + aVitality * 1.7;
        vState = aState;
        vResidueLife = aResidueLife;
        vPalette = aPalette;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uMouthPosition;
      uniform vec3 uPalette0;
      uniform vec3 uPalette1;
      uniform vec3 uPalette2;
      uniform vec3 uPalette3;
      uniform vec3 uPalette4;

      varying vec3 vWorldPosition;
      varying float vBandSeed;
      varying float vState;
      varying float vResidueLife;
      varying float vPalette;

      vec3 paletteLookup(float band) {
        float idx = floor(clamp(band, 0.0, 0.999) * 5.0);
        if (idx < 1.0) return uPalette0;
        if (idx < 2.0) return uPalette1;
        if (idx < 3.0) return uPalette2;
        if (idx < 4.0) return uPalette3;
        return uPalette4;
      }

      void main() {
        float mouthRing = length(vWorldPosition.xz - uMouthPosition.xz);
        float contour = floor(fract(mouthRing * 7.5 - uTime * 1.35 + vBandSeed) * 5.0) / 4.0;
        float vertical = floor(clamp(vWorldPosition.y * 1.8 + 0.45, 0.0, 0.999) * 3.0) / 2.0;
        float stateBump = step(1.5, vState) * 0.12 + step(2.5, vState) * 0.1;
        float paletteOffset = fract(vPalette * 0.19) * 0.16;
        vec3 color = paletteLookup(clamp(contour * 0.68 + vertical * 0.28 + stateBump + paletteOffset, 0.0, 1.0));
        color = mix(color, vec3(0.08, 0.07, 0.08), clamp(vResidueLife * 0.45, 0.0, 0.55));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  }) as SlimeMaterial
}
