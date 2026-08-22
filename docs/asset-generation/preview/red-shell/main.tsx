import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { createRoot } from 'react-dom/client'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import {
  GlowbudTraitAvatarAsset,
  type GlowbudAssetPickInfo,
  type GlowbudBackgroundTrait,
  type GlowbudMossPickInfo,
  type GlowbudTraitLoadout,
  type RedShellCritterAnimation,
} from '../../code-examples/RedShellIdleCritterAsset.example'
import {
  GLOWBUDS_TRACKER_STATUS_LABELS,
  GLOWBUDS_TRAIT_TRACKER_ROWS,
  GLOWBUDS_TRAIT_TRACKER_SOURCE,
  getGlowbudsTraitTrackerSummary,
} from './glowbudsTraitTracker'
import {
  GLOWBUDS_QUALITY_GATES,
  getGlowbudsOneToOneConflicts,
  getGlowbudsProductionQueue,
  getGlowbudsReferenceSource,
  getGlowbudsTraitKey,
  type GlowbudsProductionQueueItem,
} from './glowbudsTraitProduction'
import {
  GLOWBUD_BACKGROUND_COLORS,
  GLOWBUD_TRAIT_OPTIONS,
  type GlowbudTraitOption,
} from './glowbudsTraitCatalog'

const MIN_ZOOM = 0.72
const MAX_ZOOM = 1.72
const ZOOM_STEP = 0.14
const CAMERA_MOVE_STEP = 0.18
const CAMERA_DEPTH_STEP = 0.32
const CAMERA_OFFSET_LIMIT = 1.35
const EXPERIMENT_STORAGE_KEY = 'glowbud-trait-studio.experimentSlots.v1'
const REQUIRED_REVIEW_GATE_COUNT = 8

type TraitCategory = 'background' | 'shell' | 'head' | 'pot' | 'companion' | 'held' | 'face' | 'eyes' | 'mouth' | 'nose' | 'skin' | 'flytrap'
type TraitOption<TValue extends string> = GlowbudTraitOption<TValue>
type CameraViewId = 'front' | 'left-oblique' | 'right-oblique' | 'left-side' | 'right-side' | 'back' | 'top'
type QueueFilter = 'next' | 'build' | 'verify' | 'all'
type CameraOffset = {
  x: number
  y: number
  z: number
}

type ExperimentSlot = {
  id: string
  name: string
  prompt: string
  status: 'Draft' | 'Built' | 'Complete'
  traits: GlowbudTraitLoadout
  reviewGates?: string[]
}

const GLOWBUD_BACKGROUND_SHADOWS: Record<GlowbudBackgroundTrait, string> = {
  blue: '#55789f',
  yellow: '#a99453',
  green: '#739b5e',
  purple: '#755fa4',
  red: '#a86169',
}

const CAMERA_VIEW_PRESETS: Record<CameraViewId, {
  label: string
  shortLabel: string
  position: [number, number, number]
}> = {
  front: { label: 'Front view', shortLabel: 'Front', position: [0, 0.08, 7.2] },
  'left-oblique': { label: 'Left three-quarter view', shortLabel: '3/4 L', position: [-4.5, 0.22, 5.15] },
  'right-oblique': { label: 'Right three-quarter view', shortLabel: '3/4 R', position: [4.5, 0.22, 5.15] },
  'left-side': { label: 'Left side view', shortLabel: 'Left', position: [-6.7, 0.18, 0] },
  'right-side': { label: 'Right side view', shortLabel: 'Right', position: [6.7, 0.18, 0] },
  back: { label: 'Back view', shortLabel: 'Back', position: [0, 0.18, -6.7] },
  top: { label: 'High top view', shortLabel: 'Top', position: [0, 5.75, 4.35] },
}

const REVIEW_GATES = GLOWBUDS_QUALITY_GATES

const DEFAULT_TRAITS: GlowbudTraitLoadout = {
  shell: 'seed-shell',
  head: 'hibiscus',
  pot: 'blue-flower-pot',
  held: 'none',
  face: 'soft',
  eyes: 'mellow',
  mouth: 'classic-smile',
  nose: 'none',
  skin: 'red',
  background: 'blue',
  flytrap: 'friendly-bite',
  companion: 'none',
}

const STARTER_EXPERIMENTS: ExperimentSlot[] = [
  {
    id: 'slot-a',
    name: 'Trait Slot A',
    prompt: 'Build a friendly Venus flytrap head trait with three rounded snapping heads in the same matte blue pot style.',
    status: 'Draft',
    traits: { ...DEFAULT_TRAITS, head: 'venus-flytrap', flytrap: 'friendly-bite' },
  },
  {
    id: 'slot-b',
    name: 'Trait Slot B',
    prompt: 'Build a second friendly Venus flytrap pass with rounder heads, clearer cute expression, and stronger 3D cup depth.',
    status: 'Draft',
    traits: { shell: 'seed-shell', head: 'venus-flytrap', pot: 'blue-flower-pot', held: 'none', face: 'soft', flytrap: 'friendly-bite' },
  },
  {
    id: 'slot-c',
    name: 'Trait Slot C',
    prompt: 'Build a wide crown Venus flytrap with a big center head, broad lips, and readable chunky 3D forms.',
    status: 'Draft',
    traits: { shell: 'seed-shell', head: 'venus-flytrap', pot: 'blue-flower-pot', held: 'none', face: 'soft', flytrap: 'wide-crown' },
  },
  {
    id: 'slot-amanita',
    name: 'Trait Amanita',
    prompt: 'Build an extremely cute toony Amanita muscaria mushroom cluster in the pot, with painted white cap spots, stubby cream stems, and natural soil contact.',
    status: 'Built',
    traits: { shell: 'seed-shell', head: 'amanita-muscaria', pot: 'blue-flower-pot', held: 'none', face: 'soft', eyes: 'mellow', mouth: 'classic-smile', skin: 'red' },
  },
  {
    id: 'slot-sunflower',
    name: 'Trait Sunflower',
    prompt: 'Build a tall polished cartoon sunflower head trait with a big curved stalk, broad organic leaves, layered golden petals, and a detailed seed center planted naturally in the pot.',
    status: 'Built',
    traits: { shell: 'seed-shell', head: 'sunflower', pot: 'blue-flower-pot', held: 'none', face: 'soft', eyes: 'mellow', mouth: 'classic-smile', skin: 'red' },
  },
  {
    id: 'slot-moss',
    name: 'Trait Moss',
    prompt: 'Build an ancient moss shell by duplicating the Seed Shell structure exactly, then making it darker, softer, highly textured, and fully covered in cartoon moss and lichen.',
    status: 'Draft',
    traits: { shell: 'moss-shell', head: 'none', pot: 'blue-flower-pot', held: 'none', face: 'soft', flytrap: 'friendly-bite' },
  },
  {
    id: 'slot-aero',
    name: 'Trait Aero',
    prompt: 'Build a purple metallic shell from the Seed Shell structure with aggressive chrome texture and angular race-car fin ears on top.',
    status: 'Built',
    traits: { shell: 'aero-metal-shell', head: 'none', pot: 'blue-flower-pot', held: 'none', face: 'soft', flytrap: 'friendly-bite' },
  },
  {
    id: 'slot-crystal',
    name: 'Trait Crystal',
    prompt: 'Build a fine diamond chandelier shell with translucent icy facets, crown crystals, bead chains, hanging jewel drops, and sparkling toon glints.',
    status: 'Built',
    traits: {
      shell: 'crystal-shell',
      head: 'none',
      pot: 'blue-flower-pot',
      held: 'none',
      face: 'soft',
      eyes: 'open',
      mouth: 'open',
      skin: 'glow-lime',
      flytrap: 'friendly-bite',
    },
  },
  {
    id: 'slot-gold',
    name: 'Trait Gold',
    prompt: 'Build a rough pirate-gold shell from the Seed Shell structure: more egg-shaped, chunky raw gold, messy multicolour jewels embedded in the shell, and bright treasure glints.',
    status: 'Built',
    traits: {
      shell: 'gold-jewel-shell',
      head: 'none',
      pot: 'blue-flower-pot',
      held: 'none',
      face: 'soft',
      eyes: 'open',
      mouth: 'classic-smile',
      skin: 'glow-lime',
      flytrap: 'friendly-bite',
    },
  },
  {
    id: 'slot-amethyst',
    name: 'Trait Amethyst',
    prompt: 'Build a chunky amethyst geode shell: rough dark stone exterior, cracked-open purple crystal face, embedded lavender shards, raw faceted texture, and polished toon sparkle.',
    status: 'Built',
    traits: {
      shell: 'amethyst-geode-shell',
      head: 'none',
      pot: 'blue-flower-pot',
      held: 'none',
      face: 'soft',
      eyes: 'open',
      mouth: 'classic-smile',
      skin: 'glow-lime',
      flytrap: 'friendly-bite',
    },
  },
  {
    id: 'slot-snail',
    name: 'Trait Snail',
    prompt: 'Build a tiny cute 3D cartoon snail buddy sitting beside the shell: green foot body, raised head, eye stalks, orange smiling mouth, and a domed spiral shell.',
    status: 'Built',
    traits: {
      shell: 'aero-metal-shell',
      head: 'none',
      pot: 'blue-flower-pot',
      companion: 'cartoon-snail',
      held: 'none',
      face: 'soft',
      eyes: 'mellow',
      mouth: 'classic-smile',
      skin: 'stone-gray',
      flytrap: 'friendly-bite',
    },
  },
]

