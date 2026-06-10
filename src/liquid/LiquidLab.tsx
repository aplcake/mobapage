'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

type MapUniforms = {
  uTime: { value: number }
  uAspect: { value: number }
}

type SlimeUnionUniforms = {
  uTime: { value: number }
  uAspect: { value: number }
  uBlobData: { value: THREE.Vector4[] }
  uBlobMeta: { value: THREE.Vector4[] }
  uBlobState: { value: THREE.Vector4[] }
}

type ContactShadowUniforms = {
  uTime: { value: number }
  uAspect: { value: number }
  uBlobData: { value: THREE.Vector4[] }
  uBlobMeta: { value: THREE.Vector4[] }
  uBlobState: { value: THREE.Vector4[] }
}

type TrailUniforms = {
  uTime: { value: number }
  uAspect: { value: number }
  uTrailData: { value: THREE.Vector4[] }
  uTrailMeta: { value: THREE.Vector4[] }
}

type MapMaterial = THREE.ShaderMaterial & {
  uniforms: MapUniforms
}

type SlimeUnionMaterial = THREE.ShaderMaterial & {
  uniforms: SlimeUnionUniforms
}

type ContactShadowMaterial = THREE.ShaderMaterial & {
  uniforms: ContactShadowUniforms
}

type TrailMaterial = THREE.ShaderMaterial & {
  uniforms: TrailUniforms
}

type SlimeBlobConfig = {
  id: string
  x: number
  y: number
  sx: number
  sy: number
  seed: number
  palette: number
  flow: number
  breath: number
}

declare global {
  interface Window {
    __LIQUID_LAB_STATS__?: {
      mode: string
      slimeOnly: boolean
      gameplayRemoved: boolean
      vacuumMounted: boolean
      techniques: string[]
      palette: string
      blobCount?: number
      mapPlane?: string
      textureMode?: string
      interiorMode?: string
      overlayMode?: string
      translucencyMode?: string
      boundaryMotion?: string
      motionMode?: string
      mergeMode?: string
      renderModel?: string
      organicModel?: string
      shadowModel?: string
      growthModel?: string
      performanceMode?: string
      qualityMode?: string
      dpr?: number
      geometryBudget?: {
        map: [number, number]
        slime: [number, number]
        shadow: [number, number]
        trail: [number, number]
        trailCount: number
        trailEnabled: boolean
      }
      perf?: {
        fps: number
        frameMs: number
        maxFrameMs: number
      }
    }
  }
}

const SLIME_BLOBS: SlimeBlobConfig[] = [
  { id: 'lagoon', x: -0.62, y: 0.42, sx: 0.46, sy: 0.31, seed: 1.17, palette: 0.02, flow: 0.82, breath: 0.92 },
  { id: 'reef', x: -0.08, y: 0.48, sx: 0.38, sy: 0.29, seed: 3.81, palette: 0.21, flow: 1.12, breath: 0.72 },
  { id: 'comet', x: 0.55, y: 0.34, sx: 0.52, sy: 0.31, seed: 5.32, palette: 0.42, flow: 0.68, breath: 1.04 },
  { id: 'bloom', x: -0.48, y: -0.06, sx: 0.42, sy: 0.37, seed: 7.49, palette: 0.61, flow: 1.28, breath: 0.66 },
  { id: 'ribbon', x: 0.22, y: -0.08, sx: 0.58, sy: 0.34, seed: 9.06, palette: 0.78, flow: 0.94, breath: 1.18 },
  { id: 'ember', x: 0.66, y: -0.32, sx: 0.4, sy: 0.34, seed: 11.64, palette: 0.35, flow: 1.38, breath: 0.84 },
  { id: 'deepwell', x: -0.15, y: -0.48, sx: 0.5, sy: 0.32, seed: 13.27, palette: 0.91, flow: 0.76, breath: 1.3 },
]

const MERGE_GROUPS = [0, 0, 1, 2, 1, 2, 2]
const MERGE_OFFSETS = [
  new THREE.Vector2(-0.22, -0.01),
  new THREE.Vector2(0.2, 0.03),
  new THREE.Vector2(0.25, 0.04),
  new THREE.Vector2(-0.25, 0.06),
  new THREE.Vector2(-0.08, -0.03),
  new THREE.Vector2(0.28, 0.02),
  new THREE.Vector2(0.01, -0.22),
]
const SLIME_ANCHORS = [
  { x: -0.48, y: 0.18, phase: 0.15, drift: 0.12 },
  { x: 0.08, y: 0.02, phase: 1.85, drift: 0.1 },
  { x: 0.5, y: -0.18, phase: 3.35, drift: 0.13 },
]
const SLIME_ANCHOR_OFFSETS = [
  new THREE.Vector2(-0.16, 0.06),
  new THREE.Vector2(0.16, -0.02),
  new THREE.Vector2(-0.12, 0.04),
  new THREE.Vector2(0.14, -0.04),
  new THREE.Vector2(0.14, 0.05),
  new THREE.Vector2(-0.14, -0.02),
  new THREE.Vector2(0.02, 0.12),
]

const TRAIL_DELAYS = [0.18, 0.42, 0.72]
const TRAIL_COUNT = 10
const STAGE_FILL = 1.22
const LIQUID_QUALITY = {
  dpr: 0.65,
  mapSegments: [1, 1] as [number, number],
  slimeSegments: [56, 36] as [number, number],
  shadowSegments: [1, 1] as [number, number],
  trailSegments: [1, 1] as [number, number],
  trailEnabled: false,
}

type BlobMotion = {
  x: number
  y: number
  life: number
  merge: number
  scale: number
  stretch: number
  strain: number
  velocityX: number
  velocityY: number
}

type BlobRuntime = {
  x: number
  y: number
  radiusX: number
  radiusY: number
  merge: number
  scale: number
  stretch: number
  strain: number
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function mix(a: number, b: number, value: number) {
  return a + (b - a) * value
}

function computeBlobRuntime(config: SlimeBlobConfig, index: number, time: number, aspect: number): BlobRuntime {
  const motion = getBlobMotion(config, index, time)
  const lumpyMass = Math.sin(time * (0.41 + config.flow * 0.035) + config.seed * 2.1) * 0.5 +
    Math.sin(time * (0.73 + config.breath * 0.04) - config.seed * 0.8) * 0.28
  const gravitySpread = 1 + (1 - motion.merge) * 0.028 + Math.sin(time * 0.077 + config.seed) * 0.012 + lumpyMass * 0.012
  const adhesionWidth = 1 + motion.merge * 0.08 + motion.strain * 0.07
  const speed = Math.hypot(motion.velocityX * aspect, motion.velocityY)
  const horizontalDrag = Math.abs(motion.velocityX) / Math.max(0.001, Math.abs(motion.velocityX) + Math.abs(motion.velocityY))
  const verticalDrag = 1 - horizontalDrag
  const stickyStrain = motion.strain * (1.06 + speed * 1.85)
  const jellyPhase = time * (2.85 + config.breath * 0.34 + config.flow * 0.12) + config.seed * 1.37 + lumpyMass * 0.5
  const jellyEnergy = 0.034 + stickyStrain * 0.07 + motion.merge * 0.012
  const mucusRecoil = (
    Math.sin(jellyPhase) * 0.62 +
    Math.sin(jellyPhase * 1.47 + config.seed) * 0.31 +
    Math.sin(jellyPhase * 2.31 - config.seed * 0.4) * 0.16
  ) * jellyEnergy
  const jellySwayX = Math.sin(jellyPhase * 0.72 + config.seed * 0.5) * stickyStrain * 0.034 + lumpyMass * 0.014
  const jellySwayY = Math.cos(jellyPhase * 0.8 - config.seed * 0.3) * stickyStrain * 0.028 - Math.abs(lumpyMass) * 0.01
  const mucusStretchX = 1 - motion.stretch * 0.015 + motion.merge * 0.03 + horizontalDrag * stickyStrain * 0.16 - verticalDrag * stickyStrain * 0.03 + lumpyMass * 0.018
  const mucusStretchY = 1 + motion.stretch * 0.04 + motion.merge * 0.07 + verticalDrag * stickyStrain * 0.1 - horizontalDrag * stickyStrain * 0.045 - Math.abs(lumpyMass) * 0.016
  const narrowViewportFit = mix(0.7, 1, smoothstep(0.7, 1.35, aspect))
  const contactSag = config.sy * motion.scale * (0.024 + stickyStrain * 0.018 + (1 - motion.merge) * 0.006)

  return {
    x: (motion.x - motion.velocityX * 0.3 + jellySwayX) * aspect * 0.76,
    y: (motion.y - motion.velocityY * 0.24 + jellySwayY) * 0.72 - contactSag,
    radiusX: config.sx * motion.scale * (0.7 + motion.merge * 0.025) * gravitySpread * adhesionWidth * mucusStretchX * narrowViewportFit * (1 + mucusRecoil * 0.66),
    radiusY: config.sy * motion.scale * (0.74 + motion.merge * 0.025) * mucusStretchY * narrowViewportFit / gravitySpread * (1 - mucusRecoil * 0.42),
    merge: motion.merge,
    scale: motion.scale,
    stretch: motion.stretch,
    strain: motion.strain,
  }
}

function getSlimePathMotion(config: SlimeBlobConfig, index: number, time: number): BlobMotion {
  const group = MERGE_GROUPS[index] ?? 0
  const anchor = SLIME_ANCHORS[group] ?? SLIME_ANCHORS[0]
  const offset = SLIME_ANCHOR_OFFSETS[index] ?? new THREE.Vector2()
  const slowPhase = time * (0.021 + config.breath * 0.007) + config.seed * 0.73
  const dragPhase = time * (0.088 + config.flow * 0.009) + config.seed * 1.4 + Math.sin(slowPhase * 0.7) * 0.75
  const rawRelease = 0.5 + 0.5 * Math.sin(dragPhase)
  const crawlPulse = smoothstep(0.58, 0.96, rawRelease)
  const snapPulse = Math.pow(crawlPulse, 2.35)
  const stuck = 1 - crawlPulse
  const slipJitter = Math.sin(dragPhase * 2.17 + config.seed * 0.3) * 0.5 + Math.sin(dragPhase * 3.11 - config.seed) * 0.24
  const cycle = (time * (0.011 + config.flow * 0.0014) + config.seed * 0.041 + group * 0.13 + Math.sin(slowPhase * 0.42) * 0.035) % 1
  const mergeWindow = smoothstep(0.18, 0.42, cycle) * (1 - smoothstep(0.58, 0.87, cycle))
  const merge = Math.min(1, mergeWindow * (0.78 + snapPulse * 0.12 + stuck * 0.06 + Math.sin(time * 0.071 + config.seed) * 0.04))

  const baseX = mix(config.x * 0.72, anchor.x + offset.x, 0.58)
  const baseY = mix(config.y * 0.62, anchor.y + offset.y, 0.56)
  const crawlX =
    baseX +
    Math.sin(slowPhase + index * 0.7) * anchor.drift * 0.72 +
    Math.sin(slowPhase * 1.83 + config.seed * 0.6) * 0.075 +
    snapPulse * (0.105 + config.flow * 0.012) * Math.sin(config.seed + index * 0.9 + slipJitter) -
    stuck * Math.sin(config.seed * 0.7 + group) * 0.028
  const crawlY =
    baseY +
    Math.sin(slowPhase * 1.17 + config.seed * 1.2) * 0.16 +
    Math.sin(slowPhase * 0.47 - config.seed) * 0.095 -
    stuck * (0.038 + config.sy * 0.035) +
    snapPulse * Math.cos(config.seed * 0.8 + index + slipJitter) * 0.055

  const meetY = anchor.y + Math.sin(time * (0.022 + group * 0.003) + anchor.phase) * 0.17 + Math.sin(slowPhase * 0.81 + group) * 0.055
  const meetX = anchor.x + Math.sin(time * 0.019 + anchor.phase) * 0.09 + Math.sin(slowPhase * 1.1 + config.seed) * 0.045
  const targetOffset = MERGE_OFFSETS[index] ?? new THREE.Vector2()
  const target = new THREE.Vector2(meetX + targetOffset.x * 0.58, meetY + targetOffset.y * 0.72)

  const pull = merge * (0.54 + snapPulse * 0.16 + stuck * 0.08 + Math.sin(time * 0.19 + config.seed) * 0.035)
  const x = mix(crawlX, target.x, pull)
  const y = mix(crawlY, target.y, pull)
  const life = 1
  const inhale = Math.sin(time * 0.15 * config.breath + config.seed) * 0.044
  const slowSwell = Math.sin(time * 0.047 + config.seed * 1.8) * 0.038
  const stickyCompression = stuck * 0.048 + Math.abs(slipJitter) * 0.01
  const mergeSwell = merge * 0.045
  const stretch = Math.min(1, snapPulse * 0.38 + merge * 0.26 + stuck * 0.16 + Math.abs(slipJitter) * 0.08)
  const scale = 1.0 + inhale + slowSwell + mergeSwell + stickyCompression

  return {
    x: Math.max(-0.94, Math.min(0.94, x)),
    y: Math.max(-0.76, Math.min(0.76, y)),
    life,
    merge,
    scale: Math.max(0.9, Math.min(1.14, scale)),
    stretch,
    strain: 0,
    velocityX: 0,
    velocityY: 0,
  }
}

function getBlobMotion(config: SlimeBlobConfig, index: number, time: number): BlobMotion {
  const lag = 0.62 + config.flow * 0.14
  const now = getSlimePathMotion(config, index, time)
  const near = getSlimePathMotion(config, index, time - lag)
  const far = getSlimePathMotion(config, index, time - lag * 2.35)
  const velocityX = now.x - near.x
  const velocityY = now.y - near.y
  const speed = Math.hypot(velocityX, velocityY)
  const mergeStrain = Math.abs(now.merge - near.merge) * 1.55
  const strain = clamp01(speed * 5.8 + mergeStrain + now.merge * 0.18)
  const recoil = Math.sin(time * (0.47 + config.breath * 0.024) + config.seed) * strain
  const jellyPhase = time * (3.1 + config.flow * 0.2) + config.seed * 1.2
  const lumpyRecoil = (
    Math.sin(jellyPhase) * 0.58 +
    Math.sin(jellyPhase * 1.63 + config.seed * 0.5) * 0.34 +
    Math.sin(jellyPhase * 2.41 - config.seed) * 0.16
  ) * strain
  const anchorDrag = Math.sin(time * (0.19 + config.flow * 0.018) + config.seed * 2.3) * strain

  return {
    x: now.x * 0.54 + near.x * 0.31 + far.x * 0.15 + velocityX * recoil * 0.27 + lumpyRecoil * 0.026 + anchorDrag * 0.014,
    y: now.y * 0.52 + near.y * 0.32 + far.y * 0.16 + velocityY * recoil * 0.2 + Math.cos(jellyPhase * 0.82 + config.seed) * strain * 0.024 - Math.abs(anchorDrag) * 0.008,
    life: now.life,
    merge: now.merge * 0.62 + near.merge * 0.27 + far.merge * 0.11,
    scale: Math.max(0.88, Math.min(1.21, now.scale + strain * 0.058 - recoil * 0.012 + lumpyRecoil * 0.018)),
    stretch: clamp01(now.stretch * 0.48 + strain * 0.72 + now.merge * 0.09 + Math.abs(lumpyRecoil) * 0.12),
    strain,
    velocityX,
    velocityY,
  }
}

function syncBlobRuntimeUniforms(uniforms: SlimeUnionUniforms | ContactShadowUniforms, viewport: { width: number; height: number }, time: number) {
  const aspect = viewport.width / Math.max(viewport.height, 0.001)
  uniforms.uTime.value = time
  uniforms.uAspect.value = aspect

  SLIME_BLOBS.forEach((config, index) => {
    const runtime = computeBlobRuntime(config, index, time, aspect)
    const data = uniforms.uBlobData.value[index]
    const meta = uniforms.uBlobMeta.value[index]
    const state = uniforms.uBlobState.value[index]

    data.set(runtime.x, runtime.y, runtime.radiusX, runtime.radiusY)
    meta.set(config.seed, config.palette, config.flow, config.breath)
    state.set(runtime.merge, runtime.scale, runtime.strain, runtime.stretch)
  })
}

function syncTrailUniforms(uniforms: TrailUniforms, viewport: { width: number; height: number }, time: number) {
  const aspect = viewport.width / Math.max(viewport.height, 0.001)
  uniforms.uTime.value = time
  uniforms.uAspect.value = aspect

  SLIME_BLOBS.forEach((config, blobIndex) => {
    TRAIL_DELAYS.forEach((delay, stepIndex) => {
      const trailIndex = blobIndex * TRAIL_DELAYS.length + stepIndex
      const runtime = computeBlobRuntime(config, blobIndex, time - delay, aspect)
      const data = uniforms.uTrailData.value[trailIndex]
      const meta = uniforms.uTrailMeta.value[trailIndex]
      const age = (stepIndex + 1) / TRAIL_DELAYS.length

      data.set(runtime.x, runtime.y - runtime.radiusY * 0.035, runtime.radiusX * (0.28 + age * 0.04), runtime.radiusY * (0.22 + age * 0.03))
      meta.set(config.palette, 1 - age * 0.26, config.seed, config.flow)
    })
  })
}

function createMapMaterial(): MapMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1 },
    },
    vertexShader: `
      uniform float uAspect;
      varying vec2 vUv;
      varying vec2 vWorld;

      void main() {
        vUv = uv;
        vWorld = vec2((uv.x * 2.0 - 1.0) * uAspect, uv.y * 2.0 - 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform float uTime;
      varying vec2 vWorld;

      float hash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 74.7);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float f = 0.0;
        float a = 0.52;
        for (int i = 0; i < 4; i++) {
          f += noise(p) * a;
          p = mat2(1.36, 1.04, -1.04, 1.36) * p + 0.21;
          a *= 0.52;
        }
        return f;
      }

      vec3 technicolour(float t) {
        vec3 a = vec3(0.07, 0.62, 0.78);
        vec3 b = vec3(0.82, 0.16, 0.56);
        vec3 c = vec3(0.95, 0.76, 0.18);
        vec3 d = vec3(0.25, 0.70, 0.30);
        vec3 e = vec3(0.36, 0.22, 0.78);
        float k = fract(t);
        if (k < 0.2) return mix(a, b, smoothstep(0.0, 0.2, k));
        if (k < 0.4) return mix(b, c, smoothstep(0.2, 0.4, k));
        if (k < 0.6) return mix(c, d, smoothstep(0.4, 0.6, k));
        if (k < 0.8) return mix(d, e, smoothstep(0.6, 0.8, k));
        return mix(e, a, smoothstep(0.8, 1.0, k));
      }

      float lineField(vec2 p, float y, float wobble, float width) {
        float curve = y + sin(p.x * 1.55 + wobble) * 0.13 + sin(p.x * 3.0 - wobble * 0.4) * 0.045;
        return 1.0 - smoothstep(width, width + 0.03, abs(p.y - curve));
      }

      float ring(vec2 p, vec2 c, float r, float w) {
        return 1.0 - smoothstep(w, w + 0.018, abs(length(p - c) - r));
      }

      float disc(vec2 p, vec2 c, float r) {
        return 1.0 - smoothstep(r, r + 0.08, length(p - c));
      }

      void main() {
        vec2 p = vWorld;
        float t = uTime;
        float grain = fbm(p * 1.7 + vec2(t * 0.012, -t * 0.01));
        float broadGrain = fbm(p * 0.62 + vec2(-t * 0.004, t * 0.003));
        float stoneWash = fbm(p * 3.4 + vec2(t * 0.006, -t * 0.005));
        vec3 soilA = vec3(0.105, 0.076, 0.18);
        vec3 soilB = vec3(0.34, 0.25, 0.43);
        vec3 color = mix(soilA, soilB, smoothstep(0.12, 0.96, grain * 0.7 + broadGrain * 0.3));
        color = mix(color, vec3(0.18, 0.12, 0.27), smoothstep(0.2, 0.86, stoneWash) * 0.08);

        float basin = smoothstep(1.78, 0.25, length(p * vec2(0.72, 1.05)));
        float basinDepth = smoothstep(0.18, 0.92, basin) * (0.78 + broadGrain * 0.22);
        color = mix(color, vec3(0.34, 0.25, 0.45), basinDepth * 0.36);
        color += technicolour(0.18 + broadGrain * 0.16 + t * 0.003) * basinDepth * 0.012;

        float roadA = lineField(p, 0.34, t * 0.06, 0.065);
        float roadB = lineField(p, -0.19, 1.9 - t * 0.05, 0.055);
        float roadC = 1.0 - smoothstep(0.05, 0.09, abs(p.x + sin(p.y * 2.1 + 0.7) * 0.12));
        float road = max(max(roadA, roadB), roadC * 0.72);
        float roadShadowA = lineField(p + vec2(-0.022, -0.03), 0.34, t * 0.06, 0.082);
        float roadShadowB = lineField(p + vec2(-0.018, -0.024), -0.19, 1.9 - t * 0.05, 0.074);
        float roadShadowC = 1.0 - smoothstep(0.066, 0.12, abs((p.x - 0.026) + sin((p.y + 0.03) * 2.1 + 0.7) * 0.12));
        float roadShadow = max(max(roadShadowA, roadShadowB), roadShadowC * 0.58) * (1.0 - road * 0.42);
        color = mix(color, vec3(0.075, 0.055, 0.13), roadShadow * 0.18);
        color = mix(color, vec3(0.49, 0.405, 0.525), road * 0.28);
        color += technicolour(0.52 + grain * 0.12 + t * 0.006) * road * 0.02;
        color += vec3(0.12, 0.09, 0.16) * road * (1.0 - smoothstep(0.44, 0.92, stoneWash)) * 0.06;

        vec2 c1 = vec2(-0.72, 0.48);
        vec2 c2 = vec2(0.78, 0.34);
        vec2 c3 = vec2(0.32, -0.54);
        vec2 c4 = vec2(-0.32, -0.54);
        float pool = 0.0;
        pool = max(pool, disc(p, c1, 0.36));
        pool = max(pool, disc(p, c2, 0.42));
        pool = max(pool, disc(p, c3, 0.31));
        pool = max(pool, disc(p, c4, 0.39));
        color = mix(color, vec3(0.19, 0.13, 0.28), pool * 0.16);
        float landmark = 0.0;
        landmark = max(landmark, ring(p, c1, 0.23, 0.018));
        landmark = max(landmark, ring(p, c2, 0.28, 0.018));
        landmark = max(landmark, ring(p, c3, 0.19, 0.015));
        landmark = max(landmark, ring(p, c4, 0.25, 0.018));
        float landmarkShadow = 0.0;
        landmarkShadow = max(landmarkShadow, ring(p + vec2(-0.026, -0.028), c1, 0.23, 0.026));
        landmarkShadow = max(landmarkShadow, ring(p + vec2(-0.026, -0.028), c2, 0.28, 0.026));
        landmarkShadow = max(landmarkShadow, ring(p + vec2(-0.022, -0.026), c3, 0.19, 0.023));
        landmarkShadow = max(landmarkShadow, ring(p + vec2(-0.024, -0.026), c4, 0.25, 0.026));
        float landmarkHighlight = 0.0;
        landmarkHighlight = max(landmarkHighlight, ring(p + vec2(0.018, 0.019), c1, 0.23, 0.012));
        landmarkHighlight = max(landmarkHighlight, ring(p + vec2(0.018, 0.019), c2, 0.28, 0.012));
        landmarkHighlight = max(landmarkHighlight, ring(p + vec2(0.016, 0.017), c3, 0.19, 0.01));
        landmarkHighlight = max(landmarkHighlight, ring(p + vec2(0.017, 0.018), c4, 0.25, 0.012));
        float core = 0.0;
        core = max(core, 1.0 - smoothstep(0.07, 0.09, length(p - c1)));
        core = max(core, 1.0 - smoothstep(0.06, 0.08, length(p - c2)));
        core = max(core, 1.0 - smoothstep(0.055, 0.075, length(p - c3)));
        core = max(core, 1.0 - smoothstep(0.06, 0.08, length(p - c4)));
        color = mix(color, vec3(0.07, 0.045, 0.13), landmarkShadow * 0.22);
        color = mix(color, vec3(0.25, 0.18, 0.36), landmark * 0.32);
        color += technicolour(0.14 + grain * 0.2 + t * 0.01) * (landmark * 0.14 + core * 0.075);
        color += vec3(0.54, 0.45, 0.62) * landmarkHighlight * 0.045;

        float contour = step(0.985, fract((grain + length(p * vec2(0.76, 1.05)) * 0.18) * 9.0)) * 0.045;
        float contourSoft = contour * (0.62 + broadGrain * 0.38);
        color = mix(color, color + technicolour(0.58 + grain * 0.08 + t * 0.004) * 0.028, contourSoft);

        float stageGlow = smoothstep(1.95, 0.12, length(p * vec2(0.54, 0.86)));
        color += technicolour(0.72 + broadGrain * 0.08 + t * 0.002) * stageGlow * 0.01;

        float vignette = smoothstep(1.95, 0.42, length(p * vec2(0.62, 0.96)));
        color *= 0.66 + vignette * 0.4;
        color = mix(color, vec3(0.055, 0.04, 0.095), smoothstep(1.78, 2.22, length(p * vec2(0.6, 0.92))) * 0.18);
        gl_FragColor = vec4(pow(color, vec3(0.94)), 1.0);
      }
    `,
  }) as MapMaterial
}

