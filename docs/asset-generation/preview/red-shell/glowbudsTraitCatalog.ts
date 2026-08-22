import type {
  GlowbudBackgroundTrait,
  GlowbudCompanionTrait,
  GlowbudEyeTrait,
  GlowbudFaceTrait,
  GlowbudFlytrapVariant,
  GlowbudHeadTrait,
  GlowbudHeldTrait,
  GlowbudMouthTrait,
  GlowbudNoseTrait,
  GlowbudPotTrait,
  GlowbudShellTrait,
  GlowbudSkinTrait,
  GlowbudTraitLoadout,
} from '../../code-examples/RedShellIdleCritterAsset.example'
import rawBackgroundPalette from './glowbudsBackgroundPalette.json'

export type GlowbudTraitCategory = keyof GlowbudTraitLoadout

export type GlowbudTraitOption<TValue extends string = string> = {
  value: TValue
  label: string
  sublabel: string
  swatch?: string
}

export const GLOWBUD_BACKGROUND_COLORS = rawBackgroundPalette as Record<GlowbudBackgroundTrait, string>

export const GLOWBUD_TRAIT_OPTIONS: {
  background: GlowbudTraitOption<GlowbudBackgroundTrait>[]
  shell: GlowbudTraitOption<GlowbudShellTrait>[]
  head: GlowbudTraitOption<GlowbudHeadTrait>[]
  pot: GlowbudTraitOption<GlowbudPotTrait>[]
  companion: GlowbudTraitOption<GlowbudCompanionTrait>[]
  held: GlowbudTraitOption<GlowbudHeldTrait>[]
  face: GlowbudTraitOption<GlowbudFaceTrait>[]
  eyes: GlowbudTraitOption<GlowbudEyeTrait>[]
  mouth: GlowbudTraitOption<GlowbudMouthTrait>[]
  nose: GlowbudTraitOption<GlowbudNoseTrait>[]
  skin: GlowbudTraitOption<GlowbudSkinTrait>[]
  flytrap: GlowbudTraitOption<GlowbudFlytrapVariant>[]
} = {
  background: [
    { value: 'blue', label: 'Blue', sublabel: 'Source periwinkle', swatch: GLOWBUD_BACKGROUND_COLORS.blue },
    { value: 'yellow', label: 'Yellow', sublabel: 'Source warm parchment', swatch: GLOWBUD_BACKGROUND_COLORS.yellow },
    { value: 'green', label: 'Green', sublabel: 'Source soft leaf', swatch: GLOWBUD_BACKGROUND_COLORS.green },
    { value: 'purple', label: 'Purple', sublabel: 'Source lavender', swatch: GLOWBUD_BACKGROUND_COLORS.purple },
    { value: 'red', label: 'Red', sublabel: 'Source dusty rose', swatch: GLOWBUD_BACKGROUND_COLORS.red },
  ],
  shell: [
    { value: 'naked', label: 'Naked', sublabel: 'Soft shell-free Glowbud body' },
    { value: 'seed-shell', label: 'Seed', sublabel: 'Plump shell body' },
    { value: 'smooth-shell', label: 'Smooth', sublabel: 'Satin chestnut seed finish' },
    { value: 'stoic-shell', label: 'Stoic', sublabel: 'Honed graphite seed finish' },
    { value: 'soft-shell', label: 'Soft', sublabel: 'Dense layered shag coat' },
    { value: 'rock-shell', label: 'Rock', sublabel: 'Craggy mineral strata boulder' },
    { value: 'log-shell', label: 'Log', sublabel: 'Hollow bark stump and growth rings' },
    { value: 'hoodie-shell', label: 'Hoodie', sublabel: 'Loose fleece pullover and lined hood' },
    { value: 'guard-shell', label: 'Guard', sublabel: 'Forged Roman helmet and red horsehair crest' },
    { value: 'heavy-duty-shell', label: 'Heavy Duty', sublabel: 'Rugged olive tank armor hull' },
    { value: 'robot-shell', label: 'Robot', sublabel: 'Rounded mech suit with V antenna' },
    { value: 'spikey-shell', label: 'Spikey', sublabel: 'Craggy indigo shell and multicolour spikes' },
    { value: 'shark-shell', label: 'Shark', sublabel: 'Whole shark mascot with open jaws' },
    { value: 'horny-shell', label: 'Horny', sublabel: 'Leathery devil shell and swept ivory horns' },
    { value: 'raddish-shell', label: 'Raddish', sublabel: 'Raspberry root bulb and leafy crown' },
    { value: 'ancient-shell', label: 'Ancient', sublabel: 'Root-bound weathered temple ruin' },
    { value: 'moss-shell', label: 'Mossy', sublabel: 'Ancient moss-covered body' },
    { value: 'aero-metal-shell', label: 'Racer', sublabel: 'Purple racing fins' },
    { value: 'crystal-shell', label: 'Diamond', sublabel: 'Precision-cut brilliant shell' },
    { value: 'gemstone-shell', label: 'Gemstone', sublabel: 'Polished translucent purple jewel' },
    { value: 'ice-shell', label: 'Ice', sublabel: 'Cloudy melting ice block' },
    { value: 'gold-jewel-shell', label: 'Gold', sublabel: 'Pirate gold and gems' },
    { value: 'amethyst-geode-shell', label: 'Amethyst', sublabel: 'Purple cracked geode body' },
    { value: 'wizard-cloak', label: 'Red Cloak', sublabel: 'Tailored charcoal cloak with red trim' },
    { value: 'green-cloak', label: 'Green Cloak', sublabel: 'Tailored charcoal cloak with green trim' },
  ],
  head: [
    { value: 'none', label: 'Bare Head', sublabel: 'No top accessory' },
    { value: 'hibiscus', label: 'Amami', sublabel: 'Toony flower cluster' },
    { value: 'venus-flytrap', label: 'Venus', sublabel: 'Snapping plant cluster' },
    { value: 'amanita-muscaria', label: 'Shroom', sublabel: 'Cute painted mushrooms' },
    { value: 'sunflower', label: 'Sunflower', sublabel: 'Tall golden bloom' },
    { value: 'cactus', label: 'Cactus', sublabel: 'Tall asymmetric desert bloom' },
    { value: 'snake-plant', label: 'Snake plant', sublabel: 'Tall variegated sword-leaf clump' },
    { value: 'lotus', label: 'Lotus', sublabel: 'Open pink bloom and lotus pads' },
    { value: 'douglas', label: 'Douglas', sublabel: 'Tiered puffy evergreen tree' },
    { value: 'fern', label: 'Fern', sublabel: 'Arching compound frond fountain' },
    { value: 'myrtle', label: 'Myrtle', sublabel: 'Glossy flowering topiary tree' },
    { value: 'lavender', label: 'Lavender', sublabel: 'Silvery aromatic purple flower spikes' },
    { value: 'dandelion', label: 'Dandelion', sublabel: 'Puffy white seed clock and leaf rosette' },
    { value: 'sprout', label: 'Sprout', sublabel: 'Fresh seedling with puffy unfolding leaves' },
    { value: 'bunch-of-flowers', label: 'Bunch of Flowers', sublabel: 'Mixed blue violet and golden bouquet' },
    { value: 'roses', label: 'Roses', sublabel: 'Four layered magenta rose blooms' },
    { value: 'bonsai', label: 'Bonsai', sublabel: 'Ancient sculpted evergreen tree' },
    { value: 'bonsai-sakura', label: 'Bonsai Sakura', sublabel: 'Broad pink cherry blossom tree' },
    { value: 'flower', label: 'Flower', sublabel: 'Puffy blue five-petal garden bloom' },
    { value: 'two-flowers', label: 'Two Flowers', sublabel: 'Tall red and lower purple garden pair' },
    { value: 'palm-tree', label: 'Palm Tree', sublabel: 'Curved segmented trunk and drooping frond crown' },
  ],
  pot: [
    { value: 'blue-flower-pot', label: 'Avante Garden', sublabel: 'Rounded soil pot' },
    { value: 'purple-cube-pot', label: 'Kitsch', sublabel: 'Striped ceramic cube planter' },
    { value: 'gold-crown-pot', label: 'Crown', sublabel: 'Shiny jeweled crown planter' },
    { value: 'terracotta', label: 'Terracotta', sublabel: 'Chunky brick-red clay planter' },
  ],
  companion: [
    { value: 'none', label: 'No Companion', sublabel: 'Stage stays clear' },
    { value: 'cartoon-snail', label: 'Snail', sublabel: 'Tiny floor buddy' },
    { value: 'canary-birb', label: 'Canary Birb', sublabel: 'Tiny golden ground bird' },
    { value: 'cardinal-birb', label: 'Cardinal Birb', sublabel: 'Bright red ground bird' },
    { value: 'toad', label: 'Toad', sublabel: 'Squat green floor buddy' },
  ],
  held: [
    { value: 'none', label: 'Empty Hands', sublabel: 'Round side hands' },
    { value: 'wizard-staff', label: 'Staff', sublabel: 'Wood hook staff' },
    { value: 'axe', label: 'Axe', sublabel: 'Chunky steel woodcutter' },
    { value: 'sword', label: 'Sword', sublabel: 'Compact toon blade' },
    { value: 'peak', label: 'Peak', sublabel: 'Source-named silver pickaxe' },
    { value: 'fire', label: 'Fire', sublabel: 'Opaque hand torch' },
  ],
  face: [
    { value: 'soft', label: 'Soft Face', sublabel: 'Open cute read' },
  ],
  eyes: [
    { value: 'unibrow', label: 'Unibrow', sublabel: 'Bold continuous grouchy brow' },
    { value: 'mellow', label: 'Mellow', sublabel: 'Chilled half-open' },
    { value: 'dot', label: 'Mochi', sublabel: 'Tiny black bead eyes' },
    { value: 'enjoyer', label: 'Enjoyer', sublabel: 'Slim vertical eyes' },
    { value: 'purp', label: 'Purp', sublabel: 'Focused violet eyes and swept liner' },
    { value: 'vr', label: 'VR', sublabel: 'Neon scanline visor' },
    { value: 'eeeek', label: 'Eeeek', sublabel: 'Tall startled eye slits' },
    { value: 'suspicious', label: 'Suspicious', sublabel: 'Narrow questioning stare' },
    { value: 'blazeitup420', label: 'Blazeitup420', sublabel: 'Heavy rosy half-lids' },
    { value: 'whats-that', label: 'Whats That?', sublabel: 'Curious inward glance' },
    { value: 'mossing', label: 'Mossing', sublabel: 'Moss-shadowed eyes' },
    { value: 'shades', label: 'Shades', sublabel: 'Rounded black sunglasses' },
    { value: 'open', label: 'Open Eyes', sublabel: 'Wide awake' },
  ],
  mouth: [
    { value: 'classic-smile', label: 'Smile', sublabel: 'Simple relaxed grin' },
    { value: 'surprised-o', label: 'Oh?', sublabel: 'Small off-center o mouth' },
    { value: 'huh', label: 'Huh?', sublabel: 'Tiny round puzzled o mouth' },
    { value: 'long-face', label: 'Long Face', sublabel: 'Broad rounded mouth line' },
    { value: 'wazzzzzzzzup', label: 'Wazzzzzzzzup', sublabel: 'Big goofy sculpted tongue-out grin' },
    { value: 'normal-guy', label: 'Normal Guy', sublabel: 'Small neutral curved mouth' },
    { value: 'vampire', label: 'Vampire', sublabel: 'Cute recessed twin fangs' },
    { value: 'sad', label: 'Sad', sublabel: 'Soft downturned mouth' },
    { value: 'blush', label: 'Blush', sublabel: 'Tiny mouth and rosy cheeks' },
    { value: 'grrrrrrrr', label: 'GRRRRRRR', sublabel: 'Rounded gritted teeth' },
    { value: 'ciggy', label: 'Ciggy', sublabel: 'Lit 3D ciggy and curling smoke' },
    { value: 'woozy', label: 'Woozy', sublabel: 'Soft wavy mouth' },
    { value: 'omg', label: 'OMG!', sublabel: 'Big shocked O mouth' },
    { value: 'open', label: 'Open Mouth', sublabel: 'Wide friendly mouth' },
  ],
  nose: [
    { value: 'none', label: 'No Nose', sublabel: 'Face stays clear' },
    { value: 'clown-nose', label: 'Clown Nose', sublabel: 'Round glossy red nose' },
  ],
  skin: [
    { value: 'red', label: 'Red', sublabel: 'Classic warm red', swatch: '#f13224' },
    { value: 'glow-lime', label: 'OG', sublabel: 'Bright green reference', swatch: '#caff22' },
    { value: 'pixel-pink', label: 'Pink', sublabel: 'Soft pink reference', swatch: '#f6b4cd' },
    { value: 'stone-gray', label: 'Robot', sublabel: 'Soft pixel gray', swatch: '#9fa6a3' },
    { value: 'gold', label: 'Gold', sublabel: 'Warm satin gold', swatch: '#ffd326' },
    { value: 'zombie', label: 'Zombie', sublabel: 'Mottled undead olive', swatch: '#91a875' },
    { value: 'ape', label: 'Ape', sublabel: 'Soft tonal brown', swatch: '#875d3e' },
    { value: 'alien', label: 'Alien', sublabel: 'Cool pearly cyan', swatch: '#b7f4f0' },
  ],
  flytrap: [
    { value: 'friendly-bite', label: 'Friendly Bite', sublabel: 'Rounded cute heads' },
    { value: 'wide-crown', label: 'Wide Crown', sublabel: 'Big readable center head' },
  ],
}

