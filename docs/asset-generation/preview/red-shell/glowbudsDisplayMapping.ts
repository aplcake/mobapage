import type {
  GlowbudTraitLoadout,
} from '../../code-examples/RedShellIdleCritterAsset.example'

export type GlowbudSourceAttribute = {
  trait_type: string
  value: string
}

export type GlowbudDisplayMatch = GlowbudSourceAttribute & {
  studioCategory: keyof GlowbudTraitLoadout
  studioTrait: string
}

export type GlowbudDisplayComposition = {
  traits: GlowbudTraitLoadout
  matches: GlowbudDisplayMatch[]
  unmatched: GlowbudSourceAttribute[]
}

type TraitMapping = {
  studioCategory: keyof GlowbudTraitLoadout
  studioTrait: string
  patch: Partial<GlowbudTraitLoadout>
}

export const DEFAULT_DISPLAY_TRAITS: GlowbudTraitLoadout = {
  shell: 'seed-shell',
  head: 'none',
  pot: 'blue-flower-pot',
  companion: 'none',
  held: 'none',
  face: 'soft',
  eyes: 'mellow',
  mouth: 'classic-smile',
  nose: 'none',
  skin: 'red',
  background: 'blue',
  flytrap: 'friendly-bite',
}

const mapping = (
  studioCategory: keyof GlowbudTraitLoadout,
  studioTrait: string,
  patch: Partial<GlowbudTraitLoadout>,
): TraitMapping => ({ studioCategory, studioTrait, patch })