// Kept as a reversible high-detail shader path; the default runtime uses the fast material below.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createSlimeUnionMaterial(): SlimeUnionMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    alphaTest: 0.05,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uBlobData: { value: SLIME_BLOBS.map(() => new THREE.Vector4()) },
      uBlobMeta: { value: SLIME_BLOBS.map((blob) => new THREE.Vector4(blob.seed, blob.palette, blob.flow, blob.breath)) },
      uBlobState: { value: SLIME_BLOBS.map(() => new THREE.Vector4()) },
    },
    vertexShader: `
      #define BLOB_COUNT 7

      uniform float uTime;
      uniform float uAspect;
      uniform vec4 uBlobData[BLOB_COUNT];
      uniform vec4 uBlobMeta[BLOB_COUNT];
      uniform vec4 uBlobState[BLOB_COUNT];
      varying vec2 vUv;
      varying vec2 vWorld;
      varying float vLift;

      float hash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 74.7);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float f = 0.0;
        float a = 0.56;
        for (int i = 0; i < 3; i++) {
          f += noise(p) * a;
          p = mat2(1.38, 1.08, -1.08, 1.38) * p + 0.17;
          a *= 0.52;
        }
        return f;
      }

      vec2 rotate2(vec2 p, float a) {
        float s = sin(a);
        float c = cos(a);
        return mat2(c, -s, s, c) * p;
      }

      float smoothMax(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(a, b, h) + k * h * (1.0 - h);
      }

      vec2 lobeCenter(float index, float t, vec4 meta) {
        float seed = meta.x;
        float breath = meta.w;
        float phase = seed * 1.73 + index * 2.41;
        float orbit = 0.22 + sin(phase) * 0.06;
        vec2 anchor = vec2(cos(phase) * orbit, sin(phase * 1.17) * orbit * 0.66);
        vec2 creep = vec2(
          sin(t * (0.052 + index * 0.006) * breath + phase * 1.4) * 0.065,
          cos(t * (0.047 + index * 0.005) * breath + phase * 0.9) * 0.044
        );
        vec2 lean = vec2(sin(seed * 0.31) * 0.075, cos(seed * 0.29) * 0.038);
        return anchor + creep + lean;
      }

      float pseudopodField(vec2 p, float t, vec4 meta) {
        float seed = meta.x;
        float flow = meta.z;
        float field = 0.0;
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          float phase = seed * 1.19 + fi * 2.18;
          float steer = sin(t * (0.028 + fi * 0.006) * flow + seed + fi) * 0.22;
          vec2 dir = normalize(vec2(cos(phase + steer), sin(phase * 1.31 - steer * 0.7)));
          float along = dot(p, dir);
          float side = abs(dot(p, vec2(-dir.y, dir.x)));
          float lengthPulse = 0.3 + sin(t * (0.045 + fi * 0.008) * flow + seed * 0.7 + fi) * 0.035;
          float root = smoothstep(0.12, 0.34, along);
          float tip = 1.0 - smoothstep(lengthPulse, lengthPulse + 0.16, along);
          float taper = mix(0.22, 0.13, clamp((along - 0.12) / max(lengthPulse - 0.12, 0.01), 0.0, 1.0));
          float tube = 1.0 - smoothstep(taper, taper + 0.075, side);
          field += root * tip * tube * (0.024 + fi * 0.004);
        }
        return field;
      }

      vec2 organicBlobSpace(vec2 p, float t, vec4 meta, vec4 state) {
        float seed = meta.x;
        float flow = meta.z;
        float breath = meta.w;
        float stretch = state.w;
        float strain = state.z;
        float angle = atan(p.y, p.x);
        float radius = length(p * vec2(0.86, 1.04));
        float edge = smoothstep(0.16, 1.14, radius);
        float radialWobble =
          sin(angle * 2.0 + t * 0.095 * breath + seed) * 0.078 +
          sin(angle * 3.0 - t * 0.066 * flow + seed * 1.7) * 0.05 +
          sin(angle * 5.0 + radius * 1.9 + seed * 0.6) * 0.026;
        vec2 q = p * (1.0 - radialWobble * edge);
        q.x += sin(q.y * (1.08 + strain * 0.24) + seed + t * 0.018 * flow) * (0.045 + strain * 0.014);
        q.y += sin(q.x * (0.92 + stretch * 0.22) - seed * 1.3 - t * 0.015 * breath) * (0.032 + strain * 0.012);
        q += vec2(
          noise(q * 2.1 + vec2(seed, t * 0.012)) - 0.5,
          noise(q * 2.0 + vec2(-seed * 0.6, -t * 0.011)) - 0.5
        ) * (0.026 + strain * 0.014) * edge;
        return q;
      }

      vec2 organicLobeSpace(vec2 d, float index, float t, vec4 meta, vec4 state) {
        float seed = meta.x;
        float flow = meta.z;
        float strain = state.z;
        float angle = atan(d.y, d.x);
        float radius = length(d);
        float edge = smoothstep(0.04, 0.42, radius);
        d.x += sin(d.y * (1.45 + index * 0.17) + seed + index * 1.3 + t * 0.017 * flow) * (0.046 + strain * 0.012) * edge;
        d.y += sin(d.x * (1.18 + index * 0.13) - seed * 0.9 - t * 0.014) * (0.034 + strain * 0.01) * edge;
        float shoulderBreak = 1.0 +
          sin(angle * 3.0 + seed + index) * 0.054 +
          sin(angle * 5.0 - seed * 0.7 + t * 0.018 * flow) * 0.026;
        return d * shoulderBreak;
      }

      float jellySurfacePulse(vec2 p, float t, vec4 meta, vec4 state) {
        float seed = meta.x;
        float flow = meta.z;
        float breath = meta.w;
        float strain = state.z;
        float stretch = state.w;
        float merge = state.x;
        float angle = atan(p.y, p.x);
        float radius = length(p * vec2(0.9, 1.06));
        float softBody = smoothstep(0.08, 1.04, radius) * (1.0 - smoothstep(1.05, 1.36, radius));
        float mucusNoise = fbm(p * vec2(1.35, 1.08) + vec2(t * 0.04 * flow, -t * 0.027) + seed) - 0.5;
        float primary = sin(t * (2.85 + breath * 0.4) + seed + angle * 0.9 + mucusNoise * 2.4);
        float secondary = sin(t * (4.05 + flow * 0.28) + seed * 1.7 - angle * 2.8 + radius * 1.7);
        float delayed = sin(t * (1.35 + breath * 0.22) - seed * 0.4 + p.x * 1.4 - p.y * 0.82 + mucusNoise * 1.8);
        float tackyKick = smoothstep(0.24, 0.84, abs(mucusNoise)) * sin(t * (5.4 + flow * 0.22) + seed + radius * 2.1);
        return (primary * 0.022 + secondary * 0.018 + delayed * 0.012 + mucusNoise * 0.026 + tackyKick * 0.009) * (0.5 + strain * 1.55 + stretch * 0.34 + merge * 0.22) * softBody;
      }

      float blobFieldLocal(vec2 p, float t, vec4 meta, vec4 state) {
        float seed = meta.x;
        float flow = meta.z;
        float breath = meta.w;
        float stretch = state.w;
        float strain = state.z;
        vec2 q = organicBlobSpace(p, t, meta, state);
        float jelly = jellySurfacePulse(p, t, meta, state);
        float mucusLump = (fbm(q * 1.32 + vec2(t * 0.052 * flow, -t * 0.039) + seed * 1.4) - 0.5) * (0.09 + strain * 0.05);
        vec2 coreRadius = vec2(0.8 + strain * 0.075 - stretch * 0.015 + jelly * 0.22 + mucusLump * 0.32, 0.6 + stretch * 0.075 + strain * 0.055 - jelly * 0.13 - abs(mucusLump) * 0.12);
        float coreBias = 1.0 + sin(atan(q.y, q.x) * 2.0 + seed + t * 0.045 * breath) * 0.08 + mucusLump * 0.28;
        float raw = exp(-dot((q * coreBias) / coreRadius, (q * coreBias) / coreRadius) * 1.42) * 0.86;
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          vec2 c = lobeCenter(fi, t, meta);
          float pulse = sin(t * (0.15 + fi * 0.018) * breath + seed + fi) * 0.5 + 0.5;
          vec2 radius = vec2(0.42 + pulse * 0.05 + fi * 0.012, 0.32 + pulse * 0.04 + stretch * 0.034);
          vec2 d = rotate2(q - c, sin(seed + fi * 1.4) * 0.55 + t * 0.009 * flow);
          d = organicLobeSpace(d, fi, t, meta, state);
          raw += exp(-dot(d / radius, d / radius) * 1.48) * (0.6 + pulse * 0.13);
        }
        float cap = exp(-dot((q - vec2(0.0, 0.18 + stretch * 0.08)) / vec2(0.62, 0.28 + stretch * 0.05), (q - vec2(0.0, 0.18 + stretch * 0.08)) / vec2(0.62, 0.28 + stretch * 0.05)) * 1.92);
        float tail = exp(-dot((q + vec2(0.0, 0.22 + stretch * 0.05)) / vec2(0.42, 0.36 + stretch * 0.08), (q + vec2(0.0, 0.22 + stretch * 0.05)) / vec2(0.42, 0.36 + stretch * 0.08)) * 1.76);
        raw += (cap * 0.11 + tail * 0.024) * stretch;
        float angle = atan(q.y, q.x);
        float boundaryWave = sin(angle * 2.0 + t * 0.12 * breath + seed) * 0.034;
        boundaryWave += sin(angle * 3.0 - t * 0.09 * flow + seed * 1.7) * 0.02;
        boundaryWave += sin(angle + t * 0.075 * breath + seed * 0.6) * (0.01 + strain * 0.018);
        boundaryWave += jelly * 1.08 + mucusLump * 0.16;
        float footprint = 1.0 - smoothstep(0.32, 1.16, length(q * vec2(0.72, 1.18)));
        float lowerMass = (1.0 - smoothstep(-0.82, -0.1, q.y)) * footprint;
        float groundedFoot = lowerMass * 0.04;
        float stickySlump = lowerMass * strain * 0.04 + lowerMass * abs(mucusLump) * 0.018;
        float beadZone = smoothstep(0.62, 1.02, length(q * vec2(0.82, 1.05))) * (1.0 - smoothstep(1.02, 1.26, length(q * vec2(0.82, 1.05))));
        float beadNoise = smoothstep(0.78, 0.96, noise(vec2(cos(angle) * 2.6 + seed * 0.3, sin(angle) * 2.6 + t * 0.014)));
        float rimBeads = beadZone * beadNoise * (0.028 + strain * 0.014);
        return raw / (0.9 + raw * 0.33) + boundaryWave + groundedFoot + stickySlump + rimBeads + pseudopodField(q, t, meta) * (0.016 + strain * 0.01) + state.x * 0.055;
      }

      float segmentDistance(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a;
        vec2 ba = b - a;
        float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
        return length(pa - ba * h);
      }

      float bridgeField(vec2 p, vec4 a, vec4 b, vec4 stateA, vec4 stateB) {
        float mergeLife = max(stateA.x, stateB.x);
        float centerDistance = length(a.xy - b.xy);
        float reach = (a.z + b.z) * 0.66;
        float close = 1.0 - smoothstep(reach * 0.62, reach * 0.98, centerDistance);
        vec2 ba = b.xy - a.xy;
        float h = clamp(dot(p - a.xy, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
        vec2 normal = normalize(vec2(-ba.y, ba.x) + vec2(0.0001));
        float strain = max(stateA.z, stateB.z);
        float tackNoise = fbm(mix(a.xy, b.xy, h) * 2.1 + vec2(uTime * 0.05, -uTime * 0.032)) - 0.5;
        float slackWave = sin(h * 6.28318 + a.x * 2.4 - b.y * 1.9 + uTime * 0.16) * 0.026;
        slackWave += sin(h * 12.56636 - a.y * 1.7 + b.x * 2.1 - uTime * 0.11) * 0.012;
        float sag = sin(h * 3.14159) * (sin((a.x + b.y) * 3.1 + uTime * 0.19 + tackNoise) * 0.092 + slackWave + strain * 0.032);
        vec2 center = mix(a.xy, b.xy, h) + normal * sag;
        float waist = sin(h * 3.14159);
        float neckPulse = 0.92 + tackNoise * 0.18 + sin(h * 6.28318 + uTime * 0.13 + a.x - b.y) * 0.075;
        float pinchedWaist = pow(max(waist, 0.0), 0.78);
        float width = mix(0.022, min(min(a.z, a.w), min(b.z, b.w)) * (0.24 + pinchedWaist * 0.27 + strain * 0.036) * neckPulse, mergeLife);
        vec2 middleCenter = mix(a.xy, b.xy, 0.5) + normal * sin((a.x + b.y) * 3.1 + uTime * 0.19) * (0.066 + strain * 0.018);
        float middleBulb = 1.0 - smoothstep(width * 0.88, width * 0.88 + 0.105, length(p - middleCenter));
        vec2 sideBulbA = mix(a.xy, b.xy, 0.31) + normal * (sag * 0.6 + 0.04 + tackNoise * 0.014);
        vec2 sideBulbB = mix(a.xy, b.xy, 0.69) - normal * (sag * 0.52 + 0.035 - tackNoise * 0.014);
        float lobeA = 1.0 - smoothstep(width * 0.62, width * 0.62 + 0.1, length(p - sideBulbA));
        float lobeB = 1.0 - smoothstep(width * 0.6, width * 0.6 + 0.096, length(p - sideBulbB));
        float knotNoise = fbm(center * 3.6 + vec2(uTime * 0.034, -uTime * 0.025)) - 0.5;
        float antiTube = 0.74 + 0.2 * sin(h * 18.84954 + uTime * 0.17 + a.x - b.y) + knotNoise * 0.18;
        float neckGate = smoothstep(0.12, 0.34, h) * (1.0 - smoothstep(0.66, 0.88, h));
        float stringer = (1.0 - smoothstep(width * 0.16 * antiTube, width * 0.16 * antiTube + 0.07, length(p - center))) * waist * neckGate;
        float knot = (1.0 - smoothstep(width * 0.46, width * 0.46 + 0.08, length(p - (center + normal * knotNoise * 0.055)))) * neckGate;
        return max(max(middleBulb * 0.42, max(lobeA, lobeB) * 0.24), max(knot * 0.06, stringer * (0.014 + strain * 0.01))) * close * mergeLife;
      }

      float unionField(vec2 p, float t) {
        float field = 0.0;
        for (int i = 0; i < BLOB_COUNT; i++) {
          vec4 data = uBlobData[i];
          vec2 local = (p - data.xy) / max(data.zw, vec2(0.001));
          float blob = blobFieldLocal(local, t, uBlobMeta[i], uBlobState[i]);
          field = smoothMax(field, blob, 0.2 + uBlobState[i].x * 0.075);
        }
        field = smoothMax(field, bridgeField(p, uBlobData[0], uBlobData[1], uBlobState[0], uBlobState[1]), 0.2);
        field = smoothMax(field, bridgeField(p, uBlobData[2], uBlobData[4], uBlobState[2], uBlobState[4]), 0.2);
        field = smoothMax(field, bridgeField(p, uBlobData[3], uBlobData[4], uBlobState[3], uBlobState[4]), 0.2);
        field = smoothMax(field, bridgeField(p, uBlobData[3], uBlobData[6], uBlobState[3], uBlobState[6]), 0.2);
        field = smoothMax(field, bridgeField(p, uBlobData[5], uBlobData[6], uBlobState[5], uBlobState[6]), 0.2);
        return field;
      }

      void main() {
        vUv = uv;
        vWorld = vec2((uv.x * 2.0 - 1.0) * uAspect, uv.y * 2.0 - 1.0);
        vec3 p = position;
        float field = unionField(vWorld, uTime);
        float body = smoothstep(0.48, 0.64, field);
        float rim = smoothstep(0.33, 0.44, field) - smoothstep(0.58, 0.74, field);
        float tide = noise(vWorld * 5.6 + vec2(uTime * 0.035, -uTime * 0.025)) - 0.5;
        float jellyLift = (
          sin(uTime * 2.4 + vWorld.x * 2.6 - vWorld.y * 1.2) * 0.0045 +
          sin(uTime * 3.35 - vWorld.x * 1.8 + vWorld.y * 2.2) * 0.0028
        ) * body;
        vLift = body * 0.026 + rim * 0.048 + tide * body * 0.008 + jellyLift;
        p.z += vLift;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      #define BLOB_COUNT 7

      precision highp float;

      uniform float uTime;
      uniform float uAspect;
      uniform vec4 uBlobData[BLOB_COUNT];
      uniform vec4 uBlobMeta[BLOB_COUNT];
      uniform vec4 uBlobState[BLOB_COUNT];

      varying vec2 vWorld;
      varying float vLift;

      float hash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 74.7);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float f = 0.0;
        float a = 0.56;
        for (int i = 0; i < 3; i++) {
          f += noise(p) * a;
          p = mat2(1.38, 1.08, -1.08, 1.38) * p + 0.17;
          a *= 0.52;
        }
        return f;
      }

      vec2 rotate2(vec2 p, float a) {
        float s = sin(a);
        float c = cos(a);
        return mat2(c, -s, s, c) * p;
      }

      vec2 swirl(vec2 p, vec2 c, float strength) {
        vec2 d = p - c;
        float r = length(d);
        float a = strength * exp(-r * 1.7);
        return c + rotate2(d, a);
      }

      vec3 technicolour(float t) {
        float k = fract(t);
        vec3 base = vec3(
          0.58 + 0.35 * cos(6.28318 * (k + 0.04)),
          0.57 + 0.33 * cos(6.28318 * (k - 0.28)),
          0.62 + 0.32 * cos(6.28318 * (k - 0.52))
        );
        vec3 lilt = vec3(
          0.1 * sin(12.56636 * (k + 0.16)),
          0.08 * sin(12.56636 * (k + 0.38)),
          0.09 * sin(12.56636 * (k + 0.61))
        );
        vec3 warm = vec3(0.96, 0.62, 0.16);
        vec3 cool = vec3(0.06, 0.72, 0.92);
        float glaze = smoothstep(0.18, 0.82, 0.5 + 0.5 * sin(6.28318 * (k + 0.11)));
        return clamp(mix(base + lilt, mix(cool, warm, glaze), 0.18), 0.035, 0.98);
      }

      float smoothMax(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(a, b, h) + k * h * (1.0 - h);
      }

      vec2 lobeCenter(float index, float t, vec4 meta) {
        float seed = meta.x;
        float breath = meta.w;
        float phase = seed * 1.73 + index * 2.41;
        float orbit = 0.22 + sin(phase) * 0.06;
        vec2 anchor = vec2(cos(phase) * orbit, sin(phase * 1.17) * orbit * 0.66);
        vec2 creep = vec2(
          sin(t * (0.052 + index * 0.006) * breath + phase * 1.4) * 0.065,
          cos(t * (0.047 + index * 0.005) * breath + phase * 0.9) * 0.044
        );
        vec2 lean = vec2(sin(seed * 0.31) * 0.075, cos(seed * 0.29) * 0.038);
        return anchor + creep + lean;
      }

      float pseudopodField(vec2 p, float t, vec4 meta) {
        float seed = meta.x;
        float flow = meta.z;
        float field = 0.0;
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          float phase = seed * 1.19 + fi * 2.18;
          float steer = sin(t * (0.028 + fi * 0.006) * flow + seed + fi) * 0.22;
          vec2 dir = normalize(vec2(cos(phase + steer), sin(phase * 1.31 - steer * 0.7)));
          float along = dot(p, dir);
          float side = abs(dot(p, vec2(-dir.y, dir.x)));
          float lengthPulse = 0.3 + sin(t * (0.045 + fi * 0.008) * flow + seed * 0.7 + fi) * 0.035;
          float root = smoothstep(0.12, 0.34, along);
          float tip = 1.0 - smoothstep(lengthPulse, lengthPulse + 0.16, along);
          float taper = mix(0.22, 0.13, clamp((along - 0.12) / max(lengthPulse - 0.12, 0.01), 0.0, 1.0));
          float tube = 1.0 - smoothstep(taper, taper + 0.075, side);
          field += root * tip * tube * (0.024 + fi * 0.004);
        }
        return field;
      }

      vec2 organicBlobSpace(vec2 p, float t, vec4 meta, vec4 state) {
        float seed = meta.x;
        float flow = meta.z;
        float breath = meta.w;
        float stretch = state.w;
        float strain = state.z;
        float angle = atan(p.y, p.x);
        float radius = length(p * vec2(0.86, 1.04));
        float edge = smoothstep(0.16, 1.14, radius);
        float radialWobble =
          sin(angle * 2.0 + t * 0.095 * breath + seed) * 0.078 +
          sin(angle * 3.0 - t * 0.066 * flow + seed * 1.7) * 0.05 +
          sin(angle * 5.0 + radius * 1.9 + seed * 0.6) * 0.026;
        vec2 q = p * (1.0 - radialWobble * edge);
        q.x += sin(q.y * (1.08 + strain * 0.24) + seed + t * 0.018 * flow) * (0.045 + strain * 0.014);
        q.y += sin(q.x * (0.92 + stretch * 0.22) - seed * 1.3 - t * 0.015 * breath) * (0.032 + strain * 0.012);
        q += vec2(
          noise(q * 2.1 + vec2(seed, t * 0.012)) - 0.5,
          noise(q * 2.0 + vec2(-seed * 0.6, -t * 0.011)) - 0.5
        ) * (0.026 + strain * 0.014) * edge;
        return q;
      }

      vec2 organicLobeSpace(vec2 d, float index, float t, vec4 meta, vec4 state) {
        float seed = meta.x;
        float flow = meta.z;
        float strain = state.z;
        float angle = atan(d.y, d.x);
        float radius = length(d);
        float edge = smoothstep(0.04, 0.42, radius);
        d.x += sin(d.y * (1.45 + index * 0.17) + seed + index * 1.3 + t * 0.017 * flow) * (0.046 + strain * 0.012) * edge;
        d.y += sin(d.x * (1.18 + index * 0.13) - seed * 0.9 - t * 0.014) * (0.034 + strain * 0.01) * edge;
        float shoulderBreak = 1.0 +
          sin(angle * 3.0 + seed + index) * 0.054 +
          sin(angle * 5.0 - seed * 0.7 + t * 0.018 * flow) * 0.026;
        return d * shoulderBreak;
      }

      float jellySurfacePulse(vec2 p, float t, vec4 meta, vec4 state) {
        float seed = meta.x;
        float flow = meta.z;
        float breath = meta.w;
        float strain = state.z;
        float stretch = state.w;
        float merge = state.x;
        float angle = atan(p.y, p.x);
        float radius = length(p * vec2(0.9, 1.06));
        float softBody = smoothstep(0.08, 1.04, radius) * (1.0 - smoothstep(1.05, 1.36, radius));
        float mucusNoise = fbm(p * vec2(1.35, 1.08) + vec2(t * 0.04 * flow, -t * 0.027) + seed) - 0.5;
        float primary = sin(t * (2.85 + breath * 0.4) + seed + angle * 0.9 + mucusNoise * 2.4);
        float secondary = sin(t * (4.05 + flow * 0.28) + seed * 1.7 - angle * 2.8 + radius * 1.7);
        float delayed = sin(t * (1.35 + breath * 0.22) - seed * 0.4 + p.x * 1.4 - p.y * 0.82 + mucusNoise * 1.8);
        float tackyKick = smoothstep(0.24, 0.84, abs(mucusNoise)) * sin(t * (5.4 + flow * 0.22) + seed + radius * 2.1);
        return (primary * 0.022 + secondary * 0.018 + delayed * 0.012 + mucusNoise * 0.026 + tackyKick * 0.009) * (0.5 + strain * 1.55 + stretch * 0.34 + merge * 0.22) * softBody;
      }

      float blobFieldLocal(vec2 p, float t, vec4 meta, vec4 state) {
        float seed = meta.x;
        float flow = meta.z;
        float breath = meta.w;
        float stretch = state.w;
        float strain = state.z;
        vec2 q = organicBlobSpace(p, t, meta, state);
        float jelly = jellySurfacePulse(p, t, meta, state);
        float mucusLump = (fbm(q * 1.32 + vec2(t * 0.052 * flow, -t * 0.039) + seed * 1.4) - 0.5) * (0.09 + strain * 0.05);
        vec2 coreRadius = vec2(0.8 + strain * 0.075 - stretch * 0.015 + jelly * 0.22 + mucusLump * 0.32, 0.6 + stretch * 0.075 + strain * 0.055 - jelly * 0.13 - abs(mucusLump) * 0.12);
        float coreBias = 1.0 + sin(atan(q.y, q.x) * 2.0 + seed + t * 0.045 * breath) * 0.08 + mucusLump * 0.28;
        float raw = exp(-dot((q * coreBias) / coreRadius, (q * coreBias) / coreRadius) * 1.42) * 0.86;
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          vec2 c = lobeCenter(fi, t, meta);
          float pulse = sin(t * (0.15 + fi * 0.018) * breath + seed + fi) * 0.5 + 0.5;
          vec2 radius = vec2(0.42 + pulse * 0.05 + fi * 0.012, 0.32 + pulse * 0.04 + stretch * 0.034);
          vec2 d = rotate2(q - c, sin(seed + fi * 1.4) * 0.55 + t * 0.009 * flow);
          d = organicLobeSpace(d, fi, t, meta, state);
          raw += exp(-dot(d / radius, d / radius) * 1.48) * (0.6 + pulse * 0.13);
        }
        float cap = exp(-dot((q - vec2(0.0, 0.18 + stretch * 0.08)) / vec2(0.62, 0.28 + stretch * 0.05), (q - vec2(0.0, 0.18 + stretch * 0.08)) / vec2(0.62, 0.28 + stretch * 0.05)) * 1.92);
        float tail = exp(-dot((q + vec2(0.0, 0.22 + stretch * 0.05)) / vec2(0.42, 0.36 + stretch * 0.08), (q + vec2(0.0, 0.22 + stretch * 0.05)) / vec2(0.42, 0.36 + stretch * 0.08)) * 1.76);
        raw += (cap * 0.11 + tail * 0.024) * stretch;
        float tide = (fbm(p * 1.22 + vec2(t * 0.025 * flow, -t * 0.018 * flow) + seed) - 0.5) * 0.11;
        float angle = atan(q.y, q.x);
        float radiusMask = smoothstep(1.22, 0.42, length(q * vec2(0.84, 1.04)));
        float boundaryWave = sin(angle * 2.0 + t * 0.12 * breath + seed) * 0.038;
        boundaryWave += sin(angle * 3.0 - t * 0.09 * flow + seed * 1.7) * 0.022;
        boundaryWave += sin(angle + t * 0.075 * breath + seed * 0.6) * (0.012 + strain * 0.02);
        boundaryWave += jelly * 1.12 + mucusLump * 0.16;
        float footprint = 1.0 - smoothstep(0.32, 1.16, length(q * vec2(0.72, 1.18)));
        float lowerMass = (1.0 - smoothstep(-0.82, -0.1, q.y)) * footprint;
        float groundedFoot = lowerMass * 0.04;
        float stickySlump = lowerMass * strain * 0.044 + lowerMass * abs(mucusLump) * 0.018;
        float beadZone = smoothstep(0.62, 1.02, length(q * vec2(0.82, 1.05))) * (1.0 - smoothstep(1.02, 1.26, length(q * vec2(0.82, 1.05))));
        float beadNoise = smoothstep(0.78, 0.96, noise(vec2(cos(angle) * 2.6 + seed * 0.3, sin(angle) * 2.6 + t * 0.014)));
        float rimBeads = beadZone * beadNoise * (0.028 + strain * 0.014);
        float edgeSafeTide = tide * (0.28 + strain * 0.05) * smoothstep(0.18, 0.78, radiusMask);
        return raw / (0.9 + raw * 0.33) + edgeSafeTide + boundaryWave * radiusMask + groundedFoot + stickySlump + rimBeads + pseudopodField(q, t, meta) * (0.016 + strain * 0.01) + state.x * 0.058;
      }

      float segmentDistance(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a;
        vec2 ba = b - a;
        float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
        return length(pa - ba * h);
      }

      float bridgeField(vec2 p, vec4 a, vec4 b, vec4 stateA, vec4 stateB) {
        float mergeLife = max(stateA.x, stateB.x);
        float centerDistance = length(a.xy - b.xy);
        float reach = (a.z + b.z) * 0.66;
        float close = 1.0 - smoothstep(reach * 0.62, reach * 0.98, centerDistance);
        vec2 ba = b.xy - a.xy;
        float h = clamp(dot(p - a.xy, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
        vec2 normal = normalize(vec2(-ba.y, ba.x) + vec2(0.0001));
        float strain = max(stateA.z, stateB.z);
        float tackNoise = fbm(mix(a.xy, b.xy, h) * 2.1 + vec2(uTime * 0.05, -uTime * 0.032)) - 0.5;
        float slackWave = sin(h * 6.28318 + a.x * 2.4 - b.y * 1.9 + uTime * 0.16) * 0.026;
        slackWave += sin(h * 12.56636 - a.y * 1.7 + b.x * 2.1 - uTime * 0.11) * 0.012;
        float sag = sin(h * 3.14159) * (sin((a.x + b.y) * 3.1 + uTime * 0.19 + tackNoise) * 0.092 + slackWave + strain * 0.032);
        vec2 center = mix(a.xy, b.xy, h) + normal * sag;
        float waist = sin(h * 3.14159);
        float neckPulse = 0.92 + tackNoise * 0.18 + sin(h * 6.28318 + uTime * 0.13 + a.x - b.y) * 0.075;
        float pinchedWaist = pow(max(waist, 0.0), 0.78);
        float width = mix(0.022, min(min(a.z, a.w), min(b.z, b.w)) * (0.24 + pinchedWaist * 0.27 + strain * 0.036) * neckPulse, mergeLife);
        vec2 middleCenter = mix(a.xy, b.xy, 0.5) + normal * sin((a.x + b.y) * 3.1 + uTime * 0.19) * (0.066 + strain * 0.018);
        float middleBulb = 1.0 - smoothstep(width * 0.88, width * 0.88 + 0.105, length(p - middleCenter));
        vec2 sideBulbA = mix(a.xy, b.xy, 0.31) + normal * (sag * 0.6 + 0.04 + tackNoise * 0.014);
        vec2 sideBulbB = mix(a.xy, b.xy, 0.69) - normal * (sag * 0.52 + 0.035 - tackNoise * 0.014);
        float lobeA = 1.0 - smoothstep(width * 0.62, width * 0.62 + 0.1, length(p - sideBulbA));
        float lobeB = 1.0 - smoothstep(width * 0.6, width * 0.6 + 0.096, length(p - sideBulbB));
        float knotNoise = fbm(center * 3.6 + vec2(uTime * 0.034, -uTime * 0.025)) - 0.5;
        float antiTube = 0.74 + 0.2 * sin(h * 18.84954 + uTime * 0.17 + a.x - b.y) + knotNoise * 0.18;
        float neckGate = smoothstep(0.12, 0.34, h) * (1.0 - smoothstep(0.66, 0.88, h));
        float stringer = (1.0 - smoothstep(width * 0.16 * antiTube, width * 0.16 * antiTube + 0.07, length(p - center))) * waist * neckGate;
        float knot = (1.0 - smoothstep(width * 0.46, width * 0.46 + 0.08, length(p - (center + normal * knotNoise * 0.055)))) * neckGate;
        return max(max(middleBulb * 0.42, max(lobeA, lobeB) * 0.24), max(knot * 0.06, stringer * (0.014 + strain * 0.01))) * close * mergeLife;
      }

      float bridgeOnlyField(vec2 p) {
        float bridge = 0.0;
        bridge = max(bridge, bridgeField(p, uBlobData[0], uBlobData[1], uBlobState[0], uBlobState[1]));
        bridge = max(bridge, bridgeField(p, uBlobData[2], uBlobData[4], uBlobState[2], uBlobState[4]));
        bridge = max(bridge, bridgeField(p, uBlobData[3], uBlobData[4], uBlobState[3], uBlobState[4]));
        bridge = max(bridge, bridgeField(p, uBlobData[3], uBlobData[6], uBlobState[3], uBlobState[6]));
        bridge = max(bridge, bridgeField(p, uBlobData[5], uBlobData[6], uBlobState[5], uBlobState[6]));
        return bridge;
      }

      float mergeCorridorField(vec2 p, vec4 a, vec4 b, vec4 stateA, vec4 stateB) {
        float mergeLife = max(stateA.x, stateB.x);
        float centerDistance = length(a.xy - b.xy);
        float reach = (a.z + b.z) * 0.88;
        float close = 1.0 - smoothstep(reach * 0.78, reach * 1.48, centerDistance);
        vec2 ba = b.xy - a.xy;
        float h = clamp(dot(p - a.xy, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
        float waist = sin(h * 3.14159);
        vec2 normal = normalize(vec2(-ba.y, ba.x) + vec2(0.0001));
        vec2 center = mix(a.xy, b.xy, h) + normal * sin(h * 3.14159) * (sin((a.x + b.y) * 2.7 + uTime * 0.11) * 0.035);
        float width = min(min(a.z, a.w), min(b.z, b.w)) * (0.28 + waist * 0.18);
        float corridor = 1.0 - smoothstep(width, width + 0.12, length(p - center));
        return corridor * smoothstep(0.24, 0.76, waist) * close * mergeLife;
      }

      float mergeCorridorOnlyField(vec2 p) {
        float seam = 0.0;
        seam = max(seam, mergeCorridorField(p, uBlobData[0], uBlobData[1], uBlobState[0], uBlobState[1]));
        seam = max(seam, mergeCorridorField(p, uBlobData[2], uBlobData[4], uBlobState[2], uBlobState[4]));
        seam = max(seam, mergeCorridorField(p, uBlobData[3], uBlobData[4], uBlobState[3], uBlobState[4]));
        seam = max(seam, mergeCorridorField(p, uBlobData[3], uBlobData[6], uBlobState[3], uBlobState[6]));
        seam = max(seam, mergeCorridorField(p, uBlobData[5], uBlobData[6], uBlobState[5], uBlobState[6]));
        return seam;
      }

      float unionField(vec2 p, float t) {
        float field = 0.0;
        for (int i = 0; i < BLOB_COUNT; i++) {
          vec4 data = uBlobData[i];
          vec2 local = (p - data.xy) / max(data.zw, vec2(0.001));
          float blob = blobFieldLocal(local, t, uBlobMeta[i], uBlobState[i]);
          field = smoothMax(field, blob, 0.2 + uBlobState[i].x * 0.075);
        }
        field = smoothMax(field, bridgeField(p, uBlobData[0], uBlobData[1], uBlobState[0], uBlobState[1]), 0.2);
        field = smoothMax(field, bridgeField(p, uBlobData[2], uBlobData[4], uBlobState[2], uBlobState[4]), 0.2);
        field = smoothMax(field, bridgeField(p, uBlobData[3], uBlobData[4], uBlobState[3], uBlobState[4]), 0.2);
        field = smoothMax(field, bridgeField(p, uBlobData[3], uBlobData[6], uBlobState[3], uBlobState[6]), 0.2);
        field = smoothMax(field, bridgeField(p, uBlobData[5], uBlobData[6], uBlobState[5], uBlobState[6]), 0.2);
        return field;
      }

      float cellField(vec2 p, float field, float t, vec4 meta) {
        float seed = meta.x;
        float flow = meta.z;
        float breath = meta.w;
        vec2 q = p + vec2(fbm(p * 0.92 + seed + t * 0.018), fbm(p * 0.86 - seed - t * 0.016)) * 0.2;
        float broad = fbm(q * (1.05 + flow * 0.08) + vec2(t * 0.018 * breath, -t * 0.012) + seed);
        float islands = fbm(q * 2.4 + vec2(-t * 0.024, t * 0.018 * flow) - seed);
        return smoothstep(0.32, 0.82, broad * 0.66 + islands * 0.34 + field * 0.035);
      }

      vec2 flowCoordinate(vec2 p, float field, float t, vec4 meta) {
        float seed = meta.x;
        float flow = meta.z;
        vec2 q = p;
        q = swirl(q, vec2(sin(seed) * 0.09, cos(seed * 1.3) * 0.08), 0.72 + flow * 0.16);
        q = swirl(q, vec2(cos(t * 0.045 + seed) * 0.12, sin(t * 0.038 + seed) * 0.09), 0.32);
        q.x += (fbm(q * 0.86 + vec2(t * 0.018 * flow, -t * 0.012) + seed) - 0.5) * 0.42;
        q.y += (fbm(q * 1.05 - vec2(t * 0.016, seed * 0.2)) - 0.5) * 0.2;
        q.y += sin(t * 0.035 * flow + seed) * 0.12 + field * 0.035;
        q += vec2(field * 0.045, -field * 0.025);
        return q;
      }

      float marbleCurrent(vec2 p, float field, float t, vec4 meta) {
        float seed = meta.x;
        float flow = meta.z;
        float breath = meta.w;
        vec2 q = flowCoordinate(p, field, t, meta);
        float broad = fbm(q * (0.92 + flow * 0.05) + vec2(-t * 0.026 * flow, t * 0.013) + seed) * 2.0 - 1.0;
        float fold = sin((q.x * 0.85 + q.y * 1.32 + broad * 0.5 - t * 0.075 * flow + seed) * 3.14159);
        float secondary = fbm(q * 2.05 + vec2(t * 0.02 * breath, -t * 0.018) - seed) * 2.0 - 1.0;
        float mucusFold = sin((q.x * 0.58 - q.y * 0.33 + broad * 0.52 + secondary * 0.2 - t * 0.066 * flow + seed * 0.6) * 3.14159);
        return broad * 0.45 + fold * 0.08 + secondary * 0.25 + mucusFold * 0.09;
      }

      vec2 puddleFlowCoordinate(vec2 p, float field, float t, vec4 meta, float bridgeMask) {
        float seed = meta.x;
        float flow = meta.z;
        vec2 q = flowCoordinate(p, field, t, meta);
        float shallow = smoothstep(0.34, 0.68, field) * (1.0 - smoothstep(1.02, 1.28, field));
        float poolDrift = fbm(q * 0.48 + vec2(-t * 0.01 * flow, t * 0.006) + seed);
        vec2 sheet = vec2(
          sin(q.y * 0.72 + poolDrift * 1.4 + t * 0.018 * flow + seed),
          cos(q.x * 0.58 - poolDrift * 1.1 - t * 0.014 + seed * 1.3)
        );
        q += sheet * (0.12 + shallow * 0.11 + bridgeMask * 0.08);
        q.y -= shallow * (0.055 + bridgeMask * 0.045);
        q.x += sin(q.y * 0.38 + t * 0.012 + seed) * (0.045 + shallow * 0.05);
        q = swirl(q, vec2(sin(seed * 0.73) * 0.16, cos(seed * 0.91) * 0.12), 0.16 + shallow * 0.16 + bridgeMask * 0.12);
        return q;
      }

      float puddleSheetCurrent(vec2 p, float field, float t, vec4 meta, float bridgeMask) {
        float seed = meta.x;
        float flow = meta.z;
        vec2 q = puddleFlowCoordinate(p, field, t, meta, bridgeMask);
        float shallow = smoothstep(0.36, 0.68, field) * (1.0 - smoothstep(1.0, 1.24, field));
        float pool = fbm(q * 0.42 + vec2(t * 0.006 * flow, -t * 0.005) + seed);
        float settling = fbm(q * 0.86 + vec2(-t * 0.012, t * 0.008 * flow) + seed * 1.9);
        vec2 warped = q + vec2(sin(q.y * 0.84 + pool + seed), cos(q.x * 0.72 - pool + seed)) * 0.12;
        float ring = sin((length(warped * vec2(0.74, 1.18)) * 1.8 + pool * 0.46 - t * 0.018 * flow + seed) * 6.28318) * 0.5 + 0.5;
        float curvedLane = sin((warped.x * 0.26 + warped.y * 0.2 + sin(warped.x * 0.92 + seed) * 0.22 + sin(warped.y * 0.78 - seed) * 0.18 + pool * 0.72 - t * 0.02 * flow + seed) * 6.28318) * 0.5 + 0.5;
        float ringBand = smoothstep(0.48, 0.76, ring) * (1.0 - smoothstep(0.84, 1.0, ring));
        float laneBand = smoothstep(0.52, 0.82, curvedLane) * (1.0 - smoothstep(0.88, 1.0, curvedLane));
        float lamella = max(ringBand * 0.84, laneBand * 0.34);
        float organicBreak = smoothstep(0.28, 0.82, pool * 0.52 + settling * 0.48);
        float edgeMeniscus = (smoothstep(0.32, 0.52, field) - smoothstep(0.7, 0.96, field)) * 0.38;
        return clamp((lamella * 0.52 + edgeMeniscus * 0.34 + bridgeMask * 0.04) * organicBreak * shallow, 0.0, 1.0);
      }

      float marbleVeinCurrent(vec2 p, float field, float t, vec4 meta, float bridgeMask) {
        float seed = meta.x;
        float flow = meta.z;
        vec2 q = puddleFlowCoordinate(p, field, t, meta, bridgeMask);
        float oldMarble = marbleCurrent(q, field, t, meta);
        float pooled = fbm(q * 0.72 + vec2(-t * 0.016 * flow, t * 0.01) + seed);
        float foldAxis = q.x * 0.62 - q.y * 0.34 + sin(q.x * 0.98 + pooled + seed) * 0.36 + sin(q.y * 0.86 - pooled + seed * 0.4) * 0.3;
        float fold = sin((foldAxis + pooled * 0.76 - t * 0.052 * flow + seed * 0.8) * 3.14159);
        float breakNoise = fbm(q * 2.35 + vec2(t * 0.015, -t * 0.012) + seed * 1.6);
        float vein = (1.0 - smoothstep(0.04, 0.28, abs(fold))) * smoothstep(0.36, 0.88, breakNoise * 0.72 + pooled * 0.28);
        float recirculation = fbm(q * 1.65 + vec2(t * 0.018, -t * 0.013 * flow) + seed * 2.4) * 2.0 - 1.0;
        return (oldMarble * 0.32 + (vein - 0.5) * 0.22 + recirculation * 0.28) * smoothstep(0.4, 0.95, field) * (0.86 + bridgeMask * 0.12);
      }

      vec2 pigmentFlowCoordinate(vec2 p, float field, float t, vec4 meta, float bridgeMask) {
        float seed = meta.x;
        float flow = meta.z;
        vec2 q = flowCoordinate(p, field, t, meta);
        vec2 base = q * 0.62 + vec2(t * 0.012 * flow, -t * 0.018) + seed;
        float e = 0.075;
        float n0 = fbm(base);
        float nx = fbm(base + vec2(e, 0.0));
        float ny = fbm(base + vec2(0.0, e));
        vec2 curl = vec2(ny - n0, n0 - nx) * (1.1 + field * 0.35);
        q += curl * (0.52 + bridgeMask * 0.24);
        q.x += sin(q.y * 1.25 + t * 0.022 * flow + seed) * 0.1;
        q.y += sin(q.x * 0.82 - t * 0.019 + seed * 1.4) * 0.08;
        q += vec2(bridgeMask * sin(t * 0.02 + seed) * 0.018, bridgeMask * field * 0.022);
        return q;
      }

      vec2 calmPsychedelicCoordinate(vec2 p, float field, float t, vec4 meta, float bridgeMask) {
        float seed = meta.x;
        float flow = meta.z;
        vec2 q = pigmentFlowCoordinate(p, field, t, meta, bridgeMask) * 0.82;
        float slowA = t * (0.006 + flow * 0.0018);
        float slowB = t * (0.0045 + meta.w * 0.0014);
        vec2 eddyA = vec2(sin(seed * 0.73 + slowA) * 0.2, cos(seed * 0.91 - slowA * 0.8) * 0.15);
        vec2 eddyB = vec2(cos(seed * 1.13 - slowB) * 0.18, sin(seed * 0.67 + slowB * 1.2) * 0.14);
        q = swirl(q, eddyA, 0.24 + bridgeMask * 0.06);
        q = swirl(q, eddyB, -0.18);
        float pooled = fbm(q * 0.36 + vec2(-slowA, slowB) + seed);
        q += vec2(
          sin(q.y * 0.36 + pooled * 1.12 + seed + slowA) * 0.075,
          cos(q.x * 0.32 - pooled * 0.94 + seed * 1.2 - slowB) * 0.06
        ) * smoothstep(0.42, 0.96, field);
        return q;
      }

      float calmPsychedelicMix(vec2 q, float field, float h, float t, vec4 meta) {
        float seed = meta.x;
        float flow = meta.z;
        float breath = meta.w;
        float pool = fbm(q * 0.42 + vec2(t * 0.0035 * flow, -t * 0.0028) + seed);
        float undertow = fbm(q * 0.78 + vec2(-t * 0.0042, t * 0.0032 * breath) + seed * 1.9);
        float softTurn = sin((q.x * 0.34 + q.y * 0.28 + pool * 0.88 + undertow * 0.34 + seed) * 6.28318);
        float slowBreath = sin(t * (0.032 + breath * 0.004) + seed + h * 0.48) * 0.5 + 0.5;
        return (pool - 0.5) * 0.32 + (undertow - 0.5) * 0.24 + softTurn * 0.045 + (slowBreath - 0.5) * 0.12 + field * 0.018;
      }

      float opalescentDepthGlaze(vec2 q, float field, float h, float t, vec4 meta) {
        float seed = meta.x;
        float flow = meta.z;
        float soft = fbm(q * 0.5 + vec2(t * 0.0024 * flow, -t * 0.002) + seed * 2.4);
        float lens = sin((length(q * vec2(0.72, 1.1)) * 0.62 + soft * 0.58 + h * 0.34 + seed + t * 0.003) * 6.28318);
        float interior = smoothstep(0.52, 0.92, field) * (1.0 - smoothstep(1.04, 1.34, field));
        return (soft * 0.58 + lens * 0.18 + h * 0.12) * interior;
      }

      float calmArtifactBreakup(vec2 q, float field, float h, float t, vec4 meta, float bridgeMask) {
        float seed = meta.x;
        float flow = meta.z;
        vec2 drift = vec2(t * 0.0028 * flow, -t * 0.0022);
        float broad = fbm(q * 0.5 + drift + seed * 0.7);
        float rounded = fbm(q * 1.08 - drift * 1.4 + seed * 1.9);
        float softWhorl = sin((q.x * 0.22 + q.y * 0.31 + broad * 0.96 + rounded * 0.42 + seed) * 6.28318);
        float organic = broad * 0.46 + rounded * 0.36 + (1.0 - abs(softWhorl)) * 0.18;
        float interior = smoothstep(0.46, 0.94, field) * (1.0 - smoothstep(1.08, 1.36, field));
        float calmMask = smoothstep(0.28, 0.82, organic) * interior * (1.0 - bridgeMask * 0.12);
        return clamp(calmMask * (0.72 + h * 0.18), 0.0, 1.0);
      }

      float combedMarblePaint(vec2 p, float field, float h, float t, vec4 meta, float bridgeMask) {
        float seed = meta.x;
        float flow = meta.z;
        vec2 q = pigmentFlowCoordinate(p, field, t, meta, bridgeMask);
        vec2 pooledQ = puddleFlowCoordinate(p + q * 0.18, field, t, meta, bridgeMask);
        float pool = fbm(pooledQ * 0.38 + vec2(t * 0.004 * flow, -t * 0.003) + seed);
        float pull = fbm(q * 0.64 + vec2(-t * 0.008, t * 0.006 * flow) + seed * 1.4);

        q = mix(q, pooledQ, 0.34 + pool * 0.18);
        q = swirl(q, vec2(sin(seed * 0.67) * 0.18, cos(seed * 0.91) * 0.13), 0.22 + pool * 0.24 + bridgeMask * 0.1);
        q += vec2(
          sin(q.y * 0.48 + pool * 1.35 + seed) * 0.1,
          cos(q.x * 0.42 - pull * 1.15 + seed * 1.2) * 0.075
        );

        float combAxis = q.x * 0.34 + q.y * 0.58 + pool * 1.02 + pull * 0.7 - t * 0.014 * flow + seed;
        float foldAxis = q.x * 0.68 - q.y * 0.28 + pool * 0.82 + fbm(q * 1.18 + seed * 1.7) * 0.58 + seed * 0.42;
        float comb = sin(combAxis * 6.28318);
        float fold = sin(foldAxis * 6.28318);
        float broadWhorl = sin((length(q * vec2(0.78, 1.12)) * 0.92 + atan(q.y, q.x) * 0.16 + pool * 0.88 + seed - t * 0.008 * flow) * 6.28318);

        float softVein = (1.0 - smoothstep(0.08, 0.42, abs(comb))) * 0.48;
        softVein += (1.0 - smoothstep(0.1, 0.5, abs(fold))) * 0.32;
        softVein += (1.0 - smoothstep(0.12, 0.54, abs(broadWhorl))) * 0.2;
        float organicBreak = smoothstep(0.22, 0.82, pool * 0.56 + pull * 0.36 + fbm(q * 1.8 + seed * 2.2) * 0.08);
        float interior = smoothstep(0.46, 0.9, field) * (1.0 - smoothstep(1.14, 1.42, field));
        float settledFilm = smoothstep(0.22, 0.74, h + field * 0.12) * (0.82 + bridgeMask * 0.1);
        return clamp(softVein * organicBreak * interior * settledFilm, 0.0, 1.0);
      }

      float organicHueDiffusion(vec2 q, float field, float h, float t, vec4 meta) {
        float seed = meta.x;
        float flow = meta.z;
        float broad = fbm(q * 0.34 + vec2(-t * 0.006 * flow, t * 0.004) + seed);
        float middle = fbm(q * 0.68 + vec2(t * 0.009, -t * 0.007 * flow) + seed * 1.7);
        float softPore = fbm(q * 1.12 + vec2(-t * 0.011, t * 0.008) + seed * 2.9);
        float curvedFold = sin((q.x * 0.32 + q.y * 0.27 + broad * 1.26 + middle * 0.72 + seed) * 6.28318);
        float depthDrift = smoothstep(0.38, 1.08, field) * (h - 0.42) * 0.028;
        return (broad - 0.5) * 0.22 + (middle - 0.5) * 0.13 + (softPore - 0.5) * 0.045 + curvedFold * 0.018 + depthDrift;
      }

      float organicRibbonMask(float signal, vec2 q, float t, vec4 meta) {
        float seed = meta.x;
        float flow = meta.z;
        float broad = fbm(q * 0.42 + vec2(t * 0.006 * flow, -t * 0.005) + seed);
        float bend = sin(q.y * 0.44 + q.x * 0.25 + broad * 1.15 + seed + t * 0.01 * flow) * 0.08;
        float softened = signal * 0.7 + (broad - 0.5) * 0.34 + bend;
        return smoothstep(-0.56, 0.92, softened);
      }

      float laminarChromaRiver(vec2 p, float field, float t, vec4 meta, float bridgeMask) {
        float seed = meta.x;
        float flow = meta.z;
        vec2 q = pigmentFlowCoordinate(p, field, t, meta, bridgeMask);
        float broad = fbm(q * 0.52 + vec2(-t * 0.018 * flow, t * 0.008) + seed);
        float undertow = fbm(q * 1.08 + vec2(t * 0.01, -t * 0.014 * flow) + seed * 2.2);
        float eddy = fbm(q * 1.86 + vec2(-t * 0.016, t * 0.013 * flow) + seed * 3.1);
        float curvedLane = broad * 1.26 + undertow * 0.72 + eddy * 0.58 + sin(q.x * 0.38 + seed) * 0.22 + sin(q.y * 0.34 - seed) * 0.18 - t * 0.026 * flow;
        float braid = sin(curvedLane * 6.28318);
        float neckBlend = bridgeMask * smoothstep(0.26, 0.74, field) * (0.08 + sin(q.x * 1.1 + t * 0.02 + seed) * 0.03);
        return braid * 0.022 + broad * 0.28 + undertow * 0.22 + (eddy - 0.5) * 0.11 + neckBlend * 0.58;
      }

      float capillarySpectralVeins(vec2 p, float field, float t, vec4 meta, float bridgeMask) {
        float seed = meta.x;
        float flow = meta.z;
        vec2 q = pigmentFlowCoordinate(p, field, t, meta, bridgeMask);
        float broad = fbm(q * 0.46 + vec2(t * 0.006 * flow, -t * 0.009) + seed);
        float lane = q.x * 0.48 + q.y * 0.72 + broad * 0.92 + sin(q.x * 0.9 + seed) * 0.32 + sin(q.y * 0.78 - seed * 0.7) * 0.26 - t * 0.034 * flow;
        float strandA = 1.0 - smoothstep(0.018, 0.15, abs(sin(lane * 6.28318)));
        float strandB = 1.0 - smoothstep(0.025, 0.17, abs(sin((lane * 0.62 + q.x * 0.28 + seed) * 6.28318)));
        float poreBreak = smoothstep(0.34, 0.82, fbm(q * 2.8 + vec2(-t * 0.019, t * 0.012) + seed * 1.8));
        return (strandA * 0.72 + strandB * 0.38) * poreBreak * smoothstep(0.44, 0.9, field) * (0.62 + bridgeMask * 0.34);
      }

      float brokenWetFilm(vec2 p, float field, float t, vec4 meta) {
        float seed = meta.x;
        vec2 q = pigmentFlowCoordinate(p, field, t, meta, 0.0);
        float islands = fbm(q * 2.15 + vec2(t * 0.018, -t * 0.012) + seed);
        vec2 warped = q + vec2(sin(q.y * 0.82 + seed) * 0.16, cos(q.x * 0.68 - seed) * 0.12);
        float radius = length(warped * vec2(0.86, 1.18));
        float angle = atan(warped.y, warped.x);
        float roundedRings = 1.0 - smoothstep(0.045, 0.22, abs(sin((radius * 1.72 + angle * 0.12 + islands * 0.46 + seed) * 6.28318)));
        float pores = smoothstep(0.54, 0.88, fbm(q * 4.1 + vec2(-t * 0.017, t * 0.011) + seed * 2.7));
        float broken = smoothstep(0.48, 0.86, islands) * 0.5 + roundedRings * pores * 0.44;
        return broken * smoothstep(0.48, 0.92, field);
      }

      vec3 naturalSaturate(vec3 color, float amount) {
        float luma = dot(color, vec3(0.299, 0.587, 0.114));
        return mix(vec3(luma), color, amount);
      }

      float pigmentCurrent(vec2 p, float field, float t, vec4 meta, float bridgeMask) {
        float seed = meta.x;
        float flow = meta.z;
        vec2 q = pigmentFlowCoordinate(p, field, t, meta, bridgeMask);
        float convection = fbm(q * 0.74 + vec2(sin(t * 0.023 + seed) * 0.18, t * 0.017 * flow) + seed);
        float eddy = fbm(q * 1.34 + vec2(t * 0.014 * flow, -t * 0.012) + seed * 1.7);
        float pooledCrawl = convection * 0.82 + eddy * 0.58 + sin(q.x * 0.52 + q.y * 0.3 + seed) * 0.13 + sin(q.y * 0.34 - q.x * 0.2 - seed * 0.6) * 0.1 - t * 0.014 * flow;
        float ribbon = sin((pooledCrawl + convection * 0.42 + eddy * 0.12 + field * 0.11) * 6.28318);
        float pressureBend = bridgeMask * (0.07 + sin(q.x * 1.6 + t * 0.026 + seed) * 0.03);
        return ribbon * 0.032 + convection * 0.42 + eddy * 0.34 + pressureBend * 0.74;
      }

      float causticVeins(vec2 p, float field, float h, float t, vec4 meta) {
        float seed = meta.x;
        float flow = meta.z;
        vec2 q = flowCoordinate(p, field, t, meta);
        float broad = fbm(q * 1.72 + vec2(t * 0.024 * flow, -t * 0.016) + seed);
        float detail = noise(q * 4.4 + vec2(-t * 0.032, t * 0.02) + seed * 0.7);
        float pooled = smoothstep(0.58, 0.86, broad * 0.78 + detail * 0.22);
        float grazingPatch = smoothstep(0.62, 0.9, noise(q * 2.8 + vec2(t * 0.019, seed)));
        return (pooled * 0.32 + grazingPatch * 0.18) * smoothstep(0.44, 0.96, h) * smoothstep(0.48, 0.8, field);
      }

      float tactileTexture(vec2 p, float field, float t, vec4 meta) {
        float seed = meta.x;
        float flow = meta.z;
        vec2 q = flowCoordinate(p, field, t, meta);
        float pores = noise(q * 4.2 + vec2(seed, t * 0.026));
        float poresFine = noise(q * 7.4 - vec2(t * 0.024, seed * 0.4));
        float softFold = fbm(q * 1.9 + vec2(t * 0.018 * flow, -t * 0.014) + seed) - 0.5;
        float dimple = smoothstep(0.76, 0.98, poresFine) * smoothstep(0.48, 0.84, field);
        float mottledLift = (pores - 0.5) * 0.022 + softFold * 0.058 - dimple * 0.024;
        return mottledLift * smoothstep(0.34, 0.78, field);
      }

      vec4 blendedBlobMeta(vec2 p) {
        float total = 0.0;
        vec4 meta = vec4(0.0);
        for (int i = 0; i < BLOB_COUNT; i++) {
          vec4 data = uBlobData[i];
          vec2 local = (p - data.xy) / max(data.zw, vec2(0.001));
          float weight = exp(-dot(local, local) * 0.58) * (0.5 + uBlobState[i].x * 0.5);
          meta += uBlobMeta[i] * weight;
          total += weight;
        }
        return meta / max(total, 0.001);
      }

      float blendedPalette(vec2 p) {
        float total = 0.0;
        float palette = 0.0;
        for (int i = 0; i < BLOB_COUNT; i++) {
          vec4 data = uBlobData[i];
          vec2 local = (p - data.xy) / max(data.zw, vec2(0.001));
          float weight = exp(-dot(local, local) * 0.72) * (0.55 + uBlobState[i].x * 0.45);
          palette += uBlobMeta[i].y * weight;
          total += weight;
        }
        return palette / max(total, 0.001);
      }

      float overlapOvalSuppress(vec2 p) {
        float total = 0.0;
        float peak = 0.0;
        for (int i = 0; i < BLOB_COUNT; i++) {
          vec4 data = uBlobData[i];
          vec2 local = (p - data.xy) / max(data.zw, vec2(0.001));
          float weight = exp(-dot(local, local) * 0.74) * (0.52 + uBlobState[i].x * 0.48);
          total += weight;
          peak = max(peak, weight);
        }
        float overlap = max(0.0, total - peak);
        return smoothstep(0.18, 0.72, overlap) * smoothstep(0.56, 1.18, total);
      }

      void main() {
        vec2 p = vWorld;
        float t = uTime;
        float rawField = unionField(p, t);
        float seamProbe = 0.012;
        float fieldRight = unionField(p + vec2(seamProbe, 0.0), t);
        float fieldLeft = unionField(p - vec2(seamProbe, 0.0), t);
        float fieldUp = unionField(p + vec2(0.0, seamProbe), t);
        float fieldDown = unionField(p - vec2(0.0, seamProbe), t);
        float neighborField = max(max(fieldRight, fieldLeft), max(fieldUp, fieldDown));
        float edgeContinuity = smoothstep(0.34, 0.58, neighborField) * (1.0 - smoothstep(0.36, 0.54, rawField)) * (1.0 - smoothstep(0.74, 1.08, neighborField));
        float leftWallBias = smoothstep(0.02, 0.18, fieldRight - fieldLeft);
        float seamHeal = edgeContinuity * (0.34 + leftWallBias * 0.34);
        float field = max(rawField, mix(rawField, neighborField * 0.88, seamHeal));
        float bridgeMask = smoothstep(0.16, 0.54, bridgeOnlyField(p));
        float mergeSeamMask = smoothstep(0.08, 0.36, mergeCorridorOnlyField(p));
        float overlapOvalMask = overlapOvalSuppress(p) * smoothstep(0.52, 0.82, field);
        float interiorInkMask = max(max(bridgeMask, mergeSeamMask), overlapOvalMask);
        float bounds = smoothstep(2.0, 1.82, length(vec2(p.x / max(uAspect, 0.001), p.y) * vec2(1.0, 1.05)));
        float body = smoothstep(0.48, 0.6, field);
        if (field < 0.31 || bounds < 0.02) discard;

        float rim = max((smoothstep(0.33, 0.41, field) - smoothstep(0.55, 0.69, field)) * mix(1.0, 0.62, overlapOvalMask), seamHeal * 0.42);
        float colorEdge = max((smoothstep(0.31, 0.42, field) - smoothstep(0.58, 0.82, field)) * mix(1.0, 0.64, overlapOvalMask), seamHeal * 0.64);
        float hotRim = max((smoothstep(0.51, 0.6, field) - smoothstep(0.66, 0.82, field)) * mix(1.0, 0.42, overlapOvalMask), seamHeal * 0.18);
        float meniscus = max((smoothstep(0.31, 0.39, field) - smoothstep(0.46, 0.62, field)) * mix(1.0, 0.56, overlapOvalMask), seamHeal * 0.48);
        float contactFoot = smoothstep(0.32, 0.46, field) * (1.0 - body) * (1.0 - interiorInkMask * 0.82);
        vec4 meta = blendedBlobMeta(p);
        float marble = marbleCurrent(p, field, t, meta);
        float puddleSheet = puddleSheetCurrent(p, field, t, meta, bridgeMask);
        float marbleVeins = marbleVeinCurrent(p, field, t, meta, bridgeMask);
        float cells = cellField(p, field, t, meta);
        float tactile = tactileTexture(p, field, t, meta);
        float paletteBase = blendedPalette(p);
        float angle = atan(p.y, p.x);
        float beadSignal = smoothstep(0.72, 0.94, noise(vec2(cos(angle) * 2.6 + meta.x * 0.3, sin(angle) * 2.6 + t * 0.014))) * meniscus;
        float boundaryRoll = sin(angle * 2.0 + t * 0.25 * meta.w + meta.x) * 0.058;
        boundaryRoll += sin(angle * 3.0 - t * 0.18 * meta.z + meta.x * 1.6) * 0.034;
        float breath = sin(t * 0.31 * meta.w + meta.x + field * 0.2) * 0.035;
        float jellyBody = (
          sin(t * (2.28 + meta.w * 0.25) + meta.x + field * 2.1) * 0.018 +
          sin(t * (3.35 + meta.z * 0.18) - meta.x * 0.6 + angle * 1.7) * 0.01
        ) * body * smoothstep(0.38, 0.92, field);
        float h = clamp(body * (0.56 + marble * 0.08 + marbleVeins * 0.09 + puddleSheet * 0.12 + cells * 0.08 + breath + tactile + jellyBody) + rim * (0.3 + boundaryRoll + puddleSheet * 0.08 + jellyBody * 0.8) + vLift * 0.58, 0.0, 1.2);

        float e = 0.012;
        float hx = unionField(p + vec2(e, 0.0), t);
        float hy = unionField(p + vec2(0.0, e), t);
        float hxl = unionField(p - vec2(e, 0.0), t);
        float hyl = unionField(p - vec2(0.0, e), t);
        float curvature = clamp(0.5 + (hx + hxl + hy + hyl - field * 4.0) * 1.35, 0.0, 1.0);
        vec3 n = normalize(vec3((field - hx) * 1.95, (field - hy) * 1.95, 0.082));
        vec3 light = normalize(vec3(-0.45, 0.58, 0.78));
        vec3 fillLight = normalize(vec3(0.48, -0.24, 0.84));
        vec3 view = vec3(0.0, 0.0, 1.0);
        float diffuse = max(dot(n, light), 0.0);
        float fill = max(dot(n, fillLight), 0.0);
        float lightCatch = max(dot(reflect(-light, n), view), 0.0);
        float fillCatch = max(dot(reflect(-fillLight, n), view), 0.0);
        float spec = smoothstep(0.74, 0.91, lightCatch);
        float fillSpec = smoothstep(0.72, 0.9, fillCatch);
        float pinSpec = pow(lightCatch, 120.0) + pow(fillCatch, 96.0) * 0.45;
        float viewFacing = max(dot(n, view), 0.0);
        float grazing = pow(1.0 - viewFacing, 2.1);
        float wet = pow(viewFacing, 12.0);

        float pigmentFlow = pigmentCurrent(p, field, t, meta, bridgeMask);
        float chromaRiver = laminarChromaRiver(p, field, t, meta, bridgeMask);
        float capillaryVeins = capillarySpectralVeins(p, field, t, meta, bridgeMask);
        float wetBreakup = brokenWetFilm(p, field, t, meta);
        vec2 pigmentQ = pigmentFlowCoordinate(p, field, t, meta, bridgeMask);
        float pigmentPool = fbm(pigmentQ * 0.7 + vec2(sin(t * 0.021 + meta.x) * 0.2, -t * 0.012 * meta.z) + meta.x);
        float marblePaint = combedMarblePaint(p + vec2(field * 0.018, -h * 0.012), field, h, t, meta, bridgeMask);
        vec2 calmQ = calmPsychedelicCoordinate(p + pigmentQ * 0.045 + vec2(h * 0.018, -field * 0.012), field, t, meta, bridgeMask);
        float calmSwirl = calmPsychedelicMix(calmQ, field, h, t, meta);
        float opalDepth = opalescentDepthGlaze(calmQ, field, h, t, meta);
        float artifactBreakup = calmArtifactBreakup(calmQ + pigmentQ * 0.08, field, h, t, meta, bridgeMask);
        float ribbonBlend = organicRibbonMask(marble * 0.22 + marbleVeins * 0.28 + puddleSheet * 0.12 + pigmentFlow * 0.22 + chromaRiver * 0.24, pigmentQ, t, meta);
        float hueDiffusion = organicHueDiffusion(pigmentQ + vec2(field * 0.045, -h * 0.025), field, h, t, meta);
        float band = paletteBase + chromaRiver * 0.055 + marbleVeins * 0.085 + puddleSheet * 0.038 + pigmentFlow * 0.052 + pigmentPool * 0.14 + marblePaint * 0.18 + calmSwirl * 0.06 + opalDepth * 0.045 + capillaryVeins * 0.04 + cells * 0.02 + h * 0.042 + t * 0.0035 * meta.z;
        float organicBand = band + hueDiffusion;
        float undertowBand = organicBand + marble * 0.02 + marbleVeins * 0.035 + puddleSheet * 0.025 + pigmentPool * 0.055 + chromaRiver * 0.02;
        vec3 riverColor = technicolour(organicBand + chromaRiver * 0.02 + marbleVeins * 0.018 + h * 0.018);
        vec3 undertowColor = technicolour(undertowBand + pigmentPool * 0.06 + puddleSheet * 0.02 + 0.14);
        vec3 color = mix(riverColor, undertowColor, ribbonBlend * 0.12 + cells * 0.028);
        vec3 puddleColor = technicolour(organicBand + puddleSheet * 0.08 + marbleVeins * 0.04 + pigmentPool * 0.05 + field * 0.02 + t * 0.003);
        color = mix(color, puddleColor, body * puddleSheet * (0.018 + bridgeMask * 0.004));
        vec3 thermalColor = technicolour(organicBand + chromaRiver * 0.025 + marbleVeins * 0.045 + pigmentPool * 0.045 + calmSwirl * 0.07 + marblePaint * 0.08 + t * 0.0025);
        color = mix(color, thermalColor, 0.032 + bridgeMask * 0.012 + smoothstep(0.68, 1.05, h) * 0.018);
        float flowIntensity = smoothstep(0.18, 0.78, abs(pigmentFlow) + pigmentPool * 0.42);
        float chromaIntensity = smoothstep(0.18, 0.88, abs(chromaRiver) + abs(marbleVeins) * 0.28 + puddleSheet * 0.2 + pigmentPool * 0.42 + bridgeMask * 0.16);
        vec3 psychedelicGlaze = technicolour(organicBand + chromaRiver * 0.07 + marbleVeins * 0.055 + puddleSheet * 0.04 + pigmentFlow * 0.035 + pigmentPool * 0.08 + t * 0.006);
        color = mix(color, psychedelicGlaze, body * (0.062 + bridgeMask * 0.015 + flowIntensity * 0.024));
        color = mix(color, technicolour(undertowBand + marbleVeins * 0.052 + chromaRiver * 0.016 + pigmentFlow * 0.016 + 0.34), body * chromaIntensity * 0.018);
        float calmInteriorMask = body * smoothstep(0.5, 0.96, field) * (1.0 - smoothstep(1.08, 1.38, field)) * (1.0 - colorEdge * 0.22) * (1.0 - bridgeMask * 0.18);
        vec3 opalColorA = technicolour(organicBand + calmSwirl * 0.12 + opalDepth * 0.06 + 0.18);
        vec3 opalColorB = technicolour(organicBand - calmSwirl * 0.08 + opalDepth * 0.11 + 0.52);
        vec3 opalMix = mix(opalColorA, opalColorB, 0.42 + calmSwirl * 0.28);
        color = mix(color, opalMix, calmInteriorMask * (0.072 + opalDepth * 0.046));
        float softAurora = smoothstep(0.22, 0.68, abs(calmSwirl) + opalDepth * 0.36) * calmInteriorMask * (1.0 - smoothstep(0.62, 0.96, wetBreakup));
        vec3 auroraWash = technicolour(organicBand + calmSwirl * 0.18 + opalDepth * 0.12 + sin(t * 0.004 + meta.x) * 0.025 + 0.32);
        color = mix(color, auroraWash, softAurora * 0.042);
        vec3 combedPaintColor = technicolour(organicBand + marbleVeins * 0.11 + puddleSheet * 0.08 + pigmentPool * 0.06 + chromaRiver * 0.045 + marblePaint * 0.16 + 0.1);
        color = mix(color, combedPaintColor, body * marblePaint * (0.46 + puddleSheet * 0.12 + wetBreakup * 0.035) * (1.0 - colorEdge * 0.04));
        vec3 waxBody = technicolour(organicBand + marbleVeins * 0.045 + puddleSheet * 0.035 + chromaRiver * 0.05 + pigmentFlow * 0.028 + h * 0.04 + sin(p.y * 0.72 + t * 0.024 + meta.x) * 0.012);
        color = mix(color, waxBody, 0.04 + bridgeMask * 0.015);
        color = naturalSaturate(color, 1.0 + chromaIntensity * 0.3);
        float peakColor = max(max(color.r, color.g), color.b);
        float lowColor = min(min(color.r, color.g), color.b);
        float milkyBody = smoothstep(0.72, 0.98, peakColor) * (1.0 - smoothstep(0.24, 0.58, peakColor - lowColor)) * body;
        float washedBody = smoothstep(0.82, 1.04, peakColor) * body;
        vec3 deepPigment = technicolour(organicBand + marbleVeins * 0.055 + chromaRiver * 0.07 + puddleSheet * 0.035 + pigmentPool * 0.055 + h * 0.035 + 0.08);
        color = mix(color, deepPigment, max(milkyBody * 0.42, washedBody * 0.2));
        vec3 veinColor = technicolour(organicBand + marbleVeins * 0.045 + chromaRiver * 0.065 + capillaryVeins * 0.06 + puddleSheet * 0.025 + pigmentPool * 0.055 + 0.2);
        color = mix(color, veinColor, capillaryVeins * body * (0.08 + bridgeMask * 0.018));

        vec2 mineralCoord = flowCoordinate(p, field, t, meta) * 1.45 + vec2(t * 0.018, -t * 0.014) + meta.x;
        float mineral = noise(mineralCoord) * 0.44 + noise(mineralCoord * 1.85 + 5.7) * 0.56;
        color = mix(color, technicolour(mineral * 0.2 + organicBand + 0.12), smoothstep(0.5, 0.78, mineral) * 0.08);
        color = mix(color, vec3(0.06, 0.04, 0.085), smoothstep(0.035, 0.09, -tactile) * body * 0.12);
        vec3 contactTint = mix(vec3(0.12, 0.075, 0.16), technicolour(organicBand + 0.3) * 0.46, 0.42);
        color = mix(color, contactTint, contactFoot * 0.12);
        color += vec3(1.0, 0.88, 0.54) * smoothstep(0.028, 0.085, tactile) * body * 0.08;
        float shadeBand = mix(0.48, 1.0, smoothstep(0.18, 0.72, diffuse));
        color *= 0.5 + shadeBand * 0.34 + fill * 0.1;
        float shadedPeak = max(max(color.r, color.g), color.b);
        float shadedLow = min(min(color.r, color.g), color.b);
        float dullInterior = (1.0 - smoothstep(0.16, 0.42, shadedPeak - shadedLow)) * smoothstep(0.48, 0.92, field) * body;
        vec3 livingChroma = technicolour(organicBand + marbleVeins * 0.055 + puddleSheet * 0.04 + chromaRiver * 0.07 + pigmentPool * 0.06 + capillaryVeins * 0.045 + h * 0.035 + 0.1);
        color = mix(color, livingChroma, dullInterior * (0.22 + chromaIntensity * 0.12) * (1.0 - contactFoot) * (1.0 - colorEdge * 0.08));
        float roundedPanelBreak = smoothstep(0.38, 0.82, wetBreakup + abs(marbleVeins) * 0.42 + capillaryVeins * 0.3);
        float smoothPanel = roundedPanelBreak * smoothstep(0.54, 1.02, field) * body * smoothstep(0.1, 0.52, puddleSheet + abs(marbleVeins) * 0.38 + capillaryVeins * 0.22);
        vec3 panelMarble = technicolour(organicBand + marbleVeins * 0.07 + puddleSheet * 0.055 + pigmentPool * 0.06 + h * 0.03 + 0.24);
        color = mix(color, panelMarble, smoothPanel * (0.01 + puddleSheet * 0.006) * (1.0 - colorEdge * 0.05));
        float broadPaneRisk = body * smoothstep(0.24, 0.76, chromaIntensity + flowIntensity * 0.24 + wetBreakup * 0.18) * (1.0 - smoothstep(0.18, 0.62, marblePaint + abs(marbleVeins) * 0.42 + capillaryVeins * 0.18));
        vec3 calmMarbleRepair = technicolour(organicBand + calmSwirl * 0.11 + opalDepth * 0.08 + marblePaint * 0.15 + puddleSheet * 0.055 + pigmentPool * 0.045 + 0.18);
        color = mix(color, calmMarbleRepair, broadPaneRisk * artifactBreakup * 0.2 * (1.0 - colorEdge * 0.16));

        vec3 film = technicolour(organicBand + marbleVeins * 0.07 + puddleSheet * 0.1 + grazing * 0.34 + h * 0.15 + t * 0.01);
        color = mix(color, film, grazing * smoothstep(0.34, 1.05, h) * (0.014 + wetBreakup * 0.024 + puddleSheet * 0.004));
        float caustic = causticVeins(p, field, h, t, meta);
        float organicSheen = smoothstep(0.62, 0.9, noise(flowCoordinate(p, field, t, meta) * 2.8 + vec2(t * 0.024, meta.x)));
        color = mix(color, technicolour(organicBand + 0.36), organicSheen * body * 0.024);
        color += technicolour(organicBand + calmSwirl * 0.08 + opalDepth * 0.1 + 0.64) * calmInteriorMask * smoothstep(0.34, 0.78, opalDepth) * 0.024;
        color += vec3(1.0, 0.94, 0.66) * ((spec * 0.1 + fillSpec * 0.04) * (0.34 + wetBreakup * 0.32) + pinSpec * 0.2 + wet * 0.009);
        color += technicolour(organicBand + h * 0.05 + 0.42) * body * smoothstep(0.012, 0.03, abs(jellyBody)) * 0.024;
        color += technicolour(organicBand + marbleVeins * 0.04 + chromaRiver * 0.035 + puddleSheet * 0.03 + 0.38) * capillaryVeins * caustic * body * 0.04;
        color += technicolour(organicBand + marblePaint * 0.16 + puddleSheet * 0.04 + 0.2) * marblePaint * caustic * body * 0.06;
        color += mix(vec3(0.58, 0.95, 1.0), vec3(1.0, 0.75, 0.36), ribbonBlend) * caustic * 0.025;
        float smoothPaintHue = meta.y + hueDiffusion * 0.28 + pigmentPool * 0.04 + marblePaint * 0.08 + h * 0.018 + t * 0.003 * meta.z;
        vec3 diffusedPaint = technicolour(smoothPaintHue);
        color = mix(color, diffusedPaint, body * smoothstep(0.44, 1.05, field) * 0.24 * (1.0 - colorEdge * 0.08) * (1.0 - marblePaint * 0.62) * (0.72 + artifactBreakup * 0.2));
        color = mix(color, calmMarbleRepair, body * artifactBreakup * smoothstep(0.34, 0.92, field) * 0.07 * (1.0 - colorEdge * 0.14));
        vec3 seamFill = technicolour(organicBand + pigmentPool * 0.06 + marbleVeins * 0.035 + h * 0.04 + 0.16);
        color = mix(color, seamFill, mergeSeamMask * smoothstep(0.34, 0.72, field) * 0.055);
        vec3 edgeTint = technicolour(organicBand + field * 0.045 + h * 0.06 + t * 0.006 + 0.24);
        color = mix(color, edgeTint, colorEdge * (0.16 + hotRim * 0.1) * (1.0 - interiorInkMask * 0.38));
        vec3 rimRepairTint = technicolour(organicBand + calmSwirl * 0.08 + opalDepth * 0.05 + field * 0.035 + 0.2);
        color = mix(color, mix(edgeTint, rimRepairTint, 0.46), seamHeal * (0.24 + leftWallBias * 0.08) * (1.0 - interiorInkMask * 0.22));
        color = mix(color, technicolour(organicBand + field * 0.025 + t * 0.008), hotRim * 0.26);
        color += technicolour(organicBand + field * 0.018 + t * 0.007) * caustic * body * 0.055;
        color += vec3(1.0, 0.82, 0.38) * meniscus * body * 0.055;
        color += vec3(1.0, 0.92, 0.55) * beadSignal * 0.08;
        color += vec3(0.95, 0.84, 0.48) * max(rim, 0.0) * 0.08;

        vec2 studioQ = pigmentQ + vec2(h * 0.035, -field * 0.022);
        float studioPore = fbm(studioQ * 0.82 + vec2(t * 0.01, -t * 0.008) + meta.x * 0.4);
        float broadGlossPatch = smoothstep(0.52, 0.9, studioPore + wetBreakup * 0.22 + puddleSheet * 0.16) * body * smoothstep(0.48, 1.02, h);
        float sweptGloss = (1.0 - smoothstep(0.065, 0.28, abs(sin((studioQ.x * 0.38 + studioQ.y * 0.26 + calmSwirl * 0.18 + t * 0.018) * 6.28318))));
        sweptGloss *= smoothstep(0.44, 0.84, studioPore) * body * (1.0 - colorEdge * 0.18) * (0.72 + wetBreakup * 0.24);
        float convexRimLight = smoothstep(0.52, 0.88, curvature) * (rim * 0.52 + meniscus * 0.36 + hotRim * 0.18) * (1.0 - interiorInkMask * 0.3);
        vec3 warmStudioKey = vec3(1.0, 0.91, 0.64);
        vec3 coolStudioKick = technicolour(organicBand + opalDepth * 0.1 + calmSwirl * 0.08 + 0.58);
        color += warmStudioKey * (broadGlossPatch * 0.028 + sweptGloss * 0.024 + convexRimLight * 0.05);
        color = mix(color, coolStudioKick, (broadGlossPatch * 0.018 + sweptGloss * 0.016) * (0.7 + fill * 0.3));
        float studioContactDepth = contactFoot * (0.09 + (1.0 - diffuse) * 0.045) + bridgeMask * smoothstep(0.36, 0.74, field) * 0.014;
        color = mix(color, vec3(0.07, 0.045, 0.11), studioContactDepth);

        float centerFilm = smoothstep(0.62, 1.05, field) * body * (1.0 - colorEdge * 0.42);
        float thinMergeFilm = bridgeMask * smoothstep(0.48, 0.92, field) * (1.0 - meniscus * 0.35);
        float thickEdge = clamp(colorEdge * 0.3 + rim * 0.24 + meniscus * 0.2 + hotRim * 0.11 + contactFoot * 0.08 + seamHeal * 0.13, 0.0, 0.27);
        float jellyAlpha = clamp(0.9 - centerFilm * 0.045 - thinMergeFilm * 0.02 + thickEdge + wet * 0.02 + seamHeal * 0.03, 0.84, 0.985);
        vec3 subsurfaceTint = technicolour(organicBand + pigmentPool * 0.05 + h * 0.06 + 0.18);
        color = mix(color, subsurfaceTint, (1.0 - jellyAlpha) * body * 0.24);
        color = naturalSaturate(color, 1.035);

        gl_FragColor = vec4(pow(color, vec3(0.9)), jellyAlpha);
      }
    `,
  }) as SlimeUnionMaterial
}