export const GLOWBUD_PLAYER_CATEGORIES = [
  'background',
  'shell',
  'head',
  'pot',
  'companion',
  'held',
  'eyes',
  'mouth',
  'nose',
  'skin',
] as const

export type GlowbudPlayerCategory = (typeof GLOWBUD_PLAYER_CATEGORIES)[number]

export const GLOWBUD_CATEGORY_LABELS: Record<GlowbudPlayerCategory | 'flytrap', string> = {
  background: 'Room',
  shell: 'Shell',
  head: 'Plant',
  pot: 'Pot',
  companion: 'Buddy',
  held: 'Item',
  eyes: 'Eyes',
  mouth: 'Mouth',
  nose: 'Nose',
  skin: 'Type',
  flytrap: 'Venus Style',
}

export const GLOWBUD_TRAIT_QUERY_KEYS = [
  ...GLOWBUD_PLAYER_CATEGORIES,
  'face',
  'flytrap',
] as const

export function glowbudTraitOptions(category: GlowbudTraitCategory) {
  return GLOWBUD_TRAIT_OPTIONS[category] as GlowbudTraitOption[]
}

export function isGlowbudTraitValue(category: GlowbudTraitCategory, value: string) {
  return glowbudTraitOptions(category).some((option) => option.value === value)
}