const SOURCE_TRAIT_MAPPINGS: Record<string, TraitMapping> = {
  'Background::Blue': mapping('background', 'Blue', { background: 'blue' }),
  'Background::Yellow': mapping('background', 'Yellow', { background: 'yellow' }),
  'Background::Green': mapping('background', 'Green', { background: 'green' }),
  'Background::Purple': mapping('background', 'Purple', { background: 'purple' }),
  'Background::Red': mapping('background', 'Red', { background: 'red' }),

  'Shell::Seed': mapping('shell', 'Seed', { shell: 'seed-shell' }),
  'Shell::Smooth': mapping('shell', 'Smooth', { shell: 'smooth-shell' }),
  'Shell::Stoic': mapping('shell', 'Stoic', { shell: 'stoic-shell' }),
  'Shell::Soft': mapping('shell', 'Soft', { shell: 'soft-shell' }),
  'Shell::Rock': mapping('shell', 'Rock', { shell: 'rock-shell' }),
  'Shell::Log': mapping('shell', 'Log', { shell: 'log-shell' }),
  'Shell::Hoodie': mapping('shell', 'Hoodie', { shell: 'hoodie-shell' }),
  'Shell::Guard': mapping('shell', 'Guard', { shell: 'guard-shell' }),
  'Shell::Heavy Duty': mapping('shell', 'Heavy Duty', { shell: 'heavy-duty-shell' }),
  'Shell::Robot': mapping('shell', 'Robot', { shell: 'robot-shell' }),
  'Shell::Spikey': mapping('shell', 'Spikey', { shell: 'spikey-shell' }),
  'Shell::Shark': mapping('shell', 'Shark', { shell: 'shark-shell' }),
  'Shell::Horny': mapping('shell', 'Horny', { shell: 'horny-shell' }),
  'Shell::Raddish': mapping('shell', 'Raddish', { shell: 'raddish-shell' }),
  'Shell::Ancient': mapping('shell', 'Ancient', { shell: 'ancient-shell' }),
  'Shell::Mossy': mapping('shell', 'Mossy', { shell: 'moss-shell' }),
  'Shell::Racer': mapping('shell', 'Racer', { shell: 'aero-metal-shell' }),
  'Shell::Diamond': mapping('shell', 'Diamond', { shell: 'crystal-shell' }),
  'Shell::Gemstone': mapping('shell', 'Gemstone', { shell: 'gemstone-shell' }),
  'Shell::Ice': mapping('shell', 'Ice', { shell: 'ice-shell' }),
  'Shell::Gold': mapping('shell', 'Gold', { shell: 'gold-jewel-shell' }),
  'Shell::Amethyst': mapping('shell', 'Amethyst', { shell: 'amethyst-geode-shell' }),
  'Shell::Red Cloak': mapping('shell', 'Red Cloak', { shell: 'wizard-cloak' }),
  'Shell::Green Cloak': mapping('shell', 'Green Cloak', { shell: 'green-cloak' }),

  'Plant::Amami': mapping('head', 'Amami', { head: 'hibiscus' }),
  'Plant::Venus': mapping('head', 'Venus', {
    head: 'venus-flytrap',
    flytrap: 'friendly-bite',
  }),
  'Plant::Shroom': mapping('head', 'Shroom', { head: 'amanita-muscaria' }),
  'Plant::Sunflower': mapping('head', 'Sunflower', { head: 'sunflower' }),
  'Plant::Cactus': mapping('head', 'Cactus', { head: 'cactus' }),
  'Plant::Snake plant': mapping('head', 'Snake plant', { head: 'snake-plant' }),
  'Plant::Lotus': mapping('head', 'Lotus', { head: 'lotus' }),
  'Plant::Douglas': mapping('head', 'Douglas', { head: 'douglas' }),
  'Plant::Fern': mapping('head', 'Fern', { head: 'fern' }),
  'Plant::Myrtle': mapping('head', 'Myrtle', { head: 'myrtle' }),
  'Plant::lavender': mapping('head', 'lavender', { head: 'lavender' }),
  'Plant::Dandelion': mapping('head', 'Dandelion', { head: 'dandelion' }),
  'Plant::Sprout': mapping('head', 'Sprout', { head: 'sprout' }),
  'Plant::Bunch of Flowers': mapping('head', 'Bunch of Flowers', { head: 'bunch-of-flowers' }),
  'Plant::Roses': mapping('head', 'Roses', { head: 'roses' }),
  'Plant::Bonsai': mapping('head', 'Bonsai', { head: 'bonsai' }),
  'Plant::Bonsai sakura': mapping('head', 'Bonsai sakura', { head: 'bonsai-sakura' }),
  'Plant::Flower': mapping('head', 'Flower', { head: 'flower' }),
  'Plant::Two flowers': mapping('head', 'Two flowers', { head: 'two-flowers' }),
  'Plant::Palm tree': mapping('head', 'Palm tree', { head: 'palm-tree' }),

  'Pot::Avante Garden': mapping('pot', 'Avante Garden', { pot: 'blue-flower-pot' }),
  'Pot::Kitsch': mapping('pot', 'Kitsch', { pot: 'purple-cube-pot' }),
  'Pot::Crown': mapping('pot', 'Crown', { pot: 'gold-crown-pot' }),
  'Pot::Terracotta': mapping('pot', 'Terracotta', { pot: 'terracotta' }),

  'Companion::Canary Birb': mapping('companion', 'Canary Birb', { companion: 'canary-birb' }),
  'Companion::Cardinal Birb': mapping('companion', 'Cardinal Birb', { companion: 'cardinal-birb' }),
  'Companion::Snail': mapping('companion', 'Snail', { companion: 'cartoon-snail' }),
  'Companion::Toad': mapping('companion', 'Toad', { companion: 'toad' }),

  'Item::Axe': mapping('held', 'Axe', { held: 'axe' }),
  'Item::Sword': mapping('held', 'Sword', { held: 'sword' }),
  'Item::Peak': mapping('held', 'Peak', { held: 'peak' }),
  'Item::Staff': mapping('held', 'Staff', { held: 'wizard-staff' }),
  'Item::Fire': mapping('held', 'Fire', { held: 'fire' }),

  'Eyes::Mochi': mapping('eyes', 'Mochi', { eyes: 'dot' }),
  'Eyes::Enjoyer': mapping('eyes', 'Enjoyer', { eyes: 'enjoyer' }),
  'Eyes::Purp': mapping('eyes', 'Purp', { eyes: 'purp' }),
  'Eyes::Mellow': mapping('eyes', 'Mellow', { eyes: 'mellow' }),
  'Eyes::VR': mapping('eyes', 'VR', { eyes: 'vr' }),
  'Eyes::Eeeek': mapping('eyes', 'Eeeek', { eyes: 'eeeek' }),
  'Eyes::Suspicious': mapping('eyes', 'Suspicious', { eyes: 'suspicious' }),
  'Eyes::Blazeitup420': mapping('eyes', 'Blazeitup420', { eyes: 'blazeitup420' }),
  'Eyes::Whats that?': mapping('eyes', 'Whats that?', { eyes: 'whats-that' }),
  'Eyes::Mossing': mapping('eyes', 'Mossing', { eyes: 'mossing' }),
  'Eyes::Shades': mapping('eyes', 'Shades', { eyes: 'shades' }),
  'Eyes::Unibrow': mapping('eyes', 'Unibrow', { eyes: 'unibrow' }),

  'Mouth::Smile': mapping('mouth', 'Smile', { mouth: 'classic-smile' }),
  'Mouth::Oh?': mapping('mouth', 'Oh?', { mouth: 'surprised-o' }),
  'Mouth::Huh?': mapping('mouth', 'Huh?', { mouth: 'huh' }),
  'Mouth::Long face': mapping('mouth', 'Long face', { mouth: 'long-face' }),
  'Mouth::Wazzzzzzzzup': mapping('mouth', 'Wazzzzzzzzup', { mouth: 'wazzzzzzzzup' }),
  'Mouth::Normal guy': mapping('mouth', 'Normal guy', { mouth: 'normal-guy' }),
  'Mouth::Vampire': mapping('mouth', 'Vampire', { mouth: 'vampire' }),
  'Mouth::Sad': mapping('mouth', 'Sad', { mouth: 'sad' }),
  'Mouth::Blush': mapping('mouth', 'Blush', { mouth: 'blush' }),
  'Mouth::GRRRRRRR': mapping('mouth', 'GRRRRRRR', { mouth: 'grrrrrrrr' }),
  'Mouth::Ciggy': mapping('mouth', 'Ciggy', { mouth: 'ciggy' }),
  'Mouth::Woozy': mapping('mouth', 'Woozy', { mouth: 'woozy' }),
  'Mouth::OMG!': mapping('mouth', 'OMG!', { mouth: 'omg' }),

  'Nose::Clown Nose': mapping('nose', 'Clown Nose', { nose: 'clown-nose' }),

  'Type::Red': mapping('skin', 'Red', { skin: 'red' }),
  'Type::OG': mapping('skin', 'OG', { skin: 'glow-lime' }),
  'Type::Pink': mapping('skin', 'Pink', { skin: 'pixel-pink' }),
  'Type::Robot': mapping('skin', 'Robot', { skin: 'stone-gray' }),
  'Type::Gold': mapping('skin', 'Gold', { skin: 'gold' }),
  'Type::Zombie': mapping('skin', 'Zombie', { skin: 'zombie' }),
  'Type::Ape': mapping('skin', 'Ape', { skin: 'ape' }),
  'Type::Alien': mapping('skin', 'Alien', { skin: 'alien' }),
}

