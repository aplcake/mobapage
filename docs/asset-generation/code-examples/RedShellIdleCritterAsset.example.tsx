import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { createContext, useContext, useEffect, useMemo, useRef, type ComponentProps, type ReactNode, type Ref } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../src/render/OutlineMesh'
import { BonsaiPlant } from './glowbud-traits/plant/BonsaiPlant'
import { BunchOfFlowersPlant } from './glowbud-traits/plant/BunchOfFlowersPlant'
import { CactusPlant } from './glowbud-traits/plant/CactusPlant'
import { DandelionPlant } from './glowbud-traits/plant/DandelionPlant'
import { DouglasPlant } from './glowbud-traits/plant/DouglasPlant'
import { FernPlant } from './glowbud-traits/plant/FernPlant'
import { FlowerPlant } from './glowbud-traits/plant/FlowerPlant'
import { TwoFlowersPlant } from './glowbud-traits/plant/TwoFlowersPlant'
import { LavenderPlant } from './glowbud-traits/plant/LavenderPlant'
import { LotusPlant } from './glowbud-traits/plant/LotusPlant'
import { MyrtlePlant } from './glowbud-traits/plant/MyrtlePlant'
import { PalmTreePlant } from './glowbud-traits/plant/PalmTreePlant'
import { RosesPlant } from './glowbud-traits/plant/RosesPlant'
import { SakuraBonsaiPlant } from './glowbud-traits/plant/SakuraBonsaiPlant'
import { SnakePlant } from './glowbud-traits/plant/SnakePlant'
import { SproutPlant } from './glowbud-traits/plant/SproutPlant'
import { GoldCrownPotShell } from './glowbud-traits/pot/CrownPot'
import { KitschPotShell } from './glowbud-traits/pot/KitschPot'
import { TerracottaPotShell } from './glowbud-traits/pot/TerracottaPot'
import { AncientShell, AncientShellOpeningPortal } from './glowbud-traits/shell/AncientShell'
import { CloakShell, CloakShellOpening, CLOAK_SHADOW, type CloakShellVariant } from './glowbud-traits/shell/CloakShell'
import { DiamondShell, DiamondShellOpeningLip, DIAMOND_SHADOW } from './glowbud-traits/shell/DiamondShell'
import { GemstoneShell, GemstoneShellOpeningLip, GEMSTONE_SHADOW } from './glowbud-traits/shell/GemstoneShell'
import { GuardShell, GuardShellOpeningArmor } from './glowbud-traits/shell/GuardShell'
import { HeavyDutyShell, HeavyDutyShellOpeningArmor } from './glowbud-traits/shell/HeavyDutyShell'
import { HornyShell, HornyShellOpeningLip } from './glowbud-traits/shell/HornyShell'
import { HoodieShell, HoodieShellOpeningLip } from './glowbud-traits/shell/HoodieShell'
import { IceShell, IceShellOpeningLip, ICE_SHADOW } from './glowbud-traits/shell/IceShell'
import { LogShell, LogShellOpeningLip } from './glowbud-traits/shell/LogShell'
import { NakedBody } from './glowbud-traits/shell/NakedBody'
import { RaddishShell, RaddishShellOpeningLip } from './glowbud-traits/shell/RaddishShell'
import { RockShell, RockShellOpeningLip } from './glowbud-traits/shell/RockShell'
import { RobotShell, RobotShellOpeningFrame, ROBOT_SHADOW } from './glowbud-traits/shell/RobotShell'
import { SharkShell, SharkShellOpeningJaws, SHARK_SHADOW } from './glowbud-traits/shell/SharkShell'
import {
  SeedFinishShell,
  SeedFinishShellOpeningLip,
  SMOOTH_SHELL_SHADOW,
  STOIC_SHELL_SHADOW,
} from './glowbud-traits/shell/SeedFinishShells'
import { SoftShell, SOFT_SHELL_LIGHT, SOFT_SHELL_MID, SOFT_SHELL_SHADOW } from './glowbud-traits/shell/SoftShell'
import { SpikeyShell, SpikeyShellOpeningLip } from './glowbud-traits/shell/SpikeyShell'
import {
  APE_SKIN_BASE,
  APE_SKIN_LIGHT,
  APE_SKIN_SHADE,
  ApeFaceTreatment,
  ApeHandTreatment,
} from './glowbud-traits/skin/ApeSkin'
import {
  ALIEN_SKIN_BASE,
  ALIEN_SKIN_LIGHT,
  ALIEN_SKIN_SHADE,
  AlienFaceTreatment,
  AlienHandTreatment,
} from './glowbud-traits/skin/AlienSkin'
import {
  ZOMBIE_SKIN_BASE,
  ZOMBIE_SKIN_LIGHT,
  ZOMBIE_SKIN_SHADE,
  ZombieFaceTreatment,
  ZombieHandTreatment,
} from './glowbud-traits/skin/ZombieSkin'

type RedShellIdleCritterAssetProps = {
  mode?: RedShellIdleCritterAssetMode
  animation?: RedShellCritterAnimation
  scale?: number
  activity?: number
  position?: [number, number, number]
}

type GlowbudWizardCritterAssetProps = {
  animation?: RedShellCritterAnimation
  scale?: number
  activity?: number
  position?: [number, number, number]
}

type GlowbudTraitAvatarAssetProps = {
  animation?: RedShellCritterAnimation
  scale?: number
  activity?: number
  position?: [number, number, number]
  traits?: GlowbudTraitLoadout
  mossSelection?: GlowbudMossSelectionControls
  assetSelection?: GlowbudAssetSelectionControls
}

export type RedShellIdleCritterAssetMode = 'dressed' | 'character' | 'shell'
export type RedShellCritterAnimation =
  | 'idle'
  | 'hop'
  | 'grumble'
  | 'wave'
  | 'boogie'
  | 'showcase'

type CoreGlowbudAnimation = 'idle' | 'hop' | 'grumble'

function getCoreGlowbudAnimation(animation: RedShellCritterAnimation): CoreGlowbudAnimation {
  return animation === 'hop' || animation === 'grumble' ? animation : 'idle'
}

export type GlowbudShellTrait =
  | 'naked'
  | 'seed-shell'
  | 'smooth-shell'
  | 'stoic-shell'
  | 'soft-shell'
  | 'rock-shell'
  | 'log-shell'
  | 'hoodie-shell'
  | 'guard-shell'
  | 'heavy-duty-shell'
  | 'robot-shell'
  | 'spikey-shell'
  | 'shark-shell'
  | 'horny-shell'
  | 'raddish-shell'
  | 'ancient-shell'
  | 'wizard-cloak'
  | 'green-cloak'
  | 'moss-shell'
  | 'aero-metal-shell'
  | 'crystal-shell'
  | 'gemstone-shell'
  | 'ice-shell'
  | 'gold-jewel-shell'
  | 'amethyst-geode-shell'
export type GlowbudHeadTrait = 'none' | 'hibiscus' | 'venus-flytrap' | 'amanita-muscaria' | 'sunflower' | 'cactus' | 'snake-plant' | 'lotus' | 'douglas' | 'fern' | 'myrtle' | 'lavender' | 'dandelion' | 'sprout' | 'bunch-of-flowers' | 'roses' | 'bonsai' | 'bonsai-sakura' | 'flower' | 'two-flowers' | 'palm-tree'
export type GlowbudPotTrait = 'blue-flower-pot' | 'purple-cube-pot' | 'gold-crown-pot' | 'terracotta'
export type GlowbudHeldTrait = 'none' | 'wizard-staff' | 'axe' | 'sword' | 'peak' | 'fire'
export type GlowbudFaceTrait = 'soft' | 'grouchy'
export type GlowbudEyeTrait =
  | 'open'
  | 'unibrow'
  | 'mellow'
  | 'dot'
  | 'enjoyer'
  | 'purp'
  | 'vr'
  | 'eeeek'
  | 'suspicious'
  | 'blazeitup420'
  | 'whats-that'
  | 'mossing'
  | 'shades'
export type GlowbudMouthTrait =
  | 'open'
  | 'classic-smile'
  | 'surprised-o'
  | 'huh'
  | 'long-face'
  | 'wazzzzzzzzup'
  | 'normal-guy'
  | 'vampire'
  | 'sad'
  | 'blush'
  | 'grrrrrrrr'
  | 'ciggy'
  | 'woozy'
  | 'omg'
export type GlowbudNoseTrait = 'none' | 'clown-nose'
export type GlowbudSkinTrait =
  | 'red'
  | 'glow-lime'
  | 'stone-gray'
  | 'pixel-pink'
  | 'gold'
  | 'zombie'
  | 'ape'
  | 'alien'
export type GlowbudBackgroundTrait = 'blue' | 'yellow' | 'green' | 'purple' | 'red'
export type GlowbudFlytrapVariant = 'friendly-bite' | 'wide-crown'
export type GlowbudCompanionTrait =
  | 'none'
  | 'cartoon-snail'
  | 'canary-birb'
  | 'cardinal-birb'
  | 'toad'
export type GlowbudTraitLoadout = {
  shell: GlowbudShellTrait
  head: GlowbudHeadTrait
  pot?: GlowbudPotTrait
  held: GlowbudHeldTrait
  face: GlowbudFaceTrait
  eyes?: GlowbudEyeTrait
  mouth?: GlowbudMouthTrait
  nose?: GlowbudNoseTrait
  skin?: GlowbudSkinTrait
  background?: GlowbudBackgroundTrait
  flytrap?: GlowbudFlytrapVariant
  companion?: GlowbudCompanionTrait
}

export type GlowbudMossPickInfo = {
  id: string
  objectName: string
  local: [number, number, number]
  world: [number, number, number]
  materialColor?: string
}

export type GlowbudMossSelectionControls = {
  enabled: boolean
  selectedId?: string | null
  onPick?: (pick: GlowbudMossPickInfo) => void
}

export type GlowbudAssetPickInfo = GlowbudMossPickInfo & {
  slot: string
  trait: string
  hierarchy: string
  size: [number, number, number]
}

export type GlowbudAssetSelectionControls = {
  enabled: boolean
  selectedId?: string | null
  onPick?: (pick: GlowbudAssetPickInfo) => void
}

const VAC_ASSET_INK = '#17121f'
const VAC_ASSET_DETAIL_INK = '#211827'

const SHELL_DARK = '#5a3214'
const SHELL_DEEP = '#3b1d0b'
const SHELL_MID = '#a76322'
const SHELL_LIGHT = '#d99538'
const SHELL_GLAZE = '#f0b24c'
const SHELL_EDGE_LIGHT = '#ffc35c'
const SHELL_REAR_BLEND = '#b76a1f'
const AERO_SHELL_DEEP = '#24104a'
const AERO_SHELL_DARK = '#3a2180'
const AERO_SHELL_MID = '#7241d4'
const AERO_SHELL_HOT = '#ce84ff'
const AERO_SHELL_GLINT = '#f3d6ff'
const AERO_SHELL_BLACK_PURPLE = '#100b22'
const AERO_PANEL_SILVER = '#bfc7d4'
const AERO_BUTTON_CYAN = '#79f0df'
const AERO_BUTTON_ROSE = '#ff7cc7'
const CRYSTAL_INK = '#11121c'
const CRYSTAL_GLASS = '#a8dcf5'
const CRYSTAL_GLASS_BLUE = '#63bdee'
const CRYSTAL_GLASS_LAVENDER = '#bdd3f2'
const CRYSTAL_GLASS_WARM = '#e4f7ff'
const CRYSTAL_FACET_DEEP = '#244d6b'
const CRYSTAL_GLINT = '#ffffff'
const GOLD_SHELL_INK = '#271407'
const GOLD_SHELL_DEEP = '#6b2f12'
const GOLD_SHELL_DARK = '#9c5518'
const GOLD_SHELL_MID = '#d99119'
const GOLD_SHELL_RICH = '#f4b51f'
const GOLD_SHELL_LIGHT = '#ffd93f'
const GOLD_SHELL_GLINT = '#fff3a6'
const GOLD_SHELL_DUST = '#b8791d'
const GOLD_JEWEL_RUBY = '#e83c56'
const GOLD_JEWEL_SAPPHIRE = '#32a6df'
const GOLD_JEWEL_EMERALD = '#7fd63e'
const GOLD_JEWEL_AMETHYST = '#b45be7'
const GOLD_JEWEL_PEARL = '#fff0c4'
const AMETHYST_INK = '#171024'
const AMETHYST_STONE_DEEP = '#180d28'
const AMETHYST_STONE_MID = '#4a2670'
const AMETHYST_QUARTZ_SHADOW = '#482774'
const AMETHYST_QUARTZ_FROST = '#7641b0'
const AMETHYST_QUARTZ_CLEAR = '#a569ed'
const AMETHYST_SMOKY_EDGE = '#321c52'
const AMETHYST_SMOKY_CLEAR = '#67369b'
const AMETHYST_BASE_OPAQUE = '#1f0e31'
const AMETHYST_BASE_STONE = '#3e1f61'
const AMETHYST_BASE_FADE = '#633495'
const AMETHYST_INTERNAL_DEEP = '#2a0d4a'
const AMETHYST_INTERNAL_VIOLET = '#6f26ba'
const AMETHYST_PURPLE_DEEP = '#2a0a4d'
const AMETHYST_PURPLE_DARK = '#5c16a0'
const AMETHYST_PURPLE_MID = '#8234d7'
const AMETHYST_PURPLE_LIGHT = '#ad68f4'
const AMETHYST_LAVENDER = '#c58cff'
const AMETHYST_CLOUD_DEEP = '#47206f'
const AMETHYST_CLOUD_SOFT = '#a767e8'
const AMETHYST_CLOUD_MILK = '#d7b5ff'
const AMETHYST_CLOUD_VEIL = '#ba87f2'
const AMETHYST_GLINT = '#ffffff'
const MOSS_SHELL_SHADOW = '#0e140c'
const MOSS_SHELL_DEEP = '#1a2415'
const MOSS_SHELL_BARK = '#362d1d'
const MOSS_SHELL_BASE = '#34482a'
const MOSS_SHELL_MID = '#536b35'
const MOSS_SHELL_LIGHT = '#718a48'
const MOSS_SHELL_GLOW = '#7a8b58'
const MOSS_SHELL_LICHEN = '#8d9271'
const MOSS_SHELL_FELT = '#445b31'
const MOSS_SHELL_SOFT = '#5e733f'
const MOSS_SHELL_NEW_GROWTH = '#6c7f49'
const MOSS_SHELL_DRY = '#756b48'
const MOSS_SHELL_SAND = '#806d43'
const MOSS_SHELL_SAND_LIGHT = '#9a8b5e'
const MOSS_SHELL_SOIL = '#4b3924'
const MOSS_ROCK_INK = '#131714'
const MOSS_ROCK_DEEP = '#292b28'
const MOSS_ROCK_SHADOW = '#3b3c37'
const MOSS_ROCK_BASE = '#56564f'
const MOSS_ROCK_MID = '#68675f'
const MOSS_ROCK_LIGHT = '#7b796f'
const MOSS_ROCK_WARM = '#6f6250'
const MOSS_ROCK_DAMP = '#343b34'
const FACE_RED = '#f13224'
const FACE_RED_SHADE = '#a8181b'
const FACE_RED_LIGHT = '#ff7150'
const FACE_LIME = '#caff22'
const FACE_LIME_SHADE = '#78a81e'
const FACE_LIME_LIGHT = '#eaff67'
const FACE_GRAY = '#9fa6a3'
const FACE_GRAY_SHADE = '#5f696b'
const FACE_GRAY_LIGHT = '#d8dac2'
const FACE_PIXEL_PINK = '#f6b4cd'
const FACE_PIXEL_PINK_SHADE = '#dc75a0'
const FACE_PIXEL_PINK_LIGHT = '#ffd3e3'
const FACE_GOLD = '#ffd326'
const FACE_GOLD_SHADE = '#c9860d'
const FACE_GOLD_LIGHT = '#fff27a'
const EYE_WHITE = '#fff9e8'
const GRASS_DARK = '#2f7f44'
const GRASS_MID = '#52c66f'
const GRASS_LIGHT = '#86eaa2'
const GRASS_DEW = '#d8ffc5'
const POT_BLUE_DARK = '#155d7f'
const POT_BLUE_MID = '#8ed7d1'
const POT_BLUE_LIGHT = '#c9f0df'
const POT_BLUE_SHADOW = '#3b89a2'
const POT_CLAY_WASH = '#6eb8bf'
const POT_MATTE_DUST = '#e3f6e8'
const SOIL_DARK = '#1f160f'
const SOIL_MID = '#3c2819'
const SOIL_LIGHT = '#5b3b22'
const SOIL_DUST = '#7a5230'
const STEM_DARK = '#21491c'
const LEAF_MID = '#6aa83a'
const HIBISCUS_RED = '#df1420'
const HIBISCUS_RED_DARK = '#65080e'
const HIBISCUS_RED_LIGHT = '#ff3f35'
const HIBISCUS_RED_JUICE = '#ff6a43'
const HIBISCUS_THROAT_BROWN = '#3a1008'
const HIBISCUS_THROAT_DARK = '#210709'
const HIBISCUS_GUIDE_MAROON = '#8c1219'
const STAMEN_YELLOW = '#ffc742'
const STAMEN_YELLOW_LIGHT = '#ffe78a'
const SUNFLOWER_PETAL_DEEP = '#cf760d'
const SUNFLOWER_PETAL_MID = '#f5aa18'
const SUNFLOWER_PETAL_GOLD = '#ffd635'
const SUNFLOWER_PETAL_LIGHT = '#fff06b'
const SUNFLOWER_CENTER_DARK = '#4a240f'
const SUNFLOWER_CENTER_MID = '#754119'
const SUNFLOWER_CENTER_LIGHT = '#b46d26'
const SUNFLOWER_STEM_DARK = '#2f642a'
const SUNFLOWER_STEM_MID = '#4f8e35'
const SUNFLOWER_STEM_LIGHT = '#83ba4d'
const FLYTRAP_GREEN_DARK = '#0f5b2d'
const FLYTRAP_GREEN_MID = '#38b94d'
const FLYTRAP_GREEN_LIGHT = '#88e85d'
const FLYTRAP_LIP_RED = '#ff6f7d'
const FLYTRAP_LIP_LIGHT = '#ffb08f'
const FLYTRAP_LIP_SHADOW = '#d53a68'
const FLYTRAP_INNER_LOBE = '#ff657c'
const FLYTRAP_MOUTH_INTERIOR = '#ff91a0'
const FLYTRAP_MOUTH_MID = '#ee4f78'
const FLYTRAP_MOUTH_DEEP = '#7b2858'
const FLYTRAP_CILIA = '#ffe3a4'
const FLYTRAP_BLUSH = '#ffb59b'
const FLYTRAP_GLOSS = '#f7ffd1'
const FLYTRAP_GREEN_GLOSS = '#ddff63'
const FLYTRAP_SPOT_YELLOW = '#e8ff74'
const FLYTRAP_SPOT_YELLOW_EDGE = '#8ccf4c'
const FLYTRAP_SKIN_VEIN = '#267f3a'
const FLYTRAP_SKIN_PORE = '#1b6731'
const FLYTRAP_SKIN_GLAZE = '#cfff78'
const FLYTRAP_TOOTH = '#fff3b0'
const FLYTRAP_EYE_DARK = '#241425'
const FLYTRAP_SHADOW_GREEN = '#10381f'
const SNAIL_GREEN_DARK = '#265830'
const SNAIL_GREEN_MID = '#3f7d38'
const SNAIL_GREEN_LIGHT = '#76a84d'
const SNAIL_GREEN_GLOSS = '#9cbc5c'
const SNAIL_MOUTH_ORANGE = '#d3851d'
const SNAIL_MOUTH_GOLD = '#f3b733'
const SNAIL_MOUTH_CREAM = '#fff6b8'
const SNAIL_SHELL_DARK = '#7c4a1b'
const SNAIL_SHELL_MID = '#c27c2d'
const SNAIL_SHELL_LIGHT = '#ffbf49'
const CANARY_YELLOW_DARK = '#c78a13'
const CANARY_YELLOW_MID = '#f1c82c'
const CANARY_YELLOW_LIGHT = '#ffe667'
const CANARY_WING_GOLD = '#e5a51b'
const CANARY_BEAK_ORANGE = '#dd7212'
const CANARY_BEAK_LIGHT = '#ffab25'
const CANARY_LEG_ORANGE = '#c96b11'
const CARDINAL_RED_DARK = '#90252a'
const CARDINAL_RED_MID = '#d4433a'
const CARDINAL_RED_LIGHT = '#ef694d'
const CARDINAL_WING_CORAL = '#ee7856'
const CARDINAL_BEAK_GOLD = '#f2cf31'
const CARDINAL_LEG_ORANGE = '#c97818'
const TOAD_GREEN_DARK = '#2e632c'
const TOAD_GREEN_MID = '#589d35'
const TOAD_GREEN_LIGHT = '#91bd3b'
const TOAD_FACE_LIME = '#c1df54'
const TOAD_MOUTH_RED = '#c94a37'
const AMANITA_CAP_RED = '#ef2730'
const AMANITA_CAP_DEEP = '#9d1021'
const AMANITA_CAP_ORANGE = '#ff5638'
const AMANITA_CAP_LIGHT = '#ff8061'
const AMANITA_SPOT_CREAM = '#fff4cf'
const AMANITA_SPOT_WARM = '#ffe6a5'
const AMANITA_STEM = '#f5dfab'
const AMANITA_STEM_SHADE = '#b98255'
const AMANITA_STEM_LIGHT = '#fff0c8'
const AMANITA_GILL = '#ead1a5'
const AMANITA_GILL_SHADOW = '#946648'
const AMANITA_ROOT = '#d7b47d'
const STAFF_WOOD_DARK = '#7b3f12'
const STAFF_WOOD_MID = '#b66a20'
const STAFF_WOOD_LIGHT = '#f0a33a'
const STAFF_WRAP_DARK = '#5a2f18'
const ITEM_STEEL_DARK = '#53627c'
const ITEM_STEEL_MID = '#91add3'
const ITEM_STEEL_LIGHT = '#d9f0ff'
const ITEM_GOLD_DARK = '#a85b16'
const ITEM_GOLD_MID = '#f1b826'
const ITEM_GOLD_LIGHT = '#ffe978'
const ITEM_FIRE_RED = '#d93624'
const ITEM_FIRE_ORANGE = '#ff7a22'
const ITEM_FIRE_YELLOW = '#ffd83d'
const ITEM_FIRE_CREAM = '#fff3a8'
const WIZARD_BROW_DARK = '#3a1417'
const WIZARD_BROW_MID = '#68221f'
const WIZARD_BROW_LIGHT = '#a13a2b'
const WIZARD_FACE_SETBACK_Z = 0.105

type GlowbudSkinPalette = {
  base: string
  shade: string
  light: string
  dot: string
  finish: 'classic' | 'gold' | 'zombie' | 'ape' | 'alien'
}

const GLOWBUD_SKIN_PALETTES: Record<GlowbudSkinTrait, GlowbudSkinPalette> = {
  red: {
    base: FACE_RED,
    shade: FACE_RED_SHADE,
    light: FACE_RED_LIGHT,
    dot: '#ffb19a',
    finish: 'classic',
  },
  'glow-lime': {
    base: FACE_LIME,
    shade: FACE_LIME_SHADE,
    light: FACE_LIME_LIGHT,
    dot: '#efff9b',
    finish: 'classic',
  },
  'stone-gray': {
    base: FACE_GRAY,
    shade: FACE_GRAY_SHADE,
    light: FACE_GRAY_LIGHT,
    dot: '#c7cec8',
    finish: 'classic',
  },
  'pixel-pink': {
    base: FACE_PIXEL_PINK,
    shade: FACE_PIXEL_PINK_SHADE,
    light: FACE_PIXEL_PINK_LIGHT,
    dot: '#ffc8dd',
    finish: 'classic',
  },
  gold: {
    base: FACE_GOLD,
    shade: FACE_GOLD_SHADE,
    light: FACE_GOLD_LIGHT,
    dot: '#fff7b8',
    finish: 'gold',
  },
  zombie: {
    base: ZOMBIE_SKIN_BASE,
    shade: ZOMBIE_SKIN_SHADE,
    light: ZOMBIE_SKIN_LIGHT,
    dot: '#afc47d',
    finish: 'zombie',
  },
  ape: {
    base: APE_SKIN_BASE,
    shade: APE_SKIN_SHADE,
    light: APE_SKIN_LIGHT,
    dot: '#d4a37a',
    finish: 'ape',
  },
  alien: {
    base: ALIEN_SKIN_BASE,
    shade: ALIEN_SKIN_SHADE,
    light: ALIEN_SKIN_LIGHT,
    dot: '#d8ff72',
    finish: 'alien',
  },
}

function getGlowbudSkinPalette(skin: GlowbudSkinTrait = 'red') {
  return GLOWBUD_SKIN_PALETTES[skin] ?? GLOWBUD_SKIN_PALETTES.red
}

const EMPTY_MOSS_SELECTION: GlowbudMossSelectionControls = { enabled: false }
const MossSelectionContext = createContext<GlowbudMossSelectionControls>(EMPTY_MOSS_SELECTION)
const GlowbudAnimationContext = createContext<RedShellCritterAnimation>('idle')
const REMOVED_MOSS_PICK_IDS = new Set([
  'moss-shell-body-mesh-228',
  'moss-shell-body-mesh-229',
  'moss-shell-body-mesh-230',
  'moss-shell-body-mesh-231',
  'moss-shell-body-mesh-232',
  'moss-shell-body-mesh-233',
  'moss-shell-body-mesh-234',
  'moss-shell-body-mesh-235',
  'moss-shell-body-mesh-236',
  'moss-shell-body-mesh-237',
  'moss-shell-body-mesh-238',
  'moss-shell-body-mesh-239',
  'moss-shell-body-mesh-240',
  'moss-shell-body-mesh-241',
  'moss-shell-body-mesh-242',
  'moss-shell-body-mesh-243',
  'moss-shell-body-mesh-244',
  'moss-shell-body-mesh-288',
  'moss-shell-body-mesh-308',
  'moss-shell-body-mesh-318',
  'moss-shell-body-mesh-338',
  'moss-shell-body-mesh-527',
  'moss-shell-body-mesh-528',
  'moss-shell-body-mesh-529',
  'moss-shell-body-mesh-530',
  'moss-shell-body-mesh-531',
  'moss-shell-body-mesh-532',
  'moss-shell-body-mesh-533',
  'moss-shell-body-mesh-534',
  'moss-shell-body-mesh-535',
  'moss-shell-body-mesh-555',
  'moss-shell-body-mesh-557',
  'moss-shell-body-mesh-558',
  'moss-shell-body-mesh-559',
  'moss-shell-body-mesh-560',
  'moss-shell-body-mesh-561',
  'moss-shell-body-mesh-562',
  'moss-shell-body-mesh-563',
  'moss-shell-body-mesh-564',
  'moss-shell-body-mesh-565',
  'moss-shell-body-mesh-566',
  'moss-shell-body-mesh-567',
  'moss-shell-body-mesh-568',
  'moss-shell-body-mesh-569',
  'moss-shell-body-mesh-583',
  'moss-shell-body-mesh-584',
  'moss-shell-body-mesh-585',
  'moss-shell-body-mesh-586',
  'moss-shell-body-mesh-587',
  'moss-shell-body-mesh-588',
  'moss-shell-body-mesh-589',
  'moss-shell-body-mesh-603',
  'moss-shell-body-mesh-723',
  'moss-shell-body-mesh-724',
  'moss-shell-body-mesh-725',
  'moss-shell-body-mesh-726',
  'moss-shell-body-mesh-727',
  'moss-shell-body-mesh-728',
  'moss-shell-body-mesh-733',
  'moss-shell-body-mesh-734',
  'moss-shell-body-mesh-735',
  'moss-shell-body-mesh-736',
  'moss-shell-body-mesh-737',
  'moss-shell-body-mesh-738',
  'moss-shell-body-mesh-740',
  'moss-shell-body-mesh-743',
  'moss-shell-body-mesh-753',
  'moss-shell-body-mesh-755',
  'moss-shell-body-mesh-774',
  'moss-shell-body-mesh-775',
])

type MossPickWrapBend = {
  axis: 'x' | 'y'
  arc: number
  cup: number
  tuck: number
  puff: number
}

const MOSS_PICK_SHAPE_ADJUSTMENTS: Record<string, {
  scale: [number, number, number]
  position: [number, number, number]
  rotation: [number, number, number]
  wrapBend?: MossPickWrapBend
  geometry?: 'bent-cushion' | 'sphere'
  drapeLobes?: Array<{
    position: [number, number, number]
    scale: [number, number, number]
    rotation: [number, number, number]
  }>
}> = {
  'moss-shell-body-mesh-177': {
    scale: [0.72, 0.7, 0.78],
    position: [0, -0.092, -0.108],
    rotation: [-1.24, 0.1, 0.16],
    drapeLobes: [
      { position: [0.54, -0.2, -0.36], scale: [0.42, 0.4, 0.46], rotation: [-0.42, 0.08, -0.18] },
      { position: [0.22, -0.36, -0.54], scale: [0.46, 0.42, 0.48], rotation: [-0.52, 0.02, -0.08] },
      { position: [-0.16, -0.5, -0.7], scale: [0.4, 0.38, 0.44], rotation: [-0.64, -0.04, 0.1] },
      { position: [0.18, -0.66, -0.86], scale: [0.34, 0.32, 0.38], rotation: [-0.74, 0.04, -0.06] },
      { position: [-0.34, -0.74, -0.96], scale: [0.28, 0.28, 0.32], rotation: [-0.8, -0.06, 0.12] },
    ],
  },
  'moss-shell-body-mesh-184': {
    scale: [0.72, 0.7, 0.78],
    position: [0, -0.092, -0.108],
    rotation: [-1.24, -0.1, -0.16],
    drapeLobes: [
      { position: [-0.54, -0.2, -0.36], scale: [0.42, 0.4, 0.46], rotation: [-0.42, -0.08, 0.18] },
      { position: [-0.22, -0.36, -0.54], scale: [0.46, 0.42, 0.48], rotation: [-0.52, -0.02, 0.08] },
      { position: [0.16, -0.5, -0.7], scale: [0.4, 0.38, 0.44], rotation: [-0.64, 0.04, -0.1] },
      { position: [-0.18, -0.66, -0.86], scale: [0.34, 0.32, 0.38], rotation: [-0.74, -0.04, 0.06] },
      { position: [0.34, -0.74, -0.96], scale: [0.28, 0.28, 0.32], rotation: [-0.8, 0.06, -0.12] },
    ],
  },
  'moss-shell-body-mesh-236': {
    scale: [1.22, 0.82, 1.18],
    position: [0, -0.058, -0.07],
    rotation: [-0.9, 0.08, 0.08],
    drapeLobes: [
      { position: [0.38, -0.34, -0.5], scale: [0.64, 0.58, 0.72], rotation: [-0.48, 0.06, -0.1] },
      { position: [-0.16, -0.56, -0.72], scale: [0.5, 0.46, 0.58], rotation: [-0.62, -0.04, 0.08] },
    ],
  },
  'moss-shell-body-mesh-283': {
    scale: [0.72, 1.22, 1.14],
    position: [0, 0, 0],
    rotation: [0, 0, 0],
  },
  'moss-shell-body-mesh-297': {
    scale: [0.62, 1.1, 1.02],
    position: [0, -0.028, -0.078],
    rotation: [0, 0, 0],
    geometry: 'sphere',
  },
  'moss-shell-body-mesh-299': {
    scale: [0.58, 1.04, 0.96],
    position: [0, -0.04, -0.105],
    rotation: [0, 0, 0],
    geometry: 'sphere',
  },
  'moss-shell-body-mesh-307': {
    scale: [0.62, 1.1, 1.02],
    position: [0, -0.028, -0.078],
    rotation: [0, 0, 0],
    geometry: 'sphere',
  },
  'moss-shell-body-mesh-309': {
    scale: [0.58, 1.04, 0.96],
    position: [0, -0.04, -0.105],
    rotation: [0, 0, 0],
    geometry: 'sphere',
  },
  'moss-shell-body-mesh-313': {
    scale: [1.12, 1.04, 1.18],
    position: [0, -0.108, -0.132],
    rotation: [-1.32, 0.32, 0.22],
    wrapBend: { axis: 'x', arc: 0.82, cup: 0.42, tuck: 0.34, puff: 0.32 },
    geometry: 'bent-cushion',
    drapeLobes: [
      { position: [0.62, -0.22, -0.38], scale: [0.66, 0.64, 0.76], rotation: [-0.52, 0.16, -0.2] },
      { position: [0.18, -0.46, -0.58], scale: [0.7, 0.66, 0.78], rotation: [-0.64, 0.04, -0.06] },
      { position: [-0.28, -0.64, -0.8], scale: [0.58, 0.56, 0.68], rotation: [-0.78, -0.08, 0.14] },
      { position: [0.08, -0.82, -1.02], scale: [0.44, 0.44, 0.54], rotation: [-0.9, 0.02, -0.04] },
    ],
  },
  'moss-shell-body-mesh-317': {
    scale: [0.62, 1.1, 1.02],
    position: [0, -0.028, -0.078],
    rotation: [0, 0, 0],
    geometry: 'sphere',
  },
  'moss-shell-body-mesh-319': {
    scale: [0.58, 1.04, 0.96],
    position: [0, -0.04, -0.105],
    rotation: [0, 0, 0],
    geometry: 'sphere',
  },
  'moss-shell-body-mesh-323': {
    scale: [1.12, 1.04, 1.18],
    position: [0, -0.108, -0.132],
    rotation: [-1.32, -0.32, -0.22],
    wrapBend: { axis: 'x', arc: 0.82, cup: 0.42, tuck: 0.34, puff: 0.32 },
    geometry: 'bent-cushion',
    drapeLobes: [
      { position: [-0.62, -0.22, -0.38], scale: [0.66, 0.64, 0.76], rotation: [-0.52, -0.16, 0.2] },
      { position: [-0.18, -0.46, -0.58], scale: [0.7, 0.66, 0.78], rotation: [-0.64, -0.04, 0.06] },
      { position: [0.28, -0.64, -0.8], scale: [0.58, 0.56, 0.68], rotation: [-0.78, 0.08, -0.14] },
      { position: [-0.08, -0.82, -1.02], scale: [0.44, 0.44, 0.54], rotation: [-0.9, -0.02, 0.04] },
    ],
  },
  'moss-shell-body-mesh-327': {
    scale: [0.62, 1.1, 1.02],
    position: [0, -0.028, -0.078],
    rotation: [0, 0, 0],
    geometry: 'sphere',
  },
  'moss-shell-body-mesh-337': {
    scale: [0.62, 1.1, 1.02],
    position: [0, -0.028, -0.078],
    rotation: [0, 0, 0],
    geometry: 'sphere',
  },
  'moss-shell-body-mesh-333': {
    scale: [1.08, 1.04, 1.18],
    position: [0, -0.104, -0.128],
    rotation: [-1.28, 0, 0.04],
    wrapBend: { axis: 'x', arc: 0.9, cup: 0.46, tuck: 0.36, puff: 0.34 },
    geometry: 'bent-cushion',
    drapeLobes: [
      { position: [0.5, -0.24, -0.42], scale: [0.64, 0.62, 0.74], rotation: [-0.54, 0.1, -0.16] },
      { position: [0.04, -0.48, -0.64], scale: [0.68, 0.64, 0.76], rotation: [-0.68, 0, 0.02] },
      { position: [-0.44, -0.68, -0.84], scale: [0.56, 0.54, 0.66], rotation: [-0.8, -0.1, 0.16] },
      { position: [0.22, -0.86, -1.04], scale: [0.42, 0.42, 0.52], rotation: [-0.92, 0.04, -0.08] },
    ],
  },
  'moss-shell-body-mesh-349': {
    scale: [0.74, 1.2, 1.14],
    position: [0, 0, 0],
    rotation: [0, 0, 0],
  },
  'moss-shell-body-mesh-553': {
    scale: [0.74, 1.2, 1.14],
    position: [0, -0.004, 0],
    rotation: [0, 0, 0],
    geometry: 'sphere',
  },
  'moss-shell-body-mesh-556': {
    scale: [0.74, 1.2, 1.14],
    position: [0, -0.004, 0],
    rotation: [0, 0, 0],
    geometry: 'sphere',
  },
  'moss-shell-body-mesh-583': {
    scale: [0.74, 1.2, 1.14],
    position: [0, -0.004, 0],
    rotation: [0, 0, 0],
    geometry: 'sphere',
  },
  'moss-shell-body-mesh-773': {
    scale: [1.02, 1.06, 1.16],
    position: [0, -0.04, -0.05],
    rotation: [-0.42, 0, -0.02],
    wrapBend: { axis: 'x', arc: 0.36, cup: 0.22, tuck: 0.18, puff: 0.3 },
    drapeLobes: [
      { position: [0.32, -0.18, -0.26], scale: [0.56, 0.56, 0.64], rotation: [-0.28, 0.04, -0.08] },
      { position: [-0.22, -0.3, -0.38], scale: [0.46, 0.48, 0.56], rotation: [-0.38, -0.04, 0.08] },
      { position: [0.04, -0.42, -0.5], scale: [0.36, 0.38, 0.46], rotation: [-0.46, 0, -0.02] },
    ],
  },
  'moss-shell-body-mesh-765': {
    scale: [1.18, 0.8, 1.16],
    position: [0, -0.052, -0.068],
    rotation: [-0.86, -0.08, -0.06],
    drapeLobes: [
      { position: [-0.34, -0.3, -0.48], scale: [0.58, 0.52, 0.68], rotation: [-0.44, -0.08, 0.1] },
      { position: [0.16, -0.52, -0.68], scale: [0.48, 0.44, 0.56], rotation: [-0.58, 0.04, -0.08] },
    ],
  },
}

function toPickTuple(vector: THREE.Vector3): [number, number, number] {
  return [
    Number(vector.x.toFixed(4)),
    Number(vector.y.toFixed(4)),
    Number(vector.z.toFixed(4)),
  ]
}

function getMossPickId(object: THREE.Object3D, root: THREE.Object3D) {
  let current: THREE.Object3D | null = object

  while (current) {
    const id = current.userData.glowbudMossPickId
    if (typeof id === 'string') return { id, object: current }
    if (current === root) break
    current = current.parent
  }

  return null
}

function getMaterialColor(object: THREE.Object3D) {
  const maybeMesh = object as THREE.Mesh
  const material = Array.isArray(maybeMesh.material) ? maybeMesh.material[0] : maybeMesh.material
  if (!material || !('color' in material)) return undefined
  const color = (material as THREE.Material & { color?: THREE.Color }).color
  return color ? `#${color.getHexString()}` : undefined
}

function GlowbudTraitSlotScope({
  slot,
  trait,
  children,
}: {
  slot: string
  trait: string
  children: ReactNode
}) {
  return (
    <group
      name={`trait-${slot}-${trait}`}
      userData={{ glowbudTraitSlot: slot, glowbudTraitName: trait }}
    >
      {children}
    </group>
  )
}

function getGlowbudTraitScope(object: THREE.Object3D, root: THREE.Object3D) {
  let current: THREE.Object3D | null = object

  while (current) {
    const slot = current.userData.glowbudTraitSlot
    const trait = current.userData.glowbudTraitName
    if (typeof slot === 'string' && typeof trait === 'string') {
      return { slot, trait, object: current }
    }
    if (current === root) break
    current = current.parent
  }

  return { slot: 'shared', trait: 'avatar', object: root }
}

function assignGlowbudAssetPickIds(root: THREE.Object3D) {
  const counters = new Map<string, number>()

  root.traverse((object) => {
    if (object.type !== 'Mesh') return
    const scope = getGlowbudTraitScope(object, root)
    const counterKey = `${scope.slot}-${scope.trait}`
    const nextIndex = counters.get(counterKey) ?? 0
    const mossId = object.userData.glowbudMossPickId
    const id = typeof mossId === 'string'
      ? mossId
      : `${counterKey}-mesh-${String(nextIndex).padStart(3, '0')}`
    object.userData.glowbudAssetPickId = id
    object.userData.glowbudAssetPickSlot = scope.slot
    object.userData.glowbudAssetPickTrait = scope.trait
    if (!object.name || object.userData.glowbudAssetPickAutoNamed) {
      object.name = id
      object.userData.glowbudAssetPickAutoNamed = true
    }
    counters.set(counterKey, nextIndex + 1)
  })
}

function getGlowbudAssetPick(object: THREE.Object3D, root: THREE.Object3D) {
  let current: THREE.Object3D | null = object

  while (current) {
    const id = current.userData.glowbudAssetPickId
    if (typeof id === 'string') {
      return {
        id,
        slot: String(current.userData.glowbudAssetPickSlot ?? 'shared'),
        trait: String(current.userData.glowbudAssetPickTrait ?? 'avatar'),
        object: current,
      }
    }
    if (current === root) break
    current = current.parent
  }

  return null
}

function getGlowbudObjectHierarchy(object: THREE.Object3D, root: THREE.Object3D) {
  const names: string[] = []
  let current: THREE.Object3D | null = object

  while (current) {
    if (current.name) names.unshift(current.name)
    if (current === root) break
    current = current.parent
  }

  return names.join(' > ')
}

function hasAncestorMossPickId(object: THREE.Object3D, root: THREE.Object3D) {
  let current = object.parent

  while (current) {
    if (typeof current.userData.glowbudMossPickId === 'string') return true
    if (current === root) return false
    current = current.parent
  }

  return false
}

function applyMossWrapBendToGeometry(geometry: THREE.BufferGeometry, bend: MossPickWrapBend) {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute | undefined
  if (!position) return

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const along = bend.axis === 'x' ? x : y
    const t = Math.max(-1, Math.min(1, along))
    const edge = Math.abs(t)
    const center = Math.max(0, 1 - edge * edge)
    const upperPuff = Math.max(0, z)
    const lowerContact = Math.max(0, -z)
    const endDrop = bend.arc * edge * edge * (0.22 + lowerContact * 0.08)
    const middleTuck = bend.cup * center * (0.12 + lowerContact * 0.16)
    const shellSink = bend.tuck * (0.3 + center * 0.7) * (0.52 + lowerContact * 0.34)
    const sidePinch = 1 - center * bend.cup * 0.035
    const puffLift = upperPuff * center * bend.puff * 0.18
    const nextAlong = along * sidePinch
    const nextCross = (bend.axis === 'x' ? y : x) - endDrop - middleTuck
    const nextDepth = z - shellSink - middleTuck + puffLift

    if (bend.axis === 'x') {
      position.setXYZ(index, nextAlong, nextCross, nextDepth)
    } else {
      position.setXYZ(index, nextCross, nextAlong, nextDepth)
    }
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
}

function createMossWrapBendGeometry(bend: MossPickWrapBend) {
  const geometry = new THREE.SphereGeometry(1, 18, 9)
  applyMossWrapBendToGeometry(geometry, bend)
  return geometry
}

function createBentMossCushionGeometry(bend: MossPickWrapBend) {
  const vertices: number[] = []
  const indices: number[] = []
  const lengthSegments = 12
  const radialSegments = 12

  for (let lengthIndex = 0; lengthIndex <= lengthSegments; lengthIndex += 1) {
    const t = (lengthIndex / lengthSegments) * 2 - 1
    const edge = Math.abs(t)
    const center = Math.max(0, 1 - edge * edge)
    const pathAlong = t
    const pathCross = -bend.arc * edge * edge * 0.42 - bend.cup * center * 0.14
    const pathDepth = -bend.tuck * (0.36 + center * 0.64)
    const crossRadius = 0.42 * (0.82 + center * (0.34 + bend.puff))
    const depthRadius = 0.46 * (0.86 + center * (0.32 + bend.puff))

    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const theta = (radialIndex / radialSegments) * Math.PI * 2
      const localAlong = pathAlong
      const localCross = pathCross + Math.cos(theta) * crossRadius
      const localDepth = pathDepth + Math.sin(theta) * depthRadius

      if (bend.axis === 'x') {
        vertices.push(localAlong, localCross, localDepth)
      } else {
        vertices.push(localCross, localAlong, localDepth)
      }
    }
  }

  for (let lengthIndex = 0; lengthIndex < lengthSegments; lengthIndex += 1) {
    const ringStart = lengthIndex * radialSegments
    const nextRingStart = (lengthIndex + 1) * radialSegments

    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const nextRadialIndex = (radialIndex + 1) % radialSegments
      indices.push(
        ringStart + radialIndex,
        nextRingStart + radialIndex,
        nextRingStart + nextRadialIndex,
        ringStart + radialIndex,
        nextRingStart + nextRadialIndex,
        ringStart + nextRadialIndex,
      )
    }
  }

  const capCross = -bend.arc * 0.42
  const capDepth = -bend.tuck * 0.36
  const startCenterIndex = vertices.length / 3
  vertices.push(bend.axis === 'x' ? -1 : capCross, bend.axis === 'x' ? capCross : -1, capDepth)
  const endCenterIndex = vertices.length / 3
  vertices.push(bend.axis === 'x' ? 1 : capCross, bend.axis === 'x' ? capCross : 1, capDepth)

  for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
    const nextRadialIndex = (radialIndex + 1) % radialSegments
    const endRingStart = lengthSegments * radialSegments
    indices.push(startCenterIndex, nextRadialIndex, radialIndex)
    indices.push(endCenterIndex, endRingStart + radialIndex, endRingStart + nextRadialIndex)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function applyMossWrapBend(mesh: THREE.Mesh, bend: MossPickWrapBend, geometryMode?: 'bent-cushion') {
  if (mesh.userData.glowbudMossWrapBendApplied) return
  const geometry = geometryMode === 'bent-cushion'
    ? createBentMossCushionGeometry(bend)
    : mesh.geometry.clone()
  if (geometryMode !== 'bent-cushion') {
    applyMossWrapBendToGeometry(geometry, bend)
  }
  mesh.geometry = geometry
  mesh.userData.glowbudMossWrapBendApplied = true
}

function applyMossSphereGeometry(mesh: THREE.Mesh) {
  if (mesh.userData.glowbudMossSphereGeometryApplied) return
  mesh.geometry = new THREE.SphereGeometry(1, 18, 9)
  mesh.userData.glowbudMossSphereGeometryApplied = true
}

function MossSelectableScope({
  scopeId,
  children,
}: {
  scopeId: string
  children: ReactNode
}) {
  const root = useRef<THREE.Group>(null)
  const selection = useContext(MossSelectionContext)

  useEffect(() => {
    const scope = root.current
    if (!scope) return

    let fallbackIndex = 0
    scope.traverse((object) => {
      if (object.type !== 'Mesh' || hasAncestorMossPickId(object, scope)) return
      const id = `${scopeId}-mesh-${String(fallbackIndex).padStart(3, '0')}`
      object.name = id
      object.userData.glowbudMossPickId = id
      const adjustment = MOSS_PICK_SHAPE_ADJUSTMENTS[id]
      if (adjustment) {
        const mesh = object as THREE.Mesh
        object.scale.multiply(new THREE.Vector3(...adjustment.scale))
        object.position.x += adjustment.position[0]
        object.position.y += adjustment.position[1]
        object.position.z += adjustment.position[2]
        object.rotation.x += adjustment.rotation[0]
        object.rotation.y += adjustment.rotation[1]
        object.rotation.z += adjustment.rotation[2]
        if (adjustment.geometry === 'sphere') {
          applyMossSphereGeometry(mesh)
        }
        if (adjustment.wrapBend) {
          applyMossWrapBend(mesh, adjustment.wrapBend, adjustment.geometry === 'bent-cushion' ? adjustment.geometry : undefined)
        }
        if (adjustment.drapeLobes && !object.userData.glowbudMossDrapeLobesApplied) {
          const baseMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
          adjustment.drapeLobes.forEach((lobe, lobeIndex) => {
            const lobeMesh = new THREE.Mesh(
              adjustment.wrapBend
                ? createMossWrapBendGeometry({
                  ...adjustment.wrapBend,
                  arc: adjustment.wrapBend.arc * 0.64,
                  cup: adjustment.wrapBend.cup * 0.68,
                  tuck: adjustment.wrapBend.tuck * 0.72,
                })
                : new THREE.SphereGeometry(1, 14, 7),
              baseMaterial instanceof THREE.Material ? baseMaterial.clone() : new THREE.MeshBasicMaterial({ color: MOSS_SHELL_MID }),
            )
            lobeMesh.name = `${id}-drape-lobe-${lobeIndex}`
            lobeMesh.userData.glowbudMossPickId = id
            lobeMesh.position.set(...lobe.position)
            lobeMesh.scale.set(...lobe.scale)
            lobeMesh.rotation.set(...lobe.rotation)
            object.add(lobeMesh)
          })
          object.userData.glowbudMossDrapeLobesApplied = true
        }
      }
      if (REMOVED_MOSS_PICK_IDS.has(id)) {
        const mesh = object as THREE.Mesh
        object.visible = false
        mesh.raycast = () => undefined
      }
      fallbackIndex += 1
    })
  }, [scopeId])

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (!selection.enabled || !root.current) return

    const picked = getMossPickId(event.object, root.current)
    if (!picked) return

    const world = new THREE.Vector3()
    picked.object.getWorldPosition(world)
    selection.onPick?.({
      id: picked.id,
      objectName: picked.object.name || picked.id,
      local: toPickTuple(picked.object.position),
      world: toPickTuple(world),
      materialColor: getMaterialColor(event.object),
    })
    event.stopPropagation()
  }

  return (
    <group ref={root} onPointerDown={selection.enabled ? handlePointerDown : undefined}>
      {children}
    </group>
  )
}

let vacuumHeadToonRampTexture: THREE.DataTexture | null = null

function getVacuumHeadToonRampTexture() {
  if (vacuumHeadToonRampTexture) return vacuumHeadToonRampTexture

  const colors = new Uint8Array([
    123, 104, 190, 255,
    198, 164, 255, 255,
    255, 242, 166, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  vacuumHeadToonRampTexture = texture
  return texture
}

function CodedAssetOutlineMesh({
  outlineColor = VAC_ASSET_INK,
  outlineWidth,
  ...props
}: ComponentProps<typeof OutlineMesh>) {
  const width = outlineWidth === undefined ? 0.035 : outlineWidth >= 0.012 ? outlineWidth * 1.18 : outlineWidth * 1.08
  return <OutlineMesh {...props} outlineWidth={width} outlineColor={outlineColor} />
}

function toon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getVacuumHeadToonRampTexture()} />
}

function metal(color: string, roughness = 0.22) {
  return <meshStandardMaterial color={color} metalness={0.62} roughness={roughness} />
}

function toonDoubleSided(color: string) {
  return <meshToonMaterial color={color} gradientMap={getVacuumHeadToonRampTexture()} side={THREE.DoubleSide} />
}

function clampIdleActivity(activity: number) {
  return Math.min(1.35, Math.max(0, activity))
}

function idlePulse(time: number, period: number, center = 0.68, width = 0.085) {
  const phase = (time / period) % 1
  const wrappedDistance = Math.min(Math.abs(phase - center), 1 - Math.abs(phase - center))
  const amount = Math.max(0, 1 - wrappedDistance / width)
  return amount * amount * (3 - 2 * amount)
}

function smoothstep01(value: number) {
  const amount = Math.min(1, Math.max(0, value))
  return amount * amount * (3 - 2 * amount)
}

function phasePulse(phase: number, center: number, width: number) {
  const wrappedDistance = Math.min(Math.abs(phase - center), 1 - Math.abs(phase - center))
  return smoothstep01(1 - wrappedDistance / width)
}

function phaseWindow(phase: number, start: number, end: number) {
  return smoothstep01((phase - start) / 0.055) * (1 - smoothstep01((phase - end) / 0.075))
}

function getAmbientLifeMotion(time: number, amount: number) {
  const motion = Math.min(1.35, Math.max(0, amount))
  const period = 18.4
  const phase = ((time / period) % 1 + 1) % 1
  const cycle = Math.floor(Math.max(0, time) / period)
  const waveSide: -1 | 1 = cycle % 2 === 0 ? -1 : 1
  const lookLeft = phasePulse(phase, 0.12, 0.065) * motion
  const lookRight = phasePulse(phase, 0.22, 0.07) * motion
  const doubleBlink = Math.max(
    phasePulse(phase, 0.305, 0.018),
    phasePulse(phase, 0.335, 0.014) * 0.78,
  ) * motion
  const perk = phasePulse(phase, 0.39, 0.075) * motion
  const nod = phasePulse(phase, 0.47, 0.065) * motion
  const waveEnvelope = phaseWindow(phase, 0.54, 0.69) * motion
  const waveBeat = Math.sin(((phase - 0.54) / 0.15) * Math.PI * 4.6) * waveEnvelope
  const wiggleEnvelope = phaseWindow(phase, 0.74, 0.86) * motion
  const wiggleBeat = Math.sin(((phase - 0.74) / 0.12) * Math.PI * 3.4) * wiggleEnvelope
  const contentSettle = phasePulse(phase, 0.9, 0.075) * motion
  const gazeX = (lookRight - lookLeft) * 0.018
  const gazeY = perk * 0.009 - nod * 0.006

  return {
    phase,
    waveSide,
    lookLeft,
    lookRight,
    blink: doubleBlink,
    perk,
    nod,
    waveEnvelope,
    waveBeat,
    wiggleEnvelope,
    wiggleBeat,
    settle: contentSettle,
    gazeX,
    gazeY,
    faceTilt: (lookLeft - lookRight) * 0.012 + waveBeat * 0.004,
    bodyX: (lookRight - lookLeft) * 0.012 + wiggleBeat * 0.01,
    bodyLift: perk * 0.014 + waveEnvelope * 0.004 - nod * 0.006,
    bodyRotateZ: (lookLeft - lookRight) * 0.012 + wiggleBeat * 0.024 + waveBeat * 0.006,
    bodyRotateY: (lookLeft - lookRight) * 0.045 + wiggleBeat * 0.018,
    squashX: perk * 0.012 + contentSettle * 0.014,
    squashY: perk * 0.018 - contentSettle * 0.012,
    plantSway:
      Math.sin(time * 0.78 + 0.4) * 0.014 * motion
      + (lookLeft - lookRight) * 0.008
      + waveBeat * 0.008
      - contentSettle * 0.006,
  }
}

function getDirectedPerformanceMotion(
  time: number,
  animation: RedShellCritterAnimation,
  amount: number,
) {
  const motion = Math.min(1.35, Math.max(0, amount))
  const waveProgress = Math.min(1, Math.max(0, time / 2.18))
  const boogieProgress = Math.min(1, Math.max(0, time / 2.86))
  const showcaseProgress = Math.min(1, Math.max(0, time / 3.92))
  const waveEnvelope = animation === 'wave'
    ? phaseWindow(waveProgress, 0.06, 0.9) * motion
    : 0
  const boogieEnvelope = animation === 'boogie'
    ? phaseWindow(boogieProgress, 0.045, 0.94) * motion
    : 0
  const showcaseEnvelope = animation === 'showcase'
    ? phaseWindow(showcaseProgress, 0.035, 0.965) * motion
    : 0
  const waveBeat = Math.sin(waveProgress * Math.PI * 6.2) * waveEnvelope
  const waveAccent = Math.pow(Math.max(0, Math.sin(waveProgress * Math.PI * 3.1)), 0.7) * waveEnvelope
  const boogieBeat = Math.sin(boogieProgress * Math.PI * 6) * boogieEnvelope
  const boogieCounterBeat = Math.sin(boogieProgress * Math.PI * 6 + Math.PI / 2) * boogieEnvelope
  const boogieBounce = Math.pow(Math.abs(Math.sin(boogieProgress * Math.PI * 3)), 1.25) * boogieEnvelope
  const showcaseArc = Math.sin(showcaseProgress * Math.PI) * showcaseEnvelope
  const showcaseEase = smoothstep01(showcaseProgress)
  const showcaseVelocity = Math.sin(showcaseProgress * Math.PI * 2) * showcaseEnvelope
  const proudBeat = Math.pow(Math.max(0, Math.sin(showcaseProgress * Math.PI)), 0.72) * showcaseEnvelope

  return {
    waveEnvelope,
    waveBeat,
    waveAccent,
    boogieEnvelope,
    boogieBeat,
    boogieCounterBeat,
    boogieBounce,
    showcaseEnvelope,
    showcaseTurn: showcaseArc * Math.PI * 0.87,
    showcaseVelocity,
    proudBeat,
    bodyX: boogieBeat * 0.078 - waveEnvelope * 0.012,
    bodyLift: waveAccent * 0.018 + boogieBounce * 0.042 + proudBeat * 0.045,
    bodyRotateZ: boogieBeat * 0.105 - waveEnvelope * 0.04 + showcaseVelocity * 0.018,
    bodyRotateX: -waveAccent * 0.018 + boogieBounce * 0.012 - proudBeat * 0.018,
    bodyRotateY: boogieCounterBeat * 0.11,
    bodyScaleX: 1 + boogieBounce * 0.034 + waveAccent * 0.008,
    bodyScaleY: 1 - boogieBounce * 0.038 + proudBeat * 0.012,
    bodyScaleZ: 1 + boogieBounce * 0.012,
    faceGazeX: -waveEnvelope * 0.012 + boogieBeat * 0.006,
    faceGazeY: waveAccent * 0.008 + proudBeat * 0.006,
    facePerk: waveAccent * 0.06 + proudBeat * 0.045,
    mouthSmile: waveAccent * 0.09 + boogieBounce * 0.055 + proudBeat * 0.065,
    heldLift: boogieBounce * 0.018 + proudBeat * 0.012,
    freeHandDanceLift: boogieCounterBeat * 0.075,
    plantRotateX: -boogieBounce * 0.018 - proudBeat * 0.012,
    plantRotateY: boogieCounterBeat * 0.025 - showcaseVelocity * 0.055,
    plantRotateZ: -boogieBeat * 0.135 + waveBeat * 0.025 - showcaseVelocity * 0.045,
    plantStretch: boogieBounce * 0.026 + waveAccent * 0.012,
    companionLift: waveAccent * 0.012 + boogieBounce * 0.022 + proudBeat * 0.01,
    companionLean: waveBeat * 0.025 + boogieBeat * 0.055 - showcaseVelocity * 0.035,
    companionLook: waveEnvelope * 0.12 - boogieBeat * 0.035 + showcaseVelocity * 0.08,
    showcaseEase,
  }
}

function useAnimationActionTimer(animation: RedShellCritterAnimation) {
  const action = useRef<{
    animation: RedShellCritterAnimation
    startedAt: number | null
  }>({ animation, startedAt: null })

  return (time: number) => {
    if (action.current.startedAt === null || action.current.animation !== animation) {
      action.current.animation = animation
      action.current.startedAt = time
    }
    return animation === 'idle'
      ? time
      : Math.max(0, time - action.current.startedAt)
  }
}

function getHopMotion(time: number, amount: number) {
  const hopAmount = Math.min(1.35, Math.max(0, amount))
  const period = 1.36
  const phase = (time / period) % 1
  const prep = phasePulse(phase, 0.11, 0.12) * hopAmount
  const launch = phasePulse(phase, 0.24, 0.1) * hopAmount
  const land = phasePulse(phase, 0.76, 0.11) * hopAmount
  const recovery = phasePulse(phase, 0.88, 0.12) * hopAmount
  const airborne = phaseWindow(phase, 0.21, 0.77) * hopAmount
  const airT = Math.min(1, Math.max(0, (phase - 0.21) / 0.56))
  const arc = Math.pow(Math.sin(airT * Math.PI), 0.82) * airborne
  const tinyShake = (Math.sin(time * 20.5) * 0.004 + Math.sin(time * 29.5 + 0.4) * 0.002) * (land + recovery)

  return {
    phase,
    prep,
    launch,
    land,
    recovery,
    airborne,
    height: arc * 0.56 - prep * 0.044 - land * 0.03 + recovery * 0.018,
    x: Math.sin(phase * Math.PI * 2) * 0.014 * hopAmount + tinyShake,
    rotateZ: (Math.sin(phase * Math.PI * 2 + 0.35) * 0.035 + launch * 0.018 - land * 0.028) * hopAmount,
    rotateX: (-prep * 0.035 + launch * 0.052 - land * 0.045 + recovery * 0.02) * hopAmount,
    scaleX: 1 + prep * 0.07 - launch * 0.035 + land * 0.14 - recovery * 0.035,
    scaleY: 1 - prep * 0.105 + launch * 0.135 - land * 0.175 + recovery * 0.055,
    scaleZ: 1 + prep * 0.035 + launch * 0.045 + land * 0.05,
    shadowScale: 1 + prep * 0.12 + land * 0.28 - arc * 0.42 + recovery * 0.07,
    shadowOpacity: 0.18 + prep * 0.055 + land * 0.09 - arc * 0.1,
  }
}

function getHopExpressionMotion(time: number, amount: number) {
  const hop = getHopMotion(time, amount)
  const intensity = Math.min(1, Math.max(0, amount))
  const faceFocus = Math.min(1, hop.prep * 0.62 + hop.land * 0.5)
  const eyeWide = Math.min(1, hop.launch * 0.85 + hop.airborne * 0.34 + hop.recovery * 0.14)
  const blink = Math.min(0.88, hop.land * 0.72 + hop.prep * 0.22)
  const mouthOpen = Math.min(1, hop.launch * 0.42 + hop.airborne * 0.28 + hop.land * 0.18)
  const smile = Math.min(1, hop.airborne * 0.5 + hop.recovery * 0.3 + hop.launch * 0.2)
  const tinySettle = (Math.sin(time * 18.5) * 0.004 + Math.sin(time * 29.2 + 0.7) * 0.002) * (hop.land + hop.recovery)

  return {
    ...hop,
    faceFocus,
    eyeWide,
    blink,
    mouthOpen,
    smile,
    eyeLift: (hop.launch * 0.014 + hop.airborne * 0.01 - hop.land * 0.012 - hop.prep * 0.006) * intensity,
    pupilY: (hop.launch * 0.024 + hop.airborne * 0.016 - hop.land * 0.016 - hop.prep * 0.006) * intensity,
    pupilInward: (hop.prep * 0.01 + hop.land * 0.007 - hop.airborne * 0.003) * intensity,
    mouthY: (hop.launch * 0.008 + hop.airborne * 0.006 - hop.land * 0.014 - hop.prep * 0.006 + tinySettle) * intensity,
    cheekSquash: Math.min(1, hop.land * 0.9 + hop.prep * 0.35),
  }
}

function getWizardGrumbleMotion(time: number, amount: number) {
  const grumbleAmount = Math.min(1.35, Math.max(0, amount))
  const period = 2.55
  const phase = (time / period) % 1
  const firstMutter = phaseWindow(phase, 0.03, 0.35)
  const secondMutter = phaseWindow(phase, 0.62, 0.93)
  const talkWindow = Math.min(1, firstMutter + secondMutter) * grumbleAmount
  const syllable = Math.pow(Math.max(0, Math.sin(time * 16.8 + 0.24)), 0.72) * talkWindow
  const smallSyllable = Math.pow(Math.max(0, Math.sin(time * 25.6 + 1.1)), 1.35) * talkWindow
  const prep = phasePulse(phase, 0.42, 0.13) * grumbleAmount
  const hit = phasePulse(phase, 0.515, 0.052) * grumbleAmount
  const rebound = phasePulse(phase, 0.59, 0.08) * grumbleAmount
  const afterTap = phasePulse(phase, 0.76, 0.055) * grumbleAmount * 0.38
  const impact = Math.max(hit, afterTap)
  const chatter = (Math.sin(time * 18.2) * 0.006 + Math.sin(time * 29.4 + 0.7) * 0.0035) * talkWindow
  const annoyedLean = (Math.sin(time * 1.1 + 0.45) * 0.01 + Math.sin(time * 2.15) * 0.004) * grumbleAmount

  return {
    phase,
    talk: talkWindow,
    syllable,
    mouthOpen: Math.min(1, syllable * 0.85 + smallSyllable * 0.42 + hit * 0.22),
    prep,
    hit,
    rebound,
    afterTap,
    impact,
    chatter,
    brow: Math.min(1, talkWindow * 0.34 + prep * 0.24 + hit * 0.85),
    bodyLean: annoyedLean - prep * 0.018 + hit * 0.012 - afterTap * 0.006,
    bodyJolt: -hit * 0.034 + rebound * 0.018 - afterTap * 0.014,
    staffLift: prep * 0.125 - hit * 0.09 + rebound * 0.036 - afterTap * 0.04,
    staffTilt: -prep * 0.16 + hit * 0.21 - rebound * 0.08 + afterTap * 0.09,
  }
}

function createHeadPotBodyGeometry() {
  const points = [
    new THREE.Vector2(0.18, -0.19),
    new THREE.Vector2(0.3, -0.175),
    new THREE.Vector2(0.39, -0.085),
    new THREE.Vector2(0.4, 0.052),
    new THREE.Vector2(0.34, 0.145),
    new THREE.Vector2(0.25, 0.18),
  ]
  const geometry = new THREE.LatheGeometry(points, 16)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const band = y < -0.12 ? 0.92 : y > 0.09 ? 1.03 : 1
    const wobble = 1 + 0.022 * Math.sin(index * 1.91) + 0.014 * Math.cos(y * 18 + z * 5)
    position.setXYZ(index, x * band * wobble, y + 0.006 * Math.sin(x * 11 + z * 7), z * band * wobble)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function createHeadPotLipGeometry() {
  const points = [
    new THREE.Vector2(0.24, -0.034),
    new THREE.Vector2(0.36, -0.036),
    new THREE.Vector2(0.44, -0.012),
    new THREE.Vector2(0.46, 0.018),
    new THREE.Vector2(0.39, 0.048),
    new THREE.Vector2(0.25, 0.044),
    new THREE.Vector2(0.218, 0.025),
    new THREE.Vector2(0.218, -0.018),
    new THREE.Vector2(0.24, -0.034),
  ]
  const geometry = new THREE.LatheGeometry(points, 20)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const wobble = 1 + 0.016 * Math.sin(index * 2.23) + 0.01 * Math.cos(z * 8.5)
    position.setXYZ(index, x * wobble, y + 0.003 * Math.sin(x * 14 + z * 4), z * wobble)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function createHeadPotBaseBandGeometry() {
  const points = [
    new THREE.Vector2(0.19, -0.022),
    new THREE.Vector2(0.29, -0.028),
    new THREE.Vector2(0.34, -0.006),
    new THREE.Vector2(0.31, 0.02),
    new THREE.Vector2(0.2, 0.024),
  ]
  const geometry = new THREE.LatheGeometry(points, 16)
  geometry.computeVertexNormals()
  return geometry
}

function createOrganicGrassPlatformGeometry({
  radiusX,
  radiusZ,
  thickness,
  phase = 0,
  edgeSoftness = 0,
}: {
  radiusX: number
  radiusZ: number
  thickness: number
  phase?: number
  edgeSoftness?: number
}) {
  const segments = 54
  const raggedness = 1 - edgeSoftness * 0.78
  const vertices: number[] = [0, thickness * 0.38, 0, 0, -thickness * 0.22, 0]
  const indices: number[] = []

  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2
    const ripple = 1
      + Math.sin(angle * 3 + phase) * 0.045 * raggedness
      + Math.cos(angle * 5.3 - phase * 0.7) * 0.026 * raggedness
      + Math.sin(index * 1.77 + phase * 0.3) * 0.018 * raggedness
    const x = Math.cos(angle) * radiusX * ripple
    const z = Math.sin(angle) * radiusZ * (ripple + Math.sin(angle + phase) * 0.018 * raggedness)
    const crown = thickness * (0.31 + 0.05 * raggedness * Math.sin(angle * 2.2 + phase))
    const root = -thickness * (0.23 + 0.035 * raggedness * Math.cos(angle * 2.7 - phase))
    const undersideInset = 0.74 + Math.sin(angle * 4.1 + phase) * 0.035 * raggedness
    vertices.push(x, crown, z)
    vertices.push(x * undersideInset, root, z * undersideInset)
  }

  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments
    const top = 2 + index * 2
    const bottom = top + 1
    const nextTop = 2 + next * 2
    const nextBottom = nextTop + 1
    indices.push(0, nextTop, top)
    indices.push(1, bottom, nextBottom)
    indices.push(top, nextTop, bottom)
    indices.push(nextTop, nextBottom, bottom)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function CurvedTube({
  points,
  radius,
  color,
  outlineWidth = 0.006,
}: {
  points: [number, number, number][]
  radius: number
  color: string
  outlineWidth?: number
}) {
  const pointKey = points.map((point) => point.join(',')).join('|')
  const geometry = useMemo(() => {
    const curvePoints = pointKey.split('|').map((point) => {
      const [x, y, z] = point.split(',').map(Number)
      return new THREE.Vector3(x, y, z)
    })
    const curve = new THREE.CatmullRomCurve3(
      curvePoints,
      false,
      'centripetal',
      0.6,
    )
    return new THREE.TubeGeometry(curve, 12, radius, 7, false)
  }, [pointKey, radius])

  return (
    <CodedAssetOutlineMesh
      outlineWidth={outlineWidth}
      geometry={<primitive object={geometry} attach="geometry" />}
      material={toon(color)}
    />
  )
}

function AccessoryLeaf({
  position,
  rotation = 0,
  scale = [0.07, 0.1, 1],
  color = LEAF_MID,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: [number, number, number]
  color?: string
}) {
  const undersideColor = color === GRASS_DARK ? STEM_DARK : color

  return (
    <group position={position} rotation-z={rotation}>
      <CodedAssetOutlineMesh
        position={[-0.003, 0.032, 0]}
        rotation-z={-0.08}
        scale={[scale[0] * 0.74, scale[1] * 0.84, 0.03]}
        outlineWidth={0.006}
        geometry={<sphereGeometry args={[1, 9, 6]} />}
        material={toon(color)}
      />
      <CodedAssetOutlineMesh
        position={[0.01, -0.034, -0.004]}
        rotation-z={0.22}
        scale={[scale[0] * 0.56, scale[1] * 0.46, 0.022]}
        outlineWidth={0.004}
        geometry={<sphereGeometry args={[1, 8, 5]} />}
        material={toon(undersideColor)}
      />
      <mesh position={[0.004, 0.016, -0.046]} rotation-z={0.04} scale={[0.005, scale[1] * 0.5, 0.0035]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial color={STEM_DARK} />
      </mesh>
      <mesh position={[-0.018, 0.064, -0.05]} rotation-z={-0.3} scale={[scale[0] * 0.28, scale[1] * 0.08, 0.003]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial color={GRASS_LIGHT} />
      </mesh>
    </group>
  )
}

function createHibiscusCorollaConeGeometry(phase = 0) {
  const depthSegments = 12
  const radialSegments = 72
  const vertices: number[] = []
  const indices: number[] = []

  for (let depthIndex = 0; depthIndex <= depthSegments; depthIndex += 1) {
    const t = depthIndex / depthSegments
    const flare = Math.pow(t, 0.84)
    const z = 0.246 - flare * 0.43
    const baseRadius = 0.026 + flare * 0.314

    for (let radialIndex = 0; radialIndex <= radialSegments; radialIndex += 1) {
      const angle = (radialIndex / radialSegments) * Math.PI * 2
      const petalPhase = angle * 5 + phase
      const lobeAmount = Math.max(0, Math.cos(petalPhase))
      const valleyAmount = Math.max(0, -Math.cos(petalPhase))
      const petalLobe = 1 + lobeAmount * 0.31 * Math.pow(t, 1.18)
      const petalValley = 1 - valleyAmount * 0.22 * Math.pow(t, 1.34)
      const rimScallop = t > 0.66 ? Math.sin(angle * 10 + phase * 0.4) * 0.018 * Math.pow((t - 0.66) / 0.34, 1.15) : 0
      const radius = baseRadius * petalLobe * petalValley + rimScallop
      const rimCurl = t > 0.72 ? Math.pow((t - 0.72) / 0.28, 1.6) * (0.034 + lobeAmount * 0.038) : 0
      const petalPuff = lobeAmount * 0.04 * Math.pow(Math.sin(t * Math.PI), 0.72) * (0.35 + t * 0.65)
      const valleyTuck = valleyAmount * 0.02 * Math.pow(t, 1.16)
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius * 0.92 + Math.sin(petalPhase) * 0.008 * t
      vertices.push(x, y, z + petalPuff - valleyTuck - rimCurl)
    }
  }

  for (let depthIndex = 0; depthIndex < depthSegments; depthIndex += 1) {
    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const row = radialSegments + 1
      const base = depthIndex * row + radialIndex
      indices.push(base, base + 1, base + row)
      indices.push(base + 1, base + row + 1, base + row)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function JuicyPetalHighlight({
  position,
  rotation = 0,
  scale,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
}) {
  return (
    <mesh position={position} rotation-z={rotation} scale={scale}>
      <sphereGeometry args={[1, 8, 4]} />
      <meshBasicMaterial color={HIBISCUS_RED_JUICE} transparent opacity={0.48} depthWrite={false} />
    </mesh>
  )
}

function PotPaintStroke({
  position,
  rotation = 0,
  scale,
  color,
  opacity = 0.34,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color: string
  opacity?: number
}) {
  return (
    <mesh position={position} rotation-z={rotation} scale={scale}>
      <sphereGeometry args={[1, 8, 4]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

function PottedSoilSurface() {
  const soilClumps: {
    position: [number, number, number]
    scale: [number, number, number]
    color: string
    opacity?: number
  }[] = [
    { position: [-0.168, 0.199, -0.094], scale: [0.116, 0.02, 0.066], color: SOIL_LIGHT },
    { position: [-0.006, 0.203, -0.07], scale: [0.174, 0.026, 0.094], color: SOIL_MID },
    { position: [0.168, 0.199, -0.094], scale: [0.122, 0.02, 0.068], color: SOIL_DARK },
    { position: [-0.11, 0.208, -0.16], scale: [0.1, 0.016, 0.048], color: SOIL_DARK, opacity: 0.78 },
    { position: [0.112, 0.208, -0.158], scale: [0.106, 0.016, 0.05], color: SOIL_DUST, opacity: 0.76 },
    { position: [0.176, 0.209, -0.03], scale: [0.068, 0.014, 0.054], color: SOIL_DARK, opacity: 0.82 },
    { position: [-0.072, 0.198, 0.006], scale: [0.07, 0.014, 0.042], color: SOIL_DUST, opacity: 0.56 },
    { position: [0.086, 0.198, -0.002], scale: [0.064, 0.012, 0.04], color: SOIL_LIGHT, opacity: 0.56 },
  ]
  const soilPebbles: {
    position: [number, number, number]
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.155, 0.198, -0.052], scale: [0.01, 0.005, 0.006], color: SOIL_DUST, opacity: 0.7 },
    { position: [-0.07, 0.2, -0.132], scale: [0.008, 0.004, 0.006], color: SOIL_DARK, opacity: 0.54 },
    { position: [0.022, 0.202, 0.018], scale: [0.009, 0.004, 0.006], color: SOIL_DUST, opacity: 0.54 },
    { position: [0.128, 0.198, -0.06], scale: [0.011, 0.005, 0.007], color: SOIL_LIGHT, opacity: 0.62 },
    { position: [0.056, 0.202, -0.142], scale: [0.007, 0.004, 0.005], color: SOIL_DARK, opacity: 0.5 },
  ]

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0, 0.194, -0.056]}
        scale={[0.376, 0.018, 0.228]}
        outlineWidth={0.004}
        geometry={<cylinderGeometry args={[1, 1, 1, 24]} />}
        material={toon(SOIL_MID)}
      />
      <mesh position={[0.0, 0.21, -0.13]} rotation-z={0.02} scale={[0.334, 0.014, 0.104]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={SOIL_DARK} transparent opacity={0.88} depthWrite={false} />
      </mesh>
      <mesh position={[0.012, 0.211, -0.028]} rotation-z={0.03} scale={[0.328, 0.014, 0.092]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={SOIL_DARK} transparent opacity={0.82} depthWrite={false} />
      </mesh>
      <mesh position={[0.0, 0.208, -0.075]} rotation-z={-0.03} scale={[0.304, 0.012, 0.096]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={SOIL_LIGHT} transparent opacity={0.78} depthWrite={false} />
      </mesh>
      <mesh position={[0.016, 0.212, -0.088]} rotation-z={0.04} scale={[0.33, 0.012, 0.136]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={SOIL_DARK} transparent opacity={0.72} depthWrite={false} />
      </mesh>
      <mesh position={[-0.052, 0.202, -0.036]} rotation-z={-0.08} scale={[0.202, 0.008, 0.096]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={SOIL_DARK} transparent opacity={0.38} depthWrite={false} />
      </mesh>
      {soilClumps.map((clump, index) => (
        <mesh key={`pot-soil-clump-${index}`} position={clump.position} scale={clump.scale}>
          <sphereGeometry args={[1, 8, 5]} />
          <meshBasicMaterial color={clump.color} transparent={clump.opacity !== undefined} opacity={clump.opacity ?? 1} />
        </mesh>
      ))}
      <mesh position={[-0.062, 0.202, -0.048]} rotation-z={-0.24} scale={[0.035, 0.005, 0.014]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color={SOIL_DARK} transparent opacity={0.68} depthWrite={false} />
      </mesh>
      <mesh position={[0.072, 0.202, -0.044]} rotation-z={0.28} scale={[0.036, 0.005, 0.014]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color={SOIL_DARK} transparent opacity={0.62} depthWrite={false} />
      </mesh>
      {soilPebbles.map((pebble, index) => (
        <OrganicDetailDot
          key={`pot-soil-pebble-${index}`}
          position={pebble.position}
          scale={pebble.scale}
          color={pebble.color}
          opacity={pebble.opacity}
        />
      ))}
    </group>
  )
}

function OrganicDetailStroke({
  position,
  rotation = 0,
  scale,
  color = VAC_ASSET_DETAIL_INK,
  opacity = 0.48,
  depthTest = true,
  solid = false,
  renderOrder,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color?: string
  opacity?: number
  depthTest?: boolean
  solid?: boolean
  renderOrder?: number
}) {
  return (
    <mesh position={position} rotation-z={rotation} scale={scale} renderOrder={renderOrder}>
      <sphereGeometry args={[1, 7, 4]} />
      {solid ? (
        <meshToonMaterial color={color} gradientMap={getVacuumHeadToonRampTexture()} depthTest={depthTest} depthWrite={false} />
      ) : (
        <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={depthTest} depthWrite={false} />
      )}
    </mesh>
  )
}

function OrganicDetailDot({
  position,
  scale,
  color = VAC_ASSET_DETAIL_INK,
  opacity = 0.5,
  depthTest = true,
  solid = false,
  renderOrder,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  color?: string
  opacity?: number
  depthTest?: boolean
  solid?: boolean
  renderOrder?: number
}) {
  return (
    <mesh position={position} scale={scale} renderOrder={renderOrder}>
      <sphereGeometry args={[1, 6, 4]} />
      {solid ? (
        <meshToonMaterial color={color} gradientMap={getVacuumHeadToonRampTexture()} depthTest={depthTest} depthWrite={false} />
      ) : (
        <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={depthTest} depthWrite={false} />
      )}
    </mesh>
  )
}

type GlowbudAmanitaTopSpot = {
  x: number
  z: number
  r: number
}

type GlowbudAmanitaSpec = {
  position: [number, number, number]
  scale: number
  yaw: number
  lean: number
  pattern: number
  bend?: [number, number]
  capScale?: [number, number, number]
  capTilt?: number
  capPitch?: number
}

const AMANITA_CAP_TOP_SPOT_PATTERNS: GlowbudAmanitaTopSpot[][] = [
  [
    { x: -0.07, z: -0.02, r: 0.174 },
    { x: 0.26, z: 0.15, r: 0.108 },
    { x: -0.31, z: 0.23, r: 0.092 },
    { x: 0.14, z: -0.34, r: 0.086 },
    { x: -0.43, z: -0.19, r: 0.078 },
    { x: 0.46, z: -0.2, r: 0.066 },
    { x: -0.06, z: 0.45, r: 0.071 },
    { x: 0.32, z: 0.46, r: 0.054 },
    { x: -0.55, z: 0.06, r: 0.052 },
    { x: 0.54, z: 0.18, r: 0.044 },
  ],
  [
    { x: 0.07, z: -0.04, r: 0.138 },
    { x: -0.24, z: 0.15, r: 0.098 },
    { x: 0.32, z: 0.26, r: 0.077 },
    { x: -0.37, z: -0.2, r: 0.083 },
    { x: 0.18, z: -0.41, r: 0.074 },
    { x: -0.07, z: 0.41, r: 0.063 },
    { x: 0.49, z: -0.05, r: 0.056 },
    { x: -0.52, z: 0.31, r: 0.045 },
  ],
  [
    { x: -0.03, z: 0.06, r: 0.124 },
    { x: 0.3, z: -0.08, r: 0.086 },
    { x: -0.31, z: -0.24, r: 0.074 },
    { x: -0.2, z: 0.34, r: 0.069 },
    { x: 0.22, z: 0.33, r: 0.059 },
    { x: 0.04, z: -0.42, r: 0.055 },
    { x: 0.5, z: 0.17, r: 0.046 },
  ],
  [
    { x: 0.04, z: -0.02, r: 0.118 },
    { x: -0.28, z: 0.17, r: 0.079 },
    { x: 0.28, z: 0.3, r: 0.064 },
    { x: -0.34, z: -0.23, r: 0.06 },
    { x: 0.12, z: -0.38, r: 0.052 },
    { x: -0.04, z: 0.42, r: 0.045 },
  ],
]

const AMANITA_SHADER_SPOT_COUNT = 8

const AMANITA_CAP_VERTEX_SHADER = `
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vLocalPosition = position;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const AMANITA_CAP_FRAGMENT_SHADER = `
  precision mediump float;

  uniform vec3 uCapRed;
  uniform vec3 uCapDeep;
  uniform vec3 uCapOrange;
  uniform vec3 uCapLight;
  uniform vec3 uSpotCream;
  uniform vec3 uSpotWarm;
  uniform vec3 uInk;
  uniform vec4 uSpots[8];
  uniform int uSpotCount;
  uniform float uSpotAspectX;
  uniform float uSpotAspectZ;

  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  float saturate(float value) {
    return clamp(value, 0.0, 1.0);
  }

  float smooth01(float value) {
    float amount = saturate(value);
    return amount * amount * (3.0 - 2.0 * amount);
  }

  float spotDistance(vec4 spot) {
    vec2 difference = vec2(
      (vLocalPosition.x - spot.x) * uSpotAspectX,
      (vLocalPosition.z - spot.y) * uSpotAspectZ
    );
    return length(difference);
  }

  void main() {
    float x = vLocalPosition.x;
    float y = vLocalPosition.y;
    float z = vLocalPosition.z;
    float angle = atan(z, x);
    float radial = min(1.08, length(vec2(x, z)));
    float topness = smooth01((y + 0.22) / 0.78);
    float rimShade = smooth01((radial - 0.62) / 0.34);
    float underside = smooth01((-y - 0.03) / 0.24);
    float warmSide = max(0.0, cos(angle - 0.55)) * 0.15 * topness;
    float softHighlight = exp(-((x + 0.22) * (x + 0.22)) / 0.13 - ((z + 0.16) * (z + 0.16)) / 0.18) * 0.22;
    vec3 capColor = mix(uCapRed, uCapOrange, warmSide);
    capColor = mix(capColor, uCapLight, softHighlight);
    capColor = mix(capColor, uCapDeep, rimShade * 0.52 + underside * 0.42);

    float spotOutline = 0.0;
    float spotFill = 0.0;
    for (int index = 0; index < 8; index += 1) {
      if (index < uSpotCount) {
        float distanceToSpot = spotDistance(uSpots[index]);
        float radius = uSpots[index].z;
        float strength = uSpots[index].w;
        spotOutline = max(
          spotOutline,
          (1.0 - smoothstep(radius * 1.04, radius * 1.16, distanceToSpot)) * strength
        );
        spotFill = max(
          spotFill,
          (1.0 - smoothstep(radius * 0.84, radius * 0.96, distanceToSpot)) * strength
        );
      }
    }

    float spotFace = smooth01((y + 0.02) / 0.38) * (1.0 - underside) * (1.0 - rimShade * 0.62);
    float paintedOutline = spotOutline * spotFace;
    float paintedFill = spotFill * spotFace;
    capColor = mix(capColor, uInk, paintedOutline * 0.92);
    capColor = mix(capColor, uSpotWarm, paintedFill);
    capColor = mix(capColor, uSpotCream, paintedFill * 0.9);

    float light = dot(normalize(vViewNormal), normalize(vec3(-0.35, 0.76, 0.48))) * 0.5 + 0.5;
    float toonBand = 0.9 + step(0.46, light) * 0.08 + step(0.72, light) * 0.07;
    gl_FragColor = vec4(capColor * toonBand, 1.0);
  }
`

function createAmanitaCapSpotVectors(patternIndex: number) {
  const pattern = AMANITA_CAP_TOP_SPOT_PATTERNS[patternIndex % AMANITA_CAP_TOP_SPOT_PATTERNS.length]
  const vectors = pattern
    .slice(0, AMANITA_SHADER_SPOT_COUNT)
    .map((spot) => new THREE.Vector4(spot.x, spot.z, spot.r, 1))

  while (vectors.length < AMANITA_SHADER_SPOT_COUNT) {
    vectors.push(new THREE.Vector4(0, 0, 0, 0))
  }

  return vectors
}

function createAmanitaCapMaterial(patternIndex: number, spotAspectX: number, spotAspectZ: number) {
  const pattern = AMANITA_CAP_TOP_SPOT_PATTERNS[patternIndex % AMANITA_CAP_TOP_SPOT_PATTERNS.length]

  return new THREE.ShaderMaterial({
    uniforms: {
      uCapRed: { value: new THREE.Color(AMANITA_CAP_RED) },
      uCapDeep: { value: new THREE.Color(AMANITA_CAP_DEEP) },
      uCapOrange: { value: new THREE.Color(AMANITA_CAP_ORANGE) },
      uCapLight: { value: new THREE.Color(AMANITA_CAP_LIGHT) },
      uSpotCream: { value: new THREE.Color(AMANITA_SPOT_CREAM) },
      uSpotWarm: { value: new THREE.Color(AMANITA_SPOT_WARM) },
      uInk: { value: new THREE.Color(VAC_ASSET_INK) },
      uSpots: { value: createAmanitaCapSpotVectors(patternIndex) },
      uSpotCount: { value: Math.min(pattern.length, AMANITA_SHADER_SPOT_COUNT) },
      uSpotAspectX: { value: spotAspectX },
      uSpotAspectZ: { value: spotAspectZ },
    },
    vertexShader: AMANITA_CAP_VERTEX_SHADER,
    fragmentShader: AMANITA_CAP_FRAGMENT_SHADER,
    toneMapped: false,
  })
}

function createAmanitaCapGeometry(patternIndex = 0) {
  const geometry = new THREE.SphereGeometry(1, 46, 18, 0, Math.PI * 2, 0, Math.PI * 0.62)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const angle = Math.atan2(z, x)
    const radial = Math.min(1.08, Math.hypot(x, z))
    const rimShade = smoothstep01((radial - 0.62) / 0.34)
    const crown = Math.exp(-((x + 0.17) * (x + 0.17)) / 0.16 - ((z - 0.08) * (z - 0.08)) / 0.2)
    const oppositeCheek = Math.exp(-((x - 0.36) * (x - 0.36)) / 0.12 - ((z + 0.16) * (z + 0.16)) / 0.16)
    const wobble =
      1
      + Math.sin(angle * 3 + patternIndex * 0.7) * 0.034 * radial
      + Math.cos(angle * 5.5 - patternIndex) * 0.02 * radial
      + crown * 0.03
      - oppositeCheek * 0.018
    const buttonPuff = Math.exp(-radial * radial * 4.7) * 0.062
    const crookedCrownPuff = crown * 0.086
    const cheekSquash = oppositeCheek * 0.042
    const lipTuck = rimShade * 0.04
    const scallopedRim = rimShade * Math.sin(angle * 5.0 + patternIndex * 0.9) * 0.026
    const frontDroop = rimShade * Math.max(0, -z) * 0.034
    const sideSkew = (0.028 + crown * 0.022) * y

    position.setXYZ(
      index,
      x * wobble + sideSkew - rimShade * 0.018 * Math.sin(angle + 0.4),
      y + buttonPuff + crookedCrownPuff - cheekSquash - lipTuck + scallopedRim - frontDroop,
      z * (wobble + crown * 0.014) + crown * 0.018 - rimShade * 0.012 * Math.cos(angle * 2.0),
    )
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function AmanitaGillFan({
  radiusX,
  radiusZ,
  scale = 1,
}: {
  radiusX: number
  radiusZ: number
  scale?: number
}) {
  const ribs = [-0.64, -0.38, -0.14, 0.14, 0.38, 0.64]

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0, -0.018 * scale, 0]}
        scale={[radiusX * 0.8, 0.022 * scale, radiusZ * 0.68]}
        outlineWidth={0.0035}
        geometry={<sphereGeometry args={[1, 18, 6]} />}
        material={toon(AMANITA_GILL)}
      />
      {ribs.map((rib, index) => (
        <mesh
          key={`amanita-gill-rib-${index}`}
          position={[rib * radiusX * 0.38, -0.039 * scale, -0.006]}
          rotation-z={rib * 0.26}
          scale={[0.006 * scale, 0.006 * scale, radiusZ * 0.5]}
        >
          <sphereGeometry args={[1, 6, 4]} />
          <meshBasicMaterial color={AMANITA_GILL_SHADOW} transparent opacity={0.34} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function GlowbudAmanitaMushroom({ mushroom }: { mushroom: GlowbudAmanitaSpec }) {
  const capScale = mushroom.capScale ?? [1, 1, 1]
  const stemHeight = mushroom.scale * 0.255
  const stemRadius = mushroom.scale * 0.066
  const bendX = mushroom.bend?.[0] ?? Math.sin(mushroom.lean) * mushroom.scale * 0.055
  const bendZ = mushroom.bend?.[1] ?? Math.cos(mushroom.yaw) * mushroom.scale * 0.012
  const capCenter: [number, number, number] = [bendX, stemHeight + mushroom.scale * 0.038, bendZ]
  const capRadiusX = mushroom.scale * 0.32 * capScale[0]
  const capRadiusZ = mushroom.scale * 0.275 * capScale[2]
  const capHeight = mushroom.scale * 0.18 * capScale[1]
  const capTilt = mushroom.capTilt ?? mushroom.lean * 0.18
  const capPitch = mushroom.capPitch ?? -0.14
  const spotReferenceRadius = Math.min(capRadiusX, capRadiusZ)
  const capGeometry = useMemo(() => createAmanitaCapGeometry(mushroom.pattern), [mushroom.pattern])
  const capMaterial = useMemo(
    () =>
      createAmanitaCapMaterial(
        mushroom.pattern,
        capRadiusX / spotReferenceRadius,
        capRadiusZ / spotReferenceRadius,
      ),
    [capRadiusX, capRadiusZ, mushroom.pattern, spotReferenceRadius],
  )

  return (
    <group position={mushroom.position} rotation-y={mushroom.yaw}>
      <CurvedTube
        points={[
          [0, 0.006, 0],
          [bendX * 0.16, stemHeight * 0.32, bendZ * 0.16 + 0.006],
          [bendX * 0.62, stemHeight * 0.66, bendZ * 0.62 + 0.004],
          capCenter,
        ]}
        radius={stemRadius}
        color={AMANITA_STEM}
        outlineWidth={0.006}
      />
      <CodedAssetOutlineMesh
        position={[0, 0.04 * mushroom.scale, 0]}
        rotation-z={mushroom.lean * 0.18}
        scale={[stemRadius * 2.0, mushroom.scale * 0.056, stemRadius * 1.72]}
        outlineWidth={0.004}
        geometry={<sphereGeometry args={[1, 9, 5]} />}
        material={toon(AMANITA_ROOT)}
      />
      <mesh position={[bendX * 0.4, stemHeight * 0.48, bendZ * 0.32 - 0.022]} rotation-z={mushroom.lean * 0.34} scale={[stemRadius * 0.6, stemHeight * 0.28, stemRadius * 0.22]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color={AMANITA_STEM_LIGHT} transparent opacity={0.48} depthWrite={false} />
      </mesh>
      <CodedAssetOutlineMesh
        position={[bendX * 0.84, stemHeight + mushroom.scale * 0.008, bendZ * 0.74]}
        rotation-z={mushroom.lean * 0.22}
        scale={[stemRadius * 1.6, mushroom.scale * 0.026, stemRadius * 1.18]}
        outlineWidth={0.0028}
        geometry={<sphereGeometry args={[1, 9, 5]} />}
        material={toon(AMANITA_STEM_LIGHT)}
      />
      <group position={capCenter} rotation-x={capPitch} rotation-z={capTilt}>
        <AmanitaGillFan radiusX={capRadiusX} radiusZ={capRadiusZ} scale={mushroom.scale} />
        <CodedAssetOutlineMesh
          position={[-capRadiusX * 0.5, -capHeight * 0.02, -capRadiusZ * 0.54]}
          rotation-z={-0.18}
          scale={[capRadiusX * 0.23, capHeight * 0.11, capRadiusZ * 0.105]}
          outlineWidth={0.003}
          geometry={<sphereGeometry args={[1, 9, 5]} />}
          material={toon(AMANITA_CAP_RED)}
        />
        <CodedAssetOutlineMesh
          position={[capRadiusX * 0.46, -capHeight * 0.04, -capRadiusZ * 0.49]}
          rotation-z={0.16}
          scale={[capRadiusX * 0.2, capHeight * 0.1, capRadiusZ * 0.098]}
          outlineWidth={0.003}
          geometry={<sphereGeometry args={[1, 9, 5]} />}
          material={toon(AMANITA_CAP_ORANGE)}
        />
        <CodedAssetOutlineMesh
          position={[0, 0, 0]}
          scale={[capRadiusX, capHeight, capRadiusZ]}
          outlineWidth={0.007}
          geometry={<primitive object={capGeometry} attach="geometry" />}
          material={<primitive object={capMaterial} attach="material" />}
        />
        <mesh position={[-capRadiusX * 0.28, capHeight * 0.64, capRadiusZ * 0.08]} rotation-z={-0.32} scale={[capRadiusX * 0.24, capHeight * 0.06, capRadiusZ * 0.1]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={AMANITA_CAP_LIGHT} transparent opacity={0.34} depthWrite={false} />
        </mesh>
        <mesh position={[capRadiusX * 0.34, capHeight * 0.24, -capRadiusZ * 0.36]} rotation-z={0.18} scale={[capRadiusX * 0.18, capHeight * 0.042, capRadiusZ * 0.08]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={AMANITA_CAP_DEEP} transparent opacity={0.2} depthWrite={false} />
        </mesh>
        <mesh position={[-capRadiusX * 0.46, -capHeight * 0.1, -capRadiusZ * 0.34]} rotation-z={-0.18} scale={[capRadiusX * 0.17, capHeight * 0.052, capRadiusZ * 0.06]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={AMANITA_CAP_DEEP} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

function TinyAmanitaBaseSprout({
  position,
  scale = 1,
  lean = 0,
  yaw = 0,
  capColor = AMANITA_CAP_RED,
  capScale = [0.042, 0.02, 0.032],
}: {
  position: [number, number, number]
  scale?: number
  lean?: number
  yaw?: number
  capColor?: string
  capScale?: [number, number, number]
}) {
  const stemTopX = lean * 0.03
  const capY = 0.064

  return (
    <group position={position} scale={scale} rotation-y={yaw} rotation-z={lean * 0.08}>
      <mesh position={[0, 0.003, 0]} rotation-z={lean * 0.12} scale={[0.018, 0.005, 0.014]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={AMANITA_ROOT} />
      </mesh>
      <CurvedTube
        points={[
          [0, 0, 0],
          [stemTopX * 0.34, 0.022, 0.002],
          [stemTopX, 0.045, -0.002],
        ]}
        radius={0.006}
        color={AMANITA_STEM_LIGHT}
        outlineWidth={0.002}
      />
      <CodedAssetOutlineMesh
        position={[stemTopX, capY, -0.003]}
        rotation-z={lean * 0.22}
        scale={capScale}
        outlineWidth={0.0026}
        geometry={<sphereGeometry args={[1, 10, 5]} />}
        material={toon(capColor)}
      />
    </group>
  )
}

function AmanitaSoilNest() {
  return (
    <group>
      <mesh position={[0.002, 0.018, -0.016]} rotation-z={-0.03} scale={[0.18, 0.02, 0.06]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={SOIL_DARK} />
      </mesh>
      <mesh position={[-0.092, 0.036, 0.01]} rotation-z={-0.22} scale={[0.075, 0.014, 0.032]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={AMANITA_ROOT} />
      </mesh>
      <mesh position={[0.088, 0.032, 0.018]} rotation-z={0.24} scale={[0.07, 0.013, 0.03]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={AMANITA_STEM_SHADE} />
      </mesh>
      <mesh position={[0.006, 0.04, 0.05]} rotation-z={0.04} scale={[0.11, 0.012, 0.034]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={AMANITA_STEM_LIGHT} transparent opacity={0.74} depthWrite={false} />
      </mesh>
      <CurvedTube
        points={[
          [-0.15, 0.028, 0.018],
          [-0.1, 0.044, 0.052],
          [-0.024, 0.04, 0.06],
          [0.066, 0.05, 0.04],
          [0.142, 0.032, 0.01],
        ]}
        radius={0.0045}
        color={AMANITA_ROOT}
        outlineWidth={0.002}
      />
      <TinyAmanitaBaseSprout position={[-0.15, 0.118, -0.078]} scale={0.78} lean={-0.28} capColor={AMANITA_CAP_ORANGE} />
      <TinyAmanitaBaseSprout position={[-0.094, 0.112, -0.092]} scale={0.62} lean={0.18} yaw={0.22} />
      <TinyAmanitaBaseSprout position={[-0.202, 0.112, -0.054]} scale={0.68} lean={-0.18} yaw={-0.16} capColor={AMANITA_CAP_RED} />
      <TinyAmanitaBaseSprout position={[0.13, 0.112, -0.088]} scale={0.7} lean={0.24} yaw={-0.2} />
      <TinyAmanitaBaseSprout position={[0.188, 0.108, -0.048]} scale={0.56} lean={-0.12} yaw={0.28} capColor={AMANITA_CAP_ORANGE} />
      <TinyAmanitaBaseSprout position={[0.074, 0.084, 0.054]} scale={0.48} lean={-0.12} yaw={0.36} capColor={AMANITA_CAP_ORANGE} capScale={[0.038, 0.018, 0.028]} />
      <OrganicDetailDot position={[-0.12, 0.052, -0.018]} scale={[0.008, 0.004, 0.005]} color={AMANITA_STEM_LIGHT} opacity={0.82} />
      <OrganicDetailDot position={[0.124, 0.048, -0.02]} scale={[0.007, 0.0035, 0.004]} color={AMANITA_STEM_LIGHT} opacity={0.78} />
      <OrganicDetailDot position={[0.0, 0.052, 0.07]} scale={[0.006, 0.0035, 0.004]} color={SOIL_DUST} opacity={0.64} />
    </group>
  )
}

function HeadAmanitaMuscariaPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  const potGeometry = useMemo(() => createHeadPotBodyGeometry(), [])
  const potLipGeometry = useMemo(() => createHeadPotLipGeometry(), [])
  const potBaseBandGeometry = useMemo(() => createHeadPotBaseBandGeometry(), [])
  const mushroomCluster = useRef<THREE.Group>(null)
  const potGroup = useRef<THREE.Group>(null)
  const mushrooms: GlowbudAmanitaSpec[] = [
    {
      position: [0.0, 0.052, -0.018],
      scale: 0.92,
      yaw: 0.06,
      lean: -0.14,
      bend: [-0.026, 0.022],
      pattern: 0,
      capScale: [1.16, 0.82, 1.08],
      capTilt: -0.072,
      capPitch: -0.13,
    },
  ]
  const potClayFlecks: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.19, 0.052, -0.3], rotation: -0.28, scale: [0.018, 0.005, 0.003], color: POT_BLUE_DARK, opacity: 0.28 },
    { position: [0.16, 0.034, -0.298], rotation: 0.22, scale: [0.016, 0.005, 0.003], color: POT_BLUE_SHADOW, opacity: 0.3 },
    { position: [-0.032, -0.086, -0.284], rotation: -0.16, scale: [0.012, 0.004, 0.003], color: POT_CLAY_WASH, opacity: 0.34 },
    { position: [0.226, -0.056, -0.274], rotation: 0.48, scale: [0.014, 0.004, 0.003], color: POT_BLUE_SHADOW, opacity: 0.28 },
    { position: [-0.214, -0.052, -0.276], rotation: -0.36, scale: [0.014, 0.004, 0.003], color: POT_BLUE_LIGHT, opacity: 0.26 },
    { position: [0.04, 0.14, -0.304], rotation: -0.12, scale: [0.016, 0.005, 0.003], color: POT_MATTE_DUST, opacity: 0.26 },
  ]

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const puff = idlePulse(t, 5.6, 0.58, 0.07) * motion
    const sway = Math.sin(t * 1.18 + 0.5) * 0.024 * motion
    const tinyJiggle = Math.sin(t * 8.8) * 0.0035 * motion + Math.sin(t * 13.7 + 0.6) * 0.002 * motion

    if (mushroomCluster.current) {
      mushroomCluster.current.position.x = tinyJiggle * 0.36
      mushroomCluster.current.position.y = 0.106 + Math.sin(t * 1.28 + 0.2) * 0.006 * motion + puff * 0.014
      mushroomCluster.current.rotation.z = sway + puff * 0.014
      mushroomCluster.current.rotation.x = Math.sin(t * 1.04 + 1.0) * 0.016 * motion
      mushroomCluster.current.scale.set(1 + puff * 0.018, 1 + puff * 0.026, 1 + puff * 0.01)
    }
    if (potGroup.current) {
      potGroup.current.position.y = Math.sin(t * 1.12 + 0.9) * 0.004 * motion - puff * 0.003
      potGroup.current.rotation.z = -0.055 + Math.sin(t * 1.82) * 0.008 * motion - tinyJiggle * 0.3
    }
  })

  return (
    <group position={[0.02, 0.695, -0.205]} scale={0.9}>
      <mesh position={[0.012, -0.195, 0.05]} rotation-z={-0.08} scale={[0.34, 0.045, 0.082]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.26} depthWrite={false} />
      </mesh>
      {pot === 'gold-crown-pot' ? (
        <GoldCrownPotShell groupRef={potGroup} />
      ) : pot === 'purple-cube-pot' ? (
        <KitschPotShell groupRef={potGroup} />
      ) : pot === 'terracotta' ? (
        <TerracottaPotShell groupRef={potGroup} />
      ) : (
      <group ref={potGroup} rotation-z={-0.055}>
        <CodedAssetOutlineMesh
          position={[0, -0.008, 0]}
          scale={[0.92, 0.9, 0.72]}
          outlineWidth={0.018}
          geometry={<primitive object={potGeometry} attach="geometry" />}
          material={toon(POT_BLUE_MID)}
        />
        <CodedAssetOutlineMesh
          position={[0, 0.166, 0]}
          scale={[0.92, 1, 0.72]}
          outlineWidth={0.012}
          geometry={<primitive object={potLipGeometry} attach="geometry" />}
          material={toon(POT_BLUE_DARK)}
        />
        <PotPaintStroke position={[-0.135, 0.024, -0.288]} rotation={-0.28} scale={[0.112, 0.022, 0.006]} color={POT_BLUE_LIGHT} opacity={0.36} />
        <PotPaintStroke position={[0.082, 0.082, -0.292]} rotation={0.22} scale={[0.138, 0.022, 0.006]} color={POT_CLAY_WASH} opacity={0.3} />
        <PotPaintStroke position={[0.012, 0.148, -0.292]} rotation={-0.045} scale={[0.21, 0.018, 0.006]} color={POT_BLUE_SHADOW} opacity={0.34} />
        <PotPaintStroke position={[-0.05, -0.147, -0.258]} rotation={0.04} scale={[0.16, 0.016, 0.006]} color={POT_BLUE_SHADOW} opacity={0.34} />
        <PotPaintStroke position={[0.02, 0.184, -0.304]} rotation={-0.04} scale={[0.24, 0.012, 0.005]} color={POT_BLUE_LIGHT} opacity={0.24} />
        {potClayFlecks.map((fleck, index) => (
          <OrganicDetailStroke
            key={`amanita-pot-clay-fleck-${index}`}
            position={fleck.position}
            rotation={fleck.rotation}
            scale={fleck.scale}
            color={fleck.color}
            opacity={fleck.opacity}
          />
        ))}
        <mesh position={[0, 0.186, -0.056]} scale={[0.382, 0.018, 0.234]}>
          <cylinderGeometry args={[1, 1, 1, 18]} />
          <meshBasicMaterial color={SOIL_DARK} />
        </mesh>
        <PottedSoilSurface />
        <CodedAssetOutlineMesh
          position={[0, -0.19, 0]}
          scale={[0.92, 0.72, 0.72]}
          outlineWidth={0.008}
          geometry={<primitive object={potBaseBandGeometry} attach="geometry" />}
          material={toon(POT_BLUE_SHADOW)}
        />
      </group>
      )}
      <group ref={mushroomCluster} position={[0, 0.106, 0.01]}>
        <AmanitaSoilNest />
        {mushrooms.map((mushroom, index) => (
          <GlowbudAmanitaMushroom key={`glowbud-amanita-${index}`} mushroom={mushroom} />
        ))}
        <AccessoryLeaf position={[-0.226, 0.122, 0.018]} rotation={-1.18} scale={[0.052, 0.076, 1]} color={GRASS_DARK} />
        <AccessoryLeaf position={[0.222, 0.114, 0.03]} rotation={0.96} scale={[0.05, 0.074, 1]} color={LEAF_MID} />
        <AccessoryLeaf position={[0.008, 0.096, 0.096]} rotation={0.18} scale={[0.042, 0.06, 1]} color={GRASS_LIGHT} />
      </group>
    </group>
  )
}

function HibiscusFlower({
  position,
  scale = 1,
  rotation = 0,
  activity = 1,
}: {
  position: [number, number, number]
  scale?: number
  rotation?: number
  activity?: number
}) {
  const flowerGroup = useRef<THREE.Group>(null)
  const corollaGeometry = useMemo(() => createHibiscusCorollaConeGeometry(rotation), [rotation])
  const throatGuides: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
  }[] = [
    { position: [0, 0.066, 0.032], rotation: 0, scale: [0.01, 0.098, 0.006] },
    { position: [-0.055, 0.024, 0.03], rotation: 0.88, scale: [0.009, 0.08, 0.006] },
    { position: [0.055, 0.024, 0.03], rotation: -0.88, scale: [0.009, 0.08, 0.006] },
    { position: [-0.034, -0.048, 0.032], rotation: -0.54, scale: [0.008, 0.064, 0.005] },
    { position: [0.034, -0.048, 0.032], rotation: 0.54, scale: [0.008, 0.064, 0.005] },
  ]
  const petalPuffs: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [0, 0.188, -0.116], rotation: 0.08, scale: [0.086, 0.032, 0.012], color: HIBISCUS_RED_JUICE, opacity: 0.44 },
    { position: [-0.138, 0.086, -0.118], rotation: 0.72, scale: [0.094, 0.03, 0.012], color: HIBISCUS_RED_JUICE, opacity: 0.38 },
    { position: [0.142, 0.072, -0.12], rotation: -0.66, scale: [0.088, 0.03, 0.012], color: HIBISCUS_RED_JUICE, opacity: 0.38 },
    { position: [-0.092, -0.118, -0.106], rotation: -0.64, scale: [0.078, 0.026, 0.011], color: HIBISCUS_RED_LIGHT, opacity: 0.32 },
    { position: [0.098, -0.116, -0.108], rotation: 0.66, scale: [0.076, 0.026, 0.011], color: HIBISCUS_RED_LIGHT, opacity: 0.32 },
    { position: [-0.178, -0.006, -0.118], rotation: 1.08, scale: [0.064, 0.024, 0.011], color: HIBISCUS_RED_JUICE, opacity: 0.28 },
    { position: [0.184, -0.012, -0.118], rotation: -1.08, scale: [0.064, 0.024, 0.011], color: HIBISCUS_RED_JUICE, opacity: 0.28 },
    { position: [-0.018, 0.244, -0.184], rotation: 0.18, scale: [0.07, 0.018, 0.009], color: HIBISCUS_RED_LIGHT, opacity: 0.28 },
  ]
  const petalFoldShadows: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    opacity: number
  }[] = [
    { position: [0.002, 0.082, 0.096], rotation: 0.02, scale: [0.026, 0.088, 0.01], opacity: 0.46 },
    { position: [-0.066, 0.036, 0.092], rotation: 0.76, scale: [0.022, 0.076, 0.01], opacity: 0.4 },
    { position: [0.066, 0.036, 0.092], rotation: -0.76, scale: [0.022, 0.076, 0.01], opacity: 0.4 },
    { position: [-0.042, -0.058, 0.096], rotation: -0.56, scale: [0.02, 0.06, 0.009], opacity: 0.34 },
    { position: [0.044, -0.058, 0.096], rotation: 0.56, scale: [0.02, 0.06, 0.009], opacity: 0.34 },
  ]
  const petalFineVeins: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [0.002, 0.184, -0.128], rotation: 0.04, scale: [0.007, 0.08, 0.004], color: HIBISCUS_RED_DARK, opacity: 0.26 },
    { position: [-0.098, 0.112, -0.122], rotation: 0.72, scale: [0.006, 0.066, 0.004], color: HIBISCUS_RED_DARK, opacity: 0.2 },
    { position: [0.104, 0.104, -0.124], rotation: -0.72, scale: [0.006, 0.064, 0.004], color: HIBISCUS_RED_DARK, opacity: 0.2 },
    { position: [-0.136, -0.02, -0.106], rotation: 1.18, scale: [0.005, 0.052, 0.004], color: HIBISCUS_GUIDE_MAROON, opacity: 0.18 },
    { position: [0.14, -0.022, -0.106], rotation: -1.18, scale: [0.005, 0.052, 0.004], color: HIBISCUS_GUIDE_MAROON, opacity: 0.18 },
    { position: [-0.054, -0.13, -0.096], rotation: -0.5, scale: [0.005, 0.048, 0.004], color: HIBISCUS_RED_DARK, opacity: 0.17 },
    { position: [0.058, -0.128, -0.098], rotation: 0.52, scale: [0.005, 0.048, 0.004], color: HIBISCUS_RED_DARK, opacity: 0.17 },
  ]
  const petalRimNicks: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
  }[] = [
    { position: [-0.22, 0.05, -0.12], rotation: 0.82, scale: [0.005, 0.03, 0.004] },
    { position: [0.224, 0.06, -0.124], rotation: -0.86, scale: [0.005, 0.032, 0.004] },
    { position: [-0.028, 0.292, -0.19], rotation: 0.18, scale: [0.005, 0.034, 0.004] },
    { position: [0.08, -0.202, -0.078], rotation: 0.44, scale: [0.004, 0.026, 0.004] },
  ]
  const petalEdgeHighlights: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    opacity: number
  }[] = [
    { position: [-0.108, 0.186, -0.165], rotation: 0.5, scale: [0.052, 0.009, 0.005], opacity: 0.34 },
    { position: [0.116, 0.176, -0.168], rotation: -0.48, scale: [0.048, 0.009, 0.005], opacity: 0.32 },
    { position: [-0.18, -0.054, -0.108], rotation: 1.02, scale: [0.042, 0.008, 0.005], opacity: 0.28 },
    { position: [0.184, -0.05, -0.11], rotation: -1.02, scale: [0.042, 0.008, 0.005], opacity: 0.28 },
    { position: [0.01, -0.204, -0.07], rotation: -0.04, scale: [0.048, 0.008, 0.005], opacity: 0.24 },
  ]
  const throatPollenDust: {
    position: [number, number, number]
    scale: [number, number, number]
    opacity: number
  }[] = [
    { position: [-0.034, 0.004, 0.258], scale: [0.008, 0.007, 0.005], opacity: 0.5 },
    { position: [0.026, -0.036, 0.264], scale: [0.007, 0.006, 0.005], opacity: 0.44 },
    { position: [0.042, 0.018, 0.252], scale: [0.006, 0.006, 0.004], opacity: 0.4 },
  ]
  const anthers: {
    position: [number, number, number]
    scale: [number, number, number]
    rotation: number
  }[] = [
    { position: [0.004, 0.064, 0.102], scale: [0.014, 0.01, 0.009], rotation: -0.28 },
    { position: [0.006, 0.11, 0.034], scale: [0.017, 0.011, 0.009], rotation: 0.3 },
    { position: [0.006, 0.158, -0.046], scale: [0.017, 0.011, 0.009], rotation: -0.22 },
    { position: [0.008, 0.208, -0.134], scale: [0.018, 0.012, 0.01], rotation: 0.36 },
    { position: [0.008, 0.258, -0.222], scale: [0.019, 0.014, 0.011], rotation: -0.16 },
    { position: [-0.018, 0.294, -0.27], scale: [0.017, 0.016, 0.012], rotation: 0.38 },
    { position: [0.024, 0.302, -0.286], scale: [0.018, 0.016, 0.012], rotation: -0.34 },
    { position: [0.002, 0.33, -0.306], scale: [0.023, 0.02, 0.014], rotation: 0.04 },
  ]

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const bloomBreath = Math.sin(t * 1.32 + rotation * 1.7) * 0.014 * motion
    const idleShake = Math.sin(t * 7.2 + rotation) * 0.006 * motion
    const tinyExcitedFlutter = idlePulse(t + rotation * 0.7, 6.2, 0.72, 0.045) * motion

    if (flowerGroup.current) {
      flowerGroup.current.position.set(position[0] + idleShake * 0.34, position[1] + bloomBreath * 0.35, position[2])
      flowerGroup.current.rotation.z = rotation + Math.sin(t * 1.1 + rotation) * 0.022 * motion + idleShake
      flowerGroup.current.rotation.x = Math.sin(t * 1.42 + rotation * 2.1) * 0.032 * motion + tinyExcitedFlutter * 0.05
      flowerGroup.current.scale.setScalar(scale * (1 + bloomBreath + tinyExcitedFlutter * 0.026))
    }
  })

  return (
    <group ref={flowerGroup} position={position} rotation-z={rotation} scale={scale}>
      <mesh
        position={[0, 0, -0.016]}
        scale={[1.02, 1.02, 1]}
        geometry={corollaGeometry}
      >
        {toonDoubleSided(HIBISCUS_RED_LIGHT)}
      </mesh>
      <JuicyPetalHighlight position={[-0.082, 0.102, -0.118]} rotation={0.42} scale={[0.075, 0.02, 0.007]} />
      <mesh position={[0.11, 0.016, -0.112]} rotation-z={-0.34} scale={[0.066, 0.018, 0.007]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={HIBISCUS_RED} transparent opacity={0.34} depthWrite={false} />
      </mesh>
      {petalPuffs.map((puff, index) => (
        <mesh
          key={`hibiscus-petal-puff-${index}`}
          position={puff.position}
          rotation-z={puff.rotation}
          scale={puff.scale}
        >
          <sphereGeometry args={[1, 9, 5]} />
          <meshBasicMaterial color={puff.color} transparent opacity={puff.opacity} depthWrite={false} />
        </mesh>
      ))}
      {petalFineVeins.map((vein, index) => (
        <OrganicDetailStroke
          key={`hibiscus-fine-vein-${index}`}
          position={vein.position}
          rotation={vein.rotation}
          scale={vein.scale}
          color={vein.color}
          opacity={vein.opacity}
        />
      ))}
      {petalRimNicks.map((nick, index) => (
        <OrganicDetailStroke
          key={`hibiscus-rim-nick-${index}`}
          position={nick.position}
          rotation={nick.rotation}
          scale={nick.scale}
          color={HIBISCUS_RED_JUICE}
          opacity={0.28}
        />
      ))}
      {petalEdgeHighlights.map((highlight, index) => (
        <OrganicDetailStroke
          key={`hibiscus-edge-highlight-${index}`}
          position={highlight.position}
          rotation={highlight.rotation}
          scale={highlight.scale}
          color={STAMEN_YELLOW_LIGHT}
          opacity={highlight.opacity}
        />
      ))}
      <mesh position={[0.006, -0.018, 0.112]} rotation-z={-0.12} scale={[0.174, 0.132, 0.024]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={HIBISCUS_RED_DARK} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh position={[0.002, -0.016, 0.126]} rotation-z={0.02} scale={[0.208, 0.152, 0.026]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={HIBISCUS_THROAT_DARK} transparent opacity={0.34} depthWrite={false} />
      </mesh>
      <mesh position={[0.002, -0.018, 0.144]} rotation-z={0.04} scale={[0.136, 0.11, 0.024]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={HIBISCUS_THROAT_DARK} transparent opacity={0.52} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.014, 0.162]} scale={[0.108, 0.088, 0.018]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={HIBISCUS_THROAT_BROWN} />
      </mesh>
      {petalFoldShadows.map((shadow, index) => (
        <mesh
          key={`hibiscus-fold-shadow-${index}`}
          position={shadow.position}
          rotation-z={shadow.rotation}
          scale={shadow.scale}
        >
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={HIBISCUS_THROAT_DARK} transparent opacity={shadow.opacity} depthWrite={false} />
        </mesh>
      ))}
      {throatGuides.map((guide, index) => (
        <mesh
          key={`hibiscus-throat-guide-${index}`}
          position={guide.position}
          rotation-z={guide.rotation}
          scale={guide.scale}
        >
          <sphereGeometry args={[1, 7, 4]} />
          <meshBasicMaterial color={HIBISCUS_GUIDE_MAROON} />
        </mesh>
      ))}
      <mesh position={[0, -0.014, 0.194]} scale={[0.082, 0.068, 0.018]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={HIBISCUS_RED_DARK} />
      </mesh>
      <mesh position={[0, -0.017, 0.222]} scale={[0.058, 0.048, 0.014]}>
        <sphereGeometry args={[1, 9, 5]} />
        <meshBasicMaterial color={HIBISCUS_THROAT_BROWN} />
      </mesh>
      <mesh position={[0.006, -0.018, 0.242]} scale={[0.034, 0.03, 0.01]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={HIBISCUS_THROAT_DARK} />
      </mesh>
      <mesh position={[-0.026, 0.026, 0.248]} rotation-z={0.54} scale={[0.036, 0.009, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color="#120306" transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <mesh position={[0.032, -0.036, 0.248]} rotation-z={-0.42} scale={[0.032, 0.008, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color="#120306" transparent opacity={0.38} depthWrite={false} />
      </mesh>
      <mesh position={[0.012, -0.058, 0.246]} rotation-z={0.12} scale={[0.038, 0.034, 0.011]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={HIBISCUS_THROAT_DARK} />
      </mesh>
      {throatPollenDust.map((dust, index) => (
        <OrganicDetailDot
          key={`hibiscus-throat-pollen-${index}`}
          position={dust.position}
          scale={dust.scale}
          color={STAMEN_YELLOW_LIGHT}
          opacity={dust.opacity}
        />
      ))}
      <CurvedTube
        points={[
          [0.006, -0.018, 0.242],
          [0.006, 0.07, 0.102],
          [0.008, 0.19, -0.102],
          [0.004, 0.33, -0.306],
        ]}
        radius={0.01}
        color={STAMEN_YELLOW}
        outlineWidth={0.004}
      />
      {anthers.map((anther, index) => (
        <CodedAssetOutlineMesh
          key={`hibiscus-stamen-${index}`}
          position={anther.position}
          rotation-z={anther.rotation}
          scale={anther.scale}
          outlineWidth={0.003}
          geometry={<sphereGeometry args={[1, 7, 5]} />}
          material={toon(STAMEN_YELLOW)}
        />
      ))}
      <mesh position={[0.002, 0.212, -0.146]} rotation-z={-0.08} scale={[0.052, 0.014, 0.006]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color={STAMEN_YELLOW_LIGHT} />
      </mesh>
    </group>
  )
}

function HeadHibiscusPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  const potGeometry = useMemo(() => createHeadPotBodyGeometry(), [])
  const potLipGeometry = useMemo(() => createHeadPotLipGeometry(), [])
  const potBaseBandGeometry = useMemo(() => createHeadPotBaseBandGeometry(), [])
  const flowerCluster = useRef<THREE.Group>(null)
  const potGroup = useRef<THREE.Group>(null)
  const potClayFlecks: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.215, 0.062, -0.301], rotation: -0.4, scale: [0.018, 0.005, 0.003], color: POT_BLUE_DARK, opacity: 0.28 },
    { position: [-0.156, -0.024, -0.302], rotation: 0.2, scale: [0.012, 0.004, 0.003], color: POT_BLUE_SHADOW, opacity: 0.32 },
    { position: [0.184, 0.026, -0.3], rotation: -0.12, scale: [0.016, 0.005, 0.003], color: POT_BLUE_DARK, opacity: 0.24 },
    { position: [0.038, -0.06, -0.303], rotation: 0.32, scale: [0.01, 0.004, 0.003], color: POT_CLAY_WASH, opacity: 0.34 },
    { position: [-0.004, 0.112, -0.303], rotation: -0.2, scale: [0.012, 0.004, 0.003], color: POT_BLUE_LIGHT, opacity: 0.3 },
    { position: [0.222, -0.074, -0.294], rotation: 0.48, scale: [0.014, 0.004, 0.003], color: POT_BLUE_SHADOW, opacity: 0.28 },
    { position: [-0.242, 0.012, -0.286], rotation: -0.16, scale: [0.012, 0.004, 0.003], color: POT_CLAY_WASH, opacity: 0.26 },
    { position: [0.246, 0.088, -0.28], rotation: 0.18, scale: [0.011, 0.004, 0.003], color: POT_BLUE_LIGHT, opacity: 0.24 },
    { position: [0.004, -0.128, -0.276], rotation: -0.1, scale: [0.013, 0.004, 0.003], color: POT_BLUE_DARK, opacity: 0.24 },
  ]

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const happySnug = idlePulse(t, 6.2, 0.71, 0.055) * motion
    const jitter = Math.sin(t * 9.2) * 0.004 * motion + Math.sin(t * 14.8 + 0.6) * 0.0025 * motion
    if (flowerCluster.current) {
      flowerCluster.current.position.x = jitter * 0.48
      flowerCluster.current.position.y = 0.125 + Math.sin(t * 1.45 + 0.3) * 0.008 * motion + happySnug * 0.018
      flowerCluster.current.rotation.z = Math.sin(t * 1.7) * 0.034 * motion - happySnug * 0.024 + jitter
      flowerCluster.current.rotation.x = Math.sin(t * 1.2 + 0.6) * 0.018 * motion + happySnug * 0.038
      flowerCluster.current.scale.set(1 + happySnug * 0.018, 1 + happySnug * 0.028, 1)
    }
    if (potGroup.current) {
      potGroup.current.position.x = -jitter * 0.18
      potGroup.current.position.y = Math.sin(t * 1.24 + 1.2) * 0.006 * motion - happySnug * 0.006
      potGroup.current.rotation.z = -0.055 + Math.sin(t * 2.05) * 0.01 * motion + happySnug * 0.018 - jitter * 0.6
      potGroup.current.scale.set(1 + happySnug * 0.012, 1 - happySnug * 0.008, 1)
    }
  })

  return (
    <group position={[0.02, 0.695, -0.205]} scale={0.9}>
      <mesh position={[0.012, -0.195, 0.05]} rotation-z={-0.08} scale={[0.34, 0.045, 0.082]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.26} depthWrite={false} />
      </mesh>
      {pot === 'gold-crown-pot' ? (
        <GoldCrownPotShell groupRef={potGroup} />
      ) : pot === 'purple-cube-pot' ? (
        <KitschPotShell groupRef={potGroup} />
      ) : pot === 'terracotta' ? (
        <TerracottaPotShell groupRef={potGroup} />
      ) : (
      <group ref={potGroup} rotation-z={-0.055}>
        <CodedAssetOutlineMesh
          position={[0, -0.008, 0]}
          scale={[0.92, 0.9, 0.72]}
          outlineWidth={0.018}
          geometry={<primitive object={potGeometry} attach="geometry" />}
          material={toon(POT_BLUE_MID)}
        />
        <CodedAssetOutlineMesh
          position={[0, 0.166, 0]}
          scale={[0.92, 1, 0.72]}
          outlineWidth={0.012}
          geometry={<primitive object={potLipGeometry} attach="geometry" />}
          material={toon(POT_BLUE_DARK)}
        />
        <PotPaintStroke
          position={[-0.135, 0.024, -0.288]}
          rotation={-0.28}
          scale={[0.112, 0.022, 0.006]}
          color={POT_BLUE_LIGHT}
          opacity={0.36}
        />
        <PotPaintStroke
          position={[0.082, 0.082, -0.292]}
          rotation={0.22}
          scale={[0.138, 0.022, 0.006]}
          color={POT_CLAY_WASH}
          opacity={0.3}
        />
        <PotPaintStroke
          position={[0.012, 0.148, -0.292]}
          rotation={-0.045}
          scale={[0.21, 0.018, 0.006]}
          color={POT_BLUE_SHADOW}
          opacity={0.34}
        />
        <PotPaintStroke
          position={[-0.096, 0.158, -0.298]}
          rotation={-0.24}
          scale={[0.052, 0.01, 0.004]}
          color={POT_BLUE_DARK}
          opacity={0.3}
        />
        <PotPaintStroke
          position={[0.102, 0.154, -0.298]}
          rotation={0.18}
          scale={[0.048, 0.009, 0.004]}
          color={POT_BLUE_DARK}
          opacity={0.28}
        />
        <PotPaintStroke
          position={[0.116, -0.098, -0.266]}
          rotation={0.18}
          scale={[0.098, 0.018, 0.006]}
          color={POT_BLUE_SHADOW}
          opacity={0.3}
        />
        <PotPaintStroke
          position={[-0.044, -0.15, -0.258]}
          rotation={0.04}
          scale={[0.16, 0.016, 0.006]}
          color={POT_BLUE_SHADOW}
          opacity={0.34}
        />
        <PotPaintStroke
          position={[-0.126, 0.062, -0.304]}
          rotation={-0.2}
          scale={[0.17, 0.015, 0.005]}
          color={POT_MATTE_DUST}
          opacity={0.26}
        />
        <PotPaintStroke
          position={[0.142, -0.026, -0.286]}
          rotation={0.28}
          scale={[0.13, 0.013, 0.005]}
          color={POT_MATTE_DUST}
          opacity={0.18}
        />
        <PotPaintStroke
          position={[0.018, 0.184, -0.304]}
          rotation={-0.04}
          scale={[0.24, 0.012, 0.005]}
          color={POT_BLUE_LIGHT}
          opacity={0.24}
        />
        <PotPaintStroke
          position={[-0.176, -0.08, -0.268]}
          rotation={-0.4}
          scale={[0.052, 0.012, 0.004]}
          color={POT_BLUE_LIGHT}
          opacity={0.26}
        />
        {potClayFlecks.map((fleck, index) => (
          <OrganicDetailStroke
            key={`pot-clay-fleck-${index}`}
            position={fleck.position}
            rotation={fleck.rotation}
            scale={fleck.scale}
            color={fleck.color}
            opacity={fleck.opacity}
          />
        ))}
        <mesh position={[0, 0.186, -0.056]} scale={[0.382, 0.018, 0.234]}>
          <cylinderGeometry args={[1, 1, 1, 18]} />
          <meshBasicMaterial color={SOIL_DARK} />
        </mesh>
        <PottedSoilSurface />
        <CodedAssetOutlineMesh
          position={[0, -0.19, 0]}
          scale={[0.92, 0.72, 0.72]}
          outlineWidth={0.008}
          geometry={<primitive object={potBaseBandGeometry} attach="geometry" />}
          material={toon(POT_BLUE_SHADOW)}
        />
      </group>
      )}
      <group ref={flowerCluster} position={[0, 0.125, 0.01]}>
        <mesh position={[0.002, 0.018, -0.016]} rotation-z={-0.03} scale={[0.13, 0.018, 0.046]}>
          <sphereGeometry args={[1, 10, 5]} />
          <meshBasicMaterial color={SOIL_DARK} />
        </mesh>
        <mesh position={[-0.04, 0.028, -0.02]} rotation-z={-0.2} scale={[0.052, 0.01, 0.02]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={SOIL_LIGHT} />
        </mesh>
        <mesh position={[0.058, 0.026, -0.024]} rotation-z={0.24} scale={[0.044, 0.009, 0.018]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={SOIL_MID} />
        </mesh>
        <OrganicDetailDot position={[-0.078, 0.032, -0.026]} scale={[0.007, 0.0035, 0.004]} color={SOIL_DUST} opacity={0.64} />
        <OrganicDetailDot position={[0.082, 0.03, -0.028]} scale={[0.006, 0.0035, 0.004]} color={SOIL_DUST} opacity={0.56} />
        <CurvedTube
          points={[
            [-0.06, 0.05, 0.005],
            [-0.128, 0.225, 0.028],
            [-0.268, 0.36, 0.018],
          ]}
          radius={0.013}
          color={HIBISCUS_THROAT_DARK}
          outlineWidth={0.006}
        />
        <CurvedTube
          points={[
            [0.068, 0.042, -0.002],
            [0.154, 0.212, 0.03],
            [0.296, 0.345, 0.018],
          ]}
          radius={0.013}
          color={HIBISCUS_THROAT_DARK}
          outlineWidth={0.006}
        />
        <AccessoryLeaf position={[-0.2, 0.178, 0.028]} rotation={-1.08} scale={[0.078, 0.108, 1]} color={LEAF_MID} />
        <AccessoryLeaf position={[-0.035, 0.214, 0.026]} rotation={0.46} scale={[0.056, 0.086, 1]} color={GRASS_LIGHT} />
        <AccessoryLeaf position={[0.168, 0.168, 0.03]} rotation={0.9} scale={[0.074, 0.104, 1]} color={LEAF_MID} />
        <AccessoryLeaf position={[0.248, 0.224, 0.038]} rotation={-0.4} scale={[0.052, 0.08, 1]} color={GRASS_DARK} />
        <AccessoryLeaf position={[0.07, 0.13, 0.032]} rotation={-0.74} scale={[0.05, 0.074, 1]} color={GRASS_DARK} />
        <HibiscusFlower position={[-0.405, 0.59, -0.02]} rotation={-0.2} scale={1.32} activity={activity} />
        <HibiscusFlower position={[0.425, 0.56, 0]} rotation={0.22} scale={1.24} activity={activity} />
        <CodedAssetOutlineMesh
          position={[0.038, 0.248, 0.034]}
          rotation-z={0.42}
          scale={[0.045, 0.052, 0.032]}
          outlineWidth={0.006}
          geometry={<sphereGeometry args={[1, 8, 5]} />}
          material={toon(GRASS_LIGHT)}
        />
      </group>
    </group>
  )
}

function SunflowerPetal({
  angle,
  radius,
  length,
  width,
  color,
  layerZ,
  curl = 0,
  bend = 0,
  bank = 0,
  tipZ = 0,
  placementPolish = 0,
  index,
}: {
  angle: number
  radius: number
  length: number
  width: number
  color: string
  layerZ: number
  curl?: number
  bend?: number
  bank?: number
  tipZ?: number
  placementPolish?: number
  index: number
}) {
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  const polished = Math.max(0, Math.min(1, placementPolish))
  const organicJitter = 1 - polished * 0.82
  const twist = Math.sin(index * 1.73) * 0.06 * organicJitter + curl
  const highlightSide = index % 2 === 0 ? -1 : 1
  const cleanBend = Math.max(-0.5, Math.min(0.5, bend))
  const cleanBank = Math.max(-0.44, Math.min(0.44, bank))
  const detailZ = tipZ * 0.42 + 0.04

  return (
    <group position={[x, y, layerZ]} rotation={[cleanBend * 0.42, cleanBank * 0.48, angle - Math.PI / 2 + twist]}>
      <CodedAssetOutlineMesh
        position={[0, length * 0.31, tipZ * 0.28]}
        rotation={[cleanBend * 0.16, cleanBank * 0.22, Math.sin(index * 0.91) * 0.035 * organicJitter]}
        scale={[width * 1.12, length * 0.66, 0.062]}
        outlineWidth={0.0048}
        outlineColor={VAC_ASSET_INK}
        geometry={<sphereGeometry args={[1, 14, 8]} />}
        material={toon(color)}
      />
      <CodedAssetOutlineMesh
        position={[0, length * 0.64, tipZ * 0.32 + 0.006]}
        rotation={[cleanBend * 0.2, cleanBank * 0.24, Math.sin(index * 1.11) * 0.05 * organicJitter]}
        scale={[width * 0.82, length * 0.31, 0.052]}
        outlineWidth={0.0032}
        outlineColor={VAC_ASSET_INK}
        geometry={<sphereGeometry args={[1, 12, 7]} />}
        material={toon(index % 2 === 0 ? color : SUNFLOWER_PETAL_LIGHT)}
      />
      <CodedAssetOutlineMesh
        position={[0, length * 0.04, tipZ * 0.18 - 0.006]}
        rotation={[cleanBend * 0.12, cleanBank * 0.14, Math.sin(index * 0.57) * 0.04 * organicJitter]}
        scale={[width * 0.64, length * 0.18, 0.044]}
        outlineWidth={0.0028}
        outlineColor={VAC_ASSET_INK}
        geometry={<sphereGeometry args={[1, 10, 6]} />}
        material={toon(index % 3 === 0 ? SUNFLOWER_PETAL_MID : color)}
      />
      <OrganicDetailStroke
        position={[highlightSide * width * 0.16, length * 0.4, detailZ + 0.006]}
        rotation={highlightSide * -0.1}
        scale={[width * 0.046, length * 0.28, 0.0028]}
        color={SUNFLOWER_PETAL_LIGHT}
        opacity={0.28}
        depthTest
      />
      <OrganicDetailStroke
        position={[0, length * 0.3, detailZ]}
        rotation={Math.sin(index * 1.27) * 0.04 * organicJitter}
        scale={[width * 0.034, length * 0.32, 0.0028]}
        color={index % 2 === 0 ? SUNFLOWER_PETAL_DEEP : SUNFLOWER_PETAL_LIGHT}
        opacity={index % 2 === 0 ? 0.11 : 0.18}
        depthTest
      />
      <OrganicDetailStroke
        position={[-highlightSide * width * 0.22, length * 0.12, detailZ - 0.004]}
        rotation={highlightSide * 0.18}
        scale={[width * 0.026, length * 0.16, 0.0024]}
        color={SUNFLOWER_PETAL_LIGHT}
        opacity={0.14}
        depthTest
      />
    </group>
  )
}

function SunflowerStemFuzz() {
  const stemCenterAt = (progress: number): [number, number, number] => [
    -0.012 + progress * 0.076 + Math.sin(progress * Math.PI * 1.8 - 0.3) * 0.01,
    0.14 + progress * 1.02,
    0.02 - progress * 0.042 + Math.sin(progress * Math.PI * 2.2) * 0.004,
  ]

  const hairs = Array.from({ length: 96 }, (_, index) => {
    const progress = (index + 0.5) / 96
    const angle = index * 2.399963 + Math.sin(index * 0.41) * 0.22
    const center = stemCenterAt(progress)
    const surfaceX = Math.cos(angle) * (0.058 + Math.sin(index * 0.77) * 0.005)
    const surfaceZ = Math.sin(angle) * (0.062 + Math.cos(index * 0.61) * 0.005)
    const push = 0.024 + (index % 5) * 0.0035
    const root = [
      center[0] + surfaceX,
      center[1],
      center[2] + surfaceZ,
    ] as [number, number, number]
    const tip = [
      root[0] + Math.cos(angle) * push + Math.sin(index * 0.86) * 0.004,
      root[1] + 0.01 + Math.sin(index * 0.91) * 0.014,
      root[2] + Math.sin(angle) * push,
    ] as [number, number, number]

    return {
      points: [root, tip] as [number, number, number][],
      radius: 0.0024 + (index % 3) * 0.00042,
      color: index % 5 === 0 ? SUNFLOWER_STEM_LIGHT : index % 5 === 1 ? SUNFLOWER_STEM_DARK : SUNFLOWER_STEM_MID,
    }
  })

  const fuzzDots = Array.from({ length: 58 }, (_, index) => {
    const progress = (index + 0.5) / 58
    const angle = index * 2.399963 + 1.1
    const center = stemCenterAt(progress)
    return {
      position: [
        center[0] + Math.cos(angle) * (0.057 + Math.sin(index * 0.47) * 0.005),
        center[1] + Math.sin(index * 0.93) * 0.004,
        center[2] + Math.sin(angle) * (0.063 + Math.cos(index * 0.53) * 0.005),
      ] as [number, number, number],
      scale: [
        0.0068 + (index % 4) * 0.0012,
        0.0046 + (index % 3) * 0.0009,
        0.004,
      ] as [number, number, number],
      color: index % 4 === 0 ? SUNFLOWER_STEM_LIGHT : index % 4 === 1 ? SUNFLOWER_STEM_DARK : SUNFLOWER_STEM_MID,
      opacity: 0.38 + (index % 3) * 0.08,
    }
  })

  const edgeWhiskers = Array.from({ length: 28 }, (_, index) => {
    const progress = (index + 0.5) / 28
    const angle = index * 1.713 + (index % 2 === 0 ? -0.42 : 0.42)
    const center = stemCenterAt(progress)
    const sidePush = 0.03 + (index % 3) * 0.004
    const root = [
      center[0] + Math.cos(angle) * 0.066,
      center[1] + Math.sin(index * 0.47) * 0.006,
      center[2] + Math.sin(angle) * 0.068,
    ] as [number, number, number]
    const tip = [
      root[0] + Math.cos(angle) * sidePush,
      root[1] + Math.sin(index * 1.18) * 0.012,
      root[2] + Math.sin(angle) * sidePush,
    ] as [number, number, number]

    return {
      points: [root, tip] as [number, number, number][],
      color: index % 4 === 0 ? SUNFLOWER_STEM_LIGHT : SUNFLOWER_STEM_DARK,
    }
  })

  return (
    <group>
      {hairs.map((hair, index) => (
        <CurvedTube
          key={`sunflower-stalk-fuzz-${index}`}
          points={hair.points}
          radius={hair.radius}
          color={hair.color}
          outlineWidth={0.0009}
        />
      ))}
      {edgeWhiskers.map((whisker, index) => (
        <CurvedTube
          key={`sunflower-stalk-edge-whisker-${index}`}
          points={whisker.points}
          radius={0.0019}
          color={whisker.color}
          outlineWidth={0.0006}
        />
      ))}
      {fuzzDots.map((dot, index) => (
        <mesh key={`sunflower-stalk-fuzz-dot-${index}`} position={dot.position} rotation-z={index * 0.37} scale={dot.scale}>
          <sphereGeometry args={[1, 7, 4]} />
          <meshBasicMaterial color={dot.color} transparent opacity={dot.opacity} depthTest depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function SunflowerStalkLeaf({
  position,
  direction,
  length,
  width,
  thickness,
  color,
  drift = 0,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number]
  direction: -1 | 1
  length: number
  width: number
  thickness: number
  color: string
  drift?: number
  rotation?: [number, number, number]
}) {
  const tipZ = drift * width
  const socketZ = drift * width * 0.06
  const midZ = tipZ * 0.48
  const veinPoints: [number, number, number][] = [
    [direction * length * 0.06, thickness * 0.17, socketZ],
    [direction * length * 0.26, thickness * 0.32, midZ * 0.52],
    [direction * length * 0.58, thickness * 0.25, tipZ * 0.9],
  ]

  return (
    <group position={position} rotation={rotation}>
      <CodedAssetOutlineMesh
        position={[direction * length * 0.018, thickness * 0.04, socketZ]}
        rotation={[0.12, direction * 0.42, drift * 0.14]}
        scale={[length * 0.14, thickness * 0.86, width * 0.34]}
        outlineWidth={0.0038}
        outlineColor={VAC_ASSET_INK}
        geometry={<sphereGeometry args={[1, 12, 6]} />}
        material={toon(SUNFLOWER_STEM_DARK)}
      />
      <CurvedTube
        points={[
          [direction * length * 0.025, thickness * 0.08, socketZ],
          [direction * length * 0.2, thickness * 0.18, tipZ * 0.28],
          [direction * length * 0.42, thickness * 0.16, tipZ * 0.66],
        ]}
        radius={thickness * 0.2}
        color={SUNFLOWER_STEM_DARK}
        outlineWidth={0.0016}
      />
      <CodedAssetOutlineMesh
        position={[direction * length * 0.21, thickness * 0.12, tipZ * 0.22]}
        rotation={[0.06, direction * 0.1, drift * 0.04]}
        scale={[length * 0.2, thickness * 0.78, width * 0.42]}
        outlineWidth={0.003}
        outlineColor={VAC_ASSET_INK}
        geometry={<sphereGeometry args={[1, 12, 6]} />}
        material={toon(color)}
      />
      <CodedAssetOutlineMesh
        position={[direction * length * 0.42, thickness * 0.18, midZ]}
        rotation={[0.08, direction * 0.1, drift * 0.08]}
        scale={[length * 0.36, thickness * 1.08, width * 0.58]}
        outlineWidth={0.0048}
        outlineColor={VAC_ASSET_INK}
        geometry={<sphereGeometry args={[1, 16, 8]} />}
        material={toon(color)}
      />
      <CodedAssetOutlineMesh
        position={[direction * length * 0.66, thickness * 0.16, tipZ * 0.96]}
        rotation={[0.05, direction * 0.08, drift * 0.1]}
        scale={[length * 0.18, thickness * 0.9, width * 0.42]}
        outlineWidth={0.0032}
        outlineColor={VAC_ASSET_INK}
        geometry={<sphereGeometry args={[1, 12, 6]} />}
        material={toon(color)}
      />
      <CodedAssetOutlineMesh
        position={[direction * length * 0.38, thickness * 0.1, midZ - width * 0.19]}
        rotation={[0.05, direction * 0.08, drift * 0.04]}
        scale={[length * 0.16, thickness * 0.66, width * 0.18]}
        outlineWidth={0.002}
        outlineColor={VAC_ASSET_INK}
        geometry={<sphereGeometry args={[1, 10, 5]} />}
        material={toon(color)}
      />
      <CurvedTube points={veinPoints} radius={thickness * 0.06} color={SUNFLOWER_STEM_DARK} outlineWidth={0.0008} />
      <mesh
        position={[direction * length * 0.42, thickness * 0.9, midZ + width * 0.03]}
        rotation-z={direction * Math.PI / 2}
        scale={[thickness * 0.07, length * 0.2, thickness * 0.036]}
      >
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SUNFLOWER_STEM_LIGHT} transparent opacity={0.34} depthTest depthWrite={false} />
      </mesh>
    </group>
  )
}

function SunflowerSeedDisk() {
  const seedCount = 300
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const seedDots = Array.from({ length: seedCount }, (_, index) => {
    const progress = (index + 0.5) / seedCount
    const angle = index * goldenAngle
    const radius = Math.sqrt(progress) * 0.154
    const swirlBand = index % 7
    const dome = 1 - progress
    const dotSize = 0.0048 + dome * 0.0046 + Math.sin(index * 1.91) * 0.00042
    const warmSeed = swirlBand === 0 || swirlBand === 3
    const darkSeed = swirlBand === 1 || swirlBand === 4 || swirlBand === 6
    return {
      position: [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.9,
        -0.118 - progress * 0.006 + dome * 0.012,
      ] as [number, number, number],
      scale: [dotSize * (1 + progress * 0.14), dotSize * (0.92 + progress * 0.1), 0.0044] as [number, number, number],
      color: warmSeed ? SUNFLOWER_CENTER_LIGHT : darkSeed ? SUNFLOWER_CENTER_DARK : SUNFLOWER_CENTER_MID,
      opacity: darkSeed ? 0.98 : 0.95,
      solid: true,
    }
  })
  const seedCore = Array.from({ length: 38 }, (_, index) => {
    const progress = (index + 0.5) / 38
    const angle = index * goldenAngle + 0.36
    const radius = Math.sqrt(progress) * 0.054
    const dotSize = 0.006 + (1 - progress) * 0.003 + (index % 3) * 0.0005
    return {
      position: [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.9,
        -0.102 + (1 - progress) * 0.008,
      ] as [number, number, number],
      scale: [dotSize, dotSize * 0.96, 0.0048] as [number, number, number],
      color: index % 4 === 0 ? SUNFLOWER_CENTER_LIGHT : index % 2 === 0 ? SUNFLOWER_CENTER_DARK : SUNFLOWER_CENTER_MID,
      opacity: 0.98,
      solid: true,
    }
  })
  const outerSeedRing = Array.from({ length: 38 }, (_, index) => {
    const angle = (index / 38) * Math.PI * 2
    const radius = 0.151 + Math.sin(index * 2.21) * 0.002
    const dotSize = 0.0068 + (index % 4) * 0.0007
    return {
      position: [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.9,
        -0.128,
      ] as [number, number, number],
      scale: [dotSize * 1.12, dotSize * 0.88, 0.0048] as [number, number, number],
      color: index % 3 === 0 ? SUNFLOWER_CENTER_DARK : index % 3 === 1 ? SUNFLOWER_CENTER_LIGHT : SUNFLOWER_CENTER_MID,
      opacity: 0.96,
      solid: true,
    }
  })
  const seedGrooveStrokes = Array.from({ length: 42 }, (_, index) => {
    const progress = (index + 0.5) / 42
    const angle = index * goldenAngle + 0.72
    const radius = 0.034 + progress * 0.112
    return {
      position: [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.9,
        -0.098 - progress * 0.018,
      ] as [number, number, number],
      rotation: angle + Math.PI / 2,
      scale: [0.0022 + progress * 0.0008, 0.012 + progress * 0.006, 0.0026] as [number, number, number],
      color: index % 3 === 0 ? SUNFLOWER_CENTER_LIGHT : SUNFLOWER_CENTER_DARK,
      opacity: index % 3 === 0 ? 0.2 : 0.18,
    }
  })
  const centerGlints = [
    { position: [-0.052, 0.072, -0.092] as [number, number, number], rotation: -0.28, scale: [0.04, 0.008, 0.004] as [number, number, number], opacity: 0.28 },
    { position: [0.038, 0.052, -0.098] as [number, number, number], rotation: 0.46, scale: [0.025, 0.006, 0.0038] as [number, number, number], opacity: 0.2 },
    { position: [-0.012, -0.058, -0.111] as [number, number, number], rotation: 1.18, scale: [0.028, 0.006, 0.0038] as [number, number, number], opacity: 0.16 },
  ]
  const diskStrokes = [
    { position: [-0.074, 0.04, -0.118] as [number, number, number], rotation: -0.68, scale: [0.0048, 0.046, 0.0028] as [number, number, number], color: SUNFLOWER_CENTER_DARK, opacity: 0.22 },
    { position: [0.07, 0.02, -0.12] as [number, number, number], rotation: 0.72, scale: [0.0042, 0.04, 0.0028] as [number, number, number], color: SUNFLOWER_CENTER_DARK, opacity: 0.24 },
    { position: [-0.024, -0.078, -0.12] as [number, number, number], rotation: 1.34, scale: [0.0042, 0.038, 0.0028] as [number, number, number], color: SUNFLOWER_CENTER_LIGHT, opacity: 0.18 },
  ]

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0, 0, -0.048]}
        scale={[0.224, 0.204, 0.084]}
        outlineWidth={0.008}
        outlineColor={VAC_ASSET_INK}
        geometry={<sphereGeometry args={[1, 24, 12]} />}
        material={toon(SUNFLOWER_CENTER_DARK)}
      />
      <CodedAssetOutlineMesh
        position={[0.004, 0.004, -0.076]}
        scale={[0.184, 0.166, 0.064]}
        outlineWidth={0.0038}
        outlineColor={SUNFLOWER_CENTER_DARK}
        geometry={<sphereGeometry args={[1, 18, 8]} />}
        material={toon(SUNFLOWER_CENTER_MID)}
      />
      <CodedAssetOutlineMesh
        position={[0.002, 0.002, -0.104]}
        scale={[0.118, 0.106, 0.038]}
        outlineWidth={0.0018}
        outlineColor={SUNFLOWER_CENTER_MID}
        geometry={<sphereGeometry args={[1, 16, 7]} />}
        material={toon(SUNFLOWER_CENTER_LIGHT)}
      />
      <CodedAssetOutlineMesh
        position={[0.004, 0.004, -0.104]}
        scale={[1.0, 0.92, 0.9]}
        outlineWidth={0.0022}
        outlineColor={SUNFLOWER_CENTER_DARK}
        geometry={<torusGeometry args={[0.178, 0.0092, 8, 40]} />}
        material={toon(SUNFLOWER_CENTER_LIGHT)}
      />
      {outerSeedRing.map((dot, index) => (
        <OrganicDetailDot
          key={`sunflower-seed-outer-ring-${index}`}
          position={dot.position}
          scale={dot.scale}
          color={dot.color}
          opacity={dot.opacity}
          depthTest
          solid={dot.solid}
        />
      ))}
      {seedGrooveStrokes.map((stroke, index) => (
        <OrganicDetailStroke key={`sunflower-seed-groove-${index}`} {...stroke} depthTest />
      ))}
      {seedDots.map((dot, index) => (
        <OrganicDetailDot
          key={`sunflower-seed-dot-${index}`}
          position={dot.position}
          scale={dot.scale}
          color={dot.color}
          opacity={dot.opacity}
          depthTest
          solid={dot.solid}
        />
      ))}
      {seedCore.map((dot, index) => (
        <OrganicDetailDot
          key={`sunflower-seed-core-${index}`}
          position={dot.position}
          scale={dot.scale}
          color={dot.color}
          opacity={dot.opacity}
          depthTest
          solid={dot.solid}
        />
      ))}
      {diskStrokes.map((stroke, index) => (
        <OrganicDetailStroke key={`sunflower-center-stroke-${index}`} {...stroke} depthTest />
      ))}
      {centerGlints.map((glint, index) => (
        <OrganicDetailStroke
          key={`sunflower-center-glint-${index}`}
          position={glint.position}
          rotation={glint.rotation}
          scale={glint.scale}
          color={SUNFLOWER_PETAL_LIGHT}
          opacity={glint.opacity}
          depthTest
        />
      ))}
    </group>
  )
}

function SunflowerHead({ activity = 1 }: { activity?: number }) {
  const flowerHead = useRef<THREE.Group>(null)
  const outerPetalCount = 10
  const outerPetals = Array.from({ length: outerPetalCount }, (_, index) => {
    const angle = Math.PI / 2 + (index / outerPetalCount) * Math.PI * 2
    const side = Math.cos(angle)
    const vertical = Math.sin(angle)
    const lateral = Math.abs(side)
    const upright = Math.abs(vertical)
    const lowerFan = Math.max(0, -vertical)
    const lowerCorner = lowerFan * lateral
    const depth = vertical * 0.026 + lateral * 0.012
    const isUpright = upright > 0.78
    const isSide = lateral > 0.78
    return {
      angle,
      radius: 0.268 + lateral * 0.012 - upright * 0.004 - lowerFan * 0.008 - lowerCorner * 0.004,
      length: 0.334 + upright * 0.028 + lateral * 0.012 - lowerFan * 0.014,
      width: 0.108 + upright * 0.008 - lateral * 0.002 + lowerFan * 0.004,
      color: isUpright ? SUNFLOWER_PETAL_LIGHT : isSide ? SUNFLOWER_PETAL_GOLD : SUNFLOWER_PETAL_MID,
      layerZ: -0.024 + depth - lowerFan * 0.012,
      curl: side * (0.008 - lowerFan * 0.004),
      bend: vertical * (0.24 - lowerFan * 0.045),
      bank: side * (0.18 - lowerFan * 0.05),
      tipZ: depth + vertical * 0.026 + lateral * 0.016 - lowerFan * 0.01,
      placementPolish: lowerFan,
    }
  })
  const innerPetalCount = 8
  const innerPetals = Array.from({ length: innerPetalCount }, (_, index) => {
    const angle = Math.PI / 2 + Math.PI / innerPetalCount + (index / innerPetalCount) * Math.PI * 2
    const side = Math.cos(angle)
    const vertical = Math.sin(angle)
    const lateral = Math.abs(side)
    const upright = Math.abs(vertical)
    const lowerFan = Math.max(0, -vertical)
    const depth = vertical * 0.018 + lateral * 0.008
    return {
      angle,
      radius: 0.196 + lateral * 0.006 - upright * 0.002 - lowerFan * 0.012,
      length: 0.214 + upright * 0.014 + lateral * 0.006 - lowerFan * 0.016,
      width: 0.073 + upright * 0.004,
      color: upright > 0.72 ? SUNFLOWER_PETAL_LIGHT : SUNFLOWER_PETAL_GOLD,
      layerZ: -0.064 + depth - lowerFan * 0.022,
      curl: side * (0.006 - lowerFan * 0.003),
      bend: vertical * (0.18 - lowerFan * 0.03),
      bank: side * (0.13 - lowerFan * 0.035),
      tipZ: depth + vertical * 0.016 + lateral * 0.008 - lowerFan * 0.014,
      placementPolish: lowerFan,
    }
  })
  const backBracts = Array.from({ length: 7 }, (_, index) => {
    const angle = (index / 7) * Math.PI * 2 + Math.PI / 12
    const pulse = Math.sin(index * 1.47)
    return {
      angle,
      radius: 0.186 + pulse * 0.008,
      length: 0.078 + (index % 3) * 0.008,
      width: 0.032 + (index % 2) * 0.004,
      color: index % 2 === 0 ? SUNFLOWER_STEM_DARK : SUNFLOWER_STEM_MID,
    }
  })
  const frontCalyxPads = Array.from({ length: 5 }, (_, index) => {
    const angle = -Math.PI * 0.88 + index * 0.44
    return {
      angle,
      radius: 0.13 + Math.sin(index * 1.3) * 0.006,
      length: 0.034 + (index % 2) * 0.006,
      width: 0.02 + (index % 3) * 0.003,
      color: index % 2 === 0 ? SUNFLOWER_STEM_DARK : SUNFLOWER_STEM_MID,
    }
  })

  useFrame(({ clock }) => {
    if (!flowerHead.current) return
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const breathe = idlePulse(t, 5.2, 0.62, 0.056) * motion
    flowerHead.current.rotation.z = 0.045 + Math.sin(t * 1.16 + 0.2) * 0.018 * motion - breathe * 0.016
    flowerHead.current.rotation.x = -0.08 + Math.sin(t * 0.92 + 0.7) * 0.012 * motion
    flowerHead.current.scale.set(1 + breathe * 0.016, 1 + breathe * 0.022, 1)
  })

  return (
    <group ref={flowerHead} position={[0.06, 1.19, -0.024]} rotation={[-0.08, 0.02, 0.045]} scale={1.5}>
      <mesh position={[0.006, -0.024, 0.038]} rotation-z={0.02} scale={[0.36, 0.32, 0.026]}>
        <sphereGeometry args={[1, 14, 6]} />
        <meshBasicMaterial color={SUNFLOWER_PETAL_DEEP} transparent opacity={0.16} depthTest depthWrite={false} />
      </mesh>
      <CodedAssetOutlineMesh
        position={[0.002, -0.008, 0.044]}
        scale={[0.224, 0.2, 0.104]}
        outlineWidth={0.006}
        outlineColor={VAC_ASSET_INK}
        geometry={<sphereGeometry args={[1, 18, 8]} />}
        material={toon(SUNFLOWER_STEM_DARK)}
      />
      {backBracts.map((bract, index) => (
        <group
          key={`sunflower-back-bract-${index}`}
          position={[Math.cos(bract.angle) * bract.radius, Math.sin(bract.angle) * bract.radius, 0.032]}
          rotation-z={bract.angle - Math.PI / 2 + Math.sin(index) * 0.06}
        >
          <CodedAssetOutlineMesh
            position={[0, bract.length * 0.18, 0]}
            scale={[bract.width, bract.length, 0.038]}
            outlineWidth={0.0038}
            outlineColor={VAC_ASSET_INK}
            geometry={<sphereGeometry args={[1, 9, 5]} />}
            material={toon(bract.color)}
          />
        </group>
      ))}
      {frontCalyxPads.map((bract, index) => (
        <group
          key={`sunflower-front-calyx-${index}`}
          position={[Math.cos(bract.angle) * bract.radius, Math.sin(bract.angle) * bract.radius, -0.085]}
          rotation-z={bract.angle - Math.PI / 2 + Math.sin(index * 0.7) * 0.04}
        >
          <CodedAssetOutlineMesh
            position={[0, bract.length * 0.2, 0]}
            scale={[bract.width, bract.length, 0.03]}
            outlineWidth={0.0026}
            outlineColor={VAC_ASSET_INK}
            geometry={<sphereGeometry args={[1, 9, 5]} />}
            material={toon(bract.color)}
          />
        </group>
      ))}
      {outerPetals.map((petal, index) => (
        <SunflowerPetal key={`sunflower-outer-petal-${index}`} {...petal} index={index} />
      ))}
      {innerPetals.map((petal, index) => (
        <SunflowerPetal key={`sunflower-inner-petal-${index}`} {...petal} index={index + 20} />
      ))}
      <SunflowerSeedDisk />
    </group>
  )
}

function SunflowerSoilCrown() {
  return (
    <group>
      <mesh position={[0.002, 0.024, -0.018]} rotation-z={-0.02} scale={[0.18, 0.022, 0.064]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={SOIL_DARK} />
      </mesh>
      <mesh position={[-0.07, 0.042, 0.018]} rotation-z={-0.24} scale={[0.076, 0.014, 0.032]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SOIL_LIGHT} />
      </mesh>
      <mesh position={[0.082, 0.04, 0.01]} rotation-z={0.22} scale={[0.072, 0.013, 0.032]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SOIL_MID} />
      </mesh>
      <CodedAssetOutlineMesh
        position={[0.002, 0.074, 0.004]}
        rotation-z={0.08}
        scale={[0.05, 0.034, 0.046]}
        outlineWidth={0.003}
        outlineColor={VAC_ASSET_INK}
        geometry={<sphereGeometry args={[1, 9, 5]} />}
        material={toon(SUNFLOWER_STEM_DARK)}
      />
      <mesh position={[-0.018, 0.078, -0.028]} rotation-z={-0.24} scale={[0.022, 0.008, 0.006]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color={SUNFLOWER_STEM_LIGHT} transparent opacity={0.38} depthTest depthWrite={false} />
      </mesh>
      <CurvedTube
        points={[
          [-0.128, 0.028, 0.01],
          [-0.07, 0.048, 0.034],
          [0.018, 0.044, 0.035],
          [0.12, 0.03, 0.006],
        ]}
        radius={0.0045}
        color={SUNFLOWER_STEM_DARK}
        outlineWidth={0.002}
      />
      <OrganicDetailDot position={[-0.11, 0.048, -0.016]} scale={[0.008, 0.004, 0.004]} color={SOIL_DUST} opacity={0.7} />
      <OrganicDetailDot position={[0.11, 0.046, -0.014]} scale={[0.007, 0.004, 0.004]} color={SOIL_DUST} opacity={0.62} />
    </group>
  )
}

function HeadSunflowerPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  const potGeometry = useMemo(() => createHeadPotBodyGeometry(), [])
  const potLipGeometry = useMemo(() => createHeadPotLipGeometry(), [])
  const potBaseBandGeometry = useMemo(() => createHeadPotBaseBandGeometry(), [])
  const sunflowerCluster = useRef<THREE.Group>(null)
  const potGroup = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const breeze = Math.sin(t * 1.08 + 0.4) * 0.028 * motion
    const lift = idlePulse(t, 5.4, 0.64, 0.052) * motion
    const tinyShake = Math.sin(t * 8.4) * 0.003 * motion + Math.sin(t * 13.2 + 0.4) * 0.0018 * motion

    if (sunflowerCluster.current) {
      sunflowerCluster.current.position.x = tinyShake * 0.35
      sunflowerCluster.current.position.y = 0.12 + lift * 0.014
      sunflowerCluster.current.rotation.z = breeze - lift * 0.012 + tinyShake
      sunflowerCluster.current.rotation.x = Math.sin(t * 0.86 + 0.7) * 0.014 * motion
      sunflowerCluster.current.scale.set(1 + lift * 0.01, 1 + lift * 0.014, 1)
    }
    if (potGroup.current) {
      potGroup.current.position.y = Math.sin(t * 1.14 + 1.1) * 0.004 * motion - lift * 0.003
      potGroup.current.rotation.z = -0.055 + Math.sin(t * 1.9) * 0.007 * motion - tinyShake * 0.3
    }
  })

  return (
    <group position={[0.02, 0.695, -0.205]} scale={0.9}>
      <mesh position={[0.012, -0.195, 0.05]} rotation-z={-0.08} scale={[0.34, 0.045, 0.082]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.26} depthWrite={false} />
      </mesh>
      {pot === 'gold-crown-pot' ? (
        <GoldCrownPotShell groupRef={potGroup} />
      ) : pot === 'purple-cube-pot' ? (
        <KitschPotShell groupRef={potGroup} />
      ) : pot === 'terracotta' ? (
        <TerracottaPotShell groupRef={potGroup} />
      ) : (
        <group ref={potGroup} rotation-z={-0.055}>
          <CodedAssetOutlineMesh
            position={[0, -0.008, 0]}
            scale={[0.92, 0.9, 0.72]}
            outlineWidth={0.018}
            geometry={<primitive object={potGeometry} attach="geometry" />}
            material={toon(POT_BLUE_MID)}
          />
          <CodedAssetOutlineMesh
            position={[0, 0.166, 0]}
            scale={[0.92, 1, 0.72]}
            outlineWidth={0.012}
            geometry={<primitive object={potLipGeometry} attach="geometry" />}
            material={toon(POT_BLUE_DARK)}
          />
          <PotPaintStroke position={[-0.135, 0.024, -0.288]} rotation={-0.28} scale={[0.112, 0.022, 0.006]} color={POT_BLUE_LIGHT} opacity={0.36} />
          <PotPaintStroke position={[0.082, 0.082, -0.292]} rotation={0.22} scale={[0.138, 0.022, 0.006]} color={POT_CLAY_WASH} opacity={0.3} />
          <PotPaintStroke position={[0.012, 0.148, -0.292]} rotation={-0.045} scale={[0.21, 0.018, 0.006]} color={POT_BLUE_SHADOW} opacity={0.34} />
          <PotPaintStroke position={[0.116, -0.098, -0.266]} rotation={0.18} scale={[0.098, 0.018, 0.006]} color={POT_BLUE_SHADOW} opacity={0.3} />
          <PotPaintStroke position={[-0.044, -0.15, -0.258]} rotation={0.04} scale={[0.16, 0.016, 0.006]} color={POT_BLUE_SHADOW} opacity={0.34} />
          <PotPaintStroke position={[0.018, 0.184, -0.304]} rotation={-0.04} scale={[0.24, 0.012, 0.005]} color={POT_BLUE_LIGHT} opacity={0.24} />
          <mesh position={[0, 0.186, -0.056]} scale={[0.382, 0.018, 0.234]}>
            <cylinderGeometry args={[1, 1, 1, 18]} />
            <meshBasicMaterial color={SOIL_DARK} />
          </mesh>
          <PottedSoilSurface />
          <CodedAssetOutlineMesh
            position={[0, -0.19, 0]}
            scale={[0.92, 0.72, 0.72]}
            outlineWidth={0.008}
            geometry={<primitive object={potBaseBandGeometry} attach="geometry" />}
            material={toon(POT_BLUE_SHADOW)}
          />
        </group>
      )}
      <group ref={sunflowerCluster} position={[0, 0.12, 0.01]}>
        <SunflowerSoilCrown />
        <CurvedTube
          points={[
            [0.0, 0.05, 0.005],
            [-0.022, 0.42, 0.022],
            [0.012, 0.86, 0.004],
            [0.058, 1.22, -0.018],
          ]}
          radius={0.064}
          color={SUNFLOWER_STEM_MID}
          outlineWidth={0.016}
        />
        <SunflowerStemFuzz />
        <CurvedTube
          points={[
            [0.014, 0.08, -0.012],
            [0.006, 0.42, -0.014],
            [0.026, 0.82, -0.02],
            [0.058, 1.1, -0.032],
          ]}
          radius={0.0055}
          color={SUNFLOWER_STEM_DARK}
          outlineWidth={0.0015}
        />
        <CurvedTube
          points={[
            [-0.01, 0.088, -0.028],
            [-0.018, 0.42, -0.03],
            [0.012, 0.84, -0.034],
            [0.052, 1.09, -0.044],
          ]}
          radius={0.008}
          color={SUNFLOWER_STEM_LIGHT}
          outlineWidth={0.0015}
        />
        <SunflowerStalkLeaf
          position={[-0.068, 0.455, 0.01]}
          direction={-1}
          length={0.278}
          width={0.142}
          thickness={0.034}
          color={SUNFLOWER_STEM_MID}
          drift={-0.2}
          rotation={[0.02, -0.22, -0.04]}
        />
        <SunflowerStalkLeaf
          position={[0.032, 0.392, 0.012]}
          direction={1}
          length={0.228}
          width={0.116}
          thickness={0.032}
          color={SUNFLOWER_STEM_LIGHT}
          drift={0.14}
          rotation={[0.02, 0.2, -0.025]}
        />
        <CurvedTube
          points={[
            [0.05, 1.08, -0.018],
            [0.012, 1.145, -0.028],
            [-0.032, 1.19, -0.04],
          ]}
          radius={0.006}
          color={SUNFLOWER_STEM_DARK}
          outlineWidth={0.002}
        />
        <CurvedTube
          points={[
            [0.058, 1.08, -0.018],
            [0.092, 1.145, -0.028],
            [0.13, 1.19, -0.04],
          ]}
          radius={0.0055}
          color={SUNFLOWER_STEM_MID}
          outlineWidth={0.002}
        />
        <CodedAssetOutlineMesh
          position={[0.058, 1.15, -0.018]}
          rotation-z={0.12}
          scale={[0.066, 0.052, 0.038]}
          outlineWidth={0.004}
          geometry={<sphereGeometry args={[1, 9, 5]} />}
          material={toon(SUNFLOWER_STEM_DARK)}
        />
        <SunflowerHead activity={activity} />
      </group>
    </group>
  )
}

function HeadCactusPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  const potGeometry = useMemo(() => createHeadPotBodyGeometry(), [])
  const potLipGeometry = useMemo(() => createHeadPotLipGeometry(), [])
  const potBaseBandGeometry = useMemo(() => createHeadPotBaseBandGeometry(), [])
  const potGroup = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!potGroup.current) return
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const settle = idlePulse(t, 5.8, 0.65, 0.045) * motion

    potGroup.current.position.y = Math.sin(t * 1.12 + 1.2) * 0.0035 * motion - settle * 0.0025
    potGroup.current.rotation.z = -0.055 + Math.sin(t * 1.7) * 0.006 * motion
  })

  return (
    <group position={[0.02, 0.695, -0.205]} scale={0.9}>
      <mesh position={[0.012, -0.195, 0.05]} rotation-z={-0.08} scale={[0.34, 0.045, 0.082]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.26} depthWrite={false} />
      </mesh>
      {pot === 'gold-crown-pot' ? (
        <GoldCrownPotShell groupRef={potGroup} />
      ) : pot === 'purple-cube-pot' ? (
        <KitschPotShell groupRef={potGroup} />
      ) : pot === 'terracotta' ? (
        <TerracottaPotShell groupRef={potGroup} />
      ) : (
        <group ref={potGroup} rotation-z={-0.055}>
          <CodedAssetOutlineMesh
            position={[0, -0.008, 0]}
            scale={[0.92, 0.9, 0.72]}
            outlineWidth={0.018}
            geometry={<primitive object={potGeometry} attach="geometry" />}
            material={toon(POT_BLUE_MID)}
          />
          <CodedAssetOutlineMesh
            position={[0, 0.166, 0]}
            scale={[0.92, 1, 0.72]}
            outlineWidth={0.012}
            geometry={<primitive object={potLipGeometry} attach="geometry" />}
            material={toon(POT_BLUE_DARK)}
          />
          <PotPaintStroke position={[-0.135, 0.024, -0.288]} rotation={-0.28} scale={[0.112, 0.022, 0.006]} color={POT_BLUE_LIGHT} opacity={0.36} />
          <PotPaintStroke position={[0.082, 0.082, -0.292]} rotation={0.22} scale={[0.138, 0.022, 0.006]} color={POT_CLAY_WASH} opacity={0.3} />
          <PotPaintStroke position={[0.012, 0.148, -0.292]} rotation={-0.045} scale={[0.21, 0.018, 0.006]} color={POT_BLUE_SHADOW} opacity={0.34} />
          <PotPaintStroke position={[0.116, -0.098, -0.266]} rotation={0.18} scale={[0.098, 0.018, 0.006]} color={POT_BLUE_SHADOW} opacity={0.3} />
          <PotPaintStroke position={[-0.044, -0.15, -0.258]} rotation={0.04} scale={[0.16, 0.016, 0.006]} color={POT_BLUE_SHADOW} opacity={0.34} />
          <PotPaintStroke position={[0.018, 0.184, -0.304]} rotation={-0.04} scale={[0.24, 0.012, 0.005]} color={POT_BLUE_LIGHT} opacity={0.24} />
          <mesh position={[0, 0.186, -0.056]} scale={[0.382, 0.018, 0.234]}>
            <cylinderGeometry args={[1, 1, 1, 18]} />
            <meshBasicMaterial color={SOIL_DARK} />
          </mesh>
          <PottedSoilSurface />
          <CodedAssetOutlineMesh
            position={[0, -0.19, 0]}
            scale={[0.92, 0.72, 0.72]}
            outlineWidth={0.008}
            geometry={<primitive object={potBaseBandGeometry} attach="geometry" />}
            material={toon(POT_BLUE_SHADOW)}
          />
        </group>
      )}
      <group position={[0, 0.12, 0.01]}>
        <CactusPlant activity={activity} />
      </group>
    </group>
  )
}

function HeadSnakePlantPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  const potGeometry = useMemo(() => createHeadPotBodyGeometry(), [])
  const potLipGeometry = useMemo(() => createHeadPotLipGeometry(), [])
  const potBaseBandGeometry = useMemo(() => createHeadPotBaseBandGeometry(), [])
  const potGroup = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!potGroup.current) return
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const settle = idlePulse(t, 5.8, 0.65, 0.045) * motion

    potGroup.current.position.y = Math.sin(t * 1.12 + 1.2) * 0.0035 * motion - settle * 0.0025
    potGroup.current.rotation.z = -0.055 + Math.sin(t * 1.7) * 0.006 * motion
  })

  return (
    <group position={[0.02, 0.695, -0.205]} scale={0.9}>
      <mesh position={[0.012, -0.195, 0.05]} rotation-z={-0.08} scale={[0.34, 0.045, 0.082]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.26} depthWrite={false} />
      </mesh>
      {pot === 'gold-crown-pot' ? (
        <GoldCrownPotShell groupRef={potGroup} />
      ) : pot === 'purple-cube-pot' ? (
        <KitschPotShell groupRef={potGroup} />
      ) : pot === 'terracotta' ? (
        <TerracottaPotShell groupRef={potGroup} />
      ) : (
        <group ref={potGroup} rotation-z={-0.055}>
          <CodedAssetOutlineMesh
            position={[0, -0.008, 0]}
            scale={[0.92, 0.9, 0.72]}
            outlineWidth={0.018}
            geometry={<primitive object={potGeometry} attach="geometry" />}
            material={toon(POT_BLUE_MID)}
          />
          <CodedAssetOutlineMesh
            position={[0, 0.166, 0]}
            scale={[0.92, 1, 0.72]}
            outlineWidth={0.012}
            geometry={<primitive object={potLipGeometry} attach="geometry" />}
            material={toon(POT_BLUE_DARK)}
          />
          <PotPaintStroke position={[-0.135, 0.024, -0.288]} rotation={-0.28} scale={[0.112, 0.022, 0.006]} color={POT_BLUE_LIGHT} opacity={0.36} />
          <PotPaintStroke position={[0.082, 0.082, -0.292]} rotation={0.22} scale={[0.138, 0.022, 0.006]} color={POT_CLAY_WASH} opacity={0.3} />
          <PotPaintStroke position={[0.012, 0.148, -0.292]} rotation={-0.045} scale={[0.21, 0.018, 0.006]} color={POT_BLUE_SHADOW} opacity={0.34} />
          <PotPaintStroke position={[0.116, -0.098, -0.266]} rotation={0.18} scale={[0.098, 0.018, 0.006]} color={POT_BLUE_SHADOW} opacity={0.3} />
          <PotPaintStroke position={[-0.044, -0.15, -0.258]} rotation={0.04} scale={[0.16, 0.016, 0.006]} color={POT_BLUE_SHADOW} opacity={0.34} />
          <PotPaintStroke position={[0.018, 0.184, -0.304]} rotation={-0.04} scale={[0.24, 0.012, 0.005]} color={POT_BLUE_LIGHT} opacity={0.24} />
          <mesh position={[0, 0.186, -0.056]} scale={[0.382, 0.018, 0.234]}>
            <cylinderGeometry args={[1, 1, 1, 18]} />
            <meshBasicMaterial color={SOIL_DARK} />
          </mesh>
          <PottedSoilSurface />
          <CodedAssetOutlineMesh
            position={[0, -0.19, 0]}
            scale={[0.92, 0.72, 0.72]}
            outlineWidth={0.008}
            geometry={<primitive object={potBaseBandGeometry} attach="geometry" />}
            material={toon(POT_BLUE_SHADOW)}
          />
        </group>
      )}
      <group position={[0, 0.12, 0.01]}>
        <SnakePlant activity={activity} />
      </group>
    </group>
  )
}

function HeadLotusPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  const potGeometry = useMemo(() => createHeadPotBodyGeometry(), [])
  const potLipGeometry = useMemo(() => createHeadPotLipGeometry(), [])
  const potBaseBandGeometry = useMemo(() => createHeadPotBaseBandGeometry(), [])
  const potGroup = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!potGroup.current) return
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const settle = idlePulse(t, 5.8, 0.65, 0.045) * motion

    potGroup.current.position.y = Math.sin(t * 1.12 + 1.2) * 0.0035 * motion - settle * 0.0025
    potGroup.current.rotation.z = -0.055 + Math.sin(t * 1.7) * 0.006 * motion
  })

  return (
    <group position={[0.02, 0.695, -0.205]} scale={0.9}>
      <mesh position={[0.012, -0.195, 0.05]} rotation-z={-0.08} scale={[0.34, 0.045, 0.082]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.26} depthWrite={false} />
      </mesh>
      {pot === 'gold-crown-pot' ? (
        <GoldCrownPotShell groupRef={potGroup} />
      ) : pot === 'purple-cube-pot' ? (
        <KitschPotShell groupRef={potGroup} />
      ) : pot === 'terracotta' ? (
        <TerracottaPotShell groupRef={potGroup} />
      ) : (
        <group ref={potGroup} rotation-z={-0.055}>
          <CodedAssetOutlineMesh
            position={[0, -0.008, 0]}
            scale={[0.92, 0.9, 0.72]}
            outlineWidth={0.018}
            geometry={<primitive object={potGeometry} attach="geometry" />}
            material={toon(POT_BLUE_MID)}
          />
          <CodedAssetOutlineMesh
            position={[0, 0.166, 0]}
            scale={[0.92, 1, 0.72]}
            outlineWidth={0.012}
            geometry={<primitive object={potLipGeometry} attach="geometry" />}
            material={toon(POT_BLUE_DARK)}
          />
          <PotPaintStroke position={[-0.135, 0.024, -0.288]} rotation={-0.28} scale={[0.112, 0.022, 0.006]} color={POT_BLUE_LIGHT} opacity={0.36} />
          <PotPaintStroke position={[0.082, 0.082, -0.292]} rotation={0.22} scale={[0.138, 0.022, 0.006]} color={POT_CLAY_WASH} opacity={0.3} />
          <PotPaintStroke position={[0.012, 0.148, -0.292]} rotation={-0.045} scale={[0.21, 0.018, 0.006]} color={POT_BLUE_SHADOW} opacity={0.34} />
          <PotPaintStroke position={[0.116, -0.098, -0.266]} rotation={0.18} scale={[0.098, 0.018, 0.006]} color={POT_BLUE_SHADOW} opacity={0.3} />
          <PotPaintStroke position={[-0.044, -0.15, -0.258]} rotation={0.04} scale={[0.16, 0.016, 0.006]} color={POT_BLUE_SHADOW} opacity={0.34} />
          <PotPaintStroke position={[0.018, 0.184, -0.304]} rotation={-0.04} scale={[0.24, 0.012, 0.005]} color={POT_BLUE_LIGHT} opacity={0.24} />
          <mesh position={[0, 0.186, -0.056]} scale={[0.382, 0.018, 0.234]}>
            <cylinderGeometry args={[1, 1, 1, 18]} />
            <meshBasicMaterial color={SOIL_DARK} />
          </mesh>
          <PottedSoilSurface />
          <CodedAssetOutlineMesh
            position={[0, -0.19, 0]}
            scale={[0.92, 0.72, 0.72]}
            outlineWidth={0.008}
            geometry={<primitive object={potBaseBandGeometry} attach="geometry" />}
            material={toon(POT_BLUE_SHADOW)}
          />
        </group>
      )}
      <group position={[0, 0.12, 0.01]}>
        <LotusPlant activity={activity} />
      </group>
    </group>
  )
}

function AmbientPlantMotionRig({
  activity = 1,
  children,
}: {
  activity?: number
  children: ReactNode
}) {
  const plantGroup = useRef<THREE.Group>(null)
  const animation = useContext(GlowbudAnimationContext)
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    if (!plantGroup.current) return
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const actionT = actionTime(t)
    const ambient = getAmbientLifeMotion(t, motion)
    const performance = getDirectedPerformanceMotion(actionT, animation, motion)
    const hop = getHopMotion(actionT, animation === 'hop' ? motion : 0)
    const fidget = getWizardGrumbleMotion(actionT, animation === 'grumble' ? motion : 0)

    plantGroup.current.rotation.set(
      Math.sin(t * 0.62 + 0.8) * 0.008 * motion + hop.rotateX * -0.18 + fidget.chatter * 0.22 + performance.plantRotateX,
      Math.sin(t * 0.48 + 1.1) * 0.009 * motion + ambient.bodyRotateY * 0.16 + performance.plantRotateY,
      ambient.plantSway - hop.rotateZ * 0.32 - fidget.bodyLean * 0.28 + performance.plantRotateZ,
    )
    plantGroup.current.scale.set(
      1 + hop.prep * 0.012 + hop.land * 0.02,
      1 - hop.prep * 0.018 + hop.launch * 0.032 - hop.land * 0.026 + hop.recovery * 0.012 + performance.plantStretch,
      1 + hop.land * 0.012,
    )
  })

  return (
    <group ref={plantGroup} position={[0, 0.12, 0.01]}>
      {children}
    </group>
  )
}

function HeadReferencePlantPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
  children,
}: {
  activity?: number
  pot?: GlowbudPotTrait
  children: ReactNode
}) {
  const potGeometry = useMemo(() => createHeadPotBodyGeometry(), [])
  const potLipGeometry = useMemo(() => createHeadPotLipGeometry(), [])
  const potBaseBandGeometry = useMemo(() => createHeadPotBaseBandGeometry(), [])
  const potGroup = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!potGroup.current) return
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const settle = idlePulse(t, 5.8, 0.65, 0.045) * motion

    potGroup.current.position.y = Math.sin(t * 1.12 + 1.2) * 0.0035 * motion - settle * 0.0025
    potGroup.current.rotation.z = -0.055 + Math.sin(t * 1.7) * 0.006 * motion
  })

  return (
    <group position={[0.02, 0.695, -0.205]} scale={0.9}>
      <mesh position={[0.012, -0.195, 0.05]} rotation-z={-0.08} scale={[0.34, 0.045, 0.082]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.26} depthWrite={false} />
      </mesh>
      {pot === 'gold-crown-pot' ? (
        <GoldCrownPotShell groupRef={potGroup} />
      ) : pot === 'purple-cube-pot' ? (
        <KitschPotShell groupRef={potGroup} />
      ) : pot === 'terracotta' ? (
        <TerracottaPotShell groupRef={potGroup} />
      ) : (
        <group ref={potGroup} rotation-z={-0.055}>
          <CodedAssetOutlineMesh
            position={[0, -0.008, 0]}
            scale={[0.92, 0.9, 0.72]}
            outlineWidth={0.018}
            geometry={<primitive object={potGeometry} attach="geometry" />}
            material={toon(POT_BLUE_MID)}
          />
          <CodedAssetOutlineMesh
            position={[0, 0.166, 0]}
            scale={[0.92, 1, 0.72]}
            outlineWidth={0.012}
            geometry={<primitive object={potLipGeometry} attach="geometry" />}
            material={toon(POT_BLUE_DARK)}
          />
          <PotPaintStroke position={[-0.135, 0.024, -0.288]} rotation={-0.28} scale={[0.112, 0.022, 0.006]} color={POT_BLUE_LIGHT} opacity={0.36} />
          <PotPaintStroke position={[0.082, 0.082, -0.292]} rotation={0.22} scale={[0.138, 0.022, 0.006]} color={POT_CLAY_WASH} opacity={0.3} />
          <PotPaintStroke position={[0.012, 0.148, -0.292]} rotation={-0.045} scale={[0.21, 0.018, 0.006]} color={POT_BLUE_SHADOW} opacity={0.34} />
          <PotPaintStroke position={[0.116, -0.098, -0.266]} rotation={0.18} scale={[0.098, 0.018, 0.006]} color={POT_BLUE_SHADOW} opacity={0.3} />
          <PotPaintStroke position={[-0.044, -0.15, -0.258]} rotation={0.04} scale={[0.16, 0.016, 0.006]} color={POT_BLUE_SHADOW} opacity={0.34} />
          <PotPaintStroke position={[0.018, 0.184, -0.304]} rotation={-0.04} scale={[0.24, 0.012, 0.005]} color={POT_BLUE_LIGHT} opacity={0.24} />
          <mesh position={[0, 0.186, -0.056]} scale={[0.382, 0.018, 0.234]}>
            <cylinderGeometry args={[1, 1, 1, 18]} />
            <meshBasicMaterial color={SOIL_DARK} />
          </mesh>
          <PottedSoilSurface />
          <CodedAssetOutlineMesh
            position={[0, -0.19, 0]}
            scale={[0.92, 0.72, 0.72]}
            outlineWidth={0.008}
            geometry={<primitive object={potBaseBandGeometry} attach="geometry" />}
            material={toon(POT_BLUE_SHADOW)}
          />
        </group>
      )}
      <AmbientPlantMotionRig activity={activity}>
        {children}
      </AmbientPlantMotionRig>
    </group>
  )
}

function HeadDouglasPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  return (
    <HeadReferencePlantPotAccessory activity={activity} pot={pot}>
      <DouglasPlant activity={activity} />
    </HeadReferencePlantPotAccessory>
  )
}

function HeadFernPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  return (
    <HeadReferencePlantPotAccessory activity={activity} pot={pot}>
      <FernPlant activity={activity} />
    </HeadReferencePlantPotAccessory>
  )
}

function HeadFlowerPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  return (
    <HeadReferencePlantPotAccessory activity={activity} pot={pot}>
      <group
        position={[
          0,
          pot === 'purple-cube-pot' ? -0.04 : -0.01,
          0,
        ]}
        scale={pot === 'purple-cube-pot' ? 0.88 : 1}
      >
        <FlowerPlant activity={activity} />
      </group>
    </HeadReferencePlantPotAccessory>
  )
}

function HeadTwoFlowersPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  return (
    <HeadReferencePlantPotAccessory activity={activity} pot={pot}>
      <group
        position={[
          0,
          pot === 'purple-cube-pot' ? -0.045 : -0.012,
          0,
        ]}
        scale={pot === 'purple-cube-pot' ? 0.83 : 0.9}
      >
        <TwoFlowersPlant activity={activity} />
      </group>
    </HeadReferencePlantPotAccessory>
  )
}

function HeadPalmTreePotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  return (
    <HeadReferencePlantPotAccessory activity={activity} pot={pot}>
      <group
        position={[
          0,
          pot === 'purple-cube-pot' ? -0.08 : -0.07,
          0,
        ]}
        scale={pot === 'purple-cube-pot' ? 0.78 : 0.84}
      >
        <PalmTreePlant activity={activity} />
      </group>
    </HeadReferencePlantPotAccessory>
  )
}

function HeadMyrtlePotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  return (
    <HeadReferencePlantPotAccessory activity={activity} pot={pot}>
      <group position={[0, -0.015, 0]} scale={0.92}>
        <MyrtlePlant activity={activity} />
      </group>
    </HeadReferencePlantPotAccessory>
  )
}

function HeadLavenderPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  return (
    <HeadReferencePlantPotAccessory activity={activity} pot={pot}>
      <group position={[0, -0.01, 0]} scale={0.94}>
        <LavenderPlant activity={activity} />
      </group>
    </HeadReferencePlantPotAccessory>
  )
}

function HeadDandelionPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  return (
    <HeadReferencePlantPotAccessory activity={activity} pot={pot}>
      <group position={[0, 0, 0]}>
        <DandelionPlant activity={activity} />
      </group>
    </HeadReferencePlantPotAccessory>
  )
}

function HeadSproutPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  return (
    <HeadReferencePlantPotAccessory activity={activity} pot={pot}>
      <group position={[0, -0.01, 0]} scale={0.9}>
        <SproutPlant activity={activity} />
      </group>
    </HeadReferencePlantPotAccessory>
  )
}

function HeadBunchOfFlowersPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  return (
    <HeadReferencePlantPotAccessory activity={activity} pot={pot}>
      <group position={[0, -0.005, 0]} scale={0.96}>
        <BunchOfFlowersPlant activity={activity} />
      </group>
    </HeadReferencePlantPotAccessory>
  )
}

function HeadRosesPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  return (
    <HeadReferencePlantPotAccessory activity={activity} pot={pot}>
      <group
        position={[
          0,
          pot === 'purple-cube-pot' ? -0.045 : -0.01,
          0,
        ]}
        scale={pot === 'purple-cube-pot' ? 0.82 : 1.04}
      >
        <RosesPlant activity={activity} />
      </group>
    </HeadReferencePlantPotAccessory>
  )
}

function HeadBonsaiPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  return (
    <HeadReferencePlantPotAccessory activity={activity} pot={pot}>
      <group
        position={[
          0,
          pot === 'purple-cube-pot' ? -0.065 : -0.012,
          0,
        ]}
        scale={pot === 'purple-cube-pot' ? 0.66 : 0.98}
      >
        <BonsaiPlant activity={activity} />
      </group>
    </HeadReferencePlantPotAccessory>
  )
}

function HeadBonsaiSakuraPotAccessory({
  activity = 1,
  pot = 'blue-flower-pot',
}: {
  activity?: number
  pot?: GlowbudPotTrait
}) {
  return (
    <HeadReferencePlantPotAccessory activity={activity} pot={pot}>
      <group
        position={[
          0,
          pot === 'purple-cube-pot' ? -0.08 : -0.018,
          0,
        ]}
        scale={pot === 'purple-cube-pot' ? 0.61 : 0.92}
      >
        <SakuraBonsaiPlant activity={activity} />
      </group>
    </HeadReferencePlantPotAccessory>
  )
}

function CanaryBirbCompanion({
  activity = 1,
  animation = 'idle',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const torsoGroup = useRef<THREE.Group>(null)
  const headGroup = useRef<THREE.Group>(null)
  const tailGroup = useRef<THREE.Group>(null)
  const nearWingGroup = useRef<THREE.Group>(null)
  const farWingGroup = useRef<THREE.Group>(null)
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const actionT = actionTime(t)
    const hop = getHopMotion(actionT, animation === 'hop' ? motion : 0)
    const performance = getDirectedPerformanceMotion(actionT, animation, motion)
    const breathe = Math.sin(t * 1.42 + 0.7) * motion
    const softSway = Math.sin(t * 0.72 + 0.2) * motion
    const curious = idlePulse(t, 6.4, 0.54, 0.12) * motion
    const chirp = idlePulse(t, 4.9, 0.72, 0.055) * motion
    const tailFlick =
      Math.max(idlePulse(t, 5.7, 0.38, 0.042), idlePulse(t, 5.7, 0.46, 0.035) * 0.65) * motion

    if (torsoGroup.current) {
      torsoGroup.current.position.set(
        hop.x * 0.12 + performance.companionLean * 0.08,
        breathe * 0.0028 - hop.prep * 0.008 + hop.launch * 0.01 - hop.land * 0.006 + performance.companionLift,
        0,
      )
      torsoGroup.current.rotation.set(
        0,
        0,
        -0.035 + softSway * 0.008 + hop.rotateZ * 0.22 + performance.companionLean,
      )
      torsoGroup.current.scale.set(
        1 + breathe * 0.004 + chirp * 0.008 + hop.prep * 0.035 + hop.land * 0.045,
        1 - breathe * 0.006 - chirp * 0.005 - hop.prep * 0.045 + hop.launch * 0.045 - hop.land * 0.055,
        1 + breathe * 0.003 + hop.land * 0.025,
      )
    }
    if (headGroup.current) {
      headGroup.current.position.set(
        -0.08 - curious * 0.012 - chirp * 0.008 + performance.companionLook * 0.02,
        0.24 + curious * 0.014 - chirp * 0.007 + performance.companionLift * 0.18,
        0,
      )
      headGroup.current.rotation.set(
        0,
        softSway * 0.025,
        -0.018
          + softSway * 0.012
          + curious * 0.22
          - chirp * 0.08
          + hop.rotateZ * 0.08
          + performance.companionLook,
      )
      headGroup.current.scale.set(1 + chirp * 0.008, 1 - chirp * 0.012, 1)
    }
    if (tailGroup.current) {
      tailGroup.current.rotation.z = softSway * 0.018 + tailFlick * 0.16 - hop.rotateZ * 0.08
    }
    if (nearWingGroup.current) {
      nearWingGroup.current.rotation.z =
        0.12 + breathe * 0.012 + chirp * 0.1 + hop.launch * 0.045 + performance.boogieBounce * 0.09
    }
    if (farWingGroup.current) {
      farWingGroup.current.rotation.z =
        0.12 - breathe * 0.01 + chirp * 0.075 + hop.launch * 0.032 + performance.boogieBounce * 0.065
    }
  })

  return (
    <group>
      <mesh position={[1.24, -0.622, -0.67]} rotation-z={0.04} scale={[0.27, 0.024, 0.105]}>
        <sphereGeometry args={[1, 12, 6]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <group position={[1.24, -0.575, -0.67]}>
        <CurvedTube
          points={[
            [-0.038, 0.062, -0.035],
            [-0.042, 0.012, -0.035],
            [-0.052, -0.032, -0.035],
          ]}
          radius={0.013}
          color={CANARY_LEG_ORANGE}
          outlineWidth={0.0035}
        />
        <CurvedTube
          points={[
            [0.045, 0.06, 0.028],
            [0.052, 0.008, 0.028],
            [0.044, -0.034, 0.028],
          ]}
          radius={0.013}
          color={CANARY_LEG_ORANGE}
          outlineWidth={0.0035}
        />
        <CodedAssetOutlineMesh
          position={[-0.07, -0.034, -0.05]}
          rotation-z={0.08}
          scale={[0.068, 0.021, 0.046]}
          outlineWidth={0.004}
          geometry={<sphereGeometry args={[1, 10, 5]} />}
          material={toon(CANARY_BEAK_ORANGE)}
        />
        <CodedAssetOutlineMesh
          position={[-0.096, -0.049, -0.074]}
          rotation-z={0.18}
          scale={[0.045, 0.012, 0.022]}
          outlineWidth={0.003}
          geometry={<sphereGeometry args={[1, 9, 5]} />}
          material={toon(CANARY_BEAK_LIGHT)}
        />
        <CodedAssetOutlineMesh
          position={[-0.046, -0.049, -0.075]}
          rotation-z={-0.12}
          scale={[0.042, 0.012, 0.022]}
          outlineWidth={0.003}
          geometry={<sphereGeometry args={[1, 9, 5]} />}
          material={toon(CANARY_BEAK_LIGHT)}
        />
        <CodedAssetOutlineMesh
          position={[0.024, -0.036, 0.008]}
          rotation-z={-0.04}
          scale={[0.07, 0.021, 0.046]}
          outlineWidth={0.004}
          geometry={<sphereGeometry args={[1, 10, 5]} />}
          material={toon(CANARY_BEAK_ORANGE)}
        />
        <CodedAssetOutlineMesh
          position={[-0.004, -0.05, -0.014]}
          rotation-z={0.1}
          scale={[0.043, 0.012, 0.021]}
          outlineWidth={0.003}
          geometry={<sphereGeometry args={[1, 9, 5]} />}
          material={toon(CANARY_BEAK_LIGHT)}
        />
        <CodedAssetOutlineMesh
          position={[0.05, -0.05, -0.012]}
          rotation-z={-0.14}
          scale={[0.044, 0.012, 0.021]}
          outlineWidth={0.003}
          geometry={<sphereGeometry args={[1, 9, 5]} />}
          material={toon(CANARY_BEAK_LIGHT)}
        />
        <group ref={torsoGroup} rotation-z={-0.035}>
          <CodedAssetOutlineMesh
            position={[0.01, 0.174, 0]}
            rotation={[0.02, -0.04, -0.03]}
            scale={[0.228, 0.172, 0.154]}
            outlineWidth={0.016}
            geometry={<sphereGeometry args={[1, 18, 12]} />}
            material={toon(CANARY_YELLOW_MID)}
          />
          <group ref={tailGroup} position={[0.18, 0.21, 0.01]}>
            <CodedAssetOutlineMesh
              position={[0.002, -0.026, 0]}
              rotation-z={0.34}
              scale={[0.12, 0.066, 0.095]}
              outlineWidth={0.007}
              geometry={<sphereGeometry args={[1, 12, 7]} />}
              material={toon(CANARY_YELLOW_DARK)}
            />
            <CodedAssetOutlineMesh
              position={[0.014, 0.028, 0.008]}
              rotation-z={-0.16}
              scale={[0.102, 0.06, 0.086]}
              outlineWidth={0.007}
              geometry={<sphereGeometry args={[1, 12, 7]} />}
              material={toon(CANARY_YELLOW_MID)}
            />
            <CodedAssetOutlineMesh
              position={[-0.004, 0.002, -0.038]}
              rotation-z={0.08}
              scale={[0.092, 0.05, 0.068]}
              outlineWidth={0.005}
              geometry={<sphereGeometry args={[1, 12, 7]} />}
              material={toon(CANARY_YELLOW_LIGHT)}
            />
          </group>
          <group ref={nearWingGroup} position={[0.034, 0.15, -0.137]} rotation={[0.06, 0.08, 0.12]}>
            <CodedAssetOutlineMesh
              scale={[0.12, 0.092, 0.04]}
              outlineWidth={0.0055}
              geometry={<sphereGeometry args={[1, 14, 8]} />}
              material={toon(CANARY_WING_GOLD)}
            />
            <CodedAssetOutlineMesh
              position={[-0.016, 0.018, -0.033]}
              rotation-z={0.16}
              scale={[0.078, 0.036, 0.015]}
              outlineWidth={0.0035}
              geometry={<sphereGeometry args={[1, 12, 6]} />}
              material={toon(CANARY_YELLOW_LIGHT)}
            />
            <CodedAssetOutlineMesh
              position={[0.026, -0.022, -0.034]}
              rotation-z={-0.14}
              scale={[0.07, 0.032, 0.014]}
              outlineWidth={0.0035}
              geometry={<sphereGeometry args={[1, 12, 6]} />}
              material={toon(CANARY_YELLOW_DARK)}
            />
          </group>
          <group ref={farWingGroup} position={[0.034, 0.15, 0.137]} rotation={[-0.06, -0.08, 0.12]}>
            <CodedAssetOutlineMesh
              scale={[0.12, 0.092, 0.04]}
              outlineWidth={0.0055}
              geometry={<sphereGeometry args={[1, 14, 8]} />}
              material={toon(CANARY_YELLOW_DARK)}
            />
            <CodedAssetOutlineMesh
              position={[-0.016, 0.018, 0.033]}
              rotation-z={0.16}
              scale={[0.078, 0.036, 0.015]}
              outlineWidth={0.0035}
              geometry={<sphereGeometry args={[1, 12, 6]} />}
              material={toon(CANARY_YELLOW_MID)}
            />
            <CodedAssetOutlineMesh
              position={[0.026, -0.022, 0.034]}
              rotation-z={-0.14}
              scale={[0.07, 0.032, 0.014]}
              outlineWidth={0.0035}
              geometry={<sphereGeometry args={[1, 12, 6]} />}
              material={toon(CANARY_WING_GOLD)}
            />
          </group>
          <group ref={headGroup} position={[-0.08, 0.24, 0]} rotation-z={-0.018}>
            <CodedAssetOutlineMesh
              position={[0.012, 0.004, -0.008]}
              rotation={[0.02, -0.06, 0.04]}
              scale={[0.148, 0.118, 0.14]}
              outlineWidth={0.008}
              geometry={<sphereGeometry args={[1, 16, 10]} />}
              material={toon(CANARY_YELLOW_LIGHT)}
            />
            <CodedAssetOutlineMesh
              position={[-0.012, 0.112, 0.014]}
              rotation-z={0.18}
              scale={[0.058, 0.068, 0.052]}
              outlineWidth={0.005}
              geometry={<sphereGeometry args={[1, 10, 6]} />}
              material={toon(CANARY_YELLOW_MID)}
            />
            <CodedAssetOutlineMesh
              position={[0.06, 0.11, 0.018]}
              rotation-z={-0.28}
              scale={[0.052, 0.062, 0.048]}
              outlineWidth={0.005}
              geometry={<sphereGeometry args={[1, 10, 6]} />}
              material={toon(CANARY_YELLOW_LIGHT)}
            />
            <CodedAssetOutlineMesh
              position={[-0.138, 0.002, 0]}
              rotation-z={Math.PI / 2}
              outlineWidth={0.006}
              geometry={<coneGeometry args={[0.062, 0.188, 6]} />}
              material={toon(CANARY_BEAK_LIGHT)}
            />
            <CodedAssetOutlineMesh
              position={[-0.128, -0.042, 0]}
              rotation={[0, 0, Math.PI / 2 - 0.08]}
              outlineWidth={0.005}
              geometry={<coneGeometry args={[0.05, 0.166, 6]} />}
              material={toon(CANARY_BEAK_ORANGE)}
            />
            <CurvedTube
              points={[
                [-0.214, -0.014, -0.034],
                [-0.166, -0.022, -0.052],
                [-0.106, -0.024, -0.05],
              ]}
              radius={0.0038}
              color={VAC_ASSET_DETAIL_INK}
              outlineWidth={0.0015}
            />
            <CurvedTube
              points={[
                [-0.214, -0.014, 0.034],
                [-0.166, -0.022, 0.052],
                [-0.106, -0.024, 0.05],
              ]}
              radius={0.0038}
              color={VAC_ASSET_DETAIL_INK}
              outlineWidth={0.0015}
            />
            <CodedAssetOutlineMesh
              position={[-0.032, 0.038, -0.13]}
              scale={[0.029, 0.033, 0.022]}
              outlineWidth={0.004}
              geometry={<sphereGeometry args={[1, 12, 8]} />}
              material={toon(VAC_ASSET_DETAIL_INK)}
            />
            <mesh position={[-0.043, 0.049, -0.151]} scale={[0.007, 0.008, 0.004]}>
              <sphereGeometry args={[1, 8, 5]} />
              <meshBasicMaterial color="#fff7c8" />
            </mesh>
            <CodedAssetOutlineMesh
              position={[-0.032, 0.038, 0.13]}
              scale={[0.029, 0.033, 0.022]}
              outlineWidth={0.004}
              geometry={<sphereGeometry args={[1, 12, 8]} />}
              material={toon(VAC_ASSET_DETAIL_INK)}
            />
            <mesh position={[-0.043, 0.049, 0.151]} scale={[0.007, 0.008, 0.004]}>
              <sphereGeometry args={[1, 8, 5]} />
              <meshBasicMaterial color="#fff7c8" />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  )
}

function CardinalBirbCompanion({
  activity = 1,
  animation = 'idle',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const torsoGroup = useRef<THREE.Group>(null)
  const headGroup = useRef<THREE.Group>(null)
  const tailGroup = useRef<THREE.Group>(null)
  const nearWingGroup = useRef<THREE.Group>(null)
  const farWingGroup = useRef<THREE.Group>(null)
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const actionT = actionTime(t)
    const hop = getHopMotion(actionT, animation === 'hop' ? motion : 0)
    const performance = getDirectedPerformanceMotion(actionT, animation, motion)
    const breathe = Math.sin(t * 1.28 + 0.4) * motion
    const watch = Math.sin(t * 0.58 + 0.9) * motion
    const alert = idlePulse(t, 5.9, 0.62, 0.075) * motion
    const secondLook = idlePulse(t, 5.9, 0.76, 0.042) * motion
    const featherSettle = idlePulse(t, 7.2, 0.42, 0.08) * motion

    if (torsoGroup.current) {
      torsoGroup.current.position.set(
        hop.x * 0.1 + performance.companionLean * 0.08,
        breathe * 0.0024 - hop.prep * 0.007 + hop.launch * 0.009 - hop.land * 0.005 + performance.companionLift,
        0,
      )
      torsoGroup.current.rotation.set(
        0,
        0,
        0.025 + watch * 0.006 + alert * 0.012 + hop.rotateZ * 0.18 + performance.companionLean,
      )
      torsoGroup.current.scale.set(
        1 + breathe * 0.004 + hop.prep * 0.032 + hop.land * 0.04,
        1 - breathe * 0.006 - hop.prep * 0.04 + hop.launch * 0.04 - hop.land * 0.05,
        1 + breathe * 0.003 + hop.land * 0.02,
      )
    }
    if (headGroup.current) {
      headGroup.current.position.set(
        0.13 + alert * 0.01 + performance.companionLook * 0.02,
        0.22 + alert * 0.018 + secondLook * 0.006 + performance.companionLift * 0.18,
        0,
      )
      headGroup.current.rotation.set(
        0,
        watch * 0.02,
        0.018
          + watch * 0.01
          - alert * 0.25
          + secondLook * 0.13
          + hop.rotateZ * 0.07
          + performance.companionLook,
      )
      headGroup.current.scale.set(1 + alert * 0.008, 1 - alert * 0.006, 1)
    }
    if (tailGroup.current) {
      tailGroup.current.rotation.z =
        -0.04 + watch * 0.014 + alert * 0.18 - secondLook * 0.09 - hop.rotateZ * 0.08
    }
    if (nearWingGroup.current) {
      nearWingGroup.current.rotation.z =
        -0.08 + breathe * 0.01 + featherSettle * 0.1 + hop.launch * 0.04 + performance.boogieBounce * 0.09
    }
    if (farWingGroup.current) {
      farWingGroup.current.rotation.z =
        -0.08 - breathe * 0.008 + featherSettle * 0.075 + hop.launch * 0.03 + performance.boogieBounce * 0.065
    }
  })

  return (
    <group>
      <mesh position={[-1.3, -0.622, -0.67]} rotation-z={-0.03} scale={[0.3, 0.024, 0.1]}>
        <sphereGeometry args={[1, 12, 6]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <group position={[-1.3, -0.575, -0.67]}>
        <CurvedTube
          points={[
            [0.022, 0.066, -0.036],
            [0.026, 0.016, -0.036],
            [0.036, -0.032, -0.036],
          ]}
          radius={0.0125}
          color={CARDINAL_LEG_ORANGE}
          outlineWidth={0.0035}
        />
        <CurvedTube
          points={[
            [-0.046, 0.064, 0.03],
            [-0.052, 0.012, 0.03],
            [-0.044, -0.034, 0.03],
          ]}
          radius={0.0125}
          color={CARDINAL_LEG_ORANGE}
          outlineWidth={0.0035}
        />
        <CodedAssetOutlineMesh
          position={[0.056, -0.034, -0.05]}
          rotation-z={-0.05}
          scale={[0.065, 0.02, 0.045]}
          outlineWidth={0.004}
          geometry={<sphereGeometry args={[1, 10, 5]} />}
          material={toon(CARDINAL_LEG_ORANGE)}
        />
        <CodedAssetOutlineMesh
          position={[0.03, -0.049, -0.074]}
          rotation-z={0.14}
          scale={[0.043, 0.012, 0.022]}
          outlineWidth={0.003}
          geometry={<sphereGeometry args={[1, 9, 5]} />}
          material={toon(CARDINAL_BEAK_GOLD)}
        />
        <CodedAssetOutlineMesh
          position={[0.082, -0.049, -0.073]}
          rotation-z={-0.16}
          scale={[0.044, 0.012, 0.022]}
          outlineWidth={0.003}
          geometry={<sphereGeometry args={[1, 9, 5]} />}
          material={toon(CARDINAL_BEAK_GOLD)}
        />
        <CodedAssetOutlineMesh
          position={[-0.066, -0.036, 0.012]}
          rotation-z={0.04}
          scale={[0.066, 0.02, 0.045]}
          outlineWidth={0.004}
          geometry={<sphereGeometry args={[1, 10, 5]} />}
          material={toon(CARDINAL_LEG_ORANGE)}
        />
        <CodedAssetOutlineMesh
          position={[-0.092, -0.05, -0.012]}
          rotation-z={0.14}
          scale={[0.043, 0.012, 0.021]}
          outlineWidth={0.003}
          geometry={<sphereGeometry args={[1, 9, 5]} />}
          material={toon(CARDINAL_BEAK_GOLD)}
        />
        <CodedAssetOutlineMesh
          position={[-0.04, -0.05, -0.014]}
          rotation-z={-0.12}
          scale={[0.043, 0.012, 0.021]}
          outlineWidth={0.003}
          geometry={<sphereGeometry args={[1, 9, 5]} />}
          material={toon(CARDINAL_BEAK_GOLD)}
        />
        <group ref={torsoGroup} rotation-z={0.025}>
          <group ref={tailGroup} position={[-0.17, 0.18, 0]} rotation-z={-0.04}>
            <CodedAssetOutlineMesh
              position={[-0.068, -0.03, 0.012]}
              rotation-z={-0.08}
              scale={[0.19, 0.056, 0.09]}
              outlineWidth={0.007}
              geometry={<sphereGeometry args={[1, 13, 7]} />}
              material={toon(CARDINAL_RED_DARK)}
            />
            <CodedAssetOutlineMesh
              position={[-0.082, 0.024, 0]}
              rotation-z={0.12}
              scale={[0.176, 0.055, 0.082]}
              outlineWidth={0.007}
              geometry={<sphereGeometry args={[1, 13, 7]} />}
              material={toon(CARDINAL_RED_MID)}
            />
            <CodedAssetOutlineMesh
              position={[-0.074, -0.002, -0.036]}
              rotation-z={0.04}
              scale={[0.148, 0.047, 0.066]}
              outlineWidth={0.005}
              geometry={<sphereGeometry args={[1, 13, 7]} />}
              material={toon(CARDINAL_RED_LIGHT)}
            />
          </group>
          <CodedAssetOutlineMesh
            position={[0.002, 0.18, 0]}
            rotation={[0.02, 0.02, 0.02]}
            scale={[0.245, 0.132, 0.143]}
            outlineWidth={0.016}
            geometry={<sphereGeometry args={[1, 18, 11]} />}
            material={toon(CARDINAL_RED_MID)}
          />
          <group ref={nearWingGroup} position={[-0.028, 0.176, -0.128]} rotation={[0.05, -0.04, -0.08]}>
            <CodedAssetOutlineMesh
              scale={[0.132, 0.087, 0.041]}
              outlineWidth={0.0055}
              geometry={<sphereGeometry args={[1, 14, 8]} />}
              material={toon(CARDINAL_WING_CORAL)}
            />
            <CodedAssetOutlineMesh
              position={[0.016, 0.018, -0.034]}
              rotation-z={-0.14}
              scale={[0.082, 0.035, 0.015]}
              outlineWidth={0.0035}
              geometry={<sphereGeometry args={[1, 12, 6]} />}
              material={toon(CARDINAL_RED_LIGHT)}
            />
            <CodedAssetOutlineMesh
              position={[-0.03, -0.02, -0.034]}
              rotation-z={0.15}
              scale={[0.072, 0.031, 0.014]}
              outlineWidth={0.0035}
              geometry={<sphereGeometry args={[1, 12, 6]} />}
              material={toon(CARDINAL_RED_DARK)}
            />
          </group>
          <group ref={farWingGroup} position={[-0.028, 0.176, 0.128]} rotation={[-0.05, 0.04, -0.08]}>
            <CodedAssetOutlineMesh
              scale={[0.132, 0.087, 0.041]}
              outlineWidth={0.0055}
              geometry={<sphereGeometry args={[1, 14, 8]} />}
              material={toon(CARDINAL_RED_DARK)}
            />
            <CodedAssetOutlineMesh
              position={[0.016, 0.018, 0.034]}
              rotation-z={-0.14}
              scale={[0.082, 0.035, 0.015]}
              outlineWidth={0.0035}
              geometry={<sphereGeometry args={[1, 12, 6]} />}
              material={toon(CARDINAL_RED_MID)}
            />
            <CodedAssetOutlineMesh
              position={[-0.03, -0.02, 0.034]}
              rotation-z={0.15}
              scale={[0.072, 0.031, 0.014]}
              outlineWidth={0.0035}
              geometry={<sphereGeometry args={[1, 12, 6]} />}
              material={toon(CARDINAL_WING_CORAL)}
            />
          </group>
          <group ref={headGroup} position={[0.13, 0.22, 0]} rotation-z={0.018}>
            <CodedAssetOutlineMesh
              position={[0, 0, -0.006]}
              rotation={[0.02, 0.04, -0.04]}
              scale={[0.142, 0.122, 0.132]}
              outlineWidth={0.008}
              geometry={<sphereGeometry args={[1, 16, 10]} />}
              material={toon(CARDINAL_RED_LIGHT)}
            />
            <CodedAssetOutlineMesh
              position={[-0.022, 0.112, 0.012]}
              rotation-z={-0.24}
              scale={[0.064, 0.072, 0.052]}
              outlineWidth={0.005}
              geometry={<sphereGeometry args={[1, 10, 6]} />}
              material={toon(CARDINAL_RED_LIGHT)}
            />
            <CodedAssetOutlineMesh
              position={[0.034, 0.086, 0.01]}
              rotation-z={0.28}
              scale={[0.052, 0.064, 0.046]}
              outlineWidth={0.005}
              geometry={<sphereGeometry args={[1, 10, 6]} />}
              material={toon(CARDINAL_RED_MID)}
            />
            <CodedAssetOutlineMesh
              position={[0.138, 0.007, 0]}
              rotation-z={-Math.PI / 2}
              outlineWidth={0.006}
              geometry={<coneGeometry args={[0.056, 0.168, 6]} />}
              material={toon(CARDINAL_BEAK_GOLD)}
            />
            <CodedAssetOutlineMesh
              position={[0.124, -0.028, 0]}
              rotation={[0, 0, -Math.PI / 2 + 0.08]}
              outlineWidth={0.005}
              geometry={<coneGeometry args={[0.044, 0.145, 6]} />}
              material={toon(CARDINAL_LEG_ORANGE)}
            />
            <CurvedTube
              points={[
                [0.212, -0.01, -0.032],
                [0.164, -0.018, -0.049],
                [0.108, -0.02, -0.048],
              ]}
              radius={0.0038}
              color={VAC_ASSET_DETAIL_INK}
              outlineWidth={0.0015}
            />
            <CurvedTube
              points={[
                [0.212, -0.01, 0.032],
                [0.164, -0.018, 0.049],
                [0.108, -0.02, 0.048],
              ]}
              radius={0.0038}
              color={VAC_ASSET_DETAIL_INK}
              outlineWidth={0.0015}
            />
            <CodedAssetOutlineMesh
              position={[-0.012, 0.036, -0.125]}
              scale={[0.032, 0.035, 0.023]}
              outlineWidth={0.004}
              geometry={<sphereGeometry args={[1, 12, 8]} />}
              material={toon(VAC_ASSET_DETAIL_INK)}
            />
            <mesh position={[0, 0.048, -0.146]} scale={[0.007, 0.008, 0.004]}>
              <sphereGeometry args={[1, 8, 5]} />
              <meshBasicMaterial color="#fff3ba" />
            </mesh>
            <CodedAssetOutlineMesh
              position={[-0.012, 0.036, 0.125]}
              scale={[0.032, 0.035, 0.023]}
              outlineWidth={0.004}
              geometry={<sphereGeometry args={[1, 12, 8]} />}
              material={toon(VAC_ASSET_DETAIL_INK)}
            />
            <mesh position={[0, 0.048, 0.146]} scale={[0.007, 0.008, 0.004]}>
              <sphereGeometry args={[1, 8, 5]} />
              <meshBasicMaterial color="#fff3ba" />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  )
}

function ToadCompanion({
  activity = 1,
  animation = 'idle',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const toadGroup = useRef<THREE.Group>(null)
  const leftEyeFront = useRef<THREE.Group>(null)
  const rightEyeFront = useRef<THREE.Group>(null)
  const throatGroup = useRef<THREE.Group>(null)
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const actionT = actionTime(t)
    const hop = getHopMotion(actionT, animation === 'hop' ? motion : 0)
    const performance = getDirectedPerformanceMotion(actionT, animation, motion)
    const breathe = Math.sin(t * 1.36 + 0.4) * motion
    const blink =
      Math.max(idlePulse(t, 5.6, 0.64, 0.032), idlePulse(t, 5.6, 0.73, 0.024) * 0.62) * motion
    const croak =
      (idlePulse(t, 6.8, 0.55, 0.082) + idlePulse(t, 6.8, 0.7, 0.055) * 0.42) * motion
    const gazeX = Math.sin(t * 0.54 + 0.8) * 0.0045 * motion
    const gazeY = Math.sin(t * 0.72 + 0.2) * 0.002 * motion
    const blinkScale = Math.max(0.1, 1 - blink * 0.9)

    if (toadGroup.current) {
      toadGroup.current.position.set(
        hop.x * 0.08 + performance.companionLean * 0.07,
        breathe * 0.0025 - hop.prep * 0.006 + hop.launch * 0.007 + performance.companionLift,
        0,
      )
      toadGroup.current.rotation.z =
        -0.015
        + Math.sin(t * 0.78) * 0.006 * motion
        + hop.rotateZ * 0.12
        + performance.companionLean
      toadGroup.current.scale.set(
        1 + breathe * 0.007 + croak * 0.008 + hop.prep * 0.04 + hop.land * 0.05,
        1 - breathe * 0.009 - croak * 0.004 - hop.prep * 0.05 + hop.launch * 0.035 - hop.land * 0.06,
        1 + breathe * 0.005 + croak * 0.006 + hop.land * 0.025,
      )
    }
    if (leftEyeFront.current) {
      leftEyeFront.current.position.set(
        -0.09 + gazeX + performance.companionLook * 0.012,
        0.302 + gazeY + performance.companionLift * 0.12,
        -0.134,
      )
      leftEyeFront.current.scale.set(1, blinkScale, 1)
    }
    if (rightEyeFront.current) {
      rightEyeFront.current.position.set(
        0.09 + gazeX + performance.companionLook * 0.012,
        0.302 + gazeY + performance.companionLift * 0.12,
        -0.134,
      )
      rightEyeFront.current.scale.set(1, blinkScale, 1)
    }
    if (throatGroup.current) {
      throatGroup.current.position.set(0, 0.17 - croak * 0.002, -0.15)
      throatGroup.current.scale.set(
        1 + croak * 0.12 + performance.boogieBounce * 0.035,
        1 + croak * 0.22 + performance.waveAccent * 0.045,
        1 + croak * 0.11,
      )
    }
  })

  return (
    <group>
      <mesh position={[1.29, -0.622, -0.67]} rotation-z={0.02} scale={[0.34, 0.025, 0.125]}>
        <sphereGeometry args={[1, 12, 6]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <group position={[1.29, -0.578, -0.67]}>
        <group ref={toadGroup} rotation-z={-0.015}>
          <CodedAssetOutlineMesh
            position={[-0.236, 0.076, 0.026]}
            rotation-z={-0.12}
            scale={[0.15, 0.085, 0.142]}
            outlineWidth={0.012}
            geometry={<sphereGeometry args={[1, 14, 8]} />}
            material={toon(TOAD_GREEN_MID)}
          />
          <CodedAssetOutlineMesh
            position={[-0.252, 0.088, -0.084]}
            rotation-z={-0.16}
            scale={[0.086, 0.046, 0.048]}
            outlineWidth={0.0045}
            geometry={<sphereGeometry args={[1, 12, 7]} />}
            material={toon(TOAD_GREEN_LIGHT)}
          />
          <CodedAssetOutlineMesh
            position={[0.236, 0.076, 0.026]}
            rotation-z={0.12}
            scale={[0.15, 0.085, 0.142]}
            outlineWidth={0.012}
            geometry={<sphereGeometry args={[1, 14, 8]} />}
            material={toon(TOAD_GREEN_MID)}
          />
          <CodedAssetOutlineMesh
            position={[0.252, 0.088, -0.084]}
            rotation-z={0.16}
            scale={[0.086, 0.046, 0.048]}
            outlineWidth={0.0045}
            geometry={<sphereGeometry args={[1, 12, 7]} />}
            material={toon(TOAD_GREEN_LIGHT)}
          />
          <CodedAssetOutlineMesh
            position={[0, 0.116, 0.012]}
            scale={[0.275, 0.14, 0.17]}
            outlineWidth={0.016}
            geometry={<sphereGeometry args={[1, 18, 11]} />}
            material={toon(TOAD_GREEN_DARK)}
          />
          <CodedAssetOutlineMesh
            position={[0, 0.196, -0.012]}
            scale={[0.242, 0.135, 0.158]}
            outlineWidth={0.01}
            geometry={<sphereGeometry args={[1, 18, 11]} />}
            material={toon(TOAD_GREEN_LIGHT)}
          />
          <CodedAssetOutlineMesh
            position={[-0.164, 0.018, -0.054]}
            rotation-z={0.06}
            scale={[0.155, 0.042, 0.09]}
            outlineWidth={0.006}
            geometry={<sphereGeometry args={[1, 12, 6]} />}
            material={toon(TOAD_GREEN_DARK)}
          />
          <CodedAssetOutlineMesh
            position={[-0.228, -0.002, -0.126]}
            rotation-z={0.18}
            scale={[0.055, 0.021, 0.032]}
            outlineWidth={0.004}
            geometry={<sphereGeometry args={[1, 10, 6]} />}
            material={toon(TOAD_GREEN_MID)}
          />
          <CodedAssetOutlineMesh
            position={[-0.168, -0.006, -0.136]}
            rotation-z={0.02}
            scale={[0.057, 0.022, 0.034]}
            outlineWidth={0.004}
            geometry={<sphereGeometry args={[1, 10, 6]} />}
            material={toon(TOAD_GREEN_LIGHT)}
          />
          <CodedAssetOutlineMesh
            position={[-0.108, -0.002, -0.126]}
            rotation-z={-0.18}
            scale={[0.055, 0.021, 0.032]}
            outlineWidth={0.004}
            geometry={<sphereGeometry args={[1, 10, 6]} />}
            material={toon(TOAD_GREEN_MID)}
          />
          <CodedAssetOutlineMesh
            position={[0.164, 0.018, -0.054]}
            rotation-z={-0.06}
            scale={[0.155, 0.042, 0.09]}
            outlineWidth={0.006}
            geometry={<sphereGeometry args={[1, 12, 6]} />}
            material={toon(TOAD_GREEN_DARK)}
          />
          <CodedAssetOutlineMesh
            position={[0.108, -0.002, -0.126]}
            rotation-z={0.18}
            scale={[0.055, 0.021, 0.032]}
            outlineWidth={0.004}
            geometry={<sphereGeometry args={[1, 10, 6]} />}
            material={toon(TOAD_GREEN_MID)}
          />
          <CodedAssetOutlineMesh
            position={[0.168, -0.006, -0.136]}
            rotation-z={-0.02}
            scale={[0.057, 0.022, 0.034]}
            outlineWidth={0.004}
            geometry={<sphereGeometry args={[1, 10, 6]} />}
            material={toon(TOAD_GREEN_LIGHT)}
          />
          <CodedAssetOutlineMesh
            position={[0.228, -0.002, -0.126]}
            rotation-z={-0.18}
            scale={[0.055, 0.021, 0.032]}
            outlineWidth={0.004}
            geometry={<sphereGeometry args={[1, 10, 6]} />}
            material={toon(TOAD_GREEN_MID)}
          />
          <group ref={throatGroup} position={[0, 0.17, -0.15]}>
            <CodedAssetOutlineMesh
              position={[0, 0.018, 0.002]}
              scale={[0.17, 0.078, 0.034]}
              outlineWidth={0.005}
              geometry={<sphereGeometry args={[1, 14, 7]} />}
              material={toon(TOAD_FACE_LIME)}
            />
            <CodedAssetOutlineMesh
              position={[0, -0.032, -0.021]}
              scale={[0.154, 0.036, 0.025]}
              outlineWidth={0.006}
              geometry={<sphereGeometry args={[1, 14, 6]} />}
              material={toon(TOAD_MOUTH_RED)}
            />
          </group>
          <CodedAssetOutlineMesh
            position={[-0.09, 0.302, -0.066]}
            scale={[0.086, 0.084, 0.086]}
            outlineWidth={0.006}
            geometry={<sphereGeometry args={[1, 14, 9]} />}
            material={toon(TOAD_GREEN_MID)}
          />
          <CodedAssetOutlineMesh
            position={[-0.09, 0.348, -0.104]}
            rotation-z={0.08}
            scale={[0.068, 0.024, 0.036]}
            outlineWidth={0.0035}
            geometry={<sphereGeometry args={[1, 11, 6]} />}
            material={toon(TOAD_GREEN_LIGHT)}
          />
          <CodedAssetOutlineMesh
            position={[0.09, 0.302, -0.066]}
            scale={[0.086, 0.084, 0.086]}
            outlineWidth={0.006}
            geometry={<sphereGeometry args={[1, 14, 9]} />}
            material={toon(TOAD_GREEN_MID)}
          />
          <CodedAssetOutlineMesh
            position={[0.09, 0.348, -0.104]}
            rotation-z={-0.08}
            scale={[0.068, 0.024, 0.036]}
            outlineWidth={0.0035}
            geometry={<sphereGeometry args={[1, 11, 6]} />}
            material={toon(TOAD_GREEN_LIGHT)}
          />
          <group ref={leftEyeFront} position={[-0.09, 0.302, -0.134]}>
            <CodedAssetOutlineMesh
              scale={[0.064, 0.062, 0.03]}
              outlineWidth={0.004}
              geometry={<sphereGeometry args={[1, 14, 9]} />}
              material={toon(EYE_WHITE)}
            />
            <mesh position={[0.016, -0.01, -0.032]} scale={[0.026, 0.033, 0.012]}>
              <sphereGeometry args={[1, 10, 7]} />
              <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
            </mesh>
            <mesh position={[0.007, 0.004, -0.044]} scale={[0.007, 0.008, 0.004]}>
              <sphereGeometry args={[1, 7, 5]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
          <group ref={rightEyeFront} position={[0.09, 0.302, -0.134]}>
            <CodedAssetOutlineMesh
              scale={[0.064, 0.062, 0.03]}
              outlineWidth={0.004}
              geometry={<sphereGeometry args={[1, 14, 9]} />}
              material={toon(EYE_WHITE)}
            />
            <mesh position={[0.016, -0.01, -0.032]} scale={[0.026, 0.033, 0.012]}>
              <sphereGeometry args={[1, 10, 7]} />
              <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
            </mesh>
            <mesh position={[0.007, 0.004, -0.044]} scale={[0.007, 0.008, 0.004]}>
              <sphereGeometry args={[1, 7, 5]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  )
}

function CartoonGrassSnailCompanion({
  activity = 1,
  animation = 'idle',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const snailGroup = useRef<THREE.Group>(null)
  const eyeGroup = useRef<THREE.Group>(null)
  const leftEyeFront = useRef<THREE.Group>(null)
  const rightEyeFront = useRef<THREE.Group>(null)
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const actionT = actionTime(t)
    const hop = getHopMotion(actionT, animation === 'hop' ? motion : 0)
    const performance = getDirectedPerformanceMotion(actionT, animation, motion)
    const happySnug = idlePulse(t, 6.2, 0.71, 0.058) * motion
    const slowBob = Math.sin(t * 1.16 + 0.4) * 0.012 * motion
    const slowScan = Math.sin(t * 0.56 + 0.8) * motion
    const antennaTwitch =
      Math.max(idlePulse(t, 7.4, 0.45, 0.04), idlePulse(t, 7.4, 0.52, 0.028) * 0.55) * motion
    const leftBlink = idlePulse(t, 7.8, 0.68, 0.033) * motion
    const rightBlink = idlePulse(t, 7.8, 0.695, 0.033) * motion
    const tinyJelly = Math.sin(t * 8.6 + 0.2) * 0.0035 * motion

    if (snailGroup.current) {
      const scale = 0.78 + happySnug * 0.014
      snailGroup.current.position.set(
        -1.02 + tinyJelly * 0.18 + hop.x * 0.035 + performance.companionLean * 0.055,
        -0.535
          + slowBob * 0.32
          + happySnug * 0.006
          - hop.prep * 0.004
          + hop.land * 0.003
          + performance.companionLift * 0.72,
        -0.66,
      )
      snailGroup.current.rotation.set(
        0.02 + Math.sin(t * 1.02 + 0.5) * 0.01 * motion,
        -0.12 + slowScan * 0.008,
        0.08
          + Math.sin(t * 0.92) * 0.012 * motion
          + tinyJelly
          + hop.rotateZ * 0.045
          + performance.companionLean * 0.55,
      )
      snailGroup.current.scale.set(
        scale + hop.prep * 0.014,
        scale + happySnug * 0.014 - hop.prep * 0.02 + hop.launch * 0.018,
        scale,
      )
    }
    if (eyeGroup.current) {
      eyeGroup.current.position.set(
        0.36 + slowScan * 0.006 - happySnug * 0.008 + performance.companionLook * 0.02,
        0.15 + slowBob * 0.12 + happySnug * 0.008 + performance.companionLift * 0.1,
        -0.1,
      )
      eyeGroup.current.rotation.set(
        0,
        slowScan * 0.08,
        -0.012 + slowScan * 0.065 + antennaTwitch * 0.09 + performance.companionLook * 0.7,
      )
      eyeGroup.current.scale.set(1, 1 + happySnug * 0.018 + antennaTwitch * 0.03, 1)
    }
    if (leftEyeFront.current) {
      leftEyeFront.current.scale.set(1, Math.max(0.12, 1 - leftBlink * 0.88), 1)
    }
    if (rightEyeFront.current) {
      rightEyeFront.current.scale.set(1, Math.max(0.12, 1 - rightBlink * 0.88), 1)
    }
  })

  return (
    <group>
      <mesh position={[-1.02, -0.622, -0.668]} rotation-z={0.08} scale={[0.33, 0.028, 0.076]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <group ref={snailGroup} position={[-1.02, -0.535, -0.66]} rotation={[0.02, -0.12, 0.08]} scale={0.78}>
        <CurvedTube
          points={[
            [-0.34, -0.018, 0.006],
            [-0.216, 0.016, -0.008],
            [-0.02, 0.006, -0.018],
            [0.176, 0.018, -0.04],
            [0.334, 0.086, -0.086],
          ]}
          radius={0.07}
          color={SNAIL_GREEN_MID}
          outlineWidth={0.012}
        />
        <CodedAssetOutlineMesh
          position={[-0.02, -0.06, 0.016]}
          rotation-z={-0.01}
          scale={[0.41, 0.054, 0.116]}
          outlineWidth={0.006}
          geometry={<sphereGeometry args={[1, 14, 6]} />}
          material={toon(SNAIL_GREEN_DARK)}
        />
        <CodedAssetOutlineMesh
          position={[0.36, 0.094, -0.102]}
          rotation-z={-0.02}
          scale={[0.142, 0.104, 0.098]}
          outlineWidth={0.01}
          geometry={<sphereGeometry args={[1, 18, 10]} />}
          material={toon(SNAIL_GREEN_MID)}
        />
        <CodedAssetOutlineMesh
          position={[0.292, 0.04, -0.06]}
          rotation-z={-0.26}
          scale={[0.086, 0.046, 0.064]}
          outlineWidth={0.005}
          geometry={<sphereGeometry args={[1, 12, 6]} />}
          material={toon(SNAIL_GREEN_DARK)}
        />
        <CurvedTube
          points={[
            [-0.358, -0.006, 0.014],
            [-0.464, 0.036, -0.006],
            [-0.44, 0.092, -0.022],
            [-0.32, 0.08, -0.008],
          ]}
          radius={0.032}
          color={SNAIL_GREEN_DARK}
          outlineWidth={0.007}
        />
        <CodedAssetOutlineMesh
          position={[-0.112, 0.042, 0.028]}
          rotation-y={-0.16}
          rotation-z={-0.06}
          scale={[0.21, 0.085, 0.145]}
          outlineWidth={0.008}
          geometry={<sphereGeometry args={[1, 18, 10]} />}
          material={toon(SNAIL_GREEN_DARK)}
        />
        <CodedAssetOutlineMesh
          position={[-0.12, 0.11, 0.02]}
          rotation-y={-0.2}
          rotation-z={-0.08}
          scale={[0.218, 0.19, 0.18]}
          outlineWidth={0.014}
          geometry={<sphereGeometry args={[1, 24, 14]} />}
          material={toon(SNAIL_SHELL_MID)}
        />
        <CodedAssetOutlineMesh
          position={[-0.096, 0.14, -0.058]}
          rotation-y={-0.24}
          rotation-z={-0.08}
          scale={[0.176, 0.158, 0.132]}
          outlineWidth={0.006}
          geometry={<sphereGeometry args={[1, 20, 12]} />}
          material={toon(SNAIL_SHELL_LIGHT)}
        />
        <CodedAssetOutlineMesh
          position={[-0.174, 0.078, 0.072]}
          rotation-y={-0.08}
          rotation-z={-0.22}
          scale={[0.112, 0.074, 0.098]}
          outlineWidth={0.005}
          geometry={<sphereGeometry args={[1, 12, 7]} />}
          material={toon(SNAIL_SHELL_DARK)}
        />
        <mesh position={[-0.072, 0.21, -0.156]} rotation-z={-0.36} scale={[0.082, 0.018, 0.006]}>
          <sphereGeometry args={[1, 9, 4]} />
          <meshBasicMaterial color={SNAIL_MOUTH_CREAM} transparent opacity={0.42} depthWrite={false} />
        </mesh>
        <CurvedTube
          points={[
            [-0.124, 0.116, -0.178],
            [-0.064, 0.13, -0.184],
            [-0.034, 0.176, -0.184],
            [-0.074, 0.226, -0.178],
            [-0.15, 0.216, -0.17],
            [-0.184, 0.152, -0.162],
            [-0.126, 0.086, -0.156],
          ]}
          radius={0.008}
          color={SNAIL_SHELL_DARK}
          outlineWidth={0.003}
        />
        <CurvedTube
          points={[
            [-0.118, 0.13, -0.188],
            [-0.082, 0.148, -0.19],
            [-0.084, 0.186, -0.188],
            [-0.12, 0.202, -0.184],
            [-0.152, 0.174, -0.178],
          ]}
          radius={0.006}
          color={SNAIL_SHELL_MID}
          outlineWidth={0.0025}
        />
        <CurvedTube
          points={[
            [-0.132, 0.144, -0.194],
            [-0.116, 0.162, -0.196],
            [-0.132, 0.178, -0.194],
          ]}
          radius={0.005}
          color={SNAIL_MOUTH_GOLD}
          outlineWidth={0.002}
        />
        <mesh position={[0.39, 0.096, -0.188]} rotation-z={-0.04} scale={[0.062, 0.018, 0.008]}>
          <sphereGeometry args={[1, 10, 4]} />
          <meshBasicMaterial color={SNAIL_MOUTH_GOLD} />
        </mesh>
        <mesh position={[0.394, 0.074, -0.192]} rotation-z={0.02} scale={[0.06, 0.018, 0.008]}>
          <sphereGeometry args={[1, 10, 4]} />
          <meshBasicMaterial color={SNAIL_MOUTH_ORANGE} />
        </mesh>
        <mesh position={[0.39, 0.084, -0.202]} rotation-z={-0.02} scale={[0.044, 0.004, 0.003]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
        </mesh>
        <mesh position={[0.322, 0.082, -0.184]} rotation-z={-0.3} scale={[0.018, 0.01, 0.004]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={SNAIL_MOUTH_ORANGE} transparent opacity={0.52} depthWrite={false} />
        </mesh>
        <group ref={eyeGroup} position={[0.36, 0.15, -0.1]} rotation-z={-0.012}>
          <CodedAssetOutlineMesh
            position={[-0.034, 0.018, 0]}
            scale={[0.022, 0.018, 0.02]}
            outlineWidth={0.003}
            geometry={<sphereGeometry args={[1, 10, 6]} />}
            material={toon(SNAIL_GREEN_LIGHT)}
          />
          <CodedAssetOutlineMesh
            position={[0.046, 0.018, 0]}
            scale={[0.022, 0.018, 0.02]}
            outlineWidth={0.003}
            geometry={<sphereGeometry args={[1, 10, 6]} />}
            material={toon(SNAIL_GREEN_LIGHT)}
          />
          <CurvedTube
            points={[
              [-0.034, 0.014, 0.002],
              [-0.074, 0.108, -0.038],
            ]}
            radius={0.0075}
            color={SNAIL_GREEN_MID}
            outlineWidth={0.003}
          />
          <CurvedTube
            points={[
              [0.046, 0.014, 0.002],
              [0.088, 0.102, -0.038],
            ]}
            radius={0.0075}
            color={SNAIL_GREEN_MID}
            outlineWidth={0.003}
          />
          <CodedAssetOutlineMesh
            position={[-0.084, 0.124, -0.044]}
            scale={[0.044, 0.052, 0.034]}
            outlineWidth={0.004}
            geometry={<sphereGeometry args={[1, 12, 8]} />}
            material={toon(SNAIL_GREEN_LIGHT)}
          />
          <CodedAssetOutlineMesh
            position={[0.1, 0.118, -0.044]}
            scale={[0.044, 0.052, 0.034]}
            outlineWidth={0.004}
            geometry={<sphereGeometry args={[1, 12, 8]} />}
            material={toon(SNAIL_GREEN_LIGHT)}
          />
          <group ref={leftEyeFront} position={[-0.084, 0.124, -0.058]}>
            <CodedAssetOutlineMesh
              scale={[0.038, 0.046, 0.026]}
              outlineWidth={0.004}
              geometry={<sphereGeometry args={[1, 12, 8]} />}
              material={toon(EYE_WHITE)}
            />
            <mesh position={[0.008, -0.01, -0.025]} scale={[0.013, 0.02, 0.006]}>
              <sphereGeometry args={[1, 8, 5]} />
              <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
            </mesh>
            <mesh position={[-0.002, 0.012, -0.034]} scale={[0.006, 0.007, 0.003]}>
              <sphereGeometry args={[1, 6, 4]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.86} depthWrite={false} />
            </mesh>
          </group>
          <group ref={rightEyeFront} position={[0.1, 0.118, -0.058]}>
            <CodedAssetOutlineMesh
              scale={[0.038, 0.046, 0.026]}
              outlineWidth={0.004}
              geometry={<sphereGeometry args={[1, 12, 8]} />}
              material={toon(EYE_WHITE)}
            />
            <mesh position={[-0.01, -0.01, -0.025]} scale={[0.013, 0.02, 0.006]}>
              <sphereGeometry args={[1, 8, 5]} />
              <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
            </mesh>
            <mesh position={[-0.02, 0.012, -0.034]} scale={[0.006, 0.007, 0.003]}>
              <sphereGeometry args={[1, 6, 4]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.86} depthWrite={false} />
            </mesh>
          </group>
        </group>
        <CurvedTube
          points={[
            [0.342, 0.09, -0.104],
            [0.31, 0.048, -0.148],
          ]}
          radius={0.004}
          color={SNAIL_GREEN_MID}
          outlineWidth={0.002}
        />
        <CurvedTube
          points={[
            [0.432, 0.088, -0.106],
            [0.488, 0.052, -0.148],
          ]}
          radius={0.004}
          color={SNAIL_GREEN_MID}
          outlineWidth={0.002}
        />
        <mesh position={[0.292, 0.122, -0.148]} rotation-z={-0.26} scale={[0.046, 0.01, 0.005]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={SNAIL_GREEN_GLOSS} transparent opacity={0.42} depthWrite={false} />
        </mesh>
        <mesh position={[0.034, 0.038, -0.118]} rotation-z={0.06} scale={[0.162, 0.016, 0.008]}>
          <sphereGeometry args={[1, 9, 4]} />
          <meshBasicMaterial color={SNAIL_GREEN_GLOSS} transparent opacity={0.34} depthWrite={false} />
        </mesh>
        <mesh position={[-0.194, 0.014, -0.09]} rotation-z={-0.34} scale={[0.072, 0.012, 0.006]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={SNAIL_GREEN_LIGHT} transparent opacity={0.36} depthWrite={false} />
        </mesh>
        <OrganicDetailDot position={[0.176, 0.034, -0.102]} scale={[0.008, 0.004, 0.004]} color={SNAIL_GREEN_GLOSS} opacity={0.56} />
        <OrganicDetailDot position={[0.398, 0.136, -0.15]} scale={[0.007, 0.004, 0.004]} color={SNAIL_GREEN_GLOSS} opacity={0.48} />
        <CurvedTube
          points={[
            [-0.286, -0.078, -0.162],
            [-0.3, 0.014, -0.18],
          ]}
          radius={0.004}
          color={GRASS_DARK}
          outlineWidth={0.0015}
        />
        <CurvedTube
          points={[
            [0.118, -0.076, -0.164],
            [0.098, 0.026, -0.19],
          ]}
          radius={0.004}
          color={GRASS_MID}
          outlineWidth={0.0015}
        />
        <CurvedTube
          points={[
            [0.272, -0.072, -0.166],
            [0.306, 0.022, -0.192],
          ]}
          radius={0.0035}
          color={GRASS_LIGHT}
          outlineWidth={0.0015}
        />
      </group>
    </group>
  )
}

function createFlytrapClosedTrapGeometry({ wide = 0, wild = 0 }: { wide?: number; wild?: number }) {
  const longitudeSegments = 72
  const latitudeSegments = 36
  const vertices: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const mouthCutoutMask: boolean[] = []
  const width = 0.292 + wide * 0.082 + wild * 0.016
  const height = 0.232 + wide * 0.052 + wild * 0.014
  const depth = 0.17 + wide * 0.04 + wild * 0.012
  const apertureCenterY = -0.008
  const baseColor = new THREE.Color(FLYTRAP_GREEN_MID)
  const topColor = new THREE.Color(FLYTRAP_GREEN_LIGHT)
  const shadowColor = new THREE.Color(FLYTRAP_GREEN_DARK)
  const spotColor = new THREE.Color(FLYTRAP_SPOT_YELLOW)
  const spotEdgeColor = new THREE.Color(FLYTRAP_SPOT_YELLOW_EDGE)
  const veinColor = new THREE.Color(FLYTRAP_SKIN_VEIN)
  const poreColor = new THREE.Color(FLYTRAP_SKIN_PORE)
  const glazeColor = new THREE.Color(FLYTRAP_SKIN_GLAZE)
  const innerLobeColor = new THREE.Color(FLYTRAP_INNER_LOBE)
  const bulbSpots = [
    { angle: -Math.PI * 0.82, v: 0.5, angleRadius: 0.16, vRadius: 0.115, strength: 0.62 },
    { angle: -Math.PI * 0.62, v: 0.2, angleRadius: 0.128, vRadius: 0.098, strength: 0.5 },
    { angle: -Math.PI * 0.36, v: -0.12, angleRadius: 0.13, vRadius: 0.09, strength: 0.46 },
    { angle: -Math.PI * 0.18, v: 0.42, angleRadius: 0.145, vRadius: 0.108, strength: 0.54 },
    { angle: Math.PI * 0.78, v: 0.22, angleRadius: 0.14, vRadius: 0.102, strength: 0.48 },
    { angle: Math.PI * 0.52, v: 0.5, angleRadius: 0.13, vRadius: 0.09, strength: 0.44 },
    { angle: Math.PI * 0.22, v: -0.3, angleRadius: 0.12, vRadius: 0.082, strength: 0.4 },
    { angle: -Math.PI * 0.48, v: 0.58, angleRadius: 0.105, vRadius: 0.075, strength: 0.38 },
    { angle: Math.PI * 0.9, v: -0.08, angleRadius: 0.102, vRadius: 0.078, strength: 0.36 },
  ]

  for (let latIndex = 0; latIndex <= latitudeSegments; latIndex += 1) {
    const v = -1 + (latIndex / latitudeSegments) * 2
    const vertical = Math.max(0, Math.sqrt(1 - v * v))
    const topBottomPuff = 1 + vertical * 0.052
    const lobeBand = Math.exp(-Math.abs(Math.abs(v - apertureCenterY) - 0.38) * 5.4)
    const hingeWaist = Math.exp(-Math.abs(v - apertureCenterY) * 10.4)

    for (let lonIndex = 0; lonIndex <= longitudeSegments; lonIndex += 1) {
      const angle = (lonIndex / longitudeSegments) * Math.PI * 2
      const cosAngle = Math.cos(angle)
      const sinAngle = Math.sin(angle)
      const front = Math.max(0, -sinAngle)
      const back = Math.max(0, sinAngle)
      const rimSide = Math.max(0, Math.abs(cosAngle) - 0.55)
      const mouthDistance = Math.hypot(
        cosAngle / (0.31 + wide * 0.042 + wild * 0.012),
        (v - apertureCenterY) / (0.225 + wide * 0.034 + wild * 0.012),
      )
      const mouthCutout =
        front > 0.82
        && mouthDistance < 0.72
      const mouthShoulder = front * vertical * Math.exp(-Math.abs(v - apertureCenterY) * 8.6) * Math.exp(-Math.abs(cosAngle) * 1.18)
      const upperJawPuff = front * Math.exp(-Math.abs(v - 0.34) * 5.6) * Math.exp(-Math.abs(cosAngle) * 1.34)
      const lowerJawPuff = front * Math.exp(-Math.abs(v + 0.35) * 5.4) * Math.exp(-Math.abs(cosAngle) * 1.34)
      const jawVolume = upperJawPuff + lowerJawPuff
      const lobeCup =
        front
        * vertical
        * Math.exp(-Math.abs(Math.abs(v - apertureCenterY) - 0.34) * 3.8)
        * Math.exp(-Math.abs(cosAngle) * 1.18)
      const lobeWaist = front * hingeWaist * 0.084
      const sideHingeTuck = front * rimSide * vertical * 0.09
      const organic = 1 + Math.sin(angle * 3.1 + v * 2.2) * 0.012 + Math.cos(angle * 4.7 - v * 1.4) * 0.009
      const backSpine = back * Math.exp(-Math.abs(cosAngle) * 5.2) * vertical
      const frontMouthSetback = front * vertical * (0.016 + wide * 0.005)
      const mouthTextureClearance = 1 - front * (1 - smoothstep01((mouthDistance - 1.04) / 0.36))
      const frontOffset = Math.atan2(Math.sin(angle + Math.PI / 2), Math.cos(angle + Math.PI / 2))
      const cheekFalloff = 1 - smoothstep01((Math.abs(frontOffset) - 1.26) / 0.22)
      const veinBands = Math.min(
        1,
        Math.exp(-Math.abs(frontOffset + 0.52 + v * 0.2) * 8.2)
          + Math.exp(-Math.abs(frontOffset - 0.46 - v * 0.16) * 8.8)
          + Math.exp(-Math.abs(frontOffset + 0.9 - v * 0.08) * 10.2) * 0.62
          + Math.exp(-Math.abs(frontOffset - 0.86 + v * 0.08) * 10.2) * 0.62,
      )
      const veinAmount =
        veinBands
        * front
        * vertical
        * cheekFalloff
        * mouthTextureClearance
        * (1 - smoothstep01((Math.abs(v) - 0.82) / 0.14))
        * 0.18
      const dorsalVein = back * vertical * Math.exp(-Math.abs(cosAngle) * 8.8) * 0.22
      const poreNoise = (Math.sin(angle * 21.7 + v * 13.3) * Math.sin(angle * 8.9 - v * 18.6) + 1) * 0.5
      const poreAmount =
        smoothstep01((poreNoise - 0.64) / 0.34)
        * vertical
        * mouthTextureClearance
        * (0.09 + front * 0.055 + back * 0.035)
      const glazeNoise = (Math.sin(angle * 10.6 - v * 15.7) + 1) * 0.5
      const skinGlaze = smoothstep01((glazeNoise - 0.72) / 0.26) * vertical * mouthTextureClearance * front * 0.08
      const surfacePucker = 1 + veinAmount * 0.03 + skinGlaze * 0.015 - poreAmount * 0.012
      const innerLobeAmount =
        front
        * vertical
        * Math.exp(-Math.abs(Math.abs(v - apertureCenterY) - 0.41) * 4.2)
        * Math.exp(-Math.abs(cosAngle) * 1.08)
        * (1 - smoothstep01((mouthDistance - 2.04) / 0.42))
        * 0.82
      const hingeCrease =
        front
        * vertical
        * Math.exp(-Math.abs(v - apertureCenterY) * 13.5)
        * Math.exp(-Math.abs(Math.abs(cosAngle) - 0.56) * 7.2)
        * 0.26
      const surfaceColor = baseColor
        .clone()
        .lerp(topColor, Math.max(0, v) * 0.16 + front * 0.08)
        .lerp(shadowColor, back * 0.12 + Math.max(0, -v - 0.42) * 0.12)
      let spotAmount = 0
      let spotEdgeAmount = 0

      bulbSpots.forEach((spot) => {
        const angleDistance = Math.atan2(Math.sin(angle - spot.angle), Math.cos(angle - spot.angle))
        const distance = Math.hypot(angleDistance / spot.angleRadius, (v - spot.v) / spot.vRadius)
        const speckleBreakup = 0.82 + Math.sin(angle * 9.4 + spot.v * 8.1 + v * 5.7) * 0.12
        const hardPatch = (1 - smoothstep01((distance - 0.52) / 0.2)) * speckleBreakup
        const softEdge = smoothstep01((distance - 0.42) / 0.18) * (1 - smoothstep01((distance - 0.92) / 0.18))
        spotAmount = Math.max(spotAmount, hardPatch * spot.strength)
        spotEdgeAmount = Math.max(spotEdgeAmount, softEdge * spot.strength)
      })

      const cheekMottle =
        front
        * vertical
        * Math.exp(-Math.abs(v - 0.28) * 3.2)
        * (0.5 + Math.sin(angle * 8.0 + v * 7.2) * 0.5)
        * 0.14
      surfaceColor.lerp(veinColor, veinAmount + dorsalVein)
      surfaceColor.lerp(poreColor, poreAmount)
      surfaceColor.lerp(glazeColor, skinGlaze)
      surfaceColor.lerp(shadowColor, hingeCrease)
      surfaceColor.lerp(spotEdgeColor, spotEdgeAmount * 0.5 + cheekMottle * 1.1)
      surfaceColor.lerp(spotColor, spotAmount * 0.9)
      surfaceColor.lerp(innerLobeColor, innerLobeAmount)

      vertices.push(
        cosAngle
          * width
          * vertical
          * organic
          * surfacePucker
          * (
            1
            + lobeBand * (0.13 + back * 0.045)
            + rimSide * 0.045
            + mouthShoulder * 0.14
            + jawVolume * 0.11
            - hingeWaist * (0.1 + front * 0.045)
            - sideHingeTuck
            - lobeWaist
          ),
        v * height * topBottomPuff
          + Math.sin(angle * 2.0) * vertical * 0.006
          + upperJawPuff * (0.054 + wide * 0.008)
          - lowerJawPuff * (0.049 + wide * 0.008),
        sinAngle * depth * vertical * surfacePucker * (1 + lobeBand * 0.075 - hingeWaist * 0.03)
          + backSpine * (0.068 + wide * 0.018)
          - frontMouthSetback
          + mouthShoulder * 0.006
          - jawVolume * (0.034 + wide * 0.005)
          - lobeCup * (0.008 + wide * 0.002),
      )
      colors.push(surfaceColor.r, surfaceColor.g, surfaceColor.b)
      mouthCutoutMask.push(mouthCutout)
    }
  }

  const row = longitudeSegments + 1
  for (let latIndex = 0; latIndex < latitudeSegments; latIndex += 1) {
    for (let lonIndex = 0; lonIndex < longitudeSegments; lonIndex += 1) {
      const base = latIndex * row + lonIndex
      const topLeft = base
      const bottomLeft = base + row
      const topRight = base + 1
      const bottomRight = base + row + 1
      if (!mouthCutoutMask[topLeft] && !mouthCutoutMask[bottomLeft] && !mouthCutoutMask[topRight]) {
        indices.push(topLeft, bottomLeft, topRight)
      }
      if (!mouthCutoutMask[topRight] && !mouthCutoutMask[bottomLeft] && !mouthCutoutMask[bottomRight]) {
        indices.push(topRight, bottomLeft, bottomRight)
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

type FlytrapMouthLoopPoint = {
  x: number
  y: number
  normalX: number
  normalY: number
  cornerBlend: number
}

function createFlytrapMouthLoop({
  sideX,
  upperY,
  lowerY,
  cornerY,
  arcSteps = 52,
}: {
  sideX: number
  upperY: number
  lowerY: number
  cornerY: number
  arcSteps?: number
}) {
  const path: FlytrapMouthLoopPoint[] = []
  const addPoint = (t: number, upper: boolean) => {
    const absT = Math.abs(t)
    const arch = Math.sqrt(Math.max(0, 1 - t * t))
    const cornerBlend = smoothstep01((absT - 0.66) / 0.34)
    const organic = 1 + Math.sin((t + (upper ? 0.16 : -0.2)) * Math.PI * 1.7) * 0.008
    const mouthY = upper
      ? cornerY + arch * upperY + Math.sin(t * Math.PI) * 0.0024
      : cornerY - arch * lowerY + Math.sin(t * Math.PI + 0.48) * 0.002

    path.push({
      x: t * sideX * organic,
      y: mouthY,
      normalX: 0,
      normalY: 0,
      cornerBlend,
    })
  }

  for (let index = 0; index <= arcSteps; index += 1) {
    addPoint(-1 + (index / arcSteps) * 2, true)
  }
  for (let index = arcSteps - 1; index >= 1; index -= 1) {
    addPoint(-1 + (index / arcSteps) * 2, false)
  }

  path.forEach((point, pointIndex) => {
    const previous = path[(pointIndex - 1 + path.length) % path.length]
    const next = path[(pointIndex + 1) % path.length]
    const tangentX = next.x - previous.x
    const tangentY = next.y - previous.y
    const tangentLength = Math.hypot(tangentX, tangentY) || 1
    point.normalX = -tangentY / tangentLength
    point.normalY = tangentX / tangentLength
  })

  return path
}

function createFlytrapIntegratedMouthRimGeometry({ wide = 0, wild = 0 }: { wide?: number; wild?: number }) {
  const loop = createFlytrapMouthLoop({
    sideX: 0.146 + wide * 0.041 + wild * 0.006,
    upperY: 0.05 + wide * 0.014 + wild * 0.003,
    lowerY: 0.047 + wide * 0.013 + wild * 0.003,
    cornerY: -0.007,
  })
  const profile = [
    { offset: 0.069 + wide * 0.011, z: -0.186, color: FLYTRAP_GREEN_DARK, cornerTuck: 0.4 },
    { offset: 0.059 + wide * 0.01, z: -0.198, color: FLYTRAP_GREEN_MID, cornerTuck: 0.36 },
    { offset: 0.045 + wide * 0.008, z: -0.212, color: FLYTRAP_LIP_SHADOW, cornerTuck: 0.31 },
    { offset: 0.027 + wide * 0.006, z: -0.229, color: FLYTRAP_LIP_RED, cornerTuck: 0.25 },
    { offset: 0.006, z: -0.243 - wide * 0.004, color: FLYTRAP_LIP_LIGHT, cornerTuck: 0.19 },
    { offset: -0.012, z: -0.233 - wide * 0.004, color: FLYTRAP_LIP_RED, cornerTuck: 0.13 },
    { offset: -0.021, z: -0.208 - wide * 0.003, color: FLYTRAP_LIP_SHADOW, cornerTuck: 0.07 },
  ]
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const highlight = new THREE.Color(FLYTRAP_LIP_LIGHT)
  const shadow = new THREE.Color(FLYTRAP_LIP_SHADOW)

  profile.forEach((band, bandIndex) => {
    loop.forEach((point) => {
      const cornerScale = 1 - point.cornerBlend * band.cornerTuck
      const lowerLipPuff = Math.max(0, -point.normalY) * (bandIndex >= 3 ? 0.13 : 0.04)
      const upperLipTuck = Math.max(0, point.normalY) * (bandIndex >= 4 ? 0.035 : 0)
      const offset = band.offset * cornerScale * (1 + lowerLipPuff - upperLipTuck)
      const topLight = Math.max(0, point.normalY) * (bandIndex === 4 ? 0.12 : 0.045)
      const lowerShade = Math.max(0, -point.normalY) * (bandIndex >= 4 ? 0.09 : 0.04)
      const color = new THREE.Color(band.color).lerp(highlight, topLight).lerp(shadow, lowerShade)
      positions.push(
        point.x + point.normalX * offset,
        point.y + point.normalY * offset,
        band.z + point.cornerBlend * (bandIndex === 0 ? 0.006 : 0.003),
      )
      colors.push(color.r, color.g, color.b)
    })
  })

  const row = loop.length
  for (let bandIndex = 0; bandIndex < profile.length - 1; bandIndex += 1) {
    const base = bandIndex * row
    const nextBase = (bandIndex + 1) * row
    for (let pointIndex = 0; pointIndex < row; pointIndex += 1) {
      const nextPointIndex = (pointIndex + 1) % row
      indices.push(base + pointIndex, nextBase + pointIndex, base + nextPointIndex)
      indices.push(base + nextPointIndex, nextBase + pointIndex, nextBase + nextPointIndex)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createFlytrapMouthCavityGeometry({ wide = 0, wild = 0 }: { wide?: number; wild?: number }) {
  const loop = createFlytrapMouthLoop({
    sideX: 0.129 + wide * 0.037 + wild * 0.005,
    upperY: 0.037 + wide * 0.011 + wild * 0.002,
    lowerY: 0.035 + wide * 0.01 + wild * 0.002,
    cornerY: -0.008,
  })
  const rings = [
    { scaleX: 1, scaleY: 1, z: -0.216 - wide * 0.003, shade: 0 },
    { scaleX: 0.92, scaleY: 0.88, z: -0.194, shade: 0.04 },
    { scaleX: 0.8, scaleY: 0.72, z: -0.17, shade: 0.1 },
    { scaleX: 0.66, scaleY: 0.57, z: -0.143, shade: 0.18 },
    { scaleX: 0.5, scaleY: 0.4, z: -0.114, shade: 0.34 },
    { scaleX: 0.3, scaleY: 0.23, z: -0.084, shade: 0.64 },
    { scaleX: 0.16, scaleY: 0.115, z: -0.068, shade: 0.88 },
  ]
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const frontColor = new THREE.Color(FLYTRAP_MOUTH_INTERIOR)
  const middleColor = new THREE.Color(FLYTRAP_MOUTH_MID)
  const backColor = new THREE.Color(FLYTRAP_MOUTH_DEEP)

  rings.forEach((ring) => {
    const ringColor = ring.shade < 0.36
      ? frontColor.clone().lerp(middleColor, ring.shade / 0.36)
      : middleColor.clone().lerp(backColor, (ring.shade - 0.36) / 0.64)
    loop.forEach((point) => {
      positions.push(point.x * ring.scaleX, -0.008 + (point.y + 0.008) * ring.scaleY, ring.z)
      colors.push(ringColor.r, ringColor.g, ringColor.b)
    })
  })

  const row = loop.length
  for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex += 1) {
    const base = ringIndex * row
    const nextBase = (ringIndex + 1) * row
    for (let pointIndex = 0; pointIndex < row; pointIndex += 1) {
      const nextPointIndex = (pointIndex + 1) % row
      indices.push(base + pointIndex, nextBase + pointIndex, base + nextPointIndex)
      indices.push(base + nextPointIndex, nextBase + pointIndex, nextBase + nextPointIndex)
    }
  }

  const backRingStart = (rings.length - 1) * row
  const backCenterIndex = positions.length / 3
  positions.push(0, -0.006, rings[rings.length - 1].z + 0.008)
  colors.push(backColor.r, backColor.g, backColor.b)
  for (let pointIndex = 0; pointIndex < row; pointIndex += 1) {
    const nextPointIndex = (pointIndex + 1) % row
    indices.push(backRingStart + nextPointIndex, backRingStart + pointIndex, backCenterIndex)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createFlytrapBuckToothGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.66, 0.86)
  shape.lineTo(0.66, 0.86)
  shape.lineTo(0.66, -0.1)
  shape.bezierCurveTo(0.66, -0.62, 0.36, -0.9, 0, -0.9)
  shape.bezierCurveTo(-0.36, -0.9, -0.66, -0.62, -0.66, -0.1)
  shape.lineTo(-0.66, 0.86)

  const depth = 0.012
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 12,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.035,
    bevelThickness: 0.0025,
  })
  geometry.translate(0, 0, -depth / 2)
  geometry.computeVertexNormals()
  return geometry
}

function FlytrapSillyBuckTeeth({ wide = 0 }: { wide?: number }) {
  const toothGeometry = useMemo(() => createFlytrapBuckToothGeometry(), [])
  const toothWidth = 0.022 + wide * 0.0035
  const toothHeight = 0.027 + wide * 0.004
  const rootY = 0.047 + wide * 0.007
  const toothY = rootY - toothHeight * 0.84
  const toothZ = -0.224 - wide * 0.004
  const toothSpread = 0.092 + wide * 0.022
  const teeth: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
  }[] = [
    {
      position: [-toothSpread, toothY - 0.001, toothZ - 0.001],
      rotation: -0.08,
      scale: [toothWidth * 1.05, toothHeight * 1.02, 1],
    },
    {
      position: [toothSpread, toothY + 0.001, toothZ - 0.002],
      rotation: 0.09,
      scale: [toothWidth * 0.96, toothHeight * 0.96, 1],
    },
  ]

  return (
    <group>
      {teeth.map((tooth, index) => (
        <group key={`flytrap-silly-buck-tooth-${index}`} position={tooth.position} rotation-z={tooth.rotation}>
          <CodedAssetOutlineMesh
            scale={tooth.scale}
            outlineWidth={0.003}
            geometry={<primitive object={toothGeometry} attach="geometry" />}
            material={toon(FLYTRAP_TOOTH)}
          />
        </group>
      ))}
    </group>
  )
}

function FlytrapSoftCilia({ wide = 0 }: { wide?: number }) {
  const spread = 1 + wide * 0.16
  const cilia: {
    position: [number, number, number]
    rotation: number
    length: number
    curl: number
    color: string
  }[] = [
    { position: [-0.12 * spread, 0.061, -0.232], rotation: 0.58, length: 0.022, curl: -0.004, color: FLYTRAP_CILIA },
    { position: [-0.042 * spread, 0.091 + wide * 0.004, -0.232], rotation: 0.19, length: 0.02, curl: -0.003, color: FLYTRAP_GREEN_GLOSS },
    { position: [0.042 * spread, 0.092 + wide * 0.004, -0.232], rotation: -0.19, length: 0.021, curl: 0.003, color: FLYTRAP_GREEN_GLOSS },
    { position: [0.12 * spread, 0.061, -0.232], rotation: -0.58, length: 0.022, curl: 0.004, color: FLYTRAP_CILIA },
    { position: [-0.09 * spread, -0.071, -0.23], rotation: 2.67, length: 0.02, curl: 0.003, color: FLYTRAP_GREEN_GLOSS },
    { position: [0.09 * spread, -0.071, -0.23], rotation: -2.67, length: 0.02, curl: -0.003, color: FLYTRAP_GREEN_GLOSS },
  ]

  return (
    <group>
      {cilia.map((cilium, index) => (
        <group key={`flytrap-soft-cilium-${index}`} position={cilium.position} rotation-z={cilium.rotation}>
          <mesh position={[0, cilium.length * 0.48, 0]} rotation-z={cilium.curl} scale={[0.0048, cilium.length * 0.62, 0.0048]}>
            <sphereGeometry args={[1, 9, 6]} />
            <meshToonMaterial color={cilium.color} gradientMap={getVacuumHeadToonRampTexture()} />
          </mesh>
          <mesh position={[cilium.curl * 0.8, cilium.length * 1.02, -0.001]} scale={[0.0048, 0.0058, 0.0048]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshToonMaterial color={cilium.color} gradientMap={getVacuumHeadToonRampTexture()} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function FlytrapInsetMouth({
  wide = 0,
  wild = 0,
  detailsRef,
}: {
  wide?: number
  wild?: number
  detailsRef?: Ref<THREE.Group>
}) {
  const rimGeometry = useMemo(() => createFlytrapIntegratedMouthRimGeometry({ wide, wild }), [wide, wild])
  const cavityGeometry = useMemo(() => createFlytrapMouthCavityGeometry({ wide, wild }), [wide, wild])

  return (
    <group>
      <group ref={detailsRef}>
        <mesh geometry={cavityGeometry} renderOrder={8}>
          <meshBasicMaterial
            vertexColors
            side={THREE.DoubleSide}
          />
        </mesh>
        <FlytrapSillyBuckTeeth wide={wide} />
      </group>
      <mesh geometry={rimGeometry} renderOrder={9}>
        <meshToonMaterial
          color="#ffffff"
          vertexColors
          gradientMap={getVacuumHeadToonRampTexture()}
          side={THREE.DoubleSide}
        />
      </mesh>
      <FlytrapSoftCilia wide={wide} />
    </group>
  )
}

function createFlytrapRosetteLeafGeometry() {
  const lengthSegments = 12
  const radialSegments = 12
  const vertices: number[] = []
  const indices: number[] = []

  for (let lengthIndex = 0; lengthIndex <= lengthSegments; lengthIndex += 1) {
    const progress = lengthIndex / lengthSegments
    const body = Math.pow(Math.max(0, Math.sin(progress * Math.PI)), 0.62)
    const tipTaper = progress < 0.76
      ? 1
      : Math.max(0.08, (1 - progress) / 0.24)
    const width = (0.18 + body * 0.84) * (0.42 + tipTaper * 0.58)
    const thickness = (0.26 + body * 0.58) * (0.22 + tipTaper * 0.78)
    const centerX = Math.sin(progress * Math.PI) * 0.05
    const centerY = -1 + progress * 2
    const centerZ = Math.sin(progress * Math.PI) * 0.14 + progress * progress * 0.24

    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const angle = (radialIndex / radialSegments) * Math.PI * 2
      const radialX = Math.cos(angle)
      const radialZ = Math.sin(angle)
      const undersideScale = radialZ > 0 ? 0.72 : 1
      vertices.push(
        centerX + radialX * width,
        centerY,
        centerZ + radialZ * thickness * undersideScale,
      )
    }
  }

  for (let lengthIndex = 0; lengthIndex < lengthSegments; lengthIndex += 1) {
    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const nextRadial = (radialIndex + 1) % radialSegments
      const current = lengthIndex * radialSegments + radialIndex
      const currentNext = lengthIndex * radialSegments + nextRadial
      const next = (lengthIndex + 1) * radialSegments + radialIndex
      const nextNext = (lengthIndex + 1) * radialSegments + nextRadial
      indices.push(current, next, currentNext, currentNext, next, nextNext)
    }
  }

  const rootCenter = vertices.length / 3
  vertices.push(0, -1, 0)
  const tipCenter = vertices.length / 3
  vertices.push(0, 1, 0.22)
  const tipRingStart = lengthSegments * radialSegments

  for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
    const nextRadial = (radialIndex + 1) % radialSegments
    indices.push(rootCenter, radialIndex, nextRadial)
    indices.push(tipCenter, tipRingStart + nextRadial, tipRingStart + radialIndex)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function FlytrapRosetteLeaf({
  position,
  rotation = [0, 0, 0],
  scale = [0.08, 0.14, 0.045],
  color = FLYTRAP_GREEN_MID,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  color?: string
}) {
  const geometry = useMemo(() => createFlytrapRosetteLeafGeometry(), [])
  const veinColor = color === FLYTRAP_GREEN_DARK ? FLYTRAP_GREEN_MID : FLYTRAP_GREEN_DARK

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <CodedAssetOutlineMesh
        outlineWidth={0.052}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={toon(color)}
      />
      <CurvedTube
        points={[
          [0, -0.78, 0.44],
          [0.02, -0.22, 0.68],
          [0.014, 0.32, 0.7],
          [0, 0.69, 0.5],
        ]}
        radius={0.023}
        color={veinColor}
        outlineWidth={0.005}
      />
      <CurvedTube
        points={[
          [-0.028, -0.7, 0.458],
          [-0.008, -0.2, 0.702],
          [-0.012, 0.27, 0.722],
          [-0.018, 0.61, 0.542],
        ]}
        radius={0.008}
        color={FLYTRAP_GREEN_GLOSS}
        outlineWidth={0.0015}
      />
      <CurvedTube
        points={[
          [0, -0.78, -0.44],
          [0.02, -0.22, -0.68],
          [0.014, 0.32, -0.7],
          [0, 0.69, -0.5],
        ]}
        radius={0.019}
        color={veinColor}
        outlineWidth={0.004}
      />
    </group>
  )
}

function FlytrapCrownPolish() {
  const crownLeaves: ComponentProps<typeof FlytrapRosetteLeaf>[] = [
    { position: [-0.078, 0.136, 0.058], rotation: [0.5, 0.12, 0.62], scale: [0.08, 0.146, 0.054], color: FLYTRAP_GREEN_DARK },
    { position: [0.084, 0.142, 0.064], rotation: [0.46, -0.14, -0.58], scale: [0.082, 0.152, 0.054], color: FLYTRAP_GREEN_MID },
    { position: [-0.16, 0.122, -0.054], rotation: [-0.34, -0.1, 1.22], scale: [0.096, 0.17, 0.064], color: FLYTRAP_GREEN_MID },
    { position: [0.168, 0.126, -0.046], rotation: [-0.3, 0.12, -1.18], scale: [0.098, 0.174, 0.064], color: FLYTRAP_GREEN_DARK },
    { position: [-0.104, 0.106, -0.11], rotation: [-0.72, -0.08, 0.9], scale: [0.102, 0.176, 0.068], color: FLYTRAP_GREEN_LIGHT },
    { position: [0.114, 0.11, -0.116], rotation: [-0.78, 0.1, -0.86], scale: [0.1, 0.18, 0.068], color: FLYTRAP_GREEN_MID },
  ]

  return (
    <group>
      <mesh position={[0.004, 0.064, -0.02]} rotation-z={-0.04} scale={[0.236, 0.034, 0.106]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={FLYTRAP_SHADOW_GREEN} />
      </mesh>
      <CodedAssetOutlineMesh
        position={[0.002, 0.084, -0.012]}
        rotation-z={-0.02}
        scale={[0.18, 0.046, 0.08]}
        outlineWidth={0.005}
        geometry={<sphereGeometry args={[1, 10, 5]} />}
        material={toon(FLYTRAP_GREEN_DARK)}
      />
      {crownLeaves.map((leaf, index) => (
        <FlytrapRosetteLeaf
          key={`flytrap-crown-polish-leaf-${index}`}
          {...leaf}
        />
      ))}
    </group>
  )
}

function FlytrapDotEye({
  position,
  rotation = 0,
  scale = 1,
  gazeX = 0,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  gazeX?: number
}) {
  return (
    <group position={position} rotation-z={rotation} scale={scale}>
      <CodedAssetOutlineMesh
        position={[0, 0, 0]}
        scale={[0.043, 0.052, 0.019]}
        outlineWidth={0.0032}
        outlineColor="#170e1b"
        geometry={<sphereGeometry args={[1, 14, 10]} />}
        material={<meshBasicMaterial color="#3d203b" />}
      />
      <mesh position={[gazeX, -0.002, -0.019]} scale={[0.031, 0.039, 0.006]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color={FLYTRAP_EYE_DARK} />
      </mesh>
      <mesh position={[gazeX - 0.01, 0.017, -0.026]} rotation-z={-0.12} scale={[0.011, 0.0145, 0.003]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={FLYTRAP_GLOSS} toneMapped={false} />
      </mesh>
      <mesh position={[gazeX + 0.009, -0.015, -0.025]} scale={[0.005, 0.006, 0.0024]}>
        <sphereGeometry args={[1, 7, 5]} />
        <meshBasicMaterial color="#ffc9dc" toneMapped={false} />
      </mesh>
    </group>
  )
}

function FlytrapCartoonFaceAccents({
  wide = 0,
}: {
  wide?: number
}) {
  const cheekAccents: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    {
      position: [-0.166 - wide * 0.034, 0.006 + wide * 0.004, -0.174 - wide * 0.014],
      rotation: -0.28,
      scale: [0.034 + wide * 0.008, 0.012, 0.0042],
      color: FLYTRAP_BLUSH,
      opacity: 0.3,
    },
    {
      position: [0.168 + wide * 0.034, 0.004 + wide * 0.004, -0.175 - wide * 0.014],
      rotation: 0.28,
      scale: [0.034 + wide * 0.008, 0.012, 0.0042],
      color: FLYTRAP_BLUSH,
      opacity: 0.27,
    },
    {
      position: [-0.122 - wide * 0.024, 0.096 + wide * 0.012, -0.157 - wide * 0.014],
      rotation: -0.18,
      scale: [0.036 + wide * 0.008, 0.006, 0.0034],
      color: FLYTRAP_SKIN_GLAZE,
      opacity: 0.36,
    },
    {
      position: [0.126 + wide * 0.024, 0.098 + wide * 0.012, -0.158 - wide * 0.014],
      rotation: 0.18,
      scale: [0.034 + wide * 0.008, 0.0058, 0.0034],
      color: FLYTRAP_SKIN_GLAZE,
      opacity: 0.32,
    },
  ]

  return (
    <group>
      {cheekAccents.map((accent, index) => (
        <OrganicDetailStroke
          key={`flytrap-cartoon-face-accent-${index}`}
          position={accent.position}
          rotation={accent.rotation}
          scale={accent.scale}
          color={accent.color}
          opacity={accent.opacity}
        />
      ))}
    </group>
  )
}

function FlytrapBulbSurfaceTexture({
  wide = 0,
  wild = 0,
}: {
  wide?: number
  wild?: number
}) {
  const textureStrokes: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    {
      position: [-0.148 - wide * 0.02, 0.07 + wide * 0.006, -0.151 - wide * 0.012],
      rotation: -0.64,
      scale: [0.07 + wide * 0.014, 0.0068, 0.0038],
      color: FLYTRAP_SKIN_VEIN,
      opacity: 0.34,
    },
    {
      position: [0.142 + wide * 0.024, 0.064 + wide * 0.004, -0.152 - wide * 0.012],
      rotation: 0.58,
      scale: [0.066 + wide * 0.014, 0.0066, 0.0038],
      color: FLYTRAP_SKIN_VEIN,
      opacity: 0.32,
    },
    {
      position: [-0.11 - wide * 0.018, -0.122 - wide * 0.004, -0.149 - wide * 0.012],
      rotation: 0.38,
      scale: [0.054 + wide * 0.012, 0.0058, 0.0035],
      color: FLYTRAP_SKIN_PORE,
      opacity: 0.22,
    },
    {
      position: [0.105 + wide * 0.016, -0.128 - wide * 0.004, -0.15 - wide * 0.012],
      rotation: -0.32,
      scale: [0.052 + wide * 0.011, 0.0058, 0.0035],
      color: FLYTRAP_SKIN_PORE,
      opacity: 0.2,
    },
    {
      position: [0.002, 0.18 + wide * 0.016, -0.112 - wide * 0.014],
      rotation: 0.02,
      scale: [0.052 + wide * 0.016, 0.0052, 0.0032],
      color: FLYTRAP_SKIN_GLAZE,
      opacity: 0.3,
    },
  ]
  const texturePores: {
    position: [number, number, number]
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.174 - wide * 0.024, -0.012, -0.154 - wide * 0.012], scale: [0.0066, 0.0038, 0.0032], color: FLYTRAP_SKIN_PORE, opacity: 0.32 },
    { position: [-0.128 - wide * 0.018, 0.132 + wide * 0.006, -0.142 - wide * 0.012], scale: [0.0058, 0.0034, 0.003], color: FLYTRAP_GREEN_DARK, opacity: 0.28 },
    { position: [0.164 + wide * 0.026, 0.014, -0.154 - wide * 0.012], scale: [0.0064, 0.0036, 0.0032], color: FLYTRAP_SKIN_PORE, opacity: 0.3 },
    { position: [0.094 + wide * 0.014, 0.144 + wide * 0.006, -0.142 - wide * 0.012], scale: [0.0056, 0.0034, 0.003], color: FLYTRAP_GREEN_DARK, opacity: 0.26 },
    { position: [-0.03 - wide * 0.004, -0.17 - wide * 0.004, -0.138 - wide * 0.01], scale: [0.0054, 0.0032, 0.0028], color: FLYTRAP_SKIN_GLAZE, opacity: 0.22 },
    { position: [0.036 + wide * 0.004, -0.164 - wide * 0.004, -0.138 - wide * 0.01], scale: [0.0048, 0.003, 0.0028], color: FLYTRAP_SKIN_PORE, opacity: 0.24 },
  ]

  return (
    <group>
      {textureStrokes.map((stroke, index) => (
        <OrganicDetailStroke
          key={`flytrap-bulb-skin-stroke-${index}`}
          position={stroke.position}
          rotation={stroke.rotation + wild * 0.04}
          scale={stroke.scale}
          color={stroke.color}
          opacity={stroke.opacity}
        />
      ))}
      {texturePores.map((pore, index) => (
        <OrganicDetailDot
          key={`flytrap-bulb-skin-pore-${index}`}
          position={pore.position}
          scale={pore.scale}
          color={pore.color}
          opacity={pore.opacity}
        />
      ))}
    </group>
  )
}

type FlytrapMotionRole = 'leader' | 'scout' | 'shy'

const FLYTRAP_MOTION_PROFILES: Record<
  FlytrapMotionRole,
  {
    phase: number
    speed: number
    bendZ: number
    bendX: number
    twistY: number
    pulsePeriod: number
    pulseCenter: number
    pulseWidth: number
    side: -1 | 0 | 1
  }
> = {
  leader: {
    phase: 0.34,
    speed: 0.58,
    bendZ: 0.042,
    bendX: 0.032,
    twistY: 0.065,
    pulsePeriod: 8.8,
    pulseCenter: 0.56,
    pulseWidth: 0.06,
    side: 0,
  },
  scout: {
    phase: 2.42,
    speed: 0.78,
    bendZ: 0.07,
    bendX: 0.05,
    twistY: 0.1,
    pulsePeriod: 6.6,
    pulseCenter: 0.34,
    pulseWidth: 0.052,
    side: 1,
  },
  shy: {
    phase: 4.76,
    speed: 0.65,
    bendZ: 0.058,
    bendX: 0.044,
    twistY: 0.085,
    pulsePeriod: 9.2,
    pulseCenter: 0.7,
    pulseWidth: 0.062,
    side: -1,
  },
}

function getFlytrapRoleMotion(
  time: number,
  actionTime: number,
  role: FlytrapMotionRole,
  animation: RedShellCritterAnimation,
  amount: number,
) {
  const motion = clampIdleActivity(amount)
  const profile = FLYTRAP_MOTION_PROFILES[role]
  const scan = Math.sin(time * profile.speed + profile.phase) * motion
  const weave = Math.sin(time * profile.speed * 0.63 + profile.phase + 1.18) * motion
  const coil = Math.sin(time * profile.speed * 1.37 + profile.phase * 0.72 + 0.46) * motion
  const peek = idlePulse(
    time + profile.phase * 0.38,
    profile.pulsePeriod,
    profile.pulseCenter,
    profile.pulseWidth,
  ) * motion
  const peekBeat = Math.sin(time * 3.4 + profile.phase) * peek
  const familyAttention = idlePulse(time, 11.4, 0.62, 0.078) * motion
  const hop = getHopMotion(actionTime, animation === 'hop' ? motion : 0)
  const performance = getDirectedPerformanceMotion(actionTime, animation, motion)
  const grumbleWindow = animation === 'grumble'
    ? phaseWindow((actionTime / 2.55) % 1, 0.08, 0.92) * motion
    : 0
  const grumbleShake = Math.sin(actionTime * 17.2 + profile.phase) * grumbleWindow
  const side = profile.side
  const roleLag = role === 'leader' ? 1 : role === 'scout' ? 0.82 : 0.68

  return {
    branchRotateZ:
      scan * profile.bendZ
      + weave * profile.bendZ * 0.34
      + side * peek * 0.035
      + side * familyAttention * 0.055
      + side * hop.launch * 0.028
      - side * hop.land * 0.036
      + performance.plantRotateZ * (0.34 + roleLag * 0.08)
      + grumbleShake * 0.012,
    branchRotateX:
      coil * profile.bendX
      - peek * (0.032 + roleLag * 0.012)
      - familyAttention * (role === 'leader' ? 0.042 : 0.022)
      + hop.launch * (0.035 + roleLag * 0.012)
      - hop.land * (0.042 + roleLag * 0.014)
      + performance.plantRotateX * 0.72,
    branchRotateY:
      weave * profile.twistY
      - side * peek * 0.08
      - side * familyAttention * 0.048
      + performance.plantRotateY * (0.62 + roleLag * 0.12),
    branchScaleX: 1 + hop.prep * 0.014 + hop.land * 0.026 + performance.plantStretch * 0.22,
    branchScaleY:
      1
      - hop.prep * (0.024 + roleLag * 0.01)
      + hop.launch * (0.034 + roleLag * 0.012)
      - hop.land * 0.035
      + performance.plantStretch * (0.7 + roleLag * 0.12),
    branchScaleZ: 1 + hop.airborne * 0.012 + performance.plantStretch * 0.18,
    headRotateZ:
      -scan * (0.065 + roleLag * 0.018)
      + peekBeat * 0.034
      - side * familyAttention * 0.062
      - performance.plantRotateZ * 0.2
      + grumbleShake * 0.018,
    headRotateX:
      weave * (0.048 + roleLag * 0.014)
      - peek * (0.078 + roleLag * 0.016)
      - familyAttention * (role === 'leader' ? 0.065 : 0.035)
      + hop.prep * 0.035
      - hop.launch * 0.045
      + hop.land * 0.055,
    headRotateY:
      coil * (0.095 + roleLag * 0.024)
      - side * peek * 0.14
      - side * familyAttention * 0.075
      + performance.plantRotateY * 0.42,
    headScaleX: 1 + peek * 0.024 + hop.land * 0.035 + performance.plantStretch * 0.16,
    headScaleY: 1 - peek * 0.014 - hop.land * 0.026 + hop.launch * 0.025 + performance.plantStretch * 0.24,
    mouthOpen: peek * (0.075 + roleLag * 0.018) + Math.abs(peekBeat) * 0.02 + hop.launch * 0.035,
    blink: Math.min(
      0.82,
      idlePulse(
        time + profile.phase * 0.71,
        role === 'scout' ? 4.2 : role === 'shy' ? 6.1 : 5.3,
        role === 'scout' ? 0.38 : role === 'shy' ? 0.57 : 0.73,
        0.045,
      ) * motion
      + hop.land * 0.52
      + Math.max(0, grumbleShake) * 0.08,
    ),
    attention: familyAttention,
    peek,
  }
}

function VenusFlytrapHead({
  position,
  rotation = 0,
  pitch = 0,
  yaw = 0,
  scale = 1,
  activity = 1,
  attitude = 'friendly',
  motionRole = 'leader',
}: {
  position: [number, number, number]
  rotation?: number
  pitch?: number
  yaw?: number
  scale?: number
  activity?: number
  attitude?: 'friendly' | 'wild' | 'wide'
  motionRole?: FlytrapMotionRole
}) {
  const headGroup = useRef<THREE.Group>(null)
  const frontDetails = useRef<THREE.Group>(null)
  const mouthInset = useRef<THREE.Group>(null)
  const mouthDetails = useRef<THREE.Group>(null)
  const eyeSet = useRef<THREE.Group>(null)
  const wildAmount = attitude === 'wild' ? 1 : 0
  const wideAmount = attitude === 'wide' ? 1 : 0
  const cuteAmount = attitude === 'wide' ? 1.12 : attitude === 'friendly' ? 1.02 : 0.98
  const animation = useContext(GlowbudAnimationContext)
  const actionTime = useAnimationActionTimer(animation)
  const closedTrapGeometry = useMemo(
    () => createFlytrapClosedTrapGeometry({ wide: wideAmount, wild: wildAmount }),
    [wideAmount, wildAmount],
  )

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const roleMotion = getFlytrapRoleMotion(t, actionTime(t), motionRole, animation, motion)
    const mouthBounce = Math.sin(t * 1.92 + FLYTRAP_MOTION_PROFILES[motionRole].phase) * 0.004 * motion
    const nibble = (Math.sin(t * 2.5 + FLYTRAP_MOTION_PROFILES[motionRole].phase) * 0.5 + 0.5) * 0.009 * motion
    const mouthOpen = 1 + wideAmount * 0.07 + nibble + roleMotion.mouthOpen
    const cheekPulse = 1 + Math.abs(Math.sin(t * 1.82 + FLYTRAP_MOTION_PROFILES[motionRole].phase)) * 0.01 * motion + roleMotion.peek * 0.012

    if (headGroup.current) {
      headGroup.current.position.set(position[0], position[1], position[2])
      headGroup.current.rotation.z = rotation + roleMotion.headRotateZ
      headGroup.current.rotation.x = pitch + roleMotion.headRotateX
      headGroup.current.rotation.y = yaw + roleMotion.headRotateY
      const bodyScale = scale * (1 + Math.sin(t * 1.34 + FLYTRAP_MOTION_PROFILES[motionRole].phase) * 0.006 * motion)
      headGroup.current.scale.set(
        bodyScale * (1 + wideAmount * 0.016) * roleMotion.headScaleX,
        bodyScale * roleMotion.headScaleY,
        bodyScale * (1 + roleMotion.peek * 0.008),
      )
    }
    if (mouthInset.current) {
      mouthInset.current.visible = true
      mouthInset.current.position.y = mouthBounce * 0.08
      mouthInset.current.rotation.z = Math.sin(t * 1.8 + rotation) * 0.01 * motion
      mouthInset.current.scale.set(cheekPulse * (1 - roleMotion.peek * 0.018), mouthOpen, 1)
    }
    if (eyeSet.current) {
      eyeSet.current.position.y = mouthBounce * 0.06 + roleMotion.attention * 0.004
      eyeSet.current.scale.set(1 + roleMotion.attention * 0.014, 1 - roleMotion.attention * 0.006, 1)
      const blinkScale = Math.max(0.2, 1 - roleMotion.blink * 0.8)
      eyeSet.current.children.forEach((eye) => {
        eye.scale.y = eye.scale.x * blinkScale
      })
    }
    if (frontDetails.current) {
      frontDetails.current.visible = true
      frontDetails.current.scale.z = 1
    }
    if (mouthDetails.current) mouthDetails.current.visible = true
  })

  return (
    <group ref={headGroup} position={position} rotation={[pitch, yaw, rotation]} scale={scale}>
      <CodedAssetOutlineMesh
        position={[0, 0, 0.002]}
        rotation-z={0.02}
        outlineWidth={0.0048}
        geometry={<primitive object={closedTrapGeometry} attach="geometry" />}
        material={
          <meshToonMaterial
            color="#ffffff"
            vertexColors
            gradientMap={getVacuumHeadToonRampTexture()}
          />
        }
      />
      <CurvedTube
        points={[
          [0.0, -0.18 - wideAmount * 0.02, 0.142 + wideAmount * 0.02],
          [0.006, -0.09, 0.207 + wideAmount * 0.026],
          [0.004, 0.0, 0.228 + wideAmount * 0.03],
          [0.006, 0.09, 0.207 + wideAmount * 0.026],
          [0.0, 0.18 + wideAmount * 0.02, 0.142 + wideAmount * 0.02],
        ]}
        radius={0.0075 + wideAmount * 0.0016}
        color={FLYTRAP_SHADOW_GREEN}
        outlineWidth={0.0025}
      />
      <group ref={mouthInset} visible={false}>
        <FlytrapInsetMouth wide={wideAmount} wild={wildAmount} detailsRef={mouthDetails} />
      </group>
      <group ref={frontDetails}>
        <FlytrapBulbSurfaceTexture wide={wideAmount} wild={wildAmount} />
        <FlytrapCartoonFaceAccents wide={wideAmount} />
        <group ref={eyeSet}>
          <FlytrapDotEye
            position={[-0.09 - wideAmount * 0.017, 0.112 + wideAmount * 0.01, -0.205 - wideAmount * 0.03]}
            rotation={-0.08}
            scale={cuteAmount}
            gazeX={0.006}
          />
          <FlytrapDotEye
            position={[0.092 + wideAmount * 0.017, 0.114 + wideAmount * 0.01, -0.206 - wideAmount * 0.03]}
            rotation={0.08}
            scale={cuteAmount}
            gazeX={-0.006}
          />
        </group>
      </group>
    </group>
  )
}

function createFlytrapStemGeometry(
  points: [number, number, number][],
  radius: number,
) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    'centripetal',
    0.42,
  )
  const lengthSegments = 24
  const radialSegments = 10
  const frames = curve.computeFrenetFrames(lengthSegments, false)
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const dark = new THREE.Color(FLYTRAP_GREEN_DARK)
  const mid = new THREE.Color(FLYTRAP_GREEN_MID)
  const light = new THREE.Color(FLYTRAP_GREEN_LIGHT)

  for (let lengthIndex = 0; lengthIndex <= lengthSegments; lengthIndex += 1) {
    const progress = lengthIndex / lengthSegments
    const point = curve.getPointAt(progress)
    const normal = frames.normals[lengthIndex]
    const binormal = frames.binormals[lengthIndex]
    const taper = THREE.MathUtils.lerp(1.2, 0.78, progress) * (1 + Math.sin(progress * Math.PI) * 0.055)
    const organic = 1 + Math.sin(progress * Math.PI * 3.2) * 0.018

    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const angle = (radialIndex / radialSegments) * Math.PI * 2
      const radialDirection = normal
        .clone()
        .multiplyScalar(Math.cos(angle))
        .add(binormal.clone().multiplyScalar(Math.sin(angle)))
      const localRadius = radius * taper * organic
      const position = point.clone().add(radialDirection.clone().multiplyScalar(localRadius))
      const upwardLight = smoothstep01((radialDirection.y + 0.38) / 1.28)
      const sideShadow = smoothstep01((-radialDirection.x + radialDirection.z + 0.18) / 1.7)
      const rootShade = (1 - smoothstep01(progress / 0.16)) * 0.2
      const surfaceColor = mid
        .clone()
        .lerp(light, upwardLight * 0.34)
        .lerp(dark, sideShadow * 0.2 + rootShade)

      positions.push(position.x, position.y, position.z)
      colors.push(surfaceColor.r, surfaceColor.g, surfaceColor.b)
    }
  }

  for (let lengthIndex = 0; lengthIndex < lengthSegments; lengthIndex += 1) {
    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const nextRadial = (radialIndex + 1) % radialSegments
      const current = lengthIndex * radialSegments + radialIndex
      const currentNext = lengthIndex * radialSegments + nextRadial
      const next = (lengthIndex + 1) * radialSegments + radialIndex
      const nextNext = (lengthIndex + 1) * radialSegments + nextRadial
      indices.push(current, next, currentNext, currentNext, next, nextNext)
    }
  }

  const rootCenterIndex = positions.length / 3
  const rootPoint = curve.getPointAt(0)
  positions.push(rootPoint.x, rootPoint.y, rootPoint.z)
  colors.push(dark.r, dark.g, dark.b)
  const tipCenterIndex = positions.length / 3
  const tipPoint = curve.getPointAt(1)
  positions.push(tipPoint.x, tipPoint.y, tipPoint.z)
  colors.push(mid.r, mid.g, mid.b)
  const tipRingStart = lengthSegments * radialSegments

  for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
    const nextRadial = (radialIndex + 1) % radialSegments
    indices.push(rootCenterIndex, nextRadial, radialIndex)
    indices.push(tipCenterIndex, tipRingStart + radialIndex, tipRingStart + nextRadial)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function FlytrapStem({
  points,
  radius = 0.013,
}: {
  points: [number, number, number][]
  radius?: number
}) {
  const geometry = useMemo(() => createFlytrapStemGeometry(points, radius), [points, radius])
  const outlineGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      false,
      'centripetal',
      0.42,
    )
    return new THREE.TubeGeometry(curve, 24, radius * 1.08, 10, false)
  }, [points, radius])

  return (
    <group>
      <mesh geometry={outlineGeometry}>
        <meshBasicMaterial color={VAC_ASSET_INK} side={THREE.BackSide} />
      </mesh>
      <mesh geometry={geometry}>
        <meshToonMaterial
          color="#ffffff"
          vertexColors
          gradientMap={getVacuumHeadToonRampTexture()}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

function FlytrapHeadHinge({
  position,
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
}) {
  return (
    <group position={position} rotation-z={rotation} scale={scale}>
      <CurvedTube
        points={[
          [0, -0.09, 0.018],
          [0.004, -0.046, 0.008],
          [0.002, 0.012, -0.004],
        ]}
        radius={0.024}
        color={FLYTRAP_GREEN_DARK}
        outlineWidth={0.0055}
      />
      <CodedAssetOutlineMesh
        position={[0, 0.006, 0.012]}
        rotation-z={-0.02}
        scale={[0.094, 0.074, 0.072]}
        outlineWidth={0.006}
        geometry={<sphereGeometry args={[1, 10, 7]} />}
        material={toon(FLYTRAP_GREEN_DARK)}
      />
      <FlytrapRosetteLeaf
        position={[-0.06, 0.012, 0.006]}
        rotation={[-0.16, -0.18, 1.04]}
        scale={[0.05, 0.098, 0.042]}
        color={FLYTRAP_GREEN_MID}
      />
      <FlytrapRosetteLeaf
        position={[0.06, 0.012, 0.008]}
        rotation={[-0.12, 0.2, -1]}
        scale={[0.05, 0.096, 0.042]}
        color={FLYTRAP_GREEN_LIGHT}
      />
    </group>
  )
}

function FlytrapAnimatedBranch({
  points,
  radius,
  hingePosition,
  hingeRotation,
  hingeScale,
  headPosition,
  headRotation,
  headPitch,
  headYaw,
  headScale,
  headAttitude,
  motionRole,
  activity,
}: {
  points: [number, number, number][]
  radius: number
  hingePosition: [number, number, number]
  hingeRotation: number
  hingeScale: number
  headPosition: [number, number, number]
  headRotation: number
  headPitch: number
  headYaw: number
  headScale: number
  headAttitude: 'friendly' | 'wild' | 'wide'
  motionRole: FlytrapMotionRole
  activity: number
}) {
  const branch = useRef<THREE.Group>(null)
  const animation = useContext(GlowbudAnimationContext)
  const actionTime = useAnimationActionTimer(animation)
  const root = points[0]
  const localPoints = points.map(([x, y, z]) => [
    x - root[0],
    y - root[1],
    z - root[2],
  ] as [number, number, number])
  const localHingePosition: [number, number, number] = [
    hingePosition[0] - root[0],
    hingePosition[1] - root[1],
    hingePosition[2] - root[2],
  ]
  const localHeadPosition: [number, number, number] = [
    headPosition[0] - root[0],
    headPosition[1] - root[1],
    headPosition[2] - root[2],
  ]

  useFrame(({ clock }) => {
    if (!branch.current) return
    const t = clock.elapsedTime
    const roleMotion = getFlytrapRoleMotion(
      t,
      actionTime(t),
      motionRole,
      animation,
      activity,
    )

    branch.current.rotation.set(
      roleMotion.branchRotateX,
      roleMotion.branchRotateY,
      roleMotion.branchRotateZ,
    )
    branch.current.scale.set(
      roleMotion.branchScaleX,
      roleMotion.branchScaleY,
      roleMotion.branchScaleZ,
    )
  })

  return (
    <group ref={branch} position={root}>
      <FlytrapStem points={localPoints} radius={radius} />
      <FlytrapHeadHinge
        position={localHingePosition}
        rotation={hingeRotation}
        scale={hingeScale}
      />
      <VenusFlytrapHead
        position={localHeadPosition}
        rotation={headRotation}
        pitch={headPitch}
        yaw={headYaw}
        scale={headScale}
        activity={activity}
        attitude={headAttitude}
        motionRole={motionRole}
      />
    </group>
  )
}

function HeadVenusFlytrapPotAccessory({
  activity = 1,
  variant = 'friendly-bite',
  pot = 'blue-flower-pot',
}: {
  activity?: number
  variant?: GlowbudFlytrapVariant
  pot?: GlowbudPotTrait
}) {
  const potGeometry = useMemo(() => createHeadPotBodyGeometry(), [])
  const potLipGeometry = useMemo(() => createHeadPotLipGeometry(), [])
  const potBaseBandGeometry = useMemo(() => createHeadPotBaseBandGeometry(), [])
  const plantCluster = useRef<THREE.Group>(null)
  const potGroup = useRef<THREE.Group>(null)
  const isWide = variant === 'wide-crown'
  const potClayFlecks: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.19, 0.052, -0.3], rotation: -0.28, scale: [0.018, 0.005, 0.003], color: POT_BLUE_DARK, opacity: 0.28 },
    { position: [0.16, 0.034, -0.298], rotation: 0.22, scale: [0.016, 0.005, 0.003], color: POT_BLUE_SHADOW, opacity: 0.3 },
    { position: [-0.032, -0.086, -0.284], rotation: -0.16, scale: [0.012, 0.004, 0.003], color: POT_BLUE_LIGHT, opacity: 0.24 },
    { position: [0.226, -0.056, -0.274], rotation: 0.48, scale: [0.014, 0.004, 0.003], color: POT_BLUE_SHADOW, opacity: 0.28 },
    { position: [-0.214, -0.052, -0.276], rotation: -0.36, scale: [0.014, 0.004, 0.003], color: POT_BLUE_LIGHT, opacity: 0.26 },
  ]

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const pulse = idlePulse(t, 5.2, 0.62, 0.062) * motion
    const curiousBob = Math.sin(t * 2.25 + 0.6) * 0.006 * motion
    const curiousDrift = Math.sin(t * 0.74 + 0.4) * 0.006 * motion
    const leafyFollowThrough = Math.sin(t * 1.58 + 1.2) * 0.004 * motion
    const plantedScale = 0.96

    if (plantCluster.current) {
      plantCluster.current.position.x = curiousDrift * 0.45
      plantCluster.current.position.y = 0.088 + Math.sin(t * 1.36 + 0.2) * 0.007 * motion + curiousBob + pulse * 0.02
      plantCluster.current.rotation.z = Math.sin(t * 1.18) * 0.028 * motion + leafyFollowThrough + pulse * 0.024
      plantCluster.current.rotation.x = Math.sin(t * 1.18 + 0.8) * 0.022 * motion + pulse * 0.012
      plantCluster.current.scale.set(
        plantedScale * (1 + pulse * 0.018),
        plantedScale * (1 + pulse * 0.038),
        plantedScale * (1 + pulse * 0.012),
      )
    }
    if (potGroup.current) {
      potGroup.current.position.y = Math.sin(t * 1.16 + 1.1) * 0.005 * motion - pulse * 0.004
      potGroup.current.rotation.z = -0.055 + Math.sin(t * 1.42) * 0.007 * motion - curiousDrift * 0.16
    }
  })

  return (
    <group position={[0.02, 0.695, -0.205]} scale={0.9}>
      <mesh position={[0.012, -0.195, 0.05]} rotation-z={-0.08} scale={[0.34, 0.045, 0.082]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.26} depthWrite={false} />
      </mesh>
      {pot === 'gold-crown-pot' ? (
        <GoldCrownPotShell groupRef={potGroup} />
      ) : pot === 'purple-cube-pot' ? (
        <KitschPotShell groupRef={potGroup} />
      ) : pot === 'terracotta' ? (
        <TerracottaPotShell groupRef={potGroup} />
      ) : (
      <group ref={potGroup} rotation-z={-0.055}>
        <mesh position={[0, 0.143, 0]} scale={[0.368, 0.044, 0.26]}>
          <cylinderGeometry args={[1, 1, 1, 24]} />
          <meshToonMaterial color={POT_BLUE_DARK} gradientMap={getVacuumHeadToonRampTexture()} />
        </mesh>
        <CodedAssetOutlineMesh
          position={[0, -0.008, 0]}
          scale={[0.92, 0.9, 0.72]}
          outlineWidth={0.018}
          geometry={<primitive object={potGeometry} attach="geometry" />}
          material={toon(POT_BLUE_MID)}
        />
        <CodedAssetOutlineMesh
          position={[0, 0.166, 0]}
          scale={[0.92, 1, 0.72]}
          outlineWidth={0.012}
          geometry={<primitive object={potLipGeometry} attach="geometry" />}
          material={toon(POT_BLUE_DARK)}
        />
        <PotPaintStroke position={[-0.135, 0.024, -0.288]} rotation={-0.28} scale={[0.112, 0.022, 0.006]} color={POT_BLUE_LIGHT} opacity={0.36} />
        <PotPaintStroke position={[0.082, 0.082, -0.292]} rotation={0.22} scale={[0.12, 0.018, 0.006]} color={POT_BLUE_LIGHT} opacity={0.22} />
        <PotPaintStroke position={[0.012, 0.148, -0.292]} rotation={-0.045} scale={[0.21, 0.018, 0.006]} color={POT_BLUE_SHADOW} opacity={0.34} />
        <PotPaintStroke position={[-0.05, -0.147, -0.258]} rotation={0.04} scale={[0.16, 0.016, 0.006]} color={POT_BLUE_SHADOW} opacity={0.34} />
        <PotPaintStroke position={[0.02, 0.184, -0.304]} rotation={-0.04} scale={[0.24, 0.012, 0.005]} color={POT_BLUE_LIGHT} opacity={0.24} />
        {potClayFlecks.map((fleck, index) => (
          <OrganicDetailStroke
            key={`flytrap-pot-clay-fleck-${index}`}
            position={fleck.position}
            rotation={fleck.rotation}
            scale={fleck.scale}
            color={fleck.color}
            opacity={fleck.opacity}
          />
        ))}
        <mesh position={[0, 0.186, -0.006]} scale={[0.245, 0.018, 0.162]}>
          <cylinderGeometry args={[1, 1, 1, 18]} />
          <meshBasicMaterial color={SOIL_DARK} />
        </mesh>
        <group position={[0, 0, 0.012]} scale={[0.62, 1, 0.7]}>
          <PottedSoilSurface />
        </group>
        <CodedAssetOutlineMesh
          position={[0, -0.19, 0]}
          scale={[0.92, 0.72, 0.72]}
          outlineWidth={0.008}
          geometry={<primitive object={potBaseBandGeometry} attach="geometry" />}
          material={toon(POT_BLUE_SHADOW)}
        />
      </group>
      )}
      <group ref={plantCluster} position={[0, 0.088, 0.01]} scale={0.96}>
        <mesh position={[0.002, 0.018, -0.016]} rotation-z={-0.03} scale={[0.16, 0.018, 0.056]}>
          <sphereGeometry args={[1, 10, 5]} />
          <meshBasicMaterial color={SOIL_DARK} />
        </mesh>
        <OrganicDetailDot position={[-0.072, 0.034, -0.026]} scale={[0.007, 0.0035, 0.004]} color={SOIL_DUST} opacity={0.64} />
        <OrganicDetailDot position={[0.072, 0.03, -0.028]} scale={[0.006, 0.0035, 0.004]} color={SOIL_DUST} opacity={0.56} />
        <FlytrapCrownPolish />
        <FlytrapAnimatedBranch
          points={[
            [-0.056, 0.05, 0.004],
            [-0.172, 0.13, -0.042],
            [-0.274, 0.238, -0.126],
            [isWide ? -0.448 : -0.39, isWide ? 0.318 : 0.348, isWide ? -0.25 : -0.176],
            [isWide ? -0.602 : -0.51, isWide ? 0.382 : 0.43, isWide ? -0.326 : -0.204],
          ]}
          radius={isWide ? 0.028 : 0.0255}
          hingePosition={isWide ? [-0.61, 0.394, -0.33] : [-0.516, 0.444, -0.208]}
          hingeRotation={isWide ? -0.9 : -0.82}
          hingeScale={isWide ? 1.02 : 0.86}
          headPosition={isWide ? [-0.652, 0.416, -0.338] : [-0.548, 0.476, -0.212]}
          headRotation={isWide ? -0.92 : -0.82}
          headPitch={0.12}
          headYaw={isWide ? -0.18 : -0.16}
          headScale={isWide ? 0.74 : 0.66}
          headAttitude="friendly"
          motionRole="shy"
          activity={activity}
        />
        <FlytrapAnimatedBranch
          points={[
            [0.064, 0.044, -0.002],
            [0.188, 0.12, 0.056],
            [0.286, 0.234, 0.138],
            [isWide ? 0.47 : 0.418, isWide ? 0.33 : 0.354, isWide ? 0.238 : 0.166],
            [isWide ? 0.624 : 0.548, isWide ? 0.41 : 0.462, isWide ? 0.326 : 0.21],
          ]}
          radius={isWide ? 0.031 : 0.0285}
          hingePosition={isWide ? [0.632, 0.424, 0.332] : [0.556, 0.48, 0.216]}
          hingeRotation={isWide ? 0.7 : 0.62}
          hingeScale={isWide ? 1.08 : 0.94}
          headPosition={isWide ? [0.672, 0.45, 0.342] : [0.6, 0.522, 0.222]}
          headRotation={isWide ? 0.7 : 0.63}
          headPitch={-0.09}
          headYaw={isWide ? 0.2 : 0.18}
          headScale={isWide ? 0.92 : 0.84}
          headAttitude="friendly"
          motionRole="scout"
          activity={activity}
        />
        <FlytrapAnimatedBranch
          points={[
            [0.005, 0.048, 0.004],
            [-0.062, 0.166, 0.044],
            [0.044, 0.308, 0.018],
            [isWide ? -0.018 : -0.008, isWide ? 0.432 : 0.452, isWide ? 0.024 : 0.026],
            [isWide ? 0.012 : 0.01, isWide ? 0.578 : 0.598, 0.008],
          ]}
          radius={isWide ? 0.039 : 0.0365}
          hingePosition={isWide ? [0.012, 0.598, 0.01] : [0.01, 0.616, 0.01]}
          hingeRotation={isWide ? -0.005 : 0.02}
          hingeScale={isWide ? 1.3 : 1.2}
          headPosition={isWide ? [0.018, 0.728, 0.012] : [0.014, 0.734, 0.014]}
          headRotation={isWide ? -0.018 : -0.035}
          headPitch={-0.08}
          headYaw={0.018}
          headScale={isWide ? 1.36 : 1.2}
          headAttitude="wide"
          motionRole="leader"
          activity={activity}
        />
      </group>
    </group>
  )
}

function GrassBlade({
  position,
  rotation = 0,
  scale = 1,
  color = GRASS_MID,
  bend = 0.4,
  height = 0.14,
  radius = 0.018,
  tipScale = 0.03,
  sway = 0.018,
  curl = 0.34,
  droop = 0.18,
  phase = 0,
  tilt = 0,
  twist = 0,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  color?: string
  bend?: number
  height?: number
  radius?: number
  tipScale?: number
  sway?: number
  curl?: number
  droop?: number
  phase?: number
  tilt?: number
  twist?: number
}) {
  const { bladeGeometry, tipPosition } = useMemo(() => {
    const bladeHeight = height * scale
    const direction = bend < 0 ? -1 : 1
    const swayDepth = sway * scale
    const wave = Math.sin(phase)
    const crossWave = Math.cos(phase * 1.37)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.012 * bend * scale, bladeHeight * 0.25, swayDepth * 0.28 * wave),
      new THREE.Vector3(
        (0.03 * bend + 0.01 * curl * direction * crossWave) * scale,
        bladeHeight * 0.55,
        -swayDepth * 0.48 * crossWave,
      ),
      new THREE.Vector3(
        (0.058 * bend + 0.018 * curl * direction) * scale,
        bladeHeight * (0.82 - droop * 0.12),
        swayDepth * 0.65 * wave,
      ),
      new THREE.Vector3(
        (0.074 * bend + 0.032 * curl * direction) * scale,
        bladeHeight * (1 - droop * 0.34),
        swayDepth * crossWave,
      ),
    ])

    const tip = curve.getPoint(1)
    return {
      bladeGeometry: new THREE.TubeGeometry(curve, 10, radius * scale, 6, false),
      tipPosition: [tip.x, tip.y, tip.z] as [number, number, number],
    }
  }, [bend, curl, droop, height, phase, radius, scale, sway])

  return (
    <group position={position} rotation-x={tilt} rotation-y={twist} rotation-z={rotation}>
      <mesh geometry={bladeGeometry}>{toon(color)}</mesh>
      <mesh position={tipPosition} scale={[tipScale * scale, tipScale * scale, tipScale * scale]}>
        <sphereGeometry args={[1, 6, 4]} />
        {toon(color)}
      </mesh>
    </group>
  )
}

function GrassRibbonBlade({
  position,
  rotation = 0,
  scale = 1,
  color = GRASS_MID,
  lean = 0.55,
  height = 0.2,
  width = 0.035,
  sway = 0.04,
  curl = 0.62,
  droop = 0.38,
  phase = 0,
  tilt = 0,
  twist = 0,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  color?: string
  lean?: number
  height?: number
  width?: number
  sway?: number
  curl?: number
  droop?: number
  phase?: number
  tilt?: number
  twist?: number
}) {
  const ribbonGeometry = useMemo(() => {
    const segments = 7
    const vertices: number[] = []
    const indices: number[] = []
    const bladeHeight = height * scale
    const bladeWidth = width * scale
    const leanDirection = lean < 0 ? -1 : 1

    for (let segment = 0; segment <= segments; segment += 1) {
      const t = segment / segments
      const taper = Math.max(0.08, 1 - t * 0.93)
      const twistPhase = twist + Math.sin(phase + t * Math.PI * 1.8) * 0.92
      const halfWidth = bladeWidth * taper * (0.78 + 0.22 * Math.sin(phase * 0.7 + t * Math.PI))
      const centerX = (lean * 0.026 * t + lean * 0.118 * t * t + curl * 0.018 * leanDirection * Math.sin(t * Math.PI + phase)) * scale
      const centerY = bladeHeight * (t - droop * 0.24 * t * t)
      const centerZ = (sway * Math.sin(phase + t * Math.PI * 1.35) + curl * 0.012 * Math.sin(phase * 0.5 + t * Math.PI * 2.1)) * scale
      const halfX = Math.sin(twistPhase) * halfWidth
      const halfZ = Math.cos(twistPhase) * halfWidth

      vertices.push(centerX - halfX, centerY, centerZ - halfZ)
      vertices.push(centerX + halfX, centerY, centerZ + halfZ)
    }

    for (let segment = 0; segment < segments; segment += 1) {
      const base = segment * 2
      indices.push(base, base + 1, base + 2)
      indices.push(base + 1, base + 3, base + 2)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }, [curl, droop, height, lean, phase, scale, sway, twist, width])

  return (
    <group position={position} rotation-x={tilt} rotation-y={twist * 0.35} rotation-z={rotation}>
      <GrassRootClump position={[0, -0.008, 0]} rotation={rotation * -0.22} scale={0.6} color={color} />
      <mesh geometry={ribbonGeometry}>{toonDoubleSided(color)}</mesh>
    </group>
  )
}

function GrassRootClump({
  position,
  rotation = 0,
  scale = 1,
  color = GRASS_MID,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  color?: string
}) {
  return (
    <group position={position} rotation-z={rotation} scale={scale}>
      <mesh scale={[0.098, 0.024, 0.052]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0.03, 0.012, -0.006]} rotation-z={0.22} scale={[0.07, 0.014, 0.036]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GRASS_LIGHT} transparent opacity={0.42} depthWrite={false} />
      </mesh>
    </group>
  )
}

function GrassMossPebble({
  position,
  rotation = 0,
  scale,
  color = GRASS_MID,
  soft = false,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color?: string
  soft?: boolean
}) {
  if (soft) {
    const cushionScale: [number, number, number] = [
      scale[0] * 0.56,
      Math.max(scale[1] * 1.65, 0.026),
      scale[2] * 0.34,
    ]
    const napScaleA: [number, number, number] = [
      scale[0] * 0.16,
      Math.max(scale[1] * 1.16, 0.018),
      scale[2] * 0.13,
    ]
    const napScaleB: [number, number, number] = [
      scale[0] * 0.13,
      Math.max(scale[1] * 1.02, 0.016),
      scale[2] * 0.11,
    ]

    return (
      <group position={position} rotation-z={rotation * 0.45}>
        <mesh scale={cushionScale}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[scale[0] * 0.14, scale[1] * 0.84, -scale[2] * 0.02]} scale={napScaleA}>
          <sphereGeometry args={[1, 9, 5]} />
          <meshBasicMaterial color={MOSS_SHELL_SOFT} />
        </mesh>
        <mesh position={[-scale[0] * 0.12, scale[1] * 0.76, scale[2] * 0.018]} scale={napScaleB}>
          <sphereGeometry args={[1, 8, 5]} />
          <meshBasicMaterial color={MOSS_SHELL_FELT} />
        </mesh>
      </group>
    )
  }

  return (
    <mesh position={position} rotation-z={rotation} scale={scale}>
      <sphereGeometry args={[1, 8, 4]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function PressedGrassStrand({
  position,
  rotation = 0,
  scale = 1,
  color = GRASS_MID,
  bend = 0.85,
  height = 0.07,
  phase = 0,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  color?: string
  bend?: number
  height?: number
  phase?: number
}) {
  const settledPosition: [number, number, number] = [position[0], position[1] - 0.018, position[2]]

  return (
    <group position={settledPosition} rotation-z={rotation} scale={scale}>
      <GrassRootClump position={[0, -0.004, 0]} rotation={-0.08} scale={0.9} color={color} />
      <GrassBlade
        position={[0.016, 0.014, -0.002]}
        color={color}
        bend={bend}
        height={height}
        radius={0.009}
        tipScale={0.011}
        sway={0.028}
        curl={0.56}
        droop={0.34}
        phase={phase}
        tilt={0.08 * Math.sin(phase)}
        twist={0.1 * Math.cos(phase)}
      />
    </group>
  )
}

function FineGrassStrand({
  position,
  rotation = 0,
  scale = 1,
  color = GRASS_MID,
  bend = 0.7,
  height = 0.072,
  phase = 0,
  sway = 0.026,
  curl = 0.42,
  droop = 0.26,
  tilt = 0,
  twist = 0,
  radius = 0.0058,
  tipScale = 0.0065,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  color?: string
  bend?: number
  height?: number
  phase?: number
  sway?: number
  curl?: number
  droop?: number
  tilt?: number
  twist?: number
  radius?: number
  tipScale?: number
}) {
  const settledPosition: [number, number, number] = [position[0], position[1] - 0.024, position[2]]

  return (
    <group position={settledPosition} rotation-z={rotation} scale={scale}>
      <GrassRootClump position={[0, -0.006, 0]} rotation={0.1} scale={0.42} color={color} />
      <GrassBlade
        position={[0.006, 0.008, 0]}
        color={color}
        bend={bend}
        height={height}
        radius={radius}
        tipScale={tipScale}
        sway={sway}
        curl={curl}
        droop={droop}
        phase={phase}
        tilt={tilt}
        twist={twist}
      />
    </group>
  )
}

function GrassTuft({
  position,
  scale = 1,
  flip = 1,
  height = 0.14,
}: {
  position: [number, number, number]
  scale?: number
  flip?: -1 | 1
  height?: number
}) {
  return (
    <group position={position} scale={scale}>
      <GrassRootClump position={[0, 0.008, -0.002]} rotation={flip * -0.12} scale={0.88} color={GRASS_DARK} />
      <GrassBlade
        position={[0, 0.03, 0]}
        rotation={flip * -0.22}
        scale={0.92}
        color={GRASS_MID}
        bend={flip * 0.48}
        height={height}
        radius={0.016}
        tipScale={0.026}
        sway={0.026}
        curl={0.44}
        droop={0.22}
        phase={0.4}
      />
      <GrassBlade
        position={[flip * 0.045, 0.035, -0.014]}
        rotation={flip * 0.2}
        scale={0.78}
        color={GRASS_LIGHT}
        bend={flip * 0.34}
        height={height * 0.86}
        radius={0.014}
        tipScale={0.023}
        sway={0.03}
        curl={0.52}
        droop={0.28}
        phase={1.6}
      />
      <GrassBlade
        position={[flip * -0.04, 0.018, 0.006]}
        rotation={flip * -0.56}
        scale={0.72}
        color={GRASS_DARK}
        bend={flip * 0.55}
        height={height * 0.78}
        radius={0.014}
        tipScale={0.022}
        sway={0.022}
        curl={0.48}
        droop={0.24}
        phase={2.5}
      />
      <GrassBlade
        position={[flip * 0.082, 0.008, 0.012]}
        rotation={flip * 0.62}
        scale={0.58}
        color={GRASS_MID}
        bend={flip * 0.28}
        height={height * 0.7}
        radius={0.012}
        tipScale={0.02}
        sway={0.024}
        curl={0.5}
        droop={0.3}
        phase={3.2}
      />
      <GrassBlade
        position={[flip * -0.078, 0.012, -0.016]}
        rotation={flip * -0.84}
        scale={0.62}
        color={GRASS_LIGHT}
        bend={flip * 0.42}
        height={height * 0.66}
        radius={0.012}
        tipScale={0.02}
        sway={0.028}
        curl={0.58}
        droop={0.34}
        phase={4.1}
      />
    </group>
  )
}

type PressedGrassStrandSpec = {
  position: [number, number, number]
  rotation: number
  scale: number
  color: string
  bend: number
  height?: number
  phase?: number
}

type GrassTuftSpec = {
  position: [number, number, number]
  scale: number
  flip?: -1 | 1
  height?: number
}

type GrassMossPebbleSpec = {
  position: [number, number, number]
  rotation: number
  scale: [number, number, number]
  color: string
}

type FineGrassStrandSpec = {
  position: [number, number, number]
  rotation: number
  scale: number
  color: string
  bend: number
  height: number
  phase: number
  sway: number
  curl: number
  droop: number
  tilt: number
  twist: number
}

type LongGrassWispSpec = FineGrassStrandSpec & {
  radius: number
  tipScale: number
}

type GrassRibbonBladeSpec = {
  position: [number, number, number]
  rotation: number
  scale: number
  color: string
  lean: number
  height: number
  width: number
  sway: number
  curl: number
  droop: number
  phase: number
  tilt: number
  twist: number
}

const pressedNestGrass: PressedGrassStrandSpec[] = [
  { position: [-0.82, -0.626, -0.31], rotation: -0.86, scale: 1.16, color: GRASS_MID, bend: -0.95 },
  { position: [-0.68, -0.612, -0.39], rotation: -0.62, scale: 1.04, color: GRASS_LIGHT, bend: -0.82 },
  { position: [-0.5, -0.602, -0.43], rotation: -0.34, scale: 1.08, color: GRASS_DARK, bend: -0.74 },
  { position: [-0.3, -0.596, -0.47], rotation: -0.12, scale: 1.14, color: GRASS_MID, bend: -0.54 },
  { position: [-0.08, -0.594, -0.49], rotation: 0.12, scale: 1.12, color: GRASS_LIGHT, bend: 0.42 },
  { position: [0.14, -0.596, -0.48], rotation: 0.26, scale: 1.12, color: GRASS_MID, bend: 0.56 },
  { position: [0.36, -0.602, -0.44], rotation: 0.44, scale: 1.08, color: GRASS_DARK, bend: 0.72 },
  { position: [0.58, -0.612, -0.38], rotation: 0.68, scale: 1.06, color: GRASS_LIGHT, bend: 0.82 },
  { position: [0.78, -0.626, -0.3], rotation: 0.9, scale: 1.16, color: GRASS_MID, bend: 0.96 },
  { position: [-0.76, -0.606, -0.1], rotation: -1.05, scale: 0.94, color: GRASS_LIGHT, bend: -0.72, height: 0.038 },
  { position: [-0.58, -0.594, -0.18], rotation: -0.72, scale: 0.9, color: GRASS_DARK, bend: -0.62, height: 0.036 },
  { position: [-0.38, -0.584, -0.24], rotation: -0.42, scale: 0.86, color: GRASS_MID, bend: -0.46, height: 0.034 },
  { position: [0.38, -0.584, -0.24], rotation: 0.42, scale: 0.86, color: GRASS_MID, bend: 0.46, height: 0.034 },
  { position: [0.58, -0.594, -0.18], rotation: 0.72, scale: 0.9, color: GRASS_DARK, bend: 0.62, height: 0.036 },
  { position: [0.76, -0.606, -0.1], rotation: 1.05, scale: 0.94, color: GRASS_LIGHT, bend: 0.72, height: 0.038 },
  { position: [-0.9, -0.64, -0.49], rotation: -0.5, scale: 1.05, color: GRASS_DARK, bend: -0.68 },
  { position: [-0.64, -0.632, -0.55], rotation: -0.26, scale: 0.98, color: GRASS_MID, bend: -0.46 },
  { position: [-0.36, -0.628, -0.58], rotation: -0.08, scale: 0.96, color: GRASS_LIGHT, bend: -0.35 },
  { position: [-0.1, -0.63, -0.6], rotation: 0.1, scale: 0.96, color: GRASS_DARK, bend: 0.32 },
  { position: [0.18, -0.628, -0.59], rotation: 0.22, scale: 1, color: GRASS_LIGHT, bend: 0.42 },
  { position: [0.46, -0.632, -0.55], rotation: 0.36, scale: 0.98, color: GRASS_MID, bend: 0.5 },
  { position: [0.76, -0.64, -0.49], rotation: 0.56, scale: 1.05, color: GRASS_DARK, bend: 0.7 },
]

const perimeterGrassTufts: GrassTuftSpec[] = [
  { position: [-1.68, -0.646, -0.16], scale: 1.05, flip: -1, height: 0.168 },
  { position: [-1.56, -0.636, -0.34], scale: 0.98, flip: -1, height: 0.152 },
  { position: [-1.42, -0.654, -0.55], scale: 0.9, flip: -1, height: 0.136 },
  { position: [-1.24, -0.628, 0.04], scale: 0.92, flip: -1, height: 0.142 },
  { position: [-1.12, -0.632, -0.08], scale: 0.98, flip: -1, height: 0.15 },
  { position: [-1.02, -0.626, -0.22], scale: 0.9, flip: -1, height: 0.132 },
  { position: [-0.94, -0.648, -0.4], scale: 0.82, flip: -1, height: 0.118 },
  { position: [-0.8, -0.624, -0.56], scale: 0.78, flip: -1, height: 0.106 },
  { position: [-0.58, -0.626, -0.62], scale: 0.72, flip: -1, height: 0.098 },
  { position: [-0.34, -0.622, -0.7], scale: 0.56, flip: -1, height: 0.058 },
  { position: [0.34, -0.622, -0.7], scale: 0.56, height: 0.058 },
  { position: [0.58, -0.626, -0.62], scale: 0.72, height: 0.098 },
  { position: [0.82, -0.624, -0.56], scale: 0.78, height: 0.106 },
  { position: [0.96, -0.648, -0.4], scale: 0.82, height: 0.118 },
  { position: [1.04, -0.626, -0.22], scale: 0.9, height: 0.132 },
  { position: [1.14, -0.632, -0.08], scale: 0.98, height: 0.15 },
  { position: [1.26, -0.628, 0.04], scale: 0.92, height: 0.142 },
  { position: [1.46, -0.654, -0.55], scale: 0.9, height: 0.136 },
  { position: [1.58, -0.636, -0.34], scale: 0.98, height: 0.152 },
  { position: [1.72, -0.646, -0.16], scale: 1.05, height: 0.168 },
  { position: [-0.92, -0.61, 0.02], scale: 0.78, flip: -1, height: 0.112 },
  { position: [-0.66, -0.604, 0.05], scale: 0.68, flip: -1, height: 0.098 },
  { position: [0.66, -0.604, 0.05], scale: 0.68, height: 0.098 },
  { position: [0.92, -0.61, 0.02], scale: 0.78, height: 0.112 },
]

const grassClusterAnchors: Array<{
  center: [number, number, number]
  radiusX: number
  radiusZ: number
  count: number
  lean: -1 | 1
  lengthBoost: number
}> = [
  { center: [-1.34, -0.642, -0.48], radiusX: 0.34, radiusZ: 0.2, count: 34, lean: -1, lengthBoost: 0.066 },
  { center: [-0.92, -0.63, -0.56], radiusX: 0.36, radiusZ: 0.18, count: 34, lean: -1, lengthBoost: 0.052 },
  { center: [-0.46, -0.61, -0.61], radiusX: 0.42, radiusZ: 0.16, count: 32, lean: -1, lengthBoost: 0.038 },
  { center: [0.02, -0.605, -0.58], radiusX: 0.44, radiusZ: 0.15, count: 30, lean: 1, lengthBoost: 0.028 },
  { center: [0.5, -0.612, -0.61], radiusX: 0.42, radiusZ: 0.16, count: 32, lean: 1, lengthBoost: 0.038 },
  { center: [0.96, -0.632, -0.56], radiusX: 0.36, radiusZ: 0.18, count: 34, lean: 1, lengthBoost: 0.052 },
  { center: [1.4, -0.642, -0.48], radiusX: 0.34, radiusZ: 0.2, count: 34, lean: 1, lengthBoost: 0.066 },
  { center: [-1.18, -0.615, -0.18], radiusX: 0.3, radiusZ: 0.15, count: 24, lean: -1, lengthBoost: 0.03 },
  { center: [-0.72, -0.606, -0.2], radiusX: 0.28, radiusZ: 0.13, count: 22, lean: -1, lengthBoost: 0.018 },
  { center: [0.72, -0.606, -0.2], radiusX: 0.28, radiusZ: 0.13, count: 22, lean: 1, lengthBoost: 0.018 },
  { center: [1.2, -0.615, -0.18], radiusX: 0.3, radiusZ: 0.15, count: 24, lean: 1, lengthBoost: 0.03 },
]

const wildRibbonGrass: GrassRibbonBladeSpec[] = grassClusterAnchors.flatMap((cluster, clusterIndex) => {
  const ribbonCount = clusterIndex < 7 ? 14 : 10

  return Array.from({ length: ribbonCount }, (_, localIndex): GrassRibbonBladeSpec => {
    const index = clusterIndex * 23 + localIndex
    const angle = index * 2.399963 + clusterIndex * 0.37
    const radius = Math.sqrt((localIndex + 0.55) / ribbonCount)
    const x = cluster.center[0] + Math.cos(angle) * cluster.radiusX * 0.92 * radius + Math.sin(index * 1.7) * 0.04
    const z = cluster.center[2] + Math.sin(angle) * cluster.radiusZ * 0.9 * radius + Math.cos(index * 0.83) * 0.03
    const nearFace = Math.abs(x) < 0.48 && z > -0.34
    const frontCenterEdge = Math.abs(x) < 0.92 && z < -0.3
    const sideLean = Math.abs(x) < 0.08 ? cluster.lean : x < 0 ? -1 : 1
    const phase = index * 1.13 + clusterIndex * 0.52
    const colorCycle = (index + clusterIndex) % 8
    const color = frontCenterEdge
      ? colorCycle === 0 || colorCycle === 5 ? GRASS_LIGHT : GRASS_MID
      : colorCycle === 0 || colorCycle === 5 ? GRASS_LIGHT : colorCycle === 1 || colorCycle === 4 ? GRASS_MID : GRASS_DARK
    const edgeHeight = Math.min(0.06, Math.abs(x) * 0.028)

    return {
      position: [x, cluster.center[1] - 0.026 + Math.sin(index * 0.49) * 0.012, z],
      rotation: frontCenterEdge
        ? sideLean * (0.1 + radius * 0.14) + Math.sin(index * 0.71) * 0.08
        : sideLean * (0.34 + radius * 0.46 + (index % 5) * 0.07) + Math.sin(index * 0.71) * 0.28,
      scale: frontCenterEdge ? 0.46 + (index % 3) * 0.025 : 0.84 + (index % 5) * 0.055,
      color,
      lean: frontCenterEdge ? sideLean * (0.24 + radius * 0.34) : sideLean * (0.42 + radius * 0.8 + (index % 4) * 0.12),
      height: frontCenterEdge
        ? 0.038 + (index % 3) * 0.004
        : nearFace
          ? 0.054 + (index % 3) * 0.006
          : 0.16 + cluster.lengthBoost + edgeHeight + (index % 5) * 0.018,
      width: frontCenterEdge ? 0.008 + (index % 3) * 0.0015 : nearFace ? 0.014 + (index % 3) * 0.002 : 0.032 + (index % 4) * 0.008,
      sway: 0.04 + radius * 0.036 + (index % 4) * 0.008,
      curl: frontCenterEdge ? 0.5 + radius * 0.42 : 0.68 + radius * 0.76 + (index % 5) * 0.14,
      droop: frontCenterEdge ? 0.76 : nearFace ? 0.58 : 0.38 + radius * 0.28 + (index % 3) * 0.08,
      phase,
      tilt: Math.sin(phase * 0.9) * (frontCenterEdge ? 0.14 : 0.3),
      twist: Math.cos(phase * 0.64) * (frontCenterEdge ? 0.32 : 0.75),
    }
  })
})

const denseFineGrass: FineGrassStrandSpec[] = grassClusterAnchors.flatMap((cluster, clusterIndex) =>
  Array.from({ length: cluster.count }, (_, localIndex): FineGrassStrandSpec => {
    const index = clusterIndex * 41 + localIndex
    const angle = index * 2.399963 + clusterIndex * 0.53
    const radius = Math.sqrt((localIndex + 0.5) / cluster.count)
    const spiralSkew = Math.sin(index * 1.91) * 0.028
    const x = cluster.center[0] + Math.cos(angle) * cluster.radiusX * radius + spiralSkew
    const z = cluster.center[2] + Math.sin(angle) * cluster.radiusZ * radius + Math.cos(index * 0.77) * 0.018
    const nearShellCenter = Math.abs(x) < 0.5 && z > -0.36
    const sideLean = Math.abs(x) < 0.12 ? cluster.lean : x < 0 ? -1 : 1
    const colorCycle = (index + clusterIndex) % 7
    const color = colorCycle === 0 || colorCycle === 5 ? GRASS_LIGHT : colorCycle === 1 || colorCycle === 4 ? GRASS_MID : GRASS_DARK
    const phase = index * 1.27 + clusterIndex * 0.81
    const outsideEdge = Math.min(0.05, Math.abs(x) * 0.022)
    const height = nearShellCenter
      ? 0.042 + (index % 4) * 0.004
      : 0.08 + cluster.lengthBoost + outsideEdge + (localIndex % 6) * 0.006

    return {
      position: [x, cluster.center[1] + Math.sin(index * 0.73) * 0.014, z],
      rotation: sideLean * (0.45 + radius * 0.34 + (index % 5) * 0.04) + Math.sin(index * 0.91) * 0.24,
      scale: nearShellCenter ? 0.78 : 0.9 + (index % 7) * 0.035,
      color,
      bend: sideLean * (0.5 + radius * 0.36 + (index % 4) * 0.052),
      height,
      phase,
      sway: 0.024 + radius * 0.022 + (index % 5) * 0.004,
      curl: 0.48 + radius * 0.36 + (index % 6) * 0.046,
      droop: nearShellCenter ? 0.42 : 0.32 + radius * 0.2 + (index % 4) * 0.04,
      tilt: Math.sin(phase * 0.9) * 0.18,
      twist: Math.cos(phase * 0.72) * 0.24,
    }
  }),
)

const longGrassWisps: LongGrassWispSpec[] = Array.from({ length: 76 }, (_, index): LongGrassWispSpec => {
  const side = index % 2 === 0 ? -1 : 1
  const lane = Math.floor(index / 2)
  const edgeBand = lane % 4
  const x = side * (0.42 + (lane % 12) * 0.102 + Math.sin(index * 1.61) * 0.045)
  const z = -0.76 + edgeBand * 0.15 + Math.cos(index * 0.83) * 0.05
  const phase = index * 1.41
  const colorCycle = index % 6
  const frontCenterWisp = Math.abs(x) < 0.88 && z < -0.58

  return {
    position: [x, -0.635 + Math.sin(index * 0.57) * 0.012, z],
    rotation: frontCenterWisp
      ? side * (0.48 + (index % 4) * 0.05) + Math.sin(index * 0.77) * 0.12
      : side * (0.92 + (index % 5) * 0.08) + Math.sin(index * 0.77) * 0.18,
    scale: frontCenterWisp ? 0.68 + (index % 3) * 0.035 : 0.96 + (index % 4) * 0.055,
    color: colorCycle === 0 ? GRASS_LIGHT : colorCycle === 1 || colorCycle === 4 ? GRASS_MID : GRASS_DARK,
    bend: side * (0.92 + (index % 4) * 0.12),
    height: frontCenterWisp ? 0.086 + (index % 4) * 0.008 : 0.15 + (index % 5) * 0.018,
    phase,
    sway: frontCenterWisp ? 0.034 + (index % 3) * 0.006 : 0.05 + (index % 3) * 0.012,
    curl: frontCenterWisp ? 0.72 + (index % 3) * 0.08 : 0.86 + (index % 4) * 0.14,
    droop: frontCenterWisp ? 0.7 + (index % 3) * 0.08 : 0.52 + (index % 3) * 0.08,
    tilt: Math.sin(phase) * (frontCenterWisp ? 0.18 : 0.24),
    twist: Math.cos(phase * 0.8) * (frontCenterWisp ? 0.24 : 0.34),
    radius: frontCenterWisp ? 0.0048 : 0.0062,
    tipScale: frontCenterWisp ? 0.0045 : 0.006,
  }
})

const platformCenterZ = -0.18
const platformRadiusX = 1.74
const platformRadiusZ = 1.18

const circularPlatformMossLobes: GrassMossPebbleSpec[] = Array.from({ length: 46 }, (_, index): GrassMossPebbleSpec => {
  const angle = index * 2.399963 + Math.sin(index * 0.47) * 0.12
  const radius = 0.42 + ((index * 7) % 31) / 31 * 0.54
  const x = Math.cos(angle) * platformRadiusX * radius + Math.sin(index * 1.27) * 0.035
  const z = platformCenterZ + Math.sin(angle) * platformRadiusZ * radius + Math.cos(index * 0.93) * 0.035
  const colorCycle = index % 7

  return {
    position: [x, -0.694 + Math.sin(index * 0.59) * 0.014, z],
    rotation: angle + Math.sin(index * 0.8) * 0.25,
    scale: [0.15 + (index % 5) * 0.018, 0.019 + (index % 3) * 0.003, 0.07 + (index % 4) * 0.012],
    color: colorCycle === 0 || colorCycle === 5 ? GRASS_LIGHT : colorCycle === 1 || colorCycle === 4 ? GRASS_MID : GRASS_DARK,
  }
})

const circularPlatformFineGrass: FineGrassStrandSpec[] = Array.from({ length: 220 }, (_, index): FineGrassStrandSpec => {
  const angle = index * 2.399963
  const radius = Math.sqrt((index + 0.5) / 220) * 0.98
  const x = Math.cos(angle) * platformRadiusX * radius + Math.sin(index * 1.61) * 0.028
  const z = platformCenterZ + Math.sin(angle) * platformRadiusZ * radius + Math.cos(index * 0.73) * 0.026
  const nearBody = Math.abs(x) < 0.78 && z > -0.54 && z < 0.5
  const frontCenterEdge = Math.abs(x) < 0.96 && z < -0.34
  const lowProtectedArea = nearBody || frontCenterEdge
  const outerRing = radius > 0.78
  const sideLean = x < 0 ? -1 : 1
  const phase = index * 1.19
  const colorCycle = index % 8

  return {
    position: [x, -0.63 + Math.sin(index * 0.67) * 0.016, z],
    rotation: frontCenterEdge
      ? sideLean * (0.18 + radius * 0.22) + Math.sin(index * 0.83) * 0.12
      : sideLean * (0.42 + radius * 0.42 + (index % 5) * 0.045) + Math.sin(index * 0.83) * 0.24,
    scale: lowProtectedArea ? 0.72 : 0.84 + (index % 6) * 0.035,
    color: colorCycle === 0 || colorCycle === 6 ? GRASS_LIGHT : colorCycle === 1 || colorCycle === 4 ? GRASS_MID : GRASS_DARK,
    bend: sideLean * (0.46 + radius * 0.52 + (index % 4) * 0.055),
    height: lowProtectedArea ? 0.034 + (index % 3) * 0.004 : 0.082 + (outerRing ? 0.052 : 0.018) + (index % 5) * 0.008,
    phase,
    sway: 0.026 + radius * 0.024 + (index % 4) * 0.005,
    curl: 0.48 + radius * 0.52 + (index % 6) * 0.052,
    droop: lowProtectedArea ? 0.46 : 0.32 + radius * 0.22 + (index % 4) * 0.05,
    tilt: Math.sin(phase * 0.82) * 0.22,
    twist: Math.cos(phase * 0.74) * 0.32,
  }
})

const circularPlatformTufts: GrassTuftSpec[] = Array.from({ length: 44 }, (_, index): GrassTuftSpec => {
  const angle = (index / 44) * Math.PI * 2 + Math.sin(index * 0.57) * 0.08
  const radius = index % 3 === 0 ? 0.94 : 0.84 + (index % 4) * 0.035
  const x = Math.cos(angle) * platformRadiusX * radius
  const z = platformCenterZ + Math.sin(angle) * platformRadiusZ * radius
  const backArc = z > 0.34
  const frontCenterEdge = Math.abs(x) < 0.96 && z < -0.34

  return {
    position: [x, -0.64 + Math.sin(index * 0.71) * 0.012, z],
    scale: frontCenterEdge ? 0.58 : backArc ? 0.68 + (index % 4) * 0.038 : 0.76 + (index % 5) * 0.045,
    flip: x < 0 ? -1 : 1,
    height: frontCenterEdge ? 0.074 : backArc ? 0.09 + (index % 4) * 0.012 : 0.112 + (index % 5) * 0.014,
  }
})

const mossPebbles: GrassMossPebbleSpec[] = [
  { position: [-0.98, -0.636, -0.45], rotation: -0.18, scale: [0.18, 0.024, 0.07], color: GRASS_DARK },
  { position: [-0.78, -0.626, -0.5], rotation: 0.12, scale: [0.2, 0.026, 0.08], color: GRASS_MID },
  { position: [-0.56, -0.614, -0.53], rotation: -0.1, scale: [0.18, 0.022, 0.072], color: GRASS_LIGHT },
  { position: [-0.34, -0.608, -0.56], rotation: 0.16, scale: [0.19, 0.024, 0.076], color: GRASS_MID },
  { position: [-0.1, -0.606, -0.58], rotation: -0.06, scale: [0.18, 0.022, 0.07], color: GRASS_DARK },
  { position: [0.14, -0.608, -0.57], rotation: 0.1, scale: [0.2, 0.024, 0.076], color: GRASS_LIGHT },
  { position: [0.38, -0.614, -0.54], rotation: -0.14, scale: [0.18, 0.022, 0.072], color: GRASS_MID },
  { position: [0.62, -0.626, -0.5], rotation: 0.12, scale: [0.2, 0.026, 0.08], color: GRASS_DARK },
  { position: [0.86, -0.636, -0.45], rotation: 0.2, scale: [0.18, 0.024, 0.07], color: GRASS_MID },
  { position: [-0.74, -0.616, -0.22], rotation: -0.24, scale: [0.2, 0.026, 0.09], color: GRASS_LIGHT },
  { position: [-0.5, -0.598, -0.28], rotation: 0.18, scale: [0.16, 0.022, 0.072], color: GRASS_DARK },
  { position: [0.5, -0.598, -0.28], rotation: -0.18, scale: [0.16, 0.022, 0.072], color: GRASS_LIGHT },
  { position: [0.76, -0.616, -0.22], rotation: 0.24, scale: [0.2, 0.026, 0.09], color: GRASS_MID },
]

const baseMossLobes: GrassMossPebbleSpec[] = [
  { position: [-1.58, -0.704, -0.44], rotation: -0.22, scale: [0.26, 0.028, 0.1], color: GRASS_DARK },
  { position: [-1.34, -0.692, -0.62], rotation: 0.18, scale: [0.29, 0.026, 0.1], color: GRASS_MID },
  { position: [-1.08, -0.692, -0.5], rotation: -0.28, scale: [0.21, 0.024, 0.08], color: GRASS_DARK },
  { position: [-0.84, -0.674, -0.6], rotation: 0.16, scale: [0.25, 0.023, 0.09], color: GRASS_MID },
  { position: [-0.52, -0.664, -0.66], rotation: -0.1, scale: [0.25, 0.02, 0.08], color: GRASS_LIGHT },
  { position: [-0.18, -0.66, -0.74], rotation: 0.08, scale: [0.28, 0.02, 0.088], color: GRASS_MID },
  { position: [0.18, -0.66, -0.74], rotation: -0.08, scale: [0.28, 0.02, 0.088], color: GRASS_DARK },
  { position: [0.52, -0.664, -0.66], rotation: 0.12, scale: [0.25, 0.02, 0.08], color: GRASS_LIGHT },
  { position: [0.84, -0.674, -0.6], rotation: -0.16, scale: [0.25, 0.023, 0.09], color: GRASS_MID },
  { position: [1.08, -0.692, -0.5], rotation: 0.28, scale: [0.21, 0.024, 0.08], color: GRASS_DARK },
  { position: [1.36, -0.692, -0.62], rotation: -0.18, scale: [0.29, 0.026, 0.1], color: GRASS_MID },
  { position: [1.62, -0.704, -0.44], rotation: 0.22, scale: [0.26, 0.028, 0.1], color: GRASS_DARK },
  { position: [-1.42, -0.696, -0.1], rotation: -0.2, scale: [0.25, 0.028, 0.09], color: GRASS_MID },
  { position: [-0.98, -0.686, -0.18], rotation: -0.2, scale: [0.19, 0.022, 0.074], color: GRASS_MID },
  { position: [-0.7, -0.668, -0.12], rotation: 0.24, scale: [0.18, 0.02, 0.07], color: GRASS_LIGHT },
  { position: [0.7, -0.668, -0.12], rotation: -0.24, scale: [0.18, 0.02, 0.07], color: GRASS_LIGHT },
  { position: [0.98, -0.686, -0.18], rotation: 0.2, scale: [0.19, 0.022, 0.074], color: GRASS_MID },
  { position: [1.46, -0.696, -0.1], rotation: 0.2, scale: [0.25, 0.028, 0.09], color: GRASS_MID },
]

function GrassFinePolishDetails() {
  const seedHeads: {
    position: [number, number, number]
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-1.22, -0.478, -0.3], scale: [0.018, 0.018, 0.01], color: GRASS_LIGHT, opacity: 0.54 },
    { position: [-0.88, -0.492, -0.55], scale: [0.014, 0.014, 0.008], color: '#d5f7b4', opacity: 0.5 },
    { position: [-0.34, -0.486, -0.62], scale: [0.016, 0.016, 0.009], color: GRASS_LIGHT, opacity: 0.5 },
    { position: [0.32, -0.49, -0.64], scale: [0.014, 0.014, 0.008], color: '#d5f7b4', opacity: 0.46 },
    { position: [0.82, -0.482, -0.48], scale: [0.017, 0.017, 0.009], color: GRASS_LIGHT, opacity: 0.52 },
    { position: [1.25, -0.49, -0.25], scale: [0.015, 0.015, 0.008], color: '#d5f7b4', opacity: 0.48 },
    { position: [-1.48, -0.512, -0.08], scale: [0.012, 0.012, 0.007], color: '#d5f7b4', opacity: 0.42 },
    { position: [-0.58, -0.506, -0.12], scale: [0.01, 0.01, 0.006], color: GRASS_LIGHT, opacity: 0.36 },
    { position: [0.62, -0.502, -0.1], scale: [0.011, 0.011, 0.006], color: '#d5f7b4', opacity: 0.38 },
    { position: [1.46, -0.514, -0.06], scale: [0.012, 0.012, 0.007], color: GRASS_LIGHT, opacity: 0.42 },
  ]
  const leafScuffs: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-1.42, -0.602, -0.36], rotation: -0.48, scale: [0.035, 0.006, 0.004], color: GRASS_LIGHT, opacity: 0.34 },
    { position: [-0.68, -0.586, -0.68], rotation: 0.36, scale: [0.03, 0.005, 0.004], color: GRASS_DARK, opacity: 0.28 },
    { position: [-0.08, -0.572, -0.7], rotation: -0.18, scale: [0.042, 0.006, 0.004], color: GRASS_LIGHT, opacity: 0.32 },
    { position: [0.52, -0.586, -0.62], rotation: -0.34, scale: [0.032, 0.005, 0.004], color: GRASS_DARK, opacity: 0.28 },
    { position: [1.36, -0.6, -0.36], rotation: 0.5, scale: [0.035, 0.006, 0.004], color: GRASS_LIGHT, opacity: 0.34 },
    { position: [-1.12, -0.566, -0.08], rotation: 0.22, scale: [0.032, 0.006, 0.004], color: GRASS_LIGHT, opacity: 0.3 },
    { position: [-0.34, -0.548, -0.22], rotation: -0.12, scale: [0.038, 0.006, 0.004], color: GRASS_DARK, opacity: 0.2 },
    { position: [0.32, -0.546, -0.22], rotation: 0.12, scale: [0.038, 0.006, 0.004], color: GRASS_DARK, opacity: 0.2 },
    { position: [1.08, -0.568, -0.08], rotation: -0.24, scale: [0.032, 0.006, 0.004], color: GRASS_LIGHT, opacity: 0.3 },
  ]
  const dewDots: {
    position: [number, number, number]
    scale: [number, number, number]
    opacity: number
  }[] = [
    { position: [-1.18, -0.526, -0.44], scale: [0.009, 0.012, 0.006], opacity: 0.42 },
    { position: [-0.78, -0.506, -0.62], scale: [0.008, 0.01, 0.006], opacity: 0.38 },
    { position: [-0.2, -0.494, -0.66], scale: [0.007, 0.009, 0.005], opacity: 0.34 },
    { position: [0.36, -0.502, -0.64], scale: [0.008, 0.01, 0.006], opacity: 0.38 },
    { position: [0.98, -0.512, -0.52], scale: [0.009, 0.012, 0.006], opacity: 0.42 },
    { position: [-1.44, -0.542, -0.16], scale: [0.007, 0.009, 0.005], opacity: 0.34 },
    { position: [1.42, -0.54, -0.18], scale: [0.007, 0.009, 0.005], opacity: 0.34 },
  ]

  return (
    <group>
      {seedHeads.map((seed, index) => (
        <OrganicDetailDot
          key={`grass-seed-head-${index}`}
          position={seed.position}
          scale={seed.scale}
          color={seed.color}
          opacity={seed.opacity}
        />
      ))}
      {leafScuffs.map((scuff, index) => (
        <OrganicDetailStroke
          key={`grass-leaf-scuff-${index}`}
          position={scuff.position}
          rotation={scuff.rotation}
          scale={scuff.scale}
          color={scuff.color}
          opacity={scuff.opacity}
        />
      ))}
      {dewDots.map((dew, index) => (
        <OrganicDetailDot
          key={`grass-soft-dew-${index}`}
          position={dew.position}
          scale={dew.scale}
          color={GRASS_DEW}
          opacity={dew.opacity}
        />
      ))}
    </group>
  )
}

function MossSeatFuzzLayer() {
  const seatCarpetMats = useMemo(
    () =>
      Array.from({ length: 32 }, (_, index) => {
        const angle = index * 2.399963 + 0.16
        const ring = Math.sqrt(((index * 19) % 37 + 0.5) / 37)
        const colorCycle = index % 8

        return {
          position: [
            Math.cos(angle) * 1.22 * ring + Math.sin(index * 0.9) * 0.04,
            -0.628 + Math.sin(index * 0.71) * 0.012,
            Math.sin(angle) * 0.34 * ring - 0.29 + Math.cos(index * 1.1) * 0.025,
          ] as [number, number, number],
          rotation: angle + Math.sin(index * 0.52) * 0.46,
          scale: [
            0.09 + (index % 5) * 0.022,
            0.018 + (index % 4) * 0.005,
            0.008,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 4
              ? MOSS_SHELL_SOFT
              : colorCycle === 2
                ? MOSS_SHELL_LIGHT
                : colorCycle === 5
                  ? MOSS_SHELL_FELT
                  : MOSS_SHELL_MID,
          opacity: 0.22 + (index % 4) * 0.035,
        }
      }),
    [],
  )

  const seatPuffs = useMemo(
    () =>
      Array.from({ length: 220 }, (_, index) => {
        const angle = index * 2.399963 + 0.38
        const ring = Math.sqrt(((index * 31) % 223 + 0.5) / 223)
        const colorCycle = index % 10

        return {
          position: [
            Math.cos(angle) * 1.26 * ring + Math.sin(index * 0.77) * 0.035,
            -0.602 + Math.sin(index * 0.91) * 0.02,
            Math.sin(angle) * 0.34 * ring - 0.28 + Math.cos(index * 1.1) * 0.026,
          ] as [number, number, number],
          scale: [
            0.018 + (index % 4) * 0.004,
            0.012 + (index % 5) * 0.003,
            0.009,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 7
              ? MOSS_SHELL_LIGHT
              : colorCycle === 2
                ? MOSS_SHELL_SOFT
                : colorCycle === 5
                  ? MOSS_SHELL_FELT
                  : MOSS_SHELL_LIGHT,
          opacity: 0.26 + (index % 5) * 0.04,
        }
      }),
    [],
  )

  const velvetFibers = useMemo(
    () =>
      Array.from({ length: 50 }, (_, index) => {
        const angle = index * 2.399963 + 0.8
        const ring = Math.sqrt(((index * 17) % 83 + 0.5) / 83)

        return {
          position: [
            Math.cos(angle) * 1.18 * ring,
            -0.586 + Math.sin(index * 1.23) * 0.016,
            Math.sin(angle) * 0.32 * ring - 0.3,
          ] as [number, number, number],
          rotation: angle * 0.24 + Math.sin(index * 0.51) * 0.36,
          scale: [
            0.006 + (index % 3) * 0.001,
            0.011 + (index % 4) * 0.0025,
            0.0034,
          ] as [number, number, number],
          color: index % 5 === 0 ? MOSS_SHELL_SOFT : index % 4 === 0 ? MOSS_SHELL_FELT : MOSS_SHELL_LIGHT,
          opacity: 0.2 + (index % 4) * 0.035,
        }
      }),
    [],
  )

  const seatAgeScuffs = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => {
        const angle = index * 2.399963 + 0.62
        const ring = Math.sqrt(((index * 13) % 31 + 0.5) / 31)
        const colorCycle = index % 8

        return {
          position: [
            Math.cos(angle) * 1.18 * ring + Math.sin(index * 0.58) * 0.03,
            -0.59 + Math.sin(index * 1.2) * 0.016,
            Math.sin(angle) * 0.32 * ring - 0.29 + Math.cos(index * 0.75) * 0.024,
          ] as [number, number, number],
          rotation: angle + Math.sin(index * 0.44) * 0.58,
          scale: [
            0.046 + (index % 5) * 0.012,
            0.006 + (index % 4) * 0.002,
            0.0035,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 4
              ? MOSS_SHELL_BARK
              : colorCycle === 2
                ? MOSS_SHELL_DEEP
                : MOSS_SHELL_LICHEN,
          opacity: colorCycle === 6 ? 0.2 : 0.12 + (index % 3) * 0.025,
        }
      }),
    [],
  )

  const seatLichenDust = useMemo(
    () =>
      Array.from({ length: 86 }, (_, index) => {
        const angle = index * 2.399963 + 1.2
        const ring = Math.sqrt(((index * 29) % 89 + 0.5) / 89)
        const colorCycle = index % 9

        return {
          position: [
            Math.cos(angle) * 1.22 * ring + Math.sin(index * 0.81) * 0.028,
            -0.57 + Math.sin(index * 0.93) * 0.018,
            Math.sin(angle) * 0.34 * ring - 0.29 + Math.cos(index * 0.64) * 0.02,
          ] as [number, number, number],
          scale: [
            0.0048 + (index % 4) * 0.0011,
            0.0038 + (index % 3) * 0.0009,
            0.0028,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 5
              ? MOSS_SHELL_LICHEN
              : colorCycle === 2
                ? MOSS_SHELL_BARK
                : MOSS_SHELL_LIGHT,
          opacity: 0.16 + (index % 4) * 0.03,
        }
      }),
    [],
  )

  return (
    <group>
      {seatCarpetMats.map((mat, index) => (
        <mesh
          key={`moss-seat-carpet-mat-${index}`}
          position={mat.position}
          rotation-z={mat.rotation}
          scale={mat.scale}
        >
          <sphereGeometry args={[1, 9, 4]} />
          <meshBasicMaterial color={mat.color} transparent opacity={mat.opacity} depthTest={false} depthWrite={false} />
        </mesh>
      ))}
      {seatAgeScuffs.map((scuff, index) => (
        <OrganicDetailStroke
          key={`moss-seat-age-scuff-${index}`}
          position={scuff.position}
          rotation={scuff.rotation}
          scale={scuff.scale}
          color={scuff.color}
          opacity={scuff.opacity}
          depthTest={false}
        />
      ))}
      {seatPuffs.map((puff, index) => (
        <OrganicDetailDot
          key={`moss-seat-fuzz-puff-${index}`}
          position={puff.position}
          scale={puff.scale}
          color={puff.color}
          opacity={puff.opacity}
          depthTest={false}
        />
      ))}
      {seatLichenDust.map((speck, index) => (
        <OrganicDetailDot
          key={`moss-seat-lichen-dust-${index}`}
          position={speck.position}
          scale={speck.scale}
          color={speck.color}
          opacity={speck.opacity}
          depthTest={false}
        />
      ))}
      {velvetFibers.map((fiber, index) => (
        <OrganicDetailStroke
          key={`moss-seat-velvet-fiber-${index}`}
          position={fiber.position}
          rotation={fiber.rotation}
          scale={fiber.scale}
          color={fiber.color}
          opacity={fiber.opacity}
          depthTest={false}
        />
      ))}
    </group>
  )
}

function MossGroundContactLayer() {
  const compressedPads = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.24
        const radius = 0.36 + (((index * 17) % 37) / 37) * 0.62
        const frontWeight = smoothstep01((-Math.sin(angle) + 0.12) / 1.12)
        const edgeWeight = smoothstep01((radius - 0.44) / 0.56)
        const x = Math.cos(angle) * 1.02 * radius + Math.sin(index * 0.73) * 0.026
        const z = -0.29 + Math.sin(angle) * 0.31 * radius + Math.cos(index * 1.07) * 0.018
        const colorCycle = index % 9

        return {
          position: [
            x,
            -0.648 - frontWeight * 0.026 + (1 - edgeWeight) * 0.01 + Math.sin(index * 0.61) * 0.004,
            z,
          ] as [number, number, number],
          rotation: angle + Math.sin(index * 0.46) * 0.42,
          scale: [
            0.055 + (index % 5) * 0.01 + edgeWeight * 0.026,
            0.012 + (index % 4) * 0.002 + (1 - frontWeight) * 0.002,
            0.018 + (index % 3) * 0.004,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 5
              ? MOSS_SHELL_FELT
              : colorCycle === 2
                ? MOSS_SHELL_SOFT
                : colorCycle === 7
                  ? MOSS_SHELL_BARK
                  : MOSS_SHELL_MID,
        }
      }),
    [],
  )

  const contactCrumbs = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.68
        const radius = 0.5 + (((index * 29) % 71) / 71) * 0.48
        const frontWeight = smoothstep01((-Math.sin(angle) + 0.16) / 1.16)
        const colorCycle = index % 11

        return {
          position: [
            Math.cos(angle) * 1.08 * radius + Math.sin(index * 0.91) * 0.022,
            -0.646 - frontWeight * 0.034 + Math.sin(index * 1.11) * 0.006,
            -0.29 + Math.sin(angle) * 0.34 * radius + Math.cos(index * 0.67) * 0.02,
          ] as [number, number, number],
          scale: [
            0.009 + (index % 4) * 0.002,
            0.005 + (index % 3) * 0.0015,
            0.006 + (index % 3) * 0.0015,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 6
              ? MOSS_SHELL_DRY
              : colorCycle === 3 || colorCycle === 9
                ? MOSS_SHELL_SOIL
                : colorCycle === 5
                  ? MOSS_SHELL_SOFT
                  : MOSS_SHELL_FELT,
          opacity: colorCycle === 5 ? 0.72 : 0.88,
        }
      }),
    [],
  )

  return (
    <group>
      {compressedPads.map((pad, index) => (
        <MossShellMatPatch
          key={`moss-ground-compressed-pad-${index}`}
          position={pad.position}
          rotation={pad.rotation}
          scale={pad.scale}
          color={pad.color}
          solid
        />
      ))}
      {contactCrumbs.map((crumb, index) => (
        <OrganicDetailDot
          key={`moss-ground-contact-crumb-${index}`}
          position={crumb.position}
          scale={crumb.scale}
          color={crumb.color}
          opacity={crumb.opacity}
          solid
        />
      ))}
    </group>
  )
}

function GroundContactPolish({
  activity = 1,
  animation = 'idle',
  surface = 'grass',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
  surface?: 'grass' | 'moss'
}) {
  const contactGroup = useRef<THREE.Group>(null)
  const isMossContact = surface === 'moss'
  const contactInk = isMossContact ? MOSS_SHELL_MID : VAC_ASSET_DETAIL_INK
  const contactInkOpacity = isMossContact ? 0.12 : 0.28
  const contactDark = isMossContact ? MOSS_SHELL_LIGHT : GRASS_DARK
  const contactLight = isMossContact ? MOSS_SHELL_GLOW : GRASS_LIGHT
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const snugPulse = idlePulse(t, 6.2, 0.71, 0.075) * motion
    const hop = animation === 'hop' ? getHopMotion(actionTime(t), motion) : null
    const landing = hop ? hop.land : 0
    const prep = hop ? hop.prep : 0
    const airborne = hop ? hop.airborne : 0
    const breathingSettle = Math.sin(t * 1.42 + 0.3) * 0.006 * motion

    if (contactGroup.current) {
      contactGroup.current.position.y = breathingSettle - snugPulse * 0.006 - landing * 0.018 + airborne * 0.006
      contactGroup.current.scale.set(
        1 + snugPulse * 0.035 + landing * 0.13 + prep * 0.035 - airborne * 0.026,
        1 + snugPulse * 0.012 - landing * 0.055 - prep * 0.016 + airborne * 0.018,
        1,
      )
      contactGroup.current.rotation.z = Math.sin(t * 0.86) * 0.004 * motion - landing * 0.01
    }
  })

  if (isMossContact) {
    return null
  }

  return (
    <group ref={contactGroup}>
      <mesh position={[0, -0.632, -0.235]} rotation-z={-0.015} scale={[0.86, 0.062, 0.24]}>
        <sphereGeometry args={[1, 14, 5]} />
        <meshBasicMaterial color={contactInk} transparent opacity={contactInkOpacity} depthWrite={false} />
      </mesh>
      <mesh position={[0.018, -0.598, -0.365]} rotation-z={0.02} scale={[0.92, 0.038, 0.18]}>
        <sphereGeometry args={[1, 12, 4]} />
        <meshBasicMaterial color={contactDark} transparent opacity={0.48} depthWrite={false} />
      </mesh>
      <mesh position={[-0.04, -0.58, -0.462]} rotation-z={-0.015} scale={[0.68, 0.024, 0.096]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={contactLight} transparent opacity={0.34} depthWrite={false} />
      </mesh>
      {isMossContact ? (
        <OrganicDetailDot
          position={[-0.48, -0.518, -0.39]}
          scale={[0.06, 0.016, 0.01]}
          color={contactDark}
          opacity={0.34}
        />
      ) : (
        <OrganicDetailStroke
          position={[-0.48, -0.518, -0.39]}
          rotation={-0.76}
          scale={[0.014, 0.07, 0.006]}
          color={contactDark}
          opacity={0.34}
        />
      )}
      {isMossContact ? (
        <OrganicDetailDot
          position={[-0.24, -0.526, -0.468]}
          scale={[0.052, 0.014, 0.009]}
          color={contactLight}
          opacity={0.42}
        />
      ) : (
        <OrganicDetailStroke
          position={[-0.24, -0.526, -0.468]}
          rotation={-0.28}
          scale={[0.012, 0.058, 0.006]}
          color={contactLight}
          opacity={0.42}
        />
      )}
      {isMossContact ? (
        <OrganicDetailDot
          position={[0.22, -0.526, -0.47]}
          scale={[0.052, 0.014, 0.009]}
          color={contactLight}
          opacity={0.42}
        />
      ) : (
        <OrganicDetailStroke
          position={[0.22, -0.526, -0.47]}
          rotation={0.26}
          scale={[0.012, 0.058, 0.006]}
          color={contactLight}
          opacity={0.42}
        />
      )}
      {isMossContact ? (
        <OrganicDetailDot
          position={[0.48, -0.52, -0.39]}
          scale={[0.06, 0.016, 0.01]}
          color={contactDark}
          opacity={0.34}
        />
      ) : (
        <OrganicDetailStroke
          position={[0.48, -0.52, -0.39]}
          rotation={0.76}
          scale={[0.014, 0.07, 0.006]}
          color={contactDark}
          opacity={0.34}
        />
      )}
    </group>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Retained only for historical renders; runtime scenes no longer mount it.
function GrassySeat({
  activity = 1,
  animation = 'idle',
  surface = 'grass',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
  surface?: 'grass' | 'moss'
}) {
  const breathingGrass = useRef<THREE.Group>(null)
  const nestGrass = useRef<THREE.Group>(null)
  const isMossSeat = surface === 'moss'
  const platformDark = isMossSeat ? MOSS_SHELL_MID : GRASS_DARK
  const platformMid = isMossSeat ? MOSS_SHELL_LIGHT : GRASS_MID
  const platformLight = isMossSeat ? MOSS_SHELL_GLOW : GRASS_LIGHT
  const actionTime = useAnimationActionTimer(animation)
  const platformGeometry = useMemo(
    () =>
      createOrganicGrassPlatformGeometry({
        radiusX: platformRadiusX,
        radiusZ: platformRadiusZ,
        thickness: 0.11,
        phase: 0.25,
        edgeSoftness: isMossSeat ? 0.88 : 0,
      }),
    [isMossSeat],
  )
  const platformMidGeometry = useMemo(
    () =>
      createOrganicGrassPlatformGeometry({
        radiusX: platformRadiusX * 0.82,
        radiusZ: platformRadiusZ * 0.78,
        thickness: 0.052,
        phase: 1.1,
        edgeSoftness: isMossSeat ? 0.92 : 0,
      }),
    [isMossSeat],
  )
  const platformHighlightGeometry = useMemo(
    () =>
      createOrganicGrassPlatformGeometry({
        radiusX: platformRadiusX * 0.58,
        radiusZ: platformRadiusZ * 0.42,
        thickness: 0.034,
        phase: 2.2,
        edgeSoftness: isMossSeat ? 0.96 : 0,
      }),
    [isMossSeat],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const motion = clampIdleActivity(activity)
    const breeze = Math.sin(t * 0.84) * 0.5 + Math.sin(t * 1.37 + 1.1) * 0.5
    const happySnug = idlePulse(t, 6.2, 0.71, 0.07)
    const jiggle = Math.sin(t * 8.6 + 0.2) * 0.008 + Math.sin(t * 13.4) * 0.004
    const hop = animation === 'hop' ? getHopMotion(actionTime(t), motion) : null
    const landing = hop ? hop.land : 0
    const prep = hop ? hop.prep : 0
    const airborne = hop ? hop.airborne : 0
    const grassRipple = landing * 0.06 + prep * 0.018 - airborne * 0.018

    if (breathingGrass.current) {
      breathingGrass.current.rotation.z = breeze * 0.009 + jiggle * 0.25 + landing * 0.018
      breathingGrass.current.position.x = Math.sin(t * 0.78 + 0.4) * 0.008 + jiggle * 0.22
      breathingGrass.current.position.y = -landing * 0.018 + airborne * 0.008
      breathingGrass.current.scale.set(1 + happySnug * 0.006 + grassRipple, 1 + happySnug * 0.016 - landing * 0.04, 1)
    }
    if (nestGrass.current) {
      nestGrass.current.position.y = -happySnug * 0.01 - prep * 0.016 - landing * 0.03 + airborne * 0.014
      nestGrass.current.rotation.z = Math.sin(t * 1.05 + 0.9) * 0.006 - jiggle * 0.18 - landing * 0.026
      nestGrass.current.scale.set(1 + happySnug * 0.016 + landing * 0.105 + prep * 0.045, 1 - happySnug * 0.026 - landing * 0.09, 1)
    }
  })

  if (isMossSeat) {
    return (
      <group>
        <mesh position={[0, -0.724, -0.34]} rotation-z={-0.012} scale={[0.34, 0.034, 0.1]}>
          <sphereGeometry args={[1, 14, 5]} />
          <meshToonMaterial color={MOSS_SHELL_DEEP} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
        </mesh>
        <mesh position={[0.018, -0.698, -0.41]} rotation-z={0.018} scale={[0.26, 0.024, 0.072]}>
          <sphereGeometry args={[1, 12, 4]} />
          <meshToonMaterial color={MOSS_SHELL_BASE} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
        </mesh>
        <GroundContactPolish activity={activity} animation={animation} surface={surface} />
        <MossGroundContactLayer />
      </group>
    )
  }

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0, -0.724, platformCenterZ]}
        outlineWidth={isMossSeat ? 0.005 : 0.012}
        outlineColor={isMossSeat ? MOSS_SHELL_BASE : VAC_ASSET_INK}
        geometry={<primitive object={platformGeometry} attach="geometry" />}
        material={<meshBasicMaterial color={platformDark} />}
      />
      <mesh position={[0.03, -0.698, platformCenterZ - 0.015]} geometry={platformMidGeometry}>
        <meshBasicMaterial color={platformMid} />
      </mesh>
      <mesh position={[-0.08, -0.676, platformCenterZ - 0.1]} rotation-z={-0.035} geometry={platformHighlightGeometry}>
        <meshBasicMaterial color={platformLight} />
      </mesh>
      <mesh
        position={[-0.04, -0.722, -0.26]}
        rotation-z={-0.025}
        scale={[1.36, 0.052, 0.39]}
      >
        <sphereGeometry args={[1, 12, 5]} />
        {toon(platformDark)}
      </mesh>
      <mesh
        position={[0.08, -0.692, -0.31]}
        rotation-z={0.055}
        scale={[1.18, 0.044, 0.32]}
      >
        <sphereGeometry args={[1, 10, 5]} />
        {toon(platformMid)}
      </mesh>
      <mesh position={[-0.02, -0.664, -0.58]} rotation-z={0.02} scale={[0.96, 0.03, 0.19]}>
        <sphereGeometry args={[1, 10, 4]} />
        {toon(platformLight)}
      </mesh>
      <mesh position={[-1.24, -0.635, -0.12]} rotation-z={-0.18} scale={[0.38, 0.052, 0.13]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={platformDark} />
      </mesh>
      <mesh position={[-0.62, -0.62, -0.08]} rotation-z={-0.18} scale={[0.36, 0.052, 0.13]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={platformDark} />
      </mesh>
      <mesh position={[-0.42, -0.612, -0.32]} rotation-z={0.12} scale={[0.3, 0.042, 0.13]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={platformMid} />
      </mesh>
      <mesh position={[0, -0.606, -0.38]} rotation-z={-0.04} scale={[0.32, 0.042, 0.14]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={platformLight} />
      </mesh>
      <mesh position={[0.38, -0.612, -0.32]} rotation-z={-0.07} scale={[0.31, 0.042, 0.13]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={platformDark} />
      </mesh>
      <mesh position={[0.68, -0.62, -0.08]} rotation-z={0.2} scale={[0.36, 0.052, 0.13]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={platformLight} />
      </mesh>
      <mesh position={[1.28, -0.635, -0.12]} rotation-z={0.2} scale={[0.38, 0.052, 0.13]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={platformLight} />
      </mesh>
      <mesh position={[-0.82, -0.63, -0.28]} rotation-z={-0.22} scale={[0.22, 0.036, 0.092]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={platformMid} />
      </mesh>
      <mesh position={[-0.04, -0.618, -0.57]} rotation-z={0.03} scale={[0.28, 0.03, 0.11]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={platformLight} />
      </mesh>
      <mesh position={[0.84, -0.63, -0.28]} rotation-z={0.24} scale={[0.22, 0.036, 0.092]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={platformMid} />
      </mesh>
      <mesh position={[-1.44, -0.646, -0.36]} rotation-z={-0.22} scale={[0.28, 0.04, 0.11]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={platformMid} />
      </mesh>
      <mesh position={[1.48, -0.646, -0.36]} rotation-z={0.24} scale={[0.28, 0.04, 0.11]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={platformMid} />
      </mesh>
      {circularPlatformMossLobes.map((lobe, index) => (
        <GrassMossPebble key={`circular-platform-moss-${index}`} {...lobe} soft={isMossSeat} />
      ))}
      {baseMossLobes.map((lobe, index) => (
        <GrassMossPebble key={`base-moss-lobe-${index}`} {...lobe} soft={isMossSeat} />
      ))}
      {mossPebbles.map((pebble, index) => (
        <GrassMossPebble key={`moss-pebble-${index}`} {...pebble} soft={isMossSeat} />
      ))}
      <GroundContactPolish activity={activity} animation={animation} surface={surface} />
      {isMossSeat ? <MossSeatFuzzLayer /> : <GrassFinePolishDetails />}
      <group ref={breathingGrass}>
        {isMossSeat
          ? null
          : wildRibbonGrass.map((blade, index) => (
              <GrassRibbonBlade key={`wild-ribbon-grass-${index}`} {...blade} />
            ))}
        {isMossSeat
          ? null
          : denseFineGrass.map((strand, index) => (
              <FineGrassStrand key={`dense-fine-grass-${index}`} {...strand} />
            ))}
        {isMossSeat
          ? null
          : circularPlatformFineGrass.map((strand, index) => (
              <FineGrassStrand key={`circular-platform-fine-grass-${index}`} {...strand} />
            ))}
        {isMossSeat
          ? null
          : longGrassWisps.map((strand, index) => (
              <FineGrassStrand key={`long-grass-wisp-${index}`} {...strand} />
            ))}
      </group>
      <group ref={nestGrass}>
        {isMossSeat
          ? null
          : pressedNestGrass.map((strand, index) => (
              <PressedGrassStrand key={`pressed-grass-${index}`} {...strand} phase={index * 0.73} />
            ))}
      </group>
      {isMossSeat
        ? null
        : perimeterGrassTufts.map((tuft, index) => (
            <GrassTuft key={`perimeter-grass-${index}`} {...tuft} />
          ))}
      {isMossSeat
        ? null
        : circularPlatformTufts.map((tuft, index) => (
            <GrassTuft key={`circular-platform-tuft-${index}`} {...tuft} />
          ))}
    </group>
  )
}

function ShellCrack({
  position,
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
}) {
  return (
    <group position={position} rotation-z={rotation} scale={scale}>
      <mesh rotation-z={-0.08} scale={[0.012, 0.092, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.72} depthWrite={false} />
      </mesh>
      <mesh position={[0.018, 0.026, 0]} rotation-z={-0.64} scale={[0.01, 0.048, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.62} depthWrite={false} />
      </mesh>
      <mesh position={[-0.018, -0.026, 0]} rotation-z={0.54} scale={[0.009, 0.04, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.56} depthWrite={false} />
      </mesh>
      <mesh position={[0.008, 0.034, -0.002]} rotation-z={-0.42} scale={[0.008, 0.052, 0.004]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SHELL_LIGHT} transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  )
}

function createRoundedEyePlateGeometry({
  width,
  height,
  depth,
  radius,
  bevel = 0.004,
}: {
  width: number
  height: number
  depth: number
  radius: number
  bevel?: number
}) {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const corner = Math.min(radius, halfWidth, halfHeight)
  const shape = new THREE.Shape()

  shape.moveTo(-halfWidth + corner, -halfHeight)
  shape.lineTo(halfWidth - corner, -halfHeight)
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + corner)
  shape.lineTo(halfWidth, halfHeight - corner)
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - corner, halfHeight)
  shape.lineTo(-halfWidth + corner, halfHeight)
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - corner)
  shape.lineTo(-halfWidth, -halfHeight + corner)
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + corner, -halfHeight)
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 8,
    steps: 1,
  })
  geometry.translate(0, 0, -depth / 2)
  geometry.computeVertexNormals()
  return geometry
}

function createPurpAlmondEyeGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-1, 0)
  shape.bezierCurveTo(-0.62, 0.82, 0.54, 1.06, 1, 0)
  shape.bezierCurveTo(0.52, -0.78, -0.58, -0.72, -1, 0)
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.5,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.08,
    bevelThickness: 0.08,
    curveSegments: 10,
    steps: 1,
  })
  geometry.translate(0, 0, -0.25)
  geometry.computeVertexNormals()
  return geometry
}

function PurpEyeShape({
  side,
  pupilRef,
  pupilOffset,
  pupilZ,
}: {
  side: -1 | 1
  pupilRef: Ref<THREE.Group>
  pupilOffset: number
  pupilZ: number
}) {
  const almondGeometry = useMemo(() => createPurpAlmondEyeGeometry(), [])

  return (
    <>
      <CodedAssetOutlineMesh
        position={[side * 0.006, 0.018, 0.006]}
        rotation-z={side * -0.07}
        scale={[0.1, 0.062, 0.03]}
        outlineWidth={0.0065}
        outlineColor="#170d20"
        geometry={<primitive object={almondGeometry} attach="geometry" />}
        material={toon("#55208f")}
      />
      <CodedAssetOutlineMesh
        position={[side * -0.004, -0.01, -0.014]}
        rotation-z={side * -0.052}
        scale={[0.084, 0.046, 0.026]}
        outlineWidth={0.0055}
        outlineColor="#170d20"
        geometry={<primitive object={almondGeometry} attach="geometry" />}
        material={<meshBasicMaterial color="#fff9eb" />}
      />
      <CurvedTube
        points={[
          [side * -0.064, 0.042, -0.006],
          [side * -0.012, 0.056, -0.01],
          [side * 0.05, 0.048, -0.008],
          [side * 0.09, 0.062, -0.002],
        ]}
        radius={0.0055}
        color="#b977ed"
        outlineWidth={0.0012}
      />
      <group ref={pupilRef} position={[pupilOffset, -0.008, pupilZ]}>
        <CodedAssetOutlineMesh
          rotation-z={side * -0.035}
          scale={[0.034, 0.039, 0.011]}
          outlineWidth={0.0045}
          outlineColor="#170d20"
          geometry={<sphereGeometry args={[1, 12, 8]} />}
          material={toon("#8247d1")}
        />
        <mesh position={[side * 0.002, -0.003, -0.012]} rotation-z={side * -0.025} scale={[0.014, 0.024, 0.006]}>
          <sphereGeometry args={[1, 10, 7]} />
          <meshBasicMaterial color="#17101d" />
        </mesh>
        <mesh position={[side * -0.01, 0.018, -0.019]} scale={[0.008, 0.01, 0.0035]}>
          <sphereGeometry args={[1, 7, 5]} />
          <meshBasicMaterial color="#fffdf2" toneMapped={false} />
        </mesh>
        <mesh position={[side * 0.01, -0.014, -0.018]} scale={[0.0045, 0.0055, 0.0025]}>
          <sphereGeometry args={[1, 6, 4]} />
          <meshBasicMaterial color="#e3c7ff" toneMapped={false} />
        </mesh>
      </group>
    </>
  )
}

function VrEyeShape({ centerOffset }: { centerOffset: number }) {
  const frameGeometry = useMemo(
    () => createRoundedEyePlateGeometry({ width: 0.374, height: 0.126, depth: 0.046, radius: 0.038, bevel: 0.006 }),
    [],
  )
  const lensGeometry = useMemo(
    () => createRoundedEyePlateGeometry({ width: 0.316, height: 0.074, depth: 0.018, radius: 0.025, bevel: 0.003 }),
    [],
  )

  return (
    <group position={[centerOffset, 0, 0]}>
      <CodedAssetOutlineMesh
        outlineWidth={0.008}
        geometry={<primitive object={frameGeometry} attach="geometry" />}
        material={toon("#6b747b")}
      />
      <mesh position={[0, -0.004, -0.033]} geometry={lensGeometry}>
        <meshBasicMaterial color="#11171b" />
      </mesh>
      <mesh position={[0, -0.004, -0.046]} scale={[0.133, 0.01, 0.006]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color="#50ff39" toneMapped={false} />
      </mesh>
      <mesh position={[-0.076, 0.046, -0.034]} rotation-z={-0.025} scale={[0.065, 0.006, 0.004]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color="#c1c9cb" />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <group key={`vr-hinge-${side}`}>
          <CodedAssetOutlineMesh
            position={[side * 0.194, -0.002, 0.004]}
            scale={[0.024, 0.042, 0.022]}
            outlineWidth={0.004}
            geometry={<sphereGeometry args={[1, 8, 5]} />}
            material={<meshBasicMaterial color="#4d555b" />}
          />
          <CurvedTube
            points={[
              [side * 0.196, 0.006, 0.008],
              [side * 0.216, 0.012, 0.028],
              [side * 0.225, 0, 0.052],
            ]}
            radius={0.0065}
            color="#171b1e"
            outlineWidth={0.0015}
          />
        </group>
      ))}
    </group>
  )
}

function EeeekEyeShape({ side }: { side: -1 | 1 }) {
  return (
    <>
      <CodedAssetOutlineMesh
        rotation-z={side * -0.018}
        scale={[0.047, 0.078, 0.024]}
        outlineWidth={0.0065}
        geometry={<sphereGeometry args={[1, 10, 7]} />}
        material={toon(EYE_WHITE)}
      />
      <mesh
        position={[side * -0.014, -0.005, -0.029]}
        rotation-z={side * -0.018}
        scale={[0.017, 0.056, 0.008]}
      >
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
      </mesh>
      <mesh position={[side * 0.006, -0.061, -0.021]} rotation-z={side * 0.04} scale={[0.027, 0.005, 0.004]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color="#d9d4c5" />
      </mesh>
      <mesh position={[side * -0.021, 0.032, -0.038]} scale={[0.006, 0.012, 0.003]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </>
  )
}

function SuspiciousEyeShape({
  side,
  skinPalette,
}: {
  side: -1 | 1
  skinPalette: GlowbudSkinPalette
}) {
  return (
    <>
      <CodedAssetOutlineMesh
        rotation-z={side * -0.045}
        scale={[0.075, 0.038, 0.022]}
        outlineWidth={0.006}
        geometry={<sphereGeometry args={[1, 12, 6]} />}
        material={toon(EYE_WHITE)}
      />
      <mesh
        position={[0.026, -0.009, -0.027]}
        rotation-z={side * -0.045}
        scale={[0.018, 0.025, 0.008]}
      >
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
      </mesh>
      <mesh position={[0, 0.028, -0.019]} rotation-z={side * -0.08} scale={[0.078, 0.024, 0.012]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshToonMaterial color={skinPalette.shade} gradientMap={getVacuumHeadToonRampTexture()} />
      </mesh>
      <mesh position={[side * 0.018, -0.03, -0.019]} rotation-z={side * 0.04} scale={[0.044, 0.006, 0.004]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={skinPalette.light} />
      </mesh>
      <CurvedTube
        points={[
          [-0.057, 0.017 - side * 0.002, -0.042],
          [0, 0.031 + side * 0.003, -0.044],
          [0.057, 0.019 + side * 0.002, -0.042],
        ]}
        radius={0.0044}
        color={VAC_ASSET_DETAIL_INK}
        outlineWidth={0.001}
      />
    </>
  )
}

function BlazeitupEyeShape({ side }: { side: -1 | 1 }) {
  return (
    <>
      <CodedAssetOutlineMesh
        rotation-z={side * -0.055}
        scale={[0.064, 0.052, 0.022]}
        outlineWidth={0.006}
        geometry={<sphereGeometry args={[1, 11, 6]} />}
        material={toon("#e78c93")}
      />
      <mesh
        position={[side * -0.012, -0.011, -0.028]}
        rotation-z={side * -0.055}
        scale={[0.019, 0.032, 0.008]}
      >
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
      </mesh>
      <mesh position={[0, 0.03, -0.02]} rotation-z={side * -0.17} scale={[0.068, 0.022, 0.011]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color="#3d1620" />
      </mesh>
      <mesh position={[side * -0.017, 0.004, -0.037]} scale={[0.006, 0.01, 0.003]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial color="#ffd9d8" />
      </mesh>
      <mesh position={[side * 0.028, -0.038, -0.023]} rotation-z={side * 0.12} scale={[0.026, 0.006, 0.004]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color="#b83e48" />
      </mesh>
    </>
  )
}

function WhatsThatEyeShape({ side }: { side: -1 | 1 }) {
  return (
    <>
      <CodedAssetOutlineMesh
        rotation-z={side * -0.022}
        position={[0, side === -1 ? 0.002 : -0.002, 0]}
        scale={[side === -1 ? 0.058 : 0.054, side === -1 ? 0.074 : 0.07, 0.024]}
        outlineWidth={0.0065}
        geometry={<sphereGeometry args={[1, 11, 7]} />}
        material={toon(EYE_WHITE)}
      />
      <mesh
        position={[side * -0.023, -0.007, -0.03]}
        rotation-z={side * -0.02}
        scale={[0.029, 0.056, 0.009]}
      >
        <sphereGeometry args={[1, 9, 6]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
      </mesh>
      <mesh position={[side * 0.008, -0.057, -0.022]} rotation-z={side * 0.05} scale={[0.034, 0.006, 0.004]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color="#d9d5c7" />
      </mesh>
      <mesh position={[side * -0.034, 0.028, -0.04]} scale={[0.009, 0.014, 0.003]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </>
  )
}

function MossingEyeShape({ side }: { side: -1 | 1 }) {
  return (
    <>
      <CodedAssetOutlineMesh
        rotation-z={side * -0.025}
        scale={[0.054, 0.068, 0.024]}
        outlineWidth={0.0065}
        geometry={<sphereGeometry args={[1, 11, 7]} />}
        material={toon(EYE_WHITE)}
      />
      <mesh position={[0, 0.032, -0.02]} rotation-z={side * -0.05} scale={[0.055, 0.034, 0.012]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshToonMaterial color="#587632" gradientMap={getVacuumHeadToonRampTexture()} />
      </mesh>
      <mesh
        position={[side * 0.025, 0.044, -0.027]}
        rotation-z={side * -0.14}
        scale={[0.028, 0.017, 0.008]}
      >
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color="#718f43" />
      </mesh>
      <mesh
        position={[side * -0.01, -0.012, -0.03]}
        rotation-z={side * -0.02}
        scale={[0.015, 0.035, 0.008]}
      >
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color="#263421" />
      </mesh>
      <CurvedTube
        points={[
          [-0.04, 0.02, -0.041],
          [0, 0.026 + side * 0.002, -0.043],
          [0.04, 0.02, -0.041],
        ]}
        radius={0.0032}
        color="#27351e"
        outlineWidth={0.0008}
      />
      <mesh position={[side * -0.017, 0.004, -0.04]} scale={[0.005, 0.009, 0.003]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial color="#e2f0c8" />
      </mesh>
    </>
  )
}

function ShadesEyeShape({ centerOffset }: { centerOffset: number }) {
  const lensFrameGeometry = useMemo(
    () => createRoundedEyePlateGeometry({ width: 0.15, height: 0.102, depth: 0.04, radius: 0.038, bevel: 0.005 }),
    [],
  )
  const lensGeometry = useMemo(
    () => createRoundedEyePlateGeometry({ width: 0.12, height: 0.072, depth: 0.016, radius: 0.029, bevel: 0.003 }),
    [],
  )

  return (
    <group position={[centerOffset, 0, 0]}>
      {([-1, 1] as const).map((side) => (
        <group key={`shade-lens-${side}`} position={[side * 0.086, 0, 0]} rotation-z={side * -0.035}>
          <CodedAssetOutlineMesh
            outlineWidth={0.0065}
            geometry={<primitive object={lensFrameGeometry} attach="geometry" />}
            material={<meshBasicMaterial color="#101116" />}
          />
          <mesh position={[0, -0.003, -0.03]} geometry={lensGeometry}>
            <meshBasicMaterial color="#29303a" />
          </mesh>
          <mesh position={[side * -0.018, 0.021, -0.043]} rotation-z={side * -0.08} scale={[0.033, 0.006, 0.004]}>
            <sphereGeometry args={[1, 8, 4]} />
            <meshBasicMaterial color="#76838d" />
          </mesh>
        </group>
      ))}
      <CurvedTube
        points={[
          [-0.026, 0.006, -0.008],
          [0, 0.014, -0.018],
          [0.026, 0.006, -0.008],
        ]}
        radius={0.0085}
        color="#101116"
        outlineWidth={0.0015}
      />
      {([-1, 1] as const).map((side) => (
        <group key={`shade-arm-${side}`}>
          <mesh position={[side * 0.164, 0.004, 0.002]} scale={[0.018, 0.014, 0.012]}>
            <sphereGeometry args={[1, 8, 5]} />
            <meshBasicMaterial color="#101116" />
          </mesh>
          <CurvedTube
            points={[
              [side * 0.15, 0.008, 0.002],
              [side * 0.188, 0.012, 0.022],
              [side * 0.21, -0.002, 0.052],
            ]}
            radius={0.007}
            color="#101116"
            outlineWidth={0.0014}
          />
        </group>
      ))}
    </group>
  )
}

function Eye({
  side,
  pupilOffset,
  fitted = false,
  activity = 1,
  animation = 'idle',
  eyeTrait = 'open',
  skinPalette = getGlowbudSkinPalette(),
}: {
  side: -1 | 1
  pupilOffset: number
  fitted?: boolean
  activity?: number
  animation?: RedShellCritterAnimation
  eyeTrait?: GlowbudEyeTrait
  skinPalette?: GlowbudSkinPalette
}) {
  const eyeGroup = useRef<THREE.Group>(null)
  const pupilGroup = useRef<THREE.Group>(null)
  const actionTime = useAnimationActionTimer(animation)
  const isDot = eyeTrait === 'dot'
  const isUnibrow = eyeTrait === 'unibrow'
  const isEnjoyer = eyeTrait === 'enjoyer'
  const isMellow = eyeTrait === 'mellow'
  const isPurp = eyeTrait === 'purp'
  const isVr = eyeTrait === 'vr'
  const isEeeek = eyeTrait === 'eeeek'
  const isSuspicious = eyeTrait === 'suspicious'
  const isBlazeitup420 = eyeTrait === 'blazeitup420'
  const isWhatsThat = eyeTrait === 'whats-that'
  const isMossing = eyeTrait === 'mossing'
  const isShades = eyeTrait === 'shades'
  const isRigidEyewear = isVr || isShades
  const eyeZ = fitted ? -0.735 : -0.71
  const pupilZ = fitted ? -0.03 : -0.026
  const highlightZ = fitted ? -0.038 : -0.034
  const speciesEyeSpacing = skinPalette.finish === 'ape' ? 0.9 : 1
  const eyeX = side * speciesEyeSpacing * (
    isVr
      ? 0.09
      : isShades
        ? 0.105
        : isEnjoyer
          ? 0.106
          : isDot
            ? 0.112
            : isMellow
              ? 0.118
              : isPurp
                ? 0.118
                : isEeeek || isSuspicious || isBlazeitup420 || isWhatsThat || isMossing
                  ? 0.112
                : 0.13
  )
  const eyeY = isEnjoyer
    ? 0.068
    : isDot
      ? 0.06
      : isMellow
        ? 0.092
        : isVr || isShades
          ? 0.092
          : isPurp
            ? 0.106
            : isEeeek || isSuspicious || isBlazeitup420 || isWhatsThat || isMossing
              ? 0.098
            : 0.115

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const actionT = actionTime(t)
    const ambient = getAmbientLifeMotion(t, motion)
    const performance = getDirectedPerformanceMotion(actionT, animation, motion)
    const happySnug = idlePulse(t, 6.2, 0.71, 0.055) * motion
    const hopFace = getHopExpressionMotion(actionT, animation === 'hop' ? motion : 0)
    const grumble = getWizardGrumbleMotion(actionT, animation === 'grumble' ? motion : 0)
    const cycle = (t + (side === 1 ? 0.012 : 0)) % 5.4
    const blinkWindow = cycle > 5.02 ? (cycle - 5.02) / 0.38 : 0
    const idleBlink = blinkWindow > 0 ? Math.sin(Math.min(1, blinkWindow) * Math.PI) * motion : 0
    const blink = isRigidEyewear
      ? 0
      : Math.min(0.82, idleBlink + ambient.blink + hopFace.blink + grumble.talk * 0.1 + grumble.hit * 0.28)
    const curiousLift =
      Math.sin(t * 1.15 + (isRigidEyewear ? 0 : side * 0.4)) * 0.003 * motion
      + ambient.gazeY * 0.32
      + ambient.perk * 0.003
      + performance.faceGazeY
      + performance.facePerk
      + hopFace.eyeLift
      + grumble.bodyJolt * 0.12
    const eyeSquashY = isRigidEyewear
      ? 1 + hopFace.eyeWide * 0.025
      : isEnjoyer
      ? Math.max(0.34, 1 - blink * 0.58 - hopFace.faceFocus * 0.04 + hopFace.eyeWide * 0.08)
      : isDot
        ? Math.max(0.5, 0.94 - blink * 0.22 - hopFace.faceFocus * 0.02 + hopFace.eyeWide * 0.06)
      : isMellow
        ? Math.max(0.36, 0.68 - blink * 0.26 - hopFace.faceFocus * 0.035 + hopFace.eyeWide * 0.08)
        : Math.max(0.38, 1 - blink * 0.62 - hopFace.faceFocus * 0.055 + hopFace.eyeWide * 0.16)

    if (eyeGroup.current) {
      eyeGroup.current.position.set(
        eyeX,
        eyeY + curiousLift - blink * 0.004,
        eyeZ,
      )
      eyeGroup.current.rotation.z =
        ambient.faceTilt * 0.32
        + grumble.chatter * 0.22
        + side * grumble.hit * 0.006
        + performance.boogieBeat * 0.012
      eyeGroup.current.scale.set(
        1
          + blink * (isRigidEyewear ? 0 : isEnjoyer ? 0.012 : isDot ? 0.018 : 0.03)
          + hopFace.eyeWide * (isRigidEyewear ? 0.015 : isEnjoyer ? 0.018 : isDot ? 0.025 : 0.05),
        eyeSquashY,
        1,
      )
    }
    if (pupilGroup.current) {
      pupilGroup.current.position.set(
        pupilOffset +
          Math.sin(t * 0.62 + side * 0.3) * 0.004 * motion -
          side * happySnug * 0.004 -
          side * hopFace.pupilInward +
          ambient.gazeX +
          performance.faceGazeX +
          grumble.chatter * 0.32,
        (isMellow ? -0.002 : -0.012)
          + Math.sin(t * 0.48 + 0.8) * 0.003 * motion
          + happySnug * 0.005
          + ambient.gazeY
          + performance.faceGazeY
          + hopFace.pupilY,
        pupilZ,
      )
      pupilGroup.current.scale.set(
        1 + happySnug * 0.08 + hopFace.eyeWide * 0.08,
        (isMellow ? 0.74 : 1) + happySnug * 0.04 + hopFace.eyeWide * 0.04,
        1,
      )
    }
  })

  if (isRigidEyewear && side === 1) return null

  return (
    <group ref={eyeGroup} position={[eyeX, eyeY, eyeZ]}>
      {isPurp ? (
        <PurpEyeShape side={side} pupilRef={pupilGroup} pupilOffset={pupilOffset} pupilZ={pupilZ} />
      ) : isVr ? (
        <VrEyeShape centerOffset={-eyeX} />
      ) : isEeeek ? (
        <EeeekEyeShape side={side} />
      ) : isSuspicious ? (
        <SuspiciousEyeShape side={side} skinPalette={skinPalette} />
      ) : isBlazeitup420 ? (
        <BlazeitupEyeShape side={side} />
      ) : isWhatsThat ? (
        <WhatsThatEyeShape side={side} />
      ) : isMossing ? (
        <MossingEyeShape side={side} />
      ) : isShades ? (
        <ShadesEyeShape centerOffset={-eyeX} />
      ) : isDot ? (
        <>
          <CodedAssetOutlineMesh
            rotation-z={side * -0.02}
            scale={[0.032, 0.043, 0.016]}
            outlineWidth={0.0035}
            geometry={<sphereGeometry args={[1, 10, 7]} />}
            material={toon("#120c16")}
          />
          <mesh position={[side * -0.008, 0.017, -0.018]} scale={[0.006, 0.008, 0.003]}>
            <sphereGeometry args={[1, 7, 4]} />
            <meshBasicMaterial color="#706776" />
          </mesh>
        </>
      ) : isEnjoyer ? (
        <>
          <CodedAssetOutlineMesh
            rotation-z={side * -0.012}
            scale={[0.022, 0.056, 0.016]}
            outlineWidth={0.0035}
            geometry={<sphereGeometry args={[1, 8, 5]} />}
            material={toon("#0c0810")}
          />
          <mesh
            position={[side * -0.006, 0.019, -0.019]}
            rotation-z={side * -0.012}
            scale={[0.0045, 0.013, 0.003]}
          >
            <sphereGeometry args={[1, 6, 4]} />
            <meshBasicMaterial color="#625968" />
          </mesh>
        </>
      ) : isMellow ? (
        <>
          <CodedAssetOutlineMesh
            scale={[0.089, 0.08, 0.026]}
            outlineWidth={0.007}
            geometry={<sphereGeometry args={[1, 12, 7]} />}
            material={toon(EYE_WHITE)}
          />
          <mesh position={[0, 0.035, -0.017]} rotation-z={side * -0.03} scale={[0.09, 0.037, 0.013]}>
            <sphereGeometry args={[1, 10, 4]} />
            <meshToonMaterial color={skinPalette.shade} gradientMap={getVacuumHeadToonRampTexture()} />
          </mesh>
          <mesh position={[side * 0.012, -0.054, -0.018]} rotation-z={side * 0.035} scale={[0.057, 0.007, 0.004]}>
            <sphereGeometry args={[1, 9, 4]} />
            <meshBasicMaterial color="#d7d2c4" />
          </mesh>
          <CurvedTube
            points={[
              [-0.054, 0.021, -0.044],
              [0, 0.035, -0.047],
              [0.054, 0.021, -0.044],
            ]}
            radius={0.0041}
            color={VAC_ASSET_DETAIL_INK}
            outlineWidth={0.0012}
          />
          <group ref={pupilGroup} position={[pupilOffset * 0.42, -0.002, pupilZ]}>
            <mesh rotation-z={side * 0.02} scale={[0.025, 0.059, 0.011]}>
              <sphereGeometry args={[1, 8, 5]} />
              <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
            </mesh>
            <mesh position={[0.01 * -side, -0.024, highlightZ - pupilZ - 0.002]} scale={[0.017, 0.013, 0.004]}>
              <sphereGeometry args={[1, 6, 4]} />
              <meshBasicMaterial color="#fff6d6" toneMapped={false} />
            </mesh>
          </group>
        </>
      ) : (
        <>
          <CodedAssetOutlineMesh
            scale={[0.091, 0.131, 0.029]}
            outlineWidth={0.009}
            geometry={<sphereGeometry args={[1, 12, 8]} />}
            material={toon(EYE_WHITE)}
          />
          {!isUnibrow ? (
            <CurvedTube
              points={[
                [-0.055, 0.073, -0.038],
                [-0.01 * side, 0.096, -0.042],
                [0.055, 0.073, -0.038],
              ]}
              radius={0.0045}
              color={VAC_ASSET_DETAIL_INK}
              outlineWidth={0.0014}
            />
          ) : null}
          <mesh position={[side * 0.004, -0.066, fitted ? -0.013 : -0.015]} rotation-z={side * 0.08} scale={[0.046, 0.008, 0.004]}>
            <sphereGeometry args={[1, 8, 4]} />
            <meshBasicMaterial color="#d8d4c7" />
          </mesh>
          <group ref={pupilGroup} position={[pupilOffset, -0.012, pupilZ]}>
            <mesh rotation-z={side * 0.035} scale={[0.038, 0.067, 0.012]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
            </mesh>
            <mesh position={[-0.024, 0.052, highlightZ - pupilZ]} scale={[0.021, 0.026, 0.006]}>
              <sphereGeometry args={[1, 6, 4]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
            <mesh position={[0.014, -0.038, highlightZ - pupilZ - 0.001]} scale={[0.009, 0.011, 0.004]}>
              <sphereGeometry args={[1, 6, 4]} />
              <meshBasicMaterial color="#fff6d6" toneMapped={false} />
            </mesh>
          </group>
        </>
      )}
    </group>
  )
}

function GlowbudMouthCavity({
  fitted = false,
  mouthZ,
  skinPalette = getGlowbudSkinPalette(),
}: {
  fitted?: boolean
  mouthZ: number
  skinPalette?: GlowbudSkinPalette
}) {
  const outerWidth = fitted ? 0.174 : 0.152
  const outerHeight = fitted ? 0.06 : 0.052
  const upperZ = mouthZ - 0.012
  const throatZ = mouthZ - 0.008
  const cheekZ = mouthZ - 0.004
  const lipZ = mouthZ - 0.014

  return (
    <group rotation-z={fitted ? -0.012 : 0.008}>
      <mesh position={[0.002, -0.08, cheekZ + 0.004]} rotation-z={0.02} scale={[outerWidth * 0.96, outerHeight * 0.66, 0.006]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={skinPalette.shade} transparent opacity={0.34} depthWrite={false} />
      </mesh>
      <mesh position={[-0.02, -0.073, throatZ]} rotation-z={-0.014} scale={[outerWidth * 0.92, outerHeight * 0.5, 0.011]}>
        <sphereGeometry args={[1, 14, 5]} />
        <meshBasicMaterial color="#050309" />
      </mesh>
      <mesh position={[-0.02, -0.062, upperZ]} rotation-z={-0.018} scale={[outerWidth * 0.74, outerHeight * 0.17, 0.006]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
      </mesh>
      <mesh position={[0.028, -0.088, lipZ]} rotation-z={-0.02} scale={[outerWidth * 0.52, outerHeight * 0.15, 0.006]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={skinPalette.light} transparent opacity={0.68} depthWrite={false} />
      </mesh>
      <mesh position={[0.052, -0.094, lipZ - 0.002]} rotation-z={-0.06} scale={[outerWidth * 0.28, outerHeight * 0.11, 0.005]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={skinPalette.shade} transparent opacity={0.64} depthWrite={false} />
      </mesh>
      <mesh position={[-0.006, -0.104, lipZ - 0.003]} rotation-z={-0.03} scale={[outerWidth * 0.48, outerHeight * 0.11, 0.004]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={skinPalette.shade} transparent opacity={0.46} depthWrite={false} />
      </mesh>
      <mesh position={[-outerWidth * 0.53, -0.076, throatZ - 0.001]} rotation-z={0.12} scale={[outerWidth * 0.09, outerHeight * 0.26, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
      </mesh>
      <mesh position={[outerWidth * 0.48, -0.078, throatZ - 0.001]} rotation-z={-0.16} scale={[outerWidth * 0.09, outerHeight * 0.22, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
      </mesh>
      <CurvedTube
        points={[
          [-outerWidth * 0.54, -0.064, upperZ - 0.002],
          [-outerWidth * 0.24, -0.048, upperZ - 0.003],
          [0.018, -0.052, upperZ - 0.003],
          [outerWidth * 0.52, -0.068, upperZ - 0.002],
        ]}
        radius={fitted ? 0.0044 : 0.0038}
        color={VAC_ASSET_DETAIL_INK}
        outlineWidth={0.0008}
      />
      <CurvedTube
        points={[
          [-outerWidth * 0.47, -0.094, cheekZ - 0.003],
          [-0.02, -0.111, lipZ - 0.003],
          [outerWidth * 0.46, -0.093, cheekZ - 0.003],
        ]}
        radius={fitted ? 0.003 : 0.0026}
        color={skinPalette.shade}
        outlineWidth={0.0006}
      />
      <mesh position={[-0.076, -0.086, lipZ - 0.001]} rotation-z={-0.35} scale={[0.022, 0.006, 0.003]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color={skinPalette.light} transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  )
}

function ClassicSmileMouth({
  fitted = false,
  mouthZ,
  skinPalette = getGlowbudSkinPalette(),
}: {
  fitted?: boolean
  mouthZ: number
  skinPalette?: GlowbudSkinPalette
}) {
  const smileZ = mouthZ - 0.014
  const smileWidth = fitted ? 0.19 : 0.16
  const centerY = fitted ? -0.092 : -0.084

  return (
    <group rotation-z={fitted ? -0.006 : 0.004}>
      <mesh position={[0.002, centerY - 0.024, smileZ + 0.006]} rotation-z={-0.01} scale={[smileWidth * 0.58, 0.012, 0.004]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={skinPalette.shade} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <CurvedTube
        points={[
          [-smileWidth * 0.52, centerY + 0.014, smileZ - 0.002],
          [-smileWidth * 0.2, centerY - 0.011, smileZ - 0.004],
          [smileWidth * 0.22, centerY - 0.011, smileZ - 0.004],
          [smileWidth * 0.52, centerY + 0.014, smileZ - 0.002],
        ]}
        radius={fitted ? 0.0072 : 0.006}
        color={VAC_ASSET_DETAIL_INK}
        outlineWidth={0.0012}
      />
      <mesh position={[-smileWidth * 0.55, centerY + 0.014, smileZ - 0.006]} rotation-z={0.34} scale={[0.028, 0.007, 0.004]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
      </mesh>
      <mesh position={[smileWidth * 0.55, centerY + 0.014, smileZ - 0.006]} rotation-z={-0.34} scale={[0.028, 0.007, 0.004]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
      </mesh>
      <mesh position={[0.012, centerY + 0.017, smileZ - 0.01]} rotation-z={-0.08} scale={[0.032, 0.004, 0.003]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color={skinPalette.light} transparent opacity={0.24} depthWrite={false} />
      </mesh>
    </group>
  )
}

function SurprisedOMouth({
  fitted = false,
  mouthZ,
  skinPalette = getGlowbudSkinPalette(),
}: {
  fitted?: boolean
  mouthZ: number
  skinPalette?: GlowbudSkinPalette
}) {
  const centerX = fitted ? -0.018 : -0.014
  const centerY = fitted ? -0.126 : -0.108
  const mouthScale: [number, number, number] = fitted ? [0.035, 0.046, 0.012] : [0.03, 0.04, 0.01]
  const shadowScale: [number, number, number] = fitted ? [0.058, 0.03, 0.004] : [0.05, 0.026, 0.004]

  return (
    <group rotation-z={fitted ? -0.018 : -0.012}>
      <mesh position={[centerX - 0.004, centerY - 0.022, mouthZ - 0.006]} rotation-z={0.03} scale={shadowScale}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={skinPalette.shade} transparent opacity={0.24} depthWrite={false} />
      </mesh>
      <CodedAssetOutlineMesh
        position={[centerX, centerY, mouthZ - 0.016]}
        scale={mouthScale}
        outlineWidth={fitted ? 0.0028 : 0.0034}
        outlineColor={VAC_ASSET_DETAIL_INK}
        geometry={<sphereGeometry args={[1, 14, 9]} />}
        material={<meshBasicMaterial color="#050309" />}
      />
      <mesh position={[centerX + 0.012, centerY + 0.022, mouthZ - 0.026]} rotation-z={0.18} scale={[0.009, 0.006, 0.003]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial color={skinPalette.light} transparent opacity={0.32} depthWrite={false} />
      </mesh>
    </group>
  )
}

function HuhMouth({
  fitted = false,
  mouthZ,
  skinPalette = getGlowbudSkinPalette(),
}: {
  fitted?: boolean
  mouthZ: number
  skinPalette?: GlowbudSkinPalette
}) {
  const centerX = fitted ? 0.014 : 0.012
  const centerY = fitted ? -0.12 : -0.104
  const cavityScale: [number, number, number] = fitted
    ? [0.026, 0.027, 0.014]
    : [0.023, 0.024, 0.012]
  const insetScale: [number, number, number] = fitted
    ? [0.039, 0.04, 0.006]
    : [0.034, 0.036, 0.005]

  return (
    <group rotation-z={-0.012}>
      <mesh
        position={[centerX + 0.002, centerY - 0.003, mouthZ - 0.008]}
        scale={insetScale}
      >
        <sphereGeometry args={[1, 12, 7]} />
        <meshBasicMaterial
          color={skinPalette.shade}
          transparent
          opacity={0.24}
          depthWrite={false}
        />
      </mesh>
      <CodedAssetOutlineMesh
        position={[centerX, centerY, mouthZ - 0.016]}
        scale={cavityScale}
        outlineWidth={fitted ? 0.0022 : 0.0025}
        outlineColor={VAC_ASSET_DETAIL_INK}
        geometry={<sphereGeometry args={[1, 16, 10]} />}
        material={<meshBasicMaterial color="#050309" />}
      />
      <mesh
        position={[centerX - 0.007, centerY + 0.008, mouthZ - 0.029]}
        scale={[0.004, 0.0048, 0.0025]}
      >
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial color={skinPalette.light} transparent opacity={0.26} depthWrite={false} />
      </mesh>
    </group>
  )
}

function LongFaceMouth({
  fitted = false,
  mouthZ,
  skinPalette = getGlowbudSkinPalette(),
}: {
  fitted?: boolean
  mouthZ: number
  skinPalette?: GlowbudSkinPalette
}) {
  const centerY = fitted ? -0.114 : -0.1
  const cavityScale: [number, number, number] = fitted
    ? [0.148, 0.022, 0.014]
    : [0.128, 0.019, 0.012]

  return (
    <group rotation-z={fitted ? -0.008 : 0.004}>
      <mesh
        position={[0.004, centerY - 0.004, mouthZ - 0.007]}
        scale={[cavityScale[0] * 1.08, cavityScale[1] * 1.58, 0.006]}
      >
        <sphereGeometry args={[1, 16, 7]} />
        <meshBasicMaterial
          color={skinPalette.shade}
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>
      <CodedAssetOutlineMesh
        position={[0, centerY, mouthZ - 0.017]}
        scale={cavityScale}
        outlineWidth={fitted ? 0.0023 : 0.0026}
        outlineColor={VAC_ASSET_DETAIL_INK}
        geometry={<sphereGeometry args={[1, 18, 8]} />}
        material={<meshBasicMaterial color="#08060a" />}
      />
      <mesh
        position={[-cavityScale[0] * 0.46, centerY + 0.007, mouthZ - 0.03]}
        rotation-z={-0.08}
        scale={[cavityScale[0] * 0.18, cavityScale[1] * 0.15, 0.0024]}
      >
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color="#716777" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  )
}

function createWazzzupMouthCavityGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-1, 0.04)
  shape.bezierCurveTo(-0.78, 0.74, 0.64, 0.84, 1, 0.03)
  shape.bezierCurveTo(0.72, -0.82, -0.68, -0.88, -1, 0.04)
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.5,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.075,
    bevelThickness: 0.075,
    curveSegments: 12,
    steps: 1,
  })
  geometry.translate(0, 0, -0.25)
  geometry.computeVertexNormals()
  return geometry
}

function createWazzzupTongueGeometry(fitted: boolean) {
  const size = fitted ? 1 : 0.87
  const path = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0.004, 0.018, -0.032),
      new THREE.Vector3(0.014, -0.012, -0.058),
      new THREE.Vector3(0.025, -0.058, -0.098),
      new THREE.Vector3(0.018, -0.108, -0.112),
      new THREE.Vector3(-0.006, -0.148, -0.098),
      new THREE.Vector3(-0.021, -0.136, -0.074),
    ].map((point) => point.multiplyScalar(size)),
    false,
    'centripetal',
    0.48,
  )
  const lengthSegments = 14
  const radialSegments = 16
  const vertices: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const lateral = new THREE.Vector3(1, 0, 0)
  const center = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const vertex = new THREE.Vector3()
  const tongueBase = new THREE.Color('#ee7180')
  const tongueLight = new THREE.Color('#ffa0a5')
  const tongueShade = new THREE.Color('#a93653')
  const vertexColor = new THREE.Color()

  for (let ring = 0; ring <= lengthSegments; ring += 1) {
    const t = ring / lengthSegments
    path.getPointAt(t, center)
    path.getTangentAt(t, tangent).normalize()
    normal.copy(tangent).cross(lateral).normalize()
    const endTaper = THREE.MathUtils.smoothstep(t, 0.76, 1)
    const rootBloom = THREE.MathUtils.smoothstep(t, 0, 0.22)
    const halfWidth = THREE.MathUtils.lerp(
      size * (0.064 + rootBloom * 0.025 + Math.sin(Math.min(1, t / 0.8) * Math.PI) * 0.006),
      size * 0.009,
      endTaper,
    )
    const halfThickness = THREE.MathUtils.lerp(
      size * (0.024 + rootBloom * 0.012 + Math.sin(Math.min(1, t / 0.82) * Math.PI) * 0.004),
      size * 0.008,
      endTaper,
    )

    for (let radial = 0; radial < radialSegments; radial += 1) {
      const angle = (radial / radialSegments) * Math.PI * 2
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const front = Math.max(0, -sin)
      const centerRidge = Math.pow(Math.max(0, 1 - Math.abs(cos)), 5) * front
      const groove = centerRidge * (0.12 + 0.13 * Math.sin(Math.min(1, t / 0.86) * Math.PI))
      const normalAmount = sin * halfThickness * (1 - groove)

      vertex
        .copy(center)
        .addScaledVector(lateral, cos * halfWidth)
        .addScaledVector(normal, normalAmount)
      vertices.push(vertex.x, vertex.y, vertex.z)

      vertexColor
        .copy(tongueBase)
        .lerp(tongueLight, front * 0.34 * (1 - centerRidge * 0.7))
        .lerp(tongueShade, Math.max(0, sin) * 0.32 + centerRidge * 0.34)
      colors.push(vertexColor.r, vertexColor.g, vertexColor.b)
    }
  }

  for (let ring = 0; ring < lengthSegments; ring += 1) {
    for (let radial = 0; radial < radialSegments; radial += 1) {
      const nextRadial = (radial + 1) % radialSegments
      const current = ring * radialSegments + radial
      const currentNext = ring * radialSegments + nextRadial
      const following = (ring + 1) * radialSegments + radial
      const followingNext = (ring + 1) * radialSegments + nextRadial
      indices.push(current, followingNext, following)
      indices.push(current, currentNext, followingNext)
    }
  }

  const startCenterIndex = vertices.length / 3
  path.getPointAt(0, center)
  vertices.push(center.x, center.y, center.z)
  colors.push(tongueShade.r, tongueShade.g, tongueShade.b)
  const endCenterIndex = vertices.length / 3
  path.getPointAt(1, center)
  vertices.push(center.x, center.y, center.z)
  colors.push(tongueBase.r, tongueBase.g, tongueBase.b)

  for (let radial = 0; radial < radialSegments; radial += 1) {
    const nextRadial = (radial + 1) % radialSegments
    indices.push(startCenterIndex, radial, nextRadial)
    const endRing = lengthSegments * radialSegments
    indices.push(endCenterIndex, endRing + nextRadial, endRing + radial)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function WazzzzzzzzupMouth({
  fitted = false,
  mouthZ,
  activity = 1,
  animation = 'idle',
}: {
  fitted?: boolean
  mouthZ: number
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const tongueMotion = useRef<THREE.Group>(null)
  const centerY = fitted ? -0.112 : -0.098
  const cavityScale: [number, number, number] = fitted
    ? [0.148, 0.078, 0.052]
    : [0.129, 0.068, 0.046]
  const cavityGeometry = useMemo(() => createWazzzupMouthCavityGeometry(), [])
  const tongueGeometry = useMemo(() => createWazzzupTongueGeometry(fitted), [fitted])
  const lowerLipY = centerY - cavityScale[1] * 0.61
  const lowerLipZ = mouthZ - 0.047
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    if (!tongueMotion.current) return
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const hopFace = getHopExpressionMotion(actionTime(t), animation === 'hop' ? motion : 0)
    const wag = Math.sin(t * 1.55 + 0.4) * 0.018 * motion
    const softPulse = Math.sin(t * 1.1 + 1.2) * 0.006 * motion

    tongueMotion.current.rotation.z = wag + hopFace.rotateZ * 0.06
    tongueMotion.current.scale.set(
      1 + softPulse + hopFace.cheekSquash * 0.012,
      1 - softPulse * 0.45 + hopFace.mouthOpen * 0.035,
      1,
    )
  })

  return (
    <group rotation-z={fitted ? -0.008 : 0.006}>
      <CodedAssetOutlineMesh
        position={[0, centerY, mouthZ - 0.018]}
        scale={cavityScale}
        outlineWidth={fitted ? 0.006 : 0.0065}
        outlineColor={VAC_ASSET_DETAIL_INK}
        geometry={<primitive object={cavityGeometry} attach="geometry" />}
        material={<meshBasicMaterial color="#050309" />}
      />
      <group ref={tongueMotion}>
        <CodedAssetOutlineMesh
          position={[0, centerY, mouthZ]}
          outlineWidth={fitted ? 0.022 : 0.024}
          outlineColor="#421c2b"
          geometry={<primitive object={tongueGeometry} attach="geometry" />}
          material={
            <meshToonMaterial
              vertexColors
              gradientMap={getVacuumHeadToonRampTexture()}
            />
          }
        />
      </group>
      <CurvedTube
        points={[
          [-cavityScale[0] * 0.78, lowerLipY + cavityScale[1] * 0.05, lowerLipZ],
          [-cavityScale[0] * 0.42, lowerLipY - cavityScale[1] * 0.1, lowerLipZ - 0.004],
          [0, lowerLipY - cavityScale[1] * 0.17, lowerLipZ - 0.006],
          [cavityScale[0] * 0.42, lowerLipY - cavityScale[1] * 0.1, lowerLipZ - 0.004],
          [cavityScale[0] * 0.78, lowerLipY + cavityScale[1] * 0.05, lowerLipZ],
        ]}
        radius={fitted ? 0.0085 : 0.0075}
        color="#c94f63"
        outlineWidth={0.0017}
      />
    </group>
  )
}

function NormalGuyMouth({
  fitted = false,
  mouthZ,
  skinPalette = getGlowbudSkinPalette(),
}: {
  fitted?: boolean
  mouthZ: number
  skinPalette?: GlowbudSkinPalette
}) {
  const centerY = fitted ? -0.116 : -0.102
  const halfWidth = fitted ? 0.074 : 0.064
  const curveDepth = fitted ? 0.011 : 0.009
  const lineZ = mouthZ - 0.018

  return (
    <group rotation-z={fitted ? -0.005 : 0.004}>
      <mesh
        position={[0.003, centerY - curveDepth * 0.56, mouthZ - 0.008]}
        scale={[halfWidth * 1.18, curveDepth * 1.18, 0.005]}
      >
        <sphereGeometry args={[1, 12, 6]} />
        <meshBasicMaterial
          color={skinPalette.shade}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
      <CurvedTube
        points={[
          [-halfWidth, centerY, lineZ],
          [-halfWidth * 0.46, centerY - curveDepth * 0.82, lineZ - 0.001],
          [0, centerY - curveDepth, lineZ - 0.0015],
          [halfWidth * 0.46, centerY - curveDepth * 0.82, lineZ - 0.001],
          [halfWidth, centerY, lineZ],
        ]}
        radius={fitted ? 0.0062 : 0.0054}
        color={VAC_ASSET_DETAIL_INK}
        outlineWidth={0.001}
      />
    </group>
  )
}

function VampireMouth({
  fitted = false,
  mouthZ,
}: {
  fitted?: boolean
  mouthZ: number
}) {
  const centerY = fitted ? -0.118 : -0.104
  const halfWidth = fitted ? 0.108 : 0.094

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0.006, centerY, mouthZ - 0.013]}
        scale={[halfWidth, fitted ? 0.032 : 0.028, 0.014]}
        outlineWidth={fitted ? 0.0045 : 0.004}
        geometry={<sphereGeometry args={[1, 14, 7]} />}
        material={<meshBasicMaterial color="#1b1119" />}
      />
      <mesh position={[0.006, centerY - 0.012, mouthZ - 0.031]} scale={[halfWidth * 0.62, 0.009, 0.004]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color="#7e2837" />
      </mesh>
      {[-0.052, 0.064].map((x) => (
        <CodedAssetOutlineMesh
          key={`vampire-fang-${x}`}
          position={[x, centerY - 0.004, mouthZ - 0.036]}
          rotation-z={Math.PI}
          scale={[0.012, 0.026, 0.011]}
          outlineWidth={0.002}
          outlineColor="#3b2930"
          geometry={<coneGeometry args={[1, 1, 6]} />}
          material={<meshBasicMaterial color="#fff7d9" />}
        />
      ))}
    </group>
  )
}

function SadMouth({
  fitted = false,
  mouthZ,
  skinPalette = getGlowbudSkinPalette(),
}: {
  fitted?: boolean
  mouthZ: number
  skinPalette?: GlowbudSkinPalette
}) {
  const centerY = fitted ? -0.108 : -0.098
  const halfWidth = fitted ? 0.094 : 0.082
  const lineZ = mouthZ - 0.022

  return (
    <group>
      <mesh
        position={[0.004, centerY - 0.023, mouthZ - 0.009]}
        scale={[halfWidth * 1.1, 0.027, 0.005]}
      >
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={skinPalette.shade} transparent opacity={0.17} depthWrite={false} />
      </mesh>
      <CurvedTube
        points={[
          [-halfWidth, centerY - 0.028, lineZ],
          [-halfWidth * 0.48, centerY - 0.006, lineZ - 0.001],
          [0, centerY + 0.008, lineZ - 0.002],
          [halfWidth * 0.48, centerY - 0.006, lineZ - 0.001],
          [halfWidth, centerY - 0.028, lineZ],
        ]}
        radius={fitted ? 0.008 : 0.007}
        color={VAC_ASSET_DETAIL_INK}
        outlineWidth={0.0012}
      />
    </group>
  )
}

function BlushMouth({
  fitted = false,
  mouthZ,
}: {
  fitted?: boolean
  mouthZ: number
}) {
  const centerY = fitted ? -0.112 : -0.1
  const cheekX = fitted ? 0.184 : 0.158
  const lineZ = mouthZ - 0.023

  return (
    <group>
      <CurvedTube
        points={[
          [-0.046, centerY, lineZ],
          [0.002, centerY - 0.004, lineZ - 0.001],
          [0.052, centerY, lineZ],
        ]}
        radius={fitted ? 0.007 : 0.006}
        color={VAC_ASSET_DETAIL_INK}
        outlineWidth={0.001}
      />
      {[-1, 1].map((side) => (
        <group key={`blush-cheek-${side}`} position={[side * cheekX, centerY + 0.014, mouthZ - 0.016]}>
          <mesh rotation-z={side * -0.08} scale={[0.046, 0.022, 0.006]}>
            <sphereGeometry args={[1, 10, 5]} />
            <meshBasicMaterial color="#f58fb0" transparent opacity={0.78} depthWrite={false} />
          </mesh>
          <mesh position={[side * -0.012, 0.006, -0.006]} scale={[0.018, 0.006, 0.003]}>
            <sphereGeometry args={[1, 7, 4]} />
            <meshBasicMaterial color="#ffd0df" transparent opacity={0.62} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function GrrrrrrrrMouth({
  fitted = false,
  mouthZ,
}: {
  fitted?: boolean
  mouthZ: number
}) {
  const centerY = fitted ? -0.112 : -0.102
  const toothX = fitted ? 0.044 : 0.038
  const toothY = fitted ? 0.017 : 0.015

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0.004, centerY, mouthZ - 0.014]}
        scale={[fitted ? 0.132 : 0.114, fitted ? 0.052 : 0.046, 0.015]}
        outlineWidth={fitted ? 0.005 : 0.004}
        geometry={<sphereGeometry args={[1, 14, 7]} />}
        material={<meshBasicMaterial color="#1a1118" />}
      />
      {[-1, 0, 1].flatMap((column) =>
        [-1, 1].map((row) => (
          <mesh
            key={`grrr-tooth-${column}-${row}`}
            position={[0.004 + column * toothX, centerY + row * toothY, mouthZ - 0.035]}
            scale={[fitted ? 0.018 : 0.016, fitted ? 0.014 : 0.012, 0.006]}
          >
            <sphereGeometry args={[1, 7, 5]} />
            <meshBasicMaterial color="#fff5d6" />
          </mesh>
        )),
      )}
      <mesh position={[0.004, centerY, mouthZ - 0.042]} scale={[fitted ? 0.108 : 0.094, 0.0035, 0.003]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color="#5b3440" />
      </mesh>
    </group>
  )
}

type CigarettePoint = [number, number, number]

function CigaretteSegment({
  start,
  end,
  radius,
  color,
  outlineColor = '#3b2d27',
  outlineWidth = 0.002,
}: {
  start: CigarettePoint
  end: CigarettePoint
  radius: number
  color: string
  outlineColor?: string
  outlineWidth?: number
}) {
  const startPoint = new THREE.Vector3(...start)
  const endPoint = new THREE.Vector3(...end)
  const direction = endPoint.clone().sub(startPoint)
  const length = direction.length()
  const midpoint = startPoint.add(endPoint).multiplyScalar(0.5)
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  )

  return (
    <CodedAssetOutlineMesh
      position={midpoint.toArray()}
      quaternion={quaternion}
      outlineWidth={outlineWidth}
      outlineColor={outlineColor}
      geometry={<cylinderGeometry args={[radius, radius, length, 12, 1, false]} />}
      material={toon(color)}
    />
  )
}

function CiggySmoke({
  tip,
  activity,
  animation,
}: {
  tip: CigarettePoint
  activity: number
  animation: RedShellCritterAnimation
}) {
  const smokeTrail = useRef<THREE.Group>(null)
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    if (!smokeTrail.current) return
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const hop = getHopMotion(actionTime(t), animation === 'hop' ? motion : 0)
    const drift = Math.sin(t * 1.18) * 0.011 * motion
    const breathe = 1 + Math.sin(t * 1.72 + 0.5) * 0.035 * motion

    smokeTrail.current.position.set(drift, hop.airborne * 0.012, Math.cos(t * 0.94) * 0.004 * motion)
    smokeTrail.current.rotation.set(0, Math.sin(t * 0.76) * 0.035 * motion, drift * 2.8)
    smokeTrail.current.scale.set(breathe, 1 + (breathe - 1) * 1.4, breathe)
  })

  return (
    <group ref={smokeTrail}>
      <CurvedTube
        points={[
          [tip[0], tip[1] + 0.002, tip[2]],
          [tip[0] + 0.052, tip[1] + 0.045, tip[2] + 0.003],
          [tip[0] + 0.094, tip[1] + 0.092, tip[2] - 0.002],
        ]}
        radius={0.0044}
        color="#b9b2ad"
        outlineWidth={0.0008}
      />
      {Array.from({ length: 4 }, (_, index) => {
        const initialPhase = (index + 1) / 4
        const curl = Math.sin(initialPhase * Math.PI * 2.1) * 0.025
        const puffScale = 0.45 + initialPhase * 0.5
        const x = tip[0] + 0.075 + initialPhase * 0.18 + curl
        const y = tip[1] + 0.04 + initialPhase * 0.35
        const z = tip[2] + Math.cos(initialPhase * Math.PI * 2) * 0.016
        return (
          <group key={`ciggy-smoke-puff-${index}`}>
            <mesh
              position={[x, y, z]}
              rotation={[initialPhase * 0.18, curl * 1.8, curl * 3.2]}
              scale={[
                0.038 * puffScale * (0.92 + index * 0.028),
                0.047 * puffScale,
                0.031 * puffScale * 0.8,
              ]}
            >
              <sphereGeometry args={[1, 9, 6]} />
              <meshBasicMaterial
                color={index % 2 === 0 ? '#ded8d1' : '#c8c3be'}
                transparent
                opacity={0.82}
                depthWrite={false}
              />
            </mesh>
            <mesh
              position={[x + 0.024 * puffScale, y + 0.01 * puffScale, z - 0.003]}
              scale={[0.021 * puffScale, 0.026 * puffScale, 0.018 * puffScale]}
            >
              <sphereGeometry args={[1, 8, 5]} />
              <meshBasicMaterial color="#f2ede6" transparent opacity={0.76} depthWrite={false} />
            </mesh>
            <mesh
              position={[x - 0.017 * puffScale, y - 0.009 * puffScale, z + 0.005]}
              scale={[0.017 * puffScale, 0.021 * puffScale, 0.015 * puffScale]}
            >
              <sphereGeometry args={[1, 8, 5]} />
              <meshBasicMaterial color="#aaa5a1" transparent opacity={0.68} depthWrite={false} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function CiggyMouth({
  fitted = false,
  mouthZ,
  activity = 1,
  animation = 'idle',
  skinPalette = getGlowbudSkinPalette(),
}: {
  fitted?: boolean
  mouthZ: number
  activity?: number
  animation?: RedShellCritterAnimation
  skinPalette?: GlowbudSkinPalette
}) {
  const ember = useRef<THREE.Group>(null)
  const centerY = fitted ? -0.112 : -0.102
  const mouthRoot: CigarettePoint = [0.028, centerY - 0.003, mouthZ - 0.014]
  const filterEnd: CigarettePoint = [0.069, centerY - 0.022, mouthZ - 0.089]
  const paperMiddle: CigarettePoint = [0.112, centerY - 0.043, mouthZ - 0.17]
  const paperEnd: CigarettePoint = [0.142, centerY - 0.057, mouthZ - 0.224]
  const coalEnd: CigarettePoint = [0.151, centerY - 0.062, mouthZ - 0.241]
  const tip: CigarettePoint = [0.163, centerY - 0.067, mouthZ - 0.263]

  useFrame(({ clock }) => {
    if (!ember.current) return
    const motion = clampIdleActivity(activity)
    const pulse = 1 + (Math.sin(clock.elapsedTime * 8.4) * 0.5 + 0.5) * 0.17 * motion
    ember.current.scale.setScalar(pulse)
    ember.current.rotation.z = Math.sin(clock.elapsedTime * 4.2) * 0.1 * motion
  })

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0.012, centerY, mouthZ - 0.016]}
        scale={[fitted ? 0.064 : 0.058, fitted ? 0.037 : 0.033, 0.016]}
        outlineWidth={0.004}
        geometry={<sphereGeometry args={[1, 12, 7]} />}
        material={<meshBasicMaterial color="#21151a" />}
      />
      <CodedAssetOutlineMesh
        position={[0.006, centerY + 0.017, mouthZ - 0.032]}
        rotation-z={-0.08}
        scale={[fitted ? 0.051 : 0.046, 0.014, 0.012]}
        outlineWidth={0.0014}
        outlineColor={skinPalette.shade}
        geometry={<sphereGeometry args={[1, 10, 6]} />}
        material={<meshBasicMaterial color={skinPalette.light} />}
      />
      <CodedAssetOutlineMesh
        position={[0.01, centerY - 0.016, mouthZ - 0.033]}
        rotation-z={0.06}
        scale={[fitted ? 0.048 : 0.043, 0.013, 0.012]}
        outlineWidth={0.0014}
        outlineColor={skinPalette.shade}
        geometry={<sphereGeometry args={[1, 10, 6]} />}
        material={<meshBasicMaterial color={skinPalette.shade} />}
      />

      <CigaretteSegment
        start={mouthRoot}
        end={filterEnd}
        radius={0.015}
        color="#c9824c"
        outlineColor="#4b2b22"
        outlineWidth={0.0024}
      />
      <CigaretteSegment
        start={filterEnd}
        end={paperMiddle}
        radius={0.0145}
        color="#fff3d9"
        outlineWidth={0.0022}
      />
      <CigaretteSegment
        start={paperMiddle}
        end={paperEnd}
        radius={0.0142}
        color="#f4ead7"
        outlineWidth={0.0022}
      />
      <CigaretteSegment
        start={paperEnd}
        end={coalEnd}
        radius={0.0146}
        color="#ce4c2a"
        outlineColor="#6c241c"
        outlineWidth={0.002}
      />
      <CigaretteSegment
        start={coalEnd}
        end={tip}
        radius={0.015}
        color="#9c9287"
        outlineColor="#4d4541"
        outlineWidth={0.0022}
      />

      <group ref={ember} position={coalEnd}>
        <pointLight color="#ff7a35" intensity={0.18} distance={0.28} decay={2} />
        <mesh scale={[0.017, 0.016, 0.017]}>
          <sphereGeometry args={[1, 9, 6]} />
          <meshBasicMaterial color="#f04b27" toneMapped={false} />
        </mesh>
        <mesh position={[0.004, 0.005, -0.007]} scale={[0.008, 0.007, 0.008]}>
          <sphereGeometry args={[1, 7, 5]} />
          <meshBasicMaterial color="#ffd25f" toneMapped={false} />
        </mesh>
      </group>
      <mesh position={tip} scale={[0.012, 0.011, 0.012]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color="#514a46" />
      </mesh>
      {[
        [0.153, centerY - 0.052, mouthZ - 0.249],
        [0.159, centerY - 0.072, mouthZ - 0.251],
        [0.171, centerY - 0.063, mouthZ - 0.258],
      ].map((position, index) => (
        <mesh key={`ciggy-ash-fleck-${index}`} position={position as CigarettePoint} scale={[0.0045, 0.004, 0.0035]}>
          <sphereGeometry args={[1, 6, 4]} />
          <meshBasicMaterial color={index === 1 ? '#d9d0c5' : '#716965'} />
        </mesh>
      ))}
      <CiggySmoke tip={tip} activity={activity} animation={animation} />
    </group>
  )
}

function WoozyMouth({
  fitted = false,
  mouthZ,
  skinPalette = getGlowbudSkinPalette(),
}: {
  fitted?: boolean
  mouthZ: number
  skinPalette?: GlowbudSkinPalette
}) {
  const centerY = fitted ? -0.112 : -0.102
  const halfWidth = fitted ? 0.12 : 0.104
  const wave = fitted ? 0.021 : 0.018
  const lineZ = mouthZ - 0.023

  return (
    <group>
      <mesh position={[0.004, centerY - 0.004, mouthZ - 0.008]} scale={[halfWidth * 1.04, wave * 1.3, 0.005]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={skinPalette.shade} transparent opacity={0.13} depthWrite={false} />
      </mesh>
      <CurvedTube
        points={[
          [-halfWidth, centerY + wave * 0.45, lineZ],
          [-halfWidth * 0.66, centerY - wave, lineZ - 0.001],
          [-halfWidth * 0.32, centerY + wave, lineZ - 0.002],
          [0, centerY - wave * 0.72, lineZ - 0.002],
          [halfWidth * 0.32, centerY + wave, lineZ - 0.002],
          [halfWidth * 0.66, centerY - wave, lineZ - 0.001],
          [halfWidth, centerY + wave * 0.45, lineZ],
        ]}
        radius={fitted ? 0.0075 : 0.0065}
        color={VAC_ASSET_DETAIL_INK}
        outlineWidth={0.001}
      />
    </group>
  )
}

function OmgMouth({
  fitted = false,
  mouthZ,
}: {
  fitted?: boolean
  mouthZ: number
}) {
  const centerY = fitted ? -0.116 : -0.104

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0.008, centerY, mouthZ - 0.016]}
        scale={[fitted ? 0.058 : 0.05, fitted ? 0.072 : 0.064, 0.018]}
        outlineWidth={fitted ? 0.006 : 0.005}
        geometry={<sphereGeometry args={[1, 14, 9]} />}
        material={<meshBasicMaterial color="#171018" />}
      />
      <mesh position={[0.008, centerY - 0.025, mouthZ - 0.039]} scale={[0.031, 0.02, 0.006]}>
        <sphereGeometry args={[1, 9, 5]} />
        <meshBasicMaterial color="#6f2635" />
      </mesh>
      <mesh position={[-0.012, centerY + 0.028, mouthZ - 0.041]} rotation-z={-0.38} scale={[0.012, 0.005, 0.003]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color="#82727f" transparent opacity={0.42} depthWrite={false} />
      </mesh>
    </group>
  )
}

function GlowbudNose({
  trait = 'none',
  fitted = false,
}: {
  trait?: GlowbudNoseTrait
  fitted?: boolean
}) {
  if (trait === 'none') return null

  const noseZ = fitted ? -0.786 : -0.756

  return (
    <group position={[0.01, -0.006, noseZ]}>
      <mesh position={[0, -0.008, 0.031]} scale={[0.058, 0.046, 0.012]}>
        <sphereGeometry args={[1, 10, 6]} />
        <meshBasicMaterial color="#4b1520" transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <CodedAssetOutlineMesh
        scale={[fitted ? 0.066 : 0.058, fitted ? 0.057 : 0.05, fitted ? 0.052 : 0.046]}
        outlineWidth={fitted ? 0.0065 : 0.0055}
        geometry={<sphereGeometry args={[1, 14, 10]} />}
        material={toon('#e73a35')}
      />
      <mesh position={[-0.021, 0.019, -0.045]} scale={[0.019, 0.014, 0.006]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color="#ffb08b" toneMapped={false} />
      </mesh>
      <mesh position={[0.025, -0.022, -0.047]} rotation-z={0.2} scale={[0.024, 0.008, 0.004]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color="#9d1d2b" transparent opacity={0.54} depthWrite={false} />
      </mesh>
    </group>
  )
}

function RedFace({
  fitted = false,
  activity = 1,
  animation = 'idle',
  bodyOnly = false,
  featuresOnly = false,
  hideBodySurface = false,
  mouthTrait = 'open',
  skinPalette = getGlowbudSkinPalette(),
}: {
  fitted?: boolean
  activity?: number
  animation?: RedShellCritterAnimation
  bodyOnly?: boolean
  featuresOnly?: boolean
  hideBodySurface?: boolean
  mouthTrait?: GlowbudMouthTrait
  skinPalette?: GlowbudSkinPalette
}) {
  const mouthGroup = useRef<THREE.Group>(null)
  const coreAnimation = getCoreGlowbudAnimation(animation)
  const bodyPosition: [number, number, number] = fitted ? [0.006, -0.026, -0.35] : [0, -0.02, -0.28]
  const bodyScale: [number, number, number] = fitted ? [0.56, 0.432, 0.38] : [0.43, 0.43, 0.43]
  const outlineWidth = fitted ? 0 : 0.012
  const mouthZ = fitted ? -0.748 : -0.704
  const isClassicSmile = mouthTrait === 'classic-smile'
  const isSurprisedO = mouthTrait === 'surprised-o'
  const isHuh = mouthTrait === 'huh'
  const isLongFace = mouthTrait === 'long-face'
  const isWazzzzzzzzup = mouthTrait === 'wazzzzzzzzup'
  const isNormalGuy = mouthTrait === 'normal-guy'
  const isVampire = mouthTrait === 'vampire'
  const isSad = mouthTrait === 'sad'
  const isBlush = mouthTrait === 'blush'
  const isGrrrrrrrr = mouthTrait === 'grrrrrrrr'
  const isCiggy = mouthTrait === 'ciggy'
  const isWoozy = mouthTrait === 'woozy'
  const isOmg = mouthTrait === 'omg'
  const mouthMotion = isCiggy
    ? { idleX: 0.004, hopX: 0.012, idleY: 0.004, hopY: 0.02, sway: 0.002 }
    : isVampire || isSad || isBlush || isGrrrrrrrr
      ? { idleX: 0.012, hopX: 0.035, idleY: 0.009, hopY: 0.07, sway: 0.003 }
      : isWoozy
        ? { idleX: 0.012, hopX: 0.04, idleY: 0.015, hopY: 0.08, sway: 0.005 }
        : isOmg
          ? { idleX: 0.024, hopX: 0.052, idleY: 0.05, hopY: 0.24, sway: 0.006 }
          : isHuh
    ? { idleX: 0.01, hopX: 0.02, idleY: 0.012, hopY: 0.05, sway: 0.003 }
    : isLongFace
      ? { idleX: 0.012, hopX: 0.032, idleY: 0.008, hopY: 0.07, sway: 0.003 }
      : isWazzzzzzzzup
        ? { idleX: 0.025, hopX: 0.09, idleY: 0.045, hopY: 0.34, sway: 0.008 }
        : isNormalGuy
          ? { idleX: 0.014, hopX: 0.035, idleY: 0.012, hopY: 0.08, sway: 0.004 }
          : isClassicSmile
            ? { idleX: 0.028, hopX: 0.08, idleY: 0.026, hopY: 0.12, sway: 0.006 }
            : isSurprisedO
              ? { idleX: 0.032, hopX: 0.055, idleY: 0.055, hopY: 0.22, sway: 0.008 }
              : { idleX: 0.045, hopX: 0.16, idleY: 0.1, hopY: 0.72, sway: 0.012 }
  const faceSpeckles: {
    position: [number, number, number]
    scale: [number, number, number]
    opacity: number
  }[] = [
    { position: [-0.205, 0.038, fitted ? -0.711 : -0.704], scale: [0.009, 0.006, 0.004], opacity: 0.18 },
    { position: [0.225, 0.018, fitted ? -0.711 : -0.704], scale: [0.008, 0.005, 0.004], opacity: 0.16 },
    { position: [-0.118, -0.186, fitted ? -0.711 : -0.704], scale: [0.008, 0.005, 0.004], opacity: 0.14 },
  ]
  const facePolishMarks: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = fitted
    ? [
        { position: [-0.142, 0.092, -0.72], rotation: -0.24, scale: [0.126, 0.026, 0.006], color: skinPalette.light, opacity: 0.18 },
        { position: [0.124, -0.174, -0.722], rotation: 0.18, scale: [0.152, 0.034, 0.006], color: skinPalette.shade, opacity: 0.13 },
        { position: [-0.218, -0.062, -0.721], rotation: -0.5, scale: [0.052, 0.016, 0.005], color: skinPalette.light, opacity: 0.12 },
        { position: [0.224, 0.052, -0.721], rotation: 0.38, scale: [0.046, 0.014, 0.005], color: skinPalette.shade, opacity: 0.12 },
      ]
    : [
        { position: [-0.118, 0.044, -0.705], rotation: -0.24, scale: [0.142, 0.034, 0.008], color: skinPalette.light, opacity: 0.18 },
        { position: [0.128, -0.158, -0.706], rotation: 0.18, scale: [0.156, 0.038, 0.008], color: skinPalette.shade, opacity: 0.14 },
      ]

  const treatmentZ = fitted ? -0.723 : -0.707
  const skinTreatmentMarks: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] =
    skinPalette.finish === 'gold'
      ? [
          { position: [-0.132, 0.142, treatmentZ], rotation: -0.2, scale: [0.158, 0.025, 0.007], color: skinPalette.light, opacity: 0.42 },
          { position: [0.154, -0.178, treatmentZ], rotation: 0.2, scale: [0.132, 0.028, 0.006], color: skinPalette.shade, opacity: 0.18 },
          { position: [0.216, 0.106, treatmentZ - 0.002], rotation: 0, scale: [0.041, 0.008, 0.005], color: '#fffbe0', opacity: 0.72 },
          { position: [0.216, 0.106, treatmentZ - 0.003], rotation: Math.PI / 2, scale: [0.027, 0.007, 0.005], color: '#fffbe0', opacity: 0.72 },
        ]
      : skinPalette.finish === 'zombie' || skinPalette.finish === 'ape' || skinPalette.finish === 'alien'
          ? []
          : []
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const actionT = actionTime(t)
    const ambient = getAmbientLifeMotion(t, motion)
    const performance = getDirectedPerformanceMotion(actionT, animation, motion)
    const happySnug = idlePulse(t, 6.2, 0.71, 0.055) * motion
    const hopFace = getHopExpressionMotion(actionT, animation === 'hop' ? motion : 0)
    const grumble = getWizardGrumbleMotion(actionT, animation === 'grumble' ? motion : 0)
    const softSmile = ((Math.sin(t * 1.75 + 0.7) * 0.5 + 0.5) * 0.65 + happySnug * 0.55) * motion

    if (mouthGroup.current) {
      mouthGroup.current.position.x = ambient.gazeX * 0.12 + performance.faceGazeX * 0.1 + grumble.chatter * 0.45
      mouthGroup.current.position.y =
        hopFace.mouthY
        + ambient.perk * 0.004
        - ambient.nod * 0.003
        + performance.facePerk * 0.08
        + grumble.bodyJolt * 0.18
        + (skinPalette.finish === 'ape' ? -0.016 : 0)
      mouthGroup.current.scale.set(
        1
          + softSmile * mouthMotion.idleX
          + ambient.perk * 0.018
          + hopFace.smile * mouthMotion.hopX
          + hopFace.cheekSquash * 0.08
          + performance.mouthSmile
          + grumble.mouthOpen * 0.015,
        1
          + softSmile * mouthMotion.idleY
          + ambient.nod * 0.012
          + hopFace.mouthOpen * mouthMotion.hopY
          - hopFace.faceFocus * 0.08
          - performance.mouthSmile * 0.18
          + grumble.mouthOpen * 0.05
          - grumble.hit * 0.025,
        1,
      )
      mouthGroup.current.rotation.z =
        Math.sin(t * 1.1) * mouthMotion.sway * motion
        - happySnug * 0.014
        + ambient.faceTilt * 0.22
        + hopFace.rotateZ * 0.38
        + performance.boogieBeat * 0.014
        + grumble.chatter * 0.5
    }
  })

  return (
    <group>
      {featuresOnly || hideBodySurface ? null : (
        <CodedAssetOutlineMesh
          position={bodyPosition}
          scale={bodyScale}
          outlineWidth={outlineWidth}
          outlineColor={fitted ? skinPalette.shade : VAC_ASSET_INK}
          geometry={<sphereGeometry args={[1, 18, 12]} />}
          material={fitted ? <meshBasicMaterial color={skinPalette.base} /> : toon(skinPalette.base)}
        />
      )}
      {featuresOnly ? null : (
        <>
          {skinPalette.finish === 'ape' ? (
            <ApeFaceTreatment fitted={fitted} activity={activity} animation={coreAnimation} />
          ) : null}
          {skinPalette.finish === 'alien' ? (
            <AlienFaceTreatment fitted={fitted} activity={activity} animation={coreAnimation} />
          ) : null}
          {skinPalette.finish === 'zombie' ? (
            <ZombieFaceTreatment fitted={fitted} activity={activity} animation={coreAnimation} />
          ) : null}
          {skinTreatmentMarks.map((mark, index) => (
            <mesh
              key={`face-skin-treatment-${skinPalette.finish}-${index}`}
              position={mark.position}
              rotation-z={mark.rotation}
              scale={mark.scale}
            >
              <sphereGeometry args={[1, 12, 6]} />
              <meshBasicMaterial color={mark.color} transparent opacity={mark.opacity} depthWrite={false} />
            </mesh>
          ))}
          {skinPalette.finish === 'ape' || skinPalette.finish === 'alien' || skinPalette.finish === 'zombie' ? null : (
            <>
              {facePolishMarks.map((mark, index) => (
                <mesh
                  key={`face-premium-polish-${index}`}
                  position={mark.position}
                  rotation-z={mark.rotation}
                  scale={mark.scale}
                >
                  <sphereGeometry args={[1, 10, 4]} />
                  <meshBasicMaterial color={mark.color} transparent opacity={mark.opacity} depthWrite={false} />
                </mesh>
              ))}
              {faceSpeckles.map((speckle, index) => (
                <OrganicDetailDot
                  key={`face-soft-speckle-${index}`}
                  position={speckle.position}
                  scale={speckle.scale}
                  color={skinPalette.shade}
                  opacity={speckle.opacity}
                />
              ))}
            </>
          )}
        </>
      )}
      {bodyOnly ? null : (
        <group ref={mouthGroup}>
          {isVampire ? (
            <VampireMouth fitted={fitted} mouthZ={mouthZ} />
          ) : isSad ? (
            <SadMouth fitted={fitted} mouthZ={mouthZ} skinPalette={skinPalette} />
          ) : isBlush ? (
            <BlushMouth fitted={fitted} mouthZ={mouthZ} />
          ) : isGrrrrrrrr ? (
            <GrrrrrrrrMouth fitted={fitted} mouthZ={mouthZ} />
          ) : isCiggy ? (
            <CiggyMouth
              fitted={fitted}
              mouthZ={mouthZ}
              activity={activity}
              animation={animation}
              skinPalette={skinPalette}
            />
          ) : isWoozy ? (
            <WoozyMouth fitted={fitted} mouthZ={mouthZ} skinPalette={skinPalette} />
          ) : isOmg ? (
            <OmgMouth fitted={fitted} mouthZ={mouthZ} />
          ) : isWazzzzzzzzup ? (
            <WazzzzzzzzupMouth
              fitted={fitted}
              mouthZ={mouthZ}
              activity={activity}
              animation={animation}
            />
          ) : isLongFace ? (
            <LongFaceMouth fitted={fitted} mouthZ={mouthZ} skinPalette={skinPalette} />
          ) : isNormalGuy ? (
            <NormalGuyMouth fitted={fitted} mouthZ={mouthZ} skinPalette={skinPalette} />
          ) : isHuh ? (
            <HuhMouth fitted={fitted} mouthZ={mouthZ} skinPalette={skinPalette} />
          ) : isSurprisedO ? (
            <SurprisedOMouth fitted={fitted} mouthZ={mouthZ} skinPalette={skinPalette} />
          ) : isClassicSmile ? (
            <ClassicSmileMouth fitted={fitted} mouthZ={mouthZ} skinPalette={skinPalette} />
          ) : (
            <GlowbudMouthCavity fitted={fitted} mouthZ={mouthZ} skinPalette={skinPalette} />
          )}
        </group>
      )}
    </group>
  )
}

function ShellCavity() {
  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0, -0.015, -0.56]}
        scale={[0.5, 0.44, 0.04]}
        outlineWidth={0.012}
        geometry={<sphereGeometry args={[1, 12, 7]} />}
        material={toon(SHELL_DARK)}
      />
      <mesh position={[-0.08, 0.1, -0.648]} rotation-z={-0.25} scale={[0.18, 0.05, 0.012]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.34} depthWrite={false} />
      </mesh>
    </group>
  )
}

function createUnibrowGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.3, 0.035)
  shape.bezierCurveTo(-0.252, 0.086, -0.142, 0.078, -0.026, -0.012)
  shape.quadraticCurveTo(0, -0.031, 0.026, -0.012)
  shape.bezierCurveTo(0.142, 0.078, 0.252, 0.086, 0.3, 0.035)
  shape.quadraticCurveTo(0.306, -0.006, 0.272, -0.02)
  shape.bezierCurveTo(0.196, -0.012, 0.108, -0.004, 0.034, -0.051)
  shape.quadraticCurveTo(0, -0.069, -0.034, -0.051)
  shape.bezierCurveTo(-0.108, -0.004, -0.196, -0.012, -0.272, -0.02)
  shape.quadraticCurveTo(-0.306, -0.006, -0.3, 0.035)

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.007,
    bevelThickness: 0.006,
    curveSegments: 12,
    steps: 1,
  })
  geometry.center()
  geometry.computeVertexNormals()
  return geometry
}

function UnibrowOverlay({
  fitted = true,
  activity = 1,
  animation = 'idle',
}: {
  fitted?: boolean
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const brow = useRef<THREE.Group>(null)
  const browGeometry = useMemo(() => createUnibrowGeometry(), [])
  const baseY = fitted ? 0.194 : 0.205
  const baseZ = fitted ? -0.785 : -0.757
  const baseScale = fitted ? 1 : 0.92
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    if (!brow.current) return
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const actionT = actionTime(t)
    const grouchPulse = idlePulse(t, 4.9, 0.64, 0.09) * motion
    const grumble = getWizardGrumbleMotion(actionT + 0.08, animation === 'grumble' ? motion : 0)
    const hopFace = getHopExpressionMotion(actionT, animation === 'hop' ? motion : 0)

    brow.current.position.y = baseY - grouchPulse * 0.008 - grumble.brow * 0.026 + hopFace.eyeWide * 0.012
    brow.current.rotation.z =
      Math.sin(t * 1.08 + 0.2) * 0.004 * motion + grumble.hit * 0.018 - hopFace.rotateZ * 0.18
    brow.current.scale.set(
      baseScale * (1 + grouchPulse * 0.025 + grumble.brow * 0.055 + hopFace.faceFocus * 0.025),
      baseScale * (1 + grouchPulse * 0.018 + grumble.hit * 0.04),
      baseScale,
    )
  })

  return (
    <group ref={brow} position={[0, baseY, baseZ]}>
      <CodedAssetOutlineMesh
        outlineWidth={0.0055}
        outlineColor={VAC_ASSET_INK}
        geometry={<primitive object={browGeometry} attach="geometry" />}
        material={toon(WIZARD_BROW_DARK)}
      />
      <CurvedTube
        points={[
          [-0.236, 0.043, -0.021],
          [-0.188, 0.055, -0.022],
          [-0.132, 0.043, -0.022],
          [-0.083, 0.016, -0.021],
        ]}
        radius={0.006}
        color={WIZARD_BROW_LIGHT}
        outlineWidth={0}
      />
    </group>
  )
}

function FittedFaceAssembly({
  activity = 1,
  animation = 'idle',
  eyeTrait = 'mellow',
  mouthTrait = 'classic-smile',
  noseTrait = 'none',
  shellFree = false,
  skinPalette = getGlowbudSkinPalette(),
}: {
  activity?: number
  animation?: RedShellCritterAnimation
  eyeTrait?: GlowbudEyeTrait
  mouthTrait?: GlowbudMouthTrait
  noseTrait?: GlowbudNoseTrait
  shellFree?: boolean
  skinPalette?: GlowbudSkinPalette
}) {
  const featureGroup = useRef<THREE.Group>(null)
  const viewScratch = useMemo(
    () => ({
      forward: new THREE.Vector3(),
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      toCamera: new THREE.Vector3(),
    }),
    [],
  )

  useFrame(({ camera, clock }) => {
    if (!featureGroup.current) return

    const ambient = getAmbientLifeMotion(clock.elapsedTime, clampIdleActivity(activity))
    featureGroup.current.getWorldPosition(viewScratch.position)
    featureGroup.current.getWorldQuaternion(viewScratch.quaternion)
    viewScratch.forward.set(0, 0, -1).applyQuaternion(viewScratch.quaternion)
    viewScratch.toCamera.copy(camera.position).sub(viewScratch.position).normalize()
    const frontFacing = Math.max(0, viewScratch.forward.dot(viewScratch.toCamera))
    const featureRead = THREE.MathUtils.smoothstep(frontFacing, 0.08, 0.64)
    const anatomicalFeatureLift = skinPalette.finish === 'ape' ? -0.035 : 0

    featureGroup.current.visible = frontFacing > 0.045
    featureGroup.current.position.x = ambient.gazeX * 0.08
    featureGroup.current.position.y = ambient.bodyLift * 0.12
    featureGroup.current.position.z = anatomicalFeatureLift - 0.006 - 0.022 * (1 - featureRead)
    featureGroup.current.rotation.z = ambient.faceTilt * 0.22
    featureGroup.current.scale.set(0.96 + featureRead * 0.04, 0.96 + featureRead * 0.04, 1)
  })

  return (
    <>
      <RedFace
        fitted
        bodyOnly
        hideBodySurface={shellFree}
        activity={activity}
        animation={animation}
        skinPalette={skinPalette}
      />
      <group ref={featureGroup}>
        <RedFace fitted featuresOnly activity={activity} animation={animation} mouthTrait={mouthTrait} skinPalette={skinPalette} />
        <Eye
          side={-1}
          pupilOffset={0.018}
          fitted
          activity={activity}
          animation={animation}
          eyeTrait={eyeTrait}
          skinPalette={skinPalette}
        />
        <Eye
          side={1}
          pupilOffset={-0.018}
          fitted
          activity={activity}
          animation={animation}
          eyeTrait={eyeTrait}
          skinPalette={skinPalette}
        />
        <GlowbudNose trait={noseTrait} fitted />
        {eyeTrait === 'unibrow' ? <UnibrowOverlay activity={activity} animation={animation} /> : null}
      </group>
    </>
  )
}

function ShellInteriorPocket() {
  return null
}

function createOrganicSeedShellGeometry() {
  const geometry = new THREE.SphereGeometry(1, 30, 18, 0, Math.PI * 2, 0.55, Math.PI - 0.55)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const softDimple = 1 + 0.018 * Math.sin(x * 5.4 + y * 2.8) + 0.011 * Math.cos(z * 4.6 - x * 1.8)
    const broadPlump = 1 + 0.032 * Math.max(0, 1 - y * y * 1.15)
    const sideBias = x > 0 ? 1.016 : 0.993
    const topSquash = y > 0.58 ? 0.955 : 1
    const bottomSpread = y < -0.24 ? 1.052 : 1
    const baseWeight = y < -0.42 ? 0.92 : 1
    const backFullness = z > 0 ? 1.065 : 0.995
    const frontSnugFullness = z < -0.46 ? 1.018 : 1
    const seedLean = y > 0.2 ? -0.014 : 0.004

    position.setXYZ(
      index,
      x * softDimple * broadPlump * sideBias * bottomSpread + seedLean,
      y * softDimple * topSquash * baseWeight - (x > 0.54 ? 0.008 : 0),
      z * softDimple * broadPlump * backFullness * frontSnugFullness * (y < -0.2 ? 1.025 : 1),
    )
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function mossRockFacetNoise(index: number, x: number, y: number, z: number) {
  const value = Math.sin(index * 12.9898 + x * 68.233 + y * 41.719 + z * 53.157) * 43758.5453
  return value - Math.floor(value)
}

function mossRockSurfaceNoise(x: number, y: number, z: number) {
  return THREE.MathUtils.clamp(
    0.5
      + Math.sin(x * 8.7 + y * 4.1 - z * 6.3) * 0.22
      + Math.cos(x * 3.8 - y * 9.2 + z * 5.6) * 0.16
      + Math.sin((x + z) * 13.4 + y * 2.7) * 0.1,
    0,
    1,
  )
}

function applyMossRockFacetColors(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position as THREE.BufferAttribute
  const normal = geometry.attributes.normal as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const rockDeep = new THREE.Color(MOSS_ROCK_DEEP)
  const rockShadow = new THREE.Color(MOSS_ROCK_SHADOW)
  const rockBase = new THREE.Color(MOSS_ROCK_BASE)
  const rockMid = new THREE.Color(MOSS_ROCK_MID)
  const rockLight = new THREE.Color(MOSS_ROCK_LIGHT)
  const rockWarm = new THREE.Color(MOSS_ROCK_WARM)
  const rockDamp = new THREE.Color(MOSS_ROCK_DAMP)
  const mossFelt = new THREE.Color(MOSS_SHELL_FELT)
  const mossMid = new THREE.Color(MOSS_SHELL_MID)
  const mossSoft = new THREE.Color(MOSS_SHELL_SOFT)
  const color = new THREE.Color()

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const normalY = normal.getY(index)
    // Position-derived variation stays continuous across duplicated triangle vertices.
    // Index noise produced an artificial pinwheel where the sphere topology converges.
    const noise = mossRockSurfaceNoise(x, y, z)
    const strata = Math.sin(y * 20.5 + z * 4.8 + Math.sin(x * 7.2) * 0.82)
    const mineralField = Math.sin(x * 9.4 - z * 7.1 + Math.cos(y * 11.6) * 0.58)
    const topFacing = smoothstep01((normalY - 0.04) / 0.82)
    const upperShell = smoothstep01((y + 0.04) / 0.62)
    const moistureField =
      Math.sin(x * 6.2 + z * 4.1 + 0.7) * 0.48
      + Math.cos(z * 7.4 - y * 3.2) * 0.3
      + Math.sin((x - z) * 10.2) * 0.22
    const colonyBreakup = smoothstep01((moistureField + 0.82) / 1.34)
    const mossBlend = topFacing * upperShell * (0.14 + colonyBreakup * 0.34)

    color.copy(rockBase)
    if (normalY > 0.42) color.lerp(rockLight, 0.28)
    if (normalY < -0.28 || y < -0.42) color.lerp(rockDeep, 0.28)
    if (noise < 0.2) color.lerp(rockShadow, 0.34)
    if (noise > 0.8) color.lerp(rockMid, 0.28)
    if (strata > 0.62 && noise > 0.26) color.lerp(rockWarm, 0.26)
    if (mineralField < -0.78 && noise < 0.7) color.lerp(rockDamp, 0.3)

    if (mossBlend > 0.04) {
      const mossColor = noise > 0.72 ? mossSoft : noise < 0.25 ? mossFelt : mossMid
      color.lerp(mossColor, mossBlend)
    }

    const offset = index * 3
    colors[offset] = color.r
    colors[offset + 1] = color.g
    colors[offset + 2] = color.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function createMossRockShellGeometry() {
  const source = createOrganicSeedShellGeometry()
  source.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(0, -0.035, -0.08),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -0.035)),
      new THREE.Vector3(0.815, 0.735, 0.64),
    ),
  )

  const position = source.attributes.position as THREE.BufferAttribute
  const center = new THREE.Vector3(0, -0.035, -0.08)

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const localX = (x - center.x) / 0.815
    const localY = (y - center.y) / 0.735
    const localZ = (z - center.z) / 0.64
    const angle = Math.atan2(localZ, localX)
    const lowerWeight = smoothstep01((-localY - 0.24) / 0.58)
    const shoulder = smoothstep01((Math.abs(localX) - 0.32) / 0.5)
    const mineralRoughness =
      Math.sin(angle * 4.2 + localY * 4.6) * 0.018
      + Math.cos(angle * 7.1 - localY * 3.2) * 0.012
      + Math.sin((localX - localZ) * 11.3 + localY * 2.4) * 0.007
    const settledBase = lowerWeight * 0.016
    const surfaceScale = 1 + mineralRoughness + shoulder * 0.009 + settledBase

    let nextX = center.x + (x - center.x) * surfaceScale
    let nextY = center.y + (y - center.y) * surfaceScale
    const nextZ = center.z + (z - center.z) * surfaceScale * (1 + (localZ > 0 ? 0.008 : 0))

    if (nextY < -0.52) {
      const settle = smoothstep01((-nextY - 0.52) / 0.15)
      nextY = THREE.MathUtils.lerp(nextY, -0.584 + Math.sin(nextX * 10.4) * 0.006, settle * 0.46)
      nextX *= 1 + settle * 0.012
    }

    position.setXYZ(index, nextX, nextY, nextZ)
  }

  position.needsUpdate = true
  source.computeVertexNormals()
  const geometry = source.toNonIndexed()
  source.dispose()
  applyMossRockFacetColors(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createCrystalShellGeometry() {
  const geometry = new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0.55, Math.PI - 0.55)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const angle = Math.atan2(z, x)
    const radial = Math.hypot(x, z)
    const hardFacet =
      1
      + Math.sin(angle * 6.0 + y * 4.2) * 0.034
      + Math.cos(angle * 9.0 - y * 2.6) * 0.022
      + Math.sin((x + z) * 8.4) * 0.014
    const crownLift = y > 0.42 ? 1 + (y - 0.42) * 0.05 : 1
    const lowerWeight = y < -0.36 ? 0.93 : 1
    const sideCut = 1 + Math.max(0, Math.abs(x) - 0.42) * 0.035
    const frontGlassFullness = z < -0.42 ? 1.035 : 1.02
    const rearCrystalBulge = z > 0 ? 1.06 : 1

    position.setXYZ(
      index,
      x * hardFacet * sideCut * (y < -0.18 ? 1.04 : 1) - (y > 0.32 ? 0.008 : 0),
      y * hardFacet * crownLift * lowerWeight,
      z * hardFacet * frontGlassFullness * rearCrystalBulge * (radial > 0.72 ? 1.025 : 1),
    )
  }

  position.needsUpdate = true
  const faceted = geometry.toNonIndexed()
  faceted.computeVertexNormals()
  return faceted
}

function createGoldJewelShellGeometry() {
  const geometry = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0.5, Math.PI - 0.48)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const angle = Math.atan2(y, x || 0.0001)
    const radial = Math.hypot(x, y)
    const upperEgg = smoothstep01((z + 0.04) / 0.86)
    const lowerWeight = smoothstep01((-z - 0.18) / 0.58)
    const rockyFacet =
      1
      + Math.sin(angle * 4.6 + z * 5.8) * 0.06
      + Math.cos(angle * 8.0 - x * 2.4) * 0.044
      + Math.sin((x - y + z) * 8.6) * 0.028
      + Math.cos((x + y * 0.7 - z) * 13.0) * 0.015
    const crownLode = Math.exp(-((x + 0.06) * (x + 0.06)) / 0.12 - ((y + 0.02) * (y + 0.02)) / 0.2 - ((z - 0.55) * (z - 0.55)) / 0.1)
    const leftOre = Math.exp(-((x + 0.58) * (x + 0.58)) / 0.12 - ((y + 0.06) * (y + 0.06)) / 0.18 - ((z - 0.08) * (z - 0.08)) / 0.28)
    const rightOre = Math.exp(-((x - 0.52) * (x - 0.52)) / 0.14 - ((y + 0.1) * (y + 0.1)) / 0.18 - ((z + 0.02) * (z + 0.02)) / 0.3)
    const lowerOre = Math.exp(-((x - 0.04) * (x - 0.04)) / 0.34 - ((y + 0.12) * (y + 0.12)) / 0.3 - ((z + 0.52) * (z + 0.52)) / 0.08)
    const treasureBulge = 1 + lowerWeight * 0.07 - upperEgg * 0.06 + crownLode * 0.08 + leftOre * 0.06 + rightOre * 0.055 + lowerOre * 0.045
    const sideChunk = 1 + Math.max(0, Math.abs(x) - 0.34) * 0.07
    const frontFullness = y < -0.42 ? 1.06 : 1
    const crownLift = z > 0.28 ? 1 + (z - 0.28) * 0.2 + crownLode * 0.07 : 1
    const baseSettle = z < -0.44 ? 0.9 : 1

    position.setXYZ(
      index,
      x * rockyFacet * treasureBulge * sideChunk * (radial > 0.68 ? 1.036 : 1) - crownLode * 0.018 + rightOre * 0.018,
      y * rockyFacet * treasureBulge * frontFullness * (lowerWeight > 0.2 ? 1.04 : 1) - crownLode * 0.02,
      z * rockyFacet * crownLift * baseSettle + upperEgg * 0.04 - lowerWeight * 0.038 + crownLode * 0.04,
    )
  }

  position.needsUpdate = true
  const faceted = geometry.toNonIndexed()
  faceted.computeVertexNormals()
  return faceted
}

function createAmethystGeodeShellGeometry() {
  const geometry = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0.48, Math.PI - 0.48)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const angle = Math.atan2(y, x || 0.0001)
    const radial = Math.hypot(x, y)
    const upperCrystalMass = smoothstep01((z + 0.02) / 0.84)
    const lowerStoneWeight = smoothstep01((-z - 0.2) / 0.56)
    const frontCavity = Math.exp(-((x + 0.01) * (x + 0.01)) / 0.32 - ((y - 0.05) * (y - 0.05)) / 0.24 - ((z + 0.5) * (z + 0.5)) / 0.16)
    const topCrystalPocket = Math.exp(-((x - 0.04) * (x - 0.04)) / 0.22 - ((y - 0.32) * (y - 0.32)) / 0.28 - ((z - 0.4) * (z - 0.4)) / 0.16)
    const sidePocket = Math.exp(-((Math.abs(x) - 0.58) * (Math.abs(x) - 0.58)) / 0.12 - ((y - 0.08) * (y - 0.08)) / 0.22 - ((z + 0.06) * (z + 0.06)) / 0.3)
    const rockyFacet =
      1
      + Math.sin(angle * 4.8 + z * 5.8) * 0.058
      + Math.cos(angle * 7.7 - x * 2.4) * 0.042
      + Math.sin((x - y + z) * 9.2) * 0.03
      + Math.cos((x + y * 0.7 - z) * 13.6) * 0.018
    const geodeBulge = 1 + lowerStoneWeight * 0.055 - upperCrystalMass * 0.035 + frontCavity * 0.08 + topCrystalPocket * 0.07 + sidePocket * 0.04
    const sideChunk = 1 + Math.max(0, Math.abs(x) - 0.34) * 0.065
    const crownLift = z > 0.28 ? 1 + (z - 0.28) * 0.18 + topCrystalPocket * 0.055 : 1
    const frontFullness = y < -0.42 ? 1.045 : 1
    const baseSettle = z < -0.44 ? 0.9 : 1

    position.setXYZ(
      index,
      x * rockyFacet * geodeBulge * sideChunk * (radial > 0.68 ? 1.034 : 1) - topCrystalPocket * 0.014,
      y * rockyFacet * geodeBulge * frontFullness * (lowerStoneWeight > 0.2 ? 1.035 : 1) - frontCavity * 0.012 - topCrystalPocket * 0.014,
      z * rockyFacet * crownLift * baseSettle + upperCrystalMass * 0.034 - lowerStoneWeight * 0.034 + topCrystalPocket * 0.034,
    )
  }

  position.needsUpdate = true
  const faceted = removeAmethystFaceWindowTriangles(geometry)
  applyAmethystBodyGradient(faceted)
  return faceted
}

function applyAmethystBodyGradient(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position as THREE.BufferAttribute
  const colors: number[] = []
  const base = new THREE.Color(AMETHYST_BASE_OPAQUE)
  const lowerPurple = new THREE.Color(AMETHYST_INTERNAL_DEEP)
  const middlePurple = new THREE.Color(AMETHYST_PURPLE_DARK)
  const upperCrystal = new THREE.Color(AMETHYST_CLOUD_VEIL)
  const crownGlow = new THREE.Color(AMETHYST_CLOUD_MILK)
  const color = new THREE.Color()

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const baseToMid = smoothstep01((z + 0.56) / 0.72)
    const midToCrystal = smoothstep01((z - 0.02) / 0.72)
    const crown = smoothstep01((z - 0.42) / 0.36)
    const smokySide = smoothstep01((Math.abs(x) - 0.44) / 0.34) * (1 - midToCrystal * 0.45)
    const lowerBackDepth = smoothstep01((-y - 0.22) / 0.5) * (1 - baseToMid * 0.5)

    color.copy(base).lerp(lowerPurple, baseToMid * 0.72).lerp(middlePurple, baseToMid * 0.52).lerp(upperCrystal, midToCrystal)
    color.lerp(crownGlow, crown * 0.38)
    color.lerp(new THREE.Color(AMETHYST_STONE_DEEP), Math.min(0.55, smokySide * 0.32 + lowerBackDepth * 0.28))
    colors.push(color.r, color.g, color.b)
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
}

function isAmethystFaceWindowRenderPoint(x: number, y: number, z: number, padding = 0) {
  const windowX = x / (0.46 + padding)
  const windowY = (y + 0.04) / (0.38 + padding)
  return z < -0.16 && z > -0.9 && windowX * windowX + windowY * windowY < 1
}

function isAmethystFaceWindowDetail(position: [number, number, number], padding = 0) {
  return isAmethystFaceWindowRenderPoint(position[0], position[1], position[2], padding)
}

function removeAmethystFaceWindowTriangles(geometry: THREE.BufferGeometry) {
  const faceted = geometry.toNonIndexed()
  const sourcePosition = faceted.attributes.position as THREE.BufferAttribute
  const vertices: number[] = []

  for (let index = 0; index < sourcePosition.count; index += 3) {
    const x0 = sourcePosition.getX(index)
    const y0 = sourcePosition.getY(index)
    const z0 = sourcePosition.getZ(index)
    const x1 = sourcePosition.getX(index + 1)
    const y1 = sourcePosition.getY(index + 1)
    const z1 = sourcePosition.getZ(index + 1)
    const x2 = sourcePosition.getX(index + 2)
    const y2 = sourcePosition.getY(index + 2)
    const z2 = sourcePosition.getZ(index + 2)

    const centerX = ((x0 + x1 + x2) / 3) * 0.824
    const centerY = ((z0 + z1 + z2) / 3) * 0.766 - 0.025
    const centerZ = -((y0 + y1 + y2) / 3) * 0.724 - 0.08

    if (isAmethystFaceWindowRenderPoint(centerX, centerY, centerZ, 0.035)) {
      continue
    }

    vertices.push(x0, y0, z0, x1, y1, z1, x2, y2, z2)
  }

  const faceWindowGeometry = new THREE.BufferGeometry()
  faceWindowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  faceWindowGeometry.computeVertexNormals()
  faceWindowGeometry.computeBoundingBox()
  faceWindowGeometry.computeBoundingSphere()
  return faceWindowGeometry
}

function createAeroRacerShellGeometry() {
  const sourceGeometry = createOrganicSeedShellGeometry()
  sourceGeometry.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(0, -0.055, -0.035),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -0.012)),
      new THREE.Vector3(0.86, 0.81, 0.66),
    ),
  )

  const position = sourceGeometry.attributes.position as THREE.BufferAttribute
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const normalizedX = x / 0.86
    const normalizedY = (y + 0.055) / 0.66
    const normalizedZ = (z + 0.035) / 0.81
    const absoluteY = Math.abs(normalizedY)
    const topDeck = smoothstep01((normalizedY - 0.18) / 0.58)
    const lowerFloor = smoothstep01((-normalizedY - 0.16) / 0.58)
    const frontNose = smoothstep01((-normalizedZ - 0.08) / 0.72)
    const rearHaunch = smoothstep01((normalizedZ + 0.04) / 0.76)
    const shoulder = smoothstep01((Math.abs(normalizedX) - 0.3) / 0.56) * (1 - absoluteY * 0.28)
    const roofShoulder = topDeck * smoothstep01((Math.abs(normalizedX) - 0.32) / 0.48)
    const sideScoop =
      smoothstep01((Math.abs(normalizedX) - 0.58) / 0.24)
      * (1 - smoothstep01((absoluteY - 0.2) / 0.42))
      * (1 - Math.abs(normalizedZ - 0.08) / 1.1)

    let shapedX = x * (1 + shoulder * 0.032 + rearHaunch * 0.05 + lowerFloor * 0.018 - frontNose * 0.026)
    let shapedY = y - topDeck * (0.016 + roofShoulder * 0.012 + frontNose * 0.006) + rearHaunch * topDeck * 0.006
    let shapedZ = z + rearHaunch * 0.04 - frontNose * 0.024

    shapedX *= 1 - Math.max(0, sideScoop) * 0.032

    if (shapedY < -0.515) {
      shapedY = THREE.MathUtils.lerp(shapedY, -0.59, 0.56)
      shapedX *= 1.018
    }

    const manufacturedFacet = 1 + Math.sin(shapedX * 7.1 + shapedY * 4.8 - shapedZ * 5.4) * 0.0035
    shapedX *= manufacturedFacet
    shapedZ *= manufacturedFacet
    position.setXYZ(index, shapedX, shapedY, shapedZ)
  }

  position.needsUpdate = true
  sourceGeometry.computeVertexNormals()
  const geometry = sourceGeometry.toNonIndexed()
  sourceGeometry.dispose()
  const facetedPosition = geometry.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(facetedPosition.count * 3)
  const color = new THREE.Color()
  const hotColor = new THREE.Color(AERO_SHELL_HOT)

  for (let index = 0; index < facetedPosition.count; index += 3) {
    const centerX = (facetedPosition.getX(index) + facetedPosition.getX(index + 1) + facetedPosition.getX(index + 2)) / 3
    const centerY = (facetedPosition.getY(index) + facetedPosition.getY(index + 1) + facetedPosition.getY(index + 2)) / 3
    const centerZ = (facetedPosition.getZ(index) + facetedPosition.getZ(index + 1) + facetedPosition.getZ(index + 2)) / 3
    const sideArmor = Math.abs(centerX) > 0.58 && centerY < 0.24
    const rearArmor = centerZ > 0.38
    const lowerArmor = centerY < -0.3
    const upperHighlight = centerY > 0.28 && centerZ < 0.32

    color.set(lowerArmor ? AERO_SHELL_DEEP : rearArmor || sideArmor ? AERO_SHELL_DARK : AERO_SHELL_MID)
    if (upperHighlight) color.lerp(hotColor, 0.2)
    color.offsetHSL(0, 0, Math.sin(centerX * 6.4 + centerY * 4.7 - centerZ * 5.8) * 0.012)

    for (let vertex = 0; vertex < 3; vertex += 1) {
      colors[(index + vertex) * 3] = color.r
      colors[(index + vertex) * 3 + 1] = color.g
      colors[(index + vertex) * 3 + 2] = color.b
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createAeroCenterStripeGeometry(widthMultiplier = 1) {
  const sections: Array<{ z: number; y: number; halfWidth: number }> = [
    { z: -0.65, y: 0.405, halfWidth: 0.088 },
    { z: -0.5, y: 0.49, halfWidth: 0.112 },
    { z: -0.25, y: 0.545, halfWidth: 0.13 },
    { z: 0.04, y: 0.555, halfWidth: 0.138 },
    { z: 0.33, y: 0.51, halfWidth: 0.132 },
    { z: 0.56, y: 0.41, halfWidth: 0.11 },
    { z: 0.7, y: 0.295, halfWidth: 0.078 },
  ]
  const halfThickness = 0.018
  const vertices: number[] = []
  const indices: number[] = []

  sections.forEach(({ z, y, halfWidth }) => {
    const width = halfWidth * widthMultiplier
    vertices.push(-width, y - halfThickness, z)
    vertices.push(width, y - halfThickness, z)
    vertices.push(-width, y + halfThickness, z)
    vertices.push(width, y + halfThickness, z)
  })

  for (let index = 0; index < sections.length - 1; index += 1) {
    const current = index * 4
    const next = (index + 1) * 4
    indices.push(current + 2, next + 2, current + 3, current + 3, next + 2, next + 3)
    indices.push(current, current + 1, next, current + 1, next + 1, next)
    indices.push(current, next, current + 2, current + 2, next, next + 2)
    indices.push(current + 1, current + 3, next + 1, current + 3, next + 3, next + 1)
  }

  indices.push(0, 2, 1, 1, 2, 3)
  const last = (sections.length - 1) * 4
  indices.push(last, last + 1, last + 2, last + 1, last + 3, last + 2)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createAeroFrontNoseGeometry() {
  const sections: Array<{ z: number; y: number; halfWidth: number; halfHeight: number }> = [
    { z: -0.82, y: -0.43, halfWidth: 0.59, halfHeight: 0.03 },
    { z: -0.72, y: -0.425, halfWidth: 0.565, halfHeight: 0.048 },
    { z: -0.54, y: -0.415, halfWidth: 0.43, halfHeight: 0.066 },
  ]
  const vertices: number[] = []
  const indices: number[] = []

  sections.forEach(({ z, y, halfWidth, halfHeight }) => {
    vertices.push(-halfWidth, y - halfHeight, z)
    vertices.push(halfWidth, y - halfHeight, z)
    vertices.push(-halfWidth, y + halfHeight, z)
    vertices.push(halfWidth, y + halfHeight, z)
  })

  for (let index = 0; index < sections.length - 1; index += 1) {
    const current = index * 4
    const next = (index + 1) * 4
    indices.push(current + 2, next + 2, current + 3, current + 3, next + 2, next + 3)
    indices.push(current, current + 1, next, current + 1, next + 1, next)
    indices.push(current, next, current + 2, current + 2, next, next + 2)
    indices.push(current + 1, current + 3, next + 1, current + 3, next + 3, next + 1)
  }

  indices.push(0, 2, 1, 1, 2, 3)
  const last = (sections.length - 1) * 4
  indices.push(last, last + 1, last + 2, last + 1, last + 3, last + 2)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createAeroSpoilerWingGeometry() {
  const footprint: Array<[number, number]> = [
    [-0.58, -0.13],
    [0.58, -0.13],
    [0.73, -0.055],
    [0.69, 0.115],
    [0.5, 0.15],
    [-0.5, 0.15],
    [-0.69, 0.115],
    [-0.73, -0.055],
  ]
  const halfHeight = 0.043
  const vertices: number[] = []
  const indices: number[] = []

  footprint.forEach(([x, z]) => vertices.push(x, -halfHeight, z))
  footprint.forEach(([x, z]) => vertices.push(x, halfHeight, z))
  for (let index = 1; index < footprint.length - 1; index += 1) {
    indices.push(0, index, index + 1)
    indices.push(footprint.length, footprint.length + index + 1, footprint.length + index)
  }
  for (let index = 0; index < footprint.length; index += 1) {
    const next = (index + 1) % footprint.length
    indices.push(index, footprint.length + index, next)
    indices.push(next, footprint.length + index, footprint.length + next)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createShellOpeningWallGeometry() {
  const segments = 72
  const rings = 9
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings
    const ease = t * t * (3 - 2 * t)
    const raisedLip = Math.sin(Math.PI * t)
    const innerGrip = Math.pow(1 - t, 2)
    const xRadius = 0.372 + ease * 0.29 + raisedLip * 0.046 - innerGrip * 0.018
    const yRadius = 0.272 + ease * 0.232 + raisedLip * 0.034 - innerGrip * 0.012
    const z = -0.704 + ease * 0.262 - raisedLip * 0.052

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const organic = 1 + Math.sin(angle * 3.1 + 0.45) * 0.02 + Math.cos(angle * 5.4 - 0.2) * 0.014
      const sidePlump = 1 + Math.max(0, Math.cos(angle)) * 0.1 + Math.max(0, -Math.cos(angle)) * 0.085
      const lowerWeight = 1 + Math.max(0, -Math.sin(angle)) * 0.16
      const upperPinch = 1 - Math.max(0, Math.sin(angle)) * 0.062
      const innerSqueeze = 1 - innerGrip * (0.025 + Math.max(0, Math.abs(Math.cos(angle)) - 0.35) * 0.04)
      vertices.push(
        0.024 + Math.cos(angle) * xRadius * organic * sidePlump * innerSqueeze,
        -0.036 + Math.sin(angle) * yRadius * organic * lowerWeight * upperPinch * innerSqueeze,
        z + Math.max(0, Math.cos(angle)) * 0.024 - Math.max(0, -Math.sin(angle)) * 0.034,
      )
    }
  }

  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const row = segments + 1
      const base = ring * row + segment
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createShellOpeningShadowGeometry() {
  const segments = 56
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= 2; ring += 1) {
    const t = ring / 2
    const xRadius = 0.352 + t * 0.082
    const yRadius = 0.252 + t * 0.072
    const z = -0.632 + t * 0.034

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const lowerOcclusion = Math.max(0, -Math.sin(angle))
      const sideOcclusion = Math.max(0, Math.abs(Math.cos(angle)) - 0.28)
      const weight = 0.9 + lowerOcclusion * 0.08 + sideOcclusion * 0.04
      vertices.push(
        0.024 + Math.cos(angle) * xRadius * weight,
        -0.04 + Math.sin(angle) * yRadius * weight,
        z - lowerOcclusion * 0.018,
      )
    }
  }

  for (let ring = 0; ring < 2; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const row = segments + 1
      const base = ring * row + segment
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createShellOpeningPressureCreaseGeometry() {
  const segments = 72
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= 1; ring += 1) {
    const t = ring
    const xRadius = 0.356 + t * 0.068
    const yRadius = 0.258 + t * 0.058
    const z = -0.636 + t * 0.018

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const sidePressure = Math.max(0, Math.abs(Math.cos(angle)) - 0.25)
      const lowerPressure = Math.max(0, -Math.sin(angle))
      const organic = 1 + Math.sin(angle * 4.2 + 0.2) * 0.012 + Math.cos(angle * 7.1) * 0.008
      vertices.push(
        0.024 + Math.cos(angle) * xRadius * organic * (1 + sidePressure * 0.03),
        -0.041 + Math.sin(angle) * yRadius * organic * (1 + lowerPressure * 0.08),
        z - lowerPressure * 0.014,
      )
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    const row = segments + 1
    indices.push(segment, segment + row, segment + 1)
    indices.push(segment + 1, segment + row, segment + row + 1)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function ShellOpeningWall({ variant = 'seed' }: { variant?: 'seed' | 'soft' | 'aero-metal' | 'crystal' | 'gold-jewel' | 'amethyst-geode' } = {}) {
  const wallGeometry = useMemo(() => createShellOpeningWallGeometry(), [])
  const shadowGeometry = useMemo(() => createShellOpeningShadowGeometry(), [])
  const pressureCreaseGeometry = useMemo(() => createShellOpeningPressureCreaseGeometry(), [])
  const shellMid =
    variant === 'soft'
      ? SOFT_SHELL_MID
      : variant === 'aero-metal'
      ? AERO_SHELL_MID
      : variant === 'crystal'
        ? CRYSTAL_GLASS_BLUE
        : variant === 'gold-jewel'
          ? GOLD_SHELL_RICH
          : variant === 'amethyst-geode'
            ? AMETHYST_QUARTZ_FROST
            : SHELL_MID
  const shellDark =
    variant === 'soft'
      ? SOFT_SHELL_SHADOW
      : variant === 'aero-metal'
      ? AERO_SHELL_BLACK_PURPLE
      : variant === 'crystal'
        ? CRYSTAL_FACET_DEEP
        : variant === 'gold-jewel'
          ? GOLD_SHELL_DEEP
          : variant === 'amethyst-geode'
            ? AMETHYST_STONE_DEEP
            : SHELL_DARK

  return (
    <group>
      <mesh geometry={wallGeometry} visible={false}>
        {variant === 'aero-metal' || variant === 'gold-jewel' ? metal(shellMid, variant === 'gold-jewel' ? 0.34 : 0.18) : toon(shellMid)}
      </mesh>
      <mesh geometry={shadowGeometry} visible={false}>
        <meshBasicMaterial color={shellDark} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh geometry={pressureCreaseGeometry} visible={false}>
        <meshBasicMaterial color={shellDark} transparent opacity={0.06} depthWrite={false} />
      </mesh>
    </group>
  )
}

function createOrganicShellOpeningCowlGeometry() {
  const segments = 96
  const tubeSegments = 20
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const lower = Math.max(0, -sinAngle)
    const upper = Math.max(0, sinAngle)
    const side = Math.max(0, Math.abs(cosAngle) - 0.24)
    const sideTuck = side * side
    const organic = 1 + Math.sin(angle * 3.2 + 0.5) * 0.008 + Math.cos(angle * 5.7 - 0.4) * 0.005
    const centerX = 0.438 + sideTuck * 0.034 - lower * 0.002
    const centerY = 0.324 + lower * 0.022 - upper * 0.003
    const centerZ = -0.71 - lower * 0.014 + sideTuck * 0.046
    const radialRadius = 0.058 + lower * 0.01 + sideTuck * 0.018
    const depthRadius = 0.04 + sideTuck * 0.014

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      const shellSideMelt = Math.max(0, tubeRadial) * (0.074 + sideTuck * 0.046)
      const faceSideRoll = Math.max(0, -tubeRadial) * (0.018 + lower * 0.003)

      vertices.push(
        0.028 + cosAngle * (centerX + tubeRadial * radialRadius) * organic,
        -0.032 + sinAngle * (centerY + tubeRadial * radialRadius) * organic - lower * 0.03,
        centerZ + tubeDepth * depthRadius + shellSideMelt - faceSideRoll,
      )
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    for (let tube = 0; tube < tubeSegments; tube += 1) {
      const row = tubeSegments + 1
      const base = segment * row + tube
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function ShellOpeningOcclusionLip({ variant = 'seed' }: { variant?: 'seed' | 'soft' | 'aero-metal' | 'crystal' | 'gold-jewel' | 'amethyst-geode' } = {}) {
  const lipGroup = useRef<THREE.Group>(null)
  const cowlGeometry = useMemo(() => createOrganicShellOpeningCowlGeometry(), [])
  const shellMid =
    variant === 'soft'
      ? SOFT_SHELL_MID
      : variant === 'aero-metal'
      ? AERO_SHELL_MID
      : variant === 'crystal'
        ? CRYSTAL_GLASS
        : variant === 'gold-jewel'
          ? GOLD_SHELL_RICH
          : variant === 'amethyst-geode'
            ? AMETHYST_PURPLE_DARK
            : SHELL_MID
  const shellDeep =
    variant === 'soft'
      ? SOFT_SHELL_SHADOW
      : variant === 'aero-metal'
      ? AERO_SHELL_BLACK_PURPLE
      : variant === 'crystal'
        ? CRYSTAL_FACET_DEEP
        : variant === 'gold-jewel'
          ? GOLD_SHELL_DEEP
          : variant === 'amethyst-geode'
            ? AMETHYST_STONE_DEEP
            : SHELL_DEEP
  const shellEdge =
    variant === 'soft'
      ? SOFT_SHELL_LIGHT
      : variant === 'aero-metal'
      ? AERO_SHELL_GLINT
      : variant === 'crystal'
        ? CRYSTAL_GLINT
        : variant === 'gold-jewel'
          ? GOLD_SHELL_GLINT
          : variant === 'amethyst-geode'
            ? AMETHYST_LAVENDER
            : SHELL_EDGE_LIGHT

  useFrame(() => {
    if (lipGroup.current) {
      lipGroup.current.visible = true
      lipGroup.current.position.set(0, 0, 0)
      lipGroup.current.scale.set(1, 1, 1)
      lipGroup.current.rotation.set(0, 0, 0)
    }
  })

  return (
    <group ref={lipGroup}>
      <mesh geometry={cowlGeometry}>
        {variant === 'aero-metal' || variant === 'gold-jewel' ? (
          <meshStandardMaterial color={shellMid} metalness={0.62} roughness={variant === 'gold-jewel' ? 0.34 : 0.18} depthTest depthWrite />
        ) : variant === 'crystal' || variant === 'amethyst-geode' ? (
          <meshPhysicalMaterial
            color={shellMid}
            roughness={variant === 'amethyst-geode' ? 0.32 : 0.18}
            metalness={0}
            transparent
            opacity={variant === 'amethyst-geode' ? 0.96 : 0.9}
            transmission={variant === 'amethyst-geode' ? 0.08 : 0.05}
            thickness={variant === 'amethyst-geode' ? 0.3 : 0.34}
            ior={1.55}
            clearcoat={1}
            clearcoatRoughness={variant === 'amethyst-geode' ? 0.12 : 0.1}
            depthTest
            depthWrite={false}
          />
        ) : (
          <meshToonMaterial
            color={shellMid}
            gradientMap={getVacuumHeadToonRampTexture()}
            depthTest
            depthWrite
          />
        )}
      </mesh>
      <mesh position={[0.016, -0.326, -0.744]} rotation-z={0.025} scale={[0.38, 0.026, 0.012]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={shellDeep} transparent opacity={0.32} depthWrite={false} />
      </mesh>
      <mesh position={[-0.05, 0.278, -0.758]} rotation-z={-0.05} scale={[0.24, 0.012, 0.008]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={shellEdge} transparent opacity={0.24} depthWrite={false} />
      </mesh>
      <OrganicDetailStroke
        position={[-0.36, -0.03, -0.752]}
        rotation={-0.55}
        scale={[0.008, 0.084, 0.004]}
        color={shellDeep}
        opacity={0.22}
      />
      <OrganicDetailStroke
        position={[0.372, -0.02, -0.752]}
        rotation={0.55}
        scale={[0.008, 0.08, 0.004]}
        color={shellDeep}
        opacity={0.2}
      />
      {variant === 'gold-jewel' ? (
        <>
          <mesh position={[-0.18, 0.246, -0.77]} rotation-z={-0.12} scale={[0.16, 0.012, 0.006]}>
            <sphereGeometry args={[1, 10, 4]} />
            <meshBasicMaterial color={GOLD_SHELL_GLINT} transparent opacity={0.44} depthTest depthWrite={false} />
          </mesh>
          <mesh position={[0.22, 0.226, -0.768]} rotation-z={0.2} scale={[0.12, 0.01, 0.006]}>
            <sphereGeometry args={[1, 10, 4]} />
            <meshBasicMaterial color={GOLD_SHELL_LIGHT} transparent opacity={0.32} depthTest depthWrite={false} />
          </mesh>
          <mesh position={[0.0, -0.356, -0.752]} rotation-z={0.02} scale={[0.32, 0.018, 0.008]}>
            <sphereGeometry args={[1, 12, 4]} />
            <meshBasicMaterial color={GOLD_SHELL_DEEP} transparent opacity={0.2} depthTest depthWrite={false} />
          </mesh>
          <OrganicDetailStroke
            position={[-0.295, 0.145, -0.773]}
            rotation={-0.42}
            scale={[0.0048, 0.052, 0.0025]}
            color={GOLD_SHELL_GLINT}
            opacity={0.46}
            depthTest
          />
          <OrganicDetailStroke
            position={[0.302, 0.118, -0.77]}
            rotation={0.46}
            scale={[0.0045, 0.046, 0.0025]}
            color={GOLD_SHELL_LIGHT}
            opacity={0.36}
            depthTest
          />
        </>
      ) : null}
      {variant === 'amethyst-geode' ? (
        <>
          <mesh position={[-0.18, 0.246, -0.77]} rotation-z={-0.12} scale={[0.15, 0.012, 0.006]}>
            <sphereGeometry args={[1, 10, 4]} />
            <meshBasicMaterial color={AMETHYST_LAVENDER} transparent opacity={0.36} depthTest depthWrite={false} />
          </mesh>
          <mesh position={[0.22, 0.226, -0.768]} rotation-z={0.2} scale={[0.12, 0.01, 0.006]}>
            <sphereGeometry args={[1, 10, 4]} />
            <meshBasicMaterial color={AMETHYST_PURPLE_LIGHT} transparent opacity={0.28} depthTest depthWrite={false} />
          </mesh>
          <mesh position={[0.0, -0.356, -0.752]} rotation-z={0.02} scale={[0.32, 0.018, 0.008]}>
            <sphereGeometry args={[1, 12, 4]} />
            <meshBasicMaterial color={AMETHYST_STONE_DEEP} transparent opacity={0.24} depthTest depthWrite={false} />
          </mesh>
          <OrganicDetailStroke
            position={[-0.295, 0.145, -0.773]}
            rotation={-0.42}
            scale={[0.0046, 0.05, 0.0025]}
            color={AMETHYST_LAVENDER}
            opacity={0.38}
            depthTest
          />
          <OrganicDetailStroke
            position={[0.302, 0.118, -0.77]}
            rotation={0.46}
            scale={[0.0044, 0.046, 0.0025]}
            color={AMETHYST_PURPLE_LIGHT}
            opacity={0.34}
            depthTest
          />
        </>
      ) : null}
    </group>
  )
}

function ShellSeedTexture() {
  const shellMottles: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.36, 0.2, -0.43], rotation: -0.32, scale: [0.1, 0.024, 0.008], color: SHELL_LIGHT, opacity: 0.18 },
    { position: [-0.26, -0.34, -0.42], rotation: 0.2, scale: [0.12, 0.02, 0.008], color: SHELL_DARK, opacity: 0.18 },
    { position: [0.06, 0.34, -0.45], rotation: 0.14, scale: [0.18, 0.024, 0.009], color: SHELL_LIGHT, opacity: 0.17 },
    { position: [0.34, -0.08, -0.43], rotation: -0.28, scale: [0.084, 0.02, 0.008], color: SHELL_DARK, opacity: 0.16 },
    { position: [0.28, -0.28, -0.42], rotation: 0.1, scale: [0.14, 0.018, 0.008], color: SHELL_DARK, opacity: 0.17 },
    { position: [-0.06, -0.44, -0.4], rotation: -0.06, scale: [0.12, 0.018, 0.007], color: SHELL_LIGHT, opacity: 0.16 },
    { position: [-0.5, -0.18, -0.45], rotation: -0.4, scale: [0.092, 0.02, 0.008], color: SHELL_LIGHT, opacity: 0.15 },
    { position: [0.46, 0.22, -0.44], rotation: 0.3, scale: [0.096, 0.022, 0.008], color: SHELL_DARK, opacity: 0.13 },
    { position: [0.04, -0.55, -0.37], rotation: 0.04, scale: [0.18, 0.018, 0.007], color: SHELL_DARK, opacity: 0.16 },
  ]
  const shellPores: {
    position: [number, number, number]
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.42, 0.18, -0.49], scale: [0.01, 0.007, 0.004], color: SHELL_DARK, opacity: 0.22 },
    { position: [-0.31, -0.18, -0.5], scale: [0.008, 0.006, 0.004], color: SHELL_LIGHT, opacity: 0.2 },
    { position: [0.02, 0.42, -0.48], scale: [0.008, 0.006, 0.004], color: SHELL_DARK, opacity: 0.2 },
    { position: [0.2, 0.24, -0.5], scale: [0.009, 0.006, 0.004], color: SHELL_LIGHT, opacity: 0.22 },
    { position: [0.42, -0.04, -0.49], scale: [0.01, 0.007, 0.004], color: SHELL_DARK, opacity: 0.2 },
    { position: [0.08, -0.36, -0.49], scale: [0.008, 0.006, 0.004], color: SHELL_DARK, opacity: 0.18 },
  ]
  const shellDryFibers: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.46, 0.06, -0.53], rotation: -0.64, scale: [0.006, 0.046, 0.004], color: SHELL_DARK, opacity: 0.24 },
    { position: [-0.28, 0.3, -0.52], rotation: 0.4, scale: [0.005, 0.034, 0.004], color: SHELL_LIGHT, opacity: 0.22 },
    { position: [0.38, 0.18, -0.52], rotation: -0.42, scale: [0.006, 0.04, 0.004], color: SHELL_LIGHT, opacity: 0.2 },
    { position: [0.3, -0.25, -0.53], rotation: 0.68, scale: [0.005, 0.036, 0.004], color: SHELL_DARK, opacity: 0.22 },
    { position: [-0.12, -0.42, -0.52], rotation: -0.5, scale: [0.005, 0.03, 0.004], color: SHELL_LIGHT, opacity: 0.2 },
    { position: [-0.54, -0.12, -0.52], rotation: 0.58, scale: [0.005, 0.032, 0.004], color: SHELL_DARK, opacity: 0.2 },
    { position: [0.52, 0.02, -0.52], rotation: -0.72, scale: [0.005, 0.034, 0.004], color: SHELL_LIGHT, opacity: 0.2 },
  ]

  return (
    <group>
      <mesh position={[-0.15, 0.42, -0.39]} rotation-z={-0.18} scale={[0.34, 0.036, 0.012]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SHELL_LIGHT} transparent opacity={0.36} depthWrite={false} />
      </mesh>
      <mesh position={[0.26, 0.1, -0.43]} rotation-z={0.42} scale={[0.075, 0.28, 0.012]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={SHELL_LIGHT} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh position={[-0.39, -0.08, -0.44]} rotation-z={-0.18} scale={[0.055, 0.24, 0.012]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh position={[0.18, -0.36, -0.42]} rotation-z={0.08} scale={[0.36, 0.052, 0.012]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {shellMottles.map((mottle, index) => (
        <mesh
          key={`shell-mottle-${index}`}
          position={mottle.position}
          rotation-z={mottle.rotation}
          scale={mottle.scale}
        >
          <sphereGeometry args={[1, 7, 4]} />
          <meshBasicMaterial color={mottle.color} transparent opacity={mottle.opacity} depthWrite={false} />
        </mesh>
      ))}
      {shellPores.map((pore, index) => (
        <OrganicDetailDot
          key={`shell-tiny-pore-${index}`}
          position={pore.position}
          scale={pore.scale}
          color={pore.color}
          opacity={pore.opacity}
        />
      ))}
      {shellDryFibers.map((fiber, index) => (
        <OrganicDetailStroke
          key={`shell-dry-fiber-${index}`}
          position={fiber.position}
          rotation={fiber.rotation}
          scale={fiber.scale}
          color={fiber.color}
          opacity={fiber.opacity}
        />
      ))}
    </group>
  )
}

function ShellPremiumPolish() {
  const softGlazeStrokes: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.2, 0.42, -0.585], rotation: -0.16, scale: [0.24, 0.02, 0.007], color: SHELL_GLAZE, opacity: 0.34 },
    { position: [0.22, 0.32, -0.59], rotation: 0.14, scale: [0.18, 0.018, 0.007], color: SHELL_GLAZE, opacity: 0.22 },
    { position: [-0.44, -0.02, -0.59], rotation: -0.58, scale: [0.012, 0.12, 0.005], color: SHELL_LIGHT, opacity: 0.18 },
    { position: [0.46, 0.02, -0.59], rotation: 0.55, scale: [0.012, 0.11, 0.005], color: SHELL_DARK, opacity: 0.18 },
    { position: [-0.12, -0.46, -0.56], rotation: -0.04, scale: [0.22, 0.014, 0.006], color: SHELL_DARK, opacity: 0.24 },
    { position: [0.3, -0.38, -0.55], rotation: 0.12, scale: [0.16, 0.013, 0.006], color: SHELL_DARK, opacity: 0.2 },
    { position: [-0.34, 0.1, -0.602], rotation: -0.78, scale: [0.014, 0.104, 0.005], color: SHELL_GLAZE, opacity: 0.18 },
    { position: [0.36, -0.11, -0.604], rotation: 0.62, scale: [0.013, 0.116, 0.005], color: SHELL_DEEP, opacity: 0.16 },
    { position: [-0.04, -0.555, -0.552], rotation: 0.02, scale: [0.26, 0.011, 0.005], color: SHELL_EDGE_LIGHT, opacity: 0.16 },
  ]
  const polishedPores: {
    position: [number, number, number]
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.305, 0.325, -0.602], scale: [0.006, 0.004, 0.003], color: SHELL_DARK, opacity: 0.18 },
    { position: [-0.156, 0.39, -0.604], scale: [0.005, 0.004, 0.003], color: SHELL_DARK, opacity: 0.16 },
    { position: [0.092, 0.374, -0.604], scale: [0.005, 0.004, 0.003], color: SHELL_LIGHT, opacity: 0.2 },
    { position: [0.382, 0.118, -0.606], scale: [0.006, 0.004, 0.003], color: SHELL_DARK, opacity: 0.18 },
    { position: [-0.458, -0.22, -0.596], scale: [0.006, 0.004, 0.003], color: SHELL_LIGHT, opacity: 0.16 },
    { position: [0.206, -0.44, -0.584], scale: [0.006, 0.004, 0.003], color: SHELL_LIGHT, opacity: 0.18 },
  ]

  return (
    <group>
      <mesh position={[-0.012, -0.062, 0.524]} rotation-z={0.06} scale={[0.27, 0.136, 0.016]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshToonMaterial color={SHELL_MID} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
      </mesh>
      <mesh position={[0.004, -0.062, 0.68]} rotation-z={-0.08} scale={[0.134, 0.026, 0.008]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={SHELL_REAR_BLEND} depthWrite={false} />
      </mesh>
      <mesh position={[-0.086, 0.022, 0.536]} rotation-z={-0.28} scale={[0.13, 0.026, 0.006]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={SHELL_GLAZE} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh position={[0.18, -0.22, 0.536]} rotation-z={0.18} scale={[0.18, 0.022, 0.007]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={SHELL_DEEP} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[0.035, 0.18, 0.53]} rotation-z={0.16} scale={[0.24, 0.022, 0.007]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={SHELL_EDGE_LIGHT} transparent opacity={0.13} depthWrite={false} />
      </mesh>
      <mesh position={[-0.18, -0.22, 0.532]} rotation-z={-0.18} scale={[0.2, 0.02, 0.007]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={SHELL_DEEP} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <mesh position={[0.004, -0.57, -0.48]} rotation-z={-0.018} scale={[0.5, 0.032, 0.018]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh position={[0.0, 0.53, -0.46]} rotation-z={0.02} scale={[0.32, 0.022, 0.012]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={SHELL_GLAZE} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh position={[-0.18, 0.475, -0.56]} rotation-z={-0.1} scale={[0.19, 0.014, 0.006]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={SHELL_EDGE_LIGHT} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh position={[0.54, -0.18, -0.52]} rotation-z={0.52} scale={[0.036, 0.16, 0.012]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.15} depthWrite={false} />
      </mesh>
      <mesh position={[-0.48, -0.22, -0.54]} rotation-z={-0.62} scale={[0.034, 0.13, 0.011]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={SHELL_DEEP} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      {softGlazeStrokes.map((stroke, index) => (
        <OrganicDetailStroke
          key={`shell-premium-glaze-${index}`}
          position={stroke.position}
          rotation={stroke.rotation}
          scale={stroke.scale}
          color={stroke.color}
          opacity={stroke.opacity}
        />
      ))}
      {polishedPores.map((pore, index) => (
        <OrganicDetailDot
          key={`shell-premium-pore-${index}`}
          position={pore.position}
          scale={pore.scale}
          color={pore.color}
          opacity={pore.opacity}
        />
      ))}
    </group>
  )
}

function GoldTreasureGlint({
  position,
  scale = 1,
  opacity = 0.72,
  color = GOLD_SHELL_GLINT,
}: {
  position: [number, number, number]
  scale?: number
  opacity?: number
  color?: string
}) {
  return (
    <group position={position}>
      <OrganicDetailStroke
        position={[0, 0, 0]}
        rotation={0}
        scale={[0.0055 * scale, 0.052 * scale, 0.003]}
        color={color}
        opacity={opacity}
        depthTest
      />
      <OrganicDetailStroke
        position={[0, 0, 0]}
        rotation={Math.PI / 2}
        scale={[0.005 * scale, 0.045 * scale, 0.003]}
        color={color}
        opacity={opacity * 0.84}
        depthTest
      />
      <OrganicDetailStroke
        position={[0, 0, -0.002]}
        rotation={Math.PI / 4}
        scale={[0.004 * scale, 0.03 * scale, 0.0025]}
        color={GOLD_SHELL_GLINT}
        opacity={opacity * 0.58}
        depthTest
      />
      <OrganicDetailStroke
        position={[0, 0, -0.002]}
        rotation={-Math.PI / 4}
        scale={[0.0036 * scale, 0.026 * scale, 0.0025]}
        color={color}
        opacity={opacity * 0.5}
        depthTest
      />
      <OrganicDetailDot
        position={[0, 0, -0.005]}
        scale={[0.009 * scale, 0.009 * scale, 0.003]}
        color={GOLD_SHELL_GLINT}
        opacity={opacity}
        depthTest
      />
    </group>
  )
}

function GoldShellJewel({
  position,
  rotation = 0,
  scale,
  color,
  opacity = 0.74,
  tilt = [0, 0],
  rise = 0.004,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color: string
  opacity?: number
  tilt?: [number, number]
  rise?: number
}) {
  const gemScale: [number, number, number] = [scale[0], scale[1], scale[2] * 1.62]
  const embeddedRise = Math.max(rise * 0.62, scale[2] * 0.16)
  const gemDepthOffset = scale[2] * 0.42
  const growthRidges: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    {
      position: [-scale[0] * 0.48, scale[1] * 0.26, -scale[2] * 0.72],
      rotation: -0.48,
      scale: [scale[0] * 0.075, scale[1] * 0.52, scale[2] * 0.08],
      color: GOLD_SHELL_GLINT,
      opacity: 0.34,
    },
    {
      position: [scale[0] * 0.58, scale[1] * 0.04, -scale[2] * 0.7],
      rotation: 0.56,
      scale: [scale[0] * 0.07, scale[1] * 0.46, scale[2] * 0.08],
      color: GOLD_SHELL_LIGHT,
      opacity: 0.28,
    },
    {
      position: [-scale[0] * 0.08, -scale[1] * 0.54, -scale[2] * 0.68],
      rotation: -0.1,
      scale: [scale[0] * 0.065, scale[1] * 0.4, scale[2] * 0.075],
      color: GOLD_SHELL_RICH,
      opacity: 0.24,
    },
  ]

  return (
    <group position={[position[0], position[1], position[2] - embeddedRise]} rotation-x={tilt[0]} rotation-y={tilt[1]} rotation-z={rotation}>
      <mesh position={[0, 0, -scale[2] * 0.16]} rotation-z={rotation * -0.22} scale={[scale[0] * 1.34, scale[1] * 1.14, scale[2] * 0.16]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={GOLD_SHELL_LIGHT} transparent opacity={0.22} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[scale[0] * 0.08, -scale[1] * 0.04, -scale[2] * 0.28]} rotation-z={rotation * 0.18} scale={[scale[0] * 1.1, scale[1] * 0.94, scale[2] * 0.12]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={GOLD_SHELL_RICH} transparent opacity={0.2} depthTest depthWrite={false} />
      </mesh>
      {growthRidges.map((ridge, index) => (
        <OrganicDetailStroke
          key={`gold-jewel-growth-ridge-${index}`}
          position={ridge.position}
          rotation={ridge.rotation}
          scale={ridge.scale}
          color={ridge.color}
          opacity={ridge.opacity}
          depthTest
        />
      ))}
      <CodedAssetOutlineMesh
        position={[0, 0, -gemDepthOffset]}
        scale={[gemScale[0] * 1.04, gemScale[1] * 1.06, gemScale[2] * 1.08]}
        outlineWidth={0.004}
        outlineColor={GOLD_SHELL_INK}
        geometry={<octahedronGeometry args={[1, 0]} />}
        material={
          <meshPhysicalMaterial
            color={color}
            roughness={0.07}
            metalness={0}
            transparent
            opacity={opacity}
            transmission={0.24}
            thickness={0.46}
            ior={1.56}
            clearcoat={1}
            clearcoatRoughness={0.06}
            depthTest
            depthWrite={false}
          />
        }
      />
      <mesh position={[0, -scale[1] * 0.58, -scale[2] * 1.02]} rotation-z={0.04} scale={[scale[0] * 0.74, scale[1] * 0.15, scale[2] * 0.1]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GOLD_SHELL_RICH} transparent opacity={0.84} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[-scale[0] * 0.28, scale[1] * 0.28, -scale[2] * 1.26]} rotation-z={-0.24} scale={[scale[0] * 0.5, scale[1] * 0.2, scale[2] * 0.24]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={GOLD_SHELL_GLINT} transparent opacity={0.78} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[scale[0] * 0.34, scale[1] * 0.16, -scale[2] * 1.08]} rotation-z={0.52} scale={[scale[0] * 0.28, scale[1] * 0.54, scale[2] * 0.28]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.44} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[-scale[0] * 0.08, -scale[1] * 0.34, -scale[2] * 0.92]} rotation-z={-0.38} scale={[scale[0] * 0.5, scale[1] * 0.2, scale[2] * 0.18]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[scale[0] * 0.06, scale[1] * 0.1, -scale[2] * 1.42]} rotation-z={rotation * -0.5} scale={[scale[0] * 0.22, scale[1] * 0.22, scale[2] * 0.18]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.34} depthTest depthWrite={false} />
      </mesh>
    </group>
  )
}

function GoldJewelSparkleBurst({
  position,
  scale = 1,
  color = GOLD_SHELL_GLINT,
}: {
  position: [number, number, number]
  scale?: number
  color?: string
}) {
  return (
    <group position={position}>
      <GoldTreasureGlint position={[0, 0, 0]} scale={scale} opacity={0.92} color={color} />
      <GoldTreasureGlint position={[-0.032 * scale, 0.026 * scale, -0.006]} scale={scale * 0.46} opacity={0.76} color={GOLD_SHELL_GLINT} />
      <GoldTreasureGlint position={[0.034 * scale, -0.02 * scale, -0.006]} scale={scale * 0.38} opacity={0.68} color={color} />
    </group>
  )
}

function GoldEmbeddedCoin({
  position,
  rotation = 0,
  scale,
  color = GOLD_SHELL_RICH,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color?: string
}) {
  return (
    <group position={position} rotation-z={rotation}>
      <CodedAssetOutlineMesh
        scale={scale}
        outlineWidth={0.0032}
        outlineColor={GOLD_SHELL_INK}
        geometry={<sphereGeometry args={[1, 10, 4]} />}
        material={metal(color, 0.35)}
      />
      <mesh position={[scale[0] * 0.08, scale[1] * 0.04, -scale[2] * 0.7]} rotation-z={-0.12} scale={[scale[0] * 0.64, scale[1] * 0.5, scale[2] * 0.18]}>
        <torusGeometry args={[1, 0.12, 6, 18]} />
        <meshBasicMaterial color={GOLD_SHELL_GLINT} transparent opacity={0.36} depthTest depthWrite={false} />
      </mesh>
      <OrganicDetailStroke
        position={[-scale[0] * 0.18, scale[1] * 0.18, -scale[2] * 0.84]}
        rotation={0.62}
        scale={[scale[0] * 0.08, scale[1] * 0.48, scale[2] * 0.08]}
        color={GOLD_SHELL_DEEP}
        opacity={0.24}
        depthTest
      />
    </group>
  )
}

function GoldFacetPlate({
  position,
  rotation = 0,
  scale,
  color,
  opacity,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color: string
  opacity: number
}) {
  return (
    <mesh position={position} rotation-z={rotation} scale={scale}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthTest depthWrite={false} />
    </mesh>
  )
}

function GoldRawShard({
  position,
  rotation = 0,
  scale,
  color = GOLD_SHELL_RICH,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color?: string
}) {
  return (
    <group position={position} rotation-z={rotation}>
      <CodedAssetOutlineMesh
        scale={scale}
        outlineWidth={0.0045}
        outlineColor={GOLD_SHELL_INK}
        geometry={<icosahedronGeometry args={[1, 0]} />}
        material={metal(color, 0.5)}
      />
      <mesh position={[-scale[0] * 0.16, scale[1] * 0.18, -scale[2] * 0.72]} rotation-z={-0.18} scale={[scale[0] * 0.42, scale[1] * 0.12, scale[2] * 0.14]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color={GOLD_SHELL_GLINT} transparent opacity={0.42} depthTest depthWrite={false} />
      </mesh>
    </group>
  )
}

function GoldJewelShellTexture() {
  const nuggets: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    roughness: number
  }> = [
    { position: [-0.28, 0.48, -0.58], rotation: -0.22, scale: [0.22, 0.094, 0.032], color: GOLD_SHELL_RICH, roughness: 0.38 },
    { position: [0.0, 0.54, -0.57], rotation: 0.04, scale: [0.24, 0.108, 0.034], color: GOLD_SHELL_LIGHT, roughness: 0.34 },
    { position: [0.27, 0.45, -0.585], rotation: 0.24, scale: [0.21, 0.092, 0.03], color: GOLD_SHELL_RICH, roughness: 0.38 },
    { position: [-0.38, -0.34, -0.55], rotation: 0.18, scale: [0.14, 0.064, 0.022], color: GOLD_SHELL_MID, roughness: 0.4 },
    { position: [0.36, -0.36, -0.55], rotation: -0.2, scale: [0.15, 0.066, 0.022], color: GOLD_SHELL_RICH, roughness: 0.36 },
    { position: [0.02, -0.56, -0.49], rotation: -0.02, scale: [0.28, 0.07, 0.026], color: GOLD_SHELL_DARK, roughness: 0.42 },
    { position: [-0.08, 0.34, -0.66], rotation: -0.12, scale: [0.18, 0.044, 0.016], color: GOLD_SHELL_LIGHT, roughness: 0.3 },
    { position: [0.2, 0.28, -0.67], rotation: 0.16, scale: [0.14, 0.036, 0.014], color: GOLD_SHELL_GLINT, roughness: 0.24 },
    { position: [-0.6, 0.34, -0.5], rotation: -0.44, scale: [0.092, 0.07, 0.024], color: GOLD_SHELL_LIGHT, roughness: 0.42 },
    { position: [0.61, 0.32, -0.5], rotation: 0.46, scale: [0.09, 0.068, 0.024], color: GOLD_SHELL_RICH, roughness: 0.4 },
    { position: [-0.54, -0.38, -0.42], rotation: 0.16, scale: [0.102, 0.062, 0.022], color: GOLD_SHELL_DEEP, roughness: 0.52 },
    { position: [0.54, -0.42, -0.42], rotation: -0.18, scale: [0.108, 0.064, 0.022], color: GOLD_SHELL_DARK, roughness: 0.5 },
  ]
  const facetPlates: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.34, 0.43, -0.692], rotation: -0.48, scale: [0.18, 0.044, 0.014], color: GOLD_SHELL_GLINT, opacity: 0.34 },
    { position: [0.3, 0.4, -0.692], rotation: 0.5, scale: [0.17, 0.042, 0.014], color: GOLD_SHELL_LIGHT, opacity: 0.3 },
    { position: [-0.36, -0.34, -0.626], rotation: 0.4, scale: [0.17, 0.034, 0.012], color: GOLD_SHELL_DUST, opacity: 0.32 },
    { position: [0.38, -0.38, -0.624], rotation: -0.44, scale: [0.18, 0.036, 0.012], color: GOLD_SHELL_RICH, opacity: 0.3 },
    { position: [-0.06, -0.55, -0.566], rotation: -0.04, scale: [0.26, 0.034, 0.014], color: GOLD_SHELL_DEEP, opacity: 0.24 },
    { position: [0.02, 0.62, -0.59], rotation: 0.08, scale: [0.26, 0.046, 0.015], color: GOLD_SHELL_GLINT, opacity: 0.28 },
    { position: [-0.18, 0.62, -0.42], rotation: -0.22, scale: [0.18, 0.038, 0.012], color: GOLD_SHELL_GLINT, opacity: 0.22 },
    { position: [0.22, 0.59, -0.38], rotation: 0.32, scale: [0.16, 0.036, 0.012], color: GOLD_SHELL_LIGHT, opacity: 0.2 },
    { position: [-0.56, 0.22, -0.36], rotation: -0.66, scale: [0.13, 0.032, 0.012], color: GOLD_SHELL_RICH, opacity: 0.2 },
    { position: [0.56, 0.16, -0.34], rotation: 0.68, scale: [0.13, 0.032, 0.012], color: GOLD_SHELL_DUST, opacity: 0.2 },
    { position: [-0.31, -0.48, -0.42], rotation: 0.18, scale: [0.15, 0.026, 0.01], color: GOLD_SHELL_DEEP, opacity: 0.18 },
    { position: [0.34, -0.48, -0.42], rotation: -0.22, scale: [0.15, 0.028, 0.01], color: GOLD_SHELL_RICH, opacity: 0.18 },
    { position: [-0.32, 0.32, 0.5], rotation: -0.34, scale: [0.14, 0.032, 0.011], color: GOLD_SHELL_LIGHT, opacity: 0.2 },
    { position: [0.34, 0.18, 0.52], rotation: 0.42, scale: [0.14, 0.032, 0.011], color: GOLD_SHELL_DUST, opacity: 0.18 },
    { position: [0.0, 0.42, 0.62], rotation: 0.05, scale: [0.17, 0.034, 0.012], color: GOLD_SHELL_GLINT, opacity: 0.18 },
    { position: [-0.48, 0.44, 0.22], rotation: -0.38, scale: [0.11, 0.028, 0.01], color: GOLD_SHELL_LIGHT, opacity: 0.17 },
    { position: [0.5, 0.34, 0.24], rotation: 0.44, scale: [0.12, 0.03, 0.01], color: GOLD_SHELL_RICH, opacity: 0.17 },
    { position: [-0.58, -0.12, 0.18], rotation: 0.24, scale: [0.1, 0.024, 0.009], color: GOLD_SHELL_DEEP, opacity: 0.14 },
    { position: [0.58, -0.16, 0.2], rotation: -0.28, scale: [0.1, 0.024, 0.009], color: GOLD_SHELL_DUST, opacity: 0.15 },
  ]
  const coinStuds: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color?: string
  }> = [
    { position: [-0.31, 0.555, -0.594], rotation: -0.26, scale: [0.04, 0.03, 0.01], color: GOLD_SHELL_LIGHT },
    { position: [0.29, 0.525, -0.598], rotation: 0.34, scale: [0.038, 0.028, 0.01], color: GOLD_SHELL_RICH },
    { position: [-0.58, 0.08, -0.48], rotation: -0.62, scale: [0.034, 0.028, 0.01], color: GOLD_SHELL_DUST },
    { position: [0.58, 0.04, -0.48], rotation: 0.58, scale: [0.034, 0.028, 0.01], color: GOLD_SHELL_RICH },
    { position: [-0.5, -0.33, -0.55], rotation: 0.18, scale: [0.034, 0.026, 0.009], color: GOLD_SHELL_RICH },
    { position: [0.48, -0.36, -0.55], rotation: -0.2, scale: [0.036, 0.026, 0.009], color: GOLD_SHELL_DUST },
    { position: [-0.08, -0.61, -0.488], rotation: 0.02, scale: [0.052, 0.022, 0.009], color: GOLD_SHELL_DARK },
    { position: [0.26, -0.54, -0.53], rotation: -0.24, scale: [0.038, 0.026, 0.009], color: GOLD_SHELL_LIGHT },
  ]
  const jewels: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity?: number
    tilt?: [number, number]
    rise?: number
  }> = [
    { position: [0.0, 0.405, -0.716], rotation: 0.02, scale: [0.074, 0.102, 0.034], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.62, tilt: [-0.16, 0.09], rise: 0.007 },
    { position: [-0.245, 0.342, -0.698], rotation: -0.4, scale: [0.058, 0.07, 0.028], color: GOLD_JEWEL_RUBY, opacity: 0.66, tilt: [0.1, -0.16], rise: 0.006 },
    { position: [0.274, 0.31, -0.696], rotation: 0.44, scale: [0.062, 0.07, 0.028], color: GOLD_JEWEL_EMERALD, opacity: 0.64, tilt: [-0.08, 0.2], rise: 0.006 },
    { position: [-0.16, -0.44, -0.598], rotation: -0.18, scale: [0.032, 0.04, 0.014], color: GOLD_JEWEL_PEARL, opacity: 0.72, tilt: [0.08, -0.08], rise: 0.001 },
    { position: [0.16, -0.45, -0.598], rotation: 0.2, scale: [0.034, 0.042, 0.014], color: GOLD_JEWEL_AMETHYST, opacity: 0.68, tilt: [-0.08, 0.08], rise: 0.001 },
    { position: [-0.37, 0.46, -0.582], rotation: -0.16, scale: [0.04, 0.048, 0.019], color: GOLD_JEWEL_PEARL, opacity: 0.72, tilt: [-0.18, -0.12], rise: 0.003 },
    { position: [0.4, 0.43, -0.582], rotation: 0.22, scale: [0.04, 0.05, 0.019], color: GOLD_JEWEL_PEARL, opacity: 0.72, tilt: [-0.04, 0.18], rise: 0.003 },
    { position: [-0.13, 0.53, -0.642], rotation: -0.24, scale: [0.052, 0.064, 0.023], color: GOLD_JEWEL_EMERALD, opacity: 0.66, tilt: [-0.18, -0.1], rise: 0.005 },
    { position: [0.17, 0.52, -0.642], rotation: 0.3, scale: [0.052, 0.064, 0.023], color: GOLD_JEWEL_RUBY, opacity: 0.66, tilt: [-0.12, 0.12], rise: 0.005 },
    { position: [-0.53, 0.16, -0.63], rotation: -0.46, scale: [0.044, 0.058, 0.021], color: GOLD_JEWEL_AMETHYST, opacity: 0.66, tilt: [0.08, -0.18], rise: 0.003 },
    { position: [0.54, 0.12, -0.632], rotation: 0.48, scale: [0.044, 0.058, 0.021], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.64, tilt: [-0.08, 0.18], rise: 0.003 },
    { position: [-0.51, -0.18, -0.598], rotation: 0.3, scale: [0.036, 0.05, 0.018], color: GOLD_JEWEL_EMERALD, opacity: 0.66, tilt: [0.06, -0.12], rise: 0.002 },
    { position: [0.52, -0.2, -0.596], rotation: -0.28, scale: [0.036, 0.05, 0.018], color: GOLD_JEWEL_RUBY, opacity: 0.66, tilt: [-0.06, 0.12], rise: 0.002 },
    { position: [-0.23, -0.38, -0.666], rotation: -0.1, scale: [0.028, 0.034, 0.012], color: GOLD_JEWEL_PEARL, opacity: 0.72, tilt: [0.05, -0.06], rise: 0.001 },
    { position: [0.25, -0.39, -0.666], rotation: 0.12, scale: [0.028, 0.034, 0.012], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.66, tilt: [-0.05, 0.06], rise: 0.001 },
    { position: [-0.46, 0.53, -0.535], rotation: -0.32, scale: [0.036, 0.046, 0.018], color: GOLD_JEWEL_AMETHYST, opacity: 0.7, tilt: [-0.22, -0.28], rise: 0.009 },
    { position: [0.47, 0.49, -0.54], rotation: 0.38, scale: [0.038, 0.048, 0.018], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.68, tilt: [-0.16, 0.22], rise: 0.009 },
    { position: [0.02, 0.635, -0.545], rotation: 0.08, scale: [0.042, 0.052, 0.02], color: GOLD_JEWEL_PEARL, opacity: 0.78, tilt: [-0.2, 0.04], rise: 0.009 },
    { position: [-0.12, 0.705, -0.405], rotation: -0.18, scale: [0.04, 0.058, 0.021], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.68, tilt: [-0.28, -0.04], rise: 0.008 },
    { position: [0.23, 0.675, -0.36], rotation: 0.34, scale: [0.036, 0.052, 0.019], color: GOLD_JEWEL_RUBY, opacity: 0.7, tilt: [-0.24, 0.08], rise: 0.007 },
    { position: [-0.36, 0.64, -0.31], rotation: -0.4, scale: [0.034, 0.048, 0.018], color: GOLD_JEWEL_EMERALD, opacity: 0.7, tilt: [-0.2, -0.16], rise: 0.006 },
    { position: [0.46, 0.59, -0.235], rotation: 0.42, scale: [0.032, 0.046, 0.016], color: GOLD_JEWEL_PEARL, opacity: 0.76, tilt: [-0.16, 0.24], rise: 0.005 },
    { position: [-0.54, 0.55, -0.17], rotation: -0.28, scale: [0.03, 0.044, 0.016], color: GOLD_JEWEL_AMETHYST, opacity: 0.68, tilt: [-0.12, -0.28], rise: 0.005 },
    { position: [0.08, 0.655, 0.02], rotation: 0.14, scale: [0.034, 0.05, 0.018], color: GOLD_JEWEL_EMERALD, opacity: 0.68, tilt: [-0.12, 1.42], rise: 0.006 },
    { position: [-0.2, 0.61, 0.22], rotation: -0.34, scale: [0.032, 0.046, 0.017], color: GOLD_JEWEL_RUBY, opacity: 0.7, tilt: [-0.18, 2.34], rise: 0.005 },
    { position: [0.36, 0.56, 0.28], rotation: 0.36, scale: [0.03, 0.044, 0.016], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.68, tilt: [-0.18, -2.42], rise: 0.005 },
    { position: [-0.43, 0.51, 0.27], rotation: -0.22, scale: [0.028, 0.04, 0.014], color: GOLD_JEWEL_PEARL, opacity: 0.76, tilt: [-0.16, 2.52], rise: 0.004 },
    { position: [-0.57, 0.15, -0.5], rotation: -0.44, scale: [0.036, 0.048, 0.018], color: GOLD_JEWEL_AMETHYST, opacity: 0.7, tilt: [0.18, -0.24], rise: 0.007 },
    { position: [0.58, 0.11, -0.5], rotation: 0.52, scale: [0.038, 0.05, 0.019], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.68, tilt: [-0.16, 0.24], rise: 0.007 },
    { position: [-0.43, -0.2, -0.52], rotation: 0.28, scale: [0.032, 0.044, 0.016], color: GOLD_JEWEL_EMERALD, opacity: 0.72, tilt: [0.12, -0.18], rise: 0.005 },
    { position: [0.43, -0.24, -0.515], rotation: -0.32, scale: [0.032, 0.044, 0.016], color: GOLD_JEWEL_RUBY, opacity: 0.72, tilt: [-0.12, 0.18], rise: 0.005 },
    { position: [-0.22, 0.14, -0.37], rotation: -0.26, scale: [0.032, 0.042, 0.016], color: GOLD_JEWEL_EMERALD, opacity: 0.72, tilt: [0.18, -0.14], rise: 0.006 },
    { position: [0.16, 0.22, -0.35], rotation: 0.22, scale: [0.034, 0.044, 0.017], color: GOLD_JEWEL_AMETHYST, opacity: 0.7, tilt: [-0.16, 0.12], rise: 0.006 },
    { position: [0.38, -0.08, -0.36], rotation: 0.48, scale: [0.03, 0.04, 0.015], color: GOLD_JEWEL_PEARL, opacity: 0.78, tilt: [-0.12, 0.2], rise: 0.005 },
    { position: [-0.34, -0.11, -0.36], rotation: -0.42, scale: [0.03, 0.04, 0.015], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.7, tilt: [0.12, -0.2], rise: 0.005 },
    { position: [0.02, -0.34, -0.35], rotation: 0.08, scale: [0.028, 0.038, 0.014], color: GOLD_JEWEL_RUBY, opacity: 0.72, tilt: [0.1, 0.06], rise: 0.004 },
    { position: [-0.64, 0.28, -0.38], rotation: -0.58, scale: [0.032, 0.042, 0.015], color: GOLD_JEWEL_EMERALD, opacity: 0.7, tilt: [0.18, -0.28], rise: 0.004 },
    { position: [0.64, 0.24, -0.39], rotation: 0.54, scale: [0.034, 0.044, 0.016], color: GOLD_JEWEL_RUBY, opacity: 0.72, tilt: [-0.16, 0.28], rise: 0.004 },
    { position: [-0.54, -0.02, -0.31], rotation: -0.24, scale: [0.026, 0.034, 0.012], color: GOLD_JEWEL_PEARL, opacity: 0.76, tilt: [0.14, -0.18], rise: 0.003 },
    { position: [0.52, -0.06, -0.3], rotation: 0.32, scale: [0.026, 0.036, 0.012], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.68, tilt: [-0.12, 0.18], rise: 0.003 },
    { position: [-0.24, 0.55, -0.34], rotation: -0.18, scale: [0.03, 0.04, 0.014], color: GOLD_JEWEL_AMETHYST, opacity: 0.7, tilt: [-0.18, -0.12], rise: 0.004 },
    { position: [0.28, 0.5, -0.33], rotation: 0.28, scale: [0.032, 0.042, 0.014], color: GOLD_JEWEL_EMERALD, opacity: 0.7, tilt: [-0.14, 0.1], rise: 0.004 },
    { position: [-0.48, -0.5, -0.34], rotation: 0.18, scale: [0.024, 0.032, 0.011], color: GOLD_JEWEL_RUBY, opacity: 0.68, tilt: [0.1, -0.12], rise: 0.002 },
    { position: [0.5, -0.52, -0.35], rotation: -0.22, scale: [0.024, 0.032, 0.011], color: GOLD_JEWEL_PEARL, opacity: 0.74, tilt: [-0.1, 0.12], rise: 0.002 },
    { position: [-0.73, 0.22, -0.08], rotation: -0.18, scale: [0.034, 0.048, 0.017], color: GOLD_JEWEL_RUBY, opacity: 0.7, tilt: [0.08, -1.04], rise: 0.004 },
    { position: [-0.69, -0.16, -0.04], rotation: 0.2, scale: [0.028, 0.04, 0.014], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.68, tilt: [0.02, -1.08], rise: 0.003 },
    { position: [0.73, 0.18, -0.1], rotation: 0.22, scale: [0.034, 0.048, 0.017], color: GOLD_JEWEL_EMERALD, opacity: 0.7, tilt: [-0.06, 1.04], rise: 0.004 },
    { position: [0.7, -0.2, -0.06], rotation: -0.24, scale: [0.028, 0.04, 0.014], color: GOLD_JEWEL_AMETHYST, opacity: 0.68, tilt: [0.02, 1.08], rise: 0.003 },
    { position: [-0.77, 0.34, -0.22], rotation: -0.42, scale: [0.034, 0.05, 0.018], color: GOLD_JEWEL_EMERALD, opacity: 0.7, tilt: [0.1, -0.78], rise: 0.004 },
    { position: [-0.82, 0.12, -0.24], rotation: 0.18, scale: [0.03, 0.044, 0.016], color: GOLD_JEWEL_AMETHYST, opacity: 0.68, tilt: [0.04, -0.92], rise: 0.003 },
    { position: [-0.68, 0.02, -0.34], rotation: -0.28, scale: [0.028, 0.038, 0.014], color: GOLD_JEWEL_PEARL, opacity: 0.76, tilt: [0.02, -0.84], rise: 0.003 },
    { position: [-0.8, 0.49, -0.08], rotation: -0.38, scale: [0.044, 0.064, 0.023], color: GOLD_JEWEL_RUBY, opacity: 0.7, tilt: [0.08, -1.08], rise: 0.005 },
    { position: [-0.7, 0.43, -0.32], rotation: -0.62, scale: [0.036, 0.052, 0.019], color: GOLD_JEWEL_PEARL, opacity: 0.76, tilt: [0.14, -0.7], rise: 0.005 },
    { position: [-0.62, 0.39, -0.52], rotation: -0.48, scale: [0.038, 0.052, 0.019], color: GOLD_JEWEL_EMERALD, opacity: 0.7, tilt: [0.12, -0.34], rise: 0.006 },
    { position: [-0.86, 0.32, 0.02], rotation: 0.08, scale: [0.034, 0.048, 0.018], color: GOLD_JEWEL_AMETHYST, opacity: 0.68, tilt: [0.02, -1.18], rise: 0.004 },
    { position: [-0.72, 0.27, -0.16], rotation: -0.22, scale: [0.03, 0.042, 0.016], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.68, tilt: [0.08, -0.9], rise: 0.004 },
    { position: [0.76, 0.32, -0.24], rotation: 0.4, scale: [0.036, 0.052, 0.018], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.68, tilt: [-0.08, 0.78], rise: 0.004 },
    { position: [0.82, 0.08, -0.25], rotation: -0.2, scale: [0.03, 0.044, 0.016], color: GOLD_JEWEL_RUBY, opacity: 0.7, tilt: [-0.04, 0.92], rise: 0.003 },
    { position: [0.68, -0.02, -0.34], rotation: 0.3, scale: [0.028, 0.04, 0.014], color: GOLD_JEWEL_EMERALD, opacity: 0.7, tilt: [-0.02, 0.84], rise: 0.003 },
    { position: [0.8, 0.46, -0.1], rotation: 0.34, scale: [0.042, 0.06, 0.022], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.68, tilt: [-0.08, 1.08], rise: 0.005 },
    { position: [0.69, 0.38, -0.34], rotation: 0.6, scale: [0.036, 0.052, 0.019], color: GOLD_JEWEL_EMERALD, opacity: 0.7, tilt: [-0.14, 0.72], rise: 0.005 },
    { position: [0.63, 0.36, -0.52], rotation: 0.5, scale: [0.038, 0.052, 0.019], color: GOLD_JEWEL_AMETHYST, opacity: 0.68, tilt: [-0.12, 0.34], rise: 0.006 },
    { position: [0.86, 0.28, 0.02], rotation: -0.12, scale: [0.032, 0.046, 0.017], color: GOLD_JEWEL_RUBY, opacity: 0.7, tilt: [-0.02, 1.18], rise: 0.004 },
    { position: [0.71, 0.24, -0.18], rotation: 0.24, scale: [0.03, 0.042, 0.016], color: GOLD_JEWEL_PEARL, opacity: 0.76, tilt: [-0.08, 0.9], rise: 0.004 },
    { position: [-0.24, 0.28, 0.49], rotation: 0.18, scale: [0.032, 0.046, 0.016], color: GOLD_JEWEL_AMETHYST, opacity: 0.68, tilt: [0.04, 2.96], rise: 0.004 },
    { position: [0.26, 0.1, 0.52], rotation: -0.26, scale: [0.034, 0.046, 0.016], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.68, tilt: [-0.02, -2.96], rise: 0.004 },
    { position: [-0.08, -0.28, 0.48], rotation: 0.12, scale: [0.026, 0.038, 0.013], color: GOLD_JEWEL_EMERALD, opacity: 0.66, tilt: [0.06, 3.02], rise: 0.003 },
    { position: [0.42, 0.34, 0.64], rotation: -0.32, scale: [0.04, 0.056, 0.02], color: GOLD_JEWEL_EMERALD, opacity: 0.7, tilt: [-0.14, -2.96], rise: 0.006 },
    { position: [-0.4, 0.08, 0.66], rotation: 0.28, scale: [0.038, 0.054, 0.019], color: GOLD_JEWEL_RUBY, opacity: 0.7, tilt: [0.02, 2.96], rise: 0.006 },
    { position: [0.16, -0.28, 0.62], rotation: -0.12, scale: [0.028, 0.04, 0.014], color: GOLD_JEWEL_PEARL, opacity: 0.76, tilt: [-0.04, -3.04], rise: 0.004 },
    { position: [-0.08, 0.46, 0.69], rotation: 0.14, scale: [0.038, 0.056, 0.02], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.68, tilt: [-0.12, 3.1], rise: 0.006 },
    { position: [-0.5, 0.36, 0.54], rotation: -0.42, scale: [0.03, 0.044, 0.016], color: GOLD_JEWEL_PEARL, opacity: 0.76, tilt: [-0.08, 2.78], rise: 0.004 },
    { position: [0.54, 0.2, 0.54], rotation: 0.36, scale: [0.032, 0.046, 0.016], color: GOLD_JEWEL_AMETHYST, opacity: 0.68, tilt: [-0.06, -2.62], rise: 0.004 },
    { position: [-0.58, -0.14, 0.44], rotation: 0.22, scale: [0.026, 0.038, 0.014], color: GOLD_JEWEL_EMERALD, opacity: 0.68, tilt: [0.06, 2.36], rise: 0.003 },
    { position: [0.48, -0.16, 0.48], rotation: -0.18, scale: [0.028, 0.04, 0.014], color: GOLD_JEWEL_RUBY, opacity: 0.7, tilt: [-0.04, -2.48], rise: 0.003 },
    { position: [-0.02, 0.0, 0.72], rotation: -0.08, scale: [0.034, 0.05, 0.018], color: GOLD_JEWEL_AMETHYST, opacity: 0.7, tilt: [0.02, 3.1], rise: 0.005 },
    { position: [0.34, -0.38, 0.5], rotation: 0.26, scale: [0.024, 0.036, 0.013], color: GOLD_JEWEL_EMERALD, opacity: 0.68, tilt: [-0.02, -2.7], rise: 0.003 },
    { position: [-0.32, -0.42, 0.46], rotation: -0.3, scale: [0.024, 0.034, 0.012], color: GOLD_JEWEL_SAPPHIRE, opacity: 0.68, tilt: [0.04, 2.76], rise: 0.003 },
  ]
  const shards: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
  }> = [
    { position: [-0.18, 0.62, -0.48], rotation: -0.28, scale: [0.09, 0.052, 0.026], color: GOLD_SHELL_LIGHT },
    { position: [0.12, 0.64, -0.49], rotation: 0.34, scale: [0.086, 0.05, 0.026], color: GOLD_SHELL_RICH },
    { position: [0.34, 0.52, -0.54], rotation: 0.62, scale: [0.076, 0.05, 0.024], color: GOLD_SHELL_DUST },
    { position: [-0.42, 0.46, -0.54], rotation: -0.54, scale: [0.08, 0.052, 0.024], color: GOLD_SHELL_RICH },
    { position: [-0.62, 0.08, -0.55], rotation: -0.74, scale: [0.07, 0.066, 0.024], color: GOLD_SHELL_DEEP },
    { position: [0.62, 0.04, -0.55], rotation: 0.7, scale: [0.072, 0.066, 0.024], color: GOLD_SHELL_DARK },
    { position: [-0.5, -0.28, -0.56], rotation: -0.16, scale: [0.078, 0.05, 0.022], color: GOLD_SHELL_DUST },
    { position: [0.49, -0.31, -0.56], rotation: 0.22, scale: [0.08, 0.052, 0.022], color: GOLD_SHELL_RICH },
    { position: [-0.24, -0.5, -0.49], rotation: 0.32, scale: [0.07, 0.044, 0.02], color: GOLD_SHELL_DARK },
    { position: [0.28, -0.5, -0.49], rotation: -0.36, scale: [0.072, 0.046, 0.02], color: GOLD_SHELL_LIGHT },
  ]
  const jewelSparkles: Array<{ position: [number, number, number]; scale: number; color?: string }> = [
    { position: [0.062, 0.45, -0.75], scale: 0.78, color: GOLD_JEWEL_SAPPHIRE },
    { position: [-0.252, 0.37, -0.728], scale: 0.48, color: GOLD_JEWEL_RUBY },
    { position: [0.306, 0.334, -0.726], scale: 0.5, color: GOLD_JEWEL_EMERALD },
    { position: [-0.13, 0.548, -0.664], scale: 0.36, color: GOLD_JEWEL_EMERALD },
    { position: [0.19, 0.536, -0.664], scale: 0.36, color: GOLD_JEWEL_RUBY },
    { position: [-0.54, 0.19, -0.654], scale: 0.3, color: GOLD_JEWEL_AMETHYST },
    { position: [0.55, 0.15, -0.656], scale: 0.3, color: GOLD_JEWEL_SAPPHIRE },
    { position: [-0.52, -0.15, -0.616], scale: 0.24, color: GOLD_JEWEL_EMERALD },
    { position: [0.53, -0.17, -0.614], scale: 0.24, color: GOLD_JEWEL_RUBY },
    { position: [-0.585, 0.18, -0.53], scale: 0.36, color: GOLD_JEWEL_AMETHYST },
    { position: [0.6, 0.14, -0.53], scale: 0.36, color: GOLD_JEWEL_SAPPHIRE },
    { position: [-0.44, -0.17, -0.55], scale: 0.32, color: GOLD_JEWEL_EMERALD },
    { position: [0.45, -0.21, -0.545], scale: 0.32, color: GOLD_JEWEL_RUBY },
    { position: [-0.22, 0.17, -0.4], scale: 0.3, color: GOLD_JEWEL_EMERALD },
    { position: [0.16, 0.25, -0.38], scale: 0.32, color: GOLD_JEWEL_AMETHYST },
    { position: [-0.65, 0.31, -0.41], scale: 0.28, color: GOLD_JEWEL_EMERALD },
    { position: [0.66, 0.27, -0.42], scale: 0.3, color: GOLD_JEWEL_RUBY },
    { position: [-0.55, 0.0, -0.34], scale: 0.24, color: GOLD_JEWEL_PEARL },
    { position: [0.53, -0.03, -0.33], scale: 0.24, color: GOLD_JEWEL_SAPPHIRE },
    { position: [-0.24, 0.58, -0.37], scale: 0.28, color: GOLD_JEWEL_AMETHYST },
    { position: [0.29, 0.53, -0.36], scale: 0.28, color: GOLD_JEWEL_EMERALD },
    { position: [-0.12, 0.73, -0.37], scale: 0.34, color: GOLD_JEWEL_SAPPHIRE },
    { position: [0.24, 0.7, -0.33], scale: 0.3, color: GOLD_JEWEL_RUBY },
    { position: [-0.37, 0.66, -0.29], scale: 0.28, color: GOLD_JEWEL_EMERALD },
    { position: [0.47, 0.61, -0.22], scale: 0.24, color: GOLD_JEWEL_PEARL },
    { position: [-0.55, 0.57, -0.16], scale: 0.24, color: GOLD_JEWEL_AMETHYST },
    { position: [0.08, 0.68, 0.04], scale: 0.28, color: GOLD_JEWEL_EMERALD },
    { position: [-0.2, 0.63, 0.24], scale: 0.26, color: GOLD_JEWEL_RUBY },
    { position: [0.37, 0.58, 0.3], scale: 0.24, color: GOLD_JEWEL_SAPPHIRE },
    { position: [-0.75, 0.24, -0.1], scale: 0.28, color: GOLD_JEWEL_RUBY },
    { position: [0.75, 0.2, -0.12], scale: 0.28, color: GOLD_JEWEL_EMERALD },
    { position: [-0.78, 0.36, -0.25], scale: 0.3, color: GOLD_JEWEL_EMERALD },
    { position: [-0.83, 0.14, -0.27], scale: 0.26, color: GOLD_JEWEL_AMETHYST },
    { position: [0.77, 0.34, -0.27], scale: 0.3, color: GOLD_JEWEL_SAPPHIRE },
    { position: [0.83, 0.1, -0.28], scale: 0.26, color: GOLD_JEWEL_RUBY },
    { position: [-0.81, 0.51, -0.1], scale: 0.32, color: GOLD_JEWEL_RUBY },
    { position: [-0.7, 0.45, -0.34], scale: 0.26, color: GOLD_JEWEL_PEARL },
    { position: [-0.62, 0.41, -0.55], scale: 0.28, color: GOLD_JEWEL_EMERALD },
    { position: [-0.86, 0.34, 0.0], scale: 0.24, color: GOLD_JEWEL_AMETHYST },
    { position: [0.81, 0.48, -0.12], scale: 0.32, color: GOLD_JEWEL_SAPPHIRE },
    { position: [0.7, 0.4, -0.36], scale: 0.26, color: GOLD_JEWEL_EMERALD },
    { position: [0.63, 0.38, -0.55], scale: 0.28, color: GOLD_JEWEL_AMETHYST },
    { position: [0.86, 0.3, 0.0], scale: 0.24, color: GOLD_JEWEL_RUBY },
    { position: [-0.25, 0.3, 0.46], scale: 0.24, color: GOLD_JEWEL_AMETHYST },
    { position: [0.27, 0.12, 0.49], scale: 0.24, color: GOLD_JEWEL_SAPPHIRE },
    { position: [0.43, 0.36, 0.6], scale: 0.3, color: GOLD_JEWEL_EMERALD },
    { position: [-0.41, 0.1, 0.62], scale: 0.28, color: GOLD_JEWEL_RUBY },
    { position: [-0.08, 0.49, 0.65], scale: 0.3, color: GOLD_JEWEL_SAPPHIRE },
    { position: [-0.51, 0.38, 0.5], scale: 0.24, color: GOLD_JEWEL_PEARL },
    { position: [0.55, 0.22, 0.5], scale: 0.24, color: GOLD_JEWEL_AMETHYST },
    { position: [-0.59, -0.12, 0.4], scale: 0.22, color: GOLD_JEWEL_EMERALD },
    { position: [0.49, -0.14, 0.44], scale: 0.22, color: GOLD_JEWEL_RUBY },
    { position: [-0.02, 0.02, 0.68], scale: 0.26, color: GOLD_JEWEL_AMETHYST },
  ]
  const glints: Array<{ position: [number, number, number]; scale: number; opacity: number; color?: string }> = [
    { position: [-0.06, 0.54, -0.735], scale: 0.74, opacity: 0.76 },
    { position: [0.09, 0.39, -0.768], scale: 0.86, opacity: 0.86 },
    { position: [-0.28, 0.31, -0.74], scale: 0.56, opacity: 0.7 },
    { position: [0.32, 0.28, -0.735], scale: 0.58, opacity: 0.72 },
    { position: [-0.02, -0.52, -0.63], scale: 0.55, opacity: 0.64 },
    { position: [0.2, -0.42, -0.642], scale: 0.42, opacity: 0.54, color: GOLD_JEWEL_PEARL },
    { position: [-0.18, 0.62, -0.62], scale: 0.66, opacity: 0.76 },
    { position: [0.18, 0.6, -0.62], scale: 0.62, opacity: 0.74 },
    { position: [-0.42, 0.42, -0.66], scale: 0.54, opacity: 0.66 },
    { position: [0.44, 0.38, -0.66], scale: 0.58, opacity: 0.68 },
    { position: [-0.56, 0.02, -0.69], scale: 0.46, opacity: 0.58 },
    { position: [0.56, 0.0, -0.69], scale: 0.48, opacity: 0.6 },
    { position: [-0.22, -0.28, -0.714], scale: 0.44, opacity: 0.58 },
    { position: [0.22, -0.3, -0.714], scale: 0.44, opacity: 0.58 },
    { position: [-0.38, -0.48, -0.58], scale: 0.38, opacity: 0.48 },
    { position: [0.38, -0.5, -0.58], scale: 0.4, opacity: 0.5 },
    { position: [-0.18, 0.64, -0.45], scale: 0.38, opacity: 0.54 },
    { position: [0.22, 0.58, -0.4], scale: 0.34, opacity: 0.48 },
    { position: [-0.56, 0.22, -0.38], scale: 0.3, opacity: 0.38 },
    { position: [0.58, 0.16, -0.36], scale: 0.3, opacity: 0.38 },
    { position: [0.08, 0.34, 0.58], scale: 0.3, opacity: 0.36 },
    { position: [-0.34, 0.28, 0.5], scale: 0.26, opacity: 0.32 },
  ]
  const scratches: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.34, 0.42, -0.706], rotation: -0.62, scale: [0.004, 0.076, 0.002], color: GOLD_SHELL_GLINT, opacity: 0.52 },
    { position: [0.18, 0.48, -0.7], rotation: 0.58, scale: [0.004, 0.068, 0.002], color: GOLD_SHELL_DEEP, opacity: 0.28 },
    { position: [-0.26, -0.34, -0.656], rotation: -0.22, scale: [0.0035, 0.058, 0.002], color: GOLD_SHELL_GLINT, opacity: 0.38 },
    { position: [0.28, -0.36, -0.656], rotation: 0.28, scale: [0.0035, 0.06, 0.002], color: GOLD_SHELL_GLINT, opacity: 0.4 },
    { position: [-0.48, 0.3, -0.69], rotation: 0.28, scale: [0.0038, 0.062, 0.002], color: GOLD_SHELL_GLINT, opacity: 0.46 },
    { position: [0.46, 0.28, -0.69], rotation: -0.34, scale: [0.0038, 0.064, 0.002], color: GOLD_SHELL_GLINT, opacity: 0.46 },
    { position: [-0.42, -0.36, -0.63], rotation: 0.6, scale: [0.0035, 0.062, 0.002], color: GOLD_SHELL_GLINT, opacity: 0.4 },
    { position: [0.42, -0.38, -0.63], rotation: -0.58, scale: [0.0035, 0.064, 0.002], color: GOLD_SHELL_GLINT, opacity: 0.4 },
    { position: [-0.02, 0.62, -0.68], rotation: 0.1, scale: [0.004, 0.076, 0.002], color: GOLD_SHELL_GLINT, opacity: 0.52 },
    { position: [0.02, -0.54, -0.62], rotation: -0.08, scale: [0.004, 0.07, 0.002], color: GOLD_SHELL_GLINT, opacity: 0.44 },
  ]
  const oreVeins: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.14, 0.47, -0.754], rotation: -0.68, scale: [0.0045, 0.118, 0.003], color: GOLD_SHELL_DEEP, opacity: 0.34 },
    { position: [0.17, 0.43, -0.752], rotation: 0.62, scale: [0.0045, 0.112, 0.003], color: GOLD_SHELL_DEEP, opacity: 0.3 },
    { position: [-0.26, -0.44, -0.62], rotation: -0.24, scale: [0.004, 0.084, 0.003], color: GOLD_SHELL_DEEP, opacity: 0.3 },
    { position: [0.3, -0.46, -0.62], rotation: 0.26, scale: [0.004, 0.088, 0.003], color: GOLD_SHELL_DEEP, opacity: 0.28 },
    { position: [-0.46, 0.12, -0.46], rotation: -0.74, scale: [0.0038, 0.082, 0.0028], color: GOLD_SHELL_DEEP, opacity: 0.24 },
    { position: [0.46, 0.08, -0.45], rotation: 0.72, scale: [0.0038, 0.08, 0.0028], color: GOLD_SHELL_DEEP, opacity: 0.24 },
    { position: [-0.2, 0.34, 0.58], rotation: -0.44, scale: [0.0035, 0.072, 0.0025], color: GOLD_SHELL_DARK, opacity: 0.2 },
    { position: [0.24, 0.24, 0.58], rotation: 0.5, scale: [0.0035, 0.068, 0.0025], color: GOLD_SHELL_DARK, opacity: 0.2 },
  ]
  const goldGrit: Array<{
    position: [number, number, number]
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.12, 0.58, -0.36], scale: [0.006, 0.004, 0.0025], color: GOLD_SHELL_GLINT, opacity: 0.32 },
    { position: [0.11, 0.56, -0.32], scale: [0.005, 0.004, 0.0025], color: GOLD_SHELL_DUST, opacity: 0.26 },
    { position: [-0.33, 0.43, -0.44], scale: [0.0048, 0.004, 0.0025], color: GOLD_SHELL_LIGHT, opacity: 0.28 },
    { position: [0.38, 0.36, -0.42], scale: [0.0048, 0.004, 0.0025], color: GOLD_SHELL_GLINT, opacity: 0.28 },
    { position: [-0.52, 0.02, -0.48], scale: [0.0045, 0.0038, 0.0024], color: GOLD_SHELL_DARK, opacity: 0.22 },
    { position: [0.52, -0.02, -0.47], scale: [0.0045, 0.0038, 0.0024], color: GOLD_SHELL_DARK, opacity: 0.22 },
    { position: [-0.2, -0.43, -0.52], scale: [0.005, 0.0038, 0.0024], color: GOLD_SHELL_GLINT, opacity: 0.24 },
    { position: [0.22, -0.44, -0.51], scale: [0.005, 0.0038, 0.0024], color: GOLD_SHELL_DUST, opacity: 0.24 },
    { position: [-0.26, 0.28, 0.52], scale: [0.0048, 0.004, 0.0025], color: GOLD_SHELL_GLINT, opacity: 0.24 },
    { position: [0.32, 0.2, 0.5], scale: [0.0048, 0.004, 0.0025], color: GOLD_SHELL_LIGHT, opacity: 0.22 },
    { position: [-0.08, 0.02, 0.66], scale: [0.0045, 0.0036, 0.0024], color: GOLD_SHELL_DUST, opacity: 0.22 },
    { position: [-0.44, 0.24, -0.31], scale: [0.0048, 0.0038, 0.0024], color: GOLD_SHELL_GLINT, opacity: 0.24 },
    { position: [0.42, 0.18, -0.3], scale: [0.0048, 0.0038, 0.0024], color: GOLD_SHELL_LIGHT, opacity: 0.24 },
    { position: [-0.48, -0.28, -0.34], scale: [0.0042, 0.0034, 0.0022], color: GOLD_SHELL_DUST, opacity: 0.2 },
    { position: [0.5, -0.32, -0.34], scale: [0.0042, 0.0034, 0.0022], color: GOLD_SHELL_GLINT, opacity: 0.2 },
    { position: [-0.44, 0.46, 0.22], scale: [0.0045, 0.0036, 0.0023], color: GOLD_SHELL_LIGHT, opacity: 0.2 },
    { position: [0.48, 0.36, 0.24], scale: [0.0045, 0.0036, 0.0023], color: GOLD_SHELL_GLINT, opacity: 0.2 },
    { position: [-0.58, -0.08, 0.14], scale: [0.004, 0.0032, 0.0022], color: GOLD_SHELL_DUST, opacity: 0.18 },
    { position: [0.58, -0.12, 0.16], scale: [0.004, 0.0032, 0.0022], color: GOLD_SHELL_LIGHT, opacity: 0.18 },
  ]

  return (
    <group>
      <mesh position={[0.0, 0.14, -0.61]} rotation-z={0.02} scale={[0.72, 0.46, 0.026]}>
        <sphereGeometry args={[1, 12, 6]} />
        <meshBasicMaterial color={GOLD_SHELL_RICH} transparent opacity={0.28} depthTest depthWrite={false} />
      </mesh>
      {facetPlates.map((plate, index) => (
        <GoldFacetPlate key={`gold-shell-facet-plate-${index}`} {...plate} />
      ))}
      {oreVeins.map((vein, index) => (
        <OrganicDetailStroke
          key={`gold-shell-ore-vein-${index}`}
          position={vein.position}
          rotation={vein.rotation}
          scale={vein.scale}
          color={vein.color}
          opacity={vein.opacity}
          depthTest
        />
      ))}
      {nuggets.map((nugget, index) => (
        <CodedAssetOutlineMesh
          key={`gold-shell-nugget-${index}`}
          position={nugget.position}
          rotation-z={nugget.rotation}
          scale={nugget.scale}
          outlineWidth={0.0038}
          outlineColor={GOLD_SHELL_INK}
          geometry={<sphereGeometry args={[1, 8, 5]} />}
          material={metal(nugget.color, nugget.roughness)}
        />
      ))}
      {shards.map((shard, index) => (
        <GoldRawShard key={`gold-shell-raw-shard-${index}`} {...shard} />
      ))}
      {coinStuds.map((coin, index) => (
        <GoldEmbeddedCoin key={`gold-shell-coin-stud-${index}`} {...coin} />
      ))}
      {jewels.map((jewel, index) => (
        <GoldShellJewel key={`gold-shell-jewel-${index}`} {...jewel} />
      ))}
      {jewelSparkles.map((sparkle, index) => (
        <GoldJewelSparkleBurst key={`gold-shell-jewel-sparkle-${index}`} {...sparkle} />
      ))}
      {scratches.map((scratch, index) => (
        <OrganicDetailStroke
          key={`gold-shell-scratch-${index}`}
          position={scratch.position}
          rotation={scratch.rotation}
          scale={scratch.scale}
          color={scratch.color}
          opacity={scratch.opacity}
          depthTest
        />
      ))}
      {goldGrit.map((grit, index) => (
        <OrganicDetailDot
          key={`gold-shell-grit-${index}`}
          position={grit.position}
          scale={grit.scale}
          color={grit.color}
          opacity={grit.opacity}
          depthTest
        />
      ))}
      {glints.map((glint, index) => (
        <GoldTreasureGlint key={`gold-shell-glint-${index}`} {...glint} />
      ))}
    </group>
  )
}

function getAmethystEmbeddedSurfacePosition(position: [number, number, number], inset = 0.03): [number, number, number] {
  const [x, y, z] = position
  const shellX = x * 0.9
  const shellY = y * 0.72
  const shellZ = z * 0.84
  const length = Math.hypot(shellX, shellY, shellZ) || 1

  return [
    x - (shellX / length) * inset,
    y - (shellY / length) * inset,
    z - (shellZ / length) * inset,
  ]
}

function AmethystGeodeGlint({
  position,
  scale = 1,
  opacity = 0.72,
  color = AMETHYST_GLINT,
  rotation = 0,
}: {
  position: [number, number, number]
  scale?: number
  opacity?: number
  color?: string
  rotation?: number
}) {
  const glintRef = useRef<THREE.Group>(null)
  const embeddedPosition = getAmethystEmbeddedSurfacePosition(position, -0.105 - Math.min(0.04, scale * 0.014))
  const shimmerPhase = position[0] * 11.7 + position[1] * 17.3 + position[2] * 23.1 + scale * 5.9
  const glintOpacity = Math.min(1, opacity * 1.5)

  useFrame(({ clock }) => {
    if (!glintRef.current) return

    const shimmer = Math.max(0, Math.sin(clock.elapsedTime * 2.8 + shimmerPhase))
    const pulse = 0.92 + shimmer * 0.2
    glintRef.current.scale.setScalar(pulse)
    glintRef.current.rotation.z = rotation + Math.sin(clock.elapsedTime * 1.6 + shimmerPhase) * 0.055
  })

  return (
    <group ref={glintRef} position={embeddedPosition} rotation-z={rotation}>
      <OrganicDetailStroke
        position={[0, 0, 0]}
        rotation={0}
        scale={[0.014 * scale, 0.255 * scale, 0.0042]}
        color={color}
        opacity={glintOpacity}
        depthTest
        solid
        renderOrder={18}
      />
      <OrganicDetailStroke
        position={[0, 0, 0]}
        rotation={Math.PI / 2}
        scale={[0.013 * scale, 0.212 * scale, 0.0042]}
        color={color}
        opacity={glintOpacity * 0.84}
        depthTest
        solid
        renderOrder={18}
      />
      <OrganicDetailStroke
        position={[0, 0, -0.002]}
        rotation={Math.PI / 4}
        scale={[0.0088 * scale, 0.146 * scale, 0.0035]}
        color={AMETHYST_LAVENDER}
        opacity={glintOpacity * 0.68}
        depthTest
        renderOrder={18}
      />
      <OrganicDetailStroke
        position={[0, 0, -0.003]}
        rotation={-Math.PI / 4}
        scale={[0.008 * scale, 0.122 * scale, 0.0035]}
        color={AMETHYST_CLOUD_MILK}
        opacity={glintOpacity * 0.48}
        depthTest
        renderOrder={18}
      />
      <OrganicDetailDot
        position={[0, 0, -0.004]}
        scale={[0.026 * scale, 0.026 * scale, 0.0042]}
        color={AMETHYST_GLINT}
        opacity={glintOpacity}
        depthTest
        solid
        renderOrder={19}
      />
    </group>
  )
}

function AmethystDancingFacetFlash({
  position,
  rotation = 0,
  scale,
  color = AMETHYST_GLINT,
  opacity = 0.72,
  phase = 0,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color?: string
  opacity?: number
  phase?: number
}) {
  const flashRef = useRef<THREE.Group>(null)
  const embeddedPosition = getAmethystEmbeddedSurfacePosition(position, -0.095)

  useFrame(({ clock }) => {
    if (!flashRef.current) return

    const shimmer = Math.max(0, Math.sin(clock.elapsedTime * 2.4 + phase))
    flashRef.current.scale.setScalar(0.92 + shimmer * 0.16)
    flashRef.current.rotation.z = rotation + Math.sin(clock.elapsedTime * 1.35 + phase) * 0.045
  })

  return (
    <group ref={flashRef} position={embeddedPosition} rotation-z={rotation}>
      <mesh scale={scale} renderOrder={20}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[scale[0] * 0.1, scale[1] * 0.05, -scale[2] * 0.35]} scale={[scale[0] * 0.46, scale[1] * 0.32, scale[2] * 1.1]} renderOrder={21}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={Math.min(0.9, opacity * 0.7)} depthTest depthWrite={false} />
      </mesh>
      <OrganicDetailStroke
        position={[0, 0, -scale[2] * 0.62]}
        rotation={Math.PI / 2}
        scale={[scale[0] * 0.055, scale[1] * 1.2, scale[2] * 0.24]}
        color="#ffffff"
        opacity={Math.min(0.95, opacity * 0.82)}
        depthTest
        renderOrder={22}
      />
    </group>
  )
}

function AmethystSparkleBurst({
  position,
  scale = 1,
  color = AMETHYST_GLINT,
  rotation = 0,
}: {
  position: [number, number, number]
  scale?: number
  color?: string
  rotation?: number
}) {
  return (
    <group>
      <AmethystGeodeGlint position={position} scale={scale} opacity={0.98} color={color} rotation={rotation} />
      <AmethystGeodeGlint
        position={[position[0] - 0.038 * scale, position[1] + 0.028 * scale, position[2] - 0.004]}
        scale={scale * 0.44}
        opacity={0.72}
        color={AMETHYST_CLOUD_MILK}
        rotation={rotation - 0.36}
      />
      <AmethystGeodeGlint
        position={[position[0] + 0.034 * scale, position[1] - 0.026 * scale, position[2] - 0.006]}
        scale={scale * 0.36}
        opacity={0.64}
        color={AMETHYST_LAVENDER}
        rotation={rotation + 0.46}
      />
    </group>
  )
}

function AmethystFacetPlate({
  position,
  rotation = 0,
  rotationX = 0,
  rotationY = 0,
  scale,
  color = AMETHYST_PURPLE_LIGHT,
  opacity = 0.32,
  inset = 0.032,
}: {
  position: [number, number, number]
  rotation?: number
  rotationX?: number
  rotationY?: number
  scale: [number, number, number]
  color?: string
  opacity?: number
  inset?: number
}) {
  const embeddedPosition = getAmethystEmbeddedSurfacePosition(position, inset)
  const facetDepth = Math.max(0.026, Math.min(0.048, scale[2] * 0.032))

  return (
    <group position={embeddedPosition} rotation-x={rotationX} rotation-y={rotationY} rotation-z={rotation}>
      <mesh position={[0, 0, facetDepth * 0.08]} rotation-z={rotation * -0.12} scale={[scale[0] * 1.02, scale[1] * 0.96, facetDepth * 1.18]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={AMETHYST_SMOKY_EDGE} transparent opacity={opacity * 0.34} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, -facetDepth * 0.08]} rotation-z={rotation * 0.08 + 0.18} scale={[scale[0] * 0.78, scale[1] * 0.76, facetDepth]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.92} depthTest depthWrite={false} />
      </mesh>
    </group>
  )
}

function AmethystCrystalShard({
  position,
  rotation = 0,
  scale,
  color = AMETHYST_PURPLE_MID,
  opacity = 0.78,
  tilt = [0, 0],
  rise = 0.008,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color?: string
  opacity?: number
  tilt?: [number, number]
  rise?: number
}) {
  const socketScale: [number, number, number] = [scale[0] * 2.44, scale[1] * 1.96, scale[2] * 0.58]
  const embeddedInset = Math.max(0.066, scale[2] * 3.75, rise * 4.4)
  const embeddedPosition = getAmethystEmbeddedSurfacePosition(position, embeddedInset)

  return (
    <group position={embeddedPosition} rotation-x={tilt[0]} rotation-y={tilt[1]} rotation-z={rotation}>
      <mesh position={[0, 0, scale[2] * 0.03]} rotation-z={rotation * -0.18} scale={socketScale}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={AMETHYST_SMOKY_EDGE} transparent opacity={0.58} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[scale[0] * 0.06, -scale[1] * 0.02, -scale[2] * 0.02]} rotation-z={rotation * 0.12} scale={[scale[0] * 1.72, scale[1] * 1.42, scale[2] * 0.34]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={AMETHYST_INTERNAL_DEEP} transparent opacity={0.54} depthTest depthWrite={false} />
      </mesh>
      <CodedAssetOutlineMesh
        position={[0, 0, -scale[2] * 0.08]}
        scale={[scale[0] * 0.68, scale[1] * 0.72, scale[2] * 0.9]}
        outlineWidth={0.0038}
        outlineColor={AMETHYST_INK}
        geometry={<octahedronGeometry args={[1, 0]} />}
        material={
          <meshPhysicalMaterial
            color={color}
            roughness={0.12}
            metalness={0}
            transparent
            opacity={opacity}
            transmission={0.12}
            thickness={0.42}
            ior={1.55}
            clearcoat={1}
            clearcoatRoughness={0.08}
            depthTest
            depthWrite={false}
          />
        }
      />
      <mesh position={[-scale[0] * 0.14, scale[1] * 0.18, -scale[2] * 0.28]} rotation-z={-0.2} scale={[scale[0] * 0.28, scale[1] * 0.1, scale[2] * 0.1]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={AMETHYST_LAVENDER} transparent opacity={0.46} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[scale[0] * 0.14, scale[1] * 0.02, -scale[2] * 0.24]} rotation-z={0.48} scale={[scale[0] * 0.14, scale[1] * 0.28, scale[2] * 0.1]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={AMETHYST_GLINT} transparent opacity={0.28} depthTest depthWrite={false} />
      </mesh>
    </group>
  )
}

function AmethystEmbeddedCrystalCrust({
  position,
  rotation,
  scale,
  color,
  opacity,
}: {
  position: [number, number, number]
  rotation: number
  scale: [number, number, number]
  color: string
  opacity: number
}) {
  const embeddedPosition = getAmethystEmbeddedSurfacePosition(position, Math.max(0.05, scale[2] * 3.4))

  return (
    <group position={embeddedPosition} rotation-z={rotation}>
      <mesh position={[0, 0, scale[2] * 0.03]} rotation-z={rotation * -0.12} scale={[scale[0] * 2.05, scale[1] * 1.78, scale[2] * 0.54]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={AMETHYST_SMOKY_EDGE} transparent opacity={0.56} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[0, -scale[1] * 0.03, -scale[2] * 0.01]} rotation-z={rotation * 0.08} scale={[scale[0] * 1.46, scale[1] * 1.24, scale[2] * 0.28]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={AMETHYST_INTERNAL_DEEP} transparent opacity={0.46} depthTest depthWrite={false} />
      </mesh>
      <CodedAssetOutlineMesh
        position={[0, 0, -scale[2] * 0.04]}
        scale={[scale[0] * 0.62, scale[1] * 0.64, scale[2] * 0.64]}
        outlineWidth={0.003}
        outlineColor={AMETHYST_INK}
        geometry={<icosahedronGeometry args={[1, 0]} />}
        material={
          <meshPhysicalMaterial
            color={color}
            roughness={0.11}
            metalness={0}
            transparent
            opacity={opacity}
            transmission={0.08}
            thickness={0.28}
            ior={1.55}
            clearcoat={1}
            clearcoatRoughness={0.08}
            depthTest
            depthWrite={false}
          />
        }
      />
    </group>
  )
}

function AmethystStoneRidge({
  position,
  rotation = 0,
  scale,
  color = AMETHYST_STONE_MID,
  opacity = 0.48,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color?: string
  opacity?: number
}) {
  return (
    <mesh position={position} rotation-z={rotation} scale={scale}>
      <sphereGeometry args={[1, 9, 4]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthTest depthWrite={false} />
    </mesh>
  )
}

function AmethystSurfaceRoughPatch({
  position,
  rotation = 0,
  scale,
  color = AMETHYST_PURPLE_DARK,
  opacity = 0.44,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color?: string
  opacity?: number
}) {
  return (
    <group position={position} rotation-z={rotation}>
      <mesh position={[0, 0, -0.001]} scale={[scale[0] * 1.1, scale[1] * 1.02, scale[2] * 0.8]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={AMETHYST_SMOKY_EDGE} transparent opacity={opacity * 0.46} depthTest depthWrite />
      </mesh>
      <mesh position={[0, 0, -0.004]} rotation-z={rotation * -0.18} scale={[scale[0] * 0.76, scale[1] * 0.72, scale[2] * 0.58]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthTest depthWrite />
      </mesh>
    </group>
  )
}

function AmethystEmbeddedStoneRidge({
  position,
  rotation = 0,
  rotationX = 0,
  rotationY = 0,
  scale,
  color = AMETHYST_STONE_MID,
  opacity = 0.48,
  inset = 0.026,
}: {
  position: [number, number, number]
  rotation?: number
  rotationX?: number
  rotationY?: number
  scale: [number, number, number]
  color?: string
  opacity?: number
  inset?: number
}) {
  const embeddedPosition = getAmethystEmbeddedSurfacePosition(position, inset)

  return (
    <group position={embeddedPosition} rotation-x={rotationX} rotation-y={rotationY} rotation-z={rotation}>
      <mesh position={[0, 0, 0.002]} scale={[scale[0] * 1.1, scale[1] * 1.08, scale[2] * 0.7]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={AMETHYST_SMOKY_EDGE} transparent opacity={opacity * 0.36} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, -0.006]} scale={[scale[0] * 0.86, scale[1] * 0.86, scale[2] * 0.54]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthTest depthWrite={false} />
      </mesh>
    </group>
  )
}

function AmethystCloudedCrystalVolume({
  position,
  rotation = 0,
  rotationX = 0,
  rotationY = 0,
  scale,
  color = AMETHYST_PURPLE_LIGHT,
  opacity = 0.34,
  inset = 0.08,
  skew = 0,
}: {
  position: [number, number, number]
  rotation?: number
  rotationX?: number
  rotationY?: number
  scale: [number, number, number]
  color?: string
  opacity?: number
  inset?: number
  skew?: number
}) {
  const embeddedPosition = getAmethystEmbeddedSurfacePosition(position, inset)

  return (
    <group position={embeddedPosition} rotation-x={rotationX} rotation-y={rotationY} rotation-z={rotation}>
      <mesh position={[0, 0, scale[2] * 0.1]} rotation-z={skew} scale={[scale[0] * 1, scale[1] * 0.92, scale[2] * 1.9]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={AMETHYST_SMOKY_EDGE} transparent opacity={opacity * 0.3} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[scale[0] * 0.04, -scale[1] * 0.015, -scale[2] * 0.1]} rotation-z={-skew * 0.7} scale={[scale[0] * 0.86, scale[1] * 0.78, scale[2] * 1.62]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[-scale[0] * 0.12, scale[1] * 0.05, -scale[2] * 0.22]} rotation-z={skew + 0.34} scale={[scale[0] * 0.34, scale[1] * 0.48, scale[2] * 0.98]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={AMETHYST_CLOUD_MILK} transparent opacity={opacity * 0.42} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[scale[0] * 0.12, -scale[1] * 0.06, -scale[2] * 0.28]} rotation-z={skew - 0.42} scale={[scale[0] * 0.32, scale[1] * 0.5, scale[2] * 0.94]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={AMETHYST_INTERNAL_DEEP} transparent opacity={opacity * 0.46} depthTest depthWrite={false} />
      </mesh>
    </group>
  )
}

function AmethystGeodeShellTexture() {
  const outerStone: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.5, 0.26, -0.53], rotation: -0.42, scale: [0.18, 0.076, 0.024], color: AMETHYST_SMOKY_EDGE, opacity: 0.34 },
    { position: [0.51, 0.22, -0.52], rotation: 0.45, scale: [0.17, 0.072, 0.024], color: AMETHYST_QUARTZ_SHADOW, opacity: 0.32 },
    { position: [-0.55, -0.22, -0.46], rotation: 0.2, scale: [0.13, 0.065, 0.022], color: AMETHYST_INTERNAL_DEEP, opacity: 0.28 },
    { position: [0.54, -0.26, -0.46], rotation: -0.22, scale: [0.14, 0.068, 0.022], color: AMETHYST_SMOKY_CLEAR, opacity: 0.3 },
    { position: [0.0, -0.56, -0.46], rotation: -0.03, scale: [0.3, 0.066, 0.024], color: AMETHYST_SMOKY_EDGE, opacity: 0.26 },
    { position: [-0.34, 0.48, -0.38], rotation: -0.18, scale: [0.2, 0.06, 0.02], color: AMETHYST_QUARTZ_FROST, opacity: 0.28 },
    { position: [0.3, 0.46, -0.36], rotation: 0.22, scale: [0.2, 0.06, 0.02], color: AMETHYST_LAVENDER, opacity: 0.28 },
    { position: [-0.44, 0.25, 0.28], rotation: -0.34, scale: [0.15, 0.048, 0.016], color: AMETHYST_QUARTZ_SHADOW, opacity: 0.24 },
    { position: [0.48, 0.18, 0.3], rotation: 0.38, scale: [0.16, 0.05, 0.016], color: AMETHYST_SMOKY_CLEAR, opacity: 0.24 },
    { position: [0.04, 0.42, 0.58], rotation: 0.08, scale: [0.18, 0.05, 0.016], color: AMETHYST_QUARTZ_FROST, opacity: 0.23 },
    { position: [-0.56, -0.08, 0.16], rotation: 0.22, scale: [0.12, 0.04, 0.014], color: AMETHYST_INTERNAL_DEEP, opacity: 0.2 },
    { position: [0.58, -0.12, 0.18], rotation: -0.25, scale: [0.12, 0.04, 0.014], color: AMETHYST_LAVENDER, opacity: 0.22 },
  ]
  const rindBands: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [0.0, -0.61, -0.49], rotation: -0.02, scale: [0.36, 0.052, 0.026], color: AMETHYST_BASE_OPAQUE, opacity: 0.86 },
    { position: [-0.28, -0.54, -0.54], rotation: 0.2, scale: [0.18, 0.042, 0.02], color: AMETHYST_BASE_STONE, opacity: 0.76 },
    { position: [0.3, -0.53, -0.54], rotation: -0.22, scale: [0.18, 0.042, 0.02], color: AMETHYST_INTERNAL_DEEP, opacity: 0.68 },
    { position: [-0.58, -0.28, -0.43], rotation: -0.42, scale: [0.11, 0.05, 0.02], color: AMETHYST_BASE_STONE, opacity: 0.62 },
    { position: [0.58, -0.3, -0.42], rotation: 0.42, scale: [0.12, 0.052, 0.02], color: AMETHYST_BASE_FADE, opacity: 0.52 },
    { position: [-0.65, 0.06, -0.34], rotation: -0.62, scale: [0.12, 0.036, 0.014], color: AMETHYST_SMOKY_CLEAR, opacity: 0.28 },
    { position: [0.66, 0.02, -0.34], rotation: 0.64, scale: [0.13, 0.038, 0.014], color: AMETHYST_QUARTZ_SHADOW, opacity: 0.28 },
    { position: [-0.2, -0.48, 0.36], rotation: 0.24, scale: [0.14, 0.034, 0.012], color: AMETHYST_BASE_STONE, opacity: 0.48 },
    { position: [0.24, -0.46, 0.4], rotation: -0.26, scale: [0.15, 0.036, 0.012], color: AMETHYST_BASE_FADE, opacity: 0.38 },
  ]
  const internalPurpleRibbons: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [0.0, -0.46, -0.59], rotation: -0.04, scale: [0.5, 0.072, 0.022], color: AMETHYST_INTERNAL_DEEP, opacity: 0.46 },
    { position: [-0.22, -0.3, -0.655], rotation: 0.2, scale: [0.32, 0.076, 0.02], color: AMETHYST_PURPLE_DARK, opacity: 0.42 },
    { position: [0.25, -0.22, -0.665], rotation: -0.25, scale: [0.32, 0.074, 0.02], color: AMETHYST_INTERNAL_VIOLET, opacity: 0.4 },
    { position: [-0.12, -0.04, -0.715], rotation: -0.42, scale: [0.4, 0.09, 0.018], color: AMETHYST_PURPLE_MID, opacity: 0.38 },
    { position: [0.18, 0.1, -0.722], rotation: 0.34, scale: [0.38, 0.088, 0.018], color: AMETHYST_PURPLE_LIGHT, opacity: 0.34 },
    { position: [-0.4, 0.1, -0.63], rotation: -0.6, scale: [0.26, 0.07, 0.018], color: AMETHYST_PURPLE_DARK, opacity: 0.34 },
    { position: [0.4, 0.08, -0.63], rotation: 0.58, scale: [0.26, 0.07, 0.018], color: AMETHYST_LAVENDER, opacity: 0.28 },
    { position: [0.0, 0.32, -0.694], rotation: 0.02, scale: [0.46, 0.08, 0.018], color: AMETHYST_INTERNAL_VIOLET, opacity: 0.34 },
    { position: [-0.14, 0.5, -0.64], rotation: -0.16, scale: [0.38, 0.07, 0.018], color: AMETHYST_PURPLE_DARK, opacity: 0.3 },
    { position: [0.18, 0.48, -0.62], rotation: 0.22, scale: [0.34, 0.068, 0.018], color: AMETHYST_PURPLE_MID, opacity: 0.3 },
    { position: [-0.22, 0.26, 0.48], rotation: -0.2, scale: [0.28, 0.062, 0.014], color: AMETHYST_INTERNAL_VIOLET, opacity: 0.24 },
    { position: [0.22, 0.22, 0.5], rotation: 0.22, scale: [0.28, 0.062, 0.014], color: AMETHYST_PURPLE_MID, opacity: 0.24 },
  ]
  const cloudyInclusions: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.32, 0.48, -0.69], rotation: -0.36, scale: [0.23, 0.082, 0.018], color: AMETHYST_CLOUD_MILK, opacity: 0.38 },
    { position: [-0.08, 0.54, -0.74], rotation: 0.12, scale: [0.28, 0.09, 0.018], color: AMETHYST_CLOUD_SOFT, opacity: 0.34 },
    { position: [0.2, 0.48, -0.72], rotation: 0.32, scale: [0.24, 0.082, 0.018], color: AMETHYST_CLOUD_MILK, opacity: 0.36 },
    { position: [0.42, 0.28, -0.66], rotation: 0.56, scale: [0.18, 0.074, 0.016], color: AMETHYST_CLOUD_VEIL, opacity: 0.32 },
    { position: [-0.48, 0.22, -0.65], rotation: -0.58, scale: [0.18, 0.074, 0.016], color: AMETHYST_CLOUD_SOFT, opacity: 0.32 },
    { position: [-0.28, 0.14, -0.74], rotation: -0.22, scale: [0.22, 0.086, 0.018], color: AMETHYST_CLOUD_MILK, opacity: 0.32 },
    { position: [0.02, 0.14, -0.78], rotation: 0.05, scale: [0.26, 0.1, 0.018], color: AMETHYST_CLOUD_DEEP, opacity: 0.3 },
    { position: [0.3, 0.12, -0.72], rotation: 0.24, scale: [0.2, 0.08, 0.016], color: AMETHYST_CLOUD_MILK, opacity: 0.3 },
    { position: [-0.34, -0.08, -0.69], rotation: 0.32, scale: [0.18, 0.072, 0.016], color: AMETHYST_CLOUD_VEIL, opacity: 0.3 },
    { position: [-0.06, -0.08, -0.76], rotation: -0.12, scale: [0.26, 0.086, 0.018], color: AMETHYST_CLOUD_MILK, opacity: 0.28 },
    { position: [0.28, -0.08, -0.7], rotation: -0.26, scale: [0.18, 0.072, 0.016], color: AMETHYST_CLOUD_SOFT, opacity: 0.28 },
    { position: [-0.22, -0.28, -0.64], rotation: 0.24, scale: [0.24, 0.068, 0.014], color: AMETHYST_CLOUD_DEEP, opacity: 0.28 },
    { position: [0.22, -0.28, -0.64], rotation: -0.2, scale: [0.24, 0.068, 0.014], color: AMETHYST_CLOUD_VEIL, opacity: 0.26 },
    { position: [-0.5, 0.42, -0.4], rotation: -0.5, scale: [0.16, 0.064, 0.016], color: AMETHYST_CLOUD_MILK, opacity: 0.3 },
    { position: [0.52, 0.38, -0.38], rotation: 0.52, scale: [0.16, 0.064, 0.016], color: AMETHYST_CLOUD_SOFT, opacity: 0.28 },
    { position: [-0.58, 0.04, -0.28], rotation: -0.62, scale: [0.15, 0.052, 0.014], color: AMETHYST_CLOUD_VEIL, opacity: 0.24 },
    { position: [0.6, 0.0, -0.28], rotation: 0.64, scale: [0.15, 0.052, 0.014], color: AMETHYST_CLOUD_MILK, opacity: 0.24 },
    { position: [-0.4, 0.55, 0.05], rotation: -0.38, scale: [0.17, 0.058, 0.014], color: AMETHYST_CLOUD_SOFT, opacity: 0.24 },
    { position: [-0.12, 0.66, 0.12], rotation: -0.08, scale: [0.22, 0.068, 0.016], color: AMETHYST_CLOUD_MILK, opacity: 0.25 },
    { position: [0.2, 0.62, 0.1], rotation: 0.18, scale: [0.2, 0.066, 0.016], color: AMETHYST_CLOUD_VEIL, opacity: 0.24 },
    { position: [0.46, 0.48, 0.05], rotation: 0.38, scale: [0.16, 0.056, 0.014], color: AMETHYST_CLOUD_MILK, opacity: 0.22 },
    { position: [-0.32, 0.22, 0.44], rotation: -0.28, scale: [0.17, 0.054, 0.014], color: AMETHYST_CLOUD_VEIL, opacity: 0.2 },
    { position: [0.0, 0.32, 0.58], rotation: 0.02, scale: [0.2, 0.064, 0.014], color: AMETHYST_CLOUD_MILK, opacity: 0.22 },
    { position: [0.32, 0.18, 0.44], rotation: 0.26, scale: [0.16, 0.054, 0.014], color: AMETHYST_CLOUD_SOFT, opacity: 0.2 },
    { position: [-0.34, -0.26, 0.18], rotation: 0.2, scale: [0.18, 0.052, 0.012], color: AMETHYST_CLOUD_DEEP, opacity: 0.22 },
    { position: [0.35, -0.28, 0.16], rotation: -0.18, scale: [0.18, 0.052, 0.012], color: AMETHYST_CLOUD_VEIL, opacity: 0.2 },
  ]
  const cloudyWisps: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.36, 0.5, -0.735], rotation: -0.82, scale: [0.005, 0.13, 0.0028], color: AMETHYST_CLOUD_MILK, opacity: 0.48 },
    { position: [-0.15, 0.55, -0.768], rotation: 0.72, scale: [0.0045, 0.12, 0.0026], color: AMETHYST_CLOUD_VEIL, opacity: 0.42 },
    { position: [0.12, 0.52, -0.768], rotation: -0.68, scale: [0.0045, 0.12, 0.0026], color: AMETHYST_CLOUD_MILK, opacity: 0.44 },
    { position: [0.34, 0.44, -0.72], rotation: 0.78, scale: [0.0048, 0.11, 0.0026], color: AMETHYST_CLOUD_SOFT, opacity: 0.42 },
    { position: [-0.5, 0.24, -0.68], rotation: -0.48, scale: [0.004, 0.1, 0.0024], color: AMETHYST_CLOUD_MILK, opacity: 0.38 },
    { position: [-0.24, 0.18, -0.764], rotation: 0.58, scale: [0.004, 0.09, 0.0024], color: AMETHYST_CLOUD_VEIL, opacity: 0.38 },
    { position: [0.04, 0.18, -0.79], rotation: -0.54, scale: [0.004, 0.1, 0.0024], color: AMETHYST_CLOUD_MILK, opacity: 0.4 },
    { position: [0.34, 0.14, -0.72], rotation: 0.52, scale: [0.004, 0.09, 0.0024], color: AMETHYST_CLOUD_SOFT, opacity: 0.36 },
    { position: [-0.36, -0.06, -0.7], rotation: 0.4, scale: [0.004, 0.082, 0.0024], color: AMETHYST_CLOUD_VEIL, opacity: 0.34 },
    { position: [-0.06, -0.08, -0.78], rotation: -0.48, scale: [0.004, 0.09, 0.0024], color: AMETHYST_CLOUD_MILK, opacity: 0.34 },
    { position: [0.28, -0.08, -0.71], rotation: 0.46, scale: [0.004, 0.082, 0.0024], color: AMETHYST_CLOUD_SOFT, opacity: 0.32 },
    { position: [-0.52, 0.38, -0.36], rotation: -0.58, scale: [0.004, 0.085, 0.0023], color: AMETHYST_CLOUD_MILK, opacity: 0.32 },
    { position: [0.52, 0.34, -0.34], rotation: 0.58, scale: [0.004, 0.085, 0.0023], color: AMETHYST_CLOUD_VEIL, opacity: 0.32 },
    { position: [-0.24, 0.58, 0.14], rotation: -0.52, scale: [0.0038, 0.08, 0.0022], color: AMETHYST_CLOUD_MILK, opacity: 0.28 },
    { position: [0.1, 0.6, 0.16], rotation: 0.48, scale: [0.0038, 0.08, 0.0022], color: AMETHYST_CLOUD_SOFT, opacity: 0.28 },
    { position: [0.38, 0.42, 0.18], rotation: 0.56, scale: [0.0038, 0.074, 0.0022], color: AMETHYST_CLOUD_MILK, opacity: 0.26 },
    { position: [-0.24, 0.2, 0.5], rotation: -0.42, scale: [0.0035, 0.07, 0.002], color: AMETHYST_CLOUD_VEIL, opacity: 0.24 },
    { position: [0.22, 0.2, 0.52], rotation: 0.42, scale: [0.0035, 0.07, 0.002], color: AMETHYST_CLOUD_MILK, opacity: 0.24 },
  ]
  const cloudySpecks: Array<{
    position: [number, number, number]
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.42, 0.46, -0.72], scale: [0.006, 0.005, 0.0025], color: AMETHYST_CLOUD_MILK, opacity: 0.45 },
    { position: [-0.3, 0.56, -0.75], scale: [0.005, 0.004, 0.0024], color: AMETHYST_CLOUD_VEIL, opacity: 0.38 },
    { position: [-0.12, 0.48, -0.79], scale: [0.006, 0.0048, 0.0025], color: AMETHYST_CLOUD_MILK, opacity: 0.44 },
    { position: [0.08, 0.6, -0.76], scale: [0.005, 0.004, 0.0024], color: AMETHYST_CLOUD_SOFT, opacity: 0.36 },
    { position: [0.26, 0.48, -0.74], scale: [0.006, 0.0048, 0.0025], color: AMETHYST_CLOUD_MILK, opacity: 0.42 },
    { position: [0.44, 0.34, -0.68], scale: [0.005, 0.004, 0.0024], color: AMETHYST_CLOUD_VEIL, opacity: 0.36 },
    { position: [-0.5, 0.12, -0.66], scale: [0.005, 0.004, 0.0024], color: AMETHYST_CLOUD_MILK, opacity: 0.36 },
    { position: [-0.24, 0.1, -0.78], scale: [0.005, 0.004, 0.0024], color: AMETHYST_CLOUD_SOFT, opacity: 0.34 },
    { position: [0.0, 0.08, -0.8], scale: [0.006, 0.0046, 0.0024], color: AMETHYST_CLOUD_MILK, opacity: 0.4 },
    { position: [0.26, 0.08, -0.76], scale: [0.005, 0.004, 0.0024], color: AMETHYST_CLOUD_VEIL, opacity: 0.34 },
    { position: [0.52, 0.08, -0.62], scale: [0.005, 0.004, 0.0024], color: AMETHYST_CLOUD_MILK, opacity: 0.34 },
    { position: [-0.28, -0.18, -0.68], scale: [0.005, 0.004, 0.0023], color: AMETHYST_CLOUD_MILK, opacity: 0.32 },
    { position: [0.08, -0.2, -0.76], scale: [0.005, 0.004, 0.0023], color: AMETHYST_CLOUD_VEIL, opacity: 0.32 },
    { position: [0.34, -0.16, -0.64], scale: [0.005, 0.004, 0.0023], color: AMETHYST_CLOUD_SOFT, opacity: 0.3 },
    { position: [-0.34, 0.52, 0.04], scale: [0.0048, 0.0038, 0.0022], color: AMETHYST_CLOUD_MILK, opacity: 0.3 },
    { position: [-0.06, 0.64, 0.16], scale: [0.0048, 0.0038, 0.0022], color: AMETHYST_CLOUD_VEIL, opacity: 0.3 },
    { position: [0.22, 0.56, 0.14], scale: [0.0048, 0.0038, 0.0022], color: AMETHYST_CLOUD_MILK, opacity: 0.3 },
    { position: [0.42, 0.38, 0.06], scale: [0.0045, 0.0036, 0.002], color: AMETHYST_CLOUD_SOFT, opacity: 0.28 },
    { position: [-0.18, 0.24, 0.54], scale: [0.0045, 0.0036, 0.002], color: AMETHYST_CLOUD_MILK, opacity: 0.26 },
    { position: [0.16, 0.24, 0.54], scale: [0.0045, 0.0036, 0.002], color: AMETHYST_CLOUD_VEIL, opacity: 0.26 },
  ]
  const cloudyFrontVeils: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.16, 0.4, -0.805], rotation: -0.1, scale: [0.46, 0.16, 0.014], color: AMETHYST_CLOUD_MILK, opacity: 0.3 },
    { position: [0.18, 0.34, -0.798], rotation: 0.22, scale: [0.42, 0.15, 0.014], color: AMETHYST_CLOUD_VEIL, opacity: 0.28 },
    { position: [-0.34, 0.12, -0.77], rotation: -0.4, scale: [0.3, 0.13, 0.012], color: AMETHYST_CLOUD_MILK, opacity: 0.26 },
    { position: [0.34, 0.1, -0.766], rotation: 0.42, scale: [0.3, 0.13, 0.012], color: AMETHYST_CLOUD_SOFT, opacity: 0.25 },
    { position: [0.0, -0.08, -0.792], rotation: -0.04, scale: [0.42, 0.14, 0.012], color: AMETHYST_CLOUD_MILK, opacity: 0.24 },
    { position: [0.02, 0.28, -0.83], rotation: 0.08, scale: [0.58, 0.22, 0.018], color: AMETHYST_CLOUD_VEIL, opacity: 0.42 },
    { position: [-0.22, 0.52, -0.81], rotation: -0.26, scale: [0.38, 0.14, 0.016], color: AMETHYST_PURPLE_LIGHT, opacity: 0.34 },
    { position: [0.26, 0.46, -0.79], rotation: 0.34, scale: [0.34, 0.13, 0.016], color: AMETHYST_CLOUD_MILK, opacity: 0.32 },
    { position: [-0.42, -0.04, -0.7], rotation: -0.48, scale: [0.24, 0.13, 0.014], color: AMETHYST_INTERNAL_VIOLET, opacity: 0.32 },
    { position: [0.44, -0.02, -0.69], rotation: 0.48, scale: [0.24, 0.13, 0.014], color: AMETHYST_CLOUD_MILK, opacity: 0.3 },
    { position: [0.0, -0.24, -0.76], rotation: -0.02, scale: [0.42, 0.12, 0.014], color: AMETHYST_CLOUD_MILK, opacity: 0.36 },
    { position: [-0.5, 0.34, -0.54], rotation: -0.56, scale: [0.22, 0.1, 0.012], color: AMETHYST_CLOUD_VEIL, opacity: 0.22 },
    { position: [0.52, 0.3, -0.52], rotation: 0.56, scale: [0.22, 0.1, 0.012], color: AMETHYST_CLOUD_MILK, opacity: 0.22 },
    { position: [-0.12, 0.52, 0.08], rotation: -0.12, scale: [0.34, 0.11, 0.012], color: AMETHYST_CLOUD_MILK, opacity: 0.2 },
    { position: [0.2, 0.48, 0.12], rotation: 0.22, scale: [0.3, 0.1, 0.012], color: AMETHYST_CLOUD_VEIL, opacity: 0.19 },
    { position: [0.0, 0.24, 0.52], rotation: 0.02, scale: [0.28, 0.09, 0.01], color: AMETHYST_CLOUD_MILK, opacity: 0.18 },
    { position: [0.0, 0.48, 0.46], rotation: 0.02, scale: [0.5, 0.14, 0.014], color: AMETHYST_PURPLE_LIGHT, opacity: 0.3 },
    { position: [-0.38, 0.3, 0.34], rotation: -0.34, scale: [0.24, 0.1, 0.012], color: AMETHYST_CLOUD_MILK, opacity: 0.24 },
    { position: [0.38, 0.26, 0.34], rotation: 0.34, scale: [0.24, 0.1, 0.012], color: AMETHYST_CLOUD_MILK, opacity: 0.28 },
  ]
  const groundOpacityGradient: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [0.0, -0.67, -0.48], rotation: -0.02, scale: [0.54, 0.096, 0.042], color: AMETHYST_BASE_OPAQUE, opacity: 0.98 },
    { position: [-0.34, -0.61, -0.54], rotation: 0.2, scale: [0.29, 0.078, 0.034], color: AMETHYST_BASE_OPAQUE, opacity: 0.96 },
    { position: [0.36, -0.61, -0.52], rotation: -0.22, scale: [0.29, 0.078, 0.034], color: AMETHYST_BASE_STONE, opacity: 0.9 },
    { position: [-0.57, -0.46, -0.4], rotation: -0.42, scale: [0.21, 0.082, 0.03], color: AMETHYST_BASE_STONE, opacity: 0.86 },
    { position: [0.58, -0.46, -0.38], rotation: 0.42, scale: [0.21, 0.084, 0.03], color: AMETHYST_BASE_STONE, opacity: 0.82 },
    { position: [0.0, -0.52, -0.62], rotation: 0.03, scale: [0.43, 0.08, 0.034], color: AMETHYST_BASE_STONE, opacity: 0.84 },
    { position: [-0.25, -0.43, -0.66], rotation: 0.22, scale: [0.26, 0.074, 0.028], color: AMETHYST_BASE_FADE, opacity: 0.68 },
    { position: [0.28, -0.42, -0.66], rotation: -0.24, scale: [0.26, 0.074, 0.028], color: AMETHYST_BASE_FADE, opacity: 0.64 },
    { position: [-0.42, -0.27, -0.58], rotation: -0.38, scale: [0.19, 0.066, 0.024], color: AMETHYST_SMOKY_EDGE, opacity: 0.56 },
    { position: [0.43, -0.27, -0.58], rotation: 0.38, scale: [0.19, 0.066, 0.024], color: AMETHYST_SMOKY_CLEAR, opacity: 0.48 },
    { position: [0.0, -0.27, -0.72], rotation: -0.02, scale: [0.32, 0.06, 0.022], color: AMETHYST_SMOKY_CLEAR, opacity: 0.4 },
    { position: [-0.42, -0.04, -0.62], rotation: -0.28, scale: [0.16, 0.05, 0.018], color: AMETHYST_PURPLE_DARK, opacity: 0.3 },
    { position: [0.42, -0.06, -0.62], rotation: 0.28, scale: [0.16, 0.05, 0.018], color: AMETHYST_PURPLE_DARK, opacity: 0.28 },
    { position: [-0.18, 0.16, -0.68], rotation: -0.14, scale: [0.2, 0.04, 0.014], color: AMETHYST_PURPLE_MID, opacity: 0.18 },
    { position: [0.22, 0.14, -0.66], rotation: 0.16, scale: [0.18, 0.038, 0.014], color: AMETHYST_PURPLE_LIGHT, opacity: 0.16 },
    { position: [-0.2, -0.52, 0.34], rotation: 0.18, scale: [0.22, 0.066, 0.024], color: AMETHYST_BASE_STONE, opacity: 0.76 },
    { position: [0.22, -0.51, 0.36], rotation: -0.2, scale: [0.23, 0.068, 0.024], color: AMETHYST_BASE_FADE, opacity: 0.66 },
    { position: [0.0, -0.4, 0.5], rotation: 0.02, scale: [0.29, 0.06, 0.022], color: AMETHYST_SMOKY_EDGE, opacity: 0.5 },
    { position: [-0.28, -0.16, 0.58], rotation: -0.18, scale: [0.18, 0.046, 0.016], color: AMETHYST_PURPLE_DARK, opacity: 0.26 },
    { position: [0.3, -0.18, 0.56], rotation: 0.18, scale: [0.18, 0.046, 0.016], color: AMETHYST_PURPLE_MID, opacity: 0.22 },
  ]
  const quartzTransitionFacets: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.36, -0.16, -0.706], rotation: 0.34, scale: [0.16, 0.14, 1], color: AMETHYST_QUARTZ_FROST, opacity: 0.46 },
    { position: [-0.08, -0.12, -0.736], rotation: -0.2, scale: [0.2, 0.15, 1], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.42 },
    { position: [0.25, -0.12, -0.716], rotation: 0.28, scale: [0.17, 0.13, 1], color: AMETHYST_QUARTZ_FROST, opacity: 0.44 },
    { position: [-0.24, 0.08, -0.744], rotation: -0.5, scale: [0.17, 0.18, 1], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.36 },
    { position: [0.1, 0.12, -0.762], rotation: 0.18, scale: [0.2, 0.18, 1], color: AMETHYST_QUARTZ_FROST, opacity: 0.38 },
    { position: [0.4, 0.06, -0.704], rotation: 0.5, scale: [0.13, 0.16, 1], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.34 },
    { position: [-0.48, 0.18, -0.66], rotation: -0.22, scale: [0.12, 0.17, 1], color: AMETHYST_QUARTZ_SHADOW, opacity: 0.3 },
    { position: [0.48, 0.18, -0.66], rotation: 0.24, scale: [0.12, 0.17, 1], color: AMETHYST_QUARTZ_FROST, opacity: 0.32 },
  ]
  const upperCrystalSheets: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.34, 0.5, -0.66], rotation: -0.36, scale: [0.22, 0.18, 1], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.36 },
    { position: [-0.06, 0.57, -0.704], rotation: 0.16, scale: [0.24, 0.18, 1], color: AMETHYST_LAVENDER, opacity: 0.34 },
    { position: [0.24, 0.5, -0.674], rotation: 0.32, scale: [0.22, 0.17, 1], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.34 },
    { position: [-0.5, 0.34, -0.58], rotation: -0.55, scale: [0.17, 0.18, 1], color: AMETHYST_QUARTZ_FROST, opacity: 0.3 },
    { position: [0.5, 0.3, -0.59], rotation: 0.58, scale: [0.17, 0.18, 1], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.3 },
    { position: [-0.22, 0.24, -0.742], rotation: -0.18, scale: [0.18, 0.13, 1], color: AMETHYST_LAVENDER, opacity: 0.28 },
    { position: [0.2, 0.24, -0.742], rotation: 0.2, scale: [0.18, 0.13, 1], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.28 },
  ]
  const crystalPanes: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.34, 0.42, -0.71], rotation: -0.5, scale: [0.19, 0.17, 1], color: AMETHYST_PURPLE_LIGHT, opacity: 0.48 },
    { position: [-0.08, 0.48, -0.736], rotation: 0.24, scale: [0.24, 0.19, 1], color: AMETHYST_LAVENDER, opacity: 0.4 },
    { position: [0.22, 0.42, -0.722], rotation: -0.22, scale: [0.21, 0.18, 1], color: AMETHYST_PURPLE_MID, opacity: 0.5 },
    { position: [0.46, 0.2, -0.674], rotation: 0.48, scale: [0.15, 0.19, 1], color: AMETHYST_PURPLE_LIGHT, opacity: 0.38 },
    { position: [-0.48, 0.08, -0.676], rotation: 0.24, scale: [0.16, 0.2, 1], color: AMETHYST_PURPLE_DARK, opacity: 0.5 },
    { position: [-0.28, -0.3, -0.656], rotation: -0.18, scale: [0.21, 0.15, 1], color: AMETHYST_PURPLE_MID, opacity: 0.44 },
    { position: [0.28, -0.32, -0.654], rotation: 0.24, scale: [0.2, 0.15, 1], color: AMETHYST_PURPLE_LIGHT, opacity: 0.38 },
    { position: [0.0, 0.08, -0.756], rotation: 0.02, scale: [0.2, 0.22, 1], color: AMETHYST_PURPLE_DEEP, opacity: 0.46 },
  ]
  const crystalCrust: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.34, 0.32, -0.78], rotation: -0.5, scale: [0.072, 0.046, 0.022], color: AMETHYST_LAVENDER, opacity: 0.82 },
    { position: [-0.17, 0.4, -0.792], rotation: 0.18, scale: [0.078, 0.048, 0.024], color: AMETHYST_PURPLE_LIGHT, opacity: 0.84 },
    { position: [0.04, 0.43, -0.796], rotation: -0.04, scale: [0.084, 0.052, 0.024], color: AMETHYST_LAVENDER, opacity: 0.78 },
    { position: [0.25, 0.36, -0.784], rotation: 0.42, scale: [0.07, 0.046, 0.022], color: AMETHYST_PURPLE_LIGHT, opacity: 0.82 },
    { position: [-0.46, 0.12, -0.75], rotation: -0.66, scale: [0.058, 0.05, 0.018], color: AMETHYST_PURPLE_MID, opacity: 0.78 },
    { position: [0.47, 0.1, -0.748], rotation: 0.62, scale: [0.06, 0.05, 0.018], color: AMETHYST_LAVENDER, opacity: 0.76 },
    { position: [-0.28, -0.22, -0.714], rotation: 0.26, scale: [0.05, 0.038, 0.016], color: AMETHYST_PURPLE_LIGHT, opacity: 0.62 },
    { position: [0.28, -0.24, -0.714], rotation: -0.28, scale: [0.05, 0.038, 0.016], color: AMETHYST_PURPLE_MID, opacity: 0.6 },
    { position: [-0.05, 0.55, -0.72], rotation: -0.16, scale: [0.066, 0.04, 0.02], color: AMETHYST_PURPLE_LIGHT, opacity: 0.76 },
    { position: [0.18, 0.55, -0.704], rotation: 0.32, scale: [0.058, 0.036, 0.018], color: AMETHYST_LAVENDER, opacity: 0.72 },
    { position: [-0.28, 0.52, -0.69], rotation: -0.42, scale: [0.054, 0.036, 0.018], color: AMETHYST_PURPLE_MID, opacity: 0.7 },
    { position: [-0.48, 0.56, -0.57], rotation: -0.52, scale: [0.056, 0.04, 0.018], color: AMETHYST_PURPLE_DARK, opacity: 0.74 },
    { position: [-0.38, 0.62, -0.43], rotation: -0.28, scale: [0.066, 0.036, 0.018], color: AMETHYST_PURPLE_MID, opacity: 0.76 },
    { position: [-0.22, 0.65, -0.36], rotation: 0.16, scale: [0.054, 0.032, 0.016], color: AMETHYST_LAVENDER, opacity: 0.7 },
    { position: [0.0, 0.66, -0.32], rotation: -0.05, scale: [0.066, 0.038, 0.018], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.72 },
    { position: [0.23, 0.65, -0.36], rotation: 0.28, scale: [0.056, 0.034, 0.016], color: AMETHYST_PURPLE_LIGHT, opacity: 0.72 },
    { position: [0.4, 0.61, -0.44], rotation: 0.48, scale: [0.064, 0.036, 0.018], color: AMETHYST_PURPLE_DARK, opacity: 0.76 },
    { position: [0.5, 0.54, -0.58], rotation: 0.54, scale: [0.052, 0.038, 0.018], color: AMETHYST_LAVENDER, opacity: 0.72 },
    { position: [-0.52, 0.38, -0.7], rotation: -0.7, scale: [0.048, 0.04, 0.018], color: AMETHYST_PURPLE_LIGHT, opacity: 0.7 },
    { position: [-0.38, 0.38, -0.77], rotation: -0.28, scale: [0.056, 0.038, 0.018], color: AMETHYST_QUARTZ_FROST, opacity: 0.68 },
    { position: [-0.15, 0.36, -0.81], rotation: 0.14, scale: [0.046, 0.034, 0.016], color: AMETHYST_PURPLE_MID, opacity: 0.7 },
    { position: [0.13, 0.36, -0.81], rotation: -0.12, scale: [0.046, 0.034, 0.016], color: AMETHYST_LAVENDER, opacity: 0.68 },
    { position: [0.38, 0.36, -0.77], rotation: 0.32, scale: [0.056, 0.038, 0.018], color: AMETHYST_PURPLE_LIGHT, opacity: 0.7 },
    { position: [0.54, 0.36, -0.68], rotation: 0.68, scale: [0.048, 0.04, 0.018], color: AMETHYST_PURPLE_DARK, opacity: 0.72 },
    { position: [-0.62, 0.18, -0.52], rotation: -0.7, scale: [0.048, 0.04, 0.018], color: AMETHYST_PURPLE_MID, opacity: 0.72 },
    { position: [-0.5, 0.02, -0.67], rotation: -0.38, scale: [0.042, 0.032, 0.016], color: AMETHYST_LAVENDER, opacity: 0.62 },
    { position: [-0.27, 0.05, -0.77], rotation: -0.15, scale: [0.04, 0.03, 0.014], color: AMETHYST_PURPLE_LIGHT, opacity: 0.62 },
    { position: [0.28, 0.04, -0.77], rotation: 0.16, scale: [0.04, 0.03, 0.014], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.6 },
    { position: [0.51, 0.0, -0.66], rotation: 0.4, scale: [0.042, 0.032, 0.016], color: AMETHYST_PURPLE_MID, opacity: 0.64 },
    { position: [0.62, 0.16, -0.52], rotation: 0.72, scale: [0.048, 0.04, 0.018], color: AMETHYST_LAVENDER, opacity: 0.68 },
    { position: [-0.56, -0.22, -0.48], rotation: 0.18, scale: [0.038, 0.03, 0.014], color: AMETHYST_PURPLE_DARK, opacity: 0.6 },
    { position: [-0.28, -0.26, -0.68], rotation: -0.22, scale: [0.038, 0.03, 0.014], color: AMETHYST_PURPLE_MID, opacity: 0.62 },
    { position: [0.0, -0.3, -0.72], rotation: 0.04, scale: [0.044, 0.032, 0.014], color: AMETHYST_LAVENDER, opacity: 0.62 },
    { position: [0.3, -0.28, -0.68], rotation: 0.2, scale: [0.038, 0.03, 0.014], color: AMETHYST_PURPLE_LIGHT, opacity: 0.62 },
    { position: [0.56, -0.24, -0.48], rotation: -0.18, scale: [0.038, 0.03, 0.014], color: AMETHYST_QUARTZ_FROST, opacity: 0.6 },
    { position: [-0.68, 0.44, -0.12], rotation: -0.44, scale: [0.044, 0.036, 0.016], color: AMETHYST_PURPLE_LIGHT, opacity: 0.66 },
    { position: [-0.64, -0.1, -0.1], rotation: 0.18, scale: [0.034, 0.028, 0.014], color: AMETHYST_LAVENDER, opacity: 0.58 },
    { position: [0.68, 0.42, -0.12], rotation: 0.44, scale: [0.044, 0.036, 0.016], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.64 },
    { position: [0.64, -0.12, -0.1], rotation: -0.16, scale: [0.034, 0.028, 0.014], color: AMETHYST_PURPLE_LIGHT, opacity: 0.58 },
    { position: [-0.46, 0.5, 0.24], rotation: -0.38, scale: [0.044, 0.034, 0.016], color: AMETHYST_PURPLE_MID, opacity: 0.62 },
    { position: [-0.2, 0.62, 0.2], rotation: -0.14, scale: [0.046, 0.036, 0.016], color: AMETHYST_LAVENDER, opacity: 0.62 },
    { position: [0.12, 0.62, 0.22], rotation: 0.12, scale: [0.046, 0.036, 0.016], color: AMETHYST_PURPLE_LIGHT, opacity: 0.62 },
    { position: [0.46, 0.48, 0.24], rotation: 0.36, scale: [0.044, 0.034, 0.016], color: AMETHYST_QUARTZ_FROST, opacity: 0.6 },
    { position: [-0.34, 0.2, 0.52], rotation: -0.26, scale: [0.038, 0.03, 0.014], color: AMETHYST_PURPLE_LIGHT, opacity: 0.56 },
    { position: [0.0, 0.32, 0.6], rotation: 0.04, scale: [0.044, 0.034, 0.015], color: AMETHYST_LAVENDER, opacity: 0.58 },
    { position: [0.34, 0.18, 0.52], rotation: 0.28, scale: [0.038, 0.03, 0.014], color: AMETHYST_PURPLE_MID, opacity: 0.56 },
    { position: [-0.66, 0.34, 0.36], rotation: -0.34, scale: [0.058, 0.044, 0.02], color: AMETHYST_QUARTZ_FROST, opacity: 0.7 },
    { position: [-0.52, 0.56, 0.42], rotation: -0.54, scale: [0.064, 0.046, 0.022], color: AMETHYST_PURPLE_MID, opacity: 0.74 },
    { position: [-0.34, 0.6, 0.42], rotation: -0.24, scale: [0.054, 0.032, 0.017], color: AMETHYST_LAVENDER, opacity: 0.68 },
    { position: [-0.1, 0.62, 0.5], rotation: 0.08, scale: [0.06, 0.036, 0.018], color: AMETHYST_PURPLE_LIGHT, opacity: 0.7 },
    { position: [0.16, 0.61, 0.5], rotation: -0.1, scale: [0.058, 0.034, 0.018], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.68 },
    { position: [0.38, 0.58, 0.42], rotation: 0.26, scale: [0.054, 0.032, 0.017], color: AMETHYST_PURPLE_MID, opacity: 0.7 },
    { position: [0.56, 0.52, 0.4], rotation: 0.5, scale: [0.064, 0.046, 0.022], color: AMETHYST_LAVENDER, opacity: 0.72 },
    { position: [0.68, 0.32, 0.34], rotation: 0.36, scale: [0.056, 0.044, 0.02], color: AMETHYST_PURPLE_LIGHT, opacity: 0.7 },
    { position: [-0.64, 0.12, 0.34], rotation: -0.08, scale: [0.046, 0.036, 0.016], color: AMETHYST_PURPLE_LIGHT, opacity: 0.66 },
    { position: [-0.44, 0.08, 0.56], rotation: -0.28, scale: [0.044, 0.036, 0.016], color: AMETHYST_PURPLE_DARK, opacity: 0.64 },
    { position: [-0.18, 0.12, 0.68], rotation: 0.08, scale: [0.048, 0.038, 0.017], color: AMETHYST_LAVENDER, opacity: 0.66 },
    { position: [0.16, 0.1, 0.68], rotation: -0.06, scale: [0.048, 0.038, 0.017], color: AMETHYST_PURPLE_LIGHT, opacity: 0.66 },
    { position: [0.42, 0.06, 0.56], rotation: 0.26, scale: [0.044, 0.036, 0.016], color: AMETHYST_PURPLE_DARK, opacity: 0.64 },
    { position: [0.64, 0.1, 0.34], rotation: 0.08, scale: [0.046, 0.036, 0.016], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.66 },
    { position: [-0.38, -0.2, 0.54], rotation: -0.18, scale: [0.038, 0.032, 0.015], color: AMETHYST_PURPLE_MID, opacity: 0.6 },
    { position: [0.0, -0.22, 0.66], rotation: 0.02, scale: [0.044, 0.034, 0.016], color: AMETHYST_PURPLE_LIGHT, opacity: 0.62 },
    { position: [0.38, -0.22, 0.54], rotation: 0.18, scale: [0.038, 0.032, 0.015], color: AMETHYST_LAVENDER, opacity: 0.6 },
  ]
  const shards: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity?: number
    tilt?: [number, number]
    rise?: number
  }> = [
    { position: [-0.22, 0.58, -0.66], rotation: -0.24, scale: [0.065, 0.105, 0.036], color: AMETHYST_PURPLE_LIGHT, opacity: 0.86, tilt: [-0.2, -0.12], rise: 0.006 },
    { position: [0.03, 0.59, -0.682], rotation: 0.12, scale: [0.066, 0.078, 0.03], color: AMETHYST_LAVENDER, opacity: 0.74, tilt: [-0.44, 0.02], rise: 0.002 },
    { position: [0.31, 0.55, -0.656], rotation: 0.42, scale: [0.058, 0.09, 0.032], color: AMETHYST_PURPLE_MID, opacity: 0.84, tilt: [-0.16, 0.2], rise: 0.006 },
    { position: [-0.43, 0.5, -0.642], rotation: -0.5, scale: [0.052, 0.084, 0.03], color: AMETHYST_PURPLE_DARK, opacity: 0.84, tilt: [-0.14, -0.22], rise: 0.006 },
    { position: [-0.54, 0.15, -0.62], rotation: -0.52, scale: [0.042, 0.06, 0.02], color: AMETHYST_PURPLE_MID, opacity: 0.78, tilt: [0.1, -0.16], rise: 0.006 },
    { position: [0.54, 0.12, -0.622], rotation: 0.5, scale: [0.042, 0.062, 0.02], color: AMETHYST_PURPLE_LIGHT, opacity: 0.74, tilt: [-0.08, 0.16], rise: 0.006 },
    { position: [-0.44, -0.18, -0.6], rotation: 0.28, scale: [0.034, 0.05, 0.016], color: AMETHYST_PURPLE_DARK, opacity: 0.76, tilt: [0.08, -0.12], rise: 0.004 },
    { position: [0.45, -0.22, -0.596], rotation: -0.3, scale: [0.035, 0.052, 0.016], color: AMETHYST_PURPLE_MID, opacity: 0.76, tilt: [-0.08, 0.12], rise: 0.004 },
    { position: [-0.12, 0.42, -0.708], rotation: -0.12, scale: [0.038, 0.058, 0.018], color: AMETHYST_PURPLE_LIGHT, opacity: 0.74, tilt: [-0.12, -0.06], rise: 0.002 },
    { position: [0.16, 0.39, -0.708], rotation: 0.14, scale: [0.036, 0.054, 0.017], color: AMETHYST_LAVENDER, opacity: 0.62, tilt: [-0.12, 0.08], rise: 0.002 },
    { position: [-0.3, 0.24, -0.702], rotation: -0.34, scale: [0.03, 0.044, 0.014], color: AMETHYST_PURPLE_MID, opacity: 0.76, tilt: [0.02, -0.08], rise: 0.001 },
    { position: [0.32, 0.22, -0.698], rotation: 0.38, scale: [0.03, 0.046, 0.014], color: AMETHYST_PURPLE_LIGHT, opacity: 0.72, tilt: [-0.02, 0.08], rise: 0.001 },
    { position: [-0.18, 0.58, 0.18], rotation: -0.26, scale: [0.034, 0.052, 0.017], color: AMETHYST_PURPLE_LIGHT, opacity: 0.66, tilt: [-0.14, 2.46], rise: 0.004 },
    { position: [0.24, 0.55, 0.24], rotation: 0.3, scale: [0.034, 0.05, 0.017], color: AMETHYST_PURPLE_MID, opacity: 0.68, tilt: [-0.14, -2.4], rise: 0.004 },
    { position: [0.0, 0.66, -0.39], rotation: 0.08, scale: [0.066, 0.068, 0.026], color: AMETHYST_PURPLE_LIGHT, opacity: 0.76, tilt: [-0.48, 0.02], rise: 0.001 },
    { position: [-0.27, 0.61, -0.31], rotation: -0.32, scale: [0.052, 0.056, 0.022], color: AMETHYST_PURPLE_MID, opacity: 0.76, tilt: [-0.46, -0.34], rise: 0.001 },
    { position: [0.31, 0.58, -0.29], rotation: 0.36, scale: [0.05, 0.054, 0.022], color: AMETHYST_LAVENDER, opacity: 0.7, tilt: [-0.46, 0.34], rise: 0.001 },
    { position: [0.0, 0.52, -0.72], rotation: 0.06, scale: [0.052, 0.086, 0.028], color: AMETHYST_PURPLE_LIGHT, opacity: 0.82, tilt: [-0.16, 0.02], rise: 0.002 },
    { position: [-0.26, 0.45, -0.704], rotation: -0.34, scale: [0.04, 0.066, 0.022], color: AMETHYST_LAVENDER, opacity: 0.74, tilt: [-0.1, -0.1], rise: 0.002 },
    { position: [0.26, 0.44, -0.704], rotation: 0.36, scale: [0.04, 0.064, 0.022], color: AMETHYST_PURPLE_LIGHT, opacity: 0.78, tilt: [-0.1, 0.1], rise: 0.002 },
    { position: [-0.08, 0.64, -0.54], rotation: -0.12, scale: [0.064, 0.07, 0.026], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.8, tilt: [-0.5, -0.04], rise: 0.001 },
    { position: [0.14, 0.62, -0.52], rotation: 0.28, scale: [0.054, 0.062, 0.024], color: AMETHYST_QUARTZ_FROST, opacity: 0.76, tilt: [-0.48, 0.18], rise: 0.001 },
    { position: [-0.3, 0.58, -0.52], rotation: -0.34, scale: [0.05, 0.056, 0.023], color: AMETHYST_LAVENDER, opacity: 0.74, tilt: [-0.42, -0.24], rise: 0.001 },
    { position: [-0.5, 0.58, -0.5], rotation: -0.44, scale: [0.042, 0.05, 0.021], color: AMETHYST_PURPLE_DARK, opacity: 0.76, tilt: [-0.42, -0.38], rise: 0.001 },
    { position: [0.48, 0.55, -0.52], rotation: 0.5, scale: [0.04, 0.05, 0.021], color: AMETHYST_LAVENDER, opacity: 0.72, tilt: [-0.42, 0.42], rise: 0.001 },
    { position: [-0.48, 0.5, -0.68], rotation: -0.66, scale: [0.034, 0.064, 0.022], color: AMETHYST_PURPLE_LIGHT, opacity: 0.78, tilt: [-0.18, -0.2], rise: 0.004 },
    { position: [-0.34, 0.56, -0.73], rotation: -0.24, scale: [0.032, 0.058, 0.02], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.76, tilt: [-0.2, -0.12], rise: 0.004 },
    { position: [-0.16, 0.58, -0.765], rotation: 0.1, scale: [0.034, 0.062, 0.02], color: AMETHYST_PURPLE_MID, opacity: 0.8, tilt: [-0.18, -0.04], rise: 0.003 },
    { position: [0.1, 0.57, -0.766], rotation: -0.12, scale: [0.034, 0.062, 0.02], color: AMETHYST_PURPLE_LIGHT, opacity: 0.78, tilt: [-0.18, 0.06], rise: 0.003 },
    { position: [0.32, 0.54, -0.728], rotation: 0.28, scale: [0.034, 0.06, 0.02], color: AMETHYST_LAVENDER, opacity: 0.74, tilt: [-0.18, 0.14], rise: 0.003 },
    { position: [0.5, 0.46, -0.68], rotation: 0.62, scale: [0.036, 0.066, 0.022], color: AMETHYST_PURPLE_DARK, opacity: 0.8, tilt: [-0.12, 0.24], rise: 0.004 },
    { position: [-0.58, 0.34, -0.62], rotation: -0.72, scale: [0.036, 0.066, 0.022], color: AMETHYST_PURPLE_MID, opacity: 0.82, tilt: [-0.02, -0.3], rise: 0.004 },
    { position: [-0.44, 0.22, -0.72], rotation: -0.38, scale: [0.03, 0.054, 0.018], color: AMETHYST_LAVENDER, opacity: 0.72, tilt: [0.02, -0.1], rise: 0.002 },
    { position: [-0.2, 0.26, -0.78], rotation: -0.1, scale: [0.026, 0.05, 0.016], color: AMETHYST_PURPLE_LIGHT, opacity: 0.72, tilt: [0.02, -0.04], rise: 0.001 },
    { position: [0.2, 0.25, -0.78], rotation: 0.14, scale: [0.026, 0.05, 0.016], color: AMETHYST_QUARTZ_FROST, opacity: 0.7, tilt: [0.02, 0.04], rise: 0.001 },
    { position: [0.44, 0.2, -0.72], rotation: 0.4, scale: [0.03, 0.054, 0.018], color: AMETHYST_PURPLE_MID, opacity: 0.74, tilt: [0.02, 0.1], rise: 0.002 },
    { position: [0.58, 0.3, -0.62], rotation: 0.72, scale: [0.036, 0.066, 0.022], color: AMETHYST_PURPLE_LIGHT, opacity: 0.78, tilt: [-0.02, 0.3], rise: 0.004 },
    { position: [-0.64, 0.08, -0.52], rotation: -0.72, scale: [0.034, 0.062, 0.02], color: AMETHYST_PURPLE_DARK, opacity: 0.78, tilt: [0.1, -0.36], rise: 0.004 },
    { position: [-0.56, -0.08, -0.62], rotation: -0.42, scale: [0.026, 0.048, 0.016], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.7, tilt: [0.14, -0.16], rise: 0.002 },
    { position: [-0.32, -0.12, -0.72], rotation: -0.2, scale: [0.026, 0.046, 0.016], color: AMETHYST_PURPLE_MID, opacity: 0.72, tilt: [0.12, -0.06], rise: 0.001 },
    { position: [0.0, -0.16, -0.76], rotation: 0.04, scale: [0.03, 0.052, 0.017], color: AMETHYST_LAVENDER, opacity: 0.72, tilt: [0.14, 0.02], rise: 0.001 },
    { position: [0.32, -0.14, -0.72], rotation: 0.22, scale: [0.026, 0.046, 0.016], color: AMETHYST_PURPLE_LIGHT, opacity: 0.7, tilt: [0.12, 0.06], rise: 0.001 },
    { position: [0.56, -0.1, -0.62], rotation: 0.46, scale: [0.026, 0.048, 0.016], color: AMETHYST_PURPLE_DARK, opacity: 0.72, tilt: [0.14, 0.16], rise: 0.002 },
    { position: [0.66, 0.06, -0.5], rotation: 0.72, scale: [0.034, 0.062, 0.02], color: AMETHYST_QUARTZ_FROST, opacity: 0.72, tilt: [0.1, 0.36], rise: 0.004 },
    { position: [-0.48, 0.52, 0.22], rotation: -0.38, scale: [0.034, 0.064, 0.022], color: AMETHYST_QUARTZ_FROST, opacity: 0.68, tilt: [-0.18, 2.2], rise: 0.005 },
    { position: [-0.28, 0.58, 0.08], rotation: -0.2, scale: [0.04, 0.044, 0.02], color: AMETHYST_PURPLE_MID, opacity: 0.7, tilt: [-0.52, 2.62], rise: 0.001 },
    { position: [-0.04, 0.62, 0.14], rotation: 0.08, scale: [0.044, 0.048, 0.021], color: AMETHYST_LAVENDER, opacity: 0.68, tilt: [-0.54, 3.12], rise: 0.001 },
    { position: [0.22, 0.59, 0.13], rotation: 0.28, scale: [0.042, 0.044, 0.02], color: AMETHYST_PURPLE_LIGHT, opacity: 0.68, tilt: [-0.52, -2.72], rise: 0.001 },
    { position: [0.48, 0.5, 0.24], rotation: 0.4, scale: [0.034, 0.064, 0.022], color: AMETHYST_PURPLE_DARK, opacity: 0.7, tilt: [-0.16, -2.2], rise: 0.005 },
    { position: [-0.46, 0.18, 0.48], rotation: -0.32, scale: [0.028, 0.054, 0.018], color: AMETHYST_PURPLE_LIGHT, opacity: 0.66, tilt: [0.0, 2.32], rise: 0.004 },
    { position: [-0.2, 0.34, 0.58], rotation: -0.1, scale: [0.034, 0.064, 0.022], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.66, tilt: [-0.12, 2.88], rise: 0.005 },
    { position: [0.12, 0.36, 0.6], rotation: 0.16, scale: [0.034, 0.064, 0.022], color: AMETHYST_LAVENDER, opacity: 0.68, tilt: [-0.12, -2.9], rise: 0.005 },
    { position: [0.42, 0.18, 0.5], rotation: 0.3, scale: [0.028, 0.054, 0.018], color: AMETHYST_PURPLE_MID, opacity: 0.68, tilt: [0.0, -2.36], rise: 0.004 },
    { position: [-0.34, -0.1, 0.44], rotation: -0.2, scale: [0.026, 0.048, 0.016], color: AMETHYST_QUARTZ_FROST, opacity: 0.62, tilt: [0.12, 2.52], rise: 0.003 },
    { position: [0.34, -0.12, 0.46], rotation: 0.22, scale: [0.026, 0.048, 0.016], color: AMETHYST_PURPLE_LIGHT, opacity: 0.64, tilt: [0.12, -2.52], rise: 0.003 },
    { position: [-0.54, -0.34, -0.26], rotation: 0.26, scale: [0.026, 0.048, 0.016], color: AMETHYST_PURPLE_DARK, opacity: 0.66, tilt: [0.2, -0.4], rise: 0.003 },
    { position: [-0.26, -0.42, -0.42], rotation: -0.12, scale: [0.028, 0.052, 0.017], color: AMETHYST_PURPLE_MID, opacity: 0.68, tilt: [0.22, -0.1], rise: 0.002 },
    { position: [0.03, -0.48, -0.44], rotation: 0.06, scale: [0.032, 0.058, 0.019], color: AMETHYST_LAVENDER, opacity: 0.68, tilt: [0.24, 0.02], rise: 0.002 },
    { position: [0.3, -0.42, -0.42], rotation: 0.16, scale: [0.028, 0.052, 0.017], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.66, tilt: [0.22, 0.1], rise: 0.002 },
    { position: [0.56, -0.34, -0.24], rotation: -0.24, scale: [0.026, 0.048, 0.016], color: AMETHYST_PURPLE_MID, opacity: 0.68, tilt: [0.2, 0.4], rise: 0.003 },
    { position: [-0.48, -0.42, 0.16], rotation: 0.1, scale: [0.026, 0.046, 0.016], color: AMETHYST_PURPLE_LIGHT, opacity: 0.62, tilt: [0.22, 2.06], rise: 0.003 },
    { position: [-0.14, -0.5, 0.22], rotation: -0.04, scale: [0.026, 0.048, 0.016], color: AMETHYST_LAVENDER, opacity: 0.62, tilt: [0.24, 3.02], rise: 0.003 },
    { position: [0.2, -0.48, 0.2], rotation: 0.08, scale: [0.026, 0.048, 0.016], color: AMETHYST_QUARTZ_FROST, opacity: 0.62, tilt: [0.24, -2.9], rise: 0.003 },
    { position: [0.5, -0.4, 0.14], rotation: -0.1, scale: [0.026, 0.046, 0.016], color: AMETHYST_PURPLE_DARK, opacity: 0.64, tilt: [0.22, -2.06], rise: 0.003 },
    { position: [-0.42, 0.64, 0.36], rotation: -0.24, scale: [0.044, 0.046, 0.022], color: AMETHYST_QUARTZ_FROST, opacity: 0.7, tilt: [-0.52, -2.02], rise: 0.001 },
    { position: [-0.16, 0.62, 0.4], rotation: 0.08, scale: [0.046, 0.042, 0.02], color: AMETHYST_PURPLE_LIGHT, opacity: 0.68, tilt: [-0.58, -2.62], rise: 0.001 },
    { position: [0.12, 0.62, 0.4], rotation: -0.04, scale: [0.048, 0.044, 0.02], color: AMETHYST_LAVENDER, opacity: 0.68, tilt: [-0.58, 3.1], rise: 0.001 },
    { position: [0.38, 0.62, 0.36], rotation: 0.18, scale: [0.046, 0.048, 0.022], color: AMETHYST_PURPLE_MID, opacity: 0.7, tilt: [-0.5, 2.44], rise: 0.001 },
    { position: [-0.58, 0.22, 0.48], rotation: -0.34, scale: [0.034, 0.066, 0.022], color: AMETHYST_PURPLE_LIGHT, opacity: 0.7, tilt: [-0.02, -2.1], rise: 0.004 },
    { position: [-0.3, 0.28, 0.66], rotation: -0.14, scale: [0.036, 0.07, 0.024], color: AMETHYST_LAVENDER, opacity: 0.68, tilt: [-0.04, -2.68], rise: 0.005 },
    { position: [0.02, 0.28, 0.72], rotation: 0.02, scale: [0.038, 0.076, 0.025], color: AMETHYST_PURPLE_MID, opacity: 0.7, tilt: [-0.04, 3.1], rise: 0.005 },
    { position: [0.34, 0.24, 0.64], rotation: 0.16, scale: [0.036, 0.07, 0.024], color: AMETHYST_QUARTZ_FROST, opacity: 0.68, tilt: [-0.02, 2.62], rise: 0.005 },
    { position: [0.6, 0.2, 0.46], rotation: 0.36, scale: [0.034, 0.066, 0.022], color: AMETHYST_PURPLE_LIGHT, opacity: 0.7, tilt: [-0.02, 2.04], rise: 0.004 },
    { position: [-0.68, -0.08, 0.22], rotation: 0.2, scale: [0.028, 0.054, 0.018], color: AMETHYST_PURPLE_MID, opacity: 0.66, tilt: [0.12, -1.12], rise: 0.003 },
    { position: [-0.28, -0.12, 0.58], rotation: -0.12, scale: [0.03, 0.058, 0.019], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.64, tilt: [0.12, -2.66], rise: 0.003 },
    { position: [0.28, -0.14, 0.58], rotation: 0.12, scale: [0.03, 0.058, 0.019], color: AMETHYST_PURPLE_LIGHT, opacity: 0.64, tilt: [0.12, 2.66], rise: 0.003 },
    { position: [0.68, -0.1, 0.22], rotation: -0.2, scale: [0.028, 0.054, 0.018], color: AMETHYST_LAVENDER, opacity: 0.66, tilt: [0.12, 1.12], rise: 0.003 },
  ]
  const veins: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.28, 0.42, -0.716], rotation: -0.64, scale: [0.0045, 0.11, 0.003], color: AMETHYST_LAVENDER, opacity: 0.5 },
    { position: [0.12, 0.45, -0.728], rotation: 0.58, scale: [0.004, 0.1, 0.003], color: AMETHYST_GLINT, opacity: 0.42 },
    { position: [-0.48, 0.08, -0.69], rotation: 0.36, scale: [0.004, 0.08, 0.0028], color: AMETHYST_PURPLE_DEEP, opacity: 0.36 },
    { position: [0.48, 0.08, -0.688], rotation: -0.42, scale: [0.004, 0.08, 0.0028], color: AMETHYST_PURPLE_DEEP, opacity: 0.34 },
    { position: [-0.26, -0.34, -0.648], rotation: -0.2, scale: [0.004, 0.07, 0.0028], color: AMETHYST_LAVENDER, opacity: 0.36 },
    { position: [0.28, -0.36, -0.646], rotation: 0.26, scale: [0.004, 0.07, 0.0028], color: AMETHYST_LAVENDER, opacity: 0.34 },
    { position: [-0.36, 0.25, 0.52], rotation: -0.38, scale: [0.0035, 0.068, 0.0025], color: AMETHYST_SMOKY_CLEAR, opacity: 0.18 },
    { position: [0.36, 0.18, 0.52], rotation: 0.44, scale: [0.0035, 0.064, 0.0025], color: AMETHYST_QUARTZ_FROST, opacity: 0.18 },
    { position: [-0.42, -0.36, -0.58], rotation: 0.42, scale: [0.004, 0.09, 0.0028], color: AMETHYST_INTERNAL_VIOLET, opacity: 0.28 },
    { position: [0.42, -0.38, -0.58], rotation: -0.44, scale: [0.004, 0.086, 0.0028], color: AMETHYST_SMOKY_CLEAR, opacity: 0.26 },
    { position: [-0.08, -0.24, -0.72], rotation: -0.66, scale: [0.0035, 0.085, 0.0025], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.44 },
    { position: [0.18, -0.18, -0.716], rotation: 0.58, scale: [0.0035, 0.078, 0.0025], color: AMETHYST_QUARTZ_FROST, opacity: 0.4 },
  ]
  const grit: Array<{
    position: [number, number, number]
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.5, 0.34, -0.64], scale: [0.005, 0.004, 0.0025], color: AMETHYST_LAVENDER, opacity: 0.44 },
    { position: [-0.3, 0.5, -0.69], scale: [0.0045, 0.004, 0.0025], color: AMETHYST_GLINT, opacity: 0.42 },
    { position: [-0.08, 0.56, -0.705], scale: [0.0048, 0.004, 0.0025], color: AMETHYST_LAVENDER, opacity: 0.42 },
    { position: [0.18, 0.5, -0.698], scale: [0.0045, 0.004, 0.0025], color: AMETHYST_GLINT, opacity: 0.4 },
    { position: [0.44, 0.32, -0.64], scale: [0.005, 0.004, 0.0025], color: AMETHYST_LAVENDER, opacity: 0.4 },
    { position: [-0.56, -0.04, -0.62], scale: [0.004, 0.0035, 0.0023], color: AMETHYST_SMOKY_CLEAR, opacity: 0.28 },
    { position: [0.56, -0.08, -0.61], scale: [0.004, 0.0035, 0.0023], color: AMETHYST_LAVENDER, opacity: 0.32 },
    { position: [-0.2, -0.42, -0.56], scale: [0.004, 0.0035, 0.0023], color: AMETHYST_SMOKY_CLEAR, opacity: 0.26 },
    { position: [0.22, -0.44, -0.56], scale: [0.004, 0.0035, 0.0023], color: AMETHYST_GLINT, opacity: 0.3 },
    { position: [-0.28, 0.32, 0.5], scale: [0.004, 0.0035, 0.0023], color: AMETHYST_QUARTZ_FROST, opacity: 0.22 },
    { position: [0.32, 0.24, 0.5], scale: [0.004, 0.0035, 0.0023], color: AMETHYST_LAVENDER, opacity: 0.24 },
    { position: [-0.36, -0.3, -0.66], scale: [0.005, 0.004, 0.0024], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.38 },
    { position: [-0.16, -0.22, -0.72], scale: [0.0045, 0.0038, 0.0024], color: AMETHYST_QUARTZ_FROST, opacity: 0.36 },
    { position: [0.08, -0.2, -0.73], scale: [0.0045, 0.0038, 0.0024], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.34 },
    { position: [0.34, -0.28, -0.66], scale: [0.005, 0.004, 0.0024], color: AMETHYST_QUARTZ_FROST, opacity: 0.36 },
    { position: [-0.5, -0.38, -0.5], scale: [0.004, 0.0035, 0.0023], color: AMETHYST_LAVENDER, opacity: 0.28 },
    { position: [0.5, -0.4, -0.5], scale: [0.004, 0.0035, 0.0023], color: AMETHYST_SMOKY_CLEAR, opacity: 0.26 },
  ]
  const glints: Array<{ position: [number, number, number]; scale: number; opacity: number; color?: string; rotation?: number }> = [
    { position: [-0.1, 0.58, -0.622], scale: 1.16, opacity: 0.94 },
    { position: [0.15, 0.52, -0.618], scale: 1.02, opacity: 0.88, color: AMETHYST_LAVENDER },
    { position: [-0.34, 0.38, -0.69], scale: 0.92, opacity: 0.86 },
    { position: [0.32, 0.34, -0.69], scale: 0.88, opacity: 0.82 },
    { position: [-0.54, 0.16, -0.646], scale: 0.42, opacity: 0.5, color: AMETHYST_PURPLE_LIGHT },
    { position: [0.54, 0.13, -0.646], scale: 0.42, opacity: 0.5 },
    { position: [-0.28, -0.28, -0.67], scale: 0.38, opacity: 0.44, color: AMETHYST_LAVENDER },
    { position: [0.28, -0.3, -0.668], scale: 0.38, opacity: 0.44 },
    { position: [-0.42, 0.68, -0.31], scale: 0.72, opacity: 0.78, color: AMETHYST_LAVENDER },
    { position: [0.0, 0.78, -0.16], scale: 0.84, opacity: 0.84 },
    { position: [0.42, 0.66, -0.32], scale: 0.72, opacity: 0.78, color: AMETHYST_LAVENDER },
    { position: [-0.5, 0.42, -0.68], scale: 0.34, opacity: 0.46, color: AMETHYST_PURPLE_LIGHT },
    { position: [0.5, 0.39, -0.68], scale: 0.34, opacity: 0.46 },
    { position: [-0.64, 0.12, -0.52], scale: 0.3, opacity: 0.38, color: AMETHYST_LAVENDER },
    { position: [0.64, 0.1, -0.52], scale: 0.3, opacity: 0.38, color: AMETHYST_PURPLE_LIGHT },
    { position: [-0.28, -0.38, -0.45], scale: 0.28, opacity: 0.34, color: AMETHYST_LAVENDER },
    { position: [0.3, -0.38, -0.45], scale: 0.28, opacity: 0.34 },
    { position: [-0.24, 0.54, 0.18], scale: 0.32, opacity: 0.34, color: AMETHYST_PURPLE_LIGHT },
    { position: [0.24, 0.54, 0.2], scale: 0.32, opacity: 0.34, color: AMETHYST_LAVENDER },
    { position: [0.0, 0.34, 0.58], scale: 0.3, opacity: 0.32, color: AMETHYST_QUARTZ_CLEAR },
    { position: [-0.58, 0.62, 0.32], scale: 0.36, opacity: 0.44, color: AMETHYST_PURPLE_LIGHT },
    { position: [0.58, 0.6, 0.34], scale: 0.36, opacity: 0.44, color: AMETHYST_LAVENDER },
    { position: [-0.18, 0.78, 0.54], scale: 0.42, opacity: 0.48, color: AMETHYST_QUARTZ_CLEAR },
    { position: [0.1, 0.8, 0.56], scale: 0.44, opacity: 0.5, color: AMETHYST_LAVENDER },
    { position: [-0.44, 0.56, -0.58], scale: 0.56, opacity: 0.72, color: AMETHYST_CLOUD_MILK, rotation: -0.18 },
    { position: [0.38, 0.58, -0.56], scale: 0.5, opacity: 0.66, color: AMETHYST_GLINT, rotation: 0.28 },
    { position: [-0.24, 0.3, -0.73], scale: 0.42, opacity: 0.58, color: AMETHYST_CLOUD_MILK, rotation: 0.36 },
    { position: [0.22, 0.24, -0.74], scale: 0.46, opacity: 0.62, color: AMETHYST_GLINT, rotation: -0.32 },
    { position: [-0.56, -0.04, -0.62], scale: 0.34, opacity: 0.46, color: AMETHYST_LAVENDER, rotation: -0.54 },
    { position: [0.56, -0.06, -0.61], scale: 0.34, opacity: 0.48, color: AMETHYST_CLOUD_MILK, rotation: 0.52 },
    { position: [-0.4, -0.22, -0.56], scale: 0.28, opacity: 0.4, color: AMETHYST_QUARTZ_CLEAR, rotation: 0.2 },
    { position: [0.42, -0.24, -0.54], scale: 0.28, opacity: 0.4, color: AMETHYST_LAVENDER, rotation: -0.2 },
    { position: [-0.36, 0.7, -0.16], scale: 0.48, opacity: 0.6, color: AMETHYST_CLOUD_MILK, rotation: -0.42 },
    { position: [0.34, 0.72, -0.14], scale: 0.5, opacity: 0.62, color: AMETHYST_GLINT, rotation: 0.38 },
    { position: [-0.56, 0.44, -0.28], scale: 0.36, opacity: 0.48, color: AMETHYST_PURPLE_LIGHT, rotation: -0.22 },
    { position: [0.56, 0.42, -0.26], scale: 0.36, opacity: 0.5, color: AMETHYST_CLOUD_MILK, rotation: 0.24 },
    { position: [-0.42, 0.74, 0.16], scale: 0.4, opacity: 0.52, color: AMETHYST_GLINT, rotation: -0.36 },
    { position: [0.44, 0.72, 0.18], scale: 0.38, opacity: 0.5, color: AMETHYST_LAVENDER, rotation: 0.4 },
    { position: [-0.26, 0.52, 0.5], scale: 0.34, opacity: 0.42, color: AMETHYST_CLOUD_MILK, rotation: -0.16 },
    { position: [0.3, 0.48, 0.5], scale: 0.34, opacity: 0.44, color: AMETHYST_QUARTZ_CLEAR, rotation: 0.18 },
    { position: [-0.06, 0.68, 0.44], scale: 0.46, opacity: 0.56, color: AMETHYST_GLINT, rotation: 0.08 },
    { position: [-0.5, 0.18, 0.2], scale: 0.28, opacity: 0.34, color: AMETHYST_LAVENDER, rotation: -0.5 },
    { position: [0.54, 0.14, 0.2], scale: 0.28, opacity: 0.36, color: AMETHYST_CLOUD_MILK, rotation: 0.48 },
    { position: [-0.22, -0.18, 0.38], scale: 0.24, opacity: 0.32, color: AMETHYST_QUARTZ_CLEAR, rotation: 0.22 },
    { position: [0.24, -0.2, 0.36], scale: 0.24, opacity: 0.32, color: AMETHYST_LAVENDER, rotation: -0.24 },
  ]
  const wraparoundCrystalSheets: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.58, 0.42, -0.55], rotation: -0.62, scale: [0.2, 0.2, 1], color: AMETHYST_PURPLE_LIGHT, opacity: 0.4 },
    { position: [0.58, 0.38, -0.54], rotation: 0.58, scale: [0.2, 0.2, 1], color: AMETHYST_LAVENDER, opacity: 0.38 },
    { position: [-0.66, 0.1, -0.48], rotation: -0.76, scale: [0.18, 0.22, 1], color: AMETHYST_CLOUD_VEIL, opacity: 0.36 },
    { position: [0.66, 0.06, -0.48], rotation: 0.72, scale: [0.18, 0.22, 1], color: AMETHYST_PURPLE_MID, opacity: 0.36 },
    { position: [-0.52, -0.38, -0.38], rotation: 0.5, scale: [0.2, 0.16, 1], color: AMETHYST_QUARTZ_SHADOW, opacity: 0.32 },
    { position: [0.54, -0.4, -0.36], rotation: -0.48, scale: [0.2, 0.16, 1], color: AMETHYST_SMOKY_CLEAR, opacity: 0.32 },
    { position: [-0.7, 0.36, -0.16], rotation: -0.38, scale: [0.16, 0.18, 1], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.3 },
    { position: [0.7, 0.32, -0.14], rotation: 0.42, scale: [0.16, 0.18, 1], color: AMETHYST_PURPLE_LIGHT, opacity: 0.32 },
    { position: [-0.68, -0.12, 0.04], rotation: 0.24, scale: [0.15, 0.2, 1], color: AMETHYST_PURPLE_DARK, opacity: 0.34 },
    { position: [0.68, -0.14, 0.06], rotation: -0.26, scale: [0.15, 0.2, 1], color: AMETHYST_LAVENDER, opacity: 0.3 },
    { position: [-0.5, 0.54, 0.22], rotation: -0.48, scale: [0.2, 0.18, 1], color: AMETHYST_CLOUD_MILK, opacity: 0.32 },
    { position: [0.52, 0.52, 0.24], rotation: 0.52, scale: [0.2, 0.18, 1], color: AMETHYST_CLOUD_VEIL, opacity: 0.34 },
    { position: [-0.3, 0.64, 0.48], rotation: -0.22, scale: [0.22, 0.17, 1], color: AMETHYST_PURPLE_MID, opacity: 0.34 },
    { position: [0.28, 0.62, 0.5], rotation: 0.2, scale: [0.22, 0.17, 1], color: AMETHYST_LAVENDER, opacity: 0.32 },
    { position: [-0.08, 0.42, 0.7], rotation: -0.04, scale: [0.3, 0.2, 1], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.28 },
    { position: [0.2, 0.12, 0.72], rotation: 0.28, scale: [0.22, 0.22, 1], color: AMETHYST_PURPLE_LIGHT, opacity: 0.34 },
    { position: [-0.28, 0.02, 0.66], rotation: -0.32, scale: [0.2, 0.2, 1], color: AMETHYST_PURPLE_DARK, opacity: 0.36 },
    { position: [-0.12, -0.36, 0.44], rotation: 0.12, scale: [0.25, 0.14, 1], color: AMETHYST_SMOKY_CLEAR, opacity: 0.3 },
    { position: [0.28, -0.34, 0.36], rotation: -0.2, scale: [0.2, 0.14, 1], color: AMETHYST_CLOUD_MILK, opacity: 0.28 },
  ]
  const wraparoundCloudDepth: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.62, 0.5, -0.44], rotation: -0.32, scale: [0.22, 0.072, 0.018], color: AMETHYST_CLOUD_SOFT, opacity: 0.34 },
    { position: [0.62, 0.46, -0.42], rotation: 0.36, scale: [0.22, 0.072, 0.018], color: AMETHYST_CLOUD_MILK, opacity: 0.32 },
    { position: [-0.7, 0.18, -0.26], rotation: -0.68, scale: [0.18, 0.062, 0.016], color: AMETHYST_PURPLE_LIGHT, opacity: 0.3 },
    { position: [0.7, 0.12, -0.26], rotation: 0.66, scale: [0.18, 0.062, 0.016], color: AMETHYST_CLOUD_VEIL, opacity: 0.3 },
    { position: [-0.6, -0.28, -0.18], rotation: 0.42, scale: [0.2, 0.058, 0.016], color: AMETHYST_INTERNAL_VIOLET, opacity: 0.28 },
    { position: [0.62, -0.3, -0.16], rotation: -0.44, scale: [0.2, 0.058, 0.016], color: AMETHYST_CLOUD_SOFT, opacity: 0.28 },
    { position: [-0.58, 0.6, 0.14], rotation: -0.26, scale: [0.24, 0.068, 0.018], color: AMETHYST_CLOUD_MILK, opacity: 0.28 },
    { position: [0.58, 0.58, 0.18], rotation: 0.28, scale: [0.24, 0.068, 0.018], color: AMETHYST_PURPLE_LIGHT, opacity: 0.28 },
    { position: [-0.36, 0.7, 0.38], rotation: -0.18, scale: [0.28, 0.076, 0.018], color: AMETHYST_CLOUD_VEIL, opacity: 0.3 },
    { position: [0.32, 0.68, 0.42], rotation: 0.2, scale: [0.28, 0.076, 0.018], color: AMETHYST_CLOUD_MILK, opacity: 0.3 },
    { position: [0.02, 0.52, 0.66], rotation: 0.02, scale: [0.34, 0.086, 0.02], color: AMETHYST_PURPLE_MID, opacity: 0.3 },
    { position: [-0.3, 0.16, 0.7], rotation: -0.36, scale: [0.24, 0.07, 0.018], color: AMETHYST_CLOUD_MILK, opacity: 0.28 },
    { position: [0.34, 0.08, 0.68], rotation: 0.34, scale: [0.24, 0.07, 0.018], color: AMETHYST_CLOUD_SOFT, opacity: 0.28 },
    { position: [-0.18, -0.34, 0.38], rotation: -0.08, scale: [0.26, 0.062, 0.016], color: AMETHYST_INTERNAL_DEEP, opacity: 0.26 },
    { position: [0.24, -0.36, 0.32], rotation: 0.1, scale: [0.24, 0.062, 0.016], color: AMETHYST_PURPLE_DARK, opacity: 0.26 },
  ]
  const wraparoundCrystalOvergrowth: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity?: number
    tilt?: [number, number]
    rise?: number
  }> = [
    { position: [-0.62, 0.44, -0.58], rotation: -0.55, scale: [0.04, 0.072, 0.024], color: AMETHYST_PURPLE_LIGHT, opacity: 0.8, tilt: [-0.1, -0.28], rise: 0.004 },
    { position: [0.62, 0.4, -0.57], rotation: 0.56, scale: [0.04, 0.07, 0.024], color: AMETHYST_LAVENDER, opacity: 0.78, tilt: [-0.1, 0.28], rise: 0.004 },
    { position: [-0.7, 0.18, -0.45], rotation: -0.72, scale: [0.034, 0.06, 0.02], color: AMETHYST_PURPLE_MID, opacity: 0.78, tilt: [0.02, -0.36], rise: 0.004 },
    { position: [0.7, 0.14, -0.44], rotation: 0.72, scale: [0.034, 0.06, 0.02], color: AMETHYST_PURPLE_LIGHT, opacity: 0.76, tilt: [0.02, 0.36], rise: 0.004 },
    { position: [-0.64, -0.2, -0.3], rotation: 0.3, scale: [0.03, 0.054, 0.018], color: AMETHYST_LAVENDER, opacity: 0.7, tilt: [0.16, -0.3], rise: 0.003 },
    { position: [0.64, -0.24, -0.28], rotation: -0.32, scale: [0.03, 0.054, 0.018], color: AMETHYST_PURPLE_DARK, opacity: 0.72, tilt: [0.16, 0.3], rise: 0.003 },
    { position: [-0.72, 0.42, -0.08], rotation: -0.4, scale: [0.038, 0.058, 0.02], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.72, tilt: [-0.08, -0.5], rise: 0.004 },
    { position: [0.72, 0.38, -0.06], rotation: 0.42, scale: [0.038, 0.058, 0.02], color: AMETHYST_PURPLE_LIGHT, opacity: 0.74, tilt: [-0.08, 0.5], rise: 0.004 },
    { position: [-0.68, -0.04, 0.16], rotation: 0.16, scale: [0.032, 0.056, 0.019], color: AMETHYST_PURPLE_MID, opacity: 0.72, tilt: [0.08, -1.0], rise: 0.004 },
    { position: [0.68, -0.06, 0.18], rotation: -0.18, scale: [0.032, 0.056, 0.019], color: AMETHYST_LAVENDER, opacity: 0.7, tilt: [0.08, 1.0], rise: 0.004 },
    { position: [-0.52, 0.62, 0.26], rotation: -0.42, scale: [0.046, 0.068, 0.024], color: AMETHYST_PURPLE_LIGHT, opacity: 0.76, tilt: [-0.42, -2.0], rise: 0.002 },
    { position: [0.52, 0.6, 0.28], rotation: 0.44, scale: [0.046, 0.068, 0.024], color: AMETHYST_PURPLE_DARK, opacity: 0.78, tilt: [-0.42, 2.0], rise: 0.002 },
    { position: [-0.28, 0.72, 0.48], rotation: -0.18, scale: [0.044, 0.064, 0.024], color: AMETHYST_LAVENDER, opacity: 0.74, tilt: [-0.54, -2.6], rise: 0.001 },
    { position: [0.26, 0.72, 0.5], rotation: 0.16, scale: [0.044, 0.064, 0.024], color: AMETHYST_PURPLE_LIGHT, opacity: 0.74, tilt: [-0.54, 2.6], rise: 0.001 },
    { position: [-0.02, 0.62, 0.74], rotation: 0.06, scale: [0.048, 0.078, 0.026], color: AMETHYST_PURPLE_MID, opacity: 0.8, tilt: [-0.28, 3.1], rise: 0.004 },
    { position: [-0.32, 0.28, 0.68], rotation: -0.2, scale: [0.036, 0.066, 0.022], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.7, tilt: [-0.04, -2.7], rise: 0.004 },
    { position: [0.34, 0.2, 0.66], rotation: 0.24, scale: [0.036, 0.066, 0.022], color: AMETHYST_LAVENDER, opacity: 0.72, tilt: [-0.04, 2.7], rise: 0.004 },
    { position: [-0.22, -0.32, 0.34], rotation: -0.08, scale: [0.032, 0.056, 0.018], color: AMETHYST_PURPLE_DARK, opacity: 0.66, tilt: [0.22, -3.0], rise: 0.003 },
    { position: [0.28, -0.34, 0.28], rotation: 0.1, scale: [0.032, 0.056, 0.018], color: AMETHYST_PURPLE_LIGHT, opacity: 0.66, tilt: [0.22, 2.8], rise: 0.003 },
  ]
  const topCrownCrystalOvergrowth: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity?: number
    tilt?: [number, number]
    rise?: number
  }> = [
    { position: [-0.38, 0.66, -0.08], rotation: -0.34, scale: [0.072, 0.04, 0.044], color: AMETHYST_PURPLE_MID, opacity: 0.58, tilt: [-0.38, -1.18], rise: -0.006 },
    { position: [-0.2, 0.7, -0.06], rotation: -0.16, scale: [0.078, 0.048, 0.048], color: AMETHYST_LAVENDER, opacity: 0.56, tilt: [-0.44, -0.62], rise: -0.008 },
    { position: [0.02, 0.72, -0.03], rotation: 0.04, scale: [0.086, 0.052, 0.052], color: AMETHYST_PURPLE_LIGHT, opacity: 0.6, tilt: [-0.46, 0.02], rise: -0.01 },
    { position: [0.22, 0.7, -0.06], rotation: 0.2, scale: [0.078, 0.048, 0.048], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.52, tilt: [-0.42, 0.62], rise: -0.008 },
    { position: [0.4, 0.66, -0.08], rotation: 0.38, scale: [0.072, 0.04, 0.044], color: AMETHYST_PURPLE_MID, opacity: 0.58, tilt: [-0.38, 1.16], rise: -0.006 },
    { position: [-0.48, 0.63, 0.02], rotation: -0.48, scale: [0.058, 0.036, 0.04], color: AMETHYST_PURPLE_DARK, opacity: 0.52, tilt: [-0.34, -1.38], rise: -0.006 },
    { position: [-0.28, 0.67, 0.08], rotation: -0.28, scale: [0.064, 0.04, 0.042], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.5, tilt: [-0.4, -0.72], rise: -0.008 },
    { position: [-0.08, 0.7, 0.08], rotation: -0.08, scale: [0.068, 0.042, 0.044], color: AMETHYST_PURPLE_LIGHT, opacity: 0.54, tilt: [-0.42, -0.18], rise: -0.008 },
    { position: [0.14, 0.69, 0.08], rotation: 0.12, scale: [0.068, 0.042, 0.044], color: AMETHYST_LAVENDER, opacity: 0.52, tilt: [-0.4, 0.28], rise: -0.008 },
    { position: [0.34, 0.65, 0.06], rotation: 0.32, scale: [0.062, 0.038, 0.04], color: AMETHYST_PURPLE_DARK, opacity: 0.54, tilt: [-0.36, 0.86], rise: -0.006 },
    { position: [-0.18, 0.65, -0.18], rotation: -0.18, scale: [0.058, 0.038, 0.04], color: AMETHYST_PURPLE_LIGHT, opacity: 0.5, tilt: [-0.32, -0.4], rise: -0.006 },
    { position: [0.14, 0.65, -0.18], rotation: 0.18, scale: [0.058, 0.038, 0.04], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.48, tilt: [-0.32, 0.4], rise: -0.006 },
  ]
  const topCrownFacetPads: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.3, 0.72, -0.06], rotation: -0.18, scale: [0.2, 0.11, 1], color: AMETHYST_PURPLE_LIGHT, opacity: 0.32 },
    { position: [0.0, 0.76, -0.04], rotation: 0.04, scale: [0.24, 0.12, 1], color: AMETHYST_CLOUD_MILK, opacity: 0.3 },
    { position: [0.3, 0.71, -0.06], rotation: 0.2, scale: [0.2, 0.11, 1], color: AMETHYST_LAVENDER, opacity: 0.3 },
    { position: [-0.18, 0.7, 0.09], rotation: -0.12, scale: [0.2, 0.1, 1], color: AMETHYST_CLOUD_VEIL, opacity: 0.28 },
    { position: [0.18, 0.7, 0.09], rotation: 0.12, scale: [0.2, 0.1, 1], color: AMETHYST_PURPLE_MID, opacity: 0.28 },
  ]
  const tippyTopRoughCrystals: Array<{
    position: [number, number, number]
    rotation: number
    rotationX: number
    rotationY: number
    scale: [number, number, number]
    color: string
    opacity: number
    inset: number
    skew: number
  }> = [
    { position: [-0.3, 0.8, -0.12], rotation: -0.34, rotationX: -0.46, rotationY: -0.44, scale: [0.118, 0.088, 0.05], color: AMETHYST_PURPLE_DARK, opacity: 0.44, inset: 0.048, skew: -0.52 },
    { position: [-0.1, 0.85, -0.1], rotation: -0.08, rotationX: -0.52, rotationY: -0.12, scale: [0.136, 0.096, 0.054], color: AMETHYST_CLOUD_VEIL, opacity: 0.4, inset: 0.052, skew: 0.38 },
    { position: [0.12, 0.85, -0.1], rotation: 0.16, rotationX: -0.5, rotationY: 0.16, scale: [0.134, 0.094, 0.054], color: AMETHYST_PURPLE_MID, opacity: 0.42, inset: 0.052, skew: -0.36 },
    { position: [0.32, 0.79, -0.12], rotation: 0.36, rotationX: -0.44, rotationY: 0.46, scale: [0.116, 0.086, 0.05], color: AMETHYST_CLOUD_MILK, opacity: 0.36, inset: 0.048, skew: 0.58 },
    { position: [-0.42, 0.74, -0.02], rotation: -0.55, rotationX: -0.36, rotationY: -0.76, scale: [0.092, 0.07, 0.042], color: AMETHYST_INTERNAL_DEEP, opacity: 0.42, inset: 0.046, skew: -0.34 },
    { position: [-0.34, 0.75, 0.04], rotation: -0.5, rotationX: -0.38, rotationY: -0.62, scale: [0.096, 0.074, 0.044], color: AMETHYST_INTERNAL_VIOLET, opacity: 0.42, inset: 0.048, skew: -0.28 },
    { position: [-0.14, 0.8, 0.08], rotation: -0.2, rotationX: -0.42, rotationY: -0.22, scale: [0.108, 0.084, 0.048], color: AMETHYST_LAVENDER, opacity: 0.36, inset: 0.05, skew: 0.44 },
    { position: [0.08, 0.81, 0.08], rotation: 0.1, rotationX: -0.42, rotationY: 0.18, scale: [0.112, 0.086, 0.048], color: AMETHYST_PURPLE_LIGHT, opacity: 0.38, inset: 0.05, skew: -0.46 },
    { position: [0.32, 0.74, 0.04], rotation: 0.46, rotationX: -0.36, rotationY: 0.58, scale: [0.096, 0.074, 0.044], color: AMETHYST_PURPLE_DARK, opacity: 0.42, inset: 0.048, skew: 0.32 },
    { position: [0.44, 0.72, -0.02], rotation: 0.58, rotationX: -0.34, rotationY: 0.74, scale: [0.088, 0.068, 0.04], color: AMETHYST_INTERNAL_VIOLET, opacity: 0.4, inset: 0.046, skew: 0.38 },
    { position: [-0.22, 0.73, -0.26], rotation: -0.22, rotationX: -0.34, rotationY: -0.28, scale: [0.098, 0.068, 0.042], color: AMETHYST_CLOUD_SOFT, opacity: 0.34, inset: 0.046, skew: 0.24 },
    { position: [0.2, 0.73, -0.26], rotation: 0.24, rotationX: -0.34, rotationY: 0.28, scale: [0.096, 0.068, 0.042], color: AMETHYST_INTERNAL_DEEP, opacity: 0.38, inset: 0.046, skew: -0.22 },
    { position: [0.0, 0.82, -0.24], rotation: 0.03, rotationX: -0.48, rotationY: 0.02, scale: [0.106, 0.074, 0.046], color: AMETHYST_PURPLE_DEEP, opacity: 0.38, inset: 0.048, skew: 0.18 },
    { position: [-0.18, 0.91, -0.04], rotation: -0.14, rotationX: -0.58, rotationY: -0.2, scale: [0.086, 0.064, 0.038], color: AMETHYST_INTERNAL_DEEP, opacity: 0.36, inset: 0.044, skew: -0.32 },
    { position: [0.02, 0.94, -0.04], rotation: 0.04, rotationX: -0.6, rotationY: 0.04, scale: [0.096, 0.068, 0.04], color: AMETHYST_PURPLE_DARK, opacity: 0.38, inset: 0.046, skew: 0.28 },
    { position: [0.22, 0.9, -0.04], rotation: 0.22, rotationX: -0.56, rotationY: 0.24, scale: [0.084, 0.062, 0.038], color: AMETHYST_CLOUD_SOFT, opacity: 0.32, inset: 0.044, skew: 0.34 },
    { position: [-0.05, 0.88, 0.12], rotation: -0.02, rotationX: -0.54, rotationY: -0.02, scale: [0.088, 0.062, 0.038], color: AMETHYST_CLOUD_MILK, opacity: 0.3, inset: 0.046, skew: -0.24 },
  ]
  const tippyTopDarkPockets: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.28, 0.77, -0.03], rotation: -0.3, scale: [0.086, 0.042, 0.02], color: AMETHYST_INTERNAL_DEEP, opacity: 0.5 },
    { position: [-0.02, 0.83, -0.04], rotation: 0.06, scale: [0.104, 0.048, 0.022], color: AMETHYST_SMOKY_EDGE, opacity: 0.5 },
    { position: [0.26, 0.77, -0.02], rotation: 0.28, scale: [0.086, 0.042, 0.02], color: AMETHYST_INTERNAL_DEEP, opacity: 0.48 },
    { position: [-0.16, 0.77, 0.12], rotation: -0.18, scale: [0.07, 0.036, 0.018], color: AMETHYST_PURPLE_DEEP, opacity: 0.36 },
    { position: [0.14, 0.77, 0.12], rotation: 0.2, scale: [0.07, 0.036, 0.018], color: AMETHYST_PURPLE_DEEP, opacity: 0.36 },
    { position: [-0.1, 0.75, -0.22], rotation: -0.08, scale: [0.064, 0.034, 0.018], color: AMETHYST_INTERNAL_DEEP, opacity: 0.4 },
    { position: [0.14, 0.75, -0.22], rotation: 0.12, scale: [0.064, 0.034, 0.018], color: AMETHYST_INTERNAL_DEEP, opacity: 0.4 },
    { position: [-0.17, 0.9, -0.02], rotation: -0.12, scale: [0.058, 0.03, 0.016], color: AMETHYST_PURPLE_DEEP, opacity: 0.36 },
    { position: [0.05, 0.93, -0.02], rotation: 0.06, scale: [0.064, 0.032, 0.016], color: AMETHYST_INTERNAL_DEEP, opacity: 0.38 },
    { position: [0.22, 0.88, 0.0], rotation: 0.16, scale: [0.052, 0.028, 0.014], color: AMETHYST_PURPLE_DEEP, opacity: 0.34 },
  ]
  const tippyTopSurfaceRidges: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.18, 0.9, -0.08], rotation: -0.22, scale: [0.11, 0.056, 0.028], color: AMETHYST_INTERNAL_DEEP, opacity: 0.72 },
    { position: [0.02, 0.93, -0.08], rotation: 0.04, scale: [0.126, 0.06, 0.03], color: AMETHYST_PURPLE_DEEP, opacity: 0.74 },
    { position: [0.22, 0.88, -0.08], rotation: 0.26, scale: [0.108, 0.054, 0.028], color: AMETHYST_INTERNAL_DEEP, opacity: 0.68 },
    { position: [-0.28, 0.82, -0.16], rotation: -0.38, scale: [0.116, 0.062, 0.03], color: AMETHYST_INTERNAL_DEEP, opacity: 0.66 },
    { position: [-0.1, 0.84, -0.2], rotation: -0.1, scale: [0.132, 0.066, 0.032], color: AMETHYST_PURPLE_DARK, opacity: 0.62 },
    { position: [0.08, 0.84, -0.2], rotation: 0.08, scale: [0.136, 0.066, 0.032], color: AMETHYST_INTERNAL_VIOLET, opacity: 0.62 },
    { position: [0.28, 0.81, -0.16], rotation: 0.36, scale: [0.116, 0.06, 0.03], color: AMETHYST_PURPLE_DEEP, opacity: 0.66 },
    { position: [-0.38, 0.75, -0.04], rotation: -0.58, scale: [0.092, 0.052, 0.026], color: AMETHYST_CLOUD_VEIL, opacity: 0.48 },
    { position: [-0.19, 0.8, 0.0], rotation: -0.22, scale: [0.108, 0.054, 0.026], color: AMETHYST_SMOKY_EDGE, opacity: 0.62 },
    { position: [0.02, 0.82, 0.0], rotation: 0.04, scale: [0.116, 0.056, 0.026], color: AMETHYST_PURPLE_MID, opacity: 0.54 },
    { position: [0.24, 0.79, 0.0], rotation: 0.26, scale: [0.104, 0.052, 0.026], color: AMETHYST_SMOKY_EDGE, opacity: 0.62 },
    { position: [-0.09, 0.76, 0.12], rotation: -0.1, scale: [0.088, 0.044, 0.024], color: AMETHYST_CLOUD_MILK, opacity: 0.44 },
    { position: [0.12, 0.75, 0.12], rotation: 0.16, scale: [0.086, 0.042, 0.024], color: AMETHYST_PURPLE_DARK, opacity: 0.56 },
  ]
  const topCapLayeredSheets: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.46, 0.6, -0.39], rotation: -0.44, scale: [0.34, 0.16, 1], color: AMETHYST_PURPLE_DARK, opacity: 0.34 },
    { position: [-0.2, 0.66, -0.44], rotation: -0.18, scale: [0.38, 0.17, 1], color: AMETHYST_LAVENDER, opacity: 0.32 },
    { position: [0.1, 0.68, -0.43], rotation: 0.08, scale: [0.42, 0.18, 1], color: AMETHYST_CLOUD_VEIL, opacity: 0.34 },
    { position: [0.42, 0.61, -0.38], rotation: 0.4, scale: [0.34, 0.16, 1], color: AMETHYST_PURPLE_LIGHT, opacity: 0.32 },
    { position: [-0.52, 0.71, -0.18], rotation: -0.42, scale: [0.32, 0.16, 1], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.28 },
    { position: [-0.2, 0.78, -0.2], rotation: -0.12, scale: [0.42, 0.18, 1], color: AMETHYST_PURPLE_MID, opacity: 0.34 },
    { position: [0.14, 0.8, -0.18], rotation: 0.12, scale: [0.42, 0.18, 1], color: AMETHYST_CLOUD_MILK, opacity: 0.3 },
    { position: [0.5, 0.72, -0.16], rotation: 0.44, scale: [0.32, 0.16, 1], color: AMETHYST_LAVENDER, opacity: 0.28 },
    { position: [-0.58, 0.72, 0.06], rotation: -0.48, scale: [0.28, 0.15, 1], color: AMETHYST_PURPLE_DARK, opacity: 0.32 },
    { position: [-0.28, 0.86, 0.04], rotation: -0.2, scale: [0.38, 0.18, 1], color: AMETHYST_CLOUD_VEIL, opacity: 0.34 },
    { position: [0.04, 0.88, 0.04], rotation: 0.04, scale: [0.44, 0.19, 1], color: AMETHYST_PURPLE_LIGHT, opacity: 0.34 },
    { position: [0.36, 0.84, 0.06], rotation: 0.24, scale: [0.36, 0.17, 1], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.28 },
    { position: [0.62, 0.72, 0.08], rotation: 0.52, scale: [0.26, 0.14, 1], color: AMETHYST_PURPLE_MID, opacity: 0.3 },
    { position: [-0.5, 0.66, 0.32], rotation: -0.38, scale: [0.3, 0.14, 1], color: AMETHYST_CLOUD_MILK, opacity: 0.28 },
    { position: [-0.2, 0.76, 0.34], rotation: -0.08, scale: [0.36, 0.16, 1], color: AMETHYST_PURPLE_LIGHT, opacity: 0.32 },
    { position: [0.14, 0.76, 0.36], rotation: 0.12, scale: [0.36, 0.16, 1], color: AMETHYST_PURPLE_DARK, opacity: 0.34 },
    { position: [0.46, 0.68, 0.34], rotation: 0.38, scale: [0.3, 0.14, 1], color: AMETHYST_LAVENDER, opacity: 0.28 },
    { position: [-0.26, 0.58, 0.58], rotation: -0.2, scale: [0.3, 0.13, 1], color: AMETHYST_CLOUD_VEIL, opacity: 0.28 },
    { position: [0.08, 0.6, 0.6], rotation: 0.08, scale: [0.34, 0.14, 1], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.26 },
    { position: [0.36, 0.52, 0.56], rotation: 0.32, scale: [0.26, 0.12, 1], color: AMETHYST_PURPLE_MID, opacity: 0.28 },
    { position: [-0.7, 0.48, -0.34], rotation: -0.72, scale: [0.22, 0.15, 1], color: AMETHYST_CLOUD_MILK, opacity: 0.28 },
    { position: [0.7, 0.46, -0.32], rotation: 0.72, scale: [0.22, 0.15, 1], color: AMETHYST_PURPLE_LIGHT, opacity: 0.28 },
    { position: [-0.68, 0.62, -0.02], rotation: -0.54, scale: [0.24, 0.16, 1], color: AMETHYST_PURPLE_MID, opacity: 0.3 },
    { position: [0.68, 0.6, 0.0], rotation: 0.54, scale: [0.24, 0.16, 1], color: AMETHYST_CLOUD_VEIL, opacity: 0.3 },
    { position: [-0.58, 0.6, 0.42], rotation: -0.42, scale: [0.26, 0.14, 1], color: AMETHYST_LAVENDER, opacity: 0.28 },
    { position: [0.58, 0.58, 0.44], rotation: 0.42, scale: [0.26, 0.14, 1], color: AMETHYST_CLOUD_MILK, opacity: 0.28 },
    { position: [-0.12, 0.48, 0.76], rotation: -0.06, scale: [0.34, 0.13, 1], color: AMETHYST_PURPLE_DARK, opacity: 0.3 },
    { position: [0.24, 0.46, 0.74], rotation: 0.18, scale: [0.3, 0.12, 1], color: AMETHYST_PURPLE_LIGHT, opacity: 0.28 },
    { position: [-0.42, 0.82, -0.02], rotation: -0.34, scale: [0.36, 0.17, 1], color: AMETHYST_INTERNAL_VIOLET, opacity: 0.34 },
    { position: [0.44, 0.8, -0.02], rotation: 0.34, scale: [0.36, 0.17, 1], color: AMETHYST_CLOUD_MILK, opacity: 0.32 },
    { position: [-0.4, 0.78, 0.24], rotation: -0.26, scale: [0.34, 0.16, 1], color: AMETHYST_CLOUD_VEIL, opacity: 0.32 },
    { position: [0.4, 0.76, 0.26], rotation: 0.26, scale: [0.34, 0.16, 1], color: AMETHYST_PURPLE_MID, opacity: 0.32 },
  ]
  const topCapLayeredBands: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
    inset?: number
  }> = [
    { position: [0.0, 0.56, -0.48], rotation: 0.02, scale: [0.58, 0.082, 0.018], color: AMETHYST_INTERNAL_VIOLET, opacity: 0.36, inset: 0.038 },
    { position: [-0.32, 0.62, -0.36], rotation: -0.22, scale: [0.36, 0.07, 0.017], color: AMETHYST_CLOUD_MILK, opacity: 0.34, inset: 0.034 },
    { position: [0.34, 0.6, -0.34], rotation: 0.26, scale: [0.34, 0.068, 0.017], color: AMETHYST_CLOUD_SOFT, opacity: 0.32, inset: 0.034 },
    { position: [-0.52, 0.68, -0.12], rotation: -0.36, scale: [0.3, 0.068, 0.016], color: AMETHYST_PURPLE_LIGHT, opacity: 0.32, inset: 0.032 },
    { position: [-0.14, 0.74, -0.12], rotation: -0.08, scale: [0.48, 0.078, 0.018], color: AMETHYST_PURPLE_DARK, opacity: 0.34, inset: 0.036 },
    { position: [0.3, 0.74, -0.1], rotation: 0.16, scale: [0.4, 0.074, 0.018], color: AMETHYST_CLOUD_MILK, opacity: 0.32, inset: 0.036 },
    { position: [0.0, 0.84, 0.08], rotation: 0.03, scale: [0.6, 0.09, 0.02], color: AMETHYST_PURPLE_MID, opacity: 0.36, inset: 0.04 },
    { position: [-0.42, 0.78, 0.18], rotation: -0.28, scale: [0.34, 0.072, 0.017], color: AMETHYST_CLOUD_VEIL, opacity: 0.32, inset: 0.034 },
    { position: [0.42, 0.78, 0.18], rotation: 0.28, scale: [0.34, 0.072, 0.017], color: AMETHYST_LAVENDER, opacity: 0.3, inset: 0.034 },
    { position: [-0.16, 0.72, 0.34], rotation: -0.08, scale: [0.44, 0.076, 0.018], color: AMETHYST_CLOUD_MILK, opacity: 0.3, inset: 0.036 },
    { position: [0.24, 0.7, 0.36], rotation: 0.18, scale: [0.38, 0.07, 0.017], color: AMETHYST_PURPLE_LIGHT, opacity: 0.32, inset: 0.034 },
    { position: [-0.02, 0.6, 0.56], rotation: 0.02, scale: [0.42, 0.064, 0.016], color: AMETHYST_INTERNAL_DEEP, opacity: 0.28, inset: 0.032 },
    { position: [-0.62, 0.54, -0.28], rotation: -0.54, scale: [0.26, 0.068, 0.017], color: AMETHYST_PURPLE_DEEP, opacity: 0.3, inset: 0.034 },
    { position: [0.62, 0.52, -0.26], rotation: 0.56, scale: [0.26, 0.068, 0.017], color: AMETHYST_INTERNAL_VIOLET, opacity: 0.3, inset: 0.034 },
    { position: [-0.58, 0.66, 0.12], rotation: -0.42, scale: [0.3, 0.07, 0.017], color: AMETHYST_LAVENDER, opacity: 0.3, inset: 0.036 },
    { position: [0.58, 0.64, 0.14], rotation: 0.42, scale: [0.3, 0.07, 0.017], color: AMETHYST_PURPLE_DARK, opacity: 0.3, inset: 0.036 },
    { position: [0.0, 0.7, 0.48], rotation: 0.02, scale: [0.52, 0.078, 0.018], color: AMETHYST_CLOUD_VEIL, opacity: 0.32, inset: 0.038 },
    { position: [-0.08, 0.48, 0.74], rotation: -0.04, scale: [0.38, 0.062, 0.016], color: AMETHYST_PURPLE_MID, opacity: 0.28, inset: 0.032 },
    { position: [0.32, 0.48, 0.66], rotation: 0.22, scale: [0.28, 0.06, 0.016], color: AMETHYST_CLOUD_MILK, opacity: 0.26, inset: 0.032 },
  ]
  const wraparoundPolishStrokes: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.62, 0.32, -0.54], rotation: -0.54, scale: [0.004, 0.12, 0.0025], color: AMETHYST_GLINT, opacity: 0.42 },
    { position: [0.62, 0.28, -0.54], rotation: 0.52, scale: [0.004, 0.12, 0.0025], color: AMETHYST_LAVENDER, opacity: 0.4 },
    { position: [-0.7, -0.08, -0.28], rotation: -0.2, scale: [0.0038, 0.09, 0.0023], color: AMETHYST_CLOUD_MILK, opacity: 0.34 },
    { position: [0.7, -0.12, -0.26], rotation: 0.22, scale: [0.0038, 0.09, 0.0023], color: AMETHYST_GLINT, opacity: 0.34 },
    { position: [-0.55, 0.5, 0.18], rotation: -0.46, scale: [0.0038, 0.1, 0.0024], color: AMETHYST_GLINT, opacity: 0.34 },
    { position: [0.56, 0.48, 0.2], rotation: 0.48, scale: [0.0038, 0.1, 0.0024], color: AMETHYST_CLOUD_MILK, opacity: 0.32 },
    { position: [-0.18, 0.7, 0.58], rotation: -0.18, scale: [0.0038, 0.11, 0.0024], color: AMETHYST_GLINT, opacity: 0.36 },
    { position: [0.22, 0.68, 0.58], rotation: 0.22, scale: [0.0038, 0.11, 0.0024], color: AMETHYST_LAVENDER, opacity: 0.34 },
    { position: [-0.24, 0.18, 0.66], rotation: -0.5, scale: [0.0035, 0.088, 0.0023], color: AMETHYST_CLOUD_MILK, opacity: 0.28 },
    { position: [0.3, 0.1, 0.64], rotation: 0.52, scale: [0.0035, 0.088, 0.0023], color: AMETHYST_GLINT, opacity: 0.3 },
    { position: [-0.12, -0.34, 0.34], rotation: -0.16, scale: [0.0033, 0.078, 0.0022], color: AMETHYST_CLOUD_MILK, opacity: 0.24 },
    { position: [0.28, -0.34, 0.28], rotation: 0.2, scale: [0.0033, 0.078, 0.0022], color: AMETHYST_LAVENDER, opacity: 0.24 },
  ]
  const wraparoundGlints: Array<{ position: [number, number, number]; scale: number; opacity: number; color?: string; rotation?: number }> = [
    { position: [-0.64, 0.54, -0.48], scale: 0.36, opacity: 0.48, color: AMETHYST_LAVENDER },
    { position: [0.64, 0.5, -0.46], scale: 0.36, opacity: 0.48 },
    { position: [-0.72, 0.2, -0.28], scale: 0.3, opacity: 0.4 },
    { position: [0.72, 0.16, -0.28], scale: 0.3, opacity: 0.4, color: AMETHYST_PURPLE_LIGHT },
    { position: [-0.64, -0.28, -0.12], scale: 0.26, opacity: 0.34, color: AMETHYST_LAVENDER },
    { position: [0.64, -0.3, -0.1], scale: 0.26, opacity: 0.34 },
    { position: [-0.55, 0.68, 0.22], scale: 0.32, opacity: 0.38 },
    { position: [0.56, 0.66, 0.24], scale: 0.32, opacity: 0.38, color: AMETHYST_LAVENDER },
    { position: [-0.3, 0.78, 0.48], scale: 0.34, opacity: 0.42 },
    { position: [0.26, 0.76, 0.5], scale: 0.34, opacity: 0.42, color: AMETHYST_PURPLE_LIGHT },
    { position: [0.0, 0.64, 0.76], scale: 0.42, opacity: 0.5, color: AMETHYST_QUARTZ_CLEAR },
    { position: [-0.34, 0.26, 0.66], scale: 0.28, opacity: 0.34, color: AMETHYST_LAVENDER },
    { position: [0.34, 0.18, 0.64], scale: 0.28, opacity: 0.34 },
    { position: [-0.18, -0.3, 0.36], scale: 0.24, opacity: 0.3 },
    { position: [0.28, -0.32, 0.3], scale: 0.24, opacity: 0.3, color: AMETHYST_LAVENDER },
    { position: [-0.72, 0.44, -0.1], scale: 0.34, opacity: 0.46, color: AMETHYST_CLOUD_MILK, rotation: -0.36 },
    { position: [0.72, 0.4, -0.08], scale: 0.34, opacity: 0.46, color: AMETHYST_GLINT, rotation: 0.34 },
    { position: [-0.66, 0.12, 0.12], scale: 0.26, opacity: 0.34, color: AMETHYST_LAVENDER, rotation: 0.18 },
    { position: [0.68, 0.08, 0.14], scale: 0.26, opacity: 0.36, color: AMETHYST_CLOUD_MILK, rotation: -0.2 },
    { position: [-0.48, 0.72, 0.34], scale: 0.42, opacity: 0.54, color: AMETHYST_GLINT, rotation: -0.28 },
    { position: [0.48, 0.7, 0.36], scale: 0.4, opacity: 0.52, color: AMETHYST_QUARTZ_CLEAR, rotation: 0.3 },
    { position: [-0.1, 0.86, 0.5], scale: 0.46, opacity: 0.58, color: AMETHYST_CLOUD_MILK, rotation: -0.08 },
    { position: [0.18, 0.84, 0.52], scale: 0.42, opacity: 0.54, color: AMETHYST_LAVENDER, rotation: 0.14 },
    { position: [-0.5, 0.34, 0.5], scale: 0.28, opacity: 0.36, color: AMETHYST_GLINT, rotation: -0.44 },
    { position: [0.52, 0.28, 0.5], scale: 0.28, opacity: 0.36, color: AMETHYST_CLOUD_MILK, rotation: 0.46 },
    { position: [-0.62, -0.08, 0.2], scale: 0.22, opacity: 0.28, color: AMETHYST_QUARTZ_CLEAR, rotation: 0.3 },
    { position: [0.62, -0.1, 0.22], scale: 0.22, opacity: 0.28, color: AMETHYST_LAVENDER, rotation: -0.28 },
    { position: [-0.4, -0.4, 0.12], scale: 0.2, opacity: 0.24, color: AMETHYST_CLOUD_MILK, rotation: -0.2 },
    { position: [0.42, -0.42, 0.1], scale: 0.2, opacity: 0.24, color: AMETHYST_QUARTZ_CLEAR, rotation: 0.22 },
  ]
  const topCrownGlints: Array<{ position: [number, number, number]; scale: number; opacity: number; color?: string; rotation?: number }> = [
    { position: [-0.5, 0.78, -0.18], scale: 0.4, opacity: 0.56, color: AMETHYST_GLINT, rotation: -0.42 },
    { position: [0.5, 0.76, -0.18], scale: 0.4, opacity: 0.56, color: AMETHYST_CLOUD_MILK, rotation: 0.42 },
    { position: [-0.36, 0.9, -0.06], scale: 0.44, opacity: 0.6, color: AMETHYST_QUARTZ_CLEAR, rotation: -0.24 },
    { position: [0.36, 0.88, -0.04], scale: 0.42, opacity: 0.58, color: AMETHYST_GLINT, rotation: 0.28 },
    { position: [-0.52, 0.72, 0.12], scale: 0.34, opacity: 0.46, color: AMETHYST_LAVENDER, rotation: -0.52 },
    { position: [0.54, 0.7, 0.14], scale: 0.34, opacity: 0.46, color: AMETHYST_CLOUD_MILK, rotation: 0.5 },
    { position: [-0.3, 0.8, 0.26], scale: 0.38, opacity: 0.52, color: AMETHYST_GLINT, rotation: -0.2 },
    { position: [0.34, 0.78, 0.28], scale: 0.38, opacity: 0.5, color: AMETHYST_QUARTZ_CLEAR, rotation: 0.22 },
    { position: [-0.12, 0.9, 0.34], scale: 0.42, opacity: 0.56, color: AMETHYST_CLOUD_MILK, rotation: -0.08 },
    { position: [0.14, 0.88, 0.36], scale: 0.42, opacity: 0.56, color: AMETHYST_LAVENDER, rotation: 0.08 },
    { position: [-0.48, 0.62, 0.36], scale: 0.28, opacity: 0.36, color: AMETHYST_GLINT, rotation: -0.36 },
    { position: [0.5, 0.6, 0.38], scale: 0.28, opacity: 0.36, color: AMETHYST_CLOUD_MILK, rotation: 0.38 },
    { position: [-0.62, 0.58, -0.02], scale: 0.3, opacity: 0.4, color: AMETHYST_QUARTZ_CLEAR, rotation: -0.48 },
    { position: [0.62, 0.56, 0.0], scale: 0.3, opacity: 0.4, color: AMETHYST_LAVENDER, rotation: 0.48 },
    { position: [-0.24, 0.7, 0.52], scale: 0.32, opacity: 0.42, color: AMETHYST_GLINT, rotation: -0.16 },
    { position: [0.28, 0.68, 0.52], scale: 0.32, opacity: 0.42, color: AMETHYST_CLOUD_MILK, rotation: 0.18 },
  ]
  const facetFlashes: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
    phase: number
  }> = [
    { position: [-0.36, 0.52, -0.66], rotation: -0.44, scale: [0.072, 0.024, 0.008], color: AMETHYST_GLINT, opacity: 0.72, phase: 0.2 },
    { position: [0.34, 0.46, -0.66], rotation: 0.42, scale: [0.064, 0.022, 0.008], color: AMETHYST_CLOUD_MILK, opacity: 0.68, phase: 1.1 },
    { position: [-0.58, 0.18, -0.56], rotation: -0.72, scale: [0.052, 0.018, 0.007], color: AMETHYST_LAVENDER, opacity: 0.58, phase: 2.2 },
    { position: [0.58, 0.12, -0.56], rotation: 0.76, scale: [0.052, 0.018, 0.007], color: AMETHYST_GLINT, opacity: 0.6, phase: 3.0 },
    { position: [-0.42, -0.28, -0.48], rotation: 0.22, scale: [0.046, 0.016, 0.006], color: AMETHYST_CLOUD_MILK, opacity: 0.48, phase: 3.7 },
    { position: [0.42, -0.3, -0.48], rotation: -0.2, scale: [0.046, 0.016, 0.006], color: AMETHYST_LAVENDER, opacity: 0.48, phase: 4.4 },
    { position: [-0.48, 0.72, -0.16], rotation: -0.3, scale: [0.058, 0.02, 0.007], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.58, phase: 5.2 },
    { position: [0.48, 0.68, -0.16], rotation: 0.34, scale: [0.058, 0.02, 0.007], color: AMETHYST_GLINT, opacity: 0.6, phase: 6.1 },
    { position: [-0.16, 0.84, -0.08], rotation: -0.12, scale: [0.066, 0.022, 0.008], color: AMETHYST_CLOUD_MILK, opacity: 0.66, phase: 6.8 },
    { position: [0.18, 0.82, -0.08], rotation: 0.18, scale: [0.062, 0.022, 0.008], color: AMETHYST_GLINT, opacity: 0.68, phase: 7.6 },
    { position: [-0.52, 0.58, 0.26], rotation: -0.42, scale: [0.052, 0.018, 0.007], color: AMETHYST_LAVENDER, opacity: 0.52, phase: 8.4 },
    { position: [0.52, 0.56, 0.28], rotation: 0.44, scale: [0.052, 0.018, 0.007], color: AMETHYST_CLOUD_MILK, opacity: 0.52, phase: 9.1 },
    { position: [-0.22, 0.72, 0.5], rotation: -0.2, scale: [0.054, 0.019, 0.007], color: AMETHYST_GLINT, opacity: 0.56, phase: 9.9 },
    { position: [0.28, 0.68, 0.5], rotation: 0.24, scale: [0.054, 0.019, 0.007], color: AMETHYST_QUARTZ_CLEAR, opacity: 0.54, phase: 10.6 },
    { position: [-0.08, 0.48, 0.7], rotation: -0.04, scale: [0.064, 0.021, 0.008], color: AMETHYST_CLOUD_MILK, opacity: 0.54, phase: 11.4 },
    { position: [0.26, 0.28, 0.66], rotation: 0.3, scale: [0.046, 0.016, 0.006], color: AMETHYST_LAVENDER, opacity: 0.42, phase: 12.2 },
  ]
  const sparkleBursts: Array<{ position: [number, number, number]; scale: number; color?: string; rotation?: number }> = [
    { position: [-0.2, 0.62, -0.64], scale: 2.0, color: AMETHYST_GLINT, rotation: -0.16 },
    { position: [0.22, 0.56, -0.64], scale: 1.72, color: AMETHYST_CLOUD_MILK, rotation: 0.26 },
    { position: [-0.62, 0.46, -0.5], scale: 0.82, color: AMETHYST_LAVENDER, rotation: -0.48 },
    { position: [0.62, 0.42, -0.5], scale: 0.78, color: AMETHYST_GLINT, rotation: 0.5 },
    { position: [-0.34, 0.82, -0.08], scale: 1.5, color: AMETHYST_CLOUD_MILK, rotation: -0.28 },
    { position: [0.34, 0.78, -0.06], scale: 1.42, color: AMETHYST_GLINT, rotation: 0.3 },
    { position: [-0.12, 0.88, -0.24], scale: 1.26, color: AMETHYST_QUARTZ_CLEAR, rotation: -0.04 },
    { position: [0.14, 0.86, -0.24], scale: 1.18, color: AMETHYST_CLOUD_MILK, rotation: 0.08 },
    { position: [-0.62, 0.56, -0.34], scale: 0.94, color: AMETHYST_GLINT, rotation: -0.58 },
    { position: [0.62, 0.52, -0.32], scale: 0.9, color: AMETHYST_LAVENDER, rotation: 0.56 },
    { position: [-0.48, 0.68, 0.18], scale: 1.14, color: AMETHYST_QUARTZ_CLEAR, rotation: -0.38 },
    { position: [0.5, 0.64, 0.2], scale: 1.1, color: AMETHYST_LAVENDER, rotation: 0.36 },
    { position: [-0.08, 0.86, 0.38], scale: 1.24, color: AMETHYST_GLINT, rotation: -0.06 },
    { position: [0.16, 0.84, 0.42], scale: 1.16, color: AMETHYST_CLOUD_MILK, rotation: 0.12 },
    { position: [-0.42, 0.42, 0.44], scale: 0.8, color: AMETHYST_CLOUD_MILK, rotation: -0.44 },
    { position: [0.44, 0.36, 0.44], scale: 0.8, color: AMETHYST_GLINT, rotation: 0.46 },
  ]

  function getTopCapCloudPose(position: [number, number, number], index: number, intensity = 1) {
    const [x, y, z] = position
    const crownPressure = Math.max(0, y - 0.54)
    const flip = index % 2 === 0 ? 1 : -1
    const cross = index % 3 === 0 ? 1 : index % 3 === 1 ? -0.55 : 0.35

    return {
      rotation: (Math.sin(index * 1.77 + x * 3.6) * 0.82 + flip * 0.34 + cross * 0.28) * intensity,
      rotationX: (Math.sin(index * 1.31 + z * 3.1) * 0.92 - z * 0.86 - crownPressure * 0.72 + flip * 0.5) * intensity,
      rotationY: (Math.cos(index * 1.53 - x * 3.4) * 0.88 + x * 1.08 - cross * 0.46) * intensity,
    }
  }

  function getTopCapCloudPosition(position: [number, number, number], index: number, depth = 0): [number, number, number] {
    const topEnvelope = 0.69 + Math.max(0, 0.36 - Math.abs(position[0])) * 0.026 - Math.max(0, Math.abs(position[2]) - 0.18) * 0.07
    const settledY = Math.min(position[1], topEnvelope)

    return [
      position[0] + Math.sin(index * 2.13) * 0.032,
      settledY + Math.cos(index * 1.49) * 0.004 - depth * 0.044,
      position[2] + Math.sin(index * 1.67 + 0.4) * 0.044,
    ]
  }

  function getTippyTopRoughPosition(position: [number, number, number], index: number): [number, number, number] {
    return [
      position[0] + Math.sin(index * 2.03) * 0.014,
      position[1] + Math.cos(index * 1.31) * 0.006,
      position[2] + Math.sin(index * 1.67 + 0.2) * 0.018,
    ]
  }

  function getCollidedTopCapCloudScale(
    position: [number, number, number],
    scale: [number, number, number],
    index: number,
    pass: 0 | 1 | 2 | 3,
  ): [number, number, number] {
    const frontSheet = position[2] < -0.22
    const sideTopSheet = isAmethystSideEdgeSlicePosition(position)
    const sideTopWidth = sideTopSheet ? 0.2 : 1

    if (!frontSheet) {
      if (pass === 0) return [scale[0] * (0.52 + (index % 4) * 0.045) * sideTopWidth, scale[1] * (0.78 + (index % 3) * 0.055), 0.044 + (index % 5) * 0.005]
      if (pass === 1) return [scale[0] * (0.42 + (index % 3) * 0.035) * sideTopWidth, scale[1] * (0.82 + (index % 4) * 0.055), 0.048 + (index % 4) * 0.005]
      if (pass === 2) return [scale[0] * (0.36 + (index % 5) * 0.035) * sideTopWidth, scale[1] * (0.88 + (index % 4) * 0.05), 0.052 + (index % 6) * 0.005]
      return [scale[0] * (0.3 + (index % 4) * 0.03) * sideTopWidth, scale[1] * (0.72 + (index % 5) * 0.05), 0.048 + (index % 5) * 0.004]
    }

    if (pass === 0) return [scale[0] * (0.24 + (index % 3) * 0.024) * sideTopWidth, scale[1] * (0.74 + (index % 4) * 0.045), 0.062 + (index % 4) * 0.006]
    if (pass === 1) return [scale[0] * (0.2 + (index % 3) * 0.02) * sideTopWidth, scale[1] * (0.82 + (index % 3) * 0.05), 0.064 + (index % 4) * 0.006]
    if (pass === 2) return [scale[0] * (0.18 + (index % 4) * 0.018) * sideTopWidth, scale[1] * (0.86 + (index % 4) * 0.045), 0.066 + (index % 5) * 0.005]
    return [scale[0] * (0.16 + (index % 4) * 0.016) * sideTopWidth, scale[1] * (0.74 + (index % 5) * 0.045), 0.062 + (index % 4) * 0.005]
  }

  function getCollidedTopCapInset(position: [number, number, number], baseInset: number) {
    const sideTopSheet = isAmethystSideEdgeSlicePosition(position)
    if (position[2] >= -0.22) return baseInset + (sideTopSheet ? 0.26 : 0)

    return baseInset + (sideTopSheet ? 0.28 : 0.08)
  }

  function getCollidedTopCapOpacity(position: [number, number, number], opacity: number, multiplier: number) {
    const sideTopSheet = isAmethystSideEdgeSlicePosition(position)
    if (position[2] >= -0.22) return opacity * multiplier * (sideTopSheet ? 0.22 : 1)

    return opacity * multiplier * (sideTopSheet ? 0.22 : 0.82)
  }

  function outsideFaceWindow(item: { position: [number, number, number] }) {
    return !isAmethystFaceWindowDetail(item.position, 0.055)
      && !isAmethystTopPotOcclusionDetail(item.position)
      && !isAmethystGrassSeatOcclusionDetail(item.position)
  }

  function isAmethystTopPotOcclusionDetail(position: [number, number, number]) {
    const [x, y, z] = position
    const potFootprint = (x / 0.32) ** 2 + ((z + 0.05) / 0.28) ** 2

    return y > 0.52 && potFootprint < 1
  }

  function isAmethystGrassSeatOcclusionDetail(position: [number, number, number]) {
    const [x, y, z] = position
    const grassFootprint = (x / 1.08) ** 2 + ((z + 0.25) / 0.55) ** 2

    return y < -0.44 && z < 0.06 && grassFootprint < 1
  }

  function isAmethystSideEdgeSlicePosition(position: [number, number, number]) {
    const [x, y, z] = position

    return (Math.abs(x) > 0.34 && y > 0.38) || (Math.abs(x) > 0.28 && y > 0.56 && Math.abs(z) > 0.26)
  }

  function isAmethystCrownFringeStrokePosition(position: [number, number, number]) {
    const [, y, z] = position

    return y > 0.4 && z < -0.56
  }

  function getTuckedAmethystEdgeStrokePosition(position: [number, number, number], index: number): [number, number, number] {
    const embeddedPosition = getAmethystEmbeddedSurfacePosition(position, 0.24)

    return [
      embeddedPosition[0] * 0.96,
      Math.min(embeddedPosition[1], 0.64) - 0.016 + Math.sin(index * 1.47) * 0.004,
      embeddedPosition[2] * 0.98,
    ]
  }

  function getTuckedAmethystEdgeStrokeScale(scale: [number, number, number], index: number): [number, number, number] {
    return [
      Math.max(0.012, scale[0] * (3.1 + (index % 2) * 0.35)),
      Math.max(0.009, scale[1] * 0.105),
      Math.max(0.0026, scale[2] * 1.24),
    ]
  }

  function isFrontTranslucentPane(position: [number, number, number]) {
    return position[2] < -0.5 && position[1] > -0.2
  }

  function renderAmethystFragmentedPane(
    kind: string,
    pane: {
      position: [number, number, number]
      rotation: number
      scale: [number, number, number]
      color: string
      opacity: number
    },
    index: number,
  ) {
    if (!isFrontTranslucentPane(pane.position)) {
      return <AmethystFacetPlate key={`amethyst-geode-${kind}-${index}`} {...pane} />
    }

    const side = pane.position[0] >= 0 ? 1 : -1
    const seed = index + kind.length * 13
    const edgeFrontPane = Math.abs(pane.position[0]) > 0.38
    const inwardPull = edgeFrontPane ? 0.14 : 0.018

    return (
      <AmethystCloudedCrystalVolume
        key={`amethyst-geode-${kind}-collided-fragment-${index}`}
        position={[
          pane.position[0] - side * inwardPull + Math.sin(seed * 1.63) * 0.01,
          pane.position[1] + Math.cos(seed * 1.17) * 0.012,
          pane.position[2] + (edgeFrontPane ? 0.108 : 0.026) + Math.sin(seed * 1.41) * 0.01,
        ]}
        rotation={pane.rotation + side * 0.34 + Math.sin(seed * 0.83) * 0.28}
        rotationX={-0.26 + Math.cos(seed * 1.13) * 0.32}
        rotationY={side * 0.62 + Math.sin(seed * 1.37) * 0.28}
        scale={[
          Math.max(0.042, pane.scale[0] * (edgeFrontPane ? 0.14 : 0.42)),
          Math.max(0.052, pane.scale[1] * 0.62),
          0.052 + (index % 4) * 0.006,
        ]}
        color={pane.color}
        opacity={pane.opacity * (edgeFrontPane ? 0.18 : 0.72)}
        inset={0.118 + Math.min(0.046, Math.max(pane.scale[0], pane.scale[1]) * 0.1) + (edgeFrontPane ? 0.18 : 0)}
        skew={Math.sin(seed * 1.91) * 0.86}
      />
    )
  }

  function renderAmethystFrontCloudFragments(
    veil: {
      position: [number, number, number]
      rotation: number
      scale: [number, number, number]
      color: string
      opacity: number
    },
    index: number,
  ) {
    if (!isFrontTranslucentPane(veil.position)) {
      return <AmethystEmbeddedStoneRidge key={`amethyst-geode-cloud-front-embedded-rind-${index}`} {...veil} inset={0.082} />
    }

    const side = veil.position[0] >= 0 ? 1 : -1
    const edgeFrontVeil = Math.abs(veil.position[0]) > 0.38
    const pieceCount = edgeFrontVeil ? 1 : veil.scale[0] > 0.36 ? 3 : 2
    const inwardPull = edgeFrontVeil ? 0.145 : 0.01

    return (
      <group key={`amethyst-geode-cloud-front-colliding-fragments-${index}`}>
        {Array.from({ length: pieceCount }, (_, pieceIndex) => {
          const centerOffset = pieceIndex - (pieceCount - 1) / 2
          const seed = index * 11 + pieceIndex * 19
          const widthBias = 0.19 + (pieceIndex % 2) * 0.035
          const heightBias = 0.5 + (pieceIndex % 3) * 0.055

          return (
            <AmethystCloudedCrystalVolume
              key={`amethyst-geode-cloud-front-colliding-fragment-${index}-${pieceIndex}`}
              position={[
                veil.position[0] + centerOffset * veil.scale[0] * (edgeFrontVeil ? 0.08 : 0.28) - side * inwardPull + Math.sin(seed * 1.37) * 0.012,
                veil.position[1] + centerOffset * veil.scale[1] * 0.1 + Math.cos(seed * 1.11) * 0.014,
                veil.position[2] + (edgeFrontVeil ? 0.126 : 0.044) + Math.sin(seed * 1.53) * 0.012,
              ]}
              rotation={veil.rotation + centerOffset * 0.72 + Math.sin(seed * 0.77) * 0.34}
              rotationX={-0.34 + centerOffset * 0.24 + Math.cos(seed * 1.29) * 0.32}
              rotationY={side * 0.7 - centerOffset * 0.32 + Math.sin(seed * 1.61) * 0.28}
              scale={[
                Math.max(0.046, veil.scale[0] * widthBias * (edgeFrontVeil ? 0.26 : 1)),
                Math.max(0.06, veil.scale[1] * heightBias),
                0.056 + (pieceIndex % 3) * 0.007,
              ]}
              color={veil.color}
              opacity={veil.opacity * (0.58 + pieceIndex * 0.04) * (edgeFrontVeil ? 0.22 : 1)}
              inset={0.136 + Math.min(0.05, veil.scale[0] * 0.08) + (edgeFrontVeil ? 0.19 : 0)}
              skew={Math.sin(seed * 2.03) * 1.05}
            />
          )
        })}
      </group>
    )
  }

  return (
    <group>
      {internalPurpleRibbons.filter(outsideFaceWindow).map((layer, index) => (
        <AmethystStoneRidge key={`amethyst-geode-internal-layer-${index}`} {...layer} />
      ))}
      {rindBands.filter(outsideFaceWindow).map((band, index) => (
        <AmethystStoneRidge key={`amethyst-geode-rind-band-${index}`} {...band} />
      ))}
      {outerStone.filter(outsideFaceWindow).map((ridge, index) => (
        <AmethystStoneRidge key={`amethyst-geode-stone-${index}`} {...ridge} />
      ))}
      {quartzTransitionFacets.filter(outsideFaceWindow).map((pane, index) => renderAmethystFragmentedPane('quartz-transition', pane, index))}
      {upperCrystalSheets.filter(outsideFaceWindow).map((pane, index) => renderAmethystFragmentedPane('upper-crystal-sheet', pane, index))}
      {crystalPanes.filter(outsideFaceWindow).map((pane, index) => renderAmethystFragmentedPane('pane', pane, index))}
      {wraparoundCrystalSheets.filter(outsideFaceWindow).map((pane, index) => {
        if (isFrontTranslucentPane(pane.position)) {
          return renderAmethystFragmentedPane('wraparound-crystal-sheet', pane, index)
        }

        const topSilhouetteChip = isAmethystSideEdgeSlicePosition(pane.position)

        return (
          <AmethystFacetPlate
            key={`amethyst-geode-wraparound-crystal-sheet-${index}`}
            {...pane}
            scale={topSilhouetteChip ? [pane.scale[0] * 0.18, pane.scale[1] * 0.52, pane.scale[2]] : pane.scale}
            opacity={topSilhouetteChip ? pane.opacity * 0.16 : pane.opacity}
            inset={topSilhouetteChip ? 0.32 : 0.032}
          />
        )
      })}
      {topCrownFacetPads.filter(outsideFaceWindow).map((pane, index) => {
        const crownPose = getTopCapCloudPose(pane.position, index + 211, 1.22)

        return (
          <AmethystCloudedCrystalVolume
            key={`amethyst-geode-top-crown-facet-pad-${index}`}
            position={getTopCapCloudPosition(pane.position, index + 121, 2)}
            rotation={pane.rotation + crownPose.rotation}
            rotationX={crownPose.rotationX * 0.74}
            rotationY={crownPose.rotationY * 0.74}
            scale={[pane.scale[0] * 0.42, pane.scale[1] * 0.42, 0.056 + (index % 3) * 0.006]}
            color={pane.color}
            opacity={pane.opacity * 0.76}
            inset={0.18}
            skew={Math.sin(index * 2.47) * 0.74}
          />
        )
      })}
      {topCapLayeredSheets.filter(outsideFaceWindow).map((pane, index) => {
        const cloudPose = getTopCapCloudPose(pane.position, index, 1.65)

        return (
          <AmethystCloudedCrystalVolume
            key={`amethyst-geode-top-cap-cloud-volume-${index}`}
            {...pane}
            position={getTopCapCloudPosition(pane.position, index, 2)}
            rotation={pane.rotation + cloudPose.rotation}
            rotationX={cloudPose.rotationX}
            rotationY={cloudPose.rotationY}
            scale={getCollidedTopCapCloudScale(pane.position, pane.scale, index, 0)}
            opacity={getCollidedTopCapOpacity(pane.position, pane.opacity, 0.66)}
            inset={getCollidedTopCapInset(pane.position, 0.18)}
            skew={Math.sin(index * 1.91) * 0.72}
          />
        )
      })}
      {topCapLayeredSheets.filter(outsideFaceWindow).map((pane, index) => {
        const cloudPose = getTopCapCloudPose(pane.position, index + 23, -1.45)

        return (
          <AmethystCloudedCrystalVolume
            key={`amethyst-geode-top-cap-cross-cloud-volume-${index}`}
            {...pane}
            position={getTopCapCloudPosition(pane.position, index + 17, 3)}
            rotation={pane.rotation + Math.PI / 2.7 + cloudPose.rotation}
            rotationX={cloudPose.rotationX}
            rotationY={cloudPose.rotationY}
            scale={getCollidedTopCapCloudScale(pane.position, pane.scale, index, 1)}
            opacity={getCollidedTopCapOpacity(pane.position, pane.opacity, 0.62)}
            inset={getCollidedTopCapInset(pane.position, 0.198)}
            skew={Math.cos(index * 2.21) * 0.88}
          />
        )
      })}
      {topCapLayeredSheets.filter(outsideFaceWindow).map((pane, index) => {
        const cloudPose = getTopCapCloudPose(pane.position, index + 113, index % 2 === 0 ? 2.35 : -2.15)
        const directionKick = index % 2 === 0 ? 0.86 : -0.86

        return (
          <AmethystCloudedCrystalVolume
            key={`amethyst-geode-top-cap-deep-collision-cloud-${index}`}
            {...pane}
            position={getTopCapCloudPosition(pane.position, index + 43, 5)}
            rotation={pane.rotation - Math.PI / 1.72 + cloudPose.rotation}
            rotationX={cloudPose.rotationX + directionKick}
            rotationY={cloudPose.rotationY - directionKick * 0.9}
            scale={getCollidedTopCapCloudScale(pane.position, pane.scale, index, 2)}
            opacity={getCollidedTopCapOpacity(pane.position, pane.opacity, 0.54)}
            inset={getCollidedTopCapInset(pane.position, 0.244)}
            skew={Math.sin(index * 2.57 + 0.8) * 1.1}
          />
        )
      })}
      {topCapLayeredSheets.filter(outsideFaceWindow).map((pane, index) => {
        const cloudPose = getTopCapCloudPose(pane.position, index + 173, index % 2 === 0 ? -2.65 : 2.55)
        const directionKick = index % 2 === 0 ? -1.1 : 1.1

        return (
          <AmethystCloudedCrystalVolume
            key={`amethyst-geode-top-cap-low-density-collision-cloud-${index}`}
            {...pane}
            position={getTopCapCloudPosition(pane.position, index + 89, 6)}
            rotation={pane.rotation + Math.PI / 1.18 + cloudPose.rotation}
            rotationX={cloudPose.rotationX + directionKick * 0.72}
            rotationY={cloudPose.rotationY + directionKick}
            scale={getCollidedTopCapCloudScale(pane.position, pane.scale, index, 3)}
            opacity={getCollidedTopCapOpacity(pane.position, pane.opacity, 0.48)}
            inset={getCollidedTopCapInset(pane.position, 0.266)}
            skew={Math.cos(index * 2.93 + 0.5) * 1.28}
          />
        )
      })}
      {topCapLayeredBands.filter(outsideFaceWindow).map((band, index) => {
        const cloudPose = getTopCapCloudPose(band.position, index + 41, 1.35)
        const frontBand = band.position[2] < -0.22
        const sideTopBand = isAmethystSideEdgeSlicePosition(band.position)

        return (
          <AmethystEmbeddedStoneRidge
            key={`amethyst-geode-top-cap-layered-band-${index}`}
            {...band}
            position={getTopCapCloudPosition(band.position, index + 9, 3)}
            rotation={band.rotation + cloudPose.rotation * 0.86}
            rotationX={cloudPose.rotationX * 0.78}
            rotationY={cloudPose.rotationY * 0.78}
            scale={[band.scale[0] * (frontBand ? (sideTopBand ? 0.22 : 0.72) : (sideTopBand ? 0.28 : 1.28)), band.scale[1] * (frontBand ? (sideTopBand ? 0.42 : 0.62) : 0.46), band.scale[2] * (frontBand ? 2.65 : 2.05)]}
            opacity={band.opacity * (frontBand ? (sideTopBand ? 0.28 : 0.82) : (sideTopBand ? 0.24 : 1.18))}
            inset={(band.inset ?? 0.026) + (frontBand ? (sideTopBand ? 0.34 : 0.15) : (sideTopBand ? 0.32 : 0.09))}
          />
        )
      })}
      {topCapLayeredBands.filter(outsideFaceWindow).map((band, index) => {
        if (index % 2 === 1) return null

        const cloudPose = getTopCapCloudPose(band.position, index + 91, -1.75)
        const sideTopBand = isAmethystSideEdgeSlicePosition(band.position)

        return (
          <AmethystCloudedCrystalVolume
            key={`amethyst-geode-top-cap-band-collision-cloud-${index}`}
            position={getTopCapCloudPosition(band.position, index + 63, 5)}
            rotation={band.rotation + Math.PI / 2 + cloudPose.rotation}
            rotationX={cloudPose.rotationX}
            rotationY={cloudPose.rotationY}
            scale={[band.scale[0] * (sideTopBand ? 0.24 : 0.86), band.scale[1] * (sideTopBand ? 0.28 : 0.42), 0.056 + (index % 4) * 0.005]}
            color={band.color}
            opacity={band.opacity * (sideTopBand ? 0.18 : 0.74)}
            inset={(band.inset ?? 0.026) + (sideTopBand ? 0.34 : 0.154)}
            skew={Math.cos(index * 2.11) * 1.2}
          />
        )
      })}
      {tippyTopRoughCrystals.filter(outsideFaceWindow).map((chip, index) => (
        <AmethystCloudedCrystalVolume
          key={`amethyst-geode-tippy-top-rough-chip-${index}`}
          position={getTippyTopRoughPosition(chip.position, index + 301)}
          rotation={chip.rotation}
          rotationX={chip.rotationX}
          rotationY={chip.rotationY}
          scale={chip.scale}
          color={chip.color}
          opacity={chip.opacity}
          inset={chip.inset}
          skew={chip.skew}
        />
      ))}
      {tippyTopDarkPockets.filter(outsideFaceWindow).map((pocket, index) => (
        <AmethystEmbeddedStoneRidge
          key={`amethyst-geode-tippy-top-dark-pocket-${index}`}
          {...pocket}
          position={getTippyTopRoughPosition(pocket.position, index + 361)}
          inset={0.048}
        />
      ))}
      {tippyTopSurfaceRidges.filter(outsideFaceWindow).map((ridge, index) => (
        <AmethystSurfaceRoughPatch
          key={`amethyst-geode-tippy-top-surface-ridge-${index}`}
          {...ridge}
        />
      ))}
      {cloudyInclusions.filter(outsideFaceWindow).map((cloud, index) => (
        <AmethystStoneRidge key={`amethyst-geode-cloudy-inclusion-${index}`} {...cloud} />
      ))}
      {cloudyFrontVeils.filter(outsideFaceWindow).map((veil, index) => renderAmethystFrontCloudFragments(veil, index))}
      {wraparoundCloudDepth.filter(outsideFaceWindow).map((cloud, index) => {
        const sideEdgeCloud = isAmethystSideEdgeSlicePosition(cloud.position)

        if (sideEdgeCloud) {
          return (
            <AmethystEmbeddedStoneRidge
              key={`amethyst-geode-wraparound-cloud-depth-tucked-${index}`}
              {...cloud}
              scale={[cloud.scale[0] * 0.28, cloud.scale[1] * 0.54, cloud.scale[2] * 1.28]}
              opacity={cloud.opacity * 0.22}
              inset={0.32}
            />
          )
        }

        return <AmethystStoneRidge key={`amethyst-geode-wraparound-cloud-depth-${index}`} {...cloud} />
      })}
      {cloudyWisps.filter(outsideFaceWindow).map((wisp, index) => {
        const tuckedWisp = isAmethystSideEdgeSlicePosition(wisp.position) || isAmethystCrownFringeStrokePosition(wisp.position)
        const crownWisp = wisp.position[1] > 0.48

        return (
          <OrganicDetailStroke
            key={`amethyst-geode-cloud-wisp-${index}`}
            position={tuckedWisp ? getTuckedAmethystEdgeStrokePosition(wisp.position, index) : wisp.position}
            rotation={wisp.rotation}
            scale={tuckedWisp ? getTuckedAmethystEdgeStrokeScale(wisp.scale, index) : crownWisp ? [wisp.scale[0] * 2.1, wisp.scale[1] * 0.3, wisp.scale[2]] : wisp.scale}
            color={wisp.color}
            opacity={tuckedWisp ? wisp.opacity * 0.1 : crownWisp ? wisp.opacity * 0.42 : wisp.opacity}
            depthTest
          />
        )
      })}
      {wraparoundPolishStrokes.filter(outsideFaceWindow).map((stroke, index) => {
        const sideEdgeStroke = isAmethystSideEdgeSlicePosition(stroke.position)
        const crownStroke = stroke.position[1] > 0.62 || (stroke.position[1] > 0.5 && Math.abs(stroke.position[2]) > 0.44)

        return (
          <OrganicDetailStroke
            key={`amethyst-geode-wraparound-polish-stroke-${index}`}
            position={sideEdgeStroke ? getTuckedAmethystEdgeStrokePosition(stroke.position, index + 19) : stroke.position}
            rotation={stroke.rotation}
            scale={sideEdgeStroke ? getTuckedAmethystEdgeStrokeScale(stroke.scale, index + 19) : crownStroke ? [stroke.scale[0] * 2, stroke.scale[1] * 0.34, stroke.scale[2]] : stroke.scale}
            color={stroke.color}
            opacity={sideEdgeStroke ? stroke.opacity * 0.1 : crownStroke ? stroke.opacity * 0.36 : stroke.opacity}
            depthTest
          />
        )
      })}
      {cloudySpecks.filter(outsideFaceWindow).map((speck, index) => (
        <OrganicDetailDot
          key={`amethyst-geode-cloud-speck-${index}`}
          position={speck.position}
          scale={speck.scale}
          color={speck.color}
          opacity={speck.opacity}
          depthTest
        />
      ))}
      {groundOpacityGradient.filter(outsideFaceWindow).map((band, index) => (
        <AmethystStoneRidge key={`amethyst-geode-ground-opacity-gradient-${index}`} {...band} />
      ))}
      {crystalCrust.filter(outsideFaceWindow).map((crust, index) => (
        <AmethystEmbeddedCrystalCrust key={`amethyst-geode-crust-${index}`} {...crust} />
      ))}
      {veins.filter(outsideFaceWindow).map((vein, index) => (
        (() => {
          const tuckedVein = isAmethystSideEdgeSlicePosition(vein.position) || isAmethystCrownFringeStrokePosition(vein.position)

          return (
            <OrganicDetailStroke
              key={`amethyst-geode-vein-${index}`}
              position={tuckedVein ? getTuckedAmethystEdgeStrokePosition(vein.position, index + 43) : vein.position}
              rotation={vein.rotation}
              scale={tuckedVein ? getTuckedAmethystEdgeStrokeScale(vein.scale, index + 43) : vein.scale}
              color={vein.color}
              opacity={tuckedVein ? vein.opacity * 0.12 : vein.opacity}
              depthTest
            />
          )
        })()
      ))}
      {shards.filter(outsideFaceWindow).map((shard, index) => (
        <AmethystCrystalShard key={`amethyst-geode-shard-${index}`} {...shard} />
      ))}
      {wraparoundCrystalOvergrowth.filter(outsideFaceWindow).map((shard, index) => (
        <AmethystCrystalShard key={`amethyst-geode-wraparound-crystal-overgrowth-${index}`} {...shard} />
      ))}
      {topCrownCrystalOvergrowth.filter(outsideFaceWindow).map((shard, index) => (
        <AmethystCrystalShard key={`amethyst-geode-top-crown-crystal-overgrowth-${index}`} {...shard} />
      ))}
      {grit.filter(outsideFaceWindow).map((dot, index) => (
        <OrganicDetailDot
          key={`amethyst-geode-grit-${index}`}
          position={dot.position}
          scale={dot.scale}
          color={dot.color}
          opacity={dot.opacity}
          depthTest
        />
      ))}
      {facetFlashes.filter(outsideFaceWindow).map((flash, index) => (
        <AmethystDancingFacetFlash key={`amethyst-geode-dancing-facet-flash-${index}`} {...flash} />
      ))}
      {sparkleBursts.filter(outsideFaceWindow).map((burst, index) => (
        <AmethystSparkleBurst key={`amethyst-geode-sparkle-burst-${index}`} {...burst} />
      ))}
      {glints.filter(outsideFaceWindow).map((glint, index) => (
        <AmethystGeodeGlint key={`amethyst-geode-glint-${index}`} {...glint} />
      ))}
      {wraparoundGlints.filter(outsideFaceWindow).map((glint, index) => (
        <AmethystGeodeGlint key={`amethyst-geode-wraparound-glint-${index}`} {...glint} />
      ))}
      {topCrownGlints.filter(outsideFaceWindow).map((glint, index) => (
        <AmethystGeodeGlint key={`amethyst-geode-top-crown-glint-${index}`} {...glint} />
      ))}
    </group>
  )
}

function AeroRacingStripe() {
  const stripeGeometry = useMemo(() => createAeroCenterStripeGeometry(), [])
  const pinstripeGeometry = useMemo(() => createAeroCenterStripeGeometry(0.24), [])

  useEffect(
    () => () => {
      stripeGeometry.dispose()
      pinstripeGeometry.dispose()
    },
    [pinstripeGeometry, stripeGeometry],
  )

  return (
    <group>
      <CodedAssetOutlineMesh
        outlineWidth={0.005}
        outlineColor={AERO_SHELL_BLACK_PURPLE}
        geometry={<primitive object={stripeGeometry} attach="geometry" />}
        material={metal(AERO_SHELL_HOT, 0.19)}
      />
      <mesh position={[0, 0.018, 0]}>
        <primitive object={pinstripeGeometry} attach="geometry" />
        {metal(AERO_BUTTON_CYAN, 0.16)}
      </mesh>
    </group>
  )
}

function AeroFrontNose() {
  const noseGeometry = useMemo(() => createAeroFrontNoseGeometry(), [])
  const sides = [-1, 1] as const

  useEffect(() => () => noseGeometry.dispose(), [noseGeometry])

  return (
    <group>
      <CodedAssetOutlineMesh
        outlineWidth={0.007}
        outlineColor={AERO_SHELL_BLACK_PURPLE}
        geometry={<primitive object={noseGeometry} attach="geometry" />}
        material={metal(AERO_SHELL_DARK, 0.23)}
      />
      <mesh position={[0, -0.381, -0.785]} scale={[0.205, 0.011, 0.022]}>
        <sphereGeometry args={[1, 12, 5]} />
        {metal(AERO_SHELL_HOT, 0.17)}
      </mesh>
      {sides.map((side) => (
        <CodedAssetOutlineMesh
          key={`aero-front-lamp-${side}`}
          position={[side * 0.395, -0.378, -0.798]}
          rotation-z={side * 0.12}
          scale={[0.13, 0.031, 0.015]}
          outlineWidth={0.004}
          outlineColor={AERO_SHELL_BLACK_PURPLE}
          geometry={<sphereGeometry args={[1, 12, 5]} />}
          material={metal(AERO_BUTTON_CYAN, 0.15)}
        />
      ))}
    </group>
  )
}

function AeroMetalShellTexture() {
  const sides = [-1, 1] as const

  return (
    <group>
      <AeroRacingStripe />

      <CodedAssetOutlineMesh
        position={[0, 0.39, -0.615]}
        rotation-x={0.1}
        scale={[0.395, 0.058, 0.048]}
        outlineWidth={0.005}
        outlineColor={AERO_SHELL_BLACK_PURPLE}
        geometry={<sphereGeometry args={[1, 16, 7]} />}
        material={metal(AERO_SHELL_DEEP, 0.2)}
      />
      <mesh position={[0, 0.415, -0.65]} rotation-x={0.1} scale={[0.245, 0.011, 0.009]}>
        <sphereGeometry args={[1, 12, 5]} />
        {metal(AERO_BUTTON_CYAN, 0.16)}
      </mesh>

      {sides.map((side) => (
        <mesh
          key={`aero-hood-vent-${side}`}
          position={[side * 0.235, 0.405, -0.52]}
          rotation-y={side * -0.24}
          rotation-z={side * -0.08}
          scale={[0.105, 0.014, 0.048]}
        >
          <sphereGeometry args={[1, 10, 5]} />
          <meshStandardMaterial color={AERO_SHELL_BLACK_PURPLE} metalness={0.28} roughness={0.36} />
        </mesh>
      ))}

      {sides.map((side) => (
        <group key={`aero-racer-side-${side}`}>
          <CodedAssetOutlineMesh
            position={[side * 0.772, 0.025, 0.205]}
            rotation-y={side * -0.16}
            scale={[0.046, 0.125, 0.255]}
            outlineWidth={0.005}
            outlineColor={AERO_SHELL_BLACK_PURPLE}
            geometry={<sphereGeometry args={[1, 14, 7]} />}
            material={metal(AERO_SHELL_BLACK_PURPLE, 0.32)}
          />
          <mesh
            position={[side * 0.808, 0.025, 0.185]}
            rotation-y={side * -0.16}
            scale={[0.012, 0.055, 0.145]}
          >
            <sphereGeometry args={[1, 10, 5]} />
            {metal(AERO_PANEL_SILVER, 0.24)}
          </mesh>

          <CodedAssetOutlineMesh
            position={[side * 0.745, -0.433, 0.065]}
            scale={[0.055, 0.048, 0.5]}
            outlineWidth={0.005}
            outlineColor={AERO_SHELL_BLACK_PURPLE}
            geometry={<sphereGeometry args={[1, 14, 6]} />}
            material={metal(AERO_SHELL_DEEP, 0.24)}
          />
          <mesh position={[side * 0.79, -0.408, -0.035]} scale={[0.01, 0.012, 0.345]}>
            <sphereGeometry args={[1, 8, 4]} />
            {metal(side === -1 ? AERO_BUTTON_CYAN : AERO_BUTTON_ROSE, 0.18)}
          </mesh>
          <CurvedTube
            points={[
              [side * 0.794, 0.17, -0.12],
              [side * 0.815, 0.155, 0.06],
              [side * 0.817, 0.08, 0.245],
              [side * 0.8, -0.025, 0.37],
            ]}
            radius={0.014}
            color={AERO_PANEL_SILVER}
            outlineWidth={0.0025}
          />
        </group>
      ))}

      <AeroFrontNose />
    </group>
  )
}

function AeroMetalRaceFins() {
  const spoilerGeometry = useMemo(() => createAeroSpoilerWingGeometry(), [])
  const sides = [-1, 1] as const

  useEffect(
    () => () => {
      spoilerGeometry.dispose()
    },
    [spoilerGeometry],
  )

  return (
    <group>
      {sides.map((side) => (
        <CodedAssetOutlineMesh
          key={`aero-spoiler-pylon-${side}`}
          position={[side * 0.39, 0.42, 0.53]}
          rotation-x={-0.16}
          rotation-z={side * -0.045}
          outlineWidth={0.005}
          outlineColor={AERO_SHELL_BLACK_PURPLE}
          geometry={<cylinderGeometry args={[0.044, 0.062, 0.19, 10]} />}
          material={metal(AERO_PANEL_SILVER, 0.22)}
        />
      ))}
      <CodedAssetOutlineMesh
        position={[0, 0.525, 0.61]}
        rotation-x={0.055}
        outlineWidth={0.007}
        outlineColor={AERO_SHELL_BLACK_PURPLE}
        geometry={<primitive object={spoilerGeometry} attach="geometry" />}
        material={metal(AERO_SHELL_MID, 0.17)}
      />
      <mesh position={[0, 0.561, 0.585]} rotation-x={0.055} scale={[0.505, 0.01, 0.047]}>
        <boxGeometry args={[1, 1, 1]} />
        {metal(AERO_SHELL_HOT, 0.16)}
      </mesh>
      {sides.map((side) => (
        <CodedAssetOutlineMesh
          key={`aero-spoiler-endplate-${side}`}
          position={[side * 0.68, 0.525, 0.61]}
          rotation-x={0.055}
          rotation-z={side * -0.04}
          scale={[0.034, 0.098, 0.145]}
          outlineWidth={0.004}
          outlineColor={AERO_SHELL_BLACK_PURPLE}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          material={metal(AERO_SHELL_DEEP, 0.23)}
        />
      ))}

      <CodedAssetOutlineMesh
        position={[0, -0.075, 0.715]}
        scale={[0.515, 0.205, 0.064]}
        outlineWidth={0.006}
        outlineColor={AERO_SHELL_BLACK_PURPLE}
        geometry={<sphereGeometry args={[1, 14, 7]} />}
        material={metal(AERO_SHELL_MID, 0.22)}
      />
      {sides.map((side) => (
        <CodedAssetOutlineMesh
          key={`aero-rear-tail-light-${side}`}
          position={[side * 0.275, 0.02, 0.773]}
          rotation-z={side * -0.08}
          scale={[0.13, 0.055, 0.018]}
          outlineWidth={0.0035}
          outlineColor={AERO_SHELL_BLACK_PURPLE}
          geometry={<sphereGeometry args={[1, 10, 5]} />}
          material={metal(AERO_BUTTON_ROSE, 0.17)}
        />
      ))}
      <mesh position={[0, -0.15, 0.784]} scale={[0.28, 0.012, 0.011]}>
        <sphereGeometry args={[1, 12, 5]} />
        {metal(AERO_BUTTON_CYAN, 0.18)}
      </mesh>
      <mesh position={[0, -0.075, 0.785]} scale={[0.16, 0.04, 0.01]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshStandardMaterial color={AERO_SHELL_BLACK_PURPLE} metalness={0.3} roughness={0.4} />
      </mesh>

      {sides.map((side) => (
        <group key={`aero-rear-drive-${side}`} position={[side * 0.22, -0.31, 0.745]} rotation-x={Math.PI / 2}>
          <CodedAssetOutlineMesh
            outlineWidth={0.005}
            outlineColor={AERO_SHELL_BLACK_PURPLE}
            geometry={<cylinderGeometry args={[0.055, 0.073, 0.085, 12]} />}
            material={metal(AERO_PANEL_SILVER, 0.24)}
          />
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.033, 0.043, 0.022, 12]} />
            <meshStandardMaterial color={AERO_SHELL_BLACK_PURPLE} metalness={0.34} roughness={0.34} />
          </mesh>
        </group>
      ))}
      {[-0.31, 0, 0.31].map((offset) => (
        <mesh key={`aero-rear-diffuser-${offset}`} position={[offset, -0.455, 0.675]} rotation-x={-0.16} scale={[0.028, 0.1, 0.12]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={AERO_SHELL_BLACK_PURPLE} metalness={0.32} roughness={0.38} />
        </mesh>
      ))}
    </group>
  )
}

function crystalGlassMaterial(opacity = 0.72, color = CRYSTAL_GLASS) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.16}
      metalness={0}
      transparent
      opacity={opacity}
      transmission={0.06}
      thickness={0.68}
      ior={1.58}
      clearcoat={1}
      clearcoatRoughness={0.095}
      depthWrite={false}
    />
  )
}

function CrystalFacetPane({
  position,
  rotation = 0,
  scale,
  color = CRYSTAL_GLASS_WARM,
  opacity = 0.2,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color?: string
  opacity?: number
}) {
  return (
    <mesh position={position} rotation-z={rotation} scale={scale}>
      <circleGeometry args={[1, 3]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

function CrystalGlint({
  position,
  scale = 1,
  opacity = 0.8,
}: {
  position: [number, number, number]
  scale?: number
  opacity?: number
}) {
  return (
    <group position={position}>
      <OrganicDetailStroke
        position={[0, 0, 0]}
        rotation={0}
        scale={[0.006 * scale, 0.06 * scale, 0.003]}
        color={CRYSTAL_GLINT}
        opacity={opacity}
        depthTest
      />
      <OrganicDetailStroke
        position={[0, 0, 0]}
        rotation={Math.PI / 2}
        scale={[0.006 * scale, 0.052 * scale, 0.003]}
        color={CRYSTAL_GLINT}
        opacity={opacity * 0.88}
        depthTest
      />
      <OrganicDetailStroke
        position={[0, 0, 0]}
        rotation={Math.PI / 4}
        scale={[0.004 * scale, 0.038 * scale, 0.003]}
        color={CRYSTAL_GLASS_WARM}
        opacity={opacity * 0.54}
        depthTest
      />
      <OrganicDetailDot
        position={[0, 0, -0.004]}
        scale={[0.01 * scale, 0.01 * scale, 0.004]}
        color={CRYSTAL_GLINT}
        opacity={opacity}
        depthTest
      />
    </group>
  )
}

function CrystalSparkleFleck({
  position,
  rotation = 0,
  scale = 1,
  color = CRYSTAL_GLINT,
  opacity = 0.72,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  color?: string
  opacity?: number
}) {
  return (
    <group position={position} rotation-z={rotation}>
      <OrganicDetailDot
        position={[0, 0, -0.004]}
        scale={[0.009 * scale, 0.009 * scale, 0.003]}
        color={color}
        opacity={opacity}
        depthTest
      />
      <OrganicDetailStroke
        position={[0.001, 0, -0.006]}
        rotation={Math.PI / 4}
        scale={[0.004 * scale, 0.034 * scale, 0.002]}
        color={color}
        opacity={opacity * 0.64}
        depthTest
      />
    </group>
  )
}

function CrystalGritSparkle({
  position,
  rotation = 0,
  scale = 1,
  color = CRYSTAL_GLINT,
  opacity = 0.48,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  color?: string
  opacity?: number
}) {
  return (
    <group position={position} rotation-z={rotation}>
      <OrganicDetailDot
        position={[0, 0, -0.005]}
        scale={[0.0045 * scale, 0.0035 * scale, 0.002]}
        color={color}
        opacity={opacity}
        depthTest
      />
      <OrganicDetailStroke
        position={[0.003 * scale, -0.001 * scale, -0.006]}
        rotation={0.18}
        scale={[0.0018 * scale, 0.018 * scale, 0.0015]}
        color={color}
        opacity={opacity * 0.48}
        depthTest
      />
    </group>
  )
}

function CrystalShellSurfaceTexture() {
  const panes: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.42, 0.24, -0.63], rotation: -0.45, scale: [0.16, 0.15, 1], color: CRYSTAL_GLINT, opacity: 0.24 },
    { position: [-0.15, 0.36, -0.655], rotation: 0.28, scale: [0.22, 0.18, 1], color: CRYSTAL_GLASS_WARM, opacity: 0.3 },
    { position: [0.18, 0.32, -0.65], rotation: -0.2, scale: [0.2, 0.16, 1], color: CRYSTAL_GLASS_BLUE, opacity: 0.32 },
    { position: [0.46, 0.12, -0.63], rotation: 0.45, scale: [0.14, 0.18, 1], color: CRYSTAL_GLINT, opacity: 0.22 },
    { position: [-0.48, -0.12, -0.64], rotation: 0.22, scale: [0.15, 0.2, 1], color: CRYSTAL_GLASS_LAVENDER, opacity: 0.28 },
    { position: [0.44, -0.18, -0.64], rotation: -0.34, scale: [0.16, 0.2, 1], color: CRYSTAL_GLASS_WARM, opacity: 0.26 },
    { position: [-0.14, -0.44, -0.61], rotation: -0.14, scale: [0.2, 0.13, 1], color: CRYSTAL_GLASS_BLUE, opacity: 0.3 },
    { position: [0.2, -0.42, -0.61], rotation: 0.28, scale: [0.18, 0.14, 1], color: CRYSTAL_GLINT, opacity: 0.22 },
  ]
  const seams: Array<{ position: [number, number, number]; rotation: number; scale: [number, number, number]; opacity: number }> = [
    { position: [-0.32, 0.16, -0.69], rotation: -0.68, scale: [0.006, 0.23, 0.003], opacity: 0.34 },
    { position: [-0.08, 0.28, -0.695], rotation: 0.78, scale: [0.005, 0.24, 0.003], opacity: 0.34 },
    { position: [0.18, 0.16, -0.695], rotation: -0.58, scale: [0.006, 0.22, 0.003], opacity: 0.32 },
    { position: [0.36, -0.06, -0.682], rotation: 0.5, scale: [0.005, 0.2, 0.003], opacity: 0.3 },
    { position: [-0.44, -0.18, -0.678], rotation: 0.62, scale: [0.005, 0.2, 0.003], opacity: 0.3 },
    { position: [-0.04, -0.36, -0.668], rotation: -0.82, scale: [0.005, 0.26, 0.003], opacity: 0.28 },
    { position: [0.28, -0.36, -0.666], rotation: 0.72, scale: [0.005, 0.22, 0.003], opacity: 0.28 },
    { position: [0.0, 0.5, -0.62], rotation: Math.PI / 2, scale: [0.005, 0.22, 0.003], opacity: 0.26 },
  ]
  const glints: Array<{ position: [number, number, number]; scale: number; opacity: number }> = [
    { position: [-0.34, 0.26, -0.72], scale: 1.05, opacity: 0.9 },
    { position: [0.02, 0.36, -0.73], scale: 1.12, opacity: 0.94 },
    { position: [0.34, 0.02, -0.715], scale: 0.92, opacity: 0.86 },
    { position: [-0.48, -0.1, -0.71], scale: 0.78, opacity: 0.78 },
    { position: [0.18, -0.34, -0.7], scale: 0.86, opacity: 0.82 },
    { position: [-0.08, -0.48, -0.68], scale: 0.66, opacity: 0.68 },
    { position: [-0.2, 0.06, -0.738], scale: 0.7, opacity: 0.76 },
    { position: [0.47, 0.22, -0.68], scale: 0.66, opacity: 0.76 },
    { position: [-0.36, -0.32, -0.66], scale: 0.58, opacity: 0.66 },
    { position: [0.52, -0.12, -0.65], scale: 0.54, opacity: 0.7 },
  ]
  const flecks: Array<{
    position: [number, number, number]
    rotation: number
    scale: number
    color: string
    opacity: number
  }> = [
    { position: [-0.5, 0.34, -0.665], rotation: -0.35, scale: 0.62, color: CRYSTAL_GLINT, opacity: 0.68 },
    { position: [-0.31, 0.43, -0.696], rotation: 0.18, scale: 0.48, color: CRYSTAL_GLASS_WARM, opacity: 0.62 },
    { position: [-0.08, 0.49, -0.706], rotation: -0.52, scale: 0.56, color: CRYSTAL_GLINT, opacity: 0.7 },
    { position: [0.2, 0.46, -0.695], rotation: 0.42, scale: 0.5, color: CRYSTAL_GLASS_WARM, opacity: 0.64 },
    { position: [0.42, 0.33, -0.666], rotation: -0.18, scale: 0.58, color: CRYSTAL_GLINT, opacity: 0.68 },
    { position: [-0.57, 0.1, -0.67], rotation: 0.54, scale: 0.44, color: CRYSTAL_GLASS_BLUE, opacity: 0.56 },
    { position: [-0.22, 0.16, -0.728], rotation: -0.1, scale: 0.46, color: CRYSTAL_GLINT, opacity: 0.66 },
    { position: [0.08, 0.18, -0.742], rotation: 0.28, scale: 0.4, color: CRYSTAL_GLASS_WARM, opacity: 0.58 },
    { position: [0.32, 0.16, -0.72], rotation: -0.48, scale: 0.52, color: CRYSTAL_GLINT, opacity: 0.68 },
    { position: [0.57, 0.02, -0.642], rotation: 0.2, scale: 0.42, color: CRYSTAL_GLASS_BLUE, opacity: 0.56 },
    { position: [-0.55, -0.18, -0.646], rotation: -0.26, scale: 0.46, color: CRYSTAL_GLINT, opacity: 0.58 },
    { position: [-0.28, -0.2, -0.714], rotation: 0.36, scale: 0.52, color: CRYSTAL_GLASS_WARM, opacity: 0.62 },
    { position: [0.06, -0.18, -0.734], rotation: -0.4, scale: 0.48, color: CRYSTAL_GLINT, opacity: 0.62 },
    { position: [0.32, -0.2, -0.704], rotation: 0.16, scale: 0.44, color: CRYSTAL_GLASS_BLUE, opacity: 0.56 },
    { position: [-0.36, -0.42, -0.63], rotation: 0.22, scale: 0.38, color: CRYSTAL_GLINT, opacity: 0.52 },
    { position: [-0.1, -0.46, -0.666], rotation: -0.34, scale: 0.44, color: CRYSTAL_GLASS_WARM, opacity: 0.56 },
    { position: [0.19, -0.48, -0.662], rotation: 0.5, scale: 0.4, color: CRYSTAL_GLINT, opacity: 0.54 },
    { position: [0.46, -0.36, -0.63], rotation: -0.12, scale: 0.36, color: CRYSTAL_GLASS_BLUE, opacity: 0.5 },
  ]
  const grit: Array<{
    position: [number, number, number]
    rotation: number
    scale: number
    color: string
    opacity: number
  }> = [
    { position: [-0.54, 0.26, -0.655], rotation: 0.1, scale: 0.74, color: CRYSTAL_GLINT, opacity: 0.52 },
    { position: [-0.45, 0.43, -0.664], rotation: -0.62, scale: 0.62, color: CRYSTAL_GLASS_WARM, opacity: 0.48 },
    { position: [-0.34, 0.36, -0.704], rotation: 0.32, scale: 0.56, color: CRYSTAL_GLINT, opacity: 0.5 },
    { position: [-0.19, 0.45, -0.72], rotation: -0.18, scale: 0.5, color: CRYSTAL_GLASS_BLUE, opacity: 0.46 },
    { position: [-0.02, 0.48, -0.726], rotation: 0.72, scale: 0.58, color: CRYSTAL_GLINT, opacity: 0.54 },
    { position: [0.13, 0.43, -0.722], rotation: -0.4, scale: 0.5, color: CRYSTAL_GLASS_WARM, opacity: 0.48 },
    { position: [0.29, 0.39, -0.692], rotation: 0.24, scale: 0.58, color: CRYSTAL_GLINT, opacity: 0.52 },
    { position: [0.47, 0.26, -0.648], rotation: -0.1, scale: 0.66, color: CRYSTAL_GLASS_LAVENDER, opacity: 0.48 },
    { position: [-0.58, 0.08, -0.648], rotation: -0.5, scale: 0.54, color: CRYSTAL_GLINT, opacity: 0.46 },
    { position: [-0.42, 0.08, -0.702], rotation: 0.18, scale: 0.52, color: CRYSTAL_GLASS_BLUE, opacity: 0.44 },
    { position: [-0.27, 0.07, -0.728], rotation: -0.8, scale: 0.6, color: CRYSTAL_GLINT, opacity: 0.52 },
    { position: [-0.1, 0.08, -0.742], rotation: 0.42, scale: 0.48, color: CRYSTAL_GLASS_WARM, opacity: 0.46 },
    { position: [0.06, 0.06, -0.744], rotation: -0.26, scale: 0.56, color: CRYSTAL_GLINT, opacity: 0.5 },
    { position: [0.23, 0.08, -0.73], rotation: 0.64, scale: 0.52, color: CRYSTAL_GLASS_BLUE, opacity: 0.44 },
    { position: [0.39, 0.06, -0.696], rotation: -0.54, scale: 0.58, color: CRYSTAL_GLINT, opacity: 0.5 },
    { position: [0.55, -0.02, -0.638], rotation: 0.34, scale: 0.5, color: CRYSTAL_GLASS_WARM, opacity: 0.44 },
    { position: [-0.53, -0.09, -0.656], rotation: 0.28, scale: 0.46, color: CRYSTAL_GLINT, opacity: 0.44 },
    { position: [-0.37, -0.1, -0.704], rotation: -0.18, scale: 0.54, color: CRYSTAL_GLASS_LAVENDER, opacity: 0.42 },
    { position: [-0.2, -0.08, -0.73], rotation: 0.76, scale: 0.5, color: CRYSTAL_GLINT, opacity: 0.48 },
    { position: [-0.03, -0.08, -0.742], rotation: -0.44, scale: 0.58, color: CRYSTAL_GLASS_WARM, opacity: 0.46 },
    { position: [0.14, -0.09, -0.736], rotation: 0.16, scale: 0.5, color: CRYSTAL_GLINT, opacity: 0.48 },
    { position: [0.3, -0.1, -0.704], rotation: -0.68, scale: 0.54, color: CRYSTAL_GLASS_BLUE, opacity: 0.44 },
    { position: [0.47, -0.12, -0.66], rotation: 0.5, scale: 0.46, color: CRYSTAL_GLINT, opacity: 0.44 },
    { position: [-0.43, -0.27, -0.646], rotation: -0.3, scale: 0.48, color: CRYSTAL_GLASS_WARM, opacity: 0.42 },
    { position: [-0.29, -0.3, -0.69], rotation: 0.18, scale: 0.54, color: CRYSTAL_GLINT, opacity: 0.48 },
    { position: [-0.1, -0.31, -0.71], rotation: -0.7, scale: 0.46, color: CRYSTAL_GLASS_BLUE, opacity: 0.42 },
    { position: [0.08, -0.31, -0.71], rotation: 0.56, scale: 0.52, color: CRYSTAL_GLINT, opacity: 0.48 },
    { position: [0.27, -0.31, -0.684], rotation: -0.22, scale: 0.48, color: CRYSTAL_GLASS_WARM, opacity: 0.42 },
    { position: [0.43, -0.28, -0.64], rotation: 0.38, scale: 0.44, color: CRYSTAL_GLINT, opacity: 0.44 },
    { position: [-0.26, -0.44, -0.624], rotation: 0.82, scale: 0.4, color: CRYSTAL_GLASS_BLUE, opacity: 0.4 },
    { position: [-0.03, -0.46, -0.648], rotation: -0.32, scale: 0.44, color: CRYSTAL_GLINT, opacity: 0.44 },
    { position: [0.2, -0.44, -0.632], rotation: 0.18, scale: 0.4, color: CRYSTAL_GLASS_WARM, opacity: 0.4 },
  ]
  const gritScratches: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = [
    { position: [-0.42, 0.34, -0.69], rotation: -0.68, scale: [0.004, 0.055, 0.002], color: CRYSTAL_GLINT, opacity: 0.58 },
    { position: [-0.18, 0.38, -0.736], rotation: 0.34, scale: [0.0036, 0.048, 0.002], color: CRYSTAL_GLASS_WARM, opacity: 0.52 },
    { position: [0.12, 0.36, -0.734], rotation: -0.42, scale: [0.004, 0.052, 0.002], color: CRYSTAL_GLINT, opacity: 0.58 },
    { position: [0.38, 0.25, -0.69], rotation: 0.62, scale: [0.0036, 0.05, 0.002], color: CRYSTAL_GLASS_WARM, opacity: 0.5 },
    { position: [-0.48, 0.0, -0.69], rotation: 0.38, scale: [0.0038, 0.046, 0.002], color: CRYSTAL_GLASS_BLUE, opacity: 0.5 },
    { position: [-0.26, 0.02, -0.735], rotation: -0.24, scale: [0.0042, 0.058, 0.002], color: CRYSTAL_GLINT, opacity: 0.56 },
    { position: [0.0, 0.02, -0.748], rotation: 0.72, scale: [0.0036, 0.044, 0.002], color: CRYSTAL_GLASS_WARM, opacity: 0.5 },
    { position: [0.27, 0.0, -0.72], rotation: -0.58, scale: [0.004, 0.052, 0.002], color: CRYSTAL_GLINT, opacity: 0.54 },
    { position: [0.5, -0.08, -0.652], rotation: 0.22, scale: [0.0034, 0.042, 0.002], color: CRYSTAL_GLASS_BLUE, opacity: 0.48 },
    { position: [-0.38, -0.22, -0.682], rotation: -0.52, scale: [0.0038, 0.048, 0.002], color: CRYSTAL_GLINT, opacity: 0.5 },
    { position: [-0.13, -0.25, -0.724], rotation: 0.46, scale: [0.004, 0.052, 0.002], color: CRYSTAL_GLASS_WARM, opacity: 0.5 },
    { position: [0.16, -0.26, -0.712], rotation: -0.34, scale: [0.0042, 0.056, 0.002], color: CRYSTAL_GLINT, opacity: 0.54 },
    { position: [0.38, -0.26, -0.666], rotation: 0.66, scale: [0.0034, 0.042, 0.002], color: CRYSTAL_GLASS_BLUE, opacity: 0.46 },
    { position: [-0.2, -0.42, -0.642], rotation: -0.18, scale: [0.0034, 0.04, 0.002], color: CRYSTAL_GLINT, opacity: 0.46 },
    { position: [0.06, -0.42, -0.658], rotation: 0.36, scale: [0.0036, 0.044, 0.002], color: CRYSTAL_GLASS_WARM, opacity: 0.46 },
  ]

  return (
    <group>
      <mesh position={[0.0, 0.12, -0.58]} rotation-z={0.03} scale={[0.62, 0.38, 0.018]}>
        <sphereGeometry args={[1, 14, 6]} />
        <meshBasicMaterial color={CRYSTAL_GLASS_BLUE} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <mesh position={[-0.08, 0.34, -0.62]} rotation-z={-0.18} scale={[0.34, 0.06, 0.012]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={CRYSTAL_GLINT} transparent opacity={0.52} depthWrite={false} />
      </mesh>
      {panes.map((pane, index) => (
        <CrystalFacetPane key={`crystal-shell-pane-${index}`} {...pane} />
      ))}
      {seams.map((seam, index) => (
        <OrganicDetailStroke
          key={`crystal-shell-seam-${index}`}
          position={seam.position}
          rotation={seam.rotation}
          scale={seam.scale}
          color={index % 2 === 0 ? CRYSTAL_FACET_DEEP : CRYSTAL_GLINT}
          opacity={seam.opacity}
          depthTest
        />
      ))}
      {glints.map((glint, index) => (
        <CrystalGlint key={`crystal-shell-glint-${index}`} {...glint} />
      ))}
      {flecks.map((fleck, index) => (
        <CrystalSparkleFleck key={`crystal-shell-fleck-${index}`} {...fleck} />
      ))}
      {grit.map((spark, index) => (
        <CrystalGritSparkle key={`crystal-shell-grit-${index}`} {...spark} />
      ))}
      {gritScratches.map((scratch, index) => (
        <OrganicDetailStroke
          key={`crystal-shell-grit-scratch-${index}`}
          position={scratch.position}
          rotation={scratch.rotation}
          scale={scratch.scale}
          color={scratch.color}
          opacity={scratch.opacity}
          depthTest
        />
      ))}
    </group>
  )
}

function CrystalChandelierShell({
  empty = false,
  fitted = false,
}: {
  empty?: boolean
  fitted?: boolean
}) {
  const crystalShellGeometry = useMemo(() => createCrystalShellGeometry(), [])
  const shellSheenGeometry = useMemo(() => createCrystalShellGeometry(), [])

  if (fitted) return <DiamondShell fitted />

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0, -0.035, -0.08]}
        rotation-x={-Math.PI / 2}
        rotation-z={-0.035}
        scale={[0.825, 0.745, 0.65]}
        outlineWidth={fitted ? 0.052 : 0.064}
        outlineColor={CRYSTAL_INK}
        geometry={<primitive object={crystalShellGeometry} attach="geometry" />}
        material={crystalGlassMaterial(0.9, CRYSTAL_GLASS)}
      />
      <mesh position={[0, -0.035, -0.08]} rotation-x={-Math.PI / 2} rotation-z={-0.035} scale={[0.792, 0.716, 0.622]}>
        <primitive object={shellSheenGeometry} attach="geometry" />
        <meshBasicMaterial color={CRYSTAL_GLASS_BLUE} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <CrystalShellSurfaceTexture />
      <CodedAssetOutlineMesh
        position={[0, 0.075, -0.344]}
        rotation-z={-0.08}
        scale={[0.39, 0.18, 0.034]}
        outlineWidth={0.006}
        outlineColor={CRYSTAL_INK}
        geometry={<icosahedronGeometry args={[1, 1]} />}
        material={crystalGlassMaterial(0.9, CRYSTAL_GLASS_BLUE)}
      />
      <CrystalGlint position={[0.09, 0.11, -0.42]} scale={0.54} opacity={0.72} />
      {empty ? <ShellCavity /> : null}
      {fitted ? <ShellInteriorPocket /> : null}
      {fitted ? <ShellOpeningWall variant="crystal" /> : null}
    </group>
  )
}

const MOSS_FUZZ_VERTEX_SHADER = /* glsl */ `
  varying vec3 vMossPosition;
  varying vec3 vMossViewNormal;

  void main() {
    vMossPosition = position;
    vMossViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const MOSS_FUZZ_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uMossColor;
  uniform vec3 uNapColor;

  varying vec3 vMossPosition;
  varying vec3 vMossViewNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.38, 0.78, 0.5));
    float lightAmount = dot(normalize(vMossViewNormal), lightDirection) * 0.5 + 0.5;
    float lightBand = mix(0.66, 0.84, step(0.3, lightAmount));
    lightBand = mix(lightBand, 1.04, step(0.7, lightAmount));

    float napA = sin(dot(vMossPosition, vec3(31.0, 47.0, 37.0)) + sin(vMossPosition.y * 19.0));
    float napB = sin(dot(vMossPosition, vec3(43.0, 29.0, 53.0)) - vMossPosition.x * 13.0);
    float fiberGrain = napA * napB;
    float softFleck = smoothstep(0.48, 0.92, fiberGrain) * 0.1;
    float velvetShadow = smoothstep(0.46, 0.88, -fiberGrain) * 0.055;
    float fuzzyRim = pow(1.0 - abs(normalize(vMossViewNormal).z), 2.4) * 0.12;

    vec3 color = uMossColor * (lightBand - velvetShadow);
    color = mix(color, uNapColor * mix(0.82, 1.02, lightAmount), softFleck + fuzzyRim);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function MossFuzzyMaterial({
  color,
  depthTest = true,
  depthWrite = true,
}: {
  color: string
  depthTest?: boolean
  depthWrite?: boolean
}) {
  const uniforms = useMemo(
    () => ({
      uMossColor: { value: new THREE.Color(color) },
      uNapColor: { value: new THREE.Color(color).lerp(new THREE.Color(MOSS_SHELL_LIGHT), 0.34) },
    }),
    [color],
  )

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={MOSS_FUZZ_VERTEX_SHADER}
      fragmentShader={MOSS_FUZZ_FRAGMENT_SHADER}
      depthTest={depthTest}
      depthWrite={depthWrite}
      dithering
    />
  )
}

function MossShellMatPatch({
  position,
  rotation = 0,
  rotationX = 0,
  rotationY = 0,
  scale,
  color = MOSS_SHELL_MID,
  opacity = 0.64,
  depthTest = true,
  solid = false,
}: {
  position: [number, number, number]
  rotation?: number
  rotationX?: number
  rotationY?: number
  scale: [number, number, number]
  color?: string
  opacity?: number
  depthTest?: boolean
  solid?: boolean
}) {
  const highlightColor =
    color === MOSS_SHELL_DEEP || color === MOSS_SHELL_SHADOW || color === MOSS_SHELL_BARK
      ? MOSS_SHELL_FELT
      : MOSS_SHELL_SOFT
  const shadowColor = color === MOSS_SHELL_LIGHT || color === MOSS_SHELL_GLOW ? MOSS_SHELL_MID : MOSS_SHELL_BASE

  return (
    <group position={position} rotation-x={rotationX} rotation-y={rotationY} rotation-z={rotation}>
      <mesh rotation-z={0.04} scale={[scale[0], scale[1], scale[2] * 0.58]}>
        <sphereGeometry args={[1, 14, 6]} />
        {solid ? (
          <meshToonMaterial color={color} gradientMap={getVacuumHeadToonRampTexture()} depthTest={depthTest} depthWrite={false} />
        ) : (
          <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={depthTest} depthWrite={false} />
        )}
      </mesh>
      <mesh
        position={[scale[0] * 0.2, scale[1] * 0.16, 0.003]}
        rotation-z={-0.24}
        scale={[scale[0] * 0.56, scale[1] * 0.62, scale[2] * 0.46]}
      >
        <sphereGeometry args={[1, 12, 5]} />
        {solid ? (
          <meshToonMaterial color={highlightColor} gradientMap={getVacuumHeadToonRampTexture()} depthTest={depthTest} depthWrite={false} />
        ) : (
          <meshBasicMaterial color={MOSS_SHELL_LIGHT} transparent opacity={0.22} depthTest={depthTest} depthWrite={false} />
        )}
      </mesh>
      <mesh
        position={[-scale[0] * 0.28, -scale[1] * 0.1, 0.002]}
        rotation-z={0.18}
        scale={[scale[0] * 0.42, scale[1] * 0.52, scale[2] * 0.38]}
      >
        <sphereGeometry args={[1, 12, 5]} />
        {solid ? (
          <meshToonMaterial color={shadowColor} gradientMap={getVacuumHeadToonRampTexture()} depthTest={depthTest} depthWrite={false} />
        ) : (
          <meshBasicMaterial color={MOSS_SHELL_DEEP} transparent opacity={0.14} depthTest={depthTest} depthWrite={false} />
        )}
      </mesh>
    </group>
  )
}

function MossShellFoldedRimPad({
  position,
  rotation = 0,
  rotationX = 0,
  rotationY = 0,
  scale,
  color = MOSS_SHELL_MID,
}: {
  position: [number, number, number]
  rotation?: number
  rotationX?: number
  rotationY?: number
  scale: [number, number, number]
  color?: string
}) {
  const highlightColor = color === MOSS_SHELL_LIGHT ? MOSS_SHELL_SOFT : MOSS_SHELL_LIGHT
  const underColor = color === MOSS_SHELL_FELT ? MOSS_SHELL_BASE : MOSS_SHELL_SOFT

  return (
    <group position={position} rotation-x={rotationX} rotation-y={rotationY} rotation-z={rotation}>
      <mesh rotation-z={-0.03} scale={[scale[0], scale[1] * 0.88, scale[2] * 1.22]}>
        <sphereGeometry args={[1, 16, 8]} />
        <meshToonMaterial color={color} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
      </mesh>
      <mesh
        position={[scale[0] * 0.18, scale[1] * 0.08, scale[2] * 0.18]}
        rotation-z={-0.18}
        scale={[scale[0] * 0.5, scale[1] * 0.5, scale[2] * 0.78]}
      >
        <sphereGeometry args={[1, 14, 7]} />
        <meshToonMaterial color={highlightColor} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
      </mesh>
      <mesh
        position={[-scale[0] * 0.22, -scale[1] * 0.16, -scale[2] * 0.08]}
        rotation-z={0.16}
        scale={[scale[0] * 0.42, scale[1] * 0.38, scale[2] * 0.62]}
      >
        <sphereGeometry args={[1, 12, 6]} />
        <meshToonMaterial color={underColor} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
      </mesh>
    </group>
  )
}

function MossShellVolumeClump({
  position,
  rotation = 0,
  rotationY = 0,
  scale = 1,
  side = 1,
  color = MOSS_SHELL_MID,
}: {
  position: [number, number, number]
  rotation?: number
  rotationY?: number
  scale?: number
  side?: -1 | 1
  color?: string
}) {
  const highlightColor =
    color === MOSS_SHELL_DEEP || color === MOSS_SHELL_FELT
      ? MOSS_SHELL_SOFT
      : MOSS_SHELL_LIGHT
  const pocketColor = color === MOSS_SHELL_LIGHT ? MOSS_SHELL_SOFT : MOSS_SHELL_FELT

  return (
    <group position={position} rotation-y={rotationY} rotation-z={rotation} scale={scale}>
      <mesh position={[side * -0.086, -0.012, -0.024]} rotation-z={side * -0.08} scale={[0.16, 0.11, 0.112]}>
        <sphereGeometry args={[1, 14, 8]} />
        <meshToonMaterial color={MOSS_SHELL_FELT} gradientMap={getVacuumHeadToonRampTexture()} />
      </mesh>
      <mesh position={[side * -0.046, -0.01, -0.012]} rotation-z={side * 0.12} scale={[0.124, 0.088, 0.092]}>
        <sphereGeometry args={[1, 14, 8]} />
        <meshToonMaterial color={pocketColor} gradientMap={getVacuumHeadToonRampTexture()} />
      </mesh>
      <mesh position={[side * 0.018, -0.002, 0.008]} rotation-z={side * -0.04} scale={[0.184, 0.092, 0.108]}>
        <sphereGeometry args={[1, 14, 8]} />
        <meshToonMaterial color={color} gradientMap={getVacuumHeadToonRampTexture()} />
      </mesh>
      <mesh position={[side * 0.102, 0.028, 0.02]} rotation-z={side * 0.16} scale={[0.112, 0.052, 0.072]}>
        <sphereGeometry args={[1, 12, 7]} />
        <meshToonMaterial color={highlightColor} gradientMap={getVacuumHeadToonRampTexture()} />
      </mesh>
      <mesh position={[side * 0.082, -0.054, 0.018]} rotation-z={side * -0.2} scale={[0.092, 0.064, 0.066]}>
        <sphereGeometry args={[1, 12, 7]} />
        <meshToonMaterial color={MOSS_SHELL_FELT} gradientMap={getVacuumHeadToonRampTexture()} />
      </mesh>
      <mesh position={[side * 0.128, -0.01, 0.052]} rotation-z={side * 0.1} scale={[0.086, 0.044, 0.058]}>
        <sphereGeometry args={[1, 11, 7]} />
        <meshToonMaterial color={MOSS_SHELL_SOFT} gradientMap={getVacuumHeadToonRampTexture()} />
      </mesh>
      <mesh position={[side * -0.008, 0.038, 0.02]} rotation-z={side * 0.22} scale={[0.086, 0.034, 0.048]}>
        <sphereGeometry args={[1, 10, 6]} />
        <meshToonMaterial color={MOSS_SHELL_SOFT} gradientMap={getVacuumHeadToonRampTexture()} />
      </mesh>
    </group>
  )
}

function MossShellOpeningDrapedClump({
  position,
  rotation = 0,
  rotationY = 0,
  scale = 1,
  color = MOSS_SHELL_MID,
}: {
  position: [number, number, number]
  rotation?: number
  rotationY?: number
  scale?: number
  color?: string
}) {
  const side: -1 | 1 = position[0] < 0 ? -1 : 1
  const upperCurl = Math.max(0, Math.min(1, (position[1] - 0.22) / 0.34))
  const highlightColor = color === MOSS_SHELL_FELT ? MOSS_SHELL_SOFT : MOSS_SHELL_LIGHT
  const shadowColor = color === MOSS_SHELL_LIGHT ? MOSS_SHELL_SOFT : MOSS_SHELL_FELT

  return (
    <group
      position={position}
      rotation-x={-0.42 - upperCurl * 0.2}
      rotation-y={rotationY + side * (0.52 + upperCurl * 0.18)}
      rotation-z={rotation - side * (0.34 + upperCurl * 0.12)}
      scale={scale}
    >
      <mesh position={[side * -0.03, -0.022, 0.056]} rotation-z={side * -0.34} scale={[0.108, 0.132, 0.108]}>
        <sphereGeometry args={[1, 18, 9]} />
        <meshToonMaterial color={shadowColor} gradientMap={getVacuumHeadToonRampTexture()} />
      </mesh>
      <mesh position={[side * 0.012, -0.002, 0.046]} rotation-z={side * -0.42} scale={[0.088, 0.108, 0.09]}>
        <sphereGeometry args={[1, 18, 9]} />
        <meshToonMaterial color={color} gradientMap={getVacuumHeadToonRampTexture()} />
      </mesh>
      <mesh position={[side * 0.05, -0.056, 0.036]} rotation-z={side * -0.28} scale={[0.072, 0.076, 0.068]}>
        <sphereGeometry args={[1, 14, 8]} />
        <meshToonMaterial color={MOSS_SHELL_SOFT} gradientMap={getVacuumHeadToonRampTexture()} />
      </mesh>
      <mesh position={[side * -0.05, 0.038, 0.038]} rotation-z={side * -0.16} scale={[0.064, 0.06, 0.058]}>
        <sphereGeometry args={[1, 13, 7]} />
        <meshToonMaterial color={highlightColor} gradientMap={getVacuumHeadToonRampTexture()} />
      </mesh>
      <mesh position={[side * 0.064, -0.002, 0.026]} rotation-z={side * -0.38} scale={[0.044, 0.044, 0.046]}>
        <sphereGeometry args={[1, 12, 7]} />
        <meshToonMaterial color={MOSS_SHELL_FELT} gradientMap={getVacuumHeadToonRampTexture()} />
      </mesh>
    </group>
  )
}

function MossShellPuffCluster({
  position,
  rotation = 0,
  rotationX = 0,
  rotationY = 0,
  scale,
  color = MOSS_SHELL_MID,
  softness = 'full',
}: {
  position: [number, number, number]
  rotation?: number
  rotationX?: number
  rotationY?: number
  scale: [number, number, number]
  color?: string
  softness?: 'full' | 'front-clean'
}) {
  const frontClean = softness === 'front-clean'
  const highlightColor =
    color === MOSS_SHELL_DEEP || color === MOSS_SHELL_FELT
      ? MOSS_SHELL_SOFT
      : MOSS_SHELL_LIGHT
  const midColor =
    color === MOSS_SHELL_LIGHT
      ? MOSS_SHELL_SOFT
      : color === MOSS_SHELL_DEEP || color === MOSS_SHELL_SHADOW || color === MOSS_SHELL_BASE
        ? MOSS_SHELL_MID
        : color
  const shadowColor = color === MOSS_SHELL_LIGHT ? MOSS_SHELL_SOFT : MOSS_SHELL_FELT
  const accentColor =
    color === MOSS_SHELL_FELT || color === MOSS_SHELL_BASE || color === MOSS_SHELL_DEEP
      ? MOSS_SHELL_MID
      : MOSS_SHELL_FELT
  const pocketColor = color === MOSS_SHELL_FELT ? MOSS_SHELL_BASE : MOSS_SHELL_SOFT
  const topNapColor = color === MOSS_SHELL_LIGHT ? MOSS_SHELL_GLOW : MOSS_SHELL_SOFT
  const dryFleckColor = color === MOSS_SHELL_LIGHT ? MOSS_SHELL_LICHEN : MOSS_SHELL_DRY
  const creaseColor = color === MOSS_SHELL_FELT ? MOSS_SHELL_DEEP : MOSS_SHELL_BASE

  return (
    <group position={position} rotation-x={rotationX} rotation-y={rotationY} rotation-z={rotation} scale={scale}>
      <mesh position={[0, -0.22, -0.18]} rotation-z={-0.04} scale={[0.44, 0.28, 0.46]}>
        <sphereGeometry args={[1, 18, 10]} />
        <MossFuzzyMaterial color={pocketColor} />
      </mesh>
      <mesh position={[-0.16, -0.02, 0.08]} rotation-z={0.16} scale={[0.3, 0.32, 0.36]}>
        <sphereGeometry args={[1, 18, 10]} />
        <MossFuzzyMaterial color={shadowColor} />
      </mesh>
      <mesh position={[0.06, 0, 0.2]} rotation-z={-0.1} scale={[0.92, 0.66, 0.9]}>
        <sphereGeometry args={[1, 20, 11]} />
        <MossFuzzyMaterial color={midColor} />
      </mesh>
      <mesh position={[0.44, -0.02, 0.26]} rotation-z={0.14} scale={[0.58, 0.46, 0.58]}>
        <sphereGeometry args={[1, 18, 10]} />
        <MossFuzzyMaterial color={accentColor} />
      </mesh>
      <mesh
        position={[-0.08, 0.2, 0.14]}
        rotation-z={0.06}
        scale={frontClean ? [0.46, 0.38, 0.46] : [0.58, 0.22, 0.52]}
      >
        <sphereGeometry args={[1, 18, 10]} />
        <MossFuzzyMaterial color={highlightColor} />
      </mesh>
      <mesh
        position={[0.3, 0.14, 0.28]}
        rotation-z={-0.16}
        scale={frontClean ? [0.34, 0.3, 0.34] : [0.44, 0.2, 0.42]}
      >
        <sphereGeometry args={[1, 16, 9]} />
        <MossFuzzyMaterial color={MOSS_SHELL_SOFT} />
      </mesh>
      <mesh visible={!frontClean} position={[-0.36, 0.02, 0.24]} rotation-z={0.24} scale={[0.22, 0.1, 0.24]}>
        <sphereGeometry args={[1, 16, 9]} />
        <MossFuzzyMaterial color={pocketColor} />
      </mesh>
      <mesh visible={!frontClean} position={[0.18, 0.42, 0.42]} rotation-z={-0.18} scale={[0.28, 0.052, 0.16]}>
        <sphereGeometry args={[1, 12, 5]} />
        <MossFuzzyMaterial color={topNapColor} depthWrite={false} />
      </mesh>
      <mesh visible={!frontClean} position={[-0.26, 0.32, 0.24]} rotation-z={0.3} scale={[0.12, 0.034, 0.072]}>
        <sphereGeometry args={[1, 10, 5]} />
        <MossFuzzyMaterial color={dryFleckColor} depthWrite={false} />
      </mesh>
      <mesh visible={!frontClean} position={[-0.24, -0.3, -0.04]} rotation-z={0.18} scale={[0.24, 0.026, 0.11]}>
        <sphereGeometry args={[1, 10, 4]} />
        <MossFuzzyMaterial color={creaseColor} depthWrite={false} />
      </mesh>
    </group>
  )
}

function MossShellDraggedSpherePad({
  position,
  rotation = 0,
  rotationX = 0,
  rotationY = 0,
  surfaceRotationZ = 0,
  scale,
  color = MOSS_SHELL_MID,
}: {
  position: [number, number, number]
  rotation?: number
  rotationX?: number
  rotationY?: number
  surfaceRotationZ?: number
  scale: [number, number, number]
  color?: string
}) {
  const highlightColor = color === MOSS_SHELL_LIGHT ? MOSS_SHELL_SOFT : MOSS_SHELL_LIGHT
  const shadowColor = color === MOSS_SHELL_FELT || color === MOSS_SHELL_DEEP ? MOSS_SHELL_BASE : MOSS_SHELL_SOFT
  const napColor =
    color === MOSS_SHELL_LIGHT
      ? MOSS_SHELL_GLOW
      : color === MOSS_SHELL_FELT
        ? MOSS_SHELL_MID
        : MOSS_SHELL_SOFT
  const dryChipColor = color === MOSS_SHELL_LIGHT ? MOSS_SHELL_LICHEN : MOSS_SHELL_DRY
  const tuckShadowColor = color === MOSS_SHELL_FELT ? MOSS_SHELL_SHADOW : MOSS_SHELL_BASE

  return (
    <group position={position} rotation-x={rotationX} rotation-z={surfaceRotationZ}>
      <group rotation-y={rotationY} rotation-z={rotation}>
        <mesh scale={[scale[0], scale[1] * 1.34, scale[2] * 1.22]}>
          <sphereGeometry args={[1, 20, 10]} />
          <MossFuzzyMaterial color={color} />
        </mesh>
        <mesh position={[scale[0] * 0.22, scale[1] * 0.08, scale[2] * 0.1]} rotation-z={-0.12} scale={[scale[0] * 0.58, scale[1] * 1.06, scale[2] * 1.02]}>
          <sphereGeometry args={[1, 18, 9]} />
          <MossFuzzyMaterial color={highlightColor} />
        </mesh>
        <mesh position={[-scale[0] * 0.24, -scale[1] * 0.11, -scale[2] * 0.12]} rotation-z={0.16} scale={[scale[0] * 0.36, scale[1] * 0.64, scale[2] * 0.68]}>
          <sphereGeometry args={[1, 18, 9]} />
          <MossFuzzyMaterial color={shadowColor} />
        </mesh>
        <mesh position={[scale[0] * -0.02, -scale[1] * 0.2, scale[2] * 0.02]} rotation-z={0.04} scale={[scale[0] * 0.64, scale[1] * 0.46, scale[2] * 0.54]}>
          <sphereGeometry args={[1, 16, 8]} />
          <MossFuzzyMaterial color={shadowColor} />
        </mesh>
        <mesh
          position={[scale[0] * 0.1, scale[1] * 1.08, scale[2] * 0.22]}
          rotation-z={-0.22}
          scale={[scale[0] * 0.42, scale[1] * 0.18, scale[2] * 0.18]}
        >
          <sphereGeometry args={[1, 12, 5]} />
          <MossFuzzyMaterial color={napColor} depthWrite={false} />
        </mesh>
        <mesh
          position={[-scale[0] * 0.26, scale[1] * 0.8, -scale[2] * 0.04]}
          rotation-z={0.32}
          scale={[scale[0] * 0.18, scale[1] * 0.13, scale[2] * 0.14]}
        >
          <sphereGeometry args={[1, 10, 5]} />
          <MossFuzzyMaterial color={dryChipColor} depthWrite={false} />
        </mesh>
        <mesh
          position={[-scale[0] * 0.08, -scale[1] * 0.82, -scale[2] * 0.18]}
          rotation-z={0.1}
          scale={[scale[0] * 0.48, scale[1] * 0.16, scale[2] * 0.18]}
        >
          <sphereGeometry args={[1, 10, 4]} />
          <MossFuzzyMaterial color={tuckShadowColor} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

function MossShellOrganicPad({
  position,
  rotation = 0,
  scale,
  color = MOSS_SHELL_FELT,
  accent = MOSS_SHELL_SOFT,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color?: string
  accent?: string
}) {
  return (
    <group position={position} rotation-z={rotation}>
      <mesh rotation-z={0.08} scale={[scale[0], scale[1], scale[2]]}>
        <sphereGeometry args={[1, 12, 6]} />
        <meshToonMaterial color={color} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
      </mesh>
      <mesh position={[scale[0] * 0.24, scale[1] * 0.22, 0.004]} rotation-z={-0.24} scale={[scale[0] * 0.62, scale[1] * 0.66, scale[2] * 0.8]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshToonMaterial color={accent} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
      </mesh>
      <mesh position={[-scale[0] * 0.24, -scale[1] * 0.1, 0.004]} rotation-z={0.34} scale={[scale[0] * 0.38, scale[1] * 0.46, scale[2] * 0.72]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshToonMaterial color={MOSS_SHELL_FELT} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
      </mesh>
    </group>
  )
}

function clearMossFaceOpening(x: number, y: number, index: number, padding = 0): [number, number] {
  if (Math.abs(x) < 0.36 + padding && y > -0.32 - padding * 0.32 && y < 0.29 + padding * 0.32) {
    if (Math.abs(y) > 0.2) {
      return [x + Math.sin(index * 1.41) * 0.04, (y < 0 ? -1 : 1) * (0.34 + (index % 4) * 0.016)]
    }

    const side = x < -0.02 ? -1 : x > 0.02 ? 1 : Math.sin(index * 1.87) < 0 ? -1 : 1
    return [
      side * (0.42 + (index % 5) * 0.016 + Math.abs(x) * 0.12),
      y + Math.cos(index * 0.72) * 0.045,
    ]
  }

  return [x, y]
}

function getMossShellTopSurfaceY(x: number, z: number, lift = 0) {
  const shellXRadius = 0.79
  const shellYRadius = 0.72
  const shellZRadius = 0.64
  const normalized = (x / shellXRadius) ** 2 + ((z + 0.08) / shellZRadius) ** 2

  return -0.035 + Math.sqrt(Math.max(0, 1 - normalized)) * shellYRadius + lift
}

function getMossShellSurfaceDrape(x: number, z: number) {
  const shellXRadius = 0.79
  const shellYRadius = 0.72
  const shellZRadius = 0.64
  const dome = Math.sqrt(Math.max(0.001, 1 - (x / shellXRadius) ** 2 - ((z + 0.08) / shellZRadius) ** 2))
  const slopeX = -(shellYRadius * x) / (shellXRadius * shellXRadius * dome)
  const slopeZ = -(shellYRadius * (z + 0.08)) / (shellZRadius * shellZRadius * dome)

  return {
    rotationX: Math.max(-0.62, Math.min(0.62, Math.atan(-slopeZ) * 0.72)),
    surfaceRotationZ: Math.max(-0.54, Math.min(0.54, Math.atan(slopeX) * 0.62)),
  }
}

function getMossShellOpeningRimDrape(theta: number) {
  const cosTheta = Math.cos(theta)
  const sinTheta = Math.sin(theta)
  const lower = Math.max(0, -sinTheta)
  const upper = Math.max(0, sinTheta)
  const side = Math.max(0, Math.abs(cosTheta) - 0.26)
  const sideT = Math.min(1, side / 0.74)
  const curl = 0.72 + lower * 0.42 + upper * 0.3 + sideT * 0.42
  const topFold = upper * (0.62 + (1 - sideT) * 0.38)

  return {
    lower,
    upper,
    side,
    sideT,
    topFold,
    rotationX: -sinTheta * (0.22 + curl * 0.24) - topFold * 0.18,
    rotationY: cosTheta * (0.18 + sideT * 0.36 + topFold * 0.08),
    zInset: 0.012 + lower * 0.02 + upper * 0.026 + sideT * 0.014 + topFold * 0.024,
    thickness: 1.32 + curl * 0.26 + topFold * 0.18,
    squash: 1 - sideT * 0.12 - topFold * 0.08,
  }
}

function getMossShellFrontCrownBend(x: number, z: number) {
  const drape = getMossShellSurfaceDrape(x, z)
  const frontBand = Math.max(0, Math.min(1, (-0.12 - z) / 0.34)) * Math.max(0, Math.min(1, (z + 0.58) / 0.24))
  const nearFace = Math.max(0, 1 - Math.abs(x) / 0.62)
  const sideWrap = Math.max(0, Math.min(1, (Math.abs(x) - 0.16) / 0.42))
  const intensity = frontBand * (0.52 + nearFace * 0.48)

  return {
    intensity,
    sink: intensity * (0.022 + nearFace * 0.018),
    zTuck: intensity * (0.012 + nearFace * 0.014),
    rotationX: drape.rotationX * (0.58 + intensity * 0.52) - intensity * 0.16,
    rotationY: x * intensity * 0.22,
    surfaceRotationZ: drape.surfaceRotationZ * (0.64 + intensity * 0.48) + Math.sign(x) * sideWrap * intensity * 0.12,
    scaleX: 1 - intensity * 0.08,
    scaleY: 1 + intensity * 0.22,
    scaleZ: 1 + intensity * 0.26,
  }
}

function getMossShellSideWallBend(x: number, y: number, z: number) {
  const sideSign = x < 0 ? -1 : 1
  const side = Math.max(0, Math.min(1, (Math.abs(x) - 0.3) / 0.32))
  const upper = Math.max(0, Math.min(1, (y - 0.16) / 0.38))
  const shoulder = Math.max(0, Math.min(1, (z + 0.08) / 0.42))
  const intensity = side * (0.42 + upper * 0.44 + shoulder * 0.14)

  return {
    intensity,
    xTuck: -sideSign * intensity * (0.036 + upper * 0.018),
    yDrop: intensity * (0.018 + upper * 0.02),
    zSettle: intensity * (z > 0.12 ? -0.012 : 0.006),
    rotationX: -intensity * (0.12 + upper * 0.08),
    rotationY: sideSign * intensity * (0.34 + shoulder * 0.08),
    surfaceRotationZ: -sideSign * intensity * (0.24 + upper * 0.08),
    scaleX: 1 - intensity * 0.16,
    scaleY: 1 + intensity * 0.1,
    scaleZ: 1 + intensity * 0.18,
  }
}

function getMossShellRearSurfaceBend(x: number, y: number, z: number) {
  const sideSign = x < 0 ? -1 : 1
  const rear = Math.max(0, Math.min(1, (z - 0.18) / 0.4))
  const side = Math.max(0, Math.min(1, (Math.abs(x) - 0.18) / 0.42))
  const upper = Math.max(0, Math.min(1, (y - 0.12) / 0.38))
  const drape = getMossShellSurfaceDrape(x, z)
  const intensity = rear * (0.56 + side * 0.28 + upper * 0.16)

  return {
    xTuck: -sideSign * side * intensity * 0.026,
    yDrop: intensity * (0.022 + upper * 0.018),
    zSink: -intensity * (0.034 + side * 0.014),
    rotationX: drape.rotationX * 0.5 - intensity * (0.18 + upper * 0.08),
    rotationY: sideSign * side * intensity * 0.24,
    surfaceRotationZ: drape.surfaceRotationZ * 0.62 - sideSign * side * intensity * 0.2,
    scaleX: 1 + intensity * 0.12,
    scaleY: 1 - intensity * 0.32,
    scaleZ: 1 + intensity * 0.24,
  }
}

function softenMossNapScale(scale: [number, number, number]): [number, number, number] {
  return [scale[0], Math.min(scale[1], scale[0] * 1.35), Math.max(scale[2], scale[0] * 0.62)]
}

function MossShellFuzzCarpet() {
  const fuzzMesh = useMemo(() => {
    const candidates = 960
    const fibers: Array<{
      position: THREE.Vector3
      rootDirection: THREE.Vector3
      tipDirection: THREE.Vector3
      width: number
      length: number
      color: THREE.Color
    }> = []
    const centerY = -0.035
    const centerZ = -0.08
    const radiusX = 0.79
    const radiusY = 0.72
    const radiusZ = 0.64
    const down = new THREE.Vector3(0, -1, 0)

    for (let index = 0; index < candidates; index += 1) {
      const angle = index * 2.399963 + Math.sin(index * 1.17) * 0.18
      const radial = Math.sqrt((((index * 173) % candidates) + 0.5) / candidates)
      const x = Math.cos(angle) * radiusX * 0.88 * radial + Math.sin(index * 0.71) * 0.012
      const z = centerZ + Math.sin(angle) * radiusZ * 0.86 * radial + Math.cos(index * 0.83) * 0.012
      const y = getMossShellTopSurfaceY(x, z, -0.006)
      const topness = smoothstep01((y - 0.12) / 0.5)
      const rear = smoothstep01((z - 0.12) / 0.42)
      const edge = smoothstep01((radial - 0.6) / 0.36)
      const patchField =
        Math.sin(x * 7.2 + z * 4.6 + 0.4) * 0.46
        + Math.cos(z * 9.1 - x * 2.8) * 0.34
        + Math.sin(index * 0.67) * 0.2
      const carpetCoverage = getMossRockCarpetCoverage(x, z)
      const frontCrownCoverage = Math.exp(
        -((x / 0.58) ** 2 + ((z + 0.31) / 0.2) ** 2),
      )
      const patchDensity = THREE.MathUtils.clamp(
        0.025
          + carpetCoverage * 0.88
          + frontCrownCoverage * 0.64
          + topness * 0.05
          - rear * 0.035
          - edge * 0.03
          + patchField * 0.045,
        0.015,
        0.96,
      )
      const selection = mossRockFacetNoise(index, x, y, z)

      if (y < 0.14 || selection > patchDensity) continue

      const normal = new THREE.Vector3(
        x / (radiusX * radiusX),
        (y - centerY) / (radiusY * radiusY),
        (z - centerZ) / (radiusZ * radiusZ),
      ).normalize()
      const tangentDown = down.clone().sub(normal.clone().multiplyScalar(down.dot(normal)))
      if (tangentDown.lengthSq() > 0.0001) tangentDown.normalize()
      const sideTangent = new THREE.Vector3(-normal.z, 0, normal.x)
      if (sideTangent.lengthSq() > 0.0001) sideTangent.normalize()
      const crossAxis = Math.abs(normal.y) > 0.86 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
      const carpetTangent = crossAxis.cross(normal).normalize()
      const carpetCross = new THREE.Vector3().crossVectors(normal, carpetTangent).normalize()
      const rootDirection = normal
        .clone()
        .multiplyScalar(0.34)
        .add(tangentDown.multiplyScalar(0.18 + edge * 0.08))
        .add(sideTangent.multiplyScalar(Math.sin(index * 1.31) * 0.12))
        .add(carpetTangent.multiplyScalar(Math.sin(index * 1.73) * 0.72))
        .add(carpetCross.multiplyScalar(Math.cos(index * 1.11) * 0.34))
        .normalize()
      const tipDirection = rootDirection
        .clone()
        .multiplyScalar(0.62)
        .add(tangentDown.multiplyScalar(0.28))
        .add(normal.clone().multiplyScalar(0.08))
        .add(sideTangent.multiplyScalar(Math.sin(index * 0.93) * 0.18))
        .normalize()
      const colorCycle = index % 13
      const color = new THREE.Color(
        colorCycle === 0 || colorCycle === 8
          ? MOSS_SHELL_MID
          : colorCycle === 3 || colorCycle === 10
            ? MOSS_SHELL_FELT
            : colorCycle === 6
              ? MOSS_SHELL_BASE
              : MOSS_SHELL_SOFT,
      )

      fibers.push({
        position: new THREE.Vector3(x, y, z).addScaledVector(
          normal,
          0.006 + carpetCoverage * 0.032 + frontCrownCoverage * 0.018,
        ),
        rootDirection,
        tipDirection,
        width: 0.72 + mossRockFacetNoise(index + 17, z, x, y) * 0.42,
        length: 0.72 + mossRockFacetNoise(index + 41, y, z, x) * 0.5,
        color,
      })
    }

    const geometry = new THREE.CapsuleGeometry(0.0032, 0.012, 2, 5)
    geometry.translate(0, 0.0092, 0)
    const material = new THREE.MeshToonMaterial({
      color: '#ffffff',
      gradientMap: getVacuumHeadToonRampTexture(),
    })
    const mesh = new THREE.InstancedMesh(geometry, material, fibers.length * 2)
    const dummy = new THREE.Object3D()
    const up = new THREE.Vector3(0, 1, 0)

    fibers.forEach((fiber, index) => {
      const rootLength = fiber.length
      dummy.position.copy(fiber.position)
      dummy.quaternion.setFromUnitVectors(up, fiber.rootDirection)
      dummy.scale.set(fiber.width, rootLength, fiber.width)
      dummy.updateMatrix()
      mesh.setMatrixAt(index * 2, dummy.matrix)
      mesh.setColorAt(index * 2, fiber.color)

      dummy.position.copy(fiber.position).addScaledVector(fiber.rootDirection, 0.015 * rootLength)
      dummy.quaternion.setFromUnitVectors(up, fiber.tipDirection)
      dummy.scale.set(fiber.width * 0.78, rootLength * 0.76, fiber.width * 0.78)
      dummy.updateMatrix()
      mesh.setMatrixAt(index * 2 + 1, dummy.matrix)
      mesh.setColorAt(index * 2 + 1, fiber.color)
    })

    mesh.name = 'moss-shell-rooted-fuzz-carpet'
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false
    mesh.raycast = () => undefined
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    return mesh
  }, [])

  useEffect(
    () => () => {
      fuzzMesh.geometry.dispose()
      const material = fuzzMesh.material
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose())
      else material.dispose()
    },
    [fuzzMesh],
  )

  return <primitive object={fuzzMesh} />
}

const MOSS_ROCK_CARPET_ISLANDS = [
  { x: -0.46, z: -0.06, rotation: -0.34, scale: [0.17, 0.05, 0.11], color: MOSS_SHELL_FELT },
  { x: -0.34, z: 0.18, rotation: -0.18, scale: [0.2, 0.052, 0.13], color: MOSS_SHELL_SOFT },
  { x: -0.1, z: 0.34, rotation: 0.12, scale: [0.23, 0.054, 0.15], color: MOSS_SHELL_MID },
  { x: 0.18, z: 0.4, rotation: -0.08, scale: [0.2, 0.05, 0.13], color: MOSS_SHELL_SOFT },
  { x: 0.39, z: 0.24, rotation: 0.28, scale: [0.18, 0.048, 0.12], color: MOSS_SHELL_FELT },
  { x: 0.5, z: 0.02, rotation: 0.42, scale: [0.14, 0.044, 0.095], color: MOSS_SHELL_MID },
  { x: 0.28, z: -0.17, rotation: 0.16, scale: [0.16, 0.046, 0.105], color: MOSS_SHELL_SOFT },
] satisfies Array<{
  x: number
  z: number
  rotation: number
  scale: [number, number, number]
  color: string
}>

function getMossRockCarpetCoverage(x: number, z: number) {
  return MOSS_ROCK_CARPET_ISLANDS.reduce((coverage, island) => {
    const dx = (x - island.x) / (island.scale[0] * 1.18)
    const dz = (z - island.z) / (island.scale[2] * 1.36)
    return Math.max(coverage, Math.exp(-(dx * dx + dz * dz) * 0.92))
  }, 0)
}

function MossRockCarpetIsland({
  island,
}: {
  island: (typeof MOSS_ROCK_CARPET_ISLANDS)[number]
}) {
  const drape = getMossShellSurfaceDrape(island.x, island.z)
  const highlight = island.color === MOSS_SHELL_FELT ? MOSS_SHELL_MID : MOSS_SHELL_LIGHT
  const shadow = island.color === MOSS_SHELL_SOFT ? MOSS_SHELL_FELT : MOSS_SHELL_BASE

  return (
    <group
      position={[island.x, getMossShellTopSurfaceY(island.x, island.z, -0.026), island.z]}
      rotation-x={drape.rotationX * 0.78}
      rotation-z={island.rotation + drape.surfaceRotationZ * 0.82}
    >
      <mesh scale={island.scale}>
        <sphereGeometry args={[1, 18, 9]} />
        <MossFuzzyMaterial color={island.color} />
      </mesh>
      <mesh
        position={[-island.scale[0] * 0.38, island.scale[1] * 0.12, island.scale[2] * 0.12]}
        rotation-y={-0.12}
        scale={[island.scale[0] * 0.62, island.scale[1] * 0.82, island.scale[2] * 0.72]}
      >
        <sphereGeometry args={[1, 16, 8]} />
        <MossFuzzyMaterial color={shadow} />
      </mesh>
      <mesh
        position={[island.scale[0] * 0.34, island.scale[1] * 0.2, -island.scale[2] * 0.08]}
        rotation-y={0.16}
        scale={[island.scale[0] * 0.54, island.scale[1] * 0.74, island.scale[2] * 0.64]}
      >
        <sphereGeometry args={[1, 16, 8]} />
        <MossFuzzyMaterial color={highlight} />
      </mesh>
    </group>
  )
}

function MossRockMossCarpet() {
  return (
    <group name="moss-shell-buried-upper-carpet">
      {MOSS_ROCK_CARPET_ISLANDS.map((island, index) => (
        <MossRockCarpetIsland key={`moss-rock-carpet-island-${index}`} island={island} />
      ))}
    </group>
  )
}

function MossShellMicroPuffCarpet() {
  const puffMesh = useMemo(() => {
    const candidates = 520
    const puffs: Array<{
      position: THREE.Vector3
      normal: THREE.Vector3
      scale: [number, number, number]
      color: THREE.Color
      rotation: number
    }> = []
    const centerY = -0.035
    const centerZ = -0.08
    const radiusX = 0.79
    const radiusY = 0.72
    const radiusZ = 0.64

    for (let index = 0; index < candidates; index += 1) {
      const angle = index * 2.399963 + Math.sin(index * 0.81) * 0.16
      const radial = Math.sqrt((((index * 197) % candidates) + 0.5) / candidates)
      const x = Math.cos(angle) * radiusX * 0.88 * radial
      const z = centerZ + Math.sin(angle) * radiusZ * 0.86 * radial
      const y = getMossShellTopSurfaceY(x, z)
      const carpetCoverage = getMossRockCarpetCoverage(x, z)
      const frontCrownCoverage = Math.exp(-((x / 0.58) ** 2 + ((z + 0.31) / 0.2) ** 2))
      const colonyCoverage = Math.max(carpetCoverage, frontCrownCoverage * 0.82)
      const selection = mossRockFacetNoise(index + 281, x, y, z)

      if (y < 0.14 || colonyCoverage < 0.16 || selection > colonyCoverage * 0.78) continue

      const normal = new THREE.Vector3(
        x / (radiusX * radiusX),
        (y - centerY) / (radiusY * radiusY),
        (z - centerZ) / (radiusZ * radiusZ),
      ).normalize()
      const sizeNoise = mossRockFacetNoise(index + 313, z, x, y)
      const size = 0.012 + sizeNoise * 0.014
      const colorCycle = index % 11
      const color = new THREE.Color(
        colorCycle === 0 || colorCycle === 7
          ? MOSS_SHELL_MID
          : colorCycle === 3 || colorCycle === 9
            ? MOSS_SHELL_BASE
            : MOSS_SHELL_FELT,
      )
      const surfaceLift = 0.011 + carpetCoverage * 0.022 + frontCrownCoverage * 0.014

      puffs.push({
        position: new THREE.Vector3(x, y, z).addScaledVector(normal, surfaceLift),
        normal,
        scale: [
          size * (0.82 + mossRockFacetNoise(index + 331, y, z, x) * 0.46),
          size * (0.48 + mossRockFacetNoise(index + 347, x, z, y) * 0.24),
          size * (0.8 + mossRockFacetNoise(index + 359, z, y, x) * 0.42),
        ],
        color,
        rotation: mossRockFacetNoise(index + 373, y, x, z) * Math.PI * 2,
      })
    }

    const geometry = new THREE.IcosahedronGeometry(1, 1)
    const material = new THREE.MeshToonMaterial({
      color: '#ffffff',
      gradientMap: getVacuumHeadToonRampTexture(),
    })
    const mesh = new THREE.InstancedMesh(geometry, material, puffs.length)
    const dummy = new THREE.Object3D()
    const up = new THREE.Vector3(0, 1, 0)

    puffs.forEach((puff, index) => {
      dummy.position.copy(puff.position)
      dummy.quaternion.setFromUnitVectors(up, puff.normal)
      dummy.rotateY(puff.rotation)
      dummy.scale.set(...puff.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
      mesh.setColorAt(index, puff.color)
    })

    mesh.name = 'moss-shell-rooted-micro-puff-carpet'
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false
    mesh.raycast = () => undefined
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    return mesh
  }, [])

  useEffect(
    () => () => {
      puffMesh.geometry.dispose()
      const material = puffMesh.material
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose())
      else material.dispose()
    },
    [puffMesh],
  )

  return <primitive object={puffMesh} />
}

function MossShellSurfaceTexture() {
  const mossBlankets = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.42
        const ring = Math.sqrt(((index * 17) % 67 + 0.5) / 67)
        let x = Math.cos(angle) * 0.58 * ring + Math.sin(index * 1.9) * 0.026
        let y = Math.sin(angle) * 0.5 * ring - 0.03 + Math.cos(index * 0.73) * 0.018
        const cleared = clearMossFaceOpening(x, y, index, 0.04)
        x = cleared[0]
        y = cleared[1]
        const colorCycle = index % 9
        const color =
          colorCycle === 0
            ? MOSS_SHELL_SOFT
            : colorCycle === 2 || colorCycle === 5
              ? MOSS_SHELL_FELT
              : colorCycle === 3 || colorCycle === 7
                ? MOSS_SHELL_FELT
                : MOSS_SHELL_MID

        return {
          position: [x, y, -0.566 + Math.sin(index * 0.91) * 0.032] as [number, number, number],
          rotation: angle + Math.sin(index * 0.6) * 0.44,
          scale: [
            0.058 + (index % 5) * 0.011,
            0.016 + (index % 4) * 0.0038,
            0.01 + (index % 3) * 0.003,
          ] as [number, number, number],
          color,
          opacity: 0.34 + (index % 4) * 0.045,
        }
      }),
    [],
  )

  const mossTufts = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.18
        const ring = Math.sqrt(((index * 11) % 47 + 0.5) / 47)
        let x = Math.cos(angle) * 0.62 * ring
        let y = Math.sin(angle) * 0.48 * ring - 0.02
        const cleared = clearMossFaceOpening(x, y, index, 0.04)
        x = cleared[0]
        y = cleared[1]
        const flip: -1 | 1 = x < 0 ? -1 : 1
        const colorCycle = index % 8

        return {
          position: [x + Math.sin(index * 1.21) * 0.02, y + Math.cos(index * 0.7) * 0.018, -0.61 + Math.sin(index * 1.47) * 0.028] as [number, number, number],
          rotation: angle * 0.28 + flip * (0.2 + (index % 4) * 0.08),
          scale: 0.78 + (index % 5) * 0.058,
          color:
            colorCycle === 0 || colorCycle === 5
              ? MOSS_SHELL_SOFT
              : colorCycle === 3
                ? MOSS_SHELL_FELT
                : colorCycle === 6
                  ? MOSS_SHELL_FELT
                  : MOSS_SHELL_MID,
          height: 0.038 + (index % 6) * 0.005,
          flip,
        }
      }).filter((tuft) => tuft.position[1] > 0.16 && (Math.abs(tuft.position[0]) > 0.24 || tuft.position[1] > 0.34)),
    [],
  )

  const lichenDots = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.9
        const ring = Math.sqrt(((index * 19) % 79 + 0.5) / 79)
        let x = Math.cos(angle) * 0.56 * ring + Math.sin(index * 0.74) * 0.018
        let y = Math.sin(angle) * 0.48 * ring - 0.028 + Math.cos(index * 1.16) * 0.014
        const cleared = clearMossFaceOpening(x, y, index, 0.02)
        x = cleared[0]
        y = cleared[1]

        return {
          position: [x, y, -0.636 + Math.sin(index * 0.81) * 0.018] as [number, number, number],
          scale: [
            0.007 + (index % 4) * 0.002,
            0.005 + (index % 3) * 0.0015,
            0.004,
          ] as [number, number, number],
          color: index % 7 === 0 ? MOSS_SHELL_DRY : index % 5 === 0 ? MOSS_SHELL_NEW_GROWTH : MOSS_SHELL_SOFT,
          opacity: 0.42 + (index % 4) * 0.08,
        }
      }),
    [],
  )

  const ancientPatinaWashes = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.28
        const ring = Math.sqrt(((index * 23) % 41 + 0.5) / 41)
        let x = Math.cos(angle) * 0.58 * ring + Math.sin(index * 0.83) * 0.018
        let y = Math.sin(angle) * 0.5 * ring - 0.04 + Math.cos(index * 1.17) * 0.012
        const cleared = clearMossFaceOpening(x, y, index, 0.04)
        x = cleared[0]
        y = cleared[1]
        const colorCycle = index % 9

        return {
          position: [x, y, -0.646 + Math.sin(index * 0.9) * 0.034] as [number, number, number],
          rotation: angle + Math.sin(index * 0.48) * 0.52,
          scale: [
            0.076 + (index % 5) * 0.018,
            0.016 + (index % 4) * 0.005,
            0.007,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 5
              ? MOSS_SHELL_BARK
              : colorCycle === 2
                ? MOSS_SHELL_SHADOW
                : colorCycle === 4
                  ? MOSS_SHELL_DRY
                  : MOSS_SHELL_FELT,
          opacity: colorCycle === 4 ? 0.14 : 0.1 + (index % 4) * 0.025,
        }
      }),
    [],
  )

  const mossTotalCarpetWashes = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.63
        const ring = Math.sqrt(((index * 53) % 107 + 0.5) / 107)
        let x = Math.cos(angle) * 0.62 * ring + Math.sin(index * 1.03) * 0.026
        let y = Math.sin(angle) * 0.51 * ring - 0.035 + Math.cos(index * 0.81) * 0.018
        const cleared = clearMossFaceOpening(x, y, index, 0.08)
        x = cleared[0]
        y = cleared[1]
        const colorCycle = index % 17
        const isSandy = colorCycle === 0 || colorCycle === 6 || colorCycle === 12
        const color =
          colorCycle === 0
            ? MOSS_SHELL_DRY
            : colorCycle === 6
              ? MOSS_SHELL_FELT
              : colorCycle === 12
                ? MOSS_SHELL_SOFT
                : colorCycle === 3 || colorCycle === 14
                  ? MOSS_SHELL_FELT
                : colorCycle === 5
                    ? MOSS_SHELL_FELT
                    : colorCycle === 9 || colorCycle === 15
                      ? MOSS_SHELL_NEW_GROWTH
                      : colorCycle === 11
                        ? MOSS_SHELL_MID
                        : MOSS_SHELL_MID

        return {
          position: [x, y, -0.67 + Math.sin(index * 0.92) * 0.036] as [number, number, number],
          rotation: angle * 0.42 + Math.sin(index * 0.58) * 0.66,
          scale: [
            0.072 + (index % 6) * 0.013,
            0.02 + (index % 5) * 0.004,
            0.01,
          ] as [number, number, number],
          color,
          opacity: isSandy ? 0.16 + (index % 3) * 0.025 : 0.3 + (index % 4) * 0.04,
        }
      }),
    [],
  )

  const mossSideCarpetWashes = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const side: -1 | 1 = index % 2 === 0 ? -1 : 1
        const row = Math.floor(index / 2)
        const y = -0.42 + (((row * 19) % 67) / 66) * 0.84 + Math.sin(row * 0.57) * 0.02
        const x = side * (0.56 + (((row * 13) % 29) / 29) * 0.11)
        const z = -0.16 + Math.cos(row * 0.49) * 0.31
        const colorCycle = index % 12
        const isSandy = colorCycle === 2 || colorCycle === 9

        return {
          position: [x, y, z] as [number, number, number],
          rotation: side * (0.62 + Math.sin(row * 0.37) * 0.36),
          scale: [
            0.026 + (index % 4) * 0.006,
            0.088 + (index % 5) * 0.018,
            0.01,
          ] as [number, number, number],
          color:
            colorCycle === 2
              ? MOSS_SHELL_DRY
              : colorCycle === 9
                ? MOSS_SHELL_BARK
                : colorCycle === 4
                  ? MOSS_SHELL_FELT
                  : colorCycle === 7
                    ? MOSS_SHELL_SOFT
                    : colorCycle === 10
                      ? MOSS_SHELL_FELT
                      : MOSS_SHELL_MID,
          opacity: isSandy ? 0.15 : 0.34 + (index % 4) * 0.035,
        }
      }),
    [],
  )

  const mossRearCarpetWashes = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.36
        const ring = Math.sqrt(((index * 31) % 79 + 0.5) / 79)
        let x = Math.cos(angle) * 0.42 * ring + Math.sin(index * 0.82) * 0.012
        let y = Math.sin(angle) * 0.26 * ring + 0.13 + Math.cos(index * 0.91) * 0.01
        const cleared = clearMossFaceOpening(x, y, index, 0.08)
        x = cleared[0]
        y = cleared[1]
        const colorCycle = index % 15
        const isSandy = colorCycle === 1 || colorCycle === 8 || colorCycle === 12

        return {
          position: [x, y, 0.43 + Math.sin(index * 0.74) * 0.1] as [number, number, number],
          rotation: angle * 0.36 + Math.sin(index * 0.61) * 0.58,
          scale: [
            0.044 + (index % 5) * 0.009,
            0.014 + (index % 4) * 0.003,
            0.008,
          ] as [number, number, number],
          color:
            colorCycle === 1
              ? MOSS_SHELL_DRY
              : colorCycle === 8
                ? MOSS_SHELL_SOFT
                : colorCycle === 12
                  ? MOSS_SHELL_SOIL
                  : colorCycle === 4 || colorCycle === 10
                    ? MOSS_SHELL_NEW_GROWTH
                  : colorCycle === 6
                      ? MOSS_SHELL_FELT
                      : colorCycle === 13
                        ? MOSS_SHELL_FELT
                        : MOSS_SHELL_MID,
          opacity: isSandy ? 0.1 + (index % 3) * 0.018 : 0.2 + (index % 4) * 0.026,
        }
      }),
    [],
  )

  const mossRearPuffs = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.78
        const ring = Math.sqrt(((index * 43) % 119 + 0.5) / 119)
        let x = Math.cos(angle) * 0.44 * ring + Math.sin(index * 0.92) * 0.012
        let y = Math.sin(angle) * 0.27 * ring + 0.12 + Math.cos(index * 1.03) * 0.01
        const cleared = clearMossFaceOpening(x, y, index, 0.06)
        x = cleared[0]
        y = cleared[1]
        const colorCycle = index % 12

        return {
          position: [x, y, 0.47 + Math.sin(index * 0.67) * 0.075] as [number, number, number],
          scale: [
            0.0058 + (index % 5) * 0.0015,
            0.005 + (index % 4) * 0.0012,
            0.0042,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 7
              ? MOSS_SHELL_SOFT
              : colorCycle === 3
                ? MOSS_SHELL_FELT
                : colorCycle === 5 || colorCycle === 10
                  ? MOSS_SHELL_NEW_GROWTH
                  : MOSS_SHELL_MID,
          opacity: 0.22 + (index % 5) * 0.024,
        }
      }),
    [],
  )

  const mossWrapMats = Array.from({ length: 0 }, (_, index) => {
    const longitude = index * 2.399963 + 0.34
    const vertical = ((((index * 47) % 113) + 0.5) / 113 * 2 - 1) * 0.88
    const ring = Math.sqrt(Math.max(0.08, 1 - vertical * vertical))
    const rear = Math.max(0, Math.sin(longitude))
    const side = Math.max(0, Math.abs(Math.cos(longitude)) - 0.34)
    const lowerGravity = Math.max(0, -vertical - 0.08)
    const rearSettledScale = Math.max(0.36, 1 - rear * 0.42 - lowerGravity * 0.48)
    const colorCycle = index % 16
    let x = Math.cos(longitude) * (0.62 + side * 0.045) * ring + Math.sin(index * 0.91) * 0.012
    let y = vertical * 0.49 - 0.035 + Math.cos(index * 0.73) * 0.012
    const z = Math.sin(longitude) * (0.61 + rear * 0.02) * ring - 0.075 + rear * 0.018 + Math.sin(index * 1.17) * 0.012

    if (z < -0.48) {
      const cleared = clearMossFaceOpening(x, y, index, 0.08)
      x = cleared[0]
      y = cleared[1]
    }

    return {
      position: [x, y, z] as [number, number, number],
      rotation: longitude * 0.24 + Math.sin(index * 0.58) * 0.42,
      rotationY: Math.atan2(x, z + 0.075),
      scale: [
        (0.04 + (index % 5) * 0.008 + rear * 0.008 + side * 0.01) * rearSettledScale,
        (0.028 + (index % 4) * 0.005 + rear * 0.004) * rearSettledScale,
        0.015,
      ] as [number, number, number],
      color:
        colorCycle === 0 || colorCycle === 8
          ? MOSS_SHELL_SOFT
        : colorCycle === 2 || colorCycle === 11
            ? MOSS_SHELL_LIGHT
            : colorCycle === 5 || colorCycle === 13
              ? MOSS_SHELL_FELT
            : colorCycle === 7
                ? MOSS_SHELL_DRY
                : colorCycle === 10
                  ? MOSS_SHELL_MID
                  : MOSS_SHELL_MID,
    }
  })

  const mossWrapPuffColonies = Array.from({ length: 18 }, (_, index) => {
    const longitude = index * 2.399963 + 0.18
    const vertical = ((((index * 43) % 101) + 0.5) / 101 * 2 - 1) * 0.84
    const ring = Math.sqrt(Math.max(0.08, 1 - vertical * vertical))
    const rear = Math.max(0, Math.sin(longitude))
    const side = Math.max(0, Math.abs(Math.cos(longitude)) - 0.32)
    const lowerGravity = Math.max(0, -vertical - 0.04)
    const rearSettledScale = Math.max(0.42, 1 - rear * 0.5 - lowerGravity * 0.5)
    const colorCycle = index % 13
    let x = Math.cos(longitude) * (0.66 + side * 0.055) * ring + Math.sin(index * 0.83) * 0.014
    let y = vertical * 0.5 - 0.02 + Math.cos(index * 0.77) * 0.012 + rear * 0.006
    const z = Math.sin(longitude) * (0.66 + rear * 0.024) * ring - 0.08 + rear * 0.035 + Math.sin(index * 1.11) * 0.012
    const dome = Math.max(0, 1 - vertical * vertical)

    if (z < -0.5) {
      const cleared = clearMossFaceOpening(x, y, index, 0.11)
      x = cleared[0]
      y = cleared[1]
    }

    return {
      position: [x, y, z] as [number, number, number],
      rotation: longitude * 0.2 + Math.sin(index * 0.47) * 0.36,
      rotationX: Math.sin(longitude) * 0.08,
      rotationY: Math.atan2(x, z + 0.08) * 0.18,
      scale: [
        (0.086 + (index % 5) * 0.014 + rear * 0.012 + side * 0.024) * rearSettledScale,
        (0.068 + (index % 4) * 0.008 + rear * 0.006 + dome * 0.008) * rearSettledScale,
        (0.078 + (index % 3) * 0.012 + rear * 0.008 + side * 0.016) * rearSettledScale,
      ] as [number, number, number],
      color:
        colorCycle === 0 || colorCycle === 8
          ? MOSS_SHELL_SOFT
        : colorCycle === 2 || colorCycle === 10
            ? MOSS_SHELL_LIGHT
            : colorCycle === 4 || colorCycle === 11
              ? MOSS_SHELL_FELT
            : colorCycle === 6
                ? MOSS_SHELL_MID
                : MOSS_SHELL_MID,
    }
  }).filter((colony) => {
    const [x, y, z] = colony.position
    const frontOpeningStack = z < -0.5 && y > -0.03 && Math.abs(x) > 0.42
    const lowerRightFloatingPuck = x > 0.42 && y < -0.24 && z < -0.18 && z > -0.42

    return !frontOpeningStack && !lowerRightFloatingPuck && (z > -0.48 || y > -0.04 || Math.abs(x) > 0.52)
  })

  const mossWrapPuffs = Array.from({ length: 0 }, (_, index) => {
    const longitude = index * 2.399963 + 0.92
    const vertical = ((((index * 59) % 173) + 0.5) / 173 * 2 - 1) * 0.9
    const ring = Math.sqrt(Math.max(0.06, 1 - vertical * vertical))
    const rear = Math.max(0, Math.sin(longitude))
    const side = Math.max(0, Math.abs(Math.cos(longitude)) - 0.38)
    const lowerGravity = Math.max(0, -vertical - 0.1)
    const rearSettledScale = Math.max(0.42, 1 - rear * 0.38 - lowerGravity * 0.55)
    const colorCycle = index % 13
    let x = Math.cos(longitude) * (0.635 + side * 0.04) * ring + Math.sin(index * 0.77) * 0.01
    let y = vertical * 0.49 - 0.035 + Math.cos(index * 0.68) * 0.012
    const z = Math.sin(longitude) * (0.625 + rear * 0.016) * ring - 0.08 + rear * 0.026 + Math.sin(index * 1.09) * 0.01

    if (z < -0.5) {
      const cleared = clearMossFaceOpening(x, y, index, 0.07)
      x = cleared[0]
      y = cleared[1]
    }

    return {
      position: [x, y, z] as [number, number, number],
      scale: [
        (0.0068 + (index % 5) * 0.0017 + rear * 0.0008) * rearSettledScale,
        (0.0058 + (index % 4) * 0.0014 + side * 0.0012) * rearSettledScale,
        0.0046,
      ] as [number, number, number],
      color:
        colorCycle === 0 || colorCycle === 8
          ? MOSS_SHELL_SOFT
        : colorCycle === 2 || colorCycle === 10
            ? MOSS_SHELL_LIGHT
            : colorCycle === 4
              ? MOSS_SHELL_FELT
            : colorCycle === 6
                ? MOSS_SHELL_DRY
                : MOSS_SHELL_MID,
      opacity: (0.34 + (index % 5) * 0.034) * Math.max(0.45, 1 - rear * 0.36 - lowerGravity * 0.5),
    }
  })

  const mossWrapLichenSpecks = Array.from({ length: 0 }, (_, index) => {
    const longitude = index * 2.399963 + 1.36
    const vertical = ((((index * 31) % 101) + 0.5) / 101 * 2 - 1) * 0.86
    const ring = Math.sqrt(Math.max(0.08, 1 - vertical * vertical))
    const rear = Math.max(0, Math.sin(longitude))
    const side = Math.max(0, Math.abs(Math.cos(longitude)) - 0.42)
    const colorCycle = index % 10
    let x = Math.cos(longitude) * (0.642 + side * 0.032) * ring + Math.sin(index * 0.83) * 0.009
    let y = vertical * 0.48 - 0.035 + Math.cos(index * 0.59) * 0.01
    const z = Math.sin(longitude) * (0.632 + rear * 0.032) * ring - 0.08 + rear * 0.068 + Math.sin(index * 1.2) * 0.008

    if (z < -0.5) {
      const cleared = clearMossFaceOpening(x, y, index, 0.06)
      x = cleared[0]
      y = cleared[1]
    }

    return {
      position: [x, y, z] as [number, number, number],
      scale: [
        0.0038 + (index % 4) * 0.0009,
        0.0032 + (index % 3) * 0.0008,
        0.0034,
      ] as [number, number, number],
      color:
        colorCycle === 0
          ? MOSS_SHELL_LIGHT
          : colorCycle === 3
            ? MOSS_SHELL_DRY
          : colorCycle === 6
              ? MOSS_SHELL_SOFT
              : MOSS_SHELL_FELT,
      opacity: 0.3 + (index % 4) * 0.045,
    }
  })

  const mossLogBlankets = [
    {
      position: [-0.22, getMossShellTopSurfaceY(-0.22, -0.32, 0.006), -0.32],
      rotation: 0.02,
      rotationX: 0.12,
      rotationY: -0.04,
      surfaceRotationZ: 0.1,
      scale: [0.18, 0.078, 0.102],
      color: MOSS_SHELL_SOFT,
    },
    {
      position: [0.14, getMossShellTopSurfaceY(0.14, -0.34, 0.002), -0.34],
      rotation: 0.12,
      rotationX: 0.04,
      rotationY: 0.035,
      surfaceRotationZ: -0.06,
      scale: [0.2, 0.078, 0.106],
      color: MOSS_SHELL_MID,
    },
    {
      position: [0.31, getMossShellTopSurfaceY(0.31, -0.3, -0.02), -0.3],
      rotation: 0.16,
      rotationX: 0.12,
      rotationY: 0.08,
      surfaceRotationZ: -0.14,
      scale: [0.18, 0.084, 0.106],
      color: MOSS_SHELL_FELT,
    },
    {
      position: [-0.42, 0.3, -0.69],
      rotation: -0.52,
      rotationX: 0.12,
      rotationY: -0.12,
      surfaceRotationZ: 0.18,
      scale: [0.12, 0.064, 0.084],
      color: MOSS_SHELL_MID,
    },
    {
      position: [0.42, 0.29, -0.69],
      rotation: 0.48,
      rotationX: 0.12,
      rotationY: 0.12,
      surfaceRotationZ: -0.18,
      scale: [0.12, 0.064, 0.084],
      color: MOSS_SHELL_SOFT,
    },
    {
      position: [0.02, getMossShellTopSurfaceY(0.02, -0.26, -0.004), -0.26],
      rotation: 0.03,
      rotationX: 0.04,
      rotationY: 0,
      surfaceRotationZ: 0,
      scale: [0.24, 0.078, 0.106],
      color: MOSS_SHELL_MID,
    },
  ].map((blanket) => {
    const [x, y, z] = blanket.position
    const bend = getMossShellFrontCrownBend(x, z)

    return {
      position: [x, y - bend.sink, z + bend.zTuck] as [number, number, number],
      rotation: blanket.rotation,
      rotationX: blanket.rotationX + bend.rotationX * 0.72,
      rotationY: blanket.rotationY + bend.rotationY * 0.62,
      surfaceRotationZ: blanket.surfaceRotationZ + bend.surfaceRotationZ * 0.68,
      scale: [
        blanket.scale[0] * bend.scaleX,
        blanket.scale[1] * bend.scaleY,
        blanket.scale[2] * bend.scaleZ,
      ] as [number, number, number],
      color: blanket.color,
    }
  }) satisfies Array<{
    position: [number, number, number]
    rotation: number
    rotationX: number
    rotationY: number
    surfaceRotationZ: number
    scale: [number, number, number]
    color: string
  }>

  const mossTopBlanketPads = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.21
        const ring = Math.sqrt(((index * 37) % 97 + 0.5) / 97)
        const x = Math.cos(angle) * 0.58 * ring + Math.sin(index * 0.83) * 0.014
        const depth = Math.sin(angle) * 0.58 * ring + Math.cos(index * 0.74) * 0.012
        const z = -0.08 + depth + Math.cos(index * 0.67) * 0.012
        const dome = Math.max(0, 1 - (x / 0.66) ** 2 - (depth / 0.66) ** 2)
        const rearFalloff = Math.max(0, Math.min(1, (z - 0.12) / 0.42))
        const settledScale = 1 - rearFalloff * 0.34
        const colorCycle = index % 14

        return {
          position: [
            x,
            getMossShellTopSurfaceY(x, z, -0.018 + Math.sin(index * 0.91) * 0.001 - rearFalloff * 0.008),
            z,
          ] as [number, number, number],
          rotation: angle * 0.22 + Math.sin(index * 0.57) * 0.44,
          rotationX: Math.sin(index * 0.43) * 0.028,
          rotationY: Math.atan2(x, depth + 0.08) * 0.055,
          scale: [
            (0.22 + (index % 5) * 0.018 + dome * 0.048) * settledScale,
            (0.046 + (index % 4) * 0.004 + dome * 0.006) * settledScale,
            (0.086 + (index % 3) * 0.007 + dome * 0.016) * (1 - rearFalloff * 0.2),
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 8
              ? MOSS_SHELL_SOFT
              : colorCycle === 2 || colorCycle === 11
                ? MOSS_SHELL_LIGHT
                : colorCycle === 5
                  ? MOSS_SHELL_FELT
                  : colorCycle === 9
                    ? MOSS_SHELL_FELT
                    : MOSS_SHELL_MID,
        }
      }),
    [],
  )

  const mossTopPuffs = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.66
        const ring = Math.sqrt(((index * 61) % 307 + 0.5) / 307)
        const x = Math.cos(angle) * 0.61 * ring + Math.sin(index * 0.72) * 0.012
        const depth = Math.sin(angle) * 0.61 * ring + Math.cos(index * 0.81) * 0.011
        const z = -0.08 + depth + Math.sin(index * 1.12) * 0.01
        const dome = Math.max(0, 1 - (x / 0.68) ** 2 - (depth / 0.68) ** 2)
        const rearFalloff = Math.max(0, Math.min(1, (z - 0.14) / 0.42))
        const settledScale = 1 - rearFalloff * 0.2
        const colorCycle = index % 11

        return {
          position: [
            x,
            getMossShellTopSurfaceY(x, z, 0.016 + Math.sin(index * 0.88) * 0.004 - rearFalloff * 0.006),
            z,
          ] as [number, number, number],
          scale: [
            (0.0105 + (index % 5) * 0.0022 + dome * 0.002) * settledScale,
            (0.0095 + (index % 4) * 0.0018 + dome * 0.0018) * settledScale,
            0.0072 + dome * 0.0012,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 7
              ? MOSS_SHELL_SOFT
              : colorCycle === 2
                ? MOSS_SHELL_LIGHT
                : colorCycle === 5
                  ? MOSS_SHELL_FELT
                  : MOSS_SHELL_MID,
          opacity: 0.38 + (index % 5) * 0.03,
        }
      }),
    [],
  )

  const mossTopCushions = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.48
        const ring = Math.sqrt(((index * 29) % 67 + 0.5) / 67)
        const x = Math.cos(angle) * 0.59 * ring + Math.sin(index * 0.63) * 0.018
        const depth = Math.sin(angle) * 0.6 * ring + Math.cos(index * 0.76) * 0.016
        const z = -0.08 + depth + Math.sin(index * 0.71) * 0.012
        const dome = Math.max(0, 1 - (x / 0.68) ** 2 - (depth / 0.68) ** 2)
        const rearFalloff = Math.max(0, Math.min(1, (z - 0.12) / 0.42))
        const settledScale = 1 - rearFalloff * 0.38
        const colorCycle = index % 12

        return {
          position: [
            x,
            getMossShellTopSurfaceY(x, z, 0.011 + Math.sin(index * 0.97) * 0.003 - rearFalloff * 0.007),
            z,
          ] as [number, number, number],
          rotation: angle * 0.3 + Math.sin(index * 0.51) * 0.52,
          scale: [
            (0.12 + (index % 5) * 0.02 + dome * 0.035) * settledScale,
            (0.082 + (index % 4) * 0.009 + dome * 0.022) * settledScale,
            (0.106 + (index % 3) * 0.016 + dome * 0.026) * (1 - rearFalloff * 0.24),
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 6
              ? MOSS_SHELL_SOFT
              : colorCycle === 2 || colorCycle === 9
                ? MOSS_SHELL_LIGHT
                : colorCycle === 4
                  ? MOSS_SHELL_FELT
                  : colorCycle === 8
                    ? MOSS_SHELL_FELT
                    : MOSS_SHELL_MID,
        }
      }),
    [],
  )

  const mossSurfacePuffColonies = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) => {
        const angle = index * 2.399963 + 0.36
        const ring = Math.sqrt(((index * 41) % 89 + 0.5) / 89)
        let x = Math.cos(angle) * 0.62 * ring + Math.sin(index * 0.86) * 0.018
        let y = Math.sin(angle) * 0.52 * ring - 0.035 + Math.cos(index * 0.78) * 0.014
        const cleared = clearMossFaceOpening(x, y, index, 0.1)
        x = cleared[0]
        y = cleared[1]
        const edge = Math.min(1, Math.sqrt((x / 0.64) ** 2 + ((y + 0.035) / 0.54) ** 2))
        const colorCycle = index % 13

        return {
          position: [x, y, -0.704 + Math.sin(index * 0.94) * 0.022 - edge * 0.018] as [number, number, number],
          rotation: angle * 0.24 + Math.sin(index * 0.51) * 0.42,
          rotationY: x * 0.42,
          scale: [
            0.058 + (index % 5) * 0.011 + edge * 0.016,
            0.046 + (index % 4) * 0.006,
            0.05 + (index % 3) * 0.009 + edge * 0.012,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 7
              ? MOSS_SHELL_SOFT
              : colorCycle === 2 || colorCycle === 10
                ? MOSS_SHELL_LIGHT
                : colorCycle === 4
                  ? MOSS_SHELL_FELT
                  : colorCycle === 6
                    ? MOSS_SHELL_FELT
                    : MOSS_SHELL_MID,
        }
      }).filter((colony) => {
        const [x, y, z] = colony.position
        const lowerRightOpeningPuck = x > 0.34 && y < 0.12 && y > -0.08 && z < -0.68

        return !lowerRightOpeningPuck && (y > -0.02 || Math.abs(x) > 0.46)
      }),
    [],
  )

  const mossOrganicPads = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.52
        const ring = Math.sqrt(((index * 59) % 71 + 0.5) / 71)
        let x = Math.cos(angle) * 0.6 * ring + Math.sin(index * 0.77) * 0.018
        let y = Math.sin(angle) * 0.5 * ring - 0.035 + Math.cos(index * 1.07) * 0.014
        const cleared = clearMossFaceOpening(x, y, index, 0.07)
        x = cleared[0]
        y = cleared[1]
        const colorCycle = index % 12

        return {
          position: [x, y, -0.718 + Math.sin(index * 0.91) * 0.028] as [number, number, number],
          rotation: angle * 0.4 + Math.sin(index * 0.56) * 0.5,
          scale: [
            0.026 + (index % 5) * 0.006,
            0.017 + (index % 4) * 0.004,
            0.012,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 6
              ? MOSS_SHELL_FELT
              : colorCycle === 2 || colorCycle === 8
                ? MOSS_SHELL_SOFT
                : colorCycle === 4
                  ? MOSS_SHELL_FELT
                  : colorCycle === 10
                    ? MOSS_SHELL_DRY
                    : MOSS_SHELL_MID,
          accent:
            colorCycle === 2 || colorCycle === 8
              ? MOSS_SHELL_NEW_GROWTH
              : colorCycle === 10
                ? MOSS_SHELL_SOFT
                : MOSS_SHELL_FELT,
        }
      }),
    [],
  )

  const mossOrganicSidePads = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const side: -1 | 1 = index % 2 === 0 ? -1 : 1
        const row = Math.floor(index / 2)
        const colorCycle = index % 10

        return {
          position: [
            side * (0.6 + (((row * 7) % 23) / 23) * 0.08),
            -0.38 + (((row * 17) % 47) / 46) * 0.76 + Math.sin(row * 0.62) * 0.016,
            -0.18 + Math.cos(row * 0.52) * 0.22,
          ] as [number, number, number],
          rotation: side * (0.58 + Math.sin(row * 0.49) * 0.32),
          scale: [
            0.022 + (index % 4) * 0.005,
            0.05 + (index % 5) * 0.009,
            0.011,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 7
              ? MOSS_SHELL_FELT
              : colorCycle === 3
                ? MOSS_SHELL_SOFT
                : colorCycle === 5
                  ? MOSS_SHELL_FELT
                  : MOSS_SHELL_MID,
          accent: colorCycle === 3 ? MOSS_SHELL_NEW_GROWTH : MOSS_SHELL_FELT,
        }
      }),
    [],
  )

  const mossRimWisps = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const theta = (index / 22) * Math.PI * 2 + Math.sin(index * 1.7) * 0.035
        const lower = Math.max(0, -Math.sin(theta))
        const colorCycle = index % 11
        const side = Math.abs(Math.cos(theta))

        return {
          position: [
            Math.cos(theta) * (0.37 + Math.sin(index * 0.9) * 0.014),
            Math.sin(theta) * (0.315 + lower * 0.01) - 0.018 + Math.cos(index * 0.63) * 0.012,
            -0.754 - lower * 0.02 + Math.sin(index * 1.21) * 0.008,
          ] as [number, number, number],
          rotation: theta + Math.PI / 2 + Math.sin(index * 0.71) * 0.46,
          scale: [
            lower > 0.2 ? 0.0042 + (index % 3) * 0.0007 : 0.0058 + (index % 4) * 0.001,
            lower > 0.2 ? 0.0032 + (index % 3) * 0.0005 : 0.0045 + (index % 5) * 0.0009,
            lower > 0.2 ? 0.0032 : 0.0038,
          ] as [number, number, number],
          color:
            lower > 0.2
              ? colorCycle === 5
                ? MOSS_SHELL_SOIL
                : MOSS_SHELL_FELT
            : colorCycle === 0 || colorCycle === 7
              ? MOSS_SHELL_NEW_GROWTH
              : colorCycle === 3
                ? MOSS_SHELL_FELT
              : colorCycle === 5
                  ? MOSS_SHELL_DRY
                  : MOSS_SHELL_SOFT,
          visible: lower < 0.14 || (side > 0.92 && index % 6 === 0),
        }
      }).filter((wisp) => wisp.visible),
    [],
  )

  const mossSmallBreaks = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 1.11
        const ring = Math.sqrt(((index * 47) % 53 + 0.5) / 53)
        let x = Math.cos(angle) * 0.58 * ring + Math.sin(index * 0.93) * 0.018
        let y = Math.sin(angle) * 0.49 * ring - 0.04 + Math.cos(index * 0.71) * 0.014
        const cleared = clearMossFaceOpening(x, y, index, 0.04)
        x = cleared[0]
        y = cleared[1]
        const colorCycle = index % 8

        return {
          position: [x, y, -0.732 + Math.sin(index * 1.2) * 0.024] as [number, number, number],
          rotation: angle * 0.36 + Math.sin(index * 0.49) * 0.55,
          scale: [
            0.008 + (index % 4) * 0.0025,
            0.004 + (index % 3) * 0.0014,
            0.0036,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 5
              ? MOSS_SHELL_DRY
              : colorCycle === 2
                ? MOSS_SHELL_SOIL
              : colorCycle === 4
                  ? MOSS_SHELL_BARK
                  : MOSS_SHELL_SAND,
          opacity: 0.22 + (index % 4) * 0.035,
        }
      }),
    [],
  )

  const mossSideBreaks = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const side: -1 | 1 = index % 2 === 0 ? -1 : 1
        const row = Math.floor(index / 2)
        const colorCycle = index % 7

        return {
          position: [
            side * (0.48 + (((row * 7) % 17) / 17) * 0.092),
            -0.36 + (((row * 11) % 31) / 30) * 0.72 + Math.sin(row * 0.66) * 0.018,
            -0.26 + Math.cos(row * 0.61) * 0.16,
          ] as [number, number, number],
          rotation: side * (0.5 + Math.sin(row * 0.43) * 0.4),
          scale: [
            0.009 + (index % 3) * 0.002,
            0.007 + (index % 4) * 0.0016,
            0.004,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 4
              ? MOSS_SHELL_SAND_LIGHT
              : colorCycle === 2
                ? MOSS_SHELL_SOIL
                : MOSS_SHELL_SAND,
          opacity: 0.2 + (index % 3) * 0.035,
        }
      }),
    [],
  )

  const ancientDustSpecks = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 1.08
        const ring = Math.sqrt(((index * 43) % 131 + 0.5) / 131)
        let x = Math.cos(angle) * 0.59 * ring + Math.sin(index * 0.61) * 0.012
        let y = Math.sin(angle) * 0.5 * ring - 0.035 + Math.cos(index * 0.87) * 0.01
        const cleared = clearMossFaceOpening(x, y, index, 0.02)
        x = cleared[0]
        y = cleared[1]
        const colorCycle = index % 12

        return {
          position: [x, y, -0.724 + Math.sin(index * 1.31) * 0.03] as [number, number, number],
          scale: [
            0.0028 + (index % 4) * 0.0008,
            0.0023 + (index % 3) * 0.0007,
            0.0028,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 8
              ? MOSS_SHELL_DRY
              : colorCycle === 3
                ? MOSS_SHELL_BARK
              : colorCycle === 6
                ? MOSS_SHELL_FELT
                  : colorCycle === 10
                    ? MOSS_SHELL_SOIL
                    : MOSS_SHELL_SOFT,
          opacity: 0.14 + (index % 5) * 0.026,
        }
      }),
    [],
  )

  const ancientHairlineWear = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.74
        const ring = Math.sqrt(((index * 31) % 37 + 0.5) / 37)
        let x = Math.cos(angle) * 0.56 * ring + Math.sin(index * 1.07) * 0.014
        let y = Math.sin(angle) * 0.48 * ring - 0.04 + Math.cos(index * 0.73) * 0.011
        const cleared = clearMossFaceOpening(x, y, index, 0.03)
        x = cleared[0]
        y = cleared[1]
        const colorCycle = index % 7

        return {
          position: [x, y, -0.734 + Math.sin(index * 0.82) * 0.026] as [number, number, number],
          rotation: angle * 0.32 + Math.sin(index * 0.51) * 0.68,
          scale: [
            0.0048 + (index % 3) * 0.0008,
            0.012 + (index % 5) * 0.0022,
            0.003,
          ] as [number, number, number],
          color: colorCycle === 0 ? MOSS_SHELL_BARK : colorCycle === 3 ? MOSS_SHELL_SHADOW : MOSS_SHELL_FELT,
          opacity: 0.1 + (index % 4) * 0.025,
        }
      }),
    [],
  )

  const mossFuzzPuffs = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.22
        const ring = Math.sqrt(((index * 29) % 137 + 0.5) / 137)
        let x = Math.cos(angle) * 0.59 * ring + Math.sin(index * 0.94) * 0.014
        let y = Math.sin(angle) * 0.5 * ring - 0.034 + Math.cos(index * 1.18) * 0.012
        const cleared = clearMossFaceOpening(x, y, index, 0.03)
        x = cleared[0]
        y = cleared[1]
        const colorCycle = index % 11

        return {
          position: [x, y, -0.68 + Math.sin(index * 1.04) * 0.028] as [number, number, number],
          scale: [
            0.0105 + (index % 4) * 0.0025,
            0.0082 + (index % 5) * 0.0021,
            0.0054,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 5
              ? MOSS_SHELL_SOFT
              : colorCycle === 2 || colorCycle === 8
                ? MOSS_SHELL_NEW_GROWTH
                : colorCycle === 4
                  ? MOSS_SHELL_FELT
                  : MOSS_SHELL_MID,
          opacity: 0.25 + (index % 5) * 0.035,
        }
      }),
    [],
  )

  const mossSidePuffs = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const side: -1 | 1 = index % 2 === 0 ? -1 : 1
        const row = Math.floor(index / 2)
        const x = side * (0.57 + (((row * 5) % 23) / 23) * 0.08)
        const y = -0.35 + (((row * 11) % 49) / 48) * 0.74 + Math.cos(row * 0.52) * 0.018
        const z = -0.24 + Math.sin(row * 0.67) * 0.13
        const colorCycle = index % 8

        return {
          position: [x, y, z] as [number, number, number],
          scale: [
            0.008 + (index % 3) * 0.002,
            0.007 + (index % 4) * 0.0017,
            0.0044,
          ] as [number, number, number],
          color:
            colorCycle === 0
              ? MOSS_SHELL_SOFT
              : colorCycle === 3
                ? MOSS_SHELL_FELT
                : colorCycle === 5
                  ? MOSS_SHELL_NEW_GROWTH
                  : MOSS_SHELL_MID,
          opacity: 0.28 + (index % 4) * 0.038,
        }
      }),
    [],
  )

  const mossCanopyPuffs = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.14
        const ring = Math.sqrt(((index * 37) % 181 + 0.5) / 181)
        let x = Math.cos(angle) * 0.61 * ring + Math.sin(index * 0.69) * 0.018
        let y = Math.sin(angle) * 0.51 * ring - 0.035 + Math.cos(index * 0.93) * 0.014
        const cleared = clearMossFaceOpening(x, y, index, 0.04)
        x = cleared[0]
        y = cleared[1]
        const colorCycle = index % 13

        return {
          position: [x, y, -0.704 + Math.sin(index * 1.17) * 0.026] as [number, number, number],
          scale: [
            0.0065 + (index % 5) * 0.002,
            0.0055 + (index % 4) * 0.0017,
            0.0045,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 7
              ? MOSS_SHELL_SOFT
              : colorCycle === 2 || colorCycle === 10
                ? MOSS_SHELL_NEW_GROWTH
                : colorCycle === 5
                  ? MOSS_SHELL_FELT
                  : MOSS_SHELL_MID,
          opacity: 0.31 + (index % 5) * 0.034,
        }
      }),
    [],
  )

  const mossCrawlFibers = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.44
        const ring = Math.sqrt(((index * 41) % 127 + 0.5) / 127)
        let x = Math.cos(angle) * 0.6 * ring + Math.sin(index * 0.72) * 0.016
        let y = Math.sin(angle) * 0.49 * ring - 0.04 + Math.cos(index * 1.04) * 0.012
        const cleared = clearMossFaceOpening(x, y, index, 0.03)
        x = cleared[0]
        y = cleared[1]
        const colorCycle = index % 9

        return {
          position: [x, y, -0.716 + Math.sin(index * 0.88) * 0.022] as [number, number, number],
          rotation: angle * 0.28 + Math.sin(index * 0.57) * 0.58,
          scale: [
            0.0072 + (index % 3) * 0.001,
            0.0068 + (index % 5) * 0.0012,
            0.0044,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 6
              ? MOSS_SHELL_NEW_GROWTH
              : colorCycle === 3
                ? MOSS_SHELL_FELT
                : MOSS_SHELL_SOFT,
          opacity: 0.22 + (index % 5) * 0.032,
        }
      }),
    [],
  )

  const mossSideCanopy = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const side: -1 | 1 = index % 2 === 0 ? -1 : 1
        const row = Math.floor(index / 2)
        const y = -0.38 + (((row * 17) % 71) / 70) * 0.82 + Math.sin(row * 0.68) * 0.018
        const x = side * (0.55 + (((row * 11) % 31) / 31) * 0.11)
        const z = -0.34 + Math.cos(row * 0.53) * 0.2
        const colorCycle = index % 11

        return {
          position: [x, y, z] as [number, number, number],
          scale: [
            0.0075 + (index % 4) * 0.0022,
            0.006 + (index % 5) * 0.0018,
            0.0045,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 8
              ? MOSS_SHELL_SOFT
              : colorCycle === 2 || colorCycle === 6
                ? MOSS_SHELL_NEW_GROWTH
                : colorCycle === 4
                  ? MOSS_SHELL_FELT
                  : MOSS_SHELL_MID,
          opacity: 0.29 + (index % 5) * 0.037,
        }
      }),
    [],
  )

  const mossEdgeFuzz = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const theta = (index / 88) * Math.PI * 2
        const wobble = Math.sin(index * 1.7) * 0.018
        const colorCycle = index % 10

        return {
          position: [
            Math.cos(theta) * (0.61 + wobble),
            Math.sin(theta) * 0.5 - 0.035 + Math.cos(index * 0.6) * 0.012,
            -0.722 + Math.sin(index * 0.79) * 0.018,
          ] as [number, number, number],
          rotation: theta + Math.PI / 2 + Math.sin(index * 0.9) * 0.3,
          scale: [
            0.0074 + (index % 3) * 0.001,
            0.0078 + (index % 4) * 0.0013,
            0.0044,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 6
              ? MOSS_SHELL_SOFT
              : colorCycle === 3
                ? MOSS_SHELL_NEW_GROWTH
                : MOSS_SHELL_MID,
          opacity: 0.26 + (index % 4) * 0.04,
        }
      }),
    [],
  )

  const mossSurfaceFibers = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const angle = index * 2.399963 + 0.68
        const ring = Math.sqrt(((index * 23) % 157 + 0.5) / 157)
        let x = Math.cos(angle) * 0.61 * ring + Math.sin(index * 0.82) * 0.017
        let y = Math.sin(angle) * 0.5 * ring - 0.035 + Math.cos(index * 1.08) * 0.014
        const cleared = clearMossFaceOpening(x, y, index, 0.04)
        x = cleared[0]
        y = cleared[1]
        const colorCycle = index % 10

        return {
          position: [x, y, -0.658 + Math.sin(index * 1.27) * 0.034] as [number, number, number],
          rotation: angle * 0.34 + Math.sin(index * 0.63) * 0.72,
          scale: [
            0.0074 + (index % 4) * 0.001,
            0.0072 + (index % 5) * 0.0012,
            0.0044,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 7
              ? MOSS_SHELL_NEW_GROWTH
              : colorCycle === 3
                ? MOSS_SHELL_FELT
                : colorCycle === 5
                  ? MOSS_SHELL_FELT
                  : MOSS_SHELL_SOFT,
          opacity: 0.2 + (index % 5) * 0.032,
        }
      }),
    [],
  )

  const mossSideFibers = useMemo(
    () =>
      Array.from({ length: 0 }, (_, index) => {
        const side: -1 | 1 = index % 2 === 0 ? -1 : 1
        const row = Math.floor(index / 2)
        const y = -0.34 + (((row * 13) % 67) / 66) * 0.72 + Math.sin(row * 0.83) * 0.018
        const x = side * (0.58 + (((row * 7) % 19) / 19) * 0.08)
        const z = -0.22 + Math.sin(row * 0.74) * 0.12
        const colorCycle = index % 9

        return {
          position: [x, y, z] as [number, number, number],
          rotation: side * (0.58 + Math.sin(row * 0.41) * 0.46),
          scale: [
            0.0078 + (index % 3) * 0.001,
            0.0078 + (index % 5) * 0.0012,
            0.0046,
          ] as [number, number, number],
          color:
            colorCycle === 0 || colorCycle === 4
              ? MOSS_SHELL_SOFT
              : colorCycle === 2
                ? MOSS_SHELL_NEW_GROWTH
                : colorCycle === 5
                  ? MOSS_SHELL_FELT
                  : MOSS_SHELL_MID,
          opacity: 0.28 + (index % 4) * 0.036,
        }
      }),
    [],
  )

  const mossCushions = [
    { position: [-0.22, 0.5, -0.688], rotation: 0.12, scale: [0.104, 0.034, 0.024], color: MOSS_SHELL_MID },
    { position: [0.16, 0.515, -0.69], rotation: -0.08, scale: [0.082, 0.03, 0.02], color: MOSS_SHELL_NEW_GROWTH },
  ] satisfies Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
  }>

  const mossCrownCanopyPads = [
    { position: [-0.3, 0.482, -0.36], rotation: 0.06, scale: [0.11, 0.048, 0.05], color: MOSS_SHELL_SOFT },
    { position: [-0.1, 0.546, -0.35], rotation: 0.04, scale: [0.16, 0.046, 0.048], color: MOSS_SHELL_MID },
    { position: [0.18, 0.538, -0.352], rotation: 0.12, scale: [0.15, 0.046, 0.048], color: MOSS_SHELL_SOFT },
    { position: [0.36, 0.476, -0.36], rotation: -0.06, scale: [0.102, 0.044, 0.046], color: MOSS_SHELL_FELT },
  ].map((pad) => {
    const [x, y, z] = pad.position
    const bend = getMossShellFrontCrownBend(x, z)

    return {
      position: [x, y - bend.sink * 1.15 - 0.008, z + bend.zTuck * 0.95 + 0.012] as [number, number, number],
      rotation: pad.rotation,
      rotationX: -0.48 + bend.rotationX * 1.12,
      rotationY: bend.rotationY * 0.66,
      surfaceRotationZ: x * -0.68 + bend.surfaceRotationZ * 0.92,
      scale: [
        pad.scale[0] * 0.94 * bend.scaleX,
        pad.scale[1] * 1.12 * (1 + bend.intensity * 0.06),
        pad.scale[2] * 1.55 * bend.scaleZ,
      ] as [number, number, number],
      color: pad.color,
    }
  }) satisfies Array<{
    position: [number, number, number]
    rotation: number
    rotationX: number
    rotationY: number
    surfaceRotationZ: number
    scale: [number, number, number]
    color: string
  }>

  const mossTopBackBridgePads: Array<{
    position: [number, number, number]
    rotation: number
    rotationX: number
    rotationY: number
    surfaceRotationZ: number
    scale: [number, number, number]
    color: string
  }> = []

  const mossTopBackCanopyBridge: Array<{
    position: [number, number, number]
    rotation: number
    rotationX: number
    rotationY: number
    surfaceRotationZ: number
    scale: [number, number, number]
    color: string
  }> = []

  const mossFullTopPuffCanopy = [
    { x: -0.31, z: -0.26, lift: 0, rotation: -0.34, rotationX: -0.13, rotationY: -0.11, scale: [0.16, 0.074, 0.088], color: MOSS_SHELL_SOFT },
    { x: -0.04, z: -0.3, lift: 0.01, rotation: 0.08, rotationX: -0.11, rotationY: -0.02, scale: [0.22, 0.088, 0.104], color: MOSS_SHELL_LIGHT },
    { x: 0.23, z: -0.23, lift: 0, rotation: 0.29, rotationX: -0.08, rotationY: 0.07, scale: [0.19, 0.081, 0.097], color: MOSS_SHELL_SOFT },
    { x: 0.43, z: -0.08, lift: -0.012, rotation: 0.48, rotationX: -0.03, rotationY: 0.15, scale: [0.15, 0.072, 0.086], color: MOSS_SHELL_MID },
    { x: -0.47, z: -0.03, lift: -0.006, rotation: -0.44, rotationX: -0.04, rotationY: -0.15, scale: [0.145, 0.07, 0.086], color: MOSS_SHELL_MID },
    { x: -0.29, z: 0.08, lift: 0.008, rotation: -0.2, rotationX: 0, rotationY: -0.08, scale: [0.2, 0.084, 0.1], color: MOSS_SHELL_SOFT },
    { x: -0.02, z: -0.01, lift: 0.014, rotation: -0.04, rotationX: -0.02, rotationY: 0.02, scale: [0.24, 0.092, 0.108], color: MOSS_SHELL_LIGHT },
    { x: 0.16, z: 0.12, lift: 0.006, rotation: 0.19, rotationX: 0.02, rotationY: 0.06, scale: [0.2, 0.085, 0.1], color: MOSS_SHELL_SOFT },
    { x: 0.36, z: 0.02, lift: -0.006, rotation: 0.36, rotationX: 0, rotationY: 0.12, scale: [0.17, 0.078, 0.093], color: MOSS_SHELL_MID },
    { x: -0.42, z: 0.2, lift: -0.012, rotation: -0.32, rotationX: 0.06, rotationY: -0.12, scale: [0.15, 0.073, 0.09], color: MOSS_SHELL_SOFT },
    { x: -0.18, z: 0.25, lift: 0, rotation: -0.12, rotationX: 0.07, rotationY: -0.06, scale: [0.19, 0.083, 0.1], color: MOSS_SHELL_LIGHT },
    { x: 0.08, z: 0.29, lift: -0.006, rotation: 0.08, rotationX: 0.09, rotationY: 0.02, scale: [0.19, 0.083, 0.101], color: MOSS_SHELL_SOFT },
    { x: 0.31, z: 0.25, lift: -0.018, rotation: 0.28, rotationX: 0.1, rotationY: 0.1, scale: [0.155, 0.075, 0.092], color: MOSS_SHELL_MID },
    { x: -0.3, z: 0.39, lift: -0.034, rotation: -0.26, rotationX: 0.13, rotationY: -0.1, scale: [0.13, 0.07, 0.09], color: MOSS_SHELL_MID },
    { x: -0.05, z: 0.43, lift: -0.024, rotation: -0.02, rotationX: 0.13, rotationY: 0, scale: [0.16, 0.078, 0.098], color: MOSS_SHELL_SOFT },
    { x: 0.2, z: 0.42, lift: -0.032, rotation: 0.22, rotationX: 0.14, rotationY: 0.07, scale: [0.14, 0.072, 0.09], color: MOSS_SHELL_LIGHT },
    { x: -0.15, z: -0.14, lift: 0.016, rotation: -0.18, rotationX: -0.08, rotationY: -0.04, scale: [0.15, 0.074, 0.092], color: MOSS_SHELL_MID },
    { x: 0.12, z: -0.1, lift: 0.012, rotation: 0.16, rotationX: -0.06, rotationY: 0.04, scale: [0.16, 0.076, 0.094], color: MOSS_SHELL_SOFT },
    { x: 0.03, z: 0.18, lift: 0.002, rotation: 0.02, rotationX: 0.04, rotationY: 0.02, scale: [0.145, 0.074, 0.094], color: MOSS_SHELL_MID },
  ].map((pad) => {
    const drape = getMossShellSurfaceDrape(pad.x, pad.z)
    const frontCurl = Math.max(0, Math.min(1, (-0.16 - pad.z) / 0.18))
    const bend = getMossShellFrontCrownBend(pad.x, pad.z)

    return {
      position: [
        pad.x,
        getMossShellTopSurfaceY(pad.x, pad.z, pad.lift - bend.sink * 0.72),
        pad.z + bend.zTuck * 0.58,
      ] as [number, number, number],
      rotation: pad.rotation,
      rotationX: pad.rotationX + drape.rotationX * (0.28 + frontCurl * 0.32) + bend.rotationX * 0.42 - frontCurl * 0.04,
      rotationY: pad.rotationY + bend.rotationY * 0.52,
      scale: [
        pad.scale[0] * (1 - bend.intensity * 0.05),
        pad.scale[1] * (1 + bend.intensity * 0.16),
        pad.scale[2] * (1 + bend.intensity * 0.18),
      ] as [number, number, number],
      color: pad.color,
    }
  })

  const mossMidShoulderCoverPads = [
    { position: [0.58, 0.43, -0.02], rotation: 0.12, rotationX: -0.02, rotationY: 0.42, scale: [0.12, 0.056, 0.07], color: MOSS_SHELL_SOFT },
    { position: [0.62, 0.36, 0.12], rotation: 0.2, rotationX: 0.02, rotationY: 0.48, scale: [0.12, 0.056, 0.072], color: MOSS_SHELL_LIGHT },
    { position: [0.58, 0.28, 0.26], rotation: 0.26, rotationX: 0.06, rotationY: 0.44, scale: [0.11, 0.052, 0.068], color: MOSS_SHELL_SOFT },
  ].map((clump) => {
    const [x, y, z] = clump.position
    const bend = getMossShellSideWallBend(x, y, z)

    return {
      position: [x + bend.xTuck * 1.18, y - bend.yDrop * 1.08, z + bend.zSettle] as [number, number, number],
      rotation: clump.rotation - Math.sign(x) * bend.intensity * 0.05,
      rotationX: clump.rotationX + bend.rotationX * 0.92,
      rotationY: clump.rotationY + bend.rotationY,
      scale: [
        clump.scale[0] * bend.scaleX,
        clump.scale[1] * (1 + bend.intensity * 0.08),
        clump.scale[2] * (1 + bend.intensity * 0.2),
      ] as [number, number, number],
      color: clump.color,
    }
  }) satisfies Array<{
    position: [number, number, number]
    rotation: number
    rotationX: number
    rotationY: number
    scale: [number, number, number]
    color: string
  }>

  const mossMidShoulderSideMats: Array<{
    position: [number, number, number]
    rotation: number
    rotationY: number
    scale: [number, number, number]
    color: string
  }> = []

  const mossTopDraggedSpherePads = [
    { x: -0.38, z: -0.18, lift: -0.058, rotation: -0.24, rotationY: -0.08, scale: [0.19, 0.034, 0.062], color: MOSS_SHELL_FELT },
    { x: -0.46, z: 0.02, lift: -0.058, rotation: -0.34, rotationY: -0.12, scale: [0.16, 0.032, 0.058], color: MOSS_SHELL_MID },
    { x: -0.24, z: 0.04, lift: -0.074, rotation: -0.16, rotationY: -0.08, scale: [0.23, 0.038, 0.072], color: MOSS_SHELL_SOFT },
    { x: 0.02, z: 0.04, lift: -0.082, rotation: 0.04, rotationY: 0, scale: [0.26, 0.04, 0.078], color: MOSS_SHELL_MID },
    { x: 0.3, z: 0.02, lift: -0.072, rotation: 0.22, rotationY: 0.08, scale: [0.22, 0.038, 0.07], color: MOSS_SHELL_SOFT },
    { x: 0.5, z: 0, lift: -0.058, rotation: 0.38, rotationY: 0.12, scale: [0.15, 0.032, 0.056], color: MOSS_SHELL_FELT },
    { x: 0.58, z: 0.14, lift: -0.018, rotation: 0.44, rotationY: 0.18, scale: [0.14, 0.046, 0.082], color: MOSS_SHELL_SOFT },
    { x: 0.22, z: 0.12, lift: -0.078, rotation: 0.14, rotationY: 0.04, scale: [0.22, 0.042, 0.078], color: MOSS_SHELL_SOFT },
    { x: 0.38, z: 0.16, lift: -0.056, rotation: 0.28, rotationY: 0.1, scale: [0.19, 0.044, 0.08], color: MOSS_SHELL_LIGHT },
    { x: -0.34, z: 0.22, lift: -0.066, rotation: -0.28, rotationY: -0.12, scale: [0.18, 0.034, 0.066], color: MOSS_SHELL_FELT },
    { x: -0.08, z: 0.23, lift: -0.084, rotation: -0.04, rotationY: -0.03, scale: [0.24, 0.038, 0.074], color: MOSS_SHELL_MID },
    { x: 0.2, z: 0.22, lift: -0.078, rotation: 0.16, rotationY: 0.06, scale: [0.22, 0.036, 0.07], color: MOSS_SHELL_SOFT },
    { x: -0.48, z: 0.24, lift: -0.04, rotation: -0.38, rotationY: -0.13, scale: [0.15, 0.034, 0.062], color: MOSS_SHELL_SOFT },
    { x: -0.28, z: 0.36, lift: -0.052, rotation: -0.22, rotationY: -0.08, scale: [0.2, 0.04, 0.076], color: MOSS_SHELL_MID },
    { x: -0.02, z: 0.42, lift: -0.066, rotation: -0.02, rotationY: 0, scale: [0.24, 0.042, 0.08], color: MOSS_SHELL_SOFT },
    { x: 0.24, z: 0.38, lift: -0.058, rotation: 0.2, rotationY: 0.08, scale: [0.2, 0.04, 0.076], color: MOSS_SHELL_LIGHT },
    { x: 0.46, z: 0.25, lift: -0.04, rotation: 0.38, rotationY: 0.13, scale: [0.15, 0.034, 0.062], color: MOSS_SHELL_MID },
    { x: 0.58, z: 0.28, lift: -0.014, rotation: 0.48, rotationY: 0.2, scale: [0.14, 0.046, 0.084], color: MOSS_SHELL_LIGHT },
    { x: 0.08, z: 0.34, lift: -0.074, rotation: 0.08, rotationY: 0.02, scale: [0.23, 0.044, 0.082], color: MOSS_SHELL_MID },
    { x: 0.18, z: 0.44, lift: -0.058, rotation: 0.16, rotationY: 0.06, scale: [0.22, 0.046, 0.084], color: MOSS_SHELL_SOFT },
    { x: 0.38, z: 0.34, lift: -0.052, rotation: 0.3, rotationY: 0.12, scale: [0.18, 0.044, 0.078], color: MOSS_SHELL_SOFT },
    { x: 0.5, z: 0.36, lift: -0.034, rotation: 0.44, rotationY: 0.16, scale: [0.14, 0.04, 0.07], color: MOSS_SHELL_MID },
    { x: 0.28, z: 0.52, lift: -0.03, rotation: 0.22, rotationY: 0.08, scale: [0.18, 0.046, 0.084], color: MOSS_SHELL_LIGHT },
    { x: 0.36, z: 0.49, lift: -0.02, rotation: 0.24, rotationY: 0.1, scale: [0.16, 0.042, 0.074], color: MOSS_SHELL_FELT },
    { x: 0.5, z: 0.45, lift: -0.006, rotation: 0.4, rotationY: 0.16, scale: [0.15, 0.046, 0.082], color: MOSS_SHELL_SOFT },
    { x: 0.54, z: 0.48, lift: -0.008, rotation: 0.48, rotationY: 0.18, scale: [0.12, 0.038, 0.066], color: MOSS_SHELL_SOFT },
    { x: 0.44, z: 0.55, lift: -0.012, rotation: 0.36, rotationY: 0.14, scale: [0.14, 0.044, 0.078], color: MOSS_SHELL_MID },
    { x: -0.16, z: 0.52, lift: -0.018, rotation: -0.12, rotationY: -0.04, scale: [0.16, 0.036, 0.064], color: MOSS_SHELL_FELT },
    { x: 0.16, z: 0.51, lift: -0.018, rotation: 0.14, rotationY: 0.04, scale: [0.16, 0.036, 0.064], color: MOSS_SHELL_SOFT },
    { x: -0.28, z: -0.23, lift: -0.074, rotation: 0.18, rotationY: -0.05, scale: [0.19, 0.032, 0.058], color: MOSS_SHELL_SOFT },
    { x: -0.16, z: -0.16, lift: -0.064, rotation: -0.06, rotationY: -0.03, scale: [0.24, 0.038, 0.068], color: MOSS_SHELL_MID },
    { x: 0.02, z: -0.24, lift: -0.08, rotation: -0.12, rotationY: 0, scale: [0.22, 0.034, 0.062], color: MOSS_SHELL_LIGHT },
    { x: 0.1, z: -0.16, lift: -0.064, rotation: 0.08, rotationY: 0.03, scale: [0.24, 0.038, 0.068], color: MOSS_SHELL_SOFT },
    { x: 0.28, z: -0.24, lift: -0.074, rotation: -0.18, rotationY: 0.05, scale: [0.18, 0.032, 0.058], color: MOSS_SHELL_MID },
    { x: 0.34, z: -0.18, lift: -0.058, rotation: 0.26, rotationY: 0.08, scale: [0.19, 0.034, 0.062], color: MOSS_SHELL_MID },
    { x: -0.5, z: -0.31, lift: -0.04, rotation: -0.42, rotationY: -0.12, scale: [0.16, 0.034, 0.058], color: MOSS_SHELL_SOFT },
    { x: -0.29, z: -0.32, lift: -0.048, rotation: -0.2, rotationY: -0.07, scale: [0.23, 0.04, 0.074], color: MOSS_SHELL_LIGHT },
    { x: -0.18, z: -0.4, lift: -0.058, rotation: 0.14, rotationY: -0.04, scale: [0.22, 0.036, 0.07], color: MOSS_SHELL_FELT },
    { x: -0.04, z: -0.34, lift: -0.056, rotation: -0.02, rotationY: -0.01, scale: [0.27, 0.042, 0.078], color: MOSS_SHELL_MID },
    { x: 0.1, z: -0.41, lift: -0.058, rotation: -0.16, rotationY: 0.03, scale: [0.24, 0.038, 0.074], color: MOSS_SHELL_SOFT },
    { x: 0.23, z: -0.32, lift: -0.05, rotation: 0.18, rotationY: 0.06, scale: [0.24, 0.04, 0.074], color: MOSS_SHELL_SOFT },
    { x: -0.52, z: -0.46, lift: -0.026, rotation: -0.5, rotationY: -0.12, scale: [0.15, 0.034, 0.06], color: MOSS_SHELL_MID },
    { x: -0.4, z: -0.43, lift: -0.006, rotation: -0.32, rotationY: -0.08, scale: [0.15, 0.034, 0.062], color: MOSS_SHELL_SOFT },
    { x: -0.22, z: -0.38, lift: 0.014, rotation: -0.08, rotationY: -0.02, scale: [0.15, 0.034, 0.06], color: MOSS_SHELL_LIGHT },
    { x: 0.24, z: -0.38, lift: 0.014, rotation: 0.14, rotationY: 0.04, scale: [0.15, 0.034, 0.06], color: MOSS_SHELL_MID },
    { x: -0.08, z: -0.24, lift: -0.086, rotation: 0.2, rotationY: -0.02, scale: [0.2, 0.03, 0.056], color: MOSS_SHELL_FELT },
    { x: 0.22, z: -0.26, lift: -0.084, rotation: -0.18, rotationY: 0.04, scale: [0.18, 0.03, 0.054], color: MOSS_SHELL_MID },
  ].map((pad, index) => {
    const scatteredX = pad.x + Math.sin(index * 1.37 + pad.z * 4.1) * 0.02
    const scatteredZ =
      pad.z + Math.cos(index * 1.11 + pad.x * 3.8) * 0.026 + Math.sin(index * 0.53 + pad.x) * 0.014
    const edgeTuck = Math.max(0, Math.min(1, (Math.abs(scatteredX) - 0.28) / 0.24))
    const tuckedX = scatteredX - Math.sign(scatteredX) * edgeTuck * 0.058
    const drape = getMossShellSurfaceDrape(tuckedX, scatteredZ)
    const openingDrape = Math.max(0, Math.min(1, (-0.28 - scatteredZ) / 0.34)) * Math.max(0, 1 - Math.abs(tuckedX) / 0.78)
    const openingSideWrap = openingDrape * Math.max(0, Math.min(1, (Math.abs(tuckedX) - 0.18) / 0.36))
    const crownBend = getMossShellFrontCrownBend(tuckedX, scatteredZ)
    const mossRoundness = 0.92 + Math.sin(index * 1.71) * 0.06 + Math.cos(index * 0.39) * 0.04
    const puffLift = 1.08 + Math.cos(index * 1.27) * 0.08

    return {
      position: [
        tuckedX,
        getMossShellTopSurfaceY(
          tuckedX,
          scatteredZ,
          pad.lift - 0.026 - edgeTuck * 0.018 - openingDrape * 0.018 - crownBend.sink * 0.62,
        ),
        scatteredZ + openingDrape * (0.016 + openingSideWrap * 0.014) + crownBend.zTuck * 0.5,
      ] as [number, number, number],
      rotation: pad.rotation + Math.sin(index * 1.43) * 0.18 - Math.sign(scatteredX) * edgeTuck * 0.18,
      rotationX: drape.rotationX * (1 + openingDrape * 0.48) + crownBend.rotationX * 0.46 + edgeTuck * 0.12 - openingDrape * 0.1,
      rotationY: pad.rotationY + Math.cos(index * 0.97) * 0.025 + crownBend.rotationY * 0.44,
      surfaceRotationZ:
        drape.surfaceRotationZ * (1 + openingSideWrap * 0.45)
        + crownBend.surfaceRotationZ * 0.42
        + Math.sign(tuckedX) * openingSideWrap * 0.2,
      scale: [
        pad.scale[0] * mossRoundness * (1 - edgeTuck * 0.3 - openingDrape * 0.12 - crownBend.intensity * 0.04),
        pad.scale[1] * puffLift * (1 + edgeTuck * 0.38 + openingDrape * 0.18 + crownBend.intensity * 0.12),
        pad.scale[2]
          * (1.04 + Math.sin(index * 1.09) * 0.055)
          * (1 + edgeTuck * 0.2 + openingDrape * 0.28 + crownBend.intensity * 0.18),
      ] as [number, number, number],
      color: pad.color,
    }
  })

  const heroTufts: Array<{
    position: [number, number, number]
    rotation: number
    scale: number
    color: string
    height: number
    flip: -1 | 1
  }> = []

  const rearMossCushions: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
  }> = []

  const rearPuffyMossReplacementClumps: Array<{
    position: [number, number, number]
    rotation: number
    rotationX: number
    rotationY: number
    scale: [number, number, number]
    color: string
  }> = []

  const rearLinePuffyMossReplacementClumps: Array<{
    position: [number, number, number]
    rotation: number
    rotationX: number
    rotationY: number
    scale: [number, number, number]
    color: string
  }> = []

  const mossArmShoulderPuffClusters = [
    { position: [-0.662, 0.342, -0.18], rotation: -0.54, rotationX: -0.14, rotationY: -0.7, scale: [0.18, 0.104, 0.124], color: MOSS_SHELL_SOFT },
    { position: [-0.584, 0.278, -0.096], rotation: -0.26, rotationX: -0.08, rotationY: -0.58, scale: [0.146, 0.088, 0.108], color: MOSS_SHELL_LIGHT },
    { position: [-0.704, 0.2, -0.03], rotation: -0.72, rotationX: -0.18, rotationY: -0.76, scale: [0.122, 0.078, 0.094], color: MOSS_SHELL_MID },
    { position: [-0.53, 0.39, 0.026], rotation: 0.04, rotationX: 0.0, rotationY: -0.44, scale: [0.132, 0.078, 0.096], color: MOSS_SHELL_SOFT },
    { position: [-0.628, 0.162, 0.094], rotation: -0.46, rotationX: -0.04, rotationY: -0.64, scale: [0.102, 0.066, 0.082], color: MOSS_SHELL_FELT },
    { position: [-0.468, 0.246, 0.158], rotation: 0.16, rotationX: 0.02, rotationY: -0.34, scale: [0.088, 0.06, 0.074], color: MOSS_SHELL_MID },
    { position: [0.638, 0.314, -0.192], rotation: 0.42, rotationX: -0.14, rotationY: 0.64, scale: [0.154, 0.094, 0.114], color: MOSS_SHELL_MID },
    { position: [0.708, 0.224, -0.072], rotation: 0.66, rotationX: -0.12, rotationY: 0.78, scale: [0.128, 0.08, 0.1], color: MOSS_SHELL_SOFT },
    { position: [0.548, 0.382, 0.012], rotation: 0.1, rotationX: -0.02, rotationY: 0.46, scale: [0.136, 0.082, 0.1], color: MOSS_SHELL_LIGHT },
    { position: [0.646, 0.158, 0.072], rotation: 0.5, rotationX: -0.04, rotationY: 0.68, scale: [0.098, 0.066, 0.084], color: MOSS_SHELL_SOFT },
    { position: [0.486, 0.274, 0.154], rotation: -0.04, rotationX: 0.04, rotationY: 0.34, scale: [0.088, 0.058, 0.074], color: MOSS_SHELL_FELT },
  ].map((clump) => {
    const bend = getMossShellSideWallBend(clump.position[0], clump.position[1], clump.position[2])

    return {
      position: [
        clump.position[0] + bend.xTuck * 1.12,
        clump.position[1] - bend.yDrop * 1.08 - 0.006,
        clump.position[2] + bend.zSettle,
      ] as [number, number, number],
      rotation: clump.rotation + bend.surfaceRotationZ * 0.74,
      rotationX: clump.rotationX + bend.rotationX * 0.86,
      rotationY: clump.rotationY + bend.rotationY,
      scale: [
        clump.scale[0] * bend.scaleX,
        clump.scale[1] * (1 + bend.intensity * 0.1),
        clump.scale[2] * (1 + bend.intensity * 0.22),
      ] as [number, number, number],
      color: clump.color,
    }
  }) satisfies Array<{
    position: [number, number, number]
    rotation: number
    rotationX: number
    rotationY: number
    scale: [number, number, number]
    color: string
  }>

  const rearMossBlanketPads: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
  }> = []

  const rearMossCarpetPads: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
  }> = []

  const sideBackMossBlanketPads: Array<{
    position: [number, number, number]
    rotation: number
    rotationY: number
    scale: [number, number, number]
    color: string
  }> = []

  const upperShoulderMossPads = [
    { position: [-0.2, 0.18, -0.32], rotation: 0.04, rotationY: -0.32, scale: [0.156, 0.05, 0.04], color: MOSS_SHELL_LIGHT },
    { position: [-0.32, 0.33, 0.2], rotation: 0.08, rotationY: -0.42, scale: [0.146, 0.042, 0.038], color: MOSS_SHELL_LIGHT },
    { position: [-0.12, 0.4, 0.08], rotation: -0.05, rotationY: -0.16, scale: [0.162, 0.046, 0.042], color: MOSS_SHELL_SOFT },
    { position: [0.16, 0.39, 0.18], rotation: 0.12, rotationY: 0.18, scale: [0.156, 0.044, 0.04], color: MOSS_SHELL_MID },
    { position: [0.26, 0.44, 0.3], rotation: 0.16, rotationY: 0.26, scale: [0.16, 0.048, 0.044], color: MOSS_SHELL_SOFT },
    { position: [0.46, 0.36, 0.36], rotation: 0.34, rotationY: 0.5, scale: [0.142, 0.05, 0.044], color: MOSS_SHELL_LIGHT },
  ] satisfies Array<{
    position: [number, number, number]
    rotation: number
    rotationY: number
    scale: [number, number, number]
    color: string
  }>

  const sideVolumeMossClumps = [
    { position: [-0.4, 0.32, 0.02], rotation: 0.08, rotationY: -0.42, scale: 1.02, side: -1, color: MOSS_SHELL_LIGHT },
    { position: [-0.35, 0.16, 0.32], rotation: 0.26, rotationY: -0.3, scale: 1.02, side: -1, color: MOSS_SHELL_SOFT },
    { position: [-0.24, 0.38, -0.22], rotation: -0.04, rotationY: -0.26, scale: 0.94, side: -1, color: MOSS_SHELL_MID },
    { position: [-0.23, 0.31, 0.34], rotation: 0.22, rotationY: -0.18, scale: 0.9, side: -1, color: MOSS_SHELL_FELT },
    { position: [0.4, 0.3, 0.06], rotation: -0.08, rotationY: 0.42, scale: 1, side: 1, color: MOSS_SHELL_LIGHT },
    { position: [0.38, 0.4, 0.12], rotation: -0.08, rotationY: 0.24, scale: 0.42, side: 1, color: MOSS_SHELL_SOFT },
    { position: [0.34, 0.32, 0.2], rotation: -0.12, rotationY: 0.22, scale: 0.38, side: 1, color: MOSS_SHELL_LIGHT },
    { position: [0.26, 0.37, -0.18], rotation: 0.04, rotationY: 0.26, scale: 0.92, side: 1, color: MOSS_SHELL_MID },
    { position: [0.23, 0.3, 0.36], rotation: -0.22, rotationY: 0.18, scale: 0.88, side: 1, color: MOSS_SHELL_FELT },
    { position: [-0.08, 0.39, 0.08], rotation: -0.08, rotationY: -0.12, scale: 0.96, side: -1, color: MOSS_SHELL_MID },
    { position: [0.14, 0.38, 0.16], rotation: 0.12, rotationY: 0.16, scale: 0.94, side: 1, color: MOSS_SHELL_SOFT },
  ] satisfies Array<{
    position: [number, number, number]
    rotation: number
    rotationY: number
    scale: number
    side: -1 | 1
    color: string
  }>

  const rearVolumeMossClumps: Array<{
    position: [number, number, number]
    rotation: number
    rotationY: number
    scale: number
    color: string
  }> = []

  const frontVolumeMossClumps = [
    { position: [-0.49, 0.1, -0.698], rotation: -0.78, rotationY: -0.44, scale: 0.74, color: MOSS_SHELL_SOFT },
    { position: [-0.36, 0.3, -0.7], rotation: -0.5, rotationY: -0.32, scale: 0.64, color: MOSS_SHELL_LIGHT },
  ] satisfies Array<{
    position: [number, number, number]
    rotation: number
    rotationY: number
    scale: number
    color: string
  }>

  const frontMossConglomeratePads = [
    { x: -0.24, z: -0.52, lift: -0.018, rotation: -0.28, rotationX: -0.28, rotationY: -0.12, scale: [0.132, 0.064, 0.082], color: MOSS_SHELL_SOFT },
    { x: -0.04, z: -0.5, lift: -0.01, rotation: -0.04, rotationX: -0.26, rotationY: -0.02, scale: [0.162, 0.07, 0.09], color: MOSS_SHELL_LIGHT },
    { x: 0.19, z: -0.51, lift: -0.018, rotation: 0.2, rotationX: -0.27, rotationY: 0.08, scale: [0.142, 0.064, 0.084], color: MOSS_SHELL_SOFT },
    { x: -0.38, z: -0.59, lift: -0.006, rotation: -0.46, rotationX: -0.34, rotationY: -0.16, scale: [0.102, 0.052, 0.07], color: MOSS_SHELL_MID },
    { x: -0.12, z: -0.61, lift: -0.002, rotation: -0.12, rotationX: -0.36, rotationY: -0.04, scale: [0.118, 0.056, 0.074], color: MOSS_SHELL_SOFT },
    { x: 0.12, z: -0.62, lift: -0.004, rotation: 0.12, rotationX: -0.36, rotationY: 0.04, scale: [0.112, 0.054, 0.072], color: MOSS_SHELL_MID },
    { x: 0.34, z: -0.58, lift: -0.008, rotation: 0.38, rotationX: -0.32, rotationY: 0.14, scale: [0.098, 0.05, 0.068], color: MOSS_SHELL_LIGHT },
  ].map((pad) => {
    const bend = getMossShellFrontCrownBend(pad.x, pad.z)
    const drape = getMossShellSurfaceDrape(pad.x, pad.z)
    const browSettle = Math.max(0, Math.min(1, (-0.46 - pad.z) / 0.18))

    return {
      position: [
        pad.x - Math.sign(pad.x) * bend.intensity * 0.012,
        getMossShellTopSurfaceY(pad.x, pad.z, pad.lift - bend.sink * 0.96 - browSettle * 0.012),
        pad.z + bend.zTuck * 0.82 + browSettle * 0.028,
      ] as [number, number, number],
      rotation: pad.rotation + bend.surfaceRotationZ * 0.42,
      rotationX: pad.rotationX + drape.rotationX * 0.7 + bend.rotationX * 0.78 - browSettle * 0.18,
      rotationY: pad.rotationY + bend.rotationY * 0.52,
      scale: [
        pad.scale[0] * (1 - browSettle * 0.08),
        pad.scale[1] * (1 + bend.intensity * 0.16 + browSettle * 0.12),
        pad.scale[2] * (1 + bend.intensity * 0.18 + browSettle * 0.18),
      ] as [number, number, number],
      color: pad.color,
    }
  }) satisfies Array<{
    position: [number, number, number]
    rotation: number
    rotationX: number
    rotationY: number
    scale: [number, number, number]
    color: string
  }>

  const frontBrowMossConglomerateClumps = [
    { position: [-0.28, 0.32, -0.704], rotation: -0.46, rotationX: -0.62, rotationY: -0.2, scale: [0.108, 0.07, 0.084], color: MOSS_SHELL_SOFT },
    { position: [-0.06, 0.35, -0.714], rotation: -0.08, rotationX: -0.66, rotationY: -0.04, scale: [0.13, 0.078, 0.094], color: MOSS_SHELL_LIGHT },
    { position: [0.18, 0.33, -0.712], rotation: 0.18, rotationX: -0.64, rotationY: 0.08, scale: [0.116, 0.072, 0.088], color: MOSS_SHELL_SOFT },
    { position: [0.36, 0.24, -0.698], rotation: 0.42, rotationX: -0.58, rotationY: 0.2, scale: [0.086, 0.058, 0.072], color: MOSS_SHELL_MID },
    { position: [-0.42, 0.24, -0.696], rotation: -0.48, rotationX: -0.58, rotationY: -0.24, scale: [0.086, 0.058, 0.072], color: MOSS_SHELL_MID },
    { position: [0.04, 0.24, -0.724], rotation: 0.02, rotationX: -0.72, rotationY: 0.02, scale: [0.088, 0.056, 0.07], color: MOSS_SHELL_SOFT },
  ] satisfies Array<{
    position: [number, number, number]
    rotation: number
    rotationX: number
    rotationY: number
    scale: [number, number, number]
    color: string
  }>

  const sideMossCoats: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = []

  const ageFibers: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }> = []

  return (
    <group>
      <mesh visible={false} position={[-0.01, -0.02, -0.53]} rotation-z={-0.025} scale={[0.68, 0.49, 0.028]}>
        <sphereGeometry args={[1, 16, 8]} />
        <meshToonMaterial color={MOSS_SHELL_BASE} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
      </mesh>
      <mesh visible={false} position={[-0.16, 0.36, -0.612]} rotation-z={-0.12} scale={[0.25, 0.04, 0.012]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={MOSS_SHELL_GLOW} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh visible={false} position={[-0.012, -0.062, 0.524]} rotation-z={0.06} scale={[0.28, 0.14, 0.018]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshToonMaterial color={MOSS_SHELL_FELT} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
      </mesh>
      <mesh visible={false} position={[0.008, -0.04, 0.648]} rotation-z={-0.1} scale={[0.084, 0.018, 0.006]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={MOSS_SHELL_BARK} transparent opacity={0.34} depthWrite={false} />
      </mesh>
      {ancientPatinaWashes.map((wash, index) => (
        <mesh
          key={`moss-shell-ancient-wash-${index}`}
          position={wash.position}
          rotation-z={wash.rotation}
          scale={wash.scale}
        >
          <sphereGeometry args={[1, 9, 4]} />
          <meshToonMaterial color={wash.color} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
        </mesh>
      ))}
      {mossTotalCarpetWashes.map((wash, index) => (
        <mesh
          key={`moss-shell-total-carpet-${index}`}
          position={wash.position}
          rotation-z={wash.rotation}
          scale={wash.scale}
        >
          <sphereGeometry args={[1, 12, 5]} />
          <meshToonMaterial color={wash.color} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
        </mesh>
      ))}
      {mossSideCarpetWashes.map((wash, index) => (
        <mesh
          key={`moss-shell-side-carpet-${index}`}
          position={wash.position}
          rotation-z={wash.rotation}
          scale={wash.scale}
        >
          <sphereGeometry args={[1, 10, 5]} />
          <meshToonMaterial color={wash.color} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
        </mesh>
      ))}
      {mossRearCarpetWashes.map((wash, index) => (
        <mesh
          key={`moss-shell-rear-carpet-${index}`}
          position={wash.position}
          rotation-z={wash.rotation}
          scale={wash.scale}
        >
          <sphereGeometry args={[1, 11, 5]} />
          <meshToonMaterial color={wash.color} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
        </mesh>
      ))}
      {mossRearPuffs.map((puff, index) => (
        <OrganicDetailDot
          key={`moss-shell-rear-puff-${index}`}
          position={puff.position}
          scale={puff.scale}
          color={puff.color}
          opacity={puff.opacity}
          solid
        />
      ))}
      {mossWrapMats.map((mat, index) => (
        <MossShellMatPatch
          key={`moss-shell-wrap-mat-${index}`}
          position={mat.position}
          rotation={mat.rotation}
          rotationY={mat.rotationY}
          scale={mat.scale}
          color={mat.color}
          opacity={0.96}
          depthTest={false}
          solid
        />
      ))}
      {mossWrapPuffColonies.map((colony, index) => (
        <MossShellPuffCluster
          key={`moss-shell-wrap-puff-colony-${index}`}
          position={colony.position}
          rotation={colony.rotation}
          rotationX={colony.rotationX}
          rotationY={colony.rotationY}
          scale={colony.scale}
          color={colony.color}
        />
      ))}
      {mossLogBlankets.map((blanket, index) => (
        <MossShellDraggedSpherePad
          key={`moss-shell-log-blanket-${index}`}
          position={blanket.position}
          rotation={blanket.rotation}
          rotationX={blanket.rotationX}
          rotationY={blanket.rotationY}
          surfaceRotationZ={blanket.surfaceRotationZ}
          scale={blanket.scale}
          color={blanket.color}
        />
      ))}
      {mossTopBlanketPads.map((pad, index) => (
        <MossShellPuffCluster
          key={`moss-shell-top-blanket-${index}`}
          position={pad.position}
          rotation={pad.rotation}
          rotationX={pad.rotationX}
          rotationY={pad.rotationY}
          scale={pad.scale}
          color={pad.color}
        />
      ))}
      {mossTopCushions.map((cushion, index) => (
        <MossShellPuffCluster
          key={`moss-shell-top-cushion-${index}`}
          position={cushion.position}
          rotation={cushion.rotation}
          scale={cushion.scale}
          color={cushion.color}
        />
      ))}
      {upperShoulderMossPads.map((pad, index) => (
        <mesh
          key={`moss-shell-upper-shoulder-${index}`}
          position={[pad.position[0], pad.position[1] - 0.018, pad.position[2] - 0.012]}
          rotation-y={pad.rotationY}
          rotation-z={pad.rotation}
          scale={[pad.scale[0] * 0.78, pad.scale[1] * 0.46, pad.scale[2] * 1.18]}
        >
          <sphereGeometry args={[1, 16, 7]} />
          <meshToonMaterial color={pad.color} gradientMap={getVacuumHeadToonRampTexture()} />
        </mesh>
      ))}
      {sideVolumeMossClumps.map((clump, index) => {
        const rearSide = clump.position[2] > 0.1
        const sideShell = Math.abs(clump.position[0]) > 0.32

        if (rearSide) {
          return null
        }

        if (sideShell) {
          return (
            <mesh
              key={`moss-shell-volume-clump-${index}`}
              position={[
                clump.position[0],
                clump.position[1] - 0.012,
                clump.position[2] - 0.006,
              ]}
              rotation-y={clump.rotationY}
              rotation-z={clump.rotation}
              scale={[
                0.16 * clump.scale,
                0.038 * clump.scale,
                0.084 * clump.scale,
              ]}
            >
              <sphereGeometry args={[1, 16, 7]} />
              <meshToonMaterial color={clump.color} gradientMap={getVacuumHeadToonRampTexture()} />
            </mesh>
          )
        }

        return (
          <MossShellVolumeClump
            key={`moss-shell-volume-clump-${index}`}
            position={clump.position}
            rotation={clump.rotation}
            rotationY={clump.rotationY}
            scale={clump.scale}
            side={clump.side}
            color={clump.color}
          />
        )
      })}
      {rearVolumeMossClumps.map((clump, index) => (
        <mesh
          key={`moss-shell-rear-volume-clump-${index}`}
          position={clump.position}
          rotation-x={-0.22}
          rotation-y={clump.rotationY}
          rotation-z={clump.rotation * 0.82}
          scale={[0.18 * clump.scale, 0.052 * clump.scale, 0.108 * clump.scale]}
        >
          <sphereGeometry args={[1, 16, 7]} />
          <meshToonMaterial color={clump.color} gradientMap={getVacuumHeadToonRampTexture()} />
        </mesh>
      ))}
      {frontVolumeMossClumps.map((clump, index) => (
        <MossShellOpeningDrapedClump
          key={`moss-shell-front-volume-clump-${index}`}
          position={clump.position}
          rotation={clump.rotation}
          rotationY={clump.rotationY}
          scale={clump.scale}
          color={clump.color}
        />
      ))}
      {mossCrownCanopyPads.map((pad, index) => (
        <MossShellDraggedSpherePad
          key={`moss-shell-crown-canopy-pad-${index}`}
          position={pad.position}
          rotation={pad.rotation}
          rotationX={pad.rotationX}
          rotationY={pad.rotationY}
          surfaceRotationZ={pad.surfaceRotationZ}
          scale={pad.scale}
          color={pad.color}
        />
      ))}
      {mossTopBackBridgePads.map((pad, index) => (
        <mesh
          key={`moss-shell-top-back-bridge-pad-${index}`}
          position={pad.position}
          rotation-x={pad.rotationX}
          rotation-y={pad.rotationY}
          rotation-z={pad.rotation + pad.surfaceRotationZ}
          scale={pad.scale}
        >
          <sphereGeometry args={[1, 16, 7]} />
          <meshToonMaterial color={pad.color} gradientMap={getVacuumHeadToonRampTexture()} />
        </mesh>
      ))}
      {mossTopBackCanopyBridge.map((clump, index) => (
        <mesh
          key={`moss-shell-top-back-canopy-bridge-${index}`}
          position={clump.position}
          rotation-x={clump.rotationX}
          rotation-y={clump.rotationY}
          rotation-z={clump.rotation + clump.surfaceRotationZ}
          scale={clump.scale}
        >
          <sphereGeometry args={[1, 16, 7]} />
          <meshToonMaterial color={clump.color} gradientMap={getVacuumHeadToonRampTexture()} />
        </mesh>
      ))}
      {mossFullTopPuffCanopy.map((clump, index) => {
        const rearTop = clump.position[2] > 0.12
        const sideSpike = Math.abs(clump.position[0]) > 0.32 && clump.position[2] < 0.3

        if (sideSpike || rearTop) {
          return null
        }

        return (
          <MossShellPuffCluster
            key={`moss-shell-full-top-puff-canopy-${index}`}
            position={clump.position}
            rotation={clump.rotation}
            rotationX={clump.rotationX}
            rotationY={clump.rotationY}
            scale={clump.scale}
            color={clump.color}
          />
        )
      })}
      {mossMidShoulderCoverPads.map((clump, index) => (
        <MossShellPuffCluster
          key={`moss-shell-mid-shoulder-cover-${index}`}
          position={clump.position}
          rotation={clump.rotation}
          rotationX={clump.rotationX}
          rotationY={clump.rotationY}
          scale={clump.scale}
          color={clump.color}
        />
      ))}
      {mossMidShoulderSideMats.map((mat, index) => (
        <MossShellMatPatch
          key={`moss-shell-mid-shoulder-side-mat-${index}`}
          position={mat.position}
          rotation={mat.rotation}
          rotationY={mat.rotationY}
          scale={mat.scale}
          color={mat.color}
          opacity={0.96}
          solid
        />
      ))}
      {mossTopDraggedSpherePads.map((pad, index) => {
        const frontSideFloater = pad.position[2] < -0.34 && Math.abs(pad.position[0]) > 0.3
        const rearHalf = pad.position[2] > 0.12

        if (frontSideFloater || rearHalf) {
          return null
        }

        return (
          <MossShellDraggedSpherePad
            key={`moss-shell-top-dragged-sphere-${index}`}
            position={pad.position}
            rotation={pad.rotation}
            rotationX={pad.rotationX}
            rotationY={pad.rotationY}
            surfaceRotationZ={pad.surfaceRotationZ}
            scale={[pad.scale[0] * 1.14, pad.scale[1] * 1.28, pad.scale[2] * 1.16]}
            color={pad.color}
          />
        )
      })}
      {mossSurfacePuffColonies.map((colony, index) => (
        <MossShellPuffCluster
          key={`moss-shell-surface-puff-colony-${index}`}
          position={colony.position}
          rotation={colony.rotation}
          rotationY={colony.rotationY}
          scale={colony.scale}
          color={colony.color}
        />
      ))}
      {mossBlankets.map((patch, index) => (
        <mesh
          key={`moss-shell-blanket-${index}`}
          position={patch.position}
          rotation-z={patch.rotation}
          scale={patch.scale}
        >
          <sphereGeometry args={[1, 8, 4]} />
          <meshToonMaterial color={patch.color} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
        </mesh>
      ))}
      {mossOrganicPads.map((pad, index) => (
        <MossShellOrganicPad
          key={`moss-shell-organic-pad-${index}`}
          position={pad.position}
          rotation={pad.rotation}
          scale={pad.scale}
          color={pad.color}
          accent={pad.accent}
        />
      ))}
      {mossOrganicSidePads.map((pad, index) => (
        <MossShellOrganicPad
          key={`moss-shell-organic-side-pad-${index}`}
          position={pad.position}
          rotation={pad.rotation}
          scale={pad.scale}
          color={pad.color}
          accent={pad.accent}
        />
      ))}
      {mossRimWisps.map((wisp, index) => (
        <OrganicDetailDot
          key={`moss-shell-rim-wisp-${index}`}
          position={wisp.position}
          scale={wisp.scale}
          color={wisp.color}
          solid
        />
      ))}
      {mossCushions.map((cushion, index) => {
        const theta = Math.atan2(cushion.position[1] + 0.034, cushion.position[0] - 0.028)
        const drape = getMossShellOpeningRimDrape(theta)
        const side = cushion.position[0] < 0 ? -1 : 1
        const frontBrow = cushion.position[2] < -0.67 ? Math.max(0, Math.min(1, (cushion.position[1] - 0.08) / 0.4)) : 0
        const openingArc = frontBrow * Math.max(0, 1 - Math.abs(cushion.position[0] - 0.028) / 0.58)
        const sideFold = frontBrow * Math.max(0, Math.min(1, (Math.abs(cushion.position[0]) - 0.18) / 0.34))

        return (
          <MossShellDraggedSpherePad
            key={`moss-shell-cushion-${index}`}
            position={[
              cushion.position[0] - side * (drape.sideT * 0.032 + sideFold * 0.022 + openingArc * 0.01),
              cushion.position[1] - drape.lower * 0.018 - drape.upper * 0.026 - frontBrow * 0.034 - openingArc * 0.014,
              cushion.position[2] + drape.zInset * 1.12 + drape.sideT * 0.012 + frontBrow * 0.034 + openingArc * 0.024,
            ]}
            rotation={cushion.rotation - side * (drape.sideT * 0.3 + sideFold * 0.16)}
            rotationX={drape.rotationX * 1.74 - drape.upper * 0.22 - drape.sideT * 0.1 - frontBrow * 0.32 - openingArc * 0.12}
            rotationY={drape.rotationY * 1.42 + side * drape.sideT * 0.3 + side * sideFold * 0.2}
            surfaceRotationZ={side * drape.sideT * 0.46 + side * frontBrow * 0.16 + side * sideFold * 0.16}
            scale={[
              cushion.scale[0] * 0.7 * drape.squash * (1 + openingArc * 0.08 - sideFold * 0.08),
              cushion.scale[1] * (1.28 + drape.sideT * 0.08) * (1 - frontBrow * 0.24),
              cushion.scale[2] * (2.64 + drape.sideT * 0.48 + frontBrow * 0.42 + openingArc * 0.18),
            ]}
            color={cushion.color}
          />
        )
      })}
      {sideMossCoats.map((coat, index) => (
        <MossShellMatPatch
          key={`moss-shell-side-coat-${index}`}
          position={coat.position}
          rotation={coat.rotation}
          scale={coat.scale}
          color={coat.color}
          opacity={0.88}
          solid
        />
      ))}
      {mossFuzzPuffs.map((puff, index) => (
        <OrganicDetailDot
          key={`moss-shell-fuzz-puff-${index}`}
          position={puff.position}
          scale={puff.scale}
          color={puff.color}
          opacity={puff.opacity}
          solid
        />
      ))}
      {mossTopPuffs.map((puff, index) => (
        <OrganicDetailDot
          key={`moss-shell-top-puff-${index}`}
          position={puff.position}
          scale={puff.scale}
          color={puff.color}
          opacity={puff.opacity}
          solid
        />
      ))}
      {mossWrapPuffs.map((puff, index) => (
        <OrganicDetailDot
          key={`moss-shell-wrap-puff-${index}`}
          position={puff.position}
          scale={puff.scale}
          color={puff.color}
          opacity={puff.opacity}
          solid
        />
      ))}
      {mossSidePuffs.map((puff, index) => (
        <OrganicDetailDot
          key={`moss-shell-side-puff-${index}`}
          position={puff.position}
          scale={puff.scale}
          color={puff.color}
          opacity={puff.opacity}
          solid
        />
      ))}
      {mossCanopyPuffs.map((puff, index) => (
        <OrganicDetailDot
          key={`moss-shell-canopy-puff-${index}`}
          position={puff.position}
          scale={puff.scale}
          color={puff.color}
          opacity={puff.opacity}
          solid
        />
      ))}
      {mossSideCanopy.map((puff, index) => (
        <OrganicDetailDot
          key={`moss-shell-side-canopy-${index}`}
          position={puff.position}
          scale={puff.scale}
          color={puff.color}
          opacity={puff.opacity}
          solid
        />
      ))}
      {mossWrapLichenSpecks.map((speck, index) => (
        <OrganicDetailDot
          key={`moss-shell-wrap-lichen-${index}`}
          position={speck.position}
          scale={speck.scale}
          color={speck.color}
          opacity={speck.opacity}
          solid
        />
      ))}
      {mossSmallBreaks.map((spot, index) => (
        <mesh
          key={`moss-shell-small-break-${index}`}
          position={spot.position}
          rotation-z={spot.rotation}
          scale={spot.scale}
        >
          <sphereGeometry args={[1, 8, 4]} />
          <meshToonMaterial color={spot.color} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
        </mesh>
      ))}
      {mossSideBreaks.map((spot, index) => (
        <OrganicDetailDot
          key={`moss-shell-side-break-${index}`}
          position={spot.position}
          scale={spot.scale}
          color={spot.color}
          opacity={spot.opacity}
          solid
        />
      ))}
      {mossCrawlFibers.map((fiber, index) => (
        <OrganicDetailDot
          key={`moss-shell-crawl-fiber-${index}`}
          position={fiber.position}
          scale={softenMossNapScale(fiber.scale)}
          color={fiber.color}
          opacity={fiber.opacity}
          solid
        />
      ))}
      {mossEdgeFuzz.map((fiber, index) => (
        <OrganicDetailDot
          key={`moss-shell-edge-fuzz-${index}`}
          position={fiber.position}
          scale={softenMossNapScale(fiber.scale)}
          color={fiber.color}
          opacity={fiber.opacity}
          solid
        />
      ))}
      {ancientHairlineWear.map((fiber, index) => (
        <OrganicDetailDot
          key={`moss-shell-ancient-hairline-${index}`}
          position={fiber.position}
          scale={softenMossNapScale(fiber.scale)}
          color={fiber.color}
          opacity={fiber.opacity}
          solid
        />
      ))}
      {mossSurfaceFibers.map((fiber, index) => (
        <OrganicDetailDot
          key={`moss-shell-surface-fiber-${index}`}
          position={fiber.position}
          scale={softenMossNapScale(fiber.scale)}
          color={fiber.color}
          opacity={fiber.opacity}
          solid
        />
      ))}
      {mossSideFibers.map((fiber, index) => (
        <OrganicDetailDot
          key={`moss-shell-side-fiber-${index}`}
          position={fiber.position}
          scale={softenMossNapScale(fiber.scale)}
          color={fiber.color}
          opacity={fiber.opacity}
          solid
        />
      ))}
      {ancientDustSpecks.map((speck, index) => (
        <OrganicDetailDot
          key={`moss-shell-ancient-dust-${index}`}
          position={speck.position}
          scale={speck.scale}
          color={speck.color}
          opacity={speck.opacity}
          solid
        />
      ))}
      {ageFibers.map((fiber, index) => (
        <OrganicDetailDot
          key={`moss-shell-age-fiber-${index}`}
          position={fiber.position}
          scale={softenMossNapScale(fiber.scale)}
          color={fiber.color}
          opacity={fiber.opacity}
          solid
        />
      ))}
      {lichenDots.map((dot, index) => (
        <OrganicDetailDot
          key={`moss-shell-lichen-${index}`}
          position={dot.position}
          scale={dot.scale}
          color={dot.color}
          opacity={dot.opacity}
          solid
        />
      ))}
      {mossTufts.map((tuft, index) => (
        <MossShellPuffCluster
          key={`moss-shell-tuft-${index}`}
          position={tuft.position}
          rotation={tuft.rotation}
          scale={[0.07 * tuft.scale, 0.052 * tuft.scale, 0.056 * tuft.scale]}
          color={tuft.color}
        />
      ))}
      {heroTufts.map((tuft, index) => (
        <MossShellPuffCluster
          key={`moss-shell-hero-tuft-${index}`}
          position={tuft.position}
          rotation={tuft.rotation}
          scale={[0.082 * tuft.scale, 0.06 * tuft.scale, 0.064 * tuft.scale]}
          color={tuft.color}
        />
      ))}
      {rearMossCarpetPads.map((pad, index) => {
        const bend = getMossShellRearSurfaceBend(pad.position[0], pad.position[1], pad.position[2])

        return (
          <mesh
            key={`moss-shell-rear-carpet-pad-${index}`}
            position={[
              pad.position[0] + bend.xTuck,
              pad.position[1] - bend.yDrop,
              pad.position[2] + bend.zSink,
            ]}
            rotation-x={bend.rotationX}
            rotation-y={bend.rotationY}
            rotation-z={pad.rotation + bend.surfaceRotationZ}
            scale={[
              pad.scale[0] * bend.scaleX,
              pad.scale[1] * bend.scaleY,
              pad.scale[2] * bend.scaleZ,
            ]}
          >
            <sphereGeometry args={[1, 14, 6]} />
            <meshToonMaterial color={pad.color} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
          </mesh>
        )
      })}
      {rearMossBlanketPads.map((pad, index) => {
        const bend = getMossShellRearSurfaceBend(pad.position[0], pad.position[1], pad.position[2])

        return (
          <MossShellMatPatch
            key={`moss-shell-rear-blanket-pad-${index}`}
            position={[
              pad.position[0] + bend.xTuck,
              pad.position[1] - bend.yDrop,
              pad.position[2] + bend.zSink,
            ]}
            rotation={pad.rotation + bend.surfaceRotationZ}
            rotationX={bend.rotationX}
            rotationY={bend.rotationY}
            scale={[
              pad.scale[0] * bend.scaleX,
              pad.scale[1] * bend.scaleY,
              pad.scale[2] * bend.scaleZ,
            ]}
            color={pad.color}
          />
        )
      })}
      {sideBackMossBlanketPads.map((pad, index) => {
        const bend = getMossShellSideWallBend(pad.position[0], pad.position[1], pad.position[2])

        return (
          <mesh
            key={`moss-shell-side-back-blanket-pad-${index}`}
            position={[
              pad.position[0] + bend.xTuck,
              pad.position[1] - bend.yDrop,
              pad.position[2] + bend.zSettle,
            ]}
            rotation-x={bend.rotationX - bend.intensity * 0.08}
            rotation-y={pad.rotationY + bend.rotationY}
            rotation-z={pad.rotation + bend.surfaceRotationZ}
            scale={[
              pad.scale[0] * bend.scaleX,
              pad.scale[1] * Math.max(0.78, bend.scaleY * 0.92),
              pad.scale[2] * bend.scaleZ,
            ]}
          >
            <sphereGeometry args={[1, 14, 6]} />
            <meshToonMaterial color={pad.color} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
          </mesh>
        )
      })}
      {rearMossCushions.map((cushion, index) => {
        const bend = getMossShellRearSurfaceBend(cushion.position[0], cushion.position[1], cushion.position[2])

        return (
          <MossShellMatPatch
            key={`moss-shell-rear-cushion-${index}`}
            position={[
              cushion.position[0] + bend.xTuck,
              cushion.position[1] - bend.yDrop,
              cushion.position[2] + bend.zSink,
            ]}
            rotation={cushion.rotation + bend.surfaceRotationZ}
            rotationX={bend.rotationX}
            rotationY={bend.rotationY}
            scale={[
              cushion.scale[0] * bend.scaleX,
              cushion.scale[1] * bend.scaleY,
              cushion.scale[2] * bend.scaleZ,
            ]}
            color={cushion.color}
            opacity={0.9}
            solid
          />
        )
      })}
      {frontMossConglomeratePads.map((pad, index) => (
        <MossShellPuffCluster
          key={`moss-shell-front-conglomerate-${index}`}
          position={pad.position}
          rotation={pad.rotation}
          rotationX={pad.rotationX}
          rotationY={pad.rotationY}
          scale={pad.scale}
          color={pad.color}
          softness="front-clean"
        />
      ))}
      {frontBrowMossConglomerateClumps.map((clump, index) => (
        <MossShellPuffCluster
          key={`moss-shell-front-brow-conglomerate-${index}`}
          position={clump.position}
          rotation={clump.rotation}
          rotationX={clump.rotationX}
          rotationY={clump.rotationY}
          scale={clump.scale}
          color={clump.color}
          softness="front-clean"
        />
      ))}
      {rearPuffyMossReplacementClumps.map((clump, index) => (
        <MossShellPuffCluster
          key={`moss-shell-rear-puffy-replacement-${index}`}
          position={clump.position}
          rotation={clump.rotation}
          rotationX={clump.rotationX}
          rotationY={clump.rotationY}
          scale={clump.scale}
          color={clump.color}
        />
      ))}
      {rearLinePuffyMossReplacementClumps.map((clump, index) => (
        <MossShellPuffCluster
          key={`moss-shell-rear-line-puffy-replacement-${index}`}
          position={clump.position}
          rotation={clump.rotation}
          rotationX={clump.rotationX}
          rotationY={clump.rotationY}
          scale={clump.scale}
          color={clump.color}
        />
      ))}
      {mossArmShoulderPuffClusters.map((clump, index) => (
        <MossShellPuffCluster
          key={`moss-shell-arm-shoulder-puff-${index}`}
          position={clump.position}
          rotation={clump.rotation}
          rotationX={clump.rotationX}
          rotationY={clump.rotationY}
          scale={clump.scale}
          color={clump.color}
        />
      ))}
    </group>
  )
}

function MossShellOpeningRimGrowth() {
  const rimPads = [
    { theta: Math.PI * 0.5, radiusX: 0.426, radiusY: 0.326, rotation: -0.05, scale: [0.124, 0.04, 0.022], color: MOSS_SHELL_SOFT },
    { theta: Math.PI * 0.66, radiusX: 0.434, radiusY: 0.326, rotation: -0.02, scale: [0.074, 0.032, 0.02], color: MOSS_SHELL_LIGHT },
    { theta: Math.PI * 0.34, radiusX: 0.44, radiusY: 0.32, rotation: 0.03, scale: [0.074, 0.031, 0.02], color: MOSS_SHELL_FELT },
    { theta: Math.PI * 0.92, radiusX: 0.454, radiusY: 0.304, rotation: -0.1, scale: [0.062, 0.056, 0.028], color: MOSS_SHELL_MID },
    { theta: Math.PI * 0.08, radiusX: 0.454, radiusY: 0.304, rotation: 0.1, scale: [0.06, 0.054, 0.028], color: MOSS_SHELL_SOFT },
    { theta: Math.PI * 0.22, radiusX: 0.456, radiusY: 0.314, rotation: 0.08, scale: [0.054, 0.052, 0.024], color: MOSS_SHELL_SOFT },
    { theta: Math.PI * 0.78, radiusX: 0.448, radiusY: 0.316, rotation: -0.08, scale: [0.056, 0.052, 0.024], color: MOSS_SHELL_SOFT },
  ] satisfies Array<{
    theta: number
    radiusX: number
    radiusY: number
    rotation: number
    scale: [number, number, number]
    color: string
  }>

  const undersideFeltPads: Array<{
    theta: number
    radiusX: number
    radiusY: number
    rotation: number
    scale: [number, number, number]
    color: string
  }> = []

  const frontFeltLip: Array<{
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
  }> = []

  const rimPuffs = Array.from({ length: 0 }, (_, index) => {
    const theta = (index / 58) * Math.PI * 2 + Math.sin(index * 1.19) * 0.025
    const lower = Math.max(0, -Math.sin(theta))
    const side = Math.max(0, Math.abs(Math.cos(theta)) - 0.26)
    const colorCycle = index % 12
    const underside = lower > 0.28
    const keepUnderside = underside && side > 0.44 && index % 8 === 0

    return {
      position: [
        0.028 + Math.cos(theta) * (0.442 + side * 0.028 + Math.sin(index * 0.73) * 0.006),
        -0.034 + Math.sin(theta) * (0.324 + lower * 0.016 + Math.cos(index * 0.61) * 0.003) - lower * 0.044,
        -0.758 - lower * 0.026 + side * 0.022 + Math.sin(index * 1.27) * 0.004,
      ] as [number, number, number],
      scale: [
        underside ? 0.0065 + (index % 3) * 0.0009 : 0.010 + (index % 4) * 0.0019 + side * 0.002,
        underside ? 0.0048 + (index % 3) * 0.0008 : 0.008 + (index % 5) * 0.0014,
        underside ? 0.0042 : 0.0058,
      ] as [number, number, number],
      color:
        underside
          ? colorCycle === 0 || colorCycle === 7
            ? MOSS_SHELL_DRY
            : colorCycle === 3
              ? MOSS_SHELL_SOIL
              : MOSS_SHELL_FELT
        : colorCycle === 0 || colorCycle === 7
          ? MOSS_SHELL_LIGHT
          : colorCycle === 3 || colorCycle === 9
            ? MOSS_SHELL_FELT
            : colorCycle === 5
              ? MOSS_SHELL_DRY
              : MOSS_SHELL_SOFT,
      visible: !underside || keepUnderside,
    }
  }).filter((puff) => puff.visible)

  const innerLichenDots = Array.from({ length: 0 }, (_, index) => {
    const theta = (index / 18) * Math.PI * 2 + Math.cos(index * 1.41) * 0.035
    const lower = Math.max(0, -Math.sin(theta))
    const colorCycle = index % 9

    return {
      position: [
        0.028 + Math.cos(theta) * (0.384 + Math.sin(index * 0.9) * 0.007),
        -0.034 + Math.sin(theta) * (0.286 + lower * 0.006) - lower * 0.038,
        -0.782 - lower * 0.018 + Math.sin(index * 1.11) * 0.003,
      ] as [number, number, number],
      scale: [
        lower > 0.18 ? 0.0038 + (index % 3) * 0.0008 : 0.0048 + (index % 4) * 0.001,
        lower > 0.18 ? 0.003 + (index % 3) * 0.0006 : 0.0038 + (index % 3) * 0.0008,
        0.0032,
      ] as [number, number, number],
      color:
        lower > 0.18
          ? colorCycle === 0
            ? MOSS_SHELL_DRY
            : colorCycle === 3
              ? MOSS_SHELL_SOIL
              : MOSS_SHELL_BARK
        : colorCycle === 0
          ? MOSS_SHELL_SOFT
          : colorCycle === 3
            ? MOSS_SHELL_DRY
          : colorCycle === 6
              ? MOSS_SHELL_FELT
              : MOSS_SHELL_SOFT,
      opacity: 0.34 + (index % 4) * 0.045,
      visible: lower < 0.28 || index % 6 === 0,
    }
  }).filter((dot) => dot.visible)

  const rimNapFibers = Array.from({ length: 0 }, (_, index) => {
    const theta = (index / 22) * Math.PI * 2 + Math.sin(index * 0.77) * 0.04
    const lower = Math.max(0, -Math.sin(theta))

    return {
      position: [
        0.028 + Math.cos(theta) * (0.42 + Math.sin(index * 1.07) * 0.01),
        -0.034 + Math.sin(theta) * (0.31 + lower * 0.024) - lower * 0.028,
        -0.764 - lower * 0.01 + Math.sin(index * 0.83) * 0.006,
      ] as [number, number, number],
      rotation: theta + Math.PI / 2 + Math.sin(index * 0.69) * 0.24,
      scale: [
        0.0048 + (index % 3) * 0.0007,
        0.0048 + (index % 4) * 0.0009,
        0.0032,
      ] as [number, number, number],
      color: index % 5 === 0 ? MOSS_SHELL_LIGHT : index % 3 === 0 ? MOSS_SHELL_FELT : MOSS_SHELL_SOFT,
      opacity: 0.25 + (index % 4) * 0.035,
      visible: lower < 0.24,
    }
  }).filter((fiber) => fiber.visible)

  return (
    <group>
      {undersideFeltPads.map((pad, index) => {
        const lower = Math.max(0, -Math.sin(pad.theta))

        return (
          <MossShellMatPatch
            key={`moss-shell-opening-underside-felt-${index}`}
            position={[
              0.028 + Math.cos(pad.theta) * pad.radiusX,
              -0.034 + Math.sin(pad.theta) * pad.radiusY - lower * 0.048,
              -0.784 - lower * 0.024,
            ]}
            rotation={pad.theta + Math.PI / 2 + pad.rotation}
            scale={pad.scale}
            color={pad.color}
            opacity={0.9}
            solid
          />
        )
      })}
      {frontFeltLip.map((patch, index) => (
        <mesh
          key={`moss-shell-opening-front-felt-lip-${index}`}
          position={patch.position}
          rotation-z={patch.rotation}
          scale={patch.scale}
        >
          <sphereGeometry args={[1, 12, 5]} />
          <meshToonMaterial color={patch.color} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
        </mesh>
      ))}
      {rimPads.map((pad, index) => {
        const drape = getMossShellOpeningRimDrape(pad.theta)
        const side = Math.cos(pad.theta) < 0 ? -1 : 1
        const browFold = drape.upper * (0.42 + drape.sideT * 0.58)
        const topTuck = drape.topFold * (1 - drape.sideT * 0.28)

        return (
          <MossShellFoldedRimPad
            key={`moss-shell-opening-rim-pad-${index}`}
            position={[
              0.028 + Math.cos(pad.theta) * (pad.radiusX - drape.sideT * 0.018 - topTuck * 0.01),
              -0.034 + Math.sin(pad.theta) * pad.radiusY - drape.lower * 0.038 - drape.upper * 0.018 - browFold * 0.018,
              -0.756 - drape.lower * 0.014 + drape.side * 0.018 + drape.zInset + drape.sideT * 0.014 + browFold * 0.026 + topTuck * 0.02,
            ]}
            rotation={pad.theta + Math.PI / 2 + pad.rotation - side * drape.sideT * 0.18 - side * topTuck * 0.06}
            rotationX={drape.rotationX - drape.upper * 0.18 - drape.sideT * 0.1 - browFold * 0.3 - topTuck * 0.2}
            rotationY={drape.rotationY + side * drape.sideT * 0.18 + side * browFold * 0.24}
            scale={[
              pad.scale[0] * drape.squash * (1 + browFold * 0.1 - topTuck * 0.08),
              pad.scale[1] * (1 + drape.lower * 0.08 + drape.sideT * 0.08) * (1 - browFold * 0.22 - topTuck * 0.08),
              pad.scale[2] * drape.thickness * (1 + browFold * 0.34 + topTuck * 0.18),
            ]}
            color={pad.color}
          />
        )
      })}
      {rimPuffs.map((puff, index) => (
        <OrganicDetailDot
          key={`moss-shell-opening-rim-puff-${index}`}
          position={puff.position}
          scale={puff.scale}
          color={puff.color}
          solid
        />
      ))}
      {innerLichenDots.map((dot, index) => (
        <OrganicDetailDot
          key={`moss-shell-opening-inner-lichen-${index}`}
          position={dot.position}
          scale={dot.scale}
          color={dot.color}
          opacity={dot.opacity}
          solid
        />
      ))}
      {rimNapFibers.map((fiber, index) => (
        <OrganicDetailDot
          key={`moss-shell-opening-rim-nap-${index}`}
          position={fiber.position}
          scale={fiber.scale}
          color={fiber.color}
          opacity={fiber.opacity}
          solid
        />
      ))}
    </group>
  )
}

function MossShellOpeningOcclusionLip() {
  const lipGroup = useRef<THREE.Group>(null)
  const cowlGeometry = useMemo(() => createOrganicShellOpeningCowlGeometry(), [])

  useFrame(() => {
    if (lipGroup.current) {
      lipGroup.current.visible = true
      lipGroup.current.position.set(0, 0, 0)
      lipGroup.current.scale.set(1, 1, 1)
      lipGroup.current.rotation.set(0, 0, 0)
    }
  })

  return (
    <group ref={lipGroup}>
      <MossSelectableScope scopeId="moss-shell-opening">
        <mesh geometry={cowlGeometry}>
          <meshToonMaterial
            color={MOSS_ROCK_BASE}
            gradientMap={getVacuumHeadToonRampTexture()}
            depthTest
            depthWrite
          />
        </mesh>
        <mesh position={[0.016, -0.326, -0.744]} rotation-z={0.025} scale={[0.4, 0.032, 0.014]}>
          <sphereGeometry args={[1, 12, 5]} />
          <meshBasicMaterial color={MOSS_ROCK_DEEP} transparent opacity={0.38} depthWrite={false} />
        </mesh>
        <mesh position={[-0.052, 0.276, -0.758]} rotation-z={-0.05} scale={[0.25, 0.016, 0.009]}>
          <sphereGeometry args={[1, 10, 4]} />
          <meshBasicMaterial color={MOSS_SHELL_GLOW} transparent opacity={0.3} depthWrite={false} />
        </mesh>
        <OrganicDetailStroke
          position={[-0.36, -0.03, -0.752]}
          rotation={-0.55}
          scale={[0.01, 0.092, 0.004]}
          color={MOSS_SHELL_FELT}
          opacity={0.3}
        />
        <MossShellOpeningRimGrowth />
      </MossSelectableScope>
    </group>
  )
}

function MossShell({
  empty = false,
  fitted = false,
}: {
  empty?: boolean
  fitted?: boolean
}) {
  const mossRockGeometry = useMemo(() => createMossRockShellGeometry(), [])

  useEffect(() => () => mossRockGeometry.dispose(), [mossRockGeometry])

  return (
    <group>
      <MossSelectableScope scopeId="moss-shell-body">
        <CodedAssetOutlineMesh
          outlineWidth={fitted ? 0.05 : 0.06}
          outlineColor={MOSS_ROCK_INK}
          geometry={<primitive object={mossRockGeometry} attach="geometry" />}
          material={
            <meshToonMaterial
              color="#ffffff"
              vertexColors
              gradientMap={getVacuumHeadToonRampTexture()}
            />
          }
        />
        <MossShellSurfaceTexture />
        <group visible={false}>
          <MossShellMatPatch
            position={[0, 0.39, -0.34]}
            rotation={-0.12}
            scale={[0.22, 0.064, 0.026]}
            color={MOSS_SHELL_LIGHT}
            opacity={0.12}
          />
        </group>
        {empty ? <ShellCavity /> : null}
        {fitted ? <ShellInteriorPocket /> : null}
        {fitted ? <ShellOpeningWall /> : null}
      </MossSelectableScope>
      <MossRockMossCarpet />
      <MossShellMicroPuffCarpet />
      <MossShellFuzzCarpet />
    </group>
  )
}

function SeedShell({
  empty = false,
  fitted = false,
}: {
  empty?: boolean
  fitted?: boolean
}) {
  const organicShellGeometry = useMemo(() => createOrganicSeedShellGeometry(), [])

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0, -0.035, -0.08]}
        rotation-x={-Math.PI / 2}
        rotation-z={-0.035}
        scale={[0.815, 0.735, 0.64]}
        outlineWidth={fitted ? 0.05 : 0.06}
        outlineColor={fitted ? SHELL_DEEP : VAC_ASSET_INK}
        geometry={<primitive object={organicShellGeometry} attach="geometry" />}
        material={toon(SHELL_MID)}
      />
      <ShellSeedTexture />
      <ShellPremiumPolish />
      <CodedAssetOutlineMesh
        position={[0, 0.08, -0.34]}
        rotation-z={-0.12}
        scale={[0.38, 0.2, 0.032]}
        outlineWidth={0.006}
        geometry={<sphereGeometry args={[1, 9, 5]} />}
        material={toon(SHELL_LIGHT)}
      />
      <CodedAssetOutlineMesh
        position={[-0.28, -0.28, -0.25]}
        rotation-z={0.24}
        scale={[0.22, 0.12, 0.026]}
        outlineWidth={0.005}
        geometry={<sphereGeometry args={[1, 8, 5]} />}
        material={toon(SHELL_DARK)}
      />

      {empty ? <ShellCavity /> : null}
      {fitted ? <ShellInteriorPocket /> : null}
      {fitted ? <ShellOpeningWall /> : null}

      <ShellCrack position={[0.29, 0.24, -0.68]} rotation={-0.35} scale={0.5} />
      <ShellCrack position={[-0.2, -0.33, -0.66]} rotation={0.28} scale={0.42} />
      <ShellCrack position={[0.1, 0.52, -0.32]} rotation={-0.18} scale={0.34} />
    </group>
  )
}

function GoldJewelShell({
  empty = false,
  fitted = false,
}: {
  empty?: boolean
  fitted?: boolean
}) {
  const goldShellGeometry = useMemo(() => createGoldJewelShellGeometry(), [])
  const goldSheenGeometry = useMemo(() => createGoldJewelShellGeometry(), [])

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0, -0.025, -0.08]}
        rotation-x={-Math.PI / 2}
        rotation-z={-0.035}
        scale={[0.824, 0.766, 0.724]}
        outlineWidth={fitted ? 0.052 : 0.064}
        outlineColor={GOLD_SHELL_INK}
        geometry={<primitive object={goldShellGeometry} attach="geometry" />}
        material={<meshStandardMaterial color={GOLD_SHELL_MID} metalness={0.88} roughness={0.3} emissive={GOLD_SHELL_DEEP} emissiveIntensity={0.025} />}
      />
      <mesh position={[0, -0.025, -0.082]} rotation-x={-Math.PI / 2} rotation-z={-0.035} scale={[0.79, 0.736, 0.696]}>
        <primitive object={goldSheenGeometry} attach="geometry" />
        <meshBasicMaterial color={GOLD_SHELL_LIGHT} transparent opacity={0.26} depthTest depthWrite={false} />
      </mesh>
      <GoldJewelShellTexture />
      <CodedAssetOutlineMesh
        position={[0, 0.086, -0.348]}
        rotation-z={-0.1}
        scale={[0.41, 0.19, 0.038]}
        outlineWidth={0.007}
        outlineColor={GOLD_SHELL_INK}
        geometry={<sphereGeometry args={[1, 8, 5]} />}
        material={metal(GOLD_SHELL_RICH, 0.34)}
      />
      <CodedAssetOutlineMesh
        position={[-0.29, -0.29, -0.25]}
        rotation-z={0.25}
        scale={[0.23, 0.13, 0.03]}
        outlineWidth={0.006}
        outlineColor={GOLD_SHELL_INK}
        geometry={<sphereGeometry args={[1, 8, 5]} />}
        material={metal(GOLD_SHELL_DEEP, 0.46)}
      />
      <GoldShellJewel position={[0.0, 0.1, -0.43]} rotation={0.02} scale={[0.046, 0.06, 0.016]} color={GOLD_JEWEL_SAPPHIRE} />
      <GoldTreasureGlint position={[0.07, 0.12, -0.452]} scale={0.48} opacity={0.78} />
      {empty ? <ShellCavity /> : null}
      {fitted ? <ShellInteriorPocket /> : null}
      {fitted ? <ShellOpeningWall variant="gold-jewel" /> : null}
    </group>
  )
}

function AmethystGeodeShell({
  empty = false,
  fitted = false,
}: {
  empty?: boolean
  fitted?: boolean
}) {
  const amethystShellGeometry = useMemo(() => createAmethystGeodeShellGeometry(), [])
  const amethystSheenGeometry = useMemo(() => createAmethystGeodeShellGeometry(), [])
  const amethystDepthGeometry = useMemo(() => createAmethystGeodeShellGeometry(), [])

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0, -0.025, -0.08]}
        rotation-x={-Math.PI / 2}
        rotation-z={-0.035}
        scale={[0.824, 0.766, 0.724]}
        outlineWidth={fitted ? 0.052 : 0.064}
        outlineColor={AMETHYST_INK}
        geometry={<primitive object={amethystShellGeometry} attach="geometry" />}
        material={
          <meshPhysicalMaterial
            color="#ffffff"
            vertexColors
            metalness={0}
            roughness={0.34}
            transparent
            opacity={0.9}
            transmission={0.04}
            thickness={0.94}
            ior={1.55}
            clearcoat={1}
            clearcoatRoughness={0.12}
            emissive={AMETHYST_INTERNAL_VIOLET}
            emissiveIntensity={0.052}
            depthTest
            depthWrite={false}
          />
        }
      />
      <mesh position={[0, -0.025, -0.082]} rotation-x={-Math.PI / 2} rotation-z={-0.035} scale={[0.79, 0.736, 0.696]}>
        <primitive object={amethystSheenGeometry} attach="geometry" />
        <meshBasicMaterial color={AMETHYST_CLOUD_MILK} transparent opacity={0.16} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.035, -0.106]} rotation-x={-Math.PI / 2} rotation-z={-0.035} scale={[0.725, 0.675, 0.622]}>
        <primitive object={amethystDepthGeometry} attach="geometry" />
        <meshBasicMaterial color={AMETHYST_INTERNAL_DEEP} transparent opacity={0.5} depthTest depthWrite={false} />
      </mesh>
      <AmethystGeodeShellTexture />
      {empty ? <ShellCavity /> : null}
      {fitted ? <ShellInteriorPocket /> : null}
      {fitted ? <ShellOpeningWall variant="amethyst-geode" /> : null}
    </group>
  )
}

function AeroMetalShell({
  empty = false,
  fitted = false,
}: {
  empty?: boolean
  fitted?: boolean
}) {
  const racerShellGeometry = useMemo(() => createAeroRacerShellGeometry(), [])

  useEffect(() => () => racerShellGeometry.dispose(), [racerShellGeometry])

  return (
    <group>
      <CodedAssetOutlineMesh
        outlineWidth={fitted ? 0.05 : 0.06}
        outlineColor={AERO_SHELL_BLACK_PURPLE}
        geometry={<primitive object={racerShellGeometry} attach="geometry" />}
        material={<meshStandardMaterial vertexColors metalness={0.58} roughness={0.23} />}
      />
      <AeroMetalShellTexture />
      <AeroMetalRaceFins />
      {empty ? <ShellCavity /> : null}
      {fitted ? <ShellInteriorPocket /> : null}
      {fitted ? <ShellOpeningWall variant="aero-metal" /> : null}
    </group>
  )
}

function SideKnob({
  side,
  fitted = false,
  floating = false,
  activity = 1,
  animation = 'idle',
  heldTrait = 'none',
  skinPalette = getGlowbudSkinPalette(),
}: {
  side: -1 | 1
  fitted?: boolean
  floating?: boolean
  activity?: number
  animation?: RedShellCritterAnimation
  heldTrait?: GlowbudHeldTrait
  skinPalette?: GlowbudSkinPalette
}) {
  const knobGroup = useRef<THREE.Group>(null)
  const coreAnimation = getCoreGlowbudAnimation(animation)
  const actionTime = useAnimationActionTimer(animation)
  const holdsSourceItem = fitted && side === 1 && heldTrait !== 'none' && heldTrait !== 'wizard-staff'
  const holdsStaff = fitted && side === -1 && heldTrait === 'wizard-staff'
  const holdsItem = holdsSourceItem || holdsStaff
  const sideOffset = fitted ? (holdsItem ? 0.96 : floating ? 0.9 : 0.905) : 0.52
  const verticalOffset = fitted
    ? floating
      ? holdsItem
        ? skinPalette.finish === 'ape' ? -0.056 : -0.018
        : skinPalette.finish === 'ape' ? -0.2 : -0.16
      : skinPalette.finish === 'ape' ? -0.056 : -0.018
    : 0.01
  const depthOffset = fitted ? (floating ? -0.075 : -0.035) : -0.2
  const knobScale: [number, number, number] = fitted
    ? skinPalette.finish === 'ape'
      ? holdsItem
        ? [0.16, 0.18, 0.16]
        : [0.145, 0.19, 0.15]
      : holdsItem
        ? [0.19, 0.176, 0.18]
        : [0.18, 0.18, 0.18]
    : [0.19, 0.19, 0.19]
  const socketReach = fitted ? (holdsItem ? 0.19 : 0.148) : 0.105
  const socketPosition: [number, number, number] = [side * -socketReach, -0.006, 0.018]
  const highlightX = side === -1 ? -0.04 : 0.04
  const knobTreatmentMarks: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] =
    skinPalette.finish === 'gold'
      ? [
          { position: [side * 0.032, 0.064, -0.153], rotation: side * 0.12, scale: [0.056, 0.013, 0.006], color: '#fffbe0', opacity: 0.64 },
          { position: [side * 0.032, 0.064, -0.154], rotation: Math.PI / 2, scale: [0.028, 0.008, 0.006], color: '#fffbe0', opacity: 0.58 },
        ]
      : skinPalette.finish === 'zombie' || skinPalette.finish === 'ape' || skinPalette.finish === 'alien'
          ? []
          : []

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const actionT = actionTime(t)
    const ambient = getAmbientLifeMotion(t, motion)
    const performance = getDirectedPerformanceMotion(actionT, animation, motion)
    const happySnug = idlePulse(t, 6.2, 0.71, 0.055) * motion
    const handShake = Math.sin(t * 8.8 + side * 0.7) * 0.006 * motion + Math.sin(t * 14.2 + side) * 0.003 * motion
    const bob = Math.sin(t * 1.8 + side * 0.28) * 0.01 * motion + happySnug * 0.01 + handShake * 0.45
    const tinyPulse = Math.sin(t * 2.2 + side * 0.12) * 0.009 * motion + happySnug * 0.008
    const greeting = !holdsItem && ambient.waveSide === side ? ambient.waveEnvelope : 0
    const greetingBeat = !holdsItem && ambient.waveSide === side ? ambient.waveBeat : 0
    const performanceWaveSide: -1 | 1 = heldTrait === 'wizard-staff' ? 1 : -1
    const performanceGreeting = !holdsItem && performanceWaveSide === side ? performance.waveEnvelope : 0
    const performanceGreetingBeat = !holdsItem && performanceWaveSide === side ? performance.waveBeat : 0
    const danceSwing = performance.boogieBeat * (holdsItem ? 0 : 0.055)
    const danceLift = performance.boogieBounce * (holdsItem ? 0 : 0.042)

    if (knobGroup.current) {
      knobGroup.current.position.set(
        side * sideOffset
          + handShake * side * 0.55
          + side * greeting * 0.035
          + side * performanceGreeting * 0.055
          + danceSwing * side,
        verticalOffset
          + bob
          + greeting * 0.085
          + performanceGreeting * 0.14
          + performance.heldLift * (holdsItem ? 1 : 0)
          + danceLift
          + performance.freeHandDanceLift * side * (holdsItem ? 0 : 1),
        depthOffset - greeting * 0.016 - performanceGreeting * 0.025,
      )
      knobGroup.current.rotation.z = side * (
        0.08
        + Math.sin(t * 1.28 + 0.35) * 0.018 * motion
        + happySnug * 0.028
        + handShake * 0.9
        + greeting * 0.18
        + greetingBeat * 0.2
        + performanceGreeting * 0.34
        + performanceGreetingBeat * 0.3
        + performance.boogieBeat * (holdsItem ? 0 : 0.12)
      )
      knobGroup.current.rotation.x = greetingBeat * 0.045 + performanceGreetingBeat * 0.08
      knobGroup.current.scale.set(
        1 + tinyPulse + happySnug * 0.018 + greeting * 0.025 + performanceGreeting * 0.035,
        1 - tinyPulse * 0.45 - happySnug * 0.01 - greeting * 0.012 - performanceGreeting * 0.018,
        1,
      )
    }
  })

  return (
    <group ref={knobGroup} position={[side * sideOffset, verticalOffset, depthOffset]} rotation-z={side * 0.08}>
      {fitted && !floating && skinPalette.finish !== 'ape' && skinPalette.finish !== 'alien' && skinPalette.finish !== 'zombie' ? (
        <mesh position={socketPosition} scale={[0.036, 0.092, 0.01]} rotation-z={side * 0.1}>
          <sphereGeometry args={[1, 8, 5]} />
          <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.38} depthWrite={false} />
        </mesh>
      ) : null}
      {holdsItem ? (
        <CodedAssetOutlineMesh
          position={[side * -0.105, -0.012, 0.008]}
          rotation-z={side * 0.08}
          scale={[0.115, 0.132, 0.132]}
          outlineWidth={0.008}
          geometry={<sphereGeometry args={[1, 11, 7]} />}
          material={toon(skinPalette.base)}
        />
      ) : null}
      <CodedAssetOutlineMesh
        scale={knobScale}
        outlineWidth={0.024}
        geometry={<sphereGeometry args={[1, 12, 8]} />}
        material={toon(skinPalette.base)}
      />
      {skinPalette.finish === 'ape' ? (
        <ApeHandTreatment
          side={side}
          scale={knobScale}
          activity={activity}
          animation={coreAnimation}
        />
      ) : null}
      {skinPalette.finish === 'alien' ? (
        <AlienHandTreatment
          side={side}
          scale={knobScale}
          activity={activity}
          animation={coreAnimation}
        />
      ) : null}
      {skinPalette.finish === 'zombie' ? (
        <ZombieHandTreatment
          side={side}
          scale={knobScale}
          activity={activity}
          animation={coreAnimation}
        />
      ) : null}
      {knobTreatmentMarks.map((mark, index) => (
        <mesh
          key={`knob-skin-treatment-${skinPalette.finish}-${index}`}
          position={mark.position}
          rotation-z={mark.rotation}
          scale={mark.scale}
        >
          <sphereGeometry args={[1, 10, 5]} />
          <meshBasicMaterial color={mark.color} transparent opacity={mark.opacity} depthWrite={false} />
        </mesh>
      ))}
      {skinPalette.finish === 'ape' || skinPalette.finish === 'alien' || skinPalette.finish === 'zombie' ? null : (
        <>
          <mesh position={[highlightX, 0.052, -0.135]} scale={[0.052, 0.046, 0.012]}>
            <sphereGeometry args={[1, 8, 5]} />
            <meshBasicMaterial color={skinPalette.light} transparent opacity={0.5} depthWrite={false} />
          </mesh>
          <mesh position={[highlightX * 0.64, -0.064, -0.14]} rotation-z={side * -0.28} scale={[0.07, 0.018, 0.008]}>
            <sphereGeometry args={[1, 8, 4]} />
            <meshBasicMaterial color={skinPalette.shade} transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <mesh position={[side * -0.07, 0.008, -0.152]} rotation-z={side * 0.4} scale={[0.035, 0.007, 0.004]}>
            <sphereGeometry args={[1, 7, 4]} />
            <meshBasicMaterial color={skinPalette.dot} transparent opacity={0.28} depthWrite={false} />
          </mesh>
          <OrganicDetailStroke
            position={[side * 0.026, -0.012, -0.146]}
            rotation={side * -0.48}
            scale={[0.032, 0.006, 0.004]}
            color={skinPalette.shade}
            opacity={0.24}
          />
          <OrganicDetailDot
            position={[side * -0.036, 0.022, -0.152]}
            scale={[0.008, 0.006, 0.004]}
            color={skinPalette.dot}
            opacity={0.4}
          />
        </>
      )}
    </group>
  )
}

function IdleSnuggleMarks({ activity = 1 }: { activity?: number }) {
  const markGroup = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const pulse = idlePulse(t, 6.2, 0.71, 0.052) * motion

    if (markGroup.current) {
      markGroup.current.visible = pulse > 0.012
      markGroup.current.position.y = Math.sin(t * 10.5) * 0.008 * pulse
      markGroup.current.scale.set(0.95 + pulse * 0.18, 0.95 + pulse * 0.22, 1)
      markGroup.current.rotation.z = Math.sin(t * 12.2) * 0.024 * pulse
    }
  })

  return (
    <group ref={markGroup} visible={false}>
      <mesh position={[-0.94, 0.09, -0.185]} rotation-z={-0.36} scale={[0.012, 0.062, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <mesh position={[-0.88, 0.16, -0.19]} rotation-z={-0.52} scale={[0.01, 0.044, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.32} depthWrite={false} />
      </mesh>
      <mesh position={[0.94, 0.09, -0.185]} rotation-z={0.36} scale={[0.012, 0.062, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <mesh position={[0.88, 0.16, -0.19]} rotation-z={0.52} scale={[0.01, 0.044, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.32} depthWrite={false} />
      </mesh>
    </group>
  )
}

function RedCharacter({
  fitted = false,
  activity = 1,
  animation = 'idle',
  eyeTrait = 'mellow',
  mouthTrait = 'classic-smile',
  noseTrait = 'none',
  heldTrait = 'none',
  showSideKnobs = true,
  floatingHands = false,
  shellFreeFace = false,
  skinPalette = getGlowbudSkinPalette(),
}: {
  fitted?: boolean
  activity?: number
  animation?: RedShellCritterAnimation
  faceTrait?: GlowbudFaceTrait
  eyeTrait?: GlowbudEyeTrait
  mouthTrait?: GlowbudMouthTrait
  noseTrait?: GlowbudNoseTrait
  heldTrait?: GlowbudHeldTrait
  showSideKnobs?: boolean
  floatingHands?: boolean
  shellFreeFace?: boolean
  skinPalette?: GlowbudSkinPalette
}) {
  const fittedBodyOffset: [number, number, number] = fitted ? [0.02, -0.034, 0.006] : [0, 0, 0]

  return (
    <>
      {showSideKnobs ? (
        <>
          <SideKnob side={-1} fitted={fitted} floating={floatingHands} activity={activity} animation={animation} heldTrait={heldTrait} skinPalette={skinPalette} />
          <SideKnob side={1} fitted={fitted} floating={floatingHands} activity={activity} animation={animation} heldTrait={heldTrait} skinPalette={skinPalette} />
        </>
      ) : null}
      {showSideKnobs && fitted && !floatingHands && skinPalette.finish !== 'ape' && skinPalette.finish !== 'alien' && skinPalette.finish !== 'zombie' ? (
        <IdleSnuggleMarks activity={activity} />
      ) : null}
      <group position={fittedBodyOffset}>
        {fitted ? (
          <FittedFaceAssembly
            activity={activity}
            animation={animation}
            eyeTrait={eyeTrait}
            mouthTrait={mouthTrait}
            noseTrait={noseTrait}
            shellFree={shellFreeFace}
            skinPalette={skinPalette}
          />
        ) : (
          <>
            <RedFace activity={activity} animation={animation} mouthTrait={mouthTrait} skinPalette={skinPalette} />
            <Eye
              side={-1}
              pupilOffset={0.018}
              activity={activity}
              animation={animation}
              eyeTrait={eyeTrait}
              skinPalette={skinPalette}
            />
            <Eye
              side={1}
              pupilOffset={-0.018}
              activity={activity}
              animation={animation}
              eyeTrait={eyeTrait}
              skinPalette={skinPalette}
            />
            <GlowbudNose trait={noseTrait} />
            {eyeTrait === 'unibrow' ? <UnibrowOverlay fitted={false} activity={activity} animation={animation} /> : null}
          </>
        )}
      </group>
    </>
  )
}

function createWizardFacePlugGeometry() {
  const segments = 72
  const frontRings = 8
  const sideRings = 5
  const rx = 0.414
  const ry = 0.334
  const centerY = -0.058
  const frontZ = -0.642
  const sideDepth = 0.076
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= frontRings; ring += 1) {
    const t = ring / frontRings
    const ease = t * t * (3 - 2 * t)

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const cosAngle = Math.cos(angle)
      const sinAngle = Math.sin(angle)
      const lower = Math.max(0, -sinAngle)
      const side = Math.max(0, Math.abs(cosAngle) - 0.32)
      const organic = 1 + ease * (Math.sin(angle * 2.2 + 0.15) * 0.01 + Math.cos(angle * 4.7) * 0.006)
      const dome = (1 - ease * ease) * (0.064 + lower * 0.008)

      vertices.push(
        cosAngle * rx * ease * organic * (1 + side * 0.006),
        centerY + sinAngle * ry * ease * organic * (1 + lower * 0.035),
        frontZ - dome + ease * 0.01 - lower * ease * 0.005,
      )
    }
  }

  for (let ring = 0; ring < frontRings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const row = segments + 1
      const base = ring * row + segment
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const sideStart = vertices.length / 3
  for (let ring = 1; ring <= sideRings; ring += 1) {
    const t = ring / sideRings

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const cosAngle = Math.cos(angle)
      const sinAngle = Math.sin(angle)
      const lower = Math.max(0, -sinAngle)
      const side = Math.max(0, Math.abs(cosAngle) - 0.32)
      const organic = 1 + Math.sin(angle * 2.2 + 0.15) * 0.01 + Math.cos(angle * 4.7) * 0.006
      const tuck = 1 - t * (0.096 + side * 0.044 + lower * 0.032)

      vertices.push(
        cosAngle * rx * organic * tuck,
        centerY + sinAngle * ry * organic * tuck * (1 + lower * 0.045),
        frontZ + t * sideDepth,
      )
    }
  }

  const frontOuter = frontRings * (segments + 1)
  for (let ring = 0; ring < sideRings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const row = segments + 1
      const a = ring === 0 ? frontOuter + segment : sideStart + (ring - 1) * row + segment
      const b = ring === 0 ? frontOuter + segment + 1 : sideStart + (ring - 1) * row + segment + 1
      const c = sideStart + ring * row + segment
      const d = sideStart + ring * row + segment + 1
      indices.push(a, c, b)
      indices.push(b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function WizardFace({
  activity = 1,
  animation = 'idle',
  skinPalette = getGlowbudSkinPalette(),
}: {
  activity?: number
  animation?: RedShellCritterAnimation
  skinPalette?: GlowbudSkinPalette
}) {
  const face = useRef<THREE.Group>(null)
  const coreAnimation = getCoreGlowbudAnimation(animation)
  const brow = useRef<THREE.Group>(null)
  const mouth = useRef<THREE.Group>(null)
  const leftEye = useRef<THREE.Group>(null)
  const rightEye = useRef<THREE.Group>(null)
  const leftPupil = useRef<THREE.Mesh>(null)
  const rightPupil = useRef<THREE.Mesh>(null)
  const facePlugGeometry = useMemo(() => createWizardFacePlugGeometry(), [])
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const actionT = actionTime(t)
    const grumble = getWizardGrumbleMotion(actionT + 0.08, animation === 'grumble' ? motion : 0)
    const hopFace = getHopExpressionMotion(actionT, animation === 'hop' ? motion : 0)
    const grouchPulse = idlePulse(t, 4.9, 0.64, 0.09) * motion
    const breathe = Math.sin(t * 1.55) * 0.008 * motion

    if (face.current) {
      face.current.position.y =
        breathe - grouchPulse * 0.006 + grumble.chatter * 0.75 + grumble.bodyJolt * 0.16 + hopFace.eyeLift * 0.42 + hopFace.land * 0.012
      face.current.scale.set(
        1 + grouchPulse * 0.016 + grumble.mouthOpen * 0.022 + grumble.impact * 0.018 + hopFace.cheekSquash * 0.02,
        1 - grouchPulse * 0.018 - grumble.mouthOpen * 0.014 - grumble.impact * 0.014 - hopFace.cheekSquash * 0.016 + hopFace.airborne * 0.008,
        1,
      )
    }
    if (brow.current) {
      brow.current.position.y = 0.12 - grouchPulse * 0.012 - grumble.brow * 0.04 + hopFace.eyeWide * 0.018 - hopFace.faceFocus * 0.012
      brow.current.rotation.z =
        Math.sin(t * 1.1 + 0.2) * 0.006 * motion +
        Math.sin(t * 3.8) * 0.024 * grumble.talk +
        grumble.hit * 0.024 -
        hopFace.rotateZ * 0.22
      brow.current.scale.set(
        1 + grouchPulse * 0.06 + grumble.brow * 0.13 + hopFace.faceFocus * 0.06,
        1 + grouchPulse * 0.03 + grumble.hit * 0.07 + hopFace.land * 0.05,
        1,
      )
    }
    if (mouth.current) {
      mouth.current.position.y = -0.128 - grouchPulse * 0.01 - grumble.mouthOpen * 0.018 + grumble.hit * 0.006 + hopFace.mouthY
      mouth.current.rotation.z = -0.018 + Math.sin(t * 13.4) * 0.026 * grumble.talk - grumble.hit * 0.032 + hopFace.rotateZ * 0.35
      mouth.current.scale.set(
        1 + grouchPulse * 0.04 + grumble.mouthOpen * 0.46 + hopFace.smile * 0.2 + hopFace.faceFocus * 0.08,
        1 - grouchPulse * 0.04 + grumble.mouthOpen * 1.55 + grumble.hit * 0.2 + hopFace.mouthOpen * 0.88 - hopFace.faceFocus * 0.08,
        1,
      )
    }
    const eyeScaleY = Math.max(0.42, 1 + hopFace.eyeWide * 0.18 - hopFace.blink * 0.44 - hopFace.faceFocus * 0.06)
    const eyeScaleX = 1 + hopFace.eyeWide * 0.06 + hopFace.blink * 0.04
    if (leftEye.current) {
      leftEye.current.position.y = 0.014 + hopFace.eyeLift - hopFace.blink * 0.004
      leftEye.current.scale.set(eyeScaleX, eyeScaleY, 1)
    }
    if (rightEye.current) {
      rightEye.current.position.y = 0.014 + hopFace.eyeLift - hopFace.blink * 0.004
      rightEye.current.scale.set(eyeScaleX, eyeScaleY, 1)
    }
    if (leftPupil.current) {
      leftPupil.current.position.x = -0.003 - hopFace.pupilInward
      leftPupil.current.position.y = -0.008 + hopFace.pupilY
    }
    if (rightPupil.current) {
      rightPupil.current.position.x = -0.005 + hopFace.pupilInward
      rightPupil.current.position.y = -0.008 + hopFace.pupilY
    }
  })

  return (
    <group ref={face} position={[0, 0, WIZARD_FACE_SETBACK_Z]}>
      <mesh geometry={facePlugGeometry}>
        <meshToonMaterial color={skinPalette.base} gradientMap={getVacuumHeadToonRampTexture()} side={THREE.DoubleSide} />
      </mesh>
      {skinPalette.finish === 'ape' ? (
        <ApeFaceTreatment wizard activity={activity} animation={coreAnimation} />
      ) : null}
      {skinPalette.finish === 'alien' ? (
        <AlienFaceTreatment wizard activity={activity} animation={coreAnimation} />
      ) : null}
      {skinPalette.finish === 'zombie' ? (
        <ZombieFaceTreatment wizard activity={activity} animation={coreAnimation} />
      ) : null}
      {skinPalette.finish === 'alien' || skinPalette.finish === 'zombie' ? null : (
        <>
          <mesh position={[-0.134, 0.018, -0.742]} rotation-z={-0.25} scale={[0.102, 0.022, 0.01]}>
            <sphereGeometry args={[1, 10, 4]} />
            <meshBasicMaterial color={skinPalette.light} transparent opacity={0.26} depthWrite={false} />
          </mesh>
          <mesh position={[0.116, -0.152, -0.746]} rotation-z={0.18} scale={[0.13, 0.036, 0.01]}>
            <sphereGeometry args={[1, 10, 4]} />
            <meshBasicMaterial color={skinPalette.shade} transparent opacity={0.23} depthWrite={false} />
          </mesh>
          <mesh position={[0.246, -0.014, -0.738]} rotation-z={0.36} scale={[0.032, 0.128, 0.009]}>
            <sphereGeometry args={[1, 10, 5]} />
            <meshBasicMaterial color={skinPalette.shade} transparent opacity={0.16} depthWrite={false} />
          </mesh>
          <mesh position={[-0.246, 0.016, -0.74]} rotation-z={-0.34} scale={[0.032, 0.114, 0.009]}>
            <sphereGeometry args={[1, 10, 5]} />
            <meshBasicMaterial color={skinPalette.light} transparent opacity={0.12} depthWrite={false} />
          </mesh>
        </>
      )}
      <group ref={brow} position={[0, 0.12, 0]}>
        <mesh position={[0, 0.002, -0.785]} rotation-z={0.01} scale={[0.276, 0.034, 0.01]}>
          <sphereGeometry args={[1, 10, 4]} />
          <meshBasicMaterial color={WIZARD_BROW_DARK} transparent opacity={0.24} depthWrite={false} />
        </mesh>
        <CodedAssetOutlineMesh
          position={[0, 0.02, -0.764]}
          rotation-z={-0.006}
          scale={[0.232, 0.028, 0.013]}
          outlineWidth={0.0035}
          outlineColor={VAC_ASSET_INK}
          geometry={<sphereGeometry args={[1, 12, 5]} />}
          material={<meshBasicMaterial color={WIZARD_BROW_DARK} />}
        />
        <CodedAssetOutlineMesh
          position={[-0.134, -0.002, -0.77]}
          rotation-z={-0.32}
          scale={[0.114, 0.032, 0.012]}
          outlineWidth={0.0035}
          outlineColor={VAC_ASSET_INK}
          geometry={<sphereGeometry args={[1, 12, 5]} />}
          material={<meshBasicMaterial color={WIZARD_BROW_DARK} />}
        />
        <CodedAssetOutlineMesh
          position={[0.134, -0.002, -0.77]}
          rotation-z={0.32}
          scale={[0.114, 0.032, 0.012]}
          outlineWidth={0.0035}
          outlineColor={VAC_ASSET_INK}
          geometry={<sphereGeometry args={[1, 12, 5]} />}
          material={<meshBasicMaterial color={WIZARD_BROW_DARK} />}
        />
        <mesh position={[0, -0.002, -0.782]} rotation-z={0.02} scale={[0.052, 0.043, 0.011]}>
          <sphereGeometry args={[1, 10, 5]} />
          <meshBasicMaterial color={WIZARD_BROW_MID} />
        </mesh>
        <mesh position={[-0.172, 0.012, -0.786]} rotation-z={-0.38} scale={[0.042, 0.012, 0.005]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={WIZARD_BROW_LIGHT} transparent opacity={0.34} depthWrite={false} />
        </mesh>
        <mesh position={[0.172, 0.012, -0.786]} rotation-z={0.38} scale={[0.042, 0.012, 0.005]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={WIZARD_BROW_LIGHT} transparent opacity={0.34} depthWrite={false} />
        </mesh>
        <mesh position={[0.006, 0.028, -0.786]} rotation-z={-0.04} scale={[0.096, 0.009, 0.005]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={WIZARD_BROW_LIGHT} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      </group>
      <group ref={leftEye} position={[-0.118, 0.014, 0]}>
        <CodedAssetOutlineMesh
          position={[0, 0, -0.754]}
          rotation-z={0.08}
          scale={[0.055, 0.076, 0.014]}
          outlineWidth={0.004}
          geometry={<sphereGeometry args={[1, 12, 8]} />}
          material={<meshBasicMaterial color={EYE_WHITE} />}
        />
        <mesh ref={leftPupil} position={[-0.003, -0.008, -0.778]} scale={[0.019, 0.032, 0.008]}>
          <sphereGeometry args={[1, 8, 5]} />
          <meshBasicMaterial color={VAC_ASSET_INK} />
        </mesh>
      </group>
      <group ref={rightEye} position={[0.118, 0.014, 0]}>
        <CodedAssetOutlineMesh
          position={[0, 0, -0.754]}
          rotation-z={-0.08}
          scale={[0.055, 0.076, 0.014]}
          outlineWidth={0.004}
          geometry={<sphereGeometry args={[1, 12, 8]} />}
          material={<meshBasicMaterial color={EYE_WHITE} />}
        />
        <mesh ref={rightPupil} position={[-0.005, -0.008, -0.778]} scale={[0.019, 0.032, 0.008]}>
          <sphereGeometry args={[1, 8, 5]} />
          <meshBasicMaterial color={VAC_ASSET_INK} />
        </mesh>
      </group>
      <group ref={mouth} position={[0, -0.128, 0]}>
        <mesh position={[0, 0, -0.778]} rotation-z={-0.018} scale={[0.11, 0.013, 0.011]}>
          <sphereGeometry args={[1, 12, 4]} />
          <meshBasicMaterial color={VAC_ASSET_INK} />
        </mesh>
        <mesh position={[-0.07, -0.005, -0.784]} rotation-z={-0.38} scale={[0.03, 0.008, 0.007]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={VAC_ASSET_INK} />
        </mesh>
        <mesh position={[0.07, -0.005, -0.784]} rotation-z={0.38} scale={[0.03, 0.008, 0.007]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={VAC_ASSET_INK} />
        </mesh>
        <mesh position={[0.006, -0.028, -0.776]} rotation-z={-0.03} scale={[0.086, 0.011, 0.006]}>
          <sphereGeometry args={[1, 10, 4]} />
          <meshBasicMaterial color={skinPalette.shade} transparent opacity={0.34} depthWrite={false} />
        </mesh>
        <mesh position={[0.012, 0.022, -0.786]} rotation-z={-0.14} scale={[0.034, 0.004, 0.004]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={skinPalette.light} transparent opacity={0.24} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

function createWizardStaffHookGeometry() {
  const shaftX = -0.855
  const outwardX = (x: number) => shaftX - (x - shaftX)
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(outwardX(-0.855), 0.33, -0.245),
    new THREE.Vector3(outwardX(-0.854), 0.47, -0.246),
    new THREE.Vector3(outwardX(-0.785), 0.565, -0.25),
    new THREE.Vector3(outwardX(-0.665), 0.57, -0.252),
    new THREE.Vector3(outwardX(-0.57), 0.512, -0.252),
    new THREE.Vector3(outwardX(-0.552), 0.405, -0.25),
    new THREE.Vector3(outwardX(-0.588), 0.328, -0.248),
  ])

  return new THREE.TubeGeometry(curve, 42, 0.032, 9, false)
}

function WizardStaff({
  activity = 1,
  animation = 'idle',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const staff = useRef<THREE.Group>(null)
  const impactGroup = useRef<THREE.Group>(null)
  const hookGeometry = useMemo(() => createWizardStaffHookGeometry(), [])
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const actionT = actionTime(t)
    const grumble = getWizardGrumbleMotion(actionT, animation === 'grumble' ? motion : 0)
    const hop = getHopMotion(actionT, animation === 'hop' ? motion : 0)
    const handLag = Math.sin(t * 1.45 - 0.55) * 0.006 * motion
    const woodSpring = Math.sin(t * 0.84 + 1.2) * 0.008 * motion

    if (staff.current) {
      staff.current.position.y = handLag + grumble.staffLift - hop.airborne * 0.035 + hop.land * 0.026 + hop.recovery * 0.01
      staff.current.position.x = -0.07 + grumble.prep * -0.012 + grumble.hit * 0.01 - hop.rotateZ * 0.12
      staff.current.rotation.z = -0.025 + woodSpring + grumble.staffTilt - hop.rotateZ * 0.62 + hop.land * 0.045
      staff.current.rotation.x =
        Math.sin(t * 0.7 + 0.4) * 0.006 * motion - grumble.prep * 0.035 + grumble.hit * 0.05 + hop.launch * 0.035 - hop.land * 0.055
    }
    if (impactGroup.current) {
      impactGroup.current.visible = grumble.impact > 0.03
      impactGroup.current.position.y = -0.675 - grumble.hit * 0.012
      impactGroup.current.scale.set(0.72 + grumble.impact * 0.8, 0.58 + grumble.impact * 0.28, 0.9 + grumble.impact * 0.2)
      impactGroup.current.rotation.z = -0.12 + Math.sin(t * 22) * 0.02 * grumble.impact
    }
  })

  return (
    <>
      <group ref={staff} position={[-0.07, 0, 0]}>
        <CodedAssetOutlineMesh
          position={[-0.855, -0.16, -0.245]}
          scale={[1, 1, 1]}
          outlineWidth={0.007}
          outlineColor={VAC_ASSET_INK}
          geometry={<cylinderGeometry args={[0.031, 0.035, 0.98, 9]} />}
          material={toon(STAFF_WOOD_MID)}
        />
        <CodedAssetOutlineMesh
          outlineWidth={0.007}
          outlineColor={VAC_ASSET_INK}
          geometry={<primitive object={hookGeometry} attach="geometry" />}
          material={toon(STAFF_WOOD_MID)}
        />
        <mesh position={[-0.884, -0.18, -0.285]} rotation-z={0.02} scale={[0.012, 0.38, 0.01]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={STAFF_WOOD_DARK} transparent opacity={0.32} depthWrite={false} />
        </mesh>
        <mesh position={[-0.828, 0.075, -0.29]} rotation-z={-0.02} scale={[0.01, 0.28, 0.008]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={STAFF_WOOD_LIGHT} transparent opacity={0.4} depthWrite={false} />
        </mesh>
        <mesh position={[-1.002, 0.535, -0.294]} rotation-z={-1.44} scale={[0.012, 0.15, 0.008]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={STAFF_WOOD_LIGHT} transparent opacity={0.38} depthWrite={false} />
        </mesh>
        <mesh position={[-0.855, -0.638, -0.245]} scale={[0.048, 0.026, 0.048]}>
          <sphereGeometry args={[1, 9, 5]} />
          <meshBasicMaterial color={STAFF_WOOD_DARK} />
        </mesh>
        <mesh position={[-0.855, -0.075, -0.245]} scale={[0.046, 0.04, 0.046]}>
          <cylinderGeometry args={[1, 1, 1, 9]} />
          <meshBasicMaterial color={STAFF_WRAP_DARK} />
        </mesh>
        <mesh position={[-0.855, 0.0, -0.245]} scale={[0.042, 0.036, 0.042]}>
          <cylinderGeometry args={[1, 1, 1, 9]} />
          <meshBasicMaterial color={STAFF_WOOD_LIGHT} />
        </mesh>
        <mesh position={[-1.158, 0.392, -0.25]} scale={[0.04, 0.032, 0.04]}>
          <sphereGeometry args={[1, 9, 5]} />
          <meshBasicMaterial color={STAFF_WOOD_LIGHT} />
        </mesh>
      </group>
      <group ref={impactGroup} position={[-0.925, -0.675, -0.34]} visible={false}>
        <mesh rotation-x={Math.PI / 2} scale={[0.145, 0.04, 1]}>
          <circleGeometry args={[1, 18]} />
          <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.24} depthWrite={false} />
        </mesh>
        <mesh position={[-0.075, 0.02, -0.006]} rotation-z={0.32} scale={[0.07, 0.009, 0.006]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={GRASS_LIGHT} transparent opacity={0.58} depthWrite={false} />
        </mesh>
        <mesh position={[0.078, 0.016, -0.002]} rotation-z={-0.28} scale={[0.065, 0.009, 0.006]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={GRASS_DEW} transparent opacity={0.5} depthWrite={false} />
        </mesh>
        <mesh position={[0.008, 0.026, -0.012]} rotation-z={-0.04} scale={[0.052, 0.007, 0.005]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={STAFF_WOOD_LIGHT} transparent opacity={0.36} depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}

function createHeldItemExtrusion(
  points: ReadonlyArray<readonly [number, number]>,
  depth = 0.075,
  bevelSize = 0.012,
) {
  const shape = new THREE.Shape()
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  })
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 2,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize,
    bevelThickness: Math.min(depth * 0.32, 0.014),
  })
  geometry.translate(0, 0, -depth / 2)
  geometry.computeVertexNormals()
  return geometry
}

function createAxeBladeGeometry() {
  return createHeldItemExtrusion([
    [0.08, 0.065],
    [-0.12, 0.11],
    [-0.32, 0.16],
    [-0.415, 0.12],
    [-0.445, 0],
    [-0.415, -0.12],
    [-0.32, -0.16],
    [-0.12, -0.11],
    [0.08, -0.06],
  ], 0.09, 0.014)
}

function createSwordBladeGeometry() {
  return createHeldItemExtrusion([
    [-0.064, -0.285],
    [0.064, -0.285],
    [0.052, 0.235],
    [0, 0.345],
    [-0.052, 0.235],
  ], 0.085, 0.012)
}

function createPeakHeadGeometry() {
  return createHeldItemExtrusion([
    [-0.43, -0.12],
    [-0.37, 0.005],
    [-0.235, 0.09],
    [-0.06, 0.13],
    [0.18, 0.085],
    [0.215, 0.005],
    [0.17, -0.045],
    [0.025, -0.015],
    [-0.115, 0.005],
    [-0.27, -0.05],
  ], 0.085, 0.012)
}

function createAnchoredFireGeometry(
  points: ReadonlyArray<readonly [number, number]>,
  depth: number,
  bevelSize: number,
) {
  const geometry = createHeldItemExtrusion(points, depth, bevelSize)
  const baseY = Math.min(...points.map(([, y]) => y))
  geometry.translate(0, -baseY, 0)
  return geometry
}

function createOuterFireGeometry() {
  return createAnchoredFireGeometry([
    [0, -0.18],
    [-0.105, -0.115],
    [-0.16, -0.01],
    [-0.12, 0.105],
    [-0.065, 0.205],
    [-0.04, 0.09],
    [0.025, 0.255],
    [0.085, 0.145],
    [0.135, 0.045],
    [0.155, -0.07],
    [0.085, -0.145],
  ], 0.065, 0.012)
}

function createMiddleFireGeometry() {
  return createAnchoredFireGeometry([
    [0, -0.13],
    [-0.075, -0.075],
    [-0.09, 0.015],
    [-0.035, 0.11],
    [0.01, 0.035],
    [0.045, 0.17],
    [0.09, 0.075],
    [0.1, -0.035],
    [0.055, -0.11],
  ], 0.052, 0.009)
}

function createInnerFireGeometry() {
  return createAnchoredFireGeometry([
    [0, -0.09],
    [-0.047, -0.035],
    [-0.03, 0.045],
    [0.012, 0.11],
    [0.058, 0.035],
    [0.05, -0.05],
  ], 0.038, 0.007)
}

function createFireLickGeometry() {
  return createAnchoredFireGeometry([
    [0, -0.105],
    [-0.055, -0.06],
    [-0.075, 0.015],
    [-0.045, 0.105],
    [0.002, 0.185],
    [0.04, 0.095],
    [0.068, 0.015],
    [0.052, -0.065],
  ], 0.07, 0.011)
}

function HeldItemMotion({
  trait,
  activity = 1,
  animation = 'idle',
  children,
}: {
  trait: Exclude<GlowbudHeldTrait, 'none' | 'wizard-staff'>
  activity?: number
  animation?: RedShellCritterAnimation
  children: ReactNode
}) {
  const root = useRef<THREE.Group>(null)
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    if (!root.current) return
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const actionT = actionTime(t)
    const hop = getHopMotion(actionT, animation === 'hop' ? motion : 0)
    const grumble = getWizardGrumbleMotion(actionT, animation === 'grumble' ? motion : 0)
    const performance = getDirectedPerformanceMotion(actionT, animation, motion)
    const phase = trait === 'axe' ? 0.2 : trait === 'sword' ? 0.85 : trait === 'peak' ? 1.45 : 2.1
    const sway = Math.sin(t * 1.12 + phase) * 0.007 * motion
    const baseTilt = trait === 'peak' ? -0.018 : trait === 'fire' ? 0.014 : -0.006

    root.current.position.x = grumble.prep * -0.008 + grumble.hit * 0.008 - hop.rotateZ * 0.035
    root.current.position.y =
      sway
      + grumble.staffLift * 0.5
      - hop.airborne * 0.018
      + hop.land * 0.018
      + performance.heldLift
    root.current.rotation.z = baseTilt + sway * 0.45 + grumble.staffTilt * 0.42 - hop.rotateZ * 0.38
    root.current.rotation.x = Math.sin(t * 0.72 + phase) * 0.005 * motion + hop.launch * 0.018 - hop.land * 0.028
  })

  return <group ref={root}>{children}</group>
}

function AxeHeldItem() {
  const bladeGeometry = useMemo(() => createAxeBladeGeometry(), [])

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[-0.82, -0.16, -0.235]}
        outlineWidth={0.007}
        geometry={<cylinderGeometry args={[0.032, 0.038, 0.86, 9]} />}
        material={toon(STAFF_WOOD_MID)}
      />
      <mesh position={[-0.842, -0.17, -0.282]} scale={[0.012, 0.31, 0.008]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={STAFF_WOOD_DARK} />
      </mesh>
      <CodedAssetOutlineMesh
        position={[-0.82, 0.275, -0.285]}
        outlineWidth={0.009}
        geometry={<primitive object={bladeGeometry} attach="geometry" />}
        material={toon(ITEM_STEEL_MID)}
      />
      <mesh position={[-1.035, 0.31, -0.337]} rotation-z={-0.13} scale={[0.125, 0.022, 0.01]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={ITEM_STEEL_LIGHT} />
      </mesh>
      <mesh position={[-0.885, 0.235, -0.34]} rotation-z={0.05} scale={[0.085, 0.018, 0.009]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={ITEM_STEEL_DARK} />
      </mesh>
      <CodedAssetOutlineMesh
        position={[-0.702, 0.28, -0.255]}
        rotation-z={Math.PI / 2}
        outlineWidth={0.006}
        geometry={<cylinderGeometry args={[0.05, 0.064, 0.15, 8]} />}
        material={toon(ITEM_STEEL_DARK)}
      />
      <mesh position={[-0.82, -0.12, -0.296]} scale={[0.047, 0.06, 0.016]}>
        <cylinderGeometry args={[1, 1, 1, 9]} />
        <meshBasicMaterial color={STAFF_WRAP_DARK} />
      </mesh>
    </group>
  )
}

function SwordHeldItem() {
  const bladeGeometry = useMemo(() => createSwordBladeGeometry(), [])

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[-0.82, -0.265, -0.245]}
        outlineWidth={0.007}
        geometry={<cylinderGeometry args={[0.036, 0.042, 0.31, 9]} />}
        material={toon(STAFF_WRAP_DARK)}
      />
      <mesh position={[-0.82, -0.265, -0.298]} scale={[0.044, 0.105, 0.012]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={ITEM_GOLD_LIGHT} />
      </mesh>
      <CodedAssetOutlineMesh
        position={[-0.82, -0.445, -0.245]}
        outlineWidth={0.006}
        geometry={<sphereGeometry args={[0.066, 9, 6]} />}
        material={toon(ITEM_GOLD_MID)}
      />
      <CodedAssetOutlineMesh
        position={[-0.82, -0.075, -0.255]}
        rotation-z={Math.PI / 2}
        outlineWidth={0.007}
        geometry={<cylinderGeometry args={[0.035, 0.047, 0.34, 9]} />}
        material={toon(ITEM_GOLD_MID)}
      />
      <mesh position={[-0.82, -0.085, -0.315]} scale={[0.118, 0.013, 0.01]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={ITEM_GOLD_LIGHT} />
      </mesh>
      <CodedAssetOutlineMesh
        position={[-0.82, 0.22, -0.285]}
        outlineWidth={0.009}
        geometry={<primitive object={bladeGeometry} attach="geometry" />}
        material={toon(ITEM_STEEL_MID)}
      />
      <mesh position={[-0.848, 0.24, -0.337]} scale={[0.012, 0.215, 0.009]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={ITEM_STEEL_LIGHT} />
      </mesh>
      <mesh position={[-0.785, 0.2, -0.333]} scale={[0.01, 0.18, 0.008]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={ITEM_STEEL_DARK} />
      </mesh>
    </group>
  )
}

function PeakHeldItem() {
  const headGeometry = useMemo(() => createPeakHeadGeometry(), [])

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[-0.82, -0.17, -0.235]}
        outlineWidth={0.007}
        geometry={<cylinderGeometry args={[0.031, 0.038, 0.9, 9]} />}
        material={toon(STAFF_WOOD_MID)}
      />
      <mesh position={[-0.84, -0.17, -0.282]} scale={[0.012, 0.32, 0.008]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={STAFF_WOOD_DARK} />
      </mesh>
      <CodedAssetOutlineMesh
        position={[-0.82, 0.305, -0.285]}
        outlineWidth={0.009}
        geometry={<primitive object={headGeometry} attach="geometry" />}
        material={toon(ITEM_STEEL_MID)}
      />
      <mesh position={[-1.06, 0.34, -0.337]} rotation-z={0.24} scale={[0.12, 0.018, 0.01]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={ITEM_STEEL_LIGHT} />
      </mesh>
      <mesh position={[-0.71, 0.34, -0.334]} rotation-z={-0.1} scale={[0.075, 0.015, 0.009]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={ITEM_STEEL_DARK} />
      </mesh>
      <mesh position={[-0.82, -0.12, -0.296]} scale={[0.047, 0.06, 0.016]}>
        <cylinderGeometry args={[1, 1, 1, 9]} />
        <meshBasicMaterial color={STAFF_WRAP_DARK} />
      </mesh>
    </group>
  )
}

function FireHeldItem({
  activity = 1,
  animation = 'idle',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const flame = useRef<THREE.Group>(null)
  const outerFlame = useRef<THREE.Group>(null)
  const middleFlame = useRef<THREE.Group>(null)
  const innerFlame = useRef<THREE.Group>(null)
  const creamCore = useRef<THREE.Group>(null)
  const leftLick = useRef<THREE.Group>(null)
  const rightLick = useRef<THREE.Group>(null)
  const sparkA = useRef<THREE.Group>(null)
  const sparkB = useRef<THREE.Group>(null)
  const outerGeometry = useMemo(() => createOuterFireGeometry(), [])
  const middleGeometry = useMemo(() => createMiddleFireGeometry(), [])
  const middleBackGeometry = useMemo(() => createMiddleFireGeometry(), [])
  const innerGeometry = useMemo(() => createInnerFireGeometry(), [])
  const innerBackGeometry = useMemo(() => createInnerFireGeometry(), [])
  const lickGeometry = useMemo(() => createFireLickGeometry(), [])
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    if (!flame.current) return
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const hop = getHopMotion(actionTime(t), animation === 'hop' ? motion : 0)
    const broad = Math.sin(t * 2.65 + 0.35) * motion
    const quick = Math.sin(t * 6.15 + 1.1) * motion
    const shimmer = Math.sin(t * 9.4 + 0.45) * motion
    const lean = broad * 0.075 + quick * 0.024
    const stretch = broad * 0.04 + quick * 0.026 + shimmer * 0.01
    const landingFlare = hop.land * motion

    flame.current.position.x = broad * 0.009 + quick * 0.003
    flame.current.position.y = -landingFlare * 0.005
    flame.current.rotation.z = lean - hop.rotateZ * 0.08

    if (outerFlame.current) {
      outerFlame.current.rotation.z = quick * 0.028
      outerFlame.current.scale.set(
        1 - stretch * 0.36 + landingFlare * 0.15,
        1 + stretch - landingFlare * 0.12,
        1 + shimmer * 0.012,
      )
    }

    if (middleFlame.current) {
      middleFlame.current.position.x = -quick * 0.006
      middleFlame.current.rotation.z = -lean * 0.34 + shimmer * 0.008
      middleFlame.current.scale.set(
        1 + quick * 0.018 + landingFlare * 0.08,
        1 - broad * 0.022 + shimmer * 0.02 - landingFlare * 0.07,
        1,
      )
    }

    if (innerFlame.current) {
      innerFlame.current.position.x = shimmer * 0.004
      innerFlame.current.rotation.z = lean * 0.18 - quick * 0.016
      innerFlame.current.scale.set(
        1 - shimmer * 0.025 + landingFlare * 0.06,
        1 + quick * 0.026 - landingFlare * 0.05,
        1,
      )
    }

    if (creamCore.current) {
      const corePulse = 1 + (Math.sin(t * 7.7 + 0.9) * 0.035 + landingFlare * 0.08) * motion
      creamCore.current.position.x = -0.008 + quick * 0.003
      creamCore.current.scale.set(1 / corePulse, corePulse, 1)
    }

    const leftLift = 0.5 + Math.sin(t * 4.05 + 0.2) * 0.5
    if (leftLick.current) {
      leftLick.current.position.x = -0.078 - broad * 0.005
      leftLick.current.position.y = 0.008
      leftLick.current.rotation.z = 0.38 + leftLift * 0.08 + lean * 0.45
      leftLick.current.scale.set(
        0.66 + leftLift * 0.08 + landingFlare * 0.08,
        0.62 + leftLift * 0.28 - landingFlare * 0.08,
        0.82,
      )
    }

    const rightLift = 0.5 + Math.sin(t * 4.35 + 3.35) * 0.5
    if (rightLick.current) {
      rightLick.current.position.x = 0.08 + broad * 0.004
      rightLick.current.position.y = 0.006
      rightLick.current.rotation.z = -0.42 - rightLift * 0.07 + lean * 0.32
      rightLick.current.scale.set(
        0.58 + rightLift * 0.08 + landingFlare * 0.08,
        0.58 + rightLift * 0.3 - landingFlare * 0.08,
        0.78,
      )
    }

    const animateSpark = (
      spark: THREE.Group | null,
      phaseOffset: number,
      side: -1 | 1,
      depth: number,
    ) => {
      if (!spark) return
      const cycle = (t * 0.48 + phaseOffset) % 1
      const lift = Math.sin(Math.PI * cycle)
      spark.visible = motion > 0.02 && lift > 0.08
      spark.position.set(
        side * (0.095 + cycle * 0.055) + Math.sin(t * 4.8 + phaseOffset * 5) * 0.006,
        0.34 + cycle * 0.2,
        depth,
      )
      spark.rotation.z = t * side * 1.8 + phaseOffset * Math.PI
      const sparkScale = lift * (0.017 + landingFlare * 0.007) * motion
      spark.scale.set(sparkScale * 0.78, sparkScale, sparkScale * 0.72)
    }

    animateSpark(sparkA.current, 0.08, -1, -0.045)
    animateSpark(sparkB.current, 0.58, 1, 0.015)
  })

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[-0.88, -0.2, -0.235]}
        rotation-z={0.18}
        outlineWidth={0.007}
        geometry={<cylinderGeometry args={[0.032, 0.038, 0.74, 9]} />}
        material={toon(STAFF_WOOD_MID)}
      />
      <mesh position={[-0.9, -0.2, -0.282]} rotation-z={0.18} scale={[0.012, 0.26, 0.008]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={STAFF_WOOD_DARK} />
      </mesh>
      <mesh position={[-0.895, -0.12, -0.298]} rotation-z={0.18} scale={[0.048, 0.065, 0.016]}>
        <cylinderGeometry args={[1, 1, 1, 9]} />
        <meshBasicMaterial color={STAFF_WRAP_DARK} />
      </mesh>
      <CodedAssetOutlineMesh
        position={[-0.95, 0.155, -0.255]}
        rotation-z={0.18}
        outlineWidth={0.007}
        geometry={<cylinderGeometry args={[0.082, 0.062, 0.09, 10]} />}
        material={toon(ITEM_GOLD_DARK)}
      />
      <mesh position={[-0.956, 0.19, -0.31]} rotation-z={0.18} scale={[0.058, 0.018, 0.012]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={ITEM_GOLD_LIGHT} />
      </mesh>
      <CodedAssetOutlineMesh
        position={[-0.956, 0.214, -0.278]}
        rotation-z={0.18}
        scale={[0.046, 0.038, 0.052]}
        outlineWidth={0.006}
        geometry={<sphereGeometry args={[1, 9, 6]} />}
        material={toon('#4a2110')}
      />
      <mesh position={[-0.962, 0.226, -0.324]} scale={[0.024, 0.013, 0.012]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={ITEM_FIRE_ORANGE} />
      </mesh>
      <group position={[-0.955, 0.202, -0.29]}>
        <group ref={flame}>
          <group
            ref={leftLick}
            position={[-0.078, 0.008, 0.018]}
            rotation-y={-0.82}
            rotation-z={0.42}
            scale={[0.7, 0.78, 0.82]}
          >
            <CodedAssetOutlineMesh
              outlineWidth={0.009}
              geometry={<primitive object={lickGeometry} attach="geometry" />}
              material={toon(ITEM_FIRE_RED)}
            />
          </group>
          <group
            ref={rightLick}
            position={[0.08, 0.006, 0.012]}
            rotation-y={0.78}
            rotation-z={-0.46}
            scale={[0.62, 0.72, 0.78]}
          >
            <CodedAssetOutlineMesh
              outlineWidth={0.009}
              geometry={<primitive object={lickGeometry} attach="geometry" />}
              material={toon(ITEM_FIRE_RED)}
            />
          </group>
          <group ref={outerFlame}>
            <CodedAssetOutlineMesh
              position={[0, 0.155, 0.025]}
              scale={[0.128, 0.17, 0.132]}
              outlineWidth={0.008}
              geometry={<sphereGeometry args={[1, 10, 7]} />}
              material={toon(ITEM_FIRE_RED)}
            />
            <CodedAssetOutlineMesh
              position={[0.02, 0.3, 0.02]}
              rotation-z={-0.13}
              scale={[0.068, 0.13, 0.082]}
              outlineWidth={0.006}
              geometry={<sphereGeometry args={[1, 9, 6]} />}
              material={toon(ITEM_FIRE_RED)}
            />
            <CodedAssetOutlineMesh
              outlineWidth={0.011}
              geometry={<primitive object={outerGeometry} attach="geometry" />}
              material={toon(ITEM_FIRE_RED)}
            />
          </group>
          <group ref={middleFlame} position={[0, 0.003, -0.052]}>
            <mesh position={[0.002, 0.125, 0.057]} scale={[0.078, 0.13, 0.088]}>
              <sphereGeometry args={[1, 9, 6]} />
              <meshToonMaterial color={ITEM_FIRE_ORANGE} gradientMap={getVacuumHeadToonRampTexture()} />
            </mesh>
            <mesh>
              <primitive object={middleGeometry} attach="geometry" />
              <meshToonMaterial color={ITEM_FIRE_ORANGE} gradientMap={getVacuumHeadToonRampTexture()} />
            </mesh>
            <mesh position={[0, 0, 0.104]}>
              <primitive object={middleBackGeometry} attach="geometry" />
              <meshToonMaterial color={ITEM_FIRE_ORANGE} gradientMap={getVacuumHeadToonRampTexture()} />
            </mesh>
          </group>
          <group ref={innerFlame} position={[0.004, 0.005, -0.09]}>
            <mesh position={[0, 0.09, 0.095]} scale={[0.048, 0.095, 0.06]}>
              <sphereGeometry args={[1, 9, 6]} />
              <meshBasicMaterial color={ITEM_FIRE_YELLOW} />
            </mesh>
            <mesh>
              <primitive object={innerGeometry} attach="geometry" />
              <meshBasicMaterial color={ITEM_FIRE_YELLOW} />
            </mesh>
            <mesh position={[0, 0, 0.18]}>
              <primitive object={innerBackGeometry} attach="geometry" />
              <meshBasicMaterial color={ITEM_FIRE_YELLOW} />
            </mesh>
          </group>
          <group ref={creamCore} position={[-0.008, 0, -0.13]}>
            <mesh position={[0, 0.082, 0.133]} scale={[0.024, 0.055, 0.034]}>
              <sphereGeometry args={[1, 9, 6]} />
              <meshBasicMaterial color={ITEM_FIRE_CREAM} />
            </mesh>
            <mesh position={[0, 0.082, 0]} scale={[0.027, 0.063, 0.018]}>
              <sphereGeometry args={[1, 9, 6]} />
              <meshBasicMaterial color={ITEM_FIRE_CREAM} />
            </mesh>
            <mesh position={[0, 0.082, 0.26]} scale={[0.027, 0.063, 0.018]}>
              <sphereGeometry args={[1, 9, 6]} />
              <meshBasicMaterial color={ITEM_FIRE_CREAM} />
            </mesh>
          </group>
          <group ref={sparkA}>
            <CodedAssetOutlineMesh
              outlineWidth={0.0025}
              geometry={<octahedronGeometry args={[1, 0]} />}
              material={toon(ITEM_FIRE_YELLOW)}
            />
          </group>
          <group ref={sparkB}>
            <CodedAssetOutlineMesh
              outlineWidth={0.0025}
              geometry={<octahedronGeometry args={[1, 0]} />}
              material={toon(ITEM_FIRE_ORANGE)}
            />
          </group>
        </group>
      </group>
    </group>
  )
}

function GlowbudHeldItem({
  trait,
  activity = 1,
  animation = 'idle',
}: {
  trait: GlowbudHeldTrait
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  if (trait === 'none') return null
  if (trait === 'wizard-staff') {
    return <WizardStaff activity={activity} animation={animation} />
  }

  const gripFitPosition: [number, number, number] =
    trait === 'fire' ? [-0.08, 0.015, 0] : trait === 'sword' ? [-0.11, 0.13, 0] : [-0.11, 0, 0]

  return (
    <HeldItemMotion trait={trait} activity={activity} animation={animation}>
      <group scale={[-1, 1, 1]}>
        <group position={gripFitPosition}>
          {trait === 'axe' ? <AxeHeldItem /> : null}
          {trait === 'sword' ? <SwordHeldItem /> : null}
          {trait === 'peak' ? <PeakHeldItem /> : null}
          {trait === 'fire' ? <FireHeldItem activity={activity} animation={animation} /> : null}
        </group>
      </group>
    </HeldItemMotion>
  )
}

function WizardHand({
  side,
  activity = 1,
  animation = 'idle',
  heldTrait = 'none',
  skinPalette = getGlowbudSkinPalette(),
}: {
  side: -1 | 1
  activity?: number
  animation?: RedShellCritterAnimation
  heldTrait?: GlowbudHeldTrait
  skinPalette?: GlowbudSkinPalette
}) {
  const hand = useRef<THREE.Group>(null)
  const coreAnimation = getCoreGlowbudAnimation(animation)
  const holdsSourceItem = side === 1 && heldTrait !== 'none' && heldTrait !== 'wizard-staff'
  const holdsStaff = side === -1 && heldTrait === 'wizard-staff'
  const holdsItem = holdsSourceItem || holdsStaff
  const handOffset = holdsItem ? 0.9 : 0.785
  const handCenterX = side * handOffset
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const actionT = actionTime(t)
    const grumble = getWizardGrumbleMotion(actionT + (side === -1 ? 0 : 0.08), animation === 'grumble' ? motion : 0)
    const hop = getHopMotion(actionT + (side === -1 ? 0.015 : -0.01), animation === 'hop' ? motion : 0)
    const performance = getDirectedPerformanceMotion(actionT, animation, motion)
    const lag = Math.sin(t * 1.45 + side * 0.55) * 0.01 * motion + idlePulse(t + side * 0.2, 6.4, 0.72, 0.06) * 0.008 * motion
    const staffGrip = holdsItem ? 1 : 0.28
    const gripY = holdsItem
      ? grumble.staffLift * 0.55 - grumble.hit * 0.012
      : grumble.chatter * 0.28 - grumble.impact * 0.006
    const gripX = holdsItem
      ? -grumble.prep * 0.012 + grumble.hit * 0.01
      : grumble.chatter * side * 0.16
    const performanceWaveSide: -1 | 1 = heldTrait === 'wizard-staff' ? 1 : -1
    const greeting = !holdsItem && performanceWaveSide === side ? performance.waveEnvelope : 0
    const greetingBeat = !holdsItem && performanceWaveSide === side ? performance.waveBeat : 0
    const danceSwing = performance.boogieBeat * (holdsItem ? 0 : 0.05)
    const danceLift = performance.boogieBounce * (holdsItem ? 0 : 0.04)

    if (hand.current) {
      hand.current.position.x = gripX + hop.rotateZ * side * 0.08 + side * greeting * 0.055 + side * danceSwing
      hand.current.position.y =
        lag
        + gripY
        - hop.airborne * 0.012
        + hop.land * 0.018
        + greeting * 0.14
        + performance.heldLift * (holdsItem ? 1 : 0)
        + danceLift
        + performance.freeHandDanceLift * side * (holdsItem ? 0 : 1)
      hand.current.rotation.z =
        side * (0.04 + lag * 0.55)
        + grumble.staffTilt * 0.45 * staffGrip
        - grumble.hit * 0.03 * side
        + hop.rotateZ * 0.72
        + side * greeting * 0.34
        + side * greetingBeat * 0.3
        + performance.boogieBeat * (holdsItem ? 0 : 0.11)
      hand.current.scale.set(
        1 + Math.abs(lag) * 0.45 + grumble.impact * 0.028 * staffGrip + hop.land * 0.04 + greeting * 0.035,
        1 - Math.abs(lag) * 0.28 - grumble.impact * 0.02 * staffGrip - hop.land * 0.03 + hop.airborne * 0.015 - greeting * 0.018,
        1,
      )
    }
  })

  return (
    <group ref={hand}>
      {skinPalette.finish === 'ape' || skinPalette.finish === 'alien' || skinPalette.finish === 'zombie' ? null : (
        <mesh
          position={[side * (handOffset - 0.155), -0.12, -0.12]}
          rotation-z={side * 0.18}
          scale={[0.1, 0.135, 0.035]}
        >
          <sphereGeometry args={[1, 10, 5]} />
          <meshBasicMaterial color={VAC_ASSET_INK} transparent opacity={0.42} depthWrite={false} />
        </mesh>
      )}
      <CodedAssetOutlineMesh
        position={[handCenterX, -0.12, -0.1]}
        rotation-z={side * 0.1}
        scale={holdsItem ? [0.184, 0.162, 0.154] : [0.175, 0.158, 0.15]}
        outlineWidth={0.014}
        geometry={<sphereGeometry args={[1, 14, 9]} />}
        material={toon(skinPalette.base)}
      />
      {skinPalette.finish === 'ape' ? (
        <ApeHandTreatment
          side={side}
          center={[handCenterX, -0.12, -0.1]}
          scale={holdsItem ? [0.184, 0.162, 0.154] : [0.175, 0.158, 0.15]}
          rotationZ={side * 0.1}
          activity={activity}
          animation={coreAnimation}
        />
      ) : skinPalette.finish === 'alien' ? (
        <AlienHandTreatment
          side={side}
          center={[handCenterX, -0.12, -0.1]}
          scale={holdsItem ? [0.184, 0.162, 0.154] : [0.175, 0.158, 0.15]}
          rotationZ={side * 0.1}
          activity={activity}
          animation={coreAnimation}
        />
      ) : skinPalette.finish === 'zombie' ? (
        <ZombieHandTreatment
          side={side}
          center={[handCenterX, -0.12, -0.1]}
          scale={holdsItem ? [0.184, 0.162, 0.154] : [0.175, 0.158, 0.15]}
          rotationZ={side * 0.1}
          activity={activity}
          animation={coreAnimation}
        />
      ) : (
        <>
          <mesh
            position={[handCenterX - side * 0.037, -0.064, -0.242]}
            rotation-z={side * -0.22}
            scale={[0.085, 0.026, 0.012]}
          >
            <sphereGeometry args={[1, 8, 4]} />
            <meshBasicMaterial color={skinPalette.light} transparent opacity={0.32} depthWrite={false} />
          </mesh>
          <mesh
            position={[handCenterX + side * 0.035, -0.19, -0.244]}
            rotation-z={side * 0.22}
            scale={[0.104, 0.026, 0.012]}
          >
            <sphereGeometry args={[1, 8, 4]} />
            <meshBasicMaterial color={skinPalette.shade} transparent opacity={0.18} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  )
}

function WizardHands({
  activity = 1,
  animation = 'idle',
  heldTrait = 'none',
  skinPalette = getGlowbudSkinPalette(),
}: {
  activity?: number
  animation?: RedShellCritterAnimation
  heldTrait?: GlowbudHeldTrait
  skinPalette?: GlowbudSkinPalette
}) {
  return (
    <>
      <WizardHand side={-1} activity={activity} animation={animation} heldTrait={heldTrait} skinPalette={skinPalette} />
      <WizardHand side={1} activity={activity} animation={animation} heldTrait={heldTrait} skinPalette={skinPalette} />
    </>
  )
}

function WizardCloak({
  variant = 'red',
}: {
  variant?: CloakShellVariant
}) {
  return (
    <group name={`cloak-shell-${variant}-complete-fabric-system`}>
      <CloakShell fitted variant={variant} />
      <CloakShellOpening variant={variant} />
    </group>
  )
}

const DEFAULT_GLOWBUD_TRAITS: GlowbudTraitLoadout = {
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

function normalizeGlowbudPlantHead(head: GlowbudHeadTrait | string): GlowbudHeadTrait {
  if (head === 'hibiscus-pot') return 'hibiscus'
  if (head === 'venus-flytrap-pot') return 'venus-flytrap'
  if (head === 'amanita-muscaria-pot') return 'amanita-muscaria'
  if (head === 'sunflower-pot') return 'sunflower'
  if (head === 'cactus-pot') return 'cactus'
  if (head === 'snake-plant-pot') return 'snake-plant'
  if (head === 'lotus-pot') return 'lotus'
  if (head === 'douglas-pot') return 'douglas'
  if (head === 'fern-pot') return 'fern'
  if (head === 'myrtle-pot') return 'myrtle'
  if (head === 'lavender-pot') return 'lavender'
  if (head === 'dandelion-pot') return 'dandelion'
  if (head === 'sprout-pot') return 'sprout'
  if (head === 'bunch-of-flowers-pot') return 'bunch-of-flowers'
  if (head === 'roses-pot') return 'roses'
  if (head === 'bonsai-pot') return 'bonsai'
  if (head === 'bonsai-sakura-pot') return 'bonsai-sakura'
  if (head === 'flower-pot') return 'flower'
  if (head === 'two-flowers-pot') return 'two-flowers'
  if (head === 'palm-tree-pot') return 'palm-tree'
  if (
    head === 'hibiscus'
    || head === 'venus-flytrap'
    || head === 'amanita-muscaria'
    || head === 'sunflower'
    || head === 'cactus'
    || head === 'snake-plant'
    || head === 'lotus'
    || head === 'douglas'
    || head === 'fern'
    || head === 'myrtle'
    || head === 'lavender'
    || head === 'dandelion'
    || head === 'sprout'
    || head === 'bunch-of-flowers'
    || head === 'roses'
    || head === 'bonsai'
    || head === 'bonsai-sakura'
    || head === 'flower'
    || head === 'two-flowers'
    || head === 'palm-tree'
    || head === 'none'
  ) return head
  return 'none'
}

export function GlowbudTraitAvatarAsset({
  animation = 'idle',
  scale = 1,
  activity = 1,
  position = [0, 0, 0],
  traits = DEFAULT_GLOWBUD_TRAITS,
  mossSelection,
  assetSelection,
}: GlowbudTraitAvatarAssetProps) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const shadow = useRef<THREE.Mesh>(null)
  const actionTime = useAnimationActionTimer(animation)
  const coreAnimation = getCoreGlowbudAnimation(animation)
  const rawLoadout = { ...DEFAULT_GLOWBUD_TRAITS, ...traits }
  const loadout: GlowbudTraitLoadout = {
    ...rawLoadout,
    head: normalizeGlowbudPlantHead(rawLoadout.head),
    pot: rawLoadout.pot ?? 'blue-flower-pot',
  }
  const isWizardShell = loadout.shell === 'wizard-cloak' || loadout.shell === 'green-cloak'
  const cloakVariant: CloakShellVariant = loadout.shell === 'green-cloak' ? 'green' : 'red'
  const isNaked = loadout.shell === 'naked'
  const isSmoothShell = loadout.shell === 'smooth-shell'
  const isStoicShell = loadout.shell === 'stoic-shell'
  const isSoftShell = loadout.shell === 'soft-shell'
  const isRockShell = loadout.shell === 'rock-shell'
  const isLogShell = loadout.shell === 'log-shell'
  const isHoodieShell = loadout.shell === 'hoodie-shell'
  const isGuardShell = loadout.shell === 'guard-shell'
  const isHeavyDutyShell = loadout.shell === 'heavy-duty-shell'
  const isRobotShell = loadout.shell === 'robot-shell'
  const isSpikeyShell = loadout.shell === 'spikey-shell'
  const isSharkShell = loadout.shell === 'shark-shell'
  const isHornyShell = loadout.shell === 'horny-shell'
  const isRaddishShell = loadout.shell === 'raddish-shell'
  const isAncientShell = loadout.shell === 'ancient-shell'
  const isMossShell = loadout.shell === 'moss-shell'
  const isAeroMetalShell = loadout.shell === 'aero-metal-shell'
  const isCrystalShell = loadout.shell === 'crystal-shell'
  const isGemstoneShell = loadout.shell === 'gemstone-shell'
  const isIceShell = loadout.shell === 'ice-shell'
  const isGoldJewelShell = loadout.shell === 'gold-jewel-shell'
  const isAmethystGeodeShell = loadout.shell === 'amethyst-geode-shell'
  const skinPalette = getGlowbudSkinPalette(loadout.skin)
  const eyeTrait = loadout.eyes ?? 'mellow'
  const mouthTrait = loadout.mouth ?? 'classic-smile'
  const noseTrait = loadout.nose ?? 'none'

  useEffect(() => {
    if (!root.current) return
    assignGlowbudAssetPickIds(root.current)
  }, [
    loadout.companion,
    loadout.face,
    loadout.flytrap,
    loadout.head,
    loadout.held,
    loadout.pot,
    loadout.shell,
    loadout.skin,
    noseTrait,
    eyeTrait,
    mouthTrait,
  ])

  function handleAssetPointerDown(event: ThreeEvent<PointerEvent>) {
    if (!assetSelection?.enabled || !root.current) return
    const picked = getGlowbudAssetPick(event.object, root.current)
    if (!picked) return

    const world = new THREE.Vector3()
    const size = new THREE.Vector3()
    picked.object.getWorldPosition(world)
    new THREE.Box3().setFromObject(picked.object).getSize(size)
    assetSelection.onPick?.({
      id: picked.id,
      slot: picked.slot,
      trait: picked.trait,
      objectName: picked.object.name || picked.id,
      hierarchy: getGlowbudObjectHierarchy(picked.object, root.current),
      local: toPickTuple(picked.object.position),
      world: toPickTuple(world),
      size: toPickTuple(size),
      materialColor: getMaterialColor(event.object),
    })
    event.stopPropagation()
  }

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const actionT = actionTime(t)
    const ambient = getAmbientLifeMotion(t, motion)
    const performance = getDirectedPerformanceMotion(actionT, animation, motion)
    const canHop = animation === 'hop'
    const hop = getHopMotion(actionT, canHop ? motion : 0)
    const canGrumble = animation === 'grumble'
    const grumble = getWizardGrumbleMotion(actionT, canGrumble ? motion : 0)
    const breathe = Math.sin(t * 1.34 + 0.38) * 0.013 * motion
    const idleJiggle = Math.sin(t * 8.1 + 0.65) * 0.0045 * motion + Math.sin(t * 12.2 + 0.2) * 0.0025 * motion
    const traitWeight = isWizardShell ? Math.sin(t * 0.76 + 1.1) * 0.012 * motion : Math.sin(t * 1.02 + 0.4) * 0.014 * motion

    if (root.current) {
      root.current.position.set(position[0], position[1], position[2])
      root.current.scale.setScalar(scale)
    }
    if (body.current) {
      body.current.position.x =
        ambient.bodyX
        + idleJiggle * 0.45
        + hop.x * 0.82
        + grumble.bodyLean * 0.42
        + grumble.chatter * 0.18
        + performance.bodyX
      body.current.position.y =
        ambient.bodyLift
        + breathe
        + traitWeight * 0.35
        + hop.height
        + grumble.bodyJolt
        + performance.bodyLift
      body.current.rotation.z =
        ambient.bodyRotateZ
        + traitWeight * 0.52
        + hop.rotateZ * 0.9
        + grumble.bodyLean
        + grumble.hit * 0.018
        + performance.bodyRotateZ
      body.current.rotation.x =
        Math.sin(t * 0.9) * 0.006 * motion
        + ambient.nod * 0.012
        + hop.rotateX * 0.9
        - grumble.prep * 0.01
        + grumble.hit * 0.032
        + performance.bodyRotateX
      body.current.rotation.y = ambient.bodyRotateY + performance.bodyRotateY + performance.showcaseTurn
      if (isNaked) {
        const roundPulse = 1 + breathe * 0.075 + Math.abs(idleJiggle) * 0.025
        body.current.scale.set(
          (roundPulse + ambient.squashX) * hop.scaleX * performance.bodyScaleX,
          (roundPulse + ambient.squashY) * hop.scaleY * performance.bodyScaleY,
          roundPulse * hop.scaleZ * performance.bodyScaleZ,
        )
      } else {
        body.current.scale.set(
          (1 + ambient.squashX + breathe * 0.22 + Math.abs(idleJiggle) * 0.18 + grumble.impact * 0.026) * hop.scaleX * performance.bodyScaleX,
          (1 + ambient.squashY - breathe * 0.16 - Math.abs(idleJiggle) * 0.08 - grumble.impact * 0.032) * hop.scaleY * performance.bodyScaleY,
          (1 + breathe * 0.05 + grumble.impact * 0.018) * hop.scaleZ * performance.bodyScaleZ,
        )
      }
    }
    if (shadow.current) {
      const shadowScale = Math.max(
        0.6,
        hop.shadowScale * (1 + performance.boogieBounce * 0.04 - performance.proudBeat * 0.035),
      )
      const shadowWidth = isMossShell ? 0.34 : isNaked ? 0.5 : isSoftShell ? 0.52 : 0.58
      const shadowHeight = isMossShell ? 0.034 : isNaked ? 0.052 : isSoftShell ? 0.056 : 0.064
      const shadowDepth = isMossShell ? 0.016 : isNaked ? 0.025 : isSoftShell ? 0.027 : 0.03
      shadow.current.scale.set(
        shadowWidth * shadowScale,
        shadowHeight * (1 + hop.land * 0.16 - hop.airborne * 0.18),
        shadowDepth * shadowScale,
      )
      shadow.current.position.y = (isMossShell ? -0.654 : isNaked ? -0.55 : isSoftShell ? -0.61 : -0.58) - hop.land * 0.012
      const material = shadow.current.material
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = isMossShell
          ? Math.min(0.2, Math.max(0.06, hop.shadowOpacity * 0.68))
          : isNaked
            ? Math.min(0.24, Math.max(0.07, hop.shadowOpacity * 0.76))
          : isSoftShell
            ? Math.min(0.25, Math.max(0.07, hop.shadowOpacity * 0.84))
          : Math.min(0.3, Math.max(0.08, hop.shadowOpacity))
      }
    }
  })

  return (
    <GlowbudAnimationContext.Provider value={animation}>
      <MossSelectionContext.Provider value={mossSelection ?? EMPTY_MOSS_SELECTION}>
        <group
        ref={root}
        position={position}
        scale={scale}
        frustumCulled={false}
        onPointerDown={assetSelection?.enabled ? handleAssetPointerDown : undefined}
      >
      <HopMotionPolish activity={activity} animation={animation} />
      <group ref={body}>
        {isWizardShell ? (
          <>
            <GlowbudTraitSlotScope slot="held" trait={loadout.held}>
              <GlowbudHeldItem trait={loadout.held} activity={activity} animation={animation} />
            </GlowbudTraitSlotScope>
            <GlowbudTraitSlotScope slot="skin" trait={loadout.skin ?? 'red'}>
              <WizardHands
                activity={activity}
                animation={animation}
                heldTrait={loadout.held}
                skinPalette={skinPalette}
              />
            </GlowbudTraitSlotScope>
            <GlowbudTraitSlotScope slot="shell" trait={loadout.shell}>
              <WizardCloak variant={cloakVariant} />
            </GlowbudTraitSlotScope>
            <GlowbudTraitSlotScope
              slot="face"
              trait={`${loadout.skin ?? 'red'}-${loadout.face}-${eyeTrait}-${mouthTrait}-${noseTrait}`}
            >
              <group position={[0, 0.09, 0]}>
                <RedCharacter
                  fitted
                  activity={activity}
                  animation={animation}
                  faceTrait={loadout.face}
                  eyeTrait={eyeTrait}
                  mouthTrait={mouthTrait}
                  noseTrait={noseTrait}
                  heldTrait={loadout.held}
                  showSideKnobs={false}
                  skinPalette={skinPalette}
                />
              </group>
            </GlowbudTraitSlotScope>
            <GlowbudTraitSlotScope slot="head-pot" trait={`${loadout.head}-${loadout.pot}`}>
              {loadout.head === 'hibiscus' ? <HeadHibiscusPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'venus-flytrap' ? (
                <HeadVenusFlytrapPotAccessory activity={activity} variant={loadout.flytrap} pot={loadout.pot} />
              ) : null}
              {loadout.head === 'amanita-muscaria' ? <HeadAmanitaMuscariaPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'sunflower' ? <HeadSunflowerPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'cactus' ? <HeadCactusPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'snake-plant' ? <HeadSnakePlantPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'lotus' ? <HeadLotusPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'douglas' ? <HeadDouglasPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'fern' ? <HeadFernPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'myrtle' ? <HeadMyrtlePotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'lavender' ? <HeadLavenderPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'dandelion' ? <HeadDandelionPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'sprout' ? <HeadSproutPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'bunch-of-flowers' ? <HeadBunchOfFlowersPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'roses' ? <HeadRosesPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'bonsai' ? <HeadBonsaiPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'bonsai-sakura' ? <HeadBonsaiSakuraPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'flower' ? <HeadFlowerPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'two-flowers' ? <HeadTwoFlowersPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'palm-tree' ? <HeadPalmTreePotAccessory activity={activity} pot={loadout.pot} /> : null}
            </GlowbudTraitSlotScope>
          </>
        ) : (
          <>
            <GlowbudTraitSlotScope slot="held" trait={loadout.held}>
              <GlowbudHeldItem trait={loadout.held} activity={activity} animation={animation} />
            </GlowbudTraitSlotScope>
            <GlowbudTraitSlotScope slot="shell" trait={loadout.shell}>
              {isNaked ? (
                <NakedBody palette={skinPalette} activity={activity} animation={coreAnimation} />
              ) : isSmoothShell ? (
                <SeedFinishShell fitted variant="smooth" />
              ) : isStoicShell ? (
                <SeedFinishShell fitted variant="stoic" />
              ) : isSoftShell ? (
                <SoftShell fitted activity={activity} animation={coreAnimation} />
              ) : isRockShell ? (
                <RockShell fitted />
              ) : isLogShell ? (
                <LogShell fitted />
              ) : isHoodieShell ? (
                <HoodieShell fitted activity={activity} animation={coreAnimation} />
              ) : isGuardShell ? (
                <GuardShell
                  fitted
                  activity={activity}
                  animation={coreAnimation}
                  hasHeadAccessory={loadout.head !== 'none'}
                />
              ) : isHeavyDutyShell ? (
                <HeavyDutyShell fitted hasHeadAccessory={loadout.head !== 'none'} />
              ) : isRobotShell ? (
                <RobotShell
                  fitted
                  hasHeadAccessory={loadout.head !== 'none'}
                  activity={activity}
                  animation={coreAnimation}
                />
              ) : isSpikeyShell ? (
                <SpikeyShell fitted hasHeadAccessory={loadout.head !== 'none'} />
              ) : isSharkShell ? (
                <SharkShell
                  fitted
                  hasHeadAccessory={loadout.head !== 'none'}
                  activity={activity}
                  animation={coreAnimation}
                />
              ) : isHornyShell ? (
                <HornyShell fitted />
              ) : isRaddishShell ? (
                <RaddishShell
                  fitted
                  hasHeadAccessory={loadout.head !== 'none'}
                  activity={activity}
                  animation={coreAnimation}
                />
              ) : isAncientShell ? (
                <AncientShell
                  fitted
                  hasHeadAccessory={loadout.head !== 'none'}
                  activity={activity}
                  animation={coreAnimation}
                />
              ) : isMossShell ? (
                <MossShell fitted />
              ) : isAeroMetalShell ? (
                <AeroMetalShell fitted />
              ) : isCrystalShell ? (
                <CrystalChandelierShell fitted />
              ) : isGemstoneShell ? (
                <GemstoneShell fitted />
              ) : isIceShell ? (
                <IceShell fitted />
              ) : isGoldJewelShell ? (
                <GoldJewelShell fitted />
              ) : isAmethystGeodeShell ? (
                <AmethystGeodeShell fitted />
              ) : (
                <SeedShell fitted />
              )}
              {isNaked ? null : isSmoothShell ? (
                <SeedFinishShellOpeningLip variant="smooth" />
              ) : isStoicShell ? (
                <SeedFinishShellOpeningLip variant="stoic" />
              ) : isMossShell ? (
                <MossShellOpeningOcclusionLip />
              ) : isRockShell ? (
                <RockShellOpeningLip />
              ) : isLogShell ? (
                <LogShellOpeningLip />
              ) : isHoodieShell ? (
                <HoodieShellOpeningLip activity={activity} animation={coreAnimation} />
              ) : isGuardShell ? (
                <GuardShellOpeningArmor />
              ) : isHeavyDutyShell ? (
                <HeavyDutyShellOpeningArmor />
              ) : isRobotShell ? (
                <RobotShellOpeningFrame />
              ) : isSpikeyShell ? (
                <SpikeyShellOpeningLip />
              ) : isSharkShell ? (
                <SharkShellOpeningJaws />
              ) : isHornyShell ? (
                <HornyShellOpeningLip />
              ) : isRaddishShell ? (
                <RaddishShellOpeningLip />
              ) : isAncientShell ? (
                <AncientShellOpeningPortal />
              ) : isCrystalShell ? (
                <DiamondShellOpeningLip />
              ) : isGemstoneShell ? (
                <GemstoneShellOpeningLip />
              ) : isIceShell ? (
                <IceShellOpeningLip />
              ) : (
                <ShellOpeningOcclusionLip
                  variant={
                      isSoftShell
                        ? 'soft'
                        : isAeroMetalShell
                      ? 'aero-metal'
                      : isGoldJewelShell
                          ? 'gold-jewel'
                          : isAmethystGeodeShell
                            ? 'amethyst-geode'
                            : 'seed'
                  }
                />
              )}
            </GlowbudTraitSlotScope>
            <GlowbudTraitSlotScope
              slot="face"
              trait={`${loadout.skin ?? 'red'}-${eyeTrait}-${mouthTrait}-${noseTrait}`}
            >
              <RedCharacter
                fitted
                activity={activity}
                animation={animation}
                faceTrait={loadout.face}
                eyeTrait={eyeTrait}
                mouthTrait={mouthTrait}
                noseTrait={noseTrait}
                heldTrait={loadout.held}
                floatingHands={isNaked}
                shellFreeFace={isNaked}
                skinPalette={skinPalette}
              />
            </GlowbudTraitSlotScope>
            <GlowbudTraitSlotScope slot="head-pot" trait={`${loadout.head}-${loadout.pot}`}>
              {loadout.head === 'hibiscus' ? <HeadHibiscusPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'venus-flytrap' ? (
                <HeadVenusFlytrapPotAccessory activity={activity} variant={loadout.flytrap} pot={loadout.pot} />
              ) : null}
              {loadout.head === 'amanita-muscaria' ? <HeadAmanitaMuscariaPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'sunflower' ? <HeadSunflowerPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'cactus' ? <HeadCactusPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'snake-plant' ? <HeadSnakePlantPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'lotus' ? <HeadLotusPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'douglas' ? <HeadDouglasPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'fern' ? <HeadFernPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'myrtle' ? <HeadMyrtlePotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'lavender' ? <HeadLavenderPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'dandelion' ? <HeadDandelionPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'sprout' ? <HeadSproutPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'bunch-of-flowers' ? <HeadBunchOfFlowersPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'roses' ? <HeadRosesPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'bonsai' ? <HeadBonsaiPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'bonsai-sakura' ? <HeadBonsaiSakuraPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'flower' ? <HeadFlowerPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'two-flowers' ? <HeadTwoFlowersPotAccessory activity={activity} pot={loadout.pot} /> : null}
              {loadout.head === 'palm-tree' ? <HeadPalmTreePotAccessory activity={activity} pot={loadout.pot} /> : null}
            </GlowbudTraitSlotScope>
          </>
        )}
      </group>
      <GlowbudTraitSlotScope slot="companion" trait={loadout.companion ?? 'none'}>
        {loadout.companion === 'cartoon-snail' ? (
          <CartoonGrassSnailCompanion activity={activity} animation={animation} />
        ) : null}
        {loadout.companion === 'canary-birb' ? (
          <CanaryBirbCompanion activity={activity} animation={animation} />
        ) : null}
        {loadout.companion === 'cardinal-birb' ? (
          <CardinalBirbCompanion activity={activity} animation={animation} />
        ) : null}
        {loadout.companion === 'toad' ? <ToadCompanion activity={activity} animation={animation} /> : null}
      </GlowbudTraitSlotScope>
      <mesh ref={shadow} position={[0, -0.58, -0.05]} scale={[0.58, 0.064, 0.03]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial
          color={
            isWizardShell
              ? CLOAK_SHADOW
              : isNaked
                ? skinPalette.shade
              : isSmoothShell
                ? SMOOTH_SHELL_SHADOW
                : isStoicShell
                  ? STOIC_SHELL_SHADOW
              : isMossShell
                ? MOSS_SHELL_SOIL
              : isAeroMetalShell
                ? AERO_SHELL_DARK
                : isCrystalShell
                  ? DIAMOND_SHADOW
                  : isGemstoneShell
                    ? GEMSTONE_SHADOW
                  : isIceShell
                    ? ICE_SHADOW
                    : isRobotShell
                      ? ROBOT_SHADOW
                    : isSharkShell
                      ? SHARK_SHADOW
                    : isGoldJewelShell
                    ? GOLD_SHELL_DARK
                    : isAmethystGeodeShell
                      ? AMETHYST_STONE_DEEP
                      : '#7b68be'
          }
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
        </group>
      </MossSelectionContext.Provider>
    </GlowbudAnimationContext.Provider>
  )
}

export function GlowbudWizardCritterAsset({
  animation = 'idle',
  scale = 1,
  activity = 1,
  position = [0, 0, 0],
}: GlowbudWizardCritterAssetProps) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const shadow = useRef<THREE.Mesh>(null)
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const actionT = actionTime(t)
    const canHop = animation === 'hop'
    const hop = getHopMotion(actionT, canHop ? motion : 0)
    const grumble = getWizardGrumbleMotion(actionT, animation === 'grumble' ? motion : 0)
    const breathe = Math.sin(t * 1.28 + 0.6) * 0.012 * motion
    const cloakWeight = Math.sin(t * 0.76 + 1.1) * 0.014 * motion
    const idleJiggle = Math.sin(t * 7.8 + 1.1) * 0.004 * motion + Math.sin(t * 12.6) * 0.0025 * motion

    if (root.current) {
      root.current.position.set(position[0], position[1], position[2])
      root.current.scale.setScalar(scale)
    }
    if (body.current) {
      body.current.position.x = idleJiggle * 0.4 + hop.x * 0.6 + grumble.bodyLean * 0.5 + grumble.chatter * 0.24
      body.current.position.y = breathe + cloakWeight * 0.4 + hop.height + grumble.bodyJolt
      body.current.rotation.z = cloakWeight * 0.55 + hop.rotateZ * 0.8 + grumble.bodyLean + grumble.hit * 0.022 - grumble.rebound * 0.012
      body.current.rotation.x = Math.sin(t * 0.9) * 0.006 * motion + hop.rotateX * 0.85 - grumble.prep * 0.012 + grumble.hit * 0.038 - grumble.rebound * 0.018
      body.current.scale.set(
        (1 + breathe * 0.22 + Math.abs(idleJiggle) * 0.18 + grumble.impact * 0.035 + grumble.mouthOpen * 0.006) * hop.scaleX,
        (1 - breathe * 0.16 - Math.abs(idleJiggle) * 0.08 - grumble.impact * 0.042 + grumble.rebound * 0.016) * hop.scaleY,
        (1 + breathe * 0.04 + grumble.impact * 0.02) * hop.scaleZ,
      )
    }
    if (shadow.current) {
      const shadowScale = Math.max(0.62, hop.shadowScale)
      shadow.current.scale.set(0.58 * shadowScale, 0.064 * (1 + hop.land * 0.16 - hop.airborne * 0.18), 0.03 * shadowScale)
      shadow.current.position.y = -0.58 - hop.land * 0.012
      const material = shadow.current.material
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = Math.min(0.3, Math.max(0.08, hop.shadowOpacity))
      }
    }
  })

  return (
    <group ref={root} position={position} scale={scale} frustumCulled={false}>
      <HopMotionPolish activity={activity} animation={animation} />
      <group ref={body}>
        <WizardStaff activity={activity} animation={animation} />
        <WizardHands activity={activity} animation={animation} heldTrait="wizard-staff" />
        <WizardCloak variant="red" />
        <group position={[0, 0.09, 0]}>
          <WizardFace activity={activity} animation={animation} />
        </group>
      </group>
      <mesh ref={shadow} position={[0, -0.58, -0.05]} scale={[0.58, 0.064, 0.03]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color={CLOAK_SHADOW} transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  )
}

function HopMotionPolish({
  animation = 'idle',
  activity = 1,
}: {
  animation?: RedShellCritterAnimation
  activity?: number
}) {
  const impactGroup = useRef<THREE.Group>(null)
  const airGroup = useRef<THREE.Group>(null)
  const leftArc = useRef<THREE.Mesh>(null)
  const rightArc = useRef<THREE.Mesh>(null)
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const motion = clampIdleActivity(activity)
    const hop = getHopMotion(actionTime(t), animation === 'hop' ? motion : 0)
    const impact = Math.max(hop.land, hop.prep * 0.34)
    const airborne = hop.airborne

    if (impactGroup.current) {
      impactGroup.current.visible = impact > 0.012
      impactGroup.current.position.y = -0.662 - hop.land * 0.012
      impactGroup.current.scale.set(0.82 + impact * 0.72, 0.58 + impact * 0.26, 1)
      impactGroup.current.rotation.z = Math.sin(t * 8.2) * 0.015 * impact
    }
    if (airGroup.current) {
      airGroup.current.visible = airborne > 0.05
      airGroup.current.position.y = -0.04 + hop.height * 0.34
      airGroup.current.scale.set(0.92 + airborne * 0.12, 0.92 + airborne * 0.18, 1)
      airGroup.current.rotation.z = hop.rotateZ * 0.8
    }
    if (leftArc.current) {
      leftArc.current.visible = airborne > 0.14
      leftArc.current.position.y = 0.13 + hop.height * 0.12
      leftArc.current.rotation.z = -0.42 - airborne * 0.12
      leftArc.current.scale.set(0.018, 0.18 + airborne * 0.07, 0.006)
    }
    if (rightArc.current) {
      rightArc.current.visible = airborne > 0.14
      rightArc.current.position.y = 0.11 + hop.height * 0.1
      rightArc.current.rotation.z = 0.42 + airborne * 0.12
      rightArc.current.scale.set(0.018, 0.17 + airborne * 0.065, 0.006)
    }
  })

  return (
    <group visible={animation === 'hop'}>
      <group ref={impactGroup} visible={false}>
        <mesh position={[-0.5, 0, -0.45]} rotation-z={0.12} scale={[0.26, 0.03, 0.05]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color="#fff0b6" transparent opacity={0.46} depthWrite={false} />
        </mesh>
        <mesh position={[0.46, -0.006, -0.44]} rotation-z={-0.14} scale={[0.24, 0.028, 0.05]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color="#ffd8f2" transparent opacity={0.44} depthWrite={false} />
        </mesh>
        <mesh position={[-0.18, 0.014, -0.56]} rotation-z={-0.06} scale={[0.18, 0.02, 0.036]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color="#fff7d5" transparent opacity={0.38} depthWrite={false} />
        </mesh>
        <mesh position={[0.16, 0.014, -0.56]} rotation-z={0.08} scale={[0.18, 0.02, 0.036]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color="#fff7d5" transparent opacity={0.34} depthWrite={false} />
        </mesh>
      </group>
      <group ref={airGroup} visible={false}>
        <mesh ref={leftArc} position={[-0.98, 0.13, -0.22]} rotation-z={-0.42} scale={[0.018, 0.18, 0.006]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.28} depthWrite={false} />
        </mesh>
        <mesh ref={rightArc} position={[0.98, 0.11, -0.22]} rotation-z={0.42} scale={[0.018, 0.17, 0.006]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.24} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

export function RedShellIdleCritterAsset({
  mode = 'dressed',
  animation = 'idle',
  scale = 1,
  activity = 1,
  position = [0, 0, 0],
}: RedShellIdleCritterAssetProps) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const shadow = useRef<THREE.Mesh>(null)
  const actionTime = useAnimationActionTimer(animation)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const canHop = animation === 'hop' && mode !== 'shell'
    const hop = getHopMotion(actionTime(t), canHop ? motion : 0)
    const breathe = Math.sin(t * 1.42) * 0.014 * motion
    const softSecondaryBreath = Math.sin(t * 2.84 + 0.5) * 0.005 * motion
    const idleJiggle = Math.sin(t * 8.4 + 0.3) * 0.006 * motion + Math.sin(t * 13.7 + 1.2) * 0.0035 * motion
    const settle = Math.pow(Math.max(0, Math.sin(t * 0.72 - 0.45)), 5) * 0.014 * motion
    const happySnug = idlePulse(t, 6.2, 0.71, 0.06) * motion
    const sway = Math.sin(t * 1.02 + 0.4) * 0.022 * motion + Math.sin(t * 2.05) * 0.006 * motion
    const happyTremble = Math.sin(t * 18.5) * 0.006 * happySnug + idleJiggle * 0.7

    if (root.current) {
      root.current.position.set(position[0], position[1], position[2])
      root.current.scale.setScalar(scale)
    }
    if (body.current) {
      body.current.position.x = idleJiggle * 0.55 + hop.x
      body.current.position.y = breathe + softSecondaryBreath + idleJiggle * 0.35 + settle * 0.28 - happySnug * 0.008 + hop.height
      body.current.rotation.z = sway + happyTremble + hop.rotateZ
      body.current.rotation.x = Math.sin(t * 1.08 + 0.8) * 0.009 * motion - happySnug * 0.009 + idleJiggle * 0.28 + hop.rotateX
      body.current.rotation.y = Math.sin(t * 0.74 + 0.2) * 0.01 * motion + Math.sin(t * 1.38 + 1.1) * 0.004 * motion + hop.rotateZ * 0.08
      body.current.scale.set(
        (1 + breathe * 0.24 + settle * 0.95 + happySnug * 0.03 + Math.abs(idleJiggle) * 0.26) * hop.scaleX,
        (1 - breathe * 0.18 - settle * 0.45 - happySnug * 0.018 - Math.abs(idleJiggle) * 0.12) * hop.scaleY,
        (1 + breathe * 0.07 + happySnug * 0.01) * hop.scaleZ,
      )
    }
    if (shadow.current) {
      const shadowScale = Math.max(0.58, hop.shadowScale)
      shadow.current.scale.set(0.55 * shadowScale, 0.06 * (1 + hop.land * 0.18 - hop.airborne * 0.2), 0.03 * shadowScale)
      shadow.current.position.y = -0.55 - hop.land * 0.012
      const material = shadow.current.material
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = Math.min(0.3, Math.max(0.08, hop.shadowOpacity))
      }
    }
  })

  return (
    <group ref={root} position={position} scale={scale} frustumCulled={false}>
      {mode === 'dressed' ? <HopMotionPolish activity={activity} animation={animation} /> : null}
      <group ref={body}>
        {mode === 'character' ? <RedCharacter activity={activity} animation={animation} /> : null}
        {mode === 'shell' ? <SeedShell empty /> : null}
        {mode === 'dressed' ? (
          <>
            <SeedShell fitted />
            <RedCharacter fitted activity={activity} animation={animation} />
            <ShellOpeningOcclusionLip />
            <HeadHibiscusPotAccessory activity={activity} />
          </>
        ) : null}
      </group>
      <mesh ref={shadow} position={[0, -0.55, -0.05]} scale={[0.55, 0.06, 0.03]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color="#7b68be" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  )
}
