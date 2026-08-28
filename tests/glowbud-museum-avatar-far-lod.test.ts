import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  applyGlowbudMeshDetailQuality,
  GLOWBUD_FAR_SLOT_CAPS,
  residentGlowbudAnimationFps,
} from '../src/museum/glowbuds/GlowbudMuseumAvatar'

const avatarSource = readFileSync(
  new URL('../src/museum/glowbuds/GlowbudMuseumAvatar.tsx', import.meta.url),
  'utf8',
)
const canonicalAssetSource = readFileSync(
  new URL('../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx', import.meta.url),
  'utf8',
)

function mesh(
  name: string,
  material: THREE.Material,
  geometry = new THREE.BoxGeometry(1, 1, 1),
) {
  const object = new THREE.Mesh(geometry, material)
  object.name = name
  return object
}

describe('Glowbud canonical far detail policy', () => {
  it('keeps identity geometry in place while removing only expensive polish passes', () => {
    const root = new THREE.Group()
    const bodyGeometry = new THREE.BoxGeometry(1, 1, 1)
    const bodyMaterial = new THREE.MeshToonMaterial({ color: '#ef7298' })
    const body = mesh('canonical-shell-body', bodyMaterial, bodyGeometry)
    const eye = mesh('canonical-eye', new THREE.MeshToonMaterial({ color: '#fff8e9' }))
    const outline = mesh('canonical-outline', new THREE.MeshBasicMaterial({
      color: '#211a22',
      side: THREE.BackSide,
    }))
    const glint = mesh('eye-highlight-glint', new THREE.MeshBasicMaterial({ color: '#ffffff' }))
    const translucent = mesh('soft-light', new THREE.MeshBasicMaterial({
      color: '#ffffff',
      opacity: 0.2,
      transparent: true,
    }))
    const hiddenByDesign = mesh('alternate-trait', new THREE.MeshBasicMaterial({ color: '#000000' }))
    hiddenByDesign.visible = false

    const instanceGeometry = new THREE.SphereGeometry(0.1, 4, 3)
    const instanceMaterial = new THREE.MeshBasicMaterial({ color: '#83e6c2' })
    const instancedFuzz = new THREE.InstancedMesh(instanceGeometry, instanceMaterial, 20)
    instancedFuzz.name = 'canonical-fuzz-fibers'
    root.add(body, eye, outline, glint, translucent, hiddenByDesign, instancedFuzz)

    const originalVisibility = new Map<THREE.Object3D, boolean>()
    const resourcesBefore = {
      bodyGeometry: body.geometry,
      bodyMaterial: body.material,
      instanceGeometry: instancedFuzz.geometry,
      instanceMaterial: instancedFuzz.material,
    }
    const far = applyGlowbudMeshDetailQuality(root, 'resident', originalVisibility)

    expect(far.total).toBe(6)
    expect(far.visible).toBe(3)
    expect(body.visible).toBe(true)
    expect(eye.visible).toBe(true)
    expect(instancedFuzz.visible).toBe(true)
    expect(outline.visible).toBe(false)
    expect(glint.visible).toBe(false)
    expect(translucent.visible).toBe(false)
    expect(hiddenByDesign.visible).toBe(false)
    expect(body.geometry).toBe(resourcesBefore.bodyGeometry)
    expect(body.material).toBe(resourcesBefore.bodyMaterial)
    expect(instancedFuzz.geometry).toBe(resourcesBefore.instanceGeometry)
    expect(instancedFuzz.material).toBe(resourcesBefore.instanceMaterial)

    const full = applyGlowbudMeshDetailQuality(root, 'full', originalVisibility)
    expect(full.visible).toBe(6)
    expect(outline.visible).toBe(true)
    expect(glint.visible).toBe(true)
    expect(translucent.visible).toBe(true)
    expect(hiddenByDesign.visible).toBe(false)

    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => material.dispose())
    })
  })

  it('never allocates geometry, textures, render targets, or another renderer at runtime', () => {
    expect(avatarSource).toContain("export type GlowbudMuseumAvatarQuality = 'full' | 'resident'")
    expect(avatarSource).toContain('applyGlowbudMeshDetailQuality(canonical, quality, originalVisibility)')
    expect(avatarSource).toContain('object instanceof THREE.InstancedMesh) return true')
    expect(avatarSource).toContain("'head-pot': 16")
    expect(avatarSource).toContain('GLOWBUD_FAR_SLOT_CAPS[slot]')
    expect(avatarSource).toContain('material.side === THREE.BackSide')
    expect(avatarSource).toContain('? residentGlowbudAnimationFps(motionFps)')
    expect(avatarSource).toContain("quality === 'resident' ? 0.82 : 1.05")
    expect(avatarSource).toContain("const bobAmount = quality === 'resident' ? 0.011 : 0.014")
    expect(avatarSource).not.toContain('WebGLRenderTarget')
    expect(avatarSource).not.toContain('WebGLRenderer')
    expect(avatarSource).not.toContain('renderer.render(')
    expect(avatarSource).not.toContain('.clone(true)')
    expect(avatarSource).not.toContain('mergeGeometries')
    expect(avatarSource).not.toContain('toNonIndexed')
    expect(avatarSource).not.toContain('new THREE.BufferGeometry')
    expect(avatarSource).not.toContain('GlowbudPixelLodCard')
    expect(canonicalAssetSource).toContain('if (budget.targetFps <= 0) return')
    expect(canonicalAssetSource.match(/useFrame\(/g)).toHaveLength(1)
    expect(canonicalAssetSource.match(/useGlowbudFrame\(/g)?.length).toBeGreaterThan(40)
  })

  it('keeps resident motion natural while retaining a bounded trait-animation budget', () => {
    expect(residentGlowbudAnimationFps(6)).toBe(12)
    expect(residentGlowbudAnimationFps(8)).toBe(14)
    expect(residentGlowbudAnimationFps(12)).toBe(18)
    expect(residentGlowbudAnimationFps(15)).toBe(21)
    expect(residentGlowbudAnimationFps(18)).toBe(24)
    expect(residentGlowbudAnimationFps(60)).toBe(24)
  })

  it('applies deterministic generous budgets per canonical trait slot', () => {
    const root = new THREE.Group()
    const sharedGeometry = new THREE.BoxGeometry(1, 1, 1)
    const sharedMaterial = new THREE.MeshBasicMaterial({ color: '#ef7298' })
    const smallestBySlot: THREE.Mesh[] = []
    const largestBySlot: THREE.Mesh[] = []

    for (const [slot, cap] of Object.entries(GLOWBUD_FAR_SLOT_CAPS)) {
      const scope = new THREE.Group()
      scope.userData = { glowbudTraitSlot: slot, glowbudTraitName: `${slot}-test` }
      root.add(scope)
      for (let index = 0; index < cap + 3; index += 1) {
        const object = mesh(`${slot}-identity-${index}`, sharedMaterial, sharedGeometry)
        object.scale.setScalar(index + 1)
        scope.add(object)
        if (index === 0) smallestBySlot.push(object)
        if (index === cap + 2) largestBySlot.push(object)
      }
    }

    const instancedGeometry = new THREE.SphereGeometry(0.1, 4, 3)
    const instancedMaterial = new THREE.MeshBasicMaterial({ color: '#83e6c2' })
    const forcedInstanced = new THREE.InstancedMesh(instancedGeometry, instancedMaterial, 8)
    forcedInstanced.name = 'outline-fuzz-that-still-preserves-instancing'
    root.add(forcedInstanced)

    const originalVisibility = new Map<THREE.Object3D, boolean>()
    applyGlowbudMeshDetailQuality(root, 'resident', originalVisibility)

    for (const [slot, cap] of Object.entries(GLOWBUD_FAR_SLOT_CAPS)) {
      const scope = root.children.find((child) => child.userData.glowbudTraitSlot === slot)
      const visible = scope?.children.filter((child) => child.visible) ?? []
      expect(visible).toHaveLength(cap)
    }
    largestBySlot.forEach((object) => expect(object.visible).toBe(true))
    smallestBySlot.forEach((object) => expect(object.visible).toBe(false))
    expect(forcedInstanced.visible).toBe(true)

    applyGlowbudMeshDetailQuality(root, 'full', originalVisibility)
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) expect(object.visible).toBe(true)
    })

    sharedGeometry.dispose()
    sharedMaterial.dispose()
    instancedGeometry.dispose()
    instancedMaterial.dispose()
  })

  it('always preserves readable eyes and mouth details beyond the ordinary face budget', () => {
    const root = new THREE.Group()
    const faceScope = new THREE.Group()
    faceScope.userData = { glowbudTraitSlot: 'face', glowbudTraitName: 'readable-face' }
    root.add(faceScope)

    const sharedGeometry = new THREE.BoxGeometry(1, 1, 1)
    const sharedMaterial = new THREE.MeshBasicMaterial({ color: '#ef7298' })
    for (let index = 0; index < GLOWBUD_FAR_SLOT_CAPS.face + 4; index += 1) {
      const filler = mesh(`face-filler-${index}`, sharedMaterial, sharedGeometry)
      filler.scale.setScalar(index + 2)
      faceScope.add(filler)
    }

    const eyeGroup = new THREE.Group()
    eyeGroup.name = 'glowbud-eye-left'
    const eye = mesh('tiny-essential-fill', sharedMaterial, sharedGeometry)
    eye.scale.setScalar(0.01)
    eyeGroup.add(eye)
    faceScope.add(eyeGroup)

    const mouthGroup = new THREE.Group()
    mouthGroup.name = 'glowbud-mouth'
    const mouth = mesh('tiny-essential-fill', sharedMaterial, sharedGeometry)
    mouth.scale.setScalar(0.01)
    mouthGroup.add(mouth)
    faceScope.add(mouthGroup)

    applyGlowbudMeshDetailQuality(root, 'resident', new Map<THREE.Object3D, boolean>())

    expect(eye.visible).toBe(true)
    expect(mouth.visible).toBe(true)
    sharedGeometry.dispose()
    sharedMaterial.dispose()
  })
})