const ATTRIBUTE_ORDER = [
  'Background',
  'Shell',
  'Plant',
  'Pot',
  'Companion',
  'Item',
  'Eyes',
  'Mouth',
  'Nose',
  'Type',
]

function mappingKey(attribute: GlowbudSourceAttribute) {
  return `${attribute.trait_type}::${attribute.value}`
}

export function composeGlowbudDisplayTraits(
  attributes: GlowbudSourceAttribute[],
): GlowbudDisplayComposition {
  const traits: GlowbudTraitLoadout = { ...DEFAULT_DISPLAY_TRAITS }
  const matches: GlowbudDisplayMatch[] = []
  const unmatched: GlowbudSourceAttribute[] = []
  const ordered = [...attributes].sort(
    (left, right) => ATTRIBUTE_ORDER.indexOf(left.trait_type) - ATTRIBUTE_ORDER.indexOf(right.trait_type),
  )

  for (const attribute of ordered) {
    const traitMapping = SOURCE_TRAIT_MAPPINGS[mappingKey(attribute)]
    if (!traitMapping) {
      unmatched.push(attribute)
      continue
    }
    Object.assign(traits, traitMapping.patch)
    matches.push({
      ...attribute,
      studioCategory: traitMapping.studioCategory,
      studioTrait: traitMapping.studioTrait,
    })
  }

  return { traits, matches, unmatched }
}

export function hasGlowbudDisplayMapping(attribute: GlowbudSourceAttribute) {
  return Boolean(SOURCE_TRAIT_MAPPINGS[mappingKey(attribute)])
}
