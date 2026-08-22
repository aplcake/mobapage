import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  GLOWBUDS_TRAIT_CATEGORY_TOTALS,
  GLOWBUDS_TRAIT_TRACKER_ROWS,
} from '../docs/asset-generation/preview/red-shell/glowbudsTraitTracker'
import {
  GLOWBUDS_QUALITY_GATES,
  getGlowbudsOneToOneConflicts,
  getGlowbudsProductionQueue,
  getGlowbudsTraitKey,
  getGlowbudsTraitReferences,
} from '../docs/asset-generation/preview/red-shell/glowbudsTraitProduction'

function readStudioSource() {
  return [
    readFileSync(
      new URL('../docs/asset-generation/preview/red-shell/main.tsx', import.meta.url),
      'utf8',
    ),
    readFileSync(
      new URL('../docs/asset-generation/preview/red-shell/glowbudsTraitCatalog.ts', import.meta.url),
      'utf8',
    ),
  ].join('\n')
}

describe('Glowbuds trait production data', () => {
  it('accounts for every source value exactly once', () => {
    const expectedTotal = GLOWBUDS_TRAIT_CATEGORY_TOTALS.reduce(
      (total, category) => total + category.expectedValues,
      0,
    )
    const keys = GLOWBUDS_TRAIT_TRACKER_ROWS.map((row) =>
      getGlowbudsTraitKey(row.sourceCategory, row.sourceTrait),
    )

    expect(GLOWBUDS_TRAIT_TRACKER_ROWS).toHaveLength(expectedTotal)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('keeps studio traits assigned one-to-one', () => {
    expect(getGlowbudsOneToOneConflicts(GLOWBUDS_TRAIT_TRACKER_ROWS)).toEqual([])
  })

  it('keeps completed and likely matches attached to a studio trait', () => {
    const invalid = GLOWBUDS_TRAIT_TRACKER_ROWS.filter(
      (row) =>
        (row.status === 'complete' || row.status === 'likely-match')
        && (!row.studioCategory || !row.studioTrait),
    )

    expect(invalid).toEqual([])
  })

  it('keeps the completed mouth batch source-faithful and one-to-one', () => {
    const expectedMouths = ['Huh?', 'Long face', 'Wazzzzzzzzup', 'Normal guy']
    const mouthRows = GLOWBUDS_TRAIT_TRACKER_ROWS.filter(
      (row) => row.sourceCategory === 'Mouth' && expectedMouths.includes(row.sourceTrait),
    )

    expect(mouthRows).toHaveLength(expectedMouths.length)
    expect(mouthRows.map((row) => row.status)).toEqual(
      expectedMouths.map(() => 'complete'),
    )
    expect(new Set(mouthRows.map((row) => row.studioTrait)).size).toBe(expectedMouths.length)
  })

  it('keeps Wazzzzzzzzup as one rooted dimensional tongue-out expression', () => {
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(avatarSource).toContain('function createWazzzupMouthCavityGeometry()')
    expect(avatarSource).toContain('function createWazzzupTongueGeometry(fitted: boolean)')
    expect(avatarSource).toContain("new THREE.CatmullRomCurve3(")
    expect(avatarSource).toContain("geometry.setAttribute('color'")
    expect(avatarSource).toContain('const groove = centerRidge')
    expect(avatarSource).toContain('<group ref={tongueMotion}>')
    expect(avatarSource).not.toContain('const tongueScale: [number, number, number]')
    expect(studioSource).toContain(
      "{ value: 'wazzzzzzzzup', label: 'Wazzzzzzzzup', sublabel: 'Big goofy sculpted tongue-out grin' }",
    )
  })

  it('keeps the completed Type batch source-faithful and one-to-one', () => {
    const expectedTypes = ['Gold', 'Zombie', 'Ape', 'Alien']
    const typeRows = GLOWBUDS_TRAIT_TRACKER_ROWS.filter(
      (row) => row.sourceCategory === 'Type' && expectedTypes.includes(row.sourceTrait),
    )

    expect(typeRows).toHaveLength(expectedTypes.length)
    expect(typeRows.map((row) => row.status)).toEqual(
      expectedTypes.map(() => 'complete'),
    )
    expect(typeRows.map((row) => row.studioCategory)).toEqual(
      expectedTypes.map(() => 'skin'),
    )
    expect(new Set(typeRows.map((row) => row.studioTrait)).size).toBe(expectedTypes.length)
    expect(typeRows.map((row) => row.studioTrait).sort()).toEqual(expectedTypes.sort())
  })

  it('keeps Ape rebuilt as a depth-safe reactive short-fur skin', () => {
    const ape = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Type' && row.sourceTrait === 'Ape',
    )
    const references = getGlowbudsTraitReferences('Type', 'Ape')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const apeSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/skin/ApeSkin.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(ape).toMatchObject({
      studioCategory: 'skin',
      studioTrait: 'Ape',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([1348, 1536, 193])
    expect(avatarSource).toContain("from './glowbud-traits/skin/ApeSkin'")
    expect(avatarSource).toContain('<ApeFaceTreatment fitted={fitted}')
    expect(avatarSource).toContain('<ApeFaceTreatment wizard')
    expect(avatarSource.match(/<ApeHandTreatment/g)).toHaveLength(2)
    expect(apeSource).toContain('const FACE_FIBER_COUNT = 2300')
    expect(apeSource).toContain('const HAND_FIBER_COUNT = 720')
    expect(apeSource).toContain('MeshSurfaceSampler')
    expect(apeSource).toContain('feature-reserved-bare-face-mask')
    expect(apeSource).toContain('createApeBareFaceGeometry')
    expect(apeSource).toContain('sculpted-m-shaped-primate-face')
    expect(apeSource).toContain('const rings = 8')
    expect(apeSource).toContain('muzzle * 0.06')
    expect(apeSource).toContain('narrow-bare-primate-palm')
    expect(avatarSource).toContain("const speciesEyeSpacing = skinPalette.finish === 'ape' ? 0.9 : 1")
    expect(avatarSource).toContain("const anatomicalFeatureLift = skinPalette.finish === 'ape' ? -0.035 : 0")
    expect(apeSource).not.toContain('primate-nose')
    expect(apeSource).not.toContain('brow-ridge')
    expect(apeSource).not.toContain('nostril')
    expect(apeSource).not.toMatch(/\b(?:eyeTrait|mouthTrait|noseTrait)\b/)
    expect(apeSource).toContain('depthWrite: true')
    expect(apeSource).toContain('transparent: false')
  })

  it('keeps Alien rebuilt as opaque dimensional xenobiology', () => {
    const alien = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Type' && row.sourceTrait === 'Alien',
    )
    const references = getGlowbudsTraitReferences('Type', 'Alien')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const alienSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/skin/AlienSkin.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(alien).toMatchObject({
      studioCategory: 'skin',
      studioTrait: 'Alien',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([2206, 3065, 1117])
    expect(avatarSource).toContain("from './glowbud-traits/skin/AlienSkin'")
    expect(avatarSource).toContain('<AlienFaceTreatment fitted={fitted}')
    expect(avatarSource).toContain('<AlienFaceTreatment wizard')
    expect(avatarSource.match(/<AlienHandTreatment/g)).toHaveLength(2)
    expect(alienSource).toContain('face-conforming-cranial-ridges')
    expect(alienSource).toContain('pulsing-sensory-constellation')
    expect(alienSource).toContain('feature-safe-breathing-gill-slits')
    expect(alienSource).not.toContain('nostril')
    expect(alienSource).not.toMatch(/\b(?:eyeTrait|mouthTrait|noseTrait)\b/)
    expect(alienSource).toContain('three-node-bioluminescent-palm-array')
    expect(alienSource).not.toContain('transparent')
  })

  it('keeps Zombie rebuilt as an opaque dimensional garden-undead skin', () => {
    const zombie = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Type' && row.sourceTrait === 'Zombie',
    )
    const references = getGlowbudsTraitReferences('Type', 'Zombie')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const zombieSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/skin/ZombieSkin.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(zombie).toMatchObject({
      studioCategory: 'skin',
      studioTrait: 'Zombie',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([757, 170, 2220])
    expect(avatarSource).toContain("from './glowbud-traits/skin/ZombieSkin'")
    expect(avatarSource).toContain('<ZombieFaceTreatment fitted={fitted}')
    expect(avatarSource).toContain('<ZombieFaceTreatment wizard')
    expect(avatarSource.match(/<ZombieHandTreatment/g)).toHaveLength(2)
    expect(zombieSource).toContain('feature-reserved-garden-undead-treatment')
    expect(zombieSource).toContain('embedded-root-brain-cradle')
    expect(zombieSource).toContain('softly-pulsing-exposed-root-brain')
    expect(zombieSource).toContain('deeply-seated-suture-repair')
    expect(zombieSource).toContain('embedded-lichen-and-bruise-field')
    expect(zombieSource).toContain('stitched-hand-repair')
    expect(zombieSource).not.toContain('EyeHollows')
    expect(zombieSource).not.toContain('eye-hollow')
    expect(zombieSource).not.toContain('sunken-eye')
    expect(zombieSource).not.toMatch(/\b(?:eyeTrait|mouthTrait|noseTrait)\b/)
    expect(zombieSource).not.toContain('transparent')
  })

  it('keeps the completed Item batch source-faithful and one-to-one', () => {
    const expectedItems = ['Axe', 'Sword', 'Peak', 'Fire']
    const itemRows = GLOWBUDS_TRAIT_TRACKER_ROWS.filter(
      (row) => row.sourceCategory === 'Item' && expectedItems.includes(row.sourceTrait),
    )

    expect(itemRows).toHaveLength(expectedItems.length)
    expect(itemRows.map((row) => row.status)).toEqual(
      expectedItems.map(() => 'complete'),
    )
    expect(itemRows.map((row) => row.studioCategory)).toEqual(
      expectedItems.map(() => 'held'),
    )
    expect(new Set(itemRows.map((row) => row.studioTrait)).size).toBe(expectedItems.length)
    expect(itemRows.map((row) => row.studioTrait).sort()).toEqual(expectedItems.sort())
  })

  it('keeps held items beside one authored hand without corrective skin grip geometry', () => {
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const handSource = avatarSource.slice(
      avatarSource.indexOf('function WizardHand('),
      avatarSource.indexOf('function WizardHands('),
    )

    expect(handSource).not.toContain('handOffset - 0.105')
    expect(handSource.match(/material=\{toon\(skinPalette\.base\)\}/g)).toHaveLength(1)
  })

  it('keeps Amanita spots painted and Diamond and Ice opaque and depth-safe', () => {
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const amanitaSource = avatarSource.slice(
      avatarSource.indexOf('type GlowbudAmanitaTopSpot'),
      avatarSource.indexOf('function AmanitaGillFan('),
    )
    const diamondSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/DiamondShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const iceSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/IceShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(amanitaSource).toContain('uniform vec3 uInk;')
    expect(amanitaSource).toContain('uSpotCount: { value: Math.min(pattern.length')
    expect(amanitaSource).not.toContain('AmanitaCapSpotTiles')
    expect(amanitaSource).not.toContain('uSpotCount: { value: 0 }')
    expect(diamondSource).toContain('diamond-shell-brilliant-cut-hull')
    expect(diamondSource).toContain('diamond-shell-controlled-sparkle-field')
    expect(diamondSource).not.toContain('transparent')
    expect(diamondSource).not.toContain('depthWrite={false}')
    expect(iceSource).toContain('ice-shell-clouded-rounded-block-body')
    expect(iceSource).toContain('ice-shell-depth-tested-crack-network')
    expect(iceSource).toContain('gl_FragColor = vec4(color * toonLight, 1.0);')
    expect(iceSource).not.toContain('transparent')
    expect(iceSource).not.toContain('depthWrite={false}')
  })

  it('keeps Venus teeth volumetric, embedded, and free of corrective cover sheets', () => {
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const toothSource = avatarSource.slice(
      avatarSource.indexOf('function createFlytrapBuckToothGeometry()'),
      avatarSource.indexOf('function FlytrapInsetMouth('),
    )

    expect(toothSource).toContain('new THREE.ExtrudeGeometry')
    expect(toothSource).toContain('geometry.translate(0, 0, -depth / 2)')
    expect(toothSource).toContain('<CodedAssetOutlineMesh')
    expect(toothSource).not.toContain('new THREE.ShapeGeometry')
    expect(toothSource).not.toContain('transparent')
    expect(toothSource).not.toContain('depthWrite={false}')
    expect(toothSource).not.toContain('capScale')
  })

  it('keeps the Venus mouth as one fleshy rim around an opaque recessed cavity', () => {
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const mouthGeometrySource = avatarSource.slice(
      avatarSource.indexOf('type FlytrapMouthLoopPoint'),
      avatarSource.indexOf('function createFlytrapBuckToothGeometry()'),
    )
    const mouthComponentSource = avatarSource.slice(
      avatarSource.indexOf('function FlytrapInsetMouth('),
      avatarSource.indexOf('function createFlytrapRosetteLeafGeometry()'),
    )

    expect(mouthGeometrySource).toContain('createFlytrapIntegratedMouthRimGeometry')
    expect(mouthGeometrySource).toContain('createFlytrapMouthCavityGeometry')
    expect(mouthGeometrySource).toContain("{ scaleX: 0.16, scaleY: 0.115")
    expect(mouthGeometrySource).not.toContain('createFlytrapLipContactGasketGeometry')
    expect(mouthGeometrySource).not.toContain('createFlytrapClamshellLipLoopGeometry')
    expect(mouthComponentSource).toContain('rimGeometry')
    expect(mouthComponentSource).toContain('cavityGeometry')
    expect(mouthComponentSource).not.toContain('transparent')
    expect(mouthComponentSource).not.toContain('depthWrite={false}')
  })

  it('keeps the deleted collection-shell baseline out of the studio', () => {
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    expect(avatarSource).not.toContain('CollectionShell')
    expect(studioSource).not.toContain('COLLECTION_SHELL')
  })

  it('keeps Smooth and Stoic exact, query-loadable, and built from the shared Seed silhouette', () => {
    const smooth = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Smooth',
    )
    const stoic = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Stoic',
    )
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const finishSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/SeedFinishShells.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(smooth).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Smooth',
      status: 'complete',
      confidence: 'high',
    })
    expect(stoic).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Stoic',
      status: 'complete',
      confidence: 'high',
    })
    expect(getGlowbudsTraitReferences('Shell', 'Smooth').map((reference) => reference.tokenId)).toEqual(
      [1800, 2274, 2791],
    )
    expect(getGlowbudsTraitReferences('Shell', 'Stoic').map((reference) => reference.tokenId)).toEqual(
      [1017, 341, 748],
    )
    expect(avatarSource).toContain("| 'smooth-shell'")
    expect(avatarSource).toContain("| 'stoic-shell'")
    expect(avatarSource).toContain('<SeedFinishShell fitted variant="smooth" />')
    expect(avatarSource).toContain('<SeedFinishShell fitted variant="stoic" />')
    expect(finishSource).toContain('seed-family-shared-silhouette-painted-vertex-finish')
    expect(finishSource).toContain('seed-family-smooth-satin-glaze')
    expect(finishSource).toContain('seed-family-stoic-honed-mineral-banding')
    expect(finishSource).toContain('seed-family-continuous-opening-cowl')
    expect(finishSource).not.toContain('transparent')
    expect(finishSource).not.toContain('depthWrite={false}')
    expect(studioSource).toContain(
      "{ value: 'smooth-shell', label: 'Smooth', sublabel: 'Satin chestnut seed finish' }",
    )
    expect(studioSource).toContain(
      "{ value: 'stoic-shell', label: 'Stoic', sublabel: 'Honed graphite seed finish' }",
    )
    expect(studioSource).toContain("nextTraits.shell = 'smooth-shell'")
    expect(studioSource).toContain("nextTraits.shell = 'stoic-shell'")
  })

  it('keeps Red Cloak and Green Cloak exact, query-loadable, and geometry-identical', () => {
    const red = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Red Cloak',
    )
    const green = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Green Cloak',
    )
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const cloakSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/CloakShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    const mappingSource = readFileSync(
      new URL('../docs/asset-generation/preview/red-shell/glowbudsDisplayMapping.ts', import.meta.url),
      'utf8',
    )

    expect(red).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Red Cloak',
      status: 'partial',
      confidence: 'high',
    })
    expect(green).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Green Cloak',
      status: 'partial',
      confidence: 'high',
    })
    expect(getGlowbudsTraitReferences('Shell', 'Red Cloak').map((reference) => reference.tokenId)).toEqual(
      [1279, 344, 3136],
    )
    expect(getGlowbudsTraitReferences('Shell', 'Green Cloak').map((reference) => reference.tokenId)).toEqual(
      [126, 3156, 2742],
    )
    expect(avatarSource).toContain("| 'green-cloak'")
    expect(avatarSource).toContain("loadout.shell === 'green-cloak'")
    expect(cloakSource).toContain("export type CloakShellVariant = 'red' | 'green'")
    expect(cloakSource).toContain('cloak-shell-one-piece-draped-fabric-body')
    expect(cloakSource).toContain('cloak-shell-deep-opaque-opening-wall')
    expect(cloakSource).toContain('cloak-shell-${variant}-single-unbroken-face-roll')
    expect(cloakSource).toContain('cloak-shell-${variant}-continuous-lower-trim')
    expect(studioSource).toContain(
      "{ value: 'wizard-cloak', label: 'Red Cloak', sublabel: 'Tailored charcoal cloak with red trim' }",
    )
    expect(studioSource).toContain(
      "{ value: 'green-cloak', label: 'Green Cloak', sublabel: 'Tailored charcoal cloak with green trim' }",
    )
    expect(studioSource).toContain("nextTraits.shell = 'green-cloak'")
    expect(mappingSource).toContain(
      "'Shell::Red Cloak': mapping('shell', 'Red Cloak', { shell: 'wizard-cloak' })",
    )
    expect(mappingSource).toContain(
      "'Shell::Green Cloak': mapping('shell', 'Green Cloak', { shell: 'green-cloak' })",
    )
    expect(avatarSource).toContain('faceTrait={loadout.face}')
    expect(avatarSource).toContain('showSideKnobs={false}')
    expect(studioSource).not.toContain("filledTraits.shell === 'seed-shell' && filledTraits.face === 'grouchy'")
    expect(studioSource).not.toContain("filledTraits.shell === 'wizard-cloak' || filledTraits.shell === 'green-cloak'")
  })

  it('keeps Unibrow owned exclusively by its Eyes trait', () => {
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    const mappingSource = readFileSync(
      new URL('../docs/asset-generation/preview/red-shell/glowbudsDisplayMapping.ts', import.meta.url),
      'utf8',
    )
    const trackerRow = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Eyes' && row.sourceTrait === 'Unibrow',
    )

    expect(avatarSource).toContain('function createUnibrowGeometry()')
    expect(avatarSource).toContain('function UnibrowOverlay({')
    expect(avatarSource).toContain("const isUnibrow = eyeTrait === 'unibrow'")
    expect(avatarSource).toContain("eyeTrait === 'unibrow' ? <UnibrowOverlay")
    expect(avatarSource).toContain('{!isUnibrow ? (')
    expect(avatarSource).not.toContain("faceTrait === 'grouchy' ? <UnibrowOverlay")
    expect(avatarSource).toContain("const eyeTrait = loadout.eyes ?? 'mellow'")
    expect(avatarSource).toContain("const mouthTrait = loadout.mouth ?? 'classic-smile'")
    expect(studioSource).toContain(
      "{ value: 'unibrow', label: 'Unibrow', sublabel: 'Bold continuous grouchy brow' }",
    )
    expect(studioSource).not.toContain("{ value: 'grouchy', label: 'Unibrow'")
    expect(studioSource).toContain("nextTraits.eyes = 'unibrow'")
    expect(mappingSource).toContain(
      "'Eyes::Unibrow': mapping('eyes', 'Unibrow', { eyes: 'unibrow' })",
    )
    expect(trackerRow?.studioCategory).toBe('eyes')
    expect(studioSource).toContain("eyes: nextTraits.eyes ?? 'mellow'")
    expect(studioSource).toContain("mouth: nextTraits.mouth ?? 'classic-smile'")
  })

  it('keeps Purp as broad makeup-led eyes with animated pupils', () => {
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(avatarSource).toContain('function createPurpAlmondEyeGeometry()')
    expect(avatarSource).toContain('function PurpEyeShape({')
    expect(avatarSource).toContain(
      '<PurpEyeShape side={side} pupilRef={pupilGroup} pupilOffset={pupilOffset} pupilZ={pupilZ} />',
    )
    expect(avatarSource).toContain('material={toon("#55208f")}')
    expect(avatarSource).toContain('color="#b977ed"')
    expect(avatarSource).not.toContain('scale={[0.041, 0.064, 0.021]}')
    expect(studioSource).toContain(
      "{ value: 'purp', label: 'Purp', sublabel: 'Focused violet eyes and swept liner' }",
    )
  })

  it('keeps Diamond and Ice exact, one-to-one, query-loadable, and materially distinct', () => {
    const diamond = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Diamond',
    )
    const ice = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Ice',
    )
    const diamondReferences = getGlowbudsTraitReferences('Shell', 'Diamond')
    const iceReferences = getGlowbudsTraitReferences('Shell', 'Ice')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(diamond).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Diamond',
      status: 'partial',
      confidence: 'high',
    })
    expect(ice).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Ice',
      status: 'partial',
      confidence: 'high',
    })
    expect(diamondReferences.map((reference) => reference.tokenId)).toEqual([3158, 1169, 1405])
    expect(iceReferences.map((reference) => reference.tokenId)).toEqual([2459, 211, 2347])
    expect(avatarSource).toContain("| 'ice-shell'")
    expect(avatarSource).toContain("loadout.shell === 'ice-shell'")
    expect(avatarSource).toContain('<DiamondShell fitted />')
    expect(avatarSource).toContain('<DiamondShellOpeningLip />')
    expect(avatarSource).toContain('<IceShell fitted />')
    expect(avatarSource).toContain('<IceShellOpeningLip />')
    expect(studioSource).toContain(
      "{ value: 'crystal-shell', label: 'Diamond', sublabel: 'Precision-cut brilliant shell' }",
    )
    expect(studioSource).toContain(
      "{ value: 'ice-shell', label: 'Ice', sublabel: 'Cloudy melting ice block' }",
    )
    expect(studioSource).toContain("nextTraits.shell = 'ice-shell'")
  })

  it('keeps Gemstone exact, query-loadable, sealed, and distinct from Diamond and Amethyst', () => {
    const gemstone = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Gemstone',
    )
    const references = getGlowbudsTraitReferences('Shell', 'Gemstone')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    const gemstoneSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/GemstoneShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(gemstone).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Gemstone',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([1412, 563, 2861])
    expect(avatarSource).toContain("| 'gemstone-shell'")
    expect(avatarSource).toContain("loadout.shell === 'gemstone-shell'")
    expect(avatarSource).toContain('<GemstoneShell fitted />')
    expect(avatarSource).toContain('<GemstoneShellOpeningLip />')
    expect(studioSource).toContain(
      "{ value: 'gemstone-shell', label: 'Gemstone', sublabel: 'Polished translucent purple jewel' }",
    )
    expect(studioSource).toContain("nextTraits.shell = 'gemstone-shell'")
    expect(gemstoneSource).toContain('gemstone-shell-polished-cushion-hull')
    expect(gemstoneSource).toContain('gemstone-shell-opaque-depth-core')
    expect(gemstoneSource).toContain('gemstone-shell-continuous-aperture-seal')
    expect(gemstoneSource).toContain('transmission={0.22}')
    expect(gemstoneSource).not.toContain('shard')
    expect(gemstoneSource).not.toContain('cloud')
  })

  it('keeps Ancient exact, query-loadable, and rebuilt as a root-bound temple ruin', () => {
    const ancient = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Ancient',
    )
    const references = getGlowbudsTraitReferences('Shell', 'Ancient')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    const ancientSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/AncientShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(ancient).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Ancient',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([2798, 17, 787])
    expect(avatarSource).toContain("| 'ancient-shell'")
    expect(avatarSource).toContain("loadout.shell === 'ancient-shell'")
    expect(avatarSource).toContain('<AncientShell')
    expect(avatarSource).toContain('<AncientShellOpeningPortal />')
    expect(studioSource).toContain(
      "{ value: 'ancient-shell', label: 'Ancient', sublabel: 'Root-bound weathered temple ruin' }",
    )
    expect(studioSource).toContain("nextTraits.shell = 'ancient-shell'")
    expect(ancientSource).toContain('createAncientShellGeometry')
    expect(ancientSource).toContain('ancientCrackSignal')
    expect(ancientSource).toContain('ancient-shell-true-carved-face-portal')
    expect(ancientSource).toContain('ancient-shell-carved-portal-tunnel')
    expect(ancientSource).toContain('ancient-shell-buried-stone-threshold')
    expect(ancientSource).toContain('ancient-shell-carved-fracture-inlays')
    expect(ancientSource).toContain('ancient-shell-deep-root-buttresses')
    expect(ancientSource).toContain('ancient-shell-damp-ledge-moss-colonies')
  })

  it('keeps custom shell apertures structurally sealed to their bodies', () => {
    const sealSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/ShellOpeningSeal.ts',
        import.meta.url,
      ),
      'utf8',
    )
    const sealedShells = [
      ['HornyShell.tsx', 'horny-shell-continuous-aperture-seal'],
      ['RaddishShell.tsx', 'raddish-shell-continuous-aperture-seal'],
      ['AncientShell.tsx', 'ancient-shell-continuous-aperture-seal'],
      ['DiamondShell.tsx', 'diamond-shell-continuous-aperture-seal'],
      ['GemstoneShell.tsx', 'gemstone-shell-continuous-aperture-seal'],
      ['IceShell.tsx', 'ice-shell-continuous-aperture-seal'],
    ] as const

    expect(sealSource).toContain('createShellOpeningSealGeometry')
    expect(sealSource).toContain('frontXRadius')
    expect(sealSource).toContain('backXRadius')
    expect(sealSource).toContain('frontZ')
    expect(sealSource).toContain('backZ')

    for (const [fileName, marker] of sealedShells) {
      const shellSource = readFileSync(
        new URL(
          `../docs/asset-generation/code-examples/glowbud-traits/shell/${fileName}`,
          import.meta.url,
        ),
        'utf8',
      )
      expect(shellSource).toContain("from './ShellOpeningSeal'")
      expect(shellSource).toContain(marker)
      expect(shellSource).toContain('sealGeometry.dispose()')
    }
  })

  it('keeps Heavy Duty exact, query-loadable, and rebuilt as a complete armored tank hull', () => {
    const heavyDuty = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Heavy Duty',
    )
    const references = getGlowbudsTraitReferences('Shell', 'Heavy Duty')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    const heavyDutySource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/HeavyDutyShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(heavyDuty).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Heavy Duty',
      status: 'partial',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([2523, 2326, 1514])
    expect(avatarSource).toContain("| 'heavy-duty-shell'")
    expect(avatarSource).toContain("loadout.shell === 'heavy-duty-shell'")
    expect(avatarSource).toContain('<HeavyDutyShell')
    expect(avatarSource).toContain('<HeavyDutyShellOpeningArmor />')
    expect(studioSource).toContain(
      "{ value: 'heavy-duty-shell', label: 'Heavy Duty', sublabel: 'Rugged olive tank armor hull' }",
    )
    expect(studioSource).toContain("nextTraits.shell = 'heavy-duty-shell'")
    expect(heavyDutySource).toContain('createHeavyDutyHullGeometry')
    expect(heavyDutySource).toContain('heavy-duty-shell-one-piece-cast-armor-body')
    expect(heavyDutySource).toContain('heavy-duty-shell-protected-face-mantlet')
    expect(heavyDutySource).toContain('heavy-duty-shell-deep-armored-face-tunnel')
    expect(heavyDutySource).toContain('heavy-duty-shell-overlapping-side-skirts')
    expect(heavyDutySource).toContain('heavy-duty-shell-low-turret-hatch')
    expect(heavyDutySource).toContain('heavy-duty-shell-rear-engine-deck')
    expect(heavyDutySource).toContain('heavy-duty-shell-buried-weld-seams')
  })

  it('keeps Robot exact, query-loadable, and separate from the Robot Type palette', () => {
    const robotShell = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Robot',
    )
    const robotType = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Type' && row.sourceTrait === 'Robot',
    )
    const references = getGlowbudsTraitReferences('Shell', 'Robot')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    const robotSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/RobotShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(robotShell).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Robot',
      status: 'partial',
      confidence: 'high',
    })
    expect(robotType).toMatchObject({
      studioCategory: 'skin',
      studioTrait: 'Robot',
      status: 'complete',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([2613, 1492, 3025])
    expect(avatarSource).toContain("| 'robot-shell'")
    expect(avatarSource).toContain("loadout.shell === 'robot-shell'")
    expect(avatarSource).toContain('<RobotShell')
    expect(avatarSource).toContain('<RobotShellOpeningFrame />')
    expect(studioSource).toContain(
      "{ value: 'robot-shell', label: 'Robot', sublabel: 'Rounded mech suit with V antenna' }",
    )
    expect(studioSource).toContain("nextTraits.shell = 'robot-shell'")
    expect(robotSource).toContain('robot-shell-complete-rounded-mech-exosuit')
    expect(robotSource).toContain('robot-shell-true-cut-aperture-armored-hull')
    expect(robotSource).toContain('robot-shell-deep-protected-face-aperture')
    expect(robotSource).toContain('robot-shell-opaque-depth-tested-face-tunnel')
    expect(robotSource).toContain('robot-shell-articulated-v-antenna')
    expect(robotSource).toContain('robot-shell-finished-rear-service-deck')
    expect(robotSource).not.toContain('transparent')
  })

  it('keeps Soft as the first clean rebuilt shell with an exact studio mapping', () => {
    const soft = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Soft',
    )
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    const softSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/SoftShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(soft).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Soft',
      status: 'partial',
      confidence: 'high',
    })
    expect(avatarSource).toContain("| 'soft-shell'")
    expect(avatarSource).toContain("loadout.shell === 'soft-shell'")
    expect(avatarSource).toContain('<SoftShell fitted activity={activity} animation={coreAnimation} />')
    expect(studioSource).toContain("{ value: 'soft-shell', label: 'Soft', sublabel: 'Dense layered shag coat' }")
    expect(studioSource).toContain("nextTraits.shell = 'soft-shell'")
    expect(softSource).toContain('SOFT_SHELL_FIBER_COUNT = 7200')
    expect(softSource).toContain('SOFT_SHELL_GUARD_FIBER_RATIO = 0.45')
    expect(softSource).toContain("geometry.setAttribute('aLayer'")
    expect(softSource).toContain('new THREE.InstancedBufferGeometry()')
    expect(softSource).toContain('new MeshSurfaceSampler(samplingMesh)')
    expect(softSource).toContain('soft-shell-reactive-fur-field')
    expect(softSource).toContain('springVelocity.current')
  })

  it('keeps Rock exact, query-loadable, and rebuilt with geological surface structure', () => {
    const rock = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Rock',
    )
    const references = getGlowbudsTraitReferences('Shell', 'Rock')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    const rockSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/RockShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(rock).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Rock',
      status: 'partial',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([187, 3133, 386])
    expect(avatarSource).toContain("| 'rock-shell'")
    expect(avatarSource).toContain("loadout.shell === 'rock-shell'")
    expect(avatarSource).toContain('<RockShell fitted />')
    expect(avatarSource).toContain('<RockShellOpeningLip />')
    expect(studioSource).toContain(
      "{ value: 'rock-shell', label: 'Rock', sublabel: 'Craggy mineral strata boulder' }",
    )
    expect(studioSource).toContain("nextTraits.shell = 'rock-shell'")
    expect(rockSource).toContain('createRockShellGeometry')
    expect(rockSource).toContain('ROCK_FRAGMENT_SHADER')
    expect(rockSource).toContain('rock-shell-embedded-crag-crown')
  })

  it('keeps Log exact, query-loadable, and rebuilt as a materially distinct hollow stump', () => {
    const log = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Log',
    )
    const references = getGlowbudsTraitReferences('Shell', 'Log')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    const logSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/LogShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(log).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Log',
      status: 'partial',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([1, 2658, 3127])
    expect(avatarSource).toContain("| 'log-shell'")
    expect(avatarSource).toContain("loadout.shell === 'log-shell'")
    expect(avatarSource).toContain('<LogShell fitted />')
    expect(avatarSource).toContain('<LogShellOpeningLip />')
    expect(studioSource).toContain(
      "{ value: 'log-shell', label: 'Log', sublabel: 'Hollow bark stump and growth rings' }",
    )
    expect(studioSource).toContain("nextTraits.shell = 'log-shell'")
    expect(logSource).toContain('createLogShellGeometry')
    expect(logSource).toContain('LOG_BARK_FRAGMENT_SHADER')
    expect(logSource).toContain('LOG_CUT_FRAGMENT_SHADER')
    expect(logSource).toContain('log-shell-top-closed-bark-underside')
    expect(logSource).toContain('log-shell-root-buttresses')
    expect(logSource).toContain('log-shell-carved-sapwood-opening')
  })

  it('keeps Hoodie exact, query-loadable, and rebuilt as a complete soft garment', () => {
    const hoodie = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Hoodie',
    )
    const references = getGlowbudsTraitReferences('Shell', 'Hoodie')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    const hoodieSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/HoodieShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(hoodie).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Hoodie',
      status: 'partial',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([1078, 2569, 1264])
    expect(avatarSource).toContain("| 'hoodie-shell'")
    expect(avatarSource).toContain("loadout.shell === 'hoodie-shell'")
    expect(avatarSource).toContain('<HoodieShell fitted activity={activity} animation={coreAnimation} />')
    expect(avatarSource).toContain('<HoodieShellOpeningLip activity={activity} animation={coreAnimation} />')
    expect(studioSource).toContain(
      "{ value: 'hoodie-shell', label: 'Hoodie', sublabel: 'Loose fleece pullover and lined hood' }",
    )
    expect(studioSource).toContain("nextTraits.shell = 'hoodie-shell'")
    expect(hoodieSource).toContain('createHoodieBodyGeometry')
    expect(hoodieSource).toContain('createHoodieFleeceNapMesh')
    expect(hoodieSource).toContain('HOODIE_FRAGMENT_SHADER')
    expect(hoodieSource).toContain('brushedFleece')
    expect(hoodieSource).toContain('hoodie-shell-brushed-fleece-nap')
    expect(hoodieSource).toContain('puffy-sleeve-root-seal')
    expect(hoodieSource).not.toContain('hoodie-shell-kangaroo-pocket')
    expect(hoodieSource).toContain('hoodie-shell-integrated-face-cowl')
    expect(hoodieSource).toContain('bodyOverlap')
    expect(hoodieSource).toContain('hoodie-shell-opening-wall')
  })

  it('keeps Guard exact, query-loadable, and rebuilt as a crested Roman helmet', () => {
    const guard = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Guard',
    )
    const references = getGlowbudsTraitReferences('Shell', 'Guard')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    const guardSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/GuardShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(guard).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Guard',
      status: 'partial',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([2249, 946, 2109])
    expect(avatarSource).toContain("| 'guard-shell'")
    expect(avatarSource).toContain("loadout.shell === 'guard-shell'")
    expect(avatarSource).toContain('<GuardShellOpeningArmor />')
    expect(avatarSource).toContain('hasHeadAccessory={loadout.head !== \'none\'}')
    expect(studioSource).toContain(
      "{ value: 'guard-shell', label: 'Guard', sublabel: 'Forged Roman helmet and red horsehair crest' }",
    )
    expect(studioSource).toContain("nextTraits.shell = 'guard-shell'")
    expect(guardSource).toContain('GUARD_CREST_FIBER_COUNT = 6200')
    expect(guardSource).toContain('guard-shell-reactive-horsehair-crest')
    expect(guardSource).toContain('guard-shell-armored-face-opening')
    expect(guardSource).toContain('guard-shell-flared-neck-guard')
  })

  it('keeps Spikey exact, query-loadable, and rebuilt as a rocky multicolour spike shell', () => {
    const spikey = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Spikey',
    )
    const references = getGlowbudsTraitReferences('Shell', 'Spikey')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    const spikeySource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/SpikeyShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(spikey).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Spikey',
      status: 'partial',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([1878, 2492, 1645])
    expect(avatarSource).toContain("| 'spikey-shell'")
    expect(avatarSource).toContain("loadout.shell === 'spikey-shell'")
    expect(avatarSource).toContain('<SpikeyShell fitted hasHeadAccessory={loadout.head !== \'none\'} />')
    expect(avatarSource).toContain('<SpikeyShellOpeningLip />')
    expect(studioSource).toContain(
      "{ value: 'spikey-shell', label: 'Spikey', sublabel: 'Craggy indigo shell and multicolour spikes' }",
    )
    expect(studioSource).toContain("nextTraits.shell = 'spikey-shell'")
    expect(spikeySource).toContain('SPIKEY_SPIKE_SPECS')
    expect(spikeySource).toContain('spikey-shell-multicolor-spike-field')
    expect(spikeySource).toContain('spikey-shell-true-face-aperture')
    expect(spikeySource).toContain('createSpikeySpikeGeometry')
  })

  it('keeps Shark exact, query-loadable, and rebuilt as a whole open-jawed mascot shark', () => {
    const shark = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Shark',
    )
    const references = getGlowbudsTraitReferences('Shell', 'Shark')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    const sharkSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/SharkShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(shark).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Shark',
      status: 'partial',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([1882, 2537, 3010])
    expect(avatarSource).toContain("| 'shark-shell'")
    expect(avatarSource).toContain("loadout.shell === 'shark-shell'")
    expect(avatarSource).toContain('<SharkShell')
    expect(avatarSource).toContain('<SharkShellOpeningJaws />')
    expect(studioSource).toContain(
      "{ value: 'shark-shell', label: 'Shark', sublabel: 'Whole shark mascot with open jaws' }",
    )
    expect(studioSource).toContain("nextTraits.shell = 'shark-shell'")
    expect(sharkSource).toContain('createSharkHullGeometry')
    expect(sharkSource).toContain('shark-shell-whole-shark-mascot-body')
    expect(sharkSource).toContain('shark-shell-true-open-jaw-face-aperture')
    expect(sharkSource).toContain('shark-shell-short-rounded-costume-teeth')
    expect(sharkSource).toContain('shark-shell-rooted-swaying-tail')
    expect(sharkSource).not.toContain('transparent')
    expect(sharkSource).not.toContain('depthWrite={false}')
  })

  it('keeps Horny exact, query-loadable, and rebuilt as a leathery devil horn shell', () => {
    const horny = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Horny',
    )
    const references = getGlowbudsTraitReferences('Shell', 'Horny')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    const hornySource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/HornyShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(horny).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Horny',
      status: 'partial',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([1533, 1625, 2481])
    expect(avatarSource).toContain("| 'horny-shell'")
    expect(avatarSource).toContain("loadout.shell === 'horny-shell'")
    expect(avatarSource).toContain('<HornyShell fitted />')
    expect(avatarSource).toContain('<HornyShellOpeningLip />')
    expect(studioSource).toContain(
      "{ value: 'horny-shell', label: 'Horny', sublabel: 'Leathery devil shell and swept ivory horns' }",
    )
    expect(studioSource).toContain("nextTraits.shell = 'horny-shell'")
    expect(hornySource).toContain('createSweptHornGeometry')
    expect(hornySource).toContain('horny-shell-swept-ridged-horn-crown')
    expect(hornySource).toContain('horny-shell-true-face-aperture')
    expect(hornySource).toContain('HORNY_SKIN_FRAGMENT_SHADER')
  })

  it('keeps Raddish exact, query-loadable, and rebuilt as a dimensional root-vegetable shell', () => {
    const raddish = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Shell' && row.sourceTrait === 'Raddish',
    )
    const references = getGlowbudsTraitReferences('Shell', 'Raddish')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()
    const raddishSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/shell/RaddishShell.tsx',
        import.meta.url,
      ),
      'utf8',
    )

    expect(raddish).toMatchObject({
      studioCategory: 'shell',
      studioTrait: 'Raddish',
      status: 'partial',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([1530, 3172, 97])
    expect(avatarSource).toContain("| 'raddish-shell'")
    expect(avatarSource).toContain("loadout.shell === 'raddish-shell'")
    expect(avatarSource).toContain('<RaddishShell')
    expect(avatarSource).toContain('<RaddishShellOpeningLip />')
    expect(studioSource).toContain(
      "{ value: 'raddish-shell', label: 'Raddish', sublabel: 'Raspberry root bulb and leafy crown' }",
    )
    expect(studioSource).toContain("nextTraits.shell = 'raddish-shell'")
    expect(raddishSource).toContain('createRaddishLeafGeometry')
    expect(raddishSource).toContain('raddish-shell-organic-leaf-crown')
    expect(raddishSource).toContain('raddish-shell-true-face-aperture')
    expect(raddishSource).toContain('raddish-shell-curved-creamy-taproot')
  })

  it('keeps Terracotta exact, query-loadable, and registered for every plant', () => {
    const terracotta = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Pot' && row.sourceTrait === 'Terracotta',
    )
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(terracotta).toMatchObject({
      studioCategory: 'pot',
      studioTrait: 'Terracotta',
      status: 'complete',
      confidence: 'high',
    })
    expect(avatarSource).toContain("| 'terracotta'")
    expect(avatarSource.match(/pot === 'terracotta'/g)).toHaveLength(8)
    expect(studioSource).toContain(
      "{ value: 'terracotta', label: 'Terracotta', sublabel: 'Chunky brick-red clay planter' }",
    )
    expect(studioSource).toContain("nextTraits.pot = 'terracotta'")
  })

  it('keeps Cactus exact, query-loadable, and registered as one plant trait', () => {
    const cactus = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Plant' && row.sourceTrait === 'Cactus',
    )
    const references = getGlowbudsTraitReferences('Plant', 'Cactus')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const cactusSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/plant/CactusPlant.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(cactus).toMatchObject({
      studioCategory: 'head',
      studioTrait: 'Cactus',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([2910, 765, 429])
    expect(avatarSource).toContain("| 'cactus'")
    expect(avatarSource.match(/loadout\.head === 'cactus'/g)).toHaveLength(2)
    expect(cactusSource).toContain('export function CactusPlant')
    expect(cactusSource).toContain('createPaintedCactusTube')
    expect(studioSource).toContain(
      "{ value: 'cactus', label: 'Cactus', sublabel: 'Tall asymmetric desert bloom' }",
    )
    expect(studioSource).toContain("nextTraits.head = 'cactus'")
  })

  it('keeps Snake plant exact, query-loadable, and registered as one plant trait', () => {
    const snakePlant = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Plant' && row.sourceTrait === 'Snake plant',
    )
    const references = getGlowbudsTraitReferences('Plant', 'Snake plant')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const snakePlantSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/plant/SnakePlant.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(snakePlant).toMatchObject({
      studioCategory: 'head',
      studioTrait: 'Snake plant',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([2242, 623, 2893])
    expect(avatarSource).toContain("| 'snake-plant'")
    expect(avatarSource.match(/loadout\.head === 'snake-plant'/g)).toHaveLength(2)
    expect(snakePlantSource).toContain('export function SnakePlant')
    expect(snakePlantSource).toContain('createSnakeLeafGeometry')
    expect(studioSource).toContain(
      "{ value: 'snake-plant', label: 'Snake plant', sublabel: 'Tall variegated sword-leaf clump' }",
    )
    expect(studioSource).toContain("nextTraits.head = 'snake-plant'")
  })

  it('keeps Lotus exact, query-loadable, and registered as one plant trait', () => {
    const lotus = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Plant' && row.sourceTrait === 'Lotus',
    )
    const references = getGlowbudsTraitReferences('Plant', 'Lotus')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const lotusSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/plant/LotusPlant.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(lotus).toMatchObject({
      studioCategory: 'head',
      studioTrait: 'Lotus',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([806, 3165, 386])
    expect(avatarSource).toContain("| 'lotus'")
    expect(avatarSource.match(/loadout\.head === 'lotus'/g)).toHaveLength(2)
    expect(lotusSource).toContain('export function LotusPlant')
    expect(lotusSource).toContain('createLotusPetalGeometry')
    expect(studioSource).toContain(
      "{ value: 'lotus', label: 'Lotus', sublabel: 'Open pink bloom and lotus pads' }",
    )
    expect(studioSource).toContain("nextTraits.head = 'lotus'")
  })

  it('keeps Flower exact, query-loadable, and backed by the reusable radial bloom', () => {
    const flower = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Plant' && row.sourceTrait === 'Flower',
    )
    const references = getGlowbudsTraitReferences('Plant', 'Flower')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const flowerSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/plant/FlowerPlant.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const radialBloomSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/plant/CartoonRadialBloom.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(flower).toMatchObject({
      studioCategory: 'head',
      studioTrait: 'Flower',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([2798, 2917, 1530])
    expect(avatarSource).toContain("| 'flower'")
    expect(avatarSource.match(/loadout\.head === 'flower'/g)).toHaveLength(2)
    expect(flowerSource).toContain('export function FlowerPlant')
    expect(flowerSource).toContain('<CartoonRadialBloom')
    expect(radialBloomSource).toContain('export function CartoonRadialBloom')
    expect(radialBloomSource).toContain('export function createCartoonRadialPetalGeometry')
    expect(studioSource).toContain(
      "{ value: 'flower', label: 'Flower', sublabel: 'Puffy blue five-petal garden bloom' }",
    )
    expect(studioSource).toContain("nextTraits.head = 'flower'")
  })

  it('keeps Two flowers exact, query-loadable, and composed from the reusable radial bloom', () => {
    const twoFlowers = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Plant' && row.sourceTrait === 'Two flowers',
    )
    const references = getGlowbudsTraitReferences('Plant', 'Two flowers')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const twoFlowersSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/plant/TwoFlowersPlant.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(twoFlowers).toMatchObject({
      studioCategory: 'head',
      studioTrait: 'Two flowers',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([1414, 367, 1285])
    expect(avatarSource).toContain("| 'two-flowers'")
    expect(avatarSource.match(/loadout\.head === 'two-flowers'/g)).toHaveLength(2)
    expect(twoFlowersSource).toContain('export function TwoFlowersPlant')
    expect(twoFlowersSource.match(/<CartoonRadialBloom/g)).toHaveLength(2)
    expect(twoFlowersSource).toContain('TuckedCalyx')
    expect(twoFlowersSource).toContain('createCartoonRadialPetalGeometry')
    expect(studioSource).toContain(
      "{ value: 'two-flowers', label: 'Two Flowers', sublabel: 'Tall red and lower purple garden pair' }",
    )
    expect(studioSource).toContain("nextTraits.head = 'two-flowers'")
  })

  it('keeps Palm tree exact, query-loadable, and independent from radial flowers', () => {
    const palmTree = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (row) => row.sourceCategory === 'Plant' && row.sourceTrait === 'Palm tree',
    )
    const references = getGlowbudsTraitReferences('Plant', 'Palm tree')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const palmSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/plant/PalmTreePlant.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(palmTree).toMatchObject({
      studioCategory: 'head',
      studioTrait: 'Palm tree',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([2037, 1366, 166])
    expect(avatarSource).toContain("| 'palm-tree'")
    expect(avatarSource.match(/loadout\.head === 'palm-tree'/g)).toHaveLength(2)
    expect(palmSource).toContain('export function PalmTreePlant')
    expect(palmSource).toContain('createCurvedPalmTrunkGeometry')
    expect(palmSource).toContain('createPalmFrondGeometry')
    expect(palmSource).not.toContain('CartoonRadialBloom')
    expect(studioSource).toContain(
      "{ value: 'palm-tree', label: 'Palm Tree', sublabel: 'Curved segmented trunk and drooping frond crown' }",
    )
    expect(studioSource).toContain("nextTraits.head = 'palm-tree'")
  })

  it('keeps Douglas and Fern exact, query-loadable, and independently reusable', () => {
    const expectedPlants = [
      {
        sourceTrait: 'Douglas',
        studioTrait: 'Douglas',
        queryValue: 'douglas',
        referenceTokens: [703, 2222, 570],
        sourceFile: 'DouglasPlant.tsx',
        exportName: 'DouglasPlant',
        geometryName: 'createDouglasSprayGeometry',
        studioOption: "{ value: 'douglas', label: 'Douglas', sublabel: 'Tiered puffy evergreen tree' }",
      },
      {
        sourceTrait: 'Fern',
        studioTrait: 'Fern',
        queryValue: 'fern',
        referenceTokens: [343, 2185, 471],
        sourceFile: 'FernPlant.tsx',
        exportName: 'FernPlant',
        geometryName: 'createCompoundFernFrondGeometry',
        studioOption: "{ value: 'fern', label: 'Fern', sublabel: 'Arching compound frond fountain' }",
      },
    ] as const
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    for (const expected of expectedPlants) {
      const row = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
        (candidate) =>
          candidate.sourceCategory === 'Plant'
          && candidate.sourceTrait === expected.sourceTrait,
      )
      const references = getGlowbudsTraitReferences('Plant', expected.sourceTrait)
      const plantSource = readFileSync(
        new URL(
          `../docs/asset-generation/code-examples/glowbud-traits/plant/${expected.sourceFile}`,
          import.meta.url,
        ),
        'utf8',
      )

      expect(row).toMatchObject({
        studioCategory: 'head',
        studioTrait: expected.studioTrait,
        status: 'complete',
        confidence: 'high',
      })
      expect(references.map((reference) => reference.tokenId)).toEqual(
        expected.referenceTokens,
      )
      expect(avatarSource).toContain(`| '${expected.queryValue}'`)
      expect(
        avatarSource.match(
          new RegExp(`loadout\\.head === '${expected.queryValue}'`, 'g'),
        ),
      ).toHaveLength(2)
      expect(plantSource).toContain(`export function ${expected.exportName}`)
      expect(plantSource).toContain(expected.geometryName)
      expect(studioSource).toContain(expected.studioOption)
      expect(studioSource).toContain(`nextTraits.head = '${expected.queryValue}'`)
    }
  })

  it('keeps Myrtle exact, query-loadable, and independently reusable', () => {
    const row = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (candidate) =>
        candidate.sourceCategory === 'Plant'
        && candidate.sourceTrait === 'Myrtle',
    )
    const references = getGlowbudsTraitReferences('Plant', 'Myrtle')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const myrtleSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/plant/MyrtlePlant.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(row).toMatchObject({
      studioCategory: 'head',
      studioTrait: 'Myrtle',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([2977, 3282, 3293])
    expect(avatarSource).toContain("| 'myrtle'")
    expect(avatarSource.match(/loadout\.head === 'myrtle'/g)).toHaveLength(2)
    expect(myrtleSource).toContain('export function MyrtlePlant')
    expect(myrtleSource).toContain('createMyrtleLeafGeometry')
    expect(studioSource).toContain(
      "{ value: 'myrtle', label: 'Myrtle', sublabel: 'Glossy flowering topiary tree' }",
    )
    expect(studioSource).toContain("nextTraits.head = 'myrtle'")
  })

  it('keeps lavender exact, query-loadable, and independently reusable', () => {
    const row = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (candidate) =>
        candidate.sourceCategory === 'Plant'
        && candidate.sourceTrait === 'lavender',
    )
    const references = getGlowbudsTraitReferences('Plant', 'lavender')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const lavenderSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/plant/LavenderPlant.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(row).toMatchObject({
      studioCategory: 'head',
      studioTrait: 'lavender',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([749, 3022, 2706])
    expect(avatarSource).toContain("| 'lavender'")
    expect(avatarSource.match(/loadout\.head === 'lavender'/g)).toHaveLength(2)
    expect(lavenderSource).toContain('export function LavenderPlant')
    expect(lavenderSource).toContain('createLavenderSpikeGeometry')
    expect(studioSource).toContain(
      "{ value: 'lavender', label: 'Lavender', sublabel: 'Silvery aromatic purple flower spikes' }",
    )
    expect(studioSource).toContain("nextTraits.head = 'lavender'")
  })

  it('keeps Dandelion exact, query-loadable, and independently reusable', () => {
    const row = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (candidate) =>
        candidate.sourceCategory === 'Plant'
        && candidate.sourceTrait === 'Dandelion',
    )
    const references = getGlowbudsTraitReferences('Plant', 'Dandelion')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const dandelionSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/plant/DandelionPlant.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(row).toMatchObject({
      studioCategory: 'head',
      studioTrait: 'Dandelion',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([3194, 1, 2908])
    expect(avatarSource).toContain("| 'dandelion'")
    expect(avatarSource.match(/loadout\.head === 'dandelion'/g)).toHaveLength(2)
    expect(dandelionSource).toContain('export function DandelionPlant')
    expect(dandelionSource).toContain('createDandelionLeafGeometry')
    expect(dandelionSource).toContain('const SEED_TUFTS')
    expect(studioSource).toContain(
      "{ value: 'dandelion', label: 'Dandelion', sublabel: 'Puffy white seed clock and leaf rosette' }",
    )
    expect(studioSource).toContain("nextTraits.head = 'dandelion'")
  })

  it('keeps Sprout exact, query-loadable, and independently reusable', () => {
    const row = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (candidate) =>
        candidate.sourceCategory === 'Plant'
        && candidate.sourceTrait === 'Sprout',
    )
    const references = getGlowbudsTraitReferences('Plant', 'Sprout')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const sproutSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/plant/SproutPlant.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(row).toMatchObject({
      studioCategory: 'head',
      studioTrait: 'Sprout',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([716, 2310, 2132])
    expect(avatarSource).toContain("| 'sprout'")
    expect(avatarSource.match(/loadout\.head === 'sprout'/g)).toHaveLength(2)
    expect(sproutSource).toContain('export function SproutPlant')
    expect(sproutSource).toContain('createSproutLeafGeometry')
    expect(sproutSource).toContain('SplitSeedHusk')
    expect(studioSource).toContain(
      "{ value: 'sprout', label: 'Sprout', sublabel: 'Fresh seedling with puffy unfolding leaves' }",
    )
    expect(studioSource).toContain("nextTraits.head = 'sprout'")
  })

  it('keeps Bunch of Flowers exact, query-loadable, and independently reusable', () => {
    const row = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (candidate) =>
        candidate.sourceCategory === 'Plant'
        && candidate.sourceTrait === 'Bunch of Flowers',
    )
    const references = getGlowbudsTraitReferences('Plant', 'Bunch of Flowers')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const bouquetSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/plant/BunchOfFlowersPlant.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(row).toMatchObject({
      studioCategory: 'head',
      studioTrait: 'Bunch of Flowers',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([2409, 159, 1607])
    expect(avatarSource).toContain("| 'bunch-of-flowers'")
    expect(avatarSource.match(/loadout\.head === 'bunch-of-flowers'/g)).toHaveLength(2)
    expect(bouquetSource).toContain('export function BunchOfFlowersPlant')
    expect(bouquetSource).toContain('const BLOOMS')
    expect(bouquetSource).toContain('BouquetStemBundle')
    expect(bouquetSource).toContain('createCartoonRadialPetalGeometry')
    expect(bouquetSource).toContain('spec.rotation[1] + Math.PI')
    expect(bouquetSource).toContain('ref={bloomMotion}')
    expect(studioSource).toContain(
      "{ value: 'bunch-of-flowers', label: 'Bunch of Flowers', sublabel: 'Mixed blue violet and golden bouquet' }",
    )
    expect(studioSource).toContain("nextTraits.head = 'bunch-of-flowers'")
  })

  it('keeps Roses exact, query-loadable, and independently reusable', () => {
    const row = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (candidate) =>
        candidate.sourceCategory === 'Plant'
        && candidate.sourceTrait === 'Roses',
    )
    const references = getGlowbudsTraitReferences('Plant', 'Roses')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const rosesSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/plant/RosesPlant.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(row).toMatchObject({
      studioCategory: 'head',
      studioTrait: 'Roses',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([353, 2547, 845])
    expect(avatarSource).toContain("| 'roses'")
    expect(avatarSource.match(/loadout\.head === 'roses'/g)).toHaveLength(2)
    expect(rosesSource).toContain('export function RosesPlant')
    expect(rosesSource).toContain('createRosePetalGeometry')
    expect(rosesSource).toContain('export const ROSE_BLOOMS')
    expect(rosesSource).toContain('function RoseCalyx')
    expect(rosesSource).toContain('bloom.current.rotation.x = spec.rotation[0]')
    expect(rosesSource).toContain('function createRoseBudGeometry')
    expect(rosesSource).toContain('const budGeometry = useMemo(() => createRoseBudGeometry(), [])')
    expect(studioSource).toContain(
      "{ value: 'roses', label: 'Roses', sublabel: 'Four layered magenta rose blooms' }",
    )
    expect(studioSource).toContain("nextTraits.head = 'roses'")
  })

  it('keeps Bonsai exact, query-loadable, and distinct from Bonsai sakura', () => {
    const row = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (candidate) =>
        candidate.sourceCategory === 'Plant'
        && candidate.sourceTrait === 'Bonsai',
    )
    const sakuraRow = GLOWBUDS_TRAIT_TRACKER_ROWS.find(
      (candidate) =>
        candidate.sourceCategory === 'Plant'
        && candidate.sourceTrait === 'Bonsai sakura',
    )
    const references = getGlowbudsTraitReferences('Plant', 'Bonsai')
    const avatarSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const bonsaiSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/plant/BonsaiPlant.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const sakuraSource = readFileSync(
      new URL(
        '../docs/asset-generation/code-examples/glowbud-traits/plant/SakuraBonsaiPlant.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const studioSource = readStudioSource()

    expect(row).toMatchObject({
      studioCategory: 'head',
      studioTrait: 'Bonsai',
      status: 'complete',
      confidence: 'high',
    })
    expect(sakuraRow).toMatchObject({
      studioCategory: 'head',
      studioTrait: 'Bonsai sakura',
      status: 'complete',
      confidence: 'high',
    })
    expect(references.map((reference) => reference.tokenId)).toEqual([2313, 1133, 312])
    expect(getGlowbudsTraitReferences('Plant', 'Bonsai sakura').map((reference) => reference.tokenId)).toEqual(
      [1306, 2761, 3020],
    )
    expect(avatarSource).toContain("| 'bonsai'")
    expect(avatarSource).toContain("| 'bonsai-sakura'")
    expect(avatarSource.match(/loadout\.head === 'bonsai'/g)).toHaveLength(2)
    expect(avatarSource.match(/loadout\.head === 'bonsai-sakura'/g)).toHaveLength(2)
    expect(bonsaiSource).toContain('export function BonsaiPlant')
    expect(bonsaiSource).toContain('createTaperedBranchGeometry')
    expect(bonsaiSource).toContain('createFoliagePadGeometry')
    expect(sakuraSource).toContain('export function SakuraBonsaiPlant')
    expect(sakuraSource).toContain('createSakuraBranchGeometry')
    expect(sakuraSource).toContain('createBlossomCloudGeometry')
    expect(studioSource).toContain(
      "{ value: 'bonsai', label: 'Bonsai', sublabel: 'Ancient sculpted evergreen tree' }",
    )
    expect(studioSource).toContain(
      "{ value: 'bonsai-sakura', label: 'Bonsai Sakura', sublabel: 'Broad pink cherry blossom tree' }",
    )
    expect(studioSource).toContain("nextTraits.head = 'bonsai'")
    expect(studioSource).toContain("nextTraits.head = 'bonsai-sakura'")
  })

  it('keeps the complete Companion library source-faithful and one-to-one', () => {
    const expectedCompanions = ['Canary Birb', 'Cardinal Birb', 'Snail', 'Toad']
    const companionRows = GLOWBUDS_TRAIT_TRACKER_ROWS.filter(
      (row) => row.sourceCategory === 'Companion',
    )

    expect(companionRows).toHaveLength(expectedCompanions.length)
    expect(companionRows.map((row) => row.status)).toEqual(
      expectedCompanions.map(() => 'complete'),
    )
    expect(companionRows.map((row) => row.studioCategory)).toEqual(
      expectedCompanions.map(() => 'companion'),
    )
    expect(companionRows.map((row) => row.studioTrait).sort()).toEqual(
      expectedCompanions.sort(),
    )
    expect(new Set(companionRows.map((row) => row.studioTrait)).size).toBe(
      expectedCompanions.length,
    )
  })

  it('keeps the completed expression library source-faithful and one-to-one', () => {
    const expectedByCategory = {
      Eyes: [
        'Purp',
        'VR',
        'Eeeek',
        'Suspicious',
        'Blazeitup420',
        'Whats that?',
        'Mossing',
        'Shades',
      ],
      Mouth: ['Vampire', 'Sad', 'Blush', 'GRRRRRRR', 'Ciggy', 'Woozy', 'OMG!'],
      Nose: ['Clown Nose'],
    } as const

    for (const [sourceCategory, expectedTraits] of Object.entries(expectedByCategory)) {
      const rows = GLOWBUDS_TRAIT_TRACKER_ROWS.filter(
        (row) =>
          row.sourceCategory === sourceCategory
          && expectedTraits.some((trait) => trait === row.sourceTrait),
      )

      expect(rows).toHaveLength(expectedTraits.length)
      expect(rows.map((row) => row.status)).toEqual(
        expectedTraits.map(() => 'complete'),
      )
      expect(rows.map((row) => row.studioCategory)).toEqual(
        expectedTraits.map(() => sourceCategory.toLowerCase()),
      )
      expect(rows.map((row) => row.studioTrait).sort()).toEqual(
        [...expectedTraits].sort(),
      )
    }
  })

  it('has source references for every identified trait', () => {
    const missing = GLOWBUDS_TRAIT_TRACKER_ROWS.filter(
      (row) =>
        row.sourceTrait !== 'Unconfirmed type #8'
        && getGlowbudsTraitReferences(row.sourceCategory, row.sourceTrait).length === 0,
    )

    expect(missing).toEqual([])
  })

  it('places every unfinished trait into the production queue', () => {
    const unfinished = GLOWBUDS_TRAIT_TRACKER_ROWS.filter(
      (row) => row.status !== 'complete',
    )
    const queue = getGlowbudsProductionQueue(GLOWBUDS_TRAIT_TRACKER_ROWS)

    expect(queue).toHaveLength(unfinished.length)
    expect(new Set(queue.map((item) => item.key)).size).toBe(queue.length)
    const expectedP0Count = unfinished.filter(
      (row) =>
        row.status === 'review-needed'
        || row.status === 'likely-match'
        || row.status === 'partial',
    ).length
    const actualP0Count = queue.filter((item) => item.priority === 'P0').length

    expect(actualP0Count).toBe(expectedP0Count)
    if (expectedP0Count > 0) {
      expect(queue[0]?.priority).toBe('P0')
    }
  })

  it('keeps the completion gate contract complete and unique', () => {
    expect(GLOWBUDS_QUALITY_GATES).toHaveLength(8)
    expect(new Set(GLOWBUDS_QUALITY_GATES.map((gate) => gate.id)).size).toBe(8)
  })
})