const TRAIT_OPTIONS = GLOWBUD_TRAIT_OPTIONS

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))))
}

function clampCameraOffset(value: number) {
  return Math.min(CAMERA_OFFSET_LIMIT, Math.max(-CAMERA_OFFSET_LIMIT, Number(value.toFixed(2))))
}

function readAnimationParam(): RedShellCritterAnimation {
  const animation = new URLSearchParams(window.location.search).get('animation')
  return animation === 'hop' || animation === 'grumble' ? animation : 'idle'
}

function readCameraParam(): CameraViewId {
  const camera = new URLSearchParams(window.location.search).get('camera') as CameraViewId | null
  return camera && camera in CAMERA_VIEW_PRESETS ? camera : 'front'
}

function loadFromStorage<TValue>(key: string, fallback: TValue): TValue {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as TValue) : fallback
  } catch {
    return fallback
  }
}

function syncStarterCopy<TValue extends { id: string }>(record: TValue, starter: TValue): TValue {
  const syncedRecord = { ...record }
  if ('name' in starter) {
    Object.assign(syncedRecord, { name: starter.name })
  }
  if ('note' in starter) {
    Object.assign(syncedRecord, { note: starter.note })
  }
  if ('prompt' in starter) {
    Object.assign(syncedRecord, { prompt: starter.prompt })
  }
  return syncedRecord
}

function loadRecordsWithStarters<TValue extends { id: string }>(key: string, starters: TValue[]): TValue[] {
  const storedRecords = loadFromStorage<TValue[]>(key, starters)
  if (!Array.isArray(storedRecords)) return starters

  const starterById = new Map(starters.map((record) => [record.id, record]))
  const syncedRecords = storedRecords.map((record) => {
    const starter = starterById.get(record.id)
    return starter ? syncStarterCopy(record, starter) : record
  })
  const storedIds = new Set(syncedRecords.map((record) => record.id))
  return [
    ...syncedRecords,
    ...starters.filter((record) => !storedIds.has(record.id)),
  ]
}

function normalizeTraits(nextTraits: GlowbudTraitLoadout): GlowbudTraitLoadout {
  const rawHead = nextTraits.head as string
  const filledTraits: GlowbudTraitLoadout = {
    ...nextTraits,
    head: rawHead === 'hibiscus-pot'
      ? 'hibiscus'
      : rawHead === 'venus-flytrap-pot'
        ? 'venus-flytrap'
        : rawHead === 'amanita-muscaria-pot'
          ? 'amanita-muscaria'
          : rawHead === 'sunflower-pot'
            ? 'sunflower'
            : rawHead === 'cactus-pot'
              ? 'cactus'
              : rawHead === 'snake-plant-pot'
                ? 'snake-plant'
                : rawHead === 'lotus-pot'
                  ? 'lotus'
                  : rawHead === 'douglas-pot'
                    ? 'douglas'
                    : rawHead === 'fern-pot'
                      ? 'fern'
                      : rawHead === 'myrtle-pot'
                        ? 'myrtle'
                        : rawHead === 'lavender-pot'
                          ? 'lavender'
                          : rawHead === 'dandelion-pot'
                            ? 'dandelion'
                            : rawHead === 'sprout-pot'
                              ? 'sprout'
                              : rawHead === 'bunch-of-flowers-pot'
                                ? 'bunch-of-flowers'
                                : rawHead === 'roses-pot'
                                  ? 'roses'
                                  : rawHead === 'bonsai-pot'
                                    ? 'bonsai'
                                    : rawHead === 'bonsai-sakura-pot'
                                      ? 'bonsai-sakura'
                                      : rawHead === 'flower-pot'
                                        ? 'flower'
                                        : rawHead === 'two-flowers-pot'
                                          ? 'two-flowers'
                                          : rawHead === 'palm-tree-pot'
                                            ? 'palm-tree'
                                        : nextTraits.head,
    pot: nextTraits.pot ?? (rawHead.endsWith('-pot') ? 'blue-flower-pot' : 'blue-flower-pot'),
    skin: nextTraits.skin ?? 'red',
    flytrap: nextTraits.flytrap ?? 'friendly-bite',
    companion: nextTraits.companion ?? 'none',
    eyes: nextTraits.eyes ?? 'mellow',
    mouth: nextTraits.mouth ?? 'classic-smile',
    nose: nextTraits.nose ?? 'none',
    background: nextTraits.background ?? 'blue',
  }
  if (!TRAIT_OPTIONS.flytrap.some((option) => option.value === filledTraits.flytrap)) {
    filledTraits.flytrap = 'friendly-bite'
  }
  if (!TRAIT_OPTIONS.skin.some((option) => option.value === filledTraits.skin)) {
    filledTraits.skin = 'red'
  }
  if (!TRAIT_OPTIONS.pot.some((option) => option.value === filledTraits.pot)) {
    filledTraits.pot = 'blue-flower-pot'
  }
  if (!TRAIT_OPTIONS.held.some((option) => option.value === filledTraits.held)) {
    filledTraits.held = 'none'
  }
  if (!TRAIT_OPTIONS.eyes.some((option) => option.value === filledTraits.eyes)) {
    filledTraits.eyes = 'mellow'
  }
  if (!TRAIT_OPTIONS.mouth.some((option) => option.value === filledTraits.mouth)) {
    filledTraits.mouth = 'classic-smile'
  }
  if (!TRAIT_OPTIONS.nose.some((option) => option.value === filledTraits.nose)) {
    filledTraits.nose = 'none'
  }
  if (!TRAIT_OPTIONS.background.some((option) => option.value === filledTraits.background)) {
    filledTraits.background = 'blue'
  }
  if ((filledTraits.head as string) === 'cartoon-snail-pot' || (filledTraits.head as string) === 'cartoon-snail') {
    filledTraits.head = 'none'
    filledTraits.companion = 'cartoon-snail'
  }
  if (!TRAIT_OPTIONS.head.some((option) => option.value === filledTraits.head)) {
    filledTraits.head = 'none'
  }
  if (!TRAIT_OPTIONS.companion.some((option) => option.value === filledTraits.companion)) {
    filledTraits.companion = 'none'
  }
  return filledTraits
}

function readInitialTraits(): GlowbudTraitLoadout {
  const params = new URLSearchParams(window.location.search)
  const traits = { ...DEFAULT_TRAITS }

  for (const category of Object.keys(TRAIT_OPTIONS) as TraitCategory[]) {
    const requestedValue = params.get(category)
    if (!requestedValue) continue
    const options = TRAIT_OPTIONS[category] as TraitOption<string>[]
    if (options.some((option) => option.value === requestedValue)) {
      Object.assign(traits, { [category]: requestedValue })
    }
  }

  return normalizeTraits(traits)
}