function createFastSlimeUnionMaterial(): SlimeUnionMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    alphaTest: 0.05,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uBlobData: { value: SLIME_BLOBS.map(() => new THREE.Vector4()) },
      uBlobMeta: { value: SLIME_BLOBS.map((blob) => new THREE.Vector4(blob.seed, blob.palette, blob.flow, blob.breath)) },
      uBlobState: { value: SLIME_BLOBS.map(() => new THREE.Vector4()) },
    },
    vertexShader: `
      #define BLOB_COUNT 7

      uniform float uTime;
      uniform float uAspect;
      uniform vec4 uBlobData[BLOB_COUNT];
      uniform vec4 uBlobState[BLOB_COUNT];
      varying vec2 vWorld;
      varying float vLift;

      float blobField(vec2 p, vec4 data, vec4 state, float index) {
        vec2 local = (p - data.xy) / max(data.zw, vec2(0.001));
        float angle = atan(local.y, local.x);
        float wobble = sin(angle * 2.0 + uTime * 0.42 + index) * 0.045 +
          sin(angle * 3.0 - uTime * 0.31 + index * 1.7) * 0.025;
        float radius = length(local * vec2(0.86 + state.z * 0.08, 1.05 - state.w * 0.05));
        return exp(-(radius - wobble) * (radius - wobble) * 1.82) * (0.84 + state.x * 0.14);
      }

      float bridgeField(vec2 p, vec4 a, vec4 b, vec4 stateA, vec4 stateB) {
        float mergeLife = max(stateA.x, stateB.x);
        float centerDistance = length(a.xy - b.xy);
        float reach = (a.z + b.z) * 0.58;
        float close = 1.0 - smoothstep(reach * 0.58, reach * 0.98, centerDistance);
        vec2 ba = b.xy - a.xy;
        float h = clamp(dot(p - a.xy, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
        float waist = sin(h * 3.14159);
        vec2 normal = normalize(vec2(-ba.y, ba.x) + vec2(0.0001));
        vec2 center = mix(a.xy, b.xy, h) + normal * waist * sin(uTime * 0.18 + a.x * 2.4 - b.y) * 0.07;
        float width = min(min(a.z, a.w), min(b.z, b.w)) * (0.18 + pow(max(waist, 0.0), 0.72) * 0.2);
        float neck = 1.0 - smoothstep(width, width + 0.09, length(p - center));
        float knot = 1.0 - smoothstep(width * 0.82, width * 0.82 + 0.1, length(p - (mix(a.xy, b.xy, 0.5) + normal * 0.06)));
        return max(neck * 0.22, knot * 0.18) * close * mergeLife;
      }

      float unionField(vec2 p) {
        float field = 0.0;
        for (int i = 0; i < BLOB_COUNT; i++) {
          field = max(field, blobField(p, uBlobData[i], uBlobState[i], float(i)));
        }
        field = max(field, bridgeField(p, uBlobData[0], uBlobData[1], uBlobState[0], uBlobState[1]));
        field = max(field, bridgeField(p, uBlobData[2], uBlobData[4], uBlobState[2], uBlobState[4]));
        field = max(field, bridgeField(p, uBlobData[3], uBlobData[4], uBlobState[3], uBlobState[4]));
        field = max(field, bridgeField(p, uBlobData[3], uBlobData[6], uBlobState[3], uBlobState[6]));
        field = max(field, bridgeField(p, uBlobData[5], uBlobData[6], uBlobState[5], uBlobState[6]));
        return field;
      }

      void main() {
        vWorld = vec2((uv.x * 2.0 - 1.0) * uAspect, uv.y * 2.0 - 1.0);
        vec3 p = position;
        float field = unionField(vWorld);
        float body = smoothstep(0.42, 0.66, field);
        float rim = smoothstep(0.26, 0.46, field) - smoothstep(0.58, 0.82, field);
        vLift = body * 0.02 + rim * 0.036;
        p.z += vLift;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      #define BLOB_COUNT 7

      precision highp float;

      uniform float uTime;
      uniform float uAspect;
      uniform vec4 uBlobData[BLOB_COUNT];
      uniform vec4 uBlobMeta[BLOB_COUNT];
      uniform vec4 uBlobState[BLOB_COUNT];
      varying vec2 vWorld;
      varying float vLift;

      float hash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 74.7);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      vec3 technicolour(float t) {
        vec3 a = vec3(0.08, 0.72, 0.86);
        vec3 b = vec3(0.82, 0.28, 0.74);
        vec3 c = vec3(0.96, 0.52, 0.22);
        vec3 d = vec3(0.24, 0.78, 0.42);
        vec3 e = vec3(0.42, 0.32, 0.9);
        float k = fract(t);
        if (k < 0.2) return mix(a, b, smoothstep(0.0, 0.2, k));
        if (k < 0.4) return mix(b, c, smoothstep(0.2, 0.4, k));
        if (k < 0.6) return mix(c, d, smoothstep(0.4, 0.6, k));
        if (k < 0.8) return mix(d, e, smoothstep(0.6, 0.8, k));
        return mix(e, a, smoothstep(0.8, 1.0, k));
      }

      float blobField(vec2 p, vec4 data, vec4 state, float index) {
        vec2 local = (p - data.xy) / max(data.zw, vec2(0.001));
        float angle = atan(local.y, local.x);
        float radius = length(local * vec2(0.84 + state.z * 0.08, 1.04 - state.w * 0.05));
        float wobble = sin(angle * 2.0 + uTime * 0.42 + index) * 0.05 +
          sin(angle * 3.0 - uTime * 0.31 + index * 1.7) * 0.028 +
          (noise(local * 2.2 + vec2(uTime * 0.035, index)) - 0.5) * 0.04;
        return exp(-(radius - wobble) * (radius - wobble) * 1.82) * (0.84 + state.x * 0.14);
      }

      float bridgeField(vec2 p, vec4 a, vec4 b, vec4 stateA, vec4 stateB) {
        float mergeLife = max(stateA.x, stateB.x);
        float centerDistance = length(a.xy - b.xy);
        float reach = (a.z + b.z) * 0.58;
        float close = 1.0 - smoothstep(reach * 0.58, reach * 0.98, centerDistance);
        vec2 ba = b.xy - a.xy;
        float h = clamp(dot(p - a.xy, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
        float waist = sin(h * 3.14159);
        vec2 normal = normalize(vec2(-ba.y, ba.x) + vec2(0.0001));
        vec2 center = mix(a.xy, b.xy, h) + normal * waist * sin(uTime * 0.18 + a.x * 2.4 - b.y) * 0.07;
        float width = min(min(a.z, a.w), min(b.z, b.w)) * (0.18 + pow(max(waist, 0.0), 0.72) * 0.2);
        float neck = 1.0 - smoothstep(width, width + 0.09, length(p - center));
        float knot = 1.0 - smoothstep(width * 0.82, width * 0.82 + 0.1, length(p - (mix(a.xy, b.xy, 0.5) + normal * 0.06)));
        return max(neck * 0.22, knot * 0.18) * close * mergeLife;
      }

      float bridgeOnly(vec2 p) {
        float bridge = 0.0;
        bridge = max(bridge, bridgeField(p, uBlobData[0], uBlobData[1], uBlobState[0], uBlobState[1]));
        bridge = max(bridge, bridgeField(p, uBlobData[2], uBlobData[4], uBlobState[2], uBlobState[4]));
        bridge = max(bridge, bridgeField(p, uBlobData[3], uBlobData[4], uBlobState[3], uBlobState[4]));
        bridge = max(bridge, bridgeField(p, uBlobData[3], uBlobData[6], uBlobState[3], uBlobState[6]));
        bridge = max(bridge, bridgeField(p, uBlobData[5], uBlobData[6], uBlobState[5], uBlobState[6]));
        return bridge;
      }

      void main() {
        float field = 0.0;
        float hue = 0.0;
        float weightSum = 0.0;
        for (int i = 0; i < BLOB_COUNT; i++) {
          float blob = blobField(vWorld, uBlobData[i], uBlobState[i], float(i));
          field = max(field, blob);
          float weight = blob * blob;
          hue += (uBlobMeta[i].y + float(i) * 0.035) * weight;
          weightSum += weight;
        }
        float bridge = bridgeOnly(vWorld);
        field = max(field, bridge);
        if (field < 0.26) discard;

        float h = hue / max(weightSum, 0.001);
        vec2 flow = vWorld + vec2(
          sin(vWorld.y * 1.4 + uTime * 0.06 + h * 6.28318) * 0.12,
          cos(vWorld.x * 1.1 - uTime * 0.045 + h * 4.0) * 0.09
        );
        float pool = noise(flow * 1.1 + vec2(uTime * 0.012, -uTime * 0.01));
        float marble = sin((flow.x * 0.75 + flow.y * 1.08 + pool * 0.7 - uTime * 0.05 + h) * 6.28318);
        float body = smoothstep(0.42, 0.66, field);
        float rim = smoothstep(0.27, 0.45, field) - smoothstep(0.58, 0.82, field);
        float inner = smoothstep(0.55, 0.96, field);

        vec3 base = technicolour(h + marble * 0.035 + pool * 0.045 + uTime * 0.002);
        vec3 glaze = technicolour(h + 0.18 + sin(uTime * 0.018 + pool) * 0.04);
        vec3 color = mix(base, glaze, inner * 0.18);
        float shade = mix(0.72, 1.08, smoothstep(0.34, 0.88, field));
        color *= shade;
        color += vec3(0.92, 0.84, 0.48) * rim * 0.22;
        color += vec3(0.72, 0.96, 1.0) * smoothstep(0.76, 0.96, pool) * body * 0.05;
        color = mix(color, vec3(0.13, 0.08, 0.2), (1.0 - body) * 0.24);

        float alpha = clamp(0.86 + rim * 0.11 + body * 0.08 - bridge * 0.03, 0.72, 0.97);
        gl_FragColor = vec4(pow(color, vec3(0.92)), alpha);
      }
    `,
  }) as SlimeUnionMaterial
}

