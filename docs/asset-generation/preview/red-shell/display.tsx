'use client'

import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import {
  GlowbudTraitAvatarAsset,
  type GlowbudBackgroundTrait,
  type GlowbudHeadTrait,
  type GlowbudShellTrait,
  type GlowbudTraitLoadout,
  type RedShellCritterAnimation,
} from '../../code-examples/RedShellIdleCritterAsset.example'
import {
  GlowbudWardrobe,
  type GlowbudWardrobeCategory,
} from './GlowbudWardrobe'
import {
  GlowbudWalletVault,
  type GlowbudWalletVaultStatus,
  type OwnedGlowbudPreview,
} from './GlowbudWalletVault'
import {
  composeGlowbudDisplayTraits,
  type GlowbudSourceAttribute,
} from './glowbudsDisplayMapping'
import { useGlowbudDisplayAudio } from './glowbudsDisplayAudio'
import {
  connectGlowbudWallet,
  discoverGlowbudWallets,
  normalizeGlowbudWalletAddress,
  readConnectedGlowbudWallet,
  subscribeToGlowbudWallet,
  type GlowbudWalletOption,
  type GlowbudWalletProvider,
} from './glowbudsWalletClient'
import type {
  GlowbudWalletOwnership,
  GlowbudWalletOwnershipSource,
} from './glowbudsWalletOwnership'
import {
  GLOWBUD_CATEGORY_LABELS,
  GLOWBUD_PLAYER_CATEGORIES,
  GLOWBUD_TRAIT_QUERY_KEYS,
  createNakedGlowbudBaseline,
  glowbudTraitLabel,
  glowbudTraitOptions,
  randomGlowbudTraits,
  readGlowbudCustomTraits,
  writeGlowbudCustomTraits,
  type GlowbudTraitCategory,
} from './glowbudsTraitCatalog'
import rawTokenIndex from './glowbudsTokenIndex.json'

type CompactAttribute = [string, string]

type CameraNudge = {
  sequence: number
  horizontal: -1 | 0 | 1
  vertical: -1 | 0 | 1
}

type DisplayCameraView = {
  yaw?: number
  pitch?: number
  roll?: number
  zoom?: number
}

type DisplayMode = 'collection' | 'create'

type DressingCeremonyCategory = GlowbudTraitCategory | 'look'

type DressingCeremony = {
  sequence: number
  category: DressingCeremonyCategory
  categoryLabel: string
  traitLabel: string
}

type OpenSeaOwner = {
  address: string
  username: string | null
  profileUrl: string
}

type OwnerState = {
  tokenId: number | null
  status: 'idle' | 'loading' | 'ready' | 'unavailable'
  owner: OpenSeaOwner | null
}

type ConnectedGlowbudWallet = {
  address: string
  label: string
  provider: GlowbudWalletProvider | null
}

type GlowbudsTokenIndex = {
  source: {
    collectionName: string
    contract: string
    tokenRange: [number, number]
    metadataBase: string
    imageBase: string | null
  }
  tokens: Record<string, CompactAttribute[]>
}

type RoomPalette = {
  wall: string
  panel: string
  floor: string
  platform: string
  platformBand: string
  arch: string
  archBand: string
  lamp: string
  shadow: string
}

const tokenIndex = rawTokenIndex as unknown as GlowbudsTokenIndex
const DEFAULT_TOKEN_ID = 1677
const CUSTOM_LOOK_STORAGE_KEY = 'glowbuds-3d.custom-look.v1'
const DISPLAY_AVATAR_SCALE = 1.08
const DRESSING_CEREMONY_DURATION = 1760
const DIRECTED_ANIMATION_DURATIONS: Record<RedShellCritterAnimation, number> = {
  idle: 0,
  hop: 1460,
  grumble: 2660,
  wave: 2200,
  boogie: 2880,
  showcase: 3940,
}
const DRESSING_ACCENTS: Record<DressingCeremonyCategory, [string, string]> = {
  background: ['#ffe881', '#7ee9da'],
  shell: ['#ff7fb6', '#fff0a6'],
  head: ['#8df0a5', '#fff08f'],
  pot: ['#f7a262', '#ffd66f'],
  companion: ['#79e7da', '#ff9bc2'],
  held: ['#ffe16f', '#91c7ff'],
  eyes: ['#b79cff', '#fff5ba'],
  mouth: ['#ff8d9f', '#fff0b7'],
  nose: ['#ffb37b', '#ffe58c'],
  skin: ['#7fe7d8', '#ffb4d0'],
  face: ['#b79cff', '#ffb4d0'],
  flytrap: ['#8bea91', '#ff8d9f'],
  look: ['#ffe16f', '#70dfcb'],
}
const ROOM_PALETTES: Record<GlowbudBackgroundTrait, RoomPalette> = {
  blue: {
    wall: '#a9bfd7',
    panel: '#f2d47e',
    floor: '#6e7f9f',
    platform: '#f2bcd2',
    platformBand: '#64d5c1',
    arch: '#f2d47e',
    archBand: '#64d5c1',
    lamp: '#fff1ad',
    shadow: '#39445b',
  },
  yellow: {
    wall: '#eadb9f',
    panel: '#e9a8c8',
    floor: '#718e7a',
    platform: '#9dded2',
    platformBand: '#c9719d',
    arch: '#e9a8c8',
    archBand: '#9dded2',
    lamp: '#fff2b5',
    shadow: '#5f654d',
  },
  green: {
    wall: '#a8c995',
    panel: '#f1c578',
    floor: '#61758d',
    platform: '#e7acc5',
    platformBand: '#70ddd1',
    arch: '#f1c578',
    archBand: '#70ddd1',
    lamp: '#fff0a8',
    shadow: '#374d42',
  },
  purple: {
    wall: '#afa0d1',
    panel: '#f0ce79',
    floor: '#667d83',
    platform: '#efb3c9',
    platformBand: '#6dd7c0',
    arch: '#f0ce79',
    archBand: '#6dd7c0',
    lamp: '#fff0aa',
    shadow: '#463c5e',
  },
  red: {
    wall: '#d1a0a6',
    panel: '#efd37e',
    floor: '#647e7a',
    platform: '#a9c4e3',
    platformBand: '#74d7bd',
    arch: '#efd37e',
    archBand: '#74d7bd',
    lamp: '#fff0ac',
    shadow: '#5d3d45',
  },
}

const TALL_HEADS = new Set<GlowbudHeadTrait>([
  'sunflower',
  'douglas',
  'myrtle',
  'bonsai',
  'bonsai-sakura',
  'palm-tree',
])

const TALL_SHELLS = new Set<GlowbudShellTrait>([
  'guard-shell',
  'robot-shell',
  'shark-shell',
  'horny-shell',
  'raddish-shell',
])

function avatarDisplayScale(head: GlowbudHeadTrait) {
  if (TALL_HEADS.has(head)) return 0.9
  if (head === 'venus-flytrap' || head === 'lotus') return 1.02
  return DISPLAY_AVATAR_SCALE
}

const GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/',
]

const LOOK_LINE_CATEGORIES = ['Plant', 'Shell', 'Pot', 'Item', 'Companion', 'Type']

function readInitialTokenId() {
  const requested = Number.parseInt(new URLSearchParams(window.location.search).get('token') ?? '', 10)
  return requested >= tokenIndex.source.tokenRange[0] && requested <= tokenIndex.source.tokenRange[1]
    ? requested
    : DEFAULT_TOKEN_ID
}

function readInitialAnimation(): RedShellCritterAnimation {
  const requested = new URLSearchParams(window.location.search).get('animation')
  return requested === 'hop'
    || requested === 'grumble'
    || requested === 'wave'
    || requested === 'boogie'
    || requested === 'showcase'
    ? requested
    : 'idle'
}

function readAutomaticPerformanceEnabled() {
  return !new URLSearchParams(window.location.search).has('animation')
}

function readInitialFlag(name: string, fallback = false) {
  const requested = new URLSearchParams(window.location.search).get(name)
  if (requested === null) return fallback
  return requested === '1' || requested === 'true'
}

function readInitialMode(): DisplayMode {
  const requested = new URLSearchParams(window.location.search).get('mode')
  if (requested === 'collection') return 'collection'
  if (requested === 'create') return 'create'
  return window.location.pathname.endsWith('/wardrobe.html')
    || window.location.pathname.replace(/\/+$/, '') === '/wardrobe'
    ? 'create'
    : 'collection'
}

function displayRoutePath(displayMode: DisplayMode) {
  const pathname = window.location.pathname.replace(/\/+$/, '')
  if (pathname === '/wardrobe') return '/wardrobe'
  const routeName = displayMode === 'create' ? 'wardrobe.html' : 'display.html'
  return window.location.pathname.replace(/[^/]*$/, routeName)
}

function sourceAttributesFor(tokenId: number): GlowbudSourceAttribute[] {
  return (tokenIndex.tokens[String(tokenId)] ?? []).map(([trait_type, value]) => ({
    trait_type,
    value,
  }))
}

function sourceTraitsFor(tokenId: number) {
  return composeGlowbudDisplayTraits(sourceAttributesFor(tokenId)).traits
}

function glowbudLookLine(attributes: GlowbudSourceAttribute[]) {
  const values = LOOK_LINE_CATEGORIES.flatMap((category) =>
    attributes
      .filter((attribute) => attribute.trait_type === category)
      .map((attribute) => attribute.value),
  )
  return [...new Set(values)].slice(0, 3).join(' / ')
}

function readSavedCustomTraits(fallback: GlowbudTraitLoadout) {
  try {
    const stored = window.localStorage.getItem(CUSTOM_LOOK_STORAGE_KEY)
    if (!stored) return fallback
    const rawTraits = JSON.parse(stored) as Partial<Record<keyof GlowbudTraitLoadout, string>>
    const params = new URLSearchParams()
    for (const category of GLOWBUD_TRAIT_QUERY_KEYS) {
      const value = rawTraits[category]
      if (value) params.set(category, value)
    }
    return readGlowbudCustomTraits(params.toString(), fallback)
  } catch {
    return fallback
  }
}

function readInitialCustomTraits() {
  const sourceTraits = sourceTraitsFor(readInitialTokenId())
  const savedTraits = readSavedCustomTraits(sourceTraits)
  return readGlowbudCustomTraits(window.location.search, savedTraits)
}

function ipfsGatewayUrls(ipfsUrl: string | null, tokenId: number) {
  if (!ipfsUrl) return []
  const path = `${ipfsUrl.replace('ipfs://', '').replace(/\/$/, '')}/${tokenId}`
  return GATEWAYS.map((gateway) => `${gateway}${path}`)
}

type RoomArchLight = {
  angle: number
  position: [number, number, number]
}