function deriveTraitsFromPrompt(prompt: string, baseTraits: GlowbudTraitLoadout): GlowbudTraitLoadout {
  const lowerPrompt = prompt.toLowerCase()
  const nextTraits = { ...baseTraits }
  const asksForGoldType = /\b(type\s*:?\s*gold|gold\s+(skin|type|body|glowbud))\b/.test(lowerPrompt)
  const asksForPurpEyes = /\b(purp|purple eyes|violet eyes)\b/.test(lowerPrompt)

  if (/\b(green cloak|green robe|green-trim(?:med)? cloak)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'green-cloak'
  } else if (/\b(cloak|wizard|robe|red cloak|red-trim(?:med)? cloak)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'wizard-cloak'
  }
  if (/\b(seed|shell|normal shell|flower shell)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'seed-shell'
  }
  if (/\b(smooth shell|smooth-shell|satin shell|polished chestnut shell)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'smooth-shell'
  }
  if (/\b(stoic shell|stoic-shell|honed grey shell|honed gray shell|graphite shell)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'stoic-shell'
  }
  if (/\b(soft[- ]shell|fluffy shell|plush shell|fuzzy shell|soft coat)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'soft-shell'
  }
  if (/\b(rock[- ]shell|rocky shell|stone shell|boulder shell|boulder|craggy stone)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'rock-shell'
  }
  if (/\b(log[- ]shell|wood shell|wooden shell|tree trunk|hollow stump|stump shell)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'log-shell'
  }
  if (/\b(hoodie|hoodie shell|pullover hoodie|sweatshirt hood|cozy hood|cosy hood)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'hoodie-shell'
  }
  if (/\b(guard shell|roman helmet|legionary helmet|centurion helmet|horsehair crest|guard armor)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'guard-shell'
  }
  if (/\b(heavy duty|heavy-duty|heavy duty shell|tank shell|armou?red shell|army shell|military shell|tank armour|tank armor)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'heavy-duty-shell'
  }
  if (/\b(robot|robot shell|robot costume|robot armor|robot armour|mech|mech suit|v antenna|v-antenna)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'robot-shell'
  }
  if (/\b(spikey|spiky|spike[- ]shell|spiked shell|multicolou?red spikes|multicolou?red spiked shell)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'spikey-shell'
  }
  if (/\b(shark|shark shell|shark costume|shark mascot|shark onesie|shark jaws)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'shark-shell'
  }
  if (/\b(horny|horny shell|horned shell|devil shell|demon shell|devil horns|ram horns)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'horny-shell'
  }
  if (/\b(raddish|radish|raddish shell|radish shell|root vegetable shell|root bulb shell)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'raddish-shell'
  }
  if (/\b(moss|mossy|lichen|overgrown|forest shell|old shell)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'moss-shell'
  }
  if (/\b(ancient shell|ancient|ruin(?:ed)? shell|temple shell|petrified shell|root-bound shell|overgrown temple)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'ancient-shell'
  }
  if (!asksForPurpEyes && /\b(aero|metal|metallic|chrome|purple|race|racing|fin|fins|spoiler)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'aero-metal-shell'
  }
  if (/\b(amethyst|amaythst|amathyst|geode|purple crystal|purple geode|cracked crystal|raw purple stone)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'amethyst-geode-shell'
  }
  if (/\b(crystal|diamond|chandelier|glass|gem|jewel|prism|sparkle|sparkling)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'crystal-shell'
  }
  if (/\b(gemstone|gemstone shell|polished purple gem|purple jewel|display gem|museum gem|jewelry gem|jewellery gem)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'gemstone-shell'
  }
  if (/\b(ice|icy|ice shell|frozen shell|frosted shell|ice cube|melting ice|glacier|glacial)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'ice-shell'
  }
  if (/\b(amethyst|amaythst|amathyst|geode|purple crystal|purple geode|cracked crystal|raw purple stone)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'amethyst-geode-shell'
  }
  if (!asksForGoldType && /\b(gold|golden|pirate|treasure|hoard|bejewel|bejewled|bejeweled|raw gold|coin|coins)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'gold-jewel-shell'
  }
  if (/\b(amethyst|amaythst|amathyst|geode|purple crystal|purple geode|cracked crystal|raw purple stone)\b/.test(lowerPrompt)) {
    nextTraits.shell = 'amethyst-geode-shell'
  }
  if (/\b(hibiscus|amami)\b/.test(lowerPrompt)) {
    nextTraits.head = 'hibiscus'
  }
  if (/\b(single flower|blue flower|garden flower|flower plant|flower)\b/.test(lowerPrompt)) {
    nextTraits.head = 'flower'
  }
  if (/\b(two flowers|two-flower|red and purple flowers|paired flowers|flower pair)\b/.test(lowerPrompt)) {
    nextTraits.head = 'two-flowers'
  }
  if (/\b(palm tree|palm-tree|miniature palm|toon palm|tropical palm)\b/.test(lowerPrompt)) {
    nextTraits.head = 'palm-tree'
  }
  if (/\b(venus|flytrap|trap plant|snapper|snapping plant|carnivorous)\b/.test(lowerPrompt)) {
    nextTraits.head = 'venus-flytrap'
  }
  if (/\b(amanita|muscaria|muscara|mushroom|mushrooms|toadstool|fungus|fungi)\b/.test(lowerPrompt)) {
    nextTraits.head = 'amanita-muscaria'
  }
  if (/\b(sunflower|sun flower|sunflowers|sun flower pot|tall flower|yellow flower|golden flower|big flower stalk)\b/.test(lowerPrompt)) {
    nextTraits.head = 'sunflower'
  }
  if (/\b(cactus|cacti|cactus plant|desert plant|saguaro)\b/.test(lowerPrompt)) {
    nextTraits.head = 'cactus'
  }
  if (/\b(snake plant|snake plants|sansevieria|mother in laws tongue|mother-in-law's tongue)\b/.test(lowerPrompt)) {
    nextTraits.head = 'snake-plant'
  }
  if (/\b(lotus|lotus plant|lotus flower|purple lotus|water lotus)\b/.test(lowerPrompt)) {
    nextTraits.head = 'lotus'
  }
  if (/\b(douglas|douglas fir|fir tree|evergreen tree|conifer)\b/.test(lowerPrompt)) {
    nextTraits.head = 'douglas'
  }
  if (/\b(fern|ferns|sword fern|boston fern|fiddlehead|fiddleheads)\b/.test(lowerPrompt)) {
    nextTraits.head = 'fern'
  }
  if (/\b(myrtle|common myrtle|myrtle tree|myrtle topiary)\b/.test(lowerPrompt)) {
    nextTraits.head = 'myrtle'
  }
  if (/\b(lavender|english lavender|lavandula|lavender shrub|lavender flowers)\b/.test(lowerPrompt)) {
    nextTraits.head = 'lavender'
  }
  if (/\b(dandelion|dandelion clock|seed clock|blowball|puffball flower)\b/.test(lowerPrompt)) {
    nextTraits.head = 'dandelion'
  }
  if (/\b(sprout|seedling|baby plant|new growth|cotyledon|cotyledons)\b/.test(lowerPrompt)) {
    nextTraits.head = 'sprout'
  }
  if (/\b(bunch of flowers|flower bunch|mixed flowers|mixed bouquet|flower bouquet|bouquet)\b/.test(lowerPrompt)) {
    nextTraits.head = 'bunch-of-flowers'
  }
  if (/\b(roses|rose plant|rose bush|rose blooms|magenta roses)\b/.test(lowerPrompt)) {
    nextTraits.head = 'roses'
  }
  if (/\b(bonsai|bonsai tree|evergreen bonsai|miniature tree|sculpted tree)\b/.test(lowerPrompt)) {
    nextTraits.head = 'bonsai'
  }
  if (/\b(bonsai sakura|sakura bonsai|cherry blossom bonsai|pink bonsai|sakura tree)\b/.test(lowerPrompt)) {
    nextTraits.head = 'bonsai-sakura'
  }
  if (/\b(pixel pot|pixel cube|cube pot|box pot|boxed pot|purple pot|purple cube|striped pot|striped cube|purple striped|two tones of purple)\b/.test(lowerPrompt)) {
    nextTraits.pot = 'purple-cube-pot'
  }
  if (/\b(terracotta|terra cotta|clay pot|brick-red pot|brick red pot|red clay planter)\b/.test(lowerPrompt)) {
    nextTraits.pot = 'terracotta'
  }
  if (/\b(blue pot|flower pot|rounded pot|current pot|matte blue pot|classic pot)\b/.test(lowerPrompt)) {
    nextTraits.pot = 'blue-flower-pot'
  }
  if (/\b(snail|slug|spiral shell|green buddy|pot buddy)\b/.test(lowerPrompt)) {
    nextTraits.companion = 'cartoon-snail'
  }
  if (/\b(canary birb|canary bird|yellow bird|golden bird)\b/.test(lowerPrompt)) {
    nextTraits.companion = 'canary-birb'
  }
  if (/\b(cardinal birb|cardinal bird|red bird)\b/.test(lowerPrompt)) {
    nextTraits.companion = 'cardinal-birb'
  }
  if (/\b(toad|frog|green frog|grass toad)\b/.test(lowerPrompt)) {
    nextTraits.companion = 'toad'
  }
  if (/\b(no snail|no slug|no companion|without snail|without companion)\b/.test(lowerPrompt)) {
    nextTraits.companion = 'none'
  }
  if (/\b(no flowers|no flower|bare head|no pot|without pot|without flowers)\b/.test(lowerPrompt)) {
    nextTraits.head = 'none'
  }
  if (/\b(wide|crown|big center|broad|center head)\b/.test(lowerPrompt)) {
    nextTraits.flytrap = 'wide-crown'
  }
  if (/\b(friendly|rounded|cute|soft teeth|simple)\b/.test(lowerPrompt)) {
    nextTraits.flytrap = 'friendly-bite'
  }
  if (/\b(axe|wood axe|woodcutter|hatchet)\b/.test(lowerPrompt)) {
    nextTraits.held = 'axe'
  }
  if (/\b(sword|toon blade|short blade)\b/.test(lowerPrompt)) {
    nextTraits.held = 'sword'
  }
  if (/\b(peak|pickaxe|pick axe|mining pick)\b/.test(lowerPrompt)) {
    nextTraits.held = 'peak'
  }
  if (/\b(fire|torch|held flame|hand flame)\b/.test(lowerPrompt)) {
    nextTraits.held = 'fire'
  }
  if (/\b(staff|cane|wand)\b/.test(lowerPrompt)) {
    nextTraits.held = 'wizard-staff'
  }
  if (/\b(no staff|empty hands|no cane|no wand|no axe|no sword|no pickaxe|no torch|nothing held)\b/.test(lowerPrompt)) {
    nextTraits.held = 'none'
  }
  if (/\b(grouchy|grumpy|unibrow|single brow)\b/.test(lowerPrompt)) {
    nextTraits.eyes = 'unibrow'
  }
  if (/\b(soft|cute|happy|gentle|flower face)\b/.test(lowerPrompt)) {
    nextTraits.face = 'soft'
  }
  if (/\b(mellow|chilled|chill|half open|half-open|sleepy eyes|relaxed eyes)\b/.test(lowerPrompt)) {
    nextTraits.eyes = 'mellow'
  }
  if (/\b(open eyes|wide eyes|wide-eyed|alert eyes)\b/.test(lowerPrompt)) {
    nextTraits.eyes = 'open'
  }
  if (/\b(dot eyes|black dot eyes|black dots|little black dots|tiny black dots|bead eyes|pixel eyes)\b/.test(lowerPrompt)) {
    nextTraits.eyes = 'dot'
  }
  if (/\b(enjoyer|slim eyes|vertical eyes|tiny vertical eyes)\b/.test(lowerPrompt)) {
    nextTraits.eyes = 'enjoyer'
  }
  if (asksForPurpEyes) {
    nextTraits.eyes = 'purp'
  }
  if (/\b(vr eyes|virtual reality eyes|scanline visor|neon visor)\b/.test(lowerPrompt)) {
    nextTraits.eyes = 'vr'
  }
  if (/\b(eeeek|eek eyes|panic eyes|startled eyes|scared eyes)\b/.test(lowerPrompt)) {
    nextTraits.eyes = 'eeeek'
  }
  if (/\b(suspicious eyes|suspicious stare|questioning eyes|narrow stare)\b/.test(lowerPrompt)) {
    nextTraits.eyes = 'suspicious'
  }
  if (/\b(blazeitup420|blaze it up|stoned eyes|rosy half lids|heavy rosy eyes)\b/.test(lowerPrompt)) {
    nextTraits.eyes = 'blazeitup420'
  }
  if (/\b(whats that|what's that|curious inward eyes|cross eyed|cross-eyed)\b/.test(lowerPrompt)) {
    nextTraits.eyes = 'whats-that'
  }
  if (/\b(mossing|moss eyes|moss-shadowed eyes|moss shadowed eyes)\b/.test(lowerPrompt)) {
    nextTraits.eyes = 'mossing'
  }
  if (/\b(shades|sunglasses|black glasses)\b/.test(lowerPrompt)) {
    nextTraits.eyes = 'shades'
  }
  if (/\b(smile|classic smile|simple smile|grin|relaxed grin)\b/.test(lowerPrompt)) {
    nextTraits.mouth = 'classic-smile'
  }
  if (/\b(open mouth|surprised mouth|soft mouth)\b/.test(lowerPrompt)) {
    nextTraits.mouth = 'open'
  }
  if (/\b(o mouth|o-shaped mouth|o shape|o shaped|surprised o|little o|tiny o|small o|off center mouth|off-center mouth)\b/.test(lowerPrompt)) {
    nextTraits.mouth = 'surprised-o'
  }
  if (/\b(huh|puzzled o|puzzled mouth|tiny puzzled mouth)\b/.test(lowerPrompt)) {
    nextTraits.mouth = 'huh'
  }
  if (/\b(long face|long mouth|elongated mouth|wide mouth line)\b/.test(lowerPrompt)) {
    nextTraits.mouth = 'long-face'
  }
  if (/\b(wazzzzzzzzup|wazzup|whazzup|tongue mouth|playful tongue)\b/.test(lowerPrompt)) {
    nextTraits.mouth = 'wazzzzzzzzup'
  }
  if (/\b(normal guy|neutral mouth|small neutral mouth|plain mouth)\b/.test(lowerPrompt)) {
    nextTraits.mouth = 'normal-guy'
  }
  if (/\b(vampire|vampire mouth|twin fangs|cute fangs)\b/.test(lowerPrompt)) {
    nextTraits.mouth = 'vampire'
  }
  if (/\b(sad mouth|frown|downturned mouth)\b/.test(lowerPrompt)) {
    nextTraits.mouth = 'sad'
  }
  if (/\b(blush mouth|rosy cheeks|blushing cheeks|blush cheeks)\b/.test(lowerPrompt)) {
    nextTraits.mouth = 'blush'
  }
  if (/\b(grrrrrrrr|grr mouth|gritted teeth|gritted mouth|angry teeth)\b/.test(lowerPrompt)) {
    nextTraits.mouth = 'grrrrrrrr'
  }
  if (/\b(ciggy|cigarette|cigarette mouth|smoking mouth)\b/.test(lowerPrompt)) {
    nextTraits.mouth = 'ciggy'
  }
  if (/\b(woozy|wavy mouth|squiggle mouth|wobbly mouth)\b/.test(lowerPrompt)) {
    nextTraits.mouth = 'woozy'
  }
  if (/\b(omg|omg mouth|big o mouth|large o mouth|shocked o|shock mouth)\b/.test(lowerPrompt)) {
    nextTraits.mouth = 'omg'
  }
  if (/\b(clown nose|round red nose|glossy red nose)\b/.test(lowerPrompt)) {
    nextTraits.nose = 'clown-nose'
  }
  if (/\b(no nose|without a nose|remove nose)\b/.test(lowerPrompt)) {
    nextTraits.nose = 'none'
  }
  if (/\b(green|lime|chartreuse|neon skin|glow lime|bright green)\b/.test(lowerPrompt)) {
    nextTraits.skin = 'glow-lime'
  }
  if (/\b(pink|pink skin|pixel pink|bubblegum|soft pink|cute pink)\b/.test(lowerPrompt)) {
    nextTraits.skin = 'pixel-pink'
  }
  if (/\b(gray|grey|stone gray|stone grey|silver skin|soft gray|soft grey)\b/.test(lowerPrompt)) {
    nextTraits.skin = 'stone-gray'
  }
  if (/\b(red skin|classic red|warm red)\b/.test(lowerPrompt)) {
    nextTraits.skin = 'red'
  }
  if (asksForGoldType) {
    nextTraits.skin = 'gold'
  }
  if (/\b(type\s*:?\s*zombie|zombie\s+(skin|type|body|glowbud)|undead skin)\b/.test(lowerPrompt)) {
    nextTraits.skin = 'zombie'
  }
  if (/\b(type\s*:?\s*ape|ape\s+(skin|type|body|glowbud))\b/.test(lowerPrompt)) {
    nextTraits.skin = 'ape'
  }
  if (/\b(type\s*:?\s*alien|alien\s+(skin|type|body|glowbud))\b/.test(lowerPrompt)) {
    nextTraits.skin = 'alien'
  }
  if (/\b(blue background|blue backdrop)\b/.test(lowerPrompt)) {
    nextTraits.background = 'blue'
  }
  if (/\b(yellow background|yellow backdrop)\b/.test(lowerPrompt)) {
    nextTraits.background = 'yellow'
  }
  if (/\b(green background|green backdrop)\b/.test(lowerPrompt)) {
    nextTraits.background = 'green'
  }
  if (/\b(purple background|purple backdrop)\b/.test(lowerPrompt)) {
    nextTraits.background = 'purple'
  }
  if (/\b(red background|red backdrop)\b/.test(lowerPrompt)) {
    nextTraits.background = 'red'
  }

  return normalizeTraits(nextTraits)
}

function traitSummary(traits: GlowbudTraitLoadout) {
  const background = TRAIT_OPTIONS.background.find((option) => option.value === traits.background)?.label ?? traits.background ?? 'Blue'
  const shell = TRAIT_OPTIONS.shell.find((option) => option.value === traits.shell)?.label ?? traits.shell
  const head = TRAIT_OPTIONS.head.find((option) => option.value === traits.head)?.label ?? traits.head
  const pot = TRAIT_OPTIONS.pot.find((option) => option.value === traits.pot)?.label ?? traits.pot ?? 'Avante Garden'
  const companion = TRAIT_OPTIONS.companion.find((option) => option.value === traits.companion)?.label ?? traits.companion ?? 'No Companion'
  const held = TRAIT_OPTIONS.held.find((option) => option.value === traits.held)?.label ?? traits.held
  const face = TRAIT_OPTIONS.face.find((option) => option.value === traits.face)?.label ?? traits.face
  const eyes = TRAIT_OPTIONS.eyes.find((option) => option.value === traits.eyes)?.label ?? traits.eyes ?? 'Mellow'
  const mouth = TRAIT_OPTIONS.mouth.find((option) => option.value === traits.mouth)?.label ?? traits.mouth ?? 'Smile'
  const nose = TRAIT_OPTIONS.nose.find((option) => option.value === traits.nose)?.label ?? traits.nose ?? 'No Nose'
  const skin = TRAIT_OPTIONS.skin.find((option) => option.value === traits.skin)?.label ?? traits.skin ?? 'Red'
  const flytrap = TRAIT_OPTIONS.flytrap.find((option) => option.value === traits.flytrap)?.label ?? traits.flytrap
  const expression = `${face} / ${eyes} / ${mouth}${traits.nose === 'clown-nose' ? ` / ${nose}` : ''}`
  return traits.head === 'venus-flytrap'
    ? `${background} / ${shell} / ${head}: ${flytrap} / ${pot} / ${companion} / ${held} / ${expression} / ${skin}`
    : `${background} / ${shell} / ${head} / ${pot} / ${companion} / ${held} / ${expression} / ${skin}`
}

function slugifyTrait(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function traitsForProductionItem(item: GlowbudsProductionQueueItem) {
  const traits = normalizeTraits({
    ...DEFAULT_TRAITS,
    head: item.row.sourceCategory === 'Pot' ? 'hibiscus' : 'none',
  })
  const studioCategory = item.row.studioCategory as TraitCategory
  const options = TRAIT_OPTIONS[studioCategory] as TraitOption<string>[] | undefined
  const matchedOption = options?.find((option) => option.label === item.row.studioTrait)
  if (matchedOption) {
    Object.assign(traits, { [studioCategory]: matchedOption.value })
  }
  return normalizeTraits(traits)
}

function matchesQueueFilter(item: GlowbudsProductionQueueItem, filter: QueueFilter) {
  if (filter === 'all') return true
  if (filter === 'build') return item.action === 'build'
  if (filter === 'verify') return item.action !== 'build'
  return item.priority === 'P0' || item.priority === 'P1'
}

function CameraOffsetRig({
  offset,
  controlsRef,
}: {
  offset: CameraOffset
  controlsRef: RefObject<OrbitControlsImpl | null>
}) {
  const { camera } = useThree()
  const appliedOffset = useRef<CameraOffset>({ x: 0, y: 0, z: 0 })

  useEffect(() => {
    const previous = appliedOffset.current
    const delta = {
      x: offset.x - previous.x,
      y: offset.y - previous.y,
      z: offset.z - previous.z,
    }
    camera.position.x += delta.x
    camera.position.y += delta.y
    camera.position.z += delta.z

    const controls = controlsRef.current
    if (controls) {
      controls.target.x += delta.x
      controls.target.y += delta.y
      controls.target.z += delta.z
      controls.update()
    }

    appliedOffset.current = offset
  }, [camera, controlsRef, offset])

  return null
}

function StudioScene({
  traits,
  animation,
  zoom,
  viewResetKey,
  cameraOffset,
  cameraView,
  mossSelection,
  assetSelection,
}: {
  traits: GlowbudTraitLoadout
  animation: RedShellCritterAnimation
  zoom: number
  viewResetKey: number
  cameraOffset: CameraOffset
  cameraView: CameraViewId
  mossSelection?: {
    enabled: boolean
    selectedId?: string | null
    onPick: (pick: GlowbudMossPickInfo) => void
  }
  assetSelection?: {
    enabled: boolean
    selectedId?: string | null
    onPick: (pick: GlowbudAssetPickInfo) => void
  }
}) {
  const isRaddishShell = traits.shell === 'raddish-shell'
  const sceneY = isRaddishShell ? -0.04 : -0.08
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const cameraPreset = CAMERA_VIEW_PRESETS[cameraView]
  const selectionEnabled = mossSelection?.enabled || assetSelection?.enabled
  const background = traits.background ?? 'blue'

  return (
    <Canvas
      key={`${viewResetKey}-${cameraView}`}
      camera={{ position: cameraPreset.position, fov: 38 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={[GLOWBUD_BACKGROUND_COLORS[background]]} />
      <ambientLight intensity={1.08} color="#fff5ea" />
      <hemisphereLight args={['#fff3cb', '#8eefff', 0.42]} />
      <directionalLight position={[-4.5, 7.6, 4.8]} intensity={3.25} color="#fff1a2" />
      <directionalLight position={[4.6, 3.8, -4.2]} intensity={0.72} color="#91f4ff" />
      <pointLight position={[-1.8, 1.2, 3.4]} intensity={0.42} color="#ffd3a6" />
      <CameraOffsetRig offset={cameraOffset} controlsRef={controlsRef} />
      <group rotation-x={-0.06} rotation-y={Math.PI} position={[0, sceneY, 0]}>
        <GlowbudTraitAvatarAsset
          traits={traits}
          animation={animation}
          scale={1.08 * zoom}
          activity={1}
          mossSelection={mossSelection}
          assetSelection={assetSelection}
        />
      </group>
      <mesh position={[0, -1.05, 0.05]} rotation-x={-Math.PI / 2} scale={[5.6, 1.55, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial
          color={GLOWBUD_BACKGROUND_SHADOWS[background]}
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        enableRotate={!selectionEnabled}
        enableZoom
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.82}
        zoomSpeed={0.72}
        panSpeed={0.78}
        screenSpacePanning
        minDistance={3.2}
        maxDistance={7.2}
        minPolarAngle={0.08}
        maxPolarAngle={Math.PI * 0.86}
        target={[0, sceneY + 0.08, 0]}
      />
    </Canvas>
  )
}

function TraitButton<TValue extends string>({
  option,
  selected,
  onClick,
}: {
  option: TraitOption<TValue>
  selected: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className="trait-button" aria-pressed={selected} onClick={onClick}>
      <span className="trait-button-label">
        {option.swatch ? (
          <span
            className="trait-swatch"
            style={{ backgroundColor: option.swatch }}
            aria-hidden="true"
          />
        ) : null}
        <span>{option.label}</span>
      </span>
      <small>{option.sublabel}</small>
    </button>
  )
}

function App() {
  const [zoom, setZoom] = useState(1)
  const [viewResetKey, setViewResetKey] = useState(0)
  const [cameraOffset, setCameraOffset] = useState<CameraOffset>({ x: 0, y: 0, z: 0 })
  const [cameraView, setCameraView] = useState<CameraViewId>(readCameraParam)
  const [inspectMode, setInspectMode] = useState(false)
  const [selectedAssetPick, setSelectedAssetPick] = useState<GlowbudAssetPickInfo | null>(null)
  const [animation, setAnimation] = useState<RedShellCritterAnimation>(readAnimationParam)
  const [experimentSlots, setExperimentSlots] = useState<ExperimentSlot[]>(() => loadRecordsWithStarters(EXPERIMENT_STORAGE_KEY, STARTER_EXPERIMENTS))
  const [activeSlotId, setActiveSlotId] = useState(STARTER_EXPERIMENTS[0].id)
  const [currentTraits, setCurrentTraits] = useState<GlowbudTraitLoadout>(readInitialTraits)
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('next')
  const productionQueue = useMemo(() => getGlowbudsProductionQueue(GLOWBUDS_TRAIT_TRACKER_ROWS), [])
  const [selectedQueueKey, setSelectedQueueKey] = useState(productionQueue[0]?.key ?? '')
  const activeSlot = experimentSlots.find((slot) => slot.id === activeSlotId) ?? experimentSlots[0] ?? STARTER_EXPERIMENTS[0]
  const zoomPercent = Math.round(zoom * 100)
  const poseLabel = animation === 'hop' ? 'Hop' : animation === 'grumble' ? 'Grumble' : 'Idle'
  const activeTraitSummary = useMemo(() => traitSummary(currentTraits), [currentTraits])
  const trackerSummary = useMemo(() => getGlowbudsTraitTrackerSummary(), [])
  const oneToOneConflicts = useMemo(() => getGlowbudsOneToOneConflicts(GLOWBUDS_TRAIT_TRACKER_ROWS), [])
  const referenceSource = useMemo(() => getGlowbudsReferenceSource(), [])
  const stageTitle = `${activeSlot.name} Build`
  const canPickMoss = currentTraits.shell === 'moss-shell'
  const completedReviewGates = useMemo(
    () => activeSlot.reviewGates ?? [],
    [activeSlot.reviewGates],
  )
  const reviewReady = REVIEW_GATES.every((gate) => completedReviewGates.includes(gate.id))
  const filteredQueue = productionQueue.filter((item) => matchesQueueFilter(item, queueFilter))
  const selectedQueueItem =
    productionQueue.find((item) => item.key === selectedQueueKey)
    ?? filteredQueue[0]
    ?? productionQueue[0]
  const assetPickPrompt = selectedAssetPick
    ? `Selected exact 3D object: ${selectedAssetPick.id}. Trait slot ${selectedAssetPick.slot}; active trait ${selectedAssetPick.trait}. Please edit or remove only this object and directly colliding geometry required for the fix. Local position ${selectedAssetPick.local.join(', ')}; world position ${selectedAssetPick.world.join(', ')}; world size ${selectedAssetPick.size.join(', ')}. Hierarchy: ${selectedAssetPick.hierarchy}. Preserve the surrounding trait and verify the result from front, both obliques, back, and top.`
    : ''

  useEffect(() => {
    window.localStorage.setItem(EXPERIMENT_STORAGE_KEY, JSON.stringify(experimentSlots))
  }, [experimentSlots])

  useEffect(() => {
    const studioWindow = window as typeof window & {
      __GLOWBUD_STUDIO_STATE__?: unknown
    }
    studioWindow.__GLOWBUD_STUDIO_STATE__ = {
      traits: currentTraits,
      animation,
      cameraView,
      activeSlotId,
      activeSlotStatus: activeSlot.status,
      reviewGates: completedReviewGates,
      reviewReady,
      selectedAssetPick,
      selectedQueueKey: selectedQueueItem?.key ?? null,
      oneToOneConflictCount: oneToOneConflicts.length,
    }
  }, [
    activeSlot.status,
    activeSlotId,
    animation,
    cameraView,
    completedReviewGates,
    currentTraits,
    oneToOneConflicts.length,
    reviewReady,
    selectedAssetPick,
    selectedQueueItem?.key,
  ])

  function chooseAnimation(nextAnimation: RedShellCritterAnimation) {
    setAnimation(nextAnimation)
    const params = new URLSearchParams(window.location.search)
    if (nextAnimation === 'idle') {
      params.delete('animation')
    } else {
      params.set('animation', nextAnimation)
    }
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }

  function updateTrait<TCategory extends TraitCategory>(category: TCategory, value: GlowbudTraitLoadout[TCategory]) {
    setCurrentTraits((traits) => {
      const nextTraits = { ...traits, [category]: value }
      if (category === 'flytrap') {
        nextTraits.head = 'venus-flytrap'
      }
      return normalizeTraits(nextTraits)
    })
    setSelectedAssetPick(null)
    setExperimentSlots((slots) =>
      slots.map((slot) =>
        slot.id === activeSlotId
          ? { ...slot, status: 'Draft', reviewGates: [] }
          : slot,
      ),
    )
  }

  function buildIntoSlot() {
    const builtTraits = deriveTraitsFromPrompt(activeSlot.prompt, currentTraits)
    setCurrentTraits(builtTraits)
    setExperimentSlots((slots) =>
      slots.map((slot) =>
        slot.id === activeSlotId
          ? { ...slot, status: 'Built', traits: builtTraits, reviewGates: [] }
          : slot,
      ),
    )
  }

  function updateSlotPrompt(prompt: string) {
    setExperimentSlots((slots) => slots.map((slot) => (slot.id === activeSlotId ? { ...slot, prompt } : slot)))
  }

  function saveCompletedBuild() {
    if (!reviewReady) return
    setExperimentSlots((slots) =>
      slots.map((slot) => (slot.id === activeSlotId ? { ...slot, status: 'Complete', traits: currentTraits } : slot)),
    )
  }

  function toggleReviewGate(gateId: string) {
    setExperimentSlots((slots) =>
      slots.map((slot) => {
        if (slot.id !== activeSlotId) return slot
        const current = slot.reviewGates ?? []
        const reviewGates = current.includes(gateId)
          ? current.filter((id) => id !== gateId)
          : [...current, gateId]
        return {
          ...slot,
          status: reviewGates.length === REQUIRED_REVIEW_GATE_COUNT ? slot.status : 'Built',
          reviewGates,
          traits: currentTraits,
        }
      }),
    )
  }

  function prepareProductionSlot(item: GlowbudsProductionQueueItem) {
    const id = `queue-${slugifyTrait(item.row.sourceCategory)}-${slugifyTrait(item.row.sourceTrait)}`
    const traits = traitsForProductionItem(item)
    const nextSlot: ExperimentSlot = {
      id,
      name: `${item.row.sourceTrait} ${item.row.sourceCategory}`,
      prompt: item.brief,
      status: 'Draft',
      traits,
      reviewGates: [],
    }
    setExperimentSlots((slots) => {
      const existing = slots.some((slot) => slot.id === id)
      return existing
        ? slots.map((slot) => (slot.id === id ? { ...slot, ...nextSlot } : slot))
        : [nextSlot, ...slots]
    })
    setActiveSlotId(id)
    setCurrentTraits(traits)
    setSelectedAssetPick(null)
    selectCameraView('front')
  }

  function chooseQueueFilter(nextFilter: QueueFilter) {
    setQueueFilter(nextFilter)
    const firstMatch = productionQueue.find((item) => matchesQueueFilter(item, nextFilter))
    if (firstMatch) setSelectedQueueKey(firstMatch.key)
  }

  function handleMossPick(pick: GlowbudMossPickInfo) {
    setSelectedAssetPick({
      ...pick,
      slot: 'shell',
      trait: 'moss-shell',
      hierarchy: `trait-shell-moss-shell > ${pick.objectName}`,
      size: [0, 0, 0],
    })
  }

  function resetStudio() {
    setExperimentSlots(STARTER_EXPERIMENTS)
    setActiveSlotId(STARTER_EXPERIMENTS[0].id)
    setCurrentTraits(normalizeTraits(DEFAULT_TRAITS))
    setInspectMode(false)
    setSelectedAssetPick(null)
    selectCameraView('front')
  }

  function nudgeCamera(axis: keyof CameraOffset, amount: number) {
    setCameraOffset((currentOffset) => ({
      ...currentOffset,
      [axis]: clampCameraOffset(currentOffset[axis] + amount),
    }))
  }

  function selectCameraView(nextView: CameraViewId) {
    setCameraView(nextView)
    setCameraOffset({ x: 0, y: 0, z: 0 })
    setViewResetKey((currentKey) => currentKey + 1)
    const params = new URLSearchParams(window.location.search)
    if (nextView === 'front') {
      params.delete('camera')
    } else {
      params.set('camera', nextView)
    }
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }

  function resetCameraView() {
    selectCameraView('front')
  }

  function copyText(text: string) {
    if (!text) return
    void navigator.clipboard?.writeText(text)
  }

  return (
    <main className="trait-studio">
      <header className="toolbar">
        <div className="title">
          <strong>Glowbud Trait Studio</strong>
          <span>Developer tool - {poseLabel.toLowerCase()} asset inspection</span>
        </div>
        <a className="room-link" href="./wardrobe.html">
          Open Player Wardrobe
        </a>
        <div className="animation-controls" aria-label="Animation controls">
          {(['idle', 'hop', 'grumble'] as RedShellCritterAnimation[]).map((nextAnimation) => (
            <button
              key={nextAnimation}
              type="button"
              className="animation-button"
              aria-pressed={animation === nextAnimation}
              onClick={() => chooseAnimation(nextAnimation)}
            >
              {nextAnimation}
            </button>
          ))}
        </div>
        <div className="zoom-controls" aria-label="Asset zoom controls">
          <button
            type="button"
            className="zoom-button"
            aria-label="Zoom out"
            title="Zoom out"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => setZoom((currentZoom) => clampZoom(currentZoom - ZOOM_STEP))}
          >
            -
          </button>
          <span className="zoom-readout" aria-live="polite">
            {zoomPercent}%
          </span>
          <button
            type="button"
            className="zoom-button"
            aria-label="Zoom in"
            title="Zoom in"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoom((currentZoom) => clampZoom(currentZoom + ZOOM_STEP))}
          >
            +
          </button>
          <button
            type="button"
            className="view-reset-button"
            aria-label="Reset camera angle"
            title="Reset camera angle"
            onClick={resetCameraView}
          >
            reset
          </button>
        </div>
        <div className="pose-pill">{poseLabel}</div>
      </header>

      <section className="studio-grid">
        <aside className="panel dressing-panel" aria-label="Dressing room">
          <div className="panel-heading">
            <strong>Dressing Room</strong>
            <button type="button" className="micro-button" onClick={resetStudio}>
              Reset
            </button>
          </div>
          <div className="trait-section">
            <strong>Background</strong>
            {TRAIT_OPTIONS.background.map((option) => (
              <TraitButton
                key={option.value}
                option={option}
                selected={(currentTraits.background ?? 'blue') === option.value}
                onClick={() => updateTrait('background', option.value)}
              />
            ))}
          </div>
          <div className="trait-section">
            <strong>Shell</strong>
            {TRAIT_OPTIONS.shell.map((option) => (
              <TraitButton
                key={option.value}
                option={option}
                selected={currentTraits.shell === option.value}
                onClick={() => updateTrait('shell', option.value)}
              />
            ))}
          </div>

          <div className="trait-section">
            <strong>Head</strong>
            {TRAIT_OPTIONS.head.map((option) => (
              <TraitButton
                key={option.value}
                option={option}
                selected={currentTraits.head === option.value}
                onClick={() => updateTrait('head', option.value)}
              />
            ))}
          </div>

          <div className="trait-section">
            <strong>Pot</strong>
            {TRAIT_OPTIONS.pot.map((option) => (
              <TraitButton
                key={option.value}
                option={option}
                selected={(currentTraits.pot ?? 'blue-flower-pot') === option.value}
                onClick={() => updateTrait('pot', option.value)}
              />
            ))}
          </div>

          <div className="trait-section">
            <strong>Companion</strong>
            {TRAIT_OPTIONS.companion.map((option) => (
              <TraitButton
                key={option.value}
                option={option}
                selected={(currentTraits.companion ?? 'none') === option.value}
                onClick={() => updateTrait('companion', option.value)}
              />
            ))}
          </div>
        </aside>

        <section className="stage-panel" aria-label="3D avatar preview">
          <div className="stage-titlebar">
            <strong>{stageTitle}</strong>
            <span>{activeTraitSummary}</span>
          </div>
          <div className="stage-canvas">
            <StudioScene
              traits={currentTraits}
              animation={animation}
              zoom={zoom}
              viewResetKey={viewResetKey}
              cameraOffset={cameraOffset}
              cameraView={cameraView}
              mossSelection={
                canPickMoss
                  ? {
                      enabled: inspectMode,
                      selectedId: selectedAssetPick?.id,
                      onPick: handleMossPick,
                    }
                  : undefined
              }
              assetSelection={
                canPickMoss
                  ? undefined
                  : {
                      enabled: inspectMode,
                      selectedId: selectedAssetPick?.id,
                      onPick: setSelectedAssetPick,
                    }
              }
            />
            <div
              className="camera-presets"
              aria-label="Camera audit views"
              onPointerDown={(event) => event.stopPropagation()}
            >
              {(Object.entries(CAMERA_VIEW_PRESETS) as Array<
                [CameraViewId, (typeof CAMERA_VIEW_PRESETS)[CameraViewId]]
              >).map(([viewId, preset]) => (
                <button
                  key={viewId}
                  type="button"
                  aria-label={preset.label}
                  aria-pressed={cameraView === viewId}
                  onClick={() => selectCameraView(viewId)}
                >
                  {preset.shortLabel}
                </button>
              ))}
            </div>
            <div className="asset-picker" onPointerDown={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="asset-picker-button"
                aria-pressed={inspectMode}
                onClick={() => {
                  setInspectMode((enabled) => !enabled)
                  setSelectedAssetPick(null)
                }}
              >
                Inspect Mesh
              </button>
              <code>{selectedAssetPick?.id ?? 'none selected'}</code>
              <div className="asset-picker-actions">
                <button
                  type="button"
                  disabled={!selectedAssetPick}
                  onClick={() => copyText(selectedAssetPick?.id ?? '')}
                >
                  Copy ID
                </button>
                <button
                  type="button"
                  disabled={!selectedAssetPick}
                  onClick={() => copyText(assetPickPrompt)}
                >
                  Copy Fix Brief
                </button>
              </div>
            </div>
            <div
              className="camera-pad"
              aria-label="Camera position controls"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="camera-button camera-up"
                aria-label="Move camera up"
                title="Move camera up"
                onClick={() => nudgeCamera('y', CAMERA_MOVE_STEP)}
              >
                ^
              </button>
              <button
                type="button"
                className="camera-button camera-left"
                aria-label="Move camera left"
                title="Move camera left"
                onClick={() => nudgeCamera('x', -CAMERA_MOVE_STEP)}
              >
                &lt;
              </button>
              <button
                type="button"
                className="camera-button camera-home"
                aria-label="Reset camera location"
                title="Reset camera location"
                onClick={resetCameraView}
              >
                0
              </button>
              <button
                type="button"
                className="camera-button camera-right"
                aria-label="Move camera right"
                title="Move camera right"
                onClick={() => nudgeCamera('x', CAMERA_MOVE_STEP)}
              >
                &gt;
              </button>
              <button
                type="button"
                className="camera-button camera-down"
                aria-label="Move camera down"
                title="Move camera down"
                onClick={() => nudgeCamera('y', -CAMERA_MOVE_STEP)}
              >
                v
              </button>
              <button
                type="button"
                className="camera-button camera-near"
                aria-label="Move camera forward"
                title="Move camera forward"
                onClick={() => nudgeCamera('z', -CAMERA_DEPTH_STEP)}
              >
                z-
              </button>
              <button
                type="button"
                className="camera-button camera-far"
                aria-label="Move camera backward"
                title="Move camera backward"
                onClick={() => nudgeCamera('z', CAMERA_DEPTH_STEP)}
              >
                z+
              </button>
            </div>
          </div>
          <div className="trait-summary" aria-live="polite">
            <span>{currentTraits.shell}</span>
            <span>{currentTraits.head}</span>
            <span>{currentTraits.pot ?? 'blue-flower-pot'}</span>
            <span>{currentTraits.companion ?? 'none'}</span>
            <span>{currentTraits.held}</span>
            <span>{currentTraits.eyes ?? 'mellow'}</span>
            <span>{currentTraits.mouth ?? 'classic-smile'}</span>
            <span>{currentTraits.nose ?? 'none'}</span>
            <span>{currentTraits.skin ?? 'red'}</span>
            {currentTraits.head === 'venus-flytrap' ? <span>{currentTraits.flytrap}</span> : null}
          </div>
        </section>

        <aside className="panel experiment-panel" aria-label="Experiment room">
          <div className="panel-heading">
            <strong>Experiment Room</strong>
            <span className="status-pill">{activeSlot.status}</span>
          </div>

          <div className="slot-tabs" role="tablist" aria-label="Experiment slots">
            {experimentSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                role="tab"
                className="slot-tab"
                aria-selected={slot.id === activeSlotId}
                onClick={() => {
                  setActiveSlotId(slot.id)
                  setCurrentTraits(normalizeTraits(slot.traits))
                  setSelectedAssetPick(null)
                }}
              >
                {slot.name.replace('Trait ', '')}
              </button>
            ))}
          </div>

          <textarea
            className="trait-prompt"
            value={activeSlot.prompt}
            onChange={(event) => updateSlotPrompt(event.currentTarget.value)}
            aria-label="Trait build prompt"
          />

          <div className="experiment-note">
            <strong>Build Focus</strong>
            <span>Choose a focused trait variant, then save the completed experiment.</span>
          </div>

          <section className="collection-tracker" aria-label="Glowbuds collection trait tracker">
            <div className="collection-tracker-heading">
              <strong>Collection Trait Tracker</strong>
              <a href={GLOWBUDS_TRAIT_TRACKER_SOURCE.collectionUrl} target="_blank" rel="noreferrer">
                OpenSea
              </a>
            </div>
            <div className="tracker-kpis" aria-label="Trait tracker summary">
              <span>
                <strong>{trackerSummary.modeledOrLikely}</strong>
                <small>modeled / likely</small>
              </span>
              <span>
                <strong>{trackerSummary.needsWork}</strong>
                <small>left / review</small>
              </span>
              <span>
                <strong>{trackerSummary.sourceValueCount}</strong>
                <small>source values</small>
              </span>
            </div>
            <p className="tracker-source-note">
              {referenceSource.sampledTokens} source tokens indexed. One-to-one conflicts: {oneToOneConflicts.length}.
            </p>
            <div className="queue-filters" aria-label="Production queue filters">
              {(['next', 'verify', 'build', 'all'] as QueueFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={queueFilter === filter}
                  onClick={() => chooseQueueFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="production-queue-wrap">
              <table className="production-queue">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Source trait</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.map((item) => (
                    <tr
                      key={item.key}
                      aria-selected={item.key === selectedQueueItem?.key}
                      onClick={() => setSelectedQueueKey(item.key)}
                    >
                      <td>
                        <strong>{item.priority}</strong>
                        <span>{item.phase}</span>
                      </td>
                      <td>
                        <span>{item.row.sourceCategory}</span>
                        <strong>{item.row.sourceTrait}</strong>
                      </td>
                      <td>
                        <span className={`queue-action action-${item.action}`}>
                          {item.action}
                        </span>
                        <small>{item.complexity}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedQueueItem ? (
              <div className="production-brief">
                <div className="production-brief-heading">
                  <span>{selectedQueueItem.row.sourceCategory}</span>
                  <strong>{selectedQueueItem.row.sourceTrait}</strong>
                  <em>{selectedQueueItem.action}</em>
                </div>
                <div className="reference-strip" aria-label="Representative source tokens">
                  {selectedQueueItem.samples.map((sample) => (
                    <a
                      key={sample.tokenId}
                      href={sample.openSeaUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={`${sample.name}: ${Object.entries(sample.attributes)
                        .map(([category, value]) => `${category} ${value}`)
                        .join(', ')}`}
                    >
                      {/* Vite preview references are remote source art, not application-owned images. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sample.imageUrl}
                        alt={`${selectedQueueItem.row.sourceTrait} reference from Glowbud #${sample.tokenId}`}
                        loading="lazy"
                      />
                      <span>#{sample.tokenId}</span>
                    </a>
                  ))}
                  {selectedQueueItem.samples.length === 0 ? <em>Source identity unresolved</em> : null}
                </div>
                <p>{selectedQueueItem.row.notes}</p>
                <div className="production-brief-actions">
                  <button type="button" onClick={() => copyText(selectedQueueItem.brief)}>
                    Copy Build Brief
                  </button>
                  <button type="button" onClick={() => prepareProductionSlot(selectedQueueItem)}>
                    Prepare Slot
                  </button>
                </div>
              </div>
            ) : null}
            <details className="all-mappings">
              <summary>All {trackerSummary.sourceValueCount} mappings</summary>
              <div className="tracker-table-wrap">
                <table className="tracker-table">
                  <thead>
                    <tr>
                      <th scope="col">Source</th>
                      <th scope="col">Studio</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {GLOWBUDS_TRAIT_TRACKER_ROWS.map((row) => (
                      <tr
                        key={getGlowbudsTraitKey(row.sourceCategory, row.sourceTrait)}
                        title={row.notes}
                      >
                        <td>
                          <span>{row.sourceCategory}</span>
                          <strong>{row.sourceTrait}</strong>
                        </td>
                        <td>
                          {row.studioTrait ? (
                            <>
                              <span>{row.studioCategory}</span>
                              <strong>{row.studioTrait}</strong>
                            </>
                          ) : (
                            <em>Needs build</em>
                          )}
                        </td>
                        <td>
                          <span className={`tracker-status status-${row.status}`}>
                            {GLOWBUDS_TRACKER_STATUS_LABELS[row.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          {currentTraits.head === 'venus-flytrap' ? (
            <div className="trait-section compact">
              <strong>Plant Variant</strong>
              {TRAIT_OPTIONS.flytrap.map((option) => (
                <TraitButton
                  key={option.value}
                  option={option}
                  selected={currentTraits.flytrap === option.value}
                  onClick={() => updateTrait('flytrap', option.value)}
                />
              ))}
            </div>
          ) : null}

          <div className="trait-section compact">
            <strong>Held</strong>
            {TRAIT_OPTIONS.held.map((option) => (
              <TraitButton
                key={option.value}
                option={option}
                selected={currentTraits.held === option.value}
                onClick={() => updateTrait('held', option.value)}
              />
            ))}
          </div>

          <div className="trait-section compact">
            <strong>Eyes</strong>
            {TRAIT_OPTIONS.eyes.map((option) => (
              <TraitButton
                key={option.value}
                option={option}
                selected={(currentTraits.eyes ?? 'mellow') === option.value}
                onClick={() => updateTrait('eyes', option.value)}
              />
            ))}
          </div>

          <div className="trait-section compact">
            <strong>Mouth</strong>
            {TRAIT_OPTIONS.mouth.map((option) => (
              <TraitButton
                key={option.value}
                option={option}
                selected={(currentTraits.mouth ?? 'classic-smile') === option.value}
                onClick={() => updateTrait('mouth', option.value)}
              />
            ))}
          </div>

          <div className="trait-section compact">
            <strong>Nose</strong>
            {TRAIT_OPTIONS.nose.map((option) => (
              <TraitButton
                key={option.value}
                option={option}
                selected={(currentTraits.nose ?? 'none') === option.value}
                onClick={() => updateTrait('nose', option.value)}
              />
            ))}
          </div>

          <div className="trait-section compact">
            <strong>Type</strong>
            {TRAIT_OPTIONS.skin.map((option) => (
              <TraitButton
                key={option.value}
                option={option}
                selected={(currentTraits.skin ?? 'red') === option.value}
                onClick={() => updateTrait('skin', option.value)}
              />
            ))}
          </div>

          <section className="quality-gate" aria-label="Trait completion quality gate">
            <div className="quality-gate-heading">
              <strong>Quality Gate</strong>
              <span>
                {completedReviewGates.length}/{REQUIRED_REVIEW_GATE_COUNT}
              </span>
            </div>
            <div className="quality-gate-grid">
              {REVIEW_GATES.map((gate) => {
                const checked = completedReviewGates.includes(gate.id)
                return (
                  <button
                    key={gate.id}
                    type="button"
                    aria-pressed={checked}
                    onClick={() => toggleReviewGate(gate.id)}
                  >
                    <span aria-hidden="true">{checked ? 'OK' : '-'}</span>
                    {gate.label}
                  </button>
                )
              })}
            </div>
          </section>

          <div className="action-row">
            <button type="button" className="primary-button" onClick={buildIntoSlot}>
              Build Slot
            </button>
            <button
              type="button"
              className="primary-button is-complete"
              disabled={!reviewReady}
              title={reviewReady ? 'Save completed trait' : 'Pass all eight quality gates first'}
              onClick={saveCompletedBuild}
            >
              {reviewReady ? 'Save Complete' : 'Review Required'}
            </button>
          </div>
        </aside>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />)