function createContactShadowMaterial(): ContactShadowMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uBlobData: { value: SLIME_BLOBS.map(() => new THREE.Vector4()) },
      uBlobMeta: { value: SLIME_BLOBS.map((blob) => new THREE.Vector4(blob.seed, blob.palette, blob.flow, blob.breath)) },
      uBlobState: { value: SLIME_BLOBS.map(() => new THREE.Vector4()) },
    },
    vertexShader: `
      uniform float uAspect;
      varying vec2 vWorld;

      void main() {
        vWorld = vec2((uv.x * 2.0 - 1.0) * uAspect, uv.y * 2.0 - 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      #define BLOB_COUNT 7

      precision highp float;

      uniform float uTime;
      uniform vec4 uBlobData[BLOB_COUNT];
      uniform vec4 uBlobMeta[BLOB_COUNT];
      uniform vec4 uBlobState[BLOB_COUNT];
      varying vec2 vWorld;

      float hash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 74.7);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float smoothMax(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(a, b, h) + k * h * (1.0 - h);
      }

      float blobContactField(vec2 p, vec4 data, vec4 state) {
        vec2 local = (p - data.xy) / max(data.zw, vec2(0.001));
        float core = exp(-dot(local / vec2(0.9, 0.64), local / vec2(0.9, 0.64)) * 1.45);
        float footprint = 1.0 - smoothstep(0.34, 1.18, length(local * vec2(0.72, 1.14)));
        float lowerMass = (1.0 - smoothstep(-0.84, -0.08, local.y)) * footprint;
        return core + lowerMass * 0.18 + state.x * 0.08;
      }

      float bridgeContactField(vec2 p, vec4 a, vec4 b, vec4 stateA, vec4 stateB) {
        float mergeLife = max(stateA.x, stateB.x);
        float centerDistance = length(a.xy - b.xy);
        float reach = (a.z + b.z) * 0.66;
        float close = 1.0 - smoothstep(reach * 0.72, reach * 1.06, centerDistance);
        vec2 ba = b.xy - a.xy;
        float h = clamp(dot(p - a.xy, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
        float waist = sin(h * 3.14159);
        vec2 normal = normalize(vec2(-ba.y, ba.x) + vec2(0.0001));
        vec2 center = mix(a.xy, b.xy, h) + normal * sin(h * 3.14159) * (sin((a.x + b.y) * 3.1 + uTime * 0.16) * 0.04);
        float width = min(min(a.z, a.w), min(b.z, b.w)) * (0.4 + waist * 0.3);
        vec2 middleCenter = mix(a.xy, b.xy, 0.5) + normal * sin((a.x + b.y) * 3.1 + uTime * 0.16) * 0.04;
        return (1.0 - smoothstep(width * 1.0, width * 1.0 + 0.08, length(p - middleCenter))) * close * mergeLife * 0.36;
      }

      float contactUnion(vec2 p) {
        float field = 0.0;
        for (int i = 0; i < BLOB_COUNT; i++) {
          field = smoothMax(field, blobContactField(p, uBlobData[i], uBlobState[i]), 0.16 + uBlobState[i].x * 0.05);
        }
        field = smoothMax(field, bridgeContactField(p, uBlobData[0], uBlobData[1], uBlobState[0], uBlobState[1]), 0.15);
        field = smoothMax(field, bridgeContactField(p, uBlobData[2], uBlobData[4], uBlobState[2], uBlobState[4]), 0.15);
        field = smoothMax(field, bridgeContactField(p, uBlobData[3], uBlobData[4], uBlobState[3], uBlobState[4]), 0.15);
        field = smoothMax(field, bridgeContactField(p, uBlobData[3], uBlobData[6], uBlobState[3], uBlobState[6]), 0.15);
        field = smoothMax(field, bridgeContactField(p, uBlobData[5], uBlobData[6], uBlobState[5], uBlobState[6]), 0.15);
        return field;
      }

      void main() {
        vec2 samplePoint = vWorld - vec2(0.04, -0.052);
        float field = contactUnion(samplePoint);
        float body = smoothstep(0.22, 0.72, field);
        float edge = smoothstep(0.2, 0.44, field) - smoothstep(0.58, 0.88, field);
        float mottled = noise(samplePoint * 3.6 + vec2(uTime * 0.008, -uTime * 0.006));
        float alpha = body * 0.22 + edge * 0.075;
        alpha *= 0.72 + mottled * 0.18;
        if (alpha < 0.012) discard;
        gl_FragColor = vec4(vec3(0.14, 0.076, 0.23), alpha * 0.82);
      }
    `,
  }) as ContactShadowMaterial
}