function AnimatedShowroomLights({
  animation,
  palette,
  archLights,
  footLights,
}: {
  animation: RedShellCritterAnimation
  palette: RoomPalette
  archLights: RoomArchLight[]
  footLights: [number, number, number][]
}) {
  const archLightRefs = useRef<Array<THREE.Mesh | null>>([])
  const footLightRefs = useRef<Array<THREE.Mesh | null>>([])

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime()
    const pace = animation === 'hop' ? 4.2 : animation === 'grumble' ? 2.6 : 1.45
    const energy = animation === 'hop' ? 0.24 : animation === 'grumble' ? 0.12 : 0.07

    archLightRefs.current.forEach((light, index) => {
      if (!light) return
      const material = light.material as THREE.MeshStandardMaterial
      const wave = (Math.sin(elapsed * pace - index * 0.58) + 1) * 0.5
      material.emissiveIntensity = 0.48 + wave * energy
      light.scale.setScalar(1 + wave * 0.045)
    })

    footLightRefs.current.forEach((light, index) => {
      if (!light) return
      const material = light.material as THREE.MeshStandardMaterial
      const wave = (Math.sin(elapsed * (pace * 0.82) + index * 0.74) + 1) * 0.5
      material.emissiveIntensity = 0.42 + wave * (energy * 0.8)
    })
  })

  return (
    <>
      <group position={[0, 0, -3.7]} scale={[1.35, 1.35, 1]}>
        {archLights.map((light, index) => (
          <mesh
            ref={(node) => {
              archLightRefs.current[index] = node
            }}
            key={light.angle}
            position={light.position}
          >
            <sphereGeometry args={[0.072, 10, 8]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? palette.lamp : palette.archBand}
              emissive={index % 2 === 0 ? palette.lamp : palette.archBand}
              emissiveIntensity={0.5}
              roughness={0.3}
            />
          </mesh>
        ))}
      </group>
      {footLights.map((position, index) => (
        <mesh
          ref={(node) => {
            footLightRefs.current[index] = node
          }}
          key={position.join('-')}
          position={position}
          rotation-x={Math.PI / 2}
        >
          <cylinderGeometry args={[0.075, 0.075, 0.05, 10]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? palette.lamp : palette.archBand}
            emissive={index % 2 === 0 ? palette.lamp : palette.archBand}
            emissiveIntensity={0.5}
            roughness={0.34}
          />
        </mesh>
      ))}
    </>
  )
}

function DramaticShowroomLights({
  palette,
  createMode,
  revealSequence,
  selectionPulse,
}: {
  palette: RoomPalette
  createMode: boolean
  revealSequence: number
  selectionPulse: number
}) {
  const leftSpotRef = useRef<THREE.SpotLight | null>(null)
  const rightSpotRef = useRef<THREE.SpotLight | null>(null)
  const ringRef = useRef<THREE.Mesh | null>(null)
  const sparkleRefs = useRef<Array<THREE.Mesh | null>>([])
  const lastRevealRef = useRef(revealSequence)
  const lastSelectionRef = useRef(selectionPulse)
  const revealStartRef = useRef(-100)
  const selectionStartRef = useRef(-100)

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime()
    if (lastRevealRef.current !== revealSequence) {
      lastRevealRef.current = revealSequence
      revealStartRef.current = elapsed
    }
    if (lastSelectionRef.current !== selectionPulse) {
      lastSelectionRef.current = selectionPulse
      selectionStartRef.current = elapsed
    }

    const revealAge = elapsed - revealStartRef.current
    const revealProgress = THREE.MathUtils.clamp(revealAge / 1.9, 0, 1)
    const revealEnergy = revealAge >= 0 && revealAge <= 1.9
      ? Math.sin(revealProgress * Math.PI)
      : 0
    const selectionAge = elapsed - selectionStartRef.current
    const selectionEnergy = selectionAge >= 0 && selectionAge <= 0.48
      ? 1 - selectionAge / 0.48
      : 0
    const roomBreath = 0.5 + Math.sin(elapsed * 1.15) * 0.5
    const baseIntensity = createMode ? 5.1 : 3.25

    if (leftSpotRef.current) {
      leftSpotRef.current.intensity = baseIntensity + revealEnergy * 13 + selectionEnergy * 4.2 + roomBreath * 0.35
    }
    if (rightSpotRef.current) {
      rightSpotRef.current.intensity = baseIntensity * 0.92 + revealEnergy * 11 + selectionEnergy * 3.6 + (1 - roomBreath) * 0.35
    }
    if (ringRef.current) {
      const material = ringRef.current.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = 0.45 + revealEnergy * 2.6 + selectionEnergy * 0.9
      ringRef.current.scale.setScalar(1 + revealEnergy * 0.08 + selectionEnergy * 0.025)
    }
    sparkleRefs.current.forEach((sparkle, index) => {
      if (!sparkle) return
      const wave = Math.max(0, Math.sin(revealProgress * Math.PI * 2 - index * 0.42))
      const scale = revealEnergy * (0.3 + wave * 0.95)
      sparkle.scale.setScalar(scale)
      sparkle.rotation.z = elapsed * (index % 2 === 0 ? 1.3 : -1.1)
    })
  })

  const sparkles = [
    [-2.05, 1.05, 0.2],
    [2.12, 0.72, 0.05],
    [-1.55, -0.15, 1.02],
    [1.62, 1.55, -0.25],
    [0.04, 2.05, -0.3],
    [2.42, -0.22, -0.55],
  ] as const

  return (
    <group name="dramatic-avatar-light-rig">
      <spotLight
        ref={leftSpotRef}
        position={[-4.4, 5.6, 4.4]}
        color={palette.lamp}
        angle={0.46}
        penumbra={0.72}
        distance={11}
        decay={1.7}
        castShadow
      />
      <spotLight
        ref={rightSpotRef}
        position={[4.6, 3.8, 2.2]}
        color={palette.archBand}
        angle={0.5}
        penumbra={0.76}
        distance={10}
        decay={1.8}
      />
      <mesh ref={ringRef} position={[0, -0.79, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.8, 0.035, 8, 72]} />
        <meshStandardMaterial
          color={palette.archBand}
          emissive={palette.archBand}
          emissiveIntensity={0.45}
          roughness={0.38}
        />
      </mesh>
      {sparkles.map((position, index) => (
        <mesh
          key={position.join('-')}
          ref={(node) => {
            sparkleRefs.current[index] = node
          }}
          position={position}
          scale={0}
        >
          <octahedronGeometry args={[0.12, 0]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? palette.lamp : palette.archBand}
            emissive={index % 2 === 0 ? palette.lamp : palette.archBand}
            emissiveIntensity={1.4}
            roughness={0.28}
          />
        </mesh>
      ))}
    </group>
  )
}

type DressingFxProfile = {
  focus: [number, number, number]
  radius: number
  spreadY: number
  cameraTarget: [number, number, number]
  cameraZoom: number
}

function dressingFxProfile(category: DressingCeremonyCategory): DressingFxProfile {
  if (category === 'head' || category === 'flytrap') {
    return {
      focus: [0, 1.1, 0.08],
      radius: 1.05,
      spreadY: 1.05,
      cameraTarget: [0, 0.38, 0],
      cameraZoom: -2.2,
    }
  }
  if (category === 'pot') {
    return {
      focus: [0, -0.55, 0.08],
      radius: 1.05,
      spreadY: 0.42,
      cameraTarget: [0, -0.34, 0],
      cameraZoom: 3,
    }
  }
  if (category === 'companion') {
    return {
      focus: [-1.22, -0.34, 0.28],
      radius: 0.78,
      spreadY: 0.66,
      cameraTarget: [-0.22, -0.1, 0],
      cameraZoom: 2.5,
    }
  }
  if (category === 'held') {
    return {
      focus: [1.22, -0.02, 0.26],
      radius: 0.82,
      spreadY: 0.86,
      cameraTarget: [0.24, 0.02, 0],
      cameraZoom: 2.5,
    }
  }
  if (category === 'eyes' || category === 'mouth' || category === 'nose' || category === 'face') {
    return {
      focus: [0, 0.08, 1.05],
      radius: 1.02,
      spreadY: 0.76,
      cameraTarget: [0, 0.12, 0.18],
      cameraZoom: 4.5,
    }
  }
  if (category === 'background') {
    return {
      focus: [0, 0.34, -0.35],
      radius: 2.35,
      spreadY: 1.65,
      cameraTarget: [0, 0.12, 0],
      cameraZoom: -1.8,
    }
  }
  return {
    focus: [0, 0.18, 0.04],
    radius: category === 'look' ? 1.95 : 1.58,
    spreadY: category === 'look' ? 1.7 : 1.25,
    cameraTarget: [0, 0.12, 0],
    cameraZoom: category === 'skin' ? 4 : 2.7,
  }
}

function dressingPoseFor(category: DressingCeremonyCategory): RedShellCritterAnimation {
  if (category === 'head' || category === 'pot' || category === 'flytrap') return 'hop'
  if (category === 'companion' || category === 'held') return 'wave'
  if (category === 'look') return 'boogie'
  if (category === 'eyes' || category === 'mouth' || category === 'nose' || category === 'face') return 'idle'
  return 'showcase'
}

