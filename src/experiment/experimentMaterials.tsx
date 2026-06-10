'use client'

import { type ComponentProps } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../render/OutlineMesh'

export type BagPulseMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uTime: { value: number }
    uPulse: { value: number }
    uFill: { value: number }
    uPressure: { value: number }
    uBeauty: { value: number }
    uFullPulse: { value: number }
    uWobble: { value: number }
    uSuctionActive: { value: number }
    uBase: { value: THREE.Color }
    uSlimeTint: { value: THREE.Color }
    uTintStrength: { value: number }
    uWaveColor0: { value: THREE.Color }
    uWaveColor1: { value: THREE.Color }
    uWaveColor2: { value: THREE.Color }
    uWaveColor3: { value: THREE.Color }
    uWaveAge0: { value: number }
    uWaveAge1: { value: number }
    uWaveAge2: { value: number }
    uWaveAge3: { value: number }
    uBloomCenter0: { value: THREE.Vector2 }
    uBloomCenter1: { value: THREE.Vector2 }
    uBloomCenter2: { value: THREE.Vector2 }
    uBloomCenter3: { value: THREE.Vector2 }
  }
}

export type SlimeSurfaceMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uTime: { value: number }
    uAlpha: { value: number }
    uGloss: { value: number }
    uRim: { value: number }
    uDepth: { value: number }
    uWarmth: { value: number }
    uCoolPocket: { value: THREE.Color }
    uWarmGlaze: { value: THREE.Color }
    uInnerGlow: { value: THREE.Color }
    uIridescent: { value: THREE.Color }
    uShadowInk: { value: THREE.Color }
    uActivity: { value: number }
    uPaletteDrift: { value: number }
    uOpalStrength: { value: number }
    uPocketStrength: { value: number }
    uVeinStrength: { value: number }
    uGlowStrength: { value: number }
  }
}

export const EXPERIMENT_SOFT_INK = '#17121f'
export const EXPERIMENT_DETAIL_INK = '#211827'
const EXPERIMENT_TOON_SHADOW = '#7b68be'
const EXPERIMENT_TOON_MID = '#c6a4ff'
const EXPERIMENT_TOON_LIGHT = '#fff2a6'
let experimentToonRampTexture: THREE.DataTexture | null = null

