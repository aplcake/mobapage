import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MUSEUM_BOTANICAL_FAMILY_ANATOMY,
  MUSEUM_BOTANICAL_QUALITY_GATES,
  MUSEUM_ROOM_BOTANICAL_DIRECTION,
} from '../src/museum/formal-room/museumBotanicalDesign'
import {
  MUSEUM_GALLERY_PLANT_SPECS,
} from '../src/museum/formal-room/museumTreeDesign'
import { MUSEUM_GALLERY_PLANT_COLLIDERS } from '../src/museum/formal-room/walkMath'

const botanicalKitSource = readFileSync(
  new URL('../src/museum/formal-room/MuseumBotanicalKit.tsx', import.meta.url),
  'utf8',
)
const expansionSource = readFileSync(
  new URL('../src/museum/formal-room/MuseumExpansion.tsx', import.meta.url),
  'utf8',
)
const roomSource = readFileSync(
  new URL('../src/museum/formal-room/FormalMuseumRoom.tsx', import.meta.url),
  'utf8',
)

describe('Museum botanical kit', () => {
  it('builds closed, species-specific leaves with stems and visible veins', () => {
    for (const helper of [
      'createLanceShape',
      'createOvateShape',
      'createHeartShape',
      'createCaladiumShape',
      'createCompoundShape',
      'createGrassShape',
      'createPoinsettiaShape',
    ]) {
      expect(botanicalKitSource, helper).toContain(`function ${helper}`)
    }

    for (const kind of ['caladium', 'fern', 'grass', 'heart', 'lance', 'ovate', 'palm', 'pine', 'poinsettia']) {
      expect(botanicalKitSource, kind).toContain(`${kind}: create`)
    }

    expect(botanicalKitSource).toContain('shape.closePath()')
    expect(botanicalKitSource).toContain('new THREE.ExtrudeGeometry(shape, LEAF_EXTRUDE)')
    expect(botanicalKitSource).toContain('<primitive object={LEAF_GEOMETRIES[kind]} attach="geometry" />')
    expect(botanicalKitSource).toContain('function BotanicalStem')
    expect(botanicalKitSource).toContain('new THREE.TubeGeometry(curve, 8, radius, 6, false)')
    expect(botanicalKitSource).toContain('BOTANICAL_STEM_GEOMETRIES.get(key)')
    expect(botanicalKitSource).toContain('veinColor')
    expect(botanicalKitSource).not.toContain('<sphereGeometry')
    expect(Object.values(MUSEUM_BOTANICAL_QUALITY_GATES).every(Boolean)).toBe(true)
  })

  it('documents recognizable anatomy for every family', () => {
    const anatomy = Object.entries(MUSEUM_BOTANICAL_FAMILY_ANATOMY)
    expect(anatomy).toHaveLength(13)
    expect(new Set(anatomy.map(([, traits]) => traits.silhouette)).size).toBe(anatomy.length)

    for (const [family, traits] of anatomy) {
      expect(traits.silhouette.length, `${family} silhouette`).toBeGreaterThan(8)
      expect(traits.attachment.length, `${family} attachment`).toBeGreaterThan(8)
      expect(traits.signature.length, `${family} signature`).toBeGreaterThan(8)
    }
  })

  it('maps each room to its intended botanical families without duplicates', () => {
    expect(MUSEUM_ROOM_BOTANICAL_DIRECTION).toEqual({
      atrium: ['bird-of-paradise', 'black-olive', 'kentia-palm', 'umbrella-tree'],
      'moba-one': ['portrait-palm', 'portrait-fern'],
      'moba-two': ['heart-hoya', 'mineral-caladium'],
      photography: ['northlight-fern', 'field-grass', 'river-still-life'],
      holiday: ['winter-poinsettia', 'winter-pine'],
    })

    const mappedFamilies = Object.values(MUSEUM_ROOM_BOTANICAL_DIRECTION).flat()
    expect(new Set(mappedFamilies).size).toBe(mappedFamilies.length)
    expect(new Set(mappedFamilies)).toEqual(new Set(Object.keys(MUSEUM_BOTANICAL_FAMILY_ANATOMY)))

    for (const galleryId of ['moba-one', 'moba-two', 'photography', 'holiday'] as const) {
      expect(
        MUSEUM_GALLERY_PLANT_SPECS
          .filter((spec) => spec.galleryId === galleryId)
          .map((spec) => spec.family),
      ).toEqual(MUSEUM_ROOM_BOTANICAL_DIRECTION[galleryId])
    }
  })

  it('adds no per-frame plant work, scene lights, or shadow passes', () => {
    for (const forbidden of [
      'useFrame(',
      '<ambientLight',
      '<directionalLight',
      '<hemisphereLight',
      '<pointLight',
      '<spotLight',
      'castShadow',
      'receiveShadow',
    ]) {
      expect(botanicalKitSource, forbidden).not.toContain(forbidden)
    }
  })

  it('keeps the Glowbud display lanes clear of decorative border plants', () => {
    const gardenSource = expansionSource.slice(
      expansionSource.indexOf('function AtriumGlowbudGardenBeds'),
      expansionSource.indexOf('function AtriumPersonalInstallation'),
    )
    expect(gardenSource).toContain("botanicalRhythm: 'clear-resident-display'")
    expect(gardenSource).not.toContain('AtriumBorderPlant')
    expect(expansionSource).not.toContain('ATRIUM_BORDER_PLANTING_OFFSETS')
    expect(expansionSource).not.toContain('MuseumAtriumBorderBotany')
  })

  it('wires the kit into the Opening Salon and the two Holiday floor plants', () => {
    const topiarySource = roomSource.slice(
      roomSource.indexOf('function MuseumTopiary'),
      roomSource.indexOf('function MuseumBench'),
    )
    expect(roomSource).toContain("import { MuseumAtriumSpecimenBotany } from './MuseumBotanicalKit'")
    expect(topiarySource).toContain('<MuseumAtriumSpecimenBotany')
    expect(topiarySource).toContain('family="black-olive"')
    expect(topiarySource).not.toContain('<sphereGeometry')
    expect(roomSource.match(/<MuseumTopiary side=/g)).toHaveLength(2)

    const holidayPlants = MUSEUM_GALLERY_PLANT_SPECS.filter((spec) => spec.galleryId === 'holiday')
    expect(holidayPlants).toMatchObject([
      { id: 'holiday-poinsettia', family: 'winter-poinsettia' },
      { id: 'holiday-norfolk-pine', family: 'winter-pine' },
    ])
    for (const plant of holidayPlants) {
      expect(MUSEUM_GALLERY_PLANT_COLLIDERS.some((collider) => collider.id === `${plant.id}-planter`)).toBe(true)
    }

    expect(expansionSource).toContain("holiday: MUSEUM_GALLERY_PLANT_SPECS.filter((spec) => spec.galleryId === 'holiday')")
    expect(expansionSource).toContain("if (spec.galleryId === 'holiday')")
    expect(expansionSource).toContain('<MuseumGalleryPlantBotany family={spec.family}')
    expect(expansionSource).toContain('<GalleryBotanicals gallery={gallery} />')

    const winterDetailsSource = expansionSource.slice(
      expansionSource.indexOf('function WinterSalonFestiveDetails'),
      expansionSource.indexOf('function GalleryShell'),
    )
    expect(winterDetailsSource).toContain('<MuseumEvergreenSprig')
    expect(winterDetailsSource).toContain("festiveFeature: 'holiday-return-wreath'")
  })
})