function TraitChangeCeremony3D({
  ceremony,
  sceneY,
}: {
  ceremony: DressingCeremony
  sceneY: number
}) {
  const rootRef = useRef<THREE.Group | null>(null)
  const ringRefs = useRef<Array<THREE.Mesh | null>>([])
  const stitchRefs = useRef<Array<THREE.Mesh | null>>([])
  const sparkleRefs = useRef<Array<THREE.Mesh | null>>([])
  const lightRef = useRef<THREE.PointLight | null>(null)
  const lastSequenceRef = useRef(ceremony.sequence)
  const startRef = useRef(-100)
  const profile = dressingFxProfile(ceremony.category)
  const [primary, secondary] = DRESSING_ACCENTS[ceremony.category]

  useFrame(({ clock }) => {
    const root = rootRef.current
    if (!root) return
    const elapsed = clock.getElapsedTime()
    if (lastSequenceRef.current !== ceremony.sequence) {
      lastSequenceRef.current = ceremony.sequence
      startRef.current = elapsed
    }

    const age = elapsed - startRef.current
    const duration = DRESSING_CEREMONY_DURATION / 1000
    if (ceremony.sequence === 0 || age < 0 || age > duration) {
      root.visible = false
      if (lightRef.current) lightRef.current.intensity = 0
      return
    }

    root.visible = true
    const progress = THREE.MathUtils.clamp(age / duration, 0, 1)
    const enter = THREE.MathUtils.smoothstep(progress, 0, 0.16)
    const exit = 1 - THREE.MathUtils.smoothstep(progress, 0.72, 1)
    const energy = enter * exit
    const pulse = Math.sin(progress * Math.PI)
    const isFaceCeremony = ceremony.category === 'eyes'
      || ceremony.category === 'mouth'
      || ceremony.category === 'nose'
      || ceremony.category === 'face'

    ringRefs.current.forEach((ring, index) => {
      if (!ring) return
      const ringDelay = index * 0.055
      const localProgress = THREE.MathUtils.clamp((progress - ringDelay) / (1 - ringDelay), 0, 1)
      const localEnergy = THREE.MathUtils.smoothstep(localProgress, 0, 0.14)
        * (1 - THREE.MathUtils.smoothstep(localProgress, 0.73, 1))
      if (isFaceCeremony && index > 0) {
        ring.scale.setScalar(0.001)
        return
      }
      const radius = profile.radius * (0.48 + localProgress * (0.74 + index * 0.06))
      ring.scale.setScalar(Math.max(0.001, radius * localEnergy))
      ring.position.set(
        profile.focus[0],
        profile.focus[1] + (index - 1) * profile.spreadY * 0.28 + Math.sin(progress * Math.PI) * 0.08,
        profile.focus[2],
      )
      if (isFaceCeremony) {
        ring.rotation.set(0, 0, elapsed * 0.25)
      } else if (index === 0) {
        ring.rotation.set(Math.PI / 2, elapsed * 0.48, 0)
      } else if (index === 1) {
        ring.rotation.set(0.12, elapsed * -0.62, progress * 0.6)
      } else {
        ring.rotation.set(progress * 0.42, elapsed * 0.54, Math.PI / 2.7)
      }
    })

    stitchRefs.current.forEach((stitch, index) => {
      if (!stitch) return
      if (isFaceCeremony && index % 2 === 1) {
        stitch.scale.setScalar(0.001)
        return
      }
      const angle = (index / stitchRefs.current.length) * Math.PI * 2
        + progress * (index % 2 === 0 ? 1.4 : -1.05)
      const orbit = profile.radius * (
        isFaceCeremony
          ? 0.78 + ((index * 7) % 5) * 0.055
          : 0.46 + ((index * 7) % 5) * 0.075
      )
      const rise = ((index % 6) / 5 - 0.5) * profile.spreadY
      stitch.position.set(
        profile.focus[0] + Math.cos(angle) * orbit,
        profile.focus[1] + rise + Math.sin(progress * Math.PI * 2 + index) * 0.1,
        profile.focus[2] + Math.sin(angle) * orbit * 0.58,
      )
      stitch.rotation.set(
        Math.sin(angle) * 0.7,
        angle,
        Math.cos(angle + progress * 2) * 0.72,
      )
      const stagger = 0.72 + ((index * 11) % 7) * 0.055
      stitch.scale.setScalar(Math.max(0.001, energy * stagger * (0.78 + pulse * 0.34)))
    })

    sparkleRefs.current.forEach((sparkle, index) => {
      if (!sparkle) return
      if (isFaceCeremony && index % 2 === 1) {
        sparkle.scale.setScalar(0.001)
        return
      }
      const angle = (index / sparkleRefs.current.length) * Math.PI * 2 - progress * 1.9
      const burst = profile.radius * (
        isFaceCeremony
          ? 0.72 + progress * (0.28 + (index % 3) * 0.045)
          : 0.34 + progress * (0.66 + (index % 3) * 0.09)
      )
      sparkle.position.set(
        profile.focus[0] + Math.cos(angle) * burst,
        profile.focus[1] + ((index % 4) - 1.5) * profile.spreadY * 0.23 + pulse * 0.24,
        profile.focus[2] + Math.sin(angle) * burst * 0.52,
      )
      sparkle.rotation.set(elapsed * 1.2, angle, elapsed * (index % 2 === 0 ? 1.5 : -1.25))
      const flicker = 0.72 + Math.max(0, Math.sin(elapsed * 8 - index * 0.8)) * 0.48
      sparkle.scale.setScalar(Math.max(0.001, energy * flicker))
    })

    root.rotation.y = Math.sin(progress * Math.PI * 2) * 0.035
    if (lightRef.current) {
      lightRef.current.position.set(...profile.focus)
      lightRef.current.intensity = energy * 6.5
    }
  })

  return (
    <group ref={rootRef} name="trait-change-ceremony" position={[0, sceneY, 0]} visible={false}>
      {[0, 1, 2].map((index) => (
        <mesh
          key={`dressing-ring-${index}`}
          ref={(node) => {
            ringRefs.current[index] = node
          }}
        >
          <torusGeometry args={[1, index === 1 ? 0.026 : 0.04, 7, 64]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? primary : secondary}
            emissive={index % 2 === 0 ? primary : secondary}
            emissiveIntensity={0.86}
            roughness={0.3}
            depthTest
            depthWrite
          />
        </mesh>
      ))}
      {Array.from({ length: 18 }, (_, index) => (
        <mesh
          key={`dressing-stitch-${index}`}
          ref={(node) => {
            stitchRefs.current[index] = node
          }}
        >
          <capsuleGeometry args={[0.035 + (index % 3) * 0.008, 0.12 + (index % 4) * 0.035, 4, 7]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? primary : secondary}
            emissive={index % 2 === 0 ? primary : secondary}
            emissiveIntensity={0.5}
            roughness={0.42}
            depthTest
            depthWrite
          />
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, index) => (
        <mesh
          key={`dressing-spark-${index}`}
          ref={(node) => {
            sparkleRefs.current[index] = node
          }}
        >
          <octahedronGeometry args={[0.07 + (index % 3) * 0.018, 0]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? secondary : primary}
            emissive={index % 2 === 0 ? secondary : primary}
            emissiveIntensity={1.05}
            roughness={0.25}
            depthTest
            depthWrite
          />
        </mesh>
      ))}
      <pointLight ref={lightRef} color={primary} intensity={0} distance={5.2} decay={2} />
    </group>
  )
}

function CreateWardrobeProjectors({
  ceremony,
  createMode,
  palette,
}: {
  ceremony: DressingCeremony
  createMode: boolean
  palette: RoomPalette
}) {
  const projectorRefs = useRef<Array<THREE.Group | null>>([])
  const headRefs = useRef<Array<THREE.Group | null>>([])
  const coreRefs = useRef<Array<THREE.Mesh | null>>([])
  const lastSequenceRef = useRef(ceremony.sequence)
  const startRef = useRef(-100)
  const [primary, secondary] = DRESSING_ACCENTS[ceremony.category]

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime()
    if (lastSequenceRef.current !== ceremony.sequence) {
      lastSequenceRef.current = ceremony.sequence
      startRef.current = elapsed
    }
    const age = elapsed - startRef.current
    const duration = DRESSING_CEREMONY_DURATION / 1000
    const progress = THREE.MathUtils.clamp(age / duration, 0, 1)
    const active = ceremony.sequence > 0 && age >= 0 && age <= duration
    const ceremonyEnergy = active ? Math.pow(Math.sin(progress * Math.PI), 0.72) : 0

    projectorRefs.current.forEach((projector, index) => {
      if (!projector) return
      const side = index === 0 ? -1 : 1
      const idle = Math.sin(elapsed * 1.3 + index * Math.PI) * 0.5 + 0.5
      projector.position.y = -0.66 + idle * 0.025 + ceremonyEnergy * 0.08
      projector.rotation.y = side * (0.08 + ceremonyEnergy * 0.045)
    })

    headRefs.current.forEach((head, index) => {
      if (!head) return
      const side = index === 0 ? -1 : 1
      head.rotation.z = side * (0.18 + ceremonyEnergy * 0.32)
      head.rotation.y = Math.sin(elapsed * 0.9 + index) * 0.08 * (1 - ceremonyEnergy)
    })

    coreRefs.current.forEach((core, index) => {
      if (!core) return
      const idle = 0.5 + Math.sin(elapsed * 2.2 + index * 1.6) * 0.5
      const scale = 0.9 + idle * 0.08 + ceremonyEnergy * 0.42
      core.scale.setScalar(scale)
      const material = core.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = 0.38 + idle * 0.16 + ceremonyEnergy * 0.9
    })
  })

  if (!createMode) return null

  return (
    <group name="wardrobe-projector-rig">
      {([-1, 1] as const).map((side, index) => (
        <group
          key={side}
          ref={(node) => {
            projectorRefs.current[index] = node
          }}
          position={[side * 3.06, -0.66, -1.08]}
          scale={0.82}
        >
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.31, 0.36, 0.17, 10]} />
            <meshStandardMaterial color="#19131d" roughness={0.52} />
          </mesh>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.25, 0.29, 0.14, 10]} />
            <meshStandardMaterial color={palette.platformBand} roughness={0.38} />
          </mesh>
          <mesh position={[0, 0.48, 0.01]} scale={1.12}>
            <boxGeometry args={[0.27, 0.75, 0.27]} />
            <meshBasicMaterial color="#19131d" side={THREE.BackSide} />
          </mesh>
          <mesh position={[0, 0.48, 0.01]}>
            <boxGeometry args={[0.27, 0.75, 0.27]} />
            <meshStandardMaterial color={palette.arch} roughness={0.45} />
          </mesh>
          <mesh position={[side * -0.02, 0.5, 0.155]}>
            <boxGeometry args={[0.12, 0.42, 0.04]} />
            <meshStandardMaterial
              color={secondary}
              emissive={secondary}
              emissiveIntensity={0.42}
              roughness={0.35}
            />
          </mesh>
          <group
            ref={(node) => {
              headRefs.current[index] = node
            }}
            position={[0, 0.98, 0]}
            rotation-z={side * 0.18}
          >
            <mesh scale={1.12}>
              <dodecahedronGeometry args={[0.245, 0]} />
              <meshBasicMaterial color="#19131d" side={THREE.BackSide} />
            </mesh>
            <mesh>
              <dodecahedronGeometry args={[0.245, 0]} />
              <meshStandardMaterial color={palette.panel} roughness={0.34} />
            </mesh>
            <mesh
              ref={(node) => {
                coreRefs.current[index] = node
              }}
              position={[side * -0.03, 0.02, 0.22]}
            >
              <sphereGeometry args={[0.105, 12, 9]} />
              <meshStandardMaterial
                color={primary}
                emissive={primary}
                emissiveIntensity={0.5}
                roughness={0.22}
              />
            </mesh>
            <pointLight
              position={[0, 0.02, 0.18]}
              color={primary}
              intensity={0.7}
              distance={2.2}
              decay={2}
            />
          </group>
        </group>
      ))}
    </group>
  )
}

function AvatarDressingRig({
  ceremony,
  children,
}: {
  ceremony: DressingCeremony
  children: ReactNode
}) {
  const groupRef = useRef<THREE.Group | null>(null)
  const lastSequenceRef = useRef(ceremony.sequence)
  const startRef = useRef(-100)

  useFrame(({ clock }) => {
    const group = groupRef.current
    if (!group) return
    const elapsed = clock.getElapsedTime()
    if (lastSequenceRef.current !== ceremony.sequence) {
      lastSequenceRef.current = ceremony.sequence
      startRef.current = elapsed
    }

    const age = elapsed - startRef.current
    const duration = DRESSING_CEREMONY_DURATION / 1000
    if (ceremony.sequence === 0 || age < 0 || age > duration) {
      group.position.set(0, 0, 0)
      group.rotation.set(0, 0, 0)
      group.scale.setScalar(1)
      return
    }

    const progress = THREE.MathUtils.clamp(age / duration, 0, 1)
    const reveal = THREE.MathUtils.smoothstep(progress, 0, 0.18)
    const settle = Math.sin(progress * Math.PI)
    const bounce = Math.sin(progress * Math.PI * 3) * (1 - progress)
    const category = ceremony.category
    const isGrowth = category === 'head' || category === 'flytrap'
    const isGrounded = category === 'pot'
    const isSideFeature = category === 'held' || category === 'companion'
    const isFace = category === 'eyes' || category === 'mouth' || category === 'nose' || category === 'face'
    const baseScale = 0.94 + reveal * 0.06 + settle * 0.035

    group.scale.set(
      baseScale + (isSideFeature ? settle * 0.012 : 0),
      baseScale + (isGrowth ? (1 - reveal) * -0.07 + settle * 0.055 : 0),
      baseScale + (isFace ? settle * 0.022 : 0),
    )
    group.position.y = (isGrounded ? (1 - reveal) * -0.1 : 0) + settle * 0.045
    group.rotation.y = (category === 'shell' || category === 'skin' || category === 'look')
      ? bounce * 0.085
      : 0
    group.rotation.z = isSideFeature
      ? bounce * (category === 'held' ? -0.035 : 0.035)
      : 0
  })

  return <group ref={groupRef}>{children}</group>
}