export function getExperimentToonRampTexture() {
  if (experimentToonRampTexture) return experimentToonRampTexture

  const shadow = new THREE.Color(EXPERIMENT_TOON_SHADOW)
  const mid = new THREE.Color(EXPERIMENT_TOON_MID)
  const light = new THREE.Color(EXPERIMENT_TOON_LIGHT)
  const colors = new Uint8Array([
    Math.round(shadow.r * 255), Math.round(shadow.g * 255), Math.round(shadow.b * 255), 255,
    Math.round(mid.r * 255), Math.round(mid.g * 255), Math.round(mid.b * 255), 255,
    Math.round(light.r * 255), Math.round(light.g * 255), Math.round(light.b * 255), 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  experimentToonRampTexture = texture
  return texture
}

export function ExperimentOutlineMesh({ outlineColor = EXPERIMENT_SOFT_INK, outlineWidth, ...props }: ComponentProps<typeof OutlineMesh>) {
  const inkWidth = outlineWidth === undefined
    ? 0.045
    : outlineWidth >= 0.012
      ? outlineWidth * 1.22
      : outlineWidth * 1.08
  return <OutlineMesh {...props} outlineWidth={inkWidth} outlineColor={outlineColor} />
}

const SLIME_SHADER_TONES = {
  coolPocket: '#4ef2ff',
  warmGlaze: '#ffe86a',
  innerGlow: '#c9ffd9',
  iridescent: '#ff72ee',
  shadowInk: '#8f62e8',
}
export function createBagPulseMaterial(): BagPulseMaterial {
  return new THREE.ShaderMaterial({
    transparent: false,
    depthWrite: true,
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uFill: { value: 0 },
      uPressure: { value: 0 },
      uBeauty: { value: 0 },
      uFullPulse: { value: 0 },
      uWobble: { value: 0 },
	      uSuctionActive: { value: 0 },
	      uBase: { value: new THREE.Color('#d79b76') },
	      uSlimeTint: { value: new THREE.Color('#78ffe2') },
	      uTintStrength: { value: 0 },
	      uWaveColor0: { value: new THREE.Color('#78ffe2') },
      uWaveColor1: { value: new THREE.Color('#ff79d8') },
      uWaveColor2: { value: new THREE.Color('#ffe36d') },
      uWaveColor3: { value: new THREE.Color('#9ec8ff') },
      uWaveAge0: { value: 9 },
      uWaveAge1: { value: 9 },
      uWaveAge2: { value: 9 },
      uWaveAge3: { value: 9 },
      uBloomCenter0: { value: new THREE.Vector2(-0.2, -0.12) },
      uBloomCenter1: { value: new THREE.Vector2(0.18, 0.16) },
      uBloomCenter2: { value: new THREE.Vector2(-0.04, 0.22) },
      uBloomCenter3: { value: new THREE.Vector2(0.24, -0.18) },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uFill;
      uniform float uPressure;
      uniform float uFullPulse;
      uniform float uWobble;
      varying vec3 vLocal;
      varying vec3 vNormalView;

      void main() {
        vLocal = position;
        vNormalView = normalize(normalMatrix * normal);
        vec3 shaped = position;
        float fill = clamp(uFill, 0.0, 1.65);
        float pressure = clamp(uPressure, 0.0, 2.4);
        float wobble = clamp(uWobble + uFullPulse * 0.52, 0.0, 2.35);
        float side = 1.0 - smoothstep(0.54, 1.08, abs(position.y));
        float crown = smoothstep(0.12, 0.92, position.y);
        float belly = smoothstep(-0.84, 0.24, position.y) * (1.0 - crown * 0.26);
        float lobeA = sin(position.x * 3.25 + position.y * 1.9 + uTime * 2.55) * 0.5 + 0.5;
        float lobeB = sin(position.z * 3.9 - position.y * 1.35 + uTime * 2.05 + 1.7) * 0.5 + 0.5;
        float pulseBulge = side * (pressure * 0.074 + wobble * 0.052 + uFullPulse * 0.068);
        shaped += normal * pulseBulge * (0.86 + lobeA * 0.24 + lobeB * 0.26);
        shaped.x *= 1.0 + fill * 0.055 + pressure * (0.034 + lobeA * 0.034) + uFullPulse * 0.032;
        shaped.y *= 1.0 + fill * 0.047 + pressure * (0.026 + crown * 0.045) + wobble * 0.026;
        shaped.z *= 1.0 + fill * 0.045 + pressure * (0.032 + belly * 0.04) + uFullPulse * 0.03;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(shaped, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uPulse;
      uniform float uFill;
      uniform float uPressure;
      uniform float uBeauty;
      uniform float uFullPulse;
	      uniform float uWobble;
	      uniform float uSuctionActive;
	      uniform vec3 uBase;
	      uniform vec3 uSlimeTint;
	      uniform float uTintStrength;
	      uniform vec3 uWaveColor0;
      uniform vec3 uWaveColor1;
      uniform vec3 uWaveColor2;
      uniform vec3 uWaveColor3;
      uniform float uWaveAge0;
      uniform float uWaveAge1;
      uniform float uWaveAge2;
      uniform float uWaveAge3;
      uniform vec2 uBloomCenter0;
      uniform vec2 uBloomCenter1;
      uniform vec2 uBloomCenter2;
      uniform vec2 uBloomCenter3;
      varying vec3 vLocal;
      varying vec3 vNormalView;

      vec2 rotate2(vec2 point, float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat2(c, -s, s, c) * point;
      }

      float bloomStrength(float age, vec2 flow, vec2 center, float offset) {
        float life = 3.65;
        float waveLive = step(0.0, age) * (1.0 - step(life, age));
        float progress = clamp(age / life, 0.0, 1.0);
        float arrive = smoothstep(0.0, 0.16, progress);
        float fade = 1.0 - smoothstep(0.76, 1.0, progress);
        vec2 drift = vec2(
          sin(uTime * 0.34 + offset) * 0.08 + sin(progress * 5.0 + offset * 1.3) * 0.05,
          cos(uTime * 0.29 + offset * 1.6) * 0.07 + cos(progress * 4.1 + offset) * 0.04
        );
        vec2 tide = mix(vec2(-0.18, -0.16), vec2(0.22, 0.2), smoothstep(0.05, 0.9, progress));
        vec2 origin = center + tide * 0.55 + drift * (0.45 + progress * 0.65);
        vec2 p = flow - origin;
        float twist = sin(uTime * 0.2 + offset) * 0.65 + progress * 1.1;
        p = rotate2(p, twist);
        p.x *= mix(1.45, 0.82, progress);
        p.y *= mix(0.78, 1.28, progress);
        float d = length(p);
        float edge = sin(p.x * 8.0 + p.y * 3.7 + uTime * 0.72 + offset) * 0.034;
        edge += sin(p.x * 3.2 - p.y * 7.1 - uTime * 0.48 + offset * 2.1) * 0.024;
        float spread = mix(0.06, 0.82, smoothstep(0.0, 0.86, progress));
        float core = 1.0 - smoothstep(spread * 0.14, spread * 0.68, d + edge * 0.18);
        float veil = 1.0 - smoothstep(spread * 0.68, spread + 0.46, d + edge);
        float undertow = 1.0 - smoothstep(0.24, 0.94, length(flow + center * 0.24 - drift * 0.35));
        float breathe = 0.87 + sin(progress * 6.283 + uTime * 0.42 + offset) * 0.08;
        return waveLive * arrive * fade * max(veil * breathe, max(core * 0.64, undertow * progress * 0.22));
      }

      float eventPulse(float age, float offset) {
        float life = 3.65;
        float waveLive = step(0.0, age) * (1.0 - step(life, age));
        float progress = clamp(age / life, 0.0, 1.0);
        float arrive = smoothstep(0.0, 0.18, progress);
        float fade = 1.0 - smoothstep(0.78, 1.0, progress);
        float breathe = 0.86 + sin(progress * 6.283 + uTime * 0.38 + offset) * 0.1;
        return waveLive * arrive * fade * breathe;
      }

      void main() {
        vec2 centered = vec2(vLocal.x * 0.92 + vLocal.z * 0.34, vLocal.y * 0.78 - vLocal.z * 0.18);
        float radius = length(centered);
        float inhale = uTime * (0.9 + uPulse * 0.18);
        float fillGlow = smoothstep(0.05, 0.95, uFill);
        float pressureGlow = smoothstep(0.34, 1.35, uPressure);
        float beautyGlow = smoothstep(0.12, 1.35, uBeauty);
        float fullGlow = smoothstep(0.78, 1.18, uFill) + uFullPulse * 0.58;
        float wobbleGlow = smoothstep(0.08, 1.25, uWobble);
        vec2 eddyA = vec2(sin(inhale * 0.42) * 0.22, cos(inhale * 0.31) * 0.2);
        vec2 eddyB = vec2(cos(inhale * 0.36 + 1.7) * 0.24, sin(inhale * 0.48 + 0.9) * 0.18);
        float twist = sin(radius * 4.0 - inhale * (0.68 + pressureGlow * 0.12)) * (0.36 + wobbleGlow * 0.12) + fillGlow * 0.16 + uFullPulse * 0.08;
        vec2 flowA = rotate2(centered - eddyA * 0.45, twist);
        vec2 flowB = rotate2(centered - eddyB, -twist * 0.78 + inhale * 0.16);
        float s0 = bloomStrength(uWaveAge0, flowA, uBloomCenter0, 0.4);
        float s1 = bloomStrength(uWaveAge1, flowB, uBloomCenter1, 1.9);
        float s2 = bloomStrength(uWaveAge2, flowA + flowB * 0.32, uBloomCenter2, 3.4);
        float s3 = bloomStrength(uWaveAge3, flowB - flowA * 0.22, uBloomCenter3, 5.1);
        float waveEnergy = s0 + s1 + s2 + s3;
        float e0 = eventPulse(uWaveAge0, 0.4);
        float e1 = eventPulse(uWaveAge1, 1.9);
        float e2 = eventPulse(uWaveAge2, 3.4);
        float e3 = eventPulse(uWaveAge3, 5.1);
        float eventEnergy = e0 + e1 + e2 + e3;
        vec3 spatialColor = (
          uWaveColor0 * s0
          + uWaveColor1 * s1
          + uWaveColor2 * s2
          + uWaveColor3 * s3
        ) / max(waveEnergy, 0.001);
        vec3 eventColor = (
          uWaveColor0 * e0
          + uWaveColor1 * e1
          + uWaveColor2 * e2
          + uWaveColor3 * e3
        ) / max(eventEnergy, 0.001);
        float bloomPresence = smoothstep(0.04, 1.45, waveEnergy);
        float eventPresence = smoothstep(0.02, 1.25, eventEnergy);
        vec3 waveColor = mix(eventColor, spatialColor, bloomPresence);
        float broadBand = sin(centered.y * 2.15 + flowA.x * 1.1 - inhale * 0.32);
        float slowBand = sin(flowB.y * 2.4 - flowA.x * 1.4 + inhale * 0.22);
        float glugBand = smoothstep(-0.18, 0.82, broadBand + slowBand * 0.42);
        float pearl = sin(length(flowA - flowB) * 2.6 - inhale * 0.26) * 0.5 + 0.5;
        float vein = smoothstep(0.32, 0.94, sin(flowA.x * 4.6 + flowB.y * 2.2 - inhale * 0.42) * 0.5 + 0.5);
        float contained = smoothstep(0.1, 0.92, fillGlow + beautyGlow * 0.28 + eventPresence * 0.18);
        float suctionGlow = max(smoothstep(1.04, 1.58, uPulse), smoothstep(0.12, 0.95, uSuctionActive));
        vec3 deepSyrup = mix(vec3(0.22, 0.13, 0.48), vec3(0.1, 0.46, 0.62), fillGlow);
        vec3 mintPearl = mix(vec3(0.12, 0.92, 0.72), vec3(0.28, 0.58, 1.0), pearl);
        vec3 roseGold = mix(vec3(1.0, 0.24, 0.72), vec3(1.0, 0.72, 0.18), glugBand);
        vec3 royal = mix(deepSyrup, mintPearl, 0.26 + glugBand * 0.2);
        royal = mix(royal, roseGold, (0.22 + beautyGlow * 0.32 + fullGlow * 0.16) * (0.48 + vein * 0.28));
        float ribbonA = smoothstep(0.62, 0.9, sin(centered.y * 5.4 + centered.x * 1.6 - inhale * 0.4) * 0.5 + 0.5);
        float ribbonB = smoothstep(0.55, 0.88, sin(centered.x * 3.2 - centered.y * 2.6 + inhale * 0.32 + 1.6) * 0.5 + 0.5);
        vec3 ribbonColor = mix(vec3(0.08, 0.95, 0.78), vec3(1.0, 0.22, 0.78), ribbonA);
        ribbonColor = mix(ribbonColor, vec3(1.0, 0.72, 0.16), ribbonB * 0.42);
	        float tintPresence = smoothstep(0.02, 1.38, uTintStrength) * contained;
	        vec3 slimeJewel = mix(uSlimeTint, normalize(uSlimeTint + vec3(0.16, 0.12, 0.24)), 0.2);
	        vec3 slimePearl = mix(slimeJewel, vec3(1.0) - uSlimeTint * 0.28, 0.18);
	        royal = mix(royal, slimeJewel, tintPresence * (0.52 + eventPresence * 0.2 + fillGlow * 0.12));
	        ribbonColor = mix(ribbonColor, slimePearl, tintPresence * (0.46 + pressureGlow * 0.18));
	        vec3 arrival = mix(royal, waveColor, clamp(0.3 + eventPresence * 0.2 + bloomPresence * 0.12, 0.0, 0.64));
	        arrival = mix(arrival, slimeJewel, eventPresence * (0.46 + tintPresence * 0.28));
	        vec3 color = uBase * (0.72 + fillGlow * 0.08);
	        color = mix(color, royal, contained * (0.58 + fillGlow * 0.22));
	        color = mix(color, ribbonColor, (ribbonA * 0.18 + ribbonB * 0.12) * contained * (0.62 + beautyGlow * 0.4 + fullGlow * 0.2));
	        color = mix(color, arrival, max(bloomPresence, eventPresence) * (0.22 + pressureGlow * 0.16));
	        color = mix(color, slimeJewel, tintPresence * (0.32 + fillGlow * 0.24 + pressureGlow * 0.12));
        color = mix(color, roseGold, glugBand * contained * (0.1 + beautyGlow * 0.16 + fullGlow * 0.08));
        vec3 suctionAura = mix(vec3(0.3, 0.82, 1.0), vec3(1.0, 0.38, 0.76), glugBand);
        color = mix(color, suctionAura, suctionGlow * (0.18 + pressureGlow * 0.12));
        float rim = pow(1.0 - abs(vNormalView.z), 1.55);
	        vec3 rimGold = mix(vec3(1.0, 0.66, 0.22), vec3(0.24, 0.9, 0.68), glugBand);
	        rimGold = mix(rimGold, slimePearl, tintPresence * 0.62);
        color = mix(color, rimGold, rim * (0.18 + pressureGlow * 0.12 + fullGlow * 0.08));
        color += mix(slimePearl, roseGold, glugBand) * min(0.28, beautyGlow * 0.07 + eventEnergy * 0.044 + fullGlow * 0.058 + tintPresence * 0.035);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  }) as BagPulseMaterial
}

export function createSlimeSurfaceMaterial({
  alpha = 1,
  gloss = 0.5,
  rim = 0.35,
  depth = 0.7,
  warmth = 0.22,
  depthWrite = true,
}: {
  alpha?: number
  gloss?: number
  rim?: number
  depth?: number
  warmth?: number
  depthWrite?: boolean
}) {
  return new THREE.ShaderMaterial({
    transparent: alpha < 0.999,
    depthWrite,
    vertexColors: true,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uAlpha: { value: alpha },
      uGloss: { value: gloss },
      uRim: { value: rim },
      uDepth: { value: depth },
      uWarmth: { value: warmth },
      uCoolPocket: { value: new THREE.Color(SLIME_SHADER_TONES.coolPocket) },
      uWarmGlaze: { value: new THREE.Color(SLIME_SHADER_TONES.warmGlaze) },
      uInnerGlow: { value: new THREE.Color(SLIME_SHADER_TONES.innerGlow) },
      uIridescent: { value: new THREE.Color(SLIME_SHADER_TONES.iridescent) },
      uShadowInk: { value: new THREE.Color(SLIME_SHADER_TONES.shadowInk) },
      uActivity: { value: 0 },
      uPaletteDrift: { value: 0 },
      uOpalStrength: { value: 0.3 },
      uPocketStrength: { value: 0.12 },
      uVeinStrength: { value: 0.32 },
      uGlowStrength: { value: 0.34 },
    },
    vertexShader: `
      varying vec3 vColor;
      varying vec3 vNormalWorld;
      varying vec3 vWorld;
      varying vec3 vLocal;

      void main() {
        vLocal = position;
        #ifdef USE_INSTANCING_COLOR
          vColor = instanceColor;
        #else
          vColor = vec3(0.28, 0.86, 0.84);
        #endif

        #ifdef USE_INSTANCING
          vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          vNormalWorld = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        #else
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vNormalWorld = normalize(mat3(modelMatrix) * normal);
        #endif

        vWorld = worldPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uAlpha;
      uniform float uGloss;
      uniform float uRim;
      uniform float uDepth;
      uniform float uWarmth;
      uniform vec3 uCoolPocket;
      uniform vec3 uWarmGlaze;
      uniform vec3 uInnerGlow;
      uniform vec3 uIridescent;
      uniform vec3 uShadowInk;
      uniform float uActivity;
      uniform float uPaletteDrift;
      uniform float uOpalStrength;
      uniform float uPocketStrength;
      uniform float uVeinStrength;
      uniform float uGlowStrength;

      varying vec3 vColor;
      varying vec3 vNormalWorld;
      varying vec3 vWorld;
      varying vec3 vLocal;

      float softBand(float value, float bands) {
        float stepped = floor(value * bands) / max(1.0, bands - 1.0);
        return mix(value, stepped, 0.95);
      }

      float slimeLuma(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }

      vec3 enrichColor(vec3 color, float amount) {
        float luma = slimeLuma(color);
        return mix(vec3(luma), color, 1.0 + amount);
      }

      vec3 posterize(vec3 color, float steps) {
        return floor(color * steps + 0.5) / steps;
      }

      vec3 spectrum(float value) {
        float k = fract(value);
        vec3 a = vec3(0.08, 0.78, 0.9);
        vec3 b = vec3(0.92, 0.28, 0.76);
        vec3 c = vec3(1.0, 0.78, 0.22);
        vec3 d = vec3(0.3, 0.94, 0.46);
        vec3 e = vec3(0.56, 0.42, 1.0);
        if (k < 0.2) return mix(a, b, smoothstep(0.0, 0.2, k));
        if (k < 0.4) return mix(b, c, smoothstep(0.2, 0.4, k));
        if (k < 0.6) return mix(c, d, smoothstep(0.4, 0.6, k));
        if (k < 0.8) return mix(d, e, smoothstep(0.6, 0.8, k));
        return mix(e, a, smoothstep(0.8, 1.0, k));
      }

      vec3 pastelSpectrum(float value) {
        return mix(vec3(1.0), spectrum(value), 0.74);
      }

      vec2 rotate2(vec2 point, float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat2(c, -s, s, c) * point;
      }

      void main() {
        vec3 normal = normalize(vNormalWorld);
        vec3 viewDir = normalize(cameraPosition - vWorld);
        vec3 keyDir = normalize(vec3(-0.42, 0.78, 0.48));
        vec3 fillDir = normalize(vec3(0.62, 0.34, -0.66));

        float key = dot(normal, keyDir) * 0.5 + 0.5;
        float fill = dot(normal, fillDir) * 0.5 + 0.5;
        float toon = softBand(clamp(key * 0.84 + fill * 0.16, 0.0, 1.0), 3.0);
        float shadowBand = step(0.28, key);
        float highlightBand = step(0.66, key);
        float rimLight = pow(clamp(1.0 - dot(normal, viewDir), 0.0, 1.0), 4.8);

        float activityLevel = clamp(uActivity, 0.0, 1.65);
        vec2 q = vWorld.xz * 1.35 + vec2(sin(uTime * 0.19 + vWorld.z * 0.37), cos(uTime * 0.16 + vWorld.x * 0.33)) * 0.18;
        vec2 flow = q + vec2(
          sin(q.y * 1.24 + vLocal.y * 2.1 - uTime * (0.12 + activityLevel * 0.055) + uPaletteDrift),
          cos(q.x * 0.96 - vLocal.y * 1.7 + uTime * (0.1 + activityLevel * 0.045) - uPaletteDrift * 0.7)
        ) * (0.15 + activityLevel * 0.035);
        vec2 opalFlow = rotate2(flow + vLocal.xz * 0.38, sin(uTime * 0.045 + uPaletteDrift) * 0.72 + activityLevel * 0.18);
        vec2 veinFlow = rotate2(flow * 1.18 - vLocal.xz * 0.22, cos(uTime * 0.052 + vLocal.y * 1.4) * 0.58 - activityLevel * 0.12);
        float slowCurl = sin(flow.x * 3.1 + flow.y * 1.7 - uTime * (0.28 + activityLevel * 0.1));
        slowCurl += sin(flow.x * -1.4 + flow.y * 3.8 + uTime * (0.19 + activityLevel * 0.08)) * 0.58;
        slowCurl += sin((flow.x - flow.y) * 2.25 + uTime * (0.1 + activityLevel * 0.05) + vLocal.x * 1.35) * 0.24;
        float marble = smoothstep(-0.42, 0.92, slowCurl);
        float pooled = smoothstep(0.12, 0.92, sin(length(flow + vLocal.xz * 0.46) * 5.2 - uTime * (0.22 + activityLevel * 0.08) + vLocal.y * 1.8));
        float lamella = 0.5 + 0.5 * sin(flow.x * 4.1 + sin(flow.y * 2.2 - uTime * (0.15 + activityLevel * 0.05)) * 1.15 + uTime * 0.08 + vLocal.z * 0.9);
        float combed = sin(veinFlow.x * 7.4 + sin(veinFlow.y * 2.85 - uTime * 0.13) * 1.45 + uTime * (0.09 + activityLevel * 0.12));
        float vein = smoothstep(0.62, 0.96, 0.5 + 0.5 * combed) * smoothstep(0.16, 0.86, 1.0 - abs(vLocal.y * 1.08));
        float innerFlow = smoothstep(0.2, 0.88, 1.0 - abs(vLocal.y * 1.18)) * smoothstep(0.18, 0.92, 1.0 - length(vLocal.xz) * 0.42);
        vec2 riverFlow = rotate2(
          flow * 1.55 + vec2(sin(uTime * 0.08 + vLocal.z * 1.1), cos(uTime * 0.07 + vLocal.x * 1.3)) * 0.16,
          uPaletteDrift * 2.7 + activityLevel * 0.22
        );
        float riverWave = sin(riverFlow.x * 5.7 + sin(riverFlow.y * 4.2 - uTime * 0.16) * 1.65 + uTime * (0.16 + activityLevel * 0.12) + uPaletteDrift * 3.2);
        float paintRiver = smoothstep(0.46, 0.94, 0.5 + 0.5 * riverWave) * innerFlow;
        float paintRiverCore = smoothstep(0.72, 0.985, 0.5 + 0.5 * riverWave) * innerFlow;
        float cellPool = smoothstep(
          0.54,
          0.96,
          0.5 + 0.5 * sin(length(riverFlow + vec2(vLocal.y * 0.42, -vLocal.x * 0.28)) * 8.4 - uTime * 0.18 + uPaletteDrift * 2.1)
        ) * innerFlow;
        float braid = abs(sin(veinFlow.x * 9.4 + sin(veinFlow.y * 5.0 - uTime * 0.18) * 1.2 + uPaletteDrift * 2.8));
        float capillaryVein = (1.0 - smoothstep(0.045, 0.19, braid)) * innerFlow * smoothstep(0.12, 0.92, 1.0 - abs(vLocal.y * 1.05));
        float pigmentRibbon = smoothstep(
          0.2,
          0.9,
          0.5 + 0.5 * sin(opalFlow.x * 2.6 + sin(opalFlow.y * 2.35 - uTime * 0.095) * 1.35 + uPaletteDrift * 1.9)
        );
        float opal = smoothstep(
          -0.55,
          0.92,
          sin(opalFlow.x * 2.0 - opalFlow.y * 1.28 + uTime * (0.07 + activityLevel * 0.05) + uPaletteDrift)
            + sin((opalFlow.x + opalFlow.y) * 1.42 - uTime * 0.045) * 0.52
        );
        float depthPool = smoothstep(
          0.48,
          0.96,
          0.5 + 0.5 * sin(length(opalFlow + vec2(vLocal.y * 0.32, -vLocal.x * 0.2)) * 4.8 - uTime * 0.1 + uPaletteDrift * 1.7)
        );
        float waxPocket = smoothstep(0.58, 0.96, max(lamella, depthPool * 0.82)) * (1.0 - rimLight * 0.42);

        vec3 base = vColor;
        float highColor = max(max(base.r, base.g), base.b);
        float lowColor = min(min(base.r, base.g), base.b);
        float colorEnergy = clamp((highColor - lowColor) * 1.42 + (slimeLuma(base) - 0.32) * 0.72, 0.0, 1.0);
        vec3 deep = base * vec3(0.86, 0.92, 1.08) + vec3(0.04, 0.03, 0.08);
        vec3 warmFilm = mix(uWarmGlaze, vec3(1.0, 0.7, 0.96), marble * 0.72 + vein * 0.28);
        vec3 coolFilm = mix(vec3(0.58, 1.0, 0.96), uCoolPocket, pooled * 0.62 + waxPocket * 0.28);
        vec3 opalColor = mix(mix(uInnerGlow, base * 1.26, 0.34), uIridescent, opal * 0.58 + rimLight * 0.18);
        vec3 veinColor = mix(warmFilm, mix(base * 1.32, vec3(1.0, 0.95, 0.64), 0.24), 0.58);
        vec3 ribbonColor = mix(mix(warmFilm, coolFilm, 0.42), mix(opalColor, base * 1.2, 0.38), pigmentRibbon * 0.58 + activityLevel * 0.08);
        vec3 riverColor = pastelSpectrum(
          uPaletteDrift * 0.42 + vWorld.x * 0.075 - vWorld.z * 0.055 + marble * 0.055 + pooled * 0.04 + activityLevel * 0.02
        );
        vec3 cellColor = pastelSpectrum(
          uPaletteDrift * 0.35 + length(vWorld.xz) * 0.09 + cellPool * 0.12 + opal * 0.05 + 0.28
        );
        vec3 capillaryColor = pastelSpectrum(
          uPaletteDrift * 0.5 + veinFlow.x * 0.045 + veinFlow.y * 0.025 + 0.58
        );
        vec3 bandShadow = mix(uShadowInk, base * 0.72 + vec3(0.08, 0.04, 0.13), 0.46);
        vec3 bandMid = base * (0.86 + toon * 0.2) + vec3(0.02, 0.015, 0.04);
        vec3 bandLit = mix(base * 1.14, mix(riverColor, vec3(1.0, 0.94, 0.58), 0.32), 0.14 + colorEnergy * 0.12);
        vec3 bandedLight = mix(bandShadow, bandMid, shadowBand);
        bandedLight = mix(bandedLight, bandLit, highlightBand * 0.72);
        vec3 color = mix(deep, bandedLight, 0.82);
        color = mix(color, coolFilm, pooled * (0.026 + colorEnergy * 0.014 + activityLevel * 0.008) * uDepth);
        color = mix(color, warmFilm, marble * (0.022 + uWarmth * 0.016 + activityLevel * 0.006) * (uWarmth + uDepth));
        color = mix(color, mix(uShadowInk, uCoolPocket, 0.24), waxPocket * (0.12 + uPocketStrength * 0.1) * uDepth);
        color = mix(color, ribbonColor, pigmentRibbon * innerFlow * (0.024 + uOpalStrength * 0.032 + activityLevel * 0.01) * uDepth);
        color = mix(color, opalColor, innerFlow * (0.02 + colorEnergy * 0.028 + uOpalStrength * 0.046 + activityLevel * 0.01) * uDepth);
        color = mix(color, veinColor, vein * innerFlow * (0.028 + uVeinStrength * 0.052 + activityLevel * 0.014));
        color = mix(color, riverColor, paintRiver * (0.05 + uOpalStrength * 0.068 + activityLevel * 0.018) * uDepth);
        color = mix(color, cellColor, cellPool * (0.034 + uOpalStrength * 0.044 + colorEnergy * 0.02) * uDepth);
        color = mix(color, capillaryColor, capillaryVein * (0.09 + uVeinStrength * 0.1 + activityLevel * 0.018));

        vec3 halfDir = normalize(keyDir + viewDir);
        float wetSpec = step(0.78, max(dot(normal, halfDir), 0.0)) * uGloss;
        float broadSheen = step(0.62, marble + pooled * 0.45) * step(0.34, dot(normal, viewDir));
        color += mix(vec3(1.0, 0.92, 0.58), riverColor, 0.42) * wetSpec * (0.058 + activityLevel * 0.014);
        color += mix(coolFilm, warmFilm, 0.36) * broadSheen * (0.036 + colorEnergy * 0.014 + uGlowStrength * 0.012) * uGloss;
        color = mix(color, uIridescent, rimLight * uRim * (0.026 + pooled * 0.014 + opal * 0.018 + colorEnergy * 0.01));
        color = mix(color, mix(vec3(0.98, 1.0, 0.88), riverColor, 0.48), rimLight * uRim * (0.056 + pooled * 0.028 + activityLevel * 0.014));

        float centerDepth = smoothstep(-0.38, 0.62, vLocal.y) * (1.0 - rimLight * 0.35);
        color = mix(color, base * 1.08, centerDepth * 0.07 * uDepth);
        color += opalColor * innerFlow * smoothstep(0.52, 0.94, opal) * (0.014 + uGlowStrength * 0.022 + activityLevel * 0.008);
        color += riverColor * paintRiverCore * (0.018 + uGlowStrength * 0.026 + activityLevel * 0.008);
        color += capillaryColor * capillaryVein * (0.014 + uGlowStrength * 0.014);
        float chalkHighlight = smoothstep(0.82, 1.08, slimeLuma(color)) * innerFlow;
        color = mix(color, mix(riverColor, cellColor, 0.34), chalkHighlight * (0.22 + uOpalStrength * 0.08));
        color = enrichColor(color, 0.14 + colorEnergy * 0.16 + activityLevel * 0.022);
        color = clamp(posterize(clamp(color, 0.0, 1.12), 5.0), 0.0, 1.0);
        gl_FragColor = vec4(color, uAlpha);
      }
    `,
  }) as SlimeSurfaceMaterial
}

export function updateSlimeSurfaceUniforms(
  material: SlimeSurfaceMaterial,
  t: number,
  activity: number,
  opal: number,
  pocket: number,
  vein: number,
  drift: number,
) {
  material.uniforms.uTime.value = t
  material.uniforms.uActivity.value = activity
  material.uniforms.uPaletteDrift.value = drift
  material.uniforms.uOpalStrength.value = opal
  material.uniforms.uPocketStrength.value = pocket
  material.uniforms.uVeinStrength.value = vein
  material.uniforms.uGlowStrength.value = Math.min(1.15, 0.22 + activity * 0.38 + opal * 0.24)
}

export function setBasicInstancedOpacity(mesh: THREE.InstancedMesh, opacity: number) {
  const material = mesh.material
  if (!Array.isArray(material) && material instanceof THREE.MeshBasicMaterial) {
    material.opacity = opacity
  }
}

export function syncInstancedOutlineMatrices(outline: THREE.InstancedMesh, source: THREE.InstancedMesh) {
  outline.instanceMatrix.copy(source.instanceMatrix)
  outline.count = source.count
  outline.instanceMatrix.needsUpdate = true
}

export function toon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getExperimentToonRampTexture()} />
}

export function createInstancedInkOutlineMaterial(width: number, opacity = 0.96) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uWidth: { value: width },
      uColor: { value: new THREE.Color(EXPERIMENT_SOFT_INK) },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      uniform float uWidth;

      void main() {
        vec3 expanded = position + normalize(normal) * uWidth;

        #ifdef USE_INSTANCING
          vec4 worldPosition = modelMatrix * instanceMatrix * vec4(expanded, 1.0);
        #else
          vec4 worldPosition = modelMatrix * vec4(expanded, 1.0);
        #endif

        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;

      void main() {
        gl_FragColor = vec4(uColor, uOpacity);
      }
    `,
    side: THREE.BackSide,
    transparent: opacity < 1,
    depthWrite: false,
  })
}