function createTrailMaterial(): TrailMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uTrailData: { value: Array.from({ length: TRAIL_COUNT }, () => new THREE.Vector4()) },
      uTrailMeta: { value: Array.from({ length: TRAIL_COUNT }, () => new THREE.Vector4()) },
    },
    vertexShader: `
      uniform float uAspect;
      varying vec2 vWorld;

      void main() {
        vWorld = vec2((uv.x * 2.0 - 1.0) * uAspect, uv.y * 2.0 - 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      #define TRAIL_COUNT 21

      precision highp float;

      uniform float uTime;
      uniform vec4 uTrailData[TRAIL_COUNT];
      uniform vec4 uTrailMeta[TRAIL_COUNT];
      varying vec2 vWorld;

      float hash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 74.7);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      vec3 technicolour(float t) {
        vec3 a = vec3(0.08, 0.72, 0.86);
        vec3 b = vec3(0.88, 0.17, 0.58);
        vec3 c = vec3(0.98, 0.77, 0.16);
        vec3 d = vec3(0.22, 0.78, 0.36);
        vec3 e = vec3(0.38, 0.22, 0.88);
        float k = fract(t);
        if (k < 0.2) return mix(a, b, smoothstep(0.0, 0.2, k));
        if (k < 0.4) return mix(b, c, smoothstep(0.2, 0.4, k));
        if (k < 0.6) return mix(c, d, smoothstep(0.4, 0.6, k));
        if (k < 0.8) return mix(d, e, smoothstep(0.6, 0.8, k));
        return mix(e, a, smoothstep(0.8, 1.0, k));
      }

      void main() {
        float film = 0.0;
        vec3 tint = vec3(0.0);
        for (int i = 0; i < TRAIL_COUNT; i++) {
          vec4 data = uTrailData[i];
          vec4 meta = uTrailMeta[i];
          vec2 local = (vWorld - data.xy) / max(data.zw, vec2(0.001));
          vec2 warped = local + vec2(sin(local.y * 1.7 + meta.z) * 0.08, cos(local.x * 1.3 - meta.z) * 0.06);
          float radius = length(warped * vec2(0.82, 1.14));
          float angle = atan(warped.y, warped.x);
          float footprint = 1.0 - smoothstep(0.34, 1.0, radius);
          float rim = smoothstep(0.38, 0.74, radius) * (1.0 - smoothstep(0.74, 1.02, radius));
          float islandNoise = noise(warped * 3.6 + vec2(meta.z, uTime * 0.006));
          float beadNoise = noise(vec2(cos(angle) * 2.8 + meta.z, sin(angle) * 2.8 - meta.z + uTime * 0.004));
          float bead = smoothstep(0.62, 0.92, beadNoise) * rim;
          float roundedStrand = (1.0 - smoothstep(0.035, 0.18, abs(sin((radius * 1.9 + angle * 0.18 + meta.z) * 6.28318)))) * rim * smoothstep(0.4, 0.88, islandNoise);
          float pooled = footprint * smoothstep(0.22, 0.78, islandNoise);
          float mark = (pooled * 0.22 + bead * 0.4 + roundedStrand * 0.12) * meta.y;
          film += mark;
          tint += technicolour(meta.x + meta.z * 0.013) * mark;
        }
        if (film < 0.03) discard;
        vec3 color = mix(vec3(0.034, 0.025, 0.043), tint / max(film, 0.001), 0.075);
        float alpha = clamp(film * 0.014, 0.0, 0.034);
        gl_FragColor = vec4(pow(color, vec3(0.95)), alpha);
      }
    `,
  }) as TrailMaterial
}