function WardrobeCameraBeat({
  ceremony,
  createMode,
  controlsRef,
}: {
  ceremony: DressingCeremony
  createMode: boolean
  controlsRef: { current: OrbitControlsImpl | null }
}) {
  const lastSequenceRef = useRef(ceremony.sequence)
  const startRef = useRef(-100)
  const baseTargetRef = useRef(new THREE.Vector3())
  const basePositionRef = useRef(new THREE.Vector3())
  const baseFovRef = useRef(37)
  const activeRef = useRef(false)
  const profile = dressingFxProfile(ceremony.category)

  useFrame(({ camera, clock }) => {
    const controls = controlsRef.current
    if (!createMode || !controls || !(camera instanceof THREE.PerspectiveCamera)) return
    const elapsed = clock.getElapsedTime()

    if (lastSequenceRef.current !== ceremony.sequence) {
      if (activeRef.current) {
        controls.target.copy(baseTargetRef.current)
        camera.position.copy(basePositionRef.current)
        camera.fov = baseFovRef.current
        camera.updateProjectionMatrix()
      }
      lastSequenceRef.current = ceremony.sequence
      startRef.current = elapsed
      baseTargetRef.current.copy(controls.target)
      basePositionRef.current.copy(camera.position)
      baseFovRef.current = camera.fov
      activeRef.current = ceremony.sequence > 0
    }

    if (!activeRef.current) return
    const age = elapsed - startRef.current
    const duration = DRESSING_CEREMONY_DURATION / 1000
    if (age < 0 || age > duration) {
      controls.target.copy(baseTargetRef.current)
      camera.position.copy(basePositionRef.current)
      camera.fov = baseFovRef.current
      camera.updateProjectionMatrix()
      controls.update()
      activeRef.current = false
      return
    }

    const progress = THREE.MathUtils.clamp(age / duration, 0, 1)
    const focus = Math.pow(Math.sin(progress * Math.PI), 0.72)
    const focusedTarget = new THREE.Vector3(
      baseTargetRef.current.x + profile.cameraTarget[0] * focus,
      baseTargetRef.current.y + profile.cameraTarget[1] * focus,
      baseTargetRef.current.z + profile.cameraTarget[2] * focus,
    )
    const baseOffset = basePositionRef.current.clone().sub(baseTargetRef.current)
    const distance = Math.max(0.1, baseOffset.length())
    const horizontalDistance = Math.max(0.1, Math.hypot(baseOffset.x, baseOffset.z))
    const elevation = Math.atan2(baseOffset.y, horizontalDistance)
    const baseYaw = Math.atan2(baseOffset.x, baseOffset.z)
    let desiredYaw = baseYaw

    const frontYaw = 0
    const frontDelta = Math.atan2(Math.sin(frontYaw - baseYaw), Math.cos(frontYaw - baseYaw))

    if (ceremony.category === 'eyes' || ceremony.category === 'mouth' || ceremony.category === 'nose' || ceremony.category === 'face') {
      desiredYaw = baseYaw + frontDelta
    } else if (ceremony.category === 'held') {
      desiredYaw = baseYaw + frontDelta - 0.38
    } else if (ceremony.category === 'companion') {
      desiredYaw = baseYaw + frontDelta + 0.38
    } else if (ceremony.category === 'head' || ceremony.category === 'pot' || ceremony.category === 'flytrap') {
      desiredYaw = baseYaw + frontDelta * 0.72
    } else if (ceremony.category === 'shell' || ceremony.category === 'skin' || ceremony.category === 'look') {
      desiredYaw = baseYaw + 0.34
    }

    const yawDelta = Math.atan2(Math.sin(desiredYaw - baseYaw), Math.cos(desiredYaw - baseYaw))
    const currentYaw = baseYaw + yawDelta * focus
    const currentHorizontalDistance = Math.cos(elevation) * distance
    controls.target.copy(focusedTarget)
    camera.position.set(
      focusedTarget.x + Math.sin(currentYaw) * currentHorizontalDistance,
      focusedTarget.y + Math.sin(elevation) * distance,
      focusedTarget.z + Math.cos(currentYaw) * currentHorizontalDistance,
    )
    camera.fov = baseFovRef.current - profile.cameraZoom * focus
    camera.updateProjectionMatrix()
    controls.update()
  })

  return null
}

function AvatarRevealRig({
  sceneY,
  revealSequence,
  children,
}: {
  sceneY: number
  revealSequence: number
  children: ReactNode
}) {
  const groupRef = useRef<THREE.Group | null>(null)
  const lastRevealRef = useRef(revealSequence)
  const revealStartRef = useRef(-100)
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useFrame(({ clock }) => {
    const group = groupRef.current
    if (!group) return
    const elapsed = clock.getElapsedTime()
    if (lastRevealRef.current !== revealSequence) {
      lastRevealRef.current = revealSequence
      revealStartRef.current = elapsed
    }

    const age = elapsed - revealStartRef.current
    if (age < 0 || age > 1.9) {
      group.rotation.y = Math.PI
      group.position.y = sceneY
      group.scale.setScalar(1)
      return
    }

    const progress = THREE.MathUtils.clamp(age / 1.9, 0, 1)
    if (reduceMotion) {
      group.rotation.y = Math.PI
      group.position.y = sceneY
      group.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.025)
      return
    }

    const eased = 1 - Math.pow(1 - progress, 3)
    const entrance = THREE.MathUtils.smoothstep(progress, 0, 0.28)
    group.rotation.y = Math.PI + eased * Math.PI * 2
    group.position.y = sceneY + Math.sin(progress * Math.PI) * 0.13
    group.scale.setScalar(0.88 + entrance * 0.12 + Math.sin(progress * Math.PI) * 0.055)
  })

  return (
    <group ref={groupRef} rotation-x={-0.055} rotation-y={Math.PI} position={[0, sceneY, 0]}>
      {children}
    </group>
  )
}

function DisplayRoomSet({
  palette,
  lightHeight,
  animation,
}: {
  palette: RoomPalette
  lightHeight: number
  animation: RedShellCritterAnimation
}) {
  const wallPanels = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const angle = (index / 14) * Math.PI * 2
        return {
          angle,
          x: Math.sin(angle) * 7.86,
          z: Math.cos(angle) * 7.86,
        }
      }),
    [],
  )
  const archLights = useMemo(
    () =>
      Array.from({ length: 15 }, (_, index) => {
        const angle = (index / 15) * Math.PI * 2
        return {
          angle,
          position: [
            Math.cos(angle) * 2.72 * 1.22,
            0.5 + Math.sin(angle) * 2.72 * 1.06,
            -3.02,
          ] as [number, number, number],
        }
      }),
    [],
  )
  const footLights = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const angle = -1.05 + (index / 6) * 2.1
        return [
          Math.sin(angle) * 1.7,
          -0.78,
          Math.cos(angle) * 1.7,
        ] as [number, number, number]
      }),
    [],
  )

  return (
    <group name="display-room-set">
      <mesh position={[0, 1.35, 0]} receiveShadow>
        <cylinderGeometry args={[8, 8, 5.7, 56, 1, true]} />
        <meshStandardMaterial color={palette.wall} roughness={0.92} side={THREE.BackSide} />
      </mesh>
      {wallPanels.map((panel, index) => (
        <mesh
          key={panel.angle}
          position={[panel.x, 1.08, panel.z]}
          rotation={[0, panel.angle, 0]}
        >
          <boxGeometry args={[1.1, 3.7, 0.045]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? palette.panel : palette.wall}
            roughness={0.96}
          />
        </mesh>
      ))}

      {([-1, 1] as const).map((side) => (
        <group
          key={`gallery-frame-${side}`}
          position={[side * 5.55, 0.46, -5.55]}
          rotation={[0, -side * 0.36, 0]}
          name="side-gallery-frame"
        >
          <mesh castShadow>
            <boxGeometry args={[1.58, 2.42, 0.16]} />
            <meshStandardMaterial color="#211927" roughness={0.78} />
          </mesh>
          <mesh position={[0, 0, 0.11]}>
            <boxGeometry args={[1.34, 2.18, 0.08]} />
            <meshStandardMaterial color={palette.panel} roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.28, 0.18]}>
            <torusGeometry args={[0.43, 0.075, 9, 28]} />
            <meshStandardMaterial color="#211927" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.28, 0.19]}>
            <circleGeometry args={[0.35, 28]} />
            <meshStandardMaterial color={palette.archBand} roughness={0.64} />
          </mesh>
          <mesh position={[0, 0.28, 0.24]}>
            <sphereGeometry args={[0.085, 10, 8]} />
            <meshStandardMaterial
              color={palette.lamp}
              emissive={palette.lamp}
              emissiveIntensity={0.28}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, -0.55, 0.18]}>
            <boxGeometry args={[0.74, 0.13, 0.08]} />
            <meshStandardMaterial color={palette.arch} roughness={0.62} />
          </mesh>
          <mesh position={[0, 1.28, 0.02]}>
            <boxGeometry args={[1.74, 0.16, 0.24]} />
            <meshStandardMaterial color={palette.archBand} roughness={0.64} />
          </mesh>
        </group>
      ))}

      <group name="showroom-arch" position={[0, 0, -3.7]} scale={[1.35, 1.35, 1]}>
        <mesh position={[0, 0.5, -3.34]} scale={[1.22, 1.06, 1]} receiveShadow>
          <circleGeometry args={[2.72, 56]} />
          <meshStandardMaterial color={palette.panel} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.5, -3.2]} scale={[1.22, 1.06, 1]}>
          <torusGeometry args={[2.72, 0.2, 10, 56]} />
          <meshStandardMaterial color="#211927" roughness={0.74} />
        </mesh>
        <mesh position={[0, 0.5, -3.08]} scale={[1.22, 1.06, 1]}>
          <torusGeometry args={[2.72, 0.125, 10, 56]} />
          <meshStandardMaterial color={palette.arch} roughness={0.58} />
        </mesh>
        <mesh position={[0, 0.5, -3.04]} scale={[1.22, 1.06, 1]}>
          <torusGeometry args={[2.46, 0.055, 8, 48]} />
          <meshStandardMaterial color={palette.archBand} roughness={0.62} />
        </mesh>
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * 3.74, -0.1, -3.15]}>
            <mesh scale={[0.38, 2.45, 0.2]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#211927" roughness={0.78} />
            </mesh>
            <mesh position={[-side * 0.03, 0, 0.16]} scale={[0.22, 2.25, 0.07]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={palette.archBand} roughness={0.6} />
            </mesh>
            {[-1.27, 1.27].map((capHeight) => (
              <mesh key={capHeight} position={[0, capHeight, 0.03]}>
                <boxGeometry args={[0.58, 0.16, 0.34]} />
                <meshStandardMaterial color={palette.arch} roughness={0.62} />
              </mesh>
            ))}
            <mesh position={[0, 0.82, 0.26]}>
              <sphereGeometry args={[0.105, 10, 8]} />
              <meshStandardMaterial
                color={palette.lamp}
                emissive={palette.lamp}
                emissiveIntensity={0.55}
                roughness={0.34}
              />
            </mesh>
            <pointLight
              position={[-side * 0.15, 0.7, 0.78]}
              intensity={1.8}
              distance={3.6}
              decay={2}
              color={palette.archBand}
            />
          </group>
        ))}
      </group>

      <mesh position={[0, -1.22, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[8, 64]} />
        <meshStandardMaterial color={palette.floor} roughness={0.88} />
      </mesh>
      {[3.05, 5.25].map((radius, index) => (
        <mesh key={radius} position={[0, -1.205 + index * 0.004, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[radius, index === 0 ? 0.035 : 0.025, 7, 72]} />
          <meshStandardMaterial
            color={index === 0 ? palette.archBand : '#211927'}
            roughness={0.76}
          />
        </mesh>
      ))}

      <mesh position={[0, -1.1, 0]} receiveShadow>
        <cylinderGeometry args={[2.28, 2.38, 0.22, 56]} />
        <meshStandardMaterial color="#18131d" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.96, 0]} receiveShadow>
        <cylinderGeometry args={[2.16, 2.24, 0.13, 56]} />
        <meshStandardMaterial color={palette.platform} roughness={0.78} />
      </mesh>
      <mesh position={[0, -0.875, 0]} receiveShadow>
        <cylinderGeometry args={[2.06, 2.12, 0.06, 56]} />
        <meshStandardMaterial color={palette.platformBand} roughness={0.72} />
      </mesh>
      <mesh position={[0, -0.835, 0]} receiveShadow>
        <cylinderGeometry args={[1.96, 2.02, 0.035, 56]} />
        <meshStandardMaterial color={palette.lamp} roughness={0.64} />
      </mesh>
      {[1.48, 1.76].map((radius, index) => (
        <mesh key={radius} position={[0, -0.808 + index * 0.006, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[radius, index === 0 ? 0.016 : 0.025, 7, 56]} />
          <meshStandardMaterial
            color={index === 0 ? palette.archBand : '#211927'}
            roughness={0.68}
          />
        </mesh>
      ))}
      <group position={[0, -1.02, 2.24]} name="podium-front-emblem">
        <mesh scale={[1, 0.44, 0.18]}>
          <sphereGeometry args={[0.34, 18, 12]} />
          <meshStandardMaterial color="#211927" roughness={0.72} />
        </mesh>
        <mesh position={[0, 0, 0.065]} scale={[0.66, 0.24, 0.12]}>
          <sphereGeometry args={[0.34, 18, 12]} />
          <meshStandardMaterial color={palette.archBand} roughness={0.56} />
        </mesh>
        <mesh position={[0, 0, 0.105]} rotation-z={Math.PI / 4}>
          <boxGeometry args={[0.13, 0.13, 0.04]} />
          <meshStandardMaterial color="#211927" roughness={0.62} />
        </mesh>
        <mesh position={[0, 0, 0.13]} rotation-z={Math.PI / 4}>
          <boxGeometry args={[0.075, 0.075, 0.025]} />
          <meshStandardMaterial
            color={palette.lamp}
            emissive={palette.lamp}
            emissiveIntensity={0.3}
            roughness={0.42}
          />
        </mesh>
      </group>
      <AnimatedShowroomLights
        animation={animation}
        palette={palette}
        archLights={archLights}
        footLights={footLights}
      />

      <group position={[0, lightHeight, -0.9]} name="overhead-dressing-light">
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 1.25, 10]} />
          <meshStandardMaterial color="#211a27" roughness={0.72} />
        </mesh>
        <mesh castShadow>
          <cylinderGeometry args={[0.78, 0.55, 0.34, 20]} />
          <meshStandardMaterial color="#211a27" roughness={0.66} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.51, 0.51, 0.06, 20]} />
          <meshStandardMaterial
            color={palette.lamp}
            emissive={palette.lamp}
            emissiveIntensity={0.9}
            roughness={0.28}
          />
        </mesh>
        <pointLight
          position={[0, -0.42, 0]}
          intensity={32}
          distance={7.5}
          decay={2}
          color={palette.lamp}
          castShadow
        />
      </group>
    </group>
  )
}