export function glowbudTraitLabel(category: GlowbudTraitCategory, value: string) {
  return glowbudTraitOptions(category).find((option) => option.value === value)?.label ?? value
}

export function readGlowbudCustomTraits(search: string, fallback: GlowbudTraitLoadout) {
  const params = new URLSearchParams(search)
  const traits = { ...fallback }
  const mutableTraits = traits as unknown as Record<string, string>

  for (const category of GLOWBUD_TRAIT_QUERY_KEYS) {
    const value = params.get(category)
    if (value && isGlowbudTraitValue(category, value)) mutableTraits[category] = value
  }

  return traits
}

export function writeGlowbudCustomTraits(params: URLSearchParams, traits: GlowbudTraitLoadout) {
  for (const category of GLOWBUD_TRAIT_QUERY_KEYS) {
    const value = traits[category]
    if (value) params.set(category, value)
    else params.delete(category)
  }
}

export function createNakedGlowbudBaseline(base: GlowbudTraitLoadout): GlowbudTraitLoadout {
  return {
    ...base,
    shell: 'naked',
    head: 'none',
    companion: 'none',
    held: 'none',
    face: 'soft',
    eyes: 'open',
    mouth: 'normal-guy',
    nose: 'none',
  }
}

export function randomGlowbudTraits(
  base: GlowbudTraitLoadout,
  random: () => number = Math.random,
) {
  const next = { ...base }
  const mutableTraits = next as unknown as Record<string, string>
  for (const category of GLOWBUD_PLAYER_CATEGORIES) {
    const options = glowbudTraitOptions(category)
    const option = options[Math.min(options.length - 1, Math.floor(random() * options.length))]
    mutableTraits[category] = option.value
  }
  next.face = 'soft'
  next.flytrap = random() > 0.72 ? 'wide-crown' : 'friendly-bite'
  return next
}
