export const MUSEUM_BOTANICAL_FAMILY_ANATOMY = {
  'bird-of-paradise': {
    silhouette: 'upright-banana-paddles',
    attachment: 'long-petioles-from-rhizome-crown',
    signature: 'orange-and-blue-bird-flower',
  },
  'black-olive': {
    silhouette: 'airy-layered-small-tree',
    attachment: 'fine-branches-with-paired-elliptic-leaves',
    signature: 'horizontal-branch-rhythm',
  },
  'kentia-palm': {
    silhouette: 'tall-arching-feather-crown',
    attachment: 'compound-fronds-from-cane-crown',
    signature: 'drooping-pinnate-fronds',
  },
  'umbrella-tree': {
    silhouette: 'tiered-radial-leaf-crowns',
    attachment: 'palmate-leaflets-from-single-nodes',
    signature: 'seven-leaf-umbrella-whorls',
  },
  'portrait-palm': {
    silhouette: 'dark-arching-feather-crown',
    attachment: 'compound-fronds-from-clustered-canes',
    signature: 'portrait-salon-plume',
  },
  'portrait-fern': {
    silhouette: 'low-arching-fern-crown',
    attachment: 'compound-fronds-from-buried-rosette',
    signature: 'deeply-lobed-frond-edges',
  },
  'heart-hoya': {
    silhouette: 'climbing-heart-leaf-vine',
    attachment: 'fleshy-paired-leaves-on-trellised-vines',
    signature: 'heart-leaves-and-star-flower-cluster',
  },
  'mineral-caladium': {
    silhouette: 'open-arrow-leaf-clump',
    attachment: 'long-petioles-from-buried-tuber-crown',
    signature: 'sagittate-leaves-with-bright-veins',
  },
  'northlight-fern': {
    silhouette: 'soft-horizontal-fern-fountain',
    attachment: 'compound-fronds-from-buried-rosette',
    signature: 'daylit-pinnate-frond-edges',
  },
  'field-grass': {
    silhouette: 'dense-upright-meadow-clump',
    attachment: 'many-blades-from-one-soil-crown',
    signature: 'fine-blades-and-seed-heads',
  },
  'river-still-life': {
    silhouette: 'low-riverside-branch-and-reed-study',
    attachment: 'reeds-and-willow-leaves-among-river-stones',
    signature: 'curved-branch-over-smooth-stones',
  },
  'winter-poinsettia': {
    silhouette: 'layered-radial-bract-rosette',
    attachment: 'red-bracts-over-green-leaf-collar',
    signature: 'gold-flower-centers',
  },
  'winter-pine': {
    silhouette: 'small-symmetrical-tiered-conifer',
    attachment: 'five-branch-whorls-around-single-trunk',
    signature: 'herringbone-needle-sprays',
  },
} as const

export type MuseumBotanicalFamily = keyof typeof MUSEUM_BOTANICAL_FAMILY_ANATOMY

export const MUSEUM_ROOM_BOTANICAL_DIRECTION = {
  atrium: ['bird-of-paradise', 'black-olive', 'kentia-palm', 'umbrella-tree'],
  'moba-one': ['portrait-palm', 'portrait-fern'],
  'moba-two': ['heart-hoya', 'mineral-caladium'],
  photography: ['northlight-fern', 'field-grass', 'river-still-life'],
  holiday: ['winter-poinsettia', 'winter-pine'],
} as const satisfies Record<string, readonly MuseumBotanicalFamily[]>

export const MUSEUM_BOTANICAL_QUALITY_GATES = {
  closedLeafGeometry: true,
  rootedStems: true,
  speciesSpecificSilhouette: true,
  finishedFromAllSides: true,
  centralWalkwayClear: true,
} as const