function DisplayRoomScene({
  tokenId,
  traits,
  animation,
  createMode,
  revealSequence,
  selectionPulse,
  dressingCeremony,
  viewResetKey,
  cameraNudge,
}: {
  tokenId: number
  traits: GlowbudTraitLoadout
  animation: RedShellCritterAnimation
  createMode: boolean
  revealSequence: number
  selectionPulse: number
  dressingCeremony: DressingCeremony
  viewResetKey: number
  cameraNudge: CameraNudge
}) {
  const background = traits.background ?? 'blue'
  const palette = ROOM_PALETTES[background]
  const isTallHead = TALL_HEADS.has(traits.head)
  const isTallShell = TALL_SHELLS.has(traits.shell)
  const isTallHero = isTallHead || isTallShell
  const sceneY = -0.16
  const cameraTargetY = sceneY + 0.05
  const isPhoneViewport = window.innerWidth <= 520
  const isTabletViewport = window.innerWidth <= 820
  const cameraDistance = isPhoneViewport
    ? 7.05
    : window.innerWidth <= 820
      ? 6.95
      : 6.75
  const cameraFov = isPhoneViewport ? 43 : isTabletViewport ? 40 : 37
  const heroScale = isPhoneViewport ? 0.82 : isTabletViewport ? 0.92 : 1
  const lampHeight = isPhoneViewport
    ? (isTallHero ? 4.45 : 3.5)
    : (isTallHero ? 4.1 : 3.45)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const capturePhaseRef = useRef<number | null>(null)

  useEffect(() => {
    const displayWindow = window as typeof window & {
      __setGlowbudDisplayView?: (view: DisplayCameraView) => void
      __setGlowbudDisplayPhase?: (phase: number) => void
    }
    displayWindow.__setGlowbudDisplayPhase = (phase) => {
      capturePhaseRef.current = THREE.MathUtils.clamp(phase, 0, 1)
    }
    displayWindow.__setGlowbudDisplayView = ({ yaw = 0, pitch = 0, roll = 0, zoom = 1 }) => {
      const controls = controlsRef.current
      if (!controls) return

      const target = new THREE.Vector3(0, cameraTargetY, 0)
      const distance = THREE.MathUtils.clamp(cameraDistance / Math.max(zoom, 0.1), 3.2, 7.55)
      const elevation = THREE.MathUtils.clamp(pitch, -0.72, 0.9)
      const horizontalDistance = Math.cos(elevation) * distance
      const camera = controls.object

      controls.target.copy(target)
      camera.position.set(
        target.x + Math.sin(yaw) * horizontalDistance,
        target.y + Math.sin(elevation) * distance,
        target.z + Math.cos(yaw) * horizontalDistance,
      )
      camera.up.set(Math.sin(roll), Math.cos(roll), 0).normalize()
      camera.lookAt(target)
      controls.update()
    }

    return () => {
      delete displayWindow.__setGlowbudDisplayPhase
      delete displayWindow.__setGlowbudDisplayView
    }
  }, [cameraDistance, cameraTargetY])

  useEffect(() => {
    if (cameraNudge.sequence === 0) return
    const controls = controlsRef.current
    if (!controls) return

    const camera = controls.object
    camera.updateMatrixWorld()
    const panStep = 0.15 * THREE.MathUtils.clamp(controls.getDistance() / 6.75, 0.75, 1.25)
    const cameraRight = new THREE.Vector3()
      .setFromMatrixColumn(camera.matrixWorld, 0)
      .normalize()
      .multiplyScalar(cameraNudge.horizontal * panStep)
    const cameraUp = new THREE.Vector3()
      .setFromMatrixColumn(camera.matrixWorld, 1)
      .normalize()
      .multiplyScalar(cameraNudge.vertical * panStep)
    const requestedOffset = cameraRight.add(cameraUp)
    const nextTarget = controls.target.clone().add(requestedOffset)
    nextTarget.x = THREE.MathUtils.clamp(nextTarget.x, -2.2, 2.2)
    nextTarget.y = THREE.MathUtils.clamp(nextTarget.y, -1.65, 2.15)
    nextTarget.z = THREE.MathUtils.clamp(nextTarget.z, -1.8, 1.8)
    const appliedOffset = nextTarget.sub(controls.target)

    controls.target.add(appliedOffset)
    camera.position.add(appliedOffset)
    controls.update()
  }, [cameraNudge])

  return (
    <Canvas
      key={`${tokenId}-${viewResetKey}`}
      camera={{ position: [0, isPhoneViewport ? 0.1 : 0.18, cameraDistance], fov: cameraFov }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: false }}
      shadows
    >
      <DeterministicCaptureClock phaseRef={capturePhaseRef} />
      <color attach="background" args={[palette.wall]} />
      <fog attach="fog" args={[palette.wall, 11, 20]} />
      <ambientLight intensity={0.88} color="#fff5eb" />
      <hemisphereLight args={['#fff0bd', palette.floor, 0.62]} />
      <directionalLight
        position={[-4.2, 5.8, 4.6]}
        intensity={2.65}
        color="#fff1b1"
        castShadow
      />
      <directionalLight position={[4.8, 2.8, -3.8]} intensity={1.05} color="#8ff5ec" />
      <DisplayRoomSet palette={palette} lightHeight={lampHeight} animation={animation} />
      <CreateWardrobeProjectors
        ceremony={dressingCeremony}
        createMode={createMode}
        palette={palette}
      />
      <DramaticShowroomLights
        palette={palette}
        createMode={createMode}
        revealSequence={revealSequence}
        selectionPulse={selectionPulse}
      />
      <TraitChangeCeremony3D ceremony={dressingCeremony} sceneY={sceneY} />
      <AvatarRevealRig sceneY={sceneY} revealSequence={revealSequence}>
        <AvatarDressingRig ceremony={dressingCeremony}>
          <GlowbudTraitAvatarAsset
            key={tokenId}
            traits={traits}
            animation={animation}
            scale={avatarDisplayScale(traits.head) * heroScale}
            activity={1}
          />
        </AvatarDressingRig>
      </AvatarRevealRig>
      <WardrobeCameraBeat
        ceremony={dressingCeremony}
        createMode={createMode}
        controlsRef={controlsRef}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableRotate
        enableZoom
        enableDamping
        dampingFactor={0.075}
        rotateSpeed={0.72}
        zoomSpeed={0.7}
        minDistance={3.2}
        maxDistance={7.55}
        minPolarAngle={0.18}
        maxPolarAngle={Math.PI * 0.8}
        target={[0, cameraTargetY, 0]}
      />
    </Canvas>
  )
}

function SourceArtwork({
  tokenId,
  imageUrl,
  onError,
}: {
  tokenId: number
  imageUrl: string | undefined
  onError: () => void
}) {
  return imageUrl ? (
    // The source artwork is an IPFS image, not a Next-managed site asset.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={`Original pixel artwork for Glowbud #${tokenId}`}
      onError={onError}
    />
  ) : (
    <div className="source-image-fallback">Glowbud #{tokenId}</div>
  )
}

function DeterministicCaptureClock({
  phaseRef,
}: {
  phaseRef: { current: number | null }
}) {
  useFrame(({ clock }) => {
    if (phaseRef.current === null) return
    clock.elapsedTime = phaseRef.current * 2.72
  }, -100)
  return null
}

function compactWallet(address: string) {
  return address.length > 13
    ? `${address.slice(0, 7)}...${address.slice(-5)}`
    : address
}

function OwnerCredit({ state }: { state: OwnerState }) {
  const label = state.owner?.username
    ?? (state.owner ? compactWallet(state.owner.address) : null)
    ?? (state.status === 'loading' ? 'Checking OpenSea' : 'Owner unavailable')
  const content = (
    <>
      <span>Owned by</span>
      <b>{label}</b>
    </>
  )

  return state.owner ? (
    <a
      className="showroom-owner"
      href={state.owner.profileUrl}
      target="_blank"
      rel="noreferrer"
      title={`View ${label} on OpenSea`}
    >
      {content}
    </a>
  ) : (
    <div className={`showroom-owner is-${state.status}`} aria-live="polite">
      {content}
    </div>
  )
}