function PsychedelicMap() {
  const material = useMemo(() => createMapMaterial(), [])
  const { viewport } = useThree()

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uAspect.value = viewport.width / Math.max(viewport.height, 0.001)
  })

  return (
    <mesh scale={[viewport.width * STAGE_FILL, viewport.height * STAGE_FILL, 1]} renderOrder={0}>
      <planeGeometry args={[1, 1, ...LIQUID_QUALITY.mapSegments]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

function SlimeUnionSurface() {
  const material = useMemo(() => createFastSlimeUnionMaterial(), [])
  const { viewport } = useThree()

  useFrame(({ clock }) => {
    syncBlobRuntimeUniforms(material.uniforms, viewport, clock.elapsedTime)
  })

  return (
    <mesh position={[0, 0, 0.06]} scale={[viewport.width, viewport.height, 1]} renderOrder={20}>
      <planeGeometry args={[1, 1, ...LIQUID_QUALITY.slimeSegments]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

function SlimeContactShadow() {
  const material = useMemo(() => createContactShadowMaterial(), [])
  const { viewport } = useThree()

  useFrame(({ clock }) => {
    syncBlobRuntimeUniforms(material.uniforms, viewport, clock.elapsedTime)
  })

  return (
    <mesh scale={[viewport.width, viewport.height, 1]} renderOrder={5}>
      <planeGeometry args={[1, 1, ...LIQUID_QUALITY.shadowSegments]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

function SlimeTrailFilm() {
  const material = useMemo(() => createTrailMaterial(), [])
  const { viewport } = useThree()

  useFrame(({ clock }) => {
    syncTrailUniforms(material.uniforms, viewport, clock.elapsedTime)
  })

  return (
    <mesh scale={[viewport.width, viewport.height, 1]} renderOrder={4}>
      <planeGeometry args={[1, 1, ...LIQUID_QUALITY.trailSegments]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

function LiquidPerformanceTelemetry() {
  const sample = useRef({ frames: 0, elapsed: 0, maxFrameMs: 0 })

  useFrame((_, delta) => {
    const frameMs = delta * 1000
    sample.current.frames += 1
    sample.current.elapsed += delta
    sample.current.maxFrameMs = Math.max(sample.current.maxFrameMs, frameMs)
    if (sample.current.elapsed >= 1) {
      const fps = sample.current.frames / sample.current.elapsed
      const stats = window.__LIQUID_LAB_STATS__
      if (stats) {
        stats.perf = {
          fps: Number(fps.toFixed(1)),
          frameMs: Number((1000 / Math.max(fps, 0.001)).toFixed(1)),
          maxFrameMs: Number(sample.current.maxFrameMs.toFixed(1)),
        }
      }
      sample.current.frames = 0
      sample.current.elapsed = 0
      sample.current.maxFrameMs = 0
    }
  })

  return null
}

function SlimeMapScene() {
  return (
    <>
      <PsychedelicMap />
      {LIQUID_QUALITY.trailEnabled ? <SlimeTrailFilm /> : null}
      <SlimeContactShadow />
      <SlimeUnionSurface />
      <LiquidPerformanceTelemetry />
    </>
  )
}

function CameraRig() {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(0, -2.35, 8.1)
    camera.lookAt(0, 0, 0)
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = 96
      camera.near = -20
      camera.far = 30
      camera.updateProjectionMatrix()
    }
  }, [camera])

  return null
}

export function LiquidLab() {
  useEffect(() => {
    window.__LIQUID_LAB_STATS__ = {
      mode: 'psychedelic-slime-map',
      slimeOnly: true,
      gameplayRemoved: true,
      vacuumMounted: false,
      techniques: ['psychedelic-map-travel', 'single-field-soft-union', 'contact-merge-bridges', 'natural-breathing-scale', 'non-overlap-union-surface', 'asymmetric-soft-lobes', 'viscous-merge-necks', 'meniscus-contact-foot', 'pooled-pigment-lamellae', 'gravity-sagged-mass', 'pressure-weighted-contact', 'shared-contact-shadow-field', 'pseudopod-edge-growth', 'rim-bead-meniscus', 'capillary-residue-film', 'mass-weighted-pigment-pools', 'adhesive-booger-crawl', 'mucus-anchor-drag', 'pause-snap-stick-slip', 'lumpy-surface-tension-recoil', 'clumped-booger-coalescence', 'tacky-pinch-stretch', 'viscous-inertia-lag', 'stick-slip-crawl-pulses', 'velocity-squash-stretch', 'strain-weighted-edge-creep', 'tacky-neck-stringers', 'slime-settle-contact-slump', 'elastic-jelly-rebound', 'secondary-surface-wobble', 'phase-lagged-gelatin-shear', 'springy-volume-squash', 'irregular-mucus-surface-pulses', 'asymmetric-contact-sag', 'soft-jelly-translucency', 'edge-thickened-opacity', 'subsurface-color-depth', 'jelly-opacity-artifact-shield', 'rim-continuity-field', 'left-wall-seam-healing', 'meniscus-gap-repair', 'edge-alpha-stitching', 'calm-psychedelic-interior-mixing', 'slow-opalescent-hue-breathing', 'counter-swirl-color-eddies', 'pearlescent-depth-glaze', 'subtle-prismatic-chroma-exchange', 'soft-aurora-interior-wash', 'calm-artifact-breakup', 'broad-pane-marble-repair', 'no-digital-artwork-overlay', 'softened-map-landmarks', 'low-contrast-pigment-breathing', 'organic-chroma-panel-diffusion', 'convection-palette-advection', 'continuous-organic-color-fields', 'curved-hue-diffusion', 'palette-gradient-smoothing', 'soft-blended-blob-metadata', 'merged-color-identity-blending', 'sine-ribbon-attenuation', 'bridge-tint-suppression', 'soft-film-lane-suppression', 'wet-paint-diffusion-wash', 'no-hard-internal-color-planes', 'marble-preserving-diffusion-wash', 'pressure-blended-pigment', 'psychedelic-wax-spectrum', 'curl-noise-pigment-advection', 'laminar-chroma-braids', 'meniscus-hue-wrapping', 'selective-psychedelic-saturation', 'opaque-pigment-body-depth', 'capillary-spectral-veins', 'broken-wet-highlight-films', 'eddy-carried-color-strands', 'dull-body-chroma-rescue', 'original-puddle-sheet-flow', 'marble-vein-recirculation', 'shallow-pool-lamellae', 'puddle-marble-height-coupling', 'smooth-panel-marble-rescue', 'marbled-paint-interior', 'combed-pigment-veins', 'soft-oil-marble-whorls', 'puddle-marble-paint-revival', 'warped-core-blob-space', 'asymmetric-lobe-breakup', 'overlap-oval-ink-suppression', 'stiff-oval-rim-dissolve', 'black-outline-free-slime', 'colored-meniscus-rims', 'soft-violet-contact-shadow', 'curved-puddle-ring-breakup', 'anti-shard-marble-breakup', 'rounded-internal-film-streaks', 'rounded-panel-breakup', 'organic-residue-beads', 'short-memory-contact-residue', 'contact-distance-merge-gating', 'center-biased-wax-necks', 'curved-pigment-ribbon-softening', 'interior-seam-ink-suppression', 'merge-corridor-outline-mask', 'colored-wet-seam-fill', 'oblique-2.5d-camera', 'tactile-height-field', 'rolling-3d-boundaries', 'grounded-blob-shadows', 'orthographic-slime-map', 'independent-living-blobs', 'advected-surface-sheen', 'thin-film-lighting', 'soft-caustic-pools', 'mineral-bloom', 'soft-color-map-contours', 'aaa-polish-pass', 'full-bleed-stage-fill', 'studio-terrain-depth', 'embossed-landmark-silhouettes', 'cinematic-slime-lighting', 'layered-wet-specular', 'polished-contact-grounding', 'residue-glaze-depth', 'slack-lobed-merge-necks', 'anti-sausage-bridge-shaping', 'pinched-knot-merge-necks', 'performance-first-default', 'fast-slime-union-shader', 'clamped-dpr', 'reduced-geometry-budget', 'trail-pass-disabled'],
      palette: 'psychedelic-map-technicolour',
      blobCount: SLIME_BLOBS.length,
      mapPlane: 'oblique-2.5d-orthographic',
      textureMode: 'puddle-marble-combed-paint-rivers',
      interiorMode: 'calm-opalescent-counter-swirl-marbling',
      overlayMode: 'artwork-only-no-digital-overlay',
      translucencyMode: 'soft-jelly-center-with-thick-colored-rims',
      boundaryMotion: 'sticky-meniscus-edge-creep',
      motionMode: 'adhesive-jiggly-slime-booger-crawl-coalescence',
      mergeMode: 'bulb-neck-soft-union',
      renderModel: 'one-composited-slime-field',
      organicModel: 'viscous-mucus-adhesion-surface-tension',
      shadowModel: 'shared-union-contact-shadow',
      growthModel: 'strain-weighted-pseudopod-film',
      performanceMode: 'performance-first-default',
      qualityMode: 'fast-studio-slime',
      dpr: LIQUID_QUALITY.dpr,
      geometryBudget: {
        map: LIQUID_QUALITY.mapSegments,
        slime: LIQUID_QUALITY.slimeSegments,
        shadow: LIQUID_QUALITY.shadowSegments,
        trail: LIQUID_QUALITY.trailSegments,
        trailCount: TRAIL_COUNT,
        trailEnabled: LIQUID_QUALITY.trailEnabled,
      },
    }
  }, [])

  return (
    <main className="slimeRebuild">
      <Canvas orthographic camera={{ position: [0, -2.35, 8.1], zoom: 96, near: -20, far: 30 }} dpr={LIQUID_QUALITY.dpr} gl={{ antialias: false, powerPreference: 'high-performance' }}>
        <color attach="background" args={['#171222']} />
        <CameraRig />
        <SlimeMapScene />
      </Canvas>
    </main>
  )
}