export function GlowbudDisplayRoom() {
  const museumIntegrated = window.location.pathname.replace(/\/+$/, '') === '/wardrobe'
  const [tokenId, setTokenId] = useState(readInitialTokenId)
  const [tokenDraft, setTokenDraft] = useState(String(tokenId))
  const [displayMode, setDisplayMode] = useState<DisplayMode>(readInitialMode)
  const [customTraits, setCustomTraits] = useState<GlowbudTraitLoadout>(readInitialCustomTraits)
  const [wardrobeOpen, setWardrobeOpen] = useState(() => readInitialMode() === 'create')
  const [wardrobeCategory, setWardrobeCategory] = useState<GlowbudWardrobeCategory>('shell')
  const [soundEnabled, setSoundEnabled] = useState(() => readInitialFlag('sound', true))
  const [revealSequence, setRevealSequence] = useState(0)
  const [selectionPulse, setSelectionPulse] = useState(0)
  const [dressingCeremony, setDressingCeremony] = useState<DressingCeremony>({
    sequence: 0,
    category: 'shell',
    categoryLabel: 'Shell',
    traitLabel: '',
  })
  const [dressingActive, setDressingActive] = useState(false)
  const [dressingPerformanceActive, setDressingPerformanceActive] = useState(false)
  const [revealActive, setRevealActive] = useState(false)
  const [cinematicMode] = useState(() => readInitialFlag('cinematic'))
  const [animation, setAnimation] = useState<RedShellCritterAnimation>(readInitialAnimation)
  const [automaticPerformance] = useState(readAutomaticPerformanceEnabled)
  const [reduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [viewResetKey, setViewResetKey] = useState(0)
  const [cameraNudge, setCameraNudge] = useState<CameraNudge>({
    sequence: 0,
    horizontal: 0,
    vertical: 0,
  })
  const [formError, setFormError] = useState('')
  const [shareFeedback, setShareFeedback] = useState('')
  const [imageGatewayIndex, setImageGatewayIndex] = useState(0)
  const [detailsOpen, setDetailsOpen] = useState(
    () => readInitialFlag('look') || readInitialFlag('compare'),
  )
  const [focusMode, setFocusMode] = useState(() => readInitialFlag('focus'))
  const [ownerState, setOwnerState] = useState<OwnerState>({
    tokenId: null,
    status: 'idle',
    owner: null,
  })
  const [walletProviders, setWalletProviders] = useState<GlowbudWalletOption[]>([])
  const [walletVaultOpen, setWalletVaultOpen] = useState(false)
  const [walletConnection, setWalletConnection] = useState<ConnectedGlowbudWallet | null>(null)
  const [walletStatus, setWalletStatus] = useState<GlowbudWalletVaultStatus>('idle')
  const [walletError, setWalletError] = useState('')
  const [ownedTokenIds, setOwnedTokenIds] = useState<number[]>([])
  const [ownershipSource, setOwnershipSource] = useState<GlowbudWalletOwnershipSource | null>(null)
  const revealTimerRef = useRef<number | null>(null)
  const dressingTimerRef = useRef<number | null>(null)
  const dressingPerformanceTimerRef = useRef<number | null>(null)
  const walletRequestRef = useRef(0)
  const walletAutoReconnectRef = useRef(false)
  const { playUi, playTrait, playPose, playReveal } = useGlowbudDisplayAudio(!soundEnabled)
  const attributes = useMemo(() => sourceAttributesFor(tokenId), [tokenId])
  const composition = useMemo(() => composeGlowbudDisplayTraits(attributes), [attributes])
  const activeTraits = displayMode === 'create' ? customTraits : composition.traits
  const imageUrls = useMemo(
    () => ipfsGatewayUrls(tokenIndex.source.imageBase, tokenId),
    [tokenId],
  )
  const lookLine = useMemo(() => glowbudLookLine(attributes), [attributes])
  const ownedGlowbuds = useMemo<OwnedGlowbudPreview[]>(() => ownedTokenIds.map((ownedTokenId) => {
    const ownedAttributes = sourceAttributesFor(ownedTokenId)
    return {
      tokenId: ownedTokenId,
      imageUrls: ipfsGatewayUrls(tokenIndex.source.imageBase, ownedTokenId),
      lookLine: glowbudLookLine(ownedAttributes),
      traitCount: ownedAttributes.length,
    }
  }), [ownedTokenIds])
  const customLookLine = useMemo(() => [
    glowbudTraitLabel('head', customTraits.head),
    glowbudTraitLabel('shell', customTraits.shell),
    glowbudTraitLabel('skin', customTraits.skin ?? 'red'),
  ].join(' / '), [customTraits])
  const displayLookLine = displayMode === 'create' ? customLookLine : lookLine
  const visibleOwnerState: OwnerState = ownerState.tokenId === tokenId
    ? ownerState
    : { tokenId, status: 'loading', owner: null }
  const lookStatus = composition.unmatched.length === 0
    ? `Complete ${attributes.length}-trait 3D look`
    : `${composition.unmatched.length} trait${composition.unmatched.length === 1 ? '' : 's'} coming soon`

  const loadWalletOwnership = useCallback(async (address: string) => {
    const requestId = walletRequestRef.current + 1
    walletRequestRef.current = requestId
    setWalletStatus('loading')
    setWalletError('')
    setOwnedTokenIds([])
    setOwnershipSource(null)

    try {
      const response = await fetch(`/api/glowbuds-wallet/${address}`, {
        headers: { accept: 'application/json' },
      })
      const payload = await response.json() as {
        status?: string
        ownership?: GlowbudWalletOwnership | null
      }
      if (!response.ok || payload.status !== 'ready' || !payload.ownership) {
        throw new Error('Wallet ownership is unavailable')
      }
      if (walletRequestRef.current !== requestId) return
      setOwnedTokenIds(payload.ownership.tokenIds)
      setOwnershipSource(payload.ownership.source)
      setWalletStatus('ready')
    } catch {
      if (walletRequestRef.current !== requestId) return
      setWalletStatus('error')
      setWalletError('We could not read this wallet on Abstract. Please try again in a moment.')
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    walletRequestRef.current += 1
    setWalletConnection(null)
    setWalletStatus('idle')
    setWalletError('')
    setOwnedTokenIds([])
    setOwnershipSource(null)
  }, [])

  const connectWalletOption = useCallback(async (wallet: GlowbudWalletOption) => {
    setWalletVaultOpen(true)
    setWalletStatus('connecting')
    setWalletError('')
    try {
      const address = await connectGlowbudWallet(wallet.provider)
      if (!address) throw new Error('No wallet account returned')
      setWalletConnection({ address, label: wallet.name, provider: wallet.provider })
      await loadWalletOwnership(address)
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error
        ? Number((error as { code?: unknown }).code)
        : null
      setWalletStatus('idle')
      setWalletError(code === 4001
        ? 'Connection cancelled. Nothing changed.'
        : 'That wallet could not connect. You can try another wallet or view a public address.')
    }
  }, [loadWalletOwnership])

  const viewPublicWallet = useCallback((rawAddress: string) => {
    const address = normalizeGlowbudWalletAddress(rawAddress)
    if (!address) {
      setWalletStatus('idle')
      setWalletError('Enter a complete 0x wallet address.')
      return
    }
    setWalletConnection({ address, label: 'Public wallet', provider: null })
    void loadWalletOwnership(address)
  }, [loadWalletOwnership])

  useEffect(() => discoverGlowbudWallets(setWalletProviders), [])

  useEffect(() => {
    if (walletConnection || walletAutoReconnectRef.current || walletProviders.length === 0) return
    walletAutoReconnectRef.current = true
    let cancelled = false

    void (async () => {
      for (const wallet of walletProviders) {
        try {
          const address = await readConnectedGlowbudWallet(wallet.provider)
          if (!address || cancelled) continue
          setWalletConnection({ address, label: wallet.name, provider: wallet.provider })
          await loadWalletOwnership(address)
          break
        } catch {
          // Silent account reads should never interrupt the room.
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loadWalletOwnership, walletConnection, walletProviders])

  useEffect(() => {
    if (!walletConnection?.provider) return
    return subscribeToGlowbudWallet(walletConnection.provider, (address) => {
      if (!address) {
        disconnectWallet()
        return
      }
      setWalletConnection((current) => current ? { ...current, address } : current)
      void loadWalletOwnership(address)
    })
  }, [disconnectWallet, loadWalletOwnership, walletConnection?.provider])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('token', String(tokenId))
    const nativeWardrobeRoute = window.location.pathname.replace(/\/+$/, '') === '/wardrobe'
    if (displayMode === 'create') {
      params.delete('mode')
      writeGlowbudCustomTraits(params, customTraits)
    } else {
      if (nativeWardrobeRoute) params.set('mode', 'collection')
      else params.delete('mode')
      for (const category of GLOWBUD_TRAIT_QUERY_KEYS) params.delete(category)
    }
    if (automaticPerformance || animation === 'idle') params.delete('animation')
    else params.set('animation', animation)
    if (soundEnabled) params.delete('sound')
    else params.set('sound', '0')
    const routePath = displayRoutePath(displayMode)
    window.history.replaceState(null, '', `${routePath}?${params.toString()}`)
  }, [animation, automaticPerformance, customTraits, displayMode, soundEnabled, tokenId])

  useEffect(() => {
    document.title = displayMode === 'create'
      ? 'Glowbuds 3D Wardrobe'
      : 'Glowbuds 3D Collection Room'
  }, [displayMode])

  useEffect(() => {
    if (displayMode !== 'collection') return

    const controller = new AbortController()

    fetch(`/api/glowbuds-owner/${tokenId}`, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json() as {
          status?: string
          owner?: OpenSeaOwner | null
        }
        if (!response.ok || payload.status !== 'ready' || !payload.owner) {
          throw new Error('OpenSea owner unavailable')
        }
        return payload.owner
      })
      .then((owner) => setOwnerState({ tokenId, status: 'ready', owner }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setOwnerState({ tokenId, status: 'unavailable', owner: null })
      })

    return () => controller.abort()
  }, [displayMode, tokenId])

  useEffect(() => {
    try {
      window.localStorage.setItem(CUSTOM_LOOK_STORAGE_KEY, JSON.stringify(customTraits))
    } catch {
      // The look remains shareable through the URL when storage is unavailable.
    }
  }, [customTraits])

  useEffect(() => () => {
    if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current)
    if (dressingTimerRef.current !== null) window.clearTimeout(dressingTimerRef.current)
    if (dressingPerformanceTimerRef.current !== null) window.clearTimeout(dressingPerformanceTimerRef.current)
  }, [])

  useEffect(() => {
    if (!automaticPerformance || revealActive || dressingPerformanceActive || reduceMotion) return

    let cancelled = false
    const timers = new Set<number>()
    const sequence: RedShellCritterAnimation[] = [
      'wave',
      'hop',
      'boogie',
      'showcase',
      'hop',
      'grumble',
      'wave',
      'boogie',
    ]
    let step = (tokenId + selectionPulse * 3 + (displayMode === 'create' ? 2 : 0)) % sequence.length

    const schedule = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer)
        callback()
      }, delay)
      timers.add(timer)
    }

    const queueNext = (delay: number) => {
      schedule(() => {
        if (cancelled) return
        const nextAnimation = sequence[step % sequence.length]
        const actionDuration = DIRECTED_ANIMATION_DURATIONS[nextAnimation]
        setAnimation(nextAnimation)
        playPose(nextAnimation)
        schedule(() => {
          if (cancelled) return
          setAnimation('idle')
          step += 1
          const quietBeat = 3600 + ((tokenId * 31 + step * 977) % 2600)
          queueNext(quietBeat)
        }, actionDuration)
      }, delay)
    }

    schedule(() => {
      if (!cancelled) setAnimation('idle')
    }, 0)
    const openingBeat = selectionPulse > 0
      ? 1650
      : 2850 + ((tokenId * 17) % 1600)
    queueNext(openingBeat)

    return () => {
      cancelled = true
      for (const timer of timers) window.clearTimeout(timer)
      timers.clear()
    }
  }, [automaticPerformance, displayMode, dressingPerformanceActive, playPose, reduceMotion, revealActive, selectionPulse, tokenId])

  useEffect(() => {
    const displayWindow = window as typeof window & {
      __GLOWBUD_DISPLAY_STATE__?: unknown
    }
    displayWindow.__GLOWBUD_DISPLAY_STATE__ = {
      tokenId,
      mode: displayMode,
      traits: activeTraits,
      sourceAttributes: attributes,
      matchedTraitCount: composition.matches.length,
      unmatched: composition.unmatched,
      animation,
      performanceMode: automaticPerformance ? 'automatic' : 'directed',
      detailsOpen,
      focusMode,
      wardrobeOpen,
      revealSequence,
      dressingCeremony,
      dressingActive,
      dressingPerformanceActive,
      soundEnabled,
      owner: visibleOwnerState.owner,
      ownerStatus: visibleOwnerState.status,
      wallet: {
        open: walletVaultOpen,
        address: walletConnection?.address ?? null,
        status: walletStatus,
        tokenIds: ownedTokenIds,
        source: ownershipSource,
      },
    }
  }, [activeTraits, animation, attributes, automaticPerformance, composition, detailsOpen, displayMode, dressingActive, dressingCeremony, dressingPerformanceActive, focusMode, ownedTokenIds, ownershipSource, revealSequence, soundEnabled, tokenId, visibleOwnerState.owner, visibleOwnerState.status, walletConnection?.address, walletStatus, walletVaultOpen, wardrobeOpen])

  const showToken = useCallback((nextTokenId: number) => {
    const [minimum, maximum] = tokenIndex.source.tokenRange
    if (!Number.isInteger(nextTokenId) || nextTokenId < minimum || nextTokenId > maximum) {
      setFormError(`Choose a Glowbud between ${minimum} and ${maximum}.`)
      return
    }
    setFormError('')
    setImageGatewayIndex(0)
    setShareFeedback('')
    setTokenId(nextTokenId)
    setTokenDraft(String(nextTokenId))
    setAnimation('idle')
    setDetailsOpen(false)
    setViewResetKey((value) => value + 1)
  }, [])

  function submitToken(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    showToken(Number.parseInt(tokenDraft, 10))
  }

  const showAdjacentToken = useCallback((direction: -1 | 1) => {
    const [minimum, maximum] = tokenIndex.source.tokenRange
    const next = tokenId + direction
    showToken(next < minimum ? maximum : next > maximum ? minimum : next)
  }, [showToken, tokenId])

  const showRandomToken = useCallback(() => {
    const [minimum, maximum] = tokenIndex.source.tokenRange
    showToken(Math.floor(Math.random() * (maximum - minimum + 1)) + minimum)
  }, [showToken])

  const beginDressingCeremony = useCallback((
    category: DressingCeremonyCategory,
    traitLabel: string,
  ) => {
    if (dressingTimerRef.current !== null) window.clearTimeout(dressingTimerRef.current)
    if (dressingPerformanceTimerRef.current !== null) window.clearTimeout(dressingPerformanceTimerRef.current)
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current)
      revealTimerRef.current = null
      setRevealActive(false)
    }

    const categoryLabel = category === 'look'
      ? 'Full look'
      : category === 'face'
        ? 'Face'
        : GLOWBUD_CATEGORY_LABELS[category as GlowbudWardrobeCategory]
    const categoryIndex = category === 'look'
      ? GLOWBUD_PLAYER_CATEGORIES.length + 1
      : [...GLOWBUD_PLAYER_CATEGORIES, 'flytrap'].indexOf(category as GlowbudWardrobeCategory)
    const pose = dressingPoseFor(category)

    setDressingCeremony((current) => ({
      sequence: current.sequence + 1,
      category,
      categoryLabel,
      traitLabel,
    }))
    setDressingActive(true)
    setDressingPerformanceActive(true)
    setSelectionPulse((pulse) => pulse + 1)
    setAnimation(pose)
    playTrait(Math.max(0, categoryIndex))
    playPose(pose)

    dressingTimerRef.current = window.setTimeout(() => {
      setDressingActive(false)
      dressingTimerRef.current = null
    }, DRESSING_CEREMONY_DURATION)

    const performanceDuration = Math.max(
      DRESSING_CEREMONY_DURATION,
      DIRECTED_ANIMATION_DURATIONS[pose],
    )
    dressingPerformanceTimerRef.current = window.setTimeout(() => {
      setAnimation('idle')
      setDressingPerformanceActive(false)
      dressingPerformanceTimerRef.current = null
    }, performanceDuration)
  }, [playPose, playTrait])

  const enterCreateMode = useCallback(() => {
    setCustomTraits({ ...composition.traits })
    setDisplayMode('create')
    setWalletVaultOpen(false)
    setWardrobeOpen(true)
    setDetailsOpen(false)
    setFocusMode(false)
    beginDressingCeremony('look', 'Wardrobe ready')
    playUi()
  }, [beginDressingCeremony, composition.traits, playUi])

  const enterCollectionMode = useCallback(() => {
    setDisplayMode('collection')
    setWalletVaultOpen(false)
    setWardrobeOpen(false)
    setFocusMode(false)
    setViewResetKey((value) => value + 1)
    playUi()
  }, [playUi])

  const chooseWardrobeCategory = useCallback((category: GlowbudWardrobeCategory) => {
    setWardrobeCategory(category)
    playUi()
  }, [playUi])

  const updateCustomTrait = useCallback((category: GlowbudTraitCategory, value: string) => {
    if (!glowbudTraitOptions(category).some((option) => option.value === value)) return
    if (customTraits[category] === value) return
    setCustomTraits((current) => (
      category === 'shell' && value === 'naked'
        ? createNakedGlowbudBaseline(current)
        : { ...current, [category]: value }
    ))
    beginDressingCeremony(category, glowbudTraitLabel(category, value))
  }, [beginDressingCeremony, customTraits])

  const resetCustomLook = useCallback(() => {
    setCustomTraits({ ...composition.traits })
    beginDressingCeremony('look', 'Source look')
  }, [beginDressingCeremony, composition.traits])

  const undressCustomLook = useCallback(() => {
    setCustomTraits((current) => createNakedGlowbudBaseline(current))
    setWardrobeCategory('shell')
    beginDressingCeremony('shell', 'Naked')
  }, [beginDressingCeremony])

  const remixCustomLook = useCallback(() => {
    setCustomTraits((current) => randomGlowbudTraits(current))
    beginDressingCeremony('look', 'Remixed')
  }, [beginDressingCeremony])

  const startReveal = useCallback(() => {
    if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current)
    if (dressingTimerRef.current !== null) {
      window.clearTimeout(dressingTimerRef.current)
      dressingTimerRef.current = null
      setDressingActive(false)
    }
    if (dressingPerformanceTimerRef.current !== null) {
      window.clearTimeout(dressingPerformanceTimerRef.current)
      dressingPerformanceTimerRef.current = null
      setDressingPerformanceActive(false)
    }
    setWardrobeOpen(false)
    setDetailsOpen(false)
    setFocusMode(false)
    setAnimation('hop')
    setRevealActive(true)
    setRevealSequence((value) => value + 1)
    playReveal()
    revealTimerRef.current = window.setTimeout(() => {
      setAnimation('idle')
      setRevealActive(false)
      revealTimerRef.current = null
    }, 2050)
  }, [playReveal])

  const openWalletVault = useCallback(() => {
    setWalletVaultOpen(true)
    setDetailsOpen(false)
    setWardrobeOpen(false)
    setFocusMode(false)
    playUi()
  }, [playUi])

  const selectOwnedGlowbud = useCallback((ownedTokenId: number) => {
    setDisplayMode('collection')
    setDetailsOpen(false)
    setWardrobeOpen(false)
    showToken(ownedTokenId)
    startReveal()
    if (window.matchMedia('(max-width: 820px)').matches) setWalletVaultOpen(false)
  }, [showToken, startReveal])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, button, a') || event.metaKey || event.ctrlKey || event.altKey) return
      const cameraDirections: Partial<Record<KeyboardEvent['key'], Pick<CameraNudge, 'horizontal' | 'vertical'>>> = {
        ArrowLeft: { horizontal: -1, vertical: 0 },
        ArrowRight: { horizontal: 1, vertical: 0 },
        ArrowUp: { horizontal: 0, vertical: 1 },
        ArrowDown: { horizontal: 0, vertical: -1 },
      }
      const cameraDirection = cameraDirections[event.key]
      if (cameraDirection) {
        event.preventDefault()
        setCameraNudge((value) => ({
          sequence: value.sequence + 1,
          ...cameraDirection,
        }))
      }
      if (event.key.toLowerCase() === 'r') {
        if (displayMode === 'create') remixCustomLook()
        else showRandomToken()
      }
      if (event.key.toLowerCase() === 'w' && displayMode === 'create') {
        setWardrobeOpen((value) => !value)
        playUi()
      }
      if (event.key === ' ' && displayMode === 'create') {
        event.preventDefault()
        startReveal()
      }
      if (event.key === 'Escape') {
        if (museumIntegrated) {
          event.preventDefault()
          window.location.assign('/')
          return
        }
        setDetailsOpen(false)
        setFocusMode(false)
        setWalletVaultOpen(false)
        setWardrobeOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [displayMode, museumIntegrated, playUi, remixCustomLook, showRandomToken, startReveal])

  async function shareDisplay() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: displayMode === 'create' ? 'My custom Glowbud in 3D' : `Glowbud #${tokenId} in 3D`,
          text: displayMode === 'create'
            ? 'Meet the Glowbud I built in the 3D Wardrobe Room.'
            : `Meet Glowbud #${tokenId} in the 3D Collection Room.`,
          url: window.location.href,
        })
        setShareFeedback('Shared')
      } else {
        await navigator.clipboard.writeText(window.location.href)
        setShareFeedback('Link copied')
      }
      window.setTimeout(() => setShareFeedback(''), 1800)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setShareFeedback('Share unavailable')
      window.setTimeout(() => setShareFeedback(''), 1800)
    }
  }

  const sourceImage = imageUrls[imageGatewayIndex]
  const showroomClassName = [
    'showroom',
    detailsOpen && !focusMode ? 'has-look-drawer' : '',
    displayMode === 'create' ? 'is-create-mode' : '',
    displayMode === 'create' && wardrobeOpen && !focusMode ? 'is-wardrobe-open' : '',
    walletVaultOpen && !focusMode ? 'has-wallet-vault' : '',
    dressingActive ? 'is-dressing' : '',
    revealActive ? 'is-revealing' : '',
    focusMode ? 'is-focus-mode' : '',
  ].filter(Boolean).join(' ')

  return (
    <main className={`display-room-app${focusMode ? ' is-focus-mode' : ''}`}>
      {!focusMode ? (
        <header className="display-header">
          <div className="header-navigation">
            {museumIntegrated ? (
              <button
                type="button"
                className="museum-return-link"
                aria-label="Return to the Museum of Based Art lobby"
                onClick={() => window.location.assign('/')}
              >
                <span aria-hidden="true">&larr;</span>
                Exit to Lobby
                <kbd aria-hidden="true">Esc</kbd>
              </button>
            ) : null}
            <div className="display-brand">
              <strong>Glowbuds 3D</strong>
              <span>{displayMode === 'create' ? 'Player Wardrobe' : 'Collection Gallery'}</span>
            </div>

            <div className="room-mode-switch" aria-label="Room mode">
              <button
                type="button"
                aria-pressed={displayMode === 'collection'}
                onClick={() => {
                  if (displayMode !== 'collection') enterCollectionMode()
                }}
              >
                Collection
              </button>
              <button
                type="button"
                aria-pressed={displayMode === 'create'}
                onClick={() => {
                  if (displayMode !== 'create') enterCreateMode()
                }}
              >
                Wardrobe
              </button>
            </div>
          </div>

          {displayMode === 'collection' ? (
            <form className="quick-search" onSubmit={submitToken}>
              <label className="visually-hidden" htmlFor="token-id">Glowbud token ID</label>
              <span aria-hidden="true">#</span>
              <input
                id="token-id"
                aria-label="Glowbud token ID"
                inputMode="numeric"
                min={tokenIndex.source.tokenRange[0]}
                max={tokenIndex.source.tokenRange[1]}
                value={tokenDraft}
                onChange={(event) => setTokenDraft(event.target.value.replace(/\D/g, '').slice(0, 4))}
                aria-describedby={formError ? 'token-error' : undefined}
              />
              <button type="submit">View</button>
            </form>
          ) : (
            <div className="creation-status">
              <span>Now dressing</span>
              <div>
                <strong>Glowbud #{tokenId}</strong>
                <small>Custom 3D look</small>
              </div>
            </div>
          )}

          <div className="header-actions">
            <button
              type="button"
              className={`wallet-header-button${walletConnection ? ' is-connected' : ''}`}
              aria-pressed={walletVaultOpen}
              onClick={() => {
                if (walletVaultOpen) {
                  setWalletVaultOpen(false)
                  playUi()
                } else {
                  openWalletVault()
                }
              }}
            >
              {walletConnection
                ? `My Glowbuds${walletStatus === 'ready' ? ` ${ownedTokenIds.length}` : ''}`
                : 'Connect Wallet'}
            </button>
            {displayMode === 'collection' ? (
              <button type="button" className="surprise-button" onClick={() => {
                playUi()
                showRandomToken()
              }}>
                Surprise me
              </button>
            ) : (
              <button type="button" className="surprise-button" onClick={remixCustomLook}>
                Remix Look
              </button>
            )}
             <button
               type="button"
               className="sound-button"
               aria-label={soundEnabled ? 'Turn sound off' : 'Turn sound on'}
               aria-pressed={soundEnabled}
               title={soundEnabled ? 'Turn sound off' : 'Turn sound on'}
               onClick={() => {
                if (soundEnabled) playUi()
                setSoundEnabled((value) => !value)
              }}
            >
              Sound {soundEnabled ? 'On' : 'Off'}
            </button>
          </div>
          {displayMode === 'collection' && formError ? <div className="header-error" id="token-error" role="alert">{formError}</div> : null}
        </header>
      ) : null}

      <section
        className={showroomClassName}
        aria-label={displayMode === 'create' ? 'Custom Glowbud avatar room' : `3D display of Glowbud #${tokenId}`}
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
        data-animation={animation}
        data-dressing-fx={dressingActive ? 'active' : 'idle'}
        data-dressing-performance={dressingPerformanceActive ? 'active' : 'idle'}
        data-performance-mode={automaticPerformance ? 'automatic' : 'directed'}
        tabIndex={0}
      >
        <div className="showroom-canvas">
          <DisplayRoomScene
            tokenId={tokenId}
            traits={activeTraits}
            animation={animation}
            createMode={displayMode === 'create'}
            revealSequence={revealSequence}
            selectionPulse={selectionPulse}
            dressingCeremony={dressingCeremony}
            viewResetKey={viewResetKey}
            cameraNudge={cameraNudge}
          />
        </div>

        {displayMode === 'create' && dressingActive && !focusMode ? (
          <div
            key={dressingCeremony.sequence}
            className={`dressing-callout is-${dressingCeremony.category}`}
            role="status"
          >
            <span>{dressingCeremony.categoryLabel}</span>
            <strong>{dressingCeremony.traitLabel}</strong>
          </div>
        ) : null}

        {!focusMode ? (
          <div className="showroom-title">
            <span>{displayMode === 'create' ? 'Your avatar' : 'Now in the room'}</span>
            <strong key={`${displayMode}-${tokenId}`}>
              {displayMode === 'create' ? 'Your Glowbud' : `Glowbud #${tokenId}`}
            </strong>
            {displayMode === 'collection' ? <OwnerCredit state={visibleOwnerState} /> : null}
            <small>{displayLookLine || 'One of a kind'}</small>
          </div>
        ) : null}

        {displayMode === 'collection' && !focusMode && !detailsOpen && !walletVaultOpen ? (
          <button
            type="button"
            className="original-peek"
            onClick={() => {
              setDetailsOpen(true)
              playUi()
            }}
            title="See the original pixel Glowbud and its traits"
          >
            <span className="original-peek-image">
              <SourceArtwork
                tokenId={tokenId}
                imageUrl={sourceImage}
                onError={() => setImageGatewayIndex((value) => Math.min(value + 1, imageUrls.length))}
              />
            </span>
            <span className="original-peek-label">
              <small>Original &amp; traits</small>
              <strong>Details</strong>
            </span>
          </button>
        ) : null}

        {!focusMode ? (
          <nav
            className={`showroom-dock ${displayMode === 'create' ? 'is-create-controls' : 'is-collection-controls'}`}
            aria-label="Glowbud display controls"
          >
            {displayMode === 'collection' ? (
              <div className="browse-controls" aria-label="Browse collection">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Previous Glowbud"
                  title="Previous Glowbud"
                  onClick={() => {
                    playUi()
                    showAdjacentToken(-1)
                  }}
                >
                  &#8592;
                </button>
                <button type="button" onClick={() => {
                  playUi()
                  showRandomToken()
                }}>Surprise</button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Next Glowbud"
                  title="Next Glowbud"
                  onClick={() => {
                    playUi()
                    showAdjacentToken(1)
                  }}
                >
                  &#8594;
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="wardrobe-control"
                aria-pressed={wardrobeOpen}
                onClick={() => {
                  setWardrobeOpen((value) => !value)
                  playUi()
                }}
              >
                Wardrobe
              </button>
            )}

            {displayMode === 'collection' ? (
              <button
                type="button"
                className="details-control"
                aria-pressed={detailsOpen}
                onClick={() => {
                  setWalletVaultOpen(false)
                  setDetailsOpen((value) => !value)
                  playUi()
                }}
              >
                Details
              </button>
            ) : (
              <button type="button" className="reveal-control" onClick={startReveal}>
                Reveal
              </button>
            )}
            <button
              type="button"
              className="focus-control"
              onClick={() => {
                setDetailsOpen(false)
                setWalletVaultOpen(false)
                setWardrobeOpen(false)
                setFocusMode(true)
                playUi()
              }}
            >
              Full view
            </button>
            <button type="button" className="share-control" onClick={() => {
              playUi()
              void shareDisplay()
            }}>
              Share
            </button>
          </nav>
        ) : null}

        {displayMode === 'collection' && detailsOpen && !focusMode ? (
          <aside className="look-drawer" aria-label={`Glowbud #${tokenId} details`}>
            <div className="look-drawer-heading">
              <div>
                <span>Original &amp; traits</span>
                <strong>Glowbud #{tokenId}</strong>
              </div>
              <button
                type="button"
                className="panel-close"
                aria-label="Close look panel"
                title="Close"
                onClick={() => setDetailsOpen(false)}
              >
                X
              </button>
            </div>
            <div className="drawer-source">
              <span className="drawer-source-image">
                <SourceArtwork
                  tokenId={tokenId}
                  imageUrl={sourceImage}
                  onError={() => setImageGatewayIndex((value) => Math.min(value + 1, imageUrls.length))}
                />
              </span>
              <div>
                <small>Pixel original</small>
                <strong>{lookLine || `Glowbud #${tokenId}`}</strong>
                <a
                  className="opensea-link drawer-opensea-link"
                  href={`https://opensea.io/item/abstract/${tokenIndex.source.contract}/${tokenId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on OpenSea
                </a>
              </div>
            </div>
            <ul className="look-list">
              {attributes.map((attribute) => (
                <li key={`${attribute.trait_type}::${attribute.value}`}>
                  <span>{attribute.trait_type}</span>
                  <strong>{attribute.value}</strong>
                </li>
              ))}
            </ul>
            <div className={composition.unmatched.length === 0 ? 'look-status is-complete' : 'look-status'}>
              {lookStatus}
            </div>
          </aside>
        ) : null}

        {!focusMode ? (
          <GlowbudWalletVault
            key={walletConnection?.address ?? 'disconnected-wallet'}
            open={walletVaultOpen}
            providers={walletProviders}
            address={walletConnection?.address ?? null}
            connectionLabel={walletConnection?.label ?? null}
            status={walletStatus}
            error={walletError}
            ownedGlowbuds={ownedGlowbuds}
            selectedTokenId={tokenId}
            ownershipSource={ownershipSource}
            onClose={() => {
              setWalletVaultOpen(false)
              playUi()
            }}
            onConnect={(wallet) => {
              playUi()
              void connectWalletOption(wallet)
            }}
            onViewAddress={(address) => {
              playUi()
              viewPublicWallet(address)
            }}
            onDisconnect={() => {
              playUi()
              disconnectWallet()
            }}
            onRefresh={() => {
              playUi()
              if (walletConnection) void loadWalletOwnership(walletConnection.address)
            }}
            onSelectToken={(ownedTokenId) => {
              playUi()
              selectOwnedGlowbud(ownedTokenId)
            }}
          />
        ) : null}

        {displayMode === 'create' && !focusMode ? (
          <GlowbudWardrobe
            open={wardrobeOpen}
            traits={customTraits}
            activeCategory={wardrobeCategory}
            onCategoryChange={chooseWardrobeCategory}
            onTraitChange={updateCustomTrait}
            onClose={() => {
              setWardrobeOpen(false)
              playUi()
            }}
            onRandomize={remixCustomLook}
            onReset={resetCustomLook}
            onUndress={undressCustomLook}
            onReveal={startReveal}
          />
        ) : null}

        {revealActive ? <div className="reveal-stage-frame" aria-hidden="true" /> : null}

        {focusMode && !cinematicMode ? (
          <button type="button" className="focus-exit" onClick={() => {
            setFocusMode(false)
            playUi()
          }}>
            Exit full view
          </button>
        ) : null}

        {shareFeedback ? <div className="display-toast" role="status">{shareFeedback}</div> : null}
      </section>
    </main>
  )
}
